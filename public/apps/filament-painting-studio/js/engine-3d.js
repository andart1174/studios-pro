// ==========================================
// 🚀 THREE.JS 3D ENGINE INITIALIZATION
// ==========================================
function init3D() {
    const container = document.getElementById('viewport-container');
    const canvas = document.getElementById('viewport-canvas');

    if (typeof THREE === 'undefined' || !container || !canvas) {
        if (container && !document.getElementById('offline-3d-notice')) {
            const notice = document.createElement('div');
            notice.id = 'offline-3d-notice';
            notice.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;color:#cbd5e1;font-size:0.9rem;background:rgba(6,9,14,0.92);z-index:5;';
            notice.innerText = currentLang === 'fr'
                ? 'Moteur WebGL 3D hors ligne — l’éditeur 2D et les exports STL/3MF restent 100 % fonctionnels.'
                : '3D WebGL engine unavailable offline — 2D editor & STL/3MF exports remain 100% functional.';
            container.appendChild(notice);
        }
        return;
    }

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06090e);

    camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.5, 2000);
    camera.position.set(0, -180, 220);

    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance",
        logarithmicDepthBuffer: true
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.localClippingEnabled = true;

    clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 10000);

    canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        console.warn('WebGL context lost, awaiting restore...');
    }, false);

    canvas.addEventListener('webglcontextrestored', () => {
        init3D();
        if (sourceImage) processSourceImage();
    }, false);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxDistance = 800;
    controls.minDistance = 30;

    const ambient = new THREE.AmbientLight(0xffffff, 0.90);
    scene.add(ambient);
    studioLights.push(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
    keyLight.position.set(100, 150, 200);
    scene.add(keyLight);
    studioLights.push(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.35);
    fillLight.position.set(-150, -100, 100);
    scene.add(fillLight);
    studioLights.push(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.25);
    rimLight.position.set(0, 160, 60);
    scene.add(rimLight);
    studioLights.push(rimLight);

    const rearLight = new THREE.DirectionalLight(0xffffff, 0.60);
    rearLight.position.set(0, -120, -220);
    scene.add(rearLight);
    studioLights.push(rearLight);

    backlightLight = new THREE.PointLight(0xffecd2, 0, 300);
    backlightLight.position.set(0, 0, -35);
    scene.add(backlightLight);

    // 3D Viewport Click-to-Recolor & Eyedropper Raycasting
    let vpDownX = 0, vpDownY = 0;
    canvas.addEventListener('pointerdown', (e) => {
        vpDownX = e.clientX;
        vpDownY = e.clientY;
    });
    canvas.addEventListener('pointerup', (e) => {
        if (Math.hypot(e.clientX - vpDownX, e.clientY - vpDownY) > 5) return;
        if (!reliefMesh || !processedCanvas.width || !colorDataBuffer) return;

        const rect = canvas.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(reliefMesh);
        if (intersects.length > 0 && intersects[0].uv) {
            const uv = intersects[0].uv;
            const px = Math.max(0, Math.min(processedCanvas.width - 1, Math.round(uv.x * (processedCanvas.width - 1))));
            const py = Math.max(0, Math.min(processedCanvas.height - 1, Math.round((1.0 - uv.y) * (processedCanvas.height - 1))));
            const idx = (py * processedCanvas.width + px) * 4;
            const hex = rgbToHex(colorDataBuffer[idx], colorDataBuffer[idx + 1], colorDataBuffer[idx + 2]).toUpperCase();
            eyedropperColor = hex;
            const prevBox = document.getElementById('eyedropper-preview-color');
            const prevLbl = document.getElementById('eyedropper-hex-label');
            if (prevBox) prevBox.style.background = hex;
            if (prevLbl) prevLbl.innerText = hex;

            if (is3DRecolorMode || e.altKey) {
                pushHistoryState();
                const globalChk = document.getElementById('chk-recolor-global');
                const isGlobal = globalChk ? globalChk.checked : false;
                smartRecolorZone(px, py, activeFilamentSlot, editorFillTolerance, isGlobal);
                const pCtx = processedCanvas.getContext('2d');
                const outImg = pCtx.createImageData(processedCanvas.width, processedCanvas.height);
                outImg.data.set(colorDataBuffer);
                pCtx.putImageData(outImg, 0, 0);
                render2DEditorPreview();
                generate3DReliefMesh();
                showToast(translations[currentLang].toastZoneRecolored);
            }
        }
    });

    window.addEventListener('resize', onWindowResize, false);
    animate();
}

window.addEventListener("resize", onWindowResize);
function onWindowResize() {
    const container = document.getElementById('viewport-container');
    if (!container || !renderer || !camera) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    if (renderer && scene && camera) renderer.render(scene, camera);
}

function resetCamera(mode) {
    if (!controls || !camera) return;
    controls.reset();
    if (mode === 'front') {
        camera.position.set(0, 0, 260);
        camera.up.set(0, 1, 0);
    } else if (config.topography && config.topography !== 'flat') {
        camera.position.set(35, 50, 250);
        camera.up.set(0, 1, 0);
    } else {
        camera.position.set(0, -180, 220);
        camera.up.set(0, 0, 1);
    }
    controls.target.set(0, 0, 1.2);
    camera.lookAt(0, 0, 1.2);
}

function toggleWireframe() {
    isWireframe = !isWireframe;
    if (reliefMesh && reliefMesh.material) {
        reliefMesh.material.wireframe = isWireframe;
    }
}

const KELVIN_HEX_MAP = { 2700: 0xffb36b, 4000: 0xfff0dd, 6500: 0xe6f2ff };

function applyLightboxKelvinToScene() {
    const k = config.lightboxKelvin || 4000;
    const hex = KELVIN_HEX_MAP[k] || KELVIN_HEX_MAP[4000];
    if (backlightLight && backlightLight.color && typeof backlightLight.color.setHex === 'function') {
        backlightLight.color.setHex(hex);
    }
    [2700, 4000, 6500].forEach(kv => {
        const b = document.getElementById(`btn-kelvin-${kv}`);
        if (b) b.classList.toggle('active', kv === k);
    });
}

function setLightboxKelvin(kelvin) {
    config.lightboxKelvin = KELVIN_HEX_MAP[kelvin] ? kelvin : 4000;
    applyLightboxKelvinToScene();
    if (!isLightbox) toggleLightboxMode();
}

function toggleLightboxMode() {
    isLightbox = !isLightbox;
    const btn = document.getElementById('btn-toggle-lightbox');
    if (btn) btn.classList.toggle('active', isLightbox);
    const kBar = document.getElementById('lightbox-kelvin-bar');
    if (kBar) kBar.style.display = isLightbox ? 'flex' : 'none';

    if (isLightbox) {
        scene.background = new THREE.Color(0x020306);
        studioLights.forEach(l => l.intensity = 0.12);
        if (config.topography === 'cylinder' || config.topography === 'half_cyl') {
            backlightLight.position.set(0, 0, 0);
        } else {
            backlightLight.position.set(0, 0, -35);
        }
        applyLightboxKelvinToScene();
        backlightLight.intensity = 3.2;
        if (reliefMesh && reliefMesh.material) {
            reliefMesh.material.roughness = 0.85;
            reliefMesh.material.metalness = 0.0;
        }
    } else {
        scene.background = new THREE.Color(0x06090e);
        if (studioLights[0]) studioLights[0].intensity = 0.90;
        if (studioLights[1]) studioLights[1].intensity = 0.85;
        if (studioLights[2]) studioLights[2].intensity = 0.35;
        if (studioLights[3]) studioLights[3].intensity = 0.25;
        if (studioLights[4]) studioLights[4].intensity = 0.60;
        backlightLight.intensity = 0;
        if (reliefMesh && reliefMesh.material) {
            reliefMesh.material.roughness = 0.35;
            reliefMesh.material.metalness = 0.08;
        }
    }
}

function toggleColorMapMode() {
    isColorMapMode = !isColorMapMode;
    const btn = document.getElementById('btn-toggle-colormap');
    if (btn) btn.classList.toggle('active', isColorMapMode);
    generate3DReliefMesh();
}

let isNozzleInspectMode = false;
let isSplitCompareMode = false;
let splitComparePct = 50;

function toggle3DRecolorMode() {
    is3DRecolorMode = !is3DRecolorMode;
    const btn = document.getElementById('btn-toggle-3d-recolor');
    if (btn) btn.classList.toggle('active', is3DRecolorMode);
    const canvas = document.getElementById('viewport-canvas');
    if (canvas) canvas.style.cursor = is3DRecolorMode ? 'crosshair' : 'default';
    if (is3DRecolorMode) {
        showToast(translations[currentLang].toast3DRecolorOn);
    }
}

function toggleNozzleInspector() {
    isNozzleInspectMode = !isNozzleInspectMode;
    ['btn-toggle-nozzle-inspect', 'btn-top-nozzle-inspect', 'btn-sec2-nozzle-inspect'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('active', isNozzleInspectMode);
    });
    generate3DReliefMesh();
    if (isNozzleInspectMode) {
        showToast(translations[currentLang].toastNozzleInspectOn);
    }
}

function toggleSplitCompareMode() {
    isSplitCompareMode = !isSplitCompareMode;
    ['btn-toggle-split-compare', 'btn-top-split-compare', 'btn-sec2-split-compare'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('active', isSplitCompareMode);
    });
    const overlay = document.getElementById('split-compare-overlay');
    if (overlay) {
        overlay.classList.toggle('active', isSplitCompareMode);
        overlay.style.display = isSplitCompareMode ? 'block' : 'none';
        if (isSplitCompareMode) {
            renderSplitCompareSource();
            updateSplitCompareUI(splitComparePct);
        }
    }
}

let isOverhangWarning = false;
let isZebraExposure = false;

function toggleOverhangWarning() {
    isOverhangWarning = !isOverhangWarning;
    const btn = document.getElementById('btn-sec2-overhang-inspect');
    if (btn) btn.classList.toggle('active', isOverhangWarning);
    generate3DReliefMesh();
    if (isOverhangWarning) {
        showToast(translations[currentLang].toastOverhangInspectOn || 'Overhang Inspection Active (>45°)');
    }
}

function toggleZebraExposure() {
    isZebraExposure = !isZebraExposure;
    const btn = document.getElementById('btn-sec2-zebra-inspect');
    if (btn) btn.classList.toggle('active', isZebraExposure);
    generate3DReliefMesh();
    if (isZebraExposure) {
        showToast(translations[currentLang].toastZebraInspectOn || 'Zebra Exposure Active (Peaks in Magenta, Base in Cyan)');
    }
}

function updateNozzleInspectionSize() {
    const sel = document.getElementById('select-nozzle-size');
    if (sel) config.nozzleSize = parseFloat(sel.value) || 0.4;
    if (isNozzleInspectMode) {
        generate3DReliefMesh();
    }
}

function updateLayerQuantization() {
    const sel = document.getElementById('select-layer-quantize');
    if (sel) config.layerQuantizeStep = parseFloat(sel.value) || 0;
    generate3DReliefMesh();
}

function updateDespeckleFilter() {
    const sel = document.getElementById('select-despeckle');
    if (sel) config.despeckleRadius = parseInt(sel.value) || 0;
    processSourceImage();
    if (centerViewMode === '2d') render2DEditorPreview();
}

function updateIroningSimulation() {
    const chk = document.getElementById('chk-ironing-sim');
    if (chk) config.ironingSimulation = chk.checked;
    generate3DReliefMesh();
}

function applyQualityPreset(type) {
    if (type === 'portrait') {
        config.brightness = 4;
        config.contrast = 8;
        config.gamma = 1.15;
        config.shadowLift = 12;
        config.highlightCeiling = 98;
        config.vibrance = 15;
        config.boundarySharpness = 70;
        config.colorSnap = 70;
        config.smoothing = 1;
        config.detailSharpness = 4;
        config.subjectPop = 35;
        config.preserveEyes = true;
        config.tdOpticalBlend = 75;
        config.opticalDithering = 25;
        config.despeckleRadius = 1;
        config.layerQuantizeStep = 0;
        config.filamentFinish = 'matte';
    } else if (type === 'wildlife') {
        config.brightness = 0;
        config.contrast = 18;
        config.gamma = 0.95;
        config.shadowLift = 5;
        config.highlightCeiling = 100;
        config.vibrance = 25;
        config.boundarySharpness = 90;
        config.colorSnap = 85;
        config.smoothing = 1;
        config.detailSharpness = 8;
        config.subjectPop = 40;
        config.boostFineLines = true;
        config.bilateralEdgeLock = true;
        config.tdOpticalBlend = 60;
        config.opticalDithering = 20;
        config.despeckleRadius = 0;
        config.layerQuantizeStep = 0;
        config.filamentFinish = 'standard';
    } else if (type === 'vector') {
        config.brightness = 0;
        config.contrast = 28;
        config.gamma = 1.0;
        config.shadowLift = 0;
        config.highlightCeiling = 100;
        config.vibrance = 30;
        config.boundarySharpness = 100;
        config.colorSnap = 95;
        config.smoothing = 0;
        config.detailSharpness = 6;
        config.subjectPop = 20;
        config.tdOpticalBlend = 30;
        config.opticalDithering = 0;
        config.despeckleRadius = 2;
        config.layerQuantizeStep = 0.08;
        config.filamentFinish = 'silk';
    } else if (type === 'landscape') {
        config.brightness = -2;
        config.contrast = 14;
        config.gamma = 1.05;
        config.shadowLift = 15;
        config.highlightCeiling = 95;
        config.vibrance = 35;
        config.boundarySharpness = 75;
        config.colorSnap = 75;
        config.smoothing = 1;
        config.detailSharpness = 5;
        config.subjectPop = 25;
        config.tdOpticalBlend = 70;
        config.opticalDithering = 30;
        config.despeckleRadius = 1;
        config.layerQuantizeStep = 0;
        config.filamentFinish = 'standard';
    }
    syncQualityControlsUI();
    processSourceImage();
    if (centerViewMode === '2d') render2DEditorPreview();
    showToast(translations[currentLang].toastQualityPresetApplied || 'Quality Preset Applied');
}

function syncQualityControlsUI() {
    const setSlider = (idVal, idTxt, val, fmt) => {
        const el = document.getElementById(idVal);
        if (el) el.value = val;
        const txt = document.getElementById(idTxt);
        if (txt) txt.innerText = fmt;
    };
    setSlider('slider-brightness', 'val-brightness', config.brightness, `${config.brightness > 0 ? '+' : ''}${config.brightness}%`);
    setSlider('slider-contrast', 'val-contrast', config.contrast, `${config.contrast > 0 ? '+' : ''}${config.contrast}%`);
    setSlider('slider-smoothing', 'val-smoothing', config.smoothing, `${config.smoothing}`);
    setSlider('slider-sharpness', 'val-sharpness', config.detailSharpness, `${config.detailSharpness}`);
    setSlider('slider-subject-pop', 'val-subject-pop', config.subjectPop, `+${config.subjectPop}%`);
    setSlider('slider-color-snap', 'val-color-snap', config.colorSnap, `${config.colorSnap}%`);
    setSlider('slider-sculpt-dome', 'val-sculpt-dome', config.sculpturalDome, `${config.sculpturalDome}%`);
    setSlider('slider-td-blend', 'val-td-blend', config.tdOpticalBlend, `${config.tdOpticalBlend}%`);
    setSlider('slider-dithering', 'val-dithering', config.opticalDithering, `${config.opticalDithering}%`);
    setSlider('slider-gamma', 'val-gamma', config.gamma, `${Number(config.gamma || 1.0).toFixed(2)}x`);
    setSlider('slider-shadow-lift', 'val-shadow-lift', config.shadowLift, `${config.shadowLift}%`);
    setSlider('slider-highlight-ceiling', 'val-highlight-ceiling', config.highlightCeiling, `${config.highlightCeiling}%`);
    setSlider('slider-vibrance', 'val-vibrance', config.vibrance, `${config.vibrance > 0 ? '+' : ''}${config.vibrance}%`);
    setSlider('slider-boundary-sharpness', 'val-boundary-sharpness', config.boundarySharpness, `${config.boundarySharpness}%`);

    const chkBi = document.getElementById('chk-bilateral');
    if (chkBi) chkBi.checked = !!config.bilateralEdgeLock;
    const chkBoost = document.getElementById('chk-boost-fine-lines');
    if (chkBoost) chkBoost.checked = !!config.boostFineLines;
    const chkIron = document.getElementById('chk-ironing-sim');
    if (chkIron) chkIron.checked = !!config.ironingSimulation;

    const selQuantize = document.getElementById('select-layer-quantize');
    if (selQuantize) selQuantize.value = String(config.layerQuantizeStep || 0);
    const selDespeckle = document.getElementById('select-despeckle');
    if (selDespeckle) selDespeckle.value = String(config.despeckleRadius || 0);
    const selNozzle = document.getElementById('select-nozzle-size');
    if (selNozzle) selNozzle.value = String(config.nozzleSize || 0.4);

    const selFinishMain = document.getElementById('select-filament-finish');
    if (selFinishMain) selFinishMain.value = config.filamentFinish || 'standard';
    const selFinishSec2 = document.getElementById('select-filament-finish-sec2');
    if (selFinishSec2) selFinishSec2.value = config.filamentFinish || 'standard';
}

