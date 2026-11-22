// ==========================================
// 🚀 THREE.JS 3D ENGINE, SHADERS, CAD MOUNTS & ΔE2000 SOLVER
// ==========================================

let _rafAnimId = null;
let _meshUpdateRafId = null;
let _is3DMeshDirty = false;
let _cachedMetricsFrameId = -1;
let _metricsGeneration = 0;
let _cachedPrintMetrics = null;

function requestMeshUpdate(forceImmediate = false) {
    _metricsGeneration++;
    if (!forceImmediate && centerViewMode === '2d') {
        _is3DMeshDirty = true;
        return;
    }
    if (forceImmediate) {
        if (_meshUpdateRafId) { cancelAnimationFrame(_meshUpdateRafId); _meshUpdateRafId = null; }
        _is3DMeshDirty = false;
        generate3DReliefMesh();
        return;
    }
    if (_meshUpdateRafId) return;
    _meshUpdateRafId = requestAnimationFrame(() => {
        _meshUpdateRafId = null;
        _is3DMeshDirty = false;
        generate3DReliefMesh();
    });
}

function flushPending3DMeshIfDirty() {
    if (_is3DMeshDirty) {
        _is3DMeshDirty = false;
        generate3DReliefMesh();
    }
}

function updateRakingLightPosition() {
    if (!keyStudioLight) return;
    const azDeg = config.rakingLightAngle !== undefined ? config.rakingLightAngle : 42;
    const elDeg = config.rakingLightElevation !== undefined ? config.rakingLightElevation : 38;
    const az = (azDeg * Math.PI) / 180;
    const el = (Math.max(8, Math.min(85, elDeg)) * Math.PI) / 180;
    const dist = 260;
    const xy = Math.cos(el) * dist;
    keyStudioLight.position.set(
        Math.cos(az) * xy,
        Math.sin(az) * xy,
        Math.sin(el) * dist
    );
}

function updateRakingLight() {
    const azEl = document.getElementById('slider-raking-angle');
    const elEl = document.getElementById('slider-raking-elev');
    if (azEl) config.rakingLightAngle = parseInt(azEl.value, 10) || 0;
    if (elEl) config.rakingLightElevation = parseInt(elEl.value, 10) || 38;
    const vAz = document.getElementById('val-raking-angle');
    const vEl = document.getElementById('val-raking-elev');
    if (vAz) vAz.innerText = config.rakingLightAngle + '°';
    if (vEl) vEl.innerText = config.rakingLightElevation + '°';
    updateRakingLightPosition();
}

function disposeSceneMeshes() {
    [reliefMesh, frameMesh, qr3DMesh].forEach(m => {
        if (!m) return;
        if (scene) scene.remove(m);
        if (m.geometry) m.geometry.dispose();
        if (m.material) {
            if (Array.isArray(m.material)) m.material.forEach(mat => { if (mat.map) mat.map.dispose(); mat.dispose(); });
            else { if (m.material.map) m.material.map.dispose(); m.material.dispose(); }
        }
    });
    reliefMesh = null;
    frameMesh = null;
    qr3DMesh = null;
}

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

    // Clean up prior WebGL resources if recovering from webglcontextrestored
    if (_rafAnimId) { cancelAnimationFrame(_rafAnimId); _rafAnimId = null; }
    disposeSceneMeshes();
    if (controls && typeof controls.dispose === 'function') controls.dispose();
    if (renderer && typeof renderer.dispose === 'function') renderer.dispose();
    studioLights.length = 0;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(isLightbox ? 0x020306 : 0x06090e);

    const cw = Math.max(1, container.clientWidth || window.innerWidth || 800);
    const ch = Math.max(1, container.clientHeight || window.innerHeight || 600);
    camera = new THREE.PerspectiveCamera(40, cw / ch, 0.5, 2000);
    camera.up.set(0, 1, 0);
    camera.position.set(0, -155, 225);

    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true, // Required for true transparent 3D Model-Only PNG & tight auto-crop!
        preserveDrawingBuffer: true,
        powerPreference: "high-performance",
        logarithmicDepthBuffer: true
    });
    renderer.setSize(cw, ch, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.localClippingEnabled = true;

    clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 10000);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxDistance = 800;
    controls.minDistance = 30;
    controls.target.set(0, 0, 1.2);
    controls.update();

    const ambient = new THREE.AmbientLight(0xffffff, 0.86);
    scene.add(ambient);
    studioLights.push(ambient);

    keyStudioLight = new THREE.DirectionalLight(0xffffff, 0.92);
    updateRakingLightPosition();
    scene.add(keyStudioLight);
    studioLights.push(keyStudioLight);

    fillStudioLight = new THREE.DirectionalLight(0x38bdf8, 0.34);
    fillStudioLight.position.set(-150, -100, 110);
    scene.add(fillStudioLight);
    studioLights.push(fillStudioLight);

    rimStudioLight = new THREE.DirectionalLight(0xffffff, 0.28);
    rimStudioLight.position.set(0, 160, 65);
    scene.add(rimStudioLight);
    studioLights.push(rimStudioLight);

    const rearLight = new THREE.DirectionalLight(0xffffff, 0.55);
    rearLight.position.set(0, -120, -220);
    scene.add(rearLight);
    studioLights.push(rearLight);

    backlightLight = new THREE.PointLight(0xffecd2, 0, 320);
    backlightLight.position.set(0, 0, -35);
    scene.add(backlightLight);

    // Attach canvas DOM listeners ONCE (prevents leaks on webglcontextrestored!)
    if (!canvas._spListenersAttached) {
        canvas._spListenersAttached = true;

        canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            if (_rafAnimId) { cancelAnimationFrame(_rafAnimId); _rafAnimId = null; }
            console.warn('WebGL context lost, awaiting restore...');
        }, false);

        canvas.addEventListener('webglcontextrestored', () => {
            init3D();
            generate3DReliefMesh();
        }, false);

        let vpDownX = 0, vpDownY = 0, vpDownBtn = -1;
        canvas.addEventListener('pointerdown', (e) => {
            vpDownX = e.clientX;
            vpDownY = e.clientY;
            vpDownBtn = e.button;
        });

        canvas.addEventListener('pointerup', (e) => {
            if (vpDownBtn !== 0 || e.button !== 0) return;
            if (Math.hypot(e.clientX - vpDownX, e.clientY - vpDownY) > 5) return;
            if (!reliefMesh || !processedCanvas.width || !colorDataBuffer) return;
            // Only raycast when an interactive inspection/recolor/eyedropper action is needed
            const needRaycast = is3DRecolorMode || e.altKey || isDeltaEHeatmap || true;
            if (!needRaycast) return;

            const rect = canvas.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return;
            const mouse = new THREE.Vector2(
                ((e.clientX - rect.left) / rect.width) * 2 - 1,
                -((e.clientY - rect.top) / rect.height) * 2 + 1
            );
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObject(reliefMesh);
            // Filter out intersections clipped away by the live slicer plane
            const validHit = intersects.find(hit => !clipPlane || clipPlane.distanceToPoint(hit.point) >= -0.02);
            if (!validHit || !validHit.uv) return;

            const uv = validHit.uv;
            const px = Math.max(0, Math.min(processedCanvas.width - 1, Math.round(uv.x * (processedCanvas.width - 1))));
            const py = Math.max(0, Math.min(processedCanvas.height - 1, Math.round((1.0 - uv.y) * (processedCanvas.height - 1))));
            const idx = (py * processedCanvas.width + px) * 4;
            const r = colorDataBuffer[idx], g = colorDataBuffer[idx + 1], b = colorDataBuffer[idx + 2];
            const hex = rgbToHex(r, g, b).toUpperCase();
            eyedropperColor = hex;

            const prevBox = document.getElementById('eyedropper-preview-color');
            const prevLbl = document.getElementById('eyedropper-hex-label');
            if (prevBox) prevBox.style.background = hex;
            if (prevLbl) prevLbl.innerText = hex;

            // Live ΔE2000 Gamut Advisor when ΔE Heatmap is active!
            if (isDeltaEHeatmap) {
                const diag = diagnosePixelDeltaE(px, py);
                if (diag) showToast(diag.message);
                return;
            }

            if (is3DRecolorMode || e.altKey) {
                if (typeof pushHistoryState === 'function') pushHistoryState();
                const globalChk = document.getElementById('chk-recolor-global');
                const isGlobal = globalChk ? globalChk.checked : false;
                if (typeof smartRecolorZone === 'function') {
                    smartRecolorZone(px, py, activeFilamentSlot, editorFillTolerance, isGlobal);
                }
                if (typeof syncProcessedCanvasFromBuffer === 'function') syncProcessedCanvasFromBuffer();
                if (typeof render2DEditorPreview === 'function') render2DEditorPreview();
                generate3DReliefMesh();
                showToast(translations[currentLang]?.toastZoneRecolored || 'Zone recolored!');
            }
        });
    }

    if (!window._spResizeAttached) {
        window._spResizeAttached = true;
        window.addEventListener('resize', onWindowResize, false);
    }

    applyLightboxKelvinToScene();
    animate();
}

function onWindowResize() {
    const container = document.getElementById('viewport-container');
    if (!container || !renderer || !camera) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (cw <= 0 || ch <= 0) return;
    camera.aspect = cw / ch;
    camera.updateProjectionMatrix();
    renderer.setSize(cw, ch, false);
}

function animate() {
    _rafAnimId = requestAnimationFrame(animate);
    // Pause GPU rendering when hidden behind 2D Editor to save battery & CPU
    if (centerViewMode === '2d') return;
    if (controls) controls.update();
    if (renderer && scene && camera) renderer.render(scene, camera);
}

function resetCamera(mode) {
    if (!controls || !camera) return;
    camera.up.set(0, 1, 0);
    if (mode === 'front') {
        camera.position.set(0, 0, 265);
    } else if (config.topography && config.topography !== 'flat') {
        camera.position.set(45, 50, 250);
    } else {
        // Stable Y-up isometric tilt (zero OrbitControls up-vector flip glitches!)
        camera.position.set(0, -155, 225);
    }
    controls.target.set(0, 0, 1.2);
    camera.lookAt(0, 0, 1.2);
    controls.update();
}

// ==========================================
// 🔬 DIAGNOSTIC OVERLAYS, PBR FINISHES & REAL LITHOPHANE BACKLIGHT
// ==========================================

function applyActivePBRFinishToMaterial(mat) {
    if (!mat) return;
    if (config.ironingSimulation) {
        mat.roughness = 0.14;
        mat.metalness = 0.08;
        return;
    }
    if (config.filamentFinish === 'matte') { mat.roughness = 0.88; mat.metalness = 0.02; }
    else if (config.filamentFinish === 'silk') { mat.roughness = 0.20; mat.metalness = 0.42; }
    else if (config.filamentFinish === 'translucent') { mat.roughness = 0.34; mat.metalness = 0.04; }
    else { mat.roughness = 0.48; mat.metalness = 0.06; }
}

function clearDiagnosticModes(exceptMode = null) {
    if (exceptMode !== 'colormap') {
        isColorMapMode = false;
        const b = document.getElementById('btn-colormap');
        if (b) b.classList.remove('active');
    }
    if (exceptMode !== 'nozzle') {
        isNozzleInspectMode = false;
        ['btn-nozzle-check', 'btn-nozzle-check-sec2', 'btn-top-nozzle-check'].forEach(id => {
            const el = document.getElementById(id); if (el) el.classList.remove('active');
        });
    }
    if (exceptMode !== 'overhang') {
        isOverhangWarning = false;
        config.overhangWarning = false;
        const b = document.getElementById('btn-overhang-warn');
        if (b) b.classList.remove('active');
    }
    if (exceptMode !== 'zebra') {
        isZebraExposure = false;
        config.zebraExposure = false;
        const b = document.getElementById('btn-zebra-warn');
        if (b) b.classList.remove('active');
    }
    if (exceptMode !== 'deltae') {
        isDeltaEHeatmap = false;
        config.deltaEHeatmap = false;
        const b = document.getElementById('btn-deltae-heatmap');
        if (b) b.classList.remove('active');
    }
}

function toggleWireframe() {
    isWireframe = !isWireframe;
    if (reliefMesh && reliefMesh.material) reliefMesh.material.wireframe = isWireframe;
    if (frameMesh && frameMesh.material) frameMesh.material.wireframe = isWireframe;
    if (qr3DMesh && qr3DMesh.material) qr3DMesh.material.wireframe = isWireframe;
    const btn = document.getElementById('btn-wireframe');
    if (btn) btn.classList.toggle('active', isWireframe);
}

const KELVIN_HEX_MAP = { 2700: 0xffd1a3, 4000: 0xfff4e0, 6500: 0xdbeafe };

function applyLightboxKelvinToScene() {
    const k = config.lightboxKelvin || 4000;
    const hex = KELVIN_HEX_MAP[k] || 0xfff4e0;
    if (backlightLight) {
        backlightLight.color.setHex(hex);
        const isCyl = config.topography === 'cylinder' || config.topography === 'half_cyl';
        backlightLight.position.set(0, 0, isCyl ? 0 : -35);
    }
    [2700, 4000, 6500].forEach(kv => {
        const b = document.getElementById(`btn-kelvin-${kv}`);
        if (b) b.classList.toggle('active', kv === k);
    });
}

function setLightboxKelvin(kelvin) {
    config.lightboxKelvin = parseInt(kelvin, 10) || 4000;
    applyLightboxKelvinToScene();
    if (isLightbox) generate3DReliefMesh();
    showToast(`💡 ${currentLang === 'fr' ? 'Rétroéclairage' : 'Backlight'}: ${config.lightboxKelvin}K`);
}

function toggleLightboxMode() {
    isLightbox = !isLightbox;
    const btn = document.getElementById('btn-lightbox');
    if (btn) btn.classList.toggle('active', isLightbox);
    const kBar = document.getElementById('lightbox-kelvin-bar');
    if (kBar) kBar.style.display = isLightbox ? 'flex' : 'none';

    if (scene) {
        scene.background = new THREE.Color(isLightbox ? 0x020306 : 0x06090e);
    }
    if (studioLights.length >= 5) {
        if (isLightbox) {
            studioLights.forEach((l, i) => l.intensity = (i === 0 ? 0.85 : 0.14));
        } else {
            const orig = [0.86, 0.92, 0.34, 0.28, 0.55];
            studioLights.forEach((l, i) => { if (orig[i] !== undefined) l.intensity = orig[i]; });
        }
    }
    if (backlightLight) {
        backlightLight.intensity = isLightbox ? 2.4 : 0;
        applyLightboxKelvinToScene();
    }

    // Regenerate relief mesh with TRUE transmissive Beer-Lambert backlit vertex shading!
    generate3DReliefMesh();
    showToast(isLightbox
        ? (currentLang === 'fr' ? `💡 Mode Lithophanie Rétroéclairée activé (${config.lightboxKelvin}K)` : `💡 Real Backlit Lithophane Mode ON (${config.lightboxKelvin}K)`)
        : (currentLang === 'fr' ? '☀️ Éclairage Studio normal restauré' : '☀️ Normal Studio Lighting Restored'));
}

function toggleColorMapMode() {
    const next = !isColorMapMode;
    clearDiagnosticModes(next ? 'colormap' : null);
    isColorMapMode = next;
    const btn = document.getElementById('btn-colormap');
    if (btn) btn.classList.toggle('active', isColorMapMode);
    generate3DReliefMesh();
    showToast(isColorMapMode ? (translations[currentLang]?.toastColorMapOn || 'Color Map ON') : (translations[currentLang]?.toastColorMapOff || 'Color Map OFF'));
}

function toggle3DRecolorMode() {
    is3DRecolorMode = !is3DRecolorMode;
    const btn = document.getElementById('btn-3d-recolor');
    if (btn) btn.classList.toggle('active', is3DRecolorMode);
    const canvas = document.getElementById('viewport-canvas');
    if (canvas) canvas.style.cursor = is3DRecolorMode ? 'crosshair' : 'grab';
    showToast(is3DRecolorMode ? (translations[currentLang]?.toast3DRecolorOn || 'Click 3D model to recolor') : (translations[currentLang]?.toast3DRecolorOff || '3D Recolor OFF'));
}

function toggleNozzleInspector() {
    const next = !isNozzleInspectMode;
    clearDiagnosticModes(next ? 'nozzle' : null);
    isNozzleInspectMode = next;
    ['btn-nozzle-check', 'btn-nozzle-check-sec2', 'btn-top-nozzle-check'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('active', isNozzleInspectMode);
    });
    generate3DReliefMesh();
    showToast(isNozzleInspectMode ? (translations[currentLang]?.toastNozzleOn || 'Nozzle Inspector ON') : (translations[currentLang]?.toastNozzleOff || 'Nozzle Inspector OFF'));
}

function toggleOverhangWarning() {
    const next = !isOverhangWarning;
    clearDiagnosticModes(next ? 'overhang' : null);
    isOverhangWarning = next;
    config.overhangWarning = next;
    const btn = document.getElementById('btn-overhang-warn');
    if (btn) btn.classList.toggle('active', isOverhangWarning);
    generate3DReliefMesh();
    showToast(isOverhangWarning
        ? (currentLang === 'fr' ? '⚠️ Preflight Imprimabilité actif (ponts, porte-à-faux & pics)' : '⚠️ Printability Preflight ON (bridges, overhangs & spires)')
        : (currentLang === 'fr' ? 'Preflight Imprimabilité désactivé' : 'Printability Preflight OFF'));
}

