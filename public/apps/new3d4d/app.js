/**
 * APP.JS — Controller for New 3D 4D Studio Ultra
 * Connects UI, Image Preprocessing, Web Worker Engine3D v2, Watertight Three.js Preview,
 * Lithophane Backlight Lamp Simulator, Real-time 4D Morphing, Multi-Color 3MF/STL/OBJ/GLB/GLTF/HTML Exports, and Mobile AR Bridge.
 */

'use strict';

const App = {
  image: null,
  imageData: null,
  pngBytes: null,
  photoTexture: null,
  lithoGlowTexture: null,
  lastResult: null,
  renderer: null,
  scene: null,
  camera: null,
  mesh3D: null,
  reliefMesh: null,
  wallsMesh: null,
  basePositions: null,
  flatPositions: null,
  origNormals: null,
  gridW: 0,
  gridH: 0,
  animId: null,
  lastTime: performance.now(),
  worker: null,
  jobSeq: 0,
  anim4D: {
    playing: false,
    type: 'rotate',
    speed: 1.0,
    duration: 3,
    time: 0,
  },
  orbitSpherical: { theta: 0.18, phi: Math.PI / 2.15, radius: 175 },
  lang: 'en',
  viewMode: 'split', // '2d' | 'split' | '3d'
  wireframeMode: false,
  backlightMode: false,
  zoomLevel: 1,
  thumbHistory: [],
  activeMat: 'plastic',
  shapeProfile: 'rect',
};

const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

document.addEventListener('DOMContentLoaded', () => {
  initSidebarTabs();
  initUpload();
  initControls();
  initButtons();
  initLang();
  initThreeJS();
  initModeChips();
  initMobileViewSwitcher();
  applyLang(App.lang);
  update4DStatusUI();
  setViewMode('split');
});

// ─── Language (EN / FR) ─────────────────────────────────────────────────────

function t(key) {
  const dict = (window.I18N_N3D && window.I18N_N3D[App.lang]) || (window.I18N_N3D && window.I18N_N3D.en) || {};
  return dict[key] || key;
}

function initLang() {
  $$('.lang-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.lang-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      App.lang = btn.dataset.lang || 'en';
      applyLang(App.lang);
    });
  });
}

function applyLang(lang) {
  const dict = (window.I18N_N3D && window.I18N_N3D[lang]) || {};
  $$('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (dict[key]) el.textContent = dict[key];
  });
  $$('[data-en],[data-fr]').forEach((el) => {
    const txt = el.dataset[lang] || el.dataset.en;
    if (txt) el.textContent = txt;
  });
  update4DStatusUI();
}

// ─── Sidebar Tabs ───────────────────────────────────────────────────────────

function initSidebarTabs() {
  $$('.stab').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.stab').forEach((b) => b.classList.remove('active'));
      $$('.spanel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = $('sp-' + btn.dataset.stab);
      if (panel) panel.classList.add('active');
    });
  });
}

// ─── Mode, Shape, Preset, Material Chips ────────────────────────────────────

function initModeChips() {
  // 3D Sculpture mode chips
  $$('[data-mode3d]').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('[data-mode3d]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.dataset.mode3d;

      const domeRow = $('domeDepthRow');
      if (domeRow) domeRow.style.display = (mode === 'portrait' || mode === 'cameo') ? '' : 'none';

      const lithoBox = $('lithoControlsBox');
      if (lithoBox) lithoBox.style.display = (mode === 'lithophane') ? 'flex' : 'none';

      // Auto-calibrate gold-standard Lithophane thickness (0.8 .. 3.2 mm)
      if (mode === 'lithophane') {
        setSliderVal('sBase', 'vBase', 0.8);
        setSliderVal('sDepth', 'vDepth', 2.4);
      } else if (mode === 'cameo') {
        selectShapeProfile('circle');
      }
    });
  });

  // Physical CAD Shape chips
  $$('[data-shape]').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectShapeProfile(btn.dataset.shape);
    });
  });

  // 4D Animation chips
  $$('[data-anim]').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('[data-anim]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const anim = btn.dataset.anim;
      App.anim4D.type = anim;
      App.anim4D.time = 0;
      App.anim4D.playing = (anim !== 'none');
      restoreMeshBaseline();
      update4DStatusUI();
      toast(
        anim === 'none'
          ? (App.lang === 'fr' ? '⏸ Mode 3D statique' : '⏸ 4D Static Mode')
          : `✨ 4D: ${anim.toUpperCase()}`,
        'info'
      );
    });
  });

  // Material preset cards
  $$('.matcard').forEach((card) => {
    card.addEventListener('click', () => {
      $$('.matcard').forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      App.activeMat = card.dataset.mat;
      applyMaterialPreset(card.dataset.mat);
    });
  });

  // Quality presets (sync both copies in 3D & Export tabs)
  $$('[data-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      $$('[data-preset]').forEach((b) => b.classList.toggle('active', b.dataset.preset === preset));
      applyQualityPreset(preset);
    });
  });

  // Super-sampling chips
  $$('[data-ssuper]').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('[data-ssuper]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      if ($('vSuperSample')) $('vSuperSample').textContent = btn.dataset.ssuper + '×';
    });
  });

  const tBake = $('tBakeColors');
  if (tBake) {
    tBake.addEventListener('change', () => {
      const aoRow = $('aoRow');
      if (aoRow) aoRow.style.display = tBake.checked ? '' : 'none';
      refreshActiveMaterial();
    });
  }

  const tIsolate = $('tIsolateBg');
  if (tIsolate) {
    tIsolate.addEventListener('change', () => {
      const bgTolRow = $('bgTolRow');
      if (bgTolRow) bgTolRow.style.display = tIsolate.checked ? '' : 'none';
    });
  }

  const tBacklight = $('tBacklight');
  if (tBacklight) {
    tBacklight.addEventListener('change', () => {
      App.backlightMode = !!tBacklight.checked;
      syncBacklightUI();
    });
  }

  const tEmissive = $('tEmissive');
  if (tEmissive) {
    tEmissive.addEventListener('change', refreshActiveMaterial);
  }
}

function selectShapeProfile(shape) {
  App.shapeProfile = shape || 'rect';
  $$('[data-shape]').forEach((b) => b.classList.toggle('active', b.dataset.shape === App.shapeProfile));
  const arcRow = $('arcAngleRow');
  if (arcRow) arcRow.style.display = (App.shapeProfile === 'curved') ? '' : 'none';
}

function setSliderVal(sid, vid, val) {
  const s = $(sid), v = $(vid);
  if (s) s.value = val;
  if (v && s) v.textContent = parseFloat(val).toFixed(s.step && s.step.includes('.') ? (s.step === '0.01' ? 2 : 1) : 0);
}

function applyMaterialPreset(mat) {
  const presets = {
    plastic: { metalness: 0.04, roughness: 0.55, color: '#a8d8ea' },
    metal: { metalness: 0.85, roughness: 0.24, color: '#cbd5e1' },
    gold: { metalness: 0.92, roughness: 0.18, color: '#ffd700' },
    wood: { metalness: 0.02, roughness: 0.84, color: '#8b5e34' },
    glass: { metalness: 0.08, roughness: 0.08, color: '#bae6fd' },
    custom: null,
  };
  const p = presets[mat];
  if (p) {
    setSliderVal('sMetalness', 'vMetalness', p.metalness);
    setSliderVal('sRoughness', 'vRoughness', p.roughness);
    $('cBaseColor').value = p.color;
    $('vBaseColor').textContent = p.color;
  }
  refreshActiveMaterial();
}

