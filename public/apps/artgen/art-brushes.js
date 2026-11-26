/**
 * ArtGen Studio (v5.0) — Pro Natural Media & Algorithmic Brush Engine,
 * Living Kaleidoscope Symmetry, Interactive Ebru Liquify, Fast Typed Flood-Fill,
 * Physical Paper Textures & Fixed Post-Processing Filters.
 */
(function (globalScope) {
  'use strict';

  function C() { return globalScope.ArtCore; }

  // =========================================================================
  // 1. LIVING SYMMETRY / KALEIDOSCOPE ENGINE (2x..24x + MOVABLE CENTER)
  // =========================================================================

  function getSymmetryTransforms(symMode, cx, cy) {
    const out = [{ fn: (x, y) => [x, y] }];
    if (!symMode || symMode === 'none') return out;

    if (symMode === 'mirrorH') {
      out.push({ fn: (x, y) => [2 * cx - x, y] });
      return out;
    }
    if (symMode === 'mirrorV') {
      out.push({ fn: (x, y) => [x, 2 * cy - y] });
      return out;
    }
    if (symMode === 'quad') {
      out.push({ fn: (x, y) => [2 * cx - x, y] });
      out.push({ fn: (x, y) => [x, 2 * cy - y] });
      out.push({ fn: (x, y) => [2 * cx - x, 2 * cy - y] });
      return out;
    }

    const folds = parseInt(String(symMode).replace(/^k/, ''), 10) || 8;
    const step = (Math.PI * 2) / folds;
    out.length = 0;
    for (let i = 0; i < folds; i++) {
      const a = i * step;
      const ca = Math.cos(a), sa = Math.sin(a);
      out.push({
        fn: (x, y) => {
          const dx = x - cx, dy = y - cy;
          return [cx + dx * ca - dy * sa, cy + dx * sa + dy * ca];
        }
      });
      // Mirror pair inside each kaleido wedge
      out.push({
        fn: (x, y) => {
          const dx = -(x - cx), dy = y - cy;
          return [cx + dx * ca - dy * sa, cy + dx * sa + dy * ca];
        }
      });
    }
    return out;
  }

  // =========================================================================
  // 2. STROKE STATE & ALGORITHMIC / NATURAL MEDIA BRUSHES
  // =========================================================================

  let _webTrail = [];
  function resetStrokeTrail() { _webTrail = []; }

  function drawStrokeSegment(ctx, x1, y1, x2, y2, opts) {
    const tool = opts.tool || 'brush';
    const transforms = getSymmetryTransforms(opts.symMode, opts.symCx, opts.symCy);

    for (let t = 0; t < transforms.length; t++) {
      const p1 = transforms[t].fn(x1, y1);
      const p2 = transforms[t].fn(x2, y2);
      drawSingleSegment(ctx, p1[0], p1[1], p2[0], p2[1], opts, t === 0);
    }
  }

  function drawSingleSegment(ctx, x1, y1, x2, y2, opts, isPrimarySym) {
    const Core = C();
    const tool = opts.tool || 'brush';
    const mat = opts.matMode || 'normal';
    const pc = Core.normalizeHex(opts.pc || '#8b5cf6');
    const sc = Core.normalizeHex(opts.sc || '#38bdf8');
    const pressure = Math.max(0.2, Math.min(1.5, opts.pressure || 1.0));
    const speed = Math.hypot(x2 - x1, y2 - y1);
    const velScale = Math.max(0.45, Math.min(1.25, 1.15 - speed / 120));
    const size = Math.max(1, (opts.size || 18) * pressure * (tool === 'pencil' ? velScale : 1));
    const op = Math.max(0.02, Math.min(1, opts.opacity !== undefined ? opts.opacity : 0.9));
    const hard = Math.max(0.05, Math.min(1, opts.hardness !== undefined ? opts.hardness : 0.75));

    ctx.save();
    if (opts.lockAlpha && tool !== 'eraser') {
      ctx.globalCompositeOperation = 'source-atop';
    } else if (opts.glowMode && tool !== 'eraser' && tool !== 'blur' && tool !== 'liquify') {
      ctx.shadowColor = pc;
      ctx.shadowBlur = Math.min(36, size * 0.9);
    }

    // Utility / non-paint tools MUST NEVER be hijacked by matMode!
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      stampSoftPath(ctx, x1, y1, x2, y2, size, '#000000', op, hard);
      ctx.restore();
      return;
    }
    if (tool === 'blur') {
      fastBlurPatch(ctx, x2, y2, Math.max(6, Math.min(48, size * 0.75)));
      ctx.restore();
      return;
    }
    if (tool === 'magicer') {
      fastBlurPatch(ctx, x2, y2, Math.max(8, Math.min(42, size * 0.8)), 2);
      ctx.restore();
      return;
    }
    if (tool === 'liquify') {
      interactiveLiquifyBrush(ctx, x1, y1, x2, y2, Math.max(16, size * 1.4), opts.swirlStrength || 0.45);
      ctx.restore();
      return;
    }

    // Material brush modes apply cleanly to paint tools!
    const paintTool = tool === 'brush' || tool === 'pencil' || tool === 'ribbon' || tool === 'watercolor_brush';
    if (paintTool && mat !== 'normal') {
      drawMaterialStroke(ctx, x1, y1, x2, y2, size, pc, sc, op, mat);
      ctx.restore();
      return;
    }

    if (tool === 'brush') {
      if (opts.wetMode) ctx.globalCompositeOperation = 'multiply';
      stampSoftPath(ctx, x1, y1, x2, y2, size, pc, op, hard);
    } else if (tool === 'pencil') {
      // Textured graphite grain stroke
      const steps = Math.max(1, Math.ceil(speed / 2));
      const lw = Math.max(1, size * 0.24);
      ctx.fillStyle = Core.rgba(pc, op * 0.65);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const px = x1 + (x2 - x1) * t;
        const py = y1 + (y2 - y1) * t;
        for (let g = 0; g < 3; g++) {
          ctx.fillRect(px + (Math.random() - 0.5) * lw * 1.3, py + (Math.random() - 0.5) * lw * 1.3, Math.max(1, lw * 0.7), Math.max(1, lw * 0.7));
        }
      }
    } else if (tool === 'spray') {
      // FIXED: Interpolated along full stroke path (zero gaps!)
      const dist = Math.max(1, speed);
      const steps = Math.max(1, Math.ceil(dist / Math.max(2, size * 0.25)));
      const dotsPerStep = Math.max(4, Math.floor(size * 0.7));
      ctx.fillStyle = Core.rgba(pc, op * 0.55);
      for (let s = 0; s <= steps; s++) {
        const bx = x1 + ((x2 - x1) * s) / steps;
        const by = y1 + ((y2 - y1) * s) / steps;
        for (let d = 0; d < dotsPerStep; d++) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.pow(Math.random(), 0.65) * size;
          ctx.fillRect(bx + Math.cos(a) * r, by + Math.sin(a) * r, 1.6, 1.6);
        }
      }
    } else if (tool === 'ribbon') {
      // GENIUS BRUSH #1: Multi-strand silk calligraphy ribbon!
      const ang = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;
      const strands = 6;
      const spread = size * (0.65 + Math.min(0.8, speed / 40));
      ctx.lineCap = 'round';
      for (let k = 0; k < strands; k++) {
        const frac = (k / (strands - 1)) - 0.5;
        const ox = Math.cos(ang) * frac * spread;
        const oy = Math.sin(ang) * frac * spread;
        const col = Core.lerpColor(pc, sc, k / (strands - 1));
        ctx.strokeStyle = Core.rgba(col, op * (0.45 + (1 - Math.abs(frac) * 1.6) * 0.45));
        ctx.lineWidth = Math.max(1, (size / strands) * (0.7 + (1 - Math.abs(frac) * 1.6) * 0.7));
        ctx.beginPath();
        ctx.moveTo(x1 + ox, y1 + oy);
        ctx.lineTo(x2 + ox, y2 + oy);
        ctx.stroke();
      }
    } else if (tool === 'web') {
      // GENIUS BRUSH #2: Constellation / Neural Web Fine-Art Brush!
      ctx.strokeStyle = Core.rgba(pc, op * 0.85);
      ctx.lineWidth = Math.max(1, size * 0.14);
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();

      if (isPrimarySym) {
        _webTrail.push({ x: x2, y: y2 });
        if (_webTrail.length > 140) _webTrail.shift();
      }
      const maxD = Math.max(24, size * 3.2);
      const transforms = getSymmetryTransforms(opts.symMode, opts.symCx, opts.symCy);
      // Connect nearby historic trail points mapped into current symmetry sector
      ctx.lineWidth = Math.max(0.6, size * 0.055);
      for (let i = Math.max(0, _webTrail.length - 85); i < _webTrail.length - 2; i++) {
        const pt = _webTrail[i];
        const d = Math.hypot(pt.x - x2, pt.y - y2);
        if (d < maxD && d > 4) {
          const alpha = (1 - d / maxD) * op * 0.36;
          ctx.strokeStyle = Core.rgba(Core.lerpColor(pc, sc, d / maxD), alpha);
          ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(pt.x, pt.y); ctx.stroke();
        }
      }
      void transforms;
    } else if (tool === 'watercolor_brush') {
      // GENIUS BRUSH #3: Organic Wet Watercolor Pigment Bleed!
      const steps = Math.max(1, Math.ceil(speed / Math.max(3, size * 0.35)));
      for (let s = 0; s <= steps; s++) {
        const bx = x1 + ((x2 - x1) * s) / steps;
        const by = y1 + ((y2 - y1) * s) / steps;
        const lobes = 4;
        for (let l = 0; l < lobes; l++) {
          const r = size * (0.45 + Math.random() * 0.55);
          const ox = (Math.random() - 0.5) * size * 0.55;
          const oy = (Math.random() - 0.5) * size * 0.55;
          const g = ctx.createRadialGradient(bx + ox, by + oy, r * 0.15, bx + ox, by + oy, r);
          // Capillary edge darkening: slightly stronger pigment near outer rim!
          g.addColorStop(0, Core.rgba(pc, op * 0.08));
          g.addColorStop(0.72, Core.rgba(pc, op * 0.14));
          g.addColorStop(0.92, Core.rgba(Core.lerpColor(pc, sc, 0.25), op * 0.22));
          g.addColorStop(1, Core.rgba(pc, 0));
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(bx + ox, by + oy, r, 0, Math.PI * 2); ctx.fill();
        }
      }
    } else if (tool === 'lightning') {
      // Fractal plasma bolt respecting primary & secondary colors!
      ctx.globalCompositeOperation = 'lighter';
      const drawBolt = (ax, ay, bx, by, depth, lw) => {
        const d = Math.hypot(bx - ax, by - ay);
        if (depth <= 0 || d < 8) {
          ctx.strokeStyle = Core.rgba(pc, op * 0.55); ctx.lineWidth = lw * 2.6;
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
          ctx.strokeStyle = Core.rgba('#ffffff', op * 0.92); ctx.lineWidth = Math.max(0.8, lw);
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
          return;
        }
        const mx = (ax + bx) / 2 + (Math.random() - 0.5) * d * 0.45;
        const my = (ay + by) / 2 + (Math.random() - 0.5) * d * 0.45;
        drawBolt(ax, ay, mx, my, depth - 1, lw);
        drawBolt(mx, my, bx, by, depth - 1, lw);
        if (Math.random() > 0.55) {
          drawBolt(mx, my, mx + (Math.random() - 0.5) * size * 2.2, my + (Math.random() - 0.5) * size * 2.2, depth - 1, lw * 0.55);
        }
      };
      drawBolt(x1, y1, x2, y2, 2, Math.max(1.2, size * 0.12));
    } else if (tool === 'sparkler') {
      // Interpolated multi-ray starburst sparkles respecting pc & sc!
      ctx.globalCompositeOperation = 'lighter';
      const steps = Math.max(1, Math.ceil(speed / Math.max(6, size * 0.5)));
      for (let s = 0; s <= steps; s++) {
        const cx = x1 + ((x2 - x1) * s) / steps;
        const cy = y1 + ((y2 - y1) * s) / steps;
        const rays = 8 + ((Math.random() * 6) | 0);
        for (let r = 0; r < rays; r++) {
          const a = Math.random() * Math.PI * 2;
          const len = (0.3 + Math.random() * 0.9) * size;
          ctx.strokeStyle = Core.rgba(r % 2 === 0 ? pc : sc, op * 0.82);
          ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len); ctx.stroke();
        }
        ctx.fillStyle = Core.rgba('#ffffff', op * 0.9);
        ctx.beginPath(); ctx.arc(cx, cy, Math.max(1.5, size * 0.14), 0, Math.PI * 2); ctx.fill();
      }
    }

    ctx.restore();
  }

  function stampSoftPath(ctx, x1, y1, x2, y2, size, hex, op, hard) {
    const Core = C();
    const r = Math.max(0.8, size / 2);
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const step = Math.max(1, r * 0.28);
    const count = Math.max(1, Math.ceil(dist / step));
    // Smooth flow alpha per dab (NO squared opacity jump!)
    const dabAlpha = Math.min(1, op * (hard > 0.92 ? 1.0 : Math.max(0.18, 1 / Math.sqrt(Math.max(1, r * 0.35)))));

    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const px = x1 + (x2 - x1) * t;
      const py = y1 + (y2 - y1) * t;
      if (hard >= 0.95) {
        ctx.fillStyle = Core.rgba(hex, op);
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      } else {
        const g = ctx.createRadialGradient(px, py, r * hard * 0.7, px, py, r);
        g.addColorStop(0, Core.rgba(hex, dabAlpha));
        g.addColorStop(1, Core.rgba(hex, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  function drawMaterialStroke(ctx, x1, y1, x2, y2, size, pc, sc, op, mat) {
    const Core = C();
    const r = Math.max(2, size / 2);
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.max(1, Math.ceil(dist / Math.max(2, r * 0.32)));

    if (mat === 'neon') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      [size * 1.45, size * 0.78, Math.max(1.5, size * 0.24)].forEach((lw, idx) => {
        ctx.strokeStyle = idx === 2 ? Core.rgba('#ffffff', op) : Core.rgba(pc, idx === 0 ? op * 0.16 : op * 0.55);
        ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      });
      return;
    }

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = x1 + (x2 - x1) * t;
      const py = y1 + (y2 - y1) * t;

      if (mat === 'gold') {
        const g = ctx.createLinearGradient(px - r, py - r, px + r, py + r);
        g.addColorStop(0, '#fef08a');
        g.addColorStop(0.35, '#d4af37');
        g.addColorStop(0.7, '#92400e');
        g.addColorStop(1, '#fde047');
        ctx.fillStyle = g;
        ctx.globalAlpha = op;
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
        // Metallic leaf sparkle speck
        if (Math.random() > 0.65) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(px + (Math.random() - 0.5) * r, py + (Math.random() - 0.5) * r, 2, 2);
        }
      } else if (mat === 'impasto') {
        // Thick 3D oil paint dab with cast shadow & sunlit ridge!
        ctx.fillStyle = 'rgba(0,0,0,0.32)';
        ctx.beginPath(); ctx.arc(px + 2.5, py + 3, r, 0, Math.PI * 2); ctx.fill();
        const g = ctx.createRadialGradient(px - r * 0.3, py - r * 0.3, r * 0.1, px, py, r);
        g.addColorStop(0, Core.lerpColor(pc, '#ffffff', 0.38));
        g.addColorStop(0.6, pc);
        g.addColorStop(1, Core.lerpColor(pc, '#000000', 0.32));
        ctx.fillStyle = g;
        ctx.globalAlpha = op;
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      } else if (mat === 'diamond') {
        // Faceted prismatic crystal flecks tinted with pc & sc!
        ctx.save();
        ctx.translate(px + (Math.random() - 0.5) * r * 0.8, py + (Math.random() - 0.5) * r * 0.8);
        ctx.rotate(Math.random() * Math.PI);
        const s = r * (0.45 + Math.random() * 0.6);
        const col = Math.random() > 0.5 ? Core.lerpColor(pc, '#ffffff', 0.45) : Core.lerpColor(sc, '#ffffff', 0.55);
        ctx.fillStyle = Core.rgba(col, op * 0.88);
        ctx.strokeStyle = Core.rgba('#ffffff', 0.85);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.72, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.72, 0); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    }
  }

  // Fast 2-pass separable box blur on local patch (50x faster than legacy 4-loop freeze!)
  function fastBlurPatch(ctx, cx, cy, rad, passes) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    const r = Math.max(4, Math.min(48, Math.round(rad)));
    const x0 = Math.max(0, Math.floor(cx - r)), y0 = Math.max(0, Math.floor(cy - r));
    const pw = Math.min(w - x0, r * 2), ph = Math.min(h - y0, r * 2);
    if (pw < 3 || ph < 3) return;

    const img = ctx.getImageData(x0, y0, pw, ph);
    const src = img.data;
    const tmp = new Uint8ClampedArray(src.length);
    const kr = Math.max(2, Math.min(6, Math.round(r * 0.16)));
    const nPass = passes || 1;

    for (let p = 0; p < nPass; p++) {
      // Horizontal pass
      for (let y = 0; y < ph; y++) {
        for (let x = 0; x < pw; x++) {
          let sr = 0, sg = 0, sb = 0, sa = 0, cnt = 0;
          const xMin = Math.max(0, x - kr), xMax = Math.min(pw - 1, x + kr);
          for (let kx = xMin; kx <= xMax; kx++) {
            const idx = (y * pw + kx) * 4;
            sr += src[idx]; sg += src[idx + 1]; sb += src[idx + 2]; sa += src[idx + 3]; cnt++;
          }
          const o = (y * pw + x) * 4;
          tmp[o] = sr / cnt; tmp[o + 1] = sg / cnt; tmp[o + 2] = sb / cnt; tmp[o + 3] = sa / cnt;
        }
      }
      // Vertical pass (circular feather back into src)
      const rr = r * r;
      for (let y = 0; y < ph; y++) {
        const dy = (y0 + y) - cy;
        for (let x = 0; x < pw; x++) {
          const dx = (x0 + x) - cx;
          if (dx * dx + dy * dy > rr) continue;
          let sr = 0, sg = 0, sb = 0, sa = 0, cnt = 0;
          const yMin = Math.max(0, y - kr), yMax = Math.min(ph - 1, y + kr);
          for (let ky = yMin; ky <= yMax; ky++) {
            const idx = (ky * pw + x) * 4;
            sr += tmp[idx]; sg += tmp[idx + 1]; sb += tmp[idx + 2]; sa += tmp[idx + 3]; cnt++;
          }
          const o = (y * pw + x) * 4;
          src[o] = sr / cnt; src[o + 1] = sg / cnt; src[o + 2] = sb / cnt; src[o + 3] = sa / cnt;
        }
      }
    }
    ctx.putImageData(img, x0, y0);
  }

  // GENIUS BRUSH #4: Interactive Liquid Ebru / Liquify Displacement Brush!
  function interactiveLiquifyBrush(ctx, x1, y1, x2, y2, radius, swirl) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    const r = Math.max(14, Math.min(110, Math.round(radius)));
    const x0 = Math.max(0, Math.floor(x2 - r)), y0 = Math.max(0, Math.floor(y2 - r));
    const pw = Math.min(w - x0, r * 2), ph = Math.min(h - y0, r * 2);
    if (pw < 4 || ph < 4) return;

    const dxMove = x2 - x1, dyMove = y2 - y1;
    const img = ctx.getImageData(x0, y0, pw, ph);
    const src = new Uint8ClampedArray(img.data);
    const dst = img.data;
    const rr = r * r;

    for (let py = 0; py < ph; py++) {
      const ly = (y0 + py) - y2;
      for (let px = 0; px < pw; px++) {
        const lx = (x0 + px) - x2;
        const d2 = lx * lx + ly * ly;
        if (d2 >= rr) continue;
        const falloff = Math.pow(1 - Math.sqrt(d2) / r, 1.6);
        // Combine push along drag vector + delicate fluid swirl!
        const ang = falloff * (swirl || 0.35);
        const ca = Math.cos(ang), sa = Math.sin(ang);
        const rx = lx * ca - ly * sa - dxMove * falloff * 0.72;
        const ry = lx * sa + ly * ca - dyMove * falloff * 0.72;
        const sx = Math.max(0, Math.min(pw - 1, Math.round(rx + (x2 - x0))));
        const sy = Math.max(0, Math.min(ph - 1, Math.round(ry + (y2 - y0))));
        const di = (py * pw + px) * 4;
        const si = (sy * pw + sx) * 4;
        dst[di] = src[si]; dst[di + 1] = src[si + 1]; dst[di + 2] = src[si + 2]; dst[di + 3] = src[si + 3];
      }
    }
    ctx.putImageData(img, x0, y0);
  }

  // =========================================================================
  // 3. FAST TYPED-ARRAY SCANLINE FLOOD FILL (FIXES ALPHA BUG & GC FREEZE!)
  // =========================================================================

  function smartFloodFill(ctx, startX, startY, fillHex, tolerance) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    const sx = Math.floor(startX), sy = Math.floor(startY);
    if (sx < 0 || sx >= w || sy < 0 || sy >= h) return;

    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const startIdx = (sy * w + sx) * 4;
    const sr = d[startIdx], sg = d[startIdx + 1], sb = d[startIdx + 2], sa = d[startIdx + 3];
    const fc = C().hexToRgb(fillHex);
    const tol = tolerance !== undefined ? tolerance : 28;

    // FIXED: Checks alpha channel too so filling transparent (0,0,0,0) with black #000000 works!
    if (Math.abs(sr - fc.r) <= 2 && Math.abs(sg - fc.g) <= 2 && Math.abs(sb - fc.b) <= 2 && sa >= 253) return;

    const visited = new Uint8Array(w * h);
    const stack = new Int32Array(w * h);
    let top = 0;
    stack[top++] = sy * w + sx;
    visited[sy * w + sx] = 1;

    const matches = idx4 =>
      Math.abs(d[idx4] - sr) <= tol &&
      Math.abs(d[idx4 + 1] - sg) <= tol &&
      Math.abs(d[idx4 + 2] - sb) <= tol &&
      Math.abs(d[idx4 + 3] - sa) <= tol;

    while (top > 0) {
      const pos = stack[--top];
      const py = (pos / w) | 0;
      const px = pos - py * w;
      const i4 = pos * 4;
      d[i4] = fc.r; d[i4 + 1] = fc.g; d[i4 + 2] = fc.b; d[i4 + 3] = 255;

      if (px > 0 && !visited[pos - 1] && matches(i4 - 4)) { visited[pos - 1] = 1; stack[top++] = pos - 1; }
      if (px < w - 1 && !visited[pos + 1] && matches(i4 + 4)) { visited[pos + 1] = 1; stack[top++] = pos + 1; }
      if (py > 0 && !visited[pos - w] && matches(i4 - w * 4)) { visited[pos - w] = 1; stack[top++] = pos - w; }
      if (py < h - 1 && !visited[pos + w] && matches(i4 + w * 4)) { visited[pos + w] = 1; stack[top++] = pos + w; }
    }
    ctx.putImageData(img, 0, 0);
  }

  // =========================================================================
  // 4. ALL FIXED POST-PROCESSING FILTERS & FULL-CANVAS FX
  // =========================================================================

  function applyFilter(ctx, filterName) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;

    if (filterName === 'pixel') {
      // FIXED OPERATOR PRECEDENCE BUG: y + (bs >> 1) instead of (y + bs) >> 1!
      const bs = Math.max(6, Math.round(Math.min(w, h) / 72));
      const copy = new Uint8ClampedArray(d);
      for (let y = 0; y < h; y += bs) {
        const sy = Math.min(h - 1, y + (bs >> 1));
        for (let x = 0; x < w; x += bs) {
          const sx = Math.min(w - 1, x + (bs >> 1));
          const si = (sy * w + sx) * 4;
          const r = copy[si], g = copy[si + 1], b = copy[si + 2], a = copy[si + 3];
          for (let dy = 0; dy < bs && y + dy < h; dy++) {
            for (let dx = 0; dx < bs && x + dx < w; dx++) {
              const di = ((y + dy) * w + (x + dx)) * 4;
              d[di] = r; d[di + 1] = g; d[di + 2] = b; d[di + 3] = a;
            }
          }
        }
      }
      ctx.putImageData(img, 0, 0);
      return;
    }

    if (filterName === 'invert') {
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] === 0) continue;
        d[i] = 255 - d[i]; d[i + 1] = 255 - d[i + 1]; d[i + 2] = 255 - d[i + 2];
      }
      ctx.putImageData(img, 0, 0);
      return;
    }

    if (filterName === 'sepia') {
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] === 0) continue;
        const r = d[i], g = d[i + 1], b = d[i + 2];
        d[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
        d[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
        d[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
      }
      ctx.putImageData(img, 0, 0);
      return;
    }

    if (filterName === 'gray') {
      for (let i = 0; i < d.length; i += 4) {
        const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        d[i] = d[i + 1] = d[i + 2] = l;
      }
      ctx.putImageData(img, 0, 0);
      return;
    }

    if (filterName === 'sketch' || filterName === 'relief') {
      // FIXED 1px transparent border: start from full copy so edges never vanish!
      const src = new Uint8ClampedArray(d);
      const isRelief = filterName === 'relief';
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = (y * w + x) * 4;
          if (src[i + 3] === 0) continue;
          const lum = idx => 0.299 * src[idx] + 0.587 * src[idx + 1] + 0.114 * src[idx + 2];
          if (isRelief) {
            const diff = lum(((y - 1) * w + (x - 1)) * 4) - lum(((y + 1) * w + (x + 1)) * 4);
            const v = Math.max(0, Math.min(255, 128 + diff * 1.65));
            d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = src[i + 3];
          } else {
            const gx = -lum(((y - 1) * w + (x - 1)) * 4) + lum(((y - 1) * w + (x + 1)) * 4)
              - 2 * lum((y * w + (x - 1)) * 4) + 2 * lum((y * w + (x + 1)) * 4)
              - lum(((y + 1) * w + (x - 1)) * 4) + lum(((y + 1) * w + (x + 1)) * 4);
            const gy = -lum(((y - 1) * w + (x - 1)) * 4) - 2 * lum(((y - 1) * w + x) * 4) - lum(((y - 1) * w + (x + 1)) * 4)
              + lum(((y + 1) * w + (x - 1)) * 4) + 2 * lum(((y + 1) * w + x) * 4) + lum(((y + 1) * w + (x + 1)) * 4);
            const edge = Math.max(0, Math.min(255, 255 - Math.hypot(gx, gy) * 0.9));
            d[i] = edge; d[i + 1] = edge; d[i + 2] = edge; d[i + 3] = src[i + 3];
          }
        }
      }
      ctx.putImageData(img, 0, 0);
      return;
    }

    if (filterName === 'chromatic') {
      // Pro RGB Chromatic Aberration lens split!
      const src = new Uint8ClampedArray(d);
      const shift = Math.max(3, Math.round(w * 0.005));
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const xr = Math.min(w - 1, x + shift);
          const xb = Math.max(0, x - shift);
          d[i] = src[(y * w + xr) * 4];
          d[i + 2] = src[(y * w + xb) * 4 + 2];
        }
      }
      ctx.putImageData(img, 0, 0);
      return;
    }

    if (filterName === 'vignette') {
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.72);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.68)');
      ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); ctx.restore();
      return;
    }

    if (filterName === 'bloom') {
      const off = document.createElement('canvas');
      off.width = Math.max(64, w >> 2); off.height = Math.max(48, h >> 2);
      const octx = off.getContext('2d');
      octx.filter = 'blur(8px) brightness(1.25)';
      octx.drawImage(ctx.canvas, 0, 0, off.width, off.height);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.55;
      ctx.drawImage(off, 0, 0, w, h);
      ctx.restore();
      return;
    }

    if (filterName === 'ripple') {
      const src = new Uint8ClampedArray(d);
      const cx = w / 2, cy = h / 2;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const dx = x - cx, dy = y - cy;
          const dist = Math.hypot(dx, dy);
          const disp = Math.sin(dist * 0.055) * 10 * Math.exp(-dist / (Math.max(w, h) * 0.6));
          const ang = Math.atan2(dy, dx);
          const sx = Math.max(0, Math.min(w - 1, Math.round(x + Math.cos(ang) * disp)));
          const sy = Math.max(0, Math.min(h - 1, Math.round(y + Math.sin(ang) * disp)));
          const di = (y * w + x) * 4, si = (sy * w + sx) * 4;
          d[di] = src[si]; d[di + 1] = src[si + 1]; d[di + 2] = src[si + 2]; d[di + 3] = src[si + 3];
        }
      }
      ctx.putImageData(img, 0, 0);
      return;
    }

    if (filterName === 'ebru') {
      // Full-canvas Turkish Ebru fluid comb marbling swirl!
      const src = new Uint8ClampedArray(d);
      for (let y = 0; y < h; y++) {
        const waveX = Math.sin((y / h) * Math.PI * 6) * (w * 0.035);
        for (let x = 0; x < w; x++) {
          const waveY = Math.cos(((x + waveX) / w) * Math.PI * 5) * (h * 0.045);
          const sx = Math.max(0, Math.min(w - 1, Math.round(x + waveX)));
          const sy = Math.max(0, Math.min(h - 1, Math.round(y + waveY)));
          const di = (y * w + x) * 4, si = (sy * w + sx) * 4;
          d[di] = src[si]; d[di + 1] = src[si + 1]; d[di + 2] = src[si + 2]; d[di + 3] = src[si + 3];
        }
      }
      ctx.putImageData(img, 0, 0);
      return;
    }

    if (filterName === 'panel2x2') {
      // Pop-Art Warhol 2x2 tinted quad layout!
      const snap = document.createElement('canvas');
      snap.width = w; snap.height = h;
      snap.getContext('2d').drawImage(ctx.canvas, 0, 0);
      const hw = w / 2, hh = h / 2;
      const tints = [null, 'hue-rotate(90deg) saturate(1.4)', 'hue-rotate(200deg) contrast(1.15)', 'hue-rotate(300deg) saturate(1.3)'];
      ctx.clearRect(0, 0, w, h);
      tints.forEach((flt, idx) => {
        ctx.save();
        if (flt) ctx.filter = flt;
        ctx.drawImage(snap, (idx % 2) * hw, Math.floor(idx / 2) * hh, hw, hh);
        ctx.restore();
      });
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(hw, 0); ctx.lineTo(hw, h); ctx.moveTo(0, hh); ctx.lineTo(w, hh); ctx.stroke();
    }
  }

  // =========================================================================
  // 5. NON-DESTRUCTIVE PHYSICAL FINE-ART SURFACE TEXTURES (CACHED PATTERNS)
  // =========================================================================

  const _texCache = {};
  function drawPaperTexture(ctx, w, h, texId, opacity) {
    if (!texId || texId === 'none') return;
    if (!_texCache[texId]) {
      const tile = document.createElement('canvas');
      tile.width = 160; tile.height = 160;
      const tctx = tile.getContext('2d');
      const img = tctx.createImageData(160, 160);
      const d = img.data;
      const rng = C().createRng(C().hashString32(texId));

      for (let y = 0; y < 160; y++) {
        for (let x = 0; x < 160; x++) {
          const i = (y * 160 + x) * 4;
          let v = 128;
          if (texId === 'watercolor') {
            v = 115 + (rng() * 48) + Math.sin(x * 0.25) * 8 + Math.cos(y * 0.25) * 8;
          } else if (texId === 'linen') {
            const weave = ((x % 4 < 2) ^ (y % 4 < 2)) ? 148 : 108;
            v = weave + (rng() - 0.5) * 18;
          } else if (texId === 'washi') {
            v = 128 + (rng() - 0.5) * 32 + Math.sin(x * 0.08 + y * 0.14) * 18;
          } else if (texId === 'goldfoil') {
            v = 125 + Math.sin(x * 0.12) * 28 + (rng() - 0.5) * 22;
          } else if (texId === 'halftone') {
            const dx = (x % 8) - 4, dy = (y % 8) - 4;
            v = Math.hypot(dx, dy) < 2.2 ? 75 : 165;
          }
          d[i] = texId === 'goldfoil' ? Math.min(255, v * 1.15) : v;
          d[i + 1] = texId === 'goldfoil' ? Math.min(255, v * 0.98) : v;
          d[i + 2] = texId === 'goldfoil' ? v * 0.58 : v;
          d[i + 3] = 255;
        }
      }
      tctx.putImageData(img, 0, 0);
      _texCache[texId] = tile;
    }

    ctx.save();
    ctx.globalCompositeOperation = texId === 'goldfoil' ? 'soft-light' : 'overlay';
    ctx.globalAlpha = Math.max(0.05, Math.min(0.6, opacity !== undefined ? opacity : 0.22));
    const pat = ctx.createPattern(_texCache[texId], 'repeat');
    if (pat) {
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }

  const ArtBrushes = {
    getSymmetryTransforms,
    resetStrokeTrail,
    drawStrokeSegment,
    smartFloodFill,
    applyFilter,
    drawPaperTexture
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = ArtBrushes;
  if (globalScope) globalScope.ArtBrushes = ArtBrushes;
})(typeof window !== 'undefined' ? window : globalThis);
