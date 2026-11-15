// ==========================================
// 🎨 CORE DATA STATE
// ==========================================
let config = {
    width: 140,
    height: 140,
    maxRelief: 2.4,
    baseThickness: 0.60,
    layerHeight: 0.08,
    firstLayerHeight: 0.20,
    engineResolution: 360,  // 220 (Standard), 360 (HD), 512 (Ultra-HD)
    brightness: 0,
    contrast: 10,
    smoothing: 1,
    invert: false,
    rotation: 0,
    flipX: false,
    flipY: false,
    colorMode: 'chromatic', // 'chromatic' (Bambu AMS), 'stratified', 'luminance'
    bgMode: 'normal',       // 'normal', 'cameo_dome', 'flatten_bg', 'vignette'
    sculpturalDome: 0,      // 0 to 100% 2.5D Sculptural Bas-Relief cushion
    tdOpticalBlend: 65,     // 0 to 100% Real Beer-Lambert TD translucent layer blending
    opticalDithering: 20,   // 0 to 100% Ordered/Floyd-Steinberg anti-banding dithering
    bilateralEdgeLock: true,// Edge-preserving bilateral filter + 1-pixel anti-spike
    boostFineLines: true,   // Morphological dilation for sub-0.4mm fine whiskers/eyes/text
    filamentFinish: 'standard', // 'standard', 'matte', 'silk', 'translucent'
    layerRidges: true,      // Anisotropic 0.08mm 3D layer-line normal shader
    topography: 'flat',     // 'flat', 'arc', 'half_cyl', 'cylinder'
    outlineShape: 'rect',   // 'rect', 'circle', 'oval', 'hexagon', 'heart', 'shield', 'star', 'arch'
    removeCanvasBg: false,  // True die-cut model-only mode: removes Slot 0 base canvas & punched holes
    nfcPocket: false,       // 26mm x 0.6mm backside NFC tag cavity
    detailSharpness: 5,     // 0 to 10 unsharp mask
    subjectPop: 25,         // -50 to +50
    colorSnap: 80,          // 10 to 100%
    preserveEyes: true,
    gamma: 1.0,             // 0.4 to 2.2 (Midtone gamma curve)
    shadowLift: 0,          // 0 to 40% (Shadow black point lift to prevent bottom crushing)
    highlightCeiling: 100,  // 60 to 100% (Highlight white point cap to prevent top plateau)
    vibrance: 0,            // -50 to +100% (Color saturation and chroma boost)
    boundarySharpness: 80,  // 10 to 100% (Steepness of color transitions)
    despeckleRadius: 0,     // 0 (Off), 1 (1px island), 2 (2px), 3 (3px)
    layerQuantizeStep: 0,   // 0 (Smooth continuous), 0.04, 0.08, 0.12 (Physical layer height discretization)
    nozzleSize: 0.4,        // 0.2, 0.4, 0.6 mm for nozzle inspection
    ironingSimulation: false, // Top surface ironing specular smoothing
    overhangWarning: false, // Slope > 45° warning in 3D viewport
    zebraExposure: false,   // Clipping inspector (over/underexposure)
    frameStyle: 'none',
    mounting: 'flat',
    opticalModel: 'beer_lambert',
    exportQuality: 'hd',
    exportQuantize: true,
    exportIncludeFrame: true,
    adaptiveMesh: true,
    lightboxKelvin: 4000
};

// Official Real-World Commercial Filament Spools Catalog (Bambu Lab, Polymaker, eSUN, Prusament)
const REAL_FILAMENT_CATALOG = [
    { brand: "Bambu Lab", name: "Bambu Matte Charcoal Black", color: "#111317", td: 0.5 },
    { brand: "Bambu Lab", name: "Bambu Basic Black", color: "#09090b", td: 0.6 },
    { brand: "Bambu Lab", name: "Bambu Basic Dark Grey", color: "#334155", td: 1.4 },
    { brand: "Bambu Lab", name: "Bambu Matte Ash Grey", color: "#64748b", td: 2.0 },
    { brand: "Bambu Lab", name: "Bambu Basic Silver Grey", color: "#94a3b8", td: 2.2 },
    { brand: "Bambu Lab", name: "Bambu Matte Ivory White", color: "#f8fafc", td: 4.2 },
    { brand: "Bambu Lab", name: "Bambu Basic Jade White", color: "#ffffff", td: 5.2 },
    { brand: "Bambu Lab", name: "Bambu Matte Dark Chocolate", color: "#3b1d0f", td: 1.2 },
    { brand: "Bambu Lab", name: "Bambu Matte Latte Brown", color: "#7c4a2d", td: 2.5 },
    { brand: "Bambu Lab", name: "Bambu Matte Caramel", color: "#b46535", td: 3.1 },
    { brand: "Bambu Lab", name: "Bambu Matte Desert Tan", color: "#d6a77a", td: 3.4 },
    { brand: "Bambu Lab", name: "Bambu Basic Warm Skin Beige", color: "#eab693", td: 3.8 },
    { brand: "Bambu Lab", name: "Bambu Matte Mandarin Orange", color: "#ea580c", td: 3.5 },
    { brand: "Bambu Lab", name: "Bambu Basic Pumpkin Orange", color: "#f97316", td: 4.0 },
    { brand: "Bambu Lab", name: "Bambu Basic Sunflower Yellow", color: "#eab308", td: 4.8 },
    { brand: "Bambu Lab", name: "Bambu Matte Lemon Yellow", color: "#facc15", td: 4.5 },
    { brand: "Bambu Lab", name: "Bambu Matte Scarlet Red", color: "#dc2626", td: 2.7 },
    { brand: "Bambu Lab", name: "Bambu Basic Crimson Red", color: "#991b1b", td: 2.1 },
    { brand: "Bambu Lab", name: "Bambu Matte Sakura Pink", color: "#f472b6", td: 3.6 },
    { brand: "Bambu Lab", name: "Bambu Basic Magenta", color: "#db2777", td: 2.8 },
    { brand: "Bambu Lab", name: "Bambu Basic Mistletoe Green", color: "#15803d", td: 2.4 },
    { brand: "Bambu Lab", name: "Bambu Basic Bambu Green", color: "#22c55e", td: 3.2 },
    { brand: "Bambu Lab", name: "Bambu Matte Dark Forest", color: "#064e3b", td: 1.5 },
    { brand: "Bambu Lab", name: "Bambu Basic Cobalt Blue", color: "#1d4ed8", td: 2.3 },
    { brand: "Bambu Lab", name: "Bambu Matte Marine Blue", color: "#0284c7", td: 2.8 },
    { brand: "Bambu Lab", name: "Bambu Basic Cyan Sky", color: "#38bdf8", td: 3.6 },
    { brand: "Bambu Lab", name: "Bambu MatteMidnight Navy", color: "#0f172a", td: 0.9 },
    { brand: "Bambu Lab", name: "Bambu Basic Indigo Purple", color: "#7c3aed", td: 2.2 },
    { brand: "Polymaker", name: "PolyTerra Charcoal Black", color: "#141416", td: 0.5 },
    { brand: "Polymaker", name: "PolyTerra Peach Skin", color: "#f3bfa1", td: 3.6 },
    { brand: "Polymaker", name: "PolyTerra Muted Terracotta", color: "#c2593f", td: 2.4 },
    { brand: "Polymaker", name: "PolyTerra Cotton White", color: "#fcfcfc", td: 4.6 },
    { brand: "eSUN", name: "eSUN PLA+ Bone White", color: "#fef3c7", td: 3.9 },
    { brand: "eSUN", name: "eSUN PLA+ Warm Skin", color: "#e5a882", td: 3.7 },
    { brand: "eSUN", name: "eSUN PLA+ Cold White", color: "#ffffff", td: 5.4 }
];

