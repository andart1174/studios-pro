// ═══════════════════════════════════════════════════════
//  CNC VECTOR STUDIO — Extra Features (features.js)
//  All functions are NEW — no existing functions modified
// ═══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    initKeyboardShortcuts();
    initSettingsProfile();
    initThumbnailHistory();
    initCanvasTransform();
    initCompareMode();
    initZoomFit();
    initRuler();
    initShortcutsModal();
});

// ═══════════════════════════════════════════════════════
// 1. KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════════
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Disable shortcuts when typing in an input
        const tag = document.activeElement.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        switch (e.key) {
            case 'v': case 'V':
                if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    document.getElementById('btnVectorize')?.click();
                }
                break;
            case 'c': case 'C':
                if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    document.getElementById('btnClear')?.click();
                }
                break;
            case 's': case 'S':
                if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    document.getElementById('btnExportSVG')?.click();
                }
                break;
            case 'z': case 'Z':
                if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    document.getElementById('btnResetZoom')?.click();
                }
                break;
            case 'f': case 'F':
                if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    doZoomFit();
                }
                break;
            case '?': case '/':
                e.preventDefault();
                toggleShortcutsModal();
                break;
            case 'r': case 'R':
                if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    rotateTransformCanvas('canvasVec', 90);
                    rotateTransformCanvas('canvasOrig', 90);
                }
                break;
            case 'Escape':
                closeAllModals();
                break;
        }
    });
}

// ═══════════════════════════════════════════════════════
// 2. SETTINGS PROFILE (Save / Load with localStorage)
// ═══════════════════════════════════════════════════════
const PROFILE_KEY = 'cncvs_profile';

function initSettingsProfile() {
    // Buttons are injected in sidebar-actions
    const actions = document.querySelector('.sidebar-actions');
    if (!actions) return;

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;margin-top:6px;';
    row.innerHTML = `
    <button id="btnSaveProfile" class="btn btn-secondary" style="flex:1;font-size:11px;" title="Save all current settings (localStorage)">
      💾 <span data-en>Save profile</span><span data-fr>Sauver profil</span>
    </button>
    <button id="btnLoadProfile" class="btn btn-secondary" style="flex:1;font-size:11px;" title="Reload last saved profile">
      📂 <span data-en>Load profile</span><span data-fr>Charger profil</span>
    </button>
  `;
    actions.appendChild(row);

    document.getElementById('btnSaveProfile').addEventListener('click', saveProfile);
    document.getElementById('btnLoadProfile').addEventListener('click', loadProfile);
}

function saveProfile() {
    const profile = {};
    // Collect all inputs with range/checkbox/select from sidebar
    document.querySelectorAll('.sidebar input[type=range], .sidebar input[type=checkbox], .sidebar select').forEach(el => {
        if (el.id) {
            profile[el.id] = el.type === 'checkbox' ? el.checked : el.value;
        }
    });
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    showFeatureToast(currentLang === 'fr' ? '✅ Profil sauvé!' : '✅ Profile saved!', 'success');
}

function loadProfile() {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) { showFeatureToast(currentLang === 'fr' ? '⚠️ Aucun profil sauvé.' : '⚠️ No profile saved.', 'info'); return; }

    try {
        const profile = JSON.parse(raw);
        Object.entries(profile).forEach(([id, val]) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (el.type === 'checkbox') {
                el.checked = val === true || val === 'true';
            } else {
                el.value = val;
            }
            // Declanșăm evenimentul ca să se actualizeze UI-ul (etichete, state js etc)
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        });
        showFeatureToast(currentLang === 'fr' ? '📂 Profil chargé!' : '📂 Profile loaded!', 'success');
    } catch (e) {
        showFeatureToast(currentLang === 'fr' ? '❌ Erreur de chargement.' : '❌ Loading error.', 'error');
    }
}

// ═══════════════════════════════════════════════════════
// 3. THUMBNAIL HISTORY (ultimele 5 imagini)
// ═══════════════════════════════════════════════════════
const HISTORY_KEY = 'cncvs_history';
const HISTORY_MAX = 5;

