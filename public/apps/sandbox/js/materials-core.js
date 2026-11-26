/**
 * Zen Sandscape v4.0 — 32 Materials Core, Bit-Packed RGBA Helpers,
 * 8 Curated Fine-Art Mineral Palettes & Complete Bilingual EN / FR Dictionary.
 * Zero DOM/WebGL dependencies — 100% testable in Node.js and Browser.
 */
(function (globalScope) {
  'use strict';

  // Clean Contiguous Material IDs (0..31)
  const MAT = {
    EMPTY:     0,
    SAND:      1,
    WATER:     2,
    FIRE:      3,
    ACID:      4,
    SEED:      5,
    WOOD:      6,
    STEAM:     7,
    MUD:       8,
    WALL:      9,
    WIRE:      10,
    SPARK:     11,
    GLASS:     12,
    LAVA:      13,
    C4:        14,
    ANT:       15,
    PORTAL_IN: 16,
    PORTAL_OUT:17,
    CLOUD:     18,
    EMITTER:   19,
    VORTEX:    20, // Real swirling Black Hole!
    VIRUS:     21,
    REPULSOR:  22,
    PLANT:     23,
    LEAF:      24,
    PIANO:     25,
    SNOW:      26,
    ICE:       27,
    SENSOR:    28,
    DOOR:      29,
    LASER:     30,
    MIRROR:    31,
    FISH:      32,
    BEE:       33,
    CONVEYOR:  34,
    FAN:       35,
    // 4 Exclusive Fine-Art Materials!
    GOLD:      36, // Metallic Kintsugi Gold Leaf Sand
    STARDUST:  37, // Bioluminescent Floating Plasma/Stardust
    CRYSTAL:   38, // Faceted Organic Crystal Growth
    FIREWORK:  39, // Launching Multi-Color Pyrotechnic Starburst
    OBSIDIAN:  40  // Dark Volcanic Stone (Lava + Water reaction)
  };

  // Little-endian ABGR 32-bit packed pixel (zero allocation in hot loops!)
  function packRGBA(r, g, b, a = 255) {
    return (((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0;
  }

  function hexToRgb(hex) {
    const clean = String(hex || '#f59e0b').replace('#', '');
    const num = parseInt(clean.length === 3
      ? clean.split('').map(c => c + c).join('')
      : clean.padEnd(6, '0').slice(0, 6), 16) || 0xf59e0b;
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }

  function hexToPacked(hex, alpha = 255) {
    const [r, g, b] = hexToRgb(hex);
    return packRGBA(r, g, b, alpha);
  }

  function varyPacked(packed, spread = 14) {
    const r = packed & 255;
    const g = (packed >>> 8) & 255;
    const b = (packed >>> 16) & 255;
    const a = (packed >>> 24) & 255;
    const d = ((Math.random() * 2 - 1) * spread) | 0;
    const cr = Math.max(0, Math.min(255, r + d));
    const cg = Math.max(0, Math.min(255, g + d));
    const cb = Math.max(0, Math.min(255, b + d));
    return packRGBA(cr, cg, cb, a);
  }

  function hslToPacked(h, s, l, a = 255) {
    const hh = ((h % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
    const m = l - c * 0.5;
    let r = 0, g = 0, b = 0;
    if (hh < 60)       { r = c; g = x; }
    else if (hh < 120) { r = x; g = c; }
    else if (hh < 180) { g = c; b = x; }
    else if (hh < 240) { g = x; b = c; }
    else if (hh < 300) { r = x; b = c; }
    else               { r = c; b = x; }
    return packRGBA(Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255), a);
  }

  // Curated Museum Fine-Art Palettes (for Mineral Strata / Rainbow Sand / AI Harmonizer!)
  const PALETTES = {
    kintsugi: { id: 'kintsugi', en: 'Kintsugi Gold',  fr: 'Or Kintsugi',   colors: ['#1e293b', '#334155', '#d4af37', '#f5c542', '#fef08a', '#b45309'] },
    sakura:   { id: 'sakura',   en: 'Sakura Dawn',    fr: 'Aube Sakura',   colors: ['#fda4af', '#f472b6', '#fbcfe8', '#fef3c7', '#f59e0b', '#be185d'] },
    aurora:   { id: 'aurora',   en: 'Aurora Borealis',fr: 'Aurore Boréale',colors: ['#34d399', '#22d3ee', '#38bdf8', '#818cf8', '#a855f7', '#06b6d4'] },
    cyber:    { id: 'cyber',    en: 'Cyber Neon',     fr: 'Néon Cyber',    colors: ['#00f0ff', '#ff00aa', '#8b5cf6', '#f43f5e', '#fde047', '#06b6d4'] },
    sahara:   { id: 'sahara',   en: 'Sahara Sunset',  fr: 'Désert Sahara', colors: ['#fef3c7', '#fbbf24', '#f59e0b', '#ea580c', '#c2410c', '#7c2d12'] },
    ocean:    { id: 'ocean',    en: 'Ocean Abyss',    fr: 'Abysse Océan',  colors: ['#e0f2fe', '#7dd3fc', '#38bdf8', '#0284c7', '#0369a1', '#0d9488'] },
    obsidian: { id: 'obsidian', en: 'Volcanic Ember', fr: 'Braise Volcan', colors: ['#374151', '#6b7280', '#ef4444', '#f97316', '#facc15', '#dc2626'] },
    prism:    { id: 'prism',    en: 'Prism Rainbow',  fr: 'Prisme Arc',    colors: ['#ef4444', '#f97316', '#facc15', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899'] }
  };

  function samplePalettePacked(paletteId, t01) {
    const pal = PALETTES[paletteId] || PALETTES.kintsugi;
    const cols = pal.colors;
    const pos = (((t01 % 1) + 1) % 1) * cols.length;
    const i0 = Math.floor(pos) % cols.length;
    const i1 = (i0 + 1) % cols.length;
    const f = pos - Math.floor(pos);
    const [r0, g0, b0] = hexToRgb(cols[i0]);
    const [r1, g1, b1] = hexToRgb(cols[i1]);
    return packRGBA(
      Math.round(r0 + (r1 - r0) * f),
      Math.round(g0 + (g1 - g0) * f),
      Math.round(b0 + (b1 - b0) * f),
      255
    );
  }

  // Curated 12 Instant Artist Color Swatches for Color Studio
  const QUICK_COLORS = [
    '#f5c542', '#f472b6', '#38bdf8', '#10b981',
    '#8b5cf6', '#ef4444', '#f8fafc', '#334155',
    '#84cc16', '#f97316', '#fb7185', '#2563eb'
  ];

  // Material Catalog Definitions (organized by clean UI groups!)
  const MATERIAL_LIST = [
    // FINE ART & ELEMENTS
    { id: MAT.SAND,       group: 'elements', icon: '⏳', en: 'Sand',          fr: 'Sable',          hex: '#f5b041', useCustomColor: true,  relief: 0.72 },
    { id: MAT.GOLD,       group: 'elements', icon: '✨', en: 'Gold Leaf',     fr: 'Or Kintsugi',    hex: '#f5c542', useCustomColor: true,  relief: 0.92, glow: true },
    { id: MAT.STARDUST,   group: 'elements', icon: '🌌', en: 'Stardust',      fr: 'Poussière Astr.',hex: '#38bdf8', useCustomColor: true,  relief: 0.60, glow: true },
    { id: MAT.CRYSTAL,    group: 'elements', icon: '🔮', en: 'Crystal Seed',  fr: 'Cristal Vivant', hex: '#c084fc', useCustomColor: true,  relief: 0.98, glow: true },
    { id: MAT.FIREWORK,   group: 'elements', icon: '🎆', en: 'Firework',      fr: 'Feu d’Artifice', hex: '#fb7185', useCustomColor: true,  relief: 0.70, glow: true },
    { id: MAT.WATER,      group: 'elements', icon: '💧', en: 'Water',         fr: 'Eau',            hex: '#38bdf8', useCustomColor: true,  relief: 0.32 },
    { id: MAT.FIRE,       group: 'elements', icon: '🔥', en: 'Fire',          fr: 'Feu',            hex: '#ff6b1a', useCustomColor: false, relief: 0.40, glow: true },
    { id: MAT.LAVA,       group: 'elements', icon: '🌋', en: 'Magma / Lava',  fr: 'Lave / Magma',   hex: '#f94119', useCustomColor: false, relief: 0.85, glow: true },
    { id: MAT.SNOW,       group: 'elements', icon: '❄️', en: 'Snow',          fr: 'Neige',          hex: '#e2f1ff', useCustomColor: true,  relief: 0.65 },
    { id: MAT.ICE,        group: 'elements', icon: '🧊', en: 'Ice Block',     fr: 'Glace',          hex: '#93c5fd', useCustomColor: true,  relief: 0.82 },
    { id: MAT.ACID,       group: 'elements', icon: '🧪', en: 'Acid',          fr: 'Acide',          hex: '#84cc16', useCustomColor: false, relief: 0.35, glow: true },
    { id: MAT.WALL,       group: 'elements', icon: '🪨', en: 'Sculpt Wall',   fr: 'Mur / Roche',    hex: '#64748b', useCustomColor: true,  relief: 1.00 },

    // LIVING ECOSYSTEM
    { id: MAT.SEED,       group: 'life',     icon: '🌱', en: 'Flora Seed',    fr: 'Graine Vie',     hex: '#4ade80', useCustomColor: false, relief: 0.60 },
    { id: MAT.CLOUD,      group: 'life',     icon: '☁️', en: 'Storm Cloud',   fr: 'Nuage / Pluie',  hex: '#cbd5e1', useCustomColor: false, relief: 0.45 },
    { id: MAT.FISH,       group: 'life',     icon: '🐠', en: 'Koi Fish',      fr: 'Poisson Koï',    hex: '#fb923c', useCustomColor: false, relief: 0.65, glow: true },
    { id: MAT.BEE,        group: 'life',     icon: '🐝', en: 'Pollinator Bee',fr: 'Abeille',        hex: '#facc15', useCustomColor: false, relief: 0.55, glow: true },
    { id: MAT.ANT,        group: 'life',     icon: '🐜', en: 'Sand Ant',      fr: 'Fourmi',         hex: '#dc2626', useCustomColor: false, relief: 0.55 },
    { id: MAT.VIRUS,      group: 'life',     icon: '🦠', en: 'Nano Crystal',  fr: 'Nano Virus',     hex: '#2dd4bf', useCustomColor: false, relief: 0.72, glow: true },

    // COSMIC & GOD-MODE PHYSICS
    { id: MAT.VORTEX,     group: 'cosmic',   icon: '🕳️', en: 'Black Hole',    fr: 'Trou Noir',      hex: '#9333ea', useCustomColor: false, relief: 0.25, glow: true },
    { id: MAT.REPULSOR,   group: 'cosmic',   icon: '🛸', en: 'Anti-Gravity',  fr: 'Anti-Gravité',   hex: '#0ea5e9', useCustomColor: false, relief: 0.85, glow: true },
    { id: MAT.PORTAL_IN,  group: 'cosmic',   icon: '🔵', en: 'Portal IN',     fr: 'Portail Entrée', hex: '#2563eb', useCustomColor: false, relief: 0.90, glow: true },
    { id: MAT.PORTAL_OUT, group: 'cosmic',   icon: '🟠', en: 'Portal OUT',    fr: 'Portail Sortie', hex: '#f97316', useCustomColor: false, relief: 0.90, glow: true },
    { id: MAT.C4,         group: 'cosmic',   icon: '🧨', en: 'C4 Explosive',  fr: 'Explosif C4',    hex: '#be123c', useCustomColor: false, relief: 0.88 },
    { id: MAT.EMITTER,    group: 'cosmic',   icon: '⛲', en: 'Auto Spawner',  fr: 'Source Auto',    hex: '#6366f1', useCustomColor: false, relief: 0.90, glow: true },

    // OPTICS, CIRCUITS & KINETIC MUSIC
    { id: MAT.PIANO,      group: 'mech',     icon: '🎹', en: 'Chime Piano',   fr: 'Bloc Piano',     hex: '#eab308', useCustomColor: false, relief: 0.94, glow: true },
    { id: MAT.LASER,      group: 'mech',     icon: '🔦', en: 'Laser Emitter', fr: 'Laser Optique',  hex: '#f43f5e', useCustomColor: true,  relief: 0.96, glow: true },
    { id: MAT.MIRROR,     group: 'mech',     icon: '🪞', en: 'Prism Mirror',  fr: 'Miroir Prisme',  hex: '#e2e8f0', useCustomColor: false, relief: 0.96 },
    { id: MAT.GLASS,      group: 'mech',     icon: '💎', en: 'Crystal Glass', fr: 'Verre Prisme',   hex: '#bae6fd', useCustomColor: false, relief: 0.88 },
    { id: MAT.WIRE,       group: 'mech',     icon: '⚡', en: 'Copper Wire',   fr: 'Fil Cuivre',     hex: '#d97706', useCustomColor: false, relief: 0.85 },
    { id: MAT.SPARK,      group: 'mech',     icon: '🌩️', en: 'Voltage Spark', fr: 'Impulsion Élec.',hex: '#fef08a', useCustomColor: false, relief: 0.60, glow: true },
    { id: MAT.SENSOR,     group: 'mech',     icon: '📡', en: 'Flow Sensor',   fr: 'Capteur Flux',   hex: '#10b981', useCustomColor: false, relief: 0.92, glow: true },
    { id: MAT.DOOR,       group: 'mech',     icon: '🚪', en: 'Auto Gate',     fr: 'Porte Auto',     hex: '#78716c', useCustomColor: false, relief: 0.94 },
    { id: MAT.CONVEYOR,   group: 'mech',     icon: '⚙️', en: 'Conveyor Belt', fr: 'Convoyeur',      hex: '#94a3b8', useCustomColor: false, relief: 0.90 },
    { id: MAT.FAN,        group: 'mech',     icon: '🌀', en: 'Wind Turbine',  fr: 'Ventilateur',    hex: '#38bdf8', useCustomColor: false, relief: 0.90 },
    { id: MAT.EMPTY,      group: 'mech',     icon: '🧹', en: 'Eraser',        fr: 'Gomme',          hex: '#0f172a', useCustomColor: false, relief: 0.00 }
  ];

  // Lookup table by ID (includes hidden reaction products WOOD, STEAM, MUD, PLANT, LEAF, OBSIDIAN)
  const MAT_BY_ID = {};
  MATERIAL_LIST.forEach(m => { MAT_BY_ID[m.id] = m; });
  MAT_BY_ID[MAT.WOOD]     = { id: MAT.WOOD,     en: 'Wood',     fr: 'Bois',      hex: '#7c4d2b', relief: 0.84 };
  MAT_BY_ID[MAT.STEAM]    = { id: MAT.STEAM,    en: 'Steam',    fr: 'Vapeur',    hex: '#e2e8f0', relief: 0.15 };
  MAT_BY_ID[MAT.MUD]      = { id: MAT.MUD,      en: 'Mud',      fr: 'Boue',      hex: '#5c4033', relief: 0.68 };
  MAT_BY_ID[MAT.PLANT]    = { id: MAT.PLANT,    en: 'Vine',     fr: 'Plante',    hex: '#16a34a', relief: 0.72 };
  MAT_BY_ID[MAT.LEAF]     = { id: MAT.LEAF,     en: 'Blossom',  fr: 'Feuillage', hex: '#4ade80', relief: 0.64 };
  MAT_BY_ID[MAT.OBSIDIAN] = { id: MAT.OBSIDIAN, en: 'Obsidian', fr: 'Obsidienne',hex: '#27273a', relief: 0.96 };

  const GROUPS = [
    { id: 'elements', en: 'Fine Art & Elements',     fr: 'Art & Éléments' },
    { id: 'life',     en: 'Living Ecosystem',        fr: 'Écosystème Vivant' },
    { id: 'cosmic',   en: 'Cosmic & God Physics',    fr: 'Physique Cosmique' },
    { id: 'mech',     en: 'Optics, Circuits & Music',fr: 'Optique, Circuits & Son' }
  ];

  const I18N = {
    en: {
      back: 'Back',
      appTitle: 'Zen Sandscape',
      aiPromptPh: 'Describe living art: e.g. "sakura waterfall golden sand" or "black hole galaxy"',
      aiGenerate: 'AI World',
      play: 'Play',
      pause: 'Pause',
      step: 'Step',
      undo: 'Undo',
      redo: 'Redo',
      clear: 'Clear',
      stencils: 'Stencils',
      photoSand: 'Photo→Sand',
      arWall: 'AR Wall 3D',
      exportBtn: 'Export Art',
      tabMaterials: 'Materials',
      tabAI: 'AI Worlds',
      tabBrush: 'Brush & FX',
      brushShape: 'Brush & Symmetry',
      paletteLbl: 'Strata Art Palette',
      autoStrata: 'Auto-Cycling Mineral Strata',
      visualFx: 'Fine-Art Visual Shaders',
      fx3d: '3D Sculpt Relief',
      fxBloom: 'Luminous Bloom',
      fxTrails: 'Light Trails',
      backdropLbl: 'Gallery Backdrop',
      physicsLbl: 'Physics & Environment',
      gravLbl: 'Gravity',
      windLbl: 'Wind',
      speedLbl: 'Time Speed',
      audioLbl: 'Zen Sound & Piano Scale',
      audioToggle: 'Zen Audio',
      saveFree: 'Save .zsand',
      loadFree: 'Load',
      expTitle: 'Export 4K Print, Video, Web Art & 3D Relief AR',
      expPng4k: '4K Framed Fine-Art Print (.PNG)',
      expPng4kDesc: 'High-res museum print with glow & optional gallery mat',
      expVideo: 'Living Art Video + Audio (.MP4 / .WebM)',
      expVideoDesc: 'Records live motion + Zen piano music seamlessly',
      expHtml: 'Interactive Living Web Art (.HTML)',
      expHtmlDesc: 'Lightweight (<120KB) offline interactive physics canvas',
      expStl: '3D Sculpted Sand-Relief (.STL)',
      expStlDesc: 'Watertight tactile 3D relief mesh ready to 3D print',
      expGlb: 'Colored 3D Relief Sculpture (.GLB)',
      expGlbDesc: 'Vertex-colored 3D relief sculpture for Blender / Web',
      expAr: 'AR Wall Art Preview (1:1)',
      expArDesc: 'Hang your sculpted sand artwork on your real wall in AR!',
      expSave: 'Save Project (.zsand FREE)',
      expSaveDesc: 'Compact RLE backup keeping every particle & portal',
      blankCanvas: 'Blank Canvas',
      textSand: 'Text→Sand',
      colorStudio: 'Color Studio',
      modeCustom: 'Custom',
      modeStrata: 'Strata',
      modeRainbow: 'Rainbow',
      modeDropper: 'Pick',
      magicTools: 'Kinetic Sculpt Tools',
      toolPaint: 'Paint',
      toolTint: 'Recolor',
      toolMelt: 'Melt',
      toolFreeze: 'Freeze',
      toolRake: 'Zen Rake',
      toolMagnet: 'Magnet',
      reformTitle: 'Magnetic Reverse-Sand Magic',
      lockTarget: 'Lock Target',
      magneticReform: 'Reassemble',
      cutoutObject: 'Object Only',
      cutoutFull: 'With Background',
      stampArt: 'Stamp to Canvas',
      useAsBackdrop: 'Set as Backdrop',
      cancelStage: 'Cancel',
      welcomeTitle: 'Clean Blank Studio — Ready to Create',
      welcomeSub: 'Draw freehand, place & cut out any photo, or launch a living AI world'
    },
    fr: {
      back: 'Retour',
      appTitle: 'Zen Sandscape',
      aiPromptPh: 'Décrivez une œuvre : ex "cascade sakura sable doré" ou "trou noir nébuleuse"',
      aiGenerate: 'Monde IA',
      play: 'Lecture',
      pause: 'Pause',
      step: 'Pas',
      undo: 'Annuler',
      redo: 'Rétablir',
      clear: 'Vider',
      stencils: 'Modèles',
      photoSand: 'Photo→Sable',
      arWall: 'AR Mur 3D',
      exportBtn: 'Exporter',
      tabMaterials: 'Matériaux',
      tabAI: 'Mondes IA',
      tabBrush: 'Pinceau & FX',
      brushShape: 'Pinceau & Symétrie',
      paletteLbl: 'Palette Minérale',
      autoStrata: 'Strates Minérales Auto',
      visualFx: 'Shaders Beaux-Arts',
      fx3d: 'Relief 3D Sculpté',
      fxBloom: 'Lueur Néon Bloom',
      fxTrails: 'Traînées Lumineuses',
      backdropLbl: 'Fond de Galerie',
      physicsLbl: 'Physique & Environnement',
      gravLbl: 'Gravité',
      windLbl: 'Vent',
      speedLbl: 'Vitesse',
      audioLbl: 'Audio Zen & Gamme Piano',
      audioToggle: 'Audio Zen',
      saveFree: 'Sauver .zsand',
      loadFree: 'Ouvrir',
      expTitle: 'Exporter Print 4K, Vidéo, Art Web & Relief 3D AR',
      expPng4k: 'Tirage d’Art 4K Encadré (.PNG)',
      expPng4kDesc: 'Image HD musée avec lueur bloom & passe-partout',
      expVideo: 'Vidéo d’Art + Audio (.MP4 / .WebM)',
      expVideoDesc: 'Enregistre la physique vivante + musique piano Zen',
      expHtml: 'Œuvre Web Interactive (.HTML)',
      expHtmlDesc: 'Page autonome (<120Ko) réellement interactive hors-ligne',
      expStl: 'Relief 3D Sculpté (.STL)',
      expStlDesc: 'Maillage 3D tactile étanche prêt pour impression 3D',
      expGlb: 'Sculpture Relief 3D Couleur (.GLB)',
      expGlbDesc: 'Relief 3D coloré prêt pour Blender / Web',
      expAr: 'Aperçu Tableau AR 3D (Mur)',
      expArDesc: 'Accrochez votre œuvre de sable en 3D sur votre mur !',
      expSave: 'Sauver Projet (.zsand GRATUIT)',
      expSaveDesc: 'Sauvegarde compacte RLE (particules, portails & FX)',
      blankCanvas: 'Écran Vide',
      textSand: 'Texte→Sable',
      colorStudio: 'Studio Couleur',
      modeCustom: 'Fixe',
      modeStrata: 'Strates',
      modeRainbow: 'Arc-en-ciel',
      modeDropper: 'Pipette',
      magicTools: 'Outils Magiques Cinétiques',
      toolPaint: 'Peindre',
      toolTint: 'Recolorer',
      toolMelt: 'Fondre',
      toolFreeze: 'Figer',
      toolRake: 'Râteau Zen',
      toolMagnet: 'Aimant',
      reformTitle: 'Magie Sable Magnétique Inversé',
      lockTarget: 'Fixer Cible',
      magneticReform: 'Réassembler',
      cutoutObject: 'Objet Seul',
      cutoutFull: 'Avec Fond',
      stampArt: 'Appliquer',
      useAsBackdrop: 'Mettre en Fond',
      cancelStage: 'Annuler',
      welcomeTitle: 'Toile Vierge — Prêt à Créer',
      welcomeSub: 'Dessinez librement, placez et découpez vos photos ou lancez un monde IA'
    }
  };

  function getT(lang) { return I18N[lang === 'fr' ? 'fr' : 'en']; }

  const SandMaterials = {
    MAT, MATERIAL_LIST, MAT_BY_ID, GROUPS, PALETTES, QUICK_COLORS, I18N,
    packRGBA, hexToRgb, hexToPacked, varyPacked, hslToPacked, samplePalettePacked, getT
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = SandMaterials;
  if (globalScope) globalScope.SandMaterials = SandMaterials;
})(typeof window !== 'undefined' ? window : globalThis);
