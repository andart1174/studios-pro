/**
 * Vector CNC Studio Pro — Interactive Pro Suite (cnc-pro-suite.js)
 * 1. Interactive 3D CNC / Laser Material Removal Simulator + Video Time-Lapse (.WEBM)
 * 2. CNC Vector Text Generator (Single-Line Hershey + Bold Stencil with Auto-Bridges)
 * 3. Laser Material Test Card Generator (Power x Speed Calibration Matrix -> GRBL G-Code & LightBurn SVG)
 * 4. Smart Sheet Auto-Nesting & Stock Material Optimizer (0°/90° Packing + Waste Metrics)
 * 5. Pre-Flight CNC Safety & Cutability Inspector + 1-Click Auto-Fixers
 * 6. Syntax-Highlighted Live G-Code Inspector & Bounds Verifier
 * 7. Workshop Job Cost, Machine Time & Etsy Profit Calculator + Printable Job Setup Sheet
 */
(function (global) {
  'use strict';

  const isFr = () => (typeof global.currentLang !== 'undefined' && global.currentLang === 'fr');
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const $ = (id) => document.getElementById(id);

  // ═══════════════════════════════════════════════════════
  // 1. INTERACTIVE 3D CNC / LASER SIMULATOR & VIDEO TIME-LAPSE (.WEBM)
  // ═══════════════════════════════════════════════════════
  const SIM3D = {
    renderer: null, scene: null, camera: null, controls: null,
    rafId: null, playing: false, recording: false,
    progress: 0, speed: 3, showRapids: true, material: 'birch',
    segments: [], totalLen: 0, physW: 100, physH: 100, stockH: 8,
    carveCanvas: null, carveCtx: null, carveTex: null, baseTexCanvas: null,
    headGroup: null, beamMesh: null, sparkMesh: null, bitMesh: null,
    rapidLine: null, cutLine: null, cutPosArr: null, cutGeo: null,
    lastDrawnSegIdx: 0, isRouter: false
  };

  function generateStockTextureCanvas(matId, w = 512, h = 512) {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');

    if (matId === 'walnut' || matId === 'birch') {
      const base = matId === 'walnut' ? [92, 58, 34] : [224, 194, 152];
      const dark = matId === 'walnut' ? [54, 32, 18] : [188, 152, 108];
      ctx.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
      ctx.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 2) {
        const wave = Math.sin(y * 0.045) * 0.5 + Math.sin(y * 0.13) * 0.3 + Math.cos(y * 0.018) * 0.2;
        const mix = (wave + 1) * 0.5;
        const r = Math.round(base[0] * (1 - mix * 0.28) + dark[0] * (mix * 0.28));
        const g = Math.round(base[1] * (1 - mix * 0.28) + dark[1] * (mix * 0.28));
        const b = Math.round(base[2] * (1 - mix * 0.28) + dark[2] * (mix * 0.28));
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(0, y, w, 2);
      }
      ctx.strokeStyle = matId === 'walnut' ? 'rgba(30,15,5,0.22)' : 'rgba(140,100,60,0.16)';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 38; i++) {
        const y0 = (i / 38) * h;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 24) {
          const y = y0 + Math.sin(x * 0.015 + i) * 5;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    } else if (matId === 'aluminum') {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#cbd5e1'); grad.addColorStop(0.5, '#e2e8f0'); grad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      for (let y = 0; y < h; y += 2) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    } else if (matId === 'acrylic') {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#0c4a6e'); grad.addColorStop(0.5, '#0369a1'); grad.addColorStop(1, '#0284c7');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    } else if (matId === 'leather') {
      ctx.fillStyle = '#6b3e26'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 2400; i++) {
        ctx.fillStyle = i % 2 === 0 ? 'rgba(40,18,8,0.18)' : 'rgba(145,95,60,0.14)';
        ctx.fillRect((i * 73) % w, (i * 137) % h, 3, 2);
      }
    } else { // slate
      ctx.fillStyle = '#1e293b'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 1600; i++) {
        ctx.fillStyle = i % 3 === 0 ? 'rgba(148,163,184,0.09)' : 'rgba(2,6,23,0.18)';
        ctx.fillRect((i * 89) % w, (i * 53) % h, 5, 3);
      }
    }
    return cv;
  }

  function parseGcodeToSimSegments(gcodeText, physW, physH, isRouter) {
    const lines = String(gcodeText || '').split(/\r?\n/);
    const segs = [];
    let cx = 0, cy = 0, cz = isRouter ? 5 : 0;
    let laserOn = false, passNum = 1, cumDist = 0;
    const isInch = /^\s*G20\b/m.test(gcodeText);
    const uScale = isInch ? 25.4 : 1;

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      if (/Pass\s+(\d+)/i.test(line)) {
        const m = line.match(/Pass\s+(\d+)/i);
        if (m) passNum = parseInt(m[1], 10) || passNum;
      }
      if (line.startsWith(';') || line.startsWith('(')) continue;
      const code = line.replace(/;.*$/, '').replace(/\([^)]*\)/g, '').trim();
      if (!code) continue;

      if (/\bM[34]\b/i.test(code)) laserOn = true;
      if (/\bM5\b/i.test(code)) laserOn = false;

      const isG0 = /\bG0?0\b/i.test(code);
      const isG1 = /\bG0?1\b/i.test(code);
      if (!isG0 && !isG1) continue;

      const mx = code.match(/X([-+]?\d*\.?\d+)/i);
      const my = code.match(/Y([-+]?\d*\.?\d+)/i);
      const mz = code.match(/Z([-+]?\d*\.?\d+)/i);
      const nx = mx ? parseFloat(mx[1]) * uScale : cx;
      const ny = my ? parseFloat(my[1]) * uScale : cy;
      const nz = mz ? parseFloat(mz[1]) * uScale : cz;

      const dist = Math.hypot(nx - cx, ny - cy, nz - cz);
      if (dist > 1e-4) {
        const cutting = isRouter ? (isG1 && (cz < -0.01 || nz < -0.01)) : (isG1 && laserOn);
        segs.push({ x1: cx, y1: cy, z1: cz, x2: nx, y2: ny, z2: nz, cutting, rapid: isG0, pass: passNum, dStart: cumDist, dEnd: cumDist + dist });
        cumDist += dist;
      }
      cx = nx; cy = ny; cz = nz;
    }
    return { segments: segs, totalLen: Math.max(1, cumDist) };
  }

  function disposeSim3D() {
    if (SIM3D.rafId) { cancelAnimationFrame(SIM3D.rafId); SIM3D.rafId = null; }
    SIM3D.playing = false;
    SIM3D.recording = false;
    if (SIM3D.controls && SIM3D.controls.dispose) SIM3D.controls.dispose();
    if (SIM3D.carveTex) { SIM3D.carveTex.dispose(); SIM3D.carveTex = null; }
    if (SIM3D.renderer) { SIM3D.renderer.dispose(); SIM3D.renderer = null; }
    SIM3D.scene = null; SIM3D.camera = null; SIM3D.controls = null;
  }

  function resetCarveSurface() {
    if (!SIM3D.carveCtx || !SIM3D.baseTexCanvas) return;
    SIM3D.carveCtx.drawImage(SIM3D.baseTexCanvas, 0, 0);
    if (SIM3D.carveTex) SIM3D.carveTex.needsUpdate = true;
    SIM3D.lastDrawnSegIdx = 0;
  }

  function paintCarveSegment(seg) {
    if (!SIM3D.carveCtx || !seg.cutting) return;
    const cw = SIM3D.carveCanvas.width, ch = SIM3D.carveCanvas.height;
    const padX = SIM3D.physW * 0.08, padY = SIM3D.physH * 0.08;
    const slabW = SIM3D.physW + padX * 2, slabH = SIM3D.physH + padY * 2;
    const toU = (x) => ((x + padX) / slabW) * cw;
    const toV = (y) => (1 - (y + padY) / slabH) * ch;

    const ctx = SIM3D.carveCtx;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (SIM3D.isRouter) {
      const depthFactor = Math.min(1, Math.abs(Math.min(seg.z1, seg.z2)) / Math.max(1, SIM3D.stockH * 0.6));
      ctx.strokeStyle = SIM3D.material === 'aluminum'
        ? `rgba(51,65,85,${0.55 + depthFactor * 0.4})`
        : (SIM3D.material === 'acrylic' ? `rgba(186,230,253,${0.65 + depthFactor * 0.3})` : `rgba(42,22,8,${0.48 + depthFactor * 0.48})`);
      ctx.lineWidth = Math.max(2.6, (cw / slabW) * 2.2);
    } else {
      ctx.strokeStyle = SIM3D.material === 'acrylic'
        ? 'rgba(224,242,254,0.92)'
        : (SIM3D.material === 'slate' ? 'rgba(226,232,240,0.88)' : 'rgba(18,10,4,0.92)');
      ctx.lineWidth = Math.max(1.8, (cw / slabW) * 0.65);
    }
    ctx.beginPath();
    ctx.moveTo(toU(seg.x1), toV(seg.y1));
    ctx.lineTo(toU(seg.x2), toV(seg.y2));
    ctx.stroke();
    ctx.restore();
  }

  function updateSim3DToProgress(pct) {
    SIM3D.progress = Math.max(0, Math.min(1, pct));
    const targetDist = SIM3D.progress * SIM3D.totalLen;
    const segs = SIM3D.segments;
    if (!segs.length) return;

    // If scrubbing backwards, repaint surface from 0
    if (SIM3D.lastDrawnSegIdx > 0 && (SIM3D.lastDrawnSegIdx >= segs.length || segs[SIM3D.lastDrawnSegIdx].dStart > targetDist)) {
      resetCarveSurface();
    }

    let curSeg = segs[0], t = 0, activeCount = 0;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (s.dEnd <= targetDist) {
        if (i >= SIM3D.lastDrawnSegIdx) {
          paintCarveSegment(s);
          SIM3D.lastDrawnSegIdx = i + 1;
        }
        curSeg = s; t = 1; activeCount = i + 1;
      } else {
        curSeg = s;
        t = Math.max(0, Math.min(1, (targetDist - s.dStart) / Math.max(1e-6, s.dEnd - s.dStart)));
        activeCount = i + 1;
        break;
      }
    }
    if (SIM3D.carveTex) SIM3D.carveTex.needsUpdate = true;

    const px = curSeg.x1 + (curSeg.x2 - curSeg.x1) * t;
    const py = curSeg.y1 + (curSeg.y2 - curSeg.y1) * t;
    const pz = curSeg.z1 + (curSeg.z2 - curSeg.z1) * t;

    const cx = px - SIM3D.physW * 0.5;
    const cz = -(py - SIM3D.physH * 0.5);
    const cy = SIM3D.isRouter ? pz : 0;

    if (SIM3D.headGroup) {
      SIM3D.headGroup.position.set(cx, cy, cz);
    }
    if (SIM3D.beamMesh) SIM3D.beamMesh.visible = !SIM3D.isRouter && curSeg.cutting;
    if (SIM3D.sparkMesh) {
      SIM3D.sparkMesh.visible = curSeg.cutting;
      SIM3D.sparkMesh.scale.setScalar(0.85 + Math.random() * 0.45);
    }
    if (SIM3D.bitMesh && SIM3D.isRouter) SIM3D.bitMesh.rotation.y += 0.45;

    if (SIM3D.cutGeo) SIM3D.cutGeo.setDrawRange(0, activeCount * 2);

    const scrub = $('sim3dScrub');
    if (scrub && document.activeElement !== scrub) scrub.value = Math.round(SIM3D.progress * 1000);
    const dro = $('sim3dDRO');
    if (dro) {
      dro.textContent = `X:${px.toFixed(1)}  Y:${py.toFixed(1)}  Z:${pz.toFixed(2)}mm  |  ${isFr() ? 'Passe' : 'Pass'} #${curSeg.pass}  |  ${Math.round(SIM3D.progress * 100)}%`;
    }
  }

  function buildSim3DScene() {
    const container = $('sim3dCanvasHost');
    if (!container || typeof THREE === 'undefined') return;
    disposeSim3D();
    container.innerHTML = '';

    const data = global.App && global.App.getToolpathData ? global.App.getToolpathData() : null;
    if (!data || !data.gcode) return;

    SIM3D.physW = Math.max(20, data.physW);
    SIM3D.physH = Math.max(20, data.physH);
    SIM3D.isRouter = data.isRouter;
    SIM3D.stockH = Math.max(6, (data.cutDepth || 4) + 3);

    const parsed = parseGcodeToSimSegments(data.gcode, SIM3D.physW, SIM3D.physH, SIM3D.isRouter);
    SIM3D.segments = parsed.segments;
    SIM3D.totalLen = parsed.totalLen;
    SIM3D.progress = 0;

    const W = Math.max(480, container.clientWidth || 780);
    const H = Math.max(340, container.clientHeight || 420);

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: false });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(W, H);
    renderer.setClearColor(0x070d19, 1);
    container.appendChild(renderer.domElement);
    SIM3D.renderer = renderer;

    const scene = new THREE.Scene();
    SIM3D.scene = scene;

    const maxDim = Math.max(SIM3D.physW, SIM3D.physH);
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.5, maxDim * 20);
    camera.position.set(maxDim * 0.72, maxDim * 0.78, maxDim * 0.92);
    SIM3D.camera = camera;

    if (typeof THREE.OrbitControls === 'function') {
      const controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.target.set(0, 0, 0);
      controls.update();
      SIM3D.controls = controls;
    }

    // Lighting
    scene.add(new THREE.AmbientLight(0xdbeafe, 0.65));
    const dir = new THREE.DirectionalLight(0xffffff, 0.95);
    dir.position.set(maxDim * 0.8, maxDim * 1.4, maxDim * 0.7);
    scene.add(dir);
    const rim = new THREE.DirectionalLight(0x38bdf8, 0.35);
    rim.position.set(-maxDim, maxDim * 0.6, -maxDim);
    scene.add(rim);

    // CNC Bed Grid
    const gridSize = Math.max(maxDim * 1.6, 120);
    const grid = new THREE.GridHelper(gridSize, 20, 0x38bdf8, 0x1e293b);
    grid.position.y = -SIM3D.stockH - 0.1;
    scene.add(grid);

    // Stock Slab with Live Carve Texture
    SIM3D.baseTexCanvas = generateStockTextureCanvas(SIM3D.material, 768, 768);
    SIM3D.carveCanvas = document.createElement('canvas');
    SIM3D.carveCanvas.width = 768; SIM3D.carveCanvas.height = 768;
    SIM3D.carveCtx = SIM3D.carveCanvas.getContext('2d');
    SIM3D.carveCtx.drawImage(SIM3D.baseTexCanvas, 0, 0);
    SIM3D.carveTex = new THREE.CanvasTexture(SIM3D.carveCanvas);
    SIM3D.carveTex.anisotropy = 4;

    const slabW = SIM3D.physW * 1.16, slabH = SIM3D.physH * 1.16;
    const sideColor = SIM3D.material === 'walnut' ? 0x452612 : (SIM3D.material === 'aluminum' ? 0x94a3b8 : (SIM3D.material === 'acrylic' ? 0x0369a1 : (SIM3D.material === 'slate' ? 0x0f172a : 0xb48a5a)));
    const sideMat = new THREE.MeshStandardMaterial({ color: sideColor, roughness: 0.65, metalness: SIM3D.material === 'aluminum' ? 0.65 : 0.08 });
    const topMat = new THREE.MeshStandardMaterial({ map: SIM3D.carveTex, roughness: SIM3D.material === 'acrylic' ? 0.18 : 0.55, metalness: SIM3D.material === 'aluminum' ? 0.55 : 0.05 });
    const slabGeo = new THREE.BoxGeometry(slabW, SIM3D.stockH, slabH);
    const slabMesh = new THREE.Mesh(slabGeo, [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]);
    slabMesh.position.set(0, -SIM3D.stockH * 0.5, 0);
    scene.add(slabMesh);

    // Build toolpath lines (cut + rapid)
    const cutCoords = [];
    const rapidCoords = [];
    for (const s of SIM3D.segments) {
      const ax = s.x1 - SIM3D.physW * 0.5, az = -(s.y1 - SIM3D.physH * 0.5), ay = (SIM3D.isRouter ? s.z1 : 0) + 0.25;
      const bx = s.x2 - SIM3D.physW * 0.5, bz = -(s.y2 - SIM3D.physH * 0.5), by = (SIM3D.isRouter ? s.z2 : 0) + 0.25;
      if (s.cutting) {
        cutCoords.push(ax, ay, az, bx, by, bz);
      } else {
        rapidCoords.push(ax, Math.max(ay, SIM3D.isRouter ? ay : 4), az, bx, Math.max(by, SIM3D.isRouter ? by : 4), bz);
      }
    }

    const cutGeo = new THREE.BufferGeometry();
    cutGeo.setAttribute('position', new THREE.Float32BufferAttribute(cutCoords, 3));
    cutGeo.setDrawRange(0, 0);
    const cutMat = new THREE.LineBasicMaterial({ color: SIM3D.isRouter ? 0xf59e0b : 0xef4444 });
    SIM3D.cutGeo = cutGeo;
    SIM3D.cutLine = new THREE.LineSegments(cutGeo, cutMat);
    scene.add(SIM3D.cutLine);

    if (rapidCoords.length) {
      const rapGeo = new THREE.BufferGeometry();
      rapGeo.setAttribute('position', new THREE.Float32BufferAttribute(rapidCoords, 3));
      const rapMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.32 });
      SIM3D.rapidLine = new THREE.LineSegments(rapGeo, rapMat);
      SIM3D.rapidLine.visible = SIM3D.showRapids;
      scene.add(SIM3D.rapidLine);
    }

    // 3D Tool Head Assembly (Laser Module OR CNC Router Spindle)
    const head = new THREE.Group();
    const headScale = Math.max(0.5, maxDim / 110);
    if (SIM3D.isRouter) {
      // Spindle housing + collet + spinning endmill
      const body = new THREE.Mesh(new THREE.CylinderGeometry(7 * headScale, 7 * headScale, 28 * headScale, 20), new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.25 }));
      body.position.y = 26 * headScale;
      const collet = new THREE.Mesh(new THREE.CylinderGeometry(3.4 * headScale, 2.2 * headScale, 6 * headScale, 12), new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.2 }));
      collet.position.y = 10 * headScale;
      const bit = new THREE.Mesh(new THREE.CylinderGeometry(1.4 * headScale, 1.4 * headScale, 10 * headScale, 8), new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.2 }));
      bit.position.y = 5 * headScale;
      SIM3D.bitMesh = bit;
      head.add(body, collet, bit);
      const spark = new THREE.Mesh(new THREE.SphereGeometry(2.1 * headScale, 10, 10), new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.85 }));
      spark.position.y = 0.5;
      SIM3D.sparkMesh = spark;
      head.add(spark);
    } else {
      // Diode/CO2 Laser Head + Beam + Focal Glow
      const housing = new THREE.Mesh(new THREE.BoxGeometry(12 * headScale, 24 * headScale, 12 * headScale), new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.65, roughness: 0.3 }));
      housing.position.y = 28 * headScale;
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(2.6 * headScale, 1.4 * headScale, 6 * headScale, 16), new THREE.MeshStandardMaterial({ color: 0x0ea5e9, metalness: 0.75, roughness: 0.2 }));
      nozzle.position.y = 13.5 * headScale;
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.42 * headScale, 0.22 * headScale, 12 * headScale, 8), new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.92 }));
      beam.position.y = 6 * headScale;
      const spark = new THREE.Mesh(new THREE.SphereGeometry(1.7 * headScale, 10, 10), new THREE.MeshBasicMaterial({ color: 0xf97316 }));
      spark.position.y = 0.4;
      SIM3D.beamMesh = beam;
      SIM3D.sparkMesh = spark;
      head.add(housing, nozzle, beam, spark);
    }
    SIM3D.headGroup = head;
    scene.add(head);

    SIM3D.playing = true;
    updateSim3DPlayBtn();
    let lastTs = performance.now();

    const loop = (ts) => {
      SIM3D.rafId = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      if (SIM3D.playing && !SIM3D.recording) {
        const nextP = SIM3D.progress + dt * 0.085 * SIM3D.speed;
        if (nextP >= 1) {
          updateSim3DToProgress(1);
          SIM3D.playing = false;
          updateSim3DPlayBtn();
        } else {
          updateSim3DToProgress(nextP);
        }
      }
      if (SIM3D.controls) SIM3D.controls.update();
      renderer.render(scene, camera);
    };
    updateSim3DToProgress(0);
    SIM3D.rafId = requestAnimationFrame(loop);
  }

  function updateSim3DPlayBtn() {
    const b = $('btnSim3dPlay');
    if (!b) return;
    b.textContent = SIM3D.playing ? (isFr() ? '⏸ Pause' : '⏸ Pause') : (isFr() ? '▶ Lire' : '▶ Play');
  }

  function setSim3DCamera(preset) {
    if (!SIM3D.camera || !SIM3D.controls) return;
    const m = Math.max(SIM3D.physW, SIM3D.physH);
    if (preset === 'top') SIM3D.camera.position.set(0, m * 1.45, 0.01);
    else if (preset === 'close') SIM3D.camera.position.set(m * 0.35, m * 0.42, m * 0.52);
    else SIM3D.camera.position.set(m * 0.72, m * 0.78, m * 0.92);
    SIM3D.controls.target.set(0, 0, 0);
    SIM3D.controls.update();
  }

  async function recordSim3DVideo() {
    if (!SIM3D.renderer || !SIM3D.scene || !SIM3D.camera || SIM3D.recording) return;
    if (typeof MediaRecorder === 'undefined') {
      global.App.toast(isFr() ? 'MediaRecorder non supporté sur ce navigateur.' : 'MediaRecorder unsupported in this browser.', 'error');
      return;
    }

    const btn = $('btnSim3dRecord');
    SIM3D.recording = true;
    SIM3D.playing = false;
    if (btn) { btn.disabled = true; btn.textContent = isFr() ? '🔴 Enregistrement...' : '🔴 Recording...'; }

    // Composite WebGL + optional Free watermark onto 2D stream canvas (100% FREE with watermark, clean on Pro!)
    const srcCv = SIM3D.renderer.domElement;
    const outCv = document.createElement('canvas');
    outCv.width = Math.min(1280, srcCv.width);
    outCv.height = Math.min(720, srcCv.height);
    const oCtx = outCv.getContext('2d');
    const isPro = !!global.isPremiumUser;

    const stream = outCv.captureStream(30);
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 3800000 });
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };

    const donePromise = new Promise((resolve) => {
      rec.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
    });

    resetCarveSurface();
    rec.start();

    const totalFrames = 150; // ~5 seconds at 30fps
    const baseAngle = Math.atan2(SIM3D.camera.position.z, SIM3D.camera.position.x);
    const radius = Math.hypot(SIM3D.camera.position.x, SIM3D.camera.position.z);
    const camY = SIM3D.camera.position.y;

    for (let f = 0; f <= totalFrames; f++) {
      const p = f / totalFrames;
      updateSim3DToProgress(p);
      // Gentle cinematic turntable sweep while carving
      const ang = baseAngle + p * Math.PI * 0.35;
      SIM3D.camera.position.set(Math.cos(ang) * radius, camY, Math.sin(ang) * radius);
      SIM3D.camera.lookAt(0, 0, 0);
      SIM3D.renderer.render(SIM3D.scene, SIM3D.camera);

      oCtx.drawImage(srcCv, 0, 0, outCv.width, outCv.height);
      // HUD badge
      oCtx.fillStyle = 'rgba(7,13,25,0.72)';
      oCtx.fillRect(14, 14, 245, 32);
      oCtx.fillStyle = '#38bdf8';
      oCtx.font = '700 13px Inter, sans-serif';
      oCtx.fillText(`${SIM3D.isRouter ? 'CNC ROUTER 2.5D' : 'LASER CNC'} • ${Math.round(p * 100)}%`, 24, 35);
      if (!isPro) {
        oCtx.fillStyle = 'rgba(7,13,25,0.75)';
        oCtx.fillRect(outCv.width - 236, outCv.height - 38, 222, 26);
        oCtx.fillStyle = '#e2e8f0';
        oCtx.font = '700 12px Inter, sans-serif';
        oCtx.fillText('STUDIOS-PRO.COM • Vector CNC', outCv.width - 226, outCv.height - 21);
      }
      await new Promise(r => setTimeout(r, 33));
    }

    rec.stop();
    const blob = await donePromise;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.dataset.bypassed = 'true'; // 100% FREE watermarked timelapse video!
    a.download = `StudiosPro_VectorCNC_Timelapse_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 600);

    SIM3D.recording = false;
    if (btn) { btn.disabled = false; btn.textContent = isFr() ? '🎬 Exporter Vidéo .WEBM' : '🎬 Export .WEBM Video'; }
    global.App.toast(isFr() ? '🎬 Vidéo Time-Lapse .WEBM téléchargée !' : '🎬 Time-Lapse .WEBM video downloaded!', 'success');
  }

  function openSim3DModal() {
    if (!global.App || !global.App.hasVectors()) {
      global.App && global.App.toast(isFr() ? 'Chargez ou vectorisez un dessin d\'abord !' : 'Load or vectorize a design first!', 'error');
      return;
    }
    const modal = $('sim3dModal');
    if (!modal) return;
    modal.classList.add('show');
    const matSel = $('sim3dMaterial');
    if (matSel) SIM3D.material = matSel.value || 'birch';
    setTimeout(() => buildSim3DScene(), 60);
  }

  function closeSim3DModal() {
    const modal = $('sim3dModal');
    if (modal) modal.classList.remove('show');
    disposeSim3D();
  }

  // ═══════════════════════════════════════════════════════
  // 2. CNC VECTOR TEXT GENERATOR (HERSHEY SINGLE-LINE + BOLD STENCIL)
  // ═══════════════════════════════════════════════════════
  function updateTextToolPreview() {
    const cv = $('textToolPreview');
    if (!cv || !global.VectorEngine) return;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, cv.width, cv.height);
    const txt = ($('cncTextInput')?.value || 'STUDIOS-PRO').trim() || 'CNC';
    const mode = $('cncTextMode')?.value || 'hershey';
    const bridges = !!$('cncTextBridges')?.checked;
    const hPx = Math.min(cv.height * 0.42, 48);

    const paths = mode === 'hershey'
      ? global.VectorEngine.generateHersheyTextPaths(txt, cv.width * 0.5, cv.height * 0.5 - hPx * 0.5, hPx, 0.25, 'center')
      : global.VectorEngine.generateStencilTextPaths(txt, cv.width * 0.5, cv.height * 0.5, hPx, 'Space Grotesk, Inter, sans-serif', bridges, 'center');

    global.VectorEngine.drawPathsOnCtx(ctx, paths, false, '#38bdf8', '#38bdf8', mode === 'hershey');
  }

  function openTextToolModal() {
    const modal = $('textToolModal');
    if (!modal) return;
    modal.classList.add('show');
    updateTextToolPreview();
  }

  function applyTextToolToWorkspace() {
    const txt = ($('cncTextInput')?.value || '').trim();
    if (!txt) return;
    const mode = $('cncTextMode')?.value || 'hershey';
    const sizeMm = Math.max(4, parseFloat($('cncTextSizeMm')?.value) || 18);
    const pos = $('cncTextPosition')?.value || 'center';
    const bridges = !!$('cncTextBridges')?.checked;
    const replace = !!$('cncTextReplace')?.checked;
    if (global.App && global.App.addVectorText) {
      global.App.addVectorText({ text: txt, mode, sizeMm, position: pos, bridges, replace });
    }
    $('textToolModal')?.classList.remove('show');
  }

  // ═══════════════════════════════════════════════════════
  // 3. LASER MATERIAL TEST CARD GENERATOR (POWER x SPEED MATRIX)
  // ═══════════════════════════════════════════════════════
  function buildTestCardPayload() {
    const gridN = Math.max(3, Math.min(10, parseInt($('tcGridSize')?.value || '5', 10)));
    const minP = Math.max(5, Math.min(95, parseInt($('tcMinPower')?.value || '20', 10)));
    const maxP = Math.max(minP + 5, Math.min(100, parseInt($('tcMaxPower')?.value || '100', 10)));
    const minS = Math.max(100, parseInt($('tcMinSpeed')?.value || '400', 10));
    const maxS = Math.max(minS + 100, parseInt($('tcMaxSpeed')?.value || '2400', 10));
    const sqMm = Math.max(5, Math.min(20, parseFloat($('tcSquareMm')?.value || '10')));
    const mode = $('tcMode')?.value || 'fill'; // fill | cut
    const gap = 2.5, marginL = 22, marginB = 18, marginT = 14, marginR = 8;

    const totalW = marginL + gridN * sqMm + (gridN - 1) * gap + marginR;
    const totalH = marginB + gridN * sqMm + (gridN - 1) * gap + marginT;

    const powers = [], speeds = [];
    for (let i = 0; i < gridN; i++) {
      const f = gridN === 1 ? 0 : i / (gridN - 1);
      powers.push(Math.round(minP + (maxP - minP) * f));
      speeds.push(Math.round(minS + (maxS - minS) * f));
    }

    const gLines = [
      '; CNC Vector Studio — Laser Material Test Card (GRBL 1.1+)',
      `; Grid: ${gridN}x${gridN} | Power: ${minP}-${maxP}% | Speed: ${minS}-${maxS} mm/min | Mode: ${mode.toUpperCase()}`,
      `; Card Size: ${totalW.toFixed(1)} x ${totalH.toFixed(1)} mm`,
      'G21 ; millimeters',
      'G90 ; absolute positioning',
      'M5 ; laser off'
    ];

    // Engrave Hershey Axis Labels (light score)
    const VE = global.VectorEngine;
    const labelPaths = [];
    if (VE && VE.generateHersheyTextPaths) {
      // Title at top (Y in Y-down canvas coords, flipped to Y-up for G-code)
      const emitLabel = (str, xMm, yMmUp, hMm) => {
        const ps = VE.generateHersheyTextPaths(str, xMm, 0, hMm, 0.2, 'center');
        for (const p of ps) {
          const mapped = p.map(([px, py]) => [px, yMmUp - py]);
          labelPaths.push(mapped);
          gLines.push(`G0 X${mapped[0][0].toFixed(2)} Y${mapped[0][1].toFixed(2)}`);
          gLines.push('M4 S250 F1200');
          for (let k = 1; k < mapped.length; k++) gLines.push(`G1 X${mapped[k][0].toFixed(2)} Y${mapped[k][1].toFixed(2)}`);
          gLines.push('M5');
        }
      };
      emitLabel(`TEST ${minP}-${maxP}% / ${minS}-${maxS}`, totalW * 0.5, totalH - 3, 4.2);
      for (let c = 0; c < gridN; c++) {
        const cx = marginL + c * (sqMm + gap) + sqMm * 0.5;
        emitLabel(`${powers[c]}%`, cx, marginB - 4, 2.8);
      }
      for (let r = 0; r < gridN; r++) {
        const cy = marginB + r * (sqMm + gap) + sqMm * 0.65;
        emitLabel(`${speeds[r]}`, marginL * 0.45, cy, 2.8);
      }
    }

    let svgShapes = '';
    const squares = [];
    for (let r = 0; r < gridN; r++) {
      for (let c = 0; c < gridN; c++) {
        const x0 = marginL + c * (sqMm + gap);
        const y0 = marginB + r * (sqMm + gap);
        const pwr = powers[c], spd = speeds[r];
        const sVal = Math.round(pwr * 10);
        squares.push({ x0, y0, sqMm, pwr, spd, r, c });

        gLines.push(`; Cell R${r + 1}C${c + 1}: Power ${pwr}% (S${sVal}) @ Speed ${spd} mm/min`);
        if (mode === 'fill') {
          const lineStep = 0.25;
          let flip = false;
          for (let dy = 0.2; dy <= sqMm - 0.1; dy += lineStep) {
            const xa = flip ? x0 + sqMm : x0;
            const xb = flip ? x0 : x0 + sqMm;
            gLines.push(`G0 X${xa.toFixed(2)} Y${(y0 + dy).toFixed(2)}`);
            gLines.push(`M4 S${sVal} F${spd}`);
            gLines.push(`G1 X${xb.toFixed(2)} Y${(y0 + dy).toFixed(2)}`);
            gLines.push('M5');
            flip = !flip;
          }
        }
        // Outline border of square
        gLines.push(`G0 X${x0.toFixed(2)} Y${y0.toFixed(2)}`);
        gLines.push(`M4 S${sVal} F${spd}`);
        gLines.push(`G1 X${(x0 + sqMm).toFixed(2)} Y${y0.toFixed(2)}`);
        gLines.push(`G1 X${(x0 + sqMm).toFixed(2)} Y${(y0 + sqMm).toFixed(2)}`);
        gLines.push(`G1 X${x0.toFixed(2)} Y${(y0 + sqMm).toFixed(2)}`);
        gLines.push(`G1 X${x0.toFixed(2)} Y${y0.toFixed(2)}`);
        gLines.push('M5');

        const svgY = totalH - (y0 + sqMm);
        const shade = Math.round(240 - (pwr / 100) * 190);
        svgShapes += `\n  <rect x="${x0.toFixed(2)}" y="${svgY.toFixed(2)}" width="${sqMm}" height="${sqMm}" fill="${mode === 'fill' ? `rgb(${shade},${shade},${shade})` : 'none'}" stroke="#ff0000" stroke-width="0.2" data-power="${pwr}" data-speed="${spd}"/>`;
      }
    }

    // Outer cutout frame
    gLines.push('; Outer Cut Frame');
    gLines.push('G0 X1.00 Y1.00');
    gLines.push(`M4 S${Math.round(maxP * 10)} F${minS}`);
    gLines.push(`G1 X${(totalW - 1).toFixed(2)} Y1.00`);
    gLines.push(`G1 X${(totalW - 1).toFixed(2)} Y${(totalH - 1).toFixed(2)}`);
    gLines.push(`G1 X1.00 Y${(totalH - 1).toFixed(2)}`);
    gLines.push('G1 X1.00 Y1.00');
    gLines.push('M5');
    gLines.push('G0 X0 Y0');
    gLines.push('M30');

    let svgLabels = '';
    for (const lp of labelPaths) {
      if (lp.length < 2) continue;
      const d = lp.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt[0].toFixed(2)},${(totalH - pt[1]).toFixed(2)}`).join(' ');
      svgLabels += `\n  <path d="${d}" fill="none" stroke="#0000ff" stroke-width="0.25"/>`;
    }

    const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${totalW.toFixed(1)}mm" height="${totalH.toFixed(1)}mm" viewBox="0 0 ${totalW.toFixed(1)} ${totalH.toFixed(1)}">\n  <rect x="1" y="1" width="${(totalW - 2).toFixed(1)}" height="${(totalH - 2).toFixed(1)}" fill="none" stroke="#000000" stroke-width="0.3"/>${svgShapes}${svgLabels}\n</svg>`;

    return { gridN, totalW, totalH, powers, speeds, squares, gcode: gLines.join('\n'), svg, mode };
  }

  function renderTestCardPreview() {
    const cv = $('testCardPreview');
    if (!cv) return;
    const card = buildTestCardPayload();
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    ctx.fillStyle = '#e2c499'; // plywood look
    ctx.fillRect(0, 0, W, H);
    const scale = Math.min((W - 20) / card.totalW, (H - 20) / card.totalH);
    const ox = (W - card.totalW * scale) * 0.5;
    const oy = (H - card.totalH * scale) * 0.5;

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(ox + scale, oy + scale, (card.totalW - 2) * scale, (card.totalH - 2) * scale);

    ctx.fillStyle = '#3b2410';
    ctx.font = `700 ${Math.max(9, Math.round(3.6 * scale))}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`POWER (%) × SPEED (mm/min) — ${card.totalW.toFixed(0)}×${card.totalH.toFixed(0)} mm`, ox + card.totalW * scale * 0.5, oy + 9 * scale);

    for (const sq of card.squares) {
      const sx = ox + sq.x0 * scale;
      const sy = oy + (card.totalH - sq.y0 - sq.sqMm) * scale;
      const s = sq.sqMm * scale;
      const burn = Math.min(1, (sq.pwr / 100) * (1200 / Math.max(250, sq.spd)));
      if (card.mode === 'fill') {
        ctx.fillStyle = `rgba(32, 16, 4, ${(0.12 + burn * 0.85).toFixed(2)})`;
        ctx.fillRect(sx, sy, s, s);
      }
      ctx.strokeStyle = '#7c2d12';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, sy, s, s);
    }

    // Column & row axis labels
    ctx.fillStyle = '#1e293b';
    ctx.font = `600 ${Math.max(8, Math.round(2.7 * scale))}px monospace`;
    for (let c = 0; c < card.gridN; c++) {
      const sq = card.squares[c];
      ctx.textAlign = 'center';
      ctx.fillText(card.powers[c] + '%', ox + (sq.x0 + sq.sqMm * 0.5) * scale, oy + (card.totalH - 5) * scale);
    }
    for (let r = 0; r < card.gridN; r++) {
      const sq = card.squares[r * card.gridN];
      ctx.textAlign = 'right';
      ctx.fillText(String(card.speeds[r]), ox + (sq.x0 - 2.5) * scale, oy + (card.totalH - sq.y0 - sq.sqMm * 0.35) * scale);
    }

    const meta = $('tcMetaReadout');
    if (meta) {
      meta.textContent = `${card.gridN}×${card.gridN} (${card.gridN * card.gridN} ${isFr() ? 'cases' : 'cells'}) • ${card.totalW.toFixed(0)} × ${card.totalH.toFixed(0)} mm • GRBL M4`;
    }
  }

  function openTestCardModal() {
    const modal = $('testCardModal');
    if (!modal) return;
    modal.classList.add('show');
    renderTestCardPreview();
  }

  async function downloadTestCard(fmt) {
    const card = buildTestCardPayload();
    if (global.App && global.App.gatedTextExport) {
      await global.App.gatedTextExport(
        fmt === 'svg' ? card.svg : card.gcode,
        `StudiosPro_Laser_TestCard_${card.gridN}x${card.gridN}.${fmt}`
      );
    }
  }

  // ═══════════════════════════════════════════════════════
  // 4. SMART SHEET AUTO-NESTING MODAL
  // ═══════════════════════════════════════════════════════
  let lastNestResult = null;

  function renderNestingPreview() {
    const cv = $('nestingPreviewCanvas');
    if (!cv || !global.App || !global.App.getRawVectorInfo) return;
    const info = global.App.getRawVectorInfo();
    if (!info || !info.paths.length) return;

    const sheetW = Math.max(30, parseFloat($('nestSheetW')?.value) || 400);
    const sheetH = Math.max(30, parseFloat($('nestSheetH')?.value) || 300);
    const copies = Math.max(0, parseInt($('nestCopies')?.value || '0', 10)); // 0 = auto max
    const spacing = Math.max(0, parseFloat($('nestSpacing')?.value) || 4);
    const rot90 = !!$('nestRotate90')?.checked;

    const res = global.VectorEngine.nestPartsOnSheet(
      info.paths, info.w, info.h, info.physW, info.physH,
      sheetW, sheetH, copies, spacing, rot90, info.isColor
    );
    lastNestResult = res;

    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    ctx.fillStyle = '#070d19';
    ctx.fillRect(0, 0, W, H);

    const scale = Math.min((W - 28) / sheetW, (H - 28) / sheetH);
    const sw = sheetW * scale, sh = sheetH * scale;
    const ox = (W - sw) * 0.5, oy = (H - sh) * 0.5;

    ctx.fillStyle = '#131d31';
    ctx.fillRect(ox, oy, sw, sh);
    ctx.strokeStyle = res.fits ? '#10b981' : '#ef4444';
    ctx.lineWidth = 2;
    ctx.strokeRect(ox, oy, sw, sh);

    if (res.fits) {
      const sx = sw / Math.max(1, res.w);
      const sy = sh / Math.max(1, res.h);
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(sx, sy);
      if (info.isColor) {
        res.paths.forEach(l => global.VectorEngine.drawPathsOnCtx(ctx, l, false, l.colorData || '#38bdf8', l.colorData || '#38bdf8'));
      } else {
        global.VectorEngine.drawPathsOnCtx(ctx, res.paths, false, 'rgba(56,189,248,0.45)', '#38bdf8', false);
      }
      ctx.restore();
    }

    const stats = $('nestingStats');
    if (stats) {
      if (!res.fits) {
        stats.innerHTML = `<span style="color:#ef4444;font-weight:700">${isFr() ? '⚠️ Pièce trop grande pour cette feuille !' : '⚠️ Part exceeds sheet dimensions!'}</span> (${info.physW.toFixed(1)}×${info.physH.toFixed(1)} mm > ${sheetW}×${sheetH} mm)`;
      } else {
        stats.innerHTML = `
          <div><b>${res.placed}</b> / ${res.maxCapacity} ${isFr() ? 'pièces' : 'parts'} (${res.cols}×${res.rows}${res.rotated ? ' · 90°' : ''})</div>
          <div style="color:#10b981">${isFr() ? 'Utilisation' : 'Utilization'}: <b>${res.utilizationPct}%</b> &nbsp;|&nbsp; <span style="color:#f59e0b">${isFr() ? 'Perte' : 'Waste'}: <b>${res.wastePct}%</b></span></div>
        `;
      }
    }
  }

  function openNestingModal() {
    if (!global.App || !global.App.hasVectors()) {
      global.App && global.App.toast(isFr() ? 'Vectorisez un dessin d\'abord !' : 'Vectorize a design first!', 'error');
      return;
    }
    const modal = $('nestingModal');
    if (!modal) return;
    modal.classList.add('show');
    renderNestingPreview();
  }

  function applyNestingToWorkspace() {
    if (!lastNestResult || !lastNestResult.fits) return;
    if (global.App && global.App.applyNestedResult) {
      global.App.applyNestedResult(lastNestResult);
    }
    $('nestingModal')?.classList.remove('show');
  }

  // ═══════════════════════════════════════════════════════
  // 5. PRE-FLIGHT CNC SAFETY & CUTABILITY INSPECTOR
  // ═══════════════════════════════════════════════════════
  function refreshPreflightReport() {
    const cv = $('preflightCanvas');
    const box = $('preflightSummary');
    if (!cv || !box || !global.App || !global.App.getPreflightInfo) return;
    const info = global.App.getPreflightInfo();
    if (!info) return;
    const rep = info.report;

    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#090f1d';
    ctx.fillRect(0, 0, cv.width, cv.height);

    const scale = Math.min((cv.width - 20) / Math.max(1, info.w), (cv.height - 20) / Math.max(1, info.h));
    const ox = (cv.width - info.w * scale) * 0.5;
    const oy = (cv.height - info.h * scale) * 0.5;

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
    const flat = info.isColor ? info.paths.flat() : info.paths;
    const openSet = new Set(rep.openIndices);
    const dupSet = new Set(rep.duplicateIndices);
    const narrowSet = new Set(rep.narrowIndices);

    flat.forEach((p, idx) => {
      if (!p || p.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(p[0][0], p[0][1]);
      for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
      if (p.closed !== false) ctx.closePath();
      if (dupSet.has(idx)) { ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3 / scale; }
      else if (narrowSet.has(idx)) { ctx.strokeStyle = '#d946ef'; ctx.lineWidth = 2.6 / scale; }
      else if (openSet.has(idx)) { ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2.4 / scale; }
      else { ctx.strokeStyle = '#10b981'; ctx.lineWidth = 1.4 / scale; }
      ctx.stroke();
    });
    ctx.restore();

    const scoreColor = rep.score >= 85 ? '#10b981' : (rep.score >= 60 ? '#f59e0b' : '#ef4444');
    box.innerHTML = `
      <div class="pf-kpi-grid">
        <div class="pf-kpi"><span class="pf-lbl">${isFr() ? 'Score Sécurité' : 'Safety Score'}</span><b style="color:${scoreColor};font-size:20px">${rep.score}/100</b></div>
        <div class="pf-kpi"><span class="pf-lbl">${isFr() ? 'Lignes dupliquées' : 'Duplicate Lines'}</span><b style="color:${rep.duplicateCount ? '#ef4444' : '#10b981'}">${rep.duplicateCount}</b></div>
        <div class="pf-kpi"><span class="pf-lbl">${isFr() ? 'Contours ouverts' : 'Open Contours'}</span><b style="color:${rep.openCount ? '#f59e0b' : '#10b981'}">${rep.openCount}</b></div>
        <div class="pf-kpi"><span class="pf-lbl">${isFr() ? 'Zones < Fraise' : 'Features < Bit'}</span><b style="color:${rep.narrowCount ? '#d946ef' : '#10b981'}">${rep.narrowCount}</b></div>
      </div>
      <div style="font-size:12px;margin-top:8px;color:${rep.outOfBounds ? '#ef4444' : '#94a3b8'}">
        ${rep.outOfBounds
          ? (isFr() ? `⚠️ Hors limites du plateau (${rep.physW.toFixed(0)}×${rep.physH.toFixed(0)} mm > ${rep.bedWmm}×${rep.bedHmm} mm)` : `⚠️ Exceeds machine bed (${rep.physW.toFixed(0)}×${rep.physH.toFixed(0)} mm > ${rep.bedWmm}×${rep.bedHmm} mm)`)
          : (isFr() ? `✅ Dimensions conformes au plateau (${rep.physW.toFixed(1)}×${rep.physH.toFixed(1)} mm ≤ ${rep.bedWmm}×${rep.bedHmm} mm)` : `✅ Fits inside machine bed (${rep.physW.toFixed(1)}×${rep.physH.toFixed(1)} mm ≤ ${rep.bedWmm}×${rep.bedHmm} mm)`)}
      </div>
    `;
  }

  function openPreflightModal() {
    if (!global.App || !global.App.hasVectors()) {
      global.App && global.App.toast(isFr() ? 'Vectorisez un dessin d\'abord !' : 'Vectorize a design first!', 'error');
      return;
    }
    const modal = $('preflightModal');
    if (!modal) return;
    modal.classList.add('show');
    refreshPreflightReport();
  }

  // ═══════════════════════════════════════════════════════
  // 6. SYNTAX-HIGHLIGHTED G-CODE INSPECTOR
  // ═══════════════════════════════════════════════════════
  function highlightGcodeLine(line) {
    const safe = esc(line);
    if (/^\s*(;|\()/.test(line)) return `<span class="gc-cmt">${safe}</span>`;
    return safe
      .replace(/\b(G0?0)\b/g, '<span class="gc-g0">$1</span>')
      .replace(/\b(G0?1|G2[01]|G90|G17)\b/g, '<span class="gc-g1">$1</span>')
      .replace(/\b(M[0-9]+)\b/g, '<span class="gc-m">$1</span>')
      .replace(/\b(Z-[\d.]+)\b/g, '<span class="gc-z">$1</span>')
      .replace(/\b([FS][\d.]+)\b/g, '<span class="gc-fs">$1</span>')
      .replace(/(;.*)$/, '<span class="gc-cmt">$1</span>');
  }

  function openGCodeInspector() {
    if (!global.App || !global.App.getToolpathData) return;
    if (!global.App.hasVectors()) {
      global.App.toast(isFr() ? 'Vectorisez un dessin d\'abord !' : 'Vectorize a design first!', 'error');
      return;
    }
    const data = global.App.getToolpathData();
    const lines = data.gcode.split('\n');
    const maxPreview = 450;
    const shown = lines.slice(0, maxPreview);
    const codeEl = $('gcodeInspectorBody');
    if (codeEl) {
      codeEl.innerHTML = shown.map((l, idx) => `<div class="gc-row"><span class="gc-ln">${idx + 1}</span><span>${highlightGcodeLine(l)}</span></div>`).join('')
        + (lines.length > maxPreview ? `<div class="gc-cmt" style="padding:8px">... +${lines.length - maxPreview} ${isFr() ? 'lignes supplémentaires dans le fichier exporté' : 'more lines in exported file'}</div>` : '');
    }
    const metaEl = $('gcodeInspectorMeta');
    if (metaEl) {
      metaEl.innerHTML = `
        <span>${isFr() ? 'Lignes' : 'Lines'}: <b>${lines.length}</b></span>
        <span>${isFr() ? 'Taille' : 'Size'}: <b>${data.physW.toFixed(1)}×${data.physH.toFixed(1)} mm</b></span>
        <span>${isFr() ? 'Post-Processeur' : 'Post-Processor'}: <b>${esc(data.dialectLabel)}</b></span>
        <span>${isFr() ? 'Temps est.' : 'Est. Time'}: <b>${esc(data.timeStr)}</b></span>
      `;
    }
    $('gcodeModal')?.classList.add('show');
  }

  // ═══════════════════════════════════════════════════════
  // 7. WORKSHOP COST, MACHINE TIME & ETSY PROFIT CALCULATOR + SETUP SHEET
  // ═══════════════════════════════════════════════════════
  function recalcWorkshopCost() {
    const info = global.App && global.App.getToolpathData ? global.App.getToolpathData() : null;
    const physW = info ? info.physW : 100;
    const physH = info ? info.physH : 100;
    const runMin = info ? Math.max(0.5, info.estMinutes) : 5;

    const sheetPrice = parseFloat($('costSheetPrice')?.value) || 12;
    const sheetW = Math.max(50, parseFloat($('costSheetW')?.value) || 400);
    const sheetH = Math.max(50, parseFloat($('costSheetH')?.value) || 300);
    const wastePct = Math.max(0, Math.min(80, parseFloat($('costWastePct')?.value) || 20));
    const machineRate = parseFloat($('costMachineRate')?.value) || 18;
    const packaging = parseFloat($('costPackaging')?.value) || 1.5;
    const etsyFeePct = parseFloat($('costEtsyFee')?.value) || 11.5;
    const markup = Math.max(1.2, parseFloat($('costMarkup')?.value) || 3.0);

    const partArea = physW * physH;
    const sheetArea = sheetW * sheetH;
    const materialCost = sheetPrice * (partArea / sheetArea) * (1 + wastePct / 100);
    const machineCost = (runMin / 60) * machineRate;
    const baseCost = materialCost + machineCost + packaging;
    const retailPrice = baseCost * markup;
    const fees = retailPrice * (etsyFeePct / 100) + 0.45;
    const netProfit = retailPrice - baseCost - fees;
    const marginPct = retailPrice > 0 ? (netProfit / retailPrice) * 100 : 0;

    const out = $('costSummaryOutput');
    if (out) {
      out.innerHTML = `
        <div class="cost-kpi-row">
          <div class="cost-kpi"><small>${isFr() ? 'Coût de revient' : 'Unit Cost'}</small><b>$${baseCost.toFixed(2)}</b></div>
          <div class="cost-kpi highlight"><small>${isFr() ? 'Prix conseillé' : 'Suggested Retail'}</small><b>$${retailPrice.toFixed(2)}</b></div>
          <div class="cost-kpi profit"><small>${isFr() ? 'Profit net' : 'Net Profit'}</small><b>$${netProfit.toFixed(2)} (${marginPct.toFixed(0)}%)</b></div>
        </div>
        <div class="cost-breakdown">
          <div><span>${isFr() ? 'Matière' : 'Material'} (${physW.toFixed(0)}×${physH.toFixed(0)}mm + ${wastePct}%):</span><b>$${materialCost.toFixed(2)}</b></div>
          <div><span>${isFr() ? 'Temps machine' : 'Machine Time'} (${runMin.toFixed(1)} min @ $${machineRate}/h):</span><b>$${machineCost.toFixed(2)}</b></div>
          <div><span>${isFr() ? 'Emballage & consommables' : 'Packaging & Finishing'}:</span><b>$${packaging.toFixed(2)}</b></div>
          <div><span>${isFr() ? 'Frais plateforme' : 'Platform Fees'} (${etsyFeePct}% + $0.45):</span><b>$${fees.toFixed(2)}</b></div>
        </div>
      `;
    }
    return { physW, physH, runMin, materialCost, machineCost, packaging, baseCost, retailPrice, fees, netProfit, marginPct, info };
  }

  function exportJobSetupSheet() {
    const c = recalcWorkshopCost();
    const d = c.info || {};
    const html = `<!DOCTYPE html><html lang="${isFr() ? 'fr' : 'en'}"><head><meta charset="UTF-8"><title>CNC Job Setup Sheet — Studios-Pro</title>
<style>body{font-family:Inter,Arial,sans-serif;max-width:820px;margin:24px auto;padding:24px;color:#0f172a;background:#fff}
h1{font-size:22px;border-bottom:2px solid #0ea5e9;padding-bottom:8px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:16px 0}
.box{border:1px solid #cbd5e1;border-radius:10px;padding:14px;background:#f8fafc}
.box h3{margin:0 0 8px;font-size:13px;text-transform:uppercase;color:#0284c7}
table{width:100%;border-collapse:collapse;font-size:13px}td{padding:5px 4px;border-bottom:1px solid #e2e8f0}td:last-child{text-align:right;font-weight:700}
@media print{button{display:none}}</style></head><body>
<h1>⚡ Vector CNC Studio — ${isFr() ? 'Fiche Technique Atelier (Job Setup Sheet)' : 'Workshop Job Setup Sheet'}</h1>
<div class="grid">
  <div class="box"><h3>${isFr() ? 'Spécifications Pièce & Machine' : 'Part & Machine Specs'}</h3><table>
    <tr><td>${isFr() ? 'Dimensions' : 'Dimensions'}</td><td>${c.physW.toFixed(1)} × ${c.physH.toFixed(1)} mm</td></tr>
    <tr><td>${isFr() ? 'Type Machine' : 'Machine Mode'}</td><td>${esc(d.isRouter ? 'CNC Router 2.5D' : 'Laser / Plasma')}</td></tr>
    <tr><td>${isFr() ? 'Post-Processeur' : 'Post-Processor'}</td><td>${esc(d.dialectLabel || 'GRBL 1.1+')}</td></tr>
    <tr><td>${isFr() ? 'Origine Travail' : 'Work Origin'}</td><td>X0 Y0 (Bottom-Left) · Z0 (Top of Stock)</td></tr>
    <tr><td>${isFr() ? 'Temps estimé' : 'Estimated Time'}</td><td>${esc(d.timeStr || (c.runMin.toFixed(1) + ' min'))}</td></tr>
  </table></div>
  <div class="box"><h3>${isFr() ? 'Estimation Coût & Prix' : 'Cost & Quote Summary'}</h3><table>
    <tr><td>${isFr() ? 'Matière' : 'Material'}</td><td>$${c.materialCost.toFixed(2)}</td></tr>
    <tr><td>${isFr() ? 'Usinage' : 'Machine Time'}</td><td>$${c.machineCost.toFixed(2)}</td></tr>
    <tr><td>${isFr() ? 'Coût de revient' : 'Total Unit Cost'}</td><td>$${c.baseCost.toFixed(2)}</td></tr>
    <tr><td>${isFr() ? 'Prix vente conseillé' : 'Suggested Retail'}</td><td>$${c.retailPrice.toFixed(2)}</td></tr>
    <tr><td>${isFr() ? 'Profit Net' : 'Net Profit'}</td><td>$${c.netProfit.toFixed(2)} (${c.marginPct.toFixed(0)}%)</td></tr>
  </table></div>
</div>
<div class="box"><h3>${isFr() ? 'Checklist Sécurité Avant Usinage' : 'Pre-Cut Safety Checklist'}</h3>
  <p>☐ ${isFr() ? 'Brider fermement la plaque sur le plateau' : 'Clamp stock securely to spoilboard / honeycomb bed'}</p>
  <p>☐ ${isFr() ? 'Vérifier origine X0, Y0 (coin inférieur gauche) et Z0 (surface)' : 'Zero X0, Y0 (front-left corner) and Z0 (top surface of stock)'}</p>
  <p>☐ ${isFr() ? 'Porter lunettes de protection Laser / CNC + aspiration activée' : 'Wear Laser/CNC safety goggles + enable dust extraction / air assist'}</p>
</div>
<p style="margin-top:20px;text-align:right"><button onclick="window.print()" style="padding:10px 18px;background:#0ea5e9;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer">🖨️ ${isFr() ? 'Imprimer / PDF' : 'Print / Save PDF'}</button></p>
</body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.dataset.bypassed = 'true';
    a.download = `StudiosPro_CNC_Job_Sheet_${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 600);
    global.App && global.App.toast(isFr() ? '📄 Fiche technique téléchargée !' : '📄 Job Setup Sheet downloaded!', 'success');
  }

  function openCostModal() {
    const modal = $('costModal');
    if (!modal) return;
    modal.classList.add('show');
    recalcWorkshopCost();
  }

  // ═══════════════════════════════════════════════════════
  // WIRE ALL MODAL EVENTS ON DOMCONTENTLOADED
  // ═══════════════════════════════════════════════════════
  function initProSuite() {
    const bind = (id, evt, fn) => { const el = $(id); if (el) el.addEventListener(evt, fn); };

    // Header Quick Launchers
    bind('btnOpenSim3D', 'click', openSim3DModal);
    bind('btnOpenTextTool', 'click', openTextToolModal);
    bind('btnOpenTestCard', 'click', openTestCardModal);
    bind('btnOpenNesting', 'click', openNestingModal);
    bind('btnOpenPreflight', 'click', openPreflightModal);
    bind('btnOpenGcodeInsp', 'click', openGCodeInspector);
    bind('btnOpenCostCalc', 'click', openCostModal);

    // 3D Simulator controls
    bind('btnCloseSim3d', 'click', closeSim3DModal);
    bind('btnSim3dPlay', 'click', () => {
      if (SIM3D.progress >= 0.999) { resetCarveSurface(); SIM3D.progress = 0; }
      SIM3D.playing = !SIM3D.playing;
      updateSim3DPlayBtn();
    });
    bind('btnSim3dRestart', 'click', () => { resetCarveSurface(); updateSim3DToProgress(0); SIM3D.playing = true; updateSim3DPlayBtn(); });
    bind('sim3dScrub', 'input', (e) => {
      SIM3D.playing = false; updateSim3DPlayBtn();
      updateSim3DToProgress((parseInt(e.target.value, 10) || 0) / 1000);
    });
    bind('sim3dSpeed', 'change', (e) => { SIM3D.speed = parseFloat(e.target.value) || 3; });
    bind('sim3dMaterial', 'change', (e) => {
      SIM3D.material = e.target.value || 'birch';
      const p = SIM3D.progress;
      buildSim3DScene();
      updateSim3DToProgress(p);
    });
    bind('sim3dRapids', 'change', (e) => {
      SIM3D.showRapids = e.target.checked;
      if (SIM3D.rapidLine) SIM3D.rapidLine.visible = SIM3D.showRapids;
    });
    bind('btnSim3dCamIso', 'click', () => setSim3DCamera('iso'));
    bind('btnSim3dCamTop', 'click', () => setSim3DCamera('top'));
    bind('btnSim3dCamClose', 'click', () => setSim3DCamera('close'));
    bind('btnSim3dRecord', 'click', recordSim3DVideo);

    // Text Tool
    bind('btnCloseTextTool', 'click', () => $('textToolModal')?.classList.remove('show'));
    ['cncTextInput', 'cncTextMode', 'cncTextBridges'].forEach(id => bind(id, 'input', updateTextToolPreview));
    bind('cncTextMode', 'change', (e) => {
      const bw = $('cncTextBridgesWrap');
      if (bw) bw.style.display = e.target.value === 'stencil' ? 'flex' : 'none';
      updateTextToolPreview();
    });
    bind('btnApplyTextTool', 'click', applyTextToolToWorkspace);

    // Test Card
    bind('btnCloseTestCard', 'click', () => $('testCardModal')?.classList.remove('show'));
    ['tcGridSize', 'tcMinPower', 'tcMaxPower', 'tcMinSpeed', 'tcMaxSpeed', 'tcSquareMm', 'tcMode'].forEach(id => {
      bind(id, 'input', renderTestCardPreview);
      bind(id, 'change', renderTestCardPreview);
    });
    bind('btnDownloadTestGcode', 'click', () => downloadTestCard('gcode'));
    bind('btnDownloadTestSvg', 'click', () => downloadTestCard('svg'));

    // Auto-Nesting
    bind('btnCloseNesting', 'click', () => $('nestingModal')?.classList.remove('show'));
    ['nestSheetW', 'nestSheetH', 'nestCopies', 'nestSpacing', 'nestRotate90'].forEach(id => {
      bind(id, 'input', renderNestingPreview);
      bind(id, 'change', renderNestingPreview);
    });
    document.querySelectorAll('.nest-preset-btn').forEach(b => {
      b.addEventListener('click', () => {
        if ($('nestSheetW')) $('nestSheetW').value = b.dataset.w;
        if ($('nestSheetH')) $('nestSheetH').value = b.dataset.h;
        renderNestingPreview();
      });
    });
    bind('btnApplyNesting', 'click', applyNestingToWorkspace);

    // Preflight Inspector
    bind('btnClosePreflight', 'click', () => $('preflightModal')?.classList.remove('show'));
    bind('btnPfRemoveDups', 'click', () => {
      if (global.App && global.App.runPreflightFix) { global.App.runPreflightFix('duplicates'); refreshPreflightReport(); }
    });
    bind('btnPfCloseOpen', 'click', () => {
      if (global.App && global.App.runPreflightFix) { global.App.runPreflightFix('open'); refreshPreflightReport(); }
    });
    bind('btnPfFitBed', 'click', () => {
      if (global.App && global.App.runPreflightFix) { global.App.runPreflightFix('fitbed'); refreshPreflightReport(); }
    });

    // G-Code Inspector
    bind('btnCloseGcode', 'click', () => $('gcodeModal')?.classList.remove('show'));
    bind('btnCopyGcode', 'click', () => {
      const data = global.App && global.App.getToolpathData ? global.App.getToolpathData() : null;
      if (!data) return;
      navigator.clipboard?.writeText(data.gcode).then(() => {
        global.App.toast(isFr() ? '📋 G-Code copié !' : '📋 G-Code copied to clipboard!', 'success');
      }).catch(() => {});
    });
    bind('btnDownloadGcodeFromModal', 'click', () => {
      $('gcodeModal')?.classList.remove('show');
      global.App && global.App.exportGcodeDirect && global.App.exportGcodeDirect();
    });

    // Workshop Cost Calculator
    bind('btnCloseCost', 'click', () => $('costModal')?.classList.remove('show'));
    ['costSheetPrice', 'costSheetW', 'costSheetH', 'costWastePct', 'costMachineRate', 'costPackaging', 'costEtsyFee', 'costMarkup'].forEach(id => {
      bind(id, 'input', recalcWorkshopCost);
    });
    bind('btnExportJobSheet', 'click', exportJobSetupSheet);
  }

  document.addEventListener('DOMContentLoaded', initProSuite);

  global.CNCProSuite = {
    openSim3DModal,
    closeSim3DModal,
    openTextToolModal,
    openTestCardModal,
    openNestingModal,
    openPreflightModal,
    openGCodeInspector,
    openCostModal,
    closeAllProModals: () => {
      closeSim3DModal();
      ['textToolModal', 'testCardModal', 'nestingModal', 'preflightModal', 'gcodeModal', 'costModal'].forEach(id => {
        $(id)?.classList.remove('show');
      });
    }
  };
})(window);