function initThumbnailHistory() {
    // Thumbnail container — added in tab-upload
    const uploadTab = document.getElementById('tab-upload');
    if (!uploadTab) return;

    const histContainer = document.createElement('div');
    histContainer.id = 'historyContainer';
    histContainer.innerHTML = `
    <div class="section-label" style="margin-bottom:8px;">🕑 <span data-en>Image History</span><span data-fr>Historique</span></div>
    <div id="historyThumbs" style="display:flex;gap:6px;flex-wrap:wrap;"></div>
  `;
    uploadTab.appendChild(histContainer);

    renderHistoryThumbs();

    // Listen for image load via MutationObserver on fileInfo
    const fileInfo = document.getElementById('fileInfo');
    if (fileInfo) {
        const obs = new MutationObserver(() => {
            if (fileInfo.style.display !== 'none') {
                // Image loaded — capture thumbnail from canvasOrig
                setTimeout(() => captureAndSaveThumb(), 300);
            }
        });
        obs.observe(fileInfo, { attributes: true, attributeFilter: ['style'] });
    }
}

function captureAndSaveThumb() {
    const canvas = document.getElementById('canvasOrig');
    const fileName = document.getElementById('fileName')?.textContent || 'image';
    if (!canvas || canvas.style.display === 'none') return;

    try {
        // Create small thumb (120x80)
        const thumbCv = document.createElement('canvas');
        const ratio = canvas.height / canvas.width;
        thumbCv.width = 120; thumbCv.height = Math.round(120 * ratio);
        thumbCv.getContext('2d').drawImage(canvas, 0, 0, thumbCv.width, thumbCv.height);
        const dataUrl = thumbCv.toDataURL('image/jpeg', 0.7);

        let history = getHistory();
        // Avoid duplicates (same file)
        history = history.filter(h => h.name !== fileName);
        history.unshift({ name: fileName, dataUrl, time: Date.now() });
        if (history.length > HISTORY_MAX) history = history.slice(0, HISTORY_MAX);

        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        renderHistoryThumbs();
    } catch (e) { /* canvas cross-origin or error */ }
}

function getHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}

function renderHistoryThumbs() {
    const container = document.getElementById('historyThumbs');
    if (!container) return;

    const history = getHistory();
    if (!history.length) {
        container.innerHTML = `<p style="color:var(--muted);font-size:11px;text-align:center;width:100%;padding:8px 0;">
            <span data-en>No images in history</span><span data-fr>Aucune image</span>
        </p>`;
        return;
    }

    container.innerHTML = history.map((item, idx) => `
    <div class="hist-thumb" data-idx="${idx}" title="${item.name}" style="
      position:relative; cursor:pointer; border-radius:6px; overflow:hidden;
      border:2px solid var(--border); transition:border-color .2s; flex-shrink:0;
      width:60px; height:44px; background:var(--surface2);">
      <img src="${item.dataUrl}" style="width:100%;height:100%;object-fit:cover;" alt="${item.name}"/>
      <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.6);color:#fff;font-size:8px;padding:2px 3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.name}</div>
    </div>
  `).join('');

    container.querySelectorAll('.hist-thumb').forEach(el => {
        el.addEventListener('mouseenter', () => el.style.borderColor = 'var(--accent)');
        el.addEventListener('mouseleave', () => el.style.borderColor = 'var(--border)');
        el.addEventListener('click', () => loadThumbAsImage(parseInt(el.dataset.idx)));
    });
}

