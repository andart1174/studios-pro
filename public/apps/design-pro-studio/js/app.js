/**
 * Design Pro Studio v4.0 — Main Application Controller
 * Wires DesignCore + Blueprint2D + InteriorScene3D (Three.js r165 PBR) + ExportSuite
 * + Studios-Pro BroadcastChannel('studios_pro_channel') + Direct 1:1 AR View + Undo/Redo!
 */
import { InteriorScene3D } from './scene3d.js';
import {
  exportRender2KPNG, exportBlueprintSVG, exportClientPDF,
  exportGLB, exportSTL, exportOBJ, openInARViewer, exportQuoteCSV, exportProjectFree
} from './export-suite.js';

const DC = window.DesignCore;
const $ = id => document.getElementById(id);

const ui = {
  lang: 'fr',
  unit: 'metric',
  view: 'split',
  tool: 'select',
  snap: true,
  snapSize: 10,
  showDims: true,
  showErgonomics: true,
  showCeiling: true,
  selection: null, // { kind: 'furniture'|'door'|'window', uid }
  catalogCat: 'all',
  catalogQuery: '',
  isPro: false,
  pendingExport: null,
  wizType: 'living',
  wizShape: 'rect',
  wizStyle: 'modern'
};

let state = null;
const history = [];
let historyIdx = -1;
let cad2d = null;
let scene3d = null;

// Studios-Pro Host BroadcastChannel!
const hostChannel = (typeof BroadcastChannel !== 'undefined')
  ? new BroadcastChannel('studios_pro_channel')
  : null;

let _toastTimer = null;
function showToast(msg, ms = 2600) {
  const el = $('toast-banner');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.add('hidden'), ms);
}

// =========================================================================
// 1. HISTORY (UNDO / REDO) & CLEAN AUTOSAVE (NEVER STORES HISTORY!)
// =========================================================================

function cloneProjectState(s) {
  return JSON.parse(JSON.stringify({
    format: 'studios-pro-design-v4',
    room: s.room,
    doors: s.doors,
    windows: s.windows,
    furniture: s.furniture,
    lighting: s.lighting,
    budgetLimit: s.budgetLimit,
    currency: s.currency
  }));
}

function commitHistory() {
  if (!state) return;
  const snap = cloneProjectState(state);
  history.splice(historyIdx + 1);
  history.push(snap);
  if (history.length > 45) history.shift();
  historyIdx = history.length - 1;
  try { localStorage.setItem('designpro_v4_autosave', JSON.stringify(snap)); } catch (_) {}
}

function undo() {
  if (historyIdx <= 0) return;
  historyIdx--;
  state = cloneProjectState(history[historyIdx]);
  ui.selection = null;
  fullSyncAll(false);
  showToast(ui.lang === 'fr' ? '↶ Annulé' : '↶ Undone', 1400);
}

function redo() {
  if (historyIdx >= history.length - 1) return;
  historyIdx++;
  state = cloneProjectState(history[historyIdx]);
  ui.selection = null;
  fullSyncAll(false);
  showToast(ui.lang === 'fr' ? '↷ Rétabli' : '↷ Redone', 1400);
}

// =========================================================================
// 2. WIZARD SETUP & ROOM CREATION
// =========================================================================

function populateWizard() {
  const tGrid = $('wiz-type-grid');
  tGrid.innerHTML = '';
  DC.ROOM_TYPES.forEach(rt => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'wiz-tile' + (ui.wizType === rt.id ? ' active' : '');
    b.dataset.type = rt.id;
    b.innerHTML = `<span class="ico">${rt.icon}</span><span>${ui.lang === 'en' ? rt.en : rt.fr}</span>`;
    b.addEventListener('click', () => {
      ui.wizType = rt.id;
      $('wiz-w').value = rt.defW;
      $('wiz-d').value = rt.defD;
      $('wiz-h').value = rt.defH;
      tGrid.querySelectorAll('.wiz-tile').forEach(el => el.classList.toggle('active', el.dataset.type === rt.id));
    });
    tGrid.appendChild(b);
  });

  const shGrid = $('wiz-shape-grid');
  shGrid.innerHTML = '';
  DC.ROOM_SHAPES.forEach(sh => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'wiz-pill' + (ui.wizShape === sh.id ? ' active' : '');
    b.dataset.shape = sh.id;
    b.textContent = ui.lang === 'en' ? sh.en : sh.fr;
    b.addEventListener('click', () => {
      ui.wizShape = sh.id;
      shGrid.querySelectorAll('.wiz-pill').forEach(el => el.classList.toggle('active', el.dataset.shape === sh.id));
    });
    shGrid.appendChild(b);
  });

  const stGrid = $('wiz-style-grid');
  stGrid.innerHTML = '';
  Object.values(DC.DESIGN_STYLES).forEach(st => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'wiz-pill' + (ui.wizStyle === st.id ? ' active' : '');
    b.dataset.style = st.id;
    b.textContent = `${st.icon} ${ui.lang === 'en' ? st.en : st.fr}`;
    b.addEventListener('click', () => {
      ui.wizStyle = st.id;
      stGrid.querySelectorAll('.wiz-pill').forEach(el => el.classList.toggle('active', el.dataset.style === st.id));
    });
    stGrid.appendChild(b);
  });
}

function launchRoomFromWizard() {
  state = DC.generateFullRoom({
    type: ui.wizType,
    shape: ui.wizShape,
    style: ui.wizStyle,
    w: Number($('wiz-w').value) || 560,
    d: Number($('wiz-d').value) || 440,
    h: Number($('wiz-h').value) || 270
  });
  ui.selection = null;
  $('wizard-overlay').classList.add('hidden');
  commitHistory();
  fullSyncAll(true);
  showToast(ui.lang === 'fr' ? '✨ Espace 3D photoréaliste prêt !' : '✨ Photorealistic 3D Interior Ready!');
}

