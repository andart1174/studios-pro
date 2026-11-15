// ==========================================
// 🔄 IMAGE ROTATION & ADJUSTMENTS
// ==========================================
function rotateImage(deg = 90) {
    config.rotation = (config.rotation + deg) % 360;
    processSourceImage();
}

function toggleFlipY() {
    config.flipY = !config.flipY;
    processSourceImage();
}

function toggleFlipX() {
    config.flipX = !config.flipX;
    processSourceImage();
}

function resetOrientation() {
    config.rotation = 0;
    config.flipX = false;
    config.flipY = false;
    config.brightness = 0;
    config.contrast = 10;
    config.smoothing = 1;
    config.detailSharpness = 5;
    config.subjectPop = 25;
    config.colorSnap = 80;
    config.sculpturalDome = 0;
    config.tdOpticalBlend = 65;
    config.opticalDithering = 20;
    config.bilateralEdgeLock = true;
    config.boostFineLines = true;
    config.invert = false;
    config.gamma = 1.0;
    config.shadowLift = 0;
    config.highlightCeiling = 100;
    config.vibrance = 0;
    config.boundarySharpness = 80;
    config.despeckleRadius = 0;
    config.layerQuantizeStep = 0;
    config.nozzleSize = 0.4;
    config.ironingSimulation = false;
    syncQualityControlsUI();
    processSourceImage();
    if (centerViewMode === '2d') render2DEditorPreview();
}

function loadUploadedFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            sourceImage = img;
            config.rotation = 0;
            config.flipX = false;
            config.flipY = false;
            isCanvasUserEdited = false;
            isDrawingTemplateActive = false;
            userEditMaskBuffer = null;
            lastProcessedMeta = null;
            resetEditHistory();
            activeQRStamp = null;
            preQRBackup = null;
            activeSoundwave = null;
            preSoundwaveBackup = null;
            processSourceImage();
            generateAIPalettesFromImage();
            applyAIPalette(0);
            showToast(translations[currentLang].toastImageLoaded);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files && files[0]) loadUploadedFile(files[0]);
}

const dropzone = document.getElementById('dropzone');
if (dropzone) {
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            loadUploadedFile(e.dataTransfer.files[0]);
        }
    });
}

function updateImageParams() {
    config.brightness = parseInt(document.getElementById('slider-brightness').value);
    config.contrast = parseInt(document.getElementById('slider-contrast').value);
    config.smoothing = parseInt(document.getElementById('slider-smoothing').value);

    document.getElementById('val-brightness').innerText = `${config.brightness > 0 ? '+' : ''}${config.brightness}%`;
    document.getElementById('val-contrast').innerText = `${config.contrast > 0 ? '+' : ''}${config.contrast}%`;
    document.getElementById('val-smoothing').innerText = config.smoothing;

    processSourceImage();
    if (centerViewMode === '2d') render2DEditorPreview();
}

function toggleInvertColors() {
    config.invert = !config.invert;
    processSourceImage();
    if (centerViewMode === '2d') render2DEditorPreview();
}

let meshUpdateRAF = null;
function requestMeshUpdate() {
    if (meshUpdateRAF) cancelAnimationFrame(meshUpdateRAF);
    meshUpdateRAF = requestAnimationFrame(() => {
        generate3DReliefMesh();
    });
}