function refreshActiveMaterial() {
  if (!App.reliefMesh || !App.reliefMesh.material) return;
  const m = App.reliefMesh.material;
  const mat = App.activeMat || 'plastic';
  const colorVal = $('cBaseColor') ? $('cBaseColor').value : '#4f8eff';
  const metalness = $('sMetalness') ? parseFloat($('sMetalness').value) : 0.04;
  const roughness = $('sRoughness') ? parseFloat($('sRoughness').value) : 0.58;
  const useEmissive = $('tEmissive') ? $('tEmissive').checked : false;
  const bakeColors = $('tBakeColors') ? $('tBakeColors').checked : true;
  const modeEl = document.querySelector('[data-mode3d].active');
  const isLitho = modeEl && modeEl.dataset.mode3d === 'lithophane';

  if (App.backlightMode && App.lithoGlowTexture) {
    m.map = App.lithoGlowTexture;
    m.emissiveMap = App.lithoGlowTexture;
    m.emissive.set(0xffb84d);
    m.emissiveIntensity = 1.35;
    m.color.set(0xfff4d6);
    m.roughness = 0.42;
    m.metalness = 0.0;
    m.transparent = false;
    m.opacity = 1.0;
    m.needsUpdate = true;
    return;
  }

  m.emissiveMap = null;
  if (useEmissive) {
    m.emissive.set(colorVal);
    m.emissiveIntensity = 0.35;
  } else {
    m.emissive.set(0x000000);
    m.emissiveIntensity = 0.0;
  }

  if (mat === 'glass') {
    m.map = null;
    m.vertexColors = false;
    m.color.set(colorVal);
    m.metalness = 0.1;
    m.roughness = 0.08;
    m.transparent = true;
    m.opacity = 0.62;
  } else if (mat === 'gold' || mat === 'metal' || mat === 'wood' || mat === 'custom') {
    m.transparent = false;
    m.opacity = 1.0;
    m.map = null;
    m.vertexColors = false;
    m.color.set(colorVal);
    m.metalness = metalness;
    m.roughness = roughness;
  } else {
    m.transparent = false;
    m.opacity = 1.0;
    const usePhoto = Boolean(bakeColors && App.photoTexture && !isLitho);
    m.map = usePhoto ? App.photoTexture : null;
    m.vertexColors = false;
    m.color.set(usePhoto ? '#ffffff' : (isLitho ? '#f5efe6' : colorVal));
    m.metalness = usePhoto ? Math.min(0.2, metalness) : metalness;
    m.roughness = roughness;
  }
  m.needsUpdate = true;
}

function applyQualityPreset(preset) {
  const presets = {
    draft: { resolution: 128, smoothing: 2, depth: 5, base: 2, ssuper: 1, method: 'box', gamma: 1.0, edgeBoost: false, subdivPass: false },
    standard: { resolution: 256, smoothing: 3, depth: 5.5, base: 2, ssuper: 2, method: 'bilateral', gamma: 1.0, edgeBoost: true, subdivPass: false },
    ultra: { resolution: 384, smoothing: 4, depth: 6.5, base: 2, ssuper: 2, method: 'both', gamma: 1.05, edgeBoost: true, subdivPass: false },
  };
  const p = presets[preset];
  if (!p) return;
  setSliderVal('sResolution', 'vResolution', p.resolution);
  setSliderVal('sSmoothing', 'vSmoothing', p.smoothing);
  setSliderVal('sDepth', 'vDepth', p.depth);
  setSliderVal('sBase', 'vBase', p.base);
  setSliderVal('sGamma', 'vGamma', p.gamma);
  if ($('sSmoothMethod')) $('sSmoothMethod').value = p.method;
  if ($('tEdgeBoost')) $('tEdgeBoost').checked = p.edgeBoost;
  if ($('tSubdiv')) $('tSubdiv').checked = p.subdivPass;

  $$('[data-ssuper]').forEach((btn) => btn.classList.toggle('active', parseInt(btn.dataset.ssuper, 10) === p.ssuper));
  if ($('vSuperSample')) $('vSuperSample').textContent = p.ssuper + '×';
}

// ─── Upload & Built-in Samples ──────────────────────────────────────────────

function initUpload() {
  const zone = $('uploadZone');
  const input = $('fileInput');

  zone.addEventListener('click', (e) => {
    if (e.target.closest('#btnChooseFile')) return;
    input.click();
  });
  if ($('btnChooseFile')) {
    $('btnChooseFile').addEventListener('click', (e) => {
      e.stopPropagation();
      input.click();
    });
  }
  zone.addEventListener('keydown', (e) => e.key === 'Enter' && input.click());
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
  });
  input.addEventListener('change', () => { if (input.files[0]) loadFile(input.files[0]); });

  $$('[data-sample]').forEach((btn) => {
    btn.addEventListener('click', () => loadQuickSample(btn.dataset.sample));
  });
}

