/**
 * DFX Studio Pro — Master Application Controller
 * Wires Raster Engine + Vector/DXF/CAD Doctor/G-Code Engine + 2D/3D Viewport,
 * 6 Working Smart Presets, Undo/Redo, Layer Manager, Drag&Drop, Clipboard Paste,
 * Bilingual EN/FR i18n, and Unified Studios-Pro Host Contracts.
 */
(function () {
  'use strict';

  const Raster = window.DfxRaster;
  const Vec = window.DfxVector;

  // ============================================================================
  // APPLICATION STATE
  // ============================================================================
  const state = {
    lang: 'en',
    sourceMode: 'raster',     // 'raster' | 'cad' (native DXF/SVG)
    sourceName: 'mechanical_flange_120mm.png',
    activeSample: 'flange',
    activePreset: 'logo',
    viewMode: 'split',        // 'split' | 'vector' | 'raster' | '3d'

    // Physical scale
    widthMm: 120,
    aspect: 1.0,

    // Raster & Trace Parameters (EVERY SINGLE ONE IS LIVE & WIRED!)
    laserMode: false,
    multiColor: false,
    numColors: 4,
    ditheringMode: 'Threshold (B&W)',
    autoThreshold: true,
    threshold: 128,
    brightness: 0,
    contrast: 0,
    gamma: 1.0,
    lineStrength: 0,
    sharpen: 0,
    denoise: 0,
    surfaceSmoothing: 0,
    invertColors: false,
    bilateralFilter: 0,
    unsharpMask: 0,
    morphology: 0,
    medianFilter: false,
    thinningIntensity: 0,

    // Vectorization Precision
    smoothness: 1.0,
    pathOmit: 6,
    blurPasses: 1,
    rightAngleEnhance: true,
    ltres: 1.0,
    qtres: 1.0,

    // CAD Doctor tolerances
    stitchTolMm: 0.50,
    dupTolMm: 0.08,

    // Export & 3D & G-Code
    kerfMm: 0.0,
    dxfVersion: 'R12',
    roundCoords: 3,
    strokeWidthPx: 1.6,
    thick3dMm: 5.0,
    bevel3dMm: 0.4,
    mat3d: 'aluminum',
    machineMode: 'laser',
    feedRate: 1200,
    passes: 1,
    laserPowerPct: 85,
    bmpMode: 'color',
    bmpDPI: 300
  };

  // Runtime buffers
  let origCanvas = null;       // Full/capped original color image canvas
  let procCanvas = null;       // Processed raster preview canvas
  let lastRasterOut = null;    // Output of Raster.processRaster(...)
  let cadDoc = null;           // Active CadDoc (mm)
  let kerfDoc = null;          // Kerf-offset CadDoc preview
  let diagnostics = null;      // CAD Doctor diagnostics
  let toolpathPlan = null;     // Inside-First TSP optimized plan
  let viewport = null;

  // Undo / Redo snapshots (stores cloned CadDoc for CAD edits/repairs/deletions)
  const undoStack = [];
  const redoStack = [];
  const MAX_HISTORY = 25;

  // Pending calibration distance
  let pendingCalibMeasuredMm = 0;

  // Paywall / Studios-Pro Host Bridge
  let isPremiumUser = false;
  let pendingExportAction = null;
  const broadcastCh = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('studios_pro_channel') : null;
  const FREE_EXPORTS_KEY = 'sp_dfx_free_exports';

  // ============================================================================
  // SMART PRESETS (ALL 6 GENUINELY WIRED!)
  // ============================================================================
  const PRESETS = {
    logo: {
      laserMode: false, multiColor: false, ditheringMode: 'Threshold (B&W)',
      autoThreshold: true, brightness: 0, contrast: 18, gamma: 1.0,
      lineStrength: 0, sharpen: 15, denoise: 0, surfaceSmoothing: 0,
      bilateralFilter: 0, unsharpMask: 15, morphology: 0, medianFilter: false,
      thinningIntensity: 0, smoothness: 0.9, pathOmit: 6, blurPasses: 1,
      rightAngleEnhance: true, ltres: 1.0, qtres: 1.0, viewMode: 'split'
    },
    photo: {
      laserMode: false, multiColor: false, ditheringMode: 'Atkinson (Sharper)',
      autoThreshold: false, threshold: 128, brightness: 4, contrast: 22, gamma: 1.1,
      lineStrength: 0, sharpen: 20, denoise: 12, surfaceSmoothing: 0,
      bilateralFilter: 1, unsharpMask: 25, morphology: 0, medianFilter: false,
      thinningIntensity: 0, smoothness: 1.4, pathOmit: 10, blurPasses: 0,
      rightAngleEnhance: false, ltres: 1.2, qtres: 1.2, viewMode: 'raster'
    },
    laser: {
      laserMode: true, multiColor: false, ditheringMode: 'Threshold (B&W)',
      autoThreshold: true, brightness: 0, contrast: 20, gamma: 1.0,
      lineStrength: 25, sharpen: 10, denoise: 10, surfaceSmoothing: 0,
      bilateralFilter: 0, unsharpMask: 0, morphology: 4, medianFilter: false,
      thinningIntensity: 0, smoothness: 1.0, pathOmit: 4, blurPasses: 1,
      rightAngleEnhance: true, ltres: 1.0, qtres: 1.0, viewMode: 'vector'
    },
    sketch: {
      laserMode: true, multiColor: false, ditheringMode: 'Adaptive Paper Scan (Sauvola)',
      autoThreshold: true, brightness: 0, contrast: 12, gamma: 1.0,
      lineStrength: 45, sharpen: 15, denoise: 20, surfaceSmoothing: 15,
      bilateralFilter: 1, unsharpMask: 15, morphology: 4, medianFilter: true,
      thinningIntensity: 0, smoothness: 1.2, pathOmit: 8, blurPasses: 1,
      rightAngleEnhance: true, ltres: 1.0, qtres: 1.0, viewMode: 'split'
    },
    edges: {
      laserMode: true, multiColor: false, ditheringMode: 'Edge Detection',
      autoThreshold: true, brightness: 0, contrast: 10, gamma: 1.0,
      lineStrength: 15, sharpen: 0, denoise: 15, surfaceSmoothing: 10,
      bilateralFilter: 1, unsharpMask: 0, morphology: 0, medianFilter: false,
      thinningIntensity: 0, smoothness: 1.0, pathOmit: 6, blurPasses: 1,
      rightAngleEnhance: true, ltres: 1.0, qtres: 1.0, viewMode: 'vector'
    },
    multicolor: {
      laserMode: false, multiColor: true, numColors: 4, ditheringMode: 'Grayscale',
      autoThreshold: true, brightness: 0, contrast: 10, gamma: 1.0,
      lineStrength: 0, sharpen: 10, denoise: 0, surfaceSmoothing: 0,
      bilateralFilter: 0, unsharpMask: 0, morphology: 0, medianFilter: false,
      thinningIntensity: 0, smoothness: 1.0, pathOmit: 8, blurPasses: 1,
      rightAngleEnhance: true, ltres: 1.0, qtres: 1.0, viewMode: 'split'
    }
  };

  // ============================================================================
  // DOM HELPERS & TOAST
  // ============================================================================
  const $ = id => document.getElementById(id);

  let toastTimer = null;
  function showToast(msgEn, msgFr) {
    const el = $('toast');
    if (!el) return;
    el.textContent = (state.lang === 'fr' && msgFr) ? msgFr : msgEn;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  }

  function cloneDoc(doc) {
    if (!doc) return null;
    return {
      sourceType: doc.sourceType,
      sourceName: doc.sourceName,
      widthMm: doc.widthMm,
      heightMm: doc.heightMm,
      layers: doc.layers.map(l => Object.assign({}, l)),
      paths: doc.paths.map(p => Object.assign({}, p, { pts: p.pts.map(pt => [pt[0], pt[1]]) }))
    };
  }

  function pushUndo() {
    if (!cadDoc) return;
    undoStack.push(cloneDoc(cadDoc));
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack.length = 0;
    updateUndoButtons();
  }

  function updateUndoButtons() {
    const u = $('btnUndo'), r = $('btnRedo');
    if (u) u.disabled = undoStack.length === 0;
    if (r) r.disabled = redoStack.length === 0;
  }

  // ============================================================================
  // CORE PIPELINE: RASTER -> VECTOR -> DIAGNOSTICS -> VIEWPORT
  // ============================================================================
  let debounceTimer = null;
  function scheduleRasterRebuild(immediate) {
    clearTimeout(debounceTimer);
    if (immediate) runRasterPipeline();
    else debounceTimer = setTimeout(runRasterPipeline, 45);
  }

  function runRasterPipeline() {
    if (state.sourceMode !== 'raster' || !origCanvas) return;
    const w = origCanvas.width, h = origCanvas.height;
    const ctx = origCanvas.getContext('2d', { willReadFrequently: true });
    const imgData = ctx.getImageData(0, 0, w, h);

    lastRasterOut = Raster.processRaster(imgData.data, w, h, {
      brightness: state.brightness,
      contrast: state.contrast,
      gamma: state.gamma,
      invertColors: state.invertColors,
      denoise: state.denoise,
      surfaceSmoothing: state.surfaceSmoothing,
      bilateralFilter: state.bilateralFilter,
      medianFilter: state.medianFilter,
      lineStrength: state.lineStrength,
      sharpen: state.sharpen,
      unsharpMask: state.unsharpMask,
      morphology: state.morphology,
      ditheringMode: state.ditheringMode,
      threshold: state.threshold,
      autoThreshold: state.autoThreshold,
      laserMode: state.laserMode,
      thinningIntensity: state.thinningIntensity
    });

    // Update Otsu threshold display when Auto Threshold is enabled
    if (state.autoThreshold) {
      state.threshold = lastRasterOut.effectiveThreshold;
      $('rngThreshold').value = state.threshold;
      $('valThreshold').textContent = state.threshold + ' (Otsu)';
    }

    // Paint processed raster preview canvas
    if (!procCanvas) procCanvas = document.createElement('canvas');
    procCanvas.width = w;
    procCanvas.height = h;
    const pCtx = procCanvas.getContext('2d');
    const outImg = new ImageData(lastRasterOut.displayRGBA, w, h);
    pCtx.putImageData(outImg, 0, 0);

    // Vectorize according to active engine
    if (state.multiColor && !state.laserMode) {
      const mc = Vec.traceMultiColorLayers(lastRasterOut.colorRGBA, w, h, {
        widthMm: state.widthMm,
        numColors: state.numColors,
        smoothness: state.smoothness,
        pathOmit: state.pathOmit,
        rightAngleEnhance: state.rightAngleEnhance,
        ltres: state.ltres,
        qtres: state.qtres
      });
      cadDoc = {
        sourceType: 'raster',
        sourceName: state.sourceName,
        widthMm: mc.widthMm,
        heightMm: mc.heightMm,
        layers: mc.layers,
        paths: mc.paths
      };
    } else if (state.laserMode) {
      // TRUE TOPOLOGICAL SINGLE-LINE CENTERLINE!
      const cl = Vec.traceCenterlineFromSkeleton(lastRasterOut.binary, w, h, {
        widthMm: state.widthMm,
        smoothness: state.smoothness,
        spurMinPx: Math.max(3, Math.round(state.pathOmit * 0.6)),
        rightAngleEnhance: state.rightAngleEnhance,
        ltres: state.ltres,
        layerId: 'layer_laser'
      });
      cadDoc = {
        sourceType: 'raster',
        sourceName: state.sourceName,
        widthMm: cl.widthMm,
        heightMm: cl.heightMm,
        layers: [{ id: 'layer_laser', name: 'LASER_SINGLE_LINE', color: '#f97316', aci: 30, op: 'SCORE', visible: true, locked: false }],
        paths: cl.paths
      };
    } else {
      // MARCHING SQUARES SUB-PIXEL CONTOUR TRACER (ZERO WHITE BACKGROUND BUG!)
      const tr = Vec.traceContoursFromBinary(lastRasterOut.binary, w, h, {
        widthMm: state.widthMm,
        smoothness: state.smoothness,
        pathOmit: state.pathOmit,
        rightAngleEnhance: state.rightAngleEnhance,
        blurPasses: state.blurPasses,
        ltres: state.ltres,
        qtres: state.qtres,
        layerId: 'layer_cut'
      });
      cadDoc = {
        sourceType: 'raster',
        sourceName: state.sourceName,
        widthMm: tr.widthMm,
        heightMm: tr.heightMm,
        layers: [{ id: 'layer_cut', name: 'CUT', color: '#10b981', aci: 3, op: 'CUT', visible: true, locked: false }],
        paths: tr.paths
      };
    }

    refreshDerivedAndRender();
  }

  function refreshDerivedAndRender() {
    if (!cadDoc) return;
    state.widthMm = cadDoc.widthMm;
    state.aspect = cadDoc.heightMm / Math.max(1e-6, cadDoc.widthMm);
    $('numWidthMm').value = cadDoc.widthMm.toFixed(1);
    $('numHeightMm').value = cadDoc.heightMm.toFixed(1);

    kerfDoc = state.kerfMm > 0.005 ? Vec.applyKerfOffset(cadDoc, state.kerfMm) : null;
    diagnostics = Vec.diagnoseCad(cadDoc, { dupTolMm: state.dupTolMm, speckleMinMm: 0.6 });
    toolpathPlan = Vec.optimizeToolpaths(kerfDoc || cadDoc, { feedRateMmMin: state.feedRate });

    // Update CAD Doctor diagnostics badges
    $('diagClosed').textContent = diagnostics.closedCount;
    $('diagOpen').textContent = diagnostics.openEndpoints.length;
    $('diagDups').textContent = diagnostics.duplicates.length;
    $('diagIslands').textContent = diagnostics.stencilIslands.length + diagnostics.speckles.length;

    // Update Bottom Telemetry HUD (compact zero-clip formatting)
    $('hudSize').textContent = `${cadDoc.widthMm.toFixed(1)}×${cadDoc.heightMm.toFixed(1)} mm`;
    $('hudPaths').textContent = toolpathPlan.pierceCount;
    $('hudNodes').textContent = toolpathPlan.nodeCount;
    $('hudCutLen').textContent = `${(toolpathPlan.cutLengthMm / 1000).toFixed(2)}m`;
    $('hudTime').textContent = `~${toolpathPlan.estMinutes.toFixed(1)} min`;

    renderLayerManager();

    if (viewport) {
      viewport.setData({
        doc: cadDoc,
        kerfDoc,
        diagnostics,
        toolpathPlan,
        origImageCanvas: state.sourceMode === 'raster' ? origCanvas : null,
        procRasterCanvas: state.sourceMode === 'raster' ? procCanvas : null,
        kerfMm: state.kerfMm,
        strokeWidthPx: state.strokeWidthPx
      });
    }
  }

  function renderLayerManager() {
    const list = $('layerList');
    if (!list || !cadDoc) return;
    $('valLayerCount').textContent = cadDoc.layers.length;
    list.innerHTML = '';

    for (const l of cadDoc.layers) {
      const count = cadDoc.paths.filter(p => p.layerId === l.id).length;
      const row = document.createElement('div');
      row.className = 'layer-item';

      const colorIn = document.createElement('input');
      colorIn.type = 'color';
      colorIn.className = 'layer-color';
      colorIn.value = /^#[0-9a-fA-F]{6}$/.test(l.color) ? l.color : '#10b981';
      colorIn.addEventListener('input', () => {
        l.color = colorIn.value;
        l.aci = Vec.nearestACI(l.color);
        refreshDerivedAndRender();
      });

      const nameEl = document.createElement('div');
      nameEl.className = 'layer-name';
      nameEl.title = `${l.name} (${count} paths · ACI ${l.aci})`;
      nameEl.textContent = `${l.name} (${count})`;

      const opSel = document.createElement('select');
      opSel.className = 'layer-op';
      ['CUT', 'ENGRAVE', 'SCORE'].forEach(op => {
        const opt = document.createElement('option');
        opt.value = op;
        opt.textContent = op;
        if (l.op === op) opt.selected = true;
        opSel.appendChild(opt);
      });
      opSel.addEventListener('change', () => {
        l.op = opSel.value;
        refreshDerivedAndRender();
      });

      const eyeBtn = document.createElement('button');
      eyeBtn.type = 'button';
      eyeBtn.className = 'layer-eye' + (l.visible === false ? ' off' : '');
      eyeBtn.textContent = l.visible === false ? '🙈' : '👁';
      eyeBtn.title = 'Toggle Layer Visibility';
      eyeBtn.addEventListener('click', () => {
        l.visible = l.visible === false ? true : false;
        refreshDerivedAndRender();
      });

      row.appendChild(colorIn);
      row.appendChild(nameEl);
      row.appendChild(opSel);
      row.appendChild(eyeBtn);
      list.appendChild(row);
    }
  }

  // ============================================================================
  // LOADING SAMPLES, IMAGES, DXF, SVG & .SPDFX PROJECTS
  // ============================================================================
  function syncUIFromState() {
    $('chkLaserMode').checked = state.laserMode;
    $('laserModeCard').classList.toggle('active', state.laserMode);
    $('laserStateLbl').textContent = state.laserMode ? 'ON' : 'OFF';

    $('selDitherMode').value = state.ditheringMode;
    $('chkAutoThresh').checked = state.autoThreshold;
    $('rngThreshold').value = state.threshold;
    $('valThreshold').textContent = state.threshold + (state.autoThreshold ? ' (Otsu)' : '');
    $('manualThreshWrap').style.opacity = state.autoThreshold ? '0.5' : '1';

    $('chkMultiColor').checked = state.multiColor;
    $('multiColorWrap').style.display = state.multiColor ? 'flex' : 'none';
    $('rngNumColors').value = state.numColors;
    $('valNumColors').textContent = state.numColors;

    $('rngBrightness').value = state.brightness; $('valBrightness').textContent = state.brightness;
    $('rngContrast').value = state.contrast; $('valContrast').textContent = state.contrast;
    $('rngGamma').value = state.gamma; $('valGamma').textContent = state.gamma.toFixed(1);
    $('rngLineStrength').value = state.lineStrength; $('valLineStrength').textContent = state.lineStrength;
    $('rngSharpen').value = state.sharpen; $('valSharpen').textContent = state.sharpen;
    $('rngDenoise').value = state.denoise; $('valDenoise').textContent = state.denoise;
    $('rngSurfaceSmooth').value = state.surfaceSmoothing; $('valSurfaceSmooth').textContent = state.surfaceSmoothing;
    $('chkInvert').checked = state.invertColors;

    $('rngBilateral').value = state.bilateralFilter; $('valBilateral').textContent = state.bilateralFilter;
    $('rngUnsharp').value = state.unsharpMask; $('valUnsharp').textContent = state.unsharpMask;
    $('selMorphology').value = String(state.morphology);
    $('chkMedian').checked = state.medianFilter;
    $('rngThinning').value = state.thinningIntensity; $('valThinning').textContent = state.thinningIntensity;

    $('rngSmoothness').value = state.smoothness; $('valSmoothness').textContent = state.smoothness.toFixed(1);
    $('rngPathOmit').value = state.pathOmit; $('valPathOmit').textContent = state.pathOmit;
    $('rngBlurPasses').value = state.blurPasses; $('valBlurPasses').textContent = state.blurPasses;
    $('chkRightAngle').checked = state.rightAngleEnhance;
    $('rngLtres').value = state.ltres; $('valLtres').textContent = state.ltres.toFixed(1);
    $('rngQtres').value = state.qtres; $('valQtres').textContent = state.qtres.toFixed(1);

    $('rngKerf').value = state.kerfMm; $('valKerf').textContent = state.kerfMm.toFixed(2) + ' mm';
    $('selDxfVer').value = state.dxfVersion;
    $('rngDecimals').value = state.roundCoords; $('valDecimals').textContent = state.roundCoords;
    $('rngStrokeW').value = state.strokeWidthPx; $('valStrokeW').textContent = state.strokeWidthPx.toFixed(1) + ' px';

    $('rngThick3d').value = state.thick3dMm; $('valThick3d').textContent = state.thick3dMm.toFixed(1) + ' mm';
    $('rngBevel3d').value = state.bevel3dMm; $('valBevel3d').textContent = state.bevel3dMm.toFixed(1) + ' mm';
    $('selMat3d').value = state.mat3d;

    $('selMachineMode').value = state.machineMode;
    $('numFeedRate').value = state.feedRate;
    $('numPasses').value = state.passes;
    $('rngPower').value = state.laserPowerPct;
    $('valPowerDepth').textContent = `${state.laserPowerPct}% · ${state.thick3dMm.toFixed(1)}mm`;

    $('selBmpMode').value = state.bmpMode;
    $('rngBmpDpi').value = state.bmpDPI; $('valBmpDpi').textContent = state.bmpDPI + ' DPI';

    document.querySelectorAll('.preset-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.preset === state.activePreset);
    });
  }

  function applyPreset(name, silent) {
    const p = PRESETS[name];
    if (!p) return;
    state.activePreset = name;
    Object.assign(state, p);
    syncUIFromState();
    if (p.viewMode && state.sourceMode === 'raster') setViewMode(p.viewMode);
    if (state.sourceMode === 'raster') scheduleRasterRebuild(true);
    if (!silent) showToast(`Preset applied: ${name.toUpperCase()}`, `Préréglage appliqué : ${name.toUpperCase()}`);
  }

  function setViewMode(mode) {
    // If native DXF/SVG without raster image, fallback 'split'/'raster' -> 'vector'
    let eff = mode;
    if (state.sourceMode === 'cad' && (mode === 'split' || mode === 'raster')) {
      eff = 'vector';
    }
    state.viewMode = eff;
    document.querySelectorAll('.view-tab').forEach(t => t.classList.toggle('active', t.dataset.view === eff));
    if (viewport) viewport.setViewMode(eff);
  }

  function loadSample(sampleId) {
    state.activeSample = sampleId;
    undoStack.length = 0;
    redoStack.length = 0;
    updateUndoButtons();

    if (sampleId === 'dxf_nema17' || sampleId === 'dxf_doctor') {
      const rawDxf = Vec.getSampleDXF(sampleId === 'dxf_doctor' ? 'doctor' : 'clean');
      state.sourceMode = 'cad';
      state.sourceName = sampleId === 'dxf_doctor' ? 'nema17_cad_doctor_demo.dxf' : 'nema17_mount_60mm.dxf';
      origCanvas = null;
      procCanvas = null;
      cadDoc = Vec.parseDXF(rawDxf, state.sourceName);
      setViewMode('vector');
      switchLeftTab('cad');
      refreshDerivedAndRender();
      if (viewport) viewport.fitToView();
      if (sampleId === 'dxf_doctor') {
        showToast('CAD Doctor Demo loaded! Click Auto-Repair to fix duplicates & open gaps.', 'Démo Docteur CAO chargée ! Cliquez sur Réparer.');
      } else {
        showToast('Native AutoCAD DXF loaded (60 × 60 mm NEMA-17 Plate)', 'DXF AutoCAD chargé (Plaque NEMA-17 60 × 60 mm)');
      }
      return;
    }

    // Procedural high-res raster sample
    state.sourceMode = 'raster';
    if (!origCanvas) origCanvas = document.createElement('canvas');
    const meta = Raster.drawSampleToCanvas(sampleId, origCanvas);
    state.sourceName = meta.name;
    state.widthMm = meta.defaultWidthMm || 120;
    switchLeftTab('trace');
    applyPreset(meta.recommendedPreset || 'logo', true);
    if (viewport) viewport.fitToView();
  }

  function loadImageObject(img, fileName) {
    // Cap interactive working canvas cleanly at 1024px max side so every filter runs in < 20ms!
    const maxDim = 1024;
    let w = img.naturalWidth || img.width || 640;
    let h = img.naturalHeight || img.height || 640;
    if (w > maxDim || h > maxDim) {
      const r = maxDim / Math.max(w, h);
      w = Math.max(16, Math.round(w * r));
      h = Math.max(16, Math.round(h * r));
    }
    if (!origCanvas) origCanvas = document.createElement('canvas');
    origCanvas.width = w;
    origCanvas.height = h;
    const ctx = origCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    state.sourceMode = 'raster';
    state.sourceName = fileName || 'photo.png';
    undoStack.length = 0;
    redoStack.length = 0;
    updateUndoButtons();
    switchLeftTab('trace');
    setViewMode('split');
    runRasterPipeline();
    if (viewport) viewport.fitToView();
    showToast(`Image loaded (${w}×${h}px) & vectorized to 1:1 mm`, `Image chargée (${w}×${h}px) et vectorisée en 1:1 mm`);
  }

  function handleIncomingFile(file) {
    if (!file) return;
    const name = file.name || 'imported';
    const ext = name.split('.').pop().toLowerCase();

    if (ext === 'dxf') {
      const reader = new FileReader();
      reader.onload = () => {
        state.sourceMode = 'cad';
        state.sourceName = name;
        origCanvas = null;
        procCanvas = null;
        cadDoc = Vec.parseDXF(String(reader.result || ''), name);
        undoStack.length = 0; redoStack.length = 0; updateUndoButtons();
        setViewMode('vector');
        switchLeftTab('cad');
        refreshDerivedAndRender();
        if (viewport) viewport.fitToView();
        showToast(`DXF imported: ${cadDoc.paths.length} paths (${cadDoc.widthMm.toFixed(1)}×${cadDoc.heightMm.toFixed(1)} mm)`, `DXF importé : ${cadDoc.paths.length} tracés`);
      };
      reader.readAsText(file);
      return;
    }

    if (ext === 'svg') {
      const reader = new FileReader();
      reader.onload = () => {
        state.sourceMode = 'cad';
        state.sourceName = name;
        origCanvas = null;
        procCanvas = null;
        cadDoc = Vec.parseSVG(String(reader.result || ''), name);
        undoStack.length = 0; redoStack.length = 0; updateUndoButtons();
        setViewMode('vector');
        switchLeftTab('cad');
        refreshDerivedAndRender();
        if (viewport) viewport.fitToView();
        showToast(`SVG imported: ${cadDoc.paths.length} paths`, `SVG importé : ${cadDoc.paths.length} tracés`);
      };
      reader.readAsText(file);
      return;
    }

    if (ext === 'spdfx' || ext === 'json') {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result || '{}'));
          if (data.state) Object.assign(state, data.state);
          if (data.cadDoc && Array.isArray(data.cadDoc.paths)) {
            cadDoc = data.cadDoc;
            state.sourceMode = 'cad';
            origCanvas = null; procCanvas = null;
            syncUIFromState();
            setViewMode('vector');
            refreshDerivedAndRender();
            if (viewport) viewport.fitToView();
            showToast('Project .spdfx restored!', 'Projet .spdfx restauré !');
          }
        } catch (err) {
          showToast('Invalid .spdfx project file', 'Fichier .spdfx invalide');
        }
      };
      reader.readAsText(file);
      return;
    }

    // Standard raster image (PNG, JPG, WEBP, BMP)
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => loadImageObject(img, name);
      img.onerror = () => showToast('Failed to decode image file', 'Échec du chargement de l’image');
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function switchLeftTab(tab) {
    document.querySelectorAll('.s-tab').forEach(b => b.classList.toggle('active', b.dataset.leftTab === tab));
    $('paneTrace').style.display = tab === 'trace' ? 'flex' : 'none';
    $('paneCad').style.display = tab === 'cad' ? 'flex' : 'none';
  }

  // ============================================================================
  // EXPORTS & STUDIOS-PRO UNIFIED PAYWALL BRIDGE
  // ============================================================================
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function baseFileName() {
    return (state.sourceName || 'dfx_studio').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  function requestExportGate(actionFn) {
    if (isPremiumUser) { actionFn(); return; }
    if (window.parent && window.parent !== window) {
      pendingExportAction = actionFn;
      window.parent.postMessage({ type: 'CHECK_EXPORT_LIMIT', studio: 'dfx' }, '*');
      // Safe fallback timeout if host doesn't answer (e.g. local preview)
      setTimeout(() => {
        if (pendingExportAction === actionFn) {
          pendingExportAction = null;
          runLocalFreeLimitCheck(actionFn);
        }
      }, 900);
    } else {
      runLocalFreeLimitCheck(actionFn);
    }
  }

  function runLocalFreeLimitCheck(actionFn) {
    let used = 0;
    try { used = parseInt(localStorage.getItem(FREE_EXPORTS_KEY) || '0', 10) || 0; } catch (_) {}
    if (used < 5) {
      try { localStorage.setItem(FREE_EXPORTS_KEY, String(used + 1)); } catch (_) {}
      actionFn();
    } else {
      $('paymentModal').classList.add('show');
    }
  }

  function doExportDXF() {
    if (!cadDoc || cadDoc.paths.length === 0) return showToast('No vector paths to export', 'Aucun tracé vectoriel à exporter');
    const txt = Vec.exportDXF(cadDoc, {
      version: state.dxfVersion,
      roundCoords: state.roundCoords,
      kerfMm: state.kerfMm
    });
    downloadBlob(new Blob([txt], { type: 'application/dxf' }), `${baseFileName()}_${state.dxfVersion}_1to1mm.dxf`);
    showToast(`Exported ${state.dxfVersion} DXF (${cadDoc.widthMm.toFixed(1)}×${cadDoc.heightMm.toFixed(1)} mm)`, `DXF ${state.dxfVersion} exporté en 1:1 mm !`);
  }

  function doExportSVG() {
    if (!cadDoc || cadDoc.paths.length === 0) return showToast('No vector paths to export', 'Aucun tracé vectoriel');
    const svg = Vec.exportSVG(cadDoc, {
      strokeWidthMm: Math.max(0.1, state.strokeWidthPx * 0.15),
      roundCoords: state.roundCoords,
      kerfMm: state.kerfMm
    });
    downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), `${baseFileName()}_1to1mm.svg`);
    showToast('Exported 1:1 mm Vector SVG (Zero background frame!)', 'SVG vectoriel 1:1 mm exporté !');
  }

  function doExportGCode() {
    if (!cadDoc || cadDoc.paths.length === 0) return showToast('No vector paths for G-Code', 'Aucun tracé pour G-Code');
    const nc = Vec.exportGCode(cadDoc, {
      machineMode: state.machineMode,
      feedRate: state.feedRate,
      laserPowerPct: state.laserPowerPct,
      passes: state.passes,
      cutDepthMm: state.thick3dMm,
      kerfMm: state.kerfMm
    });
    downloadBlob(new Blob([nc], { type: 'text/plain' }), `${baseFileName()}_${state.machineMode}.nc`);
    showToast(`Exported GRBL ${state.machineMode.toUpperCase()} G-Code (.nc)`, `G-Code GRBL ${state.machineMode.toUpperCase()} exporté !`);
  }

  function doExportSTL() {
    if (!viewport) return;
    const bytes = viewport.exportExtrudedSTL();
    if (!bytes) return showToast('Switch to closed contours for 3D STL extrusion', 'Contours fermés requis pour l’extrusion STL');
    downloadBlob(new Blob([bytes], { type: 'application/octet-stream' }), `${baseFileName()}_${state.thick3dMm}mm.stl`);
    showToast(`Exported Watertight 3D STL (${state.thick3dMm} mm thick)`, `STL 3D étanche exporté (${state.thick3dMm} mm) !`);
  }

  function doExportBMP() {
    let colorBuf, grayOrBin, w, h;
    if (lastRasterOut && state.sourceMode === 'raster') {
      w = lastRasterOut.width;
      h = lastRasterOut.height;
      colorBuf = lastRasterOut.colorRGBA;
      grayOrBin = state.bmpMode === 'highcontrast' ? lastRasterOut.binary : lastRasterOut.gray;
    } else {
      // Rasterize current CAD canvas for BMP export when native DXF is open
      const c = $('cadCanvas2D');
      w = c.width; h = c.height;
      const tmp = c.getContext('2d').getImageData(0, 0, w, h).data;
      colorBuf = tmp;
      const bin = new Uint8Array(w * h);
      const gr = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) {
        const lum = 0.299 * tmp[i * 4] + 0.587 * tmp[i * 4 + 1] + 0.114 * tmp[i * 4 + 2];
        gr[i] = lum;
        bin[i] = lum < 128 ? 1 : 0;
      }
      grayOrBin = state.bmpMode === 'highcontrast' ? bin : gr;
    }
    const bmpBytes = Raster.encodeBMP(colorBuf, grayOrBin, w, h, state.bmpMode, state.bmpDPI);
    downloadBlob(new Blob([bmpBytes], { type: 'image/bmp' }), `${baseFileName()}_${state.bmpMode}_${state.bmpDPI}dpi.bmp`);
    showToast(`Exported ${state.bmpMode.toUpperCase()} BMP @ ${state.bmpDPI} DPI`, `BMP ${state.bmpMode.toUpperCase()} exporté à ${state.bmpDPI} DPI`);
  }

  function doExportPNGFree() {
    if (!viewport) return;
    const dataUrl = viewport.capturePNGDataURL();
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${baseFileName()}_preview.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('PNG Snapshot saved (FREE)', 'Capture PNG enregistrée (GRATUIT)');
  }

  function doSaveProjectFree() {
    if (!cadDoc) return;
    const payload = JSON.stringify({
      format: 'studios-pro-dfx',
      version: 2,
      state,
      cadDoc
    });
    downloadBlob(new Blob([payload], { type: 'application/json' }), `${baseFileName()}.spdfx`);
    showToast('Project .spdfx saved (FREE)', 'Projet .spdfx sauvegardé (GRATUIT)');
  }

  // ============================================================================
  // EVENT WIRING & HOST CONTRACTS
  // ============================================================================
  function bindUI() {
    // Back button -> unified CLOSE_STUDIO
    $('back-btn').addEventListener('click', () => {
      if (broadcastCh) broadcastCh.postMessage({ type: 'CLOSE_STUDIO' });
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'CLOSE_STUDIO' }, '*');
      } else {
        window.history.back();
      }
    });

    // Bilingual EN/FR toggle
    document.querySelectorAll('[data-set-lang]').forEach(btn => {
      btn.addEventListener('click', () => setLanguage(btn.dataset.setLang));
    });

    // View mode tabs (Split / Vector / Raster / 3D)
    document.querySelectorAll('.view-tab').forEach(tab => {
      tab.addEventListener('click', () => setViewMode(tab.dataset.view));
    });

    // Left sidebar tabs
    document.querySelectorAll('.s-tab').forEach(tab => {
      tab.addEventListener('click', () => switchLeftTab(tab.dataset.leftTab));
    });

    // Mobile bottom nav
    document.querySelectorAll('[data-m-pane]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.body.setAttribute('data-mobile-pane', btn.dataset.mPane);
        document.querySelectorAll('[data-m-pane]').forEach(b => b.classList.toggle('active', b === btn));
        if (viewport) setTimeout(() => viewport.resize(), 40);
      });
    });

    // Import button & file input
    $('btnImportFile').addEventListener('click', () => $('fileInput').click());
    $('fileInput').addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) handleIncomingFile(e.target.files[0]);
      e.target.value = '';
    });

    // Built-in Sample Gallery
    $('sampleSelect').addEventListener('change', (e) => loadSample(e.target.value));

    // Global Drag & Drop (FIXES broken upload-zone drag & drop!)
    let dragCounter = 0;
    window.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      $('dropOverlay').classList.add('show');
    });
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter = Math.max(0, dragCounter - 1);
      if (dragCounter === 0) $('dropOverlay').classList.remove('show');
    });
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      $('dropOverlay').classList.remove('show');
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) handleIncomingFile(file);
    });

    // Clipboard Paste (Ctrl+V) for screenshots & images!
    window.addEventListener('paste', (e) => {
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const blob = items[i].getAsFile();
          if (blob) handleIncomingFile(new File([blob], 'pasted_image.png', { type: blob.type }));
          break;
        }
      }
    });

    // Smart Presets (ALL 6 WORKING!)
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (state.sourceMode !== 'raster') {
          showToast('Presets apply to Photo/Image mode. Select a photo sample or import an image!', 'Les préréglages s’appliquent aux images.');
          return;
        }
        applyPreset(btn.dataset.preset);
      });
    });

    // True Single-Line Laser Mode toggle
    $('laserModeCard').addEventListener('click', () => {
      state.laserMode = !state.laserMode;
      if (state.laserMode) state.multiColor = false;
      syncUIFromState();
      if (state.sourceMode === 'raster') scheduleRasterRebuild(true);
      showToast(state.laserMode ? 'Single-Line Centerline Laser Mode ON' : 'Contour Cut Mode restored',
        state.laserMode ? 'Mode Laser Ligne Unique ACTIVÉ' : 'Mode Contour Fermé rétabli');
    });

    // Real Auto-Enhance (FIXES dead Auto-Enhance button!)
    $('btnAutoEnhance').addEventListener('click', () => {
      if (!origCanvas) return showToast('Import an image first', 'Importez d’abord une image');
      const ctx = origCanvas.getContext('2d', { willReadFrequently: true });
      const data = ctx.getImageData(0, 0, origCanvas.width, origCanvas.height).data;
      const opt = Raster.computeAutoEnhance(data, origCanvas.width, origCanvas.height);
      state.brightness = opt.brightness;
      state.contrast = opt.contrast;
      state.gamma = opt.gamma;
      state.threshold = opt.threshold;
      syncUIFromState();
      scheduleRasterRebuild(true);
      showToast(`Auto-Enhanced (B:${opt.brightness}, C:${opt.contrast}, γ:${opt.gamma})`,
        `Auto-optimisé (L:${opt.brightness}, C:${opt.contrast}, γ:${opt.gamma})`);
    });

    // Bind every raster & vector slider cleanly
    function bindRange(id, key, valId, fmtFn, isVectorOnly) {
      $(id).addEventListener('input', (e) => {
        state[key] = parseFloat(e.target.value);
        if (valId) $(valId).textContent = fmtFn ? fmtFn(state[key]) : state[key];
        if (key === 'threshold') {
          state.autoThreshold = false;
          $('chkAutoThresh').checked = false;
        }
        if (isVectorOnly) {
          refreshDerivedAndRender();
        } else if (state.sourceMode === 'raster') {
          scheduleRasterRebuild(false);
        }
      });
    }

    bindRange('rngThreshold', 'threshold', 'valThreshold', v => String(Math.round(v)));
    bindRange('rngNumColors', 'numColors', 'valNumColors', v => String(Math.round(v)));
    bindRange('rngBrightness', 'brightness', 'valBrightness', v => String(Math.round(v)));
    bindRange('rngContrast', 'contrast', 'valContrast', v => String(Math.round(v)));
    bindRange('rngGamma', 'gamma', 'valGamma', v => v.toFixed(1));
    bindRange('rngLineStrength', 'lineStrength', 'valLineStrength', v => String(Math.round(v)));
    bindRange('rngSharpen', 'sharpen', 'valSharpen', v => String(Math.round(v)));
    bindRange('rngDenoise', 'denoise', 'valDenoise', v => String(Math.round(v)));
    bindRange('rngSurfaceSmooth', 'surfaceSmoothing', 'valSurfaceSmooth', v => String(Math.round(v)));
    bindRange('rngBilateral', 'bilateralFilter', 'valBilateral', v => String(Math.round(v)));
    bindRange('rngUnsharp', 'unsharpMask', 'valUnsharp', v => String(Math.round(v)));
    bindRange('rngThinning', 'thinningIntensity', 'valThinning', v => String(Math.round(v)));
    bindRange('rngSmoothness', 'smoothness', 'valSmoothness', v => v.toFixed(1));
    bindRange('rngPathOmit', 'pathOmit', 'valPathOmit', v => String(Math.round(v)));
    bindRange('rngBlurPasses', 'blurPasses', 'valBlurPasses', v => String(Math.round(v)));
    bindRange('rngLtres', 'ltres', 'valLtres', v => v.toFixed(1));
    bindRange('rngQtres', 'qtres', 'valQtres', v => v.toFixed(1));

    bindRange('rngStitchTol', 'stitchTolMm', 'valStitchTol', v => v.toFixed(2) + ' mm', true);
    bindRange('rngDupTol', 'dupTolMm', 'valDupTol', v => v.toFixed(2) + ' mm', true);
    bindRange('rngKerf', 'kerfMm', 'valKerf', v => v.toFixed(2) + ' mm', true);
    bindRange('rngDecimals', 'roundCoords', 'valDecimals', v => String(Math.round(v)), true);
    bindRange('rngStrokeW', 'strokeWidthPx', 'valStrokeW', v => v.toFixed(1) + ' px', true);

    $('selDitherMode').addEventListener('change', (e) => {
      state.ditheringMode = e.target.value;
      if (state.sourceMode === 'raster') scheduleRasterRebuild(true);
    });
    $('chkAutoThresh').addEventListener('change', (e) => {
      state.autoThreshold = e.target.checked;
      syncUIFromState();
      if (state.sourceMode === 'raster') scheduleRasterRebuild(true);
    });
    $('chkMultiColor').addEventListener('change', (e) => {
      state.multiColor = e.target.checked;
      if (state.multiColor) state.laserMode = false;
      syncUIFromState();
      if (state.sourceMode === 'raster') scheduleRasterRebuild(true);
    });
    $('chkInvert').addEventListener('change', (e) => {
      state.invertColors = e.target.checked;
      if (state.sourceMode === 'raster') scheduleRasterRebuild(true);
    });
    $('selMorphology').addEventListener('change', (e) => {
      state.morphology = parseInt(e.target.value, 10) || 0;
      if (state.sourceMode === 'raster') scheduleRasterRebuild(true);
    });
    $('chkMedian').addEventListener('change', (e) => {
      state.medianFilter = e.target.checked;
      if (state.sourceMode === 'raster') scheduleRasterRebuild(true);
    });
    $('chkRightAngle').addEventListener('change', (e) => {
      state.rightAngleEnhance = e.target.checked;
      if (state.sourceMode === 'raster') scheduleRasterRebuild(true);
    });

    // Physical Width mm input
    $('numWidthMm').addEventListener('change', (e) => {
      const w = Math.max(5, Math.min(5000, parseFloat(e.target.value) || 100));
      if (!cadDoc) return;
      pushUndo();
      cadDoc = Vec.scaleDoc(cadDoc, w);
      state.widthMm = w;
      refreshDerivedAndRender();
      if (viewport) viewport.fitToView();
    });

    // Quick CAD Transforms
    $('btnMirrorX').addEventListener('click', () => {
      if (!cadDoc) return;
      pushUndo();
      cadDoc = Vec.mirrorDoc(cadDoc, 'x');
      refreshDerivedAndRender();
    });
    $('btnMirrorY').addEventListener('click', () => {
      if (!cadDoc) return;
      pushUndo();
      cadDoc = Vec.mirrorDoc(cadDoc, 'y');
      refreshDerivedAndRender();
    });
    $('btnRotate90').addEventListener('click', () => {
      if (!cadDoc) return;
      pushUndo();
      cadDoc = Vec.rotateDoc90(cadDoc);
      refreshDerivedAndRender();
      if (viewport) viewport.fitToView();
    });

    // CAD Doctor One-Click Auto-Repair!
    $('btnRunDoctor').addEventListener('click', () => {
      if (!cadDoc) return;
      pushUndo();
      const res = Vec.repairCad(cadDoc, {
        overkill: true,
        healOpen: true,
        removeSpeckles: true,
        mergeCollinear: true,
        dupTolMm: state.dupTolMm,
        stitchTolMm: state.stitchTolMm,
        speckleMinMm: 0.6
      });
      cadDoc = res.doc;
      const st = res.stats;
      refreshDerivedAndRender();
      showToast(
        `CAD Doctor fixed: -${st.duplicatesRemoved} dups, ${st.contoursStitched} stitched, ${st.loopsClosed} loops closed, -${st.specklesRemoved} speckles!`,
        `Docteur CAO : -${st.duplicatesRemoved} doublons, ${st.contoursStitched} soudés, ${st.loopsClosed} boucles fermées !`
      );
    });

    // Undo / Redo
    function doUndo() {
      if (!undoStack.length) return;
      redoStack.push(cloneDoc(cadDoc));
      cadDoc = undoStack.pop();
      updateUndoButtons();
      refreshDerivedAndRender();
    }
    function doRedo() {
      if (!redoStack.length) return;
      undoStack.push(cloneDoc(cadDoc));
      cadDoc = redoStack.pop();
      updateUndoButtons();
      refreshDerivedAndRender();
    }
    $('btnUndo').addEventListener('click', doUndo);
    $('btnRedo').addEventListener('click', doRedo);
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); doUndo(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); doRedo(); }
    });

    // Floating CAD Tool Dock
    function selectDockTool(tool) {
      document.querySelectorAll('.dock-btn[data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === tool));
      if (viewport) viewport.setTool(tool);
      if (tool !== 'select') $('selectionPill').classList.remove('show');
    }
    document.querySelectorAll('.dock-btn[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => selectDockTool(btn.dataset.tool));
    });
    $('btnStartCalibrate').addEventListener('click', () => {
      selectDockTool('calibrate');
      showToast('Click 2 reference points on the drawing to calibrate mm', 'Cliquez 2 points de référence sur le dessin');
    });

    $('btnTogGrid').addEventListener('click', (e) => {
      e.currentTarget.classList.toggle('active');
      if (viewport) viewport.showGrid = e.currentTarget.classList.contains('active');
    });
    $('btnTogFill').addEventListener('click', (e) => {
      e.currentTarget.classList.toggle('active');
      if (viewport) viewport.showFill = e.currentTarget.classList.contains('active');
    });
    $('btnTogDiag').addEventListener('click', (e) => {
      e.currentTarget.classList.toggle('active');
      if (viewport) viewport.showDiagnostics = e.currentTarget.classList.contains('active');
    });
    $('btnZoomIn').addEventListener('click', () => viewport && viewport.zoomStep(1.28));
    $('btnZoomOut').addEventListener('click', () => viewport && viewport.zoomStep(1 / 1.28));
    $('btnFitView').addEventListener('click', () => viewport && viewport.fitToView());

    // Delete selected path
    $('btnDeleteSelected').addEventListener('click', () => {
      if (!viewport || !viewport.selectedPathId || !cadDoc) return;
      deletePathById(viewport.selectedPathId);
    });

    // 2-Point Calibration Apply
    $('btnApplyCalibrate').addEventListener('click', () => {
      const targetMm = parseFloat($('numCalibTargetMm').value);
      if (targetMm > 0 && pendingCalibMeasuredMm > 1e-4 && cadDoc) {
        pushUndo();
        const factor = targetMm / pendingCalibMeasuredMm;
        cadDoc = Vec.scaleDoc(cadDoc, cadDoc.widthMm * factor);
        state.widthMm = cadDoc.widthMm;
        refreshDerivedAndRender();
        if (viewport) {
          viewport.calibratePts = [];
          viewport.fitToView();
        }
        showToast(`Calibrated 1:1 mm! New size: ${cadDoc.widthMm.toFixed(1)} × ${cadDoc.heightMm.toFixed(1)} mm`,
          `Calibré 1:1 mm ! Nouvelle taille : ${cadDoc.widthMm.toFixed(1)} × ${cadDoc.heightMm.toFixed(1)} mm`);
      }
      $('calibrateModal').classList.remove('show');
      selectDockTool('pan');
    });

    // Laser/CNC Simulator controls
    $('btnSimPlay').addEventListener('click', () => {
      if (!viewport) return;
      if (state.viewMode === 'raster' || state.viewMode === '3d') setViewMode('vector');
      const playing = viewport.toggleSimPlay();
      $('btnSimPlay').classList.toggle('active', playing);
    });
    $('btnSimStop').addEventListener('click', () => {
      if (!viewport) return;
      viewport.stopSim();
      $('btnSimPlay').classList.remove('active');
      $('rngSimProg').value = 0;
    });
    $('rngSimProg').addEventListener('input', (e) => {
      if (!viewport) return;
      if (state.viewMode === 'raster' || state.viewMode === '3d') setViewMode('vector');
      viewport.setSimProgress(parseFloat(e.target.value) / 1000);
    });
    $('selSimSpeed').addEventListener('change', (e) => {
      if (viewport) viewport.simSpeed = parseFloat(e.target.value) || 3;
    });

    // 3D Extrude controls
    $('rngThick3d').addEventListener('input', (e) => {
      state.thick3dMm = parseFloat(e.target.value);
      $('valThick3d').textContent = state.thick3dMm.toFixed(1) + ' mm';
      $('valPowerDepth').textContent = `${state.laserPowerPct}% · ${state.thick3dMm.toFixed(1)}mm`;
      if (viewport) viewport.setExtrudeOptions({ thicknessMm: state.thick3dMm });
    });
    $('rngBevel3d').addEventListener('input', (e) => {
      state.bevel3dMm = parseFloat(e.target.value);
      $('valBevel3d').textContent = state.bevel3dMm.toFixed(1) + ' mm';
      if (viewport) viewport.setExtrudeOptions({ bevelMm: state.bevel3dMm });
    });
    $('selMat3d').addEventListener('change', (e) => {
      state.mat3d = e.target.value;
      if (viewport) viewport.setExtrudeOptions({ material: state.mat3d });
    });

    // DXF/GCode/BMP settings
    $('selDxfVer').addEventListener('change', (e) => { state.dxfVersion = e.target.value; });
    $('selMachineMode').addEventListener('change', (e) => { state.machineMode = e.target.value; });
    $('numFeedRate').addEventListener('change', (e) => {
      state.feedRate = Math.max(50, parseFloat(e.target.value) || 1200);
      refreshDerivedAndRender();
    });
    $('numPasses').addEventListener('change', (e) => { state.passes = Math.max(1, parseInt(e.target.value, 10) || 1); });
    $('rngPower').addEventListener('input', (e) => {
      state.laserPowerPct = parseInt(e.target.value, 10) || 85;
      $('valPowerDepth').textContent = `${state.laserPowerPct}% · ${state.thick3dMm.toFixed(1)}mm`;
    });
    $('selBmpMode').addEventListener('change', (e) => { state.bmpMode = e.target.value; });
    $('rngBmpDpi').addEventListener('input', (e) => {
      state.bmpDPI = parseInt(e.target.value, 10) || 300;
      $('valBmpDpi').textContent = state.bmpDPI + ' DPI';
    });

    // Export Buttons
    $('btnExportDXF').addEventListener('click', () => requestExportGate(doExportDXF));
    $('btnExportSVG').addEventListener('click', () => requestExportGate(doExportSVG));
    $('btnExportGCode').addEventListener('click', () => requestExportGate(doExportGCode));
    $('btnExportSTL').addEventListener('click', () => requestExportGate(doExportSTL));
    $('btnExportBMP').addEventListener('click', () => requestExportGate(doExportBMP));
    $('btnExportPNG').addEventListener('click', doExportPNGFree);
    $('btnSaveProject').addEventListener('click', doSaveProjectFree);

    // View in AR (FREE via untouched ar-bridge.js!)
    $('btnViewAR').addEventListener('click', async () => {
      if (!viewport) return;
      try {
        showToast('Preparing 1:1 m WebAR 3D model...', 'Préparation du modèle WebAR 1:1 m...');
        await viewport.launchAR(`${baseFileName()}.glb`);
      } catch (err) {
        showToast('AR Viewer unavailable in standalone preview', 'Visionneuse RA non disponible ici');
      }
    });

    // Modal close buttons & Upgrade CTA
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => $(btn.dataset.closeModal).classList.remove('show'));
    });
    $('btnUpgradePro').addEventListener('click', () => {
      $('paymentModal').classList.remove('show');
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'SHOW_PAYWALL_MODAL' }, '*');
      }
      if (broadcastCh) broadcastCh.postMessage({ type: 'START_STRIPE_PAYMENT', payload: { type: 'premium', ref: 'dfx' } });
    });
  }

  function deletePathById(pathId) {
    if (!cadDoc) return;
    pushUndo();
    cadDoc.paths = cadDoc.paths.filter(p => p.id !== pathId);
    Vec.classifyContourHierarchy(cadDoc.paths);
    if (viewport) viewport.selectedPathId = null;
    $('selectionPill').classList.remove('show');
    refreshDerivedAndRender();
    showToast('Path removed (Ctrl+Z to undo)', 'Tracé supprimé (Ctrl+Z pour annuler)');
  }

  function setLanguage(lang) {
    state.lang = lang === 'fr' ? 'fr' : 'en';
    document.body.setAttribute('data-lang', state.lang);
    document.querySelectorAll('[data-set-lang]').forEach(b => b.classList.toggle('active', b.dataset.setLang === state.lang));
  }

  // ============================================================================
  // STUDIOS-PRO HOST MESSAGE BRIDGE & REMIX API
  // ============================================================================
  function handleHostMessage(d) {
    if (!d || typeof d !== 'object') return;
    if (d.type === 'SET_LANG' && (d.lang === 'en' || d.lang === 'fr')) {
      setLanguage(d.lang);
    } else if (d.type === 'USER_TIER_STATUS' || d.type === 'USER_STATUS_RESPONSE' || d.type === 'USER_STATUS_CHANGED') {
      const p = d.payload || d;
      isPremiumUser = !!(p.isPremium || p.tier === 'pro' || p.tier === 'premium');
    } else if (d.type === 'EXPORT_ALLOWED') {
      if (d.payload && d.payload.isPremium) isPremiumUser = true;
      if (pendingExportAction) {
        const fn = pendingExportAction;
        pendingExportAction = null;
        fn();
      }
    } else if (d.type === 'EXPORT_DENIED' || d.type === 'EXPORT_LIMIT_REACHED') {
      pendingExportAction = null;
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'SHOW_PAYWALL_MODAL' }, '*');
      } else {
        $('paymentModal').classList.add('show');
      }
    } else if (d.type === 'LOAD_EXTERNAL_FILE' && d.payload) {
      const { name, data, isBinary } = d.payload;
      if (isBinary) {
        fetch(data).then(r => r.blob()).then(b => handleIncomingFile(new File([b], name || 'imported.png'))).catch(() => {});
      } else {
        handleIncomingFile(new File([data], name || 'imported.dxf', { type: 'text/plain' }));
      }
    } else if (d.type === 'LOAD_EXTERNAL_URL' && d.payload && d.payload.url) {
      const url = d.payload.url;
      const name = url.split('/').pop().split('?')[0] || 'imported';
      fetch(url).then(r => r.blob()).then(b => handleIncomingFile(new File([b], name))).catch(() => {});
    }
  }

  window.addEventListener('message', (e) => handleHostMessage(e.data));
  if (broadcastCh) {
    broadcastCh.onmessage = (e) => handleHostMessage(e.data);
    broadcastCh.postMessage({ type: 'GET_USER_STATUS' });
  }

  // Host state inspection & remix persistence
  window.getAppState = () => ({
    studio: 'dfx',
    version: 2,
    state: Object.assign({}, state),
    summary: cadDoc ? { widthMm: cadDoc.widthMm, heightMm: cadDoc.heightMm, paths: cadDoc.paths.length } : null
  });
  window.getAppTags = () => ['dfx', 'dxf', 'svg', 'laser', 'cnc', 'gcode', '2d-cad', 'vectorizer', 'overkill', 'extrude-stl'];

  // ============================================================================
  // BOOTSTRAP (SAFE MODULE-READY HANDSHAKE)
  // ============================================================================
  function initViewportAndStart() {
    if (!window.DfxViewport) {
      setTimeout(initViewportAndStart, 25);
      return;
    }

    viewport = new window.DfxViewport.DfxViewportController({
      canvas2d: $('cadCanvas2D'),
      container3d: $('cadContainer3D'),
      callbacks: {
        onCursorMove: (x, y) => {
          $('hudCursor').textContent = `${x.toFixed(1)}, ${y.toFixed(1)} mm`;
        },
        onSelectPath: (path) => {
          if (path) {
            const len = Vec.pathLength(path.pts, path.closed);
            $('selectionInfo').textContent = `${path.id} · ${path.closed ? 'Closed' : 'Open'} · ${path.pts.length} pts · ${len.toFixed(1)} mm`;
            $('selectionPill').classList.add('show');
          } else {
            $('selectionPill').classList.remove('show');
          }
        },
        onDeletePath: (id) => deletePathById(id),
        onMeasure: (m) => {
          showToast(`Measure: ${m.dist.toFixed(2)} mm (ΔX ${m.dx.toFixed(2)}, ΔY ${m.dy.toFixed(2)}, ${m.angle.toFixed(1)}°)`,
            `Mesure : ${m.dist.toFixed(2)} mm (ΔX ${m.dx.toFixed(2)}, ΔY ${m.dy.toFixed(2)}, ${m.angle.toFixed(1)}°)`);
        },
        onCalibratePicked: (measuredMm) => {
          pendingCalibMeasuredMm = measuredMm;
          $('calibrateDesc').textContent = state.lang === 'fr'
            ? `Distance mesurée entre vos 2 points : ${measuredMm.toFixed(2)} mm. Entrez la vraie longueur physique en millimètres :`
            : `Measured distance between your 2 points: ${measuredMm.toFixed(2)} mm. Enter the true physical length in millimeters:`;
          $('numCalibTargetMm').value = Math.max(1, Math.round(measuredMm));
          $('calibrateModal').classList.add('show');
        },
        onSimUpdate: (prog, playing) => {
          $('rngSimProg').value = Math.round(prog * 1000);
          $('btnSimPlay').classList.toggle('active', playing);
        }
      }
    });

    bindUI();

    // Check optional Studios-Pro remix state
    try {
      const remixRaw = localStorage.getItem('sp_remix_state');
      if (remixRaw) {
        const remix = JSON.parse(remixRaw);
        if (remix && remix.studio === 'dfx' && remix.state) {
          Object.assign(state, remix.state);
          localStorage.removeItem('sp_remix_state');
        }
      }
    } catch (_) {}

    // Launch immediately with ready-to-use Mechanical Flange 120mm sample (zero blank dead screen!)
    loadSample(state.activeSample || 'flange');
    viewport.resize();
    viewport.fitToView();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initViewportAndStart);
  } else {
    initViewportAndStart();
  }
})();
