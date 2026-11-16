// ==========================================
// 🚀 APP CORE: 3D SCENE, 35 DEMO MODELS, HUD, SHORTCUTS & BOOTSTRAP
// ==========================================

let gridHelper = null;
let bedOutline = null;
let isWireframe = false;
let isGridVisible = true;
let toastTimeout = null;
let animationLoopStarted = false;
let isContextLost = false;
let pointerDirty = false;
let dirLight1 = null;
let dirLight2 = null;
let ambientLight = null;

function init3D() {
    const container = document.getElementById('viewport-container');
    const canvas = document.getElementById('viewport-canvas');
    if (!container || !canvas) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color('#0B1120');

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 2500);
    camera.position.set(55, 48, 72);

    renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    renderer.localClippingEnabled = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // WebGL Context Lost / Restored recovery (preserves painted geometry cleanly)
    canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        isContextLost = true;
        showToast('WebGL context interrupted — recovering GPU state...');
    }, false);
    canvas.addEventListener('webglcontextrestored', () => {
        isContextLost = false;
        if (typeof updateMeshVisualColors === 'function') updateMeshVisualColors();
        showToast('GPU context restored!');
    }, false);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 1.05;
    controls.panSpeed = 0.85;
    controls.minDistance = 4;
    controls.maxDistance = 600;
    if (controls.mouseButtons) {
        controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
        controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;
        controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
    }

    // Studio 3-point lighting
    ambientLight = new THREE.AmbientLight(0xffffff, 0.62);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x0f172a, 0.35);
    scene.add(hemiLight);

    dirLight1 = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight1.position.set(60, 110, 80);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 1024;
    dirLight1.shadow.mapSize.height = 1024;
    scene.add(dirLight1);

    dirLight2 = new THREE.DirectionalLight(0x93c5fd, 0.42);
    dirLight2.position.set(-70, 35, -60);
    scene.add(dirLight2);

    // 256mm x 256mm Print Bed Grid (Bambu Lab X1/P1/A1 standard reference)
    gridHelper = new THREE.GridHelper(256, 25, 0x38bdf8, 0x1e293b);
    gridHelper.position.y = -0.02;
    scene.add(gridHelper);

    const bedEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(256, 0.2, 256));
    bedOutline = new THREE.LineSegments(
        bedEdges,
        new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.3 })
    );
    bedOutline.position.y = -0.12;
    scene.add(bedOutline);

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', onKeyDown);

    // Bind Canvas Pointer Events for Painting & Controls
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    if (typeof initBrushHelper === 'function') initBrushHelper();

    if (!animationLoopStarted) {
        animationLoopStarted = true;
        animate();
    }
}

function animate() {
    requestAnimationFrame(animate);
    if (isContextLost || !renderer || !scene || !camera) return;
    if (controls) controls.update();
    if (pointerDirty) {
        pointerDirty = false;
        const hit = typeof getRaycastIntersection === 'function' ? getRaycastIntersection() : null;
        if (typeof updateBrushHelperWithHit === 'function') updateBrushHelperWithHit(hit);
        if (typeof isPainting !== 'undefined' && isPainting && hit && typeof paintStroke === 'function') {
            paintStroke(hit);
        }
    }
    renderer.render(scene, camera);
    if (typeof isColorByNumbersActive !== 'undefined' && isColorByNumbersActive && typeof updateColorByNumbersOverlay === 'function') {
        updateColorByNumbersOverlay();
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

function resetCamera() {
    if (!camera || !controls) return;
    if (!currentMesh || !currentMesh.geometry) {
        camera.position.set(55, 48, 72);
        controls.target.set(0, 15, 0);
        controls.update();
        return;
    }

    const box = new THREE.Box3().setFromObject(currentMesh);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z, 10);
    const fov = camera.fov * (Math.PI / 180);
    const dist = Math.max(22, (maxDim / 2) / Math.tan(fov / 2) * 1.65);

    controls.target.copy(center);
    camera.position.set(center.x + dist * 0.72, center.y + dist * 0.45, center.z + dist * 0.92);
    controls.update();
}

function zoomCamera(factor) {
    if (!camera || !controls) return;
    const dir = new THREE.Vector3().subVectors(camera.position, controls.target);
    dir.multiplyScalar(factor);
    const len = dir.length();
    if (len >= controls.minDistance && len <= controls.maxDistance) {
        camera.position.copy(controls.target).add(dir);
        controls.update();
    }
}

function rotateCameraStep(deg) {
    if (!camera || !controls) return;
    const rad = (deg * Math.PI) / 180;
    const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rad);
    camera.position.copy(controls.target).add(offset);
    controls.update();
}

function toggleWireframe() {
    isWireframe = !isWireframe;
    if (currentMesh && currentMesh.material) {
        currentMesh.material.wireframe = isWireframe;
        currentMesh.material.needsUpdate = true;
    }
    const btn = document.getElementById('btn-wireframe');
    if (btn) btn.classList.toggle('active', isWireframe);
    updateHUDLabels();
}

function toggleGrid() {
    isGridVisible = !isGridVisible;
    if (gridHelper) gridHelper.visible = isGridVisible;
    if (bedOutline) bedOutline.visible = isGridVisible;
    const btn = document.getElementById('btn-grid');
    if (btn) btn.classList.toggle('active', isGridVisible);
    updateHUDLabels();
}

function updateHUDLabels() {
    const hudWire = document.getElementById('hud-wireframe');
    if (hudWire) hudWire.innerHTML = `${t('hudWireframe', 'Wireframe: ')}<strong>${isWireframe ? 'ON' : 'OFF'}</strong>`;

    const hudGrid = document.getElementById('hud-grid');
    if (hudGrid) hudGrid.innerHTML = `${t('hudGrid', 'Grid: ')}<strong>${isGridVisible ? 'ON' : 'OFF'}</strong>`;

    const hudSym = document.getElementById('hud-symmetry');
    if (hudSym && typeof symmetryAxis !== 'undefined') {
        hudSym.innerHTML = `${t('hudSymmetry', 'Mirror: ')}<strong>${symmetryAxis === 'none' ? 'OFF' : symmetryAxis.toUpperCase()}</strong>`;
    }

    const hudBack = document.getElementById('hud-backface');
    if (hudBack && typeof isBackfaceProtected !== 'undefined') {
        hudBack.innerHTML = `${t('hudBackface', 'Front-Only: ')}<strong>${isBackfaceProtected ? 'ON' : 'OFF'}</strong>`;
    }

    const hudAdaptive = document.getElementById('hud-adaptive');
    if (hudAdaptive && typeof isAdaptiveBrushEnabled !== 'undefined') {
        hudAdaptive.innerHTML = `${t('hudAutoSplit', 'Adaptive Brush: ')}<strong>${isAdaptiveBrushEnabled ? 'ON' : 'OFF'}</strong>`;
    }
}

