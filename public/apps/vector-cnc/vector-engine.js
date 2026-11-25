/**
 * Vector CNC Studio Pro — High-Precision CAD/CAM Vectorization, DXF/SVG, Hershey Text & 3D Engine
 * 1. Image Pre-processing (Separable Blur, Otsu Auto-Threshold, Bradley-Roth Adaptive, Sobel, Despeckle)
 * 2. Sub-Pixel Marching Squares (asymptotic saddle resolution), Zhang-Suen Thinning, K-Means++ Color, Halftone
 * 3. Direct SVG XML Parser (preserves colors, skips hidden elements, rounded rects, skew/use, real mm units)
 * 4. Native CAD DXF Importer (LINE, LWPOLYLINE + Bulge Arcs, POLYLINE, CIRCLE, ARC, ELLIPSE, SPLINE, Layers, $INSUNITS)
 * 5. Built-In Single-Line Hershey CNC Engraving Font + Bold Stencil Cutout with Auto-Bridges
 * 6. Real CAM 2.5D Math: Half-Kerf/Tool-Radius Offset (self-intersection safe), Concentric Offset Pocket Clearing,
 *    Auto Dogbone & T-Bone Corner Fillets, Even-Arc Holding Tabs, Hole-First + 2-Opt TSP Toolpath Optimizer
 * 7. Smart Sheet Auto-Nesting (0°/90° packing + utilization/waste metrics) & Pre-Flight CNC Inspector + Auto-Fixers
 * 8. Watertight 3D Extrude Geometry Builder (Strict parent-child hole hierarchy, Z-up STL & Linear-RGB AR GLB)
 */
