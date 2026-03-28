// ArchitectPro — Interactive 2D Floor Plan Editor
"use strict";

/* ── DATA MODEL ─────────────────────────────────────────────── */
const floorPlan = { floors: [], currentFloor: 0 };
let editorTool = 'select', editorDrawing = false;
let editorStartM = { x: 0, y: 0 }, editorCurrentM = { x: 0, y: 0 };
let selectedElement = null, hoveredElement = null;
let editorScale = 50, editorOrigin = { x: 40, y: 40 };
let showGrid = true;
const undoStack = [], redoStack = [], MAX_UNDO = 50;
let newWallProps = { thickness: 0.15, color: '#c8a882' };
let newWinProps = { width: 1.2, height: 1.4, color: '#93c5fd', style: 'modern' };
let newDoorProps = { width: 0.9, height: 2.1, color: '#7c4a1e', swing: 'left' };
let newStairProps = { width: 2.5, length: 4.0, direction: 'up' };
let _animEditorId = null;

function genId() { return 'el_' + Math.random().toString(36).substr(2, 9); }

/* ── INIT ───────────────────────────────────────────────────── */
function initEditor() {
    initFloorPlan();
    setupEditorCanvas();
    buildToolbar();
    buildFloorTabs();
    buildToolOptions();
    drawEditor();
}

function initFloorPlan() {
    floorPlan.floors = []; floorPlan.currentFloor = 0;
    const labels = { en: ['Ground Floor', 'Floor 1', 'Floor 2', 'Floor 3', 'Floor 4', 'Floor 5'], fr: ['Rez-de-chaussée', 'Étage 1', 'Étage 2', 'Étage 3', 'Étage 4', 'Étage 5'] };
    for (let i = 0; i < (project.floors || 1); i++) {
        floorPlan.floors.push({
            id: i, label: (labels[lang] || labels.en)[i] || `Floor ${i}`,
            walls: [], windows: [], doors: [], stairs: []
        });
    }
}

function setupEditorCanvas() {
    const c = document.getElementById('canvas-editor');
    if (!c) return;
    resizeEditorCanvas();
    c.addEventListener('mousedown', onEdDown);
    c.addEventListener('mousemove', onEdMove);
    c.addEventListener('mouseup', onEdUp);
    c.addEventListener('mouseleave', () => { if (editorTool === 'wall') editorDrawing = false; hoveredElement = null; drawEditor(); });
    c.addEventListener('contextmenu', e => { e.preventDefault(); editorDrawing = false; drawEditor(); });
    c.addEventListener('touchstart', e => { e.preventDefault(); const t = e.touches[0]; onEdDown(touchEvt(t, c)); }, { passive: false });
    c.addEventListener('touchmove', e => { e.preventDefault(); const t = e.touches[0]; onEdMove(touchEvt(t, c)); }, { passive: false });
    c.addEventListener('touchend', e => { e.preventDefault(); onEdUp({}); }, { passive: false });
}

function touchEvt(t, c) { const r = c.getBoundingClientRect(); return { offsetX: t.clientX - r.left, offsetY: t.clientY - r.top }; }

function resizeEditorCanvas() {
    const c = document.getElementById('canvas-editor'); if (!c) return;
    const wrap = c.parentElement;
    const w = wrap.offsetWidth || 600, h = Math.max(480, wrap.offsetHeight || 480);
    c.width = w; c.height = h;
    if (project.length) {
        const sx = (w - 80) / project.length, sy = (h - 80) / project.width;
        editorScale = Math.min(sx, sy, 80);
        editorOrigin.x = (w - project.length * editorScale) / 2;
        editorOrigin.y = (h - project.width * editorScale) / 2;
    }
    drawEditor();
}

/* ── COORDS ─────────────────────────────────────────────────── */
function m2c(mx, my) { return { x: editorOrigin.x + mx * editorScale, y: editorOrigin.y + my * editorScale }; }
function c2m(px, py) { return { x: (px - editorOrigin.x) / editorScale, y: (py - editorOrigin.y) / editorScale }; }
function snapGrid(mx, my) { const g = 0.25; return { x: Math.round(mx / g) * g, y: Math.round(my / g) * g }; }

function snapPoint(px, py) {
    let { x, y } = c2m(px, py);
    x = Math.max(-1, Math.min(project.length + 1, x));
    y = Math.max(-1, Math.min(project.width + 1, y));
    let gs = snapGrid(x, y);
    // snap to wall endpoints within 16px
    const th = 16 / editorScale;
    const fl = floorPlan.floors[floorPlan.currentFloor];
    const extW = getExtWalls();
    const allW = [...extW, ...fl.walls];
    let best = null, bd = th;
    allW.forEach(w => {
        [[w.x1, w.y1], [w.x2, w.y2]].forEach(([ex, ey]) => {
            const d = Math.hypot(gs.x - ex, gs.y - ey);
            if (d < bd) { bd = d; best = { x: ex, y: ey }; }
        });
    });
    return best || gs;
}

