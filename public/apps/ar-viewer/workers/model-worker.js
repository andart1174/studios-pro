/* eslint-disable no-restricted-globals */
// Off-main-thread STL / OBJ parser, fast numeric spatial vertex welder,
// direct binary GLB packager, and adaptive mobile AR decimation.

self.window = self;
if (typeof self.globalThis === 'undefined') {
  self.globalThis = self;
}
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

const MOBILE_GLB_THRESHOLD_BYTES = 3.6 * 1024 * 1024; // Safely under ~6 MB Netlify Edge CDN cap

function nextPow2(n) {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

function computeTriangleNormalsFallback(posArr, normArr, count) {
  const out = new Float32Array(count * 3);
  if (normArr && normArr.length >= count * 3) {
    out.set(normArr.subarray(0, count * 3));
  }
  const triCount = Math.floor(count / 3);
  for (let t = 0; t < triCount; t++) {
    const i0 = t * 9;
    const nx = out[i0], ny = out[i0 + 1], nz = out[i0 + 2];
    const lenSq = nx * nx + ny * ny + nz * nz;
    if (lenSq < 1e-8 || Number.isNaN(lenSq)) {
      const ax = posArr[i0], ay = posArr[i0 + 1], az = posArr[i0 + 2];
      const bx = posArr[i0 + 3] - ax, by = posArr[i0 + 4] - ay, bz = posArr[i0 + 5] - az;
      const cx = posArr[i0 + 6] - ax, cy = posArr[i0 + 7] - ay, cz = posArr[i0 + 8] - az;
      let fx = by * cz - bz * cy;
      let fy = bz * cx - bx * cz;
      let fz = bx * cy - by * cx;
      const fl = Math.hypot(fx, fy, fz) || 1;
      fx /= fl; fy /= fl; fz /= fl;
      out[i0] = fx; out[i0 + 1] = fy; out[i0 + 2] = fz;
      out[i0 + 3] = fx; out[i0 + 4] = fy; out[i0 + 5] = fz;
      out[i0 + 6] = fx; out[i0 + 7] = fy; out[i0 + 8] = fz;
    }
  }
  return out;
}

/**
 * Normalize raw mesh buffer to meters on Y=0 floor, centered in XZ.
 * Returns { minX, minY, minZ, maxX, maxY, maxZ, dimsMm } after in-place transform.
 */
function normalizePositionsInPlace(posArr, count) {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < count; i++) {
    const j = i * 3;
    const x = posArr[j], y = posArr[j + 1], z = posArr[j + 2];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  if (!Number.isFinite(minX)) {
    throw new Error('Empty 3D geometry');
  }
  const rx = maxX - minX;
  const ry = maxY - minY;
  const rz = maxZ - minZ;
  const rawMax = Math.max(rx, ry, rz, 0.001);

  let scale = 1.0;
  let dimsMm;
  if (rawMax > 5.0 && rawMax <= 10000) {
    scale = 0.001;
    dimsMm = { x: rx, y: ry, z: rz };
  } else if (rawMax < 0.02) {
    scale = 0.15 / rawMax;
    dimsMm = { x: rx * scale * 1000, y: ry * scale * 1000, z: rz * scale * 1000 };
  } else if (rawMax > 2.5) {
    scale = 0.3 / rawMax;
    dimsMm = { x: rx * 1000, y: ry * 1000, z: rz * 1000 };
  } else {
    dimsMm = { x: rx * 1000, y: ry * 1000, z: rz * 1000 };
  }

  const cx = (minX + maxX) * 0.5;
  const cz = (minZ + maxZ) * 0.5;

  let nMinX = Infinity, nMinY = Infinity, nMinZ = Infinity;
  let nMaxX = -Infinity, nMaxY = -Infinity, nMaxZ = -Infinity;

  for (let i = 0; i < count; i++) {
    const j = i * 3;
    const x = (posArr[j] - cx) * scale;
    const y = (posArr[j + 1] - minY) * scale;
    const z = (posArr[j + 2] - cz) * scale;
    posArr[j] = x;
    posArr[j + 1] = y;
    posArr[j + 2] = z;
    if (x < nMinX) nMinX = x; if (x > nMaxX) nMaxX = x;
    if (y < nMinY) nMinY = y; if (y > nMaxY) nMaxY = y;
    if (z < nMinZ) nMinZ = z; if (z > nMaxZ) nMaxZ = z;
  }

  return {
    min: [nMinX, nMinY, nMinZ],
    max: [nMaxX, nMaxY, nMaxZ],
    dimsMm
  };
}

/**
 * Fast zero-string numeric spatial vertex welder that preserves sharp CAD edges
 * (merges only vertices sharing quantized 3D coords AND compatible normal dot >= 0.72).
 */
function weldMeshNumeric(posArr, normArr, count, boundsMin, boundsMax) {
  if (count < 6 || count > 2400000) {
    return { pos: posArr, norm: normArr, idx: null, vertCount: count };
  }
  const span = Math.max(
    boundsMax[0] - boundsMin[0],
    boundsMax[1] - boundsMin[1],
    boundsMax[2] - boundsMin[2],
    1e-6
  );
  const invStep = 100000.0 / span;
  const minX = boundsMin[0], minY = boundsMin[1], minZ = boundsMin[2];

  const cap = nextPow2(Math.max(16, count));
  const mask = cap - 1;
  const buckets = new Int32Array(cap);
  buckets.fill(-1);
  const next = new Int32Array(count);
  next.fill(-1);

  const ux = new Int32Array(count);
  const uy = new Int32Array(count);
  const uz = new Int32Array(count);
  const outPos = new Float32Array(count * 3);
  const outNorm = new Float32Array(count * 3);
  const indices = new Uint32Array(count);

  let unique = 0;

  for (let i = 0; i < count; i++) {
    const j = i * 3;
    const x = posArr[j], y = posArr[j + 1], z = posArr[j + 2];
    const nx = normArr[j], ny = normArr[j + 1], nz = normArr[j + 2];

    const qx = Math.round((x - minX) * invStep) | 0;
    const qy = Math.round((y - minY) * invStep) | 0;
    const qz = Math.round((z - minZ) * invStep) | 0;
    const h = ((Math.imul(qx, 73856093) ^ Math.imul(qy, 19349663) ^ Math.imul(qz, 83492791)) >>> 0) & mask;

    let match = -1;
    let cur = buckets[h];
    let hops = 0;
    while (cur !== -1 && hops < 10) {
      if (ux[cur] === qx && uy[cur] === qy && uz[cur] === qz) {
        const k = cur * 3;
        const cnx = outNorm[k], cny = outNorm[k + 1], cnz = outNorm[k + 2];
        const len = Math.hypot(cnx, cny, cnz) || 1;
        if ((nx * cnx + ny * cny + nz * cnz) / len >= 0.72) {
          match = cur;
          break;
        }
      }
      cur = next[cur];
      hops++;
    }

    if (match === -1) {
      match = unique++;
      ux[match] = qx;
      uy[match] = qy;
      uz[match] = qz;
      const k = match * 3;
      outPos[k] = x; outPos[k + 1] = y; outPos[k + 2] = z;
      outNorm[k] = nx; outNorm[k + 1] = ny; outNorm[k + 2] = nz;
      next[match] = buckets[h];
      buckets[h] = match;
    } else {
      const k = match * 3;
      outNorm[k] += nx;
      outNorm[k + 1] += ny;
      outNorm[k + 2] += nz;
    }
    indices[i] = match;
  }

  // Only index if vertex savings justify index buffer overhead
  if (unique >= count * 0.90) {
    return { pos: posArr, norm: normArr, idx: null, vertCount: count };
  }

  // Re-normalize accumulated vertex normals
  for (let i = 0; i < unique; i++) {
    const k = i * 3;
    const l = Math.hypot(outNorm[k], outNorm[k + 1], outNorm[k + 2]) || 1;
    outNorm[k] /= l;
    outNorm[k + 1] /= l;
    outNorm[k + 2] /= l;
  }

  const finalIdx = unique <= 65535 ? new Uint16Array(indices) : indices;
  return {
    pos: outPos.subarray(0, unique * 3),
    norm: outNorm.subarray(0, unique * 3),
    idx: finalIdx,
    vertCount: unique
  };
}

/**
 * Rossignac-Borrel uniform spatial voxel decimation for lightweight mobile AR <= 3.5 MB.
 * Guarantees Uint16 vertex indices and preserved world-space dimensions.
 */
function decimateMeshForMobileAR(posArr, normArr, idxArr, vertCount, boundsMin, boundsMax) {
  const dx = Math.max(boundsMax[0] - boundsMin[0], 1e-6);
  const dy = Math.max(boundsMax[1] - boundsMin[1], 1e-6);
  const dz = Math.max(boundsMax[2] - boundsMin[2], 1e-6);
  const maxAxis = Math.max(dx, dy, dz);

  const indexCount = idxArr ? idxArr.length : vertCount;
  const triCount = Math.floor(indexCount / 3);
  if (triCount <= 12000) return null;

  function clusterPass(maxAxisCells) {
    const gx = Math.max(8, Math.round(maxAxisCells * (dx / maxAxis)));
    const gy = Math.max(8, Math.round(maxAxisCells * (dy / maxAxis)));
    const gz = Math.max(4, Math.round(maxAxisCells * (dz / maxAxis)));
    const sx = (gx - 1) / dx;
    const sy = (gy - 1) / dy;
    const sz = (gz - 1) / dz;

    const vertCluster = new Int32Array(vertCount);
    const cellToCluster = new Map();
    const sumPos = [];
    const sumNorm = [];
    const counts = [];
    let clusterCount = 0;

    for (let i = 0; i < vertCount; i++) {
      const j = i * 3;
      const cx = Math.min(gx - 1, Math.max(0, Math.floor((posArr[j] - boundsMin[0]) * sx)));
      const cy = Math.min(gy - 1, Math.max(0, Math.floor((posArr[j + 1] - boundsMin[1]) * sy)));
      const cz = Math.min(gz - 1, Math.max(0, Math.floor((posArr[j + 2] - boundsMin[2]) * sz)));
      const cellKey = cx + gx * (cy + gy * cz);

      let cid = cellToCluster.get(cellKey);
      if (cid === undefined) {
        cid = clusterCount++;
        cellToCluster.set(cellKey, cid);
        sumPos.push(posArr[j], posArr[j + 1], posArr[j + 2]);
        sumNorm.push(normArr[j], normArr[j + 1], normArr[j + 2]);
        counts.push(1);
      } else {
        const k = cid * 3;
        sumPos[k] += posArr[j]; sumPos[k + 1] += posArr[j + 1]; sumPos[k + 2] += posArr[j + 2];
        sumNorm[k] += normArr[j]; sumNorm[k + 1] += normArr[j + 1]; sumNorm[k + 2] += normArr[j + 2];
        counts[cid]++;
      }
      vertCluster[i] = cid;
    }

    const triIndices = new Uint32Array(triCount * 3);
    let outIdxLen = 0;
    const remap = new Int32Array(clusterCount);
    remap.fill(-1);
    let compactVerts = 0;

    for (let t = 0; t < triCount; t++) {
      const b = t * 3;
      const i0 = idxArr ? idxArr[b] : b;
      const i1 = idxArr ? idxArr[b + 1] : b + 1;
      const i2 = idxArr ? idxArr[b + 2] : b + 2;
      const c0 = vertCluster[i0];
      const c1 = vertCluster[i1];
      const c2 = vertCluster[i2];
      if (c0 === c1 || c1 === c2 || c0 === c2) continue;

      if (remap[c0] === -1) remap[c0] = compactVerts++;
      if (remap[c1] === -1) remap[c1] = compactVerts++;
      if (remap[c2] === -1) remap[c2] = compactVerts++;
      triIndices[outIdxLen++] = remap[c0];
      triIndices[outIdxLen++] = remap[c1];
      triIndices[outIdxLen++] = remap[c2];
    }

    return { sumPos, sumNorm, counts, remap, clusterCount, compactVerts, triIndices: triIndices.subarray(0, outIdxLen) };
  }

  let res = clusterPass(170);
  if (res.compactVerts > 52000) {
    const ratio = Math.sqrt(36000 / Math.max(1, res.compactVerts));
    const adjustedCells = Math.max(42, Math.round(170 * ratio));
    res = clusterPass(adjustedCells);
  }
  if (res.compactVerts < 3 || res.triIndices.length < 3) return null;

  const outPos = new Float32Array(res.compactVerts * 3);
  const outNorm = new Float32Array(res.compactVerts * 3);
  let mMinX = Infinity, mMinY = Infinity, mMinZ = Infinity;
  let mMaxX = -Infinity, mMaxY = -Infinity, mMaxZ = -Infinity;

  for (let c = 0; c < res.clusterCount; c++) {
    const dst = res.remap[c];
    if (dst === -1) continue;
    const n = res.counts[c] || 1;
    const sk = c * 3;
    const dk = dst * 3;
    const x = res.sumPos[sk] / n;
    const y = res.sumPos[sk + 1] / n;
    const z = res.sumPos[sk + 2] / n;
    outPos[dk] = x; outPos[dk + 1] = y; outPos[dk + 2] = z;
    if (x < mMinX) mMinX = x; if (x > mMaxX) mMaxX = x;
    if (y < mMinY) mMinY = y; if (y > mMaxY) mMaxY = y;
    if (z < mMinZ) mMinZ = z; if (z > mMaxZ) mMaxZ = z;

    const nx = res.sumNorm[sk], ny = res.sumNorm[sk + 1], nz = res.sumNorm[sk + 2];
    const nl = Math.hypot(nx, ny, nz) || 1;
    outNorm[dk] = nx / nl; outNorm[dk + 1] = ny / nl; outNorm[dk + 2] = nz / nl;
  }

  const compactIdx = res.compactVerts <= 65535 ? new Uint16Array(res.triIndices) : res.triIndices;
  return buildBinaryGLB(outPos, outNorm, compactIdx, res.compactVerts, [mMinX, mMinY, mMinZ], [mMaxX, mMaxY, mMaxZ]);
}

/**
 * Direct binary glTF 2.0 (.glb) packager — bypasses heavy THREE.GLTFExporter & FileReader.
 */
function buildBinaryGLB(posArr, normArr, idxArr, vertCount, boundsMin, boundsMax) {
  const posBytes = posArr.byteLength;
  const normBytes = normArr.byteLength;
  const idxBytes = idxArr ? idxArr.byteLength : 0;
  const rawBinLen = posBytes + normBytes + idxBytes;
  const binPad = (4 - (rawBinLen % 4)) % 4;
  const binLen = rawBinLen + binPad;

  const bufferViews = [
    { buffer: 0, byteOffset: 0, byteLength: posBytes, target: 34962 },
    { buffer: 0, byteOffset: posBytes, byteLength: normBytes, target: 34962 }
  ];
  const accessors = [
    { bufferView: 0, componentType: 5126, count: vertCount, type: 'VEC3', min: boundsMin, max: boundsMax },
    { bufferView: 1, componentType: 5126, count: vertCount, type: 'VEC3' }
  ];
  const primitive = {
    attributes: { POSITION: 0, NORMAL: 1 },
    material: 0
  };

  if (idxArr) {
    bufferViews.push({ buffer: 0, byteOffset: posBytes + normBytes, byteLength: idxBytes, target: 34963 });
    accessors.push({
      bufferView: 2,
      componentType: (idxArr instanceof Uint16Array) ? 5123 : 5125,
      count: idxArr.length,
      type: 'SCALAR'
    });
    primitive.indices = 2;
  }

  const gltfJson = {
    asset: { version: '2.0', generator: 'Studios-Pro Fast Worker GLB' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: 'StudiosProModel' }],
    materials: [{
      name: 'DefaultMaterial',
      pbrMetallicRoughness: {
        baseColorFactor: [0.82, 0.84, 0.87, 1.0],
        metallicFactor: 0.18,
        roughnessFactor: 0.42
      },
      doubleSided: true
    }],
    meshes: [{
      name: 'Mesh',
      primitives: [primitive]
    }],
    buffers: [{ byteLength: binLen }],
    bufferViews,
    accessors
  };

  const jsonBytes = new TextEncoder().encode(JSON.stringify(gltfJson));
  const jsonPad = (4 - (jsonBytes.length % 4)) % 4;
  const jsonChunkLen = jsonBytes.length + jsonPad;
  const totalLen = 12 + 8 + jsonChunkLen + 8 + binLen;

  const outBuf = new ArrayBuffer(totalLen);
  const dv = new DataView(outBuf);
  const u8 = new Uint8Array(outBuf);

  dv.setUint32(0, 0x46546C67, true); // glTF
  dv.setUint32(4, 2, true);
  dv.setUint32(8, totalLen, true);

  dv.setUint32(12, jsonChunkLen, true);
  dv.setUint32(16, 0x4E4F534A, true); // JSON
  u8.set(jsonBytes, 20);
  for (let i = 0; i < jsonPad; i++) u8[20 + jsonBytes.length + i] = 0x20;

  const binOff = 20 + jsonChunkLen;
  dv.setUint32(binOff, binLen, true);
  dv.setUint32(binOff + 4, 0x004E4942, true); // BIN
  let writeOff = binOff + 8;

  u8.set(new Uint8Array(posArr.buffer, posArr.byteOffset, posBytes), writeOff);
  writeOff += posBytes;
  u8.set(new Uint8Array(normArr.buffer, normArr.byteOffset, normBytes), writeOff);
  writeOff += normBytes;
  if (idxArr) {
    u8.set(new Uint8Array(idxArr.buffer, idxArr.byteOffset, idxBytes), writeOff);
  }

  return outBuf;
}