function toggleZebraExposure() {
    const next = !isZebraExposure;
    clearDiagnosticModes(next ? 'zebra' : null);
    isZebraExposure = next;
    config.zebraExposure = next;
    const btn = document.getElementById('btn-zebra-warn');
    if (btn) btn.classList.toggle('active', isZebraExposure);
    generate3DReliefMesh();
    showToast(isZebraExposure
        ? (currentLang === 'fr' ? '🦓 Zebra Relief actif (Magenta = plafond Z, Cyan = base écrasée)' : '🦓 Relief Zebra ON (Magenta = peak clip, Cyan = base crush)')
        : (currentLang === 'fr' ? 'Zebra Relief désactivé' : 'Relief Zebra OFF'));
}

function toggleDeltaEHeatmap() {
    const next = !isDeltaEHeatmap;
    clearDiagnosticModes(next ? 'deltae' : null);
    isDeltaEHeatmap = next;
    config.deltaEHeatmap = next;
    const btn = document.getElementById('btn-deltae-heatmap');
    if (btn) btn.classList.toggle('active', isDeltaEHeatmap);
    generate3DReliefMesh();
    if (isDeltaEHeatmap) {
        showToast(currentLang === 'fr'
            ? `🎯 Carte ΔE2000 active (Moy. ΔE ${lastDeltaEStats.avgDeltaE.toFixed(1)}). Cliquez une zone rouge pour diagnostic !`
            : `🎯 ΔE2000 Fidelity Map ON (Avg ΔE ${lastDeltaEStats.avgDeltaE.toFixed(1)}). Click any red zone for spool advice!`);
    } else {
        showToast(currentLang === 'fr' ? 'Carte ΔE2000 désactivée' : 'ΔE2000 Fidelity Map OFF');
    }
}

function diagnosePixelDeltaE(px, py) {
    if (!colorDataBuffer || !processedCanvas.width) return null;
    const w = processedCanvas.width, h = processedCanvas.height;
    const pIdx = py * w + px;
    const i4 = pIdx * 4;
    const r = colorDataBuffer[i4], g = colorDataBuffer[i4 + 1], b = colorDataBuffer[i4 + 2];
    const srcLab = rgbToLab(r, g, b);
    const lum = heightDataBuffer ? heightDataBuffer[pIdx] : ((0.299 * r + 0.587 * g + 0.114 * b) / 255);
    const baseZ = getEffectiveRearBaseZ();
    const maxZ = Math.max(baseZ + 0.2, config.maxRelief);
    const zVal = baseZ + lum * (maxZ - baseZ);

    const sortedTD = prepareSortedFilamentsForTD(filaments);
    let simRgb;
    if (config.colorMode === 'stratified') {
        simRgb = computeBeerLambertTDColor(lum, zVal, baseZ, maxZ, sortedTD, (config.tdOpticalBlend || 65) / 100, true);
    } else {
        const bestIdx = findClosestFilamentIndex(r, g, b, sortedTD);
        simRgb = sortedTD[bestIdx].rgb;
    }
    const simLab = rgbToLab(simRgb[0], simRgb[1], simRgb[2]);
    const de = deltaE2000(srcLab, simLab);
    const targetHex = rgbToHex(r, g, b).toUpperCase();
    const recSpool = findClosestRealSpool(targetHex);
    const recLayer = heightToLayerNumber(zVal, true);

    if (de < 4.5) {
        return {
            de,
            message: currentLang === 'fr'
                ? `✅ Zone excellente (ΔE = ${de.toFixed(1)}) — Couleur ${targetHex} reproduite fidèlement !`
                : `✅ Great match (ΔE = ${de.toFixed(1)}) — Color ${targetHex} is accurately reproduced!`
        };
    }
    const spoolName = recSpool && recSpool.spool ? recSpool.spool.name : targetHex;
    return {
        de,
        message: currentLang === 'fr'
            ? `🔴 Écart ΔE = ${de.toFixed(1)} sur ${targetHex} (Couche #${recLayer}). Conseil : ajoutez "${spoolName}" !`
            : `🔴 Gamut gap ΔE = ${de.toFixed(1)} on ${targetHex} (Layer #${recLayer}). Tip: add "${spoolName}"!`
    };
}

function toggleSplitCompareMode() {
    isSplitCompareMode = !isSplitCompareMode;
    ['btn-split-compare', 'btn-split-compare-sec2', 'btn-top-split-compare'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('active', isSplitCompareMode);
    });
    const overlay = document.getElementById('split-compare-overlay');
    const divider = document.getElementById('split-compare-divider');
    if (overlay && divider) {
        overlay.style.display = isSplitCompareMode ? 'block' : 'none';
        divider.style.display = isSplitCompareMode ? 'flex' : 'none';
        if (isSplitCompareMode) {
            renderSplitCompareSource();
            updateSplitCompareUI(splitComparePercent);
        }
    }
    showToast(isSplitCompareMode
        ? (currentLang === 'fr' ? '🌗 Comparateur Avant/Après activé' : '🌗 Before / After Split Compare ON')
        : (currentLang === 'fr' ? 'Comparateur fermé' : 'Split Compare closed'));
}

function updateNozzleInspectionSize() {
    const el = document.getElementById('select-nozzle-size');
    if (el) config.nozzleSize = parseFloat(el.value) || 0.4;
    if (isNozzleInspectMode) generate3DReliefMesh();
    const badge = document.getElementById('val-nozzle-size');
    if (badge) badge.innerText = config.nozzleSize.toFixed(1) + ' mm';
}

function updateLayerQuantization() {
    const el = document.getElementById('select-layer-quantize');
    if (el) config.layerQuantizeStep = parseFloat(el.value) || 0;
    requestMeshUpdate();
}

function updateDespeckleFilter() {
    const el = document.getElementById('select-despeckle');
    if (el) config.despeckleRadius = parseInt(el.value, 10) || 0;
    processSourceImage(true, false);
    requestMeshUpdate();
}

function updateIroningSimulation() {
    const chk = document.getElementById('chk-ironing-sim');
    if (chk) config.ironingSimulation = chk.checked;
    if (reliefMesh && reliefMesh.material) applyActivePBRFinishToMaterial(reliefMesh.material);
    showToast(config.ironingSimulation
        ? (currentLang === 'fr' ? '✨ Simulation Repassage (Ironing) activée' : '✨ Top-Surface Ironing Simulation ON')
        : (currentLang === 'fr' ? 'Simulation Repassage désactivée' : 'Ironing Simulation OFF'));
}

function applyQualityPreset(type) {
    // Reset flags consistently across all presets
    config.bilateralEdgeLock = true;
    config.boostFineLines = true;
    config.preserveEyes = false;

    if (type === 'portrait') {
        config.smoothing = 2; config.contrast = 12; config.brightness = 2;
        config.gamma = 1.08; config.shadowLift = 8; config.highlightCeiling = 96;
        config.vibrance = 10; config.detailSharpness = 5; config.subjectPop = 15;
        config.sculpturalDome = 25; config.opticalDithering = 28; config.despeckleRadius = 1;
        config.preserveEyes = true;
        setUnifiedColorSnap(72);
    } else if (type === 'wildlife') {
        config.smoothing = 1; config.contrast = 18; config.brightness = 0;
        config.gamma = 1.02; config.shadowLift = 4; config.highlightCeiling = 98;
        config.vibrance = 22; config.detailSharpness = 8; config.subjectPop = 28;
        config.sculpturalDome = 15; config.opticalDithering = 18; config.despeckleRadius = 1;
        config.preserveEyes = true;
        setUnifiedColorSnap(82);
    } else if (type === 'vector') {
        config.smoothing = 0; config.contrast = 25; config.brightness = 0;
        config.gamma = 1.0; config.shadowLift = 0; config.highlightCeiling = 100;
        config.vibrance = 15; config.detailSharpness = 7; config.subjectPop = 0;
        config.sculpturalDome = 0; config.opticalDithering = 0; config.despeckleRadius = 2;
        config.bilateralEdgeLock = true; config.boostFineLines = true;
        setUnifiedColorSnap(96);
    } else if (type === 'landscape') {
        config.smoothing = 1; config.contrast = 16; config.brightness = 0;
        config.gamma = 0.96; config.shadowLift = 5; config.highlightCeiling = 100;
        config.vibrance = 28; config.detailSharpness = 6; config.subjectPop = 10;
        config.sculpturalDome = 8; config.opticalDithering = 32; config.despeckleRadius = 1;
        setUnifiedColorSnap(68);
    }

    syncQualityControlsUI();
    processSourceImage(true, false);
    requestMeshUpdate();
    showToast(`✨ ${currentLang === 'fr' ? 'Préréglage appliqué' : 'Preset applied'}: ${type.toUpperCase()}`);
}

function syncQualityControlsUI() {
    const pairs = [
        ['slider-brightness', 'val-brightness', config.brightness, ''],
        ['slider-contrast', 'val-contrast', config.contrast, ''],
        ['slider-smoothing', 'val-smoothing', config.smoothing, ''],
        ['slider-dithering', 'val-dithering', config.opticalDithering, '%'],
        ['slider-td-blend', 'val-td-blend', config.tdOpticalBlend, '%'],
        ['slider-sharpness', 'val-sharpness', config.detailSharpness, ''],
        ['slider-subject-pop', 'val-subject-pop', config.subjectPop, '%'],
        ['slider-color-snap', 'val-color-snap', config.colorSnap, '%'],
        ['slider-boundary-sharpness', 'val-boundary-sharpness', config.boundarySharpness, '%'],
        ['slider-sculpt-dome', 'val-sculpt-dome', config.sculpturalDome, '%'],
        ['slider-gamma', 'val-gamma', Math.round((config.gamma || 1.0) * 100), 'gamma'],
        ['slider-shadow-lift', 'val-shadow-lift', config.shadowLift, '%'],
        ['slider-highlight-ceiling', 'val-highlight-ceiling', config.highlightCeiling, '%'],
        ['slider-vibrance', 'val-vibrance', config.vibrance, '%']
    ];
    pairs.forEach(([sId, vId, val, unit]) => {
        const s = document.getElementById(sId);
        const v = document.getElementById(vId);
        if (s && val !== undefined) s.value = val;
        if (v && val !== undefined) {
            if (unit === 'gamma') v.innerText = (val / 100).toFixed(2);
            else if (sId === 'slider-subject-pop' || sId === 'slider-vibrance') v.innerText = (val > 0 ? '+' : '') + val + unit;
            else v.innerText = val + unit;
        }
    });

    const selects = [
        ['select-engine-res', config.engineResolution],
        ['select-filament-finish', config.filamentFinish],
        ['select-filament-finish-sec2', config.filamentFinish],
        ['select-layer-quantize', config.layerQuantizeStep],
        ['select-despeckle', config.despeckleRadius],
        ['select-nozzle-size', config.nozzleSize],
        ['select-color-mode', config.colorMode],
        ['select-optical-model', config.opticalModel],
        ['select-aspect-preset', config.aspectPreset],
        ['select-slicer-profile', config.slicerProfile],
        ['select-mural-connector', config.muralConnector]
    ];
    selects.forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el && val !== undefined) el.value = String(val);
    });

    const checks = [
        ['chk-bilateral', !!config.bilateralEdgeLock],
        ['chk-boost-fine-lines', !!config.boostFineLines],
        ['chk-preserve-eyes', !!config.preserveEyes],
        ['chk-layer-ridges', config.layerRidges !== false],
        ['chk-layer-ridges-sec2', config.layerRidges !== false],
        ['chk-ironing-sim', !!config.ironingSimulation],
        ['chk-own-spools-only', !!config.ownSpoolsOnly]
    ];
    checks.forEach(([id, b]) => {
        const el = document.getElementById(id);
        if (el) el.checked = b;
    });
}

function updateSplitCompareUI(pct) {
    splitComparePercent = Math.max(5, Math.min(95, pct));
    const overlay = document.getElementById('split-compare-overlay');
    const divider = document.getElementById('split-compare-divider');
    if (overlay) overlay.style.clipPath = `inset(0 ${100 - splitComparePercent}% 0 0)`;
    if (divider) divider.style.left = `${splitComparePercent}%`;
}

function renderSplitCompareSource() {
    const cv = document.getElementById('split-compare-canvas');
    const vp = document.getElementById('viewport-container');
    if (!cv || !vp || !sourceImage) return;
    const cw = Math.max(1, vp.clientWidth);
    const ch = Math.max(1, vp.clientHeight);
    cv.width = cw;
    cv.height = ch;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#06090e';
    ctx.fillRect(0, 0, cw, ch);

    const aspect = (config.width || 140) / Math.max(1, config.height || 140);
    const maxBox = Math.min(cw, ch) * 0.72;
    let drawW = maxBox, drawH = maxBox;
    if (aspect >= 1) drawH = maxBox / aspect;
    else drawW = maxBox * aspect;
    const dx = (cw - drawW) * 0.5;
    const dy = (ch - drawH) * 0.5;

    ctx.drawImage(processedCanvas.width > 0 ? processedCanvas : sourceImage, dx, dy, drawW, drawH);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
    ctx.lineWidth = 2;
    ctx.strokeRect(dx, dy, drawW, drawH);
}

function startSplitCompareDrag(e) {
    e.preventDefault();
    const vp = document.getElementById('viewport-container');
    if (!vp) return;
    const onMove = (ev) => {
        const rect = vp.getBoundingClientRect();
        if (rect.width <= 0) return;
        const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
        const pct = ((clientX - rect.left) / rect.width) * 100;
        updateSplitCompareUI(pct);
    };
    const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
}

function updateEngineResolution() {
    const el = document.getElementById('select-engine-res');
    if (el) config.engineResolution = parseInt(el.value, 10) || 360;
    processSourceImage(true, false);
    requestMeshUpdate();
    showToast(`⚙️ ${currentLang === 'fr' ? 'Résolution moteur' : 'Engine Resolution'}: ${config.engineResolution} px`);
}

function updateFilamentFinish(source) {
    const el1 = document.getElementById('select-filament-finish');
    const el2 = document.getElementById('select-filament-finish-sec2');
    const chk1 = document.getElementById('chk-layer-ridges');
    const chk2 = document.getElementById('chk-layer-ridges-sec2');

    if (source === 'sec2') {
        if (el2) config.filamentFinish = el2.value;
        if (chk2) config.layerRidges = chk2.checked;
    } else {
        if (el1) config.filamentFinish = el1.value;
        if (chk1) config.layerRidges = chk1.checked;
    }
    if (el1) el1.value = config.filamentFinish;
    if (el2) el2.value = config.filamentFinish;
    if (chk1) chk1.checked = config.layerRidges;
    if (chk2) chk2.checked = config.layerRidges;

    requestMeshUpdate();
}

function autoMasterQuality() {
    if (!heightDataBuffer || heightDataBuffer.length === 0) return;
    // Compute histogram percentiles to auto-tune contrast/gamma/shadowLift/highlightCeiling
    const hist = new Uint32Array(256);
    const N = heightDataBuffer.length;
    for (let i = 0; i < N; i++) {
        hist[Math.max(0, Math.min(255, Math.round(heightDataBuffer[i] * 255)))]++;
    }
    let acc = 0, p05 = 0, p50 = 128, p95 = 255;
    for (let b = 0; b < 256; b++) {
        acc += hist[b];
        if (acc >= N * 0.05 && p05 === 0) p05 = b;
        if (acc >= N * 0.50 && p50 === 128) p50 = b;
        if (acc >= N * 0.95 && p95 === 255) { p95 = b; break; }
    }
    const dynamicRange = Math.max(20, p95 - p05);
    config.contrast = Math.max(-10, Math.min(35, Math.round((190 - dynamicRange) * 0.22)));
    config.gamma = Math.max(0.75, Math.min(1.45, Math.round((128 / Math.max(40, p50)) * 100) / 100));
    config.shadowLift = p05 < 18 ? 6 : 0;
    config.highlightCeiling = p95 > 245 ? 96 : 100;
    config.detailSharpness = 6;
    config.bilateralEdgeLock = true;
    config.boostFineLines = true;

    // Distribute non-base filament thresholds cleanly based on filament count & TD
    if (filaments.length >= 2) {
        filaments[0].startPct = 0.0;
        const count = filaments.length - 1;
        for (let i = 1; i < filaments.length; i++) {
            const frac = i / (count + 0.35);
            filaments[i].startPct = Math.round(Math.min(0.92, Math.max(0.10, frac)) * 100) / 100;
        }
    }

    syncQualityControlsUI();
    renderFilamentStackUI();
    processSourceImage(true, false);
    requestMeshUpdate();
    showToast(translations[currentLang]?.toastAutoMastered || '✨ Auto-Mastered tones & swap layers!');
}

function toggleOpticalModel() {
    const el = document.getElementById('select-optical-model');
    if (el) {
        config.opticalModel = el.value;
    } else {
        const order = ['kubelka_munk', 'beer_lambert', 'cubic'];
        const nextIdx = (order.indexOf(config.opticalModel) + 1) % order.length;
        config.opticalModel = order[nextIdx];
    }
    const badge = document.getElementById('btn-optical-model');
    if (badge) {
        const names = { kubelka_munk: 'Kubelka-Munk', beer_lambert: 'Beer-Lambert', cubic: 'Cubic TD' };
        badge.innerText = names[config.opticalModel] || 'Kubelka-Munk';
    }
    requestMeshUpdate();
    if (typeof render2DEditorPreview === 'function' && centerViewMode === '2d') render2DEditorPreview();
    updateColorMatchBadge();
}