// ==========================================
// 🧪 COLOR MATH: PERCEPTUAL DISTANCE, BAYER DITHER & BEER-LAMBERT TD
// ==========================================
function hexToRgb(hex) {
    const num = parseInt(hex.replace('#', ''), 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHex(r, g, b) {
    const toH = (c) => ('0' + Math.max(0, Math.min(255, Math.round(c))).toString(16)).slice(-2);
    return '#' + toH(r) + toH(g) + toH(b);
}

// Weighted Perceptual Color Distance (CIE approximation)
function colorDistSq(r1, g1, b1, r2, g2, b2) {
    const rmean = (r1 + r2) / 2;
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    return (((512 + rmean) * dr * dr) >> 8) + 4 * dg * dg + (((767 - rmean) * db * db) >> 8);
}

// 8x8 Ordered Bayer Matrix normalized to [-0.5, +0.5] for zero-banding gradient dithering
const BAYER_8X8 = [
     0, 32,  8, 40,  2, 34, 10, 42,
    48, 16, 56, 24, 50, 18, 58, 26,
    12, 44,  4, 36, 14, 46,  6, 38,
    60, 28, 52, 20, 62, 30, 54, 22,
     3, 35, 11, 43,  1, 33,  9, 41,
    51, 19, 59, 27, 49, 17, 57, 25,
    15, 47,  7, 39, 13, 45,  5, 37,
    63, 31, 55, 23, 61, 29, 53, 21
];

function getBayerDitherOffset(col, row) {
    const idx = ((row & 7) << 3) | (col & 7);
    return (BAYER_8X8[idx] / 63.0) - 0.5;
}

// Global closest filament lookup using perceptual color distance
function findClosestFilamentIndex(r, g, b) {
    let minDist = Infinity;
    let bestIdx = 0;
    for (let k = 0; k < filaments.length; k++) {
        const rgb = hexToRgb(filaments[k].color);
        const d = colorDistSq(r, g, b, rgb[0], rgb[1], rgb[2]);
        if (d < minDist) {
            minDist = d;
            bestIdx = k;
        }
    }
    return bestIdx;
}

// Dither-aware closest filament lookup (eliminates stair-stepping & color banding on gradients)
function findClosestFilamentWithDither(r, g, b, col, row, parsedFilaments, ditherPct) {
    if (!ditherPct || ditherPct <= 0) {
        let minDist = Infinity;
        let bestIdx = 0;
        for (let k = 0; k < parsedFilaments.length; k++) {
            const p = parsedFilaments[k].rgb;
            const d = colorDistSq(r, g, b, p[0], p[1], p[2]);
            if (d < minDist) {
                minDist = d;
                bestIdx = k;
            }
        }
        return bestIdx;
    }
    const bayer = getBayerDitherOffset(col, row);
    const spread = (ditherPct / 100.0) * 42.0 * bayer;
    const dr = Math.max(0, Math.min(255, r + spread));
    const dg = Math.max(0, Math.min(255, g + spread));
    const db = Math.max(0, Math.min(255, b + spread));
    let minDist = Infinity;
    let bestIdx = 0;
    for (let k = 0; k < parsedFilaments.length; k++) {
        const p = parsedFilaments[k].rgb;
        const d = colorDistSq(dr, dg, db, p[0], p[1], p[2]);
        if (d < minDist) {
            minDist = d;
            bestIdx = k;
        }
    }
    return bestIdx;
}

// Real Physical Beer-Lambert Sub-Surface TD Optical Blending across stacked filament layers
function computeBeerLambertTDColor(lum, zVal, baseZ, maxReliefZ, parsedFilaments, blendStrength, col, row, ditherPct) {
    const sorted = [...parsedFilaments].sort((a, b) => a.startPct - b.startPct);
    if (sorted.length === 0) return [255, 255, 255];

    const bayerOffset = (ditherPct > 0) ? getBayerDitherOffset(col, row) * (ditherPct / 100.0) * 0.065 : 0;
    const effLum = Math.max(0.0, Math.min(1.0, lum + bayerOffset));
    const effZ = baseZ + effLum * (maxReliefZ - baseZ);

    let accR = sorted[0].rgb[0];
    let accG = sorted[0].rgb[1];
    let accB = sorted[0].rgb[2];

    for (let k = 1; k < sorted.length; k++) {
        const curr = sorted[k];
        const layerStartZ = baseZ + curr.startPct * (maxReliefZ - baseZ);
        if (effZ > layerStartZ) {
            const nextStartZ = (k < sorted.length - 1)
                ? (baseZ + sorted[k + 1].startPct * (maxReliefZ - baseZ))
                : maxReliefZ;
            const thickness = Math.max(0.04, Math.min(effZ, nextStartZ + 0.35) - layerStartZ);

            if (blendStrength <= 0.01) {
                accR = curr.rgb[0];
                accG = curr.rgb[1];
                accB = curr.rgb[2];
            } else {
                const tdMm = Math.max(0.3, curr.td ?? 3.0);
                let physicalAlpha;
                if (config.opticalModel === 'cubic') {
                    const spanZ = Math.max(0.12, nextStartZ - layerStartZ);
                    const t = Math.min(1.0, thickness / (spanZ * (0.45 + 0.55 * blendStrength)));
                    physicalAlpha = t * t * (3.0 - 2.0 * t);
                } else {
                    // Beer-Lambert Law: I(z) = I0 * exp(-extinction * dz / TD)
                    const extinction = 3.4 / Math.max(0.25, blendStrength * 1.15);
                    physicalAlpha = 1.0 - Math.exp(-extinction * (thickness / tdMm));
                }
                const alpha = Math.max(0.12, Math.min(1.0, (1.0 - blendStrength) + blendStrength * physicalAlpha));
                accR = accR + (curr.rgb[0] - accR) * alpha;
                accG = accG + (curr.rgb[1] - accG) * alpha;
                accB = accB + (curr.rgb[2] - accB) * alpha;
            }
        }
    }
    return [Math.round(accR), Math.round(accG), Math.round(accB)];
}

// Edge-Preserving Bilateral Denoiser (smooths flat grain while keeping high-contrast edges 100% sharp)
function applyBilateralFilterRGB(data, width, height) {
    const src = new Uint8ClampedArray(data);
    const sigmaColorSq2 = 2.0 * 34.0 * 34.0;
    const spatialW = [
        0.075, 0.124, 0.075,
        0.124, 0.204, 0.124,
        0.075, 0.124, 0.075
    ];
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const cIdx = (y * width + x) * 4;
            const cr = src[cIdx], cg = src[cIdx + 1], cb = src[cIdx + 2];
            let sumR = 0, sumG = 0, sumB = 0, sumW = 0;
            let k = 0;
            for (let dy = -1; dy <= 1; dy++) {
                const ny = y + dy;
                for (let dx = -1; dx <= 1; dx++) {
                    const nIdx = (ny * width + (x + dx)) * 4;
                    const nr = src[nIdx], ng = src[nIdx + 1], nb = src[nIdx + 2];
                    const dr = nr - cr, dg = ng - cg, db = nb - cb;
                    const rangeDistSq = dr * dr + dg * dg + db * db;
                    const w = spatialW[k++] * Math.exp(-rangeDistSq / sigmaColorSq2);
                    sumR += nr * w;
                    sumG += ng * w;
                    sumB += nb * w;
                    sumW += w;
                }
            }
            if (sumW > 0) {
                data[cIdx] = Math.round(sumR / sumW);
                data[cIdx + 1] = Math.round(sumG / sumW);
                data[cIdx + 2] = Math.round(sumB / sumW);
            }
        }
    }
}

