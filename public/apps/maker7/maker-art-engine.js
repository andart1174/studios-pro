/**
 * Maker Studio 7 — Photo/Relief, PBR Texture Forge, Generative Art, Maze & G-Code Engine (10 Studios)
 * Studios: texture (PBR Forge), litho (Solid Lithophane), globe (Hollow Globe Lamp), topo (Stepped Topo),
 *          halftone (Dot-Art Plaque), vase (Pottery & Spiral Vase), mandala (3D Shadowbox Mandala),
 *          voronoi (True Euclidean Voronoi Lattice), maze (DFS Solvable + BFS Solver), gcode (Real Parser).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./maker-core.js'));
  } else {
    root.MakerArtEngine = factory(root.MakerCore);
  }
}(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';

  const PI = Math.PI;
  const TAU = Math.PI * 2;

  /* =========================================================================
     HELPER: BILINEAR IMAGE LUMINANCE SAMPLER (WORKS WITH UPLOADED PHOTO OR DEMO!)
  ========================================================================= */
  function sampleImageLuma(imgBuf, u, v, contrast) {
    let luma;
    if (imgBuf && imgBuf.data && imgBuf.width > 1 && imgBuf.height > 1) {
      const fx = C.clamp(u, 0, 1) * (imgBuf.width - 1);
      const fy = C.clamp(v, 0, 1) * (imgBuf.height - 1);
      const x0 = Math.floor(fx), y0 = Math.floor(fy);
      const x1 = Math.min(imgBuf.width - 1, x0 + 1), y1 = Math.min(imgBuf.height - 1, y0 + 1);
      const tx = fx - x0, ty = fy - y0;
      const lumAt = (x, y) => {
        const i = (y * imgBuf.width + x) * 4;
        return (0.299 * imgBuf.data[i] + 0.587 * imgBuf.data[i + 1] + 0.114 * imgBuf.data[i + 2]) / 255;
      };
      const top = lumAt(x0, y0) * (1 - tx) + lumAt(x1, y0) * tx;
      const bot = lumAt(x0, y1) * (1 - tx) + lumAt(x1, y1) * tx;
      luma = top * (1 - ty) + bot * ty;
    } else {
      // Rich procedural mountain/portrait-like relief wave when no photo uploaded yet!
      const dx = (u - 0.5) * 2, dy = (v - 0.5) * 2;
      const r = Math.hypot(dx, dy);
      const peaks = Math.exp(-r * r * 2.2) * 0.55
        + 0.25 * Math.sin(u * PI * 3.2) * Math.cos(v * PI * 2.6)
        + 0.15 * Math.sin((u + v) * PI * 5.0)
        + 0.35;
      luma = C.clamp(peaks, 0, 1);
    }
    const c = C.clamp(contrast || 1.0, 0.4, 3.0);
    return C.clamp(Math.pow(luma, c), 0, 1);
  }

  /* =========================================================================
     STUDIO 1: PBR TEXTURE FORGE (8 PROCEDURAL + PHOTO -> ALBEDO, SOBEL NORMAL, ROUGH, AO!)
  ========================================================================= */
  const PBR_PRESETS = [
    { id: 'brick',     en: 'Red Heritage Brick',  fr: 'Brique Rouge Ancienne' },
    { id: 'wood',      en: 'Natural Oak Planks',  fr: 'Chêne Naturel Veinage' },
    { id: 'carbon',    en: '3K Carbon Fiber',     fr: 'Fibre Carbone 3K' },
    { id: 'steel',     en: 'Brushed Steel Plate', fr: 'Acier Brossé Industriel' },
    { id: 'leather',   en: 'Aged Saddle Leather', fr: 'Cuir Grainé Vieilli' },
    { id: 'scifi_hex', en: 'Sci-Fi Hex Armor',    fr: 'Armure Hex Sci-Fi' },
    { id: 'cobble',    en: 'European Cobblestone',fr: 'Pavés Européens' },
    { id: 'marble',    en: 'Carrara Gold Marble', fr: 'Marbre Carrare Or' }
  ];

  function hash2(x, y) {
    const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return h - Math.floor(h);
  }
  function valueNoise2D(x, y, period) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const wrap = (n) => period ? (((n % period) + period) % period) : n;
    const a = hash2(wrap(xi), wrap(yi));
    const b = hash2(wrap(xi + 1), wrap(yi));
    const c = hash2(wrap(xi), wrap(yi + 1));
    const d = hash2(wrap(xi + 1), wrap(yi + 1));
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
  }
  function fbmTile(u, v, freq) {
    let sum = 0, amp = 0.5, f = freq;
    for (let o = 0; o < 4; o++) {
      sum += amp * valueNoise2D(u * f, v * f, f);
      f *= 2; amp *= 0.5;
    }
    return sum;
  }

  /**
   * Synthesizes 4 REAL seamless PBR maps (Albedo, Sobel Normal, Roughness, Height/AO) as Canvas objects!
   */
  function synthesizePBRMaps(presetId, imgBuf, normalStrength, baseRoughness) {
    if (typeof document === 'undefined' || !document.createElement) return null;
    const S = 256;
    const mk = () => { const c = document.createElement('canvas'); c.width = S; c.height = S; return c; };
    const cAlb = mk(), cNorm = mk(), cRough = mk(), cAo = mk();
    const ctxA = cAlb.getContext('2d'), ctxN = cNorm.getContext('2d'), ctxR = cRough.getContext('2d'), ctxO = cAo.getContext('2d');
    const imgA = ctxA.createImageData(S, S), imgN = ctxN.createImageData(S, S), imgR = ctxR.createImageData(S, S), imgO = ctxO.createImageData(S, S);
    const heightBuf = new Float32Array(S * S);

    const usePhoto = presetId === 'photo' && imgBuf && imgBuf.data;

    for (let y = 0; y < S; y++) {
      const v = y / S;
      for (let x = 0; x < S; x++) {
        const u = x / S;
        let r = 180, g = 180, b = 180, h = 0.5, rough = baseRoughness;

        if (usePhoto) {
          const sx = Math.floor(u * (imgBuf.width - 1));
          const sy = Math.floor(v * (imgBuf.height - 1));
          const si = (sy * imgBuf.width + sx) * 4;
          r = imgBuf.data[si]; g = imgBuf.data[si + 1]; b = imgBuf.data[si + 2];
          h = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          rough = C.clamp(baseRoughness + (0.5 - h) * 0.35, 0.08, 0.96);
        } else if (presetId === 'brick') {
          const rows = 8, cols = 4;
          const ry = v * rows, row = Math.floor(ry), fy = ry - row;
          const rx = u * cols + (row % 2) * 0.5, col = Math.floor(rx), fx = rx - col;
          const mortar = (fy < 0.10 || fx < 0.055);
          const n = fbmTile(u, v, 16);
          if (mortar) {
            h = 0.12 + n * 0.15; r = 175; g = 170; b = 162; rough = 0.92;
          } else {
            const vary = hash2(col % cols, row % rows);
            h = 0.72 + n * 0.25;
            r = 158 + vary * 42 + n * 18; g = 66 + vary * 24 + n * 12; b = 48 + vary * 18;
            rough = 0.74 - n * 0.12;
          }
        } else if (presetId === 'wood') {
          const plank = Math.floor(u * 4);
          const grain = Math.sin((u * 38 + fbmTile(u, v, 8) * 6.0) * PI) * 0.5 + 0.5;
          const seam = ((u * 4) % 1) < 0.025;
          const n = fbmTile(u, v, 12);
          h = seam ? 0.1 : (0.55 + grain * 0.28 + n * 0.14);
          const tone = 0.88 + hash2(plank, 3) * 0.22;
          r = (145 + grain * 45) * tone; g = (96 + grain * 34) * tone; b = (56 + grain * 22) * tone;
          if (seam) { r *= 0.35; g *= 0.35; b *= 0.35; }
          rough = seam ? 0.9 : C.clamp(0.45 + (1 - grain) * 0.28, 0.15, 0.9);
        } else if (presetId === 'carbon') {
          const cells = 24;
          const gx = (u * cells) % 2, gy = (v * cells) % 2;
          const diag = (Math.floor(u * cells) + Math.floor(v * cells)) % 2 === 0;
          const weave = diag ? Math.sin((gx % 1) * PI) : Math.sin((gy % 1) * PI);
          h = 0.35 + weave * 0.55;
          const shade = 26 + weave * 46;
          r = shade; g = shade + 3; b = shade + 8;
          rough = 0.22 + (1 - weave) * 0.24;
        } else if (presetId === 'steel') {
          const streak = fbmTile(u * 0.25, v * 4.0, 16);
          h = 0.45 + streak * 0.35;
          const s = 175 + streak * 45;
          r = s; g = s + 4; b = s + 10;
          rough = C.clamp(baseRoughness * 0.6 + (1 - streak) * 0.2, 0.1, 0.7);
        } else if (presetId === 'leather') {
          const n1 = fbmTile(u, v, 16), n2 = fbmTile(u, v, 32);
          const cell = Math.abs(Math.sin(n1 * 18) * Math.cos(n2 * 18));
          h = 0.35 + cell * 0.55;
          r = 102 + cell * 48; g = 56 + cell * 28; b = 34 + cell * 18;
          rough = 0.42 + (1 - cell) * 0.35;
        } else if (presetId === 'scifi_hex') {
          const hx = u * 8, hy = v * 8;
          const d = Math.min(Math.abs(((hx + hy * 0.5) % 1) - 0.5), Math.abs(((hy) % 1) - 0.5), Math.abs(((hx - hy * 0.5 + 8) % 1) - 0.5));
          const groove = d < 0.055;
          h = groove ? 0.15 : 0.82;
          r = groove ? 24 : 74; g = groove ? 180 : 94; b = groove ? 225 : 122;
          rough = groove ? 0.25 : 0.38;
        } else if (presetId === 'cobble') {
          const gN = 6;
          let minD = 9, secondD = 9;
          const px = u * gN, py = v * gN;
          const ix = Math.floor(px), iy = Math.floor(py);
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const cx = ((ix + dx) % gN + gN) % gN, cy = ((iy + dy) % gN + gN) % gN;
            const sx = ix + dx + 0.15 + hash2(cx, cy) * 0.7;
            const sy = iy + dy + 0.15 + hash2(cx + 13, cy + 7) * 0.7;
            const d = Math.hypot(px - sx, py - sy);
            if (d < minD) { secondD = minD; minD = d; } else if (d < secondD) secondD = d;
          }
          const edge = secondD - minD;
          const n = fbmTile(u, v, 16);
          h = C.clamp(edge * 2.2, 0, 1) * 0.78 + n * 0.22;
          const stone = edge < 0.08 ? 65 : (125 + n * 55);
          r = stone; g = stone - 2; b = stone - 5;
          rough = edge < 0.08 ? 0.92 : 0.65;
        } else { // marble
          const turb = fbmTile(u, v, 6) * 4.5;
          const vein = Math.pow(Math.abs(Math.sin((u * 3 + v * 2 + turb) * PI)), 0.28);
          h = 0.65 + vein * 0.25;
          const isGold = vein < 0.35;
          r = isGold ? 195 : (225 + vein * 28);
          g = isGold ? 162 : (224 + vein * 28);
          b = isGold ? 105 : (222 + vein * 28);
          rough = isGold ? 0.28 : 0.14;
        }

        const idx = (y * S + x) * 4;
        heightBuf[y * S + x] = h;
        imgA.data[idx] = C.clamp(r, 0, 255); imgA.data[idx + 1] = C.clamp(g, 0, 255); imgA.data[idx + 2] = C.clamp(b, 0, 255); imgA.data[idx + 3] = 255;
        const rv = C.clamp(Math.round(rough * 255), 0, 255);
        imgR.data[idx] = rv; imgR.data[idx + 1] = rv; imgR.data[idx + 2] = rv; imgR.data[idx + 3] = 255;
        const ov = C.clamp(Math.round((0.35 + h * 0.65) * 255), 0, 255);
        imgO.data[idx] = ov; imgO.data[idx + 1] = ov; imgO.data[idx + 2] = ov; imgO.data[idx + 3] = 255;
      }
    }

    // TRUE Sobel 3x3 Seamless Tangent-Space Normal Map!
    const str = C.clamp(Number(normalStrength) || 1.4, 0, 5) * 2.6;
    const hAt = (x, y) => heightBuf[((y + S) % S) * S + ((x + S) % S)];
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const tl = hAt(x - 1, y - 1), t = hAt(x, y - 1), tr = hAt(x + 1, y - 1);
        const l = hAt(x - 1, y),                          r = hAt(x + 1, y);
        const bl = hAt(x - 1, y + 1), b = hAt(x, y + 1), br = hAt(x + 1, y + 1);
        const dx = (tr + 2 * r + br - tl - 2 * l - bl) * str;
        const dy = (bl + 2 * b + br - tl - 2 * t - tr) * str;
        let nx = -dx, ny = -dy, nz = 1.0;
        const len = Math.hypot(nx, ny, nz) || 1;
        nx /= len; ny /= len; nz /= len;
        const idx = (y * S + x) * 4;
        imgN.data[idx] = Math.round((nx * 0.5 + 0.5) * 255);
        imgN.data[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
        imgN.data[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
        imgN.data[idx + 3] = 255;
      }
    }

    ctxA.putImageData(imgA, 0, 0);
    ctxN.putImageData(imgN, 0, 0);
    ctxR.putImageData(imgR, 0, 0);
    ctxO.putImageData(imgO, 0, 0);
    return { albedo: cAlb, normal: cNorm, roughness: cRough, ao: cAo };
  }

  function buildTextureStudio(s, imgBuf) {
    const shape = s.previewShape || 'sphere';
    const preset = s.preset || 'brick';
    const roughness = C.clamp(Number(s.roughness) || 0.45, 0.05, 1.0);
    const normalDepth = C.clamp(Number(s.normalDepth) || 1.5, 0, 4.0);
    const repeat = C.clamp(Number(s.repeat) || 2, 1, 6);
    const color = s.color || '#ffffff';

    const pbrMaps = synthesizePBRMaps(preset, imgBuf, normalDepth, roughness);
    let mesh;
    if (shape === 'cube') {
      mesh = C.buildBox(0, 40, 0, 80, 80, 80, { name: 'pbr_cube', color, roughness, metalness: preset === 'steel' ? 0.85 : 0.15, pbrMaps, pbrRepeat: repeat, normalDepth });
    } else if (shape === 'cylinder') {
      mesh = C.buildPrismY(0, 0, 88, 0, 40, 48, 0, { name: 'pbr_cylinder', color, roughness, metalness: preset === 'steel' ? 0.85 : 0.15, pbrMaps, pbrRepeat: repeat, normalDepth });
    } else if (shape === 'plane') {
      mesh = C.buildBox(0, 3, 0, 120, 6, 120, { name: 'pbr_tile', color, roughness, metalness: preset === 'steel' ? 0.85 : 0.15, pbrMaps, pbrRepeat: repeat, normalDepth });
    } else {
      // Watertight high-res UV-friendly sphere
      const segU = 48, segV = 28, R = 48;
      const rings = [];
      for (let v = 1; v < segV; v++) {
        const phi = (v / segV) * PI;
        const r = Math.sin(phi) * R, y = 48 + Math.cos(phi) * R;
        const ring = [];
        for (let u = 0; u < segU; u++) {
          const a = (u / segU) * TAU;
          ring.push([Math.cos(a) * r, y, Math.sin(a) * r]);
        }
        rings.push(ring);
      }
      mesh = C.buildClosedRevolution(segU, rings.reverse(), [0, 0, 0], [0, 96, 0], {
        name: 'pbr_sphere', color, roughness, metalness: preset === 'steel' ? 0.85 : 0.15, pbrMaps, pbrRepeat: repeat, normalDepth
      });
    }
    return { parts: [mesh], vectors2D: [], extras: { pbrMaps, preset } };
  }

  /* =========================================================================
     STUDIO 2: WATERTIGHT SOLID LITHOPHANE (RESPECTS BASE LAYER + FRAME + CURVED!)
  ========================================================================= */
  function buildLithoStudio(s, imgBuf) {
    const widthMm = C.clamp(Number(s.widthMm) || 120, 40, 220);
    const heightMm = Math.round(widthMm * 0.75);
    const maxThick = C.clamp(Number(s.maxThick) || 3.4, 1.4, 8.0);
    const baseLayer = C.clamp(Number(s.baseLayer) || 0.8, 0.4, 2.5);
    const contrast = C.clamp(Number(s.contrast) || 1.1, 0.5, 2.5);
    const invert = !!s.invert;
    const curved = !!s.curved;
    const frameMm = C.clamp(Number(s.frameMm) || 4.0, 0, 12);
    const res = C.clamp(Math.round(Number(s.resolution) || 72), 36, 128);
    const color = s.color || '#f8fafc';

    const rows = Math.round(res * 0.75);
    const block = C.buildSolidHeightfieldY(res, rows, widthMm, heightMm, (u, v) => {
      const fx = u * widthMm, fy = v * heightMm;
      const onFrame = frameMm > 0 && (fx < frameMm || fx > widthMm - frameMm || fy < frameMm || fy > heightMm - frameMm);
      if (onFrame) return maxThick + 0.6;
      const lum = sampleImageLuma(imgBuf, u, v, contrast);
      const rel = invert ? lum : (1.0 - lum);
      return baseLayer + rel * Math.max(0.4, maxThick - baseLayer);
    }, { name: 'lithophane_solid', color, roughness: 0.35, metalness: 0.02 });

    // Stand upright facing +Z (optionally curved gently at 110° arc for self-standing desk display!)
    if (curved) {
      const arcRad = (110 * PI) / 180;
      const R = widthMm / arcRad;
      C.transformPart(block, (x, y, z) => {
        const a = (x / widthMm) * arcRad;
        const rad = R + y;
        return [Math.sin(a) * rad, heightMm * 0.5 - z, Math.cos(a) * rad - R];
      });
    } else {
      C.transformPart(block, (x, y, z) => [x, heightMm * 0.5 - z, y]);
    }

    return { parts: [block], vectors2D: [{ points: [[-widthMm * 0.5, 0], [widthMm * 0.5, 0], [widthMm * 0.5, heightMm], [-widthMm * 0.5, heightMm]], closed: true, layer: 'cut' }] };
  }

  /* =========================================================================
     STUDIO 10: HOLLOW MOON / PHOTO GLOBE LAMP (REAL CAVITY + LED SOCKET HOLE!)
  ========================================================================= */
  function buildGlobeStudio(s, imgBuf) {
    const diam = C.clamp(Number(s.diameterMm) || 110, 50, 200);
    const R = diam * 0.5;
    const wall = C.clamp(Number(s.wallThick) || 2.2, 1.2, 5.0);
    const relief = C.clamp(Number(s.reliefDepth) || 2.4, 0.5, 6.0);
    const socketDiam = C.clamp(Number(s.socketHoleMm) || 34, 16, diam * 0.55);
    const invert = !!s.invert;
    const res = C.clamp(Math.round(Number(s.resolution) || 56), 28, 96);
    const color = s.color || '#fefce8';

    const segU = res;
    const segV = Math.round(res * 0.6);
    // Socket opening starts at bottom latitude thetaBot where R * sin(thetaBot) = socketDiam/2
    const sinBot = C.clamp((socketDiam * 0.5) / R, 0.15, 0.72);
    const thetaBot = Math.asin(sinBot); // angle from south pole (0..PI)

    // Closed hollow torus-like revolution: bottom socket lip -> outer sphere up to north pole -> inner sphere down to socket lip!
    // Actually use buildClosedRevolution with bottomPole = inner north pole and topPole = outer north pole?
    // Even cleaner: closed ring loop sweeping outer (south lip -> north) + inner (north -> south lip) — wait, north pole is closed!
    // So traverse: outer north pole (topPole) -> outer rings (v=1..segV) -> bottom lip -> inner rings (v=segV..1) -> inner north pole (bottomPole)!
    const rings = [];
    // Inner shell from inner north pole down to socket lip (bottomPole = [0, R + (R - wall), 0] inside!)
    for (let v = 1; v <= segV; v++) {
      const phi = (v / segV) * (PI - thetaBot); // 0 at north pole .. (PI - thetaBot) at socket lip
      const rIn = R - wall;
      const ring = [];
      for (let u = 0; u < segU; u++) {
        const a = (u / segU) * TAU;
        ring.push([Math.cos(a) * Math.sin(phi) * rIn, R + Math.cos(phi) * rIn, Math.sin(a) * Math.sin(phi) * rIn]);
      }
      rings.push(ring);
    }
    // Outer shell from socket lip back up to outer north pole!
    for (let v = segV; v >= 1; v--) {
      const phi = (v / segV) * (PI - thetaBot);
      const vf = phi / PI;
      const ring = [];
      for (let u = 0; u < segU; u++) {
        const uf = u / segU;
        const a = uf * TAU;
        const lum = sampleImageLuma(imgBuf, uf, vf, 1.15);
        const rel = invert ? lum : (1.0 - lum);
        // Smooth fade relief near socket lip for clean flat seating
        const lipFade = C.clamp((segV - v) / 3, 0, 1);
        const rOut = R + rel * relief * lipFade;
        ring.push([Math.cos(a) * Math.sin(phi) * rOut, R + Math.cos(phi) * rOut, Math.sin(a) * Math.sin(phi) * rOut]);
      }
      rings.push(ring);
    }

    const globe = C.buildClosedRevolution(
      segU,
      rings,
      [0, R + (R - wall), 0], // inner north pole
      [0, R + R, 0],          // outer north pole
      { name: 'hollow_globe_lamp', color, roughness: 0.36, metalness: 0.02 }
    );
    return { parts: [globe], vectors2D: [], extras: { socketDiam, hollow: true } };
  }

  /* =========================================================================
     STUDIO 11: WATERTIGHT STEPPED TOPOGRAPHY + LASER STACKING CONTOURS
  ========================================================================= */
  function buildTopoStudio(s, imgBuf) {
    const widthMm = C.clamp(Number(s.widthMm) || 140, 50, 220);
    const depthMm = Math.round(widthMm * 0.75);
    const maxH = C.clamp(Number(s.maxHeight) || 26, 4, 80);
    const baseMm = C.clamp(Number(s.baseMm) || 3.0, 1.2, 12);
    const steps = C.clamp(Math.round(Number(s.steps) || 9), 2, 24);
    const invert = !!s.invert;
    const res = C.clamp(Math.round(Number(s.resolution) || 72), 36, 120);
    const color = s.color || '#8b5cf6';

    const rows = Math.round(res * 0.75);
    const topoMesh = C.buildSolidHeightfieldY(res, rows, widthMm, depthMm, (u, v) => {
      const lum = sampleImageLuma(imgBuf, u, v, 1.0);
      const raw = invert ? (1.0 - lum) : lum;
      const stepped = Math.floor(raw * steps) / Math.max(1, steps - 1);
      return baseMm + C.clamp(stepped, 0, 1) * maxH;
    }, { name: 'stepped_topography', color, roughness: 0.72, flatShaded: true });

    // Generate clean laser-cuttable contour rings at each terrace altitude via marching-squares segments
    const vectors2D = [{
      points: [[-widthMm * 0.5, -depthMm * 0.5], [widthMm * 0.5, -depthMm * 0.5], [widthMm * 0.5, depthMm * 0.5], [-widthMm * 0.5, depthMm * 0.5]],
      closed: true, layer: 'cut'
    }];
    const cN = 36, rN = 28;
    const grid = [];
    for (let r = 0; r <= rN; r++) {
      const row = [];
      for (let c = 0; c <= cN; c++) {
        const lum = sampleImageLuma(imgBuf, c / cN, r / rN, 1.0);
        row.push(invert ? (1.0 - lum) : lum);
      }
      grid.push(row);
    }
    for (let st = 1; st < steps; st++) {
      const iso = st / steps;
      for (let r = 0; r < rN; r++) {
        for (let c = 0; c < cN; c++) {
          const v00 = grid[r][c], v10 = grid[r][c + 1], v11 = grid[r + 1][c + 1], v01 = grid[r + 1][c];
          const x0 = (c / cN - 0.5) * widthMm, x1 = ((c + 1) / cN - 0.5) * widthMm;
          const y0 = (0.5 - r / rN) * depthMm, y1 = (0.5 - (r + 1) / rN) * depthMm;
          const pts = [];
          const interp = (a, b, va, vb) => {
            if ((va < iso) !== (vb < iso)) {
              const t = (iso - va) / ((vb - va) || 1e-6);
              pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
            }
          };
          interp([x0, y0], [x1, y0], v00, v10);
          interp([x1, y0], [x1, y1], v10, v11);
          interp([x1, y1], [x0, y1], v11, v01);
          interp([x0, y1], [x0, y0], v01, v00);
          if (pts.length >= 2) vectors2D.push({ points: [pts[0], pts[1]], closed: false, layer: 'engrave' });
        }
      }
    }

    return { parts: [topoMesh], vectors2D };
  }

  /* =========================================================================
     STUDIO 4: HALFTONE DOT-ART PLAQUE (MERGED WATERTIGHT STL + SOLID BACKING!)
  ========================================================================= */
  function buildHalftoneStudio(s, imgBuf) {
    const widthMm = C.clamp(Number(s.widthMm) || 140, 60, 220);
    const heightMm = Math.round(widthMm * 0.75);
    const spacing = C.clamp(Number(s.spacingMm) || 7.5, 4.0, 18.0);
    const maxDot = C.clamp(Number(s.maxDotMm) || 6.4, 1.5, spacing * 0.96);
    const dotH = C.clamp(Number(s.dotHeight) || 3.5, 0.8, 16.0);
    const baseT = C.clamp(Number(s.baseThick) || 2.4, 1.2, 8.0);
    const invert = !!s.invert;
    const dotShape = s.dotShape || 'circle'; // circle | square | hex
    const color = s.color || '#38bdf8';
    const baseColor = s.baseColor || '#0f172a';

    const basePlate = C.buildBox(0, baseT * 0.5, 0, widthMm, baseT, heightMm, { name: 'halftone_base', color: baseColor, roughness: 0.7 });
    const cols = Math.floor((widthMm - spacing) / spacing);
    const rows = Math.floor((heightMm - spacing) / spacing);
    const sides = dotShape === 'square' ? 4 : (dotShape === 'hex' ? 6 : 12);
    const rotOff = dotShape === 'square' ? PI * 0.25 : 0;

    const dotParts = [];
    const vectors2D = [{
      points: [[-widthMm * 0.5, -heightMm * 0.5], [widthMm * 0.5, -heightMm * 0.5], [widthMm * 0.5, heightMm * 0.5], [-widthMm * 0.5, heightMm * 0.5]],
      closed: true, layer: 'cut'
    }];

    for (let r = 0; r < rows; r++) {
      const v = (r + 0.5) / rows;
      const cz = (v - 0.5) * (rows * spacing);
      for (let c = 0; c < cols; c++) {
        const u = (c + 0.5) / cols;
        const cx = (u - 0.5) * (cols * spacing);
        const lum = sampleImageLuma(imgBuf, u, v, 1.15);
        const val = invert ? (1.0 - lum) : lum;
        const rad = val * (maxDot * 0.5);
        if (rad < 0.45) continue;
        const h = Math.max(0.6, val * dotH);
        dotParts.push(C.buildPrismY(cx, baseT - 0.05, baseT + h, cz, rad, sides, rotOff, { color }));
        // 2D SVG dot
        const ring2d = [];
        for (let k = 0; k < sides; k++) {
          const a = (k / sides) * TAU + rotOff;
          ring2d.push([cx + Math.cos(a) * rad, -cz + Math.sin(a) * rad]);
        }
        vectors2D.push({ points: ring2d, closed: true, layer: 'engrave' });
      }
    }

    const parts = [basePlate];
    if (dotParts.length > 0) parts.push(C.mergeParts(dotParts, { name: 'halftone_dots', color, roughness: 0.35, metalness: 0.25 }));
    return { parts, vectors2D, extras: { dotCount: dotParts.length } };
  }

  /* =========================================================================
     STUDIO 8: WATERTIGHT POTTERY & SPIRAL FLUTED VASE (UPRIGHT + REAL WALL!)
  ========================================================================= */
  function buildVaseStudio(s) {
    const H = C.clamp(Number(s.heightMm) || 125, 40, 240);
    const baseR = C.clamp(Number(s.baseR) || 28, 12, 80);
    const bellyR = C.clamp(Number(s.bellyR) || 46, 15, 100);
    const neckR = C.clamp(Number(s.neckR) || 22, 10, 80);
    const rimR = C.clamp(Number(s.rimR) || 27, 10, 85);
    const wall = C.clamp(Number(s.wallThick) || 3.2, 1.6, 8.0);
    const twistDeg = C.clamp(Number(s.twistDeg) || 90, -360, 360);
    const flutes = C.clamp(Math.round(Number(s.flutes) || 16), 0, 48);
    const fluteDepth = C.clamp(Number(s.fluteDepth) || 2.2, 0, 8.0);
    const segU = C.clamp(Math.round(Number(s.sides) || 72), 16, 128);
    const color = s.color || '#14b8a6';

    const steps = 42;
    function outerRadiusAt(t) {
      if (t < 0.35) {
        const u = t / 0.35;
        return baseR + (bellyR - baseR) * (0.5 - 0.5 * Math.cos(u * PI));
      } else if (t < 0.80) {
        const u = (t - 0.35) / 0.45;
        return bellyR + (neckR - bellyR) * (0.5 - 0.5 * Math.cos(u * PI));
      } else {
        const u = (t - 0.80) / 0.20;
        return neckR + (rimR - neckR) * (u * u);
      }
    }

    const rings = [];
    const twistRad = (twistDeg * PI) / 180;
    const profile2D = [];

    // 1. Outer wall from bottom base (y=0) up to top rim (y=H)
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const y = t * H;
      const rBase = outerRadiusAt(t);
      profile2D.push([rBase, y]);
      const fluteEnv = Math.sin(t * PI); // Smooth fade at base & rim!
      const ring = [];
      for (let u = 0; u < segU; u++) {
        const a = (u / segU) * TAU;
        const rib = (flutes > 0) ? Math.cos(a * flutes + t * twistRad) * fluteDepth * fluteEnv : 0;
        const r = Math.max(wall + 2, rBase + rib);
        ring.push([Math.cos(a) * r, y, Math.sin(a) * r]);
      }
      rings.push(ring);
    }

    // 2. Smooth rounded rim lip turning inward
    const rRimOut = outerRadiusAt(1);
    const rRimIn = Math.max(4, rRimOut - wall);
    const lipRing = [];
    for (let u = 0; u < segU; u++) {
      const a = (u / segU) * TAU;
      const rMid = (rRimOut + rRimIn) * 0.5;
      lipRing.push([Math.cos(a) * rMid, H + wall * 0.32, Math.sin(a) * rMid]);
    }
    rings.push(lipRing);

    // 3. Inner watertight cavity wall going from top rim down to solid inner floor (y = wall * 1.4)!
    const floorY = wall * 1.4;
    const innerSteps = 22;
    for (let i = innerSteps; i >= 0; i--) {
      const f = i / innerSteps;
      const y = floorY + f * (H - floorY);
      const t = y / H;
      const rIn = Math.max(4, outerRadiusAt(t) - wall);
      const ring = [];
      for (let u = 0; u < segU; u++) {
        const a = (u / segU) * TAU;
        ring.push([Math.cos(a) * rIn, y, Math.sin(a) * rIn]);
      }
      rings.push(ring);
    }

    const vase = C.buildClosedRevolution(segU, rings, [0, 0, 0], [0, floorY, 0], {
      name: 'pottery_vase_solid', color, roughness: 0.32, metalness: 0.08
    });

    const sil2D = profile2D.concat(profile2D.slice().reverse().map(([r, y]) => [-r, y]));
    return { parts: [vase], vectors2D: [{ points: sil2D, closed: true, layer: 'cut' }] };
  }

  /* =========================================================================
     STUDIO 6: 3D SOLID SHADOWBOX MANDALA (+ COMPLETE MULTI-LAYER LASER SVG/DXF!)
  ========================================================================= */
  function buildMandalaStudio(s) {
    const sym = C.clamp(Math.round(Number(s.symmetry) || 10), 4, 24);
    const layers = C.clamp(Math.round(Number(s.layers) || 4), 2, 7);
    const radius = C.clamp(Number(s.radiusMm) || 75, 30, 120);
    const layerT = C.clamp(Number(s.layerThick) || 2.0, 1.0, 5.0);
    const strokeW = C.clamp(Number(s.strokeW) || 2.6, 1.2, 6.0);
    const shapes = (Array.isArray(s.shapes) && s.shapes.length) ? s.shapes : ['star', 'flower', 'circle'];
    const baseCol = s.color || '#c026d3';

    const layerColors = [baseCol, '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];
    const parts = [];
    const vectors2D = [];

    // Solid circular base plate so every stacked mandala tier prints as ONE unified solid!
    const baseDisc = C.buildPrismY(0, 0, layerT, 0, radius + strokeW * 0.8, 64, 0, {
      name: 'mandala_backing', color: '#1e293b', roughness: 0.65
    });
    parts.push(baseDisc);

    // Outer frame circle for laser SVG
    const outerPts = [];
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * TAU;
      outerPts.push([Math.cos(a) * (radius + strokeW * 0.8), Math.sin(a) * (radius + strokeW * 0.8)]);
    }
    vectors2D.push({ points: outerPts, closed: true, layer: 'cut' });

    for (let l = 1; l <= layers; l++) {
      const r = radius * (1.0 - (l - 1) / (layers + 0.5));
      const y0 = l * layerT - 0.08;
      const y1 = (l + 1) * layerT;
      const col = layerColors[(l - 1) % layerColors.length];
      const tierParts = [];

      // Connecting structural ring on every tier
      const ringPts = [];
      for (let i = 0; i < 48; i++) { const a = (i / 48) * TAU; ringPts.push([Math.cos(a) * r, Math.sin(a) * r]); }
      tierParts.push(C.buildClosedRibbon2D(ringPts, strokeW * 0.48, y0, y1, { color: col }));
      vectors2D.push({ points: ringPts, closed: true, layer: 'cut' });

      const activeShape = shapes[(l - 1) % shapes.length];
      if (activeShape === 'star') {
        const pts = [];
        for (let i = 0; i < sym * 2; i++) {
          const a = (i / (sym * 2)) * TAU;
          const dist = (i % 2 === 0) ? r : r * 0.52;
          pts.push([Math.cos(a) * dist, Math.sin(a) * dist]);
        }
        tierParts.push(C.buildClosedRibbon2D(pts, strokeW * 0.5, y0, y1, { color: col }));
        vectors2D.push({ points: pts, closed: true, layer: 'cut' });
      } else if (activeShape === 'flower') {
        const pts = [];
        const steps = sym * 8;
        for (let i = 0; i < steps; i++) {
          const a = (i / steps) * TAU;
          const dist = r * (0.64 + 0.34 * Math.cos(sym * a));
          pts.push([Math.cos(a) * dist, Math.sin(a) * dist]);
        }
        tierParts.push(C.buildClosedRibbon2D(pts, strokeW * 0.5, y0, y1, { color: col }));
        vectors2D.push({ points: pts, closed: true, layer: 'cut' });
      } else if (activeShape === 'hexa' || activeShape === 'square' || activeShape === 'circle') {
        const sides = activeShape === 'hexa' ? 6 : (activeShape === 'square' ? 4 : 16);
        const subR = r * 0.24;
        for (let k = 0; k < sym; k++) {
          const a = (k / sym) * TAU;
          const cx = Math.cos(a) * r * 0.72, cy = Math.sin(a) * r * 0.72;
          const pts = [];
          for (let j = 0; j < sides; j++) {
            const ja = (j / sides) * TAU + a;
            pts.push([cx + Math.cos(ja) * subR, cy + Math.sin(ja) * subR]);
          }
          tierParts.push(C.buildClosedRibbon2D(pts, strokeW * 0.42, y0, y1, { color: col }));
          vectors2D.push({ points: pts, closed: true, layer: 'cut' });
        }
      } else if (activeShape === 'spiral') {
        // Radial curved spiral spokes welded from center to outer ring!
        for (let k = 0; k < sym; k++) {
          const a0 = (k / sym) * TAU;
          let prev = [0, 0];
          const path2d = [[0, 0]];
          for (let st = 1; st <= 10; st++) {
            const f = st / 10;
            const ang = a0 + f * 1.15;
            const cur = [Math.cos(ang) * r * f, Math.sin(ang) * r * f];
            const seg = C.buildWallSegment(prev[0], -prev[1], cur[0], -cur[1], strokeW * 0.85, y0, y1, { color: col });
            if (seg) tierParts.push(seg);
            path2d.push(cur);
            prev = cur;
          }
          vectors2D.push({ points: path2d, closed: false, layer: 'engrave' });
        }
      }

      parts.push(C.mergeParts(tierParts.filter(Boolean), { name: 'mandala_tier_' + l, color: col, roughness: 0.42 }));
    }

    // Center lotus jewel boss
    parts.push(C.buildPrismY(0, 0, (layers + 1.4) * layerT, 0, Math.max(4, radius * 0.10), 24, 0, {
      name: 'mandala_center', color: '#facc15', roughness: 0.3, metalness: 0.4
    }));

    return { parts, vectors2D };
  }

  /* =========================================================================
     STUDIO 12: TRUE 2D EUCLIDEAN VORONOI BIO-LATTICE (HALF-PLANE CLIPPED + SOLID FRAME!)
  ========================================================================= */
  function clipPolygonHalfPlane(poly, px, py, nx, ny) {
    // Keeps points (x,y) where (x - px)*nx + (y - py)*ny <= 0
    if (!poly || poly.length < 3) return [];
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const da = (a[0] - px) * nx + (a[1] - py) * ny;
      const db = (b[0] - px) * nx + (b[1] - py) * ny;
      const inA = da <= 1e-6, inB = db <= 1e-6;
      if (inA && inB) out.push(b);
      else if (inA && !inB) {
        const t = da / ((da - db) || 1e-9);
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      } else if (!inA && inB) {
        const t = da / ((da - db) || 1e-9);
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], b);
      }
    }
    return out;
  }

  function buildVoronoiStudio(s) {
    const W = C.clamp(Number(s.widthMm) || 130, 50, 220);
    const H = C.clamp(Number(s.heightMm) || 100, 50, 220);
    const cellCount = C.clamp(Math.round(Number(s.cellCount) || 26), 8, 64);
    const wallT = C.clamp(Number(s.wallThick) || 3.2, 1.5, 8.0);
    const depth = C.clamp(Number(s.depthMm) || 6.0, 2.0, 24.0);
    const frameW = C.clamp(Number(s.frameMm) || 5.0, 2.5, 14.0);
    const seed = Math.round(Number(s.seed) || 42);
    const jitter = C.clamp(Number(s.jitter) || 0.72, 0.1, 1.0);
    const color = s.color || '#e2e8f0';

    const rng = C.mulberry32(seed);
    const hw = W * 0.5, hh = H * 0.5;
    const inW = W - frameW * 2, inH = H - frameW * 2;

    // Stratified jittered seeds inside interior box (clean organic Voronoi distribution!)
    const cols = Math.max(2, Math.round(Math.sqrt(cellCount * (inW / inH))));
    const rows = Math.max(2, Math.round(cellCount / cols));
    const seeds = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = ((c + 0.5 + (rng() - 0.5) * jitter * 0.85) / cols - 0.5) * inW;
        const cy = ((r + 0.5 + (rng() - 0.5) * jitter * 0.85) / rows - 0.5) * inH;
        seeds.push([cx, cy]);
      }
    }

    // Compute TRUE Voronoi cell polygons via Sutherland-Hodgman perpendicular bisector clipping!
    const baseBox = [[-inW * 0.5, -inH * 0.5], [inW * 0.5, -inH * 0.5], [inW * 0.5, inH * 0.5], [-inW * 0.5, inH * 0.5]];
    const edgeSet = new Map();
    const vectors2D = [
      { points: [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]], closed: true, layer: 'cut' }
    ];
    const quantKey = (a, b) => {
      const k1 = `${Math.round(a[0] * 10)},${Math.round(a[1] * 10)}`;
      const k2 = `${Math.round(b[0] * 10)},${Math.round(b[1] * 10)}`;
      return k1 < k2 ? (k1 + '|' + k2) : (k2 + '|' + k1);
    };

    for (let i = 0; i < seeds.length; i++) {
      let poly = baseBox;
      const sx = seeds[i][0], sy = seeds[i][1];
      for (let j = 0; j < seeds.length; j++) {
        if (i === j) continue;
        const mx = (sx + seeds[j][0]) * 0.5, my = (sy + seeds[j][1]) * 0.5;
        const nx = seeds[j][0] - sx, ny = seeds[j][1] - sy;
        poly = clipPolygonHalfPlane(poly, mx, my, nx, ny);
        if (poly.length < 3) break;
      }
      if (poly.length >= 3) {
        // Inset cell slightly for clean laser cut aperture in SVG
        let cx = 0, cy = 0;
        poly.forEach((p) => { cx += p[0]; cy += p[1]; });
        cx /= poly.length; cy /= poly.length;
        const shrunk = poly.map(([x, y]) => {
          const dx = x - cx, dy = y - cy, l = Math.hypot(dx, dy) || 1;
          const sFac = Math.max(0.2, (l - wallT * 0.55) / l);
          return [cx + dx * sFac, cy + dy * sFac];
        });
        vectors2D.push({ points: shrunk, closed: true, layer: 'cut' });

        for (let e = 0; e < poly.length; e++) {
          const a = poly[e], b = poly[(e + 1) % poly.length];
          if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.6) continue;
          const key = quantKey(a, b);
          if (!edgeSet.has(key)) edgeSet.set(key, [a, b]);
        }
      }
    }

    // Build 100% WATERTIGHT solid outer frame + merged Voronoi wall struts!
    const solidBars = [
      C.buildBox(0, depth * 0.5, -hh + frameW * 0.5, W, depth, frameW, { color }),
      C.buildBox(0, depth * 0.5,  hh - frameW * 0.5, W, depth, frameW, { color }),
      C.buildBox(-hw + frameW * 0.5, depth * 0.5, 0, frameW, depth, H - frameW * 1.9, { color }),
      C.buildBox( hw - frameW * 0.5, depth * 0.5, 0, frameW, depth, H - frameW * 1.9, { color })
    ];
    edgeSet.forEach(([a, b]) => {
      const seg = C.buildWallSegment(a[0], -a[1], b[0], -b[1], wallT, 0, depth, { color });
      if (seg) solidBars.push(seg);
    });

    const lattice = C.mergeParts(solidBars, { name: 'voronoi_lattice', color, roughness: 0.48, flatShaded: true });
    return { parts: [lattice], vectors2D, extras: { cells: seeds.length, struts: edgeSet.size } };
  }

  /* =========================================================================
     STUDIO 16: GUARANTEED-SOLVABLE 3D LABYRINTH MAZE (DFS BACKTRACKER + BFS SOLVER!)
  ========================================================================= */
  function buildMazeStudio(s) {
    const N = C.clamp(Math.round(Number(s.gridSize) || 11), 5, 25);
    const sizeMm = C.clamp(Number(s.sizeMm) || 110, 55, 200);
    const wallH = C.clamp(Number(s.wallHeight) || 10, 3, 28);
    const wallT = C.clamp(Number(s.wallThick) || 2.0, 1.2, 4.5);
    const baseT = C.clamp(Number(s.baseThick) || 2.2, 1.2, 6.0);
    const shape = s.shape || 'square'; // 'square' | 'circle'
    const seed = Math.round(Number(s.seed) || 77);
    const showSolution = !!s.showSolution;
    const color = s.color || '#f59e0b';
    const floorColor = s.floorColor || '#1e293b';

    const rng = C.mulberry32(seed);
    // Perfect Maze Grid: N × N cells; walls: hWalls[r][c] (horizontal top of cell r,c), vWalls[r][c] (left of cell r,c)
    const hWalls = Array.from({ length: N + 1 }, () => Array(N).fill(true));
    const vWalls = Array.from({ length: N }, () => Array(N + 1).fill(true));
    const visited = Array.from({ length: N }, () => Array(N).fill(false));

    // Recursive Backtracker (Iterative stack DFS) — 100% spanning tree -> GUARANTEED SOLVABLE!
    const stack = [[0, 0]];
    visited[0][0] = true;
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    while (stack.length > 0) {
      const [r, c] = stack[stack.length - 1];
      const neighbors = [];
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < N && nc >= 0 && nc < N && !visited[nr][nc]) neighbors.push([nr, nc, dr, dc]);
      }
      if (neighbors.length === 0) {
        stack.pop();
      } else {
        const [nr, nc, dr, dc] = neighbors[Math.floor(rng() * neighbors.length)];
        if (dr === -1) hWalls[r][c] = false;
        else if (dr === 1) hWalls[r + 1][c] = false;
        else if (dc === -1) vWalls[r][c] = false;
        else if (dc === 1) vWalls[r][c + 1] = false;
        visited[nr][nc] = true;
        stack.push([nr, nc]);
      }
    }

    // Open Entrance (top-left) and Exit (bottom-right)
    hWalls[0][0] = false;
    hWalls[N][N - 1] = false;

    // Exact BFS Shortest-Path Verification from (0,0) -> (N-1, N-1)!
    const prevMap = new Map();
    const q = [[0, 0]];
    prevMap.set('0,0', null);
    let solved = false;
    while (q.length > 0) {
      const [r, c] = q.shift();
      if (r === N - 1 && c === N - 1) { solved = true; break; }
      const moves = [
        [r - 1, c, !hWalls[r][c]],
        [r + 1, c, !hWalls[r + 1][c]],
        [r, c - 1, !vWalls[r][c]],
        [r, c + 1, !vWalls[r][c + 1]]
      ];
      for (const [nr, nc, open] of moves) {
        if (!open || nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
        const key = nr + ',' + nc;
        if (!prevMap.has(key)) { prevMap.set(key, [r, c]); q.push([nr, nc]); }
      }
    }

    const solCells = [];
    if (solved) {
      let cur = [N - 1, N - 1];
      while (cur) { solCells.push(cur); cur = prevMap.get(cur[0] + ',' + cur[1]); }
      solCells.reverse();
    }

    const cellMm = (shape === 'circle' ? sizeMm * 0.68 : sizeMm) / N;
    const halfGrid = (N * cellMm) * 0.5;
    const wallParts = [];
    const vectors2D = [];

    // Horizontal walls (merged runs for super-clean STL!)
    for (let r = 0; r <= N; r++) {
      let c = 0;
      const z = r * cellMm - halfGrid;
      while (c < N) {
        if (hWalls[r][c]) {
          const start = c;
          while (c < N && hWalls[r][c]) c++;
          const x0 = start * cellMm - halfGrid, x1 = c * cellMm - halfGrid;
          wallParts.push(C.buildBox((x0 + x1) * 0.5, baseT + wallH * 0.5 - 0.04, z, (x1 - x0) + wallT, wallH + 0.08, wallT, { color }));
          vectors2D.push({ points: [[x0, -z], [x1, -z]], closed: false, layer: 'cut' });
        } else c++;
      }
    }
    // Vertical walls (merged runs)
    for (let c = 0; c <= N; c++) {
      let r = 0;
      const x = c * cellMm - halfGrid;
      while (r < N) {
        if (vWalls[r][c]) {
          const start = r;
          while (r < N && vWalls[r][c]) r++;
          const z0 = start * cellMm - halfGrid, z1 = r * cellMm - halfGrid;
          wallParts.push(C.buildBox(x, baseT + wallH * 0.5 - 0.04, (z0 + z1) * 0.5, wallT, wallH + 0.08, (z1 - z0) + wallT, { color }));
          vectors2D.push({ points: [[x, -z0], [x, -z1]], closed: false, layer: 'cut' });
        } else r++;
      }
    }

    const basePart = shape === 'circle'
      ? C.buildPrismY(0, 0, baseT, 0, sizeMm * 0.52, 64, 0, { name: 'maze_circular_base', color: floorColor, roughness: 0.7 })
      : C.buildBox(0, baseT * 0.5, 0, sizeMm + wallT + 4, baseT, sizeMm + wallT + 4, { name: 'maze_square_base', color: floorColor, roughness: 0.7 });

    const wallsMerged = C.mergeParts(wallParts, { name: 'maze_walls', color, roughness: 0.45, flatShaded: true });
    const parts = [basePart, wallsMerged];

    // Solution path 3D coordinates for glowing overlay!
    const solutionPath3D = solCells.map(([r, c]) => [
      (c + 0.5) * cellMm - halfGrid,
      baseT + wallH * 0.55,
      (r + 0.5) * cellMm - halfGrid
    ]);

    return {
      parts,
      vectors2D,
      extras: {
        solvable: solved,
        solutionLength: solCells.length,
        solutionPath3D: showSolution ? solutionPath3D : null
      }
    };
  }

  /* =========================================================================
     STUDIO 7: REAL .GCODE / .NC PARSER & ANIMATED 3D CNC/PRINT SIMULATOR
  ========================================================================= */
  function generateSampleGcode(sampleId) {
    const lines = ['; Studios-Pro Maker Studio 7 Sample G-Code', 'G90', 'G21'];
    if (sampleId === 'cnc_pocket') {
      lines.push('; CNC Rectangular Pocket & Bore Mill');
      for (let pass = 1; pass <= 4; pass++) {
        const z = -(pass * 2.0);
        lines.push(`G0 X-40 Y-30 Z5`);
        lines.push(`G1 Z${z.toFixed(2)} F400`);
        for (let r = 0; r <= 6; r++) {
          const inset = r * 5;
          const w = 40 - inset, h = 30 - inset;
          if (w <= 2 || h <= 2) break;
          lines.push(`G1 X${w} Y${-h} F1200`, `G1 X${w} Y${h}`, `G1 X${-w} Y${h}`, `G1 X${-w} Y${-h}`);
        }
        lines.push('G0 Z5');
      }
    } else if (sampleId === 'laser_star') {
      lines.push('; Laser 12-Point Geometric Star Engraving');
      lines.push('G0 X0 Y0 Z2');
      for (let layer = 0; layer < 3; layer++) {
        const R = 50 - layer * 12;
        const pts = 24;
        for (let i = 0; i <= pts; i++) {
          const a = (i / pts) * TAU;
          const rad = (i % 2 === 0) ? R : R * 0.45;
          const cmd = i === 0 ? 'G0' : 'G1';
          lines.push(`${cmd} X${(Math.cos(a) * rad).toFixed(2)} Y${(Math.sin(a) * rad).toFixed(2)} Z${(layer * 0.5).toFixed(2)} F1800`);
        }
      }
    } else {
      // 3D Spiral Vase Print (36 layers!)
      lines.push('; 3D Printer Spiral Vase Mode (36 Layers)');
      let e = 0;
      const layers = 36, segs = 36;
      for (let l = 0; l < layers; l++) {
        const t = l / layers;
        const z = 0.2 + l * 1.4;
        const R = 28 + Math.sin(t * PI * 1.6) * 14;
        for (let i = 0; i <= segs; i++) {
          const a = (i / segs) * TAU;
          const rib = Math.cos(a * 10 + t * PI) * 2.2;
          const x = Math.cos(a) * (R + rib);
          const y = Math.sin(a) * (R + rib);
          e += 0.35;
          const cmd = (l === 0 && i === 0) ? 'G0' : 'G1';
          lines.push(`${cmd} X${x.toFixed(2)} Y${y.toFixed(2)} Z${(z + (i / segs) * 1.4).toFixed(2)} E${e.toFixed(2)} F1500`);
        }
      }
    }
    return lines.join('\n');
  }

  function parseGcodeText(text) {
    const rawLines = (text || '').split(/\r?\n/);
    const segments = []; // { x0,y0,z0, x1,y1,z1, rapid, layer }
    let x = 0, y = 0, z = 0, e = 0, feed = 1200;
    let relative = false;
    let cutDist = 0, rapidDist = 0;
    const zLevels = [];
    let currentLayer = 0;
    let lastLayerZ = null;

    for (let i = 0; i < rawLines.length; i++) {
      const clean = rawLines[i].split(';')[0].replace(/\(.*?\)/g, '').trim().toUpperCase();
      if (!clean) continue;
      if (clean.includes('G90')) { relative = false; continue; }
      if (clean.includes('G91')) { relative = true; continue; }

      const cmdMatch = clean.match(/\bG0?([0123])\b/);
      if (!cmdMatch) continue;
      const gNum = parseInt(cmdMatch[1], 10);

      const getVal = (letter) => {
        const m = clean.match(new RegExp(letter + '([-+]?\\d*\\.?\\d+)'));
        return m ? parseFloat(m[1]) : null;
      };
      const vx = getVal('X'), vy = getVal('Y'), vz = getVal('Z'), ve = getVal('E'), vf = getVal('F');
      if (vf != null && vf > 0) feed = vf;

      const nx = vx != null ? (relative ? x + vx : vx) : x;
      const ny = vy != null ? (relative ? y + vy : vy) : y;
      const nz = vz != null ? (relative ? z + vz : vz) : z;
      const ne = ve != null ? (relative ? e + ve : ve) : e;

      if (lastLayerZ === null || Math.abs(nz - lastLayerZ) > 0.15) {
        if (lastLayerZ !== null) currentLayer++;
        lastLayerZ = nz;
        zLevels.push(nz);
      }

      const dist = Math.hypot(nx - x, ny - y, nz - z);
      if (dist > 1e-4) {
        const isRapid = (gNum === 0);
        if (isRapid) rapidDist += dist; else cutDist += dist;
        // Map CNC/Printer (X, Y, Z_up) -> Three.js (X, Z_up as Y, -Y as Z)
        segments.push({
          x0: x, y0: z, z0: -y,
          x1: nx, y1: nz, z1: -ny,
          rapid: isRapid,
          layer: currentLayer
        });
      }
      x = nx; y = ny; z = nz; e = ne;
    }

    const totalLayers = Math.max(1, currentLayer + 1);
    const estMinutes = Math.max(0.5, (cutDist / Math.max(200, feed)) + (rapidDist / 4500));
    return {
      segments,
      totalLayers,
      cutDistMm: +cutDist.toFixed(1),
      rapidDistMm: +rapidDist.toFixed(1),
      estMinutes: +estMinutes.toFixed(1)
    };
  }

  function buildGCodeStudio(s) {
    const sample = s.sample || 'vase';
    const rawText = (s.uploadedText && s.uploadedText.trim().length > 10 && sample === 'uploaded')
      ? s.uploadedText
      : generateSampleGcode(sample);
    const parsed = parseGcodeText(rawText);
    const maxLayerPct = C.clamp(Number(s.layerPct != null ? s.layerPct : 100), 1, 100);
    const maxLayer = Math.max(0, Math.floor((parsed.totalLayers - 1) * (maxLayerPct / 100)));
    const color = s.color || '#10b981';

    // Build real 2D SVG/DXF toolpath + subtle solid reference base plaque so STL export is also non-empty!
    const vectors2D = [];
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const seg of parsed.segments) {
      if (seg.layer > maxLayer) continue;
      if (!seg.rapid) {
        vectors2D.push({ points: [[seg.x0, -seg.z0], [seg.x1, -seg.z1]], closed: false, layer: 'cut' });
      }
      minX = Math.min(minX, seg.x0, seg.x1); maxX = Math.max(maxX, seg.x0, seg.x1);
      minZ = Math.min(minZ, seg.z0, seg.z1); maxZ = Math.max(maxZ, seg.z0, seg.z1);
    }
    if (!Number.isFinite(minX)) { minX = -40; maxX = 40; minZ = -40; maxZ = 40; }

    // Build printable solid extruded path preview for first 350 cut moves so even STL/AR shows the toolpath!
    const cutSegs = parsed.segments.filter((seg) => !seg.rapid && seg.layer <= maxLayer);
    const stride = Math.max(1, Math.floor(cutSegs.length / 320));
    const bars = [];
    for (let i = 0; i < cutSegs.length; i += stride) {
      const seg = cutSegs[i];
      const yMid = Math.max(0.4, (seg.y0 + seg.y1) * 0.5);
      const bar = C.buildWallSegment(seg.x0, seg.z0, seg.x1, seg.z1, 0.9, yMid - 0.35, yMid + 0.35, { color });
      if (bar) bars.push(bar);
    }
    const parts = bars.length > 0
      ? [C.mergeParts(bars, { name: 'gcode_toolpath_solid', color, roughness: 0.4, metalness: 0.2 })]
      : [C.buildBox(0, 0.5, 0, 20, 1, 20, { name: 'gcode_origin', color })];

    return {
      parts,
      vectors2D,
      extras: {
        gcode: parsed,
        maxLayer,
        toolColor: color
      }
    };
  }

  return {
    PBR_PRESETS,
    synthesizePBRMaps,
    buildTextureStudio,
    buildLithoStudio,
    buildGlobeStudio,
    buildTopoStudio,
    buildHalftoneStudio,
    buildVaseStudio,
    buildMandalaStudio,
    buildVoronoiStudio,
    buildMazeStudio,
    buildGCodeStudio,
    parseGcodeText,
    generateSampleGcode
  };
}));