function loadQuickSample(kind) {
  const c = document.createElement('canvas');
  c.width = 320;
  c.height = 320;
  const ctx = c.getContext('2d');

  if (kind === 'portrait') {
    // High-contrast studio portrait bust silhouette with clear facial shading for distance-field test
    ctx.fillStyle = '#0e1726';
    ctx.fillRect(0, 0, 320, 320);
    // Shoulders dome
    const gSh = ctx.createRadialGradient(160, 290, 20, 160, 290, 130);
    gSh.addColorStop(0, '#c8d6e5');
    gSh.addColorStop(1, '#334155');
    ctx.fillStyle = gSh;
    ctx.beginPath(); ctx.ellipse(160, 305, 118, 78, 0, Math.PI, 0); ctx.fill();
    // Face dome
    const gHead = ctx.createRadialGradient(152, 132, 14, 160, 146, 86);
    gHead.addColorStop(0, '#ffffff');
    gHead.addColorStop(0.65, '#cbd5e1');
    gHead.addColorStop(1, '#475569');
    ctx.fillStyle = gHead;
    ctx.beginPath(); ctx.ellipse(160, 145, 72, 92, 0, 0, Math.PI * 2); ctx.fill();
    // Eyes, nose bridge, lips
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.ellipse(134, 132, 11, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(186, 132, 11, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath(); ctx.ellipse(160, 152, 11, 24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#64748b';
    ctx.beginPath(); ctx.ellipse(160, 192, 24, 7, 0, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'emblem') {
    // Coin medallion emblem with sharp star + ring + typography cues
    ctx.fillStyle = '#050814';
    ctx.fillRect(0, 0, 320, 320);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 14;
    ctx.beginPath(); ctx.arc(160, 160, 126, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(160, 160, 108, 0, Math.PI * 2); ctx.stroke();
    const grd = ctx.createRadialGradient(160, 150, 10, 160, 160, 88);
    grd.addColorStop(0, '#ffffff');
    grd.addColorStop(1, '#60a5fa');
    ctx.fillStyle = grd;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 78 : 34;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const px = 160 + Math.cos(a) * r;
      const py = 160 + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  } else {
    // Mountain sunset landscape relief
    const sky = ctx.createLinearGradient(0, 0, 0, 320);
    sky.addColorStop(0, '#1e293b');
    sky.addColorStop(0.55, '#64748b');
    sky.addColorStop(1, '#0f172a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 320, 320);
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath(); ctx.arc(235, 86, 36, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath(); ctx.moveTo(0, 250); ctx.lineTo(95, 118); ctx.lineTo(205, 225); ctx.lineTo(270, 148); ctx.lineTo(320, 210); ctx.lineTo(320, 320); ctx.lineTo(0, 320); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#475569';
    ctx.beginPath(); ctx.moveTo(0, 290); ctx.lineTo(140, 185); ctx.lineTo(320, 275); ctx.lineTo(320, 320); ctx.lineTo(0, 320); ctx.closePath(); ctx.fill();
  }

  const dataUrl = c.toDataURL('image/png');
  const img = new Image();
  img.onload = () => {
    App.image = img;
    const fname = `sample_${kind}.png`;
    addToHistory(dataUrl, fname);
    showFileInfo({ name: fname, size: dataUrl.length }, img);
    drawOriginal(img);
    enableControls(true);
    toast(`✅ Sample loaded: ${fname}`, 'success');
  };
  img.src = dataUrl;
}

function loadFile(file) {
  if (!file.type.startsWith('image/')) {
    toast(App.lang === 'fr' ? '❌ Veuillez charger un fichier image' : '❌ Please load an image file', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      App.image = img;
      addToHistory(e.target.result, file.name);
      showFileInfo(file, img);
      drawOriginal(img);
      enableControls(true);
      toast(`✅ ${file.name}`, 'success');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function showFileInfo(file, img) {
  $('fileInfo').style.display = 'flex';
  $('infoFilename').textContent = file.name;
  $('infoSize').textContent = formatBytes(file.size || 0);
  $('infoDims').textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
}

function drawOriginal(img) {
  const canvas = $('canvas2D');
  const placeholder = $('pvPlaceholder');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.getContext('2d').drawImage(img, 0, 0);
  canvas.style.display = 'block';
  placeholder.style.display = 'none';
}

function addToHistory(src, name) {
  App.thumbHistory.unshift({ src, name });
  if (App.thumbHistory.length > 9) App.thumbHistory.pop();
  renderHistory();
}

function renderHistory() {
  const grid = $('thumbGrid');
  const label = $('historyLabel');
  if (App.thumbHistory.length === 0) { label.style.display = 'none'; return; }
  label.style.display = 'flex';
  grid.innerHTML = '';
  App.thumbHistory.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'thumb-item' + (i === 0 ? ' active' : '');
    const im = document.createElement('img');
    im.src = item.src;
    im.alt = item.name;
    div.appendChild(im);
    div.addEventListener('click', () => {
      const image = new Image();
      image.onload = () => {
        App.image = image;
        drawOriginal(image);
        enableControls(true);
        $$('.thumb-item').forEach((tEl, j) => tEl.classList.toggle('active', j === i));
      };
      image.src = item.src;
    });
    grid.appendChild(div);
  });
}

// ─── Controls ───────────────────────────────────────────────────────────────

function initControls() {
  const sliders = [
    ['sBrightness', 'vBrightness'],
    ['sContrast', 'vContrast'],
    ['sSaturation', 'vSaturation'],
    ['sBlur', 'vBlur'],
    ['sSharpen', 'vSharpen'],
    ['sThreshold', 'vThreshold'],
    ['sDepth', 'vDepth'],
    ['sBase', 'vBase'],
    ['sResolution', 'vResolution'],
    ['sSmoothing', 'vSmoothing'],
    ['sScale', 'vScale'],
    ['sGamma', 'vGamma'],
    ['sAO', 'vAO'],
    ['sBgTolerance', 'vBgTolerance'],
    ['sDomeDepth', 'vDomeDepth'],
    ['sArcAngle', 'vArcAngle'],
    ['sAnimSpeed', 'vAnimSpeed'],
    ['sAnimDur', 'vAnimDur'],
    ['sMetalness', 'vMetalness'],
    ['sRoughness', 'vRoughness'],
  ];

  sliders.forEach(([sid, vid]) => {
    const s = $(sid), v = $(vid);
    if (!s || !v) return;
    s.addEventListener('input', () => {
      const decimals = s.step && s.step.includes('.') ? (s.step === '0.01' ? 2 : 1) : 0;
      v.textContent = parseFloat(s.value).toFixed(decimals);
      if (sid === 'sAnimSpeed') App.anim4D.speed = parseFloat(s.value) || 1.0;
      if (sid === 'sAnimDur') App.anim4D.duration = parseFloat(s.value) || 3.0;
      if (sid === 'sMetalness' || sid === 'sRoughness') refreshActiveMaterial();
    });
  });

  if ($('cBaseColor')) {
    $('cBaseColor').addEventListener('input', (e) => {
      $('vBaseColor').textContent = e.target.value;
      refreshActiveMaterial();
    });
  }
}

// ─── Buttons & View Modes ───────────────────────────────────────────────────

function initButtons() {
  $('btnGenerate').addEventListener('click', doGenerate);
  $('btnClear').addEventListener('click', doClear);
  $('btnPreview2D').addEventListener('click', doPreview2D);

  if ($('btnViewMode2D')) $('btnViewMode2D').addEventListener('click', () => setViewMode('2d'));
  if ($('btnViewModeSplit')) $('btnViewModeSplit').addEventListener('click', () => setViewMode('split'));
  if ($('btnViewMode3D')) $('btnViewMode3D').addEventListener('click', () => setViewMode('3d'));

  $('btnResetView').addEventListener('click', resetView);
  $('btnWireframe').addEventListener('click', toggleWireframe);
  if ($('btnBacklight')) $('btnBacklight').addEventListener('click', toggleBacklightMode);

  $('btnZoomIn').addEventListener('click', () => { App.zoomLevel = Math.min(App.zoomLevel * 1.25, 8); updateZoomUI(); });
  $('btnZoomOut').addEventListener('click', () => { App.zoomLevel = Math.max(App.zoomLevel / 1.25, 0.2); updateZoomUI(); });

  if ($('btnPlay4D')) $('btnPlay4D').addEventListener('click', togglePlay4D);
  if ($('btnTogglePlay4D')) $('btnTogglePlay4D').addEventListener('click', togglePlay4D);
  if ($('btnRecordVideo')) $('btnRecordVideo').addEventListener('click', () => triggerExportAction(() => recordVideo4D()));
  if ($('btnSnapShot')) $('btnSnapShot').addEventListener('click', () => triggerExportAction(() => snapScreenshot4D()));

  // Export buttons AND clickable export cards!
  const exportBindings = [
    ['btnExportSTL', 'ecSTL', 'stl'],
    ['btnExportOBJ', 'ecOBJ', 'obj'],
    ['btnExport3MF', 'ec3MF', '3mf'],
    ['btnExportGLB', 'ecGLB', 'glb'],
    ['btnExportGLTF', 'ecGLTF', 'gltf'],
    ['btnExportHTML', 'ecHTML', 'html'],
  ];
  exportBindings.forEach(([btnId, cardId, type]) => {
    if ($(btnId)) $(btnId).addEventListener('click', () => exportModel(type));
    if ($(cardId)) $(cardId).addEventListener('click', () => {
      if (App.lastResult) exportModel(type);
    });
  });

  if ($('btnOpenAR')) $('btnOpenAR').addEventListener('click', openInARViewer);
  if ($('btnQuickAR')) $('btnQuickAR').addEventListener('click', openInARViewer);
}

function setViewMode(mode) {
  App.viewMode = mode;
  const panels = $('previewPanels');
  if (panels) {
    panels.classList.remove('view-2d-only', 'view-3d-only');
    if (mode === '2d') panels.classList.add('view-2d-only');
    if (mode === '3d') panels.classList.add('view-3d-only');
  }
  if ($('btnViewMode2D')) $('btnViewMode2D').classList.toggle('active', mode === '2d');
  if ($('btnViewModeSplit')) $('btnViewModeSplit').classList.toggle('active', mode === 'split');
  if ($('btnViewMode3D')) $('btnViewMode3D').classList.toggle('active', mode === '3d');
  setTimeout(resizeThreeJS, 30);
}

function toggleWireframe() {
  App.wireframeMode = !App.wireframeMode;
  if (App.reliefMesh && App.reliefMesh.material) App.reliefMesh.material.wireframe = App.wireframeMode;
  if (App.wallsMesh && App.wallsMesh.material) App.wallsMesh.material.wireframe = App.wireframeMode;
  $('btnWireframe').classList.toggle('active', App.wireframeMode);
}

function toggleBacklightMode() {
  App.backlightMode = !App.backlightMode;
  if ($('tBacklight')) $('tBacklight').checked = App.backlightMode;
  syncBacklightUI();
}

function syncBacklightUI() {
  if ($('btnBacklight')) $('btnBacklight').classList.toggle('active', App.backlightMode);
  if (App.scene) {
    App.scene.background = new THREE.Color(App.backlightMode ? 0x03050a : 0x060c1a);
  }
  refreshActiveMaterial();
}

function resetView() {
  App.zoomLevel = 1;
  updateZoomUI();
  if (App.orbitSpherical && App.updateCamera) {
    App.orbitSpherical.theta = 0.16;
    App.orbitSpherical.phi = Math.PI / 2.15;
    if (App.lastResult && App.lastResult.dims) {
      const diag = Math.hypot(App.lastResult.dims.x, App.lastResult.dims.y);
      App.orbitSpherical.radius = diag * 1.18;
    } else {
      App.orbitSpherical.radius = 175;
    }
    App.updateCamera();
  }
  restoreMeshBaseline();
}

function updateZoomUI() {
  $('zoomVal').textContent = Math.round(App.zoomLevel * 100) + '%';
  if (App.camera && App.orbitSpherical && App.updateCamera) {
    const baseR = (App.lastResult && App.lastResult.dims)
      ? Math.hypot(App.lastResult.dims.x, App.lastResult.dims.y) * 1.18
      : 175;
    App.orbitSpherical.radius = baseR / App.zoomLevel;
    App.updateCamera();
  }
}

function togglePlay4D() {
  if (!App.anim4D.playing && App.anim4D.type === 'none') {
    App.anim4D.type = 'rotate';
    $$('[data-anim]').forEach((b) => b.classList.toggle('active', b.dataset.anim === 'rotate'));
  }
  App.anim4D.playing = !App.anim4D.playing;
  if (!App.anim4D.playing) restoreMeshBaseline();
  update4DStatusUI();
}

function update4DStatusUI() {
  const badge = $('badge4DLive');
  const btn1 = $('btnPlay4D');
  const btn2 = $('btnTogglePlay4D');
  const label = App.anim4D.playing ? t('pause4D') : t('play4D');

  if (btn1) {
    btn1.textContent = App.anim4D.playing ? '⏸ 4D' : '▶ 4D';
    btn1.classList.toggle('playing', App.anim4D.playing);
  }
  if (btn2) btn2.innerHTML = `${App.anim4D.playing ? '⏸' : '▶'} <span>${label}</span>`;
  if (badge) {
    badge.textContent = App.anim4D.playing ? `✨ ${t('status4D')} (${App.anim4D.type.toUpperCase()})` : `📦 ${t('statusStatic')}`;
    badge.style.background = App.anim4D.playing ? 'rgba(168,85,247,0.28)' : 'rgba(59,130,246,0.18)';
    badge.style.color = App.anim4D.playing ? '#e9d5ff' : '#93c5fd';
  }
}

function restoreMeshBaseline() {
  if (!App.mesh3D) return;
  App.mesh3D.rotation.set(0, 0, 0);
  App.mesh3D.position.set(0, 0, 0);
  App.mesh3D.scale.set(1, 1, 1);

  if (App.basePositions && App.reliefMesh && App.reliefMesh.geometry) {
    const pos = App.reliefMesh.geometry.attributes.position;
    pos.array.set(App.basePositions);
    pos.needsUpdate = true;
    if (App.origNormals && App.reliefMesh.geometry.attributes.normal) {
      App.reliefMesh.geometry.attributes.normal.array.set(App.origNormals);
      App.reliefMesh.geometry.attributes.normal.needsUpdate = true;
    } else {
      App.reliefMesh.geometry.computeVertexNormals();
    }
  }
}

// ─── Image Preprocessing (Unified with Engine3D!) ───────────────────────────

function getProcessedImageData() {
  if (!App.image) return null;
  const proc = $('canvasProc');
  proc.width = App.image.naturalWidth;
  proc.height = App.image.naturalHeight;
  const ctx = proc.getContext('2d');
  ctx.drawImage(App.image, 0, 0);
  const imgData = ctx.getImageData(0, 0, proc.width, proc.height);

  const preOpts = {
    brightness: parseInt($('sBrightness')?.value || 0, 10),
    contrast: parseInt($('sContrast')?.value || 0, 10),
    saturation: parseInt($('sSaturation')?.value || 0, 10),
    blur: parseInt($('sBlur')?.value || 0, 10),
    sharpen: parseInt($('sSharpen')?.value || 0, 10),
    threshold: parseInt($('sThreshold')?.value || 128, 10),
    useThreshold: !!($('tUseThreshold') && $('tUseThreshold').checked),
    grayscale: !!($('tGrayscale') && $('tGrayscale').checked),
    invert: !!($('tInvert') && $('tInvert').checked),
    edgeEnhance: !!($('tEdge') && $('tEdge').checked),
  };

  const processedBytes = Engine3D.preprocessRGBA(imgData.data, proc.width, proc.height, preOpts);
  imgData.data.set(processedBytes);
  ctx.putImageData(imgData, 0, 0);
  return imgData;
}

function doPreview2D() {
  if (!App.image) {
    toast(App.lang === 'fr' ? '⚠️ Chargez une image' : '⚠️ Please load an image first', 'error');
    return;
  }
  const processed = getProcessedImageData();
  const canvas = $('canvas2D');
  canvas.width = processed.width;
  canvas.height = processed.height;
  canvas.getContext('2d').putImageData(processed, 0, 0);
  if (App.viewMode === '3d') setViewMode('split');
  toast(App.lang === 'fr' ? '✅ Aperçu 2D mis à jour' : '✅ 2D Preview updated', 'info');
}

// ─── Mobile Switcher ────────────────────────────────────────────────────────

function initMobileViewSwitcher() {
  const btnMobControls = $('btnMobControls');
  const btnMobViewport = $('btnMobViewport');
  const layout = document.querySelector('.app-layout');
  if (!btnMobControls || !btnMobViewport || !layout) return;

  btnMobControls.addEventListener('click', () => {
    layout.classList.remove('mobile-view-viewport');
    layout.classList.add('mobile-view-controls');
    btnMobControls.classList.add('active');
    btnMobViewport.classList.remove('active');
  });

  btnMobViewport.addEventListener('click', () => {
    layout.classList.remove('mobile-view-controls');
    layout.classList.add('mobile-view-viewport');
    btnMobViewport.classList.add('active');
    btnMobControls.classList.remove('active');
    setTimeout(resizeThreeJS, 60);
  });
}

// ─── Web Worker Runner with Main-Thread Fallback ────────────────────────────

function runEngine3DAsync(imageData, opts, onProgress) {
  return new Promise((resolve, reject) => {
    const jobId = ++App.jobSeq;
    let settled = false;

    const fallback = () => {
      if (settled) return;
      settled = true;
      try {
        const res = Engine3D.generate(imageData, opts, onProgress);
        resolve(res);
      } catch (e) {
        reject(e);
      }
    };

    try {
      if (!App.worker) {
        App.worker = new Worker('js/sculpt-worker.js');
      }
      const handleMsg = (e) => {
        if (!e.data || e.data.id !== jobId) return;
        if (e.data.type === 'progress') {
          onProgress && onProgress(e.data.prog, e.data.msg);
        } else if (e.data.type === 'done') {
          settled = true;
          App.worker.removeEventListener('message', handleMsg);
          App.worker.removeEventListener('error', handleErr);
          resolve(e.data.result);
        } else if (e.data.type === 'error') {
          settled = true;
          App.worker.removeEventListener('message', handleMsg);
          App.worker.removeEventListener('error', handleErr);
          reject(new Error(e.data.message));
        }
      };
      const handleErr = () => {
        if (App.worker) {
          App.worker.terminate();
          App.worker = null;
        }
        fallback();
      };
      App.worker.addEventListener('message', handleMsg);
      App.worker.addEventListener('error', handleErr);
      App.worker.postMessage({ id: jobId, imageData, opts });
    } catch (_) {
      fallback();
    }
  });
}

// ─── Helper: Texture Extraction & Backlight Optical Map ─────────────────────

function canvasToBytes(canvas) {
  try {
    let dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    if (!dataUrl || !dataUrl.startsWith('data:image/jpeg')) dataUrl = canvas.toDataURL('image/png');
    const b64 = dataUrl.split(',')[1];
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  } catch (_) {
    return null;
  }
}

function buildLithophaneGlowTexture(result) {
  const { hmap, gridW, gridH } = result;
  const c = document.createElement('canvas');
  c.width = gridW;
  c.height = gridH;
  const ctx = c.getContext('2d');
  const id = ctx.createImageData(gridW, gridH);
  const d = id.data;
  for (let i = 0; i < gridW * gridH; i++) {
    // Beer-Lambert LED transmittance through warm white PLA:
    // h = 0 (thinnest 0.8mm) -> glowing warm white, h = 1 (thickest 3.2mm) -> warm amber dark
    const trans = Math.pow(1.0 - hmap[i], 1.5);
    const di = i * 4;
    d[di] = Math.round(36 + trans * 219);
    d[di + 1] = Math.round(24 + trans * 212);
    d[di + 2] = Math.round(14 + trans * 184);
    d[di + 3] = 255;
  }
  ctx.putImageData(id, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

// ─── Generate 3D Model ──────────────────────────────────────────────────────

async function doGenerate() {
  if (!App.image) {
    toast(App.lang === 'fr' ? '⚠️ Chargez une image' : '⚠️ Please load an image first', 'error');
    return;
  }

  $('pv3D').style.display = 'flex';
  await new Promise((r) => setTimeout(r, 20));
  resizeThreeJS();
  showProgress(true, App.lang === 'fr' ? 'Analyse de l\'image…' : 'Analyzing image & contours…', 4);

  const modeEl = document.querySelector('[data-mode3d].active');
  const mode3d = modeEl ? modeEl.dataset.mode3d : 'relief';
  const ssuperEl = document.querySelector('[data-ssuper].active');
  const superSample = ssuperEl ? parseInt(ssuperEl.dataset.ssuper, 10) : 2;

  const colorCanvas = document.createElement('canvas');
  const maxTexDim = 1024;
  const scaleFactor = Math.min(1, maxTexDim / Math.max(App.image.naturalWidth, App.image.naturalHeight));
  colorCanvas.width = Math.max(64, Math.round(App.image.naturalWidth * scaleFactor));
  colorCanvas.height = Math.max(64, Math.round(App.image.naturalHeight * scaleFactor));
  colorCanvas.getContext('2d').drawImage(App.image, 0, 0, colorCanvas.width, colorCanvas.height);
  const rawColorData = colorCanvas.getContext('2d').getImageData(0, 0, colorCanvas.width, colorCanvas.height);

  App.pngBytes = canvasToBytes(colorCanvas);

  if (App.photoTexture) App.photoTexture.dispose();
  App.photoTexture = new THREE.CanvasTexture(colorCanvas);
  App.photoTexture.minFilter = THREE.LinearMipmapLinearFilter;
  App.photoTexture.magFilter = THREE.LinearFilter;
  if (App.renderer && App.renderer.capabilities) {
    App.photoTexture.anisotropy = Math.min(8, App.renderer.capabilities.getMaxAnisotropy());
  }
  App.photoTexture.needsUpdate = true;

  const stampPct = Math.round(((parseFloat($('sThreshold')?.value || 128)) / 255) * 100);
  const opts3d = {
    mode: mode3d,
    shapeProfile: App.shapeProfile || 'rect',
    arcAngleDeg: parseFloat($('sArcAngle')?.value || 120),
    resolution: parseInt($('sResolution').value, 10) || 256,
    depthMM: parseFloat($('sDepth').value) || 5,
    baseMM: parseFloat($('sBase').value),
    scaleMM: parseFloat($('sScale').value) || 100,
    smoothPasses: parseInt($('sSmoothing').value, 10) || 0,
    smoothMethod: $('sSmoothMethod') ? $('sSmoothMethod').value : 'bilateral',
    superSample,
    gamma: parseFloat($('sGamma').value) || 1.0,
    edgeBoost: !!($('tEdgeBoost') && $('tEdgeBoost').checked),
    bakeColors: !!($('tBakeColors') && $('tBakeColors').checked),
    aoStrength: $('sAO') ? parseFloat($('sAO').value) : 0.25,
    subdivPass: !!($('tSubdiv') && $('tSubdiv').checked),
    solidBase: !!$('tSolidBase').checked,
    mirrorY: !!$('tMirrorY').checked,
    isolateSubject: !!($('tIsolateBg') && $('tIsolateBg').checked),
    bgTolerance: $('sBgTolerance') ? parseFloat($('sBgTolerance').value) : 35,
    domeDepth: $('sDomeDepth') ? parseFloat($('sDomeDepth').value) : 65,
    stampThreshold: stampPct,
    invertDepth: !!($('tInvertDepth') && $('tInvertDepth').checked),
    color: $('cBaseColor').value || '#4f8eff',
    metalness: parseFloat($('sMetalness').value) || 0.04,
    roughness: parseFloat($('sRoughness').value) || 0.58,
    colorData: rawColorData,
  };
  if (isNaN(opts3d.baseMM)) opts3d.baseMM = 2;

  try {
    App.imageData = getProcessedImageData();
    const result = await runEngine3DAsync(App.imageData, opts3d, (prog, msg) => {
      showProgress(true, msg, Math.round(prog * 88) + 6);
    });

    App.lastResult = result;
    if (App.lithoGlowTexture) App.lithoGlowTexture.dispose();
    App.lithoGlowTexture = buildLithophaneGlowTexture(result);

    if (mode3d === 'lithophane' && $('tBacklight') && !App.backlightMode) {
      App.backlightMode = true;
      $('tBacklight').checked = true;
    }

    render3DPreview(result, opts3d);
    syncBacklightUI();
    resizeThreeJS();

    App.anim4D.playing = false;
    update4DStatusUI();
    showProgress(false);
    updateStats(result);
    enableExport(true);

    if (window.innerWidth <= 900 && $('btnMobViewport')) $('btnMobViewport').click();
    toast(App.lang === 'fr' ? '⚡ Modèle 3D Ultra prêt !' : '⚡ Ultra 3D Sculpture ready!', 'success');
  } catch (err) {
    showProgress(false);
    toast('❌ Error: ' + err.message, 'error');
    console.error(err);
  }
}

// ─── Three.js Viewport (1-to-1 Identical Geometry to STL/OBJ/3MF/GLB) ────────

function resizeThreeJS() {
  if (!App.renderer || !$('canvas3D')) return;
  const wrap = $('canvas3D').parentElement;
  const w = Math.max(100, wrap.clientWidth || 400);
  const h = Math.max(100, wrap.clientHeight || 300);
  App.renderer.setSize(w, h);
  if (App.camera) {
    App.camera.aspect = w / h;
    App.camera.updateProjectionMatrix();
  }
}

function initThreeJS() {
  const canvas3D = $('canvas3D');
  App.renderer = new THREE.WebGLRenderer({ canvas: canvas3D, antialias: true, alpha: true, preserveDrawingBuffer: true });
  App.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  App.renderer.shadowMap.enabled = false;
  App.renderer.setClearColor(0x060c1a, 1);
  App.renderer.setSize(400, 300);

  App.scene = new THREE.Scene();
  App.scene.background = new THREE.Color(0x060c1a);

  const grid = new THREE.GridHelper(320, 32, 0x1e293b, 0x0f172a);
  grid.position.y = -62;
  App.scene.add(grid);
  App.floorGrid = grid;

  App.camera = new THREE.PerspectiveCamera(42, 400 / 300, 0.1, 5000);
  App.camera.position.set(0, 0, 175);

  App.scene.add(new THREE.AmbientLight(0xffffff, 0.58));

  const keyLight = new THREE.DirectionalLight(0xffffff, 0.52);
  keyLight.position.set(55, 85, 140);
  App.scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.22);
  fillLight.position.set(-75, -25, 110);
  App.scene.add(fillLight);

  const backRim = new THREE.DirectionalLight(0xe2e8f0, 0.28);
  backRim.position.set(0, 50, -140);
  App.scene.add(backRim);

  setupOrbitControls(canvas3D);
  App.lastTime = performance.now();

  function animate() {
    App.animId = requestAnimationFrame(animate);
    const now = performance.now();
    const dt = Math.min((now - App.lastTime) / 1000, 0.1);
    App.lastTime = now;

    if (App.mesh3D && App.anim4D.playing && App.anim4D.type !== 'none') {
      update4DAnimation(dt);
    }
    App.renderer.render(App.scene, App.camera);
  }
  animate();
  window.addEventListener('resize', resizeThreeJS);
}

function clearMesh3D() {
  if (!App.mesh3D) return;
  App.scene.remove(App.mesh3D);
  App.mesh3D.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  });
  App.mesh3D = null;
  App.reliefMesh = null;
  App.wallsMesh = null;
  App.basePositions = null;
  App.flatPositions = null;
  App.origNormals = null;
}

function render3DPreview(result, opts) {
  clearMesh3D();
  const { mesh, dims } = result;
  const { verts, baseFlatVerts, uvs, normals, indices, extraTriangles, gridW, gridH, bounds } = mesh;

  // Center coordinates cleanly around (0, 0, 0) in Three.js view
  const cx = (bounds.minX + bounds.maxX) * 0.5;
  const cy = (bounds.minY + bounds.maxY) * 0.5;
  const cz = (bounds.minZ + bounds.maxZ) * 0.5;

  const topVerts = verts.length / 3;
  const centeredVerts = new Float32Array(verts.length);
  const centeredFlat = new Float32Array(verts.length);
  for (let i = 0; i < verts.length; i += 3) {
    centeredVerts[i] = verts[i] - cx;
    centeredVerts[i + 1] = verts[i + 1] - cy;
    centeredVerts[i + 2] = verts[i + 2] - cz;
    centeredFlat[i] = baseFlatVerts[i] - cx;
    centeredFlat[i + 1] = baseFlatVerts[i + 1] - cy;
    centeredFlat[i + 2] = baseFlatVerts[i + 2] - cz;
  }

  // Flip UVs v-axis to match Three.js CanvasTexture (flipY = true)
  const flippedUVs = new Float32Array(uvs.length);
  for (let i = 0; i < uvs.length; i += 2) {
    flippedUVs[i] = uvs[i];
    flippedUVs[i + 1] = 1.0 - uvs[i + 1];
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(centeredVerts, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(flippedUVs, 2));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));

  App.basePositions = new Float32Array(centeredVerts);
  App.flatPositions = new Float32Array(centeredFlat);
  App.origNormals = new Float32Array(normals);
  App.gridW = gridW;
  App.gridH = gridH;

  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: opts.metalness || 0.04,
    roughness: opts.roughness || 0.58,
    wireframe: App.wireframeMode,
    side: opts.solidBase ? THREE.FrontSide : THREE.DoubleSide,
  });

  const reliefMesh = new THREE.Mesh(geo, mat);
  const group = new THREE.Group();
  group.add(reliefMesh);

  // Build exact Solid Side Walls & Bottom/Back Cap from Engine3D's extraTriangles
  if (extraTriangles && extraTriangles.length > 0) {
    const extCount = extraTriangles.length * 3;
    const wPos = new Float32Array(extCount * 3);
    const wNorm = new Float32Array(extCount * 3);
    let wi = 0;
    for (let i = 0; i < extraTriangles.length; i++) {
      const [v0, v1, v2, n] = extraTriangles[i];
      for (const tv of [v0, v1, v2]) {
        wPos[wi] = tv[0] - cx;
        wPos[wi + 1] = tv[1] - cy;
        wPos[wi + 2] = tv[2] - cz;
        wNorm[wi] = n[0];
        wNorm[wi + 1] = n[1];
        wNorm[wi + 2] = n[2];
        wi += 3;
      }
    }
    const wallGeo = new THREE.BufferGeometry();
    wallGeo.setAttribute('position', new THREE.BufferAttribute(wPos, 3));
    wallGeo.setAttribute('normal', new THREE.BufferAttribute(wNorm, 3));
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.22,
      roughness: 0.68,
      wireframe: App.wireframeMode,
    });
    const wallsMesh = new THREE.Mesh(wallGeo, wallMat);
    group.add(wallsMesh);
    App.wallsMesh = wallsMesh;
  }

  App.mesh3D = group;
  App.reliefMesh = reliefMesh;
  App.scene.add(group);
  refreshActiveMaterial();

  if (App.floorGrid) App.floorGrid.position.y = -(dims.y / 2) - 8;

  const diag = Math.hypot(dims.x, dims.y);
  App.orbitSpherical.theta = 0.16;
  App.orbitSpherical.phi = Math.PI / 2.15;
  App.orbitSpherical.radius = Math.max(60, diag * 1.18);
  if (App.updateCamera) App.updateCamera();
}

function update4DAnimation(dt) {
  App.anim4D.time += dt * App.anim4D.speed;
  const tVal = App.anim4D.time;
  const anim = App.anim4D.type;

  switch (anim) {
    case 'rotate':
      App.mesh3D.rotation.set(0, tVal * 1.15, 0);
      App.mesh3D.position.set(0, 0, 0);
      App.mesh3D.scale.set(1, 1, 1);
      break;

    case 'pulse': {
      const s = 1.0 + 0.12 * Math.sin(tVal * 2.8);
      App.mesh3D.rotation.set(0, Math.sin(tVal * 1.4) * 0.18, 0);
      App.mesh3D.scale.set(s, s, s);
      break;
    }

    case 'float': {
      const dy = 5.0 * Math.sin(tVal * 2.2);
      const ry = 0.24 * Math.sin(tVal * 1.3);
      App.mesh3D.position.set(0, dy, 0);
      App.mesh3D.rotation.set(0, ry, 0.03 * Math.cos(tVal * 1.8));
      break;
    }

    case 'morph': {
      const w = 0.5 + 0.5 * Math.sin(tVal * 2.4);
      if (App.basePositions && App.flatPositions && App.reliefMesh) {
        const pos = App.reliefMesh.geometry.attributes.position;
        const arr = pos.array;
        for (let i = 0; i < arr.length; i++) {
          arr[i] = App.flatPositions[i] + (App.basePositions[i] - App.flatPositions[i]) * w;
        }
        pos.needsUpdate = true;
        App.reliefMesh.geometry.computeVertexNormals();
      }
      App.mesh3D.rotation.set(0, Math.sin(tVal * 1.1) * 0.35, 0);
      break;
    }

    case 'wave': {
      if (App.basePositions && App.reliefMesh) {
        const pos = App.reliefMesh.geometry.attributes.position;
        const arr = pos.array;
        const gw = App.gridW, gh = App.gridH;
        const total = gw * gh;
        for (let vi = 0; vi < total; vi++) {
          const gx = vi % gw, gy = (vi / gw) | 0;
          const dist = Math.hypot(gx - gw * 0.5, gy - gh * 0.5);
          const dz = 1.6 * Math.sin(tVal * 4.5 - dist * 0.24);
          arr[vi * 3 + 2] = App.basePositions[vi * 3 + 2] + dz;
        }
        pos.needsUpdate = true;
        App.reliefMesh.geometry.computeVertexNormals();
      }
      App.mesh3D.rotation.set(0, Math.sin(tVal * 0.9) * 0.22, 0);
      break;
    }
  }
}

function setupOrbitControls(canvas) {
  let isDragging = false;
  let prevX = 0, prevY = 0;
  const spherical = App.orbitSpherical;

  function updateCamera() {
    const x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
    const y = spherical.radius * Math.cos(spherical.phi);
    const z = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
    App.camera.position.set(x, y, z);
    App.camera.lookAt(0, 0, 0);
  }
  App.updateCamera = updateCamera;
  updateCamera();

  canvas.addEventListener('mousedown', (e) => { isDragging = true; prevX = e.clientX; prevY = e.clientY; });
  window.addEventListener('mouseup', () => { isDragging = false; });
  canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    spherical.theta -= (e.clientX - prevX) * 0.008;
    spherical.phi = Math.max(0.15, Math.min(Math.PI - 0.15, spherical.phi - (e.clientY - prevY) * 0.008));
    prevX = e.clientX; prevY = e.clientY;
    updateCamera();
  });

  canvas.addEventListener('wheel', (e) => {
    spherical.radius = Math.max(25, Math.min(700, spherical.radius + e.deltaY * 0.35));
    updateCamera();
    e.preventDefault();
  }, { passive: false });

  let lastTouchDist = 0;
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) { isDragging = true; prevX = e.touches[0].clientX; prevY = e.touches[0].clientY; }
    if (e.touches.length === 2) { lastTouchDist = Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY); }
  });
  canvas.addEventListener('touchend', () => { isDragging = false; });
  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && isDragging) {
      spherical.theta -= (e.touches[0].clientX - prevX) * 0.008;
      spherical.phi = Math.max(0.15, Math.min(Math.PI - 0.15, spherical.phi - (e.touches[0].clientY - prevY) * 0.008));
      prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
      updateCamera();
    }
    if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY);
      spherical.radius = Math.max(25, Math.min(700, spherical.radius - (dist - lastTouchDist) * 0.35));
      lastTouchDist = dist;
      updateCamera();
    }
    e.preventDefault();
  }, { passive: false });
}

