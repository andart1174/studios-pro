/**
 * DFX Studio Pro — High-Speed Raster Image Processing, Edge Detection,
 * Adaptive Sauvola Paper Scanner, Laser Dithering & True 24/8/1-bit BMP Engine.
 *
 * Pure ES5/ES6 UMD module (zero DOM requirement for core math -> 100% testable in Node.js).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DfxRaster = factory();
  }
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  function clamp255(v) {
    return v < 0 ? 0 : (v > 255 ? 255 : v);
  }

  /**
   * Compute luminance histogram (256 bins) & optimal Auto-Enhance settings
   * via 2% - 98% percentile contrast stretch + midtone gamma balancing.
   */
  function computeAutoEnhance(srcRGBA, width, height) {
    const n = width * height;
    if (!n) return { brightness: 0, contrast: 0, gamma: 1.0, threshold: 128 };
    const hist = new Uint32Array(256);
    for (let i = 0; i < srcRGBA.length; i += 4) {
      const a = srcRGBA[i + 3] / 255;
      const r = srcRGBA[i] * a + 255 * (1 - a);
      const g = srcRGBA[i + 1] * a + 255 * (1 - a);
      const b = srcRGBA[i + 2] * a + 255 * (1 - a);
      const lum = Math.min(255, Math.max(0, Math.round(0.299 * r + 0.587 * g + 0.114 * b)));
      hist[lum]++;
    }
    const lowTarget = Math.floor(n * 0.02);
    const highTarget = Math.floor(n * 0.98);
    let acc = 0, pLow = 0, pHigh = 255;
    for (let i = 0; i < 256; i++) {
      acc += hist[i];
      if (acc >= lowTarget) { pLow = i; break; }
    }
    acc = 0;
    for (let i = 0; i < 256; i++) {
      acc += hist[i];
      if (acc >= highTarget) { pHigh = i; break; }
    }
    const span = Math.max(20, pHigh - pLow);
    const mid = (pLow + pHigh) * 0.5;
    // Target span ~ 230, target center ~ 128
    const brightness = Math.max(-60, Math.min(60, Math.round((128 - mid) * 0.45)));
    const gain = Math.min(2.4, Math.max(1.0, 235 / span));
    const contrast = Math.max(-50, Math.min(80, Math.round((gain - 1) * 55)));
    // Compute Otsu threshold on histogram
    const otsu = computeOtsuFromHist(hist, n);
    // Gentle gamma adjustment if image is heavily dark/light skewed
    let mean = 0;
    for (let i = 0; i < 256; i++) mean += i * hist[i];
    mean /= n;
    let gamma = 1.0;
    if (mean < 95) gamma = 1.25;
    else if (mean > 185) gamma = 0.85;
    return { brightness, contrast, gamma: Number(gamma.toFixed(1)), threshold: otsu, pLow, pHigh };
  }

  function computeOtsuFromHist(hist, total) {
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += i * hist[i];
    let sumB = 0, wB = 0, maxVar = -1, bestT = 128;
    for (let t = 0; t < 256; t++) {
      wB += hist[t];
      if (wB === 0) continue;
      const wF = total - wB;
      if (wF === 0) break;
      sumB += t * hist[t];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const diff = mB - mF;
      const between = wB * wF * diff * diff;
      if (between > maxVar) {
        maxVar = between;
        bestT = t;
      }
    }
    return bestT;
  }

  function computeOtsuThreshold(gray) {
    const hist = new Uint32Array(256);
    for (let i = 0; i < gray.length; i++) {
      hist[Math.min(255, Math.max(0, Math.round(gray[i])))]++;
    }
    return computeOtsuFromHist(hist, gray.length);
  }

  /**
   * Separable Gaussian blur O(W * H * R) — orders of magnitude faster than 2D convolution.
   */
  function gaussianBlurGray(src, w, h, sigma) {
    if (sigma <= 0.15) return new Float32Array(src);
    const radius = Math.min(12, Math.max(1, Math.ceil(sigma * 2.5)));
    const kSize = radius * 2 + 1;
    const kernel = new Float32Array(kSize);
    const denom = 2 * sigma * sigma;
    let sum = 0;
    for (let i = -radius; i <= radius; i++) {
      const val = Math.exp(-(i * i) / denom);
      kernel[i + radius] = val;
      sum += val;
    }
    for (let i = 0; i < kSize; i++) kernel[i] /= sum;

    const tmp = new Float32Array(w * h);
    const dst = new Float32Array(w * h);

    // Horizontal pass
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        let acc = 0;
        for (let k = -radius; k <= radius; k++) {
          let sx = x + k;
          if (sx < 0) sx = 0;
          else if (sx >= w) sx = w - 1;
          acc += src[row + sx] * kernel[k + radius];
        }
        tmp[row + x] = acc;
      }
    }
    // Vertical pass
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let acc = 0;
        for (let k = -radius; k <= radius; k++) {
          let sy = y + k;
          if (sy < 0) sy = 0;
          else if (sy >= h) sy = h - 1;
          acc += tmp[sy * w + x] * kernel[k + radius];
        }
        dst[y * w + x] = acc;
      }
    }
    return dst;
  }

  /**
   * Fast LUT-accelerated edge-preserving Bilateral Filter (capped kernel radius <= 4).
   * Eliminates the old 1.3-billion Math.exp() UI freeze.
   */
  function bilateralFilterGray(src, w, h, strength, sigmaColor) {
    if (strength <= 0) return new Float32Array(src);
    const radius = Math.min(4, Math.max(1, Math.round(strength)));
    const sigmaSpace = Math.max(0.8, strength * 0.9);
    const sColor = Math.max(12, sigmaColor || (strength * 14 + 18));

    // Precompute 256-entry range weight LUT
    const rangeLUT = new Float32Array(256);
    const inv2sc2 = 1 / (2 * sColor * sColor);
    for (let d = 0; d < 256; d++) {
      rangeLUT[d] = Math.exp(-d * d * inv2sc2);
    }

    // Precompute spatial weights for (2r+1)x(2r+1)
    const side = radius * 2 + 1;
    const spaceW = new Float32Array(side * side);
    const inv2ss2 = 1 / (2 * sigmaSpace * sigmaSpace);
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        spaceW[(dy + radius) * side + (dx + radius)] = Math.exp(-(dx * dx + dy * dy) * inv2ss2);
      }
    }

    const dst = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      const yMin = Math.max(0, y - radius);
      const yMax = Math.min(h - 1, y + radius);
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const center = src[idx];
        const xMin = Math.max(0, x - radius);
        const xMax = Math.min(w - 1, x + radius);
        let wSum = 0, vSum = 0;
        for (let ny = yMin; ny <= yMax; ny++) {
          const sRow = (ny - y + radius) * side;
          const nRow = ny * w;
          for (let nx = xMin; nx <= xMax; nx++) {
            const val = src[nRow + nx];
            let diff = Math.round(Math.abs(center - val));
            if (diff > 255) diff = 255;
            const wt = spaceW[sRow + (nx - x + radius)] * rangeLUT[diff];
            wSum += wt;
            vSum += wt * val;
          }
        }
        dst[idx] = wSum > 0 ? vSum / wSum : center;
      }
    }
    return dst;
  }

  /**
   * Zero-allocation fast 3x3 Median filter (insertion sort on fixed 9-element buffer).
   */
  function median3x3Gray(src, w, h) {
    const dst = new Float32Array(src);
    const buf = new Float32Array(9);
    for (let y = 1; y < h - 1; y++) {
      const r0 = (y - 1) * w, r1 = y * w, r2 = (y + 1) * w;
      for (let x = 1; x < w - 1; x++) {
        buf[0] = src[r0 + x - 1]; buf[1] = src[r0 + x]; buf[2] = src[r0 + x + 1];
        buf[3] = src[r1 + x - 1]; buf[4] = src[r1 + x]; buf[5] = src[r1 + x + 1];
        buf[6] = src[r2 + x - 1]; buf[7] = src[r2 + x]; buf[8] = src[r2 + x + 1];
        // Insertion sort 9 items
        for (let i = 1; i < 9; i++) {
          const key = buf[i];
          let j = i - 1;
          while (j >= 0 && buf[j] > key) { buf[j + 1] = buf[j]; j--; }
          buf[j + 1] = key;
        }
        dst[r1 + x] = buf[4];
      }
    }
    return dst;
  }

  /**
   * Separable 3x3 Morphology (erode = thin dark lines -> max brightness;
   * dilate = thicken dark lines -> min brightness; open; close).
   * Note: In dark-ink-on-white-paper convention:
   * - Erode ink (thin dark lines): local MAX of brightness (shrinks black regions)
   * - Dilate ink (thicken dark lines): local MIN of brightness (expands black regions)
   */
  function morphPassGray(src, w, h, type) {
    const isMax = type === 'erode'; // erode dark ink = expand white
    const tmp = new Float32Array(w * h);
    const dst = new Float32Array(w * h);
    // Horizontal 3-tap
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        const xm = x > 0 ? x - 1 : 0;
        const xp = x < w - 1 ? x + 1 : w - 1;
        const a = src[row + xm], b = src[row + x], c = src[row + xp];
        tmp[row + x] = isMax ? Math.max(a, b, c) : Math.min(a, b, c);
      }
    }
    // Vertical 3-tap
    for (let y = 0; y < h; y++) {
      const ym = (y > 0 ? y - 1 : 0) * w;
      const y0 = y * w;
      const yp = (y < h - 1 ? y + 1 : h - 1) * w;
      for (let x = 0; x < w; x++) {
        const a = tmp[ym + x], b = tmp[y0 + x], c = tmp[yp + x];
        dst[y0 + x] = isMax ? Math.max(a, b, c) : Math.min(a, b, c);
      }
    }
    return dst;
  }

  function applyMorphologyGray(src, w, h, mode) {
    switch (mode) {
      case 1: return morphPassGray(src, w, h, 'erode');
      case 2: return morphPassGray(src, w, h, 'dilate');
      case 3: return morphPassGray(morphPassGray(src, w, h, 'erode'), w, h, 'dilate'); // Open: remove dark speckles
      case 4: return morphPassGray(morphPassGray(src, w, h, 'dilate'), w, h, 'erode'); // Close: bridge small gaps
      default: return src;
    }
  }

  /**
   * Line Strength (0..100): Dark-stroke deepening + black-hat local boost for sketches & blueprints.
   */
  function applyLineStrengthGray(src, w, h, strength) {
    if (strength <= 0) return src;
    const k = strength / 100;
    const blurred = gaussianBlurGray(src, w, h, 2.5);
    const dst = new Float32Array(src.length);
    for (let i = 0; i < src.length; i++) {
      // Where pixel is darker than local neighborhood, deepen it aggressively
      const localDiff = blurred[i] - src[i];
      let v = src[i];
      if (localDiff > 2) {
        v -= localDiff * k * 2.2;
      } else if (v > 200) {
        // Gently brighten clean paper background
        v += (255 - v) * k * 0.25;
      }
      dst[i] = clamp255(v);
    }
    return dst;
  }

  /**
   * Real 3x3 Sharpen (0..100).
   */
  function applySharpenGray(src, w, h, amount) {
    if (amount <= 0) return src;
    const k = (amount / 100) * 1.4;
    const dst = new Float32Array(src);
    for (let y = 1; y < h - 1; y++) {
      const r0 = (y - 1) * w, r1 = y * w, r2 = (y + 1) * w;
      for (let x = 1; x < w - 1; x++) {
        const c = src[r1 + x];
        const lap = 4 * c - src[r0 + x] - src[r2 + x] - src[r1 + x - 1] - src[r1 + x + 1];
        dst[r1 + x] = clamp255(c + k * lap);
      }
    }
    return dst;
  }

  /**
   * Adaptive Sauvola Local Threshold using O(W*H) 2D Integral Images.
   * Removes uneven phone camera shadows on photographed paper sketches!
   * Returns Uint8Array binary (1 = dark foreground ink, 0 = white background).
   */
  function sauvolaThreshold(gray, w, h, windowRadius, k) {
    const r = Math.max(4, Math.min(35, windowRadius || 15));
    const kv = typeof k === 'number' ? k : 0.22;
    const stride = w + 1;
    const intSum = new Float64Array(stride * (h + 1));
    const intSq = new Float64Array(stride * (h + 1));

    for (let y = 0; y < h; y++) {
      let rowS = 0, rowSq = 0;
      const gRow = y * w;
      const prevRow = y * stride;
      const curRow = (y + 1) * stride;
      for (let x = 0; x < w; x++) {
        const v = gray[gRow + x];
        rowS += v;
        rowSq += v * v;
        intSum[curRow + x + 1] = intSum[prevRow + x + 1] + rowS;
        intSq[curRow + x + 1] = intSq[prevRow + x + 1] + rowSq;
      }
    }

    const bin = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      const y1 = Math.max(0, y - r);
      const y2 = Math.min(h - 1, y + r);
      const r1 = y1 * stride;
      const r2 = (y2 + 1) * stride;
      for (let x = 0; x < w; x++) {
        const x1 = Math.max(0, x - r);
        const x2 = Math.min(w - 1, x + r);
        const area = (x2 - x1 + 1) * (y2 - y1 + 1);
        const sum = intSum[r2 + x2 + 1] - intSum[r1 + x2 + 1] - intSum[r2 + x1] + intSum[r1 + x1];
        const sq = intSq[r2 + x2 + 1] - intSq[r1 + x2 + 1] - intSq[r2 + x1] + intSq[r1 + x1];
        const mean = sum / area;
        const variance = Math.max(0, sq / area - mean * mean);
        const std = Math.sqrt(variance);
        const thresh = mean * (1 + kv * (std / 128 - 1));
        bin[y * w + x] = gray[y * w + x] < thresh ? 1 : 0;
      }
    }
    return bin;
  }

  /**
   * True Canny Edge Detector (Gaussian -> Sobel Gx/Gy -> 4-dir NMS -> Hysteresis BFS).
   * Fixes the completely broken "Edge Detection" dropdown that used to run Floyd-Steinberg!
   * Returns Uint8Array binary (1 = edge ink, 0 = background).
   */
  function cannyEdgeDetect(gray, w, h, lowRatio, highRatio, sigma) {
    const smooth = gaussianBlurGray(gray, w, h, sigma || 1.2);
    const mag = new Float32Array(w * h);
    const dir = new Uint8Array(w * h); // 0:0deg, 1:45deg, 2:90deg, 3:135deg
    let maxMag = 0;

    for (let y = 1; y < h - 1; y++) {
      const r0 = (y - 1) * w, r1 = y * w, r2 = (y + 1) * w;
      for (let x = 1; x < w - 1; x++) {
        const gx = -smooth[r0 + x - 1] + smooth[r0 + x + 1]
          - 2 * smooth[r1 + x - 1] + 2 * smooth[r1 + x + 1]
          - smooth[r2 + x - 1] + smooth[r2 + x + 1];
        const gy = -smooth[r0 + x - 1] - 2 * smooth[r0 + x] - smooth[r0 + x + 1]
          + smooth[r2 + x - 1] + 2 * smooth[r2 + x] + smooth[r2 + x + 1];
        const m = Math.hypot(gx, gy);
        const idx = r1 + x;
        mag[idx] = m;
        if (m > maxMag) maxMag = m;
        let ang = Math.atan2(gy, gx) * (180 / Math.PI);
        if (ang < 0) ang += 180;
        if (ang < 22.5 || ang >= 157.5) dir[idx] = 0;
        else if (ang < 67.5) dir[idx] = 1;
        else if (ang < 112.5) dir[idx] = 2;
        else dir[idx] = 3;
      }
    }

    if (maxMag < 1e-3) return new Uint8Array(w * h);

    // Non-Maximum Suppression
    const nms = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        const m = mag[idx];
        if (m <= 0) continue;
        let q = 0, r = 0;
        const d = dir[idx];
        if (d === 0) { q = mag[idx + 1]; r = mag[idx - 1]; }
        else if (d === 1) { q = mag[(y + 1) * w + x + 1]; r = mag[(y - 1) * w + x - 1]; }
        else if (d === 2) { q = mag[(y + 1) * w + x]; r = mag[(y - 1) * w + x]; }
        else { q = mag[(y + 1) * w + x - 1]; r = mag[(y - 1) * w + x + 1]; }
        if (m >= q && m >= r) nms[idx] = m;
      }
    }

    // Double threshold & Hysteresis BFS
    const hiT = Math.max(18, maxMag * (highRatio || 0.22));
    const loT = Math.max(8, hiT * (lowRatio || 0.42));
    const edges = new Uint8Array(w * h); // 0=none, 1=weak, 2=strong
    const stack = [];
    for (let i = 0; i < nms.length; i++) {
      if (nms[i] >= hiT) {
        edges[i] = 2;
        stack.push(i);
      } else if (nms[i] >= loT) {
        edges[i] = 1;
      }
    }

    while (stack.length > 0) {
      const idx = stack.pop();
      const x = idx % w;
      const y = (idx - x) / w;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          if (nx < 0 || nx >= w) continue;
          const nIdx = ny * w + nx;
          if (edges[nIdx] === 1) {
            edges[nIdx] = 2;
            stack.push(nIdx);
          }
        }
      }
    }

    const bin = new Uint8Array(w * h);
    for (let i = 0; i < edges.length; i++) {
      bin[i] = edges[i] === 2 ? 1 : 0;
    }
    return bin;
  }

  /**
   * 8 Laser Dithering / Halftone Algorithms.
   * Returns Uint8Array binary (1 = dark laser burn pixel, 0 = white/unburned).
   */
  const DITHER_KERNELS = {
    'Floyd-Steinberg': [[1, 0, 7 / 16], [-1, 1, 3 / 16], [0, 1, 5 / 16], [1, 1, 1 / 16]],
    'Atkinson (Sharper)': [[1, 0, 1 / 8], [2, 0, 1 / 8], [-1, 1, 1 / 8], [0, 1, 1 / 8], [1, 1, 1 / 8], [0, 2, 1 / 8]],
    'Stucki': [
      [1, 0, 8 / 42], [2, 0, 4 / 42],
      [-2, 1, 2 / 42], [-1, 1, 4 / 42], [0, 1, 8 / 42], [1, 1, 4 / 42], [2, 1, 2 / 42],
      [-2, 2, 1 / 42], [-1, 2, 2 / 42], [0, 2, 4 / 42], [1, 2, 2 / 42], [2, 2, 1 / 42]
    ],
    'Sierra-Lite': [[1, 0, 2 / 4], [-1, 1, 1 / 4], [0, 1, 1 / 4]],
    'Jarvis-Judice-Ninke': [
      [1, 0, 7 / 48], [2, 0, 5 / 48],
      [-2, 1, 3 / 48], [-1, 1, 5 / 48], [0, 1, 7 / 48], [1, 1, 5 / 48], [2, 1, 3 / 48],
      [-2, 2, 1 / 48], [-1, 2, 3 / 48], [0, 2, 5 / 48], [1, 2, 3 / 48], [2, 2, 1 / 48]
    ]
  };

  const BAYER_4X4 = [
    0, 8, 2, 10,
    12, 4, 14, 6,
    3, 11, 1, 9,
    15, 7, 13, 5
  ];

  function applyDithering(gray, w, h, mode, threshold) {
    const t = typeof threshold === 'number' ? threshold : 128;
    const bin = new Uint8Array(w * h);

    if (mode === 'Ordered Bayer 4x4') {
      for (let y = 0; y < h; y++) {
        const by = (y & 3) * 4;
        for (let x = 0; x < w; x++) {
          const bVal = (BAYER_4X4[by + (x & 3)] + 0.5) * (255 / 16);
          const adjusted = gray[y * w + x] + (128 - t);
          bin[y * w + x] = adjusted < bVal ? 1 : 0;
        }
      }
      return bin;
    }

    const kernel = DITHER_KERNELS[mode] || DITHER_KERNELS['Floyd-Steinberg'];
    const buf = new Float32Array(gray);
    for (let y = 0; y < h; y++) {
      // Serpentine scan avoids directional worm artifacts on laser engraving!
      const reverse = (y & 1) === 1;
      const start = reverse ? w - 1 : 0;
      const end = reverse ? -1 : w;
      const step = reverse ? -1 : 1;
      for (let x = start; x !== end; x += step) {
        const idx = y * w + x;
        const oldV = buf[idx];
        const newV = oldV < t ? 0 : 255;
        bin[idx] = newV === 0 ? 1 : 0;
        const err = oldV - newV;
        for (let k = 0; k < kernel.length; k++) {
          const dx = reverse ? -kernel[k][0] : kernel[k][0];
          const dy = kernel[k][1];
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            buf[ny * w + nx] += err * kernel[k][2];
          }
        }
      }
    }
    return bin;
  }

  /**
   * Zhang-Suen / Guo-Hall Hybrid Topological Thinning (1-pixel skeleton, preserves connectivity).
   * Input/output: Uint8Array (1 = dark foreground, 0 = background).
   */
  function thinBinary(srcBin, w, h, maxIterations) {
    const out = new Uint8Array(srcBin);
    const maxIt = maxIterations > 0 ? maxIterations : 60;
    const toRemove = new Int32Array(w * h);

    for (let iter = 0; iter < maxIt; iter++) {
      let changed = false;
      for (let sub = 0; sub < 2; sub++) {
        let count = 0;
        for (let y = 1; y < h - 1; y++) {
          const r0 = (y - 1) * w, r1 = y * w, r2 = (y + 1) * w;
          for (let x = 1; x < w - 1; x++) {
            if (out[r1 + x] === 0) continue;
            const p2 = out[r0 + x];
            const p3 = out[r0 + x + 1];
            const p4 = out[r1 + x + 1];
            const p5 = out[r2 + x + 1];
            const p6 = out[r2 + x];
            const p7 = out[r2 + x - 1];
            const p8 = out[r1 + x - 1];
            const p9 = out[r0 + x - 1];

            const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
            if (B < 2 || B > 6) continue;

            const A = ((p2 === 0 && p3 === 1) ? 1 : 0) +
              ((p3 === 0 && p4 === 1) ? 1 : 0) +
              ((p4 === 0 && p5 === 1) ? 1 : 0) +
              ((p5 === 0 && p6 === 1) ? 1 : 0) +
              ((p6 === 0 && p7 === 1) ? 1 : 0) +
              ((p7 === 0 && p8 === 1) ? 1 : 0) +
              ((p8 === 0 && p9 === 1) ? 1 : 0) +
              ((p9 === 0 && p2 === 1) ? 1 : 0);
            if (A !== 1) continue;

            if (sub === 0) {
              if (p2 * p4 * p6 === 0 && p4 * p6 * p8 === 0) {
                toRemove[count++] = r1 + x;
              }
            } else {
              if (p2 * p4 * p8 === 0 && p2 * p6 * p8 === 0) {
                toRemove[count++] = r1 + x;
              }
            }
          }
        }
        if (count > 0) {
          changed = true;
          for (let i = 0; i < count; i++) out[toRemove[i]] = 0;
        }
      }
      if (!changed) break;
    }
    return out;
  }

  /**
   * Full Master Raster Pipeline:
   * Preserves TRUE 24-bit color buffer alongside grayscale & binary foreground mask!
   */
  function processRaster(srcRGBA, width, height, opts) {
    const o = Object.assign({
      brightness: 0,
      contrast: 0,
      gamma: 1.0,
      invertColors: false,
      denoise: 0,
      surfaceSmoothing: 0,
      bilateralFilter: 0,
      medianFilter: false,
      lineStrength: 0,
      sharpen: 0,
      unsharpMask: 0,
      morphology: 0,
      ditheringMode: 'Threshold (B&W)',
      threshold: 128,
      autoThreshold: true,
      cannyLow: 0.42,
      cannyHigh: 0.22,
      laserMode: false,
      thinningIntensity: 0
    }, opts || {});

    const n = width * height;
    const colorRGBA = new Uint8ClampedArray(n * 4);
    let gray = new Float32Array(n);

    // Precompute 256-entry tone LUT for brightness + contrast + gamma + invert
    const cVal = Math.max(-99, Math.min(99, o.contrast)) * 2.55;
    const cFactor = (259 * (cVal + 255)) / (255 * (259 - cVal));
    const invGamma = 1 / Math.max(0.1, o.gamma);
    const bOffset = o.brightness * 2.55;
    const toneLUT = new Uint8ClampedArray(256);
    for (let i = 0; i < 256; i++) {
      let v = i + bOffset;
      if (o.contrast !== 0) v = cFactor * (v - 128) + 128;
      if (o.gamma !== 1.0) v = 255 * Math.pow(Math.max(0, Math.min(255, v)) / 255, invGamma);
      if (o.invertColors) v = 255 - v;
      toneLUT[i] = clamp255(Math.round(v));
    }

    // 1. Apply tone curve preserving TRUE 24-bit color (alpha-composited over white paper)
    for (let i = 0, p = 0; i < n; i++, p += 4) {
      const a = srcRGBA[p + 3] / 255;
      const r0 = Math.round(srcRGBA[p] * a + 255 * (1 - a));
      const g0 = Math.round(srcRGBA[p + 1] * a + 255 * (1 - a));
      const b0 = Math.round(srcRGBA[p + 2] * a + 255 * (1 - a));
      const r = toneLUT[r0];
      const g = toneLUT[g0];
      const b = toneLUT[b0];
      colorRGBA[p] = r;
      colorRGBA[p + 1] = g;
      colorRGBA[p + 2] = b;
      colorRGBA[p + 3] = 255;
      gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    }

    // 2. Denoise (blend median + fast Gaussian)
    if (o.denoise > 0) {
      const med = median3x3Gray(gray, width, height);
      const blur = gaussianBlurGray(gray, width, height, 0.5 + (o.denoise / 100) * 1.8);
      const alpha = o.denoise / 100;
      for (let i = 0; i < n; i++) {
        gray[i] = med[i] * alpha * 0.65 + blur[i] * alpha * 0.35 + gray[i] * (1 - alpha);
      }
    }

    // 3. Surface Smoothing (fast edge-preserving bilateral)
    if (o.surfaceSmoothing > 0) {
      const str = Math.max(1, (o.surfaceSmoothing / 100) * 3.2);
      gray = bilateralFilterGray(gray, width, height, str, 25 + o.surfaceSmoothing * 0.45);
    }

    // 4. Dedicated Bilateral Filter
    if (o.bilateralFilter > 0) {
      gray = bilateralFilterGray(gray, width, height, o.bilateralFilter, o.bilateralFilter * 22 + 10);
    }

    // 5. Median 3x3 checkbox
    if (o.medianFilter) {
      gray = median3x3Gray(gray, width, height);
    }

    // 6. Line Strength (dark-stroke boost for blueprints & pencil drawings!)
    if (o.lineStrength > 0) {
      gray = applyLineStrengthGray(gray, width, height, o.lineStrength);
    }

    // 7. Sharpen (3x3 Laplacian)
    if (o.sharpen > 0) {
      gray = applySharpenGray(gray, width, height, o.sharpen);
    }

    // 8. Unsharp Mask (Separable Gaussian)
    if (o.unsharpMask > 0) {
      const blurred = gaussianBlurGray(gray, width, height, 1.8);
      const amount = o.unsharpMask / 45;
      for (let i = 0; i < n; i++) {
        gray[i] = clamp255(gray[i] + amount * (gray[i] - blurred[i]));
      }
    }

    // 9. Morphology (1=Erode, 2=Dilate, 3=Open, 4=Close)
    if (o.morphology > 0) {
      gray = applyMorphologyGray(gray, width, height, o.morphology);
    }

    // 10. Threshold / Edge Detection / Dithering
    const effectiveThreshold = o.autoThreshold ? computeOtsuThreshold(gray) : o.threshold;
    let binary;
    const isGrayscaleDisplay = o.ditheringMode === 'Grayscale';

    if (o.ditheringMode === 'Edge Detection') {
      binary = cannyEdgeDetect(gray, width, height, o.cannyLow, o.cannyHigh, 1.2);
    } else if (o.ditheringMode === 'Adaptive Paper Scan (Sauvola)') {
      const winR = Math.max(8, Math.min(28, Math.round(Math.min(width, height) * 0.03)));
      binary = sauvolaThreshold(gray, width, height, winR, 0.22);
    } else if (o.ditheringMode === 'Threshold (B&W)' || o.ditheringMode === 'Grayscale') {
      binary = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        binary[i] = gray[i] < effectiveThreshold ? 1 : 0;
      }
    } else {
      binary = applyDithering(gray, width, height, o.ditheringMode, effectiveThreshold);
    }

    // 11. Skeletonization / Thinning (for Single-Line Laser Mode or manual thinning slider)
    const thinSteps = o.laserMode ? 60 : (o.thinningIntensity || 0);
    if (thinSteps > 0) {
      binary = thinBinary(binary, width, height, thinSteps);
    }

    // 12. Build displayRGBA for Canvas preview
    const displayRGBA = new Uint8ClampedArray(n * 4);
    if (isGrayscaleDisplay && thinSteps === 0) {
      for (let i = 0, p = 0; i < n; i++, p += 4) {
        const v = clamp255(Math.round(gray[i]));
        displayRGBA[p] = displayRGBA[p + 1] = displayRGBA[p + 2] = v;
        displayRGBA[p + 3] = 255;
      }
    } else {
      for (let i = 0, p = 0; i < n; i++, p += 4) {
        const v = binary[i] ? 0 : 255;
        displayRGBA[p] = displayRGBA[p + 1] = displayRGBA[p + 2] = v;
        displayRGBA[p + 3] = 255;
      }
    }

    return {
      width,
      height,
      colorRGBA,
      gray,
      binary,
      displayRGBA,
      effectiveThreshold
    };
  }

  /**
   * True Standards-Compliant BMP Binary Encoder:
   * - 'color':        24-bit BGR TRUE COLOR from colorRGBA (fixes old grayscale bug!)
   * - 'grayscale':    8-bit indexed Grayscale BMP with 256-entry RGBQUAD palette
   * - 'highcontrast': 1-bit Monochrome Laser BMP (2-entry palette, ideal for RDWorks/LightBurn)
   * Embeds exact physical DPI into biXPelsPerMeter / biYPelsPerMeter.
   */
  function encodeBMP(colorRGBA, grayOrBin, width, height, mode, dpi) {
    const ppm = Math.round((dpi || 300) * 39.37007874);

    if (mode === 'highcontrast') {
      // 1-bit monochrome BMP (bit=1 -> palette[1]=white, bit=0 -> palette[0]=black)
      const rowBytes = Math.ceil(width / 32) * 4;
      const imgSize = rowBytes * height;
      const pixelOffset = 54 + 8; // 2 palette entries * 4 bytes
      const fileSize = pixelOffset + imgSize;
      const buf = new ArrayBuffer(fileSize);
      const dv = new DataView(buf);
      writeBMPHeader(dv, fileSize, pixelOffset, width, height, 1, imgSize, ppm, 2);
      // Palette 0: Black (0,0,0,0), Palette 1: White (255,255,255,0)
      dv.setUint8(54, 0); dv.setUint8(55, 0); dv.setUint8(56, 0); dv.setUint8(57, 0);
      dv.setUint8(58, 255); dv.setUint8(59, 255); dv.setUint8(60, 255); dv.setUint8(61, 0);

      const bytes = new Uint8Array(buf);
      for (let y = 0; y < height; y++) {
        const rowOff = pixelOffset + y * rowBytes;
        for (let x = 0; x < width; x++) {
          const isInk = grayOrBin[y * width + x] === 1;
          if (!isInk) {
            bytes[rowOff + (x >> 3)] |= (0x80 >> (x & 7));
          }
        }
      }
      return new Uint8Array(buf);
    }

    if (mode === 'grayscale') {
      const rowBytes = Math.ceil(width / 4) * 4;
      const imgSize = rowBytes * height;
      const pixelOffset = 54 + 256 * 4;
      const fileSize = pixelOffset + imgSize;
      const buf = new ArrayBuffer(fileSize);
      const dv = new DataView(buf);
      writeBMPHeader(dv, fileSize, pixelOffset, width, height, 8, imgSize, ppm, 256);
      for (let i = 0; i < 256; i++) {
        const off = 54 + i * 4;
        dv.setUint8(off, i); dv.setUint8(off + 1, i); dv.setUint8(off + 2, i); dv.setUint8(off + 3, 0);
      }
      const bytes = new Uint8Array(buf);
      for (let y = 0; y < height; y++) {
        const rowOff = pixelOffset + y * rowBytes;
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          bytes[rowOff + x] = clamp255(Math.round(grayOrBin[idx]));
        }
      }
      return new Uint8Array(buf);
    }

    // Default: 24-bit TRUE COLOR BMP
    const rowBytes = Math.ceil((width * 3) / 4) * 4;
    const imgSize = rowBytes * height;
    const pixelOffset = 54;
    const fileSize = pixelOffset + imgSize;
    const buf = new ArrayBuffer(fileSize);
    const dv = new DataView(buf);
    writeBMPHeader(dv, fileSize, pixelOffset, width, height, 24, imgSize, ppm, 0);
    const bytes = new Uint8Array(buf);
    for (let y = 0; y < height; y++) {
      const rowOff = pixelOffset + y * rowBytes;
      for (let x = 0; x < width; x++) {
        const p = (y * width + x) * 4;
        const dst = rowOff + x * 3;
        bytes[dst] = colorRGBA[p + 2];     // B
        bytes[dst + 1] = colorRGBA[p + 1]; // G
        bytes[dst + 2] = colorRGBA[p];     // R
      }
    }
    return new Uint8Array(buf);
  }

  function writeBMPHeader(dv, fileSize, pixelOffset, width, height, bpp, imgSize, ppm, colorsUsed) {
    dv.setUint8(0, 0x42); // 'B'
    dv.setUint8(1, 0x4D); // 'M'
    dv.setUint32(2, fileSize, true);
    dv.setUint32(6, 0, true);
    dv.setUint32(10, pixelOffset, true);
    dv.setUint32(14, 40, true);          // BITMAPINFOHEADER
    dv.setInt32(18, width, true);
    dv.setInt32(22, -height, true);      // top-down DIB
    dv.setUint16(26, 1, true);           // planes
    dv.setUint16(28, bpp, true);         // bits per pixel
    dv.setUint32(30, 0, true);           // BI_RGB
    dv.setUint32(34, imgSize, true);
    dv.setInt32(38, ppm, true);          // X pixels/meter
    dv.setInt32(42, ppm, true);          // Y pixels/meter
    dv.setUint32(46, colorsUsed, true);
    dv.setUint32(50, 0, true);
  }

  /**
   * Built-in High-Resolution Procedural Sample Artwork Generators (100% offline, instant).
   * Draws onto an HTMLCanvasElement in browser.
   */
  function drawSampleToCanvas(sampleId, canvas) {
    const w = 640, h = 640;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    if (sampleId === 'flange') {
      // Precision Mechanical Coupling Flange with Bolt Circle, Keyed Bore & Relief Slots
      const cx = 320, cy = 320;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      // Outer gear-like / scalloped flange perimeter (6 lobes)
      const outerR = 245;
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.fill();

      // Punch 6 lightening kidney/circle pockets + 6 M8 bolt holes + central keyed bore
      ctx.fillStyle = '#ffffff';
      // 6 mounting holes on PCD = 410px
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * 195, cy + Math.sin(a) * 195, 22, 0, Math.PI * 2);
        ctx.fill();
      }
      // 6 radial weight-reduction slots offset by 30 deg
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 + Math.PI / 6;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(102, -24, 92, 48, 24) : ctx.rect(102, -24, 92, 48);
        ctx.fill();
        ctx.restore();
      }
      // Center shaft bore + DIN 6885 keyway notch
      ctx.beginPath();
      ctx.arc(cx, cy, 62, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 16, cy - 82, 32, 34);
      return { name: 'mechanical_flange_120mm.png', defaultWidthMm: 120, recommendedPreset: 'logo' };
    }

    if (sampleId === 'wolf') {
      // Geometric Laser-Cut Emblem / Medallion
      const cx = 320, cy = 320;
      ctx.fillStyle = '#000000';
      // Outer ring frame
      ctx.beginPath();
      ctx.arc(cx, cy, 260, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, 226, 0, Math.PI * 2);
      ctx.fill();

      // Stylized geometric mountain + compass star emblem inside (connected to ring!)
      ctx.fillStyle = '#000000';
      // Mountain silhouette spanning ring
      ctx.beginPath();
      ctx.moveTo(96, 360);
      ctx.lineTo(205, 210);
      ctx.lineTo(275, 295);
      ctx.lineTo(355, 165);
      ctx.lineTo(445, 290);
      ctx.lineTo(544, 360);
      ctx.lineTo(520, 445);
      ctx.lineTo(120, 445);
      ctx.closePath();
      ctx.fill();

      // Snow ridge negative cuts
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(355, 195);
      ctx.lineTo(395, 260);
      ctx.lineTo(360, 248);
      ctx.lineTo(335, 278);
      ctx.lineTo(318, 252);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(205, 236);
      ctx.lineTo(234, 282);
      ctx.lineTo(205, 272);
      ctx.lineTo(176, 285);
      ctx.closePath();
      ctx.fill();

      // Sun / Compass star at top-left
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i * Math.PI) / 8 - Math.PI / 2;
        const r = i % 2 === 0 ? 52 : 20;
        const x = 215 + Math.cos(a) * r;
        const y = 165 + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();

      // Decorative bottom waves cut out
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(150, 405, 340, 18);
      ctx.fillRect(190, 440, 260, 16);
      return { name: 'alpine_laser_medallion_150mm.png', defaultWidthMm: 150, recommendedPreset: 'logo' };
    }

    if (sampleId === 'sketch') {
      // Simulated Smartphone Photo of a Hand-Drawn Bracket Gasket on Shadowed Paper!
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#f3efe6');
      grad.addColorStop(0.55, '#d5cebf');
      grad.addColorStop(1, '#8c8678'); // heavy shadow on bottom-right!
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Subtle paper grain
      for (let i = 0; i < 2500; i++) {
        const gx = (i * 97) % w;
        const gy = (i * 173) % h;
        ctx.fillStyle = (i & 1) ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.04)';
        ctx.fillRect(gx, gy, 3, 3);
      }

      // Bold dark-pencil hand-drawn L-bracket gasket with 3 mounting holes
      ctx.strokeStyle = '#202225';
      ctx.lineWidth = 11;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(115, 115);
      ctx.lineTo(525, 115);
      ctx.lineTo(525, 285);
      ctx.lineTo(295, 285);
      ctx.lineTo(295, 525);
      ctx.lineTo(115, 525);
      ctx.closePath();
      ctx.stroke();

      // 3 Bolt holes
      [[195, 195, 34], [445, 195, 30], [205, 435, 32]].forEach(([bx, by, br]) => {
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Reference scale bar at bottom-right ("50 mm")
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(355, 505);
      ctx.lineTo(535, 505);
      ctx.moveTo(355, 492);
      ctx.lineTo(355, 518);
      ctx.moveTo(535, 492);
      ctx.lineTo(535, 518);
      ctx.stroke();
      return { name: 'paper_sketch_bracket_100mm.jpg', defaultWidthMm: 100, recommendedPreset: 'sketch' };
    }

    if (sampleId === 'circuit') {
      // Ornamental Single-Line Labyrinth / Circuit Trace (ideal for Laser Single-Line Centerline!)
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 16;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Concentric circuit traces & radial bus lines
      ctx.beginPath();
      ctx.rect(85, 85, 470, 470);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(155, 155);
      ctx.lineTo(485, 155);
      ctx.lineTo(485, 320);
      ctx.lineTo(320, 320);
      ctx.lineTo(320, 485);
      ctx.lineTo(155, 485);
      ctx.closePath();
      ctx.stroke();

      // Diagonal bus branches
      ctx.beginPath();
      ctx.moveTo(225, 225);
      ctx.lineTo(415, 225);
      ctx.lineTo(415, 265);
      ctx.moveTo(225, 225);
      ctx.lineTo(225, 415);
      ctx.lineTo(265, 415);
      ctx.stroke();

      // Center ring + 4 terminals
      ctx.beginPath();
      ctx.arc(410, 410, 62, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(410, 348); ctx.lineTo(410, 472);
      ctx.moveTo(348, 410); ctx.lineTo(472, 410);
      ctx.stroke();
      return { name: 'single_line_circuit_140mm.png', defaultWidthMm: 140, recommendedPreset: 'laser' };
    }

    // Default: 'colorlogo' — Multi-Color 4-Tone Industrial Shield (demonstrates Multi-Layer Color DXF!)
    const cx = 320, cy = 320;
    // Layer 1 (Navy outer shield)
    ctx.fillStyle = '#0f294a';
    ctx.beginPath();
    ctx.moveTo(320, 72);
    ctx.lineTo(525, 152);
    ctx.lineTo(492, 415);
    ctx.lineTo(320, 562);
    ctx.lineTo(148, 415);
    ctx.lineTo(115, 152);
    ctx.closePath();
    ctx.fill();

    // Layer 2 (Emerald inner crest)
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.moveTo(320, 118);
    ctx.lineTo(482, 182);
    ctx.lineTo(454, 392);
    ctx.lineTo(320, 512);
    ctx.lineTo(186, 392);
    ctx.lineTo(158, 182);
    ctx.closePath();
    ctx.fill();

    // Layer 3 (Gold gear/bolt icon in center)
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8;
      const r = i % 2 === 0 ? 112 : 82;
      const x = cx + Math.cos(a) * r;
      const y = cy - 10 + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // Layer 4 (Crimson inner core)
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(cx, cy - 10, 48, 0, Math.PI * 2);
    ctx.fill();

    // Center white bore
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy - 10, 22, 0, Math.PI * 2);
    ctx.fill();

    return { name: 'multicolor_crest_120mm.png', defaultWidthMm: 120, recommendedPreset: 'multicolor' };
  }

  return {
    computeAutoEnhance,
    computeOtsuThreshold,
    gaussianBlurGray,
    bilateralFilterGray,
    median3x3Gray,
    applyMorphologyGray,
    applyLineStrengthGray,
    applySharpenGray,
    sauvolaThreshold,
    cannyEdgeDetect,
    applyDithering,
    thinBinary,
    processRaster,
    encodeBMP,
    drawSampleToCanvas
  };
});
