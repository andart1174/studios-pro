// ==========================================
// 3D VIEWPORT SCENE, CONTRAST & POLARITY AUDITOR, LAYER SLICE, UI CONTROLLERS & BOOTSTRAP
// ==========================================

let scene = null, camera = null, renderer = null, controls = null;
let grid = null, ground = null;
let baseMeshGroup = null, quietZoneMeshGroup = null, qrMeshGroup = null, textMeshGroup = null, badgeMeshGroup = null;

let baseColorHex = '#111827';
let qrColorHex = '#111827';
let accentColorHex = '#38bdf8';
let quietZoneColorHex = '#ffffff';

let toastTimeout = null;
let rebuildTimer = null;
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
    renderer.localClippingEnabled = false;

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

    // Bottom light so Dual-Sided Side B & underside hardware pockets look crisp when flipped!
    const bottomLight = new THREE.DirectionalLight(0xffffff, 0.55);
    bottomLight.position.set(40, -140, 80);
    scene.add(bottomLight);

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

function scheduleRebuild3D(delayMs = 45) {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => {
        if (typeof rebuild3DModel === 'function') rebuild3DModel();
        if (typeof saveCoasterPrefs === 'function') saveCoasterPrefs();
    }, delayMs);
}

function resetCamera() {
    if (!camera || !controls) return;
    isFlipped180 = false;
    controls.reset();
    if (currentShape === 'stand' || currentShape === 'tent') {
        camera.position.set(25, 95, 165);
        controls.target.set(0, 42, 0);
    } else if (currentShape === 'caddy') {
        camera.position.set(85, 110, 145);
        controls.target.set(0, 18, 0);
    } else {
        camera.position.set(0, 135, 135);
        controls.target.set(0, 0, 0);
    }
    controls.update();
}

function focusCameraOnSide(side) {
    if (!camera || !controls) return;
    if (currentShape === 'tent') {
        if (side === 'B') {
            isFlipped180 = true;
            camera.position.set(-25, 95, -165);
            controls.target.set(0, 42, 0);
        } else {
            isFlipped180 = false;
            camera.position.set(25, 95, 165);
            controls.target.set(0, 42, 0);
        }
        controls.update();
        return;
    }

    if (side === 'B') {
        isFlipped180 = true;
        const flipHoriz = (currentShape === 'keychain' || currentShape === 'shield');
        camera.position.set(0, -135, flipHoriz ? 135 : -135);
    } else {
        isFlipped180 = false;
        camera.position.set(0, 135, 135);
    }
    controls.target.set(0, 0, 0);
    controls.update();
}

function flipCoaster180() {
    focusCameraOnSide(isFlipped180 ? 'A' : 'B');
}

// ==========================================
// PRINT STYLE, QUIET ZONE, SHAPE & TEXT CONTROLLERS
// ==========================================

function setPrintStyle(style, silent = false) {
    printStyle = style || 'flush';
    if (isDualSided && printStyle === 'embossed') {
        printStyle = 'flush';
        if (!silent) {
            showToast(currentLang === 'fr'
                ? 'Le mode Relief 3D est désactivé en Double-Face (utilisez Flush).'
                : 'Embossed 3D Relief cannot be used with Dual-Sided (using Flush).');
        }
    }
    ['flush', 'embossed', 'debossed'].forEach(s => {
        document.getElementById('style-' + s)?.classList.toggle('active', s === printStyle);
    });
    if (isFaceDownMode && printStyle !== 'flush') {
        isFaceDownMode = false;
        const chk = document.getElementById('chk-facedown-pei');
        if (chk) chk.checked = false;
    }
    syncIncompatibleControlsUI();
    scheduleRebuild3D(20);
}

function toggleDebossHollow(enabled) {
    debossHollow = !!enabled;
    scheduleRebuild3D(20);
}

