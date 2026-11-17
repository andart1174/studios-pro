/**
 * Vector CNC Studio Pro — High-Precision Vectorization, Toolpath & 3D Engine
 * 1. Direct SVG XML Parser (paths, arcs, primitives, transforms -> vector contours)
 * 2. Image Pre-processing (Separable Blur, Otsu Auto-Threshold, Adaptive Bradley-Roth, Sobel Edges, Despeckle)
 * 3. Sub-Pixel Marching Squares (bilinear luminance interpolation + asymptotic saddle resolution)
 * 4. Zhang-Suen Centerline Thinning & 8-Neighbor Skeleton Path Extraction
 * 5. K-Means++ Color Quantization & Multi-Layer Vector Extraction
 * 6. Corner-Preserving Curve Fitting, Hole Nesting, Normal Kerf Offset, Nearest-Neighbor TSP Toolpath Optimization
 * 7. Watertight 3D Extrude Geometry Builder (with Hole Punching) for STL & Studios-Pro AR Viewer
 */
(function (global) {
  'use strict';

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function luminanceField(imgData) {
    const px = imgData.data;
    const len = imgData.width * imgData.height;
    const lum = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const idx = i * 4;
      const a = px[idx + 3] / 255;
      // Blend transparent regions onto pure white
      const r = px[idx] * a + 255 * (1 - a);
      const g = px[idx + 1] * a + 255 * (1 - a);
      const b = px[idx + 2] * a + 255 * (1 - a);
      lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    }
    return lum;
  }

  function separableBlur(src, w, h, radius) {
    const r = Math.max(0, Math.min(8, Math.round(radius || 0)));
    if (r === 0) return new Float32Array(src);
    const tmp = new Float32Array(w * h);
    const dst = new Float32Array(w * h);
    const win = 2 * r + 1;

    for (let y = 0; y < h; y++) {
      const rowOff = y * w;
      for (let x = 0; x < w; x++) {
        let sum = 0;
        for (let k = -r; k <= r; k++) {
          const sx = x + k < 0 ? 0 : x + k >= w ? w - 1 : x + k;
          sum += src[rowOff + sx];
        }
        tmp[rowOff + x] = sum / win;
      }
    }
    for (let y = 0; y < h; y++) {
      const rowOff = y * w;
      for (let x = 0; x < w; x++) {
        let sum = 0;
        for (let k = -r; k <= r; k++) {
          const sy = y + k < 0 ? 0 : y + k >= h ? h - 1 : y + k;
          sum += tmp[sy * w + x];
        }
        dst[rowOff + x] = sum / win;
      }
    }
    return dst;
  }

  function computeOtsuThreshold(lum) {
    const hist = new Uint32Array(256);
    const n = lum.length;
    for (let i = 0; i < n; i++) {
      hist[clamp(Math.round(lum[i]), 0, 255)]++;
    }
    let totalMean = 0;
    for (let t = 0; t < 256; t++) totalMean += t * hist[t];

    let sumB = 0, wB = 0, maxVar = -1, bestT = 128;
    for (let t = 0; t < 256; t++) {
      wB += hist[t];
      if (wB === 0) continue;
      const wF = n - wB;
      if (wF === 0) break;
      sumB += t * hist[t];
      const mB = sumB / wB;
      const mF = (totalMean - sumB) / wF;
      const between = wB * wF * (mB - mF) * (mB - mF);
      if (between > maxVar) {
        maxVar = between;
        bestT = t;
      }
    }
    return clamp(bestT, 18, 238);
  }

  function sobelField(lum, w, h) {
    // Inverted gradient magnitude: 0 = crisp edge, 255 = flat region
    const out = new Float32Array(w * h);
    let maxMag = 1;
    const mags = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      const r0 = (y - 1) * w, r1 = y * w, r2 = (y + 1) * w;
      for (let x = 1; x < w - 1; x++) {
        const gx =
          -lum[r0 + x - 1] + lum[r0 + x + 1]
          - 2 * lum[r1 + x - 1] + 2 * lum[r1 + x + 1]
          - lum[r2 + x - 1] + lum[r2 + x + 1];
        const gy =
          -lum[r0 + x - 1] - 2 * lum[r0 + x] - lum[r0 + x + 1]
          + lum[r2 + x - 1] + 2 * lum[r2 + x] + lum[r2 + x + 1];
        const mag = Math.hypot(gx, gy);
        mags[r1 + x] = mag;
        if (mag > maxMag) maxMag = mag;
      }
    }
    const scale = 255 / Math.max(80, maxMag * 0.65);
    for (let i = 0; i < out.length; i++) {
      out[i] = clamp(255 - mags[i] * scale, 0, 255);
    }
    return out;
  }

  function thresholdBinary(lum, w, h, thr, useAdaptive) {
    const bin = new Uint8Array(w * h);
    if (!useAdaptive) {
      for (let i = 0; i < bin.length; i++) bin[i] = lum[i] < thr ? 1 : 0;
      return bin;
    }
    const intImg = new Float64Array((w + 1) * (h + 1));
    for (let y = 1; y <= h; y++) {
      let rowSum = 0;
      for (let x = 1; x <= w; x++) {
        rowSum += lum[(y - 1) * w + (x - 1)];
        intImg[y * (w + 1) + x] = intImg[(y - 1) * (w + 1) + x] + rowSum;
      }
    }
    const s2 = clamp(Math.round(Math.min(w, h) / 14), 6, 36);
    const ratio = 0.88 - ((thr - 128) / 255) * 0.25;
    for (let y = 0; y < h; y++) {
      const y1 = Math.max(0, y - s2), y2 = Math.min(h - 1, y + s2);
      for (let x = 0; x < w; x++) {
        const x1 = Math.max(0, x - s2), x2 = Math.min(w - 1, x + s2);
        const count = (x2 - x1 + 1) * (y2 - y1 + 1);
        const sum = intImg[(y2 + 1) * (w + 1) + (x2 + 1)]
          - intImg[y1 * (w + 1) + (x2 + 1)]
          - intImg[(y2 + 1) * (w + 1) + x1]
          + intImg[y1 * (w + 1) + x1];
        bin[y * w + x] = lum[y * w + x] < (sum / count) * ratio ? 1 : 0;
      }
    }
    return bin;
  }

  function despeckleBinary(bin, w, h) {
    const out = new Uint8Array(bin);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        const n =
          bin[idx - w - 1] + bin[idx - w] + bin[idx - w + 1] +
          bin[idx - 1] + bin[idx + 1] +
          bin[idx + w - 1] + bin[idx + w] + bin[idx + w + 1];
        if (bin[idx] === 1 && n <= 1) out[idx] = 0;
        else if (bin[idx] === 0 && n >= 7) out[idx] = 1;
      }
    }
    return out;
  }

  function subpixelContours(field, w, h, iso, despeckleField) {
    const pw = w + 2, ph = h + 2;
    const padded = new Float32Array(pw * ph);
    padded.fill(255);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        padded[(y + 1) * pw + (x + 1)] = field[y * w + x];
      }
    }
    if (despeckleField) {
      for (let y = 1; y < ph - 1; y++) {
        for (let x = 1; x < pw - 1; x++) {
          const i = y * pw + x;
          if (padded[i] < iso) {
            let darkN = 0;
            if (padded[i - 1] < iso) darkN++;
            if (padded[i + 1] < iso) darkN++;
            if (padded[i - pw] < iso) darkN++;
            if (padded[i + pw] < iso) darkN++;
            if (darkN === 0) padded[i] = iso + 10;
          }
        }
      }
    }

    const CASE_SEGS = [
      [], [[3, 2]], [[2, 1]], [[3, 1]], [[0, 1]],
      null,
      [[0, 2]], [[0, 3]], [[0, 3]], [[0, 2]],
      null,
      [[0, 1]], [[3, 1]], [[2, 1]], [[3, 2]], []
    ];

    function edgeCrossing(x, y, edge, vTL, vTR, vBR, vBL) {
      let t = 0.5;
      switch (edge) {
        case 0: {
          const d = vTR - vTL;
          t = Math.abs(d) > 1e-4 ? clamp((iso - vTL) / d, 0.04, 0.96) : 0.5;
          return [x + t, y, `H_${x}_${y}`];
        }
        case 1: {
          const d = vBR - vTR;
          t = Math.abs(d) > 1e-4 ? clamp((iso - vTR) / d, 0.04, 0.96) : 0.5;
          return [x + 1, y + t, `V_${x + 1}_${y}`];
        }
        case 2: {
          const d = vBR - vBL;
          t = Math.abs(d) > 1e-4 ? clamp((iso - vBL) / d, 0.04, 0.96) : 0.5;
          return [x + t, y + 1, `H_${x}_${y + 1}`];
        }
        case 3: {
          const d = vBL - vTL;
          t = Math.abs(d) > 1e-4 ? clamp((iso - vTL) / d, 0.04, 0.96) : 0.5;
          return [x, y + t, `V_${x}_${y}`];
        }
      }
    }

    const posByKey = new Map();
    const adj = new Map();

    function linkKeys(k1, p1, k2, p2) {
      if (!posByKey.has(k1)) posByKey.set(k1, [p1[0], p1[1]]);
      if (!posByKey.has(k2)) posByKey.set(k2, [p2[0], p2[1]]);
      if (!adj.has(k1)) adj.set(k1, []);
      if (!adj.has(k2)) adj.set(k2, []);
      adj.get(k1).push(k2);
      adj.get(k2).push(k1);
    }

    for (let y = 0; y < ph - 1; y++) {
      const r0 = y * pw, r1 = (y + 1) * pw;
      for (let x = 0; x < pw - 1; x++) {
        const vTL = padded[r0 + x];
        const vTR = padded[r0 + x + 1];
        const vBR = padded[r1 + x + 1];
        const vBL = padded[r1 + x];
        const code = ((vTL < iso) ? 8 : 0) | ((vTR < iso) ? 4 : 0) | ((vBR < iso) ? 2 : 0) | ((vBL < iso) ? 1 : 0);
        if (code === 0 || code === 15) continue;

        let pairs = CASE_SEGS[code];
        if (!pairs) {
          const centerAvg = (vTL + vTR + vBR + vBL) * 0.25;
          if (code === 5) {
            pairs = (centerAvg < iso) ? [[0, 1], [3, 2]] : [[0, 3], [1, 2]];
          } else {
            pairs = (centerAvg < iso) ? [[0, 3], [1, 2]] : [[0, 1], [2, 3]];
          }
        }
        for (const [e1, e2] of pairs) {
          const c1 = edgeCrossing(x, y, e1, vTL, vTR, vBR, vBL);
          const c2 = edgeCrossing(x, y, e2, vTL, vTR, vBR, vBL);
          linkKeys(c1[2], c1, c2[2], c2);
        }
      }
    }

    const visitedEdges = new Set();
    const paths = [];
    const edgeId = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

    for (const [start] of adj) {
      const startNeighbors = adj.get(start) || [];
      for (const firstNext of startNeighbors) {
        if (visitedEdges.has(edgeId(start, firstNext))) continue;

        const pts = [];
        const pStart = posByKey.get(start);
        pts.push([pStart[0] - 1, pStart[1] - 1]);

        let cur = firstNext;
        visitedEdges.add(edgeId(start, cur));

        let closed = false;
        let guard = 0;
        while (guard++ < 100000) {
          const pCur = posByKey.get(cur);
          pts.push([pCur[0] - 1, pCur[1] - 1]);
          if (cur === start) {
            closed = true;
            break;
          }
          const neigh = adj.get(cur) || [];
          let nextKey = null;
          for (const k of neigh) {
            if (!visitedEdges.has(edgeId(cur, k))) {
              nextKey = k;
              break;
            }
          }
          if (!nextKey) break;
          visitedEdges.add(edgeId(cur, nextKey));
          cur = nextKey;
        }

        if (pts.length >= 3) {
          if (closed && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 0.05) {
            pts.pop();
          }
          if (pts.length >= 3) {
            pts.closed = closed || Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 2.2;
            paths.push(pts);
          }
        }
      }
    }
    return paths;
  }

  function zhangSuenThinning(bin, w, h) {
    const cur = new Uint8Array(bin);
    const toZero = [];
    for (let iter = 0; iter < 90; iter++) {
      let changed = false;
      for (let step = 0; step < 2; step++) {
        toZero.length = 0;
        for (let y = 1; y < h - 1; y++) {
          const r = y * w;
          for (let x = 1; x < w - 1; x++) {
            const idx = r + x;
            if (cur[idx] === 0) continue;
            const p2 = cur[idx - w];
            const p3 = cur[idx - w + 1];
            const p4 = cur[idx + 1];
            const p5 = cur[idx + w + 1];
            const p6 = cur[idx + w];
            const p7 = cur[idx + w - 1];
            const p8 = cur[idx - 1];
            const p9 = cur[idx - w - 1];
            const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
            if (B < 2 || B > 6) continue;
            let A = 0;
            if (p2 === 0 && p3 === 1) A++;
            if (p3 === 0 && p4 === 1) A++;
            if (p4 === 0 && p5 === 1) A++;
            if (p5 === 0 && p6 === 1) A++;
            if (p6 === 0 && p7 === 1) A++;
            if (p7 === 0 && p8 === 1) A++;
            if (p8 === 0 && p9 === 1) A++;
            if (p9 === 0 && p2 === 1) A++;
            if (A !== 1) continue;

            if (step === 0) {
              if (p2 * p4 * p6 === 0 && p4 * p6 * p8 === 0) toZero.push(idx);
            } else {
              if (p2 * p4 * p8 === 0 && p2 * p6 * p8 === 0) toZero.push(idx);
            }
          }
        }
        if (toZero.length > 0) {
          changed = true;
          for (let i = 0; i < toZero.length; i++) cur[toZero[i]] = 0;
        }
      }
      if (!changed) break;
    }
    return cur;
  }

  function extractSkeletonPaths(skel, w, h) {
    const DIRS = [
      [1, 0], [0, 1], [-1, 0], [0, -1],
      [1, 1], [-1, 1], [-1, -1], [1, -1]
    ];
    const deg = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (!skel[idx]) continue;
        let cnt = 0;
        for (const [dx, dy] of DIRS) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h && skel[ny * w + nx]) cnt++;
        }
        deg[idx] = cnt;
      }
    }

    const visited = new Uint8Array(w * h);
    const paths = [];

    function traceFrom(sx, sy) {
      const startIdx = sy * w + sx;
      visited[startIdx] = 1;
      const pts = [[sx + 0.5, sy + 0.5]];
      let cx = sx, cy = sy;
      let guard = 0;
      while (guard++ < 50000) {
        let best = null;
        for (const [dx, dy] of DIRS) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const nIdx = ny * w + nx;
          if (skel[nIdx] && !visited[nIdx]) {
            best = [nx, ny, nIdx];
            break;
          }
        }
        if (!best) {
          pts.closed = pts.length >= 4 && Math.hypot(cx - sx, cy - sy) <= 1.5;
          break;
        }
        visited[best[2]] = 1;
        pts.push([best[0] + 0.5, best[1] + 0.5]);
        cx = best[0];
        cy = best[1];
      }
      if (pts.length >= 3) paths.push(pts);
    }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (skel[idx] && !visited[idx] && (deg[idx] === 1 || deg[idx] >= 3)) traceFrom(x, y);
      }
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (skel[idx] && !visited[idx]) traceFrom(x, y);
      }
    }
    return paths;
  }

  function kMeansQuantize(imgData, k) {
    const px = imgData.data;
    const w = imgData.width, h = imgData.height;
    const n = w * h;
    const stride = Math.max(1, Math.floor(n / 9000));
    const samples = [];
    for (let i = 0; i < n; i += stride) {
      const idx = i * 4;
      if (px[idx + 3] < 40) continue;
      samples.push([px[idx], px[idx + 1], px[idx + 2]]);
    }
    if (samples.length === 0) samples.push([0, 0, 0]);

    const numColors = clamp(Math.round(k || 3), 2, 16);
    const centroids = [samples[Math.floor(samples.length / 2)].slice()];
    while (centroids.length < numColors) {
      let bestSample = samples[0], bestDist = -1;
      for (let i = 0; i < samples.length; i += 2) {
        const s = samples[i];
        let minD = Infinity;
        for (const c of centroids) {
          const d = (s[0] - c[0]) ** 2 + (s[1] - c[1]) ** 2 + (s[2] - c[2]) ** 2;
          if (d < minD) minD = d;
        }
        if (minD > bestDist) { bestDist = minD; bestSample = s; }
      }
      centroids.push(bestSample.slice());
    }

    const sums = Array.from({ length: numColors }, () => [0, 0, 0, 0]);
    for (let iter = 0; iter < 8; iter++) {
      for (let c = 0; c < numColors; c++) sums[c].fill(0);
      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        let bestC = 0, minD = Infinity;
        for (let c = 0; c < numColors; c++) {
          const ct = centroids[c];
          const d = (s[0] - ct[0]) ** 2 + (s[1] - ct[1]) ** 2 + (s[2] - ct[2]) ** 2;
          if (d < minD) { minD = d; bestC = c; }
        }
        sums[bestC][0] += s[0];
        sums[bestC][1] += s[1];
        sums[bestC][2] += s[2];
        sums[bestC][3]++;
      }
      for (let c = 0; c < numColors; c++) {
        if (sums[c][3] > 0) {
          centroids[c][0] = sums[c][0] / sums[c][3];
          centroids[c][1] = sums[c][1] / sums[c][3];
          centroids[c][2] = sums[c][2] / sums[c][3];
        }
      }
    }

    const labels = new Int16Array(n);
    const counts = new Uint32Array(numColors);
    for (let i = 0; i < n; i++) {
      const idx = i * 4;
      if (px[idx + 3] < 40) { labels[i] = -1; continue; }
      const r = px[idx], g = px[idx + 1], b = px[idx + 2];
      let bestC = 0, minD = Infinity;
      for (let c = 0; c < numColors; c++) {
        const ct = centroids[c];
        const d = (r - ct[0]) ** 2 + (g - ct[1]) ** 2 + (b - ct[2]) ** 2;
        if (d < minD) { minD = d; bestC = c; }
      }
      labels[i] = bestC;
      counts[bestC]++;
    }

    const toHex = (r, g, b) => '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('').toUpperCase();
    const palette = centroids.map((ct, id) => {
      const lum = 0.299 * ct[0] + 0.587 * ct[1] + 0.114 * ct[2];
      return { id, rgb: ct, hex: toHex(ct[0], ct[1], ct[2]), lum, count: counts[id] };
    });

    return { labels, palette, w, h };
  }

  function extractColorLayers(quantRes, w, h, skipNearWhite) {
    const { labels, palette } = quantRes;
    const layers = [];
    const active = palette
      .filter(p => p.count > 10 && (!skipNearWhite || p.lum < 240))
      .sort((a, b) => b.count - a.count);

    for (let li = 0; li < active.length; li++) {
      const entry = active[li];
      const field = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) {
        field[i] = (labels[i] === entry.id) ? 0 : 255;
      }
      const smoothed = separableBlur(field, w, h, 1);
      const rawPaths = subpixelContours(smoothed, w, h, 128, true);
      if (rawPaths.length > 0) {
        rawPaths.colorData = entry.hex;
        rawPaths.colorName = `Color ${li + 1} (${entry.hex})`;
        layers.push(rawPaths);
      }
    }
    return layers;
  }

  function halftoneField(lum, w, h, cellSize, hexStagger) {
    const paths = [];
    const step = Math.max(4, cellSize || 10);
    const rowStep = hexStagger ? step * 0.866 : step;
    let row = 0;
    for (let cy = 0; cy < h; cy += rowStep, row++) {
      const xOff = (hexStagger && (row % 2 === 1)) ? step * 0.5 : 0;
      for (let cx = xOff; cx < w; cx += step) {
        let sum = 0, cnt = 0;
        const yEnd = Math.min(h, Math.round(cy + step));
        const xEnd = Math.min(w, Math.round(cx + step));
        for (let py = Math.max(0, Math.round(cy)); py < yEnd; py++) {
          for (let px = Math.max(0, Math.round(cx)); px < xEnd; px++) {
            sum += lum[py * w + px];
            cnt++;
          }
        }
        if (cnt === 0) continue;
        const brightness = (sum / cnt) / 255;
        const r = (1 - brightness) * step * 0.48;
        if (r > 0.65) {
          const pts = [];
          const steps = clamp(Math.round(r * 3), 8, 20);
          const ccx = clamp(cx + step * 0.5, r, w - r);
          const ccy = clamp(cy + step * 0.5, r, h - r);
          for (let i = 0; i < steps; i++) {
            const a = (i / steps) * Math.PI * 2;
            pts.push([ccx + Math.cos(a) * r, ccy + Math.sin(a) * r]);
          }
          pts.closed = true;
          paths.push(pts);
        }
      }
    }
    return paths;
  }

  function parseSVG(svgText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');
    if (!svgEl) throw new Error('Invalid SVG document');

    let vbX = 0, vbY = 0, w = 400, h = 400;
    const vb = svgEl.getAttribute('viewBox');
    if (vb) {
      const nums = vb.trim().split(/[\s,]+/).map(Number);
      if (nums.length >= 4 && nums.every(Number.isFinite)) [vbX, vbY, w, h] = nums;
    } else {
      const aw = parseFloat(svgEl.getAttribute('width'));
      const ah = parseFloat(svgEl.getAttribute('height'));
      if (Number.isFinite(aw) && aw > 0) w = aw;
      if (Number.isFinite(ah) && ah > 0) h = ah;
    }

    function mulMat(m1, m2) {
      return [
        m1[0] * m2[0] + m1[2] * m2[1],
        m1[1] * m2[0] + m1[3] * m2[1],
        m1[0] * m2[2] + m1[2] * m2[3],
        m1[1] * m2[2] + m1[3] * m2[3],
        m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
        m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
      ];
    }

    function parseTransform(str) {
      let m = [1, 0, 0, 1, 0, 0];
      if (!str) return m;
      const cmds = str.match(/[a-z]+\([^)]*\)/gi) || [];
      for (const c of cmds) {
        const fn = c.slice(0, c.indexOf('(')).toLowerCase();
        const a = c.slice(c.indexOf('(') + 1, -1).trim().split(/[\s,]+/).map(Number);
        let cur = [1, 0, 0, 1, 0, 0];
        if (fn === 'translate') cur = [1, 0, 0, 1, a[0] || 0, a[1] || 0];
        else if (fn === 'scale') cur = [a[0] ?? 1, 0, 0, a[1] ?? a[0] ?? 1, 0, 0];
        else if (fn === 'rotate') {
          const rad = (a[0] || 0) * Math.PI / 180, cos = Math.cos(rad), sin = Math.sin(rad);
          const cx = a[1] || 0, cy = a[2] || 0;
          cur = [cos, sin, -sin, cos, cx - cos * cx + sin * cy, cy - sin * cx - cos * cy];
        } else if (fn === 'matrix' && a.length >= 6) cur = a.slice(0, 6);
        m = mulMat(m, cur);
      }
      return m;
    }

    function applyMat(m, x, y) {
      return [m[0] * x + m[2] * y + m[4] - vbX, m[1] * x + m[3] * y + m[5] - vbY];
    }

    function sampleCubic(p0, p1, p2, p3, out, steps = 14) {
      for (let i = 1; i <= steps; i++) {
        const t = i / steps, mt = 1 - t;
        out.push([
          mt * mt * mt * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t * t * t * p3[0],
          mt * mt * mt * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t * t * t * p3[1]
        ]);
      }
    }

    function sampleQuad(p0, p1, p2, out, steps = 10) {
      for (let i = 1; i <= steps; i++) {
        const t = i / steps, mt = 1 - t;
        out.push([
          mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0],
          mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1]
        ]);
      }
    }

    function sampleArc(x1, y1, rx, ry, phiDeg, largeArc, sweep, x2, y2, out) {
      if (rx === 0 || ry === 0) { out.push([x2, y2]); return; }
      const phi = phiDeg * Math.PI / 180, cosP = Math.cos(phi), sinP = Math.sin(phi);
      const dx2 = (x1 - x2) / 2, dy2 = (y1 - y2) / 2;
      const x1p = cosP * dx2 + sinP * dy2, y1p = -sinP * dx2 + cosP * dy2;
      rx = Math.abs(rx); ry = Math.abs(ry);
      const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
      if (lambda > 1) { const s = Math.sqrt(lambda); rx *= s; ry *= s; }
      const rx2 = rx * rx, ry2 = ry * ry, x1p2 = x1p * x1p, y1p2 = y1p * y1p;
      const num = Math.max(0, rx2 * ry2 - rx2 * y1p2 - ry2 * x1p2);
      const den = rx2 * y1p2 + ry2 * x1p2 || 1e-6;
      const coef = (largeArc === sweep ? -1 : 1) * Math.sqrt(num / den);
      const cxp = coef * ((rx * y1p) / ry), cyp = coef * (-(ry * x1p) / rx);
      const cx = cosP * cxp - sinP * cyp + (x1 + x2) / 2;
      const cy = sinP * cxp + cosP * cyp + (y1 + y2) / 2;
      const ang = (ux, uy, vx, vy) => {
        const dot = ux * vx + uy * vy, len = Math.hypot(ux, uy) * Math.hypot(vx, vy) || 1;
        let a = Math.acos(clamp(dot / len, -1, 1));
        if (ux * vy - uy * vx < 0) a = -a;
        return a;
      };
      const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
      let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
      if (!sweep && dt > 0) dt -= Math.PI * 2;
      if (sweep && dt < 0) dt += Math.PI * 2;
      const steps = Math.max(8, Math.ceil(Math.abs(dt) / (Math.PI / 16)));
      for (let i = 1; i <= steps; i++) {
        const th = t1 + (dt * i) / steps;
        const px = rx * Math.cos(th), py = ry * Math.sin(th);
        out.push([cosP * px - sinP * py + cx, sinP * px + cosP * py + cy]);
      }
    }

    function parsePathD(d, m) {
      const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) || [];
      let idx = 0, cmd = '', cx = 0, cy = 0, sx = 0, sy = 0, lastCp = null, lastCmd = '';
      const subPaths = [];
      let cur = [];

      const flush = (closed) => {
        if (cur.length >= 2) {
          const transformed = cur.map(pt => applyMat(m, pt[0], pt[1]));
          transformed.closed = closed;
          subPaths.push(transformed);
        }
        cur = [];
      };
      const nextNum = () => parseFloat(tokens[idx++]);
      const isNum = () => idx < tokens.length && !/^[a-zA-Z]$/.test(tokens[idx]);

      while (idx < tokens.length) {
        if (/^[a-zA-Z]$/.test(tokens[idx])) cmd = tokens[idx++];
        else if (cmd === 'M') cmd = 'L';
        else if (cmd === 'm') cmd = 'l';

        if (cmd === 'Z' || cmd === 'z') {
          flush(true);
          cx = sx; cy = sy; lastCp = null; lastCmd = cmd;
          continue;
        }
        if (!isNum()) break;
        const rel = cmd === cmd.toLowerCase();
        const U = cmd.toUpperCase();

        if (U === 'M') {
          if (cur.length) flush(false);
          const x = nextNum() + (rel ? cx : 0), y = nextNum() + (rel ? cy : 0);
          cx = x; cy = y; sx = x; sy = y;
          cur.push([cx, cy]);
          lastCmd = cmd; cmd = rel ? 'l' : 'L';
        } else if (U === 'L') {
          while (isNum()) {
            cx = nextNum() + (rel ? cx : 0); cy = nextNum() + (rel ? cy : 0);
            cur.push([cx, cy]);
          }
          lastCmd = cmd;
        } else if (U === 'H') {
          while (isNum()) { cx = nextNum() + (rel ? cx : 0); cur.push([cx, cy]); }
          lastCmd = cmd;
        } else if (U === 'V') {
          while (isNum()) { cy = nextNum() + (rel ? cy : 0); cur.push([cx, cy]); }
          lastCmd = cmd;
        } else if (U === 'C') {
          while (isNum()) {
            const x1 = nextNum() + (rel ? cx : 0), y1 = nextNum() + (rel ? cy : 0);
            const x2 = nextNum() + (rel ? cx : 0), y2 = nextNum() + (rel ? cy : 0);
            const x = nextNum() + (rel ? cx : 0), y = nextNum() + (rel ? cy : 0);
            sampleCubic([cx, cy], [x1, y1], [x2, y2], [x, y], cur);
            lastCp = [x2, y2]; cx = x; cy = y;
          }
          lastCmd = cmd;
        } else if (U === 'S') {
          while (isNum()) {
            const c1 = (lastCmd.toUpperCase() === 'C' || lastCmd.toUpperCase() === 'S') && lastCp
              ? [2 * cx - lastCp[0], 2 * cy - lastCp[1]] : [cx, cy];
            const x2 = nextNum() + (rel ? cx : 0), y2 = nextNum() + (rel ? cy : 0);
            const x = nextNum() + (rel ? cx : 0), y = nextNum() + (rel ? cy : 0);
            sampleCubic([cx, cy], c1, [x2, y2], [x, y], cur);
            lastCp = [x2, y2]; cx = x; cy = y;
          }
          lastCmd = cmd;
        } else if (U === 'Q') {
          while (isNum()) {
            const x1 = nextNum() + (rel ? cx : 0), y1 = nextNum() + (rel ? cy : 0);
            const x = nextNum() + (rel ? cx : 0), y = nextNum() + (rel ? cy : 0);
            sampleQuad([cx, cy], [x1, y1], [x, y], cur);
            lastCp = [x1, y1]; cx = x; cy = y;
          }
          lastCmd = cmd;
        } else if (U === 'T') {
          while (isNum()) {
            const c1 = (lastCmd.toUpperCase() === 'Q' || lastCmd.toUpperCase() === 'T') && lastCp
              ? [2 * cx - lastCp[0], 2 * cy - lastCp[1]] : [cx, cy];
            const x = nextNum() + (rel ? cx : 0), y = nextNum() + (rel ? cy : 0);
            sampleQuad([cx, cy], c1, [x, y], cur);
            lastCp = c1; cx = x; cy = y;
          }
          lastCmd = cmd;
        } else if (U === 'A') {
          while (isNum()) {
            const rx = nextNum(), ry = nextNum(), phi = nextNum(), la = nextNum(), sw = nextNum();
            const x = nextNum() + (rel ? cx : 0), y = nextNum() + (rel ? cy : 0);
            sampleArc(cx, cy, rx, ry, phi, la, sw, x, y, cur);
            cx = x; cy = y;
          }
          lastCmd = cmd;
        } else {
          idx++;
        }
      }
      if (cur.length) flush(Math.hypot(cx - sx, cy - sy) < 0.5);
      return subPaths;
    }

    const collected = [];
    function walk(el, parentMat) {
      if (!el || el.nodeType !== 1) return;
      const tag = el.tagName.toLowerCase();
      if (tag === 'defs' || tag === 'clippath' || tag === 'mask' || tag === 'title' || tag === 'desc') return;
      const mat = mulMat(parentMat, parseTransform(el.getAttribute('transform')));

      if (tag === 'path') {
        const d = el.getAttribute('d');
        if (d) parsePathD(d, mat).forEach(p => collected.push(p));
      } else if (tag === 'rect') {
        const x = parseFloat(el.getAttribute('x')) || 0;
        const y = parseFloat(el.getAttribute('y')) || 0;
        const rw = parseFloat(el.getAttribute('width')) || 0;
        const rh = parseFloat(el.getAttribute('height')) || 0;
        if (rw > 0 && rh > 0) {
          const pts = [[x, y], [x + rw, y], [x + rw, y + rh], [x, y + rh]].map(p => applyMat(mat, p[0], p[1]));
          pts.closed = true;
          collected.push(pts);
        }
      } else if (tag === 'circle' || tag === 'ellipse') {
        const cx = parseFloat(el.getAttribute('cx')) || 0;
        const cy = parseFloat(el.getAttribute('cy')) || 0;
        const rx = tag === 'circle' ? (parseFloat(el.getAttribute('r')) || 0) : (parseFloat(el.getAttribute('rx')) || 0);
        const ry = tag === 'circle' ? rx : (parseFloat(el.getAttribute('ry')) || 0);
        if (rx > 0 && ry > 0) {
          const steps = 48, pts = [];
          for (let i = 0; i < steps; i++) {
            const a = (i / steps) * Math.PI * 2;
            pts.push(applyMat(mat, cx + Math.cos(a) * rx, cy + Math.sin(a) * ry));
          }
          pts.closed = true;
          collected.push(pts);
        }
      } else if (tag === 'polygon' || tag === 'polyline') {
        const raw = (el.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number);
        const pts = [];
        for (let i = 0; i + 1 < raw.length; i += 2) {
          if (Number.isFinite(raw[i]) && Number.isFinite(raw[i + 1])) pts.push(applyMat(mat, raw[i], raw[i + 1]));
        }
        if (pts.length >= 2) {
          pts.closed = tag === 'polygon';
          collected.push(pts);
        }
      } else if (tag === 'line') {
        const p1 = applyMat(mat, parseFloat(el.getAttribute('x1')) || 0, parseFloat(el.getAttribute('y1')) || 0);
        const p2 = applyMat(mat, parseFloat(el.getAttribute('x2')) || 0, parseFloat(el.getAttribute('y2')) || 0);
        const pts = [p1, p2];
        pts.closed = false;
        collected.push(pts);
      }

      for (const ch of el.children) walk(ch, mat);
    }
    walk(svgEl, [1, 0, 0, 1, 0, 0]);
    return { paths: collected, w, h };
  }

  function pointInPoly(pt, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1];
      const xj = poly[j][0], yj = poly[j][1];
      if (((yi > pt[1]) !== (yj > pt[1])) && (pt[0] < (xj - xi) * (pt[1] - yi) / ((yj - yi) || 1e-9) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  function polyBBox(pts) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of pts) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    return { minX, minY, maxX, maxY, area: Math.abs((maxX - minX) * (maxY - minY)) };
  }

  function analyzeNesting(paths) {
    const boxes = paths.map(p => p.length >= 3 && p.closed !== false ? polyBBox(p) : null);
    const depths = new Int32Array(paths.length);
    for (let i = 0; i < paths.length; i++) {
      if (!boxes[i]) { depths[i] = 0; continue; }
      const testPt = paths[i][0];
      let d = 0;
      for (let j = 0; j < paths.length; j++) {
        if (i === j || !boxes[j] || boxes[j].area <= boxes[i].area) continue;
        const b = boxes[j];
        if (testPt[0] < b.minX || testPt[0] > b.maxX || testPt[1] < b.minY || testPt[1] > b.maxY) continue;
        if (pointInPoly(testPt, paths[j])) d++;
      }
      depths[i] = d;
    }
    return depths;
  }

  function signedArea(pts) {
    let a = 0;
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
      a += x1 * y2 - x2 * y1;
    }
    return a * 0.5;
  }

  function offsetClosedPolygon(pts, offsetDist) {
    if (!pts || pts.length < 3 || Math.abs(offsetDist) < 1e-4) return pts;
    const isCW = signedArea(pts) > 0;
    const sign = isCW ? 1 : -1;
    const out = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const prev = pts[(i - 1 + n) % n];
      const cur = pts[i];
      const next = pts[(i + 1) % n];
      let dx1 = cur[0] - prev[0], dy1 = cur[1] - prev[1];
      let dx2 = next[0] - cur[0], dy2 = next[1] - cur[1];
      const l1 = Math.hypot(dx1, dy1) || 1;
      const l2 = Math.hypot(dx2, dy2) || 1;
      dx1 /= l1; dy1 /= l1; dx2 /= l2; dy2 /= l2;

      const n1x = sign * dy1, n1y = -sign * dx1;
      const n2x = sign * dy2, n2y = -sign * dx2;
      let mx = n1x + n2x, my = n1y + n2y;
      const ml = Math.hypot(mx, my);
      if (ml < 1e-4) {
        out.push([cur[0] + n1x * offsetDist, cur[1] + n1y * offsetDist]);
      } else {
        mx /= ml; my /= ml;
        const dot = Math.max(0.35, mx * n1x + my * n1y);
        const miter = clamp(offsetDist / dot, -Math.abs(offsetDist) * 2.5, Math.abs(offsetDist) * 2.5);
        out.push([cur[0] + mx * miter, cur[1] + my * miter]);
      }
    }
    out.closed = true;
    return out;
  }

  function optimizeToolpaths(paths, kerfPx = 0) {
    if (!paths || paths.length === 0) return { ordered: [], originalTravel: 0, optimizedTravel: 0 };

    const depths = analyzeNesting(paths);
    const prepared = paths.map((p, i) => {
      const depth = depths[i];
      const isClosed = p.closed !== false && p.length >= 3;
      let pts = p;
      if (isClosed && Math.abs(kerfPx) > 1e-3) {
        const isHole = (depth % 2) === 1;
        pts = offsetClosedPolygon(p, isHole ? -kerfPx : kerfPx);
      }
      return { pts, depth, isClosed };
    });

    let originalTravel = 0;
    for (let i = 1; i < prepared.length; i++) {
      const prev = prepared[i - 1].pts;
      const cur = prepared[i].pts;
      if (prev.length && cur.length) {
        const a = prepared[i - 1].isClosed ? prev[0] : prev[prev.length - 1];
        originalTravel += Math.hypot(cur[0][0] - a[0], cur[0][1] - a[1]);
      }
    }

    const maxDepth = depths.reduce((m, d) => Math.max(m, d), 0);
    const ordered = [];
    let curX = 0, curY = 0;
    let optimizedTravel = 0;

    for (let d = maxDepth; d >= 0; d--) {
      const pool = prepared.filter(item => item.depth === d && item.pts.length >= 2);
      while (pool.length > 0) {
        let bestIdx = 0, bestDist = Infinity, flipOpen = false;
        for (let i = 0; i < pool.length; i++) {
          const item = pool[i];
          const p0 = item.pts[0];
          const d0 = Math.hypot(p0[0] - curX, p0[1] - curY);
          if (d0 < bestDist) { bestDist = d0; bestIdx = i; flipOpen = false; }
          if (!item.isClosed) {
            const pEnd = item.pts[item.pts.length - 1];
            const dEnd = Math.hypot(pEnd[0] - curX, pEnd[1] - curY);
            if (dEnd < bestDist) { bestDist = dEnd; bestIdx = i; flipOpen = true; }
          }
        }
        const chosen = pool.splice(bestIdx, 1)[0];
        const pts = flipOpen ? chosen.pts.slice().reverse() : chosen.pts.slice();
        pts.closed = chosen.isClosed;
        pts.isHole = (chosen.depth % 2) === 1;
        pts.depth = chosen.depth;
        optimizedTravel += bestDist;
        ordered.push(pts);
        const endPt = chosen.isClosed ? pts[0] : pts[pts.length - 1];
        curX = endPt[0]; curY = endPt[1];
      }
    }

    return { ordered, originalTravel, optimizedTravel };
  }

  function pathToSvgD(pathArray, smooth, scaleX = 1, scaleY = 1) {
    let d = '';
    const COS_CORNER = Math.cos((42 * Math.PI) / 180);
    for (const path of pathArray) {
      if (!path || path.length < 2) continue;
      const n = path.length;
      const isClosed = path.closed !== false && n >= 3;
      const pts = path.map(p => [p[0] * scaleX, p[1] * scaleY]);

      d += `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
      if (!smooth || n < 4) {
        for (let i = 1; i < n; i++) d += `L${pts[i][0].toFixed(2)},${pts[i][1].toFixed(2)}`;
      } else {
        const isCorner = new Uint8Array(n);
        for (let i = 0; i < n; i++) {
          if (!isClosed && (i === 0 || i === n - 1)) { isCorner[i] = 1; continue; }
          const pPrev = pts[(i - 1 + n) % n];
          const pCur = pts[i];
          const pNext = pts[(i + 1) % n];
          const v1x = pCur[0] - pPrev[0], v1y = pCur[1] - pPrev[1];
          const v2x = pNext[0] - pCur[0], v2y = pNext[1] - pCur[1];
          const l1 = Math.hypot(v1x, v1y), l2 = Math.hypot(v2x, v2y);
          if (l1 < 1e-4 || l2 < 1e-4 || ((v1x * v2x + v1y * v2y) / (l1 * l2)) < COS_CORNER) isCorner[i] = 1;
        }
        const segEnd = isClosed ? n : n - 1;
        for (let i = 0; i < segEnd; i++) {
          const i1 = i, i2 = (i + 1) % n;
          const p1 = pts[i1], p2 = pts[i2];
          if (isCorner[i1] && isCorner[i2]) {
            d += `L${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
          } else {
            const p0 = pts[(i1 - 1 + n) % n], p3 = pts[(i2 + 1) % n];
            const t1 = isCorner[i1] ? [0, 0] : [(p2[0] - p0[0]) * 0.18, (p2[1] - p0[1]) * 0.18];
            const t2 = isCorner[i2] ? [0, 0] : [(p3[0] - p1[0]) * 0.18, (p3[1] - p1[1]) * 0.18];
            d += `C${(p1[0] + t1[0]).toFixed(2)},${(p1[1] + t1[1]).toFixed(2)} ${(p2[0] - t2[0]).toFixed(2)},${(p2[1] - t2[1]).toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
          }
        }
      }
      if (isClosed) d += 'Z';
    }
    return d;
  }

  function drawPathsOnCtx(ctx, pathArray, smooth, fillColor = '#111111', strokeColor = '#111111', forceStroke = false) {
    if (!ctx || !pathArray || !pathArray.length) return;
    const COS_CORNER = Math.cos((42 * Math.PI) / 180);

    const traceBatch = (batch, closeLoops) => {
      if (!batch.length) return;
      ctx.beginPath();
      for (const path of batch) {
        if (!path || path.length < 2) continue;
        const n = path.length;
        ctx.moveTo(path[0][0], path[0][1]);
        if (!smooth || n < 4) {
          for (let i = 1; i < n; i++) ctx.lineTo(path[i][0], path[i][1]);
        } else {
          const isCorner = new Uint8Array(n);
          for (let i = 0; i < n; i++) {
            if (!closeLoops && (i === 0 || i === n - 1)) { isCorner[i] = 1; continue; }
            const pPrev = path[(i - 1 + n) % n], pCur = path[i], pNext = path[(i + 1) % n];
            const v1x = pCur[0] - pPrev[0], v1y = pCur[1] - pPrev[1];
            const v2x = pNext[0] - pCur[0], v2y = pNext[1] - pCur[1];
            const l1 = Math.hypot(v1x, v1y), l2 = Math.hypot(v2x, v2y);
            if (l1 < 1e-4 || l2 < 1e-4 || ((v1x * v2x + v1y * v2y) / (l1 * l2)) < COS_CORNER) isCorner[i] = 1;
          }
          const segEnd = closeLoops ? n : n - 1;
          for (let i = 0; i < segEnd; i++) {
            const i1 = i, i2 = (i + 1) % n;
            const p1 = path[i1], p2 = path[i2];
            if (isCorner[i1] && isCorner[i2]) {
              ctx.lineTo(p2[0], p2[1]);
            } else {
              const p0 = path[(i1 - 1 + n) % n], p3 = path[(i2 + 1) % n];
              const t1 = isCorner[i1] ? [0, 0] : [(p2[0] - p0[0]) * 0.18, (p2[1] - p0[1]) * 0.18];
              const t2 = isCorner[i2] ? [0, 0] : [(p3[0] - p1[0]) * 0.18, (p3[1] - p1[1]) * 0.18];
              ctx.bezierCurveTo(p1[0] + t1[0], p1[1] + t1[1], p2[0] - t2[0], p2[1] - t2[1], p2[0], p2[1]);
            }
          }
        }
        if (closeLoops) ctx.closePath();
      }
    };

    const closedBatch = forceStroke ? [] : pathArray.filter(p => p && p.length >= 3 && p.closed !== false);
    const openBatch = forceStroke ? pathArray : pathArray.filter(p => p && (p.length < 3 || p.closed === false));

    if (closedBatch.length) {
      ctx.save();
      traceBatch(closedBatch, true);
      ctx.fillStyle = fillColor || '#111111';
      ctx.fill('evenodd');
      ctx.strokeStyle = strokeColor || fillColor || '#111111';
      ctx.lineWidth = 0.6;
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();
    }

    if (openBatch.length) {
      ctx.save();
      traceBatch(openBatch, false);
      ctx.strokeStyle = strokeColor || fillColor || '#111111';
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();
    }
  }

  function cleanShapePoints(poly, sx, sy, srcH) {
    const out = [];
    for (const pt of poly) {
      const x = pt[0] * sx;
      const y = (srcH - pt[1]) * sy;
      if (out.length === 0 || Math.hypot(x - out[out.length - 1][0], y - out[out.length - 1][1]) > 1e-3) {
        out.push([x, y]);
      }
    }
    if (out.length >= 3 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) < 1e-3) {
      out.pop();
    }
    return out;
  }

  function build3DMeshGroup(pathsOrLayers, srcW, srcH, targetWmm, targetHmm, depthMm = 6, addBacking = false, isColorMode = false) {
    const T = global.THREE;
    if (!T) throw new Error('Three.js is required for 3D extrusion.');
    const sx = (targetWmm || srcW * 0.264583) / Math.max(1, srcW);
    const sy = (targetHmm || srcH * 0.264583) / Math.max(1, srcH);

    const group = new T.Group();
    group.name = 'VectorCNC_3D_Model';

    const layerList = isColorMode
      ? pathsOrLayers.map(l => ({ hex: l.colorData || '#38bdf8', paths: l }))
      : [{ hex: '#38bdf8', paths: pathsOrLayers }];

    layerList.forEach((layer, li) => {
      const closedPolys = layer.paths.filter(p => p && p.length >= 3 && p.closed !== false);
      if (closedPolys.length === 0) return;

      const depths = analyzeNesting(closedPolys);
      const outers = [];
      const holes = [];
      for (let i = 0; i < closedPolys.length; i++) {
        if (depths[i] % 2 === 0) outers.push({ idx: i, poly: closedPolys[i], box: polyBBox(closedPolys[i]) });
        else holes.push({ idx: i, poly: closedPolys[i], box: polyBBox(closedPolys[i]) });
      }

      const shapes = [];
      for (const o of outers) {
        const outerPts = cleanShapePoints(o.poly, sx, sy, srcH);
        if (outerPts.length < 3) continue;
        const shape = new T.Shape();
        outerPts.forEach(([x, y], k) => {
          if (k === 0) shape.moveTo(x, y);
          else shape.lineTo(x, y);
        });
        shape.closePath();

        for (const hObj of holes) {
          const tPt = hObj.poly[0];
          if (tPt[0] >= o.box.minX && tPt[0] <= o.box.maxX && tPt[1] >= o.box.minY && tPt[1] <= o.box.maxY && pointInPoly(tPt, o.poly)) {
            const holePts = cleanShapePoints(hObj.poly, sx, sy, srcH);
            if (holePts.length < 3) continue;
            const hp = new T.Path();
            holePts.forEach(([x, y], k) => {
              if (k === 0) hp.moveTo(x, y);
              else hp.lineTo(x, y);
            });
            hp.closePath();
            shape.holes.push(hp);
          }
        }
        shapes.push(shape);
      }

      if (shapes.length > 0) {
        const layerDepth = Math.max(0.8, depthMm - li * 0.25);
        const extrudeGeo = new T.ExtrudeGeometry(shapes, {
          depth: layerDepth,
          bevelEnabled: true,
          bevelThickness: Math.min(0.5, layerDepth * 0.08),
          bevelSize: Math.min(0.35, layerDepth * 0.05),
          bevelSegments: 2,
          curveSegments: 6
        });
        extrudeGeo.rotateX(-Math.PI / 2);
        const mat = new T.MeshStandardMaterial({
          color: new T.Color(layer.hex),
          roughness: 0.35,
          metalness: 0.25
        });
        const mesh = new T.Mesh(extrudeGeo, mat);
        mesh.name = `Layer_${li + 1}`;
        group.add(mesh);
      }
    });

    if (addBacking) {
      const pw = Math.max(10, targetWmm || srcW * 0.264583);
      const ph = Math.max(10, targetHmm || srcH * 0.264583);
      const backGeo = new T.BoxGeometry(pw * 1.04, 2.0, ph * 1.04);
      backGeo.translate(pw / 2, -1.0, -ph / 2);
      const backMat = new T.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7, metalness: 0.15 });
      const backMesh = new T.Mesh(backGeo, backMat);
      backMesh.name = 'Backing_Plate';
      group.add(backMesh);
    }

    group.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(group);
    if (!box.isEmpty()) {
      const cen = new T.Vector3();
      box.getCenter(cen);
      group.position.set(-cen.x, -box.min.y, -cen.z);
      group.updateMatrixWorld(true);
    }

    return group;
  }

  global.VectorEngine = {
    luminanceField,
    separableBlur,
    computeOtsuThreshold,
    sobelField,
    thresholdBinary,
    despeckleBinary,
    subpixelContours,
    zhangSuenThinning,
    extractSkeletonPaths,
    kMeansQuantize,
    extractColorLayers,
    halftoneField,
    parseSVG,
    analyzeNesting,
    offsetClosedPolygon,
    optimizeToolpaths,
    pathToSvgD,
    drawPathsOnCtx,
    build3DMeshGroup
  };
})(window);