/* ── EXTERIOR WALLS ─────────────────────────────────────────── */
function getExtWalls() {
    const L = project.length, W = project.width;
    return [{ id: 'ext-top', x1: 0, y1: 0, x2: L, y2: 0, ext: true },
    { id: 'ext-right', x1: L, y1: 0, x2: L, y2: W, ext: true },
    { id: 'ext-bot', x1: L, y1: W, x2: 0, y2: W, ext: true },
    { id: 'ext-left', x1: 0, y1: W, x2: 0, y2: 0, ext: true }];
}

/* ── NEAREST WALL ───────────────────────────────────────────── */
function ptSegDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1, lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return { dist: Math.hypot(px - x1, py - y1), t: 0 };
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return { dist: Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy)), t };
}

function findNearestWall(mx, my) {
    const fl = floorPlan.floors[floorPlan.currentFloor];
    const all = [...getExtWalls(), ...fl.walls];
    let best = null, bd = 32 / editorScale;
    all.forEach(w => {
        const r = ptSegDist(mx, my, w.x1, w.y1, w.x2, w.y2);
        if (r.dist < bd) { bd = r.dist; best = { wall: w, t: r.t }; }
    });
    return best;
}

function findElemAt(mx, my) {
    const fl = floorPlan.floors[floorPlan.currentFloor];
    const th = 20 / editorScale;
    for (const s of fl.stairs) { if (mx >= s.x - th && mx <= s.x + s.length + th && my >= s.y - th && my <= s.y + s.width + th) return { type: 'stairs', id: s.id }; }
    for (const w of fl.windows) { const p = elemPos(w); if (p && Math.hypot(mx - p.cx, my - p.cy) < th) return { type: 'window', id: w.id }; }
    for (const d of fl.doors) { const p = elemPos(d); if (p && Math.hypot(mx - p.cx, my - p.cy) < th) return { type: 'door', id: d.id }; }
    for (const w of fl.walls) { if (ptSegDist(mx, my, w.x1, w.y1, w.x2, w.y2).dist < th) return { type: 'wall', id: w.id }; }
    return null;
}

function elemPos(el) {
    const fl = floorPlan.floors[floorPlan.currentFloor];
    const all = [...getExtWalls(), ...fl.walls];
    const w = all.find(w => w.id === el.wallId);
    if (!w) return null;
    return { cx: w.x1 + el.t * (w.x2 - w.x1), cy: w.y1 + el.t * (w.y2 - w.y1) };
}

/* ── MOUSE EVENTS ───────────────────────────────────────────── */
function onEdDown(e) {
    const px = e.offsetX || 0, py = e.offsetY || 0;
    const mp = snapPoint(px, py);
    const rawM = c2m(px, py);
    switch (editorTool) {
        case 'select': handleSelect(rawM.x, rawM.y); break;
        case 'wall': editorDrawing = true; editorStartM = { ...mp }; editorCurrentM = { ...mp }; break;
        case 'window': placeWin(rawM.x, rawM.y); break;
        case 'door': placeDoor(rawM.x, rawM.y); break;
        case 'stairs': placeStairs(mp); break;
        case 'erase': eraseAt(rawM.x, rawM.y); break;
    }
}
function onEdMove(e) {
    const px = e.offsetX || 0, py = e.offsetY || 0;
    editorCurrentM = snapPoint(px, py);
    const rawM = c2m(px, py);
    hoveredElement = editorTool === 'select' || editorTool === 'erase' ? findElemAt(rawM.x, rawM.y) : null;
    drawEditor();
}
function onEdUp(e) { if (editorDrawing && editorTool === 'wall') finishWall(); }

/* ── WALL TOOL ──────────────────────────────────────────────── */
function finishWall() {
    editorDrawing = false;
    const len = Math.hypot(editorCurrentM.x - editorStartM.x, editorCurrentM.y - editorStartM.y);
    if (len < 0.3) { drawEditor(); return; }
    saveUndo();
    floorPlan.floors[floorPlan.currentFloor].walls.push({
        id: genId(), x1: editorStartM.x, y1: editorStartM.y,
        x2: editorCurrentM.x, y2: editorCurrentM.y,
        thickness: newWallProps.thickness, color: newWallProps.color
    });
    drawEditor(); syncFloorPlanTo3D(); showToast('✅ Wall added', 'success');
}

/* ── WINDOW / DOOR ──────────────────────────────────────────── */
function placeWin(mx, my) {
    const hit = findNearestWall(mx, my);
    if (!hit) { showToast('⚠️ Click on a wall', 'warn'); return; }
    saveUndo();
    floorPlan.floors[floorPlan.currentFloor].windows.push({
        id: genId(), wallId: hit.wall.id, t: hit.t,
        width: newWinProps.width, height: newWinProps.height,
        color: newWinProps.color, style: newWinProps.style
    });
    drawEditor(); syncFloorPlanTo3D(); showToast('🪟 Window placed', 'success');
}

function placeDoor(mx, my) {
    const hit = findNearestWall(mx, my);
    if (!hit) { showToast('⚠️ Click on a wall', 'warn'); return; }
    saveUndo();
    floorPlan.floors[floorPlan.currentFloor].doors.push({
        id: genId(), wallId: hit.wall.id, t: hit.t,
        width: newDoorProps.width, height: newDoorProps.height,
        color: newDoorProps.color, swing: newDoorProps.swing
    });
    drawEditor(); syncFloorPlanTo3D(); showToast('🚪 Door placed', 'success');
}