// Morphological Fine-Line Booster (reinforces sub-0.4mm whiskers, eyelashes, and thin strokes)
function applyFineLineBoosterRGB(data, width, height) {
    const src = new Uint8ClampedArray(data);
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const cIdx = (y * width + x) * 4;
            const cr = src[cIdx], cg = src[cIdx + 1], cb = src[cIdx + 2];
            const cLum = 0.2126 * cr + 0.7152 * cg + 0.0722 * cb;

            let maxDiff = 0;
            let bestR = cr, bestG = cg, bestB = cb;
            const neighbors = [
                ((y - 1) * width + x) * 4,
                ((y + 1) * width + x) * 4,
                (y * width + (x - 1)) * 4,
                (y * width + (x + 1)) * 4
            ];
            let sumNLum = 0;
            for (let n = 0; n < 4; n++) {
                const nIdx = neighbors[n];
                const nLum = 0.2126 * src[nIdx] + 0.7152 * src[nIdx + 1] + 0.0722 * src[nIdx + 2];
                sumNLum += nLum;
                const diff = nLum - cLum;
                if (diff > maxDiff) {
                    maxDiff = diff;
                    bestR = src[nIdx];
                    bestG = src[nIdx + 1];
                    bestB = src[nIdx + 2];
                }
            }
            // Reinforce bright thin ridge lines (whiskers/eyelashes/text) so they exceed 0.4mm nozzle threshold
            if (maxDiff > 36 && cLum < (sumNLum * 0.25)) {
                const boost = 0.34;
                data[cIdx] = Math.round(cr + (bestR - cr) * boost);
                data[cIdx + 1] = Math.round(cg + (bestG - cg) * boost);
                data[cIdx + 2] = Math.round(cb + (bestB - cb) * boost);
            }
        }
    }
}

// Anti-Noise Island / Despeckle Filter for Crisp Multi-Color Boundaries
function applyDespeckleFilterRGB(data, width, height, radius) {
    if (!radius || radius <= 0 || width < 3 || height < 3) return;
    const r = Math.min(3, Math.max(1, radius));
    const src = new Uint8ClampedArray(data);
    const distThreshold = 1800; // Color similarity threshold

    for (let y = r; y < height - r; y++) {
        for (let x = r; x < width - r; x++) {
            const cIdx = (y * width + x) * 4;
            const cr = src[cIdx], cg = src[cIdx + 1], cb = src[cIdx + 2];

            let similarCount = 0;
            let totalCount = 0;
            let sumR = 0, sumG = 0, sumB = 0;

            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const nIdx = ((y + dy) * width + (x + dx)) * 4;
                    const nr = src[nIdx], ng = src[nIdx + 1], nb = src[nIdx + 2];
                    const d = colorDistSq(cr, cg, cb, nr, ng, nb);
                    if (d < distThreshold) {
                        similarCount++;
                    }
                    sumR += nr;
                    sumG += ng;
                    sumB += nb;
                    totalCount++;
                }
            }

            // If center pixel has fewer than threshold similar neighbors in window, replace with neighborhood average
            const minAllowed = (r === 1) ? 2 : (r === 2 ? 5 : 9);
            if (similarCount < minAllowed && totalCount > 0) {
                data[cIdx] = Math.round(sumR / totalCount);
                data[cIdx + 1] = Math.round(sumG / totalCount);
                data[cIdx + 2] = Math.round(sumB / totalCount);
            }
        }
    }
}

