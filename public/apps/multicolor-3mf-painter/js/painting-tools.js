// ==========================================
// 🖌️ PAINTING TOOLS: ADAPTIVE RIVARA BRUSH, EDGE-LOCK, WELDED SCULPT,
// SHELL CLICKER, MASKING TAPE CUT-PAINT, SYMMETRY, LINE, BUCKET, WAND, 26 PATTERNS
// ==========================================
let isPainting = false;
let strokeDidModify = false;
let strokeDidModifyGeo = false;
let activeTool = 'brush';
let isBackfaceProtected = true;
let isEdgeLockEnabled = false; // #2 Magnetic Edge-Lock Brush
let isAdaptiveBrushEnabled = true;
let brushSculptMode = 'none'; // 'none' | 'emboss' | 'engrave'
let fillBehaviorMode = 'crease'; // 'crease' (full curved parts) | 'planar'
let symmetryAxis = 'none'; // 'none' | 'x' | 'y' | 'z'
let brushHelperRing = null;
let mirrorPlaneHelper = null;
let linePreviewLine = null;
let lastHitPoint = null;
let lastHitNormal = null;
let lineStartPoint = null;
let lineStartNormal = null;
let lineStartNdc = null;
let currentPenPressure = 1.0;

// #3 Laser-Sharp Masking Tape Polyline Cut-Paint state
let tapePoints = []; // [{ point: Vector3, normal: Vector3 }]
let tapePreviewGroup = null;

let activeBrushTexture = 'none';
let brushTextureScale = 14.0;
let brushTextureAngle = 0;
let isPatternInverted = false;
let brushTextureStampMode = 'stamp'; // 'stamp' | 'tile'
let brushPatternReliefMm = 0.0; // #10 Tactile 3D Pattern Relief (mm)

// Track welded vertex displacement by welded vertex ID (watertight, strictly capped!)
let sculptAccumByVid = new Map();

function initBrushHelper() {
    const ringGeom = new THREE.RingGeometry(0.88, 1.0, 48);
    const ringMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        depthTest: false
    });
    brushHelperRing = new THREE.Mesh(ringGeom, ringMat);
    brushHelperRing.visible = false;
    brushHelperRing.renderOrder = 999;
    scene.add(brushHelperRing);

    // Translucent 3D Mirror Symmetry Plane Helper
    const planeGeom = new THREE.PlaneGeometry(1, 1);
    const planeMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.14,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    mirrorPlaneHelper = new THREE.Mesh(planeGeom, planeMat);
    mirrorPlaneHelper.visible = false;
    mirrorPlaneHelper.renderOrder = 950;
    scene.add(mirrorPlaneHelper);

    // Straight Line 3D Preview Ribbon
    const lineGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, depthTest: false });
    linePreviewLine = new THREE.Line(lineGeom, lineMat);
    linePreviewLine.visible = false;
    linePreviewLine.renderOrder = 998;
    scene.add(linePreviewLine);

    // Masking Tape 3D Polyline Preview Group
    tapePreviewGroup = new THREE.Group();
    tapePreviewGroup.renderOrder = 998;
    scene.add(tapePreviewGroup);
}

function getModelMirrorCenter() {
    if (!currentMesh || !currentMesh.geometry) return new THREE.Vector3(0, 0, 0);
    const geom = currentMesh.geometry;
    if (!geom.boundingBox) geom.computeBoundingBox();
    const center = new THREE.Vector3();
    geom.boundingBox.getCenter(center);
    return center;
}

function updateMirrorPlaneHelper() {
    if (!mirrorPlaneHelper) return;
    if (symmetryAxis === 'none' || !currentMesh || !currentMesh.geometry) {
        mirrorPlaneHelper.visible = false;
        return;
    }
    const geom = currentMesh.geometry;
    if (!geom.boundingBox) geom.computeBoundingBox();
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    geom.boundingBox.getCenter(center);
    geom.boundingBox.getSize(size);
    const span = Math.max(size.x, size.y, size.z, 20) * 1.25;

    mirrorPlaneHelper.visible = true;
    mirrorPlaneHelper.position.copy(center);
    mirrorPlaneHelper.scale.set(span, span, 1);
    if (symmetryAxis === 'x') {
        mirrorPlaneHelper.rotation.set(0, Math.PI / 2, 0);
    } else if (symmetryAxis === 'y') {
        mirrorPlaneHelper.rotation.set(Math.PI / 2, 0, 0);
    } else {
        mirrorPlaneHelper.rotation.set(0, 0, 0);
    }
}

function setBrushRadius(val) {
    val = Math.max(0.1, Math.min(50, parseFloat(val) || 2));
    const slider = document.getElementById('slider-brush-size');
    const lbl = document.getElementById('val-brush-size');
    if (slider) slider.value = val;
    if (lbl) lbl.innerText = `${val} mm`;
}

function setBrushSculptMode(mode) {
    brushSculptMode = mode || 'none';
    const sel = document.getElementById('select-brush-sculpt');
    if (sel) sel.value = brushSculptMode;
}

function setFillBehaviorMode(mode) {
    fillBehaviorMode = (mode === 'planar') ? 'planar' : 'crease';
    const sel = document.getElementById('select-fill-mode');
    if (sel) sel.value = fillBehaviorMode;
}

function toggleEdgeLock() {
    isEdgeLockEnabled = !isEdgeLockEnabled;
    const btn = document.getElementById('btn-edgelock-toggle');
    if (btn) btn.classList.toggle('active', isEdgeLockEnabled);
    updateHUDLabels();
    showToast(isEdgeLockEnabled
        ? (currentLang === 'fr' ? "Blocage Arêtes activé : le pinceau ne déborde pas les coutures !" : "Magnetic Edge-Lock ON: brush stops cleanly at sharp seams!")
        : (currentLang === 'fr' ? "Blocage Arêtes désactivé" : "Magnetic Edge-Lock OFF"));
}

function toggleAdaptiveBrush() {
    isAdaptiveBrushEnabled = !isAdaptiveBrushEnabled;
    const btn = document.getElementById('btn-adaptive-toggle');
    if (btn) btn.classList.toggle('active', isAdaptiveBrushEnabled);
    updateHUDLabels();
    showToast(isAdaptiveBrushEnabled
        ? (currentLang === 'fr' ? "Pinceau adaptatif Rivara activé (bords ultra-nets)" : "Adaptive Rivara brush ON (crisp edges on CAD faces)")
        : (currentLang === 'fr' ? "Pinceau adaptatif désactivé" : "Adaptive brush OFF"));
}

function toggleBackfaceProtection() {
    isBackfaceProtected = !isBackfaceProtected;
    const btn = document.getElementById('btn-backface-toggle');
    if (btn) btn.classList.toggle('active', isBackfaceProtected);
    updateHUDLabels();
    showToast(isBackfaceProtected
        ? (currentLang === 'fr' ? "Protection face avant + anti-fuite activée" : "Front-Only + anti-bleed active (no jump across gaps)")
        : (currentLang === 'fr' ? "Protection face avant désactivée" : "Front-Only protection disabled"));
}

function cycleSymmetry() {
    const modes = ['none', 'x', 'y', 'z'];
    const curIdx = modes.indexOf(symmetryAxis);
    symmetryAxis = modes[(curIdx + 1) % modes.length];
    const btn = document.getElementById('btn-symmetry');
    if (btn) btn.classList.toggle('active', symmetryAxis !== 'none');
    updateMirrorPlaneHelper();
    updateHUDLabels();
    showToast((currentLang === 'fr' ? "Symétrie : " : "Symmetry mode: ") + symmetryAxis.toUpperCase());
}

function clearTapePreview() {
    tapePoints = [];
    if (tapePreviewGroup) {
        while (tapePreviewGroup.children.length > 0) {
            const c = tapePreviewGroup.children[0];
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
            tapePreviewGroup.remove(c);
        }
    }
    const hud = document.getElementById('tape-action-bar');
    if (hud) hud.style.display = 'none';
}

function updateTapePreviewVisuals() {
    if (!tapePreviewGroup) return;
    while (tapePreviewGroup.children.length > 0) {
        const c = tapePreviewGroup.children[0];
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
        tapePreviewGroup.remove(c);
    }
    const hud = document.getElementById('tape-action-bar');
    if (hud) hud.style.display = (activeTool === 'tape' && tapePoints.length > 0) ? 'flex' : 'none';
    const cntEl = document.getElementById('tape-points-count');
    if (cntEl) cntEl.textContent = `${tapePoints.length} pt${tapePoints.length > 1 ? 's' : ''}`;

    if (tapePoints.length === 0) return;

    const dotGeom = new THREE.SphereGeometry(0.45, 10, 10);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, depthTest: false });
    const pts = [];
    for (let i = 0; i < tapePoints.length; i++) {
        const p = tapePoints[i].point.clone().addScaledVector(tapePoints[i].normal, 0.12);
        pts.push(p);
        const m = new THREE.Mesh(dotGeom, dotMat);
        m.position.copy(p);
        m.renderOrder = 999;
        tapePreviewGroup.add(m);
    }
    if (pts.length >= 2) {
        const lg = new THREE.BufferGeometry().setFromPoints(pts);
        const lm = new THREE.LineBasicMaterial({ color: 0x38bdf8, depthTest: false });
        const line = new THREE.Line(lg, lm);
        line.renderOrder = 998;
        tapePreviewGroup.add(line);
    }
}

function undoLastTapePoint() {
    if (tapePoints.length > 0) {
        tapePoints.pop();
        updateTapePreviewVisuals();
    }
}

// ==========================================
// 🌈 #7 3D SPATIAL AIRBRUSH DITHER & GRADIENT PAINT ENGINE
// ==========================================
const BAYER_4X4 = [
     0,  8,  2, 10,
    12,  4, 14,  6,
     3, 11,  1,  9,
    15,  7, 13,  5
];
let airbrushDotMm = 0.8;         // Nozzle-safe spatial dither dot size (2× 0.4mm nozzle)
let airbrushSoftness = 0.72;     // Radial feather width (0.2 = crisp edge, 1.0 = full soft fade)
let airbrushSecondarySlot = -1;  // -1 = blend over existing mesh color; >=0 = blend with specific slot
let _shiftPanActive = false;

function sampleBayer3D(x, y, z, dotMm) {
    const inv = 1.0 / Math.max(0.25, dotMm || 0.8);
    const ix = Math.floor(x * inv) & 3;
    const iy = Math.floor(y * inv) & 3;
    const iz = Math.floor(z * inv) & 3;
    // Combine 3D cell coordinates cleanly into a well-distributed [0, 1) Bayer threshold
    const b2d = BAYER_4X4[(iy << 2) | ((ix + iz * 2) & 3)];
    return (b2d + 0.5) / 16.0;
}

function setAirbrushDotSize(val) {
    airbrushDotMm = Math.max(0.4, Math.min(3.0, parseFloat(val) || 0.8));
    const lbl = document.getElementById('val-airbrush-dot');
    if (lbl) lbl.textContent = `${airbrushDotMm.toFixed(1)} mm`;
}

function setAirbrushSoftness(val) {
    airbrushSoftness = Math.max(0.15, Math.min(1.0, (parseFloat(val) || 72) / 100));
    const lbl = document.getElementById('val-airbrush-softness');
    if (lbl) lbl.textContent = `${Math.round(airbrushSoftness * 100)}%`;
}