// =========================================================================
// 3. DOCK PANELS & INSPECTOR RENDERERS
// =========================================================================

function populateStaticSelects() {
  const fill = (id, list, getLbl) => {
    const sel = $(id);
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = '';
    list.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = getLbl(item);
      sel.appendChild(opt);
    });
    if (prev) sel.value = prev;
  };
  fill('live-room-type', DC.ROOM_TYPES, r => `${r.icon} ${ui.lang === 'en' ? r.en : r.fr}`);
  fill('live-room-shape', DC.ROOM_SHAPES, s => ui.lang === 'en' ? s.en : s.fr);
  fill('sel-floor-mat', DC.FLOOR_MATERIALS, m => ui.lang === 'en' ? m.en : m.fr);
  fill('sel-wall-mat', DC.WALL_MATERIALS, m => ui.lang === 'en' ? m.en : m.fr);
  fill('sel-accent-mat', DC.WALL_MATERIALS, m => ui.lang === 'en' ? m.en : m.fr);
}

function renderDockStyles() {
  const grid = $('dock-style-grid');
  grid.innerHTML = '';
  Object.values(DC.DESIGN_STYLES).forEach(st => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'style-chip' + (state.room.style === st.id ? ' active' : '');
    b.innerHTML = `<span>${st.icon}</span><span>${ui.lang === 'en' ? st.en : st.fr}</span>`;
    b.addEventListener('click', () => {
      DC.applyDesignStyleToState(state, st.id);
      commitHistory();
      fullSyncAll(false);
      showToast(`${st.icon} ${ui.lang === 'en' ? st.en : st.fr}`);
    });
    grid.appendChild(b);
  });
}

function renderRoomStats() {
  const geom = DC.buildRoomGeometry(state.room);
  const ergo = DC.analyzeErgonomics(state);
  $('live-room-type').value = state.room.type;
  $('live-room-shape').value = state.room.shape || 'rect';
  $('live-room-w').value = state.room.w;
  $('live-room-d').value = state.room.d;
  $('live-room-h').value = state.room.h;

  $('room-stats-grid').innerHTML = `
    <div class="stat-box"><span>${ui.lang === 'fr' ? 'Surface' : 'Area'}</span><strong>${DC.fmtArea(geom.areaM2, ui.unit)}</strong></div>
    <div class="stat-box"><span>${ui.lang === 'fr' ? 'Périmètre' : 'Perimeter'}</span><strong>${DC.fmtMeters(geom.perimeterM * 100, ui.unit)}</strong></div>
    <div class="stat-box"><span>${ui.lang === 'fr' ? 'Mobilier' : 'Items'}</span><strong>${state.furniture.length}</strong></div>
    <div class="stat-box"><span>${ui.lang === 'fr' ? 'Collisions' : 'Collisions'}</span><strong style="color:${ergo.collisions.size ? '#ef4444' : '#10b981'}">${ergo.collisions.size}</strong></div>
  `;
}

function renderCatalog() {
  const pills = $('furn-cat-pills');
  pills.innerHTML = '';
  const allBtn = document.createElement('button');
  allBtn.type = 'button';
  allBtn.className = 'cat-pill' + (ui.catalogCat === 'all' ? ' active' : '');
  allBtn.textContent = ui.lang === 'fr' ? `Tous (${DC.FURNITURE_CATALOG.length})` : `All (${DC.FURNITURE_CATALOG.length})`;
  allBtn.addEventListener('click', () => { ui.catalogCat = 'all'; renderCatalog(); });
  pills.appendChild(allBtn);

  DC.CATALOG_CATEGORIES.forEach(c => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cat-pill' + (ui.catalogCat === c.id ? ' active' : '');
    b.textContent = `${c.icon} ${ui.lang === 'en' ? c.en : c.fr}`;
    b.addEventListener('click', () => { ui.catalogCat = c.id; renderCatalog(); });
    pills.appendChild(b);
  });

  const grid = $('furn-catalog-grid');
  grid.innerHTML = '';
  const q = ui.catalogQuery.trim().toLowerCase();
  const list = DC.FURNITURE_CATALOG.filter(item => {
    if (ui.catalogCat !== 'all' && item.cat !== ui.catalogCat) return false;
    if (q && !item.en.toLowerCase().includes(q) && !item.fr.toLowerCase().includes(q) && !item.id.includes(q)) return false;
    return true;
  });

  list.forEach(def => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'cat-item';
    card.innerHTML = `
      <strong>${ui.lang === 'en' ? def.en : def.fr}</strong>
      <span>${def.w}×${def.d}×${def.h} cm</span>
      <em>${DC.fmtMoney(def.price, state.currency)}</em>
    `;
    card.addEventListener('click', () => smartPlaceFurniture(def.id));
    grid.appendChild(card);
  });
}

// Smart Collision-Free Furniture Placement (finds open spot instead of stacking on center!)
function smartPlaceFurniture(catalogId) {
  const st = DC.DESIGN_STYLES[state.room.style] || DC.DESIGN_STYLES.modern;
  const geom = DC.buildRoomGeometry(state.room);
  const cx = Math.round(geom.W * 0.5), cy = Math.round(geom.D * 0.5);
  let placed = null;

  // Spiral search for a collision-free open position inside room!
  const offsets = [[0, 0], [0, 75], [0, -75], [85, 0], [-85, 0], [85, 75], [-85, 75], [85, -75], [-85, -75], [140, 0], [-140, 0]];
  for (const [ox, oy] of offsets) {
    const cand = DC.createPlacedItem(catalogId, cx + ox, cy + oy, 0, st);
    DC.clampItemToRoom(cand, state.room);
    if (!state.furniture.some(other => DC.itemsCollideOBB(cand, other, 2))) {
      placed = cand;
      break;
    }
  }
  if (!placed) {
    placed = DC.createPlacedItem(catalogId, cx, cy, 0, st);
    DC.clampItemToRoom(placed, state.room);
  }
  state.furniture.push(placed);
  ui.selection = { kind: 'furniture', uid: placed.uid };
  commitHistory();
  fullSyncAll(false);
}

