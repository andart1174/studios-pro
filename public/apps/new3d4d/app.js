/**
 * APP.JS — Main Application Logic for 3D·4D Studio Ultra
 * Handles: image loading, preprocessing, 3D relief conversion,
 * high-resolution photo texture mapping, live 4D Three.js animation engine,
 * GLB/STL/OBJ exports, and 4D video recording.
 */

'use strict';

// ─── State ───────────────────────────────────────────────────────────────────

const App = {
    image: null,          // HTMLImageElement
    imageData: null,      // Raw ImageData (processed)
    pngBytes: null,       // Uint8Array of PNG texture for GLB embedding
    photoTexture: null,   // THREE.CanvasTexture for crisp HD 3D viewport
    lastResult: null,     // Last Engine3D result
    renderer: null,       // THREE.WebGLRenderer
    scene: null,
    camera: null,
    mesh3D: null,         // THREE.Group in viewport (contains reliefMesh + solidFrame)
    reliefMesh: null,     // Front sculpted THREE.Mesh
    baseZCoords: null,    // Base Z heights for 4D morph/wave modulation
    gridW: 0,
    gridH: 0,
    animId: null,
    lastTime: performance.now(),
    anim4D: {
        playing: false,   // Static by default on generation! Only plays when user activates 4D
        type: 'rotate',   // 'rotate', 'pulse', 'float', 'morph', 'wave', 'none'
        speed: 1.0,
        duration: 3,
        time: 0,
    },
    // Upright front-facing spherical camera (theta = 0, phi = PI/2 looks straight at XY plane!)
    orbitSpherical: { theta: 0.0, phi: Math.PI / 2, radius: 175 },
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
    update4DStatusUI();
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

            const domeRow = $('domeDepthRow');
            if (domeRow) domeRow.style.display = (mode === 'portrait' || mode === 'cameo') ? '' : 'none';
        });
    });

    // 4D anim chips — clicking a motion chip starts that 4D animation; clicking 'none' stops it
    $$('[data-anim]').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('[data-anim]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const anim = btn.dataset.anim;
            App.anim4D.type = anim;
            App.anim4D.time = 0;
            App.anim4D.playing = (anim !== 'none');

            restoreMeshBaseline();
            update4DStatusUI();
            toast(anim === 'none' ? '⏸ 4D Static Mode' : `✨ 4D Animation: ${anim.toUpperCase()}`, 'info');
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
        plastic: { metalness: 0.04, roughness: 0.55, color: '#a8d8ea' },
        metal: { metalness: 0.85, roughness: 0.22, color: '#c0c0c0' },
        gold: { metalness: 0.90, roughness: 0.18, color: '#ffd700' },
        wood: { metalness: 0.02, roughness: 0.82, color: '#8B6914' },
        glass: { metalness: 0.05, roughness: 0.10, color: '#aaccff' },
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

    if (App.reliefMesh && App.reliefMesh.material) {
        const m = App.reliefMesh.material;
        if (mat === 'gold' || mat === 'metal' || mat === 'wood') {
            // Let user preview metallic/gold/wood finish on the sculpture
            m.map = null;
            m.vertexColors = false;
            m.color.set(p.color);
            m.metalness = p.metalness;
            m.roughness = p.roughness;
            m.needsUpdate = true;
        } else if (App.photoTexture && (!$('tBakeColors') || $('tBakeColors').checked)) {
            m.map = App.photoTexture;
            m.color.set(0xffffff);
            m.metalness = 0.04;
            m.roughness = 0.58;
            m.needsUpdate = true;
        }
    }
}

