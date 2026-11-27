/**
 * ArtGen Studio (v5.0) — Atelier Application Controller & Host Integration
 * Zero false paywall intercepts, full PointerEvent + Stabilizer + Space Pan + Zoom,
 * Multi-Layer compositing, 45 Styles + DNA Fusion + Magic Prompt, True SVG Logo,
 * Real 3D Relief + AR Bridge, SHA-256 Certif + NFT + Custom Sign + WYSIWYG Frame!
 */
const Core = window.ArtCore;
const Styles = window.ArtStyles;
const Brushes = window.ArtBrushes;
const Stamps = window.ArtStampsLogo;

const $ = id => document.getElementById(id);

const S = {
  lang: 'en',
  tool: 'brush',
  pc: '#8b5cf6',
  sc: '#38bdf8',
  size: 22,
  opacity: 0.90,
  hardness: 0.75,
  stabilizer: 0.25,
  symMode: 'k8',
  symCxRatio: 0.5,
  symCyRatio: 0.5,
  matMode: 'normal',
  stampStyle: 'silk',
  glowMode: false,
  wetMode: false,
  showGrid: false,
  showSymGuide: true,
  palette: Core.DEFAULT_PALETTE.slice(),
  harmonyIdx: 0,

  // Generative DNA state
  primaryStyle: 'abstract',
  secondaryStyle: 'none',
  fusionBlend: 'screen',
  fusionAlpha: 0.48,
  cpx: 4,
  dens: 2,
  cs: 'auto',
  genSym: 'none',
  seedHex: Core.randomSeedHex(),
  seedLocked: false,
  currentDNA: 'AG-ATELIER-READY',

  // Viewport Zoom & Pan (FIXED: Real pan works cleanly at every zoom!)
  zoom: 1.0,
  panX: 0,
  panY: 0,
  spaceHeld: false,

  // Non-destructive Import Overlay (SEPARATE from Grid — zero #gc collision!)
  imp: null, // { canvas, x, y, w, h, rot, scale, alpha, blend, flipH, wandMode }

  // Timelapse
  tlRecording: false,
  tlFrames: [],
  tlPlaying: false,

  userTier: 'free'
};

let Stack = null;
let _mainCv = null, _mainCtx = null, _overCv = null, _overCtx = null;
let _drawing = false, _lastPt = null, _smoothPt = null, _shapeStart = null;
let _panDrag = null, _impDrag = null;
let _pendingExport = null;

function toast(msg) {
  const box = $('toast-box');
  if (!box) return;
  const d = document.createElement('div');
  d.className = 'toast-msg';
  d.textContent = msg;
  box.appendChild(d);
  setTimeout(() => { d.style.opacity = '0'; setTimeout(() => d.remove(), 200); }, 2500);
}

// =========================================================================
// 1. COMPOSITING, VIEWPORT TRANSFORM & OVERLAY GUIDES
// =========================================================================

function updateCanvasFrameLayout() {
  const stage = $('canvas-stage');
  const frame = $('canvas-frame');
  if (!stage || !frame || !Stack) return;
  const sw = Math.max(200, stage.clientWidth - 28);
  const sh = Math.max(200, stage.clientHeight - 28);
  const fit = Math.min(sw / Stack.state.width, sh / Stack.state.height, 1);
  const dispW = Math.round(Stack.state.width * fit);
  const dispH = Math.round(Stack.state.height * fit);
  frame.style.width = dispW + 'px';
  frame.style.height = dispH + 'px';
  frame.style.transform = `translate(${S.panX}px, ${S.panY}px) scale(${S.zoom})`;
  $('zoom-lbl').textContent = Math.round(S.zoom * 100) + '%';
  $('status-dims').textContent = `${Stack.state.width}×${Stack.state.height} · ${Math.round(S.zoom * 100)}% · Space+Drag Pan`;
}

function composite() {
  if (!Stack || !_mainCtx) return;
  Stack.compositeTo(_mainCtx, Brushes.drawPaperTexture);
  renderOverlay();
  renderLayerList();
}

function renderOverlay() {
  if (!_overCtx || !Stack) return;
  const w = Stack.state.width, h = Stack.state.height;
  _overCtx.clearRect(0, 0, w, h);

  // 1. Non-destructive Grid Guide
  if (S.showGrid) {
    _overCtx.save();
    _overCtx.strokeStyle = 'rgba(148,163,184,0.18)';
    _overCtx.lineWidth = 1;
    const step = 40;
    for (let x = step; x < w; x += step) { _overCtx.beginPath(); _overCtx.moveTo(x, 0); _overCtx.lineTo(x, h); _overCtx.stroke(); }
    for (let y = step; y < h; y += step) { _overCtx.beginPath(); _overCtx.moveTo(0, y); _overCtx.lineTo(w, y); _overCtx.stroke(); }
    _overCtx.restore();
  }

  // 2. Living Symmetry / Kaleidoscope Axes Guide
  if (S.showSymGuide && S.symMode !== 'none') {
    const cx = w * S.symCxRatio, cy = h * S.symCyRatio;
    const rad = Math.hypot(w, h);
    _overCtx.save();
    _overCtx.strokeStyle = 'rgba(34,211,238,0.28)';
    _overCtx.lineWidth = 1.2;
    _overCtx.setLineDash([6, 6]);
    if (S.symMode === 'mirrorH' || S.symMode === 'quad') {
      _overCtx.beginPath(); _overCtx.moveTo(cx, 0); _overCtx.lineTo(cx, h); _overCtx.stroke();
    }
    if (S.symMode === 'mirrorV' || S.symMode === 'quad') {
      _overCtx.beginPath(); _overCtx.moveTo(0, cy); _overCtx.lineTo(w, cy); _overCtx.stroke();
    }
    if (S.symMode.startsWith('k')) {
      const folds = parseInt(S.symMode.slice(1), 10) || 8;
      for (let i = 0; i < folds; i++) {
        const a = (i * Math.PI * 2) / folds;
        _overCtx.beginPath(); _overCtx.moveTo(cx, cy); _overCtx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); _overCtx.stroke();
      }
    }
    _overCtx.setLineDash([]);
    _overCtx.fillStyle = '#22d3ee';
    _overCtx.beginPath(); _overCtx.arc(cx, cy, 4.5, 0, Math.PI * 2); _overCtx.fill();
    _overCtx.restore();
  }

  // 3. Active Imported Image / SVG / DXF / Logo Transform Preview (live blend & rotation!)
  if (S.imp) {
    const im = S.imp;
    const dw = im.w * im.scale, dh = im.h * im.scale;
    _overCtx.save();
    _overCtx.translate(im.x, im.y);
    _overCtx.rotate((im.rot * Math.PI) / 180);
    if (im.flipH) _overCtx.scale(-1, 1);
    _overCtx.globalAlpha = im.alpha;
    _overCtx.drawImage(im.canvas, -dw / 2, -dh / 2, dw, dh);
    _overCtx.globalAlpha = 1;
    _overCtx.strokeStyle = '#22d3ee';
    _overCtx.lineWidth = 2;
    _overCtx.setLineDash([6, 4]);
    _overCtx.strokeRect(-dw / 2, -dh / 2, dw, dh);
    _overCtx.restore();
  }

  // 4. Live Shape / Stamp Drag Preview
  if (_shapeStart && _lastPt) {
    Stamps.drawShapeOrStamp(_overCtx, S.tool, _shapeStart.x, _shapeStart.y, _lastPt.x, _lastPt.y, currentBrushOpts());
  }
}

function currentBrushOpts(pressure) {
  return {
    tool: S.tool,
    pc: S.pc,
    sc: S.sc,
    size: S.size,
    opacity: S.opacity,
    hardness: S.hardness,
    matMode: S.matMode,
    stampStyle: S.stampStyle,
    glowMode: S.glowMode,
    wetMode: S.wetMode,
    symMode: S.symMode,
    symCx: Stack.state.width * S.symCxRatio,
    symCy: Stack.state.height * S.symCyRatio,
    lockAlpha: Stack.getActive().lockAlpha,
    pressure: pressure || 1.0
  };
}

