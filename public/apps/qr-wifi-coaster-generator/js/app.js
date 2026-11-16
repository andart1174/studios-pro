// ==========================================
// 3D VIEWPORT SCENE, CONTRAST AUDITOR, UI CONTROLLERS & BOOTSTRAP
// ==========================================

let scene = null, camera = null, renderer = null, controls = null;
let grid = null, ground = null;
let baseMeshGroup = null, qrMeshGroup = null, textMeshGroup = null, badgeMeshGroup = null;

let baseColorHex = '#111827';
let qrColorHex = '#f8fafc';
let accentColorHex = '#38bdf8';

let toastTimeout = null;
let animationLoopStarted = false;
let currentMobileView = 'panel';

function init3D() {
    const container = document.getElementById('viewport-container');
    const canvas = document.getElementById('viewport-canvas');
    if (!container || !canvas) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070a10);

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 2000);
    camera.position.set(0, 135, 135);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        showToast('WebGL context interrupted — restoring...');
    }, false);
    canvas.addEventListener('webglcontextrestored', () => {
        if (typeof rebuild3DModel === 'function') rebuild3DModel();
    }, false);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;

    scene.add(new THREE.AmbientLight(0xffffff, 0.72));

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
    keyLight.position.set(80, 180, 100);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.42);
    fillLight.position.set(-100, 60, -80);
    scene.add(fillLight);

    ground = new THREE.Mesh(
        new THREE.PlaneGeometry(350, 350),
        new THREE.ShadowMaterial({ opacity: 0.35 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    scene.add(ground);

    grid = new THREE.GridHelper(220, 22, 0x38bdf8, 0x1e293b);
    grid.position.y = -0.1;
    scene.add(grid);

    window.addEventListener('resize', onWindowResize);

    if (!animationLoopStarted) {
        animationLoopStarted = true;
        animate();
    }
}

function onWindowResize() {
    const container = document.getElementById('viewport-container');
    if (!container || !camera || !renderer) return;
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
}

function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    if (renderer && scene && camera) renderer.render(scene, camera);
}

function resetCamera() {
    if (!camera || !controls) return;
    isFlipped180 = false;
    controls.reset();
    camera.position.set(0, 135, 135);
    controls.target.set(0, 0, 0);
    controls.update();
}

function flipCoaster180() {
    if (!camera || !controls) return;
    isFlipped180 = !isFlipped180;
    if (isFlipped180) camera.position.set(0, -135, 135);
    else camera.position.set(0, 135, 135);
    controls.target.set(0, 0, 0);
    controls.update();
}

function setPrintStyle(style) {
    printStyle = style || 'flush';
    ['flush', 'embossed', 'debossed'].forEach(s => {
        document.getElementById('style-' + s)?.classList.toggle('active', s === printStyle);
    });
    if (typeof rebuild3DModel === 'function') rebuild3DModel();
}

function toggleFaceDownMode(enabled) {
    isFaceDownMode = !!enabled;
    const grpLip = document.getElementById('group-slider-lip');
    if (grpLip) grpLip.style.opacity = isFaceDownMode ? '0.45' : '1';
    if (typeof rebuild3DModel === 'function') rebuild3DModel();
    if (isFaceDownMode) {
        showToast(currentLang === 'fr'
            ? "Mode Face-Down PEI activé : export retourné Z=0 pour fini lisse !"
            : "Face-Down PEI Mode active: flat Z=0 inlay & mirror flip on export!");
    }
}

function setShape(shape) {
    currentShape = shape || 'circle';
    ['circle', 'squircle', 'hexagon', 'octagon', 'shield', 'keychain', 'stand', 'caddy'].forEach(s => {
        document.getElementById('shape-' + s)?.classList.toggle('active', s === currentShape);
    });

    const wrapShield = document.getElementById('wrap-shield-invert');
    if (wrapShield) wrapShield.style.display = (currentShape === 'shield') ? 'block' : 'none';

    const wrapStand = document.getElementById('wrap-stand-angle');
    if (wrapStand) wrapStand.style.display = (currentShape === 'stand') ? 'block' : 'none';

    const wrapCaddy = document.getElementById('wrap-caddy-slots');
    if (wrapCaddy) wrapCaddy.style.display = (currentShape === 'caddy') ? 'block' : 'none';

    if (typeof updatePrintabilityBadge === 'function') updatePrintabilityBadge(0);
    if (typeof rebuild3DModel === 'function') rebuild3DModel();
}

function swapTextPositions() {
    const topEl = document.getElementById('input-top-text');
    const btmEl = document.getElementById('input-bottom-text');
    if (topEl && btmEl) {
        const tmp = topEl.value;
        topEl.value = btmEl.value;
        btmEl.value = tmp;
        if (typeof rebuild3DModel === 'function') rebuild3DModel();
    }
}

function setTextLayout(layout) {
    textLayoutStyle = layout || 'straight';
    document.getElementById('text-layout-straight')?.classList.toggle('active', textLayoutStyle === 'straight');
    document.getElementById('text-layout-curved')?.classList.toggle('active', textLayoutStyle === 'curved');
    if (typeof rebuild3DModel === 'function') rebuild3DModel();
}

function applyColorPreset(base, qr, accent) {
    const pBase = document.getElementById('picker-base-color');
    const pQr = document.getElementById('picker-qr-color');
    const pAcc = document.getElementById('picker-accent-color');
    if (pBase) pBase.value = base;
    if (pQr) pQr.value = qr;
    if (pAcc) pAcc.value = accent;
    updateColors();
}

function updateColors() {
    baseColorHex = document.getElementById('picker-base-color')?.value || baseColorHex;
    qrColorHex = document.getElementById('picker-qr-color')?.value || qrColorHex;
    accentColorHex = document.getElementById('picker-accent-color')?.value || accentColorHex;

    const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.innerText = v; };
    const setBg = (id, v) => { const el = document.getElementById(id); if (el) el.style.backgroundColor = v; };
    setTxt('val-base-color', baseColorHex.toUpperCase());
    setTxt('val-qr-color', qrColorHex.toUpperCase());
    setTxt('val-accent-color', accentColorHex.toUpperCase());
    setBg('swatch-base', baseColorHex);
    setBg('swatch-qr', qrColorHex);
    setBg('swatch-accent', accentColorHex);

    updateContrastBadge();

    if (baseMeshGroup) baseMeshGroup.traverse(c => { if (c.isMesh && c.material && c.material.color) c.material.color.set(baseColorHex); });
    if (qrMeshGroup) qrMeshGroup.traverse(c => { if (c.isMesh && c.material && c.material.color) c.material.color.set(qrColorHex); });
    if (textMeshGroup) textMeshGroup.traverse(c => { if (c.isMesh && c.material && c.material.color) c.material.color.set(accentColorHex); });
    if (badgeMeshGroup) badgeMeshGroup.traverse(c => { if (c.isMesh && c.material && c.material.color) c.material.color.set(accentColorHex); });
}