function showToast(msg) {
    const el = document.getElementById('toast-notification');
    if (!el) return;
    const txt = document.getElementById('toast-text');
    if (txt) txt.textContent = msg;
    else el.textContent = msg;

    el.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        el.classList.remove('show');
    }, 3200);
}

// ==========================================
// DRAG & DROP + FILE UPLOAD
// ==========================================

function setupDragAndDrop() {
    const dropOverlay = document.getElementById('dropzone-overlay');
    const fileInput = document.getElementById('file-input');

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (file && typeof loadFile === 'function') {
                if (typeof currentModelTitle !== 'undefined') currentModelTitle = file.name;
                loadFile(file);
            }
            fileInput.value = '';
        });
    }

    let dragCounter = 0;
    window.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dragCounter++;
        if (dropOverlay) dropOverlay.classList.add('dragover');
    });
    window.addEventListener('dragover', (e) => {
        e.preventDefault();
    });
    window.addEventListener('dragleave', () => {
        dragCounter = Math.max(0, dragCounter - 1);
        if (dragCounter === 0 && dropOverlay) dropOverlay.classList.remove('dragover');
    });
    window.addEventListener('drop', (e) => {
        e.preventDefault();
        dragCounter = 0;
        if (dropOverlay) dropOverlay.classList.remove('dragover');
        const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (file && typeof loadFile === 'function') {
            if (typeof currentModelTitle !== 'undefined') currentModelTitle = file.name;
            loadFile(file);
        }
    });
}

// ==========================================
// KEYBOARD SHORTCUTS
// ==========================================

function onKeyDown(e) {
    const tag = e.target && e.target.tagName ? e.target.tagName.toUpperCase() : '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target && e.target.isContentEditable)) {
        if (e.key === 'Escape') e.target.blur();
        return;
    }

    const key = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
            if (typeof redoColor === 'function') redoColor();
        } else {
            if (typeof undoColor === 'function') undoColor();
        }
        return;
    }
    if ((e.ctrlKey || e.metaKey) && key === 'y') {
        e.preventDefault();
        if (typeof redoColor === 'function') redoColor();
        return;
    }

    switch (key) {
        case 'v': selectTool('view'); break;
        case 'b': selectTool('brush'); break;
        case 'l': selectTool('line'); break;
        case 'f': selectTool('bucket'); break;
        case 'w': selectTool('wand'); break;
        case 'i': selectTool('dropper'); break;
        case 'e': selectTool('eraser'); break;
        case 't': if (typeof openTextModal === 'function') openTextModal(); break;
        case 'r': if (typeof openReliefModal === 'function') openReliefModal(); break;
        case 'c': if (typeof openCavityModal === 'function') openCavityModal(); break;
        case 'm': if (typeof oneClickMedallionMaster === 'function') oneClickMedallionMaster(); break;
        case 'p': if (typeof openDecalModal === 'function') openDecalModal(); break;
        case 's': if (typeof openStencilModal === 'function') openStencilModal(); break;
        case 'k': if (typeof openSplitterModal === 'function') openSplitterModal(); break;
        case 'a': if (typeof openAutoPaintAIModal === 'function') openAutoPaintAIModal(); break;
        case ' ':
            e.preventDefault();
            resetCamera();
            break;
        case '[': {
            const sl = document.getElementById('slider-brush-size');
            if (sl) setBrushRadius(Math.max(parseFloat(sl.min) || 0.2, parseFloat(sl.value) - 1));
            break;
        }
        case ']': {
            const sl = document.getElementById('slider-brush-size');
            if (sl) setBrushRadius(Math.min(parseFloat(sl.max) || 50, parseFloat(sl.value) + 1));
            break;
        }
    }
}

// ==========================================
// SHARE DESIGN MODAL
// ==========================================

function openShareDesignModal() {
    const modal = document.getElementById('share-design-modal');
    const urlInput = document.getElementById('share-link-input');
    if (urlInput) urlInput.value = window.location.href;
    if (modal) modal.classList.add('open');
    if (typeof refreshIcons === 'function') refreshIcons();
}

function closeShareDesignModal() {
    const modal = document.getElementById('share-design-modal');
    if (modal) modal.classList.remove('open');
}

function downloadShareSnapshot() {
    if (!renderer || !scene || !camera) return;
    renderer.render(scene, camera);
    renderer.domElement.toBlob((blob) => {
        if (!blob) return;
        if (typeof downloadBlob === 'function') {
            downloadBlob(blob, 'StudiosPro_MultiColor_Creation.png');
        }
        showToast(t('toastSnapshotSaved', 'HD Design photo saved!'));
    }, 'image/png');
}

function copyShareLink() {
    const urlInput = document.getElementById('share-link-input');
    const txt = urlInput ? urlInput.value : window.location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(() => {
            showToast(t('toastLinkCopied', 'Link copied to clipboard!'));
        }).catch(() => {});
    }
}

function triggerNativeShare() {
    if (navigator.share) {
        navigator.share({
            title: 'Studios-Pro MultiColor 3MF Painter',
            text: 'Check out my multi-color 3D printable design!',
            url: window.location.href
        }).catch(() => {});
    } else {
        copyShareLink();
    }
}

// ==========================================
// MOBILE RESPONSIVE STUDIO SWITCHER
// ==========================================

function setMobileView(view) {
    const tabPanel = document.getElementById('tab-mobile-panel');
    const tabCanvas = document.getElementById('tab-mobile-canvas');
    const bar = document.getElementById('mobile-filament-bar');
    const isPanel = (view === 'panel');

    document.body.classList.toggle('mobile-view-panel', isPanel);
    document.body.classList.toggle('mobile-view-canvas', !isPanel);
    if (tabPanel) tabPanel.classList.toggle('active', isPanel);
    if (tabCanvas) tabCanvas.classList.toggle('active', !isPanel);
    if (bar) bar.style.display = (window.innerWidth <= 900 && !isPanel) ? 'flex' : 'none';
    setTimeout(onWindowResize, 50);
}

function updateMobileFilamentBar() {
    const bar = document.getElementById('mobile-filament-bar');
    if (!bar || !Array.isArray(filamentSlots)) return;
    bar.innerHTML = filamentSlots.map((slot, i) => `
        <button class="mobile-color-chip ${i === activeSlotIndex ? 'active' : ''}"
                style="background:${slot.color}"
                title="${slot.name}"
                onclick="selectSlot(${i})"></button>
    `).join('');
}

// ==========================================
// DEMO GALLERY FILTER & PROCEDURAL 35 GEOMETRY GENERATOR
// ==========================================

