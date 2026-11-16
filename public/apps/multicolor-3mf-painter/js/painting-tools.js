// ==========================================
// 🖌️ PAINTING TOOLS: ADAPTIVE BRUSH, SYMMETRY, SCULPT, LINE, BUCKET, WAND, 26 PATTERNS
// ==========================================
let isPainting = false;
let activeTool = 'brush';
let isBackfaceProtected = true;
let isAdaptiveBrushEnabled = true;
let brushSculptMode = 'none'; // 'none' | 'emboss' | 'engrave'
let symmetryAxis = 'none'; // 'none' | 'x' | 'y' | 'z'
let brushHelperRing = null;
let lastHitPoint = null;
let lastHitNormal = null;
let lineStartPoint = null;
let lineStartNormal = null;
let currentPenPressure = 1.0;

let activeBrushTexture = 'none';
let brushTextureScale = 14.0;
let brushTextureAngle = 0;
let isPatternInverted = false;
let brushTextureStampMode = 'stamp'; // 'stamp' | 'tile'

// Track sculpted displacement per quantized vertex so dragging over same area stays smooth & capped
let sculptAccumMap = new Map();

function initBrushHelper() {
    const ringGeom = new THREE.RingGeometry(0.88, 1.0, 40);
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
}

function setBrushRadius(val) {
    val = Math.max(0.05, Math.min(50, parseFloat(val) || 2));
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

function toggleAdaptiveBrush() {
    isAdaptiveBrushEnabled = !isAdaptiveBrushEnabled;
    const btn = document.getElementById('btn-adaptive-toggle');
    if (btn) btn.classList.toggle('active', isAdaptiveBrushEnabled);
    updateHUDLabels();
    showToast(isAdaptiveBrushEnabled
        ? (currentLang === 'fr' ? "Pinceau adaptatif activé (bords ultra-nets sur triangles larges)" : "Adaptive brush ON (auto-refines large CAD faces)")
        : (currentLang === 'fr' ? "Pinceau adaptatif désactivé" : "Adaptive brush OFF"));
}

function toggleBackfaceProtection() {
    isBackfaceProtected = !isBackfaceProtected;
    const btn = document.getElementById('btn-backface-toggle');
    if (btn) btn.classList.toggle('active', isBackfaceProtected);
    updateHUDLabels();
    showToast(isBackfaceProtected
        ? (currentLang === 'fr' ? "Protection face arrière activée" : "Backface protection active (no bleed through walls)")
        : (currentLang === 'fr' ? "Protection face arrière désactivée" : "Backface protection disabled"));
}

function cycleSymmetry() {
    const modes = ['none', 'x', 'y', 'z'];
    const curIdx = modes.indexOf(symmetryAxis);
    symmetryAxis = modes[(curIdx + 1) % modes.length];
    const btn = document.getElementById('btn-symmetry');
    if (btn) btn.classList.toggle('active', symmetryAxis !== 'none');
    updateHUDLabels();
    showToast((currentLang === 'fr' ? "Symétrie : " : "Symmetry mode: ") + symmetryAxis.toUpperCase());
}

function selectTool(tool) {
    activeTool = tool || 'brush';
    lineStartPoint = null;
    lineStartNormal = null;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('tool-' + activeTool);
    if (btn) btn.classList.add('active');

    if (!controls) return;
    controls.enabled = true;

    const vp = document.getElementById('viewport-container');
    if (activeTool === 'view') {
        if (controls.mouseButtons) controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
        if (controls.touches && typeof THREE.TOUCH !== 'undefined') controls.touches.ONE = THREE.TOUCH.ROTATE;
        if (vp) vp.style.cursor = 'grab';
        if (brushHelperRing) brushHelperRing.visible = false;
    } else if (activeTool === 'brush' || activeTool === 'line' || activeTool === 'eraser') {
        if (controls.mouseButtons) controls.mouseButtons.LEFT = null;
        if (controls.touches && typeof THREE.TOUCH !== 'undefined') controls.touches.ONE = null;
        if (vp) vp.style.cursor = 'crosshair';
    } else if (activeTool === 'bucket' || activeTool === 'wand') {
        if (controls.mouseButtons) controls.mouseButtons.LEFT = null;
        if (controls.touches && typeof THREE.TOUCH !== 'undefined') controls.touches.ONE = null;
        if (vp) vp.style.cursor = 'cell';
        if (brushHelperRing) brushHelperRing.visible = false;
    } else if (activeTool === 'dropper') {
        if (controls.mouseButtons) controls.mouseButtons.LEFT = null;
        if (controls.touches && typeof THREE.TOUCH !== 'undefined') controls.touches.ONE = null;
        if (vp) vp.style.cursor = 'help';
        if (brushHelperRing) brushHelperRing.visible = false;
    }
}

function getRaycastIntersection() {
    if (!currentMesh) return null;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(currentMesh);
    return intersects.length > 0 ? intersects[0] : null;
}

function onPointerDown(e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

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

    if (activeTool === 'view') return;

    const hit = getRaycastIntersection();
    if (activeTool === 'brush' || activeTool === 'eraser') {
        if (!hit) return;
        saveHistory(brushSculptMode !== 'none' || isAdaptiveBrushEnabled);
        isPainting = true;
        lastHitPoint = null;
        lastHitNormal = null;
        updateBrushHelperWithHit(hit);
        paintStroke(hit);
    } else if (activeTool === 'line') {
        if (!hit) return;
        if (!lineStartPoint) {
            lineStartPoint = hit.point.clone();
            lineStartNormal = hit.face ? hit.face.normal.clone() : new THREE.Vector3(0, 1, 0);
            showToast(currentLang === 'fr' ? "Point de départ défini. Cliquez sur l'arrivée !" : "Line start set. Click destination point!");
        } else {
            saveHistory(brushSculptMode !== 'none' || isAdaptiveBrushEnabled);
            const endNormal = hit.face ? hit.face.normal.clone() : lineStartNormal;
            paintStraightLine(lineStartPoint, hit.point.clone(), lineStartNormal, endNormal);
            lineStartPoint = null;
            lineStartNormal = null;
            showToast(currentLang === 'fr' ? "Ligne peinte !" : "Line painted!");
        }
    } else if (activeTool === 'bucket') {
        if (hit) bucketFillAtHit(hit);
    } else if (activeTool === 'wand') {
        if (hit) smartWandAtHit(hit);
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
    if (isPainting) {
        isPainting = false;
        lastHitPoint = null;
        lastHitNormal = null;
        if (typeof updateStats === 'function') updateStats();
    }
    if (controls) controls.enabled = true;
}

function updateBrushHelperWithHit(hit) {
    if (!brushHelperRing || !currentMesh) return;
    if (activeTool !== 'brush' && activeTool !== 'eraser' && activeTool !== 'line') {
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
            ? Math.max(0.5, effectiveRadius * 1.45)
            : Math.max(0.1, radius * 0.38);

        if (dist >= step) {
            if (isPattern && brushTextureStampMode === 'stamp') {
                paintSphereAtPoint(hit.point, effectiveRadius, normal);
                lastHitPoint = hit.point.clone();
                lastHitNormal = normal ? normal.clone() : null;
            } else {
                const steps = Math.min(24, Math.ceil(dist / step));
                for (let s = 1; s <= steps; s++) {
                    const interpPoint = lastHitPoint.clone().lerp(hit.point, s / steps);
                    const interpNorm = (normal && lastHitNormal)
                        ? lastHitNormal.clone().lerp(normal, s / steps).normalize()
                        : normal;
                    paintSphereAtPoint(interpPoint, radius, interpNorm);
                }
                lastHitPoint = hit.point.clone();
                lastHitNormal = normal ? normal.clone() : null;
            }
        }
    } else {
        paintSphereAtPoint(hit.point, effectiveRadius, normal);
        lastHitPoint = hit.point.clone();
        lastHitNormal = normal ? normal.clone() : null;
    }
}

function paintStraightLine(p1, p2, n1 = null, n2 = null) {
    const radius = parseFloat(document.getElementById('slider-brush-size')?.value) || 2;
    const dist = p1.distanceTo(p2);
    const step = Math.max(0.15, radius * 0.35);
    const steps = Math.min(100, Math.max(1, Math.ceil(dist / step)));

    for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const pt = p1.clone().lerp(p2, t);
        const nm = (n1 && n2) ? n1.clone().lerp(n2, t).normalize() : (n1 || n2);
        // Project slightly along camera ray for surface conformance if mesh is curved
        paintSphereAtPoint(pt, radius, nm);
    }
    if (typeof updateStats === 'function') updateStats();
}

function maybeAdaptiveSubdivideNear(centers, queryRad, brushRadius) {
    if (!isAdaptiveBrushEnabled || !spatialGrid || !currentMesh) return;
    const geom = currentMesh.geometry;
    const pos = geom.attributes.position.array;
    const faceCount = (pos.length / 9) | 0;
    if (faceCount > 350000) return;

    const maxAllowedEdge = Math.max(brushRadius * 0.85, 0.9);
    const maxEdgeSq = maxAllowedEdge * maxAllowedEdge;

    for (let pass = 0; pass < 2; pass++) {
        const curPos = currentMesh.geometry.attributes.position.array;
        const toSplit = new Set();

        for (let c = 0; c < centers.length; c++) {
            const [cx, cy, cz] = centers[c];
            spatialGrid.querySphere(cx, cy, cz, queryRad, (f) => {
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
        const didSplit = subdivideFacesLocal(toSplit, 1);
        if (!didSplit) break;
    }
}

function paintSphereAtPoint(worldPoint, radius, hitNormal) {
    if (!currentMesh || !triangleColors || !spatialGrid) return;
    const targetColorSlot = activeTool === 'eraser' ? 0 : activeSlotIndex;
    const rgb = slotRgbFloats[targetColorSlot] || slotRgbFloats[0];

    const localHit = currentMesh.worldToLocal(worldPoint.clone());
    const lx = localHit.x, ly = localHit.y, lz = localHit.z;

    const queryRad = (activeBrushTexture !== 'none' && brushTextureStampMode === 'stamp')
        ? Math.max(radius, (brushTextureScale || (radius * 2)) * 0.55)
        : radius;

    // Build list of passes (Primary + optional Mirror Symmetry!)
    const passes = [{ x: lx, y: ly, z: lz, norm: hitNormal ? hitNormal.clone().normalize() : null, mirror: null }];
    if (symmetryAxis === 'x') {
        passes.push({
            x: -lx, y: ly, z: lz,
            norm: hitNormal ? new THREE.Vector3(-hitNormal.x, hitNormal.y, hitNormal.z).normalize() : null,
            mirror: 'x'
        });
    } else if (symmetryAxis === 'y') {
        passes.push({
            x: lx, y: -ly, z: lz,
            norm: hitNormal ? new THREE.Vector3(hitNormal.x, -hitNormal.y, hitNormal.z).normalize() : null,
            mirror: 'y'
        });
    } else if (symmetryAxis === 'z') {
        passes.push({
            x: lx, y: ly, z: -lz,
            norm: hitNormal ? new THREE.Vector3(hitNormal.x, hitNormal.y, -hitNormal.z).normalize() : null,
            mirror: 'z'
        });
    }

    // Smart Adaptive Subdivision on coarse faces inside the brush sphere
    maybeAdaptiveSubdivideNear(passes.map(p => [p.x, p.y, p.z]), queryRad, radius);

    const geom = currentMesh.geometry;
    const colorAttr = geom.attributes.color;
    const posAttr = geom.attributes.position;
    if (!colorAttr || !posAttr) return;
    const colArr = colorAttr.array;
    const pos = posAttr.array;
    const normArr = geom.attributes.normal ? geom.attributes.normal.array : null;

    const stampSize = (activeBrushTexture !== 'none') ? (brushTextureScale || (radius * 2)) : radius;
    const stampAngle = brushTextureAngle || 0;
    const stampInvert = isPatternInverted;
    let changed = false;
    let sculpted = false;

    const sculptDelta = (brushSculptMode === 'emboss') ? 0.4 : (brushSculptMode === 'engrave' ? -0.4 : 0);
    const sculptVertDisplacements = new Map();

    for (let pIdx = 0; pIdx < passes.length; pIdx++) {
        const pass = passes[pIdx];
        const px = pass.x, py = pass.y, pz = pass.z;
        const normal = pass.norm;

        let T = null, B = null;
        if (activeBrushTexture !== 'none' && brushTextureStampMode === 'stamp') {
            const N = (normal ? normal.clone() : new THREE.Vector3(0, 1, 0)).normalize();
            const up = (Math.abs(N.y) < 0.92) ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
            T = new THREE.Vector3().crossVectors(N, up).normalize();
            B = new THREE.Vector3().crossVectors(N, T).normalize();
        }

        const rSq = radius * radius;

        spatialGrid.querySphere(px, py, pz, queryRad, (f) => {
            if (isBackfaceProtected && normal && normArr) {
                const nIdx = f * 9;
                const dot = normArr[nIdx] * normal.x + normArr[nIdx + 1] * normal.y + normArr[nIdx + 2] * normal.z;
                if (dot < 0.2) return;
            }

            const p0 = f * 9;
            const v0x = pos[p0],     v0y = pos[p0 + 1], v0z = pos[p0 + 2];
            const v1x = pos[p0 + 3], v1y = pos[p0 + 4], v1z = pos[p0 + 5];
            const v2x = pos[p0 + 6], v2y = pos[p0 + 7], v2z = pos[p0 + 8];
            const f3 = f * 3;
            const cx = spatialGrid.faceCenters[f3];
            const cy = spatialGrid.faceCenters[f3 + 1];
            const cz = spatialGrid.faceCenters[f3 + 2];

            // Optional Sculpt displacement inside brush sphere
            if (sculptDelta !== 0 && activeTool === 'brush' && normArr) {
                const verts = [[0, v0x, v0y, v0z], [1, v1x, v1y, v1z], [2, v2x, v2y, v2z]];
                for (let k = 0; k < 3; k++) {
                    const [, vx, vy, vz] = verts[k];
                    const dSq = (vx - px) ** 2 + (vy - py) ** 2 + (vz - pz) ** 2;
                    if (dSq < rSq) {
                        const vk = `${Math.round(vx * 1000)}_${Math.round(vy * 1000)}_${Math.round(vz * 1000)}`;
                        const already = sculptAccumMap.get(vk) || 0;
                        if (Math.abs(already) < 0.65) {
                            const falloff = 0.5 * (1 + Math.cos(Math.PI * Math.sqrt(dSq) / radius));
                            const stepD = sculptDelta * 0.35 * falloff;
                            const nBase = p0 + k * 3;
                            sculptVertDisplacements.set(p0 + k * 3, [
                                normArr[nBase] * stepD,
                                normArr[nBase + 1] * stepD,
                                normArr[nBase + 2] * stepD,
                                vk,
                                already + stepD
                            ]);
                        }
                    }
                }
            }

            if (triangleColors[f] === targetColorSlot) return;

            if (activeBrushTexture !== 'none') {
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
                    if (weight < 4) return;
                } else {
                    const dSq = pointTriangleDistSq(px, py, pz, v0x, v0y, v0z, v1x, v1y, v1z, v2x, v2y, v2z);
                    if (dSq > rSq) return;
                    if (!evaluateBrushTexture(f, normArr)) return;
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
                // Fallback: if brush sits completely inside a triangle, accept exact point-triangle hit!
                const exactInside = pointTriangleDistSq(px, py, pz, v0x, v0y, v0z, v1x, v1y, v1z, v2x, v2y, v2z) <= rSq * 0.5;
                if (!exactInside && (solidWeight < 4 || (!dC && solidWeight < 5))) return;
            }

            triangleColors[f] = targetColorSlot;
            colArr[p0]     = rgb[0]; colArr[p0 + 1] = rgb[1]; colArr[p0 + 2] = rgb[2];
            colArr[p0 + 3] = rgb[0]; colArr[p0 + 4] = rgb[1]; colArr[p0 + 5] = rgb[2];
            colArr[p0 + 6] = rgb[0]; colArr[p0 + 7] = rgb[1]; colArr[p0 + 8] = rgb[2];
            changed = true;
        });
    }

    if (sculptVertDisplacements.size > 0) {
        for (const [idx, info] of sculptVertDisplacements.entries()) {
            pos[idx]     += info[0];
            pos[idx + 1] += info[1];
            pos[idx + 2] += info[2];
            sculptAccumMap.set(info[3], info[4]);
        }
        posAttr.needsUpdate = true;
        geom.computeVertexNormals();
        if (geom.disposeBoundsTree) geom.disposeBoundsTree();
        if (geom.computeBoundsTree) geom.computeBoundsTree();
        sculpted = true;
    }

    if (changed) colorAttr.needsUpdate = true;
    if (sculpted) spatialGrid = new SpatialGrid(geom, 32);
}

// Smart Connected 3D Surface Flood Fill (NO duplicate saveHistory!)
function bucketFillAtHit(hit) {
    if (!hit || hit.faceIndex === undefined || !currentMesh || !triangleColors) return;
    saveHistory();

    const geom = currentMesh.geometry;
    const colorAttr = geom.attributes.color;
    if (!colorAttr) return;

    const faceCount = (geom.attributes.position.count / 3) | 0;
    if (!meshTopology || meshTopology.faceCount !== faceCount) {
        meshTopology = buildMeshTopology(geom);
    }
    if (!meshTopology) return;

    const colArr = colorAttr.array;
    const rgb = slotRgbFloats[activeSlotIndex];
    const startSlot = triangleColors[hit.faceIndex];

    const toleranceDeg = parseFloat(document.getElementById('slider-angle').value) || 35;
    const cosTol = Math.cos((toleranceDeg * Math.PI) / 180);
    const checkConnected = document.getElementById('check-connected-fill').checked;

    let facesFilled = 0;

    if (checkConnected) {
        const visited = new Uint8Array(meshTopology.faceCount);
        const queue = [hit.faceIndex];
        visited[hit.faceIndex] = 1;

        const hx = meshTopology.faceNormals[hit.faceIndex * 3];
        const hy = meshTopology.faceNormals[hit.faceIndex * 3 + 1];
        const hz = meshTopology.faceNormals[hit.faceIndex * 3 + 2];

        let queueHead = 0;
        while (queueHead < queue.length) {
            const f = queue[queueHead++];
            triangleColors[f] = activeSlotIndex;
            facesFilled++;

            const base = f * 9;
            colArr[base]     = rgb[0]; colArr[base + 1] = rgb[1]; colArr[base + 2] = rgb[2];
            colArr[base + 3] = rgb[0]; colArr[base + 4] = rgb[1]; colArr[base + 5] = rgb[2];
            colArr[base + 6] = rgb[0]; colArr[base + 7] = rgb[1]; colArr[base + 8] = rgb[2];

            const curNx = meshTopology.faceNormals[f * 3];
            const curNy = meshTopology.faceNormals[f * 3 + 1];
            const curNz = meshTopology.faceNormals[f * 3 + 2];

            const neighbors = meshTopology.faceNeighbors[f];
            for (let i = 0; i < neighbors.length; i++) {
                const nb = neighbors[i];
                if (!visited[nb]) {
                    const nb3 = nb * 3;
                    const nx = meshTopology.faceNormals[nb3];
                    const ny = meshTopology.faceNormals[nb3 + 1];
                    const nz = meshTopology.faceNormals[nb3 + 2];
                    if (curNx * nx + curNy * ny + curNz * nz < cosTol) continue;
                    if (hx * nx + hy * ny + hz * nz < cosTol) continue;
                    if (startSlot !== undefined && triangleColors[nb] !== startSlot) continue;
                    visited[nb] = 1;
                    queue.push(nb);
                }
            }
        }
    } else {
        const hx = meshTopology.faceNormals[hit.faceIndex * 3];
        const hy = meshTopology.faceNormals[hit.faceIndex * 3 + 1];
        const hz = meshTopology.faceNormals[hit.faceIndex * 3 + 2];

        for (let f = 0; f < meshTopology.faceCount; f++) {
            const f3 = f * 3;
            const nx = meshTopology.faceNormals[f3];
            const ny = meshTopology.faceNormals[f3 + 1];
            const nz = meshTopology.faceNormals[f3 + 2];
            if ((nx * hx + ny * hy + nz * hz) >= cosTol && (startSlot === undefined || triangleColors[f] === startSlot)) {
                triangleColors[f] = activeSlotIndex;
                facesFilled++;
                const base = f * 9;
                colArr[base]     = rgb[0]; colArr[base + 1] = rgb[1]; colArr[base + 2] = rgb[2];
                colArr[base + 3] = rgb[0]; colArr[base + 4] = rgb[1]; colArr[base + 5] = rgb[2];
                colArr[base + 6] = rgb[0]; colArr[base + 7] = rgb[1]; colArr[base + 8] = rgb[2];
            }
        }
    }

    colorAttr.needsUpdate = true;
    if (typeof updateStats === 'function') updateStats();
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
    saveHistory();

    const geom = currentMesh.geometry;
    const colorAttr = geom.attributes.color;
    if (!colorAttr) return;

    const faceCount = (geom.attributes.position.count / 3) | 0;
    if (!meshTopology || meshTopology.faceCount !== faceCount) {
        meshTopology = buildMeshTopology(geom);
    }
    if (!meshTopology) return;

    const colArr = colorAttr.array;
    const rgb = slotRgbFloats[activeSlotIndex];
    const startSlot = triangleColors[hit.faceIndex];
    const toleranceDeg = parseFloat(document.getElementById('slider-angle').value) || 35;
    const cosTol = Math.cos((toleranceDeg * Math.PI) / 180);

    const visited = new Uint8Array(meshTopology.faceCount);
    let facesFilled = 0;

    function floodFromFace(seedFace) {
        if (seedFace < 0 || seedFace >= meshTopology.faceCount || visited[seedFace]) return;
        const queue = [seedFace];
        visited[seedFace] = 1;
        const seedSlot = triangleColors[seedFace];
        const hx = meshTopology.faceNormals[seedFace * 3];
        const hy = meshTopology.faceNormals[seedFace * 3 + 1];
        const hz = meshTopology.faceNormals[seedFace * 3 + 2];

        let head = 0;
        while (head < queue.length) {
            const f = queue[head++];
            triangleColors[f] = activeSlotIndex;
            facesFilled++;

            const base = f * 9;
            colArr[base]     = rgb[0]; colArr[base + 1] = rgb[1]; colArr[base + 2] = rgb[2];
            colArr[base + 3] = rgb[0]; colArr[base + 4] = rgb[1]; colArr[base + 5] = rgb[2];
            colArr[base + 6] = rgb[0]; colArr[base + 7] = rgb[1]; colArr[base + 8] = rgb[2];

            const curNx = meshTopology.faceNormals[f * 3];
            const curNy = meshTopology.faceNormals[f * 3 + 1];
            const curNz = meshTopology.faceNormals[f * 3 + 2];
            const neighbors = meshTopology.faceNeighbors[f];

            for (let i = 0; i < neighbors.length; i++) {
                const nb = neighbors[i];
                if (!visited[nb]) {
                    const nb3 = nb * 3;
                    const nx = meshTopology.faceNormals[nb3];
                    const ny = meshTopology.faceNormals[nb3 + 1];
                    const nz = meshTopology.faceNormals[nb3 + 2];
                    if (curNx * nx + curNy * ny + curNz * nz < cosTol) continue;
                    if (hx * nx + hy * ny + hz * nz < cosTol) continue;
                    if (seedSlot !== undefined && triangleColors[nb] !== seedSlot) continue;
                    visited[nb] = 1;
                    queue.push(nb);
                }
            }
        }
    }

    floodFromFace(hit.faceIndex);

    if (symmetryAxis !== 'none' && spatialGrid) {
        const s3 = hit.faceIndex * 3;
        let sx = meshTopology.faceCenters[s3], sy = meshTopology.faceCenters[s3 + 1], sz = meshTopology.faceCenters[s3 + 2];
        let snx = meshTopology.faceNormals[s3], sny = meshTopology.faceNormals[s3 + 1], snz = meshTopology.faceNormals[s3 + 2];
        if (symmetryAxis === 'x') { sx = -sx; snx = -snx; }
        else if (symmetryAxis === 'y') { sy = -sy; sny = -sny; }
        else if (symmetryAxis === 'z') { sz = -sz; snz = -snz; }

        let bestFace = -1, bestDistSq = Infinity;
        const geomBox = geom.boundingBox || (geom.computeBoundingBox(), geom.boundingBox);
        const bSize = new THREE.Vector3();
        geomBox.getSize(bSize);
        const searchRad = Math.max(2.0, Math.max(bSize.x, bSize.y, bSize.z) * 0.1);

        spatialGrid.querySphere(sx, sy, sz, searchRad, (candFace) => {
            if (candFace === hit.faceIndex || visited[candFace]) return;
            const c3 = candFace * 3;
            const dot = snx * meshTopology.faceNormals[c3] + sny * meshTopology.faceNormals[c3 + 1] + snz * meshTopology.faceNormals[c3 + 2];
            if (dot < 0.65) return;
            const dx = meshTopology.faceCenters[c3] - sx;
            const dy = meshTopology.faceCenters[c3 + 1] - sy;
            const dz = meshTopology.faceCenters[c3 + 2] - sz;
            const dSq = dx * dx + dy * dy + dz * dz;
            if (dSq < bestDistSq) { bestDistSq = dSq; bestFace = candFace; }
        });

        if (bestFace !== -1) floodFromFace(bestFace);
    }

    colorAttr.needsUpdate = true;
    if (typeof updateStats === 'function') updateStats();
    const template = translations[currentLang].toastWandApplied || "Magic Wand filled {faces} faces!";
    showToast(template.replace('{faces}', facesFilled.toLocaleString()));
}

// ==========================================
// 🎨 TEXTURE & PATTERN BRUSHES (26 PATTERNS IN STAMP & TILE MODES)
// ==========================================
function updateBrushTexture(val) {
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
    brushTextureScale = parseFloat(val) || 14.0;
    const lbl = document.getElementById('val-texture-scale');
    if (lbl) lbl.innerText = `${brushTextureScale} mm`;
    drawPatternPreview();
}

function updateBrushTextureAngle(val) {
    brushTextureAngle = parseInt(val, 10) || 0;
    const lbl = document.getElementById('val-texture-angle');
    if (lbl) lbl.innerText = `${brushTextureAngle}°`;
    drawPatternPreview();
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
            const v = (py - h / 2);
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
        // Clamp outside stamp disc so Stamp Mode never bleeds outside cursor boundary
        const radialR = Math.hypot(su, sv);
        if (radialR > 0.52) return invert ? true : false;

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

function evaluateBrushTexture(f, normArr) {
    if (!spatialGrid || !spatialGrid.faceCenters || !currentMesh) return true;
    const pos = currentMesh.geometry.attributes.position.array;
    const f3 = f * 3;
    const cx = spatialGrid.faceCenters[f3], cy = spatialGrid.faceCenters[f3 + 1], cz = spatialGrid.faceCenters[f3 + 2];

    let nx = 0, ny = 1, nz = 0;
    if (normArr) {
        const nIdx = f * 9;
        nx = Math.abs(normArr[nIdx]);
        ny = Math.abs(normArr[nIdx + 1]);
        nz = Math.abs(normArr[nIdx + 2]);
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
    saveHistory();
    const geom = currentMesh.geometry;
    const colorAttr = geom.attributes.color;
    if (!colorAttr) return;
    const colArr = colorAttr.array;
    const normArr = geom.attributes.normal ? geom.attributes.normal.array : null;
    const targetColorSlot = activeSlotIndex;
    const rgb = slotRgbFloats[targetColorSlot];

    let count = 0;
    const totalFaces = triangleColors.length;
    const matchActiveOnly = (scope === 'active-color');

    for (let f = 0; f < totalFaces; f++) {
        if (matchActiveOnly && triangleColors[f] !== targetColorSlot) continue;
        if (evaluateBrushTexture(f, normArr)) {
            triangleColors[f] = targetColorSlot;
            const base = f * 9;
            colArr[base]     = rgb[0]; colArr[base + 1] = rgb[1]; colArr[base + 2] = rgb[2];
            colArr[base + 3] = rgb[0]; colArr[base + 4] = rgb[1]; colArr[base + 5] = rgb[2];
            colArr[base + 6] = rgb[0]; colArr[base + 7] = rgb[1]; colArr[base + 8] = rgb[2];
            count++;
        }
    }
    colorAttr.needsUpdate = true;
    if (typeof updateStats === 'function') updateStats();
    const tmpl = translations[currentLang].toastPatternApplied;
    showToast(tmpl.replace('{faces}', count.toLocaleString()));
}