/* ── STAIRS ─────────────────────────────────────────────── */
function placeStairs(mp) {
    if ((project.floors || 1) < 2) { showToast('⚠️ Stairs need 2+ floors', 'warn'); return; }
    saveUndo();
    floorPlan.floors[floorPlan.currentFloor].stairs.push({
        id: genId(), x: mp.x, y: mp.y,
        width: newStairProps.width, length: newStairProps.length, direction: newStairProps.direction
    });
    drawEditor(); syncFloorPlanTo3D(); showToast('🪜 Stairs placed', 'success');
}

/* ── SELECT ─────────────────────────────────────────────── */
function handleSelect(mx, my) {
    selectedElement = findElemAt(mx, my);
    if (selectedElement) showProps(selectedElement);
    else hideProps();
    drawEditor();
}

/* ── ERASE ──────────────────────────────────────────────────── */
function eraseAt(mx, my) {
    const el = findElemAt(mx, my); if (!el) return;
    saveUndo(); eraseById(el.type, el.id, floorPlan.currentFloor);
}

function eraseById(type, id, fi) {
    const fl = floorPlan.floors[fi];
    if (type === 'wall') { fl.walls = fl.walls.filter(w => w.id !== id); fl.windows = fl.windows.filter(w => w.wallId !== id); fl.doors = fl.doors.filter(d => d.wallId !== id); }
    else if (type === 'window') fl.windows = fl.windows.filter(w => w.id !== id);
    else if (type === 'door') fl.doors = fl.doors.filter(d => d.id !== id);
    else if (type === 'stairs') fl.stairs = fl.stairs.filter(s => s.id !== id);
    if (selectedElement && selectedElement.id === id) { selectedElement = null; hideProps(); }
    drawEditor(); syncFloorPlanTo3D();
}

/* ── UNDO/REDO ──────────────────────────────────────────────── */
function saveUndo() { redoStack.length = 0; undoStack.push(JSON.stringify(floorPlan.floors)); if (undoStack.length > MAX_UNDO) undoStack.shift(); updUndoBtns(); }
function editorUndo() { if (!undoStack.length) return; redoStack.push(JSON.stringify(floorPlan.floors)); floorPlan.floors = JSON.parse(undoStack.pop()); selectedElement = null; hideProps(); drawEditor(); syncFloorPlanTo3D(); updUndoBtns(); showToast('↩ Undone', 'success'); }
function editorRedo() { if (!redoStack.length) return; undoStack.push(JSON.stringify(floorPlan.floors)); floorPlan.floors = JSON.parse(redoStack.pop()); drawEditor(); syncFloorPlanTo3D(); updUndoBtns(); showToast('↪ Redone', 'success'); }
function updUndoBtns() {
    const u = document.getElementById('btn-undo'), r = document.getElementById('btn-redo');
    if (u) u.disabled = !undoStack.length; if (r) r.disabled = !redoStack.length;
}
function toggleGrid() { showGrid = !showGrid; document.getElementById('btn-grid').classList.toggle('active', showGrid); drawEditor(); }

/* ── TOOL SELECTOR ──────────────────────────────────────────── */
function setTool(t) {
    editorTool = t; editorDrawing = false; selectedElement = null; hideProps();
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('tool-' + t); if (btn) btn.classList.add('active');
    const wrap = document.getElementById('editor-canvas-wrap'); if (wrap) wrap.setAttribute('data-tool', t);
    buildToolOptions();
    drawEditor();
}

