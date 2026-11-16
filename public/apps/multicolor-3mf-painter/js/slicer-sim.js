// ==========================================
// SLICER SIMULATION, PURGE OPTIMIZER, LAYER SCRUBBER & STATS
// ==========================================

let isShowingPurgeHeatmap = false;
let isColorByNumbersActive = false;
let cbnLabelsGroup = null;
let loadedSpoolsIndices = null; // null = all slots allowed, Set = loaded AMS spools
let layerSlicePlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 10000);
let isLayerScrubberActive = false;
let layerSliceRatio = 1.0;

function getSlotLum(slotIdx) {
    if (typeof getSlotLuminance01 === 'function') return getSlotLuminance01(slotIdx);
    const slot = filamentSlots && filamentSlots[slotIdx];
    const hex = slot ? slot.color : '#808080';
    const c = new THREE.Color(hex);
    return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

/**
 * Analyze current currentMesh across 0.2mm horizontal layers (along viewport upright Y)
 * or evaluate any orthogonal normal vector (dx, dy, dz) for instant 6-way orientation scoring.
 */
function analyzePrintForAxis(nx, ny, nz, layerHeightMm = 0.2) {
    if (!currentMesh || !currentMesh.geometry || !triangleColors) return null;
    const geom = currentMesh.geometry;
    const pos = geom.attributes.position;
    if (!pos) return null;

    const triCount = Math.floor(pos.count / 3);
    const triProjMin = new Float32Array(triCount);
    const triProjMax = new Float32Array(triCount);
    const triArea = new Float32Array(triCount);
    let minH = Infinity, maxH = -Infinity;

    const pA = new THREE.Vector3(), pB = new THREE.Vector3(), pC = new THREE.Vector3();
    const ab = new THREE.Vector3(), ac = new THREE.Vector3(), cr = new THREE.Vector3();

    const slotTris = new Int32Array(filamentSlots.length);
    const slotArea = new Float32Array(filamentSlots.length);
    let totalArea = 0;

    for (let t = 0; t < triCount; t++) {
        const i3 = t * 3;
        pA.fromBufferAttribute(pos, i3);
        pB.fromBufferAttribute(pos, i3 + 1);
        pC.fromBufferAttribute(pos, i3 + 2);

        const hA = pA.x * nx + pA.y * ny + pA.z * nz;
        const hB = pB.x * nx + pB.y * ny + pB.z * nz;
        const hC = pC.x * nx + pC.y * ny + pC.z * nz;
        const lo = Math.min(hA, hB, hC);
        const hi = Math.max(hA, hB, hC);
        triProjMin[t] = lo;
        triProjMax[t] = hi;
        if (lo < minH) minH = lo;
        if (hi > maxH) maxH = hi;

        ab.subVectors(pB, pA);
        ac.subVectors(pC, pA);
        cr.crossVectors(ab, ac);
        const a = 0.5 * cr.length();
        triArea[t] = a;
        totalArea += a;

        const s = Math.max(0, Math.min(filamentSlots.length - 1, triangleColors[t] || 0));
        slotTris[s]++;
        slotArea[s] += a;
    }

    const spanMm = Math.max(0.2, maxH - minH);
    const safeLayerH = Math.max(0.08, Math.min(2.0, layerHeightMm));
    const layerCount = Math.max(1, Math.min(2500, Math.ceil(spanMm / safeLayerH)));
    const actualLayerH = spanMm / layerCount;

    const layerSlotMasks = new Int32Array(layerCount);
    const layerUniqueColors = new Uint8Array(layerCount);

    for (let t = 0; t < triCount; t++) {
        const s = Math.max(0, Math.min(filamentSlots.length - 1, triangleColors[t] || 0));
        const bit = 1 << Math.min(30, s);
        const l0 = Math.max(0, Math.min(layerCount - 1, Math.floor((triProjMin[t] - minH) / actualLayerH)));
        const l1 = Math.max(0, Math.min(layerCount - 1, Math.floor((triProjMax[t] - minH - 1e-5) / actualLayerH)));
        for (let l = l0; l <= l1; l++) {
            layerSlotMasks[l] |= bit;
        }
    }

    let totalSwaps = 0;
    let purgeGrams = 0;
    let prevActiveSlot = -1;
    let multiColorLayers = 0;

    // Track Dark -> Light high-purge transitions across shared layers
    const highContrastPairs = new Map();

    for (let l = 0; l < layerCount; l++) {
        const mask = layerSlotMasks[l];
        if (mask === 0) continue;

        const activeSlots = [];
        for (let s = 0; s < Math.min(31, filamentSlots.length); s++) {
            if ((mask & (1 << s)) !== 0) activeSlots.push(s);
        }
        layerUniqueColors[l] = activeSlots.length;
        if (activeSlots.length > 1) multiColorLayers++;

        // Smart slicer ordering keeps prevActiveSlot first if present in this layer
        let swapsThisLayer = 0;
        if (activeSlots.length === 1) {
            if (prevActiveSlot !== -1 && prevActiveSlot !== activeSlots[0]) {
                swapsThisLayer = 1;
                purgeGrams += getSwapFlushGrams(prevActiveSlot, activeSlots[0]);
            }
            prevActiveSlot = activeSlots[0];
        } else if (activeSlots.length > 1) {
            // Reorder so prevActiveSlot starts the layer to eliminate 1 swap per layer
            const ordered = [...activeSlots];
            if (prevActiveSlot !== -1) {
                const idx = ordered.indexOf(prevActiveSlot);
                if (idx > 0) {
                    ordered.splice(idx, 1);
                    ordered.unshift(prevActiveSlot);
                } else if (idx === -1) {
                    swapsThisLayer += 1;
                    purgeGrams += getSwapFlushGrams(prevActiveSlot, ordered[0]);
                }
            }
            for (let k = 0; k < ordered.length - 1; k++) {
                swapsThisLayer += 1;
                const a = ordered[k], b = ordered[k + 1];
                purgeGrams += getSwapFlushGrams(a, b);
            }
            prevActiveSlot = ordered[ordered.length - 1];

            // Record dark <-> light pairs appearing on this layer
            for (let i = 0; i < activeSlots.length; i++) {
                for (let j = i + 1; j < activeSlots.length; j++) {
                    const a = activeSlots[i], b = activeSlots[j];
                    const lumDiff = Math.abs(getSlotLum(a) - getSlotLum(b));
                    if (lumDiff >= 0.45) {
                        const dark = getSlotLum(a) < getSlotLum(b) ? a : b;
                        const light = dark === a ? b : a;
                        const key = `${dark}-${light}`;
                        highContrastPairs.set(key, (highContrastPairs.get(key) || 0) + 1);
                    }
                }
            }
        }
        totalSwaps += swapsThisLayer;
    }

    // Approximate solid print mass from bounding box & surface area
    geom.computeBoundingBox();
    const size = new THREE.Vector3();
    geom.boundingBox.getSize(size);
    const estShellVolumeCm3 = (totalArea * 1.4) / 1000; // ~1.4mm effective shell+infill thickness
    const partGrams = Math.max(4, estShellVolumeCm3 * 1.24 * 0.42);

    const usedSlots = [];
    for (let s = 0; s < filamentSlots.length; s++) {
        if (slotTris[s] > 0) usedSlots.push(s);
    }

    const warnings = [];
    highContrastPairs.forEach((sharedLayers, key) => {
        if (sharedLayers >= 4) {
            const [dIdx, lIdx] = key.split('-').map(Number);
            warnings.push({
                darkSlot: dIdx,
                lightSlot: lIdx,
                sharedLayers,
                extraWasteG: +(sharedLayers * 0.42).toFixed(1)
            });
        }
    });
    warnings.sort((a, b) => b.sharedLayers - a.sharedLayers);

    const swapTimeMin = totalSwaps * 1.35; // ~81s per AMS cut/retract/purge/prime cycle
    const basePrintMin = partGrams * 1.8;
    const totalMinutes = Math.round(basePrintMin + swapTimeMin);

    return {
        spanMm,
        layerCount,
        actualLayerH,
        multiColorLayers,
        totalSwaps,
        purgeGrams: +purgeGrams.toFixed(1),
        partGrams: +partGrams.toFixed(1),
        totalGrams: +(partGrams + purgeGrams).toFixed(1),
        totalMinutes,
        usedSlots,
        slotTris,
        slotArea,
        totalArea,
        layerUniqueColors,
        minH,
        maxH,
        warnings
    };
}

function getSwapFlushGrams(fromSlot, toSlot) {
    const lumFrom = getSlotLum(fromSlot);
    const lumTo = getSlotLum(toSlot);
    // Dark -> Light requires significantly more flushing to avoid bleeding
    if (lumFrom < 0.25 && lumTo > 0.65) return 0.92;
    if (lumFrom < lumTo - 0.35) return 0.72;
    if (Math.abs(lumFrom - lumTo) < 0.15) return 0.34;
    return 0.48;
}

function formatDurationMinutes(mins) {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function updateStats() {
    if (!currentMesh || !currentMesh.geometry || !triangleColors) return;
    const geom = currentMesh.geometry;
    geom.computeBoundingBox();
    const size = new THREE.Vector3();
    geom.boundingBox.getSize(size);
    const triCount = triangleColors.length;

    const usedSet = new Set();
    for (let i = 0; i < triCount; i++) usedSet.add(triangleColors[i]);

    const elTris = document.getElementById('stat-tris');
    const elColors = document.getElementById('stat-colors');
    const elDims = document.getElementById('stat-dims');
    if (elTris) elTris.textContent = triCount.toLocaleString();
    if (elColors) elColors.textContent = `${usedSet.size} / ${filamentSlots.length}`;
    if (elDims) elDims.textContent = `${size.x.toFixed(1)}×${size.y.toFixed(1)}×${size.z.toFixed(1)} mm`;

    const elSwaps = document.getElementById('stat-swaps');
    if (elSwaps) {
        const analysis = analyzePrintForAxis(0, 1, 0, 0.2);
        if (analysis) {
            elSwaps.textContent = `${analysis.totalSwaps} swaps (~${analysis.purgeGrams}g)`;
        }
    }

    if (isLayerScrubberActive) {
        updateLayerScrubberBounds();
    }
}

function adaptBrushToModel(modelSizeVec) {
    if (!modelSizeVec) return;
    const maxDim = Math.max(modelSizeVec.x, modelSizeVec.y, modelSizeVec.z, 1);
    const ideal = Math.max(0.5, Math.min(25, Math.round(maxDim * 0.06 * 10) / 10));
    const slider = document.getElementById('slider-brush-size');
    if (slider) {
        slider.min = Math.max(0.1, +(maxDim * 0.008).toFixed(2));
        slider.max = Math.max(15, Math.round(maxDim * 0.45));
        slider.step = Math.max(0.1, +(maxDim * 0.004).toFixed(2));
        slider.value = ideal;
    }
    if (typeof setBrushRadius === 'function') {
        setBrushRadius(ideal);
    } else {
        const label = document.getElementById('val-brush-size');
        if (label) label.textContent = `${ideal.toFixed(1)} mm`;
    }
}

function scaleModel(factor) {
    if (!currentMesh || !currentMesh.geometry || !factor || factor <= 0) return;
    saveHistory();
    const geom = currentMesh.geometry;
    geom.scale(factor, factor, factor);
    geom.computeBoundingBox();
    const minY = geom.boundingBox.min.y;
    const center = new THREE.Vector3();
    geom.boundingBox.getCenter(center);
    geom.translate(-center.x, -minY, -center.z);
    geom.computeBoundingBox();
    if (typeof geom.computeBoundsTree === 'function') geom.computeBoundsTree();
    if (typeof buildMeshTopology === 'function') buildMeshTopology(geom);
    if (typeof SpatialGrid === 'function') spatialGrid = new SpatialGrid(geom, 32);

    const size = new THREE.Vector3();
    geom.boundingBox.getSize(size);
    adaptBrushToModel(size);
    updateStats();
    if (typeof resetCamera === 'function') resetCamera();
    showToast(t('modelScaled', `Model scaled (${size.x.toFixed(1)}×${size.y.toFixed(1)}×${size.z.toFixed(1)} mm)`));
}

function colorAll(slotIndex) {
    if (!currentMesh || !triangleColors) return;
    const idx = typeof slotIndex === 'number' ? slotIndex : activeSlotIndex;
    saveHistory();
    triangleColors.fill(idx);
    if (typeof updateMeshVisualColors === 'function') updateMeshVisualColors();
    updateStats();
    showToast(t('filledAll', `Filled entire model with Slot ${idx + 1}`));
}

function resetAllColors() {
    colorAll(0);
}

// ==========================================
// PURGE OPTIMIZER MODAL & ALGORITHMS
// ==========================================

function openPurgeOptimizerModal() {
    const modal = document.getElementById('purge-optimizer-modal');
    if (!modal) return;
    refreshPurgeOptimizerReport();
    modal.classList.add('open');
    if (typeof refreshIcons === 'function') refreshIcons();
}

function closePurgeOptimizerModal() {
    const modal = document.getElementById('purge-optimizer-modal');
    if (modal) modal.classList.remove('open');
}

function refreshPurgeOptimizerReport() {
    const layerInput = document.getElementById('purge-layer-height');
    const layerH = layerInput ? parseFloat(layerInput.value) || 0.2 : 0.2;
    const statsGrid = document.getElementById('purge-stats-grid');
    const warnBox = document.getElementById('purge-warning-box');
    const orientNote = document.getElementById('purge-orient-note');

    if (!currentMesh || !currentMesh.geometry) {
        if (statsGrid) statsGrid.innerHTML = `<div class="stat-card">No 3D model loaded</div>`;
        return;
    }

    const report = analyzePrintForAxis(0, 1, 0, layerH);
    if (!report) return;

    const isFr = (typeof currentLang !== 'undefined' && currentLang === 'fr');
    const costUsd = ((report.totalGrams / 1000) * 24).toFixed(2);

    if (statsGrid) {
        statsGrid.innerHTML = `
            <div class="stat-card">
                <div class="stat-card-label">${isFr ? 'Changements AMS' : 'AMS Color Swaps'}</div>
                <div class="stat-card-value" style="color:${report.totalSwaps > 150 ? '#F97316' : '#38BDF8'}">${report.totalSwaps}</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-label">${isFr ? 'Purge Perdue' : 'Purge Waste'}</div>
                <div class="stat-card-value" style="color:${report.purgeGrams > report.partGrams ? '#EF4444' : '#10B981'}">${report.purgeGrams} g</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-label">${isFr ? 'Durée Estimée' : 'Est. Print Time'}</div>
                <div class="stat-card-value">${formatDurationMinutes(report.totalMinutes)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-label">${isFr ? 'Filament Total' : 'Total Material'}</div>
                <div class="stat-card-value">${report.totalGrams} g <small style="opacity:0.7">($${costUsd})</small></div>
            </div>
        `;
    }

    if (warnBox) {
        if (report.warnings.length > 0) {
            const items = report.warnings.slice(0, 3).map((w) => {
                const dName = filamentSlots[w.darkSlot]?.name || `Slot ${w.darkSlot + 1}`;
                const lName = filamentSlots[w.lightSlot]?.name || `Slot ${w.lightSlot + 1}`;
                return isFr
                    ? `• <b>${dName}</b> ↔ <b>${lName}</b> partagent <b>${w.sharedLayers}</b> couches (+${w.extraWasteG}g purge)`
                    : `• <b>${dName}</b> ↔ <b>${lName}</b> share <b>${w.sharedLayers}</b> layers (~+${w.extraWasteG}g flush)`;
            }).join('<br>');
            warnBox.style.display = 'block';
            warnBox.innerHTML = `<strong>${isFr ? '⚠ Alerte Contraste Sombre → Clair :' : '⚠ Dark → Light Flush Alert:'}</strong><br>${items}`;
        } else {
            warnBox.style.display = 'none';
        }
    }

    if (orientNote) {
        const candidates = [
            { label: '+Y (Current)', dir: [0, 1, 0] },
            { label: '-Y (Upside Down)', dir: [0, -1, 0] },
            { label: '+Z (Front Up)', dir: [0, 0, 1] },
            { label: '-Z (Back Up)', dir: [0, 0, -1] },
            { label: '+X (Right Up)', dir: [1, 0, 0] },
            { label: '-X (Left Up)', dir: [-1, 0, 0] }
        ];
        let best = null;
        for (const c of candidates) {
            const res = analyzePrintForAxis(c.dir[0], c.dir[1], c.dir[2], layerH);
            if (res && (!best || res.totalSwaps < best.res.totalSwaps)) {
                best = { label: c.label, res };
            }
        }
        if (best && best.res.totalSwaps < report.totalSwaps - 4) {
            const saving = report.totalSwaps - best.res.totalSwaps;
            orientNote.innerHTML = isFr
                ? `💡 Orientation optimale détectée : <b>${best.label}</b> (économise <b>-${saving}</b> changements !)`
                : `💡 Optimal orientation found: <b>${best.label}</b> (saves <b>-${saving}</b> filament swaps!)`;
        } else {
            orientNote.innerHTML = isFr
                ? `✅ L'orientation actuelle est déjà quasi-optimale (${report.multiColorLayers}/${report.layerCount} couches multicouleurs).`
                : `✅ Current orientation is already optimal (${report.multiColorLayers}/${report.layerCount} multi-color layers).`;
        }
    }
}

function applyBestMinPurgeOrientation() {
    if (!currentMesh || !currentMesh.geometry) return;
    const layerInput = document.getElementById('purge-layer-height');
    const layerH = layerInput ? parseFloat(layerInput.value) || 0.2 : 0.2;

    const candidates = [
        { name: 'Current (+Y)', dir: [0, 1, 0], rx: 0, rz: 0 },
        { name: 'Flip 180° (-Y)', dir: [0, -1, 0], rx: Math.PI, rz: 0 },
        { name: 'Back Flat (+Z Up)', dir: [0, 0, 1], rx: -Math.PI / 2, rz: 0 },
        { name: 'Front Flat (-Z Up)', dir: [0, 0, -1], rx: Math.PI / 2, rz: 0 },
        { name: 'Left Side (+X Up)', dir: [1, 0, 0], rx: 0, rz: Math.PI / 2 },
        { name: 'Right Side (-X Up)', dir: [-1, 0, 0], rx: 0, rz: -Math.PI / 2 }
    ];

    let best = null;
    for (const c of candidates) {
        const res = analyzePrintForAxis(c.dir[0], c.dir[1], c.dir[2], layerH);
        if (res && (!best || res.totalSwaps < best.res.totalSwaps)) {
            best = { ...c, res };
        }
    }

    if (!best || (best.rx === 0 && best.rz === 0)) {
        showToast(t('alreadyBestOrient', 'Current orientation already minimizes swaps!'));
        return;
    }

    saveHistory();
    const geom = currentMesh.geometry;
    if (best.rx !== 0) geom.rotateX(best.rx);
    if (best.rz !== 0) geom.rotateZ(best.rz);
    if (typeof layModelFlatOnBed === 'function') {
        geom.computeBoundingBox();
        const center = new THREE.Vector3();
        geom.boundingBox.getCenter(center);
        geom.translate(-center.x, -geom.boundingBox.min.y, -center.z);
    }
    geom.computeVertexNormals();
    geom.computeBoundingBox();
    if (typeof geom.computeBoundsTree === 'function') geom.computeBoundsTree();
    if (typeof buildMeshTopology === 'function') buildMeshTopology(geom);
    if (typeof SpatialGrid === 'function') spatialGrid = new SpatialGrid(geom, 32);

    updateStats();
    refreshPurgeOptimizerReport();
    if (typeof resetCamera === 'function') resetCamera();
    showToast(`Min-Purge Orientation: ${best.name} (${best.res.totalSwaps} swaps)`);
}

function snapToCleanZBands() {
    executePurgeOptimization('snap-bands');
}

function executePurgeOptimization(mode = 'merge-minor') {
    if (!currentMesh || !currentMesh.geometry || !triangleColors) return;
    const geom = currentMesh.geometry;
    const pos = geom.attributes.position;
    if (!pos) return;
    const triCount = Math.floor(pos.count / 3);

    saveHistory();
    let changed = 0;

    if (mode === 'snap-bands') {
        geom.computeBoundingBox();
        const minY = geom.boundingBox.min.y;
        const maxY = geom.boundingBox.max.y;
        const span = Math.max(0.2, maxY - minY);
        const bandHeightMm = Math.max(0.8, span / 24);
        const numBands = Math.max(2, Math.ceil(span / bandHeightMm));
        const bandVotes = Array.from({ length: numBands }, () => new Float32Array(filamentSlots.length));

        const pA = new THREE.Vector3(), pB = new THREE.Vector3(), pC = new THREE.Vector3();
        const ab = new THREE.Vector3(), ac = new THREE.Vector3(), cr = new THREE.Vector3();
        const triBand = new Int32Array(triCount);

        for (let t = 0; t < triCount; t++) {
            const i3 = t * 3;
            pA.fromBufferAttribute(pos, i3);
            pB.fromBufferAttribute(pos, i3 + 1);
            pC.fromBufferAttribute(pos, i3 + 2);
            const cy = (pA.y + pB.y + pC.y) / 3;
            ab.subVectors(pB, pA);
            ac.subVectors(pC, pA);
            cr.crossVectors(ab, ac);
            const area = Math.max(1e-5, 0.5 * cr.length());
            const b = Math.max(0, Math.min(numBands - 1, Math.floor((cy - minY) / bandHeightMm)));
            triBand[t] = b;
            const s = Math.max(0, Math.min(filamentSlots.length - 1, triangleColors[t] || 0));
            bandVotes[b][s] += area;
        }

        const bandWinner = new Int32Array(numBands);
        for (let b = 0; b < numBands; b++) {
            let bestS = 0, bestV = -1;
            for (let s = 0; s < filamentSlots.length; s++) {
                if (bandVotes[b][s] > bestV) { bestV = bandVotes[b][s]; bestS = s; }
            }
            bandWinner[b] = bestS;
        }

        for (let t = 0; t < triCount; t++) {
            const w = bandWinner[triBand[t]];
            if (triangleColors[t] !== w) {
                triangleColors[t] = w;
                changed++;
            }
        }
    } else {
        // Merge isolated single-triangle confetti speckles into dominant neighbor slot
        if (!meshTopology || meshTopology.triCount !== triCount) {
            if (typeof buildMeshTopology === 'function') buildMeshTopology(geom);
        }
        const adj = meshTopology ? meshTopology.adj : null;
        if (adj) {
            const nextColors = new Uint8Array(triangleColors);
            for (let pass = 0; pass < 2; pass++) {
                for (let t = 0; t < triCount; t++) {
                    const nbrs = adj[t];
                    if (!nbrs || nbrs.length < 2) continue;
                    const cur = nextColors[t];
                    let sameCount = 0;
                    const voteMap = new Map();
                    for (let k = 0; k < nbrs.length; k++) {
                        const nc = nextColors[nbrs[k]];
                        if (nc === cur) sameCount++;
                        voteMap.set(nc, (voteMap.get(nc) || 0) + 1);
                    }
                    if (sameCount === 0) {
                        let bestC = cur, bestN = -1;
                        voteMap.forEach((cnt, col) => {
                            if (cnt > bestN) { bestN = cnt; bestC = col; }
                        });
                        if (bestC !== cur) {
                            nextColors[t] = bestC;
                            changed++;
                        }
                    }
                }
            }
            triangleColors.set(nextColors);
        }
    }

    if (typeof updateMeshVisualColors === 'function') updateMeshVisualColors();
    updateStats();
    refreshPurgeOptimizerReport();

    const isFr = (typeof currentLang !== 'undefined' && currentLang === 'fr');
    showToast(isFr
        ? `Purge optimisée : ${changed} faces nettoyées`
        : `Purge optimized: ${changed} faces aligned`
    );
}

// ==========================================
// PURGE HEATMAP OVERLAY
// ==========================================

function togglePurgeHeatmap() {
    isShowingPurgeHeatmap = !isShowingPurgeHeatmap;
    const btn = document.getElementById('btn-purge-heatmap');
    if (btn) btn.classList.toggle('active', isShowingPurgeHeatmap);

    if (!currentMesh || !currentMesh.geometry) return;
    if (!isShowingPurgeHeatmap) {
        if (typeof updateMeshVisualColors === 'function') updateMeshVisualColors();
        showToast(t('heatmapOff', 'Purge Heatmap off'));
        return;
    }

    const report = analyzePrintForAxis(0, 1, 0, 0.25);
    if (!report) return;

    const geom = currentMesh.geometry;
    const pos = geom.attributes.position;
    const colAttr = geom.attributes.color;
    const triCount = Math.floor(pos.count / 3);

    const cLow = new THREE.Color('#10B981');  // 1 color = zero swaps
    const cMed = new THREE.Color('#F59E0B');  // 2 colors = moderate
    const cHigh = new THREE.Color('#EF4444'); // 3+ colors = hot purge zone

    for (let t = 0; t < triCount; t++) {
        const i3 = t * 3;
        const cy = (pos.getY(i3) + pos.getY(i3 + 1) + pos.getY(i3 + 2)) / 3;
        const l = Math.max(0, Math.min(report.layerCount - 1, Math.floor((cy - report.minH) / report.actualLayerH)));
        const nColors = report.layerUniqueColors[l] || 1;
        const col = nColors >= 3 ? cHigh : (nColors === 2 ? cMed : cLow);
        for (let v = 0; v < 3; v++) {
            colAttr.setXYZ(i3 + v, col.r, col.g, col.b);
        }
    }
    colAttr.needsUpdate = true;
    showToast(t('heatmapOn', 'Purge Heatmap: Green=1 color, Amber=2, Red=3+ swaps/layer'));
}

// ==========================================
// INTERACTIVE Z-SLICE LAYER SCRUBBER HUD
// ==========================================

function updateLayerScrubberBounds() {
    if (!currentMesh || !currentMesh.geometry) return;
    currentMesh.geometry.computeBoundingBox();
    const minY = currentMesh.geometry.boundingBox.min.y;
    const maxY = currentMesh.geometry.boundingBox.max.y;
    const span = Math.max(0.2, maxY - minY);
    const totalLayers = Math.max(1, Math.round(span / 0.2));
    const currentY = minY + span * layerSliceRatio;
    const curLayer = Math.max(1, Math.min(totalLayers, Math.round(totalLayers * layerSliceRatio)));

    layerSlicePlane.constant = currentY + 0.01;
    const label = document.getElementById('layer-scrubber-label');
    if (label) {
        label.textContent = layerSliceRatio >= 0.999
            ? `All ${totalLayers} layers (${span.toFixed(1)}mm)`
            : `Layer ${curLayer}/${totalLayers} (${(currentY - minY).toFixed(1)}mm)`;
    }
}

function setLayerSliceRatio(val) {
    layerSliceRatio = Math.max(0.02, Math.min(1.0, parseFloat(val)));
    if (!currentMesh || !currentMesh.material) return;

    const enableClip = layerSliceRatio < 0.999;
    isLayerScrubberActive = enableClip;
    if (renderer) renderer.localClippingEnabled = true;

    updateLayerScrubberBounds();
    currentMesh.material.clippingPlanes = enableClip ? [layerSlicePlane] : null;
    currentMesh.material.side = enableClip ? THREE.DoubleSide : THREE.FrontSide;
    currentMesh.material.needsUpdate = true;
}

function layerScrubberReset() {
    layerSliceRatio = 1.0;
    isLayerScrubberActive = false;
    const slider = document.getElementById('layer-scrubber-slider');
    if (slider) slider.value = 1;
    if (currentMesh && currentMesh.material) {
        currentMesh.material.clippingPlanes = null;
        currentMesh.material.side = THREE.FrontSide;
        currentMesh.material.needsUpdate = true;
    }
    updateLayerScrubberBounds();
}

// ==========================================
// COLOR BY NUMBERS 3D OVERLAY
// ==========================================

function clearColorByNumbers() {
    if (cbnLabelsGroup && scene) {
        scene.remove(cbnLabelsGroup);
        cbnLabelsGroup = null;
    }
    const container = document.getElementById('cbn-overlay-container');
    if (container) container.innerHTML = '';
}

function toggleColorByNumbers() {
    isColorByNumbersActive = !isColorByNumbersActive;
    const btn = document.getElementById('btn-cbn');
    if (btn) btn.classList.toggle('active', isColorByNumbersActive);

    if (!isColorByNumbersActive) {
        clearColorByNumbers();
        return;
    }
    updateColorByNumbersOverlay();
    showToast(t('cbnActive', 'Color-by-Numbers guide enabled'));
}

function updateColorByNumbersOverlay() {
    const container = document.getElementById('cbn-overlay-container');
    if (!container || !isColorByNumbersActive || !currentMesh || !camera || !renderer) return;

    const geom = currentMesh.geometry;
    const pos = geom.attributes.position;
    if (!pos) return;
    const triCount = Math.floor(pos.count / 3);

    // Accumulate centroid per used slot
    const sumX = new Float64Array(filamentSlots.length);
    const sumY = new Float64Array(filamentSlots.length);
    const sumZ = new Float64Array(filamentSlots.length);
    const counts = new Int32Array(filamentSlots.length);

    for (let t = 0; t < triCount; t++) {
        const s = triangleColors[t] || 0;
        const i3 = t * 3;
        sumX[s] += (pos.getX(i3) + pos.getX(i3 + 1) + pos.getX(i3 + 2)) / 3;
        sumY[s] += (pos.getY(i3) + pos.getY(i3 + 1) + pos.getY(i3 + 2)) / 3;
        sumZ[s] += (pos.getZ(i3) + pos.getZ(i3 + 1) + pos.getZ(i3 + 2)) / 3;
        counts[s]++;
    }

    const rect = renderer.domElement.getBoundingClientRect();
    let html = '';
    const v = new THREE.Vector3();
    for (let s = 0; s < filamentSlots.length; s++) {
        if (counts[s] === 0) continue;
        v.set(sumX[s] / counts[s], sumY[s] / counts[s], sumZ[s] / counts[s]);
        v.applyMatrix4(currentMesh.matrixWorld);
        v.project(camera);
        if (v.z > 1) continue;
        const x = (v.x * 0.5 + 0.5) * rect.width;
        const y = (-v.y * 0.5 + 0.5) * rect.height;
        const col = filamentSlots[s].color;
        html += `<div class="cbn-num" style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;border-color:${col};" onclick="selectSlot(${s})">${s + 1}</div>`;
    }
    container.innerHTML = html;
}

// ==========================================
// HEIGHT GRADIENT AUTO-COLOR MODAL
// ==========================================

function openHeightColorModal() {
    const modal = document.getElementById('height-color-modal');
    if (!modal) return;
    if (typeof populateSlotDropdowns === 'function') populateSlotDropdowns();
    modal.classList.add('open');
}

function closeHeightColorModal() {
    const modal = document.getElementById('height-color-modal');
    if (modal) modal.classList.remove('open');
}

function applyHeightGradient() {
    if (!currentMesh || !currentMesh.geometry || !triangleColors) return;
    const bottomSlot = parseInt(document.getElementById('height-bottom-slot')?.value || '0', 10);
    const topSlot = parseInt(document.getElementById('height-top-slot')?.value || '1', 10);
    const ratio = parseFloat(document.getElementById('height-split-ratio')?.value || '0.5');

    saveHistory();
    const geom = currentMesh.geometry;
    geom.computeBoundingBox();
    const minY = geom.boundingBox.min.y;
    const spanY = Math.max(1e-4, geom.boundingBox.max.y - minY);
    const pos = geom.attributes.position;
    const triCount = Math.floor(pos.count / 3);

    for (let t = 0; t < triCount; t++) {
        const i3 = t * 3;
        const cy = (pos.getY(i3) + pos.getY(i3 + 1) + pos.getY(i3 + 2)) / 3;
        const rel = (cy - minY) / spanY;
        triangleColors[t] = rel >= ratio ? topSlot : bottomSlot;
    }

    if (typeof updateMeshVisualColors === 'function') updateMeshVisualColors();
    updateStats();
    closeHeightColorModal();
    showToast(t('heightApplied', 'Height layer split applied!'));
}

// ==========================================
// LOADED SPOOLS FILTER
// ==========================================

function openLoadedSpoolsModal() {
    const modal = document.getElementById('loaded-spools-modal');
    const list = document.getElementById('loaded-spools-list');
    if (!modal || !list) return;

    list.innerHTML = filamentSlots.map((slot, i) => {
        const checked = !loadedSpoolsIndices || loadedSpoolsIndices.has(i) ? 'checked' : '';
        return `
            <label style="display:flex;align-items:center;gap:8px;padding:6px;background:rgba(255,255,255,0.04);border-radius:8px;cursor:pointer;">
                <input type="checkbox" class="spool-checkbox" value="${i}" ${checked}>
                <span style="width:14px;height:14px;border-radius:4px;background:${slot.color};border:1px solid rgba(255,255,255,0.3);"></span>
                <span style="font-size:0.82rem;">${i + 1}. ${slot.name}</span>
            </label>
        `;
    }).join('');
    modal.classList.add('open');
}

function closeLoadedSpoolsModal() {
    const modal = document.getElementById('loaded-spools-modal');
    if (modal) modal.classList.remove('open');
}

function applyLoadedSpoolsRemap() {
    const boxes = Array.from(document.querySelectorAll('.spool-checkbox'));
    const allowed = boxes.filter(b => b.checked).map(b => parseInt(b.value, 10));
    if (allowed.length === 0) {
        showToast('Select at least 1 loaded spool');
        return;
    }
    loadedSpoolsIndices = new Set(allowed);

    if (currentMesh && triangleColors) {
        saveHistory();
        const remap = new Int32Array(filamentSlots.length);
        for (let s = 0; s < filamentSlots.length; s++) {
            if (loadedSpoolsIndices.has(s)) {
                remap[s] = s;
            } else {
                const rgb = new THREE.Color(filamentSlots[s].color);
                if (typeof findClosestSlotPerceptual === 'function') {
                    // Find closest among allowed spools only
                    let best = allowed[0], bestDist = Infinity;
                    for (const a of allowed) {
                        const ca = new THREE.Color(filamentSlots[a].color);
                        const d = (rgb.r - ca.r) ** 2 + (rgb.g - ca.g) ** 2 + (rgb.b - ca.b) ** 2;
                        if (d < bestDist) { bestDist = d; best = a; }
                    }
                    remap[s] = best;
                } else {
                    remap[s] = allowed[0];
                }
            }
        }
        for (let t = 0; t < triangleColors.length; t++) {
            triangleColors[t] = remap[triangleColors[t]] ?? allowed[0];
        }
        if (typeof updateMeshVisualColors === 'function') updateMeshVisualColors();
        updateStats();
    }

    closeLoadedSpoolsModal();
    showToast(`Remapped colors to ${allowed.length} loaded AMS spools`);
}