// ─── Progress, Stats & Exports ──────────────────────────────────────────────

function showProgress(show, text, pct) {
  const ov = $('procOverlay');
  if (!ov) return;
  ov.style.display = show ? 'flex' : 'none';
  if (show) {
    $('procText').textContent = text || 'Processing…';
    $('procBar').style.width = (pct || 0) + '%';
    $('procPct').textContent = (pct || 0) + '%';
  }
}

function updateStats(result) {
  $('statVerts').textContent = result.vertexCount.toLocaleString();
  $('statTris').textContent = result.triangleCount.toLocaleString();
  const d = result.dims;
  $('statDims').textContent = `${d.x.toFixed(1)} × ${d.y.toFixed(1)} × ${d.z.toFixed(1)} mm`;
  const stlBytes = result.stlBuffer.byteLength;
  $('statSTLSize').textContent = formatBytes(stlBytes);
  const compactVerts = Math.min(result.gridW, 120) * Math.min(result.gridH, 120);
  const estGLB = compactVerts * 44 + (App.pngBytes ? App.pngBytes.byteLength : 0);
  $('statGLBSize').textContent = '~' + formatBytes(estGLB);

  if ($('exportStats')) {
    $('exportStats').innerHTML = `
      <strong>${result.triangleCount.toLocaleString()}</strong> triangles ·
      <strong>${result.vertexCount.toLocaleString()}</strong> vertices ·
      <strong>${d.x.toFixed(0)} × ${d.y.toFixed(0)} × ${d.z.toFixed(1)} mm</strong>
    `;
  }
}

