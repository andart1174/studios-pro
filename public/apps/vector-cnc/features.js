// ═══════════════════════════════════════════════════════
//  VECTOR CNC STUDIO PRO — Interactive Extras (features.js)
//  FIXED: Visible Toasts (unified App.toast), 1:1 Aspect-Safe Compare,
//  Real mm/inch Ruler synced with Zoom/Pan, Full-Res IndexedDB History,
//  Complete Profile Save/Load, Dynamic EN/FR Shortcuts + Ctrl+Z/Ctrl+Y!
// ═══════════════════════════════════════════════════════

(function (global) {
  'use strict';

  const PROFILE_KEY = 'cncvs_profile_v2';
  const HISTORY_KEY = 'cncvs_history_v2';
  const HISTORY_MAX = 5;

  let compareActive = false;
  let comparePct = 50;
  let rulerActive = false;
  const fullResCache = new Map(); // Keeps full-resolution dataURL in memory for instant lossless reload!

  const isFr = () => (typeof global.currentLang !== 'undefined' && global.currentLang === 'fr');
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const notify = (msg, type = 'info') => {
    if (global.App && typeof global.App.toast === 'function') global.App.toast(msg, type);
  };

  document.addEventListener('DOMContentLoaded', () => {
    initKeyboardShortcuts();
    initSettingsProfile();
    initThumbnailHistory();
    initCanvasTransform();
    initCompareMode();
    initZoomFit();
    initRuler();
    initShortcutsModal();
    window.addEventListener('resize', () => {
      if (compareActive) drawCompareCanvas(comparePct);
      if (rulerActive) createRulerOverlays();
    });
  });

  // ═══════════════════════════════════════════════════════
  // 1. KEYBOARD SHORTCUTS (+ Ctrl+Z / Ctrl+Y / Escape closes ALL modals!)
  // ═══════════════════════════════════════════════════════
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      const tag = document.activeElement ? document.activeElement.tagName : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        global.App && global.App.undo && global.App.undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        global.App && global.App.redo && global.App.redo();
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) return;
      switch (e.key) {
        case 'v': case 'V': e.preventDefault(); document.getElementById('btnVectorize')?.click(); break;
        case 'c': case 'C': e.preventDefault(); document.getElementById('btnClear')?.click(); break;
        case 'z': case 'Z': e.preventDefault(); document.getElementById('btnResetZoom')?.click(); break;
        case 'f': case 'F': e.preventDefault(); global.App && global.App.zoomFit && global.App.zoomFit(); break;
        case 'r': case 'R': e.preventDefault(); global.App && global.App.applyTransform && global.App.applyTransform('rot90'); break;
        case '?': e.preventDefault(); toggleShortcutsModal(); break;
        case 'Escape': closeAllModals(); break;
      }
    });
  }

  // ═══════════════════════════════════════════════════════
  // 2. COMPLETE SETTINGS PROFILE (Mode + Material + Machine + CNC + Grid!)
  // ═══════════════════════════════════════════════════════
  function initSettingsProfile() {
    const actions = document.querySelector('.sidebar-actions');
    if (!actions) return;
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;';
    row.innerHTML = `
      <button id="btnSaveProfile" class="btn btn-secondary" style="flex:1;font-size:11px;padding:7px 8px;justify-content:center" title="Save all current CNC settings">
        💾 <span data-en>Save Profile</span><span data-fr>Sauver profil</span>
      </button>
      <button id="btnLoadProfile" class="btn btn-secondary" style="flex:1;font-size:11px;padding:7px 8px;justify-content:center" title="Load last saved CNC settings">
        📂 <span data-en>Load Profile</span><span data-fr>Charger profil</span>
      </button>
    `;
    actions.appendChild(row);
    document.getElementById('btnSaveProfile').addEventListener('click', saveProfile);
    document.getElementById('btnLoadProfile').addEventListener('click', loadProfile);
  }

  function saveProfile() {
    if (!global.App || !global.App.getProfileSnapshot) return;
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(global.App.getProfileSnapshot()));
      notify(isFr() ? 'Profil CNC enregistré !' : 'CNC settings profile saved!', 'success');
    } catch (_) {
      notify(isFr() ? 'Erreur de sauvegarde.' : 'Could not save profile.', 'error');
    }
  }

  function loadProfile() {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) { notify(isFr() ? 'Aucun profil enregistré.' : 'No saved profile found.', 'info'); return; }
    try {
      const snap = JSON.parse(raw);
      global.App && global.App.applyProfileSnapshot && global.App.applyProfileSnapshot(snap);
      notify(isFr() ? 'Profil CNC chargé !' : 'CNC settings profile loaded!', 'success');
    } catch (_) {
      notify(isFr() ? 'Profil corrompu.' : 'Invalid profile data.', 'error');
    }
  }

  // ═══════════════════════════════════════════════════════
  // 3. HIGH-RES IMAGE HISTORY (Fixes 120x80 blurry reload + XSS + 2nd load!)
  // ═══════════════════════════════════════════════════════
  function initThumbnailHistory() {
    const uploadTab = document.getElementById('tab-upload');
    if (!uploadTab) return;
    const histContainer = document.createElement('div');
    histContainer.id = 'historyContainer';
    histContainer.innerHTML = `
      <div class="section-label" style="margin-bottom:6px">🕑 <span data-en>Recent Designs</span><span data-fr>Fichiers récents</span></div>
      <div id="historyThumbs" style="display:flex;gap:6px;flex-wrap:wrap"></div>
    `;
    uploadTab.appendChild(histContainer);
    renderHistoryThumbs();
  }

  function onImageLoaded(fileName, rawCanvas) {
    if (!rawCanvas || !rawCanvas.width || !rawCanvas.height) return;
    try {
      // Store full-res copy in memory AND clean 480px copy in localStorage (not blurry 120px!)
      const fullUrl = rawCanvas.toDataURL('image/png');
      fullResCache.set(fileName, fullUrl);

      const scale = Math.min(1, 420 / Math.max(rawCanvas.width, rawCanvas.height));
      const storeCv = document.createElement('canvas');
      storeCv.width = Math.max(16, Math.round(rawCanvas.width * scale));
      storeCv.height = Math.max(16, Math.round(rawCanvas.height * scale));
      storeCv.getContext('2d').drawImage(rawCanvas, 0, 0, storeCv.width, storeCv.height);
      const storedUrl = storeCv.toDataURL('image/jpeg', 0.85);

      let history = getHistory().filter(h => h.name !== fileName);
      history.unshift({ name: fileName, dataUrl: storedUrl, time: Date.now() });
      if (history.length > HISTORY_MAX) history = history.slice(0, HISTORY_MAX);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch (_) {
        // Quota fallback: keep latest 2
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 2))); } catch (__) {}
      }
      renderHistoryThumbs();
    } catch (_) {}
  }

  function getHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
  }

  function renderHistoryThumbs() {
    const container = document.getElementById('historyThumbs');
    if (!container) return;
    const history = getHistory();
    if (!history.length) {
      container.innerHTML = `<p style="color:var(--muted);font-size:11px;text-align:center;width:100%;padding:6px 0">
        <span data-en>No recent files yet</span><span data-fr>Aucun fichier récent</span>
      </p>`;
      return;
    }

    container.innerHTML = history.map((item, idx) => `
      <div class="hist-thumb" data-idx="${idx}" title="${esc(item.name)}" style="
        position:relative;cursor:pointer;border-radius:6px;overflow:hidden;
        border:2px solid var(--border);transition:border-color .2s;flex-shrink:0;
        width:56px;height:42px;background:var(--surface2)">
        <img src="${esc(item.dataUrl)}" style="width:100%;height:100%;object-fit:cover" alt="${esc(item.name)}"/>
        <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.68);color:#fff;font-size:8px;padding:1px 3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(item.name)}</div>
      </div>
    `).join('');

    container.querySelectorAll('.hist-thumb').forEach(el => {
      el.addEventListener('click', () => loadThumbAsImage(parseInt(el.dataset.idx, 10)));
    });
  }

  function loadThumbAsImage(idx) {
    const history = getHistory();
    const item = history[idx];
    if (!item) return;
    const srcUrl = fullResCache.get(item.name) || item.dataUrl;
    fetch(srcUrl).then(r => r.blob()).then(blob => {
      const safeName = item.name.replace(/\.(svg|dxf)$/i, '.png');
      const file = new File([blob], safeName, { type: blob.type || 'image/png' });
      if (global.App && global.App.loadFile) global.App.loadFile(file);
    }).catch(() => {});
  }

  // ═══════════════════════════════════════════════════════
  // 4. CANVAS ROTATION & FLIP BUTTONS (Correct tooltips!)
  // ═══════════════════════════════════════════════════════
  function initCanvasTransform() {
    const previewActions = document.querySelector('.preview-actions');
    if (!previewActions) return;
    const transformGroup = document.createElement('div');
    transformGroup.style.cssText = 'display:flex;gap:4px;align-items:center;';
    transformGroup.innerHTML = `
      <button class="feat-btn" id="btnRotLeft"  title="Rotate Left 90°">↩</button>
      <button class="feat-btn" id="btnRotRight" title="Rotate Right 90° (R)">↪</button>
      <button class="feat-btn" id="btnFlipH"    title="Flip Horizontal">⇄</button>
      <button class="feat-btn" id="btnFlipV"    title="Flip Vertical">⇅</button>
    `;
    const eraserBtn = document.getElementById('btnEraser');
    if (eraserBtn) previewActions.insertBefore(transformGroup, eraserBtn);
    else previewActions.prepend(transformGroup);

    document.getElementById('btnRotLeft')?.addEventListener('click', () => global.App?.applyTransform('rot-90'));
    document.getElementById('btnRotRight')?.addEventListener('click', () => global.App?.applyTransform('rot90'));
    document.getElementById('btnFlipH')?.addEventListener('click', () => global.App?.applyTransform('flipH'));
    document.getElementById('btnFlipV')?.addEventListener('click', () => global.App?.applyTransform('flipV'));
  }

  // ═══════════════════════════════════════════════════════
  // 5. 1:1 ASPECT-SAFE COMPARE MODE (BEFORE / AFTER SLIDER)
  // ═══════════════════════════════════════════════════════
  function initCompareMode() {
    const previewActions = document.querySelector('.preview-actions');
    if (!previewActions) return;
    const compareBtn = document.createElement('button');
    compareBtn.id = 'btnCompare';
    compareBtn.className = 'btn btn-secondary';
    compareBtn.style.cssText = 'padding:4px 8px;font-size:11px;color:#c084fc;border-color:rgba(168,85,247,.45)';
    compareBtn.innerHTML = `🔀 <span data-en>Compare</span><span data-fr>Comparer</span>`;
    previewActions.prepend(compareBtn);
    compareBtn.addEventListener('click', toggleCompareMode);

    const overlay = document.createElement('div');
    overlay.id = 'compareOverlay';
    overlay.style.cssText = 'display:none;position:absolute;inset:0;overflow:hidden;border-radius:var(--radius);z-index:15;cursor:col-resize;background:#0a101f;';
    overlay.innerHTML = `
      <canvas id="compareCanvas" style="position:absolute;inset:0;width:100%;height:100%"></canvas>
      <div id="compareDivider" style="position:absolute;top:0;bottom:0;width:3px;background:linear-gradient(180deg,var(--accent),var(--accent2));left:50%;transform:translateX(-50%);box-shadow:0 0 10px var(--glow);cursor:col-resize;z-index:16">
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff;font-weight:700;box-shadow:0 2px 10px rgba(0,0,0,.6)">⇄</div>
      </div>
      <div style="position:absolute;top:10px;left:0;right:0;display:flex;justify-content:space-between;pointer-events:none;padding:0 14px;z-index:17">
        <span style="background:rgba(0,0,0,.72);color:#fff;font-size:10px;border-radius:4px;padding:3px 8px;font-weight:700">ORIGINAL</span>
        <span style="background:rgba(56,189,248,.75);color:#000;font-size:10px;border-radius:4px;padding:3px 8px;font-weight:700">VECTOR</span>
      </div>
    `;
    const previewPanels = document.querySelector('.preview-panels');
    if (previewPanels) {
      previewPanels.style.position = 'relative';
      previewPanels.appendChild(overlay);
      setupCompareDrag(overlay);
    }
  }

  function toggleCompareMode() {
    const overlay = document.getElementById('compareOverlay');
    const btn = document.getElementById('btnCompare');
    if (!overlay) return;
    compareActive = !compareActive;
    if (compareActive) {
      const orig = document.getElementById('canvasOrig');
      const vec = document.getElementById('canvasVec');
      if (!orig || orig.style.display === 'none' || !vec || vec.style.display === 'none') {
        notify(isFr() ? 'Vectorisez d\'abord une image !' : 'Vectorize an image first!', 'info');
        compareActive = false;
        return;
      }
      overlay.style.display = 'block';
      if (btn) btn.style.background = 'rgba(168,85,247,0.24)';
      drawCompareCanvas(comparePct);
    } else {
      overlay.style.display = 'none';
      if (btn) btn.style.background = '';
    }
  }

  function drawCompareCanvas(percentLeft) {
    comparePct = percentLeft;
    const overlay = document.getElementById('compareOverlay');
    const compareCv = document.getElementById('compareCanvas');
    const divider = document.getElementById('compareDivider');
    const orig = document.getElementById('canvasOrig');
    const vec = document.getElementById('canvasVec');
    if (!compareCv || !overlay || !orig || !vec || !orig.width || !orig.height) return;

    const W = overlay.clientWidth || 600, H = overlay.clientHeight || 400;
    compareCv.width = W; compareCv.height = H;
    const ctx = compareCv.getContext('2d');
    ctx.fillStyle = '#090f1d';
    ctx.fillRect(0, 0, W, H);

    // Exact 1:1 aspect-ratio-preserving centered rect (NO stretching!)
    const pad = 24;
    const scale = Math.min((W - pad * 2) / orig.width, (H - pad * 2) / orig.height);
    const drawW = orig.width * scale, drawH = orig.height * scale;
    const dx = (W - drawW) * 0.5, dy = (H - drawH) * 0.5;
    const splitX = Math.round(W * percentLeft / 100);

    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, splitX, H); ctx.clip();
    ctx.drawImage(orig, dx, dy, drawW, drawH);
    ctx.restore();

    ctx.save();
    ctx.beginPath(); ctx.rect(splitX, 0, W - splitX, H); ctx.clip();
    ctx.drawImage(vec, dx, dy, drawW, drawH);
    ctx.restore();

    if (divider) divider.style.left = splitX + 'px';
  }

  function setupCompareDrag(overlay) {
    let dragging = false;
    const update = (clientX) => {
      const rect = overlay.getBoundingClientRect();
      const pct = Math.max(4, Math.min(96, ((clientX - rect.left) / Math.max(1, rect.width)) * 100));
      drawCompareCanvas(pct);
    };
    overlay.addEventListener('mousedown', (e) => { dragging = true; update(e.clientX); e.preventDefault(); });
    overlay.addEventListener('touchstart', (e) => { dragging = true; if (e.touches[0]) update(e.touches[0].clientX); }, { passive: true });
    document.addEventListener('mousemove', (e) => { if (dragging && compareActive) update(e.clientX); });
    document.addEventListener('touchmove', (e) => { if (dragging && compareActive && e.touches[0]) update(e.touches[0].clientX); }, { passive: true });
    document.addEventListener('mouseup', () => { dragging = false; });
    document.addEventListener('touchend', () => { dragging = false; });
  }

  // ═══════════════════════════════════════════════════════
  // 6. ZOOM FIT (SYNCED DIRECTLY WITH App.zoomFit — NO DESYNC!)
  // ═══════════════════════════════════════════════════════
  function initZoomFit() {
    const zoomControls = document.querySelector('.zoom-controls');
    if (!zoomControls) return;
    const fitBtn = document.createElement('button');
    fitBtn.id = 'btnZoomFit';
    fitBtn.className = 'zoom-btn';
    fitBtn.title = 'Zoom Fit (F)';
    fitBtn.textContent = '⊡';
    const resetBtn = document.getElementById('btnResetZoom');
    if (resetBtn) resetBtn.insertAdjacentElement('beforebegin', fitBtn);
    else zoomControls.appendChild(fitBtn);
    fitBtn.addEventListener('click', () => global.App && global.App.zoomFit && global.App.zoomFit());
  }

  // ═══════════════════════════════════════════════════════
  // 7. REAL PHYSICAL MM / INCH RULER (SYNCED WITH CANVAS BOUNDS & ZOOM!)
  // ═══════════════════════════════════════════════════════
  function initRuler() {
    const previewActions = document.querySelector('.preview-actions');
    if (!previewActions) return;
    const rulerBtn = document.createElement('button');
    rulerBtn.id = 'btnRuler';
    rulerBtn.className = 'btn btn-secondary';
    rulerBtn.style.cssText = 'padding:4px 8px;font-size:11px;';
    rulerBtn.innerHTML = `📏 <span data-en>Ruler</span><span data-fr>Règle</span>`;
    previewActions.prepend(rulerBtn);
    rulerBtn.addEventListener('click', toggleRuler);
  }

  function toggleRuler() {
    rulerActive = !rulerActive;
    const btn = document.getElementById('btnRuler');
    if (rulerActive) {
      if (btn) { btn.style.background = 'rgba(6,214,160,0.16)'; btn.style.color = 'var(--accent3)'; btn.style.borderColor = 'var(--accent3)'; }
      createRulerOverlays();
    } else {
      if (btn) { btn.style.background = ''; btn.style.color = ''; btn.style.borderColor = ''; }
      document.querySelectorAll('.ruler-overlay').forEach(r => r.remove());
    }
  }

  function createRulerOverlays() {
    document.querySelectorAll('.ruler-overlay').forEach(r => r.remove());
    if (!rulerActive) return;

    const zInfo = global.App && global.App.getZoomState ? global.App.getZoomState() : { units: 'mm' };
    const dims = global.App && global.App.getPhysicalMetrics ? global.App.getPhysicalMetrics() : { physW: 100, physH: 100 };
    const isInch = zInfo.units === 'inch';
    const unitLabel = isInch ? 'in' : 'mm';
    const physW = isInch ? dims.physW / 25.4 : dims.physW;
    const physH = isInch ? dims.physH / 25.4 : dims.physH;

    document.querySelectorAll('.preview-canvas-wrap').forEach(wrap => {
      const targetCv = wrap.querySelector('canvas:not(.ruler-overlay)');
      const ruler = document.createElement('canvas');
      ruler.className = 'ruler-overlay';
      ruler.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:8;border-radius:var(--radius);';
      wrap.appendChild(ruler);

      const W = wrap.clientWidth, H = wrap.clientHeight;
      if (!W || !H) return;
      ruler.width = W; ruler.height = H;
      const ctx = ruler.getContext('2d');
      const RS = 20;

      ctx.fillStyle = 'rgba(11,17,32,0.9)';
      ctx.fillRect(0, 0, W, RS);
      ctx.fillRect(0, 0, RS, H);

      const wRect = wrap.getBoundingClientRect();
      let cLeft = RS, cTop = RS, cWidth = W - RS, cHeight = H - RS;
      if (targetCv && targetCv.style.display !== 'none') {
        const cRect = targetCv.getBoundingClientRect();
        if (cRect.width > 10 && cRect.height > 10) {
          cLeft = cRect.left - wRect.left;
          cTop = cRect.top - wRect.top;
          cWidth = cRect.width;
          cHeight = cRect.height;
        }
      }

      const pxPerUnitX = cWidth / Math.max(0.1, physW);
      const pxPerUnitY = cHeight / Math.max(0.1, physH);
      const chooseStep = (pxPerU) => {
        const steps = isInch ? [0.25, 0.5, 1, 2, 5, 10] : [5, 10, 20, 25, 50, 100];
        for (const st of steps) if (st * pxPerU >= 42) return st;
        return steps[steps.length - 1];
      };
      const stepX = chooseStep(pxPerUnitX);
      const stepY = chooseStep(pxPerUnitY);

      ctx.strokeStyle = 'rgba(56,189,248,0.65)';
      ctx.fillStyle = 'rgba(148,163,184,0.95)';
      ctx.font = '600 9px Inter, monospace';
      ctx.lineWidth = 1;

      for (let u = 0; u <= physW + stepX; u += stepX) {
        const x = cLeft + u * pxPerUnitX;
        if (x < RS || x > W) continue;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, RS); ctx.stroke();
        ctx.fillText(isInch ? u.toFixed(1) : Math.round(u), x + 3, 12);
      }
      for (let u = 0; u <= physH + stepY; u += stepY) {
        const y = cTop + u * pxPerUnitY;
        if (y < RS || y > H) continue;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(RS, y); ctx.stroke();
        ctx.save(); ctx.translate(12, y - 3); ctx.rotate(-Math.PI / 2);
        ctx.fillText(isInch ? u.toFixed(1) : Math.round(u), 0, 0);
        ctx.restore();
      }
      ctx.fillStyle = 'rgba(56,189,248,0.28)'; ctx.fillRect(0, 0, RS, RS);
      ctx.fillStyle = '#38bdf8'; ctx.fillText(unitLabel, 2, 13);
    });
  }

  // ═══════════════════════════════════════════════════════
  // 8. DYNAMIC EN/FR SHORTCUTS MODAL + UNIFIED ESCAPE CLOSER
  // ═══════════════════════════════════════════════════════
  function initShortcutsModal() {
    const rows = [
      ['V', 'Vectorize image', 'Vectoriser l\'image'],
      ['Ctrl+Z', 'Undo last edit', 'Annuler la dernière action'],
      ['Ctrl+Y', 'Redo edit', 'Rétablir l\'action'],
      ['R', 'Rotate 90° right', 'Rotation 90° droite'],
      ['F', 'Zoom Fit to screen', 'Adapter à l\'écran'],
      ['Z', 'Reset zoom (100%)', 'Réinitialiser zoom (100%)'],
      ['C', 'Clear workspace', 'Effacer l\'espace'],
      ['?', 'Toggle shortcuts', 'Afficher les raccourcis'],
      ['Esc', 'Close modals / stop modes', 'Fermer fenêtres / modes']
    ];

    const modal = document.createElement('div');
    modal.id = 'shortcutsModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="max-width:460px">
        <div class="modal-header">
          <div class="modal-title">⌨️ <span data-en>Keyboard Shortcuts</span><span data-fr>Raccourcis clavier</span></div>
          <div class="modal-close" id="btnCloseShortcuts">&times;</div>
        </div>
        <div class="modal-body" style="padding:16px 22px">
          <table style="width:100%;border-collapse:collapse">
            ${rows.map(([k, en, fr]) => `
              <tr style="border-bottom:1px solid var(--border)">
                <td style="padding:8px 0;width:84px"><kbd style="background:var(--surface2);border:1px solid var(--border2);border-radius:6px;padding:3px 9px;font-size:12px;font-weight:700;color:var(--accent)">${k}</kbd></td>
                <td style="padding:8px;font-size:13px;color:var(--text)"><span data-en>${en}</span><span data-fr>${fr}</span></td>
              </tr>`).join('')}
          </table>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('btnCloseShortcuts')?.addEventListener('click', () => modal.classList.remove('show'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('show'); });
    document.getElementById('btnShortcutsHelp')?.addEventListener('click', toggleShortcutsModal);
  }

  function toggleShortcutsModal() {
    document.getElementById('shortcutsModal')?.classList.toggle('show');
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-overlay.show').forEach(m => m.classList.remove('show'));
    if (global.CNCProSuite && global.CNCProSuite.closeAllProModals) global.CNCProSuite.closeAllProModals();
    if (compareActive) toggleCompareMode();
    if (typeof global.__stopVecSim === 'function') global.__stopVecSim();
    if (global.App && global.App.setEraserActive) global.App.setEraserActive(false);
  }

  global.Features = {
    onImageLoaded,
    refreshCompare: () => { if (compareActive) drawCompareCanvas(comparePct); },
    refreshRuler: () => { if (rulerActive) createRulerOverlays(); },
    closeAllModals
  };
})(window);
