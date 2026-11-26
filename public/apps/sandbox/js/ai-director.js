/**
 * Zen Sandscape v4.0 — AI Living World Director, 12 Masterpiece Presets,
 * Natural-Language Prompt Composer (EN/FR), Palette Harmonizer & Full-Color Photo-to-Living-Sand!
 * Zero DOM dependencies — 100% Node.js testable!
 */
(function (globalScope) {
  'use strict';

  function SM() { return globalScope.SandMaterials; }

  const LIVING_WORLDS = [
    { id: 'kyoto',     icon: '🌸', en: 'Kyoto Sakura Waterfall',  fr: 'Cascade Sakura Kyoto',    palette: 'sakura',   backdrop: 'obsidian', grav: 1, wind: 0, bloom: true,  trails: false },
    { id: 'blackhole', icon: '🌌', en: 'Cosmic Black Hole',       fr: 'Trou Noir Nébuleuse',     palette: 'cyber',    backdrop: 'space',    grav: 0, wind: 0, bloom: true,  trails: true  },
    { id: 'volcano',   icon: '🌋', en: 'Obsidian Volcano',        fr: 'Volcan & Cristaux',       palette: 'obsidian', backdrop: 'obsidian', grav: 1, wind: 0, bloom: true,  trails: false },
    { id: 'lasers',    icon: '💎', en: 'Laser Prism Cathedral',   fr: 'Cathédrale Lasers',       palette: 'cyber',    backdrop: 'space',    grav: 1, wind: 0, bloom: true,  trails: true  },
    { id: 'musicbox',  icon: '🎵', en: 'Kinetic Piano Loop',      fr: 'Boîte à Musique Sable',   palette: 'kintsugi', backdrop: 'obsidian', grav: 1, wind: 0, bloom: true,  trails: false },
    { id: 'reef',      icon: '🐠', en: 'Bioluminescent Reef',     fr: 'Récif Bioluminescent',    palette: 'ocean',    backdrop: 'aurora',   grav: 1, wind: 0, bloom: true,  trails: false },
    { id: 'tesla',     icon: '⚡', en: 'Tesla Circuit Temple',    fr: 'Temple Tesla & Circuits', palette: 'aurora',   backdrop: 'space',    grav: 1, wind: 0, bloom: true,  trails: true  },
    { id: 'glacier',   icon: '❄️', en: 'Alpine Aurora Glacier',   fr: 'Glacier Aurore Boréale',  palette: 'aurora',   backdrop: 'aurora',   grav: 1, wind: 1, bloom: true,  trails: false },
    { id: 'terrarium', icon: '🌿', en: 'Botanical Terrarium',     fr: 'Terrarium Botanique',     palette: 'sakura',   backdrop: 'obsidian', grav: 1, wind: 0, bloom: false, trails: false },
    { id: 'mandala',   icon: '⏳', en: 'Kintsugi Hourglass',      fr: 'Sablier Kintsugi Or',     palette: 'kintsugi', backdrop: 'obsidian', grav: 1, wind: 0, bloom: true,  trails: false },
    { id: 'fireworks', icon: '🎆', en: 'Fireworks Symphony',      fr: 'Symphonie Feux Artifice', palette: 'prism',    backdrop: 'space',    grav: 1, wind: 0, bloom: true,  trails: true  },
    { id: 'oasis',     icon: '🏛️', en: 'Sahara Pyramid Oasis',    fr: 'Pyramide & Oasis Sahara', palette: 'sahara',   backdrop: 'obsidian', grav: 1, wind: 1, bloom: true,  trails: false }
  ];

  // Helper drawing primitives directly onto SandboxEngine
  function fillRect(eng, x0, y0, x1, y1, matId, col) {
    const { varyPacked } = SM();
    const minX = Math.max(0, Math.min(x0, x1) | 0), maxX = Math.min(eng.w - 1, Math.max(x0, x1) | 0);
    const minY = Math.max(0, Math.min(y0, y1) | 0), maxY = Math.min(eng.h - 1, Math.max(y0, y1) | 0);
    for (let y = minY; y <= maxY; y++) {
      const row = y * eng.w;
      for (let x = minX; x <= maxX; x++) {
        eng.setCell(row + x, matId, varyPacked(col, 8), 0);
      }
    }
  }

  function fillDisc(eng, cx, cy, r, matId, col, metaVal = 0) {
    const { varyPacked } = SM();
    for (let dy = -r; dy <= r; dy++) {
      const y = (cy + dy) | 0;
      if (y < 0 || y >= eng.h) continue;
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const x = (cx + dx) | 0;
        if (x < 0 || x >= eng.w) continue;
        eng.setCell(y * eng.w + x, matId, varyPacked(col, 10), metaVal);
      }
    }
  }

  function drawLine(eng, x0, y0, x1, y1, radius, matId, col, metaVal = 0) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0;
    for (let s = 0; s <= steps; s++) {
      const t = steps ? s / steps : 0;
      fillDisc(eng, Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), radius, matId, col, metaVal);
    }
  }

  function paintStrataTerrain(eng, heightFn, matId) {
    const { samplePalettePacked, varyPacked } = SM();
    for (let x = 0; x < eng.w; x++) {
      const topY = Math.max(20, Math.min(eng.h - 2, Math.round(heightFn(x))));
      for (let y = topY; y < eng.h; y++) {
        const band = ((y + Math.sin(x * 0.03) * 10) / 90) % 1;
        const col = varyPacked(samplePalettePacked(eng.paletteId, band), 10);
        eng.setCell(y * eng.w + x, matId, col, 0);
      }
    }
  }

  // Build ANY of the 12 Living Masterpiece Scenes!
  function buildWorld(eng, worldId, customOpts = {}) {
    const { MAT, packRGBA, samplePalettePacked, varyPacked } = SM();
    const meta = LIVING_WORLDS.find(w => w.id === worldId) || LIVING_WORLDS[0];
    const w = eng.w, h = eng.h;

    eng.clear();
    eng.paletteId = customOpts.palette || meta.palette;
    eng.autoStrata = true;
    eng.gravY = customOpts.grav !== undefined ? customOpts.grav : meta.grav;
    eng.windX = customOpts.wind !== undefined ? customOpts.wind : meta.wind;

    const stoneCol = packRGBA(78, 86, 104, 255);
    const goldCol  = packRGBA(245, 197, 66, 255);
    const waterCol = packRGBA(56, 189, 248, 255);
    const lavaCol  = packRGBA(249, 65, 25, 255);

    if (meta.id === 'kyoto') {
      // Stratified Zen Dunes + Koi Pond + Stone Waterfall Terrace + Sakura Tree + Piano Chime!
      paintStrataTerrain(eng, x => {
        if (x < w * 0.30) return h * 0.44 + Math.sin(x * 0.025) * 14;
        if (x < w * 0.68) return h * 0.80 + Math.sin(x * 0.04) * 6;
        return h * 0.62 - Math.sin((x - w * 0.68) * 0.025) * 26;
      }, MAT.WALL);
      // Raked Golden Kintsugi Sand layer over right hill
      for (let x = Math.floor(w * 0.68); x < w; x++) {
        const baseY = Math.round(h * 0.62 - Math.sin((x - w * 0.68) * 0.025) * 26);
        for (let y = baseY - 22; y < baseY; y++) {
          eng.setCell(y * w + x, (y % 5 === 0) ? MAT.GOLD : MAT.SAND, varyPacked(samplePalettePacked(eng.paletteId, (y % 30) / 30), 10), 0);
        }
      }
      // Koi Pond filled with shimmering Water + Koi Fish!
      for (let x = Math.floor(w * 0.31); x < Math.floor(w * 0.67); x++) {
        for (let y = Math.floor(h * 0.66); y < Math.floor(h * 0.78); y++) {
          if (eng.types[y * w + x] === 0) eng.setCell(y * w + x, MAT.WATER, varyPacked(waterCol, 12), 0);
        }
      }
      for (let f = 0; f < 16; f++) {
        const fx = Math.floor(w * 0.36 + Math.random() * w * 0.26);
        const fy = Math.floor(h * 0.69 + Math.random() * h * 0.07);
        eng.setCell(fy * w + fx, MAT.FISH, packRGBA(251, 146, 60, 255), f % 2 + 1);
      }
      // Waterfall Emitter on Left Cliff + Tuned Chime Piano stepping stones!
      fillRect(eng, Math.floor(w * 0.24), Math.floor(h * 0.20), Math.floor(w * 0.27), Math.floor(h * 0.21), MAT.WATER, waterCol);
      fillRect(eng, Math.floor(w * 0.24), Math.floor(h * 0.22), Math.floor(w * 0.27), Math.floor(h * 0.23), MAT.EMITTER, packRGBA(99, 102, 241, 255));
      drawLine(eng, Math.floor(w * 0.28), Math.floor(h * 0.42), Math.floor(w * 0.34), Math.floor(h * 0.45), 3, MAT.PIANO, goldCol);
      // Blooming Sakura Tree on Right Hill
      const tx = Math.floor(w * 0.80), ty = Math.floor(h * 0.56);
      drawLine(eng, tx, ty, tx - 14, ty - 70, 5, MAT.WOOD, packRGBA(105, 62, 42, 255));
      drawLine(eng, tx - 10, ty - 45, tx + 26, ty - 78, 3, MAT.WOOD, packRGBA(105, 62, 42, 255));
      drawLine(eng, tx - 14, ty - 70, tx - 48, ty - 92, 3, MAT.WOOD, packRGBA(105, 62, 42, 255));
      [[tx - 42, ty - 95, 24], [tx - 12, ty - 84, 28], [tx + 24, ty - 84, 24], [tx + 2, ty - 104, 22]].forEach(([bx, by, br]) => {
        for (let dy = -br; dy <= br; dy++) {
          for (let dx = -br; dx <= br; dx++) {
            if (dx * dx + dy * dy <= br * br && Math.random() < 0.65) {
              const px = bx + dx, py = by + dy;
              if (eng.inBounds(px, py) && eng.types[py * w + px] === 0) {
                eng.setCell(py * w + px, MAT.LEAF, varyPacked(packRGBA(249, 168, 212, 255), 22), 0);
              }
            }
          }
        }
      });
      // Soft ambient sky stardust
      for (let s = 0; s < 140; s++) {
        const sx = (Math.random() * w) | 0, sy = (Math.random() * h * 0.35) | 0;
        if (eng.types[sy * w + sx] === 0) eng.setCell(sy * w + sx, MAT.STARDUST, varyPacked(packRGBA(253, 224, 71, 255), 24), (Math.random() * 255) | 0);
      }
    } else if (meta.id === 'blackhole') {
      // Central Black Hole Vortex + Luminous Spiral Galaxy of Stardust & Gold Leaf!
      const cx = (w * 0.5) | 0, cy = (h * 0.5) | 0;
      fillDisc(eng, cx, cy, 18, MAT.VORTEX, packRGBA(126, 34, 206, 255));
      for (let arm = 0; arm < 4; arm++) {
        for (let t = 0; t < 420; t++) {
          const frac = t / 420;
          const r = 34 + frac * Math.min(w, h) * 0.44;
          const ang = arm * (Math.PI * 0.5) + frac * 4.8 + (Math.random() - 0.5) * 0.35;
          const px = Math.round(cx + Math.cos(ang) * r);
          const py = Math.round(cy + Math.sin(ang) * r * 0.78);
          if (eng.inBounds(px, py) && eng.types[py * w + px] === 0) {
            const mat = Math.random() < 0.30 ? MAT.GOLD : (Math.random() < 0.75 ? MAT.STARDUST : MAT.SAND);
            eng.setCell(py * w + px, mat, varyPacked(samplePalettePacked(eng.paletteId, frac), 18), (t * 3) & 255);
          }
        }
      }
    } else if (meta.id === 'volcano') {
      // Symmetrical Volcanic Caldera + Flowing Magma + Cool Waterfall Creating Obsidian & Crystals!
      paintStrataTerrain(eng, x => {
        const d = Math.abs(x - w * 0.5);
        if (d < 28) return h * 0.42;
        return Math.min(h - 32, h * 0.30 + d * 0.92);
      }, MAT.OBSIDIAN);
      fillRect(eng, Math.floor(w * 0.5) - 16, Math.floor(h * 0.36), Math.floor(w * 0.5) + 16, Math.floor(h * 0.41), MAT.LAVA, lavaCol);
      fillRect(eng, Math.floor(w * 0.5) - 12, Math.floor(h * 0.25), Math.floor(w * 0.5) + 12, Math.floor(h * 0.26), MAT.LAVA, lavaCol);
      fillRect(eng, Math.floor(w * 0.5) - 12, Math.floor(h * 0.27), Math.floor(w * 0.5) + 12, Math.floor(h * 0.28), MAT.EMITTER, packRGBA(99, 102, 241, 255));
      // Glowing Crystal Clusters on lower slopes
      [w * 0.16, w * 0.24, w * 0.76, w * 0.84].forEach(cx => {
        fillDisc(eng, cx, h - 38, 12, MAT.CRYSTAL, packRGBA(192, 132, 252, 255), 0);
      });
      // Storm Cloud raining cooling water on right side
      fillRect(eng, Math.floor(w * 0.68), 32, Math.floor(w * 0.88), 46, MAT.CLOUD, packRGBA(203, 213, 225, 255));
    } else if (meta.id === 'lasers') {
      // Precision Optical Cathedral: Lasers + Mirrors + Glass Prisms + Ice + Piano Chimes!
      fillDisc(eng, 45, 95, 7, MAT.LASER, packRGBA(244, 63, 94, 255), 0);   // Right
      fillDisc(eng, 45, 220, 7, MAT.LASER, packRGBA(56, 189, 248, 255), 0); // Right
      fillDisc(eng, w - 45, 310, 7, MAT.LASER, packRGBA(168, 85, 247, 255), 2); // Left
      // Glass Prism Diamonds in center!
      fillDisc(eng, Math.floor(w * 0.36), 95, 20, MAT.GLASS, packRGBA(186, 230, 253, 220));
      fillDisc(eng, Math.floor(w * 0.52), 220, 24, MAT.GLASS, packRGBA(186, 230, 253, 220));
      // Mirrors reflecting beams
      fillRect(eng, Math.floor(w * 0.72), 82, Math.floor(w * 0.74), 108, MAT.MIRROR, packRGBA(226, 232, 240, 255));
      fillRect(eng, Math.floor(w * 0.78), 205, Math.floor(w * 0.80), 235, MAT.MIRROR, packRGBA(226, 232, 240, 255));
      fillRect(eng, Math.floor(w * 0.25), 296, Math.floor(w * 0.27), 324, MAT.MIRROR, packRGBA(226, 232, 240, 255));
      // Golden Stardust & Piano chimes below
      drawLine(eng, 100, h - 55, w - 100, h - 55, 5, MAT.PIANO, goldCol);
      for (let i = 0; i < 450; i++) {
        eng.setCell(((30 + Math.random() * 140) | 0) * w + ((80 + Math.random() * (w - 160)) | 0), MAT.STARDUST, varyPacked(samplePalettePacked('cyber', Math.random()), 20), (Math.random() * 255) | 0);
      }
    } else if (meta.id === 'musicbox') {
      // Self-Playing Infinite Portal + Chime Piano Cascade!
      fillRect(eng, Math.floor(w * 0.20), 26, Math.floor(w * 0.26), 34, MAT.PORTAL_OUT, packRGBA(249, 115, 22, 255));
      fillRect(eng, Math.floor(w * 0.70), h - 22, Math.floor(w * 0.82), h - 14, MAT.PORTAL_IN, packRGBA(37, 99, 235, 255));
      // 6 Descending Musical Piano Steps!
      for (let s = 0; s < 6; s++) {
        const px = Math.floor(w * (0.18 + s * 0.105));
        const py = Math.floor(85 + s * 48);
        drawLine(eng, px, py, px + 62, py + 24, 4, MAT.PIANO, varyPacked(goldCol, 24));
      }
      // Pour initial Gold Leaf & Strata Sand stream!
      for (let k = 0; k < 220; k++) {
        const sx = Math.floor(w * 0.20 + Math.random() * 34);
        const sy = Math.floor(40 + Math.random() * 40);
        eng.setCell(sy * w + sx, k % 3 === 0 ? MAT.GOLD : MAT.SAND, varyPacked(samplePalettePacked('kintsugi', k / 220), 12), 0);
      }
    } else if (meta.id === 'reef') {
      // Deep Ocean Water Basin + Coral Crystals + Swimming Koi Shoal + Sunlit Sand Floor!
      paintStrataTerrain(eng, x => h * 0.78 + Math.sin(x * 0.03) * 16 + Math.cos(x * 0.07) * 8, MAT.SAND);
      for (let y = Math.floor(h * 0.22); y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (eng.types[y * w + x] === 0) eng.setCell(y * w + x, MAT.WATER, varyPacked(packRGBA(14, 145, 218, 235), 14), 0);
        }
      }
      // Bioluminescent Coral Crystals
      [0.18, 0.35, 0.55, 0.74, 0.88].forEach((f, idx) => {
        const col = samplePalettePacked(idx % 2 === 0 ? 'sakura' : 'aurora', idx * 0.22);
        fillDisc(eng, Math.floor(w * f), Math.floor(h * 0.74), 16, MAT.CRYSTAL, col, 0);
      });
      // 40 Swimming Koi Fish!
      for (let f = 0; f < 40; f++) {
        const fx = (40 + Math.random() * (w - 80)) | 0;
        const fy = (h * 0.30 + Math.random() * h * 0.38) | 0;
        eng.setCell(fy * w + fx, MAT.FISH, f % 2 === 0 ? packRGBA(251, 146, 60, 255) : packRGBA(244, 63, 94, 255), (f & 1) + 1);
      }
    } else if (meta.id === 'tesla') {
      // Storm Clouds + Copper Wire Circuit + Flow Sensor + Auto Gate + Firework Launchers!
      fillRect(eng, 40, 26, w - 40, 44, MAT.CLOUD, packRGBA(148, 163, 184, 255));
      // Sensor Funnel at top-center
      drawLine(eng, w * 0.38, 125, w * 0.47, 155, 4, MAT.WALL, stoneCol);
      drawLine(eng, w * 0.62, 125, w * 0.53, 155, 4, MAT.WALL, stoneCol);
      fillRect(eng, Math.floor(w * 0.47), 152, Math.floor(w * 0.53), 160, MAT.SENSOR, packRGBA(16, 185, 129, 255));
      // Copper Wire branching left to Auto Gate & right to Firework pad!
      drawLine(eng, Math.floor(w * 0.47), 156, Math.floor(w * 0.24), 156, 2, MAT.WIRE, packRGBA(217, 119, 6, 255));
      drawLine(eng, Math.floor(w * 0.24), 156, Math.floor(w * 0.24), 255, 2, MAT.WIRE, packRGBA(217, 119, 6, 255));
      fillRect(eng, Math.floor(w * 0.20), 255, Math.floor(w * 0.28), 265, MAT.DOOR, packRGBA(120, 113, 108, 255));
      drawLine(eng, Math.floor(w * 0.53), 156, Math.floor(w * 0.76), 156, 2, MAT.WIRE, packRGBA(217, 119, 6, 255));
      drawLine(eng, Math.floor(w * 0.76), 156, Math.floor(w * 0.76), 275, 2, MAT.WIRE, packRGBA(217, 119, 6, 255));
      fillDisc(eng, Math.floor(w * 0.76), 275, 6, MAT.FIREWORK, packRGBA(251, 113, 133, 255), 35);
      // Initial Spark on circuit
      eng.setCell(156 * w + Math.floor(w * 0.45), MAT.SPARK, packRGBA(254, 240, 138, 255), 0);
    } else if (meta.id === 'glacier') {
      paintStrataTerrain(eng, x => h * 0.62 - Math.abs(Math.sin(x * 0.015)) * 125 + Math.cos(x * 0.04) * 18, MAT.ICE);
      fillRect(eng, 20, 18, w - 20, 34, MAT.CLOUD, packRGBA(203, 213, 225, 255));
      for (let i = 0; i < 650; i++) {
        const sx = (Math.random() * w) | 0, sy = (40 + Math.random() * 140) | 0;
        if (eng.types[sy * w + sx] === 0) {
          eng.setCell(sy * w + sx, i % 4 === 0 ? MAT.STARDUST : MAT.SNOW, i % 4 === 0 ? varyPacked(samplePalettePacked('aurora', sx / w), 14) : packRGBA(226, 241, 255, 255), (Math.random() * 255) | 0);
        }
      }
    } else if (meta.id === 'terrarium') {
      // Crystal Glass Terrarium Bowl + Flora Seeds + Rain + Bees + Ants!
      const cx = (w * 0.5) | 0, cy = (h * 0.54) | 0, rad = Math.min(w, h) * 0.40;
      for (let a = 0; a < 360; a += 0.5) {
        const r = a * Math.PI / 180;
        fillDisc(eng, Math.round(cx + Math.cos(r) * rad), Math.round(cy + Math.sin(r) * rad), 3, MAT.GLASS, packRGBA(186, 230, 253, 220));
      }
      for (let x = cx - rad + 12; x <= cx + rad - 12; x++) {
        const dy = Math.sqrt(Math.max(0, (rad - 6) * (rad - 6) - (x - cx) * (x - cx)));
        const bot = Math.floor(cy + dy);
        for (let y = Math.floor(cy + rad * 0.45); y < bot; y++) {
          eng.setCell(y * w + x, MAT.SAND, varyPacked(packRGBA(110, 74, 48, 255), 14), 0);
        }
      }
      for (let s = -4; s <= 4; s++) {
        eng.setCell(Math.floor(cy + rad * 0.40) * w + Math.floor(cx + s * 24), MAT.PLANT, packRGBA(34, 175, 76, 255), 1);
      }
      for (let b = 0; b < 16; b++) {
        eng.setCell(Math.floor(cy - 30 + Math.random() * 60) * w + Math.floor(cx - 70 + Math.random() * 140), MAT.BEE, packRGBA(250, 204, 21, 255), (b & 1) + 1);
      }
      fillRect(eng, cx - 55, Math.floor(cy - rad + 22), cx + 55, Math.floor(cy - rad + 32), MAT.CLOUD, packRGBA(203, 213, 225, 255));
    } else if (meta.id === 'mandala') {
      // Kintsugi Golden Hourglass Funnel pouring Rainbow Mineral Strata!
      const cx = (w * 0.5) | 0;
      drawLine(eng, cx - 150, 50, cx - 16, 175, 5, MAT.GLASS, packRGBA(186, 230, 253, 230));
      drawLine(eng, cx + 150, 50, cx + 16, 175, 5, MAT.GLASS, packRGBA(186, 230, 253, 230));
      drawLine(eng, cx - 16, 175, cx - 165, h - 38, 5, MAT.GLASS, packRGBA(186, 230, 253, 230));
      drawLine(eng, cx + 16, 175, cx + 165, h - 38, 5, MAT.GLASS, packRGBA(186, 230, 253, 230));
      drawLine(eng, cx - 165, h - 38, cx + 165, h - 38, 5, MAT.WALL, goldCol);
      for (let y = 55; y < 162; y++) {
        const halfW = Math.max(10, Math.round(140 * (1 - (y - 50) / 132)));
        for (let x = cx - halfW; x <= cx + halfW; x++) {
          const mat = (y % 9 === 0) ? MAT.GOLD : MAT.SAND;
          eng.setCell(y * w + x, mat, varyPacked(samplePalettePacked(eng.paletteId, (y - 55) / 110), 10), 0);
        }
      }
    } else if (meta.id === 'fireworks') {
      // Night Skyline + Reflective Water + 6 Launching Multi-Color Fireworks!
      for (let x = 0; x < w; x++) {
        const bldgH = 26 + ((Math.floor(x / 36) * 53) % 58);
        for (let y = h - 32 - bldgH; y < h - 32; y++) {
          eng.setCell(y * w + x, MAT.WALL, packRGBA(28, 36, 56, 255), 0);
        }
        for (let y = h - 32; y < h; y++) {
          eng.setCell(y * w + x, MAT.WATER, packRGBA(14, 116, 168, 240), 0);
        }
      }
      for (let k = 0; k < 6; k++) {
        const fx = Math.floor(w * (0.14 + k * 0.145));
        const fy = h - 105;
        eng.setCell(fy * w + fx, MAT.FIREWORK, samplePalettePacked('prism', k / 6), 24 + k * 7);
        fillRect(eng, fx - 4, fy + 4, fx + 4, fy + 6, MAT.EMITTER, packRGBA(99, 102, 241, 255));
      }
    } else if (meta.id === 'oasis') {
      // Sahara Sunset Stratified Dunes + Golden Pyramid + Turquoise Oasis!
      paintStrataTerrain(eng, x => h * 0.72 + Math.sin(x * 0.016) * 26, MAT.SAND);
      // Golden Pyramid centered left
      const px = Math.floor(w * 0.34), baseY = Math.floor(h * 0.74);
      for (let dy = 0; dy < 130; dy++) {
        const half = Math.round(dy * 0.85);
        for (let dx = -half; dx <= half; dx++) {
          const gx = px + dx, gy = baseY - 130 + dy;
          if (eng.inBounds(gx, gy)) {
            const col = dx < 0 ? packRGBA(234, 179, 8, 255) : packRGBA(180, 120, 22, 255);
            eng.setCell(gy * w + gx, dy % 14 === 0 ? MAT.GOLD : MAT.WALL, varyPacked(col, 8), 0);
          }
        }
      }
      // Shimmering Oasis Pool right
      for (let x = Math.floor(w * 0.56); x < Math.floor(w * 0.88); x++) {
        for (let y = Math.floor(h * 0.73); y < Math.floor(h * 0.82); y++) {
          eng.setCell(y * w + x, MAT.WATER, varyPacked(packRGBA(20, 184, 166, 240), 12), 0);
        }
      }
      // Palm tree on oasis bank
      drawLine(eng, Math.floor(w * 0.88), Math.floor(h * 0.74), Math.floor(w * 0.86), Math.floor(h * 0.52), 4, MAT.WOOD, packRGBA(124, 77, 43, 255));
      fillDisc(eng, Math.floor(w * 0.86), Math.floor(h * 0.49), 18, MAT.LEAF, packRGBA(34, 197, 94, 255));
    }

    eng._scanSpecials();
    eng.pushUndo();
    return meta;
  }

  // Natural-Language AI Prompt Parser (EN & FR!)
  function parseArtPrompt(promptText) {
    const q = String(promptText || '').toLowerCase();
    let worldId = 'kyoto';
    if (/black.?hole|trou noir|galaxy|galaxie|nebula|nébuleuse|cosmos|space|espace/.test(q)) worldId = 'blackhole';
    else if (/sakura|kyoto|zen|waterfall|cascade|japan|japon/.test(q)) worldId = 'kyoto';
    else if (/volcan|magma|lava|lave|obsidian|obsidienne|crystal|cristal/.test(q)) worldId = 'volcano';
    else if (/laser|prism|prisme|mirror|miroir|neon|néon|cyber/.test(q)) worldId = 'lasers';
    else if (/piano|music|musique|melod|symphon|chime|son/.test(q)) worldId = 'musicbox';
    else if (/reef|récif|ocean|océan|fish|poisson|coral|corail|sea|mer/.test(q)) worldId = 'reef';
    else if (/tesla|circuit|electric|électriq|lightning|éclair|storm|orage/.test(q)) worldId = 'tesla';
    else if (/glacier|snow|neige|ice|glace|winter|hiver|aurora|aurore/.test(q)) worldId = 'glacier';
    else if (/terrarium|forest|forêt|tree|arbre|bee|abeille|botanic|jardin|plant/.test(q)) worldId = 'terrarium';
    else if (/mandala|hourglass|sablier|kintsugi/.test(q)) worldId = 'mandala';
    else if (/firework|feu.?d.?artifice|festival|celebrat|starburst/.test(q)) worldId = 'fireworks';
    else if (/pyramid|pyramide|desert|désert|sahara|oasis|dune/.test(q)) worldId = 'oasis';

    let palette = null;
    if (/gold|or|doré|kintsugi/.test(q)) palette = 'kintsugi';
    else if (/sakura|pink|rose|cherry|cerisier/.test(q)) palette = 'sakura';
    else if (/aurora|aurore|emerald|émeraude/.test(q)) palette = 'aurora';
    else if (/neon|néon|cyber|vapor/.test(q)) palette = 'cyber';
    else if (/sahara|sunset|coucher|orange|warm/.test(q)) palette = 'sahara';
    else if (/ocean|océan|blue|bleu|aqua/.test(q)) palette = 'ocean';
    else if (/volcan|fire|feu|red|rouge/.test(q)) palette = 'obsidian';
    else if (/rainbow|arc.?en.?ciel|prism/.test(q)) palette = 'prism';

    const grav = /z[eé]ro.?g|anti.?grav|float|flotte|space|espace/.test(q) ? 0 : undefined;
    return { worldId, palette, grav };
  }

  // Re-Harmonize ALL Sand/Gold/Stardust/Crystal grains on canvas to a new Fine-Art Palette!
  function harmonizeCanvasPalette(eng, paletteId) {
    const { MAT, samplePalettePacked, varyPacked } = SM();
    eng.paletteId = paletteId;
    const w = eng.w, h = eng.h;
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        const i = row + x;
        const t = eng.types[i];
        if (t === MAT.SAND || t === MAT.STARDUST || t === MAT.CRYSTAL || t === MAT.LEAF) {
          const band = ((y * 1.1 + Math.sin(x * 0.025) * 18) / h) % 1;
          eng.colors[i] = varyPacked(samplePalettePacked(paletteId, band), 10);
        }
      }
    }
    eng.pushUndo();
  }

  // Full-Color Photo / Stencil -> Living Physics Material Baker!
  function bakeImageDataToEngine(eng, imgData, wImg, hImg, opts = {}) {
    const { MAT, packRGBA } = SM();
    const targetMat = opts.matId !== undefined ? opts.matId : MAT.SAND;
    const preserveRGB = opts.preserveRGB !== false;
    const lumaCut = opts.bgThreshold !== undefined ? opts.bgThreshold : 242; // removes white stencil backgrounds cleanly!
    const offX = Math.floor((eng.w - wImg) * 0.5) + (opts.offsetX || 0);
    const offY = Math.floor((eng.h - hImg) * 0.5) + (opts.offsetY || 0);

    let baked = 0;
    const data = imgData.data;
    for (let y = 0; y < hImg; y++) {
      const ty = offY + y;
      if (ty < 0 || ty >= eng.h) continue;
      for (let x = 0; x < wImg; x++) {
        const tx = offX + x;
        if (tx < 0 || tx >= eng.w) continue;
        const p = (y * wImg + x) * 4;
        const a = data[p + 3];
        if (a < 60) continue;
        const r = data[p], g = data[p + 1], b = data[p + 2];
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        if (lumaCut < 255 && luma > lumaCut) continue;

        const col = preserveRGB
          ? packRGBA(r, g, b, 255)
          : eng.pickColorForMaterial(targetMat, opts.customHex);
        const initMeta = targetMat === MAT.FIREWORK ? 24 + ((Math.random() * 28) | 0) : (targetMat === MAT.STARDUST ? ((x + y) & 255) : 0);
        eng.setCell(ty * eng.w + tx, targetMat, col, initMeta);
        baked++;
      }
    }
    eng._scanSpecials();
    eng.pushUndo();
    return baked;
  }

  const AIDirector = {
    LIVING_WORLDS, buildWorld, parseArtPrompt, harmonizeCanvasPalette, bakeImageDataToEngine
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = AIDirector;
  if (globalScope) globalScope.AIDirector = AIDirector;
})(typeof window !== 'undefined' ? window : globalThis);