// ==========================================
// 🖼️ PROCESS SOURCE IMAGE (2X SUPER-SAMPLED + TRUE RGB!)
// ==========================================
function processSourceImage(options = {}) {
    if (!sourceImage) return;

    const preserveUserEdits = !options.resetUserLayers &&
        lastProcessedMeta &&
        lastProcessedMeta.sourceRef === sourceImage &&
        lastProcessedMeta.rotation === config.rotation &&
        lastProcessedMeta.flipX === config.flipX &&
        lastProcessedMeta.flipY === config.flipY &&
        userEditMaskBuffer &&
        colorDataBuffer;

    const savedUserLayer = preserveUserEdits ? {
        cols: lastProcessedMeta.cols,
        rows: lastProcessedMeta.rows,
        color: new Uint8ClampedArray(colorDataBuffer),
        slots: filamentSlotBuffer ? new Uint8Array(filamentSlotBuffer) : null,
        zDelta: customZDeltaBuffer ? new Float32Array(customZDeltaBuffer) : null,
        cutout: cutoutMaskBuffer ? new Uint8Array(cutoutMaskBuffer) : null,
        userMask: new Uint8Array(userEditMaskBuffer)
    } : null;

    const maxEngineRes = config.engineResolution || 360;
    const targetCols = Math.min(maxEngineRes, Math.max(160, maxEngineRes));
    const isRotated90 = (config.rotation === 90 || config.rotation === 270);
    const srcW = sourceImage.naturalWidth || sourceImage.width;
    const srcH = sourceImage.naturalHeight || sourceImage.height;
    const effectiveW = isRotated90 ? srcH : srcW;
    const effectiveH = isRotated90 ? srcW : srcH;
    const aspect = effectiveH / effectiveW;
    const targetRows = Math.min(maxEngineRes, Math.max(80, Math.round(targetCols * aspect)));

    // 2x Super-Sampled Anti-Aliased Intermediate Canvas
    const superCvs = document.createElement('canvas');
    superCvs.width = targetCols * 2;
    superCvs.height = targetRows * 2;
    const sCtx = superCvs.getContext('2d');
    sCtx.imageSmoothingEnabled = true;
    sCtx.imageSmoothingQuality = 'high';
    sCtx.save();
    sCtx.translate(superCvs.width / 2, superCvs.height / 2);
    if (config.rotation) sCtx.rotate((config.rotation * Math.PI) / 180);
    const sx = config.flipX ? -1 : 1;
    const sy = config.flipY ? -1 : 1;
    sCtx.scale(sx, sy);

    const drawW2 = isRotated90 ? superCvs.height : superCvs.width;
    const drawH2 = isRotated90 ? superCvs.width : superCvs.height;
    sCtx.drawImage(sourceImage, -drawW2 / 2, -drawH2 / 2, drawW2, drawH2);
    sCtx.restore();

    processedCanvas.width = targetCols;
    processedCanvas.height = targetRows;
    const ctx = processedCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, targetCols, targetRows);
    ctx.drawImage(superCvs, 0, 0, superCvs.width, superCvs.height, 0, 0, targetCols, targetRows);

    // Optional Gaussian pre-blur if user raised smoothing above 1
    if (config.smoothing > 1 && ctx.filter !== undefined) {
        ctx.filter = `blur(${(config.smoothing - 1) * 0.38}px)`;
        ctx.drawImage(processedCanvas, 0, 0);
        ctx.filter = 'none';
    }

    // Read True Full Color Image Data (NOT GRAYSCALE!)
    const imgData = ctx.getImageData(0, 0, targetCols, targetRows);
    const data = imgData.data;

    // Edge-Preserving Bilateral Denoiser (smooths flat noise while locking crisp edges)
    if (config.bilateralEdgeLock && config.smoothing > 0) {
        applyBilateralFilterRGB(data, targetCols, targetRows);
    }

    const bFactor = config.brightness * 1.5;
    const cFactor = (259 * (config.contrast + 255)) / (255 * (259 - config.contrast));

    colorDataBuffer = new Uint8ClampedArray(data.length);
    filamentSlotBuffer = new Uint8Array(targetCols * targetRows);
    filamentSlotBuffer.fill(255);
    customZDeltaBuffer = new Float32Array(targetCols * targetRows);
    cutoutMaskBuffer = new Uint8Array(targetCols * targetRows);
    userEditMaskBuffer = new Uint8Array(targetCols * targetRows);
    if (!savedUserLayer) {
        preLiveToolBackup = null;
        editorTextState.hasLivePreview = false;
        editorStampState.hasLivePreview = false;
    }

    // Subject / Foliage separation factor
    const popFactor = config.subjectPop / 100.0;
    const minNorm = (config.shadowLift || 0) / 100.0 * 0.40;
    const maxNorm = (config.highlightCeiling !== undefined ? config.highlightCeiling : 100) / 100.0;
    const gammaVal = config.gamma || 1.0;
    const vibranceVal = (config.vibrance || 0) / 100.0;

    for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Subject Pop: Boost warm tones (orange/fur), damp/cool greens (foliage)
        if (popFactor !== 0) {
            const isWarm = (r > g && r > b);
            const isFoliage = (g > r && g > b);
            if (isWarm) {
                r = Math.min(255, r * (1 + popFactor * 0.4));
                b = Math.max(0, b * (1 - popFactor * 0.3));
            } else if (isFoliage) {
                g = Math.min(255, g * (1 + Math.abs(popFactor) * 0.25));
                r = Math.max(0, r * (1 - Math.abs(popFactor) * 0.2));
            }
        }

        // Brightness & Contrast on RGB channels
        r = cFactor * (r - 128) + 128 + bFactor;
        g = cFactor * (g - 128) + 128 + bFactor;
        b = cFactor * (b - 128) + 128 + bFactor;

        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));

        // ☀️ Midtone Gamma & Dynamic Range S-Curve (Shadow Lift + Highlight Cap)
        if (gammaVal !== 1.0 || minNorm > 0 || maxNorm < 1.0) {
            let nr = r / 255.0, ng = g / 255.0, nb = b / 255.0;
            if (gammaVal !== 1.0) {
                const invG = 1.0 / gammaVal;
                nr = Math.pow(Math.max(0, nr), invG);
                ng = Math.pow(Math.max(0, ng), invG);
                nb = Math.pow(Math.max(0, nb), invG);
            }
            if (minNorm > 0 || maxNorm < 1.0) {
                nr = minNorm + nr * (maxNorm - minNorm);
                ng = minNorm + ng * (maxNorm - minNorm);
                nb = minNorm + nb * (maxNorm - minNorm);
            }
            r = Math.max(0, Math.min(255, nr * 255.0));
            g = Math.max(0, Math.min(255, ng * 255.0));
            b = Math.max(0, Math.min(255, nb * 255.0));
        }

        // 🌈 Color Vibrance: Boost low-saturation tones without oversaturating skin tones
        if (vibranceVal !== 0) {
            const maxC = Math.max(r, g, b);
            const minC = Math.min(r, g, b);
            const sat = (maxC === 0) ? 0 : (maxC - minC) / maxC;
            const avg = (r + g + b) / 3.0;
            const factor = vibranceVal * (1.0 - sat) * 1.5;
            r = Math.max(0, Math.min(255, r + (r - avg) * factor));
            g = Math.max(0, Math.min(255, g + (g - avg) * factor));
            b = Math.max(0, Math.min(255, b + (b - avg) * factor));
        }

        if (config.invert) {
            r = 255 - r;
            g = 255 - g;
            b = 255 - b;
        }

        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
    }

    // Morphological Fine-Line Booster (<0.4mm whiskers, eyelashes, text)
    if (config.boostFineLines) {
        applyFineLineBoosterRGB(data, targetCols, targetRows);
    }

    // Despeckle / Noise Island Filter
    if (config.despeckleRadius && config.despeckleRadius > 0) {
        applyDespeckleFilterRGB(data, targetCols, targetRows, config.despeckleRadius);
    }

    colorDataBuffer.set(data);
    if (savedUserLayer) {
        const oldCols = Math.max(1, savedUserLayer.cols);
        const oldRows = Math.max(1, savedUserLayer.rows);
        const sameDims = (oldCols === targetCols && oldRows === targetRows);
        for (let r = 0; r < targetRows; r++) {
            const srcR = sameDims ? r : Math.round((r / Math.max(1, targetRows - 1)) * (oldRows - 1));
            for (let c = 0; c < targetCols; c++) {
                const srcC = sameDims ? c : Math.round((c / Math.max(1, targetCols - 1)) * (oldCols - 1));
                const oldP = srcR * oldCols + srcC;
                if (savedUserLayer.userMask[oldP] === 1) {
                    const newP = r * targetCols + c;
                    const n4 = newP * 4, o4 = oldP * 4;
                    colorDataBuffer[n4] = savedUserLayer.color[o4];
                    colorDataBuffer[n4 + 1] = savedUserLayer.color[o4 + 1];
                    colorDataBuffer[n4 + 2] = savedUserLayer.color[o4 + 2];
                    colorDataBuffer[n4 + 3] = savedUserLayer.color[o4 + 3];
                    if (savedUserLayer.slots) filamentSlotBuffer[newP] = savedUserLayer.slots[oldP];
                    if (savedUserLayer.zDelta) customZDeltaBuffer[newP] = savedUserLayer.zDelta[oldP];
                    if (savedUserLayer.cutout) cutoutMaskBuffer[newP] = savedUserLayer.cutout[oldP];
                    userEditMaskBuffer[newP] = 1;
                }
            }
        }
        const outImg = ctx.createImageData(targetCols, targetRows);
        outImg.data.set(colorDataBuffer);
        ctx.putImageData(outImg, 0, 0);
    } else {
        ctx.putImageData(imgData, 0, 0);
    }

    lastProcessedMeta = {
        sourceRef: sourceImage,
        rotation: config.rotation,
        flipX: config.flipX,
        flipY: config.flipY,
        cols: targetCols,
        rows: targetRows
    };

    if (activeSoundwave && typeof applyActiveSoundwaveToBuffers === 'function') {
        preSoundwaveBackup = {
            width: targetCols,
            height: targetRows,
            color: new Uint8ClampedArray(colorDataBuffer),
            slots: new Uint8Array(filamentSlotBuffer)
        };
        applyActiveSoundwaveToBuffers();
    }
    if (activeQRStamp && typeof applyActiveQRStampToBuffers === 'function') {
        preQRBackup = {
            width: targetCols,
            height: targetRows,
            color: new Uint8ClampedArray(colorDataBuffer),
            slots: new Uint8Array(filamentSlotBuffer)
        };
        applyActiveQRStampToBuffers();
    }
    if (isSplitCompareMode) {
        renderSplitCompareSource();
    }
    requestMeshUpdate();
}