function apply3DGradientDither(axis = 'y', slotAIdx = 0, slotBIdx = 1, bandStart = 0.15, bandEnd = 0.85, dotMm = 0.8) {
    if (!currentMesh || !currentMesh.geometry || !triangleColors) {
        showToast(t('aiNoModel', 'Load a 3D model first.'));
        return;
    }
    const geom = currentMesh.geometry;
    const pos = geom.attributes.position.array;
    const faceCount = (pos.length / 9) | 0;
    if (faceCount === 0) return;

    // Ensure enough mesh detail for clean dither dots (auto-subdivide once if coarse)
    if (faceCount < 16000 && typeof subdivideCurrentMesh === 'function') {
        const prevCommit = typeof commitHistory === 'function';
        // Only refine if mesh is very coarse (< 8000 tris)
        if (faceCount < 8000) {
            subdivideCurrentMesh();
        }
    }

    const g2 = currentMesh.geometry;
    g2.computeBoundingBox();
    const box = g2.boundingBox;
    const p2 = g2.attributes.position.array;
    const fCount2 = (p2.length / 9) | 0;
    const sA = Math.max(0, Math.min(filamentSlots.length - 1, parseInt(slotAIdx, 10) || 0));
    const sB = Math.max(0, Math.min(filamentSlots.length - 1, parseInt(slotBIdx, 10) || 1));
    const lo = Math.max(0, Math.min(0.95, parseFloat(bandStart) || 0.15));
    const hi = Math.max(lo + 0.05, Math.min(1.0, parseFloat(bandEnd) || 0.85));
    const cx0 = (box.min.x + box.max.x) * 0.5;
    const cy0 = (box.min.y + box.max.y) * 0.5;
    const cz0 = (box.min.z + box.max.z) * 0.5;
    const maxR = Math.max(1e-3, Math.hypot(box.max.x - cx0, box.max.y - cy0, box.max.z - cz0));

    for (let f = 0; f < fCount2; f++) {
        const b = f * 9;
        const fx = (p2[b] + p2[b + 3] + p2[b + 6]) / 3;
        const fy = (p2[b + 1] + p2[b + 4] + p2[b + 7]) / 3;
        const fz = (p2[b + 2] + p2[b + 5] + p2[b + 8]) / 3;
        let u = 0;
        if (axis === 'x') u = (fx - box.min.x) / Math.max(1e-4, box.max.x - box.min.x);
        else if (axis === 'z') u = (fz - box.min.z) / Math.max(1e-4, box.max.z - box.min.z);
        else if (axis === 'radial') u = Math.hypot(fx - cx0, fy - cy0, fz - cz0) / maxR;
        else u = (fy - box.min.y) / Math.max(1e-4, box.max.y - box.min.y);

        const tNorm = Math.max(0, Math.min(1, (u - lo) / (hi - lo)));
        const thresh = sampleBayer3D(fx, fy, fz, dotMm || airbrushDotMm);
        triangleColors[f] = (tNorm > thresh) ? sB : sA;
    }

    if (typeof soloSlotIndex !== 'undefined') soloSlotIndex = -1;
    if (typeof isShowingPurgeHeatmap !== 'undefined') isShowingPurgeHeatmap = false;
    updateMeshVisualColors();
    if (typeof commitHistory === 'function') commitHistory(false);
    showToast(currentLang === 'fr'
        ? `🌈 Dégradé Airbrush 3D appliqué (${filamentSlots[sA]?.name} ➔ ${filamentSlots[sB]?.name}) !`
        : `🌈 3D Airbrush Dither Gradient applied (${filamentSlots[sA]?.name} ➔ ${filamentSlots[sB]?.name})!`);
}

// Shift-key Pan binding BEFORE OrbitControls pointerdown
window.addEventListener('keydown', (e) => {
    if (e.key === 'Shift' && controls && controls.mouseButtons && activeTool !== 'view') {
        _shiftPanActive = true;
        controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    }
});
window.addEventListener('keyup', (e) => {
    if (e.key === 'Shift' && _shiftPanActive) {
        _shiftPanActive = false;
        if (controls && controls.mouseButtons && activeTool !== 'view') {
            controls.mouseButtons.LEFT = null;
        }
    }
});
window.addEventListener('blur', () => {
    if (_shiftPanActive) {
        _shiftPanActive = false;
        if (controls && controls.mouseButtons && activeTool !== 'view') {
            controls.mouseButtons.LEFT = null;
        }
    }
});

function selectTool(tool) {
    activeTool = tool || 'brush';
    lineStartPoint = null;
    lineStartNormal = null;
    lineStartNdc = null;
    if (linePreviewLine) linePreviewLine.visible = false;
    if (activeTool !== 'tape') clearTapePreview();
    if (typeof cancelStampingMode === 'function') {
        cancelStampingMode(true, true);
    }
    if (typeof isBatchPlacementMode !== 'undefined') isBatchPlacementMode = false;

    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('tool-' + activeTool);
    if (btn) btn.classList.add('active');

    const airbrushPanel = document.getElementById('airbrush-dither-controls');
    if (airbrushPanel) airbrushPanel.style.display = (activeTool === 'airbrush') ? 'block' : 'none';

    if (!controls) return;
    controls.enabled = true;

    const vp = document.getElementById('viewport-container');
    if (activeTool === 'view') {
        if (controls.mouseButtons) controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
        if (controls.touches && typeof THREE.TOUCH !== 'undefined') controls.touches.ONE = THREE.TOUCH.ROTATE;
        if (vp) vp.style.cursor = 'grab';
        if (brushHelperRing) brushHelperRing.visible = false;
    } else if (activeTool === 'brush' || activeTool === 'airbrush' || activeTool === 'line' || activeTool === 'eraser' || activeTool === 'tape') {
        if (controls.mouseButtons) controls.mouseButtons.LEFT = _shiftPanActive ? THREE.MOUSE.PAN : null;
        if (controls.touches && typeof THREE.TOUCH !== 'undefined') controls.touches.ONE = null;
        if (vp) vp.style.cursor = 'crosshair';
        if (activeTool === 'tape' && brushHelperRing) brushHelperRing.visible = false;
    } else if (activeTool === 'bucket' || activeTool === 'wand' || activeTool === 'shell') {
        if (controls.mouseButtons) controls.mouseButtons.LEFT = _shiftPanActive ? THREE.MOUSE.PAN : null;
        if (controls.touches && typeof THREE.TOUCH !== 'undefined') controls.touches.ONE = null;
        if (vp) vp.style.cursor = 'cell';
        if (brushHelperRing) brushHelperRing.visible = false;
    } else if (activeTool === 'dropper') {
        if (controls.mouseButtons) controls.mouseButtons.LEFT = _shiftPanActive ? THREE.MOUSE.PAN : null;
        if (controls.touches && typeof THREE.TOUCH !== 'undefined') controls.touches.ONE = null;
        if (vp) vp.style.cursor = 'help';
        if (brushHelperRing) brushHelperRing.visible = false;
    }
}

function getRaycastIntersection() {
    if (!currentMesh) return null;
    raycaster.setFromCamera(mouse, camera);
    const isClipped = (typeof layerSliceRatio === 'number' && layerSliceRatio < 0.999 && currentMesh.material && currentMesh.material.clippingPlanes && currentMesh.material.clippingPlanes.length > 0);
    const prevFirstHit = raycaster.firstHitOnly;
    if (isClipped) raycaster.firstHitOnly = false;
    const intersects = raycaster.intersectObject(currentMesh);
    raycaster.firstHitOnly = prevFirstHit;
    if (!intersects.length) return null;
    if (!isClipped) return intersects[0];
    const clipPlane = currentMesh.material.clippingPlanes[0];
    for (let i = 0; i < intersects.length; i++) {
        if (clipPlane.distanceToPoint(intersects[i].point) >= -0.02) {
            return intersects[i];
        }
    }
    return null;
}

function onPointerDown(e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    // Allow Shift + Left Drag to Pan smoothly even while Brush is active!
    if (e.shiftKey && controls) {
        if (controls.mouseButtons) controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
        return;
    }

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (e.pointerType === 'pen' && e.pressure && e.pressure > 0.01) {
        currentPenPressure = THREE.MathUtils.clamp(e.pressure * 1.5, 0.25, 2.0);
    } else {
        currentPenPressure = 1.0;
    }

    if (typeof isTextStampingMode !== 'undefined' && isTextStampingMode) {
        const hit = getRaycastIntersection();
        if (hit && typeof applyTextStampAtHit === 'function') applyTextStampAtHit(hit);
        else showToast(currentLang === 'fr' ? "Cliquez directement sur le modèle 3D (Échap pour annuler)." : "Click directly on the 3D model (Esc to cancel).");
        return;
    }

    if (typeof isStencilStampingMode !== 'undefined' && isStencilStampingMode) {
        const hit = getRaycastIntersection();
        if (hit && typeof applyStencilStampAtHit === 'function') applyStencilStampAtHit(hit);
        else showToast(currentLang === 'fr' ? "Cliquez directement sur le modèle 3D (Échap pour annuler)." : "Click directly on the 3D model (Esc to cancel).");
        return;
    }

    if (typeof isQRStampingMode !== 'undefined' && isQRStampingMode) {
        const hit = getRaycastIntersection();
        if (hit && typeof applyQRStampAtHit === 'function') applyQRStampAtHit(hit);
        else showToast(currentLang === 'fr' ? "Cliquez sur le modèle 3D pour placer le QR Code (Échap pour annuler)." : "Click on the 3D model to place QR Code (Esc to cancel).");
        return;
    }

    if (typeof isBatchPlacementMode !== 'undefined' && isBatchPlacementMode) {
        const hit = getRaycastIntersection();
        if (hit && typeof captureBatchAnchorAtHit === 'function') captureBatchAnchorAtHit(hit);
        else showToast(currentLang === 'fr' ? "Cliquez sur le modèle pour ancrer la position du texte en lot." : "Click on the 3D model to anchor the batch text position.");
        return;
    }

    if (activeTool === 'view') return;

    const hit = getRaycastIntersection();
    if (activeTool === 'brush' || activeTool === 'airbrush' || activeTool === 'eraser') {
        if (!hit) return;
        isPainting = true;
        strokeDidModify = false;
        strokeDidModifyGeo = false;
        sculptAccumByVid.clear();
        lastHitPoint = null;
        lastHitNormal = null;
        updateBrushHelperWithHit(hit);
        paintStroke(hit);
    } else if (activeTool === 'line') {
        if (!hit) return;
        if (!lineStartPoint) {
            lineStartPoint = hit.point.clone();
            lineStartNormal = hit.face ? hit.face.normal.clone() : new THREE.Vector3(0, 1, 0);
            lineStartNdc = new THREE.Vector2(mouse.x, mouse.y);
            showToast(currentLang === 'fr' ? "Point de départ défini. Cliquez sur l'arrivée (Échap pour annuler) !" : "Line start set. Click destination point (Esc to cancel)!");
        } else {
            const endNormal = hit.face ? hit.face.normal.clone() : lineStartNormal;
            const endNdc = new THREE.Vector2(mouse.x, mouse.y);
            paintStraightLine(lineStartPoint, hit.point.clone(), lineStartNormal, endNormal, lineStartNdc, endNdc);
            lineStartPoint = null;
            lineStartNormal = null;
            lineStartNdc = null;
            if (linePreviewLine) linePreviewLine.visible = false;
            showToast(currentLang === 'fr' ? "Ligne conforme peinte !" : "Conformal line painted!");
        }
    } else if (activeTool === 'tape') {
        if (!hit) return;
        const n = hit.face ? hit.face.normal.clone().normalize() : new THREE.Vector3(0, 1, 0);
        tapePoints.push({ point: currentMesh.worldToLocal(hit.point.clone()), normal: n });
        updateTapePreviewVisuals();
        if (tapePoints.length === 1) {
            showToast(currentLang === 'fr' ? "Point 1 placé. Cliquez pour tracer le ruban, puis 'Peindre Bande' ou 'Remplir Zone' !" : "Point 1 placed. Click to trace tape, then click 'Paint Stripe' or 'Fill Inside'!");
        }
    } else if (activeTool === 'bucket') {
        if (hit) bucketFillAtHit(hit);
    } else if (activeTool === 'wand') {
        if (hit) smartWandAtHit(hit);
    } else if (activeTool === 'shell') {
        if (hit) shellComponentFillAtHit(hit);
    } else if (activeTool === 'dropper') {
        if (hit) eyedropperAtHit(hit);
    }
}

function onPointerMove(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (e.pointerType === 'pen' && e.pressure && e.pressure > 0.01) {
        currentPenPressure = THREE.MathUtils.clamp(e.pressure * 1.5, 0.25, 2.0);
    }
    pointerDirty = true;
}

function onPointerUp() {
    // Restore LEFT mouse button restriction after Shift+Left pan
    if (activeTool !== 'view' && controls && controls.mouseButtons) {
        controls.mouseButtons.LEFT = _shiftPanActive ? THREE.MOUSE.PAN : null;
    }
    if (isPainting) {
        isPainting = false;
        lastHitPoint = null;
        lastHitNormal = null;
        if (strokeDidModifyGeo && currentMesh) {
            const g = currentMesh.geometry;
            g.computeBoundingBox();
            g.computeBoundingSphere();
            meshTopology = buildMeshTopology(g);
            precomputeGeometryMetrics(g);
            if (typeof updateShadowCameraForMesh === 'function') updateShadowCameraForMesh(g);
            if (typeof rebuildMultiCopyClones === 'function') rebuildMultiCopyClones();
        }
        if (strokeDidModify || strokeDidModifyGeo) {
            if (typeof commitHistory === 'function') commitHistory(strokeDidModifyGeo);
            if (typeof markCbnDirty === 'function') markCbnDirty();
            if (typeof updateStats === 'function') updateStats();
        }
        strokeDidModify = false;
        strokeDidModifyGeo = false;
    }
    if (controls) controls.enabled = true;
}