function measureAndNormalizeObject(object) {
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
    scale = 0.001;
    dimsMm = { x: rawSize.x, y: rawSize.y, z: rawSize.z };
  } else if (rawMax < 0.02) {
    scale = 0.15 / rawMax;
    dimsMm = { x: rawSize.x * scale * 1000, y: rawSize.y * scale * 1000, z: rawSize.z * scale * 1000 };
  } else if (rawMax > 2.5) {
    scale = 0.3 / rawMax;
    dimsMm = { x: rawSize.x * 1000, y: rawSize.y * 1000, z: rawSize.z * 1000 };
  } else {
    dimsMm = { x: rawSize.x * 1000, y: rawSize.y * 1000, z: rawSize.z * 1000 };
  }

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

function mergeGroupForMobileDecimation(group) {
  let totalVerts = 0;
  let totalIdx = 0;
  const parts = [];
  group.updateMatrixWorld(true);
  group.traverse((child) => {
    if (!child.isMesh || !child.geometry || !child.geometry.attributes || !child.geometry.attributes.position) return;
    const g = child.geometry;
    const p = g.attributes.position;
    const n = g.attributes.normal;
    totalVerts += p.count;
    totalIdx += g.index ? g.index.count : p.count;
    parts.push({ p, n, idx: g.index });
  });
  if (totalVerts < 3 || totalIdx < 3) return null;

  const pos = new Float32Array(totalVerts * 3);
  const norm = new Float32Array(totalVerts * 3);
  const idx = new Uint32Array(totalIdx);
  let vOff = 0, iOff = 0;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const part of parts) {
    const cnt = part.p.count;
    for (let i = 0; i < cnt; i++) {
      const k = (vOff + i) * 3;
      const x = part.p.getX(i), y = part.p.getY(i), z = part.p.getZ(i);
      pos[k] = x; pos[k + 1] = y; pos[k + 2] = z;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
      if (part.n) {
        norm[k] = part.n.getX(i); norm[k + 1] = part.n.getY(i); norm[k + 2] = part.n.getZ(i);
      } else {
        norm[k] = 0; norm[k + 1] = 1; norm[k + 2] = 0;
      }
    }
    if (part.idx) {
      for (let i = 0; i < part.idx.count; i++) idx[iOff++] = vOff + part.idx.getX(i);
    } else {
      for (let i = 0; i < cnt; i++) idx[iOff++] = vOff + i;
    }
    vOff += cnt;
  }

  return decimateMeshForMobileAR(pos, norm, idx, totalVerts, [minX, minY, minZ], [maxX, maxY, maxZ]);
}