function updateColorMode() {
    const el = document.getElementById('select-color-mode');
    if (el) config.colorMode = el.value;

    // If switching to CMYW Color Lithophane, offer Bambu CMYK Lithophane spools automatically!
    if (config.colorMode === 'cmyw') {
        filaments = [
            { name: 'Bambu CMYK Cyan', color: '#0096d6', td: 5.5, startPct: 0.00 },
            { name: 'Bambu CMYK Magenta', color: '#e5007d', td: 5.0, startPct: 0.20 },
            { name: 'Bambu CMYK Yellow', color: '#ffe600', td: 7.5, startPct: 0.40 },
            { name: 'Bambu CMYK White', color: '#ffffff', td: 5.0, startPct: 0.60 }
        ];
        renderFilamentStackUI();
        if (typeof updateFilamentSwatchesUI === 'function') updateFilamentSwatchesUI();
        if (!isLightbox) toggleLightboxMode();
    }

    requestMeshUpdate();
    if (typeof render2DEditorPreview === 'function' && centerViewMode === '2d') render2DEditorPreview();
    updateSlicerTable();
    updateColorMatchBadge();
}

function updateQualityParams() {
    const readInt = (id, fallback) => { const e = document.getElementById(id); return e ? parseInt(e.value, 10) : fallback; };
    const tdEl = document.getElementById('slider-td-blend');
    if (tdEl) config.tdOpticalBlend = parseInt(tdEl.value, 10);

    const sharpEl = document.getElementById('slider-sharpness');
    if (sharpEl) config.detailSharpness = parseInt(sharpEl.value, 10);

    const popEl = document.getElementById('slider-subject-pop');
    if (popEl) config.subjectPop = parseInt(popEl.value, 10);

    // Sync BOTH colorSnap and boundarySharpness from whichever slider changed!
    const activeEl = document.activeElement;
    if (activeEl && activeEl.id === 'slider-color-snap') {
        setUnifiedColorSnap(activeEl.value);
    } else if (activeEl && activeEl.id === 'slider-boundary-sharpness') {
        setUnifiedColorSnap(activeEl.value);
    }

    config.sculpturalDome = readInt('slider-sculpt-dome', config.sculpturalDome);
    const gammaEl = document.getElementById('slider-gamma');
    if (gammaEl) config.gamma = (parseInt(gammaEl.value, 10) || 100) / 100;
    config.shadowLift = readInt('slider-shadow-lift', config.shadowLift);
    config.highlightCeiling = readInt('slider-highlight-ceiling', config.highlightCeiling);
    config.vibrance = readInt('slider-vibrance', config.vibrance);

    const chkBi = document.getElementById('chk-bilateral');
    if (chkBi) config.bilateralEdgeLock = chkBi.checked;
    const chkFine = document.getElementById('chk-boost-fine-lines');
    if (chkFine) config.boostFineLines = chkFine.checked;
    const chkEyes = document.getElementById('chk-preserve-eyes');
    if (chkEyes) config.preserveEyes = chkEyes.checked;

    syncQualityControlsUI();
    processSourceImage(true, false);
    requestMeshUpdate();
    if (typeof render2DEditorPreview === 'function' && centerViewMode === '2d') render2DEditorPreview();
}

// ==========================================
// 📐 SHARED LAYER PHASE MATH & REAR MOUNT BOSS DEPTH
// ==========================================

function getEffectiveRearBaseZ() {
    let baseZ = Math.max(0.20, config.baseThickness || 0.60);
    const isFlat = !config.topography || config.topography === 'flat';
    if (!isFlat) return baseZ;

    // Ensure mechanical rear mounts have real printable depth while keeping back 100% flat on Z=0!
    const mount = config.mounting || 'flat';
    if (mount === 'keyhole') baseZ = Math.max(baseZ, 2.80);
    else if (mount === 'magnets_6' || mount === 'magnets_10') baseZ = Math.max(baseZ, 2.50);
    else if (mount === 'magnets_8') baseZ = Math.max(baseZ, 3.50);
    else if (config.nfcPocket) baseZ = Math.max(baseZ, 0.80);
    return baseZ;
}

// Quantizes height strictly onto physical slicer layer planes: firstLayerHeight + k * step
function quantizeHeightToSlicerLayer(zMm, step, minZ = 0, maxZ = 999) {
    const lo = Number.isFinite(minZ) ? minZ : 0;
    const hi = Number.isFinite(maxZ) ? maxZ : 999;
    if (!step || step <= 0) return Math.max(lo, Math.min(hi, zMm));
    const firstH = Math.max(0.08, config.firstLayerHeight || 0.20);
    if (zMm <= firstH) return Math.max(lo, firstH);
    const k = Math.round((zMm - firstH) / step);
    const snapped = firstH + k * step;
    return Math.max(lo, Math.min(hi, snapped));
}

// Exact physical slicer layer number for a Z coordinate (mm).
// isSwapBoundary = true uses ceil so M600/AMS swaps NEVER trigger 1.25 layers too early!
function heightToLayerNumber(zMm, isSwapBoundary = false) {
    const firstH = Math.max(0.08, config.firstLayerHeight || 0.20);
    const layerH = Math.max(0.04, config.layerHeight || 0.08);
    if (!Number.isFinite(zMm) || zMm <= 1e-6) return 1;
    if (zMm <= firstH + 1e-6) return 1;
    const rawSteps = (zMm - firstH) / layerH;
    const steps = isSwapBoundary ? Math.ceil(rawSteps - 1e-4) : Math.round(rawSteps);
    return 1 + Math.max(0, steps);
}

function getSlotStartZAndLayer(idx) {
    const baseZ = getEffectiveRearBaseZ();
    const maxZ = Math.max(baseZ + 0.4, config.maxRelief || 2.4);
    if (idx === 0 || !filaments[idx]) {
        return { startZ: 0.0, startLayer: 1 };
    }
    const rawZ = baseZ + (filaments[idx].startPct || 0) * (maxZ - baseZ);
    const firstH = Math.max(0.08, config.firstLayerHeight || 0.20);
    const layerH = Math.max(0.04, config.layerHeight || 0.08);
    const swapLayer = heightToLayerNumber(rawZ, true);
    const exactLayerStartZ = (swapLayer <= 1) ? 0.0 : (firstH + (swapLayer - 1) * layerH);
    return {
        startZ: Math.round(exactLayerStartZ * 100) / 100,
        startLayer: swapLayer
    };
}

function getTotalLayerCount() {
    const isCurved = config.topography && config.topography !== 'flat';
    const maxHeightMm = isCurved ? (config.height || 140) : Math.max(getEffectiveRearBaseZ() + 0.4, config.maxRelief || 2.4);
    return heightToLayerNumber(maxHeightMm, false);
}

// ==========================================
// ⛰️ 3D HEIGHTMAP RELIEF MESH GENERATOR (WATERIGHT, ZERO-ALLOC, WELDED SEAM)
// ==========================================