function getCanvasCoords(e) {
  const rect = _mainCv.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * Stack.state.width,
    y: ((e.clientY - rect.top) / rect.height) * Stack.state.height
  };
}

function captureTimelapseFrame() {
  if (!S.tlRecording) return;
  if (S.tlFrames.length >= 120) S.tlFrames.shift();
  const c = document.createElement('canvas');
  c.width = 480; c.height = Math.round(480 * (Stack.state.height / Stack.state.width));
  c.getContext('2d').drawImage(_mainCv, 0, 0, c.width, c.height);
  S.tlFrames.push(c.toDataURL('image/jpeg', 0.65));
}

// =========================================================================
// 2. POINTER-EVENT DRAWING, PANNING, IMPORT DRAG & TEXT TOOL
// =========================================================================

function isShapeOrStamp(t) {
  const meta = Core.TOOLS.find(x => x.id === t);
  return meta && (meta.cat === 'shape' || meta.cat === 'stamp');
}

function onPointerDown(e) {
  if (!Stack) return;
  if (e.button === 1 || S.spaceHeld || S.tool === 'hand') {
    _panDrag = { sx: e.clientX, sy: e.clientY, ox: S.panX, oy: S.panY };
    $('canvas-stage').style.cursor = 'grabbing';
    return;
  }
  if (e.button !== 0) return;

  const pt = getCanvasCoords(e);

  // If Import Overlay is active: Magic Wand click OR Drag position!
  if (S.imp) {
    const im = S.imp;
    if (im.wandMode) {
      // Transform click into imported canvas pixel coordinates (handles rotation & flip!)
      const dx = pt.x - im.x, dy = pt.y - im.y;
      const rad = -(im.rot * Math.PI) / 180;
      let lx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
      if (im.flipH) lx = -lx;
      const dw = im.w * im.scale, dh = im.h * im.scale;
      const px = ((lx + dw / 2) / dw) * im.canvas.width;
      const py = ((ly + dh / 2) / dh) * im.canvas.height;
      Stamps.connectedMagicWandCutout(im.canvas, px, py, 38);
      im.wandMode = false;
      $('btn-imp-wand').classList.remove('active');
      renderOverlay();
      toast('🪄 Connected background removed!');
      return;
    }
    _impDrag = { sx: pt.x, sy: pt.y, ox: im.x, oy: im.y };
    return;
  }

  // Alt+Click relocates the live Symmetry / Kaleidoscope center point!
  if (e.altKey && S.symMode !== 'none') {
    S.symCxRatio = Math.max(0.05, Math.min(0.95, pt.x / Stack.state.width));
    S.symCyRatio = Math.max(0.05, Math.min(0.95, pt.y / Stack.state.height));
    renderOverlay();
    return;
  }

  if (S.tool === 'dropper') {
    const p = _mainCtx.getImageData(Math.max(0, Math.min(Stack.state.width - 1, Math.floor(pt.x))), Math.max(0, Math.min(Stack.state.height - 1, Math.floor(pt.y))), 1, 1).data;
    S.pc = Core.rgbToHex(p[0], p[1], p[2]);
    $('inp-pc').value = S.pc;
    toast(`🧪 Picked ${S.pc}`);
    return;
  }

  if (S.tool === 'fill') {
    Stack.captureSnapshot('layer');
    Brushes.smartFloodFill(Stack.getActive().ctx, pt.x, pt.y, S.pc, 28);
    composite();
    captureTimelapseFrame();
    return;
  }

  if (S.tool === 'text') {
    openInlineText(pt, e);
    return;
  }

  if (isShapeOrStamp(S.tool)) {
    _drawing = true;
    _shapeStart = pt;
    _lastPt = pt;
    return;
  }

  // Natural Media / Algorithmic Brush Stroke Start
  _drawing = true;
  Stack.captureSnapshot('layer');
  Brushes.resetStrokeTrail();
  _lastPt = pt;
  _smoothPt = pt;
  const press = e.pointerType === 'pen' && e.pressure > 0 ? e.pressure * 1.25 : 1.0;
  Brushes.drawStrokeSegment(Stack.getActive().ctx, pt.x, pt.y, pt.x + 0.1, pt.y + 0.1, currentBrushOpts(press));
  composite();
}

function onPointerMove(e) {
  if (!Stack) return;
  const pt = getCanvasCoords(e);
  $('status-coords').textContent = `${Math.round(pt.x)}, ${Math.round(pt.y)}`;

  if (_panDrag) {
    S.panX = _panDrag.ox + (e.clientX - _panDrag.sx);
    S.panY = _panDrag.oy + (e.clientY - _panDrag.sy);
    updateCanvasFrameLayout();
    return;
  }

  if (_impDrag && S.imp) {
    S.imp.x = _impDrag.ox + (pt.x - _impDrag.sx);
    S.imp.y = _impDrag.oy + (pt.y - _impDrag.sy);
    renderOverlay();
    return;
  }

  if (!_drawing) return;

  if (_shapeStart) {
    _lastPt = pt;
    renderOverlay();
    return;
  }

  // Lazy-Mouse Stroke Stabilizer (smooth silky curves even with a mouse!)
  const lerp = 1 - S.stabilizer * 0.85;
  const nx = _smoothPt.x + (pt.x - _smoothPt.x) * lerp;
  const ny = _smoothPt.y + (pt.y - _smoothPt.y) * lerp;
  const press = e.pointerType === 'pen' && e.pressure > 0 ? e.pressure * 1.25 : 1.0;

  Brushes.drawStrokeSegment(Stack.getActive().ctx, _smoothPt.x, _smoothPt.y, nx, ny, currentBrushOpts(press));
  _smoothPt = { x: nx, y: ny };
  _lastPt = pt;
  composite();
}

function onPointerUp(e) {
  if (_panDrag) {
    _panDrag = null;
    $('canvas-stage').style.cursor = S.tool === 'hand' ? 'grab' : 'crosshair';
    return;
  }
  if (_impDrag) { _impDrag = null; return; }
  if (!_drawing) return;
  _drawing = false;

  if (_shapeStart && _lastPt) {
    Stack.captureSnapshot('layer');
    Stamps.drawShapeOrStamp(Stack.getActive().ctx, S.tool, _shapeStart.x, _shapeStart.y, _lastPt.x, _lastPt.y, { ...currentBrushOpts(), freeAspect: e.shiftKey });
    _shapeStart = null;
    _lastPt = null;
    composite();
  }
  captureTimelapseFrame();
}

