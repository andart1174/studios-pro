/**
 * Architect Pro 2 (v3.0) — Precision 2D Structural CAD Floor Plan Editor
 * Fixes: Door swing double-rotation, stair ghost jump & tread direction, fake room areas,
 * Imperial units, French i18n, plus adds Structural Columns, Measure caliper, Magnetic Snap & Endpoint Drag.
 */
(function (globalScope) {
  'use strict';

  const ArchCAD2D = (() => {
    let _canvas = null;
    let _ctx = null;
    let _state = null;      // Reference to app state
    let _onChange = null;   // Callback(reason) whenever geometry changes
    let _onSelect = null;   // Callback(selected) whenever selection changes

    let _tool = 'select';
    let _showGrid = true;
    let _snapEnabled = true;

    // Viewport transform
    let _zoom = 1.0;
    let _panX = 0;
    let _panY = 0;
    let _scale = 36;
    let _ox = 60;
    let _oy = 60;
    let _dpr = 1;

    // Interaction state
    let _selected = null; // { type: 'wall'|'window'|'door'|'stairs'|'column', id }
    let _hoverWall = null; // { wallId, t, x, y, ang, len }
    let _mouseWorld = null;
    let _snapTarget = null; // { x, y, kind: 'endpoint'|'midpoint'|'grid'|'ortho' }

    let _wallStart = null;
    let _measurePts = [];
    let _dragging = null; // { kind: 'pan'|'wall-p1'|'wall-p2'|'opening'|'column'|'stairs', ... }

    // Tool defaults (in meters)
    const _toolCfg = {
      wallThickness: 0.15,
      columnSize: 0.30,
      windowWidth: 1.50,
      windowHeight: 1.35,
      windowSill: 0.90,
      doorWidth: 0.90,
      doorHeight: 2.10,
      doorSwing: 'in-left',
      stairW: 2.90,
      stairH: 1.10,
      stairDir: 'right',
      stairStyle: 'straight',
      stairSteps: 16
    };

    // Undo / Redo stacks
    let _undoStack = [];
    let _redoStack = [];
    const MAX_UNDO = 50;

    function getEng() { return globalScope.ArchEng; }

    function getFP() {
      if (!_state || !_state.floorPlans) return { walls: [], windows: [], doors: [], stairs: [], columns: [] };
      const idx = _state.activeFloor || 0;
      if (!_state.floorPlans[idx]) {
        _state.floorPlans[idx] = { walls: [], windows: [], doors: [], stairs: [], columns: [] };
      }
      const fp = _state.floorPlans[idx];
      if (!fp.columns) fp.columns = [];
      return fp;
    }

    function getOuterWalls() {
      const L = _state.project.length;
      const W = _state.project.width;
      return [
        { id: 'ext-top',    x1: 0, y1: 0, x2: L, y2: 0, thickness: 0.30, isOuter: true },
        { id: 'ext-bottom', x1: 0, y1: W, x2: L, y2: W, thickness: 0.30, isOuter: true },
        { id: 'ext-left',   x1: 0, y1: 0, x2: 0, y2: W, thickness: 0.30, isOuter: true },
        { id: 'ext-right',  x1: L, y1: 0, x2: L, y2: W, thickness: 0.30, isOuter: true }
      ];
    }

    function getAllWalls() {
      return getOuterWalls().concat(getFP().walls || []);
    }

    function findWallById(id) {
      return getAllWalls().find(w => w.id === id) || null;
    }

    // -----------------------------------------------------------------------
    // Coordinate Transforms & Fit
    // -----------------------------------------------------------------------
    function computeViewport() {
      if (!_canvas || !_state) return;
      const rect = _canvas.getBoundingClientRect();
      const cw = Math.max(200, rect.width);
      const ch = Math.max(200, rect.height);
      const L = _state.project.length;
      const W = _state.project.width;
      const padX = 76;
      const padY = 64;
      const baseScale = Math.min((cw - padX * 2) / Math.max(1, L), (ch - padY * 2) / Math.max(1, W));
      _scale = Math.max(8, baseScale * _zoom);
      _ox = (cw - L * _scale) / 2 + _panX;
      _oy = (ch - W * _scale) / 2 + _panY;
    }

    function w2s(wx, wy) {
      return { x: _ox + wx * _scale, y: _oy + wy * _scale };
    }

    function s2w(sx, sy) {
      return { x: (sx - _ox) / _scale, y: (sy - _oy) / _scale };
    }

    function getMouseCanvasPos(e) {
      const rect = _canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    // -----------------------------------------------------------------------
    // Magnetic Snapping (Endpoints, Midpoints, Perimeter, Ortho, Grid)
    // -----------------------------------------------------------------------
    function snapPoint(wx, wy, opts) {
      const L = _state.project.length;
      const W = _state.project.width;
      const clampX = Math.max(0, Math.min(L, wx));
      const clampY = Math.max(0, Math.min(W, wy));

      if (!_snapEnabled) {
        _snapTarget = null;
        return { x: +clampX.toFixed(2), y: +clampY.toFixed(2) };
      }

      const snapRad = 12 / _scale; // ~12 px magnetic radius
      const walls = getAllWalls();

      // 1. Endpoint snap
      for (let i = 0; i < walls.length; i++) {
        const w = walls[i];
        if (Math.hypot(clampX - w.x1, clampY - w.y1) < snapRad) {
          _snapTarget = { x: w.x1, y: w.y1, kind: 'endpoint' };
          return { x: w.x1, y: w.y1 };
        }
        if (Math.hypot(clampX - w.x2, clampY - w.y2) < snapRad) {
          _snapTarget = { x: w.x2, y: w.y2, kind: 'endpoint' };
          return { x: w.x2, y: w.y2 };
        }
      }

      // 2. Midpoint snap
      for (let i = 0; i < walls.length; i++) {
        const w = walls[i];
        const mx = (w.x1 + w.x2) / 2;
        const my = (w.y1 + w.y2) / 2;
        if (Math.hypot(clampX - mx, clampY - my) < snapRad * 0.85) {
          _snapTarget = { x: mx, y: my, kind: 'midpoint' };
          return { x: +mx.toFixed(2), y: +my.toFixed(2) };
        }
      }

      // 3. Snap cleanly onto outer perimeter boundary lines
      let sx = clampX, sy = clampY;
      let snappedAxis = false;
      if (sx < snapRad) { sx = 0; snappedAxis = true; }
      else if (L - sx < snapRad) { sx = L; snappedAxis = true; }
      if (sy < snapRad) { sy = 0; snappedAxis = true; }
      else if (W - sy < snapRad) { sy = W; snappedAxis = true; }

      // 4. Ortho angle lock relative to wallStart when drawing walls
      if (opts && opts.anchor) {
        const ax = opts.anchor.x, ay = opts.anchor.y;
        const dx = sx - ax, dy = sy - ay;
        const angDeg = Math.abs((Math.atan2(dy, dx) * 180) / Math.PI);
        if (opts.forceOrtho || angDeg < 6 || angDeg > 174) {
          if (Math.abs(dx) >= Math.abs(dy)) sy = ay;
          else sx = ax;
          _snapTarget = { x: sx, y: sy, kind: 'ortho' };
        } else if (Math.abs(angDeg - 90) < 6) {
          sx = ax;
          _snapTarget = { x: sx, y: sy, kind: 'ortho' };
        }
      }

      // 5. Metric (0.25m) or Imperial (1 ft = 0.3048m) grid snap
      const step = _state.unitSystem === 'imperial' ? getEng().FT_TO_M : 0.25;
      if (!snappedAxis) {
        sx = Math.max(0, Math.min(L, Math.round(sx / step) * step));
        sy = Math.max(0, Math.min(W, Math.round(sy / step) * step));
      }
      _snapTarget = { x: +sx.toFixed(3), y: +sy.toFixed(3), kind: snappedAxis ? 'endpoint' : 'grid' };
      return { x: +sx.toFixed(3), y: +sy.toFixed(3) };
    }

    function projectPointOnWall(wx, wy, w) {
      const dx = w.x2 - w.x1;
      const dy = w.y2 - w.y1;
      const lenSq = dx * dx + dy * dy;
      if (lenSq < 1e-6) return null;
      const tRaw = ((wx - w.x1) * dx + (wy - w.y1) * dy) / lenSq;
      const t = Math.max(0.05, Math.min(0.95, tRaw));
      const px = w.x1 + dx * t;
      const py = w.y1 + dy * t;
      return {
        wallId: w.id,
        t: +t.toFixed(3),
        x: px,
        y: py,
        dist: Math.hypot(wx - px, wy - py),
        ang: Math.atan2(dy, dx),
        len: Math.sqrt(lenSq)
      };
    }

    function findNearestWall(wx, wy, maxDistM) {
      const walls = getAllWalls();
      let best = null;
      for (let i = 0; i < walls.length; i++) {
        const pr = projectPointOnWall(wx, wy, walls[i]);
        if (pr && pr.dist <= maxDistM && (!best || pr.dist < best.dist)) {
          best = pr;
        }
      }
      return best;
    }

    // -----------------------------------------------------------------------
    // Undo / Redo Snapshot Helpers
    // -----------------------------------------------------------------------
    function pushUndo() {
      _undoStack.push(JSON.stringify(_state.floorPlans));
      if (_undoStack.length > MAX_UNDO) _undoStack.shift();
      _redoStack = [];
      syncUndoButtons();
    }

    function undo() {
      if (!_undoStack.length) return;
      _redoStack.push(JSON.stringify(_state.floorPlans));
      _state.floorPlans = JSON.parse(_undoStack.pop());
      _selected = null;
      syncUndoButtons();
      render();
      if (_onSelect) _onSelect(null);
      if (_onChange) _onChange('undo');
    }

    function redo() {
      if (!_redoStack.length) return;
      _undoStack.push(JSON.stringify(_state.floorPlans));
      _state.floorPlans = JSON.parse(_redoStack.pop());
      _selected = null;
      syncUndoButtons();
      render();
      if (_onSelect) _onSelect(null);
      if (_onChange) _onChange('redo');
    }

    function syncUndoButtons() {
      const ub = document.getElementById('btn-cad-undo');
      const rb = document.getElementById('btn-cad-redo');
      if (ub) ub.disabled = _undoStack.length === 0;
      if (rb) rb.disabled = _redoStack.length === 0;
    }

    // -----------------------------------------------------------------------
    // Hit Testing
    // -----------------------------------------------------------------------
    function hitTest(wx, wy) {
      const fp = getFP();
      const tol = 11 / _scale;

      // 1. Selected wall endpoints first (so endpoint drag is super easy!)
      if (_selected && _selected.type === 'wall') {
        const sw = fp.walls.find(w => w.id === _selected.id);
        if (sw) {
          if (Math.hypot(wx - sw.x1, wy - sw.y1) < tol * 1.3) return { type: 'wall', id: sw.id, handle: 'p1' };
          if (Math.hypot(wx - sw.x2, wy - sw.y2) < tol * 1.3) return { type: 'wall', id: sw.id, handle: 'p2' };
        }
      }

      // 2. Doors
      for (let i = fp.doors.length - 1; i >= 0; i--) {
        const d = fp.doors[i];
        const w = findWallById(d.wallId);
        if (!w) continue;
        const px = w.x1 + (w.x2 - w.x1) * d.t;
        const py = w.y1 + (w.y2 - w.y1) * d.t;
        if (Math.hypot(wx - px, wy - py) < Math.max(tol, (d.width || 0.9) * 0.55)) {
          return { type: 'door', id: d.id };
        }
      }

      // 3. Windows
      for (let i = fp.windows.length - 1; i >= 0; i--) {
        const win = fp.windows[i];
        const w = findWallById(win.wallId);
        if (!w) continue;
        const px = w.x1 + (w.x2 - w.x1) * win.t;
        const py = w.y1 + (w.y2 - w.y1) * win.t;
        if (Math.hypot(wx - px, wy - py) < Math.max(tol, (win.width || 1.4) * 0.55)) {
          return { type: 'window', id: win.id };
        }
      }

      // 4. Columns
      for (let i = (fp.columns || []).length - 1; i >= 0; i--) {
        const c = fp.columns[i];
        if (Math.hypot(wx - c.x, wy - c.y) < Math.max(tol, (c.size || 0.3) * 0.9)) {
          return { type: 'column', id: c.id };
        }
      }

      // 5. Stairs
      for (let i = fp.stairs.length - 1; i >= 0; i--) {
        const st = fp.stairs[i];
        if (wx >= st.x && wx <= st.x + st.w && wy >= st.y && wy <= st.y + st.h) {
          return { type: 'stairs', id: st.id };
        }
      }

      // 6. Interior Walls
      for (let i = fp.walls.length - 1; i >= 0; i--) {
        const pr = projectPointOnWall(wx, wy, fp.walls[i]);
        if (pr && pr.dist < Math.max(tol, (fp.walls[i].thickness || 0.15) * 0.9)) {
          return { type: 'wall', id: fp.walls[i].id };
        }
      }

      return null;
    }

    function getElementBySelection(sel) {
      if (!sel) return null;
      const fp = getFP();
      const map = { wall: fp.walls, window: fp.windows, door: fp.doors, stairs: fp.stairs, column: fp.columns };
      const arr = map[sel.type];
      return arr ? arr.find(it => it.id === sel.id) || null : null;
    }

    function deleteSelection(sel) {
      const target = sel || _selected;
      if (!target) return false;
      const fp = getFP();
      pushUndo();
      if (target.type === 'wall') {
        fp.walls = fp.walls.filter(w => w.id !== target.id);
        fp.windows = fp.windows.filter(w => w.wallId !== target.id);
        fp.doors = fp.doors.filter(d => d.wallId !== target.id);
      } else if (target.type === 'window') {
        fp.windows = fp.windows.filter(w => w.id !== target.id);
      } else if (target.type === 'door') {
        fp.doors = fp.doors.filter(d => d.id !== target.id);
      } else if (target.type === 'stairs') {
        fp.stairs = fp.stairs.filter(s => s.id !== target.id);
      } else if (target.type === 'column') {
        fp.columns = (fp.columns || []).filter(c => c.id !== target.id);
      }
      if (_selected && _selected.id === target.id) _selected = null;
      render();
      if (_onSelect) _onSelect(null);
      if (_onChange) _onChange('delete');
      return true;
    }

    // -----------------------------------------------------------------------
    // Mouse & Wheel Event Handlers
    // -----------------------------------------------------------------------
    function onPointerDown(e) {
      if (!_state) return;
      const pos = getMouseCanvasPos(e);
      const wpt = s2w(pos.x, pos.y);

      // Middle click or Alt+click pans viewport
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        _dragging = { kind: 'pan', startX: e.clientX, startY: e.clientY, origPanX: _panX, origPanY: _panY };
        _canvas.style.cursor = 'grabbing';
        return;
      }
      if (e.button !== 0) return;

      const fp = getFP();
      const L = _state.project.length;
      const W = _state.project.width;

      if (_tool === 'select') {
        const hit = hitTest(wpt.x, wpt.y);
        _selected = hit ? { type: hit.type, id: hit.id } : null;
        if (_onSelect) _onSelect(_selected);

        if (hit) {
          pushUndo();
          if (hit.type === 'wall' && (hit.handle === 'p1' || hit.handle === 'p2')) {
            _dragging = { kind: 'wall-' + hit.handle, id: hit.id };
          } else if (hit.type === 'window' || hit.type === 'door') {
            _dragging = { kind: 'opening', elType: hit.type, id: hit.id };
          } else if (hit.type === 'column') {
            _dragging = { kind: 'column', id: hit.id };
          } else if (hit.type === 'stairs') {
            const st = fp.stairs.find(s => s.id === hit.id);
            _dragging = { kind: 'stairs', id: hit.id, offX: wpt.x - st.x, offY: wpt.y - st.y };
          }
        }
        render();
        return;
      }

      if (_tool === 'erase') {
        const hit = hitTest(wpt.x, wpt.y);
        if (hit) deleteSelection(hit);
        return;
      }

      if (_tool === 'wall') {
        const snapped = snapPoint(wpt.x, wpt.y, { anchor: _wallStart, forceOrtho: e.shiftKey });
        if (!_wallStart) {
          _wallStart = snapped;
        } else {
          const dist = Math.hypot(snapped.x - _wallStart.x, snapped.y - _wallStart.y);
          if (dist >= 0.30) {
            pushUndo();
            const newWall = {
              id: getEng().uid('w'),
              x1: _wallStart.x,
              y1: _wallStart.y,
              x2: snapped.x,
              y2: snapped.y,
              thickness: _toolCfg.wallThickness
            };
            fp.walls.push(newWall);
            _selected = { type: 'wall', id: newWall.id };
            _wallStart = null;
            if (_onSelect) _onSelect(_selected);
            if (_onChange) _onChange('wall');
          } else {
            _wallStart = null;
          }
        }
        render();
        return;
      }

      if (_tool === 'column') {
        const snapped = snapPoint(wpt.x, wpt.y);
        const half = _toolCfg.columnSize / 2;
        const cx = Math.max(half + 0.1, Math.min(L - half - 0.1, snapped.x));
        const cy = Math.max(half + 0.1, Math.min(W - half - 0.1, snapped.y));
        pushUndo();
        const col = { id: getEng().uid('col'), x: +cx.toFixed(2), y: +cy.toFixed(2), size: _toolCfg.columnSize };
        fp.columns.push(col);
        _selected = { type: 'column', id: col.id };
        if (_onSelect) _onSelect(_selected);
        if (_onChange) _onChange('column');
        render();
        return;
      }

      if (_tool === 'window' || _tool === 'door') {
        const hitW = findNearestWall(wpt.x, wpt.y, 0.75);
        if (!hitW) return;
        pushUndo();
        if (_tool === 'window') {
          const maxW = Math.max(0.5, hitW.len - 0.4);
          const win = {
            id: getEng().uid('win'),
            wallId: hitW.wallId,
            t: hitW.t,
            width: +Math.min(_toolCfg.windowWidth, maxW).toFixed(2),
            height: _toolCfg.windowHeight,
            sill: _toolCfg.windowSill
          };
          fp.windows.push(win);
          _selected = { type: 'window', id: win.id };
        } else {
          const maxW = Math.max(0.65, hitW.len - 0.35);
          const dr = {
            id: getEng().uid('dr'),
            wallId: hitW.wallId,
            t: hitW.t,
            width: +Math.min(_toolCfg.doorWidth, maxW).toFixed(2),
            height: _toolCfg.doorHeight,
            swing: _toolCfg.doorSwing
          };
          fp.doors.push(dr);
          _selected = { type: 'door', id: dr.id };
        }
        if (_onSelect) _onSelect(_selected);
        if (_onChange) _onChange(_tool);
        render();
        return;
      }

      if (_tool === 'stairs') {
        // FIXED: Both ghost and placement centered cleanly on cursor (zero jump!)
        const isVert = _toolCfg.stairDir === 'up' || _toolCfg.stairDir === 'down';
        const sw = isVert ? _toolCfg.stairH : _toolCfg.stairW;
        const sh = isVert ? _toolCfg.stairW : _toolCfg.stairH;
        const snapped = snapPoint(wpt.x, wpt.y);
        const x = Math.max(0.15, Math.min(L - sw - 0.15, snapped.x - sw / 2));
        const y = Math.max(0.15, Math.min(W - sh - 0.15, snapped.y - sh / 2));
        pushUndo();
        const st = {
          id: getEng().uid('st'),
          x: +x.toFixed(2),
          y: +y.toFixed(2),
          w: +sw.toFixed(2),
          h: +sh.toFixed(2),
          dir: _toolCfg.stairDir,
          style: _toolCfg.stairStyle,
          steps: _toolCfg.stairSteps
        };
        fp.stairs.push(st);
        _selected = { type: 'stairs', id: st.id };
        if (_onSelect) _onSelect(_selected);
        if (_onChange) _onChange('stairs');
        render();
        return;
      }

      if (_tool === 'measure') {
        const snapped = snapPoint(wpt.x, wpt.y);
        if (_measurePts.length >= 2) _measurePts = [snapped];
        else _measurePts.push(snapped);
        render();
      }
    }

    function onPointerMove(e) {
      if (!_state || !_canvas) return;
      const pos = getMouseCanvasPos(e);
      const wpt = s2w(pos.x, pos.y);
      _mouseWorld = wpt;

      if (_dragging) {
        if (_dragging.kind === 'pan') {
          _panX = _dragging.origPanX + (e.clientX - _dragging.startX);
          _panY = _dragging.origPanY + (e.clientY - _dragging.startY);
          render();
          return;
        }
        const fp = getFP();
        const L = _state.project.length;
        const W = _state.project.width;

        if (_dragging.kind === 'wall-p1' || _dragging.kind === 'wall-p2') {
          const w = fp.walls.find(it => it.id === _dragging.id);
          if (w) {
            const anchor = _dragging.kind === 'wall-p1' ? { x: w.x2, y: w.y2 } : { x: w.x1, y: w.y1 };
            const sn = snapPoint(wpt.x, wpt.y, { anchor, forceOrtho: e.shiftKey });
            if (_dragging.kind === 'wall-p1') { w.x1 = sn.x; w.y1 = sn.y; }
            else { w.x2 = sn.x; w.y2 = sn.y; }
            render();
          }
          return;
        }
        if (_dragging.kind === 'opening') {
          const arr = _dragging.elType === 'window' ? fp.windows : fp.doors;
          const el = arr.find(it => it.id === _dragging.id);
          if (el) {
            const pr = findNearestWall(wpt.x, wpt.y, 1.0);
            if (pr) {
              el.wallId = pr.wallId;
              el.t = pr.t;
              render();
            }
          }
          return;
        }
        if (_dragging.kind === 'column') {
          const c = (fp.columns || []).find(it => it.id === _dragging.id);
          if (c) {
            const sn = snapPoint(wpt.x, wpt.y);
            c.x = +Math.max(0.2, Math.min(L - 0.2, sn.x)).toFixed(2);
            c.y = +Math.max(0.2, Math.min(W - 0.2, sn.y)).toFixed(2);
            render();
          }
          return;
        }
        if (_dragging.kind === 'stairs') {
          const st = fp.stairs.find(it => it.id === _dragging.id);
          if (st) {
            const nx = Math.max(0.15, Math.min(L - st.w - 0.15, wpt.x - _dragging.offX));
            const ny = Math.max(0.15, Math.min(W - st.h - 0.15, wpt.y - _dragging.offY));
            st.x = +(Math.round(nx * 4) / 4).toFixed(2);
            st.y = +(Math.round(ny * 4) / 4).toFixed(2);
            render();
          }
          return;
        }
      }

      if (_tool === 'window' || _tool === 'door') {
        _hoverWall = findNearestWall(wpt.x, wpt.y, 0.75);
      } else {
        _hoverWall = null;
      }
      if (_tool === 'wall' || _tool === 'column' || _tool === 'stairs' || _tool === 'measure') {
        snapPoint(wpt.x, wpt.y, { anchor: _wallStart, forceOrtho: e.shiftKey });
      } else {
        _snapTarget = null;
      }
      render();
    }

    function onPointerUp() {
      if (!_dragging) return;
      const wasEdit = _dragging.kind !== 'pan';
      _dragging = null;
      _canvas.style.cursor = _tool === 'select' ? 'default' : 'crosshair';
      if (wasEdit && _onChange) _onChange('drag');
      if (wasEdit && _onSelect) _onSelect(_selected);
    }

    function onWheel(e) {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      _zoom = Math.max(0.55, Math.min(3.5, _zoom * factor));
      render();
    }

    // -----------------------------------------------------------------------
    // Architectural Blueprint Renderer
    // -----------------------------------------------------------------------
    function render() {
      if (!_canvas || !_ctx || !_state) return;
      const rect = _canvas.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) return;

      _dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = Math.round(rect.width * _dpr);
      const targetH = Math.round(rect.height * _dpr);
      if (_canvas.width !== targetW || _canvas.height !== targetH) {
        _canvas.width = targetW;
        _canvas.height = targetH;
      }

      _ctx.save();
      _ctx.scale(_dpr, _dpr);
      computeViewport();

      const cw = rect.width;
      const ch = rect.height;
      const L = _state.project.length;
      const W = _state.project.width;
      const fp = getFP();
      const Eng = getEng();
      const units = _state.unitSystem;

      // 1. Blueprint dark background
      _ctx.fillStyle = '#0c101b';
      _ctx.fillRect(0, 0, cw, ch);

      // 2. Engineering Grid
      if (_showGrid) drawGrid(cw, ch, L, W, units);

      // 3. Floor interior fill
      const tl = w2s(0, 0);
      const br = w2s(L, W);
      _ctx.fillStyle = '#121828';
      _ctx.fillRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);

      // 4. Real Planar Room Detection Labels (FIXED fake room area!)
      drawDetectedRooms(L, W, fp.walls, units);

      // 5. Outer Perimeter Structural Walls
      drawOuterWalls(L, W);

      // 6. Interior Walls
      for (let i = 0; i < fp.walls.length; i++) {
        drawInteriorWall(fp.walls[i]);
      }

      // 7. Structural Columns
      for (let i = 0; i < (fp.columns || []).length; i++) {
        drawColumn(fp.columns[i]);
      }

      // 8. Stairs
      for (let i = 0; i < fp.stairs.length; i++) {
        drawStairs(fp.stairs[i]);
      }

      // 9. Windows (on both outer & interior walls)
      for (let i = 0; i < fp.windows.length; i++) {
        drawWindow(fp.windows[i]);
      }

      // 10. Doors (FIXED single-rotation swing arc!)
      for (let i = 0; i < fp.doors.length; i++) {
        drawDoor(fp.doors[i]);
      }

      // 11. Architectural Dimension Chains (Exterior L & W)
      drawExteriorDimensions(L, W, units);

      // 12. Active Tool Ghost Previews & Measure Caliper
      drawToolOverlays(L, W, units);

      // 13. Magnetic Snap Indicator
      if (_snapTarget && (_tool === 'wall' || _tool === 'column' || _tool === 'measure' || (_dragging && _dragging.kind.startsWith('wall-')))) {
        const sp = w2s(_snapTarget.x, _snapTarget.y);
        _ctx.strokeStyle = _snapTarget.kind === 'endpoint' ? '#10b981' : _snapTarget.kind === 'midpoint' ? '#38bdf8' : '#f59e0b';
        _ctx.lineWidth = 1.6;
        _ctx.beginPath();
        _ctx.arc(sp.x, sp.y, 5.5, 0, Math.PI * 2);
        _ctx.stroke();
      }

      _ctx.restore();
    }

    function drawGrid(cw, ch, L, W, units) {
      const stepM = units === 'imperial' ? getEng().FT_TO_M : 1.0;
      const subStep = stepM * 0.5;
      const minX = Math.floor(-_ox / _scale / subStep) * subStep;
      const maxX = Math.ceil((cw - _ox) / _scale / subStep) * subStep;
      const minY = Math.floor(-_oy / _scale / subStep) * subStep;
      const maxY = Math.ceil((ch - _oy) / _scale / subStep) * subStep;

      _ctx.lineWidth = 1;
      for (let x = minX; x <= maxX; x += subStep) {
        const sx = _ox + x * _scale;
        const isMajor = Math.abs(Math.round(x / stepM) - x / stepM) < 0.01;
        _ctx.strokeStyle = isMajor ? 'rgba(148,163,184,0.11)' : 'rgba(148,163,184,0.04)';
        _ctx.beginPath(); _ctx.moveTo(sx, 0); _ctx.lineTo(sx, ch); _ctx.stroke();
      }
      for (let y = minY; y <= maxY; y += subStep) {
        const sy = _oy + y * _scale;
        const isMajor = Math.abs(Math.round(y / stepM) - y / stepM) < 0.01;
        _ctx.strokeStyle = isMajor ? 'rgba(148,163,184,0.11)' : 'rgba(148,163,184,0.04)';
        _ctx.beginPath(); _ctx.moveTo(0, sy); _ctx.lineTo(cw, sy); _ctx.stroke();
      }
      void L; void W;
    }

    function drawDetectedRooms(L, W, walls, units) {
      const Eng = getEng();
      const rooms = Eng.detectRooms(L, W, walls, _state.lang);
      for (let i = 0; i < rooms.length; i++) {
        const rm = rooms[i];
        const p = w2s(rm.cx, rm.cy);
        const areaStr = Eng.fmtArea(rm.area, units);
        _ctx.save();
        _ctx.font = '600 11px Inter, system-ui, sans-serif';
        const tw = Math.max(_ctx.measureText(rm.label).width, _ctx.measureText(areaStr).width) + 18;
        const th = 32;
        _ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
        _ctx.strokeStyle = 'rgba(245, 158, 11, 0.28)';
        _ctx.lineWidth = 1;
        roundRect(_ctx, p.x - tw / 2, p.y - th / 2, tw, th, 6);
        _ctx.fill();
        _ctx.stroke();

        _ctx.textAlign = 'center';
        _ctx.textBaseline = 'middle';
        _ctx.fillStyle = '#cbd5e1';
        _ctx.fillText(rm.label, p.x, p.y - 6);
        _ctx.fillStyle = '#f59e0b';
        _ctx.font = '700 11px Inter, system-ui, sans-serif';
        _ctx.fillText(areaStr, p.x, p.y + 8);
        _ctx.restore();
      }
    }

    function drawOuterWalls(L, W) {
      const tl = w2s(0, 0);
      const bw = L * _scale;
      const bh = W * _scale;
      const tPx = Math.max(6, 0.30 * _scale);

      _ctx.save();
      _ctx.strokeStyle = _state.colors.extWalls || '#e5d5c0';
      _ctx.lineWidth = tPx;
      _ctx.lineJoin = 'miter';
      _ctx.strokeRect(tl.x, tl.y, bw, bh);

      // Inner crisp architectural edge line
      _ctx.strokeStyle = 'rgba(245, 158, 11, 0.55)';
      _ctx.lineWidth = 1;
      _ctx.strokeRect(tl.x - tPx / 2, tl.y - tPx / 2, bw + tPx, bh + tPx);

      // Corner structural column markers
      const cSz = Math.max(8, 0.32 * _scale);
      _ctx.fillStyle = '#64748b';
      const corners = [[0, 0], [L, 0], [0, W], [L, W]];
      corners.forEach(([cx, cy]) => {
        const p = w2s(cx, cy);
        _ctx.fillRect(p.x - cSz / 2, p.y - cSz / 2, cSz, cSz);
      });
      _ctx.restore();
    }

    function drawInteriorWall(w) {
      const p1 = w2s(w.x1, w.y1);
      const p2 = w2s(w.x2, w.y2);
      const isSel = _selected && _selected.type === 'wall' && _selected.id === w.id;
      const tPx = Math.max(4, (w.thickness || 0.15) * _scale);

      _ctx.save();
      _ctx.lineCap = 'square';
      _ctx.strokeStyle = isSel ? '#f59e0b' : (_state.colors.intWalls || '#dbe4f0');
      _ctx.lineWidth = tPx;
      _ctx.beginPath();
      _ctx.moveTo(p1.x, p1.y);
      _ctx.lineTo(p2.x, p2.y);
      _ctx.stroke();

      // Length label on selected wall
      if (isSel) {
        const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;
        drawPillLabel(mx, my - 14, getEng().fmtLen(len, _state.unitSystem), '#f59e0b');
        // Draggable endpoint handles
        [p1, p2].forEach(pt => {
          _ctx.fillStyle = '#f59e0b';
          _ctx.strokeStyle = '#0f172a';
          _ctx.lineWidth = 2;
          _ctx.beginPath();
          _ctx.arc(pt.x, pt.y, 5.5, 0, Math.PI * 2);
          _ctx.fill();
          _ctx.stroke();
        });
      }
      _ctx.restore();
    }

    function drawColumn(col) {
      const p = w2s(col.x, col.y);
      const sz = Math.max(10, (col.size || 0.30) * _scale);
      const isSel = _selected && _selected.type === 'column' && _selected.id === col.id;

      _ctx.save();
      _ctx.fillStyle = isSel ? '#f59e0b' : '#475569';
      _ctx.strokeStyle = isSel ? '#fef08a' : '#cbd5e1';
      _ctx.lineWidth = isSel ? 2 : 1.3;
      _ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
      _ctx.strokeRect(p.x - sz / 2, p.y - sz / 2, sz, sz);

      // Diagonal structural cross hatch
      _ctx.strokeStyle = 'rgba(15, 23, 42, 0.7)';
      _ctx.lineWidth = 1;
      _ctx.beginPath();
      _ctx.moveTo(p.x - sz / 2, p.y - sz / 2); _ctx.lineTo(p.x + sz / 2, p.y + sz / 2);
      _ctx.moveTo(p.x + sz / 2, p.y - sz / 2); _ctx.lineTo(p.x - sz / 2, p.y + sz / 2);
      _ctx.stroke();
      _ctx.restore();
    }

    function drawWindow(win) {
      const w = findWallById(win.wallId);
      if (!w) return;
      const wx = w.x1 + (w.x2 - w.x1) * win.t;
      const wy = w.y1 + (w.y2 - w.y1) * win.t;
      const p = w2s(wx, wy);
      const ang = Math.atan2(w.y2 - w.y1, w.x2 - w.x1);
      const halfPx = ((win.width || 1.4) * _scale) / 2;
      const tPx = Math.max(7, (w.thickness || 0.15) * _scale + 2);
      const isSel = _selected && _selected.type === 'window' && _selected.id === win.id;

      _ctx.save();
      _ctx.translate(p.x, p.y);
      _ctx.rotate(ang);
      // Cut wall clear
      _ctx.fillStyle = '#0c101b';
      _ctx.fillRect(-halfPx, -tPx / 2, halfPx * 2, tPx);
      // Triple-glazed CAD symbol
      _ctx.fillStyle = isSel ? 'rgba(245,158,11,0.35)' : 'rgba(56,189,248,0.28)';
      _ctx.strokeStyle = isSel ? '#f59e0b' : '#38bdf8';
      _ctx.lineWidth = isSel ? 2.2 : 1.5;
      _ctx.fillRect(-halfPx, -tPx / 2, halfPx * 2, tPx);
      _ctx.strokeRect(-halfPx, -tPx / 2, halfPx * 2, tPx);
      _ctx.beginPath();
      _ctx.moveTo(-halfPx, 0); _ctx.lineTo(halfPx, 0);
      _ctx.stroke();
      _ctx.restore();
    }

    function drawDoor(dr) {
      const w = findWallById(dr.wallId);
      if (!w) return;
      const wx = w.x1 + (w.x2 - w.x1) * dr.t;
      const wy = w.y1 + (w.y2 - w.y1) * dr.t;
      const p = w2s(wx, wy);
      const ang = Math.atan2(w.y2 - w.y1, w.x2 - w.x1);
      const rPx = (dr.width || 0.9) * _scale;
      const halfPx = rPx / 2;
      const tPx = Math.max(7, (w.thickness || 0.15) * _scale + 2);
      const isSel = _selected && _selected.type === 'door' && _selected.id === dr.id;
      const swing = dr.swing || 'in-left';

      _ctx.save();
      _ctx.translate(p.x, p.y);
      _ctx.rotate(ang);

      // Clear opening in wall
      _ctx.fillStyle = '#121828';
      _ctx.fillRect(-halfPx, -tPx / 2 - 1, rPx, tPx + 2);

      // Door jamb ticks
      _ctx.strokeStyle = isSel ? '#f59e0b' : '#fbbf24';
      _ctx.lineWidth = 2;
      _ctx.beginPath();
      _ctx.moveTo(-halfPx, -tPx / 2); _ctx.lineTo(-halfPx, tPx / 2);
      _ctx.moveTo(halfPx, -tPx / 2);  _ctx.lineTo(halfPx, tPx / 2);
      _ctx.stroke();

      // FIXED: Single-rotation local coordinate door leaf & 90° quarter-circle swing arc!
      const isLeft = swing.endsWith('left');
      const isIn = swing.startsWith('in');
      const hx = isLeft ? -halfPx : halfPx;
      const dirY = isIn ? 1 : -1;

      // Solid door leaf
      _ctx.strokeStyle = isSel ? '#f59e0b' : '#f8fafc';
      _ctx.lineWidth = 2.4;
      _ctx.beginPath();
      _ctx.moveTo(hx, 0);
      _ctx.lineTo(hx, dirY * rPx);
      _ctx.stroke();

      // Dashed swing arc (strictly in local space — ZERO double ang!)
      _ctx.strokeStyle = isSel ? 'rgba(245,158,11,0.9)' : 'rgba(251,191,36,0.55)';
      _ctx.lineWidth = 1.3;
      _ctx.setLineDash([4, 3]);
      _ctx.beginPath();
      if (isLeft && isIn)       _ctx.arc(hx, 0, rPx, 0, Math.PI / 2, false);
      else if (!isLeft && isIn) _ctx.arc(hx, 0, rPx, Math.PI / 2, Math.PI, false);
      else if (isLeft && !isIn) _ctx.arc(hx, 0, rPx, -Math.PI / 2, 0, false);
      else                      _ctx.arc(hx, 0, rPx, Math.PI, 1.5 * Math.PI, false);
      _ctx.stroke();
      _ctx.setLineDash([]);
      _ctx.restore();
    }

    function drawStairs(st, isGhost) {
      const tl = w2s(st.x, st.y);
      const pw = st.w * _scale;
      const ph = st.h * _scale;
      const isSel = !isGhost && _selected && _selected.type === 'stairs' && _selected.id === st.id;
      const steps = Math.max(6, Math.min(28, st.steps || 16));
      const dir = st.dir || 'right';
      const isVert = dir === 'up' || dir === 'down';

      _ctx.save();
      _ctx.globalAlpha = isGhost ? 0.55 : 1.0;
      _ctx.fillStyle = isSel ? 'rgba(245,158,11,0.18)' : 'rgba(99,102,241,0.14)';
      _ctx.strokeStyle = isSel ? '#f59e0b' : '#818cf8';
      _ctx.lineWidth = isSel ? 2.2 : 1.5;
      _ctx.fillRect(tl.x, tl.y, pw, ph);
      _ctx.strokeRect(tl.x, tl.y, pw, ph);

      // FIXED: Treads oriented cleanly perpendicular to climbing direction!
      _ctx.strokeStyle = isSel ? 'rgba(245,158,11,0.65)' : 'rgba(165,180,252,0.55)';
      _ctx.lineWidth = 1;
      if (st.style === 'u-shape') {
        // Split landing + two parallel flights
        const land = (isVert ? ph : pw) * 0.28;
        const halfSteps = Math.max(4, Math.floor(steps / 2));
        if (!isVert) {
          _ctx.beginPath();
          _ctx.moveTo(tl.x + pw - land, tl.y); _ctx.lineTo(tl.x + pw - land, tl.y + ph);
          _ctx.moveTo(tl.x, tl.y + ph / 2); _ctx.lineTo(tl.x + pw - land, tl.y + ph / 2);
          for (let i = 1; i < halfSteps; i++) {
            const x = tl.x + ((pw - land) * i) / halfSteps;
            _ctx.moveTo(x, tl.y); _ctx.lineTo(x, tl.y + ph);
          }
          _ctx.stroke();
        } else {
          _ctx.beginPath();
          _ctx.moveTo(tl.x, tl.y + land); _ctx.lineTo(tl.x + pw, tl.y + land);
          _ctx.moveTo(tl.x + pw / 2, tl.y + land); _ctx.lineTo(tl.x + pw / 2, tl.y + ph);
          for (let i = 1; i < halfSteps; i++) {
            const y = tl.y + land + ((ph - land) * i) / halfSteps;
            _ctx.moveTo(tl.x, y); _ctx.lineTo(tl.x + pw, y);
          }
          _ctx.stroke();
        }
      } else {
        _ctx.beginPath();
        for (let i = 1; i < steps; i++) {
          if (isVert) {
            const y = tl.y + (ph * i) / steps;
            _ctx.moveTo(tl.x, y); _ctx.lineTo(tl.x + pw, y);
          } else {
            const x = tl.x + (pw * i) / steps;
            _ctx.moveTo(x, tl.y); _ctx.lineTo(x, tl.y + ph);
          }
        }
        _ctx.stroke();
      }

      // Direction climb arrow
      const cx = tl.x + pw / 2;
      const cy = tl.y + ph / 2;
      const ax = dir === 'right' ? 1 : dir === 'left' ? -1 : 0;
      const ay = dir === 'down' ? 1 : dir === 'up' ? -1 : 0;
      const al = Math.min(pw, ph) * 0.42;
      _ctx.strokeStyle = '#f59e0b';
      _ctx.fillStyle = '#f59e0b';
      _ctx.lineWidth = 2;
      _ctx.beginPath();
      _ctx.moveTo(cx - ax * al, cy - ay * al);
      _ctx.lineTo(cx + ax * al, cy + ay * al);
      _ctx.stroke();

      // Arrowhead
      const tipX = cx + ax * al;
      const tipY = cy + ay * al;
      const ang = Math.atan2(ay, ax);
      _ctx.beginPath();
      _ctx.moveTo(tipX, tipY);
      _ctx.lineTo(tipX - 7 * Math.cos(ang - 0.5), tipY - 7 * Math.sin(ang - 0.5));
      _ctx.lineTo(tipX - 7 * Math.cos(ang + 0.5), tipY - 7 * Math.sin(ang + 0.5));
      _ctx.closePath();
      _ctx.fill();

      _ctx.font = '700 9px Inter, sans-serif';
      _ctx.textAlign = 'center';
      _ctx.fillStyle = '#e2e8f0';
      _ctx.fillText('UP', cx, cy - 3);
      _ctx.restore();
    }

    function drawExteriorDimensions(L, W, units) {
      const Eng = getEng();
      const tl = w2s(0, 0);
      const tr = w2s(L, 0);
      const bl = w2s(0, W);
      const off = 26;

      _ctx.save();
      _ctx.strokeStyle = 'rgba(245, 158, 11, 0.72)';
      _ctx.fillStyle = '#f59e0b';
      _ctx.lineWidth = 1.2;
      _ctx.font = '700 11px Inter, sans-serif';
      _ctx.textAlign = 'center';
      _ctx.textBaseline = 'middle';

      // Top horizontal Length dimension
      _ctx.beginPath();
      _ctx.moveTo(tl.x, tl.y - off); _ctx.lineTo(tr.x, tr.y - off);
      _ctx.moveTo(tl.x, tl.y - off - 5); _ctx.lineTo(tl.x, tl.y - off + 5);
      _ctx.moveTo(tr.x, tr.y - off - 5); _ctx.lineTo(tr.x, tr.y - off + 5);
      _ctx.stroke();
      drawPillLabel((tl.x + tr.x) / 2, tl.y - off, Eng.fmtLen(L, units), '#f59e0b');

      // Left vertical Width dimension
      _ctx.beginPath();
      _ctx.moveTo(tl.x - off, tl.y); _ctx.lineTo(bl.x - off, bl.y);
      _ctx.moveTo(tl.x - off - 5, tl.y); _ctx.lineTo(tl.x - off + 5, tl.y);
      _ctx.moveTo(bl.x - off - 5, bl.y); _ctx.lineTo(bl.x - off + 5, bl.y);
      _ctx.stroke();

      _ctx.save();
      _ctx.translate(tl.x - off - 12, (tl.y + bl.y) / 2);
      _ctx.rotate(-Math.PI / 2);
      _ctx.fillText(Eng.fmtLen(W, units), 0, 0);
      _ctx.restore();
      _ctx.restore();
    }

    function drawToolOverlays(L, W, units) {
      const Eng = getEng();

      // Wall drawing rubberband
      if (_tool === 'wall' && _wallStart && _snapTarget) {
        const p1 = w2s(_wallStart.x, _wallStart.y);
        const p2 = w2s(_snapTarget.x, _snapTarget.y);
        const len = Math.hypot(_snapTarget.x - _wallStart.x, _snapTarget.y - _wallStart.y);
        _ctx.save();
        _ctx.strokeStyle = '#f59e0b';
        _ctx.lineWidth = Math.max(4, _toolCfg.wallThickness * _scale);
        _ctx.setLineDash([6, 4]);
        _ctx.beginPath();
        _ctx.moveTo(p1.x, p1.y); _ctx.lineTo(p2.x, p2.y);
        _ctx.stroke();
        _ctx.setLineDash([]);
        drawPillLabel((p1.x + p2.x) / 2, (p1.y + p2.y) / 2 - 16, Eng.fmtLen(len, units), '#f59e0b');
        _ctx.restore();
      }

      // Window / Door hover ghost
      if ((_tool === 'window' || _tool === 'door') && _hoverWall) {
        const p = w2s(_hoverWall.x, _hoverWall.y);
        const w = _tool === 'window' ? _toolCfg.windowWidth : _toolCfg.doorWidth;
        const halfPx = (w * _scale) / 2;
        _ctx.save();
        _ctx.translate(p.x, p.y);
        _ctx.rotate(_hoverWall.ang);
        _ctx.fillStyle = _tool === 'window' ? 'rgba(56,189,248,0.45)' : 'rgba(245,158,11,0.45)';
        _ctx.strokeStyle = '#ffffff';
        _ctx.lineWidth = 1.5;
        _ctx.fillRect(-halfPx, -6, halfPx * 2, 12);
        _ctx.strokeRect(-halfPx, -6, halfPx * 2, 12);
        _ctx.restore();
      }

      // Column ghost
      if (_tool === 'column' && _snapTarget) {
        const p = w2s(_snapTarget.x, _snapTarget.y);
        const sz = Math.max(10, _toolCfg.columnSize * _scale);
        _ctx.save();
        _ctx.globalAlpha = 0.65;
        _ctx.fillStyle = '#f59e0b';
        _ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
        _ctx.restore();
      }

      // Stairs ghost (centered on cursor!)
      if (_tool === 'stairs' && _snapTarget) {
        const isVert = _toolCfg.stairDir === 'up' || _toolCfg.stairDir === 'down';
        const sw = isVert ? _toolCfg.stairH : _toolCfg.stairW;
        const sh = isVert ? _toolCfg.stairW : _toolCfg.stairH;
        const gx = Math.max(0.15, Math.min(L - sw - 0.15, _snapTarget.x - sw / 2));
        const gy = Math.max(0.15, Math.min(W - sh - 0.15, _snapTarget.y - sh / 2));
        drawStairs({ x: gx, y: gy, w: sw, h: sh, dir: _toolCfg.stairDir, style: _toolCfg.stairStyle, steps: _toolCfg.stairSteps }, true);
      }

      // Measure caliper line
      if (_measurePts.length > 0) {
        const p1 = w2s(_measurePts[0].x, _measurePts[0].y);
        const endW = _measurePts.length === 2 ? _measurePts[1] : (_snapTarget || _mouseWorld);
        if (endW) {
          const p2 = w2s(endW.x, endW.y);
          const dist = Math.hypot(endW.x - _measurePts[0].x, endW.y - _measurePts[0].y);
          _ctx.save();
          _ctx.strokeStyle = '#22d3ee';
          _ctx.lineWidth = 2;
          _ctx.setLineDash([5, 4]);
          _ctx.beginPath(); _ctx.moveTo(p1.x, p1.y); _ctx.lineTo(p2.x, p2.y); _ctx.stroke();
          _ctx.setLineDash([]);
          [p1, p2].forEach(pt => {
            _ctx.fillStyle = '#22d3ee';
            _ctx.beginPath(); _ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2); _ctx.fill();
          });
          drawPillLabel((p1.x + p2.x) / 2, (p1.y + p2.y) / 2 - 14, Eng.fmtLen(dist, units), '#22d3ee');
          _ctx.restore();
        }
      }
    }

    function drawPillLabel(x, y, text, color) {
      _ctx.save();
      _ctx.font = '700 11px Inter, sans-serif';
      const w = _ctx.measureText(text).width + 12;
      _ctx.fillStyle = '#0f172a';
      _ctx.strokeStyle = color;
      _ctx.lineWidth = 1;
      roundRect(_ctx, x - w / 2, y - 9, w, 18, 5);
      _ctx.fill();
      _ctx.stroke();
      _ctx.fillStyle = color;
      _ctx.textAlign = 'center';
      _ctx.textBaseline = 'middle';
      _ctx.fillText(text, x, y + 0.5);
      _ctx.restore();
    }

    function roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------
    let _bound = false;
    function init(canvasEl, stateRef, callbacks) {
      _canvas = canvasEl;
      _ctx = canvasEl.getContext('2d');
      _state = stateRef;
      _onChange = callbacks && callbacks.onChange;
      _onSelect = callbacks && callbacks.onSelect;
      _selected = null;
      _wallStart = null;
      _measurePts = [];
      _zoom = 1.0;
      _panX = 0;
      _panY = 0;
      _undoStack = [];
      _redoStack = [];
      syncUndoButtons();

      if (!_bound) {
        _canvas.addEventListener('mousedown', onPointerDown);
        window.addEventListener('mousemove', onPointerMove);
        window.addEventListener('mouseup', onPointerUp);
        _canvas.addEventListener('wheel', onWheel, { passive: false });
        window.addEventListener('resize', () => render());
        _bound = true;
      }
      render();
    }

    function setTool(t) {
      _tool = t;
      _wallStart = null;
      _measurePts = [];
      _hoverWall = null;
      if (_canvas) _canvas.style.cursor = t === 'select' ? 'default' : 'crosshair';
      render();
    }

    function setGrid(v) { _showGrid = !!v; render(); }
    function getGrid() { return _showGrid; }
    function resetView() { _zoom = 1.0; _panX = 0; _panY = 0; render(); }
    function getSelected() { return _selected; }
    function clearSelection() { _selected = null; render(); if (_onSelect) _onSelect(null); }
    function getToolCfg() { return _toolCfg; }
    function getTool() { return _tool; }

    function updateSelectedProp(prop, val) {
      const el = getElementBySelection(_selected);
      if (!el) return;
      pushUndo();
      el[prop] = val;
      if (_selected.type === 'stairs' && prop === 'dir') {
        const isVert = val === 'up' || val === 'down';
        const big = Math.max(el.w, el.h);
        const small = Math.min(el.w, el.h);
        el.w = isVert ? small : big;
        el.h = isVert ? big : small;
      }
      render();
      if (_onChange) _onChange('prop');
    }

    function getCanvasDataURL() {
      render();
      return _canvas ? _canvas.toDataURL('image/png') : null;
    }

    return {
      init, render, setTool, getTool, setGrid, getGrid, resetView,
      undo, redo, pushUndo, getSelected, getElementBySelection, clearSelection,
      deleteSelection, updateSelectedProp, getToolCfg, getCanvasDataURL,
      getOuterWalls, findWallById
    };
  })();

  globalScope.ArchCAD2D = ArchCAD2D;
})(typeof window !== 'undefined' ? window : globalThis);