// ==========================================
// 🏛️ 3D TOPOGRAPHY, MEDALLION SHAPE & DIE-CUT MODEL-ONLY HELPERS
// ==========================================
function isOutsideOutlineShape(nx, ny, shape) {
    if (!shape || shape === 'rect') return false;
    if (shape === 'circle') return (nx * nx + ny * ny) > 0.95;
    if (shape === 'oval') return ((nx * nx) / 0.70 + (ny * ny) / 0.95) > 1.0;
    if (shape === 'hexagon') {
        const ax = Math.abs(nx), ay = Math.abs(ny);
        return Math.max(ax, ax * 0.5 + ay * 0.866025) > 0.92;
    }
    if (shape === 'heart') {
        const hx = nx * 1.15;
        const hy = -ny * 1.15 + 0.16;
        const a = hx * hx + hy * hy - 0.86;
        return (a * a * a - hx * hx * hy * hy * hy) > 0.0;
    }
    if (shape === 'shield') {
        if (ny < -0.88 || ny > 0.92) return true;
        if (ny <= 0.05) return Math.abs(nx) > 0.84;
        const t = Math.max(0, (0.92 - ny) / 0.87);
        return Math.abs(nx) > 0.84 * Math.pow(t, 0.65);
    }
    if (shape === 'star') {
        const theta = Math.atan2(ny, nx);
        const r = Math.hypot(nx, ny);
        const maxR = 0.64 + 0.30 * Math.cos(theta * 8.0);
        return r > maxR;
    }
    if (shape === 'arch') {
        if (ny < -0.92 || ny > 0.92) return true;
        if (ny >= 0.0) return Math.abs(nx) > 0.84;
        const t = Math.max(0, (0.92 + ny) / 0.92);
        return Math.abs(nx) > 0.84 * Math.pow(t, 0.58);
    }
    return false;
}

