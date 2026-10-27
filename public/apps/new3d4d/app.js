/**
 * APP.JS — Main Application Logic for 3D·4D Studio Ultra
 * Handles: image loading, preprocessing, 3D relief conversion,
 * live 4D Three.js animation engine, GLB/STL/OBJ exports, and 4D video recording.
 */

'use strict';

// ─── State ───────────────────────────────────────────────────────────────────

const App = {
    image: null,          // HTMLImageElement
    imageData: null,      // Raw ImageData (processed)
    lastResult: null,     // Last Engine3D result
    renderer: null,       // THREE.WebGLRenderer
    scene: null,
    camera: null,
    mesh3D: null,         // THREE.Mesh in viewport
    baseZCoords: null,    // Base Z heights for 4D morph/wave modulation
    gridW: 0,
    gridH: 0,
    animId: null,
    lastTime: performance.now(),
    anim4D: {
        playing: true,
        type: 'rotate',   // 'rotate', 'pulse', 'float', 'morph', 'wave', 'none'
        speed: 1.0,
        duration: 3,
        time: 0,
    },
    orbitSpherical: { theta: 0.8, phi: 0.6, radius: 180 },
    lang: 'en',
    viewMode: '3d',
    wireframeMode: false,
    zoomLevel: 1,
    thumbHistory: [],
};

// ─── DOM Helpers ──────────────────────────────────────────────────────────────

const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    initSidebarTabs();
    initUpload();
    initControls();
    initButtons();
    initLang();
    initThreeJS();
    initModeChips();
    initMobileViewSwitcher();
});

// ─── Language ────────────────────────────────────────────────────────────────

function initLang() {
    $$('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.lang-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            App.lang = btn.dataset.lang;
            applyLang(App.lang);
        });
    });
}

function applyLang(lang) {
    $$('[data-en],[data-fr]').forEach(el => {
        const text = el.dataset[lang] || el.dataset.en;
        if (text) el.textContent = text;
    });
}

// ─── Sidebar Tabs ─────────────────────────────────────────────────────────────

function initSidebarTabs() {
    $$('.stab').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.stab').forEach(b => b.classList.remove('active'));
            $$('.spanel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const panel = $('sp-' + btn.dataset.stab);
            if (panel) panel.classList.add('active');

            // If switching to 4D tab and model exists, ensure 4D play is running
            if (btn.dataset.stab === 'model4d') {
                App.anim4D.playing = true;
                update4DStatusUI();
            }
        });
    });
}

// ─── Mode Chips ──────────────────────────────────────────────────────────────

function initModeChips() {
    // 3D conversion mode chips
    $$('[data-mode3d]').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('[data-mode3d]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const mode = btn.dataset.mode3d;

            // Show/hide relevant contextual controls
            const domeRow = $('domeDepthRow');
            const bgTolRow = $('bgTolRow');
            if (domeRow) domeRow.style.display = (mode === 'portrait' || mode === 'cameo') ? '' : 'none';
            if (bgTolRow) bgTolRow.style.display = (mode === 'portrait') ? '' : '';
        });
    });

    // 4D anim chips
    $$('[data-anim]').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('[data-anim]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const anim = btn.dataset.anim;
            App.anim4D.type = anim;
            App.anim4D.time = 0;
            App.anim4D.playing = (anim !== 'none');

            // Restore mesh baseline if switching away from dynamic modifiers
            restoreMeshBaseline();
            update4DStatusUI();
            toast(`✨ 4D Animation: ${anim.toUpperCase()}`, 'info');
        });
    });

    // Material cards
    $$('.matcard').forEach(card => {
        card.addEventListener('click', () => {
            $$('.matcard').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            applyMaterialPreset(card.dataset.mat);
        });
    });

    // Quality presets
    $$('[data-preset]').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('[data-preset]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyQualityPreset(btn.dataset.preset);
        });
    });

    // Super-sampling chips
    $$('[data-ssuper]').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('[data-ssuper]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const val = btn.dataset.ssuper;
            if ($('vSuperSample')) $('vSuperSample').textContent = val + '×';
        });
    });

    // Bake Colors toggle shows/hides AO row
    const tBake = $('tBakeColors');
    if (tBake) {
        tBake.addEventListener('change', () => {
            const aoRow = $('aoRow');
            if (aoRow) aoRow.style.display = tBake.checked ? '' : 'none';
        });
    }

    // Isolate Subject toggle shows/hides Background Tolerance
    const tIsolate = $('tIsolateBg');
    if (tIsolate) {
        tIsolate.addEventListener('change', () => {
            const bgTolRow = $('bgTolRow');
            if (bgTolRow) bgTolRow.style.display = tIsolate.checked ? '' : 'none';
        });
    }
}