function filterDemoCategory(cat, btn) {
    document.querySelectorAll('.demo-filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    document.querySelectorAll('.demo-card').forEach(card => {
        const cardCat = card.dataset.cat || 'all';
        card.style.display = (cat === 'all' || cardCat === cat) ? 'block' : 'none';
    });
}

function makePart(geom, tx = 0, ty = 0, tz = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, slot = null) {
    const g = geom.index ? geom.toNonIndexed() : geom.clone();
    if (sx !== 1 || sy !== 1 || sz !== 1) g.scale(sx, sy, sz);
    if (rx !== 0) g.rotateX(rx);
    if (ry !== 0) g.rotateY(ry);
    if (rz !== 0) g.rotateZ(rz);
    if (tx !== 0 || ty !== 0 || tz !== 0) g.translate(tx, ty, tz);
    g.computeVertexNormals();
    if (slot !== null) g.userData = { slot };
    return g;
}

function combineGeometries(geoms) {
    let totalVerts = 0;
    const prepared = [];
    for (const src of geoms) {
        if (!src) continue;
        const g = src.index ? src.toNonIndexed() : src;
        if (src.userData && src.userData.slot !== undefined) {
            g.userData = { slot: src.userData.slot };
        }
        const pos = g.attributes.position;
        if (!pos) continue;
        totalVerts += pos.count;
        prepared.push(g);
    }

    const positions = new Float32Array(totalVerts * 3);
    const triCount = Math.floor(totalVerts / 3);
    const preColors = new Uint8Array(triCount);
    let vOffset = 0;
    let tOffset = 0;

    for (const g of prepared) {
        const pos = g.attributes.position.array;
        positions.set(pos, vOffset * 3);
        const tris = Math.floor(g.attributes.position.count / 3);
        const s = (g.userData && typeof g.userData.slot === 'number') ? g.userData.slot : 0;
        for (let t = 0; t < tris; t++) preColors[tOffset + t] = s;
        vOffset += g.attributes.position.count;
        tOffset += tris;
    }

    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    out.computeVertexNormals();
    out.computeBoundingBox();
    // Center X/Z and place flush on bed Y=0
    const cx = (out.boundingBox.min.x + out.boundingBox.max.x) * 0.5;
    const cz = (out.boundingBox.min.z + out.boundingBox.max.z) * 0.5;
    const minY = out.boundingBox.min.y;
    out.translate(-cx, -minY, -cz);
    out.computeBoundingBox();
    out.userData = { preColors };
    return out;
}

