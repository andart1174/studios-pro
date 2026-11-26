/**
 * Zen Sandscape v4.5 — Interactive Photo / Stencil / Text Composer & Smart CIE-Lab Cutout Engine
 * Features:
 *  - Dual-engine Smart Cutout (100% client-side, instant <150ms, zero heavy downloads):
 *      1) Studio / White / Solid BG 8-connected CIE-Lab Flood-Fill + shadow & halo despill
 *      2) Complex Real-World Photo Cutout (Border K-Means Lab BG model vs Center Saliency FG model
 *         + iterative spatial coherence + largest component filtering — cleanly isolates e.g. a Lion in green grass!)
 *  - Interactive Magic Wand BG Eraser + Keep/Erase Refine Brush + Undo Mask Stack
 *  - 5 Artistic Full-Photo Frame Masks (Rectangle, Soft Vignette, Circle, Zen Arch, Diamond)
 *  - 6 Living Physics Bake Modes (Fixed Statue, Falling Sand, AI Smart Multi-Material Split, Stardust, Ice, Wood)
 *  - 6 Photo Art Stylizers (Original, Kintsugi Gold, Cyber Neon, Sakura Pastel, Marble, Thermal Magma)
 *  - Exact Inverse-Affine Transform Baking (Drag X/Y, Scale, Rotate, Flip H/V — zero holes!)
 *  - Typography Text -> Living Sand Generator (uses the exact same interactive stage!)
 * Zero DOM dependencies for all math/segmentation/baking APIs — 100% Node.js testable!
 */