function applyMaterialPreset(mat) {
    const presets = {
        plastic: { metalness: 0.0, roughness: 0.5, color: '#a8d8ea' },
        metal: { metalness: 0.9, roughness: 0.2, color: '#c0c0c0' },
        gold: { metalness: 0.95, roughness: 0.15, color: '#ffd700' },
        wood: { metalness: 0.0, roughness: 0.85, color: '#8B6914' },
        glass: { metalness: 0.0, roughness: 0.05, color: '#aaccff' },
        custom: null,
    };
    const p = presets[mat];
    if (!p) return;
    $('sMetalness').value = p.metalness;
    $('vMetalness').textContent = p.metalness.toFixed(2);
    $('sRoughness').value = p.roughness;
    $('vRoughness').textContent = p.roughness.toFixed(2);
    $('cBaseColor').value = p.color;
    $('vBaseColor').textContent = p.color;

    // Apply immediately to current 3D mesh material if in non-vertex-color mode
    if (App.mesh3D && App.mesh3D.material) {
        App.mesh3D.material.metalness = p.metalness;
        App.mesh3D.material.roughness = p.roughness;
        if (!App.mesh3D.material.vertexColors) {
            App.mesh3D.material.color.set(p.color);
        }
    }
}

function applyQualityPreset(preset) {
    const presets = {
        draft: { resolution: 96, smoothing: 1, depth: 5, base: 1, ssuper: 1, method: 'box', gamma: 1.0, edgeBoost: false, bakeColors: true, subdivPass: false },
        standard: { resolution: 192, smoothing: 2, depth: 6, base: 2, ssuper: 2, method: 'bilateral', gamma: 1.0, edgeBoost: false, bakeColors: true, subdivPass: false },
        ultra: { resolution: 320, smoothing: 3, depth: 7, base: 2, ssuper: 2, method: 'both', gamma: 1.0, edgeBoost: false, bakeColors: true, subdivPass: false },
    };
    const p = presets[preset];
    if (!p) return;
    $('sResolution').value = p.resolution; $('vResolution').textContent = p.resolution;
    $('sSmoothing').value = p.smoothing; $('vSmoothing').textContent = p.smoothing;
    $('sDepth').value = p.depth; $('vDepth').textContent = p.depth;
    $('sBase').value = p.base; $('vBase').textContent = p.base;
    $('sGamma').value = p.gamma; $('vGamma').textContent = p.gamma.toFixed(2);
    if ($('sSmoothMethod')) $('sSmoothMethod').value = p.method;
    if ($('tEdgeBoost')) $('tEdgeBoost').checked = p.edgeBoost;
    if ($('tBakeColors')) $('tBakeColors').checked = p.bakeColors;
    if ($('tSubdiv')) $('tSubdiv').checked = p.subdivPass;

    // Activate corresponding super-sample chip
    $$('[data-ssuper]').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.ssuper) === p.ssuper);
    });
    if ($('vSuperSample')) $('vSuperSample').textContent = p.ssuper + '×';
}

// ─── Upload Handling ──────────────────────────────────────────────────────────

function initUpload() {
    const zone = $('uploadZone');
    const input = $('fileInput');

    zone.addEventListener('click', () => input.click());
    zone.addEventListener('keydown', e => e.key === 'Enter' && input.click());
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', () => { if (input.files[0]) loadFile(input.files[0]); });
}

function loadFile(file) {
    if (!file.type.startsWith('image/')) { toast('❌ Please load an image file', 'error'); return; }
    const reader = new FileReader();
    reader.onload = e => {
        const img = new Image();
        img.onload = () => {
            App.image = img;
            addToHistory(e.target.result, file.name);
            showFileInfo(file, img);
            drawOriginal(img);
            enableControls(true);
            toast(`✅ Loaded: ${file.name}`, 'success');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function showFileInfo(file, img) {
    $('fileInfo').style.display = 'flex';
    $('infoFilename').textContent = file.name;
    $('infoSize').textContent = formatBytes(file.size);
    $('infoDims').textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
}

function drawOriginal(img) {
    const canvas = $('canvas2D');
    const placeholder = $('pvPlaceholder');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
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
        div.innerHTML = `<img src="${item.src}" alt="${item.name}" />`;
        div.addEventListener('click', () => {
            const image = new Image();
            image.onload = () => {
                App.image = image;
                drawOriginal(image);
                enableControls(true);
                $$('.thumb-item').forEach((t, j) => t.classList.toggle('active', j === i));
            };
            image.src = item.src;
        });
        grid.appendChild(div);
    });
}

// ─── Sliders & Controls ───────────────────────────────────────────────────────

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
        ['sAnimSpeed', 'vAnimSpeed'],
        ['sAnimDur', 'vAnimDur'],
        ['sMetalness', 'vMetalness'],
        ['sRoughness', 'vRoughness'],
    ];

    sliders.forEach(([sid, vid]) => {
        const s = $(sid), v = $(vid);
        if (!s || !v) return;
        s.addEventListener('input', () => {
            v.textContent = parseFloat(s.value).toFixed(s.step && s.step.includes('.') ? 2 : 0);
            if (sid === 'sAnimSpeed') {
                App.anim4D.speed = parseFloat(s.value) || 1.0;
            }
            if (sid === 'sAnimDur') {
                App.anim4D.duration = parseFloat(s.value) || 3.0;
            }
        });
    });

    $('cBaseColor').addEventListener('input', e => {
        $('vBaseColor').textContent = e.target.value;
        if (App.mesh3D && App.mesh3D.material && !App.mesh3D.material.vertexColors) {
            App.mesh3D.material.color.set(e.target.value);
        }
    });
}