function applyQualityPreset(preset) {
    const presets = {
        draft: { resolution: 128, smoothing: 2, depth: 5, base: 2, ssuper: 1, method: 'bilateral', gamma: 1.0, edgeBoost: false, bakeColors: true, subdivPass: false },
        standard: { resolution: 256, smoothing: 3, depth: 5, base: 2, ssuper: 2, method: 'bilateral', gamma: 1.0, edgeBoost: false, bakeColors: true, subdivPass: false },
        ultra: { resolution: 384, smoothing: 4, depth: 6, base: 2, ssuper: 2, method: 'both', gamma: 1.0, edgeBoost: false, bakeColors: true, subdivPass: false },
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
        if (App.reliefMesh && App.reliefMesh.material && !App.reliefMesh.material.map) {
            App.reliefMesh.material.color.set(e.target.value);
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

    const btnPlay4D = $('btnPlay4D');
    if (btnPlay4D) btnPlay4D.addEventListener('click', togglePlay4D);

    const btnTogglePlay4D = $('btnTogglePlay4D');
    if (btnTogglePlay4D) btnTogglePlay4D.addEventListener('click', togglePlay4D);

    const btnRecordVideo = $('btnRecordVideo');
    if (btnRecordVideo) btnRecordVideo.addEventListener('click', recordVideo4D);

    const btnSnapShot = $('btnSnapShot');
    if (btnSnapShot) btnSnapShot.addEventListener('click', snapScreenshot4D);

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
    if (App.reliefMesh && App.reliefMesh.material) {
        App.reliefMesh.material.wireframe = App.wireframeMode;
    }
    $('btnWireframe').classList.toggle('active', App.wireframeMode);
}

function resetView() {
    App.zoomLevel = 1;
    updateZoomUI();
    if (App.orbitSpherical && App.updateCamera) {
        App.orbitSpherical.theta = 0.0;
        App.orbitSpherical.phi = Math.PI / 2;
        if (App.lastResult && App.lastResult.dims) {
            const diag = Math.sqrt(App.lastResult.dims.x ** 2 + App.lastResult.dims.y ** 2);
            App.orbitSpherical.radius = diag * 1.15;
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
            ? Math.sqrt(App.lastResult.dims.x ** 2 + App.lastResult.dims.y ** 2) * 1.15
            : 175;
        App.orbitSpherical.radius = baseR / App.zoomLevel;
        App.updateCamera();
    }
}

function togglePlay4D() {
    if (!App.anim4D.playing && App.anim4D.type === 'none') {
        App.anim4D.type = 'rotate';
        $$('[data-anim]').forEach(b => b.classList.toggle('active', b.dataset.anim === 'rotate'));
    }
    App.anim4D.playing = !App.anim4D.playing;
    if (!App.anim4D.playing) {
        restoreMeshBaseline();
    }
    update4DStatusUI();
    toast(App.anim4D.playing ? '▶ 4D Animation Playing' : '⏸ 4D Animation Paused (Static 3D)', 'info');
}

function update4DStatusUI() {
    const badge = $('badge4DLive');
    const btn1 = $('btnPlay4D');
    const btn2 = $('btnTogglePlay4D');
    const text = App.anim4D.playing ? '⏸ Pause 4D' : '▶ Play 4D';

    if (btn1) btn1.textContent = App.anim4D.playing ? '⏸ 4D' : '▶ 4D';
    if (btn2) btn2.innerHTML = `${App.anim4D.playing ? '⏸' : '▶'} <span data-en="${text}">${text}</span>`;
    if (badge) {
        badge.textContent = App.anim4D.playing ? `✨ 4D ACTIVE (${App.anim4D.type.toUpperCase()})` : '📦 3D STATIC VIEW';
        badge.style.background = App.anim4D.playing ? 'rgba(168,85,247,0.25)' : 'rgba(59,130,246,0.18)';
        badge.style.color = App.anim4D.playing ? '#c084fc' : '#60a5fa';
    }
}

function restoreMeshBaseline() {
    if (!App.mesh3D) return;
    App.mesh3D.rotation.set(0, 0, 0);
    App.mesh3D.position.set(0, 0, 0);
    App.mesh3D.scale.set(1, 1, 1);

    if (App.baseZCoords && App.reliefMesh && App.reliefMesh.geometry) {
        const pos = App.reliefMesh.geometry.attributes.position;
        for (let i = 0; i < App.baseZCoords.length; i++) {
            pos.setZ(i, App.baseZCoords[i]);
        }
        pos.needsUpdate = true;
        App.reliefMesh.geometry.computeVertexNormals();
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

// ─── Helper: Extract PNG Bytes from Canvas for GLB Embedding ────────────────

function canvasToPngBytes(canvas) {
    try {
        const dataUrl = canvas.toDataURL('image/png');
        const base64 = dataUrl.split(',')[1];
        const binStr = atob(base64);
        const bytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) {
            bytes[i] = binStr.charCodeAt(i);
        }
        return bytes;
    } catch (e) {
        console.warn('Could not encode PNG texture for GLB:', e);
        return null;
    }
}

// ─── 3D & 4D Generation ───────────────────────────────────────────────────────

async function doGenerate() {
    if (!App.image) { toast('⚠️ Please load an image first', 'error'); return; }

    $('pv3D').style.display = 'flex';
    await new Promise(r => setTimeout(r, 30));
    resizeThreeJS();
    showProgress(true, 'Analyzing image & contours…', 5);

    const modeEl = document.querySelector('[data-mode3d].active');
    const mode3d = modeEl ? modeEl.dataset.mode3d : 'relief';

    const ssuperEl = document.querySelector('[data-ssuper].active');
    const superSample = ssuperEl ? parseInt(ssuperEl.dataset.ssuper) : 2;

    // Build high-res color canvas & texture from original image
    const colorCanvas = document.createElement('canvas');
    const maxTexDim = 1024;
    const scaleFactor = Math.min(1, maxTexDim / Math.max(App.image.naturalWidth, App.image.naturalHeight));
    colorCanvas.width = Math.max(64, Math.round(App.image.naturalWidth * scaleFactor));
    colorCanvas.height = Math.max(64, Math.round(App.image.naturalHeight * scaleFactor));
    const colorCtx = colorCanvas.getContext('2d');
    colorCtx.drawImage(App.image, 0, 0, colorCanvas.width, colorCanvas.height);
    const rawColorData = colorCtx.getImageData(0, 0, colorCanvas.width, colorCanvas.height);

    // Save PNG bytes for GLB texture embedding
    App.pngBytes = canvasToPngBytes(colorCanvas);

    // Create Three.js HD photo texture
    if (App.photoTexture) App.photoTexture.dispose();
    App.photoTexture = new THREE.CanvasTexture(colorCanvas);
    App.photoTexture.minFilter = THREE.LinearMipmapLinearFilter;
    App.photoTexture.magFilter = THREE.LinearFilter;
    if (App.renderer && App.renderer.capabilities) {
        App.photoTexture.anisotropy = Math.min(8, App.renderer.capabilities.getMaxAnisotropy());
    }
    App.photoTexture.needsUpdate = true;

    const opts3d = {
        mode: mode3d,
        resolution: parseInt($('sResolution').value) || 256,
        depthMM: parseFloat($('sDepth').value) || 5,
        baseMM: parseFloat($('sBase').value) || 2,
        scaleMM: parseFloat($('sScale').value) || 100,
        smoothPasses: parseInt($('sSmoothing').value) || 3,
        smoothMethod: $('sSmoothMethod') ? $('sSmoothMethod').value : 'bilateral',
        superSample,
        gamma: parseFloat($('sGamma').value) || 1.0,
        edgeBoost: false,
        bakeColors: $('tBakeColors') ? $('tBakeColors').checked : true,
        aoStrength: $('sAO') ? parseFloat($('sAO').value) : 0.15,
        subdivPass: $('tSubdiv') ? $('tSubdiv').checked : false,
        solidBase: $('tSolidBase').checked,
        mirrorY: $('tMirrorY').checked,
        isolateSubject: $('tIsolateBg') ? $('tIsolateBg').checked : false,
        bgTolerance: $('sBgTolerance') ? parseFloat($('sBgTolerance').value) : 40,
        domeDepth: $('sDomeDepth') ? parseFloat($('sDomeDepth').value) : 55,
        invertDepth: $('tInvertDepth') ? $('tInvertDepth').checked : false,
        color: $('cBaseColor').value,
        metalness: 0.04,
        roughness: 0.58,
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

        // Keep model STATIC by default when generated so user can inspect it cleanly!
        App.anim4D.playing = false;
        update4DStatusUI();

        showProgress(false);
        updateStats(result);
        enableExport(true);

        if (window.innerWidth <= 900 && $('btnMobViewport')) {
            $('btnMobViewport').click();
        }
        toast('⚡ Ultra 3D Model ready! (Click ▶ 4D to animate)', 'success');

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
        preserveDrawingBuffer: true
    });
    App.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Disable shadowMap so DirectionalLight never casts a 10x10mm square shadow box at (0,0,0)!
    App.renderer.shadowMap.enabled = false;
    App.renderer.setClearColor(0x060c1a, 1);
    App.renderer.setSize(400, 300);

    App.scene = new THREE.Scene();
    App.scene.background = new THREE.Color(0x060c1a);

    // Subtle studio floor grid positioned well below the upright model
    const grid = new THREE.GridHelper(320, 32, 0x1e293b, 0x0f172a);
    grid.position.y = -62;
    App.scene.add(grid);
    App.floorGrid = grid;

    // Camera
    App.camera = new THREE.PerspectiveCamera(42, 400 / 300, 0.1, 5000);
    App.camera.position.set(0, 0, 175);

    // Calibrated True-Color Studio Lighting (Never clips/blows out white shirts or skin tones!)
    const ambient = new THREE.AmbientLight(0xffffff, 0.64);
    App.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.44);
    keyLight.position.set(55, 80, 140);
    keyLight.castShadow = false;
    App.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xf8fafc, 0.16);
    fillLight.position.set(-70, -30, 100);
    fillLight.castShadow = false;
    App.scene.add(fillLight);

    const backRim = new THREE.DirectionalLight(0xe2e8f0, 0.25);
    backRim.position.set(0, 60, -140);
    backRim.castShadow = false;
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
            // Smooth upright turntable rotation around vertical Y axis
            App.mesh3D.rotation.set(0, t * 1.15, 0);
            App.mesh3D.position.set(0, 0, 0);
            App.mesh3D.scale.set(1, 1, 1);
            break;

        case 'pulse': {
            const s = 1.0 + 0.14 * Math.sin(t * 2.8);
            App.mesh3D.rotation.set(0, Math.sin(t * 1.4) * 0.18, 0);
            App.mesh3D.scale.set(s, s, s);
            break;
        }

        case 'float': {
            const dy = 5.5 * Math.sin(t * 2.2);
            const ry = 0.22 * Math.sin(t * 1.3);
            const rz = 0.03 * Math.cos(t * 1.8);
            App.mesh3D.position.set(0, dy, 0);
            App.mesh3D.rotation.set(0, ry, rz);
            break;
        }

        case 'morph': {
            // Dynamic real-time morphing between 2D flat photo & 3D relief + gentle 3D sway
            const morph = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(t * 2.4));
            if (App.baseZCoords && App.reliefMesh && App.reliefMesh.geometry) {
                const pos = App.reliefMesh.geometry.attributes.position;
                for (let i = 0; i < App.baseZCoords.length; i++) {
                    pos.setZ(i, App.baseZCoords[i] * morph);
                }
                pos.needsUpdate = true;
            }
            App.mesh3D.rotation.set(0, Math.sin(t * 1.1) * 0.35, 0);
            break;
        }

        case 'wave': {
            if (App.baseZCoords && App.reliefMesh && App.reliefMesh.geometry) {
                const pos = App.reliefMesh.geometry.attributes.position;
                const gw = App.gridW, gh = App.gridH;
                for (let gy = 0; gy < gh; gy++) {
                    for (let gx = 0; gx < gw; gx++) {
                        const idx = gy * gw + gx;
                        const dist = Math.sqrt((gx - gw / 2) ** 2 + (gy - gh / 2) ** 2);
                        const waveVal = 1.5 * Math.sin(t * 4.8 - dist * 0.22);
                        pos.setZ(idx, App.baseZCoords[idx] + waveVal);
                    }
                }
                pos.needsUpdate = true;
            }
            App.mesh3D.rotation.set(0, Math.sin(t * 0.9) * 0.22, 0);
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
        spherical.phi = Math.max(0.15, Math.min(Math.PI - 0.15, spherical.phi - dy));
        prevX = e.clientX; prevY = e.clientY;
        updateCamera();
    });

    canvas.addEventListener('wheel', e => {
        spherical.radius = Math.max(30, Math.min(600, spherical.radius + e.deltaY * 0.35));
        updateCamera();
        e.preventDefault();
    }, { passive: false });

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
            spherical.phi = Math.max(0.15, Math.min(Math.PI - 0.15, spherical.phi - dy));
            prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
            updateCamera();
        }
        if (e.touches.length === 2) {
            const dist = Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY);
            spherical.radius = Math.max(30, Math.min(600, spherical.radius - (dist - lastTouchDist) * 0.35));
            lastTouchDist = dist;
            updateCamera();
        }
        e.preventDefault();
    }, { passive: false });
}