function toggleFaceDownMode(enabled) {
    isFaceDownMode = !!enabled;
    if (isFaceDownMode) {
        printStyle = 'flush';
        ['flush', 'embossed', 'debossed'].forEach(s => {
            document.getElementById('style-' + s)?.classList.toggle('active', s === 'flush');
        });
        if (isDualSided) {
            showToast(currentLang === 'fr'
                ? 'Note : en Double-Face, seule la Face A touche le plateau PEI.'
                : 'Note: In Dual-Sided mode, only Side A rests flat on the PEI plate.');
        } else {
            showToast(currentLang === 'fr'
                ? "Mode Face-Down PEI activé : Z=0..0.6mm lisse & retourné à l'export !"
                : "Face-Down PEI Mode active: flat Z=0..0.6mm inlay & flipped on export!");
        }
    }
    syncIncompatibleControlsUI();
    scheduleRebuild3D(20);
}

function toggleWhiteQuietZone(enabled) {
    useWhiteQuietZone = !!enabled;
    // Smart auto-contrast: if enabling white quiet zone while QR is also light/white, switch QR to dark!
    if (useWhiteQuietZone && getHexLuminance(qrColorHex) > 0.55) {
        qrColorHex = '#111827';
        const pQr = document.getElementById('picker-qr-color');
        if (pQr) pQr.value = qrColorHex;
        updateColors(true);
    }
    syncIncompatibleControlsUI();
    updateContrastBadge();
    render2DPreview();
    scheduleRebuild3D(20);
}

function fixInvertedPolarityWithQuietZone() {
    const chk = document.getElementById('chk-white-quiet-zone');
    if (chk) chk.checked = true;
    quietZoneColorHex = '#ffffff';
    const pQz = document.getElementById('picker-quiet-color');
    if (pQz) pQz.value = '#ffffff';
    qrColorHex = '#111827';
    const pQr = document.getElementById('picker-qr-color');
    if (pQr) pQr.value = '#111827';
    useWhiteQuietZone = true;
    updateColors(true);
    syncIncompatibleControlsUI();
    scheduleRebuild3D(15);
    showToast(currentLang === 'fr'
        ? 'Plaque blanche Quiet-Zone + QR foncé activés (100% norme ISO) !'
        : 'White Quiet-Zone + Dark QR enabled (100% ISO scannable)!');
}

function updateShapeContextualControls() {
    const show = (id, cond) => { const el = document.getElementById(id); if (el) el.style.display = cond ? 'block' : 'none'; };
    show('wrap-shield-invert', currentShape === 'shield');
    show('wrap-stand-angle', currentShape === 'stand');
    show('wrap-caddy-slots', currentShape === 'caddy');
    show('wrap-caddy-brand', currentShape === 'caddy');
}

function setShape(shape) {
    const prevShape = currentShape;
    currentShape = shape || 'circle';
    if (['circle', 'squircle', 'hexagon', 'octagon'].includes(currentShape)) {
        lastCoasterShape = currentShape;
    }

    ['circle', 'squircle', 'hexagon', 'octagon', 'shield', 'keychain', 'stand', 'tent', 'magnet', 'caddy'].forEach(s => {
        document.getElementById('shape-' + s)?.classList.toggle('active', s === currentShape);
    });

    // Auto-enable Dual-Sided tabs UI visibility hint when Table Tent is selected
    if (currentShape === 'tent' && !isDualSided) {
        const dualCtrl = document.getElementById('dual-sided-controls');
        if (dualCtrl) dualCtrl.style.display = 'block';
    } else if (!isDualSided) {
        const dualCtrl = document.getElementById('dual-sided-controls');
        if (dualCtrl) dualCtrl.style.display = 'none';
    }

    // Fridge Magnet shape: ensure magnet pockets checkbox reflects auto-enabled magnets
    if (currentShape === 'magnet') {
        const chkMag = document.getElementById('chk-magnet-pockets');
        if (chkMag) chkMag.checked = true;
        const baseSlider = document.getElementById('slider-base-thick');
        if (baseSlider && parseFloat(baseSlider.value) < 3.4) {
            baseSlider.value = '3.6';
        }
    }

    updateShapeContextualControls();
    syncIncompatibleControlsUI();

    if (typeof updatePrintabilityBadge === 'function') updatePrintabilityBadge(lastClearedRatio);
    scheduleRebuild3D(15);

    if (prevShape !== currentShape && ['stand', 'tent', 'caddy'].includes(currentShape) || ['stand', 'tent', 'caddy'].includes(prevShape)) {
        setTimeout(resetCamera, 40);
    }
}