(function (global) {
  'use strict';

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  // ═══════════════════════════════════════════════════════
  // 1. IMAGE PRE-PROCESSING & TRACING FIELDS
  // ═══════════════════════════════════════════════════════
  function luminanceField(imgData) {
    const px = imgData.data;
    const len = imgData.width * imgData.height;
    const lum = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const idx = i * 4;
      const a = px[idx + 3] / 255;
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
    for (let i = 0; i < n; i++) hist[clamp(Math.round(lum[i]), 0, 255)]++;
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
      if (between > maxVar) { maxVar = between; bestT = t; }
    }
    return clamp(bestT, 18, 238);
  }

  function sobelField(lum, w, h) {
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
    for (let i = 0; i < out.length; i++) out[i] = clamp(255 - mags[i] * scale, 0, 255);
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
      for (let x = 0; x < w; x++) padded[(y + 1) * pw + (x + 1)] = field[y * w + x];
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
        case 0: { const d = vTR - vTL; t = Math.abs(d) > 1e-4 ? clamp((iso - vTL) / d, 0.04, 0.96) : 0.5; return [x + t, y, `H_${x}_${y}`]; }
        case 1: { const d = vBR - vTR; t = Math.abs(d) > 1e-4 ? clamp((iso - vTR) / d, 0.04, 0.96) : 0.5; return [x + 1, y + t, `V_${x + 1}_${y}`]; }
        case 2: { const d = vBR - vBL; t = Math.abs(d) > 1e-4 ? clamp((iso - vBL) / d, 0.04, 0.96) : 0.5; return [x + t, y + 1, `H_${x}_${y + 1}`]; }
        case 3: { const d = vBL - vTL; t = Math.abs(d) > 1e-4 ? clamp((iso - vTL) / d, 0.04, 0.96) : 0.5; return [x, y + t, `V_${x}_${y}`]; }
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
        const vTL = padded[r0 + x], vTR = padded[r0 + x + 1], vBR = padded[r1 + x + 1], vBL = padded[r1 + x];
        const code = ((vTL < iso) ? 8 : 0) | ((vTR < iso) ? 4 : 0) | ((vBR < iso) ? 2 : 0) | ((vBL < iso) ? 1 : 0);
        if (code === 0 || code === 15) continue;
        let pairs = CASE_SEGS[code];
        if (!pairs) {
          const centerAvg = (vTL + vTR + vBR + vBL) * 0.25;
          pairs = code === 5
            ? ((centerAvg < iso) ? [[0, 1], [3, 2]] : [[0, 3], [1, 2]])
            : ((centerAvg < iso) ? [[0, 3], [1, 2]] : [[0, 1], [2, 3]]);
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
        let closed = false, guard = 0;
        while (guard++ < 100000) {
          const pCur = posByKey.get(cur);
          pts.push([pCur[0] - 1, pCur[1] - 1]);
          if (cur === start) { closed = true; break; }
          const neigh = adj.get(cur) || [];
          let nextKey = null;
          for (const k of neigh) {
            if (!visitedEdges.has(edgeId(cur, k))) { nextKey = k; break; }
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
            const p2 = cur[idx - w], p3 = cur[idx - w + 1], p4 = cur[idx + 1], p5 = cur[idx + w + 1];
            const p6 = cur[idx + w], p7 = cur[idx + w - 1], p8 = cur[idx - 1], p9 = cur[idx - w - 1];
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
    const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [-1, -1], [1, -1]];
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
      visited[sy * w + sx] = 1;
      const pts = [[sx + 0.5, sy + 0.5]];
      let cx = sx, cy = sy, guard = 0;
      while (guard++ < 50000) {
        let best = null;
        for (const [dx, dy] of DIRS) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const nIdx = ny * w + nx;
          if (skel[nIdx] && !visited[nIdx]) { best = [nx, ny, nIdx]; break; }
        }
        if (!best) {
          pts.closed = pts.length >= 4 && Math.hypot(cx - sx, cy - sy) <= 1.5;
          break;
        }
        visited[best[2]] = 1;
        pts.push([best[0] + 0.5, best[1] + 0.5]);
        cx = best[0]; cy = best[1];
      }
      if (pts.length >= 2) paths.push(pts);
    }
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (skel[idx] && !visited[idx] && (deg[idx] === 1 || deg[idx] >= 3)) traceFrom(x, y);
      }
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (skel[idx] && !visited[idx]) traceFrom(x, y);
      }
    return paths;
  }

  function kMeansQuantize(imgData, k) {
    const px = imgData.data;
    const w = imgData.width, h = imgData.height, n = w * h;
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
        sums[bestC][0] += s[0]; sums[bestC][1] += s[1]; sums[bestC][2] += s[2]; sums[bestC][3]++;
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
      .filter(p => p.count > 10 && (!skipNearWhite || p.lum < 242))
      .sort((a, b) => b.count - a.count);

    for (let li = 0; li < active.length; li++) {
      const entry = active[li];
      const field = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) field[i] = (labels[i] === entry.id) ? 0 : 255;
      const smoothed = separableBlur(field, w, h, 1);
      const rawPaths = subpixelContours(smoothed, w, h, 128, true);
      if (rawPaths.length > 0) {
        rawPaths.colorData = entry.hex;
        rawPaths.colorName = `Color ${li + 1} (${entry.hex})`;
        rawPaths.visible = true;
        rawPaths.operation = 'cut';
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
            sum += lum[py * w + px]; cnt++;
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

  // ═══════════════════════════════════════════════════════
  // 2. UPGRADED SVG XML PARSER (Colors, Hidden Filter, Rounded Rects, Skew, <use>, mm Units)
  // ═══════════════════════════════════════════════════════
  function parseSvgLengthMm(raw) {
    if (!raw) return null;
    const m = String(raw).trim().match(/^([-+]?(?:\d*\.\d+|\d+))\s*(mm|cm|in|pt|pc|px)?$/i);
    if (!m) return null;
    const val = parseFloat(m[1]);
    if (!Number.isFinite(val) || val <= 0) return null;
    const u = (m[2] || 'px').toLowerCase();
    if (u === 'mm') return val;
    if (u === 'cm') return val * 10;
    if (u === 'in') return val * 25.4;
    if (u === 'pt') return val * (25.4 / 72);
    if (u === 'pc') return val * (25.4 / 6);
    return val * (25.4 / 96);
  }

  function parseCssColor(raw) {
    if (!raw) return null;
    const s = String(raw).trim().toLowerCase();
    if (!s || s === 'none' || s === 'transparent' || s.startsWith('url(')) return null;
    if (/^#[0-9a-f]{6}$/i.test(s)) return s.toUpperCase();
    if (/^#[0-9a-f]{3}$/i.test(s)) return ('#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3]).toUpperCase();
    const rgb = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (rgb) {
      return '#' + [rgb[1], rgb[2], rgb[3]].map(v => clamp(parseInt(v, 10), 0, 255).toString(16).padStart(2, '0')).join('').toUpperCase();
    }
    const named = { black: '#000000', white: '#FFFFFF', red: '#EF4444', blue: '#3B82F6', green: '#10B981', yellow: '#F59E0B', cyan: '#06B6D4', magenta: '#D946EF', orange: '#F97316', gray: '#64748B', grey: '#64748B' };
    return named[s] || null;
  }

  function parseSVG(svgText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');
    if (!svgEl) throw new Error('Invalid SVG document');

    let vbX = 0, vbY = 0, w = 400, h = 400;
    const vb = svgEl.getAttribute('viewBox');
    const attrWmm = parseSvgLengthMm(svgEl.getAttribute('width'));
    const attrHmm = parseSvgLengthMm(svgEl.getAttribute('height'));
    if (vb) {
      const nums = vb.trim().split(/[\s,]+/).map(Number);
      if (nums.length >= 4 && nums.every(Number.isFinite) && nums[2] > 0 && nums[3] > 0) [vbX, vbY, w, h] = nums;
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
        } else if (fn === 'skewx') {
          cur = [1, 0, Math.tan((a[0] || 0) * Math.PI / 180), 1, 0, 0];
        } else if (fn === 'skewy') {
          cur = [1, Math.tan((a[0] || 0) * Math.PI / 180), 0, 1, 0, 0];
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
        if (cmd === 'Z' || cmd === 'z') { flush(true); cx = sx; cy = sy; lastCp = null; lastCmd = cmd; continue; }
        if (!isNum()) break;
        const rel = cmd === cmd.toLowerCase();
        const U = cmd.toUpperCase();
        if (U === 'M') {
          if (cur.length) flush(false);
          const x = nextNum() + (rel ? cx : 0), y = nextNum() + (rel ? cy : 0);
          cx = x; cy = y; sx = x; sy = y; cur.push([cx, cy]); lastCmd = cmd; cmd = rel ? 'l' : 'L';
        } else if (U === 'L') {
          while (isNum()) { cx = nextNum() + (rel ? cx : 0); cy = nextNum() + (rel ? cy : 0); cur.push([cx, cy]); }
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
            const c1 = (lastCmd.toUpperCase() === 'C' || lastCmd.toUpperCase() === 'S') && lastCp ? [2 * cx - lastCp[0], 2 * cy - lastCp[1]] : [cx, cy];
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
            const c1 = (lastCmd.toUpperCase() === 'Q' || lastCmd.toUpperCase() === 'T') && lastCp ? [2 * cx - lastCp[0], 2 * cy - lastCp[1]] : [cx, cy];
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
        } else idx++;
      }
      if (cur.length) flush(Math.hypot(cx - sx, cy - sy) < 0.5);
      return subPaths;
    }

    function getStyleProp(el, prop) {
      const style = el.getAttribute('style') || '';
      const m = style.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, 'i'));
      return m ? m[1].trim() : el.getAttribute(prop);
    }

    function isHidden(el) {
      const disp = (getStyleProp(el, 'display') || '').toLowerCase();
      const vis = (getStyleProp(el, 'visibility') || '').toLowerCase();
      const op = getStyleProp(el, 'opacity');
      return disp === 'none' || vis === 'hidden' || (op !== null && op !== '' && parseFloat(op) === 0);
    }

    const collected = [];
    const colorMap = new Map();

    function pushPath(pts, color) {
      if (!pts || pts.length < 2) return;
      pts.color = color || '#111111';
      collected.push(pts);
      if (!colorMap.has(pts.color)) colorMap.set(pts.color, []);
      colorMap.get(pts.color).push(pts);
    }

    function walk(el, parentMat, parentColor, depth = 0) {
      if (!el || el.nodeType !== 1 || depth > 24) return;
      const tag = el.tagName.toLowerCase();
      if (tag === 'defs' || tag === 'clippath' || tag === 'mask' || tag === 'title' || tag === 'desc' || tag === 'metadata' || tag === 'style') return;
      if (isHidden(el)) return;

      const mat = mulMat(parentMat, parseTransform(el.getAttribute('transform')));
      const fillC = parseCssColor(getStyleProp(el, 'fill'));
      const strokeC = parseCssColor(getStyleProp(el, 'stroke'));
      const curColor = fillC || strokeC || parentColor || '#111111';

      if (tag === 'use') {
        const href = (el.getAttribute('href') || el.getAttribute('xlink:href') || '').replace(/^#/, '');
        if (href) {
          const refEl = doc.getElementById(href);
          if (refEl) {
            const ux = parseFloat(el.getAttribute('x')) || 0;
            const uy = parseFloat(el.getAttribute('y')) || 0;
            const uMat = (ux || uy) ? mulMat(mat, [1, 0, 0, 1, ux, uy]) : mat;
            walk(refEl, uMat, curColor, depth + 1);
          }
        }
        return;
      }

      if (tag === 'path') {
        const d = el.getAttribute('d');
        if (d) parsePathD(d, mat).forEach(p => pushPath(p, curColor));
      } else if (tag === 'rect') {
        const x = parseFloat(el.getAttribute('x')) || 0;
        const y = parseFloat(el.getAttribute('y')) || 0;
        const rw = parseFloat(el.getAttribute('width')) || 0;
        const rh = parseFloat(el.getAttribute('height')) || 0;
        if (rw > 0 && rh > 0) {
          let rx = parseFloat(el.getAttribute('rx')) || 0;
          let ry = parseFloat(el.getAttribute('ry')) || rx;
          if (!rx && ry) rx = ry;
          rx = Math.min(rx, rw * 0.5);
          ry = Math.min(ry, rh * 0.5);
          let pts = [];
          if (rx > 0.01 && ry > 0.01) {
            const corners = [
              [x + rw - rx, y + ry, -Math.PI / 2, 0],
              [x + rw - rx, y + rh - ry, 0, Math.PI / 2],
              [x + rx, y + rh - ry, Math.PI / 2, Math.PI],
              [x + rx, y + ry, Math.PI, Math.PI * 1.5]
            ];
            for (const [cx, cy, a0, a1] of corners) {
              for (let s = 0; s <= 6; s++) {
                const a = a0 + (a1 - a0) * (s / 6);
                pts.push(applyMat(mat, cx + Math.cos(a) * rx, cy + Math.sin(a) * ry));
              }
            }
          } else {
            pts = [[x, y], [x + rw, y], [x + rw, y + rh], [x, y + rh]].map(p => applyMat(mat, p[0], p[1]));
          }
          pts.closed = true;
          pushPath(pts, curColor);
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
          pushPath(pts, curColor);
        }
      } else if (tag === 'polygon' || tag === 'polyline') {
        const raw = (el.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number);
        const pts = [];
        for (let i = 0; i + 1 < raw.length; i += 2) {
          if (Number.isFinite(raw[i]) && Number.isFinite(raw[i + 1])) pts.push(applyMat(mat, raw[i], raw[i + 1]));
        }
        if (pts.length >= 2) { pts.closed = tag === 'polygon'; pushPath(pts, curColor); }
      } else if (tag === 'line') {
        const p1 = applyMat(mat, parseFloat(el.getAttribute('x1')) || 0, parseFloat(el.getAttribute('y1')) || 0);
        const p2 = applyMat(mat, parseFloat(el.getAttribute('x2')) || 0, parseFloat(el.getAttribute('y2')) || 0);
        const pts = [p1, p2]; pts.closed = false;
        pushPath(pts, strokeC || curColor);
      }

      for (const ch of el.children) walk(ch, mat, curColor, depth + 1);
    }

    walk(svgEl, [1, 0, 0, 1, 0, 0], '#111111', 0);

    const colorLayers = [];
    let idx = 0;
    for (const [hex, arr] of colorMap.entries()) {
      if (hex === '#FFFFFF' && colorMap.size > 1) continue;
      arr.colorData = hex;
      arr.colorName = `SVG Layer ${++idx} (${hex})`;
      arr.visible = true;
      arr.operation = 'cut';
      colorLayers.push(arr);
    }
    return { paths: collected, colorLayers, w, h, physWmm: attrWmm, physHmm: attrHmm };
  }

  // ═══════════════════════════════════════════════════════
  // 3. NATIVE CAD .DXF IMPORTER (LINE, LWPOLYLINE + BULGE, POLYLINE, CIRCLE, ARC, ELLIPSE, SPLINE)
  // ═══════════════════════════════════════════════════════
  const ACI_COLORS = {
    1: '#EF4444', 2: '#F59E0B', 3: '#10B981', 4: '#06B6D4',
    5: '#3B82F6', 6: '#D946EF', 7: '#111827', 8: '#64748B', 9: '#94A3B8'
  };

  function sampleBulgeArc(p1, p2, bulge, out) {
    if (Math.abs(bulge) < 1e-6) { out.push(p2); return; }
    const dx = p2[0] - p1[0], dy = p2[1] - p1[1];
    const chord = Math.hypot(dx, dy);
    if (chord < 1e-6) return;
    const theta = 4 * Math.atan(bulge);
    const r = Math.abs(chord / (2 * Math.sin(theta / 2)));
    const mx = (p1[0] + p2[0]) * 0.5, my = (p1[1] + p2[1]) * 0.5;
    const sagittaDist = (chord * 0.5) / Math.tan(theta / 2);
    const nx = -dy / chord, ny = dx / chord;
    const cx = mx + nx * sagittaDist;
    const cy = my + ny * sagittaDist;
    const a1 = Math.atan2(p1[1] - cy, p1[0] - cx);
    const steps = clamp(Math.ceil(Math.abs(theta) / (Math.PI / 18)), 4, 48);
    for (let i = 1; i <= steps; i++) {
      const a = a1 + theta * (i / steps);
      out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  }

  function parseDXF(dxfText) {
    const rawLines = String(dxfText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const pairs = [];
    for (let i = 0; i + 1 < rawLines.length; i += 2) {
      const code = parseInt(rawLines[i].trim(), 10);
      const val = rawLines[i + 1].trim();
      if (!Number.isNaN(code)) pairs.push([code, val]);
    }

    let insUnits = 4; // 4=mm default, 1=inches, 5=cm
    let section = '';
    const layerColors = {};
    const entities = [];

    for (let i = 0; i < pairs.length; i++) {
      const [code, val] = pairs[i];
      if (code === 0 && val === 'SECTION' && i + 1 < pairs.length) {
        section = pairs[++i][1].toUpperCase();
        continue;
      }
      if (code === 0 && val === 'ENDSEC') { section = ''; continue; }

      if (section === 'HEADER' && code === 9 && val === '$INSUNITS') {
        if (i + 1 < pairs.length && pairs[i + 1][0] === 70) insUnits = parseInt(pairs[++i][1], 10) || 4;
      }

      if (section === 'TABLES' && code === 0 && val === 'LAYER') {
        let lName = '0', lCol = 7;
        while (i + 1 < pairs.length && pairs[i + 1][0] !== 0) {
          const [lc, lv] = pairs[++i];
          if (lc === 2) lName = lv;
          else if (lc === 62) lCol = Math.abs(parseInt(lv, 10) || 7);
        }
        layerColors[lName] = ACI_COLORS[lCol] || '#111827';
      }

      if (section === 'ENTITIES' && code === 0) {
        const type = val.toUpperCase();
        if (type === 'LINE') {
          let x1 = 0, y1 = 0, x2 = 0, y2 = 0, layer = '0', col = 0;
          while (i + 1 < pairs.length && pairs[i + 1][0] !== 0) {
            const [c, v] = pairs[++i];
            if (c === 8) layer = v; else if (c === 62) col = Math.abs(parseInt(v, 10) || 0);
            else if (c === 10) x1 = parseFloat(v); else if (c === 20) y1 = parseFloat(v);
            else if (c === 11) x2 = parseFloat(v); else if (c === 21) y2 = parseFloat(v);
          }
          entities.push({ pts: [[x1, y1], [x2, y2]], closed: false, layer, color: ACI_COLORS[col] || layerColors[layer] || '#111827' });
        } else if (type === 'LWPOLYLINE') {
          let layer = '0', col = 0, flags = 0;
          const verts = [];
          let curV = null;
          while (i + 1 < pairs.length && pairs[i + 1][0] !== 0) {
            const [c, v] = pairs[++i];
            if (c === 8) layer = v; else if (c === 62) col = Math.abs(parseInt(v, 10) || 0);
            else if (c === 70) flags = parseInt(v, 10) || 0;
            else if (c === 10) { curV = { x: parseFloat(v), y: 0, b: 0 }; verts.push(curV); }
            else if (c === 20 && curV) curV.y = parseFloat(v);
            else if (c === 42 && curV) curV.b = parseFloat(v) || 0;
          }
          if (verts.length >= 2) {
            const closed = (flags & 1) === 1;
            const pts = [[verts[0].x, verts[0].y]];
            const count = closed ? verts.length : verts.length - 1;
            for (let k = 0; k < count; k++) {
              const a = verts[k], b = verts[(k + 1) % verts.length];
              sampleBulgeArc([a.x, a.y], [b.x, b.y], a.b, pts);
            }
            if (closed && pts.length > 2 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 1e-4) pts.pop();
            entities.push({ pts, closed, layer, color: ACI_COLORS[col] || layerColors[layer] || '#111827' });
          }
        } else if (type === 'POLYLINE') {
          let layer = '0', col = 0, flags = 0;
          while (i + 1 < pairs.length && pairs[i + 1][0] !== 0) {
            const [c, v] = pairs[++i];
            if (c === 8) layer = v; else if (c === 62) col = Math.abs(parseInt(v, 10) || 0);
            else if (c === 70) flags = parseInt(v, 10) || 0;
          }
          const verts = [];
          while (i + 1 < pairs.length) {
            if (pairs[i + 1][0] === 0 && pairs[i + 1][1].toUpperCase() === 'VERTEX') {
              i++;
              let vx = 0, vy = 0, vb = 0;
              while (i + 1 < pairs.length && pairs[i + 1][0] !== 0) {
                const [c, v] = pairs[++i];
                if (c === 10) vx = parseFloat(v); else if (c === 20) vy = parseFloat(v); else if (c === 42) vb = parseFloat(v) || 0;
              }
              verts.push({ x: vx, y: vy, b: vb });
            } else if (pairs[i + 1][0] === 0 && pairs[i + 1][1].toUpperCase() === 'SEQEND') {
              i++;
              while (i + 1 < pairs.length && pairs[i + 1][0] !== 0) i++;
              break;
            } else break;
          }
          if (verts.length >= 2) {
            const closed = (flags & 1) === 1;
            const pts = [[verts[0].x, verts[0].y]];
            const count = closed ? verts.length : verts.length - 1;
            for (let k = 0; k < count; k++) {
              const a = verts[k], b = verts[(k + 1) % verts.length];
              sampleBulgeArc([a.x, a.y], [b.x, b.y], a.b, pts);
            }
            if (closed && pts.length > 2 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 1e-4) pts.pop();
            entities.push({ pts, closed, layer, color: ACI_COLORS[col] || layerColors[layer] || '#111827' });
          }
        } else if (type === 'CIRCLE' || type === 'ARC') {
          let cx = 0, cy = 0, r = 0, a0 = 0, a1 = 360, layer = '0', col = 0;
          while (i + 1 < pairs.length && pairs[i + 1][0] !== 0) {
            const [c, v] = pairs[++i];
            if (c === 8) layer = v; else if (c === 62) col = Math.abs(parseInt(v, 10) || 0);
            else if (c === 10) cx = parseFloat(v); else if (c === 20) cy = parseFloat(v);
            else if (c === 40) r = parseFloat(v);
            else if (c === 50) a0 = parseFloat(v); else if (c === 51) a1 = parseFloat(v);
          }
          if (r > 0) {
            const isCircle = type === 'CIRCLE';
            let start = a0 * Math.PI / 180, end = a1 * Math.PI / 180;
            if (!isCircle && end <= start) end += Math.PI * 2;
            const sweep = isCircle ? Math.PI * 2 : (end - start);
            const steps = clamp(Math.ceil(Math.abs(sweep) / (Math.PI / 24)), 8, 64);
            const pts = [];
            for (let k = 0; k < (isCircle ? steps : steps + 1); k++) {
              const a = start + sweep * (k / steps);
              pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
            }
            entities.push({ pts, closed: isCircle, layer, color: ACI_COLORS[col] || layerColors[layer] || '#111827' });
          }
        } else if (type === 'ELLIPSE') {
          let cx = 0, cy = 0, mx = 1, my = 0, ratio = 1, t0 = 0, t1 = Math.PI * 2, layer = '0', col = 0;
          while (i + 1 < pairs.length && pairs[i + 1][0] !== 0) {
            const [c, v] = pairs[++i];
            if (c === 8) layer = v; else if (c === 62) col = Math.abs(parseInt(v, 10) || 0);
            else if (c === 10) cx = parseFloat(v); else if (c === 20) cy = parseFloat(v);
            else if (c === 11) mx = parseFloat(v); else if (c === 21) my = parseFloat(v);
            else if (c === 40) ratio = parseFloat(v) || 1;
            else if (c === 41) t0 = parseFloat(v); else if (c === 42) t1 = parseFloat(v);
          }
          const rx = Math.hypot(mx, my), ry = rx * ratio, rot = Math.atan2(my, mx);
          const cosR = Math.cos(rot), sinR = Math.sin(rot);
          const closed = Math.abs(t1 - t0) >= Math.PI * 1.999;
          const steps = 48, pts = [];
          for (let k = 0; k < (closed ? steps : steps + 1); k++) {
            const t = t0 + (t1 - t0) * (k / steps);
            const lx = Math.cos(t) * rx, ly = Math.sin(t) * ry;
            pts.push([cx + lx * cosR - ly * sinR, cy + lx * sinR + ly * cosR]);
          }
          entities.push({ pts, closed, layer, color: ACI_COLORS[col] || layerColors[layer] || '#111827' });
        } else if (type === 'SPLINE') {
          let layer = '0', col = 0, flags = 0;
          const ctrl = [], fit = [];
          while (i + 1 < pairs.length && pairs[i + 1][0] !== 0) {
            const [c, v] = pairs[++i];
            if (c === 8) layer = v; else if (c === 62) col = Math.abs(parseInt(v, 10) || 0);
            else if (c === 70) flags = parseInt(v, 10) || 0;
            else if (c === 10) ctrl.push([parseFloat(v), 0]);
            else if (c === 20 && ctrl.length) ctrl[ctrl.length - 1][1] = parseFloat(v);
            else if (c === 11) fit.push([parseFloat(v), 0]);
            else if (c === 21 && fit.length) fit[fit.length - 1][1] = parseFloat(v);
          }
          const src = fit.length >= 2 ? fit : ctrl;
          if (src.length >= 2) {
            entities.push({ pts: src, closed: (flags & 1) === 1, layer, color: ACI_COLORS[col] || layerColors[layer] || '#111827' });
          }
        }
      }
    }

    if (!entities.length) throw new Error('No vector entities found in DXF');

    // Join adjacent open LINE/ARC segments into closed chains automatically!
    const unitToMm = insUnits === 1 ? 25.4 : (insUnits === 5 ? 10 : 1);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const ent of entities) {
      for (const [x, y] of ent.pts) {
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
    const rawW = Math.max(1e-3, maxX - minX);
    const rawH = Math.max(1e-3, maxY - minY);
    const physWmm = rawW * unitToMm;
    const physHmm = rawH * unitToMm;
    const pad = Math.max(rawW, rawH) * 0.04;
    const targetMaxPx = 760;
    const pxScale = targetMaxPx / Math.max(rawW + pad * 2, rawH + pad * 2);
    const cw = Math.max(64, Math.round((rawW + pad * 2) * pxScale));
    const ch = Math.max(64, Math.round((rawH + pad * 2) * pxScale));

    const layerMap = new Map();
    const flatPaths = [];
    for (const ent of entities) {
      const mapped = ent.pts.map(([x, y]) => [
        (x - minX + pad) * pxScale,
        (maxY - y + pad) * pxScale
      ]);
      mapped.closed = ent.closed;
      mapped.color = ent.color;
      mapped.layerName = ent.layer;
      flatPaths.push(mapped);
      const key = ent.layer || '0';
      if (!layerMap.has(key)) layerMap.set(key, { name: key, color: ent.color, paths: [] });
      layerMap.get(key).paths.push(mapped);
    }

    // Auto-chain open LINE segments that share endpoints into closed contours
    const chained = chainOpenSegments(flatPaths, 1.2);
    const layers = [];
    for (const [, info] of layerMap.entries()) {
      const arr = chainOpenSegments(info.paths, 1.2);
      arr.colorData = info.color;
      arr.colorName = info.name;
      arr.visible = true;
      arr.operation = 'cut';
      layers.push(arr);
    }

    return {
      paths: chained,
      layers,
      w: cw,
      h: ch,
      physWmm: physWmm * (1 + 2 * 0.04),
      physHmm: physHmm * (1 + 2 * 0.04),
      units: insUnits === 1 ? 'inch' : 'mm'
    };
  }

  function chainOpenSegments(paths, tol = 1.0) {
    const closed = [], open = [];
    for (const p of paths) {
      if (p.closed) closed.push(p);
      else if (p.length >= 2) open.push(p.slice());
    }
    const used = new Uint8Array(open.length);
    const out = closed.slice();
    for (let i = 0; i < open.length; i++) {
      if (used[i]) continue;
      used[i] = 1;
      let chain = open[i].slice();
      let grew = true;
      while (grew) {
        grew = false;
        const tail = chain[chain.length - 1];
        const head = chain[0];
        for (let j = 0; j < open.length; j++) {
          if (used[j]) continue;
          const cand = open[j];
          const c0 = cand[0], c1 = cand[cand.length - 1];
          if (Math.hypot(tail[0] - c0[0], tail[1] - c0[1]) <= tol) {
            chain.push(...cand.slice(1)); used[j] = 1; grew = true; break;
          } else if (Math.hypot(tail[0] - c1[0], tail[1] - c1[1]) <= tol) {
            chain.push(...cand.slice(0, -1).reverse()); used[j] = 1; grew = true; break;
          } else if (Math.hypot(head[0] - c1[0], head[1] - c1[1]) <= tol) {
            chain = cand.slice(0, -1).concat(chain); used[j] = 1; grew = true; break;
          } else if (Math.hypot(head[0] - c0[0], head[1] - c0[1]) <= tol) {
            chain = cand.slice(1).reverse().concat(chain); used[j] = 1; grew = true; break;
          }
        }
      }
      const isLoop = chain.length >= 3 && Math.hypot(chain[0][0] - chain[chain.length - 1][0], chain[0][1] - chain[chain.length - 1][1]) <= tol;
      if (isLoop) chain.pop();
      chain.closed = isLoop;
      chain.color = open[i].color;
      out.push(chain);
    }
    return out;
  }

  // ═══════════════════════════════════════════════════════
  // 4. BUILT-IN SINGLE-LINE HERSHEY CNC FONT + STENCIL GENERATOR
  // ═══════════════════════════════════════════════════════
  // Compact 6x10 grid single-stroke vector glyphs (Y=0 top, Y=10 bottom)
  const HERSHEY_GLYPHS = {
    'A': [[[0,10],[3,0],[6,10]], [[1.2,6.5],[4.8,6.5]]],
    'B': [[[0,10],[0,0],[4,0],[5.5,1.2],[5.5,3.8],[4,5],[0,5]], [[4,5],[5.8,6.2],[5.8,8.8],[4,10],[0,10]]],
    'C': [[[6,2],[4.5,0],[1.5,0],[0,2],[0,8],[1.5,10],[4.5,10],[6,8]]],
    'D': [[[0,10],[0,0],[3.8,0],[5.8,2],[5.8,8],[3.8,10],[0,10]]],
    'E': [[[5.5,0],[0,0],[0,10],[5.5,10]], [[0,5],[4.5,5]]],
    'F': [[[5.5,0],[0,0],[0,10]], [[0,5],[4.5,5]]],
    'G': [[[6,2],[4.5,0],[1.5,0],[0,2],[0,8],[1.5,10],[4.5,10],[6,8],[6,5.5],[3.5,5.5]]],
    'H': [[[0,0],[0,10]], [[6,0],[6,10]], [[0,5],[6,5]]],
    'I': [[[1.5,0],[4.5,0]], [[3,0],[3,10]], [[1.5,10],[4.5,10]]],
    'J': [[[5.5,0],[5.5,8],[4,10],[1.5,10],[0,8.2]]],
    'K': [[[0,0],[0,10]], [[5.8,0],[0,5.5]], [[1.8,4],[5.8,10]]],
    'L': [[[0,0],[0,10],[5.5,10]]],
    'M': [[[0,10],[0,0],[3,5.5],[6,0],[6,10]]],
    'N': [[[0,10],[0,0],[6,10],[6,0]]],
    'O': [[[1.5,0],[4.5,0],[6,2],[6,8],[4.5,10],[1.5,10],[0,8],[0,2],[1.5,0]]],
    'P': [[[0,10],[0,0],[4.2,0],[5.8,1.5],[5.8,4],[4.2,5.5],[0,5.5]]],
    'Q': [[[1.5,0],[4.5,0],[6,2],[6,8],[4.5,10],[1.5,10],[0,8],[0,2],[1.5,0]], [[3.8,7.5],[6.2,10.5]]],
    'R': [[[0,10],[0,0],[4.2,0],[5.8,1.5],[5.8,4],[4.2,5.5],[0,5.5]], [[3.2,5.5],[5.8,10]]],
    'S': [[[5.8,1.8],[4.4,0],[1.5,0],[0.2,1.6],[0.2,3.6],[1.6,4.8],[4.5,5.4],[5.8,6.8],[5.8,8.5],[4.4,10],[1.4,10],[0,8.4]]],
    'T': [[[0,0],[6,0]], [[3,0],[3,10]]],
    'U': [[[0,0],[0,8],[1.5,10],[4.5,10],[6,8],[6,0]]],
    'V': [[[0,0],[3,10],[6,0]]],
    'W': [[[0,0],[1.2,10],[3,4.5],[4.8,10],[6,0]]],
    'X': [[[0,0],[6,10]], [[6,0],[0,10]]],
    'Y': [[[0,0],[3,5],[6,0]], [[3,5],[3,10]]],
    'Z': [[[0,0],[6,0],[0,10],[6,10]]],
    '0': [[[1.5,0],[4.5,0],[6,2],[6,8],[4.5,10],[1.5,10],[0,8],[0,2],[1.5,0]], [[1,8.5],[5,1.5]]],
    '1': [[[1.2,2],[3.2,0],[3.2,10]], [[1.2,10],[5.2,10]]],
    '2': [[[0.2,2.2],[1.8,0],[4.4,0],[5.8,1.8],[5.8,3.6],[0,10],[6,10]]],
    '3': [[[0.3,1.5],[1.8,0],[4.4,0],[5.8,1.6],[5.8,3.6],[4.2,4.8],[2.2,4.8]], [[4.2,4.8],[5.9,6.2],[5.9,8.4],[4.4,10],[1.6,10],[0.2,8.4]]],
    '4': [[[4.6,10],[4.6,0],[0,6.8],[6,6.8]]],
    '5': [[[5.6,0],[0.6,0],[0.4,4.5],[4.2,4.5],[5.8,6],[5.8,8.4],[4.2,10],[1.4,10],[0.2,8.5]]],
    '6': [[[5.5,1.6],[4,0],[1.8,0],[0.2,2],[0.2,8.2],[1.8,10],[4.4,10],[5.8,8.4],[5.8,6],[4.4,4.6],[1.6,4.6],[0.2,6]]],
    '7': [[[0,0],[6,0],[2,10]]],
    '8': [[[1.6,4.8],[0.4,3.6],[0.4,1.6],[1.8,0],[4.2,0],[5.6,1.6],[5.6,3.6],[4.4,4.8],[1.6,4.8],[0.2,6.2],[0.2,8.4],[1.8,10],[4.2,10],[5.8,8.4],[5.8,6.2],[4.4,4.8]]],
    '9': [[[5.8,4],[4.4,5.4],[1.6,5.4],[0.2,3.8],[0.2,1.6],[1.6,0],[4.4,0],[5.8,1.8],[5.8,8],[4.2,10],[1.6,10],[0.5,8.6]]],
    '-': [[[1,5],[5,5]]],
    '+': [[[3,2],[3,8]], [[0.5,5],[5.5,5]]],
    '.': [[[2.6,9.2],[3.4,9.2],[3.4,10],[2.6,10],[2.6,9.2]]],
    ',': [[[3.2,8.8],[2.4,11]]],
    ':': [[[2.8,3],[3.3,3],[3.3,3.6],[2.8,3.6]], [[2.8,7.4],[3.3,7.4],[3.3,8],[2.8,8]]],
    '/': [[[5.5,0],[0.5,10]]],
    '%': [[[0.5,1.5],[1.8,1.5],[1.8,2.8],[0.5,2.8],[0.5,1.5]], [[5.5,0],[0.5,10]], [[4.2,7.2],[5.5,7.2],[5.5,8.5],[4.2,8.5],[4.2,7.2]]],
    '!': [[[3,0],[3,7]], [[2.8,9.2],[3.2,9.2],[3.2,10],[2.8,10]]],
    '?': [[[0.6,2.2],[2,0],[4.5,0],[5.8,1.8],[5.8,3.6],[3,5.4],[3,7]], [[2.8,9.2],[3.2,9.2],[3.2,10],[2.8,10]]],
    '&': [[[5.8,10],[1,4],[0.5,2],[1.8,0],[3.8,0],[4.8,1.6],[4.2,3.4],[0.4,6.4],[0.4,8.6],[2,10],[4,10],[5.8,6.8]]],
    '#': [[[1.8,0],[1.2,10]], [[4.8,0],[4.2,10]], [[0,3.5],[6,3.5]], [[0,6.8],[6,6.8]]],
    '°': [[[1.8,0.5],[3.4,0.5],[3.8,1.6],[3.4,2.8],[1.8,2.8],[1.4,1.6],[1.8,0.5]]],
    ' ': []
  };

  function normalizeCharAccent(ch) {
    const map = { 'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E', 'À': 'A', 'Â': 'A', 'Ä': 'A', 'Ç': 'C', 'Î': 'I', 'Ï': 'I', 'Ô': 'O', 'Ö': 'O', 'Ù': 'U', 'Û': 'U', 'Ü': 'U', 'Ă': 'A', 'Î': 'I', 'Ș': 'S', 'Ț': 'T' };
    const u = ch.toUpperCase();
    return { base: map[u] || u, accent: u !== (map[u] || u) ? u : null };
  }

  function generateHersheyTextPaths(text, x, y, heightPx, letterSpacing = 0.25, align = 'left') {
    const lines = String(text || '').split(/\r?\n/);
    const scale = heightPx / 10;
    const advX = (6 + 6 * letterSpacing) * scale;
    const lineH = heightPx * 1.45;
    const out = [];

    lines.forEach((line, li) => {
      const lineW = Math.max(0, line.length * advX - 6 * letterSpacing * scale);
      let startX = x;
      if (align === 'center') startX = x - lineW * 0.5;
      else if (align === 'right') startX = x - lineW;
      const ly = y + li * lineH;

      for (let ci = 0; ci < line.length; ci++) {
        const { base, accent } = normalizeCharAccent(line[ci]);
        const strokes = HERSHEY_GLYPHS[base] || [];
        const ox = startX + ci * advX;
        for (const st of strokes) {
          const pts = st.map(([px, py]) => [ox + px * scale, ly + py * scale]);
          pts.closed = false;
          out.push(pts);
        }
        // French diacritic strokes
        if (accent === 'É') { const p = [[ox + 2.2 * scale, ly - 1.2 * scale], [ox + 4.2 * scale, ly - 2.6 * scale]]; p.closed = false; out.push(p); }
        else if (accent === 'È' || accent === 'À' || accent === 'Ù') { const p = [[ox + 4 * scale, ly - 1.2 * scale], [ox + 2 * scale, ly - 2.6 * scale]]; p.closed = false; out.push(p); }
        else if (accent === 'Ê' || accent === 'Â' || accent === 'Î' || accent === 'Ô' || accent === 'Û') { const p = [[ox + 1.5 * scale, ly - 1.2 * scale], [ox + 3 * scale, ly - 2.6 * scale], [ox + 4.5 * scale, ly - 1.2 * scale]]; p.closed = false; out.push(p); }
        else if (accent === 'Ç') { const p = [[ox + 3 * scale, ly + 10 * scale], [ox + 3.4 * scale, ly + 11.4 * scale], [ox + 2.2 * scale, ly + 11.8 * scale]]; p.closed = false; out.push(p); }
      }
    });
    return out;
  }

  function generateStencilTextPaths(text, x, y, heightPx, fontFamily = 'Space Grotesk, Inter, sans-serif', addStencilBridges = true, align = 'center') {
    const lines = String(text || 'CNC').split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const fontPx = Math.max(36, Math.round(heightPx * 1.4));
    const pad = Math.round(fontPx * 0.35);
    const tmp = document.createElement('canvas');
    const tCtx = tmp.getContext('2d');
    tCtx.font = `800 ${fontPx}px ${fontFamily}`;
    let maxW = 40;
    lines.forEach(l => { maxW = Math.max(maxW, Math.ceil(tCtx.measureText(l).width)); });
    const lineH = Math.round(fontPx * 1.25);
    const cw = Math.min(1200, maxW + pad * 2);
    const ch = Math.min(800, lines.length * lineH + pad * 2);

    const cv = document.createElement('canvas');
    cv.width = cw; cv.height = ch;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = '#000000';
    ctx.font = `800 ${fontPx}px ${fontFamily}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    lines.forEach((line, li) => {
      const cy = pad + li * lineH + lineH * 0.5;
      ctx.fillText(line, cw * 0.5, cy);
      // Automatic vertical Stencil Bridges across enclosed letter counters so interiors never fall out!
      if (addStencilBridges) {
        const bridgeW = Math.max(3, Math.round(fontPx * 0.065));
        const totalW = ctx.measureText(line).width;
        let cxCursor = (cw - totalW) * 0.5;
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < line.length; i++) {
          const chChar = line[i];
          const cwChar = ctx.measureText(chChar).width;
          if (/[ABDOMPQRabdegopq04689@#&]/.test(chChar)) {
            const bx = cxCursor + cwChar * 0.5 - bridgeW * 0.5;
            ctx.fillRect(bx, cy - fontPx * 0.52, bridgeW, fontPx * 1.04);
          }
          cxCursor += cwChar;
        }
        ctx.fillStyle = '#000000';
      }
    });

    const lum = luminanceField(ctx.getImageData(0, 0, cw, ch));
    const raw = subpixelContours(lum, cw, ch, 128, true);
    const scale = heightPx / fontPx;
    const outW = cw * scale, outH = ch * scale;
    const ox = align === 'center' ? (x - outW * 0.5) : (align === 'right' ? (x - outW) : x);
    const oy = y - outH * 0.5;

    return raw.map(p => {
      const np = p.map(([px, py]) => [ox + px * scale, oy + py * scale]);
      np.closed = p.closed;
      return np;
    });
  }

  // ═══════════════════════════════════════════════════════
  // 5. GEOMETRY HELPERS, SELF-INTERSECTION-SAFE OFFSET, POCKET CLEARING, DOGBONES & TABS
  // ═══════════════════════════════════════════════════════
  function pointInPoly(pt, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
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
    return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY, area: Math.abs((maxX - minX) * (maxY - minY)) };
  }

  function signedArea(pts) {
    let a = 0;
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
      a += x1 * y2 - x2 * y1;
    }
    return a * 0.5;
  }

  function polyPerimeter(pts, closed = true) {
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (closed && pts.length >= 3) len += Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]);
    return len;
  }

  function analyzeNesting(paths) {
    const boxes = paths.map(p => p && p.length >= 3 && p.closed !== false ? polyBBox(p) : null);
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

  function dedupePoly(pts, eps = 1e-3) {
    const clean = [];
    for (const p of pts) {
      if (!clean.length || Math.hypot(p[0] - clean[clean.length - 1][0], p[1] - clean[clean.length - 1][1]) > eps) {
        clean.push([p[0], p[1]]);
      }
    }
    if (clean.length > 2 && Math.hypot(clean[0][0] - clean[clean.length - 1][0], clean[0][1] - clean[clean.length - 1][1]) <= eps) {
      clean.pop();
    }
    return clean;
  }

  function segIntersect(a, b, c, d) {
    const rX = b[0] - a[0], rY = b[1] - a[1];
    const sX = d[0] - c[0], sY = d[1] - c[1];
    const denom = rX * sY - rY * sX;
    if (Math.abs(denom) < 1e-9) return null;
    const qpX = c[0] - a[0], qpY = c[1] - a[1];
    const t = (qpX * sY - qpY * sX) / denom;
    const u = (qpX * rY - qpY * rX) / denom;
    if (t > 1e-4 && t < 1 - 1e-4 && u > 1e-4 && u < 1 - 1e-4) {
      return [a[0] + t * rX, a[1] + t * rY];
    }
    return null;
  }

  // Self-intersection-guarded polygon offset (positive = outward, negative = inward)
  function offsetClosedPolygon(pts, offsetDist) {
    if (!pts || pts.length < 3 || Math.abs(offsetDist) < 1e-4) return pts;
    const src = dedupePoly(pts, 1e-3);
    if (src.length < 3) return null;
    const origArea = signedArea(src);
    if (Math.abs(origArea) < 1e-3) return null;
    const isCW = origArea > 0;
    const sign = isCW ? 1 : -1;
    const n = src.length;
    const out = [];

    for (let i = 0; i < n; i++) {
      const prev = src[(i - 1 + n) % n];
      const cur = src[i];
      const next = src[(i + 1) % n];
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
        const dot = mx * n1x + my * n1y;
        // Bevel sharp acute corners instead of creating exploding miters
        if (dot < 0.42 && offsetDist > 0) {
          out.push([cur[0] + n1x * offsetDist, cur[1] + n1y * offsetDist]);
          out.push([cur[0] + n2x * offsetDist, cur[1] + n2y * offsetDist]);
        } else {
          const miter = clamp(offsetDist / Math.max(0.35, dot), -Math.abs(offsetDist) * 2.2, Math.abs(offsetDist) * 2.2);
          out.push([cur[0] + mx * miter, cur[1] + my * miter]);
        }
      }
    }

    // Remove local bowtie self-intersections & double-inversion collapses when offsetting inward
    let cleaned = out;
    if (offsetDist < 0 && cleaned.length >= 4) {
      // Check edge-flip ratio: if >=50% of edges inverted direction against original, polygon collapsed inside-out!
      if (cleaned.length === n) {
        let flippedEdges = 0;
        for (let i = 0; i < n; i++) {
          const ox = src[(i + 1) % n][0] - src[i][0], oy = src[(i + 1) % n][1] - src[i][1];
          const nx = cleaned[(i + 1) % n][0] - cleaned[i][0], ny = cleaned[(i + 1) % n][1] - cleaned[i][1];
          if (ox * nx + oy * ny <= 0) flippedEdges++;
        }
        if (flippedEdges >= Math.ceil(n * 0.5)) return null;
      }
      const newArea = signedArea(cleaned);
      if (Math.sign(newArea) !== Math.sign(origArea) || Math.abs(newArea) < 4 || Math.abs(newArea) >= Math.abs(origArea)) return null;
      // Local loop trim (prevents small corner spikes)
      for (let pass = 0; pass < 2 && cleaned.length >= 4; pass++) {
        let trimmed = false;
        for (let i = 0; i < cleaned.length && !trimmed; i++) {
          const a = cleaned[i], b = cleaned[(i + 1) % cleaned.length];
          for (let j = i + 2; j < Math.min(cleaned.length, i + 8); j++) {
            if (i === 0 && j === cleaned.length - 1) continue;
            const c = cleaned[j], d = cleaned[(j + 1) % cleaned.length];
            const hit = segIntersect(a, b, c, d);
            if (hit) {
              cleaned = cleaned.slice(0, i + 1).concat([hit], cleaned.slice(j + 1));
              trimmed = true;
              break;
            }
          }
        }
        if (!trimmed) break;
      }
      if (cleaned.length < 3 || Math.sign(signedArea(cleaned)) !== Math.sign(origArea) || Math.abs(signedArea(cleaned)) < 4) return null;
    }

    cleaned.closed = true;
    return cleaned;
  }

  // Real Multi-Pass Concentric Offset Pocket Clearing
  function generatePocketPaths(paths, toolDiaPx, stepoverPct = 55) {
    if (!paths || !paths.length || toolDiaPx <= 0.1) return [];
    const closedOnly = paths.filter(p => p && p.length >= 3 && p.closed !== false);
    if (!closedOnly.length) return [];
    const depths = analyzeNesting(closedOnly);
    const step = Math.max(0.8, toolDiaPx * clamp(stepoverPct, 20, 95) / 100);
    const halfTool = toolDiaPx * 0.5;
    const holes = closedOnly.filter((_, i) => depths[i] % 2 === 1);
    const outers = closedOnly.filter((_, i) => depths[i] % 2 === 0);
    const rings = [];

    for (const outer of outers) {
      let cur = offsetClosedPolygon(outer, -halfTool);
      let guard = 0;
      while (cur && cur.length >= 3 && guard++ < 40) {
        // Keep pocket vertices outside any inner islands
        const validRing = !holes.some(h => pointInPoly(cur[0], h));
        if (validRing) {
          cur.closed = true;
          cur.isPocket = true;
          rings.push(cur);
        }
        cur = offsetClosedPolygon(cur, -step);
      }
    }
    return rings;
  }

  // Auto Dogbone / T-Bone Corner Fillets on interior ~90° corners for CNC plywood joinery
  function applyDogbones(paths, toolRadiusPx, mode = 'dogbone') {
    if (!paths || !paths.length || toolRadiusPx <= 0.2 || mode === 'none') return paths;
    const depths = analyzeNesting(paths);
    return paths.map((p, idx) => {
      if (!p || p.length < 4 || p.closed === false) return p;
      const src = dedupePoly(p, 0.2);
      const n = src.length;
      if (n < 4) return p;
      const isCW = signedArea(src) > 0;
      const isHole = (depths[idx] % 2) === 1;
      // For outer contour (even depth): concave corners point inward. For hole (odd depth): convex corners of hole are concave corners of pocket!
      const wantSign = isHole ? (isCW ? 1 : -1) : (isCW ? -1 : 1);
      const out = [];

      for (let i = 0; i < n; i++) {
        const prev = src[(i - 1 + n) % n];
        const cur = src[i];
        const next = src[(i + 1) % n];
        const v1x = cur[0] - prev[0], v1y = cur[1] - prev[1];
        const v2x = next[0] - cur[0], v2y = next[1] - cur[1];
        const l1 = Math.hypot(v1x, v1y), l2 = Math.hypot(v2x, v2y);
        if (l1 < toolRadiusPx * 2.2 || l2 < toolRadiusPx * 2.2) {
          out.push(cur);
          continue;
        }
        const u1x = v1x / l1, u1y = v1y / l1;
        const u2x = v2x / l2, u2y = v2y / l2;
        const cross = u1x * u2y - u1y * u2x;
        const dot = u1x * u2x + u1y * u2y;
        // ~90° corner check: |dot| < 0.35 (between ~70° and ~110°)
        if (Math.sign(cross) === wantSign && Math.abs(dot) < 0.35) {
          let dirX, dirY;
          if (mode === 'tbone') {
            // Relief along the longer edge direction (T-bone)
            if (l1 >= l2) { dirX = u1x; dirY = u1y; }
            else { dirX = -u2x; dirY = -u2y; }
          } else {
            // Diagonal bisector into the corner (45° Dogbone)
            dirX = u1x - u2x; dirY = u1y - u2y;
            const dl = Math.hypot(dirX, dirY) || 1;
            dirX /= dl; dirY /= dl;
          }
          // Dogbone notch: overcut by radius * (sqrt(2)-1) ~ 0.414*r -> full relief depth r
          const relief = mode === 'tbone' ? toolRadiusPx * 0.95 : toolRadiusPx * 0.65;
          out.push(cur);
          out.push([cur[0] + dirX * relief, cur[1] + dirY * relief]);
          out.push(cur);
        } else {
          out.push(cur);
        }
      }
      out.closed = true;
      out.color = p.color;
      return out;
    });
  }

  // Exact Arc-Length Multi-Tab Computation (evenly distributed physical mm tabs along closed contour)
  function buildContourWithTabs(path, sx, sy, h, tabCount = 4, tabWidthMm = 4.0) {
    // Convert path to Y-up mm coordinates + closing segment
    const pts = path.map(([px, py]) => [px * sx, (h - py) * sy]);
    pts.push([pts[0][0], pts[0][1]]);

    const cum = [0];
    for (let i = 1; i < pts.length; i++) {
      cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    const perim = cum[cum.length - 1];
    if (perim < tabWidthMm * 2.5 || tabCount <= 0) {
      return { segments: pts.slice(1).map(p => ({ x: p[0], y: p[1], isTab: false })), start: pts[0] };
    }

    const actualTabs = Math.min(tabCount, Math.max(2, Math.floor(perim / (tabWidthMm * 3.5))));
    const halfW = tabWidthMm * 0.5;
    const tabRanges = [];
    for (let t = 0; t < actualTabs; t++) {
      const center = ((t + 0.5) / actualTabs) * perim;
      tabRanges.push([Math.max(0.5, center - halfW), Math.min(perim - 0.5, center + halfW)]);
    }

    const sampleAtDist = (d) => {
      for (let i = 1; i < cum.length; i++) {
        if (d <= cum[i] + 1e-6) {
          const segLen = Math.max(1e-6, cum[i] - cum[i - 1]);
          const u = clamp((d - cum[i - 1]) / segLen, 0, 1);
          return [
            pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u,
            pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u
          ];
        }
      }
      return pts[pts.length - 1];
    };

    // Collect sorted distance breakpoints (original vertices + tab start/end)
    const breaks = new Set(cum);
    for (const [s, e] of tabRanges) { breaks.add(s); breaks.add(e); }
    const sorted = Array.from(breaks).sort((a, b) => a - b);

    const segments = [];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] < 1e-4) continue;
      const midD = (sorted[i] + sorted[i - 1]) * 0.5;
      const isTab = tabRanges.some(([s, e]) => midD >= s && midD <= e);
      const pt = sampleAtDist(sorted[i]);
      segments.push({ x: pt[0], y: pt[1], isTab });
    }
    return { segments, start: pts[0] };
  }

  // Toolpath Optimizer: Hole-First + Half-Offset Compensation + Nearest-Neighbor TSP
  // NOTE: offsetHalfPx is ALREADY half of kerf / bit diameter (fixes previous 2x kerf bug!)
  function optimizeToolpaths(paths, offsetHalfPx = 0, profileSide = 'auto') {
    if (!paths || paths.length === 0) return { ordered: [], originalTravel: 0, optimizedTravel: 0 };

    const depths = analyzeNesting(paths);
    const prepared = [];
    for (let i = 0; i < paths.length; i++) {
      const p = paths[i];
      if (!p || p.length < 2) continue;
      const depth = depths[i];
      const isClosed = p.closed !== false && p.length >= 3;
      const isHole = (depth % 2) === 1;
      let pts = p;
      if (isClosed && Math.abs(offsetHalfPx) > 1e-3 && profileSide !== 'on') {
        let dir = 0;
        if (profileSide === 'outside') dir = isHole ? -offsetHalfPx : offsetHalfPx;
        else if (profileSide === 'inside') dir = isHole ? offsetHalfPx : -offsetHalfPx;
        else dir = isHole ? -offsetHalfPx : offsetHalfPx; // 'auto': holes shrink inward, outers expand outward
        const off = offsetClosedPolygon(p, dir);
        if (off && off.length >= 3) pts = off;
      }
      prepared.push({ pts, depth, isClosed, isHole, operation: p.operation || 'cut', color: p.color });
    }

    let originalTravel = 0;
    for (let i = 1; i < prepared.length; i++) {
      const prev = prepared[i - 1].pts, cur = prepared[i].pts;
      if (prev.length && cur.length) {
        const a = prepared[i - 1].isClosed ? prev[0] : prev[prev.length - 1];
        originalTravel += Math.hypot(cur[0][0] - a[0], cur[0][1] - a[1]);
      }
    }

    const maxDepth = prepared.reduce((m, it) => Math.max(m, it.depth), 0);
    const ordered = [];
    let curX = 0, curY = 0, optimizedTravel = 0;

    for (let d = maxDepth; d >= 0; d--) {
      const pool = prepared.filter(item => item.depth === d && item.pts.length >= 2);
      while (pool.length > 0) {
        let bestIdx = 0, bestDist = Infinity, flipOpen = false;
        for (let i = 0; i < pool.length; i++) {
          const item = pool[i];
          const d0 = Math.hypot(item.pts[0][0] - curX, item.pts[0][1] - curY);
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
        pts.isHole = chosen.isHole;
        pts.depth = chosen.depth;
        pts.operation = chosen.operation;
        pts.color = chosen.color;
        optimizedTravel += bestDist;
        ordered.push(pts);
        const endPt = chosen.isClosed ? pts[0] : pts[pts.length - 1];
        curX = endPt[0]; curY = endPt[1];
      }
    }

    return { ordered, originalTravel, optimizedTravel };
  }

  // ═══════════════════════════════════════════════════════
  // 6. SMART SHEET AUTO-NESTING (0° / 90° PACKING + WASTE METRICS)
  // ═══════════════════════════════════════════════════════
  function nestPartsOnSheet(basePaths, baseW, baseH, partPhysW, partPhysH, sheetWmm, sheetHmm, desiredCopies, spacingMm = 4, allowRotate90 = true, isColorMode = false) {
    const pxPerMmX = baseW / Math.max(1, partPhysW);
    const pxPerMmY = baseH / Math.max(1, partPhysH);
    const margin = Math.max(1, spacingMm * 0.5);
    const availW = Math.max(1, sheetWmm - margin * 2);
    const availH = Math.max(1, sheetHmm - margin * 2);

    const evalLayout = (pw, ph, rotated) => {
      const cols = Math.floor((availW + spacingMm) / (pw + spacingMm));
      const rows = Math.floor((availH + spacingMm) / (ph + spacingMm));
      return { cols: Math.max(0, cols), rows: Math.max(0, rows), cap: Math.max(0, cols * rows), pw, ph, rotated };
    };

    const lay0 = evalLayout(partPhysW, partPhysH, false);
    const lay90 = allowRotate90 ? evalLayout(partPhysH, partPhysW, true) : { cap: 0, cols: 0, rows: 0 };
    const best = lay90.cap > lay0.cap ? lay90 : lay0;

    if (best.cap === 0) {
      return {
        fits: false, placed: 0, maxCapacity: 0, rotated: false,
        utilizationPct: 0, wastePct: 100,
        paths: basePaths, w: baseW, h: baseH, physW: partPhysW, physH: partPhysH
      };
    }

    const targetCopies = desiredCopies > 0 ? Math.min(desiredCopies, best.cap) : best.cap;
    const outWpx = Math.round(sheetWmm * pxPerMmX);
    const outHpx = Math.round(sheetHmm * pxPerMmY);

    const placePath = (p, oxMm, oyMm, rot) => {
      const np = p.map(([px, py]) => {
        const xmm = px / pxPerMmX;
        const ymm = py / pxPerMmY;
        const rx = rot ? (partPhysH - ymm) : xmm;
        const ry = rot ? xmm : ymm;
        return [(oxMm + rx) * pxPerMmX, (oyMm + ry) * pxPerMmY];
      });
      np.closed = p.closed;
      np.color = p.color;
      np.operation = p.operation;
      return np;
    };

    const placements = [];
    for (let r = 0; r < best.rows && placements.length < targetCopies; r++) {
      for (let c = 0; c < best.cols && placements.length < targetCopies; c++) {
        placements.push({
          ox: margin + c * (best.pw + spacingMm),
          oy: margin + r * (best.ph + spacingMm),
          rot: best.rotated
        });
      }
    }

    let nestedPaths;
    if (isColorMode) {
      nestedPaths = basePaths.map(layer => {
        const outLayer = [];
        outLayer.colorData = layer.colorData;
        outLayer.colorName = layer.colorName;
        outLayer.visible = layer.visible !== false;
        outLayer.operation = layer.operation || 'cut';
        for (const pl of placements) {
          for (const p of layer) outLayer.push(placePath(p, pl.ox, pl.oy, pl.rot));
        }
        return outLayer;
      });
    } else {
      nestedPaths = [];
      for (const pl of placements) {
        for (const p of basePaths) nestedPaths.push(placePath(p, pl.ox, pl.oy, pl.rot));
      }
    }

    const usedAreaMm2 = placements.length * partPhysW * partPhysH;
    const sheetAreaMm2 = Math.max(1, sheetWmm * sheetHmm);
    const utilizationPct = clamp((usedAreaMm2 / sheetAreaMm2) * 100, 0, 100);

    return {
      fits: true,
      placed: placements.length,
      maxCapacity: best.cap,
      cols: best.cols,
      rows: best.rows,
      rotated: best.rotated,
      utilizationPct: +utilizationPct.toFixed(1),
      wastePct: +(100 - utilizationPct).toFixed(1),
      paths: nestedPaths,
      w: outWpx,
      h: outHpx,
      physW: sheetWmm,
      physH: sheetHmm
    };
  }

  // ═══════════════════════════════════════════════════════
  // 7. PRE-FLIGHT CNC SAFETY & CUTABILITY INSPECTOR + AUTO-FIXERS
  // ═══════════════════════════════════════════════════════
  function inspectPreflight(pathsOrLayers, w, h, physW, physH, toolDiaMm = 0.2, bedWmm = 400, bedHmm = 400, isColorMode = false) {
    const flat = isColorMode ? pathsOrLayers.flat() : pathsOrLayers;
    const sx = physW / Math.max(1, w);
    const sy = physH / Math.max(1, h);

    const openIndices = [];
    const duplicateIndices = [];
    const narrowIndices = [];
    const seenKeys = new Map();

    const sigOf = (p) => {
      if (!p || p.length < 2) return '';
      const b = polyBBox(p);
      const perim = polyPerimeter(p, p.closed !== false);
      return `${Math.round(b.minX * 2)}_${Math.round(b.minY * 2)}_${Math.round(b.maxX * 2)}_${Math.round(b.maxY * 2)}_${Math.round(perim * 2)}`;
    };

    flat.forEach((p, idx) => {
      if (!p || p.length < 2) return;
      if (p.closed === false) openIndices.push(idx);
      const key = sigOf(p);
      if (seenKeys.has(key)) duplicateIndices.push(idx);
      else seenKeys.set(key, idx);

      if (toolDiaMm > 0.3 && p.closed !== false && p.length >= 3) {
        const b = polyBBox(p);
        const bwMm = b.w * sx, bhMm = b.h * sy;
        if (Math.min(bwMm, bhMm) < toolDiaMm * 1.08) narrowIndices.push(idx);
      }
    });

    const outOfBounds = physW > bedWmm + 0.1 || physH > bedHmm + 0.1;
    const score = clamp(
      100 - duplicateIndices.length * 12 - openIndices.length * 4 - narrowIndices.length * 8 - (outOfBounds ? 25 : 0),
      15, 100
    );

    return {
      totalPaths: flat.length,
      openCount: openIndices.length,
      openIndices,
      duplicateCount: duplicateIndices.length,
      duplicateIndices,
      narrowCount: narrowIndices.length,
      narrowIndices,
      outOfBounds,
      bedWmm, bedHmm, physW, physH,
      score: Math.round(score)
    };
  }

  function removeDuplicatePaths(pathsOrLayers, isColorMode = false) {
    const cleanArr = (arr) => {
      const seen = new Set();
      let removed = 0;
      const out = [];
      for (const p of arr) {
        if (!p || p.length < 2) continue;
        const b = polyBBox(p);
        const perim = polyPerimeter(p, p.closed !== false);
        const key = `${Math.round(b.minX * 2)}_${Math.round(b.minY * 2)}_${Math.round(b.maxX * 2)}_${Math.round(b.maxY * 2)}_${Math.round(perim * 2)}`;
        if (seen.has(key)) { removed++; continue; }
        seen.add(key);
        out.push(p);
      }
      return { out, removed };
    };
    if (isColorMode) {
      let totalRemoved = 0;
      const layers = pathsOrLayers.map(l => {
        const res = cleanArr(l);
        totalRemoved += res.removed;
        res.out.colorData = l.colorData; res.out.colorName = l.colorName;
        res.out.visible = l.visible !== false; res.out.operation = l.operation || 'cut';
        return res.out;
      });
      return { paths: layers, removed: totalRemoved };
    }
    const res = cleanArr(pathsOrLayers);
    return { paths: res.out, removed: res.removed };
  }

  function autoCloseOpenContours(pathsOrLayers, maxGapPx = 12, isColorMode = false) {
    const fixArr = (arr) => {
      const beforeOpen = arr.filter(p => p && p.closed === false).length;
      const chained = chainOpenSegments(arr, Math.max(2, maxGapPx * 0.5));
      const out = chained.map(p => {
        if (p.closed === false && p.length >= 3) {
          const gap = Math.hypot(p[0][0] - p[p.length - 1][0], p[0][1] - p[p.length - 1][1]);
          if (gap <= maxGapPx) {
            const np = p.slice(); np.closed = true; np.color = p.color; np.operation = p.operation;
            return np;
          }
        }
        return p;
      });
      const afterOpen = out.filter(p => p && p.closed === false).length;
      return { out, closedCount: Math.max(0, beforeOpen - afterOpen) };
    };
    if (isColorMode) {
      let total = 0;
      const layers = pathsOrLayers.map(l => {
        const res = fixArr(l);
        total += res.closedCount;
        res.out.colorData = l.colorData; res.out.colorName = l.colorName;
        res.out.visible = l.visible !== false; res.out.operation = l.operation || 'cut';
        return res.out;
      });
      return { paths: layers, closedCount: total };
    }
    const res = fixArr(pathsOrLayers);
    return { paths: res.out, closedCount: res.closedCount };
  }

  // ═══════════════════════════════════════════════════════
  // 8. SVG PATH & CANVAS RENDERERS
  // ═══════════════════════════════════════════════════════
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
          const pPrev = pts[(i - 1 + n) % n], pCur = pts[i], pNext = pts[(i + 1) % n];
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

  // ═══════════════════════════════════════════════════════
  // 9. WATERTIGHT 3D EXTRUDE BUILDER (Z-UP STL + LINEAR-RGB AR + STRICT HOLE HIERARCHY)
  // ═══════════════════════════════════════════════════════
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

  function build3DMeshGroup(pathsOrLayers, srcW, srcH, targetWmm, targetHmm, depthMm = 6, addBacking = false, isColorMode = false, opts = {}) {
    const T = global.THREE;
    if (!T) throw new Error('Three.js is required for 3D extrusion.');
    const zUp = !!opts.zUp; // true for 3D-printer STL (flat on Z=0), false for Three.js/AR Y-up
    const linearColor = !!opts.linearColor; // true for GLTF/AR PBR fidelity
    const sx = (targetWmm || srcW * 0.264583) / Math.max(1, srcW);
    const sy = (targetHmm || srcH * 0.264583) / Math.max(1, srcH);

    const group = new T.Group();
    group.name = 'VectorCNC_3D_Model';

    const layerList = isColorMode
      ? pathsOrLayers.filter(l => l && l.visible !== false && l.operation !== 'ignore').map(l => ({ hex: l.colorData || '#38bdf8', paths: l }))
      : [{ hex: '#38bdf8', paths: pathsOrLayers }];

    layerList.forEach((layer, li) => {
      const closedPolys = layer.paths.filter(p => p && p.length >= 3 && p.closed !== false);
      if (closedPolys.length === 0) return;

      const depths = analyzeNesting(closedPolys);
      const outers = [];
      const holes = [];
      for (let i = 0; i < closedPolys.length; i++) {
        const entry = { idx: i, poly: closedPolys[i], depth: depths[i], box: polyBBox(closedPolys[i]) };
        if (depths[i] % 2 === 0) outers.push(entry);
        else holes.push(entry);
      }

      // Strict parent-child hole assignment: each hole ONLY belongs to the smallest containing outer of depth (h.depth - 1)!
      const holesByOuterIdx = new Map();
      for (const hObj of holes) {
        const tPt = hObj.poly[0];
        let bestParent = null;
        for (const o of outers) {
          if (o.depth !== hObj.depth - 1) continue;
          if (tPt[0] < o.box.minX || tPt[0] > o.box.maxX || tPt[1] < o.box.minY || tPt[1] > o.box.maxY) continue;
          if (pointInPoly(tPt, o.poly)) {
            if (!bestParent || o.box.area < bestParent.box.area) bestParent = o;
          }
        }
        if (bestParent) {
          if (!holesByOuterIdx.has(bestParent.idx)) holesByOuterIdx.set(bestParent.idx, []);
          holesByOuterIdx.get(bestParent.idx).push(hObj);
        }
      }

      const shapes = [];
      for (const o of outers) {
        const outerPts = cleanShapePoints(o.poly, sx, sy, srcH);
        if (outerPts.length < 3) continue;
        const shape = new T.Shape();
        outerPts.forEach(([x, y], k) => { if (k === 0) shape.moveTo(x, y); else shape.lineTo(x, y); });
        shape.closePath();

        const myHoles = holesByOuterIdx.get(o.idx) || [];
        for (const hObj of myHoles) {
          const holePts = cleanShapePoints(hObj.poly, sx, sy, srcH);
          if (holePts.length < 3) continue;
          const hp = new T.Path();
          holePts.forEach(([x, y], k) => { if (k === 0) hp.moveTo(x, y); else hp.lineTo(x, y); });
          hp.closePath();
          shape.holes.push(hp);
        }
        shapes.push(shape);
      }

      if (shapes.length > 0) {
        // Stagger Z slightly by 0.15mm per color layer so overlapping layers never Z-fight!
        const layerDepth = Math.max(0.8, depthMm - li * 0.15);
        const extrudeGeo = new T.ExtrudeGeometry(shapes, {
          depth: layerDepth,
          bevelEnabled: true,
          bevelThickness: Math.min(0.45, layerDepth * 0.08),
          bevelSize: Math.min(0.3, layerDepth * 0.05),
          bevelSegments: 2,
          curveSegments: 6
        });
        if (!zUp) extrudeGeo.rotateX(-Math.PI / 2);

        const col = new T.Color(layer.hex);
        if (linearColor && typeof col.convertSRGBToLinear === 'function') col.convertSRGBToLinear();
        const mat = new T.MeshStandardMaterial({ color: col, roughness: 0.38, metalness: 0.22 });
        const mesh = new T.Mesh(extrudeGeo, mat);
        mesh.name = `Layer_${li + 1}`;
        group.add(mesh);
      }
    });

    if (addBacking) {
      const pw = Math.max(10, targetWmm || srcW * 0.264583);
      const ph = Math.max(10, targetHmm || srcH * 0.264583);
      const backGeo = zUp
        ? new T.BoxGeometry(pw * 1.04, ph * 1.04, 2.0)
        : new T.BoxGeometry(pw * 1.04, 2.0, ph * 1.04);
      if (zUp) backGeo.translate(pw / 2, ph / 2, -1.0);
      else backGeo.translate(pw / 2, -1.0, -ph / 2);
      const backCol = new T.Color(0x1e293b);
      if (linearColor && typeof backCol.convertSRGBToLinear === 'function') backCol.convertSRGBToLinear();
      const backMat = new T.MeshStandardMaterial({ color: backCol, roughness: 0.72, metalness: 0.15 });
      const backMesh = new T.Mesh(backGeo, backMat);
      backMesh.name = 'Backing_Plate';
      group.add(backMesh);
    }

    group.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(group);
    if (!box.isEmpty()) {
      const cen = new T.Vector3();
      box.getCenter(cen);
      if (zUp) group.position.set(-cen.x, -cen.y, -box.min.z); // Flat on print bed Z = 0!
      else group.position.set(-cen.x, -box.min.y, -cen.z);     // Floor on Y = 0 for AR!
      group.updateMatrixWorld(true);
    }
    return group;
  }

  global.VectorEngine = {
    clamp,
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
    parseDXF,
    chainOpenSegments,
    generateHersheyTextPaths,
    generateStencilTextPaths,
    pointInPoly,
    polyBBox,
    signedArea,
    polyPerimeter,
    analyzeNesting,
    offsetClosedPolygon,
    generatePocketPaths,
    applyDogbones,
    buildContourWithTabs,
    optimizeToolpaths,
    nestPartsOnSheet,
    inspectPreflight,
    removeDuplicatePaths,
    autoCloseOpenContours,
    pathToSvgD,
    drawPathsOnCtx,
    build3DMeshGroup
  };
})(window);
