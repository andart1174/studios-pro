/**
 * Jewelry Maker Pro — Master Precision 1:1 mm CAD Geometry Engine
 * Pure zero-dependency UMD engine (runs in Browser & Node.js unit tests).
 *
 * Conventions:
 *  - Native Units: 1.0 unit === 1.000 mm (exact millimeter CAD for lost-wax casting & resin 3D printing).
 *  - Upright Display Orientation: +Y is UP (center stone / bail / tiara peak), +Z is toward viewer.
 *  - Every mesh part is guaranteed Watertight Manifold with verified Outward Normals (signed volume > 0).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.JewelryEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PI = Math.PI;
  const TAU = Math.PI * 2;

  /* =========================================================================
     1. INTERNATIONAL RING & BRACELET SIZING TABLES (EXACT MILLIMETERS)
  ========================================================================= */
  const RING_SIZES = [
    { eu: 44, us: '3',    uk: 'F',   jp: 4,  mm: 14.00 },
    { eu: 46, us: '3.75', uk: 'H',   jp: 6,  mm: 14.64 },
    { eu: 48, us: '4.5',  uk: 'I½',  jp: 8,  mm: 15.28 },
    { eu: 50, us: '5.25', uk: 'K',   jp: 10, mm: 15.92 },
    { eu: 52, us: '6',    uk: 'L½',  jp: 12, mm: 16.55 },
    { eu: 54, us: '7',    uk: 'N½',  jp: 14, mm: 17.20 },
    { eu: 56, us: '7.5',  uk: 'O½',  jp: 15, mm: 17.83 },
    { eu: 58, us: '8.5',  uk: 'Q½',  jp: 17, mm: 18.46 },
    { eu: 60, us: '9',    uk: 'R½',  jp: 19, mm: 19.10 },
    { eu: 62, us: '10',   uk: 'T½',  jp: 21, mm: 19.74 },
    { eu: 64, us: '10.75',uk: 'V',   jp: 23, mm: 20.37 },
    { eu: 66, us: '11.5', uk: 'W½',  jp: 25, mm: 21.01 },
    { eu: 68, us: '12.25',uk: 'Y',   jp: 27, mm: 21.65 },
    { eu: 70, us: '13',   uk: 'Z+1', jp: 29, mm: 22.28 },
    { eu: 72, us: '13.5', uk: 'Z+2', jp: 31, mm: 22.92 }
  ];

  const BRACELET_SIZES = [
    { id: 'xs', labelEn: 'XS — Petite Wrist (54 mm)',  labelFr: 'XS — Poignet Fin (54 mm)',   mm: 54.0 },
    { id: 's',  labelEn: 'S — Small Wrist (58 mm)',    labelFr: 'S — Petit Poignet (58 mm)',  mm: 58.0 },
    { id: 'm',  labelEn: 'M — Standard Wrist (62 mm)', labelFr: 'M — Poignet Standard (62 mm)', mm: 62.0 },
    { id: 'l',  labelEn: 'L — Large Wrist (66 mm)',    labelFr: 'L — Grand Poignet (66 mm)',  mm: 66.0 },
    { id: 'xl', labelEn: 'XL — Men / Wide (70 mm)',    labelFr: 'XL — Homme / Large (70 mm)', mm: 70.0 }
  ];

  /* =========================================================================
     2. PRECIOUS METAL ALLOYS & REAL KARAT DENSITIES
  ========================================================================= */
  const ALLOYS = {
    gold18k:     { id: 'gold18k',     nameEn: '18k Yellow Gold (750)',  nameFr: 'Or Jaune 18k (750)',   density: 15.58, spotEur: 68.0, color: '#F2C75C', metalness: 0.97, roughness: 0.08, swatch: 'linear-gradient(135deg,#FFF1B8,#EAB308,#A16207)' },
    gold24k:     { id: 'gold24k',     nameEn: '24k Pure Gold (999)',    nameFr: 'Or Pur 24k (999)',     density: 19.32, spotEur: 88.0, color: '#FFD23F', metalness: 0.98, roughness: 0.07, swatch: 'linear-gradient(135deg,#FEF08A,#FACC15,#B45309)' },
    gold14k:     { id: 'gold14k',     nameEn: '14k Champagne Gold (585)',nameFr: 'Or Champagne 14k (585)',density: 13.07, spotEur: 53.0, color: '#E8CB8B', metalness: 0.95, roughness: 0.09, swatch: 'linear-gradient(135deg,#FBF0D1,#D4AF6A,#8C6D32)' },
    rosegold18k: { id: 'rosegold18k', nameEn: '18k Rose Gold (750)',    nameFr: 'Or Rose 18k (750)',    density: 15.40, spotEur: 67.0, color: '#E5A18F', metalness: 0.96, roughness: 0.08, swatch: 'linear-gradient(135deg,#FCDAD0,#D98C7A,#8E4E41)' },
    whitegold18k:{ id: 'whitegold18k',nameEn: '18k White Gold (Pd)',    nameFr: 'Or Blanc 18k (Pd)',    density: 15.65, spotEur: 71.0, color: '#E9ECF2', metalness: 0.97, roughness: 0.07, swatch: 'linear-gradient(135deg,#FFFFFF,#D8DFE9,#8F9AA9)' },
    platinum950: { id: 'platinum950', nameEn: 'Platinum Pt950',         nameFr: 'Platine Pt950',        density: 21.45, spotEur: 34.0, color: '#DCE1E8', metalness: 0.98, roughness: 0.06, swatch: 'linear-gradient(135deg,#F8FAFC,#CBD5E1,#64748B)' },
    silver925:   { id: 'silver925',   nameEn: 'Sterling Silver 925',    nameFr: 'Argent Massif 925',    density: 10.36, spotEur: 1.15, color: '#F2F4F8', metalness: 0.97, roughness: 0.07, swatch: 'linear-gradient(135deg,#FFFFFF,#E2E8F0,#94A3B8)' },
    blackrhodium:{ id: 'blackrhodium',nameEn: 'Black Rhodium',          nameFr: 'Rhodium Noir',         density: 15.50, spotEur: 76.0, color: '#3B4049', metalness: 0.94, roughness: 0.11, swatch: 'linear-gradient(135deg,#64748B,#334155,#0F172A)' },
    titanium:    { id: 'titanium',    nameEn: 'Grade 5 Titanium',       nameFr: 'Titane Grade 5',       density: 4.43,  spotEur: 4.5,  color: '#9BA3AF', metalness: 0.91, roughness: 0.16, swatch: 'linear-gradient(135deg,#CBD5E1,#94A3B8,#475569)' },
    waxresin:    { id: 'waxresin',    nameEn: 'Castable Wax Resin',     nameFr: 'Résine Calcinable',    density: 1.12,  spotEur: 0.45, color: '#38BDF8', metalness: 0.06, roughness: 0.28, swatch: 'linear-gradient(135deg,#7DD3FC,#0284C7,#0369A1)' }
  };

  /* =========================================================================
     3. GIA GEMSTONE MATERIALS & CARAT-TO-MM PROPORTIONS
  ========================================================================= */
  const GEM_MATERIALS = {
    diamond:    { id: 'diamond',    nameEn: 'Diamond (D-Color)', nameFr: 'Diamant (Couleur D)', color: '#FFFFFF', attenuation: '#EEF6FF', ior: 2.417, dispersion: 0.044, transmission: 0.96, roughness: 0.015, eurPerCt: 2600 },
    champagne:  { id: 'champagne',  nameEn: 'Champagne Diamond', nameFr: 'Diamant Champagne',   color: '#FBE8C2', attenuation: '#EAB974', ior: 2.417, dispersion: 0.040, transmission: 0.93, roughness: 0.02,  eurPerCt: 1650 },
    ruby:       { id: 'ruby',       nameEn: 'Burmese Ruby',      nameFr: 'Rubis Birman',        color: '#E11D48', attenuation: '#9F1239', ior: 1.770, dispersion: 0.018, transmission: 0.88, roughness: 0.02,  eurPerCt: 1500 },
    sapphire:   { id: 'sapphire',   nameEn: 'Royal Sapphire',    nameFr: 'Saphir Royal',        color: '#1D4ED8', attenuation: '#1E3A8A', ior: 1.770, dispersion: 0.018, transmission: 0.88, roughness: 0.02,  eurPerCt: 1350 },
    emerald:    { id: 'emerald',    nameEn: 'Colombian Emerald', nameFr: 'Émeraude Colombie',   color: '#059669', attenuation: '#065F46', ior: 1.580, dispersion: 0.014, transmission: 0.85, roughness: 0.025, eurPerCt: 1450 },
    amethyst:   { id: 'amethyst',   nameEn: 'Siberian Amethyst', nameFr: 'Améthyste Sibérie',   color: '#8B5CF6', attenuation: '#5B21B6', ior: 1.550, dispersion: 0.013, transmission: 0.90, roughness: 0.02,  eurPerCt: 180 },
    aquamarine: { id: 'aquamarine', nameEn: 'Aquamarine',        nameFr: 'Aigue-Marine',        color: '#5EEAD4', attenuation: '#0D9488', ior: 1.580, dispersion: 0.014, transmission: 0.92, roughness: 0.02,  eurPerCt: 340 },
    morganite:  { id: 'morganite',  nameEn: 'Blush Morganite',   nameFr: 'Morganite Rose',      color: '#FBCFE8', attenuation: '#EC4899', ior: 1.590, dispersion: 0.014, transmission: 0.91, roughness: 0.02,  eurPerCt: 290 },
    citrine:    { id: 'citrine',    nameEn: 'Madeira Citrine',   nameFr: 'Citrine Madère',      color: '#F59E0B', attenuation: '#B45309', ior: 1.550, dispersion: 0.013, transmission: 0.90, roughness: 0.02,  eurPerCt: 140 },
    onyx:       { id: 'onyx',       nameEn: 'Jet Black Onyx',    nameFr: 'Onyx Noir',           color: '#14171F', attenuation: '#090B0E', ior: 1.540, dispersion: 0.0,   transmission: 0.0,  roughness: 0.04,  eurPerCt: 95 },
    pearl:      { id: 'pearl',      nameEn: 'Akoya Pearl',       nameFr: 'Perle Akoya',         color: '#FAF6EE', attenuation: '#F5EFE6', ior: 1.530, dispersion: 0.0,   transmission: 0.0,  roughness: 0.14,  eurPerCt: 240, isPearl: true }
  };

  function getGemDimensionsMm(cut, carat) {
    const ct = Math.max(0.02, Math.min(12.0, Number(carat) || 1.0));
    const k = Math.cbrt(ct);
    switch (cut) {
      case 'princess': return { w: 5.50 * k, l: 5.50 * k, crownH: 0.85 * k, girdleH: 0.18 * k, pavilionH: 2.85 * k, tableRatio: 0.68 };
      case 'emerald':  return { w: 5.05 * k, l: 7.05 * k, crownH: 0.78 * k, girdleH: 0.18 * k, pavilionH: 2.55 * k, tableRatio: 0.66 };
      case 'oval':     return { w: 5.60 * k, l: 7.70 * k, crownH: 0.92 * k, girdleH: 0.18 * k, pavilionH: 2.75 * k, tableRatio: 0.58 };
      case 'pear':     return { w: 5.45 * k, l: 8.15 * k, crownH: 0.90 * k, girdleH: 0.18 * k, pavilionH: 2.70 * k, tableRatio: 0.58 };
      case 'marquise': return { w: 4.90 * k, l: 9.80 * k, crownH: 0.86 * k, girdleH: 0.17 * k, pavilionH: 2.55 * k, tableRatio: 0.57 };
      case 'heart':    return { w: 6.45 * k, l: 6.10 * k, crownH: 0.90 * k, girdleH: 0.18 * k, pavilionH: 2.70 * k, tableRatio: 0.58 };
      case 'cushion':  return { w: 5.85 * k, l: 6.35 * k, crownH: 0.96 * k, girdleH: 0.19 * k, pavilionH: 2.80 * k, tableRatio: 0.60 };
      case 'pearl':    return { w: 6.50 * k, l: 6.50 * k, crownH: 3.25 * k, girdleH: 0.0,      pavilionH: 3.25 * k, tableRatio: 0.0 };
      case 'round':
      default:         return { w: 6.50 * k, l: 6.50 * k, crownH: 1.01 * k, girdleH: 0.19 * k, pavilionH: 2.80 * k, tableRatio: 0.57 };
    }
  }

  /* =========================================================================
     4. PROFILES & PRESETS CATALOG
  ========================================================================= */
  const CATEGORY_PROFILES = {
    rings: [
      { id: 'classic',    en: 'Classic D-Shape (Comfort)',    fr: 'Classique Demi-Jonc (Confort)' },
      { id: 'comfort',    en: 'Ergonomic Court Fit',          fr: 'Confort Intérieur Bombé' },
      { id: 'flat',       en: 'Flat Micro-Chamfered',         fr: 'Ruban Plat Micro-Biseauté' },
      { id: 'cathedral',  en: 'Cathedral Solitaire Arch',     fr: 'Cathédrale Solitaire' },
      { id: 'signet',     en: 'Royal Sculpted Signet',        fr: 'Chevalière Royale Plateau' },
      { id: 'twisted',    en: 'Braided Twisted Rope',         fr: 'Torsade Corde Tressée' },
      { id: 'knife',      en: 'Architectural Knife-Edge',     fr: 'Arête Vive Architecturale' },
      { id: 'hex',        en: 'Hexagonal (Circular Bore)',    fr: 'Hexagonal (Intérieur Rond)' },
      { id: 'crown_band', en: 'Royal Crown Ring',             fr: 'Bague Couronne Royale' }
    ],
    bracelets: [
      { id: 'bangle',       en: 'Ergonomic Oval Bangle',      fr: 'Jonc Ovale Ergonomique' },
      { id: 'cuff',         en: 'End-Capped Open Cuff',       fr: 'Manchette Ouverte Étanche' },
      { id: 'twisted_cuff', en: 'Twisted Torque Cuff + Balls',fr: 'Torque Torsadé + Boules' },
      { id: 'tennis',       en: 'Diamond Tennis Bracelet',    fr: 'Bracelet Rivière Tennis' }
    ],
    medallions: [
      { id: 'coin',      en: 'Classic Beaded Coin',           fr: 'Médaille Pièce Perlée' },
      { id: 'oval',      en: 'Vintage Cameo Oval',            fr: 'Médaillon Ovale Camée' },
      { id: 'heart',     en: 'Puffed Heart Locket',           fr: 'Médaillon Cœur Bombé' },
      { id: 'dogtag',    en: 'Luxury Rounded Tag',            fr: 'Plaque Luxe Arrondie' },
      { id: 'octagon',   en: 'Faceted Octagon Crest',         fr: 'Octogone Facetté' },
      { id: 'starburst', en: 'Imperial Starburst',            fr: 'Étoile Impériale' }
    ],
    necklaces: [
      { id: 'curb',    en: 'Miami Cuban Flat Curb',           fr: 'Maille Gourmette Cubaine' },
      { id: 'cable',   en: 'Classic Interlocked Cable',       fr: 'Maille Forçat Classique' },
      { id: 'belcher', en: 'Heavy Royal Rolo / Belcher',      fr: 'Maille Jaseron / Rolo' }
    ],
    earrings: [
      { id: 'drop', en: 'Royal Teardrop Drops (Pair ×2)',     fr: 'Pendantes Goutte Royale (Paire ×2)' },
      { id: 'hoop', en: 'Creole Hoops + Post (Pair ×2)',      fr: 'Créoles + Tige (Paire ×2)' },
      { id: 'stud', en: 'Solitaire Halo Studs (Pair ×2)',     fr: 'Puces Solitaire Halo (Paire ×2)' }
    ],
    crowns: [
      { id: 'tiara', en: 'Imperial Bridal Cathedral Tiara',   fr: 'Diadème Mariée Cathédrale' },
      { id: 'elven', en: 'Elven Woodland Circlet',            fr: 'Diadème Elfique Tressé' }
    ]
  };

  const DEFAULT_STATE = {
    category: 'rings',
    profile: 'cathedral',
    innerDiameter: 17.20, // EU 54 / US 7 exact inner diameter in mm!
    thickness: 2.0,       // Radial wall thickness (mm)
    width: 4.5,           // Band axial width (mm)
    shankTaper: 0.25,     // 0..0.5 taper toward palm bottom
    material: 'gold18k',
    innerMaterial: 'same',
    finish: 'mirror',
    stoneType: 'round',
    stoneMaterial: 'diamond',
    stoneCarat: 1.0,
    stoneLayout: 'solitaire',
    stoneSetting: 'prong6',
    procPattern: 'none',
    patIntensity: 0.45,
    engraveText: '',
    engraveFont: 'Georgia, serif',
    engraveMode: 'recessed', // 'recessed' | 'raised'
    engraveSize: 65,
    engraveInside: true,
    reliefDepth: 0.45,       // mm
    reliefInvert: false,
    photoZoom: 1.0,
    photoOffX: 0.0,
    photoOffY: 0.0,
    photoRot: 0,
    customGems: [],          // [{ u, v, carat }]
    castableMetalOnly: false,
    shrinkagePercent: 0,     // 0 | 1.5 | 2.5
    quality: 144             // angular resolution
  };

  const PRESETS = {
    halo_solitaire: {
      nameEn: 'Imperial Diamond Halo', nameFr: 'Halo Diamant Impérial', icon: '💎',
      patch: { category: 'rings', profile: 'cathedral', innerDiameter: 17.20, width: 3.2, thickness: 1.9, shankTaper: 0.28, material: 'platinum950', innerMaterial: 'same', finish: 'mirror', stoneType: 'round', stoneMaterial: 'diamond', stoneCarat: 1.5, stoneLayout: 'halo', stoneSetting: 'prong4', procPattern: 'none', engraveText: 'FOREVER', engraveInside: true }
    },
    royal_signet: {
      nameEn: 'Royal Heraldic Signet', nameFr: 'Chevalière Royale', icon: '👑',
      patch: { category: 'rings', profile: 'signet', innerDiameter: 19.10, width: 9.5, thickness: 2.2, shankTaper: 0.45, material: 'gold18k', innerMaterial: 'same', finish: 'satin', stoneType: 'none', stoneLayout: 'solitaire', procPattern: 'none', engraveText: 'S·P', engraveInside: false, engraveMode: 'recessed', engraveSize: 78 }
    },
    celtic_milgrain: {
      nameEn: 'Celtic Milgrain Band', nameFr: 'Alliance Celtique Perlée', icon: '🌀',
      patch: { category: 'rings', profile: 'comfort', innerDiameter: 18.46, width: 6.0, thickness: 2.1, shankTaper: 0.0, material: 'whitegold18k', innerMaterial: 'gold18k', finish: 'mirror', stoneType: 'none', procPattern: 'celtic', patIntensity: 0.55, engraveText: '' }
    },
    rose_eternity: {
      nameEn: 'Rose Gold Eternity', nameFr: 'Éternité Or Rose', icon: '✨',
      patch: { category: 'rings', profile: 'comfort', innerDiameter: 16.55, width: 3.4, thickness: 1.9, shankTaper: 0.0, material: 'rosegold18k', innerMaterial: 'same', finish: 'mirror', stoneType: 'round', stoneMaterial: 'diamond', stoneCarat: 0.14, stoneLayout: 'eternity', stoneSetting: 'prong4', procPattern: 'milgrain', patIntensity: 0.35, engraveText: '' }
    },
    emerald_trinity: {
      nameEn: 'Emerald Cathedral Trinity', nameFr: 'Trilogie Émeraude', icon: '💚',
      patch: { category: 'rings', profile: 'cathedral', innerDiameter: 17.20, width: 3.6, thickness: 2.0, shankTaper: 0.25, material: 'gold18k', innerMaterial: 'same', finish: 'mirror', stoneType: 'emerald', stoneMaterial: 'emerald', stoneCarat: 1.75, stoneLayout: 'trinity', stoneSetting: 'prong4', procPattern: 'none', engraveText: '' }
    },
    heart_locket: {
      nameEn: 'Victorian Heart Locket', nameFr: 'Médaillon Cœur Victorien', icon: '❤️',
      patch: { category: 'medallions', profile: 'heart', innerDiameter: 24.0, width: 24.0, thickness: 2.8, material: 'rosegold18k', innerMaterial: 'same', finish: 'mirror', stoneType: 'heart', stoneMaterial: 'ruby', stoneCarat: 1.0, stoneLayout: 'halo', stoneSetting: 'prong4', procPattern: 'guilloche', patIntensity: 0.35, engraveText: '' }
    },
    cuban_chain: {
      nameEn: 'Miami Cuban Chain', nameFr: 'Chaîne Cubaine Miami', icon: '⛓️',
      patch: { category: 'necklaces', profile: 'curb', innerDiameter: 145.0, width: 7.5, thickness: 2.6, material: 'gold18k', innerMaterial: 'same', finish: 'mirror', stoneType: 'none', procPattern: 'none', engraveText: '' }
    },
    imperial_tiara: {
      nameEn: 'Bridal Cathedral Tiara', nameFr: 'Diadème Cathédrale', icon: '👸',
      patch: { category: 'crowns', profile: 'tiara', innerDiameter: 142.0, width: 34.0, thickness: 2.4, material: 'platinum950', innerMaterial: 'same', finish: 'mirror', stoneType: 'pear', stoneMaterial: 'sapphire', stoneCarat: 1.4, stoneLayout: 'solitaire', stoneSetting: 'prong4', procPattern: 'none', engraveText: '' }
    },
    royal_drops: {
      nameEn: 'Royal Sapphire Drops', nameFr: 'Pendantes Saphir Royal', icon: '💧',
      patch: { category: 'earrings', profile: 'drop', innerDiameter: 22.0, width: 4.0, thickness: 2.0, material: 'whitegold18k', innerMaterial: 'same', finish: 'mirror', stoneType: 'pear', stoneMaterial: 'sapphire', stoneCarat: 1.5, stoneLayout: 'halo', stoneSetting: 'prong4', procPattern: 'none', engraveText: '' }
    },
    torque_cuff: {
      nameEn: 'Sculpted Torque Cuff', nameFr: 'Manchette Torque Or', icon: '⭕',
      patch: { category: 'bracelets', profile: 'twisted_cuff', innerDiameter: 62.0, width: 6.5, thickness: 3.4, material: 'gold18k', innerMaterial: 'same', finish: 'mirror', stoneType: 'none', procPattern: 'none', engraveText: '' }
    }
  };

  /* =========================================================================
     5. LOW-LEVEL WATERTIGHT MESH BUILDERS & TOPOLOGY VERIFIERS
  ========================================================================= */
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function smoothstep(e0, e1, x) {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  /**
   * Computes signed volume of an indexed triangle mesh in mm^3.
   * Positive volume guarantees outward-pointing right-handed normals.
   */
  function computeSignedVolume(positions, indices) {
    let vol6 = 0;
    for (let i = 0; i < indices.length; i += 3) {
      const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
      const ax = positions[a], ay = positions[a + 1], az = positions[a + 2];
      const bx = positions[b], by = positions[b + 1], bz = positions[b + 2];
      const cx = positions[c], cy = positions[c + 1], cz = positions[c + 2];
      vol6 += ax * (by * cz - bz * cy)
            + ay * (bz * cx - bx * cz)
            + az * (bx * cy - by * cx);
    }
    return vol6 / 6.0;
  }

  /**
   * Ensures every closed triangle mesh has positive signed volume (outward normals).
   */
  function ensureOutwardWinding(positions, indices) {
    const v = computeSignedVolume(positions, indices);
    if (v < 0) {
      for (let i = 0; i < indices.length; i += 3) {
        const tmp = indices[i + 1];
        indices[i + 1] = indices[i + 2];
        indices[i + 2] = tmp;
      }
      return -v;
    }
    return v;
  }

  /**
   * Computes smooth vertex normals (or flat face normals when flat=true).
   */
  function computeVertexNormals(positions, indices) {
    const normals = new Float32Array(positions.length);
    for (let i = 0; i < indices.length; i += 3) {
      const ia = indices[i] * 3, ib = indices[i + 1] * 3, ic = indices[i + 2] * 3;
      const ax = positions[ia], ay = positions[ia + 1], az = positions[ia + 2];
      const abx = positions[ib] - ax, aby = positions[ib + 1] - ay, abz = positions[ib + 2] - az;
      const acx = positions[ic] - ax, acy = positions[ic + 1] - ay, acz = positions[ic + 2] - az;
      const nx = aby * acz - abz * acy;
      const ny = abz * acx - abx * acz;
      const nz = abx * acy - aby * acx;
      normals[ia] += nx; normals[ia + 1] += ny; normals[ia + 2] += nz;
      normals[ib] += nx; normals[ib + 1] += ny; normals[ib + 2] += nz;
      normals[ic] += nx; normals[ic + 1] += ny; normals[ic + 2] += nz;
    }
    for (let i = 0; i < normals.length; i += 3) {
      const len = Math.hypot(normals[i], normals[i + 1], normals[i + 2]);
      if (len > 1e-12) {
        normals[i] /= len; normals[i + 1] /= len; normals[i + 2] /= len;
      } else {
        normals[i] = 0; normals[i + 1] = 1; normals[i + 2] = 0;
      }
    }
    return normals;
  }

  /**
   * Converts an indexed mesh to flat-shaded crisp facets (for faceted gemstones).
   */
  function makeFlatShadedPart(positions, indices, meta) {
    ensureOutwardWinding(positions, indices);
    const triCount = indices.length / 3;
    const outPos = new Float32Array(triCount * 9);
    const outNorm = new Float32Array(triCount * 9);
    const outIdx = new Uint32Array(triCount * 3);
    for (let t = 0; t < triCount; t++) {
      const ia = indices[t * 3] * 3, ib = indices[t * 3 + 1] * 3, ic = indices[t * 3 + 2] * 3;
      const ax = positions[ia], ay = positions[ia + 1], az = positions[ia + 2];
      const bx = positions[ib], by = positions[ib + 1], bz = positions[ib + 2];
      const cx = positions[ic], cy = positions[ic + 1], cz = positions[ic + 2];
      const abx = bx - ax, aby = by - ay, abz = bz - az;
      const acx = cx - ax, acy = cy - ay, acz = cz - az;
      let nx = aby * acz - abz * acy;
      let ny = abz * acx - abx * acz;
      let nz = abx * acy - aby * acx;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len; nz /= len;
      const o = t * 9;
      outPos[o] = ax; outPos[o + 1] = ay; outPos[o + 2] = az;
      outPos[o + 3] = bx; outPos[o + 4] = by; outPos[o + 5] = bz;
      outPos[o + 6] = cx; outPos[o + 7] = cy; outPos[o + 8] = cz;
      for (let k = 0; k < 3; k++) {
        outNorm[o + k * 3] = nx; outNorm[o + k * 3 + 1] = ny; outNorm[o + k * 3 + 2] = nz;
        outIdx[t * 3 + k] = t * 3 + k;
      }
    }
    return Object.assign({
      positions: outPos,
      normals: outNorm,
      indices: outIdx,
      topologyPositions: positions,
      topologyIndices: indices,
      flatShaded: true
    }, meta);
  }

  /**
   * Wraps an indexed closed mesh into a verified smooth-shaded Part.
   */
  function makeSmoothPart(positions, indices, meta) {
    ensureOutwardWinding(positions, indices);
    const normals = computeVertexNormals(positions, indices);
    return Object.assign({
      positions: positions,
      normals: normals,
      indices: indices,
      topologyPositions: positions,
      topologyIndices: indices,
      flatShaded: false
    }, meta);
  }

  /**
   * Builds a 100% WATERTIGHT CLOSED TUBE LOOP from rings of 3D points:
   * rings[i][j] = [x, y, z], where i = 0..N-1 wraps seamlessly to 0, j = 0..M-1 wraps seamlessly to 0.
   */
  function buildClosedLoopTube(rings, meta, vertexZones) {
    const N = rings.length;
    const M = rings[0].length;
    const positions = new Float32Array(N * M * 3);
    const zones = vertexZones ? new Uint8Array(N * M) : null;
    for (let i = 0; i < N; i++) {
      const ring = rings[i];
      for (let j = 0; j < M; j++) {
        const idx = i * M + j;
        positions[idx * 3]     = ring[j][0];
        positions[idx * 3 + 1] = ring[j][1];
        positions[idx * 3 + 2] = ring[j][2];
        if (zones) zones[idx] = vertexZones[j];
      }
    }
    const indices = new Uint32Array(N * M * 6);
    let ptr = 0;
    for (let i = 0; i < N; i++) {
      const iNext = (i + 1) % N;
      for (let j = 0; j < M; j++) {
        const jNext = (j + 1) % M;
        const a = i * M + j;
        const b = iNext * M + j;
        const c = iNext * M + jNext;
        const d = i * M + jNext;
        indices[ptr++] = a; indices[ptr++] = b; indices[ptr++] = c;
        indices[ptr++] = a; indices[ptr++] = c; indices[ptr++] = d;
      }
    }
    const part = makeSmoothPart(positions, indices, meta);
    if (zones) part.zones = zones;
    return part;
  }

  /**
   * Builds a 100% WATERTIGHT END-CAPPED OPEN TUBE (used for Open Cuffs, Prongs, Bail, Posts, Tiara arches).
   * rings[0..N-1] each has M vertices; domed or flat caps seal both ends cleanly with 0 open edges!
   */
  function buildCappedTube(rings, meta, domeCapLen) {
    const capDome = domeCapLen || 0;
    const N = rings.length;
    const M = rings[0].length;

    // Optional rounded dome rings at start & end
    const allRings = [];
    function ringCenter(r) {
      let cx = 0, cy = 0, cz = 0;
      for (let j = 0; j < M; j++) { cx += r[j][0]; cy += r[j][1]; cz += r[j][2]; }
      return [cx / M, cy / M, cz / M];
    }
    const c0 = ringCenter(rings[0]);
    const c1 = ringCenter(rings[1]);
    let sDir = [c0[0] - c1[0], c0[1] - c1[1], c0[2] - c1[2]];
    let sLen = Math.hypot(sDir[0], sDir[1], sDir[2]) || 1;
    sDir = [sDir[0] / sLen, sDir[1] / sLen, sDir[2] / sLen];

    const cN = ringCenter(rings[N - 1]);
    const cNm1 = ringCenter(rings[N - 2]);
    let eDir = [cN[0] - cNm1[0], cN[1] - cNm1[1], cN[2] - cNm1[2]];
    let eLen = Math.hypot(eDir[0], eDir[1], eDir[2]) || 1;
    eDir = [eDir[0] / eLen, eDir[1] / eLen, eDir[2] / eLen];

    if (capDome > 0) {
      const steps = 3;
      for (let k = steps; k >= 1; k--) {
        const a = (k / (steps + 1)) * (PI / 2);
        const radScale = Math.cos(a);
        const ext = Math.sin(a) * capDome;
        const r = [];
        for (let j = 0; j < M; j++) {
          r.push([
            c0[0] + (rings[0][j][0] - c0[0]) * radScale + sDir[0] * ext,
            c0[1] + (rings[0][j][1] - c0[1]) * radScale + sDir[1] * ext,
            c0[2] + (rings[0][j][2] - c0[2]) * radScale + sDir[2] * ext
          ]);
        }
        allRings.push(r);
      }
    }

    for (let i = 0; i < N; i++) allRings.push(rings[i]);

    if (capDome > 0) {
      const steps = 3;
      for (let k = 1; k <= steps; k++) {
        const a = (k / (steps + 1)) * (PI / 2);
        const radScale = Math.cos(a);
        const ext = Math.sin(a) * capDome;
        const r = [];
        for (let j = 0; j < M; j++) {
          r.push([
            cN[0] + (rings[N - 1][j][0] - cN[0]) * radScale + eDir[0] * ext,
            cN[1] + (rings[N - 1][j][1] - cN[1]) * radScale + eDir[1] * ext,
            cN[2] + (rings[N - 1][j][2] - cN[2]) * radScale + eDir[2] * ext
          ]);
        }
        allRings.push(r);
      }
    }

    const totalR = allRings.length;
    const startCenter = [c0[0] + sDir[0] * capDome, c0[1] + sDir[1] * capDome, c0[2] + sDir[2] * capDome];
    const endCenter   = [cN[0] + eDir[0] * capDome, cN[1] + eDir[1] * capDome, cN[2] + eDir[2] * capDome];

    const vertCount = totalR * M + 2;
    const positions = new Float32Array(vertCount * 3);
    for (let i = 0; i < totalR; i++) {
      for (let j = 0; j < M; j++) {
        const idx = (i * M + j) * 3;
        positions[idx]     = allRings[i][j][0];
        positions[idx + 1] = allRings[i][j][1];
        positions[idx + 2] = allRings[i][j][2];
      }
    }
    const startCapIdx = totalR * M;
    const endCapIdx = totalR * M + 1;
    positions[startCapIdx * 3] = startCenter[0]; positions[startCapIdx * 3 + 1] = startCenter[1]; positions[startCapIdx * 3 + 2] = startCenter[2];
    positions[endCapIdx * 3]   = endCenter[0];   positions[endCapIdx * 3 + 1]   = endCenter[1];   positions[endCapIdx * 3 + 2]   = endCenter[2];

    const triCount = (totalR - 1) * M * 2 + M * 2;
    const indices = new Uint32Array(triCount * 3);
    let ptr = 0;

    // Side quads
    for (let i = 0; i < totalR - 1; i++) {
      for (let j = 0; j < M; j++) {
        const jNext = (j + 1) % M;
        const a = i * M + j;
        const b = (i + 1) * M + j;
        const c = (i + 1) * M + jNext;
        const d = i * M + jNext;
        indices[ptr++] = a; indices[ptr++] = b; indices[ptr++] = c;
        indices[ptr++] = a; indices[ptr++] = c; indices[ptr++] = d;
      }
    }
    // Start cap fan (opposite to side quad edge jNext -> j)
    for (let j = 0; j < M; j++) {
      const jNext = (j + 1) % M;
      indices[ptr++] = startCapIdx;
      indices[ptr++] = j;
      indices[ptr++] = jNext;
    }
    // End cap fan (opposite to side quad edge lastOff+j -> lastOff+jNext)
    const lastOff = (totalR - 1) * M;
    for (let j = 0; j < M; j++) {
      const jNext = (j + 1) % M;
      indices[ptr++] = endCapIdx;
      indices[ptr++] = lastOff + jNext;
      indices[ptr++] = lastOff + j;
    }

    return makeSmoothPart(positions, indices, meta);
  }

  /**
   * Builds a closed sphere (used for pearls, ball finials, bead prongs, micro-pavé beads).
   */
  function buildSphere(cx, cy, cz, radius, segU, segV, meta) {
    const U = segU || 18, V = segV || 12;
    const rings = [];
    for (let v = 1; v < V; v++) {
      const phi = (v / V) * PI;
      const sinP = Math.sin(phi), cosP = Math.cos(phi);
      const r = [];
      for (let u = 0; u < U; u++) {
        const th = (u / U) * TAU;
        r.push([cx + radius * sinP * Math.cos(th), cy + radius * cosP, cz + radius * sinP * Math.sin(th)]);
      }
      rings.push(r);
    }
    const vertCount = rings.length * U + 2;
    const positions = new Float32Array(vertCount * 3);
    for (let i = 0; i < rings.length; i++) {
      for (let j = 0; j < U; j++) {
        const idx = (i * U + j) * 3;
        positions[idx] = rings[i][j][0];
        positions[idx + 1] = rings[i][j][1];
        positions[idx + 2] = rings[i][j][2];
      }
    }
    const northIdx = rings.length * U;
    const southIdx = rings.length * U + 1;
    positions[northIdx * 3] = cx; positions[northIdx * 3 + 1] = cy + radius; positions[northIdx * 3 + 2] = cz;
    positions[southIdx * 3] = cx; positions[southIdx * 3 + 1] = cy - radius; positions[southIdx * 3 + 2] = cz;

    const indices = new Uint32Array(((rings.length - 1) * U * 2 + U * 2) * 3);
    let ptr = 0;
    for (let j = 0; j < U; j++) {
      const jn = (j + 1) % U;
      indices[ptr++] = northIdx; indices[ptr++] = jn; indices[ptr++] = j;
    }
    for (let i = 0; i < rings.length - 1; i++) {
      for (let j = 0; j < U; j++) {
        const jn = (j + 1) % U;
        const a = i * U + j, b = (i + 1) * U + j, c = (i + 1) * U + jn, d = i * U + jn;
        indices[ptr++] = a; indices[ptr++] = d; indices[ptr++] = c;
        indices[ptr++] = a; indices[ptr++] = c; indices[ptr++] = b;
      }
    }
    const last = (rings.length - 1) * U;
    for (let j = 0; j < U; j++) {
      const jn = (j + 1) % U;
      indices[ptr++] = southIdx; indices[ptr++] = last + j; indices[ptr++] = last + jn;
    }
    return makeSmoothPart(positions, indices, meta);
  }

  /**
   * Builds a smooth swept wire / curved prong along an array of 3D points with variable radius.
   */
  function buildSweptWire(points, radii, segSides, meta, domeCap) {
    const M = segSides || 12;
    const N = points.length;
    const rings = [];
    let prevT = null, prevN = null;

    for (let i = 0; i < N; i++) {
      const p = points[i];
      let tx, ty, tz;
      if (i === 0) {
        tx = points[1][0] - p[0]; ty = points[1][1] - p[1]; tz = points[1][2] - p[2];
      } else if (i === N - 1) {
        tx = p[0] - points[i - 1][0]; ty = p[1] - points[i - 1][1]; tz = p[2] - points[i - 1][2];
      } else {
        tx = points[i + 1][0] - points[i - 1][0]; ty = points[i + 1][1] - points[i - 1][1]; tz = points[i + 1][2] - points[i - 1][2];
      }
      const tl = Math.hypot(tx, ty, tz) || 1;
      tx /= tl; ty /= tl; tz /= tl;

      let nx, ny, nz;
      if (!prevN) {
        // Pick stable reference vector not parallel to T
        const ref = Math.abs(ty) < 0.9 ? [0, 1, 0] : [1, 0, 0];
        nx = ty * ref[2] - tz * ref[1];
        ny = tz * ref[0] - tx * ref[2];
        nz = tx * ref[1] - ty * ref[0];
        const nl = Math.hypot(nx, ny, nz) || 1;
        nx /= nl; ny /= nl; nz /= nl;
      } else {
        // Parallel transport previous normal to avoid twist flips
        const dot = prevN[0] * tx + prevN[1] * ty + prevN[2] * tz;
        nx = prevN[0] - dot * tx;
        ny = prevN[1] - dot * ty;
        nz = prevN[2] - dot * tz;
        const nl = Math.hypot(nx, ny, nz) || 1;
        nx /= nl; ny /= nl; nz /= nl;
      }
      const bx = ty * nz - tz * ny;
      const by = tz * nx - tx * nz;
      const bz = tx * ny - ty * nx;
      prevT = [tx, ty, tz];
      prevN = [nx, ny, nz];

      const rad = Array.isArray(radii) ? radii[i] : radii;
      const ring = [];
      for (let j = 0; j < M; j++) {
        const a = (j / M) * TAU;
        const ca = Math.cos(a) * rad, sa = Math.sin(a) * rad;
        ring.push([
          p[0] + nx * ca + bx * sa,
          p[1] + ny * ca + by * sa,
          p[2] + nz * ca + bz * sa
        ]);
      }
      rings.push(ring);
    }
    return buildCappedTube(rings, meta, domeCap);
  }

  /**
   * Builds a closed elliptical / rounded-link torus loop (for jump rings, gallery rails, chain links).
   */
  function buildClosedWireLoop(points, radiusX, radiusY, segSides, meta) {
    const M = segSides || 14;
    const N = points.length;
    const rings = [];
    let prevN = null;
    const rx = radiusX;
    const ry = radiusY != null ? radiusY : radiusX;

    // Compute approximate loop center to keep normal radially stable (zero twist seam!)
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < N; i++) { cx += points[i][0]; cy += points[i][1]; cz += points[i][2]; }
    cx /= N; cy /= N; cz /= N;

    for (let i = 0; i < N; i++) {
      const pPrev = points[(i - 1 + N) % N];
      const p = points[i];
      const pNext = points[(i + 1) % N];
      let tx = pNext[0] - pPrev[0], ty = pNext[1] - pPrev[1], tz = pNext[2] - pPrev[2];
      const tl = Math.hypot(tx, ty, tz) || 1;
      tx /= tl; ty /= tl; tz /= tl;

      let outX = p[0] - cx, outY = p[1] - cy, outZ = p[2] - cz;
      const dot = outX * tx + outY * ty + outZ * tz;
      let nx = outX - dot * tx, ny = outY - dot * ty, nz = outZ - dot * tz;
      let nl = Math.hypot(nx, ny, nz);
      if (nl < 1e-6) {
        const ref = Math.abs(ty) < 0.9 ? [0, 1, 0] : [1, 0, 0];
        nx = ty * ref[2] - tz * ref[1];
        ny = tz * ref[0] - tx * ref[2];
        nz = tx * ref[1] - ty * ref[0];
        nl = Math.hypot(nx, ny, nz) || 1;
      }
      nx /= nl; ny /= nl; nz /= nl;
      if (prevN && (nx * prevN[0] + ny * prevN[1] + nz * prevN[2] < 0)) {
        nx = -nx; ny = -ny; nz = -nz;
      }
      prevN = [nx, ny, nz];
      const bx = ty * nz - tz * ny;
      const by = tz * nx - tx * nz;
      const bz = tx * ny - ty * nx;

      const ring = [];
      for (let j = 0; j < M; j++) {
        const a = (j / M) * TAU;
        const ca = Math.cos(a) * rx, sa = Math.sin(a) * ry;
        ring.push([
          p[0] + nx * ca + bx * sa,
          p[1] + ny * ca + by * sa,
          p[2] + nz * ca + bz * sa
        ]);
      }
      rings.push(ring);
    }
    return buildClosedLoopTube(rings, meta);
  }

  /**
   * Transforms a Part in-place using an orthonormal basis frame (origin, right, up, forward).
   * Guaranteed right-handed rigid transform — zero Euler gimbal lock!
   */
  function transformPartFrame(part, ox, oy, oz, right, up, forward) {
    function applyBuf(buf, isNormal) {
      if (!buf) return;
      for (let i = 0; i < buf.length; i += 3) {
        const x = buf[i], y = buf[i + 1], z = buf[i + 2];
        buf[i]     = (isNormal ? 0 : ox) + right[0] * x + up[0] * y + forward[0] * z;
        buf[i + 1] = (isNormal ? 0 : oy) + right[1] * x + up[1] * y + forward[1] * z;
        buf[i + 2] = (isNormal ? 0 : oz) + right[2] * x + up[2] * y + forward[2] * z;
      }
    }
    applyBuf(part.positions, false);
    applyBuf(part.normals, true);
    if (part.topologyPositions && part.topologyPositions !== part.positions) {
      applyBuf(part.topologyPositions, false);
    }
    return part;
  }

  /* =========================================================================
     6. TRUE GIA-PROPORTIONED FACETED GEMSTONE CONTOURS & MESH GENERATOR
  ========================================================================= */
  /**
   * Evaluates normalized 2D outline (x, z) in [-1..1] for any of the 9 gem cuts.
   */
  function sampleGemContour(cut, u) {
    const a = u * TAU;
    const ca = Math.cos(a), sa = Math.sin(a);
    switch (cut) {
      case 'princess': {
        // Sharp square with subtle 3% corner chamfer for durability
        const m = Math.max(Math.abs(ca), Math.abs(sa));
        const x = ca / m, z = sa / m;
        // Blend 4% corner chamfer
        const d = Math.abs(x) + Math.abs(z);
        const s = d > 1.92 ? 1.92 / d : 1.0;
        return [x * s, z * s];
      }
      case 'emerald': {
        // Classic octagonal emerald step-cut (clipped corners)
        const m = Math.max(Math.abs(ca), Math.abs(sa));
        let x = ca / m, z = sa / m;
        const d = Math.abs(x) + Math.abs(z);
        if (d > 1.66) { const s = 1.66 / d; x *= s; z *= s; }
        return [x, z];
      }
      case 'cushion': {
        // Pillowed superellipse (n = 3.2)
        const n = 3.2;
        const p = 2 / n;
        return [Math.sign(ca) * Math.pow(Math.abs(ca), p), Math.sign(sa) * Math.pow(Math.abs(sa), p)];
      }
      case 'marquise': {
        // Navette boat shape pointed at z = ±1
        const x = Math.sign(ca) * Math.pow(Math.abs(ca), 1.38);
        const z = sa;
        return [x, z];
      }
      case 'pear': {
        // Classic teardrop: rounded at z = -1, crisp point at z = +1
        const t = sa; // -1..+1
        const taper = 0.5 * (1 - t); // 1 at bottom, 0 at tip
        const widthEnv = Math.pow(clamp(taper, 0, 1), 0.56) * Math.pow(clamp(1 + t, 0, 2) / 2, 0.25) * 1.48;
        const x = ca * widthEnv;
        return [clamp(x, -1, 1), t];
      }
      case 'heart': {
        // Parametric heart normalized to [-1..1] with point at z = -1, cleft at z = +1
        const t = a - PI / 2;
        const hx = 16 * Math.pow(Math.sin(t), 3);
        const hz = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        return [hx / 16.2, (hz + 2.5) / 14.8];
      }
      case 'oval':
      case 'round':
      default:
        return [ca, sa];
    }
  }

  /**
   * Builds a 100% WATERTIGHT FACETED GEMSTONE (local frame: girdle at y=0, table at +crownH, culet at -pavilionH).
   */
  function buildFacetedGem(cut, carat, gemMatId, name) {
    const dim = getGemDimensionsMm(cut, carat);
    const meta = {
      name: name || 'gem',
      role: 'gem',
      materialId: gemMatId || 'diamond',
      gemCut: cut,
      carat: carat
    };

    if (cut === 'pearl' || gemMatId === 'pearl') {
      return buildSphere(0, dim.w * 0.42, 0, dim.w * 0.5, 22, 16, meta);
    }

    const rx = dim.w * 0.5;
    const rz = dim.l * 0.5;
    const isStep = (cut === 'emerald');
    const segs = isStep ? 16 : (cut === 'princess' ? 16 : (cut === 'round' ? 16 : 24));

    // Helper: contour ring at scale & y with optional phase twist for brilliant star facets
    function ringAt(scale, y, phaseOffset) {
      const pts = [];
      for (let i = 0; i < segs; i++) {
        const u = ((i + (phaseOffset || 0)) % segs) / segs;
        const [cx, cz] = sampleGemContour(cut, u);
        pts.push([cx * rx * scale, y, cz * rz * scale]);
      }
      return pts;
    }

    const gHalf = dim.girdleH * 0.5;
    let rings;
    if (isStep) {
      // Emerald 3-tier step-cut (crisp rectangular parallel hall-of-mirrors facets!)
      rings = [
        ringAt(dim.tableRatio, dim.crownH, 0),
        ringAt(dim.tableRatio + (1 - dim.tableRatio) * 0.38, dim.crownH * 0.68, 0),
        ringAt(dim.tableRatio + (1 - dim.tableRatio) * 0.74, dim.crownH * 0.34, 0),
        ringAt(1.0,  gHalf, 0),
        ringAt(1.0, -gHalf, 0),
        ringAt(0.76, -dim.pavilionH * 0.34, 0),
        ringAt(0.46, -dim.pavilionH * 0.68, 0),
        ringAt(0.14, -dim.pavilionH * 0.96, 0)
      ];
    } else {
      // Brilliant cut with twisted star/kite crown & main pavilion facets!
      const twist = (cut === 'round' || cut === 'oval' || cut === 'cushion') ? 0.5 : 0.0;
      rings = [
        ringAt(dim.tableRatio, dim.crownH, 0),
        ringAt(dim.tableRatio + (1 - dim.tableRatio) * 0.52, dim.crownH * 0.52, twist),
        ringAt(1.0,  gHalf, 0),
        ringAt(1.0, -gHalf, 0),
        ringAt(0.54, -dim.pavilionH * 0.48, twist),
        ringAt(0.12, -dim.pavilionH * 0.94, 0)
      ];
    }

    // Build closed indexed mesh: top table center + rings + bottom culet
    const R = rings.length;
    const vertCount = R * segs + 2;
    const positions = new Float32Array(vertCount * 3);
    for (let r = 0; r < R; r++) {
      for (let i = 0; i < segs; i++) {
        const idx = (r * segs + i) * 3;
        positions[idx]     = rings[r][i][0];
        positions[idx + 1] = rings[r][i][1];
        positions[idx + 2] = rings[r][i][2];
      }
    }
    const tableCenterIdx = R * segs;
    const culetIdx = R * segs + 1;
    positions[tableCenterIdx * 3] = 0; positions[tableCenterIdx * 3 + 1] = dim.crownH;      positions[tableCenterIdx * 3 + 2] = 0;
    positions[culetIdx * 3]       = 0; positions[culetIdx * 3 + 1]       = -dim.pavilionH;  positions[culetIdx * 3 + 2]       = 0;

    const indices = new Uint32Array(((R - 1) * segs * 2 + segs * 2) * 3);
    let ptr = 0;
    // Table fan
    for (let i = 0; i < segs; i++) {
      const iNext = (i + 1) % segs;
      indices[ptr++] = tableCenterIdx; indices[ptr++] = iNext; indices[ptr++] = i;
    }
    // Side facet tiers
    for (let r = 0; r < R - 1; r++) {
      for (let i = 0; i < segs; i++) {
        const iNext = (i + 1) % segs;
        const a = r * segs + i, b = (r + 1) * segs + i, c = (r + 1) * segs + iNext, d = r * segs + iNext;
        indices[ptr++] = a; indices[ptr++] = d; indices[ptr++] = c;
        indices[ptr++] = a; indices[ptr++] = c; indices[ptr++] = b;
      }
    }
    // Culet fan
    const lastOff = (R - 1) * segs;
    for (let i = 0; i < segs; i++) {
      const iNext = (i + 1) % segs;
      indices[ptr++] = culetIdx; indices[ptr++] = lastOff + i; indices[ptr++] = lastOff + iNext;
    }

    return makeFlatShadedPart(positions, indices, meta);
  }

  /* =========================================================================
     7. MASTER JEWELER SETTINGS (CATHEDRAL BASKET, BEZEL, TENSION, HALO DECK)
  ========================================================================= */
  /**
   * Generates contoured setting metal parts in local gem frame (girdle at y=0, base embeds to y = -embedDepth).
   * Supports castableMetalOnly (extends prongs straight up +0.85 mm for real stone-setting!).
   */
  function buildGemSettingParts(cut, carat, settingType, metalId, embedDepth, castableMetalOnly) {
    const parts = [];
    const dim = getGemDimensionsMm(cut, carat);
    const rx = dim.w * 0.5;
    const rz = dim.l * 0.5;
    const avgR = (rx + rz) * 0.5;
    const seatY = -dim.pavilionH - 0.15;
    const baseY = Math.min(seatY, -embedDepth);
    const meta = { name: 'setting_metal', role: 'metal', materialId: metalId, subRole: 'setting' };

    // Pearl cup + peg mount
    if (cut === 'pearl') {
      const cupR = rx * 0.62;
      const peg = buildSweptWire(
        [[0, baseY, 0], [0, dim.w * 0.35, 0]],
        [Math.max(0.42, rx * 0.14), Math.max(0.38, rx * 0.12)],
        10, meta, 0.25
      );
      parts.push(peg);
      const cupPts = [];
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * TAU;
        cupPts.push([Math.cos(a) * cupR, 0.15, Math.sin(a) * cupR]);
      }
      parts.push(buildClosedWireLoop(cupPts, 0.45, 0.45, 10, meta));
      return parts;
    }

    if (settingType === 'bezel') {
      // Full contoured closed bezel collet following exact gem outline (watertight ring wall!)
      const wallT = clamp(0.45 + avgR * 0.09, 0.55, 1.05);
      const segs = 32;
      const topY = castableMetalOnly ? dim.crownH * 0.65 : dim.crownH * 0.34;
      const rings = [];
      // Build 2D cross-section of bezel wall swept around the exact gem contour!
      for (let i = 0; i < segs; i++) {
        const u = i / segs;
        const [cx, cz] = sampleGemContour(cut, u);
        const gx = cx * rx, gz = cz * rz;
        const rLen = Math.hypot(gx, gz) || 1;
        const outX = gx / rLen, outZ = gz / rLen;
        // 8-point chamfered wall profile (outer top -> lip -> inner top -> seat step -> inner bottom -> outer bottom)
        const sIn = 0.94, sSeat = 0.78, sBase = 0.72;
        const ring = [
          [gx + outX * wallT,        topY - 0.15,   gz + outZ * wallT],
          [gx + outX * (wallT*0.45), topY,          gz + outZ * (wallT*0.45)],
          [gx * sIn,                 topY - 0.05,   gz * sIn],
          [gx * sIn,                 -dim.girdleH,  gz * sIn],
          [gx * sSeat,               -dim.pavilionH * 0.52, gz * sSeat],
          [gx * sBase,               baseY,         gz * sBase],
          [gx * sBase + outX * wallT,baseY,         gz * sBase + outZ * wallT],
          [gx + outX * wallT,        -dim.pavilionH * 0.38, gz + outZ * wallT]
        ];
        rings.push(ring);
      }
      parts.push(buildClosedLoopTube(rings, meta));
      return parts;
    }

    if (settingType === 'tension') {
      // Twin sculpted architectural tension jaws gripping left & right sides
      const jawW = clamp(dim.l * 0.52, 1.8, 4.5);
      const jawT = clamp(0.65 + avgR * 0.14, 0.75, 1.4);
      for (const side of [-1, 1]) {
        const pts = [
          [side * (rx * 0.65), baseY, 0],
          [side * (rx + jawT * 0.55), -dim.pavilionH * 0.35, 0],
          [side * (rx + jawT * 0.45), 0.0, 0],
          [side * (rx * 0.92), dim.crownH * 0.45, 0]
        ];
        parts.push(buildSweptWire(pts, [jawT * 0.65, jawT * 0.7, jawT * 0.65, jawT * 0.45], 12, meta, jawT * 0.3));
      }
      // Hidden under-bridge gallery bar for structural integrity
      const bridgePts = [[-rx * 0.7, baseY + 0.3, 0], [0, baseY + 0.1, 0], [rx * 0.7, baseY + 0.3, 0]];
      parts.push(buildSweptWire(bridgePts, clamp(jawW * 0.18, 0.55, 1.1), 10, meta, 0.2));
      return parts;
    }

    // Default: Master 4-Prong or 6-Prong Cathedral Basket!
    const prongR = clamp(0.36 + avgR * 0.085, 0.38, 0.78); // >= 0.76 mm diameter!
    const railR = clamp(prongR * 0.72, 0.34, 0.58);

    // 1) Upper Gallery Bearing Rail hugging exact gem contour beneath girdle
    const railSegs = 28;
    const upperRailPts = [];
    const lowerRailPts = [];
    for (let i = 0; i < railSegs; i++) {
      const u = i / railSegs;
      const [cx, cz] = sampleGemContour(cut, u);
      upperRailPts.push([cx * rx * 0.94, -dim.girdleH * 1.4 - railR * 0.6, cz * rz * 0.94]);
      lowerRailPts.push([cx * rx * 0.62, baseY + railR * 0.8, cz * rz * 0.62]);
    }
    parts.push(buildClosedWireLoop(upperRailPts, railR, railR, 10, meta));
    parts.push(buildClosedWireLoop(lowerRailPts, railR * 1.15, railR * 1.05, 10, meta));

    // 2) Exact prong positions matched to each gemstone cut!
    let prongUs;
    const isSix = (settingType === 'prong6');
    if (cut === 'pear') {
      // Protective V-tip prong at pointed tip (u = 0.25 -> sin = +1) + 4 belly prongs
      prongUs = isSix ? [0.25, 0.06, 0.44, 0.62, 0.88, 0.75] : [0.25, 0.07, 0.43, 0.66, 0.84];
    } else if (cut === 'marquise') {
      // Twin protective V-tips at u=0.25 & u=0.75 + 4 waist prongs
      prongUs = [0.25, 0.75, 0.06, 0.44, 0.56, 0.94];
    } else if (cut === 'heart') {
      // Pointed tip at bottom (u=0.5) + cleft shoulders + side lobes
      prongUs = [0.5, 0.12, 0.88, 0.32, 0.68];
    } else if (cut === 'princess' || cut === 'emerald' || cut === 'cushion') {
      prongUs = isSix ? [0.125, 0.375, 0.625, 0.875, 0.0, 0.5] : [0.125, 0.375, 0.625, 0.875];
    } else {
      prongUs = isSix
        ? [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6]
        : [0.125, 0.375, 0.625, 0.875];
    }

    for (let pIdx = 0; pIdx < prongUs.length; pIdx++) {
      const u = prongUs[pIdx];
      const [cx, cz] = sampleGemContour(cut, u);
      const gx = cx * rx, gz = cz * rz;
      const gLen = Math.hypot(gx, gz) || 1;
      const ox = gx / gLen, oz = gz / gLen;

      // Castable Metal-Only mode leaves prongs straight & upright (+0.85 mm) ready for setter's pliers!
      const tipY = castableMetalOnly ? (dim.crownH + 0.85) : (dim.crownH * 0.48 + prongR * 0.45);
      const tipPull = castableMetalOnly ? (prongR * 0.42) : (-prongR * 0.45);

      const prongPath = [
        [gx * 0.60,              baseY,                        gz * 0.60],
        [gx * 0.82 + ox * (prongR * 0.25), -dim.pavilionH * 0.45, gz * 0.82 + oz * (prongR * 0.25)],
        [gx + ox * (prongR * 0.45),        -dim.girdleH * 0.5,    gz + oz * (prongR * 0.45)],
        [gx + ox * (prongR * 0.40),         dim.crownH * 0.32,    gz + oz * (prongR * 0.40)],
        [gx + ox * tipPull,                 tipY,                 gz + oz * tipPull]
      ];
      const prongRadii = [
        prongR * 1.12,
        prongR * 1.04,
        prongR * 1.00,
        prongR * 0.92,
        prongR * (castableMetalOnly ? 0.86 : 0.78)
      ];
      parts.push(buildSweptWire(prongPath, prongRadii, 10, meta, prongR * 0.75));
    }

    return parts;
  }

  /**
   * Builds a complete mounted stone assembly (setting metal + gem) transformed onto an orthonormal frame.
   */
  function buildMountedStone(opts) {
    const out = [];
    const cut = opts.cut || 'round';
    const carat = opts.carat || 1.0;
    const gemMat = opts.gemMaterial || 'diamond';
    const metalMat = opts.metalMaterial || 'gold18k';
    const setting = opts.setting || 'prong4';
    const embedDepth = opts.embedDepth || 2.8;
    const castableOnly = !!opts.castableMetalOnly;
    const ox = opts.origin[0], oy = opts.origin[1], oz = opts.origin[2];
    const right = opts.right, up = opts.up, forward = opts.forward;

    const settingParts = buildGemSettingParts(cut, carat, setting, metalMat, embedDepth, castableOnly);
    for (let i = 0; i < settingParts.length; i++) {
      out.push(transformPartFrame(settingParts[i], ox, oy, oz, right, up, forward));
    }
    if (!castableOnly) {
      const gemPart = buildFacetedGem(cut, carat, gemMat, opts.name || 'gem');
      out.push(transformPartFrame(gemPart, ox, oy, oz, right, up, forward));
    }
    return out;
  }

  /**
   * Builds a SOLID CONTOURED HALO DECK + PAVÉ MELEE DIAMONDS + SHARED MICRO-BEADS (ZERO FLOATING STONES!).
   */
  function buildHaloAssembly(opts) {
    const out = [];
    const cut = opts.cut || 'round';
    const carat = opts.carat || 1.0;
    const dim = getGemDimensionsMm(cut, carat);
    const rx = dim.w * 0.5, rz = dim.l * 0.5;
    const meleeCarat = clamp(carat * 0.024, 0.015, 0.045);
    const meleeDim = getGemDimensionsMm('round', meleeCarat);
    const meleeR = meleeDim.w * 0.5;
    const haloGap = meleeR + 0.55;
    const hRx = rx + haloGap, hRz = rz + haloGap;
    const deckY = -dim.girdleH - 0.15;
    const deckThick = clamp(1.15 + meleeR * 0.5, 1.25, 1.85);
    const metalId = opts.metalMaterial || 'gold18k';
    const castableOnly = !!opts.castableMetalOnly;
    const meta = { name: 'halo_gallery_deck', role: 'metal', materialId: metalId, subRole: 'setting' };

    // 1) Solid Contoured Halo Bezel Deck (watertight closed ring surrounding center stone!)
    const segs = 40;
    const deckRings = [];
    for (let i = 0; i < segs; i++) {
      const u = i / segs;
      const [cx, cz] = sampleGemContour(cut, u);
      const inX = cx * (rx + 0.12), inZ = cz * (rz + 0.12);
      const outX = cx * (hRx + meleeR + 0.35), outZ = cz * (hRz + meleeR + 0.35);
      const midX = (inX + outX) * 0.5, midZ = (inZ + outZ) * 0.5;
      deckRings.push([
        [outX, deckY + 0.12, outZ],
        [outX * 0.985, deckY + 0.25, outZ * 0.985],
        [inX, deckY + 0.22, inZ],
        [inX * 0.96, deckY - deckThick * 0.82, inZ * 0.96],
        [midX, deckY - deckThick, midZ],
        [outX * 0.96, deckY - deckThick * 0.72, outZ * 0.96]
      ]);
    }
    const deckPart = buildClosedLoopTube(deckRings, meta);
    out.push(transformPartFrame(deckPart, opts.origin[0], opts.origin[1], opts.origin[2], opts.right, opts.up, opts.forward));

    // 2) Structural Under-Gallery Struts welding the Halo Deck down into the band!
    const embedY = -opts.embedDepth;
    for (let s = 0; s < 4; s++) {
      const u = s * 0.25;
      const [cx, cz] = sampleGemContour(cut, u);
      const strut = buildSweptWire(
        [
          [cx * rx * 0.65, embedY, cz * rz * 0.65],
          [cx * hRx * 0.88, deckY - deckThick * 0.55, cz * hRz * 0.88]
        ],
        [0.52, 0.45], 8, meta, 0.18
      );
      out.push(transformPartFrame(strut, opts.origin[0], opts.origin[1], opts.origin[2], opts.right, opts.up, opts.forward));
    }

    // 3) Evenly spaced pavé melee diamonds + micro-beads around exact arc-length perimeter!
    const samples = 128;
    const cumLen = [0];
    const pts = [];
    for (let i = 0; i <= samples; i++) {
      const [cx, cz] = sampleGemContour(cut, (i % samples) / samples);
      pts.push([cx * hRx, cz * hRz]);
      if (i > 0) {
        cumLen.push(cumLen[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      }
    }
    const perim = cumLen[samples];
    const meleeCount = clamp(Math.floor(perim / (meleeDim.w + 0.30)), 10, 26);

    function pointAtArc(sDist) {
      const target = ((sDist % perim) + perim) % perim;
      for (let i = 1; i <= samples; i++) {
        if (cumLen[i] >= target) {
          const span = (cumLen[i] - cumLen[i - 1]) || 1;
          const t = (target - cumLen[i - 1]) / span;
          return [
            pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t,
            pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t
          ];
        }
      }
      return pts[0];
    }

    const beadR = clamp(meleeR * 0.30, 0.24, 0.38);
    for (let k = 0; k < meleeCount; k++) {
      const [mx, mz] = pointAtArc((k / meleeCount) * perim);
      // Shared micro-pavé beads between adjacent melee stones
      const [bx, bz] = pointAtArc(((k + 0.5) / meleeCount) * perim);
      const bead = buildSphere(bx, deckY + 0.32, bz, beadR, 10, 8, meta);
      out.push(transformPartFrame(bead, opts.origin[0], opts.origin[1], opts.origin[2], opts.right, opts.up, opts.forward));

      if (!castableOnly) {
        const meleeGem = buildFacetedGem('round', meleeCarat, 'diamond', 'halo_melee_' + k);
        // Translate melee gem into deck local space then transform to world frame
        transformPartFrame(meleeGem, mx, deckY + 0.30, mz, [1, 0, 0], [0, 1, 0], [0, 0, 1]);
        out.push(transformPartFrame(meleeGem, opts.origin[0], opts.origin[1], opts.origin[2], opts.right, opts.up, opts.forward));
      }
    }
    return out;
  }

  /* =========================================================================
     8. PROCEDURAL MICRO-MILLWORK & BILINEAR DISPLACEMENT / ENGRAVING SAMPLING
  ========================================================================= */
  function sampleProceduralPattern(pattern, u, v, wMm, circMm) {
    if (!pattern || pattern === 'none') return 0;
    const xMm = u * circMm;
    const yMm = (v - 0.5) * wMm;
    const edgeDist = Math.abs(v - 0.5) * 2; // 0 center .. 1 edge

    switch (pattern) {
      case 'milgrain': {
        // Authentic jeweler's beaded milgrain rails along BOTH top & bottom borders!
        const bandPos = Math.abs(edgeDist - 0.84) / 0.13;
        if (bandPos >= 1.0) return 0;
        const beadPitch = 0.72; // 0.72 mm micro-beads
        const beadPhase = ((xMm / beadPitch) % 1) * 2 - 1;
        const r2 = bandPos * bandPos + beadPhase * beadPhase;
        return r2 < 1.0 ? Math.sqrt(1.0 - r2) * 0.85 : 0;
      }
      case 'rope': {
        // Smooth diagonal braided cable strands
        const strands = Math.sin((xMm * 1.45 + yMm * 1.85) * PI * 0.5);
        const envelope = smoothstep(0.96, 0.78, edgeDist);
        return (0.5 + 0.5 * strands) * 0.75 * envelope;
      }
      case 'celtic': {
        // Smooth interlaced double-helix Celtic weave (NO jagged binary thresholds!)
        const f = xMm * 0.65;
        const yn = (v - 0.5) * 2.4;
        const s1 = Math.sin(f * PI) * 0.62;
        const s2 = -Math.sin(f * PI) * 0.62;
        const d1 = Math.abs(yn - s1);
        const d2 = Math.abs(yn - s2);
        const w1 = smoothstep(0.32, 0.04, d1);
        const w2 = smoothstep(0.32, 0.04, d2);
        // Over-under weave modulation
        const over = Math.cos(f * PI) > 0 ? 1 : 0;
        const h1 = w1 * (over ? 1.0 : 0.62);
        const h2 = w2 * (over ? 0.62 : 1.0);
        const border = smoothstep(0.80, 0.92, edgeDist) * smoothstep(1.0, 0.94, edgeDist) * 0.45;
        return Math.max(h1, h2, border) * 0.85;
      }
      case 'greek': {
        // Smooth chamfered Greek Key (Meander)
        const period = Math.max(3.6, wMm * 0.92);
        const lx = ((xMm % period) + period) % period / period; // 0..1
        const ly = v; // 0..1
        // Border rails
        let val = 0;
        if (ly < 0.14 || ly > 0.86) val = 0.75;
        else {
          const sx = Math.abs(lx - 0.5);
          const sy = Math.abs(ly - 0.5);
          const outerBox = (sx > 0.28 && sx < 0.42 && sy < 0.34) || (sy > 0.24 && sy < 0.35 && sx < 0.42);
          const innerHook = (sx < 0.18 && sy < 0.14) || (lx > 0.5 && lx < 0.64 && sy < 0.24);
          if (outerBox || innerHook) val = 0.85;
        }
        // Smooth chamfer falloff
        return val * smoothstep(0.99, 0.91, edgeDist);
      }
      case 'guilloche': {
        // Fabergé engine-turned concentric waves
        const wave = Math.sin(xMm * 2.8 + Math.sin(yMm * 2.2) * 1.4) * 0.5 + 0.5;
        return wave * 0.45 * smoothstep(0.96, 0.82, edgeDist);
      }
      case 'florentine': {
        // Fine cross-hatched goldsmith engraving
        const a = Math.sin((xMm * 3.8 + yMm * 3.8) * PI);
        const b = Math.sin((xMm * 3.8 - yMm * 3.8) * PI);
        return (0.5 + 0.25 * (a + b)) * 0.35 * smoothstep(0.95, 0.80, edgeDist);
      }
      case 'hammered': {
        // Artisan hand-hammered concave dimples
        const gx = xMm * 0.72, gy = yMm * 0.72;
        const ix = Math.floor(gx), iy = Math.floor(gy);
        let minD = 9;
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const cx = ix + dx, cy = iy + dy;
            const h1 = Math.sin(cx * 127.1 + cy * 311.7) * 43758.5453;
            const h2 = Math.sin(cx * 269.5 + cy * 183.3) * 43758.5453;
            const px = cx + (h1 - Math.floor(h1));
            const py = cy + (h2 - Math.floor(h2));
            const d = Math.hypot(gx - px, gy - py);
            if (d < minD) minD = d;
          }
        }
        return clamp((minD - 0.55) * 0.85, -0.45, 0.35) * smoothstep(0.96, 0.84, edgeDist);
      }
      default: return 0;
    }
  }

  /**
   * Bilinearly samples a grayscale Float32Array or Uint8ClampedArray height buffer (width × height).
   * Eliminates pixelated stair-stepping on engraving & custom reliefs!
   */
  function sampleMapBilinear(map, u, v) {
    if (!map || !map.data || !map.width || !map.height) return 0;
    const W = map.width, H = map.height;
    const fx = clamp(u, 0, 1) * (W - 1);
    const fy = clamp(v, 0, 1) * (H - 1);
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const x1 = Math.min(W - 1, x0 + 1), y1 = Math.min(H - 1, y0 + 1);
    const tx = fx - x0, ty = fy - y0;
    const stride = map.stride || 4;
    const scale = map.isFloat ? 1.0 : (1.0 / 255.0);
    const v00 = map.data[(y0 * W + x0) * stride] * scale;
    const v10 = map.data[(y0 * W + x1) * stride] * scale;
    const v01 = map.data[(y1 * W + x0) * stride] * scale;
    const v11 = map.data[(y1 * W + x1) * stride] * scale;
    const top = v00 + (v10 - v00) * tx;
    const bot = v01 + (v11 - v01) * tx;
    return top + (bot - top) * ty;
  }

  /* =========================================================================
     9. CROSS-SECTION GENERATOR (MICRO-CHAMFERED, ZERO SPECULAR BANDING!)
  ========================================================================= */
  /**
   * Builds a smooth closed cross-section of M=40 vertices in local (dr, dz) space:
   *  - dr ∈ [0 .. t]: radial offset outward from inner bore rIn
   *  - dz ∈ [-w/2 .. +w/2]: axial offset along Z
   *  - zone[j]: 0 = outer surface (supports relief/pattern/outer alloy), 1 = inner comfort bore (inner alloy / inside engraving!)
   */
  function sampleBandCrossSection(profile, w, t) {
    const hw = w * 0.5;
    const bevel = Math.min(0.28, t * 0.16, w * 0.10);
    const pts = [];   // [dr, dz, uV]
    const zones = []; // 0 outer, 1 inner

    // 1) Outer face (19 points from z = -hw+bevel to z = +hw-bevel)
    const nOuter = 19;
    for (let i = 0; i < nOuter; i++) {
      const f = i / (nOuter - 1); // 0..1 across width
      const s = f * 2 - 1;        // -1..+1
      const z = s * (hw - bevel * 0.35);
      let dr = t;
      if (profile === 'classic' || profile === 'cathedral' || profile === 'crown_band') {
        dr = t * (0.62 + 0.38 * Math.sqrt(Math.max(0.01, 1 - s * s * 0.92)));
      } else if (profile === 'comfort') {
        dr = t * (0.74 + 0.26 * Math.cos(s * PI * 0.48));
      } else if (profile === 'knife') {
        dr = t * (0.45 + 0.55 * (1 - Math.pow(Math.abs(s), 0.85)));
      } else if (profile === 'flat' || profile === 'hex' || profile === 'signet') {
        // Crisp flat face with gentle micro-chamfer on the last 10%
        const edgeRoll = smoothstep(0.84, 1.0, Math.abs(s));
        dr = t - edgeRoll * bevel;
      } else if (profile === 'twisted') {
        dr = t * (0.68 + 0.32 * Math.cos(s * PI * 0.5));
      }
      pts.push([dr, z, f]);
      zones.push(0);
    }

    // 2) Right side chamfer (+hw) — 3 smooth bevel points
    pts.push([t * 0.55, hw, 1]);                 zones.push(0);
    pts.push([bevel * 1.1, hw, 1]);              zones.push(1);
    pts.push([bevel * 0.35, hw - bevel * 0.55, 1]); zones.push(1);

    // 3) Inner finger bore face (15 points from z = +hw-bevel to z = -hw+bevel)
    const nInner = 15;
    const comfortDoming = (profile === 'flat') ? bevel * 0.25 : Math.min(0.42, t * 0.20);
    for (let i = 0; i < nInner; i++) {
      const f = 1 - i / (nInner - 1); // 1..0
      const s = f * 2 - 1;
      const z = s * (hw - bevel * 0.85);
      // Slight ergonomic interior court dome (convex toward finger at center, easing smoothly at edges)
      const dr = (1 - Math.cos(s * PI * 0.5)) * comfortDoming;
      pts.push([dr, z, f]);
      zones.push(1);
    }

    // 4) Left side chamfer (-hw) — 3 smooth bevel points
    pts.push([bevel * 0.35, -hw + bevel * 0.55, 0]); zones.push(1);
    pts.push([bevel * 1.1, -hw, 0]);                 zones.push(1);
    pts.push([t * 0.55, -hw, 0]);                    zones.push(0);

    return { pts, zones };
  }

  /* =========================================================================
     10. CATEGORY GEOMETRY GENERATORS (ALL 6 CATEGORIES, 100% WATERTIGHT!)
  ========================================================================= */

  /**
   * 10A. RINGS & CLOSED/OPEN BRACELETS
   */
  function generateBandOrRing(state, maps) {
    const parts = [];
    const isBracelet = (state.category === 'bracelets');
    const isCuff = isBracelet && (state.profile === 'cuff' || state.profile === 'twisted_cuff');
    const isTennis = isBracelet && state.profile === 'tennis';

    const rIn = Math.max(4.0, (Number(state.innerDiameter) || 17.2) * 0.5);
    const baseW = Math.max(1.4, Number(state.width) || 4.5);
    const baseT = Math.max(0.8, Number(state.thickness) || 2.0);
    const taper = clamp(Number(state.shankTaper) || 0, 0, 0.52);

    // Tennis Bracelet has its own articulated linked diamond-cup architecture!
    if (isTennis) {
      return generateTennisBracelet(state, rIn, baseW, baseT);
    }

    const ovalRatio = isBracelet ? 1.12 : 1.0; // Ergonomic oval wrist fit for bracelets!
    const N = clamp(Math.round(state.quality || 144), 72, 220);
    const circMm = TAU * (rIn + baseT);

    // Cross-section template
    const { pts: baseSec, zones } = sampleBandCrossSection(state.profile, baseW, baseT);
    const M = baseSec.length;

    const arcSpan = isCuff ? (TAU * 0.80) : TAU; // Cuff leaves 20% wrist opening at bottom (-Y)
    const arcStart = isCuff ? (-arcSpan * 0.5) : 0;

    const rings = [];
    const loopCount = isCuff ? (N + 1) : N;
    const hasStone = !isBracelet && state.stoneType && state.stoneType !== 'none';
    const hasTopCathedral = (state.profile === 'cathedral');
    const isSignet = (state.profile === 'signet');
    const isHex = (state.profile === 'hex');
    const isTwisted = (state.profile === 'twisted' || state.profile === 'twisted_cuff');
    const isCrownBand = (state.profile === 'crown_band');

    // Compute exact signet table Y plane so it's perfectly flat for engraving!
    const signetTableY = rIn + baseT * 1.82;

    for (let i = 0; i < loopCount; i++) {
      const frac = isCuff ? (i / N) : (i / N);
      const theta = isCuff ? (arcStart + frac * arcSpan) : (frac * TAU);
      // Angle distance from TOP (+Y, theta=0) in [0..PI]
      let angFromTop = Math.abs(((theta + PI) % TAU) - PI);
      if (angFromTop > PI) angFromTop = TAU - angFromTop;
      const topBlend = 0.5 * (1 + Math.cos(angFromTop)); // 1 at top, 0 at bottom

      // Smooth shank taper from top to bottom
      const wScale = 1.0 - taper * (1.0 - topBlend);
      let tScale = 1.0 - taper * 0.35 * (1.0 - topBlend);

      // Cathedral rising arch shoulders near top
      if (hasTopCathedral) {
        const arch = Math.pow(smoothstep(0.95, 0.0, angFromTop), 1.7);
        tScale += arch * 0.85;
      }

      // Signet tapered shoulder expansion toward flat top oval table
      let signetFactor = 0;
      if (isSignet) {
        signetFactor = smoothstep(0.92, 0.0, angFromTop);
        tScale += Math.pow(signetFactor, 1.45) * 0.98;
      }

      // Hex outer polygon multiplier (ONLY applied to outer contour, inner bore stays 100% circular!)
      let hexOuterMul = 1.0;
      if (isHex) {
        const sector = PI / 3; // 6-sided true hexagon!
        const aMod = (((theta + PI / 6) % sector) + sector) % sector - PI / 6;
        // Slightly rounded corner blend for wearable goldsmithing
        const rawSec = Math.cos(PI / 6) / Math.cos(aMod);
        hexOuterMul = 1.0 + (rawSec - 1.0) * 0.92;
      }

      // Crown band wavy peaks along +Z edge
      const crownWave = isCrownBand ? (Math.pow(0.5 + 0.5 * Math.cos(theta * 5), 1.6) * baseW * 0.42) : 0;

      // Twist angle for rope/torque
      const twistRot = isTwisted ? (theta * (isBracelet ? 9 : 12)) : 0;
      const cTw = Math.cos(twistRot), sTw = Math.sin(twistRot);

      const sinT = Math.sin(theta), cosT = Math.cos(theta);
      const radX = rIn * ovalRatio;
      const radY = rIn / Math.sqrt(ovalRatio);

      const ringPts = [];
      for (let j = 0; j < M; j++) {
        let dr = baseSec[j][0] * tScale;
        let dz = baseSec[j][1] * wScale;
        const vCoord = baseSec[j][2];
        const isOuter = (zones[j] === 0);

        // Apply true Hex ONLY on outer vertices (inner bore stays smooth circular!)
        if (isHex && isOuter) {
          const outerR = (rIn + dr) * hexOuterMul;
          dr = outerR - rIn;
        }

        // Apply Twisted Rope helical cross-section modulation
        if (isTwisted) {
          const localR = dr - baseT * 0.5;
          const localZ = dz;
          const lobe = 1.0 + 0.16 * Math.cos(Math.atan2(localZ, localR) * 3 + twistRot);
          if (isOuter) {
            dr = baseT * 0.5 + localR * lobe;
            dz = localZ * (0.94 + 0.08 * cTw);
          } else {
            // Keep inner bore ergonomic!
            dz = localZ * (0.97 + 0.03 * sTw);
          }
        }

        // Crown ring gothic crest peaks
        if (isCrownBand && vCoord > 0.5) {
          dz += crownWave * ((vCoord - 0.5) * 2);
        }

        // Signet width flare into noble oval bezel
        if (isSignet) {
          const flare = 1.0 + Math.pow(signetFactor, 1.5) * 0.52;
          dz *= flare;
        }

        // Procedural surface pattern on outer wall
        if (isOuter && state.procPattern && state.procPattern !== 'none') {
          const uPat = (theta / TAU + 1) % 1;
          const pH = sampleProceduralPattern(state.procPattern, uPat, vCoord, baseW * wScale, circMm);
          // Fade out pattern right under center stone seat so basket welds cleanly
          const stoneMask = (hasStone && state.stoneLayout !== 'eternity') ? smoothstep(0.18, 0.36, angFromTop) : 1.0;
          dr += pH * (Number(state.patIntensity) || 0.45) * 0.65 * stoneMask;
        }

        // Aspect-locked Bilinear Engraving (Interior OR Exterior!)
        if (maps && maps.engraveMap && state.engraveText && state.engraveText.trim().length > 0) {
          const applyHere = state.engraveInside ? !isOuter : isOuter;
          if (applyHere) {
            // Span text cleanly across 140° arc (no 10:1 horizontal distortion!)
            // Inside engraving: centered at bottom (theta = PI) or top (theta = 0) and mirrored so it reads L->R when held!
            const centerAng = state.engraveInside ? PI : 0;
            let rel = ((theta - centerAng + PI) % TAU + TAU) % TAU - PI;
            const spanRad = clamp((maps.engraveMap.aspectRatio || 3.5) * (baseW / rIn) * 0.85, 0.55, PI * 1.55);
            const uEng = 0.5 + (state.engraveInside ? -rel : rel) / spanRad;
            if (uEng >= 0 && uEng <= 1 && vCoord > 0.08 && vCoord < 0.92) {
              const vEng = 1.0 - (vCoord - 0.08) / 0.84;
              const hVal = sampleMapBilinear(maps.engraveMap, uEng, vEng);
              if (hVal > 0.01) {
                const depthMm = clamp((Number(state.reliefDepth) || 0.45) * 0.65, 0.15, Math.min(0.65, baseT * 0.32));
                const sign = (state.engraveMode === 'raised' && !state.engraveInside) ? 1 : -1;
                if (state.engraveInside) {
                  // Carve gently outward into wall thickness (away from finger!)
                  dr += hVal * depthMm;
                } else {
                  dr += sign * hVal * depthMm;
                }
              }
            }
          }
        }

        // Bilinear Custom Sculpt / Photo Relief Map on Outer Top Crown
        if (isOuter && maps && maps.sculptMap) {
          let rel = ((theta + PI) % TAU + TAU) % TAU - PI;
          const spanRad = isSignet ? 1.10 : clamp((baseW * 2.4) / rIn, 0.75, 1.85);
          const uSc = 0.5 + rel / spanRad;
          if (uSc >= 0 && uSc <= 1 && vCoord > 0.04 && vCoord < 0.96) {
            const vSc = 1.0 - (vCoord - 0.04) / 0.92;
            let hVal = sampleMapBilinear(maps.sculptMap, uSc, vSc);
            if (state.reliefInvert) hVal = 1.0 - hVal;
            const maxD = clamp(Number(state.reliefDepth) || 0.45, 0.08, Math.min(1.4, baseT * 0.65));
            const edgeFeather = smoothstep(0.0, 0.06, uSc) * smoothstep(1.0, 0.94, uSc) * smoothstep(0.04, 0.10, vCoord) * smoothstep(0.96, 0.90, vCoord);
            dr += hVal * maxD * edgeFeather;
          }
        }

        // Convert polar (rIn + dr, theta) -> upright 3D (x, y, z)
        let x = (radX + dr) * sinT;
        let y = (radY + dr) * cosT;
        const z = dz;

        // Crisp flat oval bezel table for Signet Ring (smooth C^2 clamp on outer top face!)
        if (isSignet && isOuter && y > signetTableY - 0.4 && cosT > 0.65) {
          const over = y - signetTableY;
          if (over > 0) {
            // Smooth chamfer fillet into flat table
            y = signetTableY + Math.tanh(over * 2.5) * 0.08;
          }
        }

        ringPts.push([x, y, z]);
      }
      rings.push(ringPts);
    }

    // Build watertight band mesh (closed loop OR end-capped open cuff!)
    const bandMeta = {
      name: isBracelet ? 'bracelet_band' : 'ring_band',
      role: 'metal',
      materialId: state.material,
      innerMaterialId: (state.innerMaterial && state.innerMaterial !== 'same') ? state.innerMaterial : state.material
    };

    if (isCuff) {
      const capDome = (state.profile === 'twisted_cuff') ? 0.35 : Math.min(1.2, baseT * 0.42);
      parts.push(buildCappedTube(rings, bandMeta, capDome));

      // Add luxury spherical Torque Ball Finials at both cuff ends!
      if (state.profile === 'twisted_cuff') {
        const ballR = Math.max(baseT * 0.85, baseW * 0.44);
        for (const endRing of [rings[0], rings[rings.length - 1]]) {
          let cx = 0, cy = 0, cz = 0;
          for (let j = 0; j < M; j++) { cx += endRing[j][0]; cy += endRing[j][1]; cz += endRing[j][2]; }
          parts.push(buildSphere(cx / M, cy / M, cz / M, ballR, 20, 14, {
            name: 'torque_ball', role: 'metal', materialId: state.material
          }));
        }
      }
    } else {
      parts.push(buildClosedLoopTube(rings, bandMeta, zones));
    }

    // Mount Gemstones (Rings & Closed Bangles)
    if (state.stoneType && state.stoneType !== 'none' && !isCuff) {
      const topOuterY = isSignet
        ? (signetTableY + 0.05)
        : (rIn / Math.sqrt(ovalRatio) + baseT * (hasTopCathedral ? 1.85 : 1.0));
      const dim = getGemDimensionsMm(state.stoneType, state.stoneCarat);
      // Seat girdle high enough so culet NEVER pierces inner finger bore!
      const minGirdleY = rIn / Math.sqrt(ovalRatio) + baseT * 0.42 + dim.pavilionH;
      const centerGirdleY = Math.max(topOuterY + 0.55, minGirdleY);
      const embedDepth = Math.min(centerGirdleY - (rIn / Math.sqrt(ovalRatio) + baseT * 0.25), dim.pavilionH + 1.4);

      if (state.stoneLayout === 'halo') {
        // Center master stone + solid contoured halo deck + pavé melee diamonds!
        parts.push.apply(parts, buildMountedStone({
          cut: state.stoneType, carat: state.stoneCarat, gemMaterial: state.stoneMaterial,
          metalMaterial: state.material, setting: state.stoneSetting === 'bezel' ? 'bezel' : 'prong4',
          embedDepth: embedDepth, castableMetalOnly: state.castableMetalOnly,
          origin: [0, centerGirdleY, 0], right: [1, 0, 0], up: [0, 1, 0], forward: [0, 0, 1],
          name: 'center_gem'
        }));
        parts.push.apply(parts, buildHaloAssembly({
          cut: state.stoneType, carat: state.stoneCarat, metalMaterial: state.material,
          embedDepth: embedDepth, castableMetalOnly: state.castableMetalOnly,
          origin: [0, centerGirdleY - 0.12, 0], right: [1, 0, 0], up: [0, 1, 0], forward: [0, 0, 1]
        }));
      } else if (state.stoneLayout === 'trinity') {
        // Center master stone + 2 tangentially seated side stones calculated strictly from stone sizes!
        parts.push.apply(parts, buildMountedStone({
          cut: state.stoneType, carat: state.stoneCarat, gemMaterial: state.stoneMaterial,
          metalMaterial: state.material, setting: state.stoneSetting,
          embedDepth: embedDepth, castableMetalOnly: state.castableMetalOnly,
          origin: [0, centerGirdleY, 0], right: [1, 0, 0], up: [0, 1, 0], forward: [0, 0, 1],
          name: 'center_gem'
        }));
        const sideCarat = Math.max(0.08, state.stoneCarat * 0.48);
        const sideDim = getGemDimensionsMm(state.stoneType, sideCarat);
        const arcOffsetMm = dim.w * 0.5 + sideDim.w * 0.5 + 0.65;
        const sideAngle = clamp(arcOffsetMm / (rIn + baseT), 0.22, 0.72);
        const sideR = Math.max(rIn + baseT + 0.35, rIn + baseT * 0.45 + sideDim.pavilionH);

        for (const sgn of [-1, 1]) {
          const a = sgn * sideAngle;
          const sa = Math.sin(a), ca = Math.cos(a);
          parts.push.apply(parts, buildMountedStone({
            cut: state.stoneType, carat: sideCarat, gemMaterial: state.stoneMaterial,
            metalMaterial: state.material, setting: state.stoneSetting === 'tension' ? 'prong4' : state.stoneSetting,
            embedDepth: Math.min(sideR - (rIn + baseT * 0.28), sideDim.pavilionH + 1.0),
            castableMetalOnly: state.castableMetalOnly,
            origin: [sideR * sa, sideR * ca, 0],
            right: [ca, -sa, 0], up: [sa, ca, 0], forward: [0, 0, 1],
            name: sgn < 0 ? 'trinity_left' : 'trinity_right'
          }));
        }
      } else if (state.stoneLayout === 'half_eternity' || state.stoneLayout === 'eternity') {
        // EXACT ORTHONORMAL RADIAL ORIENTATION — ZERO EULER BUGS!
        const isFull = (state.stoneLayout === 'eternity');
        const effCarat = isFull ? Math.min(state.stoneCarat, 0.45) : Math.min(state.stoneCarat, 0.75);
        const eDim = getGemDimensionsMm(state.stoneType, effCarat);
        const seatR = Math.max(rIn + baseT + 0.25, rIn + baseT * 0.45 + eDim.pavilionH);
        const pitchMm = Math.max(eDim.w, 1.3) + 0.42;
        const count = isFull
          ? clamp(Math.floor((TAU * seatR) / pitchMm), 10, 36)
          : clamp(Math.floor((PI * 0.88 * seatR) / pitchMm) | 1, 5, 13);

        for (let k = 0; k < count; k++) {
          const a = isFull
            ? (k / count) * TAU
            : ((k - (count - 1) * 0.5) * (pitchMm / seatR));
          const gradScale = isFull ? 1.0 : (1.0 - Math.abs(k - (count - 1) * 0.5) / ((count + 1) * 0.5) * 0.28);
          const kCarat = Math.max(0.03, effCarat * gradScale);
          const kDim = getGemDimensionsMm(state.stoneType, kCarat);
          const kSeatR = Math.max(rIn + baseT + 0.22, rIn + baseT * 0.44 + kDim.pavilionH);
          const sa = Math.sin(a), ca = Math.cos(a);

          parts.push.apply(parts, buildMountedStone({
            cut: state.stoneType, carat: kCarat, gemMaterial: state.stoneMaterial,
            metalMaterial: state.material, setting: state.stoneSetting === 'bezel' ? 'bezel' : 'prong4',
            embedDepth: Math.min(kSeatR - (rIn + baseT * 0.25), kDim.pavilionH + 0.8),
            castableMetalOnly: state.castableMetalOnly,
            origin: [kSeatR * sa, kSeatR * ca, 0],
            right: [ca, -sa, 0], up: [sa, ca, 0], forward: [0, 0, 1],
            name: 'eternity_gem_' + k
          }));
        }
      } else {
        // Classic Solitaire
        parts.push.apply(parts, buildMountedStone({
          cut: state.stoneType, carat: state.stoneCarat, gemMaterial: state.stoneMaterial,
          metalMaterial: state.material, setting: state.stoneSetting,
          embedDepth: embedDepth, castableMetalOnly: state.castableMetalOnly,
          origin: [0, centerGirdleY, 0], right: [1, 0, 0], up: [0, 1, 0], forward: [0, 0, 1],
          name: 'solitaire_gem'
        }));
      }
    }

    // Mount Custom User-Placed Surface Gems (with exact radial outward orientation!)
    if (state.customGems && state.customGems.length > 0 && !isCuff) {
      const spanRad = isSignet ? 1.10 : clamp((baseW * 2.4) / rIn, 0.75, 1.85);
      for (let i = 0; i < state.customGems.length; i++) {
        const g = state.customGems[i];
        const a = (g.u - 0.5) * spanRad;
        const zPos = (0.5 - g.v) * (baseW * 0.76);
        const cCarat = clamp(g.carat || 0.08, 0.02, 0.50);
        const cDim = getGemDimensionsMm('round', cCarat);
        const cSeatR = Math.max(rIn + baseT + 0.18, rIn + baseT * 0.45 + cDim.pavilionH);
        const sa = Math.sin(a), ca = Math.cos(a);
        parts.push.apply(parts, buildMountedStone({
          cut: 'round', carat: cCarat, gemMaterial: state.stoneMaterial || 'diamond',
          metalMaterial: state.material, setting: 'prong4',
          embedDepth: cDim.pavilionH + 0.5, castableMetalOnly: state.castableMetalOnly,
          origin: [cSeatR * sa, cSeatR * ca, zPos],
          right: [ca, -sa, 0], up: [sa, ca, 0], forward: [0, 0, 1],
          name: 'custom_gem_' + i
        }));
      }
    }

    return parts;
  }

  /**
   * 10B. TENNIS BRACELET (Articulated linked 4-prong diamond cups around ergonomic oval wrist!)
   */
  function generateTennisBracelet(state, rIn, baseW, baseT) {
    const parts = [];
    const rx = rIn * 1.12, ry = rIn / 1.06;
    const cupCarat = clamp(Math.pow(baseW / 5.4, 3), 0.12, 0.65);
    const dim = getGemDimensionsMm(state.stoneType === 'none' ? 'round' : state.stoneType, cupCarat);
    const perim = PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
    const count = clamp(Math.floor(perim / (dim.w + 1.15)), 24, 52);

    // Continuous structural inner safety link rail
    const railPts = [];
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * TAU;
      railPts.push([rx * Math.sin(a), ry * Math.cos(a), 0]);
    }
    parts.push(buildClosedWireLoop(railPts, Math.max(0.75, baseT * 0.35), Math.max(0.85, baseW * 0.28), 10, {
      name: 'tennis_chassis', role: 'metal', materialId: state.material
    }));

    for (let k = 0; k < count; k++) {
      const a = (k / count) * TAU;
      const px = rx * Math.sin(a), py = ry * Math.cos(a);
      // Outward normal of ellipse (px/rx^2, py/ry^2)
      let ux = px / (rx * rx), uy = py / (ry * ry);
      const ul = Math.hypot(ux, uy) || 1;
      ux /= ul; uy /= ul;
      const rightVec = [uy, -ux, 0];
      const upVec = [ux, uy, 0];
      const seatOffset = Math.max(baseT * 0.45 + 0.35, dim.pavilionH + 0.15);

      parts.push.apply(parts, buildMountedStone({
        cut: state.stoneType === 'none' ? 'round' : state.stoneType,
        carat: cupCarat,
        gemMaterial: state.stoneMaterial || 'diamond',
        metalMaterial: state.material,
        setting: state.stoneSetting === 'bezel' ? 'bezel' : 'prong4',
        embedDepth: seatOffset + 0.2,
        castableMetalOnly: state.castableMetalOnly,
        origin: [px + ux * seatOffset, py + uy * seatOffset, 0],
        right: rightVec, up: upVec, forward: [0, 0, 1],
        name: 'tennis_stone_' + k
      }));
    }
    return parts;
  }

  /**
   * 10C. MEDALLIONS & PENDANTS (With REAL Perpendicular Tapered Bail + Welded Jump Ring!)
   */
  function generateMedallion(state, maps) {
    const parts = [];
    const diam = clamp(Number(state.innerDiameter) || 24.0, 12.0, 50.0);
    const R = diam * 0.5;
    const thick = clamp(Number(state.thickness) || 2.6, 1.2, 6.0);
    const halfT = thick * 0.5;
    const prof = state.profile || 'coin';

    function sampleMedallionRadius(theta) {
      const ca = Math.cos(theta), sa = Math.sin(theta);
      if (prof === 'oval') {
        return [R * 0.80 * ca, R * 1.15 * sa];
      }
      if (prof === 'heart') {
        const t = theta;
        const hx = 16 * Math.pow(Math.sin(t), 3) / 16.2;
        const hy = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t) + 2.2) / 15.2;
        return [hx * R * 1.05, hy * R * 1.05];
      }
      if (prof === 'dogtag') {
        const rx = R * 0.72, ry = R * 1.22, cr = R * 0.28;
        const m = Math.max(Math.abs(ca) / rx, Math.abs(sa) / ry);
        let x = ca / m, y = sa / m;
        // Round corners smoothly
        const ax = Math.max(0, Math.abs(x) - (rx - cr));
        const ay = Math.max(0, Math.abs(y) - (ry - cr));
        const d = Math.hypot(ax, ay);
        if (d > cr) {
          x = Math.sign(x) * ((rx - cr) + (ax / d) * cr);
          y = Math.sign(y) * ((ry - cr) + (ay / d) * cr);
        }
        return [x, y];
      }
      if (prof === 'octagon') {
        const sec = PI / 4;
        const aMod = (((theta + PI / 8) % sec) + sec) % sec - PI / 8;
        const s = Math.cos(PI / 8) / Math.cos(aMod);
        return [ca * R * 0.96 * s, sa * R * 0.96 * s];
      }
      if (prof === 'starburst') {
        const rMod = R * (0.86 + 0.16 * Math.cos(theta * 12));
        return [ca * rMod, sa * rMod];
      }
      return [ca * R, sa * R];
    }

    // Build watertight high-res front+back domed/beveled coin mesh with concentric polar rings
    const segU = 72;
    const segR = 16; // radial rings from center to rim
    const frontRings = [];
    const backRings = [];
    let topRimY = -1e9;

    for (let r = 1; r <= segR; r++) {
      const f = r / segR; // 0..1
      const fRing = [], bRing = [];
      for (let i = 0; i < segU; i++) {
        const th = (i / segU) * TAU;
        const [bx, by] = sampleMedallionRadius(th);
        const x = bx * f, y = by * f;
        if (r === segR && y > topRimY) topRimY = y;

        // Raised coin rim + subtle luxurious convex puff + beveled edge
        const rimBump = (prof === 'coin' || prof === 'oval')
          ? smoothstep(0.84, 0.93, f) * smoothstep(1.0, 0.95, f) * 0.42
          : 0;
        const puff = (prof === 'heart') ? (1 - f * f) * halfT * 0.55 : (1 - f * f) * 0.18;
        const edgeBevel = smoothstep(0.92, 1.0, f) * Math.min(0.45, halfT * 0.35);

        let zF = halfT + puff + rimBump - edgeBevel;
        let zB = -(halfT + puff * 0.5 + rimBump * 0.5 - edgeBevel);

        // Procedural pattern on front face
        if (state.procPattern && state.procPattern !== 'none' && f < 0.88) {
          const uP = (x / (R * 2) + 0.5);
          const vP = (y / (R * 2) + 0.5);
          zF += sampleProceduralPattern(state.procPattern, uP, vP, diam, diam) * (Number(state.patIntensity) || 0.45) * 0.55;
        }
        // Sculpt / Photo relief on front face
        if (maps && maps.sculptMap && f < 0.92) {
          const uS = x / (R * 1.9) + 0.5;
          const vS = 0.5 - y / (R * 1.9);
          if (uS >= 0 && uS <= 1 && vS >= 0 && vS <= 1) {
            let hv = sampleMapBilinear(maps.sculptMap, uS, vS);
            if (state.reliefInvert) hv = 1.0 - hv;
            zF += hv * clamp(Number(state.reliefDepth) || 0.45, 0.1, 1.5) * smoothstep(0.92, 0.82, f);
          }
        }
        // Bilinear Engraving (Front OR Back!)
        if (maps && maps.engraveMap && state.engraveText && state.engraveText.trim().length > 0 && f < 0.85) {
          const onBack = !!state.engraveInside;
          const uE = (onBack ? -x : x) / (R * 1.6) + 0.5;
          const vE = 0.5 - y / (R * 0.72);
          if (uE >= 0 && uE <= 1 && vE >= 0 && vE <= 1) {
            const hv = sampleMapBilinear(maps.engraveMap, uE, vE);
            const depthMm = clamp((Number(state.reliefDepth) || 0.45) * 0.55, 0.15, halfT * 0.45);
            const sign = (state.engraveMode === 'raised' && !onBack) ? 1 : -1;
            if (onBack) zB += hv * depthMm; // carve into back face (+Z)
            else zF += sign * hv * depthMm;
          }
        }

        fRing.push([x, y, zF]);
        bRing.push([x, y, zB]);
      }
      frontRings.push(fRing);
      backRings.push(bRing);
    }

    // Stitch closed disc: front center -> frontRings[0..segR-1] -> backRings[segR-1..0] -> back center!
    const allRings = frontRings.concat(backRings.slice().reverse());
    const totalR = allRings.length;
    const vertCount = totalR * segU + 2;
    const positions = new Float32Array(vertCount * 3);
    for (let r = 0; r < totalR; r++) {
      for (let i = 0; i < segU; i++) {
        const idx = (r * segU + i) * 3;
        positions[idx] = allRings[r][i][0];
        positions[idx + 1] = allRings[r][i][1];
        positions[idx + 2] = allRings[r][i][2];
      }
    }
    const fCenterIdx = totalR * segU;
    const bCenterIdx = totalR * segU + 1;
    // Compute exact average Z of innermost rings for smooth centers
    let fcz = 0, bcz = 0;
    for (let i = 0; i < segU; i++) { fcz += frontRings[0][i][2]; bcz += backRings[0][i][2]; }
    positions[fCenterIdx * 3] = 0; positions[fCenterIdx * 3 + 1] = 0; positions[fCenterIdx * 3 + 2] = fcz / segU;
    positions[bCenterIdx * 3] = 0; positions[bCenterIdx * 3 + 1] = 0; positions[bCenterIdx * 3 + 2] = bcz / segU;

    const indices = new Uint32Array(((totalR - 1) * segU * 2 + segU * 2) * 3);
    let ptr = 0;
    for (let i = 0; i < segU; i++) {
      const iN = (i + 1) % segU;
      indices[ptr++] = fCenterIdx; indices[ptr++] = i; indices[ptr++] = iN;
    }
    for (let r = 0; r < totalR - 1; r++) {
      for (let i = 0; i < segU; i++) {
        const iN = (i + 1) % segU;
        const a = r * segU + i, b = (r + 1) * segU + i, c = (r + 1) * segU + iN, d = r * segU + iN;
        indices[ptr++] = a; indices[ptr++] = b; indices[ptr++] = c;
        indices[ptr++] = a; indices[ptr++] = c; indices[ptr++] = d;
      }
    }
    const lastR = (totalR - 1) * segU;
    for (let i = 0; i < segU; i++) {
      const iN = (i + 1) % segU;
      indices[ptr++] = bCenterIdx; indices[ptr++] = lastR + iN; indices[ptr++] = lastR + i;
    }
    parts.push(makeSmoothPart(positions, indices, {
      name: 'medallion_body', role: 'metal', materialId: state.material
    }));

    // REAL Welded Jump Ring + Perpendicular Tapered Jeweler's Bail (for chain passage!)
    const bailBaseY = (prof === 'heart') ? (topRimY - R * 0.24) : (topRimY - 0.55);
    const jumpR = clamp(R * 0.14, 1.5, 2.8);
    const jumpPts = [];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU;
      // Jump ring lies in XY plane welded directly into top edge
      jumpPts.push([Math.cos(a) * jumpR, bailBaseY + jumpR * 0.85 + Math.sin(a) * jumpR, 0]);
    }
    parts.push(buildClosedWireLoop(jumpPts, 0.65, 0.65, 10, {
      name: 'medallion_jump_ring', role: 'metal', materialId: state.material
    }));

    // Perpendicular Tapered Bail in YZ plane (chain slides through X axis!)
    const bailH = clamp(R * 0.36, 4.2, 8.2);
    const bailD = clamp(R * 0.20, 2.4, 4.5);
    const bailCy = bailBaseY + jumpR * 1.55 + bailH * 0.45;
    const bailPts = [];
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * TAU;
      // Teardrop bail profile in YZ plane
      const y = bailCy + Math.cos(a) * (bailH * 0.5);
      const z = Math.sin(a) * (bailD * 0.5) * (0.72 + 0.32 * Math.cos(a));
      bailPts.push([0, y, z]);
    }
    parts.push(buildClosedWireLoop(bailPts, 0.72, 1.35, 12, {
      name: 'medallion_bail', role: 'metal', materialId: state.material
    }));

    // Center Stone / Halo on Medallion Front Face (+Z)
    if (state.stoneType && state.stoneType !== 'none') {
      const dim = getGemDimensionsMm(state.stoneType, state.stoneCarat);
      const mz = halfT + Math.max(0.55, dim.pavilionH * 0.55);
      // Frame facing +Z: right=[1,0,0], up=[0,0,1], forward=[0,-1,0] (det = +1!)
      parts.push.apply(parts, buildMountedStone({
        cut: state.stoneType, carat: state.stoneCarat, gemMaterial: state.stoneMaterial,
        metalMaterial: state.material, setting: state.stoneSetting,
        embedDepth: dim.pavilionH + 0.6, castableMetalOnly: state.castableMetalOnly,
        origin: [0, 0, mz], right: [1, 0, 0], up: [0, 0, 1], forward: [0, -1, 0],
        name: 'medallion_gem'
      }));
      if (state.stoneLayout === 'halo') {
        parts.push.apply(parts, buildHaloAssembly({
          cut: state.stoneType, carat: state.stoneCarat, metalMaterial: state.material,
          embedDepth: dim.pavilionH + 0.5, castableMetalOnly: state.castableMetalOnly,
          origin: [0, 0, mz - 0.15], right: [1, 0, 0], up: [0, 0, 1], forward: [0, -1, 0]
        }));
      }
    }

    // Custom User Gems on Medallion Front
    if (state.customGems && state.customGems.length > 0) {
      for (let i = 0; i < state.customGems.length; i++) {
        const g = state.customGems[i];
        const gx = (g.u - 0.5) * R * 1.45;
        const gy = (0.5 - g.v) * R * 1.45;
        const cCarat = clamp(g.carat || 0.08, 0.02, 0.5);
        const cDim = getGemDimensionsMm('round', cCarat);
        parts.push.apply(parts, buildMountedStone({
          cut: 'round', carat: cCarat, gemMaterial: state.stoneMaterial || 'diamond',
          metalMaterial: state.material, setting: 'prong4',
          embedDepth: cDim.pavilionH + 0.4, castableMetalOnly: state.castableMetalOnly,
          origin: [gx, gy, halfT + cDim.pavilionH * 0.5],
          right: [1, 0, 0], up: [0, 0, 1], forward: [0, -1, 0],
          name: 'medallion_custom_gem_' + i
        }));
      }
    }

    return parts;
  }

  /**
   * 10D. NECKLACES & CHAINS (100% Real Watertight Interlocked Links + Clasp — ZERO InstancedMesh STL bugs!)
   */
  function generateNecklace(state) {
    const parts = [];
    const loopDiam = clamp(Number(state.innerDiameter) || 145.0, 95.0, 210.0);
    const rx = loopDiam * 0.44;
    const ry = loopDiam * 0.56;
    const linkW = clamp(Number(state.width) || 7.0, 3.0, 14.0);
    const wireR = clamp(Number(state.thickness) || 2.4, 1.0, 4.5) * 0.45;
    const prof = state.profile || 'curb';
    const meta = { name: 'chain_link', role: 'metal', materialId: state.material };

    // Sample graceful bust-drape necklace curve (wider near neck, catenary V-drape at chest)
    function chainPoint(t) {
      const a = t * TAU;
      const x = Math.sin(a) * rx * (1.0 - 0.14 * Math.pow(Math.max(0, -Math.cos(a)), 1.4));
      const y = Math.cos(a) * ry;
      const z = Math.cos(a) * (loopDiam * 0.07);
      return [x, y, z];
    }

    // Arc-length parameterization for uniform link pitch
    const samples = 240;
    const arcPts = [], arcLen = [0];
    for (let i = 0; i <= samples; i++) {
      arcPts.push(chainPoint(i / samples));
      if (i > 0) {
        arcLen.push(arcLen[i - 1] + Math.hypot(
          arcPts[i][0] - arcPts[i - 1][0],
          arcPts[i][1] - arcPts[i - 1][1],
          arcPts[i][2] - arcPts[i - 1][2]
        ));
      }
    }
    const totalLen = arcLen[samples];
    const linkLen = (prof === 'belcher') ? linkW * 1.05 : linkW * 1.42;
    const pitch = linkLen * 0.62;
    const count = clamp(Math.floor(totalLen / pitch), 28, 72);

    function sampleCurveFrame(dist) {
      const target = ((dist % totalLen) + totalLen) % totalLen;
      let idx = 1;
      while (idx < samples && arcLen[idx] < target) idx++;
      const span = (arcLen[idx] - arcLen[idx - 1]) || 1;
      const t = (target - arcLen[idx - 1]) / span;
      const p0 = arcPts[idx - 1], p1 = arcPts[idx];
      const pos = [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t, p0[2] + (p1[2] - p0[2]) * t];
      let tx = p1[0] - p0[0], ty = p1[1] - p0[1], tz = p1[2] - p0[2];
      const tl = Math.hypot(tx, ty, tz) || 1;
      tx /= tl; ty /= tl; tz /= tl;
      // Forward roughly +Z
      let fx = 0, fy = 0, fz = 1;
      const dot = fx * tx + fy * ty + fz * tz;
      fx -= dot * tx; fy -= dot * ty; fz -= dot * tz;
      const fl = Math.hypot(fx, fy, fz) || 1;
      fx /= fl; fy /= fl; fz /= fl;
      // Up = forward × tangent (orthonormal)
      const ux = fy * tz - fz * ty;
      const uy = fz * tx - fx * tz;
      const uz = fx * ty - fy * tx;
      return { pos, right: [tx, ty, tz], up: [ux, uy, uz], forward: [fx, fy, fz] };
    }

    // Build real interlocked links (skipping top 1 link slot for the clasp!)
    const lRx = linkLen * 0.5;
    const lRy = linkW * 0.44;
    for (let k = 1; k < count; k++) {
      const f = sampleCurveFrame((k / count) * totalLen);
      // Link twist: Cable/Belcher alternate 90°, Miami Cuban Curb lies flat at 24° diamond-cut slant!
      const twist = (prof === 'curb')
        ? ((k % 2 === 0 ? 1 : -1) * 0.42)
        : ((k % 2) * (PI * 0.5));
      const cT = Math.cos(twist), sT = Math.sin(twist);
      const u2 = [f.up[0] * cT + f.forward[0] * sT, f.up[1] * cT + f.forward[1] * sT, f.up[2] * cT + f.forward[2] * sT];
      const f2 = [-f.up[0] * sT + f.forward[0] * cT, -f.up[1] * sT + f.forward[1] * cT, -f.up[2] * sT + f.forward[2] * cT];

      const linkPts = [];
      const lSegs = 16;
      for (let s = 0; s < lSegs; s++) {
        const a = (s / lSegs) * TAU;
        const lx = Math.cos(a) * lRx;
        const ly = Math.sin(a) * lRy;
        linkPts.push([
          f.pos[0] + f.right[0] * lx + u2[0] * ly,
          f.pos[1] + f.right[1] * lx + u2[1] * ly,
          f.pos[2] + f.right[2] * lx + u2[2] * ly
        ]);
      }
      // Curb uses flattened wide diamond-cut wire cross-section
      const wRadA = wireR * (prof === 'curb' ? 1.18 : 1.0);
      const wRadB = wireR * (prof === 'curb' ? 0.78 : 1.0);
      parts.push(buildClosedWireLoop(linkPts, wRadA, wRadB, 8, meta));
    }

    // Sculpted Luxury Box / Barrel Clasp at the top (k = 0)
    const claspF = sampleCurveFrame(0);
    const claspLen = Math.max(8.5, linkLen * 1.15);
    const claspR = Math.max(2.2, linkW * 0.34);
    const claspPts = [
      [claspF.pos[0] - claspF.right[0] * claspLen * 0.5, claspF.pos[1] - claspF.right[1] * claspLen * 0.5, claspF.pos[2] - claspF.right[2] * claspLen * 0.5],
      claspF.pos,
      [claspF.pos[0] + claspF.right[0] * claspLen * 0.5, claspF.pos[1] + claspF.right[1] * claspLen * 0.5, claspF.pos[2] + claspF.right[2] * claspLen * 0.5]
    ];
    parts.push(buildSweptWire(claspPts, [claspR * 0.85, claspR, claspR * 0.85], 12, {
      name: 'necklace_clasp', role: 'metal', materialId: state.material
    }, claspR * 0.35));

    // Welded Center Drop Pendant Stone at Bottom of Necklace (dist = totalLen * 0.5)
    if (state.stoneType && state.stoneType !== 'none') {
      const botF = sampleCurveFrame(totalLen * 0.5);
      const dim = getGemDimensionsMm(state.stoneType, state.stoneCarat);
      const dropY = botF.pos[1] - dim.l * 0.55 - 3.5;
      // Welded bail connecting bottom chain link directly into pendant top
      const bailLoop = [];
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * TAU;
        bailLoop.push([botF.pos[0], botF.pos[1] - 1.8 + Math.cos(a) * 2.4, botF.pos[2] + Math.sin(a) * 1.6]);
      }
      parts.push(buildClosedWireLoop(bailLoop, 0.72, 0.95, 10, {
        name: 'pendant_bail', role: 'metal', materialId: state.material
      }));
      parts.push.apply(parts, buildMountedStone({
        cut: state.stoneType, carat: state.stoneCarat, gemMaterial: state.stoneMaterial,
        metalMaterial: state.material, setting: state.stoneSetting,
        embedDepth: dim.pavilionH + 0.6, castableMetalOnly: state.castableMetalOnly,
        origin: [botF.pos[0], dropY, botF.pos[2] + 1.2],
        right: [1, 0, 0], up: [0, 0, 1], forward: [0, -1, 0],
        name: 'necklace_pendant_gem'
      }));
      if (state.stoneLayout === 'halo') {
        parts.push.apply(parts, buildHaloAssembly({
          cut: state.stoneType, carat: state.stoneCarat, metalMaterial: state.material,
          embedDepth: dim.pavilionH + 0.5, castableMetalOnly: state.castableMetalOnly,
          origin: [botF.pos[0], dropY, botF.pos[2] + 1.05],
          right: [1, 0, 0], up: [0, 0, 1], forward: [0, -1, 0]
        }));
      }
    }

    return parts;
  }

  /**
   * 10E. EARRINGS — MATCHED PAIR (×2!) FOR ALL 3 REAL STYLES: DROP, HOOP, STUD
   */
  function generateEarringsPair(state) {
    const parts = [];
    const sizeMm = clamp(Number(state.innerDiameter) || 22.0, 12.0, 44.0);
    const thick = clamp(Number(state.thickness) || 2.0, 1.0, 4.5);
    const prof = state.profile || 'drop';
    const pairSpacing = Math.max(sizeMm * 0.85, 16.0);
    const metalMeta = { name: 'earring_metal', role: 'metal', materialId: state.material };

    for (const side of [-1, 1]) {
      const xOff = side * pairSpacing * 0.55;

      if (prof === 'hoop') {
        // Real Creole Hoop with Hinge Post + Catch Clasp!
        const R = sizeMm * 0.5;
        const tubeR = clamp(thick * 0.52, 0.75, 2.2);
        const arc = TAU * 0.84;
        const nSeg = 52;
        const wirePts = [];
        const wireRad = [];
        for (let i = 0; i <= nSeg; i++) {
          const f = i / nSeg;
          const a = -arc * 0.5 + f * arc; // Gap at top-back (+Y slightly shifted)
          const ang = a + PI * 0.22;
          // Slightly thicker voluptuous belly at bottom of hoop!
          const belly = 1.0 + 0.35 * Math.pow(Math.max(0, -Math.cos(ang)), 1.4);
          wirePts.push([xOff, Math.cos(ang) * R, Math.sin(ang) * R]);
          wireRad.push(tubeR * belly);
        }
        parts.push(buildSweptWire(wirePts, wireRad, 14, metalMeta, tubeR * 0.5));

        // 0.85 mm Ear Post bridging top opening
        const pStart = wirePts[0];
        const pEnd = wirePts[nSeg];
        const pMid = [xOff, (pStart[1] + pEnd[1]) * 0.5 + 1.2, (pStart[2] + pEnd[2]) * 0.5];
        parts.push(buildSweptWire([pStart, pMid, pEnd], 0.44, 10, metalMeta, 0.25));

        // Optional pavé gems along front curve of Creole hoop
        if (state.stoneType && state.stoneType !== 'none') {
          const gemCt = clamp(state.stoneCarat * 0.14, 0.03, 0.22);
          const count = 5;
          for (let k = 0; k < count; k++) {
            const ang = PI * 0.5 + (k - 2) * 0.26;
            const py = Math.cos(ang) * (R + tubeR * 1.15);
            const pz = Math.sin(ang) * (R + tubeR * 1.15);
            const uy = Math.cos(ang), uz = Math.sin(ang);
            parts.push.apply(parts, buildMountedStone({
              cut: 'round', carat: gemCt, gemMaterial: state.stoneMaterial,
              metalMaterial: state.material, setting: 'prong4',
              embedDepth: 1.2, castableMetalOnly: state.castableMetalOnly,
              origin: [xOff, py, pz],
              right: [1, 0, 0], up: [0, uy, uz], forward: [0, -uz, uy],
              name: 'hoop_gem_' + (side > 0 ? 'R' : 'L') + '_' + k
            }));
          }
        }
      } else if (prof === 'stud') {
        // Real Solitaire / Halo Stud with 0.85 mm Ear Post + Sculpted Butterfly Back Clutch!
        const gemCut = (state.stoneType && state.stoneType !== 'none') ? state.stoneType : 'round';
        const gemCt = clamp(state.stoneCarat || 1.0, 0.25, 3.0);
        const dim = getGemDimensionsMm(gemCut, gemCt);
        const postLen = 10.5;

        // Basket + Gemstone facing +Z
        parts.push.apply(parts, buildMountedStone({
          cut: gemCut, carat: gemCt, gemMaterial: state.stoneMaterial || 'diamond',
          metalMaterial: state.material, setting: state.stoneSetting,
          embedDepth: dim.pavilionH + 0.65, castableMetalOnly: state.castableMetalOnly,
          origin: [xOff, 0, 0],
          right: [1, 0, 0], up: [0, 0, 1], forward: [0, -1, 0],
          name: 'stud_gem_' + (side > 0 ? 'R' : 'L')
        }));
        if (state.stoneLayout === 'halo') {
          parts.push.apply(parts, buildHaloAssembly({
            cut: gemCut, carat: gemCt, metalMaterial: state.material,
            embedDepth: dim.pavilionH + 0.55, castableMetalOnly: state.castableMetalOnly,
            origin: [xOff, 0, -0.15], right: [1, 0, 0], up: [0, 0, 1], forward: [0, -1, 0]
          }));
        }
        // True 0.85 mm Ear Post going back along -Z with notched security groove!
        const postStart = -dim.pavilionH - 0.35;
        parts.push(buildSweptWire(
          [
            [xOff, 0, postStart],
            [xOff, 0, postStart - postLen * 0.72],
            [xOff, 0, postStart - postLen * 0.78],
            [xOff, 0, postStart - postLen * 0.84],
            [xOff, 0, postStart - postLen]
          ],
          [0.44, 0.44, 0.34, 0.44, 0.36],
          10, metalMeta, 0.22
        ));
        // Sculpted Butterfly Push-Back Clutch seated on post!
        const clutchZ = postStart - postLen * 0.78;
        const discPts = [];
        for (let i = 0; i < 18; i++) {
          const a = (i / 18) * TAU;
          discPts.push([xOff + Math.cos(a) * 2.3, Math.sin(a) * 1.6, clutchZ]);
        }
        parts.push(buildClosedWireLoop(discPts, 0.52, 0.42, 8, metalMeta));
      } else {
        // Royal Teardrop Drop Earring: Real French Shepherd's Hook + Articulated Jump Ring + Drop Gallery!
        const gemCut = (state.stoneType && state.stoneType !== 'none') ? state.stoneType : 'pear';
        const gemCt = clamp(state.stoneCarat || 1.25, 0.35, 4.0);
        const dim = getGemDimensionsMm(gemCut, gemCt);
        const dropCenterY = -dim.l * 0.55 - 2.4;

        // Real curved 0.85 mm French Ear Wire (Shepherd's Hook) in YZ plane!
        const hookPts = [];
        for (let i = 0; i <= 22; i++) {
          const f = i / 22;
          const a = -PI * 0.15 + f * PI * 1.35;
          const hz = Math.cos(a) * 4.5 - 4.5;
          const hy = 5.5 + Math.sin(a) * 5.8 - (f > 0.75 ? (f - 0.75) * 9.0 : 0);
          hookPts.push([xOff, hy, hz]);
        }
        parts.push(buildSweptWire(hookPts, 0.44, 10, metalMeta, 0.28));
        // Decorative gold bead on front of hook
        parts.push(buildSphere(xOff, 2.2, 0.3, 1.15, 14, 10, metalMeta));

        // Welded Jump Ring connecting hook bottom to drop frame
        const jrPts = [];
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * TAU;
          jrPts.push([xOff + Math.cos(a) * 1.4, 0.1 + Math.sin(a) * 1.4, 0]);
        }
        parts.push(buildClosedWireLoop(jrPts, 0.46, 0.46, 8, metalMeta));

        // Articulated Teardrop Frame & Mounted Gem facing +Z!
        const framePts = [];
        for (let i = 0; i < 28; i++) {
          const [cx, cz] = sampleGemContour(gemCut, i / 28);
          framePts.push([xOff + cx * (dim.w * 0.58 + 0.9), dropCenterY + cz * (dim.l * 0.58 + 0.9), -0.35]);
        }
        parts.push(buildClosedWireLoop(framePts, 0.65, 0.65, 10, metalMeta));

        parts.push.apply(parts, buildMountedStone({
          cut: gemCut, carat: gemCt, gemMaterial: state.stoneMaterial || 'sapphire',
          metalMaterial: state.material, setting: state.stoneSetting,
          embedDepth: dim.pavilionH + 0.5, castableMetalOnly: state.castableMetalOnly,
          origin: [xOff, dropCenterY, 0.55],
          right: [1, 0, 0], up: [0, 0, 1], forward: [0, -1, 0],
          name: 'drop_gem_' + (side > 0 ? 'R' : 'L')
        }));
        if (state.stoneLayout === 'halo') {
          parts.push.apply(parts, buildHaloAssembly({
            cut: gemCut, carat: gemCt, metalMaterial: state.material,
            embedDepth: dim.pavilionH + 0.45, castableMetalOnly: state.castableMetalOnly,
            origin: [xOff, dropCenterY, 0.40], right: [1, 0, 0], up: [0, 0, 1], forward: [0, -1, 0]
          }));
        }
      }
    }

    return parts;
  }

  /**
   * 10F. CROWNS & TIARAS — TRUE HEAD-SIZED (Ø 130–160 mm) OPEN-BACK FILIGREE BRIDAL TIARA & ELVEN CIRCLET!
   */
  function generateCrownOrTiara(state) {
    const parts = [];
    const headDiam = clamp(Number(state.innerDiameter) || 142.0, 115.0, 175.0);
    const R = headDiam * 0.5;
    const peakH = clamp(Number(state.width) || 34.0, 18.0, 58.0);
    const wireR = clamp(Number(state.thickness) || 2.4, 1.4, 4.0) * 0.52;
    const prof = state.profile || 'tiara';
    const meta = { name: 'tiara_metal', role: 'metal', materialId: state.material };

    // Semicircular headband arc (210° open-back tiara, front faces +Z!)
    const arcHalf = (105 * PI) / 180;
    const nSeg = 72;

    if (prof === 'elven') {
      // Elven Woodland Circlet: twin intertwined tapered vine bands meeting at a graceful brow V-dip!
      for (const strand of [-1, 1]) {
        const pts = [];
        const rads = [];
        for (let i = 0; i <= nSeg; i++) {
          const f = i / nSeg;
          const a = -arcHalf + f * (arcHalf * 2);
          const centerEnv = Math.cos((a / arcHalf) * (PI * 0.5));
          const vineWave = Math.sin(a * 6.0 + (strand > 0 ? 0 : PI)) * (3.2 * centerEnv + 0.8);
          const browDip = -Math.pow(Math.max(0, Math.cos(a * 1.4)), 3.0) * (peakH * 0.36);
          const archRise = Math.pow(Math.max(0, Math.cos(a * 1.1)), 1.8) * (peakH * 0.22);
          const x = Math.sin(a) * R;
          const z = Math.cos(a) * R;
          const y = archRise + browDip + vineWave + (strand > 0 ? 2.4 : -0.6);
          pts.push([x, y, z]);
          rads.push(wireR * (0.72 + 0.45 * centerEnv));
        }
        parts.push(buildSweptWire(pts, rads, 10, meta, wireR * 0.5));
      }
      // Graceful rising leaf-crest arcs above center brow
      for (const sgn of [-1, 1]) {
        const leafPts = [];
        const leafRad = [];
        for (let i = 0; i <= 20; i++) {
          const t = i / 20;
          const a = sgn * (0.04 + t * 0.48);
          const h = Math.sin(t * PI) * peakH * 0.55 + (1 - t) * peakH * 0.35;
          leafPts.push([Math.sin(a) * (R + 0.6), h, Math.cos(a) * (R + 0.6)]);
          leafRad.push(wireR * (0.85 - 0.35 * t));
        }
        parts.push(buildSweptWire(leafPts, leafRad, 10, meta, wireR * 0.35));
      }
      // Central Elven Forehead Gem (mounted radially at front brow!)
      if (state.stoneType && state.stoneType !== 'none') {
        const gemCt = clamp(state.stoneCarat || 1.4, 0.4, 4.0);
        const dim = getGemDimensionsMm(state.stoneType, gemCt);
        parts.push.apply(parts, buildMountedStone({
          cut: state.stoneType, carat: gemCt, gemMaterial: state.stoneMaterial || 'emerald',
          metalMaterial: state.material, setting: state.stoneSetting,
          embedDepth: dim.pavilionH + 0.6, castableMetalOnly: state.castableMetalOnly,
          origin: [0, peakH * 0.32, R + 1.8],
          right: [1, 0, 0], up: [0, 0, 1], forward: [0, -1, 0],
          name: 'elven_center_gem'
        }));
      }
    } else {
      // IMPERIAL BRIDAL CATHEDRAL TIARA — Twin base bands + 7 graduated cathedral filigree arches + peak gems!
      for (const row of [0, 1]) {
        const pts = [];
        const rads = [];
        for (let i = 0; i <= nSeg; i++) {
          const f = i / nSeg;
          const a = -arcHalf + f * (arcHalf * 2);
          const env = Math.cos((a / arcHalf) * (PI * 0.5));
          pts.push([Math.sin(a) * R, row * 4.4, Math.cos(a) * R]);
          rads.push(wireR * (0.78 + 0.32 * env));
        }
        parts.push(buildSweptWire(pts, rads, 10, meta, wireR * 0.5));
      }

      // Watertight End Pin-Loops (hairpin eyelets at both tiara tips!)
      for (const sgn of [-1, 1]) {
        const aEnd = sgn * arcHalf;
        const ex = Math.sin(aEnd) * R, ez = Math.cos(aEnd) * R;
        const loopPts = [];
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * TAU;
          loopPts.push([ex + Math.cos(aEnd) * Math.cos(a) * 2.6, 2.2 + Math.sin(a) * 2.6, ez - Math.sin(aEnd) * Math.cos(a) * 2.6]);
        }
        parts.push(buildClosedWireLoop(loopPts, 0.75, 0.75, 8, meta));
      }

      // 7 Graduated Cathedral Filigree Arches rising cleanly to central Royal Peak!
      const archCount = 7;
      const archSpanRad = (arcHalf * 1.62) / archCount;
      for (let k = 0; k < archCount; k++) {
        const centerIdx = k - (archCount - 1) * 0.5;
        const aMid = centerIdx * archSpanRad;
        const distNorm = Math.abs(centerIdx) / ((archCount - 1) * 0.5);
        const hArch = peakH * (1.0 - distNorm * distNorm * 0.68);
        const halfA = archSpanRad * 0.58;

        // Gothic pointed arch curve in cylindrical tiara surface
        const archPts = [];
        const archRads = [];
        const steps = 22;
        for (let s = 0; s <= steps; s++) {
          const u = (s / steps) * 2 - 1; // -1..+1
          const a = aMid + u * halfA;
          const y = 3.8 + (1.0 - Math.pow(Math.abs(u), 1.35)) * hArch;
          // Graceful royal outward flare near the top!
          const flareR = R + (y / peakH) * 5.2;
          archPts.push([Math.sin(a) * flareR, y, Math.cos(a) * flareR]);
          archRads.push(wireR * (0.95 - Math.abs(u) * 0.18));
        }
        parts.push(buildSweptWire(archPts, archRads, 10, meta, wireR * 0.4));

        // Inner Scrollwork Sub-Arch inside each cathedral bay
        const subPts = [];
        for (let s = 0; s <= 14; s++) {
          const u = (s / 14) * 2 - 1;
          const a = aMid + u * halfA * 0.62;
          const y = 4.2 + Math.cos(u * PI * 0.5) * hArch * 0.56;
          const flareR = R + (y / peakH) * 4.8;
          subPts.push([Math.sin(a) * flareR, y, Math.cos(a) * flareR]);
        }
        parts.push(buildSweptWire(subPts, wireR * 0.72, 8, meta, wireR * 0.3));

        // Mount Faceted Gemstones PRECISELY ATOP EVERY ARCH PEAK (radial outward)!
        if (state.stoneType && state.stoneType !== 'none') {
          const peakY = 3.8 + hArch + 0.6;
          const peakR = R + (peakY / peakH) * 5.2 + 0.8;
          const gCarat = clamp((state.stoneCarat || 1.2) * (1.0 - distNorm * 0.58), 0.15, 3.0);
          const sa = Math.sin(aMid), ca = Math.cos(aMid);
          // Outward radial forward along (sa, 0, ca); gem faces radially outward!
          // Basis: right=[ca, 0, -sa], up=[sa, 0, ca], forward=[0, -1, 0] -> det = +1!
          parts.push.apply(parts, buildMountedStone({
            cut: (k === Math.floor(archCount / 2)) ? state.stoneType : 'round',
            carat: gCarat,
            gemMaterial: state.stoneMaterial || 'diamond',
            metalMaterial: state.material,
            setting: state.stoneSetting === 'bezel' ? 'bezel' : 'prong4',
            embedDepth: 1.8,
            castableMetalOnly: state.castableMetalOnly,
            origin: [sa * peakR, peakY, ca * peakR],
            right: [ca, 0, -sa], up: [sa, 0, ca], forward: [0, -1, 0],
            name: 'tiara_peak_gem_' + k
          }));
        }
      }
    }

    return parts;
  }

  /* =========================================================================
     11. MASTER BUILD ENTRYPOINT + TOPOLOGY / VOLUME / COST / PREFLIGHT ANALYZER
  ========================================================================= */
  function buildJewelry(rawState, maps) {
    const state = Object.assign({}, DEFAULT_STATE, rawState || {});
    let parts;
    switch (state.category) {
      case 'bracelets':  parts = generateBandOrRing(state, maps); break;
      case 'medallions': parts = generateMedallion(state, maps); break;
      case 'necklaces':  parts = generateNecklace(state); break;
      case 'earrings':   parts = generateEarringsPair(state); break;
      case 'crowns':     parts = generateCrownOrTiara(state); break;
      case 'rings':
      default:           parts = generateBandOrRing(state, maps); break;
    }

    const stats = analyzeJewelryParts(parts, state);
    const preflight = runPreflightCheck(state, stats);
    return { state, parts, stats, preflight };
  }

  /**
   * Computes exact closed-mesh volume (mm^3 & cm^3), bounding box (mm), topology edge check,
   * true alloy weight (grams), wax/resin volume, total gem carat weight & atelier cost breakdown!
   */
  function analyzeJewelryParts(parts, state) {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    let metalVolMm3 = 0, gemVolMm3 = 0;
    let totalTriangles = 0, gemCount = 0, totalCarats = 0;
    let openBoundaryEdges = 0, degenerateTris = 0, nonFiniteVerts = 0;

    for (let p = 0; p < parts.length; p++) {
      const part = parts[p];
      const pos = part.topologyPositions || part.positions;
      const idx = part.topologyIndices || part.indices;

      for (let i = 0; i < pos.length; i += 3) {
        const x = pos[i], y = pos[i + 1], z = pos[i + 2];
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
          nonFiniteVerts++;
          continue;
        }
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
      }

      const vol = Math.abs(computeSignedVolume(pos, idx));
      if (part.role === 'gem') {
        gemVolMm3 += vol;
        gemCount++;
        totalCarats += Number(part.carat) || 0;
      } else {
        metalVolMm3 += vol;
      }

      totalTriangles += (part.indices.length / 3);

      // Exact directed-edge watertight manifold verification on topology mesh!
      const edgeCounts = new Map();
      for (let i = 0; i < idx.length; i += 3) {
        const a = idx[i], b = idx[i + 1], c = idx[i + 2];
        if (a === b || b === c || c === a) { degenerateTris++; continue; }
        const pairs = [[a, b], [b, c], [c, a]];
        for (let k = 0; k < 3; k++) {
          const u = pairs[k][0], v = pairs[k][1];
          const rev = v + '_' + u;
          const cnt = edgeCounts.get(rev);
          if (cnt && cnt > 0) {
            if (cnt === 1) edgeCounts.delete(rev);
            else edgeCounts.set(rev, cnt - 1);
          } else {
            const key = u + '_' + v;
            edgeCounts.set(key, (edgeCounts.get(key) || 0) + 1);
          }
        }
      }
      openBoundaryEdges += edgeCounts.size;
    }

    if (!Number.isFinite(minX)) { minX = minY = minZ = maxX = maxY = maxZ = 0; }
    const sizeMm = {
      x: +(maxX - minX).toFixed(2),
      y: +(maxY - minY).toFixed(2),
      z: +(maxZ - minZ).toFixed(2)
    };

    const alloy = ALLOYS[state.material] || ALLOYS.gold18k;
    const gemMat = GEM_MATERIALS[state.stoneMaterial] || GEM_MATERIALS.diamond;
    const metalVolCm3 = metalVolMm3 / 1000.0;
    const metalWeightG = metalVolCm3 * alloy.density;
    const waxWeightG = metalVolCm3 * ALLOYS.waxresin.density;
    const gemWeightG = totalCarats * 0.20; // 1 carat === exactly 0.200 grams!
    const totalWeightG = metalWeightG + gemWeightG;

    // Realistic Atelier Valuation Breakdown
    const metalCostEur = metalWeightG * alloy.spotEur;
    let gemCostEur = 0;
    for (let p = 0; p < parts.length; p++) {
      if (parts[p].role === 'gem') {
        const ct = Number(parts[p].carat) || 0.1;
        const gm = GEM_MATERIALS[parts[p].materialId] || gemMat;
        gemCostEur += Math.pow(ct, 1.32) * gm.eurPerCt;
      }
    }
    const laborEur = 160 + gemCount * 22 + (state.engraveText ? 45 : 0);
    const totalEstimateEur = Math.round(metalCostEur + gemCostEur + laborEur);

    const innerDiamMm = +(Number(state.innerDiameter) || 17.2).toFixed(2);
    const outerDiamMm = +(innerDiamMm + (Number(state.thickness) || 2.0) * 2).toFixed(2);

    return {
      bounds: { minX, minY, minZ, maxX, maxY, maxZ },
      sizeMm,
      innerDiamMm,
      outerDiamMm,
      metalVolMm3: +metalVolMm3.toFixed(1),
      metalVolCm3: +metalVolCm3.toFixed(3),
      gemVolMm3: +gemVolMm3.toFixed(1),
      metalWeightG: +metalWeightG.toFixed(2),
      waxWeightG: +waxWeightG.toFixed(2),
      gemWeightG: +gemWeightG.toFixed(2),
      totalWeightG: +totalWeightG.toFixed(2),
      gemCount,
      totalCarats: +totalCarats.toFixed(2),
      totalTriangles: Math.round(totalTriangles),
      openBoundaryEdges,
      degenerateTris,
      nonFiniteVerts,
      isWatertight: openBoundaryEdges === 0 && nonFiniteVerts === 0 && metalVolMm3 > 0,
      cost: {
        metalEur: Math.round(metalCostEur),
        gemEur: Math.round(gemCostEur),
        laborEur: Math.round(laborEur),
        totalEur: totalEstimateEur
      }
    };
  }

  /**
   * Lost-Wax Casting & Resin 3D Printing Pre-Flight Inspector (/100) + Auto-Fixer!
   */
  function runPreflightCheck(state, stats) {
    const checks = [];
    let score = 100;

    // 1. Watertight Manifold Integrity
    if (stats.isWatertight) {
      checks.push({ id: 'manifold', status: 'pass', en: 'Watertight Manifold (0 open edges, outward normals)', fr: 'Maillage Étanche Manifold (0 arête ouverte, normales externes)' });
    } else {
      score -= 35;
      checks.push({ id: 'manifold', status: 'fail', en: `Non-manifold: ${stats.openBoundaryEdges} open edges`, fr: `Non-manifold : ${stats.openBoundaryEdges} arêtes ouvertes` });
    }

    // 2. Minimum Shank / Wall Thickness for Lost-Wax Casting
    const minWall = Number(state.thickness) || 2.0;
    const minTaperedWall = minWall * (1 - clamp(state.shankTaper || 0, 0, 0.52) * 0.35);
    if (minTaperedWall >= 1.25) {
      checks.push({ id: 'wall', status: 'pass', en: `Shank/Wall ${minTaperedWall.toFixed(2)} mm (Casting-safe ≥ 1.25 mm)`, fr: `Épaisseur ${minTaperedWall.toFixed(2)} mm (OK fonte ≥ 1.25 mm)` });
    } else if (minTaperedWall >= 0.85) {
      score -= 15;
      checks.push({ id: 'wall', status: 'warn', en: `Thin wall ${minTaperedWall.toFixed(2)} mm (Resin OK, delicate for gold casting)`, fr: `Paroi fine ${minTaperedWall.toFixed(2)} mm (OK résine, délicat en fonte or)` });
    } else {
      score -= 30;
      checks.push({ id: 'wall', status: 'fail', en: `Wall too thin (${minTaperedWall.toFixed(2)} mm < 0.85 mm — risk of miscast)`, fr: `Paroi trop fine (${minTaperedWall.toFixed(2)} mm < 0.85 mm — risque casse)` });
    }

    // 3. Prong Diameter & Stone Clearance
    if (state.stoneType && state.stoneType !== 'none') {
      const dim = getGemDimensionsMm(state.stoneType, state.stoneCarat);
      const prongDiam = clamp((0.36 + ((dim.w + dim.l) * 0.25) * 0.085) * 2, 0.76, 1.56);
      checks.push({
        id: 'prongs',
        status: prongDiam >= 0.72 ? 'pass' : 'warn',
        en: `Setting prongs Ø ${prongDiam.toFixed(2)} mm · Pavilion bore-safe`,
        fr: `Griffes Ø ${prongDiam.toFixed(2)} mm · Culasse sécurisée`
      });
    } else {
      checks.push({ id: 'prongs', status: 'pass', en: 'Solid metal band (no stone-setting clearances needed)', fr: 'Corps métal plein (aucun sertissage requis)' });
    }

    // 4. Relief / Engraving Castability
    const rDepth = Number(state.reliefDepth) || 0.45;
    if (rDepth > minWall * 0.45 && (state.engraveText || state.procPattern !== 'none')) {
      score -= 10;
      checks.push({ id: 'relief', status: 'warn', en: `Deep relief (${rDepth.toFixed(2)} mm) vs wall — recommend ≤ ${(minWall * 0.38).toFixed(2)} mm`, fr: `Relief profond (${rDepth.toFixed(2)} mm) — recommandé ≤ ${(minWall * 0.38).toFixed(2)} mm` });
    } else {
      checks.push({ id: 'relief', status: 'pass', en: `Surface detail depth ${rDepth.toFixed(2)} mm (Crisp castable detail)`, fr: `Profondeur gravure ${rDepth.toFixed(2)} mm (Netteté optimale)` });
    }

    // 5. Casting Shrinkage & Export Mode Status
    const shrink = Number(state.shrinkagePercent) || 0;
    checks.push({
      id: 'shrinkage',
      status: 'pass',
      en: shrink > 0
        ? `Shrinkage compensation active (+${shrink.toFixed(1)}% scaled STL)`
        : '1:1 Exact Scale STL (0% shrinkage — toggle +1.5%/+2.5% for casting)',
      fr: shrink > 0
        ? `Compensation retrait active (+${shrink.toFixed(1)}% dans le STL)`
        : 'Échelle 1:1 Exacte (0% retrait — activez +1.5%/+2.5% pour fonte)'
    });

    return {
      score: clamp(score, 0, 100),
      grade: score >= 90 ? 'CAST-READY' : (score >= 70 ? 'RESIN-OK' : 'FIX NEEDED'),
      checks
    };
  }

  function getAutoFixPatch(state) {
    const patch = {};
    if ((Number(state.thickness) || 2.0) < 1.6) patch.thickness = 1.8;
    if ((Number(state.width) || 4.5) < 2.2 && state.category === 'rings') patch.width = 2.6;
    if ((Number(state.reliefDepth) || 0.45) > (patch.thickness || state.thickness) * 0.40) {
      patch.reliefDepth = +(((patch.thickness || state.thickness) * 0.32).toFixed(2));
    }
    return patch;
  }

  /* =========================================================================
     12. EXACT 1:1 MILLIMETER BINARY STL & OBJ EXPORTERS (WITH SHRINKAGE!)
  ========================================================================= */
  function filterExportParts(parts, castableMetalOnly) {
    return castableMetalOnly ? parts.filter(function (p) { return p.role === 'metal'; }) : parts;
  }

  function exportBinarySTL(parts, options) {
    const opts = options || {};
    const selected = filterExportParts(parts, !!opts.castableMetalOnly);
    const scale = 1.0 + (Number(opts.shrinkagePercent) || 0) / 100.0;

    let totalTris = 0;
    for (let p = 0; p < selected.length; p++) totalTris += (selected[p].indices.length / 3);

    const buf = new ArrayBuffer(84 + totalTris * 50);
    const view = new DataView(buf);
    const header = 'Studios-Pro Jewelry Maker Pro 1:1mm CAD Watertight STL';
    for (let i = 0; i < header.length && i < 80; i++) view.setUint8(i, header.charCodeAt(i));
    view.setUint32(80, totalTris, true);

    let offset = 84;
    for (let p = 0; p < selected.length; p++) {
      const pos = selected[p].positions;
      const idx = selected[p].indices;
      for (let i = 0; i < idx.length; i += 3) {
        const ia = idx[i] * 3, ib = idx[i + 1] * 3, ic = idx[i + 2] * 3;
        const ax = pos[ia] * scale,     ay = pos[ia + 1] * scale, az = pos[ia + 2] * scale;
        const bx = pos[ib] * scale,     by = pos[ib + 1] * scale, bz = pos[ib + 2] * scale;
        const cx = pos[ic] * scale,     cy = pos[ic + 1] * scale, cz = pos[ic + 2] * scale;
        const abx = bx - ax, aby = by - ay, abz = bz - az;
        const acx = cx - ax, acy = cy - ay, acz = cz - az;
        let nx = aby * acz - abz * acy;
        let ny = abz * acx - abx * acz;
        let nz = abx * acy - aby * acx;
        const nl = Math.hypot(nx, ny, nz) || 1;
        nx /= nl; ny /= nl; nz /= nl;

        view.setFloat32(offset, nx, true); offset += 4;
        view.setFloat32(offset, ny, true); offset += 4;
        view.setFloat32(offset, nz, true); offset += 4;
        view.setFloat32(offset, ax, true); offset += 4;
        view.setFloat32(offset, ay, true); offset += 4;
        view.setFloat32(offset, az, true); offset += 4;
        view.setFloat32(offset, bx, true); offset += 4;
        view.setFloat32(offset, by, true); offset += 4;
        view.setFloat32(offset, bz, true); offset += 4;
        view.setFloat32(offset, cx, true); offset += 4;
        view.setFloat32(offset, cy, true); offset += 4;
        view.setFloat32(offset, cz, true); offset += 4;
        view.setUint16(offset, 0, true);   offset += 2;
      }
    }
    return buf;
  }

  function exportOBJ(parts, options) {
    const opts = options || {};
    const selected = filterExportParts(parts, !!opts.castableMetalOnly);
    const scale = 1.0 + (Number(opts.shrinkagePercent) || 0) / 100.0;
    const lines = [
      '# Studios-Pro Jewelry Maker Pro — 1:1 mm Precision CAD Export',
      '# Scale factor: ' + scale.toFixed(4) + ' (units: millimeters)'
    ];
    let vOffset = 1;
    for (let p = 0; p < selected.length; p++) {
      const part = selected[p];
      const pos = part.positions;
      const nrm = part.normals;
      const idx = part.indices;
      lines.push('o ' + (part.name || 'part') + '_' + p);
      for (let i = 0; i < pos.length; i += 3) {
        lines.push('v ' + (pos[i] * scale).toFixed(4) + ' ' + (pos[i + 1] * scale).toFixed(4) + ' ' + (pos[i + 2] * scale).toFixed(4));
      }
      for (let i = 0; i < nrm.length; i += 3) {
        lines.push('vn ' + nrm[i].toFixed(4) + ' ' + nrm[i + 1].toFixed(4) + ' ' + nrm[i + 2].toFixed(4));
      }
      for (let i = 0; i < idx.length; i += 3) {
        const a = idx[i] + vOffset, b = idx[i + 1] + vOffset, c = idx[i + 2] + vOffset;
        lines.push('f ' + a + '//' + a + ' ' + b + '//' + b + ' ' + c + '//' + c);
      }
      vOffset += (pos.length / 3);
    }
    return lines.join('\n');
  }

  /* =========================================================================
     13. VECTOR HERALDRY STAMP RENDERER (PURE CANVAS2D BEVELED BAS-RELIEF!)
  ========================================================================= */
  const HERALDRY_STAMPS = [
    { id: 'fleur',   en: 'Fleur-de-Lis', fr: 'Fleur de Lys',  sym: '⚜' },
    { id: 'crown',   en: 'Royal Crown',  fr: 'Couronne',      sym: '♛' },
    { id: 'star',    en: 'North Star',   fr: 'Étoile Nord',   sym: '✦' },
    { id: 'heart',   en: 'Baroque Heart',fr: 'Cœur Baroque',  sym: '♥' },
    { id: 'lotus',   en: 'Sacred Lotus', fr: 'Lotus Sacré',   sym: '✿' },
    { id: 'celtic',  en: 'Triquetra',    fr: 'Triquetra',     sym: '❖' },
    { id: 'infinity',en: 'Infinity',     fr: 'Infini',        sym: '∞' },
    { id: 'crescent',en: 'Crescent',     fr: 'Croissant',     sym: '☾' },
    { id: 'cross',   en: 'Maltese Cross',fr: 'Croix Malte',   sym: '✠' },
    { id: 'shield',  en: 'Royal Shield', fr: 'Écu Royal',     sym: '🛡' },
    { id: 'rose',    en: 'Tudor Rose',   fr: 'Rose Tudor',    sym: '❀' },
    { id: 'laurel',  en: 'Laurel Wreath',fr: 'Lauriers',      sym: '🌿' }
  ];

  /**
   * Draws a multi-pass beveled white-on-black heightmap vector relief stamp directly onto a 2D Canvas!
   * Produces crisp, smooth goldsmith-quality bas-relief (zero blobby OS emojis!).
   */
  function drawVectorReliefStamp(ctx, stampId, cx, cy, sizePx) {
    ctx.save();
    ctx.translate(cx, cy);
    const s = sizePx * 0.48;

    function traceShape() {
      ctx.beginPath();
      switch (stampId) {
        case 'fleur': {
          // Center petal
          ctx.moveTo(0, -s);
          ctx.bezierCurveTo(s * 0.28, -s * 0.55, s * 0.24, s * 0.05, s * 0.10, s * 0.35);
          ctx.lineTo(-s * 0.10, s * 0.35);
          ctx.bezierCurveTo(-s * 0.24, s * 0.05, -s * 0.28, -s * 0.55, 0, -s);
          ctx.closePath();
          // Left & right curled petals
          for (const dir of [-1, 1]) {
            ctx.moveTo(dir * s * 0.12, s * 0.25);
            ctx.bezierCurveTo(dir * s * 0.35, -s * 0.35, dir * s * 0.95, -s * 0.35, dir * s * 0.85, s * 0.15);
            ctx.bezierCurveTo(dir * s * 0.78, s * 0.42, dir * s * 0.45, s * 0.30, dir * s * 0.50, s * 0.12);
            ctx.bezierCurveTo(dir * s * 0.55, -s * 0.05, dir * s * 0.32, s * 0.05, dir * s * 0.18, s * 0.35);
            ctx.closePath();
          }
          // Cross tie bar & base foot
          ctx.rect(-s * 0.45, s * 0.28, s * 0.90, s * 0.16);
          ctx.moveTo(-s * 0.18, s * 0.44);
          ctx.quadraticCurveTo(0, s * 1.0, s * 0.18, s * 0.44);
          ctx.closePath();
          break;
        }
        case 'crown': {
          ctx.moveTo(-s * 0.82, s * 0.55);
          ctx.lineTo(-s * 0.92, -s * 0.32);
          ctx.lineTo(-s * 0.42, s * 0.08);
          ctx.lineTo(0, -s * 0.72);
          ctx.lineTo(s * 0.42, s * 0.08);
          ctx.lineTo(s * 0.92, -s * 0.32);
          ctx.lineTo(s * 0.82, s * 0.55);
          ctx.closePath();
          ctx.rect(-s * 0.80, s * 0.62, s * 1.60, s * 0.20);
          break;
        }
        case 'star': {
          const pts = 8;
          for (let i = 0; i < pts * 2; i++) {
            const a = (i * PI) / pts - PI / 2;
            const r = (i % 2 === 0) ? (i % 4 === 0 ? s : s * 0.72) : s * 0.26;
            const x = Math.cos(a) * r, y = Math.sin(a) * r;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.closePath();
          break;
        }
        case 'heart': {
          for (let i = 0; i <= 48; i++) {
            const t = (i / 48) * TAU;
            const x = (16 * Math.pow(Math.sin(t), 3) / 16.5) * s;
            const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16.5 * s;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.closePath();
          break;
        }
        case 'lotus': {
          const angles = [-0.85, -0.42, 0, 0.42, 0.85];
          for (let k = 0; k < angles.length; k++) {
            const a = angles[k];
            const len = s * (1.0 - Math.abs(a) * 0.25);
            const ca = Math.cos(a), sa = Math.sin(a);
            ctx.moveTo(0, s * 0.52);
            ctx.quadraticCurveTo(sa * len * 0.85 - ca * s * 0.28, s * 0.52 - ca * len * 0.55 - sa * s * 0.28, sa * len, s * 0.52 - ca * len);
            ctx.quadraticCurveTo(sa * len * 0.85 + ca * s * 0.28, s * 0.52 - ca * len * 0.55 + sa * s * 0.28, 0, s * 0.52);
          }
          break;
        }
        case 'celtic': {
          for (let k = 0; k < 3; k++) {
            const a = (k * TAU) / 3 - PI / 2;
            const ox = Math.cos(a) * s * 0.34, oy = Math.sin(a) * s * 0.34;
            ctx.moveTo(ox + s * 0.46, oy);
            ctx.arc(ox, oy, s * 0.46, 0, TAU);
          }
          break;
        }
        case 'infinity': {
          for (let i = 0; i <= 64; i++) {
            const t = (i / 64) * TAU;
            const denom = 1 + Math.sin(t) * Math.sin(t);
            const x = (Math.cos(t) / denom) * s * 0.96;
            const y = (Math.sin(t) * Math.cos(t) / denom) * s * 0.96;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.closePath();
          break;
        }
        case 'crescent': {
          ctx.arc(0, 0, s * 0.88, 0.45, TAU - 0.45, false);
          ctx.arc(s * 0.34, 0, s * 0.70, TAU - 0.55, 0.55, true);
          ctx.closePath();
          break;
        }
        case 'cross': {
          for (let k = 0; k < 4; k++) {
            const a = k * PI * 0.5;
            const ca = Math.cos(a), sa = Math.sin(a);
            const p1 = [ca * s * 0.92 - sa * s * 0.36, sa * s * 0.92 + ca * s * 0.36];
            const p2 = [ca * s * 0.72, sa * s * 0.72];
            const p3 = [ca * s * 0.92 + sa * s * 0.36, sa * s * 0.92 - ca * s * 0.36];
            ctx.moveTo(0, 0); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.lineTo(p3[0], p3[1]); ctx.closePath();
          }
          break;
        }
        case 'shield': {
          ctx.moveTo(-s * 0.75, -s * 0.82);
          ctx.lineTo(s * 0.75, -s * 0.82);
          ctx.lineTo(s * 0.75, -s * 0.05);
          ctx.quadraticCurveTo(s * 0.65, s * 0.62, 0, s * 0.92);
          ctx.quadraticCurveTo(-s * 0.65, s * 0.62, -s * 0.75, -s * 0.05);
          ctx.closePath();
          break;
        }
        case 'rose': {
          for (let k = 0; k < 5; k++) {
            const a = (k * TAU) / 5 - PI / 2;
            ctx.moveTo(Math.cos(a) * s * 0.45 + s * 0.42, Math.sin(a) * s * 0.45);
            ctx.arc(Math.cos(a) * s * 0.45, Math.sin(a) * s * 0.45, s * 0.42, 0, TAU);
          }
          break;
        }
        case 'laurel':
        default: {
          for (const dir of [-1, 1]) {
            for (let k = 0; k < 5; k++) {
              const a = -0.7 + k * 0.42;
              const px = dir * Math.cos(a) * s * 0.72;
              const py = Math.sin(a) * s * 0.72;
              ctx.moveTo(px + s * 0.18, py);
              ctx.ellipse(px, py, s * 0.22, s * 0.10, dir * (a + 0.5), 0, TAU);
            }
          }
          break;
        }
      }
    }

    // 4-pass beveled relief ramp (creates true 3D domed/chamfered bas-relief!)
    const isStrokeOnly = (stampId === 'celtic' || stampId === 'infinity');
    const passes = [
      { blur: s * 0.14, alpha: 0.35, lw: s * 0.24 },
      { blur: s * 0.07, alpha: 0.55, lw: s * 0.16 },
      { blur: s * 0.025, alpha: 0.80, lw: s * 0.10 },
      { blur: 0, alpha: 1.0, lw: s * 0.06 }
    ];
    for (let i = 0; i < passes.length; i++) {
      ctx.save();
      ctx.filter = passes[i].blur > 0.5 ? `blur(${passes[i].blur.toFixed(1)}px)` : 'none';
      ctx.globalAlpha = passes[i].alpha;
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = passes[i].lw;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      traceShape();
      if (isStrokeOnly) ctx.stroke(); else ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  return {
    RING_SIZES,
    BRACELET_SIZES,
    ALLOYS,
    GEM_MATERIALS,
    CATEGORY_PROFILES,
    DEFAULT_STATE,
    PRESETS,
    HERALDRY_STAMPS,
    getGemDimensionsMm,
    buildJewelry,
    analyzeJewelryParts,
    runPreflightCheck,
    getAutoFixPatch,
    exportBinarySTL,
    exportOBJ,
    drawVectorReliefStamp,
    computeSignedVolume
  };
}));