function generate3DReliefMesh() {
    if (!scene || !heightDataBuffer || !processedCanvas.width || typeof THREE === 'undefined') return;

    const cols = processedCanvas.width;
    const rows = processedCanvas.height;
    const w = Math.max(20, config.width || 140);
    const h = Math.max(20, config.height || 140);
    const baseZ = getEffectiveRearBaseZ();
    const maxReliefZ = Math.max(baseZ + 0.4, config.maxRelief || 2.4);
    const layerH = Math.max(0.04, config.layerHeight || 0.08);
    const topo = config.topography || 'flat';
    const isClosedCyl = (topo === 'cylinder');
    const N = cols * rows;

    // Pre-parse filaments & sort ONCE (zero per-pixel allocations!)
    const sortedTD = prepareSortedFilamentsForTD(filaments);
    const parsedOrig = filaments.map((f, i) => {
        const rgb = hexToRgb(f.color);
        return {
            idx: i,
            rgb,
            lin: [SRGB_TO_LIN_LUT[rgb[0]], SRGB_TO_LIN_LUT[rgb[1]], SRGB_TO_LIN_LUT[rgb[2]]],
            lab: rgbToLab(rgb[0], rgb[1], rgb[2]),
            td: Math.max(0.2, parseFloat(f.td) || 1.5),
            startPct: i === 0 ? 0.0 : (f.startPct || 0)
        };
    });
    const baseRgbCache = parsedOrig[0] ? parsedOrig[0].rgb : [17, 24, 39];
    const hasBgNeed = (config.bgMode === 'flatten_bg' || config.bgMode === 'cameo_dome' || config.sculpturalDome > 0 || config.removeCanvasBg);
    const bgRgb = hasBgNeed ? computeBorderBackgroundRGB(colorDataBuffer, cols, rows) : null;

    // Pass 1: Compute per-pixel relief Z, bottom Z, void mask, and active filament index
    const topZArr = new Float32Array(N);
    const botZArr = new Float32Array(N);
    const voidArr = new Uint8Array(N);
    const chosenSlotArr = new Uint8Array(N);
    const snapAmount = Math.max(0.1, Math.min(1.0, (config.boundarySharpness !== undefined ? config.boundarySharpness : config.colorSnap) / 100));
    const sharpAmt = (config.detailSharpness || 0) * 0.032;
    const blendStrength = (config.tdOpticalBlend !== undefined ? config.tdOpticalBlend : 65) / 100;
    const ditherPct = config.opticalDithering || 0;
    const qStep = config.layerQuantizeStep || 0;
    const reliefSpan = maxReliefZ - baseZ;

    for (let r = 0; r < rows; r++) {
        const vNorm = r / Math.max(1, rows - 1);
        const ny = 1.0 - vNorm * 2.0;
        const yMm = ny * (h * 0.5);
        for (let c = 0; c < cols; c++) {
            const pIdx = r * cols + c;
            const uNorm = c / Math.max(1, cols - 1);
            const nx = uNorm * 2.0 - 1.0;
            const xMm = nx * (w * 0.5);

            if (isPixelCutoutVoid(c, r, cols, rows, bgRgb, baseRgbCache)) {
                voidArr[pIdx] = 1;
                topZArr[pIdx] = baseZ;
                botZArr[pIdx] = 0;
                continue;
            }

            const i4 = pIdx * 4;
            const cr = colorDataBuffer[i4], cg = colorDataBuffer[i4 + 1], cb = colorDataBuffer[i4 + 2];
            let lum = heightDataBuffer[pIdx];
            const userSlot = filamentSlotBuffer ? filamentSlotBuffer[pIdx] : 255;

            // Detail unsharp boost on non-user-painted areas
            if (sharpAmt > 0.001 && userSlot === 255 && c > 0 && c < cols - 1 && r > 0 && r < rows - 1) {
                const avgN = (heightDataBuffer[pIdx - 1] + heightDataBuffer[pIdx + 1] + heightDataBuffer[pIdx - cols] + heightDataBuffer[pIdx + cols]) * 0.25;
                lum = Math.max(0, Math.min(1, lum + (lum - avgN) * sharpAmt * 3.5));
            }

            if (config.bgMode === 'vignette') {
                const rSq = nx * nx + ny * ny;
                lum *= Math.max(0.08, 1.0 - rSq * 0.42);
            } else if (config.bgMode === 'flatten_bg' && bgRgb) {
                const dBg = Math.sqrt(colorDistSq(cr, cg, cb, bgRgb[0], bgRgb[1], bgRgb[2]));
                if (dBg < 55) lum *= (dBg / 55) * 0.35;
            } else if (config.bgMode === 'cameo_dome') {
                lum = computeSculpturalBasReliefZ(lum, nx, ny, cr, cg, cb, bgRgb, Math.max(45, config.sculpturalDome || 45));
            }

            if (config.sculpturalDome > 0 && config.bgMode !== 'cameo_dome') {
                lum = computeSculpturalBasReliefZ(lum, nx, ny, cr, cg, cb, bgRgb, config.sculpturalDome);
            }

            let zVal;
            if (config.colorMode === 'cmyw') {
                // Lithophane height: darker areas = thicker filament (blocks more backlight)!
                const ch = computeCMYWChannels(cr, cg, cb);
                zVal = baseZ + (1.0 - Math.pow(ch.lum, 0.72)) * reliefSpan;
            } else {
                zVal = baseZ + lum * reliefSpan;
            }

            // Apply explicit user Z-Chisel sculpting delta
            if (customZDeltaBuffer && customZDeltaBuffer[pIdx] !== 0) {
                zVal += customZDeltaBuffer[pIdx];
            }

            // Apply unified Soundwave height (matches export-cad.js!)
            const waveSample = sampleActiveSoundwave(uNorm, vNorm);
            if (waveSample === true) {
                zVal = maxReliefZ;
            } else if (waveSample === false) {
                zVal = Math.max(baseZ, maxReliefZ - Math.max(0.24, layerH * 3));
            }

            // Apply unified QR Code height (with proper Stratified polarity so dark modules print in dark filament!)
            const qrSample = sampleActiveQRStamp(uNorm, vNorm);
            if (qrSample === true) {
                zVal = (config.colorMode === 'stratified')
                    ? baseZ
                    : maxReliefZ;
            } else if (qrSample === false) {
                zVal = (config.colorMode === 'stratified')
                    ? maxReliefZ
                    : Math.max(baseZ, maxReliefZ - Math.max(0.24, layerH * 3));
            }

            // Slicer-phase aligned quantization (preserves negative Z-chisel down to baseZ * 0.5!)
            const minZClamp = Math.max(0.24, baseZ * 0.5);
            if (qStep > 0) {
                zVal = quantizeHeightToSlicerLayer(zVal, qStep, minZClamp, maxReliefZ + 0.64);
            } else {
                zVal = Math.max(minZClamp, Math.min(maxReliefZ + 0.64, zVal));
            }

            topZArr[pIdx] = zVal;
            botZArr[pIdx] = computeRearCavityDepthMm(xMm, yMm, zVal, w, h, baseZ);

            if (userSlot < parsedOrig.length) {
                chosenSlotArr[pIdx] = userSlot;
            } else {
                chosenSlotArr[pIdx] = findClosestFilamentWithDither(cr, cg, cb, c, r, parsedOrig, ditherPct);
            }
        }
    }

    // Pass 1.5: Anti-spike clamp (when bilateralEdgeLock is ON — also mirrored in export-cad.js!)
    if (config.bilateralEdgeLock) {
        const tmpZ = new Float32Array(topZArr);
        for (let r = 1; r < rows - 1; r++) {
            for (let c = 1; c < cols - 1; c++) {
                const pIdx = r * cols + c;
                if (voidArr[pIdx]) continue;
                const zc = tmpZ[pIdx];
                const nAvg = (tmpZ[pIdx - 1] + tmpZ[pIdx + 1] + tmpZ[pIdx - cols] + tmpZ[pIdx + cols]) * 0.25;
                const maxDiff = Math.max(
                    Math.abs(zc - tmpZ[pIdx - 1]), Math.abs(zc - tmpZ[pIdx + 1]),
                    Math.abs(zc - tmpZ[pIdx - cols]), Math.abs(zc - tmpZ[pIdx + cols])
                );
                if (maxDiff > 0.72 && Math.abs(zc - nAvg) > 0.45) {
                    topZArr[pIdx] = nAvg + (zc - nAvg) * 0.52;
                }
            }
        }
    }

    // Pass 2: Build Top & Bottom vertex buffers + Optical / Diagnostic Colors (Zero THREE.Color allocs!)
    const positions = new Float32Array(N * 2 * 3);
    const uvs = new Float32Array(N * 2 * 2);
    const colors = new Float32Array(N * 2 * 3);
    const dxMm = w / Math.max(1, cols - 1);
    const dyMm = h / Math.max(1, rows - 1);
    const kelvinHex = KELVIN_HEX_MAP[config.lightboxKelvin || 4000] || 0xfff4e0;
    const kr = ((kelvinHex >> 16) & 255) / 255;
    const kg = ((kelvinHex >> 8) & 255) / 255;
    const kb = (kelvinHex & 255) / 255;
    const avgTd = Math.max(1.2, parsedOrig.reduce((s, f) => s + f.td, 0) / Math.max(1, parsedOrig.length));
    const brightFil = parsedOrig[parsedOrig.length - 1] || parsedOrig[0];
    const baseCol0 = parsedOrig[0] ? parsedOrig[0].rgb : [17, 24, 39];

    let sumDE = 0, maxDE = 0, deCount = 0;

    for (let r = 0; r < rows; r++) {
        const vNorm = r / Math.max(1, rows - 1);
        const ny = 1.0 - vNorm * 2.0;
        const yMm = ny * (h * 0.5);
        for (let c = 0; c < cols; c++) {
            const pIdx = r * cols + c;
            const uNorm = c / Math.max(1, cols - 1);
            const nx = uNorm * 2.0 - 1.0;
            const xMm = nx * (w * 0.5);

            const tZ = topZArr[pIdx];
            const bZ = botZArr[pIdx];
            const ptTop = applyTopographyVertex(xMm, yMm, tZ, w, h, topo, false);
            const ptBot = applyTopographyVertex(xMm, yMm, bZ, w, h, topo, false);

            const t3 = pIdx * 3;
            const b3 = (N + pIdx) * 3;
            positions[t3] = ptTop[0]; positions[t3 + 1] = ptTop[1]; positions[t3 + 2] = ptTop[2];
            positions[b3] = ptBot[0]; positions[b3 + 1] = ptBot[1]; positions[b3 + 2] = ptBot[2];

            const t2 = pIdx * 2;
            const b2 = (N + pIdx) * 2;
            uvs[t2] = uNorm; uvs[t2 + 1] = 1.0 - vNorm;
            uvs[b2] = uNorm; uvs[b2 + 1] = 1.0 - vNorm;

            const i4 = pIdx * 4;
            const cr = colorDataBuffer[i4], cg = colorDataBuffer[i4 + 1], cb = colorDataBuffer[i4 + 2];
            const lum = heightDataBuffer[pIdx];
            const slotIdx = chosenSlotArr[pIdx];
            const userSlot = filamentSlotBuffer ? filamentSlotBuffer[pIdx] : 255;

            // Compute actual physical printed color (used both for normal view AND ΔE heatmap!)
            let outR = cr, outG = cg, outB = cb;
            const qrSample = sampleActiveQRStamp(uNorm, vNorm);
            const waveSample = sampleActiveSoundwave(uNorm, vNorm);

            if (qrSample === true) {
                outR = baseCol0[0]; outG = baseCol0[1]; outB = baseCol0[2];
            } else if (qrSample === false) {
                outR = brightFil.rgb[0]; outG = brightFil.rgb[1]; outB = brightFil.rgb[2];
            } else if (waveSample === true) {
                outR = brightFil.rgb[0]; outG = brightFil.rgb[1]; outB = brightFil.rgb[2];
            } else if (waveSample === false) {
                outR = baseCol0[0]; outG = baseCol0[1]; outB = baseCol0[2];
            } else if (config.colorMode === 'cmyw') {
                if (isLightbox) {
                    const cmywRgb = computeCMYWBacklitColor(cr, cg, cb, Math.max(0.1, tZ - bZ), maxReliefZ, kelvinHex);
                    outR = cmywRgb[0]; outG = cmywRgb[1]; outB = cmywRgb[2];
                } else {
                    // Ambient unlit view of CMYW lithophane looks pale creamy-pastel
                    outR = Math.round(230 - (255 - cr) * 0.25);
                    outG = Math.round(230 - (255 - cg) * 0.25);
                    outB = Math.round(230 - (255 - cb) * 0.25);
                }
            } else if (config.colorMode === 'luminance') {
                const gVal = Math.round(lum * 255);
                outR = gVal; outG = gVal; outB = gVal;
            } else if (config.colorMode === 'stratified') {
                const tdRgb = computeBeerLambertTDColor(lum, tZ, baseZ, maxReliefZ, sortedTD, blendStrength, true);
                outR = tdRgb[0]; outG = tdRgb[1]; outB = tdRgb[2];
            } else {
                // Chromatic AMS / Painting Mode
                const fil = parsedOrig[Math.min(slotIdx, parsedOrig.length - 1)] || parsedOrig[0];
                if (userSlot < parsedOrig.length || isColorMapMode) {
                    outR = fil.rgb[0]; outG = fil.rgb[1]; outB = fil.rgb[2];
                } else {
                    const snap = snapAmount;
                    let rMix = cr + (fil.rgb[0] - cr) * snap;
                    let gMix = cg + (fil.rgb[1] - cg) * snap;
                    let bMix = cb + (fil.rgb[2] - cb) * snap;
                    // Subtle base-layer Beer-Lambert subsurface transmission only when solid base exists
                    if (!config.removeCanvasBg && slotIdx > 0 && blendStrength > 0.05) {
                        const dz = Math.max(0.04, tZ - baseZ);
                        const trans = Math.exp(-3.45 * dz / Math.max(0.25, fil.td));
                        const baseInf = Math.min(0.36, trans * blendStrength * 0.40);
                        rMix = rMix * (1 - baseInf) + baseCol0[0] * baseInf;
                        gMix = gMix * (1 - baseInf) + baseCol0[1] * baseInf;
                        bMix = bMix * (1 - baseInf) + baseCol0[2] * baseInf;
                    }
                    outR = rMix; outG = gMix; outB = bMix;
                }
            }

            // Real Backlit Lithophane Transmission Shading (Non-CMYW modes)
            if (isLightbox && config.colorMode !== 'cmyw' && !isDeltaEHeatmap && !isOverhangWarning && !isZebraExposure && !isNozzleInspectMode) {
                const thick = Math.max(0.15, tZ - bZ);
                const trans = Math.exp(-1.55 * thick / Math.max(0.8, avgTd * 0.65));
                const glow = 0.14 + trans * 1.35;
                outR = Math.min(255, outR * glow * kr + 28 * trans * kr);
                outG = Math.min(255, outG * glow * kg + 28 * trans * kg);
                outB = Math.min(255, outB * glow * kb + 28 * trans * kb);
            }

            // Diagnostic Overlays (Mutually Exclusive!)
            let dispR = outR, dispG = outG, dispB = outB;

            if (isDeltaEHeatmap && !voidArr[pIdx]) {
                const de = deltaE2000(rgbToLab(cr, cg, cb), rgbToLab(outR, outG, outB));
                sumDE += de; if (de > maxDE) maxDE = de; deCount++;
                if (de < 3.0) { dispR = 16; dispG = 185; dispB = 129; }        // Emerald: Indistinguishable
                else if (de < 6.5) { dispR = 132; dispG = 204; dispB = 22; }   // Lime: Great
                else if (de < 10.5) { dispR = 250; dispG = 204; dispB = 21; }  // Yellow: Noticeable
                else if (de < 15.0) { dispR = 249; dispG = 115; dispB = 22; }  // Orange: Shift
                else { dispR = 239; dispG = 68; dispB = 68; }                  // Crimson: Out-of-gamut!
            } else if (isZebraExposure) {
                if (tZ >= maxReliefZ - 0.04) { dispR = 236; dispG = 72; dispB = 153; } // Magenta ceiling clip
                else if (tZ <= baseZ + 0.04) { dispR = 6; dispG = 182; dispB = 212; }  // Cyan base floor
                else {
                    const gGray = Math.round(lum * 160 + 30);
                    dispR = gGray; dispG = gGray; dispB = gGray;
                }
            } else if (isNozzleInspectMode && c > 0 && c < cols - 1 && r > 0 && r < rows - 1) {
                const maxDelta = Math.max(
                    Math.abs(tZ - topZArr[pIdx - 1]), Math.abs(tZ - topZArr[pIdx + 1]),
                    Math.abs(tZ - topZArr[pIdx - cols]), Math.abs(tZ - topZArr[pIdx + cols])
                );
                const featureMm = Math.min(dxMm, dyMm);
                if (featureMm < config.nozzleSize * 0.9 && maxDelta > 0.35) {
                    dispR = 239; dispG = 68; dispB = 68; // Red: sub-nozzle spike!
                } else if (maxDelta > 0.55) {
                    dispR = 245; dispG = 158; dispB = 11; // Amber: steep detail
                } else {
                    dispR = outR * 0.45 + 15; dispG = outG * 0.45 + 25; dispB = outB * 0.45 + 35;
                }
            } else if (isOverhangWarning) {
                // REAL Printability Preflight:
                // Flat prints: highlight rear cavity bridges (botZ > 0.25) & narrow steep spires (>78°), NOT normal 45° bas-relief!
                // Curved prints: highlight true build-axis downward overhangs (>50° downward along Y).
                let risk = 0;
                if (topo === 'flat') {
                    if (bZ > 0.30) risk = 2; // Unsupported bridge roof over rear pocket (keyhole/magnet/NFC)
                    else if (c > 0 && c < cols - 1 && r > 0 && r < rows - 1) {
                        const gx = (topZArr[pIdx + 1] - topZArr[pIdx - 1]) / (2 * dxMm);
                        const gy = (topZArr[pIdx + cols] - topZArr[pIdx - cols]) / (2 * dyMm);
                        const slopeDeg = Math.atan(Math.hypot(gx, gy)) * 180 / Math.PI;
                        if (slopeDeg > 78) risk = 1; // Extreme needle spire
                    }
                } else if (r > 0 && r < rows - 1) {
                    const dzDy = (topZArr[pIdx - cols] - topZArr[pIdx + cols]) / (2 * dyMm);
                    const overhangDeg = Math.atan(Math.max(0, dzDy)) * 180 / Math.PI;
                    if (overhangDeg > 55) risk = 2;
                    else if (overhangDeg > 45) risk = 1;
                }
                if (risk === 2) { dispR = 239; dispG = 68; dispB = 68; }
                else if (risk === 1) { dispR = 250; dispG = 204; dispB = 21; }
                else { dispR = outR * 0.40 + 18; dispG = outG * 0.40 + 28; dispB = outB * 0.40 + 38; }
            }

            colors[t3] = dispR / 255; colors[t3 + 1] = dispG / 255; colors[t3 + 2] = dispB / 255;
            // Bottom backplate uses Filament #0 color
            colors[b3] = baseCol0[0] / 255; colors[b3 + 1] = baseCol0[1] / 255; colors[b3 + 2] = baseCol0[2] / 255;
        }
    }

    if (isDeltaEHeatmap && deCount > 0) {
        lastDeltaEStats = {
            avgDeltaE: sumDE / deCount,
            maxDeltaE: maxDE,
            matchScorePct: Math.max(0, Math.min(100, Math.round(100 - (sumDE / deCount) * 2.15)))
        };
    }

    // Pass 3: Active cells & Welded 360° Cylinder Index Assembly + Crisp Split Side Walls
    const cellCols = cols - 1;
    const cellRows = rows - 1;
    const activeCells = new Uint8Array(cellCols * cellRows);
    let activeCount = 0;

    for (let r = 0; r < cellRows; r++) {
        for (let c = 0; c < cellCols; c++) {
            const p00 = r * cols + c;
            const p10 = p00 + 1;
            const p01 = p00 + cols;
            const p11 = p01 + 1;
            const voidCnt = voidArr[p00] + voidArr[p10] + voidArr[p01] + voidArr[p11];
            if (voidCnt <= 1) {
                activeCells[r * cellCols + c] = 1;
                activeCount++;
            }
        }
    }

    // Build top + bottom surface indices first
    const surfIdx = new Uint32Array(activeCount * 12);
    let sPtr = 0;
    const wallPos = [];
    const wallCol = [];

    const pushWallQuad = (vA, vB) => {
        const tA = vA * 3, tB = vB * 3;
        const bA = (N + vA) * 3, bB = (N + vB) * 3;
        // Triangle 1: tA, bA, tB
        wallPos.push(
            positions[tA], positions[tA + 1], positions[tA + 2],
            positions[bA], positions[bA + 1], positions[bA + 2],
            positions[tB], positions[tB + 1], positions[tB + 2],
            // Triangle 2: tB, bA, bB
            positions[tB], positions[tB + 1], positions[tB + 2],
            positions[bA], positions[bA + 1], positions[bA + 2],
            positions[bB], positions[bB + 1], positions[bB + 2]
        );
        wallCol.push(
            colors[tA], colors[tA + 1], colors[tA + 2],
            colors[bA], colors[bA + 1], colors[bA + 2],
            colors[tB], colors[tB + 1], colors[tB + 2],
            colors[tB], colors[tB + 1], colors[tB + 2],
            colors[bA], colors[bA + 1], colors[bA + 2],
            colors[bB], colors[bB + 1], colors[bB + 2]
        );
    };

    for (let r = 0; r < cellRows; r++) {
        for (let c = 0; c < cellCols; c++) {
            const ci = r * cellCols + c;
            if (!activeCells[ci]) continue;

            const tl = r * cols + c;
            const tr = (isClosedCyl && c === cellCols - 1) ? (r * cols) : (tl + 1);
            const bl = tl + cols;
            const br = (isClosedCyl && c === cellCols - 1) ? ((r + 1) * cols) : (bl + 1);

            // Top face CCW (+Z)
            surfIdx[sPtr++] = tl; surfIdx[sPtr++] = bl; surfIdx[sPtr++] = tr;
            surfIdx[sPtr++] = tr; surfIdx[sPtr++] = bl; surfIdx[sPtr++] = br;
            // Bottom face CW (-Z)
            surfIdx[sPtr++] = N + tl; surfIdx[sPtr++] = N + tr; surfIdx[sPtr++] = N + bl;
            surfIdx[sPtr++] = N + tr; surfIdx[sPtr++] = N + br; surfIdx[sPtr++] = N + bl;

            // Dedicated split-normal perimeter & cutout walls (suppresses West/East seam walls on 360° cylinder!)
            if (r === 0 || !activeCells[(r - 1) * cellCols + c]) pushWallQuad(tr, tl);
            if (r === cellRows - 1 || !activeCells[(r + 1) * cellCols + c]) pushWallQuad(bl, br);
            if (!isClosedCyl) {
                if (c === 0 || !activeCells[r * cellCols + (c - 1)]) pushWallQuad(tl, bl);
                if (c === cellCols - 1 || !activeCells[r * cellCols + (c + 1)]) pushWallQuad(br, tr);
            } else {
                const prevC = (c - 1 + cellCols) % cellCols;
                const nextC = (c + 1) % cellCols;
                if (!activeCells[r * cellCols + prevC]) pushWallQuad(tl, bl);
                if (!activeCells[r * cellCols + nextC]) pushWallQuad(br, tr);
            }
        }
    }

    const wallVertCount = Math.floor(wallPos.length / 3);
    const totalVerts = N * 2 + wallVertCount;
    const finalPos = new Float32Array(totalVerts * 3);
    const finalCol = new Float32Array(totalVerts * 3);
    const finalUv = new Float32Array(totalVerts * 2);
    finalPos.set(positions, 0);
    finalCol.set(colors, 0);
    finalUv.set(uvs, 0);
    if (wallVertCount > 0) {
        finalPos.set(wallPos, N * 2 * 3);
        finalCol.set(wallCol, N * 2 * 3);
    }

    const totalIdxLen = sPtr + wallVertCount;
    const finalIdx = new Uint32Array(totalIdxLen);
    finalIdx.set(surfIdx.subarray(0, sPtr), 0);
    for (let k = 0; k < wallVertCount; k++) finalIdx[sPtr + k] = N * 2 + k;

    const gridGeom = new THREE.BufferGeometry();
    gridGeom.setAttribute('position', new THREE.BufferAttribute(finalPos, 3));
    gridGeom.setAttribute('uv', new THREE.BufferAttribute(finalUv, 2));
    gridGeom.setAttribute('color', new THREE.BufferAttribute(finalCol, 3));
    gridGeom.setIndex(new THREE.BufferAttribute(finalIdx, 1));
    gridGeom.computeVertexNormals();
    gridGeom.userData = { gridCols: cols, gridRows: rows, activeCells, cellCols, cellRows, isClosedCyl };

    const isDiagnostic = isOverhangWarning || isZebraExposure || isNozzleInspectMode || isDeltaEHeatmap || isLightbox;
    const mat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.48,
        metalness: 0.06,
        wireframe: isWireframe,
        side: THREE.FrontSide,
        clippingPlanes: clipPlane ? [clipPlane] : []
    });
    applyActivePBRFinishToMaterial(mat);
    if (isLightbox) {
        mat.roughness = 0.85;
        mat.metalness = 0.0;
    }

    // Anti-Aliased Axis-Aware 3D Layer-Line Ridge Shader (Z on flat, Y on curved, fwidth anti-aliasing!)
    if (config.layerRidges && !isDiagnostic) {
        const stepMm = Math.max(0.04, config.layerHeight || 0.08);
        const isCurvedUniform = (topo !== 'flat') ? 1.0 : 0.0;
        mat.onBeforeCompile = (shader) => {
            shader.uniforms.uLayerStep = { value: stepMm };
            shader.uniforms.uIsCurved = { value: isCurvedUniform };
            shader.vertexShader = 'varying vec3 vLocalReliefPos;\n' + shader.vertexShader;
            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                '#include <begin_vertex>\nvLocalReliefPos = position;'
            );
            shader.fragmentShader = 'varying vec3 vLocalReliefPos;\nuniform float uLayerStep;\nuniform float uIsCurved;\n' + shader.fragmentShader;
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <dithering_fragment>',
                `float layerAxis = mix(vLocalReliefPos.z, vLocalReliefPos.y, uIsCurved);
                 float phase = layerAxis / max(0.04, uLayerStep);
                 float fw = fwidth(phase);
                 float aaFade = 1.0 - smoothstep(0.18, 0.72, fw);
                 float ridgeWave = sin(phase * 6.2831853);
                 float ridgeShade = 1.0 + ridgeWave * 0.045 * aaFade;
                 gl_FragColor.rgb *= ridgeShade;
                 #include <dithering_fragment>`
            );
        };
    }

    if (reliefMesh) {
        scene.remove(reliefMesh);
        if (reliefMesh.geometry) reliefMesh.geometry.dispose();
        if (reliefMesh.material) reliefMesh.material.dispose();
    }
    reliefMesh = new THREE.Mesh(gridGeom, mat);
    scene.add(reliefMesh);

    buildQR3DOverlayMesh();
    buildFrameMesh();
    updateHUD();
    updateSlicerTable();
}

// ==========================================
// 📱 3D QR STAMP SAMPLER & OVERLAY MESH (FIXED PROPERTY + MASK CLIPPED)
// ==========================================