/* ── TOOL OPTIONS BAR ───────────────────────────────────────── */
function buildToolOptions() {
    const bar = document.getElementById('tool-options-bar'); if (!bar) return;
    const t = editorTool;
    let h = '';

    if (t === 'select') {
        h = `<div class="tool-opt-title">↖ Select</div>
       <div style="font-size:0.75rem;color:var(--text-muted)">Click any element on the floor plan to edit its properties or delete it.</div>`;
    }
    else if (t === 'wall') {
        h = `<div class="tool-opt-title">▬ Wall</div>
       <div class="tool-opt-group"><span class="tool-opt-label">Thickness</span>
       <input type="number" class="tool-opt-input" step="0.05" min="0.05" max="0.5" value="${newWallProps.thickness}" onchange="newWallProps.thickness=+this.value;buildToolOptions()"/><span>${unitSystem === 'imperial' ? 'ft' : 'm'}</span></div>
       <div class="tool-opt-group"><span class="tool-opt-label">Color</span>
       <input type="color" class="tool-opt-color" value="${newWallProps.color}" onchange="newWallProps.color=this.value;buildToolOptions()"/></div>`;
    }
    else if (t === 'window') {
        h = `<div class="tool-opt-title">🪟 Window</div>
       <div class="tool-opt-group"><span class="tool-opt-label">Width</span>
       <input type="number" class="tool-opt-input" step="0.1" min="0.5" max="3.0" value="${newWinProps.width}" onchange="newWinProps.width=+this.value;buildToolOptions()"/><span>${unitSystem === 'imperial' ? 'ft' : 'm'}</span></div>
       <div class="tool-opt-group"><span class="tool-opt-label">Height</span>
       <input type="number" class="tool-opt-input" step="0.1" min="0.5" max="2.4" value="${newWinProps.height}" onchange="newWinProps.height=+this.value;buildToolOptions()"/><span>${unitSystem === 'imperial' ? 'ft' : 'm'}</span></div>
       <div class="tool-opt-group"><span class="tool-opt-label">Glass Color</span>
       <input type="color" class="tool-opt-color" value="${newWinProps.color}" onchange="newWinProps.color=this.value;buildToolOptions()"/></div>
       <div class="tool-opt-group"><span class="tool-opt-label">Style</span>
       <select class="tool-opt-input" style="width:80px" onchange="newWinProps.style=this.value;buildToolOptions()">
         <option value="modern" ${newWinProps.style === 'modern' ? 'selected' : ''}>Modern</option>
         <option value="minimal" ${newWinProps.style === 'minimal' ? 'selected' : ''}>Minimal</option>
         <option value="classic" ${newWinProps.style === 'classic' ? 'selected' : ''}>Classic</option>
       </select></div>`;
    }
    else if (t === 'door') {
        h = `<div class="tool-opt-title">🚪 Door</div>
       <div class="tool-opt-group"><span class="tool-opt-label">Width</span>
       <input type="number" class="tool-opt-input" step="0.1" min="0.6" max="2.0" value="${newDoorProps.width}" onchange="newDoorProps.width=+this.value;buildToolOptions()"/><span>${unitSystem === 'imperial' ? 'ft' : 'm'}</span></div>
       <div class="tool-opt-group"><span class="tool-opt-label">Height</span>
       <input type="number" class="tool-opt-input" step="0.1" min="1.8" max="2.5" value="${newDoorProps.height}" onchange="newDoorProps.height=+this.value;buildToolOptions()"/><span>${unitSystem === 'imperial' ? 'ft' : 'm'}</span></div>
       <div class="tool-opt-group"><span class="tool-opt-label">Swing</span>
       <button class="tool-opt-btn ${newDoorProps.swing === 'left' ? 'active' : ''}" onclick="newDoorProps.swing='left';buildToolOptions()">◁ L</button>
       <button class="tool-opt-btn ${newDoorProps.swing === 'right' ? 'active' : ''}" onclick="newDoorProps.swing='right';buildToolOptions()">▷ R</button></div>
       <div class="tool-opt-group"><span class="tool-opt-label">Color</span>
       <input type="color" class="tool-opt-color" value="${newDoorProps.color}" onchange="newDoorProps.color=this.value;buildToolOptions()"/></div>`;
    }
    else if (t === 'stairs') {
        h = `<div class="tool-opt-title">🪜 Stairs</div>
       <div class="tool-opt-group"><span class="tool-opt-label">Width</span>
       <input type="number" class="tool-opt-input" step="0.1" min="0.8" max="3.0" value="${newStairProps.width}" onchange="newStairProps.width=+this.value;buildToolOptions()"/><span>${unitSystem === 'imperial' ? 'ft' : 'm'}</span></div>
       <div class="tool-opt-group"><span class="tool-opt-label">Length</span>
       <input type="number" class="tool-opt-input" step="0.1" min="2.0" max="8.0" value="${newStairProps.length}" onchange="newStairProps.length=+this.value;buildToolOptions()"/><span>${unitSystem === 'imperial' ? 'ft' : 'm'}</span></div>
       <div class="tool-opt-group"><span class="tool-opt-label">Direction</span>
       ${[['→', 'right'], ['←', 'left'], ['↑', 'up'], ['↓', 'down']].map(([ic, d]) => `<button class="tool-opt-btn ${newStairProps.direction === d ? 'active' : ''}" onclick="newStairProps.direction='${d}';buildToolOptions()">${ic}</button>`).join('')}
       </div>`;
    }
    else if (t === 'erase') {
        h = `<div class="tool-opt-title">🗑️ Erase</div>
       <div style="font-size:0.75rem;color:var(--text-muted)">Click any element on the floor plan to remove it permanently.</div>`;
    }

    bar.innerHTML = h;
}