function onTopOrBottomTextInput(isBottom = false) {
    if (isBottom) userEditedBottomText = true;
    scheduleRebuild3D(60);
}

function swapTextPositions() {
    const topEl = document.getElementById('input-top-text');
    const btmEl = document.getElementById('input-bottom-text');
    if (topEl && btmEl) {
        const tmp = topEl.value;
        topEl.value = btmEl.value;
        btmEl.value = tmp;
        userEditedBottomText = true;
        scheduleRebuild3D(20);
    }
}

function setTextLayout(layout) {
    textLayoutStyle = layout || 'straight';
    document.getElementById('text-layout-straight')?.classList.toggle('active', textLayoutStyle === 'straight');
    document.getElementById('text-layout-curved')?.classList.toggle('active', textLayoutStyle === 'curved');
    scheduleRebuild3D(20);
}

function setNfcMode(mode) {
    nfcMode = (mode === 'sealed') ? 'sealed' : 'open';
    const baseSlider = document.getElementById('slider-base-thick');
    if (nfcMode === 'sealed' && baseSlider && parseFloat(baseSlider.value) < 3.4) {
        baseSlider.value = '3.6';
        showToast(currentLang === 'fr'
            ? 'Épaisseur ajustée à 3.6 mm pour sceller la puce NFC en interne.'
            : 'Base thickness adjusted to 3.6 mm to enclose the sealed NFC cavity.');
    }
    scheduleRebuild3D(20);
}

function syncIncompatibleControlsUI() {
    const setDim = (id, disabled) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.opacity = disabled ? '0.42' : '1';
        el.style.pointerEvents = disabled ? 'none' : 'auto';
    };

    const isCaddy = currentShape === 'caddy';
    const isStandOrTent = currentShape === 'stand' || currentShape === 'tent';
    const noLip = isFaceDownMode || printStyle === 'flush' || isStandOrTent || isCaddy || currentShape === 'keychain' || currentShape === 'magnet';
    const noUnderside = isStandOrTent || isCaddy || isDualSided;
    const canCurve = ['circle', 'octagon', 'hexagon'].includes(currentShape);

    setDim('group-slider-lip', noLip);
    setDim('group-slider-relief', isFaceDownMode || isCaddy);
    setDim('group-hardware-pockets', noUnderside);

    const hollowWrap = document.getElementById('wrap-deboss-hollow');
    if (hollowWrap) hollowWrap.style.display = (printStyle === 'debossed' && !isFaceDownMode) ? 'block' : 'none';

    const nfcModeWrap = document.getElementById('wrap-nfc-mode');
    const nfcChecked = !!document.getElementById('chk-nfc-pocket')?.checked;
    if (nfcModeWrap) nfcModeWrap.style.display = (nfcChecked && !noUnderside) ? 'block' : 'none';

    const qzColorCard = document.getElementById('card-quiet-color');
    if (qzColorCard) qzColorCard.style.display = useWhiteQuietZone ? 'flex' : 'none';

    const curvedBtn = document.getElementById('text-layout-curved');
    if (curvedBtn) {
        curvedBtn.style.opacity = canCurve ? '1' : '0.45';
        curvedBtn.title = canCurve
            ? ''
            : (currentLang === 'fr' ? 'Disponible pour Rond, Hexagone et Octogone' : 'Available on Circle, Hexagon & Octagon');
    }

    const embBtn = document.getElementById('style-embossed');
    if (embBtn) {
        embBtn.style.opacity = isDualSided ? '0.42' : '1';
    }
}

// ==========================================
// LAYER SLICE INSPECTOR (60 FPS CLIPPING PLANE)
// ==========================================

