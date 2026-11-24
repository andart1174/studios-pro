// ==========================================
// 1. GLOBAL CONFIGURATION & EXPANDED COMMERCIAL TD CATALOG (250+ SPOOLS)
// ==========================================

let config = {
    // Workspace & Framing
    workspaceMode: 'pro',         // 'pro' (Full CAD & 2D Sculpt default) | 'quick' (4-step HueForge)
    aspectPreset: 'auto',         // 'auto','1:1','4:5','3:4','16:9','a5','a4','a1mini','x1c','polaroid'
    cropZoom: 1.0,
    cropPanX: 0.0,
    cropPanY: 0.0,
    polaroidCaption: '',

    // Physical Dimensions & Layers
    width: 140,
    height: 140,
    maxRelief: 2.4,
    baseThickness: 0.60,
    layerHeight: 0.08,
    firstLayerHeight: 0.20,
    engineResolution: 360,        // 220 (Standard), 360 (HD), 512 (Ultra-HD)

    // Optical & Tone Processing
    brightness: 0,
    contrast: 10,
    smoothing: 1,
    invert: false,
    rotation: 0,
    flipX: false,
    flipY: false,
    colorMode: 'chromatic',       // 'chromatic' (Bambu AMS), 'stratified', 'luminance', 'cmyw'
    bgMode: 'normal',             // 'normal', 'cameo_dome', 'flatten_bg', 'vignette'
    sculpturalDome: 0,            // 0 to 100% 2.5D Sculptural Bas-Relief cushion
    tdOpticalBlend: 65,           // 0 to 100% Real Kubelka-Munk / Beer-Lambert TD translucent layer blending
    opticalDithering: 20,         // 0 to 100% Chromatic 2-Spool Bayer anti-banding dithering
    bilateralEdgeLock: true,      // Edge-preserving bilateral filter + 1-pixel anti-spike
    boostFineLines: true,         // Dual-polarity fine-line enhancer (dark AND bright thin details)
    filamentFinish: 'standard',   // 'standard', 'matte', 'silk', 'translucent'
    layerRidges: true,            // Anti-aliased 0.08mm 3D layer-line relief shader
    topography: 'flat',           // 'flat', 'arc', 'half_cyl', 'cylinder'
    outlineShape: 'rect',         // 'rect', 'circle', 'oval', 'hexagon', 'heart', 'shield', 'star', 'arch'
    removeCanvasBg: false,        // True die-cut model-only mode
    nfcPocket: false,             // 26mm backside NFC tag cavity
    detailSharpness: 5,           // 0 to 10 unsharp mask
    subjectPop: 25,               // -50 to +50
    colorSnap: 80,                // 10 to 100% (synced with boundarySharpness)
    preserveEyes: true,
    gamma: 1.0,                   // 0.4 to 2.2
    shadowLift: 0,                // 0 to 40%
    highlightCeiling: 100,        // 60 to 100%
    vibrance: 0,                  // -50 to +100%
    boundarySharpness: 80,        // 10 to 100% (synced with colorSnap)
    despeckleRadius: 0,           // 0 (Off), 1 (1px), 2 (2px), 3 (3px)
    layerQuantizeStep: 0,         // 0 (Smooth), 0.04, 0.08, 0.12
    nozzleSize: 0.4,              // 0.2, 0.4, 0.6 mm
    ironingSimulation: false,
    overhangWarning: false,
    zebraExposure: false,
    deltaEHeatmap: false,
    ownSpoolsOnly: false,
    rakingLightAngle: 42,
    rakingLightElevation: 38,
    frameStyle: 'none',           // 'none', 'thin', 'bevel', 'deep'
    mounting: 'flat',             // 'flat', 'keyhole', 'hole', 'stand', 'magnets_6', 'magnets_8', 'magnets_10'
    opticalModel: 'kubelka_munk', // 'kubelka_munk', 'beer_lambert', 'cubic'
    exportQuality: 'hd',
    exportQuantize: true,
    exportIncludeFrame: true,
    adaptiveMesh: true,
    slicerProfile: 'bambu_ams',   // 'bambu_ams', 'bambu_ams_lite', 'prusa_mmu3', 'manual_m600', 'cura_pause'
    muralConnector: 'dovetail',   // 'none', 'dovetail', 'magnets'
    costPerKg: 24.00,
    lightboxKelvin: 4000,

    // Unique Pro Studio Tools (V3)
    showPrintBed: false,
    printBedPreset: 'bambu_256',  // 'bambu_180', 'bambu_256', 'prusa_mk4', 'creality_300'
    crossSectionActive: false,
    crossSectionAxis: 'y',        // 'y' (horizontal cut) | 'x' (vertical cut)
    crossSectionPos: 50,          // 5..95%
    smartCutoutActive: false,
    smartCutoutMode: 'diecut',    // 'diecut' (remove void) | 'flatten' (flatten to base)
    smartCutoutSensitivity: 42,   // 15..85
    backsideSignatureEnabled: false,
    backsideSignatureText: '',
    backsideEditionText: '',
    backsideSignatureDepth: 0.24, // 0.16..0.40 mm
    triptychPreview: false,
    triptychGapMm: 20,            // 10..35 mm
    electricityRateKwh: 0.18,
    printerWatts: 120,
    packagingCost: 2.50,
    etsyFeePct: 12,
    profitMarginPct: 180
};

