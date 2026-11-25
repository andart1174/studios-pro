// ═══════════════════════════════════════════════════════
//  VECTOR CNC STUDIO PRO — Core Application Engine (app.js)
//  Fixed: Half-Kerf/Bit Offset, Multi-Pass Tabs + Modal F,
//  Post-Processors (GRBL M4/K40/Router/Mach3/LinuxCNC/Marlin),
//  Z-up STL, Linear-RGB AR, Grid/Nesting mm Scaling, Real DPI,
//  Valid PDF XREF & TIFF, DXF+SVG Import, Undo/Redo, LightBurn
//  Layers, Hover Eraser, Non-Destructive Transform, Sealed Paywall
// ═══════════════════════════════════════════════════════

const LANG = {
  en: {
    invalidFile: 'Unsupported file. Use SVG, DXF, SPCNC, PNG, JPG, BMP, WebP, TIFF',
    imageLoaded: 'Loaded:',
    noImage: 'Please load an image, SVG or DXF first!',
    processing: 'Processing vector toolpaths…',
    pathsVectorized: 'paths vectorized!',
    vectorError: 'Vectorization error',
    noVector: 'Please vectorize or import vectors first!',
    exportPreview: 'Preparing export…',
    batchExport: 'Building Batch ZIP…',
    downloadReady: 'Download ready!',
    undoDone: 'Undo applied',
    redoDone: 'Redo applied',
    nothingUndo: 'Nothing to undo',
    nothingRedo: 'Nothing to redo',
    projectSaved: 'Project (.spcnc) saved!',
    projectLoaded: 'Project (.spcnc) loaded!',
    dxfLoaded: 'DXF CAD Imported:',
    svgLoaded: 'SVG Imported:',
    textAdded: 'CNC vector text added!'
  },
  fr: {
    invalidFile: 'Fichier non supporté. Formats : SVG, DXF, SPCNC, PNG, JPG, BMP, WebP, TIFF',
    imageLoaded: 'Chargé :',
    noImage: 'Veuillez d\'abord charger une image, SVG ou DXF !',
    processing: 'Calcul des tracés vectoriels…',
    pathsVectorized: 'tracés vectorisés !',
    vectorError: 'Erreur de vectorisation',
    noVector: 'Veuillez d\'abord vectoriser ou importer un fichier !',
    exportPreview: 'Préparation de l\'export…',
    batchExport: 'Génération du ZIP…',
    downloadReady: 'Téléchargement prêt !',
    undoDone: 'Annulation effectuée',
    redoDone: 'Rétablissement effectué',
    nothingUndo: 'Rien à annuler',
    nothingRedo: 'Rien à rétablir',
    projectSaved: 'Projet (.spcnc) enregistré !',
    projectLoaded: 'Projet (.spcnc) chargé !',
    dxfLoaded: 'CAO DXF importé :',
    svgLoaded: 'SVG importé :',
    textAdded: 'Texte vectoriel CNC ajouté !'
  }
};

let currentLang = 'en';
function t(key) { return (LANG[currentLang] || LANG.en)[key] || key; }
function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function escXml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ═══════════════════════════════════════════════════════
// STUDIOS-PRO BRIDGE & SEALED PAYWALL GATE (5 FREE EXPORTS)
// ═══════════════════════════════════════════════════════
const StudiosProGate = (() => {
  let channel = null;
  try { channel = new BroadcastChannel('studios_pro_channel'); } catch (_) {}
  let isPremiumUser = false;
  let pendingResolver = null;
  let isWaiting = false;

  const isStandalone = () => window.self === window.top;

  function initBridge() {
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        if (isStandalone()) {
          window.location.href = '/';
          return;
        }
        try { channel && channel.postMessage({ type: 'CLOSE_STUDIO' }); } catch (_) {}
        try { window.parent.postMessage({ type: 'CLOSE_STUDIO' }, '*'); } catch (_) {}
      });
    }

    const localModal = document.getElementById('local-payment-modal');
    if (localModal) {
      const closeBtn = document.getElementById('modal-close-btn');
      if (closeBtn) closeBtn.onclick = () => {
        localModal.classList.remove('show');
        if (pendingResolver) { const r = pendingResolver; pendingResolver = null; isWaiting = false; r(false); }
      };
      const payPrem = document.getElementById('pay-premium-btn');
      if (payPrem) payPrem.onclick = () => {
        try { channel && channel.postMessage({ type: 'START_STRIPE_PAYMENT', payload: { type: 'premium', ref: 'vcnc' } }); } catch (_) {}
        if (isStandalone()) window.location.href = '/?upgrade=premium&ref=vcnc';
        localModal.classList.remove('show');
        if (pendingResolver) { const r = pendingResolver; pendingResolver = null; isWaiting = false; r(false); }
      };
    }

    if (channel) {
      channel.onmessage = (e) => {
        if (!e.data || !e.data.type) return;
        const { type, payload } = e.data;
        if (type === 'EXPORT_ALLOWED') {
          isPremiumUser = !!(payload && payload.isPremium);
          window.isPremiumUser = isPremiumUser;
          if (localModal) localModal.classList.remove('show');
          if (pendingResolver) {
            const r = pendingResolver; pendingResolver = null; isWaiting = false; r(true);
          }
        } else if (type === 'USER_STATUS_RESPONSE') {
          isPremiumUser = !!(payload && payload.isPremium);
          window.isPremiumUser = isPremiumUser;
        } else if (type === 'LOAD_EXTERNAL_FILE') {
          handleExternalFilePayload(payload);
        } else if (type === 'LOAD_EXTERNAL_URL') {
          handleExternalUrlPayload(payload);
        }
      };
      try { channel.postMessage({ type: 'GET_USER_STATUS' }); } catch (_) {}
    }
  }

  async function handleExternalFilePayload(payload) {
    try {
      const { name, extension, data, isBinary } = payload || {};
      let file;
      if (isBinary) {
        const res = await fetch(data);
        const blob = await res.blob();
        file = new File([blob], name || ('imported.' + (extension || 'png')), { type: blob.type || 'image/png' });
      } else {
        const ext = (extension || 'svg').toLowerCase();
        file = new File([data], name || ('imported.' + ext), { type: ext === 'svg' ? 'image/svg+xml' : 'text/plain' });
      }
      if (window.App && window.App.loadFile) window.App.loadFile(file);
    } catch (err) { console.error('LOAD_EXTERNAL_FILE error:', err); }
  }

  async function handleExternalUrlPayload(payload) {
    try {
      const { url, name, extension } = payload || {};
      if (!url) return;
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const blob = await res.blob();
      const file = new File([blob], name || ('imported.' + (extension || 'png')), { type: blob.type || 'image/png' });
      if (window.App && window.App.loadFile) window.App.loadFile(file);
    } catch (err) { console.error('LOAD_EXTERNAL_URL error:', err); }
  }

  // Returns { allowed: boolean, consume: () => void } so credits are ONLY consumed on successful export!
  async function requestExportAccess() {
    if (isPremiumUser || window.isPremiumUser) {
      return { allowed: true, consume: () => {} };
    }
    if (isStandalone()) {
      const used = Math.max(0, parseInt(localStorage.getItem('freeExportsUsed') || '0', 10) || 0);
      if (used < 5) {
        return {
          allowed: true,
          consume: () => {
            const next = Math.max(0, parseInt(localStorage.getItem('freeExportsUsed') || '0', 10) || 0) + 1;
            localStorage.setItem('freeExportsUsed', String(next));
          }
        };
      }
      const localModal = document.getElementById('local-payment-modal');
      if (localModal) localModal.classList.add('show');
      return { allowed: false, consume: () => {} };
    }

    // Embedded inside Studios-Pro parent iframe -> ask parent via BroadcastChannel
    if (isWaiting) return { allowed: false, consume: () => {} };
    isWaiting = true;
    const ok = await new Promise((resolve) => {
      pendingResolver = resolve;
      try { channel && channel.postMessage({ type: 'TRIGGER_PAYMENT_MODAL', payload: { ref: 'vcnc' } }); } catch (_) { isWaiting = false; pendingResolver = null; resolve(false); }
      setTimeout(() => {
        if (pendingResolver === resolve) { pendingResolver = null; isWaiting = false; resolve(false); }
      }, 25000);
    });
    return {
      allowed: ok,
      consume: () => {
        if (ok) {
          try { channel && channel.postMessage({ type: 'EXPORT_COMPLETED', payload: { ref: 'vcnc' } }); } catch (_) {}
        }
      }
    };
  }

  return { initBridge, requestExportAccess };
})();

