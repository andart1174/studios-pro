/**
 * Architect Pro 1 (v2.0) — Precision HiDPI 2D Architectural Floor Plan Editor
 * Magnetic Endpoint/Midpoint/Grid Snap, World-Space Ortho Snap, Wall Handle Dragging,
 * Door/Window Sliding, Previous-Floor Ghost Underlay, Auto-Room Area Labels (m²/ft²),
 * Blueprint Opacity/Scale Overlay & Interactive Measure Caliper.
 */
(function () {
  'use strict';

  window.Editor2D = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    dpr: 1,
    camera: { x: 0, y: 0, zoom: 0.45 }, // world cm -> screen px
    needsRedraw: true,
    currentTool: 'select',
    activeFurnitureVariant: 'sofa',
    showRoofOverlay: true,
    snapEnabled: true,

    // Interaction state
    isPanning: false,
    spaceDown: false,
    panStart: { x: 0, y: 0 },
    dragMode: null, // 'element' | 'wall_p1' | 'wall_p2' | 'wall_body' | 'opening'
    draggedElement: null,
    dragOffset: { x: 0, y: 0 },
    wallOrig: null,

    isDrawing: false,
    drawStart: { x: 0, y: 0 },
    mouseWorld: { x: 0, y: 0 },
    snappedPoint: null,
    hoverElement: null,
    measurePts: [],
    detectedRooms: [],

    init(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this._bindEvents();
      this.resize();
    },

    resize() {
      if (!this.canvas || !this.canvas.parentElement) return;
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.width = Math.max(100, Math.floor(rect.width));
      this.height = Math.max(100, Math.floor(rect.height));
      this.canvas.width = Math.floor(this.width * this.dpr);
      this.canvas.height = Math.floor(this.height * this.dpr);
      if (this.camera.x === 0 && this.camera.y === 0) {
        this.camera.x = this.width * 0.5;
        this.camera.y = this.height * 0.5;
      }
      this.needsRedraw = true;
    },

    fitToContent() {
      if (!window.STATE) return;
      this.resize();
      const els = STATE.elements.filter(e => (e.floor || 0) === (STATE.activeFloor || 0));
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      const grow = (x, y) => {
        if (x < minX) minX = x; if (y < minY) minY = y;
        if (x > maxX) maxX = x; if (y > maxY) maxY = y;
      };
      els.forEach(e => {
        if (e.type === 'wall') { grow(e.x1, e.y1); grow(e.x2, e.y2); }
        else if (e.type === 'floor' || e.type === 'roof') {
          if (e.polygon) e.polygon.forEach(p => grow(p.x, p.y));
          else { grow(e.x, e.y); grow(e.x + e.width, e.y + e.height); }
        } else if (e.x !== undefined && e.y !== undefined) {
          grow(e.x - 100, e.y - 100); grow(e.x + 100, e.y + 100);
        }
      });
      if (!Number.isFinite(minX)) {
        this.camera.zoom = 0.5;
        this.camera.x = this.width * 0.5;
        this.camera.y = this.height * 0.5;
        this.needsRedraw = true;
        return;
      }
      const pad = 120;
      const contentW = Math.max(200, (maxX - minX) + pad * 2);
      const contentH = Math.max(200, (maxY - minY) + pad * 2);
      this.camera.zoom = Math.max(0.12, Math.min(2.5, Math.min(this.width / contentW, this.height / contentH)));
      const cx = (minX + maxX) * 0.5;
      const cy = (minY + maxY) * 0.5;
      this.camera.x = this.width * 0.5 - cx * this.camera.zoom;
      this.camera.y = this.height * 0.5 - cy * this.camera.zoom;
      this.needsRedraw = true;
    },

    setTool(tool) {
      this.currentTool = tool;
      this.isDrawing = false;
      this.dragMode = null;
      if (tool !== 'measure') this.measurePts = [];
      this.canvas.style.cursor = tool === 'select' ? 'default' : 'crosshair';
      this.needsRedraw = true;
    },

    screenToWorld(sx, sy) {
      return {
        x: (sx - this.camera.x) / this.camera.zoom,
        y: (sy - this.camera.y) / this.camera.zoom
      };
    },

    worldToScreen(wx, wy) {
      return {
        x: wx * this.camera.zoom + this.camera.x,
        y: wy * this.camera.zoom + this.camera.y
      };
    },

    _bindEvents() {
      this.canvas.addEventListener('mousedown', e => this.onMouseDown(e));
      window.addEventListener('mousemove', e => this.onMouseMove(e));
      window.addEventListener('mouseup', e => this.onMouseUp(e));
      this.canvas.addEventListener('wheel', e => this.onWheel(e), { passive: false });
      this.canvas.addEventListener('contextmenu', e => e.preventDefault());

      window.addEventListener('keydown', e => {
        if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'SELECT') {
          this.spaceDown = true;
          this.canvas.style.cursor = 'grab';
        }
      });
      window.addEventListener('keyup', e => {
        if (e.code === 'Space') {
          this.spaceDown = false;
          this.canvas.style.cursor = this.currentTool === 'select' ? 'default' : 'crosshair';
        }
      });
    },

    _getPointerWorld(e) {
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      return { mx, my, wpos: this.screenToWorld(mx, my) };
    },

    onMouseDown(e) {
      const { mx, my, wpos } = this._getPointerWorld(e);

      // Middle click, Right click, Spacebar or Alt+Drag -> Pan
      if (e.button === 1 || e.button === 2 || this.spaceDown || (e.button === 0 && e.altKey)) {
        this.isPanning = true;
        this.panStart = { x: mx, y: my };
        this.canvas.style.cursor = 'grabbing';
        return;
      }
      if (e.button !== 0) return;

      if (this.currentTool === 'measure') {
        const snap = this._snap(wpos.x, wpos.y);
        if (this.measurePts.length >= 2) this.measurePts = [];
        this.measurePts.push({ x: snap.x, y: snap.y });
        if (this.measurePts.length === 2 && window.showToast) {
          const d = Math.hypot(this.measurePts[1].x - this.measurePts[0].x, this.measurePts[1].y - this.measurePts[0].y);
          window.showToast(`Measure: ${ArchCore.formatLength(d, STATE.unit)}`, `Mesure : ${ArchCore.formatLength(d, STATE.unit)}`);
        }
        this.needsRedraw = true;
        return;
      }

      if (this.currentTool === 'select') {
        // 1) Check selected wall endpoint handles first!
        if (STATE.selectedElement && STATE.selectedElement.type === 'wall') {
          const w = STATE.selectedElement;
          const handleTol = 18 / this.camera.zoom;
          if (Math.hypot(wpos.x - w.x1, wpos.y - w.y1) <= handleTol) {
            STATE_HISTORY.saveState();
            this.dragMode = 'wall_p1';
            this.draggedElement = w;
            return;
          }
          if (Math.hypot(wpos.x - w.x2, wpos.y - w.y2) <= handleTol) {
            STATE_HISTORY.saveState();
            this.dragMode = 'wall_p2';
            this.draggedElement = w;
            return;
          }
        }

        const hit = this.hitTest(wpos.x, wpos.y);
        selectElement(hit);
        if (hit) {
          STATE_HISTORY.saveState();
          this.draggedElement = hit;
          if (hit.type === 'wall') {
            this.dragMode = 'wall_body';
            this.wallOrig = { x1: hit.x1, y1: hit.y1, x2: hit.x2, y2: hit.y2, startX: wpos.x, startY: wpos.y };
          } else if (hit.type === 'door' || hit.type === 'window') {
            this.dragMode = 'opening';
          } else if (hit.type === 'floor' || hit.type === 'roof') {
            if (!hit.polygon) {
              this.dragMode = 'element';
              this.dragOffset = { x: hit.x - wpos.x, y: hit.y - wpos.y };
            }
          } else {
            // furniture, lightNode, cameraNode, terrainSplat
            this.dragMode = 'element';
            this.dragOffset = { x: hit.x - wpos.x, y: hit.y - wpos.y };
          }
        }
        this.needsRedraw = true;
        return;
      }

      if (this.currentTool === 'wall' || this.currentTool === 'floor' || this.currentTool === 'roof') {
        const snap = this._snap(wpos.x, wpos.y);
        this.isDrawing = true;
        this.drawStart = { x: snap.x, y: snap.y };
        this.mouseWorld = { x: snap.x, y: snap.y };
        this.needsRedraw = true;
        return;
      }

      if (this.currentTool === 'terrain') {
        STATE_HISTORY.saveState();
        this.isDrawing = true;
        this.drawStart = { x: wpos.x, y: wpos.y };
        this.addTerrainSplat(wpos.x, wpos.y, e.shiftKey);
        return;
      }

      if (this.currentTool === 'door' || this.currentTool === 'window') {
        const wall = this._findWallNear(wpos.x, wpos.y, 45);
        if (wall) {
          STATE_HISTORY.saveState();
          this.addObjectToWall(wall, wpos.x, wpos.y);
        } else if (window.showToast) {
          window.showToast('Click directly on a wall to place a door/window', 'Cliquez directement sur un mur');
        }
        return;
      }

      if (this.currentTool === 'furniture' || this.currentTool === 'stairs') {
        STATE_HISTORY.saveState();
        const variant = this.currentTool === 'stairs' ? 'stairs_l' : (this.activeFurnitureVariant || 'sofa');
        const spec = ArchCore.CATALOG[variant] || ArchCore.CATALOG.table;
        const snap = this._snap(wpos.x, wpos.y, { snapEndpoints: false });
        const item = {
          id: 'fur_' + Date.now(),
          type: 'furniture',
          x: snap.x,
          y: snap.y,
          width: spec.w,
          length: spec.l,
          height: spec.h,
          elevation: 0,
          rotation: 0,
          modelVariant: variant,
          color: spec.color,
          floor: STATE.activeFloor,
          cost: spec.cost
        };
        STATE.elements.push(item);
        selectElement(item);
        triggerUpdate();
        return;
      }

      if (this.currentTool === 'camera') {
        STATE_HISTORY.saveState();
        const item = {
          id: 'cam_' + Date.now(),
          type: 'cameraNode',
          x: wpos.x,
          y: wpos.y,
          elevation: 168,
          floor: STATE.activeFloor,
          cost: 0
        };
        STATE.elements.push(item);
        selectElement(item);
        triggerUpdate();
        return;
      }

      if (this.currentTool === 'light') {
        STATE_HISTORY.saveState();
        const item = {
          id: 'light_' + Date.now(),
          type: 'lightNode',
          x: wpos.x,
          y: wpos.y,
          elevation: Math.max(180, STATE.globWallHeight - 25),
          intensity: 1.2,
          color: '#ffedd5',
          floor: STATE.activeFloor,
          cost: ArchCore.RATES.lightNode
        };
        STATE.elements.push(item);
        selectElement(item);
        triggerUpdate();
      }
    },

    onMouseMove(e) {
      const rect = this.canvas.getBoundingClientRect();
      const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (!inside && !this.isPanning && !this.dragMode && !this.isDrawing) return;

      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const wpos = this.screenToWorld(mx, my);

      if (this.isPanning) {
        this.camera.x += (mx - this.panStart.x);
        this.camera.y += (my - this.panStart.y);
        this.panStart = { x: mx, y: my };
        this.needsRedraw = true;
        return;
      }

      if (this.dragMode && this.draggedElement) {
        const el = this.draggedElement;
        if (this.dragMode === 'wall_p1' || this.dragMode === 'wall_p2') {
          const anchorX = this.dragMode === 'wall_p1' ? el.x2 : el.x1;
          const anchorY = this.dragMode === 'wall_p1' ? el.y2 : el.y1;
          let pt = this._snap(wpos.x, wpos.y, { excludeId: el.id });
          if (pt.snapped !== 'endpoint') {
            const ortho = ArchCore.snapOrthoWorld(anchorX, anchorY, pt.x, pt.y, true, 8);
            pt.x = ortho.x; pt.y = ortho.y;
          }
          if (this.dragMode === 'wall_p1') { el.x1 = pt.x; el.y1 = pt.y; }
          else { el.x2 = pt.x; el.y2 = pt.y; }
          el.length = ArchCore.wallLength(el);
          // Re-clamp any openings hosted on this wall
          STATE.elements.filter(o => o.wallId === el.id).forEach(o => ArchCore.clampOpeningOnWall(o, el));
          this.snappedPoint = pt;
          updatePropertiesUI();
          triggerUpdate();
        } else if (this.dragMode === 'wall_body' && this.wallOrig) {
          const dx = Math.round((wpos.x - this.wallOrig.startX) / 10) * 10;
          const dy = Math.round((wpos.y - this.wallOrig.startY) / 10) * 10;
          el.x1 = this.wallOrig.x1 + dx; el.y1 = this.wallOrig.y1 + dy;
          el.x2 = this.wallOrig.x2 + dx; el.y2 = this.wallOrig.y2 + dy;
          triggerUpdate();
        } else if (this.dragMode === 'opening') {
          const wall = STATE.elements.find(w => w.id === el.wallId);
          if (wall) {
            const l2 = (wall.x2 - wall.x1) ** 2 + (wall.y2 - wall.y1) ** 2;
            if (l2 > 1) {
              el.t = ((wpos.x - wall.x1) * (wall.x2 - wall.x1) + (wpos.y - wall.y1) * (wall.y2 - wall.y1)) / l2;
              ArchCore.clampOpeningOnWall(el, wall);
              triggerUpdate();
            }
          }
        } else if (this.dragMode === 'element') {
          const nx = wpos.x + this.dragOffset.x;
          const ny = wpos.y + this.dragOffset.y;
          el.x = this.snapEnabled ? Math.round(nx / 10) * 10 : nx;
          el.y = this.snapEnabled ? Math.round(ny / 10) * 10 : ny;
          triggerUpdate();
        }
        return;
      }

      if (this.isDrawing) {
        if (this.currentTool === 'terrain') {
          if (Math.hypot(wpos.x - this.drawStart.x, wpos.y - this.drawStart.y) > 25) {
            this.addTerrainSplat(wpos.x, wpos.y, e.shiftKey);
            this.drawStart = { x: wpos.x, y: wpos.y };
          }
        } else if (this.currentTool === 'wall') {
          let pt = this._snap(wpos.x, wpos.y);
          if (pt.snapped !== 'endpoint') {
            const ortho = ArchCore.snapOrthoWorld(this.drawStart.x, this.drawStart.y, pt.x, pt.y, true, 10);
            pt = { x: ortho.x, y: ortho.y, snapped: ortho.snappedAngle !== null ? 'ortho' : pt.snapped };
          }
          this.mouseWorld = { x: pt.x, y: pt.y, shiftCurve: !!e.shiftKey };
          this.snappedPoint = pt;
        } else {
          const pt = this._snap(wpos.x, wpos.y);
          this.mouseWorld = { x: pt.x, y: pt.y };
          this.snappedPoint = pt;
        }
        this.needsRedraw = true;
        return;
      }

      // Idle hover preview & magnetic snap reticle
      this.mouseWorld = { x: wpos.x, y: wpos.y };
      if (this.currentTool === 'wall' || this.currentTool === 'floor' || this.currentTool === 'roof' || this.currentTool === 'measure') {
        this.snappedPoint = this._snap(wpos.x, wpos.y);
        this.needsRedraw = true;
      } else {
        this.snappedPoint = null;
        const hit = (this.currentTool === 'door' || this.currentTool === 'window')
          ? this._findWallNear(wpos.x, wpos.y, 45)
          : this.hitTest(wpos.x, wpos.y);
        if (this.hoverElement !== hit || this.currentTool === 'door' || this.currentTool === 'window' || this.currentTool === 'terrain') {
          this.hoverElement = hit;
          this.needsRedraw = true;
        }
      }
    },

    onMouseUp(e) {
      if (this.isPanning) {
        this.isPanning = false;
        this.canvas.style.cursor = this.currentTool === 'select' ? 'default' : 'crosshair';
      } else if (this.dragMode) {
        this.dragMode = null;
        this.draggedElement = null;
        this.wallOrig = null;
        this.snappedPoint = null;
        this.needsRedraw = true;
      } else if (this.isDrawing) {
        this.isDrawing = false;
        if (this.currentTool === 'terrain') {
          triggerUpdate();
        } else {
          this.finishDrawing(e && e.shiftKey);
        }
      }
    },

    onWheel(e) {
      e.preventDefault();
      const { mx, my, wpos } = this._getPointerWorld(e);
      const factor = e.deltaY > 0 ? 0.88 : 1.13;
      this.camera.zoom = Math.max(0.08, Math.min(4.0, this.camera.zoom * factor));
      this.camera.x = mx - wpos.x * this.camera.zoom;
      this.camera.y = my - wpos.y * this.camera.zoom;
      this.needsRedraw = true;
    },

    _snap(wx, wy, extra) {
      if (!this.snapEnabled) return { x: wx, y: wy, snapped: null };
      return ArchCore.snapWorldPoint(wx, wy, STATE.elements, STATE.activeFloor, Object.assign({
        snapEndpoints: true,
        snapGrid: true,
        gridStep: 10,
        endTol: Math.max(12, 16 / this.camera.zoom),
        midTol: Math.max(10, 12 / this.camera.zoom)
      }, extra || {}));
    },

    _findWallNear(wx, wy, maxDist) {
      let best = null, bestD = maxDist || 35;
      for (const el of STATE.elements) {
        if (el.type !== 'wall' || (el.floor || 0) !== (STATE.activeFloor || 0)) continue;
        const l2 = (el.x2 - el.x1) ** 2 + (el.y2 - el.y1) ** 2;
        if (l2 < 1) continue;
        const t = Math.max(0, Math.min(1, ((wx - el.x1) * (el.x2 - el.x1) + (wy - el.y1) * (el.y2 - el.y1)) / l2));
        const d = Math.hypot(wx - (el.x1 + t * (el.x2 - el.x1)), wy - (el.y1 + t * (el.y2 - el.y1)));
        if (d < bestD) { bestD = d; best = el; }
      }
      return best;
    },

    finishDrawing(shiftKey) {
      const dx = this.mouseWorld.x - this.drawStart.x;
      const dy = this.mouseWorld.y - this.drawStart.y;

      if (this.currentTool === 'wall') {
        const len = Math.hypot(dx, dy);
        if (len >= 20) {
          STATE_HISTORY.saveState();
          const wall = {
            id: 'w_' + Date.now(),
            type: 'wall',
            x1: this.drawStart.x,
            y1: this.drawStart.y,
            x2: this.mouseWorld.x,
            y2: this.mouseWorld.y,
            length: len,
            height: STATE.globWallHeight,
            thick: STATE.globWallThick,
            curvature: (shiftKey || this.mouseWorld.shiftCurve) ? Math.round(len * 0.22) : 0,
            material: 'concrete',
            color: '#f1f5f9',
            floor: STATE.activeFloor,
            cost: Math.round((len / 100) * (STATE.globWallHeight / 100) * ArchCore.RATES.wallSqM)
          };
          STATE.elements.push(wall);
          selectElement(wall);
          triggerUpdate();
        }
      } else if (this.currentTool === 'floor' || this.currentTool === 'roof') {
        let rx = Math.min(this.drawStart.x, this.mouseWorld.x);
        let ry = Math.min(this.drawStart.y, this.mouseWorld.y);
        let rw = Math.abs(dx);
        let rh = Math.abs(dy);

        // One-Click Auto-Fit Roof over active floor walls if user just clicks!
        if (this.currentTool === 'roof' && rw < 20 && rh < 20) {
          const walls = STATE.elements.filter(e => e.type === 'wall' && (e.floor || 0) === (STATE.activeFloor || 0));
          if (walls.length >= 2) {
            const ov = 35;
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            walls.forEach(w => {
              minX = Math.min(minX, w.x1, w.x2); minY = Math.min(minY, w.y1, w.y2);
              maxX = Math.max(maxX, w.x1, w.x2); maxY = Math.max(maxY, w.y1, w.y2);
            });
            rx = minX - ov; ry = minY - ov;
            rw = (maxX - minX) + ov * 2; rh = (maxY - minY) + ov * 2;
          }
        }

        if (rw >= 20 && rh >= 20) {
          STATE_HISTORY.saveState();
          const item = {
            id: (this.currentTool === 'floor' ? 'fl_' : 'rf_') + Date.now(),
            type: this.currentTool,
            x: rx, y: ry, width: rw, height: rh,
            elevation: this.currentTool === 'roof' ? STATE.globWallHeight : 0,
            modelVariant: this.currentTool === 'roof' ? 'hipped' : undefined,
            material: this.currentTool === 'floor' ? 'wood' : 'tiles',
            color: this.currentTool === 'floor' ? '#c49a6c' : '#334155',
            rotation: 0,
            floor: STATE.activeFloor,
            cost: Math.round((rw * rh / 10000) * (this.currentTool === 'roof' ? ArchCore.RATES.roofSqM : ArchCore.RATES.floorSqM))
          };
          STATE.elements.push(item);
          selectElement(item);
          triggerUpdate();
        }
      }
      this.snappedPoint = null;
    },

    addTerrainSplat(x, y, lower) {
      STATE.elements.push({
        id: 'splat_' + Date.now() + '_' + Math.floor(Math.random() * 999),
        type: 'terrainSplat',
        x, y,
        radius: 140,
        force: lower ? -28 : 28,
        color: lower ? '#92400e' : '#16a34a',
        floor: 0,
        cost: 0
      });
      this.needsRedraw = true;
    },

    addObjectToWall(wall, wx, wy) {
      const l2 = (wall.x2 - wall.x1) ** 2 + (wall.y2 - wall.y1) ** 2;
      const t = l2 > 1 ? ((wx - wall.x1) * (wall.x2 - wall.x1) + (wy - wall.y1) * (wall.y2 - wall.y1)) / l2 : 0.5;
      const op = {
        id: 'op_' + Date.now(),
        type: this.currentTool,
        wallId: wall.id,
        t,
        length: this.currentTool === 'door' ? 95 : 140,
        height: this.currentTool === 'door' ? 215 : 130,
        elevation: this.currentTool === 'door' ? 0 : 90,
        modelVariant: 'single',
        color: this.currentTool === 'door' ? '#7c4a22' : '#334155',
        floor: STATE.activeFloor,
        cost: this.currentTool === 'door' ? ArchCore.RATES.door : ArchCore.RATES.window
      };
      ArchCore.clampOpeningOnWall(op, wall);
      STATE.elements.push(op);
      selectElement(op);
      triggerUpdate();
    },

    hitTest(x, y) {
      const floor = STATE.activeFloor || 0;
      const active = STATE.elements.filter(el => (el.floor || 0) === floor);

      // Priority: 1. Doors/Windows, 2. Lights/Cameras, 3. Furniture, 4. Walls, 5. Terrain, 6. Floors/Roofs
      const order = [
        el => el.type === 'door' || el.type === 'window',
        el => el.type === 'lightNode' || el.type === 'cameraNode',
        el => el.type === 'furniture',
        el => el.type === 'wall',
        el => el.type === 'terrainSplat',
        el => el.type === 'floor' || (el.type === 'roof' && this.showRoofOverlay)
      ];

      for (const pred of order) {
        for (let i = active.length - 1; i >= 0; i--) {
          const el = active[i];
          if (!pred(el)) continue;

          if (el.type === 'door' || el.type === 'window') {
            const wall = active.find(w => w.id === el.wallId);
            if (!wall) continue;
            const cx = wall.x1 + el.t * (wall.x2 - wall.x1);
            const cy = wall.y1 + el.t * (wall.y2 - wall.y1);
            if (Math.hypot(x - cx, y - cy) <= Math.max(30, el.length * 0.55)) return el;
          } else if (el.type === 'lightNode' || el.type === 'cameraNode') {
            if (Math.hypot(x - el.x, y - el.y) <= Math.max(22, 16 / this.camera.zoom)) return el;
          } else if (el.type === 'furniture') {
            const rad = -((el.rotation || 0) * Math.PI) / 180;
            const dx = x - el.x, dy = y - el.y;
            const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
            const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
            if (Math.abs(lx) <= (el.width || 80) * 0.52 && Math.abs(ly) <= (el.length || 80) * 0.52) return el;
          } else if (el.type === 'wall') {
            const l2 = (el.x2 - el.x1) ** 2 + (el.y2 - el.y1) ** 2;
            if (l2 < 1) continue;
            const t = Math.max(0, Math.min(1, ((x - el.x1) * (el.x2 - el.x1) + (y - el.y1) * (el.y2 - el.y1)) / l2));
            const d = Math.hypot(x - (el.x1 + t * (el.x2 - el.x1)), y - (el.y1 + t * (el.y2 - el.y1)));
            if (d <= (el.thick || 20) * 0.6 + 8 / this.camera.zoom) return el;
          } else if (el.type === 'terrainSplat') {
            if (Math.hypot(x - el.x, y - el.y) <= el.radius) return el;
          } else if (el.type === 'floor' || el.type === 'roof') {
            if (el.polygon) {
              if (ArchCore.pointInPoly(x, y, el.polygon)) return el;
            } else if (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height) {
              return el;
            }
          }
        }
      }
      return null;
    },

    draw() {
      const ctx = this.ctx;
      if (!ctx) return;

      ctx.save();
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.fillStyle = '#0b101b';
      ctx.fillRect(0, 0, this.width, this.height);

      this._drawAdaptiveGrid(ctx);

      ctx.save();
      ctx.translate(this.camera.x, this.camera.y);
      ctx.scale(this.camera.zoom, this.camera.zoom);

      // 0. Blueprint 2D Underlay (with opacity & scale calibration!)
      if (STATE.blueprintImage && STATE.blueprintVisible !== false) {
        ctx.save();
        ctx.globalAlpha = STATE.blueprintOpacity !== undefined ? STATE.blueprintOpacity : 0.45;
        const sc = STATE.blueprintScale || 1.0;
        const bw = STATE.blueprintImage.width * sc;
        const bh = STATE.blueprintImage.height * sc;
        ctx.drawImage(STATE.blueprintImage, -bw * 0.5, -bh * 0.5, bw, bh);
        ctx.restore();
      }

      // 0.5 Ghost Previous Floor Underlay (align upper stories seamlessly!)
      const activeFloor = STATE.activeFloor || 0;
      if (activeFloor > 0) {
        const lowerWalls = STATE.elements.filter(e => e.type === 'wall' && (e.floor || 0) === activeFloor - 1);
        ctx.save();
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
        ctx.setLineDash([12, 10]);
        lowerWalls.forEach(w => {
          ctx.lineWidth = w.thick || 20;
          ctx.beginPath(); ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2); ctx.stroke();
        });
        ctx.restore();
      }

      const curEls = STATE.elements.filter(el => (el.floor || 0) === activeFloor);

      // 1. Terrain Splats
      curEls.filter(e => e.type === 'terrainSplat').forEach(s => {
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = s.force >= 0 ? '#10b981' : '#ef4444';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2); ctx.fill();
        if (STATE.selectedElement === s) {
          ctx.globalAlpha = 0.9; ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 3 / this.camera.zoom; ctx.stroke();
        }
        ctx.restore();
      });

      // 2. Floors (ONLY floors, NOT roofs -> fixes double-draw bug!)
      curEls.filter(e => e.type === 'floor').forEach(fl => {
        ctx.save();
        ctx.fillStyle = fl.color || '#c49a6c';
        ctx.globalAlpha = 0.28;
        if (fl.polygon) {
          ctx.beginPath();
          ctx.moveTo(fl.polygon[0].x, fl.polygon[0].y);
          for (let i = 1; i < fl.polygon.length; i++) ctx.lineTo(fl.polygon[i].x, fl.polygon[i].y);
          ctx.closePath();
          ctx.fill();
          if (STATE.selectedElement === fl) {
            ctx.globalAlpha = 1; ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 3 / this.camera.zoom; ctx.stroke();
          }
        } else {
          ctx.fillRect(fl.x, fl.y, fl.width, fl.height);
          if (STATE.selectedElement === fl) {
            ctx.globalAlpha = 1; ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 3 / this.camera.zoom;
            ctx.strokeRect(fl.x, fl.y, fl.width, fl.height);
          }
        }
        ctx.restore();
      });

      // 3. Furniture & Architectural Catalog Objects (25 items with plan graphics!)
      curEls.filter(e => e.type === 'furniture').forEach(fur => this._drawFurniture2D(ctx, fur));

      // 4. Walls + Accurate Unit-Converted Dimension Lines!
      curEls.filter(e => e.type === 'wall').forEach(w => this._drawWall2D(ctx, w));

      // 5. Doors & Windows (Single / Double / Sliding architectural symbols!)
      curEls.filter(e => e.type === 'door' || e.type === 'window').forEach(op => {
        const wall = curEls.find(w => w.id === op.wallId);
        if (wall) this._drawOpening2D(ctx, op, wall);
      });

      // 6. Roof Architectural Dashed Overhang Outline (Active Floor Only, drawn ONCE!)
      if (this.showRoofOverlay) {
        curEls.filter(e => e.type === 'roof').forEach(r => this._drawRoof2D(ctx, r));
      }

      // 7. Auto-Detected Rooms Area Badges (m² / ft²)
      this.detectedRooms = ArchCore.detectRooms(STATE.elements, activeFloor);
      this.detectedRooms.forEach(room => this._drawRoomLabel(ctx, room));

      // 8. Camera Tour Path & Light Nodes
      this._drawCameraAndLights2D(ctx, curEls);

      // 9. Live Drawing Guides, Ghost Openings & Measure Caliper
      this._drawGuides2D(ctx);

      ctx.restore(); // end world transform
      ctx.restore(); // end dpr transform
    },

    _drawAdaptiveGrid(ctx) {
      const targetPx = 45;
      const rawCm = targetPx / this.camera.zoom;
      const steps = [10, 25, 50, 100, 200, 500];
      let stepCm = 50;
      for (const s of steps) { if (s >= rawCm) { stepCm = s; break; } }

      const startX = Math.floor(-this.camera.x / this.camera.zoom / stepCm) * stepCm;
      const endX = Math.ceil((this.width - this.camera.x) / this.camera.zoom / stepCm) * stepCm;
      const startY = Math.floor(-this.camera.y / this.camera.zoom / stepCm) * stepCm;
      const endY = Math.ceil((this.height - this.camera.y) / this.camera.zoom / stepCm) * stepCm;

      ctx.lineWidth = 1;
      for (let x = startX; x <= endX; x += stepCm) {
        const sx = x * this.camera.zoom + this.camera.x;
        const major = Math.abs(x % (stepCm * 2)) < 0.01;
        ctx.strokeStyle = x === 0 ? 'rgba(59, 130, 246, 0.35)' : (major ? 'rgba(148, 163, 184, 0.11)' : 'rgba(148, 163, 184, 0.045)');
        ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, this.height); ctx.stroke();
      }
      for (let y = startY; y <= endY; y += stepCm) {
        const sy = y * this.camera.zoom + this.camera.y;
        const major = Math.abs(y % (stepCm * 2)) < 0.01;
        ctx.strokeStyle = y === 0 ? 'rgba(16, 185, 129, 0.35)' : (major ? 'rgba(148, 163, 184, 0.11)' : 'rgba(148, 163, 184, 0.045)');
        ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(this.width, sy); ctx.stroke();
      }
    },

    _drawWall2D(ctx, w) {
      const isSel = STATE.selectedElement === w;
      const isHover = this.hoverElement === w && !isSel;
      ctx.save();
      ctx.lineWidth = w.thick || 20;
      ctx.lineCap = 'round';
      ctx.strokeStyle = isSel ? '#3b82f6' : (isHover ? '#60a5fa' : (w.color || '#f1f5f9'));

      ctx.beginPath();
      ctx.moveTo(w.x1, w.y1);
      if (w.curvature) {
        const cx = (w.x1 + w.x2) * 0.5, cy = (w.y1 + w.y2) * 0.5;
        const ang = Math.atan2(w.y2 - w.y1, w.x2 - w.x1);
        ctx.quadraticCurveTo(cx + Math.cos(ang - Math.PI / 2) * w.curvature * 2, cy + Math.sin(ang - Math.PI / 2) * w.curvature * 2, w.x2, w.y2);
      } else {
        ctx.lineTo(w.x2, w.y2);
      }
      ctx.stroke();

      // Subtle architectural centerline
      ctx.lineWidth = 1.2 / this.camera.zoom;
      ctx.strokeStyle = isSel ? '#ffffff' : 'rgba(15, 23, 42, 0.55)';
      ctx.stroke();

      // Draggable Endpoint Handles when Selected!
      if (isSel) {
        const hr = 7 / this.camera.zoom;
        [[w.x1, w.y1], [w.x2, w.y2]].forEach(([hx, hy]) => {
          ctx.fillStyle = '#10b981';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2 / this.camera.zoom;
          ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        });
      }

      // Dimension Label (Accurate m / cm / in / ft!)
      const len = ArchCore.wallLength(w);
      if (len > 30) {
        const ang = Math.atan2(w.y2 - w.y1, w.x2 - w.x1);
        const mx = (w.x1 + w.x2) * 0.5;
        const my = (w.y1 + w.y2) * 0.5;
        const off = Math.max(26, (w.thick || 20) * 0.5 + 16 / this.camera.zoom);
        const nx = Math.cos(ang - Math.PI / 2), ny = Math.sin(ang - Math.PI / 2);

        ctx.translate(mx + nx * off, my + ny * off);
        let tAng = ang;
        if (tAng > Math.PI / 2 || tAng < -Math.PI / 2) tAng += Math.PI;
        ctx.rotate(tAng);

        const label = ArchCore.formatLength(len, STATE.unit);
        ctx.font = `700 ${11 / this.camera.zoom}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isSel ? '#60a5fa' : '#34d399';
        ctx.fillText(label, 0, 0);
      }
      ctx.restore();
    },

    _drawOpening2D(ctx, op, wall) {
      const cx = wall.x1 + op.t * (wall.x2 - wall.x1);
      const cy = wall.y1 + op.t * (wall.y2 - wall.y1);
      const ang = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1);
      const th = wall.thick || 20;
      const isSel = STATE.selectedElement === op;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang);

      // Clear wall opening cutout
      ctx.fillStyle = '#0b101b';
      ctx.fillRect(-op.length / 2, -th / 2 - 2, op.length, th + 4);

      if (op.type === 'door') {
        const col = isSel ? '#38bdf8' : '#f59e0b';
        ctx.strokeStyle = col;
        ctx.fillStyle = col;
        ctx.lineWidth = 2.2 / this.camera.zoom;

        if (op.modelVariant === 'double') {
          const hw = op.length / 2;
          ctx.beginPath(); ctx.arc(-hw, th / 2, hw, 0, Math.PI / 2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-hw, th / 2); ctx.lineTo(-hw, th / 2 + hw); ctx.stroke();
          ctx.beginPath(); ctx.arc(hw, th / 2, hw, Math.PI / 2, Math.PI); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(hw, th / 2); ctx.lineTo(hw, th / 2 + hw); ctx.stroke();
        } else if (op.modelVariant === 'sliding') {
          ctx.fillRect(-op.length / 2, -3, op.length * 0.55, 4);
          ctx.fillRect(-op.length * 0.05, 2, op.length * 0.55, 4);
        } else {
          ctx.beginPath(); ctx.arc(-op.length / 2, th / 2, op.length, 0, Math.PI / 2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-op.length / 2, th / 2); ctx.lineTo(-op.length / 2, th / 2 + op.length); ctx.stroke();
        }
      } else {
        // Window glazing lines
        const col = isSel ? '#fbbf24' : '#38bdf8';
        ctx.strokeStyle = col;
        ctx.lineWidth = 2.2 / this.camera.zoom;
        ctx.strokeRect(-op.length / 2, -th / 2, op.length, th);
        ctx.beginPath();
        ctx.moveTo(-op.length / 2, -3); ctx.lineTo(op.length / 2, -3);
        ctx.moveTo(-op.length / 2, 3); ctx.lineTo(op.length / 2, 3);
        ctx.stroke();
      }
      ctx.restore();
    },

    _drawFurniture2D(ctx, fur) {
      const isSel = STATE.selectedElement === fur;
      const spec = ArchCore.CATALOG[fur.modelVariant];
      ctx.save();
      ctx.translate(fur.x, fur.y);
      ctx.rotate(((fur.rotation || 0) * Math.PI) / 180);

      const hw = (fur.width || 80) / 2, hl = (fur.length || 80) / 2;

      if (fur.modelVariant === 'pool') {
        ctx.fillStyle = 'rgba(14, 165, 233, 0.45)';
        ctx.strokeStyle = isSel ? '#fbbf24' : '#38bdf8';
        ctx.lineWidth = 4 / this.camera.zoom;
        ctx.fillRect(-hw, -hl, fur.width, fur.length);
        ctx.strokeRect(-hw, -hl, fur.width, fur.length);
      } else if (fur.modelVariant === 'tree' || fur.modelVariant === 'plant') {
        ctx.fillStyle = fur.modelVariant === 'tree' ? 'rgba(22, 163, 74, 0.45)' : 'rgba(21, 128, 61, 0.55)';
        ctx.strokeStyle = isSel ? '#38bdf8' : '#22c55e';
        ctx.lineWidth = 2 / this.camera.zoom;
        ctx.beginPath(); ctx.arc(0, 0, Math.min(hw, hl), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      } else if (fur.modelVariant && fur.modelVariant.startsWith('stairs')) {
        ctx.fillStyle = 'rgba(154, 107, 66, 0.35)';
        ctx.strokeStyle = isSel ? '#38bdf8' : '#d97706';
        ctx.lineWidth = 2 / this.camera.zoom;
        ctx.fillRect(-hw, -hl, fur.width, fur.length);
        ctx.strokeRect(-hw, -hl, fur.width, fur.length);
        // Step tread lines
        const steps = 10;
        for (let i = 1; i < steps; i++) {
          const sy = -hl + (fur.length * i) / steps;
          ctx.beginPath(); ctx.moveTo(-hw, sy); ctx.lineTo(hw, sy); ctx.stroke();
        }
        // UP arrow
        ctx.beginPath(); ctx.moveTo(0, hl * 0.7); ctx.lineTo(0, -hl * 0.7); ctx.stroke();
      } else {
        ctx.fillStyle = isSel ? 'rgba(59, 130, 246, 0.45)' : 'rgba(51, 65, 85, 0.65)';
        ctx.strokeStyle = isSel ? '#60a5fa' : (fur.color || '#94a3b8');
        ctx.lineWidth = (isSel ? 3 : 1.8) / this.camera.zoom;
        ctx.fillRect(-hw, -hl, fur.width, fur.length);
        ctx.strokeRect(-hw, -hl, fur.width, fur.length);

        const icon = spec ? spec.icon : '📦';
        ctx.fillStyle = '#f8fafc';
        ctx.font = `${Math.max(14, Math.min(fur.width, fur.length) * 0.42)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icon, 0, 0);
      }
      ctx.restore();
    },

    _drawRoof2D(ctx, r) {
      const isSel = STATE.selectedElement === r;
      ctx.save();
      ctx.strokeStyle = isSel ? '#38bdf8' : 'rgba(248, 113, 113, 0.55)';
      ctx.lineWidth = (isSel ? 3 : 2) / this.camera.zoom;
      ctx.setLineDash([14, 8]);

      if (r.polygon && r.polygon.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(r.polygon[0].x, r.polygon[0].y);
        for (let i = 1; i < r.polygon.length; i++) ctx.lineTo(r.polygon[i].x, r.polygon[i].y);
        ctx.closePath();
        ctx.stroke();
      } else {
        const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
        ctx.translate(cx, cy);
        ctx.rotate(((r.rotation || 0) * Math.PI) / 180);
        ctx.strokeRect(-r.width / 2, -r.height / 2, r.width, r.height);
        // Ridge hint
        if (r.modelVariant === 'gabled') {
          ctx.beginPath(); ctx.moveTo(-r.width / 2, 0); ctx.lineTo(r.width / 2, 0); ctx.stroke();
        } else if (r.modelVariant === 'hipped') {
          ctx.beginPath();
          ctx.moveTo(-r.width / 2, -r.height / 2); ctx.lineTo(0, 0);
          ctx.moveTo(r.width / 2, -r.height / 2); ctx.lineTo(0, 0);
          ctx.moveTo(-r.width / 2, r.height / 2); ctx.lineTo(0, 0);
          ctx.moveTo(r.width / 2, r.height / 2); ctx.lineTo(0, 0);
          ctx.stroke();
        }
      }
      ctx.restore();
    },

    _drawRoomLabel(ctx, room) {
      const label = (STATE.lang === 'fr' ? room.labelFr : room.labelEn);
      const areaStr = ArchCore.formatArea(room.areaSqM, STATE.unit);
      ctx.save();
      ctx.translate(room.cx, room.cy);
      const fSize = 11 / this.camera.zoom;
      ctx.font = `700 ${fSize}px Inter, sans-serif`;
      const tw = Math.max(ctx.measureText(label).width, ctx.measureText(areaStr).width) + 16 / this.camera.zoom;
      const th = 30 / this.camera.zoom;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 1 / this.camera.zoom;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(-tw / 2, -th / 2, tw, th, 6 / this.camera.zoom) : ctx.rect(-tw / 2, -th / 2, tw, th);
      ctx.fill(); ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#f1f5f9';
      ctx.fillText(label, 0, -6 / this.camera.zoom);
      ctx.fillStyle = '#38bdf8';
      ctx.font = `700 ${10 / this.camera.zoom}px "JetBrains Mono", monospace`;
      ctx.fillText(areaStr, 0, 7 / this.camera.zoom);
      ctx.restore();
    },

    _drawCameraAndLights2D(ctx, curEls) {
      const cams = curEls.filter(e => e.type === 'cameraNode');
      if (cams.length > 1) {
        ctx.save();
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)';
        ctx.lineWidth = 3 / this.camera.zoom;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(cams[0].x, cams[0].y);
        for (let i = 1; i < cams.length; i++) ctx.lineTo(cams[i].x, cams[i].y);
        ctx.stroke();
        ctx.restore();
      }
      cams.forEach((c, idx) => {
        ctx.save();
        const r = 9 / this.camera.zoom;
        ctx.fillStyle = STATE.selectedElement === c ? '#38bdf8' : '#a855f7';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 / this.camera.zoom;
        ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = `700 ${9 / this.camera.zoom}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(`C${idx + 1}`, c.x, c.y - 14 / this.camera.zoom);
        ctx.restore();
      });

      curEls.filter(e => e.type === 'lightNode').forEach(l => {
        ctx.save();
        const r = 7 / this.camera.zoom;
        ctx.fillStyle = 'rgba(251, 191, 36, 0.22)';
        ctx.beginPath(); ctx.arc(l.x, l.y, r * 2.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = STATE.selectedElement === l ? '#38bdf8' : '#fbbf24';
        ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.5 / this.camera.zoom;
        ctx.beginPath(); ctx.arc(l.x, l.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.restore();
      });
    },

    _drawGuides2D(ctx) {
      // Snap reticle
      if (this.snappedPoint && this.snappedPoint.snapped) {
        ctx.save();
        const sp = this.snappedPoint;
        const r = 7 / this.camera.zoom;
        ctx.strokeStyle = sp.snapped === 'endpoint' ? '#10b981' : (sp.snapped === 'midpoint' ? '#38bdf8' : '#94a3b8');
        ctx.lineWidth = 2 / this.camera.zoom;
        ctx.beginPath(); ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }

      // Active drawing guide
      if (this.isDrawing && this.currentTool === 'wall') {
        const dx = this.mouseWorld.x - this.drawStart.x;
        const dy = this.mouseWorld.y - this.drawStart.y;
        const len = Math.hypot(dx, dy);
        ctx.save();
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
        ctx.lineWidth = STATE.globWallThick;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.drawStart.x, this.drawStart.y);
        if (this.mouseWorld.shiftCurve && len > 20) {
          const cx = (this.drawStart.x + this.mouseWorld.x) * 0.5;
          const cy = (this.drawStart.y + this.mouseWorld.y) * 0.5;
          const ang = Math.atan2(dy, dx);
          ctx.quadraticCurveTo(cx + Math.cos(ang - Math.PI / 2) * len * 0.44, cy + Math.sin(ang - Math.PI / 2) * len * 0.44, this.mouseWorld.x, this.mouseWorld.y);
        } else {
          ctx.lineTo(this.mouseWorld.x, this.mouseWorld.y);
        }
        ctx.stroke();

        if (len > 15) {
          ctx.fillStyle = '#34d399';
          ctx.font = `700 ${13 / this.camera.zoom}px "JetBrains Mono", monospace`;
          ctx.textAlign = 'center';
          ctx.fillText(ArchCore.formatLength(len, STATE.unit), (this.drawStart.x + this.mouseWorld.x) * 0.5, (this.drawStart.y + this.mouseWorld.y) * 0.5 - 24 / this.camera.zoom);
        }
        ctx.restore();
      } else if (this.isDrawing && (this.currentTool === 'floor' || this.currentTool === 'roof')) {
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2 / this.camera.zoom;
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(
          Math.min(this.drawStart.x, this.mouseWorld.x),
          Math.min(this.drawStart.y, this.mouseWorld.y),
          Math.abs(this.mouseWorld.x - this.drawStart.x),
          Math.abs(this.mouseWorld.y - this.drawStart.y)
        );
        ctx.restore();
      }

      // Measure Caliper line
      if (this.measurePts.length > 0) {
        const a = this.measurePts[0];
        const b = this.measurePts.length >= 2 ? this.measurePts[1] : this.mouseWorld;
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5 / this.camera.zoom;
        ctx.setLineDash([8, 6]);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#38bdf8';
        ctx.font = `700 ${13 / this.camera.zoom}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(ArchCore.formatLength(d, STATE.unit), (a.x + b.x) * 0.5, (a.y + b.y) * 0.5 - 16 / this.camera.zoom);
        ctx.restore();
      }

      // Terrain brush circle
      if (this.currentTool === 'terrain') {
        ctx.save();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2 / this.camera.zoom;
        ctx.beginPath(); ctx.arc(this.mouseWorld.x, this.mouseWorld.y, 140, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }

      // Ghost door/window placement preview on hovered wall
      if ((this.currentTool === 'door' || this.currentTool === 'window') && this.hoverElement && this.hoverElement.type === 'wall') {
        const w = this.hoverElement;
        const l2 = (w.x2 - w.x1) ** 2 + (w.y2 - w.y1) ** 2;
        if (l2 > 1) {
          const t = Math.max(0.08, Math.min(0.92, ((this.mouseWorld.x - w.x1) * (w.x2 - w.x1) + (this.mouseWorld.y - w.y1) * (w.y2 - w.y1)) / l2));
          const cx = w.x1 + t * (w.x2 - w.x1), cy = w.y1 + t * (w.y2 - w.y1);
          const ang = Math.atan2(w.y2 - w.y1, w.x2 - w.x1);
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(ang);
          ctx.fillStyle = this.currentTool === 'door' ? 'rgba(245, 158, 11, 0.7)' : 'rgba(56, 189, 248, 0.7)';
          ctx.fillRect(-50, -(w.thick || 20) / 2 - 2, 100, (w.thick || 20) + 4);
          ctx.restore();
        }
      }
    }
  };
})();
