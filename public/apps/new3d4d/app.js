/**
 * APP.JS — Main Application Logic for 3D·4D Studio
 * Handles: image loading, preprocessing, 3D/4D conversion, Three.js preview, exports
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
    controls: null,       // Orbit controls
    mesh3D: null,         // THREE.Mesh in viewport
    animId: null,
    lang: 'en',
    viewMode: '3d',
    wireframeMode: false,
    zoomLevel: 1,
    thumbHistory: [],
};

// ─── DOM Refs ─────────────────────────────────────────────────────────────────

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
    // 3D mode chips
    $$('[data-mode3d]').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('[data-mode3d]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    // 4D anim chips
    $$('[data-anim]').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('[data-anim]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
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
            $('vSuperSample').textContent = btn.dataset.ssuper + '×';
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
}

function applyQualityPreset(preset) {
    const presets = {
        draft: { resolution: 64, smoothing: 0, depth: 8, base: 1, ssuper: 1, method: 'box', gamma: 1.0, edgeBoost: false, bakeColors: false, subdivPass: false },
        standard: { resolution: 128, smoothing: 2, depth: 10, base: 2, ssuper: 2, method: 'bilateral', gamma: 1.0, edgeBoost: false, bakeColors: false, subdivPass: false },
        ultra: { resolution: 384, smoothing: 4, depth: 12, base: 3, ssuper: 4, method: 'both', gamma: 1.1, edgeBoost: true, bakeColors: true, subdivPass: true },
    };
    const p = presets[preset];
    if (!p) return;
    $('sResolution').value = p.resolution; $('vResolution').textContent = p.resolution;
    $('sSmoothing').value = p.smoothing; $('vSmoothing').textContent = p.smoothing;
    $('sDepth').value = p.depth; $('vDepth').textContent = p.depth;
    $('sBase').value = p.base; $('vBase').textContent = p.base;
    $('sGamma').value = p.gamma; $('vGamma').textContent = p.gamma.toFixed(2);
    $('tEdgeBoost').checked = p.edgeBoost;
    if ($('tBakeColors')) { $('tBakeColors').checked = p.bakeColors; if ($('aoRow')) $('aoRow').style.display = p.bakeColors ? '' : 'none'; }
    if ($('tSubdiv')) $('tSubdiv').checked = p.subdivPass;
    $('sSmoothMethod').value = p.method;
    $$('[data-ssuper]').forEach(b => b.classList.toggle('active', parseInt(b.dataset.ssuper) === p.ssuper));
    $('vSuperSample').textContent = p.ssuper + '×';
}

// ─── Upload ───────────────────────────────────────────────────────────────────

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
    const maxW = canvas.parentElement.clientWidth - 32;
    const maxH = canvas.parentElement.clientHeight - 32;
    const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
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
        div.title = item.name;
        const img = document.createElement('img');
        img.src = item.src;
        div.appendChild(img);
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

// ─── Sliders ──────────────────────────────────────────────────────────────────

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
        });
    });

    $('cBaseColor').addEventListener('input', e => {
        $('vBaseColor').textContent = e.target.value;
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

    $('btnZoomIn').addEventListener('click', () => { App.zoomLevel = Math.min(App.zoomLevel * 1.2, 8); updateZoomUI(); });
    $('btnZoomOut').addEventListener('click', () => { App.zoomLevel = Math.max(App.zoomLevel / 1.2, 0.1); updateZoomUI(); });

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
    if (App.camera) {
        App.camera.position.set(50, 50, 150);
        App.camera.lookAt(0, 0, 0);
    }
}

function updateZoomUI() {
    $('zoomVal').textContent = Math.round(App.zoomLevel * 100) + '%';
    if (App.camera) {
        App.camera.zoom = App.zoomLevel;
        App.camera.updateProjectionMatrix();
    }
}

// ─── Image Processing ────────────────────────────────────────────────────────

function getProcessedImageData() {
    if (!App.image) return null;
    const proc = $('canvasProc');
    proc.width = App.image.naturalWidth;
    proc.height = App.image.naturalHeight;
    const ctx = proc.getContext('2d');

    // Draw original
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

    // Apply blur (box blur approximation)
    if (blurVal > 0) {
        data = boxBlur(data, proc.width, proc.height, blurVal);
    }

    // Per-pixel pass
    for (let i = 0; i < data.length; i += 4) {
        let r = data[i], g = data[i + 1], b = data[i + 2];

        // Saturation
        if (saturation !== 0) {
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            const s = (saturation + 100) / 100;
            r = lum + (r - lum) * s;
            g = lum + (g - lum) * s;
            b = lum + (b - lum) * s;
        }

        // Grayscale
        if (grayToggle) {
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            r = g = b = lum;
        }

        // Brightness
        if (brightness !== 0) { r += brightness; g += brightness; b += brightness; }

        // Contrast
        if (contrast !== 0) {
            const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
            r = factor * (r - 128) + 128;
            g = factor * (g - 128) + 128;
            b = factor * (b - 128) + 128;
        }

        // Invert
        if (invertToggle) { r = 255 - r; g = 255 - g; b = 255 - b; }

        data[i] = clamp(r);
        data[i + 1] = clamp(g);
        data[i + 2] = clamp(b);
    }

    imgData.data.set(data);

    // Edge enhance
    if (edgeToggle) {
        imgData = edgeEnhance(imgData, proc.width, proc.height);
    }

    ctx.putImageData(imgData, 0, 0);
    return ctx.getImageData(0, 0, proc.width, proc.height);
}

function doPreview2D() {
    if (!App.image) return;
    const processedData = getProcessedImageData();
    const canvas = $('canvas2D');
    canvas.width = processedData.width;
    canvas.height = processedData.height;
    canvas.getContext('2d').putImageData(processedData, 0, 0);
    canvas.style.display = 'block';
    $('pvPlaceholder').style.display = 'none';
    toast('👁️ Processed preview updated', 'success');
}

function boxBlur(data, w, h, radius) {
    const out = new Uint8ClampedArray(data.length);
    const r = Math.max(1, Math.floor(radius));
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let sr = 0, sg = 0, sb = 0, cnt = 0;
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    const nx = clamp(x + dx, 0, w - 1), ny = clamp(y + dy, 0, h - 1);
                    const i = (ny * w + nx) * 4;
                    sr += data[i]; sg += data[i + 1]; sb += data[i + 2]; cnt++;
                }
            }
            const oi = (y * w + x) * 4;
            out[oi] = sr / cnt; out[oi + 1] = sg / cnt; out[oi + 2] = sb / cnt; out[oi + 3] = data[oi + 3];
        }
    }
    return out;
}

function edgeEnhance(imgData, w, h) {
    const kernel = [-1, -1, -1, -1, 9, -1, -1, -1, -1];
    const src = imgData.data;
    const dst = new ImageData(w, h);
    const d = dst.data;
    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            let sr = 0, sg = 0, sb = 0, ki = 0;
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const idx = ((y + ky) * w + (x + kx)) * 4;
                    const k = kernel[ki++];
                    sr += src[idx] * k; sg += src[idx + 1] * k; sb += src[idx + 2] * k;
                }
            }
            const oi = (y * w + x) * 4;
            d[oi] = clamp(sr); d[oi + 1] = clamp(sg); d[oi + 2] = clamp(sb); d[oi + 3] = src[oi + 3];
        }
    }
    return dst;
}

// ─── Generate ─────────────────────────────────────────────────────────────────

async function doGenerate() {
    if (!App.image) { toast('⚠️ Please load an image first', 'error'); return; }

    // Show 3D panel + progress overlay
    $('pv3D').style.display = 'flex';
    // Force resize NOW that panel is visible (was 0x0 before)
    await new Promise(r => setTimeout(r, 30));
    resizeThreeJS();
    showProgress(true, 'Processing image…', 0);

    // Get active 3D mode
    const modeEl = document.querySelector('[data-mode3d].active');
    const mode3d = modeEl ? modeEl.dataset.mode3d : 'heightmap';

    // Read active super-sample chip
    const ssuperEl = document.querySelector('[data-ssuper].active');
    const superSample = ssuperEl ? parseInt(ssuperEl.dataset.ssuper) : 2;

    const opts3d = {
        mode: mode3d,
        resolution: parseInt($('sResolution').value),
        depthMM: parseFloat($('sDepth').value),
        baseMM: parseFloat($('sBase').value),
        scaleMM: parseFloat($('sScale').value),
        smoothPasses: parseInt($('sSmoothing').value),
        smoothMethod: $('sSmoothMethod') ? $('sSmoothMethod').value : 'bilateral',
        superSample,
        gamma: parseFloat($('sGamma').value),
        edgeBoost: $('tEdgeBoost') ? $('tEdgeBoost').checked : false,
        bakeColors: $('tBakeColors') ? $('tBakeColors').checked : false,
        aoStrength: $('sAO') ? parseFloat($('sAO').value) : 0.5,
        subdivPass: $('tSubdiv') ? $('tSubdiv').checked : false,
        solidBase: $('tSolidBase').checked,
        mirrorY: $('tMirrorY').checked,
        color: $('cBaseColor').value,
        metalness: parseFloat($('sMetalness').value),
        roughness: parseFloat($('sRoughness').value),
    };

    // Process in setTimeout to let UI update
    await new Promise(r => setTimeout(r, 50));

    try {
        // Image processing
        showProgress(true, 'Processing image…', 5);
        App.imageData = getProcessedImageData();

        await new Promise(r => setTimeout(r, 10));

        // 3D generation (chunked via progress)
        showProgress(true, 'Building 3D mesh…', 15);
        await new Promise(r => setTimeout(r, 10));

        const result = Engine3D.generate(App.imageData, opts3d, (prog, msg) => {
            showProgress(true, msg, Math.round(prog * 75) + 15);
        });

        App.lastResult = result;

        // Three.js preview
        showProgress(true, 'Rendering 3D preview…', 92);
        await new Promise(r => setTimeout(r, 30));

        render3DPreview(result, opts3d);
        resizeThreeJS(); // ensure renderer size is correct after render

        showProgress(false);

        // Update stats
        updateStats(result);
        enableExport(true);
        toast('⚡ 3D Model generated!', 'success');

    } catch (err) {
        showProgress(false);
        toast('❌ Generation failed: ' + err.message, 'error');
        console.error(err);
    }
}

// ─── Three.js Preview ────────────────────────────────────────────────────────

function resizeThreeJS() {
    if (!App.renderer) return;
    const canvas3D = $('canvas3D');
    const wrap = canvas3D.parentElement;
    const w = Math.max(wrap.clientWidth, 100);
    const h = Math.max(wrap.clientHeight, 100);
    App.renderer.setSize(w, h);
    if (App.camera) {
        App.camera.aspect = w / h;
        App.camera.updateProjectionMatrix();
    }
}

function initThreeJS() {
    const canvas3D = $('canvas3D');
    const wrap = canvas3D.parentElement;

    App.renderer = new THREE.WebGLRenderer({ canvas: canvas3D, antialias: true, alpha: true });
    App.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    App.renderer.shadowMap.enabled = true;
    App.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    App.renderer.setClearColor(0x060c1a, 1);

    // Use 400x300 placeholder size — will be resized properly on first use
    App.renderer.setSize(400, 300);

    App.scene = new THREE.Scene();
    App.scene.background = new THREE.Color(0x060c1a);

    // Grid helper
    const grid = new THREE.GridHelper(300, 30, 0x1a2540, 0x1a2540);
    App.scene.add(grid);

    // Camera
    App.camera = new THREE.PerspectiveCamera(45, 400 / 300, 0.1, 5000); // Use placeholder aspect ratio
    App.camera.position.set(80, 60, 160);

    // Lights
    const ambient = new THREE.AmbientLight(0x404080, 0.6);
    App.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(100, 200, 100);
    sun.castShadow = true;
    App.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x4f8eff, 0.4);
    fill.position.set(-100, 50, -100);
    App.scene.add(fill);

    const rim = new THREE.PointLight(0xa855f7, 0.6, 600);
    rim.position.set(0, 200, -200);
    App.scene.add(rim);

    // Orbit controls (manual)
    setupOrbitControls(canvas3D);

    // Animate
    function animate() {
        App.animId = requestAnimationFrame(animate);
        App.renderer.render(App.scene, App.camera);
    }
    animate();

    // Resize on window change
    window.addEventListener('resize', resizeThreeJS);
}

function setupOrbitControls(canvas) {
    let isDragging = false;
    let prevX = 0, prevY = 0;
    let spherical = { theta: 0.8, phi: 0.6, radius: 160 };

    function updateCamera() {
        const x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
        const y = spherical.radius * Math.cos(spherical.phi);
        const z = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
        App.camera.position.set(x, y, z);
        App.camera.lookAt(0, 10, 0);
    }
    updateCamera();

    canvas.addEventListener('mousedown', e => { isDragging = true; prevX = e.clientX; prevY = e.clientY; });
    canvas.addEventListener('mouseup', () => { isDragging = false; });
    canvas.addEventListener('mouseleave', () => { isDragging = false; });
    canvas.addEventListener('mousemove', e => {
        if (!isDragging) return;
        const dx = (e.clientX - prevX) * 0.01;
        const dy = (e.clientY - prevY) * 0.01;
        spherical.theta -= dx;
        spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi - dy));
        prevX = e.clientX; prevY = e.clientY;
        updateCamera();
    });
    canvas.addEventListener('wheel', e => {
        spherical.radius = Math.max(30, Math.min(800, spherical.radius + e.deltaY * 0.5));
        updateCamera();
        e.preventDefault();
    }, { passive: false });

    // Touch support
    let lastTouchDist = 0;
    canvas.addEventListener('touchstart', e => {
        if (e.touches.length === 1) { isDragging = true; prevX = e.touches[0].clientX; prevY = e.touches[0].clientY; }
        if (e.touches.length === 2) { lastTouchDist = Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY); }
    });
    canvas.addEventListener('touchend', () => { isDragging = false; });
    canvas.addEventListener('touchmove', e => {
        if (e.touches.length === 1 && isDragging) {
            const dx = (e.touches[0].clientX - prevX) * 0.01;
            const dy = (e.touches[0].clientY - prevY) * 0.01;
            spherical.theta -= dx;
            spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi - dy));
            prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
            updateCamera();
        }
        if (e.touches.length === 2) {
            const dist = Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY);
            spherical.radius = Math.max(30, Math.min(800, spherical.radius - (dist - lastTouchDist) * 0.5));
            lastTouchDist = dist;
            updateCamera();
        }
        e.preventDefault();
    }, { passive: false });
}

function render3DPreview(result, opts) {
    // Remove old mesh
    if (App.mesh3D) {
        App.scene.remove(App.mesh3D);
        App.mesh3D.geometry.dispose();
        App.mesh3D.material.dispose();
        App.mesh3D = null;
    }

    const { gridW, gridH, hmap, dims, mesh } = result;
    const hasVertexColors = mesh && mesh.vertexColors;

    // Build Three.js geometry from heightmap
    const geo = new THREE.PlaneGeometry(dims.x, dims.y, gridW - 1, gridH - 1);
    const pos = geo.attributes.position;

    // Apply heightmap to Z
    for (let gy = 0; gy < gridH; gy++) {
        for (let gx = 0; gx < gridW; gx++) {
            const hmapIdx = (gridH - 1 - gy) * gridW + gx;
            const h = hmap[hmapIdx];
            const vertIdx = gy * gridW + gx;
            pos.setZ(vertIdx, opts.baseMM + h * opts.depthMM);
        }
    }
    pos.needsUpdate = true;

    // Attach vertex colors if baked
    if (hasVertexColors) {
        // PlaneGeometry vertices: gridW × gridH, same order
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

    // Material
    const colorHex = parseInt((opts.color || '#4f8eff').replace('#', ''), 16);
    const mat = new THREE.MeshStandardMaterial({
        color: hasVertexColors ? 0xffffff : colorHex,
        vertexColors: hasVertexColors,
        metalness: Math.min(opts.metalness, 0.7),
        roughness: Math.max(opts.roughness, 0.3),
        wireframe: App.wireframeMode,
        side: THREE.DoubleSide,
    });

    App.mesh3D = new THREE.Mesh(geo, mat);
    App.mesh3D.rotation.x = -Math.PI / 2;
    App.mesh3D.position.set(-dims.x / 2, 0, -dims.y / 2);
    App.mesh3D.castShadow = true;
    App.mesh3D.receiveShadow = true;
    App.scene.add(App.mesh3D);

    // Point camera
    const diag = Math.sqrt(dims.x * dims.x + dims.y * dims.y);
    const camDist = diag * 1.5;
    App.camera.position.set(camDist * 0.6, camDist * 0.7, camDist * 0.8);
    App.camera.lookAt(0, dims.z / 2, 0);
    App.camera.updateProjectionMatrix();
}

// ─── Progress ─────────────────────────────────────────────────────────────────

function showProgress(show, text, pct) {
    const ov = $('procOverlay');
    ov.style.display = show ? 'flex' : 'none';
    if (show) {
        $('procText').textContent = text || 'Processing…';
        $('procBar').style.width = (pct || 0) + '%';
        $('procPct').textContent = (pct || 0) + '%';
    }
}

// ─── Export ───────────────────────────────────────────────────────────────────

function exportModel(type) {
    if (!App.lastResult) { toast('⚠️ Generate a model first', 'error'); return; }

    const result = App.lastResult;
    const animEl = document.querySelector('[data-anim].active');

    // 4D animation + material options (no flatData here — built separately below)
    const opts4d = {
        animType: animEl ? animEl.dataset.anim : 'rotate',
        animSpeed: parseFloat($('sAnimSpeed').value),
        animDuration: parseFloat($('sAnimDur').value),
        metalness: parseFloat($('sMetalness').value),
        roughness: parseFloat($('sRoughness').value),
        color: $('cBaseColor').value,
        emissive: $('tEmissive').checked,
    };

    try {
        if (type === 'stl') {
            downloadBinary(result.stlBuffer, 'model_3d4d.stl');
            toast('✅ STL downloaded! (' + formatBytes(result.stlBuffer.byteLength) + ')', 'success');

        } else if (type === 'obj') {
            downloadText(result.objText, 'model_3d4d.obj');
            downloadText(result.mtlText, 'model_3d4d.mtl');
            toast('✅ OBJ + MTL downloaded!', 'success');

        } else if (type === 'glb' || type === 'gltf') {
            // Rebuild float array from the stored STL binary buffer
            const flatData = buildFlatArray(result);
            const meshData = {
                flatData,
                triangleCount: result.triangleCount,
                dims: result.dims,
            };
            const glbBuf = Engine4D.buildGLB(meshData, opts4d);
            const ext = type === 'gltf' ? 'gltf' : 'glb';
            downloadBinary(glbBuf, `model_4d.${ext}`);
            toast(`✅ ${ext.toUpperCase()} downloaded! (` + formatBytes(glbBuf.byteLength) + ')', 'success');
        }
    } catch (err) {
        toast('❌ Export failed: ' + err.message, 'error');
        console.error('Export error:', err);
    }
}

function buildFlatArray(result) {
    // Rebuild flat float array from STL buffer
    const buf = result.stlBuffer;
    const view = new DataView(buf);
    const triCount = result.triangleCount;
    const floats = new Float32Array(triCount * 12);
    let offset = 84;
    for (let i = 0; i < triCount; i++) {
        const base = i * 12;
        for (let j = 0; j < 12; j++) {
            floats[base + j] = view.getFloat32(offset, true);
            offset += 4;
        }
        offset += 2; // attribute
    }
    return floats;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function updateStats(result) {
    $('statVerts').textContent = result.vertexCount.toLocaleString();
    $('statTris').textContent = result.triangleCount.toLocaleString();
    const d = result.dims;
    $('statDims').textContent = `${d.x.toFixed(1)} × ${d.y.toFixed(1)} × ${d.z.toFixed(1)} mm`;
    const stlKB = Math.ceil(result.stlBuffer.byteLength / 1024);
    $('statSTLSize').textContent = stlKB > 1024 ? (stlKB / 1024).toFixed(1) + ' MB' : stlKB + ' KB';
    // GLB estimate
    const glbKB = Math.ceil(stlKB * 0.85);
    $('statGLBSize').textContent = glbKB > 1024 ? (glbKB / 1024).toFixed(1) + ' MB' : '~' + glbKB + ' KB';

    $('exportStats').innerHTML = `
    <strong>${result.triangleCount.toLocaleString()}</strong> triangles ·
    <strong>${result.vertexCount.toLocaleString()}</strong> vertices ·
    STL: <strong>${$('statSTLSize').textContent}</strong>
  `;
}

// ─── Enable/Disable ───────────────────────────────────────────────────────────

function enableControls(enabled) {
    $('btnGenerate').disabled = !enabled;
    $('btnClear').disabled = !enabled;
    $('btnPreview2D').disabled = !enabled;
}

function enableExport(enabled) {
    ['btnExportSTL', 'btnExportOBJ', 'btnExportGLB', 'btnExportGLTF'].forEach(id => {
        $(id).disabled = !enabled;
    });
}

function doClear() {
    App.image = null;
    App.imageData = null;
    App.lastResult = null;

    if (App.mesh3D) { App.scene.remove(App.mesh3D); App.mesh3D = null; }

    $('canvas2D').style.display = 'none';
    $('pvPlaceholder').style.display = 'flex';
    $('pv3D').style.display = 'none';
    $('fileInfo').style.display = 'none';
    $('fileInput').value = '';

    ['statVerts', 'statTris', 'statDims', 'statSTLSize', 'statGLBSize'].forEach(id => $(id).textContent = '—');

    enableControls(false);
    enableExport(false);
    toast('🗑️ Workspace cleared', '');
}

// ─── Utils ────────────────────────────────────────────────────────────────────

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
            // FileSaver.js — most reliable cross-browser download
            saveAs(blob, filename);
        } else {
            // Fallback
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
    el.textContent = msg;
    el.className = 'toast ' + (type || '');
    requestAnimationFrame(() => { el.classList.add('show'); });
    clearTimeout(App._toastTimeout);
    App._toastTimeout = setTimeout(() => { el.classList.remove('show'); }, 3500);
}