/* ── PROPERTIES PANEL ───────────────────────────────────────── */
function showProps(el) {
    const panel = document.getElementById('properties-panel'); if (!panel) return;
    const fl = floorPlan.floors[floorPlan.currentFloor];
    let target;
    if (el.type === 'wall') target = fl.walls.find(w => w.id === el.id);
    else if (el.type === 'window') target = fl.windows.find(w => w.id === el.id);
    else if (el.type === 'door') target = fl.doors.find(d => d.id === el.id);
    else if (el.type === 'stairs') target = fl.stairs.find(s => s.id === el.id);
    if (!target) { hideProps(); return; }

    const typeLabels = { wall: '▬ Interior Wall', window: '🪟 Window', door: '🚪 Door', stairs: '🪜 Staircase' };
    let h = `<div class="prop-header"><span class="prop-type-label">${typeLabels[el.type]}</span><button class="prop-close" onclick="hideProps()">✕</button></div>`;

    if (el.type === 'wall') {
        const len = Math.hypot(target.x2 - target.x1, target.y2 - target.y1);
        h += `<div class="prop-row"><label>Length</label><span class="prop-val">${fmtLen(len)}</span></div>
    <div class="prop-row"><label>Thickness</label><div class="prop-btns">
    ${[0.10, 0.15, 0.20, 0.30].map(t => `<button class="prop-btn ${Math.abs(target.thickness - t) < 0.01 ? 'active' : ''}" onclick="upWall('${target.id}','thickness',${t})">${fmtLen(t)}</button>`).join('')}
    </div></div>
    <div class="prop-row"><label>Color</label><input type="color" value="${target.color}" onchange="upWall('${target.id}','color',this.value)"/></div>
    <button class="prop-delete-btn" onclick="eraseById('wall','${el.id}',${floorPlan.currentFloor})">🗑️ Delete</button>`;
    } else if (el.type === 'window') {
        h += `<div class="prop-row"><label>Width</label><input type="range" min="0.5" max="3.0" step="0.1" value="${target.width}"
    oninput="upWin('${target.id}','width',+this.value);this.nextElementSibling.textContent=fmtLen(+this.value)"/><span>${fmtLen(target.width)}</span></div>
    <div class="prop-row"><label>Height</label><input type="range" min="0.5" max="2.4" step="0.1" value="${target.height}"
    oninput="upWin('${target.id}','height',+this.value);this.nextElementSibling.textContent=fmtLen(+this.value)"/><span>${fmtLen(target.height)}</span></div>
    <div class="prop-row"><label>Glass Color</label><input type="color" value="${target.color}" onchange="upWin('${target.id}','color',this.value)"/></div>
    <div class="prop-row"><label>Style</label><div class="prop-btns">
    ${['minimal', 'classic', 'modern'].map(s => `<button class="prop-btn ${target.style === s ? 'active' : ''}" onclick="upWin('${target.id}','style','${s}')">${s}</button>`).join('')}
    </div></div>
    <button class="prop-delete-btn" onclick="eraseById('window','${el.id}',${floorPlan.currentFloor})">🗑️ Delete</button>`;
    } else if (el.type === 'door') {
        h += `<div class="prop-row"><label>Width</label><div class="prop-btns">
    ${[0.7, 0.8, 0.9, 1.0, 1.2].map(w => `<button class="prop-btn ${Math.abs(target.width - w) < 0.01 ? 'active' : ''}" onclick="upDoor('${target.id}','width',${w})">${fmtLen(w, true)}</button>`).join('')}
    </div></div>
    <div class="prop-row"><label>Height</label><div class="prop-btns">
    ${[2.0, 2.1, 2.4].map(hh => `<button class="prop-btn ${Math.abs(target.height - hh) < 0.01 ? 'active' : ''}" onclick="upDoor('${target.id}','height',${hh})">${fmtLen(hh, true)}</button>`).join('')}
    </div></div>
    <div class="prop-row"><label>Swing</label><div class="prop-btns">
    <button class="prop-btn ${target.swing === 'left' ? 'active' : ''}" onclick="upDoor('${target.id}','swing','left')">◁ Left</button>
    <button class="prop-btn ${target.swing === 'right' ? 'active' : ''}" onclick="upDoor('${target.id}','swing','right')">▷ Right</button>
    </div></div>
    <div class="prop-row"><label>Color</label><input type="color" value="${target.color}" onchange="upDoor('${target.id}','color',this.value)"/></div>
    <button class="prop-delete-btn" onclick="eraseById('door','${el.id}',${floorPlan.currentFloor})">🗑️ Delete</button>`;
    } else if (el.type === 'stairs') {
        h += `<div class="prop-row"><label>Width</label><input type="range" min="0.8" max="3.5" step="0.1" value="${target.width}"
    oninput="upStairs('${target.id}','width',+this.value);this.nextElementSibling.textContent=fmtLen(+this.value)"/><span>${fmtLen(target.width)}</span></div>
    <div class="prop-row"><label>Length</label><input type="range" min="2.0" max="8.0" step="0.1" value="${target.length}"
    oninput="upStairs('${target.id}','length',+this.value);this.nextElementSibling.textContent=fmtLen(+this.value)"/><span>${fmtLen(target.length)}</span></div>
    <div class="prop-row"><label>Direction</label><div class="prop-btns">
    ${[['→', 'right'], ['←', 'left'], ['↑', 'up'], ['↓', 'down']].map(([ic, d]) => `<button class="prop-btn ${target.direction === d ? 'active' : ''}" onclick="upStairs('${target.id}','direction','${d}')">${ic}</button>`).join('')}
    </div></div>
    <button class="prop-delete-btn" onclick="eraseById('stairs','${el.id}',${floorPlan.currentFloor})">🗑️ Delete</button>`;
    }

    panel.innerHTML = h; panel.style.display = 'block';
}