function sampleActiveQRStamp(u, v) {
    if (!activeQRStamp || !activeQRStamp.matrix) return null;
    const { u0, u1, v0, v1, matrix } = activeQRStamp;
    if (u < u0 || u > u1 || v < v0 || v > v1) return null;

    const size = matrix.length;
    const qz = activeQRStamp.quietModules ?? activeQRStamp.quietZone ?? 4;
    const totalMods = size + qz * 2;
    const lu = (u - u0) / Math.max(1e-5, u1 - u0);
    const lv = (v - v0) / Math.max(1e-5, v1 - v0);
    const mc = Math.floor(lu * totalMods) - qz;
    const mr = Math.floor(lv * totalMods) - qz;
    if (mc < 0 || mc >= size || mr < 0 || mr >= size) return false;
    return matrix[mr][mc] === 1;
}

function buildQR3DOverlayMesh() {
    if (qr3DMesh && scene) {
        scene.remove(qr3DMesh);
        if (qr3DMesh.geometry) qr3DMesh.geometry.dispose();
        if (qr3DMesh.material) {
            if (qr3DMesh.material.map) qr3DMesh.material.map.dispose();
            qr3DMesh.material.dispose();
        }
        qr3DMesh = null;
    }
    const clearBtn = document.getElementById('btn-clear-qr');
    if (clearBtn) clearBtn.style.display = activeQRStamp ? 'inline-flex' : 'none';

    if (!scene || !activeQRStamp || !activeQRStamp.matrix || typeof THREE === 'undefined') return;
    // Hide floating QR overlay during false-color diagnostic modes so inspectors stay clean
    if (isOverhangWarning || isZebraExposure || isNozzleInspectMode || isDeltaEHeatmap) return;

    const { u0, u1, v0, v1, matrix } = activeQRStamp;
    const size = matrix.length;
    const qz = activeQRStamp.quietModules ?? activeQRStamp.quietZone ?? 4;
    const totalMods = size + qz * 2;
    const texPx = Math.min(512, totalMods * 10);
    const cv = document.createElement('canvas');
    cv.width = texPx;
    cv.height = texPx;
    const ctx = cv.getContext('2d');
    const modPx = texPx / totalMods;

    const darkHex = (filaments[0] && filaments[0].color) ? filaments[0].color : '#111827';
    const lightHex = (filaments[filaments.length - 1] && filaments[filaments.length - 1].color) ? filaments[filaments.length - 1].color : '#ffffff';
    ctx.fillStyle = lightHex;
    ctx.fillRect(0, 0, texPx, texPx);
    ctx.fillStyle = darkHex;
    for (let mr = 0; mr < size; mr++) {
        for (let mc = 0; mc < size; mc++) {
            if (matrix[mr][mc] === 1) {
                ctx.fillRect((mc + qz) * modPx, (mr + qz) * modPx, Math.ceil(modPx), Math.ceil(modPx));
            }
        }
    }

    const tex = new THREE.CanvasTexture(cv);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.LinearFilter;

    const w = config.width || 140, h = config.height || 140;
    const maxZ = Math.max(getEffectiveRearBaseZ() + 0.4, config.maxRelief || 2.4);
    const topo = config.topography || 'flat';
    const segs = 24;
    const plane = new THREE.PlaneGeometry(1, 1, segs, segs);
    const pos = plane.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const lx = pos.getX(i) + 0.5;
        const ly = 0.5 - pos.getY(i);
        const u = u0 + lx * (u1 - u0);
        const v = v0 + ly * (v1 - v0);
        const xMm = (u * 2 - 1) * (w * 0.5);
        const yMm = (1 - v * 2) * (h * 0.5);
        const pt = applyTopographyVertex(xMm, yMm, maxZ + 0.08, w, h, topo, false);
        pos.setXYZ(i, pt[0], pt[1], pt[2]);
    }
    plane.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.55,
        metalness: 0.04,
        wireframe: isWireframe,
        clippingPlanes: clipPlane ? [clipPlane] : []
    });
    qr3DMesh = new THREE.Mesh(plane, mat);
    scene.add(qr3DMesh);
}

// ==========================================
// 🖼️ CAD REAR CAVITIES (REAL MECHANICAL DEPTH), FRAMES & MOUNTING
// ==========================================

function computeRearCavityDepthMm(x, y, topZ, w, h, baseZ) {
    // Never carve flat-plaque rear pockets into cylindrical/curved lamp shades!
    if (config.topography && config.topography !== 'flat') return 0.0;

    let recess = 0.0;
    if (config.nfcPocket && (x * x + y * y) <= 169.0) {
        // Standardized 0.60mm recessed 26mm NFC tag cavity
        recess = Math.max(recess, Math.min(0.60, Math.max(0.45, baseZ - 0.24)));
    }

    const mount = config.mounting || 'flat';
    if (mount === 'keyhole' && h >= 44) {
        // Real printable stepped keyhole slot (head recess 2.2mm deep, narrow neck 4.6mm wide)
        const ky = Math.min(h * 0.5 - 14, h * (config.outlineShape === 'heart' ? 0.14 : 0.28));
        const dyHead = y - (ky - 5.2);
        const dyCap = y - (ky + 6.0);
        const inHead = (x * x + dyHead * dyHead) <= 20.25; // R = 4.5mm (9mm screw head)
        const inStem = Math.abs(x) <= 2.3 && y >= (ky - 5.2) && y <= (ky + 6.0);
        const inCap = (x * x + dyCap * dyCap) <= 5.29;     // R = 2.3mm
        if (inHead || inStem || inCap) {
            recess = Math.max(recess, Math.min(2.20, Math.max(0.50, baseZ - 0.56)));
        }
    } else if ((mount === 'magnets_6' || mount === 'magnets_8' || mount === 'magnets_10') && w >= 42 && h >= 42) {
        const magR = mount === 'magnets_8' ? 4.15 : (mount === 'magnets_10' ? 5.15 : 3.15);
        const targetD = mount === 'magnets_8' ? 3.10 : 2.10;
        const kOff = (!config.outlineShape || config.outlineShape === 'rect') ? 0.34 : 0.22;
        const cx = Math.min(w * kOff, w * 0.5 - magR - 3.5);
        const cy = Math.min(h * kOff, h * 0.5 - magR - 3.5);
        const dx = Math.abs(x) - cx;
        const dy = Math.abs(y) - cy;
        if (dx * dx + dy * dy <= magR * magR) {
            recess = Math.max(recess, Math.min(targetD, Math.max(0.40, baseZ - 0.40)));
        }
    }

    const safeMax = Math.max(0.0, topZ - 0.32);
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
    const uy = Math.sin(thetaRad);
    let lo = 0.04, hi = 1.65;
    for (let it = 0; it < 16; it++) {
        const mid = (lo + hi) * 0.5;
        if (isOutsideOutlineShape(ux * mid, uy * mid, shape, w / Math.max(1, h))) hi = mid;
        else lo = mid;
    }
    return [ux * lo * w * 0.5, uy * lo * h * 0.5];
}

// Non-self-intersecting smooth radial-clamped contour offset for heart, star & all 7 non-rect shapes
function sampleOutlineBoundaryContour(w, h, shape, borderW, overlapIn = 0.60, numSegs = 128) {
    const M = Math.max(24, numSegs);
    const pts = new Array(M);
    for (let i = 0; i < M; i++) {
        const theta = (i / M) * Math.PI * 2;
        pts[i] = sampleOutlineBoundaryPointAtAngle(w, h, shape, theta);
    }
    const isNonConvex = (shape === 'heart' || shape === 'star');
    const innerPts = new Array(M);
    const outerPts = new Array(M);

    // Pure radial scaling for non-convex star/heart guarantees ZERO edge crossings!
    for (let i = 0; i < M; i++) {
        const pCur = pts[i];
        const pLen = Math.hypot(pCur[0], pCur[1]) || 1;
        const rx = pCur[0] / pLen;
        const ry = pCur[1] / pLen;

        if (isNonConvex) {
            const safeIn = Math.min(overlapIn, pLen * 0.25);
            innerPts[i] = [pCur[0] - rx * safeIn, pCur[1] - ry * safeIn];
            outerPts[i] = [pCur[0] + rx * borderW, pCur[1] + ry * borderW];
        } else {
            const pPrev = pts[(i - 1 + M) % M];
            const pNext = pts[(i + 1) % M];
            const tx = pNext[0] - pPrev[0];
            const ty = pNext[1] - pPrev[1];
            const tLen = Math.hypot(tx, ty) || 1;
            const nx = ty / tLen;
            const ny = -tx / tLen;
            innerPts[i] = [pCur[0] - rx * overlapIn, pCur[1] - ry * overlapIn];
            outerPts[i] = [pCur[0] + nx * borderW, pCur[1] + ny * borderW];
        }
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
            const ov = 0.60;
            const innerPts = [[-hw + ov, -hh + ov], [hw - ov, -hh + ov], [hw - ov, hh - ov], [-hw + ov, hh - ov]];
            const outerPts = [[-hw - borderW, -hh - borderW], [hw + borderW, -hh - borderW], [hw + borderW, hh + borderW], [-hw - borderW, hh + borderW]];
            frameTriangles = buildClosedAnnularPrismTris(innerPts, outerPts, 0, borderH, chamferW, chamferZ);
            frameVolMm3 = ((w + borderW * 2) * (h + borderW * 2) - Math.max(1, (w - ov * 2) * (h - ov * 2))) * borderH;
        } else {
            const { innerPts, outerPts } = sampleOutlineBoundaryContour(w, h, shape, borderW, 0.75, 128);
            frameTriangles = buildClosedAnnularPrismTris(innerPts, outerPts, 0, borderH, chamferW, chamferZ);
            let perim = 0;
            for (let i = 0; i < innerPts.length; i++) {
                const j = (i + 1) % innerPts.length;
                perim += Math.hypot(innerPts[j][0] - innerPts[i][0], innerPts[j][1] - innerPts[i][1]);
            }
            frameVolMm3 = perim * (borderW + 0.75) * borderH;
        }
    }

    let mountingTriangles = [];
    let mountVolMm3 = 0;
    const mount = (!options.tileCrop && options.includeMounting !== false) ? (config.mounting || 'flat') : 'flat';

    if (mount === 'hole') {
        // Fix heart eyelet: find true topmost Y of the shape contour instead of landing inside the V-cleft!
        let topX = 0, topY = h * 0.5;
        if (shape === 'heart') {
            let bestY = -Infinity;
            for (let s = 0; s < 64; s++) {
                const a = Math.PI * 0.15 + (s / 63) * Math.PI * 0.70;
                const pt = sampleOutlineBoundaryPointAtAngle(w, h, shape, a);
                if (pt[1] > bestY) { bestY = pt[1]; }
            }
            // Bridge smoothly above the heart cleft at crest height
            topX = 0;
            topY = bestY - 1.5;
        } else {
            const topPt = sampleOutlineBoundaryPointAtAngle(w, h, shape, Math.PI * 0.5);
            topX = topPt[0];
            topY = topPt[1];
        }
        const eyeletY = topY + borderW + 3.4;
        const outerR = 5.2;
        const innerR = 2.3;
        const loopH = Math.max(1.6, Math.min(maxZ, baseZ + 0.8));
        const segs = 32;
        const inPts = [], outPts = [];
        for (let i = 0; i < segs; i++) {
            const a = (i / segs) * Math.PI * 2;
            inPts.push([topX + Math.cos(a) * innerR, eyeletY + Math.sin(a) * innerR]);
            outPts.push([topX + Math.cos(a) * outerR, eyeletY + Math.sin(a) * outerR]);
        }
        mountingTriangles = buildClosedAnnularPrismTris(inPts, outPts, 0, loopH);
        // Add bridge neck connecting eyelet cleanly into heart cleft if heart shape
        if (shape === 'heart') {
            const cleftPt = sampleOutlineBoundaryPointAtAngle(w, h, shape, Math.PI * 0.5);
            const neckTris = createBoxTris(-3.2, 3.2, cleftPt[1] - 1.2, eyeletY - innerR, 0, loopH);
            mountingTriangles = [...mountingTriangles, ...neckTris];
        }
        mountVolMm3 = Math.PI * (outerR * outerR - innerR * innerR) * loopH;
    } else if (mount === 'stand') {
        // Unified Flat-Printable Snap-Fit A-Frame Easel Stand (same real printable geometry in preview & export!)
        const standX = w * 0.5 + borderW + 18;
        const standH = 3.2;
        const outerPts = [
            [standX - 11, -24],
            [standX + 11, -24],
            [standX + 5, 24],
            [standX - 5, 24]
        ];
        const innerPts = [
            [standX - 5.5, -18],
            [standX + 5.5, -18],
            [standX + 1.8, 18],
            [standX - 1.8, 18]
        ];
        // Cradle foot notch on the side for sliding the plaque into the stand
        const cradleSlot = createBoxTris(standX - 11, standX + 11, -27.5, -23.5, 0, standH + 2.2);
        mountingTriangles = [...buildClosedAnnularPrismTris(innerPts, outerPts, 0, standH), ...cradleSlot];
        mountVolMm3 = 480 * standH;
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
    if (config.frameStyle === 'none' && (!config.mounting || config.mounting === 'flat')) return;

    const w = config.width || 140;
    const h = config.height || 140;
    const baseZ = getEffectiveRearBaseZ();
    const maxZ = Math.max(baseZ + 0.4, config.maxRelief || 2.4);
    const cad = buildFrameAndMountingTriangles(w, h, baseZ, maxZ, { includeFrame: true, includeMounting: true });
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

    // Synced with Filament Slot #0 color, live slicer clipPlane & wireframe!
    const baseHex = (filaments[0] && filaments[0].color) ? filaments[0].color : '#111827';
    const frameMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(baseHex),
        roughness: 0.48,
        metalness: 0.08,
        wireframe: isWireframe,
        clippingPlanes: clipPlane ? [clipPlane] : []
    });

    frameMesh = new THREE.Mesh(frameGeom, frameMat);
    scene.add(frameMesh);
}

// ==========================================
// 🎛️ DIMENSIONS, METRICS (CACHED PER FRAME), HUD & SLICER SIM
// ==========================================

const PLA_DENSITY_G_CM3 = 1.24;
const FILAMENT_175_AREA_MM2 = Math.PI * 0.875 * 0.875;

function computeVolumetricFilamentBreakdown() {
    const w = Math.max(20, config.width || 140);
    const h = Math.max(20, config.height || 140);
    const baseZ = getEffectiveRearBaseZ();
    const maxZ = Math.max(baseZ + 0.4, config.maxRelief || 2.4);
    const reliefSpan = maxZ - baseZ;

    const slotVols = new Float64Array(filaments.length);
    const parsedOrig = filaments.map(f => ({ rgb: hexToRgb(f.color) }));
    const baseRgbCache = parsedOrig[0] ? parsedOrig[0].rgb : [17, 24, 39];

    if (heightDataBuffer && processedCanvas.width > 0 && processedCanvas.height > 0) {
        const cols = processedCanvas.width;
        const rows = processedCanvas.height;
        const step = Math.max(1, Math.floor(Math.max(cols, rows) / 72));
        const cellArea = (w / cols) * (h / rows) * step * step;
        const bgRgb = config.removeCanvasBg ? computeBorderBackgroundRGB(colorDataBuffer, cols, rows) : null;

        for (let r = 0; r < rows; r += step) {
            const ny = 1.0 - (r / Math.max(1, rows - 1)) * 2.0;
            for (let c = 0; c < cols; c += step) {
                const pIdx = r * cols + c;
                const nx = (c / Math.max(1, cols - 1)) * 2.0 - 1.0;
                if (isPixelCutoutVoid(c, r, cols, rows, bgRgb, baseRgbCache)) continue;

                const lum = heightDataBuffer[pIdx];
                const zTop = Math.max(baseZ, Math.min(maxZ, baseZ + lum * reliefSpan + (customZDeltaBuffer ? customZDeltaBuffer[pIdx] : 0)));

                if (config.colorMode === 'stratified') {
                    // Exact horizontal band volume integration per filament layer!
                    for (let i = 0; i < filaments.length; i++) {
                        const sZ = (i === 0) ? 0.0 : (baseZ + filaments[i].startPct * reliefSpan);
                        const eZ = (i + 1 < filaments.length) ? (baseZ + filaments[i + 1].startPct * reliefSpan) : maxZ;
                        const dz = Math.max(0, Math.min(zTop, eZ) - sZ);
                        slotVols[i] += dz * cellArea;
                    }
                } else {
                    // Base plate in Slot 0 + colored surface relief in closest filament slot
                    slotVols[0] += baseZ * cellArea;
                    const i4 = pIdx * 4;
                    const sIdx = (filamentSlotBuffer && filamentSlotBuffer[pIdx] < filaments.length)
                        ? filamentSlotBuffer[pIdx]
                        : findClosestFilamentIndex(colorDataBuffer[i4], colorDataBuffer[i4 + 1], colorDataBuffer[i4 + 2], parsedOrig);
                    slotVols[sIdx] += Math.max(0, zTop - baseZ) * cellArea;
                }
            }
        }
    } else {
        slotVols[0] = w * h * baseZ;
    }

    const cad = buildFrameAndMountingTriangles(w, h, baseZ, maxZ, { includeFrame: config.exportIncludeFrame !== false, includeMounting: true });
    if (slotVols.length > 0) {
        slotVols[0] += (cad.frameVolMm3 || 0) + (cad.mountVolMm3 || 0);
    }

    let totalMm3 = 0;
    for (let i = 0; i < slotVols.length; i++) totalMm3 += slotVols[i];
    const totalCm3 = totalMm3 / 1000;
    const totalGrams = totalCm3 * PLA_DENSITY_G_CM3;
    const totalMeters = (totalMm3 / FILAMENT_175_AREA_MM2) / 1000;

    const perSlot = filaments.map((f, idx) => {
        const mm3 = slotVols[idx] || 0;
        const g = (mm3 / 1000) * PLA_DENSITY_G_CM3;
        const m = (mm3 / FILAMENT_175_AREA_MM2) / 1000;
        const { startZ, startLayer } = getSlotStartZAndLayer(idx);
        return {
            index: idx,
            name: f.name,
            color: f.color,
            td: f.td,
            startZ,
            startLayer,
            grams: Math.round(g * 10) / 10,
            meters: Math.round(m * 100) / 100,
            pct: totalMm3 > 0 ? Math.round((mm3 / totalMm3) * 100) : 0
        };
    });

    return { totalMm3, totalCm3, totalGrams, totalMeters, perSlot };
}