function onLayerSliceInput(val) {
    const num = parseFloat(val);
    const maxVal = parseFloat(document.getElementById('slider-layer-slice')?.max || '10');
    const lbl = document.getElementById('label-layer-slice');
    if (num >= maxVal - 0.05) {
        layerSliceEnabled = false;
        layerSliceHeightMm = maxVal + 10;
        if (lbl) lbl.innerText = `Full (${(lastModelMetrics.heightMm || maxVal).toFixed(1)} mm)`;
    } else {
        layerSliceEnabled = true;
        layerSliceHeightMm = Math.max(0.2, num);
        const layerNum = Math.max(1, Math.round(layerSliceHeightMm / 0.2));
        if (lbl) lbl.innerText = `Z = ${layerSliceHeightMm.toFixed(1)} mm (L.${layerNum})`;
    }
    applyLayerSliceToScene();
}

function resetLayerSlice() {
    const sl = document.getElementById('slider-layer-slice');
    if (sl) {
        sl.value = sl.max;
        onLayerSliceInput(sl.max);
    }
}

// ==========================================
// FILAMENT PALETTE, CONTRAST & POLARITY AUDITOR
// ==========================================

function applyColorPreset(base, qr, accent, quietZone = null) {
    const pBase = document.getElementById('picker-base-color');
    const pQr = document.getElementById('picker-qr-color');
    const pAcc = document.getElementById('picker-accent-color');
    const pQz = document.getElementById('picker-quiet-color');
    const chkQz = document.getElementById('chk-white-quiet-zone');

    if (pBase) pBase.value = base;
    if (pQr) pQr.value = qr;
    if (pAcc) pAcc.value = accent;

    if (quietZone !== null) {
        useWhiteQuietZone = !!quietZone;
        if (chkQz) chkQz.checked = useWhiteQuietZone;
        if (typeof quietZone === 'string' && pQz) {
            quietZoneColorHex = quietZone;
            pQz.value = quietZone;
        }
        syncIncompatibleControlsUI();
        updateColors(true);
        scheduleRebuild3D(20);
        return;
    }

    updateColors();
}

function updateColors(skipSave = false) {
    baseColorHex = document.getElementById('picker-base-color')?.value || baseColorHex;
    qrColorHex = document.getElementById('picker-qr-color')?.value || qrColorHex;
    accentColorHex = document.getElementById('picker-accent-color')?.value || accentColorHex;
    quietZoneColorHex = document.getElementById('picker-quiet-color')?.value || quietZoneColorHex;

    const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.innerText = v; };
    const setBg = (id, v) => { const el = document.getElementById(id); if (el) el.style.backgroundColor = v; };
    setTxt('val-base-color', baseColorHex.toUpperCase());
    setTxt('val-qr-color', qrColorHex.toUpperCase());
    setTxt('val-accent-color', accentColorHex.toUpperCase());
    setTxt('val-quiet-color', quietZoneColorHex.toUpperCase());
    setBg('swatch-base', baseColorHex);
    setBg('swatch-qr', qrColorHex);
    setBg('swatch-accent', accentColorHex);
    setBg('swatch-quiet', quietZoneColorHex);

    updateContrastBadge();

    // Update 3D materials cleanly while NEVER overwriting isPreviewOnly decals (fixes Bug #19!)
    const tintGroup = (grp, hex) => {
        if (!grp) return;
        grp.traverse(c => {
            if (c.userData && c.userData.isPreviewOnly) return;
            if (c.isMesh && c.material && c.material.color) c.material.color.set(hex);
        });
    };
    tintGroup(baseMeshGroup, baseColorHex);
    tintGroup(quietZoneMeshGroup, quietZoneColorHex);
    tintGroup(qrMeshGroup, qrColorHex);
    tintGroup(textMeshGroup, accentColorHex);
    tintGroup(badgeMeshGroup, accentColorHex);

    // Sync Live Optical Scan Test & jsQR with real filament colors immediately!
    if (typeof render2DPreview === 'function') render2DPreview();
    if (!skipSave && typeof saveCoasterPrefs === 'function') saveCoasterPrefs();
}