function collectOpts4D() {
  const animEl = document.querySelector('[data-anim].active');
  const bakeColors = $('tBakeColors') ? $('tBakeColors').checked : true;
  return {
    animType: animEl ? animEl.dataset.anim : (App.anim4D.type || 'rotate'),
    animSpeed: parseFloat($('sAnimSpeed')?.value || 1.0),
    animDuration: parseFloat($('sAnimDur')?.value || 3.0),
    metalness: parseFloat($('sMetalness')?.value || 0.04),
    roughness: parseFloat($('sRoughness')?.value || 0.58),
    color: $('cBaseColor')?.value || '#4f8eff',
    emissive: !!($('tEmissive') && $('tEmissive').checked),
    pngBytes: bakeColors ? App.pngBytes : null,
  };
}

function triggerExportAction(fn) {
  if (typeof window.triggerStudiosProPaywall === 'function') {
    return window.triggerStudiosProPaywall(fn);
  }
  return Promise.resolve(fn());
}

function exportModel(type) {
  if (!App.lastResult) {
    toast(App.lang === 'fr' ? '⚠️ Générez un modèle d\'abord' : '⚠️ Generate a model first', 'error');
    return Promise.resolve();
  }
  return triggerExportAction(async () => {
    const result = App.lastResult;
    const opts4d = collectOpts4D();

    try {
      if (type === 'stl') {
        downloadBlob(new Blob([result.stlBuffer], { type: 'application/octet-stream' }), `studiospro_${result.shapeProfile}_3d_ultra.stl`);
        toast(`✅ STL downloaded (${formatBytes(result.stlBuffer.byteLength)})`, 'success');
      } else if (type === 'obj') {
        downloadBlob(new Blob([result.objText], { type: 'text/plain;charset=utf-8' }), 'model_3d_ultra.obj');
        downloadBlob(new Blob([result.mtlText], { type: 'text/plain;charset=utf-8' }), 'model_3d4d.mtl');
        toast('✅ OBJ + MTL downloaded!', 'success');
      } else if (type === '3mf') {
        App.renderer.render(App.scene, App.camera);
        let thumbB64 = null;
        try {
          thumbB64 = $('canvas3D').toDataURL('image/png').split(',')[1];
        } catch (_) {}
        const blob3mf = await Export3MF_N3D.build3MFBlob(result, {
          baseColor: $('cBaseColor')?.value || '#0f172a',
          accentColor: '#4f8eff',
          topColor: '#ffffff',
          thumbBase64: thumbB64,
        });
        downloadBlob(blob3mf, `StudiosPro_${result.shapeProfile}_Ultra.3mf`);
        toast(`✅ 3MF Multi-Color downloaded (${formatBytes(blob3mf.size)})`, 'success');
      } else if (type === 'glb') {
        const glbBuf = Engine4D.buildGLB(result, opts4d);
        $('statGLBSize').textContent = formatBytes(glbBuf.byteLength);
        downloadBlob(new Blob([glbBuf], { type: 'model/gltf-binary' }), `model_4d_${opts4d.animType}.glb`);
        toast(`✅ 4D GLB downloaded (${formatBytes(glbBuf.byteLength)})`, 'success');
      } else if (type === 'gltf') {
        const gltfStr = Engine4D.buildGLTF(result, opts4d);
        const blob = new Blob([gltfStr], { type: 'model/gltf+json;charset=utf-8' });
        downloadBlob(blob, `model_4d_${opts4d.animType}.gltf`);
        toast(`✅ Valid JSON GLTF 2.0 downloaded (${formatBytes(blob.size)})`, 'success');
      } else if (type === 'html') {
        const glbBuf = Engine4D.buildGLB(result, opts4d);
        const htmlBlob = await window.generateStandaloneHTMLViewer(glbBuf, `StudiosPro_${result.shapeProfile}_4D`);
        downloadBlob(htmlBlob, `StudiosPro_${result.shapeProfile}_4D_Interactive.html`);
        toast('✅ Interactive 4D HTML downloaded!', 'success');
      }
    } catch (err) {
      toast('❌ Export failed: ' + err.message, 'error');
      console.error(err);
    }
  });
}