function updateSplitCompareUI(pct) {
    splitComparePct = Math.max(4, Math.min(96, pct));
    const leftPane = document.getElementById('split-left-pane');
    const divLine = document.getElementById('split-divider-line');
    if (leftPane) {
        leftPane.style.width = '100%';
        leftPane.style.clipPath = `inset(0 ${100 - splitComparePct}% 0 0)`;
    }
    if (divLine) divLine.style.left = `${splitComparePct}%`;
}

function renderSplitCompareSource() {
    const vpContainer = document.getElementById('viewport-container');
    const overlay = document.getElementById('split-compare-overlay');
    const cvs = document.getElementById('split-original-canvas');
    if (!overlay || !cvs || !sourceImage) return;

    const rect = (vpContainer || overlay).getBoundingClientRect();
    const vw = Math.max(320, Math.round(rect.width || 800));
    const vh = Math.max(240, Math.round(rect.height || 600));
    cvs.width = vw;
    cvs.height = vh;
    cvs.style.width = `${vw}px`;
    cvs.style.height = `${vh}px`;

    const ctx = cvs.getContext('2d');
    ctx.fillStyle = '#090b10';
    ctx.fillRect(0, 0, vw, vh);

    // Match the plaque aspect ratio and center framing in the viewport
    const plateAspect = (config.width && config.height) ? (config.width / config.height) : 1.0;
    const maxBoxW = vw * 0.66;
    const maxBoxH = vh * 0.68;
    let drawBoxW = maxBoxW;
    let drawBoxH = drawBoxW / plateAspect;
    if (drawBoxH > maxBoxH) {
        drawBoxH = maxBoxH;
        drawBoxW = drawBoxH * plateAspect;
    }

    ctx.save();
    ctx.translate(vw / 2, vh / 2);

    // Subtle drop shadow & studio border around original photo
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 32;
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-drawBoxW / 2 - 1, -drawBoxH / 2 - 1, drawBoxW + 2, drawBoxH + 2);

    if (config.rotation) ctx.rotate((config.rotation * Math.PI) / 180);
    const sx = config.flipX ? -1 : 1;
    const sy = config.flipY ? -1 : 1;
    ctx.scale(sx, sy);

    const isRotated90 = (config.rotation === 90 || config.rotation === 270);
    const wImg = isRotated90 ? drawBoxH : drawBoxW;
    const hImg = isRotated90 ? drawBoxW : drawBoxH;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceImage, -wImg / 2, -hImg / 2, wImg, hImg);
    ctx.restore();
}

function startSplitCompareDrag(e) {
    if (!isSplitCompareMode) return;
    const overlay = document.getElementById('split-compare-overlay');
    if (!overlay) return;

    function onMove(ev) {
        const rect = overlay.getBoundingClientRect();
        const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
        const pct = ((clientX - rect.left) / Math.max(1, rect.width)) * 100;
        updateSplitCompareUI(pct);
    }

    function onUp() {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
    }

    onMove(e);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
}

window.addEventListener('resize', () => {
    if (isSplitCompareMode) renderSplitCompareSource();
});

function updateEngineResolution() {
    const sel = document.getElementById('select-engine-res');
    if (sel) config.engineResolution = parseInt(sel.value) || 360;
    const badge = document.getElementById('badge-engine-res');
    if (badge) {
        if (config.engineResolution >= 512) badge.innerText = 'Ultra-HD 512px';
        else if (config.engineResolution >= 360) badge.innerText = 'HD 360px';
        else badge.innerText = 'Std 220px';
    }
    processSourceImage();
    if (centerViewMode === '2d') render2DEditorPreview();
}

function updateFilamentFinish(source) {
    const selMain = document.getElementById('select-filament-finish');
    const selSec2 = document.getElementById('select-filament-finish-sec2');
    const chkMain = document.getElementById('chk-layer-ridges');
    const chkSec2 = document.getElementById('chk-layer-ridges-sec2');

    if (source === 'sec2') {
        if (selSec2) config.filamentFinish = selSec2.value || 'standard';
        if (chkSec2) config.layerRidges = chkSec2.checked;
        if (selMain) selMain.value = config.filamentFinish;
        if (chkMain) chkMain.checked = config.layerRidges;
    } else {
        if (selMain) config.filamentFinish = selMain.value || 'standard';
        if (chkMain) config.layerRidges = chkMain.checked;
        if (selSec2) selSec2.value = config.filamentFinish;
        if (chkSec2) chkSec2.checked = config.layerRidges;
    }
    generate3DReliefMesh();
    if (translations[currentLang]?.toastPBRUpdated) {
        showToast(translations[currentLang].toastPBRUpdated);
    }
}

function autoMasterQuality() {
    if (!sourceImage) return;

    // Sample raw image histogram to compute optimal dynamic range & contrast
    const sampleCvs = document.createElement('canvas');
    sampleCvs.width = 160;
    sampleCvs.height = 160;
    const sCtx = sampleCvs.getContext('2d');
    sCtx.drawImage(sourceImage, 0, 0, 160, 160);
    const raw = sCtx.getImageData(0, 0, 160, 160).data;

    const lums = new Float32Array(160 * 160);
    let edgeSum = 0;
    for (let i = 0; i < lums.length; i++) {
        const idx = i * 4;
        lums[i] = (0.2126 * raw[idx] + 0.7152 * raw[idx + 1] + 0.0722 * raw[idx + 2]) / 255.0;
        if (i % 160 > 0) {
            edgeSum += Math.abs(lums[i] - lums[i - 1]);
        }
    }
    const sortedLums = Float32Array.from(lums).sort();
    const p04 = sortedLums[Math.floor(sortedLums.length * 0.04)];
    const p50 = sortedLums[Math.floor(sortedLums.length * 0.50)];
    const p96 = sortedLums[Math.floor(sortedLums.length * 0.96)];
    const span = Math.max(0.15, p96 - p04);
    const avgEdge = edgeSum / lums.length;

    // Compute optimal Brightness & Contrast so 4th..96th percentile spans full 3D relief
    const idealBrightness = Math.max(-28, Math.min(28, Math.round((0.48 - p50) * 65)));
    const idealContrast = Math.max(8, Math.min(48, Math.round((0.86 / span - 1.0) * 55 + 16)));
    const idealSharpness = avgEdge < 0.035 ? 7 : (avgEdge > 0.08 ? 4 : 6);

    config.brightness = idealBrightness;
    config.contrast = idealContrast;
    config.smoothing = 1;
    config.detailSharpness = idealSharpness;
    config.subjectPop = 30;
    config.colorSnap = 78;
    config.sculpturalDome = 28;
    config.tdOpticalBlend = 72;
    config.opticalDithering = 24;
    config.bilateralEdgeLock = true;
    config.boostFineLines = true;
    config.shadowLift = (p04 < 0.06) ? Math.min(20, Math.round((0.06 - p04) * 120)) : 0;
    config.highlightCeiling = (p96 > 0.94) ? Math.max(90, Math.round(p96 * 100)) : 100;
    config.gamma = Math.max(0.8, Math.min(1.3, Number((0.5 / Math.max(0.15, p50)).toFixed(2))));
    config.vibrance = 15;
    config.boundarySharpness = 85;

    // Sync all UI controls to match Auto-Mastered values
    syncQualityControlsUI();

    // Optimize Filament Z-Layer startPct weighted by Transmission Distance (TD)
    if (filaments.length > 1) {
        filaments[0].startPct = 0.0;
        const weights = filaments.map(f => Math.max(0.8, Math.min(6.0, Math.sqrt(f.td || 3.0))));
        const totalW = weights.slice(1).reduce((a, b) => a + b, 0) || 1;
        let acc = 0.08;
        for (let k = 1; k < filaments.length; k++) {
            filaments[k].startPct = Number(Math.min(0.92, acc).toFixed(2));
            acc += (weights[k] / totalW) * 0.82;
        }
        renderFilamentStackUI();
        renderLayerEqualizerUI();
    }

    processSourceImage();
    if (centerViewMode === '2d') render2DEditorPreview();
    showToast(translations[currentLang].toastAutoMastered);
}

function toggleOpticalModel() {
    config.opticalModel = (config.opticalModel === 'beer_lambert') ? 'cubic' : 'beer_lambert';
    const txt = document.getElementById('txt-optical-model');
    if (txt) {
        txt.innerText = config.opticalModel === 'beer_lambert' 
            ? (currentLang === 'fr' ? 'Transmission Physique Beer-Lambert' : 'Beer-Lambert Physical Transmission')
            : (currentLang === 'fr' ? 'Lissage Cubique Net' : 'Cubic Smooth Ramp');
    }
    generate3DReliefMesh();
    if (centerViewMode === '2d') render2DEditorPreview();
}

function updateColorMode() {
    config.colorMode = document.getElementById('select-color-mode').value;
    const badge = document.getElementById('badge-color-mode');
    if (badge) {
        if (config.colorMode === 'chromatic') badge.innerText = "Bambu AMS CAD";
        else if (config.colorMode === 'stratified') badge.innerText = "M600 Layer-Swap";
        else badge.innerText = "Luminance B/W";
    }
    generate3DReliefMesh();
    if (centerViewMode === '2d') render2DEditorPreview();
    updateSlicerTable();
}

function updateQualityParams() {
    config.detailSharpness = parseInt(document.getElementById('slider-sharpness').value);
    config.subjectPop = parseInt(document.getElementById('slider-subject-pop').value);
    config.colorSnap = parseInt(document.getElementById('slider-color-snap').value);
    config.preserveEyes = document.getElementById('chk-preserve-eyes').checked;
    const domeEl = document.getElementById('slider-sculpt-dome');
    if (domeEl) {
        config.sculpturalDome = parseInt(domeEl.value) || 0;
        const valDome = document.getElementById('val-sculpt-dome');
        if (valDome) valDome.innerText = `${config.sculpturalDome}%`;
    }
    const tdEl = document.getElementById('slider-td-blend');
    if (tdEl) {
        config.tdOpticalBlend = parseInt(tdEl.value) || 0;
        const valTd = document.getElementById('val-td-blend');
        if (valTd) valTd.innerText = `${config.tdOpticalBlend}%`;
    }
    const dithEl = document.getElementById('slider-dithering');
    if (dithEl) {
        config.opticalDithering = parseInt(dithEl.value) || 0;
        const valDith = document.getElementById('val-dithering');
        if (valDith) valDith.innerText = `${config.opticalDithering}%`;
    }
    const chkBi = document.getElementById('chk-bilateral');
    if (chkBi) config.bilateralEdgeLock = chkBi.checked;
    const chkBoost = document.getElementById('chk-boost-fine-lines');
    if (chkBoost) config.boostFineLines = chkBoost.checked;

    // Tone curve & HueForge Dynamic Range Sliders
    const gammaEl = document.getElementById('slider-gamma');
    if (gammaEl) {
        config.gamma = parseFloat(gammaEl.value) || 1.0;
        const valGamma = document.getElementById('val-gamma');
        if (valGamma) valGamma.innerText = `${config.gamma.toFixed(2)}x`;
    }
    const shadowEl = document.getElementById('slider-shadow-lift');
    if (shadowEl) {
        config.shadowLift = parseInt(shadowEl.value) || 0;
        const valShadow = document.getElementById('val-shadow-lift');
        if (valShadow) valShadow.innerText = `${config.shadowLift}%`;
    }
    const ceilingEl = document.getElementById('slider-highlight-ceiling');
    if (ceilingEl) {
        config.highlightCeiling = parseInt(ceilingEl.value) || 100;
        const valCeiling = document.getElementById('val-highlight-ceiling');
        if (valCeiling) valCeiling.innerText = `${config.highlightCeiling}%`;
    }
    const vibEl = document.getElementById('slider-vibrance');
    if (vibEl) {
        config.vibrance = parseInt(vibEl.value) || 0;
        const valVib = document.getElementById('val-vibrance');
        if (valVib) valVib.innerText = `${config.vibrance > 0 ? '+' : ''}${config.vibrance}%`;
    }
    const bSharpEl = document.getElementById('slider-boundary-sharpness');
    if (bSharpEl) {
        config.boundarySharpness = parseInt(bSharpEl.value) || 80;
        const valBSharp = document.getElementById('val-boundary-sharpness');
        if (valBSharp) valBSharp.innerText = `${config.boundarySharpness}%`;
    }

    document.getElementById('val-sharpness').innerText = config.detailSharpness;
    document.getElementById('val-subject-pop').innerText = `${config.subjectPop > 0 ? '+' : ''}${config.subjectPop}%`;
    document.getElementById('val-color-snap').innerText = `${config.colorSnap}%`;

    processSourceImage();
    if (centerViewMode === '2d') render2DEditorPreview();
}