function loadThumbAsImage(idx) {
    const history = getHistory();
    if (!history[idx]) return;
    const { dataUrl, name } = history[idx];

    // Convert dataURL -> Blob -> File -> Fake FileList
    fetch(dataUrl).then(r => r.blob()).then(blob => {
        const file = new File([blob], name, { type: blob.type });
        // Inject in fileInput and trigger change
        const dt = new DataTransfer();
        dt.items.add(file);
        const input = document.getElementById('fileInput');
        if (input) {
            input.files = dt.files;
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });
}

// ═══════════════════════════════════════════════════════
// 4. CANVAS ROTATION & FLIP
// ═══════════════════════════════════════════════════════
function initCanvasTransform() {
    // Add transform buttons to preview-header
    const previewActions = document.querySelector('.preview-actions');
    if (!previewActions) return;

    const transformGroup = document.createElement('div');
    transformGroup.style.cssText = 'display:flex;gap:4px;align-items:center;';
    transformGroup.innerHTML = `
    <span style="font-size:10px;color:var(--muted);margin-right:4px;letter-spacing:.5px;font-weight:600;">TRANSF:</span>
    <button class="feat-btn" id="btnRotLeft"  title="Rotate Left 90° (R)">↩</button>
    <button class="feat-btn" id="btnRotRight" title="Rotate Right 90°">↪</button>
    <button class="feat-btn" id="btnFlipH"    title="Flip Horizontal">⇄</button>
    <button class="feat-btn" id="btnFlipV"    title="Flip Vertical">⇅</button>
  `;
    // Inserăm înaintea butonului de eraser
    const eraserBtn = document.getElementById('btnEraser');
    if (eraserBtn) {
        previewActions.insertBefore(transformGroup, eraserBtn);
    } else {
        previewActions.prepend(transformGroup);
    }

    document.getElementById('btnRotLeft').addEventListener('click', () => {
        rotateTransformCanvas('canvasVec', -90);
        rotateTransformCanvas('canvasOrig', -90);
    });
    document.getElementById('btnRotRight').addEventListener('click', () => {
        rotateTransformCanvas('canvasVec', 90);
        rotateTransformCanvas('canvasOrig', 90);
    });
    document.getElementById('btnFlipH').addEventListener('click', () => {
        flipTransformCanvas('canvasVec', 'H');
        flipTransformCanvas('canvasOrig', 'H');
    });
    document.getElementById('btnFlipV').addEventListener('click', () => {
        flipTransformCanvas('canvasVec', 'V');
        flipTransformCanvas('canvasOrig', 'V');
    });
}

function rotateTransformCanvas(canvasId, deg) {
    const cv = document.getElementById(canvasId);
    if (!cv || cv.style.display === 'none') return;

    const w = cv.width, h = cv.height;
    const tmp = document.createElement('canvas');
    // Swap dimensions for 90°/270°
    tmp.width = Math.abs(deg) === 90 ? h : w;
    tmp.height = Math.abs(deg) === 90 ? w : h;

    const ctx = tmp.getContext('2d');
    ctx.translate(tmp.width / 2, tmp.height / 2);
    ctx.rotate((deg * Math.PI) / 180);
    ctx.drawImage(cv, -w / 2, -h / 2);

    cv.width = tmp.width;
    cv.height = tmp.height;
    cv.getContext('2d').drawImage(tmp, 0, 0);
}

function flipTransformCanvas(canvasId, axis) {
    const cv = document.getElementById(canvasId);
    if (!cv || cv.style.display === 'none') return;

    const tmp = document.createElement('canvas');
    tmp.width = cv.width; tmp.height = cv.height;
    const ctx = tmp.getContext('2d');

    if (axis === 'H') {
        ctx.translate(tmp.width, 0);
        ctx.scale(-1, 1);
    } else {
        ctx.translate(0, tmp.height);
        ctx.scale(1, -1);
    }
    ctx.drawImage(cv, 0, 0);

    const origCtx = cv.getContext('2d');
    origCtx.clearRect(0, 0, cv.width, cv.height);
    origCtx.drawImage(tmp, 0, 0);
}

// ═══════════════════════════════════════════════════════
// 5. COMPARE MODE (slider before/after)
// ═══════════════════════════════════════════════════════
let compareActive = false;

function initCompareMode() {
    // Butonul Compare în preview-actions
    const previewActions = document.querySelector('.preview-actions');
    if (!previewActions) return;

    const compareBtn = document.createElement('button');
    compareBtn.id = 'btnCompare';
    compareBtn.className = 'btn btn-secondary pro-feature';
    compareBtn.style.cssText = 'padding:4px 8px;font-size:12px;color:#a855f7;border-color:#a855f7;';
    compareBtn.title = 'Compare original with vectors (slider)';
    compareBtn.textContent = '🔀 Compare';
    previewActions.prepend(compareBtn);

    compareBtn.addEventListener('click', toggleCompareMode);

    // Overlay-ul de comparare
    const overlay = document.createElement('div');
    overlay.id = 'compareOverlay';
    overlay.style.cssText = `
    display:none; position:absolute; inset:0; overflow:hidden;
    border-radius:var(--radius); z-index:10; cursor:col-resize;
  `;
    overlay.innerHTML = `
    <canvas id="compareCanvas" style="position:absolute;inset:0;width:100%;height:100%;"></canvas>
    <div id="compareDivider" style="
      position:absolute; top:0; bottom:0; width:3px;
      background:linear-gradient(180deg,var(--accent),var(--accent2));
      left:50%; transform:translateX(-50%);
      box-shadow:0 0 8px var(--glow);
      cursor:col-resize; z-index:11;
    ">
      <div style="
        position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
        width:28px; height:28px; border-radius:50%;
        background:linear-gradient(135deg,var(--accent),var(--accent2));
        display:flex;align-items:center;justify-content:center;
        font-size:12px; box-shadow:0 2px 8px rgba(0,0,0,.5);
        color:#fff; font-weight:700; user-select:none;
      ">⇄</div>
    </div>
    <div id="compareLabel" style="
      position:absolute; top:10px; left:0; right:0;
      display:flex; justify-content:space-between; pointer-events:none;
      padding:0 14px;
    ">
      <span style="background:rgba(0,0,0,.6);color:#fff;font-size:10px;border-radius:4px;padding:2px 8px;font-weight:600;">ORIGINAL</span>
      <span style="background:rgba(79,142,255,.5);color:#fff;font-size:10px;border-radius:4px;padding:2px 8px;font-weight:600;">VECTOR</span>
    </div>
  `;

    // Adăugăm overlay-ul peste preview-panels
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
        // Check for both canvases
        const orig = document.getElementById('canvasOrig');
        const vec = document.getElementById('canvasVec');
        if (!orig || orig.style.display === 'none' || !vec || vec.style.display === 'none') {
            showFeatureToast(currentLang === 'fr' ? '⚠️ Vectorisez d\'abord!' : '⚠️ Vectorize image first!', 'info');
            compareActive = false;
            return;
        }
        overlay.style.display = 'block';
        btn.style.background = 'rgba(168,85,247,0.2)';
        btn.textContent = '⏹ Compare';
        drawCompareCanvas(50);
    } else {
        overlay.style.display = 'none';
        btn.style.background = '';
        btn.textContent = '🔀 Compare';
    }
}

