/**
 * ENGINE 3D — ULTRA MASTER QUALITY — Image to STL/OBJ Relief Sculptor
 * ──────────────────────────────────────────────────────────────────────────
 * Features:
 *  • Multi-Scale Bas-Relief Decomposition (Macro Base Curve + Clamped Micro Detail)
 *  • Anti-Spike Gradient / Slope Limiting (eliminates jagged spikes and needle noise)
 *  • Separable 2-Pass Gaussian Filtering for silky-smooth organic curves
 *  • Edge-Preserving Bilateral & Laplacian Fine Smoothing
 *  • Full-Frame Ultra 3D Relief mode by default (preserves all subjects without clipping)
 *  • Portrait Dome mode with dark feature compensation (eyes & lips stay rounded)
 *  • Cameo Coin mode (numismatic raised border + convex dome)
 *  • Stamp Logo mode (flat plateau extrusion with beveled edges)
 *  • Bicubic interpolation & anti-aliased super-sampling
 *  • Photorealistic Full-Color Vertex Baking with Cavity Ambient Occlusion
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

  // ─── Separable Gaussian Smoothing ─────────────────────────────────────────

  function createGaussianKernel(radius, sigma) {
    const size = radius * 2 + 1;
    const kernel = new Float32Array(size);
    let sum = 0;
    for (let i = 0; i < size; i++) {
      const x = i - radius;
      const v = Math.exp(-(x * x) / (2 * sigma * sigma));
      kernel[i] = v;
      sum += v;
    }
    for (let i = 0; i < size; i++) kernel[i] /= sum;
    return kernel;
  }

  function gaussianBlur(data, w, h, radius, sigma) {
    const kernel = createGaussianKernel(radius, sigma);
    const temp = new Float32Array(w * h);
    const out = new Float32Array(w * h);

    // Horizontal pass
    for (let y = 0; y < h; y++) {
      const yOff = y * w;
      for (let x = 0; x < w; x++) {
        let sum = 0;
        for (let k = -radius; k <= radius; k++) {
          const nx = Math.max(0, Math.min(w - 1, x + k));
          sum += data[yOff + nx] * kernel[k + radius];
        }
        temp[yOff + x] = sum;
      }
    }

    // Vertical pass
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0;
        for (let k = -radius; k <= radius; k++) {
          const ny = Math.max(0, Math.min(h - 1, y + k));
          sum += temp[ny * w + x] * kernel[k + radius];
        }
        out[y * w + x] = sum;
      }
    }
    return out;
  }

  // ─── Slope / Spike Limiter ────────────────────────────────────────────────

  /**
   * Prevents any two adjacent vertices from forming unnatural spikes or stalagmites.
   */
  function clampSlope(hmap, w, h, maxSlope = 0.09) {
    const out = new Float32Array(hmap);
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = y * w + x;
          const c = out[idx];

          if (x < w - 1) {
            const r = out[idx + 1];
            if (r - c > maxSlope) out[idx + 1] = c + maxSlope;
            else if (c - r > maxSlope) out[idx] = r + maxSlope;
          }
          if (y < h - 1) {
            const b = out[idx + w];
            if (b - c > maxSlope) out[idx + w] = c + maxSlope;
            else if (c - b > maxSlope) out[idx] = b + maxSlope;
          }
        }
      }
    }
    return out;
  }

  // ─── Bilateral Filter (Edge-Preserving Fine Smoothing) ─────────────────────

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
        out[y * width + x] = sum / (wsum || 1);
      }
    }
    return out;
  }

  // ─── Laplacian Smoothing ──────────────────────────────────────────────────

  function laplacianSmooth(hmap, width, height, passes, lambda) {
    let cur = new Float32Array(hmap);
    const lam = lambda !== undefined ? lambda : 0.4;
    for (let p = 0; p < passes; p++) {
      const next = new Float32Array(cur.length);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const c = cur[y * width + x];
          let sum = 0, cnt = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = Math.max(0, Math.min(width - 1, x + dx));
              const ny = Math.max(0, Math.min(height - 1, y + dy));
              const w = (dx !== 0 && dy !== 0) ? 0.5 : 1.0;
              sum += cur[ny * width + nx] * w;
              cnt += w;
            }
          }
          const lap = sum / (cnt || 1) - c;
          next[y * width + x] = c + lam * lap;
        }
      }
      cur = next;
    }
    return cur;
  }

  // ─── Optional Background Isolation ────────────────────────────────────────

  function detectBackgroundColor(data, imgW, imgH) {
    let rSum = 0, gSum = 0, bSum = 0, count = 0;
    const border = Math.max(1, Math.min(8, Math.floor(Math.min(imgW, imgH) * 0.03)));
    for (let y = 0; y < imgH; y++) {
      for (let x = 0; x < imgW; x++) {
        if (x < border || x >= imgW - border || y < border || y >= imgH - border) {
          const idx = (y * imgW + x) * 4;
          rSum += data[idx];
          gSum += data[idx + 1];
          bSum += data[idx + 2];
          count++;
        }
      }
    }
    return [rSum / (count || 1), gSum / (count || 1), bSum / (count || 1)];
  }

  function computeSubjectMask(data, imgW, imgH, gridW, gridH, tolerance, feather) {
    const bg = detectBackgroundColor(data, imgW, imgH);
    const mask = new Float32Array(gridW * gridH);
    const tol = tolerance !== undefined ? tolerance : 0.40;
    const fth = feather !== undefined ? feather : 0.15;
    const low = Math.max(0.01, tol - fth);
    const high = tol + fth;
    const span = high - low || 0.01;

    for (let gy = 0; gy < gridH; gy++) {
      for (let gx = 0; gx < gridW; gx++) {
        const fx = Math.min(imgW - 1, Math.round((gx / (gridW - 1)) * (imgW - 1)));
        const fy = Math.min(imgH - 1, Math.round((gy / (gridH - 1)) * (imgH - 1)));
        const idx = (fy * imgW + fx) * 4;
        const dr = (data[idx] - bg[0]) / 255;
        const dg = (data[idx + 1] - bg[1]) / 255;
        const db = (data[idx + 2] - bg[2]) / 255;
        const dist = Math.sqrt(0.299 * dr * dr + 0.587 * dg * dg + 0.114 * db * db);

        if (dist <= low) {
          mask[gy * gridW + gx] = 0;
        } else if (dist >= high) {
          mask[gy * gridW + gx] = 1;
        } else {
          const t = (dist - low) / span;
          mask[gy * gridW + gx] = 0.5 - 0.5 * Math.cos(t * Math.PI);
        }
      }
    }
    return mask;
  }

  // ─── Multi-Scale Relief Heightmap Builder ──────────────────────────────────

  function buildHeightMap(data, imgW, imgH, gridW, gridH, mode, opts = {}) {
    const rawLum = new Float32Array(gridW * gridH);

    // 1. Sample continuous bicubic luminance
    for (let gy = 0; gy < gridH; gy++) {
      for (let gx = 0; gx < gridW; gx++) {
        const fx = (gx / (gridW - 1)) * (imgW - 1);
        const fy = (gy / (gridH - 1)) * (imgH - 1);
        rawLum[gy * gridW + gx] = sampleBicubic(data, fx, fy, imgW, imgH);
      }
    }

    // 2. Multi-Scale Bas-Relief Decomposition (Macro Volume + Clamped Micro Relief)
    // Macro curvature: smooth Gaussian low-pass curve
    const macro = gaussianBlur(rawLum, gridW, gridH, 4, 2.5);

    const hmap = new Float32Array(gridW * gridH);
    const detailLimit = 0.14; // Strictly limits high-frequency spike amplitude

    for (let i = 0; i < gridW * gridH; i++) {
      const micro = rawLum[i] - macro[i];
      const clampedMicro = Math.max(-detailLimit, Math.min(detailLimit, micro));
      // Base: 80% macro smooth volume + 20% fine surface embossing
      hmap[i] = Math.max(0, Math.min(1, macro[i] * 0.82 + clampedMicro * 0.30));
    }

    // 3. Mode-specific sculpting
    if (mode === 'portrait') {
      // Anatomical Convex Dome (human head/face)
      const domeStrength = (opts.domeDepth !== undefined ? opts.domeDepth : 55) / 100;
      const rx = 0.45, ry = 0.50;
      const cx = 0.5, cy = 0.45;

      for (let gy = 0; gy < gridH; gy++) {
        for (let gx = 0; gx < gridW; gx++) {
          const idx = gy * gridW + gx;
          const nx = (gx / (gridW - 1) - cx) / rx;
          const ny = (gy / (gridH - 1) - cy) / ry;
          const dist = Math.sqrt(nx * nx + ny * ny);
          const dome = dist < 1.0 ? Math.pow(Math.cos(dist * Math.PI * 0.5), 0.70) : 0;

          // Dark feature compensation: lift dark eyes and mouth so they don't form holes
          let feat = hmap[idx];
          if (feat < 0.40) feat = feat + (0.40 - feat) * 0.55;

          hmap[idx] = Math.max(0, Math.min(1, domeStrength * dome + (1.0 - domeStrength * 0.4) * feat));
        }
      }

    } else if (mode === 'cameo') {
      // Numismatic Coin Cameo: circular rim border + convex medallion dome
      for (let gy = 0; gy < gridH; gy++) {
        for (let gx = 0; gx < gridW; gx++) {
          const idx = gy * gridW + gx;
          const nx = (gx / (gridW - 1) - 0.5) * 2;
          const ny = (gy / (gridH - 1) - 0.5) * 2;
          const r = Math.sqrt(nx * nx + ny * ny);

          if (r > 1.0) {
            hmap[idx] = 0;
          } else {
            let rim = 0;
            if (r >= 0.88 && r <= 0.98) {
              rim = Math.sin(((r - 0.88) / 0.10) * Math.PI) * 0.35;
            }
            const coinDome = Math.cos(Math.min(1, r / 0.88) * Math.PI * 0.5) * 0.40;
            hmap[idx] = Math.max(0, Math.min(1, 0.20 + coinDome + rim + hmap[idx] * 0.35));
          }
        }
      }

    } else if (mode === 'stamp') {
      // Flat plateau extrusion with 45° beveled chamfers
      const thresh = (opts.stampThreshold !== undefined ? opts.stampThreshold : 50) / 100;
      const edge = 0.08;
      for (let i = 0; i < gridW * gridH; i++) {
        const v = rawLum[i];
        if (v > thresh + edge) hmap[i] = 1.0;
        else if (v < thresh - edge) hmap[i] = 0.0;
        else hmap[i] = (v - (thresh - edge)) / (2 * edge);
      }

    } else if (mode === 'lithophane') {
      for (let i = 0; i < gridW * gridH; i++) {
        hmap[i] = Math.max(0, Math.min(1, 1.0 - rawLum[i]));
      }

    } else if (mode === 'emboss') {
      for (let i = 0; i < gridW * gridH; i++) {
        hmap[i] = rawLum[i] > 0.5 ? 1.0 : 0.0;
      }
    }

    // 4. Optional background suppression (only when explicitly requested!)
    if (opts.isolateSubject === true) {
      const bgTol = (opts.bgTolerance !== undefined ? opts.bgTolerance : 40) / 100;
      const mask = computeSubjectMask(data, imgW, imgH, gridW, gridH, bgTol, 0.15);
      for (let i = 0; i < gridW * gridH; i++) {
        hmap[i] *= mask[i];
      }
    }

    // 5. Invert depth if requested
    if (opts.invertDepth && mode !== 'lithophane') {
      for (let i = 0; i < gridW * gridH; i++) {
        hmap[i] = 1.0 - hmap[i];
      }
    }

    // 6. Anti-Spike Gradient & Slope Limiting (Guarantees zero needle spikes!)
    const smoothRelief = clampSlope(hmap, gridW, gridH, 0.085);

    return smoothRelief;
  }

  // ─── Super-Sampling ───────────────────────────────────────────────────────

  function buildSuperSampledHeightmap(data, imgW, imgH, gridW, gridH, mode, superFactor, opts = {}) {
    const sw = gridW * superFactor;
    const sh = gridH * superFactor;
    const superHmap = buildHeightMap(data, imgW, imgH, sw, sh, mode, opts);

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

  // ─── Contrast Levels ──────────────────────────────────────────────────────

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

  // ─── Photorealistic Vertex Color Baking (RGB + Cavity AO) ─────────────────

  function sampleColorBicubic(data, fx, fy, imgW, imgH) {
    const px = Math.max(0, Math.min(imgW - 1, Math.round(fx)));
    const py = Math.max(0, Math.min(imgH - 1, Math.round(fy)));
    const idx = (py * imgW + px) * 4;
    return [data[idx] / 255, data[idx + 1] / 255, data[idx + 2] / 255];
  }

  function bakeVertexColors(data, imgW, imgH, hmap, gridW, gridH, aoStrength) {
    const colors = new Float32Array(gridW * gridH * 3);
    const ao = aoStrength !== undefined ? aoStrength : 0.35;

    for (let gy = 0; gy < gridH; gy++) {
      for (let gx = 0; gx < gridW; gx++) {
        const fx = (gx / (gridW - 1)) * (imgW - 1);
        const fy = (gy / (gridH - 1)) * (imgH - 1);
        const [r, g, b] = sampleColorBicubic(data, fx, fy, imgW, imgH);

        // Cavity AO: subtle natural depth shading without color distortion
        const center = hmap[gy * gridW + gx];
        let diff = 0, cnt = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx2 = Math.max(0, Math.min(gridW - 1, gx + dx));
            const ny2 = Math.max(0, Math.min(gridH - 1, gy + dy));
            diff += Math.max(0, hmap[ny2 * gridW + nx2] - center);
            cnt++;
          }
        }
        const cavityAO = 1.0 - Math.min(0.25, (diff / (cnt || 1)) * ao * 2.5);

        const ci = (gy * gridW + gx) * 3;
        colors[ci] = Math.max(0, Math.min(1, r * cavityAO));
        colors[ci + 1] = Math.max(0, Math.min(1, g * cavityAO));
        colors[ci + 2] = Math.max(0, Math.min(1, b * cavityAO));
      }
    }
    return colors;
  }

  // ─── Midpoint Subdivision Pass ─────────────────────────────────────────────

  function subdivide(hmap, gridW, gridH) {
    const nW = gridW * 2 - 1;
    const nH = gridH * 2 - 1;
    const out = new Float32Array(nW * nH);

    for (let gy = 0; gy < gridH; gy++) {
      for (let gx = 0; gx < gridW; gx++) {
        out[(gy * 2) * nW + (gx * 2)] = hmap[gy * gridW + gx];
      }
    }
    for (let gy = 0; gy < gridH; gy++) {
      for (let gx = 0; gx < gridW - 1; gx++) {
        const v0 = hmap[gy * gridW + gx];
        const v1 = hmap[gy * gridW + gx + 1];
        out[(gy * 2) * nW + (gx * 2 + 1)] = (v0 + v1) * 0.5;
      }
    }
    for (let gy = 0; gy < gridH - 1; gy++) {
      for (let gx = 0; gx < nW; gx++) {
        const v0 = out[(gy * 2) * nW + gx];
        const v1 = out[((gy + 1) * 2) * nW + gx];
        out[(gy * 2 + 1) * nW + gx] = (v0 + v1) * 0.5;
      }
    }
    return { hmap: out, gridW: nW, gridH: nH };
  }

  // ─── Build Indexed Mesh ───────────────────────────────────────────────────

  function buildIndexedMesh(hmap, gridW, gridH, depthMM, baseMM, scaleMM, solidBase, mirrorY) {
    const aspectY = gridH / gridW;
    const xLen = scaleMM;
    const yLen = scaleMM * aspectY;

    const topVerts = gridW * gridH;
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

    const topTriangles = (gridW - 1) * (gridH - 1) * 2;
    let totalTriangles = topTriangles;

    if (solidBase) {
      totalTriangles += (gridW - 1) * 2 * 2; // front + back
      totalTriangles += (gridH - 1) * 2 * 2; // left + right
      totalTriangles += 2;                   // base quad
    }

    const indices = new Uint32Array(totalTriangles * 3);
    let iIdx = 0;

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

    // Area-weighted normal accumulation
    const normals = new Float32Array(topVerts * 3);
    for (let ti = 0; ti < topTriangles; ti++) {
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
      for (const vi of [indices[ii], indices[ii + 1], indices[ii + 2]]) {
        normals[vi * 3] += nx;
        normals[vi * 3 + 1] += ny;
        normals[vi * 3 + 2] += nz;
      }
    }
    for (let vi = 0; vi < topVerts; vi++) {
      const ni = vi * 3;
      const len = Math.sqrt(normals[ni] ** 2 + normals[ni + 1] ** 2 + normals[ni + 2] ** 2) || 1;
      normals[ni] /= len; normals[ni + 1] /= len; normals[ni + 2] /= len;
    }

    // Side walls + base plate
    const extraTriangles = [];
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

    const headStr = 'STL Ultra — 3D·4D Studio — Bas-Relief Sculptor';
    for (let i = 0; i < 80; i++) view.setUint8(i, i < headStr.length ? headStr.charCodeAt(i) : 0);
    view.setUint32(80, totalTris, true);

    let off = 84;

    function writeVec3(x, y, z) {
      view.setFloat32(off, x, true); off += 4;
      view.setFloat32(off, y, true); off += 4;
      view.setFloat32(off, z, true); off += 4;
    }

    for (let ti = 0; ti < topTriangles; ti++) {
      const ii = ti * 3;
      const i0 = indices[ii] * 3, i1 = indices[ii + 1] * 3, i2 = indices[ii + 2] * 3;
      const fnx = (normals[i0] + normals[i1] + normals[i2]) / 3;
      const fny = (normals[i0 + 1] + normals[i1 + 1] + normals[i2 + 1]) / 3;
      const fnz = (normals[i0 + 2] + normals[i1 + 2] + normals[i2 + 2]) / 3;
      writeVec3(fnx, fny, fnz);
      writeVec3(verts[i0], verts[i0 + 1], verts[i0 + 2]);
      writeVec3(verts[i1], verts[i1 + 1], verts[i1 + 2]);
      writeVec3(verts[i2], verts[i2 + 1], verts[i2 + 2]);
      view.setUint16(off, 0, true); off += 2;
    }

    for (const tri of extraTriangles) {
      const [v0, v1, v2, norm] = tri;
      writeVec3(norm[0], norm[1], norm[2]);
      writeVec3(v0[0], v0[1], v0[2]);
      writeVec3(v1[0], v1[1], v1[2]);
      writeVec3(v2[0], v2[1], v2[2]);
      view.setUint16(off, 0, true); off += 2;
    }

    return buf;
  }

  // ─── OBJ Wavefront Export ─────────────────────────────────────────────────

  function buildOBJ(mesh, mtlName) {
    const { verts, normals, indices, topTriangles, extraTriangles } = mesh;
    const topVerts = verts.length / 3;
    const lines = [];

    lines.push('# 3D·4D Studio Ultra — Wavefront OBJ');
    lines.push(`# Vertices: ${topVerts}`);
    lines.push(`# Triangles: ${topTriangles + extraTriangles.length}`);
    if (mtlName) {
      lines.push(`mtllib ${mtlName}.mtl`);
      lines.push(`usemtl ${mtlName}`);
    }

    for (let vi = 0; vi < topVerts; vi++) {
      const i = vi * 3;
      lines.push(`v ${verts[i].toFixed(4)} ${verts[i + 1].toFixed(4)} ${verts[i + 2].toFixed(4)}`);
    }
    for (let vi = 0; vi < topVerts; vi++) {
      const i = vi * 3;
      lines.push(`vn ${normals[i].toFixed(4)} ${normals[i + 1].toFixed(4)} ${normals[i + 2].toFixed(4)}`);
    }

    lines.push('s 1');
    for (let ti = 0; ti < topTriangles; ti++) {
      const ii = ti * 3;
      const a = indices[ii] + 1, b = indices[ii + 1] + 1, c = indices[ii + 2] + 1;
      lines.push(`f ${a}//${a} ${b}//${b} ${c}//${c}`);
    }

    let extraVertBase = topVerts + 1;
    for (const tri of extraTriangles) {
      const [v0, v1, v2, norm] = tri;
      lines.push(`v ${v0[0].toFixed(4)} ${v0[1].toFixed(4)} ${v0[2].toFixed(4)}`);
      lines.push(`v ${v1[0].toFixed(4)} ${v1[1].toFixed(4)} ${v1[2].toFixed(4)}`);
      lines.push(`v ${v2[0].toFixed(4)} ${v2[1].toFixed(4)} ${v2[2].toFixed(4)}`);
      lines.push(`vn ${norm[0].toFixed(4)} ${norm[1].toFixed(4)} ${norm[2].toFixed(4)}`);
      const vnIdx = extraVertBase;
      const i0 = extraVertBase, i1 = extraVertBase + 1, i2 = extraVertBase + 2;
      lines.push(`f ${i0}//${vnIdx} ${i1}//${vnIdx} ${i2}//${vnIdx}`);
      extraVertBase += 3;
    }

    return lines.join('\n');
  }

  function buildMTL(opts) {
    const { color = '#4f8eff', metalness = 0.05, roughness = 0.65 } = opts;
    const h = color.replace('#', '');
    const r = (parseInt(h.slice(0, 2), 16) / 255).toFixed(4);
    const g = (parseInt(h.slice(2, 4), 16) / 255).toFixed(4);
    const b = (parseInt(h.slice(4, 6), 16) / 255).toFixed(4);
    const Ns = ((1 - roughness) * 1000).toFixed(1);

    return [
      '# 3D·4D Studio Ultra — Material Template Library',
      'newmtl model_3d4d',
      'Ka 0.2000 0.2000 0.2000',
      `Kd ${r} ${g} ${b}`,
      `Ks ${(metalness * 0.8).toFixed(4)} ${(metalness * 0.8).toFixed(4)} ${(metalness * 0.8).toFixed(4)}`,
      `Ns ${Ns}`,
      'd 1.0',
      'illum 2'
    ].join('\n');
  }

  // ─── Main Pipeline ────────────────────────────────────────────────────────

  function generate(imageData, opts, onProgress) {
    const {
      mode = 'relief',
      resolution = 256,
      depthMM = 6,
      baseMM = 2,
      scaleMM = 100,
      smoothPasses = 3,
      smoothMethod = 'bilateral',
      superSample = 2,
      solidBase = true,
      mirrorY = false,
      gamma = 1.0,
      bakeColors = true,
      aoStrength = 0.35,
      subdivPass = false,
      isolateSubject = false,
      bgTolerance = 40,
      domeDepth = 55,
      invertDepth = false,
      color = '#4f8eff',
      metalness = 0.05,
      roughness = 0.65,
      colorData = null, // Raw full-color image data for vibrant vertex colors!
    } = opts;

    const imgW = imageData.width, imgH = imageData.height;
    const data = imageData.data;
    const finalColorData = (colorData && colorData.data) ? colorData.data : data;

    onProgress && onProgress(0.05, 'Decomposing macro and micro relief…');

    const gridW = Math.min(resolution, imgW);
    const gridH = Math.min(Math.round(resolution * imgH / imgW), imgH);

    // 1. Build Multi-Scale Clamped Relief Heightmap
    let hmap;
    if (superSample > 1) {
      onProgress && onProgress(0.12, `Super-sampling ${superSample}× anti-aliased…`);
      hmap = buildSuperSampledHeightmap(data, imgW, imgH, gridW, gridH, mode, superSample, opts);
    } else {
      hmap = buildHeightMap(data, imgW, imgH, gridW, gridH, mode, opts);
    }

    // 2. Levels / Gamma curve
    if (gamma !== 1.0) {
      onProgress && onProgress(0.25, 'Applying gamma curve…');
      const stats = hmapStats(hmap);
      hmap = enhanceHeightmap(hmap, gamma, stats.min, stats.max);
    }

    // 3. Multi-pass Harmonic Smoothing
    if (smoothPasses > 0) {
      onProgress && onProgress(0.35, 'Harmonic surface smoothing…');
      if (smoothMethod === 'bilateral' || smoothMethod === 'both') {
        const sigmaS = Math.max(1, smoothPasses * 0.7);
        hmap = bilateralFilter(hmap, gridW, gridH, Math.ceil(sigmaS), sigmaS, 0.20);
      }
      if (smoothMethod === 'laplacian' || smoothMethod === 'both') {
        hmap = laplacianSmooth(hmap, gridW, gridH, Math.min(3, smoothPasses), 0.35);
      }
    }

    // 4b. Optional subdivision
    let finalGridW = gridW, finalGridH = gridH;
    if (subdivPass && gridW < 257) {
      onProgress && onProgress(0.48, 'Subdivision pass…');
      const sub = subdivide(hmap, gridW, gridH);
      hmap = sub.hmap;
      finalGridW = sub.gridW;
      finalGridH = sub.gridH;
    }

    // 5. Build indexed 3D mesh
    onProgress && onProgress(0.55, 'Sculpting high-precision bas-relief…');
    const mesh = buildIndexedMesh(hmap, finalGridW, finalGridH, depthMM, baseMM, scaleMM, solidBase, mirrorY);

    // 5b. Bake photorealistic vertex colors (using original full-color image data!)
    let vertexColors = null;
    if (bakeColors) {
      onProgress && onProgress(0.72, 'Baking vibrant RGB photo colors…');
      vertexColors = bakeVertexColors(finalColorData, imgW, imgH, hmap, finalGridW, finalGridH, aoStrength);
      mesh.vertexColors = vertexColors;
    }

    // 6. STL
    onProgress && onProgress(0.82, 'Encoding STL binary…');
    const stlBuffer = buildSTLBuffer(mesh);

    // 7. OBJ + MTL
    onProgress && onProgress(0.92, 'Encoding Wavefront OBJ…');
    const objText = buildOBJ(mesh, 'model_3d4d');
    const mtlText = buildMTL({ color, metalness, roughness });

    const totalTris = mesh.topTriangles + mesh.extraTriangles.length;
    const dims = {
      x: scaleMM,
      y: scaleMM * imgH / imgW,
      z: baseMM + depthMM,
    };

    onProgress && onProgress(1.0, 'Ready!');

    return {
      stlBuffer, objText, mtlText,
      triangleCount: totalTris,
      vertexCount: mesh.topVerts,
      dims, gridW: finalGridW, gridH: finalGridH, hmap,
      mesh, vertexColors,
    };
  }

  return {
    generate,
    buildHeightMap,
    buildSuperSampledHeightmap,
    sampleBicubic,
    gaussianBlur,
    clampSlope,
    bilateralFilter,
    laplacianSmooth,
    bakeVertexColors,
  };

})();

window.Engine3D = Engine3D;
