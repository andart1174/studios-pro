/**
 * Depth Maps Pro — Core Depth, AI, 16-Bit PNG, PBR, Watertight 3D Mesh & CNC Engine
 * Studios-Pro (https://studios-pro.com/apps/depth-maps/)
 * Pure browser + Node-testable module (UMD export: window.DepthEngine / module.exports).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DepthEngine = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this), function () {
  'use strict';

  // ── 1. Color Maps ──────────────────────────────────────────────────────────
  const COLOR_MAPS = {
    Turbo: (t) => {
      const r = Math.round(255 * clamp01(0.1357 + 4.5974 * t - 9.0576 * t * t + 4.4619 * t * t * t));
      const g = Math.round(255 * clamp01(0.0914 + 2.28 * t - 3.472 * t * t + 0.7764 * t * t * t));
      const b = Math.round(255 * clamp01(0.105 + 3.33 * t - 15 * t * t + 21 * t * t * t - 10.2 * t * t * t * t));
      return [r, g, b];
    },
    Plasma: (t) => [
      Math.round(255 * clamp01(0.05 + 0.898 * t + 0.052 * t * t)),
      Math.round(255 * clamp01(0.03 - 0.15 * t + 1.12 * t * t)),
      Math.round(255 * clamp01(0.53 + 0.9 * t - 1.43 * t * t))
    ],
    Inferno: (t) => [
      Math.round(255 * clamp01(t < 0.5 ? 2 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)),
      Math.round(255 * clamp01(t < 0.5 ? 0 : (2 * t - 1) * 0.7)),
      Math.round(255 * clamp01(t < 0.5 ? 0.5 + t : 0.9 * (1 - t) * 2))
    ],
    Viridis: (t) => [
      Math.round(255 * clamp01(0.27 + 0.49 * t + 0.265 * t * t)),
      Math.round(255 * clamp01(0.004 + 0.955 * t)),
      Math.round(255 * clamp01(0.33 + 0.85 * t * (1 - t) * 2.5))
    ],
    Magma: (t) => [
      Math.round(255 * clamp01(t * t)),
      Math.round(255 * clamp01(0.02 + 0.7 * t + 0.28 * t * t)),
      Math.round(255 * clamp01(0.38 + 0.62 * t))
    ],
    Grayscale: (t) => {
      const v = Math.round(255 * clamp01(t));
      return [v, v, v];
    },
    'Heat Map': (t) => {
      if (t < 0.33) return [Math.round(255 * t * 3), 0, 0];
      if (t < 0.66) return [255, Math.round(255 * (t - 0.33) * 3), 0];
      return [255, 255, Math.round(255 * (t - 0.66) * 3)];
    },
    'Cool-Warm': (t) => [
      Math.round(255 * clamp01(t)),
      Math.round(255 * clamp01(1 - Math.abs(2 * t - 1))),
      Math.round(255 * clamp01(1 - t))
    ]
  };

  function clamp01(v) {
    return v < 0 ? 0 : (v > 1 ? 1 : v);
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  // ── 2. O(W * H) Sliding-Window Separable Box Blur (20-40x faster!) ─────────
  function fastBoxBlurPass(src, dst, tmp, w, h, r) {
    const win = r * 2 + 1;
    // Horizontal pass with edge clamping
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let sum = 0;
      const firstVal = src[row];
      const lastVal = src[row + w - 1];
      sum += firstVal * (r + 1);
      for (let x = 1; x <= r; x++) {
        sum += src[row + Math.min(w - 1, x)];
      }
      tmp[row] = sum / win;
      for (let x = 1; x < w; x++) {
        const addIdx = x + r < w ? x + r : w - 1;
        const subIdx = x - r - 1 >= 0 ? x - r - 1 : 0;
        sum += src[row + addIdx] - src[row + subIdx];
        tmp[row + x] = sum / win;
      }
    }
    // Vertical pass with edge clamping
    for (let x = 0; x < w; x++) {
      let sum = 0;
      const topVal = tmp[x];
      sum += topVal * (r + 1);
      for (let y = 1; y <= r; y++) {
        sum += tmp[Math.min(h - 1, y) * w + x];
      }
      dst[x] = sum / win;
      for (let y = 1; y < h; y++) {
        const addY = y + r < h ? y + r : h - 1;
        const subY = y - r - 1 >= 0 ? y - r - 1 : 0;
        sum += tmp[addY * w + x] - tmp[subY * w + x];
        dst[y * w + x] = sum / win;
      }
    }
  }

  function fastBoxBlur(src, w, h, radius, passes) {
    const r = Math.round(radius);
    if (r < 1 || w < 2 || h < 2) return new Float32Array(src);
    const numPasses = passes || 1;
    let cur = new Float32Array(src);
    let dst = new Float32Array(src.length);
    const tmp = new Float32Array(src.length);
    for (let p = 0; p < numPasses; p++) {
      fastBoxBlurPass(cur, dst, tmp, w, h, r);
      const swap = cur;
      cur = dst;
      dst = swap;
    }
    return cur;
  }

  // ── 3. WebGPU Detection & AI Depth Pipeline (Transformers.js v3) ───────────
  let _transformersMod = null;
  let _cachedPipeline = null;
  let _cachedModelKey = '';

  async function detectWebGPU() {
    try {
      if (typeof navigator !== 'undefined' && navigator.gpu) {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) return 'webgpu';
      }
    } catch (_) {}
    return 'wasm';
  }

  async function loadTransformers() {
    if (_transformersMod) return _transformersMod;
    const urls = [
      'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.0',
      'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3'
    ];
    let lastErr = null;
    for (const url of urls) {
      try {
        const mod = await import(url);
        if (mod && mod.pipeline) {
          if (mod.env) mod.env.allowLocalModels = false;
          _transformersMod = mod;
          return mod;
        }
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error('Failed to load @huggingface/transformers');
  }

  function computeTargetDims(origW, origH, maxRes, preserveAspectRatio) {
    const m = Math.max(140, Math.round(maxRes / 14) * 14);
    if (!preserveAspectRatio || !origW || !origH) {
      return { width: m, height: m };
    }
    const ratio = origW / origH;
    if (origW >= origH) {
      return {
        width: m,
        height: Math.max(14, Math.round((m / ratio) / 14) * 14)
      };
    }
    return {
      width: Math.max(14, Math.round((m * ratio) / 14) * 14),
      height: m
    };
  }

  async function runAIDepth(imageInput, opts) {
    const o = opts || {};
    const modelId = o.modelId || 'onnx-community/depth-anything-v2-small';
    const maxRes = parseInt(o.maxRes, 10) || 518;
    const preserveAspectRatio = o.preserveAspectRatio !== false;
    const onProgress = typeof o.onProgress === 'function' ? o.onProgress : function () {};

    onProgress(5, 'loading_lib');
    const mod = await loadTransformers();

    let device = o.forceWasm ? 'wasm' : await detectWebGPU();
    const modelKey = modelId + '::' + device;

    if (!_cachedPipeline || _cachedModelKey !== modelKey) {
      onProgress(12, 'downloading', { device, modelId });
      const pipeOpts = {
        device: device,
        dtype: device === 'webgpu' ? 'fp16' : 'q8',
        progress_callback: (p) => {
          if (p && p.status === 'downloading') {
            const pct = Math.round(12 + (p.progress || 0) * 0.58);
            onProgress(pct, 'downloading', {
              file: p.file || p.name || '',
              progress: Math.round(p.progress || 0),
              device
            });
          }
        }
      };

      try {
        _cachedPipeline = await mod.pipeline('depth-estimation', modelId, pipeOpts);
        _cachedModelKey = modelKey;
      } catch (gpuErr) {
        if (device === 'webgpu') {
          device = 'wasm';
          const fallbackKey = modelId + '::wasm';
          pipeOpts.device = 'wasm';
          pipeOpts.dtype = 'q8';
          _cachedPipeline = await mod.pipeline('depth-estimation', modelId, pipeOpts);
          _cachedModelKey = fallbackKey;
        } else {
          throw gpuErr;
        }
      }
    } else {
      onProgress(70, 'cached', { device });
    }

    // FIX B1: Properly configure Transformers.js v3 image_processor size & aspect ratio!
    const dims = computeTargetDims(o.origWidth, o.origHeight, maxRes, preserveAspectRatio);
    try {
      const ip = _cachedPipeline && _cachedPipeline.processor && _cachedPipeline.processor.image_processor;
      if (ip) {
        ip.size = { height: dims.height, width: dims.width };
        ip.keep_aspect_ratio = false;
        ip.do_pad = false;
        if (ip.config) {
          ip.config.size = { height: dims.height, width: dims.width };
          ip.config.keep_aspect_ratio = false;
          ip.config.do_pad = false;
        }
      }
    } catch (_) {}

    onProgress(76, 'inferring', { device, dims });
    const result = await _cachedPipeline(imageInput);
    const tensor = result && result.predicted_depth;
    if (!tensor || !tensor.data) {
      throw new Error('AI pipeline returned empty depth tensor');
    }

    const tDims = tensor.dims || (tensor.ort_tensor && tensor.ort_tensor.dims);
    if (!tDims || tDims.length < 2) {
      throw new Error('Could not determine depth tensor dimensions');
    }
    const height = tDims[tDims.length - 2];
    const width = tDims[tDims.length - 1];
    const data = new Float32Array(tensor.data);

    onProgress(95, 'done', { device, width, height });
    return { data, width, height, device, modelId };
  }

  // ── 4. Instant Offline Multi-Cue Depth Estimator (Zero-Download Fallback) ──
  function runFastHeuristicDepth(rgbaData, width, height) {
    const n = width * height;
    const luma = new Float32Array(n);
    const sat = new Float32Array(n);
    const warm = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const r = rgbaData[i * 4] / 255;
      const g = rgbaData[i * 4 + 1] / 255;
      const b = rgbaData[i * 4 + 2] / 255;
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      luma[i] = 0.299 * r + 0.587 * g + 0.114 * b;
      sat[i] = mx > 0 ? (mx - mn) / mx : 0;
      warm[i] = clamp01(0.5 + 0.5 * (r - b));
    }

    // Local focus / sharpness cue via gradient magnitude
    const edge = new Float32Array(n);
    for (let y = 1; y < height - 1; y++) {
      const row = y * width;
      for (let x = 1; x < width - 1; x++) {
        const gx = luma[row + x + 1] - luma[row + x - 1];
        const gy = luma[row + width + x] - luma[row - width + x];
        edge[row + x] = Math.min(1, Math.sqrt(gx * gx + gy * gy) * 3.5);
      }
    }

    const smoothLuma = fastBoxBlur(luma, width, height, Math.max(2, Math.round(Math.min(width, height) * 0.015)), 2);
    const smoothEdge = fastBoxBlur(edge, width, height, Math.max(3, Math.round(Math.min(width, height) * 0.035)), 2);

    // Estimate background luminance from border pixels to separate subject
    let borderLuma = 0;
    let borderCnt = 0;
    for (let x = 0; x < width; x++) {
      borderLuma += luma[x] + luma[(height - 1) * width + x];
      borderCnt += 2;
    }
    for (let y = 0; y < height; y++) {
      borderLuma += luma[y * width] + luma[y * width + width - 1];
      borderCnt += 2;
    }
    borderLuma /= Math.max(1, borderCnt);

    const out = new Float32Array(n);
    const invW = 1 / Math.max(1, width - 1);
    const invH = 1 / Math.max(1, height - 1);

    for (let y = 0; y < height; y++) {
      const ny = y * invH;
      const dy = (ny - 0.5) * 2;
      const row = y * width;
      for (let x = 0; x < width; x++) {
        const nx = x * invW;
        const dx = (nx - 0.5) * 2;
        const idx = row + x;
        // Center-subject radial prior + vertical perspective cue + contrast from border + local detail
        const radial = Math.max(0, 1 - (dx * dx + dy * dy) * 0.42);
        const fgContrast = Math.abs(smoothLuma[idx] - borderLuma);
        const vertical = 0.25 + 0.55 * ny; // lower parts tend closer in landscapes/portraits
        const val =
          0.42 * smoothLuma[idx] +
          0.22 * smoothEdge[idx] +
          0.16 * radial +
          0.10 * fgContrast +
          0.06 * warm[idx] +
          0.04 * (sat[idx] * 0.6 + vertical * 0.4);
        out[idx] = val;
      }
    }

    // Final edge-preserving-style smooth
    const smoothed = fastBoxBlur(out, width, height, Math.max(1, Math.round(Math.min(width, height) * 0.008)), 2);
    return { data: smoothed, width, height, device: 'instant', modelId: 'fast-heuristic' };
  }

  // ── 5. Unified Depth Processing Pipeline (SINGLE SOURCE OF TRUTH) ──────────
  function computePercentiles(arr) {
    const n = arr.length;
    if (!n) return { min: 0, max: 1, p2: 0, p98: 1 };
    let mn = Infinity;
    let mx = -Infinity;
    for (let i = 0; i < n; i++) {
      const v = arr[i];
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
    const range = mx - mn || 1;
    const BINS = 256;
    const hist = new Uint32Array(BINS);
    for (let i = 0; i < n; i++) {
      const b = Math.min(BINS - 1, Math.max(0, Math.floor(((arr[i] - mn) / range) * BINS)));
      hist[b]++;
    }
    const lowCut = n * 0.02;
    const highCut = n * 0.98;
    let acc = 0;
    let p2 = mn;
    let p98 = mx;
    let foundLow = false;
    for (let b = 0; b < BINS; b++) {
      acc += hist[b];
      if (!foundLow && acc >= lowCut) {
        p2 = mn + (b / BINS) * range;
        foundLow = true;
      }
      if (acc >= highCut) {
        p98 = mn + ((b + 1) / BINS) * range;
        break;
      }
    }
    if (p98 <= p2) { p2 = mn; p98 = mx; }
    return { min: mn, max: mx, p2, p98 };
  }

  function computeProcessedDepth(rawData, width, height, settings, luminanceHighPass, brushDelta) {
    const s = settings || {};
    const n = rawData.length;
    const stats = computePercentiles(rawData);
    const lo = s.autoClip ? stats.p2 : stats.min;
    const hi = s.autoClip ? stats.p98 : stats.max;
    const range = (hi - lo) || 1;

    const inv = !!s.invert;
    const blackPt = clamp(s.blackPoint !== undefined ? s.blackPoint : 0, 0, 0.95);
    const whitePt = clamp(s.whitePoint !== undefined ? s.whitePoint : 1, blackPt + 0.02, 1);
    const levelSpan = whitePt - blackPt;
    const gamma = clamp(s.gamma !== undefined ? s.gamma : 1.0, 0.1, 3.5);
    const contrast = clamp(s.contrast !== undefined ? s.contrast : 1.0, 0.2, 3.0);
    const brightness = clamp(s.brightness !== undefined ? s.brightness : 0.0, -1.0, 1.0);
    const detailAmount = Math.max(0, s.detail || 0);
    const textureAmount = Math.max(0, s.texture || 0);
    const blurRadius = Math.max(0, Math.round(s.blur || 0));
    const bevelAmount = clamp(s.bevel || 0, 0, 0.5);
    const bevelShape = s.bevelShape || 'rect';
    const bgCutoff = clamp(s.bgCutoff || 0, 0, 0.85);
    const contourSteps = Math.max(0, Math.round(s.contourSteps || 0));

    let out = new Float32Array(n);

    // Step 1: Normalize + Invert + Sculpt Brush Delta
    const hasBrush = brushDelta && brushDelta.length === n;
    for (let i = 0; i < n; i++) {
      let t = clamp01((rawData[i] - lo) / range);
      if (inv) t = 1 - t;
      if (hasBrush) t = clamp01(t + brushDelta[i]);
      out[i] = t;
    }

    // Step 2: Micro-Details (Unsharp Mask using O(N) blur)
    if (detailAmount > 0) {
      const r = Math.max(1, Math.round(width * 0.005));
      const blurred = fastBoxBlur(out, width, height, r, 1);
      for (let i = 0; i < n; i++) {
        out[i] = clamp01(out[i] + (out[i] - blurred[i]) * detailAmount);
      }
    }

    // Step 3: Image Texture Bump (uses precomputed high-pass luminance for 60fps!)
    if (textureAmount > 0 && luminanceHighPass && luminanceHighPass.length === n) {
      for (let i = 0; i < n; i++) {
        out[i] = clamp01(out[i] + luminanceHighPass[i] * textureAmount);
      }
    }

    // Step 4: Levels (Black / White) + Gamma + Contrast + Brightness
    for (let i = 0; i < n; i++) {
      let t = clamp01((out[i] - blackPt) / levelSpan);
      t = Math.pow(t, gamma);
      t = clamp01((t - 0.5) * contrast + 0.5 + brightness);
      out[i] = t;
    }

    // Step 5: True Depth Field Smoothing (applies identically to 2D, 16-bit PNG, 3D STL & CNC!)
    if (blurRadius > 0) {
      out = fastBoxBlur(out, width, height, blurRadius, 2);
    }

    // Step 6: Foreground Isolation / Background Flatten (soft ramp at bgCutoff)
    if (bgCutoff > 0.001) {
      const feather = 0.05;
      for (let i = 0; i < n; i++) {
        const v = out[i];
        if (v <= bgCutoff) {
          out[i] = 0;
        } else {
          const remapped = (v - bgCutoff) / (1 - bgCutoff);
          const ramp = v < bgCutoff + feather ? (v - bgCutoff) / feather : 1;
          out[i] = clamp01(remapped * ramp);
        }
      }
    }

    // Step 7: Edge Fade (Bevel — rectangular or radial coin/oval)
    if (bevelAmount > 0.001) {
      if (bevelShape === 'circle' || bevelShape === 'oval') {
        const cx = (width - 1) * 0.5;
        const cy = (height - 1) * 0.5;
        const rx = Math.max(1, cx);
        const ry = Math.max(1, cy);
        const innerR = Math.max(0.01, 1 - bevelAmount * 1.4);
        for (let y = 0; y < height; y++) {
          const dy = (y - cy) / ry;
          const row = y * width;
          for (let x = 0; x < width; x++) {
            const dx = (x - cx) / rx;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d >= 1) {
              out[row + x] = 0;
            } else if (d > innerR) {
              const p = (1 - d) / (1 - innerR);
              out[row + x] *= Math.sin(p * Math.PI * 0.5);
            }
          }
        }
      } else {
        const maxFadeX = Math.max(1, Math.floor(width * 0.5 * bevelAmount));
        const maxFadeY = Math.max(1, Math.floor(height * 0.5 * bevelAmount));
        for (let y = 0; y < height; y++) {
          const distY = Math.min(y, height - 1 - y);
          const multY = distY < maxFadeY ? Math.sin((distY / maxFadeY) * Math.PI * 0.5) : 1;
          const row = y * width;
          for (let x = 0; x < width; x++) {
            const distX = Math.min(x, width - 1 - x);
            const multX = distX < maxFadeX ? Math.sin((distX / maxFadeX) * Math.PI * 0.5) : 1;
            out[row + x] *= multX * multY;
          }
        }
      }
    }

    // Step 8: Topographic Contour Quantization
    if (contourSteps > 1) {
      for (let i = 0; i < n; i++) {
        out[i] = Math.min(1, Math.floor(out[i] * contourSteps) / (contourSteps - 1));
      }
    }

    // Compute processed statistics
    let sum = 0;
    let pMin = 1;
    let pMax = 0;
    for (let i = 0; i < n; i++) {
      const v = out[i];
      sum += v;
      if (v < pMin) pMin = v;
      if (v > pMax) pMax = v;
    }

    return {
      data: out,
      width,
      height,
      rawMin: stats.min,
      rawMax: stats.max,
      min: pMin,
      max: pMax,
      avg: sum / Math.max(1, n),
      dynamicRange: pMax - pMin
    };
  }

  function computeLuminanceHighPass(rgbaData, width, height) {
    const n = width * height;
    const lum = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      lum[i] = (rgbaData[i * 4] * 0.299 + rgbaData[i * 4 + 1] * 0.587 + rgbaData[i * 4 + 2] * 0.114) / 255;
    }
    const r = Math.max(1, Math.round(width * 0.005));
    const lowPass = fastBoxBlur(lum, width, height, r, 1);
    const highPass = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      highPass[i] = lum[i] - lowPass[i];
    }
    return highPass;
  }

  function computeHistogram(processedData, bins) {
    const B = bins || 64;
    const counts = new Uint32Array(B);
    const n = processedData.length;
    for (let i = 0; i < n; i++) {
      const idx = Math.min(B - 1, Math.max(0, Math.floor(processedData[i] * B)));
      counts[idx]++;
    }
    let maxCount = 1;
    for (let i = 0; i < B; i++) {
      if (counts[i] > maxCount) maxCount = counts[i];
    }
    return { counts, maxCount, bins: B };
  }

  // ── 6. True 16-Bit Lossless Grayscale PNG Encoder (65,536 real levels!) ────
  const CRC_TABLE = (function () {
    const tbl = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      tbl[n] = c >>> 0;
    }
    return tbl;
  }());

  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
      c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function adler32(bytes) {
    let a = 1;
    let b = 0;
    const MOD = 65521;
    for (let i = 0; i < bytes.length; i++) {
      a = (a + bytes[i]) % MOD;
      b = (b + a) % MOD;
    }
    return ((b << 16) | a) >>> 0;
  }

  function makePNGChunk(typeStr, dataBytes) {
    const len = dataBytes.length;
    const chunk = new Uint8Array(12 + len);
    const dv = new DataView(chunk.buffer);
    dv.setUint32(0, len, false);
    for (let i = 0; i < 4; i++) chunk[4 + i] = typeStr.charCodeAt(i);
    chunk.set(dataBytes, 8);
    const crcInput = chunk.subarray(4, 8 + len);
    dv.setUint32(8 + len, crc32(crcInput), false);
    return chunk;
  }

  function zlibStore(rawBytes) {
    // Valid RFC 1950 zlib stream with uncompressed deflate blocks (max 65535 bytes each)
    const MAX_BLK = 65535;
    const numBlocks = Math.max(1, Math.ceil(rawBytes.length / MAX_BLK));
    const totalLen = 2 + rawBytes.length + numBlocks * 5 + 4;
    const out = new Uint8Array(totalLen);
    let pos = 0;
    out[pos++] = 0x78; // CMF: deflate, 32K window
    out[pos++] = 0x01; // FLG: fastest, valid FCHECK (0x7801 % 31 === 0)

    let offset = 0;
    for (let b = 0; b < numBlocks; b++) {
      const rem = rawBytes.length - offset;
      const blkLen = Math.min(MAX_BLK, rem);
      const isFinal = (b === numBlocks - 1) ? 1 : 0;
      out[pos++] = isFinal; // BFINAL | BTYPE=00 (stored)
      out[pos++] = blkLen & 0xff;
      out[pos++] = (blkLen >>> 8) & 0xff;
      const nlen = (~blkLen) & 0xffff;
      out[pos++] = nlen & 0xff;
      out[pos++] = (nlen >>> 8) & 0xff;
      out.set(rawBytes.subarray(offset, offset + blkLen), pos);
      pos += blkLen;
      offset += blkLen;
    }

    const adler = adler32(rawBytes);
    out[pos++] = (adler >>> 24) & 0xff;
    out[pos++] = (adler >>> 16) & 0xff;
    out[pos++] = (adler >>> 8) & 0xff;
    out[pos++] = adler & 0xff;
    return out;
  }

  function buildRaw16BitScanlines(processedData, width, height) {
    const rowBytes = 1 + width * 2; // filter byte (0=None) + 2 bytes per pixel (Big-Endian)
    const raw = new Uint8Array(rowBytes * height);
    for (let y = 0; y < height; y++) {
      const dstRow = y * rowBytes;
      raw[dstRow] = 0; // Filter type 0 (None)
      const srcRow = y * width;
      for (let x = 0; x < width; x++) {
        const val16 = Math.round(clamp01(processedData[srcRow + x]) * 65535);
        raw[dstRow + 1 + x * 2] = (val16 >>> 8) & 0xff;
        raw[dstRow + 2 + x * 2] = val16 & 0xff;
      }
    }
    return raw;
  }

  function assemblePNG16(width, height, compressedZlib) {
    const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = new Uint8Array(13);
    const idv = new DataView(ihdr.buffer);
    idv.setUint32(0, width, false);
    idv.setUint32(4, height, false);
    ihdr[8] = 16; // Bit depth = 16-bit!
    ihdr[9] = 0;  // Color type = 0 (Grayscale)
    ihdr[10] = 0; // Compression = deflate
    ihdr[11] = 0; // Filter = adaptive
    ihdr[12] = 0; // Interlace = none

    const cIHDR = makePNGChunk('IHDR', ihdr);
    const cIDAT = makePNGChunk('IDAT', compressedZlib);
    const cIEND = makePNGChunk('IEND', new Uint8Array(0));

    const png = new Uint8Array(sig.length + cIHDR.length + cIDAT.length + cIEND.length);
    let p = 0;
    png.set(sig, p); p += sig.length;
    png.set(cIHDR, p); p += cIHDR.length;
    png.set(cIDAT, p); p += cIDAT.length;
    png.set(cIEND, p);
    return png;
  }

  function encodePNG16Sync(processedData, width, height) {
    const raw = buildRaw16BitScanlines(processedData, width, height);
    const zlibData = zlibStore(raw);
    return assemblePNG16(width, height, zlibData);
  }

  async function encodePNG16(processedData, width, height) {
    const raw = buildRaw16BitScanlines(processedData, width, height);
    if (typeof CompressionStream !== 'undefined') {
      try {
        const cs = new CompressionStream('deflate');
        const writer = cs.writable.getWriter();
        writer.write(raw);
        writer.close();
        const chunks = [];
        const reader = cs.readable.getReader();
        let total = 0;
        while (true) {
          const res = await reader.read();
          if (res.done) break;
          chunks.push(res.value);
          total += res.value.length;
        }
        const compressed = new Uint8Array(total);
        let off = 0;
        for (const ch of chunks) {
          compressed.set(ch, off);
          off += ch.length;
        }
        return assemblePNG16(width, height, compressed);
      } catch (_) {}
    }
    return assemblePNG16(width, height, zlibStore(raw));
  }

  // ── 7. PBR Texture Generators (Normal, Ambient Occlusion, Curvature) ───────
  function generateNormalMap(processedData, width, height, opts) {
    const o = opts || {};
    const strength = o.strength !== undefined ? o.strength : 6.0;
    const invertY = !!o.directX; // DirectX flips green channel
    const rgba = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
      const ym = Math.max(0, y - 1);
      const yp = Math.min(height - 1, y + 1);
      for (let x = 0; x < width; x++) {
        const xm = Math.max(0, x - 1);
        const xp = Math.min(width - 1, x + 1);

        const tl = processedData[ym * width + xm];
        const tc = processedData[ym * width + x];
        const tr = processedData[ym * width + xp];
        const ml = processedData[y * width + xm];
        const mr = processedData[y * width + xp];
        const bl = processedData[yp * width + xm];
        const bc = processedData[yp * width + x];
        const br = processedData[yp * width + xp];

        // Sobel operator
        const dx = (tr + 2 * mr + br) - (tl + 2 * ml + bl);
        const dy = (bl + 2 * bc + br) - (tl + 2 * tc + tr);

        let nx = -dx * strength;
        let ny = (invertY ? dy : -dy) * strength;
        let nz = 1.0;
        const invLen = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);
        nx *= invLen; ny *= invLen; nz *= invLen;

        const idx = (y * width + x) * 4;
        rgba[idx] = Math.round((nx * 0.5 + 0.5) * 255);
        rgba[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
        rgba[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
        rgba[idx + 3] = 255;
      }
    }
    return rgba;
  }

  function generateAOMap(processedData, width, height, opts) {
    const o = opts || {};
    const strength = o.strength !== undefined ? o.strength : 3.2;
    const rSmall = Math.max(2, Math.round(Math.min(width, height) * 0.012));
    const rLarge = Math.max(4, Math.round(Math.min(width, height) * 0.035));
    const blurS = fastBoxBlur(processedData, width, height, rSmall, 1);
    const blurL = fastBoxBlur(processedData, width, height, rLarge, 1);
    const rgba = new Uint8ClampedArray(width * height * 4);

    for (let i = 0; i < processedData.length; i++) {
      const occS = Math.max(0, blurS[i] - processedData[i]);
      const occL = Math.max(0, blurL[i] - processedData[i]);
      const ao = clamp01(1 - (occS * 0.65 + occL * 0.35) * strength * 4.0);
      const v = Math.round(ao * 255);
      const idx = i * 4;
      rgba[idx] = v; rgba[idx + 1] = v; rgba[idx + 2] = v; rgba[idx + 3] = 255;
    }
    return rgba;
  }

  function generateCurvatureMap(processedData, width, height, opts) {
    const o = opts || {};
    const strength = o.strength !== undefined ? o.strength : 8.0;
    const blur = fastBoxBlur(processedData, width, height, Math.max(1, Math.round(Math.min(width, height) * 0.008)), 1);
    const rgba = new Uint8ClampedArray(width * height * 4);

    for (let i = 0; i < processedData.length; i++) {
      const diff = (processedData[i] - blur[i]) * strength;
      const v = Math.round(clamp01(0.5 + diff) * 255);
      const idx = i * 4;
      rgba[idx] = v; rgba[idx + 1] = v; rgba[idx + 2] = v; rgba[idx + 3] = 255;
    }
    return rgba;
  }

  // ── 8. Watertight Solid 3D Relief / Coin / Lithophane Mesh Builder ─────────
  function bilinearSample(data, w, h, u, v) {
    const x = clamp(u, 0, 1) * (w - 1);
    const y = clamp(v, 0, 1) * (h - 1);
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = Math.min(w - 1, x0 + 1);
    const y1 = Math.min(h - 1, y0 + 1);
    const fx = x - x0;
    const fy = y - y0;
    const a = data[y0 * w + x0];
    const b = data[y0 * w + x1];
    const c = data[y1 * w + x0];
    const d = data[y1 * w + x1];
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
  }

  function buildSolidReliefMesh(processedData, srcW, srcH, opts) {
    const o = opts || {};
    const widthMm = clamp(Number(o.widthMm) || 120, 15, 600);
    const aspect = srcH / Math.max(1, srcW);
    const shape = o.shape || 'rect'; // rect | rounded | circle | oval | arc | cylinder
    const isCircle = shape === 'circle';
    const heightMm = isCircle ? widthMm : Number((widthMm * aspect).toFixed(2));
    const mode = o.mode || 'relief'; // relief | lithophane
    const baseMm = clamp(Number(o.baseMm) || (mode === 'lithophane' ? 0.8 : 2.0), 0.4, 25);
    const reliefMm = clamp(Number(o.reliefMm) || (mode === 'lithophane' ? 2.4 : 5.0), 0.5, 45);
    const maxGrid = clamp(parseInt(o.resolution, 10) || 180, 32, 360);
    const borderRimMm = (shape === 'circle' || shape === 'oval' || shape === 'rounded') ? (o.borderRim !== false ? Math.min(3.5, reliefMm * 0.45) : 0) : 0;
    const keychainHole = !!o.keychainHole && (shape === 'circle' || shape === 'oval' || shape === 'rounded');
    const arcAngleRad = clamp(Number(o.arcAngleDeg) || 120, 45, 220) * (Math.PI / 180);

    let cols, rows;
    if (widthMm >= heightMm) {
      cols = maxGrid;
      rows = Math.max(24, Math.round(maxGrid * (heightMm / widthMm)));
    } else {
      rows = maxGrid;
      cols = Math.max(24, Math.round(maxGrid * (widthMm / heightMm)));
    }

    // Active cell mask for non-rectangular shapes (circle, oval, rounded, keychain hole)
    const cellActive = new Uint8Array((cols - 1) * (rows - 1));
    const vertMask = new Uint8Array(cols * rows);
    const heights = new Float32Array(cols * rows);

    function insideShape(u, v) {
      const dx = (u - 0.5) * 2;
      const dy = (v - 0.5) * 2;
      if (shape === 'circle' || shape === 'oval') {
        const r2 = dx * dx + dy * dy;
        if (r2 > 1.0) return false;
      } else if (shape === 'rounded') {
        const cr = 0.22;
        const ax = Math.max(0, Math.abs(dx) - (1 - cr));
        const ay = Math.max(0, Math.abs(dy) - (1 - cr));
        if (ax * ax + ay * ay > cr * cr) return false;
      }
      if (keychainHole) {
        // Small circular hanging loop hole near top center (u=0.5, v=0.095)
        const hx = (u - 0.5) * widthMm;
        const hy = (v - 0.09) * heightMm;
        const holeR = Math.max(2.0, Math.min(3.2, widthMm * 0.032));
        if (hx * hx + hy * hy < holeR * holeR) return false;
      }
      return true;
    }

    let minThick = Infinity;
    let maxThick = 0;

    for (let r = 0; r < rows; r++) {
      const v = r / (rows - 1);
      for (let c = 0; c < cols; c++) {
        const u = c / (cols - 1);
        const idx = r * cols + c;
        let d = bilinearSample(processedData, srcW, srcH, u, v);
        // In Lithophane mode: brighter pixel = thinner plastic = more light passes through!
        let thick = mode === 'lithophane'
          ? (baseMm + (1 - d) * reliefMm)
          : (baseMm + d * reliefMm);

        // Decorative raised coin/frame rim
        if (borderRimMm > 0) {
          const dx = (u - 0.5) * 2;
          const dy = (v - 0.5) * 2;
          let edgeDist = 1;
          if (shape === 'circle' || shape === 'oval') {
            edgeDist = 1 - Math.sqrt(dx * dx + dy * dy);
          } else if (shape === 'rounded') {
            edgeDist = Math.min(1 - Math.abs(dx), 1 - Math.abs(dy));
          }
          if (edgeDist >= 0 && edgeDist < 0.085) {
            const rimH = baseMm + reliefMm * 0.85 + borderRimMm * 0.15;
            const blend = 1 - edgeDist / 0.085;
            thick = Math.max(thick, thick * (1 - blend) + rimH * blend);
          }
        }

        heights[idx] = thick;
        if (insideShape(u, v)) {
          if (thick < minThick) minThick = thick;
          if (thick > maxThick) maxThick = thick;
        }
      }
    }

    if (!Number.isFinite(minThick)) { minThick = baseMm; maxThick = baseMm + reliefMm; }

    // Determine active quads
    let activeQuadCount = 0;
    for (let r = 0; r < rows - 1; r++) {
      const vc = (r + 0.5) / (rows - 1);
      for (let c = 0; c < cols - 1; c++) {
        const uc = (c + 0.5) / (cols - 1);
        if (insideShape(uc, vc)) {
          cellActive[r * (cols - 1) + c] = 1;
          activeQuadCount++;
          vertMask[r * cols + c] = 1;
          vertMask[r * cols + (c + 1)] = 1;
          vertMask[(r + 1) * cols + c] = 1;
          vertMask[(r + 1) * cols + (c + 1)] = 1;
        }
      }
    }

    // Map grid vertices to 3D space (Z-Up flat on print bed for rect/circle/oval/rounded; upright for arc/cylinder)
    const vCount = cols * rows;
    const topPos = new Float32Array(vCount * 3);
    const botPos = new Float32Array(vCount * 3);
    const uvs = new Float32Array(vCount * 2);

    const radiusArc = shape === 'cylinder'
      ? (widthMm / (Math.PI * 2))
      : (shape === 'arc' ? (widthMm / arcAngleRad) : 0);

    for (let r = 0; r < rows; r++) {
      const v = r / (rows - 1);
      for (let c = 0; c < cols; c++) {
        const u = c / (cols - 1);
        const idx = r * cols + c;
        const thick = heights[idx];
        uvs[idx * 2] = u;
        uvs[idx * 2 + 1] = 1 - v;

        if (shape === 'arc' || shape === 'cylinder') {
          const theta = shape === 'cylinder'
            ? (u * Math.PI * 2 - Math.PI)
            : ((u - 0.5) * arcAngleRad);
          const yCoord = (0.5 - v) * heightMm;
          const rOuter = radiusArc + thick;
          const rInner = radiusArc;
          // Y-up / Z-forward curve so standing lithophane sits nicely on bed
          topPos[idx * 3] = Math.sin(theta) * rOuter;
          topPos[idx * 3 + 1] = yCoord;
          topPos[idx * 3 + 2] = Math.cos(theta) * rOuter - radiusArc;

          botPos[idx * 3] = Math.sin(theta) * rInner;
          botPos[idx * 3 + 1] = yCoord;
          botPos[idx * 3 + 2] = Math.cos(theta) * rInner - radiusArc;
        } else {
          // Flat relief: centered on XY, Z=0 back wall, Z=+thick front relief
          const px = (u - 0.5) * widthMm;
          const py = (0.5 - v) * heightMm;
          topPos[idx * 3] = px;
          topPos[idx * 3 + 1] = py;
          topPos[idx * 3 + 2] = thick;

          botPos[idx * 3] = px;
          botPos[idx * 3 + 1] = py;
          botPos[idx * 3 + 2] = 0;
        }
      }
    }

    // Build combined vertex arrays (top vertices [0..vCount-1], bottom vertices [vCount..2*vCount-1])
    const positions = new Float32Array(vCount * 2 * 3);
    positions.set(topPos, 0);
    positions.set(botPos, vCount * 3);

    const allUVs = new Float32Array(vCount * 2 * 2);
    allUVs.set(uvs, 0);
    allUVs.set(uvs, vCount * 2);

    const indicesList = [];
    let volumeMm3 = 0;
    const cellAreaMm2 = (widthMm / (cols - 1)) * (heightMm / (rows - 1));

    const isCellOn = (rr, cc) => {
      if (rr < 0 || cc < 0 || rr >= rows - 1 || cc >= cols - 1) return false;
      return cellActive[rr * (cols - 1) + cc] === 1;
    };

    // Helper to add outward side wall along directed boundary edge a -> b (where active cell is on left of a->b in top view)
    function addSideQuad(a, b) {
      const aBot = a + vCount;
      const bBot = b + vCount;
      indicesList.push(a, aBot, b);
      indicesList.push(b, aBot, bBot);
    }

    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        if (!isCellOn(r, c)) continue;
        const tl = r * cols + c;
        const tr = r * cols + (c + 1);
        const bl = (r + 1) * cols + c;
        const br = (r + 1) * cols + (c + 1);

        // Top surface (CCW outward +Z)
        indicesList.push(tl, bl, tr);
        indicesList.push(tr, bl, br);

        // Bottom surface (CW from top = outward -Z)
        const tlB = tl + vCount, trB = tr + vCount, blB = bl + vCount, brB = br + vCount;
        indicesList.push(tlB, trB, blB);
        indicesList.push(trB, brB, blB);

        // Watertight perimeter walls wherever an adjacent cell is outside the shape!
        // Top edge (tl -> tr): outward normal +Y -> winding (tr, tl)
        if (!isCellOn(r - 1, c)) addSideQuad(tr, tl);
        // Bottom edge (bl -> br): outward normal -Y -> winding (bl, br)
        if (!isCellOn(r + 1, c)) addSideQuad(bl, br);
        // Left edge (tl -> bl): outward normal -X -> winding (tl, bl)
        if (shape !== 'cylinder' && !isCellOn(r, c - 1)) addSideQuad(tl, bl);
        // Right edge (tr -> br): outward normal +X -> winding (br, tr)
        if (shape !== 'cylinder' && !isCellOn(r, c + 1)) addSideQuad(br, tr);

        const avgH = (heights[tl] + heights[tr] + heights[bl] + heights[br]) * 0.25;
        volumeMm3 += cellAreaMm2 * avgH;
      }
    }

    const indices = new Uint32Array(indicesList);
    const triangleCount = indices.length / 3;
    const volumeCm3 = volumeMm3 / 1000;

    return {
      positions,
      uvs: allUVs,
      indices,
      triangleCount,
      cols,
      rows,
      shape,
      mode,
      dimensionsMm: {
        x: Number(widthMm.toFixed(1)),
        y: Number(heightMm.toFixed(1)),
        z: Number(maxThick.toFixed(2))
      },
      minThickMm: Number(minThick.toFixed(2)),
      maxThickMm: Number(maxThick.toFixed(2)),
      volumeCm3: Number(volumeCm3.toFixed(2)),
      activeQuads: activeQuadCount
    };
  }

  function exportBinarySTL(mesh) {
    const triCount = mesh.triangleCount;
    const bufLen = 84 + triCount * 50;
    const buf = new ArrayBuffer(bufLen);
    const dv = new DataView(buf);

    // 80-byte ASCII header
    const header = 'Studios-Pro Depth Maps Pro Watertight STL (mm)';
    for (let i = 0; i < header.length && i < 80; i++) {
      dv.setUint8(i, header.charCodeAt(i));
    }
    dv.setUint32(80, triCount, true);

    const pos = mesh.positions;
    const idx = mesh.indices;
    let off = 84;

    for (let t = 0; t < triCount; t++) {
      const i0 = idx[t * 3] * 3;
      const i1 = idx[t * 3 + 1] * 3;
      const i2 = idx[t * 3 + 2] * 3;

      const ax = pos[i0], ay = pos[i0 + 1], az = pos[i0 + 2];
      const bx = pos[i1], by = pos[i1 + 1], bz = pos[i1 + 2];
      const cx = pos[i2], cy = pos[i2 + 1], cz = pos[i2 + 2];

      const ux = bx - ax, uy = by - ay, uz = bz - az;
      const vx = cx - ax, vy = cy - ay, vz = cz - az;
      let nx = uy * vz - uz * vy;
      let ny = uz * vx - ux * vz;
      let nz = ux * vy - uy * vx;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      nx /= len; ny /= len; nz /= len;

      dv.setFloat32(off, nx, true); off += 4;
      dv.setFloat32(off, ny, true); off += 4;
      dv.setFloat32(off, nz, true); off += 4;
      dv.setFloat32(off, ax, true); off += 4;
      dv.setFloat32(off, ay, true); off += 4;
      dv.setFloat32(off, az, true); off += 4;
      dv.setFloat32(off, bx, true); off += 4;
      dv.setFloat32(off, by, true); off += 4;
      dv.setFloat32(off, bz, true); off += 4;
      dv.setFloat32(off, cx, true); off += 4;
      dv.setFloat32(off, cy, true); off += 4;
      dv.setFloat32(off, cz, true); off += 4;
      dv.setUint16(off, 0, true); off += 2;
    }
    return buf;
  }

  function exportOBJ(mesh) {
    const pos = mesh.positions;
    const uvs = mesh.uvs;
    const idx = mesh.indices;
    const vCount = pos.length / 3;
    const lines = [
      '# Studios-Pro Depth Maps Pro Watertight 3D Relief',
      `# Dimensions (mm): ${mesh.dimensionsMm.x} x ${mesh.dimensionsMm.y} x ${mesh.dimensionsMm.z}`,
      `# Triangles: ${mesh.triangleCount}`,
      'o DepthRelief'
    ];
    for (let i = 0; i < vCount; i++) {
      lines.push(`v ${pos[i * 3].toFixed(3)} ${pos[i * 3 + 1].toFixed(3)} ${pos[i * 3 + 2].toFixed(3)}`);
    }
    for (let i = 0; i < vCount; i++) {
      lines.push(`vt ${uvs[i * 2].toFixed(4)} ${uvs[i * 2 + 1].toFixed(4)}`);
    }
    for (let t = 0; t < mesh.triangleCount; t++) {
      const a = idx[t * 3] + 1;
      const b = idx[t * 3 + 1] + 1;
      const c = idx[t * 3 + 2] + 1;
      lines.push(`f ${a}/${a} ${b}/${b} ${c}/${c}`);
    }
    return lines.join('\n') + '\n';
  }

  // ── 9. CNC 3D Relief Finishing G-Code + LightBurn 3D Slice Advisor ─────────
  function generateCNC3DToolpath(processedData, srcW, srcH, opts) {
    const o = opts || {};
    const widthMm = clamp(Number(o.widthMm) || 120, 15, 600);
    const heightMm = Number((widthMm * (srcH / Math.max(1, srcW))).toFixed(2));
    const maxCutDepthMm = clamp(Number(o.reliefMm) || 5.0, 0.5, 30);
    const bitDiaMm = clamp(Number(o.bitDiaMm) || 3.175, 0.5, 12.7);
    const bitR = bitDiaMm * 0.5;
    const stepoverPct = clamp(Number(o.stepoverPct) || 18, 5, 50);
    const stepoverMm = Math.max(0.15, bitDiaMm * (stepoverPct / 100));
    const feedRate = clamp(Number(o.feedRate) || 1200, 100, 6000);
    const plungeRate = clamp(Number(o.plungeRate) || 400, 50, 2000);
    const spindleRpm = clamp(Number(o.spindleRpm) || 18000, 3000, 30000);
    const safeZ = clamp(Number(o.safeZ) || 5.0, 2, 30);
    const dialect = o.dialect || 'grbl';

    // Sample surface with spherical ball-nose gouge compensation
    const stepX = Math.max(0.25, Math.min(1.0, bitR * 0.6));
    const numRows = Math.max(4, Math.min(400, Math.ceil(heightMm / stepoverMm) + 1));
    const numCols = Math.max(4, Math.min(400, Math.ceil(widthMm / stepX) + 1));

    const lines = [
      '; ============================================================',
      `; Studios-Pro Depth Maps Pro — 3D CNC Finishing Relief (${dialect.toUpperCase()})`,
      `; Stock Area: ${widthMm.toFixed(1)} x ${heightMm.toFixed(1)} mm | Max Depth: -${maxCutDepthMm.toFixed(2)} mm`,
      `; Tool: Ball-Nose D=${bitDiaMm.toFixed(3)} mm | Stepover: ${stepoverMm.toFixed(2)} mm (${stepoverPct}%)`,
      `; Feed: F${feedRate} | Plunge: F${plungeRate} | Spindle: S${spindleRpm}`,
      '; Work Zero (X0 Y0 Z0): Bottom-Left, Top of Stock Surface',
      '; ============================================================',
      'G21 ; Millimeters',
      'G90 ; Absolute positioning',
      'G17 ; XY plane',
      `G0 Z${safeZ.toFixed(2)}`,
      `M3 S${spindleRpm}`,
      'G4 P2 ; Spindle spin-up dwell'
    ];

    // Ball-nose gouge check offsets in mm (5-point spherical tip check)
    const probeOffsets = [
      [0, 0, 0],
      [bitR * 0.6, 0, bitR - Math.sqrt(Math.max(0, bitR * bitR - (bitR * 0.6) * (bitR * 0.6)))],
      [-bitR * 0.6, 0, bitR - Math.sqrt(Math.max(0, bitR * bitR - (bitR * 0.6) * (bitR * 0.6)))],
      [0, bitR * 0.6, bitR - Math.sqrt(Math.max(0, bitR * bitR - (bitR * 0.6) * (bitR * 0.6)))],
      [0, -bitR * 0.6, bitR - Math.sqrt(Math.max(0, bitR * bitR - (bitR * 0.6) * (bitR * 0.6)))]
    ];

    function sampleToolZ(xMm, yMm) {
      // Highest z required so spherical ball-nose does not gouge adjacent relief
      let reqZ = -maxCutDepthMm;
      for (let k = 0; k < probeOffsets.length; k++) {
        const px = clamp(xMm + probeOffsets[k][0], 0, widthMm);
        const py = clamp(yMm + probeOffsets[k][1], 0, heightMm);
        const u = px / widthMm;
        const v = 1 - (py / heightMm); // CNC Y=0 is bottom of image
        const hVal = bilinearSample(processedData, srcW, srcH, u, v);
        // White (1.0) = top of stock (Z=0), Black (0.0) = deepest cut (Z=-maxCutDepthMm)
        const surfZ = -(1 - hVal) * maxCutDepthMm;
        const safeTipZ = surfZ - probeOffsets[k][2];
        if (safeTipZ > reqZ) reqZ = safeTipZ;
      }
      return clamp(reqZ, -maxCutDepthMm, 0);
    }

    let totalDistMm = 0;
    let prevX = 0, prevY = 0, prevZ = safeZ;
    const previewLines = [];

    for (let r = 0; r < numRows; r++) {
      const yMm = (r / Math.max(1, numRows - 1)) * heightMm;
      const rev = (r % 2) === 1;
      const rowPreview = [];

      for (let ci = 0; ci < numCols; ci++) {
        const c = rev ? (numCols - 1 - ci) : ci;
        const xMm = (c / Math.max(1, numCols - 1)) * widthMm;
        const zMm = sampleToolZ(xMm, yMm);

        if (r === 0 && ci === 0) {
          lines.push(`G0 X${xMm.toFixed(2)} Y${yMm.toFixed(2)}`);
          lines.push(`G1 Z${zMm.toFixed(3)} F${plungeRate}`);
          lines.push(`F${feedRate}`);
        } else {
          lines.push(`G1 X${xMm.toFixed(2)} Y${yMm.toFixed(2)} Z${zMm.toFixed(3)}`);
        }

        const dx = xMm - prevX, dy = yMm - prevY, dz = zMm - prevZ;
        totalDistMm += Math.sqrt(dx * dx + dy * dy + dz * dz);
        prevX = xMm; prevY = yMm; prevZ = zMm;

        if (r % Math.max(1, Math.floor(numRows / 36)) === 0) {
          rowPreview.push({ x: xMm / widthMm, y: 1 - yMm / heightMm, z: 1 + zMm / maxCutDepthMm });
        }
      }
      if (rowPreview.length) previewLines.push(rowPreview);
    }

    lines.push(`G0 Z${safeZ.toFixed(2)}`);
    lines.push('M5 ; Spindle stop');
    lines.push('G0 X0 Y0');
    lines.push('M2 ; Program end');

    const estMinutes = (totalDistMm / feedRate) * 1.18; // +18% accel/decel overhead
    return {
      gcode: lines.join('\n') + '\n',
      lineCount: lines.length,
      scanlines: numRows,
      stepoverMm: Number(stepoverMm.toFixed(2)),
      travelMeters: Number((totalDistMm / 1000).toFixed(2)),
      estMinutes: Number(estMinutes.toFixed(1)),
      previewLines
    };
  }

  function computeLightBurn3DSlicePlan(material, reliefMm) {
    const depth = clamp(Number(reliefMm) || 1.5, 0.2, 8);
    const profiles = {
      brass:    { laser: 'Fiber / MOPA 30–50W', passesPerMm: 120, speed: 1200, power: 90, freqKHz: 45, intervalMm: 0.025, cleanPass: 'Every 15 passes (2000 mm/s, 35%)' },
      aluminum: { laser: 'Fiber / MOPA 30–60W', passesPerMm: 95,  speed: 1400, power: 85, freqKHz: 50, intervalMm: 0.030, cleanPass: 'Every 20 passes (2200 mm/s, 30%)' },
      slate:    { laser: 'Fiber 20W / CO2 40W', passesPerMm: 45,  speed: 900,  power: 60, freqKHz: 40, intervalMm: 0.050, cleanPass: 'Air assist medium' },
      wood:     { laser: 'CO2 40–60W / Diode 20W', passesPerMm: 8, speed: 350, power: 75, freqKHz: 0, intervalMm: 0.080, cleanPass: 'Strong Air Assist (prevents char)' },
      acrylic:  { laser: 'CO2 40–60W', passesPerMm: 10, speed: 400, power: 65, freqKHz: 0, intervalMm: 0.075, cleanPass: 'Low Air Assist (clear polish)' }
    };
    const p = profiles[material] || profiles.brass;
    const totalPasses = Math.max(8, Math.min(256, Math.round(depth * p.passesPerMm)));
    return {
      material,
      laser: p.laser,
      passes: totalPasses,
      speedMmS: p.speed,
      powerPct: p.power,
      freqKHz: p.freqKHz,
      lineIntervalMm: p.intervalMm,
      note: p.cleanPass,
      recommendedFormat: '16-Bit Lossless Grayscale PNG'
    };
  }

  // ── 10. Pre-Flight Relief & Lithophane Inspector ───────────────────────────
  function inspectPreflight(processedData, width, height, settings) {
    const s = settings || {};
    const n = processedData.length;
    let mn = 1, mx = 0;
    let steepCount = 0;
    let totalGrads = 0;

    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        const v = processedData[row + x];
        if (v < mn) mn = v;
        if (v > mx) mx = v;
        if (x + 1 < width && y + 1 < height) {
          const gx = Math.abs(processedData[row + x + 1] - v);
          const gy = Math.abs(processedData[row + width + x] - v);
          if (gx > 0.14 || gy > 0.14) steepCount++;
          totalGrads++;
        }
      }
    }

    // Check border intensity (indicates unflattened background)
    let edgeSum = 0, edgeCnt = 0;
    for (let x = 0; x < width; x++) {
      edgeSum += processedData[x] + processedData[(height - 1) * width + x];
      edgeCnt += 2;
    }
    for (let y = 0; y < height; y++) {
      edgeSum += processedData[y * width] + processedData[y * width + width - 1];
      edgeCnt += 2;
    }
    const edgeAvg = edgeSum / Math.max(1, edgeCnt);
    const dynRange = mx - mn;
    const steepPct = (steepCount / Math.max(1, totalGrads)) * 100;

    const issues = [];
    let score = 100;

    if (dynRange < 0.65) {
      const penalty = dynRange < 0.4 ? 28 : 16;
      score -= penalty;
      issues.push({
        id: 'low_range',
        severity: dynRange < 0.4 ? 'error' : 'warn',
        fixAction: 'autoStretch',
        en: `Weak depth dynamic range (${Math.round(dynRange * 100)}%). Relief will look flat — use Auto-Levels Stretch.`,
        fr: `Plage dynamique faible (${Math.round(dynRange * 100)}%). Le relief sera plat — appliquez Auto-Niveaux.`
      });
    }

    if (s.mode === 'lithophane' && (s.baseMm || 0.8) < 0.8) {
      score -= 24;
      issues.push({
        id: 'thin_litho',
        severity: 'error',
        fixAction: 'fixLithoWall',
        en: `Lithophane min thickness (${(s.baseMm || 0).toFixed(2)} mm) is below 0.8 mm — risk of holes during 3D printing!`,
        fr: `Épaisseur min lithophanie (${(s.baseMm || 0).toFixed(2)} mm) < 0.8 mm — risque de trous à l'impression 3D !`
      });
    }

    if (steepPct > 7.5) {
      score -= Math.min(24, Math.round(steepPct * 1.5));
      issues.push({
        id: 'steep_cliffs',
        severity: steepPct > 14 ? 'error' : 'warn',
        fixAction: 'smartSmooth',
        en: `Steep cliff transitions (${steepPct.toFixed(1)}% of surface). May cause CNC bit chatter or print overhangs.`,
        fr: `Pentes abruptes détectées (${steepPct.toFixed(1)}%). Risque de marques CNC ou surplombs 3D.`
      });
    }

    if (edgeAvg > 0.38 && (s.bevel || 0) < 0.03) {
      score -= 12;
      issues.push({
        id: 'harsh_edges',
        severity: 'info',
        fixAction: 'addBevel',
        en: `Elevated border depth (${Math.round(edgeAvg * 100)}%). Add Edge Fade Bevel for a cleaner framed relief.`,
        fr: `Bords élevés (${Math.round(edgeAvg * 100)}%). Ajoutez un biseau (Edge Fade) pour un cadre propre.`
      });
    }

    if (width < 320 || height < 320) {
      score -= 10;
      issues.push({
        id: 'low_res',
        severity: 'info',
        fixAction: null,
        en: `Depth resolution is ${width}×${height}px. For crisp CNC/Lithophanes, run AI at 756px or 1008px.`,
        fr: `Résolution ${width}×${height}px. Pour CNC/Lithophanie nette, lancez l'IA en 756px ou 1008px.`
      });
    }

    score = clamp(score, 0, 100);
    return {
      score,
      dynamicRangePct: Math.round(dynRange * 100),
      steepPct: Number(steepPct.toFixed(1)),
      edgeAvgPct: Math.round(edgeAvg * 100),
      issues
    };
  }

  // ── 11. Workshop Cost, Time & Etsy Profit Estimator ────────────────────────
  function computeWorkshopQuote(meshStats, opts) {
    const o = opts || {};
    const volCm3 = (meshStats && meshStats.volumeCm3) || 28;
    const process = o.process || '3dprint'; // 3dprint | cnc | laser
    const materialRate = Number(o.materialCostPerUnit) || (process === '3dprint' ? 24 : (process === 'cnc' ? 18 : 12));
    const hourlyRate = Number(o.machineHourlyRate) || 4.5;
    const feePct = clamp(Number(o.etsyFeePct) || 11.5, 0, 40) / 100;
    const markup = clamp(Number(o.markup) || 3.0, 1.1, 10);

    let estHours = 1.5;
    let matCost = 2.0;
    let weightG = 0;

    if (process === '3dprint') {
      // PLA density ~1.24 g/cm³, lithophane ~95% infill, relief ~35% infill
      const infillFactor = (meshStats && meshStats.mode === 'lithophane') ? 0.95 : 0.45;
      weightG = volCm3 * 1.24 * infillFactor;
      matCost = (weightG / 1000) * materialRate;
      estHours = Math.max(0.4, (weightG / 14)); // ~14g/hr fine 0.12mm layer quality
    } else if (process === 'cnc') {
      const areaCm2 = ((meshStats && meshStats.dimensionsMm) ? (meshStats.dimensionsMm.x * meshStats.dimensionsMm.y) / 100 : 120);
      matCost = Math.max(1.5, (areaCm2 / 400) * materialRate);
      estHours = Math.max(0.3, (areaCm2 / 140));
    } else {
      const areaCm2 = ((meshStats && meshStats.dimensionsMm) ? (meshStats.dimensionsMm.x * meshStats.dimensionsMm.y) / 100 : 80);
      matCost = Math.max(2.0, (areaCm2 / 100) * (materialRate * 0.4));
      estHours = Math.max(0.25, (areaCm2 / 120));
    }

    const machineCost = estHours * hourlyRate;
    const totalCost = matCost + machineCost;
    const retailPrice = totalCost * markup;
    const platformFees = retailPrice * feePct + 0.45;
    const netProfit = retailPrice - totalCost - platformFees;
    const marginPct = retailPrice > 0 ? (netProfit / retailPrice) * 100 : 0;

    return {
      weightG: Number(weightG.toFixed(1)),
      estHours: Number(estHours.toFixed(2)),
      materialCost: Number(matCost.toFixed(2)),
      machineCost: Number(machineCost.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
      platformFees: Number(platformFees.toFixed(2)),
      retailPrice: Number(retailPrice.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
      marginPct: Math.round(marginPct)
    };
  }

  // ── 12. Built-in Procedural Demo Photos (Zero CORS / Instant Testing!) ─────
  function generateDemoImageCanvas(presetId, size) {
    const w = size || 640;
    const h = presetId === 'mountain' ? Math.round(w * 0.68) : w;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');

    if (presetId === 'coin') {
      // Ornate Royal Sun & Laurel Medallion
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(0, 0, w, h);
      const cx = w * 0.5, cy = h * 0.5, R = w * 0.44;
      // Outer metallic disc gradient
      const bg = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.25, R * 0.05, cx, cy, R);
      bg.addColorStop(0, '#f5d98e');
      bg.addColorStop(0.55, '#b8862d');
      bg.addColorStop(0.88, '#6e4d12');
      bg.addColorStop(1, '#2a1d06');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

      // Concentric raised rings
      ctx.strokeStyle = '#ffefc2';
      ctx.lineWidth = w * 0.025;
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.91, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#573a0a';
      ctx.lineWidth = w * 0.012;
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.84, 0, Math.PI * 2); ctx.stroke();

      // Sunburst rays
      ctx.save();
      ctx.translate(cx, cy);
      for (let i = 0; i < 24; i++) {
        ctx.rotate((Math.PI * 2) / 24);
        const ray = ctx.createLinearGradient(0, -R * 0.2, 0, -R * 0.78);
        ray.addColorStop(0, '#fff7dc');
        ray.addColorStop(1, '#996c1d');
        ctx.fillStyle = ray;
        ctx.beginPath();
        ctx.moveTo(-w * 0.016, -R * 0.26);
        ctx.lineTo(0, -R * 0.76);
        ctx.lineTo(w * 0.016, -R * 0.26);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Embossed center crest sphere + crown star
      const core = ctx.createRadialGradient(cx - R * 0.1, cy - R * 0.1, R * 0.02, cx, cy, R * 0.34);
      core.addColorStop(0, '#ffffff');
      core.addColorStop(0.45, '#f6d884');
      core.addColorStop(0.85, '#9d6d19');
      core.addColorStop(1, '#4d3206');
      ctx.fillStyle = core;
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.34, 0, Math.PI * 2); ctx.fill();

      // 8-point central relief star
      ctx.fillStyle = '#fff9e6';
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const ang = (i * Math.PI) / 8 - Math.PI / 2;
        const rad = i % 2 === 0 ? R * 0.24 : R * 0.10;
        const px = cx + Math.cos(ang) * rad;
        const py = cy + Math.sin(ang) * rad;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();

      // Rim beads
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        ctx.fillStyle = '#ffeab0';
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * R * 0.875, cy + Math.sin(a) * R * 0.875, w * 0.008, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (presetId === 'mountain') {
      // Layered Alpine Mountain Sunset (deep aerial perspective)
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.65);
      sky.addColorStop(0, '#101b36');
      sky.addColorStop(0.55, '#3b4a7a');
      sky.addColorStop(1, '#f4a261');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Sun
      const sun = ctx.createRadialGradient(w * 0.68, h * 0.28, 4, w * 0.68, h * 0.28, w * 0.16);
      sun.addColorStop(0, '#fff7d6');
      sun.addColorStop(0.35, '#ffd166');
      sun.addColorStop(1, 'rgba(244,162,97,0)');
      ctx.fillStyle = sun;
      ctx.beginPath(); ctx.arc(w * 0.68, h * 0.28, w * 0.16, 0, Math.PI * 2); ctx.fill();

      // Far mountain layer
      const drawRidge = (pts, fillTop, fillBot) => {
        const g = ctx.createLinearGradient(0, h * 0.2, 0, h);
        g.addColorStop(0, fillTop);
        g.addColorStop(1, fillBot);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (const [px, py] of pts) ctx.lineTo(px * w, py * h);
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
      };
      drawRidge([[0, 0.56], [0.18, 0.34], [0.35, 0.46], [0.55, 0.24], [0.76, 0.42], [0.91, 0.30], [1, 0.45]], '#7888b0', '#3d4a6e');
      drawRidge([[0, 0.66], [0.12, 0.48], [0.30, 0.58], [0.47, 0.38], [0.66, 0.56], [0.84, 0.42], [1, 0.58]], '#a5b4cc', '#2c3552');
      drawRidge([[0, 0.78], [0.22, 0.60], [0.45, 0.72], [0.72, 0.55], [1, 0.70]], '#d6e2f0', '#1b2438');

      // Foreground bright rocky ledge & pine silhouettes
      drawRidge([[0, 0.86], [0.28, 0.76], [0.58, 0.84], [0.85, 0.74], [1, 0.82]], '#eef4fc', '#5c6b82');
      for (let i = 0; i < 18; i++) {
        const tx = (i / 17) * w;
        const th = h * (0.10 + (i % 3) * 0.03);
        const ty = h * 0.84 - (i % 2) * h * 0.03;
        ctx.fillStyle = i % 2 === 0 ? '#dce6f5' : '#b8c8df';
        ctx.beginPath();
        ctx.moveTo(tx, ty - th);
        ctx.lineTo(tx - w * 0.025, ty + h * 0.14);
        ctx.lineTo(tx + w * 0.025, ty + h * 0.14);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      // Classical Sculpted Relief Portrait Bust (Studio Chiaroscuro)
      const bg = ctx.createRadialGradient(w * 0.5, h * 0.45, w * 0.05, w * 0.5, h * 0.5, w * 0.62);
      bg.addColorStop(0, '#2a3346');
      bg.addColorStop(1, '#090d16');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Decorative oval cameo halo
      ctx.strokeStyle = 'rgba(210, 224, 245, 0.25)';
      ctx.lineWidth = w * 0.014;
      ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.5, w * 0.39, h * 0.44, 0, 0, Math.PI * 2); ctx.stroke();

      // Shoulders / draped bust
      const bust = ctx.createRadialGradient(w * 0.48, h * 0.74, w * 0.02, w * 0.5, h * 0.82, w * 0.36);
      bust.addColorStop(0, '#eef2f7');
      bust.addColorStop(0.55, '#9aa6ba');
      bust.addColorStop(1, '#252e40');
      ctx.fillStyle = bust;
      ctx.beginPath();
      ctx.moveTo(w * 0.18, h * 0.92);
      ctx.quadraticCurveTo(w * 0.22, h * 0.68, w * 0.42, h * 0.64);
      ctx.lineTo(w * 0.58, h * 0.64);
      ctx.quadraticCurveTo(w * 0.78, h * 0.68, w * 0.82, h * 0.92);
      ctx.closePath();
      ctx.fill();

      // Neck
      const neck = ctx.createLinearGradient(w * 0.42, h * 0.55, w * 0.58, h * 0.68);
      neck.addColorStop(0, '#cbd5e1');
      neck.addColorStop(0.5, '#e2e8f0');
      neck.addColorStop(1, '#64748b');
      ctx.fillStyle = neck;
      ctx.fillRect(w * 0.435, h * 0.54, w * 0.13, h * 0.15);

      // Sculpted Head Oval
      const head = ctx.createRadialGradient(w * 0.47, h * 0.36, w * 0.02, w * 0.5, h * 0.40, w * 0.21);
      head.addColorStop(0, '#ffffff');
      head.addColorStop(0.55, '#cbd5e1');
      head.addColorStop(0.88, '#64748b');
      head.addColorStop(1, '#273142');
      ctx.fillStyle = head;
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.40, w * 0.165, h * 0.205, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sculpted hair waves
      ctx.fillStyle = '#94a3b8';
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(w * (0.5 + i * 0.045), h * (0.22 + Math.abs(i) * 0.022), w * 0.045, 0, Math.PI * 2);
        ctx.fill();
      }
      // Nose bridge highlight & brow/cheek shading
      const nose = ctx.createLinearGradient(w * 0.5, h * 0.35, w * 0.5, h * 0.47);
      nose.addColorStop(0, '#ffffff');
      nose.addColorStop(1, '#dbe4f0');
      ctx.fillStyle = nose;
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.42, w * 0.024, h * 0.055, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eye sockets (subtle darker recess)
      ctx.fillStyle = 'rgba(30, 41, 59, 0.48)';
      ctx.beginPath(); ctx.ellipse(w * 0.435, h * 0.385, w * 0.032, h * 0.016, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(w * 0.565, h * 0.385, w * 0.032, h * 0.016, 0, 0, Math.PI * 2); ctx.fill();

      // Lips highlight
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.505, w * 0.042, h * 0.014, 0, 0, Math.PI * 2); ctx.fill();
    }
    return cv;
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  return {
    COLOR_MAPS,
    clamp01,
    clamp,
    fastBoxBlur,
    detectWebGPU,
    computeTargetDims,
    runAIDepth,
    runFastHeuristicDepth,
    computePercentiles,
    computeLuminanceHighPass,
    computeProcessedDepth,
    computeHistogram,
    encodePNG16,
    encodePNG16Sync,
    generateNormalMap,
    generateAOMap,
    generateCurvatureMap,
    bilinearSample,
    buildSolidReliefMesh,
    exportBinarySTL,
    exportOBJ,
    generateCNC3DToolpath,
    computeLightBurn3DSlicePlan,
    inspectPreflight,
    computeWorkshopQuote,
    generateDemoImageCanvas
  };
}));