function updateBrushHelperWithHit(hit) {
    // Also update live 3D Ghost Preview for Text / Stencil / QR Stamping!
    if ((typeof isTextStampingMode !== 'undefined' && isTextStampingMode) ||
        (typeof isStencilStampingMode !== 'undefined' && isStencilStampingMode) ||
        (typeof isQRStampingMode !== 'undefined' && isQRStampingMode) ||
        (typeof isBatchPlacementMode !== 'undefined' && isBatchPlacementMode)) {
        if (brushHelperRing) brushHelperRing.visible = false;
        if (typeof updateStampGhostAtHit === 'function') updateStampGhostAtHit(hit);
        return;
    }

    // Update live Straight Line preview ribbon
    if (activeTool === 'line' && lineStartPoint && linePreviewLine) {
        if (hit) {
            const pA = lineStartPoint.clone().addScaledVector(lineStartNormal || new THREE.Vector3(0, 1, 0), 0.15);
            const pB = hit.point.clone().addScaledVector(hit.face ? hit.face.normal : new THREE.Vector3(0, 1, 0), 0.15);
            linePreviewLine.geometry.setFromPoints([pA, pB]);
            linePreviewLine.visible = true;
        } else {
            linePreviewLine.visible = false;
        }
    }

    if (!brushHelperRing || !currentMesh) return;
    if (activeTool !== 'brush' && activeTool !== 'airbrush' && activeTool !== 'eraser' && activeTool !== 'line') {
        brushHelperRing.visible = false;
        return;
    }

    if (hit && hit.face) {
        brushHelperRing.visible = true;
        const baseRadius = parseFloat(document.getElementById('slider-brush-size')?.value) || 2;
        const radius = baseRadius * currentPenPressure;
        const isPattern = (activeBrushTexture !== 'none');
        const effectiveRadius = (isPattern && brushTextureStampMode === 'stamp')
            ? Math.max(radius, (brushTextureScale || 14) * 0.5)
            : radius;

        brushHelperRing.scale.set(effectiveRadius, effectiveRadius, 1);
        brushHelperRing.position.copy(hit.point).addScaledVector(hit.face.normal, 0.08);
        brushHelperRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), hit.face.normal);
        brushHelperRing.material.color.set(activeTool === 'eraser' ? 0xffffff : filamentSlots[activeSlotIndex].color);
    } else {
        brushHelperRing.visible = false;
    }
}

function paintStroke(hit) {
    if (!hit || hit.point === undefined || !currentMesh) return;
    const baseRadius = parseFloat(document.getElementById('slider-brush-size')?.value) || 2;
    const radius = baseRadius * currentPenPressure;
    const normal = hit.face ? hit.face.normal : null;
    const isPattern = (activeBrushTexture !== 'none');
    const effectiveRadius = (isPattern && brushTextureStampMode === 'stamp')
        ? Math.max(radius, (brushTextureScale || 14) * 0.5)
        : radius;

    if (lastHitPoint) {
        const dist = lastHitPoint.distanceTo(hit.point);
        const step = (isPattern && brushTextureStampMode === 'stamp')
            ? Math.max(0.5, effectiveRadius * 1.35)
            : Math.max(0.12, radius * 0.42);

        if (dist >= step) {
            if (isPattern && brushTextureStampMode === 'stamp') {
                paintSphereAtPoint(hit.point, effectiveRadius, normal, hit.faceIndex);
                lastHitPoint = hit.point.clone();
                lastHitNormal = normal ? normal.clone() : null;
            } else {
                const steps = Math.min(18, Math.ceil(dist / step));
                for (let s = 1; s <= steps; s++) {
                    const interpPoint = lastHitPoint.clone().lerp(hit.point, s / steps);
                    const interpNorm = (normal && lastHitNormal)
                        ? lastHitNormal.clone().lerp(normal, s / steps).normalize()
                        : normal;
                    paintSphereAtPoint(interpPoint, radius, interpNorm, s === steps ? hit.faceIndex : undefined);
                }
                lastHitPoint = hit.point.clone();
                lastHitNormal = normal ? normal.clone() : null;
            }
        }
    } else {
        paintSphereAtPoint(hit.point, effectiveRadius, normal, hit.faceIndex);
        lastHitPoint = hit.point.clone();
        lastHitNormal = normal ? normal.clone() : null;
    }
}

function paintStraightLine(p1, p2, n1 = null, n2 = null, ndc1 = null, ndc2 = null) {
    const radius = parseFloat(document.getElementById('slider-brush-size')?.value) || 2;
    const dist = p1.distanceTo(p2);
    const step = Math.max(0.18, radius * 0.35);
    const steps = Math.min(90, Math.max(2, Math.ceil(dist / step)));
    const projRay = new THREE.Raycaster();
    projRay.firstHitOnly = true;
    const ndcTmp = new THREE.Vector2();

    strokeDidModify = false;
    strokeDidModifyGeo = false;
    sculptAccumByVid.clear();

    for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        let pt = p1.clone().lerp(p2, t);
        let nm = (n1 && n2) ? n1.clone().lerp(n2, t).normalize() : (n1 || n2);
        let fIdx = undefined;

        // Project onto curved surface along screen-space ray so lines wrap cleanly on spheres/cylinders!
        if (ndc1 && ndc2 && camera && currentMesh) {
            ndcTmp.lerpVectors(ndc1, ndc2, t);
            projRay.setFromCamera(ndcTmp, camera);
            const hits = projRay.intersectObject(currentMesh);
            if (hits.length > 0 && hits[0].point.distanceTo(pt) < Math.max(dist * 0.55, radius * 4)) {
                pt = hits[0].point;
                if (hits[0].face) nm = hits[0].face.normal.clone();
                fIdx = hits[0].faceIndex;
            }
        }
        paintSphereAtPoint(pt, radius, nm, fIdx);
    }
    if (strokeDidModifyGeo && currentMesh) precomputeGeometryMetrics(currentMesh.geometry);
    if (strokeDidModify || strokeDidModifyGeo) {
        if (typeof commitHistory === 'function') commitHistory(strokeDidModifyGeo);
        if (typeof updateStats === 'function') updateStats();
    }
}

function maybeAdaptiveSubdivideNear(centers, queryRad, brushRadius, passNormals = null) {
    if (!isAdaptiveBrushEnabled || !spatialGrid || !currentMesh) return false;
    // Eraser should never bloat geometry triangle count!
    if (activeTool === 'eraser') return false;
    const geom = currentMesh.geometry;
    const pos = geom.attributes.position.array;
    const faceCount = (pos.length / 9) | 0;
    if (faceCount > 320000) return false;

    const isPat = (activeBrushTexture !== 'none');
    const isAirbrush = (activeTool === 'airbrush');
    const maxAllowedEdge = isAirbrush
        ? Math.max(0.35, Math.min(brushRadius * 0.25, (airbrushDotMm || 0.8) * 0.9, 1.0))
        : (isPat
            ? Math.max(0.32, Math.min(brushRadius * 0.35, (brushTextureScale || 14) * 0.11, 1.1))
            : Math.max(0.38, Math.min(brushRadius * 0.42, 1.4)));
    const maxEdgeSq = maxAllowedEdge * maxAllowedEdge;
    let didAnySplit = false;

    for (let pass = 0; pass < 3; pass++) {
        const curPos = currentMesh.geometry.attributes.position.array;
        const fn = (meshTopology && meshTopology.faceNormals && meshTopology.faceCount === ((curPos.length / 9) | 0))
            ? meshTopology.faceNormals
            : null;
        const toSplit = new Set();

        for (let c = 0; c < centers.length; c++) {
            const [cx, cy, cz] = centers[c];
            const pn = passNormals && passNormals[c] ? passNormals[c] : null;
            spatialGrid.querySphere(cx, cy, cz, queryRad, (f) => {
                // Respect Front-Only so thin walls don't get subdivided on the back side!
                if (isBackfaceProtected && pn && fn) {
                    const f3 = f * 3;
                    if (fn[f3] * pn.x + fn[f3 + 1] * pn.y + fn[f3 + 2] * pn.z < 0.12) return;
                }
                const p = f * 9;
                const ax = curPos[p], ay = curPos[p + 1], az = curPos[p + 2];
                const bx = curPos[p + 3], by = curPos[p + 4], bz = curPos[p + 5];
                const cxp = curPos[p + 6], cyp = curPos[p + 7], czp = curPos[p + 8];
                const e01 = (bx - ax) ** 2 + (by - ay) ** 2 + (bz - az) ** 2;
                const e12 = (cxp - bx) ** 2 + (cyp - by) ** 2 + (czp - bz) ** 2;
                const e20 = (ax - cxp) ** 2 + (ay - cyp) ** 2 + (az - czp) ** 2;
                if (e01 > maxEdgeSq || e12 > maxEdgeSq || e20 > maxEdgeSq) {
                    toSplit.add(f);
                }
            });
        }
        if (toSplit.size === 0) break;
        const didSplit = subdivideFacesLocal(toSplit, 1, /*skipCurvature=*/true);
        if (!didSplit) break;
        didAnySplit = true;
        strokeDidModifyGeo = true;
    }
    return didAnySplit;
}

// Helper: find best seed face near (px, py, pz) matching hitNormal
function findBestSeedFaceNear(px, py, pz, queryRad, normal) {
    let bestFace = -1;
    let bestDistSq = Infinity;
    const pos = currentMesh.geometry.attributes.position.array;
    const fn = meshTopology ? meshTopology.faceNormals : null;
    spatialGrid.querySphere(px, py, pz, queryRad, (f) => {
        if (normal && fn) {
            const dot = fn[f * 3] * normal.x + fn[f * 3 + 1] * normal.y + fn[f * 3 + 2] * normal.z;
            if (dot < 0.15) return;
        }
        const p = f * 9;
        const dSq = pointTriangleDistSq(px, py, pz,
            pos[p], pos[p + 1], pos[p + 2],
            pos[p + 3], pos[p + 4], pos[p + 5],
            pos[p + 6], pos[p + 7], pos[p + 8]
        );
        if (dSq < bestDistSq) { bestDistSq = dSq; bestFace = f; }
    });
    return bestFace;
}

// Collect faces in brush sphere using Geodesic BFS (no air-gap bleed!) + optional Magnetic Edge-Lock!
function collectBrushFaces(px, py, pz, queryRad, normal, seedFaceHint) {
    const geom = currentMesh.geometry;
    const faceCount = (geom.attributes.position.count / 3) | 0;
    if (!meshTopology || meshTopology.faceCount !== faceCount) {
        meshTopology = buildMeshTopology(geom);
    }

    const useGeodesic = (isBackfaceProtected || isEdgeLockEnabled) && meshTopology && meshTopology.faceNeighbors;
    if (!useGeodesic) {
        const list = [];
        spatialGrid.querySphere(px, py, pz, queryRad, (f) => list.push(f));
        return list;
    }

    let seed = (typeof seedFaceHint === 'number' && seedFaceHint >= 0 && seedFaceHint < faceCount)
        ? seedFaceHint
        : findBestSeedFaceNear(px, py, pz, queryRad, normal);
    if (seed < 0) return [];

    const pos = geom.attributes.position.array;
    const fn = meshTopology.faceNormals;
    const adj = meshTopology.faceNeighbors;
    const rSq = queryRad * queryRad;
    const edgeLockDeg = parseFloat(document.getElementById('slider-angle')?.value) || 35;
    const cosLock = Math.cos((edgeLockDeg * Math.PI) / 180);

    const visited = new Set([seed]);
    const queue = [seed];
    const result = [];
    let qHead = 0;

    while (qHead < queue.length) {
        const f = queue[qHead++];
        result.push(f);
        const f3 = f * 3;
        const curNx = fn[f3], curNy = fn[f3 + 1], curNz = fn[f3 + 2];
        const nbs = adj[f];
        for (let i = 0; i < nbs.length; i++) {
            const nb = nbs[i];
            if (visited.has(nb)) continue;
            const nb3 = nb * 3;
            const nnx = fn[nb3], nny = fn[nb3 + 1], nnz = fn[nb3 + 2];
            if (isBackfaceProtected && normal) {
                if (nnx * normal.x + nny * normal.y + nnz * normal.z < 0.15) continue;
            }
            if (isEdgeLockEnabled) {
                if (curNx * nnx + curNy * nny + curNz * nnz < cosLock) continue;
            }
            const p = nb * 9;
            const dSq = pointTriangleDistSq(px, py, pz,
                pos[p], pos[p + 1], pos[p + 2],
                pos[p + 3], pos[p + 4], pos[p + 5],
                pos[p + 6], pos[p + 7], pos[p + 8]
            );
            if (dSq <= rSq) {
                visited.add(nb);
                queue.push(nb);
            }
        }
    }
    return result;
}