function renderArchPanel() {
  const list = $('arch-openings-list');
  list.innerHTML = '';
  const addRow = (op, kind, icon) => {
    const row = document.createElement('div');
    const isSel = ui.selection && ui.selection.kind === kind && ui.selection.uid === op.uid;
    row.className = 'list-row' + (isSel ? ' selected' : '');
    row.innerHTML = `<span>${icon} ${kind === 'door' ? (ui.lang === 'fr' ? 'Porte' : 'Door') : (ui.lang === 'fr' ? 'Fenêtre' : 'Window')} (${op.w}×${op.h} cm · ${op.wallId})</span>`;
    const del = document.createElement('button');
    del.type = 'button'; del.className = 'mini-del'; del.textContent = '✕';
    del.addEventListener('click', e => {
      e.stopPropagation();
      const arr = kind === 'door' ? state.doors : state.windows;
      const idx = arr.findIndex(x => x.uid === op.uid);
      if (idx >= 0) arr.splice(idx, 1);
      if (isSel) ui.selection = null;
      commitHistory();
      fullSyncAll(false);
    });
    row.addEventListener('click', () => {
      ui.selection = { kind, uid: op.uid };
      renderInspector();
      renderArchPanel();
      if (cad2d) cad2d.render();
    });
    row.appendChild(del);
    list.appendChild(row);
  };
  (state.doors || []).forEach(d => addRow(d, 'door', '🚪'));
  (state.windows || []).forEach(w => addRow(w, 'window', '🪟'));

  // Per-Wall Finish Overrides!
  const wList = $('walls-override-list');
  wList.innerHTML = '';
  const geom = DC.buildRoomGeometry(state.room);
  geom.walls.forEach(wall => {
    const row = document.createElement('div');
    row.className = 'list-row';
    const lbl = document.createElement('span');
    lbl.textContent = `${wall.label} (${Math.round(wall.len)}cm)`;
    const sel = document.createElement('select');
    sel.className = 'pro-select sm';
    sel.style.width = '112px';
    DC.WALL_MATERIALS.forEach(m => {
      const o = document.createElement('option');
      o.value = m.id; o.textContent = ui.lang === 'en' ? m.en : m.fr;
      sel.appendChild(o);
    });
    sel.value = wall.material;
    sel.addEventListener('change', () => {
      if (!state.room.wallStyles) state.room.wallStyles = {};
      state.room.wallStyles[wall.id] = { material: sel.value, color: wall.color };
      if (wall.id === 'w0') state.room.accentMaterial = sel.value;
      commitHistory();
      fullSyncAll(false);
    });
    row.append(lbl, sel);
    wList.appendChild(row);
  });
}

