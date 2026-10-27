/**
 * ENGINE 4D — GLB/GLTF Exporter Ultra
 * Converts 3D relief meshes into animated GLTF 2.0 / GLB files:
 *   - Upright portrait orientation centered at origin (0, 0, 0)
 *   - Embedded High-Resolution PNG Texture (TEXCOORD_0 + image/png bufferView)
 *   - PBR materials (metalness/roughness workflow)
 *   - Embedded animations (Turntable Rotation, 3D Pulse, Levitation Float, Dynamic Morph, Surface Wave)
 *   - Complete GLTF 2.0 compliance for Windows 3D Viewer, macOS, Blender, and Mobile AR
 */

const Engine4D = (() => {

  function align4(n) {
    return (n + 3) & ~3;
  }

  function hexToRGB(hex) {
    const h = (hex || '#4f8eff').replace('#', '');
    return [
      parseInt(h.slice(0, 2), 16) / 255,
      parseInt(h.slice(2, 4), 16) / 255,
      parseInt(h.slice(4, 6), 16) / 255,
      1.0
    ];
  }

  /**
   * Build 4D Animation Tracks (GLTF Accessors & BufferViews)
   */
  function buildAnimation(animType, speed, durationSec) {
    if (!animType || animType === 'none') {
      return {
        animBin: new ArrayBuffer(0),
        animJson: { accessors: [], bufferViews: [], animations: [] }
      };
    }

    const FPS = 30;
    const dur = Math.max(1, durationSec || 3);
    const spd = Math.max(0.1, speed || 1.0);
    const frames = Math.round(dur * FPS);
    const timeStep = dur / frames;

    let timesArray, valuesArray, path, valType;
    const nodeIdx = 0;

    switch (animType) {
      case 'rotate': {
        // Y-axis upright turntable spin 0 -> 2pi
        timesArray = new Float32Array(frames + 1);
        valuesArray = new Float32Array((frames + 1) * 4);
        for (let i = 0; i <= frames; i++) {
          const t = i * timeStep;
          const angle = (i / frames) * 2 * Math.PI * spd;
          timesArray[i] = t;
          valuesArray[i * 4 + 0] = 0;
          valuesArray[i * 4 + 1] = Math.sin(angle / 2);
          valuesArray[i * 4 + 2] = 0;
          valuesArray[i * 4 + 3] = Math.cos(angle / 2);
        }
        path = 'rotation';
        valType = 'VEC4';
        break;
      }

      case 'pulse': {
        timesArray = new Float32Array(frames + 1);
        valuesArray = new Float32Array((frames + 1) * 3);
        for (let i = 0; i <= frames; i++) {
          const t = i * timeStep;
          const s = 1.0 + 0.16 * Math.sin((i / frames) * 2 * Math.PI * spd);
          timesArray[i] = t;
          valuesArray[i * 3 + 0] = s;
          valuesArray[i * 3 + 1] = s;
          valuesArray[i * 3 + 2] = s;
        }
        path = 'scale';
        valType = 'VEC3';
        break;
      }

      case 'float': {
        timesArray = new Float32Array(frames + 1);
        valuesArray = new Float32Array((frames + 1) * 3);
        for (let i = 0; i <= frames; i++) {
          const t = i * timeStep;
          const dy = 6.0 * Math.sin((i / frames) * 2 * Math.PI * spd);
          timesArray[i] = t;
          valuesArray[i * 3 + 0] = 0;
          valuesArray[i * 3 + 1] = dy;
          valuesArray[i * 3 + 2] = 0;
        }
        path = 'translation';
        valType = 'VEC3';
        break;
      }

      case 'morph': {
        // Depth pulsation along Z axis (forward relief axis)
        timesArray = new Float32Array(frames + 1);
        valuesArray = new Float32Array((frames + 1) * 3);
        for (let i = 0; i <= frames; i++) {
          const t = i * timeStep;
          const angle = (i / frames) * 2 * Math.PI * spd;
          const sz = 0.25 + 0.85 * (0.5 + 0.5 * Math.sin(angle * 2));
          timesArray[i] = t;
          valuesArray[i * 3 + 0] = 1.0;
          valuesArray[i * 3 + 1] = 1.0;
          valuesArray[i * 3 + 2] = sz;
        }
        path = 'scale';
        valType = 'VEC3';
        break;
      }

      case 'wave': {
        timesArray = new Float32Array(frames + 1);
        valuesArray = new Float32Array((frames + 1) * 3);
        for (let i = 0; i <= frames; i++) {
          const t = i * timeStep;
          const angle = (i / frames) * 2 * Math.PI * spd;
          const s = 1.0 + 0.08 * Math.sin(angle * 2);
          const sz = 1.0 + 0.30 * Math.cos(angle * 2);
          timesArray[i] = t;
          valuesArray[i * 3 + 0] = s;
          valuesArray[i * 3 + 1] = s;
          valuesArray[i * 3 + 2] = sz;
        }
        path = 'scale';
        valType = 'VEC3';
        break;
      }

      default:
        return { animBin: new ArrayBuffer(0), animJson: { accessors: [], bufferViews: [], animations: [] } };
    }

    const timesByteLength = timesArray.byteLength;
    const valuesByteLength = valuesArray.byteLength;
    const animBinBuffer = new ArrayBuffer(align4(timesByteLength + valuesByteLength));
    new Uint8Array(animBinBuffer).set(new Uint8Array(timesArray.buffer), 0);
    new Uint8Array(animBinBuffer).set(new Uint8Array(valuesArray.buffer), timesByteLength);

    const animJson = {
      accessors: [
        {
          bufferView: 0,
          componentType: 5126,
          count: timesArray.length,
          type: 'SCALAR',
          min: [timesArray[0]],
          max: [timesArray[timesArray.length - 1]],
        },
        {
          bufferView: 1,
          componentType: 5126,
          count: valuesArray.length / (valType === 'VEC4' ? 4 : 3),
          type: valType,
        },
      ],
      bufferViews: [
        { byteOffset: 0, byteLength: timesByteLength },
        { byteOffset: timesByteLength, byteLength: valuesByteLength },
      ],
      animations: [{
        name: 'Anim_' + animType,
        channels: [{
          sampler: 0,
          target: { node: nodeIdx, path }
        }],
        samplers: [{
          input: 0,
          interpolation: 'LINEAR',
          output: 1,
        }]
      }]
    };

    return { animBin: animBinBuffer, animJson };
  }

  /**
   * Build complete GLB 2.0 binary buffer
   */
  function buildGLB(meshData, opts = {}) {
    const {
      mesh,
      dims = { x: 100, y: 100, z: 10 },
      vertexColors = null,
    } = meshData;

    const {
      animType = 'rotate',
      animSpeed = 1.0,
      animDuration = 3,
      metalness = 0.04,
      roughness = 0.58,
      color = '#4f8eff',
      emissive = false,
      pngBytes = null, // Optional Uint8Array of PNG texture for HD surface mapping
    } = opts;

    if (!mesh || !mesh.verts || !mesh.indices) {
      throw new Error('Invalid meshData provided to Engine4D.buildGLB');
    }

    const cx = dims.x / 2;
    const cy = dims.y / 2;
    const cz = dims.z / 2;

    const topTris = mesh.topTriangles;
    const extraTris = mesh.extraTriangles ? mesh.extraTriangles.length : 0;
    const vertCount = (topTris + extraTris) * 3;

    const posBuffer = new Float32Array(vertCount * 3);
    const normalBuffer = new Float32Array(vertCount * 3);
    const hasTexture = Boolean(pngBytes && pngBytes.byteLength > 0);
    const uvBuffer = hasTexture ? new Float32Array(vertCount * 2) : null;

    const vCols = !hasTexture ? (mesh.vertexColors || vertexColors) : null;
    const colorBuffer = vCols ? new Float32Array(vertCount * 3) : null;

    let posMin = [Infinity, Infinity, Infinity];
    let posMax = [-Infinity, -Infinity, -Infinity];
    let vi = 0;

    // 1. Top relief surface triangles (Upright in XY plane, Z pointing forward toward viewer)
    for (let ti = 0; ti < topTris; ti++) {
      const ii = ti * 3;
      for (let k = 0; k < 3; k++) {
        const idx = mesh.indices[ii + k];
        const vx = mesh.verts[idx * 3];
        const vy = mesh.verts[idx * 3 + 1];
        const vz = mesh.verts[idx * 3 + 2];

        const nx = mesh.normals[idx * 3];
        const ny = mesh.normals[idx * 3 + 1];
        const nz = mesh.normals[idx * 3 + 2];

        const gx = vx - cx;
        const gy = vy - cy;
        const gz = vz - cz;

        posBuffer[vi * 3] = gx;
        posBuffer[vi * 3 + 1] = gy;
        posBuffer[vi * 3 + 2] = gz;

        normalBuffer[vi * 3] = nx;
        normalBuffer[vi * 3 + 1] = ny;
        normalBuffer[vi * 3 + 2] = nz;

        if (gx < posMin[0]) posMin[0] = gx; if (gx > posMax[0]) posMax[0] = gx;
        if (gy < posMin[1]) posMin[1] = gy; if (gy > posMax[1]) posMax[1] = gy;
        if (gz < posMin[2]) posMin[2] = gz; if (gz > posMax[2]) posMax[2] = gz;

        if (uvBuffer && mesh.uvs) {
          uvBuffer[vi * 2] = mesh.uvs[idx * 2];
          uvBuffer[vi * 2 + 1] = mesh.uvs[idx * 2 + 1];
        }

        if (colorBuffer) {
          colorBuffer[vi * 3] = vCols[idx * 3];
          colorBuffer[vi * 3 + 1] = vCols[idx * 3 + 1];
          colorBuffer[vi * 3 + 2] = vCols[idx * 3 + 2];
        }
        vi++;
      }
    }

    // 2. Side walls & back plate
    if (mesh.extraTriangles && extraTris > 0) {
      const baseCol = hexToRGB(color);
      for (let ti = 0; ti < extraTris; ti++) {
        const [v0, v1, v2, norm] = mesh.extraTriangles[ti];
        for (const tv of [v0, v1, v2]) {
          const gx = tv[0] - cx;
          const gy = tv[1] - cy;
          const gz = tv[2] - cz;

          posBuffer[vi * 3] = gx;
          posBuffer[vi * 3 + 1] = gy;
          posBuffer[vi * 3 + 2] = gz;

          normalBuffer[vi * 3] = norm[0];
          normalBuffer[vi * 3 + 1] = norm[1];
          normalBuffer[vi * 3 + 2] = norm[2];

          if (gx < posMin[0]) posMin[0] = gx; if (gx > posMax[0]) posMax[0] = gx;
          if (gy < posMin[1]) posMin[1] = gy; if (gy > posMax[1]) posMax[1] = gy;
          if (gz < posMin[2]) posMin[2] = gz; if (gz > posMax[2]) posMax[2] = gz;

          if (uvBuffer) {
            uvBuffer[vi * 2] = Math.max(0, Math.min(1, tv[0] / (dims.x || 100)));
            uvBuffer[vi * 2 + 1] = Math.max(0, Math.min(1, 1.0 - tv[1] / (dims.y || 100)));
          }

          if (colorBuffer) {
            colorBuffer[vi * 3] = baseCol[0] * 0.45;
            colorBuffer[vi * 3 + 1] = baseCol[1] * 0.45;
            colorBuffer[vi * 3 + 2] = baseCol[2] * 0.45;
          }
          vi++;
        }
      }
    }

    // 3. Animation tracks
    const { animBin, animJson } = buildAnimation(animType, animSpeed, animDuration);

    const posByteLength = posBuffer.byteLength;
    const normalByteLength = normalBuffer.byteLength;
    const uvByteLength = uvBuffer ? uvBuffer.byteLength : 0;
    const colorByteLength = colorBuffer ? colorBuffer.byteLength : 0;
    const imgByteLength = hasTexture ? pngBytes.byteLength : 0;
    const imgPaddedLength = align4(imgByteLength);

    const o_norm = posByteLength;
    const o_uv = o_norm + normalByteLength;
    const o_col = o_uv + uvByteLength;
    const o_img = o_col + colorByteLength;
    const o_anim = o_img + imgPaddedLength;

    const totalBinLength = o_anim + animBin.byteLength;
    const binBuffer = new ArrayBuffer(align4(totalBinLength));
    const binView = new Uint8Array(binBuffer);

    binView.set(new Uint8Array(posBuffer.buffer), 0);
    binView.set(new Uint8Array(normalBuffer.buffer), o_norm);
    if (uvBuffer) binView.set(new Uint8Array(uvBuffer.buffer), o_uv);
    if (colorBuffer) binView.set(new Uint8Array(colorBuffer.buffer), o_col);
    if (hasTexture) binView.set(pngBytes, o_img);
    if (animBin.byteLength > 0) binView.set(new Uint8Array(animBin), o_anim);

    const accessors = [
      { bufferView: 0, componentType: 5126, count: vertCount, type: 'VEC3', min: posMin, max: posMax },
      { bufferView: 1, componentType: 5126, count: vertCount, type: 'VEC3' },
    ];
    const bufferViews = [
      { buffer: 0, byteOffset: 0, byteLength: posByteLength, target: 34962 },
      { buffer: 0, byteOffset: o_norm, byteLength: normalByteLength, target: 34962 },
    ];
    const primitiveAttribs = { POSITION: 0, NORMAL: 1 };

    if (uvBuffer) {
      const uvBvIdx = bufferViews.length;
      bufferViews.push({ buffer: 0, byteOffset: o_uv, byteLength: uvByteLength, target: 34962 });
      const uvAccIdx = accessors.length;
      accessors.push({ bufferView: uvBvIdx, componentType: 5126, count: vertCount, type: 'VEC2' });
      primitiveAttribs['TEXCOORD_0'] = uvAccIdx;
    }

    if (colorBuffer) {
      const colBvIdx = bufferViews.length;
      bufferViews.push({ buffer: 0, byteOffset: o_col, byteLength: colorByteLength, target: 34962 });
      const colAccIdx = accessors.length;
      accessors.push({ bufferView: colBvIdx, componentType: 5126, count: vertCount, type: 'VEC3' });
      primitiveAttribs['COLOR_0'] = colAccIdx;
    }

    let imgBvIdx = -1;
    if (hasTexture) {
      imgBvIdx = bufferViews.length;
      bufferViews.push({ buffer: 0, byteOffset: o_img, byteLength: imgByteLength });
    }

    const animBvBase = bufferViews.length;
    const animAccBase = accessors.length;

    animJson.bufferViews.forEach(bv => {
      bufferViews.push({ ...bv, buffer: 0, byteOffset: bv.byteOffset + o_anim });
    });
    animJson.accessors.forEach((acc, idx) => {
      accessors.push({ ...acc, bufferView: animBvBase + idx });
    });

    const baseColor = hexToRGB(color);
    const emissiveFactor = emissive ? [baseColor[0] * 0.35, baseColor[1] * 0.35, baseColor[2] * 0.35] : [0, 0, 0];

    const pbr = {
      baseColorFactor: (hasTexture || colorBuffer) ? [1, 1, 1, 1] : baseColor,
      metallicFactor: hasTexture ? 0.04 : metalness,
      roughnessFactor: hasTexture ? 0.58 : roughness,
    };
    if (hasTexture) {
      pbr.baseColorTexture = { index: 0 };
    }

    const gltfJson = {
      asset: {
        version: '2.0',
        generator: 'Studios-Pro.com — 3D·4D Studio Ultra',
        copyright: 'Generated at https://studios-pro.com'
      },
      scene: 0,
      scenes: [{ name: 'Scene', nodes: [0] }],
      nodes: [{
        name: 'Model_4D',
        mesh: 0,
        translation: [0, 0, 0],
      }],
      meshes: [{
        name: 'Model_Geometry',
        primitives: [{ attributes: primitiveAttribs, material: 0, mode: 4 }],
      }],
      materials: [{
        name: 'Material_PBR',
        pbrMetallicRoughness: pbr,
        emissiveFactor,
        doubleSided: true,
      }],
      accessors,
      bufferViews,
      buffers: [{ byteLength: binBuffer.byteLength }],
    };

    if (hasTexture && imgBvIdx >= 0) {
      gltfJson.images = [{ bufferView: imgBvIdx, mimeType: 'image/png' }];
      gltfJson.samplers = [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }];
      gltfJson.textures = [{ source: 0, sampler: 0 }];
    }

    if (animJson.animations && animJson.animations.length > 0) {
      gltfJson.animations = animJson.animations.map(anim => ({
        ...anim,
        samplers: anim.samplers.map(s => ({
          ...s,
          input: animAccBase,
          output: animAccBase + 1,
        }))
      }));
    }

    // Binary glTF chunk packing
    const jsonStr = JSON.stringify(gltfJson);
    const jsonBytes = new TextEncoder().encode(jsonStr);
    const jsonPadded = align4(jsonBytes.length);
    const jsonChunk = new Uint8Array(jsonPadded);
    jsonChunk.set(jsonBytes);
    for (let i = jsonBytes.length; i < jsonPadded; i++) jsonChunk[i] = 0x20;

    const binPadded = binBuffer.byteLength;
    const totalGLB = 12 + 8 + jsonPadded + 8 + binPadded;
    const glb = new ArrayBuffer(totalGLB);
    const dv = new DataView(glb);

    dv.setUint32(0, 0x46546C67, true); // 'glTF'
    dv.setUint32(4, 2, true);          // version 2
    dv.setUint32(8, totalGLB, true);

    dv.setUint32(12, jsonPadded, true);
    dv.setUint32(16, 0x4E4F534A, true); // 'JSON'
    new Uint8Array(glb, 20, jsonPadded).set(jsonChunk);

    const binOff = 12 + 8 + jsonPadded;
    dv.setUint32(binOff, binPadded, true);
    dv.setUint32(binOff + 4, 0x004E4942, true); // 'BIN\0'
    new Uint8Array(glb, binOff + 8, binPadded).set(new Uint8Array(binBuffer));

    return glb;
  }

  function buildGLTF(meshData, opts) {
    return buildGLB(meshData, opts);
  }

  return { buildGLB, buildGLTF };

})();

window.Engine4D = Engine4D;
