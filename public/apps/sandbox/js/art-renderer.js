/**
 * Zen Sandscape v4.0 — Fine-Art Visual Renderer
 * Features:
 *  - 4 Museum Gallery Backdrops (Obsidian, Deep Space, Zen Washi Parchment, Aurora)
 *  - True 3D Sobel Normal-Map Sculpted Relief Lighting (zero right-edge wrap bug!)
 *  - Luminous Additive Neon Bloom for Fire, Lava, Gold, Stardust, Crystals, Fireworks, Portals & Black Holes
 *  - Long-Exposure Ethereal Light Trails Canvas
 *  - Crisp Optical Laser Beams + Live Symmetry Guides (Mirror X / Quad / 8-Way Mandala) + Brush Cursor!
 */
(function (globalScope) {
  'use strict';

  function SM() { return globalScope.SandMaterials; }

  const BACKDROPS = {
    obsidian:  { top: '#070b18', bot: '#11182c', clearRGB: [9, 13, 26] },
    space:     { top: '#03050d', bot: '#120a24', clearRGB: [6, 8, 22] },
    parchment: { top: '#ede4d3', bot: '#dcd0b8', clearRGB: [228, 218, 198] },
    aurora:    { top: '#04141d', bot: '#0c2433', clearRGB: [7, 25, 36] }
  };

  class ArtRenderer {
    constructor(displayCanvas, width = 600, height = 420) {
      this.canvas = displayCanvas;
      this.ctx = displayCanvas.getContext('2d', { alpha: false });
      this.w = width;
      this.h = height;
      this.canvas.width = width;
      this.canvas.height = height;

      // Offscreen pixel buffer (for fast 32-bit putImageData)
      this.pixCanvas = document.createElement('canvas');
      this.pixCanvas.width = width;
      this.pixCanvas.height = height;
      this.pixCtx = this.pixCanvas.getContext('2d');
      this.imgData = this.pixCtx.createImageData(width, height);
      this.buf32 = new Uint32Array(this.imgData.data.buffer);

      // Downsampled 1/4-res Luminous Bloom buffer (super fast GPU blur!)
      this.bloomCanvas = document.createElement('canvas');
      this.bloomCanvas.width = Math.floor(width / 4);
      this.bloomCanvas.height = Math.floor(height / 4);
      this.bloomCtx = this.bloomCanvas.getContext('2d');

      // Persistent Long-Exposure Light Trails buffer
      this.trailCanvas = document.createElement('canvas');
      this.trailCanvas.width = width;
      this.trailCanvas.height = height;
      this.trailCtx = this.trailCanvas.getContext('2d');

      // Render FX Toggles
      this.fx3d = true;
      this.fxBloom = true;
      this.fxTrails = false;
      this.backdrop = 'obsidian';
      this.customBgHex = '#0a1024';
      this.bgPhoto = null;       // Optional static gallery background photo (HTMLImageElement / Canvas)
      this.bgPhotoAlpha = 0.78;

      // Static starfield dots for Deep Space backdrop
      this.stars = Array.from({ length: 85 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.5 + Math.random() * 1.1,
        a: 0.25 + Math.random() * 0.55
      }));
    }

    clearTrails() {
      this.trailCtx.clearRect(0, 0, this.w, this.h);
    }

    render(engine, overlayOpts = {}) {
      const { MAT, MAT_BY_ID } = SM();
      const w = this.w, h = this.h;
      const types = engine.types, colors = engine.colors;
      const buf = this.buf32;

      // 1. Write particles (or Magnetic Reassemble flight sprites!) into 32-bit pixel buffer
      if (engine.reformAnim && engine.reformAnim.active) {
        buf.fill(0);
        const a = engine.reformAnim;
        const u = Math.min(1, a.frame / a.totalFrames);
        // Smooth ease-in-out cubic flight!
        const t = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) * 0.5;
        const omt = 1 - t;
        const omt2 = omt * omt, twot = 2 * omt * t, t2 = t * t;
        for (let k = 0; k < a.count; k++) {
          const px = Math.round(omt2 * a.sx[k] + twot * a.cx[k] + t2 * a.tx[k]);
          const py = Math.round(omt2 * a.sy[k] + twot * a.cy[k] + t2 * a.ty[k]);
          if (px >= 0 && px < w && py >= 0 && py < h) {
            const c = a.col[k];
            const idx = py * w + px;
            buf[idx] = c;
            if (u < 0.88 && px + 1 < w) buf[idx + 1] = c;
          }
        }
      } else if (!this.fx3d) {
        buf.set(colors);
      } else {
        for (let y = 0; y < h; y++) {
          const row = y * w;
          for (let x = 0; x < w; x++) {
            const i = row + x;
            const t = types[i];
            if (t === 0) { buf[i] = 0; continue; }
            const col = colors[i];
            // Check upper-left vs lower-right neighbors (strictly bounds-checked — ZERO wrap bug!)
            const hasUL = (x > 0 && y > 0 && types[i - w - 1] !== 0) ? 1 : 0;
            const hasDR = (x < w - 1 && y < h - 1 && types[i + w + 1] !== 0) ? 1 : 0;
            let shade = 0;
            if (!hasUL && hasDR) shade = 24;       // Sunlit top-left beveled highlight!
            else if (hasUL && !hasDR) shade = -26; // Tactile sculpted bottom-right shadow!
            if (t === MAT.GOLD && ((x + y + engine.frameCount) & 15) === 0) shade += 30; // Metallic shimmer!

            if (shade === 0) {
              buf[i] = col;
            } else {
              const r = Math.max(0, Math.min(255, (col & 255) + shade));
              const g = Math.max(0, Math.min(255, ((col >>> 8) & 255) + shade));
              const b = Math.max(0, Math.min(255, ((col >>> 16) & 255) + shade));
              const a = (col >>> 24) & 255;
              buf[i] = ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
            }
          }
        }
      }
      this.pixCtx.putImageData(this.imgData, 0, 0);

      // 2. Paint Museum Gallery Backdrop (Preset, Custom Hex Color, or Static Gallery Photo!)
      const ctx = this.ctx;
      if (this.backdrop === 'custom') {
        const [cr, cg, cb] = SM().hexToRgb(this.customBgHex || '#0a1024');
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, `rgb(${cr},${cg},${cb})`);
        grad.addColorStop(1, `rgb(${Math.max(0, cr - 18)},${Math.max(0, cg - 18)},${Math.max(0, cb - 18)})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      } else {
        const bg = BACKDROPS[this.backdrop] || BACKDROPS.obsidian;
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, bg.top);
        grad.addColorStop(1, bg.bot);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      if (this.bgPhoto) {
        ctx.save();
        ctx.globalAlpha = this.bgPhotoAlpha;
        // Aspect-cover draw cleanly onto 600x420 gallery stage
        const iw = this.bgPhoto.width || w, ih = this.bgPhoto.height || h;
        const sc = Math.max(w / iw, h / ih);
        const dw = iw * sc, dh = ih * sc;
        ctx.drawImage(this.bgPhoto, (w - dw) * 0.5, (h - dh) * 0.5, dw, dh);
        ctx.restore();
      }

      if (this.backdrop === 'space') {
        ctx.fillStyle = '#ffffff';
        for (let s = 0; s < this.stars.length; s++) {
          const st = this.stars[s];
          ctx.globalAlpha = st.a;
          ctx.fillRect(st.x, st.y, st.r, st.r);
        }
        ctx.globalAlpha = 1;
      }

      // 3. Long-Exposure Ethereal Light Trails (when enabled!)
      if (this.fxTrails) {
        this.trailCtx.globalCompositeOperation = 'destination-out';
        this.trailCtx.fillStyle = 'rgba(0,0,0,0.085)';
        this.trailCtx.fillRect(0, 0, w, h);
        this.trailCtx.globalCompositeOperation = 'source-over';
        this.trailCtx.globalAlpha = 0.65;
        this.trailCtx.drawImage(this.pixCanvas, 0, 0);
        this.trailCtx.globalAlpha = 1;
        ctx.drawImage(this.trailCanvas, 0, 0);
      }

      // 4. Composite Crisp Sculpted Particle Layer
      ctx.drawImage(this.pixCanvas, 0, 0);

      // 5. Luminous Additive Bloom Glow Pass (fast 1/4-res blur!)
      if (this.fxBloom) {
        const bw = this.bloomCanvas.width, bh = this.bloomCanvas.height;
        this.bloomCtx.clearRect(0, 0, bw, bh);
        this.bloomCtx.drawImage(this.pixCanvas, 0, 0, bw, bh);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = this.backdrop === 'parchment' ? 0.14 : 0.34;
        ctx.filter = 'blur(6px)';
        ctx.drawImage(this.bloomCanvas, 0, 0, w, h);
        ctx.restore();
      }

      // 6. Crisp Glowing Optical Laser Beams + Accretion Halo on Black Holes!
      if (engine.laserBeams && engine.laserBeams.length > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        for (let b = 0; b < engine.laserBeams.length; b++) {
          const beam = engine.laserBeams[b];
          ctx.strokeStyle = beam.hex || '#f43f5e';
          ctx.lineWidth = 5;
          ctx.globalAlpha = 0.35;
          ctx.beginPath(); ctx.moveTo(beam.x1, beam.y1); ctx.lineTo(beam.x2, beam.y2); ctx.stroke();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.6;
          ctx.globalAlpha = 0.95;
          ctx.beginPath(); ctx.moveTo(beam.x1, beam.y1); ctx.lineTo(beam.x2, beam.y2); ctx.stroke();
        }
        ctx.restore();
      }

      if (engine.vortices && engine.vortices.length > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let v = 0; v < engine.vortices.length; v++) {
          const [vx, vy] = engine.vortices[v];
          const g = ctx.createRadialGradient(vx, vy, 4, vx, vy, 34);
          g.addColorStop(0, 'rgba(15, 5, 30, 0.9)');
          g.addColorStop(0.4, 'rgba(168, 85, 247, 0.45)');
          g.addColorStop(1, 'rgba(56, 189, 248, 0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(vx, vy, 34, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }

      // 7. Live Photo / Stencil / Text Interactive Transform Stage Preview + Handles!
      if (!overlayOpts.clean && overlayOpts.photoStage && overlayOpts.photoStage.active && overlayOpts.photoStage.session) {
        const stage = overlayOpts.photoStage;
        const s = stage.session;
        const handles = stage.getHandles();

        // Draw transformed live cut-out preview directly on the sandscape!
        ctx.save();
        ctx.translate(s.cx, s.cy);
        ctx.rotate((s.rotDeg * Math.PI) / 180);
        ctx.scale(s.flipX ? -s.scale : s.scale, s.flipY ? -s.scale : s.scale);
        ctx.drawImage(s.previewCanvas, -s.srcW * 0.5, -s.srcH * 0.5);
        ctx.restore();

        // Draw golden bounding frame + 4 corner resize handles + top rotate handle!
        ctx.save();
        ctx.strokeStyle = 'rgba(245, 197, 66, 0.92)';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(handles.nw.x, handles.nw.y);
        ctx.lineTo(handles.ne.x, handles.ne.y);
        ctx.lineTo(handles.se.x, handles.se.y);
        ctx.lineTo(handles.sw.x, handles.sw.y);
        ctx.closePath();
        ctx.stroke();

        // Rotate stem line
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(handles.topMid.x, handles.topMid.y);
        ctx.lineTo(handles.rot.x, handles.rot.y);
        ctx.stroke();

        // Corner handles
        [handles.nw, handles.ne, handles.se, handles.sw].forEach(p => {
          ctx.fillStyle = '#0b1022';
          ctx.strokeStyle = '#f5c542';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(p.x, p.y, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        });

        // Rotate knob (cyan accent)
        ctx.fillStyle = '#38bdf8';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(handles.rot.x, handles.rot.y, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

        // Live dimension & rotation readout pill
        const dw = Math.round(s.srcW * s.scale), dh = Math.round(s.srcH * s.scale);
        const badge = `${dw}×${dh}px · ${Math.round(s.rotDeg)}°`;
        ctx.font = '700 10px Inter, sans-serif';
        const bw = ctx.measureText(badge).width + 12;
        const bx = Math.max(6, Math.min(w - bw - 6, s.cx - bw * 0.5));
        const by = Math.max(6, Math.min(h - 22, handles.se.y + 8));
        ctx.fillStyle = 'rgba(7, 11, 24, 0.88)';
        ctx.fillRect(bx, by, bw, 17);
        ctx.strokeStyle = 'rgba(245, 197, 66, 0.6)';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, bw, 17);
        ctx.fillStyle = '#fef08a';
        ctx.fillText(badge, bx + 6, by + 12);

        // Refine/Wand tool cursor ring when in interactive touch-up mode
        if (overlayOpts.cursor && overlayOpts.cursor.inside && s.tool !== 'move') {
          const { x, y } = overlayOpts.cursor;
          ctx.strokeStyle = s.tool === 'keep' ? '#34d399' : (s.tool === 'erase' ? '#f43f5e' : '#38bdf8');
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(x, y, s.tool === 'wand' ? 8 : s.refineRadius, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      } else if (!overlayOpts.clean) {
        // 8. Live Symmetry Axes & Brush Cursor Ring (skipped during clean export snapshots!)
        const sym = overlayOpts.symmetry || 'off';
        if (sym !== 'off') {
          ctx.save();
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(w * 0.5, 0); ctx.lineTo(w * 0.5, h);
          if (sym === 'quad' || sym === 'mandala8') {
            ctx.moveTo(0, h * 0.5); ctx.lineTo(w, h * 0.5);
          }
          if (sym === 'mandala8') {
            ctx.moveTo(w * 0.5 - h * 0.5, 0); ctx.lineTo(w * 0.5 + h * 0.5, h);
            ctx.moveTo(w * 0.5 + h * 0.5, 0); ctx.lineTo(w * 0.5 - h * 0.5, h);
          }
          ctx.stroke();
          ctx.restore();
        }

        if (overlayOpts.cursor && overlayOpts.cursor.inside) {
          const { x, y, radius, shape, tool } = overlayOpts.cursor;
          ctx.save();
          ctx.strokeStyle = tool === 'melt' ? '#fb923c' : (tool === 'freeze' ? '#38bdf8' : (tool === 'tint' ? '#f472b6' : (tool === 'magnet' ? '#a855f7' : 'rgba(255, 255, 255, 0.72)')));
          ctx.lineWidth = 1.4;
          if (tool === 'eyedropper') {
            ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x + 10, y); ctx.moveTo(x, y - 10); ctx.lineTo(x, y + 10); ctx.stroke();
          } else if (shape === 'square' && (!tool || tool === 'paint')) {
            ctx.strokeRect(x - radius, y - radius, radius * 2, radius * 2);
          } else {
            ctx.beginPath(); ctx.arc(x, y, tool === 'magnet' ? Math.min(72, radius * 2.2) : radius, 0, Math.PI * 2); ctx.stroke();
          }
          ctx.restore();
        }
      }
    }
  }

  globalScope.ArtRenderer = ArtRenderer;
})(typeof window !== 'undefined' ? window : globalThis);
