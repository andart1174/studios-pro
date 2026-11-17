// ═══════════════════════════════════════════════════════
//  CNC VECTOR STUDIO — Main Application JavaScript
// ═══════════════════════════════════════════════════════

const App = (() => {
  // ── State ──────────────────────────────────────────────
  const state = {
    originalImage: null,
    originalCanvas: null,
    vectorPaths: [],
    vectorDims: { w: 0, h: 0 },
    svgOutput: '',
    zoom: 1,
    settings: {
      brightness: 0, contrast: 0, blur: 0,
      threshold: 128, invert: false, grayscale: true, adaptive: false,
      mode: 'edge',          // edge | contour | centerline | halftone | color
      detail: 1.5,
      smoothing: 2,
      minArea: 20,
      maxArea: 999999,
      colorCount: 3,
      bezier: false,
      hatch: false,
      hatchSpacing: 2.0,
      // CNC
      cncType: 'laser',      // laser | router
      material: 'wood',
      laserPower: 80,
      speed: 1000,
      passes: 1,
      kerf: 0,
      cutDepth: 3.0,
      stepDown: 1.5,
      safeZ: 5.0,
      tabs: false,
      tsp: true,
      units: 'mm',
      machine: 'generic',
      extrudeDepth: 6.0,
      extrudeBacking: false
    },
    exportSettings: {
      width: null, height: null, unit: 'px', lockAspect: true,
      brightness: 0, contrast: 0,
      transparent: false, watermark: false, bmp8bit: false,
      dpi: 300, jpegQuality: 0.9
    },
    stats: { paths: 0, nodes: 0, width: 0, height: 0, area: 0 },
    processing: false,
    eraserMode: false,
  };

  // ── DOM refs ───────────────────────────────────────────
  const $ = id => document.getElementById(id);

  // ── Init ───────────────────────────────────────────────
  function init() {
    setupUpload();
    setupTabs();
    setupControls();
    setupMaterials();
    setupMachinePresets();
    setupExportControls();
    setupExports();
    setupZoom();
    setupEraser();
  }

  // ── Upload & SVG Import & Demo Presets ─────────────────
  function setupUpload() {
    const zone = $('uploadZone');
    const input = $('fileInput');
    zone.addEventListener('click', (e) => {
      if (e.target && e.target.closest && e.target.closest('.btn-upload')) return;
      input.click();
    });
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault(); zone.classList.remove('drag-over');
      const f = e.dataTransfer.files[0];
      if (f) loadFile(f);
    });
    input.addEventListener('change', () => { if (input.files[0]) loadFile(input.files[0]); });

    document.querySelectorAll('.demo-chip[data-demo]').forEach(btn => {
      btn.addEventListener('click', () => loadDemoPreset(btn.dataset.demo));
    });
  }

  function loadDemoPreset(key) {
    const cv = document.createElement('canvas');
    cv.width = 560; cv.height = 440;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cv.width, cv.height);

    if (key === 'gear') {
      const cx = 280, cy = 220, teeth = 16;
      const rOuter = 170, rRoot = 138;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      for (let i = 0; i < teeth * 4; i++) {
        const idx = Math.floor(i / 4);
        const sub = i % 4;
        const baseA = (idx / teeth) * Math.PI * 2;
        const step = (Math.PI * 2) / teeth;
        let a = baseA;
        let rad = rRoot;
        if (sub === 0) { a = baseA; rad = rRoot; }
        else if (sub === 1) { a = baseA + step * 0.14; rad = rOuter; }
        else if (sub === 2) { a = baseA + step * 0.42; rad = rOuter; }
        else { a = baseA + step * 0.56; rad = rRoot; }
        const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      // Center shaft bore + keyway
      ctx.moveTo(cx + 38, cy);
      ctx.arc(cx, cy, 38, 0, Math.PI * 2, true);
      // 6 weight-reduction bores
      for (let k = 0; k < 6; k++) {
        const ang = (k / 6) * Math.PI * 2;
        const hx = cx + Math.cos(ang) * 88;
        const hy = cy + Math.sin(ang) * 88;
        ctx.moveTo(hx + 20, hy);
        ctx.arc(hx, hy, 20, 0, Math.PI * 2, true);
      }
      ctx.fill('evenodd');
    } else if (key === 'emblem') {
      // Multi-color precision emblem great for Color Trace & AR
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.moveTo(150, 70); ctx.lineTo(410, 70); ctx.lineTo(410, 225);
      ctx.quadraticCurveTo(410, 330, 280, 395);
      ctx.quadraticCurveTo(150, 330, 150, 225);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#0ea5e9';
      ctx.beginPath();
      ctx.moveTo(185, 105); ctx.lineTo(375, 105); ctx.lineTo(375, 215);
      ctx.quadraticCurveTo(375, 295, 280, 350);
      ctx.quadraticCurveTo(185, 295, 185, 215);
      ctx.closePath(); ctx.fill();

      // Inner star / CNC reticle
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        const r = i % 2 === 0 ? 78 : 34;
        const x = 280 + Math.cos(a) * r, y = 215 + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(280, 215, 18, 0, Math.PI * 2); ctx.fill();
    } else {
      // Precision CAD L-Bracket with fillets, mounting holes & slot
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.moveTo(85, 65); ctx.lineTo(465, 65); ctx.quadraticCurveTo(495, 65, 495, 95);
      ctx.lineTo(495, 185); ctx.quadraticCurveTo(495, 215, 465, 215);
      ctx.lineTo(255, 215); ctx.quadraticCurveTo(225, 215, 225, 245);
      ctx.lineTo(225, 345); ctx.quadraticCurveTo(225, 375, 195, 375);
      ctx.lineTo(85, 375); ctx.quadraticCurveTo(55, 375, 55, 345);
      ctx.lineTo(55, 95); ctx.quadraticCurveTo(55, 65, 85, 65);
      ctx.closePath();
      // Mounting bores
      [[115, 125, 22], [115, 315, 22], [435, 140, 22]].forEach(([hx, hy, hr]) => {
        ctx.moveTo(hx + hr, hy);
        ctx.arc(hx, hy, hr, 0, Math.PI * 2, true);
      });
      // Precision slot
      ctx.moveTo(260, 122); ctx.lineTo(360, 122);
      ctx.arc(360, 140, 18, -Math.PI / 2, Math.PI / 2, false);
      ctx.lineTo(260, 158);
      ctx.arc(260, 140, 18, Math.PI / 2, -Math.PI / 2, false);
      ctx.closePath();
      ctx.fill('evenodd');
    }

    const dataURL = cv.toDataURL('image/png');
    const img = new Image();
    img.onload = () => {
      if (key === 'emblem') {
        state.settings.mode = 'color';
        document.querySelectorAll('.mode-chip[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === 'color'));
        if ($('colorOptions')) $('colorOptions').style.display = 'block';
        state.settings.colorCount = 4;
        if ($('colorCount')) $('colorCount').value = '4';
        if ($('colorCountVal')) $('colorCountVal').textContent = '4';
      } else {
        state.settings.mode = 'contour';
        document.querySelectorAll('.mode-chip[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === 'contour'));
        if ($('colorOptions')) $('colorOptions').style.display = 'none';
      }
      state.originalImage = img;
      state.stats.width = img.naturalWidth;
      state.stats.height = img.naturalHeight;
      drawOriginal(img);
      $('fileName').textContent = 'demo-' + key + '.png';
      $('fileSize').textContent = Math.round(dataURL.length * 0.75 / 1024) + ' KB';
      $('fileDims').textContent = img.naturalWidth + ' × ' + img.naturalHeight;
      if ($('fileInfo')) $('fileInfo').style.display = 'block';
      $('btnVectorize').disabled = false;
      $('btnClear').disabled = false;
      enableImageExports(true);
      vectorize();
    };
    img.src = dataURL;
  }

  function loadFile(file) {
    const isSvg = file.name.toLowerCase().endsWith('.svg') || file.type === 'image/svg+xml';
    if (!isSvg && !file.type.startsWith('image/')) { toast(t('invalidFile'), 'error'); return; }

    if (isSvg && window.VectorEngine) {
      const txtReader = new FileReader();
      txtReader.onload = ev => {
        const svgText = ev.target.result;
        const parsed = window.VectorEngine.parseSVG(svgText);
        const img = new Image();
        img.onload = () => {
          state.originalImage = img;
          state.stats.width = img.naturalWidth || parsed.w;
          state.stats.height = img.naturalHeight || parsed.h;
          drawOriginal(img);
          $('fileName').textContent = file.name;
          $('fileSize').textContent = (file.size / 1024).toFixed(1) + ' KB';
          $('fileDims').textContent = state.stats.width + ' × ' + state.stats.height;
          if ($('fileInfo')) $('fileInfo').style.display = 'block';
          $('btnVectorize').disabled = false;
          $('btnClear').disabled = false;
          enableImageExports(true);

          if (parsed.paths && parsed.paths.length > 0) {
            const cw = state.originalCanvas.width, ch = state.originalCanvas.height;
            const sx = cw / Math.max(1, parsed.w);
            const sy = ch / Math.max(1, parsed.h);
            const scaled = parsed.paths.map(p => {
              const np = p.map(pt => [pt[0] * sx, pt[1] * sy]);
              np.closed = p.closed;
              return np;
            });
            state.vectorPaths = scaled;
            state.vectorDims = { w: cw, h: ch };
            state.stats.paths = scaled.length;
            state.stats.nodes = scaled.reduce((s, p) => s + p.length, 0);
            state.svgOutput = buildSVG(scaled, cw, ch);
            drawVectorPreview(scaled, cw, ch);
            updateStats();
            updateLayers(scaled);
            enableExports(true);
            setTab('vector');
            toast('✅ SVG Direct Import: ' + scaled.length + ' paths loaded!', 'success');
          } else {
            clearVector();
            vectorize();
          }
        };
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText);
      };
      txtReader.readAsText(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        state.originalImage = img;
        state.stats.width = img.naturalWidth;
        state.stats.height = img.naturalHeight;
        drawOriginal(img);
        updateStats();
        setTab('adjust');
        toast('✅ ' + t('imageLoaded') + ' ' + img.naturalWidth + '×' + img.naturalHeight + 'px', 'success');
        $('fileName').textContent = file.name;
        $('fileSize').textContent = (file.size / 1024).toFixed(1) + ' KB';
        $('fileDims').textContent = img.naturalWidth + ' × ' + img.naturalHeight;
        if ($('fileInfo')) $('fileInfo').style.display = 'block';
        $('btnVectorize').disabled = false;
        $('btnClear').disabled = false;
        clearVector();
        enableImageExports(true);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function drawOriginal(img) {
    const cv = $('canvasOrig');
    const ctx = cv.getContext('2d');
    const MAX = 900;
    let w = img.naturalWidth, h = img.naturalHeight;
    if (w > MAX || h > MAX) { const r = Math.min(MAX / w, MAX / h); w = Math.round(w * r); h = Math.round(h * r); }
    cv.width = w; cv.height = h;
    ctx.drawImage(img, 0, 0, w, h);
    applyFilters(cv, ctx);
    $('uploadPlaceholder').style.display = 'none';
    $('canvasOrig').style.display = 'block';
    state.originalCanvas = cv;
  }

  function applyFilters(cv, ctx) {
    if (!state.originalImage) return;
    const w = cv.width, h = cv.height;
    ctx.filter = `brightness(${1 + state.settings.brightness / 100}) contrast(${1 + state.settings.contrast / 100})`;
    ctx.drawImage(state.originalImage, 0, 0, w, h);
    ctx.filter = 'none';
    if (state.settings.mode !== 'color' && state.settings.grayscale) {
      toGrayscale(ctx, w, h);
    }
    if (state.settings.blur > 0) applyBlur(ctx, w, h, state.settings.blur);
    if (state.settings.invert) invertCanvas(ctx, w, h);
  }

  function toGrayscale(ctx, w, h) {
    const d = ctx.getImageData(0, 0, w, h);
    const px = d.data;
    for (let i = 0; i < px.length; i += 4) {
      const g = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      px[i] = px[i + 1] = px[i + 2] = g;
    }
    ctx.putImageData(d, 0, 0);
  }

  function invertCanvas(ctx, w, h) {
    const d = ctx.getImageData(0, 0, w, h); const px = d.data;
    for (let i = 0; i < px.length; i += 4) { px[i] = 255 - px[i]; px[i + 1] = 255 - px[i + 1]; px[i + 2] = 255 - px[i + 2]; }
    ctx.putImageData(d, 0, 0);
  }

  function applyBlur(ctx, w, h, r) {
    const rad = Math.max(1, Math.min(8, Math.round(r)));
    const d = ctx.getImageData(0, 0, w, h);
    const px = d.data;
    const n = w * h;
    if (window.VectorEngine) {
      const ch = new Float32Array(n);
      for (let c = 0; c < 3; c++) {
        for (let i = 0; i < n; i++) ch[i] = px[i * 4 + c];
        const blurred = window.VectorEngine.separableBlur(ch, w, h, rad);
        for (let i = 0; i < n; i++) px[i * 4 + c] = blurred[i];
      }
      ctx.putImageData(d, 0, 0);
    }
  }

  // ── Tabs ───────────────────────────────────────────────
  function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => setTab(btn.dataset.tab));
    });
  }

  function setTab(id) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + id));
  }

  // ── Controls ───────────────────────────────────────────
  function setupControls() {
    const sliders = [
      ['brightness', 'brightnessVal', 0], ['contrast', 'contrastVal', 0],
      ['blur', 'blurVal', 0], ['threshold', 'thresholdVal', 128],
      ['detail', 'detailVal', 1.5], ['smoothing', 'smoothingVal', 2],
      ['minArea', 'minAreaVal', 20], ['colorCount', 'colorCountVal', 3],
      ['laserPower', 'laserPowerVal', 80], ['speed', 'speedVal', 1000],
      ['passes', 'passesVal', 1], ['kerf', 'kerfVal', 0],
      ['hatchSpacing', 'hatchSpacingVal', 2.0],
      ['cutDepth', 'cutDepthVal', 3.0], ['stepDown', 'stepDownVal', 1.5],
      ['safeZ', 'safeZVal', 5.0], ['extrudeDepth', 'extrudeDepthVal', 6.0]
    ];
    sliders.forEach(([sid, vid]) => {
      const sl = $(sid), vl = $(vid);
      if (!sl || !vl) return;
      vl.textContent = sl.value;
      sl.addEventListener('input', () => {
        vl.textContent = sl.value;
        state.settings[sid] = parseFloat(sl.value);
        if (['brightness', 'contrast', 'blur', 'invert', 'grayscale'].includes(sid)) {
          refreshOriginal();
        }
      });
    });

    // Auto Otsu Threshold button
    if ($('btnAutoOtsu')) {
      $('btnAutoOtsu').addEventListener('click', () => {
        const cv = state.originalCanvas || $('canvasOrig');
        if (!cv || !cv.width || !state.originalImage) { toast(t('noImage'), 'error'); return; }
        const imgData = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height);
        const lum = window.VectorEngine
          ? window.VectorEngine.luminanceField(imgData)
          : new Float32Array(cv.width * cv.height);
        const otsu = window.VectorEngine ? window.VectorEngine.computeOtsuThreshold(lum) : 128;
        state.settings.threshold = otsu;
        if ($('threshold')) $('threshold').value = otsu;
        if ($('thresholdVal')) $('thresholdVal').textContent = otsu;
        refreshOriginal();
        toast('🪄 Auto Otsu Threshold: ' + otsu, 'success');
      });
    }

    // toggles
    ['invertToggle', 'grayscaleToggle', 'adaptiveToggle', 'bezierToggle', 'hatchToggle', 'tabsToggle', 'tspToggle'].forEach(id => {
      const el = $(id);
      if (el) el.addEventListener('change', () => {
        state.settings[id.replace('Toggle', '')] = el.checked;

        if (id === 'hatchToggle') {
          if ($('hatchOptions')) $('hatchOptions').style.display = el.checked ? 'flex' : 'none';
          if (state.vectorPaths.length) vectorize();
        } else if (id === 'bezierToggle' && state.vectorPaths.length) {
          const vw = state.vectorDims.w || (state.originalCanvas ? state.originalCanvas.width : 500);
          const vh = state.vectorDims.h || (state.originalCanvas ? state.originalCanvas.height : 500);
          drawVectorPreview(state.vectorPaths, vw, vh);
          state.svgOutput = buildSVG(state.vectorPaths, vw, vh);
        } else if (id === 'invertToggle' || id === 'grayscaleToggle') {
          refreshOriginal();
        } else if (id === 'adaptiveToggle' && state.vectorPaths.length) {
          vectorize();
        }
      });
    });

    if ($('extrudeBacking')) {
      $('extrudeBacking').addEventListener('change', (e) => {
        state.settings.extrudeBacking = e.target.checked;
      });
    }

    // CNC tool type chips (Laser vs CNC Router)
    document.querySelectorAll('.mode-chip[data-cnc-type]').forEach(c => {
      c.addEventListener('click', () => {
        document.querySelectorAll('.mode-chip[data-cnc-type]').forEach(b => b.classList.remove('active'));
        c.classList.add('active');
        state.settings.cncType = c.dataset.cncType;
        if ($('routerOptions')) $('routerOptions').style.display = c.dataset.cncType === 'router' ? 'block' : 'none';
      });
    });

    // Vectorization mode chips (strictly data-mode so CNC chips don't clash!)
    document.querySelectorAll('.mode-chip[data-mode]').forEach(c => {
      c.addEventListener('click', () => {
        document.querySelectorAll('.mode-chip[data-mode]').forEach(b => b.classList.remove('active'));
        c.classList.add('active');
        state.settings.mode = c.dataset.mode;

        if ($('colorOptions')) {
          $('colorOptions').style.display = state.settings.mode === 'color' ? 'block' : 'none';
        }
        if (state.originalImage) refreshOriginal();
        if (state.vectorPaths.length) vectorize();
      });
    });

    // vectorize btn
    $('btnVectorize').addEventListener('click', vectorize);
    $('btnClear').addEventListener('click', () => {
      clearVector();
      state.originalImage = null;
      $('uploadPlaceholder').style.display = 'flex';
      $('canvasOrig').style.display = 'none';
      if ($('fileInfo')) $('fileInfo').style.display = 'none';
      $('btnVectorize').disabled = true;
      $('btnClear').disabled = true;
      enableImageExports(false);
    });
  }

  function refreshOriginal() {
    const cv = state.originalCanvas || $('canvasOrig');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    applyFilters(cv, ctx);
  }

  // ── Materials ──────────────────────────────────────────
  const MATERIAL_PRESETS = {
    wood: { laserPower: 80, speed: 800, passes: 2, kerf: 0.1 },
    acrylic: { laserPower: 70, speed: 600, passes: 1, kerf: 0.15 },
    metal: { laserPower: 100, speed: 300, passes: 3, kerf: 0.05 },
    leather: { laserPower: 50, speed: 1000, passes: 1, kerf: 0.05 },
    foam: { laserPower: 30, speed: 1500, passes: 1, kerf: 0.0 },
    paper: { laserPower: 20, speed: 2000, passes: 1, kerf: 0.0 },
  };

  function setupMaterials() {
    document.querySelectorAll('.material-card').forEach(c => {
      c.addEventListener('click', () => {
        document.querySelectorAll('.material-card').forEach(x => x.classList.remove('active'));
        c.classList.add('active');
        const mat = c.dataset.material;
        state.settings.material = mat;
        const p = MATERIAL_PRESETS[mat];
        if (p) {
          Object.assign(state.settings, p);
          ['laserPower', 'speed', 'passes', 'kerf'].forEach(k => {
            const sl = $(k); const vl = $(k + 'Val');
            if (sl) { sl.value = p[k]; }
            if (vl) { vl.textContent = p[k]; }
          });
        }
      });
    });
  }

  // ── Machine Presets (Feature 10) ────────────────────────
  const MACHINE_PRESETS = {
    generic: { dpi: 300, laserPower: 80, speed: 1000 },
    k40: { dpi: 300, laserPower: 50, speed: 600 },
    ortur: { dpi: 300, laserPower: 90, speed: 1200 },
    xtool: { dpi: 300, laserPower: 100, speed: 800 },
    sculpfun: { dpi: 300, laserPower: 85, speed: 1000 },
    lightburn: { dpi: 300, laserPower: 70, speed: 1500 }
  };

  function setupMachinePresets() {
    document.querySelectorAll('.machine-chip').forEach(c => {
      c.addEventListener('click', () => {
        document.querySelectorAll('.machine-chip').forEach(x => x.classList.remove('active'));
        c.classList.add('active');
        const m = c.dataset.machine;
        if (!m) return;
        state.settings.machine = m;
        const p = MACHINE_PRESETS[m];
        if (p) {
          if (p.laserPower) {
            state.settings.laserPower = p.laserPower;
            const lp = $('laserPower'), lpv = $('laserPowerVal');
            if (lp) lp.value = p.laserPower;
            if (lpv) lpv.textContent = p.laserPower;
          }
          if (p.speed) {
            state.settings.speed = p.speed;
            const sp = $('speed'), spv = $('speedVal');
            if (sp) sp.value = p.speed;
            if (spv) spv.textContent = p.speed;
          }
          if (p.dpi) {
            state.exportSettings.dpi = p.dpi;
            const ed = $('exportDPI');
            if (ed) ed.value = p.dpi;
          }
        }
        toast('🚀 Preset: ' + m.toUpperCase(), 'info');
      });
    });
  }

  // ── Export Setup & Logic ───────────────────────────────
  function setupExportControls() {
    // Resize controls (Feature 3)
    const updateSize = () => {
      const uw = $('exportWidth'), uh = $('exportHeight');
      if (uw) state.exportSettings.width = parseFloat(uw.value) || null;
      if (uh) state.exportSettings.height = parseFloat(uh.value) || null;
      updateStats();
    };
    const checkAdd = (id, evt, fn) => { const el = $(id); if (el) el.addEventListener(evt, fn); };

    checkAdd('exportWidth', 'input', updateSize);
    checkAdd('exportHeight', 'input', updateSize);
    checkAdd('exportSizeUnit', 'change', (e) => { state.exportSettings.unit = e.target.value; updateStats(); });
    checkAdd('exportUnits', 'change', (e) => { state.settings.units = e.target.value; });

    const bl = $('btnLockAspect');
    if (bl) {
      bl.addEventListener('click', () => {
        state.exportSettings.lockAspect = !state.exportSettings.lockAspect;
        bl.innerHTML = state.exportSettings.lockAspect ? '🔒' : '🔓';
        bl.style.color = state.exportSettings.lockAspect ? 'var(--accent)' : 'var(--muted)';
      });
    }

    // Adjustment controls (Feature 6)
    const adjSliders = [['expBrightness', 'expBrightnessVal'], ['expContrast', 'expContrastVal']];
    adjSliders.forEach(([sid, vid]) => {
      const sl = $(sid), vl = $(vid);
      if (sl && vl) {
        sl.addEventListener('input', () => {
          vl.textContent = sl.value;
          state.exportSettings[sid.replace('exp', '').toLowerCase()] = parseFloat(sl.value);
        });
      }
    });

    // Options (Feature 5, 8, 9)
    checkAdd('exportTransparent', 'change', (e) => state.exportSettings.transparent = e.target.checked);
    checkAdd('exportWatermark', 'change', (e) => state.exportSettings.watermark = e.target.checked);
    checkAdd('exportBMP8bit', 'change', (e) => state.exportSettings.bmp8bit = e.target.checked);
    checkAdd('exportDPI', 'change', (e) => { state.exportSettings.dpi = parseInt(e.target.value) || 300; updateStats(); });
    checkAdd('exportJpegQ', 'change', (e) => state.exportSettings.jpegQuality = parseFloat(e.target.value));

    // Modal buttons (Feature 4)
    checkAdd('btnClosePreview', 'click', () => { const m = $('exportPreviewModal'); if (m) m.classList.remove('show'); });
    checkAdd('btnCancelExport', 'click', () => { const m = $('exportPreviewModal'); if (m) m.classList.remove('show'); });

    // Preview buttons
    checkAdd('btnImgPreview', 'click', () => showExportPreview('image'));
    checkAdd('btnVecPreview', 'click', () => showExportPreview('vector'));

    // Batch buttons (Feature 7)
    checkAdd('btnImgBatchZip', 'click', () => runBatchExport('image'));
    checkAdd('btnVecBatchZip', 'click', () => runBatchExport('vector'));

    // Simulation button
    checkAdd('btnSimulate', 'click', () => runSimulation());
  }

  // ── Processing Logic for Export ────────────────────────
  async function showExportPreview(source) {
    const canvas = source === 'image' ? state.originalCanvas : $('canvasVec');
    if (!canvas) { toast(t('noImage'), 'error'); return; }

    showProcessing(true, t('exportPreview'));
    await sleep(50);

    const processed = await processExportCanvas(canvas);
    if (!processed) { showProcessing(false); return; }

    const previewCv = $('canvasExportPreview');
    previewCv.width = processed.width;
    previewCv.height = processed.height;
    const pCtx = previewCv.getContext('2d');
    pCtx.drawImage(processed, 0, 0);

    $('previewFormat').textContent = source.toUpperCase();
    $('previewSize').textContent = processed.width + ' × ' + processed.height + ' px';
    $('previewDPI').textContent = state.exportSettings.dpi;

    showProcessing(false);
    $('exportPreviewModal').classList.add('show');

    // Confirm button logic (scoped to this preview)
    $('btnConfirmExport').onclick = () => {
      $('exportPreviewModal').classList.remove('show');
      const format = source === 'image' ? 'png' : 'svg'; // Default illustrative
      savePNG(processed.toDataURL('image/png'), 'export_' + Date.now() + '.png');
    };
  }

  async function processExportCanvas(sourceCanvas) {
    const s = state.exportSettings;
    const origW = sourceCanvas.width;
    const origH = sourceCanvas.height;

    // 1. Determine Target Dimensions (Feature 3)
    let targetW = s.width, targetH = s.height;
    const unitScale = s.unit === 'mm' ? 3.7795 : (s.unit === 'inch' ? 96 : 1);

    if (targetW) targetW *= unitScale;
    if (targetH) targetH *= unitScale;

    if (!targetW && !targetH) {
      targetW = origW; targetH = origH;
    } else if (s.lockAspect) {
      if (targetW && !targetH) targetH = targetW * (origH / origW);
      else if (targetH && !targetW) targetW = targetH * (origW / origH);
    } else {
      if (!targetW) targetW = origW;
      if (!targetH) targetH = origH;
    }

    // 2. Create Export Canvas
    const outCv = document.createElement('canvas');
    outCv.width = Math.round(targetW);
    outCv.height = Math.round(targetH);
    const ctx = outCv.getContext('2d', { alpha: s.transparent });

    // 3. Background (Feature 5)
    if (!s.transparent) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, outCv.width, outCv.height);
    }

    // 4. Apply Adjustments (Feature 6)
    ctx.filter = `brightness(${1 + s.brightness / 100}) contrast(${1 + s.contrast / 100})`;

    // 5. Draw Source Content
    ctx.drawImage(sourceCanvas, 0, 0, origW, origH, 0, 0, outCv.width, outCv.height);
    ctx.filter = 'none';

    // 6. Dithering (Feature: Pro Ultra Quality)
    const ditherMode = $('exportDither') ? $('exportDither').value : 'none';
    if (ditherMode !== 'none') {
      applyDithering(ctx, outCv.width, outCv.height, ditherMode);
    }

    // 7. Watermark (Feature 8)
    if (s.watermark) {
      ctx.font = 'bold ' + Math.max(12, outCv.width / 40) + 'px sans-serif';
      ctx.fillStyle = 'rgba(128,128,128,0.5)';
      ctx.textAlign = 'right';
      ctx.fillText(s.dpi + ' DPI - CNC Vector Studio', outCv.width - 20, outCv.height - 20);
    }

    return outCv;
  }

  // ── Pro Feature: Hatch Fill (Scanline Polygon Fill) ──
  function generateHatchFill(paths, spacing) {
    if (!paths || paths.length === 0) return [];

    // 1. Find global bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of paths) {
      for (const pt of p) {
        if (pt[0] < minX) minX = pt[0]; if (pt[0] > maxX) maxX = pt[0];
        if (pt[1] < minY) minY = pt[1]; if (pt[1] > maxY) maxY = pt[1];
      }
    }

    // 2. Build edges array
    const edges = [];
    for (const p of paths) {
      if (p.length < 3) continue;
      for (let i = 0; i < p.length; i++) {
        const p1 = p[i];
        const p2 = p[(i + 1) % p.length];
        if (p1[1] !== p2[1]) { // ignore horizontal edges
          const yMin = Math.min(p1[1], p2[1]);
          const yMax = Math.max(p1[1], p2[1]);
          const xVal = p1[1] === yMin ? p1[0] : p2[0];
          const invSlope = (p2[0] - p1[0]) / (p2[1] - p1[1]);
          edges.push({ yMin, yMax, xVal, invSlope });
        }
      }
    }

    // 3. Scanline intersection
    const hatchPaths = [];
    let flip = false;

    for (let y = minY + spacing / 2; y <= maxY; y += spacing) {
      const activeNodes = [];
      for (const e of edges) {
        if (y >= e.yMin && y < e.yMax) {
          const xIntersect = e.xVal + (y - e.yMin) * e.invSlope;
          activeNodes.push(xIntersect);
        }
      }

      activeNodes.sort((a, b) => a - b);

      // Connect pairs of active nodes (winding rule even-odd)
      const currentLineSegments = [];
      for (let i = 0; i < activeNodes.length - 1; i += 2) {
        currentLineSegments.push([
          [activeNodes[i], y],
          [activeNodes[i + 1], y]
        ]);
      }

      if (flip) currentLineSegments.reverse().forEach(seg => seg.reverse());

      // Link them up as independent path strokes
      for (const seg of currentLineSegments) {
        hatchPaths.push(seg);
      }

      flip = !flip;
    }

    return hatchPaths;
  }

  // ── Pro Feature: Dithering ─────────────────────────────
  function applyDithering(ctx, w, h, mode) {
    const d = ctx.getImageData(0, 0, w, h);
    const px = d.data;

    // Ensure grayscale first for best dithering
    for (let i = 0; i < px.length; i += 4) {
      const g = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      px[i] = px[i + 1] = px[i + 2] = g;
    }

    // Modes: 'floyd' or 'atkinson'
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const oldPixel = px[i];
        const newPixel = oldPixel < 128 ? 0 : 255;
        px[i] = px[i + 1] = px[i + 2] = newPixel;

        const quantError = oldPixel - newPixel;

        if (mode === 'floyd') {
          if (x + 1 < w) addError(px, i + 4, quantError * 7 / 16);
          if (y + 1 < h) {
            if (x > 0) addError(px, i + w * 4 - 4, quantError * 3 / 16);
            addError(px, i + w * 4, quantError * 5 / 16);
            if (x + 1 < w) addError(px, i + w * 4 + 4, quantError * 1 / 16);
          }
        } else if (mode === 'atkinson') {
          const err = quantError / 8;
          if (x + 1 < w) addError(px, i + 4, err);
          if (x + 2 < w) addError(px, i + 8, err);
          if (y + 1 < h) {
            if (x > 0) addError(px, i + w * 4 - 4, err);
            addError(px, i + w * 4, err);
            if (x + 1 < w) addError(px, i + w * 4 + 4, err);
          }
          if (y + 2 < h) {
            addError(px, i + w * 8, err);
          }
        }
      }
    }

    // Ensure alpha is fully opaque
    for (let i = 3; i < px.length; i += 4) {
      px[i] = 255;
    }

    ctx.putImageData(d, 0, 0);
  }

  function addError(px, idx, err) {
    const v = px[idx] + err;
    px[idx] = px[idx + 1] = px[idx + 2] = v < 0 ? 0 : v > 255 ? 255 : v;
  }

  // ── Vectorize (Engine-backed: Subpixel + Zhang-Suen + KMeans + Sobel) ──
  async function vectorize() {
    if (!state.originalCanvas) { toast(t('noImage'), 'error'); return; }
    if (state.processing) return;
    state.processing = true;
    const btn = $('btnVectorize');
    if (btn) btn.disabled = true;
    showProcessing(true, t('processing'));
    updateProgress(15);
    await sleep(16);

    try {
      const VE = window.VectorEngine;
      if (!VE) throw new Error('VectorEngine module not loaded');

      const cv = state.originalCanvas;
      const ctx = cv.getContext('2d');
      const w = cv.width, h = cv.height;
      const imgData = ctx.getImageData(0, 0, w, h);
      const lum = VE.luminanceField(imgData);
      updateProgress(35);

      const mode = state.settings.mode;
      const thr = state.settings.threshold;
      const useAdaptive = !!state.settings.adaptive;
      let paths = [];

      if (mode === 'halftone') {
        const cellSize = Math.max(5, Math.round(18 - state.settings.detail * 2));
        paths = VE.halftoneField(lum, w, h, cellSize, true);
      } else if (mode === 'centerline') {
        const rawBin = VE.thresholdBinary(lum, w, h, thr, useAdaptive);
        const cleanBin = VE.despeckleBinary(rawBin, w, h);
        const thinned = VE.zhangSuenThinning(cleanBin, w, h);
        paths = VE.extractSkeletonPaths(thinned, w, h);
      } else if (mode === 'color') {
        const q = VE.kMeansQuantize(imgData, Math.max(2, Math.min(16, Math.round(state.settings.colorCount || 3))));
        paths = VE.extractColorLayers(q, w, h, true);
      } else if (mode === 'edge') {
        const smoothedLum = VE.separableBlur(lum, w, h, 1);
        const gradField = VE.sobelField(smoothedLum, w, h);
        // Stronger contrast threshold yields crisp gradient boundaries around features
        const edgeIso = Math.max(35, Math.min(242, Math.round(252 - thr * 0.72)));
        paths = VE.subpixelContours(gradField, w, h, edgeIso, true);
      } else {
        // 'contour': high-precision sub-pixel interpolated solid boundaries
        if (useAdaptive) {
          const bin = VE.despeckleBinary(VE.thresholdBinary(lum, w, h, thr, true), w, h);
          const f = new Float32Array(w * h);
          for (let i = 0; i < f.length; i++) f[i] = bin[i] ? 0 : 255;
          const sf = VE.separableBlur(f, w, h, 1);
          paths = VE.subpixelContours(sf, w, h, 127.5, false);
        } else {
          const preSmooth = state.settings.smoothing > 2 ? VE.separableBlur(lum, w, h, 1) : lum;
          paths = VE.subpixelContours(preSmooth, w, h, thr, true);
        }
      }

      updateProgress(70);

      // Simplify via RDP while preserving .closed flag
      const tol = Math.max(0.15, state.settings.detail);
      const simplifyList = (arr) => arr.map(p => rdpSimplify(p, tol)).filter(p => p.length >= 2);
      const filterAreaList = (arr) => arr.filter(p => {
        if (p.closed === false) return p.length >= 2;
        const a = pathArea(p);
        return a >= state.settings.minArea && a <= state.settings.maxArea;
      });

      if (mode === 'color') {
        paths = paths.map(layer => {
          let res = filterAreaList(simplifyList(layer));
          res.colorData = layer.colorData;
          res.colorName = layer.colorName;
          return res;
        }).filter(l => l.length > 0);
      } else {
        paths = simplifyList(paths);
        if (mode !== 'centerline') {
          paths = filterAreaList(paths);
        }
      }

      // Optional Interior Hatch Fill (for closed contours)
      if (state.settings.hatch && mode !== 'centerline' && mode !== 'halftone') {
        const spacing = Math.max(0.5, state.settings.hatchSpacing || 2.0);
        if (mode === 'color') {
          paths = paths.map(layer => {
            const closedOnly = layer.filter(p => p.closed !== false);
            const hatchPaths = generateHatchFill(closedOnly, spacing).map(hp => { hp.closed = false; return hp; });
            const combined = layer.concat(hatchPaths);
            combined.colorData = layer.colorData;
            combined.colorName = layer.colorName;
            return combined;
          });
        } else {
          const closedOnly = paths.filter(p => p.closed !== false);
          const hatchPaths = generateHatchFill(closedOnly, spacing).map(hp => { hp.closed = false; return hp; });
          paths = paths.concat(hatchPaths);
        }
      }

      updateProgress(90);

      state.vectorPaths = paths;
      state.vectorDims = { w, h };

      const flatPaths = mode === 'color' ? paths.flat() : paths;
      state.stats.paths = flatPaths.length;
      state.stats.nodes = flatPaths.reduce((s, p) => s + p.length, 0);
      state.stats.area = Math.round(w * h * 0.0001) / 10;

      state.svgOutput = buildSVG(paths, w, h);
      drawVectorPreview(paths, w, h);
      updateStats();
      updateLayers(paths);

      updateProgress(100);
      showProcessing(false);
      toast('✅ ' + flatPaths.length + ' ' + t('pathsVectorized'), 'success');
      enableExports(true);
      if ($('btnVecPreview')) $('btnVecPreview').disabled = false;
      if ($('btnVecBatchZip')) $('btnVecBatchZip').disabled = false;
      setTab('vector');

    } catch (err) {
      console.error(err);
      showProcessing(false);
      toast(t('vectorError') + ': ' + err.message, 'error');
    }

    state.processing = false;
    if (btn) btn.disabled = false;
  }

  function threshold(imgData, thr) {
    const px = imgData.data, w = imgData.width, h = imgData.height;
    const bin = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const g = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
      bin[i] = g < thr ? 1 : 0;
    }
    return bin;
  }

  // ════════════════════════════════════════════════════════
  // PROPER MARCHING SQUARES — produces clean closed contours
  // ════════════════════════════════════════════════════════
  // Pad the binary image with a 1-pixel white border so that
  // all contours are properly closed and no boundary artifact
  // (giant black wedge) is produced when dark pixels touch the edge.
  function msContours(bin, w, h) {
    const pw = w + 2, ph = h + 2;
    const padded = new Uint8Array(pw * ph); // all zeros = white border
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        padded[(y + 1) * pw + (x + 1)] = bin[y * w + x];
    // Run marching squares on the padded image
    const rawPaths = _msTrace(padded, pw, ph);
    // Offset every point back by -1 to align with original image,
    // and filter out any huge contour that spans nearly the full image
    const maxDim = Math.max(w, h);
    return rawPaths
      .map(path => path.map(([px, py]) => [px - 1, py - 1]))
      .filter(path => {
        // The border-artifact contour has points that land at ~x= -0.5 or x= w+0.5
        // (from the 1-px padding). Filter those out; keep all real image paths.
        return path.every(([px, py]) => px > -0.6 && py > -0.6 && px < w + 0.6 && py < h + 0.6);
      });
  }

  function _msTrace(bin, w, h) {
    // Each cell uses 4 corners: TL=bit3 TR=bit2 BR=bit1 BL=bit0
    // For each of 16 cases we define which edge pairs are connected.
    // Edges: 0=top(midpoint), 1=right, 2=bottom, 3=left
    const TABLE = [
      [],          // 0  0000
      [[3, 2]],     // 1  0001
      [[2, 1]],     // 2  0010
      [[3, 1]],     // 3  0011
      [[0, 1]],     // 4  0100
      [[0, 3], [1, 2]],// 5  saddle
      [[0, 2]],     // 6  0110
      [[0, 3]],     // 7  0111
      [[0, 3]],     // 8  1000
      [[0, 2]],     // 9  1001
      [[0, 1], [2, 3]],//10  saddle
      [[0, 1]],     // 11 1011
      [[3, 1]],     // 12 1100
      [[2, 1]],     // 13 1101
      [[3, 2]],     // 14 1110
      [],          // 15 1111
    ];

    function get(x, y) { return (x < 0 || x >= w || y < 0 || y >= h) ? 0 : bin[y * w + x]; }
    function cellCode(x, y) {
      return (get(x, y) << 3) | (get(x + 1, y) << 2) | (get(x + 1, y + 1) << 1) | get(x, y + 1);
    }
    // Edge midpoint as string key
    function ep(x, y, e) {
      switch (e) {
        case 0: return (x + 0.5) + ',' + (y);
        case 1: return (x + 1) + ',' + (y + 0.5);
        case 2: return (x + 0.5) + ',' + (y + 1);
        case 3: return (x) + ',' + (y + 0.5);
      }
    }
    function epXY(key) { const p = key.split(','); return [parseFloat(p[0]), parseFloat(p[1])]; }

    // Build adjacency graph of segment endpoints
    const adj = new Map();
    function addEdge(a, b) {
      if (!adj.has(a)) adj.set(a, []);
      if (!adj.has(b)) adj.set(b, []);
      adj.get(a).push(b);
      adj.get(b).push(a);
    }

    for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) {
      const segs = TABLE[cellCode(x, y)];
      for (const [e1, e2] of segs) addEdge(ep(x, y, e1), ep(x, y, e2));
    }

    // Walk graph to extract closed paths
    const visited = new Set();
    const paths = [];
    for (const [start] of adj) {
      if (visited.has(start)) continue;
      const chain = [epXY(start)];
      visited.add(start);
      let prev = start, cur = start;
      const neighbors = adj.get(cur) || [];
      if (!neighbors.length) continue;
      let next = neighbors[0];
      while (next && !visited.has(next)) {
        chain.push(epXY(next));
        visited.add(next);
        const nn = adj.get(next) || [];
        const candidate = nn.find(k => k !== prev && !visited.has(k));
        prev = next;
        next = candidate || null;
      }
      if (chain.length >= 3) paths.push(chain);
    }
    return paths;
  }

  // Halftone pattern
  function halftone(imgData, w, h) {
    const paths = [];
    const cellSize = Math.max(4, Math.floor(16 - state.settings.detail * 2));
    for (let cy = 0; cy < h; cy += cellSize) {
      for (let cx = 0; cx < w; cx += cellSize) {
        let sum = 0, cnt = 0;
        for (let dy = 0; dy < cellSize && cy + dy < h; dy++) for (let dx = 0; dx < cellSize && cx + dx < w; dx++) {
          const i = ((cy + dy) * w + (cx + dx)) * 4;
          sum += 0.299 * imgData.data[i] + 0.587 * imgData.data[i + 1] + 0.114 * imgData.data[i + 2];
          cnt++;
        }
        const brightness = sum / cnt / 255;
        const r = (1 - brightness) * cellSize * 0.5;
        if (r > 0.5) {
          const pts = [];
          const steps = Math.max(6, Math.floor(r * 3));
          for (let i = 0; i <= steps; i++) {
            const a = (i / steps) * Math.PI * 2;
            pts.push([cx + cellSize / 2 + Math.cos(a) * r, cy + cellSize / 2 + Math.sin(a) * r]);
          }
          paths.push(pts);
        }
      }
    }
    return paths;
  }

  // Ramer–Douglas–Peucker simplification (closed-loop safe + preserves .closed)
  function _rdpCore(pts, epsilon) {
    if (pts.length <= 2) return pts;
    let maxDist = 0, maxIdx = 0;
    const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
    for (let i = 1; i < pts.length - 1; i++) {
      const [px, py] = pts[i];
      const dist = len < 1e-9 ? Math.hypot(px - ax, py - ay) : Math.abs(dy * (px - ax) - dx * (py - ay)) / len;
      if (dist > maxDist) { maxDist = dist; maxIdx = i; }
    }
    if (maxDist > epsilon) {
      const left = _rdpCore(pts.slice(0, maxIdx + 1), epsilon);
      const right = _rdpCore(pts.slice(maxIdx), epsilon);
      return [...left.slice(0, -1), ...right];
    }
    return [pts[0], pts[pts.length - 1]];
  }

  function rdpSimplify(pts, epsilon) {
    const isClosed = pts.closed !== undefined
      ? pts.closed
      : (pts.length > 2 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 1.5);
    let out;
    if (isClosed && pts.length >= 4) {
      const mid = Math.floor(pts.length / 2);
      const a = _rdpCore(pts.slice(0, mid + 1), epsilon);
      const b = _rdpCore(pts.slice(mid).concat([pts[0]]), epsilon);
      out = a.slice(0, -1).concat(b.slice(0, -1));
      if (out.length < 3) out = pts.slice(0, 3);
    } else {
      out = _rdpCore(pts, epsilon);
    }
    out.closed = isClosed;
    return out;
  }

  function pathArea(pts) {
    let a = 0;
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
      a += x1 * y2 - x2 * y1;
    }
    return Math.abs(a) / 2;
  }

  function clonePath(p, dx = 0, dy = 0) {
    const out = p.map(pt => [pt[0] + dx, pt[1] + dy]);
    out.closed = p.closed;
    return out;
  }

  // Physical mm dimensions unified across Stats, SVG, DXF, G-code, PDF, STL, AR
  function getPhysicalDimensionsMm(srcW, srcH) {
    const wIn = Math.max(1, srcW || 1);
    const hIn = Math.max(1, srcH || 1);
    const s = state.exportSettings;
    const dpi = s.dpi || 300;
    const unitToMm = (val, u) => u === 'mm' ? val : (u === 'inch' ? val * 25.4 : val * (25.4 / dpi));

    let mmW = s.width ? unitToMm(s.width, s.unit) : null;
    let mmH = s.height ? unitToMm(s.height, s.unit) : null;

    if (!mmW && !mmH) {
      // Standard laser/CAD baseline: 96 CSS px -> 25.4mm unless high DPI explicit
      const baseDpi = s.dpi || 96;
      mmW = wIn * (25.4 / baseDpi);
      mmH = hIn * (25.4 / baseDpi);
    } else if (s.lockAspect) {
      if (mmW && !mmH) mmH = mmW * (hIn / wIn);
      else if (mmH && !mmW) mmW = mmH * (wIn / hIn);
    } else {
      const fallbackScale = 25.4 / (s.dpi || 96);
      if (!mmW) mmW = wIn * fallbackScale;
      if (!mmH) mmH = hIn * fallbackScale;
    }
    return { physW: Math.max(1, mmW), physH: Math.max(1, mmH) };
  }

  function generateGridArray(basePaths, baseW, baseH, cols, rows, spaceMmX, spaceMmY, isColorMode) {
    if (cols <= 1 && rows <= 1) return { paths: basePaths, w: baseW, h: baseH };

    const { physW } = getPhysicalDimensionsMm(baseW, baseH);
    const pxPerMm = baseW / physW;
    const spacePxX = spaceMmX * pxPerMm;
    const spacePxY = spaceMmY * pxPerMm;

    const outPaths = [];
    const totalW = (baseW * cols) + (spacePxX * (cols - 1));
    const totalH = (baseH * rows) + (spacePxY * (rows - 1));

    if (isColorMode) {
      for (let l = 0; l < basePaths.length; l++) {
        const newLayer = [];
        newLayer.colorData = basePaths[l].colorData;
        newLayer.colorName = basePaths[l].colorName;
        outPaths.push(newLayer);
      }
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const offsetX = c * (baseW + spacePxX);
          const offsetY = r * (baseH + spacePxY);
          for (let l = 0; l < basePaths.length; l++) {
            for (const p of basePaths[l]) outPaths[l].push(clonePath(p, offsetX, offsetY));
          }
        }
      }
    } else {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const offsetX = c * (baseW + spacePxX);
          const offsetY = r * (baseH + spacePxY);
          for (const p of basePaths) outPaths.push(clonePath(p, offsetX, offsetY));
        }
      }
    }
    return { paths: outPaths, w: totalW, h: totalH };
  }

  // ── SVG Builder (Physical mm dims + Corner-preserving Cubics + Color layers) ──
  function buildSVG(paths, w, h, options = {}) {
    const isCenterline = state.settings.mode === 'centerline';
    const {
      title = 'CNC Vector Output',
      strokeColor = isCenterline ? '#000000' : 'none',
      strokeWidth = isCenterline ? 1 : 0,
      fillColor = isCenterline ? 'none' : '#000000',
      bg = 'none'
    } = options;
    const smooth = !!state.settings.bezier;
    const { physW, physH } = getPhysicalDimensionsMm(w, h);
    const VE = window.VectorEngine;

    const buildPathStr = (pathArray) => {
      if (VE && VE.pathToSvgD) return VE.pathToSvgD(pathArray, smooth, 1, 1);
      return '';
    };

    let contentStr = '';
    if (state.settings.mode === 'color') {
      for (let i = 0; i < paths.length; i++) {
        const layer = paths[i];
        const lColor = layer.colorData || '#111111';
        const dStr = buildPathStr(layer);
        if (dStr) {
          contentStr += `\n  <g id="layer${i + 1}" inkscape:label="${layer.colorName || 'Layer ' + (i + 1)}" inkscape:groupmode="layer">
    <path d="${dStr}" fill="${lColor}" fill-rule="evenodd" stroke="none" stroke-width="0" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
        }
      }
    } else {
      const closedPaths = paths.filter(p => p.closed !== false && !isCenterline);
      const openPaths = paths.filter(p => p.closed === false || isCenterline);
      const dClosed = buildPathStr(closedPaths);
      const dOpen = buildPathStr(openPaths);
      contentStr = '\n  <g id="layer1" inkscape:label="CNC Layer 1" inkscape:groupmode="layer">';
      if (dClosed) {
        contentStr += `\n    <path d="${dClosed}" fill="${fillColor}" fill-rule="evenodd" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;
      }
      if (dOpen) {
        contentStr += `\n    <path d="${dOpen}" fill="none" stroke="#000000" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>`;
      }
      contentStr += '\n  </g>';
    }

    const bgRect = bg && bg !== 'none' ? `\n  <rect width="${w}" height="${h}" fill="${bg}"/>` : '';
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
     width="${physW.toFixed(2)}mm" height="${physH.toFixed(2)}mm" viewBox="0 0 ${w} ${h}">
  <title>${title}</title>
  <desc>Generated by CNC Vector Studio — ${new Date().toISOString()}</desc>${bgRect}${contentStr}
</svg>`;
  }

  // ── DXF Builder (mm/inch Units + Named Layers + ACI Colors + Closed Loops) ──
  function buildDXF(paths, w, h) {
    const { physW, physH } = getPhysicalDimensionsMm(w, h);
    const useInch = state.settings.units === 'inch';
    const unitScale = useInch ? (1 / 25.4) : 1;
    const outW = physW * unitScale;
    const outH = physH * unitScale;
    const sx = outW / Math.max(1, w);
    const sy = outH / Math.max(1, h);
    const VE = window.VectorEngine;

    const lines = [];
    const dxf = (k, v) => lines.push(k + '\n' + v);
    const isColor = state.settings.mode === 'color';
    const isCenterline = state.settings.mode === 'centerline';

    // Define layers with AutoCAD ACI color codes
    const layers = [];
    if (isColor) {
      paths.forEach((layer, idx) => {
        const aci = (idx % 6) + 1;
        layers.push({ name: 'COLOR_' + (idx + 1), color: aci, items: layer });
      });
    } else {
      const closedList = paths.filter(p => p.closed !== false && !isCenterline);
      const openList = paths.filter(p => p.closed === false || isCenterline);
      if (closedList.length) {
        const depths = VE && VE.analyzeNesting ? VE.analyzeNesting(closedList) : null;
        const holes = [], outers = [];
        closedList.forEach((p, idx) => ((depths && (depths[idx] % 2 === 1)) ? holes : outers).push(p));
        if (holes.length) layers.push({ name: 'CUT_HOLES', color: 3, items: holes });
        if (outers.length) layers.push({ name: 'CUT_OUTER', color: 1, items: outers });
      }
      if (openList.length) layers.push({ name: 'ENGRAVE_CENTER', color: 5, items: openList });
    }
    if (!layers.length) layers.push({ name: 'CNC_DEFAULT', color: 7, items: [] });

    // HEADER (AC1009 universal + units)
    dxf(0, 'SECTION'); dxf(2, 'HEADER');
    dxf(9, '$ACADVER'); dxf(1, 'AC1009');
    dxf(9, '$INSUNITS'); dxf(70, useInch ? '1' : '4');
    dxf(9, '$MEASUREMENT'); dxf(70, useInch ? '0' : '1');
    dxf(9, '$EXTMIN'); dxf(10, '0.0'); dxf(20, '0.0'); dxf(30, '0.0');
    dxf(9, '$EXTMAX'); dxf(10, outW.toFixed(4)); dxf(20, outH.toFixed(4)); dxf(30, '0.0');
    dxf(0, 'ENDSEC');

    // TABLES -> LAYER
    dxf(0, 'SECTION'); dxf(2, 'TABLES');
    dxf(0, 'TABLE'); dxf(2, 'LAYER'); dxf(70, String(layers.length));
    for (const l of layers) {
      dxf(0, 'LAYER'); dxf(2, l.name); dxf(70, '0'); dxf(62, String(l.color)); dxf(6, 'CONTINUOUS');
    }
    dxf(0, 'ENDTAB');
    dxf(0, 'ENDSEC');

    // ENTITIES
    dxf(0, 'SECTION'); dxf(2, 'ENTITIES');
    for (const l of layers) {
      for (const path of l.items) {
        if (!path || path.length < 2) continue;
        const closed = !isCenterline && path.closed !== false;
        dxf(0, 'POLYLINE'); dxf(8, l.name); dxf(62, String(l.color));
        dxf(66, '1'); dxf(70, closed ? '1' : '0');
        for (const [px, py] of path) {
          dxf(0, 'VERTEX'); dxf(8, l.name);
          dxf(10, (px * sx).toFixed(4));
          dxf(20, (outH - py * sy).toFixed(4));
          dxf(30, '0.0');
        }
        dxf(0, 'SEQEND');
      }
    }
    dxf(0, 'ENDSEC'); dxf(0, 'EOF');
    return lines.join('\n');
  }

  // ── G-code Builder (Laser + 2.5D Router Z + Hole-First TSP + Kerf Offset) ──
  function buildGcode(paths, w, h) {
    const s = state.settings;
    const { physW, physH } = getPhysicalDimensionsMm(w, h);
    const sx = physW / Math.max(1, w);
    const sy = physH / Math.max(1, h);
    const avgScale = (sx + sy) * 0.5;
    const VE = window.VectorEngine;

    const flatPaths = s.mode === 'color' ? paths.flat() : paths.slice();
    const valid = flatPaths.filter(p => p && p.length >= 2);

    // Apply physical scale first -> mm points (Y-up CNC space)
    const kerfMm = s.kerf || 0;
    const kerfPx = kerfMm > 0 ? (kerfMm / Math.max(1e-6, avgScale)) : 0;

    let orderedPx = valid;
    if (VE && VE.optimizeToolpaths && s.tsp !== false) {
      orderedPx = VE.optimizeToolpaths(valid, kerfPx).ordered;
    } else if (VE && kerfPx > 0 && VE.analyzeNesting) {
      const depths = VE.analyzeNesting(valid);
      orderedPx = valid.map((p, i) => {
        if (p.closed === false) return p;
        const d = (depths[i] % 2 === 1) ? -kerfPx * 0.5 : kerfPx * 0.5;
        return VE.offsetClosedPolygon(p, d);
      });
    }

    const lines = [];
    const isRouter = s.cncType === 'router';
    lines.push('; CNC Vector Studio — ' + (isRouter ? '2.5D CNC Router' : 'Laser / Plasma') + ' G-code');
    lines.push('; Output Size: ' + physW.toFixed(2) + ' x ' + physH.toFixed(2) + ' mm');
    lines.push('; Material: ' + s.material + ' | Kerf: ' + kerfMm.toFixed(2) + ' mm');
    lines.push('; Feed: ' + s.speed + ' mm/min | Passes: ' + s.passes);
    lines.push('; Generated: ' + new Date().toISOString());
    lines.push('G21 ; millimeters');
    lines.push('G90 ; absolute positioning');
    lines.push('G17 ; XY plane');

    if (isRouter) {
      const safeZ = Number(s.safeZ || 5.0);
      const cutDepth = Number(s.cutDepth || 3.0);
      const stepDown = Math.max(0.2, Number(s.stepDown || 1.5));
      const plungeFeed = Math.max(100, Math.round((s.speed || 1000) * 0.35));
      lines.push('G0 Z' + safeZ.toFixed(3) + ' ; safe clearance');
      lines.push('M3 S12000 ; spindle on');
      lines.push('G4 P0.5 ; dwell');

      const zPasses = [];
      for (let z = stepDown; z < cutDepth - 1e-4; z += stepDown) zPasses.push(z);
      zPasses.push(cutDepth);

      zPasses.forEach((zDepth, pIdx) => {
        const isLastPass = pIdx === zPasses.length - 1;
        lines.push('; --- Depth Pass ' + (pIdx + 1) + ' (Z-' + zDepth.toFixed(3) + 'mm) ---');
        orderedPx.forEach(path => {
          const closed = path.closed !== false && s.mode !== 'centerline';
          const x0 = (path[0][0] * sx).toFixed(3);
          const y0 = ((h - path[0][1]) * sy).toFixed(3);
          lines.push('G0 Z' + safeZ.toFixed(3));
          lines.push('G0 X' + x0 + ' Y' + y0);
          lines.push('G1 Z-' + zDepth.toFixed(3) + ' F' + plungeFeed);
          lines.push('F' + s.speed);

          const len = path.length;
          const tabIdx = (isLastPass && s.tabs && closed && len >= 6) ? Math.floor(len / 2) : -1;
          for (let i = 1; i < len; i++) {
            const xm = (path[i][0] * sx).toFixed(3);
            const ym = ((h - path[i][1]) * sy).toFixed(3);
            if (i === tabIdx) {
              const tabZ = Math.max(0.2, zDepth - 1.2);
              lines.push('G1 Z-' + tabZ.toFixed(3) + ' F' + plungeFeed + ' ; holding tab lift');
              lines.push('G1 X' + xm + ' Y' + ym + ' F' + s.speed);
              lines.push('G1 Z-' + zDepth.toFixed(3) + ' F' + plungeFeed + ' ; resume depth');
            } else {
              lines.push('G1 X' + xm + ' Y' + ym);
            }
          }
          if (closed) lines.push('G1 X' + x0 + ' Y' + y0 + ' ; close contour');
        });
      });
      lines.push('G0 Z' + safeZ.toFixed(3));
      lines.push('M5 ; spindle off');
    } else {
      const sVal = Math.round((s.laserPower || 80) * 10);
      lines.push('M5 ; laser off');
      lines.push('F' + s.speed);
      for (let pass = 0; pass < (s.passes || 1); pass++) {
        lines.push('; --- Pass ' + (pass + 1) + ' ---');
        for (const path of orderedPx) {
          const closed = path.closed !== false && s.mode !== 'centerline';
          const x0 = (path[0][0] * sx).toFixed(3);
          const y0 = ((h - path[0][1]) * sy).toFixed(3);
          lines.push('G0 X' + x0 + ' Y' + y0);
          lines.push('M3 S' + sVal + ' ; laser on');
          for (let i = 1; i < path.length; i++) {
            lines.push('G1 X' + (path[i][0] * sx).toFixed(3) + ' Y' + ((h - path[i][1]) * sy).toFixed(3));
          }
          if (closed) lines.push('G1 X' + x0 + ' Y' + y0);
          lines.push('M5 ; laser off');
        }
      }
    }
    lines.push('G0 X0.000 Y0.000 ; return work origin');
    lines.push('M30 ; end program');
    return lines.join('\n');
  }

  // ── PDF Builder (Spec-Valid Byte-Indexed XREF + Physical pt MediaBox + Color Mode) ──
  function buildPDF(paths, w, h) {
    const { physW, physH } = getPhysicalDimensionsMm(w, h);
    const ptW = physW * (72 / 25.4);
    const ptH = physH * (72 / 25.4);
    const sx = ptW / Math.max(1, w);
    const sy = ptH / Math.max(1, h);
    const smooth = !!state.settings.bezier;

    const buildPdfStream = (pathArray, r, g, b, forceStroke) => {
      const closedPaths = forceStroke ? [] : pathArray.filter(p => p.closed !== false && state.settings.mode !== 'centerline');
      const openPaths = forceStroke ? pathArray : pathArray.filter(p => p.closed === false || state.settings.mode === 'centerline');

      const emitSet = (arr, isStroke) => {
        if (!arr.length) return '';
        let st = isStroke ? `${r} ${g} ${b} RG\n0.6 w\n1 J 1 j\n` : `${r} ${g} ${b} rg\n`;
        for (const path of arr) {
          if (path.length < 2) continue;
          st += (path[0][0] * sx).toFixed(2) + ' ' + (ptH - path[0][1] * sy).toFixed(2) + ' m ';
          if (!smooth || path.length < 3) {
            for (let i = 1; i < path.length; i++) {
              st += (path[i][0] * sx).toFixed(2) + ' ' + (ptH - path[i][1] * sy).toFixed(2) + ' l ';
            }
          } else {
            const len = path.length;
            const isClosed = path.closed !== false;
            const segCount = isClosed ? len : len - 1;
            const tension = 0.18;
            for (let i = 0; i < segCount; i++) {
              const p1 = path[i];
              const p2 = path[(i + 1) % len];
              const p0 = isClosed ? path[(i - 1 + len) % len] : path[Math.max(0, i - 1)];
              const p3 = isClosed ? path[(i + 2) % len] : path[Math.min(len - 1, i + 2)];
              const a1x = p1[0] - p0[0], a1y = p1[1] - p0[1];
              const a2x = p2[0] - p1[0], a2y = p2[1] - p1[1];
              const l1 = Math.hypot(a1x, a1y), l2 = Math.hypot(a2x, a2y);
              const sharp1 = l1 > 1e-4 && l2 > 1e-4 && ((a1x * a2x + a1y * a2y) / (l1 * l2) < 0.74);
              const c1x = sharp1 ? p1[0] : p1[0] + (p2[0] - p0[0]) * tension;
              const c1y = sharp1 ? p1[1] : p1[1] + (p2[1] - p0[1]) * tension;
              const c2x = p2[0] - (p3[0] - p1[0]) * tension;
              const c2y = p2[1] - (p3[1] - p1[1]) * tension;
              st += (c1x * sx).toFixed(2) + ' ' + (ptH - c1y * sy).toFixed(2) + ' ' +
                    (c2x * sx).toFixed(2) + ' ' + (ptH - c2y * sy).toFixed(2) + ' ' +
                    (p2[0] * sx).toFixed(2) + ' ' + (ptH - p2[1] * sy).toFixed(2) + ' c ';
            }
          }
          if (isStroke) st += 'S\n';
          else st += 'h ';
        }
        if (!isStroke && arr.length) st += 'f*\n';
        return st;
      };

      return emitSet(closedPaths, false) + emitSet(openPaths, true);
    };

    let pdfStream = '';
    if (state.settings.mode === 'color') {
      for (const layer of paths) {
        const hex = layer.colorData || '#111111';
        const r = (parseInt(hex.slice(1, 3), 16) / 255).toFixed(3);
        const g = (parseInt(hex.slice(3, 5), 16) / 255).toFixed(3);
        const b = (parseInt(hex.slice(5, 7), 16) / 255).toFixed(3);
        pdfStream += buildPdfStream(layer, r, g, b, false);
      }
    } else {
      pdfStream = buildPdfStream(paths, '0', '0', '0', state.settings.mode === 'centerline');
    }

    const enc = new TextEncoder();
    const header = '%PDF-1.4\n';
    const streamLen = enc.encode(pdfStream).length;
    const obj1 = '1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n';
    const obj2 = '2 0 obj\n<</Type /Pages /Kids[3 0 R] /Count 1>>\nendobj\n';
    const obj3 = `3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox[0 0 ${ptW.toFixed(2)} ${ptH.toFixed(2)}] /Contents 4 0 R /Resources<</ProcSet[/PDF]>>>>\nendobj\n`;
    const obj4 = `4 0 obj\n<</Length ${streamLen}>>\nstream\n${pdfStream}\nendstream\nendobj\n`;

    const chunks = [header, obj1, obj2, obj3, obj4];
    const offsets = [];
    let cursor = enc.encode(header).length;
    for (let i = 1; i < chunks.length; i++) {
      offsets.push(cursor);
      cursor += enc.encode(chunks[i]).length;
    }

    const xrefPos = cursor;
    let xref = 'xref\n0 5\n0000000000 65535 f \n';
    offsets.forEach(off => { xref += String(off).padStart(10, '0') + ' 00000 n \n'; });
    const trailer = `trailer\n<</Size 5 /Root 1 0 R>>\nstartxref\n${xrefPos}\n%%EOF`;
    return chunks.join('') + xref + trailer;
  }

  // ── SVG from image (embeds raster image) ───────────────
  function buildSVGFromImage(dataURL, w, h) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <title>Image Export — CNC Vector Studio</title>
  <image x="0" y="0" width="${w}" height="${h}" xlink:href="${dataURL}"/>
</svg>`;
  }

  // ── PDF from image (JPEG embedded) ─────────────────────
  async function buildPDFFromImage(dataURL, w, h, filename) {
    const res = await fetch(dataURL);
    const blob = await res.blob();
    const ab = await blob.arrayBuffer();
    const jpegBytes = new Uint8Array(ab);
    const jpegLen = jpegBytes.length;

    const enc = new TextEncoder();
    const cat = enc.encode('1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n');
    const pages = enc.encode('2 0 obj\n<</Type /Pages /Kids[3 0 R] /Count 1>>\nendobj\n');
    const page = enc.encode(`3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox[0 0 ${w} ${h}] /Contents 4 0 R /Resources<</XObject<</Im0 5 0 R>>>>>>\nendobj\n`);
    const cmds = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;
    const content = enc.encode(`4 0 obj\n<</Length ${cmds.length}>>\nstream\n${cmds}\nendstream\nendobj\n`);
    const imgHdr = enc.encode(`5 0 obj\n<</Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegLen}>>\nstream\n`);
    const imgFtr = enc.encode('\nendstream\nendobj\n');
    const header = enc.encode('%PDF-1.4\n');

    const parts = [header, cat, pages, page, content, imgHdr, jpegBytes, imgFtr];
    const totalLen = parts.reduce((s, p) => s + p.length, 0);
    const out = new Uint8Array(totalLen);
    let off = 0;
    for (const p of parts) { out.set(p, off); off += p.length; }

    const xrefBody = `xref\n0 6\n0000000000 65535 f \n` +
      [0].concat(parts.slice(0, 5).reduce((acc, p) => { acc.push(acc[acc.length - 1] + p.length); return acc; }, [parts[0].length])).slice(0, 5)
        .map(o => String(o).padStart(10, '0') + ' 00000 n ').join('\n') + '\n';
    const trailer = `trailer\n<</Size 6 /Root 1 0 R>>\nstartxref\n${totalLen}\n%%EOF`;
    const tail = enc.encode(xrefBody + trailer);
    const final = new Uint8Array(totalLen + tail.length);
    final.set(out, 0); final.set(tail, totalLen);
    saveBinaryBlob(final, filename, 'application/pdf');
  }

  // ── BMP Builder (24-bit uncompressed) ──────────────────
  function buildBMP(imgData, w, h) {
    const rowSize = Math.floor((24 * w + 31) / 32) * 4;
    const pixelDataSize = rowSize * h;
    const fileSize = 54 + pixelDataSize;
    const buf = new ArrayBuffer(fileSize);
    const view = new DataView(buf);
    // File header
    view.setUint8(0, 0x42); view.setUint8(1, 0x4D);
    view.setUint32(2, fileSize, true);
    view.setUint32(6, 0, true);
    view.setUint32(10, 54, true);
    // DIB header
    view.setUint32(14, 40, true);
    view.setInt32(18, w, true);
    view.setInt32(22, -h, true); // top-down
    view.setUint16(26, 1, true);
    view.setUint16(28, 24, true);
    view.setUint32(30, 0, true);
    view.setUint32(34, pixelDataSize, true);
    view.setInt32(38, 2835, true);
    view.setInt32(42, 2835, true);
    view.setUint32(46, 0, true);
    view.setUint32(50, 0, true);
    // Pixel data (BGR)
    const px = imgData.data;
    let offset = 54;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        view.setUint8(offset, px[i + 2]); // B
        view.setUint8(offset + 1, px[i + 1]); // G
        view.setUint8(offset + 2, px[i]);     // R
        offset += 3;
      }
      // row padding
      const pad = rowSize - w * 3;
      for (let p = 0; p < pad; p++) { view.setUint8(offset, 0); offset++; }
    }
    return new Uint8Array(buf);
  }

  // ── 8-bit Grayscale BMP (Feature 9) ────────────────────
  function buildBMP8Bit(imgData, w, h) {
    const rowSize = Math.floor((w + 3) / 4) * 4;
    const pixelDataSize = rowSize * h;
    const paletteSize = 256 * 4;
    const fileSize = 54 + paletteSize + pixelDataSize;
    const buf = new ArrayBuffer(fileSize);
    const view = new DataView(buf);

    view.setUint8(0, 0x42); view.setUint8(1, 0x4D);
    view.setUint32(2, fileSize, true);
    view.setUint32(10, 54 + paletteSize, true);
    view.setUint32(14, 40, true);
    view.setInt32(18, w, true);
    view.setInt32(22, -h, true);
    view.setUint16(26, 1, true);
    view.setUint16(28, 8, true);
    view.setUint32(30, 0, true);
    view.setUint32(34, pixelDataSize, true);
    view.setUint32(46, 256, true);

    // Palette (grayscale)
    let poff = 54;
    for (let i = 0; i < 256; i++) {
      view.setUint8(poff, i);   // B
      view.setUint8(poff + 1, i); // G
      view.setUint8(poff + 2, i); // R
      view.setUint8(poff + 3, 0); // A
      poff += 4;
    }

    const px = imgData.data;
    let offset = 54 + paletteSize;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const gray = Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
        view.setUint8(offset++, gray);
      }
      const pad = rowSize - w;
      for (let p = 0; p < pad; p++) view.setUint8(offset++, 0);
    }
    return new Uint8Array(buf);
  }

  // ── TIFF Builder (Simplified Baseline, Feature 1) ─────
  function buildTIFF(imgData, w, h) {
    // This is a naive uncompressed 24-bit RGB TIFF
    const pixelDataSize = w * h * 3;
    const headerSize = 8;
    const ifdOffset = headerSize + pixelDataSize;
    const numEntries = 11;
    const ifdSize = 2 + (numEntries * 12) + 4;
    const extraDataSize = 8 + 8 + 6; // for ResX, ResY, BitsPerSample
    const fileSize = ifdOffset + ifdSize + extraDataSize;

    const buf = new ArrayBuffer(fileSize);
    const v = new DataView(buf);

    // Header (Little Endian)
    v.setUint16(0, 0x4949, true);
    v.setUint16(2, 42, true);
    v.setUint32(4, ifdOffset, true);

    // Image Data (RGB)
    const px = imgData.data;
    let doff = 8;
    for (let i = 0; i < px.length; i += 4) {
      v.setUint8(doff++, px[i]);   // R
      v.setUint8(doff++, px[i + 1]); // G
      v.setUint8(doff++, px[i + 2]); // B
    }

    // IFD
    let ioff = ifdOffset;
    v.setUint16(ioff, numEntries, true); ioff += 2;
    const writeEntry = (tag, type, count, val) => {
      v.setUint16(ioff, tag, true);
      v.setUint16(ioff + 2, type, true);
      v.setUint32(ioff + 4, count, true);
      v.setUint32(ioff + 8, val, true);
      ioff += 12;
    };

    const extraOff = ifdOffset + ifdSize;
    writeEntry(256, 3, 1, w); // Width
    writeEntry(257, 3, 1, h); // Length
    writeEntry(258, 3, 3, extraOff); // BitsPerSample
    writeEntry(259, 3, 1, 1); // Compression (1=none)
    writeEntry(262, 3, 1, 2); // PhotoInterp (2=RGB)
    writeEntry(273, 4, 1, 8); // StripOffsets
    writeEntry(277, 3, 1, 3); // SamplesPerPixel
    writeEntry(278, 3, 1, h); // RowsPerStrip
    writeEntry(279, 4, 1, pixelDataSize); // StripByteCounts
    writeEntry(282, 5, 1, extraOff + 6); // XRes
    writeEntry(283, 5, 1, extraOff + 14); // YRes

    v.setUint32(ioff, 0, true); // End of IFD

    // Extra Data
    v.setUint16(extraOff, 8, true); v.setUint16(extraOff + 2, 8, true); v.setUint16(extraOff + 4, 8, true);
    v.setUint32(extraOff + 6, state.exportSettings.dpi, true); v.setUint32(extraOff + 10, 1, true);
    v.setUint32(extraOff + 14, state.exportSettings.dpi, true); v.setUint32(extraOff + 18, 1, true);

    return new Uint8Array(buf);
  }

  // ── Previews (Feature 4) ──────────────────────────────
  async function showImagePreview() {
    if (!state.originalCanvas) return;
    showProcessing(true, t('exportPreview'));
    await sleep(50);
    const canvas = await processExportCanvas(state.originalCanvas);
    showProcessing(false);

    // Quick and dirty modal for preview
    const diag = document.createElement('dialog');
    diag.style.padding = '20px'; diag.style.background = 'var(--surface)'; diag.style.color = 'var(--text)';
    diag.style.border = '1px solid var(--border)'; diag.style.borderRadius = '8px';
    diag.style.maxWidth = '90vw'; diag.style.maxHeight = '90vh';
    diag.innerHTML = `<h3>Image Export Preview</h3><div style="overflow:auto;max-height:70vh;margin:10px 0;text-align:center"><img src="${canvas.toDataURL()}" style="max-width:100%;height:auto;border:1px solid #333"></div><button class="btn btn-secondary" onclick="this.closest('dialog').close();this.closest('dialog').remove()">Close</button>`;
    document.body.appendChild(diag);
    diag.showModal();
  }

  async function showVectorPreview() {
    if (!state.vectorPaths.length) return;
    const canvas = $('canvasVec');
    if (!canvas) return;

    // Quick and dirty modal for preview
    const diag = document.createElement('dialog');
    diag.style.padding = '20px'; diag.style.background = 'var(--surface)'; diag.style.color = 'var(--text)';
    diag.style.border = '1px solid var(--border)'; diag.style.borderRadius = '8px';
    diag.style.maxWidth = '90vw'; diag.style.maxHeight = '90vh';
    diag.innerHTML = `<h3>Vector Export Preview</h3><div style="overflow:auto;max-height:70vh;margin:10px 0;text-align:center"><img src="${canvas.toDataURL()}" style="max-width:100%;height:auto;border:1px solid #333"></div><button class="btn btn-secondary" onclick="this.closest('dialog').close();this.closest('dialog').remove()">Close</button>`;
    document.body.appendChild(diag);
    diag.showModal();
  }

  // ── Live CNC Toolpath Simulation (Hole-First + TSP Rapid Moves) ──
  let simRafId = null;
  function runSimulation(pathsArg, wArg, hArg) {
    const paths = pathsArg || state.vectorPaths;
    if (!paths || paths.length === 0) { toast(t('noVector'), 'error'); return; }
    const w = wArg || state.vectorDims.w || ($('canvasVec') ? $('canvasVec').width : 500);
    const h = hArg || state.vectorDims.h || ($('canvasVec') ? $('canvasVec').height : 500);

    if (simRafId) cancelAnimationFrame(simRafId);

    const VE = window.VectorEngine;
    const rawFlat = state.settings.mode === 'color' ? paths.flat() : paths.slice();
    let ordered = rawFlat.filter(p => p && p.length >= 2);
    let savedPct = 0;

    const { physW, physH } = getPhysicalDimensionsMm(w, h);
    const sx = physW / Math.max(1, w);
    const sy = physH / Math.max(1, h);

    if (VE && VE.optimizeToolpaths && state.settings.tsp !== false && ordered.length > 0) {
      const opt = VE.optimizeToolpaths(ordered, 0);
      ordered = opt.ordered;
      if (opt.originalTravel > 1) {
        savedPct = Math.max(0, Math.round((1 - opt.optimizedTravel / opt.originalTravel) * 100));
      }
    }

    let travelDist = 0, cutDist = 0;
    for (let i = 0; i < ordered.length; i++) {
      const p = ordered[i];
      if (i > 0) {
        const prev = ordered[i - 1];
        const lp = (prev.closed !== false && state.settings.mode !== 'centerline') ? prev[0] : prev[prev.length - 1];
        travelDist += Math.hypot((p[0][0] - lp[0]) * sx, (p[0][1] - lp[1]) * sy);
      }
      for (let j = 1; j < p.length; j++) {
        cutDist += Math.hypot((p[j][0] - p[j - 1][0]) * sx, (p[j][1] - p[j - 1][1]) * sy);
      }
      if (p.closed !== false && state.settings.mode !== 'centerline') {
        cutDist += Math.hypot((p[0][0] - p[p.length - 1][0]) * sx, (p[0][1] - p[p.length - 1][1]) * sy);
      }
    }

    const passes = state.settings.passes || 1;
    const totalCutDist = cutDist * passes;
    const speed = Math.max(50, state.settings.speed || 1000);
    const rapidSpeed = 3500;
    const totalMin = (totalCutDist / speed) + ((travelDist * passes) / rapidSpeed);
    const totalSec = Math.max(1, Math.round(totalMin * 60));
    const mm = Math.floor(totalSec / 60);
    const ss = String(totalSec % 60).padStart(2, '0');

    if ($('simTimeEst')) $('simTimeEst').textContent = `${mm}:${ss}`;
    if ($('simCutDist')) $('simCutDist').textContent = totalCutDist.toFixed(1) + 'mm';
    if ($('simTravelDist')) $('simTravelDist').textContent = travelDist.toFixed(1) + 'mm' + (savedPct > 0 ? ` (-${savedPct}%)` : '');
    if ($('simOverlay')) $('simOverlay').style.display = 'block';

    const cv = $('canvasVec');
    if (!cv) return;
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Faint ghost blueprint behind toolpath animation
    ctx.save();
    ctx.globalAlpha = 0.14;
    if (state.settings.mode === 'color') {
      paths.forEach(l => VE.drawPathsOnCtx(ctx, l, state.settings.bezier, '#475569', '#475569'));
    } else if (VE) {
      VE.drawPathsOnCtx(ctx, paths, state.settings.bezier, '#475569', '#475569', state.settings.mode === 'centerline');
    }
    ctx.restore();

    const stopBtn = $('btnStopSim');
    const cleanup = () => {
      if (simRafId) cancelAnimationFrame(simRafId);
      simRafId = null;
      if ($('simOverlay')) $('simOverlay').style.display = 'none';
      drawVectorPreview(state.vectorPaths, w, h);
      if (stopBtn) stopBtn.removeEventListener('click', cleanup);
    };
    if (stopBtn) stopBtn.addEventListener('click', cleanup);

    let pathIdx = 0, ptIdx = 1;
    const totalPts = Math.max(1, ordered.reduce((acc, p) => acc + p.length, 0));
    let ptsDrawn = 0;

    const drawFrame = () => {
      const speedFactor = Math.max(1, Math.floor(totalPts / 220));
      for (let step = 0; step < speedFactor; step++) {
        if (pathIdx >= ordered.length) {
          if ($('simProgressPct')) $('simProgressPct').textContent = '100%';
          if ($('simProgressBar')) $('simProgressBar').style.width = '100%';
          return;
        }
        const cur = ordered[pathIdx];
        if (ptIdx === 1) {
          if (pathIdx > 0) {
            const prev = ordered[pathIdx - 1];
            const lp = (prev.closed !== false && state.settings.mode !== 'centerline') ? prev[0] : prev[prev.length - 1];
            ctx.save();
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.1;
            ctx.beginPath(); ctx.moveTo(lp[0], lp[1]); ctx.lineTo(cur[0][0], cur[0][1]); ctx.stroke();
            ctx.restore();
          }
          ctx.beginPath();
          ctx.moveTo(cur[0][0], cur[0][1]);
        }
        if (ptIdx < cur.length) {
          const p = cur[ptIdx];
          ctx.strokeStyle = state.settings.cncType === 'router' ? '#f59e0b' : '#ef4444';
          ctx.lineWidth = 1.6;
          ctx.lineTo(p[0], p[1]);
          ctx.stroke();
          ptIdx++;
          ptsDrawn++;
        } else {
          if (cur.closed !== false && state.settings.mode !== 'centerline') {
            ctx.lineTo(cur[0][0], cur[0][1]);
            ctx.stroke();
          }
          pathIdx++;
          ptIdx = 1;
        }
      }
      const pct = Math.min(100, Math.round((ptsDrawn / totalPts) * 100));
      if ($('simProgressPct')) $('simProgressPct').textContent = pct + '%';
      if ($('simProgressBar')) $('simProgressBar').style.width = pct + '%';
      simRafId = requestAnimationFrame(drawFrame);
    };
    drawFrame();
  }

  // ── Batch Export (Feature 7) ──────────────────────────
  async function runBatchExport(source) {

    const canvas = source === 'image' ? state.originalCanvas : $('canvasVec');
    if (!canvas) { toast(t('noImage'), 'error'); return; }

    showProcessing(true, t('batchExport'));
    await sleep(100);

    const zip = new JSZip();
    const processed = await processExportCanvas(canvas);
    const ctx = processed.getContext('2d');
    const imgData = ctx.getImageData(0, 0, processed.width, processed.height);

    // BMP
    const bmp = state.exportSettings.bmp8bit ? buildBMP8Bit(imgData, processed.width, processed.height) : buildBMP(imgData, processed.width, processed.height);
    zip.file("export.bmp", bmp);

    // PNG
    const pngDataURL = processed.toDataURL('image/png');
    zip.file("export.png", pngDataURL.split(',')[1], { base64: true });

    // JPEG
    const jpgDataURL = processed.toDataURL('image/jpeg', state.exportSettings.jpegQuality);
    zip.file("export.jpg", jpgDataURL.split(',')[1], { base64: true });

    // TIFF
    const tiff = buildTIFF(imgData, processed.width, processed.height);
    zip.file("export.tiff", tiff);

    if (source === 'vector') {
      const vecW = state.vectorDims.w || processed.width;
      const vecH = state.vectorDims.h || processed.height;
      const cols = parseInt($('gridCols')?.value) || 1;
      const rows = parseInt($('gridRows')?.value) || 1;
      const spaceX = parseFloat($('gridSpaceX')?.value) || 0;
      const spaceY = parseFloat($('gridSpaceY')?.value) || 0;
      const isColorMode = state.settings.mode === 'color';

      const { paths: outPaths, w: totalW, h: totalH } = generateGridArray(state.vectorPaths, vecW, vecH, cols, rows, spaceX, spaceY, isColorMode);

      zip.file("export.svg", buildSVG(outPaths, totalW, totalH));
      zip.file("export.dxf", buildDXF(outPaths, totalW, totalH));
      zip.file("export.nc", buildGcode(outPaths, totalW, totalH));
      zip.file("export_vector.pdf", buildPDF(outPaths, totalW, totalH));
    }

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url; a.download = "cnc_vector_studio_batch_" + Date.now() + ".zip";
    a.click();
    showProcessing(false);
    toast('✅ ' + t('downloadReady'), 'success');
  }

  // ── Binary Blob Downloader ─────────────────────────────
  async function saveBinaryBlob(uint8, filename, mime) {
    const blob = new Blob([uint8], { type: mime });
    if (typeof window.showSaveFilePicker === 'function') {
      try {
        const ext = filename.split('.').pop();
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: ext.toUpperCase() + ' file', accept: { [mime]: ['.' + ext] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (e) { if (e.name === 'AbortError') return; }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    a.style.position = 'fixed'; a.style.opacity = '0';
    document.body.appendChild(a);
    a.dispatchEvent(new MouseEvent('click', { bubbles: false, cancelable: true, view: window }));
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
  }

  // ── Preview Drawing (VectorEngine sharp-corner + even-odd holes + color layers) ──
  function drawVectorPreview(paths, w, h) {
    const cv = $('canvasVec');
    const ctx = cv.getContext('2d');
    cv.width = w; cv.height = h;
    const smooth = !!state.settings.bezier;
    const VE = window.VectorEngine;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    if (state.settings.mode === 'color') {
      for (const layer of paths) {
        const col = layer.colorData || '#111111';
        VE.drawPathsOnCtx(ctx, layer, smooth, col, col, false);
      }
    } else {
      const isCenter = state.settings.mode === 'centerline';
      VE.drawPathsOnCtx(ctx, paths, smooth, '#111111', '#111111', isCenter);
    }

    $('vecPlaceholder').style.display = 'none';
    cv.style.display = 'block';

    // Show the vector preview panel (hidden by default)
    if ($('vecPanel')) $('vecPanel').style.display = '';

    // Enable eraser tool since paths exist
    if ($('btnEraser')) {
      $('btnEraser').disabled = false;
      $('btnEraser').style.cursor = 'pointer';
    }
  }

  function clearVector() {
    state.vectorPaths = []; state.vectorDims = { w: 0, h: 0 }; state.svgOutput = '';
    if (simRafId) { cancelAnimationFrame(simRafId); simRafId = null; }
    if ($('simOverlay')) $('simOverlay').style.display = 'none';
    if ($('vecPanel')) $('vecPanel').style.display = 'none';
    const cv = $('canvasVec');
    if (cv) { const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, cv.width, cv.height); cv.style.display = 'none'; }
    $('vecPlaceholder').style.display = 'flex';
    enableExports(false);

    if ($('btnEraser')) {
      $('btnEraser').disabled = true;
      state.eraserMode = false;
      $('btnEraser').style.background = 'var(--surface2)';
      $('btnEraser').style.color = '#ef4444';
      if (cv) cv.style.cursor = 'default';
    }

    updateStats();
    updateLayers([]);
  }

  // ── Exports ────────────────────────────────────────────
  function setupExports() {
    ['SVG', 'DXF', 'PNG', 'Gcode', 'PDF', 'NC', 'BMP', 'JPEG', 'TIFF'].forEach(f => {
      const key = f.toLowerCase();
      const btn = $('btnExport' + f);
      if (btn) btn.addEventListener('click', () => exportAs(key));
      const card = document.querySelector(`.export-card[data-export="vec-${key}"]`);
      if (card) {
        card.addEventListener('click', () => {
          if (!card.classList.contains('disabled')) exportAs(key);
        });
      }
    });

    ['PNG', 'JPEG', 'TIFF', 'SVG', 'PDF', 'BMP'].forEach(f => {
      const key = f.toLowerCase();
      const btn = $('btnImgExport' + f);
      if (btn) btn.addEventListener('click', () => exportFromImage(key));
      const card = document.querySelector(`.img-export-card[data-export="img-${key}"]`);
      if (card) {
        card.addEventListener('click', () => {
          if (!card.classList.contains('disabled')) exportFromImage(key);
        });
      }
    });

    if ($('btnExportSTL')) $('btnExportSTL').addEventListener('click', exportSTL);
    if ($('btnViewAR')) $('btnViewAR').addEventListener('click', launchARViewer);
  }

  function getVectorGridPayload() {
    const vecW = state.vectorDims.w || ($('canvasVec') ? $('canvasVec').width : 500);
    const vecH = state.vectorDims.h || ($('canvasVec') ? $('canvasVec').height : 500);
    const cols = parseInt($('gridCols')?.value) || 1;
    const rows = parseInt($('gridRows')?.value) || 1;
    const spaceX = parseFloat($('gridSpaceX')?.value) || 0;
    const spaceY = parseFloat($('gridSpaceY')?.value) || 0;
    const isColor = state.settings.mode === 'color';
    return generateGridArray(state.vectorPaths, vecW, vecH, cols, rows, spaceX, spaceY, isColor);
  }

  async function exportAs(format) {
    if (!state.vectorPaths.length) { toast(t('noVector'), 'error'); return; }

    showProcessing(true, t('exportPreview'));
    await sleep(30);

    const fname = 'cnc-vector_' + new Date().toISOString().slice(0, 10);

    try {
      if (['svg', 'dxf', 'gcode', 'nc', 'pdf'].includes(format)) {
        const { paths: outPaths, w: outW, h: outH } = getVectorGridPayload();
        if (format === 'svg') downloadText(buildSVG(outPaths, outW, outH), fname + '.svg');
        else if (format === 'dxf') downloadText(buildDXF(outPaths, outW, outH), fname + '.dxf');
        else if (format === 'gcode' || format === 'nc') {
          downloadText(buildGcode(outPaths, outW, outH), fname + (format === 'nc' ? '.nc' : '.gcode'));
        }
        else if (format === 'pdf') downloadText(buildPDF(outPaths, outW, outH), fname + '.pdf');
      } else {
        const canvas = $('canvasVec');
        const processed = await processExportCanvas(canvas);
        const w = processed.width, h = processed.height;
        const ctx = processed.getContext('2d');
        const imgData = ctx.getImageData(0, 0, w, h);
        if (format === 'png') savePNG(processed.toDataURL('image/png'), fname + '.png');
        else if (format === 'jpeg') savePNG(processed.toDataURL('image/jpeg', state.exportSettings.jpegQuality), fname + '.jpg');
        else if (format === 'tiff') saveBinaryBlob(buildTIFF(imgData, w, h), fname + '.tiff', 'image/tiff');
        else if (format === 'bmp') {
          const bmp = state.exportSettings.bmp8bit ? buildBMP8Bit(imgData, w, h) : buildBMP(imgData, w, h);
          saveBinaryBlob(bmp, fname + '.bmp', 'image/bmp');
        }
      }
      toast('✅ ' + format.toUpperCase() + ' Exported!', 'success');
    } catch (e) { console.error(e); toast('Error: ' + e.message, 'error'); }
    showProcessing(false);
  }

  function build3DExportGroup() {
    if (!state.vectorPaths.length) return null;
    if (typeof THREE === 'undefined' || !window.VectorEngine) {
      throw new Error('3D Engine (Three.js / VectorEngine) not ready');
    }
    const { paths: outPaths, w: outW, h: outH } = getVectorGridPayload();
    const { physW, physH } = getPhysicalDimensionsMm(outW, outH);
    const depthMm = Math.max(0.5, Number(state.settings.extrudeDepth || 6.0));
    const addBacking = !!state.settings.extrudeBacking;
    const isColor = state.settings.mode === 'color';
    const group = window.VectorEngine.build3DMeshGroup(outPaths, outW, outH, physW, physH, depthMm, addBacking, isColor);
    if (!group || !group.children.length) {
      throw new Error('No closed profiles available for 3D extrusion');
    }
    return { group, physW, physH, depthMm };
  }

  async function exportSTL() {
    if (!state.vectorPaths.length) { toast(t('noVector'), 'error'); return; }
    showProcessing(true, 'Generating 3D STL...');
    await sleep(30);
    try {
      const built = build3DExportGroup();
      const scene = new THREE.Scene();
      scene.add(built.group);
      scene.updateMatrixWorld(true);
      const exporter = new THREE.STLExporter();
      const res = exporter.parse(scene, { binary: true });
      const u8 = res instanceof DataView
        ? new Uint8Array(res.buffer, res.byteOffset, res.byteLength)
        : (res instanceof ArrayBuffer ? new Uint8Array(res) : new TextEncoder().encode(res));
      saveBinaryBlob(u8, 'cnc-extrude_' + Date.now() + '.stl', 'model/stl');
      toast('🧱 3D STL Exported!', 'success');
    } catch (e) {
      console.error(e);
      toast('STL Error: ' + e.message, 'error');
    }
    showProcessing(false);
  }

  async function launchARViewer() {
    if (!state.vectorPaths.length) { toast(t('noVector'), 'error'); return; }
    if (!window.StudiosProAR || typeof window.StudiosProAR.sendModel !== 'function') {
      toast('AR Bridge unavailable', 'error');
      return;
    }
    if (typeof THREE === 'undefined' || typeof THREE.GLTFExporter === 'undefined') {
      toast('GLTFExporter not loaded yet', 'error');
      return;
    }
    showProcessing(true, 'Preparing 3D AR GLB...');
    await sleep(30);
    try {
      const built = build3DExportGroup();
      built.group.updateMatrixWorld(true);

      const rawBox = new THREE.Box3().setFromObject(built.group);
      const rawSize = rawBox.getSize(new THREE.Vector3());
      const dimensionsMm = {
        x: Math.max(1, Math.round(rawSize.x)),
        y: Math.max(1, Math.round(rawSize.y)),
        z: Math.max(1, Math.round(rawSize.z))
      };

      // Mandatory meter-scale normalization for Studios-Pro AR Viewer (< 5.0m, Y >= 0)
      const arRoot = new THREE.Group();
      const rawMax = Math.max(rawSize.x, rawSize.y, rawSize.z, 1e-4);
      let factor = rawMax > 5.0 ? 0.001 : 1.0;
      const targetMax = rawMax * factor;
      if (targetMax < 0.05) factor *= (0.18 / Math.max(1e-4, targetMax));
      else if (targetMax > 2.5) factor *= (1.5 / targetMax);

      built.group.scale.multiplyScalar(factor);
      arRoot.add(built.group);
      arRoot.updateMatrixWorld(true);

      const normBox = new THREE.Box3().setFromObject(arRoot);
      const normCenter = normBox.getCenter(new THREE.Vector3());
      built.group.position.x -= normCenter.x;
      built.group.position.z -= normCenter.z;
      built.group.position.y -= normBox.min.y;
      arRoot.updateMatrixWorld(true);

      const arScene = new THREE.Scene();
      arScene.add(arRoot);

      const exporter = new THREE.GLTFExporter();
      await new Promise((resolve, reject) => {
        exporter.parse(
          arScene,
          (result) => {
            try {
              const isBin = result instanceof ArrayBuffer || (result && typeof result.byteLength === 'number');
              const modelData = isBin ? result : JSON.stringify(result);
              const ext = isBin ? 'glb' : 'gltf';
              const baseName = ($('fileName')?.textContent || 'cnc-vector-part').replace(/\.[^.]+$/, '');
              window.StudiosProAR.sendModel({
                modelData,
                extension: ext,
                isBinary: isBin,
                name: baseName + '.' + ext,
                placement: 'floor',
                dimensionsMm,
                autoScale: 'auto',
                sourceStudio: 'vector-cnc'
              });
              toast('📱 Sent to Studios-Pro AR Viewer!', 'success');
              resolve();
            } catch (err) { reject(err); }
          },
          { binary: true }
        );
      });
    } catch (e) {
      console.error(e);
      toast('AR Export Error: ' + e.message, 'error');
    }
    showProcessing(false);
  }

  async function exportFromImage(format) {
    if (!state.originalCanvas) { toast(t('noImage'), 'error'); return; }

    showProcessing(true, t('exportPreview'));
    await sleep(50);

    const processed = await processExportCanvas(state.originalCanvas);
    const w = processed.width, h = processed.height;
    const ctx = processed.getContext('2d');
    const imgData = ctx.getImageData(0, 0, w, h);
    const fname = 'image-export_' + new Date().toISOString().slice(0, 10);

    try {
      switch (format) {
        case 'png':
          savePNG(processed.toDataURL('image/png'), fname + '.png');
          break;
        case 'jpeg':
          savePNG(processed.toDataURL('image/jpeg', state.exportSettings.jpegQuality), fname + '.jpg');
          break;
        case 'tiff':
          saveBinaryBlob(buildTIFF(imgData, w, h), fname + '.tiff', 'image/tiff');
          break;
        case 'svg':
          downloadText(buildSVGFromImage(processed.toDataURL('image/png'), w, h), fname + '.svg');
          break;
        case 'pdf':
          await buildPDFFromImage(processed.toDataURL('image/jpeg', 0.9), w, h, fname + '.pdf');
          break;
        case 'bmp':
          const bmp = state.exportSettings.bmp8bit ? buildBMP8Bit(imgData, w, h) : buildBMP(imgData, w, h);
          saveBinaryBlob(bmp, fname + '.bmp', 'image/bmp');
          break;
      }
      toast('✅ ' + format.toUpperCase() + ' Exported!', 'success');
    } catch (e) { toast('Error: ' + e.message, 'error'); }
    showProcessing(false);
  }

  // ──────────────────────────────────────────────────
  // Smart downloader — tries showSaveFilePicker (native OS dialog) first,
  // falls back to data:text/plain URI (works in file:// without UUID names)
  // ──────────────────────────────────────────────────
  const MIME_MAP = {
    svg: 'image/svg+xml',
    dxf: 'text/plain',
    gcode: 'text/plain',
    nc: 'text/plain',
    pdf: 'application/pdf',
  };

  async function downloadText(content, filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const mime = MIME_MAP[ext] || 'text/plain';

    // ① Try native File System Access API (Chrome 86+, Edge 86+)
    if (typeof window.showSaveFilePicker === 'function') {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: ext.toUpperCase() + ' file', accept: { [mime]: ['.' + ext] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        return; // Success via native dialog
      } catch (e) {
        if (e.name === 'AbortError') return; // User cancelled
        // Fall through to fallback
      }
    }

    // ② Fallback: data:text/plain URI — Chrome respects 'download' attr for text/* data URIs even on file://
    const a = document.createElement('a');
    a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
    a.setAttribute('download', filename);
    a.style.position = 'fixed';
    a.style.opacity = '0';
    document.body.appendChild(a);
    a.dispatchEvent(new MouseEvent('click', { bubbles: false, cancelable: true, view: window }));
    setTimeout(() => document.body.removeChild(a), 500);
  }

  async function savePNG(dataURL, filename) {
    // Native dialog for PNG
    if (typeof window.showSaveFilePicker === 'function') {
      try {
        const res = await fetch(dataURL);
        const blob = await res.blob();
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: 'PNG Image', accept: { 'image/png': ['.png'] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    // Fallback: direct data URI
    const a = document.createElement('a');
    a.href = dataURL;
    a.setAttribute('download', filename);
    a.style.position = 'fixed';
    a.style.opacity = '0';
    document.body.appendChild(a);
    a.dispatchEvent(new MouseEvent('click', { bubbles: false, cancelable: true, view: window }));
    setTimeout(() => document.body.removeChild(a), 500);
  }

  function enableExports(on) {
    ['btnExportSVG', 'btnExportDXF', 'btnExportPNG', 'btnExportGcode', 'btnExportPDF', 'btnExportNC',
     'btnExportBMP', 'btnExportJPEG', 'btnExportTIFF', 'btnVecPreview', 'btnVecBatchZip',
     'btnSimulate', 'btnExportSTL', 'btnViewAR'].forEach(id => {
      const el = $(id); if (el) el.disabled = !on;
    });
    document.querySelectorAll('.export-card:not(.img-export-card)').forEach(c => c.classList.toggle('disabled', !on));
  }

  function enableImageExports(on) {
    ['btnImgExportPNG', 'btnImgExportJPEG', 'btnImgExportTIFF', 'btnImgExportSVG', 'btnImgExportPDF', 'btnImgExportBMP'].forEach(id => {
      const el = $(id); if (el) el.disabled = !on;
    });
    document.querySelectorAll('.img-export-card').forEach(c => c.classList.toggle('disabled', !on));
    // Also enable batch and preview
    if ($('btnImgPreview')) $('btnImgPreview').disabled = !on;
    if ($('btnImgBatchZip')) $('btnImgBatchZip').disabled = !on;
  }

  // ── Zoom ───────────────────────────────────────────────
  function setupZoom() {
    if ($('btnZoomIn')) $('btnZoomIn').addEventListener('click', () => setZoom(state.zoom * 1.25));
    if ($('btnZoomOut')) $('btnZoomOut').addEventListener('click', () => setZoom(state.zoom * 0.8));
    if ($('btnResetZoom')) $('btnResetZoom').addEventListener('click', () => setZoom(1));
  }

  function setZoom(z) {
    state.zoom = Math.max(0.2, Math.min(5, z));
    $('zoomVal').textContent = Math.round(state.zoom * 100) + '%';
    ['canvasOrig', 'canvasVec'].forEach(id => {
      const el = $(id); if (el) { el.style.transform = 'scale(' + state.zoom + ')'; el.style.transformOrigin = 'top left'; }
    });
  }

  // ── Vector Eraser ──────────────────────────────────────
  function setupEraser() {
    const btn = $('btnEraser');
    const cv = $('canvasVec');
    if (!btn || !cv) return;

    btn.addEventListener('click', () => {
      state.eraserMode = !state.eraserMode;
      if (state.eraserMode) {
        btn.style.background = '#ef4444';
        btn.style.color = '#ffffff';
        cv.style.cursor = 'crosshair';
        toast(currentLang === 'fr' ? 'Outil Gomme actif. Cliquez sur un tracé pour le supprimer.' : 'Eraser Tool active. Click a path on the right to remove it.', 'info');
      } else {
        btn.style.background = 'var(--surface2)';
        btn.style.color = '#ef4444';
        cv.style.cursor = 'default';
      }
    });

    cv.addEventListener('click', (e) => {
      if (!state.eraserMode || !state.vectorPaths || !state.vectorPaths.length) return;

      // Unpack click coords, scaled by CSS transform zoom
      const rect = cv.getBoundingClientRect();
      // The display size vs internal size
      const scaleX = cv.width / (rect.width / state.zoom);
      const scaleY = cv.height / (rect.height / state.zoom);

      // Precise canvas hit coordinate
      const hitX = (e.clientX - rect.left) / state.zoom * scaleX;
      const hitY = (e.clientY - rect.top) / state.zoom * scaleY;

      const isColor = state.settings.mode === 'color';
      let found = false;

      const searchDist = 8; // Pixel distance threshold to delete a path

      if (isColor) {
        for (let idxLLayer = state.vectorPaths.length - 1; idxLLayer >= 0; idxLLayer--) {
          const layer = state.vectorPaths[idxLLayer];
          for (let i = layer.length - 1; i >= 0; i--) {
            if (pathHitTest(layer[i], hitX, hitY, searchDist)) {
              layer.splice(i, 1);
              found = true;
              break;
            }
          }
          if (found) break; // Deleted one path, stop
        }
      } else {
        for (let i = state.vectorPaths.length - 1; i >= 0; i--) {
          if (pathHitTest(state.vectorPaths[i], hitX, hitY, searchDist)) {
            state.vectorPaths.splice(i, 1);
            found = true;
            break; // Deleted one path, stop
          }
        }
      }

      if (found) {
        // Re-render
        drawVectorPreview(state.vectorPaths, cv.width, cv.height);
        // Calculate new stats
        let pathCount = 0; let n = 0;
        if (isColor) {
          state.vectorPaths.forEach(l => { pathCount += l.length; l.forEach(p => n += p.length); });
        } else {
          pathCount = state.vectorPaths.length;
          state.vectorPaths.forEach(p => n += p.length);
        }
        state.stats.paths = pathCount;
        state.stats.nodes = n;
        state.svgOutput = buildSVG(state.vectorPaths, cv.width, cv.height);
        updateStats();
        updateLayers(state.vectorPaths);
      }
    });
  }

  // Point-to-Line-Segment distance helper calculation
  function distToSegmentSquared(p, v, w) {
    const l2 = (v[0] - w[0]) ** 2 + (v[1] - w[1]) ** 2;
    if (l2 === 0) return (p.x - v[0]) ** 2 + (p.y - v[1]) ** 2;
    let t = ((p.x - v[0]) * (w[0] - v[0]) + (p.y - v[1]) * (w[1] - v[1])) / l2;
    t = Math.max(0, Math.min(1, t));
    return (p.x - (v[0] + t * (w[0] - v[0]))) ** 2 + (p.y - (v[1] + t * (w[1] - v[1]))) ** 2;
  }
  function pathHitTest(path, hitX, hitY, threshold) {
    if (path.length < 2) return false;
    const sqThresh = threshold ** 2;
    const pt = { x: hitX, y: hitY };
    for (let i = 1; i < path.length; i++) {
      if (distToSegmentSquared(pt, path[i - 1], path[i]) <= sqThresh) {
        return true;
      }
    }
    // For closed contour endpoints, also check the last line connecting back to the start
    if (state.settings.mode !== 'centerline') {
      if (distToSegmentSquared(pt, path[path.length - 1], path[0]) <= sqThresh) return true;
    }
    return false;
  }

  // ── Stats (live sync with physical mm output settings) ──
  function updateStats() {
    if ($('statPaths')) $('statPaths').textContent = state.stats.paths || '—';
    if ($('statNodes')) $('statNodes').textContent = state.stats.nodes > 0 ? (state.stats.nodes > 999 ? (state.stats.nodes / 1000).toFixed(1) + 'K' : state.stats.nodes) : '—';
    if ($('statWidth')) $('statWidth').textContent = state.stats.width || '—';
    if ($('statHeight')) $('statHeight').textContent = state.stats.height || '—';
    const refW = state.vectorDims.w || (state.originalCanvas ? state.originalCanvas.width : state.stats.width);
    const refH = state.vectorDims.h || (state.originalCanvas ? state.originalCanvas.height : state.stats.height);
    if (refW && refH) {
      const { physW, physH } = getPhysicalDimensionsMm(refW, refH);
      if ($('statW')) $('statW').textContent = physW.toFixed(1);
      if ($('statH')) $('statH').textContent = physH.toFixed(1);
    } else {
      if ($('statW')) $('statW').textContent = '0';
      if ($('statH')) $('statH').textContent = '0';
    }
  }

  function updateLayers(paths) {
    const list = $('layersList');
    if (!list) return;
    list.innerHTML = '';
    if (!paths || !paths.length) {
      list.innerHTML = `<p style="color:var(--muted);font-size:12px;text-align:center;padding:12px">
        <span data-en>No vectors. Vectorize an image first.</span>
        <span data-fr>Aucun vecteur. Vectorisez d'abord une image.</span>
      </p>`;
      return;
    }

    const items = [];
    if (state.settings.mode === 'color') {
      paths.forEach((layer, idx) => {
        if (!layer || !layer.length) return;
        items.push({
          color: layer.colorData || '#4f8eff',
          name: (layer.colorName || ('Color ' + (idx + 1))),
          count: layer.length + (currentLang === 'fr' ? ' tracés' : ' paths')
        });
      });
    } else {
      const closed = paths.filter(p => p.closed !== false && state.settings.mode !== 'centerline');
      const open = paths.filter(p => p.closed === false || state.settings.mode === 'centerline');
      if (closed.length && window.VectorEngine) {
        const depths = window.VectorEngine.analyzeNesting(closed);
        let holeCount = 0, outerCount = 0;
        depths.forEach(d => { if (d % 2 === 1) holeCount++; else outerCount++; });
        if (holeCount) items.push({ color: '#06d6a0', name: currentLang === 'fr' ? 'Trous intérieurs (Priorité 1)' : 'Inner Holes (Cut 1st)', count: holeCount + (currentLang === 'fr' ? ' tracés' : ' paths') });
        if (outerCount) items.push({ color: '#4f8eff', name: currentLang === 'fr' ? 'Contours extérieurs' : 'Outer Contours', count: outerCount + (currentLang === 'fr' ? ' tracés' : ' paths') });
      }
      if (open.length) {
        items.push({ color: '#f59e0b', name: currentLang === 'fr' ? 'Gravure / Axe médian' : 'Engrave / Centerline', count: open.length + (currentLang === 'fr' ? ' tracés' : ' paths') });
      }
    }

    items.forEach(it => {
      const div = document.createElement('div');
      div.className = 'layer-item';
      div.innerHTML = `<div class="layer-color" style="background:${it.color}"></div><span class="layer-name">${it.name}</span><span class="layer-count">${it.count}</span>`;
      list.appendChild(div);
    });
  }

  // Unified synchronized 90° rotate & flip across Original Canvas, Vector Paths & Previews
  function applyTransform(kind) {
    const cvOrig = $('canvasOrig');
    if (!cvOrig || !state.originalImage) return;

    const oldW = cvOrig.width, oldH = cvOrig.height;
    const isRot = kind === 'rot90' || kind === 'rot-90';
    const newW = isRot ? oldH : oldW;
    const newH = isRot ? oldW : oldH;

    // 1. Transform source pixels onto offscreen canvas & update state.originalImage cleanly
    const off = document.createElement('canvas');
    off.width = newW; off.height = newH;
    const octx = off.getContext('2d');
    octx.save();
    if (kind === 'rot90') { octx.translate(newW, 0); octx.rotate(Math.PI / 2); }
    else if (kind === 'rot-90') { octx.translate(0, newH); octx.rotate(-Math.PI / 2); }
    else if (kind === 'flipH') { octx.translate(newW, 0); octx.scale(-1, 1); }
    else if (kind === 'flipV') { octx.translate(0, newH); octx.scale(1, -1); }
    octx.drawImage(cvOrig, 0, 0);
    octx.restore();

    cvOrig.width = newW; cvOrig.height = newH;
    cvOrig.getContext('2d').drawImage(off, 0, 0);
    const updatedImg = new Image();
    updatedImg.src = off.toDataURL('image/png');
    state.originalImage = updatedImg;
    state.stats.width = newW;
    state.stats.height = newH;

    // 2. Transform vectors synchronously if present
    if (state.vectorPaths.length) {
      const vw = state.vectorDims.w || oldW;
      const vh = state.vectorDims.h || oldH;
      const nvw = isRot ? vh : vw;
      const nvh = isRot ? vw : vh;
      const mapPt = ([x, y]) => {
        if (kind === 'rot90') return [vh - y, x];
        if (kind === 'rot-90') return [y, vw - x];
        if (kind === 'flipH') return [vw - x, y];
        return [x, vh - y];
      };
      const mapArr = arr => arr.map(p => {
        const np = p.map(mapPt);
        np.closed = p.closed;
        return np;
      });
      if (state.settings.mode === 'color') {
        state.vectorPaths = state.vectorPaths.map(layer => {
          const nlLayer = mapArr(layer);
          nlLayer.colorData = layer.colorData;
          nlLayer.colorName = layer.colorName;
          return nlLayer;
        });
      } else {
        state.vectorPaths = mapArr(state.vectorPaths);
      }
      state.vectorDims = { w: nvw, h: nvh };
      state.svgOutput = buildSVG(state.vectorPaths, nvw, nvh);
      drawVectorPreview(state.vectorPaths, nvw, nvh);
      updateLayers(state.vectorPaths);
    }
    updateStats();
  }

  // ── Utilities ──────────────────────────────────────────
  function showProcessing(show, txt = '') {
    const ov = $('processingOverlay');
    if (!ov) return;
    ov.classList.toggle('show', show);
    const pt = $('procText');
    if (pt && txt) pt.textContent = txt;
    if (!show) updateProgress(0);
  }

  function updateProgress(pct) {
    const fill = $('progressFill');
    if (fill) fill.style.width = pct + '%';
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // Toast
  let toastTimer = null;
  function toast(msg, type = 'info') {
    const container = $('toastContainer');
    if (!container) {
      console.warn(`Toast: [${type}] ${msg}`);
      return;
    }
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    el.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 500); }, 3500);
  }

  function refreshLang() {
    if (state.vectorPaths && state.vectorPaths.length) updateLayers(state.vectorPaths);
  }

  return { init, applyTransform, loadDemoPreset, exportSTL, launchARViewer, refreshLang };
})();
window.App = App;

// ── i18n ────────────────────────────────────────────────
const LANG = {
  en: {
    invalidFile: 'Invalid file. Supported: SVG, JPG, PNG, BMP, WebP, TIFF',
    imageLoaded: 'Image loaded:',
    noImage: 'Please load an image first!',
    processing: 'Processing image…',
    pathsVectorized: 'paths vectorized successfully!',
    vectorError: 'Vectorization error',
    noVector: 'Please vectorize an image first!',
    exportPreview: 'Preparing export…',
    batchExport: 'Building Batch ZIP…',
    downloadReady: 'Download ready!'
  },
  fr: {
    invalidFile: 'Fichier invalide. Formats acceptés: SVG, JPG, PNG, BMP, WebP, TIFF',
    imageLoaded: 'Image chargée:',
    noImage: 'Veuillez d\'abord charger une image!',
    processing: 'Traitement de l\'image…',
    pathsVectorized: 'tracés vectorisés avec succès!',
    vectorError: 'Erreur de vectorisation',
    noVector: 'Veuillez d\'abord vectoriser une image!',
    exportPreview: 'Préparation de l\'aperçu...',
    batchExport: 'Génération du ZIP...',
    downloadReady: 'Téléchargement prêt!',
  }
};

let currentLang = 'en';
function t(key) { return (LANG[currentLang] || LANG.en)[key] || key; }

function switchLang(lang) {
  currentLang = lang;
  document.documentElement.classList.toggle('fr', lang === 'fr');
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
  if (window.App && App.refreshLang) App.refreshLang();
}

document.addEventListener('DOMContentLoaded', () => {
  App.init();
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.addEventListener('click', () => switchLang(b.dataset.lang));
  });
});