// ==========================================
// 250+ VERIFIED COMMERCIAL FILAMENT CATALOG
// Compact definitions: [brand, name, hex, td]
// ==========================================
const _CATALOG_RAW = [
    // --- BAMBU LAB PLA BASIC (30) ---
    ['Bambu Lab', 'PLA Basic Black', '#10141c', 0.6],
    ['Bambu Lab', 'PLA Basic Jade White', '#f8fafc', 5.0],
    ['Bambu Lab', 'PLA Basic Gray', '#8b929a', 2.0],
    ['Bambu Lab', 'PLA Basic Light Gray', '#cbd5e1', 3.5],
    ['Bambu Lab', 'PLA Basic Blue Gray', '#5b6778', 3.0],
    ['Bambu Lab', 'PLA Basic Silver', '#a6a9aa', 2.5],
    ['Bambu Lab', 'PLA Basic Red', '#c12e1f', 4.0],
    ['Bambu Lab', 'PLA Basic Maroon Red', '#7b1d26', 2.2],
    ['Bambu Lab', 'PLA Basic Magenta', '#ec008c', 3.0],
    ['Bambu Lab', 'PLA Basic Pink', '#f55a74', 4.5],
    ['Bambu Lab', 'PLA Basic Hot Pink', '#e83e8c', 3.8],
    ['Bambu Lab', 'PLA Basic Orange', '#ff6a13', 5.0],
    ['Bambu Lab', 'PLA Basic Pumpkin Orange', '#ff8c00', 4.8],
    ['Bambu Lab', 'PLA Basic Sunflower Yellow', '#fec600', 6.0],
    ['Bambu Lab', 'PLA Basic Yellow', '#f4ee2a', 6.0],
    ['Bambu Lab', 'PLA Basic Gold', '#e4bd68', 3.5],
    ['Bambu Lab', 'PLA Basic Bronze', '#847d48', 2.0],
    ['Bambu Lab', 'PLA Basic Brown', '#9d432c', 2.0],
    ['Bambu Lab', 'PLA Basic Cocoa Brown', '#6f5034', 1.2],
    ['Bambu Lab', 'PLA Basic Beige', '#f7e6de', 5.5],
    ['Bambu Lab', 'PLA Basic Bambu Green', '#00ae42', 4.0],
    ['Bambu Lab', 'PLA Basic Mistletoe Green', '#3f8e43', 2.5],
    ['Bambu Lab', 'PLA Basic Bright Green', '#86efac', 5.0],
    ['Bambu Lab', 'PLA Basic Turquoise', '#00b1b7', 4.5],
    ['Bambu Lab', 'PLA Basic Cyan', '#0086d6', 4.0],
    ['Bambu Lab', 'PLA Basic Blue', '#0a2989', 4.0],
    ['Bambu Lab', 'PLA Basic Cobalt Blue', '#0056b8', 3.6],
    ['Bambu Lab', 'PLA Basic Indigo Purple', '#482960', 1.8],
    ['Bambu Lab', 'PLA Basic Purple', '#5e43b7', 2.5],
    ['Bambu Lab', 'PLA Basic Lavender', '#b497d6', 4.8],

    // --- BAMBU LAB PLA MATTE (24) ---
    ['Bambu Matte', 'Matte Charcoal', '#0e1116', 0.6],
    ['Bambu Matte', 'Matte Ivory White', '#ffffff', 4.0],
    ['Bambu Matte', 'Matte Ash Gray', '#9b9ea0', 1.5],
    ['Bambu Matte', 'Matte Nardo Gray', '#757575', 1.2],
    ['Bambu Matte', 'Matte Scarlet Red', '#de4343', 3.0],
    ['Bambu Matte', 'Matte Dark Red', '#992222', 1.6],
    ['Bambu Matte', 'Matte Sakura Pink', '#e8afc2', 3.5],
    ['Bambu Matte', 'Matte Mandarin Orange', '#f99963', 3.0],
    ['Bambu Matte', 'Matte Terracotta', '#b15533', 1.8],
    ['Bambu Matte', 'Matte Desert Tan', '#e8dbb7', 3.5],
    ['Bambu Matte', 'Matte Latte Brown', '#d3b7a7', 2.2],
    ['Bambu Matte', 'Matte Dark Brown', '#4d3324', 0.9],
    ['Bambu Matte', 'Matte Lemon Yellow', '#f7d959', 4.0],
    ['Bambu Matte', 'Matte Apple Green', '#c2e189', 3.5],
    ['Bambu Matte', 'Matte Grass Green', '#61c680', 3.0],
    ['Bambu Matte', 'Matte Dark Green', '#2e5d40', 1.2],
    ['Bambu Matte', 'Matte Ice Blue', '#a3d8e1', 3.5],
    ['Bambu Matte', 'Matte Marine Blue', '#0078bf', 2.5],
    ['Bambu Matte', 'Matte Dark Blue', '#042f56', 1.0],
    ['Bambu Matte', 'Matte Midnight Navy', '#162844', 1.0],
    ['Bambu Matte', 'Matte Lilac Purple', '#ae96d4', 3.0],
    ['Bambu Matte', 'Matte Plum', '#6b2d5c', 1.4],
    ['Bambu Matte', 'Matte Bone White', '#ece6d8', 3.8],
    ['Bambu Matte', 'Matte Caramel', '#bc7a44', 2.0],

    // --- BAMBU LAB SILK / METAL / CMYK LITHOPHANE / PETG (24) ---
    ['Bambu Silk', 'Silk Gold', '#f4a925', 3.5],
    ['Bambu Silk', 'Silk Silver', '#c8ccd0', 2.8],
    ['Bambu Silk', 'Silk Copper', '#b86843', 2.2],
    ['Bambu Silk', 'Silk Rose Gold', '#e09f97', 3.0],
    ['Bambu Silk', 'Silk Candy Red', '#d61c38', 3.2],
    ['Bambu Silk', 'Silk Blue', '#1d66c2', 3.4],
    ['Bambu Silk', 'Silk Green', '#2ca85c', 3.5],
    ['Bambu Silk', 'Silk Purple', '#7b4cc2', 2.6],
    ['Bambu Silk', 'Silk White', '#f5f6f8', 4.5],
    ['Bambu Metal', 'Iridium Gold Metallic', '#b39b84', 1.8],
    ['Bambu Metal', 'Iron Gray Metallic', '#43403d', 0.9],
    ['Bambu Metal', 'Cobalt Blue Metallic', '#39699e', 1.6],
    ['Bambu Metal', 'Oxide Green Metallic', '#1d7c6a', 1.4],
    ['Bambu CMYK', 'CMYK Lithophane Cyan', '#0096d6', 5.5],
    ['Bambu CMYK', 'CMYK Lithophane Magenta', '#e5007d', 5.0],
    ['Bambu CMYK', 'CMYK Lithophane Yellow', '#ffe600', 7.5],
    ['Bambu CMYK', 'CMYK Lithophane White', '#ffffff', 5.0],
    ['Bambu PETG', 'PETG HF Black', '#14171d', 0.8],
    ['Bambu PETG', 'PETG HF White', '#f8fafc', 6.5],
    ['Bambu PETG', 'PETG HF Red', '#c92a2a', 5.5],
    ['Bambu PETG', 'PETG HF Blue', '#1c5db5', 5.0],
    ['Bambu PETG', 'PETG Translucent Clear', '#e2e8f0', 14.0],
    ['Bambu PETG', 'PETG Translucent Teal', '#38bdf8', 11.0],
    ['Bambu PETG', 'PETG Translucent Orange', '#fb923c', 10.5],

    // --- POLYMAKER POLYLITE / POLYTERRA / PANCHROMA (42) ---
    ['Polymaker', 'PolyLite Black', '#111111', 0.5],
    ['Polymaker', 'PolyLite White', '#f5f5f5', 5.0],
    ['Polymaker', 'PolyLite Natural', '#ede8dc', 9.5],
    ['Polymaker', 'PolyLite Grey', '#7a8086', 2.0],
    ['Polymaker', 'PolyLite Cold White', '#ffffff', 5.2],
    ['Polymaker', 'PolyLite Warm White', '#fdf5e6', 5.8],
    ['Polymaker', 'PolyLite Red', '#dc2626', 4.2],
    ['Polymaker', 'PolyLite Crimson Red', '#8b1e24', 2.4],
    ['Polymaker', 'PolyLite Magenta', '#db2777', 4.5],
    ['Polymaker', 'PolyLite Pink', '#f472b6', 5.0],
    ['Polymaker', 'PolyLite Orange', '#f97316', 5.5],
    ['Polymaker', 'PolyLite Yellow', '#eab308', 6.5],
    ['Polymaker', 'PolyLite Metallic Gold', '#d4a64a', 2.6],
    ['Polymaker', 'PolyLite Green', '#22c55e', 4.0],
    ['Polymaker', 'PolyLite Lime Green', '#84cc16', 5.5],
    ['Polymaker', 'PolyLite Teal', '#14b8a6', 3.5],
    ['Polymaker', 'PolyLite Cyan', '#06b6d4', 4.8],
    ['Polymaker', 'PolyLite Blue', '#1d4ed8', 3.5],
    ['Polymaker', 'PolyLite Starlight Mercury', '#4b5563', 1.2],
    ['Polymaker', 'PolyLite Purple', '#7c3aed', 2.8],
    ['Polymaker', 'PolyLite Silk Gold', '#eab308', 3.5],
    ['Polymaker', 'PolyLite Silk Silver', '#d1d5db', 2.6],
    ['Polymaker', 'PolyTerra Charcoal Black', '#14171a', 0.4],
    ['Polymaker', 'PolyTerra Cotton White', '#f3f4f6', 3.5],
    ['Polymaker', 'PolyTerra Fossil Grey', '#8d9299', 1.8],
    ['Polymaker', 'PolyTerra Army Red', '#a1302e', 1.5],
    ['Polymaker', 'PolyTerra Lava Red', '#d93829', 2.8],
    ['Polymaker', 'PolyTerra Sunrise Orange', '#f27830', 3.5],
    ['Polymaker', 'PolyTerra Savanna Yellow', '#e8b931', 4.2],
    ['Polymaker', 'PolyTerra Peanut', '#c29263', 2.0],
    ['Polymaker', 'PolyTerra Earth Brown', '#7c4d32', 1.1],
    ['Polymaker', 'PolyTerra Wood Brown', '#a67b5b', 1.6],
    ['Polymaker', 'PolyTerra Forest Green', '#2d6a4f', 1.8],
    ['Polymaker', 'PolyTerra Mint', '#80ed99', 4.2],
    ['Polymaker', 'PolyTerra Army Green', '#546a47', 1.4],
    ['Polymaker', 'PolyTerra Sapphire Blue', '#1e40af', 2.5],
    ['Polymaker', 'PolyTerra Artic Teal', '#4cc9f0', 4.0],
    ['Polymaker', 'PolyTerra Muted Blue', '#577399', 2.0],
    ['Polymaker', 'PolyTerra Lavender Purple', '#9d8df1', 3.2],
    ['Polymaker', 'PolyTerra Pastel Peach', '#f7b29c', 3.8],
    ['Polymaker', 'Panchroma Matte Army Beige', '#c7b89c', 2.4],
    ['Polymaker', 'Panchroma Matte Sakura Pink', '#f2b5c4', 3.6],

    // --- SUNLU PLA+ / MATTE / SILK / META (30) ---
    ['Sunlu', 'PLA+ Black', '#0d0f12', 0.5],
    ['Sunlu', 'PLA+ White', '#fafafa', 5.5],
    ['Sunlu', 'PLA+ Grey', '#80848a', 2.2],
    ['Sunlu', 'PLA+ Silver', '#b0b5bc', 2.5],
    ['Sunlu', 'PLA+ Red', '#cc2929', 4.0],
    ['Sunlu', 'PLA+ Cherry Red', '#a61c2e', 3.0],
    ['Sunlu', 'PLA+ Pink', '#f472b6', 5.0],
    ['Sunlu', 'PLA+ Magenta', '#d946ef', 4.2],
    ['Sunlu', 'PLA+ Orange', '#f97316', 5.8],
    ['Sunlu', 'PLA+ Yellow', '#facc15', 7.0],
    ['Sunlu', 'PLA+ Sunny Orange', '#fb923c', 6.0],
    ['Sunlu', 'PLA+ Coffee Brown', '#5c3a21', 1.2],
    ['Sunlu', 'PLA+ Skin Beige', '#e8c4a2', 4.5],
    ['Sunlu', 'PLA+ Green', '#16a34a', 3.8],
    ['Sunlu', 'PLA+ Grass Green', '#4ade80', 5.0],
    ['Sunlu', 'PLA+ Olive Green', '#556b2f', 1.6],
    ['Sunlu', 'PLA+ Cyan', '#06b6d4', 4.8],
    ['Sunlu', 'PLA+ Blue', '#1d4ed8', 3.5],
    ['Sunlu', 'PLA+ Sky Blue', '#38bdf8', 5.2],
    ['Sunlu', 'PLA+ Purple', '#7e22ce', 2.8],
    ['Sunlu', 'PLA Meta Black', '#12151a', 0.6],
    ['Sunlu', 'PLA Meta White', '#f8fafc', 5.0],
    ['Sunlu', 'PLA Meta Cream White', '#f5ecd7', 4.8],
    ['Sunlu', 'PLA Meta Teal', '#0d9488', 3.6],
    ['Sunlu', 'Matte PLA Black', '#141418', 0.5],
    ['Sunlu', 'Matte PLA White', '#f0f0ec', 3.6],
    ['Sunlu', 'Matte PLA Terracotta', '#c45b3b', 2.0],
    ['Sunlu', 'Silk Gold', '#eab308', 3.2],
    ['Sunlu', 'Silk Silver', '#cbd5e1', 2.6],
    ['Sunlu', 'Silk Copper', '#b86f49', 2.1],

    // --- eSUN PLA+ / MATTE / SILK (28) ---
    ['eSUN', 'PLA+ Black', '#0f0f0f', 0.5],
    ['eSUN', 'PLA+ Cold White', '#ffffff', 5.5],
    ['eSUN', 'PLA+ Warm White', '#f6efe2', 5.2],
    ['eSUN', 'PLA+ Bone White', '#e8e0cf', 4.2],
    ['eSUN', 'PLA+ Grey', '#7e848c', 2.1],
    ['eSUN', 'PLA+ Silver', '#b5bac2', 2.4],
    ['eSUN', 'PLA+ Fire Engine Red', '#b91c1c', 3.5],
    ['eSUN', 'PLA+ Magenta', '#c026d3', 3.8],
    ['eSUN', 'PLA+ Pink', '#f9a8d4', 5.0],
    ['eSUN', 'PLA+ Orange', '#ea580c', 5.5],
    ['eSUN', 'PLA+ Yellow', '#fde047', 6.8],
    ['eSUN', 'PLA+ Gold', '#d9a441', 3.2],
    ['eSUN', 'PLA+ Brown', '#6b4226', 1.3],
    ['eSUN', 'PLA+ Light Brown', '#b5835a', 2.8],
    ['eSUN', 'PLA+ Beige', '#dfc5a4', 4.0],
    ['eSUN', 'PLA+ Peak Green', '#16a34a', 3.8],
    ['eSUN', 'PLA+ Pine Green', '#1e4d36', 1.5],
    ['eSUN', 'PLA+ Olive Green', '#6b7042', 1.8],
    ['eSUN', 'PLA+ Light Blue', '#38bdf8', 5.0],
    ['eSUN', 'PLA+ Blue', '#1e40af', 3.2],
    ['eSUN', 'PLA+ Dark Blue', '#172554', 1.4],
    ['eSUN', 'PLA+ Purple', '#6d28d9', 2.6],
    ['eSUN', 'PLA+ Very Peri', '#6667ab', 3.0],
    ['eSUN', 'ePLA-Matte Deep Black', '#141619', 0.4],
    ['eSUN', 'ePLA-Matte Milky White', '#f4f4f0', 3.5],
    ['eSUN', 'ePLA-Matte Almond Yellow', '#e9d3a3', 3.8],
    ['eSUN', 'ePLA-Matte Mint Green', '#8ad6b4', 3.6],
    ['eSUN', 'eSilk Gold', '#e6ae36', 3.0],

    // --- ELEGOO RAPID PLA+ / MATTE / SILK (22) ---
    ['Elegoo', 'Rapid PLA+ Black', '#101216', 0.5],
    ['Elegoo', 'Rapid PLA+ White', '#f9fafb', 5.2],
    ['Elegoo', 'Rapid PLA+ Grey', '#828890', 2.0],
    ['Elegoo', 'Rapid PLA+ Space Grey', '#4f545c', 1.2],
    ['Elegoo', 'Rapid PLA+ Red', '#c82333', 3.8],
    ['Elegoo', 'Rapid PLA+ Orange', '#f97316', 5.2],
    ['Elegoo', 'Rapid PLA+ Yellow', '#facc15', 6.5],
    ['Elegoo', 'Rapid PLA+ Green', '#16a34a', 3.8],
    ['Elegoo', 'Rapid PLA+ Sea Green', '#2dd4bf', 4.5],
    ['Elegoo', 'Rapid PLA+ Blue', '#2563eb', 3.6],
    ['Elegoo', 'Rapid PLA+ Sky Blue', '#60a5fa', 5.0],
    ['Elegoo', 'Rapid PLA+ Purple', '#7c3aed', 2.8],
    ['Elegoo', 'Rapid PLA+ Pink', '#f472b6', 4.8],
    ['Elegoo', 'Rapid PLA+ Brown', '#6e4730', 1.4],
    ['Elegoo', 'Rapid PLA+ Beige', '#e3cfb4', 4.2],
    ['Elegoo', 'Matte PLA Black', '#14171a', 0.4],
    ['Elegoo', 'Matte PLA White', '#f3f2ed', 3.4],
    ['Elegoo', 'Matte PLA Ruby Red', '#a82936', 2.0],
    ['Elegoo', 'Matte PLA Navy Blue', '#1d3557', 1.2],
    ['Elegoo', 'Matte PLA Sunshine Yellow', '#f4d35e', 4.0],
    ['Elegoo', 'Silk PLA Gold', '#e5b23a', 3.0],
    ['Elegoo', 'Silk PLA Silver', '#cfd4dc', 2.5],

    // --- OVERTURE MATTE / PLA PRO / SILK (22) ---
    ['Overture', 'Matte PLA Black', '#131518', 0.4],
    ['Overture', 'Matte PLA White', '#f5f5f2', 3.5],
    ['Overture', 'Matte PLA Light Gray', '#b8bcc2', 2.2],
    ['Overture', 'Matte PLA Cement Gray', '#7a7e85', 1.5],
    ['Overture', 'Matte PLA Red', '#c93434', 2.6],
    ['Overture', 'Matte PLA Brick Red', '#9c3a32', 1.6],
    ['Overture', 'Matte PLA Pink', '#f3a4b5', 3.8],
    ['Overture', 'Matte PLA Orange', '#ee7a36', 3.5],
    ['Overture', 'Matte PLA Yellow', '#f2cf52', 4.5],
    ['Overture', 'Matte PLA Chocolate', '#593a28', 0.9],
    ['Overture', 'Matte PLA Light Brown', '#b88b61', 2.2],
    ['Overture', 'Matte PLA Grass Green', '#58a85c', 2.8],
    ['Overture', 'Matte PLA Olive Green', '#5d6b47', 1.4],
    ['Overture', 'Matte PLA Army Green', '#3f523a', 1.1],
    ['Overture', 'Matte PLA Light Blue', '#7cc4e8', 3.8],
    ['Overture', 'Matte PLA Blue', '#2458a6', 2.4],
    ['Overture', 'Matte PLA Navy Blue', '#1c2e4a', 1.0],
    ['Overture', 'Matte PLA Purple', '#6d4c9c', 2.2],
    ['Overture', 'PLA Pro White', '#ffffff', 5.0],
    ['Overture', 'PLA Pro Black', '#101010', 0.5],
    ['Overture', 'PLA Pro Red', '#d62828', 4.0],
    ['Overture', 'Silk Gold', '#e0a938', 3.1],

    // --- PRUSAMENT PLA / PETG (20) ---
    ['Prusament', 'PLA Jet Black', '#111215', 0.5],
    ['Prusament', 'PLA Galaxy Black', '#1f2228', 0.7],
    ['Prusament', 'PLA Pristine White', '#fafaf8', 5.2],
    ['Prusament', 'PLA Vanilla White', '#f2ead7', 4.8],
    ['Prusament', 'PLA Galaxy Silver', '#9ea3aa', 2.0],
    ['Prusament', 'PLA Lipstick Red', '#c81d25', 3.8],
    ['Prusament', 'PLA Carmine Red', '#9b1c26', 2.4],
    ['Prusament', 'PLA Prusa Orange', '#fa6831', 5.5],
    ['Prusament', 'PLA Pineapple Yellow', '#f7d136', 6.2],
    ['Prusament', 'PLA Oh My Gold', '#c99b3b', 2.8],
    ['Prusament', 'PLA Viva La Bronze', '#8c673c', 1.8],
    ['Prusament', 'PLA Simply Green', '#279b48', 3.6],
    ['Prusament', 'PLA Opal Green', '#207567', 2.5],
    ['Prusament', 'PLA Azure Blue', '#1e78c8', 4.2],
    ['Prusament', 'PLA Royal Blue', '#1a3c8c', 2.4],
    ['Prusament', 'PLA Galaxy Purple', '#4f2c6e', 1.6],
    ['Prusament', 'PLA Mystic Brown', '#5c4033', 1.3],
    ['Prusament', 'PETG Signal White', '#f8fafc', 6.5],
    ['Prusament', 'PETG Prusa Orange', '#ff6600', 7.5],
    ['Prusament', 'PETG Carmine Red Translucent', '#b91c1c', 9.0],

    // --- HATCHBOX / CREALITY / VOXELPLA (24) ---
    ['Hatchbox', 'PLA True Black', '#0f1114', 0.5],
    ['Hatchbox', 'PLA True White', '#f8f9fa', 5.0],
    ['Hatchbox', 'PLA Cool Gray', '#8c929a', 2.2],
    ['Hatchbox', 'PLA True Red', '#cc2229', 3.8],
    ['Hatchbox', 'PLA True Orange', '#f47216', 5.2],
    ['Hatchbox', 'PLA True Yellow', '#f7d417', 6.4],
    ['Hatchbox', 'PLA True Green', '#1a9e49', 3.6],
    ['Hatchbox', 'PLA Mint Green', '#7ad7b0', 4.8],
    ['Hatchbox', 'PLA True Blue', '#1b57b5', 3.4],
    ['Hatchbox', 'PLA Midnight Purple', '#48286b', 1.6],
    ['Hatchbox', 'PLA Brown', '#6e472b', 1.4],
    ['Hatchbox', 'PLA Beige', '#dfcaa8', 4.2],
    ['Hatchbox', 'Matte Terracotta', '#b85c3e', 1.8],
    ['Hatchbox', 'Matte Ash Gray', '#92969c', 1.6],
    ['Creality', 'Hyper PLA Black', '#101216', 0.6],
    ['Creality', 'Hyper PLA White', '#f9fafb', 5.0],
    ['Creality', 'Hyper PLA Red', '#d62828', 4.0],
    ['Creality', 'Hyper PLA Blue', '#1e5bb8', 3.6],
    ['Creality', 'Hyper PLA Yellow', '#f5cb22', 6.2],
    ['Creality', 'Hyper PLA Grey', '#858a92', 2.2],
    ['VoxelPLA', 'PLA Pro Black', '#0e1014', 0.5],
    ['VoxelPLA', 'PLA Pro White', '#f7f8fa', 5.0],
    ['VoxelPLA', 'PLA Pro Red', '#c92a2a', 3.8],
    ['VoxelPLA', 'PLA Pro Blue', '#1c4ed8', 3.5]
];