function render3DPreview(result, opts) {
    if (App.mesh3D) {
        App.scene.remove(App.mesh3D);
        App.mesh3D.traverse(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
        });
        App.mesh3D = null;
        App.reliefMesh = null;
    }

    const { gridW, gridH, hmap, dims } = result;
    const usePhotoTexture = Boolean(opts.bakeColors && App.photoTexture && opts.mode !== 'lithophane');

    // 1. Build upright front-facing sculpted PlaneGeometry in XY plane
    const geo = new THREE.PlaneGeometry(dims.x, dims.y, gridW - 1, gridH - 1);
    const pos = geo.attributes.position;
    const baseZ = new Float32Array(gridW * gridH);

    // PlaneGeometry orders vertices row-by-row from top (gy=0, y=+dims.y/2) to bottom (gy=gridH-1, y=-dims.y/2),
    // which matches image rows (gy=0 at top of photo, gy=gridH-1 at bottom of photo)!
    for (let gy = 0; gy < gridH; gy++) {
        for (let gx = 0; gx < gridW; gx++) {
            const idx = gy * gridW + gx;
            const h = hmap[idx];
            const zVal = opts.baseMM * 0.5 + h * opts.depthMM;
            pos.setZ(idx, zVal);
            baseZ[idx] = zVal;
        }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    App.baseZCoords = baseZ;
    App.gridW = gridW;
    App.gridH = gridH;

    const colorHex = parseInt((opts.color || '#4f8eff').replace('#', ''), 16);
    const mat = new THREE.MeshStandardMaterial({
        color: usePhotoTexture ? 0xffffff : colorHex,
        map: usePhotoTexture ? App.photoTexture : null,
        metalness: usePhotoTexture ? 0.04 : Math.min(opts.metalness || 0.05, 0.8),
        roughness: usePhotoTexture ? 0.58 : Math.max(opts.roughness || 0.5, 0.2),
        wireframe: App.wireframeMode,
        side: THREE.DoubleSide,
    });

    const reliefMesh = new THREE.Mesh(geo, mat);
    reliefMesh.castShadow = false;
    reliefMesh.receiveShadow = false;

    const group = new THREE.Group();
    group.add(reliefMesh);

    // 2. Add solid 3D backing plaque/pedestal so rotating 360° shows a solid 3D block
    if (opts.solidBase && opts.baseMM > 0) {
        const baseThickness = Math.max(1.5, opts.baseMM);
        const backGeo = new THREE.BoxGeometry(dims.x, dims.y, baseThickness);
        const backMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            metalness: 0.25,
            roughness: 0.65,
        });
        const backMesh = new THREE.Mesh(backGeo, backMat);
        backMesh.position.set(0, 0, -baseThickness * 0.5 + 0.2);
        backMesh.castShadow = false;
        backMesh.receiveShadow = false;
        group.add(backMesh);
    }

    // Upright at (0, 0, 0) facing the camera
    group.position.set(0, 0, 0);
    group.rotation.set(0, 0, 0);

    App.mesh3D = group;
    App.reliefMesh = reliefMesh;
    App.scene.add(group);

    // Position floor grid neatly under the bottom edge of the portrait
    if (App.floorGrid) {
        App.floorGrid.position.y = -(dims.y / 2) - 8;
    }

    // Frame camera straight-on with a subtle 3D angle so depth is immediately visible without distortion
    const diag = Math.sqrt(dims.x * dims.x + dims.y * dims.y);
    if (App.orbitSpherical && App.updateCamera) {
        App.orbitSpherical.theta = 0.0;
        App.orbitSpherical.phi = Math.PI / 2;
        App.orbitSpherical.radius = diag * 1.15;
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
    const glbKB = Math.ceil(stlKB * 0.85 + (App.pngBytes ? App.pngBytes.byteLength / 1024 : 0));
    $('statGLBSize').textContent = glbKB > 1024 ? (glbKB / 1024).toFixed(1) + ' MB' : '~' + Math.round(glbKB) + ' KB';

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
    const bakeColors = $('tBakeColors') ? $('tBakeColors').checked : true;

    const opts4d = {
        animType: animEl ? animEl.dataset.anim : (App.anim4D.type || 'rotate'),
        animSpeed: parseFloat($('sAnimSpeed').value) || 1.0,
        animDuration: parseFloat($('sAnimDur').value) || 3.0,
        metalness: parseFloat($('sMetalness').value) || 0.04,
        roughness: parseFloat($('sRoughness').value) || 0.58,
        color: $('cBaseColor').value || '#4f8eff',
        emissive: $('tEmissive') ? $('tEmissive').checked : false,
        pngBytes: bakeColors ? App.pngBytes : null,
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
            toast(`✅ 4D ${ext.toUpperCase()} with HD texture & animation downloaded! (${formatBytes(glbBuf.byteLength)})`, 'success');
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

        if (App.anim4D.type === 'none') {
            App.anim4D.type = 'rotate';
        }
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
    App.pngBytes = null;
    App.lastResult = null;
    App.anim4D.playing = false;
    update4DStatusUI();

    if (App.photoTexture) {
        App.photoTexture.dispose();
        App.photoTexture = null;
    }

    if (App.mesh3D) {
        App.scene.remove(App.mesh3D);
        App.mesh3D.traverse(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
        });
        App.mesh3D = null;
        App.reliefMesh = null;
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