function paintSphereAtPoint(worldPoint, radius, hitNormal, seedFaceHint = undefined) {
    if (!currentMesh || !triangleColors || !spatialGrid) return;
    const targetColorSlot = activeTool === 'eraser' ? 0 : activeSlotIndex;
    const hasSolo = (typeof soloSlotIndex === 'number' && soloSlotIndex >= 0);
    const rgb = (hasSolo && targetColorSlot !== soloSlotIndex)
        ? [0.16, 0.20, 0.27]
        : (slotRgbFloats[targetColorSlot] || slotRgbFloats[0]);

    const localHit = currentMesh.worldToLocal(worldPoint.clone());
    const lx = localHit.x, ly = localHit.y, lz = localHit.z;

    const queryRad = (activeBrushTexture !== 'none' && brushTextureStampMode === 'stamp')
        ? Math.max(radius, (brushTextureScale || (radius * 2)) * 0.55)
        : radius;

    // Build passes (Primary + Mirror around real bounding-box center!)
    const mCenter = getModelMirrorCenter();
    const passes = [{ x: lx, y: ly, z: lz, norm: hitNormal ? hitNormal.clone().normalize() : null, seed: seedFaceHint }];
    if (symmetryAxis === 'x') {
        passes.push({
            x: 2 * mCenter.x - lx, y: ly, z: lz,
            norm: hitNormal ? new THREE.Vector3(-hitNormal.x, hitNormal.y, hitNormal.z).normalize() : null,
            seed: undefined
        });
    } else if (symmetryAxis === 'y') {
        passes.push({
            x: lx, y: 2 * mCenter.y - ly, z: lz,
            norm: hitNormal ? new THREE.Vector3(hitNormal.x, -hitNormal.y, hitNormal.z).normalize() : null,
            seed: undefined
        });
    } else if (symmetryAxis === 'z') {
        passes.push({
            x: lx, y: ly, z: 2 * mCenter.z - lz,
            norm: hitNormal ? new THREE.Vector3(hitNormal.x, hitNormal.y, -hitNormal.z).normalize() : null,
            seed: undefined
        });
    }

    // Smart Rivara Adaptive Subdivision on coarse faces inside the brush sphere
    const didSubdivide = maybeAdaptiveSubdivideNear(
        passes.map(p => [p.x, p.y, p.z]),
        queryRad,
        radius,
        passes.map(p => p.norm)
    );
    if (didSubdivide) passes[0].seed = undefined; // Face indices shifted after subdivision

    const geom = currentMesh.geometry;
    const colorAttr = geom.attributes.color;
    const posAttr = geom.attributes.position;
    if (!colorAttr || !posAttr) return;
    const colArr = colorAttr.array;
    const pos = posAttr.array;
    const faceCount = (posAttr.count / 3) | 0;
    if (!meshTopology || meshTopology.faceCount !== faceCount) {
        meshTopology = buildMeshTopology(geom);
    }

    const stampSize = (activeBrushTexture !== 'none') ? (brushTextureScale || (radius * 2)) : radius;
    const stampAngle = brushTextureAngle || 0;
    const stampInvert = isPatternInverted;
    let changed = false;

    const sculptTargetMm = (brushSculptMode === 'emboss') ? 0.4
        : (brushSculptMode === 'engrave' ? -0.4
        : (activeBrushTexture !== 'none' && brushPatternReliefMm !== 0 ? brushPatternReliefMm : 0));

    // Welded vertex displacements keyed by unique topological vertex ID -> 100% watertight & capped!
    const weldedDispMap = new Map();
    const invMat = new THREE.Matrix4().copy(currentMesh.matrixWorld).invert();
    const camUpLocal = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).transformDirection(invMat);

    for (let pIdx = 0; pIdx < passes.length; pIdx++) {
        const pass = passes[pIdx];
        const px = pass.x, py = pass.y, pz = pass.z;
        const normal = pass.norm;

        // Upright, non-mirrored screen-aligned tangent basis (FIXED!)
        let T = null, B = null;
        if (activeBrushTexture !== 'none' && brushTextureStampMode === 'stamp') {
            const N = (normal ? normal.clone() : new THREE.Vector3(0, 0, 1)).normalize();
            B = camUpLocal.clone().addScaledVector(N, -camUpLocal.dot(N));
            if (B.lengthSq() < 0.001) {
                const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).transformDirection(invMat);
                B = new THREE.Vector3().crossVectors(N, camRight);
            }
            B.normalize();
            T = new THREE.Vector3().crossVectors(B, N).normalize();
        }

        const rSq = radius * radius;
        const candidateFaces = collectBrushFaces(px, py, pz, queryRad, normal, pass.seed);

        for (let ci = 0; ci < candidateFaces.length; ci++) {
            const f = candidateFaces[ci];
            const p0 = f * 9;
            const v0x = pos[p0],     v0y = pos[p0 + 1], v0z = pos[p0 + 2];
            const v1x = pos[p0 + 3], v1y = pos[p0 + 4], v1z = pos[p0 + 5];
            const v2x = pos[p0 + 6], v2y = pos[p0 + 7], v2z = pos[p0 + 8];
            const f3 = f * 3;
            const cx = spatialGrid.faceCenters[f3];
            const cy = spatialGrid.faceCenters[f3 + 1];
            const cz = spatialGrid.faceCenters[f3 + 2];

            let hitMask = true;
            if (activeTool === 'airbrush') {
                // #7 3D Spatial Bayer Airbrush Dither: solid core -> smooth printable halftone feather!
                const distFromCenter = Math.hypot(cx - px, cy - py, cz - pz);
                if (distFromCenter > radius) {
                    hitMask = false;
                } else {
                    const normR = distFromCenter / Math.max(0.01, radius);
                    const coreR = Math.max(0.0, 1.0 - (airbrushSoftness || 0.72));
                    const density = normR <= coreR ? 1.0 : Math.max(0, 1.0 - (normR - coreR) / Math.max(0.05, 1.0 - coreR));
                    const bayerT = sampleBayer3D(cx, cy, cz, airbrushDotMm || 0.8);
                    if (density <= bayerT) hitMask = false;
                }
            } else if (activeBrushTexture !== 'none') {
                if (brushTextureStampMode === 'stamp' && T && B) {
                    const dx = cx - px, dy = cy - py, dz = cz - pz;
                    const uc = dx * T.x + dy * T.y + dz * T.z;
                    const vc = dx * B.x + dy * B.y + dz * B.z;
                    const hitC = evaluatePatternSDF(activeBrushTexture, uc, vc, stampSize, stampAngle, stampInvert, true);

                    const u0 = (v0x - px) * T.x + (v0y - py) * T.y + (v0z - pz) * T.z;
                    const v0 = (v0x - px) * B.x + (v0y - py) * B.y + (v0z - pz) * B.z;
                    const hit0 = evaluatePatternSDF(activeBrushTexture, u0, v0, stampSize, stampAngle, stampInvert, true);

                    const u1 = (v1x - px) * T.x + (v1y - py) * T.y + (v1z - pz) * T.z;
                    const v1 = (v1x - px) * B.x + (v1y - py) * B.y + (v1z - pz) * B.z;
                    const hit1 = evaluatePatternSDF(activeBrushTexture, u1, v1, stampSize, stampAngle, stampInvert, true);

                    const u2 = (v2x - px) * T.x + (v2y - py) * T.y + (v2z - pz) * T.z;
                    const v2 = (v2x - px) * B.x + (v2y - py) * B.y + (v2z - pz) * B.z;
                    const hit2 = evaluatePatternSDF(activeBrushTexture, u2, v2, stampSize, stampAngle, stampInvert, true);

                    const hit01 = evaluatePatternSDF(activeBrushTexture, (u0 + u1) * 0.5, (v0 + v1) * 0.5, stampSize, stampAngle, stampInvert, true);
                    const hit12 = evaluatePatternSDF(activeBrushTexture, (u1 + u2) * 0.5, (v1 + v2) * 0.5, stampSize, stampAngle, stampInvert, true);
                    const hit20 = evaluatePatternSDF(activeBrushTexture, (u2 + u0) * 0.5, (v2 + v0) * 0.5, stampSize, stampAngle, stampInvert, true);

                    const weight = (hitC ? 2 : 0) + (hit01 ? 1 : 0) + (hit12 ? 1 : 0) + (hit20 ? 1 : 0) + (hit0 ? 1 : 0) + (hit1 ? 1 : 0) + (hit2 ? 1 : 0);
                    if (weight < 4) hitMask = false;
                } else {
                    const dSq = pointTriangleDistSq(px, py, pz, v0x, v0y, v0z, v1x, v1y, v1z, v2x, v2y, v2z);
                    if (dSq > rSq || !evaluateBrushTexture(f, meshTopology.faceNormals)) hitMask = false;
                }
            } else {
                const d0 = ((v0x - px) ** 2 + (v0y - py) ** 2 + (v0z - pz) ** 2) <= rSq;
                const d1 = ((v1x - px) ** 2 + (v1y - py) ** 2 + (v1z - pz) ** 2) <= rSq;
                const d2 = ((v2x - px) ** 2 + (v2y - py) ** 2 + (v2z - pz) ** 2) <= rSq;
                const dC = ((cx - px) ** 2 + (cy - py) ** 2 + (cz - pz) ** 2) <= rSq;

                const m01x = (v0x + v1x) * 0.5 - px, m01y = (v0y + v1y) * 0.5 - py, m01z = (v0z + v1z) * 0.5 - pz;
                const d01 = (m01x * m01x + m01y * m01y + m01z * m01z) <= rSq;
                const m12x = (v1x + v2x) * 0.5 - px, m12y = (v1y + v2y) * 0.5 - py, m12z = (v1z + v2z) * 0.5 - pz;
                const d12 = (m12x * m12x + m12y * m12y + m12z * m12z) <= rSq;
                const m20x = (v2x + v0x) * 0.5 - px, m20y = (v2y + v0y) * 0.5 - py, m20z = (v2z + v0z) * 0.5 - pz;
                const d20 = (m20x * m20x + m20y * m20y + m20z * m20z) <= rSq;

                const solidWeight = (dC ? 2 : 0) + (d01 ? 1 : 0) + (d12 ? 1 : 0) + (d20 ? 1 : 0) + (d0 ? 1 : 0) + (d1 ? 1 : 0) + (d2 ? 1 : 0);
                const exactInside = pointTriangleDistSq(px, py, pz, v0x, v0y, v0z, v1x, v1y, v1z, v2x, v2y, v2z) <= rSq * 0.45;
                if (!exactInside && (solidWeight < 4 || (!dC && solidWeight < 5))) hitMask = false;
            }

            if (!hitMask) continue;

            // Watertight Welded Sculpting (moves ALL copies of welded vertex vid identically along smooth normal, strictly capped!)
            if (sculptTargetMm !== 0 && activeTool === 'brush' && meshTopology && meshTopology.vertIds) {
                const maxCap = Math.abs(sculptTargetMm);
                const sign = Math.sign(sculptTargetMm);
                const effRad = Math.max(radius, queryRad);
                for (let k = 0; k < 3; k++) {
                    const vid = meshTopology.vertIds[f * 3 + k];
                    if (weldedDispMap.has(vid)) continue;
                    const vx = pos[p0 + k * 3], vy = pos[p0 + k * 3 + 1], vz = pos[p0 + k * 3 + 2];
                    const d = Math.hypot(vx - px, vy - py, vz - pz);
                    if (d >= effRad) continue;
                    const falloff = 0.5 * (1 + Math.cos(Math.PI * (d / effRad)));
                    const desiredTotal = sign * maxCap * falloff;
                    const already = sculptAccumByVid.get(vid) || 0;
                    // Only move further toward desiredTotal, never overshoot maxCap!
                    const delta = (sign > 0)
                        ? Math.max(0, Math.min(desiredTotal - already, maxCap * 0.45 * falloff))
                        : Math.min(0, Math.max(desiredTotal - already, -maxCap * 0.45 * falloff));
                    if (Math.abs(delta) > 1e-4) {
                        weldedDispMap.set(vid, { delta, nextAccum: already + delta });
                    }
                }
            }

            if (triangleColors[f] !== targetColorSlot) {
                triangleColors[f] = targetColorSlot;
                colArr[p0]     = rgb[0]; colArr[p0 + 1] = rgb[1]; colArr[p0 + 2] = rgb[2];
                colArr[p0 + 3] = rgb[0]; colArr[p0 + 4] = rgb[1]; colArr[p0 + 5] = rgb[2];
                colArr[p0 + 6] = rgb[0]; colArr[p0 + 7] = rgb[1]; colArr[p0 + 8] = rgb[2];
                changed = true;
            }
        }
    }

    // Apply welded vertex displacements across EVERY shared triangle copy (100% crack-free!)
    if (weldedDispMap.size > 0 && meshTopology && meshTopology.weldedVertIndices) {
        const wn = meshTopology.weldedVertNormals;
        for (const [vid, info] of weldedDispMap.entries()) {
            const nx = wn[vid * 3], ny = wn[vid * 3 + 1], nz = wn[vid * 3 + 2];
            const dx = nx * info.delta, dy = ny * info.delta, dz = nz * info.delta;
            const copies = meshTopology.weldedVertIndices[vid];
            for (let c = 0; c < copies.length; c++) {
                const vi = copies[c] * 3;
                pos[vi]     += dx;
                pos[vi + 1] += dy;
                pos[vi + 2] += dz;
            }
            sculptAccumByVid.set(vid, info.nextAccum);
        }
        posAttr.needsUpdate = true;
        geom.computeVertexNormals();
        if (geom.disposeBoundsTree) geom.disposeBoundsTree();
        if (geom.computeBoundsTree) geom.computeBoundsTree();
        spatialGrid = new SpatialGrid(geom, 32);
        currentGeoGen++;
        strokeDidModifyGeo = true;
    }

    if (changed) {
        colorAttr.needsUpdate = true;
        strokeDidModify = true;
    }
}