// ─── Buttons ─────────────────────────────────────────────────────────────────

function initButtons() {
    $('btnGenerate').addEventListener('click', doGenerate);
    $('btnClear').addEventListener('click', doClear);
    $('btnPreview2D').addEventListener('click', doPreview2D);

    $('btnViewMode2D').addEventListener('click', () => setViewMode('2d'));
    $('btnViewMode3D').addEventListener('click', () => setViewMode('3d'));
    $('btnResetView').addEventListener('click', resetView);
    $('btnWireframe').addEventListener('click', toggleWireframe);

    $('btnZoomIn').addEventListener('click', () => { App.zoomLevel = Math.min(App.zoomLevel * 1.25, 8); updateZoomUI(); });
    $('btnZoomOut').addEventListener('click', () => { App.zoomLevel = Math.max(App.zoomLevel / 1.25, 0.2); updateZoomUI(); });

    // 4D Play/Pause buttons
    const btnPlay4D = $('btnPlay4D');
    if (btnPlay4D) btnPlay4D.addEventListener('click', togglePlay4D);

    const btnTogglePlay4D = $('btnTogglePlay4D');
    if (btnTogglePlay4D) btnTogglePlay4D.addEventListener('click', togglePlay4D);

    // 4D Media recording & snap
    const btnRecordVideo = $('btnRecordVideo');
    if (btnRecordVideo) btnRecordVideo.addEventListener('click', recordVideo4D);

    const btnSnapShot = $('btnSnapShot');
    if (btnSnapShot) btnSnapShot.addEventListener('click', snapScreenshot4D);

    // Exports
    $('btnExportSTL').addEventListener('click', () => exportModel('stl'));
    $('btnExportOBJ').addEventListener('click', () => exportModel('obj'));
    $('btnExportGLB').addEventListener('click', () => exportModel('glb'));
    $('btnExportGLTF').addEventListener('click', () => exportModel('gltf'));
}

function setViewMode(mode) {
    App.viewMode = mode;
    $('btnViewMode2D').classList.toggle('active', mode === '2d');
    $('btnViewMode3D').classList.toggle('active', mode === '3d');
}

function toggleWireframe() {
    App.wireframeMode = !App.wireframeMode;
    if (App.mesh3D) {
        App.mesh3D.material.wireframe = App.wireframeMode;
    }
    $('btnWireframe').classList.toggle('active', App.wireframeMode);
}

function resetView() {
    App.zoomLevel = 1;
    updateZoomUI();
    if (App.orbitSpherical && App.updateCamera) {
        App.orbitSpherical.theta = 0.8;
        App.orbitSpherical.phi = 0.6;
        App.orbitSpherical.radius = 180;
        App.updateCamera();
    } else if (App.camera) {
        App.camera.position.set(60, 60, 160);
        App.camera.lookAt(0, 0, 0);
    }
    if (App.mesh3D) {
        App.mesh3D.rotation.y = 0;
        App.mesh3D.position.set(0, 0, 0);
        App.mesh3D.scale.set(1, 1, 1);
    }
}

function updateZoomUI() {
    $('zoomVal').textContent = Math.round(App.zoomLevel * 100) + '%';
    if (App.camera && App.orbitSpherical && App.updateCamera) {
        App.orbitSpherical.radius = 180 / App.zoomLevel;
        App.updateCamera();
    }
}

function togglePlay4D() {
    App.anim4D.playing = !App.anim4D.playing;
    if (!App.anim4D.playing) {
        restoreMeshBaseline();
    }
    update4DStatusUI();
    toast(App.anim4D.playing ? '▶ 4D Animation Playing' : '⏸ 4D Animation Paused', 'info');
}

function update4DStatusUI() {
    const badge = $('badge4DLive');
    const btn1 = $('btnPlay4D');
    const btn2 = $('btnTogglePlay4D');
    const text = App.anim4D.playing ? '⏸ Pause 4D' : '▶ Play 4D';

    if (btn1) btn1.textContent = App.anim4D.playing ? '⏸ 4D' : '▶ 4D';
    if (btn2) btn2.innerHTML = `${App.anim4D.playing ? '⏸' : '▶'} <span data-en="${text}">${text}</span>`;
    if (badge) {
        badge.textContent = App.anim4D.playing ? `✨ 4D RUNNING (${App.anim4D.type.toUpperCase()})` : '⏸ 4D PAUSED';
        badge.style.background = App.anim4D.playing ? 'rgba(168,85,247,0.25)' : 'rgba(255,255,255,0.1)';
        badge.style.color = App.anim4D.playing ? '#c084fc' : '#94a3b8';
    }
}

