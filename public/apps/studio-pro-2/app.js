/**
 * Studio Pro 2 — 22-Studio Real-Time 4D Creative & Watertight CAD Application Controller
 */
(function () {
  'use strict';

  const C = window.SP2Core;
  const ENGINES = Object.assign({}, window.SP2Creative, window.SP2MathCad);
  if (!C || !ENGINES.builder) {
    console.error('[StudioPro2] Core engines missing');
    return;
  }
  const $ = (id) => document.getElementById(id);

  /* =========================================================================
     1. CATALOG OF ALL 22 STUDIOS IN 4 CLEAR WORKSHOPS
  ========================================================================= */
  const CATALOG = [
    // Workshop 1: Game, UI, 2.5D & Neon Design (6)
    { id: 'builder',    ws: 'design', ico: '🎮', en: 'Voxel Game Builder',     fr: 'Monde Voxel 3D',          tagEn: '4 Biomes + Image · Color GLB',    tagFr: '4 Biomes + Image · GLB Couleur' },
    { id: 'ui_asset',   ws: 'design', ico: '💎', en: '3D UI Asset & Badge',    fr: 'Asset UI & Badge 3D',     tagEn: '9 Shapes · Glass/Clay · Logo',    tagFr: '9 Formes · Verre/Argile · Logo' },
    { id: 'parallax',   ws: 'design', ico: '🖼️', en: '2.5D Parallax Shadowbox',fr: 'Shadowbox Parallaxe 2.5D',tagEn: '4 Depth Layers · Printable Frame',tagFr: '4 Plans Profondeur · Cadre 3D' },
    { id: 'typography', ws: 'design', ico: '🔠', en: 'Unicode 3D Typography',  fr: 'Typographie 3D Unicode',  tagEn: 'Accents · Curved · Stand Base',   tagFr: 'Accents · Courbé · Socle' },
    { id: 'neon',       ws: 'design', ico: '⚡', en: 'Neon FX Sign Studio',    fr: 'Enseigne Néon FX',        tagEn: 'GPU Bloom · Acrylic + Standoffs', tagFr: 'Bloom GPU · Acrylique + Fixations' },
    { id: 'mosaic',     ws: 'design', ico: '🧱', en: '3D Mosaic & Brick Art',  fr: 'Mosaïque & Briques 3D',   tagEn: '4 Artworks + Image · Studs',      tagFr: '4 Œuvres + Image · Briques' },

    // Workshop 2: 4D Generative Art, Nature & Math (6)
    { id: 'organic',    ws: 'art4d',  ico: '🧬', en: '4D Organic Sculpt',      fr: 'Sculpture Organique 4D',  tagEn: 'Live FBM/Ridged Morph · Freeze',  tagFr: 'Morphing FBM Live · Figer STL' },
    { id: 'wave',       ws: 'art4d',  ico: '🌊', en: '4D Wave Ocean',          fr: 'Océan 4D Animé',          tagEn: 'Live Gerstner Swell · Solid Base',tagFr: 'Houle Live · Socle Étanche' },
    { id: 'galaxy',     ws: 'art4d',  ico: '🌌', en: '4D Spiral Galaxy',       fr: 'Galaxie Spirale 4D',      tagEn: 'Starfield + Printable Sculpture', tagFr: 'Étoiles 4D + Sculpture 3D' },
    { id: 'terrain',    ws: 'art4d',  ico: '🗻', en: 'FBM 3D Terrain',         fr: 'Relief & Terrain FBM',    tagEn: 'Alpine · Volcano · Canyon · Map', tagFr: 'Alpin · Volcan · Canyon · Carte' },
    { id: 'fractal',    ws: 'art4d',  ico: '❄️', en: '3D Math Fractals',       fr: 'Fractales 3D Réelles',    tagEn: 'Menger · Sierpinski · Koch · Tree',tagFr: 'Menger · Sierpinski · Koch · Arbre' },
    { id: 'polyhedra',  ws: 'art4d',  ico: '🎲', en: 'Polyhedra & Geodesics',  fr: 'Polyèdres & Géodésiques', tagEn: 'Real C60 Buckyball · Strut Frame',tagFr: 'Vrai C60 · Structure Filaire 3D' },

    // Workshop 3: Printables, QR, Jewels & Craft (5)
    { id: 'qrcode',     ws: 'craft',  ico: '🎯', en: 'QR Code 3D Plaque',      fr: 'Plaque Code QR 3D',       tagEn: 'Solid Base · Wi-Fi/URL · Keyring',tagFr: 'Base Solide · Wi-Fi/URL · Anneau' },
    { id: 'diamond',    ws: 'craft',  ico: '💠', en: 'Faceted Crystal Gem',    fr: 'Diamant & Gemme 3D',      tagEn: '57-Facet Brilliant · Emerald',    tagFr: 'Brillant 57 Facettes · Émeraude' },
    { id: 'chain',      ws: 'craft',  ico: '🔗', en: 'Articulated Chain Link', fr: 'Chaîne Articulée 3D',     tagEn: 'Cable · Cuban · Anchor · Gap OK', tagFr: 'Forçat · Cubaine · Print-in-Place' },
    { id: 'mandala',    ws: 'craft',  ico: '🌸', en: 'Solid-Backed Mandala',   fr: 'Mandala 3D Multistrates', tagEn: '6 Motifs · Real Laser SVG mm',    tagFr: '6 Motifs · SVG Laser Réel mm' },
    { id: 'vase',       ws: 'craft',  ico: '🏺', en: 'Hollow Potter Vase',     fr: 'Vase Poterie Creux',      tagEn: '5 Profiles · Real Wall Cavity',   tagFr: '5 Profils · Paroi Étanche' },

    // Workshop 4: TPMS Lattices & Parametric CAD (5)
    { id: 'lattice',    ws: 'cad',    ico: '🔷', en: 'TPMS & Infill Lattice',  fr: 'Treillis TPMS & Gyroïde', tagEn: 'Real Gyroid · Schwarz-P · Octet', tagFr: 'Vrai Gyroïde · Schwarz-P · Octet' },
    { id: 'gear',       ws: 'cad',    ico: '⚙️', en: 'Involute Gear Lab',      fr: 'Engrenage Évolvente',     tagEn: 'ISO 53 · Helical · Twin Mesh 4D', tagFr: 'ISO 53 · Hélicoïdal · Paire 4D' },
    { id: 'sprocket',   ws: 'cad',    ico: '⛓️', en: 'Roller Chain Sprocket',  fr: 'Pignon de Chaîne',        tagEn: 'ISO 606 Pockets · Vector SVG',    tagFr: 'ISO 606 · SVG Vectoriel' },
    { id: 'bracket',    ws: 'cad',    ico: '🔩', en: 'Gusseted Bracket',       fr: 'Équerre Renforcée',       tagEn: 'L / U / T · Real Through-Bores',  tagFr: 'L / U / T · Trous Réels' },
    { id: 'spring',     ws: 'cad',    ico: '🌀', en: 'Watertight Coil Spring', fr: 'Ressort Hélicoïdal',      tagEn: 'Compression · Conical · Capped',  tagFr: 'Compression · Conique · Fermé' }
  ];

  /* =========================================================================
     2. DEFAULTS, PRESETS & PARAMETER SCHEMAS FOR ALL 22 STUDIOS
  ========================================================================= */
  const DEFAULTS = {
    builder:    { biome: 'island', gridSize: 22, maxHeight: 28, sizeMm: 96, seed: 42, useUploadedImage: false },
    ui_asset:   { shape: 'roundBox', size: 64, thickness: 10, bevel: 2.0, badgeText: '★ PRO', reliefHeight: 2.8, useUploadedImage: false },
    parallax:   { scene: 'skyline', width: 110, height: 76, depthSep: 8 },
    typography: { line1: 'STUDIO 4D', line2: 'CRÉATION ★', widthMm: 110, depthMm: 12, curveDeg: 0, stand: true },
    neon:       { text: 'NEON 4D', subtext: 'STUDIO', widthMm: 120, tubeDepth: 6.5, neonColor: '#00f3ff', glow: 2.2, backboard: true },
    mosaic:     { artwork: 'sunset', resolution: 22, sizeMm: 96, reliefHeight: 4.5, tileShape: 'stud', gap: 0.12, useUploadedImage: false },
    organic:    { shape: 'sphere', noiseMode: 'fbm', noiseScale: 2.4, displacement: 5.5, radius: 26, resolution: 44 },
    wave:       { waveMode: 'ocean', sizeMm: 100, amplitude: 7.5, frequency: 3.2, resolution: 52, baseHeight: 6.0 },
    galaxy:     { galaxyMode: 'sculpture', arms: 3, radius: 46, twist: 2.8, starCount: 3200, starSize: 1.2 },
    terrain:    { preset: 'alpine', sizeMm: 110, amplitude: 26, complexity: 2.4, resolution: 56, seed: 17 },
    mandala:    { arms: 10, rings: 4, radius: 52, thickness: 3.2, twist: 14, motif: 'petal', backingDisc: true },
    fractal:    { fractalType: 'menger', iterations: 2, size: 64, branchAngle: 38 },
    polyhedra:  { shape: 'c60', style: 'struts', radius: 32, strutRadius: 1.8 },
    qrcode:     { qrMode: 'url', text: 'https://studios-pro.com', wifiSsid: 'StudiosPro_WiFi', wifiPass: 'Welcome2026', sizeMm: 84, baseThick: 2.6, dotHeight: 1.6, keychain: true },
    diamond:    { cut: 'brilliant', diameter: 34, tableRatio: 0.56, pavilionDepth: 0.44 },
    chain:      { chainStyle: 'cable', links: 6, linkLength: 22, linkWidth: 12, wireRadius: 2.0, clearance: 0.8 },
    vase:       { profile: 'amphora', height: 105, baseRadius: 26, wallThick: 3.2, twistDeg: 75, flutes: 14, fluteDepth: 2.2 },
    lattice:    { pattern: 'gyroid', size: 48, periods: 1.6, wallThick: 0.42, resolution: 18, height: 18 },
    gear:       { teeth: 20, module: 2.2, thickness: 10, pressureAngle: 20, boreDiam: 8, helixAngle: 0, showTwin: true, twinTeeth: 12 },
    sprocket:   { teeth: 18, pitch: 9.525, thickness: 5.0, boreDiam: 12 },
    bracket:    { shape: 'L', width: 44, height: 44, depth: 28, thickness: 5.0, boltHoles: true, holeDiam: 5.4 },
    spring:     { springMode: 'compression', turns: 7, coilRadius: 16, wireRadius: 1.8, length: 52 }
  };

  const PRESETS = {
    builder:    [{ l:'🏝️ Island', v:{biome:'island',seed:42}}, { l:'🏰 Castle', v:{biome:'castle'}}, { l:'🌆 Cyber City', v:{biome:'cyber',seed:7}}, { l:'🏔️ Alpine', v:{biome:'alpine',seed:19}}],
    ui_asset:   [{ l:'★ Pro Tile', v:{shape:'roundBox',badgeText:'★ PRO'}}, { l:'💖 Heart Badge', v:{shape:'heart',badgeText:'LOVE'}}, { l:'🛡️ Shield', v:{shape:'shield',badgeText:'VIP'}}, { l:'💊 Pill', v:{shape:'capsule',badgeText:'PLAY ▶'}}],
    parallax:   [{ l:'🌆 Neon Skyline', v:{scene:'skyline'}}, { l:'🌙 Mountain Moon', v:{scene:'mountain'}}, { l:'🌀 Sacred Portal', v:{scene:'portal'}}],
    typography: [{ l:'Straight Stand', v:{line1:'STUDIO 4D',line2:'CRÉATION ★',curveDeg:0,stand:true}}, { l:'Arched Crest', v:{line1:'STUDIOS PRO',line2:'',curveDeg:75,stand:true}}],
    neon:       [{ l:'⚡ Cyan 4D', v:{text:'NEON 4D',subtext:'STUDIO',neonColor:'#00f3ff'}}, { l:'💖 Pink Synth', v:{text:'CYBER ★',subtext:'OPEN 24/7',neonColor:'#ff2e93'}}, { l:'✨ Gold Luxe', v:{text:'ATELIER',subtext:'PARIS',neonColor:'#fbbf24'}}],
    mosaic:     [{ l:'🌅 Pop Sunset', v:{artwork:'sunset',tileShape:'stud'}}, { l:'💖 Retro Heart', v:{artwork:'heart',tileShape:'box'}}, { l:'🌈 Color Prism', v:{artwork:'prism',tileShape:'pebble'}}, { l:'🌊 Wave Tiles', v:{artwork:'wave',tileShape:'stud'}}],
    organic:    [{ l:'🧬 FBM Blob', v:{shape:'sphere',noiseMode:'fbm',displacement:6}}, { l:'🔥 Ridged Knot', v:{shape:'knot',noiseMode:'ridged',displacement:4.5}}, { l:'💎 Crystal Torus', v:{shape:'torus',noiseMode:'ripple',displacement:4}}],
    wave:       [{ l:'🌊 Ocean Swell', v:{waveMode:'ocean',amplitude:7.5}}, { l:'💧 Drop Ripple', v:{waveMode:'ripple',amplitude:9.5}}, { l:'📡 Interference', v:{waveMode:'interference',amplitude:7}}],
    galaxy:     [{ l:'🪐 Orbital 3D', v:{galaxyMode:'sculpture',arms:3}}, { l:'💿 Relief Disc', v:{galaxyMode:'relief',arms:4}}, { l:'✨ 5-Arm Vortex', v:{galaxyMode:'sculpture',arms:5,twist:3.6}}],
    terrain:    [{ l:'🏔️ Alpine', v:{preset:'alpine'}}, { l:'🌋 Volcano', v:{preset:'volcano'}}, { l:'🏜️ Canyon', v:{preset:'canyon'}}, { l:'🗺️ Contours', v:{preset:'contour'}}],
    mandala:    [{ l:'🌸 Lotus 10', v:{motif:'petal',arms:10,rings:4}}, { l:'⭐ Sacred Star', v:{motif:'star',arms:12,rings:4}}, { l:'💎 Crystal 8', v:{motif:'crystal',arms:8,rings:5}}],
    fractal:    [{ l:'🧊 Menger Sponge', v:{fractalType:'menger',iterations:2}}, { l:'🔺 Sierpinski', v:{fractalType:'sierpinski',iterations:2}}, { l:'❄️ Koch Crystal', v:{fractalType:'koch',iterations:3}}, { l:'🌳 Coral Tree', v:{fractalType:'tree',iterations:2}}],
    polyhedra:  [{ l:'⚽ C60 Struts', v:{shape:'c60',style:'struts'}}, { l:'⚽ C60 Solid', v:{shape:'c60',style:'solid'}}, { l:'🌟 Stellated', v:{shape:'stellated',style:'solid'}}, { l:'🎲 Dodeca Struts', v:{shape:'dodeca',style:'struts'}}],
    qrcode:     [{ l:'🌐 URL Plaque', v:{qrMode:'url',text:'https://studios-pro.com'}}, { l:'📶 Wi-Fi Card', v:{qrMode:'wifi',wifiSsid:'StudiosPro_Guest'}}],
    diamond:    [{ l:'💎 57-Facet Round', v:{cut:'brilliant'}}, { l:'🟩 Emerald Cut', v:{cut:'emerald'}}, { l:'🔷 Princess', v:{cut:'princess'}}, { l:'💧 Pear Teardrop', v:{cut:'pear'}}],
    chain:      [{ l:'🔗 Cable Chain', v:{chainStyle:'cable',links:6}}, { l:'✨ Cuban Curb', v:{chainStyle:'cuban',links:7}}, { l:'⚓ Anchor Bar', v:{chainStyle:'anchor',links:5}}],
    vase:       [{ l:'🏺 Amphora', v:{profile:'amphora',flutes:14}}, { l:'⏳ Hourglass', v:{profile:'hourglass',twistDeg:120}}, { l:'🌀 Fibonacci', v:{profile:'fibonacci',flutes:18}}],
    lattice:    [{ l:'🔷 TPMS Gyroid', v:{pattern:'gyroid',periods:1.6}}, { l:'⚪ Schwarz-P', v:{pattern:'schwarzP',periods:1.6}}, { l:'💠 Schwarz-D', v:{pattern:'diamond',periods:1.4}}, { l:'🏗️ Octet Truss', v:{pattern:'octet'}}, { l:'🍯 Honeycomb', v:{pattern:'hex'}}],
    gear:       [{ l:'⚙️ Twin Spur 20:12', v:{teeth:20,twinTeeth:12,helixAngle:0,showTwin:true}}, { l:'🌀 Helical Pair', v:{teeth:20,twinTeeth:14,helixAngle:22,showTwin:true}}],
    sprocket:   [{ l:'ANSI #35 18T', v:{teeth:18,pitch:9.525}}, { l:'Bicycle 24T', v:{teeth:24,pitch:12.7}}],
    bracket:    [{ l:'L-Gusseted', v:{shape:'L'}}, { l:'U-Channel', v:{shape:'U'}}, { l:'T-Plate', v:{shape:'T'}}],
    spring:     [{ l:'Compression', v:{springMode:'compression'}}, { l:'Conical', v:{springMode:'conical'}}, { l:'Wave Coil', v:{springMode:'wave'}}]
  };

  const SCHEMAS = {
    builder: [
      { k:'biome', t:'sel', en:'Voxel World Biome', fr:'Biome Voxel', opts:[['island','Archipelago Island','Île Archipel'],['castle','Medieval Voxel Castle','Château Voxel'],['cyber','Cyberpunk Skyline','Cité Cyber'],['alpine','Alpine Snow Peaks','Sommets Alpins'],['image','Uploaded Image','Image Importée']] },
      { k:'gridSize', t:'rng', en:'Grid Resolution', fr:'Résolution Grille', min:10, max:36, step:2 },
      { k:'maxHeight', t:'rng', en:'Elevation Height mm', fr:'Hauteur Relief mm', min:8, max:60, step:2 },
      { k:'sizeMm', t:'rng', en:'Board Size mm', fr:'Taille Plateau mm', min:50, max:160, step:4 },
      { k:'seed', t:'rng', en:'World Seed', fr:'Graine Aléatoire', min:1, max:999, step:1 }
    ],
    ui_asset: [
      { k:'shape', t:'sel', en:'Base Silhouette', fr:'Forme de Base', opts:[['roundBox','Rounded Tile','Tuile Arrondie'],['cylinder','Coin Disc','Disque'],['hexagon','Hexagon','Hexagone'],['octagon','Octagon','Octogone'],['star','5-Point Star','Étoile'],['heart','Heart Badge','Cœur'],['shield','Heraldic Shield','Bouclier'],['capsule','Capsule Pill','Pilule'],['triangle','Triangle','Triangle']] },
      { k:'badgeText', t:'txt', en:'Emblem / Unicode Text', fr:'Texte / Symbole' },
      { k:'size', t:'rng', en:'Width / Ø mm', fr:'Taille mm', min:28, max:120, step:2 },
      { k:'thickness', t:'rng', en:'Thickness mm', fr:'Épaisseur mm', min:4, max:24, step:1 },
      { k:'bevel', t:'rng', en:'Edge Chamfer mm', fr:'Chanfrein mm', min:0, max:5, step:0.2 },
      { k:'reliefHeight', t:'rng', en:'Emblem Relief mm', fr:'Relief Symbole mm', min:0.8, max:8, step:0.2 },
      { k:'useUploadedImage', t:'chk', en:'Use Uploaded Logo Instead', fr:'Utiliser Logo Importé' }
    ],
    parallax: [
      { k:'scene', t:'sel', en:'4-Layer Art Scene', fr:'Scène 4 Plans', opts:[['skyline','Neon Cyber Skyline','Horizon Cyber Néon'],['mountain','Alpine Moon Valley','Vallée Lunaire'],['portal','Sacred Portal Rings','Portail Sacré']] },
      { k:'width', t:'rng', en:'Frame Width mm', fr:'Largeur Cadre mm', min:60, max:160, step:4 },
      { k:'height', t:'rng', en:'Frame Height mm', fr:'Hauteur Cadre mm', min:44, max:120, step:4 },
      { k:'depthSep', t:'rng', en:'Layer Separation mm', fr:'Écartement Plans mm', min:3, max:18, step:1 }
    ],
    typography: [
      { k:'line1', t:'txt', en:'Line 1 (Unicode)', fr:'Ligne 1 (Unicode)' },
      { k:'line2', t:'txt', en:'Line 2 (Optional)', fr:'Ligne 2 (Optionnel)' },
      { k:'widthMm', t:'rng', en:'Total Width mm', fr:'Largeur Totale mm', min:50, max:180, step:4 },
      { k:'depthMm', t:'rng', en:'Extrusion Depth mm', fr:'Profondeur mm', min:3, max:30, step:1 },
      { k:'curveDeg', t:'rng', en:'Arc Curvature (°)', fr:'Courbure Arc (°)', min:0, max:120, step:5 },
      { k:'stand', t:'chk', en:'Include Standing Plinth', fr:'Inclure Socle de Base' }
    ],
    neon: [
      { k:'text', t:'txt', en:'Neon Headline', fr:'Texte Néon' },
      { k:'subtext', t:'txt', en:'Sub-Line (Optional)', fr:'Sous-Texte' },
      { k:'neonColor', t:'col', en:'Neon Tube Color', fr:'Couleur Tube Néon' },
      { k:'glow', t:'rng', en:'Bloom Emissive Power', fr:'Intensité Bloom', min:0.5, max:4.5, step:0.1 },
      { k:'widthMm', t:'rng', en:'Sign Width mm', fr:'Largeur Enseigne mm', min:60, max:180, step:4 },
      { k:'tubeDepth', t:'rng', en:'Tube Relief mm', fr:'Relief Tube mm', min:3, max:14, step:0.5 },
      { k:'backboard', t:'chk', en:'Acrylic Backing + Wall Standoffs', fr:'Plaque Acrylique + Entretoises' }
    ],
    mosaic: [
      { k:'artwork', t:'sel', en:'Built-in Artwork', fr:'Modèle Artistique', opts:[['sunset','Pop Synth Sunset','Coucher de Soleil'],['heart','Retro Pixel Heart','Cœur Pixel'],['prism','Chromatic Prism','Prisme Chromatique'],['wave','Ocean Mosaic','Vague Mosaïque'],['image','Uploaded Photo','Photo Importée']] },
      { k:'tileShape', t:'sel', en:'Tile Geometry', fr:'Forme des Tuiles', opts:[['stud','LEGO Brick Studs','Briques à Tenons'],['box','Square Mosaic','Mosaïque Carrée'],['pebble','Round Pebbles','Galets Ronds']] },
      { k:'resolution', t:'rng', en:'Tile Grid (N×N)', fr:'Grille (N×N)', min:12, max:34, step:2 },
      { k:'sizeMm', t:'rng', en:'Plaque Size mm', fr:'Taille Plaque mm', min:50, max:160, step:4 },
      { k:'reliefHeight', t:'rng', en:'Relief Height mm', fr:'Hauteur Relief mm', min:1.5, max:12, step:0.5 },
      { k:'gap', t:'rng', en:'Tile Grout Gap', fr:'Espace Joints', min:0, max:0.3, step:0.04 }
    ],
    organic: [
      { k:'shape', t:'sel', en:'Base Topology', fr:'Forme de Base', opts:[['sphere','Organic Sphere','Sphère Organique'],['torus','Sculpted Torus','Tore Sculpté'],['knot','Trefoil Torus Knot','Nœud Torique'],['capsule','Monolith Capsule','Capsule'],['crystal','Faceted Crystal','Cristal']] },
      { k:'noiseMode', t:'sel', en:'4D Morph Field', fr:'Champ 4D', opts:[['fbm','3D/4D FBM Fluid','Fluide FBM 4D'],['ridged','Ridged Coral Veins','Crêtes Corail'],['ripple','Harmonic Ripples','Ondes Harmoniques']] },
      { k:'noiseScale', t:'rng', en:'Fold Frequency', fr:'Fréquence Plis', min:0.6, max:6.5, step:0.2 },
      { k:'displacement', t:'rng', en:'Morph Amplitude mm', fr:'Amplitude Morphing mm', min:0, max:14, step:0.5 },
      { k:'radius', t:'rng', en:'Radius mm', fr:'Rayon mm', min:14, max:48, step:2 },
      { k:'resolution', t:'rng', en:'Mesh Resolution', fr:'Résolution Maillage', min:20, max:64, step:4 }
    ],
    wave: [
      { k:'waveMode', t:'sel', en:'Wave Physics', fr:'Physique des Vagues', opts:[['ocean','Gerstner Ocean Swell','Houle Océanique'],['ripple','Concentric Drop Ripple','Ondes Concentriques'],['interference','Dual-Source Interference','Interférence Double']] },
      { k:'amplitude', t:'rng', en:'Wave Amplitude mm', fr:'Amplitude Vagues mm', min:2, max:18, step:0.5 },
      { k:'frequency', t:'rng', en:'Wave Frequency', fr:'Fréquence', min:1.0, max:8.0, step:0.2 },
      { k:'sizeMm', t:'rng', en:'Plinth Width mm', fr:'Largeur Socle mm', min:50, max:160, step:5 },
      { k:'baseHeight', t:'rng', en:'Solid Base Depth mm', fr:'Épaisseur Socle mm', min:3, max:16, step:1 },
      { k:'resolution', t:'rng', en:'Grid Resolution', fr:'Résolution', min:24, max:76, step:4 }
    ],
    galaxy: [
      { k:'galaxyMode', t:'sel', en:'Printable 3D Form', fr:'Forme 3D Imprimable', opts:[['sculpture','3D Orbital Sculpture','Sculpture Orbitale 3D'],['relief','Spiral Relief Medallion','Médaillon Relief Spirale']] },
      { k:'arms', t:'rng', en:'Spiral Arms', fr:'Bras Spiraux', min:2, max:6, step:1 },
      { k:'radius', t:'rng', en:'Galaxy Radius mm', fr:'Rayon Galaxie mm', min:24, max:80, step:2 },
      { k:'twist', t:'rng', en:'Spiral Winding', fr:'Enroulement', min:1.2, max:5.0, step:0.2 },
      { k:'starCount', t:'rng', en:'4D Starfield Particles', fr:'Étoiles 4D', min:500, max:8000, step:500 }
    ],
    terrain: [
      { k:'preset', t:'sel', en:'Geological Biome', fr:'Biome Géologique', opts:[['alpine','Alpine Snow Ridges','Crêtes Alpines'],['volcano','Volcanic Crater','Cratère Volcanique'],['canyon','Mesa River Canyon','Canyon & Mesas'],['island','Tropical Island','Île Tropicale'],['contour','Stepped Contour Map','Carte en Courbes']] },
      { k:'sizeMm', t:'rng', en:'Map Size mm', fr:'Taille Carte mm', min:50, max:160, step:5 },
      { k:'amplitude', t:'rng', en:'Peak Altitude mm', fr:'Altitude Pics mm', min:6, max:55, step:2 },
      { k:'complexity', t:'rng', en:'Noise Complexity', fr:'Complexité Relief', min:0.8, max:5.5, step:0.2 },
      { k:'seed', t:'rng', en:'Terrain Seed', fr:'Graine Aléatoire', min:1, max:999, step:1 }
    ],
    mandala: [
      { k:'motif', t:'sel', en:'Sacred Motif', fr:'Motif Sacré', opts:[['petal','Lotus Petals','Pétales Lotus'],['star','Star Points','Étoiles'],['diamond','Faceted Diamonds','Losanges'],['crystal','Crystal Prisms','Prismes Cristal'],['heart','Sacred Hearts','Cœurs'],['ring','Concentric Rings','Anneaux']] },
      { k:'arms', t:'rng', en:'Symmetry Fold', fr:'Symétrie (Bras)', min:4, max:20, step:1 },
      { k:'rings', t:'rng', en:'Concentric Rings', fr:'Anneaux', min:1, max:6, step:1 },
      { k:'radius', t:'rng', en:'Outer Radius mm', fr:'Rayon Extérieur mm', min:24, max:85, step:2 },
      { k:'thickness', t:'rng', en:'Relief Height mm', fr:'Hauteur Relief mm', min:1.5, max:10, step:0.5 },
      { k:'twist', t:'rng', en:'Spiral Offset (°)', fr:'Décalage Spirale (°)', min:-45, max:45, step:2 },
      { k:'backingDisc', t:'chk', en:'Solid Backing Disc (Printable)', fr:'Disque de Base Solide' }
    ],
    fractal: [
      { k:'fractalType', t:'sel', en:'3D Fractal Type', fr:'Type de Fractale 3D', opts:[['menger','3D Menger Sponge','Éponge de Menger 3D'],['sierpinski','Sierpinski Pyramid','Pyramide Sierpinski'],['koch','3D Koch Crystal','Cristal de Koch 3D'],['tree','Recursive Botanical Tree','Arbre Fractal 3D']] },
      { k:'iterations', t:'rng', en:'Recursion Depth', fr:'Profondeur', min:1, max:3, step:1 },
      { k:'size', t:'rng', en:'Size mm', fr:'Taille mm', min:30, max:110, step:4 },
      { k:'branchAngle', t:'rng', en:'Branch Angle (°)', fr:'Angle Branches (°)', min:18, max:65, step:2, showIf: (v) => v.fractalType === 'tree' }
    ],
    polyhedra: [
      { k:'shape', t:'sel', en:'Polyhedron Family', fr:'Famille Polyèdre', opts:[['c60','Real C60 Buckyball (60V/32F)','Vrai Buckyball C60'],['icosa','Icosahedron (20F)','Icosaèdre (20F)'],['dodeca','Dodecahedron (12F)','Dodécaèdre (12F)'],['stellated','Stellated Star Polyhedron','Étoile Stellée'],['octa','Octahedron (8F)','Octaèdre (8F)'],['cube','Hexahedron Cube','Cube'],['tetra','Tetrahedron (4F)','Tétraèdre (4F)']] },
      { k:'style', t:'sel', en:'Construction Mode', fr:'Mode Construction', opts:[['struts','Hollow Printable Strut Frame','Structure Filaire 3D'],['solid','Solid Faceted Polyhedron','Polyèdre Facetté Solide']] },
      { k:'radius', t:'rng', en:'Radius mm', fr:'Rayon mm', min:16, max:65, step:2 },
      { k:'strutRadius', t:'rng', en:'Strut Beam Radius mm', fr:'Rayon Barres mm', min:0.9, max:4.2, step:0.2, showIf: (v) => v.style === 'struts' }
    ],
    qrcode: [
      { k:'qrMode', t:'sel', en:'QR Payload Type', fr:'Type de Contenu', opts:[['url','URL / Custom Text','URL / Texte Libre'],['wifi','Wi-Fi Auto-Connect','Connexion Wi-Fi']] },
      { k:'text', t:'txt', en:'URL or Text', fr:'URL ou Texte', showIf: (v) => v.qrMode === 'url' },
      { k:'wifiSsid', t:'txt', en:'Wi-Fi Network (SSID)', fr:'Réseau Wi-Fi (SSID)', showIf: (v) => v.qrMode === 'wifi' },
      { k:'wifiPass', t:'txt', en:'Wi-Fi Password', fr:'Mot de passe Wi-Fi', showIf: (v) => v.qrMode === 'wifi' },
      { k:'sizeMm', t:'rng', en:'Plaque Size mm', fr:'Taille Plaque mm', min:48, max:140, step:4 },
      { k:'baseThick', t:'rng', en:'Base Thickness mm', fr:'Épaisseur Base mm', min:1.6, max:6.0, step:0.2 },
      { k:'dotHeight', t:'rng', en:'QR Relief Height mm', fr:'Hauteur Relief QR mm', min:0.8, max:4.0, step:0.2 },
      { k:'keychain', t:'chk', en:'Include Keyring Hole', fr:'Inclure Trou Porte-Clés' }
    ],
    diamond: [
      { k:'cut', t:'sel', en:'Gem Cut Standard', fr:'Taille de Gemme', opts:[['brilliant','57-Facet Round Brilliant','Brillant Rond 57 Facettes'],['emerald','Emerald Step-Cut','Taille Émeraude'],['princess','Princess Square','Taille Princesse'],['pear','Pear Teardrop','Taille Poire']] },
      { k:'diameter', t:'rng', en:'Girdle Diameter mm', fr:'Diamètre Rondiste mm', min:14, max:70, step:2 },
      { k:'tableRatio', t:'rng', en:'Table Width Ratio', fr:'Ratio Table', min:0.40, max:0.75, step:0.02 },
      { k:'pavilionDepth', t:'rng', en:'Pavilion Depth Ratio', fr:'Profondeur Culasse', min:0.30, max:0.62, step:0.02 }
    ],
    chain: [
      { k:'chainStyle', t:'sel', en:'Link Architecture', fr:'Style de Maillon', opts:[['cable','Classic Oval Cable','Chaîne Forçat Ovale'],['cuban','Cuban Curb Twist','Maille Cubaine'],['anchor','Anchor Stud-Link','Chaîne Marine']] },
      { k:'links', t:'rng', en:'Link Count', fr:'Nombre de Maillons', min:2, max:14, step:1 },
      { k:'linkLength', t:'rng', en:'Link Length mm', fr:'Longueur Maillon mm', min:14, max:40, step:1 },
      { k:'linkWidth', t:'rng', en:'Link Width mm', fr:'Largeur Maillon mm', min:8, max:24, step:1 },
      { k:'wireRadius', t:'rng', en:'Wire Radius mm', fr:'Rayon Fil mm', min:1.0, max:4.0, step:0.2 },
      { k:'clearance', t:'rng', en:'Print-in-Place Gap mm', fr:'Jeu Print-in-Place mm', min:0.4, max:2.4, step:0.2 }
    ],
    vase: [
      { k:'profile', t:'sel', en:'Pottery Silhouette', fr:'Silhouette Poterie', opts:[['amphora','Classic Amphora','Amphore Classique'],['hourglass','Hourglass Sculpt','Sablier'],['sinusoidal','Sinusoidal Wave','Sinusoïdal'],['fibonacci','Fibonacci Spiral','Spirale Fibonacci'],['twisted','Minimal Twisted','Torsadé']] },
      { k:'height', t:'rng', en:'Vase Height mm', fr:'Hauteur Vase mm', min:45, max:180, step:5 },
      { k:'baseRadius', t:'rng', en:'Base Radius mm', fr:'Rayon Base mm', min:12, max:50, step:2 },
      { k:'wallThick', t:'rng', en:'Hollow Wall Thick mm', fr:'Épaisseur Paroi mm', min:1.6, max:7.0, step:0.2 },
      { k:'flutes', t:'rng', en:'Vertical Flutes', fr:'Cannelures', min:0, max:28, step:2 },
      { k:'twistDeg', t:'rng', en:'Spiral Twist (°)', fr:'Torsade (°)', min:0, max:240, step:15 }
    ],
    lattice: [
      { k:'pattern', t:'sel', en:'TPMS / Lattice Type', fr:'Type Treillis / TPMS', opts:[['gyroid','TPMS Gyroid (Watertight)','Gyroïde TPMS (Étanche)'],['schwarzP','TPMS Schwarz-P','Schwarz-P TPMS'],['diamond','TPMS Schwarz-Diamond','Diamant TPMS'],['octet','3D Octet-Truss Struts','Treillis Octet 3D'],['hex','Hexagonal Honeycomb','Nid d’Abeille Hexa']] },
      { k:'size', t:'rng', en:'Block Size mm', fr:'Taille Bloc mm', min:26, max:80, step:2 },
      { k:'periods', t:'rng', en:'Unit Cell Repeats', fr:'Répétitions Cellules', min:1.0, max:2.8, step:0.2 },
      { k:'wallThick', t:'rng', en:'Wall / Strut Density', fr:'Épaisseur Paroi / Barres', min:0.24, max:0.75, step:0.04 },
      { k:'resolution', t:'rng', en:'TPMS Voxel Quality', fr:'Qualité TPMS', min:12, max:22, step:2, showIf: (v) => v.pattern === 'gyroid' || v.pattern === 'schwarzP' || v.pattern === 'diamond' }
    ],
    gear: [
      { k:'teeth', t:'rng', en:'Teeth Count (Z)', fr:'Nombre de Dents (Z)', min:8, max:52, step:1 },
      { k:'module', t:'rng', en:'Module (m) mm', fr:'Module (m) mm', min:1.0, max:5.0, step:0.2 },
      { k:'thickness', t:'rng', en:'Thickness mm', fr:'Épaisseur mm', min:3, max:30, step:1 },
      { k:'helixAngle', t:'rng', en:'Helix Angle (°)', fr:'Angle Hélice (°)', min:0, max:28, step:2 },
      { k:'boreDiam', t:'rng', en:'Bore Diameter mm', fr:'Alésage mm', min:0, max:28, step:1 },
      { k:'showTwin', t:'chk', en:'Animated Meshing Twin Pair', fr:'Paire Engrenée Animée' },
      { k:'twinTeeth', t:'rng', en:'Twin Gear Teeth (Z2)', fr:'Dents Pignon (Z2)', min:8, max:40, step:1, showIf: (v) => v.showTwin }
    ],
    sprocket: [
      { k:'teeth', t:'rng', en:'Teeth Count', fr:'Nombre de Dents', min:9, max:42, step:1 },
      { k:'pitch', t:'rng', en:'Chain Pitch mm', fr:'Pas Chaîne mm', min:6.35, max:16, step:0.5 },
      { k:'thickness', t:'rng', en:'Plate Thickness mm', fr:'Épaisseur mm', min:2, max:16, step:0.5 },
      { k:'boreDiam', t:'rng', en:'Center Bore mm', fr:'Alésage mm', min:0, max:32, step:1 }
    ],
    bracket: [
      { k:'shape', t:'sel', en:'Bracket Profile', fr:'Forme Équerre', opts:[['L','L-Bracket (Gusseted)','Équerre L (Renforcée)'],['U','U-Channel','Étrier U'],['T','T-Joining Plate','Plaque T']] },
      { k:'width', t:'rng', en:'Width mm', fr:'Largeur mm', min:22, max:100, step:2 },
      { k:'height', t:'rng', en:'Height mm', fr:'Hauteur mm', min:22, max:100, step:2 },
      { k:'depth', t:'rng', en:'Depth mm', fr:'Profondeur mm', min:16, max:70, step:2 },
      { k:'thickness', t:'rng', en:'Wall Thickness mm', fr:'Épaisseur Paroi mm', min:3, max:12, step:0.5 },
      { k:'boltHoles', t:'chk', en:'Real Perpendicular Bolt Holes', fr:'Trous de Fixation Réels' }
    ],
    spring: [
      { k:'springMode', t:'sel', en:'Coil Geometry', fr:'Type de Ressort', opts:[['compression','Compression Helical','Compression Hélicoïdal'],['conical','Conical Tapered','Conique'],['wave','Harmonic Wave Coil','Ressort Ondulé']] },
      { k:'turns', t:'rng', en:'Turns (Coils)', fr:'Spires', min:2, max:14, step:1 },
      { k:'coilRadius', t:'rng', en:'Coil Radius mm', fr:'Rayon Spire mm', min:8, max:38, step:1 },
      { k:'wireRadius', t:'rng', en:'Wire Radius mm', fr:'Rayon Fil mm', min:0.9, max:4.5, step:0.2 },
      { k:'length', t:'rng', en:'Free Length mm', fr:'Longueur Libre mm', min:20, max:120, step:2 }
    ]
  };

  /* =========================================================================
     3. STATE, LANGUAGE, UNDO/REDO & UNIFIED STUDIOS-PRO BRIDGE
  ========================================================================= */
  function detectLang() {
    const q = new URLSearchParams(window.location.search).get('lang');
    if (q === 'fr' || q === 'en') return q;
    try { const s = localStorage.getItem('sp_lang'); if (s === 'fr' || s === 'en') return s; } catch (_) {}
    return (navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';
  }

  let lang = detectLang();
  let activeWorkshop = 'all';
  let activeStudio = 'builder'; // Voxel Game Builder (Archipelago Island ready on launch!)
  let materialKey = 'auto';
  let themeKey = 'cyber';
  let globalColor = '#38bdf8';
  let uploadedImageBuf = null;
  let params = JSON.parse(JSON.stringify(DEFAULTS));
  let viewport = null;
  let latestBuild = null;
  let rebuildTimer = null;

  function t(en, fr) { return lang === 'fr' ? fr : en; }
  function toast(msg) {
    const el = $('toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 2600);
  }

  // Undo / Redo (25 steps)
  const history = [];
  let histIdx = -1;
  function pushHistory() {
    const snap = JSON.stringify({ activeStudio, materialKey, themeKey, globalColor, params });
    if (histIdx >= 0 && history[histIdx] === snap) return;
    history.splice(histIdx + 1); history.push(snap);
    if (history.length > 25) history.shift();
    histIdx = history.length - 1;
    updateUndoUI();
  }
  function updateUndoUI() { $('btnUndo').disabled = histIdx <= 0; $('btnRedo').disabled = histIdx >= history.length - 1; }
  function restoreSnap(str) {
    const d = JSON.parse(str);
    activeStudio = d.activeStudio; materialKey = d.materialKey; themeKey = d.themeKey; globalColor = d.globalColor; params = d.params;
    $('matSelect').value = materialKey; $('themeSelect').value = themeKey; $('globalColor').value = globalColor;
    if (viewport) viewport.setTheme(themeKey);
    renderStudioList(); renderPresets(); renderControls(); rebuildNow(true); updateUndoUI();
  }
  function undo() { if (histIdx > 0) restoreSnap(history[--histIdx]); }
  function redo() { if (histIdx < history.length - 1) restoreSnap(history[++histIdx]); }

  // Export Quota & Host Bridge
  const credits = { isPro: false, remaining: 5 };
  try { credits.remaining = Math.max(0, 5 - (parseInt(localStorage.getItem('sp_sp2_exports_used') || '0', 10) || 0)); } catch (_) {}
  function updateCreditsBadge() {
    const b = $('creditsBadge');
    if (credits.isPro) { b.textContent = '✦ PRO'; b.classList.add('pro'); }
    else { b.textContent = t(`${credits.remaining} Free`, `${credits.remaining} Gratuits`); b.classList.remove('pro'); }
  }
  let pendingExportResolve = null;
  window.addEventListener('message', (ev) => {
    const d = ev.data || {};
    if (d.type === 'USER_TIER_STATUS' || d.type === 'PREMIUM_STATUS') {
      credits.isPro = !!(d.isPro || d.isPremium || d.tier === 'pro'); updateCreditsBadge();
    } else if (d.type === 'EXPORT_LIMIT_RESULT' && pendingExportResolve) {
      const fn = pendingExportResolve; pendingExportResolve = null; fn(!!d.allowed);
    } else if (d.type === 'SET_LANG' && (d.lang === 'en' || d.lang === 'fr')) {
      lang = d.lang; applyLanguage();
    }
  });
  function checkExportAllowed() {
    if (credits.isPro) return Promise.resolve(true);
    if (window.parent && window.parent !== window) {
      return new Promise((resolve) => {
        pendingExportResolve = resolve;
        window.parent.postMessage({ type: 'CHECK_EXPORT_LIMIT', studio: 'studio-pro-2' }, '*');
        setTimeout(() => { if (pendingExportResolve === resolve) { pendingExportResolve = null; resolve(consumeLocalCredit()); } }, 700);
      });
    }
    return Promise.resolve(consumeLocalCredit());
  }
  function consumeLocalCredit() {
    if (credits.remaining <= 0) { $('paymentModal').classList.add('open'); return false; }
    credits.remaining--;
    try { localStorage.setItem('sp_sp2_exports_used', String(5 - credits.remaining)); } catch (_) {}
    updateCreditsBadge();
    return true;
  }

  /* =========================================================================
     4. UI RENDERING (22 STUDIOS, PRESETS, CONTROLS, HUD)
  ========================================================================= */
  function populateGlobalSelects() {
    $('matSelect').innerHTML = Object.values(C.MATERIALS).map((m) => `<option value="${m.id}">${t(m.en, m.fr)}</option>`).join('');
    $('matSelect').value = materialKey;
    $('themeSelect').innerHTML = Object.values(C.THEMES).map((th) => `<option value="${th.id}">${t(th.en, th.fr)}</option>`).join('');
    $('themeSelect').value = themeKey;
  }

  function renderStudioList() {
    const q = ($('studioSearch').value || '').trim().toLowerCase();
    const list = $('studioList');
    const items = CATALOG.filter((it) => {
      if (activeWorkshop !== 'all' && it.ws !== activeWorkshop) return false;
      if (!q) return true;
      return (it.en + ' ' + it.fr + ' ' + it.tagEn + ' ' + it.tagFr + ' ' + it.id).toLowerCase().includes(q);
    });
    list.innerHTML = items.map((it) => `
      <button type="button" class="studio-card ${it.id === activeStudio ? 'active' : ''}" data-studio="${it.id}">
        <div class="studio-ico">${it.ico}</div>
        <div class="studio-meta">
          <div class="studio-name">${t(it.en, it.fr)}</div>
          <div class="studio-tag">${t(it.tagEn, it.tagFr)}</div>
        </div>
      </button>`).join('');
    list.querySelectorAll('.studio-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeStudio = btn.dataset.studio;
        renderStudioList(); renderPresets(); renderControls(); rebuildNow(true); pushHistory();
        if (window.innerWidth <= 900) setMobilePane('viewport');
      });
    });
  }

  function renderPresets() {
    const list = PRESETS[activeStudio] || [];
    $('presetsCard').style.display = list.length ? '' : 'none';
    const host = $('presetList');
    host.innerHTML = list.map((pr, idx) => `<button type="button" class="preset-chip" data-pidx="${idx}">${pr.l}</button>`).join('');
    host.querySelectorAll('.preset-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pr = list[Number(btn.dataset.pidx)];
        if (!pr) return;
        params[activeStudio] = Object.assign({}, params[activeStudio], pr.v);
        renderControls(); rebuildNow(true); pushHistory();
      });
    });
  }

  function renderControls() {
    const schema = SCHEMAS[activeStudio] || [];
    const cur = params[activeStudio];
    const host = $('controlsHost');
    host.innerHTML = '';
    for (let i = 0; i < schema.length; i++) {
      const f = schema[i];
      if (f.showIf && !f.showIf(cur)) continue;
      const wrap = document.createElement('div');
      wrap.className = 'ctrl';
      if (f.t === 'rng') {
        wrap.innerHTML = `
          <div class="ctrl-head"><span>${t(f.en, f.fr)}</span><span class="ctrl-val">${cur[f.k]}</span></div>
          <input type="range" class="ctrl-range" value="${cur[f.k]}" min="${f.min}" max="${f.max}" step="${f.step}" />`;
        const rng = wrap.querySelector('input'), valEl = wrap.querySelector('.ctrl-val');
        rng.addEventListener('input', () => {
          cur[f.k] = parseFloat(rng.value); valEl.textContent = cur[f.k]; scheduleRebuild(false);
        });
        rng.addEventListener('change', pushHistory);
      } else if (f.t === 'sel') {
        wrap.innerHTML = `
          <div class="ctrl-head"><span>${t(f.en, f.fr)}</span></div>
          <select class="ctrl-select">${f.opts.map((o) => `<option value="${o[0]}" ${String(cur[f.k]) === String(o[0]) ? 'selected' : ''}>${t(o[1], o[2] || o[1])}</option>`).join('')}</select>`;
        wrap.querySelector('select').addEventListener('change', (e) => {
          cur[f.k] = e.target.value; renderControls(); rebuildNow(false); pushHistory();
        });
      } else if (f.t === 'txt') {
        wrap.innerHTML = `<div class="ctrl-head"><span>${t(f.en, f.fr)}</span></div><input type="text" class="ctrl-text" value="${String(cur[f.k] || '').replace(/"/g, '&quot;')}" />`;
        wrap.querySelector('input').addEventListener('input', (e) => { cur[f.k] = e.target.value; scheduleRebuild(false); });
        wrap.querySelector('input').addEventListener('change', pushHistory);
      } else if (f.t === 'col') {
        wrap.innerHTML = `<div class="ctrl-head"><span>${t(f.en, f.fr)}</span></div><input type="color" class="ctrl-color" value="${cur[f.k] || '#00f3ff'}" />`;
        wrap.querySelector('input').addEventListener('input', (e) => { cur[f.k] = e.target.value; scheduleRebuild(false); });
      } else if (f.t === 'chk') {
        wrap.innerHTML = `<label class="ctrl-check"><span>${t(f.en, f.fr)}</span><input type="checkbox" ${cur[f.k] ? 'checked' : ''} /></label>`;
        wrap.querySelector('input').addEventListener('change', (e) => { cur[f.k] = e.target.checked; renderControls(); rebuildNow(false); pushHistory(); });
      }
      host.appendChild(wrap);
    }
  }

  function updateHUD(build) {
    const it = CATALOG.find((x) => x.id === activeStudio);
    $('activeStudioTitle').textContent = (it ? t(it.en, it.fr) : activeStudio).toUpperCase();
    const st = build.stats, b = st.bounds, pf = st.preflight;
    $('hudStd').textContent = (build.specs && build.specs.standard) || 'WATERTIGHT 1:1 MM';
    $('btnPreflight').textContent = `${pf.score}/100`;
    $('exportDimTag').textContent = `${b.sx.toFixed(1)}×${b.sy.toFixed(1)}×${b.sz.toFixed(1)} mm`;
    const rows = [
      { k: t('Bounds X×Y×Z', 'Cotes X×Y×Z'), v: `${b.sx.toFixed(1)}×${b.sy.toFixed(1)}×${b.sz.toFixed(1)} mm` },
      { k: t('Volume / PLA', 'Volume / PLA'), v: `${st.manifold.volumeCm3.toFixed(1)} cm³ · ${(st.manifold.volumeCm3 * 1.24).toFixed(0)} g` },
      { k: t('Mesh Quality', 'Intégrité 3D'), v: st.manifold.watertight ? `✓ Watertight (${st.manifold.triangles.toLocaleString()} Δ)` : `⚠ ${st.manifold.boundaryEdges} open` }
    ];
    $('hudRows').innerHTML = rows.map((r) => `<div class="hud-row"><span class="hud-k">${r.k}</span><span class="hud-v">${r.v}</span></div>`).join('');
  }

  /* =========================================================================
     5. REBUILD ENGINE + AUTO BLOOM + INSPIRE ME RANDOMIZER
  ========================================================================= */
  function scheduleRebuild(refit) { clearTimeout(rebuildTimer); rebuildTimer = setTimeout(() => rebuildNow(refit), 22); }

  function rebuildNow(refit) {
    const fn = ENGINES[activeStudio];
    if (!fn) return;
    try {
      const raw = fn(params[activeStudio], { imageBuf: uploadedImageBuf, time4D: 0 });
      raw.stats = C.analyzeBuild(raw.parts, raw.specs);
      latestBuild = raw;
      updateHUD(raw);
      if (viewport) {
        viewport.setBuild(raw, { materialKey, globalColor }, !!refit);
        const wantBloom = !!(raw.preferBloom || materialKey === 'neon');
        viewport.setBloom(wantBloom);
        $('btnToggleBloom').classList.toggle('active', wantBloom);
      }
    } catch (err) {
      console.error('[StudioPro2] Build error:', err);
    }
  }

  function inspireMe() {
    const schema = SCHEMAS[activeStudio] || [];
    const cur = params[activeStudio];
    schema.forEach((f) => {
      if (f.t === 'rng') {
        const steps = Math.max(1, Math.round((f.max - f.min) / f.step));
        cur[f.k] = C.round2(f.min + Math.floor(Math.random() * (steps + 1)) * f.step);
      } else if (f.t === 'sel' && f.opts.length > 1) {
        const valid = f.opts.filter((o) => o[0] !== 'image');
        const pick = valid[Math.floor(Math.random() * valid.length)];
        if (pick) cur[f.k] = pick[0];
      }
    });
    renderControls(); rebuildNow(true); pushHistory();
    toast(t('🎲 Randomized creative parameters!', '🎲 Paramètres créatifs générés !'));
  }

  /* =========================================================================
     6. EXPORTS (1:1 mm STL, OBJ, COLOR GLB, TRUE VECTOR SVG, PDF, 4D HTML, WEBM, AR)
  ========================================================================= */
  function dlBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  function baseName() { return `studiopro2_${activeStudio}_${Date.now()}`; }

  async function doExportSTL() {
    if (!latestBuild) return;
    if (!(await checkExportAllowed())) return;
    if (viewport) viewport.freeze4DToBuild();
    dlBlob(new Blob([C.exportBinarySTL(latestBuild.parts)], { type: 'application/octet-stream' }), baseName() + '.stl');
    toast(t('1:1 mm Watertight Binary STL exported!', 'STL Binarisé 1:1 mm étanche exporté !'));
  }

  async function doExportOBJ() {
    if (!latestBuild) return;
    if (!(await checkExportAllowed())) return;
    if (viewport) viewport.freeze4DToBuild();
    dlBlob(new Blob([C.exportOBJ(latestBuild.parts)], { type: 'text/plain' }), baseName() + '.obj');
    toast(t('1:1 mm OBJ exported!', 'OBJ 1:1 mm exporté !'));
  }

  async function doExportGLB() {
    if (!latestBuild || !viewport) return;
    if (!(await checkExportAllowed())) return;
    const blob = await viewport.exportGLB();
    dlBlob(blob, baseName() + '.glb');
    toast(t('1:1 m Color PBR GLB exported!', 'GLB Couleur PBR 1:1 m exporté !'));
  }

  async function doExportSVG() {
    if (!latestBuild) return;
    if (!(await checkExportAllowed())) return;
    const svg = C.exportVectorSVG(latestBuild.draw2D, latestBuild.parts, activeStudio);
    dlBlob(new Blob([svg], { type: 'image/svg+xml' }), baseName() + '.svg');
    toast(t('True 1:1 mm Vector SVG exported!', 'SVG Vectoriel 1:1 mm réel exporté !'));
  }

  async function doExportPDF() {
    if (!latestBuild || !viewport || !window.jspdf) return;
    if (!(await checkExportAllowed())) return;
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('l', 'mm', 'a4');
    const st = latestBuild.stats, b = st.bounds;
    const it = CATALOG.find((x) => x.id === activeStudio);
    pdf.setFillColor(10, 15, 28); pdf.rect(0, 0, 297, 210, 'F');
    pdf.setTextColor(244, 63, 94); pdf.setFontSize(18);
    pdf.text(`Studio Pro 2 — ${it ? it.en : activeStudio}`, 14, 18);
    pdf.setTextColor(203, 213, 225); pdf.setFontSize(10);
    pdf.text(`Exact 1:1 mm Bounds: ${b.sx.toFixed(1)} × ${b.sy.toFixed(1)} × ${b.sz.toFixed(1)} mm  |  Volume: ${st.manifold.volumeCm3.toFixed(1)} cm³  |  Watertight: ${st.manifold.watertight ? 'PASS (0 open edges)' : 'CHECK'}`, 14, 26);
    const png = viewport.capturePNG(true);
    pdf.addImage(png, 'PNG', 14, 34, 269, 162);
    pdf.save(baseName() + '_blueprint.pdf');
    toast(t('Technical Blueprint PDF exported!', 'Fiche Blueprint PDF exportée !'));
  }

  async function doExportHTML() {
    if (!latestBuild || !viewport) return;
    if (!(await checkExportAllowed())) return;
    const glbBlob = await viewport.exportGLB();
    const b64 = await new Promise((res) => { const r = new FileReader(); r.onloadend = () => res(String(r.result).split(',')[1]); r.readAsDataURL(glbBlob); });
    const it = CATALOG.find((x) => x.id === activeStudio);
    const title = it ? it.en : activeStudio;
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — 4D Interactive Showcase | Studios-Pro</title>
<style>body{margin:0;background:#060a14;color:#f8fafc;font-family:Inter,sans-serif;overflow:hidden}#c{width:100vw;height:100vh}.badge{position:fixed;bottom:20px;left:20px;padding:12px 18px;border-radius:12px;background:rgba(13,20,36,0.85);border:1px solid rgba(139,92,246,0.4);font-size:13px;font-weight:700}</style>
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/"}}</script></head>
<body><div id="c"></div><div class="badge">✦ ${title} · Studios-Pro 4D Interactive Showcase</div>
<script type="module">import * as THREE from 'three';import {OrbitControls} from 'three/addons/controls/OrbitControls.js';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
const el=document.getElementById('c');const scene=new THREE.Scene();scene.background=new THREE.Color(0x060a14);
const cam=new THREE.PerspectiveCamera(40,el.clientWidth/el.clientHeight,0.001,100);const ren=new THREE.WebGLRenderer({antialias:true});ren.setSize(el.clientWidth,el.clientHeight);ren.toneMapping=THREE.ACESFilmicToneMapping;el.appendChild(ren.domElement);
const pm=new THREE.PMREMGenerator(ren);scene.environment=pm.fromScene(new RoomEnvironment(),0.04).texture;scene.add(new THREE.HemisphereLight(0xffffff,0x1e293b,0.7));
const dl=new THREE.DirectionalLight(0xffffff,1.5);dl.position.set(2,3,2);scene.add(dl);const ctrl=new OrbitControls(cam,ren.domElement);ctrl.enableDamping=true;ctrl.autoRotate=true;ctrl.autoRotateSpeed=1.6;
const bytes=Uint8Array.from(atob("${b64}"),c=>c.charCodeAt(0));
new GLTFLoader().parse(bytes.buffer,'',g=>{scene.add(g.scene);const b=new THREE.Box3().setFromObject(g.scene);const ctr=b.getCenter(new THREE.Vector3());const sz=b.getSize(new THREE.Vector3());
const d=Math.max(sz.x,sz.y,sz.z)*2.2||0.1;ctrl.target.copy(ctr);cam.position.set(ctr.x+d*0.8,ctr.y+d*0.65,ctr.z+d*0.9);ctrl.update();});
function loop(){requestAnimationFrame(loop);ctrl.update();ren.render(scene,cam);}loop();
window.addEventListener('resize',()=>{cam.aspect=el.clientWidth/el.clientHeight;cam.updateProjectionMatrix();ren.setSize(el.clientWidth,el.clientHeight);});</script></body></html>`;
    dlBlob(new Blob([html], { type: 'text/html' }), baseName() + '_4d.html');
    toast(t('4D Interactive HTML exported!', 'Vitrine 4D HTML exportée !'));
  }

  /* =========================================================================
     7. HOST COMPATIBILITY & EVENTS
  ========================================================================= */
  window.getAppState = () => ({ studio: 'studio-pro-2', version: 2, activeStudio, materialKey, themeKey, globalColor, params: params[activeStudio] });
  window.getAppTags = () => {
    const it = CATALOG.find((x) => x.id === activeStudio);
    const st = latestBuild && latestBuild.stats;
    return [{
      x: 50, y: 30,
      label_en: it ? it.en : activeStudio,
      label_fr: it ? it.fr : activeStudio,
      desc_en: st ? `${st.bounds.sx.toFixed(1)}×${st.bounds.sy.toFixed(1)}×${st.bounds.sz.toFixed(1)} mm · Watertight 4D` : 'Studio Pro 2 Creation',
      desc_fr: st ? `${st.bounds.sx.toFixed(1)}×${st.bounds.sy.toFixed(1)}×${st.bounds.sz.toFixed(1)} mm · Étanche 4D` : 'Création Studio Pro 2'
    }];
  };

  function checkRemixRestore() {
    try {
      const raw = localStorage.getItem('sp_remix_state');
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d && d.studio === 'studio-pro-2' && d.activeStudio && ENGINES[d.activeStudio]) {
        activeStudio = d.activeStudio;
        if (d.materialKey && C.MATERIALS[d.materialKey]) materialKey = d.materialKey;
        if (d.themeKey && C.THEMES[d.themeKey]) themeKey = d.themeKey;
        if (d.globalColor) globalColor = d.globalColor;
        if (d.params) params[activeStudio] = Object.assign({}, DEFAULTS[activeStudio], d.params);
        localStorage.removeItem('sp_remix_state');
      }
    } catch (_) {}
  }

  function applyLanguage() {
    document.body.dataset.lang = lang;
    try { localStorage.setItem('sp_lang', lang); } catch (_) {}
    $('studioSearch').placeholder = t('🔍 Search 22 studios (voxel, neon, gyroid...)', '🔍 Rechercher 22 outils (voxel, néon, gyroïde...)');
    populateGlobalSelects(); renderStudioList(); renderControls(); updateCreditsBadge();
    if (latestBuild) updateHUD(latestBuild);
  }

  function setMobilePane(pane) {
    document.body.dataset.mobilePane = pane;
    document.querySelectorAll('.mobile-tab').forEach((b) => b.classList.toggle('active', b.dataset.mobileTarget === pane));
    if (pane === 'viewport' && viewport) setTimeout(() => viewport.resize(), 40);
  }

  function bindEvents() {
    $('back-btn').addEventListener('click', () => {
      if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'CLOSE_STUDIO' }, '*');
      else window.location.href = '/';
    });
    $('langToggle').addEventListener('click', () => { lang = lang === 'en' ? 'fr' : 'en'; applyLanguage(); });
    document.querySelectorAll('.mobile-tab').forEach((b) => b.addEventListener('click', () => setMobilePane(b.dataset.mobileTarget)));

    $('studioSearch').addEventListener('input', renderStudioList);
    $('workshopPills').querySelectorAll('.cat-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeWorkshop = btn.dataset.ws;
        $('workshopPills').querySelectorAll('.cat-pill').forEach((x) => x.classList.toggle('active', x === btn));
        renderStudioList();
      });
    });

    $('matSelect').addEventListener('change', (e) => {
      materialKey = e.target.value;
      if (viewport) {
        viewport.refreshMaterials(materialKey, globalColor);
        const wantBloom = materialKey === 'neon' || (latestBuild && latestBuild.preferBloom);
        viewport.setBloom(wantBloom);
        $('btnToggleBloom').classList.toggle('active', wantBloom);
      }
      pushHistory();
    });
    $('themeSelect').addEventListener('change', (e) => {
      themeKey = e.target.value;
      if (viewport) viewport.setTheme(themeKey);
      pushHistory();
    });
    $('globalColor').addEventListener('input', (e) => {
      globalColor = e.target.value;
      if (viewport) viewport.refreshMaterials(materialKey, globalColor);
    });

    // Image Upload
    $('uploadTrigger').addEventListener('click', () => $('imageFileInput').click());
    $('imageFileInput').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        const maxD = 256;
        let w = img.width, h = img.height;
        if (w > maxD || h > maxD) { const s = maxD / Math.max(w, h); w = Math.round(w * s); h = Math.round(h * s); }
        c.width = w; c.height = h;
        const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, w, h);
        uploadedImageBuf = { width: w, height: h, data: ctx.getImageData(0, 0, w, h).data, name: f.name };
        if (activeStudio === 'builder') params.builder.biome = 'image';
        if (activeStudio === 'mosaic') params.mosaic.artwork = 'image';
        if (activeStudio === 'ui_asset') params.ui_asset.useUploadedImage = true;
        renderControls(); rebuildNow(false);
        toast(t(`Image applied: ${f.name}`, `Image appliquée : ${f.name}`));
      };
      img.src = URL.createObjectURL(f);
      e.target.value = '';
    });

    // Viewport controls
    document.querySelectorAll('[data-cam]').forEach((b) => b.addEventListener('click', () => { if (viewport) viewport.fitCamera(b.dataset.cam); }));
    $('btnToggleBloom').addEventListener('click', (e) => {
      const on = !e.currentTarget.classList.contains('active');
      e.currentTarget.classList.toggle('active', on);
      if (viewport) viewport.setBloom(on);
    });
    $('btnToggleWire').addEventListener('click', (e) => {
      const on = !e.currentTarget.classList.contains('active');
      e.currentTarget.classList.toggle('active', on);
      if (viewport) viewport.setWireframe(on);
    });
    $('btnToggleGrid').addEventListener('click', (e) => {
      const on = !e.currentTarget.classList.contains('active');
      e.currentTarget.classList.toggle('active', on);
      if (viewport) viewport.setGridVisible(on);
    });

    // 4D Motion & Freeze
    $('btn4DPlay').addEventListener('click', (e) => {
      const on = !e.currentTarget.classList.contains('active');
      e.currentTarget.classList.toggle('active', on);
      e.currentTarget.innerHTML = on
        ? `⏸ <span data-en>4D Live</span><span data-fr>4D Actif</span>`
        : `▶ <span data-en>4D Paused</span><span data-fr>4D Pause</span>`;
      if (viewport) viewport.set4DPlay(on);
    });
    $('speed4DSlider').addEventListener('input', (e) => {
      if (viewport) viewport.set4DPlay($('btn4DPlay').classList.contains('active'), parseFloat(e.target.value));
    });
    $('btnFreeze4D').addEventListener('click', () => {
      if (!viewport) return;
      viewport.freeze4DToBuild();
      viewport.set4DPlay(false);
      $('btn4DPlay').classList.remove('active');
      $('btn4DPlay').innerHTML = `▶ <span data-en>4D Paused</span><span data-fr>4D Pause</span>`;
      toast(t('❄ 4D Frame frozen — ready for STL/GLB export!', '❄ Image 4D figée — prête pour export STL/GLB !'));
    });
    $('btnInspire').addEventListener('click', inspireMe);
    $('btnResetStudio').addEventListener('click', () => {
      params[activeStudio] = JSON.parse(JSON.stringify(DEFAULTS[activeStudio]));
      renderControls(); rebuildNow(true); pushHistory();
    });

    // Record 4D WEBM Video (FREE!)
    $('btnRecordWebm').addEventListener('click', async () => {
      if (!viewport) return;
      const btn = $('btnRecordWebm');
      if (btn.classList.contains('recording')) return;
      btn.classList.add('recording');
      toast(t('🎬 Recording 4.5s 4D Video (.WEBM)...', '🎬 Enregistrement Vidéo 4D 4.5s (.WEBM)...'));
      try {
        const blob = await viewport.recordWEBM(4.5);
        dlBlob(blob, baseName() + '_4d.webm');
        toast(t('4D WebM Video saved (Free)!', 'Vidéo 4D WebM sauvegardée (Gratuit) !'));
      } catch (err) {
        toast(t('WebM recording unavailable', 'Enregistrement WebM indisponible'));
      } finally {
        btn.classList.remove('recording');
      }
    });

    // Save / Load .sp2 (FREE!)
    $('btnSaveProj').addEventListener('click', () => {
      const payload = { format: 'sp2', version: 2, activeStudio, materialKey, themeKey, globalColor, params };
      dlBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `studiopro2_${activeStudio}.sp2`);
      toast(t('.sp2 project saved (Free)', 'Projet .sp2 sauvegardé (Gratuit)'));
    });
    $('btnLoadProj').addEventListener('click', () => $('projFileInput').click());
    $('projFileInput').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const d = JSON.parse(r.result);
          if (d.activeStudio && ENGINES[d.activeStudio] && d.params) {
            activeStudio = d.activeStudio;
            if (d.materialKey) materialKey = d.materialKey;
            if (d.themeKey) themeKey = d.themeKey;
            if (d.globalColor) globalColor = d.globalColor;
            params = Object.assign(JSON.parse(JSON.stringify(DEFAULTS)), d.params);
            $('globalColor').value = globalColor;
            if (viewport) viewport.setTheme(themeKey);
            populateGlobalSelects(); renderStudioList(); renderPresets(); renderControls(); rebuildNow(true); pushHistory();
            toast(t('.sp2 project restored!', 'Projet .sp2 restauré !'));
          }
        } catch (_) { toast(t('Invalid .sp2 file', 'Fichier .sp2 invalide')); }
      };
      r.readAsText(f); e.target.value = '';
    });

    // Undo / Redo / PNG / AR / Exports
    $('btnUndo').addEventListener('click', undo);
    $('btnRedo').addEventListener('click', redo);
    $('btnSnap').addEventListener('click', () => {
      if (!viewport) return;
      const a = document.createElement('a'); a.href = viewport.capturePNG(credits.isPro); a.download = baseName() + '.png'; a.click();
      toast(t('Studio PNG saved (Free)!', 'Rendu PNG sauvegardé (Gratuit) !'));
    });
    $('btnExportStl').addEventListener('click', doExportSTL);
    $('btnExportStlTop').addEventListener('click', doExportSTL);
    $('btnExportObj').addEventListener('click', doExportOBJ);
    $('btnExportGlb').addEventListener('click', doExportGLB);
    $('btnExportSvg').addEventListener('click', doExportSVG);
    $('btnExportPdf').addEventListener('click', doExportPDF);
    $('btnExportHtml').addEventListener('click', doExportHTML);

    $('btnPreviewAr').addEventListener('click', async () => {
      if (!viewport) return;
      try {
        toast(t('Opening exact 1:1 m WebAR Preview…', 'Ouverture WebAR 1:1 m…'));
        await viewport.sendToWebAR(`StudioPro2_${activeStudio}`);
      } catch (_) { toast(t('AR Bridge requires host Studios-Pro', 'Pont AR requis via Studios-Pro')); }
    });

    $('btnPreflight').addEventListener('click', () => {
      if (!latestBuild) return;
      const pf = latestBuild.stats.preflight;
      $('preflightBody').innerHTML = `
        <div style="font-size:24px;font-weight:900;color:${pf.score >= 90 ? 'var(--emerald)' : 'var(--amber)'}">${pf.score} / 100 · ${pf.grade}</div>
        ${pf.checks.map((c) => `<div class="check-item ${c.status}">${c.status === 'pass' ? '✅' : (c.status === 'warn' ? '⚠️' : '❌')} ${t(c.en, c.fr)}</div>`).join('')}`;
      $('preflightModal').classList.add('open');
    });
    $('btnUpgradePro').addEventListener('click', () => {
      $('paymentModal').classList.remove('open');
      if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'SHOW_PAYWALL_MODAL' }, '*');
      else window.open('/pricing', '_blank');
    });
    document.querySelectorAll('[data-close-modal]').forEach((b) => b.addEventListener('click', () => $(b.dataset.closeModal).classList.remove('open')));
    document.querySelectorAll('.modal-backdrop').forEach((bd) => bd.addEventListener('click', (e) => { if (e.target === bd) bd.classList.remove('open'); }));
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    });
  }

  function initViewport() {
    if (viewport || !window.SP2Viewport) return;
    viewport = new window.SP2Viewport($('viewport'));
    viewport.setTheme(themeKey);
    rebuildNow(true);
  }

  function boot() {
    checkRemixRestore();
    bindEvents();
    applyLanguage();
    renderPresets();
    pushHistory();
    if (window.SP2Viewport) initViewport();
    else {
      window.addEventListener('sp2-viewport-ready', initViewport, { once: true });
      rebuildNow(false);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