self.onmessage = function (e) {
  const { id, extension, data } = e.data || {};
  if (!id || !data) return;

  try {
    const ext = String(extension || '').toLowerCase();

    if (ext === 'stl') {
      self.postMessage({ id, type: 'progress', progress: 0.20 });
      const loader = new THREE.STLLoader();
      const geometry = loader.parse(data);
      const posAttr = geometry && geometry.attributes && geometry.attributes.position;
      if (!posAttr || posAttr.count < 3) {
        throw new Error('Empty STL geometry');
      }
      self.postMessage({ id, type: 'progress', progress: 0.45 });

      const count = posAttr.count;
      const posCopy = new Float32Array(posAttr.array);
      const normAttr = geometry.attributes.normal;
      const normClean = computeTriangleNormalsFallback(posCopy, normAttr ? normAttr.array : null, count);

      const normInfo = normalizePositionsInPlace(posCopy, count);
      const welded = weldMeshNumeric(posCopy, normClean, count, normInfo.min, normInfo.max);
      self.postMessage({ id, type: 'progress', progress: 0.72 });

      const glbBuffer = buildBinaryGLB(
        welded.pos,
        welded.norm,
        welded.idx,
        welded.vertCount,
        normInfo.min,
        normInfo.max
      );

      let mobileGlbBuffer = null;
      if (glbBuffer.byteLength > MOBILE_GLB_THRESHOLD_BYTES) {
        mobileGlbBuffer = decimateMeshForMobileAR(
          welded.pos,
          welded.norm,
          welded.idx,
          welded.vertCount,
          normInfo.min,
          normInfo.max
        );
      }

      const transferList = [glbBuffer];
      if (mobileGlbBuffer) transferList.push(mobileGlbBuffer);

      self.postMessage({
        id,
        type: 'done',
        glbBuffer,
        mobileGlbBuffer,
        dimsMm: normInfo.dimsMm
      }, transferList);
      return;
    }

    if (ext === 'obj') {
      self.postMessage({ id, type: 'progress', progress: 0.25 });
      const scene = new THREE.Scene();
      const mat = new THREE.MeshStandardMaterial({
        color: 0xd1d5db,
        roughness: 0.42,
        metalness: 0.18
      });
      const loader = new THREE.OBJLoader();
      const group = loader.parse(data);
      group.traverse((child) => {
        if (child.isMesh) {
          child.material = mat.clone();
        }
      });
      scene.add(group);

      const dimsMm = measureAndNormalizeObject(scene);
      self.postMessage({ id, type: 'progress', progress: 0.72 });

      const exporter = new THREE.GLTFExporter();
      const onDone = function (result) {
        const glbBuffer = (result instanceof ArrayBuffer)
          ? result
          : new TextEncoder().encode(JSON.stringify(result)).buffer;
        const isGltfJson = !(result instanceof ArrayBuffer);
        let mobileGlbBuffer = null;
        if (glbBuffer.byteLength > MOBILE_GLB_THRESHOLD_BYTES) {
          mobileGlbBuffer = mergeGroupForMobileDecimation(group);
        }
        const transferList = [glbBuffer];
        if (mobileGlbBuffer) transferList.push(mobileGlbBuffer);
        self.postMessage({ id, type: 'done', glbBuffer, mobileGlbBuffer, isGltfJson, dimsMm }, transferList);
      };
      const onErr = function (err) {
        self.postMessage({ id, type: 'error', error: (err && err.message) || 'GLTF export failed' });
      };

      if (exporter.parse.length === 4) {
        exporter.parse(scene, onDone, onErr, { binary: true });
      } else {
        exporter.parse(scene, onDone, { binary: true });
      }
      return;
    }

    throw new Error('Unsupported worker format: ' + ext);
  } catch (err) {
    self.postMessage({ id, type: 'error', error: (err && err.message) || String(err) });
  }
};