// ==========================================
// 🏔️ TRUE COLOR CHROMATIC 3D MESH GENERATOR (ULTRA-QUALITY ENGINE + DIE-CUT CONTOUR WALLS)
// ==========================================
function generate3DReliefMesh() {
    if (!processedCanvas.width || !processedCanvas.height || !colorDataBuffer) return;
    if (!scene || typeof THREE === 'undefined') {
        if (typeof updateHUD === 'function') updateHUD();
        if (typeof updateSlicerTable === 'function') updateSlicerTable();
        return;
    }

    if (clipPlane && !isSlicerSimulationActive) {
        clipPlane.normal.set(0, 0, -1);
        clipPlane.constant = 10000;
    }

    const cols = processedCanvas.width;
    const rows = processedCanvas.height;

    if (reliefMesh) {
        scene.remove(reliefMesh);
        reliefMesh.geometry.dispose();
        if (reliefMesh.material) reliefMesh.material.dispose();
        reliefMesh = null;
    }

    const w = config.width;
    const h = config.height;
    const baseZ = config.baseThickness;
    const maxReliefZ = config.maxRelief;
    const N = cols * rows;

    const basePlaneGeom = new THREE.PlaneGeometry(w, h, cols - 1, rows - 1);
    const basePos = basePlaneGeom.attributes.position.array;
    const baseUv = basePlaneGeom.attributes.uv.array;

    // Allocate 2*N vertices (0..N-1 = Top Relief Surface, N..2N-1 = Bottom Z=0 Base for Watertight Contour Side Walls)
    const pos = new Float32Array(N * 2 * 3);
    const uvAttr = new Float32Array(N * 2 * 2);
    const colorAttr = new Float32Array(N * 2 * 3);
    const zBuffer = new Float32Array(N);
    const lumBuffer = new Float32Array(N);
    const voidPixelMask = new Uint8Array(N);

    // Pre-parse filament colors into RGB and Three.Color
    const parsedFilaments = filaments.map((f, idx) => {
        const rgb = hexToRgb(f.color);
        return {
            idx: idx,
            name: f.name,
            color: new THREE.Color(f.color),
            rgb: rgb,
            startPct: f.startPct,
            td: f.td || 3.0,
            startZ: baseZ + f.startPct * (maxReliefZ - baseZ)
        };
    });

    const sharpness = config.detailSharpness * 0.12;
    const tdBlendStrength = (config.tdOpticalBlend !== undefined ? config.tdOpticalBlend : 65) / 100.0;
    const ditherPct = config.opticalDithering !== undefined ? config.opticalDithering : 20;
    const needBgSample = (config.bgMode === 'flatten_bg' || config.bgMode === 'cameo_dome' || config.sculpturalDome > 0 || config.removeCanvasBg);
    const [bgR, bgG, bgB] = needBgSample ? computeBorderBackgroundRGB(colorDataBuffer, cols, rows) : [0, 0, 0];
    const cachedBgRgb = [bgR, bgG, bgB];

    // PASS 1: Compute Luminance, Cutout Void Mask & Raw Relief Z-Heights
    for (let i = 0; i < N; i++) {
        const colIdx = i % cols;
        const rowIdx = Math.floor(i / cols);
        const imgIdx = (rowIdx * cols + colIdx) * 4;

        const nx = (colIdx / Math.max(1, cols - 1)) * 2.0 - 1.0;
        const ny = (rowIdx / Math.max(1, rows - 1)) * 2.0 - 1.0;
        const outsideShape = isOutsideOutlineShape(nx, ny, config.outlineShape);
        const isVoid = isPixelCutoutVoid(colIdx, rowIdx, cols, rows, cachedBgRgb);
        voidPixelMask[i] = isVoid ? 1 : 0;

        const r = colorDataBuffer[imgIdx];
        const g = colorDataBuffer[imgIdx + 1];
        const b = colorDataBuffer[imgIdx + 2];

        const userFilSlot = (filamentSlotBuffer && filamentSlotBuffer[i] !== 255 && filamentSlotBuffer[i] < parsedFilaments.length) ? filamentSlotBuffer[i] : null;

        let lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255.0;

        // High-pass edge sharpening for fur, whiskers, eyes
        if (userFilSlot === null && sharpness > 0 && colIdx > 0 && colIdx < cols - 1 && rowIdx > 0 && rowIdx < rows - 1) {
            const upIdx = ((rowIdx - 1) * cols + colIdx) * 4;
            const downIdx = ((rowIdx + 1) * cols + colIdx) * 4;
            const leftIdx = (rowIdx * cols + (colIdx - 1)) * 4;
            const rightIdx = (rowIdx * cols + (colIdx + 1)) * 4;

            const avgLumNeighbor = (
                (0.2126 * colorDataBuffer[upIdx] + 0.7152 * colorDataBuffer[upIdx+1] + 0.0722 * colorDataBuffer[upIdx+2]) +
                (0.2126 * colorDataBuffer[downIdx] + 0.7152 * colorDataBuffer[downIdx+1] + 0.0722 * colorDataBuffer[downIdx+2]) +
                (0.2126 * colorDataBuffer[leftIdx] + 0.7152 * colorDataBuffer[leftIdx+1] + 0.0722 * colorDataBuffer[leftIdx+2]) +
                (0.2126 * colorDataBuffer[rightIdx] + 0.7152 * colorDataBuffer[rightIdx+1] + 0.0722 * colorDataBuffer[rightIdx+2])
            ) / (4.0 * 255.0);

            const edgeDelta = lum - avgLumNeighbor;
            lum = Math.max(0.0, Math.min(1.0, lum + edgeDelta * sharpness));
        }

        // Studio Vignette mode
        if (config.bgMode === 'vignette' && userFilSlot === null) {
            const rSq = nx * nx + ny * ny;
            lum *= Math.max(0.12, 1.0 - Math.pow(rSq, 1.1) * 0.68);
        }

        lumBuffer[i] = lum;

        // Height Z calculation with 2.5D Sculptural Bas-Relief Cushion
        let zVal = computeSculpturalBasReliefZ(lum, nx, ny, r, g, b, bgR, bgG, bgB, baseZ, maxReliefZ);

        // AI Isolate Subject (Flatten Background to Base)
        let isFlattenedBg = false;
        if (config.bgMode === 'flatten_bg' && userFilSlot === null) {
            const distBg = Math.sqrt(colorDistSq(r, g, b, bgR, bgG, bgB));
            const radDist = Math.sqrt(nx * nx + ny * ny);
            if (distBg < 95 && radDist > 0.36) {
                zVal = baseZ;
                isFlattenedBg = true;
            }
        }

        if (userFilSlot !== null && (config.colorMode === 'stratified' || isDrawingTemplateActive)) {
            const filStartZ = baseZ + parsedFilaments[userFilSlot].startPct * (maxReliefZ - baseZ);
            zVal = Math.min(maxReliefZ, filStartZ + (userFilSlot > 0 ? 0.16 : 0.0));
        } else if (!isFlattenedBg && config.subjectPop > 0 && r > g && r > b) {
            zVal = Math.min(maxReliefZ, zVal + (config.subjectPop / 100.0) * 0.35);
        }

        if (customZDeltaBuffer && customZDeltaBuffer[i] !== 0) {
            zVal = Math.max(Math.max(0.24, baseZ * 0.55), Math.min(maxReliefZ + 0.64, zVal + customZDeltaBuffer[i]));
        }

        if (outsideShape) {
            zVal = baseZ * 0.55;
        }

        const uNorm = colIdx / Math.max(1, cols - 1);
        const vNorm = rowIdx / Math.max(1, rows - 1);
        const waveSample = sampleActiveSoundwave(uNorm, vNorm);
        if (waveSample !== null && !outsideShape) {
            zVal = waveSample ? maxReliefZ : Math.max(baseZ, baseZ + config.layerHeight * 2);
        }
        const qrSample = sampleActiveQRStamp(uNorm, vNorm);
        if (qrSample !== null) {
            zVal = qrSample ? maxReliefZ : Math.max(baseZ, maxReliefZ - 0.16);
        }

        // Physical Slicer Layer Quantization Stepping
        if (config.layerQuantizeStep && config.layerQuantizeStep > 0) {
            const qStep = config.layerQuantizeStep;
            zVal = baseZ + Math.round((zVal - baseZ) / qStep) * qStep;
            zVal = Math.max(baseZ * 0.5, Math.min(maxReliefZ + 0.64, zVal));
        }

        zBuffer[i] = zVal;
    }

    // PASS 2: Sub-Nozzle Anti-Spike Filter + Overhang Slope + Top & Bottom Vertex/Color Output
    for (let i = 0; i < N; i++) {
        const colIdx = i % cols;
        const rowIdx = Math.floor(i / cols);
        const imgIdx = (rowIdx * cols + colIdx) * 4;

        const nx = (colIdx / Math.max(1, cols - 1)) * 2.0 - 1.0;
        const ny = (rowIdx / Math.max(1, rows - 1)) * 2.0 - 1.0;
        const outsideShape = isOutsideOutlineShape(nx, ny, config.outlineShape);

        const uNorm = colIdx / Math.max(1, cols - 1);
        const vNorm = rowIdx / Math.max(1, rows - 1);
        const waveSample = sampleActiveSoundwave(uNorm, vNorm);
        const qrSample = sampleActiveQRStamp(uNorm, vNorm);

        let zVal = zBuffer[i];
        let isSubNozzleFeature = false;
        let isSteepOverhang = 0; // 0 = safe, 1 = >45 deg, 2 = >60 deg

        const nozzleMm = config.nozzleSize || 0.4;
        const spikeThreshold = nozzleMm * 0.55;

        if (colIdx > 0 && colIdx < cols - 1 && rowIdx > 0 && rowIdx < rows - 1 && qrSample === null && waveSample === null) {
            const zU = zBuffer[i - cols];
            const zD = zBuffer[i + cols];
            const zL = zBuffer[i - 1];
            const zR = zBuffer[i + 1];
            const avgZ = (zU + zD + zL + zR) * 0.25;
            const spikeDelta = zVal - avgZ;

            const horizSpike = (Math.abs(zVal - zL) > spikeThreshold && Math.abs(zVal - zR) > spikeThreshold && Math.sign(zVal - zL) === Math.sign(zVal - zR));
            const vertSpike = (Math.abs(zVal - zU) > spikeThreshold && Math.abs(zVal - zD) > spikeThreshold && Math.sign(zVal - zU) === Math.sign(zVal - zD));
            if (horizSpike || vertSpike) {
                isSubNozzleFeature = true;
            }

            if (config.bilateralEdgeLock && Math.abs(spikeDelta) > (spikeThreshold * 1.1) && horizSpike && vertSpike) {
                zVal = avgZ + Math.sign(spikeDelta) * (spikeThreshold * 0.7);
            }

            if (isOverhangWarning) {
                const pitchX = w / Math.max(1, cols - 1);
                const pitchY = h / Math.max(1, rows - 1);
                const gradX = Math.abs(zR - zL) / (2.0 * pitchX);
                const gradY = Math.abs(zD - zU) / (2.0 * pitchY);
                const slope = Math.hypot(gradX, gradY);
                const slopeDeg = Math.atan(slope) * (180.0 / Math.PI);
                if (slopeDeg >= 60.0) isSteepOverhang = 2;
                else if (slopeDeg >= 45.0) isSteepOverhang = 1;
            }
        }

        const origX = basePos[i * 3];
        const origY = basePos[i * 3 + 1];
        const [cx, cy, cz] = applyTopographyVertex(origX, origY, zVal, w, config.topography);
        pos[i * 3] = cx;
        pos[i * 3 + 1] = cy;
        pos[i * 3 + 2] = cz;

        const botZ = computeRearCavityDepthMm(origX, origY, zVal, w, h, baseZ);
        const [bx, by, bz] = applyTopographyVertex(origX, origY, botZ, w, config.topography);
        const botVert = N + i;
        pos[botVert * 3] = bx;
        pos[botVert * 3 + 1] = by;
        pos[botVert * 3 + 2] = bz;

        uvAttr[i * 2] = baseUv[i * 2];
        uvAttr[i * 2 + 1] = baseUv[i * 2 + 1];
        uvAttr[botVert * 2] = baseUv[i * 2];
        uvAttr[botVert * 2 + 1] = baseUv[i * 2 + 1];

        const r = colorDataBuffer[imgIdx];
        const g = colorDataBuffer[imgIdx + 1];
        const b = colorDataBuffer[imgIdx + 2];
        const lum = lumBuffer[i];
        const userFilSlot = (filamentSlotBuffer && filamentSlotBuffer[i] !== 255 && filamentSlotBuffer[i] < parsedFilaments.length) ? filamentSlotBuffer[i] : null;
        const isFlattenedBg = (config.bgMode === 'flatten_bg' && userFilSlot === null && zVal <= baseZ + 0.001);

        let vColor = new THREE.Color();

        if (isOverhangWarning) {
            if (isSteepOverhang === 2) {
                vColor.setRGB(0.96, 0.18, 0.18); // Severe >60° Overhang (Red alert)
            } else if (isSteepOverhang === 1) {
                vColor.setRGB(0.98, 0.65, 0.05); // Moderate >45° Overhang (Amber caution)
            } else {
                const dim = 0.22 + lum * 0.45;
                vColor.setRGB(dim * 0.55, dim * 0.85, dim * 0.65); // Safe printable slope (Soft green/slate)
            }
        } else if (isZebraExposure) {
            if (zVal >= maxReliefZ - 0.035) {
                vColor.setRGB(0.98, 0.12, 0.55); // Neon Magenta (Clipping High Peak)
            } else if (zVal <= baseZ + 0.035) {
                vColor.setRGB(0.02, 0.82, 0.95); // Neon Cyan (Crushed Base Plate)
            } else {
                const normH = Math.max(0.0, Math.min(1.0, (zVal - baseZ) / Math.max(0.01, maxReliefZ - baseZ)));
                vColor.setRGB(normH * 0.85, normH * 0.85, normH * 0.85); // Monochrome zebra exposure ramp
            }
        } else if (isNozzleInspectMode) {
            if (isSubNozzleFeature) {
                if (zVal > baseZ + (maxReliefZ - baseZ) * 0.5) {
                    vColor.setRGB(0.0, 0.96, 0.84);
                } else {
                    vColor.setRGB(0.98, 0.65, 0.05);
                }
            } else {
                const dim = 0.18 + lum * 0.38;
                vColor.setRGB(dim * 0.82, dim * 0.88, dim);
            }
        } else if (qrSample !== null) {
            if (qrSample) vColor.setRGB(0.02, 0.02, 0.02);
            else vColor.setRGB(1.0, 1.0, 1.0);
        } else if (waveSample !== null && !outsideShape) {
            if (waveSample) vColor.copy(parsedFilaments[parsedFilaments.length - 1].color);
            else vColor.copy(parsedFilaments[0].color);
        } else if (outsideShape || isFlattenedBg) {
            vColor.copy(parsedFilaments[0].color);
        } else if (userFilSlot !== null) {
            vColor.copy(parsedFilaments[userFilSlot].color);
        } else if (isColorMapMode) {
            const bestFilIdx = findClosestFilamentWithDither(r, g, b, colIdx, rowIdx, parsedFilaments, ditherPct);
            vColor.copy(parsedFilaments[bestFilIdx].color);
        } else if (config.colorMode === 'chromatic') {
            const bestFilIdx = findClosestFilamentWithDither(r, g, b, colIdx, rowIdx, parsedFilaments, ditherPct);
            const snapPct = (config.boundarySharpness !== undefined ? config.boundarySharpness : config.colorSnap);
            const snapFactor = (snapPct !== undefined ? snapPct : 80) / 100.0;
            const chosenFil = parsedFilaments[bestFilIdx];
            const targetFilColor = chosenFil.color;
            const origImgColor = new THREE.Color(r / 255, g / 255, b / 255);
            vColor.copy(origImgColor).lerp(targetFilColor, snapFactor);

            if (tdBlendStrength > 0.02 && bestFilIdx > 0) {
                const dz = Math.max(0.06, zVal - baseZ);
                const tdMm = Math.max(0.4, chosenFil.td || 3.0);
                const transmission = Math.exp(-3.1 * (dz / (tdMm * 0.55)));
                const baseInfluence = Math.min(0.42, transmission * tdBlendStrength * 0.45);
                vColor.lerp(parsedFilaments[0].color, baseInfluence);
            }

            if (config.preserveEyes && (r > 190 && g > 150 && b < 80)) {
                const eyeFil = parsedFilaments.find(f => f.color.r > 0.8 && f.color.g > 0.6) || parsedFilaments[parsedFilaments.length - 2];
                vColor.copy(eyeFil.color);
            }
        } else if (config.colorMode === 'stratified') {
            const [tdR, tdG, tdB] = computeBeerLambertTDColor(
                lum, zVal, baseZ, maxReliefZ, parsedFilaments, tdBlendStrength, colIdx, rowIdx, ditherPct
            );
            vColor.setRGB(tdR / 255.0, tdG / 255.0, tdB / 255.0);
        } else {
            vColor.setRGB(lum, lum, lum);
        }

        colorAttr[i * 3] = vColor.r;
        colorAttr[i * 3 + 1] = vColor.g;
        colorAttr[i * 3 + 2] = vColor.b;

        colorAttr[botVert * 3] = vColor.r * 0.76;
        colorAttr[botVert * 3 + 1] = vColor.g * 0.76;
        colorAttr[botVert * 3 + 2] = vColor.b * 0.76;
    }
    basePlaneGeom.dispose();

    // PASS 3: Build Active Die-Cut Cells & Watertight 3D Vertical Side Walls around Silhouette & Through-Holes
    const cellCols = cols - 1;
    const cellRows = rows - 1;
    const activeCells = new Uint8Array(cellCols * cellRows);
    let activeCellCount = 0;

    for (let r = 0; r < cellRows; r++) {
        for (let c = 0; c < cellCols; c++) {
            const tl = r * cols + c;
            const tr = tl + 1;
            const bl = (r + 1) * cols + c;
            const br = bl + 1;
            const voidCount = voidPixelMask[tl] + voidPixelMask[tr] + voidPixelMask[bl] + voidPixelMask[br];
            if (voidCount <= 1) {
                activeCells[r * cellCols + c] = 1;
                activeCellCount++;
            }
        }
    }

    // Safety fallback: if 100% of canvas is blank/void (e.g. empty canvas before first stroke), show full plate
    if (activeCellCount === 0) {
        activeCells.fill(1);
        activeCellCount = cellCols * cellRows;
    }

    const triIndices = [];
    for (let r = 0; r < cellRows; r++) {
        const rowOff = r * cellCols;
        for (let c = 0; c < cellCols; c++) {
            if (activeCells[rowOff + c] === 0) continue;

            const tl = r * cols + c;
            const tr = tl + 1;
            const bl = (r + 1) * cols + c;
            const br = bl + 1;

            // Top relief surface triangles
            triIndices.push(tl, bl, tr, tr, bl, br);

            // Bottom surface triangles
            const b_tl = N + tl, b_tr = N + tr, b_bl = N + bl, b_br = N + br;
            triIndices.push(b_tl, b_tr, b_bl, b_tr, b_br, b_bl);

            // North boundary wall (+Y)
            if (r === 0 || activeCells[(r - 1) * cellCols + c] === 0) {
                triIndices.push(tl, tr, b_tl, tr, b_tr, b_tl);
            }
            // South boundary wall (-Y)
            if (r === cellRows - 1 || activeCells[(r + 1) * cellCols + c] === 0) {
                triIndices.push(bl, b_bl, br, br, b_bl, b_br);
            }
            // West boundary wall (-X)
            if (c === 0 || activeCells[rowOff + (c - 1)] === 0) {
                triIndices.push(tl, b_tl, bl, bl, b_tl, b_bl);
            }
            // East boundary wall (+X)
            if (c === cellCols - 1 || activeCells[rowOff + (c + 1)] === 0) {
                triIndices.push(tr, br, b_tr, br, b_br, b_tr);
            }
        }
    }

    const gridGeom = new THREE.BufferGeometry();
    gridGeom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    gridGeom.setAttribute('uv', new THREE.BufferAttribute(uvAttr, 2));
    gridGeom.setAttribute('color', new THREE.BufferAttribute(colorAttr, 3));
    gridGeom.setIndex(triIndices);
    gridGeom.computeVertexNormals();
    gridGeom.userData = { gridCols: cols, gridRows: rows, activeCells: activeCells, cellCols: cellCols, cellRows: cellRows };

    // Configure PBR Filament Surface Finish (Standard PLA, Matte, Silk Metallic, Translucent PETG)
    let matRoughness = 0.36;
    let matMetalness = 0.08;
    let matTransparent = false;
    let matOpacity = 1.0;

    if (isLightbox) {
        matRoughness = 0.85;
        matMetalness = 0.0;
    } else if (config.filamentFinish === 'matte') {
        matRoughness = 0.88;
        matMetalness = 0.02;
    } else if (config.filamentFinish === 'silk') {
        matRoughness = 0.16;
        matMetalness = 0.52;
    } else if (config.filamentFinish === 'translucent') {
        matRoughness = 0.22;
        matMetalness = 0.04;
        matTransparent = true;
        matOpacity = 0.93;
    }

    // Ironing Simulation: mirror-smooth surface with high specular sheen (like Bambu top surface ironing)
    if (config.ironingSimulation && !isLightbox) {
        matRoughness = Math.min(matRoughness, 0.10);
        matMetalness = Math.max(matMetalness, 0.25);
    }

    const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: matRoughness,
        metalness: matMetalness,
        transparent: matTransparent,
        opacity: matOpacity,
        side: THREE.DoubleSide,
        wireframe: isWireframe,
        clippingPlanes: [clipPlane]
    });

    // Micro-Layer 3D Ridges Shader (simulates real 0.08mm Z-layer steps & 0.4mm rectilinear toolpath sheen)
    if (config.layerRidges && !isWireframe) {
        const layerStepMm = Math.max(0.04, config.layerHeight || 0.08);
        const isIroning = !!config.ironingSimulation;
        material.onBeforeCompile = (shader) => {
            shader.uniforms.uLayerStep = { value: layerStepMm };
            shader.uniforms.uIroning = { value: isIroning ? 1.0 : 0.0 };
            shader.vertexShader = `varying vec3 vLocalReliefPos;\n` + shader.vertexShader.replace(
                `#include <begin_vertex>`,
                `#include <begin_vertex>\nvLocalReliefPos = position;`
            );
            shader.fragmentShader = `varying vec3 vLocalReliefPos;\nuniform float uLayerStep;\nuniform float uIroning;\n` + shader.fragmentShader.replace(
                `#include <dithering_fragment>`,
                `float layerWave = sin((vLocalReliefPos.z / uLayerStep) * 6.2831853);
                float toolpathWave = sin((vLocalReliefPos.x + vLocalReliefPos.y) * 18.0);
                float ridgeShade = 1.0 + (layerWave * 0.032 + toolpathWave * 0.012) * (1.0 - uIroning * 0.82);
                gl_FragColor.rgb *= ridgeShade;
                #include <dithering_fragment>`
            );
        };
    }

    reliefMesh = new THREE.Mesh(gridGeom, material);
    scene.add(reliefMesh);

    buildQR3DOverlayMesh();
    buildFrameMesh();
    renderLayerEqualizerUI();
    updateHUD();
    updateSlicerTable();
}