// Determines if a canvas pixel (colIdx, rowIdx) is an open-air physical cutout / removed canvas void
function isPixelCutoutVoid(colIdx, rowIdx, cols, rows, cachedBgRgb) {
    if (!cols || !rows) return false;
    const c = Math.max(0, Math.min(cols - 1, colIdx));
    const r = Math.max(0, Math.min(rows - 1, rowIdx));
    const pIdx = r * cols + c;

    // 1. Explicit drilled through-hole from Cutout Drill tool or template hole
    if (cutoutMaskBuffer && cutoutMaskBuffer.length === cols * rows && cutoutMaskBuffer[pIdx] === 1) {
        return true;
    }

    // 2. Geometric Medallion / Plaque Shape Cutout (Circle, Oval, Hexagon, Heart, Shield, Star, Gothic Arch)
    const nx = (c / Math.max(1, cols - 1)) * 2.0 - 1.0;
    const ny = (r / Math.max(1, rows - 1)) * 2.0 - 1.0;
    if (isOutsideOutlineShape(nx, ny, config.outlineShape)) {
        return true;
    }

    // 3. Remove Base Canvas (Model-Only Die-Cut Silhouette Mode)
    if (config.removeCanvasBg) {
        if (filamentSlotBuffer && filamentSlotBuffer.length === cols * rows && filamentSlotBuffer[pIdx] !== 255) {
            return filamentSlotBuffer[pIdx] === 0;
        }
        if (colorDataBuffer && colorDataBuffer.length >= (pIdx + 1) * 4) {
            const idx4 = pIdx * 4;
            const pr = colorDataBuffer[idx4];
            const pg = colorDataBuffer[idx4 + 1];
            const pb = colorDataBuffer[idx4 + 2];
            const fil0Rgb = hexToRgb((filaments[0] || { color: '#09090b' }).color);
            if (colorDistSq(pr, pg, pb, fil0Rgb[0], fil0Rgb[1], fil0Rgb[2]) < 1400) {
                return true;
            }
            if (cachedBgRgb && colorDistSq(pr, pg, pb, cachedBgRgb[0], cachedBgRgb[1], cachedBgRgb[2]) < 1600) {
                return true;
            }
        }
    }
    return false;
}

function syncRemoveCanvasUI() {
    const active = !!config.removeCanvasBg;
    ['btn-sec1-remove-canvas', 'btn-top-remove-canvas', 'btn-toolbar-remove-canvas', 'btn-subbar-remove-canvas', 'btn-hud-remove-canvas'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('active', active);
    });
    const chk6 = document.getElementById('chk-remove-canvas-sec6');
    if (chk6) chk6.checked = active;
}

function toggleRemoveCanvasBg(forceVal) {
    if (colorDataBuffer) pushHistoryState();
    if (typeof forceVal === 'boolean') {
        config.removeCanvasBg = forceVal;
    } else {
        config.removeCanvasBg = !config.removeCanvasBg;
    }
    syncRemoveCanvasUI();
    if (centerViewMode === '2d') {
        render2DEditorPreview();
    }
    generate3DReliefMesh();
    showToast(config.removeCanvasBg ? translations[currentLang].toastCanvasRemovedOn : translations[currentLang].toastCanvasRemovedOff);
}

function applyTopographyVertex(x, y, z, w, topography) {
    if (!topography || topography === 'flat') return [x, y, z];
    let totalAngle = Math.PI / 3; // 60 deg self-standing arc
    if (topography === 'half_cyl') totalAngle = Math.PI; // 180 deg lamp
    else if (topography === 'cylinder') totalAngle = Math.PI * 2.0; // 360 deg lamp shade

    const R = w / totalAngle;
    const theta = (x / w) * totalAngle;
    const rad = R + z;
    const cx = rad * Math.sin(theta);
    const cy = y;
    let zOffset = 0;
    if (topography === 'arc') {
        zOffset = R * (1.0 + Math.cos(totalAngle * 0.5)) * 0.5;
    } else if (topography === 'half_cyl') {
        zOffset = R * 0.5;
    }
    const cz = rad * Math.cos(theta) - zOffset;
    return [cx, cy, cz];
}

function computeBorderBackgroundRGB(dataBuf, cols, rows) {
    if (!dataBuf || !cols || !rows) return [15, 23, 42];
    let sumR = 0, sumG = 0, sumB = 0, count = 0;
    const borderC = Math.max(2, Math.floor(cols * 0.06));
    const borderR = Math.max(2, Math.floor(rows * 0.06));
    for (let r = 0; r < rows; r += 2) {
        for (let c = 0; c < cols; c += 2) {
            if (r < borderR || r >= rows - borderR || c < borderC || c >= cols - borderC) {
                const idx = (r * cols + c) * 4;
                sumR += dataBuf[idx];
                sumG += dataBuf[idx + 1];
                sumB += dataBuf[idx + 2];
                count++;
            }
        }
    }
    if (count === 0) return [15, 23, 42];
    return [Math.round(sumR / count), Math.round(sumG / count), Math.round(sumB / count)];
}

// Computes smooth 2.5D Sculptural Bas-Relief volume cushion while preserving fine surface details
function computeSculpturalBasReliefZ(lum, nx, ny, r, g, b, bgR, bgG, bgB, baseZ, maxReliefZ) {
    const sliderBoost = (config.sculpturalDome || 0) / 100.0;
    const cameoBoost = (config.bgMode === 'cameo_dome') ? 0.35 : 0.0;
    const totalBoost = Math.min(1.0, sliderBoost * 0.65 + cameoBoost);
    if (totalBoost <= 0.001) {
        return baseZ + lum * (maxReliefZ - baseZ);
    }
    const rEllip = Math.min(1.0, nx * nx * 1.05 + ny * ny * 0.85);
    const t = Math.max(0.0, 1.0 - rEllip);
    // Smooth Hermite S-curve cushion (0 slope at center and border)
    const hermiteDome = t * t * (3.0 - 2.0 * t);
    // Subject foreground weight based on color separation from border background
    const distBg = Math.min(1.0, Math.sqrt(colorDistSq(r, g, b, bgR, bgG, bgB)) / 175.0);
    const subjectCushion = hermiteDome * (0.50 + 0.50 * distBg);
    // Blend sculptural cushion with high-frequency luminance detail so eyes/fur never clip flat
    const effectiveLum = Math.min(1.0, lum * (1.0 - totalBoost * 0.32) + subjectCushion * totalBoost * 0.58);
    return baseZ + effectiveLum * (maxReliefZ - baseZ);
}