function restoreMeshBaseline() {
    if (!App.mesh3D) return;
    App.mesh3D.rotation.y = 0;
    App.mesh3D.rotation.z = 0;
    App.mesh3D.position.set(0, 0, 0);
    App.mesh3D.scale.set(1, 1, 1);

    if (App.baseZCoords && App.mesh3D.geometry) {
        const pos = App.mesh3D.geometry.attributes.position;
        for (let i = 0; i < App.baseZCoords.length; i++) {
            pos.setZ(i, App.baseZCoords[i]);
        }
        pos.needsUpdate = true;
        App.mesh3D.geometry.computeVertexNormals();
    }
}

// ─── Image Preprocessing ──────────────────────────────────────────────────────

function getProcessedImageData() {
    if (!App.image) return null;
    const proc = $('canvasProc');
    proc.width = App.image.naturalWidth;
    proc.height = App.image.naturalHeight;
    const ctx = proc.getContext('2d');

    ctx.drawImage(App.image, 0, 0);
    let imgData = ctx.getImageData(0, 0, proc.width, proc.height);
    let data = imgData.data;

    const brightness = parseInt($('sBrightness').value);
    const contrast = parseInt($('sContrast').value);
    const saturation = parseInt($('sSaturation').value);
    const grayToggle = $('tGrayscale').checked;
    const invertToggle = $('tInvert').checked;
    const edgeToggle = $('tEdge').checked;
    const blurVal = parseInt($('sBlur').value);

    if (blurVal > 0) {
        data = boxBlur(data, proc.width, proc.height, blurVal);
    }

    for (let i = 0; i < data.length; i += 4) {
        let r = data[i], g = data[i + 1], b = data[i + 2];

        if (saturation !== 0) {
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            const s = (saturation + 100) / 100;
            r = lum + (r - lum) * s;
            g = lum + (g - lum) * s;
            b = lum + (b - lum) * s;
        }

        if (grayToggle) {
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            r = g = b = lum;
        }

        if (brightness !== 0) { r += brightness; g += brightness; b += brightness; }

        if (contrast !== 0) {
            const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
            r = factor * (r - 128) + 128;
            g = factor * (g - 128) + 128;
            b = factor * (b - 128) + 128;
        }

        if (invertToggle) { r = 255 - r; g = 255 - g; b = 255 - b; }

        data[i] = clamp(r);
        data[i + 1] = clamp(g);
        data[i + 2] = clamp(b);
    }

    imgData.data.set(data);

    if (edgeToggle) {
        imgData = edgeEnhance(imgData, proc.width, proc.height);
    }

    ctx.putImageData(imgData, 0, 0);
    return ctx.getImageData(0, 0, proc.width, proc.height);
}

function doPreview2D() {
    if (!App.image) { toast('⚠️ Please load an image first', 'error'); return; }
    const processed = getProcessedImageData();
    const canvas = $('canvas2D');
    canvas.width = processed.width;
    canvas.height = processed.height;
    canvas.getContext('2d').putImageData(processed, 0, 0);
    toast('✅ 2D Preview updated', 'info');
}

function boxBlur(data, w, h, radius) {
    const out = new Uint8ClampedArray(data.length);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let r = 0, g = 0, b = 0, cnt = 0;
            for (let dy = -radius; dy <= radius; dy++) {
                const ny = y + dy;
                if (ny < 0 || ny >= h) continue;
                for (let dx = -radius; dx <= radius; dx++) {
                    const nx = x + dx;
                    if (nx < 0 || nx >= w) continue;
                    const idx = (ny * w + nx) * 4;
                    r += data[idx]; g += data[idx + 1]; b += data[idx + 2];
                    cnt++;
                }
            }
            const i = (y * w + x) * 4;
            out[i] = r / cnt; out[i + 1] = g / cnt; out[i + 2] = b / cnt; out[i + 3] = data[i + 3];
        }
    }
    return out;
}

function edgeEnhance(imgData, w, h) {
    const d = imgData.data;
    const out = new Uint8ClampedArray(d.length);
    const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            for (let c = 0; c < 3; c++) {
                let sum = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        sum += d[((y + ky) * w + (x + kx)) * 4 + c] * kernel[(ky + 1) * 3 + (kx + 1)];
                    }
                }
                out[(y * w + x) * 4 + c] = clamp(sum);
            }
            out[(y * w + x) * 4 + 3] = 255;
        }
    }
    imgData.data.set(out);
    return imgData;
}


// ─── Mobile View Switcher ───────────────────────────────────────────────────

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
        setTimeout(() => resizeThreeJS(), 60);
    });
}

// ─── 3D & 4D Generation ───────────────────────────────────────────────────────

