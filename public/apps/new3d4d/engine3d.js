/**
 * ENGINE 3D v2 — ULTRA MASTER SCULPTOR (Photo -> Sculptural Relief / Medallion / Lithophane)
 * Works seamlessly both on Main Thread and inside `js/sculpt-worker.js` Web Worker.
 * Features:
 *  • Image Preprocessing (Brightness, Contrast, Saturation, Blur, Unsharp Sharpen, Threshold, Edge)
 *  • Alpha-Aware Transparency Support (PNG logos/cutouts never turn black or white slabs)
 *  • Edge-Connected BFS Flood-Fill Subject Segmentation (never punches holes inside eyes/clothes)
 *  • 2-Pass Chamfer Distance-Field Anatomical Volume Dome (real sculpted portraits, not flat shadows)
 *  • Multi-Scale Relief Decomposition + Scharr Micro-Chisel Edge Crispness
 *  • 4 Smoothers: Bilateral (edge-preserving), Laplacian (organic), Hybrid Both, Box (fast O(N))
 *  • 6 True CAD Shapes: Rectangle, Squircle, Circle Coin, Oval Cameo, Heart, Curved Lithophane Lamp Arc
 *  • 100% Watertight Manifold Closing Walls & Flat Base (zero gaps, zero square corners on coins)
 *  • True Mirror Y-axis across heightmap, UVs, and baked vertex colors
 */

