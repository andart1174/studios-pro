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

function _escHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getFilamentDensityGcm3(rawType) {
    const tStr = String(rawType || 'PLA').toUpperCase();
    if (tStr.includes('PETG')) return 1.27;
    if (tStr.includes('ABS')) return 1.04;
    if (tStr.includes('ASA')) return 1.07;
    if (tStr.includes('TPU')) return 1.21;
    if (tStr.includes('CF') || tStr.includes('CARBON')) return 1.29;
    return 1.24; // Standard PLA
}

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
    let signedVol6 = 0;

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

        // Exact signed tetrahedron volume contribution: pA · (pB × pC) = 6 * V_tet
        signedVol6 += pA.x * (pB.y * pC.z - pB.z * pC.y)
                    + pA.y * (pB.z * pC.x - pB.x * pC.z)
                    + pA.z * (pB.x * pC.y - pB.y * pC.x);

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
        const l1 = Math.max(l0, Math.min(layerCount - 1, Math.floor((triProjMax[t] - minH - 1e-5) / actualLayerH)));
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

    // True closed signed mesh volume (mm³) -> realistic 2-wall shell + 15% gyroid infill + per-material density!
    geom.computeBoundingBox();
    const closedVolMm3 = Math.abs(signedVol6) / 6.0;
    const shellVolMm3 = totalArea * 0.96; // ~2.4 perimeter lines * 0.4mm nozzle
    let printedVolCm3;
    if (closedVolMm3 > totalArea * 0.15) {
        const effectiveShell = Math.min(closedVolMm3, shellVolMm3);
        const effectiveInfill = Math.max(0, closedVolMm3 - effectiveShell) * 0.15;
        printedVolCm3 = (effectiveShell + effectiveInfill) / 1000.0;
    } else {
        // Fallback for non-manifold open shells
        printedVolCm3 = (totalArea * 0.85) / 1000.0;
    }

    // Area-weighted average filament density across active slots
    let weightedDensity = 1.24;
    if (totalArea > 1e-4) {
        let densSum = 0;
        for (let s = 0; s < filamentSlots.length; s++) {
            if (slotArea[s] > 0) densSum += (slotArea[s] / totalArea) * getFilamentDensityGcm3(filamentSlots[s]?.type);
        }
        if (densSum > 0.5) weightedDensity = densSum;
    }
    const partGrams = Math.max(0.2, printedVolCm3 * weightedDensity);

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
        volumeCm3: +(closedVolMm3 / 1000.0).toFixed(2),
        totalMinutes,
        usedSlots,
        slotTris,
        slotArea,
        totalArea,
        layerSlotMasks,
        layerUniqueColors,
        minH,
        maxH,
        warnings
    };
}

