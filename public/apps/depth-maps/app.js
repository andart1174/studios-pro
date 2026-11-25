/**
 * Depth Maps Pro — Main Application Controller
 * Studios-Pro (https://studios-pro.com/apps/depth-maps/)
 * Wires AI WebGPU/WASM Engine, Sculpt Brush + 25x Undo/Redo, Live Probe,
 * Interactive Levels Histogram, 1:1 Compare, 3D PBR & Lithophane Studio,
 * Click-to-Focus Bokeh, Soft-Edge Cutout, PBR/CNC, Preflight, Quote,
 * .spdepth Project Save/Load, StudiosProGate & EN/FR i18n.
 */
(function () {
  'use strict';

  const DE = window.DepthEngine;
  const $ = (id) => document.getElementById(id);

  // ── 1. Bilingual i18n (Auto-synced with sp_lang + ?lang= without editing App.jsx) ──
  let currentLang = 'en';
  function detectInitialLang() {
    try {
      const qs = new URLSearchParams(window.location.search).get('lang');
      if (qs === 'fr' || qs === 'en') return qs;
      const stored = localStorage.getItem('sp_lang');
      if (stored === 'fr' || stored === 'en') return stored;
    } catch (_) {}
    return (navigator.language || '').toLowerCase().startsWith('fr') ? 'fr' : 'en';
  }

  function setLang(lang) {
    currentLang = lang === 'fr' ? 'fr' : 'en';
    document.body.setAttribute('data-lang', currentLang);
    document.documentElement.lang = currentLang;
    try { localStorage.setItem('sp_lang', currentLang); } catch (_) {}
    updateCreditsBadge();
    renderShortcutsBody();
    if (state.processed) {
      updateLightBurnTable();
    }
  }

  function t(en, fr) { return currentLang === 'fr' ? fr : en; }

  // ── 2. XSS-Safe Toast System ───────────────────────────────────────────────
  function toast(msg, icon) {
    const host = $('toastContainer');
    if (!host) return;
    const item = document.createElement('div');
    item.className = 'toast-item';
    const ic = document.createElement('span');
    ic.textContent = icon || '✅';
    const tx = document.createElement('span');
    tx.textContent = String(msg || '');
    item.appendChild(ic);
    item.appendChild(tx);
    host.appendChild(item);
    setTimeout(() => {
      item.style.opacity = '0';
      item.style.transform = 'translateY(8px)';
      item.style.transition = 'all 0.25s';
      setTimeout(() => item.remove(), 260);
    }, 3200);
  }

  // ── 3. Centralized Sealed Paywall Gate (5 Free Exports / Pro $10/mo) ───────
  const FREE_LIMIT = 5;
  const Gate = (function () {
    const channel = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('studios_pro_channel') : null;
    let isPremium = false;
    let pendingAction = null;

    function getFreeUsed() {
      try { return parseInt(localStorage.getItem('freeExportsUsed') || '0', 10) || 0; } catch (_) { return 0; }
    }
    function setFreeUsed(v) {
      try { localStorage.setItem('freeExportsUsed', String(v)); } catch (_) {}
    }
    function inIframe() {
      try { return window.self !== window.top; } catch (_) { return true; }
    }

    if (channel) {
      channel.onmessage = (ev) => {
        const msg = ev.data || {};
        if (msg.type === 'USER_STATUS_RESPONSE' || msg.type === 'USER_STATUS_CHANGED') {
          isPremium = !!(msg.payload && msg.payload.isPremium);
          updateCreditsBadge();
        } else if (msg.type === 'EXPORT_ALLOWED') {
          if (msg.payload && msg.payload.isPremium) isPremium = true;
          closeModal('paymentModal');
          updateCreditsBadge();
          const fn = pendingAction;
          pendingAction = null;
          if (typeof fn === 'function') {
            Promise.resolve(fn()).then((ok) => {
              if (ok !== false && !isPremium) {
                channel.postMessage({ type: 'EXPORT_COMPLETED' });
              }
            }).catch((err) => toast(err.message, '❌'));
          }
        } else if (msg.type === 'LOAD_EXTERNAL_FILE' && msg.payload) {
          handleExternalFilePayload(msg.payload);
        } else if (msg.type === 'LOAD_EXTERNAL_URL' && msg.payload && msg.payload.url) {
          fetch(msg.payload.url).then(r => r.blob()).then(blob => {
            const name = msg.payload.url.split('/').pop().split('?')[0] || 'external.png';
            loadUserFile(new File([blob], name, { type: blob.type || 'image/png' }));
          }).catch(() => {});
        }
      };
      channel.postMessage({ type: 'GET_USER_STATUS' });
    }

    async function runGatedExport(actionFn) {
      if (isPremium) {
        await actionFn();
        return;
      }
      if (!inIframe()) {
        const used = getFreeUsed();
        if (used >= FREE_LIMIT) {
          pendingAction = actionFn;
          openModal('paymentModal');
          return;
        }
        const ok = await actionFn();
        // Consume credit ONLY after export actually succeeded!
        if (ok !== false) {
          setFreeUsed(used + 1);
          updateCreditsBadge();
        }
        return;
      }
      // Inside Studios-Pro host iframe
      pendingAction = actionFn;
      if (channel) {
        channel.postMessage({ type: 'TRIGGER_PAYMENT_MODAL', payload: { ref: 'depth' } });
      } else {
        openModal('paymentModal');
      }
    }

    function requestUpgrade() {
      closeModal('paymentModal');
      if (inIframe() && channel) {
        channel.postMessage({ type: 'START_STRIPE_PAYMENT', payload: { type: 'premium', ref: 'depth' } });
      } else {
        window.open('/?upgrade=premium&ref=depth', '_blank');
      }
    }

    function closeStudio() {
      if (inIframe()) {
        if (channel) channel.postMessage({ type: 'CLOSE_STUDIO' });
        try { window.parent.postMessage({ type: 'CLOSE_STUDIO' }, '*'); } catch (_) {}
      } else {
        window.location.href = '/';
      }
    }

    return {
      isPremium: () => isPremium,
      remainingFree: () => Math.max(0, FREE_LIMIT - getFreeUsed()),
      runGatedExport,
      requestUpgrade,
      closeStudio
    };
  }());

  function updateCreditsBadge() {
    const b = $('creditsBadge');
    if (!b) return;
    if (Gate.isPremium()) {
      b.className = 'pill-badge pro';
      b.textContent = '★ PRO';
    } else {
      b.className = 'pill-badge';
      const rem = Gate.remainingFree();
      b.textContent = currentLang === 'fr' ? `${rem} Gratuits` : `${rem} Free`;
    }
  }

  // ── 4. Application State ───────────────────────────────────────────────────
  const DEFAULT_SETTINGS = {
    contrast: 1.0,
    brightness: 0.0,
    gamma: 1.0,
    blur: 0,
    detail: 0,
    texture: 0,
    bgCutoff: 0,
    bevel: 0,
    bevelShape: 'rect',
    contourSteps: 0,
    invert: false,
    autoClip: true,
    blackPoint: 0,
    whitePoint: 1
  };

  const state = {
    hasImage: false,
    imageName: 'depth_project',
    origCanvas: null,         // Full-res original photo canvas
    origW: 0,
    origH: 0,
    rawDepth: null,           // { data: Float32Array, width, height, device, modelId }
    luminanceHighPass: null,  // Cached at depth resolution for 60fps texture bump
    brushDelta: null,         // Float32Array matching rawDepth length
    processed: null,          // Latest computed processed depth
    meshData: null,           // Latest watertight 3D mesh
    cncResult: null,          // Latest CNC toolpath
    colorMap: 'Turbo',
    activeView: '2d',
    comparePct: 50,
    settings: Object.assign({}, DEFAULT_SETTINGS),
    brush: {
      enabled: false,
      mode: 'raise',          // raise | lower | smooth | flatten | erase
      size: 28,
      strength: 0.35,
      overlayAlpha: 0.25,
      flattenTarget: 0.0,
      painting: false
    },
    undoStack: [],
    redoStack: [],
    studio3d: null,
    dirty3d: true,
    dirtyBokeh: true,
    dirtyPBR: true,
    rafUpdate: null
  };

  // ── 5. Undo / Redo (25 Steps for Sliders + Sculpt Brush!) ──────────────────
  function pushHistory() {
    if (!state.rawDepth) return;
    state.undoStack.push({
      settings: Object.assign({}, state.settings),
      brushDelta: state.brushDelta ? new Float32Array(state.brushDelta) : null
    });
    if (state.undoStack.length > 25) state.undoStack.shift();
    state.redoStack = [];
    syncUndoButtons();
  }

  function undo() {
    if (!state.undoStack.length) return;
    state.redoStack.push({
      settings: Object.assign({}, state.settings),
      brushDelta: state.brushDelta ? new Float32Array(state.brushDelta) : null
    });
    const prev = state.undoStack.pop();
    state.settings = Object.assign({}, prev.settings);
    state.brushDelta = prev.brushDelta ? new Float32Array(prev.brushDelta) : new Float32Array(state.rawDepth.data.length);
    syncControlsFromSettings();
    syncUndoButtons();
    schedulePipelineUpdate(true);
    toast(t('Undo applied', 'Annulation effectuée'), '↶');
  }

  function redo() {
    if (!state.redoStack.length) return;
    state.undoStack.push({
      settings: Object.assign({}, state.settings),
      brushDelta: state.brushDelta ? new Float32Array(state.brushDelta) : null
    });
    const next = state.redoStack.pop();
    state.settings = Object.assign({}, next.settings);
    state.brushDelta = next.brushDelta ? new Float32Array(next.brushDelta) : new Float32Array(state.rawDepth.data.length);
    syncControlsFromSettings();
    syncUndoButtons();
    schedulePipelineUpdate(true);
    toast(t('Redo applied', 'Rétablissement effectué'), '↷');
  }

  function syncUndoButtons() {
    $('btnUndo').disabled = state.undoStack.length === 0;
    $('btnRedo').disabled = state.redoStack.length === 0;
  }

  // ── 6. Helpers: Download, Progress, Modals ─────────────────────────────────
  function triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function canvasToBlob(canvas, type) {
    return new Promise((resolve) => canvas.toBlob(resolve, type || 'image/png'));
  }

  function setProgress(pct, label, visible) {
    const strip = $('progressStrip');
    if (visible !== undefined) strip.classList.toggle('active', !!visible);
    $('progressFill').style.width = `${Math.max(0, Math.min(100, pct))}%`;
    $('progressPct').textContent = `${Math.round(pct)}%`;
    if (label) $('progressLabel').textContent = label;
  }

  function openModal(id) {
    const m = $(id);
    if (m) m.classList.add('open');
  }
  function closeModal(id) {
    const m = $(id);
    if (m) m.classList.remove('open');
  }
  function closeAllModals() {
    document.querySelectorAll('.modal-backdrop.open').forEach((m) => m.classList.remove('open'));
  }

  function enableWorkspaceButtons(enabled) {
    const ids = [
      'generateBtn', 'btnSaveProject', 'btnPreflight', 'btnCostCalc',
      'btnRebuild3D', 'btnPreviewCNC',
      'expPng16', 'expDepthPng', 'expGrayPng', 'expSideBySide', 'expPBRZip',
      'expSTL', 'expGLB', 'expOBJ', 'expCNCGcode', 'expHtmlProof', 'btn-preview-ar'
    ];
    ids.forEach((id) => {
      const el = $(id);
      if (el) el.disabled = !enabled;
    });
  }

  // ── 7. Image & Project Loading (Photos, Demos, .spdepth) ───────────────────
  async function handleExternalFilePayload(payload) {
    try {
      const name = payload.name || 'external.png';
      let blob;
      if (payload.isBinary) {
        const res = await fetch(payload.data);
        blob = await res.blob();
      } else {
        blob = new Blob([payload.data], { type: 'application/json' });
      }
      await loadUserFile(new File([blob], name, { type: blob.type || 'image/png' }));
    } catch (err) {
      toast('External file error: ' + err.message, '❌');
    }
  }

  async function loadUserFile(file) {
    if (!file) return;
    const lower = (file.name || '').toLowerCase();
    if (lower.endsWith('.spdepth') || lower.endsWith('.json')) {
      try {
        const text = await file.text();
        await loadProjectJSON(JSON.parse(text));
        return;
      } catch (err) {
        toast(t('Invalid .spdepth project file', 'Fichier projet .spdepth invalide'), '❌');
        return;
      }
    }

    if (!file.type || !file.type.startsWith('image/')) {
      toast(t('Please upload a PNG, JPG, WEBP image or .spdepth file', 'Veuillez importer une image PNG, JPG, WEBP ou un fichier .spdepth'), '⚠️');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast(t('Image too large (max 25MB)', 'Image trop volumineuse (max 25 Mo)'), '⚠️');
      return;
    }

    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = () => reject(new Error('Could not decode image'));
        im.src = url;
      });
      const cv = document.createElement('canvas');
      // Cap working canvas at 2048px max edge for crisp detail without browser OOM
      const scale = Math.min(1, 2048 / Math.max(img.naturalWidth, img.naturalHeight));
      cv.width = Math.max(16, Math.round(img.naturalWidth * scale));
      cv.height = Math.max(16, Math.round(img.naturalHeight * scale));
      const ctx = cv.getContext('2d');
      ctx.drawImage(img, 0, 0, cv.width, cv.height);

      state.imageName = (file.name || 'depth').replace(/\.[^.]+$/, '');
      await mountLoadedCanvas(cv, true);
    } catch (err) {
      toast(err.message, '❌');
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function loadDemo(presetId) {
    const cv = DE.generateDemoImageCanvas(presetId, 640);
    state.imageName = 'demo_' + presetId;
    if (presetId === 'coin') {
      $('meshShapeSelect').value = 'circle';
      $('mat3dSelect').value = 'brass';
      state.settings.bevelShape = 'circle';
    } else if (presetId === 'portrait') {
      $('meshShapeSelect').value = 'oval';
      $('mat3dSelect').value = 'marble';
      state.settings.bevelShape = 'oval';
    } else {
      $('meshShapeSelect').value = 'rect';
      $('mat3dSelect').value = 'wood';
      state.settings.bevelShape = 'rect';
    }
    await mountLoadedCanvas(cv, true);
    toast(t('Demo loaded with instant depth! Click "Generate AI Depth Map" for neural Depth Anything V2.',
      'Démo chargée avec profondeur instantanée ! Cliquez sur "Générer Depth Map IA" pour Depth Anything V2.'), '✨');
  }

  async function mountLoadedCanvas(cv, runInstantPreview) {
    state.hasImage = true;
    state.origCanvas = cv;
    state.origW = cv.width;
    state.origH = cv.height;
    state.undoStack = [];
    state.redoStack = [];
    syncUndoButtons();

    // Draw original image onto origCanvas & compareOrigCanvas
    const oc = $('origCanvas');
    oc.width = cv.width; oc.height = cv.height;
    oc.getContext('2d').drawImage(cv, 0, 0);

    const coc = $('compareOrigCanvas');
    coc.width = cv.width; coc.height = cv.height;
    coc.getContext('2d').drawImage(cv, 0, 0);

    $('emptyDropZone').style.display = 'none';
    switchView(state.activeView || '2d');
    enableWorkspaceButtons(true);

    if (runInstantPreview) {
      runInstantDepthNow();
    }
  }

  function extractLuminanceForDepth(depthW, depthH) {
    const tmp = document.createElement('canvas');
    tmp.width = depthW; tmp.height = depthH;
    const tctx = tmp.getContext('2d', { willReadFrequently: true });
    tctx.drawImage(state.origCanvas, 0, 0, depthW, depthH);
    const rgba = tctx.getImageData(0, 0, depthW, depthH).data;
    state.luminanceHighPass = DE.computeLuminanceHighPass(rgba, depthW, depthH);
  }

  function runInstantDepthNow() {
    if (!state.origCanvas) return;
    const t0 = performance.now();
    const maxRes = Math.min(518, parseInt($('resSelect').value, 10) || 518);
    const keepAspect = $('padCheckbox').checked;
    const dims = DE.computeTargetDims(state.origW, state.origH, maxRes, keepAspect);

    const tmp = document.createElement('canvas');
    tmp.width = dims.width; tmp.height = dims.height;
    const ctx = tmp.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(state.origCanvas, 0, 0, dims.width, dims.height);
    const rgba = ctx.getImageData(0, 0, dims.width, dims.height).data;

    state.rawDepth = DE.runFastHeuristicDepth(rgba, dims.width, dims.height);
    state.brushDelta = new Float32Array(state.rawDepth.data.length);
    state.luminanceHighPass = DE.computeLuminanceHighPass(rgba, dims.width, dims.height);
    const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
    $('statTime').textContent = elapsed + 's (Instant)';

    if (state.studio3d) state.studio3d.hasCameraFramed = false;
    runPipelineNow(true);
  }

  async function runGenerateDepth() {
    if (!state.origCanvas) return;
    const modelId = $('modelSelect').value;
    if (modelId === 'fast-heuristic') {
      runInstantDepthNow();
      toast(t('Fast Instant Depth regenerated!', 'Profondeur instantanée régénérée !'), '⚡');
      return;
    }

    const btn = $('generateBtn');
    btn.disabled = true;
    $('generateIcon').textContent = '⏳';
    const t0 = performance.now();
    setProgress(4, t('Loading AI engine…', 'Chargement du moteur IA…'), true);

    try {
      const dataUrl = state.origCanvas.toDataURL('image/jpeg', 0.92);
      const maxRes = parseInt($('resSelect').value, 10) || 518;
      const preserveAspectRatio = $('padCheckbox').checked;

      const res = await DE.runAIDepth(dataUrl, {
        modelId,
        maxRes,
        preserveAspectRatio,
        origWidth: state.origW,
        origHeight: state.origH,
        onProgress: (pct, stage, meta) => {
          if (stage === 'downloading') {
            const f = (meta && meta.file) ? ` (${meta.file.split('/').pop()})` : '';
            setProgress(pct, t(`Downloading AI model${f}…`, `Téléchargement modèle IA${f}…`), true);
          } else if (stage === 'cached') {
            setProgress(pct, t('Using cached AI model…', 'Modèle IA en cache…'), true);
          } else if (stage === 'inferring') {
            setProgress(pct, t(`Running AI inference (${(meta && meta.device || 'wasm').toUpperCase()})…`,
              `Inférence IA (${(meta && meta.device || 'wasm').toUpperCase()})…`), true);
          } else if (stage === 'done') {
            setProgress(96, t('Rendering depth & 3D relief…', 'Rendu profondeur & relief 3D…'), true);
          }
        }
      });

      state.rawDepth = res;
      state.brushDelta = new Float32Array(res.data.length);
      extractLuminanceForDepth(res.width, res.height);
      updateDeviceBadge(res.device);

      const elapsed = ((performance.now() - t0) / 1000).toFixed(1);
      $('statTime').textContent = `${elapsed}s (${res.device.toUpperCase()})`;

      if (state.studio3d) state.studio3d.hasCameraFramed = false;
      runPipelineNow(true);
      setProgress(100, t('AI Depth ready!', 'Depth Map IA prêt !'), true);
      setTimeout(() => setProgress(0, '', false), 1100);
      toast(t(`AI Depth generated (${res.width}×${res.height}) in ${elapsed}s!`,
        `Depth Map IA généré (${res.width}×${res.height}) en ${elapsed}s !`), '✅');
    } catch (err) {
      console.error(err);
      setProgress(0, '', false);
      toast(t('AI error (using Instant fallback): ', 'Erreur IA (repli Instantané) : ') + err.message, '⚠️');
    } finally {
      btn.disabled = false;
      $('generateIcon').textContent = '⚡';
    }
  }

  function updateDeviceBadge(dev) {
    const b = $('deviceBadge');
    if (!b) return;
    if (dev === 'webgpu') {
      b.className = 'pill-badge webgpu hide-md';
      b.textContent = '🚀 WebGPU AI';
    } else if (dev === 'wasm') {
      b.className = 'pill-badge hide-md';
      b.textContent = '⚙️ WASM AI';
    } else {
      b.className = 'pill-badge hide-md';
      b.textContent = '⚡ AI Ready';
    }
  }

  // ── 8. Unified 60fps Depth Processing & Rendering Pipeline ─────────────────
  function schedulePipelineUpdate(rebuildMesh) {
    if (rebuildMesh) state.dirty3d = true;
    state.dirtyBokeh = true;
    state.dirtyPBR = true;
    if (state.rafUpdate) cancelAnimationFrame(state.rafUpdate);
    state.rafUpdate = requestAnimationFrame(() => {
      state.rafUpdate = null;
      runPipelineNow(!!rebuildMesh);
    });
  }

  function runPipelineNow(rebuildMesh) {
    if (!state.rawDepth) return;
    const { data, width, height } = state.rawDepth;
    const proc = DE.computeProcessedDepth(data, width, height, state.settings, state.luminanceHighPass, state.brushDelta);
    state.processed = proc;

    // 1. Render 2D Colorized Depth Canvas
    renderDepthCanvas(proc);

    // 2. Update Compare Canvas (zero flicker, preserves slider handle!)
    updateCompareCanvas();

    // 3. Draw Live Synchronized Histogram (Fixes B8!)
    drawHistogram(proc);

    // 4. Stats
    $('statSize').textContent = `${state.origW}×${state.origH}`;
    $('statRange').textContent = `${Math.round(proc.dynamicRange * 100)}%`;
    $('statAvg').textContent = `${Math.round(proc.avg * 100)}%`;

    // 5. Render Sculpt Photo Overlay if enabled
    renderSculptOverlay();

    // 6. Lazy-update active secondary view
    state.dirty3d = true;
    state.dirtyBokeh = true;
    state.dirtyPBR = true;

    if (state.activeView === '3d' || rebuildMesh) {
      rebuild3DStudio(false);
    }
    if (state.activeView === 'bokeh') {
      renderBokeh();
      renderMaskCutout();
      state.dirtyBokeh = false;
    }
    if (state.activeView === 'pbr') {
      renderPBRandCNC();
      state.dirtyPBR = false;
    }
  }

  function renderDepthCanvas(proc) {
    const { data, width, height } = proc;
    const off = document.createElement('canvas');
    off.width = width; off.height = height;
    const octx = off.getContext('2d');
    const imgData = octx.createImageData(width, height);
    const dst = imgData.data;
    const mapFn = DE.COLOR_MAPS[state.colorMap] || DE.COLOR_MAPS.Turbo;

    for (let i = 0; i < data.length; i++) {
      const [r, g, b] = mapFn(data[i]);
      const p = i * 4;
      dst[p] = r; dst[p + 1] = g; dst[p + 2] = b; dst[p + 3] = 255;
    }
    octx.putImageData(imgData, 0, 0);

    // Upscale cleanly to original image aspect ratio/dimensions
    const dc = $('depthCanvas');
    dc.width = state.origW;
    dc.height = state.origH;
    const dctx = dc.getContext('2d');
    dctx.imageSmoothingEnabled = true;
    dctx.imageSmoothingQuality = 'high';
    dctx.drawImage(off, 0, 0, dc.width, dc.height);
  }

  function renderSculptOverlay() {
    const ov = $('sculptOverlayCanvas');
    const dc = $('depthCanvas');
    if (!ov || !dc || !state.origCanvas) return;
    ov.width = dc.width;
    ov.height = dc.height;
    const ctx = ov.getContext('2d');
    ctx.clearRect(0, 0, ov.width, ov.height);
    if (state.brush.enabled && state.brush.overlayAlpha > 0) {
      ctx.globalAlpha = state.brush.overlayAlpha;
      ctx.drawImage(state.origCanvas, 0, 0, ov.width, ov.height);
      ctx.globalAlpha = 1;
    }
  }

  function updateCompareCanvas() {
    const dc = $('depthCanvas');
    const cdc = $('compareDepthCanvas');
    if (!dc || !cdc || !dc.width) return;
    cdc.width = dc.width;
    cdc.height = dc.height;
    cdc.getContext('2d').drawImage(dc, 0, 0);
    applyComparePosition(state.comparePct);
  }

  function applyComparePosition(pct) {
    state.comparePct = DE.clamp(pct, 0, 100);
    const h = $('compareHandle');
    const d = $('compareDepth');
    if (h) h.style.left = state.comparePct + '%';
    if (d) d.style.clipPath = `inset(0 ${100 - state.comparePct}% 0 0)`;
  }

  function drawHistogram(proc) {
    const cv = $('histCanvas');
    if (!cv || !proc) return;
    const W = Math.max(240, cv.clientWidth || 560);
    const H = 96;
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    const hist = DE.computeHistogram(proc.data, 64);
    const mapFn = DE.COLOR_MAPS[state.colorMap] || DE.COLOR_MAPS.Turbo;
    const bw = W / hist.bins;

    for (let i = 0; i < hist.bins; i++) {
      const tNorm = i / (hist.bins - 1);
      const [r, g, b] = mapFn(tNorm);
      const bh = Math.round((hist.counts[i] / hist.maxCount) * (H - 8));
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(i * bw, H - bh, Math.max(1, bw - 1), bh);
    }

    // Draw Black/White Level Markers
    const bx = state.settings.blackPoint * W;
    const wx = state.settings.whitePoint * W;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx, H); ctx.stroke();
    ctx.strokeStyle = '#06d6a0';
    ctx.beginPath(); ctx.moveTo(wx, 0); ctx.lineTo(wx, H); ctx.stroke();
  }

  // ── 9. Interactive Sculpt Brush + Live Depth Probe HUD ─────────────────────
  function getMeshParams() {
    return {
      widthMm: parseFloat($('widthMmInput').value) || 120,
      reliefMm: parseFloat($('reliefMmInput').value) || 4.5,
      baseMm: parseFloat($('baseMmInput').value) || 1.6,
      mode: $('meshModeSelect').value,
      shape: $('meshShapeSelect').value,
      resolution: parseInt($('meshResSelect').value, 10) || 200,
      arcAngleDeg: parseFloat($('arcAngleInput').value) || 120,
      borderRim: $('borderRimChk').checked,
      keychainHole: $('keychainHoleChk').checked
    };
  }

  function applyBrushStrokeAt(normX, normY) {
    if (!state.rawDepth || !state.brushDelta || !state.processed) return;
    const { width, height } = state.rawDepth;
    const cx = normX * (width - 1);
    const cy = normY * (height - 1);
    const radiusPx = Math.max(2, (state.brush.size / Math.max(1, state.origW)) * width);
    const r2 = radiusPx * radiusPx;
    const str = state.brush.strength * 0.14;
    const mode = state.brush.mode;

    const x0 = Math.max(0, Math.floor(cx - radiusPx));
    const x1 = Math.min(width - 1, Math.ceil(cx + radiusPx));
    const y0 = Math.max(0, Math.floor(cy - radiusPx));
    const y1 = Math.min(height - 1, Math.ceil(cy + radiusPx));

    if (mode === 'smooth') {
      const snap = new Float32Array(state.processed.data);
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
          if (d2 > r2) continue;
          const falloff = 0.5 * (1 + Math.cos(Math.PI * Math.sqrt(d2) / radiusPx));
          let sum = 0, cnt = 0;
          for (let dy = -2; dy <= 2; dy++) {
            const ny = Math.min(height - 1, Math.max(0, y + dy));
            for (let dx = -2; dx <= 2; dx++) {
              const nx = Math.min(width - 1, Math.max(0, x + dx));
              sum += snap[ny * width + nx]; cnt++;
            }
          }
          const avg = sum / cnt;
          const idx = y * width + x;
          state.brushDelta[idx] = DE.clamp(state.brushDelta[idx] + (avg - snap[idx]) * falloff * state.brush.strength * 0.45, -1, 1);
        }
      }
    } else {
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
          if (d2 > r2) continue;
          const falloff = 0.5 * (1 + Math.cos(Math.PI * Math.sqrt(d2) / radiusPx));
          const idx = y * width + x;
          if (mode === 'raise') {
            state.brushDelta[idx] = DE.clamp(state.brushDelta[idx] + str * falloff, -1, 1);
          } else if (mode === 'lower') {
            state.brushDelta[idx] = DE.clamp(state.brushDelta[idx] - str * falloff, -1, 1);
          } else if (mode === 'erase') {
            state.brushDelta[idx] *= (1 - falloff * state.brush.strength * 0.65);
          } else if (mode === 'flatten') {
            const cur = state.processed.data[idx];
            const diff = state.brush.flattenTarget - cur;
            state.brushDelta[idx] = DE.clamp(state.brushDelta[idx] + diff * falloff * state.brush.strength * 0.5, -1, 1);
          }
        }
      }
    }
    schedulePipelineUpdate(false);
  }

  function updateDepthProbe(normX, normY) {
    if (!state.processed) return;
    const { data, width, height } = state.processed;
    const ix = Math.min(width - 1, Math.max(0, Math.round(normX * (width - 1))));
    const iy = Math.min(height - 1, Math.max(0, Math.round(normY * (height - 1))));
    const z = data[iy * width + ix];
    const mp = getMeshParams();
    const thickMm = mp.mode === 'lithophane'
      ? (mp.baseMm + (1 - z) * mp.reliefMm)
      : (mp.baseMm + z * mp.reliefMm);

    $('probeXY').textContent = `${Math.round(normX * state.origW)}, ${Math.round(normY * state.origH)}`;
    $('probeZ').textContent = `${(z * 100).toFixed(1)}%`;
    $('probeMm').textContent = `${thickMm.toFixed(2)} mm`;
    $('probe16').textContent = `${Math.round(z * 65535)}`;
  }

  // ── 10. 3D PBR & Lithophane Studio Wiring ──────────────────────────────────
  function rebuild3DStudio(resetCam) {
    if (!state.processed) return;
    const mp = getMeshParams();
    state.meshData = DE.buildSolidReliefMesh(state.processed.data, state.processed.width, state.processed.height, mp);
    $('statVol').textContent = `${state.meshData.volumeCm3} cm³`;
    $('hud3dDims').textContent = `${state.meshData.dimensionsMm.x} × ${state.meshData.dimensionsMm.y} × ${state.meshData.dimensionsMm.z} mm`;
    $('hud3dTris').textContent = `${state.meshData.triangleCount.toLocaleString()} tris`;
    $('hud3dThick').textContent = `Wall: ${state.meshData.minThickMm}–${state.meshData.maxThickMm} mm`;

    if (!state.studio3d && typeof window.DepthStudio3D === 'function') {
      state.studio3d = new window.DepthStudio3D($('canvas3d'));
    }
    if (state.studio3d) {
      state.studio3d.updateScene(state.meshData, state.processed, state.origCanvas, $('depthCanvas'), !!resetCam);
    }
    state.dirty3d = false;
  }

  // ── 11. Click-to-Focus Cinema Bokeh & Soft-Edge Transparent Cutout ─────────
  function renderBokeh() {
    if (!state.processed || !state.origCanvas) return;
    const cv = $('bokehCanvas');
    const maxEdge = 960;
    const scale = Math.min(1, maxEdge / Math.max(state.origW, state.origH));
    const W = Math.max(64, Math.round(state.origW * scale));
    const H = Math.max(64, Math.round(state.origH * scale));
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, W, H);

    const focus = parseInt($('bokehFocus').value, 10) / 100;
    const maxBlur = parseInt($('bokehBlur').value, 10);
    const band = parseInt($('bokehBand').value, 10) / 100;
    const glowAmt = parseInt($('bokehGlow').value, 10) / 100;

    // Pre-generate 5 progressively blurred mipmaps (smooth continuous interpolation — zero harsh bands!)
    const LEVELS = 5;
    const mipData = [];
    const tmp = document.createElement('canvas');
    tmp.width = W; tmp.height = H;
    const tctx = tmp.getContext('2d', { willReadFrequently: true });

    for (let l = 0; l < LEVELS; l++) {
      const blurPx = (l / (LEVELS - 1)) * maxBlur;
      tctx.clearRect(0, 0, W, H);
      tctx.filter = blurPx > 0.2 ? `blur(${blurPx.toFixed(1)}px)` : 'none';
      tctx.drawImage(state.origCanvas, 0, 0, W, H);
      tctx.filter = 'none';
      mipData.push(tctx.getImageData(0, 0, W, H).data);
    }

    const out = ctx.createImageData(W, H);
    const dst = out.data;
    const { data: dArr, width: dw, height: dh } = state.processed;

    for (let y = 0; y < H; y++) {
      const sy = Math.min(dh - 1, Math.floor((y / H) * dh));
      const dRow = sy * dw;
      const pRow = y * W;
      for (let x = 0; x < W; x++) {
        const sx = Math.min(dw - 1, Math.floor((x / W) * dw));
        const depth = dArr[dRow + sx];
        const dist = Math.max(0, Math.abs(depth - focus) - band * 0.5);
        const coc = DE.clamp01(dist / Math.max(0.08, 0.72 - band * 0.4));
        const fLevel = coc * (LEVELS - 1);
        const l0 = Math.floor(fLevel);
        const l1 = Math.min(LEVELS - 1, l0 + 1);
        const frac = fLevel - l0;
        const p = (pRow + x) * 4;
        const a = mipData[l0], b = mipData[l1];
        let r = a[p] * (1 - frac) + b[p] * frac;
        let g = a[p + 1] * (1 - frac) + b[p + 1] * frac;
        let bl = a[p + 2] * (1 - frac) + b[p + 2] * frac;

        // Subtle optical specular bokeh boost on out-of-focus highlights
        if (glowAmt > 0 && coc > 0.2) {
          const luma = (r * 0.299 + g * 0.587 + bl * 0.114) / 255;
          if (luma > 0.68) {
            const boost = 1 + (luma - 0.68) * coc * glowAmt * 2.2;
            r = Math.min(255, r * boost);
            g = Math.min(255, g * boost);
            bl = Math.min(255, bl * boost);
          }
        }
        dst[p] = r; dst[p + 1] = g; dst[p + 2] = bl; dst[p + 3] = 255;
      }
    }
    ctx.putImageData(out, 0, 0);
  }

  function renderMaskCutout() {
    if (!state.processed || !state.origCanvas) return;
    let minT = parseInt($('maskMin').value, 10) / 100;
    let maxT = parseInt($('maskMax').value, 10) / 100;
    // FIX B6: Safe min/max swap so mask never breaks blank!
    if (minT > maxT) { const sw = minT; minT = maxT; maxT = sw; }
    const feather = Math.max(0.005, parseInt($('maskFeather').value, 10) / 100);
    const mode = $('maskDisplayMode').value; // cutout | binary | inverted

    const cv = $('maskCanvas');
    const maxEdge = 960;
    const scale = Math.min(1, maxEdge / Math.max(state.origW, state.origH));
    const W = Math.max(64, Math.round(state.origW * scale));
    const H = Math.max(64, Math.round(state.origH * scale));
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(state.origCanvas, 0, 0, W, H);
    const img = ctx.getImageData(0, 0, W, H);
    const dst = img.data;
    const { data: dArr, width: dw, height: dh } = state.processed;

    for (let y = 0; y < H; y++) {
      const sy = Math.min(dh - 1, Math.floor((y / H) * dh));
      const dRow = sy * dw;
      const pRow = y * W;
      for (let x = 0; x < W; x++) {
        const sx = Math.min(dw - 1, Math.floor((x / W) * dw));
        const z = dArr[dRow + sx];
        let alpha = 1;
        if (z < minT) alpha = DE.clamp01(1 - (minT - z) / feather);
        else if (z > maxT) alpha = DE.clamp01(1 - (z - maxT) / feather);
        if (mode === 'inverted') alpha = 1 - alpha;

        const p = (pRow + x) * 4;
        if (mode === 'binary') {
          const v = Math.round(alpha * 255);
          dst[p] = v; dst[p + 1] = v; dst[p + 2] = v; dst[p + 3] = 255;
        } else {
          dst[p + 3] = Math.round(alpha * 255);
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  // ── 12. PBR Maps, CNC Toolpath Preview & LightBurn 3D Slice Table ──────────
  function paintRgbaCanvas(canvasEl, rgba, w, h) {
    canvasEl.width = w; canvasEl.height = h;
    const ctx = canvasEl.getContext('2d');
    const id = new ImageData(rgba, w, h);
    ctx.putImageData(id, 0, 0);
  }

  function renderPBRandCNC() {
    if (!state.processed) return;
    const { data, width, height } = state.processed;
    const directX = $('normalDxChk').checked;

    const norm = DE.generateNormalMap(data, width, height, { strength: 6.0, directX });
    const ao = DE.generateAOMap(data, width, height, { strength: 3.2 });
    const curv = DE.generateCurvatureMap(data, width, height, { strength: 7.5 });

    paintRgbaCanvas($('normalCanvas'), norm, width, height);
    paintRgbaCanvas($('aoCanvas'), ao, width, height);
    paintRgbaCanvas($('curvCanvas'), curv, width, height);

    // CNC 3D Toolpath Preview
    const mp = getMeshParams();
    state.cncResult = DE.generateCNC3DToolpath(data, width, height, {
      widthMm: mp.widthMm,
      reliefMm: mp.reliefMm,
      bitDiaMm: parseFloat($('cncBitDia').value) || 3.175,
      stepoverPct: parseFloat($('cncStepover').value) || 18,
      feedRate: parseFloat($('cncFeedRate').value) || 1200
    });

    $('cncEstPill').textContent = `~${state.cncResult.estMinutes} min · ${state.cncResult.travelMeters} m · ${state.cncResult.scanlines} rows`;
    drawCNCPreview(state.cncResult);
    updateLightBurnTable();
  }

  function drawCNCPreview(res) {
    const cv = $('cncPreviewCanvas');
    if (!cv || !res) return;
    const W = 560;
    const H = Math.max(220, Math.round(W * (state.origH / Math.max(1, state.origW))));
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, W, H);

    // Subtle depth backdrop
    ctx.globalAlpha = 0.35;
    ctx.drawImage($('depthCanvas'), 0, 0, W, H);
    ctx.globalAlpha = 1;

    ctx.lineWidth = 1.2;
    for (const row of res.previewLines) {
      if (row.length < 2) continue;
      for (let i = 1; i < row.length; i++) {
        const a = row[i - 1], b = row[i];
        const z = DE.clamp01(b.z);
        ctx.strokeStyle = `hsl(${190 + z * 95}, 92%, ${42 + z * 28}%)`;
        ctx.beginPath();
        ctx.moveTo(a.x * W, a.y * H);
        ctx.lineTo(b.x * W, b.y * H);
        ctx.stroke();
      }
    }
  }

  function updateLightBurnTable() {
    const tbl = $('lbPlanTable');
    if (!tbl) return;
    const mat = $('lbMaterialSelect').value;
    const reliefMm = parseFloat($('reliefMmInput').value) || 2.0;
    const plan = DE.computeLightBurn3DSlicePlan(mat, reliefMm);
    const rows = [
      [t('Recommended Laser', 'Laser Recommandé'), plan.laser],
      [t('Export Format', 'Format Export'), plan.recommendedFormat],
      [t('3D Slice Passes', 'Nombre de Passes 3D'), `${plan.passes} passes`],
      [t('Speed / Power', 'Vitesse / Puissance'), `${plan.speedMmS} mm/s · ${plan.powerPct}%`],
      [t('Frequency (Fiber)', 'Fréquence (Fibre)'), plan.freqKHz ? `${plan.freqKHz} kHz` : 'Continuous (CO2/Diode)'],
      [t('Line Interval', 'Intervalle de Ligne'), `${plan.lineIntervalMm} mm`],
      [t('Cleaning / Air', 'Nettoyage / Air'), plan.note]
    ];
    tbl.innerHTML = '';
    rows.forEach(([k, v]) => {
      const tr = document.createElement('tr');
      const td1 = document.createElement('td'); td1.textContent = k;
      const td2 = document.createElement('td'); td2.textContent = v;
      tr.appendChild(td1); tr.appendChild(td2);
      tbl.appendChild(tr);
    });
  }

  // ── 13. Pre-Flight Inspector & Workshop Cost Estimator ─────────────────────
  function openPreflightModal() {
    if (!state.processed) return;
    const mp = getMeshParams();
    const rep = DE.inspectPreflight(state.processed.data, state.processed.width, state.processed.height, {
      mode: mp.mode,
      baseMm: mp.baseMm,
      bevel: state.settings.bevel
    });
    const body = $('preflightBody');
    body.innerHTML = '';

    const color = rep.score >= 85 ? '#06d6a0' : (rep.score >= 60 ? '#f59e0b' : '#ef4444');
    const ring = document.createElement('div');
    ring.className = 'score-ring';
    ring.innerHTML = `
      <div class="score-num" style="color:${color}">${rep.score}/100</div>
      <div style="font-size:12px;color:var(--muted);line-height:1.5">
        <strong style="color:var(--text)">${t('Fabrication Readiness Score', 'Score de Préparation Fabrication')}</strong><br/>
        ${t('Dynamic Range', 'Plage Dynamique')}: <b>${rep.dynamicRangePct}%</b> ·
        ${t('Steep Slopes', 'Pentes Raides')}: <b>${rep.steepPct}%</b> ·
        ${t('Edge Height', 'Hauteur Bords')}: <b>${rep.edgeAvgPct}%</b>
      </div>`;
    body.appendChild(ring);

    if (!rep.issues.length) {
      const ok = document.createElement('div');
      ok.className = 'issue-item ok';
      ok.textContent = t('✅ Excellent! Depth range, slopes, and walls are ready for 3D printing, CNC, and Laser.',
        '✅ Parfait ! Plage de profondeur, pentes et épaisseurs prêtes pour l\'impression 3D, CNC et Laser.');
      body.appendChild(ok);
    } else {
      rep.issues.forEach((iss) => {
        const div = document.createElement('div');
        div.className = 'issue-item ' + iss.severity;
        const txt = document.createElement('span');
        txt.textContent = currentLang === 'fr' ? iss.fr : iss.en;
        div.appendChild(txt);
        if (iss.fixAction) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btn btn-sm btn-primary';
          btn.textContent = t('Auto-Fix', 'Corriger');
          btn.onclick = () => {
            applyPreflightFix(iss.fixAction);
            openPreflightModal();
          };
          div.appendChild(btn);
        }
        body.appendChild(div);
      });
    }
    openModal('preflightModal');
  }

  function applyPreflightFix(action) {
    pushHistory();
    if (action === 'autoStretch') {
      autoStretchLevels();
    } else if (action === 'fixLithoWall') {
      $('baseMmInput').value = '0.8';
      rebuild3DStudio(false);
    } else if (action === 'smartSmooth') {
      state.settings.blur = Math.max(2, state.settings.blur + 2);
      syncControlsFromSettings();
      schedulePipelineUpdate(true);
    } else if (action === 'addBevel') {
      state.settings.bevel = Math.max(0.08, state.settings.bevel);
      syncControlsFromSettings();
      schedulePipelineUpdate(true);
    }
    toast(t('Auto-Fix applied!', 'Correction automatique appliquée !'), '🛠️');
  }

  function refreshCostQuote() {
    if (!state.meshData && state.processed) rebuild3DStudio(false);
    const q = DE.computeWorkshopQuote(state.meshData, {
      process: $('quoteProcess').value,
      materialCostPerUnit: parseFloat($('quoteMatRate').value) || 24,
      machineHourlyRate: parseFloat($('quoteHourly').value) || 4.5,
      markup: parseFloat($('quoteMarkup').value) || 3.2
    });
    const out = $('quoteResults');
    const items = [
      [t('Est. Machine Time', 'Temps Machine Est.'), `${q.estHours} h`, '#93c5fd'],
      [t('Material + Machine Cost', 'Coût Matière + Machine'), `$${q.totalCost.toFixed(2)}`, '#e2e8f0'],
      [t('Recommended Etsy Price', 'Prix Vente Recommandé'), `$${q.retailPrice.toFixed(2)}`, '#fcd34d'],
      [t('Net Profit (after fees)', 'Bénéfice Net (après frais)'), `$${q.netProfit.toFixed(2)} (${q.marginPct}%)`, '#34d399']
    ];
    out.innerHTML = '';
    items.forEach(([lbl, val, col]) => {
      const card = document.createElement('div');
      card.className = 'quote-kpi';
      const l = document.createElement('div'); l.className = 'kl'; l.textContent = lbl;
      const v = document.createElement('div'); v.className = 'kv'; v.style.color = col; v.textContent = val;
      card.appendChild(l); card.appendChild(v);
      out.appendChild(card);
    });
  }

  // ── 14. .spdepth Project Save & Load (100% Free!) ──────────────────────────
  function saveProjectFile() {
    if (!state.origCanvas || !state.rawDepth) return;
    const project = {
      format: 'studios-pro-depth',
      version: 1,
      imageName: state.imageName,
      imageDataUrl: state.origCanvas.toDataURL('image/jpeg', 0.92),
      rawDepth: {
        width: state.rawDepth.width,
        height: state.rawDepth.height,
        device: state.rawDepth.device,
        modelId: state.rawDepth.modelId,
        data: Array.from(state.rawDepth.data, (v) => Number(v.toFixed(5)))
      },
      brushDelta: state.brushDelta ? Array.from(state.brushDelta, (v) => Number(v.toFixed(4))) : null,
      settings: state.settings,
      colorMap: state.colorMap,
      meshParams: getMeshParams()
    };
    const blob = new Blob([JSON.stringify(project)], { type: 'application/json' });
    triggerBlobDownload(blob, `${state.imageName}.spdepth`);
    toast(t('Project .spdepth saved (Free)!', 'Projet .spdepth sauvegardé (Gratuit) !'), '💾');
  }

  async function loadProjectJSON(proj) {
    if (!proj || proj.format !== 'studios-pro-depth' || !proj.imageDataUrl || !proj.rawDepth) {
      throw new Error('Unsupported project schema');
    }
    const img = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error('Failed to decode project image'));
      im.src = proj.imageDataUrl;
    });
    const cv = document.createElement('canvas');
    cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    cv.getContext('2d').drawImage(img, 0, 0);

    state.imageName = proj.imageName || 'restored_depth';
    state.settings = Object.assign({}, DEFAULT_SETTINGS, proj.settings || {});
    state.colorMap = proj.colorMap || 'Turbo';

    if (proj.meshParams) {
      $('widthMmInput').value = proj.meshParams.widthMm || 120;
      $('reliefMmInput').value = proj.meshParams.reliefMm || 4.5;
      $('baseMmInput').value = proj.meshParams.baseMm || 1.6;
      $('meshModeSelect').value = proj.meshParams.mode || 'relief';
      $('meshShapeSelect').value = proj.meshParams.shape || 'rect';
      $('meshResSelect').value = String(proj.meshParams.resolution || 200);
      $('arcAngleInput').value = proj.meshParams.arcAngleDeg || 120;
      $('borderRimChk').checked = proj.meshParams.borderRim !== false;
      $('keychainHoleChk').checked = !!proj.meshParams.keychainHole;
    }

    await mountLoadedCanvas(cv, false);
    state.rawDepth = {
      width: proj.rawDepth.width,
      height: proj.rawDepth.height,
      device: proj.rawDepth.device || 'saved',
      modelId: proj.rawDepth.modelId || 'saved',
      data: new Float32Array(proj.rawDepth.data)
    };
    state.brushDelta = proj.brushDelta ? new Float32Array(proj.brushDelta) : new Float32Array(state.rawDepth.data.length);
    extractLuminanceForDepth(state.rawDepth.width, state.rawDepth.height);
    syncControlsFromSettings();
    updateColorMapSelectionUI();
    if (state.studio3d) state.studio3d.hasCameraFramed = false;
    runPipelineNow(true);
    toast(t('Project .spdepth restored!', 'Projet .spdepth restauré !'), '📂');
  }

  // ── 15. Production Exports (Gated) + Free AR & Watermarked WEBM ────────────
  function buildGrayscaleCanvas() {
    const { data, width, height } = state.processed;
    const off = document.createElement('canvas');
    off.width = width; off.height = height;
    const ctx = off.getContext('2d');
    const id = ctx.createImageData(width, height);
    for (let i = 0; i < data.length; i++) {
      const v = Math.round(DE.clamp01(data[i]) * 255);
      id.data[i * 4] = v; id.data[i * 4 + 1] = v; id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(id, 0, 0);
    const fc = document.createElement('canvas');
    fc.width = state.origW; fc.height = state.origH;
    const fctx = fc.getContext('2d');
    fctx.imageSmoothingEnabled = true;
    fctx.imageSmoothingQuality = 'high';
    fctx.drawImage(off, 0, 0, fc.width, fc.height);
    return fc;
  }

  function wireExports() {
    $('expPng16').onclick = () => Gate.runGatedExport(async () => {
      if (!state.processed) return false;
      const bytes = await DE.encodePNG16(state.processed.data, state.processed.width, state.processed.height);
      triggerBlobDownload(new Blob([bytes], { type: 'image/png' }), `${state.imageName}_16bit_depth.png`);
      toast(t('Exported 16-Bit Lossless Depth PNG (65,536 levels)!', 'PNG Profondeur 16-Bit Sans Perte exporté !'), '💎');
      return true;
    });

    $('expDepthPng').onclick = () => Gate.runGatedExport(async () => {
      const blob = await canvasToBlob($('depthCanvas'));
      triggerBlobDownload(blob, `${state.imageName}_depth_color.png`);
      toast(t('Exported Color Depth PNG!', 'PNG Profondeur Couleur exporté !'), '🌈');
      return true;
    });

    $('expGrayPng').onclick = () => Gate.runGatedExport(async () => {
      const gc = buildGrayscaleCanvas();
      const blob = await canvasToBlob(gc);
      triggerBlobDownload(blob, `${state.imageName}_grayscale_8bit.png`);
      toast(t('Exported 8-Bit Grayscale PNG (exact match)!', 'PNG Niveaux de Gris 8-Bit exporté !'), '⬛');
      return true;
    });

    $('expSideBySide').onclick = () => Gate.runGatedExport(async () => {
      const dc = $('depthCanvas');
      const sc = document.createElement('canvas');
      sc.width = state.origW * 2; sc.height = state.origH;
      const sctx = sc.getContext('2d');
      sctx.drawImage(state.origCanvas, 0, 0);
      sctx.drawImage(dc, state.origW, 0);
      const blob = await canvasToBlob(sc);
      triggerBlobDownload(blob, `${state.imageName}_side_by_side.png`);
      toast(t('Exported Side-by-Side PNG!', 'Comparatif Avant/Après exporté !'), '🖼️');
      return true;
    });

    $('expPBRZip').onclick = () => Gate.runGatedExport(async () => {
      if (typeof JSZip === 'undefined' || !state.processed) return false;
      renderPBRandCNC();
      const zip = new JSZip();
      const png16 = await DE.encodePNG16(state.processed.data, state.processed.width, state.processed.height);
      zip.file(`${state.imageName}_height_16bit.png`, png16);
      zip.file(`${state.imageName}_height_8bit.png`, await canvasToBlob(buildGrayscaleCanvas()));
      zip.file(`${state.imageName}_normal.png`, await canvasToBlob($('normalCanvas')));
      zip.file(`${state.imageName}_ao.png`, await canvasToBlob($('aoCanvas')));
      zip.file(`${state.imageName}_curvature.png`, await canvasToBlob($('curvCanvas')));
      zip.file(`${state.imageName}_albedo.png`, await canvasToBlob(state.origCanvas));
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      triggerBlobDownload(zipBlob, `${state.imageName}_pbr_pack.zip`);
      toast(t('Exported Full PBR Pack (.ZIP)!', 'Pack PBR complet (.ZIP) exporté !'), '📦');
      return true;
    });

    $('expSTL').onclick = () => Gate.runGatedExport(async () => {
      if (!state.processed) return false;
      if (state.dirty3d || !state.meshData) rebuild3DStudio(false);
      const stlBuf = DE.exportBinarySTL(state.meshData);
      triggerBlobDownload(new Blob([stlBuf], { type: 'application/octet-stream' }), `${state.imageName}_relief.stl`);
      toast(t(`Exported Watertight STL (${state.meshData.triangleCount.toLocaleString()} tris)!`,
        `STL 3D Étanche exporté (${state.meshData.triangleCount.toLocaleString()} tris) !`), '🖨️');
      return true;
    });

    $('expGLB').onclick = () => Gate.runGatedExport(async () => {
      if (!state.processed) return false;
      if (state.dirty3d || !state.meshData) rebuild3DStudio(false);
      const glbBuf = await state.studio3d.exportGLB(state.origCanvas, true);
      triggerBlobDownload(new Blob([glbBuf], { type: 'model/gltf-binary' }), `${state.imageName}_relief.glb`);
      toast(t('Exported Textured 3D GLB!', 'GLB 3D Texturé exporté !'), '✨');
      return true;
    });

    $('expOBJ').onclick = () => Gate.runGatedExport(async () => {
      if (!state.processed) return false;
      if (state.dirty3d || !state.meshData) rebuild3DStudio(false);
      const objStr = DE.exportOBJ(state.meshData);
      triggerBlobDownload(new Blob([objStr], { type: 'text/plain' }), `${state.imageName}_relief.obj`);
      toast(t('Exported Watertight 3D OBJ!', 'OBJ 3D Étanche exporté !'), '📐');
      return true;
    });

    $('expCNCGcode').onclick = () => Gate.runGatedExport(async () => {
      if (!state.processed) return false;
      renderPBRandCNC();
      triggerBlobDownload(new Blob([state.cncResult.gcode], { type: 'text/plain' }), `${state.imageName}_cnc_3d.gcode`);
      toast(t(`Exported CNC 3D G-Code (~${state.cncResult.estMinutes} min)!`,
        `G-Code CNC 3D exporté (~${state.cncResult.estMinutes} min) !`), '⚙️');
      return true;
    });

    $('expHtmlProof').onclick = () => Gate.runGatedExport(async () => {
      if (!state.processed) return false;
      if (state.dirty3d || !state.meshData) rebuild3DStudio(false);
      const stlBuf = DE.exportBinarySTL(state.meshData);
      const html = state.studio3d.generateClientProofHTML(stlBuf, {
        title: state.imageName,
        dimensionsMm: state.meshData.dimensionsMm,
        mode: state.meshData.mode
      });
      triggerBlobDownload(new Blob([html], { type: 'text/html' }), `${state.imageName}_3d_proof.html`);
      toast(t('Exported Interactive 3D HTML Client Proof!', 'Aperçu Client 3D HTML exporté !'), '🌐');
      return true;
    });

    // FREE AR PREVIEW (External contract only — never touches AR Viewer!)
    $('btn-preview-ar').onclick = async () => {
      if (!state.processed || !window.StudiosProAR) return;
      try {
        if (state.dirty3d || !state.meshData) rebuild3DStudio(false);
        const glbBuf = await state.studio3d.exportGLB(state.origCanvas, true);
        window.StudiosProAR.sendModel({
          modelData: glbBuf,
          extension: 'glb',
          isBinary: true,
          name: `${state.imageName}_relief.glb`,
          placement: 'wall',
          dimensionsMm: state.meshData.dimensionsMm,
          sourceStudio: 'depth-maps'
        });
        toast(t('Sent 1:1 mm Textured GLB to AR Viewer!', 'GLB Texturé 1:1 envoyé vers AR Viewer !'), '📱');
      } catch (err) {
        toast('AR Preview error: ' + err.message, '❌');
      }
    };

    // Bokeh, Cutout & Individual PBR Maps
    $('exportBokehBtn').onclick = () => Gate.runGatedExport(async () => {
      if (state.dirtyBokeh) renderBokeh();
      triggerBlobDownload(await canvasToBlob($('bokehCanvas')), `${state.imageName}_bokeh.png`);
      toast(t('Exported Cinema Bokeh PNG!', 'PNG Bokeh Cinéma exporté !'), '🎭');
      return true;
    });

    $('exportMaskBtn').onclick = () => Gate.runGatedExport(async () => {
      const prev = $('maskDisplayMode').value;
      $('maskDisplayMode').value = 'binary';
      renderMaskCutout();
      const blob = await canvasToBlob($('maskCanvas'));
      $('maskDisplayMode').value = prev;
      renderMaskCutout();
      triggerBlobDownload(blob, `${state.imageName}_depth_mask.png`);
      toast(t('Exported Alpha Mask PNG!', 'Masque Alpha PNG exporté !'), '⬛');
      return true;
    });

    $('exportCutoutBtn').onclick = () => Gate.runGatedExport(async () => {
      if ($('maskDisplayMode').value === 'binary') $('maskDisplayMode').value = 'cutout';
      renderMaskCutout();
      triggerBlobDownload(await canvasToBlob($('maskCanvas')), `${state.imageName}_subject_cutout.png`);
      toast(t('Exported Transparent Subject Cutout PNG!', 'Détourage Transparent PNG exporté !'), '✂️');
      return true;
    });

    $('expNormalBtn').onclick = () => Gate.runGatedExport(async () => {
      triggerBlobDownload(await canvasToBlob($('normalCanvas')), `${state.imageName}_normal.png`);
      return true;
    });
    $('expAOBtn').onclick = () => Gate.runGatedExport(async () => {
      triggerBlobDownload(await canvasToBlob($('aoCanvas')), `${state.imageName}_ao.png`);
      return true;
    });
    $('expCurvBtn').onclick = () => Gate.runGatedExport(async () => {
      triggerBlobDownload(await canvasToBlob($('curvCanvas')), `${state.imageName}_curvature.png`);
      return true;
    });

    // FREE Watermarked / PRO Clean 3D Video (.WEBM)
    $('btnRecordWebm').onclick = async () => {
      if (!state.processed) return;
      if (state.dirty3d || !state.meshData) rebuild3DStudio(false);
      const btn = $('btnRecordWebm');
      btn.disabled = true;
      const mode = $('videoModeSelect').value;
      setProgress(5, t('Recording 3D Showcase Video (.WEBM)…', 'Enregistrement Vidéo 3D (.WEBM)…'), true);
      try {
        const blob = await state.studio3d.recordVideo({
          mode,
          durationSec: 4,
          isPro: Gate.isPremium(),
          onProgress: (p) => setProgress(p, t(`Recording 3D Video (${p}%)…`, `Enregistrement Vidéo 3D (${p}%)…`), true)
        });
        triggerBlobDownload(blob, `${state.imageName}_${mode}.webm`);
        toast(Gate.isPremium()
          ? t('Clean Pro 3D Video (.WEBM) exported!', 'Vidéo 3D Pro sans filigrane (.WEBM) exportée !')
          : t('3D Showcase Video (.WEBM) saved (Free with watermark)!', 'Vidéo 3D (.WEBM) enregistrée (Gratuit avec filigrane) !'), '🎥');
      } catch (err) {
        toast('Video error: ' + err.message, '❌');
      } finally {
        btn.disabled = false;
        setProgress(0, '', false);
      }
    };
  }

  // ── 16. UI Controls, Presets, View Tabs & Shortcuts ────────────────────────
  function buildColorMapUI() {
    const host = $('colorMapOptions');
    host.innerHTML = '';
    Object.keys(DE.COLOR_MAPS).forEach((name) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cm-btn' + (name === state.colorMap ? ' active' : '');
      btn.dataset.cm = name;
      const bar = document.createElement('canvas');
      bar.className = 'cm-bar'; bar.width = 96; bar.height = 16;
      const ctx = bar.getContext('2d');
      for (let x = 0; x < 96; x++) {
        const [r, g, b] = DE.COLOR_MAPS[name](x / 95);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, 0, 1, 16);
      }
      const lbl = document.createElement('div');
      lbl.className = 'cm-lbl'; lbl.textContent = name;
      btn.appendChild(bar); btn.appendChild(lbl);
      btn.onclick = () => {
        state.colorMap = name;
        updateColorMapSelectionUI();
        if (state.processed) schedulePipelineUpdate(false);
      };
      host.appendChild(btn);
    });
  }

  function updateColorMapSelectionUI() {
    document.querySelectorAll('.cm-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.cm === state.colorMap);
    });
  }

  function syncControlsFromSettings() {
    const s = state.settings;
    $('contrastSlider').value = Math.round(s.contrast * 100);
    $('contrastVal').textContent = Math.round(s.contrast * 100) + '%';
    $('brightnessSlider').value = Math.round(s.brightness * 100);
    $('brightnessVal').textContent = (s.brightness > 0 ? '+' : '') + Math.round(s.brightness * 100) + '%';
    $('gammaSlider').value = Math.round(s.gamma * 100);
    $('gammaVal').textContent = s.gamma.toFixed(2);
    $('blurSlider').value = s.blur;
    $('blurVal').textContent = s.blur + 'px';
    $('detailSlider').value = s.detail;
    $('detailVal').textContent = Number(s.detail).toFixed(1);
    $('textureSlider').value = s.texture;
    $('textureVal').textContent = Number(s.texture).toFixed(2);
    $('bgCutoffSlider').value = Math.round(s.bgCutoff * 100);
    $('bgCutoffVal').textContent = Math.round(s.bgCutoff * 100) + '%';
    $('bevelSlider').value = Math.round(s.bevel * 100);
    $('bevelVal').textContent = Math.round(s.bevel * 100) + '%';
    $('contourSlider').value = s.contourSteps;
    $('contourVal').textContent = s.contourSteps > 1 ? String(s.contourSteps) : 'Off';
    $('invertSelect').value = s.invert ? '1' : '0';
    $('autoClipChk').checked = !!s.autoClip;
    $('blackPtSlider').value = Math.round(s.blackPoint * 100);
    $('blackPtVal').textContent = Math.round(s.blackPoint * 100) + '%';
    $('whitePtSlider').value = Math.round(s.whitePoint * 100);
    $('whitePtVal').textContent = Math.round(s.whitePoint * 100) + '%';
  }

  function autoStretchLevels() {
    if (!state.processed) return;
    const p = DE.computePercentiles(state.processed.data);
    state.settings.blackPoint = DE.clamp(Number(p.p2.toFixed(2)), 0, 0.85);
    state.settings.whitePoint = DE.clamp(Number(p.p98.toFixed(2)), state.settings.blackPoint + 0.08, 1);
    syncControlsFromSettings();
    schedulePipelineUpdate(true);
  }

  function applyMaterialPreset(name) {
    pushHistory();
    document.querySelectorAll('.preset-btn').forEach((b) => b.classList.toggle('active', b.dataset.preset === name));
    // Reset blur too (Fixes B13!)
    const base = Object.assign({}, DEFAULT_SETTINGS);
    if (name === 'wood') {
      Object.assign(base, { contrast: 1.2, brightness: 0.04, gamma: 1.15, detail: 1.8, texture: 0.85, bevel: 0.06, blur: 1 });
      $('meshModeSelect').value = 'relief'; $('mat3dSelect').value = 'wood';
    } else if (name === 'litho') {
      Object.assign(base, { contrast: 1.15, brightness: 0.0, gamma: 1.0, detail: 0.8, texture: 0.55, bevel: 0.02, blur: 1 });
      $('meshModeSelect').value = 'lithophane'; $('baseMmInput').value = '0.8'; $('reliefMmInput').value = '2.4';
      if (state.studio3d) state.studio3d.setState({ viewMode: 'lithophane' }, false);
    } else if (name === 'coin') {
      Object.assign(base, { contrast: 1.35, brightness: 0.05, gamma: 1.05, detail: 2.2, texture: 0.65, bevel: 0.08, bevelShape: 'circle', blur: 1 });
      $('meshModeSelect').value = 'relief'; $('meshShapeSelect').value = 'circle'; $('mat3dSelect').value = 'brass';
    } else if (name === 'cnc') {
      Object.assign(base, { contrast: 1.1, brightness: 0.0, gamma: 0.95, detail: 1.2, texture: 0.35, bevel: 0.06, blur: 2 });
      $('meshModeSelect').value = 'relief'; $('mat3dSelect').value = 'oak';
    } else if (name === 'mold') {
      Object.assign(base, { contrast: 1.15, brightness: 0.0, gamma: 1.0, detail: 1.0, texture: 0.3, bevel: 0.1, invert: true, blur: 1 });
      $('meshModeSelect').value = 'relief'; $('mat3dSelect').value = 'clay';
    } else if (name === 'acrylic') {
      Object.assign(base, { contrast: 1.05, brightness: -0.04, gamma: 1.4, detail: 0.6, texture: 0.25, bevel: 0, blur: 0 });
      $('meshModeSelect').value = 'relief'; $('mat3dSelect').value = 'marble';
    }
    state.settings = base;
    syncControlsFromSettings();
    schedulePipelineUpdate(true);
    toast(t(`Applied "${name}" preset`, `Préréglage « ${name} » appliqué`), '🎛️');
  }

  function switchView(viewName) {
    state.activeView = viewName;
    document.querySelectorAll('.view-tab').forEach((b) => b.classList.toggle('active', b.dataset.view === viewName));
    document.querySelectorAll('.stage-view').forEach((sec) => {
      const show = state.hasImage && sec.id === 'view-' + viewName;
      sec.classList.toggle('active', show);
      sec.style.display = show ? 'flex' : 'none';
    });
    if (!state.hasImage || !state.processed) return;

    if (viewName === '2d') {
      drawHistogram(state.processed);
    } else if (viewName === '3d') {
      if (state.dirty3d || !state.meshData) rebuild3DStudio(false);
      else if (state.studio3d) state.studio3d.resize();
    } else if (viewName === 'bokeh') {
      if (state.dirtyBokeh) {
        renderBokeh();
        renderMaskCutout();
        state.dirtyBokeh = false;
      }
    } else if (viewName === 'pbr') {
      if (state.dirtyPBR) {
        renderPBRandCNC();
        state.dirtyPBR = false;
      }
    }
  }

  function renderShortcutsBody() {
    const host = $('shortcutsBody');
    if (!host) return;
    const rows = [
      ['Ctrl + Z', t('Undo slider or brush edit', 'Annuler réglage ou coup de pinceau')],
      ['Ctrl + Y', t('Redo edit', 'Rétablir modification')],
      ['B', t('Toggle Sculpt Brush mode', 'Activer/Désactiver le pinceau')],
      ['[ / ]', t('Decrease / Increase Brush size', 'Réduire / Agrandir le pinceau')],
      ['1 – 5', t('Switch Studio Views (2D / Compare / 3D / Bokeh / PBR)', 'Changer de vue (2D / Comparer / 3D / Bokeh / PBR)')],
      ['Escape', t('Close active modal', 'Fermer la fenêtre active')]
    ];
    host.innerHTML = rows.map(([k, d]) =>
      `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">
        <kbd style="background:var(--surface2);border:1px solid var(--border-strong);padding:3px 8px;border-radius:6px;font-weight:700;color:#93c5fd">${k}</kbd>
        <span style="color:var(--muted)">${d}</span>
      </div>`
    ).join('');
  }

  // ── 17. Event Wiring & Init ────────────────────────────────────────────────
  function wireEvents() {
    // Header
    $('back-btn').onclick = () => Gate.closeStudio();
    $('langToggle').onclick = () => setLang(currentLang === 'fr' ? 'en' : 'fr');
    $('btnSaveProject').onclick = saveProjectFile;
    $('btnUndo').onclick = undo;
    $('btnRedo').onclick = redo;
    $('btnPreflight').onclick = openPreflightModal;
    $('btnCostCalc').onclick = () => { refreshCostQuote(); openModal('costModal'); };
    $('btnShortcuts').onclick = () => openModal('shortcutsModal');
    $('pay-premium-btn').onclick = () => Gate.requestUpgrade();

    // File open & drag-drop (clears input value so re-uploading same file works!)
    const fi = $('fileInput');
    const openPicker = () => { fi.value = ''; fi.click(); };
    $('btnOpenImage').onclick = openPicker;
    $('btnChooseHero').onclick = (e) => { e.stopPropagation(); openPicker(); };
    $('emptyDropZone').onclick = (e) => {
      if (e.target.closest('.demo-btn') || e.target.closest('#btnChooseHero')) return;
      openPicker();
    };
    fi.onchange = (e) => { if (e.target.files && e.target.files[0]) loadUserFile(e.target.files[0]); };

    document.querySelectorAll('.demo-btn').forEach((btn) => {
      btn.onclick = (e) => { e.stopPropagation(); loadDemo(btn.dataset.demo); };
    });

    // Global drag-and-drop overlay
    const dropOv = $('globalDropOverlay');
    let dragCounter = 0;
    window.addEventListener('dragenter', (e) => { e.preventDefault(); dragCounter++; dropOv.classList.add('show'); });
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('dragleave', () => { dragCounter = Math.max(0, dragCounter - 1); if (!dragCounter) dropOv.classList.remove('show'); });
    window.addEventListener('drop', (e) => {
      e.preventDefault(); dragCounter = 0; dropOv.classList.remove('show');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) loadUserFile(e.dataTransfer.files[0]);
    });

    // Sidebar & Stage Tabs & Mobile Switcher
    document.querySelectorAll('.side-tab').forEach((btn) => {
      btn.onclick = () => {
        document.querySelectorAll('.side-tab').forEach((b) => b.classList.toggle('active', b === btn));
        document.querySelectorAll('.side-pane').forEach((p) => p.classList.toggle('active', p.id === 'pane-' + btn.dataset.sideTab));
      };
    });

    document.querySelectorAll('.view-tab').forEach((btn) => {
      btn.onclick = () => switchView(btn.dataset.view);
    });

    document.querySelectorAll('.mobile-tab').forEach((btn) => {
      btn.onclick = () => {
        document.querySelectorAll('.mobile-tab').forEach((b) => b.classList.toggle('active', b === btn));
        document.body.setAttribute('data-mobile-pane', btn.dataset.mobileTarget);
        if (btn.dataset.mobileTarget === 'canvas' && state.studio3d) state.studio3d.resize();
      };
    });

    // AI Generate & Presets & Reset
    $('generateBtn').onclick = runGenerateDepth;
    document.querySelectorAll('.preset-btn').forEach((btn) => {
      btn.onclick = () => applyMaterialPreset(btn.dataset.preset);
    });
    $('btnResetControls').onclick = () => {
      pushHistory();
      state.settings = Object.assign({}, DEFAULT_SETTINGS);
      document.querySelectorAll('.preset-btn').forEach((b) => b.classList.remove('active'));
      syncControlsFromSettings();
      schedulePipelineUpdate(true);
      toast(t('Depth controls reset', 'Réglages réinitialisés'), '↺');
    };

    // Depth Sliders (push history on pointerdown/change, live 60fps update on input!)
    const bindSlider = (id, key, scale, fmt, valId) => {
      const el = $(id);
      el.addEventListener('pointerdown', () => pushHistory());
      el.addEventListener('input', () => {
        const num = parseFloat(el.value);
        state.settings[key] = scale ? (num / scale) : num;
        if (valId) $(valId).textContent = fmt(num);
        schedulePipelineUpdate(false);
      });
    };
    bindSlider('contrastSlider', 'contrast', 100, (v) => `${v}%`, 'contrastVal');
    bindSlider('brightnessSlider', 'brightness', 100, (v) => `${v > 0 ? '+' : ''}${v}%`, 'brightnessVal');
    bindSlider('gammaSlider', 'gamma', 100, (v) => (v / 100).toFixed(2), 'gammaVal');
    bindSlider('blurSlider', 'blur', 0, (v) => `${v}px`, 'blurVal');
    bindSlider('detailSlider', 'detail', 0, (v) => Number(v).toFixed(1), 'detailVal');
    bindSlider('textureSlider', 'texture', 0, (v) => Number(v).toFixed(2), 'textureVal');
    bindSlider('bgCutoffSlider', 'bgCutoff', 100, (v) => `${v}%`, 'bgCutoffVal');
    bindSlider('bevelSlider', 'bevel', 100, (v) => `${v}%`, 'bevelVal');
    bindSlider('contourSlider', 'contourSteps', 0, (v) => (v > 1 ? String(v) : 'Off'), 'contourVal');

    $('invertSelect').onchange = () => { pushHistory(); state.settings.invert = $('invertSelect').value === '1'; schedulePipelineUpdate(true); };
    $('autoClipChk').onchange = () => { pushHistory(); state.settings.autoClip = $('autoClipChk').checked; schedulePipelineUpdate(true); };

    // Histogram Levels
    $('blackPtSlider').addEventListener('pointerdown', () => pushHistory());
    $('blackPtSlider').addEventListener('input', (e) => {
      const bp = Math.min(parseInt(e.target.value, 10) / 100, state.settings.whitePoint - 0.05);
      state.settings.blackPoint = Math.max(0, bp);
      $('blackPtVal').textContent = Math.round(state.settings.blackPoint * 100) + '%';
      schedulePipelineUpdate(false);
    });
    $('whitePtSlider').addEventListener('pointerdown', () => pushHistory());
    $('whitePtSlider').addEventListener('input', (e) => {
      const wp = Math.max(parseInt(e.target.value, 10) / 100, state.settings.blackPoint + 0.05);
      state.settings.whitePoint = Math.min(1, wp);
      $('whitePtVal').textContent = Math.round(state.settings.whitePoint * 100) + '%';
      schedulePipelineUpdate(false);
    });
    $('btnAutoLevels').onclick = () => { pushHistory(); autoStretchLevels(); toast(t('Levels auto-stretched (2%–98%)', 'Niveaux auto-étirés (2%–98%)'), '✨'); };
    $('btnResetLevels').onclick = () => {
      pushHistory();
      state.settings.blackPoint = 0; state.settings.whitePoint = 1;
      syncControlsFromSettings(); schedulePipelineUpdate(false);
    };

    // Sculpt Brush Controls & Canvas Interaction
    $('sculptEnableChk').onchange = (e) => {
      state.brush.enabled = e.target.checked;
      $('depthCanvas').classList.toggle('sculpt-active', state.brush.enabled);
      $('sculptStatusPill').textContent = state.brush.enabled
        ? t(`Brush: ${state.brush.mode.toUpperCase()}`, `Pinceau : ${state.brush.mode.toUpperCase()}`)
        : t('Probe Active', 'Sonde Active');
      renderSculptOverlay();
    };
    document.querySelectorAll('.brush-btn').forEach((btn) => {
      btn.onclick = () => {
        document.querySelectorAll('.brush-btn').forEach((b) => b.classList.toggle('active', b === btn));
        state.brush.mode = btn.dataset.brush;
        if (!state.brush.enabled) {
          $('sculptEnableChk').checked = true;
          $('sculptEnableChk').dispatchEvent(new Event('change'));
        } else {
          $('sculptStatusPill').textContent = t(`Brush: ${state.brush.mode.toUpperCase()}`, `Pinceau : ${state.brush.mode.toUpperCase()}`);
        }
      };
    });
    $('brushSizeSlider').oninput = (e) => { state.brush.size = parseInt(e.target.value, 10); $('brushSizeVal').textContent = state.brush.size + 'px'; };
    $('brushStrengthSlider').oninput = (e) => { state.brush.strength = parseInt(e.target.value, 10) / 100; $('brushStrengthVal').textContent = e.target.value + '%'; };
    $('brushOverlaySlider').oninput = (e) => { state.brush.overlayAlpha = parseInt(e.target.value, 10) / 100; $('brushOverlayVal').textContent = e.target.value + '%'; renderSculptOverlay(); };
    $('flattenTargetSlider').oninput = (e) => { state.brush.flattenTarget = parseInt(e.target.value, 10) / 100; $('flattenTargetVal').textContent = e.target.value + '%'; };
    $('btnClearBrush').onclick = () => {
      if (!state.rawDepth) return;
      pushHistory();
      state.brushDelta = new Float32Array(state.rawDepth.data.length);
      schedulePipelineUpdate(true);
      toast(t('Brush edits cleared', 'Retouches pinceau effacées'), '🧹');
    };

    const dc = $('depthCanvas');
    const normCoords = (ev) => {
      const r = dc.getBoundingClientRect();
      const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
      return {
        nx: DE.clamp01((cx - r.left) / Math.max(1, r.width)),
        ny: DE.clamp01((cy - r.top) / Math.max(1, r.height))
      };
    };
    dc.addEventListener('pointerdown', (ev) => {
      if (!state.processed) return;
      const { nx, ny } = normCoords(ev);
      updateDepthProbe(nx, ny);
      if (ev.altKey) {
        // Eyedropper picks exact flatten Z!
        const ix = Math.round(nx * (state.processed.width - 1));
        const iy = Math.round(ny * (state.processed.height - 1));
        const z = state.processed.data[iy * state.processed.width + ix];
        state.brush.flattenTarget = z;
        $('flattenTargetSlider').value = Math.round(z * 100);
        $('flattenTargetVal').textContent = Math.round(z * 100) + '%';
        toast(t(`Picked Flatten Z = ${Math.round(z * 100)}%`, `Hauteur Z capturée = ${Math.round(z * 100)}%`), '🎯');
        return;
      }
      if (!state.brush.enabled) return;
      pushHistory();
      state.brush.painting = true;
      dc.setPointerCapture(ev.pointerId);
      applyBrushStrokeAt(nx, ny);
    });
    dc.addEventListener('pointermove', (ev) => {
      if (!state.processed) return;
      const { nx, ny } = normCoords(ev);
      updateDepthProbe(nx, ny);
      if (state.brush.enabled && state.brush.painting) {
        applyBrushStrokeAt(nx, ny);
      }
    });
    window.addEventListener('pointerup', () => { state.brush.painting = false; });

    // Compare Slider (Drag anywhere on wrap, window mousemove so never stuck!)
    const cw = $('compareWrap');
    let cmpDrag = false;
    const moveCmp = (ev) => {
      if (!cmpDrag) return;
      const r = cw.getBoundingClientRect();
      const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      applyComparePosition(((cx - r.left) / Math.max(1, r.width)) * 100);
    };
    cw.addEventListener('mousedown', (ev) => { cmpDrag = true; moveCmp(ev); });
    cw.addEventListener('touchstart', (ev) => { cmpDrag = true; moveCmp(ev); }, { passive: true });
    window.addEventListener('mousemove', moveCmp);
    window.addEventListener('touchmove', moveCmp, { passive: true });
    window.addEventListener('mouseup', () => { cmpDrag = false; });
    window.addEventListener('touchend', () => { cmpDrag = false; });

    // 3D Studio Controls
    $('btnRebuild3D').onclick = () => { switchView('3d'); rebuild3DStudio(false); toast(t('3D Solid Mesh updated!', 'Maillage 3D Solide mis à jour !'), '🧊'); };
    ['meshModeSelect', 'meshShapeSelect', 'meshResSelect', 'borderRimChk', 'keychainHoleChk'].forEach((id) => {
      $(id).onchange = () => {
        if (id === 'meshShapeSelect') {
          const sh = $('meshShapeSelect').value;
          state.settings.bevelShape = (sh === 'circle' || sh === 'oval') ? sh : 'rect';
        }
        if (id === 'meshModeSelect' && $('meshModeSelect').value === 'lithophane') {
          $('baseMmInput').value = '0.8'; $('reliefMmInput').value = '2.4';
          if (state.studio3d) state.studio3d.setState({ viewMode: 'lithophane' }, false);
        }
        state.dirty3d = true;
        if (state.activeView === '3d') rebuild3DStudio(false);
      };
    });

    document.querySelectorAll('[data-3dmode]').forEach((btn) => {
      btn.onclick = () => {
        document.querySelectorAll('[data-3dmode]').forEach((b) => b.classList.remove('btn-primary'));
        btn.classList.add('btn-primary');
        if (state.studio3d) state.studio3d.setState({ viewMode: btn.dataset['3dmode'] }, true);
      };
    });
    document.querySelectorAll('.cam-btn').forEach((btn) => {
      btn.onclick = () => { if (state.studio3d) state.studio3d.setCameraPreset(btn.dataset.cam); };
    });
    $('btnAutoRotate3D').onclick = function () {
      if (!state.studio3d) return;
      state.studio3d.autoRotate = !state.studio3d.autoRotate;
      this.classList.toggle('btn-primary', state.studio3d.autoRotate);
    };
    $('mat3dSelect').onchange = (e) => { if (state.studio3d) state.studio3d.setState({ material: e.target.value }, true); };
    $('lightAzSlider').oninput = (e) => {
      $('lightAzVal').textContent = e.target.value + '°';
      if (state.studio3d) state.studio3d.setState({ lightAzimuth: parseFloat(e.target.value) }, false);
    };
    $('ledKelvinSelect').onchange = (e) => {
      if (state.studio3d) state.studio3d.setState({ ledKelvin: parseInt(e.target.value, 10) }, true);
    };
    $('ledBrightSlider').oninput = (e) => {
      $('ledBrightVal').textContent = e.target.value + '%';
      if (state.studio3d) state.studio3d.setState({ ledBrightness: parseInt(e.target.value, 10) / 100 }, true);
    };

    // Click-to-Focus Bokeh & Mask Controls
    $('bokehCanvas').onclick = (ev) => {
      if (!state.processed) return;
      const r = ev.target.getBoundingClientRect();
      const nx = DE.clamp01((ev.clientX - r.left) / Math.max(1, r.width));
      const ny = DE.clamp01((ev.clientY - r.top) / Math.max(1, r.height));
      const ix = Math.round(nx * (state.processed.width - 1));
      const iy = Math.round(ny * (state.processed.height - 1));
      const z = Math.round(state.processed.data[iy * state.processed.width + ix] * 100);
      $('bokehFocus').value = z;
      $('bokehFocusVal').textContent = z + '%';
      renderBokeh();
      toast(t(`Focus locked at depth ${z}%`, `Mise au point verrouillée à ${z}%`), '🎯');
    };
    let bokehTimer = null;
    const schedBokeh = () => { clearTimeout(bokehTimer); bokehTimer = setTimeout(renderBokeh, 35); };
    $('bokehFocus').oninput = (e) => { $('bokehFocusVal').textContent = e.target.value + '%'; schedBokeh(); };
    $('bokehBlur').oninput = (e) => { $('bokehBlurVal').textContent = e.target.value + 'px'; schedBokeh(); };
    $('bokehBand').oninput = (e) => { $('bokehBandVal').textContent = e.target.value + '%'; schedBokeh(); };
    $('bokehGlow').oninput = (e) => { $('bokehGlowVal').textContent = e.target.value + '%'; schedBokeh(); };

    let maskTimer = null;
    const schedMask = () => { clearTimeout(maskTimer); maskTimer = setTimeout(renderMaskCutout, 25); };
    $('maskMin').oninput = (e) => { $('maskMinVal').textContent = e.target.value + '%'; schedMask(); };
    $('maskMax').oninput = (e) => { $('maskMaxVal').textContent = e.target.value + '%'; schedMask(); };
    $('maskFeather').oninput = (e) => { $('maskFeatherVal').textContent = e.target.value + '%'; schedMask(); };
    $('maskDisplayMode').onchange = () => renderMaskCutout();

    // PBR & CNC
    $('normalDxChk').onchange = () => renderPBRandCNC();
    $('lbMaterialSelect').onchange = () => updateLightBurnTable();
    $('btnPreviewCNC').onclick = () => { switchView('pbr'); renderPBRandCNC(); };

    // Cost Quote Modal Inputs
    ['quoteProcess', 'quoteMatRate', 'quoteHourly', 'quoteMarkup'].forEach((id) => {
      $(id).addEventListener('input', refreshCostQuote);
      $(id).addEventListener('change', refreshCostQuote);
    });

    // Modals close & Backdrop click
    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.onclick = () => closeModal(btn.dataset.closeModal);
    });
    document.querySelectorAll('.modal-backdrop').forEach((bd) => {
      bd.onclick = (e) => { if (e.target === bd) bd.classList.remove('open'); };
    });

    // Global Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closeAllModals(); return; }
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
      else if (e.key.toLowerCase() === 'b') { $('sculptEnableChk').checked = !state.brush.enabled; $('sculptEnableChk').dispatchEvent(new Event('change')); }
      else if (e.key === '[') { state.brush.size = Math.max(4, state.brush.size - 6); $('brushSizeSlider').value = state.brush.size; $('brushSizeVal').textContent = state.brush.size + 'px'; }
      else if (e.key === ']') { state.brush.size = Math.min(120, state.brush.size + 6); $('brushSizeSlider').value = state.brush.size; $('brushSizeVal').textContent = state.brush.size + 'px'; }
      else if (e.key === '1') switchView('2d');
      else if (e.key === '2') switchView('compare');
      else if (e.key === '3') switchView('3d');
      else if (e.key === '4') switchView('bokeh');
      else if (e.key === '5') switchView('pbr');
      else if (e.key === '?') openModal('shortcutsModal');
    });

    // Live storage sync with parent site language
    window.addEventListener('storage', (e) => {
      if (e.key === 'sp_lang' && (e.newValue === 'en' || e.newValue === 'fr')) {
        setLang(e.newValue);
      }
    });

    // Resize histogram cleanly
    window.addEventListener('resize', () => {
      if (state.processed && state.activeView === '2d') drawHistogram(state.processed);
    });
  }

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  buildColorMapUI();
  syncControlsFromSettings();
  wireExports();
  wireEvents();
  setLang(detectInitialLang());
  updateLightBurnTable();

  // Probe WebGPU availability non-blocking
  DE.detectWebGPU().then((dev) => updateDeviceBadge(dev));
}());