function computePrintMetrics() {
    if (_cachedMetricsFrameId === _metricsGeneration && _cachedPrintMetrics) {
        return _cachedPrintMetrics;
    }
    const vol = computeVolumetricFilamentBreakdown();
    const totalLayers = getTotalLayerCount();
    const speedFactor = (config.layerHeight <= 0.04) ? 1.85 : (config.layerHeight <= 0.08 ? 1.15 : 0.85);
    const estMinutes = Math.max(12, Math.round(vol.totalGrams * 2.35 * speedFactor + (filaments.length - 1) * 1.5));
    const estCost = (vol.totalGrams / 1000) * (config.costPerKg || 24.0);

    const totalGramsR = Math.round(vol.totalGrams * 10) / 10;
    const estCostR = Math.round(estCost * 100) / 100;
    const hrs = Math.floor(estMinutes / 60);
    const mins = estMinutes % 60;
    _cachedPrintMetrics = {
        totalLayers,
        totalGrams: totalGramsR,
        weightG: totalGramsR,
        totalMeters: Math.round(vol.totalMeters * 100) / 100,
        estMinutes,
        timeStr: hrs > 0 ? `~${hrs}h ${mins}m` : `~${mins}m`,
        estCost: estCostR,
        costUsd: estCostR,
        perSlot: vol.perSlot
    };
    _cachedMetricsFrameId = _metricsGeneration;
    return _cachedPrintMetrics;
}

function updateDimensions(axis) {
    const inW = document.getElementById('input-width');
    const inH = document.getElementById('input-height');
    const inZ = document.getElementById('input-max-z');
    if (inW) config.width = Math.max(30, Math.min(400, parseFloat(inW.value) || 140));
    if (inH) config.height = Math.max(30, Math.min(400, parseFloat(inH.value) || 140));
    if (inZ) config.maxRelief = Math.max(1.0, Math.min(12.0, parseFloat(inZ.value) || 2.4));

    if (axis === 'width' || axis === 'height') {
        config.aspectPreset = 'custom';
        const sel = document.getElementById('select-aspect-preset');
        if (sel) sel.value = 'auto';
        if (!isDrawingTemplateActive && sourceImage) processSourceImage(true, false);
        if (typeof updateEditorCanvasDisplaySize === 'function') updateEditorCanvasDisplaySize();
        if (isSplitCompareMode) renderSplitCompareSource();
    }
    renderFilamentStackUI();
    requestMeshUpdate();
}

function updateLayerPreset() {
    const lhEl = document.getElementById('select-layer-height');
    const baseEl = document.getElementById('select-base-thickness');
    if (lhEl) config.layerHeight = parseFloat(lhEl.value) || 0.08;
    if (baseEl) config.baseThickness = parseFloat(baseEl.value) || 0.60;
    renderFilamentStackUI();
    requestMeshUpdate();
}

function updateFrameOptions() {
    const fEl = document.getElementById('select-frame-style');
    const mEl = document.getElementById('select-mounting');
    const nfcEl = document.getElementById('chk-nfc-pocket');
    if (fEl) config.frameStyle = fEl.value;
    if (mEl) config.mounting = mEl.value;
    if (nfcEl) config.nfcPocket = nfcEl.checked;
    // Re-sync layer numbers in case keyhole/magnets auto-thickened rear base
    renderFilamentStackUI();
    requestMeshUpdate();
}

function updateHUD() {
    const m = computePrintMetrics();
    const hDims = document.getElementById('hud-dims');
    const hLayers = document.getElementById('hud-layers');
    const hTime = document.getElementById('hud-time');
    const hWeight = document.getElementById('hud-weight');
    const hCost = document.getElementById('hud-cost');
    const effBase = getEffectiveRearBaseZ();
    const effMax = Math.max(effBase + 0.4, config.maxRelief);
    if (hDims) hDims.innerText = `${config.width} × ${config.height} × ${effMax.toFixed(1)} mm`;
    if (hLayers) hLayers.innerText = `${m.totalLayers} (${config.layerHeight}mm)`;
    if (hTime) {
        const hrs = Math.floor(m.estMinutes / 60);
        const mins = m.estMinutes % 60;
        hTime.innerText = hrs > 0 ? `~${hrs}h ${mins}m` : `~${mins}m`;
    }
    if (hWeight) hWeight.innerText = `~${m.totalGrams}g (${m.totalMeters}m)`;
    if (hCost) hCost.innerText = `$${m.estCost.toFixed(2)}`;

    const slicerSlider = document.getElementById('slider-slicer-sim');
    if (slicerSlider) {
        slicerSlider.max = m.totalLayers;
        if (!isSlicerSimulationActive) {
            slicerSlider.value = m.totalLayers;
            currentSimLayer = m.totalLayers;
            const lbl = document.getElementById('val-slicer-sim');
            if (lbl) lbl.innerText = `L${m.totalLayers} / ${m.totalLayers}`;
        }
    }
}

function updateSlicerSimulation(layerNum) {
    const total = getTotalLayerCount();
    const l = Math.max(1, Math.min(total, parseInt(layerNum, 10) || total));
    currentSimLayer = l;
    isSlicerSimulationActive = (l < total);
    const firstH = Math.max(0.08, config.firstLayerHeight || 0.20);
    const layerH = Math.max(0.04, config.layerHeight || 0.08);
    const zMm = (l <= 1) ? firstH : (firstH + (l - 1) * layerH);

    if (clipPlane) {
        const isCurved = config.topography && config.topography !== 'flat';
        if (isCurved) {
            clipPlane.normal.set(0, -1, 0);
            clipPlane.constant = isSlicerSimulationActive ? (-config.height * 0.5 + zMm) : 10000;
        } else {
            clipPlane.normal.set(0, 0, -1);
            clipPlane.constant = isSlicerSimulationActive ? zMm : 10000;
        }
    }
    const lbl = document.getElementById('val-slicer-sim');
    if (lbl) lbl.innerText = `L${l} / ${total} (${zMm.toFixed(2)}mm)`;
    const slider = document.getElementById('slider-slicer-sim');
    if (slider) slider.value = l;
}

function resetSlicerSimulation() {
    if (slicerAnimationTimer) { clearInterval(slicerAnimationTimer); slicerAnimationTimer = null; }
    isSlicerSimulationActive = false;
    const total = getTotalLayerCount();
    updateSlicerSimulation(total);
    const playBtn = document.getElementById('btn-slicer-play');
    if (playBtn) playBtn.innerHTML = '▶';
}

function toggleSlicerAnimation() {
    const playBtn = document.getElementById('btn-slicer-play');
    if (slicerAnimationTimer) {
        clearInterval(slicerAnimationTimer);
        slicerAnimationTimer = null;
        if (playBtn) playBtn.innerHTML = '▶';
        return;
    }
    const total = getTotalLayerCount();
    let cur = (currentSimLayer >= total || currentSimLayer < 1) ? 1 : currentSimLayer;
    if (playBtn) playBtn.innerHTML = '⏸';
    slicerAnimationTimer = setInterval(() => {
        const liveTotal = getTotalLayerCount();
        updateSlicerSimulation(cur);
        cur += Math.max(1, Math.floor(liveTotal / 45));
        if (cur > liveTotal) {
            clearInterval(slicerAnimationTimer);
            slicerAnimationTimer = null;
            updateSlicerSimulation(liveTotal);
            if (playBtn) playBtn.innerHTML = '▶';
        }
    }, 85);
}

// ==========================================
// 🤖 AI DOMINANT PALETTE EXTRACTOR & SPOOL RACK MATCHER
// ==========================================

function extractImageDominantColors(canvasOrImg, numClusters = 5) {
    const tmp = document.createElement('canvas');
    tmp.width = 64; tmp.height = 64;
    const ctx = tmp.getContext('2d');
    ctx.drawImage(canvasOrImg, 0, 0, 64, 64);
    const data = ctx.getImageData(0, 0, 64, 64).data;
    const pixels = [];
    for (let i = 0; i < data.length; i += 8) {
        if (data[i + 3] < 128) continue;
        pixels.push([data[i], data[i + 1], data[i + 2]]);
    }
    if (pixels.length === 0) return [[17, 24, 39], [30, 58, 138], [234, 88, 12], [250, 204, 21], [255, 255, 255]];

    // Luminance-stratified K-means++ initialization
    pixels.sort((a, b) => (0.299 * a[0] + 0.587 * a[1] + 0.114 * a[2]) - (0.299 * b[0] + 0.587 * b[1] + 0.114 * b[2]));
    const centroids = [];
    for (let k = 0; k < numClusters; k++) {
        const p = pixels[Math.min(pixels.length - 1, Math.floor((k / Math.max(1, numClusters - 1)) * (pixels.length - 1)))];
        centroids.push([p[0], p[1], p[2]]);
    }

    for (let iter = 0; iter < 8; iter++) {
        const sums = Array.from({ length: numClusters }, () => [0, 0, 0, 0]);
        for (let i = 0; i < pixels.length; i++) {
            const p = pixels[i];
            let bestK = 0, bestD = Infinity;
            for (let k = 0; k < numClusters; k++) {
                const c = centroids[k];
                const d = colorDistSq(p[0], p[1], p[2], c[0], c[1], c[2]);
                if (d < bestD) { bestD = d; bestK = k; }
            }
            sums[bestK][0] += p[0]; sums[bestK][1] += p[1]; sums[bestK][2] += p[2]; sums[bestK][3]++;
        }
        for (let k = 0; k < numClusters; k++) {
            if (sums[k][3] > 0) {
                centroids[k] = [sums[k][0] / sums[k][3], sums[k][1] / sums[k][3], sums[k][2] / sums[k][3]];
            }
        }
    }

    centroids.sort((a, b) => (0.299 * a[0] + 0.587 * a[1] + 0.114 * a[2]) - (0.299 * b[0] + 0.587 * b[1] + 0.114 * b[2]));
    return centroids;
}

function generateAIPalettesFromImage() {
    const src = (processedCanvas && processedCanvas.width > 0) ? processedCanvas : sourceImage;
    let extractedHex = ['#111827', '#1e3a8a', '#ea580c', '#facc15', '#ffffff'];
    if (src) {
        const dom = extractImageDominantColors(src, 5);
        extractedHex = dom.map(c => rgbToHex(c[0], c[1], c[2]));
    }

    aiPalettesList = [
        {
            title: currentLang === 'fr' ? '🤖 IA Exact (Photo)' : '🤖 AI Photo Match',
            colors: extractedHex.map((hex, i) => ({
                name: i === 0 ? 'Base Dark' : (i === 4 ? 'Top Highlight' : `Tone #${i + 1}`),
                color: hex,
                td: [0.6, 1.8, 3.0, 4.2, 5.2][i] || 3.0,
                startPct: [0.00, 0.22, 0.46, 0.70, 0.88][i] || 0
            }))
        },
        {
            title: '🎞️ Classic B&W / Silver',
            colors: [
                { name: 'Matte Charcoal', color: '#0f1116', td: 0.5, startPct: 0.00 },
                { name: 'Dark Slate', color: '#334155', td: 1.5, startPct: 0.25 },
                { name: 'Silver Grey', color: '#94a3b8', td: 2.8, startPct: 0.55 },
                { name: 'Jade White', color: '#ffffff', td: 5.0, startPct: 0.82 }
            ]
        },
        {
            title: '🔥 Sunset Fire & Gold',
            colors: [
                { name: 'Obsidian Black', color: '#111116', td: 0.6, startPct: 0.00 },
                { name: 'Crimson Red', color: '#b91c1c', td: 3.0, startPct: 0.26 },
                { name: 'Mandarin Orange', color: '#f97316', td: 4.5, startPct: 0.52 },
                { name: 'Sunflower Gold', color: '#facc15', td: 6.0, startPct: 0.74 },
                { name: 'Ivory White', color: '#fffbeb', td: 5.0, startPct: 0.90 }
            ]
        },
        {
            title: '🌃 Cyberpunk Neon',
            colors: [
                { name: 'Void Black', color: '#090910', td: 0.5, startPct: 0.00 },
                { name: 'Indigo Purple', color: '#4c1d95', td: 2.0, startPct: 0.24 },
                { name: 'Hot Magenta', color: '#ec4899', td: 3.5, startPct: 0.52 },
                { name: 'Electric Cyan', color: '#38bdf8', td: 4.5, startPct: 0.76 },
                { name: 'Pure White', color: '#ffffff', td: 5.0, startPct: 0.90 }
            ]
        },
        {
            title: '🏛️ Vintage Sepia Portrait',
            colors: [
                { name: 'Dark Espresso', color: '#1c120c', td: 0.6, startPct: 0.00 },
                { name: 'Cocoa Brown', color: '#6b4226', td: 1.6, startPct: 0.28 },
                { name: 'Caramel Tan', color: '#c29263', td: 3.0, startPct: 0.56 },
                { name: 'Warm Cream', color: '#fef3c7', td: 4.8, startPct: 0.84 }
            ]
        },
        {
            title: '🌊 Ocean Emerald',
            colors: [
                { name: 'Midnight Navy', color: '#0b192c', td: 0.6, startPct: 0.00 },
                { name: 'Deep Teal', color: '#0f766e', td: 2.2, startPct: 0.28 },
                { name: 'Turquoise', color: '#06b6d4', td: 4.2, startPct: 0.58 },
                { name: 'Ice White', color: '#f0f9ff', td: 5.2, startPct: 0.86 }
            ]
        }
    ];
    activeAIPaletteIndex = 0;
    renderAIPalettesUI();
}

function renderAIPalettesUI() {
    const grid = document.getElementById('ai-palettes-grid');
    if (!grid) return;
    grid.innerHTML = '';
    aiPalettesList.forEach((pal, idx) => {
        const card = document.createElement('div');
        card.className = 'ai-palette-card' + (idx === activeAIPaletteIndex ? ' active' : '');
        card.onclick = () => applyAIPalette(idx);
        const strip = pal.colors.map(c => `<div class="ai-palette-color-block" style="background:${window.safeEscapeHtml(c.color)};"></div>`).join('');
        card.innerHTML = `<div class="ai-palette-strip">${strip}</div><div class="ai-palette-title">${window.safeEscapeHtml(pal.title)}</div>`;
        grid.appendChild(card);
    });
}

function applyAIPalette(idx) {
    if (!aiPalettesList[idx]) return;
    activeAIPaletteIndex = idx;
    filaments = aiPalettesList[idx].colors.map(c => ({ ...c }));
    if (activeFilamentSlot >= filaments.length) activeFilamentSlot = filaments.length - 1;
    renderAIPalettesUI();
    renderFilamentStackUI();
    if (typeof updateFilamentSwatchesUI === 'function') updateFilamentSwatchesUI();
    if (typeof render2DEditorPreview === 'function' && centerViewMode === '2d') render2DEditorPreview();
    requestMeshUpdate();
}

function generateNewAIVariations() {
    if (!aiPalettesList.length) { generateAIPalettesFromImage(); return; }
    // Generate chromatic hue/saturation shifts without mutating static base presets!
    const base = aiPalettesList[0];
    if (!base) return;
    const hueShift = (Math.random() - 0.5) * 32;
    const varied = base.colors.map((c, i) => {
        if (i === 0 || i === base.colors.length - 1) return { ...c };
        const rgb = hexToRgb(c.color);
        const r = Math.max(0, Math.min(255, Math.round(rgb[0] + hueShift * 1.1)));
        const g = Math.max(0, Math.min(255, Math.round(rgb[1] - hueShift * 0.45)));
        const b = Math.max(0, Math.min(255, Math.round(rgb[2] - hueShift * 0.9)));
        return { ...c, color: rgbToHex(r, g, b) };
    });
    aiPalettesList[0] = { title: '🎲 ' + (currentLang === 'fr' ? 'Variation IA' : 'AI Variation'), colors: varied };
    applyAIPalette(0);
}

function findClosestRealSpool(hexColor, poolOverride = null) {
    const pool = poolOverride || getAllAvailableSpools();
    const target = hexToRgb(hexColor);
    const targetLab = rgbToLab(target[0], target[1], target[2]);
    let bestIdx = 0, bestDE = Infinity;
    for (let i = 0; i < pool.length; i++) {
        const s = pool[i];
        const rgb = hexToRgb(s.color || s.hex);
        const d = deltaE2000(targetLab, rgbToLab(rgb[0], rgb[1], rgb[2]));
        if (d < bestDE) { bestDE = d; bestIdx = i; }
    }
    return { index: bestIdx, spool: pool[bestIdx], deltaE: bestDE };
}

