// ═══════════════════════════════════════════════════════
//  CNC VECTOR STUDIO — Main Application JavaScript
// ═══════════════════════════════════════════════════════

const App = (() => {
  // ── State ──────────────────────────────────────────────
  const state = {
    originalImage: null,
    originalCanvas: null,
    vectorPaths: [],
    svgOutput: '',
    zoom: 1,
    settings: {
      brightness: 0, contrast: 0, blur: 0,
      threshold: 128, invert: false, grayscale: true,
      mode: 'edge',          // edge | contour | centerline | halftone
      detail: 1.5,
      smoothing: 2,
      minArea: 20,
      maxArea: 999999,
      // CNC
      material: 'wood',
      laserPower: 80,
      speed: 1000,
      passes: 1,
      kerf: 0,
      units: 'mm',
      machine: 'generic'
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

  // ── Upload ─────────────────────────────────────────────
  function setupUpload() {
    const zone = $('uploadZone');
    const input = $('fileInput');
    zone.addEventListener('click', () => input.click());
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault(); zone.classList.remove('drag-over');
      const f = e.dataTransfer.files[0];
      if (f) loadFile(f);
    });
    input.addEventListener('change', () => { if (input.files[0]) loadFile(input.files[0]); });
  }

  function loadFile(file) {
    if (!file.type.startsWith('image/')) { toast(t('invalidFile'), 'error'); return; }
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        state.originalImage = img;
        state.stats.width = img.naturalWidth;
        state.stats.height = img.naturalHeight;
        drawOriginal(img);
        updateStats();
        // Switch to adjust tab
        setTab('adjust');
        toast('✅ ' + t('imageLoaded') + ' ' + img.naturalWidth + '×' + img.naturalHeight + 'px', 'success');
        $('fileName').textContent = file.name;
        $('fileSize').textContent = (file.size / 1024).toFixed(1) + ' KB';
        $('fileDims').textContent = img.naturalWidth + ' × ' + img.naturalHeight;
        // Enable vectorize btn
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
    if (state.settings.grayscale || state.settings.threshold > 0) {
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
    // simple box blur
    for (let pass = 0; pass < Math.min(r, 4); pass++) {
      const d = ctx.getImageData(0, 0, w, h);
      const src = new Uint8ClampedArray(d.data);
      const dst = d.data;
      const R = 1;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let r = 0, g = 0, b = 0, cnt = 0;
        for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
          const ny = y + dy, nx = x + dx;
          if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
            const i = (ny * w + nx) * 4; r += src[i]; g += src[i + 1]; b += src[i + 2]; cnt++;
          }
        }
        const i = (y * w + x) * 4; dst[i] = r / cnt; dst[i + 1] = g / cnt; dst[i + 2] = b / cnt;
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
      ['hatchSpacing', 'hatchSpacingVal', 2.0]
    ];
    sliders.forEach(([sid, vid]) => {
      const sl = $(sid), vl = $(vid);
      if (!sl || !vl) return;
      vl.textContent = sl.value;
      sl.addEventListener('input', () => {
        vl.textContent = sl.value;
        state.settings[sid] = parseFloat(sl.value);
        if (['brightness', 'contrast', 'blur', 'invert', 'grayscale', 'threshold'].includes(sid)) {
          refreshOriginal();
        }
      });
    });

    // toggles
    ['invertToggle', 'grayscaleToggle', 'bezierToggle', 'hatchToggle'].forEach(id => {
      const el = $(id);
      if (el) el.addEventListener('change', () => {
        state.settings[id.replace('Toggle', '')] = el.checked;

        if (id === 'hatchToggle') {
          $('hatchOptions').style.display = el.checked ? 'flex' : 'none';
          if (state.vectorPaths.length) vectorize();
        } else if (id === 'bezierToggle' && state.vectorPaths.length) {
          const cv = state.originalCanvas || $('canvasOrig');
          drawVectorPreview(state.vectorPaths, cv.width, cv.height);
          state.svgOutput = buildSVG(state.vectorPaths, cv.width, cv.height);
        } else if (id !== 'bezierToggle') {
          refreshOriginal();
        }
      });
    });

    // mode chips
    document.querySelectorAll('.mode-chip').forEach(c => {
      c.addEventListener('click', () => {
        document.querySelectorAll('.mode-chip').forEach(b => b.classList.remove('active'));
        c.classList.add('active');
        state.settings.mode = c.dataset.mode;

        // Show/hide Color Options
        if (state.settings.mode === 'color') {
          $('colorOptions').style.display = 'block';
        } else {
          $('colorOptions').style.display = 'none';
        }

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
    };
    const checkAdd = (id, evt, fn) => { const el = $(id); if (el) el.addEventListener(evt, fn); };

    checkAdd('exportWidth', 'input', updateSize);
    checkAdd('exportHeight', 'input', updateSize);
    checkAdd('exportSizeUnit', 'change', (e) => state.exportSettings.unit = e.target.value);

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
    checkAdd('exportDPI', 'change', (e) => state.exportSettings.dpi = parseInt(e.target.value));
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

  // ── Vectorize ──────────────────────────────────────────
  async function vectorize() {
    if (!state.originalCanvas) { toast(t('noImage'), 'error'); return; }
    if (state.processing) return;
    state.processing = true;
    const btn = $('btnVectorize');
    if (btn) btn.disabled = true;
    showProcessing(true, t('processing'));
    updateProgress(10);
    await sleep(60);

    try {
      const cv = state.originalCanvas;
      const ctx = cv.getContext('2d');
      const w = cv.width, h = cv.height;

      // Get pixel data
      const imgData = ctx.getImageData(0, 0, w, h);
      updateProgress(25);
      await sleep(40);

      // Threshold → binary map
      const bin = threshold(imgData, state.settings.threshold);
      updateProgress(40);
      await sleep(40);

      let paths = [];
      const mode = state.settings.mode;

      if (mode === 'halftone') {
        paths = halftone(imgData, w, h);
      } else if (mode === 'centerline') {
        // Pro Feature: True Centerline Tracing (Single line)
        const thinned = zhangSuenThinning(bin, w, h);
        paths = extractSkeletonPaths(thinned, w, h);
      } else if (mode === 'color') {
        // Pro Feature: Multi-Layer Color Trace
        // 1. Quantize image to N colors
        const { quantizedData, palette } = kMeansQuantize(imgData, state.settings.colorCount);
        // 2. Extract contours for each color separately
        paths = extractColorLayers(quantizedData, palette, w, h);
      } else {
        // All other modes: proper Marching Squares closed contour extraction
        paths = msContours(bin, w, h);
      }

      updateProgress(65);
      await sleep(40);

      // Simplify
      const tol = state.settings.detail;
      if (mode === 'color') {
        // handle grouped layers array
        paths = paths.map(layer => {
          return layer.map(p => rdpSimplify(p, tol)).filter(p => p.length >= 2);
        });
      } else {
        paths = paths.map(p => rdpSimplify(p, tol)).filter(p => p.length >= 2);
      }

      // Filter by area
      if (mode !== 'centerline') {
        if (mode === 'color') {
          paths = paths.map(layer => layer.filter(p => {
            const a = pathArea(p); return a >= state.settings.minArea && a <= state.settings.maxArea;
          }));
        } else {
          paths = paths.filter(p => {
            const a = pathArea(p);
            return a >= state.settings.minArea && a <= state.settings.maxArea;
          });
        }
      }

      // Pro Feature: Hatch Fill (Laser Interior Scanlines)
      if (state.settings.hatch && mode !== 'centerline' && mode !== 'halftone') {
        const spacing = state.settings.hatchSpacing;
        if (mode === 'color') {
          paths = paths.map(layer => {
            const hatchPaths = generateHatchFill(layer, spacing);
            const combined = layer.concat(hatchPaths);
            combined.colorData = layer.colorData;
            combined.colorName = layer.colorName;
            return combined;
          });
        } else {
          const hatchPaths = generateHatchFill(paths, spacing);
          paths = paths.concat(hatchPaths);
        }
      }

      updateProgress(85);
      await sleep(40);

      state.vectorPaths = paths;
      state.stats.paths = paths.length;
      state.stats.nodes = paths.reduce((s, p) => s + p.length, 0);
      state.stats.area = Math.round(w * h * 0.0001) / 10;

      // Build SVG
      state.svgOutput = buildSVG(paths, w, h);

      // Draw vector preview
      drawVectorPreview(paths, w, h);
      updateStats();
      updateLayers(paths);

      updateProgress(100);
      showProcessing(false);
      toast('✅ ' + paths.length + ' ' + t('pathsVectorized'), 'success');
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
    btn.disabled = false;
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

  // Ramer–Douglas–Peucker simplification
  function rdpSimplify(pts, epsilon) {
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
      const left = rdpSimplify(pts.slice(0, maxIdx + 1), epsilon);
      const right = rdpSimplify(pts.slice(maxIdx), epsilon);
      return [...left.slice(0, -1), ...right];
    }
    return [pts[0], pts[pts.length - 1]];
  }

  function pathArea(pts) {
    let a = 0;
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
      a += x1 * y2 - x2 * y1;
    }
    return Math.abs(a) / 2;
  }

  // ── Pro Feature: Grid Array (Mass Production) ──────────
  function generateGridArray(basePaths, baseW, baseH, cols, rows, spaceX, spaceY, isColorMode) {
    if (cols <= 1 && rows <= 1) return { paths: basePaths, w: baseW, h: baseH };

    const outPaths = [];
    const totalW = (baseW * cols) + (spaceX * (cols - 1));
    const totalH = (baseH * rows) + (spaceY * (rows - 1));

    if (isColorMode) {
      // Initialize layers array
      for (let l = 0; l < basePaths.length; l++) {
        const newLayer = [];
        newLayer.colorData = basePaths[l].colorData;
        newLayer.colorName = basePaths[l].colorName;
        outPaths.push(newLayer);
      }

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const offsetX = c * (baseW + spaceX);
          const offsetY = r * (baseH + spaceY);

          for (let l = 0; l < basePaths.length; l++) {
            const layer = basePaths[l];
            for (const p of layer) {
              outPaths[l].push(p.map(pt => [pt[0] + offsetX, pt[1] + offsetY]));
            }
          }
        }
      }
    } else {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const offsetX = c * (baseW + spaceX);
          const offsetY = r * (baseH + spaceY);
          for (const p of basePaths) {
            outPaths.push(p.map(pt => [pt[0] + offsetX, pt[1] + offsetY]));
          }
        }
      }
    }

    return { paths: outPaths, w: totalW, h: totalH };
  }

  // ── SVG Builder ────────────────────────────────────────
  function buildSVG(paths, w, h, options = {}) {
    const {
      title = 'CNC Vector Output',
      strokeColor = state.settings.mode === 'centerline' ? '#000000' : 'none',
      strokeWidth = state.settings.mode === 'centerline' ? 1 : 0,
      fillColor = state.settings.mode === 'centerline' ? 'none' : '#000000',
      bg = '#ffffff'
    } = options;
    const smooth = state.settings.bezier;

    const buildPathStr = (pathArray) => {
      let d = '';
      for (const path of pathArray) {
        if (path.length < 2) continue;
        d += 'M' + path[0][0].toFixed(2) + ',' + path[0][1].toFixed(2);
        if (!smooth || path.length < 3) {
          for (let i = 1; i < path.length; i++) d += 'L' + path[i][0].toFixed(2) + ',' + path[i][1].toFixed(2);
        } else {
          const tension = 0.2;
          const len = path.length;
          const isClosed = Math.hypot(path[0][0] - path[len - 1][0], path[0][1] - path[len - 1][1]) < 2;
          for (let i = 0; i < len - 1; i++) {
            const p0 = isClosed ? path[(i - 1 + len - 1) % (len - 1)] : (i === 0 ? path[0] : path[i - 1]);
            const p1 = path[i];
            const p2 = path[i + 1];
            const p3 = isClosed ? path[(i + 2) % (len - 1)] : (i + 2 === len ? path[len - 1] : path[i + 2]);
            let t1x = (p2[0] - p0[0]) * tension;
            let t1y = (p2[1] - p0[1]) * tension;
            let t2x = (p3[0] - p1[0]) * tension;
            let t2y = (p3[1] - p1[1]) * tension;
            if (!isClosed && i === 0) { t1x = 0; t1y = 0; }
            if (!isClosed && i === len - 2) { t2x = 0; t2y = 0; }
            const c1x = p1[0] + t1x, c1y = p1[1] + t1y;
            const c2x = p2[0] - t2x, c2y = p2[1] - t2y;
            d += `C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
          }
        }
        if (state.settings.mode !== 'centerline') d += 'Z';
      }
      return d;
    };

    let contentStr = '';

    if (state.settings.mode === 'color') {
      // Multi-layer SVG
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
      const dStr = buildPathStr(paths);
      contentStr = `\n  <g id="layer1" inkscape:label="CNC Layer 1" inkscape:groupmode="layer">
    <path d="${dStr}" fill="${fillColor}" fill-rule="evenodd" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
     width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <title>${title}</title>
  <desc>Generated by CNC Vector Studio — ${new Date().toISOString()}</desc>
  <rect width="${w}" height="${h}" fill="${bg}"/>${contentStr}
</svg>`;
  }

  // ── DXF Builder ────────────────────────────────────────
  function buildDXF(paths, w, h) {
    const lines = [];
    const hdr = (k, v) => lines.push(k + '\n' + v);
    hdr(0, 'SECTION'); hdr(2, 'HEADER');
    hdr(9, '$ACADVER'); hdr(1, 'AC1009');
    hdr(9, '$EXTMIN'); hdr(10, '0.0'); hdr(20, '0.0');
    hdr(9, '$EXTMAX'); hdr(10, w); hdr(20, h);
    hdr(0, 'ENDSEC');
    hdr(0, 'SECTION'); hdr(2, 'ENTITIES');
    for (const path of paths) {
      if (path.length < 2) continue;
      hdr(0, 'POLYLINE'); hdr(8, '0'); hdr(66, '1'); hdr(70, '0');
      for (const [x, y] of path) {
        hdr(0, 'VERTEX'); hdr(8, '0'); hdr(10, x.toFixed(4)); hdr(20, (h - y).toFixed(4)); hdr(30, '0.0');
      }
      hdr(0, 'SEQEND');
    }
    hdr(0, 'ENDSEC'); hdr(0, 'EOF');
    return lines.join('\n');
  }

  // ── G-code Builder ─────────────────────────────────────
  function buildGcode(paths, w, h) {
    const s = state.settings;
    const scale = 0.1; // px to mm approx
    const lines = [];
    lines.push('; CNC Vector Studio — G-code Export');
    lines.push('; Material: ' + s.material);
    lines.push('; Laser Power: ' + s.laserPower + '%');
    lines.push('; Speed: ' + s.speed + ' mm/min');
    lines.push('; Passes: ' + s.passes);
    lines.push('; Generated: ' + new Date().toISOString());
    lines.push('G21 ; mm units');
    lines.push('G90 ; absolute');
    lines.push('G28 ; home');
    lines.push('M5 ; laser off');
    lines.push('F' + s.speed);

    for (let pass = 0; pass < s.passes; pass++) {
      lines.push('; Pass ' + (pass + 1));
      for (const path of paths) {
        if (path.length < 2) continue;
        const [x0, y0] = path[0];
        lines.push('G0 X' + (x0 * scale).toFixed(3) + ' Y' + ((h - y0) * scale).toFixed(3));
        lines.push('M3 S' + Math.round(s.laserPower * 10) + ' ; laser on');
        for (let i = 1; i < path.length; i++) {
          const [x, y] = path[i];
          lines.push('G1 X' + (x * scale).toFixed(3) + ' Y' + ((h - y) * scale).toFixed(3));
        }
        lines.push('M5 ; laser off');
      }
    }
    lines.push('G28 ; home');
    lines.push('M30 ; end program');
    return lines.join('\n');
  }

  // ── PDF Builder (vector paths, filled) ─────────────────
  function buildPDF(paths, w, h) {
    let pdfPath = '';
    const smooth = state.settings.bezier;

    const buildPdfStream = (pathArray, r, g, b, isStrokeMode) => {
      let stream = '';
      if (isStrokeMode) {
        stream += `${r} ${g} ${b} RG\n0.5 w\n`; // Stroke color
      } else {
        stream += `${r} ${g} ${b} rg\n`; // Fill color
      }

      for (const path of pathArray) {
        if (path.length < 2) continue;
        stream += path[0][0].toFixed(2) + ' ' + (h - path[0][1]).toFixed(2) + ' m ';

        if (!smooth || path.length < 3) {
          for (let i = 1; i < path.length; i++) stream += path[i][0].toFixed(2) + ' ' + (h - path[i][1]).toFixed(2) + ' l ';
        } else {
          const tension = 0.2;
          const len = path.length;
          const isClosed = Math.hypot(path[0][0] - path[len - 1][0], path[0][1] - path[len - 1][1]) < 2;
          for (let i = 0; i < len - 1; i++) {
            const p0 = isClosed ? path[(i - 1 + len - 1) % (len - 1)] : (i === 0 ? path[0] : path[i - 1]);
            const p1 = path[i];
            const p2 = path[i + 1];
            const p3 = isClosed ? path[(i + 2) % (len - 1)] : (i + 2 === len ? path[len - 1] : path[i + 2]);
            let t1x = (p2[0] - p0[0]) * tension, t1y = (p2[1] - p0[1]) * tension;
            let t2x = (p3[0] - p1[0]) * tension, t2y = (p3[1] - p1[1]) * tension;
            if (!isClosed && i === 0) { t1x = 0; t1y = 0; }
            if (!isClosed && i === len - 2) { t2x = 0; t2y = 0; }
            const c1x = p1[0] + t1x, c1y = p1[1] + t1y;
            const c2x = p2[0] - t2x, c2y = p2[1] - t2y;
            stream += c1x.toFixed(2) + ' ' + (h - c1y).toFixed(2) + ' ' +
              c2x.toFixed(2) + ' ' + (h - c2y).toFixed(2) + ' ' +
              p2[0].toFixed(2) + ' ' + (h - p2[1]).toFixed(2) + ' c ';
          }
        }
        stream += isStrokeMode ? 'S ' : 'f ';
      }
      return stream + '\n';
    };

    if (state.settings.mode === 'color') {
      for (const layer of paths) {
        // Convert hex to RGB pdf scale (0-1)
        const hex = layer.colorData || '#111111';
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        pdfPath += buildPdfStream(layer, r.toFixed(3), g.toFixed(3), b.toFixed(3), false);
      }
    } else {
      const isStrokeMode = state.settings.mode === 'centerline';
      pdfPath = buildPdfStream(paths, 0, 0, 0, isStrokeMode);
    }

    const stream = pdfPath;
    const streamBytes = new TextEncoder().encode(stream).length;
    const pages = `1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n2 0 obj\n<</Type /Pages /Kids[3 0 R] /Count 1>>\nendobj\n3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox[0 0 ${w} ${h}] /Contents 4 0 R /Resources<</ProcSet[/PDF]>>>>\nendobj\n4 0 obj\n<</Length ${streamBytes}>>\nstream\n${stream}\nendstream\nendobj\n`;
    const xref = `xref\n0 5\n0000000000 65535 f \n`;
    return `%PDF-1.4\n${pages}${xref}trailer\n<</Size 5 /Root 1 0 R>>\nstartxref\n${pages.length + 10}\n%%EOF`;
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

  // ── Pro Feature: Live Simulation & Time Estimation ────
  let simRafId = null;
  function runSimulation(paths, w, h) {
    if (!paths || paths.length === 0) return;

    // Stop any running sim
    if (simRafId) cancelAnimationFrame(simRafId);

    // Unpack paths if in color mode
    const flatPaths = state.settings.mode === 'color' ? paths.flat() : paths;

    // 1. Calculate distances
    let travelDist = 0; // mm (laser off)
    let cutDist = 0;    // mm (laser on)

    // Calculate mm from pixels (approximated based on 0.1 mm/px standard for these exports)
    const scale = 0.1;

    for (let i = 0; i < flatPaths.length; i++) {
      const path = flatPaths[i];
      if (path.length < 2) continue;

      // Travel from last endpoint to this start point
      if (i > 0) {
        const lastPath = flatPaths[i - 1];
        const lastPt = lastPath[lastPath.length - 1];
        travelDist += Math.hypot((path[0][0] - lastPt[0]) * scale, (path[0][1] - lastPt[1]) * scale);
      }

      // Cut distance
      for (let j = 1; j < path.length; j++) {
        cutDist += Math.hypot((path[j][0] - path[j - 1][0]) * scale, (path[j][1] - path[j - 1][1]) * scale);
      }
    }

    // 2. Estimate time
    const speed = state.settings.speed;     // mm/min for cut
    const rapidSpeed = 3000;                // mm/min hardcoded travel speed assumption
    const totalMin = (cutDist / speed) + (travelDist / rapidSpeed);
    const totalSec = Math.round(totalMin * 60);
    const mm = Math.floor(totalSec / 60);
    const ss = String(totalSec % 60).padStart(2, '0');

    // 3. UI Updates
    $('simTimeEst').textContent = `${mm}:${ss}`;
    $('simCutDist').textContent = cutDist.toFixed(1) + 'mm';
    $('simTravelDist').textContent = travelDist.toFixed(1) + 'mm';
    $('simOverlay').style.display = 'block';

    const stopBtn = $('btnStopSim');
    const cleanup = () => {
      if (simRafId) cancelAnimationFrame(simRafId);
      $('simOverlay').style.display = 'none';
      drawVectorPreview(state.vectorPaths, w, h); // reset canvas
      stopBtn.removeEventListener('click', cleanup);
    };
    stopBtn.addEventListener('click', cleanup);

    // 4. Animation runner
    const cv = $('canvasVec');
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    let pathIdx = 0;
    let ptIdx = 1;
    let totalPts = flatPaths.reduce((acc, p) => acc + p.length, 0);
    let ptsDrawn = 0;

    const drawFrame = () => {
      // Draw up to N pixels per frame to simulate speed
      const speedFactor = Math.max(1, Math.floor(totalPts / 300)); // finish in ~5 secs

      for (let step = 0; step < speedFactor; step++) {
        if (pathIdx >= flatPaths.length) {
          $('simProgressPct').textContent = '100%';
          $('simProgressBar').style.width = '100%';
          return; // End simulation
        }

        const currentPath = flatPaths[pathIdx];

        if (ptIdx === 1) {
          // laser travel
          ctx.beginPath();
          ctx.moveTo(currentPath[0][0], currentPath[0][1]);
        }

        if (ptIdx < currentPath.length) {
          const p = currentPath[ptIdx];
          ctx.lineTo(p[0], p[1]);
          ctx.strokeStyle = '#f87171'; // red burning laser color
          ctx.lineWidth = 1;
          ctx.stroke();

          ptIdx++;
          ptsDrawn++;

          // draw literal red dot
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(p[0], p[1], 3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Path finished
          pathIdx++;
          ptIdx = 1;
        }
      }

      const pct = Math.round((ptsDrawn / totalPts) * 100);
      $('simProgressPct').textContent = pct + '%';
      $('simProgressBar').style.width = pct + '%';

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

    // SVG (if vector, we can include the actual SVG)
    if (source === 'vector') {
      const w = parseInt($('exportWidth').value) || processed.width;
      const h = parseInt($('exportHeight').value) || processed.height;

      const cols = parseInt($('gridCols').value) || 1;
      const rows = parseInt($('gridRows').value) || 1;
      const spaceX = parseFloat($('gridSpaceX').value) || 0;
      const spaceY = parseFloat($('gridSpaceY').value) || 0;
      const isColorMode = state.settings.mode === 'color';

      const { paths: outPaths, w: totalW, h: totalH } = generateGridArray(state.vectorPaths, w, h, cols, rows, spaceX, spaceY, isColorMode);

      zip.file("export.svg", buildSVG(outPaths, totalW, totalH));
      zip.file("export.dxf", buildDXF(outPaths, totalW, totalH, isColorMode));
      zip.file("export.nc", buildGcode(outPaths, totalW, totalH, isColorMode));
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

  // ── Preview Drawing (black on white, like the real output) ──
  function drawVectorPreview(paths, w, h) {
    const cv = $('canvasVec');
    const ctx = cv.getContext('2d');
    cv.width = w; cv.height = h;
    const smooth = state.settings.bezier;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    const drawPaths = (pathArray, fillCol, strokeCol) => {
      ctx.fillStyle = fillCol;
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (const path of pathArray) {
        if (path.length < 2) continue;
        ctx.moveTo(path[0][0], path[0][1]);

        if (!smooth || path.length < 3) {
          for (let i = 1; i < path.length; i++) ctx.lineTo(path[i][0], path[i][1]);
        } else {
          const tension = 0.2;
          const len = path.length;
          const isClosed = Math.hypot(path[0][0] - path[len - 1][0], path[0][1] - path[len - 1][1]) < 2;
          for (let i = 0; i < len - 1; i++) {
            const p0 = isClosed ? path[(i - 1 + len - 1) % (len - 1)] : (i === 0 ? path[0] : path[i - 1]);
            const p1 = path[i];
            const p2 = path[i + 1];
            const p3 = isClosed ? path[(i + 2) % (len - 1)] : (i + 2 === len ? path[len - 1] : path[i + 2]);
            let t1x = (p2[0] - p0[0]) * tension, t1y = (p2[1] - p0[1]) * tension;
            let t2x = (p3[0] - p1[0]) * tension, t2y = (p3[1] - p1[1]) * tension;
            if (!isClosed && i === 0) { t1x = 0; t1y = 0; }
            if (!isClosed && i === len - 2) { t2x = 0; t2y = 0; }
            ctx.bezierCurveTo(p1[0] + t1x, p1[1] + t1y, p2[0] - t2x, p2[1] - t2y, p2[0], p2[1]);
          }
        }
        if (state.settings.mode !== 'centerline') {
          ctx.closePath();
        }
      }

      if (state.settings.mode === 'centerline') {
        ctx.stroke();
      } else {
        ctx.fill('evenodd');
      }
    };

    if (state.settings.mode === 'color') {
      // paths is actually an array of layers
      for (const layer of paths) {
        drawPaths(layer, layer.colorData || '#111111', layer.colorData || '#111111');
      }
    } else {
      drawPaths(paths, '#111111', '#111111');
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
    state.vectorPaths = []; state.svgOutput = '';
    // Hide the vector panel when cleared
    if ($('vecPanel')) $('vecPanel').style.display = 'none';
    const cv = $('canvasVec');
    if (cv) { const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, cv.width, cv.height); cv.style.display = 'none'; }
    $('vecPlaceholder').style.display = 'flex';
    enableExports(false);
    if ($('btnVecPreview')) $('btnVecPreview').disabled = true;
    if ($('btnVecBatchZip')) $('btnVecBatchZip').disabled = true;
    if ($('btnSimulate')) $('btnSimulate').disabled = true;

    // Disable eraser tool
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
    // Vector exports
    ['SVG', 'DXF', 'PNG', 'Gcode', 'PDF', 'NC', 'BMP', 'JPEG', 'TIFF'].forEach(f => {
      // Bind hidden buttons
      const btn = $('btnExport' + f);
      if (btn) btn.addEventListener('click', () => exportAs(f.toLowerCase()));
      // Bind visual cards directly
      const card = document.querySelector(`.export-card:not(.img-export-card)[onclick*="btnExport${f}"]`);
      if (card) {
        card.removeAttribute('onclick'); // prevent double fire
        card.addEventListener('click', (e) => {
          if (!card.classList.contains('disabled')) exportAs(f.toLowerCase());
        });
      }
    });

    // Image exports
    ['PNG', 'JPEG', 'TIFF', 'SVG', 'PDF', 'BMP'].forEach(f => {
      // Bind hidden buttons
      const btn = $('btnImgExport' + f);
      if (btn) btn.addEventListener('click', () => exportFromImage(f.toLowerCase()));
      // Bind visual cards directly
      const card = document.querySelector(`.img-export-card[onclick*="btnImgExport${f}"]`);
      if (card) {
        card.removeAttribute('onclick'); // prevent double fire
        card.addEventListener('click', (e) => {
          if (!card.classList.contains('disabled')) exportFromImage(f.toLowerCase());
        });
      }
    });

    // Bind Batch ZIP and Preview buttons
    if ($('btnImgPreview')) $('btnImgPreview').addEventListener('click', showImagePreview);
    if ($('btnImgBatchZip')) $('btnImgBatchZip').addEventListener('click', () => runBatchExport('image'));
    if ($('btnVecPreview')) $('btnVecPreview').addEventListener('click', showVectorPreview);
    if ($('btnVecBatchZip')) $('btnVecBatchZip').addEventListener('click', () => runBatchExport('vector'));
  }

  async function exportAs(format) {
    if (!state.vectorPaths.length) { toast(t('noVector'), 'error'); return; }

    showProcessing(true, t('exportPreview'));
    await sleep(50);

    const canvas = $('canvasVec');
    const processed = await processExportCanvas(canvas);
    const w = processed.width, h = processed.height;
    const ctx = processed.getContext('2d');
    const imgData = ctx.getImageData(0, 0, w, h);
    const fname = 'cnc-vector_' + new Date().toISOString().slice(0, 10);

    try {
      switch (format) {
        case 'svg':
          downloadText(buildSVG(state.vectorPaths, w, h), fname + '.svg');
          break;
        case 'dxf':
          downloadText(buildDXF(state.vectorPaths, w, h), fname + '.dxf');
          break;
        case 'gcode':
        case 'nc':
          downloadText(buildGcode(state.vectorPaths, w, h), fname + (format === 'nc' ? '.nc' : '.gcode'));
          break;
        case 'pdf':
          downloadText(buildPDF(state.vectorPaths, w, h), fname + '.pdf');
          break;
        case 'png':
          savePNG(processed.toDataURL('image/png'), fname + '.png');
          break;
        case 'jpeg':
          savePNG(processed.toDataURL('image/jpeg', state.exportSettings.jpegQuality), fname + '.jpg');
          break;
        case 'tiff':
          saveBinaryBlob(buildTIFF(imgData, w, h), fname + '.tiff', 'image/tiff');
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
    ['btnExportSVG', 'btnExportDXF', 'btnExportPNG', 'btnExportGcode', 'btnExportPDF', 'btnExportNC', 'btnExportBMP', 'btnExportJPEG', 'btnExportTIFF'].forEach(id => {
      const el = $(id); if (el) el.disabled = !on;
    });
    // Vector cards
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
        updateStats();
        updateLayers(isColor ? state.vectorPaths.flat() : state.vectorPaths);
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

  // ── Stats ──────────────────────────────────────────────
  function updateStats() {
    if ($('statPaths')) $('statPaths').textContent = state.stats.paths || '—';
    if ($('statNodes')) $('statNodes').textContent = state.stats.nodes > 0 ? (state.stats.nodes > 999 ? (state.stats.nodes / 1000).toFixed(1) + 'K' : state.stats.nodes) : '—';
    if ($('statWidth')) $('statWidth').textContent = state.stats.width || '—';
    if ($('statHeight')) $('statHeight').textContent = state.stats.height || '—';
    if ($('statW')) $('statW').textContent = (state.stats.width * 0.264583).toFixed(1); // px to mm approx
    if ($('statH')) $('statH').textContent = (state.stats.height * 0.264583).toFixed(1);
  }

  function updateLayers(paths) {
    const list = $('layersList');
    if (!list) return;
    list.innerHTML = '';
    if (!paths.length) { 
      list.innerHTML = `<p style="color:var(--muted);font-size:12px;text-align:center;padding:12px">
        <span data-en>No vectors. Vectorize an image first.</span>
        <span data-fr>Aucun vecteur. Vectorisez d'abord une image.</span>
      </p>`; 
      return; 
    }
    const avgLen = paths.reduce((s, p) => s + p.length, 0) / paths.length;
    const items = [
      { color: '#4f8eff', name: currentLang === 'fr' ? 'Tracé principal' : 'Main Cut Layer', count: paths.length + (currentLang === 'fr' ? ' tracés' : ' paths') },
      { color: '#06d6a0', name: currentLang === 'fr' ? 'Contour gravure' : 'Engraving Contour', count: Math.round(avgLen) + (currentLang === 'fr' ? ' noeuds/tracé moy.' : ' nodes/path avg.') },
    ];
    items.forEach(it => {
      const div = document.createElement('div');
      div.className = 'layer-item';
      div.innerHTML = `<div class="layer-color" style="background:${it.color}"></div><span class="layer-name">${it.name}</span><span class="layer-count">${it.count}</span>`;
      list.appendChild(div);
    });
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

  return { init };
})();

// ── i18n ────────────────────────────────────────────────
const LANG = {
  en: {
    invalidFile: 'Invalid file. Supported: JPG, PNG, BMP, WebP, TIFF',
    imageLoaded: 'Image loaded:',
    noImage: 'Please load an image first!',
    processing: 'Processing image…',
    pathsVectorized: 'paths vectorized successfully!',
    vectorError: 'Vectorization error',
    noVector: 'Please vectorize an image first!',
  },
  fr: {
    invalidFile: 'Fichier invalide. Formats acceptés: JPG, PNG, BMP, WebP, TIFF',
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
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
}

document.addEventListener('DOMContentLoaded', () => {
  App.init();
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.addEventListener('click', () => switchLang(b.dataset.lang));
  });
});