function renderDesignTabValues() {
  $('sel-floor-mat').value = state.room.floorMaterial || 'parquet';
  $('col-floor').value = state.room.floorColor || '#c49a6c';
  $('sel-wall-mat').value = state.room.wallMaterial || 'paint';
  $('col-wall').value = state.room.wallColor || '#f1efe9';
  $('sel-accent-mat').value = state.room.accentMaterial || 'wood_slats';
  $('col-accent').value = state.room.accentColor || '#9d7147';

  const hr = state.lighting?.timeOfDay ?? 14;
  const hInt = Math.floor(hr);
  const mins = Math.round((hr - hInt) * 60);
  $('slider-time').value = hr;
  $('val-time').textContent = `${String(hInt).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

  const ambPct = Math.round((state.lighting?.ambient ?? 0.72) * 100);
  $('slider-ambient').value = ambPct;
  $('val-ambient').textContent = `${ambPct}%`;
  $('chk-lamps').checked = state.lighting?.lampsOn !== false;

  document.querySelectorAll('.env-btn').forEach(b => b.classList.toggle('active', b.dataset.env === (state.lighting?.preset || 'day')));
}

function renderDevisPanel() {
  const devis = DC.computeDevis(state);
  const cur = state.currency || 'EUR';
  const lim = Math.max(500, Number(state.budgetLimit) || 8500);
  $('budget-limit').value = lim;
  $('currency-select').value = cur;

  const pct = Math.min(100, Math.round((devis.grandTotal / lim) * 100));
  const fill = $('budget-bar-fill');
  fill.style.width = `${pct}%`;
  fill.classList.toggle('over', devis.grandTotal > lim);

  $('devis-totals').innerHTML = `
    <span style="color:#8ea0c2">${ui.lang === 'fr' ? 'Total Estimé' : 'Total Est.'} (${pct}%)</span>
    <span style="color:${devis.grandTotal > lim ? '#ef4444' : '#10b981'}">${DC.fmtMoney(devis.grandTotal, cur)}</span>
  `;

  const list = $('devis-list');
  list.innerHTML = '';
  devis.lines.forEach(ln => {
    const row = document.createElement('div');
    row.className = 'devis-line';
    row.innerHTML = `<span>${ui.lang === 'fr' ? ln.fr : ln.en} (${ln.qty})</span><strong>${DC.fmtMoney(ln.cost, cur)}</strong>`;
    list.appendChild(row);
  });
  const furnRow = document.createElement('div');
  furnRow.className = 'devis-line';
  furnRow.innerHTML = `<span style="color:#38bdf8;font-weight:700">${ui.lang === 'fr' ? 'Mobilier & Déco' : 'Furniture & Decor'} (${state.furniture.length})</span><strong style="color:#38bdf8">${DC.fmtMoney(devis.furnitureSubtotal, cur)}</strong>`;
  list.appendChild(furnRow);
}

function renderInspector() {
  const body = $('inspector-body');
  if (!ui.selection) {
    body.innerHTML = `<p class="empty-msg">${DC.getT(ui.lang).selEmpty}</p>`;
    return;
  }

  if (ui.selection.kind === 'furniture') {
    const item = state.furniture.find(f => f.uid === ui.selection.uid);
    if (!item) { ui.selection = null; renderInspector(); return; }
    const def = DC.getCatalogItem(item.id);
    body.innerHTML = `
      <div class="card">
        <div class="card-title">${ui.lang === 'en' ? def.en : def.fr}</div>
        <div class="mat-row">
          <span style="font-size:11px;color:#8ea0c2">${ui.lang === 'fr' ? 'Couleur / Finition' : 'Color / Finish'}</span>
          <input id="insp-color" class="color-swatch" type="color" value="${item.color || def.color}">
        </div>
        <div class="field-3col">
          <label>W (cm)<input id="insp-w" class="pro-input sm" type="number" min="15" max="450" value="${item.w}"></label>
          <label>D (cm)<input id="insp-d" class="pro-input sm" type="number" min="4" max="350" value="${item.d}"></label>
          <label>H (cm)<input id="insp-h" class="pro-input sm" type="number" min="2" max="320" value="${item.h}"></label>
        </div>
        <div class="field-3col">
          <label>X (cm)<input id="insp-x" class="pro-input sm" type="number" value="${item.x}"></label>
          <label>Y (cm)<input id="insp-y" class="pro-input sm" type="number" value="${item.y}"></label>
          <label>Z Elev<input id="insp-z" class="pro-input sm" type="number" min="0" max="300" value="${item.z || 0}"></label>
        </div>
        <div class="field-2col">
          <label>${ui.lang === 'fr' ? 'Angle (°)' : 'Angle (°)'}<input id="insp-rot" class="pro-input sm" type="number" min="0" max="359" step="15" value="${item.rot || 0}"></label>
          <label>${ui.lang === 'fr' ? 'Prix' : 'Price'}<input id="insp-price" class="pro-input sm" type="number" min="0" step="10" value="${item.price}"></label>
        </div>
        <div class="action-pair">
          <button id="insp-rot90" class="btn-soft" type="button">↻ +90°</button>
          <button id="insp-dup" class="btn-soft" type="button">⧉ ${ui.lang === 'fr' ? 'Dupliquer' : 'Duplicate'}</button>
        </div>
        <button id="insp-del" class="btn-soft danger full" type="button">🗑 ${ui.lang === 'fr' ? 'Supprimer' : 'Delete'}</button>
      </div>
    `;

    $('insp-color').addEventListener('input', e => { item.color = e.target.value; fullSyncAll(false); });
    ['w', 'd', 'h', 'x', 'y', 'z', 'rot', 'price'].forEach(k => {
      $(`insp-${k}`).addEventListener('change', e => {
        item[k] = Number(e.target.value) || 0;
        if (k === 'rot') item.rot = ((item.rot % 360) + 360) % 360;
        DC.clampItemToRoom(item, state.room);
        commitHistory();
        fullSyncAll(false);
      });
    });
    $('insp-rot90').addEventListener('click', () => {
      item.rot = ((item.rot || 0) + 90) % 360;
      DC.clampItemToRoom(item, state.room);
      commitHistory();
      fullSyncAll(false);
    });
    $('insp-dup').addEventListener('click', () => smartPlaceFurniture(item.id));
    $('insp-del').addEventListener('click', () => {
      state.furniture = state.furniture.filter(f => f.uid !== item.uid);
      ui.selection = null;
      commitHistory();
      fullSyncAll(false);
    });
  } else {
    const isDoor = ui.selection.kind === 'door';
    const arr = isDoor ? state.doors : state.windows;
    const op = arr.find(o => o.uid === ui.selection.uid);
    if (!op) { ui.selection = null; renderInspector(); return; }
    const geom = DC.buildRoomGeometry(state.room);
    const wallOpts = geom.walls.filter(w => !w.isPartition).map(w => `<option value="${w.id}" ${w.id === op.wallId ? 'selected' : ''}>${w.label}</option>`).join('');

    body.innerHTML = `
      <div class="card">
        <div class="card-title">${isDoor ? '🚪 ' + (ui.lang === 'fr' ? 'Porte' : 'Door') : '🪟 ' + (ui.lang === 'fr' ? 'Fenêtre' : 'Window')}</div>
        <label style="font-size:10.5px;color:#8ea0c2">Wall <select id="op-wall" class="pro-select sm">${wallOpts}</select></label>
        <div class="field-3col">
          <label>Pos<input id="op-off" class="pro-input sm" type="number" min="10" value="${op.offset}"></label>
          <label>W<input id="op-w" class="pro-input sm" type="number" min="50" max="320" value="${op.w}"></label>
          <label>H<input id="op-h" class="pro-input sm" type="number" min="60" max="260" value="${op.h}"></label>
        </div>
        ${isDoor ? `
          <div class="field-2col">
            <label>Style <select id="op-style" class="pro-select sm"><option value="single" ${op.style === 'single' ? 'selected' : ''}>Single</option><option value="double" ${op.style === 'double' ? 'selected' : ''}>Double</option><option value="sliding" ${op.style === 'sliding' ? 'selected' : ''}>Sliding</option></select></label>
            <label>Hinge <select id="op-hinge" class="pro-select sm"><option value="left" ${op.hinge !== 'right' ? 'selected' : ''}>Left</option><option value="right" ${op.hinge === 'right' ? 'selected' : ''}>Right</option></select></label>
          </div>
        ` : `
          <div class="field-2col">
            <label>Sill (cm)<input id="op-sill" class="pro-input sm" type="number" min="15" max="150" value="${op.sill || 82}"></label>
            <label>Style <select id="op-style" class="pro-select sm"><option value="single" ${op.style === 'single' ? 'selected' : ''}>Single</option><option value="double" ${op.style !== 'single' ? 'selected' : ''}>Double</option></select></label>
          </div>
        `}
        <button id="op-del" class="btn-soft danger full" type="button">🗑 ${ui.lang === 'fr' ? 'Supprimer' : 'Delete'}</button>
      </div>
    `;

    $('op-wall').addEventListener('change', e => { op.wallId = e.target.value; op.offset = 30; commitHistory(); fullSyncAll(false); });
    $('op-off').addEventListener('change', e => { op.offset = Math.max(10, Number(e.target.value) || 20); commitHistory(); fullSyncAll(false); });
    $('op-w').addEventListener('change', e => { op.w = Math.max(50, Number(e.target.value) || 90); commitHistory(); fullSyncAll(false); });
    $('op-h').addEventListener('change', e => { op.h = Math.max(60, Number(e.target.value) || 140); commitHistory(); fullSyncAll(false); });
    $('op-style').addEventListener('change', e => { op.style = e.target.value; commitHistory(); fullSyncAll(false); });
    if (isDoor) $('op-hinge').addEventListener('change', e => { op.hinge = e.target.value; commitHistory(); fullSyncAll(false); });
    else $('op-sill').addEventListener('change', e => { op.sill = Math.max(15, Number(e.target.value) || 82); commitHistory(); fullSyncAll(false); });
    $('op-del').addEventListener('click', () => {
      const idx = arr.findIndex(x => x.uid === op.uid);
      if (idx >= 0) arr.splice(idx, 1);
      ui.selection = null;
      commitHistory();
      fullSyncAll(false);
    });
  }
}

function fullSyncAll(resetCam = false) {
  if (!state) return;
  renderDockStyles();
  renderRoomStats();
  renderArchPanel();
  renderDesignTabValues();
  renderDevisPanel();
  renderInspector();
  if (cad2d) cad2d.render();
  if (scene3d) scene3d.rebuildAll(state, resetCam);
}

// =========================================================================
// 4. I18N (SAFE — NEVER WIPES CHILD VALUE SPANS!)
// =========================================================================

function setLanguage(lang) {
  ui.lang = lang === 'en' ? 'en' : 'fr';
  const dict = DC.getT(ui.lang);
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.getAttribute('data-i18n');
    if (dict[k]) el.textContent = dict[k];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const k = el.getAttribute('data-i18n-placeholder');
    if (dict[k]) el.placeholder = dict[k];
  });
  $('btn-lang-fr').classList.toggle('active', ui.lang === 'fr');
  $('btn-lang-en').classList.toggle('active', ui.lang === 'en');
  populateWizard();
  populateStaticSelects();
  renderCatalog();
  if (state) fullSyncAll(false);
}

// =========================================================================
// 5. EXPORT PERMISSION GATE (Studios-Pro BroadcastChannel — ZERO DEADLOCKS!)
// =========================================================================

function setExportStatus(msg) {
  const bar = $('export-status-bar');
  if (!msg) { bar.classList.add('hidden'); return; }
  bar.textContent = msg;
  bar.classList.remove('hidden');
}

function executePendingExport() {
  if (!ui.pendingExport) return;
  const { format, fn } = ui.pendingExport;
  ui.pendingExport = null;
  Promise.resolve(fn())
    .then(() => {
      if (hostChannel) {
        try { hostChannel.postMessage({ type: 'EXPORT_COMPLETED', payload: { format, app: 'design-pro-studio' }, _msgId: 'dp_done_' + Date.now() }); } catch (_) {}
      }
    })
    .catch(err => setExportStatus('❌ ' + (err?.message || String(err))));
}

function requestExportPermission(format, fn) {
  if (window.parent === window || ui.isPro) {
    Promise.resolve(fn()).catch(err => setExportStatus('❌ ' + (err?.message || String(err))));
    return;
  }
  setExportStatus(ui.lang === 'fr' ? '⏳ Vérification de l’autorisation d’export...' : '⏳ Verifying export permission...');
  ui.pendingExport = { format, fn };
  const msg = {
    type: 'TRIGGER_PAYMENT_MODAL',
    payload: { format, app: 'design-pro-studio' },
    _msgId: 'dp_exp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)
  };
  if (hostChannel) hostChannel.postMessage(msg);
  else window.parent.postMessage(msg, '*');
}

function handleHostMessage(d) {
  if (!d || typeof d !== 'object') return;
  if (d.type === 'SET_LANG' && d.lang) setLanguage(d.lang);
  else if (d.type === 'USER_TIER_STATUS') ui.isPro = !!(d.isPro || d.tier === 'pro' || d.tier === 'vip');
  else if (d.type === 'USER_STATUS_RESPONSE' && d.payload) ui.isPro = !!d.payload.isPremium;
  else if (d.type === 'EXPORT_ALLOWED') {
    if (d.payload && d.payload.isPremium) ui.isPro = true;
    executePendingExport();
  } else if (d.type === 'SHOW_PAYWALL_MODAL' || d.type === 'EXPORT_BLOCKED') {
    ui.pendingExport = null;
    setExportStatus('');
  }
}

window.addEventListener('message', e => handleHostMessage(e.data));
if (hostChannel) hostChannel.onmessage = e => handleHostMessage(e.data);

// =========================================================================
// 6. EVENT BINDINGS
// =========================================================================

function bindEvents() {
  // Back to Studios-Pro
  $('btn-back').addEventListener('click', () => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'CLOSE_STUDIO' }, '*');
    } else {
      showToast('Back to Studios-Pro');
    }
  });

  $('btn-wiz-create').addEventListener('click', launchRoomFromWizard);
  $('btn-new-room').addEventListener('click', () => {
    populateWizard();
    $('wizard-overlay').classList.remove('hidden');
  });

  // FREE Save / Load .spdesign
  $('btn-save-proj').addEventListener('click', () => {
    const res = exportProjectFree(state);
    showToast(`💾 ${res.filename}`);
  });
  $('btn-load-proj').addEventListener('click', () => $('file-load-proj').click());
  $('file-load-proj').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (data && data.room && Array.isArray(data.furniture)) {
          state = data;
          ui.selection = null;
          $('wizard-overlay').classList.add('hidden');
          commitHistory();
          fullSyncAll(true);
          showToast(`📂 Loaded ${file.name}`);
        } else {
          showToast('❌ Invalid .spdesign file');
        }
      } catch (_) {
        showToast('❌ Failed to parse JSON');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  });

  // Units & Language
  $('btn-unit-metric').addEventListener('click', () => {
    ui.unit = 'metric';
    $('btn-unit-metric').classList.add('active');
    $('btn-unit-imperial').classList.remove('active');
    fullSyncAll(false);
  });
  $('btn-unit-imperial').addEventListener('click', () => {
    ui.unit = 'imperial';
    $('btn-unit-imperial').classList.add('active');
    $('btn-unit-metric').classList.remove('active');
    fullSyncAll(false);
  });
  $('btn-lang-fr').addEventListener('click', () => setLanguage('fr'));
  $('btn-lang-en').addEventListener('click', () => setLanguage('en'));

  // Direct 1:1 AR View CTA in Topbar (FREE!)
  const runAR = async () => {
    try {
      showToast(ui.lang === 'fr' ? '📱 Préparation AR 1:1 réelle...' : '📱 Encoding 1:1 Real-Scale AR...');
      const res = await openInARViewer(scene3d, state);
      showToast(`📱 AR 1:1 Ready (${(res.size / 1024).toFixed(0)} KB)`);
    } catch (err) {
      showToast('❌ AR Error: ' + err.message);
    }
  };
  $('btn-ar-view').addEventListener('click', runAR);

  // View Switch (Split / 2D / 3D)
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      ui.view = btn.dataset.view;
      document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b === btn));
      const area = $('viewport-area');
      area.className = `viewport-area view-${ui.view}`;
      setTimeout(() => {
        if (cad2d) cad2d.resize();
        if (scene3d) scene3d.handleResize();
      }, 30);
    });
  });

  // Camera Presets + 1st-Person Walkthrough Mode!
  document.querySelectorAll('[data-cam]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.cam;
      document.querySelectorAll('[data-cam]').forEach(b => b.classList.toggle('active', b === btn));
      if (scene3d) scene3d.setCameraPreset(mode);
      $('walk-hud').classList.toggle('hidden', mode !== 'walk');
    });
  });

  // Undo / Redo & CAD Tools
  $('btn-undo').addEventListener('click', undo);
  $('btn-redo').addEventListener('click', redo);
  document.querySelectorAll('[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      ui.tool = btn.dataset.tool;
      document.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('active', b === btn));
      if (ui.tool !== 'ruler' && cad2d) { cad2d.rulerLine = null; cad2d.render(); }
    });
  });

  $('btn-snap').addEventListener('click', e => { ui.snap = !ui.snap; e.currentTarget.classList.toggle('active', ui.snap); });
  $('snap-select').addEventListener('change', e => { ui.snapSize = Number(e.target.value) || 10; });
  $('btn-dims').addEventListener('click', e => { ui.showDims = !ui.showDims; e.currentTarget.classList.toggle('active', ui.showDims); if (cad2d) cad2d.render(); });
  $('btn-ergo').addEventListener('click', e => { ui.showErgonomics = !ui.showErgonomics; e.currentTarget.classList.toggle('active', ui.showErgonomics); if (cad2d) cad2d.render(); });
  $('btn-ceiling').addEventListener('click', e => {
    ui.showCeiling = !ui.showCeiling;
    e.currentTarget.classList.toggle('active', ui.showCeiling);
    if (scene3d) scene3d.setCeilingVisible(ui.showCeiling);
  });

  // Left Dock Tabs
  document.querySelectorAll('.dock-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const t = tab.dataset.tab;
      document.querySelectorAll('.dock-tab').forEach(b => b.classList.toggle('active', b === tab));
      document.querySelectorAll('.dock-pane').forEach(p => p.classList.toggle('active', p.id === `pane-tab-${t}`));
    });
  });

  // AI Natural-Language Prompt + Auto-Arrange
  const runPrompt = () => {
    const txt = $('ai-prompt-input').value.trim();
    if (!txt) return;
    const p = DC.parseRoomPrompt(txt);
    state = DC.generateFullRoom({
      type: p.type, style: p.style, shape: p.shape,
      w: p.w || undefined, d: p.d || undefined, h: state.room.h
    });
    ui.selection = null;
    commitHistory();
    fullSyncAll(true);
    showToast(`🔮 AI: ${p.type} · ${p.style} (${state.room.w}×${state.room.d} cm)`);
  };
  $('btn-ai-prompt').addEventListener('click', runPrompt);
  $('ai-prompt-input').addEventListener('keydown', e => { if (e.key === 'Enter') runPrompt(); });
  $('btn-auto-arrange').addEventListener('click', () => {
    state = DC.generateFullRoom({
      type: state.room.type, shape: state.room.shape, style: state.room.style,
      w: state.room.w, d: state.room.d, h: state.room.h
    });
    ui.selection = null;
    commitHistory();
    fullSyncAll(true);
    showToast(ui.lang === 'fr' ? '✨ Pièce réaménagée sans collision !' : '✨ Room Auto-Arranged Collision-Free!');
  });

  // Live Room Geometry Resize
  const onLiveRoomChange = () => {
    state.room.type = $('live-room-type').value;
    state.room.shape = $('live-room-shape').value;
    state.room.w = Math.max(240, Math.min(1200, Number($('live-room-w').value) || 520));
    state.room.d = Math.max(220, Math.min(1000, Number($('live-room-d').value) || 420));
    state.room.h = Math.max(220, Math.min(450, Number($('live-room-h').value) || 270));
    state.furniture.forEach(f => DC.clampItemToRoom(f, state.room));
    commitHistory();
    fullSyncAll(true);
  };
  ['live-room-type', 'live-room-shape', 'live-room-w', 'live-room-d', 'live-room-h'].forEach(id => $(id).addEventListener('change', onLiveRoomChange));

  // Catalog Search
  $('furn-search').addEventListener('input', e => { ui.catalogQuery = e.target.value; renderCatalog(); });

  // Quick Door / Window Buttons in Arch Tab
  const quickAddOpening = isDoor => {
    const geom = DC.buildRoomGeometry(state.room);
    const wall = geom.walls.find(w => !w.isPartition && w.len >= 140) || geom.walls[0];
    const w = isDoor ? 88 : Math.min(160, Math.round(wall.len * 0.4));
    const obj = isDoor
      ? { uid: DC.makeUid('door'), wallId: wall.id, offset: Math.round((wall.len - w) * 0.5), w, h: 210, style: 'single', swing: 'inward', hinge: 'left', color: '#8f6b47' }
      : { uid: DC.makeUid('win'), wallId: wall.id, offset: Math.round((wall.len - w) * 0.5), w, h: 145, sill: 82, style: 'double', color: '#2b303a' };
    (isDoor ? state.doors : state.windows).push(obj);
    ui.selection = { kind: isDoor ? 'door' : 'window', uid: obj.uid };
    commitHistory();
    fullSyncAll(false);
  };
  $('btn-quick-door').addEventListener('click', () => quickAddOpening(true));
  $('btn-quick-window').addEventListener('click', () => quickAddOpening(false));

  // Materials & Lighting Controls (100% Crash-Free!)
  $('sel-floor-mat').addEventListener('change', e => { state.room.floorMaterial = e.target.value; commitHistory(); fullSyncAll(false); });
  $('col-floor').addEventListener('input', e => { state.room.floorColor = e.target.value; fullSyncAll(false); });
  $('sel-wall-mat').addEventListener('change', e => { state.room.wallMaterial = e.target.value; commitHistory(); fullSyncAll(false); });
  $('col-wall').addEventListener('input', e => { state.room.wallColor = e.target.value; fullSyncAll(false); });
  $('sel-accent-mat').addEventListener('change', e => {
    state.room.accentMaterial = e.target.value;
    if (!state.room.wallStyles) state.room.wallStyles = {};
    state.room.wallStyles.w0 = { material: e.target.value, color: state.room.accentColor };
    commitHistory(); fullSyncAll(false);
  });
  $('col-accent').addEventListener('input', e => {
    state.room.accentColor = e.target.value;
    if (!state.room.wallStyles) state.room.wallStyles = {};
    state.room.wallStyles.w0 = { material: state.room.accentMaterial, color: e.target.value };
    fullSyncAll(false);
  });

  const ENV_PRESETS = {
    day:    { timeOfDay: 13.5, ambient: 0.78, lampsOn: true },
    sunset: { timeOfDay: 16.5, ambient: 0.68, lampsOn: true },
    blue:   { timeOfDay: 18.2, ambient: 0.52, lampsOn: true },
    night:  { timeOfDay: 21.0, ambient: 0.36, lampsOn: true }
  };
  document.querySelectorAll('.env-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = ENV_PRESETS[btn.dataset.env] || ENV_PRESETS.day;
      state.lighting = { ...state.lighting, ...p, preset: btn.dataset.env };
      renderDesignTabValues();
      if (scene3d) { scene3d.updateLighting(state); scene3d.rebuildFurniture(state); }
    });
  });

  $('slider-time').addEventListener('input', e => {
    state.lighting.timeOfDay = Number(e.target.value);
    renderDesignTabValues();
    if (scene3d) scene3d.updateLighting(state);
  });
  $('slider-ambient').addEventListener('input', e => {
    state.lighting.ambient = Number(e.target.value) / 100;
    renderDesignTabValues();
    if (scene3d) scene3d.updateLighting(state);
  });
  $('chk-lamps').addEventListener('change', e => {
    state.lighting.lampsOn = e.target.checked;
    if (scene3d) scene3d.rebuildFurniture(state);
  });

  // Devis Budget & Currency
  $('budget-limit').addEventListener('change', e => { state.budgetLimit = Math.max(500, Number(e.target.value) || 8500); renderDevisPanel(); });
  $('currency-select').addEventListener('change', e => { state.currency = e.target.value; renderCatalog(); renderDevisPanel(); });

  // 2D Zoom Controls
  $('btn-2d-zoom-in').addEventListener('click', () => cad2d && cad2d.zoomBy(1.2));
  $('btn-2d-zoom-out').addEventListener('click', () => cad2d && cad2d.zoomBy(0.84));
  $('btn-2d-reset').addEventListener('click', () => cad2d && cad2d.resetView());

  // Export Modal & All 9 Cards
  $('btn-export-open').addEventListener('click', () => { setExportStatus(''); $('modal-export').classList.remove('hidden'); });
  $('btn-export-close').addEventListener('click', () => $('modal-export').classList.add('hidden'));
  $('modal-export').addEventListener('click', e => { if (e.target === $('modal-export')) $('modal-export').classList.add('hidden'); });

  $('exp-btn-png3d').addEventListener('click', () => requestExportPermission('png', () => {
    const res = exportRender2KPNG(scene3d, state);
    setExportStatus(`✅ Exported 2K Render: ${res.filename} (${(res.size / 1024).toFixed(0)} KB)`);
  }));
  $('exp-btn-pdf').addEventListener('click', () => requestExportPermission('pdf', () => {
    const res = exportClientPDF(scene3d, cad2d, state, ui.unit, ui.lang);
    setExportStatus(`✅ Exported Client Dossier PDF: ${res.filename}`);
  }));
  $('exp-btn-svg').addEventListener('click', () => requestExportPermission('svg', () => {
    const res = exportBlueprintSVG(state, ui.unit, ui.lang);
    setExportStatus(`✅ Exported Architectural CAD SVG: ${res.filename} (${(res.size / 1024).toFixed(1)} KB)`);
  }));
  $('exp-btn-glb').addEventListener('click', () => requestExportPermission('glb', async () => {
    setExportStatus('🧊 Encoding 1:1 PBR GLB...');
    const res = await exportGLB(scene3d, state);
    setExportStatus(`✅ Exported 1:1 GLB: ${res.filename} (${(res.size / 1024).toFixed(0)} KB)`);
  }));
  $('exp-btn-stl').addEventListener('click', () => requestExportPermission('stl', () => {
    const res = exportSTL(scene3d, state);
    setExportStatus(`✅ Exported Millimeter STL: ${res.filename} (${(res.size / 1024).toFixed(0)} KB)`);
  }));
  $('exp-btn-obj').addEventListener('click', () => requestExportPermission('obj', () => {
    const res = exportOBJ(scene3d, state);
    setExportStatus(`✅ Exported 1:1 OBJ: ${res.filename} (${(res.size / 1024).toFixed(0)} KB)`);
  }));
  $('exp-btn-ar').addEventListener('click', async () => {
    $('modal-export').classList.add('hidden');
    await runAR();
  });
  $('exp-btn-csv').addEventListener('click', () => requestExportPermission('csv', () => {
    const res = exportQuoteCSV(state, ui.lang);
    setExportStatus(`✅ Exported Excel CSV Quote: ${res.filename}`);
  }));
  $('exp-btn-proj').addEventListener('click', () => {
    const res = exportProjectFree(state);
    setExportStatus(`✅ Saved FREE Backup: ${res.filename} (${(res.size / 1024).toFixed(1)} KB)`);
  });

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Y, Delete, Escape)
  window.addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    else if (e.key === 'Escape') { $('modal-export').classList.add('hidden'); ui.selection = null; renderInspector(); if (cad2d) cad2d.render(); }
    else if ((e.key === 'Delete' || e.key === 'Backspace') && ui.selection) {
      if (ui.selection.kind === 'furniture') state.furniture = state.furniture.filter(f => f.uid !== ui.selection.uid);
      else if (ui.selection.kind === 'door') state.doors = state.doors.filter(d => d.uid !== ui.selection.uid);
      else if (ui.selection.kind === 'window') state.windows = state.windows.filter(w => w.uid !== ui.selection.uid);
      ui.selection = null;
      commitHistory();
      fullSyncAll(false);
    }
  });
}

// =========================================================================
// 7. HOST NEXUS CONTRACTS (getAppState, getAppTags, sp_remix_state)
// =========================================================================

window.getAppState = () => (state ? cloneProjectState(state) : null);
window.getAppTags = () => {
  if (!state) return ['interior', 'design', '3d'];
  return ['interior-design', state.room.type, state.room.style, state.room.shape];
};

// =========================================================================
// 8. BOOTSTRAP
// =========================================================================

function boot() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('lang') === 'en') ui.lang = 'en';

  // Init 2D CAD & Photorealistic 3D Engines
  cad2d = new window.Blueprint2D($('canvas-2d'), {
    getState: () => state,
    getUI: () => ui,
    onSelect: sel => { ui.selection = sel; renderInspector(); renderArchPanel(); },
    onMutate: (rebuildFull, movedUid) => {
      if (!rebuildFull && movedUid && scene3d) {
        const moved = state.furniture.find(f => f.uid === movedUid);
        if (moved) scene3d.updateItemTransform(moved);
        renderRoomStats();
        return;
      }
      fullSyncAll(false);
    },
    onCommitHistory: commitHistory
  });

  scene3d = new InteriorScene3D($('container-3d'), {
    onSelect3D: sel => { ui.selection = sel; renderInspector(); if (cad2d) cad2d.render(); }
  });

  if (typeof ResizeObserver !== 'undefined') {
    const ro2d = new ResizeObserver(() => cad2d && cad2d.resize());
    ro2d.observe($('canvas-2d').parentElement);
  }

  // Restore sp_remix_state if launched from Community/Nexus Remix, else default preview ready behind wizard
  let loadedRemix = false;
  try {
    const raw = localStorage.getItem('sp_remix_state');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.room && Array.isArray(parsed.furniture)) {
        state = parsed;
        loadedRemix = true;
        localStorage.removeItem('sp_remix_state');
      }
    }
  } catch (_) {}

  if (!state) {
    state = DC.generateFullRoom({ type: 'living', shape: 'rect', style: 'modern', w: 560, d: 440, h: 270 });
  }

  bindEvents();
  setLanguage(ui.lang);
  commitHistory();
  fullSyncAll(true);

  if (loadedRemix) $('wizard-overlay').classList.add('hidden');

  // Query live Studios-Pro user status right on boot!
  if (hostChannel && window.parent !== window) {
    try { hostChannel.postMessage({ type: 'GET_USER_STATUS' }); } catch (_) {}
  }
}

boot();