async function doGenerate() {
    if (!App.image) { toast('⚠️ Please load an image first', 'error'); return; }

    // Show 3D panel + progress overlay
    $('pv3D').style.display = 'flex';
    await new Promise(r => setTimeout(r, 30));
    resizeThreeJS();
    showProgress(true, 'Analyzing image & contours…', 5);

    const modeEl = document.querySelector('[data-mode3d].active');
    const mode3d = modeEl ? modeEl.dataset.mode3d : 'relief';

    const ssuperEl = document.querySelector('[data-ssuper].active');
    const superSample = ssuperEl ? parseInt(ssuperEl.dataset.ssuper) : 2;

    // Extract pure original full-color image data (not affected by grayscale/threshold controls)
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = App.image.naturalWidth;
    colorCanvas.height = App.image.naturalHeight;
    const colorCtx = colorCanvas.getContext('2d');
    colorCtx.drawImage(App.image, 0, 0);
    const rawColorData = colorCtx.getImageData(0, 0, colorCanvas.width, colorCanvas.height);

    const opts3d = {
        mode: mode3d,
        resolution: parseInt($('sResolution').value) || 256,
        depthMM: parseFloat($('sDepth').value) || 6,
        baseMM: parseFloat($('sBase').value) || 2,
        scaleMM: parseFloat($('sScale').value) || 100,
        smoothPasses: parseInt($('sSmoothing').value) || 3,
        smoothMethod: $('sSmoothMethod') ? $('sSmoothMethod').value : 'bilateral',
        superSample,
        gamma: parseFloat($('sGamma').value) || 1.0,
        edgeBoost: false, // Prevents needle spikes
        bakeColors: $('tBakeColors') ? $('tBakeColors').checked : true,
        aoStrength: $('sAO') ? parseFloat($('sAO').value) : 0.35,
        subdivPass: false,
        solidBase: $('tSolidBase').checked,
        mirrorY: $('tMirrorY').checked,
        isolateSubject: $('tIsolateBg') ? $('tIsolateBg').checked : false, // False by default! No tearing
        bgTolerance: $('sBgTolerance') ? parseFloat($('sBgTolerance').value) : 40,
        domeDepth: $('sDomeDepth') ? parseFloat($('sDomeDepth').value) : 55,
        invertDepth: $('tInvertDepth') ? $('tInvertDepth').checked : false,
        color: $('cBaseColor').value,
        metalness: 0.05,
        roughness: 0.65,
        colorData: rawColorData,
    };

    await new Promise(r => setTimeout(r, 40));

    try {
        showProgress(true, 'Processing image layers…', 15);
        App.imageData = getProcessedImageData();
        await new Promise(r => setTimeout(r, 20));

        showProgress(true, 'Sculpting high-precision 3D relief…', 25);
        await new Promise(r => setTimeout(r, 20));

        const result = Engine3D.generate(App.imageData, opts3d, (prog, msg) => {
            showProgress(true, msg, Math.round(prog * 65) + 25);
        });

        App.lastResult = result;

        showProgress(true, 'Rendering 3D/4D real-time viewport…', 92);
        await new Promise(r => setTimeout(r, 30));

        render3DPreview(result, opts3d);
        resizeThreeJS();

        // Ensure 4D animation starts smoothly
        App.anim4D.playing = true;
        update4DStatusUI();

        showProgress(false);
        updateStats(result);
        enableExport(true);
        // On mobile, auto-switch to 3D Viewport when generation completes
        if (window.innerWidth <= 900 && $('btnMobViewport')) {
            $('btnMobViewport').click();
        }
        toast('⚡ High-Quality 3D & 4D Model ready!', 'success');

    } catch (err) {
        showProgress(false);
        toast('❌ Generation failed: ' + err.message, 'error');
        console.error(err);
    }
}

// ─── Three.js Setup & Live 4D Animation Engine ───────────────────────────────

function resizeThreeJS() {
    if (!App.renderer || !$('canvas3D')) return;
    const wrap = $('canvas3D').parentElement;
    const w = wrap.clientWidth || 400;
    const h = wrap.clientHeight || 300;
    App.renderer.setSize(w, h);
    if (App.camera) {
        App.camera.aspect = w / h;
        App.camera.updateProjectionMatrix();
    }
}

function initThreeJS() {
    const canvas3D = $('canvas3D');
    App.renderer = new THREE.WebGLRenderer({
        canvas: canvas3D,
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true // Required for screenshot & video recording
    });
    App.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    App.renderer.shadowMap.enabled = true;
    App.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    App.renderer.setClearColor(0x060c1a, 1);
    App.renderer.setSize(400, 300);

    App.scene = new THREE.Scene();
    App.scene.background = new THREE.Color(0x060c1a);

    // Studio grid floor
    const grid = new THREE.GridHelper(300, 30, 0x1e293b, 0x0f172a);
    grid.position.y = -10;
    App.scene.add(grid);

    // Camera
    App.camera = new THREE.PerspectiveCamera(45, 400 / 300, 0.1, 5000);
    App.camera.position.set(60, 60, 160);

    // Neutral Studio Relief Lighting (No colored purple/blue glares)
    const ambient = new THREE.AmbientLight(0xffffff, 0.78);
    App.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.95);
    keyLight.position.set(80, 140, 100);
    keyLight.castShadow = true;
    App.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xf1f5f9, 0.35);
    fillLight.position.set(-80, 60, -60);
    App.scene.add(fillLight);

    const backRim = new THREE.DirectionalLight(0xe2e8f0, 0.25);
    backRim.position.set(0, 100, -120);
    App.scene.add(backRim);

    setupOrbitControls(canvas3D);

    // ─── 4D Live Animation Loop (60 FPS) ───
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