function sampleActiveQRStamp(u, v) {
    if (!activeQRStamp || !activeQRStamp.matrix) return null;
    if (u < activeQRStamp.u0 || u > activeQRStamp.u1 || v < activeQRStamp.v0 || v > activeQRStamp.v1) {
        return null;
    }
    const M = activeQRStamp.matrix.length;
    const qz = activeQRStamp.quietZone || 4;
    const totalMods = M + qz * 2;
    const relU = (u - activeQRStamp.u0) / Math.max(1e-6, activeQRStamp.u1 - activeQRStamp.u0);
    const relV = (v - activeQRStamp.v0) / Math.max(1e-6, activeQRStamp.v1 - activeQRStamp.v0);
    const mc = Math.min(totalMods - 1, Math.max(0, Math.floor(relU * totalMods))) - qz;
    const mr = Math.min(totalMods - 1, Math.max(0, Math.floor(relV * totalMods))) - qz;
    if (mr >= 0 && mr < M && mc >= 0 && mc < M) {
        return activeQRStamp.matrix[mr][mc] === 1;
    }
    return false; // White Quiet Zone
}

function buildQR3DOverlayMesh() {
    if (!scene || typeof THREE === 'undefined') return;
    if (qr3DMesh) {
        scene.remove(qr3DMesh);
        qr3DMesh.geometry.dispose();
        if (qr3DMesh.material) {
            if (qr3DMesh.material.map) qr3DMesh.material.map.dispose();
            qr3DMesh.material.dispose();
        }
        qr3DMesh = null;
    }

    const btnClear = document.getElementById('btn-clear-qr');
    if (!activeQRStamp || !activeQRStamp.matrix) {
        if (btnClear) btnClear.style.display = 'none';
        return;
    }
    if (btnClear) btnClear.style.display = 'inline-flex';

    const M = activeQRStamp.matrix.length;
    const qz = activeQRStamp.quietZone || 4;
    const totalMods = M + qz * 2;
    const pxPerMod = 16;
    const texSize = totalMods * pxPerMod;

    const qrCvs = document.createElement('canvas');
    qrCvs.width = texSize;
    qrCvs.height = texSize;
    const qCtx = qrCvs.getContext('2d');
    qCtx.imageSmoothingEnabled = false;

    // High-contrast Pure White Quiet Zone & Background for instant smartphone camera scanning
    qCtx.fillStyle = '#FFFFFF';
    qCtx.fillRect(0, 0, texSize, texSize);

    // Crisp Black ISO/IEC 18004 QR Modules
    qCtx.fillStyle = '#000000';
    for (let r = 0; r < M; r++) {
        for (let c = 0; c < M; c++) {
            if (activeQRStamp.matrix[r][c] === 1) {
                qCtx.fillRect((c + qz) * pxPerMod, (r + qz) * pxPerMod, pxPerMod, pxPerMod);
            }
        }
    }

    const qrTex = new THREE.CanvasTexture(qrCvs);
    qrTex.magFilter = THREE.NearestFilter;
    qrTex.minFilter = THREE.NearestFilter;
    qrTex.generateMipmaps = false;

    const w = config.width;
    const h = config.height;
    const x0 = -w / 2 + activeQRStamp.u0 * w;
    const x1 = -w / 2 + activeQRStamp.u1 * w;
    const yTop = h / 2 - activeQRStamp.v0 * h;
    const yBot = h / 2 - activeQRStamp.v1 * h;
    const cxPad = (x0 + x1) * 0.5;
    const cyPad = (yTop + yBot) * 0.5;
    const padW = Math.abs(x1 - x0);
    const padH = Math.abs(yTop - yBot);

    const qrGeom = new THREE.PlaneGeometry(padW, padH, 28, 28);
    const qPos = qrGeom.attributes.position.array;
    const vertCount = qPos.length / 3;
    const zTop = config.maxRelief + 0.05;

    for (let k = 0; k < vertCount; k++) {
        const vx = qPos[k * 3] + cxPad;
        const vy = qPos[k * 3 + 1] + cyPad;
        const [tx, ty, tz] = applyTopographyVertex(vx, vy, zTop, w, config.topography);
        qPos[k * 3] = tx;
        qPos[k * 3 + 1] = ty;
        qPos[k * 3 + 2] = tz;
    }
    qrGeom.computeVertexNormals();

    const qrMat = new THREE.MeshBasicMaterial({
        map: qrTex,
        side: THREE.DoubleSide,
        wireframe: isWireframe,
        clippingPlanes: [clipPlane],
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
    });

    qr3DMesh = new THREE.Mesh(qrGeom, qrMat);
    scene.add(qr3DMesh);
}

// ==========================================
// 🖼️ CAD REAR CAVITIES, CURVED FRAMES & MOUNTING BUILDER
// ==========================================
function computeRearCavityDepthMm(x, y, topZ, w, h, baseZ) {
    let recess = 0.0;
    if (config.nfcPocket && (x * x + y * y) <= 169.0) {
        recess = Math.max(recess, Math.min(baseZ * 0.65, 0.48));
    }
    const mount = config.mounting || 'flat';
    if (mount === 'keyhole') {
        const ky = h * (config.outlineShape === 'heart' ? 0.14 : 0.28);
        const dyHead = y - (ky - 5.5);
        const dyCap = y - (ky + 6.5);
        const inHead = (x * x + dyHead * dyHead) <= 20.25;
        const inStem = Math.abs(x) <= 2.3 && y >= (ky - 5.5) && y <= (ky + 6.5);
        const inCap = (x * x + dyCap * dyCap) <= 5.29;
        if (inHead || inStem || inCap) {
            recess = Math.max(recess, Math.min(2.2, Math.max(0.36, baseZ * 0.72)));
        }
    } else if (mount === 'magnets_6' || mount === 'magnets_8' || mount === 'magnets_10') {
        const magR = mount === 'magnets_8' ? 4.15 : (mount === 'magnets_10' ? 5.15 : 3.15);
        const targetD = mount === 'magnets_8' ? 3.1 : 2.1;
        const kOff = (!config.outlineShape || config.outlineShape === 'rect') ? 0.34 : 0.20;
        const dx = Math.abs(x) - w * kOff;
        const dy = Math.abs(y) - h * kOff;
        if (dx * dx + dy * dy <= magR * magR) {
            recess = Math.max(recess, Math.min(targetD, Math.max(0.28, baseZ * 0.75)));
        }
    }
    const safeMax = Math.max(0.0, topZ - 0.24);
    return Math.max(0.0, Math.min(recess, safeMax));
}

function createBoxTris(xMin, xMax, yMin, yMax, zMin, zMax) {
    const v = [
        [xMin, yMin, zMin], [xMax, yMin, zMin], [xMax, yMax, zMin], [xMin, yMax, zMin],
        [xMin, yMin, zMax], [xMax, yMin, zMax], [xMax, yMax, zMax], [xMin, yMax, zMax]
    ];
    const fIndices = [
        0,2,1, 0,3,2,
        4,5,6, 4,6,7,
        0,1,5, 0,5,4,
        2,3,7, 2,7,6,
        0,4,7, 0,7,3,
        1,2,6, 1,6,5
    ];
    const tris = [];
    for (let fi = 0; fi < fIndices.length; fi += 3) {
        tris.push([v[fIndices[fi]], v[fIndices[fi + 1]], v[fIndices[fi + 2]]]);
    }
    return tris;
}

function buildClosedAnnularPrismTris(innerPts, outerPts, zBot, zTop, chamferW = 0, chamferZ = 0) {
    const M = Math.min(innerPts.length, outerPts.length);
    if (M < 3 || zTop <= zBot) return [];
    const rings = [[innerPts, zBot], [outerPts, zBot]];
    const useChamfer = chamferW > 0.05 && chamferZ > 0.05 && (zTop - zBot) > (chamferZ + 0.2);
    if (useChamfer) {
        const insetPts = new Array(M);
        for (let i = 0; i < M; i++) {
            const ix = innerPts[i][0], iy = innerPts[i][1];
            const ox = outerPts[i][0], oy = outerPts[i][1];
            const span = Math.hypot(ox - ix, oy - iy);
            const t = Math.min(0.45, chamferW / Math.max(0.5, span));
            insetPts[i] = [ox + (ix - ox) * t, oy + (iy - oy) * t];
        }
        rings.push([outerPts, zTop - chamferZ]);
        rings.push([insetPts, zTop]);
    } else {
        rings.push([outerPts, zTop]);
    }
    rings.push([innerPts, zTop]);

    const tris = [];
    const R = rings.length;
    for (let k = 0; k < R; k++) {
        const kNext = (k + 1) % R;
        const ptsA = rings[k][0], zA = rings[k][1];
        const ptsB = rings[kNext][0], zB = rings[kNext][1];
        for (let i = 0; i < M; i++) {
            const iNext = (i + 1) % M;
            const a0 = [ptsA[i][0], ptsA[i][1], zA];
            const a1 = [ptsA[iNext][0], ptsA[iNext][1], zA];
            const b0 = [ptsB[i][0], ptsB[i][1], zB];
            const b1 = [ptsB[iNext][0], ptsB[iNext][1], zB];
            tris.push([a0, a1, b0]);
            tris.push([a1, b1, b0]);
        }
    }
    return tris;
}

function sampleOutlineBoundaryPointAtAngle(w, h, shape, thetaRad) {
    if (!shape || shape === 'rect') {
        const c = Math.cos(thetaRad), s = Math.sin(thetaRad);
        const tX = Math.abs(c) > 1e-6 ? (1.0 / Math.abs(c)) : 1e6;
        const tY = Math.abs(s) > 1e-6 ? (1.0 / Math.abs(s)) : 1e6;
        const t = Math.min(tX, tY);
        return [c * t * w * 0.5, s * t * h * 0.5];
    }
    const ux = Math.cos(thetaRad);
    const uyImg = -Math.sin(thetaRad);
    let lo = 0.04, hi = 1.65;
    for (let it = 0; it < 14; it++) {
        const mid = (lo + hi) * 0.5;
        if (isOutsideOutlineShape(ux * mid, uyImg * mid, shape)) hi = mid;
        else lo = mid;
    }
    return [ux * lo * w * 0.5, Math.sin(thetaRad) * lo * h * 0.5];
}

function sampleOutlineBoundaryContour(w, h, shape, borderW, overlapIn = 0.35, numSegs = 112) {
    const M = Math.max(16, numSegs);
    const pts = new Array(M);
    for (let i = 0; i < M; i++) {
        const theta = (i / M) * Math.PI * 2;
        pts[i] = sampleOutlineBoundaryPointAtAngle(w, h, shape, theta);
    }
    const isNonConvex = (shape === 'heart' || shape === 'star');
    const innerPts = new Array(M);
    const outerPts = new Array(M);
    for (let i = 0; i < M; i++) {
        const pPrev = pts[(i - 1 + M) % M];
        const pCur = pts[i];
        const pNext = pts[(i + 1) % M];
        const tx = pNext[0] - pPrev[0];
        const ty = pNext[1] - pPrev[1];
        const tLen = Math.hypot(tx, ty) || 1;
        const nx = ty / tLen;
        const ny = -tx / tLen;
        const pLen = Math.hypot(pCur[0], pCur[1]) || 1;
        const rx = pCur[0] / pLen;
        const ry = pCur[1] / pLen;

        let oxDir = nx, oyDir = ny;
        const align = nx * rx + ny * ry;
        if (isNonConvex && align < 0.45) {
            const bx = nx * 0.35 + rx * 0.65;
            const by = ny * 0.35 + ry * 0.65;
            const bLen = Math.hypot(bx, by) || 1;
            oxDir = bx / bLen;
            oyDir = by / bLen;
        }
        innerPts[i] = [pCur[0] - rx * overlapIn, pCur[1] - ry * overlapIn];
        outerPts[i] = [pCur[0] + oxDir * borderW, pCur[1] + oyDir * borderW];
    }
    return { innerPts, outerPts };
}