function hideProps() { const p = document.getElementById('properties-panel'); if (p) { p.style.display = 'none'; p.innerHTML = ''; } }
function upWall(id, pr, v) { const fl = floorPlan.floors[floorPlan.currentFloor]; const w = fl.walls.find(w => w.id === id); if (w) { w[pr] = v; drawEditor(); syncFloorPlanTo3D(); if (selectedElement) showProps(selectedElement); } }
function upWin(id, pr, v) { const fl = floorPlan.floors[floorPlan.currentFloor]; const w = fl.windows.find(w => w.id === id); if (w) { w[pr] = v; drawEditor(); syncFloorPlanTo3D(); if (selectedElement) showProps(selectedElement); } }
function upDoor(id, pr, v) { const fl = floorPlan.floors[floorPlan.currentFloor]; const d = fl.doors.find(d => d.id === id); if (d) { d[pr] = v; drawEditor(); syncFloorPlanTo3D(); if (selectedElement) showProps(selectedElement); } }
function upStairs(id, pr, v) { const fl = floorPlan.floors[floorPlan.currentFloor]; const s = fl.stairs.find(s => s.id === id); if (s) { s[pr] = v; drawEditor(); syncFloorPlanTo3D(); if (selectedElement) showProps(selectedElement); } }

/* ── FLOOR TABS ─────────────────────────────────────────────── */
function buildFloorTabs() {
    const cont = document.getElementById('floor-tabs'); if (!cont) return;
    cont.innerHTML = '';
    floorPlan.floors.forEach((fl, i) => {
        const b = document.createElement('button');
        b.className = 'floor-tab' + (i === floorPlan.currentFloor ? ' active' : '');
        b.textContent = fl.label;
        b.onclick = () => { floorPlan.currentFloor = i; selectedElement = null; hideProps(); buildFloorTabs(); drawEditor(); syncFloorPlanTo3D(); };
        cont.appendChild(b);
    });
}

function buildToolbar() {/* toolbar already in HTML */ }

/* ── DRAW EDITOR ────────────────────────────────────────────── */
function drawEditor() {
    const canvas = document.getElementById('canvas-editor'); if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // bg
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0f121a'); bg.addColorStop(1, '#12151e');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    if (!project.length) return;

    if (showGrid) drawGrid(ctx, W, H);

    // house fill
    const hW = project.length * editorScale, hH = project.width * editorScale;
    ctx.fillStyle = 'rgba(26,30,43,0.95)';
    ctx.fillRect(editorOrigin.x, editorOrigin.y, hW, hH);

    const fl = floorPlan.floors[floorPlan.currentFloor];
    drawExtWalls(ctx);
    if (fl) {
        drawIntWalls(ctx, fl);
        drawWindows(ctx, fl);
        drawDoors(ctx, fl);
        drawStairs(ctx, fl);
        drawRoomAreas(ctx, fl);
    }

    drawDims(ctx);

    // ghost
    if (editorDrawing && editorTool === 'wall') drawWallGhost(ctx);
    if (editorTool === 'stairs' && !editorDrawing) drawStairsGhost(ctx);

    drawHighlights(ctx);
    drawCursorHint(ctx, W, H);

    // floor label
    ctx.font = 'bold 11px Inter,sans-serif';
    ctx.fillStyle = 'rgba(245,158,11,0.85)';
    ctx.textAlign = 'left';
    if (fl) ctx.fillText(fl.label, editorOrigin.x + 4, editorOrigin.y - 8);
}

function drawGrid(ctx, W, H) {
    const gPx = 0.25 * editorScale;
    ctx.strokeStyle = 'rgba(42,47,66,0.5)'; ctx.lineWidth = 0.5;
    const x0 = editorOrigin.x - editorScale, x1 = editorOrigin.x + project.length * editorScale + editorScale;
    const y0 = editorOrigin.y - editorScale, y1 = editorOrigin.y + project.width * editorScale + editorScale;
    for (let x = x0; x <= x1; x += gPx) { ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke(); }
    for (let y = y0; y <= y1; y += gPx) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(53,59,85,0.8)'; ctx.lineWidth = 1;
    for (let x = x0; x <= x1; x += editorScale) { ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke(); }
    for (let y = y0; y <= y1; y += editorScale) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); }
}

function drawExtWalls(ctx) {
    const tPx = Math.max(10, 0.3 * editorScale);
    ctx.lineCap = 'square'; ctx.lineWidth = tPx;
    getExtWalls().forEach(w => {
        const p1 = m2c(w.x1, w.y1), p2 = m2c(w.x2, w.y2);
        ctx.strokeStyle = colors.extWalls; ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    });
    ctx.strokeStyle = 'rgba(139,115,85,0.6)'; ctx.lineWidth = 1;
    const hW = project.length * editorScale, hH = project.width * editorScale;
    ctx.strokeRect(editorOrigin.x, editorOrigin.y, hW, hH);
}

function drawIntWalls(ctx, fl) {
    fl.walls.forEach(w => {
        const sel = selectedElement && selectedElement.id === w.id;
        const hov = hoveredElement && hoveredElement.id === w.id;
        const tPx = Math.max(4, w.thickness * editorScale);
        const p1 = m2c(w.x1, w.y1), p2 = m2c(w.x2, w.y2);
        ctx.lineCap = 'round'; ctx.lineWidth = tPx;
        ctx.strokeStyle = sel ? '#f59e0b' : hov ? '#d4a853' : (w.color || '#c8a882');
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
        [p1, p2].forEach(p => { ctx.fillStyle = sel ? '#f59e0b' : 'rgba(139,115,85,0.8)'; ctx.beginPath(); ctx.arc(p.x, p.y, tPx / 2, 0, Math.PI * 2); ctx.fill(); });
        if (sel || hov) {
            const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
            ctx.font = 'bold 11px Inter,sans-serif'; ctx.fillStyle = '#f59e0b'; ctx.textAlign = 'center';
            ctx.fillText(fmtLen(len), (p1.x + p2.x) / 2, (p1.y + p2.y) / 2 - 10); ctx.textAlign = 'left';
        }
    });
}