// ═══════════════════════════════════════════════════════
// MAIN APPLICATION
// ═══════════════════════════════════════════════════════
const App = (() => {
  const MAX_HISTORY = 25;

  const state = {
    rawSourceCanvas: null,   // Clean untouched color source (for non-destructive Rotate/Flip/Filter!)
    originalCanvas: null,    // Filtered display/trace canvas
    sourceKind: 'none',      // 'none' | 'image' | 'svg' | 'dxf' | 'text'
    sourceFileName: '',
    vectorPaths: [],
    vectorDims: { w: 0, h: 0 },
    svgOutput: '',
    zoom: 1,
    panX: 0,
    panY: 0,
    hoverPathRef: null,      // { layerIdx, pathIdx } for live red hover highlight in Eraser mode
    undoStack: [],
    redoStack: [],
    nestedOverride: null,    // Optional active Auto-Nesting layout
    layerOps: { holes: 'cut', outers: 'cut', open: 'score' },
    layerVis: { holes: true, outers: true, open: true },
    settings: {
      brightness: 0, contrast: 0, blur: 0,
      threshold: 128, invert: false, grayscale: true, adaptive: false,
      mode: 'contour',       // edge | contour | centerline | halftone | color
      detail: 1.5,
      smoothing: 2,
      minArea: 20,
      maxArea: 9999999,
      colorCount: 4,
      bezier: false,
      hatch: false,
      hatchSpacing: 2.5,
      // CNC / Laser CAM
      cncType: 'laser',      // laser | router
      postProcessor: 'grbl-laser', // grbl-laser | grbl-k40 | grbl-router | mach3 | linuxcnc | marlin
      material: 'wood',
      laserPower: 80,
      speed: 1000,
      spindleRpm: 12000,
      passes: 1,
      kerf: 0.15,
      bitDiameter: 3.175,
      profileSide: 'auto',   // auto | outside | inside | on
      dogbone: 'none',       // none | dogbone | tbone
      pocket: false,
      pocketStepover: 55,
      cutDepth: 3.0,
      stepDown: 1.5,
      safeZ: 5.0,
      rampPlunge: true,
      airAssist: true,
      tabs: false,
      tabCount: 4,
      tabWidth: 4.0,
      tabHeight: 1.2,
      tsp: true,
      units: 'mm',
      machine: 'ortur',
      bedW: 400,
      bedH: 400,
      extrudeDepth: 6.0,
      extrudeBacking: false
    },
    exportSettings: {
      width: null, height: null, unit: 'mm', lockAspect: true,
      brightness: 0, contrast: 0,
      transparent: false, watermark: false, bmp8bit: false,
      dpi: 300, jpegQuality: 0.9, dither: 'none'
    },
    stats: { paths: 0, nodes: 0, width: 0, height: 0 },
    processing: false,
    eraserMode: false
  };

  const $ = id => document.getElementById(id);
  let liveVecTimer = null;
  let simRafId = null;

  const MATERIAL_PRESETS = {
    wood:    { laserPower: 80, speed: 800,  passes: 2, kerf: 0.15, cutDepth: 4.0, stepDown: 1.5, spindleRpm: 14000 },
    acrylic: { laserPower: 75, speed: 600,  passes: 1, kerf: 0.18, cutDepth: 3.0, stepDown: 1.0, spindleRpm: 12000 },
    metal:   { laserPower: 100, speed: 300, passes: 3, kerf: 0.08, cutDepth: 1.5, stepDown: 0.4, spindleRpm: 10000 },
    leather: { laserPower: 50, speed: 1000, passes: 1, kerf: 0.10, cutDepth: 2.0, stepDown: 1.0, spindleRpm: 12000 },
    foam:    { laserPower: 30, speed: 1500, passes: 1, kerf: 0.05, cutDepth: 6.0, stepDown: 3.0, spindleRpm: 16000 },
    paper:   { laserPower: 22, speed: 2000, passes: 1, kerf: 0.05, cutDepth: 0.5, stepDown: 0.5, spindleRpm: 12000 }
  };

  const MACHINE_PRESETS = {
    generic:   { post: 'grbl-laser', laserPower: 80,  speed: 1000, bedW: 400, bedH: 400 },
    k40:       { post: 'grbl-k40',   laserPower: 50,  speed: 600,  bedW: 300, bedH: 200 },
    ortur:     { post: 'grbl-laser', laserPower: 90,  speed: 1200, bedW: 400, bedH: 400 },
    xtool:     { post: 'grbl-laser', laserPower: 100, speed: 900,  bedW: 430, bedH: 400 },
    sculpfun:  { post: 'grbl-laser', laserPower: 85,  speed: 1100, bedW: 410, bedH: 400 },
    lightburn: { post: 'grbl-laser', laserPower: 75,  speed: 1400, bedW: 600, bedH: 400 },
    shapeoko:  { post: 'grbl-router', laserPower: 80, speed: 1200, bedW: 420, bedH: 420, cncType: 'router' },
    mach3cnc:  { post: 'mach3',       laserPower: 80, speed: 1000, bedW: 600, bedH: 400, cncType: 'router' }
  };

  const POST_LABELS = {
    'grbl-laser':  'GRBL 1.1+ Laser (M4 Dynamic)',
    'grbl-k40':    'GRBL 0.9 / K40 CO2 (M3 S255)',
    'grbl-router': 'GRBL 2.5D CNC Router',
    'mach3':       'Mach3 / Mach4 (.nc)',
    'linuxcnc':    'LinuxCNC (.ngc)',
    'marlin':      'Marlin CNC / Laser'
  };

  function init() {
    StudiosProGate.initBridge();
    setupUpload();
    setupTabs();
    setupControls();
    setupMaterials();
    setupMachinePresets();
    setupExportControls();
    setupExports();
    setupZoomAndPan();
    setupEraser();
    setupProjectIO();
    setupMobileSwitcher();
    updateUndoRedoButtons();
    // Auto-load Bracket demo gently only if requested via URL ?demo=..., else keep ready!
    const params = new URLSearchParams(window.location.search);
    const demo = params.get('demo');
    if (demo) loadDemoPreset(demo);
  }

  // ═══════════════════════════════════════════════════════
  // UNDO / REDO SNAPSHOT ENGINE (25 STEPS)
  // ═══════════════════════════════════════════════════════
  function cloneVectorData(paths, isColor) {
    if (!paths) return [];
    const copyP = (p) => {
      const np = p.map(pt => [pt[0], pt[1]]);
      np.closed = p.closed; np.color = p.color; np.operation = p.operation; np.isHole = p.isHole;
      return np;
    };
    if (isColor) {
      return paths.map(l => {
        const nl = l.map(copyP);
        nl.colorData = l.colorData; nl.colorName = l.colorName;
        nl.visible = l.visible !== false; nl.operation = l.operation || 'cut';
        return nl;
      });
    }
    return paths.map(copyP);
  }

  function pushUndoSnapshot() {
    const isColor = state.settings.mode === 'color';
    state.undoStack.push({
      paths: cloneVectorData(state.vectorPaths, isColor),
      dims: { ...state.vectorDims },
      mode: state.settings.mode,
      layerOps: { ...state.layerOps },
      layerVis: { ...state.layerVis }
    });
    if (state.undoStack.length > MAX_HISTORY) state.undoStack.shift();
    state.redoStack = [];
    updateUndoRedoButtons();
  }

  function applySnapshot(snap) {
    state.settings.mode = snap.mode;
    state.vectorPaths = snap.paths;
    state.vectorDims = { ...snap.dims };
    state.layerOps = { ...snap.layerOps };
    state.layerVis = { ...snap.layerVis };
    state.nestedOverride = null;
    syncModeChipsUI();
    recomputeStatsFromPaths();
    const w = state.vectorDims.w || 500, h = state.vectorDims.h || 500;
    state.svgOutput = buildSVG(state.vectorPaths, w, h);
    drawVectorPreview(state.vectorPaths, w, h);
    updateStats();
    updateLayers(state.vectorPaths);
    enableExports(state.vectorPaths.length > 0);
    updateUndoRedoButtons();
  }

  function undo() {
    if (!state.undoStack.length) { toast(t('nothingUndo'), 'info'); return; }
    const isColor = state.settings.mode === 'color';
    state.redoStack.push({
      paths: cloneVectorData(state.vectorPaths, isColor),
      dims: { ...state.vectorDims },
      mode: state.settings.mode,
      layerOps: { ...state.layerOps },
      layerVis: { ...state.layerVis }
    });
    applySnapshot(state.undoStack.pop());
    toast('↩️ ' + t('undoDone'), 'info');
  }

  function redo() {
    if (!state.redoStack.length) { toast(t('nothingRedo'), 'info'); return; }
    const isColor = state.settings.mode === 'color';
    state.undoStack.push({
      paths: cloneVectorData(state.vectorPaths, isColor),
      dims: { ...state.vectorDims },
      mode: state.settings.mode,
      layerOps: { ...state.layerOps },
      layerVis: { ...state.layerVis }
    });
    applySnapshot(state.redoStack.pop());
    toast('↪️ ' + t('redoDone'), 'info');
  }

  function updateUndoRedoButtons() {
    if ($('btnUndo')) $('btnUndo').disabled = state.undoStack.length === 0;
    if ($('btnRedo')) $('btnRedo').disabled = state.redoStack.length === 0;
  }

  function syncModeChipsUI() {
    document.querySelectorAll('.mode-chip[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === state.settings.mode));
    if ($('colorOptions')) $('colorOptions').style.display = state.settings.mode === 'color' ? 'block' : 'none';
  }

  function syncCncTypeUI() {
    document.querySelectorAll('.mode-chip[data-cnc-type]').forEach(b => b.classList.toggle('active', b.dataset.cncType === state.settings.cncType));
    if ($('routerOptions')) $('routerOptions').style.display = state.settings.cncType === 'router' ? 'block' : 'none';
    if ($('laserOnlyOptions')) $('laserOnlyOptions').style.display = state.settings.cncType === 'laser' ? 'block' : 'none';
  }

  // ═══════════════════════════════════════════════════════
  // UPLOAD: PHOTO + SVG + NATIVE DXF + .SPCNC PROJECT + DEMO PRESETS
  // ═══════════════════════════════════════════════════════
  function setupUpload() {
    const zone = $('uploadZone');
    const input = $('fileInput');
    if (zone && input) {
      zone.addEventListener('click', (e) => {
        if (e.target && e.target.closest && e.target.closest('.btn-upload')) return;
        input.click();
      });
      zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
      zone.addEventListener('drop', e => {
        e.preventDefault(); zone.classList.remove('drag-over');
        const f = e.dataTransfer.files[0];
        if (f) loadFile(f);
      });
      input.addEventListener('change', () => {
        if (input.files[0]) loadFile(input.files[0]);
        input.value = '';
      });
    }
    document.querySelectorAll('.demo-chip[data-demo]').forEach(btn => {
      btn.addEventListener('click', () => loadDemoPreset(btn.dataset.demo));
    });
  }

  function loadDemoPreset(key) {
    const cv = document.createElement('canvas');
    cv.width = 560; cv.height = 440;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cv.width, cv.height);

    if (key === 'gear') {
      const cx = 280, cy = 220, teeth = 16, rOuter = 170, rRoot = 138;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      for (let i = 0; i < teeth * 4; i++) {
        const idx = Math.floor(i / 4), sub = i % 4;
        const baseA = (idx / teeth) * Math.PI * 2, step = (Math.PI * 2) / teeth;
        let a = baseA, rad = rRoot;
        if (sub === 1) { a = baseA + step * 0.14; rad = rOuter; }
        else if (sub === 2) { a = baseA + step * 0.42; rad = rOuter; }
        else if (sub === 3) { a = baseA + step * 0.56; rad = rRoot; }
        const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.moveTo(cx + 38, cy); ctx.arc(cx, cy, 38, 0, Math.PI * 2, true);
      for (let k = 0; k < 6; k++) {
        const ang = (k / 6) * Math.PI * 2;
        const hx = cx + Math.cos(ang) * 88, hy = cy + Math.sin(ang) * 88;
        ctx.moveTo(hx + 20, hy); ctx.arc(hx, hy, 20, 0, Math.PI * 2, true);
      }
      ctx.fill('evenodd');
    } else if (key === 'emblem') {
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.moveTo(150, 70); ctx.lineTo(410, 70); ctx.lineTo(410, 225);
      ctx.quadraticCurveTo(410, 330, 280, 395); ctx.quadraticCurveTo(150, 330, 150, 225);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#0ea5e9';
      ctx.beginPath();
      ctx.moveTo(185, 105); ctx.lineTo(375, 105); ctx.lineTo(375, 215);
      ctx.quadraticCurveTo(375, 295, 280, 350); ctx.quadraticCurveTo(185, 295, 185, 215);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5 - Math.PI / 2, r = i % 2 === 0 ? 78 : 34;
        const x = 280 + Math.cos(a) * r, y = 215 + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(280, 215, 18, 0, Math.PI * 2); ctx.fill();
    } else {
      // Precision CAD L-Bracket with fillets, mounting holes & dogbone slot
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.moveTo(85, 65); ctx.lineTo(465, 65); ctx.quadraticCurveTo(495, 65, 495, 95);
      ctx.lineTo(495, 185); ctx.quadraticCurveTo(495, 215, 465, 215);
      ctx.lineTo(255, 215); ctx.quadraticCurveTo(225, 215, 225, 245);
      ctx.lineTo(225, 345); ctx.quadraticCurveTo(225, 375, 195, 375);
      ctx.lineTo(85, 375); ctx.quadraticCurveTo(55, 375, 55, 345);
      ctx.lineTo(55, 95); ctx.quadraticCurveTo(55, 65, 85, 65);
      ctx.closePath();
      [[115, 125, 22], [115, 315, 22], [435, 140, 22]].forEach(([hx, hy, hr]) => {
        ctx.moveTo(hx + hr, hy); ctx.arc(hx, hy, hr, 0, Math.PI * 2, true);
      });
      ctx.moveTo(260, 122); ctx.lineTo(360, 122);
      ctx.arc(360, 140, 18, -Math.PI / 2, Math.PI / 2, false);
      ctx.lineTo(260, 158);
      ctx.arc(260, 140, 18, Math.PI / 2, -Math.PI / 2, false);
      ctx.closePath();
      ctx.fill('evenodd');
    }

    state.sourceKind = 'image';
    state.sourceFileName = 'demo-' + key + '.png';
    state.nestedOverride = null;
    state.undoStack = []; state.redoStack = [];
    setRawSourceFromCanvas(cv);
    if (key === 'emblem') {
      state.settings.mode = 'color';
      state.settings.colorCount = 4;
      if ($('colorCount')) $('colorCount').value = '4';
      if ($('colorCountVal')) $('colorCountVal').textContent = '4';
    } else {
      state.settings.mode = 'contour';
    }
    syncModeChipsUI();
    updateFileInfoUI(state.sourceFileName, Math.round(cv.toDataURL('image/png').length * 0.75 / 1024) + ' KB', cv.width, cv.height);
    enableImageExports(true);
    vectorize(false);
    if (window.Features && window.Features.onImageLoaded) window.Features.onImageLoaded(state.sourceFileName, state.rawSourceCanvas);
  }

  function setRawSourceFromCanvas(srcCv) {
    const MAX = 960;
    let w = srcCv.width, h = srcCv.height;
    if (w > MAX || h > MAX) {
      const r = Math.min(MAX / w, MAX / h);
      w = Math.max(1, Math.round(w * r));
      h = Math.max(1, Math.round(h * r));
    }
    const raw = document.createElement('canvas');
    raw.width = w; raw.height = h;
    const rCtx = raw.getContext('2d');
    // Composite transparent PNGs onto crisp pure white background!
    rCtx.fillStyle = '#ffffff';
    rCtx.fillRect(0, 0, w, h);
    rCtx.drawImage(srcCv, 0, 0, w, h);
    state.rawSourceCanvas = raw;
    state.stats.width = w;
    state.stats.height = h;

    const cv = $('canvasOrig');
    if (cv) {
      cv.width = w; cv.height = h;
      state.originalCanvas = cv;
      applyFilters(cv, cv.getContext('2d'));
      if ($('uploadPlaceholder')) $('uploadPlaceholder').style.display = 'none';
      cv.style.display = 'block';
    }
  }

  function updateFileInfoUI(name, sizeStr, w, h) {
    if ($('fileName')) $('fileName').textContent = name;
    if ($('fileSize')) $('fileSize').textContent = sizeStr;
    if ($('fileDims')) $('fileDims').textContent = w + ' × ' + h;
    if ($('fileInfo')) $('fileInfo').style.display = 'block';
    if ($('btnVectorize')) $('btnVectorize').disabled = false;
    if ($('btnClear')) $('btnClear').disabled = false;
  }

  function loadFile(file) {
    if (!file) return;
    const lname = (file.name || '').toLowerCase();

    // 1. Native .SPCNC Project file
    if (lname.endsWith('.spcnc') || lname.endsWith('.json')) {
      const r = new FileReader();
      r.onload = (ev) => loadProjectJson(ev.target.result);
      r.readAsText(file);
      return;
    }

    // 2. Native CAD .DXF Import!
    if (lname.endsWith('.dxf')) {
      const r = new FileReader();
      r.onload = (ev) => {
        try {
          const parsed = window.VectorEngine.parseDXF(ev.target.result);
          state.sourceKind = 'dxf';
          state.sourceFileName = file.name;
          state.nestedOverride = null;
          state.undoStack = []; state.redoStack = [];
          const hasMultiLayer = parsed.layers.length > 1;
          state.settings.mode = hasMultiLayer ? 'color' : 'contour';
          syncModeChipsUI();

          // Render clean raster preview into rawSourceCanvas so Compare/Adjust/Image export also work!
          const cv = document.createElement('canvas');
          cv.width = parsed.w; cv.height = parsed.h;
          const ctx = cv.getContext('2d');
          ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cv.width, cv.height);
          if (hasMultiLayer) {
            parsed.layers.forEach(l => window.VectorEngine.drawPathsOnCtx(ctx, l, false, 'none', l.colorData || '#111111', true));
          } else {
            window.VectorEngine.drawPathsOnCtx(ctx, parsed.paths, false, 'none', '#111111', true);
          }
          setRawSourceFromCanvas(cv);

          // Set true physical mm dimensions from DXF!
          state.exportSettings.unit = 'mm';
          state.exportSettings.width = Math.round(parsed.physWmm * 10) / 10;
          state.exportSettings.height = Math.round(parsed.physHmm * 10) / 10;
          if ($('exportSizeUnit')) $('exportSizeUnit').value = 'mm';
          if ($('exportWidth')) $('exportWidth').value = state.exportSettings.width;
          if ($('exportHeight')) $('exportHeight').value = state.exportSettings.height;

          state.vectorPaths = hasMultiLayer ? parsed.layers : parsed.paths;
          state.vectorDims = { w: parsed.w, h: parsed.h };
          recomputeStatsFromPaths();
          state.svgOutput = buildSVG(state.vectorPaths, parsed.w, parsed.h);
          drawVectorPreview(state.vectorPaths, parsed.w, parsed.h);
          updateFileInfoUI(file.name, (file.size / 1024).toFixed(1) + ' KB', parsed.w, parsed.h);
          updateStats();
          updateLayers(state.vectorPaths);
          enableImageExports(true);
          enableExports(true);
          setTab('cnc');
          toast(`✅ ${t('dxfLoaded')} ${state.stats.paths} (${parsed.physWmm.toFixed(1)}×${parsed.physHmm.toFixed(1)} mm)`, 'success');
        } catch (err) {
          console.error(err);
          toast('DXF Error: ' + err.message, 'error');
        }
      };
      r.readAsText(file);
      return;
    }

    // 3. Direct SVG Import (preserves colors, mm dims, safe fallback on img.onerror!)
    const isSvg = lname.endsWith('.svg') || file.type === 'image/svg+xml';
    if (isSvg && window.VectorEngine) {
      const txtReader = new FileReader();
      txtReader.onload = (ev) => {
        try {
          const svgText = ev.target.result;
          const parsed = window.VectorEngine.parseSVG(svgText);
          state.sourceKind = 'svg';
          state.sourceFileName = file.name;
          state.nestedOverride = null;
          state.undoStack = []; state.redoStack = [];

          const finishSvg = (bgCanvas) => {
            setRawSourceFromCanvas(bgCanvas);
            const cw = state.rawSourceCanvas.width, ch = state.rawSourceCanvas.height;
            const sx = cw / Math.max(1, parsed.w), sy = ch / Math.max(1, parsed.h);
            const scaleArr = (arr) => arr.map(p => {
              const np = p.map(pt => [pt[0] * sx, pt[1] * sy]);
              np.closed = p.closed; np.color = p.color;
              return np;
            });

            if (parsed.physWmm && parsed.physHmm) {
              state.exportSettings.unit = 'mm';
              state.exportSettings.width = Math.round(parsed.physWmm * 10) / 10;
              state.exportSettings.height = Math.round(parsed.physHmm * 10) / 10;
              if ($('exportSizeUnit')) $('exportSizeUnit').value = 'mm';
              if ($('exportWidth')) $('exportWidth').value = state.exportSettings.width;
              if ($('exportHeight')) $('exportHeight').value = state.exportSettings.height;
            }

            if (parsed.colorLayers && parsed.colorLayers.length > 1) {
              state.settings.mode = 'color';
              syncModeChipsUI();
              state.vectorPaths = parsed.colorLayers.map(l => {
                const nl = scaleArr(l);
                nl.colorData = l.colorData; nl.colorName = l.colorName;
                nl.visible = true; nl.operation = 'cut';
                return nl;
              });
            } else if (parsed.paths && parsed.paths.length > 0) {
              state.settings.mode = 'contour';
              syncModeChipsUI();
              state.vectorPaths = scaleArr(parsed.paths);
            } else {
              updateFileInfoUI(file.name, (file.size / 1024).toFixed(1) + ' KB', cw, ch);
              enableImageExports(true);
              vectorize(false);
              return;
            }

            state.vectorDims = { w: cw, h: ch };
            recomputeStatsFromPaths();
            state.svgOutput = buildSVG(state.vectorPaths, cw, ch);
            drawVectorPreview(state.vectorPaths, cw, ch);
            updateFileInfoUI(file.name, (file.size / 1024).toFixed(1) + ' KB', cw, ch);
            updateStats();
            updateLayers(state.vectorPaths);
            enableImageExports(true);
            enableExports(true);
            setTab('vector');
            toast(`✅ ${t('svgLoaded')} ${state.stats.paths} paths`, 'success');
            if (window.Features && window.Features.onImageLoaded) window.Features.onImageLoaded(file.name, state.rawSourceCanvas);
          };

          const buildFallbackCanvas = () => {
            const c = document.createElement('canvas');
            const scale = Math.min(800 / Math.max(1, parsed.w), 800 / Math.max(1, parsed.h), 2);
            c.width = Math.max(64, Math.round(parsed.w * scale));
            c.height = Math.max(64, Math.round(parsed.h * scale));
            const ctx = c.getContext('2d');
            ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
            ctx.scale(scale, scale);
            window.VectorEngine.drawPathsOnCtx(ctx, parsed.paths, false, '#111111', '#111111', false);
            return c;
          };

          const img = new Image();
          img.onload = () => {
            if (img.naturalWidth > 0 && img.naturalHeight > 0) {
              const c = document.createElement('canvas');
              c.width = img.naturalWidth; c.height = img.naturalHeight;
              c.getContext('2d').drawImage(img, 0, 0);
              finishSvg(c);
            } else {
              finishSvg(buildFallbackCanvas());
            }
          };
          img.onerror = () => finishSvg(buildFallbackCanvas());
          img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText);
        } catch (err) {
          console.error(err);
          toast('SVG Error: ' + err.message, 'error');
        }
      };
      txtReader.readAsText(file);
      return;
    }

    // 4. Raster Photo Import
    if (!file.type.startsWith('image/')) { toast(t('invalidFile'), 'error'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const tmp = document.createElement('canvas');
        tmp.width = img.naturalWidth; tmp.height = img.naturalHeight;
        tmp.getContext('2d').drawImage(img, 0, 0);
        state.sourceKind = 'image';
        state.sourceFileName = file.name;
        state.nestedOverride = null;
        state.undoStack = []; state.redoStack = [];
        setRawSourceFromCanvas(tmp);
        updateFileInfoUI(file.name, (file.size / 1024).toFixed(1) + ' KB', img.naturalWidth, img.naturalHeight);
        clearVector();
        enableImageExports(true);
        updateStats();
        setTab('adjust');
        toast(`✅ ${t('imageLoaded')} ${img.naturalWidth}×${img.naturalHeight}px`, 'success');
        if (window.Features && window.Features.onImageLoaded) window.Features.onImageLoaded(file.name, state.rawSourceCanvas);
      };
      img.onerror = () => toast(t('invalidFile'), 'error');
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ═══════════════════════════════════════════════════════
  // IMAGE FILTERS (NON-DESTRUCTIVE + TRANSPARENCY SAFE)
  // ═══════════════════════════════════════════════════════
  function applyFilters(cv, ctx) {
    if (!state.rawSourceCanvas || !cv || !ctx) return;
    const w = cv.width, h = cv.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(state.rawSourceCanvas, 0, 0, w, h);

    const imgData = ctx.getImageData(0, 0, w, h);
    const px = imgData.data;
    const br = (state.settings.brightness || 0) * 2.55;
    const ctVal = (state.settings.contrast || 0);
    const ctFactor = (259 * (ctVal * 2.55 + 255)) / (255 * (259 - ctVal * 2.55));
    const doGray = state.settings.mode !== 'color' && state.settings.grayscale;
    const doInv = !!state.settings.invert;

    for (let i = 0; i < px.length; i += 4) {
      let r = px[i], g = px[i + 1], b = px[i + 2];
      if (br !== 0) { r += br; g += br; b += br; }
      if (ctVal !== 0) {
        r = ctFactor * (r - 128) + 128;
        g = ctFactor * (g - 128) + 128;
        b = ctFactor * (b - 128) + 128;
      }
      r = r < 0 ? 0 : r > 255 ? 255 : r;
      g = g < 0 ? 0 : g > 255 ? 255 : g;
      b = b < 0 ? 0 : b > 255 ? 255 : b;
      if (doGray) {
        const l = 0.299 * r + 0.587 * g + 0.114 * b;
        r = g = b = l;
      }
      if (doInv) { r = 255 - r; g = 255 - g; b = 255 - b; }
      px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
    }

    if (state.settings.blur > 0 && window.VectorEngine) {
      const rad = Math.max(1, Math.min(8, Math.round(state.settings.blur)));
      const n = w * h;
      const ch = new Float32Array(n);
      for (let c = 0; c < 3; c++) {
        for (let i = 0; i < n; i++) ch[i] = px[i * 4 + c];
        const blurred = window.VectorEngine.separableBlur(ch, w, h, rad);
        for (let i = 0; i < n; i++) px[i * 4 + c] = blurred[i];
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  function refreshOriginal() {
    const cv = state.originalCanvas || $('canvasOrig');
    if (!cv || !state.rawSourceCanvas) return;
    applyFilters(cv, cv.getContext('2d'));
    if (window.Features && window.Features.refreshCompare) window.Features.refreshCompare();
  }

  function scheduleLiveVectorize() {
    if (!state.vectorPaths.length || state.sourceKind === 'dxf' || state.sourceKind === 'text') return;
    clearTimeout(liveVecTimer);
    liveVecTimer = setTimeout(() => { vectorize(true); }, 180);
  }

  // ═══════════════════════════════════════════════════════
  // TABS, CONTROLS, MATERIALS & MACHINE PRESETS
  // ═══════════════════════════════════════════════════════
  function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => setTab(btn.dataset.tab));
    });
  }

  function setTab(id) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + id));
  }

  function setupControls() {
    const sliders = [
      ['brightness', 'brightnessVal'], ['contrast', 'contrastVal'],
      ['blur', 'blurVal'], ['threshold', 'thresholdVal'],
      ['detail', 'detailVal'], ['smoothing', 'smoothingVal'],
      ['minArea', 'minAreaVal'], ['colorCount', 'colorCountVal'],
      ['laserPower', 'laserPowerVal'], ['speed', 'speedVal'],
      ['spindleRpm', 'spindleRpmVal'], ['passes', 'passesVal'],
      ['kerf', 'kerfVal'], ['bitDiameter', 'bitDiameterVal'],
      ['hatchSpacing', 'hatchSpacingVal'], ['pocketStepover', 'pocketStepoverVal'],
      ['cutDepth', 'cutDepthVal'], ['stepDown', 'stepDownVal'],
      ['safeZ', 'safeZVal'], ['tabCount', 'tabCountVal'],
      ['tabWidth', 'tabWidthVal'], ['tabHeight', 'tabHeightVal'],
      ['extrudeDepth', 'extrudeDepthVal']
    ];
    sliders.forEach(([sid, vid]) => {
      const sl = $(sid), vl = $(vid);
      if (!sl) return;
      if (vl) vl.textContent = sl.value;
      sl.addEventListener('input', () => {
        if (vl) vl.textContent = sl.value;
        state.settings[sid] = parseFloat(sl.value);
        if (['brightness', 'contrast', 'blur'].includes(sid)) {
          refreshOriginal();
          scheduleLiveVectorize();
        } else if (['threshold', 'detail', 'smoothing', 'minArea', 'colorCount', 'hatchSpacing'].includes(sid)) {
          scheduleLiveVectorize();
        }
      });
    });

    const selects = [
      ['postProcessor', 'postProcessor'],
      ['profileSide', 'profileSide'],
      ['dogboneMode', 'dogbone'],
      ['exportUnits', 'units']
    ];
    selects.forEach(([id, key]) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener('change', () => {
        state.settings[key] = el.value;
        if (id === 'postProcessor') {
          const isR = ['grbl-router', 'mach3', 'linuxcnc'].includes(el.value);
          state.settings.cncType = isR ? 'router' : 'laser';
          syncCncTypeUI();
        }
      });
    });

    // Endmill / Laser Bit quick library
    if ($('bitLibrarySelect')) {
      $('bitLibrarySelect').addEventListener('change', (e) => {
        const val = parseFloat(e.target.value);
        if (val > 0) {
          state.settings.bitDiameter = val;
          if ($('bitDiameter')) $('bitDiameter').value = val;
          if ($('bitDiameterVal')) $('bitDiameterVal').textContent = val;
        }
      });
    }

    // Auto Otsu Threshold
    if ($('btnAutoOtsu')) {
      $('btnAutoOtsu').addEventListener('click', () => {
        const cv = state.originalCanvas || $('canvasOrig');
        if (!cv || !cv.width || !state.rawSourceCanvas) { toast(t('noImage'), 'error'); return; }
        const imgData = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height);
        const lum = window.VectorEngine.luminanceField(imgData);
        const otsu = window.VectorEngine.computeOtsuThreshold(lum);
        state.settings.threshold = otsu;
        if ($('threshold')) $('threshold').value = otsu;
        if ($('thresholdVal')) $('thresholdVal').textContent = otsu;
        scheduleLiveVectorize();
        toast('🪄 Auto Otsu: ' + otsu, 'success');
      });
    }

    // Toggles
    const toggles = [
      ['invertToggle', 'invert'], ['grayscaleToggle', 'grayscale'],
      ['adaptiveToggle', 'adaptive'], ['bezierToggle', 'bezier'],
      ['hatchToggle', 'hatch'], ['pocketToggle', 'pocket'],
      ['tabsToggle', 'tabs'], ['rampPlungeToggle', 'rampPlunge'],
      ['airAssistToggle', 'airAssist'], ['tspToggle', 'tsp'],
      ['extrudeBacking', 'extrudeBacking']
    ];
    toggles.forEach(([id, key]) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener('change', () => {
        state.settings[key] = el.checked;
        if (id === 'hatchToggle') {
          if ($('hatchOptions')) $('hatchOptions').style.display = el.checked ? 'flex' : 'none';
          if (state.vectorPaths.length) vectorize(true);
        } else if (id === 'pocketToggle') {
          if ($('pocketOptions')) $('pocketOptions').style.display = el.checked ? 'block' : 'none';
        } else if (id === 'tabsToggle') {
          if ($('tabsOptions')) $('tabsOptions').style.display = el.checked ? 'block' : 'none';
        } else if (id === 'bezierToggle' && state.vectorPaths.length) {
          const vw = state.vectorDims.w || 500, vh = state.vectorDims.h || 500;
          drawVectorPreview(state.vectorPaths, vw, vh);
          state.svgOutput = buildSVG(state.vectorPaths, vw, vh);
        } else if (id === 'invertToggle' || id === 'grayscaleToggle') {
          refreshOriginal();
          scheduleLiveVectorize();
        } else if (id === 'adaptiveToggle') {
          scheduleLiveVectorize();
        }
      });
    });

    // CNC Type chips (Laser vs Router)
    document.querySelectorAll('.mode-chip[data-cnc-type]').forEach(c => {
      c.addEventListener('click', () => {
        state.settings.cncType = c.dataset.cncType;
        if (state.settings.cncType === 'router' && ['grbl-laser', 'grbl-k40'].includes(state.settings.postProcessor)) {
          state.settings.postProcessor = 'grbl-router';
          if ($('postProcessor')) $('postProcessor').value = 'grbl-router';
        } else if (state.settings.cncType === 'laser' && ['grbl-router', 'mach3', 'linuxcnc'].includes(state.settings.postProcessor)) {
          state.settings.postProcessor = 'grbl-laser';
          if ($('postProcessor')) $('postProcessor').value = 'grbl-laser';
        }
        syncCncTypeUI();
      });
    });

    // Vectorization Mode chips
    document.querySelectorAll('.mode-chip[data-mode]').forEach(c => {
      c.addEventListener('click', () => {
        state.settings.mode = c.dataset.mode;
        syncModeChipsUI();
        if (state.rawSourceCanvas) {
          refreshOriginal();
          vectorize(true);
        }
      });
    });

    // Undo / Redo buttons
    if ($('btnUndo')) $('btnUndo').addEventListener('click', undo);
    if ($('btnRedo')) $('btnRedo').addEventListener('click', redo);

    // Vectorize & Clear
    if ($('btnVectorize')) $('btnVectorize').addEventListener('click', () => vectorize(false));
    if ($('btnClear')) $('btnClear').addEventListener('click', clearWorkspace);
  }

  function clearWorkspace() {
    clearVector();
    state.rawSourceCanvas = null;
    state.originalCanvas = null;
    state.sourceKind = 'none';
    state.sourceFileName = '';
    state.nestedOverride = null;
    state.undoStack = []; state.redoStack = [];
    if ($('uploadPlaceholder')) $('uploadPlaceholder').style.display = 'flex';
    if ($('canvasOrig')) $('canvasOrig').style.display = 'none';
    if ($('fileInfo')) $('fileInfo').style.display = 'none';
    if ($('btnVectorize')) $('btnVectorize').disabled = true;
    if ($('btnClear')) $('btnClear').disabled = true;
    enableImageExports(false);
    updateUndoRedoButtons();
  }

  function setupMaterials() {
    document.querySelectorAll('.material-card').forEach(c => {
      c.addEventListener('click', () => {
        document.querySelectorAll('.material-card').forEach(x => x.classList.remove('active'));
        c.classList.add('active');
        const mat = c.dataset.material;
        state.settings.material = mat;
        const p = MATERIAL_PRESETS[mat];
        if (p) {
          Object.assign(state.settings, p);
          ['laserPower', 'speed', 'passes', 'kerf', 'cutDepth', 'stepDown', 'spindleRpm'].forEach(k => {
            const sl = $(k), vl = $(k + 'Val');
            if (sl && p[k] !== undefined) sl.value = p[k];
            if (vl && p[k] !== undefined) vl.textContent = p[k];
          });
        }
      });
    });
  }

  function setupMachinePresets() {
    document.querySelectorAll('.machine-chip').forEach(c => {
      c.addEventListener('click', () => {
        document.querySelectorAll('.machine-chip').forEach(x => x.classList.remove('active'));
        c.classList.add('active');
        const m = c.dataset.machine;
        if (!m || !MACHINE_PRESETS[m]) return;
        state.settings.machine = m;
        const p = MACHINE_PRESETS[m];
        state.settings.laserPower = p.laserPower;
        state.settings.speed = p.speed;
        state.settings.bedW = p.bedW;
        state.settings.bedH = p.bedH;
        state.settings.postProcessor = p.post;
        if (p.cncType) state.settings.cncType = p.cncType;
        else state.settings.cncType = 'laser';
        syncCncTypeUI();
        if ($('postProcessor')) $('postProcessor').value = p.post;
        if ($('laserPower')) $('laserPower').value = p.laserPower;
        if ($('laserPowerVal')) $('laserPowerVal').textContent = p.laserPower;
        if ($('speed')) $('speed').value = p.speed;
        if ($('speedVal')) $('speedVal').textContent = p.speed;
        toast(`🚀 ${m.toUpperCase()} (${p.bedW}×${p.bedH} mm · ${POST_LABELS[p.post]})`, 'info');
      });
    });
  }

  // ═══════════════════════════════════════════════════════
  // VECTORIZATION PIPELINE
  // ═══════════════════════════════════════════════════════
  function _rdpCore(pts, epsilon) {
    if (pts.length <= 2) return pts;
    let maxDist = 0, maxIdx = 0;
    const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
    for (let i = 1; i < pts.length - 1; i++) {
      const [px, py] = pts[i];
      const dist = len < 1e-9 ? Math.hypot(px - ax, py - ay) : Math.abs(dy * (px - ax) - dx * (py - ay)) / len;
      if (dist > maxDist) { maxDist = dist; maxIdx = i; }
    }
    if (maxDist > epsilon) {
      const left = _rdpCore(pts.slice(0, maxIdx + 1), epsilon);
      const right = _rdpCore(pts.slice(maxIdx), epsilon);
      return [...left.slice(0, -1), ...right];
    }
    return [pts[0], pts[pts.length - 1]];
  }

  function rdpSimplify(pts, epsilon) {
    const isClosed = pts.closed !== undefined
      ? pts.closed
      : (pts.length > 2 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 1.5);
    let out;
    if (isClosed && pts.length >= 4) {
      const mid = Math.floor(pts.length / 2);
      const a = _rdpCore(pts.slice(0, mid + 1), epsilon);
      const b = _rdpCore(pts.slice(mid).concat([pts[0]]), epsilon);
      out = a.slice(0, -1).concat(b.slice(0, -1));
      if (out.length < 3) out = pts.slice(0, 3);
    } else {
      out = _rdpCore(pts, epsilon);
    }
    out.closed = isClosed;
    out.color = pts.color;
    return out;
  }

  function pathArea(pts) {
    let a = 0;
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
      a += x1 * y2 - x2 * y1;
    }
    return Math.abs(a) * 0.5;
  }

  function generateHatchFill(paths, spacing) {
    if (!paths || !paths.length) return [];
    let minY = Infinity, maxY = -Infinity;
    const edges = [];
    for (const p of paths) {
      if (!p || p.length < 3) continue;
      for (let i = 0; i < p.length; i++) {
        const p1 = p[i], p2 = p[(i + 1) % p.length];
        if (p1[1] < minY) minY = p1[1]; if (p1[1] > maxY) maxY = p1[1];
        if (p1[1] !== p2[1]) {
          const yMin = Math.min(p1[1], p2[1]), yMax = Math.max(p1[1], p2[1]);
          const xVal = p1[1] === yMin ? p1[0] : p2[0];
          edges.push({ yMin, yMax, xVal, invSlope: (p2[0] - p1[0]) / (p2[1] - p1[1]) });
        }
      }
    }
    const hatchPaths = [];
    let flip = false;
    for (let y = minY + spacing * 0.5; y <= maxY; y += spacing) {
      const xs = [];
      for (const e of edges) {
        if (y >= e.yMin && y < e.yMax) xs.push(e.xVal + (y - e.yMin) * e.invSlope);
      }
      xs.sort((a, b) => a - b);
      const segs = [];
      for (let i = 0; i + 1 < xs.length; i += 2) {
        if (xs[i + 1] - xs[i] > 0.4) segs.push([[xs[i], y], [xs[i + 1], y]]);
      }
      if (flip) segs.reverse().forEach(s => s.reverse());
      for (const s of segs) { s.closed = false; s.operation = 'score'; hatchPaths.push(s); }
      flip = !flip;
    }
    return hatchPaths;
  }

  async function vectorize(silent = false) {
    if (!state.originalCanvas || !state.rawSourceCanvas) {
      if (!silent) toast(t('noImage'), 'error');
      return;
    }
    if (state.processing) return;
    state.processing = true;
    const btn = $('btnVectorize');
    if (btn) btn.disabled = true;
    if (!silent) { showProcessing(true, t('processing')); updateProgress(20); }
    await sleep(14);

    try {
      const VE = window.VectorEngine;
      if (!VE) throw new Error('VectorEngine not loaded');
      const cv = state.originalCanvas;
      const w = cv.width, h = cv.height;
      const imgData = cv.getContext('2d').getImageData(0, 0, w, h);
      const lum = VE.luminanceField(imgData);
      if (!silent) updateProgress(45);

      const mode = state.settings.mode;
      const thr = state.settings.threshold;
      const useAdaptive = !!state.settings.adaptive;
      let paths = [];

      if (mode === 'halftone') {
        const cellSize = Math.max(5, Math.round(18 - state.settings.detail * 2));
        paths = VE.halftoneField(lum, w, h, cellSize, true);
      } else if (mode === 'centerline') {
        const rawBin = VE.thresholdBinary(lum, w, h, thr, useAdaptive);
        const cleanBin = VE.despeckleBinary(rawBin, w, h);
        const thinned = VE.zhangSuenThinning(cleanBin, w, h);
        paths = VE.extractSkeletonPaths(thinned, w, h);
      } else if (mode === 'color') {
        const q = VE.kMeansQuantize(imgData, Math.max(2, Math.min(16, Math.round(state.settings.colorCount || 4))));
        paths = VE.extractColorLayers(q, w, h, true);
      } else if (mode === 'edge') {
        const smoothedLum = VE.separableBlur(lum, w, h, 1);
        const gradField = VE.sobelField(smoothedLum, w, h);
        const edgeIso = Math.max(35, Math.min(242, Math.round(252 - thr * 0.72)));
        paths = VE.subpixelContours(gradField, w, h, edgeIso, true);
      } else {
        if (useAdaptive) {
          const bin = VE.despeckleBinary(VE.thresholdBinary(lum, w, h, thr, true), w, h);
          const f = new Float32Array(w * h);
          for (let i = 0; i < f.length; i++) f[i] = bin[i] ? 0 : 255;
          paths = VE.subpixelContours(VE.separableBlur(f, w, h, 1), w, h, 127.5, false);
        } else {
          const preSmooth = state.settings.smoothing > 2 ? VE.separableBlur(lum, w, h, 1) : lum;
          paths = VE.subpixelContours(preSmooth, w, h, thr, true);
        }
      }

      if (!silent) updateProgress(75);
      const tol = Math.max(0.15, state.settings.detail);
      const simplifyList = (arr) => arr.map(p => rdpSimplify(p, tol)).filter(p => p.length >= 2);
      const filterAreaList = (arr) => arr.filter(p => p.closed === false ? p.length >= 2 : (pathArea(p) >= state.settings.minArea));

      if (mode === 'color') {
        paths = paths.map(layer => {
          const res = filterAreaList(simplifyList(layer));
          res.colorData = layer.colorData; res.colorName = layer.colorName;
          res.visible = true; res.operation = 'cut';
          return res;
        }).filter(l => l.length > 0);
      } else {
        paths = simplifyList(paths);
        if (mode !== 'centerline') paths = filterAreaList(paths);
      }

      if (state.settings.hatch && mode !== 'centerline' && mode !== 'halftone') {
        const spacing = Math.max(0.8, state.settings.hatchSpacing || 2.5);
        if (mode === 'color') {
          paths = paths.map(layer => {
            const hp = generateHatchFill(layer.filter(p => p.closed !== false), spacing);
            const comb = layer.concat(hp);
            comb.colorData = layer.colorData; comb.colorName = layer.colorName;
            comb.visible = true; comb.operation = layer.operation || 'cut';
            return comb;
          });
        } else {
          paths = paths.concat(generateHatchFill(paths.filter(p => p.closed !== false), spacing));
        }
      }

      state.nestedOverride = null;
      state.vectorPaths = paths;
      state.vectorDims = { w, h };
      recomputeStatsFromPaths();
      state.svgOutput = buildSVG(paths, w, h);
      drawVectorPreview(paths, w, h);
      updateStats();
      updateLayers(paths);
      enableExports(state.stats.paths > 0);

      if (!silent) {
        updateProgress(100);
        showProcessing(false);
        toast(`✅ ${state.stats.paths} ${t('pathsVectorized')}`, 'success');
      }
      if (window.Features && window.Features.refreshCompare) window.Features.refreshCompare();
    } catch (err) {
      console.error(err);
      showProcessing(false);
      toast(t('vectorError') + ': ' + err.message, 'error');
    }

    state.processing = false;
    if (btn) btn.disabled = !state.rawSourceCanvas;
  }

  function recomputeStatsFromPaths() {
    const isColor = state.settings.mode === 'color';
    const flat = isColor ? state.vectorPaths.flat() : state.vectorPaths;
    state.stats.paths = flat.length;
    state.stats.nodes = flat.reduce((s, p) => s + (p ? p.length : 0), 0);
  }

  // ═══════════════════════════════════════════════════════
  // PHYSICAL DIMENSIONS, GRID ARRAY & NESTING PAYLOAD (FIXED SCALING!)
  // ═══════════════════════════════════════════════════════
  function getSinglePartDimensionsMm(srcW, srcH) {
    const wIn = Math.max(1, srcW || 1);
    const hIn = Math.max(1, srcH || 1);
    const s = state.exportSettings;
    const dpi = s.dpi || 300;
    const unitToMm = (val, u) => u === 'mm' ? val : (u === 'inch' ? val * 25.4 : val * (25.4 / dpi));

    let mmW = s.width ? unitToMm(s.width, s.unit) : null;
    let mmH = s.height ? unitToMm(s.height, s.unit) : null;

    if (!mmW && !mmH) {
      // Friendly baseline: 96 CSS px = 25.4 mm (~148mm for 560px demo)
      mmW = wIn * (25.4 / 96);
      mmH = hIn * (25.4 / 96);
    } else if (s.lockAspect) {
      if (mmW && !mmH) mmH = mmW * (hIn / wIn);
      else if (mmH && !mmW) mmW = mmH * (wIn / hIn);
    } else {
      if (!mmW) mmW = wIn * (25.4 / 96);
      if (!mmH) mmH = hIn * (25.4 / 96);
    }
    return { physW: Math.max(1, mmW), physH: Math.max(1, mmH) };
  }

  function filterActivePathsByLayers(paths, isColor) {
    if (isColor) {
      return paths.filter(l => l && l.visible !== false && l.operation !== 'ignore');
    }
    const VE = window.VectorEngine;
    const isCenter = state.settings.mode === 'centerline';
    const closed = paths.filter(p => p && p.length >= 3 && p.closed !== false && !isCenter);
    const open = paths.filter(p => p && (p.length < 3 || p.closed === false || isCenter));
    const depths = closed.length && VE ? VE.analyzeNesting(closed) : [];
    const out = [];
    closed.forEach((p, idx) => {
      const isHole = (depths[idx] % 2) === 1;
      const key = isHole ? 'holes' : 'outers';
      if (state.layerVis[key] !== false && state.layerOps[key] !== 'ignore') {
        const cp = p.slice();
        cp.closed = true; cp.isHole = isHole; cp.operation = state.layerOps[key] || 'cut'; cp.color = p.color;
        out.push(cp);
      }
    });
    if (state.layerVis.open !== false && state.layerOps.open !== 'ignore') {
      open.forEach(p => {
        const cp = p.slice();
        cp.closed = false; cp.operation = state.layerOps.open || 'score'; cp.color = p.color;
        out.push(cp);
      });
    }
    return out;
  }

  function clonePathOffset(p, dx, dy) {
    const out = p.map(pt => [pt[0] + dx, pt[1] + dy]);
    out.closed = p.closed; out.color = p.color; out.operation = p.operation; out.isHole = p.isHole;
    return out;
  }

  // Returns exact { paths, w, h, physW, physH, isColor } WITHOUT squashing Grid Array or Nesting!
  function getVectorExportPayload() {
    const isColor = state.settings.mode === 'color';
    if (state.nestedOverride && state.nestedOverride.fits) {
      return {
        paths: filterActivePathsByLayers(state.nestedOverride.paths, isColor),
        w: state.nestedOverride.w,
        h: state.nestedOverride.h,
        physW: state.nestedOverride.physW,
        physH: state.nestedOverride.physH,
        isColor
      };
    }

    const baseW = state.vectorDims.w || 500;
    const baseH = state.vectorDims.h || 500;
    const { physW: partW, physH: partH } = getSinglePartDimensionsMm(baseW, baseH);
    const active = filterActivePathsByLayers(state.vectorPaths, isColor);

    const cols = Math.max(1, parseInt($('gridCols')?.value || '1', 10));
    const rows = Math.max(1, parseInt($('gridRows')?.value || '1', 10));
    const spaceX = Math.max(0, parseFloat($('gridSpaceX')?.value || '0'));
    const spaceY = Math.max(0, parseFloat($('gridSpaceY')?.value || '0'));

    if (cols <= 1 && rows <= 1) {
      return { paths: active, w: baseW, h: baseH, physW: partW, physH: partH, isColor };
    }

    const pxPerMmX = baseW / partW;
    const pxPerMmY = baseH / partH;
    const spPxX = spaceX * pxPerMmX;
    const spPxY = spaceY * pxPerMmY;
    const totalW = baseW * cols + spPxX * (cols - 1);
    const totalH = baseH * rows + spPxY * (rows - 1);
    const totalPhysW = partW * cols + spaceX * (cols - 1);
    const totalPhysH = partH * rows + spaceY * (rows - 1);

    let outPaths;
    if (isColor) {
      outPaths = active.map(layer => {
        const nl = [];
        nl.colorData = layer.colorData; nl.colorName = layer.colorName;
        nl.visible = layer.visible !== false; nl.operation = layer.operation || 'cut';
        for (let r = 0; r < rows; r++)
          for (let c = 0; c < cols; c++)
            for (const p of layer) nl.push(clonePathOffset(p, c * (baseW + spPxX), r * (baseH + spPxY)));
        return nl;
      });
    } else {
      outPaths = [];
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
          for (const p of active) outPaths.push(clonePathOffset(p, c * (baseW + spPxX), r * (baseH + spPxY)));
    }
    return { paths: outPaths, w: totalW, h: totalH, physW: totalPhysW, physH: totalPhysH, isColor };
  }

  // ═══════════════════════════════════════════════════════
  // LIGHTBURN-COMPATIBLE SVG, CAD DXF, MULTI-DIALECT G-CODE, SPEC-VALID PDF & TIFF
  // ═══════════════════════════════════════════════════════
  function buildSVG(paths, w, h, options = {}) {
    const isCenterline = state.settings.mode === 'centerline';
    const isColor = state.settings.mode === 'color';
    const smooth = !!state.settings.bezier;
    const physW = options.physW || getSinglePartDimensionsMm(w, h).physW;
    const physH = options.physH || getSinglePartDimensionsMm(w, h).physH;
    const VE = window.VectorEngine;
    const isLightburn = state.settings.machine === 'lightburn';
    const buildPathStr = (arr) => (VE && VE.pathToSvgD ? VE.pathToSvgD(arr, smooth, 1, 1) : '');

    let contentStr = '';
    if (isColor) {
      paths.forEach((layer, i) => {
        if (!layer || !layer.length || layer.visible === false || layer.operation === 'ignore') return;
        const lColor = layer.colorData || '#111111';
        const op = layer.operation || 'cut';
        const dStr = buildPathStr(layer);
        if (!dStr) return;
        const strokeC = isLightburn ? (op === 'score' ? '#0000FF' : (op === 'pocket' ? '#FF0000' : '#000000')) : (op === 'score' ? lColor : 'none');
        const fillC = isLightburn ? (op === 'pocket' ? lColor : 'none') : (op === 'score' ? 'none' : lColor);
        const sw = isLightburn ? '0.2' : (op === 'score' ? '1' : '0');
        contentStr += `\n  <g id="layer${i + 1}" inkscape:label="${escXml(layer.colorName || ('Layer ' + (i + 1)))}" data-operation="${escXml(op)}" inkscape:groupmode="layer">
    <path d="${dStr}" fill="${escXml(fillC)}" fill-rule="evenodd" stroke="${escXml(strokeC)}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
      });
    } else {
      const closedPaths = paths.filter(p => p.closed !== false && !isCenterline);
      const openPaths = paths.filter(p => p.closed === false || isCenterline);
      const dClosed = buildPathStr(closedPaths);
      const dOpen = buildPathStr(openPaths);
      contentStr = '\n  <g id="layer1" inkscape:label="CNC Cut Layer" inkscape:groupmode="layer">';
      if (dClosed) {
        const fillC = isLightburn ? 'none' : '#000000';
        const strokeC = isLightburn ? '#000000' : 'none';
        contentStr += `\n    <path d="${dClosed}" fill="${fillC}" fill-rule="evenodd" stroke="${strokeC}" stroke-width="${isLightburn ? '0.2' : '0'}" stroke-linecap="round" stroke-linejoin="round"/>`;
      }
      if (dOpen) {
        contentStr += `\n    <path d="${dOpen}" fill="none" stroke="${isLightburn ? '#0000FF' : '#000000'}" stroke-width="${isLightburn ? '0.2' : '1'}" stroke-linecap="round" stroke-linejoin="round"/>`;
      }
      contentStr += '\n  </g>';
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
     width="${physW.toFixed(2)}mm" height="${physH.toFixed(2)}mm" viewBox="0 0 ${w.toFixed(2)} ${h.toFixed(2)}">
  <title>${escXml(options.title || 'Vector CNC Output')}</title>
  <desc>Generated by Studios-Pro Vector CNC Studio — ${new Date().toISOString()}</desc>${contentStr}
</svg>`;
  }

  function buildDXF(paths, w, h, physWOverride, physHOverride) {
    const baseDims = getSinglePartDimensionsMm(w, h);
    const physW = physWOverride || baseDims.physW;
    const physH = physHOverride || baseDims.physH;
    const useInch = state.settings.units === 'inch';
    const unitScale = useInch ? (1 / 25.4) : 1;
    const outW = physW * unitScale;
    const outH = physH * unitScale;
    const sx = outW / Math.max(1, w);
    const sy = outH / Math.max(1, h);
    const VE = window.VectorEngine;

    const lines = [];
    const dxf = (k, v) => lines.push(k + '\n' + v);
    const isColor = state.settings.mode === 'color';
    const isCenterline = state.settings.mode === 'centerline';

    const layers = [];
    if (isColor) {
      paths.forEach((layer, idx) => {
        if (!layer || !layer.length || layer.visible === false || layer.operation === 'ignore') return;
        layers.push({ name: 'COLOR_' + (idx + 1) + '_' + (layer.operation || 'CUT').toUpperCase(), color: (idx % 6) + 1, items: layer });
      });
    } else {
      const closedList = paths.filter(p => p.closed !== false && !isCenterline);
      const openList = paths.filter(p => p.closed === false || isCenterline);
      if (closedList.length) {
        const depths = VE && VE.analyzeNesting ? VE.analyzeNesting(closedList) : null;
        const holes = [], outers = [];
        closedList.forEach((p, idx) => ((depths && (depths[idx] % 2 === 1)) ? holes : outers).push(p));
        if (holes.length) layers.push({ name: 'CUT_HOLES', color: 3, items: holes });
        if (outers.length) layers.push({ name: 'CUT_OUTER', color: 1, items: outers });
      }
      if (openList.length) layers.push({ name: 'ENGRAVE_SCORE', color: 5, items: openList });
    }
    if (!layers.length) layers.push({ name: 'CNC_DEFAULT', color: 7, items: [] });

    dxf(0, 'SECTION'); dxf(2, 'HEADER');
    dxf(9, '$ACADVER'); dxf(1, 'AC1009');
    dxf(9, '$INSUNITS'); dxf(70, useInch ? '1' : '4');
    dxf(9, '$MEASUREMENT'); dxf(70, useInch ? '0' : '1');
    dxf(9, '$EXTMIN'); dxf(10, '0.0'); dxf(20, '0.0'); dxf(30, '0.0');
    dxf(9, '$EXTMAX'); dxf(10, outW.toFixed(4)); dxf(20, outH.toFixed(4)); dxf(30, '0.0');
    dxf(0, 'ENDSEC');

    dxf(0, 'SECTION'); dxf(2, 'TABLES');
    dxf(0, 'TABLE'); dxf(2, 'LAYER'); dxf(70, String(layers.length));
    for (const l of layers) {
      dxf(0, 'LAYER'); dxf(2, l.name); dxf(70, '0'); dxf(62, String(l.color)); dxf(6, 'CONTINUOUS');
    }
    dxf(0, 'ENDTAB'); dxf(0, 'ENDSEC');

    dxf(0, 'SECTION'); dxf(2, 'ENTITIES');
    for (const l of layers) {
      for (const path of l.items) {
        if (!path || path.length < 2) continue;
        const closed = !isCenterline && path.closed !== false;
        dxf(0, 'POLYLINE'); dxf(8, l.name); dxf(62, String(l.color));
        dxf(66, '1'); dxf(70, closed ? '1' : '0');
        for (const [px, py] of path) {
          dxf(0, 'VERTEX'); dxf(8, l.name);
          dxf(10, (px * sx).toFixed(4));
          dxf(20, (outH - py * sy).toFixed(4));
          dxf(30, '0.0');
        }
        dxf(0, 'SEQEND');
      }
    }
    dxf(0, 'ENDSEC'); dxf(0, 'EOF');
    return lines.join('\n');
  }

  // Real Multi-Dialect CAM G-Code Builder (Fixed: Half-Kerf/Bit Offset, Multi-Pass Tabs + Modal F Restore, M4 Dynamic, G20/G21, Dogbones, Pockets, Ramp Plunge!)
  function buildGcodeBundle(paths, w, h, physWOverride, physHOverride, forcedDialect = null) {
    const s = state.settings;
    const baseDims = getSinglePartDimensionsMm(w, h);
    const physW = physWOverride || baseDims.physW;
    const physH = physHOverride || baseDims.physH;
    const useInch = s.units === 'inch';
    const uScale = useInch ? (1 / 25.4) : 1;
    const sxMm = physW / Math.max(1, w);
    const syMm = physH / Math.max(1, h);
    const avgScale = (sxMm + syMm) * 0.5;
    const VE = window.VectorEngine;

    const dialect = forcedDialect || s.postProcessor || (s.cncType === 'router' ? 'grbl-router' : 'grbl-laser');
    const isRouter = s.cncType === 'router' || ['grbl-router', 'mach3', 'linuxcnc'].includes(dialect);
    const parenComments = dialect === 'mach3' || dialect === 'linuxcnc';
    const cmt = (txt) => parenComments ? `(${txt.replace(/[()]/g, '')})` : `; ${txt}`;

    // Flatten active layers while preserving per-layer operation ('cut' | 'score' | 'pocket')
    let flatPaths = [];
    if (s.mode === 'color') {
      paths.forEach(layer => {
        if (!layer || layer.visible === false || layer.operation === 'ignore') return;
        const op = layer.operation || 'cut';
        layer.forEach(p => {
          if (!p || p.length < 2) return;
          const cp = p.slice(); cp.closed = p.closed; cp.operation = p.operation || op; cp.color = layer.colorData;
          flatPaths.push(cp);
        });
      });
    } else {
      flatPaths = paths.filter(p => p && p.length >= 2);
    }

    // Apply Dogbones / T-Bones on interior corners if enabled (Router mode)
    const effectiveToolDiaMm = isRouter ? Math.max(0.2, Number(s.bitDiameter || 3.175)) : Math.max(0, Number(s.kerf || 0));
    const halfOffsetPx = effectiveToolDiaMm > 0 ? ((effectiveToolDiaMm * 0.5) / Math.max(1e-6, avgScale)) : 0;

    if (isRouter && s.dogbone && s.dogbone !== 'none' && VE && VE.applyDogbones) {
      flatPaths = VE.applyDogbones(flatPaths, halfOffsetPx, s.dogbone);
    }

    // Optional Concentric Pocket Clearing rings (for pocket-assigned paths OR global pocket toggle)
    const pocketPaths = [];
    if (VE && VE.generatePocketPaths) {
      const pocketSrc = s.pocket ? flatPaths : flatPaths.filter(p => p.operation === 'pocket');
      if (pocketSrc.length) {
        const toolDiaPx = Math.max(2, (isRouter ? effectiveToolDiaMm : Math.max(0.25, effectiveToolDiaMm || 0.25)) / Math.max(1e-6, avgScale));
        const rings = VE.generatePocketPaths(pocketSrc, toolDiaPx, s.pocketStepover || 55);
        rings.forEach(r => { r.operation = 'pocket'; pocketPaths.push(r); });
      }
    }

    // Optimize toolpaths with EXACT HALF-OFFSET (fixes previous 2x kerf bug!)
    let orderedPx = flatPaths;
    if (VE && VE.optimizeToolpaths) {
      if (s.tsp !== false) {
        orderedPx = VE.optimizeToolpaths(flatPaths, halfOffsetPx, s.profileSide || 'auto').ordered;
      } else if (halfOffsetPx > 1e-3 && s.profileSide !== 'on') {
        const depths = VE.analyzeNesting(flatPaths);
        orderedPx = flatPaths.map((p, i) => {
          if (p.closed === false || p.length < 3) return p;
          const isHole = (depths[i] % 2) === 1;
          const dir = (s.profileSide === 'inside') ? (isHole ? halfOffsetPx : -halfOffsetPx) : (isHole ? -halfOffsetPx : halfOffsetPx);
          const off = VE.offsetClosedPolygon(p, dir);
          if (off) { off.isHole = isHole; off.operation = p.operation; return off; }
          return p;
        });
      }
    }
    if (pocketPaths.length) orderedPx = pocketPaths.concat(orderedPx);

    const fVal = (mmMin) => Math.max(1, Math.round(mmMin * uScale));
    const coord = (mm) => (mm * uScale).toFixed(useInch ? 4 : 3);
    const speedMm = Math.max(50, Number(s.speed || 1000));
    const lines = [];

    lines.push(cmt(`Studios-Pro Vector CNC Studio — ${POST_LABELS[dialect] || dialect}`));
    lines.push(cmt(`Output: ${physW.toFixed(2)} x ${physH.toFixed(2)} mm | Material: ${s.material} | Tool/Kerf: ${effectiveToolDiaMm.toFixed(2)} mm`));
    lines.push(cmt(`Units: ${useInch ? 'INCHES (G20)' : 'MILLIMETERS (G21)'} | Generated: ${new Date().toISOString()}`));

    if (dialect === 'mach3') lines.push('G17 G40 G49 G80 G54');
    else if (dialect === 'linuxcnc') lines.push('G17 G40 G49 G80 G54 G64 P0.05');
    else lines.push('G17');
    lines.push(useInch ? 'G20 ' + cmt('inches') : 'G21 ' + cmt('millimeters'));
    lines.push('G90 ' + cmt('absolute positioning'));

    let totalCutDistMm = 0, totalTravelMm = 0, totalPlunges = 0;
    let lastXmm = 0, lastYmm = 0;

    if (isRouter) {
      const safeZ = Math.max(1, Number(s.safeZ || 5.0));
      const cutDepth = Math.max(0.2, Number(s.cutDepth || 3.0));
      const stepDown = Math.max(0.2, Number(s.stepDown || 1.5));
      const plungeFeedMm = Math.max(80, Math.round(speedMm * 0.35));
      const rpm = Math.max(1000, Math.round(Number(s.spindleRpm || 12000)));
      const tabHeight = Math.min(cutDepth * 0.85, Math.max(0.4, Number(s.tabHeight || 1.2)));
      const tabTopZ = Math.max(0, cutDepth - tabHeight);

      lines.push(`G0 Z${coord(safeZ)} ${cmt('safe clearance')}`);
      lines.push(`M3 S${rpm} ${cmt('spindle on')}`);
      lines.push(dialect === 'marlin' ? 'G4 S1' : 'G4 P1.0');

      const zPasses = [];
      for (let z = stepDown; z < cutDepth - 1e-4; z += stepDown) zPasses.push(z);
      zPasses.push(cutDepth);

      zPasses.forEach((zDepth, pIdx) => {
        const passNeedsTabs = !!s.tabs && (zDepth > tabTopZ + 1e-3);
        lines.push(cmt(`--- Pass ${pIdx + 1}/${zPasses.length} (Z-${zDepth.toFixed(2)}mm) ---`));

        orderedPx.forEach(path => {
          const closed = path.closed !== false && s.mode !== 'centerline';
          const isScore = path.operation === 'score';
          const targetZ = isScore ? Math.min(zDepth, Math.min(0.6, cutDepth)) : zDepth;
          const x0mm = path[0][0] * sxMm;
          const y0mm = (h - path[0][1]) * syMm;
          totalTravelMm += Math.hypot(x0mm - lastXmm, y0mm - lastYmm);

          lines.push(`G0 Z${coord(safeZ)}`);
          lines.push(`G0 X${coord(x0mm)} Y${coord(y0mm)}`);
          totalPlunges++;

          // Optional Linear Ramp Plunge along first edge (prevents snapping thin endmills!)
          if (s.rampPlunge && path.length >= 2) {
            const x1mm = path[1][0] * sxMm, y1mm = (h - path[1][1]) * syMm;
            const segLen = Math.hypot(x1mm - x0mm, y1mm - y0mm);
            const rampFrac = Math.min(1, 5.0 / Math.max(0.5, segLen));
            const rx = x0mm + (x1mm - x0mm) * rampFrac;
            const ry = y0mm + (y1mm - y0mm) * rampFrac;
            lines.push(`G1 Z${coord(0.5)} F${fVal(plungeFeedMm)}`);
            lines.push(`G1 X${coord(rx)} Y${coord(ry)} Z-${coord(targetZ)} F${fVal(plungeFeedMm)} ${cmt('ramp plunge')}`);
            lines.push(`G1 X${coord(x0mm)} Y${coord(y0mm)} F${fVal(speedMm)}`);
          } else {
            lines.push(`G1 Z-${coord(targetZ)} F${fVal(plungeFeedMm)}`);
          }
          lines.push(`F${fVal(speedMm)}`);

          // Holding Tabs ONLY on outer closed contours (NEVER on inner holes or pocket rings!)
          const applyTabsHere = passNeedsTabs && closed && !path.isHole && !path.isPocket && path.operation !== 'score';
          if (applyTabsHere && VE && VE.buildContourWithTabs) {
            const tabbed = VE.buildContourWithTabs(path, sxMm, syMm, h, Number(s.tabCount || 4), Number(s.tabWidth || 4.0));
            let inTab = false, pxPrev = tabbed.start[0], pyPrev = tabbed.start[1];
            for (const seg of tabbed.segments) {
              if (seg.isTab && !inTab) {
                lines.push(`G1 Z-${coord(tabTopZ)} F${fVal(plungeFeedMm)} ${cmt('holding tab lift')}`);
                lines.push(`F${fVal(speedMm)}`);
                inTab = true;
              } else if (!seg.isTab && inTab) {
                lines.push(`G1 Z-${coord(targetZ)} F${fVal(plungeFeedMm)} ${cmt('resume cut depth')}`);
                lines.push(`F${fVal(speedMm)}`); // FIX: ALWAYS restore full cutting feedrate F!
                inTab = false;
              }
              lines.push(`G1 X${coord(seg.x)} Y${coord(seg.y)}`);
              totalCutDistMm += Math.hypot(seg.x - pxPrev, seg.y - pyPrev);
              pxPrev = seg.x; pyPrev = seg.y;
            }
            if (inTab) {
              lines.push(`G1 Z-${coord(targetZ)} F${fVal(plungeFeedMm)}`);
              lines.push(`F${fVal(speedMm)}`);
            }
            lastXmm = pxPrev; lastYmm = pyPrev;
          } else {
            let pxPrev = x0mm, pyPrev = y0mm;
            for (let i = 1; i < path.length; i++) {
              const xmm = path[i][0] * sxMm, ymm = (h - path[i][1]) * syMm;
              lines.push(`G1 X${coord(xmm)} Y${coord(ymm)}`);
              totalCutDistMm += Math.hypot(xmm - pxPrev, ymm - pyPrev);
              pxPrev = xmm; pyPrev = ymm;
            }
            if (closed) {
              lines.push(`G1 X${coord(x0mm)} Y${coord(y0mm)}`);
              totalCutDistMm += Math.hypot(x0mm - pxPrev, y0mm - pyPrev);
              pxPrev = x0mm; pyPrev = y0mm;
            }
            lastXmm = pxPrev; lastYmm = pyPrev;
          }
        });
      });

      lines.push(`G0 Z${coord(safeZ)}`);
      lines.push(`M5 ${cmt('spindle off')}`);
    } else {
      // LASER / PLASMA MODE
      const sMax = dialect === 'grbl-k40' ? 255 : 1000;
      const laserOnCmd = dialect === 'grbl-k40' ? 'M3' : (dialect === 'marlin' ? 'M3 I' : 'M4');
      const fullS = Math.round((Number(s.laserPower || 80) / 100) * sMax);
      const scoreS = Math.max(10, Math.round(fullS * 0.45));
      const passes = Math.max(1, Math.round(Number(s.passes || 1)));

      lines.push(`M5 ${cmt('laser off')}`);
      if (s.airAssist && dialect !== 'marlin') lines.push(`M8 ${cmt('air assist on')}`);
      lines.push(`F${fVal(speedMm)}`);

      for (let pass = 0; pass < passes; pass++) {
        lines.push(cmt(`--- Pass ${pass + 1}/${passes} ---`));
        for (const path of orderedPx) {
          const closed = path.closed !== false && s.mode !== 'centerline';
          const isScore = path.operation === 'score';
          if (isScore && pass > 0) continue; // Score lines only need 1 pass!
          const sVal = isScore ? scoreS : fullS;
          const x0mm = path[0][0] * sxMm, y0mm = (h - path[0][1]) * syMm;
          totalTravelMm += Math.hypot(x0mm - lastXmm, y0mm - lastYmm);

          lines.push(`G0 X${coord(x0mm)} Y${coord(y0mm)}`);
          lines.push(`${laserOnCmd} S${sVal}`);
          let pxPrev = x0mm, pyPrev = y0mm;
          for (let i = 1; i < path.length; i++) {
            const xmm = path[i][0] * sxMm, ymm = (h - path[i][1]) * syMm;
            lines.push(`G1 X${coord(xmm)} Y${coord(ymm)}`);
            totalCutDistMm += Math.hypot(xmm - pxPrev, ymm - pyPrev);
            pxPrev = xmm; pyPrev = ymm;
          }
          if (closed) {
            lines.push(`G1 X${coord(x0mm)} Y${coord(y0mm)}`);
            totalCutDistMm += Math.hypot(x0mm - pxPrev, y0mm - pyPrev);
            pxPrev = x0mm; pyPrev = y0mm;
          }
          lines.push('M5');
          lastXmm = pxPrev; lastYmm = pyPrev;
        }
      }
      if (s.airAssist && dialect !== 'marlin') lines.push(`M9 ${cmt('air assist off')}`);
    }

    lines.push(`G0 X0 Y0 ${cmt('return work origin')}`);
    lines.push(dialect === 'marlin' ? 'M84' : 'M30 ' + cmt('end program'));

    // Realistic machine time estimate (includes acceleration overhead + Z plunges!)
    const rapidSpeedMm = 3500;
    const plungeSec = isRouter ? (totalPlunges * (Number(s.safeZ || 5) + Number(s.cutDepth || 3)) / Math.max(80, speedMm * 0.35) * 60) : 0;
    const estMinutes = ((totalCutDistMm / speedMm) * 1.15) + (totalTravelMm / rapidSpeedMm) + (plungeSec / 60);
    const totalSec = Math.max(1, Math.round(estMinutes * 60));
    const timeStr = `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, '0')}`;

    return {
      gcode: lines.join('\n'),
      orderedPx,
      physW, physH,
      isRouter,
      cutDepth: Number(s.cutDepth || 3.0),
      dialect,
      dialectLabel: POST_LABELS[dialect] || dialect,
      totalCutDistMm,
      totalTravelMm,
      estMinutes,
      timeStr
    };
  }

  // Spec-Valid Vector PDF (Exact Byte-Indexed XREF)
  function buildPDF(paths, w, h, physWOverride, physHOverride) {
    const baseDims = getSinglePartDimensionsMm(w, h);
    const physW = physWOverride || baseDims.physW;
    const physH = physHOverride || baseDims.physH;
    const ptW = physW * (72 / 25.4);
    const ptH = physH * (72 / 25.4);
    const sx = ptW / Math.max(1, w);
    const sy = ptH / Math.max(1, h);
    const smooth = !!state.settings.bezier;

    const buildPdfStream = (pathArray, r, g, b, forceStroke) => {
      const closedPaths = forceStroke ? [] : pathArray.filter(p => p.closed !== false && state.settings.mode !== 'centerline');
      const openPaths = forceStroke ? pathArray : pathArray.filter(p => p.closed === false || state.settings.mode === 'centerline');
      const emitSet = (arr, isStroke) => {
        if (!arr.length) return '';
        let st = isStroke ? `${r} ${g} ${b} RG\n0.6 w\n1 J 1 j\n` : `${r} ${g} ${b} rg\n`;
        for (const path of arr) {
          if (path.length < 2) continue;
          st += (path[0][0] * sx).toFixed(2) + ' ' + (ptH - path[0][1] * sy).toFixed(2) + ' m ';
          if (!smooth || path.length < 3) {
            for (let i = 1; i < path.length; i++) st += (path[i][0] * sx).toFixed(2) + ' ' + (ptH - path[i][1] * sy).toFixed(2) + ' l ';
          } else {
            const len = path.length, isClosed = path.closed !== false, segCount = isClosed ? len : len - 1;
            for (let i = 0; i < segCount; i++) {
              const p1 = path[i], p2 = path[(i + 1) % len];
              const p0 = isClosed ? path[(i - 1 + len) % len] : path[Math.max(0, i - 1)];
              const p3 = isClosed ? path[(i + 2) % len] : path[Math.min(len - 1, i + 2)];
              const c1x = p1[0] + (p2[0] - p0[0]) * 0.18, c1y = p1[1] + (p2[1] - p0[1]) * 0.18;
              const c2x = p2[0] - (p3[0] - p1[0]) * 0.18, c2y = p2[1] - (p3[1] - p1[1]) * 0.18;
              st += `${(c1x * sx).toFixed(2)} ${(ptH - c1y * sy).toFixed(2)} ${(c2x * sx).toFixed(2)} ${(ptH - c2y * sy).toFixed(2)} ${(p2[0] * sx).toFixed(2)} ${(ptH - p2[1] * sy).toFixed(2)} c `;
            }
          }
          st += isStroke ? 'S\n' : 'h ';
        }
        if (!isStroke && arr.length) st += 'f*\n';
        return st;
      };
      return emitSet(closedPaths, false) + emitSet(openPaths, true);
    };

    let pdfStream = '';
    if (state.settings.mode === 'color') {
      for (const layer of paths) {
        if (!layer || layer.visible === false || layer.operation === 'ignore') continue;
        const hex = layer.colorData || '#111111';
        const r = (parseInt(hex.slice(1, 3), 16) / 255).toFixed(3);
        const g = (parseInt(hex.slice(3, 5), 16) / 255).toFixed(3);
        const b = (parseInt(hex.slice(5, 7), 16) / 255).toFixed(3);
        pdfStream += buildPdfStream(layer, r, g, b, false);
      }
    } else {
      pdfStream = buildPdfStream(paths, '0', '0', '0', state.settings.mode === 'centerline');
    }

    const enc = new TextEncoder();
    const header = '%PDF-1.4\n';
    const streamLen = enc.encode(pdfStream).length;
    const objs = [
      '1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n',
      '2 0 obj\n<</Type /Pages /Kids[3 0 R] /Count 1>>\nendobj\n',
      `3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox[0 0 ${ptW.toFixed(2)} ${ptH.toFixed(2)}] /Contents 4 0 R /Resources<</ProcSet[/PDF]>>>>\nendobj\n`,
      `4 0 obj\n<</Length ${streamLen}>>\nstream\n${pdfStream}\nendstream\nendobj\n`
    ];
    const offsets = [];
    let cursor = enc.encode(header).length;
    for (const o of objs) { offsets.push(cursor); cursor += enc.encode(o).length; }
    let xref = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
    offsets.forEach(off => { xref += String(off).padStart(10, '0') + ' 00000 n \n'; });
    return header + objs.join('') + xref + `trailer\n<</Size ${objs.length + 1} /Root 1 0 R>>\nstartxref\n${cursor}\n%%EOF`;
  }

  // FIXED Spec-Valid Raster PDF (exact byte offsets for objects 1..5 — Bug #7 fixed!)
  async function buildPDFFromImageBytes(dataURL, w, h) {
    const res = await fetch(dataURL);
    const ab = await (await res.blob()).arrayBuffer();
    const jpegBytes = new Uint8Array(ab);
    const enc = new TextEncoder();

    const header = enc.encode('%PDF-1.4\n');
    const obj1 = enc.encode('1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n');
    const obj2 = enc.encode('2 0 obj\n<</Type /Pages /Kids[3 0 R] /Count 1>>\nendobj\n');
    const obj3 = enc.encode(`3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox[0 0 ${w} ${h}] /Contents 4 0 R /Resources<</XObject<</Im0 5 0 R>>>>>>\nendobj\n`);
    const cmds = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;
    const obj4 = enc.encode(`4 0 obj\n<</Length ${cmds.length}>>\nstream\n${cmds}\nendstream\nendobj\n`);
    const obj5Head = enc.encode(`5 0 obj\n<</Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length}>>\nstream\n`);
    const obj5Tail = enc.encode('\nendstream\nendobj\n');

    const objChunks = [obj1, obj2, obj3, obj4];
    const offsets = [];
    let cursor = header.length;
    for (const c of objChunks) { offsets.push(cursor); cursor += c.length; }
    offsets.push(cursor); // Exact byte offset of Object 5!
    const xrefPos = cursor + obj5Head.length + jpegBytes.length + obj5Tail.length;

    let xref = 'xref\n0 6\n0000000000 65535 f \n';
    for (const off of offsets) xref += String(off).padStart(10, '0') + ' 00000 n \n';
    const tail = enc.encode(xref + `trailer\n<</Size 6 /Root 1 0 R>>\nstartxref\n${xrefPos}\n%%EOF`);

    const parts = [header, obj1, obj2, obj3, obj4, obj5Head, jpegBytes, obj5Tail, tail];
    const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
    let pos = 0;
    for (const p of parts) { out.set(p, pos); pos += p.length; }
    return out;
  }

  function buildBMP(imgData, w, h) {
    const rowSize = Math.floor((24 * w + 31) / 32) * 4;
    const pixelDataSize = rowSize * h;
    const fileSize = 54 + pixelDataSize;
    const buf = new ArrayBuffer(fileSize);
    const v = new DataView(buf);
    v.setUint8(0, 0x42); v.setUint8(1, 0x4D);
    v.setUint32(2, fileSize, true); v.setUint32(10, 54, true);
    v.setUint32(14, 40, true); v.setInt32(18, w, true); v.setInt32(22, -h, true);
    v.setUint16(26, 1, true); v.setUint16(28, 24, true);
    v.setUint32(34, pixelDataSize, true);
    const ppm = Math.round((state.exportSettings.dpi || 300) * 39.3701);
    v.setInt32(38, ppm, true); v.setInt32(42, ppm, true);
    const px = imgData.data; let off = 54;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        v.setUint8(off++, px[i + 2]); v.setUint8(off++, px[i + 1]); v.setUint8(off++, px[i]);
      }
      for (let p = 0; p < rowSize - w * 3; p++) v.setUint8(off++, 0);
    }
    return new Uint8Array(buf);
  }

  function buildBMP8Bit(imgData, w, h) {
    const rowSize = Math.floor((w + 3) / 4) * 4;
    const pixelDataSize = rowSize * h;
    const paletteSize = 256 * 4;
    const fileSize = 54 + paletteSize + pixelDataSize;
    const buf = new ArrayBuffer(fileSize);
    const v = new DataView(buf);
    v.setUint8(0, 0x42); v.setUint8(1, 0x4D);
    v.setUint32(2, fileSize, true); v.setUint32(10, 54 + paletteSize, true);
    v.setUint32(14, 40, true); v.setInt32(18, w, true); v.setInt32(22, -h, true);
    v.setUint16(26, 1, true); v.setUint16(28, 8, true);
    v.setUint32(34, pixelDataSize, true); v.setUint32(46, 256, true);
    let poff = 54;
    for (let i = 0; i < 256; i++) { v.setUint8(poff++, i); v.setUint8(poff++, i); v.setUint8(poff++, i); v.setUint8(poff++, 0); }
    const px = imgData.data; let off = 54 + paletteSize;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        v.setUint8(off++, Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]));
      }
      for (let p = 0; p < rowSize - w; p++) v.setUint8(off++, 0);
    }
    return new Uint8Array(buf);
  }

  // FIXED Spec-Valid TIFF (Even IFD offset + LONG dimensions + Tag 296 ResolutionUnit=2 inches!)
  function buildTIFF(imgData, w, h) {
    const pixelDataSize = w * h * 3;
    const padByte = (pixelDataSize % 2 === 1) ? 1 : 0; // Ensure IFD starts on even word boundary!
    const ifdOffset = 8 + pixelDataSize + padByte;
    const numEntries = 12;
    const ifdSize = 2 + numEntries * 12 + 4;
    const extraDataSize = 6 + 8 + 8;
    const fileSize = ifdOffset + ifdSize + extraDataSize;

    const buf = new ArrayBuffer(fileSize);
    const v = new DataView(buf);
    v.setUint16(0, 0x4949, true);
    v.setUint16(2, 42, true);
    v.setUint32(4, ifdOffset, true);

    const px = imgData.data; let doff = 8;
    for (let i = 0; i < px.length; i += 4) {
      v.setUint8(doff++, px[i]); v.setUint8(doff++, px[i + 1]); v.setUint8(doff++, px[i + 2]);
    }

    let ioff = ifdOffset;
    v.setUint16(ioff, numEntries, true); ioff += 2;
    const writeEntry = (tag, type, count, val) => {
      v.setUint16(ioff, tag, true); v.setUint16(ioff + 2, type, true);
      v.setUint32(ioff + 4, count, true); v.setUint32(ioff + 8, val, true);
      ioff += 12;
    };
    const extraOff = ifdOffset + ifdSize;
    writeEntry(256, 4, 1, w);
    writeEntry(257, 4, 1, h);
    writeEntry(258, 3, 3, extraOff);
    writeEntry(259, 3, 1, 1);
    writeEntry(262, 3, 1, 2);
    writeEntry(273, 4, 1, 8);
    writeEntry(277, 3, 1, 3);
    writeEntry(278, 4, 1, h);
    writeEntry(279, 4, 1, pixelDataSize);
    writeEntry(282, 5, 1, extraOff + 6);
    writeEntry(283, 5, 1, extraOff + 14);
    writeEntry(296, 3, 1, 2); // ResolutionUnit = 2 (Inches)
    v.setUint32(ioff, 0, true);

    const dpi = state.exportSettings.dpi || 300;
    v.setUint16(extraOff, 8, true); v.setUint16(extraOff + 2, 8, true); v.setUint16(extraOff + 4, 8, true);
    v.setUint32(extraOff + 6, dpi, true); v.setUint32(extraOff + 10, 1, true);
    v.setUint32(extraOff + 14, dpi, true); v.setUint32(extraOff + 18, 1, true);
    return new Uint8Array(buf);
  }

  // ═══════════════════════════════════════════════════════
  // RASTER PROCESSING (FIXED REAL DPI + TRANSPARENT VECTOR PNG + GRID ARRAY!)
  // ═══════════════════════════════════════════════════════
  function applyDithering(ctx, w, h, mode) {
    const d = ctx.getImageData(0, 0, w, h);
    const px = d.data;
    const addErr = (idx, err) => {
      const v = px[idx] + err;
      px[idx] = px[idx + 1] = px[idx + 2] = v < 0 ? 0 : v > 255 ? 255 : v;
    };
    for (let i = 0; i < px.length; i += 4) {
      const g = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      px[i] = px[i + 1] = px[i + 2] = g;
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const oldP = px[i], newP = oldP < 128 ? 0 : 255;
        px[i] = px[i + 1] = px[i + 2] = newP;
        const q = oldP - newP;
        if (mode === 'floyd') {
          if (x + 1 < w) addErr(i + 4, q * 7 / 16);
          if (y + 1 < h) {
            if (x > 0) addErr(i + w * 4 - 4, q * 3 / 16);
            addErr(i + w * 4, q * 5 / 16);
            if (x + 1 < w) addErr(i + w * 4 + 4, q * 1 / 16);
          }
        } else if (mode === 'atkinson') {
          const e = q / 8;
          if (x + 1 < w) addErr(i + 4, e);
          if (x + 2 < w) addErr(i + 8, e);
          if (y + 1 < h) {
            if (x > 0) addErr(i + w * 4 - 4, e);
            addErr(i + w * 4, e);
            if (x + 1 < w) addErr(i + w * 4 + 4, e);
          }
          if (y + 2 < h) addErr(i + w * 8, e);
        }
      }
    }
    ctx.putImageData(d, 0, 0);
  }

  async function renderRasterExportCanvas(source) {
    const s = state.exportSettings;
    const dpi = s.dpi || 300;
    const pxPerMm = dpi / 25.4;

    if (source === 'vector') {
      const payload = getVectorExportPayload();
      let outW = Math.round(payload.physW * pxPerMm);
      let outH = Math.round(payload.physH * pxPerMm);
      // Cap at 4096px max edge so browser canvas never OOMs
      const cap = 4096;
      if (outW > cap || outH > cap) {
        const sc = Math.min(cap / outW, cap / outH);
        outW = Math.round(outW * sc); outH = Math.round(outH * sc);
      }
      const cv = document.createElement('canvas');
      cv.width = Math.max(16, outW); cv.height = Math.max(16, outH);
      const ctx = cv.getContext('2d', { alpha: true });
      if (!s.transparent) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cv.width, cv.height); }
      ctx.save();
      ctx.scale(cv.width / Math.max(1, payload.w), cv.height / Math.max(1, payload.h));
      const VE = window.VectorEngine;
      if (payload.isColor) {
        payload.paths.forEach(l => VE.drawPathsOnCtx(ctx, l, !!state.settings.bezier, l.colorData || '#111111', l.colorData || '#111111', l.operation === 'score'));
      } else {
        VE.drawPathsOnCtx(ctx, payload.paths, !!state.settings.bezier, '#111111', '#111111', state.settings.mode === 'centerline');
      }
      ctx.restore();
      applyPostRasterEffects(cv, ctx);
      return cv;
    }

    // Source === 'image'
    const srcCv = state.originalCanvas;
    const { physW, physH } = getSinglePartDimensionsMm(srcCv.width, srcCv.height);
    let targetW = s.width ? (s.unit === 'px' ? s.width : (s.unit === 'inch' ? s.width * dpi : s.width * pxPerMm)) : null;
    let targetH = s.height ? (s.unit === 'px' ? s.height : (s.unit === 'inch' ? s.height * dpi : s.height * pxPerMm)) : null;
    if (!targetW && !targetH) { targetW = srcCv.width; targetH = srcCv.height; }
    else if (s.lockAspect) {
      if (targetW && !targetH) targetH = targetW * (srcCv.height / srcCv.width);
      else if (targetH && !targetW) targetW = targetH * (srcCv.width / srcCv.height);
    } else {
      if (!targetW) targetW = Math.round(physW * pxPerMm);
      if (!targetH) targetH = Math.round(physH * pxPerMm);
    }
    const cap = 4096;
    if (targetW > cap || targetH > cap) {
      const sc = Math.min(cap / targetW, cap / targetH);
      targetW *= sc; targetH *= sc;
    }
    const cv = document.createElement('canvas');
    cv.width = Math.max(16, Math.round(targetW)); cv.height = Math.max(16, Math.round(targetH));
    const ctx = cv.getContext('2d', { alpha: !!s.transparent });
    if (!s.transparent) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cv.width, cv.height); }
    ctx.drawImage(srcCv, 0, 0, cv.width, cv.height);
    applyPostRasterEffects(cv, ctx);
    return cv;
  }

  function applyPostRasterEffects(cv, ctx) {
    const s = state.exportSettings;
    if ((s.brightness || 0) !== 0 || (s.contrast || 0) !== 0) {
      const imgD = ctx.getImageData(0, 0, cv.width, cv.height);
      const px = imgD.data;
      const br = (s.brightness || 0) * 2.55;
      const ct = s.contrast || 0;
      const f = (259 * (ct * 2.55 + 255)) / (255 * (259 - ct * 2.55));
      for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] === 0) continue;
        px[i] = Math.max(0, Math.min(255, f * (px[i] + br - 128) + 128));
        px[i + 1] = Math.max(0, Math.min(255, f * (px[i + 1] + br - 128) + 128));
        px[i + 2] = Math.max(0, Math.min(255, f * (px[i + 2] + br - 128) + 128));
      }
      ctx.putImageData(imgD, 0, 0);
    }
    const dither = $('exportDither') ? $('exportDither').value : 'none';
    if (dither !== 'none') applyDithering(ctx, cv.width, cv.height, dither);
    if (s.watermark) {
      ctx.font = `bold ${Math.max(12, Math.round(cv.width / 38))}px Inter, sans-serif`;
      ctx.fillStyle = 'rgba(100,116,139,0.6)';
      ctx.textAlign = 'right';
      ctx.fillText(`${s.dpi || 300} DPI • Studios-Pro Vector CNC`, cv.width - 16, cv.height - 16);
    }
  }

  // ═══════════════════════════════════════════════════════
  // SEALED DOWNLOAD HELPERS (ZERO BYPASS, CREDIT CONSUMED ONLY ON SUCCESS)
  // ═══════════════════════════════════════════════════════
  function triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.position = 'fixed';
    a.style.opacity = '0';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 800);
  }

  async function gatedTextExport(content, filename, mime = 'text/plain;charset=utf-8') {
    const gate = await StudiosProGate.requestExportAccess();
    if (!gate.allowed) return false;
    triggerBlobDownload(new Blob([content], { type: mime }), filename);
    gate.consume();
    toast('✅ ' + filename, 'success');
    return true;
  }

  async function gatedBinaryExport(bytesOrBlob, filename, mime) {
    const gate = await StudiosProGate.requestExportAccess();
    if (!gate.allowed) return false;
    const blob = bytesOrBlob instanceof Blob ? bytesOrBlob : new Blob([bytesOrBlob], { type: mime });
    triggerBlobDownload(blob, filename);
    gate.consume();
    toast('✅ ' + filename, 'success');
    return true;
  }

  // ═══════════════════════════════════════════════════════
  // EXPORT CONTROLS & FORMAT HANDLERS
  // ═══════════════════════════════════════════════════════
  function setupExportControls() {
    const updateSize = () => {
      state.exportSettings.width = parseFloat($('exportWidth')?.value) || null;
      state.exportSettings.height = parseFloat($('exportHeight')?.value) || null;
      updateStats();
    };
    const bind = (id, evt, fn) => { const el = $(id); if (el) el.addEventListener(evt, fn); };
    bind('exportWidth', 'input', updateSize);
    bind('exportHeight', 'input', updateSize);
    bind('exportSizeUnit', 'change', (e) => { state.exportSettings.unit = e.target.value; updateStats(); });
    bind('gridCols', 'input', updateStats);
    bind('gridRows', 'input', updateStats);
    bind('gridSpaceX', 'input', updateStats);
    bind('gridSpaceY', 'input', updateStats);

    const bl = $('btnLockAspect');
    if (bl) {
      bl.addEventListener('click', () => {
        state.exportSettings.lockAspect = !state.exportSettings.lockAspect;
        bl.textContent = state.exportSettings.lockAspect ? '🔒' : '🔓';
        bl.style.color = state.exportSettings.lockAspect ? 'var(--accent)' : 'var(--muted)';
      });
    }

    [['expBrightness', 'expBrightnessVal', 'brightness'], ['expContrast', 'expContrastVal', 'contrast']].forEach(([sid, vid, key]) => {
      bind(sid, 'input', () => {
        if ($(vid)) $(vid).textContent = $(sid).value;
        state.exportSettings[key] = parseFloat($(sid).value) || 0;
      });
    });

    bind('exportTransparent', 'change', (e) => { state.exportSettings.transparent = e.target.checked; });
    bind('exportWatermark', 'change', (e) => { state.exportSettings.watermark = e.target.checked; });
    bind('exportBMP8bit', 'change', (e) => { state.exportSettings.bmp8bit = e.target.checked; });
    bind('exportDPI', 'change', (e) => { state.exportSettings.dpi = parseInt(e.target.value, 10) || 300; updateStats(); });
    bind('exportJpegQ', 'change', (e) => { state.exportSettings.jpegQuality = parseFloat(e.target.value) || 0.9; });
    bind('btnClosePreview', 'click', () => $('exportPreviewModal')?.classList.remove('show'));
    bind('btnCancelExport', 'click', () => $('exportPreviewModal')?.classList.remove('show'));
    bind('btnImgPreview', 'click', () => showExportPreview('image'));
    bind('btnVecPreview', 'click', () => showExportPreview('vector'));
    bind('btnImgBatchZip', 'click', () => runBatchExport('image'));
    bind('btnVecBatchZip', 'click', () => runBatchExport('vector'));
    bind('btnSimulate', 'click', () => runSimulation2D());
    bind('btnClearNest', 'click', () => {
      state.nestedOverride = null;
      if ($('nestActiveBadge')) $('nestActiveBadge').style.display = 'none';
      updateStats();
      toast(currentLang === 'fr' ? 'Imbrication désactivée.' : 'Auto-Nesting cleared.', 'info');
    });
  }

  function setupExports() {
    document.querySelectorAll('.export-card[data-export]').forEach(card => {
      card.addEventListener('click', () => {
        if (card.classList.contains('disabled')) return;
        const spec = card.dataset.export || '';
        if (spec.startsWith('vec-')) exportAs(spec.slice(4));
        else if (spec.startsWith('img-')) exportFromImage(spec.slice(4));
      });
    });
    if ($('btnExportSTL')) $('btnExportSTL').addEventListener('click', exportSTL);
    if ($('btnViewAR')) $('btnViewAR').addEventListener('click', launchARViewer);
  }

  async function showExportPreview(source) {
    if (source === 'image' && !state.originalCanvas) { toast(t('noImage'), 'error'); return; }
    if (source === 'vector' && !state.vectorPaths.length) { toast(t('noVector'), 'error'); return; }
    showProcessing(true, t('exportPreview'));
    await sleep(30);
    const processed = await renderRasterExportCanvas(source);
    const previewCv = $('canvasExportPreview');
    previewCv.width = processed.width; previewCv.height = processed.height;
    previewCv.getContext('2d').drawImage(processed, 0, 0);
    if ($('previewFormat')) $('previewFormat').textContent = source === 'vector' ? 'VECTOR (SVG / PNG)' : 'IMAGE (PNG)';
    if ($('previewSize')) $('previewSize').textContent = `${processed.width} × ${processed.height} px`;
    if ($('previewDPI')) $('previewDPI').textContent = state.exportSettings.dpi;
    showProcessing(false);
    $('exportPreviewModal')?.classList.add('show');

    if ($('btnConfirmExport')) {
      $('btnConfirmExport').onclick = async () => {
        $('exportPreviewModal')?.classList.remove('show');
        if (source === 'vector') await exportAs('svg');
        else await exportFromImage('png');
      };
    }
  }

  async function exportAs(format) {
    if (!state.vectorPaths.length) { toast(t('noVector'), 'error'); return; }
    showProcessing(true, t('exportPreview'));
    await sleep(24);
    const base = (state.sourceFileName || 'cnc-vector').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fname = `${base}_${new Date().toISOString().slice(0, 10)}`;

    try {
      const payload = getVectorExportPayload();
      if (format === 'svg') {
        await gatedTextExport(buildSVG(payload.paths, payload.w, payload.h, { physW: payload.physW, physH: payload.physH }), fname + '.svg', 'image/svg+xml;charset=utf-8');
      } else if (format === 'dxf') {
        await gatedTextExport(buildDXF(payload.paths, payload.w, payload.h, payload.physW, payload.physH), fname + '.dxf', 'application/dxf;charset=utf-8');
      } else if (format === 'gcode' || format === 'nc' || format === 'ngc') {
        const dial = format === 'nc' ? 'mach3' : (format === 'ngc' ? 'linuxcnc' : null);
        const built = buildGcodeBundle(payload.paths, payload.w, payload.h, payload.physW, payload.physH, dial);
        const ext = format === 'nc' ? '.nc' : (format === 'ngc' ? '.ngc' : '.gcode');
        await gatedTextExport(built.gcode, fname + ext, 'text/plain;charset=utf-8');
      } else if (format === 'pdf') {
        await gatedTextExport(buildPDF(payload.paths, payload.w, payload.h, payload.physW, payload.physH), fname + '.pdf', 'application/pdf');
      } else {
        const processed = await renderRasterExportCanvas('vector');
        const imgData = processed.getContext('2d').getImageData(0, 0, processed.width, processed.height);
        if (format === 'png') {
          const blob = await new Promise(r => processed.toBlob(r, 'image/png'));
          await gatedBinaryExport(blob, fname + '.png', 'image/png');
        } else if (format === 'jpeg') {
          const blob = await new Promise(r => processed.toBlob(r, 'image/jpeg', state.exportSettings.jpegQuality));
          await gatedBinaryExport(blob, fname + '.jpg', 'image/jpeg');
        } else if (format === 'tiff') {
          await gatedBinaryExport(buildTIFF(imgData, processed.width, processed.height), fname + '.tiff', 'image/tiff');
        } else if (format === 'bmp') {
          const bmp = state.exportSettings.bmp8bit ? buildBMP8Bit(imgData, processed.width, processed.height) : buildBMP(imgData, processed.width, processed.height);
          await gatedBinaryExport(bmp, fname + '.bmp', 'image/bmp');
        }
      }
    } catch (e) { console.error(e); toast('Export Error: ' + e.message, 'error'); }
    showProcessing(false);
  }

  async function exportFromImage(format) {
    if (!state.originalCanvas) { toast(t('noImage'), 'error'); return; }
    showProcessing(true, t('exportPreview'));
    await sleep(24);
    const fname = 'image-cnc_' + new Date().toISOString().slice(0, 10);
    try {
      const processed = await renderRasterExportCanvas('image');
      const w = processed.width, h = processed.height;
      const imgData = processed.getContext('2d').getImageData(0, 0, w, h);
      if (format === 'png') {
        const blob = await new Promise(r => processed.toBlob(r, 'image/png'));
        await gatedBinaryExport(blob, fname + '.png', 'image/png');
      } else if (format === 'jpeg') {
        const blob = await new Promise(r => processed.toBlob(r, 'image/jpeg', state.exportSettings.jpegQuality));
        await gatedBinaryExport(blob, fname + '.jpg', 'image/jpeg');
      } else if (format === 'tiff') {
        await gatedBinaryExport(buildTIFF(imgData, w, h), fname + '.tiff', 'image/tiff');
      } else if (format === 'svg') {
        const dataURL = processed.toDataURL('image/png');
        const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><image width="${w}" height="${h}" href="${dataURL}"/></svg>`;
        await gatedTextExport(svg, fname + '.svg', 'image/svg+xml;charset=utf-8');
      } else if (format === 'pdf') {
        const pdfBytes = await buildPDFFromImageBytes(processed.toDataURL('image/jpeg', 0.92), w, h);
        await gatedBinaryExport(pdfBytes, fname + '.pdf', 'application/pdf');
      } else if (format === 'bmp') {
        const bmp = state.exportSettings.bmp8bit ? buildBMP8Bit(imgData, w, h) : buildBMP(imgData, w, h);
        await gatedBinaryExport(bmp, fname + '.bmp', 'image/bmp');
      }
    } catch (e) { console.error(e); toast('Export Error: ' + e.message, 'error'); }
    showProcessing(false);
  }

  async function runBatchExport(source) {
    if (source === 'image' && !state.originalCanvas) { toast(t('noImage'), 'error'); return; }
    if (source === 'vector' && !state.vectorPaths.length) { toast(t('noVector'), 'error'); return; }
    const gate = await StudiosProGate.requestExportAccess();
    if (!gate.allowed) return;

    showProcessing(true, t('batchExport'));
    await sleep(40);
    try {
      const zip = new JSZip();
      const processed = await renderRasterExportCanvas(source);
      const imgData = processed.getContext('2d').getImageData(0, 0, processed.width, processed.height);
      zip.file('export.bmp', state.exportSettings.bmp8bit ? buildBMP8Bit(imgData, processed.width, processed.height) : buildBMP(imgData, processed.width, processed.height));
      zip.file('export.png', processed.toDataURL('image/png').split(',')[1], { base64: true });
      zip.file('export.jpg', processed.toDataURL('image/jpeg', state.exportSettings.jpegQuality).split(',')[1], { base64: true });
      zip.file('export.tiff', buildTIFF(imgData, processed.width, processed.height));

      if (source === 'vector') {
        const payload = getVectorExportPayload();
        zip.file('export.svg', buildSVG(payload.paths, payload.w, payload.h, { physW: payload.physW, physH: payload.physH }));
        zip.file('export.dxf', buildDXF(payload.paths, payload.w, payload.h, payload.physW, payload.physH));
        zip.file('export.gcode', buildGcodeBundle(payload.paths, payload.w, payload.h, payload.physW, payload.physH).gcode);
        zip.file('export_mach3.nc', buildGcodeBundle(payload.paths, payload.w, payload.h, payload.physW, payload.physH, 'mach3').gcode);
        zip.file('export_vector.pdf', buildPDF(payload.paths, payload.w, payload.h, payload.physW, payload.physH));
      } else {
        zip.file('export_image.pdf', await buildPDFFromImageBytes(processed.toDataURL('image/jpeg', 0.92), processed.width, processed.height));
      }

      const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      triggerBlobDownload(content, 'StudiosPro_VectorCNC_Batch_' + Date.now() + '.zip');
      gate.consume();
      toast('✅ ' + t('downloadReady'), 'success');
    } catch (e) { console.error(e); toast('ZIP Error: ' + e.message, 'error'); }
    showProcessing(false);
  }

  // ═══════════════════════════════════════════════════════
  // 3D EXTRUDE STL (FIXED Z-UP!) & AR VIEWER (FIXED LINEAR RGB!)
  // ═══════════════════════════════════════════════════════
  async function exportSTL() {
    if (!state.vectorPaths.length) { toast(t('noVector'), 'error'); return; }
    const gate = await StudiosProGate.requestExportAccess();
    if (!gate.allowed) return;
    showProcessing(true, currentLang === 'fr' ? 'Génération STL 3D (Z-up)...' : 'Generating 3D STL (Z-up)...');
    await sleep(30);
    try {
      const payload = getVectorExportPayload();
      const group = window.VectorEngine.build3DMeshGroup(
        payload.paths, payload.w, payload.h, payload.physW, payload.physH,
        Math.max(0.5, Number(state.settings.extrudeDepth || 6)),
        !!state.settings.extrudeBacking, payload.isColor,
        { zUp: true, linearColor: false } // TRUE Z-UP flat on slicer bed!
      );
      if (!group || !group.children.length) throw new Error('No closed contours to extrude');
      const sc = new THREE.Scene(); sc.add(group); sc.updateMatrixWorld(true);
      const res = new THREE.STLExporter().parse(sc, { binary: true });
      const u8 = res instanceof DataView ? new Uint8Array(res.buffer, res.byteOffset, res.byteLength) : new Uint8Array(res);
      triggerBlobDownload(new Blob([u8], { type: 'model/stl' }), 'StudiosPro_CNC_3D_' + Date.now() + '.stl');
      gate.consume();
      toast('🧱 3D STL (Z-Up) Exported!', 'success');
    } catch (e) { console.error(e); toast('STL Error: ' + e.message, 'error'); }
    showProcessing(false);
  }

  // 100% FREE AR Preview using official sealed window.StudiosProAR.sendModel contract!
  async function launchARViewer() {
    if (!state.vectorPaths.length) { toast(t('noVector'), 'error'); return; }
    if (!window.StudiosProAR || typeof window.StudiosProAR.sendModel !== 'function') {
      toast('AR Bridge unavailable', 'error'); return;
    }
    showProcessing(true, currentLang === 'fr' ? 'Préparation AR 3D...' : 'Preparing 3D AR GLB...');
    await sleep(30);
    try {
      const payload = getVectorExportPayload();
      const group = window.VectorEngine.build3DMeshGroup(
        payload.paths, payload.w, payload.h, payload.physW, payload.physH,
        Math.max(0.5, Number(state.settings.extrudeDepth || 6)),
        !!state.settings.extrudeBacking, payload.isColor,
        { zUp: false, linearColor: true } // Y-Up floor + Linear PBR colors!
      );
      if (!group || !group.children.length) throw new Error('No closed contours to extrude');
      group.updateMatrixWorld(true);
      const rawBox = new THREE.Box3().setFromObject(group);
      const rawSize = rawBox.getSize(new THREE.Vector3());
      const dimensionsMm = { x: Math.max(1, Math.round(rawSize.x)), y: Math.max(1, Math.round(rawSize.y)), z: Math.max(1, Math.round(rawSize.z)) };

      const arRoot = new THREE.Group();
      const rawMax = Math.max(rawSize.x, rawSize.y, rawSize.z, 1e-4);
      let factor = rawMax > 5.0 ? 0.001 : 1.0;
      const tMax = rawMax * factor;
      if (tMax < 0.05) factor *= (0.18 / Math.max(1e-4, tMax));
      else if (tMax > 2.5) factor *= (1.5 / tMax);
      group.scale.multiplyScalar(factor);
      arRoot.add(group);
      arRoot.updateMatrixWorld(true);

      const normBox = new THREE.Box3().setFromObject(arRoot);
      const normCenter = normBox.getCenter(new THREE.Vector3());
      group.position.x -= normCenter.x;
      group.position.z -= normCenter.z;
      group.position.y -= normBox.min.y;
      arRoot.updateMatrixWorld(true);

      const arScene = new THREE.Scene(); arScene.add(arRoot);
      await new Promise((resolve, reject) => {
        new THREE.GLTFExporter().parse(arScene, (result) => {
          try {
            const isBin = result instanceof ArrayBuffer || (result && typeof result.byteLength === 'number');
            const baseName = (state.sourceFileName || 'cnc-vector-part').replace(/\.[^.]+$/, '');
            window.StudiosProAR.sendModel({
              modelData: isBin ? result : JSON.stringify(result),
              extension: isBin ? 'glb' : 'gltf',
              isBinary: isBin,
              name: baseName + (isBin ? '.glb' : '.gltf'),
              placement: 'floor',
              dimensionsMm,
              autoScale: 'auto',
              sourceStudio: 'vector-cnc'
            });
            toast(currentLang === 'fr' ? '📱 Envoyé vers AR Viewer !' : '📱 Sent to Studios-Pro AR Viewer!', 'success');
            resolve();
          } catch (err) { reject(err); }
        }, { binary: true });
      });
    } catch (e) { console.error(e); toast('AR Error: ' + e.message, 'error'); }
    showProcessing(false);
  }

  // ═══════════════════════════════════════════════════════
  // 2D LIVE TOOLPATH SIMULATION (REAL ROUTER + LASER TIME!)
  // ═══════════════════════════════════════════════════════
  function runSimulation2D() {
    if (!state.vectorPaths.length) { toast(t('noVector'), 'error'); return; }
    if (simRafId) cancelAnimationFrame(simRafId);

    const payload = getVectorExportPayload();
    const built = buildGcodeBundle(payload.paths, payload.w, payload.h, payload.physW, payload.physH);
    const ordered = built.orderedPx;
    if (!ordered.length) return;

    if ($('simTimeEst')) $('simTimeEst').textContent = built.timeStr;
    if ($('simCutDist')) $('simCutDist').textContent = built.totalCutDistMm.toFixed(1) + ' mm';
    if ($('simTravelDist')) $('simTravelDist').textContent = built.totalTravelMm.toFixed(1) + ' mm';
    if ($('simOverlay')) $('simOverlay').style.display = 'block';

    const cv = $('canvasVec');
    if (!cv) return;
    cv.width = payload.w; cv.height = payload.h;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, payload.w, payload.h);

    ctx.save(); ctx.globalAlpha = 0.14;
    if (payload.isColor) payload.paths.forEach(l => window.VectorEngine.drawPathsOnCtx(ctx, l, state.settings.bezier, '#475569', '#475569'));
    else window.VectorEngine.drawPathsOnCtx(ctx, payload.paths, state.settings.bezier, '#475569', '#475569', state.settings.mode === 'centerline');
    ctx.restore();

    const stopBtn = $('btnStopSim');
    const stopSim = () => {
      if (simRafId) { cancelAnimationFrame(simRafId); simRafId = null; }
      if ($('simOverlay')) $('simOverlay').style.display = 'none';
      drawVectorPreview(state.vectorPaths, state.vectorDims.w, state.vectorDims.h);
      if (stopBtn) stopBtn.onclick = null;
    };
    if (stopBtn) stopBtn.onclick = stopSim;
    window.__stopVecSim = stopSim;

    let pathIdx = 0, ptIdx = 1, ptsDrawn = 0;
    const totalPts = Math.max(1, ordered.reduce((acc, p) => acc + p.length, 0));

    const drawFrame = () => {
      const speedFactor = Math.max(1, Math.floor(totalPts / 200));
      for (let step = 0; step < speedFactor; step++) {
        if (pathIdx >= ordered.length) {
          if ($('simProgressPct')) $('simProgressPct').textContent = '100%';
          if ($('simProgressBar')) $('simProgressBar').style.width = '100%';
          return;
        }
        const cur = ordered[pathIdx];
        if (ptIdx === 1) {
          if (pathIdx > 0) {
            const prev = ordered[pathIdx - 1];
            const lp = (prev.closed !== false && state.settings.mode !== 'centerline') ? prev[0] : prev[prev.length - 1];
            ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1.1;
            ctx.beginPath(); ctx.moveTo(lp[0], lp[1]); ctx.lineTo(cur[0][0], cur[0][1]); ctx.stroke(); ctx.restore();
          }
          ctx.beginPath(); ctx.moveTo(cur[0][0], cur[0][1]);
        }
        if (ptIdx < cur.length) {
          ctx.strokeStyle = cur.isPocket ? '#a855f7' : (built.isRouter ? '#f59e0b' : '#ef4444');
          ctx.lineWidth = 1.6;
          ctx.lineTo(cur[ptIdx][0], cur[ptIdx][1]);
          ctx.stroke();
          ptIdx++; ptsDrawn++;
        } else {
          if (cur.closed !== false && state.settings.mode !== 'centerline') {
            ctx.lineTo(cur[0][0], cur[0][1]); ctx.stroke();
          }
          pathIdx++; ptIdx = 1;
        }
      }
      const pct = Math.min(100, Math.round((ptsDrawn / totalPts) * 100));
      if ($('simProgressPct')) $('simProgressPct').textContent = pct + '%';
      if ($('simProgressBar')) $('simProgressBar').style.width = pct + '%';
      simRafId = requestAnimationFrame(drawFrame);
    };
    drawFrame();
  }

  // ═══════════════════════════════════════════════════════
  // PREVIEW DRAWING (WITH HOVER-HIGHLIGHT ERASER + VISIBLE LAYERS)
  // ═══════════════════════════════════════════════════════
  function drawVectorPreview(paths, w, h) {
    const cv = $('canvasVec');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    cv.width = Math.max(16, Math.round(w));
    cv.height = Math.max(16, Math.round(h));
    const smooth = !!state.settings.bezier;
    const VE = window.VectorEngine;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cv.width, cv.height);

    const isColor = state.settings.mode === 'color';
    if (isColor) {
      paths.forEach((layer) => {
        if (!layer || layer.visible === false || layer.operation === 'ignore') return;
        const col = layer.colorData || '#111111';
        VE.drawPathsOnCtx(ctx, layer, smooth, col, col, layer.operation === 'score');
      });
    } else {
      const visiblePaths = filterActivePathsByLayers(paths, false);
      VE.drawPathsOnCtx(ctx, visiblePaths, smooth, '#111111', '#111111', state.settings.mode === 'centerline');
    }

    // Highlight hovered path in bright red when Eraser is active!
    if (state.eraserMode && state.hoverPathRef) {
      const target = isColor
        ? (paths[state.hoverPathRef.layerIdx] && paths[state.hoverPathRef.layerIdx][state.hoverPathRef.pathIdx])
        : paths[state.hoverPathRef.pathIdx];
      if (target && target.length >= 2) {
        ctx.save();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = Math.max(2.5, cv.width / 180);
        ctx.beginPath();
        ctx.moveTo(target[0][0], target[0][1]);
        for (let i = 1; i < target.length; i++) ctx.lineTo(target[i][0], target[i][1]);
        if (target.closed !== false) ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }
    }

    if ($('vecPlaceholder')) $('vecPlaceholder').style.display = 'none';
    cv.style.display = 'block';
    if ($('vecPanel')) $('vecPanel').style.display = '';
    if ($('btnEraser')) $('btnEraser').disabled = false;
  }

  function clearVector() {
    state.vectorPaths = []; state.vectorDims = { w: 0, h: 0 }; state.svgOutput = ''; state.hoverPathRef = null;
    if (simRafId) { cancelAnimationFrame(simRafId); simRafId = null; }
    if ($('simOverlay')) $('simOverlay').style.display = 'none';
    if ($('vecPanel')) $('vecPanel').style.display = 'none';
    const cv = $('canvasVec');
    if (cv) { cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); cv.style.display = 'none'; }
    if ($('vecPlaceholder')) $('vecPlaceholder').style.display = 'flex';
    enableExports(false);
    setEraserActive(false);
    if ($('btnEraser')) $('btnEraser').disabled = true;
    updateStats();
    updateLayers([]);
  }

  // ═══════════════════════════════════════════════════════
  // ZOOM & PAN (SYNCED WITH ERASER, RULER & ZOOM-FIT!)
  // ═══════════════════════════════════════════════════════
  function applyCanvasTransformCSS() {
    ['canvasOrig', 'canvasVec'].forEach(id => {
      const el = $(id);
      if (el) {
        el.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
        el.style.transformOrigin = 'center center';
      }
    });
    if ($('zoomVal')) $('zoomVal').textContent = Math.round(state.zoom * 100) + '%';
    if (window.Features && window.Features.refreshRuler) window.Features.refreshRuler();
  }

  function setZoom(z) {
    state.zoom = Math.max(0.2, Math.min(6, z));
    if (Math.abs(state.zoom - 1) < 0.02) { state.panX = 0; state.panY = 0; }
    applyCanvasTransformCSS();
  }

  function zoomFit() {
    const cv = ($('canvasVec') && $('canvasVec').style.display !== 'none') ? $('canvasVec') : $('canvasOrig');
    const wrap = cv && cv.closest('.preview-canvas-wrap');
    if (!cv || !wrap || !cv.width || !cv.height) { setZoom(1); return; }
    const fitW = (wrap.clientWidth - 28) / cv.offsetWidth;
    const fitH = (wrap.clientHeight - 28) / cv.offsetHeight;
    const fit = Math.max(0.25, Math.min(fitW, fitH, 2.5));
    state.panX = 0; state.panY = 0;
    setZoom(fit);
    toast(`⊡ Zoom Fit: ${Math.round(state.zoom * 100)}%`, 'info');
  }

  function setupZoomAndPan() {
    if ($('btnZoomIn')) $('btnZoomIn').addEventListener('click', () => setZoom(state.zoom * 1.25));
    if ($('btnZoomOut')) $('btnZoomOut').addEventListener('click', () => setZoom(state.zoom * 0.8));
    if ($('btnResetZoom')) $('btnResetZoom').addEventListener('click', () => { state.panX = 0; state.panY = 0; setZoom(1); });

    // Mouse-wheel zoom & middle-click / Shift+drag pan on canvas wrappers!
    document.querySelectorAll('.preview-canvas-wrap').forEach(wrap => {
      wrap.addEventListener('wheel', (e) => {
        if (!state.rawSourceCanvas && !state.vectorPaths.length) return;
        e.preventDefault();
        setZoom(state.zoom * (e.deltaY < 0 ? 1.12 : 0.89));
      }, { passive: false });

      let panning = false, sx = 0, sy = 0, ox = 0, oy = 0;
      wrap.addEventListener('mousedown', (e) => {
        if (e.button === 1 || (e.button === 0 && (e.shiftKey || (state.zoom > 1.02 && !state.eraserMode)))) {
          panning = true; sx = e.clientX; sy = e.clientY; ox = state.panX; oy = state.panY;
          wrap.style.cursor = 'grabbing';
          e.preventDefault();
        }
      });
      window.addEventListener('mousemove', (e) => {
        if (!panning) return;
        state.panX = ox + (e.clientX - sx);
        state.panY = oy + (e.clientY - sy);
        applyCanvasTransformCSS();
      });
      window.addEventListener('mouseup', () => { if (panning) { panning = false; wrap.style.cursor = ''; } });
    });
  }

  // ═══════════════════════════════════════════════════════
  // HOVER-HIGHLIGHT VECTOR ERASER (FIXED COORDS + OPEN PATHS + UNDO!)
  // ═══════════════════════════════════════════════════════
  function setEraserActive(on) {
    state.eraserMode = !!on;
    state.hoverPathRef = null;
    const btn = $('btnEraser'), cv = $('canvasVec');
    if (btn) btn.classList.toggle('active-eraser', state.eraserMode);
    if (cv) cv.style.cursor = state.eraserMode ? 'crosshair' : 'default';
    if (state.vectorPaths.length) drawVectorPreview(state.vectorPaths, state.vectorDims.w, state.vectorDims.h);
  }

  function distToSegmentSq(p, v, w) {
    const l2 = (v[0] - w[0]) ** 2 + (v[1] - w[1]) ** 2;
    if (l2 === 0) return (p.x - v[0]) ** 2 + (p.y - v[1]) ** 2;
    const tVal = Math.max(0, Math.min(1, ((p.x - v[0]) * (w[0] - v[0]) + (p.y - v[1]) * (w[1] - v[1])) / l2));
    return (p.x - (v[0] + tVal * (w[0] - v[0]))) ** 2 + (p.y - (v[1] + tVal * (w[1] - v[1]))) ** 2;
  }

  function hitTestPath(path, hx, hy, thresh) {
    if (!path || path.length < 2) return false;
    const sq = thresh * thresh, pt = { x: hx, y: hy };
    for (let i = 1; i < path.length; i++) if (distToSegmentSq(pt, path[i - 1], path[i]) <= sq) return true;
    // Only test closing chord if path is ACTUALLY closed (fixes Hatch deletion bug!)
    if (path.closed !== false && state.settings.mode !== 'centerline') {
      if (distToSegmentSq(pt, path[path.length - 1], path[0]) <= sq) return true;
    }
    return false;
  }

  function findPathAtClientEvent(cv, e) {
    const rect = cv.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const hx = ((e.clientX - rect.left) / rect.width) * cv.width;
    const hy = ((e.clientY - rect.top) / rect.height) * cv.height;
    const thresh = Math.max(6, (cv.width / rect.width) * 8);
    const isColor = state.settings.mode === 'color';
    if (isColor) {
      for (let li = state.vectorPaths.length - 1; li >= 0; li--) {
        const layer = state.vectorPaths[li];
        if (!layer || layer.visible === false) continue;
        for (let pi = layer.length - 1; pi >= 0; pi--) {
          if (hitTestPath(layer[pi], hx, hy, thresh)) return { layerIdx: li, pathIdx: pi };
        }
      }
    } else {
      for (let pi = state.vectorPaths.length - 1; pi >= 0; pi--) {
        if (hitTestPath(state.vectorPaths[pi], hx, hy, thresh)) return { layerIdx: -1, pathIdx: pi };
      }
    }
    return null;
  }

  function setupEraser() {
    const btn = $('btnEraser'), cv = $('canvasVec');
    if (!btn || !cv) return;
    btn.addEventListener('click', () => {
      setEraserActive(!state.eraserMode);
      if (state.eraserMode) {
        toast(currentLang === 'fr' ? '🩹 Gomme active — survolez un tracé rouge et cliquez (Ctrl+Z pour annuler).' : '🩹 Eraser active — hover to highlight red & click to delete (Ctrl+Z to undo).', 'info');
      }
    });

    cv.addEventListener('mousemove', (e) => {
      if (!state.eraserMode || !state.vectorPaths.length) return;
      const hit = findPathAtClientEvent(cv, e);
      const prev = state.hoverPathRef;
      const changed = (!hit && prev) || (hit && !prev) || (hit && prev && (hit.layerIdx !== prev.layerIdx || hit.pathIdx !== prev.pathIdx));
      if (changed) {
        state.hoverPathRef = hit;
        drawVectorPreview(state.vectorPaths, state.vectorDims.w, state.vectorDims.h);
      }
    });

    cv.addEventListener('mouseleave', () => {
      if (state.hoverPathRef) {
        state.hoverPathRef = null;
        drawVectorPreview(state.vectorPaths, state.vectorDims.w, state.vectorDims.h);
      }
    });

    cv.addEventListener('click', (e) => {
      if (!state.eraserMode || !state.vectorPaths.length) return;
      const hit = findPathAtClientEvent(cv, e);
      if (!hit) return;
      pushUndoSnapshot();
      if (hit.layerIdx >= 0) state.vectorPaths[hit.layerIdx].splice(hit.pathIdx, 1);
      else state.vectorPaths.splice(hit.pathIdx, 1);
      state.hoverPathRef = null;
      recomputeStatsFromPaths();
      state.svgOutput = buildSVG(state.vectorPaths, state.vectorDims.w, state.vectorDims.h);
      drawVectorPreview(state.vectorPaths, state.vectorDims.w, state.vectorDims.h);
      updateStats();
      updateLayers(state.vectorPaths);
    });
  }

  // ═══════════════════════════════════════════════════════
  // INTERACTIVE LIGHTBURN-STYLE LAYER MANAGER (EYE + CUT/SCORE/POCKET/IGNORE)
  // ═══════════════════════════════════════════════════════
  function updateLayers(paths) {
    const list = $('layersList');
    if (!list) return;
    list.innerHTML = '';
    if (!paths || !paths.length) {
      list.innerHTML = `<p style="color:var(--muted);font-size:12px;text-align:center;padding:10px">
        <span data-en>No vectors yet. Load a demo, photo, SVG or DXF.</span>
        <span data-fr>Aucun vecteur. Chargez un exemple, photo, SVG ou DXF.</span>
      </p>`;
      return;
    }

    const isColor = state.settings.mode === 'color';
    const rows = [];
    if (isColor) {
      paths.forEach((layer, idx) => {
        if (!layer || !layer.length) return;
        rows.push({
          key: 'color_' + idx, idx,
          color: layer.colorData || '#4f8eff',
          name: layer.colorName || ('Color ' + (idx + 1)),
          count: layer.length,
          visible: layer.visible !== false,
          operation: layer.operation || 'cut'
        });
      });
    } else {
      const isCenter = state.settings.mode === 'centerline';
      const closed = paths.filter(p => p.closed !== false && !isCenter);
      const open = paths.filter(p => p.closed === false || isCenter);
      if (closed.length && window.VectorEngine) {
        const depths = window.VectorEngine.analyzeNesting(closed);
        let holeCount = 0, outerCount = 0;
        depths.forEach(d => { if (d % 2 === 1) holeCount++; else outerCount++; });
        if (holeCount) rows.push({ key: 'holes', color: '#06d6a0', name: currentLang === 'fr' ? 'Trous intérieurs (Priorité 1)' : 'Inner Holes (Cut 1st)', count: holeCount, visible: state.layerVis.holes, operation: state.layerOps.holes });
        if (outerCount) rows.push({ key: 'outers', color: '#4f8eff', name: currentLang === 'fr' ? 'Contours extérieurs' : 'Outer Contours', count: outerCount, visible: state.layerVis.outers, operation: state.layerOps.outers });
      }
      if (open.length) rows.push({ key: 'open', color: '#f59e0b', name: currentLang === 'fr' ? 'Gravure / Lignes ouvertes' : 'Engrave / Open Paths', count: open.length, visible: state.layerVis.open, operation: state.layerOps.open });
    }

    rows.forEach(r => {
      const div = document.createElement('div');
      div.className = 'layer-item' + (!r.visible || r.operation === 'ignore' ? ' layer-muted' : '');
      div.innerHTML = `
        <button type="button" class="layer-eye-btn" title="${currentLang === 'fr' ? 'Afficher/Masquer' : 'Show/Hide'}">${r.visible ? '👁️' : '🙈'}</button>
        <div class="layer-color" style="background:${escHtml(r.color)}"></div>
        <span class="layer-name">${escHtml(r.name)}</span>
        <select class="layer-op-sel" aria-label="Layer operation">
          <option value="cut" ${r.operation === 'cut' ? 'selected' : ''}>${currentLang === 'fr' ? 'Coupe' : 'Cut'}</option>
          <option value="score" ${r.operation === 'score' ? 'selected' : ''}>${currentLang === 'fr' ? 'Gravure' : 'Score'}</option>
          <option value="pocket" ${r.operation === 'pocket' ? 'selected' : ''}>${currentLang === 'fr' ? 'Poche' : 'Pocket'}</option>
          <option value="ignore" ${r.operation === 'ignore' ? 'selected' : ''}>${currentLang === 'fr' ? 'Ignorer' : 'Ignore'}</option>
        </select>
        <span class="layer-count">${r.count}</span>
      `;
      div.querySelector('.layer-eye-btn').addEventListener('click', () => {
        if (isColor) state.vectorPaths[r.idx].visible = !r.visible;
        else state.layerVis[r.key] = !r.visible;
        drawVectorPreview(state.vectorPaths, state.vectorDims.w, state.vectorDims.h);
        updateLayers(state.vectorPaths);
      });
      div.querySelector('.layer-op-sel').addEventListener('change', (e) => {
        if (isColor) state.vectorPaths[r.idx].operation = e.target.value;
        else state.layerOps[r.key] = e.target.value;
        drawVectorPreview(state.vectorPaths, state.vectorDims.w, state.vectorDims.h);
        updateLayers(state.vectorPaths);
      });
      list.appendChild(div);
    });
  }

  // ═══════════════════════════════════════════════════════
  // NON-DESTRUCTIVE ROTATE / FLIP (PRESERVES ORIGINAL COLOR SOURCE!)
  // ═══════════════════════════════════════════════════════
  function applyTransform(kind) {
    if (!state.rawSourceCanvas && !state.vectorPaths.length) return;
    if (state.vectorPaths.length) pushUndoSnapshot();

    const isRot = kind === 'rot90' || kind === 'rot-90';
    if (state.rawSourceCanvas) {
      const oldW = state.rawSourceCanvas.width, oldH = state.rawSourceCanvas.height;
      const newW = isRot ? oldH : oldW, newH = isRot ? oldW : oldH;
      const off = document.createElement('canvas');
      off.width = newW; off.height = newH;
      const octx = off.getContext('2d');
      octx.save();
      if (kind === 'rot90') { octx.translate(newW, 0); octx.rotate(Math.PI / 2); }
      else if (kind === 'rot-90') { octx.translate(0, newH); octx.rotate(-Math.PI / 2); }
      else if (kind === 'flipH') { octx.translate(newW, 0); octx.scale(-1, 1); }
      else if (kind === 'flipV') { octx.translate(0, newH); octx.scale(1, -1); }
      octx.drawImage(state.rawSourceCanvas, 0, 0);
      octx.restore();
      state.rawSourceCanvas = off;
      state.stats.width = newW; state.stats.height = newH;

      const cvOrig = $('canvasOrig');
      if (cvOrig) {
        cvOrig.width = newW; cvOrig.height = newH;
        applyFilters(cvOrig, cvOrig.getContext('2d'));
      }
    }

    if (state.vectorPaths.length) {
      const vw = state.vectorDims.w || 500, vh = state.vectorDims.h || 500;
      const nvw = isRot ? vh : vw, nvh = isRot ? vw : vh;
      const mapPt = ([x, y]) => {
        if (kind === 'rot90') return [vh - y, x];
        if (kind === 'rot-90') return [y, vw - x];
        if (kind === 'flipH') return [vw - x, y];
        return [x, vh - y];
      };
      const mapArr = arr => arr.map(p => {
        const np = p.map(mapPt); np.closed = p.closed; np.color = p.color; np.operation = p.operation;
        return np;
      });
      if (state.settings.mode === 'color') {
        state.vectorPaths = state.vectorPaths.map(l => {
          const nl = mapArr(l);
          nl.colorData = l.colorData; nl.colorName = l.colorName; nl.visible = l.visible !== false; nl.operation = l.operation || 'cut';
          return nl;
        });
      } else {
        state.vectorPaths = mapArr(state.vectorPaths);
      }
      state.vectorDims = { w: nvw, h: nvh };
      state.svgOutput = buildSVG(state.vectorPaths, nvw, nvh);
      drawVectorPreview(state.vectorPaths, nvw, nvh);
      updateLayers(state.vectorPaths);
    }
    updateStats();
    if (window.Features && window.Features.refreshCompare) window.Features.refreshCompare();
  }

  // ═══════════════════════════════════════════════════════
  // CNC PRO SUITE HOOKS: TEXT, NESTING, PREFLIGHT FIX, .SPCNC PROJECT
  // ═══════════════════════════════════════════════════════
  function addVectorText({ text, mode, sizeMm, position, bridges, replace }) {
    const VE = window.VectorEngine;
    if (!VE) return;
    if (state.vectorPaths.length) pushUndoSnapshot();

    let w = state.vectorDims.w || (state.rawSourceCanvas ? state.rawSourceCanvas.width : 560);
    let h = state.vectorDims.h || (state.rawSourceCanvas ? state.rawSourceCanvas.height : 440);
    const { physW, physH } = getSinglePartDimensionsMm(w, h);
    const pxPerMm = h / Math.max(1, physH);
    const hPx = Math.max(12, Math.min(h * 0.65, sizeMm * pxPerMm));
    const cy = position === 'top' ? h * 0.16 : (position === 'bottom' ? h * 0.84 : h * 0.5);

    const newPaths = mode === 'hershey'
      ? VE.generateHersheyTextPaths(text, w * 0.5, cy - hPx * 0.5, hPx, 0.25, 'center')
      : VE.generateStencilTextPaths(text, w * 0.5, cy, hPx, 'Space Grotesk, Inter, sans-serif', bridges, 'center');

    newPaths.forEach(p => { p.operation = mode === 'hershey' ? 'score' : 'cut'; });

    if (replace || !state.vectorPaths.length) {
      state.sourceKind = 'text';
      state.settings.mode = mode === 'hershey' ? 'centerline' : 'contour';
      syncModeChipsUI();
      state.vectorPaths = newPaths;
      state.vectorDims = { w, h };
      if (!state.rawSourceCanvas) {
        const bg = document.createElement('canvas'); bg.width = w; bg.height = h;
        const bCtx = bg.getContext('2d'); bCtx.fillStyle = '#ffffff'; bCtx.fillRect(0, 0, w, h);
        VE.drawPathsOnCtx(bCtx, newPaths, false, '#111111', '#111111', mode === 'hershey');
        setRawSourceFromCanvas(bg);
        updateFileInfoUI('cnc-text.svg', 'Vector', w, h);
        enableImageExports(true);
      }
    } else if (state.settings.mode === 'color') {
      newPaths.colorData = '#0EA5E9';
      newPaths.colorName = `Text "${text.slice(0, 12)}"`;
      newPaths.visible = true;
      newPaths.operation = mode === 'hershey' ? 'score' : 'cut';
      state.vectorPaths.push(newPaths);
    } else {
      state.vectorPaths = state.vectorPaths.concat(newPaths);
    }

    recomputeStatsFromPaths();
    state.svgOutput = buildSVG(state.vectorPaths, w, h);
    drawVectorPreview(state.vectorPaths, w, h);
    updateStats();
    updateLayers(state.vectorPaths);
    enableExports(true);
    toast('✅ ' + t('textAdded'), 'success');
  }

  function applyNestedResult(res) {
    state.nestedOverride = res;
    if ($('nestActiveBadge')) {
      $('nestActiveBadge').style.display = 'inline-flex';
      $('nestActiveBadge').textContent = `🧩 ${res.placed}× (${res.physW}×${res.physH}mm · ${res.utilizationPct}%)`;
    }
    updateStats();
    toast(currentLang === 'fr' ? `🧩 Imbrication appliquée : ${res.placed} pièces (${res.utilizationPct}% utile) !` : `🧩 Auto-Nesting applied: ${res.placed} parts (${res.utilizationPct}% sheet used)!`, 'success');
  }

  function runPreflightFix(kind) {
    if (!state.vectorPaths.length) return;
    const isColor = state.settings.mode === 'color';
    if (kind === 'duplicates') {
      pushUndoSnapshot();
      const res = window.VectorEngine.removeDuplicatePaths(state.vectorPaths, isColor);
      state.vectorPaths = res.paths;
      recomputeStatsFromPaths();
      drawVectorPreview(state.vectorPaths, state.vectorDims.w, state.vectorDims.h);
      updateStats(); updateLayers(state.vectorPaths);
      toast(currentLang === 'fr' ? `🛡️ ${res.removed} lignes dupliquées supprimées !` : `🛡️ Removed ${res.removed} duplicate paths!`, 'success');
    } else if (kind === 'open') {
      pushUndoSnapshot();
      const res = window.VectorEngine.autoCloseOpenContours(state.vectorPaths, 14, isColor);
      state.vectorPaths = res.paths;
      recomputeStatsFromPaths();
      drawVectorPreview(state.vectorPaths, state.vectorDims.w, state.vectorDims.h);
      updateStats(); updateLayers(state.vectorPaths);
      toast(currentLang === 'fr' ? `🛡️ ${res.closedCount} contours ouverts refermés !` : `🛡️ Auto-closed ${res.closedCount} open contours!`, 'success');
    } else if (kind === 'fitbed') {
      const payload = getVectorExportPayload();
      const scale = Math.min((state.settings.bedW - 10) / payload.physW, (state.settings.bedH - 10) / payload.physH);
      if (scale < 1) {
        state.exportSettings.unit = 'mm';
        state.exportSettings.width = Math.round(payload.physW * scale * 10) / 10;
        state.exportSettings.height = Math.round(payload.physH * scale * 10) / 10;
        if ($('exportSizeUnit')) $('exportSizeUnit').value = 'mm';
        if ($('exportWidth')) $('exportWidth').value = state.exportSettings.width;
        if ($('exportHeight')) $('exportHeight').value = state.exportSettings.height;
        state.nestedOverride = null;
        updateStats();
        toast(currentLang === 'fr' ? '✅ Redimensionné aux limites du plateau !' : '✅ Scaled to fit machine bed!', 'success');
      }
    }
  }

  // 100% FREE Project Save / Load (.spcnc JSON)
  function setupProjectIO() {
    if ($('btnSaveProject')) $('btnSaveProject').addEventListener('click', saveProjectJson);
    if ($('btnLoadProject')) $('btnLoadProject').addEventListener('click', () => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = '.spcnc,.json';
      inp.onchange = () => { if (inp.files[0]) loadFile(inp.files[0]); };
      inp.click();
    });
  }

  function saveProjectJson() {
    if (!state.vectorPaths.length) { toast(t('noVector'), 'error'); return; }
    const isColor = state.settings.mode === 'color';
    const serializedPaths = isColor
      ? state.vectorPaths.map(l => ({ colorData: l.colorData, colorName: l.colorName, visible: l.visible !== false, operation: l.operation || 'cut', items: l.map(p => ({ pts: p, closed: p.closed !== false })) }))
      : state.vectorPaths.map(p => ({ pts: p, closed: p.closed !== false, color: p.color, operation: p.operation }));
    const doc = {
      format: 'studios-pro-vector-cnc-v2',
      savedAt: new Date().toISOString(),
      fileName: state.sourceFileName || 'project',
      dims: state.vectorDims,
      isColor,
      settings: state.settings,
      exportSettings: state.exportSettings,
      layerOps: state.layerOps,
      layerVis: state.layerVis,
      paths: serializedPaths
    };
    const blob = new Blob([JSON.stringify(doc)], { type: 'application/json' });
    triggerBlobDownload(blob, (state.sourceFileName || 'project').replace(/\.[^.]+$/, '') + '.spcnc');
    toast('💾 ' + t('projectSaved'), 'success');
  }

  function loadProjectJson(text) {
    try {
      const doc = JSON.parse(text);
      if (!doc || !Array.isArray(doc.paths)) throw new Error('Invalid .spcnc project');
      Object.assign(state.settings, doc.settings || {});
      Object.assign(state.exportSettings, doc.exportSettings || {});
      if (doc.layerOps) state.layerOps = { ...doc.layerOps };
      if (doc.layerVis) state.layerVis = { ...doc.layerVis };
      state.sourceKind = 'text';
      state.sourceFileName = (doc.fileName || 'project') + '.spcnc';
      state.vectorDims = doc.dims || { w: 560, h: 440 };
      if (doc.isColor) {
        state.vectorPaths = doc.paths.map(l => {
          const arr = (l.items || []).map(it => { const p = it.pts.slice(); p.closed = it.closed; return p; });
          arr.colorData = l.colorData; arr.colorName = l.colorName; arr.visible = l.visible !== false; arr.operation = l.operation || 'cut';
          return arr;
        });
      } else {
        state.vectorPaths = doc.paths.map(it => { const p = it.pts.slice(); p.closed = it.closed; p.color = it.color; p.operation = it.operation; return p; });
      }
      syncModeChipsUI(); syncCncTypeUI();
      recomputeStatsFromPaths();
      drawVectorPreview(state.vectorPaths, state.vectorDims.w, state.vectorDims.h);
      updateFileInfoUI(state.sourceFileName, 'SPCNC', state.vectorDims.w, state.vectorDims.h);
      updateStats(); updateLayers(state.vectorPaths);
      enableExports(true);
      toast('📂 ' + t('projectLoaded'), 'success');
    } catch (e) { toast('Project Error: ' + e.message, 'error'); }
  }

  function setupMobileSwitcher() {
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.mobileView;
        document.body.classList.toggle('mobile-preview-active', view === 'preview');
        document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.toggle('active', b === btn));
      });
    });
  }

  function enableExports(on) {
    ['btnVecPreview', 'btnVecBatchZip', 'btnSimulate', 'btnExportSTL', 'btnViewAR', 'btnSaveProject'].forEach(id => {
      if ($(id)) $(id).disabled = !on;
    });
    document.querySelectorAll('.export-card:not(.img-export-card)').forEach(c => c.classList.toggle('disabled', !on));
  }

  function enableImageExports(on) {
    document.querySelectorAll('.img-export-card').forEach(c => c.classList.toggle('disabled', !on));
    if ($('btnImgPreview')) $('btnImgPreview').disabled = !on;
    if ($('btnImgBatchZip')) $('btnImgBatchZip').disabled = !on;
  }

  function updateStats() {
    if ($('statPaths')) $('statPaths').textContent = state.stats.paths || '—';
    if ($('statNodes')) $('statNodes').textContent = state.stats.nodes > 0 ? (state.stats.nodes > 999 ? (state.stats.nodes / 1000).toFixed(1) + 'K' : state.stats.nodes) : '—';
    const refW = state.vectorDims.w || (state.rawSourceCanvas ? state.rawSourceCanvas.width : 0);
    const refH = state.vectorDims.h || (state.rawSourceCanvas ? state.rawSourceCanvas.height : 0);
    if (refW && refH) {
      const payload = state.vectorPaths.length ? getVectorExportPayload() : getSinglePartDimensionsMm(refW, refH);
      if ($('statW')) $('statW').textContent = payload.physW.toFixed(1);
      if ($('statH')) $('statH').textContent = payload.physH.toFixed(1);
    } else {
      if ($('statW')) $('statW').textContent = '0';
      if ($('statH')) $('statH').textContent = '0';
    }
    if (window.Features && window.Features.refreshRuler) window.Features.refreshRuler();
  }

  function showProcessing(show, txt = '') {
    const ov = $('processingOverlay');
    if (!ov) return;
    ov.classList.toggle('show', show);
    if ($('procText') && txt) $('procText').textContent = txt;
    if (!show) updateProgress(0);
  }
  function updateProgress(pct) { if ($('progressFill')) $('progressFill').style.width = pct + '%'; }
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function toast(msg, type = 'info') {
    const container = $('toastContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    el.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${escHtml(msg)}</span>`;
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 450); }, 3400);
  }

  // Public API for features.js & cnc-pro-suite.js
  return {
    init,
    loadFile,
    loadDemoPreset,
    applyTransform,
    exportSTL,
    launchARViewer,
    undo,
    redo,
    setZoom,
    zoomFit,
    setEraserActive,
    toast,
    gatedTextExport,
    addVectorText,
    applyNestedResult,
    runPreflightFix,
    hasVectors: () => state.vectorPaths.length > 0,
    getZoomState: () => ({ zoom: state.zoom, panX: state.panX, panY: state.panY, units: state.settings.units }),
    getPhysicalMetrics: () => {
      const refW = state.vectorDims.w || (state.rawSourceCanvas ? state.rawSourceCanvas.width : 500);
      const refH = state.vectorDims.h || (state.rawSourceCanvas ? state.rawSourceCanvas.height : 500);
      return getSinglePartDimensionsMm(refW, refH);
    },
    getRawVectorInfo: () => {
      const w = state.vectorDims.w || 500, h = state.vectorDims.h || 500;
      const { physW, physH } = getSinglePartDimensionsMm(w, h);
      return { paths: state.vectorPaths, w, h, physW, physH, isColor: state.settings.mode === 'color' };
    },
    getToolpathData: () => {
      const payload = getVectorExportPayload();
      return buildGcodeBundle(payload.paths, payload.w, payload.h, payload.physW, payload.physH);
    },
    getPreflightInfo: () => {
      const payload = getVectorExportPayload();
      const toolDia = state.settings.cncType === 'router' ? Number(state.settings.bitDiameter || 3.175) : Number(state.settings.kerf || 0.15);
      const report = window.VectorEngine.inspectPreflight(payload.paths, payload.w, payload.h, payload.physW, payload.physH, toolDia, state.settings.bedW, state.settings.bedH, payload.isColor);
      return { ...payload, report };
    },
    exportGcodeDirect: () => exportAs('gcode'),
    getProfileSnapshot: () => ({
      settings: { ...state.settings },
      exportSettings: { ...state.exportSettings },
      grid: {
        cols: $('gridCols')?.value || '1',
        rows: $('gridRows')?.value || '1',
        spaceX: $('gridSpaceX')?.value || '2',
        spaceY: $('gridSpaceY')?.value || '2'
      }
    }),
    applyProfileSnapshot: (snap) => {
      if (!snap) return;
      if (snap.settings) Object.assign(state.settings, snap.settings);
      if (snap.exportSettings) Object.assign(state.exportSettings, snap.exportSettings);
      // Sync DOM controls cleanly without triggering recursive vectorize storms
      Object.entries(state.settings).forEach(([k, v]) => {
        const el = $(k) || $(k + 'Toggle');
        if (!el) return;
        if (el.type === 'checkbox') el.checked = !!v;
        else el.value = v;
        const vl = $(k + 'Val');
        if (vl) vl.textContent = v;
      });
      if ($('dogboneMode')) $('dogboneMode').value = state.settings.dogbone || 'none';
      if ($('exportUnits')) $('exportUnits').value = state.settings.units || 'mm';
      if ($('exportWidth')) $('exportWidth').value = state.exportSettings.width || '';
      if ($('exportHeight')) $('exportHeight').value = state.exportSettings.height || '';
      if ($('exportSizeUnit')) $('exportSizeUnit').value = state.exportSettings.unit || 'mm';
      if ($('exportDPI')) $('exportDPI').value = state.exportSettings.dpi || 300;
      if (snap.grid) {
        if ($('gridCols')) $('gridCols').value = snap.grid.cols;
        if ($('gridRows')) $('gridRows').value = snap.grid.rows;
        if ($('gridSpaceX')) $('gridSpaceX').value = snap.grid.spaceX;
        if ($('gridSpaceY')) $('gridSpaceY').value = snap.grid.spaceY;
      }
      syncModeChipsUI(); syncCncTypeUI();
      document.querySelectorAll('.material-card').forEach(x => x.classList.toggle('active', x.dataset.material === state.settings.material));
      document.querySelectorAll('.machine-chip').forEach(x => x.classList.toggle('active', x.dataset.machine === state.settings.machine));
      if (state.rawSourceCanvas) { refreshOriginal(); vectorize(true); }
      updateStats();
    },
    refreshLang: () => {
      if (state.vectorPaths.length) updateLayers(state.vectorPaths);
      updateStats();
    }
  };
})();
window.App = App;

// ═══════════════════════════════════════════════════════
// BILINGUAL EN / FR SYNC (URL ?lang= + Parent localStorage 'sp_lang')
// ═══════════════════════════════════════════════════════
function switchLang(lang) {
  currentLang = (lang === 'fr') ? 'fr' : 'en';
  document.documentElement.lang = currentLang;
  document.documentElement.classList.toggle('fr', currentLang === 'fr');
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === currentLang));
  try { localStorage.setItem('sp_lang', currentLang); } catch (_) {}
  if (window.App && App.refreshLang) App.refreshLang();
}

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const initialLang = params.get('lang') || localStorage.getItem('sp_lang') || 'en';
  switchLang(initialLang);

  App.init();
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.addEventListener('click', () => switchLang(b.dataset.lang));
  });
  window.addEventListener('storage', (e) => {
    if (e.key === 'sp_lang' && (e.newValue === 'en' || e.newValue === 'fr')) switchLang(e.newValue);
  });
});