function drawCompareCanvas(percentLeft) {
    const overlay = document.getElementById('compareOverlay');
    const compareCv = document.getElementById('compareCanvas');
    const divider = document.getElementById('compareDivider');
    if (!compareCv || !overlay) return;

    const orig = document.getElementById('canvasOrig');
    const vec = document.getElementById('canvasVec');
    if (!orig || !vec) return;

    const W = overlay.offsetWidth;
    const H = overlay.offsetHeight;
    compareCv.width = W; compareCv.height = H;
    const ctx = compareCv.getContext('2d');

    const splitX = Math.round(W * percentLeft / 100);

    // Stânga: imaginea originală
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, splitX, H); ctx.clip();
    ctx.drawImage(orig, 0, 0, W, H);
    ctx.restore();

    // Dreapta: vectorul
    ctx.save();
    ctx.beginPath(); ctx.rect(splitX, 0, W - splitX, H); ctx.clip();
    ctx.drawImage(vec, 0, 0, W, H);
    ctx.restore();

    // Update split line
    if (divider) divider.style.left = splitX + 'px';
}

function setupCompareDrag(overlay) {
    let dragging = false;
    let currentPct = 50;

    overlay.addEventListener('mousedown', (e) => { dragging = true; e.preventDefault(); });
    overlay.addEventListener('touchstart', (e) => { dragging = true; }, { passive: true });

    document.addEventListener('mousemove', (e) => {
        if (!dragging || !compareActive) return;
        const rect = overlay.getBoundingClientRect();
        currentPct = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
        drawCompareCanvas(currentPct);
    });

    document.addEventListener('touchmove', (e) => {
        if (!dragging || !compareActive) return;
        const rect = overlay.getBoundingClientRect();
        const touch = e.touches[0];
        currentPct = Math.max(5, Math.min(95, ((touch.clientX - rect.left) / rect.width) * 100));
        drawCompareCanvas(currentPct);
    }, { passive: true });

    document.addEventListener('mouseup', () => { dragging = false; });
    document.addEventListener('touchend', () => { dragging = false; });
}