const COMMERCIAL_FILAMENT_CATALOG = _CATALOG_RAW.map((item, idx) => ({
    id: `cat_${idx}_${item[0].toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${item[1].toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    brand: item[0],
    name: `${item[0]} ${item[1]}`,
    shortName: item[1],
    color: item[2],
    hex: item[2],
    td: item[3]
}));

// Canonical alias preserved for full backward compatibility
const REAL_FILAMENT_CATALOG = COMMERCIAL_FILAMENT_CATALOG;

// ==========================================
// MY SPOOL RACK (OWNED INVENTORY + CUSTOM SPOOLS + HUEFORGE .HFP IMPORT)
// ==========================================
const MY_SPOOL_RACK_STORAGE_KEY = 'studios_pro_my_spool_rack_v1';
let ownedSpoolIds = new Set();
let userCustomSpools = [];

function loadMySpoolRackFromStorage() {
    try {
        if (typeof localStorage === 'undefined') return;
        const raw = localStorage.getItem(MY_SPOOL_RACK_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.ownedIds)) {
            ownedSpoolIds = new Set(parsed.ownedIds.map(String));
        }
        if (Array.isArray(parsed.customSpools)) {
            userCustomSpools = parsed.customSpools.filter(s => s && (s.hex || s.color)).map((s, idx) => {
                const rawHex = String(s.hex || s.color);
                const validHex = /^#[0-9a-f]{6}$/i.test(rawHex) ? rawHex : '#38bdf8';
                return {
                    id: s.id || `custom_${Date.now()}_${idx}`,
                    brand: String(s.brand || 'Custom'),
                    name: String(s.name || 'Custom Spool'),
                    shortName: String(s.shortName || s.name || 'Custom Spool'),
                    color: validHex,
                    hex: validHex,
                    td: Math.max(0.2, Math.min(20, parseFloat(s.td) || 2.0)),
                    isCustom: true
                };
            });
        }
    } catch (_) {}
}

function saveMySpoolRackToStorage() {
    try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(MY_SPOOL_RACK_STORAGE_KEY, JSON.stringify({
            ownedIds: Array.from(ownedSpoolIds),
            customSpools: userCustomSpools
        }));
    } catch (_) {}
}

function getAllAvailableSpools() {
    return [...userCustomSpools, ...COMMERCIAL_FILAMENT_CATALOG];
}

function isSpoolOwned(spoolId) {
    return ownedSpoolIds.has(String(spoolId));
}

function toggleOwnedSpool(spoolId) {
    const id = String(spoolId);
    if (ownedSpoolIds.has(id)) ownedSpoolIds.delete(id);
    else ownedSpoolIds.add(id);
    saveMySpoolRackToStorage();
    return ownedSpoolIds.has(id);
}

function addCustomSpoolToRack({ brand, name, hex, td, markOwned = true }) {
    const cleanHex = /^#[0-9a-f]{6}$/i.test(String(hex || '').trim()) ? String(hex).trim().toLowerCase() : '#38bdf8';
    const cleanBrand = String(brand || 'Custom').trim() || 'Custom';
    const cleanName = String(name || 'Calibrated Spool').trim() || 'Calibrated Spool';
    const fullName = cleanName.toLowerCase().startsWith(cleanBrand.toLowerCase()) ? cleanName : `${cleanBrand} ${cleanName}`;
    const cleanTd = Math.round(Math.max(0.2, Math.min(20, parseFloat(td) || 2.0)) * 10) / 10;
    const entry = {
        id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        brand: cleanBrand,
        name: fullName,
        shortName: cleanName,
        color: cleanHex,
        hex: cleanHex,
        td: cleanTd,
        isCustom: true
    };
    userCustomSpools.unshift(entry);
    if (markOwned) ownedSpoolIds.add(entry.id);
    saveMySpoolRackToStorage();
    return entry;
}

function removeCustomSpool(spoolId) {
    const id = String(spoolId);
    userCustomSpools = userCustomSpools.filter(s => s.id !== id);
    ownedSpoolIds.delete(id);
    saveMySpoolRackToStorage();
}

function getOwnedSpools() {
    const all = getAllAvailableSpools();
    return all.filter(s => ownedSpoolIds.has(s.id));
}

function exportSpoolRackJSON() {
    return JSON.stringify({
        format: 'studios-pro-spool-rack-v1',
        exportedAt: new Date().toISOString(),
        ownedSpools: getOwnedSpools(),
        customSpools: userCustomSpools
    }, null, 2);
}

// Imports JSON (Studios-Pro / FilamentColors.xyz / HueForge .hfp), or CSV (brand,name,hex,td)
function importSpoolRackFromText(text) {
    const raw = String(text || '').trim();
    if (!raw) return { imported: 0, appliedToStack: false };
    let imported = 0;
    let importedList = [];

    if (raw.startsWith('{') || raw.startsWith('[')) {
        const obj = JSON.parse(raw);
        // HueForge .hfp format detection (filament_set / sliders / filament_sliders)
        const hfList = obj.filament_set || obj.filaments || obj.ownedSpools || obj.spools || (Array.isArray(obj) ? obj : null);
        if (Array.isArray(hfList)) {
            hfList.forEach((item, idx) => {
                if (!item || typeof item !== 'object') return;
                let hex = item.Color || item.color || item.hex || item.Hex || item.hex_color;
                if (hex && !String(hex).startsWith('#')) hex = '#' + hex;
                if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return;
                const td = parseFloat(item.Transmissivity ?? item.transmissivity ?? item.td ?? item.TD ?? item.td_value ?? 2.0);
                const brand = item.Brand || item.brand || item.manufacturer || 'Imported';
                const name = item.Name || item.name || item.color_name || `Spool ${idx + 1}`;
                const added = addCustomSpoolToRack({ brand, name, hex, td: isFinite(td) ? td : 2.0, markOwned: true });
                importedList.push({ ...added, startPct: typeof item.startPct === 'number' ? item.startPct : null });
                imported++;
            });
        }
    } else {
        // CSV parser: brand,name,hex,td (or name,hex,td)
        const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        lines.forEach((line, idx) => {
            if (idx === 0 && /brand|name|hex|td/i.test(line)) return;
            const cols = line.split(/[;,]/).map(c => c.trim().replace(/^"|"$/g, ''));
            let brand = 'Imported', name = '', hex = '', td = 2.0;
            if (cols.length >= 4) {
                [brand, name, hex, td] = cols;
            } else if (cols.length === 3) {
                [name, hex, td] = cols;
            } else {
                return;
            }
            if (hex && !hex.startsWith('#')) hex = '#' + hex;
            if (!/^#[0-9a-f]{6}$/i.test(hex)) return;
            const added = addCustomSpoolToRack({ brand, name, hex, td: parseFloat(td) || 2.0, markOwned: true });
            importedList.push(added);
            imported++;
        });
    }

    return { imported, spools: importedList };
}

loadMySpoolRackFromStorage();

// Dynamic Filament Stack (Ordered Bottom to Top)
let filaments = [
    { name: 'Black (Base)', color: '#111827', td: 0.6, startPct: 0.00 },
    { name: 'Deep Blue', color: '#1e3a8a', td: 1.8, startPct: 0.25 },
    { name: 'Vibrant Orange', color: '#ea580c', td: 3.5, startPct: 0.50 },
    { name: 'Warm Yellow', color: '#facc15', td: 4.5, startPct: 0.72 },
    { name: 'Pure White', color: '#ffffff', td: 5.0, startPct: 0.88 }
];

// AI Suggested Palettes Storage
let aiPalettesList = [];
let activeAIPaletteIndex = 0;

// Three.js Globals
let scene, camera, renderer, controls;
let reliefMesh = null;
let frameMesh = null;
let qr3DMesh = null;
let printBedGroup = null;
let crossSectionLineMesh = null;
let triptychSideMeshes = [];
let crossSectionClipPlane = null;
let _splitPrevCameraState = null;
let studioLights = [];
let backlightLight = null;
let keyStudioLight = null;
let fillStudioLight = null;
let rimStudioLight = null;
let clipPlane = null;
let isWireframe = false;
let isLightbox = false;
let isColorMapMode = false;
let isNozzleInspectMode = false;
let isOverhangWarning = false;
let isZebraExposure = false;
let isDeltaEHeatmap = false;
let is3DRecolorMode = false;
let isSplitCompareMode = false;
let splitComparePercent = 50;
let isSlicerSimulationActive = false;
let slicerAnimationTimer = null;
let currentSimLayer = 30;
let lastDeltaEStats = { avgDeltaE: 0, maxDeltaE: 0, matchScorePct: 100 };

// Image & Relief Buffers
let sourceImage = null;
let sourceCanvas = document.createElement('canvas');
let processedCanvas = document.createElement('canvas');
let heightDataBuffer = null;       // Float32Array [0..1]
let colorDataBuffer = null;        // Uint8ClampedArray RGBA (4 bytes/pixel)
let filamentSlotBuffer = null;     // Uint8Array (255 = auto/photo, 0..N-1 = explicit filament slot)
let customZDeltaBuffer = null;     // Float32Array (in mm, +/- relief sculpting delta)
let cutoutMaskBuffer = null;       // Uint8Array (0 = solid, 1 = drilled open-air cutout)
let userEditMaskBuffer = null;     // Uint8Array (1 = user painted/sculpted pixel)
let bgExteriorVoidMask = null;     // Uint8Array (1 = exterior connected background void in photo mode)
let smartCutoutMask = null;        // Uint8Array (1 = AI smart subject cutout removed background)
let backsideSigMaskCache = null;   // Cached mirrored 2D engraving bitmap for backside signature
let lastProcessedMeta = null;
let isCanvasUserEdited = false;
let bufferWidth = 0;
let bufferHeight = 0;
let eyedropperColor = '#ea580c';

// Non-Destructive Mode & Overlay Preservation State
let savedPhotoStateBackup = null;
let studioOverlays = {
    texts: [],
    stamps: [],
    qr: null,
    soundwave: null
};

// 2D Interactive Studio & Drawing State
let studioMode = 'photo';          // 'photo' | 'draw'
let centerViewMode = '3d';         // '3d' | '2d'
let isDrawingTemplateActive = false;
let activeEditorTool = 'heal';
let activeFilamentSlot = 2;
let editorBrushRadius = 4;
let editorFillTolerance = 38;
let editorSymmetryMode = 'none';
let editorZoom = 1.0;
let activeVectorStamp = 'heart';
let activeCADShapeType = 'rect';
let customLogoStampCanvas = null;
let editorCanvas = null;
let editorCtx = null;
let isEditorInteracting = false;
let editorStartX = 0, editorStartY = 0;
let editorLastX = 0, editorLastY = 0;
const historyStack = [];
const redoStack = [];
let historyIndex = -1;
const MAX_HISTORY = 25;

// Live Interactive Floating Text State
let editorTextState = {
    text: 'STUDIO 3D',
    fontSize: 32,
    fontFamily: 'Outfit, sans-serif',
    bold: true,
    italic: false,
    outlineSlot: -1,
    angleDeg: 0,
    arcDeg: 0,
    zMode: 'emboss',
    posX: null,
    posY: null,
    hasLivePreview: false
};
let preLiveToolBackup = null;
let preQRBackup = null;
let preSoundwaveBackup = null;

// Live Interactive 3D Vector Icon & Custom Logo Stamp State
let editorStampState = {
    posX: null,
    posY: null,
    hasLivePreview: false
};

// Live Procedural CAD Pattern State
let editorPatternState = {
    posX: null,
    posY: null,
    hasLivePreview: false
};

// Active 3D Scannable QR Code & Soundwave State
let activeQRStamp = null;
let activeSoundwave = null;
let customAudioBars = null;
let _isRecordingMic = false;

// Shared Web Worker instances
let _computeWorkerInstance = null;
let _computeWorkerJobId = 0;

// Synchronized boundary sharpness / color snap helper (fixes dead slider conflict!)
function setUnifiedColorSnap(val) {
    const v = Math.max(0, Math.min(100, parseInt(val, 10) || 0));
    config.colorSnap = v;
    config.boundarySharpness = v;
    const s1 = document.getElementById('slider-color-snap');
    const v1 = document.getElementById('val-color-snap');
    const s2 = document.getElementById('slider-boundary-sharpness');
    const v2 = document.getElementById('val-boundary-sharpness');
    if (s1) s1.value = v;
    if (v1) v1.innerText = v + '%';
    if (s2) s2.value = v;
    if (v2) v2.innerText = v + '%';
    if (typeof render2DEditorPreview === 'function' && centerViewMode === '2d') render2DEditorPreview();
    if (typeof requestMeshUpdate === 'function') requestMeshUpdate();
}

// currentLang is declared in js/i18n.js (loaded before catalog-td.js)