function sampleActiveSoundwave(u, v) {
    if (!activeSoundwave || !activeSoundwave.bars || activeSoundwave.bars.length === 0) return null;
    const { u0, v0, u1, v1, bars, style } = activeSoundwave;
    if (u < u0 || u > u1 || v < v0 || v > v1) return null;

    const relU = (u - u0) / Math.max(1e-6, u1 - u0);
    const relV = (v - v0) / Math.max(1e-6, v1 - v0);

    // Rounded capsule pill check
    const padX = 0.04;
    const padY = 0.12;
    if (relU < padX || relU > 1.0 - padX) {
        const dx = (relU < padX ? (padX - relU) : (relU - (1.0 - padX))) / padX;
        const dy = (relV - 0.5) * 2.0;
        if (dx * dx + dy * dy > 1.0) return null;
    }

    const innerU = (relU - padX) / (1.0 - 2.0 * padX);
    if (innerU < 0.0 || innerU > 1.0) return 0; // Inside capsule margin (dark pill background)

    const numBars = bars.length;
    const exactPos = innerU * numBars;
    const barIdx = Math.min(numBars - 1, Math.floor(exactPos));
    const fracInBar = exactPos - barIdx;

    if (style === 'heartbeat') {
        // Continuous ECG trace line
        const nextIdx = Math.min(numBars - 1, barIdx + 1);
        const val0 = bars[barIdx];
        const val1 = bars[nextIdx];
        const interpVal = val0 + (val1 - val0) * fracInBar;
        const targetV = 0.5 - (interpVal - 0.5) * 0.76;
        return Math.abs(relV - targetV) <= 0.095 ? 1 : 0;
    } else {
        // Symmetrical vertical soundwave bars with clean gap between bars
        if (fracInBar < 0.16 || fracInBar > 0.84) return 0;
        const amp = Math.max(0.08, Math.min(0.95, bars[barIdx])) * (0.5 - padY);
        const distFromMid = Math.abs(relV - 0.5);
        return distFromMid <= amp ? 1 : 0;
    }
}

function updateBgSculptMode() {
    const sel = document.getElementById('select-bg-mode');
    if (sel) config.bgMode = sel.value;
    if (config.bgMode === 'cameo_dome' && config.sculpturalDome === 0) {
        config.sculpturalDome = 45;
        const domeEl = document.getElementById('slider-sculpt-dome');
        if (domeEl) domeEl.value = 45;
        const valDome = document.getElementById('val-sculpt-dome');
        if (valDome) valDome.innerText = '45%';
    }
    generate3DReliefMesh();
}

function updateTopographyOptions() {
    const topoSel = document.getElementById('select-topography');
    const shapeSel = document.getElementById('select-outline-shape');
    const prevTopo = config.topography;
    if (topoSel) config.topography = topoSel.value;
    if (shapeSel) config.outlineShape = shapeSel.value;
    if (prevTopo !== config.topography) {
        resetCamera('iso');
    }
    generate3DReliefMesh();
    showToast(translations[currentLang].toastTopographyUpdated);
}


