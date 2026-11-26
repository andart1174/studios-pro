/**
 * Design Pro Studio v4.0 — Procedural 512x512 PBR Texture & Material Engine (Three.js r165)
 * Generates crisp, cached diffuse (SRGBColorSpace) + bump/roughness maps for:
 *  - 10 Architectural Flooring Materials (Herringbone Oak, Plank, Walnut, Carrara Marble, Porcelain Tile,
 *    Microcement, Berber Carpet, Terracotta, Slate, Bistro Checker)
 *  - 8 Architectural Wall Finishes (Matte Plaster, Venetian Limewash, Acoustic Wood Slats, Loft Brick,
 *    Board Concrete, Subway Ceramic Tile, Fluted Wallpaper, Calacatta Marble)
 *  - Realistic Furniture Materials (Bouclé Fabric, Velvet, Leather, Wood Grain, Brushed Brass, Matte Steel)
 * Zero external texture downloads — 100% offline-reliable & cleanly disposable!
 */
import * as THREE from 'three';

function hexToRgb(hex) {
  const c = new THREE.Color(hex || '#cccccc');
  return { r: Math.round(c.r * 255), g: Math.round(c.g * 255), b: Math.round(c.b * 255) };
}

function shade(rgb, delta) {
  const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
  return `rgb(${clamp(rgb.r + delta)},${clamp(rgb.g + delta)},${clamp(rgb.b + delta)})`;
}

