/* eslint-disable no-restricted-globals */
// Off-main-thread STL / OBJ parser, normal-preserving vertex indexer, and binary GLB exporter.

self.window = self;
if (typeof self.document === 'undefined') {
  self.document = {
    createElement: function (tag) {
      if (tag === 'canvas' && typeof OffscreenCanvas !== 'undefined') {
        return new OffscreenCanvas(1, 1);
      }
      return {};
    }
  };
}

importScripts(
  '../vendor/three.min.js',
  '../vendor/STLLoader.js',
  '../vendor/OBJLoader.js',
  '../vendor/GLTFExporter.js'
);

function weldByPositionAndNormal(geometry) {
  if (!geometry || !geometry.attributes || !geometry.attributes.position) return geometry;
  const posAttr = geometry.attributes.position;
  const normAttr = geometry.attributes.normal;
  const count = posAttr.count;
  // Skip welding only on extremely dense meshes to stay ultra-fast in browser workers
  if (!normAttr || count < 6 || count > 600000) return geometry;

  const posArr = posAttr.array;
  const normArr = normAttr.array;
  const map = new Map();
  const newPositions = [];
  const newNormals = [];
  const indices = new Uint32Array(count);
  let unique = 0;

  for (let i = 0; i < count; i++) {
    const j = i * 3;
    const x = posArr[j], y = posArr[j + 1], z = posArr[j + 2];
    const nx = normArr[j], ny = normArr[j + 1], nz = normArr[j + 2];
    const key =
      Math.round(x * 1e4) + ',' + Math.round(y * 1e4) + ',' + Math.round(z * 1e4) + '|' +
      Math.round(nx * 1e2) + ',' + Math.round(ny * 1e2) + ',' + Math.round(nz * 1e2);

    let idx = map.get(key);
    if (idx === undefined) {
      idx = unique++;
      map.set(key, idx);
      newPositions.push(x, y, z);
      newNormals.push(nx, ny, nz);
    }
    indices[i] = idx;
  }

  // Only swap in welded buffers when there is a meaningful vertex savings
  if (unique >= count * 0.92) return geometry;

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(newNormals, 3));
  out.setIndex(unique <= 65535 ? new THREE.BufferAttribute(new Uint16Array(indices), 1) : new THREE.BufferAttribute(indices, 1));
  out.computeBoundingBox();
  return out;
}

function measureAndNormalize(object) {
  const rawBox = new THREE.Box3().setFromObject(object);
  if (rawBox.isEmpty()) {
    throw new Error('Empty 3D geometry');
  }
  const rawSize = new THREE.Vector3();
  rawBox.getSize(rawSize);
  const rawMax = Math.max(rawSize.x, rawSize.y, rawSize.z, 0.001);

  let scale = 1.0;
  let dimsMm;
  if (rawMax > 5.0 && rawMax <= 10000) {
    // CAD millimeter geometry -> convert to meters (1 GLTF unit = 1 meter)
    scale = 0.001;
    dimsMm = { x: rawSize.x, y: rawSize.y, z: rawSize.z };
  } else if (rawMax < 0.02) {
    // Microscopic geometry -> normalize cleanly to ~15 cm tabletop scale
    scale = 0.15 / rawMax;
    dimsMm = { x: rawSize.x * scale * 1000, y: rawSize.y * scale * 1000, z: rawSize.z * scale * 1000 };
  } else if (rawMax > 2.5) {
    // Huge world scene -> scale to ~0.3 m tabletop representation while preserving physical dims readout
    scale = 0.3 / rawMax;
    dimsMm = { x: rawSize.x * 1000, y: rawSize.y * 1000, z: rawSize.z * 1000 };
  } else {
    // Already meters (e.g. 0.14m = 140mm)
    dimsMm = { x: rawSize.x * 1000, y: rawSize.y * 1000, z: rawSize.z * 1000 };
  }

  // Compute global center across all child meshes so multi-part OBJ assemblies keep relative alignment
  const globalCenter = new THREE.Vector3();
  rawBox.getCenter(globalCenter);

  object.traverse((child) => {
    if (child.isMesh && child.geometry) {
      child.geometry.translate(-globalCenter.x, -rawBox.min.y, -globalCenter.z);
      child.geometry.scale(scale, scale, scale);
    }
  });

  return dimsMm;
}

self.onmessage = function (e) {
  const { id, extension, data } = e.data || {};
  if (!id || !data) return;

  try {
    const ext = String(extension || '').toLowerCase();
    const scene = new THREE.Scene();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      roughness: 0.42,
      metalness: 0.18
    });

    if (ext === 'stl') {
      self.postMessage({ id, type: 'progress', progress: 0.25 });
      const loader = new THREE.STLLoader();
      let geometry = loader.parse(data);
      self.postMessage({ id, type: 'progress', progress: 0.50 });
      geometry = weldByPositionAndNormal(geometry);
      const mesh = new THREE.Mesh(geometry, mat);
      scene.add(mesh);
    } else if (ext === 'obj') {
      self.postMessage({ id, type: 'progress', progress: 0.25 });
      const loader = new THREE.OBJLoader();
      const group = loader.parse(data);
      group.traverse((child) => {
        if (child.isMesh) {
          child.material = mat.clone();
        }
      });
      scene.add(group);
    } else {
      throw new Error('Unsupported worker format: ' + ext);
    }

    const dimsMm = measureAndNormalize(scene);
    self.postMessage({ id, type: 'progress', progress: 0.72 });

    const exporter = new THREE.GLTFExporter();
    const onDone = function (result) {
      if (result instanceof ArrayBuffer) {
        self.postMessage({ id, type: 'done', glbBuffer: result, dimsMm }, [result]);
      } else {
        const json = JSON.stringify(result);
        const enc = new TextEncoder().encode(json).buffer;
        self.postMessage({ id, type: 'done', glbBuffer: enc, isGltfJson: true, dimsMm }, [enc]);
      }
    };
    const onErr = function (err) {
      self.postMessage({ id, type: 'error', error: (err && err.message) || 'GLTF export failed' });
    };

    if (exporter.parse.length === 4) {
      exporter.parse(scene, onDone, onErr, { binary: true });
    } else {
      exporter.parse(scene, onDone, { binary: true });
    }
  } catch (err) {
    self.postMessage({ id, type: 'error', error: (err && err.message) || String(err) });
  }
};