function matchToRealFilamentSpools() {
    const owned = getOwnedSpools();
    const pool = (config.ownSpoolsOnly && owned.length >= 2) ? owned : getAllAvailableSpools();
    const usedIds = new Set();
    filaments.forEach((fil) => {
        const avail = pool.filter(s => !usedIds.has(s.id));
        const match = findClosestRealSpool(fil.color, avail.length > 0 ? avail : pool);
        if (match && match.spool) {
            fil.name = match.spool.name;
            fil.color = match.spool.color || match.spool.hex;
            fil.td = match.spool.td;
            usedIds.add(match.spool.id);
        }
    });
    renderFilamentStackUI();
    if (typeof updateFilamentSwatchesUI === 'function') updateFilamentSwatchesUI();
    if (typeof render2DEditorPreview === 'function' && centerViewMode === '2d') render2DEditorPreview();
    requestMeshUpdate();
    showToast(config.ownSpoolsOnly && owned.length >= 2
        ? (currentLang === 'fr' ? `🧰 Associé à vos ${owned.length} bobines possédées !` : `🧰 Matched to your ${owned.length} owned spools!`)
        : (translations[currentLang]?.toastSpoolsMatched || 'Matched to real commercial spools!'));
}

function applyCommercialSpoolToSlot(slotIdx, spoolIdOrIdx) {
    const pool = getAllAvailableSpools();
    let spool = pool.find(s => s.id === String(spoolIdOrIdx));
    if (!spool) {
        const idx = parseInt(spoolIdOrIdx, 10);
        if (!isNaN(idx) && idx >= 0 && idx < pool.length) spool = pool[idx];
    }
    if (!spool || !filaments[slotIdx]) return;
    filaments[slotIdx].name = spool.name;
    filaments[slotIdx].color = spool.color || spool.hex;
    filaments[slotIdx].td = spool.td;
    renderFilamentStackUI();
    if (typeof updateFilamentSwatchesUI === 'function') updateFilamentSwatchesUI();
    if (typeof render2DEditorPreview === 'function' && centerViewMode === '2d') render2DEditorPreview();
    requestMeshUpdate();
}

// ==========================================
// 🎚️ INTERACTIVE LAYER EQUALIZER (IN-PLACE DRAG — NO DOM DESTRUCTION!)
// ==========================================

function renderLayerEqualizerUI() {
    const bar = document.getElementById('layer-equalizer-bar');
    if (!bar) return;
    bar.innerHTML = '';

    const n = filaments.length;
    for (let i = 0; i < n; i++) {
        const start = i === 0 ? 0 : Math.round(filaments[i].startPct * 100);
        const end = (i + 1 < n) ? Math.round(filaments[i + 1].startPct * 100) : 100;
        const widthPct = Math.max(2, end - start);
        const seg = document.createElement('div');
        seg.className = 'layer-eq-segment';
        seg.dataset.slotIdx = String(i);
        seg.style.width = `${widthPct}%`;
        seg.style.background = filaments[i].color;
        const { startLayer } = getSlotStartZAndLayer(i);
        seg.title = `${filaments[i].name} — L#${startLayer}`;
        seg.textContent = widthPct >= 12 ? `L${startLayer}` : '';
        bar.appendChild(seg);
    }

    for (let i = 1; i < n; i++) {
        const handle = document.createElement('div');
        handle.className = 'layer-eq-handle';
        handle.dataset.handleIdx = String(i);
        handle.style.left = `${Math.round(filaments[i].startPct * 100)}%`;
        handle.onpointerdown = (e) => startEqualizerDrag(e, i);
        bar.appendChild(handle);
    }
}

function updateEqualizerBarInPlace() {
    const bar = document.getElementById('layer-equalizer-bar');
    if (!bar) return;
    const n = filaments.length;
    const segs = bar.querySelectorAll('.layer-eq-segment');
    const handles = bar.querySelectorAll('.layer-eq-handle');
    for (let i = 0; i < n; i++) {
        const start = i === 0 ? 0 : Math.round(filaments[i].startPct * 100);
        const end = (i + 1 < n) ? Math.round(filaments[i + 1].startPct * 100) : 100;
        const widthPct = Math.max(2, end - start);
        if (segs[i]) {
            segs[i].style.width = `${widthPct}%`;
            const { startLayer } = getSlotStartZAndLayer(i);
            segs[i].textContent = widthPct >= 12 ? `L${startLayer}` : '';
        }
    }
    for (let i = 1; i < n; i++) {
        if (handles[i - 1]) handles[i - 1].style.left = `${Math.round(filaments[i].startPct * 100)}%`;
    }
}

function startEqualizerDrag(e, handleIdx) {
    e.preventDefault();
    const bar = document.getElementById('layer-equalizer-bar');
    if (!bar || handleIdx <= 0 || handleIdx >= filaments.length) return;
    const onMove = (ev) => {
        const rect = bar.getBoundingClientRect();
        if (rect.width <= 0) return;
        const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
        let pct = (clientX - rect.left) / rect.width;
        const minP = filaments[handleIdx - 1].startPct + 0.03;
        const maxP = (handleIdx + 1 < filaments.length) ? (filaments[handleIdx + 1].startPct - 0.03) : 0.96;
        pct = Math.max(minP, Math.min(maxP, pct));
        filaments[handleIdx].startPct = Math.round(pct * 100) / 100;
        updateEqualizerBarInPlace();
        syncFilamentCardThresholdUI(handleIdx);
        requestMeshUpdate();
    };
    const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        if (typeof render2DEditorPreview === 'function' && centerViewMode === '2d') render2DEditorPreview();
        updateColorMatchBadge();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
}

function syncFilamentCardThresholdUI(idx) {
    const cards = document.querySelectorAll('#filament-stack-container .filament-card');
    const card = cards[idx];
    if (!card || !filaments[idx]) return;
    const { startZ, startLayer } = getSlotStartZAndLayer(idx);
    const badge = card.querySelector('.filament-badge-layer');
    const slider = card.querySelector('.range-slider');
    const pctLbl = card.querySelector('.filament-pct-val');
    if (badge) badge.innerText = `#${startLayer} (${startZ.toFixed(2)}mm)`;
    if (slider) slider.value = Math.round(filaments[idx].startPct * 100);
    if (pctLbl) pctLbl.innerText = `${Math.round(filaments[idx].startPct * 100)}%`;
}

// ==========================================
// 🧮 WEB WORKER CIEDE2000 ΔE STACK OPTIMIZER ("PRINT WITH WHAT I OWN")
// ==========================================

function sampleTargetPixelsForOptimizer(maxSamples = 320) {
    if (!colorDataBuffer || !processedCanvas.width) return new Uint8Array(0);
    const w = processedCanvas.width, h = processedCanvas.height;
    const total = w * h;
    const step = Math.max(1, Math.floor(total / maxSamples));
    const out = [];
    for (let p = 0; p < total; p += step) {
        if (cutoutMaskBuffer && cutoutMaskBuffer[p] === 1) continue;
        const i = p * 4;
        out.push(colorDataBuffer[i], colorDataBuffer[i + 1], colorDataBuffer[i + 2]);
    }
    return new Uint8Array(out);
}

function computeStackColorMatchMetrics(customFilaments = null) {
    const list = customFilaments || filaments;
    const samplesFlat = sampleTargetPixelsForOptimizer(180);
    const count = Math.floor(samplesFlat.length / 3);
    if (count === 0 || list.length === 0) return { avgDeltaE: 0, maxDeltaE: 0, matchScorePct: 100 };

    const sortedTD = prepareSortedFilamentsForTD(list);
    const baseZ = getEffectiveRearBaseZ();
    const maxZ = Math.max(baseZ + 0.4, config.maxRelief || 2.4);
    const span = maxZ - baseZ;
    const blend = (config.tdOpticalBlend !== undefined ? config.tdOpticalBlend : 65) / 100;
    let sumDE = 0, maxDE = 0;

    for (let i = 0; i < count; i++) {
        const r = samplesFlat[i * 3], g = samplesFlat[i * 3 + 1], b = samplesFlat[i * 3 + 2];
        const srcLab = rgbToLab(r, g, b);
        let de = 999;
        if (config.colorMode === 'chromatic') {
            for (let k = 0; k < sortedTD.length; k++) {
                const d = deltaE2000(srcLab, sortedTD[k].lab);
                if (d < de) de = d;
            }
        } else {
            const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            const sim = computeBeerLambertTDColor(lum, baseZ + lum * span, baseZ, maxZ, sortedTD, blend, true);
            de = deltaE2000(srcLab, rgbToLab(sim[0], sim[1], sim[2]));
        }
        sumDE += de;
        if (de > maxDE) maxDE = de;
    }
    const avgDeltaE = sumDE / count;
    lastDeltaEStats = {
        avgDeltaE,
        maxDeltaE,
        matchScorePct: Math.max(0, Math.min(100, Math.round(100 - avgDeltaE * 2.15)))
    };
    return lastDeltaEStats;
}

function updateColorMatchBadge() {
    const m = computeStackColorMatchMetrics();
    const badges = [
        document.getElementById('badge-color-match'),
        document.getElementById('color-match-score-badge')
    ].filter(Boolean);
    badges.forEach(badge => {
        badge.innerText = `${m.matchScorePct}% (ΔE ${m.avgDeltaE.toFixed(1)})`;
        badge.style.color = m.matchScorePct >= 82 ? '#10b981' : (m.matchScorePct >= 65 ? '#facc15' : '#f97316');
    });
}

function setOpticalModel(model) {
    const valid = ['kubelka_munk', 'beer_lambert', 'cubic'];
    config.opticalModel = valid.includes(model) ? model : 'kubelka_munk';
    const sel = document.getElementById('select-optical-model');
    if (sel) sel.value = config.opticalModel;
    const txtOpt = document.getElementById('txt-optical-model');
    if (txtOpt) {
        txtOpt.innerText = config.opticalModel === 'kubelka_munk'
            ? 'Kubelka-Munk TD'
            : (config.opticalModel === 'beer_lambert' ? 'Beer-Lambert TD' : (currentLang === 'fr' ? 'Rampe Cubique' : 'Cubic Ramp'));
    }
    if (typeof render2DEditorPreview === 'function' && centerViewMode === '2d') render2DEditorPreview();
    requestMeshUpdate();
    updateColorMatchBadge();
    showToast(`🔬 ${txtOpt ? txtOpt.innerText : config.opticalModel}`);
}

function remapFilamentSlotBuffer(oldToNewMap) {
    if (!filamentSlotBuffer) return;
    for (let i = 0; i < filamentSlotBuffer.length; i++) {
        const v = filamentSlotBuffer[i];
        if (v < 255 && oldToNewMap[v] !== undefined) {
            filamentSlotBuffer[i] = oldToNewMap[v];
        }
    }
}

function autoSolveFilamentStack(useOwnedOverride = null) {
    const useOwned = (useOwnedOverride !== null) ? !!useOwnedOverride : !!config.ownSpoolsOnly;
    const ownedPool = getOwnedSpools();
    if (useOwned && ownedPool.length < 2) {
        showToast(currentLang === 'fr'
            ? '🧰 Ajoutez au moins 2 bobines dans "Mon Rack de Bobines" d’abord !'
            : '🧰 Star at least 2 spools in "My Spool Rack" first!');
        return;
    }

    const rgbFlat = sampleTargetPixelsForOptimizer(280);
    if (rgbFlat.length === 0) return;

    const btn = document.getElementById('btn-auto-solve-stack') || document.getElementById('btn-auto-solve-td');
    if (btn) btn.disabled = true;
    showToast(useOwned
        ? (currentLang === 'fr' ? `🧮 Recherche ΔE2000 parmi vos ${ownedPool.length} bobines...` : `🧮 Running ΔE2000 solver across your ${ownedPool.length} owned spools...`)
        : (currentLang === 'fr' ? '🧮 Optimisation ΔE2000 en arrière-plan...' : '🧮 Running off-thread ΔE2000 optimizer...'));

    const payload = {
        id: ++_computeWorkerJobId,
        type: 'SOLVE_STACK',
        rgbFlat,
        filaments: filaments.map((f, idx) => ({ ...f, origIdx: idx })),
        ownedPool: ownedPool.map(s => ({ name: s.name, brand: s.brand, color: s.color || s.hex, td: s.td })),
        useOwnedRack: useOwned,
        targetSlotCount: Math.max(4, Math.min(6, filaments.length)),
        params: {
            baseZ: getEffectiveRearBaseZ(),
            maxReliefZ: Math.max(getEffectiveRearBaseZ() + 0.4, config.maxRelief || 2.4),
            blendStrength: (config.tdOpticalBlend !== undefined ? config.tdOpticalBlend : 65) / 100,
            opticalModel: config.opticalModel || 'kubelka_munk',
            colorMode: config.colorMode || 'chromatic'
        }
    };

    const applyResult = (res) => {
        if (btn) btn.disabled = false;
        if (!res || !Array.isArray(res.filaments) || res.filaments.length === 0) return;
        const oldToNew = {};
        res.filaments.forEach((f, newIdx) => {
            if (typeof f.origIdx === 'number') oldToNew[f.origIdx] = newIdx;
        });
        if (!useOwned) remapFilamentSlotBuffer(oldToNew);
        filaments = res.filaments.map((f, idx) => ({
            name: f.name,
            color: f.color,
            td: f.td,
            startPct: idx === 0 ? 0.0 : f.startPct
        }));
        if (activeFilamentSlot >= filaments.length) activeFilamentSlot = filaments.length - 1;
        lastDeltaEStats = { avgDeltaE: res.avgDeltaE, maxDeltaE: res.maxDeltaE, matchScorePct: res.matchScorePct };
        renderFilamentStackUI();
        if (typeof updateFilamentSwatchesUI === 'function') updateFilamentSwatchesUI();
        if (typeof render2DEditorPreview === 'function' && centerViewMode === '2d') render2DEditorPreview();
        requestMeshUpdate();
        showToast(currentLang === 'fr'
            ? `✅ Optimisé ΔE2000 : ${res.matchScorePct}% (ΔE moy. ${res.avgDeltaE.toFixed(1)}) !`
            : `✅ ΔE2000 Solved: ${res.matchScorePct}% match (Avg ΔE ${res.avgDeltaE.toFixed(1)})!`);
    };

    try {
        if (typeof Worker !== 'undefined') {
            if (!_computeWorkerInstance) _computeWorkerInstance = new Worker('workers/compute-worker.js');
            const jobId = payload.id;
            const onMsg = (ev) => {
                if (!ev.data || ev.data.id !== jobId) return;
                _computeWorkerInstance.removeEventListener('message', onMsg);
                if (ev.data.ok) applyResult(ev.data.result);
                else { if (btn) btn.disabled = false; }
            };
            _computeWorkerInstance.addEventListener('message', onMsg);
            _computeWorkerInstance.postMessage(payload);
            return;
        }
    } catch (e) {
        console.warn('Compute worker fallback:', e);
    }

    // Synchronous fallback if Workers are unavailable
    const sorted = prepareSortedFilamentsForTD(filaments);
    const n = sorted.length;
    for (let i = 1; i < n; i++) sorted[i].startPct = Math.round((i / n) * 90) / 100;
    const ev = computeStackColorMatchMetrics(sorted);
    applyResult({ filaments: sorted, avgDeltaE: ev.avgDeltaE, maxDeltaE: ev.maxDeltaE, matchScorePct: ev.matchScorePct });
}

// 4-Slot AMS Bay Reuse Plan (ONLY valid in Stratified Layer-Swap mode — never misleading in Chromatic!)
function computeFourSlotAmsPlan(perSlotMetrics = []) {
    if (!filaments || filaments.length <= 4 || config.colorMode === 'chromatic') {
        return { active: false, swaps: [], reason: config.colorMode === 'chromatic' ? 'chromatic_all_layers' : '' };
    }
    const swaps = [];
    for (let extraIdx = 4; extraIdx < filaments.length; extraIdx++) {
        const bayIdx = extraIdx - 4;
        const replacedFil = filaments[bayIdx];
        const nextFil = filaments[extraIdx];
        const finishedByLayer = perSlotMetrics[bayIdx + 1]?.startLayer || getSlotStartZAndLayer(bayIdx + 1).startLayer;
        const neededAtLayer = perSlotMetrics[extraIdx]?.startLayer || getSlotStartZAndLayer(extraIdx).startLayer;
        const windowStart = Math.max(2, finishedByLayer);
        const windowEnd = Math.max(windowStart, neededAtLayer - 1);
        swaps.push({
            amsBay: (bayIdx % 4) + 1,
            fromSlot: bayIdx + 1,
            fromName: replacedFil.name,
            fromColor: replacedFil.color,
            toSlot: extraIdx + 1,
            toName: nextFil.name,
            toColor: nextFil.color,
            windowStartLayer: windowStart,
            windowEndLayer: windowEnd,
            neededAtLayer
        });
    }
    return { active: swaps.length > 0, totalColors: filaments.length, swaps };
}

// ==========================================
// 🔄 SYNC ALL CONTROLS FROM CONFIG (FIXED ALL 6 BROKEN DOM IDS!)
// ==========================================

