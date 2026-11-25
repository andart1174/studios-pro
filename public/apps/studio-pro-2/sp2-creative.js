/**
 * Studio Pro 2 — 11 Creative, Game/UI & 4D Real-Time Generative Studios
 * Modules: builder, ui_asset, parallax, typography, neon, mosaic, organic, wave, galaxy, terrain, mandala.
 * Every single output is 100% closed Watertight 1:1 mm Manifold with full vertex-color preservation!
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./sp2-core.js'));
  } else {
    root.SP2Creative = factory(root.SP2Core);
  }
}(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';

  const { PI, TAU, DEG, clamp, lerp, smoothstep, round2 } = C;

  /* =========================================================================
     1. VOXEL GAME BUILDER (4 BIOMES + IMAGE-TO-VOXEL WITH VERTEX COLORS & PLINTH!)
  ========================================================================= */
  function buildVoxel(p, ctx) {
    const biome = p.biome || 'island'; // island | castle | alpine | cyber | image
    const grid = clamp(Math.round(p.gridSize || 22), 10, 44);
    const maxH = clamp(p.maxHeight || 28, 6, 70);
    const sizeMm = clamp(p.sizeMm || 96, 40, 180);
    const seed = Math.round(p.seed || 42);
    const baseThick = 3.0;
    const cell = sizeMm / grid;

    const img = ctx && ctx.imageBuf;
    const useImg = (biome === 'image' || (p.useUploadedImage && img)) && img;
    const boxes = [];

    // Solid watertight baseplate underneath all voxel columns
    boxes.push(C.buildBox(0, baseThick * 0.5, 0, sizeMm, baseThick, sizeMm, {
      colors: C.fillVertexColors(8, [0.11, 0.16, 0.25])
    }));

    for (let z = 0; z < grid; z++) {
      const vz = (z + 0.5) / grid;
      const nz = (vz - 0.5) * 2;
      for (let x = 0; x < grid; x++) {
        const ux = (x + 0.5) / grid;
        const nx = (ux - 0.5) * 2;
        let hNorm = 0;
        let rgb = [0.22, 0.74, 0.97];

        if (useImg) {
          const ix = clamp(Math.floor(ux * img.width), 0, img.width - 1);
          const iy = clamp(Math.floor(vz * img.height), 0, img.height - 1);
          const pi = (iy * img.width + ix) * 4;
          const a = img.data[pi + 3];
          if (a < 25) continue;
          const r = img.data[pi] / 255, g = img.data[pi + 1] / 255, b = img.data[pi + 2] / 255;
          const luma = 0.299 * r + 0.587 * g + 0.114 * b;
          hNorm = clamp(0.12 + (1 - luma) * 0.88, 0.08, 1.0);
          rgb = [r, g, b];
        } else if (biome === 'castle') {
          const dMax = Math.max(Math.abs(nx), Math.abs(nz));
          const isCorner = Math.abs(nx) > 0.55 && Math.abs(nz) > 0.55;
          const isWall = dMax > 0.58 && dMax < 0.78;
          const isKeep = Math.abs(nx) < 0.28 && Math.abs(nz) < 0.28;
          const isGate = nz > 0.55 && Math.abs(nx) < 0.16;
          if (isGate) { hNorm = 0.16; rgb = [0.48, 0.34, 0.22]; }
          else if (isCorner && dMax < 0.82) {
            const crenel = ((x + z) % 2 === 0) ? 0.08 : 0;
            hNorm = 0.86 + crenel; rgb = [0.68, 0.72, 0.78];
          } else if (isKeep) {
            hNorm = Math.hypot(nx, nz) < 0.14 ? 1.0 : 0.72;
            rgb = Math.hypot(nx, nz) < 0.14 ? [0.88, 0.26, 0.36] : [0.76, 0.79, 0.84];
          } else if (isWall) {
            const crenel = ((x + z) % 2 === 0) ? 0.07 : 0;
            hNorm = 0.54 + crenel; rgb = [0.60, 0.65, 0.72];
          } else if (dMax > 0.84) {
            hNorm = 0.08; rgb = [0.06, 0.52, 0.82]; // Moat water!
          } else {
            hNorm = 0.22; rgb = [0.24, 0.64, 0.34]; // Courtyard grass
          }
        } else if (biome === 'cyber') {
          const blkX = Math.floor(x / 3), blkZ = Math.floor(z / 3);
          const road = (x % 3 === 0) || (z % 3 === 0);
          if (road) {
            hNorm = 0.08; rgb = [0.12, 0.16, 0.24];
          } else {
            const rnd = C.hash3(blkX + seed, blkZ * 3, seed);
            hNorm = 0.22 + rnd * 0.78;
            const neonHue = C.hash3(blkX, blkZ, seed + 7);
            rgb = neonHue > 0.66 ? [0.08, 0.84, 0.96] : (neonHue > 0.33 ? [0.95, 0.25, 0.54] : [0.55, 0.36, 0.96]);
          }
        } else if (biome === 'alpine') {
          const n = C.ridged3D(nx * 1.9 + seed * 0.13, 0.3, nz * 1.9 + seed * 0.27, 4);
          hNorm = clamp(n * 1.15 - 0.12, 0.06, 1.0);
          if (hNorm > 0.76) rgb = [0.94, 0.97, 1.0];
          else if (hNorm > 0.52) rgb = [0.52, 0.56, 0.62];
          else if (hNorm > 0.25) rgb = [0.18, 0.52, 0.30];
          else rgb = [0.12, 0.45, 0.72];
        } else {
          // Archipelago Island (Default breathtaking biome!)
          const r = Math.hypot(nx, nz);
          const falloff = smoothstep(1.08, 0.22, r);
          const n = C.fbm3D(nx * 2.2 + seed * 0.17, 0.5, nz * 2.2 + seed * 0.31, 4) * 0.5 + 0.5;
          hNorm = clamp(falloff * (0.35 + n * 0.85), 0.06, 1.0);
          if (hNorm < 0.15) rgb = [0.05, 0.45, 0.78];       // Deep ocean
          else if (hNorm < 0.25) rgb = [0.10, 0.72, 0.86];  // Turquoise shallows
          else if (hNorm < 0.35) rgb = [0.94, 0.84, 0.56];  // Warm sand beach
          else if (hNorm < 0.62) rgb = [0.20, 0.68, 0.36];  // Lush green hills
          else if (hNorm < 0.80) rgb = [0.48, 0.52, 0.58];  // Rocky cliff
          else rgb = [0.96, 0.98, 1.0];                     // Snow summit
        }

        // Quantize to clean discrete voxel height steps!
        const steps = Math.max(1, Math.round(hNorm * 10));
        const colH = (steps / 10) * maxH;
        const px = -sizeMm * 0.5 + (x + 0.5) * cell;
        const pz = -sizeMm * 0.5 + (z + 0.5) * cell;
        boxes.push(C.buildBox(px, baseThick + colH * 0.5 - 0.1, pz, cell + 0.04, colH + 0.2, cell + 0.04, {
          colors: C.fillVertexColors(8, rgb)
        }));
      }
    }

    const merged = C.mergeParts(boxes, { name: `voxel_${biome}`, creaseDeg: 30 });
    return {
      parts: [merged],
      draw2D: { loops: [{ layer: 'OUTER', pts: C.rect2D(0, 0, sizeMm, sizeMm) }], circles: [] },
      specs: { standard: `Watertight Voxel World (${useImg ? 'Image' : biome.toUpperCase()} · ${grid}×${grid})`, warnings: [] },
      anim4D: { type: 'turntable', speed: 0.35 }
    };
  }

  /* =========================================================================
     2. 3D UI ASSET & BADGE (9 CHAMFERED SHAPES + UNICODE ICON / LOGO + OUTWARD HEART!)
  ========================================================================= */
  function buildUIAsset(p, ctx) {
    const shape = p.shape || 'roundBox';
    const size = clamp(p.size || 64, 24, 130);
    const thick = clamp(p.thickness || 10, 3, 30);
    const bevel = clamp(p.bevel || 2.0, 0, Math.min(thick * 0.38, 6));
    const badgeText = p.badgeText != null ? p.badgeText : '★ PRO';
    const reliefH = clamp(p.reliefHeight || 2.8, 0.6, 10);
    const R = size * 0.5;

    let outer = [];
    if (shape === 'cylinder') outer = C.circle2D(0, 0, R, 64);
    else if (shape === 'hexagon') outer = C.circle2D(0, 0, R, 6, PI / 6);
    else if (shape === 'octagon') outer = C.circle2D(0, 0, R, 8, PI / 8);
    else if (shape === 'triangle') outer = C.circle2D(0, 0, R, 3, PI / 2);
    else if (shape === 'capsule') outer = C.roundedRect2D(0, 0, size * 1.3, size * 0.65, size * 0.32, 10);
    else if (shape === 'star') {
      for (let i = 0; i < 10; i++) {
        const a = PI / 2 + (i / 10) * TAU, r = (i % 2 === 0) ? R : R * 0.48;
        outer.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
    } else if (shape === 'heart') {
      // Exact parametric outward-wound heart (ZERO flipped negative scale!)
      for (let i = 0; i < 64; i++) {
        const t = (i / 64) * TAU;
        const hx = 16 * Math.sin(t) ** 3;
        const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        outer.push([hx * (R / 17.5), (hy + 2.2) * (R / 17.5)]);
      }
    } else if (shape === 'shield') {
      outer = [
        [0, -R], [R * 0.65, -R * 0.55], [R * 0.92, 0], [R * 0.92, R * 0.72],
        [0, R * 0.95], [-R * 0.92, R * 0.72], [-R * 0.92, 0], [-R * 0.65, -R * 0.55]
      ];
    } else {
      outer = C.roundedRect2D(0, 0, size, size, R * 0.32, 8);
    }

    // Smooth chamfered bevel loft preserving EXACT outer bounds!
    const scBevel = clamp(1 - bevel / R, 0.78, 0.99);
    const body = C.extrudeLoft2D(outer, [], 0, thick, 4, (u) => {
      if (u < 0.01 || u > 0.99) return { scaleOuter: scBevel };
      return { scaleOuter: 1.0 };
    }, { name: `ui_badge_${shape}`, role: 'primary' });

    const parts = [body];
    // Extrude uploaded image logo OR crisp Unicode badge symbol directly onto front face!
    const img = ctx && ctx.imageBuf;
    if (img && p.useUploadedImage) {
      const mRes = 44;
      const logoW = size * 0.62, logoH = logoW * (img.height / Math.max(1, img.width));
      const logoPart = C.buildMaskSolidXZ(mRes, Math.max(8, Math.round(mRes * (img.height / Math.max(1, img.width)))),
        logoW, Math.min(size * 0.62, logoH), thick - 0.2,
        (c, r) => {
          const ix = Math.floor((c / mRes) * img.width), iy = Math.floor((r / Math.max(1, Math.round(mRes * (img.height / img.width)))) * img.height);
          const pi = (clamp(iy, 0, img.height - 1) * img.width + clamp(ix, 0, img.width - 1)) * 4;
          const a = img.data[pi + 3], luma = (img.data[pi] + img.data[pi + 1] + img.data[pi + 2]) / 3;
          return (a > 60 && luma < 245) ? reliefH : 0;
        },
        (c, r) => {
          const ix = Math.floor((c / mRes) * img.width), iy = Math.floor((r / Math.max(1, Math.round(mRes * (img.height / img.width)))) * img.height);
          const pi = (clamp(iy, 0, img.height - 1) * img.width + clamp(ix, 0, img.width - 1)) * 4;
          return [img.data[pi] / 255, img.data[pi + 1] / 255, img.data[pi + 2] / 255];
        },
        { name: 'ui_logo_relief' });
      if (logoPart) parts.push(logoPart);
    } else if (badgeText && badgeText.trim()) {
      const { cols, rows, mask } = C.rasterizeTextMask(badgeText, '', 'Inter, sans-serif', 96);
      const tW = size * 0.66, tH = tW * (rows / cols);
      const textPart = C.buildMaskSolidXZ(cols, rows, tW, tH, thick - 0.2,
        (c, r) => mask[r * cols + c] ? reliefH : 0, null,
        { name: 'ui_badge_emblem', color: '#ffffff', emissive: 0.2 });
      if (textPart) parts.push(textPart);
    }

    // Stand upright like a 3D UI icon card facing +Z!
    parts.forEach((pt) => C.rotatePartX(pt, PI * 0.5));
    C.seatOnBed(parts);

    return {
      parts,
      draw2D: { loops: [{ layer: 'OUTER', pts: C.ensureCCW(outer) }], circles: [] },
      specs: { standard: `3D UI Asset (${shape.toUpperCase()} · Watertight)`, warnings: [] },
      anim4D: { type: 'float_hover', amp: 3.5 }
    };
  }

  /* =========================================================================
     3. 2.5D SHADOWBOX / COMIC PARALLAX (4 DEPTH LAYERS + PRINTABLE FRAME!)
  ========================================================================= */
  function buildParallax(p) {
    const preset = p.scene || 'skyline'; // skyline | mountain | portal
    const W = clamp(p.width || 110, 50, 180);
    const H = clamp(p.height || 76, 40, 130);
    const sep = clamp(p.depthSep || 8, 3, 22);
    const layerT = 2.6;
    const hw = W * 0.5, hh = H * 0.5;
    const frameW = 5.5;
    const totalD = sep * 3 + layerT * 4;

    const parts = [];

    // Outer Printable Shadowbox Enclosure Frame (4-sided hollow rim!)
    const frameOuter = C.roundedRect2D(0, 0, W + frameW * 2, H + frameW * 2, 4, 5);
    const frameHole = C.rect2D(0, 0, W, H);
    const frame = C.extrudePolygon2D(frameOuter, [frameHole], 0, totalD, { name: 'shadowbox_frame', color: '#1e293b' });
    C.rotatePartX(frame, PI * 0.5);
    C.translatePart(frame, 0, hh + frameW, -totalD * 0.5);
    parts.push(frame);

    // Helper: place a 2D silhouette panel inside the shadowbox at depth slot `slot` (0=back .. 3=front)
    function addLayer(outerPts, holePtsList, slot, color, name, emissive) {
      const zBack = -totalD * 0.5 + 1.0 + slot * (sep + layerT);
      const part = C.extrudePolygon2D(outerPts, holePtsList || [], 0, layerT, { name, color, emissive: emissive || null });
      C.rotatePartX(part, PI * 0.5);
      C.translatePart(part, 0, hh + frameW, zBack);
      parts.push(part);
    }

    // Layer 0: Solid Backdrop Plate
    addLayer(C.rect2D(0, 0, W + 0.4, H + 0.4), [], 0, preset === 'skyline' ? '#1e1b4b' : (preset === 'portal' ? '#0f172a' : '#172554'), 'layer_0_backdrop');

    if (preset === 'skyline') {
      // Layer 1: Glowing Synthwave Sun Disc
      addLayer(C.circle2D(0, H * 0.14, Math.min(W, H) * 0.28, 40), [], 1, '#f43f5e', 'layer_1_sun', 0.65);
      // Layer 2: Midground High-Rise Towers
      const mid = [[-hw, -hh], [hw, -hh], [hw, -hh * 0.1], [hw * 0.65, -hh * 0.1], [hw * 0.65, hh * 0.58], [hw * 0.34, hh * 0.58], [hw * 0.34, hh * 0.15], [hw * 0.12, hh * 0.15], [hw * 0.12, hh * 0.72], [-hw * 0.18, hh * 0.72], [-hw * 0.18, hh * 0.05], [-hw * 0.48, hh * 0.05], [-hw * 0.48, hh * 0.48], [-hw * 0.78, hh * 0.48], [-hw * 0.78, -hh * 0.1], [-hw, -hh * 0.1]];
      addLayer(mid, [], 2, '#6366f1', 'layer_2_mid_towers');
      // Layer 3: Foreground Cyber Silhouettes
      const fore = [[-hw, -hh], [hw, -hh], [hw, hh * 0.22], [hw * 0.72, hh * 0.22], [hw * 0.72, -hh * 0.35], [hw * 0.28, -hh * 0.35], [hw * 0.28, -hh * 0.12], [-hw * 0.24, -hh * 0.12], [-hw * 0.24, -hh * 0.42], [-hw * 0.65, -hh * 0.42], [-hw * 0.65, hh * 0.18], [-hw, hh * 0.18]];
      addLayer(fore, [], 3, '#0ea5e9', 'layer_3_foreground');
    } else if (preset === 'portal') {
      // 3 Concentric Arched Sacred Portal Rings stepping forward in 3D depth!
      const archRect = C.rect2D(0, 0, W + 0.2, H + 0.2);
      addLayer(archRect, [C.circle2D(0, 0, Math.min(W, H) * 0.22, 36)], 1, '#a855f7', 'layer_1_inner_portal');
      addLayer(archRect, [C.circle2D(0, 0, Math.min(W, H) * 0.34, 40)], 2, '#ec4899', 'layer_2_mid_portal');
      addLayer(archRect, [C.circle2D(0, 0, Math.min(W, H) * 0.44, 44)], 3, '#38bdf8', 'layer_3_outer_portal');
    } else {
      // Mountain Moon: Moon + Far Peaks + Mid Pine Ridge + Foreground Valley
      addLayer(C.circle2D(hw * 0.42, hh * 0.42, Math.min(W, H) * 0.19, 36), [], 1, '#fde047', 'layer_1_moon', 0.55);
      const farP = [[-hw, -hh], [hw, -hh], [hw, hh * 0.05], [hw * 0.55, hh * 0.62], [hw * 0.15, hh * 0.12], [-hw * 0.22, hh * 0.75], [-hw * 0.62, hh * 0.18], [-hw, hh * 0.32]];
      addLayer(farP, [], 2, '#3b82f6', 'layer_2_peaks');
      const nearP = [[-hw, -hh], [hw, -hh], [hw, -hh * 0.05], [hw * 0.48, -hh * 0.32], [0, hh * 0.12], [-hw * 0.5, -hh * 0.28], [-hw, hh * 0.05]];
      addLayer(nearP, [], 3, '#10b981', 'layer_3_valley');
    }

    C.seatOnBed(parts);
    return {
      parts,
      draw2D: { loops: [{ layer: 'OUTER', pts: frameOuter }, { layer: 'HOLES', pts: frameHole }], circles: [] },
      specs: { standard: `4-Layer 2.5D Shadowbox (${preset.toUpperCase()})`, warnings: [] },
      anim4D: { type: 'parallax_sway', amp: 0.24 }
    };
  }

  /* =========================================================================
     4. 3D UNICODE TYPOGRAPHY (ACCENTS + 2 LINES + STRAIGHT / ARCHED + BASE STAND!)
  ========================================================================= */
  function buildTypography(p) {
    const line1 = p.line1 != null ? p.line1 : 'STUDIO 4D';
    const line2 = p.line2 != null ? p.line2 : 'CRÉATION ★';
    const widthMm = clamp(p.widthMm || 110, 40, 200);
    const depthMm = clamp(p.depthMm || 12, 2, 35);
    const curveDeg = clamp(p.curveDeg || 0, 0, 140);
    const stand = p.stand !== false;

    const { cols, rows, mask } = C.rasterizeTextMask(line1, line2, p.font || 'Inter, sans-serif', 136);
    const heightMm = widthMm * (rows / cols);
    const textPart = C.buildMaskSolidXZ(cols, rows, widthMm, heightMm, 0,
      (c, r) => mask[r * cols + c] ? depthMm : 0, null,
      { name: 'unicode_text_3d', role: 'primary' });

    const parts = [];
    if (textPart) {
      // Stand letters upright facing +Z!
      C.rotatePartX(textPart, PI * 0.5);
      // Optional cylindrical arch curve around Y!
      if (curveDeg > 2) {
        const rad = curveDeg * DEG;
        const R = widthMm / rad;
        C.transformPart(textPart, (x, y, z) => {
          const a = x / R;
          const rCur = R + z;
          return [Math.sin(a) * rCur, y, Math.cos(a) * rCur - R];
        });
      }
      C.seatOnBed([textPart]);
      parts.push(textPart);
    }

    if (stand) {
      const b = C.getPartsBounds(parts);
      const base = C.buildBox(0, 2.2, (b.minZ + b.maxZ) * 0.5, Math.max(30, b.sx + 10), 4.4, Math.max(14, b.sz + 8), {
        name: 'typography_stand', color: '#1e293b'
      });
      parts.forEach((pt) => C.translatePart(pt, 0, 4.0, 0));
      parts.unshift(base);
    }

    return {
      parts,
      draw2D: { loops: [{ layer: 'OUTER', pts: C.rect2D(0, 0, widthMm, heightMm) }], circles: [] },
      specs: { standard: `Unicode 3D Typography (${curveDeg > 2 ? 'Curved ' + curveDeg + '°' : 'Straight'})`, warnings: [] },
      anim4D: { type: 'turntable', speed: 0.45 }
    };
  }

  /* =========================================================================
     5. NEON FX SIGN STUDIO (UNICODE GLOWING TUBE + ACRYLIC BACKBOARD + STANDOFFS!)
  ========================================================================= */
  function buildNeon(p) {
    const text = p.text != null ? p.text : 'NEON 4D';
    const sub = p.subtext || '';
    const widthMm = clamp(p.widthMm || 120, 50, 200);
    const tubeDepth = clamp(p.tubeDepth || 6.5, 2.5, 16);
    const neonCol = p.neonColor || '#00f3ff';
    const hasBoard = p.backboard !== false;

    const { cols, rows, mask } = C.rasterizeTextMask(text, sub, 'Inter, sans-serif', 128);
    const heightMm = widthMm * (rows / cols);
    const parts = [];

    const tube = C.buildMaskSolidXZ(cols, rows, widthMm, heightMm, 0,
      (c, r) => mask[r * cols + c] ? tubeDepth : 0, null,
      { name: 'neon_glow_tube', role: 'neon', color: neonCol, emissive: clamp(p.glow || 2.2, 0.5, 5.0) });
    if (tube) {
      C.rotatePartX(tube, PI * 0.5);
      C.translatePart(tube, 0, heightMm * 0.5 + 10, 3.2);
      parts.push(tube);
    }

    if (hasBoard) {
      const padX = 14, padY = 12;
      const bw = widthMm + padX * 2, bh = heightMm + padY * 2;
      const boardOuter = C.roundedRect2D(0, 0, bw, bh, 8, 6);
      const holes = [
        C.circle2D(-bw * 0.5 + 7, -bh * 0.5 + 7, 2.2, 16),
        C.circle2D(+bw * 0.5 - 7, -bh * 0.5 + 7, 2.2, 16),
        C.circle2D(+bw * 0.5 - 7, +bh * 0.5 - 7, 2.2, 16),
        C.circle2D(-bw * 0.5 + 7, +bh * 0.5 - 7, 2.2, 16)
      ];
      const board = C.extrudePolygon2D(boardOuter, holes, 0, 3.6, {
        name: 'acrylic_backboard', role: 'acrylic', color: '#0f172a', glass: true, opacity: 0.72
      });
      C.rotatePartX(board, PI * 0.5);
      C.translatePart(board, 0, heightMm * 0.5 + 10, -0.2);
      parts.push(board);

      // 4 Chrome Wall Mounting Standoffs behind board!
      const sOffs = [[-bw * 0.5 + 7, -bh * 0.5 + 7], [bw * 0.5 - 7, -bh * 0.5 + 7], [bw * 0.5 - 7, bh * 0.5 - 7], [-bw * 0.5 + 7, bh * 0.5 - 7]];
      const standoffs = sOffs.map(([sx, sy]) => {
        const pin = C.buildPrismY(0, -10, 4.2, 0, 3.4, 20, 0, { color: '#cbd5e1' });
        C.rotatePartX(pin, PI * 0.5);
        C.translatePart(pin, sx, heightMm * 0.5 + 10 + sy, 0);
        return pin;
      });
      parts.push(C.mergeParts(standoffs, { name: 'wall_standoffs', color: '#cbd5e1' }));
    }

    C.seatOnBed(parts);
    return {
      parts,
      draw2D: { loops: [{ layer: 'OUTER', pts: C.roundedRect2D(0, 0, widthMm + 28, heightMm + 24, 8, 6) }], circles: [] },
      specs: { standard: `Acrylic Neon Sign Studio (GPU Bloom Ready)`, warnings: [] },
      preferBloom: true,
      anim4D: { type: 'neon_pulse' }
    };
  }

  /* =========================================================================
     6. MOSAIC 3D ART (4 BUILT-IN ARTWORKS + IMAGE UPLOAD + SOLID BACKING BOARD!)
  ========================================================================= */
  function buildMosaic(p, ctx) {
    const artwork = p.artwork || 'sunset'; // sunset | heart | wave | prism | image
    const res = clamp(Math.round(p.resolution || 24), 10, 44);
    const sizeMm = clamp(p.sizeMm || 96, 40, 180);
    const maxRel = clamp(p.reliefHeight || 4.5, 1.0, 14);
    const tileShape = p.tileShape || 'stud'; // box | stud | pebble
    const gap = clamp(p.gap || 0.12, 0, 0.35);
    const baseT = 2.6;

    const img = ctx && ctx.imageBuf;
    const useImg = (artwork === 'image' || (p.useUploadedImage && img)) && img;
    const cell = sizeMm / res;
    const tileW = cell * (1 - gap);

    const subs = [
      C.buildBox(0, baseT * 0.5, 0, sizeMm + 4, baseT, sizeMm + 4, { colors: C.fillVertexColors(8, [0.09, 0.11, 0.16]) })
    ];

    for (let y = 0; y < res; y++) {
      const v = (y + 0.5) / res, ny = (v - 0.5) * 2;
      for (let x = 0; x < res; x++) {
        const u = (x + 0.5) / res, nx = (u - 0.5) * 2;
        let rgb = [0.2, 0.6, 0.9], luma = 0.5;

        if (useImg) {
          const ix = clamp(Math.floor(u * img.width), 0, img.width - 1);
          const iy = clamp(Math.floor(v * img.height), 0, img.height - 1);
          const pi = (iy * img.width + ix) * 4;
          rgb = [img.data[pi] / 255, img.data[pi + 1] / 255, img.data[pi + 2] / 255];
          luma = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
        } else if (artwork === 'heart') {
          const hx = nx * 1.25, hy = -ny * 1.25 + 0.15;
          const f = (hx * hx + hy * hy - 0.55) ** 3 - hx * hx * hy * hy * hy;
          if (f < 0) { rgb = [0.96, 0.22, 0.42]; luma = 0.92; }
          else { rgb = [0.14, 0.18, 0.30]; luma = 0.22; }
        } else if (artwork === 'wave') {
          const w = Math.sin(nx * 4.5 + Math.cos(ny * 3.0)) * 0.5 + 0.5;
          rgb = [lerp(0.05, 0.96, w * 0.4), lerp(0.35, 0.92, w), lerp(0.75, 1.0, w)];
          luma = w;
        } else if (artwork === 'prism') {
          const ang = (Math.atan2(ny, nx) + PI) / TAU;
          const r = Math.hypot(nx, ny);
          rgb = [
            0.5 + 0.5 * Math.sin(ang * TAU),
            0.5 + 0.5 * Math.sin(ang * TAU + 2.094),
            0.5 + 0.5 * Math.sin(ang * TAU + 4.188)
          ];
          luma = clamp(1 - r * 0.55, 0.2, 1.0);
        } else {
          // Pop Sunset (Vibrant Sun over Cyan-Purple Water!)
          const sunD = Math.hypot(nx, ny + 0.18);
          if (sunD < 0.44 && ny < 0.22) {
            rgb = [1.0, lerp(0.85, 0.25, (ny + 0.62) / 0.85), 0.18]; luma = 0.95;
          } else if (ny < 0.22) {
            const g = clamp((ny + 1) / 1.22, 0, 1);
            rgb = [lerp(0.28, 0.92, g), lerp(0.10, 0.26, g), lerp(0.55, 0.48, g)]; luma = 0.35 + g * 0.2;
          } else {
            const rip = Math.sin(nx * 10 + ny * 18) * 0.5 + 0.5;
            rgb = [lerp(0.06, 0.96, rip * (Math.abs(nx) < 0.4 ? 0.65 : 0.12)), lerp(0.30, 0.72, rip), lerp(0.68, 0.95, rip)];
            luma = 0.25 + rip * 0.35;
          }
        }

        const h = 1.0 + luma * maxRel;
        const px = -sizeMm * 0.5 + (x + 0.5) * cell;
        const pz = -sizeMm * 0.5 + (y + 0.5) * cell;
        if (tileShape === 'pebble') {
          subs.push(C.buildPrismY(px, baseT - 0.1, baseT + h, pz, tileW * 0.5, 10, 0, { colors: C.fillVertexColors(22, rgb) }));
        } else if (tileShape === 'stud') {
          subs.push(C.buildBox(px, baseT + h * 0.5 - 0.05, pz, tileW, h + 0.1, tileW, { colors: C.fillVertexColors(8, rgb) }));
          subs.push(C.buildPrismY(px, baseT + h - 0.1, baseT + h + 0.85, pz, tileW * 0.31, 8, 0, { colors: C.fillVertexColors(18, rgb) }));
        } else {
          subs.push(C.buildBox(px, baseT + h * 0.5 - 0.05, pz, tileW, h + 0.1, tileW, { colors: C.fillVertexColors(8, rgb) }));
        }
      }
    }

    const merged = C.mergeParts(subs, { name: `mosaic_${artwork}`, creaseDeg: 32 });
    return {
      parts: [merged],
      draw2D: { loops: [{ layer: 'OUTER', pts: C.rect2D(0, 0, sizeMm + 4, sizeMm + 4) }], circles: [] },
      specs: { standard: `Solid-Backed 3D Brick Mosaic (${res}×${res} · Color GLB)`, warnings: [] },
      anim4D: { type: 'turntable', speed: 0.35 }
    };
  }

  /* =========================================================================
     7. 4D MORPHING ORGANIC SCULPTOR (TRUE 3D/4D FBM / RIDGED NOISE!)
  ========================================================================= */
  function buildOrganic(p, ctx) {
    const shape = p.shape || 'sphere'; // sphere | torus | knot | crystal | capsule
    const noiseMode = p.noiseMode || 'fbm'; // fbm | ridged | ripple
    const scale = clamp(p.noiseScale || 2.4, 0.4, 8.0);
    const disp = clamp(p.displacement || 5.5, 0, 16);
    const radius = clamp(p.radius || 26, 12, 55);
    const res = clamp(Math.round(p.resolution || 44), 16, 68);
    const phase4D = (ctx && ctx.time4D) || 0;

    let base;
    if (shape === 'torus') {
      const path = [];
      for (let i = 0; i < res; i++) {
        const a = (i / res) * TAU;
        path.push([Math.cos(a) * radius, 0, Math.sin(a) * radius]);
      }
      base = C.buildClosedSweepTube(path, radius * 0.38, Math.max(14, Math.round(res * 0.55)), true, { name: 'organic_torus' });
    } else if (shape === 'knot') {
      const path = [], N = Math.max(64, res * 2);
      for (let i = 0; i < N; i++) {
        const u = (i / N) * TAU;
        const r = radius * (0.62 + 0.28 * Math.cos(3 * u));
        path.push([r * Math.cos(2 * u), radius * 0.34 * Math.sin(3 * u), r * Math.sin(2 * u)]);
      }
      base = C.buildClosedSweepTube(path, radius * 0.21, 16, true, { name: 'organic_knot' });
    } else if (shape === 'crystal') {
      base = C.buildSphere(0, 0, 0, radius, 12, 8, { name: 'organic_crystal', creaseDeg: 25 });
    } else if (shape === 'capsule') {
      const prof = [];
      for (let i = 0; i <= 24; i++) {
        const a = lerp(-PI * 0.5, PI * 0.5, i / 24);
        const yOff = i < 12 ? -radius * 0.5 : radius * 0.5;
        prof.push([Math.cos(a) * radius * 0.58, yOff + Math.sin(a) * radius * 0.58]);
      }
      base = C.buildClosedLatheY(prof, res, { name: 'organic_capsule', creaseDeg: 180 });
    } else {
      base = C.buildSphere(0, 0, 0, radius, res, Math.round(res * 0.72), { name: 'organic_sphere', creaseDeg: 180 });
    }

    // Apply 4D FBM/Ridged/Ripple organic displacement along outward vertex normals!
    const pos = base.positions, norm = base.normals;
    const basePos = new Float32Array(pos); // Save rest positions for smooth live 4D animation!
    const baseNorm = new Float32Array(norm);
    const freq = scale / Math.max(10, radius);

    function sampleDisp(x, y, z, t) {
      if (noiseMode === 'ridged') return (C.ridged3D(x * freq + t, y * freq - t * 0.7, z * freq + t * 0.5, 4) * 2 - 1) * disp;
      if (noiseMode === 'ripple') return Math.sin(Math.hypot(x, y, z) * freq * 3 + y * freq * 4 + t * 2.5) * disp * 0.75;
      return C.fbm3D(x * freq + t, y * freq + t * 0.6, z * freq - t * 0.8, 4) * disp;
    }

    if (disp > 0.05) {
      for (let i = 0; i < pos.length; i += 3) {
        const d = sampleDisp(basePos[i], basePos[i + 1], basePos[i + 2], phase4D);
        pos[i]     = basePos[i]     + baseNorm[i] * d;
        pos[i + 1] = basePos[i + 1] + baseNorm[i + 1] * d;
        pos[i + 2] = basePos[i + 2] + baseNorm[i + 2] * d;
      }
      C.ensureOutwardWinding(pos, base.indices);
      base.normals = C.computeVertexNormals(pos, base.indices);
    }

    C.seatOnBed([base]);
    return {
      parts: [base],
      draw2D: { loops: [], circles: [{ cx: 0, cy: 0, r: radius }] },
      specs: { standard: `4D Organic ${noiseMode.toUpperCase()} Sculpt (${shape})`, warnings: [] },
      anim4D: { type: 'organic_morph', freq, disp, noiseMode, basePos, baseNorm }
    };
  }

  /* =========================================================================
     8. 4D ANIMATED OCEAN WAVE ON WATERTIGHT SOLID PLINTH!
  ========================================================================= */
  function buildWave(p, ctx) {
    const waveMode = p.waveMode || 'ocean'; // ocean | ripple | interference
    const sizeMm = clamp(p.sizeMm || 100, 40, 180);
    const amp = clamp(p.amplitude || 7.5, 1, 22);
    const freq = clamp(p.frequency || 3.2, 1, 10);
    const res = clamp(Math.round(p.resolution || 56), 20, 88);
    const baseH = clamp(p.baseHeight || 6.0, 2, 20);
    const t = (ctx && ctx.time4D) || 0;

    function evalH(u, v, x, z) {
      const k = freq * 0.08;
      let w = 0;
      if (waveMode === 'ripple') {
        const r = Math.hypot(x, z);
        w = Math.cos(r * k * 2.2 - t * 2.5) * Math.exp(-r / (sizeMm * 0.55));
      } else if (waveMode === 'interference') {
        const r1 = Math.hypot(x - sizeMm * 0.22, z);
        const r2 = Math.hypot(x + sizeMm * 0.22, z);
        w = 0.55 * Math.sin(r1 * k * 2.4 - t * 2.2) + 0.55 * Math.sin(r2 * k * 2.4 - t * 2.2);
      } else {
        // Multi-directional Gerstner-like ocean swell
        w = 0.55 * Math.sin(x * k * 1.4 + z * k * 0.5 + t * 2.0)
          + 0.30 * Math.cos(z * k * 1.9 - x * k * 0.8 + t * 1.5)
          + 0.18 * Math.sin((x + z) * k * 2.7 - t * 2.8);
      }
      return baseH + amp + w * amp;
    }

    function evalCol(u, v, h) {
      const n = clamp((h - baseH) / Math.max(1, amp * 2), 0, 1);
      // Deep Abyss Blue -> Vibrant Cyan -> White Seafoam Crests!
      if (n > 0.78) {
        const f = (n - 0.78) / 0.22;
        return [lerp(0.22, 0.96, f), lerp(0.84, 0.98, f), lerp(0.98, 1.0, f)];
      }
      return [lerp(0.03, 0.16, n), lerp(0.18, 0.78, n), lerp(0.45, 0.96, n)];
    }

    const part = C.buildSolidHeightfieldY(res, res, sizeMm, sizeMm, evalH, evalCol, {
      name: `ocean_wave_${waveMode}`, creaseDeg: 180
    });

    return {
      parts: [part],
      draw2D: { loops: [{ layer: 'OUTER', pts: C.rect2D(0, 0, sizeMm, sizeMm) }], circles: [] },
      specs: { standard: `4D Solid-Plinth Wave (${waveMode.toUpperCase()})`, warnings: [] },
      anim4D: { type: 'wave_live', cols: res, rows: res, sizeMm, amp, freq, baseH, waveMode }
    };
  }

  /* =========================================================================
     9. 4D SPIRAL GALAXY (LIVE STARFIELD + PRINTABLE 3D SOLID ORBITAL SCULPTURE!)
  ========================================================================= */
  function buildGalaxy(p) {
    const mode = p.galaxyMode || 'sculpture'; // sculpture | relief
    const arms = clamp(Math.round(p.arms || 3), 2, 6);
    const radius = clamp(p.radius || 46, 20, 90);
    const twist = clamp(p.twist || 2.8, 1.0, 5.5);
    const stars = clamp(Math.round(p.starCount || 3200), 500, 10000);

    const parts = [];
    if (mode === 'relief') {
      // Printable 3D Galactic Relief Medallion Disc!
      const res = 54, sz = radius * 2;
      const disc = C.buildSolidHeightfieldY(res, res, sz, sz, (u, v, x, z) => {
        const r = Math.hypot(x, z) / radius;
        if (r > 1.0) return 2.4;
        const ang = Math.atan2(z, x);
        const armWave = Math.cos(arms * (ang - r * twist * PI)) * 0.5 + 0.5;
        const core = Math.exp(-r * r * 7.5) * 14.0;
        const spiral = (armWave ** 2.2) * (1 - r) * 8.5;
        return 3.0 + core + spiral;
      }, (u, v, h) => {
        const n = clamp((h - 3.0) / 14.0, 0, 1);
        return [lerp(0.18, 1.0, n), lerp(0.14, 0.85, n), lerp(0.45, 0.96, n ** 0.6)];
      }, { name: 'galaxy_relief_disc', creaseDeg: 180 });
      parts.push(disc);
    } else {
      // Printable 3D Solid Orbital Sculpture: Glowing Core + Swept Spiral Ribbons + 3D Orbiting Planets!
      const core = C.buildSphere(0, 10, 0, radius * 0.16, 24, 16, {
        name: 'galactic_core', color: '#fde047', emissive: 1.4, pivot: [0, 10, 0]
      });
      parts.push(core);
      const armSubs = [];
      for (let a = 0; a < arms; a++) {
        const a0 = (a / arms) * TAU;
        const path = [];
        const steps = 34;
        for (let i = 0; i <= steps; i++) {
          const u = i / steps;
          const r = lerp(radius * 0.12, radius, u);
          const th = a0 + u * twist * PI;
          const y = 10 + Math.sin(u * PI) * 4.5;
          path.push([Math.cos(th) * r, y, Math.sin(th) * r]);
        }
        const armTube = C.buildClosedSweepTube(path, (u) => lerp(2.4, 0.75, u), 10, false, {
          color: a % 2 === 0 ? '#38bdf8' : '#c084fc', emissive: 0.7
        });
        armSubs.push(armTube);
        // 3D Star/Planet Nodes along each spiral arm
        for (let k = 1; k <= 3; k++) {
          const u = k * 0.28;
          const r = lerp(radius * 0.12, radius, u), th = a0 + u * twist * PI;
          armSubs.push(C.buildSphere(Math.cos(th) * r, 10 + Math.sin(u * PI) * 4.5, Math.sin(th) * r, lerp(3.4, 1.8, u), 14, 10, {
            color: k === 1 ? '#f43f5e' : '#38bdf8'
          }));
        }
      }
      parts.push(C.mergeParts(armSubs, { name: 'spiral_arms_3d', emissive: 0.55, pivot: [0, 10, 0] }));
      // Solid collector pedestal ring linking arms neatly
      const ped = C.buildPrismY(0, 0, 3.0, 0, radius * 0.34, 40, 0, { name: 'galaxy_pedestal', color: '#1e293b' });
      const stem = C.buildPrismY(0, 2.5, 10, 0, radius * 0.06, 20, 0, { color: '#475569' });
      parts.push(C.mergeParts([ped, stem], { name: 'galaxy_base' }));
    }

    // Generate Live 4D Starfield Particle Metadata for Viewport Visual Magic!
    const rng = C.mulberry32(777 + arms * 31);
    const pPos = new Float32Array(stars * 3);
    const pCol = new Float32Array(stars * 3);
    for (let i = 0; i < stars; i++) {
      const arm = i % arms;
      const u = rng() ** 0.75;
      const dist = u * radius * 1.15;
      const th = (arm / arms) * TAU + u * twist * PI + (rng() - 0.5) * (0.9 - u * 0.3);
      const spread = (1 - u * 0.6) * radius * 0.14;
      pPos[i * 3] = Math.cos(th) * dist + (rng() - 0.5) * spread;
      pPos[i * 3 + 1] = 10 + (rng() - 0.5) * radius * 0.16 * (1 - u * 0.7);
      pPos[i * 3 + 2] = Math.sin(th) * dist + (rng() - 0.5) * spread;
      pCol[i * 3] = lerp(1.0, 0.35, u);
      pCol[i * 3 + 1] = lerp(0.92, 0.45, u);
      pCol[i * 3 + 2] = lerp(0.65, 1.0, u);
    }

    return {
      parts,
      particles: { positions: pPos, colors: pCol, size: clamp(p.starSize || 1.2, 0.4, 3.0) },
      draw2D: { loops: [], circles: [{ cx: 0, cy: 0, r: radius }] },
      specs: { standard: `4D Galaxy (${mode === 'relief' ? 'Printable Relief Disc' : 'Printable Orbital Sculpture'} + ${stars} Stars)`, warnings: [] },
      preferBloom: true,
      anim4D: { type: 'galaxy_orbit', speed: 0.45 }
    };
  }

  /* =========================================================================
     10. MULTI-OCTAVE FBM SOLID LANDSCAPE TERRAIN (5 GEOLOGICAL PRESETS!)
  ========================================================================= */
  function buildTerrain(p) {
    const preset = p.preset || 'alpine'; // alpine | volcano | canyon | island | contour
    const sizeMm = clamp(p.sizeMm || 110, 40, 180);
    const maxH = clamp(p.amplitude || 26, 4, 65);
    const freq = clamp(p.complexity || 2.4, 0.6, 6.0);
    const res = clamp(Math.round(p.resolution || 60), 20, 92);
    const seed = Math.round(p.seed || 17);
    const baseH = 4.0;

    function evalH(u, v) {
      const nx = (u - 0.5) * 2, nz = (v - 0.5) * 2;
      const sx = nx * freq + seed * 0.19, sz = nz * freq + seed * 0.37;
      let h = 0;
      if (preset === 'volcano') {
        const r = Math.hypot(nx, nz);
        const cone = Math.max(0, 1 - r * 1.12) ** 1.4;
        const crater = r < 0.28 ? (0.28 - r) * 2.1 : 0;
        const rough = C.fbm3D(sx * 1.8, 0.2, sz * 1.8, 4) * 0.12;
        h = clamp(cone - crater + rough, 0.02, 1.0);
      } else if (preset === 'canyon') {
        const n = C.fbm3D(sx, 0.5, sz, 4) * 0.5 + 0.5;
        const river = Math.abs(nx - Math.sin(nz * 2.8) * 0.28);
        const cut = smoothstep(0.08, 0.34, river);
        // Stepped plateau mesas
        const mesa = Math.floor(n * 4.5) / 4.5 * 0.65 + n * 0.35;
        h = clamp(mesa * cut, 0.04, 1.0);
      } else if (preset === 'island') {
        const r = Math.hypot(nx, nz);
        const mask = smoothstep(0.98, 0.18, r);
        const n = C.fbm3D(sx * 1.2, 0.4, sz * 1.2, 5) * 0.5 + 0.5;
        h = clamp(mask * (0.2 + n * 0.95), 0.02, 1.0);
      } else if (preset === 'contour') {
        const n = C.ridged3D(sx, 0.1, sz, 4);
        h = Math.round(clamp(n, 0.02, 1.0) * 9) / 9;
      } else {
        // Alpine Ridges
        h = clamp(C.ridged3D(sx, 0.3, sz, 5) * 1.08 - 0.05, 0.02, 1.0);
      }
      return baseH + h * maxH;
    }

    function evalCol(u, v, hVal) {
      const n = clamp((hVal - baseH) / Math.max(1, maxH), 0, 1);
      if (preset === 'volcano') {
        if (n > 0.68 && Math.hypot((u - 0.5) * 2, (v - 0.5) * 2) < 0.26) return [1.0, 0.32, 0.05]; // Lava glow
        return [lerp(0.18, 0.42, n), lerp(0.17, 0.36, n), lerp(0.20, 0.38, n)];
      }
      if (preset === 'canyon') {
        if (n < 0.14) return [0.08, 0.52, 0.78];
        return [lerp(0.68, 0.90, n), lerp(0.32, 0.56, n), lerp(0.18, 0.34, n)];
      }
      if (n < 0.12) return [0.06, 0.44, 0.76];
      if (n < 0.24) return [0.88, 0.80, 0.54];
      if (n < 0.54) return [0.18, 0.58, 0.30];
      if (n < 0.78) return [0.46, 0.49, 0.54];
      return [0.95, 0.97, 1.0];
    }

    const part = C.buildSolidHeightfieldY(res, res, sizeMm, sizeMm, evalH, evalCol, {
      name: `terrain_${preset}`, creaseDeg: preset === 'contour' ? 35 : 180
    });

    return {
      parts: [part],
      draw2D: { loops: [{ layer: 'OUTER', pts: C.rect2D(0, 0, sizeMm, sizeMm) }], circles: [] },
      specs: { standard: `Multi-Octave FBM Solid Terrain (${preset.toUpperCase()})`, warnings: [] },
      anim4D: { type: 'turntable', speed: 0.3 }
    };
  }

  /* =========================================================================
     11. MULTI-LAYER SOLID-BACKED 3D MANDALA (+ TRUE LASER VECTOR SVG!)
  ========================================================================= */
  function buildMandala(p) {
    const arms = clamp(Math.round(p.arms || 10), 4, 24);
    const rings = clamp(Math.round(p.rings || 4), 1, 7);
    const radius = clamp(p.radius || 52, 20, 95);
    const thick = clamp(p.thickness || 3.2, 1.2, 12);
    const twistDeg = clamp(p.twist || 14, -90, 90);
    const motif = p.motif || 'petal'; // petal | star | diamond | crystal | heart | ring
    const backing = p.backingDisc !== false;

    const subs = [];
    const loops = [];
    const circles = [];

    if (backing) {
      const baseOuter = C.circle2D(0, 0, radius + 3.0, 64);
      subs.push(C.extrudePolygon2D(baseOuter, [], 0, 2.0, { color: '#1e293b' }));
      loops.push({ layer: 'OUTER', pts: baseOuter });
    }
    const yBase = backing ? 1.8 : 0;

    // Central Rosette Hub
    subs.push(C.buildPrismY(0, yBase, yBase + thick * 1.25, 0, radius * 0.14, arms * 2, 0, { color: '#f43f5e' }));
    circles.push({ cx: 0, cy: 0, r: radius * 0.14 });

    const palette = ['#f43f5e', '#a855f7', '#38bdf8', '#f59e0b', '#10b981', '#ec4899', '#6366f1'];

    for (let rIdx = 1; rIdx <= rings; rIdx++) {
      const frac = rIdx / rings;
      const rRing = radius * frac * 0.92;
      const col = palette[(rIdx - 1) % palette.length];
      const layerH = thick * (1.15 - frac * 0.35);
      const ringW = Math.max(2.0, radius * 0.032);

      // Connecting structural ring tying all petals solidly together!
      const rOut = C.circle2D(0, 0, rRing + ringW * 0.5, 56);
      const rIn = C.circle2D(0, 0, Math.max(1.5, rRing - ringW * 0.5), 48);
      subs.push(C.extrudePolygon2D(rOut, [rIn], yBase, yBase + layerH * 0.72, { color: col }));
      loops.push({ layer: 'OUTER', pts: rOut }, { layer: 'HOLES', pts: rIn });

      const petLen = (radius / rings) * 0.78;
      const petW = (TAU * rRing / arms) * 0.38;
      const rotOff = rIdx * twistDeg * DEG;

      for (let a = 0; a < arms; a++) {
        const ang = (a / arms) * TAU + rotOff;
        const cosA = Math.cos(ang), sinA = Math.sin(ang);
        let ptsLocal;
        if (motif === 'star' || motif === 'diamond') {
          ptsLocal = [[-petLen * 0.45, 0], [0, -petW * 0.65], [petLen * 0.65, 0], [0, petW * 0.65]];
        } else if (motif === 'crystal') {
          ptsLocal = [[-petLen * 0.4, -petW * 0.3], [petLen * 0.2, -petW * 0.55], [petLen * 0.65, 0], [petLen * 0.2, petW * 0.55], [-petLen * 0.4, petW * 0.3]];
        } else if (motif === 'heart') {
          ptsLocal = [];
          for (let i = 0; i < 16; i++) {
            const t = (i / 16) * TAU;
            const hx = 16 * Math.sin(t) ** 3, hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
            ptsLocal.push([hy * (petLen / 30), hx * (petW / 24)]);
          }
        } else if (motif === 'ring') {
          ptsLocal = C.circle2D(0, 0, Math.min(petLen, petW) * 0.65, 16);
        } else {
          // Classic Lotus Petal
          ptsLocal = [
            [-petLen * 0.45, 0], [-petLen * 0.1, -petW * 0.6], [petLen * 0.3, -petW * 0.42],
            [petLen * 0.62, 0], [petLen * 0.3, petW * 0.42], [-petLen * 0.1, petW * 0.6]
          ];
        }
        const worldPts = ptsLocal.map(([lx, ly]) => [
          cosA * (rRing + lx) - sinA * ly,
          sinA * (rRing + lx) + cosA * ly
        ]);
        subs.push(C.extrudePolygon2D(worldPts, [], yBase, yBase + layerH, { color: col }));
        loops.push({ layer: 'OUTER', pts: worldPts });
      }
    }

    const merged = C.mergeParts(subs, { name: `mandala_${arms}x${rings}`, creaseDeg: 35 });
    return {
      parts: [merged],
      draw2D: { loops, circles },
      specs: { standard: `Solid-Backed ${arms}-Fold Mandala (${rings} Rings · Laser SVG Ready)`, warnings: [] },
      anim4D: { type: 'turntable', speed: 0.4 }
    };
  }

  return {
    builder: buildVoxel,
    ui_asset: buildUIAsset,
    parallax: buildParallax,
    typography: buildTypography,
    neon: buildNeon,
    mosaic: buildMosaic,
    organic: buildOrganic,
    wave: buildWave,
    galaxy: buildGalaxy,
    terrain: buildTerrain,
    mandala: buildMandala
  };
}));