// Calibrated Default Palette: Tiger Wildlife Colors (Solves the user's tiger painting!)
let filaments = [
    { id: 1, name: "Obsidian Black (Stripes/Pupils)", color: "#09090b", startPct: 0.0, td: 0.5, targetFeature: "Stripes, Pupils & Deep Shadows" },
    { id: 2, name: "Jungle Green (Leaves/Background)", color: "#15803d", startPct: 0.25, td: 2.8, targetFeature: "Foliage, Leaves & Background" },
    { id: 3, name: "Tiger Tawny Orange (Body Fur)", color: "#ea580c", startPct: 0.50, td: 3.5, targetFeature: "Tiger Body, Fur & Face" },
    { id: 4, name: "Amber Gold (Eyes/Highlights)", color: "#eab308", startPct: 0.72, td: 4.5, targetFeature: "Tiger Eyes & Warm Highlights" },
    { id: 5, name: "Pearl White (Chest/Whiskers)", color: "#f8fafc", startPct: 0.88, td: 6.0, targetFeature: "White Chest, Muzzle & Whiskers" }
];

let eyedropperColor = "#ea580c";
let isColorMapMode = false;
let aiPalettesList = [];

let sourceImage = null;
let sourceCanvas = document.createElement('canvas');
let processedCanvas = document.createElement('canvas');
let colorDataBuffer = null; // Uint8ClampedArray of true RGB colors

// Studio Mode & 2D Editor State
let studioMode = 'photo'; // 'photo' | 'draw'
let centerViewMode = '3d'; // '3d' | '2d'
let activeEditorTool = 'heal'; // 'heal' | 'brush' | 'fill' | 'recolor' | 'rect' | 'circle' | 'line' | 'text' | 'cutout' | 'fx'
let activeFilamentSlot = 2; // 0..4
let editorBrushRadius = 4;
let editorFillTolerance = 38;
let is3DRecolorMode = false;
let isEditorInteracting = false;
let editorStartX = 0, editorStartY = 0;
let editorLastX = 0, editorLastY = 0;
const historyStack = [];
const redoStack = [];
let historyIndex = -1;
const MAX_HISTORY = 30;
let editorCanvas = null;
let editorCtx = null;
let isDrawingTemplateActive = false;
let filamentSlotBuffer = null;
let customZDeltaBuffer = null;
let cutoutMaskBuffer = null; // Uint8Array: 1 = physical through-hole void, 0 = solid
let userEditMaskBuffer = null; // Uint8Array: 1 = user-authored 2D/3D edit preserved across photo adjustments
let lastProcessedMeta = null; // Tracks { sourceRef, rotation, flipX, flipY, cols, rows }
let isCanvasUserEdited = false;
let editorSymmetryMode = 'none'; // 'none' | 'x' | 'y' | 'quad' | 'mandala'
let activeVectorStamp = 'heart';
let activeCADShapeType = 'rect';
let customLogoStampCanvas = null;
let preLiveToolBackup = null;
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
let editorStampState = {
    posX: null,
    posY: null,
    hasLivePreview: false
};
let editorPatternState = {
    posX: null,
    posY: null,
    hasLivePreview: false
};

// Three.js Scene Variables
let scene, camera, renderer, controls;
let reliefMesh = null;
let frameMesh = null;
let qr3DMesh = null;
let activeQRStamp = null;
let preQRBackup = null;
let activeSoundwave = null;
let preSoundwaveBackup = null;
let customAudioBars = null;
let isWireframe = false;
let isLightbox = false;
let studioLights = [];
let backlightLight = null;

// Slicer Simulation state
let clipPlane = null;
let isSlicerSimulationActive = false;
let slicerAnimationTimer = null;
let currentSimLayer = 30;