function createHashRng(seed) {
  let s = (seed >>> 0) || 1337;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const _texCache = new Map();

function makeCanvasPair(size = 512) {
  const cDiff = document.createElement('canvas');
  cDiff.width = cDiff.height = size;
  const cBump = document.createElement('canvas');
  cBump.width = cBump.height = size;
  return {
    cDiff, ctx: cDiff.getContext('2d'),
    cBump, bCtx: cBump.getContext('2d')
  };
}

function buildTextureSet(kind, hexColor, repeatX = 2, repeatY = 2) {
  const key = `${kind}|${hexColor}|${repeatX.toFixed(2)}|${repeatY.toFixed(2)}`;
  if (_texCache.has(key)) return _texCache.get(key);

  const S = 512;
  const { cDiff, ctx, cBump, bCtx } = makeCanvasPair(S);
  const rgb = hexToRgb(hexColor);
  const rng = createHashRng(kind.length * 997 + rgb.r * 31 + rgb.g * 17 + rgb.b);

  ctx.fillStyle = shade(rgb, 0);
  ctx.fillRect(0, 0, S, S);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, S, S);

  if (kind === 'parquet') {
    // Architectural Oak Herringbone Chevron Parquet!
    const cols = 8, rows = 16;
    const pw = S / cols, ph = S / rows;
    for (let r = -2; r < rows + 2; r++) {
      for (let c = 0; c < cols; c++) {
        const tone = (rng() - 0.5) * 26;
        const x = c * pw, y = r * ph;
        ctx.save();
        ctx.beginPath();
        if (c % 2 === 0) {
          ctx.moveTo(x, y); ctx.lineTo(x + pw, y + ph); ctx.lineTo(x + pw, y + ph * 2); ctx.lineTo(x, y + ph);
        } else {
          ctx.moveTo(x, y + ph); ctx.lineTo(x + pw, y); ctx.lineTo(x + pw, y + ph); ctx.lineTo(x, y + ph * 2);
        }
        ctx.closePath();
        ctx.fillStyle = shade(rgb, tone);
        ctx.fill();
        ctx.strokeStyle = shade(rgb, -36);
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Fine wood grain lines
        ctx.clip();
        ctx.strokeStyle = shade(rgb, tone - 14);
        ctx.lineWidth = 1;
        for (let g = 0; g < 6; g++) {
          ctx.beginPath();
          ctx.moveTo(x, y + g * 8);
          ctx.lineTo(x + pw, y + ph + g * 8);
          ctx.stroke();
        }
        ctx.restore();

        bCtx.strokeStyle = '#303030';
        bCtx.lineWidth = 2;
        bCtx.beginPath();
        if (c % 2 === 0) { bCtx.moveTo(x, y); bCtx.lineTo(x + pw, y + ph); }
        else { bCtx.moveTo(x, y + ph); bCtx.lineTo(x + pw, y); }
        bCtx.stroke();
      }
    }
  } else if (kind === 'wood' || kind === 'walnut') {
    // Wide Natural Oak / Walnut Planks with organic wood grain
    const planks = 6;
    const pw = S / planks;
    for (let p = 0; p < planks; p++) {
      const tone = (rng() - 0.5) * 24;
      const x = p * pw;
      ctx.fillStyle = shade(rgb, tone);
      ctx.fillRect(x, 0, pw, S);
      // Grain fibers
      for (let i = 0; i < 36; i++) {
        const gx = x + rng() * pw;
        ctx.strokeStyle = shade(rgb, tone + (rng() > 0.5 ? -14 : 9));
        ctx.lineWidth = 0.8 + rng() * 1.4;
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.bezierCurveTo(gx + (rng() - 0.5) * 10, S * 0.33, gx + (rng() - 0.5) * 10, S * 0.66, gx, S);
        ctx.stroke();
      }
      // Plank joint groove
      ctx.fillStyle = shade(rgb, -42);
      ctx.fillRect(x, 0, 2, S);
      bCtx.fillStyle = '#252525';
      bCtx.fillRect(x, 0, 2.5, S);
      // Horizontal stagger butt joint
      const jy = Math.floor(((p * 193) % S));
      ctx.fillRect(x, jy, pw, 2);
      bCtx.fillRect(x, jy, pw, 2.5);
    }
  } else if (kind === 'marble' || kind === 'marble_wall') {
    // Carrara / Calacatta Natural Veined Marble!
    for (let i = 0; i < 24; i++) {
      ctx.strokeStyle = `rgba(${Math.max(0, rgb.r - 55)},${Math.max(0, rgb.g - 55)},${Math.max(0, rgb.b - 50)},${0.08 + rng() * 0.22})`;
      ctx.lineWidth = 1.2 + rng() * 6.5;
      ctx.beginPath();
      let x = rng() * S, y = 0;
      ctx.moveTo(x, y);
      for (let seg = 1; seg <= 6; seg++) {
        x += (rng() - 0.42) * 120;
        y = (seg / 6) * S;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // Large marble slab grout lines
    ctx.strokeStyle = shade(rgb, -24);
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, S - 2, S - 2);
    ctx.beginPath(); ctx.moveTo(S / 2, 0); ctx.lineTo(S / 2, S); ctx.stroke();
    bCtx.strokeStyle = '#484848'; bCtx.lineWidth = 2; bCtx.strokeRect(1, 1, S - 2, S - 2);
  } else if (kind === 'tile' || kind === 'terracotta' || kind === 'slate') {
    const grid = kind === 'tile' ? 2 : 4;
    const cell = S / grid;
    for (let r = 0; r < grid; r++) {
      for (let c = 0; c < grid; c++) {
        const tone = (rng() - 0.5) * (kind === 'slate' ? 28 : 16);
        ctx.fillStyle = shade(rgb, tone);
        ctx.fillRect(c * cell + 3, r * cell + 3, cell - 6, cell - 6);
        // Subtle stone speckle
        for (let k = 0; k < 45; k++) {
          ctx.fillStyle = shade(rgb, tone + (rng() - 0.5) * 20);
          ctx.fillRect(c * cell + 4 + rng() * (cell - 8), r * cell + 4 + rng() * (cell - 8), 2, 2);
        }
        bCtx.fillStyle = '#a0a0a0';
        bCtx.fillRect(c * cell + 3, r * cell + 3, cell - 6, cell - 6);
      }
    }
    // Crisp grout lines
    ctx.strokeStyle = shade(rgb, -38);
    ctx.lineWidth = 4;
    bCtx.strokeStyle = '#202020';
    bCtx.lineWidth = 5;
    for (let i = 0; i <= grid; i++) {
      ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(S, i * cell); ctx.stroke();
      bCtx.beginPath(); bCtx.moveTo(i * cell, 0); bCtx.lineTo(i * cell, S); bCtx.stroke();
      bCtx.beginPath(); bCtx.moveTo(0, i * cell); bCtx.lineTo(S, i * cell); bCtx.stroke();
    }
  } else if (kind === 'checker') {
    const n = 4, cell = S / n;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const dark = (r + c) % 2 === 1;
        ctx.fillStyle = dark ? '#262930' : '#f2eee6';
        ctx.fillRect(c * cell, r * cell, cell, cell);
      }
    }
  } else if (kind === 'wood_slats') {
    // Designer Vertical Acoustic Oak Slats over Dark Acoustic Felt!
    ctx.fillStyle = '#1b1d22';
    ctx.fillRect(0, 0, S, S);
    bCtx.fillStyle = '#101010';
    bCtx.fillRect(0, 0, S, S);
    const slats = 16;
    const pitch = S / slats;
    const slatW = pitch * 0.66;
    for (let i = 0; i < slats; i++) {
      const x = i * pitch + (pitch - slatW) * 0.5;
      const tone = (rng() - 0.5) * 18;
      const grad = ctx.createLinearGradient(x, 0, x + slatW, 0);
      grad.addColorStop(0, shade(rgb, tone - 18));
      grad.addColorStop(0.25, shade(rgb, tone + 10));
      grad.addColorStop(0.85, shade(rgb, tone + 4));
      grad.addColorStop(1, shade(rgb, tone - 24));
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, slatW, S);
      bCtx.fillStyle = '#efefef';
      bCtx.fillRect(x, 0, slatW, S);
    }
  } else if (kind === 'brick') {
    // Authentic Loft Exposed Brick with Mortar!
    ctx.fillStyle = '#cfc9be';
    ctx.fillRect(0, 0, S, S);
    bCtx.fillStyle = '#252525';
    bCtx.fillRect(0, 0, S, S);
    const rows = 12, cols = 4;
    const bh = S / rows, bw = S / cols;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * (bw * 0.5);
      for (let c = -1; c <= cols; c++) {
        const tone = (rng() - 0.5) * 34;
        ctx.fillStyle = shade(rgb, tone);
        ctx.fillRect(c * bw + off + 3, r * bh + 3, bw - 6, bh - 6);
        bCtx.fillStyle = '#d0d0d0';
        bCtx.fillRect(c * bw + off + 3, r * bh + 3, bw - 6, bh - 6);
      }
    }
  } else if (kind === 'subway_tile') {
    ctx.fillStyle = '#d4d8dd';
    ctx.fillRect(0, 0, S, S);
    const rows = 10, cols = 4;
    const bh = S / rows, bw = S / cols;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * (bw * 0.5);
      for (let c = -1; c <= cols; c++) {
        ctx.fillStyle = shade(rgb, (rng() - 0.5) * 8);
        ctx.fillRect(c * bw + off + 2, r * bh + 2, bw - 4, bh - 4);
        bCtx.fillStyle = '#d8d8d8';
        bCtx.fillRect(c * bw + off + 2, r * bh + 2, bw - 4, bh - 4);
      }
    }
  } else if (kind === 'wallpaper') {
    // Fluted Vertical Luxury Wallpaper
    for (let x = 0; x < S; x += 8) {
      ctx.fillStyle = shade(rgb, (x % 16 === 0) ? 7 : -7);
      ctx.fillRect(x, 0, 4, S);
      bCtx.fillStyle = (x % 16 === 0) ? '#b0b0b0' : '#656565';
      bCtx.fillRect(x, 0, 4, S);
    }
  } else if (kind === 'carpet' || kind === 'fabric') {
    // Woven Bouclé / Linen / Berber Textile Weave!
    for (let y = 0; y < S; y += 4) {
      for (let x = 0; x < S; x += 4) {
        const d = ((x + y) % 8 === 0 ? 9 : -8) + (rng() - 0.5) * 14;
        ctx.fillStyle = shade(rgb, d);
        ctx.fillRect(x, y, 4, 4);
        const b = Math.round(128 + d * 2.5);
        bCtx.fillStyle = `rgb(${b},${b},${b})`;
        bCtx.fillRect(x, y, 4, 4);
      }
    }
  } else {
    // Matte Plaster / Venetian Limewash / Architectural Microcement
    const clouds = kind === 'plaster' || kind === 'concrete' ? 140 : 40;
    for (let i = 0; i < clouds; i++) {
      const cx = rng() * S, cy = rng() * S, rad = 24 + rng() * 90;
      const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, rad);
      const d = (rng() - 0.5) * (kind === 'concrete' ? 28 : 18);
      g.addColorStop(0, `rgba(${Math.max(0, Math.min(255, rgb.r + d))},${Math.max(0, Math.min(255, rgb.g + d))},${Math.max(0, Math.min(255, rgb.b + d))},0.22)`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    }
  }

  const map = new THREE.CanvasTexture(cDiff);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(repeatX, repeatY);
  map.anisotropy = 4;

  const bumpMap = new THREE.CanvasTexture(cBump);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(repeatX, repeatY);

  const pair = { map, bumpMap };
  _texCache.set(key, pair);
  return pair;
}