function getContrastRatio(hex1, hex2) {
    function getLuminance(hex) {
        const clean = hex.startsWith('#') ? hex.slice(1) : hex;
        const rgb = parseInt(clean, 16) || 0;
        const r = (rgb >> 16) & 255, g = (rgb >> 8) & 255, b = rgb & 255;
        const a = [r, g, b].map(v => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }
    const l1 = getLuminance(hex1), l2 = getLuminance(hex2);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function updateContrastBadge() {
    const badge = document.getElementById('badge-contrast');
    const text = document.getElementById('text-contrast');
    if (!badge || !text) return;

    const ratio = getContrastRatio(baseColorHex, qrColorHex);
    const ratioStr = ratio.toFixed(1) + ':1';

    if (ratio >= 5.0) {
        badge.className = 'contrast-badge contrast-good';
        text.innerText = currentLang === 'fr'
            ? `Contraste ${ratioStr} — Scan Optique 100% Fiable`
            : `Ratio ${ratioStr} — 100% Instant Scannable`;
    } else if (ratio >= 3.0) {
        badge.className = 'contrast-badge contrast-warn';
        text.innerText = currentLang === 'fr'
            ? `Contraste ${ratioStr} — Moyen (Éclairage direct requis)`
            : `Ratio ${ratioStr} — Moderate (Good lighting required)`;
    } else {
        badge.className = 'contrast-badge contrast-danger';
        text.innerText = currentLang === 'fr'
            ? `Attention : Contraste ${ratioStr} trop faible pour la caméra !`
            : `Warning: Contrast ${ratioStr} too low for camera scan!`;
    }
}

function showToast(text) {
    const toast = document.getElementById('toast');
    const txt = document.getElementById('toast-text');
    if (!toast || !txt) return;
    txt.innerText = text;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 3200);
}

function setMobileView(view) {
    currentMobileView = view;
    document.body.classList.toggle('mobile-view-canvas', view === 'canvas');
    document.body.classList.toggle('mobile-view-panel', view !== 'canvas');
    document.getElementById('tab-btn-canvas')?.classList.toggle('active', view === 'canvas');
    document.getElementById('tab-btn-panel')?.classList.toggle('active', view !== 'canvas');
    setTimeout(onWindowResize, 60);
}

window.addEventListener('DOMContentLoaded', () => {
    init3D();
    renderPresetForm();
    updateColors();
    updateQRData();

    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang');
    setLang((urlLang === 'en' || urlLang === 'fr') ? urlLang : currentLang);

    if (typeof initStudiosProBridge === 'function') initStudiosProBridge();
    refreshIcons();

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && typeof closeAllModals === 'function') closeAllModals();
    });
});