function getSwapFlushGrams(fromSlot, toSlot) {
    if (typeof getFlushVolumeMm3 === 'function') {
        const mm3 = getFlushVolumeMm3(fromSlot, toSlot);
        const dens = getFilamentDensityGcm3(filamentSlots[toSlot]?.type);
        return Math.max(0.05, (mm3 / 1000.0) * dens);
    }
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
    const analysis = analyzePrintForAxis(0, 1, 0, 0.2);
    if (analysis) {
        if (elSwaps) {
            elSwaps.textContent = `${analysis.totalSwaps} swaps (~${analysis.purgeGrams}g)`;
        }
        // #5 Populate per-slot Grams, Cost & exact Largest-Remainder 100% Area stats!
        if (typeof slotUsageStats !== 'undefined') {
            const totalA = Math.max(1e-4, analysis.totalArea || 1);
            const rawPcts = filamentSlots.map((_, s) => ((analysis.slotArea[s] || 0) / totalA) * 100);
            const floorPcts = rawPcts.map(p => Math.floor(p));
            let rem = 100 - floorPcts.reduce((a, b) => a + b, 0);
            const order = rawPcts.map((p, idx) => ({ idx, frac: p - floorPcts[idx], hasTris: (analysis.slotTris[idx] || 0) > 0 }))
                .filter(o => o.hasTris)
                .sort((a, b) => b.frac - a.frac);
            for (let k = 0; k < order.length && rem > 0; k++) {
                floorPcts[order[k].idx]++;
                rem--;
            }
            slotUsageStats = filamentSlots.map((_, s) => {
                const areaFrac = (analysis.slotArea[s] || 0) / totalA;
                const grams = +(analysis.partGrams * areaFrac).toFixed(1);
                const costUsd = +((grams / 1000) * 24).toFixed(2);
                const pct = (analysis.slotTris[s] || 0) > 0 ? Math.max(0, floorPcts[s]) : 0;
                return { grams, costUsd, pct, tris: analysis.slotTris[s] || 0 };
            });
            if (typeof renderSlotUsageBar === 'function') renderSlotUsageBar();
            // Update slot usage pills in-place without rebuilding entire grid DOM
            const cards = document.querySelectorAll('#filament-grid .filament-slot');
            cards.forEach((card, idx) => {
                const u = slotUsageStats[idx];
                let pill = card.querySelector('.slot-usage-pill');
                if (u && u.tris > 0) {
                    const txt = `${u.grams.toFixed(1)}g (${u.pct}%)`;
                    if (pill) {
                        pill.textContent = txt;
                    } else {
                        const dark = typeof isColorDark === 'function' ? isColorDark(filamentSlots[idx].color) : true;
                        pill = document.createElement('span');
                        pill.className = 'slot-usage-pill';
                        pill.style.cssText = `color:${dark ? 'rgba(255,255,255,0.88)' : 'rgba(15,23,42,0.85)'};background:${dark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.55)'};`;
                        pill.textContent = txt;
                        card.appendChild(pill);
                    }
                } else if (pill) {
                    pill.remove();
                }
            });
        }
        if (typeof updateCostCalculatorUI === 'function') updateCostCalculatorUI(analysis);
        if (typeof updateMultiCopySavingsUI === 'function') updateMultiCopySavingsUI(analysis);
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
    const geom = currentMesh.geometry;
    geom.scale(factor, factor, factor);
    if (typeof alignGeometryToBed === 'function') alignGeometryToBed(geom);
    else geom.computeBoundingBox();
    geom.computeVertexNormals();
    if (geom.disposeBoundsTree) geom.disposeBoundsTree();
    if (typeof geom.computeBoundsTree === 'function') geom.computeBoundsTree();
    if (typeof buildMeshTopology === 'function') meshTopology = buildMeshTopology(geom);
    if (typeof SpatialGrid === 'function') spatialGrid = new SpatialGrid(geom, 32);
    if (typeof precomputeGeometryMetrics === 'function') precomputeGeometryMetrics(geom);
    if (typeof currentGeoGen !== 'undefined') currentGeoGen++;
    if (typeof updateMirrorPlaneHelper === 'function') updateMirrorPlaneHelper();

    const size = new THREE.Vector3();
    geom.boundingBox.getSize(size);
    adaptBrushToModel(size);
    updateStats();
    if (typeof commitHistory === 'function') commitHistory(true);
    if (typeof resetCamera === 'function') resetCamera();
    showToast(`${t('modelScaled', 'Model scaled!')} (${size.x.toFixed(1)}×${size.y.toFixed(1)}×${size.z.toFixed(1)} mm)`);
}

function colorAll(slotIndex) {
    if (!currentMesh || !triangleColors) return;
    const idx = typeof slotIndex === 'number' ? slotIndex : activeSlotIndex;
    triangleColors.fill(idx);
    if (typeof updateMeshVisualColors === 'function') updateMeshVisualColors();
    if (typeof commitHistory === 'function') commitHistory(false);
    showToast(`${t('filledAll', 'Filled entire model!')} (Slot #${idx + 1})`);
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
                const dName = _escHtml(filamentSlots[w.darkSlot]?.name || `Slot ${w.darkSlot + 1}`);
                const lName = _escHtml(filamentSlots[w.lightSlot]?.name || `Slot ${w.lightSlot + 1}`);
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

    const geom = currentMesh.geometry;
    if (best.rx !== 0) geom.rotateX(best.rx);
    if (best.rz !== 0) geom.rotateZ(best.rz);
    if (typeof alignGeometryToBed === 'function') alignGeometryToBed(geom);
    geom.computeVertexNormals();
    geom.computeBoundingBox();
    if (geom.disposeBoundsTree) geom.disposeBoundsTree();
    if (typeof geom.computeBoundsTree === 'function') geom.computeBoundsTree();
    if (typeof buildMeshTopology === 'function') meshTopology = buildMeshTopology(geom);
    if (typeof SpatialGrid === 'function') spatialGrid = new SpatialGrid(geom, 32);
    if (typeof precomputeGeometryMetrics === 'function') precomputeGeometryMetrics(geom);
    if (typeof currentGeoGen !== 'undefined') currentGeoGen++;
    if (typeof updateMirrorPlaneHelper === 'function') updateMirrorPlaneHelper();

    updateStats();
    if (typeof commitHistory === 'function') commitHistory(true);
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
        // FIXED: Uses real meshTopology.faceNeighbors & faceCount!
        if (!meshTopology || meshTopology.faceCount !== triCount) {
            if (typeof buildMeshTopology === 'function') meshTopology = buildMeshTopology(geom);
        }
        const adj = meshTopology ? (meshTopology.faceNeighbors || meshTopology.adj) : null;
        if (adj) {
            const nextColors = new Uint8Array(triangleColors);
            for (let pass = 0; pass < 3; pass++) {
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
                    if (sameCount <= 1 && nbrs.length >= 2) {
                        let bestC = cur, bestN = -1;
                        voteMap.forEach((cnt, col) => {
                            if (col !== cur && cnt > bestN) { bestN = cnt; bestC = col; }
                        });
                        if (bestC !== cur && bestN >= 2) {
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
    if (changed > 0 && typeof commitHistory === 'function') commitHistory(false);
    refreshPurgeOptimizerReport();

    const isFr = (typeof currentLang !== 'undefined' && currentLang === 'fr');
    showToast(isFr
        ? `Purge optimisée : ${changed} faces nettoyées`
        : `Purge optimized: ${changed} faces aligned`
    );
}

// ==========================================
// 💸 #4 "AMS SWAP KILLER" — EXPENSIVE SPECKLE INSPECTOR & 1-CLICK FIXER
// ==========================================
let lastExpensiveSpeckles = [];

function scanExpensiveAMSSpeckles() {
    const outEl = document.getElementById('swap-killer-results');
    if (!currentMesh || !currentMesh.geometry || !triangleColors) return [];
    const geom = currentMesh.geometry;
    const pos = geom.attributes.position;
    const triCount = Math.floor(pos.count / 3);
    if (!meshTopology || meshTopology.faceCount !== triCount) {
        meshTopology = buildMeshTopology(geom);
    }
    const adj = meshTopology.faceNeighbors;
    const fcent = meshTopology.faceCenters;

    geom.computeBoundingBox();
    const minY = geom.boundingBox.min.y;
    const spanY = Math.max(0.2, geom.boundingBox.max.y - minY);
    const layerH = parseFloat(document.getElementById('purge-layer-height')?.value || '0.2') || 0.2;
    const layerCount = Math.max(1, Math.min(2500, Math.ceil(spanY / layerH)));
    const actualLH = spanY / layerCount;

    // Count how many faces of each slot occupy each layer
    const layerSlotFaceCount = Array.from({ length: filamentSlots.length }, () => new Int32Array(layerCount));
    const triL0 = new Int32Array(triCount);
    const triL1 = new Int32Array(triCount);

    for (let t = 0; t < triCount; t++) {
        const i3 = t * 3;
        const y0 = pos.getY(i3), y1 = pos.getY(i3 + 1), y2 = pos.getY(i3 + 2);
        const l0 = Math.max(0, Math.min(layerCount - 1, Math.floor((Math.min(y0, y1, y2) - minY) / actualLH)));
        const l1 = Math.max(l0, Math.min(layerCount - 1, Math.floor((Math.max(y0, y1, y2) - minY - 1e-5) / actualLH)));
        triL0[t] = l0; triL1[t] = l1;
        const s = Math.max(0, Math.min(filamentSlots.length - 1, triangleColors[t] || 0));
        for (let l = l0; l <= l1; l++) layerSlotFaceCount[s][l]++;
    }

    // Extract connected same-color patches
    const visited = new Uint8Array(triCount);
    const q = new Int32Array(triCount);
    const maxPatchTris = Math.max(12, Math.min(240, Math.floor(triCount * 0.06)));
    const patches = [];

    for (let start = 0; start < triCount; start++) {
        if (visited[start]) continue;
        const slot = triangleColors[start];
        let head = 0, tail = 0;
        q[tail++] = start;
        visited[start] = 1;
        const tris = [];
        const borderVotes = new Map();
        let cx = 0, cy = 0, cz = 0;

        while (head < tail) {
            const f = q[head++];
            tris.push(f);
            cx += fcent[f * 3]; cy += fcent[f * 3 + 1]; cz += fcent[f * 3 + 2];
            const nbs = adj[f];
            for (let k = 0; k < nbs.length; k++) {
                const nb = nbs[k];
                const nbSlot = triangleColors[nb];
                if (nbSlot === slot) {
                    if (!visited[nb]) { visited[nb] = 1; q[tail++] = nb; }
                } else {
                    borderVotes.set(nbSlot, (borderVotes.get(nbSlot) || 0) + 1);
                }
            }
        }

        if (tris.length > maxPatchTris || borderVotes.size === 0) continue;

        let domSlot = slot, bestV = -1;
        borderVotes.forEach((cnt, s) => { if (cnt > bestV) { bestV = cnt; domSlot = s; } });
        if (domSlot === slot) continue;

        // Compute how many layers ONLY had `slot` because of THIS tiny patch!
        const patchLayerCounts = new Map();
        for (let i = 0; i < tris.length; i++) {
            const t = tris[i];
            for (let l = triL0[t]; l <= triL1[t]; l++) {
                patchLayerCounts.set(l, (patchLayerCounts.get(l) || 0) + 1);
            }
        }
        let swapsSaved = 0;
        patchLayerCounts.forEach((cnt, l) => {
            if (layerSlotFaceCount[slot][l] <= cnt) swapsSaved++;
        });

        if (swapsSaved > 0 || tris.length <= 8) {
            const estSwaps = Math.max(1, swapsSaved);
            patches.push({
                tris,
                slot,
                domSlot,
                swapsSaved: estSwaps,
                wasteGrams: +(estSwaps * getSwapFlushGrams(slot, domSlot)).toFixed(1),
                center: new THREE.Vector3(cx / tris.length, cy / tris.length, cz / tris.length)
            });
        }
    }

    patches.sort((a, b) => b.swapsSaved - a.swapsSaved || a.tris.length - b.tris.length);
    lastExpensiveSpeckles = patches.slice(0, 8);

    if (outEl) {
        const isFr = (typeof currentLang !== 'undefined' && currentLang === 'fr');
        if (lastExpensiveSpeckles.length === 0) {
            outEl.innerHTML = `<div style="font-size:0.75rem;color:#34d399;padding:8px;background:rgba(16,185,129,0.1);border-radius:8px;">${isFr ? '✅ Aucune micro-tache coûteuse détectée ! Votre peinture est super propre.' : '✅ Zero expensive stray speckles detected! Your paint job is super clean.'}</div>`;
        } else {
            outEl.innerHTML = lastExpensiveSpeckles.map((p, idx) => {
                const sName = _escHtml(filamentSlots[p.slot]?.name || `Slot #${p.slot + 1}`);
                const dName = _escHtml(filamentSlots[p.domSlot]?.name || `Slot #${p.domSlot + 1}`);
                const sCol = _escHtml(filamentSlots[p.slot]?.color || '#fff');
                return `
                    <div class="speckle-card">
                        <div style="display:flex;align-items:center;gap:6px;min-width:0;">
                            <span style="width:10px;height:10px;border-radius:50%;background:${sCol};flex-shrink:0;border:1px solid #fff;"></span>
                            <span style="font-size:0.73rem;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                                <b>${p.tris.length} tris</b> (${sName} ➔ ${dName}) • <b style="color:#fbbf24;">-${p.swapsSaved} swaps (~${p.wasteGrams}g)</b>
                            </span>
                        </div>
                        <div style="display:flex;gap:4px;flex-shrink:0;">
                            <button class="btn-secondary" style="padding:2px 6px;font-size:0.68rem;" onclick="focusOnSpecklePatch(${idx})">👁</button>
                            <button class="btn-primary" style="padding:2px 8px;font-size:0.68rem;" onclick="fixSingleSpecklePatch(${idx})">Fix</button>
                        </div>
                    </div>
                `;
            }).join('') + `
                <button class="btn-action emerald-style" style="margin-top:6px;margin-bottom:0;" onclick="fixAllExpensiveSpeckles()">
                    ⚡ ${t('btnSwapKillerFixAll', 'Fix All Expensive Speckles')} (${lastExpensiveSpeckles.length})
                </button>
            `;
        }
    }
    return lastExpensiveSpeckles;
}

function focusOnSpecklePatch(idx) {
    const p = lastExpensiveSpeckles[idx];
    if (!p || !camera || !controls) return;
    closePurgeOptimizerModal();
    controls.target.copy(p.center);
    const dir = camera.position.clone().sub(controls.target).normalize();
    if (dir.lengthSq() < 0.01) dir.set(0.5, 0.4, 0.8).normalize();
    camera.position.copy(p.center).addScaledVector(dir, 24);
    controls.update();
    showToast(currentLang === 'fr'
        ? `Micro-zone localisée (${p.tris.length} tris, -${p.swapsSaved} changements AMS)`
        : `Located expensive speckle (${p.tris.length} tris, -${p.swapsSaved} AMS swaps)`);
}

function fixSingleSpecklePatch(idx) {
    const p = lastExpensiveSpeckles[idx];
    if (!p || !triangleColors) return;
    for (let i = 0; i < p.tris.length; i++) triangleColors[p.tris[i]] = p.domSlot;
    updateMeshVisualColors();
    commitHistory(false);
    refreshPurgeOptimizerReport();
    scanExpensiveAMSSpeckles();
    showToast(currentLang === 'fr' ? `Micro-zone corrigée (-${p.swapsSaved} purges) !` : `Speckle fixed (-${p.swapsSaved} swaps saved)!`);
}

function fixAllExpensiveSpeckles() {
    if (!lastExpensiveSpeckles.length || !triangleColors) return;
    let totalTris = 0;
    lastExpensiveSpeckles.forEach(p => {
        for (let i = 0; i < p.tris.length; i++) {
            triangleColors[p.tris[i]] = p.domSlot;
            totalTris++;
        }
    });
    updateMeshVisualColors();
    commitHistory(false);
    refreshPurgeOptimizerReport();
    scanExpensiveAMSSpeckles();
    showToast(currentLang === 'fr'
        ? `⚡ ${totalTris} triangles parasites nettoyés !`
        : `⚡ Cleaned ${totalTris} expensive speckle triangles!`);
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
    const layerH = Math.max(0.08, Math.min(1.0, parseFloat(document.getElementById('purge-layer-height')?.value || '0.2') || 0.2));
    const totalLayers = Math.max(1, Math.round(span / layerH));
    const currentY = minY + span * layerSliceRatio;
    const curLayer = Math.max(1, Math.min(totalLayers, Math.round(totalLayers * layerSliceRatio)));
    const isFr = (typeof currentLang !== 'undefined' && currentLang === 'fr');

    layerSlicePlane.constant = currentY + 0.01;
    const label = document.getElementById('layer-scrubber-label');
    if (label) {
        label.textContent = layerSliceRatio >= 0.999
            ? (isFr ? `Toutes ${totalLayers} couches (${span.toFixed(1)}mm)` : `All ${totalLayers} layers (${span.toFixed(1)}mm)`)
            : (isFr ? `Couche ${curLayer}/${totalLayers} (${(currentY - minY).toFixed(1)}mm)` : `Layer ${curLayer}/${totalLayers} (${(currentY - minY).toFixed(1)}mm)`);
    }
}

function setLayerSliceRatio(val) {
    const parsed = parseFloat(val);
    if (isNaN(parsed)) return;
    layerSliceRatio = Math.max(0.02, Math.min(1.0, parsed));
    if (!currentMesh || !currentMesh.material) return;

    const enableClip = layerSliceRatio < 0.999;
    isLayerScrubberActive = enableClip;
    if (renderer) renderer.localClippingEnabled = true;

    updateLayerScrubberBounds();
    currentMesh.material.clippingPlanes = enableClip ? [layerSlicePlane] : null;
    currentMesh.material.side = THREE.DoubleSide;
    currentMesh.material.needsUpdate = true;
}

function layerScrubberReset() {
    layerSliceRatio = 1.0;
    isLayerScrubberActive = false;
    const slider = document.getElementById('layer-scrubber-slider');
    if (slider) slider.value = 1;
    if (currentMesh && currentMesh.material) {
        currentMesh.material.clippingPlanes = null;
        currentMesh.material.side = THREE.DoubleSide;
        currentMesh.material.needsUpdate = true;
    }
    updateLayerScrubberBounds();
}

// ==========================================
// COLOR BY NUMBERS 3D OVERLAY (CACHED ISLANDS, ZERO 60FPS DOM THRASHING!)
// ==========================================
let cbnDirty = true;
let cbnCachedMarkers = []; // [{ slot, pos: Vector3, el: HTMLElement }]
let lastCbnCamKey = '';

function markCbnDirty() {
    cbnDirty = true;
    if (isColorByNumbersActive) renderColorByNumbersBar();
}

function renderColorByNumbersBar() {
    const bar = document.getElementById('color-by-numbers-bar');
    if (!bar) return;
    if (!isColorByNumbersActive) {
        bar.style.display = 'none';
        return;
    }
    bar.style.display = 'flex';
    bar.innerHTML = filamentSlots.map((slot, s) => `
        <button class="cbn-pill ${s === activeSlotIndex ? 'active' : ''}" onclick="selectSlot(${s}); renderColorByNumbersBar();">
            <span class="cbn-num">#${s + 1}</span>
            <span class="cbn-dot" style="background:${_escHtml(slot.color)};"></span>
            <span>${_escHtml(slot.name)}</span>
        </button>
    `).join('');
}

function clearColorByNumbers() {
    if (cbnLabelsGroup && scene) {
        scene.remove(cbnLabelsGroup);
        cbnLabelsGroup = null;
    }
    cbnCachedMarkers = [];
    lastCbnCamKey = '';
    const container = document.getElementById('cbn-overlay-container');
    if (container) container.innerHTML = '';
    const bar = document.getElementById('color-by-numbers-bar');
    if (bar) bar.style.display = 'none';
}

function toggleColorByNumbers() {
    isColorByNumbersActive = !isColorByNumbersActive;
    const btn = document.getElementById('btn-cbn');
    if (btn) btn.classList.toggle('active', isColorByNumbersActive);

    if (!isColorByNumbersActive) {
        clearColorByNumbers();
        return;
    }
    cbnDirty = true;
    renderColorByNumbersBar();
    updateColorByNumbersOverlay();
    showToast(t('cbnActive', 'Color-by-Numbers guide enabled'));
}

function rebuildCbnMarkers() {
    const container = document.getElementById('cbn-overlay-container');
    if (!container || !currentMesh || !triangleColors) return;
    container.innerHTML = '';
    cbnCachedMarkers = [];
    const geom = currentMesh.geometry;
    const triCount = triangleColors.length;
    if (!meshTopology || meshTopology.faceCount !== triCount) {
        meshTopology = buildMeshTopology(geom);
    }

    // Place marker at the largest connected island of each used slot (never floating in empty space!)
    const visited = new Uint8Array(triCount);
    const q = new Int32Array(triCount);
    const bestIslandPerSlot = new Map();
    const adj = meshTopology.faceNeighbors;
    const fc = meshTopology.faceCenters;

    for (let f = 0; f < triCount; f++) {
        if (visited[f]) continue;
        const slot = triangleColors[f];
        let head = 0, tail = 0;
        q[tail++] = f;
        visited[f] = 1;
        let sx = 0, sy = 0, sz = 0, cnt = 0;
        while (head < tail) {
            const cur = q[head++];
            sx += fc[cur * 3]; sy += fc[cur * 3 + 1]; sz += fc[cur * 3 + 2]; cnt++;
            const nbs = adj[cur];
            for (let k = 0; k < nbs.length; k++) {
                const nb = nbs[k];
                if (!visited[nb] && triangleColors[nb] === slot) {
                    visited[nb] = 1;
                    q[tail++] = nb;
                }
            }
        }
        const prev = bestIslandPerSlot.get(slot);
        if (!prev || cnt > prev.cnt) {
            bestIslandPerSlot.set(slot, { cnt, pos: new THREE.Vector3(sx / cnt, sy / cnt, sz / cnt) });
        }
    }

    bestIslandPerSlot.forEach((info, s) => {
        const slotObj = filamentSlots[s];
        if (!slotObj) return;
        const el = document.createElement('div');
        el.className = 'cbn-num';
        el.style.borderColor = slotObj.color;
        el.textContent = String(s + 1);
        el.title = `#${s + 1} ${slotObj.name}`;
        el.onclick = () => { selectSlot(s); renderColorByNumbersBar(); };
        container.appendChild(el);
        cbnCachedMarkers.push({ slot: s, pos: info.pos, el });
    });

    cbnDirty = false;
    lastCbnCamKey = '';
}

function updateColorByNumbersOverlay() {
    if (!isColorByNumbersActive || !currentMesh || !camera || !renderer) return;
    if (cbnDirty) rebuildCbnMarkers();
    if (cbnCachedMarkers.length === 0) return;

    const rect = renderer.domElement.getBoundingClientRect();
    const m = camera.matrixWorldInverse.elements;
    const camKey = `${m[0].toFixed(3)},${m[5].toFixed(3)},${m[12].toFixed(2)},${m[13].toFixed(2)},${m[14].toFixed(2)},${Math.round(rect.width)}x${Math.round(rect.height)}`;
    if (camKey === lastCbnCamKey) return;
    lastCbnCamKey = camKey;

    const v = new THREE.Vector3();
    for (let i = 0; i < cbnCachedMarkers.length; i++) {
        const mk = cbnCachedMarkers[i];
        v.copy(mk.pos).applyMatrix4(currentMesh.matrixWorld).project(camera);
        if (v.z > 1 || v.z < -1) {
            mk.el.style.display = 'none';
            continue;
        }
        const x = (v.x * 0.5 + 0.5) * rect.width;
        const y = (-v.y * 0.5 + 0.5) * rect.height;
        mk.el.style.display = 'flex';
        mk.el.style.left = `${x.toFixed(1)}px`;
        mk.el.style.top = `${y.toFixed(1)}px`;
    }
}

// ==========================================
// HEIGHT GRADIENT AUTO-COLOR MODAL (WITH POPULATED DROPDOWNS & LIVE PREVIEW!)
// ==========================================
let heightPreviewRaf = null;

function openHeightColorModal() {
    const modal = document.getElementById('height-color-modal');
    if (!modal) return;
    if (!currentMesh) { showToast(t('aiNoModel', 'Load a 3D model first.')); return; }
    if (typeof populateSlotDropdowns === 'function') populateSlotDropdowns();
    modal.classList.add('open');
    previewHeightGradient();
}

function closeHeightColorModal() {
    if (heightPreviewRaf) cancelAnimationFrame(heightPreviewRaf);
    const modal = document.getElementById('height-color-modal');
    if (modal) modal.classList.remove('open');
    if (typeof updateMeshVisualColors === 'function') updateMeshVisualColors();
}

function previewHeightGradient() {
    if (!currentMesh || !currentMesh.geometry) return;
    const ratio = parseFloat(document.getElementById('height-split-ratio')?.value || '0.5');
    const geom = currentMesh.geometry;
    geom.computeBoundingBox();
    const minY = geom.boundingBox.min.y;
    const spanY = Math.max(1e-4, geom.boundingBox.max.y - minY);
    const lbl = document.getElementById('val-height-split');
    if (lbl) lbl.textContent = `${Math.round(ratio * 100)}% (${(spanY * ratio).toFixed(1)} mm)`;

    if (heightPreviewRaf) cancelAnimationFrame(heightPreviewRaf);
    heightPreviewRaf = requestAnimationFrame(() => {
        const bottomRaw = parseInt(document.getElementById('height-bottom-slot')?.value, 10);
        const topRaw = parseInt(document.getElementById('height-top-slot')?.value, 10);
        const bottomSlot = isNaN(bottomRaw) ? 0 : bottomRaw;
        const topSlot = isNaN(topRaw) ? Math.min(1, filamentSlots.length - 1) : topRaw;
        const rgbBot = slotRgbFloats[bottomSlot] || slotRgbFloats[0];
        const rgbTop = slotRgbFloats[topSlot] || slotRgbFloats[0];

        const pos = geom.attributes.position;
        const colorAttr = geom.attributes.color;
        if (!pos || !colorAttr) return;
        const colArr = colorAttr.array;
        const triCount = Math.floor(pos.count / 3);

        for (let t = 0; t < triCount; t++) {
            const i3 = t * 3;
            const cy = (pos.getY(i3) + pos.getY(i3 + 1) + pos.getY(i3 + 2)) / 3;
            const rel = (cy - minY) / spanY;
            const rgb = rel >= ratio ? rgbTop : rgbBot;
            const base = t * 9;
            colArr[base] = rgb[0]; colArr[base + 1] = rgb[1]; colArr[base + 2] = rgb[2];
            colArr[base + 3] = rgb[0]; colArr[base + 4] = rgb[1]; colArr[base + 5] = rgb[2];
            colArr[base + 6] = rgb[0]; colArr[base + 7] = rgb[1]; colArr[base + 8] = rgb[2];
        }
        colorAttr.needsUpdate = true;
    });
}

function applyHeightGradient() {
    if (!currentMesh || !currentMesh.geometry || !triangleColors) return;
    const bottomRaw = parseInt(document.getElementById('height-bottom-slot')?.value, 10);
    const topRaw = parseInt(document.getElementById('height-top-slot')?.value, 10);
    const bottomSlot = isNaN(bottomRaw) ? 0 : bottomRaw;
    const topSlot = isNaN(topRaw) ? Math.min(1, filamentSlots.length - 1) : topRaw;
    const ratio = parseFloat(document.getElementById('height-split-ratio')?.value || '0.5');

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

    if (heightPreviewRaf) cancelAnimationFrame(heightPreviewRaf);
    const modal = document.getElementById('height-color-modal');
    if (modal) modal.classList.remove('open');
    if (typeof updateMeshVisualColors === 'function') updateMeshVisualColors();
    if (typeof commitHistory === 'function') commitHistory(false);
    showToast(t('heightApplied', 'Height layer split applied!'));
}

// ==========================================
// LOADED SPOOLS FILTER (TRUE PERCEPTUAL CIELAB MATCHING!)
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
                <span style="width:14px;height:14px;border-radius:4px;background:${_escHtml(slot.color)};border:1px solid rgba(255,255,255,0.3);"></span>
                <span style="font-size:0.82rem;">${i + 1}. ${_escHtml(slot.name)}</span>
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
        const remap = new Int32Array(filamentSlots.length);
        for (let s = 0; s < filamentSlots.length; s++) {
            if (loadedSpoolsIndices.has(s)) {
                remap[s] = s;
            } else if (typeof findClosestSlotPerceptual === 'function' && slotRgbFloats[s]) {
                // FIXED: Actually uses perceptual CIELAB matching among allowed spools!
                const rgb = slotRgbFloats[s];
                remap[s] = findClosestSlotPerceptual(rgb[0], rgb[1], rgb[2], allowed);
            } else {
                remap[s] = allowed[0];
            }
        }
        for (let t = 0; t < triangleColors.length; t++) {
            triangleColors[t] = remap[triangleColors[t]] ?? allowed[0];
        }
        if (typeof updateMeshVisualColors === 'function') updateMeshVisualColors();
        if (typeof commitHistory === 'function') commitHistory(false);
    }

    closeLoadedSpoolsModal();
    showToast(translations[currentLang]?.toastSpoolsRemapped || `Remapped colors to ${allowed.length} loaded AMS spools`);
}