function loadDemoModel(name) {
    const P = [];
    const B = (w, h, d) => new THREE.BoxGeometry(w, h, d, 2, 2, 2);
    const S = (r, ws = 24, hs = 18) => new THREE.SphereGeometry(r, ws, hs);
    const C = (rt, rb, h, seg = 24) => new THREE.CylinderGeometry(rt, rb, h, seg, 1);
    const T = (r, tube, rs = 14, ts = 32) => new THREE.TorusGeometry(r, tube, rs, ts);
    const Co = (r, h, seg = 24) => new THREE.ConeGeometry(r, h, seg);

    switch (name) {
        case 'robot':
            P.push(makePart(B(16, 18, 12), 0, 17, 0, 0, 0, 0, 1, 1, 1, 0)); // torso
            P.push(makePart(B(11, 10, 10), 0, 32, 0, 0, 0, 0, 1, 1, 1, 1)); // head
            P.push(makePart(B(8, 3, 2.5), 0, 33, 5.2, 0, 0, 0, 1, 1, 1, 2)); // visor
            P.push(makePart(C(0.7, 0.7, 5, 12), 0, 39.5, 0, 0, 0, 0, 1, 1, 1, 3)); // antenna stem
            P.push(makePart(S(1.6, 16, 12), 0, 42.5, 0, 0, 0, 0, 1, 1, 1, 2)); // antenna ball
            P.push(makePart(B(8, 8, 2), 0, 18, 6.2, 0, 0, 0, 1, 1, 1, 1)); // chest plate
            P.push(makePart(C(2.2, 2.2, 13, 16), -11, 17, 0, 0, 0, 0.12, 1, 1, 1, 3)); // left arm
            P.push(makePart(C(2.2, 2.2, 13, 16), 11, 17, 0, 0, 0, -0.12, 1, 1, 1, 3)); // right arm
            P.push(makePart(B(4.5, 8, 5), -4.2, 4, 0, 0, 0, 0, 1, 1, 1, 0)); // left leg
            P.push(makePart(B(4.5, 8, 5), 4.2, 4, 0, 0, 0, 0, 1, 1, 1, 0)); // right leg
            break;

        case 'mech':
            P.push(makePart(B(20, 18, 14), 0, 20, 0, 0, 0, 0, 1, 1, 1, 0)); // core chassis
            P.push(makePart(B(8, 9, 9), 0, 31, 1, 0, 0, 0, 1, 1, 1, 1)); // cockpit head
            P.push(makePart(B(6, 2.5, 2), 0, 31.5, 5.5, 0, 0, 0, 1, 1, 1, 2)); // optical slit
            P.push(makePart(B(9, 10, 11), -15, 24, 0, 0, 0, 0.15, 1, 1, 1, 1)); // shoulder L
            P.push(makePart(B(9, 10, 11), 15, 24, 0, 0, 0, -0.15, 1, 1, 1, 1)); // shoulder R
            P.push(makePart(C(1.8, 2.2, 14, 16), -15, 29, 4, Math.PI / 2, 0, 0, 1, 1, 1, 3)); // cannon L
            P.push(makePart(C(1.8, 2.2, 14, 16), 15, 29, 4, Math.PI / 2, 0, 0, 1, 1, 1, 3)); // cannon R
            P.push(makePart(B(6.5, 12, 8), -6.5, 6, 0, 0, 0, 0, 1, 1, 1, 0));
            P.push(makePart(B(6.5, 12, 8), 6.5, 6, 0, 0, 0, 0, 1, 1, 1, 0));
            break;

        case 'android':
            P.push(makePart(C(7, 5, 17, 24), 0, 19, 0, 0, 0, 0, 1, 1, 1, 0));
            P.push(makePart(S(6, 28, 22), 0, 33, 0, 0, 0, 0, 0.9, 1.1, 0.95, 1));
            P.push(makePart(C(5.2, 5.2, 3.2, 24), 0, 33.5, 0.8, Math.PI / 2, 0, 0, 1, 0.4, 1, 2));
            P.push(makePart(new THREE.OctahedronGeometry(3.2, 0), 0, 21, 5.4, 0, 0, 0, 1, 1, 0.6, 2));
            P.push(makePart(C(2.2, 1.6, 14, 16), -9.5, 19, 0, 0, 0, 0.22, 1, 1, 1, 1));
            P.push(makePart(C(2.2, 1.6, 14, 16), 9.5, 19, 0, 0, 0, -0.22, 1, 1, 1, 1));
            P.push(makePart(C(3, 4.5, 11, 20), 0, 5.5, 0, 0, 0, 0, 1, 1, 1, 0));
            break;

        case 'drone':
            P.push(makePart(B(14, 5, 16), 0, 6, 0, 0, 0, 0, 1, 1, 1, 0));
            P.push(makePart(S(3.2, 20, 16), 0, 5.5, 8.5, 0, 0, 0, 1, 1, 1, 2)); // camera gimbal
            for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
                P.push(makePart(B(14, 2, 2.5), sx * 10, 6, sz * 10, 0, sx * sz * -Math.PI / 4, 0, 1, 1, 1, 3));
                P.push(makePart(C(2.2, 2.5, 4, 16), sx * 15, 7, sz * 15, 0, 0, 0, 1, 1, 1, 1));
                P.push(makePart(T(6.5, 0.8, 10, 24), sx * 15, 8.5, sz * 15, Math.PI / 2, 0, 0, 1, 1, 1, 2));
            }
            break;

        case 'rocket':
            P.push(makePart(C(7, 8, 24, 32), 0, 18, 0, 0, 0, 0, 1, 1, 1, 0)); // fuselage
            P.push(makePart(Co(7.05, 12, 32), 0, 36, 0, 0, 0, 0, 1, 1, 1, 1)); // nose cone
            P.push(makePart(C(4.5, 6.5, 5, 24), 0, 3.5, 0, 0, 0, 0, 1, 1, 1, 3)); // nozzle
            P.push(makePart(T(3.5, 0.9, 12, 24), 0, 21, 7.2, 0, 0, 0, 1, 1, 1, 2)); // porthole rim
            P.push(makePart(S(2.8, 16, 12), 0, 21, 7.1, 0, 0, 0, 1, 1, 0.35, 2)); // porthole glass
            for (let k = 0; k < 4; k++) {
                const ang = (k * Math.PI) / 2;
                P.push(makePart(B(1.8, 11, 7), Math.sin(ang) * 9, 8.5, Math.cos(ang) * 9, 0, ang, 0, 1, 1, 1, 1));
            }
            break;

        case 'ufo':
            P.push(makePart(S(20, 36, 20), 0, 6, 0, 0, 0, 0, 1, 0.26, 1, 0)); // saucer hull
            P.push(makePart(S(9.5, 28, 18), 0, 9.5, 0, 0, 0, 0, 1, 0.85, 1, 2)); // glass dome
            P.push(makePart(T(19.5, 1.1, 12, 36), 0, 6, 0, Math.PI / 2, 0, 0, 1, 1, 1, 1)); // rim ring
            for (let k = 0; k < 8; k++) {
                const a = (k * Math.PI * 2) / 8;
                P.push(makePart(S(1.6, 12, 10), Math.cos(a) * 14, 7.5, Math.sin(a) * 14, 0, 0, 0, 1, 1, 1, 1));
            }
            P.push(makePart(C(3, 5, 4, 24), 0, 2, 0, 0, 0, 0, 1, 1, 1, 3));
            break;

        case 'alien':
            P.push(makePart(C(5.2, 4, 15, 24), 0, 13, 0, 0, 0, 0, 1, 1, 0.75, 0));
            P.push(makePart(S(9.5, 28, 22), 0, 28, 0, 0.15, 0, 0, 0.9, 1.25, 1.05, 0));
            P.push(makePart(S(3.2, 18, 14), -3.8, 28, 8.2, 0, -0.3, -0.35, 1.25, 0.65, 0.55, 2));
            P.push(makePart(S(3.2, 18, 14), 3.8, 28, 8.2, 0, 0.3, 0.35, 1.25, 0.65, 0.55, 2));
            P.push(makePart(C(1.6, 1.4, 13, 12), -7.2, 13, 0, 0, 0, 0.22, 1, 1, 1, 1));
            P.push(makePart(C(1.6, 1.4, 13, 12), 7.2, 13, 0, 0, 0, -0.22, 1, 1, 1, 1));
            P.push(makePart(C(5, 6.5, 5, 24), 0, 2.5, 0, 0, 0, 0, 1, 1, 1, 3));
            break;

        case 'xenomorph':
            P.push(makePart(C(5.5, 4, 16, 24), 0, 14, 0, 0, 0, 0, 1, 1, 0.85, 0));
            P.push(makePart(S(7.5, 24, 18), 0, 29, -4, -0.2, 0, 0, 0.75, 0.85, 1.9, 0));
            P.push(makePart(B(4, 3, 5), 0, 25, 7, 0, 0, 0, 1, 1, 1, 3));
            for (let i = 0; i < 4; i++) {
                P.push(makePart(B(2.2, 5.5, 2), 0, 21 - i * 3.5, -5.5, -0.4, 0, 0, 1, 1, 1, 1));
            }
            P.push(makePart(C(6, 7.5, 4, 24), 0, 2, 0, 0, 0, 0, 1, 1, 1, 3));
            break;

        case 'cyclops':
            P.push(makePart(S(11, 28, 22), 0, 18, 0, 0, 0, 0, 1, 1.15, 1, 0));
            P.push(makePart(S(5.2, 22, 18), 0, 20, 8.8, 0, 0, 0, 1, 1, 0.65, 1));
            P.push(makePart(S(2.4, 16, 12), 0, 20, 11.4, 0, 0, 0, 1, 1, 0.5, 2));
            for (let k = 0; k < 6; k++) {
                const a = (k * Math.PI * 2) / 6;
                P.push(makePart(C(2.2, 1.0, 10, 16), Math.cos(a) * 8, 5, Math.sin(a) * 8, Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4, 1, 1, 1, 1));
            }
            break;

        case 'tripod':
            P.push(makePart(S(11, 28, 20), 0, 26, 0, 0, 0, 0, 1.15, 0.68, 1.15, 0));
            P.push(makePart(S(3.2, 16, 14), 0, 26, 11, 0, 0, 0, 1, 1, 0.7, 2));
            for (let k = 0; k < 3; k++) {
                const a = (k * Math.PI * 2) / 3;
                P.push(makePart(C(1.8, 1.2, 25, 16), Math.cos(a) * 9.5, 12, Math.sin(a) * 9.5, -Math.sin(a) * 0.28, 0, Math.cos(a) * 0.28, 1, 1, 1, 3));
                P.push(makePart(C(2.8, 3.2, 2.5, 16), Math.cos(a) * 13, 1.25, Math.sin(a) * 13, 0, 0, 0, 1, 1, 1, 1));
            }
            break;

        case 'astronaut':
            P.push(makePart(B(14, 16, 10), 0, 16, 0, 0, 0, 0, 1, 1, 1, 1)); // white suit
            P.push(makePart(B(11, 13, 6), 0, 17, -7, 0, 0, 0, 1, 1, 1, 0)); // backpack
            P.push(makePart(S(8.5, 28, 22), 0, 31, 0, 0, 0, 0, 1, 1, 1, 1)); // helmet
            P.push(makePart(S(6.5, 24, 18), 0, 31, 3.4, 0, 0, 0, 1.02, 0.85, 0.85, 2)); // gold visor
            P.push(makePart(C(2.4, 2.2, 12, 16), -9.5, 17, 0, 0, 0, 0.25, 1, 1, 1, 1));
            P.push(makePart(C(2.4, 2.2, 12, 16), 9.5, 17, 0, 0, 0, -0.25, 1, 1, 1, 1));
            P.push(makePart(C(2.8, 3.2, 9, 16), -4, 4.5, 0, 0, 0, 0, 1, 1, 1, 1));
            P.push(makePart(C(2.8, 3.2, 9, 16), 4, 4.5, 0, 0, 0, 0, 1, 1, 1, 1));
            break;

        case 'knight':
            P.push(makePart(C(10, 11, 20, 28), 0, 12, 0, 0, 0, 0, 1, 1, 1.05, 0));
            P.push(makePart(S(10, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), 0, 22, 0, 0, 0, 0, 1, 0.9, 1.05, 0));
            P.push(makePart(B(11, 3, 5), 0, 17, 9, 0, 0, 0, 1, 1, 1, 2)); // visor
            P.push(makePart(B(3, 8, 14), 0, 30, -1, 0.2, 0, 0, 1, 1, 1, 1)); // red plume
            P.push(makePart(C(11, 12.5, 3, 28), 0, 1.5, 0, 0, 0, 0, 1, 1, 1, 3));
            break;

        case 'wizard':
            P.push(makePart(C(5, 11, 20, 24), 0, 10, 0, 0, 0, 0, 1, 1, 1, 0)); // robe
            P.push(makePart(S(5.2, 22, 16), 0, 23, 0, 0, 0, 0, 1, 1, 1, 3)); // head
            P.push(makePart(Co(4.5, 7, 16), 0, 20, 3.5, Math.PI, 0, 0, 1, 1, 0.7, 1)); // beard
            P.push(makePart(C(11, 11, 1.6, 28), 0, 27, 0, 0, 0, 0, 1, 1, 1, 2)); // brim
            P.push(makePart(Co(6.2, 16, 24), 0, 35, 0, -0.15, 0, 0, 1, 1, 1, 2)); // pointy hat
            P.push(makePart(C(1, 1, 26, 12), 11, 13, 2, 0, 0, 0, 1, 1, 1, 3)); // staff
            P.push(makePart(new THREE.OctahedronGeometry(2.6, 0), 11, 27.5, 2, 0, 0, 0, 1, 1.2, 1, 1)); // crystal
            break;

        case 'ninja':
            P.push(makePart(B(13, 16, 9), 0, 16, 0, 0, 0, 0, 1, 1, 1, 0));
            P.push(makePart(S(6.5, 24, 18), 0, 29, 0, 0, 0, 0, 1, 1, 1, 0));
            P.push(makePart(B(8, 2.4, 2), 0, 29.5, 5.8, 0, 0, 0, 1, 1, 1, 2)); // eye slit
            P.push(makePart(T(6.6, 0.9, 10, 24), 0, 31.5, 0, Math.PI / 2, 0, 0, 1, 1, 1, 1)); // headband
            P.push(makePart(B(1.4, 24, 2), 0, 22, -6.5, 0, 0, 0.55, 1, 1, 1, 3)); // katana 1
            P.push(makePart(B(1.4, 24, 2), 0, 22, -6.5, 0, 0, -0.55, 1, 1, 1, 3)); // katana 2
            P.push(makePart(B(4.2, 8, 5), -3.8, 4, 0, 0, 0, 0, 1, 1, 1, 0));
            P.push(makePart(B(4.2, 8, 5), 3.8, 4, 0, 0, 0, 0, 1, 1, 1, 0));
            break;

        case 'moai':
            P.push(makePart(B(16, 30, 14), 0, 15, 0, -0.06, 0, 0, 1, 1, 1, 0));
            P.push(makePart(B(17, 4, 15.5), 0, 25, 1.2, 0, 0, 0, 1, 1, 1, 0)); // brow ridge
            P.push(makePart(B(4.5, 12, 6), 0, 17, 8, -0.15, 0, 0, 1, 1, 1, 1)); // nose
            P.push(makePart(B(10, 2.5, 3), 0, 8, 6.8, 0, 0, 0, 1, 1, 1, 1)); // lips
            P.push(makePart(C(6.8, 7.5, 7, 20), 0, 33.5, -0.5, 0, 0, 0, 1, 1, 1, 2)); // pukao topknot
            break;

        case 'chess':
            P.push(makePart(C(11, 12.5, 4, 32), 0, 2, 0, 0, 0, 0, 1, 1, 1, 0));
            P.push(makePart(C(6, 10, 8, 32), 0, 8, 0, 0, 0, 0, 1, 1, 1, 0));
            P.push(makePart(C(5, 6.5, 17, 32), 0, 20.5, 0, 0, 0, 0, 1, 1, 1, 0));
            P.push(makePart(T(6.2, 1.3, 12, 32), 0, 29, 0, Math.PI / 2, 0, 0, 1, 1, 1, 1));
            P.push(makePart(C(7.5, 5.2, 6.5, 32), 0, 33, 0, 0, 0, 0, 1, 1, 1, 1));
            P.push(makePart(B(2.2, 7.5, 2.2), 0, 40, 0, 0, 0, 0, 1, 1, 1, 2));
            P.push(makePart(B(6.5, 2.2, 2.2), 0, 41, 0, 0, 0, 0, 1, 1, 1, 2));
            break;

        case 'trophy':
            P.push(makePart(B(16, 6, 16), 0, 3, 0, 0, 0, 0, 1, 1, 1, 3)); // base plinth
            P.push(makePart(C(3.5, 5.5, 10, 24), 0, 11, 0, 0, 0, 0, 1, 1, 1, 1)); // stem
            P.push(makePart(C(11, 4.5, 16, 32), 0, 24, 0, 0, 0, 0, 1, 1, 1, 1)); // cup
            P.push(makePart(T(11, 1.1, 12, 32), 0, 32, 0, Math.PI / 2, 0, 0, 1, 1, 1, 2)); // rim
            P.push(makePart(T(5.5, 1.4, 12, 24, Math.PI), -10.5, 25, 0, 0, 0, Math.PI / 2, 1, 1, 1, 1));
            P.push(makePart(T(5.5, 1.4, 12, 24, Math.PI), 10.5, 25, 0, 0, 0, -Math.PI / 2, 1, 1, 1, 1));
            break;

        case 'cat':
            P.push(makePart(S(11, 28, 22), 0, 12, 0, 0, 0, 0, 1, 1.05, 0.95, 0));
            P.push(makePart(S(9.5, 28, 22), 0, 27, 0.5, 0, 0, 0, 1.05, 0.92, 0.95, 0));
            P.push(makePart(Co(3.6, 7.5, 16), -6.5, 36.5, 0.5, 0, 0, 0.25, 1, 1, 0.7, 1));
            P.push(makePart(Co(3.6, 7.5, 16), 6.5, 36.5, 0.5, 0, 0, -0.25, 1, 1, 0.7, 1));
            P.push(makePart(T(7.2, 1.2, 12, 28), 0, 20, 0, Math.PI / 2, 0, 0, 1, 1, 1, 1)); // collar
            P.push(makePart(S(2.2, 16, 12), 0, 18.5, 7.5, 0, 0, 0, 1, 1, 1, 2)); // gold bell
            P.push(makePart(S(1.4, 12, 10), 0, 26.5, 9.2, 0, 0, 0, 1, 1, 1, 1)); // nose
            break;

        case 'bear':
            P.push(makePart(S(10.5, 28, 20), 0, 11.5, 0, 0, 0, 0, 1, 1.1, 0.95, 0));
            P.push(makePart(S(9, 28, 20), 0, 26, 0.5, 0, 0, 0, 1, 0.95, 0.95, 0));
            P.push(makePart(S(3.2, 16, 14), -7, 33.5, 0, 0, 0, 0, 1, 1, 0.6, 1));
            P.push(makePart(S(3.2, 16, 14), 7, 33.5, 0, 0, 0, 0, 1, 1, 0.6, 1));
            P.push(makePart(S(4.2, 20, 16), 0, 24.5, 7.8, 0, 0, 0, 1.1, 0.85, 0.85, 1)); // muzzle
            P.push(makePart(S(1.5, 12, 10), 0, 25.5, 11.2, 0, 0, 0, 1, 1, 1, 3)); // nose
            P.push(makePart(S(4, 16, 14), -6.5, 3.5, 5, 0, 0, 0, 1, 0.75, 1.3, 1));
            P.push(makePart(S(4, 16, 14), 6.5, 3.5, 5, 0, 0, 0, 1, 0.75, 1.3, 1));
            break;

        case 'panda':
            P.push(makePart(S(11, 28, 22), 0, 11.5, 0, 0, 0, 0, 1, 1.05, 0.95, 1)); // white torso
            P.push(makePart(S(9.5, 28, 22), 0, 26, 0.8, 0, 0, 0, 1.05, 0.95, 0.95, 1)); // white head
            P.push(makePart(S(3.4, 16, 14), -7.2, 33.5, 0, 0, 0, 0, 1, 1, 0.6, 0)); // black ears
            P.push(makePart(S(3.4, 16, 14), 7.2, 33.5, 0, 0, 0, 0, 1, 1, 0.6, 0));
            P.push(makePart(S(2.8, 16, 12), -3.8, 27, 8.8, 0, 0, -0.3, 1.15, 0.85, 0.55, 0)); // eye patches
            P.push(makePart(S(2.8, 16, 12), 3.8, 27, 8.8, 0, 0, 0.3, 1.15, 0.85, 0.55, 0));
            P.push(makePart(C(1.2, 1.2, 20, 12), 10.5, 14, 5, 0, 0, -0.15, 1, 1, 1, 2)); // bamboo stalk
            P.push(makePart(S(4.2, 16, 14), -6.5, 3.5, 4.5, 0, 0, 0, 1, 0.8, 1.2, 0));
            P.push(makePart(S(4.2, 16, 14), 6.5, 3.5, 4.5, 0, 0, 0, 1, 0.8, 1.2, 0));
            break;

        case 'penguin':
            P.push(makePart(S(11, 28, 22), 0, 15, 0, 0, 0, 0, 1, 1.35, 0.95, 0));
            P.push(makePart(S(8.5, 24, 18), 0, 13.5, 3.8, 0, 0, 0, 0.95, 1.1, 0.78, 1)); // white belly
            P.push(makePart(Co(2.6, 6, 16), 0, 25, 10.5, Math.PI / 2, 0, 0, 1, 1, 0.7, 2)); // beak
            P.push(makePart(S(3.2, 14, 12), -11, 15, 0, 0, 0, 0.45, 0.35, 2.2, 0.75, 0)); // flipper L
            P.push(makePart(S(3.2, 14, 12), 11, 15, 0, 0, 0, -0.45, 0.35, 2.2, 0.75, 0)); // flipper R
            P.push(makePart(B(5.5, 2, 7.5), -4.5, 1, 3, 0, 0.25, 0, 1, 1, 1, 2)); // foot L
            P.push(makePart(B(5.5, 2, 7.5), 4.5, 1, 3, 0, -0.25, 0, 1, 1, 1, 2)); // foot R
            break;

        case 'duck':
            P.push(makePart(S(11, 28, 22), 0, 9.5, -1, 0, 0, 0, 0.95, 0.8, 1.3, 2));
            P.push(makePart(S(7.5, 24, 20), 0, 21, 7.5, 0, 0, 0, 1, 1, 1, 2));
            P.push(makePart(S(4.2, 18, 14), 0, 19.5, 14.5, 0, 0, 0, 1.15, 0.42, 1.1, 1)); // orange beak
            P.push(makePart(S(3.5, 14, 12), -8.5, 11, -1, 0, 0, 0.2, 0.45, 0.9, 1.5, 2));
            P.push(makePart(S(3.5, 14, 12), 8.5, 11, -1, 0, 0, -0.2, 0.45, 0.9, 1.5, 2));
            break;

        case 'frog':
            P.push(makePart(S(11, 28, 20), 0, 8, 0, 0, 0, 0, 1.15, 0.72, 1.15, 2));
            P.push(makePart(S(8, 22, 16), 0, 6.2, 2.2, 0, 0, 0, 1, 0.65, 1, 1)); // pale belly
            P.push(makePart(S(3.6, 18, 14), -5.2, 15.5, 6.5, 0, 0, 0, 1, 1, 1, 2)); // eye bulb L
            P.push(makePart(S(3.6, 18, 14), 5.2, 15.5, 6.5, 0, 0, 0, 1, 1, 1, 2)); // eye bulb R
            P.push(makePart(S(1.8, 12, 10), -5.2, 15.8, 9.2, 0, 0, 0, 1, 1, 0.6, 0)); // pupil
            P.push(makePart(S(1.8, 12, 10), 5.2, 15.8, 9.2, 0, 0, 0, 1, 1, 0.6, 0));
            P.push(makePart(B(5, 2, 7), -9, 1, 5, 0, 0.4, 0, 1, 1, 1, 2));
            P.push(makePart(B(5, 2, 7), 9, 1, 5, 0, -0.4, 0, 1, 1, 1, 2));
            break;

        case 'owl':
            P.push(makePart(C(11, 12, 3, 24), 0, 1.5, 0, 0, 0, 0, 1, 1, 1, 3)); // wood perch
            P.push(makePart(S(10, 28, 20), 0, 14, 0, 0, 0, 0, 1, 1.25, 0.95, 0));
            P.push(makePart(S(8.2, 24, 18), 0, 27.5, 0.5, 0, 0, 0, 1.05, 0.95, 0.95, 0));
            P.push(makePart(Co(2.8, 6.5, 12), -6.2, 35.5, 0.5, 0, 0, 0.35, 1, 1, 1, 1)); // ear tuft L
            P.push(makePart(Co(2.8, 6.5, 12), 6.2, 35.5, 0.5, 0, 0, -0.35, 1, 1, 1, 1)); // ear tuft R
            P.push(makePart(T(3.1, 0.8, 10, 20), -3.5, 28, 7.8, 0, 0, 0, 1, 1, 1, 2));
            P.push(makePart(T(3.1, 0.8, 10, 20), 3.5, 28, 7.8, 0, 0, 0, 1, 1, 1, 2));
            P.push(makePart(Co(2, 4, 12), 0, 26.2, 9.8, Math.PI * 0.75, 0, 0, 1, 1, 1, 2)); // beak
            break;

        case 'whale':
            P.push(makePart(S(12, 32, 24), 0, 10, 2, 0, 0, 0, 0.9, 0.82, 1.55, 0));
            P.push(makePart(S(10.5, 28, 20), 0, 6.8, 3.2, 0, 0, 0, 0.85, 0.65, 1.4, 1)); // underbelly
            P.push(makePart(B(16, 1.6, 7), 0, 10, -18, 0.25, 0, 0, 1, 1, 1, 0)); // tail fluke
            P.push(makePart(B(8, 1.5, 4.5), -11, 7, 3, 0, 0.3, -0.25, 1, 1, 1, 0));
            P.push(makePart(S(2.2, 12, 10), 0, 20, 6, 0, 0, 0, 1, 1.6, 1, 2)); // splash
            break;

        case 'dino':
            P.push(makePart(S(10, 24, 18), 0, 14, -2, 0.35, 0, 0, 0.85, 1.25, 1.15, 2));
            P.push(makePart(B(11, 10, 14), 0, 27, 7, 0, 0, 0, 1, 1, 1, 2)); // head
            P.push(makePart(B(9, 3, 12), 0, 21.5, 8, 0.15, 0, 0, 1, 1, 1, 1)); // jaw
            P.push(makePart(Co(3.8, 16, 18), 0, 10, -14, -Math.PI * 0.42, 0, 0, 1, 1, 1, 2)); // tail
            P.push(makePart(B(4.5, 9, 6), -5.5, 4.5, -1, 0, 0, 0, 1, 1, 1, 2));
            P.push(makePart(B(4.5, 9, 6), 5.5, 4.5, -1, 0, 0, 0, 1, 1, 1, 2));
            break;

        case 'dragon':
            P.push(makePart(new THREE.IcosahedronGeometry(10.5, 1), 0, 13, 0, 0, 0, 0, 0.9, 1.2, 1.1, 1));
            P.push(makePart(new THREE.IcosahedronGeometry(7.2, 1), 0, 27, 4, 0, 0, 0, 0.9, 0.95, 1.2, 1));
            P.push(makePart(Co(2.2, 11, 6), -4.5, 35, 1, -0.35, 0, 0.35, 1, 1, 1, 2));
            P.push(makePart(Co(2.2, 11, 6), 4.5, 35, 1, -0.35, 0, -0.35, 1, 1, 1, 2));
            for (let s = 0; s < 4; s++) {
                P.push(makePart(Co(2.2, 5.5, 5), 0, 23 - s * 4.5, -7 - s * 1.2, -1.1, 0, 0, 1, 1, 1, 2));
            }
            break;

        case 'cottage':
            P.push(makePart(B(22, 15, 18), 0, 7.5, 0, 0, 0, 0, 1, 1, 1, 1)); // walls
            P.push(makePart(Co(17.5, 13, 4), 0, 21.5, 0, 0, Math.PI / 4, 0, 1, 1, 1, 2)); // roof
            P.push(makePart(B(3.5, 8, 3.5), 6, 23, -4, 0, 0, 0, 1, 1, 1, 0)); // chimney
            P.push(makePart(B(5, 9, 1.5), 0, 4.5, 9.2, 0, 0, 0, 1, 1, 1, 3)); // door
            P.push(makePart(B(4, 4, 1.4), -6.5, 8, 9.2, 0, 0, 0, 1, 1, 1, 2));
            P.push(makePart(B(4, 4, 1.4), 6.5, 8, 9.2, 0, 0, 0, 1, 1, 1, 2));
            break;

        case 'castle':
            P.push(makePart(C(11, 12.5, 24, 28), 0, 12, 0, 0, 0, 0, 1, 1, 1, 3));
            P.push(makePart(C(13, 12.5, 4, 28), 0, 25, 0, 0, 0, 0, 1, 1, 1, 0));
            for (let k = 0; k < 8; k++) {
                const a = (k * Math.PI * 2) / 8;
                P.push(makePart(B(3.5, 4, 3.5), Math.cos(a) * 11, 29, Math.sin(a) * 11, 0, -a, 0, 1, 1, 1, 3));
            }
            P.push(makePart(Co(10, 12, 24), 0, 32, 0, 0, 0, 0, 1, 1, 1, 1));
            P.push(makePart(B(5.5, 9, 2), 0, 4.5, 11.8, 0, 0, 0, 1, 1, 1, 0));
            break;

        case 'lighthouse':
            P.push(makePart(C(13, 14, 3, 28), 0, 1.5, 0, 0, 0, 0, 1, 1, 1, 3));
            P.push(makePart(C(7.5, 11, 14, 28), 0, 10, 0, 0, 0, 0, 1, 1, 1, 1));
            P.push(makePart(C(5.8, 7.5, 12, 28), 0, 23, 0, 0, 0, 0, 1, 1, 1, 2));
            P.push(makePart(C(8, 8, 2, 28), 0, 30, 0, 0, 0, 0, 1, 1, 1, 3));
            P.push(makePart(C(5.2, 5.2, 6, 24), 0, 34, 0, 0, 0, 0, 1, 1, 1, 2)); // beacon glass
            P.push(makePart(Co(6.5, 6, 24), 0, 40, 0, 0, 0, 0, 1, 1, 1, 1)); // roof
            break;

        case 'car':
            P.push(makePart(B(16, 7, 30), 0, 6.5, 0, 0, 0, 0, 1, 1, 1, 1)); // chassis
            P.push(makePart(B(13, 6.5, 15), 0, 13, -2, 0, 0, 0, 1, 1, 1, 2)); // cabin
            P.push(makePart(B(12.2, 4.2, 16), 0, 13.2, -2, 0, 0, 0, 1, 1, 1, 3)); // windows
            for (const [wx, wz] of [[-8.5, 9.5], [8.5, 9.5], [-8.5, -9.5], [8.5, -9.5]]) {
                P.push(makePart(C(4.2, 4.2, 2.8, 24), wx, 4.2, wz, 0, 0, Math.PI / 2, 1, 1, 1, 0));
            }
            break;

        case 'mug':
            P.push(makePart(C(11, 11, 22, 36), 0, 11, 0, 0, 0, 0, 1, 1, 1, 1));
            P.push(makePart(C(9.6, 9.6, 2.5, 32), 0, 20.9, 0, 0, 0, 0, 1, 1, 1, 3)); // coffee surface
            P.push(makePart(T(6.5, 1.8, 14, 28, Math.PI), 11, 11.5, 0, 0, 0, -Math.PI / 2, 1, 1, 1, 2));
            break;

        case 'gamepad':
            P.push(makePart(B(32, 6, 16), 0, 3, 0, 0, 0, 0, 1, 1, 1, 0));
            P.push(makePart(C(5.5, 5.5, 6, 24), -13, 3, -5, 0, 0, 0, 1, 1, 1, 0));
            P.push(makePart(C(5.5, 5.5, 6, 24), 13, 3, -5, 0, 0, 0, 1, 1, 1, 0));
            P.push(makePart(B(6.5, 2.2, 2.2), -9, 6.8, 1, 0, 0, 0, 1, 1, 1, 3)); // d-pad H
            P.push(makePart(B(2.2, 2.2, 6.5), -9, 6.8, 1, 0, 0, 0, 1, 1, 1, 3)); // d-pad V
            P.push(makePart(C(1.8, 1.8, 2, 16), 9, 6.8, -1.5, 0, 0, 0, 1, 1, 1, 1)); // A button
            P.push(makePart(C(1.8, 1.8, 2, 16), 12, 6.8, 1.5, 0, 0, 0, 1, 1, 1, 2)); // B button
            P.push(makePart(C(1.8, 1.8, 2, 16), 6, 6.8, 1.5, 0, 0, 0, 1, 1, 1, 2)); // X
            P.push(makePart(C(1.8, 1.8, 2, 16), 9, 6.8, 4.5, 0, 0, 0, 1, 1, 1, 1)); // Y
            break;

        case 'coaster':
            P.push(makePart(C(22, 22, 3.2, 48), 0, 1.6, 0, 0, 0, 0, 1, 1, 1, 0));
            P.push(makePart(T(20.5, 1.2, 12, 48), 0, 3.3, 0, Math.PI / 2, 0, 0, 1, 1, 1, 2));
            for (let k = 0; k < 5; k++) {
                const a = (k * Math.PI * 2) / 5;
                P.push(makePart(B(13, 1.4, 2.6), 0, 3.7, 0, 0, a, 0, 1, 1, 1, 1));
            }
            P.push(makePart(C(5.5, 5.5, 2.0, 24), 0, 3.8, 0, 0, 0, 0, 1, 1, 1, 2));
            break;

        case 'tag':
            P.push(makePart(B(36, 3.5, 16), 0, 1.75, 0, 0, 0, 0, 1, 1, 1, 0));
            P.push(makePart(T(3.5, 1.1, 12, 24), -20, 1.75, 0, Math.PI / 2, 0, 0, 1, 1, 1, 2)); // keyring loop
            P.push(makePart(B(33, 1.5, 1.2), 0, 4.1, 6.5, 0, 0, 0, 1, 1, 1, 1)); // top border
            P.push(makePart(B(33, 1.5, 1.2), 0, 4.1, -6.5, 0, 0, 0, 1, 1, 1, 1)); // bottom border
            // Embossed monogram stripes inside plate
            P.push(makePart(B(3.2, 1.8, 8), -8, 4.2, 0, 0, 0, 0, 1, 1, 1, 2));
            P.push(makePart(B(3.2, 1.8, 8), 0, 4.2, 0, 0, 0.35, 0, 1, 1, 1, 2));
            P.push(makePart(B(3.2, 1.8, 8), 8, 4.2, 0, 0, 0, 0, 1, 1, 1, 2));
            break;

        default:
            loadDemoModel('robot');
            return;
    }

    const combined = combineGeometries(P);
    const colors = combined.userData && combined.userData.preColors ? combined.userData.preColors : null;
    if (typeof currentModelTitle !== 'undefined') currentModelTitle = `Demo_${name}`;
    setLoadedGeometry(combined, colors, null, true);
    if (typeof updateStats === 'function') updateStats();
}

