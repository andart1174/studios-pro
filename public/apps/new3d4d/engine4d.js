/**
 * ENGINE 4D v2 — KHRONOS GLTF 2.0 JSON & BINARY GLB EXPORTER ULTRA
 * Converts 3D relief sculptures into animated 4D GLB & valid JSON GLTF 2.0 files:
 *   • Real-world meter scale (AR tabletop / wall ready) accurately centered from mesh bounds
 *   • Indexed Uint16/Uint32 compact AR-ready topology (preserves HD vertex colors & AO!)
 *   • Embedded High-Resolution Texture (`image/jpeg` or `image/png`) + `TEXCOORD_0`
 *   • Real glTF 2.0 `targets` (Morph Targets) for `morph` (2D <-> 3D) and `wave` animations!
 *   • Separate valid `.glb` binary AND `.gltf` UTF-8 JSON builders (with embedded data URI)
 */

const Engine4D = (() => {

  const AR_UNIT_SCALE = 0.002; // 100 mm -> 0.20 m

  function align4(n) {
    return (n + 3) & ~3;
  }

  function hexToRGB(hex) {
    const h = (hex || '#4f8eff').replace('#', '');
    if (h.length < 6) return [0.31, 0.56, 1.0, 1.0];
    return [
      parseInt(h.slice(0, 2), 16) / 255,
      parseInt(h.slice(2, 4), 16) / 255,
      parseInt(h.slice(4, 6), 16) / 255,
      1.0
    ];
  }

  function uint8ToBase64(u8) {
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < u8.length; i += chunk) {
      bin += String.fromCharCode.apply(null, u8.subarray(i, i + chunk));
    }
    return btoa(bin);
  }

  /**
   * Downsamples ultra-high-resolution heightmaps cleanly to <= 128x128 for fast mobile AR & WebGL,
   * preserving `baseFlatVerts`, `uvs`, smoothed `normals`, `extraTriangles`, AND bilinear `vertexColors`.
   */
  function buildCompactARMesh(meshData) {
    const { mesh, vertexColors } = meshData;
    const srcW = mesh.gridW || 128;
    const srcH = mesh.gridH || 128;
    const maxGrid = (mesh.shapeProfile === 'curved') ? 76 : 112;

    if (srcW <= maxGrid && srcH <= maxGrid) {
      return { ...mesh, vertexColors: mesh.vertexColors || vertexColors || null };
    }

    const gW = Math.min(srcW, maxGrid);
    const gH = Math.max(2, Math.min(srcH, Math.round(maxGrid * (srcH / srcW))));
    const topVerts = gW * gH;

    const verts = new Float32Array(topVerts * 3);
    const baseFlatVerts = mesh.baseFlatVerts ? new Float32Array(topVerts * 3) : null;
    const compactBackVerts = (mesh.shapeProfile === 'curved' && mesh.backVerts) ? new Float32Array(topVerts * 3) : null;
    const uvs = new Float32Array(topVerts * 2);
    const srcCols = mesh.vertexColors || vertexColors || null;
    const outCols = srcCols ? new Float32Array(topVerts * 3) : null;

    function bilerp3(arr, u, v, dst, dstIdx) {
      const sx = u * (srcW - 1), sy = v * (srcH - 1);
      const x0 = Math.floor(sx), x1 = Math.min(srcW - 1, x0 + 1);
      const y0 = Math.floor(sy), y1 = Math.min(srcH - 1, y0 + 1);
      const tx = sx - x0, ty = sy - y0;
      const i00 = (y0 * srcW + x0) * 3, i10 = (y0 * srcW + x1) * 3;
      const i01 = (y1 * srcW + x0) * 3, i11 = (y1 * srcW + x1) * 3;
      for (let c = 0; c < 3; c++) {
        const top = arr[i00 + c] * (1 - tx) + arr[i10 + c] * tx;
        const bot = arr[i01 + c] * (1 - tx) + arr[i11 + c] * tx;
        dst[dstIdx + c] = top * (1 - ty) + bot * ty;
      }
    }

    function bilerp2(arr, u, v, dst, dstIdx) {
      const sx = u * (srcW - 1), sy = v * (srcH - 1);
      const x0 = Math.floor(sx), x1 = Math.min(srcW - 1, x0 + 1);
      const y0 = Math.floor(sy), y1 = Math.min(srcH - 1, y0 + 1);
      const tx = sx - x0, ty = sy - y0;
      const i00 = (y0 * srcW + x0) * 2, i10 = (y0 * srcW + x1) * 2;
      const i01 = (y1 * srcW + x0) * 2, i11 = (y1 * srcW + x1) * 2;
      for (let c = 0; c < 2; c++) {
        const top = arr[i00 + c] * (1 - tx) + arr[i10 + c] * tx;
        const bot = arr[i01 + c] * (1 - tx) + arr[i11 + c] * tx;
        dst[dstIdx + c] = top * (1 - ty) + bot * ty;
      }
    }

    for (let gy = 0; gy < gH; gy++) {
      const v = gy / (gH - 1);
      for (let gx = 0; gx < gW; gx++) {
        const u = gx / (gW - 1);
        const gi = gy * gW + gx;
        bilerp3(mesh.verts, u, v, verts, gi * 3);
        if (baseFlatVerts) bilerp3(mesh.baseFlatVerts, u, v, baseFlatVerts, gi * 3);
        if (compactBackVerts) bilerp3(mesh.backVerts, u, v, compactBackVerts, gi * 3);
        if (mesh.uvs) bilerp2(mesh.uvs, u, v, uvs, gi * 2);
        if (outCols) bilerp3(srcCols, u, v, outCols, gi * 3);
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

    // Reconstruct boundary walls cleanly from compact silhouette perimeter
    const extraTriangles = [];
    if (mesh.extraTriangles && mesh.extraTriangles.length > 0 && mesh.shapeProfile !== 'curved') {
      const boundaryTop = [];
      for (let gx = gW - 1; gx > 0; gx--) boundaryTop.push([verts[gx * 3], verts[gx * 3 + 1], verts[gx * 3 + 2]]);
      for (let gy = 0; gy < gH - 1; gy++) boundaryTop.push([verts[gy * gW * 3], verts[gy * gW * 3 + 1], verts[gy * gW * 3 + 2]]);
      for (let gx = 0; gx < gW - 1; gx++) boundaryTop.push([verts[((gH - 1) * gW + gx) * 3], verts[((gH - 1) * gW + gx) * 3 + 1], verts[((gH - 1) * gW + gx) * 3 + 2]]);
      for (let gy = gH - 1; gy > 0; gy--) boundaryTop.push([verts[(gy * gW + gW - 1) * 3], verts[(gy * gW + gW - 1) * 3 + 1], verts[(gy * gW + gW - 1) * 3 + 2]]);

      let cxSum = 0, cySum = 0;
      boundaryTop.forEach(p => { cxSum += p[0]; cySum += p[1]; });
      const centerBot = [cxSum / boundaryTop.length, cySum / boundaryTop.length, 0];
      const K = boundaryTop.length;
      for (let k = 0; k < K; k++) {
        const t0 = boundaryTop[k], t1 = boundaryTop[(k + 1) % K];
        const b0 = [t0[0], t0[1], 0], b1 = [t1[0], t1[1], 0];
        const tx = b1[0] - b0[0], ty = b1[1] - b0[1], len = Math.hypot(tx, ty) || 1;
        const wn = [ty / len, -tx / len, 0];
        extraTriangles.push([t0, b0, b1, wn], [t0, b1, t1, wn], [centerBot, b1, b0, [0, 0, -1]]);
      }
    } else if (mesh.extraTriangles && mesh.extraTriangles.length > 0 && compactBackVerts) {
      const triN = (a, b, c) => {
        const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
        const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
        const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        const len = Math.hypot(nx, ny, nz) || 1;
        return [nx / len, ny / len, nz / len];
      };
      const pt = (arr, gx, gy) => {
        const idx = (gy * gW + gx) * 3;
        return [arr[idx], arr[idx + 1], arr[idx + 2]];
      };
      for (let gy = 0; gy < gH - 1; gy++) {
        for (let gx = 0; gx < gW - 1; gx++) {
          const p00 = pt(compactBackVerts, gx, gy), p10 = pt(compactBackVerts, gx + 1, gy);
          const p01 = pt(compactBackVerts, gx, gy + 1), p11 = pt(compactBackVerts, gx + 1, gy + 1);
          extraTriangles.push([p00, p10, p01, triN(p00, p10, p01)], [p10, p11, p01, triN(p10, p11, p01)]);
        }
      }
      for (let gx = 0; gx < gW - 1; gx++) {
        const f0 = pt(verts, gx, 0), f1 = pt(verts, gx + 1, 0), b0 = pt(compactBackVerts, gx, 0), b1 = pt(compactBackVerts, gx + 1, 0);
        extraTriangles.push([f0, f1, b1, triN(f0, f1, b1)], [f0, b1, b0, triN(f0, b1, b0)]);
        const br = gH - 1;
        const bf0 = pt(verts, gx, br), bf1 = pt(verts, gx + 1, br), bb0 = pt(compactBackVerts, gx, br), bb1 = pt(compactBackVerts, gx + 1, br);
        extraTriangles.push([bf0, bb0, bb1, triN(bf0, bb0, bb1)], [bf0, bb1, bf1, triN(bf0, bb1, bf1)]);
      }
      for (let gy = 0; gy < gH - 1; gy++) {
        const lf0 = pt(verts, 0, gy), lf1 = pt(verts, 0, gy + 1), lb0 = pt(compactBackVerts, 0, gy), lb1 = pt(compactBackVerts, 0, gy + 1);
        extraTriangles.push([lf0, lb0, lb1, triN(lf0, lb0, lb1)], [lf0, lb1, lf1, triN(lf0, lb1, lf1)]);
        const rc = gW - 1;
        const rf0 = pt(verts, rc, gy), rf1 = pt(verts, rc, gy + 1), rb0 = pt(compactBackVerts, rc, gy), rb1 = pt(compactBackVerts, rc, gy + 1);
        extraTriangles.push([rf0, rf1, rb1, triN(rf0, rf1, rb1)], [rf0, rb1, rb0, triN(rf0, rb1, rb0)]);
      }
    } else if (mesh.extraTriangles && mesh.extraTriangles.length > 0) {
      for (let i = 0; i < mesh.extraTriangles.length; i++) extraTriangles.push(mesh.extraTriangles[i]);
    }

    return {
      verts,
      baseFlatVerts,
      uvs,
      normals,
      indices,
      topVerts,
      topTriangles,
      extraTriangles,
      gridW: gW,
      gridH: gH,
      shapeProfile: mesh.shapeProfile,
      bounds: mesh.bounds,
      vertexColors: outCols
    };
  }

  function buildMorphDeltaAndTracks(animType, activeMesh, vertCount, cx, cy, cz, speed, durationSec) {
    const FPS = 30;
    const dur = Math.max(1, durationSec || 3);
    const spd = Math.max(0.1, speed || 1.0);
    const frames = Math.round(dur * FPS);
    const timeStep = dur / frames;

    let morphTargetPos = null;
    let morphMin = [0, 0, 0], morphMax = [0, 0, 0];

    if (animType === 'morph' && activeMesh.baseFlatVerts) {
      morphTargetPos = new Float32Array(vertCount * 3);
      let mMin = [Infinity, Infinity, Infinity], mMax = [-Infinity, -Infinity, -Infinity];
      const topVerts = activeMesh.topVerts;
      for (let vi = 0; vi < vertCount; vi++) {
        let dx = 0, dy = 0, dz = 0;
        if (vi < topVerts) {
          dx = (activeMesh.baseFlatVerts[vi * 3] - activeMesh.verts[vi * 3]) * AR_UNIT_SCALE;
          dy = (activeMesh.baseFlatVerts[vi * 3 + 1] - activeMesh.verts[vi * 3 + 1]) * AR_UNIT_SCALE;
          dz = (activeMesh.baseFlatVerts[vi * 3 + 2] - activeMesh.verts[vi * 3 + 2]) * AR_UNIT_SCALE;
        }
        morphTargetPos[vi * 3] = dx;
        morphTargetPos[vi * 3 + 1] = dy;
        morphTargetPos[vi * 3 + 2] = dz;
        if (dx < mMin[0]) mMin[0] = dx; if (dx > mMax[0]) mMax[0] = dx;
        if (dy < mMin[1]) mMin[1] = dy; if (dy > mMax[1]) mMax[1] = dy;
        if (dz < mMin[2]) mMin[2] = dz; if (dz > mMax[2]) mMax[2] = dz;
      }
      morphMin = mMin; morphMax = mMax;
    } else if (animType === 'wave') {
      morphTargetPos = new Float32Array(vertCount * 3);
      let mMin = [Infinity, Infinity, Infinity], mMax = [-Infinity, -Infinity, -Infinity];
      const gw = activeMesh.gridW, gh = activeMesh.gridH;
      const topVerts = activeMesh.topVerts;
      for (let vi = 0; vi < vertCount; vi++) {
        let dx = 0, dy = 0, dz = 0;
        if (vi < topVerts) {
          const gx = vi % gw, gy = (vi / gw) | 0;
          const dist = Math.hypot(gx - gw * 0.5, gy - gh * 0.5);
          const waveDeltaMM = 2.4 * Math.sin(dist * 0.25);
          dx = activeMesh.normals[vi * 3] * waveDeltaMM * AR_UNIT_SCALE;
          dy = activeMesh.normals[vi * 3 + 1] * waveDeltaMM * AR_UNIT_SCALE;
          dz = activeMesh.normals[vi * 3 + 2] * waveDeltaMM * AR_UNIT_SCALE;
        }
        morphTargetPos[vi * 3] = dx;
        morphTargetPos[vi * 3 + 1] = dy;
        morphTargetPos[vi * 3 + 2] = dz;
        if (dx < mMin[0]) mMin[0] = dx; if (dx > mMax[0]) mMax[0] = dx;
        if (dy < mMin[1]) mMin[1] = dy; if (dy > mMax[1]) mMax[1] = dy;
        if (dz < mMin[2]) mMin[2] = dz; if (dz > mMax[2]) mMax[2] = dz;
      }
      morphMin = mMin; morphMax = mMax;
    }

    if (!animType || animType === 'none') {
      return {
        morphTargetPos: null, morphMin, morphMax,
        animBin: new ArrayBuffer(0), animJson: { accessors: [], bufferViews: [], animations: [] }
      };
    }

    let timesArray = new Float32Array(frames + 1);
    let valuesArray, path, valType;
    const nodeIdx = 0;

    if (animType === 'rotate') {
      valuesArray = new Float32Array((frames + 1) * 4);
      for (let i = 0; i <= frames; i++) {
        timesArray[i] = i * timeStep;
        const angle = (i / frames) * 2 * Math.PI * spd;
        valuesArray[i * 4 + 0] = 0;
        valuesArray[i * 4 + 1] = Math.sin(angle / 2);
        valuesArray[i * 4 + 2] = 0;
        valuesArray[i * 4 + 3] = Math.cos(angle / 2);
      }
      path = 'rotation'; valType = 'VEC4';
    } else if (animType === 'pulse' || animType === 'breathe') {
      valuesArray = new Float32Array((frames + 1) * 3);
      for (let i = 0; i <= frames; i++) {
        timesArray[i] = i * timeStep;
        const s = 1.0 + 0.14 * Math.sin((i / frames) * 2 * Math.PI * spd);
        valuesArray[i * 3 + 0] = s;
        valuesArray[i * 3 + 1] = s;
        valuesArray[i * 3 + 2] = animType === 'breathe' ? (1.0 + 0.35 * Math.sin((i / frames) * 2 * Math.PI * spd)) : s;
      }
      path = 'scale'; valType = 'VEC3';
    } else if (animType === 'float') {
      valuesArray = new Float32Array((frames + 1) * 3);
      for (let i = 0; i <= frames; i++) {
        timesArray[i] = i * timeStep;
        const dy = 7.0 * AR_UNIT_SCALE * (0.5 + 0.5 * Math.sin((i / frames) * 2 * Math.PI * spd));
        valuesArray[i * 3 + 0] = 0;
        valuesArray[i * 3 + 1] = dy;
        valuesArray[i * 3 + 2] = 0;
      }
      path = 'translation'; valType = 'VEC3';
    } else if ((animType === 'morph' || animType === 'wave') && morphTargetPos) {
      valuesArray = new Float32Array(frames + 1);
      for (let i = 0; i <= frames; i++) {
        timesArray[i] = i * timeStep;
        valuesArray[i] = 0.5 - 0.5 * Math.cos((i / frames) * 2 * Math.PI * spd);
      }
      path = 'weights'; valType = 'SCALAR';
    } else {
      return { morphTargetPos: null, morphMin, morphMax, animBin: new ArrayBuffer(0), animJson: { accessors: [], bufferViews: [], animations: [] } };
    }

    const timesByteLength = timesArray.byteLength;
    const valuesByteLength = valuesArray.byteLength;
    const animBin = new ArrayBuffer(align4(timesByteLength + valuesByteLength));
    new Uint8Array(animBin).set(new Uint8Array(timesArray.buffer), 0);
    new Uint8Array(animBin).set(new Uint8Array(valuesArray.buffer), timesByteLength);

    const animJson = {
      accessors: [
        { bufferView: 0, componentType: 5126, count: timesArray.length, type: 'SCALAR', min: [timesArray[0]], max: [timesArray[timesArray.length - 1]] },
        { bufferView: 1, componentType: 5126, count: valuesArray.length / (valType === 'VEC4' ? 4 : (valType === 'VEC3' ? 3 : 1)), type: valType }
      ],
      bufferViews: [
        { byteOffset: 0, byteLength: timesByteLength },
        { byteOffset: timesByteLength, byteLength: valuesByteLength }
      ],
      animations: [{
        name: 'Anim_' + animType,
        channels: [{ sampler: 0, target: { node: nodeIdx, path } }],
        samplers: [{ input: 0, interpolation: 'LINEAR', output: 1 }]
      }]
    };

    return { morphTargetPos, morphMin, morphMax, animBin, animJson };
  }

  /**
   * Core glTF 2.0 Scene + Binary Buffer Assembler (Shared by GLB & JSON GLTF)
   */
  function assembleGLTFPackage(meshData, opts = {}) {
    if (!meshData || !meshData.mesh || !meshData.mesh.verts || !meshData.mesh.indices) {
      throw new Error('Invalid meshData provided to Engine4D');
    }

    const { dims = { x: 100, y: 100, z: 7 }, vertexColors = null } = meshData;
    const {
      animType = 'none',
      animSpeed = 1.0,
      animDuration = 3,
      metalness = 0.04,
      roughness = 0.58,
      color = '#4f8eff',
      emissive = false,
      pngBytes = null
    } = opts;

    const activeMesh = buildCompactARMesh(meshData);
    const bounds = activeMesh.bounds || { minX: -dims.x / 2, maxX: dims.x / 2, minY: -dims.y / 2, maxY: dims.y / 2, minZ: 0, maxZ: dims.z };
    const cx = (bounds.minX + bounds.maxX) * 0.5;
    const cy = (bounds.minY + bounds.maxY) * 0.5;
    const cz = (bounds.minZ + bounds.maxZ) * 0.5;

    const topVerts = activeMesh.topVerts || (activeMesh.verts.length / 3);
    const topTris = activeMesh.topTriangles;
    const extraTris = activeMesh.extraTriangles ? activeMesh.extraTriangles.length : 0;

    const vertCount = topVerts + extraTris * 3;
    const totalTris = topTris + extraTris;
    const indexCount = totalTris * 3;

    const posBuffer = new Float32Array(vertCount * 3);
    const normalBuffer = new Float32Array(vertCount * 3);
    const hasTexture = Boolean(pngBytes && pngBytes.byteLength > 0);
    const uvBuffer = new Float32Array(vertCount * 2);

    const vCols = (!hasTexture) ? (activeMesh.vertexColors || vertexColors) : null;
    const colorBuffer = vCols ? new Float32Array(vertCount * 3) : null;

    const useUint16 = vertCount <= 65535;
    const indexBuffer = useUint16 ? new Uint16Array(indexCount) : new Uint32Array(indexCount);

    let posMin = [Infinity, Infinity, Infinity];
    let posMax = [-Infinity, -Infinity, -Infinity];

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

    const topIndexLen = topTris * 3;
    for (let i = 0; i < topIndexLen; i++) indexBuffer[i] = activeMesh.indices[i];

    let vi = topVerts;
    let ii = topIndexLen;
    if (activeMesh.extraTriangles && extraTris > 0) {
      const baseCol = hexToRGB(color);
      const bxSpan = Math.max(1, bounds.maxX - bounds.minX);
      const bySpan = Math.max(1, bounds.maxY - bounds.minY);
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

          uvBuffer[vi * 2] = Math.max(0, Math.min(1, (tv[0] - bounds.minX) / bxSpan));
          uvBuffer[vi * 2 + 1] = Math.max(0, Math.min(1, 1.0 - (tv[1] - bounds.minY) / bySpan));

          if (colorBuffer) {
            colorBuffer[vi * 3] = baseCol[0] * 0.42;
            colorBuffer[vi * 3 + 1] = baseCol[1] * 0.42;
            colorBuffer[vi * 3 + 2] = baseCol[2] * 0.42;
          }
          indexBuffer[ii++] = vi;
          vi++;
        }
      }
    }

    const { morphTargetPos, morphMin, morphMax, animBin, animJson } = buildMorphDeltaAndTracks(
      animType, activeMesh, vertCount, cx, cy, cz, animSpeed, animDuration
    );

    const posLen = posBuffer.byteLength;
    const normLen = normalBuffer.byteLength;
    const uvLen = uvBuffer.byteLength;
    const colLen = colorBuffer ? colorBuffer.byteLength : 0;
    const morphLen = morphTargetPos ? morphTargetPos.byteLength : 0;
    const idxLen = indexBuffer.byteLength;
    const idxPad = align4(idxLen);
    const imgLen = hasTexture ? pngBytes.byteLength : 0;
    const imgPad = align4(imgLen);

    const o_norm = posLen;
    const o_uv = o_norm + normLen;
    const o_col = o_uv + uvLen;
    const o_morph = o_col + colLen;
    const o_idx = o_morph + morphLen;
    const o_img = o_idx + idxPad;
    const o_anim = o_img + imgPad;
    const totalBinLen = align4(o_anim + animBin.byteLength);

    const binBuffer = new ArrayBuffer(totalBinLen);
    const binView = new Uint8Array(binBuffer);
    binView.set(new Uint8Array(posBuffer.buffer), 0);
    binView.set(new Uint8Array(normalBuffer.buffer), o_norm);
    binView.set(new Uint8Array(uvBuffer.buffer), o_uv);
    if (colorBuffer) binView.set(new Uint8Array(colorBuffer.buffer), o_col);
    if (morphTargetPos) binView.set(new Uint8Array(morphTargetPos.buffer), o_morph);
    binView.set(new Uint8Array(indexBuffer.buffer), o_idx);
    if (hasTexture) binView.set(pngBytes, o_img);
    if (animBin.byteLength > 0) binView.set(new Uint8Array(animBin), o_anim);

    const accessors = [
      { bufferView: 0, componentType: 5126, count: vertCount, type: 'VEC3', min: posMin, max: posMax },
      { bufferView: 1, componentType: 5126, count: vertCount, type: 'VEC3' },
      { bufferView: 2, componentType: 5126, count: vertCount, type: 'VEC2' }
    ];
    const bufferViews = [
      { buffer: 0, byteOffset: 0, byteLength: posLen, target: 34962 },
      { buffer: 0, byteOffset: o_norm, byteLength: normLen, target: 34962 },
      { buffer: 0, byteOffset: o_uv, byteLength: uvLen, target: 34962 }
    ];
    const primitiveAttribs = { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 };

    if (colorBuffer) {
      const bvIdx = bufferViews.length;
      bufferViews.push({ buffer: 0, byteOffset: o_col, byteLength: colLen, target: 34962 });
      const accIdx = accessors.length;
      accessors.push({ bufferView: bvIdx, componentType: 5126, count: vertCount, type: 'VEC3' });
      primitiveAttribs.COLOR_0 = accIdx;
    }

    let targets = undefined;
    if (morphTargetPos) {
      const mBvIdx = bufferViews.length;
      bufferViews.push({ buffer: 0, byteOffset: o_morph, byteLength: morphLen, target: 34962 });
      const mAccIdx = accessors.length;
      accessors.push({ bufferView: mBvIdx, componentType: 5126, count: vertCount, type: 'VEC3', min: morphMin, max: morphMax });
      targets = [{ POSITION: mAccIdx }];
    }

    const idxBvIdx = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset: o_idx, byteLength: idxLen, target: 34963 });
    const idxAccIdx = accessors.length;
    accessors.push({ bufferView: idxBvIdx, componentType: useUint16 ? 5123 : 5125, count: indexCount, type: 'SCALAR', min: [0], max: [vertCount - 1] });

    let imgBvIdx = -1;
    let imgMimeType = 'image/png';
    if (hasTexture) {
      imgBvIdx = bufferViews.length;
      bufferViews.push({ buffer: 0, byteOffset: o_img, byteLength: imgLen });
      if (pngBytes.byteLength > 2 && pngBytes[0] === 0xFF && pngBytes[1] === 0xD8) imgMimeType = 'image/jpeg';
    }

    const animBvBase = bufferViews.length;
    const animAccBase = accessors.length;
    animJson.bufferViews.forEach(bv => bufferViews.push({ ...bv, buffer: 0, byteOffset: bv.byteOffset + o_anim }));
    animJson.accessors.forEach((acc, idx) => accessors.push({ ...acc, bufferView: animBvBase + idx }));

    const baseColor = hexToRGB(color);
    const emissiveFactor = emissive ? [baseColor[0] * 0.45, baseColor[1] * 0.45, baseColor[2] * 0.45] : [0, 0, 0];
    const pbr = {
      baseColorFactor: (hasTexture || colorBuffer) ? [1, 1, 1, 1] : baseColor,
      metallicFactor: hasTexture ? Math.min(metalness, 0.35) : metalness,
      roughnessFactor: roughness
    };
    if (hasTexture) pbr.baseColorTexture = { index: 0 };

    const meshObj = {
      name: 'Model_Geometry',
      primitives: [{ attributes: primitiveAttribs, indices: idxAccIdx, material: 0, mode: 4 }]
    };
    if (targets) {
      meshObj.primitives[0].targets = targets;
      meshObj.weights = [0.0];
    }

    const gltfJson = {
      asset: { version: '2.0', generator: 'Studios-Pro.com — New 3D 4D Studio Ultra', copyright: 'https://studios-pro.com' },
      scene: 0,
      scenes: [{ name: 'Scene', nodes: [0] }],
      nodes: [{ name: 'Model_4D', mesh: 0, translation: [0, 0, 0] }],
      meshes: [meshObj],
      materials: [{ name: 'Material_PBR', pbrMetallicRoughness: pbr, emissiveFactor, doubleSided: true }],
      accessors,
      bufferViews,
      buffers: [{ byteLength: binBuffer.byteLength }]
    };

    if (hasTexture && imgBvIdx >= 0) {
      gltfJson.images = [{ bufferView: imgBvIdx, mimeType: imgMimeType }];
      gltfJson.samplers = [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }];
      gltfJson.textures = [{ source: 0, sampler: 0 }];
    }

    if (animJson.animations && animJson.animations.length > 0) {
      gltfJson.animations = animJson.animations.map(anim => ({
        ...anim,
        samplers: anim.samplers.map(s => ({ ...s, input: animAccBase, output: animAccBase + 1 }))
      }));
    }

    return { gltfJson, binBuffer };
  }

  function buildGLB(meshData, opts = {}) {
    const { gltfJson, binBuffer } = assembleGLTFPackage(meshData, opts);
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

    dv.setUint32(0, 0x46546C67, true);
    dv.setUint32(4, 2, true);
    dv.setUint32(8, totalGLB, true);

    dv.setUint32(12, jsonPadded, true);
    dv.setUint32(16, 0x4E4F534A, true);
    new Uint8Array(glb, 20, jsonPadded).set(jsonChunk);

    const binOff = 12 + 8 + jsonPadded;
    dv.setUint32(binOff, binPadded, true);
    dv.setUint32(binOff + 4, 0x004E4942, true);
    new Uint8Array(glb, binOff + 8, binPadded).set(new Uint8Array(binBuffer));

    return glb;
  }

  /**
   * True Khronos GLTF 2.0 UTF-8 JSON with self-contained embedded Base64 buffer URI
   */
  function buildGLTF(meshData, opts = {}) {
    const { gltfJson, binBuffer } = assembleGLTFPackage(meshData, opts);
    const jsonCopy = JSON.parse(JSON.stringify(gltfJson));
    jsonCopy.buffers[0].uri = 'data:application/octet-stream;base64,' + uint8ToBase64(new Uint8Array(binBuffer));
    return JSON.stringify(jsonCopy, null, 2);
  }

  return { buildGLB, buildGLTF };

})();

window.Engine4D = Engine4D;