function update4DAnimation(dt) {
    App.anim4D.time += dt * App.anim4D.speed;
    const t = App.anim4D.time;
    const anim = App.anim4D.type;

    switch (anim) {
        case 'rotate':
            // Smooth continuous 360° turntable spin around vertical Y axis
            App.mesh3D.rotation.y = t * 1.25;
            App.mesh3D.position.set(0, 0, 0);
            App.mesh3D.scale.set(1, 1, 1);
            break;

        case 'pulse': {
            // Sinusoidal 3D breathing pulse
            const s = 1.0 + 0.18 * Math.sin(t * 3.0);
            App.mesh3D.scale.set(s, s, s);
            break;
        }

        case 'float': {
            // Levitation floating wave with gentle tilt
            const dy = 7.0 * Math.sin(t * 2.2);
            const tilt = 0.04 * Math.sin(t * 1.6);
            App.mesh3D.position.set(0, dy, 0);
            App.mesh3D.rotation.z = tilt;
            break;
        }

        case 'morph': {
            // Dynamic real-time morphing between 2D flat photo & sculpted 3D relief!
            const morph = 0.5 + 0.5 * Math.sin(t * 2.4);
            if (App.baseZCoords && App.mesh3D.geometry) {
                const pos = App.mesh3D.geometry.attributes.position;
                for (let i = 0; i < App.baseZCoords.length; i++) {
                    pos.setZ(i, App.baseZCoords[i] * morph);
                }
                pos.needsUpdate = true;
            }
            App.mesh3D.rotation.y = Math.sin(t * 0.8) * 0.25;
            break;
        }

        case 'wave': {
            // Harmonic ripple wave traveling across surface
            if (App.baseZCoords && App.mesh3D.geometry) {
                const pos = App.mesh3D.geometry.attributes.position;
                const gw = App.gridW, gh = App.gridH;
                for (let gy = 0; gy < gh; gy++) {
                    for (let gx = 0; gx < gw; gx++) {
                        const idx = gy * gw + gx;
                        const dist = Math.sqrt((gx - gw / 2) ** 2 + (gy - gh / 2) ** 2);
                        const waveVal = 2.0 * Math.sin(t * 5.0 - dist * 0.25);
                        pos.setZ(idx, App.baseZCoords[idx] + waveVal);
                    }
                }
                pos.needsUpdate = true;
            }
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

    canvas.addEventListener('mousedown', e => { isDragging = true; prevX = e.clientX; prevY = e.clientY; });
    window.addEventListener('mouseup', () => { isDragging = false; });
    canvas.addEventListener('mousemove', e => {
        if (!isDragging) return;
        const dx = (e.clientX - prevX) * 0.008;
        const dy = (e.clientY - prevY) * 0.008;
        spherical.theta -= dx;
        spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi - dy));
        prevX = e.clientX; prevY = e.clientY;
        updateCamera();
    });

    canvas.addEventListener('wheel', e => {
        spherical.radius = Math.max(30, Math.min(600, spherical.radius + e.deltaY * 0.4));
        updateCamera();
        e.preventDefault();
    }, { passive: false });

    // Touch orbit & pinch-zoom
    let lastTouchDist = 0;
    canvas.addEventListener('touchstart', e => {
        if (e.touches.length === 1) { isDragging = true; prevX = e.touches[0].clientX; prevY = e.touches[0].clientY; }
        if (e.touches.length === 2) { lastTouchDist = Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY); }
    });
    canvas.addEventListener('touchend', () => { isDragging = false; });
    canvas.addEventListener('touchmove', e => {
        if (e.touches.length === 1 && isDragging) {
            const dx = (e.touches[0].clientX - prevX) * 0.008;
            const dy = (e.touches[0].clientY - prevY) * 0.008;
            spherical.theta -= dx;
            spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi - dy));
            prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
            updateCamera();
        }
        if (e.touches.length === 2) {
            const dist = Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY);
            spherical.radius = Math.max(30, Math.min(600, spherical.radius - (dist - lastTouchDist) * 0.4));
            lastTouchDist = dist;
            updateCamera();
        }
        e.preventDefault();
    }, { passive: false });
}