// ==========================================
// ✂️ #3 LASER-SHARP MASKING TAPE CUT-PAINT EXECUTION
// ==========================================
function executeTapeCutPaint(mode = 'stripe') {
    if (!currentMesh || !triangleColors || tapePoints.length < 2) {
        showToast(currentLang === 'fr' ? "Placez au moins 2 points sur le modèle !" : "Place at least 2 points on the model first!");
        return;
    }
    const targetSlot = activeSlotIndex;
    const widthMm = Math.max(0.5, (parseFloat(document.getElementById('slider-brush-size')?.value) || 2) * 1.0);
    const pts = tapePoints.map(tp => tp.point.clone());
    const norms = tapePoints.map(tp => tp.normal.clone());

    // Average plane normal for local 2D projection
    const avgN = new THREE.Vector3();
    norms.forEach(n => avgN.add(n));
    if (avgN.lengthSq() < 1e-4) avgN.set(0, 0, 1);
    avgN.normalize();

    if (mode === 'loop' && pts.length >= 3) {
        // Split mesh along EVERY edge plane of the closed polygon for laser-sharp borders!
        let cx = 0, cy = 0, cz = 0;
        pts.forEach(p => { cx += p.x; cy += p.y; cz += p.z; });
        const center = new THREE.Vector3(cx / pts.length, cy / pts.length, cz / pts.length);
        let maxR = 2;
        pts.forEach(p => { maxR = Math.max(maxR, p.distanceTo(center)); });

        for (let i = 0; i < pts.length; i++) {
            const a = pts[i];
            const b = pts[(i + 1) % pts.length];
            const edgeDir = new THREE.Vector3().subVectors(b, a);
            if (edgeDir.lengthSq() < 1e-6) continue;
            const cutNormal = new THREE.Vector3().crossVectors(edgeDir, avgN).normalize();
            const segMid = a.clone().add(b).multiplyScalar(0.5);
            const segRad = a.distanceTo(b) * 0.6 + 1.5;
            splitMeshAlongPlane(a, cutNormal, segRad, segMid);
        }

        // Build 2D basis on avgN to run point-in-polygon test cleanly on split triangles
        const up = Math.abs(avgN.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
        const T = new THREE.Vector3().crossVectors(up, avgN).normalize();
        const B = new THREE.Vector3().crossVectors(avgN, T).normalize();
        const poly2D = pts.map(p => {
            const d = p.clone().sub(center);
            return [d.dot(T), d.dot(B)];
        });

        const pointInPoly = (x, y) => {
            let inside = false;
            for (let i = 0, j = poly2D.length - 1; i < poly2D.length; j = i++) {
                const xi = poly2D[i][0], yi = poly2D[i][1];
                const xj = poly2D[j][0], yj = poly2D[j][1];
                const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-9) + xi);
                if (intersect) inside = !inside;
            }
            return inside;
        };

        let painted = 0;
        const fc = meshTopology.faceCount;
        const fn = meshTopology.faceNormals;
        const fcent = meshTopology.faceCenters;
        for (let f = 0; f < fc; f++) {
            if (isBackfaceProtected) {
                if (fn[f * 3] * avgN.x + fn[f * 3 + 1] * avgN.y + fn[f * 3 + 2] * avgN.z < 0.25) continue;
            }
            const dx = fcent[f * 3] - center.x;
            const dy = fcent[f * 3 + 1] - center.y;
            const dz = fcent[f * 3 + 2] - center.z;
            if (dx * dx + dy * dy + dz * dz > (maxR + 2) ** 2) continue;
            const u = dx * T.x + dy * T.y + dz * T.z;
            const v = dx * B.x + dy * B.y + dz * B.z;
            if (pointInPoly(u, v)) {
                triangleColors[f] = targetSlot;
                painted++;
            }
        }
        updateMeshVisualColors();
        commitHistory(true);
        clearTapePreview();
        showToast(currentLang === 'fr' ? `Zone découpée au laser et peinte (${painted} faces) !` : `Laser-cut polygon filled (${painted} faces)!`);
    } else {
        // Laser Stripe mode: cut BOTH parallel borders at ±widthMm along each segment, then fill exact band!
        const halfW = widthMm * 0.5;
        for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i], b = pts[i + 1];
            const seg = new THREE.Vector3().subVectors(b, a);
            const segLen = seg.length();
            if (segLen < 1e-4) continue;
            const segDir = seg.clone().divideScalar(segLen);
            const segN = norms[i].clone().add(norms[i + 1]).normalize();
            const sideN = new THREE.Vector3().crossVectors(segDir, segN).normalize();
            const mid = a.clone().add(b).multiplyScalar(0.5);
            const scopeR = segLen * 0.55 + halfW + 1.5;

            splitMeshAlongPlane(a.clone().addScaledVector(sideN, halfW), sideN, scopeR, mid);
            splitMeshAlongPlane(a.clone().addScaledVector(sideN, -halfW), sideN, scopeR, mid);
            // Also cut clean start & end caps
            splitMeshAlongPlane(a, segDir, halfW + 2.0, a);
            splitMeshAlongPlane(b, segDir, halfW + 2.0, b);
        }

        let painted = 0;
        const fc = meshTopology.faceCount;
        const fn = meshTopology.faceNormals;
        const fcent = meshTopology.faceCenters;
        for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i], b = pts[i + 1];
            const seg = new THREE.Vector3().subVectors(b, a);
            const segLen = seg.length();
            if (segLen < 1e-4) continue;
            const segDir = seg.clone().divideScalar(segLen);
            const segN = norms[i].clone().add(norms[i + 1]).normalize();
            const sideN = new THREE.Vector3().crossVectors(segDir, segN).normalize();

            for (let f = 0; f < fc; f++) {
                if (isBackfaceProtected) {
                    if (fn[f * 3] * segN.x + fn[f * 3 + 1] * segN.y + fn[f * 3 + 2] * segN.z < 0.25) continue;
                }
                const dx = fcent[f * 3] - a.x;
                const dy = fcent[f * 3 + 1] - a.y;
                const dz = fcent[f * 3 + 2] - a.z;
                const along = dx * segDir.x + dy * segDir.y + dz * segDir.z;
                if (along < -0.02 || along > segLen + 0.02) continue;
                const across = Math.abs(dx * sideN.x + dy * sideN.y + dz * sideN.z);
                if (across <= halfW + 0.02) {
                    const depth = Math.abs(dx * segN.x + dy * segN.y + dz * segN.z);
                    if (depth <= halfW * 3 + 4) {
                        triangleColors[f] = targetSlot;
                        painted++;
                    }
                }
            }
        }
        updateMeshVisualColors();
        commitHistory(true);
        clearTapePreview();
        showToast(currentLang === 'fr' ? `Bande découpée au laser peinte (${painted} faces) !` : `Laser-sharp stripe painted (${painted} faces)!`);
    }
}

// ==========================================
// 🧩 #11 SMART SHELL / COMPONENT 1-CLICK FILL
// ==========================================
function shellComponentFillAtHit(hit) {
    if (!hit || hit.faceIndex === undefined || !currentMesh || !triangleColors) return;
    const geom = currentMesh.geometry;
    const faceCount = (geom.attributes.position.count / 3) | 0;
    if (!meshTopology || meshTopology.faceCount !== faceCount || !meshTopology.shells) {
        meshTopology = buildMeshTopology(geom);
    }
    const sid = meshTopology.shellOfFace[hit.faceIndex];
    if (sid < 0 || !meshTopology.shells[sid]) return;

    let painted = 0;
    const fillShell = (shellId) => {
        const list = meshTopology.shells[shellId];
        if (!list) return;
        for (let i = 0; i < list.length; i++) {
            const f = list[i];
            if (triangleColors[f] !== activeSlotIndex) {
                triangleColors[f] = activeSlotIndex;
                painted++;
            }
        }
    };
    fillShell(sid);

    // Optional Mirror Shell!
    if (symmetryAxis !== 'none' && spatialGrid) {
        const mCenter = getModelMirrorCenter();
        const s3 = hit.faceIndex * 3;
        let sx = meshTopology.faceCenters[s3], sy = meshTopology.faceCenters[s3 + 1], sz = meshTopology.faceCenters[s3 + 2];
        if (symmetryAxis === 'x') sx = 2 * mCenter.x - sx;
        else if (symmetryAxis === 'y') sy = 2 * mCenter.y - sy;
        else if (symmetryAxis === 'z') sz = 2 * mCenter.z - sz;

        let bestFace = -1, bestDist = Infinity;
        spatialGrid.querySphere(sx, sy, sz, 6.0, (cand) => {
            const c3 = cand * 3;
            const d = (meshTopology.faceCenters[c3] - sx) ** 2 + (meshTopology.faceCenters[c3 + 1] - sy) ** 2 + (meshTopology.faceCenters[c3 + 2] - sz) ** 2;
            if (d < bestDist) { bestDist = d; bestFace = cand; }
        });
        if (bestFace >= 0 && meshTopology.shellOfFace[bestFace] !== sid) {
            fillShell(meshTopology.shellOfFace[bestFace]);
        }
    }

    if (painted === 0) {
        showToast(currentLang === 'fr' ? "Cette pièce a déjà cette couleur." : "This component already uses this color.");
        return;
    }
    updateMeshVisualColors();
    commitHistory(false);
    showToast(currentLang === 'fr'
        ? `Pièce entière remplie (${painted.toLocaleString()} faces) !`
        : `Entire component filled (${painted.toLocaleString()} faces)!`);
}