// ═══════════════════════════════════════════════════════
// 6. ZOOM FIT
// ═══════════════════════════════════════════════════════
function initZoomFit() {
    const zoomControls = document.querySelector('.zoom-controls');
    if (!zoomControls) return;

    const fitBtn = document.createElement('button');
    fitBtn.id = 'btnZoomFit';
    fitBtn.className = 'zoom-btn';
    fitBtn.title = 'Zoom Fit — potrivește la ecran (F)';
    fitBtn.textContent = '⊡';
    fitBtn.style.cssText = 'font-size:14px;';

    // Insert after the + button in zoom-controls
    const resetBtn = document.getElementById('btnResetZoom');
    if (resetBtn) resetBtn.insertAdjacentElement('beforebegin', fitBtn);
    else zoomControls.appendChild(fitBtn);

    fitBtn.addEventListener('click', doZoomFit);
}

function doZoomFit() {
    const canvas = document.getElementById('canvasVec');
    const wrap = canvas?.closest('.preview-canvas-wrap');
    if (!canvas || !wrap || canvas.style.display === 'none') {
        // Use canvasOrig if vecPanel is not visible
        const orig = document.getElementById('canvasOrig');
        const origWrap = orig?.closest('.preview-canvas-wrap');
        if (!orig || !origWrap) return;
        const scaleX = origWrap.clientWidth / orig.width;
        const scaleY = origWrap.clientHeight / orig.height;
        const fit = Math.min(scaleX, scaleY, 1) * 0.9;
        // Simulate click on zoomIn/Out or reset directly
        document.getElementById('btnResetZoom')?.click();
        return;
    }

    const wrapW = wrap.clientWidth - 32;
    const wrapH = wrap.clientHeight - 32;
    const scaleX = wrapW / canvas.width;
    const scaleY = wrapH / canvas.height;
    const fit = Math.max(0.2, Math.min(scaleX, scaleY, 2));

    // Apply zoom fit (same style as in app.js)
    ['canvasOrig', 'canvasVec'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.transform = `scale(${fit})`;
            el.style.transformOrigin = 'top left';
        }
    });
    const zv = document.getElementById('zoomVal');
    if (zv) zv.textContent = Math.round(fit * 100) + '%';

    showFeatureToast(`⊡ Zoom Fit: ${Math.round(fit * 100)}%`, 'info');
}

// ═══════════════════════════════════════════════════════
// 7. RULER (Toggle)
// ═══════════════════════════════════════════════════════
let rulerActive = false;

function initRuler() {
    const previewActions = document.querySelector('.preview-actions');
    if (!previewActions) return;

    const rulerBtn = document.createElement('button');
    rulerBtn.id = 'btnRuler';
    rulerBtn.className = 'btn btn-secondary';
    rulerBtn.style.cssText = 'padding:4px 8px;font-size:12px;';
    rulerBtn.title = 'Toggle Ruler';
    rulerBtn.innerHTML = `📏 <span data-en>Ruler</span><span data-fr>Règle</span>`;
    previewActions.prepend(rulerBtn);

    rulerBtn.addEventListener('click', toggleRuler);
}

function toggleRuler() {
    rulerActive = !rulerActive;
    const btn = document.getElementById('btnRuler');

    if (rulerActive) {
        btn.style.background = 'rgba(6,214,160,0.15)';
        btn.style.color = 'var(--accent3)';
        btn.style.borderColor = 'var(--accent3)';
        createRulerOverlays();
    } else {
        btn.style.background = '';
        btn.style.color = '';
        btn.style.borderColor = '';
        document.querySelectorAll('.ruler-overlay').forEach(r => r.remove());
    }
}