function render3DPreview(result, opts) {
    if (App.mesh3D) {
        App.scene.remove(App.mesh3D);
        App.mesh3D.geometry.dispose();
        App.mesh3D.material.dispose();
        App.mesh3D = null;
    }

    const { gridW, gridH, hmap, dims, mesh } = result;
    const hasVertexColors = Boolean(mesh && mesh.vertexColors);

    // Centered plane geometry: width = dims.x, height = dims.y
    const geo = new THREE.PlaneGeometry(dims.x, dims.y, gridW - 1, gridH - 1);
    const pos = geo.attributes.position;

    // Save baseline Z coordinates for dynamic 4D morphing
    const baseZ = new Float32Array(gridW * gridH);

    for (let gy = 0; gy < gridH; gy++) {
        for (let gx = 0; gx < gridW; gx++) {
            const hmapIdx = (gridH - 1 - gy) * gridW + gx;
            const h = hmap[hmapIdx];
            const vertIdx = gy * gridW + gx;
            const zVal = opts.baseMM + h * opts.depthMM;
            pos.setZ(vertIdx, zVal);
            baseZ[vertIdx] = zVal;
        }
    }
    pos.needsUpdate = true;
    App.baseZCoords = baseZ;
    App.gridW = gridW;
    App.gridH = gridH;

    // Attach photorealistic vertex colors
    if (hasVertexColors) {
        const vcol = new Float32Array(gridW * gridH * 3);
        for (let gy = 0; gy < gridH; gy++) {
            for (let gx = 0; gx < gridW; gx++) {
                const src = ((gridH - 1 - gy) * gridW + gx) * 3;
                const dst = (gy * gridW + gx) * 3;
                vcol[dst] = mesh.vertexColors[src] || 0;
                vcol[dst + 1] = mesh.vertexColors[src + 1] || 0;
                vcol[dst + 2] = mesh.vertexColors[src + 2] || 0;
            }
        }
        geo.setAttribute('color', new THREE.BufferAttribute(vcol, 3));
    }

    geo.computeVertexNormals();

    const colorHex = parseInt((opts.color || '#4f8eff').replace('#', ''), 16);
    const mat = new THREE.MeshStandardMaterial({
        color: hasVertexColors ? 0xffffff : colorHex,
        vertexColors: hasVertexColors,
        metalness: hasVertexColors ? 0.05 : Math.min(opts.metalness || 0, 0.7),
        roughness: hasVertexColors ? 0.65 : Math.max(opts.roughness || 0.5, 0.25),
        wireframe: App.wireframeMode,
        side: THREE.DoubleSide,
    });

    App.mesh3D = new THREE.Mesh(geo, mat);
    App.mesh3D.rotation.x = -Math.PI / 2;
    // Exactly centered at (0, 0, 0)
    App.mesh3D.position.set(0, 0, 0);
    App.mesh3D.castShadow = true;
    App.mesh3D.receiveShadow = true;
    App.scene.add(App.mesh3D);

    // Frame camera on center
    const diag = Math.sqrt(dims.x * dims.x + dims.y * dims.y);
    if (App.orbitSpherical && App.updateCamera) {
        App.orbitSpherical.radius = diag * 1.35;
        App.updateCamera();
    }
}

// ─── Progress & Stats ─────────────────────────────────────────────────────────

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
    const stlKB = Math.ceil(result.stlBuffer.byteLength / 1024);
    $('statSTLSize').textContent = stlKB > 1024 ? (stlKB / 1024).toFixed(1) + ' MB' : stlKB + ' KB';
    const glbKB = Math.ceil(stlKB * 0.82);
    $('statGLBSize').textContent = glbKB > 1024 ? (glbKB / 1024).toFixed(1) + ' MB' : '~' + glbKB + ' KB';

    if ($('exportStats')) {
        $('exportStats').innerHTML = `
            <strong>${result.triangleCount.toLocaleString()}</strong> triangles ·
            <strong>${result.vertexCount.toLocaleString()}</strong> vertices ·
            Dimensions: <strong>${d.x.toFixed(0)} × ${d.y.toFixed(0)} mm</strong>
        `;
    }
}

// ─── Exports & Media Recording ────────────────────────────────────────────────

function exportModel(type) {
    if (!App.lastResult) { toast('⚠️ Generate a model first', 'error'); return; }

    const result = App.lastResult;
    const animEl = document.querySelector('[data-anim].active');

    const opts4d = {
        animType: animEl ? animEl.dataset.anim : (App.anim4D.type || 'rotate'),
        animSpeed: parseFloat($('sAnimSpeed').value) || 1.0,
        animDuration: parseFloat($('sAnimDur').value) || 3.0,
        metalness: parseFloat($('sMetalness').value) || 0,
        roughness: parseFloat($('sRoughness').value) || 0.5,
        color: $('cBaseColor').value || '#4f8eff',
        emissive: $('tEmissive') ? $('tEmissive').checked : false,
    };

    try {
        if (type === 'stl') {
            downloadBinary(result.stlBuffer, 'model_3d_ultra.stl');
            toast('✅ STL downloaded! (' + formatBytes(result.stlBuffer.byteLength) + ')', 'success');

        } else if (type === 'obj') {
            downloadText(result.objText, 'model_3d_ultra.obj');
            downloadText(result.mtlText, 'model_3d_ultra.mtl');
            toast('✅ OBJ + MTL downloaded!', 'success');

        } else if (type === 'glb' || type === 'gltf') {
            const glbBuf = Engine4D.buildGLB(result, opts4d);
            const ext = type === 'gltf' ? 'gltf' : 'glb';
            downloadBinary(glbBuf, `model_4d_${opts4d.animType}.${ext}`);
            toast(`✅ 4D ${ext.toUpperCase()} with embedded animation downloaded! (${formatBytes(glbBuf.byteLength)})`, 'success');
        }
    } catch (err) {
        toast('❌ Export failed: ' + err.message, 'error');
        console.error('Export error:', err);
    }
}