function openInARViewer() {
  if (!App.lastResult) {
    toast(App.lang === 'fr' ? '⚠️ Générez un modèle d\'abord' : '⚠️ Generate a model first', 'error');
    return;
  }
  if (!window.StudiosProAR || typeof window.StudiosProAR.postOpenARViewer !== 'function') {
    toast('⚠️ AR Bridge unavailable', 'error');
    return;
  }
  try {
    const opts4d = collectOpts4D();
    const glbBuf = Engine4D.buildGLB(App.lastResult, opts4d);
    const d = App.lastResult.dims;
    window.StudiosProAR.postOpenARViewer({
      modelData: glbBuf,
      extension: 'glb',
      isBinary: true,
      name: `StudiosPro_${App.lastResult.shapeProfile}_4D.glb`,
      placement: App.lastResult.shapeProfile === 'curved' ? 'floor' : 'wall',
      dimensionsMm: { x: Math.round(d.x), y: Math.round(d.y), z: Math.round(d.z) },
      sourceStudio: 'new3d4d',
    });
    toast(App.lang === 'fr' ? '📲 Ouverture dans AR Viewer…' : '📲 Launching in AR Viewer…', 'success');
  } catch (err) {
    toast('❌ AR launch failed: ' + err.message, 'error');
  }
}

