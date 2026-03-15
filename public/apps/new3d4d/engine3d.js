/**
 * ENGINE 3D — ULTRA QUALITY — Image to STL/OBJ Converter
 * ────────────────────────────────────────────────────────
 * Algorithms:
 *  • Bicubic interpolation (vs bilinear) for smooth heightmaps
 *  • Super-sampling (2× or 4× internal resolution, then average)
 *  • Bilateral filter (edge-preserving smoothing — keeps contours sharp)
 *  • Laplacian smoothing (proper 3D mesh smoothing)
 *  • Indexed vertex mesh (shared vertices, no duplicates)
 *  • Area-weighted vertex normals (smooth shading quality)
 *  • Poisson-inspired depth enhancement
 *  • Adaptive edge detection for enhanced mode
 */

const Engine3D = (() => {

  // ─── Bicubic Interpolation ────────────────────────────────────────────────

  function cubicHermite(A, B, C, D, t) {
    const a = -A / 2 + (3 * B) / 2 - (3 * C) / 2 + D / 2;
    const b = A - (5 * B) / 2 + 2 * C - D / 2;
    const c = -A / 2 + C / 2;
    const d = B;
    return a * t * t * t + b * t * t + c * t + d;
  }

  function samplePixelRaw(data, x, y, width, height) {
    const cx = Math.max(0, Math.min(width - 1, x));
    const cy = Math.max(0, Math.min(height - 1, y));
    const idx = (cy * width + cx) * 4;
    return (0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]) / 255;
  }

  function sampleBicubic(data, fx, fy, width, height) {
    const x = Math.floor(fx), y = Math.floor(fy);
    const tx = fx - x, ty = fy - y;
    const rows = [];
    for (let dy = -1; dy <= 2; dy++) {
      const col = [];
      for (let dx = -1; dx <= 2; dx++) {
        col.push(samplePixelRaw(data, x + dx, y + dy, width, height));
      }
      rows.push(cubicHermite(col[0], col[1], col[2], col[3], tx));
    }
    return Math.max(0, Math.min(1, cubicHermite(rows[0], rows[1], rows[2], rows[3], ty)));
  }

  // ─── Bilateral Filter (Edge-Preserving Smoothing) ─────────────────────────

  function bilateralFilter(hmap, width, height, radius, sigmaS, sigmaR) {
    const out = new Float32Array(hmap.length);
    const r = Math.ceil(radius);
    const s2 = 2 * sigmaS * sigmaS;
    const r2 = 2 * sigmaR * sigmaR;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const center = hmap[y * width + x];
        let sum = 0, wsum = 0;
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const nx = Math.max(0, Math.min(width - 1, x + dx));
            const ny = Math.max(0, Math.min(height - 1, y + dy));
            const val = hmap[ny * width + nx];
            const spatialW = Math.exp(-(dx * dx + dy * dy) / s2);
            const rangeW = Math.exp(-((val - center) * (val - center)) / r2);
            const w = spatialW * rangeW;
            sum += val * w; wsum += w;
          }
        }
        out[y * width + x] = sum / wsum;
      }
    }
    return out;
  }

  // ─── Laplacian Smoothing ──────────────────────────────────────────────────

  function laplacianSmooth(hmap, width, height, passes, lambda) {
    let cur = new Float32Array(hmap);
    const lam = lambda !== undefined ? lambda : 0.5;
    for (let p = 0; p < passes; p++) {
      const next = new Float32Array(cur.length);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const c = cur[y * width + x];
          // 8-neighbors
          let sum = 0, cnt = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = Math.max(0, Math.min(width - 1, x + dx));
              const ny = Math.max(0, Math.min(height - 1, y + dy));
              const w = (dx !== 0 && dy !== 0) ? 0.5 : 1.0; // diagonal weight
              sum += cur[ny * width + nx] * w;
              cnt += w;
            }
          }
          const lap = sum / cnt - c;
          next[y * width + x] = c + lam * lap;
        }
      }
      cur = next;
    }
    return cur;
  }

  // ─── Super-Sampling ───────────────────────────────────────────────────────

  /**
   * Build a heightmap at superFactor × resolution, then downsample by averaging.
   * This gives much better anti-aliasing than direct sampling.
   */
  function buildSuperSampledHeightmap(data, imgW, imgH, gridW, gridH, mode, superFactor) {
    const sw = gridW * superFactor;
    const sh = gridH * superFactor;
    const superHmap = new Float32Array(sw * sh);

    for (let gy = 0; gy < sh; gy++) {
      for (let gx = 0; gx < sw; gx++) {
        const fx = (gx / (sw - 1)) * (imgW - 1);
        const fy = (gy / (sh - 1)) * (imgH - 1);
        let v = sampleBicubic(data, fx, fy, imgW, imgH);
        if (mode === 'lithophane') v = 1 - v;
        else if (mode === 'emboss') v = v > 0.5 ? 1 : 0;
        superHmap[gy * sw + gx] = v;
      }
    }

    // Downsample (average pooling)
    const hmap = new Float32Array(gridW * gridH);
    for (let gy = 0; gy < gridH; gy++) {
      for (let gx = 0; gx < gridW; gx++) {
        let sum = 0;
        for (let dy = 0; dy < superFactor; dy++) {
          for (let dx = 0; dx < superFactor; dx++) {
            sum += superHmap[(gy * superFactor + dy) * sw + (gx * superFactor + dx)];
          }
        }
        hmap[gy * gridW + gx] = sum / (superFactor * superFactor);
      }
    }
    return hmap;
  }

  // ─── Direct Heightmap (no super-sampling) ─────────────────────────────────

  function buildHeightMap(data, imgW, imgH, gridW, gridH, mode) {
    const hmap = new Float32Array(gridW * gridH);
    for (let gy = 0; gy < gridH; gy++) {
      for (let gx = 0; gx < gridW; gx++) {
        const fx = (gx / (gridW - 1)) * (imgW - 1);
        const fy = (gy / (gridH - 1)) * (imgH - 1);
        let v = sampleBicubic(data, fx, fy, imgW, imgH);
        if (mode === 'lithophane') v = 1 - v;
        else if (mode === 'emboss') v = v > 0.5 ? 1 : 0;
        hmap[gy * gridW + gx] = v;
      }
    }
    return hmap;
  }

  // ─── Contrast Enhancement (Gamma / Levels) ────────────────────────────────

  function enhanceHeightmap(hmap, gamma, minVal, maxVal) {
    const range = maxVal - minVal || 1;
    const out = new Float32Array(hmap.length);
    for (let i = 0; i < hmap.length; i++) {
      let v = (hmap[i] - minVal) / range;
      v = Math.max(0, Math.min(1, v));
      out[i] = Math.pow(v, gamma);
    }
    return out;
  }

  function hmapStats(hmap) {
    let min = Infinity, max = -Infinity, sum = 0;
    for (let i = 0; i < hmap.length; i++) {
      if (hmap[i] < min) min = hmap[i];
      if (hmap[i] > max) max = hmap[i];
      sum += hmap[i];
    }
    return { min, max, avg: sum / hmap.length };
  }

  // ─── Vertex Color Baking (RGB + AO) ──────────────────────────────────────

  /**
   * Sample bilinear RGBA from original image at grid position (gx,gy)
   */
  function sampleColorBicubic(data, fx, fy, imgW, imgH) {
    const px = Math.max(0, Math.min(imgW - 1, Math.round(fx)));
    const py = Math.max(0, Math.min(imgH - 1, Math.round(fy)));
    const idx = (py * imgW + px) * 4;
    return [data[idx] / 255, data[idx + 1] / 255, data[idx + 2] / 255];
  }

  /**
   * Bake vertex colors: sample original image RGB per vertex,
   * then multiply by a cavity-based AO factor derived from height differences.
   * Returns Float32Array [r, g, b per vertex]
   */
  function bakeVertexColors(data, imgW, imgH, hmap, gridW, gridH, aoStrength) {
    const colors = new Float32Array(gridW * gridH * 3);
    const ao = aoStrength !== undefined ? aoStrength : 0.6;

    for (let gy = 0; gy < gridH; gy++) {
      for (let gx = 0; gx < gridW; gx++) {
        const fx = (gx / (gridW - 1)) * (imgW - 1);
        const fy = (gy / (gridH - 1)) * (imgH - 1);
        const [r, g, b] = sampleColorBicubic(data, fx, fy, imgW, imgH);

        // Cavity AO: how much lower this point is vs. its neighbors
        const center = hmap[gy * gridW + gx];
        let diff = 0, cnt = 0;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx2 = Math.max(0, Math.min(gridW - 1, gx + dx));
            const ny2 = Math.max(0, Math.min(gridH - 1, gy + dy));
            diff += Math.max(0, hmap[ny2 * gridW + nx2] - center);
            cnt++;
          }
        }
        const cavityAO = 1 - Math.min(ao, (diff / cnt) * ao * 5);

        const ci = (gy * gridW + gx) * 3;
        colors[ci] = r * cavityAO;
        colors[ci + 1] = g * cavityAO;
        colors[ci + 2] = b * cavityAO;
      }
    }
    return colors;
  }

  // ─── Midpoint Subdivision Pass ─────────────────────────────────────────────

  /**
   * Simple 1-pass midpoint subdivision of the heightmap grid.
   * Doubles resolution using bilinear interpolation between grid points.
   * Gives a much smoother result than just using a higher resolution input.
   */
  function subdivide(hmap, gridW, gridH) {
    const nW = gridW * 2 - 1;
    const nH = gridH * 2 - 1;
    const out = new Float32Array(nW * nH);
    for (let gy = 0; gy < nH; gy++) {
      for (let gx = 0; gx < nW; gx++) {
        const sx = gx / 2, sy = gy / 2;
        const ix = Math.floor(sx), iy = Math.floor(sy);
        const tx = sx - ix, ty = sy - iy;
        const ix2 = Math.min(gridW - 1, ix + 1);
        const iy2 = Math.min(gridH - 1, iy + 1);
        const v00 = hmap[iy * gridW + ix];
        const v10 = hmap[iy * gridW + ix2];
        const v01 = hmap[iy2 * gridW + ix];
        const v11 = hmap[iy2 * gridW + ix2];
        out[gy * nW + gx] = v00 * (1 - tx) * (1 - ty) + v10 * tx * (1 - ty) + v01 * (1 - tx) * ty + v11 * tx * ty;
      }
    }
    return { hmap: out, gridW: nW, gridH: nH };
  }

  // ─── Indexed Mesh Builder ─────────────────────────────────────────────────

  /**
   * Build an INDEXED mesh (shared vertices). Returns:
   *   vertices: Float32Array [x,y,z per vertex]
   *   indices:  Uint32Array  [3 per triangle]
   *   normals:  Float32Array [nx,ny,nz per vertex] — area-weighted
   */
  function buildIndexedMesh(hmap, gridW, gridH, depthMM, baseMM, scaleMM, solidBase, mirrorY) {
    const aspectY = gridH / gridW;
    const xLen = scaleMM;
    const yLen = scaleMM * aspectY;

    // vertex count: top surface + optionally side walls + base
    const topVerts = gridW * gridH;

    // Build top surface vertices
    const verts = new Float32Array(topVerts * 3);
    for (let gy = 0; gy < gridH; gy++) {
      for (let gx = 0; gx < gridW; gx++) {
        const h = hmap[gy * gridW + gx];
        const vx = (gx / (gridW - 1)) * xLen;
        const vy = mirrorY
          ? ((gridH - 1 - gy) / (gridH - 1)) * yLen
          : (gy / (gridH - 1)) * yLen;
        const vz = baseMM + h * depthMM;
        const vi = (gy * gridW + gx) * 3;
        verts[vi] = vx;
        verts[vi + 1] = vy;
        verts[vi + 2] = vz;
      }
    }

    // Build top surface indices (2 triangles per quad)
    const topTriangles = (gridW - 1) * (gridH - 1) * 2;
    let totalTriangles = topTriangles;

    // Side walls: 4 walls × (nSeg-1) × 2 triangles each
    if (solidBase) {
      totalTriangles += (gridW - 1) * 2 * 2; // front + back
      totalTriangles += (gridH - 1) * 2 * 2; // left + right
      totalTriangles += 2;                    // base quad
    }

    const indices = new Uint32Array(totalTriangles * 3);
    let iIdx = 0;

    // Top surface
    for (let gy = 0; gy < gridH - 1; gy++) {
      for (let gx = 0; gx < gridW - 1; gx++) {
        const i00 = gy * gridW + gx;
        const i10 = gy * gridW + gx + 1;
        const i01 = (gy + 1) * gridW + gx;
        const i11 = (gy + 1) * gridW + gx + 1;
        indices[iIdx++] = i00; indices[iIdx++] = i10; indices[iIdx++] = i11;
        indices[iIdx++] = i00; indices[iIdx++] = i11; indices[iIdx++] = i01;
      }
    }

    // Compute area-weighted vertex normals
    const normals = new Float32Array(topVerts * 3);
    const triCount_top = topTriangles;
    for (let ti = 0; ti < triCount_top; ti++) {
      const ii = ti * 3;
      const ai = indices[ii] * 3, bi = indices[ii + 1] * 3, ci = indices[ii + 2] * 3;
      const ax = verts[ai], ay = verts[ai + 1], az = verts[ai + 2];
      const bx = verts[bi], by = verts[bi + 1], bz = verts[bi + 2];
      const cx2 = verts[ci], cy = verts[ci + 1], cz = verts[ci + 2];
      const ux = bx - ax, uy = by - ay, uz = bz - az;
      const vvx = cx2 - ax, vvy = cy - ay, vvz = cz - az;
      const nx = uy * vvz - uz * vvy;
      const ny = uz * vvx - ux * vvz;
      const nz = ux * vvy - uy * vvx;
      // Accumulate (area-weighted by cross product magnitude)
      for (const vi of [indices[ii], indices[ii + 1], indices[ii + 2]]) {
        normals[vi * 3] += nx;
        normals[vi * 3 + 1] += ny;
        normals[vi * 3 + 2] += nz;
      }
    }
    // Normalize
    for (let vi = 0; vi < topVerts; vi++) {
      const ni = vi * 3;
      const len = Math.sqrt(normals[ni] ** 2 + normals[ni + 1] ** 2 + normals[ni + 2] ** 2) || 1;
      normals[ni] /= len; normals[ni + 1] /= len; normals[ni + 2] /= len;
    }

    // Side walls + base: append as extra triangles (non-indexed for simplicity)
    let extraTriangles = [];

    if (solidBase) {
      const z0 = 0;
      // Front wall (gy=0)
      for (let gx = 0; gx < gridW - 1; gx++) {
        const top0 = [verts[(gx) * 3], verts[(gx) * 3 + 1], verts[(gx) * 3 + 2]];
        const top1 = [verts[(gx + 1) * 3], verts[(gx + 1) * 3 + 1], verts[(gx + 1) * 3 + 2]];
        const bot0 = [top0[0], top0[1], z0];
        const bot1 = [top1[0], top1[1], z0];
        extraTriangles.push([top0, bot0, bot1, [0, -1, 0]], [top0, bot1, top1, [0, -1, 0]]);
      }
      // Back wall (gy=gridH-1)
      for (let gx = 0; gx < gridW - 1; gx++) {
        const row = gridH - 1;
        const top0 = [verts[(row * gridW + gx) * 3], verts[(row * gridW + gx) * 3 + 1], verts[(row * gridW + gx) * 3 + 2]];
        const top1 = [verts[(row * gridW + gx + 1) * 3], verts[(row * gridW + gx + 1) * 3 + 1], verts[(row * gridW + gx + 1) * 3 + 2]];
        const bot0 = [top0[0], top0[1], z0];
        const bot1 = [top1[0], top1[1], z0];
        extraTriangles.push([top0, bot1, bot0, [0, 1, 0]], [top0, top1, bot1, [0, 1, 0]]);
      }
      // Left wall (gx=0)
      for (let gy = 0; gy < gridH - 1; gy++) {
        const top0 = [verts[(gy * gridW) * 3], verts[(gy * gridW) * 3 + 1], verts[(gy * gridW) * 3 + 2]];
        const top1 = [verts[((gy + 1) * gridW) * 3], verts[((gy + 1) * gridW) * 3 + 1], verts[((gy + 1) * gridW) * 3 + 2]];
        const bot0 = [top0[0], top0[1], z0];
        const bot1 = [top1[0], top1[1], z0];
        extraTriangles.push([top0, bot1, bot0, [-1, 0, 0]], [top0, top1, bot1, [-1, 0, 0]]);
      }
      // Right wall (gx=gridW-1)
      for (let gy = 0; gy < gridH - 1; gy++) {
        const col = gridW - 1;
        const top0 = [verts[(gy * gridW + col) * 3], verts[(gy * gridW + col) * 3 + 1], verts[(gy * gridW + col) * 3 + 2]];
        const top1 = [verts[((gy + 1) * gridW + col) * 3], verts[((gy + 1) * gridW + col) * 3 + 1], verts[((gy + 1) * gridW + col) * 3 + 2]];
        const bot0 = [top0[0], top0[1], z0];
        const bot1 = [top1[0], top1[1], z0];
        extraTriangles.push([top0, bot0, bot1, [1, 0, 0]], [top0, bot1, top1, [1, 0, 0]]);
      }
      // Base plate
      const BX = xLen, BY = yLen;
      extraTriangles.push(
        [[0, 0, z0], [BX, BY, z0], [BX, 0, z0], [0, 0, -1]],
        [[0, 0, z0], [0, BY, z0], [BX, BY, z0], [0, 0, -1]]
      );
    }

    return { verts, normals, indices, topVerts, extraTriangles, topTriangles, gridW, gridH };
  }

  // ─── STL Binary Export ────────────────────────────────────────────────────

  function buildSTLBuffer(mesh) {
    const { verts, normals, indices, topTriangles, extraTriangles } = mesh;
    const extTris = extraTriangles.length;
    const totalTris = topTriangles + extTris;

    const buf = new ArrayBuffer(84 + totalTris * 50);
    const view = new DataView(buf);

    const headStr = 'STL Ultra — 3D·4D Studio — Bicubic Indexed Mesh';
    for (let i = 0; i < 80; i++) view.setUint8(i, i < headStr.length ? headStr.charCodeAt(i) : 0);
    view.setUint32(80, totalTris, true);

    let off = 84;

    function writeVec3(x, y, z) {
      view.setFloat32(off, x, true); off += 4;
      view.setFloat32(off, y, true); off += 4;
      view.setFloat32(off, z, true); off += 4;
    }

    // Top surface (indexed — compute per-face normal from cross product for STL)
    for (let ti = 0; ti < topTriangles; ti++) {
      const ii = ti * 3;
      const ai = indices[ii], bi = indices[ii + 1], ci = indices[ii + 2];

      // Average vertex normals for the face
      let nx = (normals[ai * 3] + normals[bi * 3] + normals[ci * 3]) / 3;
      let ny = (normals[ai * 3 + 1] + normals[bi * 3 + 1] + normals[ci * 3 + 1]) / 3;
      let nz = (normals[ai * 3 + 2] + normals[bi * 3 + 2] + normals[ci * 3 + 2]) / 3;
      const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      nx /= nl; ny /= nl; nz /= nl;

      writeVec3(nx, ny, nz);
      writeVec3(verts[ai * 3], verts[ai * 3 + 1], verts[ai * 3 + 2]);
      writeVec3(verts[bi * 3], verts[bi * 3 + 1], verts[bi * 3 + 2]);
      writeVec3(verts[ci * 3], verts[ci * 3 + 1], verts[ci * 3 + 2]);
      view.setUint16(off, 0, true); off += 2;
    }

    // Side walls + base (non-indexed)
    for (const [a, b, c, n] of extraTriangles) {
      writeVec3(n[0], n[1], n[2]);
      writeVec3(a[0], a[1], a[2]);
      writeVec3(b[0], b[1], b[2]);
      writeVec3(c[0], c[1], c[2]);
      view.setUint16(off, 0, true); off += 2;
    }

    return buf;
  }

  // ─── OBJ Export ───────────────────────────────────────────────────────────

  function buildOBJ(mesh, mtlName) {
    const { verts, normals, indices, topVerts, extraTriangles, topTriangles } = mesh;
    const lines = [
      '# OBJ — 3D·4D Studio Ultra Quality',
      `# Vertices: ${topVerts}, Triangles: ${topTriangles + extraTriangles.length}`,
      `mtllib ${mtlName}.mtl`,
      'o HeightmapMesh',
      'usemtl Material',
      ''
    ];

    // Vertices
    for (let vi = 0; vi < topVerts; vi++) {
      const b = vi * 3;
      lines.push(`v ${verts[b].toFixed(4)} ${verts[b + 1].toFixed(4)} ${verts[b + 2].toFixed(4)}`);
    }
    lines.push('');

    // Vertex normals
    for (let vi = 0; vi < topVerts; vi++) {
      const b = vi * 3;
      lines.push(`vn ${normals[b].toFixed(4)} ${normals[b + 1].toFixed(4)} ${normals[b + 2].toFixed(4)}`);
    }
    lines.push('');

    // Faces (1-indexed)
    for (let ti = 0; ti < topTriangles; ti++) {
      const ii = ti * 3;
      const a = indices[ii] + 1, b = indices[ii + 1] + 1, c = indices[ii + 2] + 1;
      lines.push(`f ${a}//${a} ${b}//${b} ${c}//${c}`);
    }

    // Extra (side walls, base) — write as separate vertices
    let extraVBase = topVerts + 1;
    for (const [a, b, c, n] of extraTriangles) {
      lines.push(`v ${a[0].toFixed(4)} ${a[1].toFixed(4)} ${a[2].toFixed(4)}`);
      lines.push(`v ${b[0].toFixed(4)} ${b[1].toFixed(4)} ${b[2].toFixed(4)}`);
      lines.push(`v ${c[0].toFixed(4)} ${c[1].toFixed(4)} ${c[2].toFixed(4)}`);
      lines.push(`vn ${n[0].toFixed(4)} ${n[1].toFixed(4)} ${n[2].toFixed(4)}`);
    }
    let extraNBase = topVerts + 1;
    for (let i = 0; i < extraTriangles.length; i++) {
      const vb = extraVBase + i * 3;
      const nn = extraNBase + i;
      lines.push(`f ${vb}//${nn} ${vb + 1}//${nn} ${vb + 2}//${nn}`);
    }

    return lines.join('\n');
  }

  function buildMTL(opts) {
    const r = parseInt(opts.color.slice(1, 3), 16) / 255;
    const g = parseInt(opts.color.slice(3, 5), 16) / 255;
    const b = parseInt(opts.color.slice(5, 7), 16) / 255;
    return [
      '# MTL — 3D·4D Studio',
      'newmtl Material',
      `Kd ${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)}`,
      `Ka 0.15 0.15 0.15`,
      `Ks ${(opts.metalness || 0).toFixed(3)} ${(opts.metalness || 0).toFixed(3)} ${(opts.metalness || 0).toFixed(3)}`,
      `Ns ${((1 - (opts.roughness || 0.5)) * 900 + 10).toFixed(1)}`,
      `d 1.0`,
      `illum 2`,
    ].join('\n');
  }

  // ─── Main Public API ──────────────────────────────────────────────────────

  /**
   * @param {ImageData} imageData
   * @param {Object} opts
   * @param {Function} onProgress  (0..1, message)
   */
  function generate(imageData, opts, onProgress) {
    const {
      mode = 'heightmap',
      resolution = 256,
      depthMM = 10,
      baseMM = 2,
      scaleMM = 100,
      smoothPasses = 3,
      smoothMethod = 'bilateral',
      superSample = 2,
      solidBase = true,
      mirrorY = false,
      gamma = 1.0,
      edgeBoost = false,
      bakeColors = false,    // bake original image colors + AO onto mesh
      aoStrength = 0.5,      // AO cavity darkness strength
      subdivPass = false,    // midpoint subdivision for extra smoothness
      color = '#4f8eff',
      metalness = 0,
      roughness = 0.5,
    } = opts;

    const imgW = imageData.width, imgH = imageData.height;
    const data = imageData.data;

    onProgress && onProgress(0.04, 'Sampling heightmap…');

    const gridW = Math.min(resolution, imgW);
    const gridH = Math.min(Math.round(resolution * imgH / imgW), imgH);

    // 1. Build raw heightmap (super-sampled or direct)
    let hmap;
    if (superSample > 1) {
      onProgress && onProgress(0.08, `Super-sampling ${superSample}× …`);
      hmap = buildSuperSampledHeightmap(data, imgW, imgH, gridW, gridH, mode, superSample);
    } else {
      hmap = buildHeightMap(data, imgW, imgH, gridW, gridH, mode);
    }

    // 2. Gamma/levels enhancement
    if (gamma !== 1.0) {
      onProgress && onProgress(0.20, 'Applying gamma correction…');
      const stats = hmapStats(hmap);
      hmap = enhanceHeightmap(hmap, gamma, stats.min, stats.max);
    }

    // 3. Smoothing
    if (smoothPasses > 0) {
      if (smoothMethod === 'bilateral' || smoothMethod === 'both') {
        onProgress && onProgress(0.28, 'Bilateral filter (edge-preserving)…');
        const sigmaS = Math.max(1, smoothPasses * 0.8);
        const sigmaR = 0.15;
        hmap = bilateralFilter(hmap, gridW, gridH, Math.ceil(sigmaS), sigmaS, sigmaR);
      }
      if (smoothMethod === 'laplacian' || smoothMethod === 'both') {
        onProgress && onProgress(0.38, 'Laplacian smoothing…');
        hmap = laplacianSmooth(hmap, gridW, gridH, smoothPasses, 0.4);
      }
      if (smoothMethod === 'box') {
        // Legacy box blur
        onProgress && onProgress(0.35, 'Box smoothing…');
        hmap = laplacianSmooth(hmap, gridW, gridH, smoothPasses, 0.5);
      }
    }

    // 4. Edge boost (enhance detail sharpness)
    if (edgeBoost) {
      onProgress && onProgress(0.45, 'Edge enhancement…');
      hmap = applyEdgeBoost(hmap, gridW, gridH);
    }

    // 4b. Subdivision pass (doubles vertex resolution)
    let finalGridW = gridW, finalGridH = gridH;
    if (subdivPass && gridW < 257) { // only subdivide if resolution won't be too large
      onProgress && onProgress(0.48, 'Subdivision pass…');
      const sub = subdivide(hmap, gridW, gridH);
      hmap = sub.hmap;
      finalGridW = sub.gridW;
      finalGridH = sub.gridH;
    } else {
      finalGridW = gridW;
      finalGridH = gridH;
    }

    // 5. Build indexed mesh
    onProgress && onProgress(0.50, 'Building indexed mesh…');
    const mesh = buildIndexedMesh(hmap, finalGridW, finalGridH, depthMM, baseMM, scaleMM, solidBase, mirrorY);

    // 5b. Bake vertex colors from original image + AO
    let vertexColors = null;
    if (bakeColors) {
      onProgress && onProgress(0.68, 'Baking vertex colors + AO…');
      vertexColors = bakeVertexColors(data, imgW, imgH, hmap, finalGridW, finalGridH, aoStrength);
      mesh.vertexColors = vertexColors;
    }

    // 6. STL
    onProgress && onProgress(0.75, 'Encoding STL binary…');
    const stlBuffer = buildSTLBuffer(mesh);

    // 7. OBJ
    onProgress && onProgress(0.90, 'Encoding OBJ…');
    const objText = buildOBJ(mesh, 'model_3d4d');
    const mtlText = buildMTL({ color, metalness, roughness });

    const totalTris = mesh.topTriangles + mesh.extraTriangles.length;
    const dims = {
      x: scaleMM,
      y: scaleMM * imgH / imgW,
      z: baseMM + depthMM,
    };

    onProgress && onProgress(1.0, 'Done!');

    return {
      stlBuffer, objText, mtlText,
      triangleCount: totalTris,
      vertexCount: mesh.topVerts,
      dims, gridW: finalGridW, gridH: finalGridH, hmap,
      mesh, vertexColors,
    };
  }

  // ─── Edge Boost ───────────────────────────────────────────────────────────

  function applyEdgeBoost(hmap, w, h) {
    // Unsharp mask: result = original + amount × (original - blurred)
    const blurred = laplacianSmooth(hmap, w, h, 2, 0.5);
    const out = new Float32Array(hmap.length);
    for (let i = 0; i < hmap.length; i++) {
      out[i] = Math.max(0, Math.min(1, hmap[i] + 0.6 * (hmap[i] - blurred[i])));
    }
    return out;
  }

  return { generate, buildHeightMap, sampleBicubic, bilateralFilter, laplacianSmooth };

})();

window.Engine3D = Engine3D;