const Engine3D = (() => {

  function clamp255(v) {
    return v < 0 ? 0 : (v > 255 ? 255 : v);
  }

  // ─── 1. Shared Image Preprocessing (Matches 2D Preview 1-to-1) ──────────

  function boxBlurRGBA(src, w, h, radius) {
    const r = Math.max(1, Math.min(20, Math.round(radius)));
    const tmp = new Float32Array(src.length);
    const out = new Uint8ClampedArray(src.length);
    const win = r * 2 + 1;

    // Separable horizontal pass
    for (let y = 0; y < h; y++) {
      const rowOff = y * w * 4;
      let rs = 0, gs = 0, bs = 0, as = 0;
      for (let k = -r; k <= r; k++) {
        const nx = Math.max(0, Math.min(w - 1, k));
        const idx = rowOff + nx * 4;
        rs += src[idx]; gs += src[idx + 1]; bs += src[idx + 2]; as += src[idx + 3];
      }
      for (let x = 0; x < w; x++) {
        const oi = rowOff + x * 4;
        tmp[oi] = rs / win; tmp[oi + 1] = gs / win; tmp[oi + 2] = bs / win; tmp[oi + 3] = as / win;
        const addX = Math.min(w - 1, x + r + 1);
        const remX = Math.max(0, x - r);
        const ai = rowOff + addX * 4;
        const ri = rowOff + remX * 4;
        rs += src[ai] - src[ri];
        gs += src[ai + 1] - src[ri + 1];
        bs += src[ai + 2] - src[ri + 2];
        as += src[ai + 3] - src[ri + 3];
      }
    }

    // Separable vertical pass
    for (let x = 0; x < w; x++) {
      let rs = 0, gs = 0, bs = 0, as = 0;
      for (let k = -r; k <= r; k++) {
        const ny = Math.max(0, Math.min(h - 1, k));
        const idx = (ny * w + x) * 4;
        rs += tmp[idx]; gs += tmp[idx + 1]; bs += tmp[idx + 2]; as += tmp[idx + 3];
      }
      for (let y = 0; y < h; y++) {
        const oi = (y * w + x) * 4;
        out[oi] = rs / win; out[oi + 1] = gs / win; out[oi + 2] = bs / win; out[oi + 3] = Math.round(as / win);
        const addY = Math.min(h - 1, y + r + 1);
        const remY = Math.max(0, y - r);
        const ai = (addY * w + x) * 4;
        const ri = (remY * w + x) * 4;
        rs += tmp[ai] - tmp[ri];
        gs += tmp[ai + 1] - tmp[ri + 1];
        bs += tmp[ai + 2] - tmp[ri + 2];
        as += tmp[ai + 3] - tmp[ri + 3];
      }
    }
    return out;
  }

  function applySharpenRGBA(data, w, h, amount) {
    if (amount <= 0) return data;
    const blurred = boxBlurRGBA(data, w, h, 2);
    const out = new Uint8ClampedArray(data.length);
    const k = amount * 0.28;
    for (let i = 0; i < data.length; i += 4) {
      out[i] = clamp255(data[i] + k * (data[i] - blurred[i]));
      out[i + 1] = clamp255(data[i + 1] + k * (data[i + 1] - blurred[i + 1]));
      out[i + 2] = clamp255(data[i + 2] + k * (data[i + 2] - blurred[i + 2]));
      out[i + 3] = data[i + 3];
    }
    return out;
  }

  function applyEdgeEnhanceRGBA(data, w, h) {
    const out = new Uint8ClampedArray(data.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const oi = (y * w + x) * 4;
        if (x === 0 || x === w - 1 || y === 0 || y === h - 1) {
          out[oi] = data[oi]; out[oi + 1] = data[oi + 1]; out[oi + 2] = data[oi + 2]; out[oi + 3] = data[oi + 3];
          continue;
        }
        const up = ((y - 1) * w + x) * 4;
        const dn = ((y + 1) * w + x) * 4;
        const lf = (y * w + x - 1) * 4;
        const rt = (y * w + x + 1) * 4;
        for (let c = 0; c < 3; c++) {
          out[oi + c] = clamp255(5 * data[oi + c] - data[up + c] - data[dn + c] - data[lf + c] - data[rt + c]);
        }
        out[oi + 3] = data[oi + 3];
      }
    }
    return out;
  }

  function preprocessRGBA(rawRGBA, w, h, pre = {}) {
    const {
      brightness = 0,
      contrast = 0,
      saturation = 0,
      blur = 0,
      sharpen = 0,
      threshold = 128,
      useThreshold = false,
      grayscale = false,
      invert = false,
      edgeEnhance = false,
    } = pre;

    let buf = new Uint8ClampedArray(rawRGBA);

    if (blur > 0) buf = boxBlurRGBA(buf, w, h, blur);
    if (sharpen > 0) buf = applySharpenRGBA(buf, w, h, sharpen);

    const contrastFactor = contrast !== 0 ? (259 * (contrast + 255)) / (255 * (259 - contrast)) : 1;
    const satMult = (saturation + 100) / 100;

    for (let i = 0; i < buf.length; i += 4) {
      let r = buf[i], g = buf[i + 1], b = buf[i + 2];

      if (saturation !== 0) {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        r = lum + (r - lum) * satMult;
        g = lum + (g - lum) * satMult;
        b = lum + (b - lum) * satMult;
      }
      if (grayscale) {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        r = g = b = lum;
      }
      if (brightness !== 0) { r += brightness; g += brightness; b += brightness; }
      if (contrast !== 0) {
        r = contrastFactor * (r - 128) + 128;
        g = contrastFactor * (g - 128) + 128;
        b = contrastFactor * (b - 128) + 128;
      }
      if (useThreshold) {
        const lum = 0.299 * clamp255(r) + 0.587 * clamp255(g) + 0.114 * clamp255(b);
        const bw = lum >= threshold ? 255 : 0;
        r = g = b = bw;
      }
      if (invert) { r = 255 - r; g = 255 - g; b = 255 - b; }

      buf[i] = clamp255(r);
      buf[i + 1] = clamp255(g);
      buf[i + 2] = clamp255(b);
    }

    if (edgeEnhance) buf = applyEdgeEnhanceRGBA(buf, w, h);
    return buf;
  }

  // ─── 2. Alpha-Aware Bicubic Luminance & Color Sampling ──────────────────

  function cubicHermite(A, B, C, D, t) {
    const a = -A / 2 + (3 * B) / 2 - (3 * C) / 2 + D / 2;
    const b = A - (5 * B) / 2 + 2 * C - D / 2;
    const c = -A / 2 + C / 2;
    return a * t * t * t + b * t * t + c * t + B;
  }

  function samplePixelAlphaLum(data, x, y, width, height) {
    const cx = Math.max(0, Math.min(width - 1, x));
    const cy = Math.max(0, Math.min(height - 1, y));
    const idx = (cy * width + cx) * 4;
    const alpha = data[idx + 3] / 255;
    if (alpha <= 0.01) return 0;
    const lum = (0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]) / 255;
    return lum * alpha;
  }

  function samplePixelAlpha(data, x, y, width, height) {
    const cx = Math.max(0, Math.min(width - 1, x));
    const cy = Math.max(0, Math.min(height - 1, y));
    return data[(cy * width + cx) * 4 + 3] / 255;
  }

  function sampleBicubic(data, fx, fy, width, height) {
    const x = Math.floor(fx), y = Math.floor(fy);
    const tx = fx - x, ty = fy - y;
    const rows = [0, 0, 0, 0];
    for (let dy = -1; dy <= 2; dy++) {
      const c0 = samplePixelAlphaLum(data, x - 1, y + dy, width, height);
      const c1 = samplePixelAlphaLum(data, x, y + dy, width, height);
      const c2 = samplePixelAlphaLum(data, x + 1, y + dy, width, height);
      const c3 = samplePixelAlphaLum(data, x + 2, y + dy, width, height);
      rows[dy + 1] = cubicHermite(c0, c1, c2, c3, tx);
    }
    return Math.max(0, Math.min(1, cubicHermite(rows[0], rows[1], rows[2], rows[3], ty)));
  }

  function sampleColorBilinear(data, fx, fy, imgW, imgH, fallbackHexRGB) {
    const x0 = Math.max(0, Math.min(imgW - 1, Math.floor(fx)));
    const y0 = Math.max(0, Math.min(imgH - 1, Math.floor(fy)));
    const x1 = Math.min(imgW - 1, x0 + 1);
    const y1 = Math.min(imgH - 1, y0 + 1);
    const tx = fx - x0, ty = fy - y0;

    const i00 = (y0 * imgW + x0) * 4;
    const i10 = (y0 * imgW + x1) * 4;
    const i01 = (y1 * imgW + x0) * 4;
    const i11 = (y1 * imgW + x1) * 4;

    const a0 = data[i00 + 3] * (1 - tx) + data[i10 + 3] * tx;
    const a1 = data[i01 + 3] * (1 - tx) + data[i11 + 3] * tx;
    const alpha = (a0 * (1 - ty) + a1 * ty) / 255;

    const fb = fallbackHexRGB || [0.15, 0.20, 0.30];
    const rgb = [0, 0, 0];
    for (let c = 0; c < 3; c++) {
      const top = data[i00 + c] * (1 - tx) + data[i10 + c] * tx;
      const bot = data[i01 + c] * (1 - tx) + data[i11 + c] * tx;
      const sampled = (top * (1 - ty) + bot * ty) / 255;
      rgb[c] = sampled * alpha + fb[c] * (1 - alpha);
    }
    return rgb;
  }

  // ─── 3. Filters: Gaussian, Box, Bilateral, Laplacian, Jacobi Slope ──────

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
    const r = Math.max(1, Math.round(radius));
    const s = Math.max(0.5, sigma);
    const kernel = createGaussianKernel(r, s);
    const temp = new Float32Array(w * h);
    const out = new Float32Array(w * h);

    for (let y = 0; y < h; y++) {
      const yOff = y * w;
      for (let x = 0; x < w; x++) {
        let sum = 0;
        for (let k = -r; k <= r; k++) {
          const nx = Math.max(0, Math.min(w - 1, x + k));
          sum += data[yOff + nx] * kernel[k + r];
        }
        temp[yOff + x] = sum;
      }
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0;
        for (let k = -r; k <= r; k++) {
          const ny = Math.max(0, Math.min(h - 1, y + k));
          sum += temp[ny * w + x] * kernel[k + r];
        }
        out[y * w + x] = sum;
      }
    }
    return out;
  }

  function boxBlurScalar(data, w, h, radius) {
    const r = Math.max(1, Math.min(10, Math.round(radius)));
    const tmp = new Float32Array(w * h);
    const out = new Float32Array(w * h);
    const win = r * 2 + 1;

    for (let y = 0; y < h; y++) {
      const off = y * w;
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += data[off + Math.max(0, Math.min(w - 1, k))];
      for (let x = 0; x < w; x++) {
        tmp[off + x] = sum / win;
        sum += data[off + Math.min(w - 1, x + r + 1)] - data[off + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += tmp[Math.max(0, Math.min(h - 1, k)) * w + x];
      for (let y = 0; y < h; y++) {
        out[y * w + x] = sum / win;
        sum += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
      }
    }
    return out;
  }

  function bilateralFilter(hmap, width, height, radius, sigmaS, sigmaR) {
    const out = new Float32Array(hmap.length);
    const r = Math.min(5, Math.ceil(radius));
    const s2 = 2 * sigmaS * sigmaS;
    const r2 = 2 * sigmaR * sigmaR;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const center = hmap[y * width + x];
        let sum = 0, wsum = 0;
        for (let dy = -r; dy <= r; dy++) {
          const ny = Math.max(0, Math.min(height - 1, y + dy));
          const rowOff = ny * width;
          for (let dx = -r; dx <= r; dx++) {
            const nx = Math.max(0, Math.min(width - 1, x + dx));
            const val = hmap[rowOff + nx];
            const spatialW = Math.exp(-(dx * dx + dy * dy) / s2);
            const rangeW = Math.exp(-((val - center) * (val - center)) / r2);
            const weight = spatialW * rangeW;
            sum += val * weight;
            wsum += weight;
          }
        }
        out[y * width + x] = sum / (wsum || 1);
      }
    }
    return out;
  }

  function laplacianSmooth(hmap, width, height, passes, lambda = 0.42) {
    let cur = new Float32Array(hmap);
    for (let p = 0; p < passes; p++) {
      const next = new Float32Array(cur.length);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const c = cur[y * width + x];
          let sum = 0, cnt = 0;
          for (let dy = -1; dy <= 1; dy++) {
            const ny = Math.max(0, Math.min(height - 1, y + dy));
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = Math.max(0, Math.min(width - 1, x + dx));
              const w = (dx !== 0 && dy !== 0) ? 0.707 : 1.0;
              sum += cur[ny * width + nx] * w;
              cnt += w;
            }
          }
          next[y * width + x] = c + lambda * (sum / (cnt || 1) - c);
        }
      }
      cur = next;
    }
    return cur;
  }

  function clampSlope(hmap, w, h, maxSlope = 0.036, passes = 4) {
    let cur = new Float32Array(hmap);
    for (let pass = 0; pass < passes; pass++) {
      const next = new Float32Array(cur.length);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = y * w + x;
          const c = cur[idx];
          let avg = 0, cnt = 0;
          for (let dy = -1; dy <= 1; dy++) {
            const ny = Math.max(0, Math.min(h - 1, y + dy));
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = Math.max(0, Math.min(w - 1, x + dx));
              avg += cur[ny * w + nx];
              cnt++;
            }
          }
          avg /= cnt;
          const diff = c - avg;
          next[idx] = Math.abs(diff) > maxSlope ? avg + Math.sign(diff) * maxSlope : c;
        }
      }
      cur = next;
    }
    return cur;
  }

  // ─── 4. Smart Boundary Flood-Fill Subject Extractor & Distance Field ─────

  function detectBackgroundStats(data, imgW, imgH) {
    let rSum = 0, gSum = 0, bSum = 0, aSum = 0, count = 0;
    const border = Math.max(1, Math.min(8, Math.floor(Math.min(imgW, imgH) * 0.03)));
    for (let y = 0; y < imgH * 0.7; y++) {
      for (let x = 0; x < imgW; x++) {
        if (x < border || x >= imgW - border || y < border) {
          const idx = (y * imgW + x) * 4;
          rSum += data[idx]; gSum += data[idx + 1]; bSum += data[idx + 2]; aSum += data[idx + 3];
          count++;
        }
      }
    }
    const n = count || 1;
    const rAvg = rSum / n, gAvg = gSum / n, bAvg = bSum / n, aAvg = (aSum / n) / 255;

    let varSum = 0;
    for (let y = 0; y < imgH * 0.7; y++) {
      for (let x = 0; x < imgW; x++) {
        if (x < border || x >= imgW - border || y < border) {
          const idx = (y * imgW + x) * 4;
          const dr = (data[idx] - rAvg) / 255;
          const dg = (data[idx + 1] - gAvg) / 255;
          const db = (data[idx + 2] - bAvg) / 255;
          varSum += dr * dr + dg * dg + db * db;
        }
      }
    }
    const stdDev = Math.sqrt(varSum / n);
    const lum = (0.299 * rAvg + 0.587 * gAvg + 0.114 * bAvg) / 255;
    return { rgb: [rAvg, gAvg, bAvg], stdDev, lum, alphaAvg: aAvg };
  }

  /**
   * Edge-Connected BFS Flood-Fill Mask:
   * Starts ONLY from the outer boundary edges so white interior regions (eyes, teeth,
   * shirt highlights, reflections) inside a silhouette remain 100% intact!
   */
  function computeSubjectMask(data, imgW, imgH, gridW, gridH, tolerance = 0.28, mirrorY = false) {
    const n = gridW * gridH;
    const bgStats = detectBackgroundStats(data, imgW, imgH);
    const gridR = new Float32Array(n);
    const gridG = new Float32Array(n);
    const gridB = new Float32Array(n);
    const gridA = new Float32Array(n);

    for (let gy = 0; gy < gridH; gy++) {
      const sy = mirrorY ? (gridH - 1 - gy) : gy;
      const fy = Math.min(imgH - 1, Math.round((sy / (gridH - 1)) * (imgH - 1)));
      for (let gx = 0; gx < gridW; gx++) {
        const fx = Math.min(imgW - 1, Math.round((gx / (gridW - 1)) * (imgW - 1)));
        const i = (fy * imgW + fx) * 4;
        const gi = gy * gridW + gx;
        gridR[gi] = data[i];
        gridG[gi] = data[i + 1];
        gridB[gi] = data[i + 2];
        gridA[gi] = data[i + 3] / 255;
      }
    }

    // If PNG already carries clear transparency around subject, use crisp alpha channel directly
    if (bgStats.alphaAvg < 0.25) {
      const alphaMask = new Float32Array(gridA);
      return gaussianBlur(alphaMask, gridW, gridH, 2, 1.1);
    }

    const bg = bgStats.rgb;
    const maxDist = Math.max(0.06, tolerance);
    const isBg = new Uint8Array(n);
    const visited = new Uint8Array(n);
    const queue = new Int32Array(n);
    let qHead = 0, qTail = 0;

    function pixelDist(idx) {
      if (gridA[idx] < 0.15) return 0;
      const dr = (gridR[idx] - bg[0]) / 255;
      const dg = (gridG[idx] - bg[1]) / 255;
      const db = (gridB[idx] - bg[2]) / 255;
      return Math.sqrt(0.30 * dr * dr + 0.59 * dg * dg + 0.11 * db * db);
    }

    function pushSeed(idx) {
      if (visited[idx]) return;
      visited[idx] = 1;
      if (pixelDist(idx) <= maxDist) {
        isBg[idx] = 1;
        queue[qTail++] = idx;
      }
    }

    // Seed from top/left/right margins & bottom corners
    for (let gx = 0; gx < gridW; gx++) pushSeed(gx);
    for (let gy = 0; gy < Math.round(gridH * 0.92); gy++) {
      pushSeed(gy * gridW);
      pushSeed(gy * gridW + (gridW - 1));
    }

    // 4-neighbor adaptive Flood-Fill
    const edgeGradLimit = maxDist * 0.55;
    while (qHead < qTail) {
      const cur = queue[qHead++];
      const cx = cur % gridW;
      const cy = (cur / gridW) | 0;

      const nbrs = [];
      if (cx > 0) nbrs.push(cur - 1);
      if (cx < gridW - 1) nbrs.push(cur + 1);
      if (cy > 0) nbrs.push(cur - gridW);
      if (cy < gridH - 1) nbrs.push(cur + gridW);

      for (let k = 0; k < nbrs.length; k++) {
        const nb = nbrs[k];
        if (visited[nb]) continue;
        visited[nb] = 1;

        const dGlobal = pixelDist(nb);
        const drl = (gridR[nb] - gridR[cur]) / 255;
        const dgl = (gridG[nb] - gridG[cur]) / 255;
        const dbl = (gridB[nb] - gridB[cur]) / 255;
        const dLocal = Math.sqrt(0.30 * drl * drl + 0.59 * dgl * dgl + 0.11 * dbl * dbl);

        if (dGlobal <= maxDist && dLocal <= edgeGradLimit) {
          isBg[nb] = 1;
          queue[qTail++] = nb;
        }
      }
    }

    // Foreground = 1 - isBg, soft-feathered so edges never look like razor stairs
    const fg = new Float32Array(n);
    for (let i = 0; i < n; i++) fg[i] = isBg[i] ? 0 : Math.min(1, gridA[i]);
    const blurR = Math.max(2, Math.round(Math.min(gridW, gridH) * 0.025));
    return gaussianBlur(fg, gridW, gridH, blurR, blurR * 0.55);
  }

  /**
   * 2-Pass Chamfer 3-4 Euclidean Distance Field inside foreground mask:
   * Produces smooth organic sculptural domes aligned strictly to the subject shape!
   */
  function computeDistanceField(mask, w, h) {
    const n = w * h;
    const dist = new Float32Array(n);
    const INF = 1e6;
    for (let i = 0; i < n; i++) {
      dist[i] = mask[i] > 0.42 ? INF : 0;
    }

    // Forward pass
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (dist[i] === 0) continue;
        let d = dist[i];
        if (x > 0) d = Math.min(d, dist[i - 1] + 3);
        if (y > 0) d = Math.min(d, dist[i - w] + 3);
        if (x > 0 && y > 0) d = Math.min(d, dist[i - w - 1] + 4);
        if (x < w - 1 && y > 0) d = Math.min(d, dist[i - w + 1] + 4);
        dist[i] = d;
      }
    }

    // Backward pass
    let maxD = 1;
    for (let y = h - 1; y >= 0; y--) {
      for (let x = w - 1; x >= 0; x--) {
        const i = y * w + x;
        if (dist[i] === 0) continue;
        let d = dist[i];
        if (x < w - 1) d = Math.min(d, dist[i + 1] + 3);
        if (y < h - 1) d = Math.min(d, dist[i + w] + 3);
        if (x < w - 1 && y < h - 1) d = Math.min(d, dist[i + w + 1] + 4);
        if (x > 0 && y < h - 1) d = Math.min(d, dist[i + w - 1] + 4);
        dist[i] = d;
        if (d > maxD && d < INF) maxD = d;
      }
    }

    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const nd = Math.min(1, dist[i] / (maxD * 0.72 || 1));
      // Rounded elliptical relief curve sqrt(1 - (1 - nd)^2) -> smooth stone sculpture
      out[i] = dist[i] > 0 ? Math.pow(Math.sin(nd * Math.PI * 0.5), 0.75) : 0;
    }
    return gaussianBlur(out, w, h, Math.max(3, Math.round(w * 0.025)), 2.2);
  }

  // ─── 5. Shape Domain Mapping (Conformal UV <-> CAD Contour) ─────────────

  function mapGridToShapeXY(u, v, shapeType, xLen, yLen) {
    const sx = u * 2 - 1;   // [-1 .. +1]
    const sy = 1 - v * 2;   // [+1 .. -1]
    const minDim = Math.min(xLen, yLen);
    const R = minDim * 0.5;

    if (shapeType === 'circle' || shapeType === 'oval') {
      const dx = sx * Math.sqrt(Math.max(0, 1 - sy * sy * 0.5));
      const dy = sy * Math.sqrt(Math.max(0, 1 - sx * sx * 0.5));
      const aspectX = (shapeType === 'oval') ? 0.84 : 1.0;
      return {
        px: dx * R * aspectX,
        py: dy * R,
        sampleU: 0.5 + dx * 0.5,
        sampleV: 0.5 - dy * 0.5,
        radial: Math.hypot(dx, dy)
      };
    }

    if (shapeType === 'squircle') {
      const dx = sx * Math.sqrt(Math.max(0, 1 - sy * sy * 0.5));
      const dy = sy * Math.sqrt(Math.max(0, 1 - sx * sx * 0.5));
      const blend = 0.28;
      const bx = sx * (1 - blend) + dx * blend;
      const by = sy * (1 - blend) + dy * blend;
      return {
        px: bx * xLen * 0.5,
        py: by * yLen * 0.5,
        sampleU: u,
        sampleV: v,
        radial: Math.max(Math.abs(sx), Math.abs(sy))
      };
    }

    if (shapeType === 'heart') {
      const dx = sx * Math.sqrt(Math.max(0, 1 - sy * sy * 0.5));
      const dy = sy * Math.sqrt(Math.max(0, 1 - sx * sx * 0.5));
      const rho = Math.hypot(dx, dy);
      const ang = Math.atan2(dy, dx);
      const t = Math.PI * 0.5 - ang;
      const hx = Math.pow(Math.sin(t), 3);
      const hy = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16;
      const shiftedY = (hy + 0.24) * 1.12;
      return {
        px: rho * hx * R,
        py: rho * shiftedY * R,
        sampleU: 0.5 + dx * 0.45,
        sampleV: 0.48 - dy * 0.45,
        radial: rho
      };
    }

    // Classic Rectangle (shifted cleanly centered around (0,0) just like CAD/Three.js!)
    return {
      px: (u - 0.5) * xLen,
      py: (0.5 - v) * yLen,
      sampleU: u,
      sampleV: v,
      radial: Math.max(Math.abs(sx), Math.abs(sy))
    };
  }

  // ─── 6. Heightmap Sculptor (Ultra Multi-Scale + Scharr Edge Chisel) ──────

  function buildHeightMap(data, imgW, imgH, gridW, gridH, mode, opts = {}) {
    const mirrorY = !!opts.mirrorY;
    const shapeType = opts.shapeProfile || 'rect';
    const rawLum = new Float32Array(gridW * gridH);
    const alphaGrid = new Float32Array(gridW * gridH);

    // 1. Sample bicubic luminance directly mapped onto active CAD shape domain!
    for (let gy = 0; gy < gridH; gy++) {
      const v0 = gy / (gridH - 1);
      for (let gx = 0; gx < gridW; gx++) {
        const u0 = gx / (gridW - 1);
        const mapped = mapGridToShapeXY(u0, v0, shapeType, 100, 100 * (imgH / imgW));
        const su = Math.max(0, Math.min(1, mapped.sampleU));
        const sv = mirrorY ? (1.0 - Math.max(0, Math.min(1, mapped.sampleV))) : Math.max(0, Math.min(1, mapped.sampleV));
        const fx = su * (imgW - 1);
        const fy = sv * (imgH - 1);
        const idx = gy * gridW + gx;
        rawLum[idx] = sampleBicubic(data, fx, fy, imgW, imgH);
        alphaGrid[idx] = samplePixelAlpha(data, Math.round(fx), Math.round(fy), imgW, imgH);
      }
    }

    // 2. Smart Flood-Fill Subject Cushion & Distance-Field Sculpture Volume
    const bgStats = detectBackgroundStats(data, imgW, imgH);
    const hasStudioBg = (bgStats.stdDev < 0.20) || (bgStats.alphaAvg < 0.25);
    let subjectMask = null;
    if (opts.isolateSubject || (mode === 'portrait' && hasStudioBg) || (mode === 'relief' && hasStudioBg)) {
      const tol = opts.bgTolerance !== undefined ? opts.bgTolerance / 100 : 0.28;
      subjectMask = computeSubjectMask(data, imgW, imgH, gridW, gridH, tol, mirrorY);
      // If shape != rect/curved, warp subject mask identically into mapped domain
      if (shapeType !== 'rect' && shapeType !== 'curved') {
        const warped = new Float32Array(gridW * gridH);
        for (let gy = 0; gy < gridH; gy++) {
          const v0 = gy / (gridH - 1);
          for (let gx = 0; gx < gridW; gx++) {
            const u0 = gx / (gridW - 1);
            const m = mapGridToShapeXY(u0, v0, shapeType, 100, 100 * (imgH / imgW));
            const mx = Math.max(0, Math.min(gridW - 1, Math.round(m.sampleU * (gridW - 1))));
            const my = Math.max(0, Math.min(gridH - 1, Math.round(m.sampleV * (gridH - 1))));
            warped[gy * gridW + gx] = subjectMask[my * gridW + mx];
          }
        }
        subjectMask = warped;
      }
    }

    // 3. Multi-Scale Decomposition + Scharr Edge Micro-Chisel
    const macroR = Math.max(3, Math.round(Math.min(gridW, gridH) * 0.03));
    const macro = gaussianBlur(rawLum, gridW, gridH, macroR, macroR * 0.65);
    const fineMacro = gaussianBlur(rawLum, gridW, gridH, 1.5, 1.0);

    // Optional Scharr Gradient Crispness (`edgeBoost`) for eyes, irises, engraved insignia
    const scharr = new Float32Array(gridW * gridH);
    if (opts.edgeBoost) {
      for (let gy = 1; gy < gridH - 1; gy++) {
        for (let gx = 1; gx < gridW - 1; gx++) {
          const tl = rawLum[(gy - 1) * gridW + gx - 1], tc = rawLum[(gy - 1) * gridW + gx], tr = rawLum[(gy - 1) * gridW + gx + 1];
          const ml = rawLum[gy * gridW + gx - 1], mr = rawLum[gy * gridW + gx + 1];
          const bl = rawLum[(gy + 1) * gridW + gx - 1], bc = rawLum[(gy + 1) * gridW + gx], br = rawLum[(gy + 1) * gridW + gx + 1];
          const sx = (3 * (tr + br - tl - bl) + 10 * (mr - ml)) / 16;
          const sy = (3 * (bl + br - tl - tr) + 10 * (bc - tc)) / 16;
          scharr[gy * gridW + gx] = Math.min(0.18, Math.hypot(sx, sy) * 0.45);
        }
      }
    }

    const hmap = new Float32Array(gridW * gridH);
    const detailGain = opts.edgeBoost ? 0.55 : 0.36;
    const detailCap = opts.edgeBoost ? 0.12 : 0.075;

    for (let i = 0; i < gridW * gridH; i++) {
      const micro = fineMacro[i] - macro[i];
      const clampedMicro = Math.max(-detailCap, Math.min(detailCap, micro));
      const crisp = scharr[i];

      if (subjectMask && !opts.isolateSubject) {
        const s = subjectMask[i];
        const liftedLum = 0.34 + macro[i] * 0.56;
        const bgHeight = 0.10 + macro[i] * 0.08;
        const baseVol = bgHeight * (1 - s) + (0.28 + liftedLum * 0.62) * s;
        hmap[i] = Math.max(0, Math.min(1, baseVol + clampedMicro * detailGain + crisp * s));
      } else {
        const softMacro = 0.16 + macro[i] * 0.74;
        hmap[i] = Math.max(0, Math.min(1, softMacro + clampedMicro * detailGain + crisp));
      }
    }

    // 4. Mode-Specific Sculpting
    if (mode === 'portrait') {
      const domeStrength = (opts.domeDepth !== undefined ? opts.domeDepth : 65) / 100;
      const distField = subjectMask ? computeDistanceField(subjectMask, gridW, gridH) : null;

      for (let gy = 0; gy < gridH; gy++) {
        for (let gx = 0; gx < gridW; gx++) {
          const idx = gy * gridW + gx;
          let dome;
          if (distField) {
            dome = distField[idx];
          } else {
            const nx = (gx / (gridW - 1) - 0.5) / 0.44;
            const ny = (gy / (gridH - 1) - 0.46) / 0.48;
            const d = Math.hypot(nx, ny);
            dome = d < 1.0 ? Math.pow(Math.cos(d * Math.PI * 0.5), 0.75) : 0;
          }
          let feat = hmap[idx];
          if (feat < 0.42) feat = feat + (0.42 - feat) * 0.52;
          hmap[idx] = Math.max(0, Math.min(1, domeStrength * 0.48 * dome + (1.0 - domeStrength * 0.32) * feat));
        }
      }
    } else if (mode === 'cameo') {
      const domeStrength = (opts.domeDepth !== undefined ? opts.domeDepth : 65) / 100;
      for (let gy = 0; gy < gridH; gy++) {
        const v0 = gy / (gridH - 1);
        for (let gx = 0; gx < gridW; gx++) {
          const u0 = gx / (gridW - 1);
          const m = mapGridToShapeXY(u0, v0, shapeType, 100, 100 * (imgH / imgW));
          const r = m.radial;
          const idx = gy * gridW + gx;
          // Raised double coin rim at edge + gentle medallion cushion inside
          let rim = 0;
          if (r >= 0.87 && r <= 0.99) {
            rim = Math.sin(((r - 0.87) / 0.12) * Math.PI) * 0.42;
          }
          const innerDome = r < 0.87 ? Math.cos((r / 0.87) * Math.PI * 0.5) * 0.32 * domeStrength : 0;
          const reliefFeat = hmap[idx] * (r > 0.87 ? 0.25 : 0.48);
          hmap[idx] = Math.max(0, Math.min(1, 0.18 + innerDome + rim + reliefFeat));
        }
      }
    } else if (mode === 'stamp') {
      const thresh = (opts.stampThreshold !== undefined ? opts.stampThreshold : 50) / 100;
      const edge = 0.05;
      for (let i = 0; i < gridW * gridH; i++) {
        const v = rawLum[i];
        if (v > thresh + edge) hmap[i] = 1.0;
        else if (v < thresh - edge) hmap[i] = 0.0;
        else hmap[i] = (v - (thresh - edge)) / (2 * edge);
      }
    } else if (mode === 'lithophane') {
      // Optical PLA Beer-Lambert calibration: brightest pixels = thinnest (0.0), darkest = thickest (1.0)
      for (let i = 0; i < gridW * gridH; i++) {
        const inv = 1.0 - rawLum[i];
        hmap[i] = Math.max(0, Math.min(1, Math.pow(inv, 1.08)));
      }
    } else if (mode === 'emboss') {
      const thresh = (opts.stampThreshold !== undefined ? opts.stampThreshold : 50) / 100;
      for (let i = 0; i < gridW * gridH; i++) {
        hmap[i] = rawLum[i] >= thresh ? 1.0 : 0.0;
      }
    } else if (mode === 'heightmap') {
      for (let i = 0; i < gridW * gridH; i++) {
        hmap[i] = Math.max(0, Math.min(1, rawLum[i] + scharr[i]));
      }
    }

    // 5. Explicit Background Removal / Flood-Fill Isolation
    if (opts.isolateSubject && subjectMask && mode !== 'lithophane') {
      for (let i = 0; i < gridW * gridH; i++) {
        hmap[i] *= subjectMask[i];
      }
    }

    // Enforce transparent cutout floor on transparent PNGs
    if (bgStats.alphaAvg < 0.25 && mode !== 'lithophane') {
      for (let i = 0; i < gridW * gridH; i++) {
        hmap[i] *= alphaGrid[i];
      }
    }

    // 6. Invert Depth
    if (opts.invertDepth) {
      for (let i = 0; i < gridW * gridH; i++) {
        hmap[i] = 1.0 - hmap[i];
      }
    }

    // 7. Isotropic Slope Limiter + Polish (skip smoothing crisp stamp/emboss edges too aggressively)
    if (mode === 'stamp' || mode === 'emboss') {
      return clampSlope(hmap, gridW, gridH, 0.09, 2);
    }
    const clamped = clampSlope(hmap, gridW, gridH, 0.036, 4);
    return gaussianBlur(clamped, gridW, gridH, 1, 0.8);
  }

  function buildSuperSampledHeightmap(data, imgW, imgH, gridW, gridH, mode, superFactor, opts = {}) {
    // Cap internal super-sampled raster to keep memory & speed ultra-fast even at 512px
    const maxSuper = 768;
    const effectiveSuper = Math.max(1, Math.min(superFactor, Math.floor(maxSuper / Math.max(gridW, gridH)) || 1));
    if (effectiveSuper <= 1) {
      return buildHeightMap(data, imgW, imgH, gridW, gridH, mode, opts);
    }
    const sw = gridW * effectiveSuper;
    const sh = gridH * effectiveSuper;
    const superHmap = buildHeightMap(data, imgW, imgH, sw, sh, mode, opts);

    const hmap = new Float32Array(gridW * gridH);
    const inv = 1 / (effectiveSuper * effectiveSuper);
    for (let gy = 0; gy < gridH; gy++) {
      for (let gx = 0; gx < gridW; gx++) {
        let sum = 0;
        for (let dy = 0; dy < effectiveSuper; dy++) {
          const rowOff = (gy * effectiveSuper + dy) * sw + gx * effectiveSuper;
          for (let dx = 0; dx < effectiveSuper; dx++) {
            sum += superHmap[rowOff + dx];
          }
        }
        hmap[gy * gridW + gx] = sum * inv;
      }
    }
    return hmap;
  }

  function enhanceHeightmap(hmap, gamma, minVal, maxVal) {
    const range = maxVal - minVal || 1;
    const out = new Float32Array(hmap.length);
    for (let i = 0; i < hmap.length; i++) {
      const v = Math.max(0, Math.min(1, (hmap[i] - minVal) / range));
      out[i] = Math.pow(v, gamma);
    }
    return out;
  }

  function hmapStats(hmap) {
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < hmap.length; i++) {
      if (hmap[i] < min) min = hmap[i];
      if (hmap[i] > max) max = hmap[i];
    }
    return { min, max };
  }

  function hexToNormalizedRGB(hex) {
    const h = (hex || '#4f8eff').replace('#', '');
    if (h.length < 6) return [0.31, 0.56, 1.0];
    return [
      parseInt(h.slice(0, 2), 16) / 255,
      parseInt(h.slice(2, 4), 16) / 255,
      parseInt(h.slice(4, 6), 16) / 255
    ];
  }

  function bakeVertexColors(data, imgW, imgH, hmap, gridW, gridH, aoStrength = 0.18, opts = {}) {
    const colors = new Float32Array(gridW * gridH * 3);
    const shapeType = opts.shapeProfile || 'rect';
    const mirrorY = !!opts.mirrorY;
    const fb = hexToNormalizedRGB(opts.color || '#4f8eff');

    for (let gy = 0; gy < gridH; gy++) {
      const v0 = gy / (gridH - 1);
      for (let gx = 0; gx < gridW; gx++) {
        const u0 = gx / (gridW - 1);
        const mapped = mapGridToShapeXY(u0, v0, shapeType, 100, 100 * (imgH / imgW));
        const su = Math.max(0, Math.min(1, mapped.sampleU));
        const sv = mirrorY ? (1.0 - Math.max(0, Math.min(1, mapped.sampleV))) : Math.max(0, Math.min(1, mapped.sampleV));

        const fx = su * (imgW - 1);
        const fy = sv * (imgH - 1);
        const [r, g, b] = sampleColorBilinear(data, fx, fy, imgW, imgH, fb);

        const center = hmap[gy * gridW + gx];
        let diff = 0, cnt = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const ny = Math.max(0, Math.min(gridH - 1, gy + dy));
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = Math.max(0, Math.min(gridW - 1, gx + dx));
            diff += Math.max(0, hmap[ny * gridW + nx] - center);
            cnt++;
          }
        }
        const cavityAO = 1.0 - Math.min(0.28, (diff / (cnt || 1)) * aoStrength * 2.2);

        const ci = (gy * gridW + gx) * 3;
        colors[ci] = Math.max(0, Math.min(1, r * cavityAO));
        colors[ci + 1] = Math.max(0, Math.min(1, g * cavityAO));
        colors[ci + 2] = Math.max(0, Math.min(1, b * cavityAO));
      }
    }
    return colors;
  }

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
        out[(gy * 2) * nW + (gx * 2 + 1)] = (hmap[gy * gridW + gx] + hmap[gy * gridW + gx + 1]) * 0.5;
      }
    }
    for (let gy = 0; gy < gridH - 1; gy++) {
      for (let gx = 0; gx < nW; gx++) {
        out[(gy * 2 + 1) * nW + gx] = (out[(gy * 2) * nW + gx] + out[((gy + 1) * 2) * nW + gx]) * 0.5;
      }
    }
    return { hmap: out, gridW: nW, gridH: nH };
  }

  // ─── 7. Watertight 3D Manifold Mesh Builder (All 6 CAD Shapes!) ──────────

  function triNormal(a, b, c) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    return [nx / len, ny / len, nz / len];
  }

  function buildIndexedMesh(hmap, gridW, gridH, depthMM, baseMM, scaleMM, solidBase, mirrorY, opts = {}) {
    const shapeType = opts.shapeProfile || 'rect';
    const aspectY = opts.imgAspect || (gridH / gridW);
    const xLen = scaleMM;
    const yLen = scaleMM * aspectY;
    const arcAngleRad = ((opts.arcAngleDeg || 120) * Math.PI) / 180;

    const topVerts = gridW * gridH;
    const verts = new Float32Array(topVerts * 3);
    const baseFlatVerts = new Float32Array(topVerts * 3); // Used for GLTF real 2D->3D Morph Targets!
    const uvs = new Float32Array(topVerts * 2);

    const isCurved = (shapeType === 'curved');
    const arcR = xLen / Math.max(0.25, arcAngleRad);

    for (let gy = 0; gy < gridH; gy++) {
      const v = gy / (gridH - 1);
      for (let gx = 0; gx < gridW; gx++) {
        const u = gx / (gridW - 1);
        const gi = gy * gridW + gx;
        const h = hmap[gi];
        const vi = gi * 3;
        const uvi = gi * 2;

        if (isCurved) {
          // Upright standing Curved Lithophane Lamp Arc (bottom flat at y = -yLen/2 for preview / z=0 in STL?
          // Wait: keep unified +Z depth/radial convention in local coordinates:
          // X = arc width, Y = vertical height [-yLen/2 .. +yLen/2], Z = convex bulge toward +Z!)
          // Note: buildSTLBuffer optionally stands curved arc onto Z=0 bed!
          const alpha = (u - 0.5) * arcAngleRad;
          const thickness = Math.max(0.4, baseMM + h * depthMM);
          const minR = arcR + Math.max(0.4, baseMM);
          const curR = arcR + thickness;

          verts[vi] = curR * Math.sin(alpha);
          verts[vi + 1] = (0.5 - v) * yLen;
          verts[vi + 2] = curR * Math.cos(alpha) - arcR * Math.cos(arcAngleRad * 0.5);

          baseFlatVerts[vi] = minR * Math.sin(alpha);
          baseFlatVerts[vi + 1] = (0.5 - v) * yLen;
          baseFlatVerts[vi + 2] = minR * Math.cos(alpha) - arcR * Math.cos(arcAngleRad * 0.5);

          uvs[uvi] = u;
          uvs[uvi + 1] = mirrorY ? (1.0 - v) : v;
        } else {
          const mapped = mapGridToShapeXY(u, v, shapeType, xLen, yLen);
          const vz = Math.max(0.05, baseMM) + h * depthMM;

          verts[vi] = mapped.px;
          verts[vi + 1] = mapped.py;
          verts[vi + 2] = vz;

          baseFlatVerts[vi] = mapped.px;
          baseFlatVerts[vi + 1] = mapped.py;
          baseFlatVerts[vi + 2] = Math.max(0.2, baseMM);

          uvs[uvi] = Math.max(0, Math.min(1, mapped.sampleU));
          uvs[uvi + 1] = mirrorY
            ? (1.0 - Math.max(0, Math.min(1, mapped.sampleV)))
            : Math.max(0, Math.min(1, mapped.sampleV));
        }
      }
    }

    const topTriangles = (gridW - 1) * (gridH - 1) * 2;
    const indices = new Uint32Array(topTriangles * 3);
    let iIdx = 0;

    for (let gy = 0; gy < gridH - 1; gy++) {
      for (let gx = 0; gx < gridW - 1; gx++) {
        const i00 = gy * gridW + gx;
        const i10 = gy * gridW + gx + 1;
        const i01 = (gy + 1) * gridW + gx;
        const i11 = (gy + 1) * gridW + gx + 1;
        indices[iIdx++] = i00; indices[iIdx++] = i01; indices[iIdx++] = i10;
        indices[iIdx++] = i10; indices[iIdx++] = i01; indices[iIdx++] = i11;
      }
    }

    // Area-weighted smooth vertex normals
    const normals = new Float32Array(topVerts * 3);
    for (let ti = 0; ti < topTriangles; ti++) {
      const ii = ti * 3;
      const ai = indices[ii] * 3, bi = indices[ii + 1] * 3, ci = indices[ii + 2] * 3;
      const ax = verts[ai], ay = verts[ai + 1], az = verts[ai + 2];
      const ux = verts[bi] - ax, uy = verts[bi + 1] - ay, uz = verts[bi + 2] - az;
      const vvx = verts[ci] - ax, vvy = verts[ci + 1] - ay, vvz = verts[ci + 2] - az;
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
      const len = Math.hypot(normals[ni], normals[ni + 1], normals[ni + 2]) || 1;
      normals[ni] /= len; normals[ni + 1] /= len; normals[ni + 2] /= len;
    }

    // ─── Watertight Side Walls + Solid Back/Inner Shell ──────────────────
    const extraTriangles = [];
    let curvedBackVerts = null;
    if (solidBase) {
      if (isCurved) {
        // Curved shell back wall grid (smooth cylindrical inner wall at radius arcR facing bulb)
        const backVerts = new Float32Array(topVerts * 3);
        curvedBackVerts = backVerts;
        const zShift = arcR * Math.cos(arcAngleRad * 0.5);
        for (let gy = 0; gy < gridH; gy++) {
          const v = gy / (gridH - 1);
          const py = (0.5 - v) * yLen;
          for (let gx = 0; gx < gridW; gx++) {
            const u = gx / (gridW - 1);
            const alpha = (u - 0.5) * arcAngleRad;
            const vi = (gy * gridW + gx) * 3;
            backVerts[vi] = arcR * Math.sin(alpha);
            backVerts[vi + 1] = py;
            backVerts[vi + 2] = arcR * Math.cos(alpha) - zShift;
          }
        }
        const getPt = (arr, gx, gy) => {
          const vi = (gy * gridW + gx) * 3;
          return [arr[vi], arr[vi + 1], arr[vi + 2]];
        };
        // Inner cylindrical back wall (opposite winding facing -Z/inward)
        for (let gy = 0; gy < gridH - 1; gy++) {
          for (let gx = 0; gx < gridW - 1; gx++) {
            const p00 = getPt(backVerts, gx, gy);
            const p10 = getPt(backVerts, gx + 1, gy);
            const p01 = getPt(backVerts, gx, gy + 1);
            const p11 = getPt(backVerts, gx + 1, gy + 1);
            extraTriangles.push([p00, p10, p01, triNormal(p00, p10, p01)]);
            extraTriangles.push([p10, p11, p01, triNormal(p10, p11, p01)]);
          }
        }
        // Top rim (gy = 0)
        for (let gx = 0; gx < gridW - 1; gx++) {
          const f0 = getPt(verts, gx, 0), f1 = getPt(verts, gx + 1, 0);
          const b0 = getPt(backVerts, gx, 0), b1 = getPt(backVerts, gx + 1, 0);
          extraTriangles.push([f0, f1, b1, triNormal(f0, f1, b1)], [f0, b1, b0, triNormal(f0, b1, b0)]);
        }
        // Bottom rim (gy = gridH - 1)
        const brow = gridH - 1;
        for (let gx = 0; gx < gridW - 1; gx++) {
          const f0 = getPt(verts, gx, brow), f1 = getPt(verts, gx + 1, brow);
          const b0 = getPt(backVerts, gx, brow), b1 = getPt(backVerts, gx + 1, brow);
          extraTriangles.push([f0, b0, b1, triNormal(f0, b0, b1)], [f0, b1, f1, triNormal(f0, b1, f1)]);
        }
        // Left rim (gx = 0)
        for (let gy = 0; gy < gridH - 1; gy++) {
          const f0 = getPt(verts, 0, gy), f1 = getPt(verts, 0, gy + 1);
          const b0 = getPt(backVerts, 0, gy), b1 = getPt(backVerts, 0, gy + 1);
          extraTriangles.push([f0, b0, b1, triNormal(f0, b0, b1)], [f0, b1, f1, triNormal(f0, b1, f1)]);
        }
        // Right rim (gx = gridW - 1)
        const rcol = gridW - 1;
        for (let gy = 0; gy < gridH - 1; gy++) {
          const f0 = getPt(verts, rcol, gy), f1 = getPt(verts, rcol, gy + 1);
          const b0 = getPt(backVerts, rcol, gy), b1 = getPt(backVerts, rcol, gy + 1);
          extraTriangles.push([f0, f1, b1, triNormal(f0, f1, b1)], [f0, b1, b0, triNormal(f0, b1, b0)]);
        }
      } else {
        // Universal Watertight Planar Boundary Loop for ANY star-shaped silhouette!
        // Ordered strictly CCW when viewed from +Z:
        const boundaryTop = [];
        for (let gx = gridW - 1; gx > 0; gx--) {
          const vi = gx * 3; boundaryTop.push([verts[vi], verts[vi + 1], verts[vi + 2]]);
        }
        for (let gy = 0; gy < gridH - 1; gy++) {
          const vi = (gy * gridW) * 3; boundaryTop.push([verts[vi], verts[vi + 1], verts[vi + 2]]);
        }
        for (let gx = 0; gx < gridW - 1; gx++) {
          const vi = ((gridH - 1) * gridW + gx) * 3; boundaryTop.push([verts[vi], verts[vi + 1], verts[vi + 2]]);
        }
        for (let gy = gridH - 1; gy > 0; gy--) {
          const vi = (gy * gridW + (gridW - 1)) * 3; boundaryTop.push([verts[vi], verts[vi + 1], verts[vi + 2]]);
        }

        const z0 = 0;
        let cxSum = 0, cySum = 0;
        for (let k = 0; k < boundaryTop.length; k++) {
          cxSum += boundaryTop[k][0];
          cySum += boundaryTop[k][1];
        }
        const centerBot = [cxSum / boundaryTop.length, cySum / boundaryTop.length, z0];

        const K = boundaryTop.length;
        for (let k = 0; k < K; k++) {
          const t0 = boundaryTop[k];
          const t1 = boundaryTop[(k + 1) % K];
          const b0 = [t0[0], t0[1], z0];
          const b1 = [t1[0], t1[1], z0];

          const tx = b1[0] - b0[0], ty = b1[1] - b0[1];
          const len = Math.hypot(tx, ty) || 1;
          const wn = [ty / len, -tx / len, 0];

          // Side wall quad facing outward away from interior
          extraTriangles.push([t0, b0, b1, wn], [t0, b1, t1, wn]);
          // Flat bottom fan cap facing -Z (down onto slicer print bed z = 0)
          extraTriangles.push([centerBot, b1, b0, [0, 0, -1]]);
        }
      }
    }

    // Compute exact bounding dimensions in mm
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < verts.length; i += 3) {
      if (verts[i] < minX) minX = verts[i]; if (verts[i] > maxX) maxX = verts[i];
      if (verts[i + 1] < minY) minY = verts[i + 1]; if (verts[i + 1] > maxY) maxY = verts[i + 1];
      if (verts[i + 2] < minZ) minZ = verts[i + 2]; if (verts[i + 2] > maxZ) maxZ = verts[i + 2];
    }
    if (solidBase && !isCurved) minZ = 0;

    return {
      verts,
      baseFlatVerts,
      backVerts: curvedBackVerts,
      uvs,
      normals,
      indices,
      topVerts,
      extraTriangles,
      topTriangles,
      gridW,
      gridH,
      shapeProfile: shapeType,
      bounds: { minX, maxX, minY, maxY, minZ, maxZ }
    };
  }

  // ─── 8. STL Binary & Wavefront OBJ+MTL Exporters ────────────────────────

  function buildSTLBuffer(mesh) {
    const { verts, normals, indices, topTriangles, extraTriangles, shapeProfile, bounds } = mesh;
    const totalTris = topTriangles + extraTriangles.length;

    const buf = new ArrayBuffer(84 + totalTris * 50);
    const view = new DataView(buf);
    const headStr = 'Generated free at https://studios-pro.com - New 3D 4D Studio Ultra';
    for (let i = 0; i < 80; i++) view.setUint8(i, i < headStr.length ? headStr.charCodeAt(i) : 0);
    view.setUint32(80, totalTris, true);

    // For slicer printability: center X/Y >= 0 or centered cleanly, bottom strictly Z >= 0
    // For curved lamp: rotate +90deg around X so bottom edge of lamp stands flat on slicer Z=0 bed!
    const isCurved = (shapeProfile === 'curved');
    const shiftZ = isCurved ? -bounds.minY : -Math.min(0, bounds.minZ);
    const rotPt = (x, y, z) => isCurved ? [x, -z, y + shiftZ] : [x, y, z + shiftZ];
    const rotN = (nx, ny, nz) => isCurved ? [nx, -nz, ny] : [nx, ny, nz];

    let off = 84;
    function writeVec3(x, y, z) {
      view.setFloat32(off, x, true); off += 4;
      view.setFloat32(off, y, true); off += 4;
      view.setFloat32(off, z, true); off += 4;
    }

    for (let ti = 0; ti < topTriangles; ti++) {
      const ii = ti * 3;
      const i0 = indices[ii] * 3, i1 = indices[ii + 1] * 3, i2 = indices[ii + 2] * 3;
      const n = rotN(
        (normals[i0] + normals[i1] + normals[i2]) / 3,
        (normals[i0 + 1] + normals[i1 + 1] + normals[i2 + 1]) / 3,
        (normals[i0 + 2] + normals[i1 + 2] + normals[i2 + 2]) / 3
      );
      const p0 = rotPt(verts[i0], verts[i0 + 1], verts[i0 + 2]);
      const p1 = rotPt(verts[i1], verts[i1 + 1], verts[i1 + 2]);
      const p2 = rotPt(verts[i2], verts[i2 + 1], verts[i2 + 2]);
      writeVec3(n[0], n[1], n[2]);
      writeVec3(p0[0], p0[1], p0[2]);
      writeVec3(p1[0], p1[1], p1[2]);
      writeVec3(p2[0], p2[1], p2[2]);
      view.setUint16(off, 0, true); off += 2;
    }

    for (let i = 0; i < extraTriangles.length; i++) {
      const [v0, v1, v2, norm] = extraTriangles[i];
      const n = rotN(norm[0], norm[1], norm[2]);
      const p0 = rotPt(v0[0], v0[1], v0[2]);
      const p1 = rotPt(v1[0], v1[1], v1[2]);
      const p2 = rotPt(v2[0], v2[1], v2[2]);
      writeVec3(n[0], n[1], n[2]);
      writeVec3(p0[0], p0[1], p0[2]);
      writeVec3(p1[0], p1[1], p1[2]);
      writeVec3(p2[0], p2[1], p2[2]);
      view.setUint16(off, 0, true); off += 2;
    }

    return buf;
  }

  function buildOBJ(mesh, mtlName) {
    const { verts, uvs, normals, vertexColors, indices, topTriangles, extraTriangles } = mesh;
    const topVerts = verts.length / 3;
    const lines = [
      '# Generated free online at https://studios-pro.com — New 3D 4D Studio Ultra',
      `# Vertices: ${topVerts}`,
      `# Triangles: ${topTriangles + extraTriangles.length}`
    ];
    if (mtlName) {
      lines.push(`mtllib ${mtlName}.mtl`, `usemtl ${mtlName}`);
    }

    for (let vi = 0; vi < topVerts; vi++) {
      const i = vi * 3;
      if (vertexColors) {
        lines.push(`v ${verts[i].toFixed(4)} ${verts[i + 1].toFixed(4)} ${verts[i + 2].toFixed(4)} ${vertexColors[i].toFixed(4)} ${vertexColors[i + 1].toFixed(4)} ${vertexColors[i + 2].toFixed(4)}`);
      } else {
        lines.push(`v ${verts[i].toFixed(4)} ${verts[i + 1].toFixed(4)} ${verts[i + 2].toFixed(4)}`);
      }
    }
    if (uvs) {
      for (let vi = 0; vi < topVerts; vi++) {
        const i = vi * 2;
        lines.push(`vt ${uvs[i].toFixed(4)} ${(1.0 - uvs[i + 1]).toFixed(4)}`);
      }
    }
    for (let vi = 0; vi < topVerts; vi++) {
      const i = vi * 3;
      lines.push(`vn ${normals[i].toFixed(4)} ${normals[i + 1].toFixed(4)} ${normals[i + 2].toFixed(4)}`);
    }

    lines.push('s 1');
    for (let ti = 0; ti < topTriangles; ti++) {
      const ii = ti * 3;
      const a = indices[ii] + 1, b = indices[ii + 1] + 1, c = indices[ii + 2] + 1;
      lines.push(`f ${a}/${a}/${a} ${b}/${b}/${b} ${c}/${c}/${c}`);
    }

    let extraVertBase = topVerts + 1;
    let extraNormBase = topVerts + 1;
    for (let i = 0; i < extraTriangles.length; i++) {
      const [v0, v1, v2, norm] = extraTriangles[i];
      lines.push(
        `v ${v0[0].toFixed(4)} ${v0[1].toFixed(4)} ${v0[2].toFixed(4)}`,
        `v ${v1[0].toFixed(4)} ${v1[1].toFixed(4)} ${v1[2].toFixed(4)}`,
        `v ${v2[0].toFixed(4)} ${v2[1].toFixed(4)} ${v2[2].toFixed(4)}`,
        `vn ${norm[0].toFixed(4)} ${norm[1].toFixed(4)} ${norm[2].toFixed(4)}`,
        `f ${extraVertBase}//${extraNormBase} ${extraVertBase + 1}//${extraNormBase} ${extraVertBase + 2}//${extraNormBase}`
      );
      extraVertBase += 3;
      extraNormBase += 1;
    }

    return lines.join('\n');
  }

  function buildMTL(opts) {
    const { color = '#4f8eff', metalness = 0.04, roughness = 0.62 } = opts;
    const h = color.replace('#', '');
    const r = (parseInt(h.slice(0, 2), 16) / 255).toFixed(4);
    const g = (parseInt(h.slice(2, 4), 16) / 255).toFixed(4);
    const b = (parseInt(h.slice(4, 6), 16) / 255).toFixed(4);
    const Ns = Math.max(1, (1 - roughness) * 1000).toFixed(1);
    return [
      '# New 3D 4D Studio Ultra — Material Template Library',
      'newmtl model_3d4d',
      'Ka 0.2500 0.2500 0.2500',
      `Kd ${r} ${g} ${b}`,
      `Ks ${(metalness * 0.65).toFixed(4)} ${(metalness * 0.65).toFixed(4)} ${(metalness * 0.65).toFixed(4)}`,
      `Ns ${Ns}`,
      'd 1.0',
      'illum 2'
    ].join('\n');
  }

  // ─── 9. Main Generation Entrypoint ──────────────────────────────────────

  function generate(imageData, opts = {}, onProgress) {
    const {
      mode = 'relief',
      resolution = 256,
      depthMM = 5,
      baseMM = 2,
      scaleMM = 100,
      smoothPasses = 3,
      smoothMethod = 'bilateral',
      superSample = 2,
      solidBase = true,
      mirrorY = false,
      gamma = 1.0,
      bakeColors = true,
      aoStrength = 0.22,
      subdivPass = false,
      isolateSubject = false,
      bgTolerance = 35,
      domeDepth = 65,
      stampThreshold = 50,
      invertDepth = false,
      edgeBoost = false,
      shapeProfile = 'rect',
      arcAngleDeg = 120,
      color = '#4f8eff',
      metalness = 0.04,
      roughness = 0.58,
      colorData = null,
    } = opts;

    const imgW = imageData.width, imgH = imageData.height;
    const data = imageData.data;
    const finalColorData = (colorData && colorData.data) ? colorData.data : data;

    onProgress && onProgress(0.06, 'Analyzing contours & flood-fill mask…');

    // Clamp grid cleanly so non-rect CAD shapes also have balanced density up to 512
    const gridW = Math.max(24, Math.min(resolution, Math.max(resolution, Math.min(512, imgW))));
    const imgAspect = imgH / imgW;
    const gridH = (shapeProfile === 'rect' || shapeProfile === 'curved')
      ? Math.max(24, Math.round(gridW * imgAspect))
      : gridW; // Disc / Oval / Squircle / Heart use square topology grids!

    // 1. Multi-Scale Clamped Relief Heightmap
    let hmap;
    if (superSample > 1) {
      onProgress && onProgress(0.15, `Super-sampling ${superSample}× anti-aliased…`);
      hmap = buildSuperSampledHeightmap(data, imgW, imgH, gridW, gridH, mode, superSample, {
        ...opts, isolateSubject, bgTolerance, domeDepth, stampThreshold, invertDepth, mirrorY, edgeBoost, shapeProfile
      });
    } else {
      hmap = buildHeightMap(data, imgW, imgH, gridW, gridH, mode, {
        ...opts, isolateSubject, bgTolerance, domeDepth, stampThreshold, invertDepth, mirrorY, edgeBoost, shapeProfile
      });
    }

    // 2. Gamma Curve
    if (Math.abs(gamma - 1.0) > 0.01) {
      onProgress && onProgress(0.32, 'Sculpting tonal depth curve…');
      const stats = hmapStats(hmap);
      hmap = enhanceHeightmap(hmap, gamma, stats.min, stats.max);
    }

    // 3. Multi-Algorithm Harmonic Smoothing (all 4 methods working!)
    if (smoothPasses > 0 && mode !== 'stamp' && mode !== 'emboss') {
      onProgress && onProgress(0.45, `Smoothing (${smoothMethod})…`);
      if (smoothMethod === 'bilateral' || smoothMethod === 'both') {
        const sigmaS = Math.max(1.0, smoothPasses * 0.65);
        hmap = bilateralFilter(hmap, gridW, gridH, Math.ceil(sigmaS), sigmaS, 0.16);
      }
      if (smoothMethod === 'laplacian' || smoothMethod === 'both') {
        hmap = laplacianSmooth(hmap, gridW, gridH, Math.min(4, smoothPasses), 0.40);
      }
      if (smoothMethod === 'box') {
        hmap = boxBlurScalar(hmap, gridW, gridH, Math.max(1, Math.round(smoothPasses * 0.4)));
      }
    }

    // 4. Optional Midpoint Subdivision Pass
    let finalGridW = gridW, finalGridH = gridH;
    if (subdivPass && Math.max(gridW, gridH) <= 280) {
      onProgress && onProgress(0.56, 'Midpoint subdivision refinement…');
      const sub = subdivide(hmap, gridW, gridH);
      hmap = sub.hmap;
      finalGridW = sub.gridW;
      finalGridH = sub.gridH;
    }

    // 5. Build 100% Watertight Indexed CAD Mesh
    onProgress && onProgress(0.65, 'Building watertight 3D manifold…');
    const mesh = buildIndexedMesh(hmap, finalGridW, finalGridH, depthMM, baseMM, scaleMM, solidBase, mirrorY, {
      shapeProfile,
      arcAngleDeg,
      imgAspect
    });

    // 6. Photorealistic Vertex Colors + Cavity Ambient Occlusion
    let vertexColors = null;
    if (bakeColors) {
      onProgress && onProgress(0.76, 'Baking HD colors & cavity AO…');
      vertexColors = bakeVertexColors(finalColorData, imgW, imgH, hmap, finalGridW, finalGridH, aoStrength, {
        shapeProfile, mirrorY, color
      });
      mesh.vertexColors = vertexColors;
    }

    // 7. Binary STL & OBJ+MTL
    onProgress && onProgress(0.86, 'Encoding Binary STL & OBJ…');
    const stlBuffer = buildSTLBuffer(mesh);
    const objText = buildOBJ(mesh, 'model_3d4d');
    const mtlText = buildMTL({ color, metalness, roughness });

    const totalTris = mesh.topTriangles + mesh.extraTriangles.length;
    const b = mesh.bounds;
    const isCurved = (shapeProfile === 'curved');
    const dims = {
      x: isCurved ? (b.maxX - b.minX) : (b.maxX - b.minX),
      y: b.maxY - b.minY,
      z: isCurved ? (b.maxZ - b.minZ) : (Math.max(0, b.maxZ - b.minZ)),
    };

    onProgress && onProgress(1.0, 'Ultra 3D Ready!');

    return {
      stlBuffer,
      objText,
      mtlText,
      triangleCount: totalTris,
      vertexCount: mesh.topVerts,
      dims,
      gridW: finalGridW,
      gridH: finalGridH,
      shapeProfile,
      hmap,
      mesh,
      vertexColors,
      baseMM,
      depthMM,
    };
  }

  return {
    generate,
    preprocessRGBA,
    buildHeightMap,
    buildSuperSampledHeightmap,
    computeSubjectMask,
    computeDistanceField,
    sampleBicubic,
    gaussianBlur,
    boxBlurScalar,
    clampSlope,
    bilateralFilter,
    laplacianSmooth,
    bakeVertexColors,
  };

})();

if (typeof self !== 'undefined') self.Engine3D = Engine3D;
if (typeof window !== 'undefined') window.Engine3D = Engine3D;