function syncAllControlsFromConfig() {
    const mapVal = {
        'input-width': config.width,
        'input-height': config.height,
        'input-max-z': config.maxRelief,
        'select-layer-height': config.layerHeight,
        'select-base-thickness': Number(config.baseThickness || 0.60).toFixed(2), // Fixed: matches "0.40"|"0.60"|"0.80"!
        'select-topography': config.topography,
        'select-outline-shape': config.outlineShape,
        'select-frame-style': config.frameStyle,
        'select-mounting': config.mounting,
        'select-color-mode': config.colorMode,
        'select-bg-mode': config.bgMode,
        'select-filament-finish': config.filamentFinish,
        'select-filament-finish-sec2': config.filamentFinish,
        'select-engine-res': config.engineResolution,
        'slider-td-blend': config.tdOpticalBlend,
        'slider-dithering': config.opticalDithering,       // Fixed ID!
        'slider-sharpness': config.detailSharpness,
        'slider-subject-pop': config.subjectPop,           // Fixed ID!
        'slider-color-snap': config.colorSnap,             // Fixed ID!
        'slider-boundary-sharpness': config.boundarySharpness,
        'slider-brightness': config.brightness,
        'slider-contrast': config.contrast,
        'slider-smoothing': config.smoothing,
        'slider-raking-angle': config.rakingLightAngle,
        'slider-raking-elev': config.rakingLightElevation
    };
    Object.entries(mapVal).forEach(([id, v]) => {
        const el = document.getElementById(id);
        if (el && v !== undefined) el.value = String(v);
    });

    const mapChk = {
        'chk-remove-canvas-sec6': !!config.removeCanvasBg, // Fixed ID!
        'chk-nfc-pocket': !!config.nfcPocket,
        'chk-bilateral': !!config.bilateralEdgeLock,       // Fixed ID!
        'chk-boost-fine-lines': !!config.boostFineLines,   // Fixed ID!
        'chk-preserve-eyes': !!config.preserveEyes,
        'chk-layer-ridges': config.layerRidges !== false,
        'chk-layer-ridges-sec2': config.layerRidges !== false,
        'chk-export-quantize': config.exportQuantize !== false,
        'chk-export-frame': config.exportIncludeFrame !== false,
        'chk-export-adaptive': config.adaptiveMesh !== false,
        'chk-own-spools-only': !!config.ownSpoolsOnly
    };
    Object.entries(mapChk).forEach(([id, b]) => {
        const el = document.getElementById(id);
        if (el) el.checked = b;
    });

    syncQualityControlsUI();
    if (typeof syncRemoveCanvasUI === 'function') syncRemoveCanvasUI();
    applyLightboxKelvinToScene();
    updateRakingLightPosition();
}

// ==========================================
// 🎨 DYNAMIC FILAMENT STACK UI (SAFE ESCAPING + 250+ SPOOLS + OWNED RACK)
// ==========================================

function renderFilamentStackUI() {
    const container = document.getElementById('filament-stack-container');
    if (!container) return;
    container.innerHTML = '';

    const allSpools = getAllAvailableSpools();
    const ownedList = getOwnedSpools();

    filaments.forEach((fil, idx) => {
        const card = document.createElement('div');
        card.className = 'filament-card';

        const { startZ, startLayer } = getSlotStartZAndLayer(idx);
        const startHeight = startZ.toFixed(2);
        const safeName = window.safeEscapeHtml(fil.name);
        const safeColor = /^#[0-9a-f]{6}$/i.test(String(fil.color || '')) ? fil.color : '#111827';

        // Group owned spools at the top of the selector, followed by grouped brand spools
        let spoolOptionsHTML = `<option value="">-- ${currentLang === 'fr' ? 'Choisir bobine (250+)' : 'Pick Commercial Spool (250+)'} --</option>`;
        if (ownedList.length > 0) {
            spoolOptionsHTML += `<optgroup label="⭐ ${currentLang === 'fr' ? 'Mon Rack de Bobines' : 'My Spool Rack'} (${ownedList.length})">`;
            ownedList.forEach(sp => {
                const sel = (sp.name === fil.name && (sp.color || sp.hex).toLowerCase() === safeColor.toLowerCase()) ? 'selected' : '';
                spoolOptionsHTML += `<option value="${window.safeEscapeHtml(sp.id)}" ${sel}>⭐ ${window.safeEscapeHtml(sp.name)} (TD ${sp.td}mm)</option>`;
            });
            spoolOptionsHTML += `</optgroup>`;
        }
        // Group catalog by brand
        const byBrand = new Map();
        allSpools.forEach(sp => {
            if (!byBrand.has(sp.brand)) byBrand.set(sp.brand, []);
            byBrand.get(sp.brand).push(sp);
        });
        byBrand.forEach((list, brand) => {
            spoolOptionsHTML += `<optgroup label="${window.safeEscapeHtml(brand)}">`;
            list.forEach(sp => {
                const sel = (sp.name === fil.name) ? 'selected' : '';
                spoolOptionsHTML += `<option value="${window.safeEscapeHtml(sp.id)}" ${sel}>${window.safeEscapeHtml(sp.shortName || sp.name)} (TD ${sp.td}mm)</option>`;
            });
            spoolOptionsHTML += `</optgroup>`;
        });

        card.innerHTML = `
            <div class="filament-color-preview" style="background-color:${safeColor};">
                <input type="color" class="filament-color-input" value="${safeColor}" onchange="changeFilamentColor(${idx}, this.value)">
            </div>
            <div class="filament-info">
                <div class="filament-name-row">
                    <span class="filament-title" title="${safeName}">${safeName}</span>
                    <div style="display:flex;align-items:center;gap:5px;">
                        <div class="filament-td-pill" title="Transmission Distance (mm)">
                            <span>TD:</span>
                            <input type="number" step="0.1" min="0.2" max="15.0" value="${fil.td ?? 3.0}" onchange="changeFilamentTD(${idx}, this.value)">
                        </div>
                        <span class="filament-badge-layer">#${startLayer} (${startHeight}mm)</span>
                        ${filaments.length > 2 && idx > 0 ? `<button type="button" class="btn-remove-filament" onclick="removeFilament(${idx})" title="Remove Filament">&times;</button>` : ''}
                    </div>
                </div>
                <div class="filament-slider-row">
                    <input type="range" class="range-slider" min="0" max="100" value="${Math.round((idx === 0 ? 0 : fil.startPct) * 100)}"
                        ${idx === 0 ? 'disabled style="opacity:0.4;"' : ''}
                        oninput="changeFilamentThreshold(${idx}, this.value)">
                    <span class="filament-pct-val" style="font-size:0.75rem;color:var(--text-sub);min-width:30px;">${Math.round((idx === 0 ? 0 : fil.startPct) * 100)}%</span>
                </div>
                <div class="spool-brand-row">
                    <select class="spool-select-mini" onchange="if(this.value) applyCommercialSpoolToSlot(${idx}, this.value)" title="Select Commercial Filament Spool (250+ spools)">
                        ${spoolOptionsHTML}
                    </select>
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    const btnAdd = document.getElementById('btn-add-filament');
    if (btnAdd) btnAdd.style.display = filaments.length >= 6 ? 'none' : 'flex';

    renderLayerEqualizerUI();
    updateColorMatchBadge();
    if (typeof populateOutlineSlotDropdowns === 'function') populateOutlineSlotDropdowns();
}

function changeFilamentColor(idx, newColor) {
    if (!filaments[idx]) return;
    filaments[idx].color = newColor;
    renderFilamentStackUI();
    if (typeof updateFilamentSwatchesUI === 'function') updateFilamentSwatchesUI();
    if (typeof render2DEditorPreview === 'function' && centerViewMode === '2d') render2DEditorPreview();
    requestMeshUpdate();
}

function changeFilamentTD(idx, newTD) {
    if (!filaments[idx]) return;
    const parsed = parseFloat(newTD);
    filaments[idx].td = Number.isFinite(parsed) ? Math.max(0.2, Math.min(15.0, parsed)) : 2.0;
    updateColorMatchBadge();
    if (typeof render2DEditorPreview === 'function' && centerViewMode === '2d') render2DEditorPreview();
    requestMeshUpdate();
}

function changeFilamentThreshold(idx, newPct) {
    if (!filaments[idx] || idx <= 0) return;
    let pct = (parseFloat(newPct) || 0) / 100.0;
    const minP = filaments[idx - 1].startPct + 0.03;
    const maxP = idx < filaments.length - 1 ? (filaments[idx + 1].startPct - 0.03) : 0.96;
    pct = Math.max(minP, Math.min(maxP, pct));
    filaments[idx].startPct = Math.round(pct * 100) / 100;
    syncFilamentCardThresholdUI(idx);
    updateEqualizerBarInPlace();
    updateColorMatchBadge();
    if (typeof render2DEditorPreview === 'function' && centerViewMode === '2d') render2DEditorPreview();
    requestMeshUpdate();
}

function addFilament() {
    if (filaments.length >= 6) return;
    const lastPct = filaments[filaments.length - 1].startPct;
    // Ensure strictly unique spacing even when lastPct is near 0.92
    let newPct = Math.min(0.95, lastPct + 0.08);
    if (newPct <= lastPct + 0.02) {
        for (let i = 1; i < filaments.length; i++) {
            filaments[i].startPct = Math.round(filaments[i].startPct * 0.88 * 100) / 100;
        }
        newPct = 0.92;
    }
    filaments.push({
        id: Date.now(),
        name: currentLang === 'fr' ? `Couleur #${filaments.length + 1}` : `Color #${filaments.length + 1}`,
        color: '#e2e8f0',
        startPct: Math.round(newPct * 100) / 100,
        td: 4.5
    });
    renderFilamentStackUI();
    if (typeof updateFilamentSwatchesUI === 'function') updateFilamentSwatchesUI();
    if (typeof render2DEditorPreview === 'function' && centerViewMode === '2d') render2DEditorPreview();
    requestMeshUpdate();
}

function removeFilament(idx) {
    if (filaments.length <= 2 || idx <= 0 || idx >= filaments.length) return;
    // Remap user-painted filamentSlotBuffer indices cleanly!
    if (filamentSlotBuffer) {
        for (let i = 0; i < filamentSlotBuffer.length; i++) {
            const s = filamentSlotBuffer[i];
            if (s === 255) continue;
            if (s === idx) filamentSlotBuffer[i] = Math.max(0, idx - 1);
            else if (s > idx) filamentSlotBuffer[i] = s - 1;
        }
    }
    filaments.splice(idx, 1);
    if (activeFilamentSlot >= filaments.length) activeFilamentSlot = filaments.length - 1;
    renderFilamentStackUI();
    if (typeof updateFilamentSwatchesUI === 'function') updateFilamentSwatchesUI();
    if (typeof render2DEditorPreview === 'function' && centerViewMode === '2d') render2DEditorPreview();
    requestMeshUpdate();
}

function assignEyedropperColor() {
    const targetSlot = Math.max(0, Math.min(filaments.length - 1, activeFilamentSlot));
    if (filaments[targetSlot]) {
        filaments[targetSlot].color = eyedropperColor;
    }
    renderFilamentStackUI();
    if (typeof updateFilamentSwatchesUI === 'function') updateFilamentSwatchesUI();
    if (typeof render2DEditorPreview === 'function' && centerViewMode === '2d') render2DEditorPreview();
    requestMeshUpdate();
    showToast(`${translations[currentLang]?.toastColorAssigned || 'Assigned'} → Slot #${targetSlot + 1} (${eyedropperColor})`);
}

// ==========================================
// 📋 SLICER CHEAT SHEET TABLE & M600 / AMS SWAP SCRIPT
// ==========================================

function updateSlicerTable() {
    const tbody = document.getElementById('slicer-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const metrics = computePrintMetrics();
    const perSlot = metrics.perSlot || [];

    filaments.forEach((fil, idx) => {
        const slotStats = perSlot[idx] || {};
        const { startZ, startLayer } = getSlotStartZAndLayer(idx);
        const startHeight = startZ.toFixed(2);
        const safeName = window.safeEscapeHtml(fil.name);
        const safeColor = /^#[0-9a-f]{6}$/i.test(String(fil.color || '')) ? fil.color : '#111827';
        const gText = slotStats.grams !== undefined ? `${slotStats.grams}g (${slotStats.pct}%)` : '—';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>#${idx + 1}</strong></td>
            <td><span class="color-dot" style="background:${safeColor};"></span>${safeName}</td>
            <td>${(fil.td || 1.5).toFixed(1)} mm</td>
            <td><strong>${idx === 0 ? 'Layer #1 (Start)' : `Layer #${startLayer}`}</strong></td>
            <td>${startHeight} mm</td>
            <td>${gText}</td>
        `;
        tbody.appendChild(tr);
    });

    // Optional NFC pause & 4-Slot AMS bay reuse notes
    const notesEl = document.getElementById('slicer-extra-notes');
    if (notesEl) {
        const notes = [];
        if (config.nfcPocket && (!config.topography || config.topography === 'flat')) {
            const nfcPauseL = heightToLayerNumber(0.60, true);
            notes.push(`📡 <strong>NFC Cavity (26×0.60mm):</strong> ${currentLang === 'fr' ? `Insérez une pause à la couche #${nfcPauseL} (0.60mm) pour poser le tag NFC.` : `Add a pause at Layer #${nfcPauseL} (0.60mm) to drop in your 25mm NFC tag.`}`);
        }
        const amsPlan = computeFourSlotAmsPlan(perSlot);
        if (amsPlan.active) {
            amsPlan.swaps.forEach(sw => {
                notes.push(`🔄 <strong>4-Slot AMS Bay #${sw.amsBay}:</strong> ${currentLang === 'fr'
                    ? `Après couche #${sw.windowStartLayer}, remplacez ${window.safeEscapeHtml(sw.fromName)} par ${window.safeEscapeHtml(sw.toName)} avant couche #${sw.neededAtLayer}.`
                    : `After Layer #${sw.windowStartLayer}, swap ${window.safeEscapeHtml(sw.fromName)} → ${window.safeEscapeHtml(sw.toName)} before Layer #${sw.neededAtLayer}.`}`);
            });
        }
        notesEl.innerHTML = notes.join('<br>');
        notesEl.style.display = notes.length ? 'block' : 'none';
    }
}

function generateSlicerScriptText() {
    const m = computePrintMetrics();
    const firstH = (config.firstLayerHeight || 0.20).toFixed(2);
    const layerH = (config.layerHeight || 0.08).toFixed(2);
    const effBase = getEffectiveRearBaseZ();
    const effMax = Math.max(effBase + 0.4, config.maxRelief || 2.4);

    let txt = `============================================================\n`;
    txt += `STUDIOS-PRO FILAMENT PAINTING — SLICER & SWAP INSTRUCTIONS\n`;
    txt += `============================================================\n`;
    txt += `Mode: ${(config.colorMode || 'chromatic').toUpperCase()} | Optical Model: ${(config.opticalModel || 'kubelka_munk').toUpperCase()}\n`;
    txt += `Dimensions: ${config.width} x ${config.height} x ${effMax.toFixed(2)} mm (Topography: ${config.topography})\n`;
    txt += `Recommended Slicer Profile:\n`;
    txt += `  - Infill: 100% Rectilinear (CRITICAL for optical TD accuracy)\n`;
    txt += `  - First Layer Height: ${firstH} mm\n`;
    txt += `  - Layer Height: ${layerH} mm\n`;
    txt += `  - Wall Loops: 1 | Top Shell Layers: 0 | Bottom Shell Layers: 1\n`;
    txt += `  - Total Layers: ${m.totalLayers} | Est. Weight: ~${m.totalGrams}g (${m.totalMeters}m)\n\n`;

    txt += `FILAMENT LAYER SWAP SCHEDULE:\n`;
    filaments.forEach((f, idx) => {
        const { startZ, startLayer } = getSlotStartZAndLayer(idx);
        if (idx === 0) {
            txt += `  [Slot 1] START Layer #1 (0.00 mm)  -> ${f.name} [${f.color}] (TD ${f.td}mm)\n`;
        } else {
            txt += `  [Slot ${idx + 1}] SWAP  Layer #${startLayer} (${startZ.toFixed(2)} mm) -> ${f.name} [${f.color}] (TD ${f.td}mm)  ; M600 / T${idx}\n`;
        }
    });

    if (config.nfcPocket && (!config.topography || config.topography === 'flat')) {
        const nfcL = heightToLayerNumber(0.60, true);
        txt += `\nNFC TAG PAUSE:\n  - Insert M0/M600 pause at Layer #${nfcL} (Z = 0.60 mm) to place 25mm NFC sticker.\n`;
    }

    const amsPlan = computeFourSlotAmsPlan(m.perSlot);
    if (amsPlan.active) {
        txt += `\n4-SLOT AMS BAY REUSE SCHEDULE (${amsPlan.totalColors} colors):\n`;
        amsPlan.swaps.forEach(sw => {
            txt += `  - AMS Bay #${sw.amsBay}: After Layer #${sw.windowStartLayer} (before Layer #${sw.neededAtLayer}), swap "${sw.fromName}" -> "${sw.toName}"\n`;
        });
    }
    return txt;
}

function downloadSlicerGcodeScript() {
    const txt = generateSlicerScriptText();
    downloadFileDirect(new Blob([txt], { type: 'text/plain;charset=utf-8' }), `StudiosPro_Swap_Guide_${Date.now()}.txt`);
    showToast(currentLang === 'fr' ? '📄 Guide de changement de couche téléchargé !' : '📄 Layer Swap Guide downloaded!');
}

function copySlicerGcodeScript() {
    const txt = generateSlicerScriptText();
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(txt)
            .then(() => showToast(translations[currentLang]?.toastCopied || 'Copied to clipboard!'))
            .catch(() => showToast(currentLang === 'fr' ? 'Copie bloquée par le navigateur.' : 'Clipboard access blocked.'));
    } else {
        showToast(currentLang === 'fr' ? 'Presse-papiers indisponible.' : 'Clipboard API unavailable.');
    }
}