function drawWindows(ctx, fl) {
    const allW = [...getExtWalls(), ...fl.walls];
    fl.windows.forEach(win => {
        const wall = allW.find(w => w.id === win.wallId); if (!wall) return;
        const sel = selectedElement && selectedElement.id === win.id;
        const hov = hoveredElement && hoveredElement.id === win.id;
        const cx = wall.x1 + win.t * (wall.x2 - wall.x1), cy = wall.y1 + win.t * (wall.y2 - wall.y1);
        const cp = m2c(cx, cy);
        const ang = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1);
        const hw = win.width / 2 * editorScale, tp = Math.max(6, 0.15 * editorScale);
        ctx.save(); ctx.translate(cp.x, cp.y); ctx.rotate(ang);
        // Cut out wall
        ctx.fillStyle = 'rgba(26,30,43,1)'; ctx.fillRect(-hw, -tp / 2 - 3, hw * 2, tp + 6);
        ctx.fillStyle = win.color + '99'; ctx.fillRect(-hw, -tp / 2 - 3, hw * 2, tp + 6);
        ctx.strokeStyle = sel ? '#f59e0b' : hov ? '#93c5fd' : win.color; ctx.lineWidth = sel ? 3 : 2;
        ctx.strokeRect(-hw, -tp / 2 - 3, hw * 2, tp + 6);
        // glazing bars
        ctx.strokeStyle = win.color + '66'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, -tp / 2 - 3); ctx.lineTo(0, tp / 2 + 3); ctx.stroke();
        ctx.restore();
        if (sel || hov) { ctx.font = '10px Inter,sans-serif'; ctx.fillStyle = '#93c5fd'; ctx.textAlign = 'center'; ctx.fillText(`${fmtLen(win.width, true)}×${fmtLen(win.height)}`, cp.x, cp.y - 16); ctx.textAlign = 'left'; }
    });
}

function drawDoors(ctx, fl) {
    const allW = [...getExtWalls(), ...fl.walls];
    fl.doors.forEach(door => {
        const wall = allW.find(w => w.id === door.wallId); if (!wall) return;
        const sel = selectedElement && selectedElement.id === door.id;
        const hov = hoveredElement && hoveredElement.id === door.id;
        const cx = wall.x1 + door.t * (wall.x2 - wall.x1), cy = wall.y1 + door.t * (wall.y2 - wall.y1);
        const cp = m2c(cx, cy);
        const ang = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1);
        const dw = door.width / 2 * editorScale, tp = Math.max(6, 0.15 * editorScale);
        ctx.save(); ctx.translate(cp.x, cp.y); ctx.rotate(ang);
        // Cut out wall
        ctx.fillStyle = 'rgba(26,30,43,1)'; ctx.fillRect(-dw, -tp / 2 - 3, dw * 2, tp + 6);
        // Door panel
        ctx.fillStyle = door.color + 'cc'; ctx.fillRect(-dw, -tp / 2 - 3, dw * 2, tp + 6);
        ctx.strokeStyle = sel ? '#f59e0b' : hov ? '#fdba74' : door.color; ctx.lineWidth = sel ? 3 : 2;
        ctx.strokeRect(-dw, -tp / 2 - 3, dw * 2, tp + 6);
        // Swing arc
        const sw = door.swing === 'left' ? 1 : -1;
        ctx.strokeStyle = (sel ? '#f59e0b' : door.color) + '88'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.arc(sw < 0 ? -dw : dw, 0, dw * 2, ang + (sw < 0 ? 0 : -Math.PI / 2), ang + (sw < 0 ? Math.PI / 2 : 0)); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        if (sel || hov) { ctx.font = '10px Inter,sans-serif'; ctx.fillStyle = '#fdba74'; ctx.textAlign = 'center'; ctx.fillText(`Door ${fmtLen(door.width)}`, cp.x, cp.y - 16); ctx.textAlign = 'left'; }
    });
}