function buildFrameAndMountingTriangles(w, h, baseZ, maxZ, options = {}) {
    const topo = options.tileCrop ? 'flat' : (config.topography || 'flat');
    if (topo !== 'flat') {
        return { frameTriangles: [], mountingTriangles: [], combined: [], frameVolMm3: 0, mountVolMm3: 0 };
    }

    let frameTriangles = [];
    let frameVolMm3 = 0;
    const style = config.frameStyle || 'none';
    const shape = config.outlineShape || 'rect';
    let borderW = 0;

    if (options.includeFrame && style !== 'none') {
        borderW = style === 'thin' ? 2.5 : (style === 'deep' ? 8.0 : 5.0);
        const borderH = style === 'deep' ? maxZ + 3.0 : maxZ + 1.0;
        const chamferW = style === 'bevel' ? 1.8 : 0;
        const chamferZ = style === 'bevel' ? 1.4 : 0;

        if (shape === 'rect') {
            const hw = w * 0.5, hh = h * 0.5;
            const ov = 0.25;
            const innerPts = [[-hw + ov, -hh + ov], [hw - ov, -hh + ov], [hw - ov, hh - ov], [-hw + ov, hh - ov]];
            const outerPts = [[-hw - borderW, -hh - borderW], [hw + borderW, -hh - borderW], [hw + borderW, hh + borderW], [-hw - borderW, hh + borderW]];
            frameTriangles = buildClosedAnnularPrismTris(innerPts, outerPts, 0, borderH, chamferW, chamferZ);
            frameVolMm3 = ((w + borderW * 2) * (h + borderW * 2) - Math.max(1, (w - ov * 2) * (h - ov * 2))) * borderH;
        } else {
            const { innerPts, outerPts } = sampleOutlineBoundaryContour(w, h, shape, borderW, 0.35, 112);
            frameTriangles = buildClosedAnnularPrismTris(innerPts, outerPts, 0, borderH, chamferW, chamferZ);
            let perim = 0;
            for (let i = 0; i < innerPts.length; i++) {
                const j = (i + 1) % innerPts.length;
                perim += Math.hypot(innerPts[j][0] - innerPts[i][0], innerPts[j][1] - innerPts[i][1]);
            }
            frameVolMm3 = perim * (borderW + 0.35) * borderH;
        }
    }

    let mountingTriangles = [];
    let mountVolMm3 = 0;
    const mount = (!options.tileCrop) ? (config.mounting || 'flat') : 'flat';

    if (mount === 'hole') {
        const topPt = sampleOutlineBoundaryPointAtAngle(w, h, shape, Math.PI * 0.5);
        const eyeletY = topPt[1] + borderW + 3.2;
        const outerR = 5.0;
        const innerR = 2.2;
        const loopH = Math.max(1.4, Math.min(maxZ, baseZ + 0.6));
        const segs = 32;
        const inPts = [], outPts = [];
        for (let i = 0; i < segs; i++) {
            const a = (i / segs) * Math.PI * 2;
            inPts.push([Math.cos(a) * innerR, eyeletY + Math.sin(a) * innerR]);
            outPts.push([Math.cos(a) * outerR, eyeletY + Math.sin(a) * outerR]);
        }
        mountingTriangles = buildClosedAnnularPrismTris(inPts, outPts, 0, loopH);
        mountVolMm3 = Math.PI * (outerR * outerR - innerR * innerR) * loopH;
    } else if (mount === 'stand') {
        if (options.previewMode) {
            const legTris = createBoxTris(-5, 5, -h * 0.5 + 2, -h * 0.5 + 14, -22, 0);
            mountingTriangles = legTris;
        } else {
            // Printable support-free flat-on-bed (Z=0..3.2mm) triangular A-frame easel kickstand placed alongside plaque
            const standX = w * 0.5 + borderW + 18;
            const outerPts = [
                [standX - 10, -22],
                [standX + 10, -22],
                [standX + 4, 22],
                [standX - 4, 22]
            ];
            const innerPts = [
                [standX - 5, -17],
                [standX + 5, -17],
                [standX + 1.5, 17],
                [standX - 1.5, 17]
            ];
            const standH = 3.2;
            mountingTriangles = buildClosedAnnularPrismTris(innerPts, outerPts, 0, standH);
            mountVolMm3 = 420 * standH;
        }
    }

    return {
        frameTriangles,
        mountingTriangles,
        combined: mountingTriangles.length ? [...frameTriangles, ...mountingTriangles] : frameTriangles,
        frameVolMm3,
        mountVolMm3
    };
}

function buildFrameMesh() {
    if (!scene || typeof THREE === 'undefined') return;
    if (frameMesh) {
        scene.remove(frameMesh);
        frameMesh.geometry.dispose();
        frameMesh.material.dispose();
        frameMesh = null;
    }

    if (config.topography && config.topography !== 'flat') return;
    if (config.frameStyle === 'none' && config.mounting === 'flat') return;

    const w = config.width;
    const h = config.height;
    const baseZ = config.baseThickness;
    const maxZ = config.maxRelief;
    const cad = buildFrameAndMountingTriangles(w, h, baseZ, maxZ, { includeFrame: true, previewMode: true });
    const tris = cad.combined;
    if (!tris || tris.length === 0) return;

    const combinedPos = new Float32Array(tris.length * 9);
    let offset = 0;
    for (let i = 0; i < tris.length; i++) {
        const t = tris[i];
        combinedPos[offset] = t[0][0]; combinedPos[offset + 1] = t[0][1]; combinedPos[offset + 2] = t[0][2];
        combinedPos[offset + 3] = t[1][0]; combinedPos[offset + 4] = t[1][1]; combinedPos[offset + 5] = t[1][2];
        combinedPos[offset + 6] = t[2][0]; combinedPos[offset + 7] = t[2][1]; combinedPos[offset + 8] = t[2][2];
        offset += 9;
    }

    const frameGeom = new THREE.BufferGeometry();
    frameGeom.setAttribute('position', new THREE.BufferAttribute(combinedPos, 3));
    frameGeom.computeVertexNormals();

    const frameMat = new THREE.MeshStandardMaterial({
        color: 0x111827,
        roughness: 0.5,
        metalness: 0.1
    });

    frameMesh = new THREE.Mesh(frameGeom, frameMat);
    scene.add(frameMesh);
}

// ==========================================
// 🎛️ DIMENSIONS, PRESETS & STATS
// ==========================================
function heightToLayerNumber(zMm) {
    const firstH = Math.max(0.08, config.firstLayerHeight || 0.20);
    const layerH = Math.max(0.04, config.layerHeight || 0.08);
    if (!Number.isFinite(zMm) || zMm <= firstH + 1e-6) return 1;
    return 1 + Math.max(0, Math.round((zMm - firstH) / layerH));
}

function getTotalLayerCount() {
    return heightToLayerNumber(config.maxRelief);
}

const PLA_DENSITY_G_CM3 = 1.24;
const FILAMENT_175_AREA_MM2 = Math.PI * 0.875 * 0.875; // ~2.40528 mm²

function computeVolumetricFilamentBreakdown() {
    const w = Math.max(20, config.width || 140);
    const h = Math.max(20, config.height || 140);
    const baseZ = Math.max(0.2, config.baseThickness || 0.8);
    const maxZ = Math.max(baseZ + 0.2, config.maxRelief || 2.4);
    const layerH = Math.max(0.04, config.layerHeight || 0.08);
    const nFil = Math.max(1, filaments.length);

    const sortedStarts = filaments.map((f, idx) => ({
        idx,
        startZ: idx === 0 ? 0.0 : (baseZ + Math.max(0, Math.min(1, f.startPct || 0)) * (maxZ - baseZ))
    }));
    const bandLow = sortedStarts.map(s => s.startZ);
    const bandHigh = sortedStarts.map((_, idx) => (idx < nFil - 1) ? sortedStarts[idx + 1].startZ : Infinity);
    const slotVolMm3 = new Float64Array(nFil);

    const cadVol = buildFrameAndMountingTriangles(w, h, baseZ, maxZ, { includeFrame: true, previewMode: false });
    const extraHwVol = (cadVol.frameVolMm3 || 0) + (cadVol.mountVolMm3 || 0);

    if (colorDataBuffer && processedCanvas && processedCanvas.width > 0 && processedCanvas.height > 0) {
        const cols = processedCanvas.width;
        const rows = processedCanvas.height;
        const stride = Math.max(1, Math.floor(Math.max(cols, rows) / 120));
        const sCols = Math.ceil(cols / stride);
        const sRows = Math.ceil(rows / stride);
        const cellAreaMm2 = (w * h) / Math.max(1, sCols * sRows);
        const [bgR, bgG, bgB] = computeBorderBackgroundRGB(colorDataBuffer, cols, rows);
        const parsedPalette = filaments.map(f => ({ rgb: hexToRgb(f.color) }));
        const isChromatic = (config.colorMode === 'chromatic');

        let activeCells = 0;
        for (let r = 0; r < rows; r += stride) {
            const ny = (r / Math.max(1, rows - 1)) * 2.0 - 1.0;
            const y = h * 0.5 - (r / Math.max(1, rows - 1)) * h;
            const vNorm = r / Math.max(1, rows - 1);
            for (let c = 0; c < cols; c += stride) {
                if (isPixelCutoutVoid(c, r, cols, rows, [bgR, bgG, bgB])) continue;
                activeCells++;
                const nx = (c / Math.max(1, cols - 1)) * 2.0 - 1.0;
                const x = -w * 0.5 + (c / Math.max(1, cols - 1)) * w;
                const uNorm = c / Math.max(1, cols - 1);
                const pIdx = r * cols + c;
                const idx4 = pIdx * 4;
                const rCol = colorDataBuffer[idx4];
                const gCol = colorDataBuffer[idx4 + 1];
                const bCol = colorDataBuffer[idx4 + 2];
                const lum = (0.2126 * rCol + 0.7152 * gCol + 0.0722 * bCol) / 255.0;

                let zVal = computeSculpturalBasReliefZ(lum, nx, ny, rCol, gCol, bCol, bgR, bgG, bgB, baseZ, maxZ);
                const uSlot = (filamentSlotBuffer && filamentSlotBuffer[pIdx] !== 255 && filamentSlotBuffer[pIdx] < nFil)
                    ? filamentSlotBuffer[pIdx]
                    : null;
                if (uSlot !== null && (!isChromatic || isDrawingTemplateActive)) {
                    zVal = Math.min(maxZ, bandLow[uSlot] + (uSlot > 0 ? 0.16 : 0.0));
                }
                if (customZDeltaBuffer && customZDeltaBuffer[pIdx] !== 0) {
                    zVal = Math.max(Math.max(0.24, baseZ * 0.55), Math.min(maxZ + 0.64, zVal + customZDeltaBuffer[pIdx]));
                }
                const qrS = sampleActiveQRStamp(uNorm, vNorm);
                if (qrS !== null) zVal = qrS ? maxZ : Math.max(baseZ, maxZ - Math.max(0.24, layerH * 3));
                const wvS = sampleActiveSoundwave(uNorm, vNorm);
                if (wvS !== null) zVal = (wvS === 1) ? maxZ : Math.max(baseZ, maxZ - Math.max(0.24, layerH * 3));

                const botZ = computeRearCavityDepthMm(x, y, zVal, w, h, baseZ);
                if (zVal <= botZ) continue;

                if (isChromatic) {
                    let topSlot = 0;
                    if (qrS !== null) topSlot = qrS ? 0 : (nFil - 1);
                    else if (wvS !== null) topSlot = (wvS === 1) ? (nFil - 1) : 0;
                    else if (uSlot !== null) topSlot = uSlot;
                    else {
                        let bestD = Infinity;
                        for (let k = 0; k < nFil; k++) {
                            const [fr, fg, fb] = parsedPalette[k].rgb;
                            const d = (rCol - fr) * (rCol - fr) + (gCol - fg) * (gCol - fg) + (bCol - fb) * (bCol - fb);
                            if (d < bestD) { bestD = d; topSlot = k; }
                        }
                    }
                    if (config.removeCanvasBg) {
                        slotVolMm3[topSlot] += cellAreaMm2 * (zVal - botZ);
                    } else {
                        const baseSpan = Math.max(0, Math.min(zVal, baseZ) - botZ);
                        const reliefSpan = Math.max(0, zVal - Math.max(botZ, baseZ));
                        slotVolMm3[0] += cellAreaMm2 * baseSpan;
                        slotVolMm3[topSlot] += cellAreaMm2 * reliefSpan;
                    }
                } else {
                    for (let k = 0; k < nFil; k++) {
                        const hi = (k === nFil - 1) ? zVal : Math.min(zVal, bandHigh[k]);
                        const lo = Math.max(botZ, k === 0 ? 0.0 : bandLow[k]);
                        if (hi > lo) slotVolMm3[k] += cellAreaMm2 * (hi - lo);
                    }
                }
            }
        }

        // Fallback only if 100% void canvas
        if (activeCells === 0) {
            slotVolMm3[0] = (w * h * baseZ);
        }
    } else {
        // Pre-load analytical fallback matching shape outline
        const avgZ = baseZ + (maxZ - baseZ) * 0.45;
        let shapeFactor = 1.0;
        if (config.outlineShape === 'circle' || config.outlineShape === 'oval') shapeFactor = Math.PI / 4;
        else if (config.outlineShape === 'hexagon') shapeFactor = 0.78;
        else if (config.outlineShape === 'octagon') shapeFactor = 0.83;
        else if (config.outlineShape === 'diamond' || config.outlineShape === 'triangle') shapeFactor = 0.50;
        else if (config.outlineShape === 'heart' || config.outlineShape === 'star') shapeFactor = 0.62;
        else if (config.outlineShape === 'arch') shapeFactor = 0.88;
        const estTotalMm3 = w * h * shapeFactor * avgZ;
        const reliefFrac = Math.max(0.2, (avgZ - baseZ) / avgZ);
        slotVolMm3[0] = estTotalMm3 * (1 - reliefFrac);
        for (let k = 0; k < nFil; k++) {
            const hi = (k === nFil - 1) ? 1.0 : Math.max(0, Math.min(1, filaments[k + 1].startPct));
            const lo = Math.max(0, Math.min(1, filaments[k].startPct));
            slotVolMm3[k] += estTotalMm3 * reliefFrac * Math.max(0.02, hi - lo);
        }
    }

    if (extraHwVol > 0) {
        slotVolMm3[0] += extraHwVol;
    }

    let totalVolMm3 = 0;
    for (let k = 0; k < nFil; k++) totalVolMm3 += slotVolMm3[k];

    const totalVolCm3 = totalVolMm3 / 1000.0;
    const totalWeightG = Math.max(0.5, Math.round(totalVolCm3 * PLA_DENSITY_G_CM3 * 10) / 10);
    const totalMeters = Math.max(0.1, Math.round((totalVolMm3 / FILAMENT_175_AREA_MM2 / 1000.0) * 100) / 100);
    const perSlot = filaments.map((fil, idx) => {
        const vMm3 = slotVolMm3[idx];
        const vCm3 = vMm3 / 1000.0;
        const grams = Math.round(vCm3 * PLA_DENSITY_G_CM3 * 10) / 10;
        const meters = Math.round((vMm3 / FILAMENT_175_AREA_MM2 / 1000.0) * 100) / 100;
        const startZVal = baseZ + fil.startPct * (maxZ - baseZ);
        return {
            volCm3: vCm3,
            grams,
            meters,
            sharePct: totalVolMm3 > 0 ? Math.round((vMm3 / totalVolMm3) * 1000) / 10 : 0,
            startZ: startZVal,
            startLayer: heightToLayerNumber(startZVal)
        };
    });

    return { totalVolCm3, totalWeightG, totalMeters, perSlot };
}

function computePrintMetrics() {
    const breakdown = computeVolumetricFilamentBreakdown();
    const volCm3 = breakdown.totalVolCm3;
    const weightG = breakdown.totalWeightG;
    const totalMeters = breakdown.totalMeters;
    const costUsd = Math.max(0.05, Math.round((weightG / 1000) * 22.0 * 100) / 100);
    const totalLayers = getTotalLayerCount();
    const printMin = Math.round(12 + (volCm3 * 2.2) + totalLayers * 1.8 + Math.max(0, filaments.length - 1) * 3);
    const hours = Math.floor(printMin / 60);
    const mins = printMin % 60;
    const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    return { volCm3, weightG, totalMeters, costUsd, totalLayers, printMin, timeStr, perSlot: breakdown.perSlot };
}

function updateDimensions(axis) {
    const wEl = document.getElementById('input-width');
    const hEl = document.getElementById('input-height');
    const zEl = document.getElementById('input-max-z');
    if (axis === 'width' && wEl) {
        const raw = parseFloat(wEl.value);
        config.width = Number.isFinite(raw) ? Math.max(20, Math.min(1200, raw)) : 140;
        if (config.width !== raw) wEl.value = config.width;
    }
    if (axis === 'height' && hEl) {
        const raw = parseFloat(hEl.value);
        config.height = Number.isFinite(raw) ? Math.max(20, Math.min(1200, raw)) : 140;
        if (config.height !== raw) hEl.value = config.height;
    }
    if (axis === 'z' && zEl) {
        const raw = parseFloat(zEl.value);
        const minAllowed = Math.max(0.6, (config.baseThickness || 0.8) + 0.2);
        config.maxRelief = Number.isFinite(raw) ? Math.max(minAllowed, Math.min(30, raw)) : 2.4;
        if (config.maxRelief !== raw) zEl.value = config.maxRelief;
    }
    renderFilamentStackUI();
    generate3DReliefMesh();
}

function updateLayerPreset() {
    const lhEl = document.getElementById('select-layer-height');
    const baseEl = document.getElementById('select-base-thickness');
    const zEl = document.getElementById('input-max-z');
    if (lhEl) {
        const lh = parseFloat(lhEl.value);
        config.layerHeight = Number.isFinite(lh) ? Math.max(0.04, Math.min(0.32, lh)) : 0.08;
    }
    if (baseEl) {
        const base = parseFloat(baseEl.value);
        config.baseThickness = Number.isFinite(base) ? Math.max(0.2, Math.min(20, base)) : 0.8;
    }
    if (config.maxRelief < config.baseThickness + 0.2) {
        config.maxRelief = Math.round((config.baseThickness + 0.4) * 100) / 100;
        if (zEl) zEl.value = config.maxRelief;
    }
    renderFilamentStackUI();
    generate3DReliefMesh();
}

