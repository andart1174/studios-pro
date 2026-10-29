/**
 * ENGINE 4D — GLB/GLTF Exporter Ultra
 * Converts 3D relief meshes into animated GLTF 2.0 / GLB files:
 *   - Real-world meter scale (20 cm tabletop AR size) centered at origin (0, 0, 0)
 *   - Indexed 16-bit geometry (Uint16Array) for instant loading & iOS Quick Look USDZ conversion
 *   - Embedded High-Resolution Texture (TEXCOORD_0 + image/jpeg or image/png bufferView)
 *   - PBR materials (metalness/roughness workflow)
 *   - Embedded animations (Turntable Rotation, 3D Pulse, Levitation Float, Dynamic Morph, Surface Wave)
 *   - Complete GLTF 2.0 compliance for Windows 3D Viewer, macOS, Blender, and Mobile AR
 */

const Engine4D = (() => {

  // Convert millimeter model coordinates (100mm) into real-world glTF meters (~0.20m = 20cm)
  const AR_UNIT_SCALE = 0.002;

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
   * Downsample high-res heightmap to a fast, AR-optimal indexed mesh (<= 112x112 grid)
   * so vertex count stays < 14,000 (Uint16 indices) and iOS Quick Look USDZ exports in <0.08s.
   */
  function buildCompactARMesh(meshData) {
    const { mesh, hmap, dims = { x: 100, y: 100, z: 7 } } = meshData;
    const srcW = mesh.gridW || Math.round(Math.sqrt(mesh.topVerts || 16384));
    const srcH = mesh.gridH || srcW;
    const maxGrid = 112;

    if (!hmap || (srcW <= maxGrid && srcH <= maxGrid)) {
      return mesh;
    }

    const gW = Math.min(srcW, maxGrid);
    const gH = Math.max(2, Math.min(srcH, Math.round(maxGrid * (srcH / srcW))));
    const xLen = dims.x || 100;
    const yLen = dims.y || 100;
    const zLen = dims.z || 7;
    const baseMM = Math.min(2.0, zLen * 0.28);
    const depthMM = Math.max(1.0, zLen - baseMM);

    const topVerts = gW * gH;
    const verts = new Float32Array(topVerts * 3);
    const uvs = new Float32Array(topVerts * 2);

    for (let gy = 0; gy < gH; gy++) {
      const v = gy / (gH - 1);
      const sy = v * (srcH - 1);
      const y0 = Math.floor(sy), y1 = Math.min(srcH - 1, y0 + 1);
      const ty = sy - y0;

      for (let gx = 0; gx < gW; gx++) {
        const u = gx / (gW - 1);
        const sx = u * (srcW - 1);
        const x0 = Math.floor(sx), x1 = Math.min(srcW - 1, x0 + 1);
        const tx = sx - x0;

        const h00 = hmap[y0 * srcW + x0];
        const h10 = hmap[y0 * srcW + x1];
        const h01 = hmap[y1 * srcW + x0];
        const h11 = hmap[y1 * srcW + x1];
        const h = (h00 * (1 - tx) + h10 * tx) * (1 - ty) + (h01 * (1 - tx) + h11 * tx) * ty;

        const vi = (gy * gW + gx) * 3;
        verts[vi] = u * xLen;
        verts[vi + 1] = (1.0 - v) * yLen;
        verts[vi + 2] = baseMM + h * depthMM;

        const uvi = (gy * gW + gx) * 2;
        uvs[uvi] = u;
        uvs[uvi + 1] = v;
      }
    }

    const topTriangles = (gW - 1) * (gH - 1) * 2;
    const indices = new Uint32Array(topTriangles * 3);
    let iIdx = 0;
    for (let gy = 0; gy < gH - 1; gy++) {
      for (let gx = 0; gx < gW - 1; gx++) {
        const i00 = gy * gW + gx;
        const i10 = gy * gW + gx + 1;
        const i01 = (gy + 1) * gW + gx;
        const i11 = (gy + 1) * gW + gx + 1;
        indices[iIdx++] = i00; indices[iIdx++] = i01; indices[iIdx++] = i10;
        indices[iIdx++] = i10; indices[iIdx++] = i01; indices[iIdx++] = i11;
      }
    }

    const normals = new Float32Array(topVerts * 3);
    for (let ti = 0; ti < topTriangles; ti++) {
      const ii = ti * 3;
      const ai = indices[ii] * 3, bi = indices[ii + 1] * 3, ci = indices[ii + 2] * 3;
      const ux = verts[bi] - verts[ai], uy = verts[bi + 1] - verts[ai + 1], uz = verts[bi + 2] - verts[ai + 2];
      const vx = verts[ci] - verts[ai], vy = verts[ci + 1] - verts[ai + 1], vz = verts[ci + 2] - verts[ai + 2];
      const nx = uy * vz - uz * vy;
      const ny = uz * vx - ux * vz;
      const nz = ux * vy - uy * vx;
      for (const vi of [indices[ii], indices[ii + 1], indices[ii + 2]]) {
        normals[vi * 3] += nx;
        normals[vi * 3 + 1] += ny;
        normals[vi * 3 + 2] += nz;
      }
    }
    for (let vi = 0; vi < topVerts; vi++) {
      const ni = vi * 3;
      const len = Math.hypot(normals[ni], normals[ni + 1], normals[ni + 2]) || 1;
      normals[ni] /= len; normals[ni + 1] /= len; normals[ni + 2] /= len;
    }

    const extraTriangles = [];
    if (mesh.extraTriangles && mesh.extraTriangles.length > 0) {
      const z0 = 0;
      for (let gx = 0; gx < gW - 1; gx++) {
        const top0 = [verts[gx * 3], verts[gx * 3 + 1], verts[gx * 3 + 2]];
        const top1 = [verts[(gx + 1) * 3], verts[(gx + 1) * 3 + 1], verts[(gx + 1) * 3 + 2]];
        const bot0 = [top0[0], top0[1], z0], bot1 = [top1[0], top1[1], z0];
        extraTriangles.push([top0, top1, bot1, [0, 1, 0]], [top0, bot1, bot0, [0, 1, 0]]);
      }
      for (let gx = 0; gx < gW - 1; gx++) {
        const row = gH - 1;
        const top0 = [verts[(row * gW + gx) * 3], verts[(row * gW + gx) * 3 + 1], verts[(row * gW + gx) * 3 + 2]];
        const top1 = [verts[(row * gW + gx + 1) * 3], verts[(row * gW + gx + 1) * 3 + 1], verts[(row * gW + gx + 1) * 3 + 2]];
        const bot0 = [top0[0], top0[1], z0], bot1 = [top1[0], top1[1], z0];
        extraTriangles.push([top0, bot0, bot1, [0, -1, 0]], [top0, bot1, top1, [0, -1, 0]]);
      }
      for (let gy = 0; gy < gH - 1; gy++) {
        const top0 = [verts[(gy * gW) * 3], verts[(gy * gW) * 3 + 1], verts[(gy * gW) * 3 + 2]];
        const top1 = [verts[((gy + 1) * gW) * 3], verts[((gy + 1) * gW) * 3 + 1], verts[((gy + 1) * gW) * 3 + 2]];
        const bot0 = [top0[0], top0[1], z0], bot1 = [top1[0], top1[1], z0];
        extraTriangles.push([top0, bot0, bot1, [-1, 0, 0]], [top0, bot1, top1, [-1, 0, 0]]);
      }
      for (let gy = 0; gy < gH - 1; gy++) {
        const col = gW - 1;
        const top0 = [verts[(gy * gW + col) * 3], verts[(gy * gW + col) * 3 + 1], verts[(gy * gW + col) * 3 + 2]];
        const top1 = [verts[((gy + 1) * gW + col) * 3], verts[((gy + 1) * gW + col) * 3 + 1], verts[((gy + 1) * gW + col) * 3 + 2]];
        const bot0 = [top0[0], top0[1], z0], bot1 = [top1[0], top1[1], z0];
        extraTriangles.push([top0, top1, bot1, [1, 0, 0]], [top0, bot1, bot0, [1, 0, 0]]);
      }
      extraTriangles.push(
        [[0, 0, z0], [xLen, yLen, z0], [xLen, 0, z0], [0, 0, -1]],
        [[0, 0, z0], [0, yLen, z0], [xLen, yLen, z0], [0, 0, -1]]
      );
    }

    return {
      verts,
      uvs,
      normals,
      indices,
      topVerts,
      topTriangles,
      extraTriangles,
      gridW: gW,
      gridH: gH,
      vertexColors: null
    };
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
          const dy = 6.0 * AR_UNIT_SCALE * Math.sin((i / frames) * 2 * Math.PI * spd);
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
   * Build complete GLB 2.0 binary buffer (Indexed + Meter-Scaled for Instant AR)
   */
  function buildGLB(meshData, opts = {}) {
    const {
      dims = { x: 100, y: 100, z: 10 },
      vertexColors = null,
    } = meshData;

    const {
      animType = 'none',
      animSpeed = 1.0,
      animDuration = 3,
      metalness = 0.04,
      roughness = 0.58,
      color = '#4f8eff',
      emissive = false,
      pngBytes = null, // Uint8Array of JPEG or PNG texture for HD surface mapping
    } = opts;

    if (!meshData || !meshData.mesh || !meshData.mesh.verts || !meshData.mesh.indices) {
      throw new Error('Invalid meshData provided to Engine4D.buildGLB');
    }

    const activeMesh = buildCompactARMesh(meshData);

    const cx = dims.x / 2;
    const cy = dims.y / 2;
    const cz = dims.z / 2;

    const topVerts = activeMesh.topVerts || (activeMesh.verts.length / 3);
    const topTris = activeMesh.topTriangles;
    const extraTris = activeMesh.extraTriangles ? activeMesh.extraTriangles.length : 0;

    // Indexed top surface vertices + flat-shaded side-wall/back-plate vertices
    const vertCount = topVerts + extraTris * 3;
    const totalTris = topTris + extraTris;
    const indexCount = totalTris * 3;

    const posBuffer = new Float32Array(vertCount * 3);
    const normalBuffer = new Float32Array(vertCount * 3);
    const hasTexture = Boolean(pngBytes && pngBytes.byteLength > 0);
    const uvBuffer = new Float32Array(vertCount * 2);

    const vCols = (!hasTexture && activeMesh === meshData.mesh) ? (activeMesh.vertexColors || vertexColors) : null;
    const colorBuffer = vCols ? new Float32Array(vertCount * 3) : null;

    const useUint16 = vertCount <= 65535;
    const indexBuffer = useUint16 ? new Uint16Array(indexCount) : new Uint32Array(indexCount);

    let posMin = [Infinity, Infinity, Infinity];
    let posMax = [-Infinity, -Infinity, -Infinity];

    // 1. Copy indexed top relief surface vertices (scaled to AR meters)
    for (let vi = 0; vi < topVerts; vi++) {
      const gx = (activeMesh.verts[vi * 3] - cx) * AR_UNIT_SCALE;
      const gy = (activeMesh.verts[vi * 3 + 1] - cy) * AR_UNIT_SCALE;
      const gz = (activeMesh.verts[vi * 3 + 2] - cz) * AR_UNIT_SCALE;

      posBuffer[vi * 3] = gx;
      posBuffer[vi * 3 + 1] = gy;
      posBuffer[vi * 3 + 2] = gz;

      normalBuffer[vi * 3] = activeMesh.normals[vi * 3];
      normalBuffer[vi * 3 + 1] = activeMesh.normals[vi * 3 + 1];
      normalBuffer[vi * 3 + 2] = activeMesh.normals[vi * 3 + 2];

      if (gx < posMin[0]) posMin[0] = gx; if (gx > posMax[0]) posMax[0] = gx;
      if (gy < posMin[1]) posMin[1] = gy; if (gy > posMax[1]) posMax[1] = gy;
      if (gz < posMin[2]) posMin[2] = gz; if (gz > posMax[2]) posMax[2] = gz;

      if (activeMesh.uvs) {
        uvBuffer[vi * 2] = activeMesh.uvs[vi * 2];
        uvBuffer[vi * 2 + 1] = activeMesh.uvs[vi * 2 + 1];
      }

      if (colorBuffer) {
        colorBuffer[vi * 3] = vCols[vi * 3];
        colorBuffer[vi * 3 + 1] = vCols[vi * 3 + 1];
        colorBuffer[vi * 3 + 2] = vCols[vi * 3 + 2];
      }
    }

    // Copy top surface triangle indices
    const topIndexLen = topTris * 3;
    for (let i = 0; i < topIndexLen; i++) {
      indexBuffer[i] = activeMesh.indices[i];
    }

    // 2. Side walls & back plate vertices + indices
    let vi = topVerts;
    let ii = topIndexLen;
    if (activeMesh.extraTriangles && extraTris > 0) {
      const baseCol = hexToRGB(color);
      for (let ti = 0; ti < extraTris; ti++) {
        const [v0, v1, v2, norm] = activeMesh.extraTriangles[ti];
        for (const tv of [v0, v1, v2]) {
          const gx = (tv[0] - cx) * AR_UNIT_SCALE;
          const gy = (tv[1] - cy) * AR_UNIT_SCALE;
          const gz = (tv[2] - cz) * AR_UNIT_SCALE;

          posBuffer[vi * 3] = gx;
          posBuffer[vi * 3 + 1] = gy;
          posBuffer[vi * 3 + 2] = gz;

          normalBuffer[vi * 3] = norm[0];
          normalBuffer[vi * 3 + 1] = norm[1];
          normalBuffer[vi * 3 + 2] = norm[2];

          if (gx < posMin[0]) posMin[0] = gx; if (gx > posMax[0]) posMax[0] = gx;
          if (gy < posMin[1]) posMin[1] = gy; if (gy > posMax[1]) posMax[1] = gy;
          if (gz < posMin[2]) posMin[2] = gz; if (gz > posMax[2]) posMax[2] = gz;

          uvBuffer[vi * 2] = Math.max(0, Math.min(1, tv[0] / (dims.x || 100)));
          uvBuffer[vi * 2 + 1] = Math.max(0, Math.min(1, 1.0 - tv[1] / (dims.y || 100)));

          if (colorBuffer) {
            colorBuffer[vi * 3] = baseCol[0] * 0.45;
            colorBuffer[vi * 3 + 1] = baseCol[1] * 0.45;
            colorBuffer[vi * 3 + 2] = baseCol[2] * 0.45;
          }
          indexBuffer[ii++] = vi;
          vi++;
        }
      }
    }

    // 3. Animation tracks
    const { animBin, animJson } = buildAnimation(animType, animSpeed, animDuration);

    const posByteLength = posBuffer.byteLength;
    const normalByteLength = normalBuffer.byteLength;
    const uvByteLength = uvBuffer.byteLength;
    const colorByteLength = colorBuffer ? colorBuffer.byteLength : 0;
    const indexByteLength = indexBuffer.byteLength;
    const indexPaddedLength = align4(indexByteLength);
    const imgByteLength = hasTexture ? pngBytes.byteLength : 0;
    const imgPaddedLength = align4(imgByteLength);

    const o_norm = posByteLength;
    const o_uv = o_norm + normalByteLength;
    const o_col = o_uv + uvByteLength;
    const o_idx = o_col + colorByteLength;
    const o_img = o_idx + indexPaddedLength;
    const o_anim = o_img + imgPaddedLength;

    const totalBinLength = o_anim + animBin.byteLength;
    const binBuffer = new ArrayBuffer(align4(totalBinLength));
    const binView = new Uint8Array(binBuffer);

    binView.set(new Uint8Array(posBuffer.buffer), 0);
    binView.set(new Uint8Array(normalBuffer.buffer), o_norm);
    binView.set(new Uint8Array(uvBuffer.buffer), o_uv);
    if (colorBuffer) binView.set(new Uint8Array(colorBuffer.buffer), o_col);
    binView.set(new Uint8Array(indexBuffer.buffer), o_idx);
    if (hasTexture) binView.set(pngBytes, o_img);
    if (animBin.byteLength > 0) binView.set(new Uint8Array(animBin), o_anim);

    const accessors = [
      { bufferView: 0, componentType: 5126, count: vertCount, type: 'VEC3', min: posMin, max: posMax },
      { bufferView: 1, componentType: 5126, count: vertCount, type: 'VEC3' },
      { bufferView: 2, componentType: 5126, count: vertCount, type: 'VEC2' },
    ];
    const bufferViews = [
      { buffer: 0, byteOffset: 0, byteLength: posByteLength, target: 34962 },
      { buffer: 0, byteOffset: o_norm, byteLength: normalByteLength, target: 34962 },
      { buffer: 0, byteOffset: o_uv, byteLength: uvByteLength, target: 34962 },
    ];
    const primitiveAttribs = { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 };

    if (colorBuffer) {
      const colBvIdx = bufferViews.length;
      bufferViews.push({ buffer: 0, byteOffset: o_col, byteLength: colorByteLength, target: 34962 });
      const colAccIdx = accessors.length;
      accessors.push({ bufferView: colBvIdx, componentType: 5126, count: vertCount, type: 'VEC3' });
      primitiveAttribs['COLOR_0'] = colAccIdx;
    }

    const idxBvIdx = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset: o_idx, byteLength: indexByteLength, target: 34963 });
    const idxAccIdx = accessors.length;
    accessors.push({
      bufferView: idxBvIdx,
      componentType: useUint16 ? 5123 : 5125,
      count: indexCount,
      type: 'SCALAR',
      min: [0],
      max: [vertCount - 1]
    });

    let imgBvIdx = -1;
    let imgMimeType = 'image/png';
    if (hasTexture) {
      imgBvIdx = bufferViews.length;
      bufferViews.push({ buffer: 0, byteOffset: o_img, byteLength: imgByteLength });
      if (pngBytes.byteLength > 2 && pngBytes[0] === 0xFF && pngBytes[1] === 0xD8) {
        imgMimeType = 'image/jpeg';
      }
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
        primitives: [{ attributes: primitiveAttribs, indices: idxAccIdx, material: 0, mode: 4 }],
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
      gltfJson.images = [{ bufferView: imgBvIdx, mimeType: imgMimeType }];
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