function getHexLuminance(hex) {
    const clean = String(hex || '#000000').startsWith('#') ? hex.slice(1) : String(hex || '000000');
    const rgb = parseInt(clean, 16) || 0;
    const r = (rgb >> 16) & 255, g = (rgb >> 8) & 255, b = rgb & 255;
    const a = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrastRatio(hex1, hex2) {
    const l1 = getHexLuminance(hex1), l2 = getHexLuminance(hex2);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function updateContrastBadge() {
    const badge = document.getElementById('badge-contrast');
    const text = document.getElementById('text-contrast');
    const fixBtn = document.getElementById('btn-fix-polarity');
    if (!badge || !text) return;

    const effectiveBgHex = useWhiteQuietZone ? quietZoneColorHex : baseColorHex;
    const bgLum = getHexLuminance(effectiveBgHex);
    const qrLum = getHexLuminance(qrColorHex);
    const ratio = (Math.max(bgLum, qrLum) + 0.05) / (Math.min(bgLum, qrLum) + 0.05);
    const ratioStr = ratio.toFixed(1) + ':1';
    const isInverted = qrLum > bgLum + 0.06;
    const isFr = currentLang === 'fr';

    if (fixBtn) fixBtn.style.display = (isInverted || ratio < 4.5) ? 'inline-flex' : 'none';

    if (ratio < 3.0) {
        badge.className = 'contrast-badge contrast-danger';
        text.innerText = isFr
            ? `Attention : Contraste ${ratioStr} trop faible pour la caméra !`
            : `Warning: Contrast ${ratioStr} too low for camera scan!`;
    } else if (isInverted) {
        badge.className = 'contrast-badge contrast-warn';
        text.innerText = isFr
            ? `QR Inversé (${ratioStr}, clair sur foncé) — Plaque Blanche conseillée !`
            : `Inverted QR (${ratioStr}, light on dark) — White Quiet-Zone recommended!`;
    } else if (ratio < 5.0) {
        badge.className = 'contrast-badge contrast-warn';
        text.innerText = isFr
            ? `Contraste ${ratioStr} — Moyen (Éclairage direct requis)`
            : `Ratio ${ratioStr} — Moderate (Good lighting required)`;
    } else {
        badge.className = 'contrast-badge contrast-good';
        text.innerText = isFr
            ? `Contraste ${ratioStr} (ISO Foncé/Clair) — Scan 100% Fiable`
            : `Ratio ${ratioStr} (ISO Dark-on-Light) — 100% Instant Scan`;
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

// ==========================================
// BOOTSTRAP & KEYBOARD SHORTCUTS
// ==========================================

window.addEventListener('DOMContentLoaded', () => {
    init3D();

    // Try restoring saved user state from localStorage; otherwise boot with ISO-compliant Dark + White Quiet-Zone default!
    const restored = (typeof loadCoasterPrefs === 'function') ? loadCoasterPrefs() : false;
    if (!restored) {
        useWhiteQuietZone = true;
        const chkQz = document.getElementById('chk-white-quiet-zone');
        if (chkQz) chkQz.checked = true;
        selectPreset('wifi', null, null, null, 'wifi', true);
        updateColors(true);
        syncIncompatibleControlsUI();
        rebuild3DModel();
        if (typeof captureCoasterStateSnapshot === 'function' && typeof pushUndoSnapshot === 'function') {
            pushUndoSnapshot(JSON.stringify(captureCoasterStateSnapshot(true)));
        }
    }

    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang');
    setLang((urlLang === 'en' || urlLang === 'fr') ? urlLang : currentLang, true);

    if (typeof initStudiosProBridge === 'function') initStudiosProBridge();
    refreshIcons();

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && typeof closeAllModals === 'function') {
            closeAllModals();
            return;
        }
        const tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            if (typeof undoCoaster === 'function') undoCoaster();
        } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
            e.preventDefault();
            if (typeof redoCoaster === 'function') redoCoaster();
        }
    });
});