function openInlineText(pt) {
  const inp = $('inline-text-input');
  const frameRect = $('canvas-frame').getBoundingClientRect();
  const px = (pt.x / Stack.state.width) * frameRect.width;
  const py = (pt.y / Stack.state.height) * frameRect.height;
  inp.style.left = Math.max(4, Math.min(frameRect.width - 180, px)) + 'px';
  inp.style.top = Math.max(4, Math.min(frameRect.height - 36, py)) + 'px';
  inp.value = '';
  inp.classList.remove('hidden');
  inp.focus();

  const commit = () => {
    const txt = inp.value.trim();
    inp.classList.add('hidden');
    inp.onkeydown = null;
    inp.onblur = null;
    if (!txt) return;
    Stack.captureSnapshot('layer');
    const ctx = Stack.getActive().ctx;
    ctx.save();
    ctx.fillStyle = S.pc;
    if (S.glowMode) { ctx.shadowColor = S.sc; ctx.shadowBlur = 16; }
    const fs = Math.max(18, Math.round(S.size * 2.2));
    ctx.font = `700 ${fs}px 'Space Grotesk', Inter, sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(txt, pt.x, pt.y);
    ctx.restore();
    composite();
    captureTimelapseFrame();
  };
  inp.onkeydown = ev => { if (ev.key === 'Enter') commit(); else if (ev.key === 'Escape') { inp.value = ''; commit(); } };
  inp.onblur = commit;
}

// =========================================================================
// 3. UI BUILDERS (TOOLS, 45 STYLES, PALETTE, LAYERS, TRANSLATIONS)
// =========================================================================

function buildToolAndStyleGrids() {
  const isFr = S.lang === 'fr';
  const fillGrid = (elId, list) => {
    const el = $(elId);
    if (!el) return;
    el.innerHTML = list.map(t => `
      <button type="button" class="tool-tile ${S.tool === t.id ? 'active' : ''}" data-tool="${t.id}" title="${isFr ? t.fr : t.en}${t.key ? ' (' + t.key + ')' : ''}">
        <span class="ti">${t.icon}</span>
        <span class="tl">${isFr ? t.fr : t.en}</span>
      </button>
    `).join('');
    el.querySelectorAll('.tool-tile').forEach(btn => {
      btn.addEventListener('click', () => selectTool(btn.dataset.tool));
    });
  };

  fillGrid('grid-draw-tools', Core.TOOLS.filter(t => t.cat === 'draw'));
  fillGrid('grid-shape-tools', Core.TOOLS.filter(t => t.cat === 'shape'));
  fillGrid('grid-stamp-tools', Core.TOOLS.filter(t => t.cat === 'stamp'));

  // ALL 45 Generative Styles Grid
  const sg = $('grid-ai-styles');
  if (sg) {
    sg.innerHTML = Core.STYLES.map(st => `
      <button type="button" class="style-tile ${S.primaryStyle === st.id ? 'active' : ''}" data-style="${st.id}" title="${isFr ? st.fr : st.en}">
        <span class="si">${st.icon}</span>
        <span class="sl">${isFr ? st.fr : st.en}</span>
      </button>
    `).join('');
    sg.querySelectorAll('.style-tile').forEach(btn => {
      btn.addEventListener('click', () => {
        S.primaryStyle = btn.dataset.style;
        sg.querySelectorAll('.style-tile').forEach(b => b.classList.toggle('active', b === btn));
      });
    });
  }

  // Secondary Style Fusion Dropdown
  const fsel = $('sel-fusion-style');
  if (fsel) {
    const prev = S.secondaryStyle;
    fsel.innerHTML = `<option value="none">${isFr ? 'Aucune (Style Pur)' : 'None (Pure Style)'}</option>` +
      Core.STYLES.map(st => `<option value="${st.id}">${st.icon} ${isFr ? st.fr : st.en}</option>`).join('');
    fsel.value = prev;
  }

  // Color Schemes Dropdown
  const T = Core.getT(S.lang);
  const csel = $('sel-cs');
  if (csel) {
    const prev = S.cs;
    csel.innerHTML = Object.entries(T.schemes).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
    csel.value = prev;
  }

  // Paper Texture Dropdown
  const psel = $('sel-paper');
  if (psel) {
    const prev = Stack ? Stack.state.paperTexture : 'none';
    psel.innerHTML = Core.PAPER_TEXTURES.map(pt => `<option value="${pt.id}">${isFr ? pt.fr : pt.en}</option>`).join('');
    psel.value = prev;
  }

  // Blend Mode Dropdowns (Layer + Import)
  ['sel-layer-blend', 'sel-imp-blend'].forEach(id => {
    const sel = $(id);
    if (!sel) return;
    sel.innerHTML = Core.BLEND_MODES.map(bm => `<option value="${bm.id}">${isFr ? bm.fr : bm.en}</option>`).join('');
  });

  // Inspire Quick Gallery Cards
  const ig = $('inspire-grid');
  if (ig) {
    ig.innerHTML = Core.INSPIRE_PRESETS.map(pr => `
      <button type="button" class="exp-card" data-inspire="${pr.id}">
        <strong>${pr.icon} ${isFr ? pr.fr : pr.en}</strong>
        <span>${pr.primary} + ${pr.secondary} · DNA #${pr.seed}</span>
      </button>
    `).join('');
    ig.querySelectorAll('[data-inspire]').forEach(btn => {
      btn.addEventListener('click', () => {
        const pr = Core.INSPIRE_PRESETS.find(x => x.id === btn.dataset.inspire);
        if (!pr) return;
        $('modal-inspire').classList.add('hidden');
        S.primaryStyle = pr.primary; S.secondaryStyle = pr.secondary;
        S.cs = pr.cs; S.genSym = pr.sym; S.cpx = pr.cpx; S.dens = pr.dens;
        S.seedHex = pr.seed; S.fusionAlpha = pr.fusionAlpha;
        syncGenerativeControls();
        runGenerate(false);
      });
    });
  }
}

function selectTool(id) {
  S.tool = id;
  document.querySelectorAll('.tool-tile').forEach(b => b.classList.toggle('active', b.dataset.tool === id));
  const meta = Core.TOOLS.find(t => t.id === id);
  $('status-tool').textContent = meta ? (S.lang === 'fr' ? meta.fr : meta.en) : id;
  $('canvas-stage').style.cursor = id === 'hand' ? 'grab' : 'crosshair';
}

function renderPalette() {
  const g = $('palette-grid');
  if (!g) return;
  g.innerHTML = S.palette.map(hex => `<button type="button" class="pal-sw" style="background:${hex}" data-hex="${hex}" title="${hex}"></button>`).join('');
  g.querySelectorAll('.pal-sw').forEach(btn => {
    btn.addEventListener('click', e => {
      const hex = Core.normalizeHex(btn.dataset.hex);
      if (e.shiftKey) { S.sc = hex; $('inp-sc').value = hex; }
      else { S.pc = hex; $('inp-pc').value = hex; }
    });
  });
}

function renderLayerList() {
  const listEl = $('layer-list');
  if (!listEl || !Stack) return;
  const layers = Stack.getLayers();
  const activeIdx = Stack.getActiveIdx();
  const active = Stack.getActive();

  if (active) {
    $('sel-layer-blend').value = active.blendMode || 'source-over';
    $('rng-layer-op').value = Math.round(active.opacity * 100);
    $('val-layer-op').textContent = Math.round(active.opacity * 100) + '%';
    $('btn-layer-lock').classList.toggle('active', !!active.lockAlpha);
  }

  // Render top-most layer first (Photoshop convention!)
  let html = '';
  for (let i = layers.length - 1; i >= 0; i--) {
    const l = layers[i];
    html += `
      <div class="layer-row ${i === activeIdx ? 'active' : ''}" data-lidx="${i}">
        <button type="button" class="tiny-btn" data-vis="${i}" title="Toggle Visibility">${l.visible ? '👁' : '🚫'}</button>
        <span class="layer-name">${l.name}</span>
        <div class="layer-acts">
          <button type="button" class="tiny-btn" data-up="${i}" title="Move Up">↑</button>
          <button type="button" class="tiny-btn" data-dn="${i}" title="Move Down">↓</button>
          <button type="button" class="tiny-btn" data-del="${i}" title="Delete">✕</button>
        </div>
      </div>
    `;
  }
  listEl.innerHTML = html;

  listEl.querySelectorAll('.layer-row').forEach(row => {
    row.addEventListener('click', ev => {
      if (ev.target.closest('button')) return;
      Stack.setActive(parseInt(row.dataset.lidx, 10));
      renderLayerList();
    });
  });
  listEl.querySelectorAll('[data-vis]').forEach(b => b.addEventListener('click', () => {
    const l = layers[parseInt(b.dataset.vis, 10)];
    if (l) { l.visible = !l.visible; composite(); }
  }));
  listEl.querySelectorAll('[data-up]').forEach(b => b.addEventListener('click', () => {
    const idx = parseInt(b.dataset.up, 10);
    if (idx < layers.length - 1) { Stack.captureSnapshot('full'); Stack.moveLayer(idx, idx + 1); composite(); }
  }));
  listEl.querySelectorAll('[data-dn]').forEach(b => b.addEventListener('click', () => {
    const idx = parseInt(b.dataset.dn, 10);
    if (idx > 0) { Stack.captureSnapshot('full'); Stack.moveLayer(idx, idx - 1); composite(); }
  }));
  listEl.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
    if (layers.length <= 1) return toast('Keep at least 1 layer');
    Stack.captureSnapshot('full');
    Stack.deleteLayer(parseInt(b.dataset.del, 10));
    composite();
  }));
}

function applyLanguage(lang) {
  S.lang = lang === 'fr' ? 'fr' : 'en';
  document.documentElement.lang = S.lang;
  const T = Core.getT(S.lang);
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const v = T[el.dataset.i18n];
    if (typeof v === 'string') el.textContent = v;
  });
  $('inp-magic-prompt').placeholder = T.magicPlaceholder;
  document.querySelectorAll('[data-lang]').forEach(b => b.classList.toggle('active', b.dataset.lang === S.lang));
  buildToolAndStyleGrids();
  populateLogoModalSelects();
}

// =========================================================================
// 4. GENERATIVE MASTERPIECE & STYLE DNA FUSION EXECUTION
// =========================================================================

function syncGenerativeControls() {
  $('rng-cpx').value = S.cpx; $('val-cpx').textContent = S.cpx;
  $('rng-dens').value = S.dens; $('val-dens').textContent = S.dens;
  $('sel-cs').value = S.cs;
  $('sel-gen-sym').value = S.genSym;
  $('sel-fusion-style').value = S.secondaryStyle;
  $('sel-fusion-blend').value = S.fusionBlend;
  $('rng-fusion-mix').value = Math.round(S.fusionAlpha * 100);
  $('val-fusion-mix').textContent = Math.round(S.fusionAlpha * 100) + '%';
  $('inp-seed').value = S.seedHex;
  document.querySelectorAll('.style-tile').forEach(b => b.classList.toggle('active', b.dataset.style === S.primaryStyle));
}

function runGenerate(asNewLayer, isVariation) {
  if (!S.seedLocked || isVariation) {
    S.seedHex = Core.randomSeedHex();
    $('inp-seed').value = S.seedHex;
  }

  Stack.captureSnapshot(asNewLayer ? 'full' : 'layer');
  if (asNewLayer) {
    const stMeta = Core.STYLES.find(x => x.id === S.primaryStyle);
    const l = Stack.addLayer((stMeta ? stMeta.en : S.primaryStyle) + ' Layer', { blendMode: 'screen', opacity: 0.85 });
    if (!l) toast('Max 12 layers reached — painting on active layer');
  }

  const target = Stack.getActive();
  const dna = Styles.generateMasterpiece(target.ctx, Stack.state.width, Stack.state.height, {
    primary: S.primaryStyle,
    secondary: S.secondaryStyle,
    fusionBlend: S.fusionBlend,
    fusionAlpha: S.fusionAlpha,
    cpx: S.cpx,
    dens: S.dens,
    cs: S.cs,
    sym: S.genSym,
    seedHex: S.seedHex,
    primaryColor: S.pc,
    overlay: !!asNewLayer
  });

  S.currentDNA = dna;
  $('dna-pill').textContent = dna;
  composite();
  captureTimelapseFrame();
  toast(`✨ Generated ${dna}`);
}

// =========================================================================
// 5. IMPORT ENGINE (IMAGE / SVG / FIXED DXF) & TRUE SVG LOGO STUDIO
// =========================================================================

function placeImportedCanvas(srcCanvas, label) {
  const maxW = Stack.state.width * 0.72, maxH = Stack.state.height * 0.72;
  const sc = Math.min(maxW / srcCanvas.width, maxH / srcCanvas.height, 1);
  S.imp = {
    canvas: srcCanvas,
    x: Stack.state.width / 2,
    y: Stack.state.height / 2,
    w: srcCanvas.width * sc,
    h: srcCanvas.height * sc,
    rot: 0,
    scale: 1,
    alpha: 1,
    blend: 'source-over',
    flipH: false,
    wandMode: false
  };
  $('rng-imp-rot').value = 0;
  $('rng-imp-scale').value = 100;
  $('rng-imp-alpha').value = 100;
  $('sel-imp-blend').value = 'source-over';
  $('imp-bar').classList.remove('hidden');
  renderOverlay();
  toast(`📥 ${label} ready — drag to position or click Stamp Layer`);
}

function handleFileImport(file) {
  if (!file) return;
  const name = file.name.toLowerCase();
  if (name.endsWith('.dxf')) {
    const reader = new FileReader();
    reader.onload = () => {
      const res = Stamps.renderDXFToCanvas(reader.result, S.pc);
      placeImportedCanvas(res.canvas, `DXF (${res.count} entities)`);
    };
    reader.readAsText(file);
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth || 1024;
      c.height = img.naturalHeight || 1024;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      placeImportedCanvas(c, file.name);
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function populateLogoModalSelects() {
  const isFr = S.lang === 'fr';
  const ls = $('logo-style');
  if (ls) {
    const prev = ls.value || 'cyber_shield';
    ls.innerHTML = Stamps.LOGO_STYLES.map(s => `<option value="${s.id}">${isFr ? s.fr : s.en}</option>`).join('');
    ls.value = prev;
  }
  const lp = $('logo-palette');
  if (lp) {
    const prev = lp.value || 'gold_royal';
    lp.innerHTML = Stamps.LOGO_PALETTES.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    lp.value = prev;
  }
}

function getLogoCfg() {
  return {
    brand: $('logo-brand').value,
    tagline: $('logo-tagline').value,
    styleId: $('logo-style').value,
    fontFamily: $('logo-font').value,
    textColor: $('logo-c-text').value,
    emblemColor: $('logo-c-emb').value,
    frameColor: $('logo-c-frm').value,
    bgColor: $('logo-c-bg').value,
    transparent: $('logo-trans').checked,
    showFrame: $('logo-frame').checked
  };
}

function updateLogoPreview() {
  const svg = Stamps.buildLogoSVG(getLogoCfg());
  $('logo-svg-preview').innerHTML = svg;
  return svg;
}

function rasterizeLogoSVG(svgStr, cb) {
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' }));
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 1024;
    c.getContext('2d').drawImage(img, 0, 0, 1024, 1024);
    URL.revokeObjectURL(url);
    cb(c);
  };
  img.src = url;
}

// =========================================================================
// 6. SIGNATURE PAD (FREE!), MUSEUM FRAME PREVIEW & HOST BRIDGE CONTRACTS
// =========================================================================

let _signDrawing = false, _signHasStrokes = false, _signLast = null;
function initSignaturePad() {
  const pad = $('sign-pad');
  const pctx = pad.getContext('2d');
  const pos = e => {
    const r = pad.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * pad.width, y: ((e.clientY - r.top) / r.height) * pad.height };
  };
  pad.addEventListener('pointerdown', e => {
    _signDrawing = true; _signHasStrokes = true; _signLast = pos(e);
    pad.setPointerCapture(e.pointerId);
  });
  pad.addEventListener('pointermove', e => {
    if (!_signDrawing) return;
    const pt = pos(e);
    pctx.strokeStyle = $('sign-color').value;
    pctx.lineWidth = 3.2; pctx.lineCap = 'round';
    pctx.beginPath(); pctx.moveTo(_signLast.x, _signLast.y); pctx.lineTo(pt.x, pt.y); pctx.stroke();
    _signLast = pt;
  });
  pad.addEventListener('pointerup', () => { _signDrawing = false; });
  $('btn-sign-clear').addEventListener('click', () => {
    pctx.clearRect(0, 0, pad.width, pad.height); _signHasStrokes = false;
  });
}

function updateFramePreview() {
  const fc = window.Art3DExport.renderFramedCanvas(_mainCv, {
    style: $('frm-style').value,
    title: $('frm-title').value,
    artist: $('frm-artist').value,
    matPct: parseInt($('frm-mat').value, 10),
    showPlaque: $('frm-plaque').checked
  });
  const pv = $('frame-preview-canvas');
  pv.width = fc.width; pv.height = fc.height;
  pv.getContext('2d').drawImage(fc, 0, 0);
  return fc;
}

function requestExport(kind, fn) {
  const inIframe = window.parent && window.parent !== window;
  if (!inIframe) {
    Promise.resolve(fn()).catch(err => toast('Export error: ' + err.message));
    return;
  }
  _pendingExport = { kind, fn };
  window.parent.postMessage({ type: 'CHECK_EXPORT_LIMIT', studio: 'artgen', format: kind }, '*');
  setTimeout(() => {
    if (_pendingExport && _pendingExport.fn === fn) {
      const cb = _pendingExport.fn; _pendingExport = null;
      Promise.resolve(cb()).catch(err => toast('Export error: ' + err.message));
    }
  }, 650);
}

window.addEventListener('message', ev => {
    if (ev.origin !== window.location.origin) return;
  const d = ev.data;
  if (!d || typeof d !== 'object') return;
  if (d.type === 'SET_LANG' && d.lang) applyLanguage(d.lang);
  if (d.type === 'USER_TIER_STATUS' && d.tier) S.userTier = d.tier;
  if (d.type === 'EXPORT_ALLOWED' && _pendingExport) {
    const cb = _pendingExport.fn; _pendingExport = null;
    Promise.resolve(cb()).catch(err => toast('Export error: ' + err.message));
  }
  if (d.type === 'SHOW_PAYWALL_MODAL' || d.type === 'EXPORT_BLOCKED') _pendingExport = null;
});

window.getAppState = () => ({
  format: 'studios-pro-artgen-v5',
  dna: S.currentDNA,
  primaryStyle: S.primaryStyle,
  secondaryStyle: S.secondaryStyle,
  seedHex: S.seedHex,
  cpx: S.cpx,
  dens: S.dens,
  cs: S.cs,
  genSym: S.genSym,
  width: Stack ? Stack.state.width : 1280,
  height: Stack ? Stack.state.height : 720
});

window.getAppTags = () => ['artgen-studio', 'generative-art', S.primaryStyle, S.secondaryStyle !== 'none' ? S.secondaryStyle : 'fine-art'];

// =========================================================================
// 7. EVENT WIRING & INITIALIZATION
// =========================================================================

function bindEvents() {
  // Native Back to Studios-Pro
  $('btn-back-studios').addEventListener('click', () => {
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'CLOSE_STUDIO' }, '*');
    else window.history.back();
  });

  // Canvas Pointer Events (SINGLE clean registration — ZERO double-mousemove bug!)
  const stage = $('canvas-stage');
  stage.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  stage.addEventListener('wheel', e => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    S.zoom = Math.max(0.25, Math.min(4.0, S.zoom * factor));
    updateCanvasFrameLayout();
  }, { passive: false });
  window.addEventListener('resize', updateCanvasFrameLayout);

  // Resolution, Undo/Redo, Clear, Zoom
  $('sel-canvas-size').addEventListener('change', e => {
    const [w, h] = e.target.value.split('x').map(Number);
    Stack.resize(w, h);
    _mainCv.width = w; _mainCv.height = h;
    _overCv.width = w; _overCv.height = h;
    S.zoom = 1; S.panX = 0; S.panY = 0;
    updateCanvasFrameLayout();
    composite();
  });
  $('btn-undo').addEventListener('click', () => { if (Stack.undo()) composite(); });
  $('btn-redo').addEventListener('click', () => { if (Stack.redo()) composite(); });
  $('btn-clear').addEventListener('click', () => {
    Stack.captureSnapshot('layer');
    Stack.getActive().ctx.clearRect(0, 0, Stack.state.width, Stack.state.height);
    composite();
  });
  $('btn-zoom-in').addEventListener('click', () => { S.zoom = Math.min(4, S.zoom * 1.2); updateCanvasFrameLayout(); });
  $('btn-zoom-out').addEventListener('click', () => { S.zoom = Math.max(0.25, S.zoom / 1.2); updateCanvasFrameLayout(); });
  $('btn-zoom-fit').addEventListener('click', () => { S.zoom = 1; S.panX = 0; S.panY = 0; updateCanvasFrameLayout(); });

  // Brush Sliders & Symmetry & Material Modes (FIXED Impasto highlight!)
  $('rng-size').addEventListener('input', e => { S.size = +e.target.value; $('val-size').textContent = S.size; });
  $('rng-opacity').addEventListener('input', e => { S.opacity = +e.target.value / 100; $('val-opacity').textContent = e.target.value + '%'; });
  $('rng-hard').addEventListener('input', e => { S.hardness = +e.target.value / 100; $('val-hard').textContent = e.target.value + '%'; });
  $('rng-stab').addEventListener('input', e => { S.stabilizer = +e.target.value / 100; $('val-stab').textContent = e.target.value + '%'; });
  $('sel-sym').addEventListener('change', e => { S.symMode = e.target.value; renderOverlay(); });
  $('sel-stamp-finish').addEventListener('change', e => { S.stampStyle = e.target.value; });

  $('mat-modes').querySelectorAll('[data-mat]').forEach(btn => {
    btn.addEventListener('click', () => {
      S.matMode = btn.dataset.mat;
      $('mat-modes').querySelectorAll('[data-mat]').forEach(b => b.classList.toggle('active', b === btn));
    });
  });
  $('btn-glow-mode').addEventListener('click', () => { S.glowMode = !S.glowMode; $('btn-glow-mode').classList.toggle('active', S.glowMode); });
  $('btn-wet-mode').addEventListener('click', () => { S.wetMode = !S.wetMode; $('btn-wet-mode').classList.toggle('active', S.wetMode); });
  $('btn-grid-toggle').addEventListener('click', () => { S.showGrid = !S.showGrid; $('btn-grid-toggle').classList.toggle('active', S.showGrid); renderOverlay(); });
  $('btn-sym-guide').addEventListener('click', () => { S.showSymGuide = !S.showSymGuide; $('btn-sym-guide').classList.toggle('active', S.showSymGuide); renderOverlay(); });

  // Colors, K-Means Extract, Harmony Generator & Backgrounds (Undoable!)
  $('inp-pc').addEventListener('input', e => { S.pc = Core.normalizeHex(e.target.value); });
  $('inp-sc').addEventListener('input', e => { S.sc = Core.normalizeHex(e.target.value); });
  $('btn-swap-colors').addEventListener('click', () => { const tmp = S.pc; S.pc = S.sc; S.sc = tmp; $('inp-pc').value = S.pc; $('inp-sc').value = S.sc; });
  $('btn-extract-pal').addEventListener('click', () => {
    const px = _mainCtx.getImageData(0, 0, Stack.state.width, Stack.state.height).data;
    S.palette = Core.extractPaletteFromPixels(px, Stack.state.width, Stack.state.height, 8).concat(Core.DEFAULT_PALETTE.slice(0, 16));
    renderPalette();
    toast('🎨 Dominant palette extracted via K-Means!');
  });
  $('btn-harmony-pal').addEventListener('click', () => {
    const modes = ['complementary', 'analogous', 'triadic', 'split', 'luxury', 'cyber', 'earth'];
    const mode = modes[(S.harmonyIdx++) % modes.length];
    S.palette = Core.generateColorHarmony(S.pc, mode).concat(Core.DEFAULT_PALETTE.slice(8, 24));
    renderPalette();
    toast(`🎨 Color Harmony: ${mode}`);
  });
  $('btn-reset-pal').addEventListener('click', () => { S.palette = Core.DEFAULT_PALETTE.slice(); renderPalette(); });

  $('bg-modes').querySelectorAll('[data-bg]').forEach(btn => {
    btn.addEventListener('click', () => {
      Stack.captureSnapshot('full');
      Stack.state.bgMode = btn.dataset.bg;
      $('bg-modes').querySelectorAll('.bg-swatch').forEach(b => b.classList.toggle('active', b === btn));
      composite();
    });
  });
  $('inp-bg-custom').addEventListener('input', e => {
    Stack.state.bgMode = 'custom';
    Stack.state.bgColor = Core.normalizeHex(e.target.value);
    composite();
  });
  $('sel-paper').addEventListener('change', e => {
    Stack.state.paperTexture = e.target.value;
    composite();
  });

  // Layers Controls
  $('btn-add-layer').addEventListener('click', () => {
    Stack.captureSnapshot('full');
    if (!Stack.addLayer()) toast('Maximum 12 layers reached');
    composite();
  });
  $('btn-dup-layer').addEventListener('click', () => {
    Stack.captureSnapshot('full');
    Stack.duplicateLayer(Stack.getActiveIdx());
    composite();
  });
  $('btn-flat-layer').addEventListener('click', () => {
    Stack.captureSnapshot('full');
    Stack.flattenAll();
    composite();
    toast('Layers flattened');
  });
  $('sel-layer-blend').addEventListener('change', e => { Stack.getActive().blendMode = e.target.value; composite(); });
  $('rng-layer-op').addEventListener('input', e => {
    Stack.getActive().opacity = +e.target.value / 100;
    $('val-layer-op').textContent = e.target.value + '%';
    composite();
  });
  $('btn-layer-lock').addEventListener('click', () => {
    const l = Stack.getActive();
    l.lockAlpha = !l.lockAlpha;
    $('btn-layer-lock').classList.toggle('active', l.lockAlpha);
  });

  // FX & Filters (100% Free — ZERO false paywall!)
  $('fx-btns').querySelectorAll('[data-fx]').forEach(btn => {
    btn.addEventListener('click', () => {
      Stack.captureSnapshot('layer');
      Brushes.applyFilter(Stack.getActive().ctx, btn.dataset.fx);
      composite();
      captureTimelapseFrame();
      toast(`Applied ${btn.textContent.trim()}`);
    });
  });

  // Timelapse & Save/Load .spart
  $('btn-tl-rec').addEventListener('click', () => {
    S.tlRecording = !S.tlRecording;
    $('btn-tl-rec').classList.toggle('active', S.tlRecording);
    if (S.tlRecording) { S.tlFrames = []; captureTimelapseFrame(); toast('⏺ Timelapse recording started'); }
    else toast(`⏹ Captured ${S.tlFrames.length} frames`);
  });
  $('btn-tl-play').addEventListener('click', () => {
    if (!S.tlFrames.length) return toast('Record some strokes first!');
    let idx = 0;
    const iv = setInterval(() => {
      if (idx >= S.tlFrames.length) { clearInterval(iv); composite(); return; }
      const img = new Image();
      img.onload = () => _mainCtx.drawImage(img, 0, 0, Stack.state.width, Stack.state.height);
      img.src = S.tlFrames[idx++];
    }, 110);
  });
  $('btn-save-proj').addEventListener('click', () => {
    window.Art3DExport.saveProjectSPART(Stack, { dna: S.currentDNA, primaryStyle: S.primaryStyle, secondaryStyle: S.secondaryStyle, seedHex: S.seedHex });
    toast('💾 Project saved (.spart)');
  });
  $('btn-load-proj').addEventListener('click', () => $('inp-load-proj').click());
  $('inp-load-proj').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const d = JSON.parse(rd.result);
        if (d.format !== 'studios-pro-artgen-v5' || !Array.isArray(d.layers)) throw new Error('Invalid');
        Stack = Core.createLayerStack(d.width || 1280, d.height || 720, d.bgMode || 'dark', d.bgColor);
        Stack.state.paperTexture = d.paperTexture || 'none';
        _mainCv.width = Stack.state.width; _mainCv.height = Stack.state.height;
        _overCv.width = Stack.state.width; _overCv.height = Stack.state.height;
        Stack.getLayers().length = 0;
        let pending = d.layers.length;
        d.layers.forEach((ld, idx) => {
          const l = Stack.addLayer(ld.name, { opacity: ld.opacity, blendMode: ld.blendMode });
          l.visible = ld.visible !== false; l.lockAlpha = !!ld.lockAlpha;
          const img = new Image();
          img.onload = () => { l.ctx.drawImage(img, 0, 0); if (--pending <= 0) { updateCanvasFrameLayout(); composite(); toast('📂 Project restored!'); } };
          img.src = ld.png;
          void idx;
        });
      } catch (_) { toast('Invalid .spart project file'); }
    };
    rd.readAsText(f);
    e.target.value = '';
  });

  // Generative Controls, Style DNA Fusion & Real Magic Prompt!
  $('rng-cpx').addEventListener('input', e => { S.cpx = +e.target.value; $('val-cpx').textContent = S.cpx; });
  $('rng-dens').addEventListener('input', e => { S.dens = +e.target.value; $('val-dens').textContent = S.dens; });
  $('sel-cs').addEventListener('change', e => { S.cs = e.target.value; });
  $('sel-gen-sym').addEventListener('change', e => { S.genSym = e.target.value; });
  $('sel-fusion-style').addEventListener('change', e => { S.secondaryStyle = e.target.value; });
  $('sel-fusion-blend').addEventListener('change', e => { S.fusionBlend = e.target.value; });
  $('rng-fusion-mix').addEventListener('input', e => { S.fusionAlpha = +e.target.value / 100; $('val-fusion-mix').textContent = e.target.value + '%'; });
  $('inp-seed').addEventListener('change', e => { S.seedHex = (e.target.value || Core.randomSeedHex()).toUpperCase(); S.seedLocked = true; $('btn-seed-lock').textContent = '🔒'; });
  $('btn-seed-lock').addEventListener('click', () => { S.seedLocked = !S.seedLocked; $('btn-seed-lock').textContent = S.seedLocked ? '🔒' : '🔓'; });
  $('btn-seed-rand').addEventListener('click', () => { S.seedHex = Core.randomSeedHex(); $('inp-seed').value = S.seedHex; });

  $('btn-gen-art').addEventListener('click', () => runGenerate(false, false));
  $('btn-gen-add').addEventListener('click', () => runGenerate(true, false));
  $('btn-gen-var').addEventListener('click', () => runGenerate(false, true));
  $('btn-gen-surprise').addEventListener('click', () => {
    S.primaryStyle = Core.STYLES[Math.floor(Math.random() * Core.STYLES.length)].id;
    S.secondaryStyle = Math.random() > 0.35 ? Core.STYLES[Math.floor(Math.random() * Core.STYLES.length)].id : 'none';
    S.cs = ['auto', 'warm', 'cool', 'comp', 'pastel', 'neon'][Math.floor(Math.random() * 6)];
    S.genSym = ['none', 'none', '6', '8', '12'][Math.floor(Math.random() * 5)];
    S.cpx = 3 + Math.floor(Math.random() * 3);
    S.seedLocked = false; $('btn-seed-lock').textContent = '🔓';
    syncGenerativeControls();
    runGenerate(false, true);
  });

  const runPrompt = () => {
    const parsed = Core.parseMagicPrompt($('inp-magic-prompt').value);
    S.primaryStyle = parsed.primary; S.secondaryStyle = parsed.secondary;
    S.cs = parsed.cs; S.genSym = parsed.sym; S.cpx = parsed.cpx; S.dens = parsed.dens;
    S.seedHex = parsed.seedHex; S.seedLocked = true; $('btn-seed-lock').textContent = '🔒';
    syncGenerativeControls();
    runGenerate(false, false);
  };
  $('btn-magic-prompt').addEventListener('click', runPrompt);
  $('inp-magic-prompt').addEventListener('keydown', e => { if (e.key === 'Enter') runPrompt(); });

  // Import Bar Controls (ZERO paywall block!)
  $('btn-import').addEventListener('click', () => $('inp-import-file').click());
  $('inp-import-file').addEventListener('change', e => { handleFileImport(e.target.files[0]); e.target.value = ''; });
  $('btn-imp-wand').addEventListener('click', () => {
    if (!S.imp) return;
    S.imp.wandMode = !S.imp.wandMode;
    $('btn-imp-wand').classList.toggle('active', S.imp.wandMode);
    if (S.imp.wandMode) toast('🪄 Click the background area on the imported image');
  });
  $('btn-imp-flip-h').addEventListener('click', () => { if (S.imp) { S.imp.flipH = !S.imp.flipH; renderOverlay(); } });
  $('rng-imp-rot').addEventListener('input', e => { if (S.imp) { S.imp.rot = +e.target.value; renderOverlay(); } });
  $('rng-imp-scale').addEventListener('input', e => { if (S.imp) { S.imp.scale = +e.target.value / 100; renderOverlay(); } });
  $('rng-imp-alpha').addEventListener('input', e => { if (S.imp) { S.imp.alpha = +e.target.value / 100; renderOverlay(); } });
  $('sel-imp-blend').addEventListener('change', e => { if (S.imp) { S.imp.blend = e.target.value; } });
  $('btn-imp-commit').addEventListener('click', () => {
    if (!S.imp) return;
    Stack.captureSnapshot('full');
    const l = Stack.addLayer('Imported Layer', { opacity: S.imp.alpha, blendMode: S.imp.blend }) || Stack.getActive();
    const im = S.imp, dw = im.w * im.scale, dh = im.h * im.scale;
    l.ctx.save();
    l.ctx.translate(im.x, im.y);
    l.ctx.rotate((im.rot * Math.PI) / 180);
    if (im.flipH) l.ctx.scale(-1, 1);
    l.ctx.drawImage(im.canvas, -dw / 2, -dh / 2, dw, dh);
    l.ctx.restore();
    S.imp = null;
    $('imp-bar').classList.add('hidden');
    composite();
    toast('✓ Stamped as new layer!');
  });
  $('btn-imp-cancel').addEventListener('click', () => { S.imp = null; $('imp-bar').classList.add('hidden'); renderOverlay(); });

  // Topbar Modals: Inspire, SVG Logo, Sign, Frame, 3D Relief, AR, Certif/NFT, Export Hub
  $('btn-inspire').addEventListener('click', () => $('modal-inspire').classList.remove('hidden'));
  $('btn-logo-studio').addEventListener('click', () => { $('modal-logo').classList.remove('hidden'); updateLogoPreview(); });
  $('btn-sign').addEventListener('click', () => $('modal-sign').classList.remove('hidden'));
  $('btn-frame').addEventListener('click', () => { $('modal-frame').classList.remove('hidden'); updateFramePreview(); });
  $('btn-3d-studio').addEventListener('click', () => {
    $('modal-3d').classList.remove('hidden');
    setTimeout(() => window.Art3DExport.open3DStudio($('viewport-3d'), _mainCv), 40);
  });
  $('btn-ar-quick').addEventListener('click', async () => {
    toast(S.lang === 'fr' ? '📱 Préparation du relief 3D pour AR...' : '📱 Preparing 3D sculpture for AR...');
    try { await window.Art3DExport.openARRelief(_mainCv); }
    catch (err) { toast('AR error: ' + err.message); }
  });
  $('btn-certif').addEventListener('click', () => $('modal-prov').classList.remove('hidden'));
  $('btn-nft').addEventListener('click', () => $('modal-prov').classList.remove('hidden'));
  $('btn-export-hub').addEventListener('click', () => $('modal-export').classList.remove('hidden'));

  // Close Modals
  document.querySelectorAll('.modal-close').forEach(b => b.addEventListener('click', () => $(b.dataset.close).classList.add('hidden')));
  document.querySelectorAll('.modal-backdrop').forEach(bg => bg.addEventListener('click', e => { if (e.target === bg) bg.classList.add('hidden'); }));

  // Logo Studio live preview & actions
  ['logo-brand', 'logo-tagline', 'logo-style', 'logo-font', 'logo-c-text', 'logo-c-emb', 'logo-c-frm', 'logo-c-bg', 'logo-trans', 'logo-frame']
    .forEach(id => $(id).addEventListener('input', updateLogoPreview));
  $('logo-palette').addEventListener('change', e => {
    const pal = Stamps.LOGO_PALETTES.find(p => p.id === e.target.value);
    if (!pal) return;
    $('logo-c-text').value = pal.text; $('logo-c-emb').value = pal.emblem;
    $('logo-c-frm').value = pal.frame; $('logo-c-bg').value = pal.bg;
    updateLogoPreview();
  });
  $('btn-logo-stamp').addEventListener('click', () => {
    const svg = updateLogoPreview();
    rasterizeLogoSVG(svg, c => { $('modal-logo').classList.add('hidden'); placeImportedCanvas(c, 'Vector Logo'); });
  });
  $('btn-logo-svg').addEventListener('click', () => {
    requestExport('svg', () => {
      const svg = updateLogoPreview();
      window.Art3DExport.downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `ArtGen_Logo_${Date.now()}.svg`);
      toast('📐 True Vector .SVG Logo exported!');
    });
  });
  $('btn-logo-png').addEventListener('click', () => {
    requestExport('png', () => {
      rasterizeLogoSVG(updateLogoPreview(), c => c.toBlob(b => window.Art3DExport.downloadBlob(b, `ArtGen_Logo_${Date.now()}.png`), 'image/png'));
      toast('🖼️ Logo .PNG exported!');
    });
  });

  // 3D Sculpture Controls
  const refresh3D = () => {
    const opts = {
      finish: $('r3d-finish').value,
      widthMm: +$('r3d-width').value,
      depthMm: +$('r3d-depth').value,
      baseMm: +$('r3d-base').value,
      curveDeg: +$('r3d-curve').value,
      smooth: +$('r3d-smooth').value,
      invert: $('r3d-invert').checked
    };
    $('r3d-width-v').textContent = opts.widthMm;
    $('r3d-depth-v').textContent = opts.depthMm + 'mm';
    $('r3d-base-v').textContent = opts.baseMm + 'mm';
    $('r3d-curve-v').textContent = opts.curveDeg + '°';
    $('r3d-smooth-v').textContent = opts.smooth;
    window.Art3DExport.rebuild3DRelief(_mainCv, opts);
  };
  ['r3d-finish', 'r3d-width', 'r3d-depth', 'r3d-base', 'r3d-curve', 'r3d-smooth', 'r3d-invert']
    .forEach(id => $(id).addEventListener('change', refresh3D));

  $('btn-3d-ar').addEventListener('click', async () => {
    toast(S.lang === 'fr' ? '📱 Ouverture dans AR Viewer...' : '📱 Opening sculpture in AR Viewer...');
    try { await window.Art3DExport.openARRelief(_mainCv); } catch (err) { toast('AR error: ' + err.message); }
  });
  $('btn-3d-stl').addEventListener('click', () => requestExport('stl', () => { window.Art3DExport.exportSTL(_mainCv); toast('🧊 Watertight Binary .STL exported!'); }));
  $('btn-3d-glb').addEventListener('click', () => requestExport('glb', async () => { await window.Art3DExport.exportGLB(_mainCv); toast('⚡ PBR .GLB exported!'); }));
  $('btn-3d-obj').addEventListener('click', () => requestExport('obj', () => { window.Art3DExport.exportOBJ(_mainCv); toast('📦 Solid .OBJ + .MTL exported!'); }));
  $('btn-3d-depth').addEventListener('click', () => requestExport('depth', () => { window.Art3DExport.exportDepthMapPNG(_mainCv); toast('🌗 Depth Map .PNG exported!'); }));

  // Museum Frame Studio Controls
  ['frm-style', 'frm-title', 'frm-artist', 'frm-mat', 'frm-plaque'].forEach(id => $(id).addEventListener('input', () => {
    $('frm-mat-v').textContent = $('frm-mat').value + '%';
    updateFramePreview();
  }));
  $('btn-frm-png').addEventListener('click', () => requestExport('png', () => { updateFramePreview().toBlob(b => window.Art3DExport.downloadBlob(b, `ArtGen_Framed_${Date.now()}.png`), 'image/png'); toast('🖼️ Framed .PNG exported!'); }));
  $('btn-frm-jpg').addEventListener('click', () => requestExport('jpg', () => { updateFramePreview().toBlob(b => window.Art3DExport.downloadBlob(b, `ArtGen_Framed_${Date.now()}.jpg`), 'image/jpeg', 0.94); toast('📷 Framed .JPG exported!'); }));
  $('btn-frm-html').addEventListener('click', () => requestExport('html', () => { window.Art3DExport.exportInteractiveHTML(updateFramePreview(), $('frm-title').value); toast('🌐 Framed Exhibition .HTML exported!'); }));

  // Custom Signature Stamp (100% FREE!)
  $('btn-sign-apply').addEventListener('click', () => {
    Stack.captureSnapshot('full');
    const l = Stack.addLayer('Artist Signature') || Stack.getActive();
    const w = Stack.state.width, h = Stack.state.height;
    const corner = $('sign-corner').value;
    const col = $('sign-color').value;
    const pad = 28;
    if (_signHasStrokes) {
      const sp = $('sign-pad');
      const sw = Math.min(260, w * 0.24), sh = sw * (sp.height / sp.width);
      const sx = corner.endsWith('r') ? w - sw - pad : pad;
      const sy = corner.startsWith('b') ? h - sh - pad : pad;
      l.ctx.drawImage(sp, sx, sy, sw, sh);
    } else {
      const txt = $('sign-text').value.trim() || 'ArtGen Artist';
      l.ctx.save();
      l.ctx.font = `700 ${Math.round(Math.max(28, h * 0.048))}px 'Dancing Script', cursive`;
      l.ctx.fillStyle = col;
      l.ctx.shadowColor = 'rgba(0,0,0,0.65)'; l.ctx.shadowBlur = 8;
      l.ctx.textAlign = corner.endsWith('r') ? 'right' : 'left';
      l.ctx.textBaseline = corner.startsWith('b') ? 'bottom' : 'top';
      l.ctx.fillText(txt, corner.endsWith('r') ? w - pad : pad, corner.startsWith('b') ? h - pad : pad);
      l.ctx.restore();
    }
    $('modal-sign').classList.add('hidden');
    composite();
    toast('✍️ Artist signature added on its own layer!');
  });

  // Provenance Certif / NFT
  const getProvMeta = () => ({
    title: $('prov-art-title').value,
    artist: $('prov-artist').value,
    edition: $('prov-edition').value,
    dna: S.currentDNA,
    primaryStyle: S.primaryStyle,
    secondaryStyle: S.secondaryStyle,
    sym: S.genSym
  });
  $('btn-prov-cert-pdf').addEventListener('click', () => requestExport('pdf', async () => { await window.Art3DExport.exportCertificate(_mainCv, getProvMeta(), 'pdf'); toast('📜 SHA-256 PDF Certificate exported!'); }));
  $('btn-prov-cert-html').addEventListener('click', () => requestExport('html', async () => { await window.Art3DExport.exportCertificate(_mainCv, getProvMeta(), 'html'); toast('🌐 SHA-256 HTML Certificate exported!'); }));
  $('btn-prov-nft').addEventListener('click', () => requestExport('nft', async () => { await window.Art3DExport.exportNFTPack(_mainCv, getProvMeta()); toast('💎 ERC-721 NFT JSON + PNG exported!'); }));

  // Unified Export Hub
  document.querySelectorAll('[data-exp]').forEach(btn => {
    btn.addEventListener('click', () => {
      const kind = btn.dataset.exp;
      $('modal-export').classList.add('hidden');
      const E = window.Art3DExport;
      if (kind === 'spart') { E.saveProjectSPART(Stack, { dna: S.currentDNA, primaryStyle: S.primaryStyle, seedHex: S.seedHex }); toast('💾 .spart project saved'); return; }
      if (kind === 'ar') { E.openARRelief(_mainCv).catch(e => toast('AR error: ' + e.message)); return; }
      requestExport(kind, async () => {
        if (kind === 'png') { _mainCv.toBlob(b => E.downloadBlob(b, `ArtGen_${Date.now()}.png`), 'image/png'); toast('🖼️ PNG exported!'); }
        else if (kind === 'jpg') { _mainCv.toBlob(b => E.downloadBlob(b, `ArtGen_${Date.now()}.jpg`), 'image/jpeg', 0.95); toast('📷 JPG exported!'); }
        else if (kind === 'pdf') { E.exportArtworkPDF(_mainCv, S.currentDNA); toast('📑 Print PDF exported!'); }
        else if (kind === 'html') { E.exportInteractiveHTML(_mainCv, S.currentDNA); toast('🌐 Interactive HTML exported!'); }
        else if (kind === 'stl') { E.exportSTL(_mainCv); toast('🧊 Watertight Binary .STL exported!'); }
        else if (kind === 'glb') { await E.exportGLB(_mainCv); toast('⚡ PBR .GLB exported!'); }
        else if (kind === 'obj') { E.exportOBJ(_mainCv); toast('📦 Solid .OBJ + .MTL exported!'); }
        else if (kind === 'depth') { E.exportDepthMapPNG(_mainCv); toast('🌗 Depth Map .PNG exported!'); }
      });
    });
  });

  // Language Buttons
  document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => applyLanguage(b.dataset.lang)));

  // Clean Conflict-Free Keyboard Shortcuts (Space = Pan, Ctrl+Z/Y, X = Swap, [ / ] = Brush Size)
  window.addEventListener('keydown', e => {
    const tag = (e.target && e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
    if (e.code === 'Space') { e.preventDefault(); S.spaceHeld = true; $('canvas-stage').style.cursor = 'grab'; return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (Stack.undo()) composite(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); if (Stack.redo()) composite(); return; }
    const k = e.key.toUpperCase();
    if (k === 'X') { $('btn-swap-colors').click(); return; }
    if (e.key === '[') { S.size = Math.max(1, S.size - 4); $('rng-size').value = S.size; $('val-size').textContent = S.size; return; }
    if (e.key === ']') { S.size = Math.min(150, S.size + 4); $('rng-size').value = S.size; $('val-size').textContent = S.size; return; }
    const found = Core.TOOLS.find(t => t.key === k);
    if (found) selectTool(found.id);
  });
  window.addEventListener('keyup', e => {
    if (e.code === 'Space') { S.spaceHeld = false; $('canvas-stage').style.cursor = S.tool === 'hand' ? 'grab' : 'crosshair'; }
  });
}

// =========================================================================
// BOOTSTRAP
// =========================================================================

function boot() {
  _mainCv = $('main-canvas');
  _mainCtx = _mainCv.getContext('2d', { willReadFrequently: true });
  _overCv = $('overlay-canvas');
  _overCtx = _overCv.getContext('2d');

  Stack = Core.createLayerStack(1280, 720, 'dark', '#0c101b');
  _mainCv.width = 1280; _mainCv.height = 720;
  _overCv.width = 1280; _overCv.height = 720;

  buildToolAndStyleGrids();
  renderPalette();
  populateLogoModalSelects();
  initSignaturePad();
  bindEvents();
  syncGenerativeControls();
  updateCanvasFrameLayout();

  // Check URL lang or sp_remix_state
  const params = new URLSearchParams(window.location.search);
  if (params.get('lang') === 'fr') applyLanguage('fr');
  try {
    const raw = sessionStorage.getItem('sp_remix_state') || localStorage.getItem('sp_remix_state');
    if (raw) {
      const rem = JSON.parse(raw);
      if (rem && rem.format === 'studios-pro-artgen-v5' && rem.primaryStyle) {
        S.primaryStyle = rem.primaryStyle; S.secondaryStyle = rem.secondaryStyle || 'none';
        if (rem.seedHex) { S.seedHex = rem.seedHex; S.seedLocked = true; }
        syncGenerativeControls();
        runGenerate(false, false);
        return;
      }
    }
  } catch (_) {}

  composite();
}

boot();