function updateFrameOptions() {
    config.frameStyle = document.getElementById('select-frame-style').value;
    config.mounting = document.getElementById('select-mounting').value;
    const nfcChk = document.getElementById('chk-nfc-pocket');
    if (nfcChk) config.nfcPocket = nfcChk.checked;
    generate3DReliefMesh();
    updateSlicerTable();
}

function updateHUD() {
    const metrics = computePrintMetrics();
    const totalLayers = metrics.totalLayers;
    const badgeTotal = document.getElementById('badge-total-layers');
    if (badgeTotal) badgeTotal.innerText = `${totalLayers} ${currentLang === 'fr' ? 'Couches' : 'Layers'}`;
    const hwTags = [];
    if (config.nfcPocket) hwTags.push('NFC 26mm');
    if (config.mounting === 'keyhole') hwTags.push('Keyhole');
    else if (config.mounting === 'magnets_6') hwTags.push('4×Ø6 Mag');
    else if (config.mounting === 'magnets_8') hwTags.push('4×Ø8 Mag');
    else if (config.mounting === 'magnets_10') hwTags.push('4×Ø10 Mag');
    const hwTagLabel = hwTags.length ? ` [${hwTags.join(' • ')}]` : '';
    const hudDim = document.getElementById('hud-dimensions');
    if (hudDim) hudDim.innerText = `${currentLang === 'fr' ? 'Dimensions' : 'Size'}: ${config.width} × ${config.height} × ${config.maxRelief} mm${hwTagLabel}`;
    const hudSwaps = document.getElementById('hud-swaps');
    if (hudSwaps) hudSwaps.innerText = `${currentLang === 'fr' ? 'Filaments' : 'Filaments'}: ${filaments.length} ${currentLang === 'fr' ? 'Couleurs Actives' : 'Active Colors'}`;

    const hudWeight = document.getElementById('hud-weight');
    if (hudWeight) {
        hudWeight.innerText = `Filament: ~${metrics.weightG}g (${metrics.totalMeters}m) • ${metrics.timeStr}`;
    }

    const simSlider = document.getElementById('slider-slicer-sim');
    if (simSlider) {
        simSlider.max = totalLayers;
        if (!isSlicerSimulationActive) {
            simSlider.value = totalLayers;
            const badgeSim = document.getElementById('badge-slicer-layer');
            if (badgeSim) badgeSim.innerText = `${totalLayers} / ${totalLayers}`;
        }
    }
}

// ==========================================
// 🎬 LIVE 3D VIRTUAL SLICER SIMULATION
// ==========================================
function updateSlicerSimulation(layerNum) {
    isSlicerSimulationActive = true;
    currentSimLayer = parseInt(layerNum, 10) || 1;
    const totalLayers = getTotalLayerCount();
    const badgeSim = document.getElementById('badge-slicer-layer');
    if (badgeSim) badgeSim.innerText = `${currentSimLayer} / ${totalLayers}`;

    if (!clipPlane) return;
    if (!config.topography || config.topography === 'flat') {
        clipPlane.normal.set(0, 0, -1);
        const firstH = Math.max(0.08, config.firstLayerHeight || 0.20);
        const layerZ = currentSimLayer <= 1 ? firstH : firstH + (currentSimLayer - 1) * config.layerHeight;
        const cutZ = Math.min(config.maxRelief + 0.05, layerZ);
        clipPlane.constant = cutZ;
    } else {
        clipPlane.normal.set(0, -1, 0);
        const ratio = currentSimLayer / Math.max(1, totalLayers);
        clipPlane.constant = -config.height / 2 + ratio * (config.height + 2.0);
    }
}

function resetSlicerSimulation() {
    if (slicerAnimationTimer) {
        clearInterval(slicerAnimationTimer);
        slicerAnimationTimer = null;
        const icon = document.getElementById('icon-slicer-play');
        if (icon) icon.setAttribute('data-lucide', 'play');
        if (window.lucide && typeof window.lucide.createIcons === 'function') lucide.createIcons();
    }
    isSlicerSimulationActive = false;
    if (clipPlane) {
        clipPlane.normal.set(0, 0, -1);
        clipPlane.constant = 10000;
    }
    const totalLayers = getTotalLayerCount();
    const simSlider = document.getElementById('slider-slicer-sim');
    if (simSlider) simSlider.value = totalLayers;
    const badgeSim = document.getElementById('badge-slicer-layer');
    if (badgeSim) badgeSim.innerText = `${totalLayers} / ${totalLayers}`;
}

function toggleSlicerAnimation() {
    const icon = document.getElementById('icon-slicer-play');
    if (slicerAnimationTimer) {
        clearInterval(slicerAnimationTimer);
        slicerAnimationTimer = null;
        if (icon) icon.setAttribute('data-lucide', 'play');
        if (window.lucide) lucide.createIcons();
        return;
    }

    const totalLayers = getTotalLayerCount();
    currentSimLayer = 1;
    updateSlicerSimulation(currentSimLayer);
    document.getElementById('slider-slicer-sim').value = currentSimLayer;

    if (icon) icon.setAttribute('data-lucide', 'pause');
    if (window.lucide) lucide.createIcons();

    slicerAnimationTimer = setInterval(() => {
        currentSimLayer++;
        if (currentSimLayer > totalLayers) {
            clearInterval(slicerAnimationTimer);
            slicerAnimationTimer = null;
            if (icon) icon.setAttribute('data-lucide', 'play');
            if (window.lucide) lucide.createIcons();
            resetSlicerSimulation();
            return;
        }
        updateSlicerSimulation(currentSimLayer);
        document.getElementById('slider-slicer-sim').value = currentSimLayer;
    }, 80);
}

// ==========================================
// 🤖 AI COLOR PALETTE STUDIO & VARIATIONS
// ==========================================
function extractImageDominantColors(canvasOrImg, numClusters = 5) {
    if (!canvasOrImg) return { centers: [], isPortrait: false };
    const sampleSize = 120;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = sampleSize;
    offCanvas.height = sampleSize;
    const ctx = offCanvas.getContext('2d');
    ctx.drawImage(canvasOrImg, 0, 0, sampleSize, sampleSize);
    const data = ctx.getImageData(0, 0, sampleSize, sampleSize).data;

    const pixels = [];
    let skinPixelCount = 0;

    for (let i = 0; i < data.length; i += 16) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        pixels.push([r, g, b]);

        if (r > 95 && g > 40 && b > 20 && (Math.max(r,g,b) - Math.min(r,g,b) > 15) && Math.abs(r - g) > 15 && r > g && r > b) {
            skinPixelCount++;
        }
    }

    const isPortrait = (skinPixelCount / pixels.length) > 0.07;

    pixels.sort((a, b) => (0.2126*a[0] + 0.7152*a[1] + 0.0722*a[2]) - (0.2126*b[0] + 0.7152*b[1] + 0.0722*b[2]));
    const centers = [];
    for (let k = 0; k < numClusters; k++) {
        const idx = Math.min(pixels.length - 1, Math.floor((k + 0.5) * (pixels.length / numClusters)));
        centers.push([...pixels[idx]]);
    }

    for (let iter = 0; iter < 5; iter++) {
        const clusterSums = Array.from({ length: numClusters }, () => [0, 0, 0, 0]);
        for (let i = 0; i < pixels.length; i++) {
            const [pr, pg, pb] = pixels[i];
            let minDist = Infinity;
            let bestCluster = 0;
            for (let k = 0; k < numClusters; k++) {
                const [cr, cg, cb] = centers[k];
                const d = (pr - cr)**2 + (pg - cg)**2 + (pb - cb)**2;
                if (d < minDist) {
                    minDist = d;
                    bestCluster = k;
                }
            }
            clusterSums[bestCluster][0] += pr;
            clusterSums[bestCluster][1] += pg;
            clusterSums[bestCluster][2] += pb;
            clusterSums[bestCluster][3]++;
        }
        for (let k = 0; k < numClusters; k++) {
            if (clusterSums[k][3] > 0) {
                centers[k][0] = Math.round(clusterSums[k][0] / clusterSums[k][3]);
                centers[k][1] = Math.round(clusterSums[k][1] / clusterSums[k][3]);
                centers[k][2] = Math.round(clusterSums[k][2] / clusterSums[k][3]);
            }
        }
    }

    centers.sort((a, b) => (0.2126*a[0] + 0.7152*a[1] + 0.0722*a[2]) - (0.2126*b[0] + 0.7152*b[1] + 0.0722*b[2]));
    return { centers, isPortrait };
}

function generateAIPalettesFromImage() {
    const imgTarget = (processedCanvas && processedCanvas.width > 0) ? processedCanvas : sourceImage;
    const { centers, isPortrait } = extractImageDominantColors(imgTarget, 5);

    const autoHexColors = centers.length === 5 ? centers.map(c => rgbToHex(c[0], c[1], c[2])) : ['#0f0f11', '#2b3445', '#ca8a5e', '#f5d0b5', '#fafbfc'];

    let autoPalette = null;
    if (isPortrait) {
        autoPalette = {
            id: 'ai_auto_portrait',
            name_en: 'AI Smart Portrait & Skin (Auto)',
            name_fr: 'IA Portrait & Tons Chair (Auto)',
            filaments: [
                { name: "Obsidian Hair & Shadow", color: autoHexColors[0], startPct: 0.0, td: 0.5, targetFeature: "Hair, Deep Shadows & Eyebrows" },
                { name: "Suit & Shading Contour", color: autoHexColors[1], startPct: 0.22, td: 2.2, targetFeature: "Clothing Contours & Dark Features" },
                { name: "Natural Skin Midtone", color: autoHexColors[2], startPct: 0.46, td: 3.6, targetFeature: "Facial Skin & Lips" },
                { name: "Warm Skin Highlight", color: autoHexColors[3], startPct: 0.70, td: 4.8, targetFeature: "Forehead, Cheeks & Nose Bridge" },
                { name: "Crisp Shirt Pure White", color: autoHexColors[4], startPct: 0.88, td: 6.0, targetFeature: "Shirt Collar, Eyes & Catchlights" }
            ]
        };
    } else {
        autoPalette = {
            id: 'ai_auto_scenery',
            name_en: 'AI Dominant Photo Harmony (Auto)',
            name_fr: 'Harmonie IA Couleurs Photo (Auto)',
            filaments: [
                { name: "Deep Shadow Base", color: autoHexColors[0], startPct: 0.0, td: 0.5, targetFeature: "Background Shadows & Infill" },
                { name: "Deep Subject Midtone", color: autoHexColors[1], startPct: 0.24, td: 2.4, targetFeature: "Dark Subject Contours" },
                { name: "Dominant Vibrant Tone", color: autoHexColors[2], startPct: 0.48, td: 3.8, targetFeature: "Main Subject Features" },
                { name: "Light Accents & Glow", color: autoHexColors[3], startPct: 0.72, td: 4.8, targetFeature: "Highlights & Direct Light" },
                { name: "High Specular White", color: autoHexColors[4], startPct: 0.88, td: 6.0, targetFeature: "Bright Flares & Eye Catchlights" }
            ]
        };
    }

    aiPalettesList = [
        autoPalette,
        {
            id: 'portrait_studio',
            name_en: 'Fine-Art Portrait (Skin & Hair)',
            name_fr: 'Portrait Beaux-Arts (Chair & Cheveux)',
            filaments: [
                { name: "Obsidian Black (Hair/Shadows)", color: "#09090b", startPct: 0.0, td: 0.5, targetFeature: "Dark Hair, Eyelashes & Suit" },
                { name: "Deep Umber (Contour/Shading)", color: "#3e2723", startPct: 0.22, td: 2.2, targetFeature: "Facial Shadows & Eye Sockets" },
                { name: "Natural Peach Skin (Midtone)", color: "#d49b78", startPct: 0.46, td: 3.5, targetFeature: "Cheeks, Chin & Skin Volume" },
                { name: "Ivory Cream (Skin Highlight)", color: "#fbe8d3", startPct: 0.70, td: 4.8, targetFeature: "Forehead, Nose & Light Accents" },
                { name: "Pure Silk White (Collar/Eyes)", color: "#ffffff", startPct: 0.88, td: 6.0, targetFeature: "Shirt Collar, Sclera & Highlights" }
            ]
        },
        {
            id: 'mono_luxury',
            name_en: 'Monochrome Lithophane Fine-Art',
            name_fr: 'Monochrome Lithophanie Beaux-Arts',
            filaments: [
                { name: "Deep Black Noir", color: "#080808", startPct: 0.0, td: 0.5, targetFeature: "Pure Black Infill" },
                { name: "Slate Grey", color: "#475569", startPct: 0.26, td: 2.2, targetFeature: "Shadow Transitions" },
                { name: "Sterling Silver", color: "#94a3b8", startPct: 0.55, td: 3.8, targetFeature: "Sculptural Midtones" },
                { name: "Brilliant White", color: "#f8fafc", startPct: 0.82, td: 5.8, targetFeature: "High Speculars" }
            ]
        },
        {
            id: 'tiger_natural',
            name_en: 'Photorealistic Wildlife (Tiger & Amber)',
            name_fr: 'Faune Photoréaliste (Tigre & Ambre)',
            filaments: [
                { name: "Obsidian Black (Stripes/Pupils)", color: "#09090b", startPct: 0.0, td: 0.5, targetFeature: "Stripes, Pupils & Deep Shadows" },
                { name: "Jungle Green (Leaves/Background)", color: "#15803d", startPct: 0.25, td: 2.8, targetFeature: "Foliage, Leaves & Background" },
                { name: "Tiger Tawny Orange (Body Fur)", color: "#ea580c", startPct: 0.50, td: 3.5, targetFeature: "Tiger Body, Fur & Face" },
                { name: "Amber Gold (Eyes/Highlights)", color: "#eab308", startPct: 0.72, td: 4.5, targetFeature: "Tiger Eyes & Warm Highlights" },
                { name: "Pearl White (Chest/Whiskers)", color: "#f8fafc", startPct: 0.88, td: 6.0, targetFeature: "White Chest, Muzzle & Whiskers" }
            ]
        },
        {
            id: 'vintage_sepia',
            name_en: 'Vintage Antique Sepia',
            name_fr: 'Sépia Antique Vintage',
            filaments: [
                { name: "Dark Espresso", color: "#1c1007", startPct: 0.0, td: 0.6, targetFeature: "Deep Antique Shadows" },
                { name: "Rich Caramel", color: "#78350f", startPct: 0.26, td: 2.8, targetFeature: "Sepia Midtones" },
                { name: "Desert Sand", color: "#d97706", startPct: 0.55, td: 4.2, targetFeature: "Sunlit Accents" },
                { name: "Warm Parchment", color: "#fef3c7", startPct: 0.80, td: 6.2, targetFeature: "Antique Highlights" }
            ]
        },
        {
            id: 'arctic_frost',
            name_en: 'Nordic Glacial Arctic Frost',
            name_fr: 'Glace Polaire Arctique Nordique',
            filaments: [
                { name: "Midnight Navy", color: "#0f172a", startPct: 0.0, td: 0.5, targetFeature: "Deep Ocean Shadows" },
                { name: "Deep Cobalt", color: "#1d4ed8", startPct: 0.28, td: 2.4, targetFeature: "Cold Midtones" },
                { name: "Glacial Ice Blue", color: "#38bdf8", startPct: 0.58, td: 4.2, targetFeature: "Reflected Ice" },
                { name: "Polar Snow White", color: "#ffffff", startPct: 0.80, td: 6.0, targetFeature: "Crisp Snow" }
            ]
        },
        {
            id: 'cyberpunk_neon',
            name_en: 'Cyberpunk Neon Nocturne',
            name_fr: 'Cyber Néon Nocturne',
            filaments: [
                { name: "Obsidian Black", color: "#030712", startPct: 0.0, td: 0.5, targetFeature: "Deep Cyber Dark" },
                { name: "Electric Purple", color: "#7c3aed", startPct: 0.30, td: 2.2, targetFeature: "Synthwave Midtones" },
                { name: "Cyber Cyan", color: "#06b6d4", startPct: 0.60, td: 4.0, targetFeature: "Neon Glow" },
                { name: "Glow White", color: "#f8fafc", startPct: 0.82, td: 5.5, targetFeature: "Bright Flares" }
            ]
        }
    ];

    renderAIPalettesUI();
}

function renderAIPalettesUI() {
    const container = document.getElementById('ai-palette-container');
    if (!container) return;
    container.innerHTML = '';

    aiPalettesList.forEach((item, idx) => {
        const card = document.createElement('div');
        card.className = `ai-palette-card ${idx === 0 ? 'active' : ''}`;
        card.id = `ai-card-${item.id}`;
        card.onclick = () => applyAIPalette(idx);

        const stripColors = item.filaments.map(f => `<span class="ai-palette-color-block" style="background:${f.color};"></span>`).join('');
        const title = currentLang === 'fr' ? item.name_fr : item.name_en;

        card.innerHTML = `
            <div class="ai-palette-strip">
                ${stripColors}
            </div>
            <span class="ai-palette-title">${title}</span>
        `;
        container.appendChild(card);
    });
}

