/**
 * 3D Studio Pro — Main CAD Controller
 * Studios-Pro (https://studios-pro.com/apps/ap3d/)
 * Wires: 9 Watertight CAD Shapes, Optical LED Backlight, Color Lithophane Sheet,
 * 3D Custom Frame Text, Cross-Section Thickness Caliper, Slicer Pre-Flight,
 * Etsy Print/LED Quote, Magic Light-Up WEBM Video, WebAR 1:1 GLB, .sp3d Save/Load,
 * 25-Step Undo/Redo, Sealed StudiosProGate & EN/FR Auto-Sync.
 */
(function () {
  'use strict';

  const LE = window.LithoEngine;
  const $ = (id) => document.getElementById(id);

  // ── 1. Bilingual i18n (Auto-synced with sp_lang + ?lang=) ──────────────────
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
  function t(en, fr) { return currentLang === 'fr' ? fr : en; }
  function setLang(lang) {
    currentLang = lang === 'fr' ? 'fr' : 'en';
    document.body.setAttribute('data-lang', currentLang);
    document.documentElement.lang = currentLang;
    try { localStorage.setItem('sp_lang', currentLang); } catch (_) {}
    updateCreditsBadge();
    renderShortcutsBody();
  }

  // ── 2. XSS-Safe Toast ──────────────────────────────────────────────────────
  function toast(msg, icon) {
    const host = $('toastContainer');
    if (!host) return;
    const el = document.createElement('div');
    el.className = 'toast-item';
    const ic = document.createElement('span'); ic.textContent = icon || '✅';
    const tx = document.createElement('span'); tx.textContent = String(msg || '');
    el.appendChild(ic); el.appendChild(tx);
    host.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0'; el.style.transform = 'translateY(8px)'; el.style.transition = 'all 0.25s';
      setTimeout(() => el.remove(), 260);
    }, 3200);
  }

  // ── 3. Centralized Sealed Paywall Gate (Zero Bypass, 5 Free / Pro $10/mo) ──
  const FREE_LIMIT = 5;
  const Gate = (function () {
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('studios_pro_channel') : null;
    let isPremium = false;
    let pendingAction = null;

    function getFreeUsed() { try { return parseInt(localStorage.getItem('freeExportsUsed') || '0', 10) || 0; } catch (_) { return 0; } }
    function setFreeUsed(v) { try { localStorage.setItem('freeExportsUsed', String(v)); } catch (_) {} }
    function inIframe() { try { return window.self !== window.top; } catch (_) { return true; } }

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
          const fn = pendingAction; pendingAction = null;
          if (typeof fn === 'function') {
            Promise.resolve(fn()).then((ok) => {
              if (ok !== false && !isPremium) channel.postMessage({ type: 'EXPORT_COMPLETED' });
            }).catch((err) => toast(err.message, '❌'));
          }
        } else if (msg.type === 'LOAD_EXTERNAL_FILE' && msg.payload) {
          handleExternalFile(msg.payload);
        } else if (msg.type === 'LOAD_EXTERNAL_URL' && msg.payload && msg.payload.url) {
          fetch(msg.payload.url).then((r) => r.blob()).then((blob) => {
            const name = msg.payload.url.split('/').pop().split('?')[0] || 'external.png';
            loadUserFile(new File([blob], name, { type: blob.type || 'image/png' }));
          }).catch(() => {});
        }
      };
      channel.postMessage({ type: 'GET_USER_STATUS' });
    }

    async function runGatedExport(actionFn) {
      if (isPremium) { await actionFn(); return; }
      if (!inIframe()) {
        const used = getFreeUsed();
        if (used >= FREE_LIMIT) {
          pendingAction = actionFn;
          openModal('paymentModal');
          return;
        }
        const ok = await actionFn();
        if (ok !== false) { setFreeUsed(used + 1); updateCreditsBadge(); }
        return;
      }
      pendingAction = actionFn;
      if (channel) channel.postMessage({ type: 'TRIGGER_PAYMENT_MODAL', payload: { ref: 'ap3d' } });
      else openModal('paymentModal');
    }

    function requestUpgrade() {
      closeModal('paymentModal');
      if (inIframe() && channel) channel.postMessage({ type: 'START_STRIPE_PAYMENT', payload: { type: 'premium', ref: 'ap3d' } });
      else window.open('/?upgrade=premium&ref=ap3d', '_blank');
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
      b.className = 'pill pro';
      b.textContent = '★ PRO';
    } else {
      b.className = 'pill';
      const rem = Gate.remainingFree();
      b.textContent = currentLang === 'fr' ? `${rem} Gratuits` : `${rem} Free`;
    }
  }

  // ── 4. State & Defaults ────────────────────────────────────────────────────
  const DEFAULT_IMG = {
    cropMode: 'original',
    rotateSteps: 0,
    flipH: false,
    sharpen: 1,
    contrast: 10,
    brightness: 0,
    gamma: 1.0,
    noiseReduction: 0,
    blur: 0,
    invert: false
  };

  const DEFAULT_CAD = {
    mode: 'lithophane',
    shape: 'flat',
    widthMm: 120,
    minThickMm: 0.8,
    maxThickMm: 3.2,
    frameWidthMm: 4,
    frameHeightMm: 4.0,
    curveAngleDeg: 110,
    socketDiaMm: 38,
    builtInStand: false,
    keychainHole: false,
    frameText: '',
    frameTextMode: 'emboss'
  };

  const state = {
    hasImage: false,
    projectName: 'lithophane_3d',
    rawSourceCanvas: null,
    croppedColorCanvas: null,
    heightfield: null,
    previewMesh: null,
    img: Object.assign({}, DEFAULT_IMG),
    cad: Object.assign({}, DEFAULT_CAD),
    undoStack: [],
    redoStack: [],
    viewport: null,
    rafTimer: null
  };

  // ── 5. 25-Step Undo / Redo ─────────────────────────────────────────────────
  function pushHistory() {
    if (!state.hasImage) return;
    state.undoStack.push({
      img: Object.assign({}, state.img),
      cad: Object.assign({}, state.cad)
    });
    if (state.undoStack.length > 25) state.undoStack.shift();
    state.redoStack = [];
    syncUndoBtns();
  }
  function undo() {
    if (!state.undoStack.length) return;
    state.redoStack.push({ img: Object.assign({}, state.img), cad: Object.assign({}, state.cad) });
    const prev = state.undoStack.pop();
    state.img = Object.assign({}, prev.img);
    state.cad = Object.assign({}, prev.cad);
    syncControlsFromState();
    syncUndoBtns();
    rebuildImageAndMesh(false);
    toast(t('Undo applied', 'Annulation effectuée'), '↶');
  }
  function redo() {
    if (!state.redoStack.length) return;
    state.undoStack.push({ img: Object.assign({}, state.img), cad: Object.assign({}, state.cad) });
    const next = state.redoStack.pop();
    state.img = Object.assign({}, next.img);
    state.cad = Object.assign({}, next.cad);
    syncControlsFromState();
    syncUndoBtns();
    rebuildImageAndMesh(false);
    toast(t('Redo applied', 'Rétablissement effectué'), '↷');
  }
  function syncUndoBtns() {
    $('btnUndo').disabled = state.undoStack.length === 0;
    $('btnRedo').disabled = state.redoStack.length === 0;
  }

  // ── 6. Helpers: Modals, Progress, Downloads ────────────────────────────────
  function openModal(id) { const m = $(id); if (m) m.classList.add('open'); }
  function closeModal(id) { const m = $(id); if (m) m.classList.remove('open'); }
  function closeAllModals() { document.querySelectorAll('.modal-backdrop.open').forEach((m) => m.classList.remove('open')); }

  function setProgress(pct, label, active) {
    const s = $('progressStrip');
    if (active !== undefined) s.classList.toggle('active', !!active);
    $('progressFill').style.width = `${Math.max(0, Math.min(100, pct))}%`;
    $('progressPct').textContent = `${Math.round(pct)}%`;
    if (label) $('progressLabel').textContent = label;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function enableActionButtons(on) {
    const ids = [
      'btnSaveProject', 'btnPreflight', 'btnCostCalc', 'btnRecordVideo',
      'btnExportSTL', 'btnExportGLB', 'btnExportOBJ', 'btnExportColorSheet',
      'btnExportHTML', 'btn-preview-ar'
    ];
    ids.forEach((id) => { const el = $(id); if (el) el.disabled = !on; });
  }

  // ── 7. Photo, Demo & .sp3d Project Loading ─────────────────────────────────
  async function handleExternalFile(payload) {
    try {
      let blob;
      if (payload.isBinary) blob = await (await fetch(payload.data)).blob();
      else blob = new Blob([payload.data], { type: 'application/json' });
      await loadUserFile(new File([blob], payload.name || 'external.png', { type: blob.type || 'image/png' }));
    } catch (err) { toast('External file error: ' + err.message, '❌'); }
  }

  async function loadUserFile(file) {
    if (!file) return;
    const lower = (file.name || '').toLowerCase();
    if (lower.endsWith('.sp3d') || lower.endsWith('.json')) {
      try {
        await loadProjectJSON(JSON.parse(await file.text()));
        return;
      } catch (err) {
        toast(t('Invalid .sp3d project file', 'Fichier projet .sp3d invalide'), '❌');
        return;
      }
    }
    if (!file.type || !file.type.startsWith('image/')) {
      toast(t('Please upload a JPG, PNG, WEBP image or .sp3d project', 'Veuillez importer une image JPG, PNG, WEBP ou un projet .sp3d'), '⚠️');
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
      const sc = Math.min(1, 1800 / Math.max(img.naturalWidth, img.naturalHeight));
      cv.width = Math.max(32, Math.round(img.naturalWidth * sc));
      cv.height = Math.max(32, Math.round(img.naturalHeight * sc));
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.drawImage(img, 0, 0, cv.width, cv.height);

      state.projectName = (file.name || 'lithophane').replace(/\.[^.]+$/, '');
      mountSourceCanvas(cv, true);
      toast(t('Photo loaded with locked aspect ratio!', 'Photo chargée avec proportions exactes !'), '🖼️');
    } catch (err) {
      toast(err.message, '❌');
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function loadDemo(id) {
    const cv = LE.generateDemoPhotoCanvas(id, 640);
    state.projectName = 'demo_' + id;
    if (id === 'heart') {
      state.cad.shape = 'heart'; state.cad.mode = 'lithophane'; state.cad.keychainHole = true; state.cad.frameWidthMm = 4;
      setViewportState({ ledOn: true, ledKelvin: 2700, colorBacklit: false });
    } else if (id === 'landscape') {
      state.cad.shape = 'arc'; state.cad.mode = 'lithophane'; state.cad.curveAngleDeg = 120; state.cad.frameWidthMm = 4;
      setViewportState({ ledOn: true, ledKelvin: 2700, colorBacklit: true });
    } else if (id === 'coin') {
      state.cad.shape = 'sphere'; state.cad.mode = 'lithophane'; state.cad.widthMm = 130;
      setViewportState({ ledOn: true, ledKelvin: 2700, colorBacklit: false });
    } else {
      state.cad.shape = 'flat'; state.cad.mode = 'lithophane'; state.cad.frameWidthMm = 5; state.cad.builtInStand = true;
      setViewportState({ ledOn: true, ledKelvin: 2700, colorBacklit: false });
    }
    syncControlsFromState();
    mountSourceCanvas(cv, true);
    toast(t(`Loaded "${id}" 3D Studio demo!`, `Démo Studio 3D « ${id} » chargée !`), '✨');
  }

  function mountSourceCanvas(cv, resetCamera) {
    state.hasImage = true;
    state.rawSourceCanvas = cv;
    state.undoStack = [];
    state.redoStack = [];
    syncUndoBtns();
    $('welcomeOverlay').style.display = 'none';
    $('hudBottom').classList.add('show');
    enableActionButtons(true);
    if (!state.viewport && typeof window.StudioViewport3D === 'function') {
      state.viewport = new window.StudioViewport3D($('canvas3d'));
      state.viewport.init();
    }
    if (resetCamera && state.viewport) state.viewport.hasCameraFramed = false;
    rebuildImageAndMesh(!!resetCamera);
  }

  // ── 8. Non-Destructive Image Processing + Dual-Res CAD Pipeline ────────────
  function buildTransformedColorCanvas() {
    const src = state.rawSourceCanvas;
    if (!src) return null;

    // 1. Rotate / Flip non-destructively from untouched rawSourceCanvas!
    const rot = ((state.img.rotateSteps % 4) + 4) % 4;
    const rw = (rot % 2 === 1) ? src.height : src.width;
    const rh = (rot % 2 === 1) ? src.width : src.height;
    const tr = document.createElement('canvas');
    tr.width = rw; tr.height = rh;
    const tctx = tr.getContext('2d');
    tctx.save();
    tctx.translate(rw * 0.5, rh * 0.5);
    tctx.rotate((rot * Math.PI) / 2);
    if (state.img.flipH) tctx.scale(-1, 1);
    tctx.drawImage(src, -src.width * 0.5, -src.height * 0.5);
    tctx.restore();

    // 2. Smart Aspect Crop
    const crop = LE.computeCropRect(rw, rh, state.img.cropMode);
    const out = document.createElement('canvas');
    // Working resolution capped at 720px max for blazing fast real-time processing
    const sc = Math.min(1, 720 / Math.max(crop.sw, crop.sh));
    out.width = Math.max(32, Math.round(crop.sw * sc));
    out.height = Math.max(32, Math.round(crop.sh * sc));
    out.getContext('2d').drawImage(tr, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, out.width, out.height);
    return out;
  }

  function scheduleRebuild(imageChanged) {
    if (state.rafTimer) cancelAnimationFrame(state.rafTimer);
    state.rafTimer = requestAnimationFrame(() => {
      state.rafTimer = null;
      if (imageChanged) rebuildImageAndMesh(false);
      else rebuildMeshOnly(false);
    });
  }

  function rebuildImageAndMesh(resetCamera) {
    if (!state.rawSourceCanvas) return;
    const colorCv = buildTransformedColorCanvas();
    state.croppedColorCanvas = colorCv;
    const ctx = colorCv.getContext('2d', { willReadFrequently: true });
    const rgba = ctx.getImageData(0, 0, colorCv.width, colorCv.height).data;
    state.heightfield = LE.processHeightfieldFromRGBA(rgba, colorCv.width, colorCv.height, state.img);

    // Draw processed 2D grayscale preview thumbnail
    const pv = $('preview2dCanvas');
    pv.width = state.heightfield.width;
    pv.height = state.heightfield.height;
    const pctx = pv.getContext('2d');
    const id = pctx.createImageData(pv.width, pv.height);
    const d = state.heightfield.data;
    for (let i = 0; i < d.length; i++) {
      const v = Math.round(d[i] * 255);
      id.data[i * 4] = v; id.data[i * 4 + 1] = v; id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255;
    }
    pctx.putImageData(id, 0, 0);

    rebuildMeshOnly(resetCamera);
  }

  function rebuildMeshOnly(resetCamera) {
    if (!state.heightfield) return;
    const opts = Object.assign({}, state.cad, { isPreview: true });
    const mesh = LE.buildCADMesh(state.heightfield, opts);
    state.previewMesh = mesh;

    // Update accurate CAD HUD (Fixes B8!)
    const estG = (mesh.volumeCm3 * 1.24 * (mesh.mode === 'lithophane' ? 0.98 : 0.45)).toFixed(0);
    $('hudDims').textContent = `${mesh.dimensionsMm.x} × ${mesh.dimensionsMm.y} × ${mesh.dimensionsMm.z} mm`;
    $('hudWall').textContent = `${mesh.minThickMm}–${mesh.maxThickMm} mm`;
    $('hudTris').textContent = mesh.triangleCount.toLocaleString();
    $('hudPla').textContent = `~${estG} g (${mesh.volumeCm3} cm³)`;

    if (state.viewport) {
      state.viewport.updateMesh(mesh, state.heightfield, state.croppedColorCanvas, !!resetCamera);
    }
    drawCrossSectionCaliper();
  }

  // ── 9. Live Cross-Section Wall Thickness Caliper ───────────────────────────
  function drawCrossSectionCaliper() {
    const cv = $('caliperCanvas');
    if (!cv || !state.heightfield) return;
    const W = Math.max(240, cv.clientWidth || 640);
    const H = 64;
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    const rowFrac = parseInt($('caliperRowSlider').value, 10) / 100;
    const cs = LE.sampleCrossSection(state.heightfield, state.cad, rowFrac);
    const maxAxis = Math.max(cs.maxT * 1.15, 4.0);

    // Safe 0.8mm minimum nozzle wall threshold dashed line
    const ySafe = H - (0.8 / maxAxis) * (H - 12) - 4;
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.55)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(0, ySafe); ctx.lineTo(W, ySafe); ctx.stroke();
    ctx.setLineDash([]);

    // Filled cross-section silhouette
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, state.cad.mode === 'lithophane' ? 'rgba(251, 191, 36, 0.72)' : 'rgba(79, 142, 255, 0.72)');
    grad.addColorStop(1, 'rgba(79, 142, 255, 0.12)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let i = 0; i < cs.profile.length; i++) {
      const x = (i / (cs.profile.length - 1)) * W;
      const y = H - (cs.profile[i] / maxAxis) * (H - 12) - 4;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    // Crisp top contour stroke
    ctx.strokeStyle = state.cad.mode === 'lithophane' ? '#fcd34d' : '#60a5fa';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i < cs.profile.length; i++) {
      const x = (i / (cs.profile.length - 1)) * W;
      const y = H - (cs.profile[i] / maxAxis) * (H - 12) - 4;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 10px Inter, sans-serif';
    ctx.fillText(`Min ${cs.minT.toFixed(1)}mm · Max ${cs.maxT.toFixed(1)}mm`, 8, 13);
    ctx.fillStyle = '#f87171';
    ctx.fillText('0.8mm safe line', W - 86, Math.max(12, ySafe - 3));
  }

  // ── 10. Color Lithophane Backlit 300 DPI Calibrated Print Sheet ────────────
  function buildColorBacklitSheetCanvas() {
    const colorCv = state.croppedColorCanvas;
    if (!colorCv) return null;
    // 300 DPI = 11.811 px/mm (capped cleanly at 2600px max edge)
    const wMm = state.cad.widthMm;
    const hMm = wMm * (colorCv.height / Math.max(1, colorCv.width));
    const pxPerMm = Math.min(11.811, 2200 / Math.max(wMm, hMm));
    const imgW = Math.round(wMm * pxPerMm);
    const imgH = Math.round(hMm * pxPerMm);
    const margin = Math.round(14 * pxPerMm);

    const out = document.createElement('canvas');
    out.width = imgW + margin * 2;
    out.height = imgH + margin * 2 + 48;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);

    // Boost color saturation slightly (+22%) to compensate for diffusion through white PLA!
    ctx.filter = 'saturate(1.24) contrast(1.06)';
    // Mirror horizontally so ink faces smoothly against the rear of the white lithophane!
    ctx.save();
    ctx.translate(margin + imgW, margin);
    ctx.scale(-1, 1);
    ctx.drawImage(colorCv, 0, 0, imgW, imgH);
    ctx.restore();
    ctx.filter = 'none';

    // Exact 1:1 cut border + corner crop marks
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.strokeRect(margin, margin, imgW, imgH);

    ctx.fillStyle = '#0f172a';
    ctx.font = '700 18px Inter, Arial, sans-serif';
    ctx.fillText(`Studios-Pro Color Lithophane Backlit Sheet · Print 100% Scale (${wMm.toFixed(1)} × ${hMm.toFixed(1)} mm) · Mirrored for Rear Lamination`, margin, out.height - 16);
    return out;
  }

  // ── 11. Slicer Pre-Flight, Print Quote & .sp3d Save/Load ───────────────────
  function openPreflightModal() {
    if (!state.heightfield || !state.previewMesh) return;
    const rep = LE.inspectPrintability(state.heightfield, state.previewMesh, {
      mode: state.cad.mode,
      shape: state.cad.shape,
      minThickMm: state.cad.minThickMm,
      maxThickMm: state.cad.maxThickMm,
      frameWidthMm: state.cad.frameWidthMm,
      builtInStand: state.cad.builtInStand,
      invert: state.img.invert
    });
    const body = $('preflightBody');
    body.innerHTML = '';

    const col = rep.score >= 85 ? '#10b981' : (rep.score >= 60 ? '#f59e0b' : '#ef4444');
    const ring = document.createElement('div');
    ring.className = 'score-ring';
    ring.innerHTML = `
      <div class="score-num" style="color:${col}">${rep.score}/100</div>
      <div style="font-size:12px;color:var(--muted);line-height:1.45">
        <strong style="color:var(--text)">${t('3D Printability Readiness', 'Indice Imprimabilité 3D')}</strong><br/>
        ${t('Shape', 'Forme')}: <b>${state.cad.shape}</b> · ${t('Wall', 'Paroi')}: <b>${state.previewMesh.minThickMm}–${state.previewMesh.maxThickMm} mm</b> · <b>100% Watertight</b>
      </div>`;
    body.appendChild(ring);

    if (!rep.issues.length) {
      const ok = document.createElement('div');
      ok.className = 'issue-item ok';
      ok.textContent = t('✅ Ready for Bambu Studio, PrusaSlicer & Cura! Outward normals verified.',
        '✅ Prêt pour Bambu Studio, PrusaSlicer & Cura ! Normales sortantes vérifiées.');
      body.appendChild(ok);
    } else {
      rep.issues.forEach((iss) => {
        const div = document.createElement('div');
        div.className = 'issue-item ' + iss.severity;
        const sp = document.createElement('span');
        sp.textContent = currentLang === 'fr' ? iss.fr : iss.en;
        div.appendChild(sp);
        if (iss.fix) {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'btn btn-sm btn-primary';
          b.textContent = t('Auto-Fix', 'Corriger');
          b.onclick = () => { applyPreflightFix(iss.fix); openPreflightModal(); };
          div.appendChild(b);
        }
        body.appendChild(div);
      });
    }

    const tbl = document.createElement('table');
    tbl.className = 'tips-table';
    const tips = [
      [t('Recommended Layer Height', 'Hauteur de Couche'), rep.slicerTips.layerHeight],
      [t('Walls / Infill', 'Parois / Remplissage'), rep.slicerTips.perimeters],
      [t('Bed Orientation', 'Orientation Plateau'), rep.slicerTips.orientation],
      [t('Bed Adhesion', 'Adhérence Plateau'), rep.slicerTips.adhesion],
      [t('Recommended Filament', 'Filament Recommandé'), rep.slicerTips.filament]
    ];
    tips.forEach(([k, v]) => {
      const tr = document.createElement('tr');
      const td1 = document.createElement('td'); td1.textContent = k;
      const td2 = document.createElement('td'); td2.textContent = v;
      tr.appendChild(td1); tr.appendChild(td2); tbl.appendChild(tr);
    });
    body.appendChild(tbl);
    openModal('preflightModal');
  }

  function applyPreflightFix(fix) {
    pushHistory();
    if (fix === 'fixMinWall') state.cad.minThickMm = 0.8;
    else if (fix === 'fixMaxLitho') state.cad.maxThickMm = 3.2;
    else if (fix === 'fixInvert') state.img.invert = false;
    else if (fix === 'boostContrast') state.img.contrast = Math.min(80, state.img.contrast + 26);
    else if (fix === 'addStandOrFrame') { state.cad.frameWidthMm = 4; state.cad.builtInStand = true; }
    syncControlsFromState();
    rebuildImageAndMesh(false);
    toast(t('Slicer auto-fix applied!', 'Correction Slicer appliquée !'), '🛠️');
  }

  function refreshQuote() {
    const q = LE.computePrintQuote(state.previewMesh, {
      filamentPerKg: parseFloat($('qFilament').value) || 24,
      ledKitCost: parseFloat($('qLedKit').value) || 3.5,
      hourlyRate: parseFloat($('qHourly').value) || 1.25,
      markup: parseFloat($('qMarkup').value) || 3.5
    });
    const host = $('quoteResults');
    const kpis = [
      [t('Filament & Print Time', 'Filament & Temps'), `${q.weightG}g · ${q.estHours}h`, '#93c5fd'],
      [t('Total Make Cost (PLA+LED)', 'Coût Revient (PLA+LED)'), `$${q.totalCost.toFixed(2)}`, '#e2e8f0'],
      [t('Recommended Etsy Price', 'Prix Vente Recommandé'), `$${q.retailPrice.toFixed(2)}`, '#fcd34d'],
      [t('Net Profit (after fees)', 'Bénéfice Net'), `$${q.netProfit.toFixed(2)} (${q.marginPct}%)`, '#34d399']
    ];
    host.innerHTML = '';
    kpis.forEach(([l, v, c]) => {
      const box = document.createElement('div'); box.className = 'quote-kpi';
      const a = document.createElement('div'); a.className = 'kl'; a.textContent = l;
      const b = document.createElement('div'); b.className = 'kv'; b.style.color = c; b.textContent = v;
      box.appendChild(a); box.appendChild(b); host.appendChild(box);
    });
  }

  function saveProjectSP3D() {
    if (!state.rawSourceCanvas) return;
    const payload = {
      format: 'studios-pro-3d-studio',
      version: 1,
      projectName: state.projectName,
      imageDataUrl: state.rawSourceCanvas.toDataURL('image/jpeg', 0.92),
      img: state.img,
      cad: state.cad,
      look: state.viewport ? state.viewport.state : {}
    };
    downloadBlob(new Blob([JSON.stringify(payload)], { type: 'application/json' }), `${state.projectName}.sp3d`);
    toast(t('Project .sp3d saved (Free)!', 'Projet .sp3d sauvegardé (Gratuit) !'), '💾');
  }

  async function loadProjectJSON(proj) {
    if (!proj || proj.format !== 'studios-pro-3d-studio' || !proj.imageDataUrl) throw new Error('Invalid .sp3d');
    const img = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error('Image decode failed'));
      im.src = proj.imageDataUrl;
    });
    const cv = document.createElement('canvas');
    cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    cv.getContext('2d').drawImage(img, 0, 0);
    state.projectName = proj.projectName || 'restored_3d';
    state.img = Object.assign({}, DEFAULT_IMG, proj.img || {});
    state.cad = Object.assign({}, DEFAULT_CAD, proj.cad || {});
    syncControlsFromState();
    mountSourceCanvas(cv, true);
    if (proj.look) setViewportState(proj.look);
    toast(t('Project .sp3d restored!', 'Projet .sp3d restauré !'), '📂');
  }

  // ── 12. Production Mesh Builder (Safe Dual-Res) & Exports ──────────────────
  async function buildProductionMeshWithProgress() {
    const quality = $('exportQualitySelect').value || 'fine';
    setProgress(20, t(`Building watertight ${quality.toUpperCase()} CAD mesh…`, `Construction maillage CAD ${quality.toUpperCase()}…`), true);
    await new Promise((r) => setTimeout(r, 25));
    const mesh = LE.buildCADMesh(state.heightfield, Object.assign({}, state.cad, { isPreview: false, quality }));
    setProgress(80, t('Encoding binary CAD file…', 'Encodage du fichier CAD…'), true);
    await new Promise((r) => setTimeout(r, 15));
    return mesh;
  }

  function wireExports() {
    $('btnExportSTL').onclick = () => Gate.runGatedExport(async () => {
      if (!state.heightfield) return false;
      try {
        const mesh = await buildProductionMeshWithProgress();
        const buf = LE.exportBinarySTL(mesh);
        downloadBlob(new Blob([buf], { type: 'application/octet-stream' }), `${state.projectName}_${state.cad.shape}.stl`);
        toast(t(`Exported Watertight STL (${mesh.triangleCount.toLocaleString()} tris)!`,
          `STL Étanche exporté (${mesh.triangleCount.toLocaleString()} tris) !`), '🖨️');
        return true;
      } finally { setProgress(0, '', false); }
    });

    $('btnExportGLB').onclick = () => Gate.runGatedExport(async () => {
      if (!state.viewport || !state.previewMesh) return false;
      setProgress(35, t('Encoding 1:1 PBR GLB…', 'Encodage GLB PBR 1:1…'), true);
      try {
        const buf = await state.viewport.exportGLB();
        downloadBlob(new Blob([buf], { type: 'model/gltf-binary' }), `${state.projectName}_${state.cad.shape}.glb`);
        toast(t('Exported 1:1 Textured GLB!', 'GLB 1:1 Texturé exporté !'), '✨');
        return true;
      } finally { setProgress(0, '', false); }
    });

    $('btnExportOBJ').onclick = () => Gate.runGatedExport(async () => {
      if (!state.heightfield) return false;
      try {
        const mesh = await buildProductionMeshWithProgress();
        const obj = LE.exportOBJ(mesh);
        downloadBlob(new Blob([obj], { type: 'text/plain;charset=utf-8' }), `${state.projectName}_${state.cad.shape}.obj`);
        toast(t('Exported Watertight OBJ!', 'OBJ Étanche exporté !'), '📐');
        return true;
      } finally { setProgress(0, '', false); }
    });

    $('btnExportColorSheet').onclick = () => Gate.runGatedExport(async () => {
      const sheet = buildColorBacklitSheetCanvas();
      if (!sheet) return false;
      const blob = await new Promise((r) => sheet.toBlob(r, 'image/png'));
      downloadBlob(blob, `${state.projectName}_color_litho_sheet_300dpi.png`);
      toast(t('Exported 300 DPI Color Lithophane Backlit Sheet!', 'Feuille Lithophanie Couleur 300 DPI exportée !'), '🌈');
      return true;
    });

    $('btnExportHTML').onclick = () => Gate.runGatedExport(async () => {
      if (!state.viewport || !state.previewMesh) return false;
      setProgress(40, t('Packaging Standalone 3D HTML Proof…', 'Création Aperçu Client 3D HTML…'), true);
      try {
        const stlBuf = LE.exportBinarySTL(state.previewMesh);
        const html = state.viewport.generateClientProofHTML(stlBuf, {
          title: state.projectName,
          dimensionsMm: state.previewMesh.dimensionsMm,
          mode: state.cad.mode
        });
        downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), `${state.projectName}_3d_proof.html`);
        toast(t('Exported Interactive 3D HTML Proof!', 'Aperçu Client 3D HTML exporté !'), '🌐');
        return true;
      } finally { setProgress(0, '', false); }
    });

    // FREE 1:1 WebAR Preview (External contract ONLY!)
    $('btn-preview-ar').onclick = async () => {
      if (!state.viewport || !state.previewMesh || !window.StudiosProAR) return;
      try {
        const glbBuf = await state.viewport.exportGLB();
        const placement = (state.cad.shape === 'flat' || state.cad.shape === 'hexagon' || state.cad.shape === 'oval') ? 'wall' : 'floor';
        window.StudiosProAR.sendModel({
          modelData: glbBuf,
          extension: 'glb',
          isBinary: true,
          name: `${state.projectName}_${state.cad.shape}.glb`,
          placement,
          dimensionsMm: state.previewMesh.dimensionsMm,
          sourceStudio: 'ap3d'
        });
        toast(t('Sent 1:1 scale GLB to WebAR Viewer!', 'GLB échelle 1:1 envoyé vers AR Viewer !'), '📱');
      } catch (err) { toast('AR Preview error: ' + err.message, '❌'); }
    };

    // FREE Watermarked / PRO Clean Studio Video (.WEBM)
    $('btnRecordVideo').onclick = async () => {
      if (!state.viewport || !state.previewMesh) return;
      const btn = $('btnRecordVideo');
      btn.disabled = true;
      const mode = $('videoModeSelect').value;
      setProgress(5, t('Recording 3D Showcase Video…', 'Enregistrement Vidéo 3D…'), true);
      try {
        const blob = await state.viewport.recordShowcaseVideo({
          mode,
          durationSec: 4.2,
          isPro: Gate.isPremium(),
          onProgress: (p) => setProgress(p, t(`Recording Video (${p}%)…`, `Enregistrement Vidéo (${p}%)…`), true)
        });
        downloadBlob(blob, `${state.projectName}_${mode}.webm`);
        toast(Gate.isPremium()
          ? t('Clean Pro 3D Video (.WEBM) saved!', 'Vidéo 3D Pro sans filigrane enregistrée !')
          : t('3D Showcase Video (.WEBM) saved (Free with watermark)!', 'Vidéo 3D (.WEBM) enregistrée (Gratuit avec filigrane) !'), '🎥');
      } catch (err) {
        toast('Video error: ' + err.message, '❌');
      } finally {
        btn.disabled = false;
        setProgress(0, '', false);
      }
    };
  }

  // ── 13. UI Sync, Presets & Event Wiring ────────────────────────────────────
  function setViewportState(patch) {
    if (!state.viewport) {
      state.viewport = new window.StudioViewport3D($('canvas3d'));
      state.viewport.init();
    }
    state.viewport.setState(patch, true);
    syncLookControls();
  }

  function syncLookControls() {
    if (!state.viewport) return;
    const vs = state.viewport.state;
    $('ledOnChk').checked = !!vs.ledOn;
    $('colorBacklitChk').checked = !!vs.colorBacklit;
    $('ledTempSelect').value = String(vs.ledKelvin);
    $('ledIntSlider').value = Math.round((vs.ledIntensity || 1.15) * 100);
    $('ledIntVal').textContent = Math.round((vs.ledIntensity || 1.15) * 100) + '%';
    $('lightAzSlider').value = Math.round(vs.lightAzimuth || 38);
    $('lightAzVal').textContent = Math.round(vs.lightAzimuth || 38) + '°';

    const ledBtn = $('btnLedToggle');
    ledBtn.classList.toggle('btn-led-on', !!vs.ledOn);
    ledBtn.innerHTML = vs.ledOn
      ? '💡 <span data-en>LED ON</span><span data-fr>LED ON</span>'
      : '🌑 <span data-en>LED OFF</span><span data-fr>LED OFF</span>';

    $('btnColorBacklit').classList.toggle('btn-primary', !!vs.colorBacklit);
    $('btnWireToggle').classList.toggle('btn-primary', !!vs.wireframe);
    document.querySelectorAll('.mat-swatch').forEach((b) => b.classList.toggle('active', b.dataset.mat === vs.material));
  }

  function syncControlsFromState() {
    const im = state.img;
    const c = state.cad;
    $('cropModeSelect').value = im.cropMode;
    $('sharpenSlider').value = im.sharpen; $('sharpenVal').textContent = String(im.sharpen);
    $('contrastSlider').value = im.contrast; $('contrastVal').textContent = (im.contrast > 0 ? '+' : '') + im.contrast + '%';
    $('brightnessSlider').value = im.brightness; $('brightnessVal').textContent = (im.brightness > 0 ? '+' : '') + im.brightness + '%';
    $('gammaSlider').value = Math.round(im.gamma * 100); $('gammaVal').textContent = im.gamma.toFixed(2);
    $('noiseSlider').value = im.noiseReduction; $('noiseVal').textContent = String(im.noiseReduction);
    $('blurSlider').value = im.blur; $('blurVal').textContent = im.blur + 'px';
    $('invertChk').checked = !!im.invert;

    $('cadModeSelect').value = c.mode;
    $('widthSlider').value = c.widthMm; $('widthVal').textContent = c.widthMm + ' mm';
    $('minThickInput').value = c.minThickMm;
    $('maxThickInput').value = c.maxThickMm;
    $('frameWidthInput').value = c.frameWidthMm;
    $('frameHeightInput').value = c.frameHeightMm;
    $('curveAngleSlider').value = c.curveAngleDeg; $('curveAngleVal').textContent = c.curveAngleDeg + '°';
    $('socketSlider').value = c.socketDiaMm; $('socketVal').textContent = c.socketDiaMm + ' mm';
    $('builtInStandChk').checked = !!c.builtInStand;
    $('keychainHoleChk').checked = !!c.keychainHole;
    $('frameTextInput').value = c.frameText || '';
    $('frameTextMode').value = c.frameTextMode || 'emboss';

    document.querySelectorAll('.shape-btn').forEach((b) => b.classList.toggle('active', b.dataset.shape === c.shape));
  }

  function applyStudioPreset(name) {
    pushHistory();
    document.querySelectorAll('.preset-btn').forEach((b) => b.classList.toggle('active', b.dataset.preset === name));
    if (name === 'white-litho') {
      Object.assign(state.cad, { mode: 'lithophane', shape: 'flat', widthMm: 120, minThickMm: 0.8, maxThickMm: 3.2, frameWidthMm: 4, frameHeightMm: 4.0, builtInStand: true, keychainHole: false });
      setViewportState({ ledOn: true, ledKelvin: 2700, colorBacklit: false, material: 'litho' });
    } else if (name === 'curved-lamp') {
      Object.assign(state.cad, { mode: 'lithophane', shape: 'arc', widthMm: 140, minThickMm: 0.8, maxThickMm: 3.2, frameWidthMm: 4, frameHeightMm: 4.0, curveAngleDeg: 125, builtInStand: false, keychainHole: false });
      setViewportState({ ledOn: true, ledKelvin: 2700, colorBacklit: false, material: 'ivory' });
    } else if (name === 'moon-sphere') {
      Object.assign(state.cad, { mode: 'lithophane', shape: 'sphere', widthMm: 140, minThickMm: 0.8, maxThickMm: 3.2, socketDiaMm: 52, builtInStand: false, keychainHole: false });
      setViewportState({ ledOn: true, ledKelvin: 2700, colorBacklit: false, material: 'litho' });
    } else if (name === 'heart-gift') {
      Object.assign(state.cad, { mode: 'lithophane', shape: 'heart', widthMm: 110, minThickMm: 0.8, maxThickMm: 3.0, frameWidthMm: 4, frameHeightMm: 3.8, keychainHole: true, builtInStand: false });
      setViewportState({ ledOn: true, ledKelvin: 2700, colorBacklit: true, material: 'litho' });
    } else if (name === 'bronze-coin') {
      Object.assign(state.cad, { mode: 'relief', shape: 'circle', widthMm: 80, minThickMm: 2.0, maxThickMm: 5.5, frameWidthMm: 4, frameHeightMm: 6.0, keychainHole: false, builtInStand: false });
      setViewportState({ ledOn: false, colorBacklit: false, material: 'bronze' });
    } else if (name === 'wood-relief') {
      Object.assign(state.cad, { mode: 'relief', shape: 'flat', widthMm: 150, minThickMm: 3.0, maxThickMm: 9.0, frameWidthMm: 8, frameHeightMm: 9.5, builtInStand: false, keychainHole: false });
      setViewportState({ ledOn: false, colorBacklit: false, material: 'wood' });
    }
    syncControlsFromState();
    if (state.hasImage) rebuildMeshOnly(true);
    toast(t(`Preset "${name}" applied!`, `Préréglage « ${name} » appliqué !`), '⚡');
  }

  function renderShortcutsBody() {
    const host = $('shortcutsBody');
    if (!host) return;
    const rows = [
      ['Ctrl + Z / Y', t('Undo / Redo CAD or Image change', 'Annuler / Rétablir modification CAD')],
      ['L', t('Toggle Optical LED Backlight ON / OFF', 'Allumer / Éteindre la LED Rétro-Éclairée')],
      ['W', t('Toggle 3D Wireframe Overlay', 'Afficher / Masquer le Filaire 3D')],
      ['1 / 2 / 3 / 4', t('Camera: 3/4, Front, Side, Top', 'Caméra : 3/4, Face, Profil, Dessus')],
      ['Escape', t('Close active dialog', 'Fermer la fenêtre active')]
    ];
    host.innerHTML = rows.map(([k, d]) =>
      `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">
        <kbd style="background:var(--surface2);border:1px solid var(--border-strong);padding:3px 8px;border-radius:6px;font-weight:700;color:#93c5fd">${k}</kbd>
        <span style="color:var(--muted)">${d}</span>
      </div>`
    ).join('');
  }

  function wireEvents() {
    $('back-btn').onclick = () => Gate.closeStudio();
    $('langToggle').onclick = () => setLang(currentLang === 'fr' ? 'en' : 'fr');
    $('btnSaveProject').onclick = saveProjectSP3D;
    $('btnUndo').onclick = undo;
    $('btnRedo').onclick = redo;
    $('btnPreflight').onclick = openPreflightModal;
    $('btnCostCalc').onclick = () => { refreshQuote(); openModal('costModal'); };
    $('btnShortcuts').onclick = () => openModal('shortcutsModal');
    $('pay-premium-btn').onclick = () => Gate.requestUpgrade();

    // File open + Drag-Drop
    const fi = $('fileInput');
    const openPicker = () => { fi.value = ''; fi.click(); };
    $('btnOpenPhoto').onclick = openPicker;
    $('btnHeroUpload').onclick = (e) => { e.stopPropagation(); openPicker(); };
    $('welcomeCard').onclick = (e) => {
      if (e.target.closest('.demo-btn') || e.target.closest('#btnHeroUpload')) return;
      openPicker();
    };
    fi.onchange = (e) => { if (e.target.files && e.target.files[0]) loadUserFile(e.target.files[0]); };

    document.querySelectorAll('.demo-btn').forEach((btn) => {
      btn.onclick = (e) => { e.stopPropagation(); loadDemo(btn.dataset.demo); };
    });

    const dropOv = $('globalDropOverlay');
    let dc = 0;
    window.addEventListener('dragenter', (e) => { e.preventDefault(); dc++; dropOv.classList.add('show'); });
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('dragleave', () => { dc = Math.max(0, dc - 1); if (!dc) dropOv.classList.remove('show'); });
    window.addEventListener('drop', (e) => {
      e.preventDefault(); dc = 0; dropOv.classList.remove('show');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) loadUserFile(e.dataTransfer.files[0]);
    });

    // Sidebar Tabs & Mobile Bar
    document.querySelectorAll('.side-tab').forEach((btn) => {
      btn.onclick = () => {
        document.querySelectorAll('.side-tab').forEach((b) => b.classList.toggle('active', b === btn));
        document.querySelectorAll('.side-pane').forEach((p) => p.classList.toggle('active', p.id === 'pane-' + btn.dataset.sideTab));
      };
    });
    document.querySelectorAll('.mobile-tab').forEach((btn) => {
      btn.onclick = () => {
        document.querySelectorAll('.mobile-tab').forEach((b) => b.classList.toggle('active', b === btn));
        document.body.setAttribute('data-mobile-pane', btn.dataset.mobileTarget);
        if (btn.dataset.mobileTarget === 'viewport' && state.viewport) state.viewport.resize();
      };
    });

    // Image Transform & Filter Controls
    $('btnRotate90').onclick = () => { pushHistory(); state.img.rotateSteps = (state.img.rotateSteps + 1) % 4; rebuildImageAndMesh(false); };
    $('btnFlipH').onclick = () => { pushHistory(); state.img.flipH = !state.img.flipH; rebuildImageAndMesh(false); };
    $('cropModeSelect').onchange = (e) => { pushHistory(); state.img.cropMode = e.target.value; rebuildImageAndMesh(false); };
    $('btnResetFilters').onclick = () => { pushHistory(); state.img = Object.assign({}, DEFAULT_IMG); syncControlsFromState(); rebuildImageAndMesh(false); };
    $('invertChk').onchange = (e) => { pushHistory(); state.img.invert = e.target.checked; rebuildImageAndMesh(false); };

    const bindImgSlider = (id, key, scale, fmt, valId) => {
      const el = $(id);
      el.addEventListener('pointerdown', pushHistory);
      el.addEventListener('input', () => {
        const v = parseFloat(el.value);
        state.img[key] = scale ? (v / scale) : v;
        if (valId) $(valId).textContent = fmt(v);
        scheduleRebuild(true);
      });
    };
    bindImgSlider('sharpenSlider', 'sharpen', 0, (v) => String(v), 'sharpenVal');
    bindImgSlider('contrastSlider', 'contrast', 0, (v) => `${v > 0 ? '+' : ''}${v}%`, 'contrastVal');
    bindImgSlider('brightnessSlider', 'brightness', 0, (v) => `${v > 0 ? '+' : ''}${v}%`, 'brightnessVal');
    bindImgSlider('gammaSlider', 'gamma', 100, (v) => (v / 100).toFixed(2), 'gammaVal');
    bindImgSlider('noiseSlider', 'noiseReduction', 0, (v) => String(v), 'noiseVal');
    bindImgSlider('blurSlider', 'blur', 0, (v) => `${v}px`, 'blurVal');

    // Studio Presets & 9 CAD Shapes
    document.querySelectorAll('.preset-btn').forEach((btn) => { btn.onclick = () => applyStudioPreset(btn.dataset.preset); });
    document.querySelectorAll('.shape-btn').forEach((btn) => {
      btn.onclick = () => {
        pushHistory();
        state.cad.shape = btn.dataset.shape;
        syncControlsFromState();
        if (state.hasImage) rebuildMeshOnly(true);
      };
    });

    // CAD Geometry Controls
    $('cadModeSelect').onchange = (e) => {
      pushHistory();
      state.cad.mode = e.target.value;
      if (state.cad.mode === 'lithophane') {
        state.cad.minThickMm = 0.8; state.cad.maxThickMm = 3.2;
        setViewportState({ ledOn: true });
      } else {
        state.cad.minThickMm = 2.0; state.cad.maxThickMm = 6.0;
        setViewportState({ ledOn: false });
      }
      syncControlsFromState();
      if (state.hasImage) rebuildMeshOnly(false);
    };

    const bindCadRange = (id, key, valId, suffix) => {
      const el = $(id);
      el.addEventListener('pointerdown', pushHistory);
      el.addEventListener('input', () => {
        state.cad[key] = parseFloat(el.value);
        $(valId).textContent = el.value + suffix;
        scheduleRebuild(false);
      });
    };
    bindCadRange('widthSlider', 'widthMm', 'widthVal', ' mm');
    bindCadRange('curveAngleSlider', 'curveAngleDeg', 'curveAngleVal', '°');
    bindCadRange('socketSlider', 'socketDiaMm', 'socketVal', ' mm');

    ['minThickInput', 'maxThickInput', 'frameWidthInput', 'frameHeightInput'].forEach((id) => {
      $(id).onchange = () => {
        pushHistory();
        state.cad.minThickMm = parseFloat($('minThickInput').value) || 0.8;
        state.cad.maxThickMm = Math.max(state.cad.minThickMm + 0.4, parseFloat($('maxThickInput').value) || 3.2);
        state.cad.frameWidthMm = Math.max(0, parseFloat($('frameWidthInput').value) || 0);
        state.cad.frameHeightMm = Math.max(state.cad.maxThickMm, parseFloat($('frameHeightInput').value) || 4.0);
        syncControlsFromState();
        if (state.hasImage) rebuildMeshOnly(false);
      };
    });

    $('builtInStandChk').onchange = (e) => { pushHistory(); state.cad.builtInStand = e.target.checked; if (state.hasImage) rebuildMeshOnly(false); };
    $('keychainHoleChk').onchange = (e) => { pushHistory(); state.cad.keychainHole = e.target.checked; if (state.hasImage) rebuildMeshOnly(false); };
    $('btnApplyText').onclick = () => {
      pushHistory();
      state.cad.frameText = $('frameTextInput').value.trim();
      state.cad.frameTextMode = $('frameTextMode').value;
      if (state.cad.frameText && state.cad.shape !== 'flat') {
        state.cad.shape = 'flat';
        syncControlsFromState();
      }
      if (state.hasImage) rebuildMeshOnly(false);
      toast(state.cad.frameText
        ? t(`3D Text "${state.cad.frameText}" sculpted onto frame!`, `Texte 3D « ${state.cad.frameText} » sculpté sur la bordure !`)
        : t('Frame text cleared', 'Texte de bordure effacé'), '✍️');
    };

    // Light & Material Controls (Fast material swap — zero geometry rebuild!)
    $('btnLedToggle').onclick = () => setViewportState({ ledOn: !(state.viewport && state.viewport.state.ledOn) });
    $('ledOnChk').onchange = (e) => setViewportState({ ledOn: e.target.checked });
    $('btnColorBacklit').onclick = () => {
      const next = !(state.viewport && state.viewport.state.colorBacklit);
      setViewportState({ colorBacklit: next, ledOn: next ? true : (state.viewport ? state.viewport.state.ledOn : true) });
    };
    $('colorBacklitChk').onchange = (e) => setViewportState({ colorBacklit: e.target.checked, ledOn: e.target.checked ? true : $('ledOnChk').checked });
    $('btnWireToggle').onclick = () => setViewportState({ wireframe: !(state.viewport && state.viewport.state.wireframe) });
    $('ledTempSelect').onchange = (e) => setViewportState({ ledKelvin: e.target.value === 'amber' ? 'amber' : parseInt(e.target.value, 10) });
    $('ledIntSlider').oninput = (e) => { $('ledIntVal').textContent = e.target.value + '%'; setViewportState({ ledIntensity: parseInt(e.target.value, 10) / 100 }); };
    $('lightAzSlider').oninput = (e) => { $('lightAzVal').textContent = e.target.value + '°'; if (state.viewport) state.viewport.setState({ lightAzimuth: parseFloat(e.target.value) }, false); };
    document.querySelectorAll('.mat-swatch').forEach((btn) => {
      btn.onclick = () => setViewportState({ material: btn.dataset.mat, ledOn: false });
    });

    // Camera Presets & Auto-Rotate
    document.querySelectorAll('.cam-btn').forEach((btn) => {
      btn.onclick = () => { if (state.viewport) state.viewport.setCameraPreset(btn.dataset.cam); };
    });
    $('btnAutoRotate').onclick = function () {
      if (!state.viewport) return;
      state.viewport.autoRotate = !state.viewport.autoRotate;
      this.classList.toggle('btn-primary', state.viewport.autoRotate);
    };

    // Cross-Section Caliper Slice Row
    $('caliperRowSlider').oninput = (e) => {
      $('caliperRowVal').textContent = e.target.value + '%';
      drawCrossSectionCaliper();
    };

    // Quote inputs
    ['qFilament', 'qLedKit', 'qHourly', 'qMarkup'].forEach((id) => {
      $(id).addEventListener('input', refreshQuote);
    });

    // Modals close
    document.querySelectorAll('[data-close-modal]').forEach((btn) => { btn.onclick = () => closeModal(btn.dataset.closeModal); });
    document.querySelectorAll('.modal-backdrop').forEach((bd) => { bd.onclick = (e) => { if (e.target === bd) bd.classList.remove('open'); }; });

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closeAllModals(); return; }
      if (e.target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
      else if (e.key.toLowerCase() === 'l') $('btnLedToggle').click();
      else if (e.key.toLowerCase() === 'w') $('btnWireToggle').click();
      else if (e.key === '1' && state.viewport) state.viewport.setCameraPreset('iso');
      else if (e.key === '2' && state.viewport) state.viewport.setCameraPreset('front');
      else if (e.key === '3' && state.viewport) state.viewport.setCameraPreset('side');
      else if (e.key === '4' && state.viewport) state.viewport.setCameraPreset('top');
      else if (e.key === '?') openModal('shortcutsModal');
    });

    window.addEventListener('storage', (e) => {
      if (e.key === 'sp_lang' && (e.newValue === 'en' || e.newValue === 'fr')) setLang(e.newValue);
    });
    window.addEventListener('resize', () => drawCrossSectionCaliper());
  }

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  syncControlsFromState();
  wireExports();
  wireEvents();
  setLang(detectInitialLang());
}());