function recordVideo4D() {
  if (!App.mesh3D || !App.renderer) return;
  const canvas = $('canvas3D');
  if (!canvas || !canvas.captureStream) {
    toast('⚠️ Video capture unsupported in this browser', 'error');
    return;
  }
  const durationSec = Math.min(8, Math.max(2, parseFloat($('sAnimDur')?.value || 4)));
  toast(`🎥 Recording ${durationSec}s 4D Video…`, 'info');
  try {
    const stream = canvas.captureStream(30);
    let mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
    const recorder = new MediaRecorder(stream, MediaRecorder.isTypeSupported(mimeType) ? { mimeType } : undefined);
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      downloadBlob(blob, 'model_4d_clip.webm');
      toast(`✅ 4D Video saved (${formatBytes(blob.size)})`, 'success');
    };
    if (App.anim4D.type === 'none') App.anim4D.type = 'rotate';
    App.anim4D.playing = true;
    update4DStatusUI();
    recorder.start();
    setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, durationSec * 1000);
  } catch (err) {
    toast('❌ Recording failed: ' + err.message, 'error');
  }
}

function snapScreenshot4D() {
  if (!App.renderer || !App.mesh3D) return;
  App.renderer.render(App.scene, App.camera);
  $('canvas3D').toBlob((blob) => {
    if (blob) {
      downloadBlob(blob, 'model_4d_snapshot.png');
      toast('✅ 4D Snapshot saved!', 'success');
    }
  }, 'image/png');
}