export function createFloorMaterial(kind, hexColor, roomW_m, roomD_m) {
  const repX = Math.max(1, roomW_m / 1.4);
  const repY = Math.max(1, roomD_m / 1.4);
  const { map, bumpMap } = buildTextureSet(kind, hexColor, repX, repY);
  const roughnessMap = {
    marble: 0.14, tile: 0.24, checker: 0.22, parquet: 0.36, wood: 0.44,
    walnut: 0.34, concrete: 0.52, terracotta: 0.62, slate: 0.58, carpet: 0.94
  };
  return new THREE.MeshStandardMaterial({
    map,
    bumpMap,
    bumpScale: kind === 'carpet' ? 0.014 : 0.006,
    roughness: roughnessMap[kind] ?? 0.45,
    metalness: kind === 'marble' ? 0.08 : 0.02
  });
}

export function createWallMaterial(kind, hexColor, lenM, heightM) {
  const repX = Math.max(1, lenM / 1.5);
  const repY = Math.max(1, heightM / 1.5);
  const { map, bumpMap } = buildTextureSet(kind, hexColor, repX, repY);
  const rough = {
    marble_wall: 0.16, subway_tile: 0.20, wood_slats: 0.46,
    wallpaper: 0.68, plaster: 0.72, concrete: 0.78, brick: 0.86, paint: 0.84
  };
  return new THREE.MeshStandardMaterial({
    map,
    bumpMap,
    bumpScale: kind === 'wood_slats' ? 0.032 : kind === 'brick' ? 0.022 : 0.008,
    roughness: rough[kind] ?? 0.82,
    metalness: kind === 'marble_wall' ? 0.06 : 0.0
  });
}

export function createFabricMaterial(hexColor, repeat = 2) {
  const { map, bumpMap } = buildTextureSet('fabric', hexColor, repeat, repeat);
  return new THREE.MeshStandardMaterial({
    map, bumpMap, bumpScale: 0.01, roughness: 0.88, metalness: 0.0
  });
}

export function createWoodMaterial(hexColor, repeat = 1.5) {
  const { map, bumpMap } = buildTextureSet('wood', hexColor, repeat, repeat);
  return new THREE.MeshStandardMaterial({
    map, bumpMap, bumpScale: 0.005, roughness: 0.42, metalness: 0.04
  });
}

export function createMetalMaterial(hexColor, roughness = 0.26) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(hexColor || '#c9a352'),
    roughness,
    metalness: 0.85
  });
}

export function disposeAllCachedTextures() {
  _texCache.forEach(({ map, bumpMap }) => {
    try { map.dispose(); } catch (_) {}
    try { bumpMap.dispose(); } catch (_) {}
  });
  _texCache.clear();
}