// Smart Connected 3D Surface Flood Fill (Crease-Bounded OR Planar + Mirror support!)
function bucketFillAtHit(hit) {
    if (!hit || hit.faceIndex === undefined || !currentMesh || !triangleColors) return;
    const startSlot = triangleColors[hit.faceIndex];
    if (startSlot === activeSlotIndex) {
        showToast(currentLang === 'fr' ? "Cette zone utilise déjà cette couleur." : "This surface already uses this color.");
        return;
    }

    const geom = currentMesh.geometry;
    const faceCount = (geom.attributes.position.count / 3) | 0;
    if (!meshTopology || meshTopology.faceCount !== faceCount) {
        meshTopology = buildMeshTopology(geom);
    }
    if (!meshTopology) return;

    const toleranceDeg = parseFloat(document.getElementById('slider-angle')?.value) || 38;
    const cosTol = Math.cos((toleranceDeg * Math.PI) / 180);
    const checkConnected = document.getElementById('check-connected-fill')?.checked !== false;
    const planarGuard = (fillBehaviorMode === 'planar');

    let facesFilled = 0;

    if (checkConnected) {
        const visited = new Uint8Array(meshTopology.faceCount);
        const runFlood = (seedFace) => {
            if (seedFace < 0 || seedFace >= meshTopology.faceCount || visited[seedFace]) return;
            const queue = [seedFace];
            visited[seedFace] = 1;
            const seedSlot = triangleColors[seedFace];
            const hx = meshTopology.faceNormals[seedFace * 3];
            const hy = meshTopology.faceNormals[seedFace * 3 + 1];
            const hz = meshTopology.faceNormals[seedFace * 3 + 2];

            let queueHead = 0;
            while (queueHead < queue.length) {
                const f = queue[queueHead++];
                triangleColors[f] = activeSlotIndex;
                facesFilled++;

                const curNx = meshTopology.faceNormals[f * 3];
                const curNy = meshTopology.faceNormals[f * 3 + 1];
                const curNz = meshTopology.faceNormals[f * 3 + 2];
                const neighbors = meshTopology.faceNeighbors[f];

                for (let i = 0; i < neighbors.length; i++) {
                    const nb = neighbors[i];
                    if (visited[nb]) continue;
                    const nb3 = nb * 3;
                    const nx = meshTopology.faceNormals[nb3];
                    const ny = meshTopology.faceNormals[nb3 + 1];
                    const nz = meshTopology.faceNormals[nb3 + 2];
                    if (curNx * nx + curNy * ny + curNz * nz < cosTol) continue;
                    if (planarGuard && (hx * nx + hy * ny + hz * nz < cosTol)) continue;
                    if (seedSlot !== undefined && triangleColors[nb] !== seedSlot) continue;
                    visited[nb] = 1;
                    queue.push(nb);
                }
            }
        };

        runFlood(hit.faceIndex);

        if (symmetryAxis !== 'none' && spatialGrid) {
            const mCenter = getModelMirrorCenter();
            const s3 = hit.faceIndex * 3;
            let sx = meshTopology.faceCenters[s3], sy = meshTopology.faceCenters[s3 + 1], sz = meshTopology.faceCenters[s3 + 2];
            let snx = meshTopology.faceNormals[s3], sny = meshTopology.faceNormals[s3 + 1], snz = meshTopology.faceNormals[s3 + 2];
            if (symmetryAxis === 'x') { sx = 2 * mCenter.x - sx; snx = -snx; }
            else if (symmetryAxis === 'y') { sy = 2 * mCenter.y - sy; sny = -sny; }
            else if (symmetryAxis === 'z') { sz = 2 * mCenter.z - sz; snz = -snz; }

            let bestFace = -1, bestDistSq = Infinity;
            spatialGrid.querySphere(sx, sy, sz, 6.0, (candFace) => {
                if (visited[candFace]) return;
                const c3 = candFace * 3;
                if (snx * meshTopology.faceNormals[c3] + sny * meshTopology.faceNormals[c3 + 1] + snz * meshTopology.faceNormals[c3 + 2] < 0.65) return;
                const dSq = (meshTopology.faceCenters[c3] - sx) ** 2 + (meshTopology.faceCenters[c3 + 1] - sy) ** 2 + (meshTopology.faceCenters[c3 + 2] - sz) ** 2;
                if (dSq < bestDistSq) { bestDistSq = dSq; bestFace = candFace; }
            });
            if (bestFace !== -1) runFlood(bestFace);
        }
    } else {
        const hx = meshTopology.faceNormals[hit.faceIndex * 3];
        const hy = meshTopology.faceNormals[hit.faceIndex * 3 + 1];
        const hz = meshTopology.faceNormals[hit.faceIndex * 3 + 2];
        for (let f = 0; f < meshTopology.faceCount; f++) {
            const f3 = f * 3;
            const dot = meshTopology.faceNormals[f3] * hx + meshTopology.faceNormals[f3 + 1] * hy + meshTopology.faceNormals[f3 + 2] * hz;
            if (dot >= cosTol && (startSlot === undefined || triangleColors[f] === startSlot)) {
                triangleColors[f] = activeSlotIndex;
                facesFilled++;
            }
        }
    }

    if (facesFilled > 0) {
        updateMeshVisualColors();
        commitHistory(false);
    }
    const tmpl = translations[currentLang].toastBucketApplied || "Smart surface fill applied ({faces} faces)!";
    showToast(tmpl.replace('{faces}', facesFilled.toLocaleString()));
}

function eyedropperAtHit(hit) {
    if (!hit || hit.faceIndex === undefined) return;
    const slot = triangleColors[hit.faceIndex];
    selectSlot(slot);
    selectTool('brush');
    const slotName = (filamentSlots[slot] && filamentSlots[slot].name) ? filamentSlots[slot].name : `Slot #${slot + 1}`;
    showToast(currentLang === 'fr'
        ? `Couleur pipetée : Slot #${slot + 1} (${slotName})`
        : `Color picked: Slot #${slot + 1} (${slotName})`);
}

function smartWandAtHit(hit) {
    if (!hit || hit.faceIndex === undefined || !currentMesh || !triangleColors) return;
    if (triangleColors[hit.faceIndex] === activeSlotIndex) {
        showToast(currentLang === 'fr' ? "Cette zone utilise déjà cette couleur." : "This zone already uses this color.");
        return;
    }

    const geom = currentMesh.geometry;
    const faceCount = (geom.attributes.position.count / 3) | 0;
    if (!meshTopology || meshTopology.faceCount !== faceCount) {
        meshTopology = buildMeshTopology(geom);
    }
    if (!meshTopology) return;

    const toleranceDeg = parseFloat(document.getElementById('slider-angle')?.value) || 38;
    const cosTol = Math.cos((toleranceDeg * Math.PI) / 180);
    const visited = new Uint8Array(meshTopology.faceCount);
    let facesFilled = 0;

    // Magic Wand always uses Crease-Bounded flood (follows smooth curves across cylinders/heads!)
    function floodFromFace(seedFace) {
        if (seedFace < 0 || seedFace >= meshTopology.faceCount || visited[seedFace]) return;
        const queue = [seedFace];
        visited[seedFace] = 1;
        const seedSlot = triangleColors[seedFace];

        let head = 0;
        while (head < queue.length) {
            const f = queue[head++];
            triangleColors[f] = activeSlotIndex;
            facesFilled++;

            const curNx = meshTopology.faceNormals[f * 3];
            const curNy = meshTopology.faceNormals[f * 3 + 1];
            const curNz = meshTopology.faceNormals[f * 3 + 2];
            const neighbors = meshTopology.faceNeighbors[f];

            for (let i = 0; i < neighbors.length; i++) {
                const nb = neighbors[i];
                if (visited[nb]) continue;
                const nb3 = nb * 3;
                if (curNx * meshTopology.faceNormals[nb3] + curNy * meshTopology.faceNormals[nb3 + 1] + curNz * meshTopology.faceNormals[nb3 + 2] < cosTol) continue;
                if (seedSlot !== undefined && triangleColors[nb] !== seedSlot) continue;
                visited[nb] = 1;
                queue.push(nb);
            }
        }
    }

    floodFromFace(hit.faceIndex);

    if (symmetryAxis !== 'none' && spatialGrid) {
        const mCenter = getModelMirrorCenter();
        const s3 = hit.faceIndex * 3;
        let sx = meshTopology.faceCenters[s3], sy = meshTopology.faceCenters[s3 + 1], sz = meshTopology.faceCenters[s3 + 2];
        let snx = meshTopology.faceNormals[s3], sny = meshTopology.faceNormals[s3 + 1], snz = meshTopology.faceNormals[s3 + 2];
        if (symmetryAxis === 'x') { sx = 2 * mCenter.x - sx; snx = -snx; }
        else if (symmetryAxis === 'y') { sy = 2 * mCenter.y - sy; sny = -sny; }
        else if (symmetryAxis === 'z') { sz = 2 * mCenter.z - sz; snz = -snz; }

        let bestFace = -1, bestDistSq = Infinity;
        const geomBox = geom.boundingBox || (geom.computeBoundingBox(), geom.boundingBox);
        const bSize = new THREE.Vector3();
        geomBox.getSize(bSize);
        const searchRad = Math.max(2.5, Math.max(bSize.x, bSize.y, bSize.z) * 0.12);

        spatialGrid.querySphere(sx, sy, sz, searchRad, (candFace) => {
            if (candFace === hit.faceIndex || visited[candFace]) return;
            const c3 = candFace * 3;
            if (snx * meshTopology.faceNormals[c3] + sny * meshTopology.faceNormals[c3 + 1] + snz * meshTopology.faceNormals[c3 + 2] < 0.65) return;
            const dSq = (meshTopology.faceCenters[c3] - sx) ** 2 + (meshTopology.faceCenters[c3 + 1] - sy) ** 2 + (meshTopology.faceCenters[c3 + 2] - sz) ** 2;
            if (dSq < bestDistSq) { bestDistSq = dSq; bestFace = candFace; }
        });
        if (bestFace !== -1) floodFromFace(bestFace);
    }

    if (facesFilled > 0) {
        updateMeshVisualColors();
        commitHistory(false);
    }
    const template = translations[currentLang].toastWandApplied || "Magic Wand filled {faces} faces!";
    showToast(template.replace('{faces}', facesFilled.toLocaleString()));
}

// ==========================================
// 🎨 TEXTURE & PATTERN BRUSHES (26 PATTERNS IN STAMP, TILE & 3D TACTILE RELIEF MODES)
// ==========================================
function updateBrushTexture(val) {
    if (val === undefined) {
        const sel = document.getElementById('select-brush-texture');
        val = sel ? sel.value : 'none';
    }
    activeBrushTexture = val || 'none';
    const grp = document.getElementById('group-texture-scale');
    if (grp) grp.style.display = (activeBrushTexture === 'none') ? 'none' : 'block';
    drawPatternPreview();
    if (activeBrushTexture !== 'none') {
        const selectEl = document.getElementById('select-brush-texture');
        const optName = (selectEl && selectEl.selectedOptions && selectEl.selectedOptions[0])
            ? selectEl.selectedOptions[0].text : activeBrushTexture;
        showToast((currentLang === 'fr' ? "Motif activé : " : "Pattern active: ") + optName);
    }
}

function updateBrushTextureScale(val) {
    if (val === undefined) {
        const el = document.getElementById('slider-texture-scale');
        val = el ? el.value : 14.0;
    }
    brushTextureScale = parseFloat(val) || 14.0;
    const lbl = document.getElementById('val-texture-scale');
    if (lbl) lbl.innerText = `${brushTextureScale} mm`;
    drawPatternPreview();
}

function updateBrushTextureAngle(val) {
    if (val === undefined) {
        const el = document.getElementById('slider-texture-angle');
        val = el ? el.value : 0;
    }
    brushTextureAngle = parseInt(val, 10) || 0;
    const lbl = document.getElementById('val-texture-angle');
    if (lbl) lbl.innerText = `${brushTextureAngle}°`;
    drawPatternPreview();
}

function updatePatternRelief(val) {
    if (val === undefined) {
        const el = document.getElementById('slider-pattern-relief');
        val = el ? el.value : 0;
    }
    brushPatternReliefMm = parseFloat(val) || 0;
    const lbl = document.getElementById('val-pattern-relief');
    if (lbl) lbl.innerText = brushPatternReliefMm === 0 ? '0 mm (Flat)' : `${brushPatternReliefMm > 0 ? '+' : ''}${brushPatternReliefMm.toFixed(1)} mm`;
}

function setPatternScalePreset(presetVal) {
    brushTextureScale = presetVal;
    const slider = document.getElementById('slider-texture-scale');
    if (slider) slider.value = presetVal;
    const lbl = document.getElementById('val-texture-scale');
    if (lbl) lbl.innerText = `${presetVal} mm`;
    drawPatternPreview();
}

function autoFitPatternScale() {
    if (!currentMesh) { setPatternScalePreset(14); return; }
    const box = new THREE.Box3().setFromObject(currentMesh);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 50;
    const autoScale = Math.max(4, Math.min(48, Math.round(maxDim * 0.22)));
    setPatternScalePreset(autoScale);
    showToast(currentLang === 'fr' ? `Échelle ajustée à ${autoScale} mm` : `Pattern scale auto-fitted to ${autoScale} mm`);
}

function setBrushTextureStampMode(mode) {
    brushTextureStampMode = mode;
    const btnStamp = document.getElementById('btn-tex-mode-stamp');
    const btnTile = document.getElementById('btn-tex-mode-tile');
    if (btnStamp) btnStamp.classList.toggle('active', mode === 'stamp');
    if (btnTile) btnTile.classList.toggle('active', mode === 'tile');
    drawPatternPreview();
    showToast(mode === 'stamp'
        ? (currentLang === 'fr' ? "Mode Tampon : forme centrée sous le curseur !" : "Stamp Mode: shape centered at brush cursor!")
        : (currentLang === 'fr' ? "Mode Pavage : motif continu sur la surface !" : "Tiling Mode: continuous seamless surface texture!"));
}

