/**
 * ArtGen Studio (v5.0) — Fine-Art Core: Deterministic PRNG, Artwork DNA, Curl/fBM Noise,
 * Safe Color Engine (#fff fix!), K-Means Palette Extractor, Magic Prompt Parser,
 * Multi-Layer Stack (12 Layers + 12 Blend Modes), Bounded Undo & Full EN/FR i18n.
 */
(function (globalScope) {
  'use strict';

  // =========================================================================
  // 1. DETERMINISTIC PRNG (MULBERRY32) & ARTWORK DNA
  // =========================================================================

  function hashString32(str) {
    let h = 2166136261 >>> 0;
    const s = String(str || '');
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function createRng(seed) {
    let a = (typeof seed === 'number' ? seed : hashString32(seed)) >>> 0;
    if (a === 0) a = 0x9e3779b9;
    return function next() {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomSeedHex() {
    return ((Math.random() * 0xffffff) | 0).toString(16).toUpperCase().padStart(6, '0');
  }

  function formatArtworkDNA(style1, style2, seedHex, cpx, sym) {
    const s1 = String(style1 || 'abstract').toUpperCase().slice(0, 6);
    const s2 = style2 && style2 !== 'none' ? '+' + String(style2).toUpperCase().slice(0, 5) : '';
    const sy = sym && sym !== 'none' ? 'S' + sym : 'S1';
    return `AG-${s1}${s2}-${String(seedHex || '000000').toUpperCase()}-C${cpx || 3}-${sy}`;
  }

  // =========================================================================
  // 2. FAST 2D VALUE/GRADIENT NOISE, FBM & CURL NOISE FIELD
  // =========================================================================

  class Noise2D {
    constructor(seed) {
      const rng = createRng(seed || 1337);
      this.perm = new Uint8Array(512);
      const p = new Uint8Array(256);
      for (let i = 0; i < 256; i++) p[i] = i;
      for (let i = 255; i > 0; i--) {
        const j = (rng() * (i + 1)) | 0;
        const tmp = p[i]; p[i] = p[j]; p[j] = tmp;
      }
      for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
      this.grads = [
        [1, 1], [-1, 1], [1, -1], [-1, -1],
        [1, 0], [-1, 0], [0, 1], [0, -1]
      ];
    }

    noise(x, y) {
      const xi = Math.floor(x) & 255;
      const yi = Math.floor(y) & 255;
      const xf = x - Math.floor(x);
      const yf = y - Math.floor(y);
      const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
      const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);

      const p = this.perm;
      const aa = p[p[xi] + yi] & 7;
      const ab = p[p[xi] + yi + 1] & 7;
      const ba = p[p[xi + 1] + yi] & 7;
      const bb = p[p[xi + 1] + yi + 1] & 7;
      const g = this.grads;

      const x1 = (g[aa][0] * xf + g[aa][1] * yf) * (1 - u) + (g[ba][0] * (xf - 1) + g[ba][1] * yf) * u;
      const x2 = (g[ab][0] * xf + g[ab][1] * (yf - 1)) * (1 - u) + (g[bb][0] * (xf - 1) + g[bb][1] * (yf - 1)) * u;
      return x1 * (1 - v) + x2 * v; // ~[-1, 1]
    }

    fbm(x, y, octaves) {
      const oct = octaves || 4;
      let val = 0, amp = 0.5, freq = 1, norm = 0;
      for (let i = 0; i < oct; i++) {
        val += this.noise(x * freq, y * freq) * amp;
        norm += amp;
        amp *= 0.5;
        freq *= 2.02;
      }
      return val / norm;
    }

    // Smooth divergence-free curl vector (vx, vy) for silky organic flow ribbons!
    curl(x, y, eps) {
      const e = eps || 0.015;
      const n1 = this.fbm(x, y + e, 3);
      const n2 = this.fbm(x, y - e, 3);
      const n3 = this.fbm(x + e, y, 3);
      const n4 = this.fbm(x - e, y, 3);
      const vx = (n1 - n2) / (2 * e);
      const vy = -(n3 - n4) / (2 * e);
      const mag = Math.hypot(vx, vy) || 1e-5;
      return { x: vx / mag, y: vy / mag, raw: this.fbm(x, y, 3) };
    }
  }

  // =========================================================================
  // 3. SAFE COLOR ENGINE (FIXES 3-DIGIT #fff HEX CRASH!) + K-MEANS EXTRACTOR
  // =========================================================================

  function normalizeHex(hex) {
    if (!hex || typeof hex !== 'string') return '#8b5cf6';
    let h = hex.trim();
    if (!h.startsWith('#')) return '#8b5cf6';
    h = h.slice(1);
    if (h.length === 3) {
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return '#8b5cf6';
    return '#' + h.toLowerCase();
  }

  function hexToRgb(hex) {
    const h = normalizeHex(hex);
    return {
      r: parseInt(h.slice(1, 3), 16),
      g: parseInt(h.slice(3, 5), 16),
      b: parseInt(h.slice(5, 7), 16)
    };
  }

  function rgbToHex(r, g, b) {
    const cl = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    return '#' + cl(r) + cl(g) + cl(b);
  }

  function rgba(hex, alpha) {
    const c = hexToRgb(hex);
    return `rgba(${c.r},${c.g},${c.b},${Math.max(0, Math.min(1, Number(alpha) || 0)).toFixed(3)})`;
  }

  function hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(100, s)) / 100;
    l = Math.max(0, Math.min(100, l)) / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
      else if (max === g) h = ((b - r) / d + 2) * 60;
      else h = ((r - g) / d + 4) * 60;
    }
    return { h, s: s * 100, l: l * 100 };
  }

  function lerpColor(hexA, hexB, t) {
    const a = hexToRgb(hexA), b = hexToRgb(hexB);
    const k = Math.max(0, Math.min(1, t));
    return rgbToHex(a.r + (b.r - a.r) * k, a.g + (b.g - a.g) * k, a.b + (b.b - a.b) * k);
  }

  function samplePalette(pal, t) {
    if (!pal || !pal.length) return '#8b5cf6';
    if (pal.length === 1) return normalizeHex(pal[0]);
    const k = Math.max(0, Math.min(0.9999, t)) * (pal.length - 1);
    const i = Math.floor(k);
    return lerpColor(pal[i], pal[Math.min(pal.length - 1, i + 1)], k - i);
  }

  // Always 6-digit hex! (Fixes legacy 3-digit #fff crash!)
  const DEFAULT_PALETTE = [
    '#ffffff', '#e2e8f0', '#94a3b8', '#475569', '#1e293b', '#090d16', '#f43f5e', '#fb7185',
    '#f97316', '#f59e0b', '#eab308', '#84cc16', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#d4af37', '#8c5a3c'
  ];

  // Curated palettes for all 8 Color Schemes + deterministic variation
  function getSchemePalette(scheme, primaryHex, rng) {
    const r = rng || Math.random;
    const base = hexToRgb(primaryHex || '#8b5cf6');
    const hsl = rgbToHsl(base.r, base.g, base.b);

    switch (scheme) {
      case 'warm':
        return ['#1a0806', '#7c1d10', '#d9480f', '#f59e0b', '#fcd34d', '#fff7ed'];
      case 'cool':
        return ['#050b1c', '#0f2952', '#0284c7', '#22d3ee', '#818cf8', '#e0f2fe'];
      case 'mono':
        return [
          hslToHex(hsl.h, Math.min(45, hsl.s), 10),
          hslToHex(hsl.h, Math.min(70, hsl.s + 10), 28),
          hslToHex(hsl.h, Math.min(85, hsl.s + 15), 48),
          hslToHex(hsl.h, Math.min(75, hsl.s), 68),
          hslToHex(hsl.h, Math.min(55, hsl.s), 88)
        ];
      case 'comp':
        return [
          hslToHex(hsl.h, 55, 14),
          hslToHex(hsl.h, 82, 48),
          hslToHex((hsl.h + 25) % 360, 88, 62),
          hslToHex((hsl.h + 180) % 360, 82, 52),
          hslToHex((hsl.h + 195) % 360, 90, 74)
        ];
      case 'rainbow':
        return ['#ef4444', '#f97316', '#facc15', '#10b981', '#06b6d4', '#6366f1', '#d946ef'];
      case 'pastel':
        return ['#1f1c2e', '#f9a8d4', '#fbcfe8', '#fde68a', '#a7f3d0', '#bae6fd', '#ddd6fe'];
      case 'neon':
        return ['#050510', '#ff007f', '#00f5d4', '#7b2cbf', '#fee440', '#00bbf9'];
      default: {
        // Curated museum fine-art palettes rotated by seed!
        const curated = [
          ['#0b1021', '#1e3a5f', '#0ea5e9', '#f59e0b', '#fde68a', '#f8fafc'], // Midnight Gold & Azure
          ['#12081c', '#581c87', '#c026d3', '#fb7185', '#fdba74', '#fff1f2'], // Imperial Orchid & Ember
          ['#061414', '#115e59', '#14b8a6', '#a3e635', '#fef08a', '#ecfeff'], // Bioluminescent Jade
          ['#1a1410', '#6b3e26', '#c97b58', '#e5b869', '#f3e5d0', '#38bdf8'], // Florentine Ochre & Lapis
          ['#090d1a', '#312e81', '#6366f1', '#ec4899', '#38bdf8', '#f1f5f9'], // Cosmic Prism
          ['#140b14', '#881337', '#e11d48', '#f59e0b', '#fef3c7', '#fda4af']  // Crimson Velvet & Gold
        ];
        return curated[Math.floor(r() * curated.length) % curated.length];
      }
    }
  }

  function generateColorHarmony(baseHex, mode) {
    const c = hexToRgb(baseHex);
    const { h, s, l } = rgbToHsl(c.r, c.g, c.b);
    const sat = Math.max(45, Math.min(92, s || 72));
    const lig = Math.max(35, Math.min(65, l || 52));
    if (mode === 'luxury') return ['#0b0d14', '#1f2433', '#785a28', '#c89b3c', '#f0e6d2', '#f59e0b', '#e2e8f0', '#94a3b8'];
    if (mode === 'cyber')  return ['#050510', '#120826', '#ff007f', '#00f5d4', '#7b2cbf', '#fee440', '#00bbf9', '#ffffff'];
    if (mode === 'earth')  return ['#1c1410', '#4a3222', '#8c5a3c', '#c97b58', '#d4a373', '#e9edc9', '#606c38', '#fefae0'];
    const shifts =
      mode === 'analogous' ? [-35, -18, 0, 18, 35, 50] :
      mode === 'triadic'   ? [0, 120, 240, 20, 140, 260] :
      mode === 'split'     ? [0, 150, 210, 15, 165, 195] :
      [0, 180, 18, 198, -18, 162]; // complementary
    const out = ['#ffffff', '#090d16'];
    shifts.forEach((dh, i) => {
      out.push(hslToHex(h + dh, sat, i % 2 === 0 ? lig : Math.min(82, lig + 16)));
    });
    return out;
  }

  // Real K-Means color quantization over imageData (fixes legacy 100-pixel sampling!)
  function extractPaletteFromPixels(rgbaData, width, height, k) {
    const numColors = Math.max(3, Math.min(12, k || 8));
    const totalPx = Math.max(1, width * height);
    const stride = Math.max(1, Math.floor(totalPx / 4000));
    const samples = [];
    for (let i = 0; i < totalPx; i += stride) {
      const idx = i * 4;
      if (rgbaData[idx + 3] < 60) continue;
      samples.push([rgbaData[idx], rgbaData[idx + 1], rgbaData[idx + 2]]);
    }
    if (samples.length < numColors) return DEFAULT_PALETTE.slice(0, numColors);

    // Deterministic spread initialization
    const centroids = [];
    for (let c = 0; c < numColors; c++) {
      const s = samples[Math.floor((c * samples.length) / numColors)];
      centroids.push([s[0], s[1], s[2]]);
    }

    // 6 fast K-means iterations
    for (let iter = 0; iter < 6; iter++) {
      const sums = Array.from({ length: numColors }, () => [0, 0, 0, 0]);
      for (let i = 0; i < samples.length; i++) {
        const px = samples[i];
        let best = 0, bestD = 1e9;
        for (let c = 0; c < numColors; c++) {
          const dr = px[0] - centroids[c][0];
          const dg = px[1] - centroids[c][1];
          const db = px[2] - centroids[c][2];
          const d = dr * dr + dg * dg + db * db;
          if (d < bestD) { bestD = d; best = c; }
        }
        sums[best][0] += px[0];
        sums[best][1] += px[1];
        sums[best][2] += px[2];
        sums[best][3]++;
      }
      for (let c = 0; c < numColors; c++) {
        if (sums[c][3] > 0) {
          centroids[c][0] = sums[c][0] / sums[c][3];
          centroids[c][1] = sums[c][1] / sums[c][3];
          centroids[c][2] = sums[c][2] / sums[c][3];
        }
      }
    }

    // Deduplicate and sort by luminance
    const unique = [];
    centroids.forEach(c => {
      const hex = rgbToHex(c[0], c[1], c[2]);
      if (!unique.includes(hex)) unique.push(hex);
    });
    return unique;
  }

  // =========================================================================
  // 4. COMPLETE TOOL, STYLE, BLEND MODE & TEXTURE REGISTRIES (100% EN/FR!)
  // =========================================================================

  const BLEND_MODES = [
    { id: 'source-over', en: 'Normal',       fr: 'Normal' },
    { id: 'multiply',    en: 'Multiply',     fr: 'Produit' },
    { id: 'screen',      en: 'Screen',       fr: 'Superposition' },
    { id: 'overlay',     en: 'Overlay',      fr: 'Incrustation' },
    { id: 'soft-light',  en: 'Soft Light',   fr: 'Lumière Douce' },
    { id: 'color-dodge', en: 'Color Dodge',  fr: 'Densité Couleur -' },
    { id: 'color-burn',  en: 'Color Burn',   fr: 'Densité Couleur +' },
    { id: 'difference',  en: 'Difference',   fr: 'Différence' },
    { id: 'exclusion',   en: 'Exclusion',    fr: 'Exclusion' },
    { id: 'hue',         en: 'Hue',          fr: 'Teinte' },
    { id: 'color',       en: 'Color',        fr: 'Couleur' },
    { id: 'luminosity',  en: 'Luminosity',   fr: 'Luminosité' }
  ];

  const PAPER_TEXTURES = [
    { id: 'none',       en: 'Smooth Digital',        fr: 'Numérique Lisse' },
    { id: 'watercolor', en: 'Cold-Press Watercolor', fr: 'Papier Aquarelle Grain' },
    { id: 'linen',      en: 'Woven Museum Linen',    fr: 'Toile de Lin Musée' },
    { id: 'washi',      en: 'Japanese Washi Fiber',  fr: 'Papier Japonais Washi' },
    { id: 'goldfoil',   en: 'Brushed Metallic Foil', fr: 'Feuille Métallique' },
    { id: 'halftone',   en: 'Fine-Art Halftone',     fr: 'Trame Fine-Art' }
  ];

  // ALL 50 ORIGINAL TOOLS PRESERVED + 4 GENIUS ALGORITHMIC BRUSHES + HAND PAN!
  const TOOLS = [
    // Freehand & Algorithmic Fine-Art Brushes (16)
    { id: 'brush',            cat: 'draw',  icon: '🖌️', key: 'B', en: 'Soft Brush',       fr: 'Pinceau Doux' },
    { id: 'ribbon',           cat: 'draw',  icon: '🎀', key: 'Q', en: 'Silk Ribbon',      fr: 'Ruban Soie' },
    { id: 'web',              cat: 'draw',  icon: '🕸️', key: 'W', en: 'Constellation Web',fr: 'Toile Constell.' },
    { id: 'watercolor_brush', cat: 'draw',  icon: '💧', key: 'A', en: 'Wet Watercolor',   fr: 'Aquarelle Humide' },
    { id: 'liquify',          cat: 'draw',  icon: '🌀', key: 'G', en: 'Ebru Liquify',     fr: 'Marbrure Liquify' },
    { id: 'pencil',           cat: 'draw',  icon: '✏️', key: 'P', en: 'Graphite Pencil',  fr: 'Crayon Graphite' },
    { id: 'spray',            cat: 'draw',  icon: '🌫️', key: 'S', en: 'Airbrush Spray',   fr: 'Aérographe' },
    { id: 'fill',             cat: 'draw',  icon: '🪣', key: 'F', en: 'Smart Fill',       fr: 'Remplissage' },
    { id: 'eraser',           cat: 'draw',  icon: '🧹', key: 'E', en: 'Layer Eraser',     fr: 'Gomme Calque' },
    { id: 'magicer',          cat: 'draw',  icon: '✨', key: '',  en: 'Magic Heal',       fr: 'Correcteur Magique' },
    { id: 'lightning',        cat: 'draw',  icon: '⚡', key: 'L', en: 'Fractal Bolt',     fr: 'Éclair Fractal' },
    { id: 'sparkler',         cat: 'draw',  icon: '🎇', key: 'K', en: 'Starburst',        fr: 'Étincelles' },
    { id: 'blur',             cat: 'draw',  icon: '🫧', key: 'U', en: 'Soft Blur',        fr: 'Flou Doux' },
    { id: 'dropper',          cat: 'draw',  icon: '🧪', key: 'I', en: 'Eyedropper',       fr: 'Pipette' },
    { id: 'text',             cat: 'draw',  icon: '🔤', key: 'T', en: 'Typography',       fr: 'Texte' },
    { id: 'hand',             cat: 'draw',  icon: '✋', key: 'H', en: 'Pan Canvas',       fr: 'Déplacer Vue' },

    // 6 Geometric Shapes
    { id: 'line',     cat: 'shape', icon: '╱',  key: '', en: 'Line',     fr: 'Ligne' },
    { id: 'circle',   cat: 'shape', icon: '⭕', key: '', en: 'Circle',   fr: 'Cercle' },
    { id: 'rect',     cat: 'shape', icon: '▭',  key: '', en: 'Rect',     fr: 'Rectangle' },
    { id: 'triangle', cat: 'shape', icon: '△',  key: '', en: 'Triangle', fr: 'Triangle' },
    { id: 'star',     cat: 'shape', icon: '⭐', key: '', en: 'Star',     fr: 'Étoile' },
    { id: 'heart',    cat: 'shape', icon: '❤️', key: '', en: 'Heart',    fr: 'Cœur' },

    // ALL 33 Figurative Stamps (100% preserved & translated!)
    { id: 'bird',      cat: 'stamp', icon: '🕊️', en: 'Bird',      fr: 'Oiseau' },
    { id: 'butterfly', cat: 'stamp', icon: '🦋', en: 'Butterfly', fr: 'Papillon' },
    { id: 'figure',    cat: 'stamp', icon: '🧘', en: 'Figure',    fr: 'Silhouette' },
    { id: 'moon',      cat: 'stamp', icon: '🌙', en: 'Crescent',  fr: 'Croissant' },
    { id: 'tree',      cat: 'stamp', icon: '🌳', en: 'Tree',      fr: 'Arbre' },
    { id: 'flower',    cat: 'stamp', icon: '🌸', en: 'Lotus',     fr: 'Fleur Lotus' },
    { id: 'fish',      cat: 'stamp', icon: '🐟', en: 'Koi Fish',  fr: 'Carpe Koï' },
    { id: 'robot',     cat: 'stamp', icon: '🤖', en: 'Automaton', fr: 'Robot' },
    { id: 'cat',       cat: 'stamp', icon: '🐱', en: 'Feline',    fr: 'Chat' },
    { id: 'dog',       cat: 'stamp', icon: '🐶', en: 'Hound',     fr: 'Chien' },
    { id: 'eagle',     cat: 'stamp', icon: '🦅', en: 'Eagle',     fr: 'Aigle' },
    { id: 'dragon',    cat: 'stamp', icon: '🐉', en: 'Dragon',    fr: 'Dragon' },
    { id: 'horse',     cat: 'stamp', icon: '🐴', en: 'Stallion',  fr: 'Cheval' },
    { id: 'dolphin',   cat: 'stamp', icon: '🐬', en: 'Dolphin',   fr: 'Dauphin' },
    { id: 'crown',     cat: 'stamp', icon: '👑', en: 'Crown',     fr: 'Couronne' },
    { id: 'sun',       cat: 'stamp', icon: '☀️', en: 'Solar',     fr: 'Soleil' },
    { id: 'alien',     cat: 'stamp', icon: '👽', en: 'Astral',    fr: 'Alien' },
    { id: 'unicorn',   cat: 'stamp', icon: '🦄', en: 'Unicorn',   fr: 'Licorne' },
    { id: 'shark',     cat: 'stamp', icon: '🦈', en: 'Shark',     fr: 'Requin' },
    { id: 'fox',       cat: 'stamp', icon: '🦊', en: 'Fox',       fr: 'Renard' },
    { id: 'lion',      cat: 'stamp', icon: '🦁', en: 'Lion',      fr: 'Lion' },
    { id: 'elephant',  cat: 'stamp', icon: '🐘', en: 'Elephant',  fr: 'Éléphant' },
    { id: 'house',     cat: 'stamp', icon: '🏛️', en: 'Villa',     fr: 'Maison' },
    { id: 'car',       cat: 'stamp', icon: '🏎️', en: 'GT Coupe',  fr: 'Voiture' },
    { id: 'plane',     cat: 'stamp', icon: '✈️', en: 'Jet',       fr: 'Avion' },
    { id: 'rocket2',   cat: 'stamp', icon: '🚀', en: 'Starship',  fr: 'Fusée' },
    { id: 'anchor',    cat: 'stamp', icon: '⚓', en: 'Anchor',    fr: 'Ancre' },
    { id: 'sword',     cat: 'stamp', icon: '⚔️', en: 'Excalibur', fr: 'Épée' },
    { id: 'mushroom',  cat: 'stamp', icon: '🍄', en: 'Mycelium',  fr: 'Champignon' },
    { id: 'wave',      cat: 'stamp', icon: '🌊', en: 'Tsunami',   fr: 'Vague' },
    { id: 'phoenix',   cat: 'stamp', icon: '🔥', en: 'Phoenix',   fr: 'Phénix' },
    { id: 'octopus',   cat: 'stamp', icon: '🐙', en: 'Kraken',    fr: 'Poulpe' },
    { id: 'crab',      cat: 'stamp', icon: '🦀', en: 'Crab',      fr: 'Crabe' }
  ];

  // ALL 45 AI / GENERATIVE STYLES (100% preserved & translated EN/FR!)
  const STYLES = [
    { id: 'abstract',      icon: '🌀', en: 'Flow Abstract',   fr: 'Flux Abstrait' },
    { id: 'mandala',       icon: '☸️', en: 'Sacred Mandala',  fr: 'Mandala Sacré' },
    { id: 'cosmic',        icon: '🌌', en: 'Cosmic Nebula',   fr: 'Nébuleuse Cosmique' },
    { id: 'nature',        icon: '🌲', en: 'Botanical Woods', fr: 'Forêt Botanique' },
    { id: 'ocean',         icon: '🌊', en: 'Abyssal Ocean',   fr: 'Océan Abyssal' },
    { id: 'geometric',     icon: '🔷', en: 'Sacred Geometry', fr: 'Géométrie Sacrée' },
    { id: 'psychedelic',   icon: '🌈', en: 'Psychedelic',     fr: 'Psychédélique' },
    { id: 'urban',         icon: '🏙️', en: 'Nocturne City',   fr: 'Ville Nocturne' },
    { id: 'fauna',         icon: '🦋', en: 'Silk Fauna',      fr: 'Faune de Soie' },
    { id: 'sakura',        icon: '🌸', en: 'Japanese Sakura', fr: 'Sakura Japonais' },
    { id: 'watercolor',    icon: '🎨', en: 'Fine Watercolor', fr: 'Aquarelle Fine' },
    { id: 'plasma',        icon: '🔮', en: 'Domain Plasma',   fr: 'Plasma Fluide' },
    { id: 'crystal',       icon: '❄️', en: 'Voronoi Crystal', fr: 'Cristal Voronoi' },
    { id: 'vortex',        icon: '🌪️', en: 'Attractor Vortex',fr: 'Vortex Atracteur' },
    { id: 'cellular',      icon: '🧬', en: 'Cellular Organic',fr: 'Cellulaire Bio' },
    { id: 'cubist',        icon: '🎭', en: 'Fine Cubism',     fr: 'Cubisme Facettes' },
    { id: 'confetti',      icon: '🎊', en: 'Silk Confetti',   fr: 'Confettis Soie' },
    { id: 'cyberpunk',     icon: '🌆', en: 'Cyberpunk 2099',  fr: 'Cyberpunk 2099' },
    { id: 'aurora',        icon: '✨', en: 'Boreal Aurora',   fr: 'Aurore Boréale' },
    { id: 'pixel',         icon: '👾', en: 'Retro Pixel Art', fr: 'Pixel Art Rétro' },
    { id: 'origami',       icon: '📐', en: 'Folded Origami',  fr: 'Origami Facettes' },
    { id: 'glitch',        icon: '📺', en: 'Vapor Glitch',    fr: 'Glitch Synthwave' },
    { id: 'oil',           icon: '🖼️', en: 'Impasto Oil',     fr: 'Peinture à l\'Huile' },
    { id: 'inferno',       icon: '🔥', en: 'Solar Inferno',   fr: 'Brasier Solaire' },
    { id: 'fantasy',       icon: '🏰', en: 'Sky Citadel',     fr: 'Citadelle Céleste' },
    { id: 'steampunk',     icon: '⚙️', en: 'Clockwork Brass', fr: 'Horlogerie Steampunk' },
    { id: 'zodiac',        icon: '⭐', en: 'Astral Zodiac',   fr: 'Zodiaque Astral' },
    { id: 'matrix',        icon: '💻', en: 'Digital Matrix',  fr: 'Matrice Digitale' },
    { id: 'sunset',        icon: '🌅', en: 'Golden Sunset',   fr: 'Crépuscule Doré' },
    { id: 'fractal',       icon: '🌿', en: 'Julia Fractal',   fr: 'Fractale de Julia' },
    { id: 'alien',         icon: '🛸', en: 'Alien Horizon',   fr: 'Horizon Alien' },
    { id: 'mutant',        icon: '🐙', en: 'Bio Creature DNA',fr: 'ADN Créature Bio' },
    { id: 'stargate',      icon: '🌀', en: 'Sci-Fi Stargate', fr: 'Portail Stargate' },
    { id: 'neon',          icon: '💡', en: 'Neon Synth',      fr: 'Néon Synth' },
    { id: 'rainbow',       icon: '🌈', en: 'Prism Spectrum',  fr: 'Spectre Prisme' },
    { id: 'ice',           icon: '🧊', en: 'Glacier Frost',   fr: 'Givre Glaciaire' },
    { id: 'tropical',      icon: '🌴', en: 'Tropical Lagoon', fr: 'Lagon Tropical' },
    { id: 'biolum',        icon: '🪼', en: 'Bioluminescence', fr: 'Bioluminescence' },
    { id: 'lava',          icon: '🌋', en: 'Volcanic Magma',  fr: 'Magma Volcanique' },
    { id: 'baroque',       icon: '🏛️', en: 'Gold Baroque',    fr: 'Baroque Doré' },
    { id: 'soundwave',     icon: '🎵', en: 'Harmonic Wave',   fr: 'Onde Harmonique' },
    { id: 'tornado',       icon: '🌪️', en: 'Storm Cyclone',   fr: 'Cyclone Orageux' },
    { id: 'desert',        icon: '🏜️', en: 'Sahara Dunes',    fr: 'Dunes du Sahara' },
    { id: 'impressionism', icon: '🎨', en: 'Impressionism',   fr: 'Impressionnisme' },
    { id: 'galaxy',        icon: '🌠', en: 'Spiral Galaxy',   fr: 'Galaxie Spirale' }
  ];

  const INSPIRE_PRESETS = [
    { id: 'flow_nebula',   icon: '🌌', en: 'Cosmic Flow Nebula',     fr: 'Nébuleuse Fluide',   primary: 'cosmic',     secondary: 'abstract',  cs: 'cool',   sym: 'none', cpx: 4, dens: 3, seed: '7F3A9C', fusionAlpha: 0.55 },
    { id: 'gold_mandala',  icon: '☸️', en: '24K Sacred Mandala',     fr: 'Mandala Doré 24K',   primary: 'mandala',    secondary: 'baroque',   cs: 'warm',   sym: '12',   cpx: 5, dens: 3, seed: 'D4AF37', fusionAlpha: 0.45 },
    { id: 'cyber_glitch',  icon: '🌆', en: 'Neo-Tokyo 2099',         fr: 'Neo-Tokyo 2099',     primary: 'cyberpunk',  secondary: 'aurora',    cs: 'neon',   sym: 'none', cpx: 4, dens: 3, seed: '00F5D4', fusionAlpha: 0.45 },
    { id: 'sakura_water',  icon: '🌸', en: 'Kyoto Sakura Wash',      fr: 'Aquarelle Sakura',   primary: 'sakura',     secondary: 'watercolor',cs: 'pastel', sym: 'none', cpx: 4, dens: 2, seed: 'F9A8D4', fusionAlpha: 0.50 }
  ];

  // =========================================================================
  // 5. REAL MAGIC PROMPT PARSER (EN & FR NATURAL CREATIVE PROMPTS!)
  // =========================================================================

  function parseMagicPrompt(promptText) {
    const raw = String(promptText || '').trim();
    const q = raw.toLowerCase();
    const seedHex = raw ? (hashString32(raw) & 0xffffff).toString(16).toUpperCase().padStart(6, '0') : randomSeedHex();

    const styleKeywords = [
      ['mandala', /mandala|sacred|sacr|lotus|zen|kaleid/],
      ['cosmic', /cosmic|cosmiq|nebula|nébul|space|espace|star|étoile/],
      ['galaxy', /galaxy|galaxi|milky|universe|univers/],
      ['cyberpunk', /cyber|tokyo|blade|futur|synth|neon city/],
      ['sakura', /sakura|cherry|cerisier|japan|japon|kyoto/],
      ['watercolor', /watercol|aquarel|ink|encre|wash/],
      ['fractal', /fractal|julia|mandelbrot|math/],
      ['crystal', /crystal|cristal|voronoi|diamond|diamant|gem/],
      ['aurora', /aurora|aurore|northern|boréal|arctic/],
      ['ocean', /ocean|océan|sea|mer|wave|vague|deep/],
      ['nature', /forest|forêt|nature|wood|bois|tree|arbre/],
      ['inferno', /fire|feu|flame|flamm|inferno|dragon|phoenix|phénix/],
      ['lava', /lava|lave|volcan|magma/],
      ['biolum', /biolum|jelly|méduse|abyss|glow/],
      ['baroque', /baroq|gold|or |doré|royal|luxury|luxe|ornate/],
      ['oil', /oil|huile|impasto|van gogh|canvas|toile/],
      ['impressionism', /impress|monet|garden|jardin|meadow/],
      ['cubist', /cubis|picasso|facet|abstract face/],
      ['origami', /origami|fold|pliage|paper|papier/],
      ['steampunk', /steam|gear|clock|horlog|brass|laiton/],
      ['fantasy', /fantasy|fantas|castle|château|citadel|magic|magi/],
      ['desert', /desert|désert|dune|sahara|sand|sable/],
      ['sunset', /sunset|crépusc|couchant|dusk|horizon/],
      ['tropical', /tropic|palm|island|île|lagoon|lagon/],
      ['ice', /ice|glace|frost|givre|winter|hiver|snow|neige/],
      ['zodiac', /zodiac|zodiaq|constell|astro/],
      ['stargate', /portal|portail|stargate|wormhole/],
      ['soundwave', /sound|son|music|musiq|audio|wave|onde/],
      ['tornado', /tornado|tornad|storm|orage|cyclone/],
      ['matrix', /matrix|matric|code|hacker|digital/],
      ['glitch', /glitch|vapor|vhs|retro/],
      ['pixel', /pixel|8bit|16bit|arcade/],
      ['urban', /city|ville|urban|urbain|skyline/],
      ['neon', /neon|néon|laser/],
      ['plasma', /plasma|fluid|fluide|marble|marbre/],
      ['geometric', /geom|géom|bauhaus|minimal/],
      ['psychedelic', /psych|tripp|acid|rainbow/],
      ['abstract', /abstract|abstrait|flow|flux|silk|soie/]
    ];

    const matched = [];
    for (let i = 0; i < styleKeywords.length; i++) {
      if (styleKeywords[i][1].test(q)) matched.push(styleKeywords[i][0]);
    }
    const rng = createRng(seedHex);
    const primary = matched[0] || STYLES[Math.floor(rng() * STYLES.length)].id;
    const secondary = matched[1] || (raw.length > 14 ? STYLES[Math.floor(rng() * STYLES.length)].id : 'none');

    let cs = 'auto';
    if (/gold|warm|fire|sunset|desert|lava|amber|doré|chaud|feu/.test(q)) cs = 'warm';
    else if (/ice|ocean|cool|blue|frost|arctic|froid|bleu|glace/.test(q)) cs = 'cool';
    else if (/neon|cyber|laser|electric|néon/.test(q)) cs = 'neon';
    else if (/pastel|sakura|soft|dream|doux|rêve/.test(q)) cs = 'pastel';
    else if (/rainbow|prism|psych|arc-en-ciel/.test(q)) cs = 'rainbow';
    else if (/mono|black|noir|silver|argent|ink/.test(q)) cs = 'mono';

    let sym = 'none';
    const symNum = q.match(/(?:sym\w*|mandala|kaleid\w*)\s*[x×]?\s*(2|4|6|8|12|16)/);
    if (symNum) sym = symNum[1];
    else if (/mandala|kaleid|sacred|sacr|sym/.test(q)) sym = '8';

    const cpx = /complex|intricate|epic|épique|detail|détaill|master/.test(q) ? 5 : /minimal|simple|clean/.test(q) ? 2 : 4;
    const dens = /dense|rich|lush|riche/.test(q) ? 3 : /sparse|minimal|léger/.test(q) ? 1 : 2;

    return { primary, secondary: secondary === primary ? 'none' : secondary, cs, sym, cpx, dens, seedHex, fusionAlpha: 0.45 };
  }

  // =========================================================================
  // 6. MULTI-LAYER ENGINE (UP TO 12 LAYERS + 12 BLEND MODES + BOUNDED UNDO)
  // =========================================================================

  function createLayerStack(width, height, bgMode, bgColor) {
    const layers = [];
    let activeIdx = 0;
    let uidCounter = 1;
    let undoStack = [];
    let redoStack = [];
    const MAX_UNDO = 22;

    const state = {
      width: width || 1280,
      height: height || 720,
      bgMode: bgMode || 'dark',
      bgColor: normalizeHex(bgColor || '#0c101b'),
      paperTexture: 'none',
      paperOpacity: 0.16
    };

    function makeCanvas(w, h) {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      return c;
    }

    function addLayer(name, opts) {
      if (layers.length >= 12) return null;
      const c = makeCanvas(state.width, state.height);
      const layer = {
        id: 'lyr_' + (uidCounter++),
        name: name || ('Layer ' + (layers.length + 1)),
        canvas: c,
        ctx: c.getContext('2d', { willReadFrequently: true }),
        visible: true,
        opacity: opts && opts.opacity !== undefined ? opts.opacity : 1.0,
        blendMode: (opts && opts.blendMode) || 'source-over',
        lockAlpha: false
      };
      const insertAt = Math.min(layers.length, activeIdx + 1);
      layers.splice(insertAt, 0, layer);
      activeIdx = insertAt;
      return layer;
    }

    function duplicateLayer(idx) {
      if (layers.length >= 12 || !layers[idx]) return null;
      const src = layers[idx];
      const dup = addLayer(src.name + ' Copy', { opacity: src.opacity, blendMode: src.blendMode });
      if (dup) dup.ctx.drawImage(src.canvas, 0, 0);
      return dup;
    }

    function deleteLayer(idx) {
      if (layers.length <= 1 || !layers[idx]) return false;
      layers.splice(idx, 1);
      activeIdx = Math.max(0, Math.min(layers.length - 1, activeIdx));
      return true;
    }

    function moveLayer(fromIdx, toIdx) {
      if (fromIdx < 0 || fromIdx >= layers.length || toIdx < 0 || toIdx >= layers.length || fromIdx === toIdx) return;
      const [item] = layers.splice(fromIdx, 1);
      layers.splice(toIdx, 0, item);
      activeIdx = toIdx;
    }

    function flattenAll() {
      const merged = makeCanvas(state.width, state.height);
      const mctx = merged.getContext('2d', { willReadFrequently: true });
      for (let i = 0; i < layers.length; i++) {
        const l = layers[i];
        if (!l.visible || l.opacity <= 0) continue;
        mctx.save();
        mctx.globalAlpha = l.opacity;
        mctx.globalCompositeOperation = l.blendMode;
        mctx.drawImage(l.canvas, 0, 0);
        mctx.restore();
      }
      layers.length = 0;
      layers.push({
        id: 'lyr_' + (uidCounter++),
        name: 'Merged Artwork',
        canvas: merged,
        ctx: mctx,
        visible: true,
        opacity: 1,
        blendMode: 'source-over',
        lockAlpha: false
      });
      activeIdx = 0;
    }

    function drawBackground(ctx, w, h) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      if (state.bgMode === 'trans') {
        ctx.clearRect(0, 0, w, h);
      } else if (state.bgMode === 'white') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
      } else if (state.bgMode === 'black') {
        ctx.fillStyle = '#05070c';
        ctx.fillRect(0, 0, w, h);
      } else if (state.bgMode === 'dark') {
        const g = ctx.createRadialGradient(w * 0.5, h * 0.45, 20, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
        g.addColorStop(0, '#161e34');
        g.addColorStop(1, '#070a13');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      } else if (state.bgMode === 'grad') {
        const g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, '#1e1b4b');
        g.addColorStop(0.5, '#3b0764');
        g.addColorStop(1, '#0f172a');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.fillStyle = normalizeHex(state.bgColor);
        ctx.fillRect(0, 0, w, h);
      }
      ctx.restore();
    }

    function compositeTo(targetCtx, includePaperFn) {
      const w = state.width, h = state.height;
      targetCtx.clearRect(0, 0, w, h);
      drawBackground(targetCtx, w, h);
      for (let i = 0; i < layers.length; i++) {
        const l = layers[i];
        if (!l.visible || l.opacity <= 0) continue;
        targetCtx.save();
        targetCtx.globalAlpha = l.opacity;
        targetCtx.globalCompositeOperation = l.blendMode || 'source-over';
        targetCtx.drawImage(l.canvas, 0, 0);
        targetCtx.restore();
      }
      if (includePaperFn && state.paperTexture !== 'none') {
        includePaperFn(targetCtx, w, h, state.paperTexture, state.paperOpacity);
      }
    }

    function resize(newW, newH) {
      const oldW = state.width, oldH = state.height;
      state.width = newW;
      state.height = newH;
      for (let i = 0; i < layers.length; i++) {
        const oldC = layers[i].canvas;
        const nc = makeCanvas(newW, newH);
        const nctx = nc.getContext('2d', { willReadFrequently: true });
        nctx.drawImage(oldC, 0, 0, oldW, oldH, 0, 0, newW, newH);
        layers[i].canvas = nc;
        layers[i].ctx = nctx;
      }
      undoStack = [];
      redoStack = [];
    }

    // Memory-safe Undo Snapshot (captures only active layer pixels + metadata, OR full stack for structural ops!)
    function captureSnapshot(scope) {
      const isFull = scope === 'full';
      const snap = {
        scope: isFull ? 'full' : 'layer',
        activeIdx,
        bgMode: state.bgMode,
        bgColor: state.bgColor,
        layerId: layers[activeIdx] ? layers[activeIdx].id : null,
        data: isFull
          ? layers.map(l => ({
              id: l.id, name: l.name, visible: l.visible, opacity: l.opacity,
              blendMode: l.blendMode, lockAlpha: l.lockAlpha,
              img: l.ctx.getImageData(0, 0, state.width, state.height)
            }))
          : (layers[activeIdx] ? layers[activeIdx].ctx.getImageData(0, 0, state.width, state.height) : null)
      };
      undoStack.push(snap);
      if (undoStack.length > MAX_UNDO) undoStack.shift();
      redoStack = [];
    }

    function restoreSnap(snap) {
      state.bgMode = snap.bgMode;
      state.bgColor = snap.bgColor;
      if (snap.scope === 'full') {
        layers.length = 0;
        snap.data.forEach(item => {
          const c = makeCanvas(state.width, state.height);
          const ctx = c.getContext('2d', { willReadFrequently: true });
          ctx.putImageData(item.img, 0, 0);
          layers.push({ id: item.id, name: item.name, canvas: c, ctx, visible: item.visible, opacity: item.opacity, blendMode: item.blendMode, lockAlpha: item.lockAlpha });
        });
        activeIdx = Math.max(0, Math.min(layers.length - 1, snap.activeIdx));
      } else {
        const l = layers.find(x => x.id === snap.layerId) || layers[activeIdx];
        if (l && snap.data) l.ctx.putImageData(snap.data, 0, 0);
      }
    }

    function undo() {
      if (!undoStack.length) return false;
      const snap = undoStack.pop();
      // Save current state into redoStack matching same scope
      redoStack.push({
        scope: snap.scope,
        activeIdx,
        bgMode: state.bgMode,
        bgColor: state.bgColor,
        layerId: snap.layerId,
        data: snap.scope === 'full'
          ? layers.map(l => ({
              id: l.id, name: l.name, visible: l.visible, opacity: l.opacity,
              blendMode: l.blendMode, lockAlpha: l.lockAlpha,
              img: l.ctx.getImageData(0, 0, state.width, state.height)
            }))
          : ((layers.find(x => x.id === snap.layerId) || layers[activeIdx]).ctx.getImageData(0, 0, state.width, state.height))
      });
      restoreSnap(snap);
      return true;
    }

    function redo() {
      if (!redoStack.length) return false;
      const snap = redoStack.pop();
      undoStack.push({
        scope: snap.scope,
        activeIdx,
        bgMode: state.bgMode,
        bgColor: state.bgColor,
        layerId: snap.layerId,
        data: snap.scope === 'full'
          ? layers.map(l => ({
              id: l.id, name: l.name, visible: l.visible, opacity: l.opacity,
              blendMode: l.blendMode, lockAlpha: l.lockAlpha,
              img: l.ctx.getImageData(0, 0, state.width, state.height)
            }))
          : ((layers.find(x => x.id === snap.layerId) || layers[activeIdx]).ctx.getImageData(0, 0, state.width, state.height))
      });
      restoreSnap(snap);
      return true;
    }

    // Initialize with Layer 1
    addLayer('Artwork Layer 1');

    return {
      state,
      getLayers: () => layers,
      getActiveIdx: () => activeIdx,
      getActive: () => layers[activeIdx] || layers[0],
      setActive: i => { if (layers[i]) activeIdx = i; },
      addLayer, duplicateLayer, deleteLayer, moveLayer, flattenAll,
      compositeTo, drawBackground, resize,
      captureSnapshot, undo, redo,
      canUndo: () => undoStack.length > 0,
      canRedo: () => redoStack.length > 0
    };
  }

  // Real SHA-256 hash using WebCrypto (with deterministic pure-JS fallback for non-HTTPS/Node)
  async function computeArtworkSHA256(dataUrlOrStr, dna) {
    const payload = `${dna || ''}|${String(dataUrlOrStr || '').slice(0, 120000)}`;
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      try {
        const bytes = new TextEncoder().encode(payload);
        const buf = await crypto.subtle.digest('SHA-256', bytes);
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      } catch (_) {}
    }
    // Pure deterministic 64-hex fallback
    let out = '';
    for (let i = 0; i < 8; i++) {
      out += hashString32(payload + '#' + i).toString(16).padStart(8, '0').toUpperCase();
    }
    return out;
  }

  // =========================================================================
  // 7. COMPLETE 100% BILINGUAL UI DICTIONARY (EN / FR)
  // =========================================================================

  const UI_I18N = {
    en: {
      back: 'Back',
      inspire: 'Inspire',
      undo: 'Undo',
      redo: 'Redo',
      clear: 'Clear',
      importBtn: 'Import',
      logoGen: 'SVG Logo',
      exportBtn: 'Export',
      frameBtn: 'Frame',
      view3dBtn: '3D Relief',
      arBtn: 'AR View',
      signBtn: 'Sign',
      certifBtn: 'Certif',
      nftBtn: 'NFT',
      saveBtn: 'Save',
      loadBtn: 'Load',
      snapBtn: 'Snap',
      toolsTitle: 'Tools & Art Brushes',
      shapesTitle: 'Shapes & 33 Art Stamps',
      bgTitle: 'Background & Surface',
      colorsTitle: 'Color Atelier',
      brushTitle: 'Brush & Symmetry',
      fxTitle: 'FX, Filters & Studio',
      layersTitle: 'Layers (12 Max)',
      stylesTitle: '45 Generative Fine-Art Styles',
      fusionTitle: 'Style DNA Fusion & Prompt',
      paramsTitle: 'Generative DNA Controls',
      generateArt: 'Generate Masterpiece',
      addLayerArt: 'Add as New Layer',
      variation: 'Variation',
      surprise: 'Surprise Me',
      magicPlaceholder: 'Describe mood: e.g. "golden dragon nebula symmetry 12"',
      magicRun: 'Magic Compose',
      size: 'Size',
      opacity: 'Opacity',
      hardness: 'Hardness',
      stabilizer: 'Stabilizer',
      symmetry: 'Live Symmetry',
      material: 'Paint Material',
      stampStyle: 'Stamp Finish',
      complexity: 'Complexity',
      colorScheme: 'Color Scheme',
      density: 'Density',
      seedLbl: 'DNA Seed',
      secondaryStyle: 'Fusion Style #2',
      fusionBlend: 'Fusion Mode',
      fusionMix: 'Fusion Mix',
      extract: 'Extract',
      harmony: 'Harmony',
      resetPal: 'Reset',
      addLayer: '+ Layer',
      dupLayer: 'Dup',
      flatten: 'Flatten',
      bgModes: { dark: 'Atelier', white: 'White', black: 'Obsidian', trans: 'Transp.', grad: 'Nebula', custom: 'Custom' },
      schemes: { auto: 'Curated Auto', warm: 'Warm Gold/Ember', cool: 'Arctic Azure', mono: 'Monochrome', comp: 'Complementary', rainbow: 'Spectrum', pastel: 'Fine Pastel', neon: 'Cyber Neon' },
      symOpts: { none: 'Off', mirrorH: 'Mirror H', mirrorV: 'Mirror V', quad: 'Quad 4×', k4: 'Kaleido 4×', k6: 'Kaleido 6×', k8: 'Kaleido 8×', k12: 'Kaleido 12×', k16: 'Kaleido 16×', k24: 'Kaleido 24×' }
    },
    fr: {
      back: 'Retour',
      inspire: 'Inspirer',
      undo: 'Annuler',
      redo: 'Rétablir',
      clear: 'Effacer',
      importBtn: 'Importer',
      logoGen: 'Logo SVG',
      exportBtn: 'Exporter',
      frameBtn: 'Cadre',
      view3dBtn: 'Relief 3D',
      arBtn: 'Vue AR',
      signBtn: 'Signer',
      certifBtn: 'Certif',
      nftBtn: 'NFT',
      saveBtn: 'Sauver',
      loadBtn: 'Ouvrir',
      snapBtn: 'Capture',
      toolsTitle: 'Outils & Pinceaux d\'Art',
      shapesTitle: 'Formes & 33 Tampons d\'Art',
      bgTitle: 'Fond & Texture Papier',
      colorsTitle: 'Atelier Couleurs',
      brushTitle: 'Pinceau & Symétrie',
      fxTitle: 'Effets, Filtres & Studio',
      layersTitle: 'Calques (12 Max)',
      stylesTitle: '45 Styles Génératifs Fine-Art',
      fusionTitle: 'Fusion ADN & Prompt Magique',
      paramsTitle: 'Paramètres ADN Génératif',
      generateArt: 'Générer l\'Œuvre',
      addLayerArt: 'Ajouter en Calque',
      variation: 'Variation',
      surprise: 'Surprends-moi',
      magicPlaceholder: 'Décrivez l\'ambiance : ex "nébuleuse dorée mandala 12"',
      magicRun: 'Composer IA',
      size: 'Taille',
      opacity: 'Opacité',
      hardness: 'Dureté',
      stabilizer: 'Stabilisateur',
      symmetry: 'Symétrie Live',
      material: 'Matière Peinture',
      stampStyle: 'Finition Tampon',
      complexity: 'Complexité',
      colorScheme: 'Harmonie Couleur',
      density: 'Densité',
      seedLbl: 'Graine ADN',
      secondaryStyle: 'Style Fusion #2',
      fusionBlend: 'Mode Fusion',
      fusionMix: 'Dosage Fusion',
      extract: 'Extraire',
      harmony: 'Harmonie',
      resetPal: 'Défaut',
      addLayer: '+ Calque',
      dupLayer: 'Dupl.',
      flatten: 'Aplatir',
      bgModes: { dark: 'Atelier', white: 'Blanc', black: 'Obsidienne', trans: 'Transp.', grad: 'Nébuleuse', custom: 'Perso' },
      schemes: { auto: 'Musée Auto', warm: 'Or & Braise', cool: 'Azur Polaire', mono: 'Monochrome', comp: 'Complémentaire', rainbow: 'Spectre', pastel: 'Pastel Fin', neon: 'Néon Cyber' },
      symOpts: { none: 'Désactivé', mirrorH: 'Miroir H', mirrorV: 'Miroir V', quad: 'Quad 4×', k4: 'Kaléido 4×', k6: 'Kaléido 6×', k8: 'Kaléido 8×', k12: 'Kaléido 12×', k16: 'Kaléido 16×', k24: 'Kaléido 24×' }
    }
  };

  function getT(lang) { return UI_I18N[lang === 'fr' ? 'fr' : 'en']; }

  const ArtCore = {
    hashString32, createRng, randomSeedHex, formatArtworkDNA, Noise2D,
    normalizeHex, hexToRgb, rgbToHex, rgba, hslToHex, rgbToHsl, lerpColor, samplePalette,
    DEFAULT_PALETTE, getSchemePalette, generateColorHarmony, extractPaletteFromPixels,
    BLEND_MODES, PAPER_TEXTURES, TOOLS, STYLES, INSPIRE_PRESETS,
    parseMagicPrompt, createLayerStack, computeArtworkSHA256, UI_I18N, getT
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = ArtCore;
  if (globalScope) globalScope.ArtCore = ArtCore;
})(typeof window !== 'undefined' ? window : globalThis);