(function (globalScope) {
  'use strict';

  function SM() { return globalScope.SandMaterials; }

  // =========================================================================
  // 1. FAST PERCEPTUAL CIE-LAB COLOR CONVERSION
  // =========================================================================

  // Precompute sRGB -> linear LUT for ultra-fast Lab conversion
  const SRGB_LIN = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const c = i / 255;
    SRGB_LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function labF(t) {
    return t > 0.008856 ? Math.cbrt(t) : (7.787 * t + 16 / 116);
  }

  function rgbToLab(r, g, b, out) {
    const lr = SRGB_LIN[r & 255];
    const lg = SRGB_LIN[g & 255];
    const lb = SRGB_LIN[b & 255];
    // D65 reference white
    const x = (lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375) / 0.95047;
    const y = (lr * 0.2126729 + lg * 0.7151522 + lb * 0.0721750);
    const z = (lr * 0.0193339 + lg * 0.1191920 + lb * 0.9503041) / 1.08883;
    const fx = labF(x), fy = labF(y), fz = labF(z);
    const L = 116 * fy - 16;
    const A = 500 * (fx - fy);
    const B = 200 * (fy - fz);
    if (out) { out[0] = L; out[1] = A; out[2] = B; return out; }
    return [L, A, B];
  }

  function buildLabBuffers(rgba, w, h) {
    const n = w * h;
    const L = new Float32Array(n);
    const A = new Float32Array(n);
    const B = new Float32Array(n);
    const tmp = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      const p = i << 2;
      rgbToLab(rgba[p], rgba[p + 1], rgba[p + 2], tmp);
      L[i] = tmp[0]; A[i] = tmp[1]; B[i] = tmp[2];
    }
    return { L, A, B };
  }

  function labDistSq(l1, a1, b1, l2, a2, b2) {
    const dl = l1 - l2, da = a1 - a2, db = b1 - b2;
    return dl * dl + da * da + db * db;
  }

  // Lightweight K-Means in CIE-Lab for fast Border BG / Center FG color clustering
  function clusterLab(samples, k, iters = 6) {
    const count = samples.length;
    if (count === 0) return [[50, 0, 0]];
    const kk = Math.min(k, count);
    const centers = [];
    // Deterministic spread initialization (fast, reproducible in tests!)
    const step = Math.max(1, Math.floor(count / kk));
    for (let c = 0; c < kk; c++) {
      const s = samples[Math.min(count - 1, c * step)];
      centers.push([s[0], s[1], s[2]]);
    }
    const sums = Array.from({ length: kk }, () => [0, 0, 0, 0]);
    for (let it = 0; it < iters; it++) {
      for (let c = 0; c < kk; c++) { sums[c][0] = 0; sums[c][1] = 0; sums[c][2] = 0; sums[c][3] = 0; }
      for (let i = 0; i < count; i++) {
        const s = samples[i];
        let best = 0, bestD = 1e18;
        for (let c = 0; c < kk; c++) {
          const d = labDistSq(s[0], s[1], s[2], centers[c][0], centers[c][1], centers[c][2]);
          if (d < bestD) { bestD = d; best = c; }
        }
        sums[best][0] += s[0]; sums[best][1] += s[1]; sums[best][2] += s[2]; sums[best][3] += 1;
      }
      for (let c = 0; c < kk; c++) {
        if (sums[c][3] > 0) {
          centers[c][0] = sums[c][0] / sums[c][3];
          centers[c][1] = sums[c][1] / sums[c][3];
          centers[c][2] = sums[c][2] / sums[c][3];
        }
      }
    }
    return centers;
  }

  // =========================================================================
  // 2. DUAL-ENGINE SMART CUTOUT (STUDIO FLOOD-FILL + COMPLEX REAL-PHOTO LAB)
  // =========================================================================

  function computeSmartCutout(rgba, w, h, opts = {}) {
    const n = w * h;
    const mask = new Uint8Array(n);
    const sens = opts.sensitivity !== undefined ? Math.max(5, Math.min(95, opts.sensitivity)) : 52;
    const feather = opts.feather !== undefined ? Math.max(0, Math.min(6, opts.feather | 0)) : 1;

    // 0. If image already has native transparency (>4% transparent pixels), use native alpha directly!
    let transparentCount = 0;
    for (let i = 0; i < n; i++) {
      if (rgba[(i << 2) + 3] < 32) transparentCount++;
    }
    if (transparentCount > n * 0.04) {
      for (let i = 0; i < n; i++) mask[i] = rgba[(i << 2) + 3];
      return { mask, engineUsed: 'native_alpha' };
    }

    const lab = buildLabBuffers(rgba, w, h);

    // 1. Measure outer perimeter border homogeneity to pick Studio Flood-Fill vs Complex Photo Cutout
    const borderSamples = [];
    const band = Math.max(2, Math.floor(Math.min(w, h) * 0.03));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (x < band || x >= w - band || y < band || y >= h - band) {
          if (((x + y) & 1) === 0) {
            const idx = y * w + x;
            borderSamples.push([lab.L[idx], lab.A[idx], lab.B[idx]]);
          }
        }
      }
    }

    let mL = 0, mA = 0, mB = 0;
    for (let i = 0; i < borderSamples.length; i++) {
      mL += borderSamples[i][0]; mA += borderSamples[i][1]; mB += borderSamples[i][2];
    }
    const bCnt = Math.max(1, borderSamples.length);
    mL /= bCnt; mA /= bCnt; mB /= bCnt;

    let varSum = 0;
    for (let i = 0; i < borderSamples.length; i++) {
      varSum += labDistSq(borderSamples[i][0], borderSamples[i][1], borderSamples[i][2], mL, mA, mB);
    }
    const borderStd = Math.sqrt(varSum / bCnt);

    // 2A. STUDIO / WHITE / SOLID BACKGROUND (e.g. ALL 10 Stencils including Wild Lion, Fire Dragon, Wolf!)
    if (borderStd < 16.5 && opts.forceMode !== 'complex') {
      const thresh = 9 + sens * 0.44;
      const threshSq = thresh * thresh;
      const shadowLumaMin = Math.max(55, mL - 28 - sens * 0.14);
      const isWhiteStudio = mL > 84 && Math.hypot(mA, mB) < 12;

      const visited = new Uint8Array(n);
      const queue = new Int32Array(n);
      let head = 0, tail = 0;

      const isBgPixel = idx => {
        const l = lab.L[idx], a = lab.A[idx], b = lab.B[idx];
        const dSq = labDistSq(l, a, b, mL, mA, mB);
        if (dSq <= threshSq) return true;
        // Also strip soft neutral studio drop-shadows connected to white floor!
        if (isWhiteStudio && l >= shadowLumaMin && (a * a + b * b) < 110) return true;
        return false;
      };

      // Seed BFS from all 4 borders
      for (let x = 0; x < w; x++) {
        const top = x, bot = (h - 1) * w + x;
        if (!visited[top] && isBgPixel(top)) { visited[top] = 1; queue[tail++] = top; }
        if (!visited[bot] && isBgPixel(bot)) { visited[bot] = 1; queue[tail++] = bot; }
      }
      for (let y = 1; y < h - 1; y++) {
        const left = y * w, right = y * w + (w - 1);
        if (!visited[left] && isBgPixel(left)) { visited[left] = 1; queue[tail++] = left; }
        if (!visited[right] && isBgPixel(right)) { visited[right] = 1; queue[tail++] = right; }
      }

      const dxs = [1, -1, 0, 0, 1, -1, 1, -1];
      const dys = [0, 0, 1, -1, 1, 1, -1, -1];
      while (head < tail) {
        const cur = queue[head++];
        const cx = cur % w, cy = (cur / w) | 0;
        for (let d = 0; d < 8; d++) {
          const nx = cx + dxs[d], ny = cy + dys[d];
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const ni = ny * w + nx;
          if (visited[ni]) continue;
          if (isBgPixel(ni)) {
            visited[ni] = 1;
            queue[tail++] = ni;
          }
        }
      }

      // Also clear trapped pure-white interior studio pockets between legs/wings (e.g. under Lion belly/paws!)
      const tightSq = (thresh * 0.58) * (thresh * 0.58);
      for (let i = 0; i < n; i++) {
        if (visited[i]) {
          mask[i] = 0;
        } else if (isWhiteStudio && lab.L[i] > 94 && (lab.A[i] * lab.A[i] + lab.B[i] * lab.B[i]) < 24 && labDistSq(lab.L[i], lab.A[i], lab.B[i], mL, mA, mB) < tightSq) {
          mask[i] = 0;
        } else {
          mask[i] = 255;
        }
      }

      // 1-pixel anti-halo clean pass along silhouette boundary
      const eroded = new Uint8Array(mask);
      for (let y = 1; y < h - 1; y++) {
        const row = y * w;
        for (let x = 1; x < w - 1; x++) {
          const i = row + x;
          if (mask[i] === 0) continue;
          if (mask[i - 1] === 0 || mask[i + 1] === 0 || mask[i - w] === 0 || mask[i + w] === 0) {
            if (isWhiteStudio && lab.L[i] > 80 && (lab.A[i] * lab.A[i] + lab.B[i] * lab.B[i]) < 140) {
              eroded[i] = 0;
            }
          }
        }
      }
      mask.set(eroded);
      if (feather > 0) featherMask(mask, w, h, feather);
      return { mask, engineUsed: 'studio_flood' };
    }

    // 2B. COMPLEX REAL-WORLD PHOTO CUTOUT (e.g. Real Lion in Green Grass & Rocks!)
    // Collect wider perimeter BG samples (outer 11%) & central FG samples (inner 44% ellipse)
    const bgPts = [];
    const fgPts = [];
    const padX = Math.max(4, Math.floor(w * 0.10));
    const padY = Math.max(4, Math.floor(h * 0.10));
    const cx0 = w * 0.5, cy0 = h * 0.52;
    const rxFg = w * 0.27, ryFg = h * 0.30;
    const step = Math.max(1, Math.floor(Math.min(w, h) / 70));

    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const i = y * w + x;
        if (x < padX || x >= w - padX || y < padY || y >= h - padY) {
          bgPts.push([lab.L[i], lab.A[i], lab.B[i]]);
        } else {
          const nx = (x - cx0) / rxFg, ny = (y - cy0) / ryFg;
          if (nx * nx + ny * ny <= 1.0) {
            fgPts.push([lab.L[i], lab.A[i], lab.B[i]]);
          }
        }
      }
    }

    const bgCenters = clusterLab(bgPts, 6, 6);
    // Filter FG points to prefer colors distinct from border BG clusters!
    const cleanFgPts = fgPts.filter(p => {
      let minD = 1e18;
      for (let c = 0; c < bgCenters.length; c++) {
        const d = labDistSq(p[0], p[1], p[2], bgCenters[c][0], bgCenters[c][1], bgCenters[c][2]);
        if (d < minD) minD = d;
      }
      return minD > 140;
    });
    const fgCenters = clusterLab(cleanFgPts.length >= 12 ? cleanFgPts : fgPts, 5, 6);

    // Compute foreground probability map combining Lab likelihood + soft center prior
    const prob = new Float32Array(n);
    const bias = (52 - sens) * 0.0085; // higher sensitivity = removes more BG!
    for (let y = 0; y < h; y++) {
      const ny = (y - cy0) / (h * 0.52);
      const row = y * w;
      for (let x = 0; x < w; x++) {
        const nx = (x - cx0) / (w * 0.50);
        const r2 = nx * nx + ny * ny;
        const i = row + x;
        const l = lab.L[i], a = lab.A[i], b = lab.B[i];

        let dBg = 1e18;
        for (let c = 0; c < bgCenters.length; c++) {
          const d = labDistSq(l, a, b, bgCenters[c][0], bgCenters[c][1], bgCenters[c][2]);
          if (d < dBg) dBg = d;
        }
        let dFg = 1e18;
        for (let c = 0; c < fgCenters.length; c++) {
          const d = labDistSq(l, a, b, fgCenters[c][0], fgCenters[c][1], fgCenters[c][2]);
          if (d < dFg) dFg = d;
        }

        const sdBg = Math.sqrt(dBg);
        const sdFg = Math.sqrt(dFg);
        const colorScore = (sdBg - sdFg) / (sdBg + sdFg + 12);
        const centerPrior = 0.28 * Math.exp(-r2 * 1.45) - (r2 > 0.92 ? 0.28 : 0);
        prob[i] = Math.max(0, Math.min(1, 0.5 + colorScore * 0.85 + centerPrior + bias));
      }
    }

    // 2 iterations of separable box smoothing (spatial coherence!)
    const tmpP = new Float32Array(n);
    for (let pass = 0; pass < 2; pass++) {
      boxBlurFloat(prob, tmpP, w, h, 2);
      prob.set(tmpP);
    }

    // Threshold + keep largest foreground components (removes detached border clutter!)
    const bin = new Uint8Array(n);
    for (let i = 0; i < n; i++) bin[i] = prob[i] >= 0.50 ? 1 : 0;

    // Suppress weak border-touching background bleeds via BFS
    const bgVisited = new Uint8Array(n);
    const q = new Int32Array(n);
    let qh = 0, qt = 0;
    for (let x = 0; x < w; x++) {
      if (prob[x] < 0.62) { bgVisited[x] = 1; q[qt++] = x; }
      const bIdx = (h - 1) * w + x;
      if (prob[bIdx] < 0.58) { bgVisited[bIdx] = 1; q[qt++] = bIdx; }
    }
    for (let y = 1; y < h - 1; y++) {
      const lIdx = y * w, rIdx = y * w + w - 1;
      if (prob[lIdx] < 0.62) { bgVisited[lIdx] = 1; q[qt++] = lIdx; }
      if (prob[rIdx] < 0.62) { bgVisited[rIdx] = 1; q[qt++] = rIdx; }
    }
    while (qh < qt) {
      const cur = q[qh++];
      bin[cur] = 0;
      const cx = cur % w, cy = (cur / w) | 0;
      if (cx > 0 && !bgVisited[cur - 1] && prob[cur - 1] < 0.55) { bgVisited[cur - 1] = 1; q[qt++] = cur - 1; }
      if (cx < w - 1 && !bgVisited[cur + 1] && prob[cur + 1] < 0.55) { bgVisited[cur + 1] = 1; q[qt++] = cur + 1; }
      if (cy > 0 && !bgVisited[cur - w] && prob[cur - w] < 0.55) { bgVisited[cur - w] = 1; q[qt++] = cur - w; }
      if (cy < h - 1 && !bgVisited[cur + w] && prob[cur + w] < 0.55) { bgVisited[cur + w] = 1; q[qt++] = cur + w; }
    }

    keepMainComponents(bin, w, h);

    // Fill tiny interior holes inside subject so fur/eyes never get Swiss-cheesed!
    fillSmallHoles(bin, w, h);

    for (let i = 0; i < n; i++) mask[i] = bin[i] ? 255 : 0;
    if (feather > 0) featherMask(mask, w, h, feather);
    return { mask, engineUsed: 'complex_lab' };
  }

  function boxBlurFloat(src, dst, w, h, r) {
    const tmp = new Float32Array(w * h);
    // Horizontal
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        let sum = 0, cnt = 0;
        const x0 = Math.max(0, x - r), x1 = Math.min(w - 1, x + r);
        for (let k = x0; k <= x1; k++) { sum += src[row + k]; cnt++; }
        tmp[row + x] = sum / cnt;
      }
    }
    // Vertical
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        let sum = 0, cnt = 0;
        const y0 = Math.max(0, y - r), y1 = Math.min(h - 1, y + r);
        for (let k = y0; k <= y1; k++) { sum += tmp[k * w + x]; cnt++; }
        dst[y * w + x] = sum / cnt;
      }
    }
  }

  function keepMainComponents(bin, w, h) {
    const n = w * h;
    const labels = new Int32Array(n);
    const sizes = [0];
    const q = new Int32Array(n);
    let curLabel = 0;
    let bestLabel = 0, bestSize = 0;

    for (let i = 0; i < n; i++) {
      if (!bin[i] || labels[i]) continue;
      curLabel++;
      let qh = 0, qt = 0, size = 0;
      labels[i] = curLabel; q[qt++] = i;
      while (qh < qt) {
        const cur = q[qh++];
        size++;
        const cx = cur % w, cy = (cur / w) | 0;
        if (cx > 0 && bin[cur - 1] && !labels[cur - 1]) { labels[cur - 1] = curLabel; q[qt++] = cur - 1; }
        if (cx < w - 1 && bin[cur + 1] && !labels[cur + 1]) { labels[cur + 1] = curLabel; q[qt++] = cur + 1; }
        if (cy > 0 && bin[cur - w] && !labels[cur - w]) { labels[cur - w] = curLabel; q[qt++] = cur - w; }
        if (cy < h - 1 && bin[cur + w] && !labels[cur + w]) { labels[cur + w] = curLabel; q[qt++] = cur + w; }
      }
      sizes.push(size);
      if (size > bestSize) { bestSize = size; bestLabel = curLabel; }
    }
    if (bestSize === 0) return;
    const minKeep = Math.max(40, bestSize * 0.08);
    for (let i = 0; i < n; i++) {
      const lb = labels[i];
      if (!lb || (lb !== bestLabel && sizes[lb] < minKeep)) bin[i] = 0;
    }
  }

  function fillSmallHoles(bin, w, h) {
    const n = w * h;
    const ext = new Uint8Array(n);
    const q = new Int32Array(n);
    let qh = 0, qt = 0;
    for (let x = 0; x < w; x++) {
      if (!bin[x]) { ext[x] = 1; q[qt++] = x; }
      const b = (h - 1) * w + x;
      if (!bin[b]) { ext[b] = 1; q[qt++] = b; }
    }
    for (let y = 1; y < h - 1; y++) {
      const l = y * w, r = y * w + w - 1;
      if (!bin[l]) { ext[l] = 1; q[qt++] = l; }
      if (!bin[r]) { ext[r] = 1; q[qt++] = r; }
    }
    while (qh < qt) {
      const cur = q[qh++];
      const cx = cur % w, cy = (cur / w) | 0;
      if (cx > 0 && !bin[cur - 1] && !ext[cur - 1]) { ext[cur - 1] = 1; q[qt++] = cur - 1; }
      if (cx < w - 1 && !bin[cur + 1] && !ext[cur + 1]) { ext[cur + 1] = 1; q[qt++] = cur + 1; }
      if (cy > 0 && !bin[cur - w] && !ext[cur - w]) { ext[cur - w] = 1; q[qt++] = cur - w; }
      if (cy < h - 1 && !bin[cur + w] && !ext[cur + w]) { ext[cur + w] = 1; q[qt++] = cur + w; }
    }
    // Any non-exterior zero pixel is an enclosed hole -> fill it!
    for (let i = 0; i < n; i++) {
      if (!bin[i] && !ext[i]) bin[i] = 1;
    }
  }

  function featherMask(mask, w, h, r) {
    const n = w * h;
    const src = new Float32Array(n);
    const dst = new Float32Array(n);
    for (let i = 0; i < n; i++) src[i] = mask[i];
    boxBlurFloat(src, dst, w, h, r);
    for (let i = 0; i < n; i++) {
      // Only soften boundary pixels so core stays crisp opaque!
      mask[i] = mask[i] === 0 && dst[i] < 24 ? 0 : Math.max(0, Math.min(255, Math.round(dst[i])));
    }
  }

  // =========================================================================
  // 3. INTERACTIVE MAGIC WAND, REFINE BRUSH & ARTISTIC FULL-PHOTO FRAME MASKS
  // =========================================================================

  function magicWandErase(rgba, mask, w, h, seedX, seedY, tolerance = 26) {
    const sx = Math.max(0, Math.min(w - 1, seedX | 0));
    const sy = Math.max(0, Math.min(h - 1, seedY | 0));
    const startIdx = sy * w + sx;
    const sp = startIdx << 2;
    const seedLab = rgbToLab(rgba[sp], rgba[sp + 1], rgba[sp + 2]);
    const tolSq = tolerance * tolerance;
    const n = w * h;
    const visited = new Uint8Array(n);
    const q = new Int32Array(n);
    let qh = 0, qt = 0, removed = 0;
    const tmp = [0, 0, 0];

    visited[startIdx] = 1;
    q[qt++] = startIdx;

    while (qh < qt) {
      const cur = q[qh++];
      if (mask[cur] > 0) { mask[cur] = 0; removed++; }
      const cx = cur % w, cy = (cur / w) | 0;
      const neigh = [
        cx > 0 ? cur - 1 : -1,
        cx < w - 1 ? cur + 1 : -1,
        cy > 0 ? cur - w : -1,
        cy < h - 1 ? cur + w : -1
      ];
      for (let k = 0; k < 4; k++) {
        const ni = neigh[k];
        if (ni < 0 || visited[ni]) continue;
        const p = ni << 2;
        rgbToLab(rgba[p], rgba[p + 1], rgba[p + 2], tmp);
        if (labDistSq(tmp[0], tmp[1], tmp[2], seedLab[0], seedLab[1], seedLab[2]) <= tolSq) {
          visited[ni] = 1;
          q[qt++] = ni;
        }
      }
    }
    return removed;
  }

  function applyRefineBrush(mask, w, h, cx, cy, radius, mode) {
    const val = mode === 'keep' ? 255 : 0;
    const r = Math.max(2, Math.round(radius));
    const r2 = r * r;
    const ix = Math.round(cx), iy = Math.round(cy);
    for (let dy = -r; dy <= r; dy++) {
      const y = iy + dy;
      if (y < 0 || y >= h) continue;
      const row = y * w;
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r2) continue;
        const x = ix + dx;
        if (x < 0 || x >= w) continue;
        mask[row + x] = val;
      }
    }
  }

  function buildFullPhotoMask(rgba, w, h, shape = 'rect') {
    const mask = new Uint8Array(w * h);
    const cx = (w - 1) * 0.5, cy = (h - 1) * 0.5;
    const rx = Math.max(1, w * 0.5), ry = Math.max(1, h * 0.5);

    for (let y = 0; y < h; y++) {
      const ny = (y - cy) / ry; // -1..1
      const row = y * w;
      for (let x = 0; x < w; x++) {
        const i = row + x;
        const origA = rgba[(i << 2) + 3];
        if (origA < 20) { mask[i] = 0; continue; }
        const nx = (x - cx) / rx;

        let f = 1;
        if (shape === 'vignette') {
          const edgeDist = Math.min(1 - Math.abs(nx), 1 - Math.abs(ny));
          f = Math.max(0, Math.min(1, edgeDist / 0.24));
          f = f * f * (3 - 2 * f);
        } else if (shape === 'circle') {
          const d = Math.hypot(nx, ny);
          f = d <= 0.90 ? 1 : Math.max(0, 1 - (d - 0.90) / 0.10);
        } else if (shape === 'arch') {
          // Flat bottom + semi-circular cathedral arch top!
          if (ny < 0) {
            const d = Math.hypot(nx, ny);
            f = d <= 0.92 ? 1 : Math.max(0, 1 - (d - 0.92) / 0.08);
          } else {
            f = Math.abs(nx) <= 0.92 ? 1 : Math.max(0, 1 - (Math.abs(nx) - 0.92) / 0.08);
          }
        } else if (shape === 'diamond') {
          const d = Math.abs(nx) + Math.abs(ny);
          f = d <= 0.92 ? 1 : Math.max(0, 1 - (d - 0.92) / 0.08);
        }
        mask[i] = Math.round(origA * f);
      }
    }
    return mask;
  }

  // =========================================================================
  // 4. PHOTO ART STYLIZER & AI SMART MULTI-MATERIAL CLASSIFIER
  // =========================================================================

  function stylizeRGB(r, g, b, style = 'original', brightness = 0, contrast = 0) {
    // Apply micro brightness (-40..40) & contrast (-40..40)
    if (brightness !== 0 || contrast !== 0) {
      const cf = (100 + contrast) / 100;
      r = Math.max(0, Math.min(255, Math.round((r - 128) * cf + 128 + brightness)));
      g = Math.max(0, Math.min(255, Math.round((g - 128) * cf + 128 + brightness)));
      b = Math.max(0, Math.min(255, Math.round((b - 128) * cf + 128 + brightness)));
    }
    if (style === 'original') return [r, g, b];

    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    if (style === 'kintsugi') {
      if (lum > 0.62) return [Math.min(255, Math.round(220 + lum * 35)), Math.round(170 + lum * 68), Math.round(45 + lum * 65)];
      if (lum > 0.34) return [Math.round(110 + lum * 135), Math.round(88 + lum * 95), Math.round(35 + lum * 30)];
      return [Math.round(24 + lum * 70), Math.round(32 + lum * 78), Math.round(52 + lum * 88)];
    }
    if (style === 'cyber') {
      if (lum > 0.60) return [Math.round(40 + lum * 80), Math.min(255, Math.round(180 + lum * 75)), 255];
      if (lum > 0.28) return [Math.min(255, Math.round(175 + lum * 110)), Math.round(35 + lum * 55), Math.round(190 + lum * 60)];
      return [Math.round(20 + lum * 90), Math.round(12 + lum * 55), Math.round(62 + lum * 140)];
    }
    if (style === 'sakura') {
      return [
        Math.min(255, Math.round(160 + lum * 95)),
        Math.min(255, Math.round(85 + lum * 145)),
        Math.min(255, Math.round(125 + lum * 115))
      ];
    }
    if (style === 'marble') {
      const m = Math.round(45 + lum * 205);
      return [Math.min(255, m + 6), m, Math.max(0, m - 8)];
    }
    if (style === 'thermal') {
      if (lum > 0.72) return [255, Math.round(195 + (lum - 0.72) * 210), Math.round((lum - 0.72) * 320)];
      if (lum > 0.38) return [Math.min(255, Math.round(180 + lum * 100)), Math.round((lum - 0.38) * 380), 22];
      return [Math.round(35 + lum * 260), Math.round(14 + lum * 40), Math.round(60 + lum * 90)];
    }
    return [r, g, b];
  }

  function classifyAIMultiMaterial(r, g, b) {
    const { MAT } = SM();
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const sat = max === 0 ? 0 : (max - min) / max;

    if (lum < 48) return MAT.WALL;                                    // Dark sculptural contours stay solid!
    if (lum > 224 && sat < 0.28) return MAT.STARDUST;                 // Luminous highlights shimmer as Stardust!
    if (r > 170 && g > 125 && b < 95 && sat > 0.35) return MAT.GOLD;  // Golden fur / brass -> Kintsugi Gold Leaf!
    if (b > r + 35 && b > g + 15 && sat > 0.32) return MAT.WATER;     // Vivid blues -> Flowing Water!
    if (g > r + 24 && g > b + 20 && sat > 0.28) return MAT.LEAF;      // Lush greens -> Living Foliage!
    return MAT.SAND;                                                  // Everything else -> Full-Color Living Sand!
  }

  // =========================================================================
  // 5. EXACT INVERSE-AFFINE TRANSFORM BAKER TO SANDBOX ENGINE (ZERO HOLES!)
  // =========================================================================

  function bakeTransformedToEngine(engine, params) {
    const { MAT, packRGBA } = SM();
    const {
      rgba, mask, srcW, srcH,
      cx = engine.w * 0.5, cy = engine.h * 0.5,
      scale = 1.0, rotDeg = 0, flipX = false, flipY = false,
      bakeMode = 'statue', style = 'original',
      brightness = 0, contrast = 0,
      clearBefore = false, pauseAfter = false,
      preserveRGB = true, customHex = null
    } = params;

    if (clearBefore) engine.clear();

    const rad = (rotDeg * Math.PI) / 180;
    const cosR = Math.cos(rad), sinR = Math.sin(rad);
    const halfW = (srcW * scale) * 0.5;
    const halfH = (srcH * scale) * 0.5;

    // Compute exact screen-space AABB of the rotated rectangle
    const absCos = Math.abs(cosR), absSin = Math.abs(sinR);
    const bbHalfW = Math.ceil(halfW * absCos + halfH * absSin) + 1;
    const bbHalfH = Math.ceil(halfW * absSin + halfH * absCos) + 1;
    const minX = Math.max(0, Math.floor(cx - bbHalfW));
    const maxX = Math.min(engine.w - 1, Math.ceil(cx + bbHalfW));
    const minY = Math.max(0, Math.floor(cy - bbHalfH));
    const maxY = Math.min(engine.h - 1, Math.ceil(cy + bbHalfH));

    const invScale = 1 / Math.max(0.05, scale);
    const modeToMat = {
      statue: MAT.WALL,
      sand: MAT.SAND,
      gold: MAT.GOLD,
      stardust: MAT.STARDUST,
      ice: MAT.ICE,
      wood: MAT.WOOD,
      firework: MAT.FIREWORK,
      snow: MAT.SNOW
    };

    let baked = 0;
    for (let ty = minY; ty <= maxY; ty++) {
      const dy = ty - cy;
      const row = ty * engine.w;
      for (let tx = minX; tx <= maxX; tx++) {
        const dx = tx - cx;
        // Inverse rotate & scale back to source image coordinates
        let lx = (dx * cosR + dy * sinR) * invScale;
        let ly = (-dx * sinR + dy * cosR) * invScale;
        if (flipX) lx = -lx;
        if (flipY) ly = -ly;

        const sx = Math.floor(lx + srcW * 0.5);
        const sy = Math.floor(ly + srcH * 0.5);
        if (sx < 0 || sx >= srcW || sy < 0 || sy >= srcH) continue;

        const sIdx = sy * srcW + sx;
        const mAlpha = mask ? mask[sIdx] : rgba[(sIdx << 2) + 3];
        if (mAlpha < 36) continue;
        // Stochastic dithering for feathered translucent edges (melts naturally into sand!)
        if (mAlpha < 235 && (Math.random() * 255) > mAlpha) continue;

        const p = sIdx << 2;
        const [sr, sg, sb] = stylizeRGB(rgba[p], rgba[p + 1], rgba[p + 2], style, brightness, contrast);
        const matId = bakeMode === 'ai_split'
          ? classifyAIMultiMaterial(sr, sg, sb)
          : (modeToMat[bakeMode] !== undefined ? modeToMat[bakeMode] : MAT.SAND);

        const col = preserveRGB
          ? packRGBA(sr, sg, sb, 255)
          : engine.pickColorForMaterial(matId, customHex);

        const initMeta = matId === MAT.FIREWORK
          ? 24 + ((Math.random() * 28) | 0)
          : (matId === MAT.STARDUST ? ((tx + ty) & 255) : 0);

        engine.setCell(row + tx, matId, col, initMeta);
        baked++;
      }
    }

    if (pauseAfter) engine.isPaused = true;
    engine._scanSpecials();
    engine.pushUndo();
    return baked;
  }

  // =========================================================================
  // 6. INTERACTIVE ON-CANVAS STAGE CONTROLLER (BROWSER ONLY)
  // =========================================================================

  class InteractivePhotoStage {
    constructor(canvasW = 600, canvasH = 420) {
      this.canvasW = canvasW;
      this.canvasH = canvasH;
      this.active = false;
      this.session = null;
    }

    openFromCanvas(srcCanvas, label = 'Photo', opts = {}) {
      // Fit working source resolution cleanly <= 360px for instant <100ms Lab cutout & crisp stamping
      const maxDim = 340;
      const ratio = Math.min(1, maxDim / Math.max(srcCanvas.width, srcCanvas.height));
      const w = Math.max(24, Math.round(srcCanvas.width * ratio));
      const h = Math.max(24, Math.round(srcCanvas.height * ratio));

      const work = document.createElement('canvas');
      work.width = w; work.height = h;
      const wctx = work.getContext('2d');
      wctx.drawImage(srcCanvas, 0, 0, w, h);
      const imgData = wctx.getImageData(0, 0, w, h);

      const previewCanvas = document.createElement('canvas');
      previewCanvas.width = w; previewCanvas.height = h;

      const defaultScale = Math.min((this.canvasW * 0.66) / w, (this.canvasH * 0.72) / h);

      this.session = {
        label,
        srcW: w, srcH: h,
        rgba: new Uint8ClampedArray(imgData.data),
        mask: new Uint8Array(w * h),
        undoMasks: [],
        previewCanvas,
        previewCtx: previewCanvas.getContext('2d'),
        cx: this.canvasW * 0.5,
        cy: this.canvasH * 0.52,
        scale: Math.max(0.25, Math.min(1.8, defaultScale)),
        rotDeg: 0,
        flipX: false,
        flipY: false,
        cutoutMode: opts.cutoutMode || 'object', // 'object' (default recommended!) | 'full'
        shapeMask: 'rect',                        // 'rect' | 'vignette' | 'circle' | 'arch' | 'diamond'
        sensitivity: 52,
        feather: 1,
        wandTol: 28,
        tool: 'move',                             // 'move' | 'wand' | 'keep' | 'erase'
        refineRadius: 12,
        bakeMode: opts.bakeMode || 'statue',      // 'statue' | 'sand' | 'ai_split' | 'stardust' | 'ice' | 'wood'
        style: 'original',
        brightness: 0,
        contrast: 0,
        clearBefore: false,
        pauseAfter: false,
        engineUsed: 'studio_flood'
      };

      this.active = true;
      this.recomputeMask(false);
      return this.session;
    }

    close() {
      this.active = false;
      this.session = null;
    }

    pushMaskUndo() {
      if (!this.session) return;
      this.session.undoMasks.push(new Uint8Array(this.session.mask));
      if (this.session.undoMasks.length > 10) this.session.undoMasks.shift();
    }

    undoMask() {
      if (!this.session || !this.session.undoMasks.length) return false;
      this.session.mask = this.session.undoMasks.pop();
      this.rebuildPreview();
      return true;
    }

    recomputeMask(saveUndo = true) {
      const s = this.session;
      if (!s) return;
      if (saveUndo) this.pushMaskUndo();
      if (s.cutoutMode === 'full') {
        s.mask = buildFullPhotoMask(s.rgba, s.srcW, s.srcH, s.shapeMask);
        s.engineUsed = 'full_photo';
      } else {
        const res = computeSmartCutout(s.rgba, s.srcW, s.srcH, {
          sensitivity: s.sensitivity,
          feather: s.feather
        });
        s.mask = res.mask;
        s.engineUsed = res.engineUsed;
      }
      this.rebuildPreview();
    }

    rebuildPreview() {
      const s = this.session;
      if (!s) return;
      const out = s.previewCtx.createImageData(s.srcW, s.srcH);
      const dst = out.data;
      const src = s.rgba;
      const mask = s.mask;
      const n = s.srcW * s.srcH;
      for (let i = 0; i < n; i++) {
        const p = i << 2;
        const a = mask[i];
        if (a === 0) { dst[p + 3] = 0; continue; }
        const [r, g, b] = stylizeRGB(src[p], src[p + 1], src[p + 2], s.style, s.brightness, s.contrast);
        dst[p] = r; dst[p + 1] = g; dst[p + 2] = b; dst[p + 3] = a;
      }
      s.previewCtx.putImageData(out, 0, 0);
    }

    // Convert canvas point -> source image local pixel coordinates
    canvasToSource(x, y) {
      const s = this.session;
      if (!s) return null;
      const rad = (s.rotDeg * Math.PI) / 180;
      const cosR = Math.cos(rad), sinR = Math.sin(rad);
      const dx = x - s.cx, dy = y - s.cy;
      let lx = (dx * cosR + dy * sinR) / Math.max(0.05, s.scale);
      let ly = (-dx * sinR + dy * cosR) / Math.max(0.05, s.scale);
      if (s.flipX) lx = -lx;
      if (s.flipY) ly = -ly;
      const sx = Math.floor(lx + s.srcW * 0.5);
      const sy = Math.floor(ly + s.srcH * 0.5);
      if (sx < 0 || sx >= s.srcW || sy < 0 || sy >= s.srcH) return null;
      return [sx, sy];
    }

    // Compute exact screen corners & top rotate knob for drawing & hit testing!
    getHandles() {
      const s = this.session;
      if (!s) return null;
      const rad = (s.rotDeg * Math.PI) / 180;
      const cosR = Math.cos(rad), sinR = Math.sin(rad);
      const hw = (s.srcW * s.scale) * 0.5;
      const hh = (s.srcH * s.scale) * 0.5;
      const pt = (lx, ly) => ({
        x: s.cx + lx * cosR - ly * sinR,
        y: s.cy + lx * sinR + ly * cosR
      });
      return {
        nw: pt(-hw, -hh),
        ne: pt(hw, -hh),
        se: pt(hw, hh),
        sw: pt(-hw, hh),
        rot: pt(0, -hh - 22),
        topMid: pt(0, -hh)
      };
    }

    hitTest(x, y) {
      const s = this.session;
      if (!s) return 'none';
      const h = this.getHandles();
      const near = (p, r = 12) => Math.hypot(x - p.x, y - p.y) <= r;
      if (near(h.rot, 13)) return 'rotate';
      if (near(h.nw, 12)) return 'nw';
      if (near(h.ne, 12)) return 'ne';
      if (near(h.se, 12)) return 'se';
      if (near(h.sw, 12)) return 'sw';
      if (this.canvasToSource(x, y)) return 'body';
      return 'none';
    }

    align(preset) {
      const s = this.session;
      if (!s) return;
      if (preset === 'center') {
        s.cx = this.canvasW * 0.5;
        s.cy = this.canvasH * 0.5;
      } else if (preset === 'ground') {
        s.cx = this.canvasW * 0.5;
        s.rotDeg = 0;
        s.cy = this.canvasH - (s.srcH * s.scale) * 0.5 - 6;
      } else if (preset === 'fit') {
        s.cx = this.canvasW * 0.5;
        s.cy = this.canvasH * 0.5;
        s.rotDeg = 0;
        s.scale = Math.min((this.canvasW * 0.92) / s.srcW, (this.canvasH * 0.92) / s.srcH);
      }
    }

    applyMagicWandAt(x, y) {
      const pt = this.canvasToSource(x, y);
      if (!pt) return 0;
      this.pushMaskUndo();
      const removed = magicWandErase(this.session.rgba, this.session.mask, this.session.srcW, this.session.srcH, pt[0], pt[1], this.session.wandTol);
      this.rebuildPreview();
      return removed;
    }

    applyRefineAt(x, y, mode) {
      const pt = this.canvasToSource(x, y);
      if (!pt) return false;
      applyRefineBrush(this.session.mask, this.session.srcW, this.session.srcH, pt[0], pt[1], this.session.refineRadius / Math.max(0.25, this.session.scale), mode);
      this.rebuildPreview();
      return true;
    }

    bakeTo(engine) {
      const s = this.session;
      if (!s) return 0;
      const count = bakeTransformedToEngine(engine, s);
      this.close();
      return count;
    }

    // Create crisp RGBA text canvas for Typography -> Living Sand!
    static createTextCanvas(text, fontStyle = 'bold', colorHex = '#f5c542') {
      const clean = String(text || 'ZEN').trim().slice(0, 26) || 'ZEN';
      const cv = document.createElement('canvas');
      cv.width = 480;
      cv.height = 170;
      const ctx = cv.getContext('2d');
      const fonts = {
        bold:   '900 76px "Space Grotesk", "Inter", sans-serif',
        serif:  '700 74px Georgia, "Times New Roman", serif',
        neon:   '700 68px "Courier New", monospace',
        script: 'italic 700 78px Georgia, cursive'
      };
      ctx.font = fonts[fontStyle] || fonts.bold;
      // Auto-shrink font if text is wide
      let size = 76;
      while (ctx.measureText(clean).width > 430 && size > 24) {
        size -= 4;
        ctx.font = (fonts[fontStyle] || fonts.bold).replace(/\d+px/, `${size}px`);
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = colorHex || '#f5c542';
      ctx.fillText(clean, cv.width * 0.5, cv.height * 0.5);
      // Trim tight bounding box around drawn glyphs
      const data = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let minX = cv.width, maxX = 0, minY = cv.height, maxY = 0;
      for (let y = 0; y < cv.height; y++) {
        for (let x = 0; x < cv.width; x++) {
          if (data[(y * cv.width + x) * 4 + 3] > 25) {
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX <= minX || maxY <= minY) return cv;
      const pad = 12;
      const cw = Math.min(cv.width, maxX - minX + pad * 2);
      const ch = Math.min(cv.height, maxY - minY + pad * 2);
      const out = document.createElement('canvas');
      out.width = cw; out.height = ch;
      out.getContext('2d').drawImage(cv, Math.max(0, minX - pad), Math.max(0, minY - pad), cw, ch, 0, 0, cw, ch);
      return out;
    }
  }

  const PhotoComposer = {
    rgbToLab,
    computeSmartCutout,
    magicWandErase,
    applyRefineBrush,
    buildFullPhotoMask,
    stylizeRGB,
    classifyAIMultiMaterial,
    bakeTransformedToEngine,
    InteractivePhotoStage
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = PhotoComposer;
  if (globalScope) globalScope.PhotoComposer = PhotoComposer;
})(typeof window !== 'undefined' ? window : globalThis);