function applyAIPalette(idx) {
    const chosen = aiPalettesList[idx];
    if (!chosen) return;

    document.querySelectorAll('.ai-palette-card').forEach(c => c.classList.remove('active'));
    const activeCard = document.getElementById(`ai-card-${chosen.id}`);
    if (activeCard) activeCard.classList.add('active');

    filaments = JSON.parse(JSON.stringify(chosen.filaments));
    renderFilamentStackUI();
    updateFilamentSwatchesUI();
    generate3DReliefMesh();
    showToast(translations[currentLang].toastPaletteApplied);
}

function generateNewAIVariations() {
    // Generates dynamic randomized variations tuned to the current image
    if (aiPalettesList.length > 0) {
        // Shuffle saturation and warmth
        aiPalettesList.forEach((pal, i) => {
            if (i > 0) {
                pal.filaments.forEach(f => {
                    const rgb = hexToRgb(f.color);
                    const shift = (Math.random() - 0.5) * 20;
                    f.color = rgbToHex(
                        Math.max(5, Math.min(250, rgb[0] + shift)),
                        Math.max(5, Math.min(250, rgb[1] + shift)),
                        Math.max(5, Math.min(250, rgb[2] + shift))
                    );
                });
            }
        });
    }
    renderAIPalettesUI();
    showToast(translations[currentLang].toastPaletteGenerated);
}

// ==========================================
// 🧵 COMMERCIAL SPOOL MATCHER & LAYER EQUALIZER
// ==========================================
function findClosestRealSpool(hexColor) {
    const [r, g, b] = hexToRgb(hexColor);
    let minDist = Infinity;
    let bestIdx = 0;
    for (let i = 0; i < REAL_FILAMENT_CATALOG.length; i++) {
        const s = REAL_FILAMENT_CATALOG[i];
        const [sr, sg, sb] = hexToRgb(s.color);
        const d = colorDistSq(r, g, b, sr, sg, sb);
        if (d < minDist) {
            minDist = d;
            bestIdx = i;
        }
    }
    return { index: bestIdx, spool: REAL_FILAMENT_CATALOG[bestIdx] };
}

function matchToRealFilamentSpools() {
    filaments.forEach((fil) => {
        const match = findClosestRealSpool(fil.color);
        if (match && match.spool) {
            fil.name = match.spool.name;
            fil.color = match.spool.color;
            fil.td = match.spool.td;
        }
    });
    renderFilamentStackUI();
    updateFilamentSwatchesUI();
    generate3DReliefMesh();
    showToast(translations[currentLang].toastSpoolsMatched);
}

function applyCommercialSpoolToSlot(slotIdx, catalogIdxStr) {
    const cIdx = parseInt(catalogIdxStr);
    if (isNaN(cIdx) || cIdx < 0 || cIdx >= REAL_FILAMENT_CATALOG.length) return;
    const spool = REAL_FILAMENT_CATALOG[cIdx];
    filaments[slotIdx].name = spool.name;
    filaments[slotIdx].color = spool.color;
    filaments[slotIdx].td = spool.td;
    renderFilamentStackUI();
    updateFilamentSwatchesUI();
    generate3DReliefMesh();
}

function renderLayerEqualizerUI() {
    const bar = document.getElementById('layer-equalizer-bar');
    const summary = document.getElementById('layer-eq-summary');
    if (!bar) return;
    bar.innerHTML = '';

    if (summary) {
        summary.innerText = `${config.baseThickness.toFixed(2)} – ${config.maxRelief.toFixed(2)} mm`;
    }

    filaments.forEach((fil, idx) => {
        const startP = fil.startPct;
        const endP = (idx < filaments.length - 1) ? filaments[idx + 1].startPct : 1.0;
        const widthPct = Math.max(0, (endP - startP) * 100);

        const startH = config.baseThickness + startP * (config.maxRelief - config.baseThickness);
        const endH = config.baseThickness + endP * (config.maxRelief - config.baseThickness);
        const lStart = heightToLayerNumber(startH);
        const lEnd = Math.max(lStart, heightToLayerNumber(endH));

        const seg = document.createElement('div');
        seg.className = 'layer-eq-segment';
        seg.style.width = `${widthPct}%`;
        seg.style.backgroundColor = fil.color;
        const [r, g, b] = hexToRgb(fil.color);
        const lum = (0.299 * r + 0.587 * g + 0.114 * b);
        seg.style.color = lum > 155 ? '#09090b' : '#ffffff';
        seg.style.textShadow = lum > 155 ? 'none' : '0 1px 2px rgba(0,0,0,0.85)';
        seg.title = `${fil.name}: Layer #${lStart} – #${lEnd} (${startH.toFixed(2)}mm – ${endH.toFixed(2)}mm)`;
        if (widthPct >= 13) {
            seg.innerText = `L${lStart}-${lEnd}`;
        }
        bar.appendChild(seg);

        if (idx > 0) {
            const handle = document.createElement('div');
            handle.className = 'layer-eq-handle';
            handle.style.left = `${startP * 100}%`;
            handle.title = `${fil.name} (${Math.round(startP * 100)}%)`;
            handle.onmousedown = (e) => startEqualizerDrag(e, idx);
            handle.ontouchstart = (e) => startEqualizerDrag(e, idx);
            bar.appendChild(handle);
        }
    });
}

function startEqualizerDrag(e, handleIdx) {
    e.preventDefault();
    const bar = document.getElementById('layer-equalizer-bar');
    if (!bar || handleIdx <= 0 || handleIdx >= filaments.length) return;
    const rect = bar.getBoundingClientRect();

    function onMove(ev) {
        const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
        let pct = (clientX - rect.left) / rect.width;
        const minP = (handleIdx > 0) ? (filaments[handleIdx - 1].startPct + 0.04) : 0.04;
        const maxP = (handleIdx < filaments.length - 1) ? (filaments[handleIdx + 1].startPct - 0.04) : 0.96;
        pct = Math.max(minP, Math.min(maxP, pct));
        filaments[handleIdx].startPct = Math.round(pct * 100) / 100;
        renderLayerEqualizerUI();
        syncFilamentCardThresholdUI(handleIdx);
        requestMeshUpdate();
    }

    function onUp() {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('touchend', onUp);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onUp);
}

function syncFilamentCardThresholdUI(idx) {
    const container = document.getElementById('filament-stack-container');
    if (!container || !filaments[idx]) return;
    const card = container.children[idx];
    if (!card) return;
    const fil = filaments[idx];
    const pctInt = Math.round(fil.startPct * 100);
    const startZ = config.baseThickness + fil.startPct * (config.maxRelief - config.baseThickness);
    const layerNum = heightToLayerNumber(startZ);
    const slider = card.querySelector('.range-slider');
    if (slider && parseInt(slider.value, 10) !== pctInt) slider.value = pctInt;
    const pctSpan = card.querySelector('.filament-pct-val');
    if (pctSpan) pctSpan.innerText = `${pctInt}%`;
    const badge = card.querySelector('.filament-badge-layer');
    if (badge) badge.innerText = `#${layerNum} (${startZ.toFixed(2)}mm)`;
}

// ==========================================
// 🎯 AUTO-SOLVE FILAMENT STACK OPTIMIZER (ΔE + COLOR MATCH %)
// ==========================================
function rgbToLab(r, g, b) {
    const lin = (c) => {
        const v = c / 255.0;
        return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    const lr = lin(r), lg = lin(g), lb = lin(b);
    const x = (0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb) / 0.95047;
    const y = (0.2126729 * lr + 0.7151522 * lg + 0.0721750 * lb) / 1.00000;
    const z = (0.0193339 * lr + 0.1191920 * lg + 0.9503041 * lb) / 1.08883;
    const f = (t) => t > 0.008856 ? Math.cbrt(t) : (7.787 * t + 16.0 / 116.0);
    const fx = f(x), fy = f(y), fz = f(z);
    return [116.0 * fy - 16.0, 500.0 * (fx - fy), 200.0 * (fy - fz)];
}

function computeDeltaE76(r1, g1, b1, r2, g2, b2) {
    const lab1 = rgbToLab(r1, g1, b1);
    const lab2 = rgbToLab(r2, g2, b2);
    const dl = lab1[0] - lab2[0];
    const da = lab1[1] - lab2[1];
    const db = lab1[2] - lab2[2];
    return Math.sqrt(dl * dl + da * da + db * db);
}

function sampleTargetPixelsForOptimizer(maxSamples = 420) {
    const pixels = [];
    if (!colorDataBuffer || !processedCanvas || !processedCanvas.width || !processedCanvas.height) return pixels;
    const w = processedCanvas.width, h = processedCanvas.height;
    const step = Math.max(1, Math.floor(Math.sqrt((w * h) / maxSamples)));
    for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
            const p = (y * w + x) * 4;
            const r = colorDataBuffer[p], g = colorDataBuffer[p + 1], b = colorDataBuffer[p + 2];
            const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255.0;
            pixels.push({ r, g, b, lum });
        }
    }
    return pixels;
}

function computeStackColorMatchMetrics(customFilaments) {
    const stack = (customFilaments || filaments);
    const samples = sampleTargetPixelsForOptimizer(360);
    if (!samples.length || !stack.length) return { avgDeltaE: 0, matchPct: 100 };

    const parsed = stack.map((f, i) => ({
        idx: i,
        rgb: hexToRgb(f.color),
        startPct: f.startPct,
        td: f.td ?? 3.0
    }));
    const baseZ = config.baseThickness || 0.6;
    const maxZ = Math.max(baseZ + 0.4, config.maxRelief || 2.4);
    const blendStrength = (config.tdOpticalBlend !== undefined ? config.tdOpticalBlend : 65) / 100.0;

    let sumDE = 0;
    for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        const zVal = baseZ + s.lum * (maxZ - baseZ);
        const simRgb = computeBeerLambertTDColor(s.lum, zVal, baseZ, maxZ, parsed, blendStrength, i, 0, 0);
        sumDE += computeDeltaE76(s.r, s.g, s.b, simRgb[0], simRgb[1], simRgb[2]);
    }
    const avgDeltaE = sumDE / samples.length;
    const matchPct = Math.max(5.0, Math.min(99.9, 100.0 - avgDeltaE * 1.15));
    return { avgDeltaE, matchPct };
}

function updateColorMatchBadge() {
    const el = document.getElementById('badge-color-match');
    if (!el) return null;
    const m = computeStackColorMatchMetrics();
    el.innerText = `Match: ${m.matchPct.toFixed(1)}% (ΔE ${m.avgDeltaE.toFixed(1)})`;
    el.title = `Perceptual CIE ΔE Error: ${m.avgDeltaE.toFixed(2)}`;
    return m;
}

function autoSolveFilamentStack() {
    const samples = sampleTargetPixelsForOptimizer(480);
    if (!samples.length || filaments.length < 2) return null;

    const before = computeStackColorMatchMetrics(filaments);

    // 1. Order active filaments dark-to-light by CIELAB L* luminance (bottom -> top lighting physics)
    const sortedStack = filaments.map(f => {
        const [r, g, b] = hexToRgb(f.color);
        const [L] = rgbToLab(r, g, b);
        return { fil: { ...f }, lumScore: L };
    }).sort((a, b) => a.lumScore - b.lumScore).map(x => x.fil);

    // 2. Seed startPct cutoffs from sorted image luminance quantiles
    const sortedLums = samples.map(s => s.lum).sort((a, b) => a - b);
    sortedStack[0].startPct = 0.0;
    for (let k = 1; k < sortedStack.length; k++) {
        const qIdx = Math.min(sortedLums.length - 1, Math.floor((k / sortedStack.length) * sortedLums.length));
        const qLum = Math.max(0.06, Math.min(0.95, sortedLums[qIdx]));
        const minAllowed = sortedStack[k - 1].startPct + 0.05;
        const maxAllowed = 1.0 - (sortedStack.length - k) * 0.05;
        sortedStack[k].startPct = Math.round(Math.max(minAllowed, Math.min(maxAllowed, qLum)) * 100) / 100;
    }

    const evalCandidate = (candStack) => {
        const parsed = candStack.map((f, i) => ({ idx: i, rgb: hexToRgb(f.color), startPct: f.startPct, td: f.td ?? 3.0 }));
        const baseZ = config.baseThickness || 0.6;
        const maxZ = Math.max(baseZ + 0.4, config.maxRelief || 2.4);
        const blendStrength = (config.tdOpticalBlend !== undefined ? config.tdOpticalBlend : 65) / 100.0;
        let err = 0;
        for (let i = 0; i < samples.length; i++) {
            const s = samples[i];
            const sim = computeBeerLambertTDColor(s.lum, baseZ + s.lum * (maxZ - baseZ), baseZ, maxZ, parsed, blendStrength, i, 0, 0);
            err += computeDeltaE76(s.r, s.g, s.b, sim[0], sim[1], sim[2]);
        }
        return err / samples.length;
    };

    // 3. Coordinate-descent refinement over step sizes [0.06, 0.02]
    let bestErr = evalCandidate(sortedStack);
    [0.06, 0.02].forEach(step => {
        for (let pass = 0; pass < 3; pass++) {
            for (let k = 1; k < sortedStack.length; k++) {
                const orig = sortedStack[k].startPct;
                const lo = sortedStack[k - 1].startPct + 0.04;
                const hi = (k < sortedStack.length - 1 ? sortedStack[k + 1].startPct : 1.0) - 0.04;
                let bestP = orig;
                for (let delta = -step * 2; delta <= step * 2 + 1e-6; delta += step) {
                    const p = Math.round(Math.max(lo, Math.min(hi, orig + delta)) * 100) / 100;
                    sortedStack[k].startPct = p;
                    const e = evalCandidate(sortedStack);
                    if (e < bestErr) { bestErr = e; bestP = p; }
                }
                sortedStack[k].startPct = bestP;
            }
        }
    });

    // Accept only if improved (or keep dark-to-light sorted if equally good)
    const afterCandidate = computeStackColorMatchMetrics(sortedStack);
    if (afterCandidate.avgDeltaE <= before.avgDeltaE + 0.05) {
        filaments = sortedStack;
    }

    renderFilamentStackUI();
    updateFilamentSwatchesUI();
    generate3DReliefMesh();
    const after = updateColorMatchBadge() || computeStackColorMatchMetrics(filaments);
    showToast(`${translations[currentLang].toastAutoSolved}: ${after.matchPct.toFixed(1)}% (ΔE ${after.avgDeltaE.toFixed(1)})`);
    return { before, after };
}

function computeFourSlotAmsPlan(perSlotMetrics) {
    if (!filaments || filaments.length <= 4) return { active: false, swaps: [] };
    const swaps = [];
    for (let extraIdx = 4; extraIdx < filaments.length; extraIdx++) {
        const bayIdx = extraIdx - 4; // Reuse AMS Bay 1 (slot 0) for color #5, Bay 2 (slot 1) for color #6
        const replacedFil = filaments[bayIdx];
        const nextFil = filaments[extraIdx];
        const finishedByLayer = (perSlotMetrics[bayIdx + 1]?.startLayer || heightToLayerNumber(config.baseThickness + filaments[bayIdx + 1].startPct * (config.maxRelief - config.baseThickness)));
        const neededAtLayer = (perSlotMetrics[extraIdx]?.startLayer || heightToLayerNumber(config.baseThickness + nextFil.startPct * (config.maxRelief - config.baseThickness)));
        const windowStart = Math.max(2, finishedByLayer);
        const windowEnd = Math.max(windowStart, neededAtLayer - 1);
        swaps.push({
            amsBay: bayIdx + 1,
            fromSlot: bayIdx + 1,
            fromName: replacedFil.name,
            fromColor: replacedFil.color,
            toSlot: extraIdx + 1,
            toName: nextFil.name,
            toColor: nextFil.color,
            windowStartLayer: windowStart,
            windowEndLayer: windowEnd
        });
    }
    return { active: true, totalColors: filaments.length, swaps };
}