function recordVideo4D() {
    if (!App.mesh3D || !App.renderer) {
        toast('⚠️ Generate a model first', 'error');
        return;
    }

    const canvas = $('canvas3D');
    if (!canvas || !canvas.captureStream) {
        toast('⚠️ Video recording not supported by browser', 'error');
        return;
    }

    const durationSec = Math.min(8, Math.max(2, parseFloat($('sAnimDur').value) || 4));
    toast(`🎥 Recording 4D Video (${durationSec}s)... Keep tab active`, 'info');

    try {
        const stream = canvas.captureStream(30);
        let mimeType = 'video/webm;codecs=vp9';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/webm';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/mp4';
            }
        }

        const recorder = new MediaRecorder(stream, {
            mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined
        });
        const chunks = [];

        recorder.ondataavailable = e => {
            if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
            const ext = (mimeType && mimeType.includes('mp4')) ? 'mp4' : 'webm';
            saveAs(blob, `model_4d_clip.${ext}`);
            toast(`✅ 4D Video downloaded! (${formatBytes(blob.size)})`, 'success');
        };

        App.anim4D.playing = true;
        update4DStatusUI();
        recorder.start();

        setTimeout(() => {
            if (recorder.state === 'recording') {
                recorder.stop();
            }
        }, durationSec * 1000);

    } catch (err) {
        console.error('Record video error:', err);
        toast('❌ Video recording failed: ' + err.message, 'error');
    }
}

function snapScreenshot4D() {
    if (!App.renderer || !App.mesh3D) {
        toast('⚠️ Generate a model first', 'error');
        return;
    }
    App.renderer.render(App.scene, App.camera);
    const canvas = $('canvas3D');
    canvas.toBlob(blob => {
        if (blob) {
            saveAs(blob, 'model_4d_snapshot.png');
            toast('✅ 4D Snapshot saved!', 'success');
        }
    }, 'image/png');
}

// ─── Enable / Disable / Clear ─────────────────────────────────────────────────

function enableControls(enabled) {
    $('btnGenerate').disabled = !enabled;
    $('btnClear').disabled = !enabled;
    $('btnPreview2D').disabled = !enabled;
}

function enableExport(enabled) {
    ['btnExportSTL', 'btnExportOBJ', 'btnExportGLB', 'btnExportGLTF'].forEach(id => {
        if ($(id)) $(id).disabled = !enabled;
    });
    if ($('btnRecordVideo')) $('btnRecordVideo').disabled = !enabled;
    if ($('btnSnapShot')) $('btnSnapShot').disabled = !enabled;
}

function doClear() {
    App.image = null;
    App.imageData = null;
    App.lastResult = null;

    if (App.mesh3D) {
        App.scene.remove(App.mesh3D);
        App.mesh3D.geometry.dispose();
        App.mesh3D.material.dispose();
        App.mesh3D = null;
    }

    $('canvas2D').style.display = 'none';
    $('pvPlaceholder').style.display = 'flex';
    $('pv3D').style.display = 'none';
    $('fileInfo').style.display = 'none';
    $('fileInput').value = '';

    ['statVerts', 'statTris', 'statDims', 'statSTLSize', 'statGLBSize'].forEach(id => {
        if ($(id)) $(id).textContent = '—';
    });

    enableControls(false);
    enableExport(false);
    toast('🗑️ Workspace cleared', '');
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function clamp(v, min = 0, max = 255) { return Math.max(min, Math.min(max, v)); }

function formatBytes(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
}

function downloadBinary(buffer, filename) {
    try {
        const blob = new Blob([buffer], { type: 'application/octet-stream' });
        if (typeof saveAs !== 'undefined') {
            saveAs(blob, filename);
        } else {
            const url = URL.createObjectURL(blob);
            const a = Object.assign(document.createElement('a'), { href: url, download: filename });
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 5000);
        }
    } catch (e) {
        toast('❌ Download error: ' + e.message, 'error');
        console.error(e);
    }
}

function downloadText(text, filename) {
    try {
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        if (typeof saveAs !== 'undefined') {
            saveAs(blob, filename);
        } else {
            const url = URL.createObjectURL(blob);
            const a = Object.assign(document.createElement('a'), { href: url, download: filename });
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 5000);
        }
    } catch (e) {
        toast('❌ Download error: ' + e.message, 'error');
        console.error(e);
    }
}

function toast(msg, type) {
    const el = $('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'toast ' + (type || '');
    requestAnimationFrame(() => { el.classList.add('show'); });
    clearTimeout(App._toastTimeout);
    App._toastTimeout = setTimeout(() => { el.classList.remove('show'); }, 3500);
}