// ==========================================
// BOOTSTRAP ON DOMCONTENTLOADED
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    init3D();
    setupDragAndDrop();

    if (typeof renderFilamentGrid === 'function') renderFilamentGrid();
    if (typeof refreshSlotRgbFloats === 'function') refreshSlotRgbFloats();
    if (typeof initTextPalette === 'function') initTextPalette();
    if (typeof initStencilPalette === 'function') initStencilPalette();
    if (typeof drawPatternPreview === 'function') drawPatternPreview();
    if (typeof initStudiosProBridge === 'function') initStudiosProBridge();

    // Hook saveHistory so every painting / sculpt action schedules IndexedDB auto-save
    if (typeof saveHistory === 'function') {
        const origSaveHistory = saveHistory;
        saveHistory = function (...args) {
            const res = origSaveHistory.apply(this, args);
            if (typeof markProjectDirty === 'function') markProjectDirty();
            return res;
        };
    }

    // Apply saved or URL-specified language
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang');
    if (urlLang === 'en' || urlLang === 'fr') {
        setLang(urlLang);
    } else {
        setLang(currentLang);
    }

    // Load requested demo or default 'robot'
    const reqDemo = params.get('demo');
    loadDemoModel(reqDemo || 'robot');
    selectTool('brush');

    if (typeof checkSavedProjectBanner === 'function') {
        setTimeout(checkSavedProjectBanner, 600);
    }

    refreshIcons();
});
