/**
 * DFX Studio Pro — Hardware-Accelerated 2D CAD HiDPI Viewport
 * (Zoom/Pan, Millimeter Grid, Split Before/After Curtain, Caliper, Calibration,
 *  CAD Doctor Overlay, Path Selection, Animated Laser/CNC Simulator)
 * + Integrated Three.js r165 2D->3D Extrude Viewport, Watertight STL & WebAR Bridge.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const MATERIALS_3D = {
  aluminum: { color: 0xd0d9e4, metalness: 0.86, roughness: 0.26, clearcoat: 0.15 },
  plywood: { color: 0xd6b181, metalness: 0.04, roughness: 0.78, clearcoat: 0.05 },
  acrylic_black: { color: 0x161b26, metalness: 0.08, roughness: 0.12, clearcoat: 0.9 },
  brass: { color: 0xe3b648, metalness: 0.90, roughness: 0.24, clearcoat: 0.2 },
  emerald_cad: { color: 0x10b981, metalness: 0.22, roughness: 0.24, clearcoat: 0.65 }
};

class DfxViewportController {
  constructor(opts) {
    this.canvas2d = opts.canvas2d;
    this.ctx = this.canvas2d.getContext('2d');
    this.container3d = opts.container3d;
    this.callbacks = opts.callbacks || {};

    // View state
    this.viewMode = 'split'; // 'vector' | 'raster' | 'split' | '3d'
    this.tool = 'pan';       // 'pan' | 'select' | 'measure' | 'calibrate'
    this.splitRatio = 0.48;
    this.draggingSplit = false;

    // 2D camera (screenX = panX + mmX * zoom)
    this.zoom = 4;
    this.panX = 80;
    this.panY = 80;
    this.isPanning = false;
    this.spaceDown = false;
    this.dragStart = null;
    this.hoverMm = null;

    // Document & source images
    this.doc = null;
    this.kerfDoc = null;
    this.diagnostics = null;
    this.toolpathPlan = null;
    this.origImageCanvas = null;
    this.procRasterCanvas = null;

    // Visual overlays
    this.showGrid = true;
    this.showFill = true;
    this.showDiagnostics = true;
    this.showRapid = true;
    this.strokeWidthPx = 1.6;
    this.kerfMm = 0;

    // Interactive tools state
    this.selectedPathId = null;
    this.measurePts = [];
    this.calibratePts = [];

    // Laser/CNC Simulator state
    this.simActive = false;
    this.simPlaying = false;
    this.simProgress = 0; // 0..1
    this.simSpeed = 1.0;
    this.simSegments = [];
    this.simTotalDist = 0;
    this.lastFrameTime = 0;

    // 3D Extrude state
    this.extrudeOpts = { thicknessMm: 5.0, bevelMm: 0.4, material: 'aluminum' };
    this.threeReady = false;
    this.threeScene = null;
    this.threeCamera = null;
    this.threeRenderer = null;
    this.threeControls = null;
    this.extrudeGroup = null;
    this.gridHelper3d = null;
    this._needs3dRebuild = true;

    this._bindEvents();
    this._startLoop();
  }

  _bindEvents() {
    const c = this.canvas2d;

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        this.spaceDown = true;
        c.style.cursor = 'grab';
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedPathId &&
          document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        if (this.callbacks.onDeletePath) this.callbacks.onDeletePath(this.selectedPathId);
        this.selectedPathId = null;
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.spaceDown = false;
        this._updateCursor();
      }
    });

    c.addEventListener('wheel', (e) => {
      if (this.viewMode === '3d') return;
      e.preventDefault();
      const rect = c.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const before = this.screenToMm(mx, my);
      const factor = e.deltaY < 0 ? 1.14 : (1 / 1.14);
      this.zoom = Math.max(0.2, Math.min(80, this.zoom * factor));
      this.panX = mx - before[0] * this.zoom;
      this.panY = my - before[1] * this.zoom;
      this._notifyZoom();
    }, { passive: false });

    c.addEventListener('pointerdown', (e) => {
      if (this.viewMode === '3d') return;
      const rect = c.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      // Check split curtain handle hit first in split mode
      if (this.viewMode === 'split' && this.origImageCanvas) {
        const splitX = rect.width * this.splitRatio;
        if (Math.abs(mx - splitX) < 16) {
          this.draggingSplit = true;
          c.setPointerCapture(e.pointerId);
          return;
        }
      }

      // Middle click or Spacebar or pan tool -> pan
      if (e.button === 1 || this.spaceDown || this.tool === 'pan') {
        this.isPanning = true;
        this.dragStart = { x: mx, y: my, panX: this.panX, panY: this.panY };
        c.setPointerCapture(e.pointerId);
        c.style.cursor = 'grabbing';
        return;
      }

      const mm = this.screenToMm(mx, my);

      if (this.tool === 'select') {
        const hit = this._hitTestPath(mm[0], mm[1]);
        this.selectedPathId = hit ? hit.id : null;
        if (this.callbacks.onSelectPath) this.callbacks.onSelectPath(hit);
        return;
      }

      if (this.tool === 'measure') {
        if (this.measurePts.length >= 2) this.measurePts = [];
        this.measurePts.push(mm);
        if (this.measurePts.length === 2 && this.callbacks.onMeasure) {
          const [a, b] = this.measurePts;
          const dx = b[0] - a[0], dy = b[1] - a[1];
          const d = Math.hypot(dx, dy);
          const ang = (Math.atan2(-dy, dx) * 180) / Math.PI;
          this.callbacks.onMeasure({ dist: d, dx: Math.abs(dx), dy: Math.abs(dy), angle: ang });
        }
        return;
      }

      if (this.tool === 'calibrate') {
        if (this.calibratePts.length >= 2) this.calibratePts = [];
        this.calibratePts.push(mm);
        if (this.calibratePts.length === 2 && this.callbacks.onCalibratePicked) {
          const [a, b] = this.calibratePts;
          const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
          this.callbacks.onCalibratePicked(d);
        }
      }
    });

    c.addEventListener('pointermove', (e) => {
      if (this.viewMode === '3d') return;
      const rect = c.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      if (this.draggingSplit) {
        this.splitRatio = Math.max(0.05, Math.min(0.95, mx / Math.max(1, rect.width)));
        return;
      }
      if (this.isPanning && this.dragStart) {
        this.panX = this.dragStart.panX + (mx - this.dragStart.x);
        this.panY = this.dragStart.panY + (my - this.dragStart.y);
        return;
      }
      this.hoverMm = this.screenToMm(mx, my);
      if (this.callbacks.onCursorMove && this.doc) {
        this.callbacks.onCursorMove(this.hoverMm[0], this.doc.heightMm - this.hoverMm[1]);
      }
      if (this.viewMode === 'split' && this.origImageCanvas) {
        const splitX = rect.width * this.splitRatio;
        if (Math.abs(mx - splitX) < 16) {
          c.style.cursor = 'ew-resize';
          return;
        }
      }
      this._updateCursor();
    });

    const endDrag = () => {
      this.isPanning = false;
      this.draggingSplit = false;
      this.dragStart = null;
      this._updateCursor();
    };
    c.addEventListener('pointerup', endDrag);
    c.addEventListener('pointercancel', endDrag);
    c.addEventListener('dblclick', () => {
      if (this.tool === 'pan') this.fitToView();
    });
  }

  _updateCursor() {
    const c = this.canvas2d;
    if (this.spaceDown || this.tool === 'pan') c.style.cursor = 'grab';
    else if (this.tool === 'select') c.style.cursor = 'pointer';
    else c.style.cursor = 'crosshair';
  }

  _notifyZoom() {
    if (this.callbacks.onZoomChange) {
      const pct = Math.round((this.zoom / 4) * 100);
      this.callbacks.onZoomChange(pct);
    }
  }

  resize() {
    const parent = this.canvas2d.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(100, Math.floor(rect.width));
    const h = Math.max(100, Math.floor(rect.height));

    if (this.canvas2d.width !== Math.floor(w * dpr) || this.canvas2d.height !== Math.floor(h * dpr)) {
      this.canvas2d.width = Math.floor(w * dpr);
      this.canvas2d.height = Math.floor(h * dpr);
    }

    if (this.threeReady && this.threeRenderer && this.threeCamera) {
      this.threeCamera.aspect = w / h;
      this.threeCamera.updateProjectionMatrix();
      this.threeRenderer.setSize(w, h, false);
    }
  }

  screenToMm(sx, sy) {
    return [(sx - this.panX) / this.zoom, (sy - this.panY) / this.zoom];
  }

  mmToScreen(mx, my) {
    return [this.panX + mx * this.zoom, this.panY + my * this.zoom];
  }

  fitToView() {
    if (!this.doc) return;
    this.resize();
    const rect = this.canvas2d.parentElement.getBoundingClientRect();
    const w = Math.max(100, rect.width);
    const h = Math.max(100, rect.height);
    const pad = 64;
    const zx = (w - pad * 2) / Math.max(1, this.doc.widthMm);
    const zy = (h - pad * 2) / Math.max(1, this.doc.heightMm);
    this.zoom = Math.max(0.2, Math.min(40, Math.min(zx, zy)));
    this.panX = (w - this.doc.widthMm * this.zoom) * 0.5;
    this.panY = (h - this.doc.heightMm * this.zoom) * 0.5;
    this._notifyZoom();
  }

  zoomStep(mult) {
    const rect = this.canvas2d.parentElement.getBoundingClientRect();
    const cx = rect.width * 0.5, cy = rect.height * 0.5;
    const before = this.screenToMm(cx, cy);
    this.zoom = Math.max(0.2, Math.min(80, this.zoom * mult));
    this.panX = cx - before[0] * this.zoom;
    this.panY = cy - before[1] * this.zoom;
    this._notifyZoom();
  }

  setViewMode(mode) {
    this.viewMode = mode;
    const is3d = mode === '3d';
    this.canvas2d.style.display = is3d ? 'none' : 'block';
    this.container3d.style.display = is3d ? 'block' : 'none';
    if (is3d) {
      this._ensureThreeInit();
      this.resize();
      if (this._needs3dRebuild) this._rebuild3DExtrusion();
    } else {
      this.resize();
    }
  }

  setTool(tool) {
    this.tool = tool;
    if (tool !== 'measure') this.measurePts = [];
    if (tool !== 'calibrate') this.calibratePts = [];
    this._updateCursor();
  }

  setData({ doc, kerfDoc, diagnostics, toolpathPlan, origImageCanvas, procRasterCanvas, kerfMm, strokeWidthPx }) {
    this.doc = doc;
    this.kerfDoc = kerfDoc || null;
    this.diagnostics = diagnostics || null;
    this.toolpathPlan = toolpathPlan || null;
    if (origImageCanvas !== undefined) this.origImageCanvas = origImageCanvas;
    if (procRasterCanvas !== undefined) this.procRasterCanvas = procRasterCanvas;
    if (typeof kerfMm === 'number') this.kerfMm = kerfMm;
    if (typeof strokeWidthPx === 'number') this.strokeWidthPx = strokeWidthPx;

    this._buildSimSegments();
    this._needs3dRebuild = true;
    if (this.viewMode === '3d' && this.threeReady) {
      this._rebuild3DExtrusion();
    }
  }

  setExtrudeOptions(opts) {
    Object.assign(this.extrudeOpts, opts || {});
    this._needs3dRebuild = true;
    if (this.viewMode === '3d' && this.threeReady) {
      this._rebuild3DExtrusion();
    }
  }

  // ---- Hit testing for Select & Delete Path ----
  _hitTestPath(mx, my) {
    if (!this.doc) return null;
    const vis = new Set(this.doc.layers.filter(l => l.visible !== false).map(l => l.id));
    const tolMm = Math.max(0.8, 10 / this.zoom);
    let bestPath = null, bestD = tolMm;

    for (const p of this.doc.paths) {
      if (!vis.has(p.layerId) || p.pts.length < 2) continue;
      const segs = p.closed ? p.pts.length : p.pts.length - 1;
      for (let i = 0; i < segs; i++) {
        const a = p.pts[i], b = p.pts[(i + 1) % p.pts.length];
        const d = pointToSegDist(mx, my, a[0], a[1], b[0], b[1]);
        if (d < bestD) { bestD = d; bestPath = p; }
      }
    }
    return bestPath;
  }

  // ---- Laser / CNC Toolpath Simulator ----
  _buildSimSegments() {
    this.simSegments = [];
    this.simTotalDist = 0;
    if (!this.toolpathPlan || !this.toolpathPlan.ordered) return;
    for (const item of this.toolpathPlan.ordered) {
      const pts = item.pts;
      if (pts.length < 2) continue;
      // Rapid travel move
      const rLen = Math.hypot(pts[0][0] - item.rapidFrom[0], pts[0][1] - item.rapidFrom[1]);
      if (rLen > 0.01) {
        this.simSegments.push({
          rapid: true, a: item.rapidFrom, b: pts[0],
          len: rLen, startD: this.simTotalDist, color: '#06b6d4'
        });
        this.simTotalDist += rLen * 0.35; // rapids move faster in animation
      }
      const segCount = item.closed ? pts.length : pts.length - 1;
      for (let i = 0; i < segCount; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        const cLen = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (cLen < 1e-5) continue;
        this.simSegments.push({
          rapid: false, a, b,
          len: cLen, startD: this.simTotalDist, color: item.color || '#10b981'
        });
        this.simTotalDist += cLen;
      }
    }
  }

  toggleSimPlay(forceState) {
    this.simActive = true;
    this.simPlaying = typeof forceState === 'boolean' ? forceState : !this.simPlaying;
    if (this.simPlaying && this.simProgress >= 0.999) this.simProgress = 0;
    return this.simPlaying;
  }

  stopSim() {
    this.simActive = false;
    this.simPlaying = false;
    this.simProgress = 0;
  }

  setSimProgress(val) {
    this.simActive = true;
    this.simProgress = Math.max(0, Math.min(1, val));
  }

  // ---- Main Render Loop ----
  _startLoop() {
    const tick = (ts) => {
      requestAnimationFrame(tick);
      const dt = Math.min(0.05, (ts - (this.lastFrameTime || ts)) / 1000);
      this.lastFrameTime = ts;

      if (this.simActive && this.simPlaying && this.simTotalDist > 0) {
        // Advance simulation speed scaled to total distance (~10s base run at 1x)
        this.simProgress += (dt * this.simSpeed) / 10;
        if (this.simProgress >= 1) {
          this.simProgress = 1;
          this.simPlaying = false;
          if (this.callbacks.onSimUpdate) this.callbacks.onSimUpdate(1, false);
        } else if (this.callbacks.onSimUpdate) {
          this.callbacks.onSimUpdate(this.simProgress, true);
        }
      }

      if (this.viewMode === '3d') {
        if (this.threeReady && this.threeRenderer && this.threeScene && this.threeCamera) {
          this.threeControls.update();
          this.threeRenderer.render(this.threeScene, this.threeCamera);
        }
      } else {
        this._render2D();
      }
    };
    requestAnimationFrame(tick);
  }

  _render2D() {
    const c = this.canvas2d;
    const ctx = this.ctx;
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = c.width / dpr;
    const H = c.height / dpr;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // CAD dark slate blueprint background
    ctx.fillStyle = '#090e17';
    ctx.fillRect(0, 0, W, H);

    if (this.showGrid) this._drawGrid(ctx, W, H);

    if (!this.doc) {
      ctx.restore();
      return;
    }

    const docW = this.doc.widthMm;
    const docH = this.doc.heightMm;
    const [ox, oy] = this.mmToScreen(0, 0);
    const sw = docW * this.zoom;
    const sh = docH * this.zoom;

    // Subtle paper/workpiece frame
    ctx.fillStyle = this.viewMode === 'raster' ? '#ffffff' : 'rgba(15, 23, 42, 0.72)';
    ctx.fillRect(ox, oy, sw, sh);

    if (this.viewMode === 'raster') {
      const imgC = this.procRasterCanvas || this.origImageCanvas;
      if (imgC) {
        ctx.imageSmoothingEnabled = this.zoom < 4;
        ctx.drawImage(imgC, ox, oy, sw, sh);
      } else {
        this._drawVectors(ctx);
      }
    } else if (this.viewMode === 'split' && this.origImageCanvas) {
      const splitX = W * this.splitRatio;
      // Left half: Original color image (or processed raster if desired)
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, splitX, H);
      ctx.clip();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ox, oy, sw, sh);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.origImageCanvas, ox, oy, sw, sh);
      ctx.restore();

      // Right half: Crisp Vector CAD overlay
      ctx.save();
      ctx.beginPath();
      ctx.rect(splitX, 0, W - splitX, H);
      ctx.clip();
      this._drawVectors(ctx);
      ctx.restore();

      // Split curtain divider line & pill handle
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, H);
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(splitX, H * 0.5, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⇄', splitX, H * 0.5);

      // Corner labels
      this._drawBadge(ctx, Math.max(12, splitX - 116), 14, 'ORIGINAL', '#0f172a', '#94a3b8');
      this._drawBadge(ctx, Math.min(W - 118, splitX + 12), 14, 'CAD VECTOR', '#064e3b', '#34d399');
    } else {
      // Full Vector CAD mode
      this._drawVectors(ctx);
    }

    // Workpiece bounding box + exact millimeter ruler annotations
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(ox, oy, sw, sh);
    ctx.setLineDash([]);
    this._drawDimensionRulers(ctx, ox, oy, sw, sh, docW, docH);

    // CAD Doctor Diagnostic Markers
    if (this.showDiagnostics && this.diagnostics && this.viewMode !== 'raster') {
      this._drawDiagnostics(ctx);
    }

    // Animated Laser/CNC Toolpath Simulation Overlay
    if (this.simActive && this.simSegments.length > 0 && this.viewMode !== 'raster') {
      this._drawSimulation(ctx);
    }

    // Interactive Measurement Caliper & 2-Point Calibration Overlays
    if (this.measurePts.length > 0) this._drawCaliper(ctx, this.measurePts, '#38bdf8', false);
    if (this.calibratePts.length > 0) this._drawCaliper(ctx, this.calibratePts, '#f59e0b', true);

    ctx.restore();
  }

  _drawBadge(ctx, x, y, text, bg, fg) {
    ctx.save();
    ctx.font = '700 10px "JetBrains Mono", monospace';
    const tw = ctx.measureText(text).width + 16;
    ctx.fillStyle = bg;
    ctx.strokeStyle = fg;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, tw, 22, 6) : ctx.rect(x, y, tw, 22);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + tw * 0.5, y + 11);
    ctx.restore();
  }

  _drawGrid(ctx, W, H) {
    // Choose crisp metric grid spacing (1, 5, 10, 25, 50, 100 mm)
    const targetPx = 44;
    const rawMm = targetPx / this.zoom;
    const steps = [0.5, 1, 2, 5, 10, 25, 50, 100, 250, 500];
    let stepMm = 10;
    for (let i = 0; i < steps.length; i++) {
      if (steps[i] >= rawMm) { stepMm = steps[i]; break; }
    }
    const startX = Math.floor(-this.panX / this.zoom / stepMm) * stepMm;
    const endX = Math.ceil((W - this.panX) / this.zoom / stepMm) * stepMm;
    const startY = Math.floor(-this.panY / this.zoom / stepMm) * stepMm;
    const endY = Math.ceil((H - this.panY) / this.zoom / stepMm) * stepMm;

    ctx.lineWidth = 1;
    for (let x = startX; x <= endX; x += stepMm) {
      const sx = this.panX + x * this.zoom;
      const major = Math.abs(Math.round(x / (stepMm * 5)) * stepMm * 5 - x) < 1e-4;
      ctx.strokeStyle = major ? 'rgba(148, 163, 184, 0.13)' : 'rgba(148, 163, 184, 0.05)';
      ctx.beginPath();
      ctx.moveTo(sx, 0); ctx.lineTo(sx, H);
      ctx.stroke();
    }
    for (let y = startY; y <= endY; y += stepMm) {
      const sy = this.panY + y * this.zoom;
      const major = Math.abs(Math.round(y / (stepMm * 5)) * stepMm * 5 - y) < 1e-4;
      ctx.strokeStyle = major ? 'rgba(148, 163, 184, 0.13)' : 'rgba(148, 163, 184, 0.05)';
      ctx.beginPath();
      ctx.moveTo(0, sy); ctx.lineTo(W, sy);
      ctx.stroke();
    }

    // Origin axes at CAD (0,0) -> (0, doc.heightMm)
    if (this.doc) {
      const [ax, ay] = this.mmToScreen(0, this.doc.heightMm);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + 40, ay); ctx.stroke();
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.45)';
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax, ay - 40); ctx.stroke();
    }
  }

  _drawDimensionRulers(ctx, ox, oy, sw, sh, docW, docH) {
    ctx.save();
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
    ctx.fillStyle = '#34d399';
    ctx.lineWidth = 1;
    ctx.font = '600 11px "JetBrains Mono", monospace';

    // Bottom width dimension
    const by = oy + sh + 18;
    ctx.beginPath();
    ctx.moveTo(ox, by); ctx.lineTo(ox + sw, by);
    ctx.moveTo(ox, by - 5); ctx.lineTo(ox, by + 5);
    ctx.moveTo(ox + sw, by - 5); ctx.lineTo(ox + sw, by + 5);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${docW.toFixed(1)} mm`, ox + sw * 0.5, by + 4);

    // Left height dimension
    const lx = ox - 18;
    ctx.beginPath();
    ctx.moveTo(lx, oy); ctx.lineTo(lx, oy + sh);
    ctx.moveTo(lx - 5, oy); ctx.lineTo(lx + 5, oy);
    ctx.moveTo(lx - 5, oy + sh); ctx.lineTo(lx + 5, oy + sh);
    ctx.stroke();
    ctx.save();
    ctx.translate(lx - 6, oy + sh * 0.5);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${docH.toFixed(1)} mm`, 0, 0);
    ctx.restore();
    ctx.restore();
  }

  _drawVectors(ctx) {
    if (!this.doc) return;
    const layerMap = new Map();
    for (const l of this.doc.layers) {
      if (l.visible !== false) layerMap.set(l.id, l);
    }

    // 1. Subtle translucent even-odd fill per layer for closed solid silhouettes
    if (this.showFill) {
      for (const l of this.doc.layers) {
        if (l.visible === false) continue;
        const closedPaths = this.doc.paths.filter(p => p.layerId === l.id && p.closed && p.pts.length >= 3);
        if (closedPaths.length === 0) continue;
        ctx.save();
        ctx.beginPath();
        for (const p of closedPaths) {
          const [sx, sy] = this.mmToScreen(p.pts[0][0], p.pts[0][1]);
          ctx.moveTo(sx, sy);
          for (let i = 1; i < p.pts.length; i++) {
            const [px, py] = this.mmToScreen(p.pts[i][0], p.pts[i][1]);
            ctx.lineTo(px, py);
          }
          ctx.closePath();
        }
        ctx.fillStyle = hexAlpha(l.color, 0.14);
        ctx.fill('evenodd');
        ctx.restore();
      }
    }

    // 2. Rapid travel dashed paths (if enabled and not simulating)
    if (this.showRapid && !this.simActive && this.toolpathPlan && this.toolpathPlan.ordered) {
      ctx.save();
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.22)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      for (const item of this.toolpathPlan.ordered) {
        const [x0, y0] = this.mmToScreen(item.rapidFrom[0], item.rapidFrom[1]);
        const [x1, y1] = this.mmToScreen(item.pts[0][0], item.pts[0][1]);
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 3. Crisp vector CAD strokes
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const p of this.doc.paths) {
      const layer = layerMap.get(p.layerId);
      if (!layer || p.pts.length < 2) continue;
      const isSel = p.id === this.selectedPathId;

      ctx.beginPath();
      const [x0, y0] = this.mmToScreen(p.pts[0][0], p.pts[0][1]);
      ctx.moveTo(x0, y0);
      for (let i = 1; i < p.pts.length; i++) {
        const [px, py] = this.mmToScreen(p.pts[i][0], p.pts[i][1]);
        ctx.lineTo(px, py);
      }
      if (p.closed) ctx.closePath();

      ctx.strokeStyle = isSel ? '#fbbf24' : layer.color;
      ctx.lineWidth = isSel ? Math.max(3, this.strokeWidthPx + 1.5) : this.strokeWidthPx;
      ctx.stroke();
    }

    // 4. Kerf compensation preview outline (dashed amber) when kerfMm > 0
    if (this.kerfMm > 0 && this.kerfDoc) {
      ctx.save();
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.72)';
      ctx.lineWidth = 1.1;
      ctx.setLineDash([5, 3]);
      for (const p of this.kerfDoc.paths) {
        if (!layerMap.has(p.layerId) || !p.closed || p.pts.length < 3) continue;
        ctx.beginPath();
        const [x0, y0] = this.mmToScreen(p.pts[0][0], p.pts[0][1]);
        ctx.moveTo(x0, y0);
        for (let i = 1; i < p.pts.length; i++) {
          const [px, py] = this.mmToScreen(p.pts[i][0], p.pts[i][1]);
          ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  _drawDiagnostics(ctx) {
    const d = this.diagnostics;
    ctx.save();

    // Duplicate overlapping segments (thick glowing amber)
    if (d.duplicates.length > 0) {
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.9)';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      for (let i = 0; i < Math.min(400, d.duplicates.length); i++) {
        const dup = d.duplicates[i];
        const [x1, y1] = this.mmToScreen(dup.a[0], dup.a[1]);
        const [x2, y2] = this.mmToScreen(dup.b[0], dup.b[1]);
        ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      }
      ctx.stroke();
    }

    // Open endpoints (red target rings)
    if (d.openEndpoints.length > 0) {
      ctx.strokeStyle = '#ef4444';
      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.lineWidth = 1.6;
      for (let i = 0; i < Math.min(300, d.openEndpoints.length); i++) {
        const [x, y] = this.mmToScreen(d.openEndpoints[i][0], d.openEndpoints[i][1]);
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Micro-speckles (magenta diamonds)
    if (d.speckles.length > 0) {
      ctx.strokeStyle = '#e879f9';
      ctx.lineWidth = 1.6;
      for (let i = 0; i < Math.min(200, d.speckles.length); i++) {
        const [x, y] = this.mmToScreen(d.speckles[i].pt[0], d.speckles[i].pt[1]);
        ctx.beginPath();
        ctx.moveTo(x, y - 5); ctx.lineTo(x + 5, y); ctx.lineTo(x, y + 5); ctx.lineTo(x - 5, y); ctx.closePath();
        ctx.stroke();
      }
    }

    // Unanchored stencil islands warning (cyan ring)
    if (d.stencilIslands.length > 0) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.8;
      for (let i = 0; i < Math.min(80, d.stencilIslands.length); i++) {
        const [x, y] = this.mmToScreen(d.stencilIslands[i].pt[0], d.stencilIslands[i].pt[1]);
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  _drawSimulation(ctx) {
    const targetD = this.simProgress * this.simTotalDist;
    ctx.save();
    ctx.lineCap = 'round';
    let headPos = null;
    let headRapid = false;

    for (let i = 0; i < this.simSegments.length; i++) {
      const seg = this.simSegments[i];
      const effLen = seg.rapid ? seg.len * 0.35 : seg.len;
      if (seg.startD > targetD) break;

      const t = Math.min(1, (targetD - seg.startD) / Math.max(1e-6, effLen));
      const ex = seg.a[0] + (seg.b[0] - seg.a[0]) * t;
      const ey = seg.a[1] + (seg.b[1] - seg.a[1]) * t;
      const [sx0, sy0] = this.mmToScreen(seg.a[0], seg.a[1]);
      const [sx1, sy1] = this.mmToScreen(ex, ey);

      ctx.beginPath();
      ctx.moveTo(sx0, sy0);
      ctx.lineTo(sx1, sy1);
      if (seg.rapid) {
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.55)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);
      } else {
        ctx.strokeStyle = '#ff6b00';
        ctx.lineWidth = Math.max(2.4, this.strokeWidthPx + 1.1);
        ctx.setLineDash([]);
      }
      ctx.stroke();
      headPos = [sx1, sy1];
      headRapid = seg.rapid;
    }

    // Glowing Laser / Spindle Head
    if (headPos) {
      ctx.setLineDash([]);
      const grad = ctx.createRadialGradient(headPos[0], headPos[1], 1, headPos[0], headPos[1], headRapid ? 10 : 18);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, headRapid ? '#06b6d4' : '#ff6b00');
      grad.addColorStop(1, 'rgba(255,107,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(headPos[0], headPos[1], headRapid ? 10 : 18, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawCaliper(ctx, pts, color, isCalibrate) {
    const a = pts[0];
    const b = pts.length >= 2 ? pts[1] : (this.hoverMm || a);
    const [x1, y1] = this.mmToScreen(a[0], a[1]);
    const [x2, y2] = this.mmToScreen(b[0], b[1]);
    const distMm = Math.hypot(b[0] - a[0], b[1] - a[1]);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);

    [ [x1, y1], [x2, y2] ].forEach(([px, py]) => {
      ctx.fillStyle = '#090e17';
      ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });

    const mx = (x1 + x2) * 0.5, my = (y1 + y2) * 0.5 - 14;
    const label = isCalibrate ? `REF: ${distMm.toFixed(2)} mm` : `${distMm.toFixed(2)} mm`;
    this._drawBadge(ctx, mx - 46, my - 11, label, '#0f172a', color);
    ctx.restore();
  }

  // ============================================================================
  // THREE.JS r165 — 2D -> 3D EXTRUDE VIEWPORT, WATERTIGHT STL & WEBAR
  // ============================================================================
  _ensureThreeInit() {
    if (this.threeReady) return;
    const rect = this.container3d.getBoundingClientRect();
    const w = Math.max(100, rect.width || 600);
    const h = Math.max(100, rect.height || 400);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090e17);

    const camera = new THREE.PerspectiveCamera(40, w / h, 0.5, 5000);
    camera.position.set(110, 95, 130);

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(w, h, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container3d.innerHTML = '';
    this.container3d.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.maxPolarAngle = Math.PI * 0.49;

    // 3-Point Industrial CAD Lighting
    const hemi = new THREE.HemisphereLight(0xe2f1ff, 0x1e293b, 0.9);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(120, 180, 110);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x10b981, 0.9);
    rim.position.set(-140, 80, -100);
    scene.add(rim);

    const fill = new THREE.DirectionalLight(0x38bdf8, 0.55);
    fill.position.set(-80, 50, 140);
    scene.add(fill);

    const grid = new THREE.GridHelper(320, 32, 0x10b981, 0x1e293b);
    grid.material.opacity = 0.35;
    grid.material.transparent = true;
    scene.add(grid);

    const group = new THREE.Group();
    scene.add(group);

    this.threeScene = scene;
    this.threeCamera = camera;
    this.threeRenderer = renderer;
    this.threeControls = controls;
    this.extrudeGroup = group;
    this.gridHelper3d = grid;
    this.threeReady = true;
  }

  _disposeGroup(group) {
    while (group.children.length > 0) {
      const ch = group.children[0];
      group.remove(ch);
      if (ch.geometry) ch.geometry.dispose();
      if (ch.material) {
        if (Array.isArray(ch.material)) ch.material.forEach(m => m.dispose());
        else ch.material.dispose();
      }
    }
  }

  _rebuild3DExtrusion() {
    this._needs3dRebuild = false;
    if (!this.threeReady || !this.doc) return;
    this._disposeGroup(this.extrudeGroup);

    const visLayers = new Map(this.doc.layers.filter(l => l.visible !== false).map(l => [l.id, l]));
    const W = this.doc.widthMm;
    const H = this.doc.heightMm;
    const cx = W * 0.5, cy = H * 0.5;
    const thick = Math.max(0.5, Math.min(60, Number(this.extrudeOpts.thicknessMm) || 5));
    const bevel = Math.max(0, Math.min(thick * 0.35, Number(this.extrudeOpts.bevelMm) || 0));
    const matDef = MATERIALS_3D[this.extrudeOpts.material] || MATERIALS_3D.aluminum;

    const mainMat = new THREE.MeshPhysicalMaterial({
      color: matDef.color,
      metalness: matDef.metalness,
      roughness: matDef.roughness,
      clearcoat: matDef.clearcoat || 0.1
    });

    // Extrude CUT closed shapes as physical 3D plates (with real through-holes);
    // render SCORE/ENGRAVE markings as crisp etched laser strokes on the top surface!
    const allVisClosed = this.doc.paths.filter(p => visLayers.has(p.layerId) && p.closed && p.pts.length >= 3);
    const cutClosed = allVisClosed.filter(p => (visLayers.get(p.layerId).op || 'CUT') === 'CUT');
    const solidClosed = cutClosed.length > 0 ? cutClosed : allVisClosed;
    const solidSet = new Set(solidClosed.map(p => p.id));

    const holesByParent = new Map();
    const outers = [];
    for (const p of solidClosed) {
      if (p.isHole && p.parentId) {
        if (!holesByParent.has(p.parentId)) holesByParent.set(p.parentId, []);
        holesByParent.get(p.parentId).push(p);
      } else if (!p.isHole) {
        outers.push(p);
      }
    }

    const shapes = [];
    for (const outer of outers) {
      const pts2 = outer.pts.map(pt => new THREE.Vector2(pt[0] - cx, (H - pt[1]) - cy));
      if (pts2.length < 3) continue;
      // Ensure outer is CCW for Three.js Shape
      if (THREE.ShapeUtils.isClockWise(pts2)) pts2.reverse();
      const shape = new THREE.Shape(pts2);

      const holes = holesByParent.get(outer.id) || [];
      for (const h of holes) {
        const hPts = h.pts.map(pt => new THREE.Vector2(pt[0] - cx, (H - pt[1]) - cy));
        if (hPts.length < 3) continue;
        // Holes must be CW in Three.js
        if (!THREE.ShapeUtils.isClockWise(hPts)) hPts.reverse();
        shape.holes.push(new THREE.Path(hPts));
      }
      shapes.push(shape);
    }

    if (shapes.length > 0) {
      const extrudeSettings = {
        depth: Math.max(0.2, thick - bevel * 2),
        bevelEnabled: bevel > 0.02,
        bevelSegments: 2,
        steps: 1,
        bevelSize: bevel,
        bevelThickness: bevel,
        curveSegments: 16
      };
      try {
        const geom = new THREE.ExtrudeGeometry(shapes, extrudeSettings);
        // Rotate flat onto XZ build plate (extrude Z -> +Y up, sitting flat on Y=0!)
        geom.rotateX(-Math.PI / 2);
        geom.computeBoundingBox();
        if (geom.boundingBox) {
          geom.translate(0, -geom.boundingBox.min.y, 0);
        }
        geom.computeVertexNormals();
        const mesh = new THREE.Mesh(geom, mainMat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.extrudeGroup.add(mesh);
      } catch (err) {
        console.warn('3D Extrude geometry fallback:', err);
      }
    }

    // Render open paths AND closed ENGRAVE/SCORE markings as crisp etched 3D surface strokes
    const surfaceMarkings = this.doc.paths.filter(p => visLayers.has(p.layerId) && p.pts.length >= 2 && (!p.closed || !solidSet.has(p.id)));
    if (surfaceMarkings.length > 0) {
      const lineY = shapes.length > 0 ? thick + 0.18 : 0.8;
      for (const p of surfaceMarkings) {
        const layer = visLayers.get(p.layerId);
        const verts = p.pts.map(pt => new THREE.Vector3(pt[0] - cx, lineY, -((H - pt[1]) - cy)));
        if (p.closed && verts.length > 2) verts.push(verts[0].clone());
        const lGeom = new THREE.BufferGeometry().setFromPoints(verts);
        const lMat = new THREE.LineBasicMaterial({ color: layer ? layer.color : '#10b981' });
        this.extrudeGroup.add(new THREE.Line(lGeom, lMat));
      }
    }

    // Auto-frame camera nicely around part size
    const diag = Math.max(40, Math.hypot(W, H, thick));
    this.gridHelper3d.scale.setScalar(Math.max(0.6, diag / 180));
    this.threeCamera.position.set(diag * 0.78, diag * 0.68, diag * 0.92);
    this.threeControls.target.set(0, thick * 0.4, 0);
    this.threeControls.update();
  }

  /**
   * Builds binary watertight STL directly from the 3D extruded mesh (exact 1:1 mm, Z-up for 3D slicers!).
   */
  exportExtrudedSTL() {
    this._ensureThreeInit();
    if (this._needs3dRebuild) this._rebuild3DExtrusion();

    const meshes = [];
    let totalTris = 0;
    this.extrudeGroup.traverse(obj => {
      if (!obj.isMesh || !obj.geometry) return;
      const g = obj.geometry;
      const pos = g.getAttribute('position');
      if (!pos) return;
      const idx = g.index;
      const triCount = idx ? Math.floor(idx.count / 3) : Math.floor(pos.count / 3);
      if (triCount > 0) {
        meshes.push({ obj, pos, idx, triCount });
        totalTris += triCount;
      }
    });

    if (totalTris === 0) return null;

    const bufLen = 84 + totalTris * 50;
    const buf = new ArrayBuffer(bufLen);
    const dv = new DataView(buf);
    const header = 'Studios-Pro DFX Studio Pro 1:1 mm Watertight STL';
    for (let i = 0; i < Math.min(80, header.length); i++) dv.setUint8(i, header.charCodeAt(i));
    dv.setUint32(80, totalTris, true);

    let offset = 84;
    const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();
    const ab = new THREE.Vector3(), ac = new THREE.Vector3(), n = new THREE.Vector3();

    // Map Three.js Y-up (X, Y, Z) -> Slicer Z-up (X, -Z, Y) so part lies flat at Z=0!
    function toSlicer(v, out) {
      out.set(v.x, -v.z, v.y);
    }

    const sa = new THREE.Vector3(), sb = new THREE.Vector3(), sc = new THREE.Vector3();
    for (const m of meshes) {
      m.obj.updateMatrixWorld(true);
      const mat = m.obj.matrixWorld;
      for (let t = 0; t < m.triCount; t++) {
        const i0 = m.idx ? m.idx.getX(t * 3) : t * 3;
        const i1 = m.idx ? m.idx.getX(t * 3 + 1) : t * 3 + 1;
        const i2 = m.idx ? m.idx.getX(t * 3 + 2) : t * 3 + 2;
        va.fromBufferAttribute(m.pos, i0).applyMatrix4(mat);
        vb.fromBufferAttribute(m.pos, i1).applyMatrix4(mat);
        vc.fromBufferAttribute(m.pos, i2).applyMatrix4(mat);
        toSlicer(va, sa); toSlicer(vb, sb); toSlicer(vc, sc);
        ab.subVectors(sb, sa);
        ac.subVectors(sc, sa);
        n.crossVectors(ab, ac);
        const nl = n.length();
        if (nl > 1e-12) n.divideScalar(nl); else n.set(0, 0, 1);

        dv.setFloat32(offset, n.x, true); offset += 4;
        dv.setFloat32(offset, n.y, true); offset += 4;
        dv.setFloat32(offset, n.z, true); offset += 4;
        dv.setFloat32(offset, sa.x, true); offset += 4;
        dv.setFloat32(offset, sa.y, true); offset += 4;
        dv.setFloat32(offset, sa.z, true); offset += 4;
        dv.setFloat32(offset, sb.x, true); offset += 4;
        dv.setFloat32(offset, sb.y, true); offset += 4;
        dv.setFloat32(offset, sb.z, true); offset += 4;
        dv.setFloat32(offset, sc.x, true); offset += 4;
        dv.setFloat32(offset, sc.y, true); offset += 4;
        dv.setFloat32(offset, sc.z, true); offset += 4;
        dv.setUint16(offset, 0, true); offset += 2;
      }
    }
    return new Uint8Array(buf);
  }

  /**
   * Launch untouched AR Viewer bridge at exact 1:1 physical meters (mm * 0.001)!
   */
  async launchAR(filename) {
    if (!window.StudiosProAR || typeof window.StudiosProAR.exportSceneAndOpenAR !== 'function') {
      throw new Error('AR Bridge not available');
    }
    this._ensureThreeInit();
    if (this._needs3dRebuild) this._rebuild3DExtrusion();
    const arClone = this.extrudeGroup.clone(true);
    arClone.scale.setScalar(0.001); // exact mm -> meters 1:1 real-world AR scale
    arClone.updateMatrixWorld(true);
    await window.StudiosProAR.exportSceneAndOpenAR(arClone, filename || 'dfx_studio_part.glb', { placement: 'floor' });
  }

  capturePNGDataURL() {
    if (this.viewMode === '3d' && this.threeReady && this.threeRenderer) {
      this.threeRenderer.render(this.threeScene, this.threeCamera);
      return this.threeRenderer.domElement.toDataURL('image/png');
    }
    this._render2D();
    return this.canvas2d.toDataURL('image/png');
  }
}

function pointToSegDist(px, py, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay;
  const len2 = abx * abx + aby * aby;
  if (len2 < 1e-9) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / len2));
  return Math.hypot(px - (ax + t * abx), py - (ay + t * aby));
}

function hexAlpha(hex, alpha) {
  const h = String(hex || '#10b981').replace('#', '');
  const f = h.length === 3 ? h.split('').map(c => c + c).join('') : h.padEnd(6, '0');
  const n = parseInt(f.slice(0, 6), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

window.DfxViewport = { DfxViewportController, MATERIALS_3D };
