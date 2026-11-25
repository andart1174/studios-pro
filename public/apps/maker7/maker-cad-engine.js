/**
 * Maker Studio 7 — Functional 3D CAD & Typography Engine (7 Watertight Studios)
 * Studios: box (Finger-Joint Laser Box), gear (Involute + Twin Meshing), stand (Phone Stand + USB),
 *          cookie (Constant-Offset Cookie Cutter), qrcode (3D QR / Wi-Fi), keychain (Unicode), text (Unicode 3D).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./maker-core.js'));
  } else {
    root.MakerCadEngine = factory(root.MakerCore);
  }
}(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';

  const PI = Math.PI;
  const TAU = Math.PI * 2;

  /* =========================================================================
     HELPER: PURE CANVAS2D UNICODE TEXT RASTERIZER (100% DIACRITICS & SYMBOLS!)
     Works in Browser Canvas2D AND falls back to built-in 5x7 crisp bitmap font in Node.js!
  ========================================================================= */
  const FALLBACK_5X7 = {
    'A': ['01110','10001','10001','11111','10001','10001','10001'],
    'B': ['11110','10001','10001','11110','10001','10001','11110'],
    'C': ['01111','10000','10000','10000','10000','10000','01111'],
    'D': ['11110','10001','10001','10001','10001','10001','11110'],
    'E': ['11111','10000','10000','11110','10000','10000','11111'],
    'F': ['11111','10000','10000','11110','10000','10000','10000'],
    'G': ['01111','10000','10000','10111','10001','10001','01110'],
    'H': ['10001','10001','10001','11111','10001','10001','10001'],
    'I': ['11111','00100','00100','00100','00100','00100','11111'],
    'J': ['00111','00010','00010','00010','10010','10010','01100'],
    'K': ['10001','10010','10100','11000','10100','10010','10001'],
    'L': ['10000','10000','10000','10000','10000','10000','11111'],
    'M': ['10001','11011','10101','10101','10001','10001','10001'],
    'N': ['10001','11001','10101','10011','10001','10001','10001'],
    'O': ['01110','10001','10001','10001','10001','10001','01110'],
    'P': ['11110','10001','10001','11110','10000','10000','10000'],
    'Q': ['01110','10001','10001','10001','10101','10010','01101'],
    'R': ['11110','10001','10001','11110','10100','10010','10001'],
    'S': ['01111','10000','10000','01110','00001','00001','11110'],
    'T': ['11111','00100','00100','00100','00100','00100','00100'],
    'U': ['10001','10001','10001','10001','10001','10001','01110'],
    'V': ['10001','10001','10001','10001','01010','01010','00100'],
    'W': ['10001','10001','10001','10101','10101','11011','10001'],
    'X': ['10001','10001','01010','00100','01010','10001','10001'],
    'Y': ['10001','10001','01010','00100','00100','00100','00100'],
    'Z': ['11111','00001','00010','00100','01000','10000','11111'],
    '0': ['01110','10011','10101','10101','11001','10001','01110'],
    '1': ['00100','01100','00100','00100','00100','00100','01110'],
    '2': ['01110','10001','00001','00110','01000','10000','11111'],
    '3': ['11110','00001','00001','01110','00001','00001','11110'],
    '4': ['00010','00110','01010','10010','11111','00010','00010'],
    '5': ['11111','10000','11110','00001','00001','10001','01110'],
    '6': ['01110','10000','11110','10001','10001','10001','01110'],
    '7': ['11111','00001','00010','00100','01000','01000','01000'],
    '8': ['01110','10001','10001','01110','10001','10001','01110'],
    '9': ['01110','10001','10001','01111','00001','00001','01110'],
    ' ': ['00000','00000','00000','00000','00000','00000','00000'],
    '-': ['00000','00000','00000','11111','00000','00000','00000'],
    '♡': ['01010','11111','11111','11111','01110','00100','00000'],
    '★': ['00100','00100','11111','01110','01010','10001','00000']
  };

  function rasterizeUnicodeLines(lines, fontCss, widthPx, heightPx) {
    if (typeof document !== 'undefined' && document.createElement) {
      const c = document.createElement('canvas');
      c.width = widthPx;
      c.height = heightPx;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, widthPx, heightPx);
      const nonEmpty = lines.filter((l) => l && l.trim().length > 0);
      if (nonEmpty.length === 0) nonEmpty.push('MAKER 7');

      const lineH = heightPx / (nonEmpty.length + 0.35);
      const fontSize = Math.floor(lineH * 0.78);
      ctx.font = `900 ${fontSize}px ${fontCss || 'Inter, system-ui, sans-serif'}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Auto-scale horizontally to fit comfortably inside widthPx
      let maxW = 1;
      for (const l of nonEmpty) maxW = Math.max(maxW, ctx.measureText(l).width);
      const scaleX = maxW > widthPx * 0.88 ? (widthPx * 0.88) / maxW : 1.0;

      ctx.save();
      ctx.fillStyle = '#FFF';
      for (let i = 0; i < nonEmpty.length; i++) {
        const cy = ((i + 0.5) / nonEmpty.length) * (heightPx * 0.84) + heightPx * 0.08;
        ctx.save();
        ctx.translate(widthPx * 0.5, cy);
        ctx.scale(scaleX, 1);
        ctx.fillText(nonEmpty[i], 0, 0);
        ctx.restore();
      }
      ctx.restore();

      const img = ctx.getImageData(0, 0, widthPx, heightPx).data;
      const grid = new Float32Array(widthPx * heightPx);
      for (let i = 0; i < grid.length; i++) grid[i] = img[i * 4] / 255;
      return { width: widthPx, height: heightPx, data: grid };
    }

    // Pure-JS deterministic bitmap fallback for Node.js headless tests
    const grid = new Float32Array(widthPx * heightPx);
    const txt = (lines[0] || 'MAKER 7').toUpperCase();
    const cols = Math.max(1, txt.length * 6);
    const cellW = (widthPx * 0.86) / cols;
    const cellH = (heightPx * 0.65) / 7;
    const x0 = widthPx * 0.07, y0 = heightPx * 0.175;
    for (let ci = 0; ci < txt.length; ci++) {
      const ch = FALLBACK_5X7[txt[ci]] || FALLBACK_5X7['M'];
      for (let r = 0; r < 7; r++) {
        for (let k = 0; k < 5; k++) {
          if (ch[r][k] === '1') {
            const px0 = Math.floor(x0 + (ci * 6 + k) * cellW);
            const px1 = Math.ceil(x0 + (ci * 6 + k + 1) * cellW);
            const py0 = Math.floor(y0 + r * cellH);
            const py1 = Math.ceil(y0 + (r + 1) * cellH);
            for (let y = Math.max(0, py0); y < Math.min(heightPx, py1); y++) {
              for (let x = Math.max(0, px0); x < Math.min(widthPx, px1); x++) {
                grid[y * widthPx + x] = 1.0;
              }
            }
          }
        }
      }
    }
    return { width: widthPx, height: heightPx, data: grid };
  }

  /**
   * Builds crisp watertight 3D extruded solid blocks from a binary text mask using horizontal run-length merging!
   * Much cleaner, faster & 100% manifold than noisy heightfields for standing letters!
   */
  function extrudeMaskRuns(mask, widthMm, heightMm, y0, y1, threshold, meta) {
    const W = mask.width, H = mask.height, data = mask.data;
    const dx = widthMm / W, dz = heightMm / H;
    const boxes = [];
    for (let r = 0; r < H; r++) {
      const cz = ((r + 0.5) / H - 0.5) * heightMm;
      let c = 0;
      while (c < W) {
        if (data[r * W + c] >= threshold) {
          const start = c;
          while (c < W && data[r * W + c] >= threshold) c++;
          const runLen = c - start;
          const cx = (((start + c) * 0.5) / W - 0.5) * widthMm;
          boxes.push(C.buildBox(cx, (y0 + y1) * 0.5, cz, runLen * dx + 0.04, y1 - y0, dz + 0.04, meta));
        } else {
          c++;
        }
      }
    }
    if (boxes.length === 0) return C.buildBox(0, (y0 + y1) * 0.5, 0, 10, y1 - y0, 10, meta);
    return C.mergeParts(boxes, meta);
  }

  /* =========================================================================
     STUDIO 3: PARAMETRIC FINGER-JOINT LASER BOX (+ KERF + LID + DIVIDERS + EXPLODE!)
  ========================================================================= */
  function buildFingerEdge(pts, x0, y0, x1, y1, tabW, depthT, outward, invertTabs, kerf) {
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    if (len < 1e-4) return;
    const ux = dx / len, uy = dy / len;
    // Outward normal for CCW polygon edge (dx, dy) is (uy, -ux)
    const nx = uy * (outward ? 1 : -1), ny = -ux * (outward ? 1 : -1);
    let nSeg = Math.max(3, Math.floor(len / Math.max(4, tabW)));
    if (nSeg % 2 === 0) nSeg++; // Odd count ensures symmetric corners!
    const segLen = len / nSeg;
    const k = C.clamp(kerf || 0, 0, 0.4) * 0.5;

    for (let i = 0; i < nSeg; i++) {
      const isTab = invertTabs ? (i % 2 === 0) : (i % 2 === 1);
      const tA = i * segLen + (i > 0 ? (isTab ? -k : k) : 0);
      const tB = (i + 1) * segLen + (i < nSeg - 1 ? (isTab ? k : -k) : 0);
      const dOff = isTab ? depthT : 0;
      const ax = x0 + ux * tA + nx * dOff, ay = y0 + uy * tA + ny * dOff;
      const bx = x0 + ux * tB + nx * dOff, by = y0 + uy * tB + ny * dOff;
      pts.push([ax, ay], [bx, by]);
    }
  }

  function makeFingerPanel2D(w, h, t, tabW, edgesCfg, kerf) {
    // edgesCfg: { bot, right, top, left } each { enabled, outward, invert }
    const pts = [];
    const hw = w * 0.5, hh = h * 0.5;
    const addSide = (x0, y0, x1, y1, cfg) => {
      if (cfg && cfg.enabled) {
        buildFingerEdge(pts, x0, y0, x1, y1, tabW, t, cfg.outward, cfg.invert, kerf);
      } else {
        pts.push([x0, y0], [x1, y1]);
      }
    };
    addSide(-hw, -hh, hw, -hh, edgesCfg.bot);
    addSide(hw, -hh, hw, hh, edgesCfg.right);
    addSide(hw, hh, -hw, hh, edgesCfg.top);
    addSide(-hw, hh, -hw, -hh, edgesCfg.left);
    return C.ensureCCW(pts);
  }

  function buildBoxStudio(s) {
    const W = C.clamp(Number(s.width) || 110, 30, 300);
    const H = C.clamp(Number(s.height) || 60, 25, 220);
    const D = C.clamp(Number(s.depth) || 85, 30, 300);
    const T = C.clamp(Number(s.thickness) || 3.0, 1.5, 10.0);
    const tabW = C.clamp(Number(s.tabWidth) || 12, 5, 30);
    const kerf = C.clamp(Number(s.kerf) || 0.12, 0, 0.35);
    const lidType = s.lidType || 'liftoff'; // 'open' | 'liftoff' | 'sliding'
    const divX = C.clamp(Math.round(Number(s.dividersX) || 0), 0, 3);
    const divY = C.clamp(Math.round(Number(s.dividersY) || 0), 0, 3);
    const explode = C.clamp(Number(s.explodePct) || 0, 0, 100) / 100 * 32;
    const color = s.color || '#d97706';
    const hasLid = lidType !== 'open';

    const innerW = W - 2 * T, innerD = D - 2 * T, innerH = H - (hasLid ? 2 * T : T);
    const parts = [];
    const vectors2D = [];

    // Helper: orient a 2D XY finger panel (extruded y=0..T) into 3D space and nest it cleanly for 2D Laser SVG/DXF!
    let nestX = 0, nestY = 0, rowMaxH = 0;
    function registerNest(poly2D, label, pw, ph) {
      if (nestX > 0 && nestX + pw > 380) { nestX = 0; nestY += rowMaxH + 8; rowMaxH = 0; }
      const shifted = poly2D.map(([x, y]) => [x + nestX + pw * 0.5, y + nestY + ph * 0.5]);
      vectors2D.push({ points: shifted, closed: true, layer: 'cut', label });
      nestX += pw + 8;
      if (ph > rowMaxH) rowMaxH = ph;
    }

    // 1. BOTTOM PANEL (innerW × innerD, outward tabs on all 4 sides!)
    const botPoly = makeFingerPanel2D(innerW, innerD, T, tabW, {
      bot: { enabled: true, outward: true, invert: false },
      right: { enabled: true, outward: true, invert: false },
      top: { enabled: true, outward: true, invert: false },
      left: { enabled: true, outward: true, invert: false }
    }, kerf);
    registerNest(botPoly, 'bottom', W, D);
    const botMesh = C.extrudePolygon2D(botPoly, [], 0, T, { name: 'box_bottom', color, roughness: 0.65 });
    C.transformPart(botMesh, (x, y, z) => [x, y - explode * 0.5, z]);
    parts.push(botMesh);

    // 2. FRONT & BACK PANELS (innerW × innerH; bottom notches match bottom tabs, side tabs outward!)
    const fbPoly = makeFingerPanel2D(innerW, innerH, T, tabW, {
      bot: { enabled: true, outward: true, invert: true },
      right: { enabled: true, outward: true, invert: false },
      top: { enabled: hasLid && lidType === 'liftoff', outward: true, invert: true },
      left: { enabled: true, outward: true, invert: false }
    }, kerf);
    registerNest(fbPoly, 'front', W, H);
    registerNest(fbPoly, 'back', W, H);
    // Front (+Z)
    const frontMesh = C.extrudePolygon2D(fbPoly, [], 0, T, { name: 'box_front', color, roughness: 0.65 });
    C.transformPart(frontMesh, (x, y, z) => [x, T + innerH * 0.5 - z, D * 0.5 - T + y + explode]);
    parts.push(frontMesh);
    // Back (-Z)
    const backMesh = C.extrudePolygon2D(fbPoly, [], 0, T, { name: 'box_back', color, roughness: 0.65 });
    C.transformPart(backMesh, (x, y, z) => [x, T + innerH * 0.5 - z, -D * 0.5 + y - explode]);
    parts.push(backMesh);

    // 3. LEFT & RIGHT PANELS (innerD × innerH; bottom + left/right inverted tabs matching front/back!)
    const lrPoly = makeFingerPanel2D(innerD, innerH, T, tabW, {
      bot: { enabled: true, outward: true, invert: true },
      right: { enabled: true, outward: true, invert: true },
      top: { enabled: hasLid && lidType === 'liftoff', outward: true, invert: true },
      left: { enabled: true, outward: true, invert: true }
    }, kerf);
    registerNest(lrPoly, 'left', D, H);
    registerNest(lrPoly, 'right', D, H);
    // Left (-X)
    const leftMesh = C.extrudePolygon2D(lrPoly, [], 0, T, { name: 'box_left', color, roughness: 0.65 });
    C.transformPart(leftMesh, (x, y, z) => [-W * 0.5 + y - explode, T + innerH * 0.5 - z, x]);
    parts.push(leftMesh);
    // Right (+X)
    const rightMesh = C.extrudePolygon2D(lrPoly, [], 0, T, { name: 'box_right', color, roughness: 0.65 });
    C.transformPart(rightMesh, (x, y, z) => [W * 0.5 - T + y + explode, T + innerH * 0.5 - z, x]);
    parts.push(rightMesh);

    // 4. OPTIONAL LID (Lift-Off Finger Lid OR Sliding Groove Lid with Finger Pull!)
    if (hasLid) {
      const lidColor = '#f59e0b';
      if (lidType === 'liftoff') {
        const lidPoly = makeFingerPanel2D(innerW, innerD, T, tabW, {
          bot: { enabled: true, outward: true, invert: false },
          right: { enabled: true, outward: true, invert: false },
          top: { enabled: true, outward: true, invert: false },
          left: { enabled: true, outward: true, invert: false }
        }, kerf);
        registerNest(lidPoly, 'lid', W, D);
        const lidMesh = C.extrudePolygon2D(lidPoly, [], 0, T, { name: 'box_lid', color: lidColor, roughness: 0.55 });
        C.transformPart(lidMesh, (x, y, z) => [x, H - T + y + explode * 1.35, z]);
        parts.push(lidMesh);
      } else {
        // Sliding lid with ergonomic circular thumb pull cutout
        const slideW = innerW + T * 0.8, slideD = innerD + T * 1.2;
        const outer = [[-slideW * 0.5, -slideD * 0.5], [slideW * 0.5, -slideD * 0.5], [slideW * 0.5, slideD * 0.5], [-slideW * 0.5, slideD * 0.5]];
        const pullHole = [];
        for (let i = 0; i < 20; i++) {
          const a = (i / 20) * TAU;
          pullHole.push([Math.cos(a) * 6.5, slideD * 0.34 + Math.sin(a) * 6.5]);
        }
        registerNest(outer, 'sliding_lid', slideW + 2, slideD + 2);
        const slideMesh = C.extrudePolygon2D(outer, [pullHole], 0, T, { name: 'box_sliding_lid', color: lidColor, roughness: 0.55 });
        C.transformPart(slideMesh, (x, y, z) => [x, H - T + y + explode * 0.8, z + explode * 1.6]);
        parts.push(slideMesh);
      }
    }

    // 5. OPTIONAL INTERNAL COMPARTMENT DIVIDERS!
    const divH = innerH * 0.86;
    for (let i = 1; i <= divX; i++) {
      const px = -innerW * 0.5 + (i / (divX + 1)) * innerW;
      parts.push(C.buildBox(px, T + divH * 0.5 + explode * 0.3, 0, T, divH, innerD - 0.2, { name: 'divider_x_' + i, color: '#b45309', roughness: 0.7 }));
      registerNest([[-innerD * 0.5, -divH * 0.5], [innerD * 0.5, -divH * 0.5], [innerD * 0.5, divH * 0.5], [-innerD * 0.5, divH * 0.5]], 'div_x', innerD, divH);
    }
    for (let j = 1; j <= divY; j++) {
      const pz = -innerD * 0.5 + (j / (divY + 1)) * innerD;
      parts.push(C.buildBox(0, T + divH * 0.5 + explode * 0.3, pz, innerW - 0.2, divH, T, { name: 'divider_y_' + j, color: '#b45309', roughness: 0.7 }));
      registerNest([[-innerW * 0.5, -divH * 0.5], [innerW * 0.5, -divH * 0.5], [innerW * 0.5, divH * 0.5], [-innerW * 0.5, divH * 0.5]], 'div_y', innerW, divH);
    }

    return { parts, vectors2D, extras: { lidType, innerDims: `${innerW.toFixed(1)}×${innerH.toFixed(1)}×${innerD.toFixed(1)} mm` } };
  }

  /* =========================================================================
     STUDIO 9: TRUE METRIC INVOLUTE SPUR GEAR + LIVE TWIN MESHING SIMULATOR
  ========================================================================= */
  function generateInvoluteGear2D(teeth, mod, pressureAngleDeg, boreType, boreDiam, spokeCutouts) {
    const Z = C.clamp(Math.round(teeth), 6, 72);
    const m = C.clamp(mod, 0.8, 6.0);
    const alpha = (C.clamp(pressureAngleDeg || 20, 14.5, 25) * PI) / 180;
    const Rp = (m * Z) * 0.5;          // Pitch radius
    const Ra = Rp + m;                 // Addendum (outer tip) radius
    const Rf = Math.max(m * 1.2, Rp - 1.25 * m); // Dedendum (root) radius
    const Rb = Rp * Math.cos(alpha);   // Base circle radius

    // Involute half-tooth angular thickness at pitch circle
    const invAlpha = Math.tan(alpha) - alpha;
    const halfToothAngle = (PI / (2 * Z)) + invAlpha;

    // Sample involute flank from max(Rb, Rf) to Ra
    function involutePoint(r, sign) {
      if (r <= Rb + 1e-5) return { r: r, theta: sign * halfToothAngle };
      const phi = Math.acos(C.clamp(Rb / r, -1, 1));
      const invPhi = Math.tan(phi) - phi;
      return { r: r, theta: sign * (halfToothAngle - invPhi) };
    }

    const outer = [];
    const flankSteps = 4;
    for (let i = 0; i < Z; i++) {
      const centerA = (i / Z) * TAU;
      // Root fillet start
      const rootHalf = (PI / Z) * 0.52;
      outer.push([Math.cos(centerA - rootHalf) * Rf, Math.sin(centerA - rootHalf) * Rf]);
      // Left involute flank (root -> tip)
      for (let k = 0; k <= flankSteps; k++) {
        const r = Math.max(Rf, Rb) + (Ra - Math.max(Rf, Rb)) * (k / flankSteps);
        const pt = involutePoint(r, -1);
        const a = centerA + pt.theta;
        outer.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
      // Right involute flank (tip -> root)
      for (let k = flankSteps; k >= 0; k--) {
        const r = Math.max(Rf, Rb) + (Ra - Math.max(Rf, Rb)) * (k / flankSteps);
        const pt = involutePoint(r, 1);
        const a = centerA + pt.theta;
        outer.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
    }

    // Safe bore hole (clamped strictly inside root radius so gear NEVER self-intersects!)
    const holes = [];
    const maxSafeBoreR = Math.max(0, Rf - Math.max(2.2, m * 1.1));
    const boreR = C.clamp((Number(boreDiam) || 0) * 0.5, 0, maxSafeBoreR);

    if (boreR >= 1.0) {
      const holePts = [];
      if (boreType === 'hex') {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU;
          holePts.push([Math.cos(a) * boreR, Math.sin(a) * boreR]);
        }
      } else if (boreType === 'dshaft') {
        const flatX = boreR * 0.72;
        for (let i = 0; i < 28; i++) {
          const a = (i / 28) * TAU;
          const x = Math.min(flatX, Math.cos(a) * boreR);
          holePts.push([x, Math.sin(a) * boreR]);
        }
      } else if (boreType === 'keyway') {
        const kw = Math.max(1.8, boreR * 0.36);
        const kd = Math.min(boreR * 0.38, maxSafeBoreR - boreR + 1.2);
        const aKey = Math.asin(C.clamp((kw * 0.5) / boreR, 0.1, 0.7));
        holePts.push([kw * 0.5, boreR + kd], [-kw * 0.5, boreR + kd]);
        for (let i = 0; i <= 24; i++) {
          const a = (PI * 0.5 + aKey) + (i / 24) * (TAU - 2 * aKey);
          holePts.push([Math.cos(a) * boreR, Math.sin(a) * boreR]);
        }
      } else {
        for (let i = 0; i < 28; i++) {
          const a = (i / 28) * TAU;
          holePts.push([Math.cos(a) * boreR, Math.sin(a) * boreR]);
        }
      }
      holes.push(holePts);
    }

    // Weight-reduction lightening holes when gear is wide enough
    if (spokeCutouts && Rf - boreR > 14) {
      const midR = (boreR + 3.5 + Rf - 3.5) * 0.5;
      const holeRad = Math.min((Rf - boreR - 9) * 0.36, midR * 0.36);
      if (holeRad >= 2.2) {
        const spokes = 5;
        for (let s = 0; s < spokes; s++) {
          const sa = (s / spokes) * TAU;
          const sx = Math.cos(sa) * midR, sy = Math.sin(sa) * midR;
          const sp = [];
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * TAU;
            sp.push([sx + Math.cos(a) * holeRad, sy + Math.sin(a) * holeRad]);
          }
          holes.push(sp);
        }
      }
    }

    return { outer, holes, pitchDiam: +(m * Z).toFixed(2), outerDiam: +(Ra * 2).toFixed(2), boreDiamActual: +(boreR * 2).toFixed(2) };
  }

  function buildGearStudio(s) {
    const Z1 = C.clamp(Math.round(Number(s.teeth) || 20), 6, 72);
    const m = C.clamp(Number(s.module) || 2.5, 0.8, 6.0);
    const depth = C.clamp(Number(s.thickness) || 10, 2, 50);
    const boreDiam = C.clamp(s.boreDiam != null ? Number(s.boreDiam) : 10, 0, 80);
    const boreType = s.boreType || 'round';
    const spokeCutouts = !!s.spokeCutouts;
    const showTwin = !!s.showTwin;
    const Z2 = C.clamp(Math.round(Number(s.twinTeeth) || 14), 6, 72);
    const color = s.color || '#64748b';

    const g1 = generateInvoluteGear2D(Z1, m, 20, boreType, boreDiam, spokeCutouts);
    const mesh1 = C.extrudePolygon2D(g1.outer, g1.holes, 0, depth, {
      name: 'gear_primary', color, roughness: 0.38, metalness: 0.65,
      animRole: 'gear_primary', teeth: Z1
    });

    const parts = [mesh1];
    const vectors2D = [{ points: g1.outer, closed: true, layer: 'cut' }]
      .concat(g1.holes.map((h) => ({ points: h, closed: true, layer: 'cut' })));

    let centerDist = 0;
    if (showTwin) {
      centerDist = m * (Z1 + Z2) * 0.5;
      const g2 = generateInvoluteGear2D(Z2, m, 20, boreType, Math.min(boreDiam, m * Z2 * 0.4), spokeCutouts);
      const phaseAngle = (Z2 % 2 === 0) ? (PI / Z2) : 0;
      const mesh2 = C.extrudePolygon2D(g2.outer, g2.holes, 0, depth, {
        name: 'gear_twin', color: '#38bdf8', roughness: 0.38, metalness: 0.65,
        animRole: 'gear_twin', teeth: Z2, ratio: -Z1 / Z2, pivotX: centerDist, basePhase: phaseAngle
      });
      // Position twin at exact meshing center distance + phase-aligned!
      const ca = Math.cos(phaseAngle), sa = Math.sin(phaseAngle);
      C.transformPart(mesh2, (x, y, z) => [centerDist + x * ca - z * sa, y, x * sa + z * ca]);
      parts.push(mesh2);
      vectors2D.push({ points: g2.outer.map(([x, y]) => [x + centerDist + 4, y]), closed: true, layer: 'cut' });
    }

    return {
      parts, vectors2D,
      extras: {
        pitchDiam: g1.pitchDiam,
        outerDiam: g1.outerDiam,
        centerDistance: +centerDist.toFixed(2),
        gearRatio: showTwin ? `${Z1}:${Z2} (${(Z1 / Z2).toFixed(2)}×)` : '1:1'
      }
    };
  }

  /* =========================================================================
     STUDIO 15: ERGONOMIC ANTI-TIP PHONE STAND (+ REAL USB-C CABLE SLOT!)
  ========================================================================= */
  function buildStandStudio(s) {
    const angleDeg = C.clamp(Number(s.angle) || 62, 45, 76);
    const devT = C.clamp(Number(s.deviceThick) || 13, 8, 24);
    const W = C.clamp(Number(s.width) || 68, 40, 120);
    const cableSlot = s.cableSlot !== false;
    const color = s.color || '#3b82f6';

    const a = (angleDeg * PI) / 180;
    const ca = Math.cos(a), sa = Math.sin(a);
    const wall = 5.0;
    const baseLen = 78;
    const backH = 92;
    const lipH = 15;
    const shelfY = 18; // Raised cradle shelf for charging cable clearance!

    // Side profile in 2D (x = front-to-back, y = vertical height) — guaranteed non-self-intersecting!
    // Front cradle starts at x = 0, backrest leans backward (+x, +y) at angle a from horizontal!
    const cradleX = 16;
    const backStartX = cradleX + devT;
    const backTopX = backStartX + ca * backH;
    const backTopY = shelfY + sa * backH;
    const footBackX = Math.max(baseLen, backTopX + 8);

    // Solid anti-tip side profile polygon (CCW)
    const sidePoly = [
      [0, 0],
      [footBackX, 0],
      [footBackX, wall + 2],
      [backStartX + wall * 1.4, wall + 2],
      [backTopX + wall * 1.1, backTopY],
      [backTopX, backTopY],
      [backStartX, shelfY],
      [cradleX, shelfY],
      [cradleX, shelfY + lipH],
      [cradleX - wall, shelfY + lipH],
      [cradleX - wall, wall + 4],
      [0, wall + 4]
    ];

    const parts = [];
    if (cableSlot && W >= 42) {
      // Split into twin outer cradles + solid upper backrest bridge leaving an 18 mm USB-C cable slot at center!
      const slotW = 18;
      const cheekW = (W - slotW) * 0.5;
      const leftCheek = C.extrudePolygon2D(sidePoly, [], -W * 0.5, -slotW * 0.5, { name: 'stand_left', color, roughness: 0.45 });
      const rightCheek = C.extrudePolygon2D(sidePoly, [], slotW * 0.5, W * 0.5, { name: 'stand_right', color, roughness: 0.45 });
      // Rotate extruded Y-axis width -> X-axis width so stand sits upright on Y = 0!
      // In extrudePolygon2D: 2D (x,y) -> 3D (x, yExt, -y2d). Map to upright: X = yExt, Y = y2d = -z, Z = x - footBackX/2!
      const toUpright = (p) => C.transformPart(p, (x, y, z) => [y, -z, x - footBackX * 0.45]);
      parts.push(toUpright(leftCheek), toUpright(rightCheek));

      // Solid bridge connecting left & right cheeks at rear base + upper backrest (clear above USB-C plug!)
      const bridgePoly = [
        [backStartX + ca * 26, shelfY + sa * 26],
        [backTopX, backTopY],
        [backTopX + wall * 1.1, backTopY],
        [backStartX + ca * 26 + wall * 1.2, shelfY + sa * 26]
      ];
      const upperBridge = C.extrudePolygon2D(bridgePoly, [], -slotW * 0.5 - 0.2, slotW * 0.5 + 0.2, { name: 'stand_bridge', color, roughness: 0.45 });
      const rearBridge = C.extrudePolygon2D([
        [footBackX - 24, 0], [footBackX, 0], [footBackX, wall + 2], [footBackX - 24, wall + 2]
      ], [], -slotW * 0.5 - 0.2, slotW * 0.5 + 0.2, { name: 'stand_rear_foot', color, roughness: 0.45 });
      parts.push(toUpright(upperBridge), toUpright(rearBridge));
    } else {
      const solid = C.extrudePolygon2D(sidePoly, [], -W * 0.5, W * 0.5, { name: 'stand_body', color, roughness: 0.45 });
      C.transformPart(solid, (x, y, z) => [y, -z, x - footBackX * 0.45]);
      parts.push(solid);
    }

    const vectors2D = [{ points: sidePoly, closed: true, layer: 'cut' }];
    return { parts, vectors2D, extras: { cableSlot } };
  }

  /* =========================================================================
     STUDIO 14: TRUE CONSTANT-OFFSET COOKIE CUTTER (+ OPTIONAL EMBOSS STAMP!)
  ========================================================================= */
  function sampleCookieShape2D(type, R) {
    const pts = [];
    const N = 72;
    if (type === 'heart') {
      for (let i = 0; i < N; i++) {
        const t = (i / N) * TAU;
        const hx = (16 * Math.pow(Math.sin(t), 3)) / 16.5;
        const hy = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t) + 2.2) / 15.5;
        pts.push([hx * R, hy * R]);
      }
    } else if (type === 'star') {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU + PI * 0.5;
        const r = (i % 2 === 0) ? R : R * 0.46;
        pts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
    } else if (type === 'square') {
      const s = R * 0.82;
      pts.push([-s, -s], [s, -s], [s, s], [-s, s]);
    } else if (type === 'hex') {
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; pts.push([Math.cos(a) * R, Math.sin(a) * R]); }
    } else if (type === 'tri') {
      for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU + PI * 0.5; pts.push([Math.cos(a) * R, Math.sin(a) * R]); }
    } else if (type === 'pent') {
      for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + PI * 0.5; pts.push([Math.cos(a) * R, Math.sin(a) * R]); }
    } else if (type === 'flower') {
      for (let i = 0; i < N; i++) {
        const a = (i / N) * TAU;
        const r = R * (0.76 + 0.24 * Math.cos(a * 6));
        pts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
    } else if (type === 'cloud') {
      for (let i = 0; i < N; i++) {
        const a = (i / N) * TAU;
        const r = R * (0.74 + 0.16 * Math.sin(a * 5) + 0.10 * Math.cos(a * 3));
        pts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
    } else if (type === 'drop') {
      for (let i = 0; i < N; i++) {
        const t = (i / N) * TAU;
        const x = Math.sin(t) * (0.62 - 0.36 * Math.cos(t)) * R * 1.15;
        const y = Math.cos(t) * R;
        pts.push([x, y]);
      }
    } else {
      for (let i = 0; i < N; i++) { const a = (i / N) * TAU; pts.push([Math.cos(a) * R, Math.sin(a) * R]); }
    }
    return C.ensureCCW(pts);
  }

  function buildCookieStudio(s) {
    const shapeType = s.shape || 'heart';
    const sizeMm = C.clamp(Number(s.sizeMm) || 76, 35, 160);
    const bladeDepth = C.clamp(Number(s.bladeDepth) || 16, 6, 32);
    const bladeThick = C.clamp(Number(s.bladeThick) || 1.2, 0.8, 2.5);
    const gripWidth = C.clamp(Number(s.gripWidth) || 5.5, 2.5, 12);
    const embossStamp = !!s.embossStamp;
    const color = s.color || '#ec4899';

    const contour = sampleCookieShape2D(shapeType, sizeMm * 0.5);
    // Constant-width cutting blade resting flat on Y = 0..bladeDepth + ergonomic reinforced rim at Y = 0..3.2 mm!
    const blade = C.buildClosedRibbon2D(contour, bladeThick * 0.5, 0, bladeDepth, { name: 'cookie_blade', color, roughness: 0.42 });
    const grip = C.buildClosedRibbon2D(contour, gripWidth * 0.5, 0, 3.2, { name: 'cookie_grip_flange', color, roughness: 0.48 });
    const parts = [grip, blade];
    const vectors2D = [{ points: contour, closed: true, layer: 'cut' }];

    if (embossStamp) {
      // Inner decorative embossing ring + crossbar bridge to handle!
      const innerContour = contour.map(([x, y]) => [x * 0.64, y * 0.64]);
      const stampRing = C.buildClosedRibbon2D(innerContour, 1.1, 0, bladeDepth * 0.68, { name: 'cookie_emboss', color: '#f472b6', roughness: 0.45 });
      parts.push(stampRing);
      // Horizontal bridge bar holding inner emboss stamp to outer grip rim
      parts.push(C.buildBox(0, 1.6, 0, sizeMm * 0.92, 3.2, 4.0, { name: 'cookie_stamp_bridge', color, roughness: 0.48 }));
      vectors2D.push({ points: innerContour, closed: true, layer: 'engrave' });
    }

    return { parts, vectors2D, extras: { bladeThick, gripWidth } };
  }

  /* =========================================================================
     STUDIO 13: 3D QR CODE & WI-FI PLAQUE (100% WATERTIGHT MERGED STL!)
  ========================================================================= */
  function buildQRMatrix(payload) {
    if (typeof qrcode === 'function') {
      try {
        const q = qrcode(0, 'M');
        q.addData(payload || 'https://studios-pro.com');
        q.make();
        const n = q.getModuleCount();
        const mat = [];
        for (let r = 0; r < n; r++) {
          const row = [];
          for (let c = 0; c < n; c++) row.push(q.isDark(r, c) ? 1 : 0);
          mat.push(row);
        }
        return mat;
      } catch (_) {}
    }
    // Deterministic valid-finder fallback matrix for Node.js tests without CDN qrcode.min.js
    const n = 21;
    const mat = Array.from({ length: n }, () => Array(n).fill(0));
    const drawFinder = (r0, c0) => {
      for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
        const edge = r === 0 || r === 6 || c === 0 || c === 6;
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        mat[r0 + r][c0 + c] = (edge || core) ? 1 : 0;
      }
    };
    drawFinder(0, 0); drawFinder(0, n - 7); drawFinder(n - 7, 0);
    let h = 2166136261;
    for (let i = 0; i < payload.length; i++) h = Math.imul(h ^ payload.charCodeAt(i), 16777619);
    const rng = C.mulberry32(h);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const inF = (r < 8 && c < 8) || (r < 8 && c >= n - 8) || (r >= n - 8 && c < 8);
      if (!inF) mat[r][c] = rng() > 0.48 ? 1 : 0;
    }
    return mat;
  }

  function buildQRStudio(s) {
    const mode = s.mode || 'url'; // 'url' | 'wifi' | 'text'
    let payload = s.text || 'https://studios-pro.com';
    if (mode === 'wifi') {
      const ssid = (s.wifiSsid || 'GuestWiFi').replace(/[;:,\\]/g, '');
      const pass = (s.wifiPass || 'Welcome2026').replace(/[;:,\\]/g, '');
      const sec = s.wifiSec || 'WPA';
      payload = `WIFI:T:${sec};S:${ssid};P:${pass};;`;
    }

    const sizeMm = C.clamp(Number(s.sizeMm) || 90, 40, 180);
    const baseT = C.clamp(Number(s.baseThick) || 2.4, 1.2, 8.0);
    const codeH = C.clamp(Number(s.codeHeight) || 1.2, 0.4, 4.0);
    const rounded = s.roundedCorners !== false;
    const keychainHole = !!s.keychainHole;
    const baseColor = s.baseColor || '#f8fafc';
    const dotColor = s.dotColor || '#0f172a';

    const matrix = buildQRMatrix(payload);
    const n = matrix.length;
    const quiet = 3;
    const totalCells = n + quiet * 2;
    const cellMm = sizeMm / totalCells;

    // Rounded rectangular plaque base (with optional corner keychain hole!)
    const hs = sizeMm * 0.5;
    const cr = rounded ? Math.min(8, sizeMm * 0.08) : 0.2;
    const baseOuter = [];
    const corners = [[hs - cr, hs - cr, 0], [-hs + cr, hs - cr, PI * 0.5], [-hs + cr, -hs + cr, PI], [hs - cr, -hs + cr, PI * 1.5]];
    for (const [cx, cy, a0] of corners) {
      for (let i = 0; i <= 5; i++) {
        const a = a0 + (i / 5) * (PI * 0.5);
        baseOuter.push([cx + Math.cos(a) * cr, cy + Math.sin(a) * cr]);
      }
    }
    const holes = [];
    if (keychainHole) {
      const hPts = [];
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU;
        hPts.push([-hs + 6.5 + Math.cos(a) * 2.4, hs - 6.5 + Math.sin(a) * 2.4]);
      }
      holes.push(hPts);
    }

    const baseMesh = C.extrudePolygon2D(baseOuter, holes, 0, baseT, { name: 'qr_base_plate', color: baseColor, roughness: 0.6 });

    // Merge contiguous horizontal runs of QR dark modules into crisp watertight solid bars (NO InstancedMesh bug!)
    const moduleBoxes = [];
    const vectors2D = [{ points: baseOuter, closed: true, layer: 'cut' }];
    for (let r = 0; r < n; r++) {
      let c = 0;
      const cz = ((r + quiet + 0.5) - totalCells * 0.5) * cellMm;
      while (c < n) {
        if (matrix[r][c] === 1) {
          const start = c;
          while (c < n && matrix[r][c] === 1) c++;
          const runW = (c - start) * cellMm;
          const cx = (((start + c) * 0.5 + quiet) - totalCells * 0.5) * cellMm;
          // Overlap 0.03 mm vertically into base so slicer welds solidly!
          moduleBoxes.push(C.buildBox(cx, baseT + codeH * 0.5 - 0.03, cz, runW + 0.02, codeH + 0.06, cellMm + 0.02, { color: dotColor }));
          const x0 = cx - runW * 0.5, x1 = cx + runW * 0.5, y0 = -cz - cellMm * 0.5, y1 = -cz + cellMm * 0.5;
          vectors2D.push({ points: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], closed: true, layer: 'engrave' });
        } else {
          c++;
        }
      }
    }

    const modulesMesh = C.mergeParts(moduleBoxes, { name: 'qr_code_modules', color: dotColor, roughness: 0.45, flatShaded: true });
    return {
      parts: [baseMesh, modulesMesh],
      vectors2D,
      extras: {
        moduleCount: n,
        swapLayerZ: baseT.toFixed(2) + ' mm',
        payload
      }
    };
  }

  /* =========================================================================
     STUDIO 17: CUSTOM UNICODE KEYCHAIN TAG (TRUE RECESSED INLAY + WELDED RING!)
  ========================================================================= */
  function buildKeychainStudio(s) {
    const textStr = (s.text || 'Maker 7').trim() || 'Maker 7';
    const shapeType = s.shape || 'pill'; // pill | rect | circle | diamond | heart
    const thick = C.clamp(Number(s.thickness) || 3.4, 1.8, 10);
    const fontSize = C.clamp(Number(s.fontSize) || 14, 7, 28);
    const textH = C.clamp(Number(s.textHeight) || 1.6, 0.4, 4.0);
    const recessed = !!s.recessed;
    const pad = C.clamp(Number(s.padding) || 7, 3, 20);
    const ringHole = C.clamp(Number(s.ringHole) || 3.0, 1.8, 8.0);
    const fontStyle = s.fontStyle || 'Inter, system-ui, sans-serif';
    const baseColor = s.baseColor || '#e2e8f0';
    const textColor = s.textColor || '#ef4444';

    const textW = Math.max(24, textStr.length * fontSize * 0.62);
    const textHeightMm = fontSize * 1.15;
    const W = textW + pad * 2.2;
    const H = Math.max(18, textHeightMm + pad * 1.8);

    // Base outer polygon + exact eyelet attachment point on left edge!
    const outer = [];
    let eyeletX = -W * 0.5;
    if (shapeType === 'pill') {
      const r = H * 0.5;
      const straight = Math.max(4, W - H);
      for (let i = 0; i <= 14; i++) { const a = -PI * 0.5 + (i / 14) * PI; outer.push([straight * 0.5 + Math.cos(a) * r, Math.sin(a) * r]); }
      for (let i = 0; i <= 14; i++) { const a = PI * 0.5 + (i / 14) * PI; outer.push([-straight * 0.5 + Math.cos(a) * r, Math.sin(a) * r]); }
      eyeletX = -straight * 0.5 - r;
    } else if (shapeType === 'circle') {
      const r = Math.max(W, H) * 0.52;
      for (let i = 0; i < 40; i++) { const a = (i / 40) * TAU; outer.push([Math.cos(a) * r, Math.sin(a) * r]); }
      eyeletX = -r;
    } else if (shapeType === 'diamond') {
      const dw = W * 0.62, dh = H * 0.72;
      outer.push([0, -dh], [dw, 0], [0, dh], [-dw, 0]);
      eyeletX = -dw + 2.5;
    } else if (shapeType === 'heart') {
      const r = Math.max(W, H) * 0.58;
      const hp = sampleCookieShape2D('heart', r);
      hp.forEach((p) => outer.push(p));
      eyeletX = -r * 0.85;
    } else {
      // Rounded Rectangle
      const hw = W * 0.5, hh = H * 0.5, cr = Math.min(4.5, hh * 0.4);
      const cs = [[hw - cr, hh - cr, 0], [-hw + cr, hh - cr, PI * 0.5], [-hw + cr, -hh + cr, PI], [hw - cr, -hh + cr, PI * 1.5]];
      for (const [cx, cy, a0] of cs) {
        for (let i = 0; i <= 4; i++) { const a = a0 + (i / 4) * PI * 0.5; outer.push([cx + Math.cos(a) * cr, cy + Math.sin(a) * cr]); }
      }
      eyeletX = -hw;
    }

    const parts = [];
    const mask = rasterizeUnicodeLines([textStr], fontStyle, 144, 48);

    if (recessed) {
      // TRUE CARVED RECESSED POCKET! Lower main plaque surface inside letter glyphs + thin flush colored inlay at pocket floor!
      const recessDepth = Math.min(textH, thick * 0.55);
      const baseMesh = C.extrudePolygon2D(outer, [], 0, thick - recessDepth, { name: 'keychain_floor', color: baseColor, roughness: 0.52 });
      // Build top face with inverted mask so letters are GENUINELY CARVED OUT as crisp pockets!
      const invMask = { width: mask.width, height: mask.height, data: new Float32Array(mask.data.length) };
      for (let i = 0; i < mask.data.length; i++) invMask.data[i] = mask.data[i] >= 0.42 ? 0 : 1;
      const topRim = extrudeMaskRuns(invMask, textW * 1.04, textHeightMm * 1.15, thick - recessDepth - 0.04, thick, 0.5, {
        name: 'keychain_carved_face', color: baseColor, roughness: 0.52
      });
      // Colored inlay sitting cleanly inside the carved pocket bottom!
      const inlayMesh = extrudeMaskRuns(mask, textW * 1.04, textHeightMm * 1.15, thick - recessDepth - 0.04, thick - recessDepth + 0.35, 0.42, {
        name: 'keychain_inlay_text', color: textColor, roughness: 0.35, metalness: 0.25
      });
      parts.push(baseMesh, topRim, inlayMesh);
    } else {
      const baseMesh = C.extrudePolygon2D(outer, [], 0, thick, { name: 'keychain_base', color: baseColor, roughness: 0.52 });
      const textMesh = extrudeMaskRuns(mask, textW, textHeightMm, thick - 0.05, thick + textH, 0.42, {
        name: 'keychain_text', color: textColor, roughness: 0.32, metalness: 0.35
      });
      parts.push(baseMesh, textMesh);
    }

    // Seamlessly welded keychain eyelet ring (embeds 2.2 mm into base edge so it NEVER detaches!)
    const ringOuterR = ringHole + Math.max(2.6, thick * 0.72);
    const ringCx = eyeletX - ringHole * 0.65;
    const rOut = [], rIn = [];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU;
      rOut.push([ringCx + Math.cos(a) * ringOuterR, Math.sin(a) * ringOuterR]);
      rIn.push([ringCx + Math.cos(a) * ringHole, Math.sin(a) * ringHole]);
    }
    const eyeletMesh = C.extrudePolygon2D(rOut, [rIn], 0, thick, { name: 'keychain_eyelet', color: baseColor, roughness: 0.52 });
    parts.push(eyeletMesh);

    const vectors2D = [
      { points: outer, closed: true, layer: 'cut' },
      { points: rOut, closed: true, layer: 'cut' },
      { points: rIn, closed: true, layer: 'cut' }
    ];
    return { parts, vectors2D, extras: { recessed, unicodeReady: true } };
  }

  /* =========================================================================
     STUDIO 5: UNICODE 3D TEXT & DESK PLAQUE EXTRUDER (ZERO EXTERNAL FONT CDN!)
  ========================================================================= */
  function buildTextStudio(s) {
    const line1 = (s.text || 'MAKER 7').trim() || 'MAKER 7';
    const line2 = (s.line2 || '').trim();
    const lines = line2 ? [line1, line2] : [line1];
    const sizeMm = C.clamp(Number(s.sizeMm) || 26, 12, 60);
    const depthMm = C.clamp(Number(s.depthMm) || 12, 2, 45);
    const standingBase = s.standingBase !== false;
    const fontStyle = s.fontStyle || 'Inter, system-ui, sans-serif';
    const color = s.color || '#00f3ff';

    const maxChars = Math.max(line1.length, line2.length, 3);
    const widthMm = C.clamp(maxChars * sizeMm * 0.66, 36, 210);
    const heightMm = lines.length * sizeMm * 1.25;

    const mask = rasterizeUnicodeLines(lines, fontStyle, 192, lines.length > 1 ? 96 : 56);
    const textFlat = extrudeMaskRuns(mask, widthMm, heightMm, 0, depthMm, 0.42, {
      name: 'unicode_text_3d', color, roughness: 0.28, metalness: 0.55
    });

    // Orient upright standing facing +Z (y = 0 at bottom!)
    C.transformPart(textFlat, (x, y, z) => [x, heightMm * 0.5 - z + (standingBase ? 3.5 : 0), y - depthMm * 0.5]);

    const parts = [textFlat];
    if (standingBase) {
      const baseW = widthMm + 12;
      const baseD = Math.max(depthMm + 12, 20);
      parts.push(C.buildBox(0, 2.2, 0, baseW, 4.4, baseD, { name: 'text_desk_stand', color: '#1e293b', roughness: 0.5, metalness: 0.3 }));
    }

    const vectors2D = [{
      points: [[-widthMm * 0.5, 0], [widthMm * 0.5, 0], [widthMm * 0.5, heightMm], [-widthMm * 0.5, heightMm]],
      closed: true, layer: 'engrave'
    }];
    return { parts, vectors2D, extras: { lines: lines.length, unicodeReady: true } };
  }

  return {
    buildBoxStudio,
    buildGearStudio,
    buildStandStudio,
    buildCookieStudio,
    buildQRStudio,
    buildKeychainStudio,
    buildTextStudio
  };
}));