function drawStairs(ctx, fl) {
    fl.stairs.forEach(s => {
        const sel = selectedElement && selectedElement.id === s.id;
        const hov = hoveredElement && hoveredElement.id === s.id;
        const p = m2c(s.x, s.y);
        const pw = s.length * editorScale, ph = s.width * editorScale;
        // Stair background
        ctx.fillStyle = 'rgba(99,102,241,0.15)'; ctx.fillRect(p.x, p.y, pw, ph);
        ctx.strokeStyle = sel ? '#f59e0b' : hov ? '#a5b4fc' : '#6366f1'; ctx.lineWidth = sel ? 3 : 2;
        ctx.strokeRect(p.x, p.y, pw, ph);
        // Steps lines
        const nSteps = Math.round(s.length / 0.28);
        const stepPx = pw / Math.max(1, nSteps);
        ctx.strokeStyle = 'rgba(99,102,241,0.5)'; ctx.lineWidth = 1;
        for (let i = 1; i < nSteps; i++) { ctx.beginPath(); ctx.moveTo(p.x + i * stepPx, p.y); ctx.lineTo(p.x + i * stepPx, p.y + ph); ctx.stroke(); }
        // Arrow
        ctx.fillStyle = sel ? '#f59e0b' : '#6366f1';
        ctx.font = 'bold 14px Inter,sans-serif'; ctx.textAlign = 'center';
        const arrows = { right: '→', left: '←', up: '↑', down: '↓' };
        ctx.fillText(arrows[s.direction] || '↑', p.x + pw / 2, p.y + ph / 2 + 5);
        ctx.font = '10px Inter,sans-serif'; ctx.fillStyle = '#a5b4fc';
        ctx.fillText(`${fmtLen(s.length, true)}×${fmtLen(s.width)}`, p.x + pw / 2, p.y - 8);
        ctx.textAlign = 'left';
    });
}

function drawRoomAreas(ctx, fl) {
    // Simple approach: find approximate center of each enclosed space
    if (fl.walls.length < 2) return;
    ctx.font = '10px Inter,sans-serif'; ctx.fillStyle = 'rgba(139,144,168,0.6)'; ctx.textAlign = 'center';
    // Just label overall interior area minus walls as a hint
    const area = (project.length * project.width).toFixed(1);
    const c = m2c(project.length / 2, project.width / 2);
    ctx.fillText(`≈${area} m²`, c.x, c.y);
    ctx.textAlign = 'left';
}

function drawDims(ctx) {
    const p0 = m2c(0, 0), p1 = m2c(project.length, 0), p2 = m2c(0, project.width);
    // Horizontal
    ctx.strokeStyle = 'rgba(245,158,11,0.6)'; ctx.fillStyle = 'rgba(245,158,11,0.9)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(p0.x, p0.y - 20); ctx.lineTo(p1.x, p1.y - 20); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = 'bold 11px Inter,sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(fmtLen(project.length), (p0.x + p1.x) / 2, p0.y - 24);
    // Vertical
    ctx.beginPath(); ctx.moveTo(p0.x - 22, p0.y); ctx.lineTo(p2.x - 22, p2.y); ctx.stroke();
    ctx.save(); ctx.translate(p0.x - 26, (p0.y + p2.y) / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText(fmtLen(project.width), 0, 0); ctx.restore();
    ctx.textAlign = 'left';
}

function drawWallGhost(ctx) {
    const p1 = m2c(editorStartM.x, editorStartM.y), p2 = m2c(editorCurrentM.x, editorCurrentM.y);
    const len = Math.hypot(editorCurrentM.x - editorStartM.x, editorCurrentM.y - editorStartM.y);
    ctx.strokeStyle = 'rgba(245,158,11,0.7)'; ctx.lineWidth = Math.max(4, newWallProps.thickness * editorScale);
    ctx.lineCap = 'round'; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#f59e0b'; ctx.font = 'bold 11px Inter,sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(fmtLen(len), (p1.x + p2.x) / 2, (p1.y + p2.y) / 2 - 12);
    ctx.textAlign = 'left';
    // start dot
    ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(p1.x, p1.y, 5, 0, Math.PI * 2); ctx.fill();
}

function drawStairsGhost(ctx) {
    const p = m2c(editorCurrentM.x, editorCurrentM.y);
    if (p.x < editorOrigin.x || p.x > editorOrigin.x + project.length * editorScale) return;
    const pw = newStairProps.length * editorScale, ph = newStairProps.width * editorScale;
    ctx.fillStyle = 'rgba(99,102,241,0.1)'; ctx.strokeStyle = 'rgba(99,102,241,0.6)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.rect(p.x - pw / 2, p.y - ph / 2, pw, ph); ctx.fill(); ctx.stroke();
    ctx.setLineDash([]);
}

function drawHighlights(ctx) {
    const el = selectedElement || hoveredElement; if (!el) return;
    // Already rendered in the drawXxx functions with color changes
}

function drawCursorHint(ctx, W, H) {
    const hints = { select: 'Click element to select', wall: 'Click & drag to draw wall', window: 'Click on a wall to place window', door: 'Click on a wall to place door', stairs: 'Click to place staircase', erase: 'Click element to delete' };
    const hint = hints[editorTool] || '';
    ctx.font = '11px Inter,sans-serif'; ctx.fillStyle = 'rgba(139,144,168,0.7)'; ctx.textAlign = 'right';
    ctx.fillText(hint, W - 8, H - 10); ctx.textAlign = 'left';
}

/* ── WINDOW RESIZE ──────────────────────────────────────────── */
window.addEventListener('resize', () => {
    resizeEditorCanvas();
    const c3 = document.getElementById('canvas-3d');
    if (window._three3DRenderer && c3) {
        window._three3DRenderer.setSize(c3.offsetWidth, c3.offsetHeight);
        if (window._three3DCamera) { window._three3DCamera.aspect = c3.offsetWidth / c3.offsetHeight; window._three3DCamera.updateProjectionMatrix(); }
    }
});