function createRulerOverlays() {
    document.querySelectorAll('.ruler-overlay').forEach(r => r.remove());

    document.querySelectorAll('.preview-canvas-wrap').forEach(wrap => {
        const ruler = document.createElement('canvas');
        ruler.className = 'ruler-overlay';
        ruler.style.cssText = `
      position:absolute; top:0; left:0; width:100%; height:100%;
      pointer-events:none; z-index:5; border-radius:var(--radius);
    `;
        wrap.style.position = 'relative';
        wrap.appendChild(ruler);

        // Draw ruler
        const W = wrap.clientWidth;
        const H = wrap.clientHeight;
        ruler.width = W; ruler.height = H;
        const ctx = ruler.getContext('2d');
        const RULER_SIZE = 20;

        // Ruler BG
        ctx.fillStyle = 'rgba(14,21,37,0.85)';
        ctx.fillRect(0, 0, W, RULER_SIZE); // top
        ctx.fillRect(0, 0, RULER_SIZE, H); // left

        ctx.strokeStyle = 'rgba(99,160,255,0.6)';
        ctx.fillStyle = 'rgba(99,160,255,0.8)';
        ctx.font = '8px Inter, sans-serif';
        ctx.lineWidth = 0.5;

        // Horizontal Ruler (Top)
        const stepPx = 50;
        for (let x = RULER_SIZE; x < W; x += stepPx) {
            const label = Math.round(x - RULER_SIZE);
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, x % 100 === 0 ? RULER_SIZE : RULER_SIZE * 0.4);
            ctx.stroke();
            if (x % 100 === 0) ctx.fillText(label + 'px', x + 2, 10);
        }

        // Vertical Ruler (Left)
        for (let y = RULER_SIZE; y < H; y += stepPx) {
            const label = Math.round(y - RULER_SIZE);
            ctx.save();
            ctx.translate(0, y);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(y % 100 === 0 ? RULER_SIZE : RULER_SIZE * 0.4, 0);
            ctx.stroke();
            if (y % 100 === 0) {
                ctx.rotate(-Math.PI / 2);
                ctx.fillText(label + 'px', -label.toString().length * 5, 8);
                ctx.rotate(Math.PI / 2);
            }
            ctx.restore();
        }

        // Top-left corner
        ctx.fillStyle = 'rgba(79,142,255,0.3)';
        ctx.fillRect(0, 0, RULER_SIZE, RULER_SIZE);
        ctx.fillStyle = 'rgba(99,160,255,0.9)';
        ctx.font = '9px Inter, sans-serif';
        ctx.fillText('px', 4, 13);
    });
}