// ==========================================
// 🎨 PROCEDURAL HIGH-CONTRAST SAMPLE GRAPHICS (NOW INCLUDES DUAL TIGERS!)
// ==========================================
function drawSampleGraphic(cvs, type) {
    const ctx = cvs.getContext('2d');
    const w = cvs.width;
    const h = cvs.height;
    ctx.clearRect(0, 0, w, h);

    if (type === 'tiger') {
        // Background: Lush Jungle Greenery
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#022c22');
        bgGrad.addColorStop(0.5, '#15803d');
        bgGrad.addColorStop(1, '#475569');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Leaves in background
        ctx.fillStyle = '#166534';
        for (let i = 0; i < 15; i++) {
            ctx.beginPath();
            ctx.arc((i * 23) % w, ((i * 37) % (h * 0.5)), 12, 0, Math.PI * 2);
            ctx.fill();
        }

        // Two Tigers Sitting (Adult + Cub)
        function drawTigerFigure(cx, cy, scale) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(scale, scale);

            // Body: Vibrant Tawny Orange
            ctx.fillStyle = '#ea580c';
            ctx.beginPath();
            ctx.ellipse(0, 15, 20, 35, 0, 0, Math.PI * 2);
            ctx.fill();

            // White Chest / Belly
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            ctx.ellipse(0, 18, 9, 22, 0, 0, Math.PI * 2);
            ctx.fill();

            // Head: Tawny Orange
            ctx.fillStyle = '#ea580c';
            ctx.beginPath();
            ctx.arc(0, -22, 18, 0, Math.PI * 2);
            ctx.fill();

            // Ears
            ctx.beginPath();
            ctx.arc(-14, -34, 6, 0, Math.PI * 2);
            ctx.arc(14, -34, 6, 0, Math.PI * 2);
            ctx.fill();

            // White Muzzle / Cheeks
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            ctx.ellipse(0, -14, 11, 7, 0, 0, Math.PI * 2);
            ctx.fill();

            // Distinct Tiger Stripes (Jet Black)
            ctx.fillStyle = '#09090b';
            // Forehead stripes
            ctx.fillRect(-2, -32, 4, 8);
            ctx.fillRect(-8, -26, 3, 6);
            ctx.fillRect(5, -26, 3, 6);
            // Body stripes
            for (let s = -5; s <= 35; s += 9) {
                ctx.beginPath();
                ctx.moveTo(-18, s); ctx.lineTo(-7, s + 3); ctx.lineTo(-18, s + 5); ctx.fill();
                ctx.beginPath();
                ctx.moveTo(18, s); ctx.lineTo(7, s + 3); ctx.lineTo(18, s + 5); ctx.fill();
            }

            // Nose
            ctx.fillStyle = '#f43f5e';
            ctx.beginPath();
            ctx.moveTo(-3, -15); ctx.lineTo(3, -15); ctx.lineTo(0, -11); ctx.fill();

            // Eyes: Glowing Amber Gold! (As requested by user!)
            ctx.fillStyle = '#eab308';
            ctx.beginPath(); ctx.arc(-6, -21, 3.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(6, -21, 3.5, 0, Math.PI * 2); ctx.fill();

            // Pupils: Black slit
            ctx.fillStyle = '#09090b';
            ctx.fillRect(-7, -23, 2, 4);
            ctx.fillRect(5, -23, 2, 4);

            ctx.restore();
        }

        // Draw Adult Tiger (Center-Left) & Cub (Right)
        drawTigerFigure(w * 0.42, h * 0.48, 1.15);
        drawTigerFigure(w * 0.72, h * 0.56, 0.85);

    } else if (type === 'cyberpunk') {
        const grad = ctx.createRadialGradient(w/2, h/2, w*0.05, w/2, h/2, w*0.5);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.35, '#a855f7');
        grad.addColorStop(0.7, '#0284c7');
        grad.addColorStop(1, '#050505');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(w/2, h*0.46, w*0.22, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#050505';
        ctx.fillRect(w*0.36, h*0.42, w*0.28, h*0.07);
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(w*0.38, h*0.44, w*0.24, h*0.035);
    } else if (type === 'cat') {
        ctx.fillStyle = '#080808';
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(w/2, h*0.56, w*0.25, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(w*0.30, h*0.46); ctx.lineTo(w*0.40, h*0.23); ctx.lineTo(w*0.48, h*0.40); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(w*0.70, h*0.46); ctx.lineTo(w*0.60, h*0.23); ctx.lineTo(w*0.52, h*0.40); ctx.fill();

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath(); ctx.arc(w*0.40, h*0.53, w*0.05, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(w*0.60, h*0.53, w*0.05, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#050505';
        ctx.beginPath(); ctx.ellipse(w*0.40, h*0.53, w*0.015, w*0.045, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(w*0.60, h*0.53, w*0.015, w*0.045, 0, 0, Math.PI*2); ctx.fill();
    } else if (type === 'mountain') {
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h*0.66);
        skyGrad.addColorStop(0, '#ffffff');
        skyGrad.addColorStop(0.5, '#38bdf8');
        skyGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(0, h); ctx.lineTo(w*0.2, h*0.5); ctx.lineTo(w*0.5, h*0.26); ctx.lineTo(w*0.8, h*0.53); ctx.lineTo(w, h);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(w*0.5, h*0.26); ctx.lineTo(w*0.42, h*0.4); ctx.lineTo(w*0.5, h*0.36); ctx.lineTo(w*0.58, h*0.4);
        ctx.fill();
    } else {
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, w, h);

        const grad = ctx.createRadialGradient(w/2, h*0.43, w*0.03, w/2, h*0.43, w*0.33);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.5, '#ca8a04');
        grad.addColorStop(1, '#1f2937');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(w/2, h*0.43, w*0.17, h*0.22, 0, 0, Math.PI*2);
        ctx.fill();

        ctx.fillStyle = '#050505';
        ctx.fillRect(w*0.30, h*0.60, w*0.40, h*0.40);
    }
}

function generateSampleCanvas(type) {
    const cvs = document.createElement('canvas');
    cvs.width = 340;
    cvs.height = 340;
    drawSampleGraphic(cvs, type);
    return cvs;
}

function loadSample(type) {
    sourceImage = generateSampleCanvas(type);
    isDrawingTemplateActive = false;
    isCanvasUserEdited = false;
    userEditMaskBuffer = null;
    lastProcessedMeta = null;
    resetEditHistory();
    config.removeCanvasBg = false;
    syncRemoveCanvasUI();
    activeQRStamp = null;
    preQRBackup = null;
    activeSoundwave = null;
    preSoundwaveBackup = null;
    editorSymmetryMode = 'none';
    const symSelReset = document.getElementById('select-editor-symmetry');
    if (symSelReset) symSelReset.value = 'none';
    const btnClearWave = document.getElementById('btn-clear-wave');
    if (btnClearWave) btnClearWave.style.display = 'none';
    config.rotation = 0;
    config.flipX = false;
    config.flipY = false;

    // Load tailored palette if tiger selected
    if (type === 'tiger') {
        config.colorMode = 'chromatic';
        const sel = document.getElementById('select-color-mode');
        if (sel) sel.value = 'chromatic';
        filaments = [
            { id: 1, name: "Obsidian Black (Stripes/Pupils)", color: "#09090b", startPct: 0.0, td: 0.5, targetFeature: "Stripes, Pupils & Deep Shadows" },
            { id: 2, name: "Jungle Green (Leaves/Background)", color: "#15803d", startPct: 0.25, td: 2.8, targetFeature: "Foliage, Leaves & Background" },
            { id: 3, name: "Tiger Tawny Orange (Body Fur)", color: "#ea580c", startPct: 0.50, td: 3.5, targetFeature: "Tiger Body, Fur & Face" },
            { id: 4, name: "Amber Gold (Eyes/Highlights)", color: "#eab308", startPct: 0.72, td: 4.5, targetFeature: "Tiger Eyes & Warm Highlights" },
            { id: 5, name: "Pearl White (Chest/Whiskers)", color: "#f8fafc", startPct: 0.88, td: 6.0, targetFeature: "White Chest, Muzzle & Whiskers" }
        ];
    }

    processSourceImage();
    generateAIPalettesFromImage();
    renderFilamentStackUI();
    showToast(translations[currentLang].toastImageLoaded);
}