function togglePatternInvert() {
    isPatternInverted = !isPatternInverted;
    const btn = document.getElementById('btn-pattern-invert');
    if (btn) btn.classList.toggle('active', isPatternInverted);
    drawPatternPreview();
    showToast(translations[currentLang].toastPatternInverted);
}

function resetPatternSettings() {
    brushTextureScale = 14.0;
    brushTextureAngle = 0;
    isPatternInverted = false;
    const sliderScale = document.getElementById('slider-texture-scale');
    if (sliderScale) sliderScale.value = 14.0;
    const lblScale = document.getElementById('val-texture-scale');
    if (lblScale) lblScale.innerText = '14 mm';
    const sliderAngle = document.getElementById('slider-texture-angle');
    if (sliderAngle) sliderAngle.value = 0;
    const lblAngle = document.getElementById('val-texture-angle');
    if (lblAngle) lblAngle.innerText = '0°';
    const btn = document.getElementById('btn-pattern-invert');
    if (btn) btn.classList.remove('active');
    drawPatternPreview();
    showToast(currentLang === 'fr' ? "Réglages du motif réinitialisés." : "Pattern settings reset.");
}

function drawPatternPreview() {
    const canvas = document.getElementById('canvas-pattern-preview');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    if (activeBrushTexture === 'none') {
        ctx.fillStyle = filamentSlots[activeSlotIndex] ? filamentSlots[activeSlotIndex].color : '#38bdf8';
        ctx.fillRect(4, 4, w - 8, h - 8);
        const lbl = document.getElementById('lbl-pattern-preview-name');
        if (lbl) lbl.innerText = currentLang === 'fr' ? "Peinture Pleine" : "Solid Paint";
        return;
    }

    const fgColor = filamentSlots[activeSlotIndex] ? filamentSlots[activeSlotIndex].color : '#38bdf8';
    const bgColor = '#1e293b';
    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;

    const fg = hexToRgb(fgColor);
    const bg = hexToRgb(bgColor);
    const previewScaleRatio = (brushTextureScale || 14.0) * (w / 28);
    const isStampMode = (brushTextureStampMode === 'stamp');

    for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
            const u = (px - w / 2);
            const v = -(py - h / 2); // Match 3D camera-up (+B) vertical axis!
            const hit = evaluatePatternSDF(activeBrushTexture, u, v, previewScaleRatio, brushTextureAngle, isPatternInverted, isStampMode);
            const idx = (py * w + px) * 4;
            data[idx]     = hit ? fg.r : bg.r;
            data[idx + 1] = hit ? fg.g : bg.g;
            data[idx + 2] = hit ? fg.b : bg.b;
            data[idx + 3] = 255;
        }
    }
    ctx.putImageData(imgData, 0, 0);

    const lbl = document.getElementById('lbl-pattern-preview-name');
    if (lbl) {
        const selectEl = document.getElementById('select-brush-texture');
        if (selectEl && selectEl.selectedOptions && selectEl.selectedOptions[0]) {
            lbl.innerText = selectEl.selectedOptions[0].text;
        }
    }
}

function evaluatePatternSDF(pattern, u, v, scale, angleDeg, invert, isSingleStamp) {
    if (pattern === 'none') return true;

    const rad = ((angleDeg || 0) * Math.PI) / 180;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);
    const rotU = u * cosA - v * sinA;
    const rotV = u * sinA + v * cosA;

    const s = Math.max(0.5, scale || 14.0);
    const su = rotU / s;
    const sv = rotV / s;

    let isHit = false;

    if (isSingleStamp) {
        // Clamp outside stamp disc so Stamp Mode NEVER bleeds outside cursor boundary (even when inverted!)
        const radialR = Math.hypot(su, sv);
        if (radialR > 0.52) return false;

        switch (pattern) {
            case 'stars': {
                const lx = su * 2.0, ly = sv * 2.0;
                const r = Math.hypot(lx, ly);
                if (r > 0.52) isHit = false;
                else if (r < 0.20) isHit = true;
                else {
                    const angle = Math.atan2(ly, lx) - Math.PI / 2;
                    const a5 = Math.abs(((angle * 5 / (2 * Math.PI)) % 1 + 1) % 1 - 0.5) * 2;
                    isHit = r <= (0.20 + 0.28 * a5);
                }
                return invert ? !isHit : isHit;
            }
            case 'hearts': {
                const x = su * 2.6, y = sv * 2.6 + 0.12;
                const a = x * x + y * y - 0.45;
                isHit = (a * a * a - x * x * y * y * y) <= 0.0;
                return invert ? !isHit : isHit;
            }
            case 'pawprints': {
                const lx = su * 2.2, ly = sv * 2.2;
                const pad = (lx * lx) / 0.055 + ((ly + 0.05) ** 2) / 0.035 < 1.0;
                const t1 = ((lx + 0.22) ** 2 + (ly - 0.20) ** 2) < 0.015;
                const t2 = ((lx + 0.08) ** 2 + (ly - 0.32) ** 2) < 0.016;
                const t3 = ((lx - 0.08) ** 2 + (ly - 0.32) ** 2) < 0.016;
                const t4 = ((lx - 0.22) ** 2 + (ly - 0.20) ** 2) < 0.015;
                isHit = pad || t1 || t2 || t3 || t4;
                return invert ? !isHit : isHit;
            }
            case 'skull': {
                const lx = su * 2.0, ly = sv * 2.0;
                const cranium = (lx * lx) / 0.20 + (ly * ly) / 0.18 < 1.0;
                const jaw = Math.abs(lx) < 0.22 && ly <= -0.15 && ly > -0.42;
                const eyeL = (lx + 0.18) ** 2 + (ly + 0.05) ** 2 < 0.024;
                const eyeR = (lx - 0.18) ** 2 + (ly + 0.05) ** 2 < 0.024;
                const nose = (lx * lx) / 0.008 + ((ly + 0.18) ** 2) / 0.015 < 1.0;
                isHit = (cranium || jaw) && !eyeL && !eyeR && !nose;
                return invert ? !isHit : isHit;
            }
            case 'gears': {
                const lx = su * 2.0, ly = sv * 2.0;
                const r = Math.hypot(lx, ly);
                if (r > 0.48) isHit = false;
                else {
                    const gearR = 0.38 + 0.09 * Math.cos(8 * Math.atan2(ly, lx));
                    const axleHole = (r < 0.11 && r > 0.04);
                    isHit = (r <= gearR && !axleHole);
                }
                return invert ? !isHit : isHit;
            }
            case 'diamonds': isHit = (Math.abs(su) + Math.abs(sv)) < 0.45; return invert ? !isHit : isHit;
            case 'polkadots': isHit = (su * su + sv * sv) < 0.20; return invert ? !isHit : isHit;
            case 'foliage': {
                const lx = su * 2.2, ly = sv * 2.2;
                const leaf = (lx * lx + ly * ly) < 0.52 && Math.abs(lx) < (0.55 - Math.abs(ly * 0.55));
                const stem = Math.abs(lx - ly * 0.35) < 0.09 && ly < 0.45;
                isHit = leaf || stem;
                return invert ? !isHit : isHit;
            }
            case 'lightning': {
                const lx = su * 2.1, ly = sv * 2.1;
                const topBolt = ly >= 0 && Math.abs(lx + ly * 0.45 - 0.12) < 0.18 && ly < 0.45;
                const botBolt = ly < 0 && Math.abs(lx + ly * 0.45 + 0.08) < 0.18 && ly > -0.45;
                isHit = topBolt || botBolt;
                return invert ? !isHit : isHit;
            }
            case 'honeycomb': {
                const qx = Math.abs(su), qy = Math.abs(sv);
                isHit = (qx * 1.15 + qy * 0.65) < 0.44 && qy < 0.42;
                return invert ? !isHit : isHit;
            }
        }
    }

    // Seamless Tiling / Continuous Pattern Mode
    switch (pattern) {
        case 'hearts': {
            const row = Math.floor(sv + 0.5), uOff = (Math.abs(row) % 2 === 1) ? 0.5 : 0.0;
            const col = Math.floor(su - uOff + 0.5);
            const lx = (su - uOff - col) * 2.3, ly = (sv - row) * 2.3;
            const x = lx * 1.3, y = ly * 1.3 + 0.12, a = x * x + y * y - 0.45;
            isHit = (a * a * a - x * x * y * y * y) <= 0.0;
            break;
        }
        case 'waves': isHit = Math.cos(su * 1.6 + Math.sin(sv * 1.2) * 1.4) > 0.05; break;
        case 'pawprints': {
            const row = Math.floor(sv * 0.8 + 0.5), uOff = (Math.abs(row) % 2 === 1) ? 0.5 : 0.0;
            const col = Math.floor(su * 0.8 - uOff + 0.5);
            const lx = (su * 0.8 - uOff - col) * 2.4, ly = (sv * 0.8 - row) * 2.4;
            const pad = (lx * lx) / 0.055 + ((ly + 0.05) ** 2) / 0.035 < 1.0;
            const t1 = ((lx + 0.22) ** 2 + (ly - 0.20) ** 2) < 0.015;
            const t2 = ((lx + 0.08) ** 2 + (ly - 0.32) ** 2) < 0.016;
            const t3 = ((lx - 0.08) ** 2 + (ly - 0.32) ** 2) < 0.016;
            const t4 = ((lx - 0.22) ** 2 + (ly - 0.20) ** 2) < 0.015;
            isHit = pad || t1 || t2 || t3 || t4;
            break;
        }
        case 'scales': {
            const row = Math.floor(sv * 1.2 + 0.5), uOff = (Math.abs(row) % 2 === 1) ? 0.5 : 0.0;
            const col = Math.floor(su - uOff + 0.5);
            const cu = su - uOff - col, cv = sv * 1.2 - row;
            isHit = (cu * cu + cv * cv) < 0.26;
            break;
        }
        case 'wood': {
            const dist = Math.hypot(su, sv);
            const warp = Math.sin(su * 1.2) * 0.6 + Math.sin(sv * 1.2) * 0.6;
            isHit = Math.cos((dist + warp) * 3.2) > 0.0;
            break;
        }
        case 'voronoi': {
            const gu = Math.floor(su + 0.5), gv = Math.floor(sv + 0.5);
            let minDist = 999, secondDist = 999;
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    const nCol = gu + i, nRow = gv + j;
                    const seed = Math.sin(nCol * 127.1 + nRow * 311.7) * 43758.5453;
                    const px = nCol + (seed - Math.floor(seed));
                    const seed2 = Math.sin(nCol * 269.5 + nRow * 183.3) * 43758.5453;
                    const py = nRow + (seed2 - Math.floor(seed2));
                    const d = Math.hypot(su - px, sv - py);
                    if (d < minDist) { secondDist = minDist; minDist = d; }
                    else if (d < secondDist) secondDist = d;
                }
            }
            isHit = (secondDist - minDist) < 0.22;
            break;
        }
        case 'foliage': {
            const frow = Math.floor(sv * 0.9 + 0.5), uOff = (Math.abs(frow) % 2 === 1) ? 0.5 : 0.0;
            const fcol = Math.floor(su * 0.9 - uOff + 0.5);
            const lx = (su * 0.9 - uOff - fcol) * 2.2, ly = (sv * 0.9 - frow) * 2.2;
            isHit = ((lx * lx + ly * ly) < 0.52 && Math.abs(lx) < (0.55 - Math.abs(ly * 0.55))) || (Math.abs(lx - ly * 0.35) < 0.09 && ly < 0.45);
            break;
        }
        case 'stars': {
            const row = Math.floor(sv + 0.5), uOff = (Math.abs(row) % 2 === 1) ? 0.5 : 0.0;
            const col = Math.floor(su - uOff + 0.5);
            const lx = (su - uOff - col) * 2.0, ly = (sv - row) * 2.0;
            const r = Math.hypot(lx, ly);
            if (r > 0.48) isHit = false;
            else if (r < 0.20) isHit = true;
            else {
                const angle = Math.atan2(ly, lx) - Math.PI / 2;
                const a5 = Math.abs(((angle * 5 / (2 * Math.PI)) % 1 + 1) % 1 - 0.5) * 2;
                isHit = r <= (0.20 + 0.26 * a5);
            }
            break;
        }
        case 'lightning': {
            const bolt = su * 1.5 + Math.sin(sv * 2.4) * 0.45;
            isHit = Math.abs(((bolt + 0.5) % 1 + 1) % 1 - 0.5) < 0.22;
            break;
        }
        case 'puzzle': {
            const gu = (((su + 0.5) % 1) + 1) % 1, gv = (((sv + 0.5) % 1) + 1) % 1;
            const edgeDistU = Math.min(gu, 1 - gu), edgeDistV = Math.min(gv, 1 - gv);
            const tabU = Math.abs(gu - 0.5) < 0.18 && Math.abs(gv - 0.5) > 0.32;
            const tabV = Math.abs(gv - 0.5) < 0.18 && Math.abs(gu - 0.5) > 0.32;
            isHit = (edgeDistU < 0.12 || edgeDistV < 0.12 || tabU || tabV);
            break;
        }
        case 'bricks': {
            const brow = Math.floor(sv * 1.5 + 0.5), uOff = (Math.abs(brow) % 2 === 1) ? 0.5 : 0.0;
            const bcol = Math.floor(su * 0.75 - uOff + 0.5);
            isHit = (Math.abs(su * 0.75 - uOff - bcol) < 0.44 && Math.abs(sv * 1.5 - brow) < 0.42);
            break;
        }
        case 'gears': {
            const row = Math.floor(sv * 0.85 + 0.5), uOff = (Math.abs(row) % 2 === 1) ? 0.5 : 0.0;
            const col = Math.floor(su * 0.85 - uOff + 0.5);
            const lx = (su * 0.85 - uOff - col) * 2.0, ly = (sv * 0.85 - row) * 2.0;
            const r = Math.hypot(lx, ly);
            isHit = r <= 0.48 && r <= (0.38 + 0.09 * Math.cos(8 * Math.atan2(ly, lx)));
            break;
        }
        case 'skull': {
            const row = Math.floor(sv * 0.85 + 0.5), uOff = (Math.abs(row) % 2 === 1) ? 0.5 : 0.0;
            const col = Math.floor(su * 0.85 - uOff + 0.5);
            const lx = (su * 0.85 - uOff - col) * 2.0, ly = (sv * 0.85 - row) * 2.0;
            const cranium = (lx * lx) / 0.20 + (ly * ly) / 0.18 < 1.0;
            const jaw = Math.abs(lx) < 0.22 && ly <= -0.15 && ly > -0.42;
            const eyeL = (lx + 0.18) ** 2 + (ly + 0.05) ** 2 < 0.024;
            const eyeR = (lx - 0.18) ** 2 + (ly + 0.05) ** 2 < 0.024;
            const nose = (lx * lx) / 0.008 + ((ly + 0.18) ** 2) / 0.015 < 1.0;
            isHit = (cranium || jaw) && !eyeL && !eyeR && !nose;
            break;
        }
        case 'honeycomb': {
            const hx = su * 1.15, hy = sv * 1.15;
            const qx = Math.abs(((hx * 1.732) % 1 + 1.5) % 1 - 0.5);
            const qy = Math.abs(((hy % 1) + 1.5) % 1 - 0.5);
            isHit = (qx * 1.5 + qy < 0.68);
            break;
        }
        case 'carbon': {
            const step = 0.7, bu = Math.floor(su / step), bv = Math.floor(sv / step);
            const subU = (su / step) - bu, subV = (sv / step) - bv;
            isHit = ((bu + bv) % 2 === 0) ? (Math.floor(subU * 4) % 2 === 0) : (Math.floor(subV * 4) % 2 === 0);
            break;
        }
        case 'diamonds': {
            const du = Math.abs(((su % 1) + 1.5) % 1 - 0.5), dv = Math.abs(((sv % 1) + 1.5) % 1 - 0.5);
            isHit = (du + dv) < 0.44;
            break;
        }
        case 'checker': isHit = (Math.abs(Math.floor(su + 0.5) + Math.floor(sv + 0.5))) % 2 === 0; break;
        case 'polkadots': {
            const row = Math.floor(sv + 0.5), uOff = (Math.abs(row) % 2 === 1) ? 0.5 : 0.0;
            const col = Math.floor(su - uOff + 0.5);
            isHit = ((su - uOff - col) ** 2 + (sv - row) ** 2) < 0.16;
            break;
        }
        case 'triangles': {
            const tu = (((su + 0.5) % 1) + 1) % 1, tv = ((((sv * 1.732) + 0.5) % 1) + 1) % 1;
            isHit = (tu < 0.12 || tv < 0.12 || Math.abs(tu - tv) < 0.12 || Math.abs(tu + tv - 1.0) < 0.12);
            break;
        }
        case 'chainmail': {
            const modU = Math.abs(Math.sin((su + 0.5) * Math.PI)), modV = Math.abs(Math.sin((sv + 0.5) * Math.PI));
            isHit = (modU > 0.58 || modV > 0.58) && (modU < 0.96 && modV < 0.96);
            break;
        }
        case 'houndstooth': {
            const hu = Math.floor(su * 1.5), hv = Math.floor(sv * 1.5);
            const fhu = (((su * 1.5) % 1) + 1) % 1, fhv = (((sv * 1.5) % 1) + 1) % 1;
            const check = (hu + hv) % 2 === 0, notch = fhu + fhv > 1.0;
            isHit = check ? notch : !notch;
            break;
        }
        case 'spiral': isHit = Math.cos(Math.hypot(su, sv) * 3.2 - Math.atan2(sv, su) * 2.0) > 0.0; break;
        case 'zebra': isHit = Math.sin(su * 2.2 + Math.sin(sv * 1.6) * 2.5 + Math.cos(su * 0.7) * 1.2) > 0.0; break;
        case 'camouflage': isHit = (Math.sin(su * 1.3) + Math.cos(sv * 1.1) + Math.sin((su + sv) * 0.8) + Math.cos((su - sv) * 0.9)) > 0.4; break;
        case 'circuit': {
            const gcu = (((su * 1.4) % 1) + 1.5) % 1, gcv = (((sv * 1.4) % 1) + 1.5) % 1;
            isHit = Math.abs(gcu - 0.5) < 0.12 || Math.abs(gcv - 0.5) < 0.12 || ((gcu - 0.5) ** 2 + (gcv - 0.5) ** 2) < 0.06;
            break;
        }
        case 'dither': {
            const hash = Math.abs(Math.sin(rotU * 12.9898 + rotV * 78.233) * 43758.5453);
            isHit = (hash - Math.floor(hash)) > 0.45;
            break;
        }
        default: isHit = true;
    }

    return invert ? !isHit : isHit;
}