// ═══════════════════════════════════════════════════════
// 8. MODAL SHORTCUTS (tasta ?)
// ═══════════════════════════════════════════════════════
function initShortcutsModal() {
    const modal = document.createElement('div');
    modal.id = 'shortcutsModal';
    modal.style.cssText = `
    display:none; position:fixed; inset:0; z-index:1000;
    background:rgba(7,11,20,0.85); backdrop-filter:blur(8px);
    align-items:center; justify-content:center;
  `;
    modal.innerHTML = `
    <div style="
      background:var(--surface); border:1px solid var(--border2);
      border-radius:var(--radius); padding:28px; max-width:480px; width:90%;
      box-shadow:0 20px 60px rgba(0,0,0,0.6); position:relative;
    ">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <div style="font-family:'Space Grotesk',sans-serif;font-size:18px;font-weight:700;
          background:linear-gradient(90deg,#e2e8f0,var(--accent));
          -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;">
          ⌨️ <span data-en>Shortcuts</span><span data-fr>Raccourcis</span>
        </div>
        <button onclick="document.getElementById('shortcutsModal').style.display='none'"
          style="background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer;
          width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;">×</button>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        ${[
            ['V', currentLang === 'fr' ? 'Vectoriser l\'image' : 'Vectorize image'],
            ['C', currentLang === 'fr' ? 'Effacer tout' : 'Clear workspace'],
            ['S', currentLang === 'fr' ? 'Export SVG rapide' : 'Quick SVG export'],
            ['Z', 'Reset zoom (100%)'],
            ['F', currentLang === 'fr' ? 'Adapter à l\'écran' : 'Zoom Fit to screen'],
            ['R', currentLang === 'fr' ? 'Rotation 90° droite' : 'Rotate 90° right'],
            ['?', currentLang === 'fr' ? 'Afficher cette fenêtre' : 'Show this window'],
            ['Esc', currentLang === 'fr' ? 'Fermer les fenêtres' : 'Close windows / modes'],
        ].map(([key, desc]) => `
          <tr style="border-bottom:1px solid var(--border);">
            <td style="padding:10px 0;width:60px;">
              <kbd style="
                background:var(--surface2); border:1px solid var(--border2);
                border-radius:6px; padding:3px 10px; font-size:13px;
                font-family:'Space Grotesk',sans-serif; font-weight:700;
                color:var(--accent); box-shadow:0 2px 0 var(--border2);
              ">${key}</kbd>
            </td>
            <td style="padding:10px 8px;font-size:13px;color:var(--text);">${desc}</td>
          </tr>
        `).join('')}
      </table>
      <p style="margin-top:16px;font-size:11px;color:var(--muted);text-align:center;">
        <span data-en>Shortcuts don't work when typing in an input field</span>
        <span data-fr>Les raccourcis ne fonctionnent pas dans les champs de texte</span>
      </p>
    </div>
  `;
    document.body.appendChild(modal);

    // Buton ? în header
    const headerBadges = document.querySelector('.header-badges');
    if (headerBadges) {
        const shortcutBadge = document.createElement('button');
        shortcutBadge.className = 'badge';
        shortcutBadge.style.cssText = `
      cursor:pointer; background:rgba(79,142,255,.12);
      border:1px solid rgba(79,142,255,.25); color:var(--accent);
      font-weight:700; font-size:13px; padding:4px 10px;
    `;
        shortcutBadge.title = 'Shortcuts (?)';
        shortcutBadge.textContent = '?';
        shortcutBadge.addEventListener('click', toggleShortcutsModal);
        headerBadges.prepend(shortcutBadge);
    }
}

function toggleShortcutsModal() {
    const modal = document.getElementById('shortcutsModal');
    if (!modal) return;
    const visible = modal.style.display === 'flex';
    modal.style.display = visible ? 'none' : 'flex';
}

function closeAllModals() {
    const modal = document.getElementById('shortcutsModal');
    if (modal) modal.style.display = 'none';
    // Deactivate compare mode if active
    if (compareActive) {
        compareActive = false;
        const overlay = document.getElementById('compareOverlay');
        if (overlay) overlay.style.display = 'none';
        const btn = document.getElementById('btnCompare');
        if (btn) { btn.style.background = ''; btn.textContent = '🔀 Compare'; }
    }
}

// ═══════════════════════════════════════════════════════
// UTILS: Feature Toast
// ═══════════════════════════════════════════════════════
function showFeatureToast(msg, type = 'info') {
    // Reuse existing toast container if possible
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
        document.body.appendChild(container);
    }

    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.style.cssText = `
    padding:10px 16px; border-radius:10px; font-size:13px; font-weight:500;
    background:var(--surface2); border:1px solid var(--border2);
    color:var(--text); box-shadow:0 4px 16px rgba(0,0,0,.4);
    transform:translateX(120%); transition:transform .3s ease;
    max-width:280px;
  `;
    const colors = { success: 'var(--accent3)', error: 'var(--danger)', info: 'var(--accent)' };
    el.style.borderLeftColor = colors[type] || 'var(--accent)';
    el.style.borderLeftWidth = '3px';
    el.textContent = msg;

    container.appendChild(el);
    requestAnimationFrame(() => el.style.transform = 'translateX(0)');
    setTimeout(() => {
        el.style.transform = 'translateX(120%)';
        setTimeout(() => el.remove(), 350);
    }, 3000);
}