// ─── Enable / Clear / Utilities ─────────────────────────────────────────────

function enableControls(enabled) {
  $('btnGenerate').disabled = !enabled;
  $('btnClear').disabled = !enabled;
  $('btnPreview2D').disabled = !enabled;
}

function enableExport(enabled) {
  ['btnExportSTL', 'btnExportOBJ', 'btnExport3MF', 'btnExportGLB', 'btnExportGLTF', 'btnExportHTML', 'btnOpenAR', 'btnQuickAR', 'btnRecordVideo', 'btnSnapShot'].forEach((id) => {
    if ($(id)) $(id).disabled = !enabled;
  });
}

function doClear() {
  App.image = null;
  App.imageData = null;
  App.pngBytes = null;
  App.lastResult = null;
  App.anim4D.playing = false;
  App.backlightMode = false;
  if ($('tBacklight')) $('tBacklight').checked = false;
  update4DStatusUI();
  clearMesh3D();
  if (App.photoTexture) { App.photoTexture.dispose(); App.photoTexture = null; }
  if (App.lithoGlowTexture) { App.lithoGlowTexture.dispose(); App.lithoGlowTexture = null; }

  $('canvas2D').style.display = 'none';
  $('pvPlaceholder').style.display = 'flex';
  $('pv3D').style.display = 'none';
  $('fileInfo').style.display = 'none';
  $('fileInput').value = '';

  ['statVerts', 'statTris', 'statDims', 'statSTLSize', 'statGLBSize'].forEach((id) => { if ($(id)) $(id).textContent = '—'; });
  enableControls(false);
  enableExport(false);
  toast(App.lang === 'fr' ? '🗑️ Espace effacé' : '🗑️ Workspace cleared', '');
}

function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

function downloadBlob(blob, filename) {
  if (typeof window.downloadBlobOverride === 'function') {
    window.downloadBlobOverride(blob, filename);
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.dataset.bypassed = 'true';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try { document.body.removeChild(a); } catch (_) {}
    URL.revokeObjectURL(url);
  }, 5000);
}

function toast(msg, type) {
  const el = $('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast ' + (type || '');
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(App._toastTimeout);
  App._toastTimeout = setTimeout(() => el.classList.remove('show'), 3500);
}