function evaluateBrushTexture(f, faceNormalsArr) {
    if (!spatialGrid || !spatialGrid.faceCenters || !currentMesh) return true;
    const pos = currentMesh.geometry.attributes.position.array;
    const f3 = f * 3;
    const cx = spatialGrid.faceCenters[f3], cy = spatialGrid.faceCenters[f3 + 1], cz = spatialGrid.faceCenters[f3 + 2];

    let nx = 0, ny = 1, nz = 0;
    if (faceNormalsArr) {
        // Supports both per-face (faceCount*3) and per-vertex (faceCount*9) normal arrays safely!
        const isPerFace = (faceNormalsArr.length === spatialGrid.faceCenters.length);
        const nIdx = isPerFace ? f3 : (f * 9);
        nx = Math.abs(faceNormalsArr[nIdx]);
        ny = Math.abs(faceNormalsArr[nIdx + 1]);
        nz = Math.abs(faceNormalsArr[nIdx + 2]);
    }
    const projMode = (ny >= nx && ny >= nz) ? 2 : ((nx >= ny && nx >= nz) ? 1 : 0);
    const getU = (x, y, z) => (projMode === 2 ? x : (projMode === 1 ? z : x));
    const getV = (x, y, z) => (projMode === 2 ? z : y);

    const sc = brushTextureScale || 14.0, ang = brushTextureAngle || 0, inv = isPatternInverted, pat = activeBrushTexture;
    const hitC = evaluatePatternSDF(pat, getU(cx, cy, cz), getV(cx, cy, cz), sc, ang, inv, false);
    const p0 = f * 9;
    const hit0 = evaluatePatternSDF(pat, getU(pos[p0], pos[p0 + 1], pos[p0 + 2]), getV(pos[p0], pos[p0 + 1], pos[p0 + 2]), sc, ang, inv, false);
    const hit1 = evaluatePatternSDF(pat, getU(pos[p0 + 3], pos[p0 + 4], pos[p0 + 5]), getV(pos[p0 + 3], pos[p0 + 4], pos[p0 + 5]), sc, ang, inv, false);
    const hit2 = evaluatePatternSDF(pat, getU(pos[p0 + 6], pos[p0 + 7], pos[p0 + 8]), getV(pos[p0 + 6], pos[p0 + 7], pos[p0 + 8]), sc, ang, inv, false);

    return ((hitC ? 1 : 0) + (hit0 ? 1 : 0) + (hit1 ? 1 : 0) + (hit2 ? 1 : 0)) >= 2;
}

function applyTexturePatternToModel(scope) {
    if (!currentMesh || !triangleColors) {
        showToast(currentLang === 'fr' ? "Veuillez charger un modèle d'abord." : "Please load a 3D model first.");
        return;
    }
    if (activeBrushTexture === 'none') {
        showToast(currentLang === 'fr' ? "Sélectionnez un motif d'abord !" : "Select a pattern first!");
        return;
    }

    // Auto-refine very coarse models once so whole-model pattern is crisp!
    let geom = currentMesh.geometry;
    let totalFaces = triangleColors.length;
    let didGeoChange = false;
    if (totalFaces < 6000 && isAdaptiveBrushEnabled) {
        const allF = new Set();
        for (let f = 0; f < totalFaces; f++) allF.add(f);
        if (subdivideFacesLocal(allF, 1, true)) {
            didGeoChange = true;
            geom = currentMesh.geometry;
            totalFaces = triangleColors.length;
        }
    }

    if (!meshTopology || meshTopology.faceCount !== totalFaces) {
        meshTopology = buildMeshTopology(geom);
    }

    const targetColorSlot = activeSlotIndex;
    // Scope: false/'all' = whole model; true/'active-target' = paint onto selected mask slot (default Base Slot 0 or dropdown)!
    let maskSlot = null;
    if (scope === true || scope === 'active-color' || scope === 'mask') {
        const sel = document.getElementById('pattern-target-slot');
        if (sel && sel.value !== 'all') {
            maskSlot = parseInt(sel.value, 10);
        } else {
            // Paint pattern onto non-active base slot (typically slot 0, or slot 1 if active is 0)
            maskSlot = (targetColorSlot === 0) ? 1 : 0;
        }
    }

    let count = 0;
    const hitVids = new Set();

    for (let f = 0; f < totalFaces; f++) {
        if (maskSlot !== null && triangleColors[f] !== maskSlot) continue;
        if (evaluateBrushTexture(f, meshTopology.faceNormals)) {
            triangleColors[f] = targetColorSlot;
            count++;
            if (brushPatternReliefMm !== 0 && meshTopology.vertIds) {
                hitVids.add(meshTopology.vertIds[f * 3]);
                hitVids.add(meshTopology.vertIds[f * 3 + 1]);
                hitVids.add(meshTopology.vertIds[f * 3 + 2]);
            }
        }
    }

    // #10 Optional Tactile 3D Relief displacement (watertight welded displacement!)
    if (brushPatternReliefMm !== 0 && hitVids.size > 0 && meshTopology.weldedVertIndices) {
        const posAttr = geom.attributes.position;
        const pos = posAttr.array;
        const wn = meshTopology.weldedVertNormals;
        for (const vid of hitVids) {
            const dx = wn[vid * 3] * brushPatternReliefMm;
            const dy = wn[vid * 3 + 1] * brushPatternReliefMm;
            const dz = wn[vid * 3 + 2] * brushPatternReliefMm;
            const copies = meshTopology.weldedVertIndices[vid];
            for (let c = 0; c < copies.length; c++) {
                const vi = copies[c] * 3;
                pos[vi] += dx; pos[vi + 1] += dy; pos[vi + 2] += dz;
            }
        }
        posAttr.needsUpdate = true;
        geom.computeVertexNormals();
        if (geom.disposeBoundsTree) geom.disposeBoundsTree();
        if (geom.computeBoundsTree) geom.computeBoundsTree();
        spatialGrid = new SpatialGrid(geom, 32);
        meshTopology = buildMeshTopology(geom);
        precomputeGeometryMetrics(geom);
        currentGeoGen++;
        didGeoChange = true;
    } else if (didGeoChange) {
        precomputeGeometryMetrics(geom);
    }

    updateMeshVisualColors();
    commitHistory(didGeoChange);
    const tmpl = translations[currentLang].toastPatternApplied;
    showToast(tmpl.replace('{faces}', count.toLocaleString()));
}
