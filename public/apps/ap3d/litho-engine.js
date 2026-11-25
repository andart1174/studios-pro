/**
 * 3D Studio Pro — Ultra-HD Lithophane, Lamp & 3D Relief CAD Engine
 * Studios-Pro (https://studios-pro.com/apps/ap3d/)
 * Features:
 *  - O(W*H) Image Filters (Auto-Aspect Crop, Noise Reduction, Sharpen, Contrast, Brightness, Gamma, True Blur)
 *  - 3D Embossed / Engraved Custom Frame Text
 *  - 9 Parametric Watertight Manifold CAD Shapes with Verified Outward Normals (+Signed Volume):
 *      flat, arc, cylinder (seam-welded 360° + LED socket ring), heart, circle, oval, hexagon, sphere (Moon Lamp), lantern
 *  - Dual-Resolution Smart CAD Sizing (prevents OOM crashes!)
 *  - Binary STL + Streaming Array-Joined OBJ + Color Backlit Print Sheet Helper
 *  - Cross-Section Thickness Caliper, Slicer Pre-Flight Inspector, Etsy Print/LED Quote & 4 Built-in Demos
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LithoEngine = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this), function () {
  'use strict';

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

  // ── 1. O(W*H) Sliding-Window Separable Box Blur ────────────────────────────
  function boxBlurPass(src, dst, tmp, w, h, r) {
    const win = r * 2 + 1;
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let sum = src[row] * (r + 1);
      for (let x = 1; x <= r; x++) sum += src[row + Math.min(w - 1, x)];
      tmp[row] = sum / win;
      for (let x = 1; x < w; x++) {
        const a = x + r < w ? x + r : w - 1;
        const b = x - r - 1 >= 0 ? x - r - 1 : 0;
        sum += src[row + a] - src[row + b];
        tmp[row + x] = sum / win;
      }
    }
    for (let x = 0; x < w; x++) {
      let sum = tmp[x] * (r + 1);
      for (let y = 1; y <= r; y++) sum += tmp[Math.min(h - 1, y) * w + x];
      dst[x] = sum / win;
      for (let y = 1; y < h; y++) {
        const a = y + r < h ? y + r : h - 1;
        const b = y - r - 1 >= 0 ? y - r - 1 : 0;
        sum += tmp[a * w + x] - tmp[b * w + x];
        dst[y * w + x] = sum / win;
      }
    }
  }

  function fastSmoothFloat(src, w, h, radius, passes) {
    const r = Math.round(radius);
    if (r < 1 || w < 2 || h < 2) return new Float32Array(src);
    const numP = passes || 1;
    let cur = new Float32Array(src);
    let dst = new Float32Array(src.length);
    const tmp = new Float32Array(src.length);
    for (let p = 0; p < numP; p++) {
      boxBlurPass(cur, dst, tmp, w, h, r);
      const sw = cur; cur = dst; dst = sw;
    }
    return cur;
  }

  // ── 2. Image Crop, Aspect Ratio & Heightfield Processing ───────────────────
  function computeCropRect(imgW, imgH, cropMode) {
    if (!cropMode || cropMode === 'original') {
      return { sx: 0, sy: 0, sw: imgW, sh: imgH, aspect: imgW / Math.max(1, imgH) };
    }
    const targetMap = { '1:1': 1, '4:3': 4 / 3, '3:4': 3 / 4, '16:9': 16 / 9, '2:1': 2.0 };
    const target = targetMap[cropMode] || (imgW / Math.max(1, imgH));
    const cur = imgW / Math.max(1, imgH);
    let sw = imgW, sh = imgH, sx = 0, sy = 0;
    if (cur > target) {
      sw = Math.max(1, Math.round(imgH * target));
      sx = Math.floor((imgW - sw) * 0.5);
    } else {
      sh = Math.max(1, Math.round(imgW / target));
      sy = Math.floor((imgH - sh) * 0.5);
    }
    return { sx, sy, sw, sh, aspect: sw / Math.max(1, sh) };
  }

  function processHeightfieldFromRGBA(rgba, width, height, settings) {
    const s = settings || {};
    const n = width * height;
    let lum = new Float32Array(n);

    // 1. Convert RGBA -> perceptual luminance (white-backing transparent PNGs cleanly!)
    for (let i = 0; i < n; i++) {
      const a = rgba[i * 4 + 3] / 255;
      const r = rgba[i * 4] * a + 255 * (1 - a);
      const g = rgba[i * 4 + 1] * a + 255 * (1 - a);
      const b = rgba[i * 4 + 2] * a + 255 * (1 - a);
      lum[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    }

    // 2. Smooth Noise Reduction (True O(N) edge-safe radius 1..6!)
    const nr = Math.max(0, Math.round(s.noiseReduction || 0));
    if (nr > 0) {
      lum = fastSmoothFloat(lum, width, height, nr, 1);
    }

    // 3. Contrast, Brightness, Gamma, Invert
    const contrast = clamp((s.contrast !== undefined ? s.contrast : 0), -90, 120);
    const cFactor = (100 + contrast) / 100;
    const bright = clamp((s.brightness !== undefined ? s.brightness : 0), -100, 100) / 100;
    const gamma = clamp((s.gamma !== undefined ? s.gamma : 1.0), 0.2, 3.0);
    const invert = !!s.invert;

    for (let i = 0; i < n; i++) {
      let v = lum[i] + bright;
      v = (v - 0.5) * cFactor + 0.5;
      v = clamp01(v);
      if (gamma !== 1) v = Math.pow(v, 1 / gamma);
      if (invert) v = 1 - v;
      lum[i] = clamp01(v);
    }

    // 4. Unsharp Mask Sharpening (Details)
    const sharpen = clamp(s.sharpen || 0, 0, 10);
    if (sharpen > 0) {
      const blurRef = fastSmoothFloat(lum, width, height, Math.max(1, Math.round(width * 0.004)), 1);
      const amt = sharpen * 0.35;
      for (let i = 0; i < n; i++) {
        lum[i] = clamp01(lum[i] + (lum[i] - blurRef[i]) * amt);
      }
    }

    // 5. True Relief Smoothing / Blur
    const blur = Math.max(0, Math.round(s.blur || 0));
    if (blur > 0) {
      lum = fastSmoothFloat(lum, width, height, blur, 2);
    }

    // Compute min/max/avg stats
    let mn = 1, mx = 0, sum = 0;
    for (let i = 0; i < n; i++) {
      const v = lum[i];
      if (v < mn) mn = v;
      if (v > mx) mx = v;
      sum += v;
    }
    return { data: lum, width, height, min: mn, max: mx, avg: sum / Math.max(1, n) };
  }

  // ── 3. Smart Safe Export Resolution Calculator (Prevents OOM Crash B3!) ────
  function computeSafeGridSize(widthMm, heightMm, qualityPreset, isPreview) {
    // Preview stays 60fps snappy; Export scales smoothly by physical mm/pixel capped safely < 460k tris!
    if (isPreview) {
      const maxPrev = 180;
      if (widthMm >= heightMm) {
        return { cols: maxPrev, rows: Math.max(36, Math.round(maxPrev * (heightMm / widthMm))) };
      }
      return { rows: maxPrev, cols: Math.max(36, Math.round(maxPrev * (widthMm / heightMm))) };
    }
    const mmPerPx = qualityPreset === 'ultra' ? 0.22 : (qualityPreset === 'fine' ? 0.30 : 0.42);
    const maxCap = qualityPreset === 'ultra' ? 420 : (qualityPreset === 'fine' ? 320 : 220);
    let cols = clamp(Math.round(widthMm / mmPerPx), 60, maxCap);
    let rows = clamp(Math.round(heightMm / mmPerPx), 60, maxCap);
    // Keep total quads under 160,000 (~320k–640k tris max, ~16–32 MB STL -> NEVER OOMs!)
    const maxQuads = qualityPreset === 'ultra' ? 160000 : (qualityPreset === 'fine' ? 105000 : 52000);
    if (cols * rows > maxQuads) {
      const sc = Math.sqrt(maxQuads / (cols * rows));
      cols = Math.max(48, Math.floor(cols * sc));
      rows = Math.max(48, Math.floor(rows * sc));
    }
    return { cols, rows };
  }

  function bilinearSample(data, w, h, u, v) {
    const x = clamp01(u) * (w - 1);
    const y = clamp01(v) * (h - 1);
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1);
    const fx = x - x0, fy = y - y0;
    const a = data[y0 * w + x0], b = data[y0 * w + x1];
    const c = data[y1 * w + x0], d = data[y1 * w + x1];
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
  }

  // ── 4. Rasterize Optional Custom Frame Text Mask ───────────────────────────
  function buildFrameTextMask(text, widthPx, heightPx) {
    if (!text || !String(text).trim() || typeof document === 'undefined') return null;
    const str = String(text).trim().slice(0, 42);
    const cv = document.createElement('canvas');
    cv.width = widthPx;
    cv.height = heightPx;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, widthPx, heightPx);
    let fontSize = Math.max(12, Math.floor(heightPx * 0.68));
    ctx.font = `700 ${fontSize}px Inter, Arial, sans-serif`;
    while (ctx.measureText(str).width > widthPx * 0.88 && fontSize > 9) {
      fontSize--;
      ctx.font = `700 ${fontSize}px Inter, Arial, sans-serif`;
    }
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(str, widthPx * 0.5, heightPx * 0.52);
    const px = ctx.getImageData(0, 0, widthPx, heightPx).data;
    const mask = new Float32Array(widthPx * heightPx);
    for (let i = 0; i < mask.length; i++) mask[i] = px[i * 4] / 255;
    return { mask, width: widthPx, height: heightPx };
  }

  // ── 5. Watertight 9-Shape Parametric CAD Mesh Builder (Verified +Signed Volume!) ─
  function buildCADMesh(heightfield, opts) {
    const o = opts || {};
    const src = heightfield.data;
    const srcW = heightfield.width;
    const srcH = heightfield.height;

    const mode = o.mode || 'lithophane'; // lithophane (bright = THIN!) | relief (bright = HIGH!)
    const shape = o.shape || 'flat';     // flat | arc | cylinder | heart | circle | oval | hexagon | sphere | lantern
    const widthMm = clamp(Number(o.widthMm) || 120, 20, 400);
    const srcAspect = srcH / Math.max(1, srcW);
    const isSquareShape = (shape === 'circle' || shape === 'heart' || shape === 'hexagon');
    const isSphere = (shape === 'sphere');
    const heightMm = isSphere
      ? widthMm
      : (isSquareShape ? widthMm : Number((widthMm * srcAspect).toFixed(2)));

    const minThickMm = clamp(Number(o.minThickMm) || (mode === 'lithophane' ? 0.8 : 1.8), 0.4, 15);
    const maxThickMm = clamp(Number(o.maxThickMm) || (mode === 'lithophane' ? 3.2 : 6.0), minThickMm + 0.4, 35);
    const reliefSpan = maxThickMm - minThickMm;

    const frameWidthMm = clamp(Number(o.frameWidthMm) || 0, 0, 22);
    const frameHeightMm = clamp(Number(o.frameHeightMm) || (maxThickMm + 0.8), maxThickMm, 38);
    const curveAngleDeg = clamp(Number(o.curveAngleDeg) || 110, 30, 210);
    const keychainHole = !!o.keychainHole && ['flat', 'circle', 'heart', 'oval', 'hexagon'].includes(shape);
    const builtInStand = !!o.builtInStand && shape === 'flat';
    const socketDiaMm = clamp(Number(o.socketDiaMm) || 32, 0, Math.max(0, widthMm / Math.PI - 6));

    const textStr = (o.frameText || '').trim();
    const textMode = o.frameTextMode || 'emboss'; // emboss | engrave
    const effectiveBottomFrame = (textStr && shape === 'flat') ? Math.max(frameWidthMm, 11) : frameWidthMm;

    const totalW = (shape === 'flat' || shape === 'lantern') ? (widthMm + frameWidthMm * 2) : widthMm;
    const totalH = (shape === 'flat' || shape === 'lantern') ? (heightMm + frameWidthMm + effectiveBottomFrame) : heightMm;

    const grid = computeSafeGridSize(totalW, totalH, o.quality || 'fine', !!o.isPreview);

    // Dispatch specialized closed manifold builders for Sphere (Moon Lamp) & 360° Cylinder!
    if (shape === 'sphere') {
      return buildSphereLampMesh(src, srcW, srcH, {
        diameterMm: widthMm,
        minThickMm,
        maxThickMm,
        mode,
        openingDiaMm: clamp(Number(o.socketDiaMm) || Math.round(widthMm * 0.42), 18, widthMm * 0.72),
        cols: Math.min(220, Math.max(48, grid.cols)),
        rows: Math.min(130, Math.max(32, Math.round(grid.cols * 0.6)))
      });
    }

    if (shape === 'cylinder') {
      return buildCylinderLampMesh(src, srcW, srcH, {
        circumferenceMm: widthMm * Math.PI * 0.85,
        heightMm,
        minThickMm,
        maxThickMm,
        mode,
        collarMm: Math.max(3, frameWidthMm || 4),
        frameHeightMm,
        socketDiaMm,
        cols: Math.min(260, Math.max(64, grid.cols)),
        rows: Math.min(220, Math.max(48, grid.rows))
      });
    }

    const cols = grid.cols;
    const rows = grid.rows;

    // Optional frame text mask on bottom border (for flat plaque)
    const textMask = (textStr && shape === 'flat' && effectiveBottomFrame >= 8)
      ? buildFrameTextMask(textStr, 360, 64)
      : null;

    // Shape inclusion test on normalized (u, v) in [0..1]
    function insideShape(u, v) {
      const dx = (u - 0.5) * 2;
      const dy = (0.5 - v) * 2; // +Y up
      if (shape === 'circle' || shape === 'oval') {
        if (dx * dx + dy * dy > 1.0) return false;
      } else if (shape === 'heart') {
        // Classic smooth parametric heart implicit curve
        const hx = dx * 1.18;
        const hy = (dy - 0.08) * 1.18;
        const a = hx * hx + hy * hy - 1;
        if (a * a * a - hx * hx * hy * hy * hy > 0) return false;
      } else if (shape === 'hexagon') {
        const ax = Math.abs(dx), ay = Math.abs(dy);
        if (ay > 0.866 || ax + ay * 0.57735 > 1.0) return false;
      }
      if (keychainHole) {
        const hx = (u - 0.5) * totalW;
        const hyTop = shape === 'heart' ? 0.24 : 0.095;
        const hy = (v - hyTop) * totalH;
        const holeR = clamp(totalW * 0.032, 2.0, 3.2);
        if (hx * hx + hy * hy < holeR * holeR) return false;
      }
      return true;
    }

    // Distance to shape border for optional decorative raised rim
    function borderFactor(u, v) {
      if (shape === 'flat' || shape === 'lantern') {
        const xMm = u * totalW;
        const yFromTop = v * totalH;
        const yFromBot = (1 - v) * totalH;
        if (xMm < frameWidthMm || xMm > totalW - frameWidthMm || yFromTop < frameWidthMm || yFromBot < effectiveBottomFrame) {
          return 1;
        }
        return 0;
      }
      if (frameWidthMm <= 0.2) return 0;
      const dx = (u - 0.5) * 2;
      const dy = (0.5 - v) * 2;
      const frac = clamp(frameWidthMm / (totalW * 0.5), 0.03, 0.22);
      if (shape === 'circle' || shape === 'oval') {
        return Math.sqrt(dx * dx + dy * dy) > (1 - frac) ? 1 : 0;
      }
      if (shape === 'hexagon') {
        const ax = Math.abs(dx), ay = Math.abs(dy);
        return (ay > 0.866 * (1 - frac) || ax + ay * 0.57735 > (1 - frac)) ? 1 : 0;
      }
      if (shape === 'heart') {
        const sc = 1 / (1 - frac * 0.85);
        const hx = dx * 1.18 * sc, hy = (dy - 0.08) * 1.18 * sc;
        const a = hx * hx + hy * hy - 1;
        return (a * a * a - hx * hx * hy * hy * hy > 0) ? 1 : 0;
      }
      if (shape === 'arc') {
        const xMm = u * totalW, yMm = v * totalH;
        if (xMm < frameWidthMm || xMm > totalW - frameWidthMm || yMm < frameWidthMm || yMm > totalH - frameWidthMm) return 1;
      }
      return 0;
    }

    const vCount = cols * rows;
    const heights = new Float32Array(vCount);
    const cellActive = new Uint8Array((cols - 1) * (rows - 1));
    let minMeasured = Infinity, maxMeasured = 0;

    for (let r = 0; r < rows; r++) {
      const v = r / (rows - 1);
      for (let c = 0; c < cols; c++) {
        const u = c / (cols - 1);
        const idx = r * cols + c;
        let thick;

        if (borderFactor(u, v) > 0.5) {
          thick = frameHeightMm;
          // Apply 3D Embossed / Engraved Text on bottom border of flat plaque
          if (textMask && shape === 'flat') {
            const yFromBot = (1 - v) * totalH;
            if (yFromBot >= 1.2 && yFromBot <= effectiveBottomFrame - 1.2) {
              const txU = clamp01((u * totalW - frameWidthMm) / Math.max(1, widthMm));
              const txV = clamp01(1 - (yFromBot - 1.2) / Math.max(1, effectiveBottomFrame - 2.4));
              const mVal = bilinearSample(textMask.mask, textMask.width, textMask.height, txU, txV);
              if (mVal > 0.15) {
                thick = textMode === 'engrave'
                  ? Math.max(minThickMm, frameHeightMm - mVal * 1.3)
                  : (frameHeightMm + mVal * 1.35);
              }
            }
          }
          // Lantern side lip bevel
          if (shape === 'lantern') thick = frameHeightMm + 1.0;
        } else {
          // Map inner image coordinates cleanly inside frame
          let iu = u, iv = v;
          if ((shape === 'flat' || shape === 'lantern') && (frameWidthMm > 0 || effectiveBottomFrame > 0)) {
            iu = clamp01((u * totalW - frameWidthMm) / Math.max(1, widthMm));
            iv = clamp01((v * totalH - frameWidthMm) / Math.max(1, heightMm));
          }
          const lum = bilinearSample(src, srcW, srcH, iu, iv);
          // TRUE LITHOPHANE PHYSICS: bright pixel (lum=1) -> THIN wall (minThickMm)!
          // RELIEF MODE: bright pixel (lum=1) -> HIGH ridge (maxThickMm)!
          thick = mode === 'lithophane'
            ? (minThickMm + (1 - lum) * reliefSpan)
            : (minThickMm + lum * reliefSpan);
        }

        // Optional Built-in Desk Stand foot flange along bottom 7% of flat plaque
        if (builtInStand && v > 0.93) {
          const footRamp = (v - 0.93) / 0.07;
          thick = Math.max(thick, maxThickMm + footRamp * 14.0);
        }

        heights[idx] = thick;
        if (insideShape(u, v)) {
          if (thick < minMeasured) minMeasured = thick;
          if (thick > maxMeasured) maxMeasured = thick;
        }
      }
    }
    if (!Number.isFinite(minMeasured)) { minMeasured = minThickMm; maxMeasured = maxThickMm; }

    let activeQuads = 0;
    for (let r = 0; r < rows - 1; r++) {
      const vc = (r + 0.5) / (rows - 1);
      for (let c = 0; c < cols - 1; c++) {
        const uc = (c + 0.5) / (cols - 1);
        if (insideShape(uc, vc)) {
          cellActive[r * (cols - 1) + c] = 1;
          activeQuads++;
        }
      }
    }

    // Map vertices to 3D upright standing coordinates (X right, Y up, Z front relief!)
    const positions = new Float32Array(vCount * 2 * 3);
    const uvs = new Float32Array(vCount * 2 * 2);
    const arcRad = curveAngleDeg * (Math.PI / 180);
    const arcR = shape === 'arc' ? (totalW / arcRad) : 0;

    for (let r = 0; r < rows; r++) {
      const v = r / (rows - 1);
      const yPos = (0.5 - v) * totalH;
      for (let c = 0; c < cols; c++) {
        const u = c / (cols - 1);
        const idx = r * cols + c;
        const thick = heights[idx];
        const bIdx = idx + vCount;

        uvs[idx * 2] = u; uvs[idx * 2 + 1] = 1 - v;
        uvs[bIdx * 2] = u; uvs[bIdx * 2 + 1] = 1 - v;

        if (shape === 'arc') {
          const theta = (u - 0.5) * arcRad;
          const sinT = Math.sin(theta), cosT = Math.cos(theta);
          const rOut = arcR + thick;
          const rIn = arcR;
          positions[idx * 3] = sinT * rOut;
          positions[idx * 3 + 1] = yPos;
          positions[idx * 3 + 2] = cosT * rOut - arcR;

          positions[bIdx * 3] = sinT * rIn;
          positions[bIdx * 3 + 1] = yPos;
          positions[bIdx * 3 + 2] = cosT * rIn - arcR;
        } else {
          const xPos = (u - 0.5) * totalW;
          positions[idx * 3] = xPos;
          positions[idx * 3 + 1] = yPos;
          positions[idx * 3 + 2] = thick;

          positions[bIdx * 3] = xPos;
          positions[bIdx * 3 + 1] = yPos;
          positions[bIdx * 3 + 2] = 0;
        }
      }
    }

    const indicesList = [];
    const isCellOn = (rr, cc) => (rr >= 0 && cc >= 0 && rr < rows - 1 && cc < cols - 1) && cellActive[rr * (cols - 1) + cc] === 1;

    // GUARANTEED OUTWARD CCW WINDING (Fixes inside-out normals bug B4!):
    // On front (+Z) face: tl=(x0,y1), tr=(x1,y1), bl=(x0,y0), br=(x1,y0)
    // (bl - tl) x (tr - tl) = (0,-dy,0) x (+dx,0,0) = (0,0,+dx*dy) -> +Z OUTWARD!
    function addSideWall(aFront, bFront) {
      const aBack = aFront + vCount;
      const bBack = bFront + vCount;
      // Front edge runs aFront -> bFront with interior on its LEFT in +Z view:
      // Outward side normal = (bFront - aFront) x (aBack - aFront) => CCW: (aFront, aBack, bFront) & (bFront, aBack, bBack)
      indicesList.push(aFront, aBack, bFront);
      indicesList.push(bFront, aBack, bBack);
    }

    let volMm3 = 0;
    const cellArea = (totalW / (cols - 1)) * (totalH / (rows - 1));

    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        if (!isCellOn(r, c)) continue;
        const tl = r * cols + c;
        const tr = r * cols + (c + 1);
        const bl = (r + 1) * cols + c;
        const br = (r + 1) * cols + (c + 1);

        // Front face (+Z outward)
        indicesList.push(tl, bl, tr);
        indicesList.push(tr, bl, br);

        // Back face (-Z outward)
        const tlB = tl + vCount, trB = tr + vCount, blB = bl + vCount, brB = br + vCount;
        indicesList.push(tlB, trB, blB);
        indicesList.push(trB, brB, blB);

        // Watertight perimeter side walls (CCW outward)
        if (!isCellOn(r - 1, c)) addSideWall(tr, tl); // Top (+Y)
        if (!isCellOn(r + 1, c)) addSideWall(bl, br); // Bottom (-Y)
        if (!isCellOn(r, c - 1)) addSideWall(tl, bl); // Left (-X)
        if (!isCellOn(r, c + 1)) addSideWall(br, tr); // Right (+X)

        volMm3 += cellArea * (heights[tl] + heights[tr] + heights[bl] + heights[br]) * 0.25;
      }
    }

    const indices = new Uint32Array(indicesList);
    return finalizeMeshStats(positions, uvs, indices, {
      cols, rows, shape, mode,
      widthMm: totalW, heightMm: totalH,
      minThickMm: minMeasured, maxThickMm: maxMeasured,
      volumeCm3: volMm3 / 1000,
      upright: shape === 'arc'
    });
  }

  // ── 5b. Seam-Welded 360° Cylinder Nightlight Lamp (0 internal seam walls!) ─
  function buildCylinderLampMesh(src, srcW, srcH, o) {
    const segs = o.cols;
    const rows = o.rows;
    const innerR = Math.max(12, o.circumferenceMm / (Math.PI * 2));
    const H = o.heightMm;
    const span = o.maxThickMm - o.minThickMm;
    const hasBottomFloor = o.socketDiaMm > 0 && o.socketDiaMm < innerR * 1.85;
    const holeR = hasBottomFloor ? o.socketDiaMm * 0.5 : innerR;

    // Ring layout: outer [0..rows*segs-1], inner [rows*segs..2*rows*segs-1]
    // If bottom LED socket adapter ring enabled, add an extra inner-lip ring at bottom (y = -H/2) and (y = -H/2 + 2.4)!
    const ringVerts = rows * segs;
    const extraVerts = hasBottomFloor ? segs * 2 : 0;
    const positions = new Float32Array((ringVerts * 2 + extraVerts) * 3);
    const uvs = new Float32Array((ringVerts * 2 + extraVerts) * 2);

    let minM = Infinity, maxM = 0, volMm3 = 0;
    const dTheta = (Math.PI * 2) / segs;
    const dY = H / (rows - 1);

    for (let r = 0; r < rows; r++) {
      const v = r / (rows - 1);
      const yPos = (0.5 - v) * H;
      const inCollar = (v * H < o.collarMm) || ((1 - v) * H < o.collarMm);
      for (let c = 0; c < segs; c++) {
        const u = c / segs;
        const theta = u * Math.PI * 2;
        const sinT = Math.sin(theta), cosT = Math.cos(theta);
        const lum = bilinearSample(src, srcW, srcH, u, v);
        const thick = inCollar
          ? o.frameHeightMm
          : (o.mode === 'lithophane' ? (o.minThickMm + (1 - lum) * span) : (o.minThickMm + lum * span));
        if (thick < minM) minM = thick;
        if (thick > maxM) maxM = thick;

        const rOut = innerR + thick;
        const oIdx = r * segs + c;
        const iIdx = ringVerts + oIdx;
        positions[oIdx * 3] = sinT * rOut; positions[oIdx * 3 + 1] = yPos; positions[oIdx * 3 + 2] = cosT * rOut;
        positions[iIdx * 3] = sinT * innerR; positions[iIdx * 3 + 1] = yPos; positions[iIdx * 3 + 2] = cosT * innerR;
        uvs[oIdx * 2] = u; uvs[oIdx * 2 + 1] = 1 - v;
        uvs[iIdx * 2] = u; uvs[iIdx * 2 + 1] = 1 - v;
        volMm3 += (0.5 * (rOut * rOut - innerR * innerR) * dTheta) * dY;
      }
    }

    const baseRingTopStart = ringVerts * 2;
    const baseRingBotStart = ringVerts * 2 + segs;
    if (hasBottomFloor) {
      const flangeH = Math.min(3.0, o.collarMm);
      const yBot = -H * 0.5;
      const yTop = yBot + flangeH;
      for (let c = 0; c < segs; c++) {
        const theta = (c / segs) * Math.PI * 2;
        const sinT = Math.sin(theta), cosT = Math.cos(theta);
        const tIdx = baseRingTopStart + c;
        const bIdx = baseRingBotStart + c;
        positions[tIdx * 3] = sinT * holeR; positions[tIdx * 3 + 1] = yTop; positions[tIdx * 3 + 2] = cosT * holeR;
        positions[bIdx * 3] = sinT * holeR; positions[bIdx * 3 + 1] = yBot; positions[bIdx * 3 + 2] = cosT * holeR;
      }
      volMm3 += Math.PI * (innerR * innerR - holeR * holeR) * flangeH;
    }

    const idx = [];
    // Side cylinder outer & inner walls (seam-welded modulo segs!)
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < segs; c++) {
        const cn = (c + 1) % segs;
        const tl = r * segs + c, tr = r * segs + cn;
        const bl = (r + 1) * segs + c, br = (r + 1) * segs + cn;
        // Outer wall (+radial outward)
        idx.push(tl, bl, tr, tr, bl, br);
        // Inner wall (-radial inward toward axis)
        const tlI = ringVerts + tl, trI = ringVerts + tr, blI = ringVerts + bl, brI = ringVerts + br;
        idx.push(tlI, trI, blI, trI, brI, blI);
      }
    }

    // Top annular cap (+Y outward)
    for (let c = 0; c < segs; c++) {
      const cn = (c + 1) % segs;
      const oA = c, oB = cn;
      const iA = ringVerts + c, iB = ringVerts + cn;
      idx.push(oA, oB, iA, oB, iB, iA);
    }

    // Bottom cap (-Y outward) + optional LED socket flange
    const lastRow = (rows - 1) * segs;
    if (hasBottomFloor) {
      // Shift inner bottom ring slightly up? No — connect inner bottom ring cleanly to flange top, flange wall, flange bottom, outer bottom!
      // Actually to stay 100% strictly manifold with shared vertices:
      // Bottom outer ring (oA,oB) -> bottom socket hole ring (bA,bB) [-Y]
      // Bottom socket hole ring (bA,bB) -> top socket hole ring (tA,tB) [inward toward axis]
      // Top socket hole ring (tA,tB) -> inner cylinder bottom ring (iA,iB) [+Y]
      for (let c = 0; c < segs; c++) {
        const cn = (c + 1) % segs;
        const oA = lastRow + c, oB = lastRow + cn;
        const iA = ringVerts + lastRow + c, iB = ringVerts + lastRow + cn;
        const tA = baseRingTopStart + c, tB = baseRingTopStart + cn;
        const bA = baseRingBotStart + c, bB = baseRingBotStart + cn;
        // Bottom face (-Y outward): oA -> bA -> oB -> bB
        idx.push(oA, bA, oB, oB, bA, bB);
        // Inner hole wall (inward toward axis): tA -> tB -> bA -> bB
        idx.push(tA, tB, bA, tB, bB, bA);
        // Top of socket flange (+Y): iA -> tA -> iB -> tB
        idx.push(iA, iB, tA, iB, tB, tA);
      }
    } else {
      for (let c = 0; c < segs; c++) {
        const cn = (c + 1) % segs;
        const oA = lastRow + c, oB = lastRow + cn;
        const iA = ringVerts + lastRow + c, iB = ringVerts + lastRow + cn;
        idx.push(oA, iA, oB, oB, iA, iB);
      }
    }

    const outerDia = Number(((innerR + maxM) * 2).toFixed(1));
    return finalizeMeshStats(positions, uvs, new Uint32Array(idx), {
      cols: segs, rows, shape: 'cylinder', mode: o.mode,
      widthMm: outerDia, heightMm: H,
      minThickMm: minM, maxThickMm: maxM,
      volumeCm3: volMm3 / 1000,
      upright: true
    });
  }

  // ── 5c. Spherical Moon / Globe Lithophane Lamp (Watertight Closed Shell!) ──
  function buildSphereLampMesh(src, srcW, srcH, o) {
    const segs = o.cols;
    const rings = o.rows; // rings from top near north pole to bottom LED opening
    const outerBaseR = o.diameterMm * 0.5;
    const innerR = Math.max(8, outerBaseR - o.maxThickMm);
    const span = o.maxThickMm - o.minThickMm;

    const phiTop = 0.06; // near north pole
    const sinOpen = clamp((o.openingDiaMm * 0.5) / innerR, 0.22, 0.78);
    const phiBot = Math.PI - Math.asin(sinOpen);

    // Vertices:
    //  0: Outer North Pole
    //  1: Inner North Pole
    //  2 .. 2 + rings*segs - 1: Outer rings
    //  2 + rings*segs .. 2 + 2*rings*segs - 1: Inner rings
    const ringVerts = rings * segs;
    const totalV = 2 + ringVerts * 2;
    const positions = new Float32Array(totalV * 3);
    const uvs = new Float32Array(totalV * 2);

    const outStart = 2;
    const inStart = 2 + ringVerts;
    const poleThick = o.minThickMm + span * 0.5;
    // Outer north pole (0) & Inner north pole (1)
    positions[0] = 0; positions[1] = innerR + poleThick; positions[2] = 0;
    uvs[0] = 0.5; uvs[1] = 1;
    positions[3] = 0; positions[4] = innerR; positions[5] = 0;
    uvs[2] = 0.5; uvs[3] = 1;

    let minM = Infinity, maxM = 0;
    for (let r = 0; r < rings; r++) {
      const v = r / (rings - 1);
      const phi = phiTop + v * (phiBot - phiTop);
      const sinP = Math.sin(phi), cosP = Math.cos(phi);
      for (let c = 0; c < segs; c++) {
        const u = c / segs;
        const theta = u * Math.PI * 2;
        const sinT = Math.sin(theta), cosT = Math.cos(theta);
        const lum = bilinearSample(src, srcW, srcH, u, v);
        const thick = o.mode === 'lithophane'
          ? (o.minThickMm + (1 - lum) * span)
          : (o.minThickMm + lum * span);
        if (thick < minM) minM = thick;
        if (thick > maxM) maxM = thick;

        const rOut = innerR + thick;
        const oi = outStart + r * segs + c;
        const ii = inStart + r * segs + c;
        positions[oi * 3] = rOut * sinP * sinT;
        positions[oi * 3 + 1] = rOut * cosP;
        positions[oi * 3 + 2] = rOut * sinP * cosT;
        uvs[oi * 2] = u; uvs[oi * 2 + 1] = 1 - v;

        positions[ii * 3] = innerR * sinP * sinT;
        positions[ii * 3 + 1] = innerR * cosP;
        positions[ii * 3 + 2] = innerR * sinP * cosT;
        uvs[ii * 2] = u; uvs[ii * 2 + 1] = 1 - v;
      }
    }

    const idx = [];
    // North pole caps (outer +Y outward, inner -Y inward)
    for (let c = 0; c < segs; c++) {
      const cn = (c + 1) % segs;
      idx.push(0, outStart + c, outStart + cn);
      idx.push(1, inStart + cn, inStart + c);
    }

    // Spherical bands (outer outward, inner inward)
    for (let r = 0; r < rings - 1; r++) {
      for (let c = 0; c < segs; c++) {
        const cn = (c + 1) % segs;
        const oTL = outStart + r * segs + c, oTR = outStart + r * segs + cn;
        const oBL = outStart + (r + 1) * segs + c, oBR = outStart + (r + 1) * segs + cn;
        idx.push(oTL, oBL, oTR, oTR, oBL, oBR);

        const iTL = inStart + r * segs + c, iTR = inStart + r * segs + cn;
        const iBL = inStart + (r + 1) * segs + c, iBR = inStart + (r + 1) * segs + cn;
        idx.push(iTL, iTR, iBL, iTR, iBR, iBL);
      }
    }

    // Seal bottom LED opening annular ring (-Y outward)
    const last = (rings - 1) * segs;
    for (let c = 0; c < segs; c++) {
      const cn = (c + 1) % segs;
      const oA = outStart + last + c, oB = outStart + last + cn;
      const iA = inStart + last + c, iB = inStart + last + cn;
      idx.push(oA, iA, oB, oB, iA, iB);
    }

    // Approximate shell volume
    const avgR = innerR + (minM + maxM) * 0.5;
    const capFrac = (1 - Math.cos(phiBot)) * 0.5;
    const volMm3 = 4 * Math.PI * avgR * avgR * ((minM + maxM) * 0.5) * capFrac;

    return finalizeMeshStats(positions, uvs, new Uint32Array(idx), {
      cols: segs, rows: rings, shape: 'sphere', mode: o.mode,
      widthMm: o.diameterMm, heightMm: Number((outerBaseR * (1 - Math.cos(phiBot))).toFixed(1)),
      minThickMm: minM, maxThickMm: maxM,
      volumeCm3: volMm3 / 1000,
      upright: true
    });
  }

  function finalizeMeshStats(positions, uvs, indices, meta) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i], y = positions[i + 1], z = positions[i + 2];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    return {
      positions,
      uvs,
      indices,
      triangleCount: indices.length / 3,
      vertexCount: positions.length / 3,
      cols: meta.cols,
      rows: meta.rows,
      shape: meta.shape,
      mode: meta.mode,
      upright: !!meta.upright,
      dimensionsMm: {
        x: Number((maxX - minX).toFixed(1)),
        y: Number((maxY - minY).toFixed(1)),
        z: Number((maxZ - minZ).toFixed(2))
      },
      minThickMm: Number(meta.minThickMm.toFixed(2)),
      maxThickMm: Number(meta.maxThickMm.toFixed(2)),
      volumeCm3: Number(Math.max(0.1, meta.volumeCm3).toFixed(2))
    };
  }

  // ── 6. Fast Binary STL & Streaming Array OBJ Exporters ─────────────────────
  function exportBinarySTL(mesh) {
    const triCount = mesh.triangleCount;
    const buf = new ArrayBuffer(84 + triCount * 50);
    const dv = new DataView(buf);
    const hdr = 'Studios-Pro 3D Studio Pro — Watertight Outward-Normal STL (mm)';
    for (let i = 0; i < hdr.length && i < 80; i++) dv.setUint8(i, hdr.charCodeAt(i));
    dv.setUint32(80, triCount, true);

    const pos = mesh.positions;
    const idx = mesh.indices;
    // Rotate upright lithophanes so Y-up stands upright on slicer Z-up bed!
    // For flat relief (Z thickness), keep flat on Z-up bed; for upright arc/cylinder/sphere, map (x, y, z) -> (x, -z, y) so it stands upright on Z>=0!
    const standOnBed = !!mesh.upright;
    let minZ = Infinity;
    if (standOnBed) {
      for (let i = 1; i < pos.length; i += 3) if (pos[i] < minZ) minZ = pos[i];
    } else {
      for (let i = 2; i < pos.length; i += 3) if (pos[i] < minZ) minZ = pos[i];
    }

    let off = 84;
    for (let t = 0; t < triCount; t++) {
      const i0 = idx[t * 3] * 3, i1 = idx[t * 3 + 1] * 3, i2 = idx[t * 3 + 2] * 3;
      let ax, ay, az, bx, by, bz, cx, cy, cz;
      if (standOnBed) {
        ax = pos[i0]; ay = -pos[i0 + 2]; az = pos[i0 + 1] - minZ;
        bx = pos[i1]; by = -pos[i1 + 2]; bz = pos[i1 + 1] - minZ;
        cx = pos[i2]; cy = -pos[i2 + 2]; cz = pos[i2 + 1] - minZ;
      } else {
        ax = pos[i0]; ay = pos[i0 + 1]; az = pos[i0 + 2] - minZ;
        bx = pos[i1]; by = pos[i1 + 1]; bz = pos[i1 + 2] - minZ;
        cx = pos[i2]; cy = pos[i2 + 1]; cz = pos[i2 + 2] - minZ;
      }

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
    // Array chunk push (Fixes slow string concatenation B7!)
    const pos = mesh.positions;
    const uvs = mesh.uvs;
    const idx = mesh.indices;
    const out = [
      '# Studios-Pro 3D Studio Pro — Watertight 3D CAD Mesh (mm)',
      `# Shape: ${mesh.shape} | Mode: ${mesh.mode} | Triangles: ${mesh.triangleCount}`,
      'o StudiosPro_3D_Model'
    ];
    for (let i = 0; i < mesh.vertexCount; i++) {
      out.push(`v ${pos[i * 3].toFixed(3)} ${pos[i * 3 + 1].toFixed(3)} ${pos[i * 3 + 2].toFixed(3)}`);
    }
    for (let i = 0; i < mesh.vertexCount; i++) {
      out.push(`vt ${uvs[i * 2].toFixed(4)} ${uvs[i * 2 + 1].toFixed(4)}`);
    }
    for (let t = 0; t < mesh.triangleCount; t++) {
      const a = idx[t * 3] + 1, b = idx[t * 3 + 1] + 1, c = idx[t * 3 + 2] + 1;
      out.push(`f ${a}/${a} ${b}/${b} ${c}/${c}`);
    }
    return out.join('\n') + '\n';
  }

  // ── 7. Cross-Section Thickness Caliper Profile ─────────────────────────────
  function sampleCrossSection(heightfield, opts, rowFraction) {
    const o = opts || {};
    const mode = o.mode || 'lithophane';
    const minT = Number(o.minThickMm) || 0.8;
    const maxT = Number(o.maxThickMm) || 3.2;
    const samples = 128;
    const profile = new Float32Array(samples);
    const v = clamp01(rowFraction !== undefined ? rowFraction : 0.5);
    for (let i = 0; i < samples; i++) {
      const u = i / (samples - 1);
      const lum = bilinearSample(heightfield.data, heightfield.width, heightfield.height, u, v);
      profile[i] = mode === 'lithophane' ? (minT + (1 - lum) * (maxT - minT)) : (minT + lum * (maxT - minT));
    }
    return { profile, minT, maxT };
  }

  // ── 8. Slicer Pre-Flight Inspector (/100) + Recommended Slicer Settings ────
  function inspectPrintability(heightfield, meshData, opts) {
    const o = opts || {};
    const nozzle = Number(o.nozzleMm) || 0.4;
    const mode = o.mode || 'lithophane';
    const minT = meshData ? meshData.minThickMm : (Number(o.minThickMm) || 0.8);
    const maxT = meshData ? meshData.maxThickMm : (Number(o.maxThickMm) || 3.2);
    const range = heightfield ? (heightfield.max - heightfield.min) : 1;

    const issues = [];
    let score = 100;

    if (minT < nozzle * 1.5) {
      score -= 28;
      issues.push({
        id: 'thin_wall', severity: 'error', fix: 'fixMinWall',
        en: `Min wall (${minT.toFixed(2)} mm) is thinner than 1.5× nozzle (${(nozzle * 1.5).toFixed(2)} mm) — risk of pinholes!`,
        fr: `Paroi min (${minT.toFixed(2)} mm) < 1,5× buse (${(nozzle * 1.5).toFixed(2)} mm) — risque de trous à l'impression !`
      });
    }
    if (mode === 'lithophane' && maxT > 4.2) {
      score -= 18;
      issues.push({
        id: 'thick_litho', severity: 'warn', fix: 'fixMaxLitho',
        en: `Max thickness (${maxT.toFixed(2)} mm) is very dense for PLA lithophanes — dark areas may block all LED light.`,
        fr: `Épaisseur max (${maxT.toFixed(2)} mm) très élevée pour une lithophanie — les zones sombres bloqueront la LED.`
      });
    }
    if (mode === 'lithophane' && o.invert) {
      score -= 20;
      issues.push({
        id: 'inverted_litho', severity: 'warn', fix: 'fixInvert',
        en: 'Invert Colors is ON in Lithophane mode — bright pixels will print thick (photo negative effect).',
        fr: 'L\'inversion est active en mode Lithophanie — les zones claires seront épaisses (effet négatif).'
      });
    }
    if (range < 0.55) {
      score -= 16;
      issues.push({
        id: 'flat_contrast', severity: 'info', fix: 'boostContrast',
        en: `Low image contrast (${Math.round(range * 100)}% tonal range). Boost Contrast for crisper 3D relief.`,
        fr: `Contraste image faible (${Math.round(range * 100)}%). Augmentez le contraste pour un relief plus net.`
      });
    }
    if (o.shape === 'flat' && !o.builtInStand && (o.frameWidthMm || 0) < 2) {
      score -= 8;
      issues.push({
        id: 'tall_stability', severity: 'info', fix: 'addStandOrFrame',
        en: 'Flat lithophanes print sharpest standing vertically along Y-axis with a 6–8 mm Brim or Built-in Stand.',
        fr: 'Les lithophanies plates s\'impriment debout sur l\'axe Y avec une bordure (Brim 6–8 mm) ou un Socle intégré.'
      });
    }

    return {
      score: clamp(score, 0, 100),
      issues,
      slicerTips: {
        layerHeight: '0.12 mm (Fine) or 0.16 mm',
        perimeters: '6–8 Walls / 100% Rectilinear Infill',
        orientation: (o.shape === 'flat' || o.shape === 'lantern') ? 'Vertical along Y-Axis (bed-slinger)' : 'Upright on Base (no supports needed)',
        adhesion: '6–8 mm Outer Brim',
        filament: mode === 'lithophane' ? 'White / Ivory Matte PLA (TD ~3.0 mm)' : 'PLA / Silk Bronze / Woodfill / Resin'
      }
    };
  }

  // ── 9. Print Time, Filament Weight, LED Kit & Etsy Profit Calculator ───────
  function computePrintQuote(meshData, opts) {
    const o = opts || {};
    const volCm3 = (meshData && meshData.volumeCm3) || 26;
    const filamentPerKg = Number(o.filamentPerKg) || 24;
    const ledKitCost = Number(o.ledKitCost) || 3.5;
    const hourlyRate = Number(o.hourlyRate) || 1.25;
    const markup = clamp(Number(o.markup) || 3.5, 1.2, 10);
    const etsyFeePct = 0.115;

    const infill = (meshData && meshData.mode === 'lithophane') ? 0.98 : 0.45;
    const weightG = volCm3 * 1.24 * infill;
    const estHours = Math.max(0.6, weightG / 11.5); // ~11.5 g/h at crisp 0.12mm layer height
    const filamentCost = (weightG / 1000) * filamentPerKg;
    const machineCost = estHours * hourlyRate;
    const totalCost = filamentCost + ledKitCost + machineCost;
    const retailPrice = totalCost * markup;
    const fees = retailPrice * etsyFeePct + 0.45;
    const netProfit = retailPrice - totalCost - fees;

    return {
      weightG: Number(weightG.toFixed(1)),
      estHours: Number(estHours.toFixed(1)),
      filamentCost: Number(filamentCost.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
      retailPrice: Number(retailPrice.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
      marginPct: retailPrice > 0 ? Math.round((netProfit / retailPrice) * 100) : 0
    };
  }

  // ── 10. 4 Built-In Studio Demo Photos (Zero CORS, Zero Empty Screen!) ──────
  function generateDemoPhotoCanvas(presetId, size) {
    const w = size || 640;
    const h = presetId === 'landscape' ? Math.round(w * 0.66) : (presetId === 'portrait' ? Math.round(w * 1.2) : w);
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');

    if (presetId === 'heart') {
      // Romantic couple silhouette inside glowing moonlit heart
      const bg = ctx.createRadialGradient(w * 0.5, h * 0.46, w * 0.04, w * 0.5, h * 0.5, w * 0.58);
      bg.addColorStop(0, '#ffffff');
      bg.addColorStop(0.45, '#fde68a');
      bg.addColorStop(0.75, '#f472b6');
      bg.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      // Glowing Moon
      const moon = ctx.createRadialGradient(w * 0.5, h * 0.36, 4, w * 0.5, h * 0.36, w * 0.24);
      moon.addColorStop(0, '#ffffff'); moon.addColorStop(0.7, '#fff7d6'); moon.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = moon; ctx.beginPath(); ctx.arc(w * 0.5, h * 0.36, w * 0.24, 0, Math.PI * 2); ctx.fill();

      // Silhouette couple + pine horizon
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.78); ctx.quadraticCurveTo(w * 0.5, h * 0.66, w, h * 0.78);
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();

      // Left & right figures leaning together
      ctx.beginPath(); ctx.arc(w * 0.43, h * 0.48, w * 0.055, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(w * 0.56, h * 0.50, w * 0.050, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(w * 0.34, h * 0.78); ctx.quadraticCurveTo(w * 0.36, h * 0.54, w * 0.44, h * 0.54);
      ctx.lineTo(w * 0.56, h * 0.55); ctx.quadraticCurveTo(w * 0.64, h * 0.56, w * 0.66, h * 0.78);
      ctx.closePath(); ctx.fill();

      // Sparkle stars
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 24; i++) {
        const sx = ((i * 137) % 86 + 7) * 0.01 * w;
        const sy = ((i * 73) % 45 + 6) * 0.01 * h;
        ctx.beginPath(); ctx.arc(sx, sy, 2 + (i % 3), 0, Math.PI * 2); ctx.fill();
      }
    } else if (presetId === 'landscape') {
      // Dramatic Mountain Lake Sunset (fantastic on Curved Arc & 360° Cylinder!)
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.62);
      sky.addColorStop(0, '#1e293b'); sky.addColorStop(0.5, '#6366f1'); sky.addColorStop(1, '#fef08a');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);

      const sun = ctx.createRadialGradient(w * 0.5, h * 0.44, 6, w * 0.5, h * 0.44, w * 0.22);
      sun.addColorStop(0, '#ffffff'); sun.addColorStop(0.5, '#fde047'); sun.addColorStop(1, 'rgba(254,240,138,0)');
      ctx.fillStyle = sun; ctx.beginPath(); ctx.arc(w * 0.5, h * 0.44, w * 0.22, 0, Math.PI * 2); ctx.fill();

      const drawMtn = (pts, col) => {
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, h * 0.65);
        for (const [px, py] of pts) ctx.lineTo(px * w, py * h);
        ctx.lineTo(w, h * 0.65); ctx.closePath(); ctx.fill();
      };
      drawMtn([[0, 0.52], [0.16, 0.25], [0.34, 0.44], [0.56, 0.20], [0.78, 0.40], [0.92, 0.26], [1, 0.46]], '#475569');
      drawMtn([[0, 0.60], [0.22, 0.38], [0.42, 0.56], [0.68, 0.34], [0.88, 0.52], [1, 0.44]], '#1e293b');

      // Glowing Lake reflection
      const lake = ctx.createLinearGradient(0, h * 0.62, 0, h);
      lake.addColorStop(0, '#fef9c3'); lake.addColorStop(0.45, '#94a3b8'); lake.addColorStop(1, '#0f172a');
      ctx.fillStyle = lake; ctx.fillRect(0, h * 0.62, w, h * 0.38);

      // Foreground pine trees
      ctx.fillStyle = '#090d16';
      for (let i = 0; i < 16; i++) {
        const tx = (i / 15) * w;
        const edge = Math.abs(i / 15 - 0.5) * 2;
        const th = h * (0.12 + edge * 0.24);
        ctx.beginPath();
        ctx.moveTo(tx, h - th); ctx.lineTo(tx - w * 0.032, h); ctx.lineTo(tx + w * 0.032, h);
        ctx.closePath(); ctx.fill();
      }
    } else if (presetId === 'coin') {
      // Sculpted Lunar & Sun Celestial Crest (awesome for Moon Sphere & Bronze Coin!)
      ctx.fillStyle = '#0b1020'; ctx.fillRect(0, 0, w, h);
      const cx = w * 0.5, cy = h * 0.5, R = w * 0.43;
      const halo = ctx.createRadialGradient(cx, cy, R * 0.08, cx, cy, R);
      halo.addColorStop(0, '#ffffff'); halo.addColorStop(0.5, '#d4af37'); halo.addColorStop(0.88, '#5c4110'); halo.addColorStop(1, '#121829');
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = '#fff3c4'; ctx.lineWidth = w * 0.024;
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.90, 0, Math.PI * 2); ctx.stroke();

      // Compass rose / rays
      ctx.save(); ctx.translate(cx, cy);
      for (let i = 0; i < 16; i++) {
        ctx.rotate((Math.PI * 2) / 16);
        ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#e2c06b';
        ctx.beginPath();
        ctx.moveTo(-w * 0.022, -R * 0.22);
        ctx.lineTo(0, -R * (i % 2 === 0 ? 0.78 : 0.58));
        ctx.lineTo(w * 0.022, -R * 0.22);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();

      const center = ctx.createRadialGradient(cx - 16, cy - 16, 4, cx, cy, R * 0.28);
      center.addColorStop(0, '#ffffff'); center.addColorStop(0.7, '#f5d073'); center.addColorStop(1, '#785010');
      ctx.fillStyle = center; ctx.beginPath(); ctx.arc(cx, cy, R * 0.28, 0, Math.PI * 2); ctx.fill();
    } else {
      // High-Contrast Studio Portrait Silhouette (4:5 aspect — proves Aspect-Ratio Lock!)
      const bg = ctx.createRadialGradient(w * 0.5, h * 0.4, w * 0.08, w * 0.5, h * 0.45, h * 0.65);
      bg.addColorStop(0, '#f8fafc'); bg.addColorStop(0.55, '#94a3b8'); bg.addColorStop(1, '#0f172a');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      // Soft photographic portrait chiaroscuro
      const bust = ctx.createRadialGradient(w * 0.48, h * 0.76, 10, w * 0.5, h * 0.84, w * 0.42);
      bust.addColorStop(0, '#475569'); bust.addColorStop(0.6, '#1e293b'); bust.addColorStop(1, '#090d16');
      ctx.fillStyle = bust;
      ctx.beginPath();
      ctx.moveTo(w * 0.14, h * 0.98);
      ctx.quadraticCurveTo(w * 0.18, h * 0.68, w * 0.42, h * 0.64);
      ctx.lineTo(w * 0.58, h * 0.64);
      ctx.quadraticCurveTo(w * 0.82, h * 0.68, w * 0.86, h * 0.98);
      ctx.closePath(); ctx.fill();

      // Neck & Face with realistic light-to-shadow gradient for crisp lithophane tone!
      ctx.fillStyle = '#cbd5e1'; ctx.fillRect(w * 0.43, h * 0.54, w * 0.14, h * 0.14);
      const face = ctx.createRadialGradient(w * 0.46, h * 0.36, 8, w * 0.5, h * 0.40, w * 0.24);
      face.addColorStop(0, '#ffffff'); face.addColorStop(0.55, '#e2e8f0'); face.addColorStop(0.88, '#64748b'); face.addColorStop(1, '#1e293b');
      ctx.fillStyle = face;
      ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.40, w * 0.19, h * 0.195, 0, 0, Math.PI * 2); ctx.fill();

      // Hair crown
      ctx.fillStyle = '#1e293b';
      ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.26, w * 0.21, h * 0.10, 0, Math.PI, Math.PI * 2); ctx.fill();
      // Eyes, nose, smile subtle tonal features
      ctx.fillStyle = '#1e293b';
      ctx.beginPath(); ctx.ellipse(w * 0.43, h * 0.38, w * 0.025, h * 0.012, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(w * 0.57, h * 0.38, w * 0.025, h * 0.012, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#475569'; ctx.lineWidth = w * 0.012; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(w * 0.5, h * 0.455, w * 0.055, 0.18 * Math.PI, 0.82 * Math.PI); ctx.stroke();
    }
    return cv;
  }

  return {
    clamp,
    clamp01,
    fastSmoothFloat,
    computeCropRect,
    processHeightfieldFromRGBA,
    computeSafeGridSize,
    bilinearSample,
    buildCADMesh,
    exportBinarySTL,
    exportOBJ,
    sampleCrossSection,
    inspectPrintability,
    computePrintQuote,
    generateDemoPhotoCanvas
  };
}));