function syncAllControlsFromConfig() {
    const mapVal = {
        'input-width': config.width,
        'input-height': config.height,
        'input-max-z': config.maxRelief,
        'select-layer-height': config.layerHeight,
        'select-base-thickness': config.baseThickness,
        'select-topography': config.topography,
        'select-outline-shape': config.outlineShape,
        'select-frame-style': config.frameStyle,
        'select-mounting': config.mounting,
        'select-color-mode': config.colorMode,
        'select-bg-mode': config.bgMode,
        'select-filament-finish': config.filamentFinish,
        'select-engine-res': config.engineResolution,
        'slider-td-blend': config.tdOpticalBlend,
        'slider-dither': config.opticalDithering,
        'slider-sharpness': config.detailSharpness,
        'slider-pop': config.subjectPop,
        'slider-snap': config.colorSnap,
        'slider-brightness': config.brightness,
        'slider-contrast': config.contrast,
        'slider-smoothing': config.smoothing
    };
    Object.entries(mapVal).forEach(([id, v]) => {
        const el = document.getElementById(id);
        if (el && v !== undefined) el.value = String(v);
    });
    const mapChk = {
        'chk-remove-canvas-bg': !!config.removeCanvasBg,
        'chk-nfc-pocket': !!config.nfcPocket,
        'chk-bilateral-edge': !!config.bilateralEdgeLock,
        'chk-boost-finelines': !!config.boostFineLines,
        'chk-preserve-eyes': !!config.preserveEyes,
        'chk-layer-ridges': config.layerRidges !== false,
        'chk-export-quantize': config.exportQuantize !== false,
        'chk-export-frame': config.exportIncludeFrame !== false,
        'chk-export-adaptive': config.adaptiveMesh !== false
    };
    Object.entries(mapChk).forEach(([id, b]) => {
        const el = document.getElementById(id);
        if (el) el.checked = b;
    });
    if (typeof syncRemoveCanvasUI === 'function') syncRemoveCanvasUI();
    applyLightboxKelvinToScene();
}

// ==========================================
// 🎨 DYNAMIC FILAMENT STACK UI
// ==========================================
function renderFilamentStackUI() {
    const container = document.getElementById('filament-stack-container');
    if (!container) return;
    container.innerHTML = '';

    filaments.forEach((fil, idx) => {
        const card = document.createElement('div');
        card.className = 'filament-card';

        const startZVal = config.baseThickness + fil.startPct * (config.maxRelief - config.baseThickness);
        const startHeight = startZVal.toFixed(2);
        const layerNum = heightToLayerNumber(startZVal);
        const closestMatch = findClosestRealSpool(fil.color);

        const spoolOptionsHTML = REAL_FILAMENT_CATALOG.map((sp, spIdx) => {
            const isSel = (spIdx === closestMatch.index) ? 'selected' : '';
            return `<option value="${spIdx}" ${isSel}>🧵 ${sp.name} (TD ${sp.td}mm)</option>`;
        }).join('');

        card.innerHTML = `
            <div class="filament-color-preview" style="background-color:${fil.color};">
                <input type="color" class="filament-color-input" value="${fil.color}" onchange="changeFilamentColor(${idx}, this.value)">
            </div>
            <div class="filament-info">
                <div class="filament-name-row">
                    <span class="filament-title" title="${fil.name}">${fil.name}</span>
                    <div style="display:flex;align-items:center;gap:5px;">
                        <div class="filament-td-pill" title="Transmission Distance (mm)">
                            <span>TD:</span>
                            <input type="number" step="0.5" min="0.1" max="15.0" value="${fil.td ?? 3.0}" onchange="changeFilamentTD(${idx}, this.value)">
                        </div>
                        <span class="filament-badge-layer">#${layerNum} (${startHeight}mm)</span>
                        ${filaments.length > 2 && idx > 0 ? `<button type="button" class="btn-remove-filament" onclick="removeFilament(${idx})" title="Remove Filament">&times;</button>` : ''}
                    </div>
                </div>
                <div class="filament-slider-row">
                    <input type="range" class="range-slider" min="0" max="100" value="${Math.round(fil.startPct * 100)}" 
                        ${idx === 0 ? 'disabled style="opacity:0.4;"' : ''} 
                        oninput="changeFilamentThreshold(${idx}, this.value)">
                    <span class="filament-pct-val" style="font-size:0.75rem;color:var(--text-sub);min-width:30px;">${Math.round(fil.startPct * 100)}%</span>
                </div>
                <div class="spool-brand-row">
                    <select class="spool-select-mini" onchange="applyCommercialSpoolToSlot(${idx}, this.value)" title="Select Commercial Filament Spool (Bambu Lab, Polymaker, eSUN)">
                        ${spoolOptionsHTML}
                    </select>
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    const btnAdd = document.getElementById('btn-add-filament');
    if (btnAdd) {
        btnAdd.style.display = filaments.length >= 6 ? 'none' : 'flex';
    }
    renderLayerEqualizerUI();
    updateColorMatchBadge();
    if (typeof populateOutlineSlotDropdowns === 'function') populateOutlineSlotDropdowns();
}

function changeFilamentColor(idx, newColor) {
    filaments[idx].color = newColor;
    generate3DReliefMesh();
    renderFilamentStackUI();
    updateFilamentSwatchesUI();
}

function changeFilamentTD(idx, newTD) {
    const parsed = parseFloat(newTD);
    filaments[idx].td = Number.isFinite(parsed) ? Math.max(0.1, Math.min(15.0, parsed)) : 2.0;
    generate3DReliefMesh();
}

function changeFilamentThreshold(idx, newPct) {
    if (!filaments[idx] || idx <= 0) return;
    let pct = (parseFloat(newPct) || 0) / 100.0;
    const minP = idx > 0 ? (filaments[idx - 1].startPct + 0.02) : 0.0;
    const maxP = idx < filaments.length - 1 ? (filaments[idx + 1].startPct - 0.02) : 0.98;
    pct = Math.max(minP, Math.min(maxP, pct));
    filaments[idx].startPct = Math.round(pct * 100) / 100;
    syncFilamentCardThresholdUI(idx);
    renderLayerEqualizerUI();
    requestMeshUpdate();
}

function addFilament() {
    if (filaments.length >= 6) return;
    const newPct = Math.min(0.92, (filaments[filaments.length - 1].startPct + 0.08));
    filaments.push({
        id: Date.now(),
        name: currentLang === 'fr' ? `Couleur #${filaments.length + 1}` : `Color #${filaments.length + 1}`,
        color: "#e2e8f0",
        startPct: newPct,
        td: 4.5,
        targetFeature: "Accent Detail"
    });
    filaments.sort((a, b) => a.startPct - b.startPct);
    renderFilamentStackUI();
    updateFilamentSwatchesUI();
    generate3DReliefMesh();
    if (window.lucide && typeof window.lucide.createIcons === 'function') lucide.createIcons();
}

function removeFilament(idx) {
    if (filaments.length <= 2 || idx === 0) return;
    filaments.splice(idx, 1);
    if (activeFilamentSlot >= filaments.length) {
        activeFilamentSlot = filaments.length - 1;
    }
    renderFilamentStackUI();
    updateFilamentSwatchesUI();
    generate3DReliefMesh();
}

function assignEyedropperColor() {
    // Assigns current eyedropper color to active filament slot 3 (body/subject)
    if (filaments.length >= 3) {
        filaments[2].color = eyedropperColor;
    } else {
        filaments[filaments.length - 1].color = eyedropperColor;
    }
    renderFilamentStackUI();
    updateFilamentSwatchesUI();
    generate3DReliefMesh();
    showToast(translations[currentLang].toastColorAssigned);
}

// ==========================================
// 📋 SLICER PAUSE CHEAT SHEET & SCRIPTS
// ==========================================
function updateSlicerTable() {
    const tbody = document.getElementById('slicer-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const metrics = computePrintMetrics();
    const perSlot = metrics.perSlot || [];

    filaments.forEach((fil, idx) => {
        const slotStats = perSlot[idx] || {};
        const startZVal = slotStats.startZ !== undefined ? slotStats.startZ : (config.baseThickness + fil.startPct * (config.maxRelief - config.baseThickness));
        const startHeight = startZVal.toFixed(2);
        const startLayer = slotStats.startLayer || heightToLayerNumber(startZVal);
        const estWeight = slotStats.grams !== undefined ? slotStats.grams : 0;
        const estMeters = slotStats.meters !== undefined ? slotStats.meters.toFixed(2) : '0.00';
        const targetText = fil.targetFeature || (idx === 0 ? "Shadows/Infill" : `Color Zone #${idx+1}`);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>Slot #${idx + 1}</strong></td>
            <td><span class="color-dot" style="background:${fil.color};"></span> ${fil.name} <span style="font-size:0.68rem;color:var(--text-sub);">(TD ${fil.td ?? 3.0})</span></td>
            <td style="color:var(--text-sub);">${targetText}</td>
            <td><strong>${startHeight} mm (L${startLayer})</strong></td>
            <td>~${estWeight}g <span style="font-size:0.68rem;color:var(--text-sub);">(${estMeters}m)</span></td>
        `;
        tbody.appendChild(tr);
    });

    if (config.nfcPocket) {
        const nfcTr = document.createElement('tr');
        nfcTr.style.background = 'rgba(56, 189, 248, 0.1)';
        nfcTr.innerHTML = `
            <td><strong>📱 NFC</strong></td>
            <td colspan="2" style="color:var(--primary);font-weight:600;">${currentLang === 'fr' ? 'Cavité Tag NFC 26mm intégrée au dos (Coller le sticker NTAG215 après impression)' : '26mm Smart NFC Tag Cavity recessed on backside (Apply NTAG215 sticker after print)'}</td>
            <td><strong>0.00 – 0.48 mm</strong></td>
            <td>Ø 26mm</td>
        `;
        tbody.appendChild(nfcTr);
    }

    if (config.mounting === 'keyhole' || (config.mounting || '').startsWith('magnets_')) {
        const hwTr = document.createElement('tr');
        hwTr.style.background = 'rgba(168, 85, 247, 0.10)';
        const hwDesc = config.mounting === 'keyhole'
            ? (currentLang === 'fr' ? 'Encoche Trou de Serrure encastrée au dos' : 'Rear Recessed Keyhole Wall Mount Slot')
            : (currentLang === 'fr' ? `4× Cavités Aimants arrière (${config.mounting.replace('magnets_', 'Ø')}mm)` : `4× Rear Recessed Magnet Pockets (${config.mounting.replace('magnets_', 'Ø')}mm)`);
        hwTr.innerHTML = `
            <td><strong>🧲 CAD</strong></td>
            <td colspan="2" style="color:#c084fc;font-weight:600;">${hwDesc}</td>
            <td><strong>${currentLang === 'fr' ? 'Dos Plaque' : 'Back Face'}</strong></td>
            <td>${config.mounting === 'keyhole' ? 'Keyhole' : 'Press-Fit'}</td>
        `;
        tbody.appendChild(hwTr);
    }

    const amsBox = document.getElementById('slicer-ams-plan-box');
    const amsPlan = computeFourSlotAmsPlan(perSlot);
    if (amsBox) {
        if (amsPlan.active && amsPlan.swaps.length > 0) {
            amsBox.style.display = 'block';
            const title = currentLang === 'fr'
                ? `🔄 Plan Bambu 4-Slots AMS pour ${amsPlan.totalColors} Couleurs (Remplacement à la volée sans pause) :`
                : `🔄 4-Slot AMS Bridge Plan for ${amsPlan.totalColors} Colors (Mid-print spool swap without extra AMS):`;
            const lines = amsPlan.swaps.map(s => currentLang === 'fr'
                ? `• <strong>Baie AMS A${s.amsBay}</strong> (${s.fromName}) → retirez &amp; chargez <strong>Slot #${s.toSlot} (${s.toName})</strong> entre <strong>Couche #${s.windowStartLayer} et #${s.windowEndLayer}</strong>`
                : `• <strong>AMS Bay A${s.amsBay}</strong> (${s.fromName}) → swap spool to <strong>Slot #${s.toSlot} (${s.toName})</strong> safely between <strong>Layer #${s.windowStartLayer}–#${s.windowEndLayer}</strong>`
            );
            amsBox.innerHTML = `<strong style="display:block;margin-bottom:4px;color:#fbbf24;">${title}</strong>${lines.join('<br>')}`;
        } else {
            amsBox.style.display = 'none';
            amsBox.innerHTML = '';
        }
    }
}

function generateSlicerScriptText() {
    const firstH = (config.firstLayerHeight || 0.20).toFixed(2);
    const metrics = computePrintMetrics();
    const perSlot = metrics.perSlot || [];
    let txt = `; =======================================================\n`;
    txt += `; Studios-Pro 3D Filament Painting — Slicer Instructions\n`;
    txt += `; Model: ${config.width} x ${config.height} x ${config.maxRelief} mm | Topography: ${config.topography.toUpperCase()} | Shape: ${config.outlineShape.toUpperCase()}\n`;
    txt += `; Mode: ${config.colorMode.toUpperCase()} | Layer Height: ${config.layerHeight} mm | 1st Layer: ${firstH} mm | Base: ${config.baseThickness} mm\n`;
    txt += `; Volumetric Est.: ~${metrics.weightG}g PLA (${metrics.totalMeters}m / ${metrics.volCm3.toFixed(1)} cm3) | Time: ${metrics.timeStr}\n`;
    txt += `; =======================================================\n\n`;
    txt += `BAMBU STUDIO / ORCASLICER AMS COLOR ASSIGNMENT:\n`;

    filaments.forEach((fil, idx) => {
        const st = perSlot[idx] || {};
        const startZVal = st.startZ !== undefined ? st.startZ : (config.baseThickness + fil.startPct * (config.maxRelief - config.baseThickness));
        const startH = startZVal.toFixed(2);
        const layerNum = st.startLayer || heightToLayerNumber(startZVal);
        const usageStr = st.grams !== undefined ? ` | ~${st.grams}g (${st.meters.toFixed(2)}m)` : '';
        txt += `[AMS Slot #${idx + 1}] (${fil.color} | TD: ${fil.td ?? 3.0}mm | L#${layerNum} @ ${startH}mm${usageStr}): ${fil.name} — Target: ${fil.targetFeature || 'Relief Layer'}\n`;
    });

    txt += `\nPAUSE & M600 COMMANDS (FOR SINGLE-EXTRUDER PRINTERS):\n`;
    filaments.forEach((fil, idx) => {
        if (idx > 0) {
            const startZVal = config.baseThickness + fil.startPct * (config.maxRelief - config.baseThickness);
            const startH = startZVal.toFixed(2);
            const layerNum = heightToLayerNumber(startZVal);
            txt += `; At Layer #${layerNum} (Z=${startH}mm):\n`;
            txt += `M600 ; Pause & change filament to ${fil.name} (${fil.color})\n`;
        }
    });

    if (config.nfcPocket) {
        txt += `\nSMART NFC TAG CAVITY:\n`;
        txt += `; Backside includes a 26mm x 0.48mm circular recess for standard NTAG215 / NFC stickers.\n`;
    }
    if (config.mounting === 'keyhole') {
        txt += `\nREAR KEYHOLE SLOT:\n`;
        txt += `; Backside includes a recessed wall-hanging keyhole slot near upper center.\n`;
    } else if ((config.mounting || '').startsWith('magnets_')) {
        txt += `\nREAR MAGNET POCKETS:\n`;
        txt += `; Backside includes 4 symmetric recessed press-fit pockets for ${config.mounting.replace('magnets_', 'Ø')}mm magnets.\n`;
    }

    const amsPlan = computeFourSlotAmsPlan(perSlot);
    if (amsPlan.active && amsPlan.swaps.length > 0) {
        txt += `\n4-SLOT AMS (BAMBU A1..A4) ${amsPlan.totalColors}-COLOR REUSE SWAP PLAN:\n`;
        amsPlan.swaps.forEach(s => {
            txt += `; AMS Bay A${s.amsBay} (${s.fromName}) -> Reload with Slot #${s.toSlot}: ${s.toName} (${s.toColor}) during Layer #${s.windowStartLayer}..#${s.windowEndLayer}\n`;
        });
    }

    txt += `\nCRITICAL SLICER SETTINGS:\n`;
    txt += `1. Infill: 100% Rectilinear (CRUCIAL: Prevents light leakage and hollow artifacts)\n`;
    txt += `2. Layer Height: ${config.layerHeight} mm\n`;
    txt += `3. First Layer Height: ${firstH} mm\n`;
    txt += `4. Wall loops: 1 or 2\n`;
    return txt;
}

function downloadSlicerGcodeScript() {
    const txt = generateSlicerScriptText();
    const blob = new Blob([txt], { type: 'text/plain' });
    downloadFileDirect(blob, `StudiosPro_Slicer_Guide_${Date.now()}.txt`);
}

function copySlicerGcodeScript() {
    const txt = generateSlicerScriptText();
    navigator.clipboard.writeText(txt).then(() => {
        const btn = document.getElementById('txt-copy-gcode');
        if (btn) {
            btn.innerText = currentLang === 'fr' ? '✓ Copié !' : '✓ Copied!';
            setTimeout(() => btn.innerText = translations[currentLang].btnCopyGcode, 2000);
        }
        showToast(translations[currentLang].toastCopied);
    });
}

