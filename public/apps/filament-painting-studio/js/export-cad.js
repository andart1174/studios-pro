// ==========================================
// 📦 EXPORT ENGINE: 3MF, STL & SPLIT LAYERS
// ==========================================
function openExportModal() {
    closeAllModals();
    document.getElementById('export-modal').style.display = 'flex';
}

function closeAllModals() {
    ['export-modal', 'slicer-modal', 'share-modal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

function setExportQuality(q) {
    config.exportQuality = q;
    ['standard', 'hd', 'ultra'].forEach(k => {
        const el = document.getElementById(`q-pill-${k}`);
        if (el) el.classList.toggle('active', k === q);
    });
}

async function executeExport(format) {
    const pBox = document.getElementById('export-progress-box');
    const pBar = document.getElementById('export-progress-bar');
    const pText = document.getElementById('export-status-text');

    config.exportQuantize = document.getElementById('chk-export-quantize').checked;
    config.exportIncludeFrame = document.getElementById('chk-export-frame').checked;
    const chkAdaptive = document.getElementById('chk-export-adaptive');
    config.adaptiveMesh = chkAdaptive ? chkAdaptive.checked : true;

    pBox.style.display = 'block';
    pBar.style.width = '25%';
    pText.innerText = currentLang === 'fr' ? "Échantillonnage Chromatique Haute-Définition..." : "High-Definition Chromatic Resampling...";
    await new Promise(r => setTimeout(r, 60));

    const options = {
        quality: config.exportQuality,
        quantize: config.exportQuantize,
        includeFrame: config.exportIncludeFrame,
        adaptiveMesh: config.adaptiveMesh
    };

    if (format === 'stl') {
        pBar.style.width = '65%';
        pText.innerText = currentLang === 'fr' ? "Génération du STL binaire étanche (Worker)..." : "Building watertight binary STL (Worker)...";
        await new Promise(r => setTimeout(r, 40));

        const blob = await generateBinarySTLAsync(options);
        downloadFileDirect(blob, `StudiosPro_Filament_Painting_${Date.now()}.stl`);
    } else if (format === '3mf') {
        pBar.style.width = '60%';
        pText.innerText = currentLang === 'fr' ? "Configuration des slots AMS & vignette 3MF..." : "Configuring Bambu AMS slots & 3MF thumbnail...";
        await new Promise(r => setTimeout(r, 80));

        const blob = await generate3MFPackage(options);
        downloadFileDirect(blob, `StudiosPro_Filament_Painting_${Date.now()}.3mf`);
    } else if (format === 'stl_split') {
        pBar.style.width = '60%';
        pText.innerText = currentLang === 'fr' ? "Découpe des couches individuelles..." : "Slicing layer-by-layer STLs...";
        await new Promise(r => setTimeout(r, 80));

        const blob = await generateSplitLayerSTLsZip(options);
        downloadFileDirect(blob, `StudiosPro_Split_Layers_${Date.now()}.zip`);
    } else if (format === 'mural_zip') {
        const gridN = parseInt(document.getElementById('select-mural-grid')?.value) || 2;
        pBar.style.width = '55%';
        pText.innerText = currentLang === 'fr' ? `Découpe du Poster Mural ${gridN}×${gridN} (${gridN*gridN} tuiles .3MF multi-couleurs)...` : `Building ${gridN}×${gridN} Multi-Color .3MF Wall Mural (${gridN*gridN} tiles)...`;
        await new Promise(r => setTimeout(r, 80));

        const blob = await generateWallMuralZip({ ...options, gridN });
        downloadFileDirect(blob, `StudiosPro_Wall_Mural_${gridN}x${gridN}_3MF_${Date.now()}.zip`);
    }

    pBar.style.width = '100%';
    pText.innerText = currentLang === 'fr' ? "Exportation terminée !" : "Export Complete!";
    await new Promise(r => setTimeout(r, 350));

    closeAllModals();
    pBox.style.display = 'none';
    showToast(format === 'mural_zip' ? translations[currentLang].toastMuralExported : translations[currentLang].toastExportSuccess);
}

// ==========================================
// 🧱 ULTRA-HD WATERTIGHT SOLID GENERATOR (WITH TRUE COLOR MATCHING!)
// ==========================================
function buildWatertightReliefData(options = {}) {
    if (!sourceImage && (!processedCanvas.width || !processedCanvas.height)) return null;

    let targetCols = Math.max(220, config.engineResolution || 360);
    if (options.quality === 'hd') targetCols = Math.max(360, targetCols);
    if (options.quality === 'ultra') targetCols = Math.max(480, targetCols);
    if (options.tileCrop) {
        targetCols = options.quality === 'ultra' ? 260 : (options.quality === 'hd' ? 220 : 180);
    }

    if (activeQRStamp && !options.tileCrop) {
        targetCols = Math.max(targetCols, 280);
    }

    const isRotated90 = (config.rotation === 90 || config.rotation === 270);
    const srcW = sourceImage ? (sourceImage.naturalWidth || sourceImage.width) : processedCanvas.width;
    const srcH = sourceImage ? (sourceImage.naturalHeight || sourceImage.height) : processedCanvas.height;
    const effectiveW = isRotated90 ? srcH : srcW;
    const effectiveH = isRotated90 ? srcW : srcH;
    const aspect = effectiveH / effectiveW;
    const targetRows = Math.round(targetCols * aspect);

    const expCanvas = document.createElement('canvas');
    expCanvas.width = targetCols;
    expCanvas.height = targetRows;
    const ctx = expCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (processedCanvas && processedCanvas.width > 0) {
        if (options.tileCrop) {
            const { rowTile, colTile, gridN } = options.tileCrop;
            const sw = processedCanvas.width / gridN;
            const sh = processedCanvas.height / gridN;
            ctx.drawImage(processedCanvas, colTile * sw, rowTile * sh, sw, sh, 0, 0, targetCols, targetRows);
        } else {
            ctx.drawImage(processedCanvas, 0, 0, targetCols, targetRows);
        }
    } else if (sourceImage) {
        ctx.save();
        ctx.translate(targetCols / 2, targetRows / 2);
        if (config.rotation) ctx.rotate((config.rotation * Math.PI) / 180);
        const sx = config.flipX ? -1 : 1;
        const sy = config.flipY ? -1 : 1;
        ctx.scale(sx, sy);
        const drawW = isRotated90 ? targetRows : targetCols;
        const drawH = isRotated90 ? targetCols : targetRows;
        ctx.drawImage(sourceImage, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
    }

    if (config.smoothing > 0 && ctx.filter !== undefined && !options.tileCrop) {
        ctx.filter = `blur(${config.smoothing * 0.4}px)`;
        ctx.drawImage(expCanvas, 0, 0);
        ctx.filter = 'none';
    }

    const imgData = ctx.getImageData(0, 0, targetCols, targetRows);
    const data = imgData.data;

    const cols = targetCols;
    const rows = targetRows;
    const gridDiv = options.tileCrop ? options.tileCrop.gridN : 1;
    const w = config.width / gridDiv;
    const h = config.height / gridDiv;
    const baseZ = config.baseThickness;
    const maxReliefZ = config.maxRelief;
    const layerH = config.layerHeight;
    const N = cols * rows;

    const positions = new Float32Array(N * 2 * 3);
    const reliefHeights = new Float32Array(N);

    const parsedFilaments = filaments.map((f, idx) => {
        return {
            idx: idx,
            color: f.color,
            rgb: hexToRgb(f.color),
            startPct: f.startPct,
            td: f.td || 3.0,
            startZ: baseZ + f.startPct * (maxReliefZ - baseZ)
        };
    });

    const ditherPct = config.opticalDithering !== undefined ? config.opticalDithering : 20;

    const [bgR, bgG, bgB] = (config.bgMode === 'flatten_bg' || (config.sculpturalDome && config.sculpturalDome > 0))
        ? computeBorderBackgroundRGB(colorDataBuffer || data, (colorDataBuffer && processedCanvas.width) ? processedCanvas.width : cols, (colorDataBuffer && processedCanvas.height) ? processedCanvas.height : rows)
        : [0, 0, 0];

    // Color matching function for TRUE CHROMATIC ASSIGNMENT (supports both full plaque and multi-tile crops)
    function getBestFilamentIndex(r, g, b, zVal, vertIdx) {
        let vc = 0, vr = 0;
        if (vertIdx !== undefined) {
            vc = vertIdx % cols;
            vr = Math.floor(vertIdx / cols);
            const gNormX = options.tileCrop
                ? (options.tileCrop.colTile + (vc / Math.max(1, cols - 1))) / options.tileCrop.gridN
                : (vc / Math.max(1, cols - 1));
            const gNormY = options.tileCrop
                ? (options.tileCrop.rowTile + (vr / Math.max(1, rows - 1))) / options.tileCrop.gridN
                : (vr / Math.max(1, rows - 1));
            const vnx = gNormX * 2.0 - 1.0;
            const vny = gNormY * 2.0 - 1.0;
            if (isOutsideOutlineShape(vnx, vny, config.outlineShape)) {
                return 0;
            }
            const qrSample = sampleActiveQRStamp(gNormX, gNormY);
            if (qrSample !== null) {
                return qrSample ? 0 : Math.max(0, parsedFilaments.length - 1);
            }
            const waveSample = sampleActiveSoundwave(gNormX, gNormY);
            if (waveSample !== null) {
                return waveSample === 1 ? Math.max(0, parsedFilaments.length - 1) : 0;
            }
            if (filamentSlotBuffer && processedCanvas && processedCanvas.width > 0) {
                const origC = Math.min(processedCanvas.width - 1, Math.round(gNormX * (processedCanvas.width - 1)));
                const origR = Math.min(processedCanvas.height - 1, Math.round(gNormY * (processedCanvas.height - 1)));
                const pIdx = origR * processedCanvas.width + origC;
                if (filamentSlotBuffer[pIdx] !== 255 && filamentSlotBuffer[pIdx] < parsedFilaments.length) {
                    return filamentSlotBuffer[pIdx];
                }
            }
        }
        if (config.colorMode === 'chromatic') {
            if (config.preserveEyes && (r > 190 && g > 150 && b < 80) && parsedFilaments.length >= 2) {
                const eyeIdx = parsedFilaments.findIndex(f => f.rgb[0] > 204 && f.rgb[1] > 153);
                return eyeIdx !== -1 ? eyeIdx : (parsedFilaments.length - 2);
            }
            return findClosestFilamentWithDither(r, g, b, vc, vr, parsedFilaments, ditherPct);
        } else {
            // Height-based stratified layer assignment
            let fIdx = 0;
            for (let k = 1; k < parsedFilaments.length; k++) {
                if (zVal >= parsedFilaments[k].startZ) fIdx = k;
            }
            return fIdx;
        }
    }

    const sharpness = config.detailSharpness * 0.12;
    const activeTopo = options.tileCrop ? 'flat' : config.topography;

    for (let r = 0; r < rows; r++) {
        const y = h / 2 - (r / (rows - 1)) * h;
        const gNormY = options.tileCrop
            ? (options.tileCrop.rowTile + (r / Math.max(1, rows - 1))) / options.tileCrop.gridN
            : (r / Math.max(1, rows - 1));
        const ny = gNormY * 2.0 - 1.0;

        for (let c = 0; c < cols; c++) {
            const x = -w / 2 + (c / (cols - 1)) * w;
            const gNormX = options.tileCrop
                ? (options.tileCrop.colTile + (c / Math.max(1, cols - 1))) / options.tileCrop.gridN
                : (c / Math.max(1, cols - 1));
            const nx = gNormX * 2.0 - 1.0;
            const outsideShape = isOutsideOutlineShape(nx, ny, config.outlineShape);

            const topIdx = r * cols + c;
            const imgIdx = topIdx * 4;

            const red = data[imgIdx];
            const green = data[imgIdx + 1];
            const blue = data[imgIdx + 2];

            let lum = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255.0;

            if (sharpness > 0 && c > 0 && c < cols - 1 && r > 0 && r < rows - 1) {
                const up = ((r - 1) * cols + c) * 4;
                const down = ((r + 1) * cols + c) * 4;
                const left = (r * cols + (c - 1)) * 4;
                const right = (r * cols + (c + 1)) * 4;
                const avgN = (
                    (0.2126 * data[up] + 0.7152 * data[up+1] + 0.0722 * data[up+2]) +
                    (0.2126 * data[down] + 0.7152 * data[down+1] + 0.0722 * data[down+2]) +
                    (0.2126 * data[left] + 0.7152 * data[left+1] + 0.0722 * data[left+2]) +
                    (0.2126 * data[right] + 0.7152 * data[right+1] + 0.0722 * data[right+2])
                ) / (4.0 * 255.0);
                lum = Math.max(0.0, Math.min(1.0, lum + (lum - avgN) * sharpness));
            }

            let userFilSlot = null;
            let userZDelta = 0;
            if (processedCanvas && processedCanvas.width > 0) {
                const origC = Math.min(processedCanvas.width - 1, Math.round(gNormX * (processedCanvas.width - 1)));
                const origR = Math.min(processedCanvas.height - 1, Math.round(gNormY * (processedCanvas.height - 1)));
                const pIdx = origR * processedCanvas.width + origC;
                if (filamentSlotBuffer && filamentSlotBuffer[pIdx] !== 255 && filamentSlotBuffer[pIdx] < parsedFilaments.length) {
                    userFilSlot = filamentSlotBuffer[pIdx];
                }
                if (customZDeltaBuffer && customZDeltaBuffer[pIdx] !== 0) {
                    userZDelta = customZDeltaBuffer[pIdx];
                }
            }

            if (config.bgMode === 'vignette' && userFilSlot === null) {
                const rSq = nx * nx + ny * ny;
                lum *= Math.max(0.12, 1.0 - Math.pow(rSq, 1.1) * 0.68);
            }

            let z = computeSculpturalBasReliefZ(lum, nx, ny, red, green, blue, bgR, bgG, bgB, baseZ, maxReliefZ);

            let isFlattenedBg = false;
            if (config.bgMode === 'flatten_bg' && userFilSlot === null) {
                const distBg = Math.sqrt(colorDistSq(red, green, blue, bgR, bgG, bgB));
                const radDist = Math.sqrt(nx * nx + ny * ny);
                if (distBg < 95 && radDist > 0.36) {
                    z = baseZ;
                    isFlattenedBg = true;
                }
            }

            if (userFilSlot !== null && (config.colorMode === 'stratified' || isDrawingTemplateActive)) {
                const filStartZ = baseZ + parsedFilaments[userFilSlot].startPct * (maxReliefZ - baseZ);
                z = Math.min(maxReliefZ, filStartZ + (userFilSlot > 0 ? 0.16 : 0.0));
            } else if (!isFlattenedBg && config.subjectPop > 0 && red > green && red > blue) {
                z = Math.min(maxReliefZ, z + (config.subjectPop / 100.0) * 0.35);
            }

            if (userZDelta !== 0) {
                z = Math.max(Math.max(0.24, baseZ * 0.55), Math.min(maxReliefZ + 0.64, z + userZDelta));
            }

            if (options.quantize || (config.layerQuantizeStep && config.layerQuantizeStep > 0)) {
                const qStep = (config.layerQuantizeStep && config.layerQuantizeStep > 0) ? config.layerQuantizeStep : layerH;
                z = baseZ + Math.round((z - baseZ) / qStep) * qStep;
                z = Math.max(baseZ, Math.min(maxReliefZ + 0.64, z));
            }

            const qrSample = sampleActiveQRStamp(gNormX, gNormY);
            if (qrSample !== null && !outsideShape) {
                z = qrSample ? maxReliefZ : Math.max(baseZ, maxReliefZ - Math.max(0.24, layerH * 3));
            }

            const waveSample = sampleActiveSoundwave(gNormX, gNormY);
            if (waveSample !== null && !outsideShape) {
                z = waveSample === 1 ? maxReliefZ : Math.max(baseZ, maxReliefZ - Math.max(0.24, layerH * 3));
            }

            if (outsideShape) {
                z = baseZ * 0.55;
            }

            reliefHeights[topIdx] = z;

            const [tx, ty, tz] = applyTopographyVertex(x, y, z, w, activeTopo);
            positions[topIdx * 3] = tx;
            positions[topIdx * 3 + 1] = ty;
            positions[topIdx * 3 + 2] = tz;

            let botZ = options.tileCrop ? 0.0 : computeRearCavityDepthMm(x, y, z, w, h, baseZ);
            const [bx, by, bz] = applyTopographyVertex(x, y, botZ, w, activeTopo);
            const botIdx = N + topIdx;
            positions[botIdx * 3] = bx;
            positions[botIdx * 3 + 1] = by;
            positions[botIdx * 3 + 2] = bz;
        }
    }

    const isClosedCyl = (activeTopo === 'cylinder' && !options.tileCrop);

    // Determine active die-cut cells vs removed canvas / drilled through-holes
    const cellCols = cols - 1;
    const cellRows = rows - 1;
    const activeCells = new Uint8Array(cellCols * cellRows);
    let activeCellCount = 0;
    const cachedBgRgb = [bgR, bgG, bgB];
    const procW = (processedCanvas && processedCanvas.width > 0) ? processedCanvas.width : cols;
    const procH = (processedCanvas && processedCanvas.height > 0) ? processedCanvas.height : rows;

    for (let r = 0; r < cellRows; r++) {
        const gCenterY = options.tileCrop
            ? (options.tileCrop.rowTile + ((r + 0.5) / Math.max(1, cellRows))) / options.tileCrop.gridN
            : ((r + 0.5) / Math.max(1, cellRows));
        const origR = Math.min(procH - 1, Math.round(gCenterY * (procH - 1)));
        for (let c = 0; c < cellCols; c++) {
            const gCenterX = options.tileCrop
                ? (options.tileCrop.colTile + ((c + 0.5) / Math.max(1, cellCols))) / options.tileCrop.gridN
                : ((c + 0.5) / Math.max(1, cellCols));
            const origC = Math.min(procW - 1, Math.round(gCenterX * (procW - 1)));
            if (!isPixelCutoutVoid(origC, origR, procW, procH, cachedBgRgb)) {
                activeCells[r * cellCols + c] = 1;
                activeCellCount++;
            }
        }
    }

    if (activeCellCount === 0) {
        activeCells.fill(1);
        activeCellCount = cellCols * cellRows;
    }

    const cellFil1 = new Uint8Array(cellCols * cellRows);
    const cellFil2 = new Uint8Array(cellCols * cellRows);

    // Pass A: Compute exact chromatic / depth filament assignment for every active cell
    for (let r = 0; r < cellRows; r++) {
        const rowOff = r * cellCols;
        const gCenterY = options.tileCrop
            ? (options.tileCrop.rowTile + ((r + 0.5) / Math.max(1, cellRows))) / options.tileCrop.gridN
            : ((r + 0.5) / Math.max(1, cellRows));
        for (let c = 0; c < cellCols; c++) {
            if (activeCells[rowOff + c] === 0) continue;

            const wrapEast = isClosedCyl && (c === cellCols - 1);
            const tl = r * cols + c;
            const tr = wrapEast ? (r * cols) : (tl + 1);
            const bl = (r + 1) * cols + c;
            const br = wrapEast ? ((r + 1) * cols) : (bl + 1);

            const gCenterX = options.tileCrop
                ? (options.tileCrop.colTile + ((c + 0.5) / Math.max(1, cellCols))) / options.tileCrop.gridN
                : ((c + 0.5) / Math.max(1, cellCols));
            const qrCell = sampleActiveQRStamp(gCenterX, gCenterY);
            const waveCell = sampleActiveSoundwave(gCenterX, gCenterY);

            let filIdx1, filIdx2;
            if (qrCell !== null) {
                const qrFil = qrCell ? 0 : Math.max(0, parsedFilaments.length - 1);
                filIdx1 = qrFil;
                filIdx2 = qrFil;
            } else if (waveCell !== null) {
                const waveFil = waveCell === 1 ? Math.max(0, parsedFilaments.length - 1) : 0;
                filIdx1 = waveFil;
                filIdx2 = waveFil;
            } else {
                const pIdx1 = tl * 4;
                const pIdx2 = ((r + 1) * cols + (c + 1)) * 4;
                const maxZ1 = Math.max(reliefHeights[tl], reliefHeights[bl], reliefHeights[tr]);
                const maxZ2 = Math.max(reliefHeights[tr], reliefHeights[bl], reliefHeights[br]);

                filIdx1 = getBestFilamentIndex(data[pIdx1], data[pIdx1 + 1], data[pIdx1 + 2], maxZ1, tl);
                filIdx2 = getBestFilamentIndex(data[pIdx2], data[pIdx2 + 1], data[pIdx2 + 2], maxZ2, br);
            }

            cellFil1[rowOff + c] = filIdx1;
            cellFil2[rowOff + c] = filIdx2;
        }
    }

    const useAdaptive = (options.adaptiveMesh !== undefined ? !!options.adaptiveMesh : (config.adaptiveMesh !== false))
        && !options.preserveGridForSplit && activeTopo === 'flat' && !isClosedCyl;

    let indices;
    let triangleFilamentIdx;
    let totalTriangles = 0;
    let triOffset = 0;

    if (useAdaptive) {
        // Identify coplanar, constant-filament interior vertices along each horizontal row
        // Because row r is shared exclusively by row-band (r-1) and row-band (r), keeping every
        // activity transition, Z bend, and filament boundary guarantees zero T-junctions.
        const keepV = new Uint8Array(rows * cols);
        keepV.fill(1);
        const MAX_RUN = 16;

        for (let r = 0; r < rows; r++) {
            const vBase = r * cols;
            let keptSince = 0;
            for (let c = 1; c < cellCols; c++) {
                if ((c - keptSince) >= MAX_RUN) { keptSince = c; continue; }

                const upL = r > 0 ? activeCells[(r - 1) * cellCols + (c - 1)] : 0;
                const upR = r > 0 ? activeCells[(r - 1) * cellCols + c] : 0;
                const dnL = r < cellRows ? activeCells[r * cellCols + (c - 1)] : 0;
                const dnR = r < cellRows ? activeCells[r * cellCols + c] : 0;
                if (upL !== upR || dnL !== dnR || (upL === 0 && dnL === 0)) {
                    keptSince = c; continue;
                }

                if (upL === 1) {
                    const iUL = (r - 1) * cellCols + (c - 1);
                    const iUR = iUL + 1;
                    if (cellFil1[iUL] !== cellFil2[iUL] || cellFil2[iUL] !== cellFil1[iUR] || cellFil1[iUR] !== cellFil2[iUR]) {
                        keptSince = c; continue;
                    }
                }
                if (dnL === 1) {
                    const iDL = r * cellCols + (c - 1);
                    const iDR = iDL + 1;
                    if (cellFil1[iDL] !== cellFil2[iDL] || cellFil2[iDL] !== cellFil1[iDR] || cellFil1[iDR] !== cellFil2[iDR]) {
                        keptSince = c; continue;
                    }
                }

                const tS = positions[(vBase + keptSince) * 3 + 2];
                const tL = positions[(vBase + c - 1) * 3 + 2];
                const tM = positions[(vBase + c) * 3 + 2];
                const tR = positions[(vBase + c + 1) * 3 + 2];
                const bS = positions[(N + vBase + keptSince) * 3 + 2];
                const bL = positions[(N + vBase + c - 1) * 3 + 2];
                const bM = positions[(N + vBase + c) * 3 + 2];
                const bR = positions[(N + vBase + c + 1) * 3 + 2];

                if (Math.abs(tM - tL) > 0.004 || Math.abs(tR - tM) > 0.004 || Math.abs(tM - tS) > 0.008 || Math.abs(tR - tS) > 0.008 ||
                    Math.abs(bM - bL) > 0.004 || Math.abs(bR - bM) > 0.004 || Math.abs(bM - bS) > 0.008 || Math.abs(bR - bS) > 0.008) {
                    keptSince = c; continue;
                }

                keepV[vBase + c] = 0;
            }
        }

        const maxTris = activeCellCount * 12;
        const idxBuf = new Uint32Array(maxTris * 3);
        const filBuf = new Uint8Array(maxTris);
        const pushAdapTri = (v0, v1, v2, fIdx) => {
            idxBuf[triOffset * 3] = v0;
            idxBuf[triOffset * 3 + 1] = v1;
            idxBuf[triOffset * 3 + 2] = v2;
            filBuf[triOffset] = fIdx;
            triOffset++;
        };

        const upperCols = [];
        const lowerCols = [];

        for (let r = 0; r < cellRows; r++) {
            const rowOff = r * cellCols;
            const rTop = r * cols;
            const rBot = (r + 1) * cols;
            let c = 0;

            while (c < cellCols) {
                if (activeCells[rowOff + c] === 0) { c++; continue; }
                const cStart = c;
                while (c < cellCols && activeCells[rowOff + c] === 1) c++;
                const cEnd = c;

                upperCols.length = 0;
                lowerCols.length = 0;
                for (let k = cStart; k <= cEnd; k++) {
                    if (keepV[rTop + k]) upperCols.push(k);
                    if (keepV[rBot + k]) lowerCols.push(k);
                }

                // Zip upperCols & lowerCols horizontally into manifold triangles
                let ui = 0, li = 0;
                const uLen = upperCols.length, lLen = lowerCols.length;
                while (ui < uLen - 1 || li < lLen - 1) {
                    const cU = upperCols[ui];
                    const cL = lowerCols[li];
                    if (ui < uLen - 1 && li < lLen - 1 && cU === cL && upperCols[ui + 1] === cU + 1 && lowerCols[li + 1] === cL + 1) {
                        const tl = rTop + cU, tr = tl + 1, bl = rBot + cU, br = bl + 1;
                        const filIdx1 = cellFil1[rowOff + cU], filIdx2 = cellFil2[rowOff + cU];
                        const botFil = config.removeCanvasBg ? filIdx1 : 0;
                        pushAdapTri(tl, bl, tr, filIdx1);
                        pushAdapTri(tr, bl, br, filIdx2);
                        pushAdapTri(N + tl, N + tr, N + bl, botFil);
                        pushAdapTri(N + tr, N + br, N + bl, botFil);
                        ui++; li++;
                    } else if (ui < uLen - 1 && (li >= lLen - 1 || upperCols[ui + 1] <= lowerCols[li + 1])) {
                        const c1 = upperCols[ui + 1];
                        const sCol = Math.min(cEnd - 1, Math.max(cStart, cU));
                        const f = cellFil1[rowOff + sCol];
                        const botF = config.removeCanvasBg ? f : 0;
                        pushAdapTri(rTop + cU, rBot + cL, rTop + c1, f);
                        pushAdapTri(N + rTop + cU, N + rTop + c1, N + rBot + cL, botF);
                        ui++;
                    } else {
                        const c1 = lowerCols[li + 1];
                        const sCol = Math.min(cEnd - 1, Math.max(cStart, cL));
                        const f = cellFil2[rowOff + sCol];
                        const botF = config.removeCanvasBg ? f : 0;
                        pushAdapTri(rTop + cU, rBot + cL, rBot + c1, f);
                        pushAdapTri(N + rTop + cU, N + rBot + c1, N + rBot + cL, botF);
                        li++;
                    }
                }

                // North walls along coalesced upperCols segments
                for (let k = 0; k < uLen - 1; k++) {
                    const c0 = upperCols[k], c1 = upperCols[k + 1];
                    if (r === 0 || activeCells[(r - 1) * cellCols + c0] === 0) {
                        const f = cellFil1[rowOff + c0];
                        pushAdapTri(rTop + c0, rTop + c1, N + rTop + c0, f);
                        pushAdapTri(rTop + c1, N + rTop + c1, N + rTop + c0, f);
                    }
                }
                // South walls along coalesced lowerCols segments
                for (let k = 0; k < lLen - 1; k++) {
                    const c0 = lowerCols[k], c1 = lowerCols[k + 1];
                    if (r === cellRows - 1 || activeCells[(r + 1) * cellCols + c0] === 0) {
                        const f = cellFil2[rowOff + c0];
                        pushAdapTri(rBot + c0, N + rBot + c0, rBot + c1, f);
                        pushAdapTri(rBot + c1, N + rBot + c0, N + rBot + c1, f);
                    }
                }
                // West wall at cStart & East wall at cEnd
                {
                    const fW = cellFil1[rowOff + cStart];
                    pushAdapTri(rTop + cStart, N + rTop + cStart, rBot + cStart, fW);
                    pushAdapTri(rBot + cStart, N + rTop + cStart, N + rBot + cStart, fW);
                    const fE = cellFil2[rowOff + cEnd - 1];
                    pushAdapTri(rTop + cEnd, rBot + cEnd, N + rTop + cEnd, fE);
                    pushAdapTri(rBot + cEnd, N + rBot + cEnd, N + rTop + cEnd, fE);
                }
            }
        }

        totalTriangles = triOffset;
        indices = idxBuf.slice(0, totalTriangles * 3);
        triangleFilamentIdx = filBuf.slice(0, totalTriangles);
    } else {
        for (let r = 0; r < cellRows; r++) {
            const rowOff = r * cellCols;
            for (let c = 0; c < cellCols; c++) {
                if (activeCells[rowOff + c] === 0) continue;
                totalTriangles += 4;
                if (r === 0 || activeCells[(r - 1) * cellCols + c] === 0) totalTriangles += 2;
                if (r === cellRows - 1 || activeCells[(r + 1) * cellCols + c] === 0) totalTriangles += 2;
                const westClosed = isClosedCyl && c === 0 && activeCells[rowOff + (cellCols - 1)] === 1;
                const eastClosed = isClosedCyl && c === cellCols - 1 && activeCells[rowOff] === 1;
                if (!westClosed && (c === 0 || activeCells[rowOff + (c - 1)] === 0)) totalTriangles += 2;
                if (!eastClosed && (c === cellCols - 1 || activeCells[rowOff + (c + 1)] === 0)) totalTriangles += 2;
            }
        }

        indices = new Uint32Array(totalTriangles * 3);
        triangleFilamentIdx = new Uint8Array(totalTriangles);

        function pushTri(v0, v1, v2, fIdx) {
            indices[triOffset * 3] = v0;
            indices[triOffset * 3 + 1] = v1;
            indices[triOffset * 3 + 2] = v2;
            triangleFilamentIdx[triOffset] = fIdx;
            triOffset++;
        }

        for (let r = 0; r < cellRows; r++) {
            const rowOff = r * cellCols;
            for (let c = 0; c < cellCols; c++) {
                if (activeCells[rowOff + c] === 0) continue;

                const wrapEast = isClosedCyl && (c === cellCols - 1);
                const tl = r * cols + c;
                const tr = wrapEast ? (r * cols) : (tl + 1);
                const bl = (r + 1) * cols + c;
                const br = wrapEast ? ((r + 1) * cols) : (bl + 1);

                const b_tl = N + tl;
                const b_tr = N + tr;
                const b_bl = N + bl;
                const b_br = N + br;

                const filIdx1 = cellFil1[rowOff + c];
                const filIdx2 = cellFil2[rowOff + c];

                // 1. Top surface (+Z)
                pushTri(tl, bl, tr, filIdx1);
                pushTri(tr, bl, br, filIdx2);

                // 2. Bottom surface (-Z)
                const botFil = config.removeCanvasBg ? filIdx1 : 0;
                pushTri(b_tl, b_tr, b_bl, botFil);
                pushTri(b_tr, b_br, b_bl, botFil);

                // 3. North boundary wall (+Y)
                if (r === 0 || activeCells[(r - 1) * cellCols + c] === 0) {
                    pushTri(tl, tr, b_tl, filIdx1);
                    pushTri(tr, b_tr, b_tl, filIdx1);
                }
                // 4. South boundary wall (-Y)
                if (r === cellRows - 1 || activeCells[(r + 1) * cellCols + c] === 0) {
                    pushTri(bl, b_bl, br, filIdx2);
                    pushTri(br, b_bl, b_br, filIdx2);
                }
                // 5. West boundary wall (-X)
                const westClosed = isClosedCyl && c === 0 && activeCells[rowOff + (cellCols - 1)] === 1;
                if (!westClosed && (c === 0 || activeCells[rowOff + (c - 1)] === 0)) {
                    pushTri(tl, b_tl, bl, filIdx1);
                    pushTri(bl, b_tl, b_bl, filIdx1);
                }
                // 6. East boundary wall (+X)
                const eastClosed = isClosedCyl && c === cellCols - 1 && activeCells[rowOff] === 1;
                if (!eastClosed && (c === cellCols - 1 || activeCells[rowOff + (c + 1)] === 0)) {
                    pushTri(tr, br, b_tr, filIdx2);
                    pushTri(br, b_br, b_tr, filIdx2);
                }
            }
        }
    }

    const cad = buildFrameAndMountingTriangles(w, h, baseZ, maxReliefZ, {
        includeFrame: !!options.includeFrame,
        tileCrop: options.tileCrop,
        previewMode: false
    });
    let frameTriangles = cad.combined;

    return {
        positions,
        indices,
        triangleFilamentIdx,
        vertCount: N * 2,
        triCount: totalTriangles,
        frameTriangles,
        splitMeta: { activeCells, cellFil1, cellFil2, cellRows, cellCols, cols, N, isClosedCyl }
    };
}

function createArchiveZip() {
    if (typeof JSZip !== 'undefined') return new JSZip();
    if (typeof MinimalStoreZip !== 'undefined') return new MinimalStoreZip();
    throw new Error('ZIP library unavailable');
}

function writeStlTriangleToDataView(view, offset, ax, ay, az, bx, by, bz, cx, cy, cz) {
    const abx = bx - ax, aby = by - ay, abz = bz - az;
    const acx = cx - ax, acy = cy - ay, acz = cz - az;
    let nx = aby * acz - abz * acy;
    let ny = abz * acx - abx * acz;
    let nz = abx * acy - aby * acx;
    const len = Math.hypot(nx, ny, nz);
    if (len > 1e-12) {
        nx /= len; ny /= len; nz /= len;
    } else {
        nx = 0; ny = 0; nz = 1;
    }
    view.setFloat32(offset, nx, true);
    view.setFloat32(offset + 4, ny, true);
    view.setFloat32(offset + 8, nz, true);
    view.setFloat32(offset + 12, ax, true);
    view.setFloat32(offset + 16, ay, true);
    view.setFloat32(offset + 20, az, true);
    view.setFloat32(offset + 24, bx, true);
    view.setFloat32(offset + 28, by, true);
    view.setFloat32(offset + 32, bz, true);
    view.setFloat32(offset + 36, cx, true);
    view.setFloat32(offset + 40, cy, true);
    view.setFloat32(offset + 44, cz, true);
    view.setUint16(offset + 48, 0, true);
}

// ==========================================
// 💾 BINARY STL EXPORT (SYNC + WEB WORKER ASYNC)
// ==========================================
function packBinaryStlLocal(solidData) {
    const { positions, indices, triCount, frameTriangles } = solidData;
    const extraTris = frameTriangles.length;
    const finalTriCount = triCount + extraTris;

    const buffer = new ArrayBuffer(84 + finalTriCount * 50);
    const view = new DataView(buffer);

    const headerStr = "Studios-Pro 3D Ultra-HD Watertight Filament Painting";
    for (let i = 0; i < headerStr.length; i++) view.setUint8(i, headerStr.charCodeAt(i));
    view.setUint32(80, finalTriCount, true);

    let offset = 84;
    for (let f = 0; f < triCount; f++) {
        const iA = indices[f * 3] * 3;
        const iB = indices[f * 3 + 1] * 3;
        const iC = indices[f * 3 + 2] * 3;
        writeStlTriangleToDataView(
            view, offset,
            positions[iA], positions[iA + 1], positions[iA + 2],
            positions[iB], positions[iB + 1], positions[iB + 2],
            positions[iC], positions[iC + 1], positions[iC + 2]
        );
        offset += 50;
    }

    for (let fi = 0; fi < extraTris; fi++) {
        const tri = frameTriangles[fi];
        writeStlTriangleToDataView(
            view, offset,
            tri[0][0], tri[0][1], tri[0][2],
            tri[1][0], tri[1][1], tri[1][2],
            tri[2][0], tri[2][1], tri[2][2]
        );
        offset += 50;
    }
    return buffer;
}

function generateBinarySTL(options = {}) {
    const solidData = buildWatertightReliefData(options);
    if (!solidData) return new Blob();
    return new Blob([packBinaryStlLocal(solidData)], { type: 'application/octet-stream' });
}

let _stlWorkerInstance = null;
let _stlWorkerJobId = 0;
async function generateBinarySTLAsync(options = {}) {
    const solidData = buildWatertightReliefData(options);
    if (!solidData) return new Blob();

    const canUseWorker = (typeof Worker !== 'undefined') &&
        (typeof location === 'undefined' || location.protocol !== 'file:');

    if (!canUseWorker) {
        return new Blob([packBinaryStlLocal(solidData)], { type: 'application/octet-stream' });
    }

    const { positions, indices, triCount, frameTriangles } = solidData;
    const frameCount = frameTriangles.length;
    const frameFlat = new Float64Array(frameCount * 9);
    for (let i = 0; i < frameCount; i++) {
        const tri = frameTriangles[i];
        const k = i * 9;
        frameFlat[k] = tri[0][0]; frameFlat[k + 1] = tri[0][1]; frameFlat[k + 2] = tri[0][2];
        frameFlat[k + 3] = tri[1][0]; frameFlat[k + 4] = tri[1][1]; frameFlat[k + 5] = tri[1][2];
        frameFlat[k + 6] = tri[2][0]; frameFlat[k + 7] = tri[2][1]; frameFlat[k + 8] = tri[2][2];
    }

    return await new Promise((resolve) => {
        let settled = false;
        const finishFallback = () => {
            if (settled) return;
            settled = true;
            resolve(new Blob([packBinaryStlLocal(solidData)], { type: 'application/octet-stream' }));
        };
        try {
            if (!_stlWorkerInstance) _stlWorkerInstance = new Worker('workers/stl-worker.js');
            const jobId = ++_stlWorkerJobId;
            const timer = setTimeout(() => {
                _stlWorkerInstance = null;
                finishFallback();
            }, 25000);

            const onMsg = (e) => {
                if (!e || !e.data || e.data.id !== jobId) return;
                clearTimeout(timer);
                _stlWorkerInstance.removeEventListener('message', onMsg);
                _stlWorkerInstance.removeEventListener('error', onErr);
                if (settled) return;
                settled = true;
                if (e.data.ok && e.data.buffer) {
                    resolve(new Blob([e.data.buffer], { type: 'application/octet-stream' }));
                } else {
                    resolve(new Blob([packBinaryStlLocal(solidData)], { type: 'application/octet-stream' }));
                }
            };
            const onErr = () => {
                clearTimeout(timer);
                if (_stlWorkerInstance) {
                    _stlWorkerInstance.removeEventListener('message', onMsg);
                    _stlWorkerInstance.removeEventListener('error', onErr);
                    try { _stlWorkerInstance.terminate(); } catch (_) {}
                    _stlWorkerInstance = null;
                }
                finishFallback();
            };

            _stlWorkerInstance.addEventListener('message', onMsg);
            _stlWorkerInstance.addEventListener('error', onErr);
            _stlWorkerInstance.postMessage({
                type: 'PACK_STL',
                id: jobId,
                headerStr: "Studios-Pro 3D Ultra-HD Watertight Filament Painting",
                triCount,
                frameCount,
                positions,
                indices,
                frameFlat
            });
        } catch (_) {
            finishFallback();
        }
    });
}

// ==========================================
// 🎁 3MF MULTI-COLOR PACKAGE WITH THUMBNAIL
// ==========================================
async function generate3MFPackage(options = {}) {
    const solidData = buildWatertightReliefData(options);
    if (!solidData) return new Blob();

    const { positions, indices, triangleFilamentIdx, vertCount, triCount, frameTriangles } = solidData;
    const zip = createArchiveZip();

    const objName = options.tileCrop
        ? `Mural_Tile_Row${options.tileCrop.rowTile + 1}_Col${options.tileCrop.colTile + 1}`
        : `Filament_Painting_Relief`;

    zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
  <Default Extension="config" ContentType="application/vnd.bambulab.bambustudio.config+xml"/>
  <Default Extension="png" ContentType="image/png"/>
</Types>`);

    zip.folder("_rels").file(".rels", `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
  <Relationship Target="/Metadata/thumbnail.png" Id="rel1" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/thumbnail"/>
</Relationships>`);

    // Compact relief vertices so zero orphan vertices exist (e.g. die-cut voids / cylinder seam wrap)
    const vertRemap = new Int32Array(vertCount);
    vertRemap.fill(-1);
    const vertChunks = [];
    let compactCount = 0;

    function mapVert(oldIdx) {
        let mapped = vertRemap[oldIdx];
        if (mapped === -1) {
            mapped = compactCount++;
            vertRemap[oldIdx] = mapped;
            const p = oldIdx * 3;
            vertChunks.push(`<vertex x="${positions[p].toFixed(3)}" y="${positions[p + 1].toFixed(3)}" z="${positions[p + 2].toFixed(3)}"/>\n`);
        }
        return mapped;
    }

    const triChunks = new Array(triCount);
    for (let f = 0; f < triCount; f++) {
        const v1 = mapVert(indices[f * 3]);
        const v2 = mapVert(indices[f * 3 + 1]);
        const v3 = mapVert(indices[f * 3 + 2]);
        const filIdx = triangleFilamentIdx[f];
        triChunks[f] = `<triangle v1="${v1}" v2="${v2}" v3="${v3}" pid="1" p1="${filIdx}"/>\n`;
    }

    const colorChunks = ['<m:colorgroup id="1">\n'];
    filaments.forEach(fil => {
        const hexColor = fil.color.slice(0, 7).toUpperCase();
        colorChunks.push(`  <m:color color="${hexColor}" />\n`);
    });
    colorChunks.push('</m:colorgroup>');

    let frameObjectXML = '';
    let buildItemsXML = '<item objectid="2"/>';

    if (frameTriangles && frameTriangles.length > 0) {
        const frameVertChunks = [];
        const frameTriChunks = [];
        let vIdx = 0;
        for (let fi = 0; fi < frameTriangles.length; fi++) {
            const tri = frameTriangles[fi];
            frameVertChunks.push(`<vertex x="${tri[0][0].toFixed(3)}" y="${tri[0][1].toFixed(3)}" z="${tri[0][2].toFixed(3)}"/>\n`);
            frameVertChunks.push(`<vertex x="${tri[1][0].toFixed(3)}" y="${tri[1][1].toFixed(3)}" z="${tri[1][2].toFixed(3)}"/>\n`);
            frameVertChunks.push(`<vertex x="${tri[2][0].toFixed(3)}" y="${tri[2][1].toFixed(3)}" z="${tri[2][2].toFixed(3)}"/>\n`);
            frameTriChunks.push(`<triangle v1="${vIdx}" v2="${vIdx+1}" v3="${vIdx+2}" pid="1" p1="0"/>\n`);
            vIdx += 3;
        }

        frameObjectXML = `
    <object id="3" name="Outer_Frame_Mounting" type="model">
      <mesh>
<vertices>
  ${frameVertChunks.join('')}
</vertices>
<triangles>
  ${frameTriChunks.join('')}
</triangles>
      </mesh>
    </object>`;
        buildItemsXML += '\n    <item objectid="3"/>';
    }

    const modelXML = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02">
  <metadata name="Title">StudiosPro_3D_Filament_Painting</metadata>
  <metadata name="Application">Studios-Pro 3D CAD</metadata>
  <resources>
    ${colorChunks.join('')}
    <object id="2" name="${objName}" type="model">
      <mesh>
<vertices>
  ${vertChunks.join('')}
</vertices>
<triangles>
  ${triChunks.join('')}
</triangles>
      </mesh>
    </object>${frameObjectXML}
  </resources>
  <build>
    ${buildItemsXML}
  </build>
</model>`;

    zip.folder("3D").file("3dmodel.model", modelXML);

    const filamentMetadataLines = filaments.map((fil, idx) => {
        const startH = (config.baseThickness + fil.startPct * (config.maxRelief - config.baseThickness)).toFixed(2);
        const layerNum = typeof heightToLayerNumber === 'function' ? heightToLayerNumber(parseFloat(startH)) : Math.max(1, Math.round(parseFloat(startH) / config.layerHeight));
        return `  <metadata key="studios_pro_slot_${idx + 1}" value="${fil.color.slice(0, 7).toUpperCase()} | ${startH}mm | L${layerNum}"/>`;
    }).join('\n');

    const modelSettingsConfig = `<?xml version="1.0" encoding="UTF-8"?>
<config>
  <object id="2">
    <metadata key="name" value="${objName}"/>
    <metadata key="extruder" value="1"/>
${filamentMetadataLines}
  </object>
  ${frameTriangles.length > 0 ? `<object id="3"><metadata key="name" value="Outer_Frame_Mounting"/><metadata key="extruder" value="1"/></object>` : ''}
  <plate>
    <metadata key="plater_id" value="1"/>
    <metadata key="plater_name" value="Plate 1"/>
  </plate>
</config>`;
    zip.folder("Metadata").file("model_settings.config", modelSettingsConfig);

    const sliceInfoConfig = `<?xml version="1.0" encoding="UTF-8"?>
<config>
  <header>
    <metadata key="major_version" value="1"/>
    <metadata key="minor_version" value="9"/>
  </header>
  <plate>
    <metadata key="index" value="1"/>
    <metadata key="prediction" value="0"/>
    <metadata key="weight" value="0"/>
  </plate>
</config>`;
    zip.folder("Metadata").file("slice_info.config", sliceInfoConfig);

    try {
        if (renderer && scene && camera) {
            renderer.render(scene, camera);
            const dataUrl = renderer.domElement.toDataURL('image/png');
            const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
            zip.folder("Metadata").file("thumbnail.png", base64Data, { base64: true });
        }
    } catch (err) {
        console.warn('Could not generate 3MF thumbnail:', err);
    }

    return await zip.generateAsync({ type: "blob" });
}

// ==========================================
// 🗂️ SPLIT LAYER STLS ZIP ARCHIVE (WATERTIGHT CLOSED SUB-SOLIDS PER FILAMENT)
// ==========================================
async function generateSplitLayerSTLsZip(options = {}) {
    const zip = createArchiveZip();
    const solidData = buildWatertightReliefData({ ...options, preserveGridForSplit: true });
    if (!solidData) return new Blob();

    const { positions, splitMeta } = solidData;
    const { activeCells, cellFil1, cellFil2, cellRows, cellCols, cols, N, isClosedCyl } = splitMeta;

    const perFilamentTris = Array.from({ length: filaments.length }, () => []);
    const emitTri = (fIdx, a, b, c) => {
        if (fIdx >= 0 && fIdx < perFilamentTris.length) {
            perFilamentTris[fIdx].push(a, b, c);
        }
    };
    const emitQuad = (fIdx, a, b, c, d) => {
        emitTri(fIdx, a, b, c);
        emitTri(fIdx, c, b, d);
    };

    for (let r = 0; r < cellRows; r++) {
        const rowOff = r * cellCols;
        for (let c = 0; c < cellCols; c++) {
            const cellIdx = rowOff + c;
            if (activeCells[cellIdx] === 0) continue;

            const wrapEast = isClosedCyl && (c === cellCols - 1);
            const tl = r * cols + c;
            const tr = wrapEast ? (r * cols) : (tl + 1);
            const bl = (r + 1) * cols + c;
            const br = wrapEast ? ((r + 1) * cols) : (bl + 1);
            const b_tl = N + tl, b_tr = N + tr, b_bl = N + bl, b_br = N + br;

            const f1 = cellFil1[cellIdx];
            const f2 = cellFil2[cellIdx];

            // Half-Cell 0: (tl, bl, tr)
            emitTri(f1, tl, bl, tr);
            emitTri(f1, b_tl, b_tr, b_bl);
            const nFil = (r > 0 && activeCells[(r - 1) * cellCols + c] === 1) ? cellFil2[(r - 1) * cellCols + c] : 255;
            if (nFil !== f1) { emitTri(f1, tl, tr, b_tl); emitTri(f1, tr, b_tr, b_tl); }
            const wc = c > 0 ? c - 1 : (isClosedCyl ? cellCols - 1 : -1);
            const wFil = (wc >= 0 && activeCells[rowOff + wc] === 1) ? cellFil2[rowOff + wc] : 255;
            if (wFil !== f1) emitQuad(f1, tl, b_tl, bl, b_bl);
            if (f2 !== f1) emitQuad(f1, bl, b_bl, tr, b_tr);

            // Half-Cell 1: (tr, bl, br)
            emitTri(f2, tr, bl, br);
            emitTri(f2, b_tr, b_br, b_bl);
            const sFil = (r < cellRows - 1 && activeCells[(r + 1) * cellCols + c] === 1) ? cellFil1[(r + 1) * cellCols + c] : 255;
            if (sFil !== f2) emitQuad(f2, bl, b_bl, br, b_br);
            const ec = c < cellCols - 1 ? c + 1 : (isClosedCyl ? 0 : -1);
            const eFil = (ec >= 0 && activeCells[rowOff + ec] === 1) ? cellFil1[rowOff + ec] : 255;
            if (eFil !== f2) emitQuad(f2, tr, br, b_tr, b_br);
            if (f1 !== f2) emitQuad(f2, tr, b_tr, bl, b_bl);
        }
    }

    for (let filIdx = 0; filIdx < filaments.length; filIdx++) {
        const fil = filaments[filIdx];
        const vertIdxList = perFilamentTris[filIdx];
        if (!vertIdxList || vertIdxList.length === 0) continue;

        const triCountFil = Math.floor(vertIdxList.length / 3);
        const buffer = new ArrayBuffer(84 + triCountFil * 50);
        const view = new DataView(buffer);

        const headerStr = `Studios-Pro Layer ${filIdx+1} - ${fil.name}`;
        for (let i = 0; i < headerStr.length && i < 80; i++) view.setUint8(i, headerStr.charCodeAt(i));
        view.setUint32(80, triCountFil, true);

        let offset = 84;
        for (let i = 0; i < triCountFil; i++) {
            const iA = vertIdxList[i * 3] * 3;
            const iB = vertIdxList[i * 3 + 1] * 3;
            const iC = vertIdxList[i * 3 + 2] * 3;
            writeStlTriangleToDataView(
                view, offset,
                positions[iA], positions[iA + 1], positions[iA + 2],
                positions[iB], positions[iB + 1], positions[iB + 2],
                positions[iC], positions[iC + 1], positions[iC + 2]
            );
            offset += 50;
        }

        const safeName = fil.name.replace(/[^a-zA-Z0-9]/g, '_');
        zip.file(`Slot_${filIdx+1}_${safeName}.stl`, buffer);
    }

    zip.file("README_Slicer_Settings.txt", generateSlicerScriptText());
    return await zip.generateAsync({ type: "blob" });
}

// ==========================================
// 🧩 MULTI-TILE XL WALL MURAL POSTER SPLITTER (MULTI-COLOR .3MF ZIP)
// ==========================================
async function generateWallMuralZip(options = {}) {
    const zip = createArchiveZip();
    const gridN = options.gridN || 2;
    const tileW = (config.width / gridN).toFixed(1);
    const tileH = (config.height / gridN).toFixed(1);

    for (let r = 0; r < gridN; r++) {
        for (let c = 0; c < gridN; c++) {
            const tile3MFBlob = await generate3MFPackage({
                ...options,
                includeFrame: false,
                tileCrop: { rowTile: r, colTile: c, gridN }
            });
            const arrayBuf = await tile3MFBlob.arrayBuffer();
            zip.file(`Tile_Row${r + 1}_Col${c + 1}_(${tileW}x${tileH}mm).3mf`, arrayBuf);
        }
    }

    let guide = `============================================================\n`;
    guide += `STUDIOS-PRO XL MULTI-TILE WALL MURAL ASSEMBLY GUIDE (${gridN}x${gridN})\n`;
    guide += `============================================================\n`;
    guide += `Format               : Multi-Color .3MF Packages (with AMS Filament Slots)\n`;
    guide += `Total Wall Mural Size: ${config.width} mm x ${config.height} mm\n`;
    guide += `Individual Tile Size : ${tileW} mm x ${tileH} mm x ${config.maxRelief} mm\n`;
    guide += `Total Tiles to Print : ${gridN * gridN} Multi-Color .3MF Tiles (Row 1..${gridN}, Col 1..${gridN})\n\n`;
    guide += `WALL LAYOUT MATRIX (Top-to-Bottom, Left-to-Right):\n`;
    for (let r = 0; r < gridN; r++) {
        let rowStr = `  `;
        for (let c = 0; c < gridN; c++) {
            rowStr += `[ Tile_Row${r + 1}_Col${c + 1}.3mf ]  `;
        }
        guide += rowStr + `\n`;
    }
    guide += `\n` + generateSlicerScriptText();
    zip.file("README_Mural_Assembly_Guide.txt", guide);

    return await zip.generateAsync({ type: "blob" });
}

function downloadFileDirect(blob, filename) {
    const a = document.createElement('a');
    a.dataset.bypassed = 'true';
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    }, 1500);
}

// ==========================================
// 🌐 VIRAL SHARE & WATERMARKED SNAPSHOT
// ==========================================
function openShareModal() {
    closeAllModals();
    if (!renderer || !scene || !camera) return;

    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/png');
    document.getElementById('share-snapshot-img').src = dataUrl;

    const palParam = filaments
        .map(f => `${f.color.slice(0, 7)}:${Number(f.startPct || 0).toFixed(2)}:${Number(f.td || 3.0).toFixed(1)}:${encodeURIComponent(f.name.slice(0, 24))}`)
        .join(',');
    const shareQuery = new URLSearchParams({
        ref: 'filament-painting',
        w: String(config.width),
        h: String(config.height),
        z: String(config.maxRelief),
        lh: String(config.layerHeight),
        base: String(config.baseThickness),
        topo: String(config.topography || 'flat'),
        shape: String(config.outlineShape || 'rect'),
        pal: palParam
    });
    const shareUrl = `https://studios-pro.com/?${shareQuery.toString()}`;
    document.getElementById('share-input-url').value = shareUrl;

    const redditTitle = currentLang === 'fr' 
        ? "Regardez ce tableau 3D de filaments généré dans mon navigateur avec Studios-Pro !" 
        : "Check out this 3D Filament Painting made in my browser with Studios-Pro!";
    document.getElementById('share-link-reddit').href = `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(redditTitle)}`;
    document.getElementById('share-link-whatsapp').href = `https://api.whatsapp.com/send?text=${encodeURIComponent(redditTitle + ' ' + shareUrl)}`;
    document.getElementById('share-link-twitter').href = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(redditTitle)}`;

    document.getElementById('share-modal').style.display = 'flex';
}

function downloadShareSnapshot() {
    if (!renderer || !scene || !camera) return;
    try {
        renderer.render(scene, camera);
        const tempCanvas = document.createElement('canvas');
        const srcCanvas = renderer.domElement;
        tempCanvas.width = srcCanvas.width;
        tempCanvas.height = srcCanvas.height;
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(srcCanvas, 0, 0);

        const barHeight = Math.max(40, Math.round(tempCanvas.height * 0.07));
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(0, tempCanvas.height - barHeight, tempCanvas.width, barHeight);

        ctx.fillStyle = '#38bdf8';
        ctx.font = `bold ${Math.round(barHeight * 0.42)}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('Studios-Pro.com', 20, tempCanvas.height - barHeight / 2);

        ctx.fillStyle = '#f8fafc';
        ctx.font = `${Math.round(barHeight * 0.36)}px sans-serif`;
        ctx.textAlign = 'right';
        ctx.fillText(currentLang === 'fr' ? 'Studio de Peinture 3D de Filament' : 'Free 3D Filament Painting Studio', tempCanvas.width - 20, tempCanvas.height - barHeight / 2);

        tempCanvas.toBlob(blob => {
            if (blob) {
                downloadFileDirect(blob, 'StudiosPro_Filament_Painting_Design.png');
                showToast(translations[currentLang].toastSnapshotSaved);
            }
        }, 'image/png');
    } catch (e) {
        console.error(e);
    }
}

// ==========================================
// 🎴 FEATURE 7: 4K PRINT RECIPE CARD & STUDIO MOCKUP GENERATOR (PNG)
// ==========================================
function drawRoundedRectPath(ctx, x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    ctx.lineTo(x + rad, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
    ctx.lineTo(x, y + rad);
    ctx.quadraticCurveTo(x, y, x + rad, y);
    ctx.closePath();
}

function downloadRecipeCardPNG() {
    if (!renderer || !scene || !camera) return;
    try {
        renderer.render(scene, camera);
        const W = 1920;
        const H = 1080;
        const cardCanvas = document.createElement('canvas');
        cardCanvas.width = W;
        cardCanvas.height = H;
        const ctx = cardCanvas.getContext('2d');

        const isFr = currentLang === 'fr';

        // 1. Studio Dark Slate Gradient Background
        const bgGrad = ctx.createLinearGradient(0, 0, W, H);
        bgGrad.addColorStop(0, '#070b14');
        bgGrad.addColorStop(0.5, '#0f172a');
        bgGrad.addColorStop(1, '#090d16');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // Subtle decorative grid lines
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.04)';
        ctx.lineWidth = 1;
        for (let gx = 0; gx < W; gx += 48) {
            ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
        }
        for (let gy = 0; gy < H; gy += 48) {
            ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
        }

        // 2. Left Showcase Frame (3D Render + 2D Chromatic PiP)
        const leftX = 48, leftY = 48, leftW = 980, leftH = 984;
        drawRoundedRectPath(ctx, leftX, leftY, leftW, leftH, 24);
        const showcaseGrad = ctx.createRadialGradient(leftX + leftW * 0.5, leftY + leftH * 0.46, 60, leftX + leftW * 0.5, leftY + leftH * 0.5, leftW * 0.7);
        showcaseGrad.addColorStop(0, '#1e293b');
        showcaseGrad.addColorStop(1, '#090d16');
        ctx.fillStyle = showcaseGrad;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.stroke();

        // Draw 3D WebGL Render centered inside Left Showcase
        const glCanvas = renderer.domElement;
        if (glCanvas && glCanvas.width > 0 && glCanvas.height > 0) {
            const pad = 44;
            const availW = leftW - pad * 2;
            const availH = leftH - pad * 2 - 40;
            const scale = Math.min(availW / glCanvas.width, availH / glCanvas.height);
            const drawW = glCanvas.width * scale;
            const drawH = glCanvas.height * scale;
            const dx = leftX + (leftW - drawW) / 2;
            const dy = leftY + 34 + (availH - drawH) / 2;

            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
            ctx.shadowBlur = 36;
            ctx.shadowOffsetY = 18;
            drawRoundedRectPath(ctx, dx, dy, drawW, drawH, 16);
            ctx.clip();
            ctx.drawImage(glCanvas, dx, dy, drawW, drawH);
            ctx.restore();
        }

        // Top-left Studio Badge inside Left Showcase
        drawRoundedRectPath(ctx, leftX + 24, leftY + 22, 355, 40, 10);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 15px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(isFr ? '🎨 APERÇU STUDIO 3D • STUDIOS-PRO' : '🎨 3D STUDIO RENDER • STUDIOS-PRO', leftX + 40, leftY + 42);

        // Picture-in-Picture (PiP) 2D Chromatic Map in Bottom-Left of Showcase
        if (processedCanvas && processedCanvas.width > 0 && processedCanvas.height > 0) {
            const pipMax = 210;
            const pAspect = processedCanvas.height / processedCanvas.width;
            const pipW = pAspect > 1 ? Math.round(pipMax / pAspect) : pipMax;
            const pipH = pAspect > 1 ? pipMax : Math.round(pipMax * pAspect);
            const pipX = leftX + 26;
            const pipY = leftY + leftH - pipH - 32;

            ctx.save();
            drawRoundedRectPath(ctx, pipX - 6, pipY - 28, pipW + 12, pipH + 34, 12);
            ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(168, 85, 247, 0.55)';
            ctx.lineWidth = 1.8;
            ctx.stroke();

            ctx.fillStyle = '#e2e8f0';
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.fillText(isFr ? 'CARTE 2D CHROMATIQUE' : '2D CHROMATIC MAP', pipX + 4, pipY - 12);
            ctx.drawImage(processedCanvas, pipX, pipY, pipW, pipH);
            ctx.restore();
        }

        // Bottom-Right Feature Pills inside Showcase
        const activeTags = [
            config.colorMode === 'chromatic' ? (isFr ? 'Chromatique Vraies Couleurs' : 'Chromatic True-Color') : (isFr ? 'Relief Stratifié' : 'Stratified Relief'),
            `${config.topography.toUpperCase()}`,
            config.sculpturalDome > 0 ? `2.5D Relief ${config.sculpturalDome}%` : null,
            config.nfcPocket ? 'NFC 26mm' : null,
            activeSoundwave ? '3D Soundwave' : null
        ].filter(Boolean);

        let tagX = leftX + leftW - 24;
        const tagY = leftY + leftH - 36;
        ctx.font = 'bold 13px Inter, sans-serif';
        for (let i = activeTags.length - 1; i >= 0; i--) {
            const tText = activeTags[i];
            const tw = ctx.measureText(tText).width + 24;
            tagX -= tw;
            drawRoundedRectPath(ctx, tagX, tagY - 16, tw, 32, 8);
            ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.fillStyle = '#38bdf8';
            ctx.textAlign = 'center';
            ctx.fillText(tText, tagX + tw / 2, tagY);
            tagX -= 10;
        }

        // 3. Right Technical Recipe Sheet Panel
        const rightX = 1056, rightY = 48, rightW = 816, rightH = 984;
        drawRoundedRectPath(ctx, rightX, rightY, rightW, rightH, 24);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Header Title & Subtitle
        ctx.textAlign = 'left';
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.fillText(isFr ? 'STUDIOS-PRO.COM • FICHE RECETTE D\'IMPRESSION 3D MULTI-COULEURS' : 'STUDIOS-PRO.COM • 3D FILAMENT PAINTING RECIPE CARD', rightX + 34, rightY + 40);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 28px Inter, sans-serif';
        ctx.fillText(isFr ? 'Paramètres Slicer & Couches AMS / M600' : 'Slicer Recipe & AMS / M600 Filament Stack', rightX + 34, rightY + 74);

        // 4 KPI Cards Row
        const metrics = computePrintMetrics();
        const firstH = (config.firstLayerHeight || 0.20).toFixed(2);
        const kpis = [
            {
                label: isFr ? 'DIMENSIONS PLAQUE' : 'PLAQUE DIMENSIONS',
                val: `${config.width} × ${config.height} mm`,
                sub: `Z Max: ${config.maxRelief} mm (Base ${config.baseThickness} mm)`
            },
            {
                label: isFr ? 'HAUTEUR DE COUCHE' : 'LAYER HEIGHT',
                val: `${config.layerHeight.toFixed(2)} mm`,
                sub: isFr ? `1ère couche : ${firstH} mm • ${metrics.totalLayers} couches` : `1st Layer: ${firstH} mm • ${metrics.totalLayers} layers`
            },
            {
                label: isFr ? 'POIDS & BOBINE EST.' : 'EST. WEIGHT & SPOOL',
                val: `~${metrics.weightG} g (${metrics.totalMeters}m)`,
                sub: `${isFr ? 'Coût filament' : 'Filament Cost'}: $${metrics.costUsd.toFixed(2)}`
            },
            {
                label: isFr ? 'TEMPS D\'IMPRESSION' : 'EST. PRINT TIME',
                val: metrics.timeStr,
                sub: `${filaments.length} ${isFr ? 'Filaments actifs' : 'Active Filaments'}`
            }
        ];

        const kpiW = 180, kpiH = 88, kpiGap = 10;
        kpis.forEach((k, idx) => {
            const kx = rightX + 34 + idx * (kpiW + kpiGap);
            const ky = rightY + 104;
            drawRoundedRectPath(ctx, kx, ky, kpiW, kpiH, 12);
            ctx.fillStyle = 'rgba(30, 41, 59, 0.78)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            ctx.fillStyle = '#94a3b8';
            ctx.font = 'bold 10px Inter, sans-serif';
            ctx.fillText(k.label, kx + 12, ky + 20);

            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 19px Inter, sans-serif';
            ctx.fillText(k.val, kx + 12, ky + 48);

            ctx.fillStyle = '#38bdf8';
            ctx.font = '11px Inter, sans-serif';
            ctx.fillText(k.sub, kx + 12, ky + 72);
        });

        // Visual Layer Equalizer Bar
        const eqX = rightX + 34, eqY = rightY + 210, eqW = rightW - 68, eqH = 26;
        drawRoundedRectPath(ctx, eqX, eqY, eqW, eqH, 8);
        ctx.save();
        ctx.clip();
        filaments.forEach((fil, idx) => {
            const startPct = fil.startPct;
            const endPct = (idx < filaments.length - 1) ? filaments[idx + 1].startPct : 1.0;
            const segX = eqX + startPct * eqW;
            const segW = Math.max(4, (endPct - startPct) * eqW);
            ctx.fillStyle = fil.color;
            ctx.fillRect(segX, eqY, segW + 1, eqH);
        });
        ctx.restore();
        drawRoundedRectPath(ctx, eqX, eqY, eqW, eqH, 8);
        ctx.strokeStyle = 'rgba(255,255,255,0.28)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Filament Stack Table Header
        const tableTop = rightY + 256;
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillText('SLOT', rightX + 42, tableTop);
        ctx.fillText(isFr ? 'FILAMENT & HEX' : 'FILAMENT & HEX', rightX + 120, tableTop);
        ctx.fillText('TD (mm)', rightX + 430, tableTop);
        ctx.fillText(isFr ? 'COUCHE DÉBUT' : 'START LAYER', rightX + 540, tableTop);
        ctx.fillText(isFr ? 'HAUTEUR Z' : 'Z HEIGHT', rightX + 685, tableTop);

        const rowH = Math.min(62, Math.floor(490 / Math.max(1, filaments.length)));
        filaments.forEach((fil, idx) => {
            const ry = tableTop + 18 + idx * rowH;
            drawRoundedRectPath(ctx, rightX + 34, ry, rightW - 68, rowH - 8, 10);
            ctx.fillStyle = idx % 2 === 0 ? 'rgba(30, 41, 59, 0.65)' : 'rgba(15, 23, 42, 0.65)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
            ctx.lineWidth = 1;
            ctx.stroke();

            const stSlot = (metrics.perSlot && metrics.perSlot[idx]) || {};
            const startZVal = stSlot.startZ !== undefined ? stSlot.startZ : (config.baseThickness + fil.startPct * (config.maxRelief - config.baseThickness));
            const startZ = startZVal.toFixed(2);
            const startLayer = stSlot.startLayer || heightToLayerNumber(startZVal);
            const slotMass = stSlot.grams !== undefined ? ` • ~${stSlot.grams}g (${stSlot.meters.toFixed(2)}m)` : '';
            const midY = ry + (rowH - 8) / 2;

            // Slot badge
            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.fillText(`#${idx + 1}`, rightX + 46, midY);

            // Color swatch
            drawRoundedRectPath(ctx, rightX + 86, midY - 13, 26, 26, 6);
            ctx.fillStyle = fil.color;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Name + HEX + volumetric grams/meters
            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.fillText(`${fil.name}`, rightX + 124, midY - 6);
            ctx.fillStyle = '#94a3b8';
            ctx.font = '12px monospace';
            ctx.fillText(`${fil.color.toUpperCase()} • ${fil.targetFeature || 'Relief Layer'}${slotMass}`, rightX + 124, midY + 11);

            // TD
            ctx.fillStyle = '#e2e8f0';
            ctx.font = 'bold 13px Inter, sans-serif';
            ctx.fillText(`${(fil.td || 3.0).toFixed(1)} mm`, rightX + 430, midY);

            // Start Layer
            ctx.fillStyle = '#a855f7';
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.fillText(`${isFr ? 'Couche' : 'Layer'} #${startLayer}`, rightX + 540, midY);

            // Z Height
            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.fillText(`${startZ} mm`, rightX + 685, midY);
        });

        // Footer Box with Critical Slicer Notes + Scannable QR Code
        const footY = rightY + rightH - 188;
        const footW = rightW - 68;
        const footH = 156;
        drawRoundedRectPath(ctx, rightX + 34, footY, footW, footH, 14);
        ctx.fillStyle = 'rgba(8, 14, 28, 0.9)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 13px Inter, sans-serif';
        ctx.fillText(isFr ? '📌 INSTRUCTIONS CRITIQUES BAMBU STUDIO / ORCASLICER / PRUSASLICER' : '📌 CRITICAL SLICER CHECKLIST (BAMBU STUDIO / ORCASLICER / PRUSA)', rightX + 52, footY + 28);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '13px Inter, sans-serif';
        const amsPlan = (typeof computeFourSlotAmsPlan === 'function') ? computeFourSlotAmsPlan([]) : { active: false, swaps: [] };
        const amsLine = (amsPlan.active && amsPlan.swaps.length > 0)
            ? (isFr
                ? `4. 4-Slots AMS (${filaments.length} coul.) : Réutilisez Baie A1→#${amsPlan.swaps[0].toSlot} (L#${amsPlan.swaps[0].windowStartLayer}-${amsPlan.swaps[0].windowEndLayer}).`
                : `4. 4-Slot AMS (${filaments.length} colors): Reuse Bay A1→Slot #${amsPlan.swaps[0].toSlot} during Layer #${amsPlan.swaps[0].windowStartLayer}-${amsPlan.swaps[0].windowEndLayer}.`)
            : null;
        const notes = isFr ? [
            '1. Remplissage (Infill) : 100% Rectiligne obligatoire pour la transmission lumineuse TD.',
            `2. Hauteur de couche : ${config.layerHeight.toFixed(2)} mm | Première couche : 0.20 mm | Parois : 1 à 2.`,
            '3. Imprimante 1 couleur : Insérez une pause M600 aux hauteurs Z indiquées ci-dessus.',
            amsLine || '4. Bambu Lab AMS : Importez le fichier .3MF (couleurs pré-assignées automatiquement).'
        ] : [
            '1. Infill Density: 100% Rectilinear (Mandatory for accurate TD light transmission).',
            `2. Layer Height: ${config.layerHeight.toFixed(2)} mm | First Layer: 0.20 mm | Wall Loops: 1 or 2.`,
            '3. Single-Extruder Printers: Add M600 filament swap pauses at the Z heights listed above.',
            amsLine || '4. Bambu Lab AMS / Multi-Color: Open the exported .3MF project (slots pre-mapped).'
        ];
        notes.forEach((line, lIdx) => {
            ctx.fillText(line, rightX + 52, footY + 56 + lIdx * 24);
        });

        // Render scannable mini QR badge on the right side of the footer box
        const qrMatrix = (activeQRStamp && activeQRStamp.matrix)
            ? activeQRStamp.matrix
            : generateRealQRCodeMatrix('https://studios-pro.com');
        if (qrMatrix && qrMatrix.length > 0) {
            const N = qrMatrix.length;
            const qBoxSize = 124;
            const qx = rightX + 34 + footW - qBoxSize - 16;
            const qy = footY + 16;
            drawRoundedRectPath(ctx, qx, qy, qBoxSize, qBoxSize, 8);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            const quiet = 3;
            const totalMods = N + quiet * 2;
            const modPx = qBoxSize / totalMods;
            ctx.fillStyle = '#000000';
            for (let r = 0; r < N; r++) {
                for (let c = 0; c < N; c++) {
                    if (qrMatrix[r][c]) {
                        ctx.fillRect(
                            qx + (c + quiet) * modPx,
                            qy + (r + quiet) * modPx,
                            Math.ceil(modPx),
                            Math.ceil(modPx)
                        );
                    }
                }
            }
        }

        cardCanvas.toBlob(blob => {
            if (blob) {
                downloadFileDirect(blob, `StudiosPro_Recipe_Card_${Date.now()}.png`);
                showToast(translations[currentLang].toastRecipeSaved);
            }
        }, 'image/png');
    } catch (err) {
        console.error('Recipe card generation error:', err);
    }
}

// ==========================================
// 🖼️ ULTRA-HD 4K MODEL-ONLY PNG EXPORT (PURE ARTWORK / PHOTO OR PURE 3D MODEL — NO RECIPE CARD)
// ==========================================
function downloadModelOnlyPNG(mode = 'auto') {
    try {
        const targetMode = (mode === 'auto') ? (centerViewMode === '2d' ? '2d' : '3d') : mode;

        if (targetMode === '2d' || !renderer || !scene || !camera) {
            if (!colorDataBuffer || !processedCanvas.width || !processedCanvas.height) return;
            const srcW = processedCanvas.width;
            const srcH = processedCanvas.height;

            // Render pure chromatic/TD filament artwork onto an offscreen canvas (NO symmetry guide lines, NO cursor handles)
            const rawCanvas = document.createElement('canvas');
            rawCanvas.width = srcW;
            rawCanvas.height = srcH;
            const rCtx = rawCanvas.getContext('2d');
            const imgData = rCtx.createImageData(srcW, srcH);
            const data = imgData.data;

            const parsedFilaments = filaments.map(f => ({
                rgb: hexToRgb(f.color),
                startPct: f.startPct,
                td: f.td || 3.0
            }));

            const snapFactor = ((config.boundarySharpness !== undefined ? config.boundarySharpness : config.colorSnap) ?? 78) / 100.0;
            const ditherPct = config.opticalDithering || 0;
            const tdBlendStrength = (config.tdOpticalBlend !== undefined ? config.tdOpticalBlend : 65) / 100.0;
            const baseZ = config.baseThickness;
            const maxReliefZ = config.maxRelief;

            const cachedBgRgb = computeBorderBackgroundRGB(colorDataBuffer, srcW, srcH);

            for (let pIdx = 0; pIdx < srcW * srcH; pIdx++) {
                const i = pIdx * 4;
                const colIdx = pIdx % srcW;
                const rowIdx = (pIdx / srcW) | 0;

                // Respect Die-Cut Model-Only Mode, Drilled Through-Holes & Plaque Cutout Shapes -> 100% Transparent!
                if (isPixelCutoutVoid(colIdx, rowIdx, srcW, srcH, cachedBgRgb)) {
                    data[i] = 0;
                    data[i + 1] = 0;
                    data[i + 2] = 0;
                    data[i + 3] = 0;
                    continue;
                }

                const r = colorDataBuffer[i];
                const g = colorDataBuffer[i + 1];
                const b = colorDataBuffer[i + 2];

                const userSlot = (filamentSlotBuffer && filamentSlotBuffer.length === srcW * srcH)
                    ? filamentSlotBuffer[pIdx]
                    : 255;

                if (userSlot !== 255 && parsedFilaments[userSlot]) {
                    const filRgb = parsedFilaments[userSlot].rgb;
                    data[i] = filRgb[0];
                    data[i + 1] = filRgb[1];
                    data[i + 2] = filRgb[2];
                    data[i + 3] = 255;
                } else {
                    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255.0;
                    if (config.colorMode === 'luminance') {
                        const v = Math.round(lum * 255);
                        data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = 255;
                    } else if (config.colorMode === 'stratified') {
                        const zVal = baseZ + lum * (maxReliefZ - baseZ);
                        const [tdR, tdG, tdB] = computeBeerLambertTDColor(
                            lum, zVal, baseZ, maxReliefZ, parsedFilaments, tdBlendStrength, colIdx, rowIdx, ditherPct
                        );
                        data[i] = tdR; data[i + 1] = tdG; data[i + 2] = tdB; data[i + 3] = 255;
                    } else {
                        const bestFilIdx = findClosestFilamentWithDither(r, g, b, colIdx, rowIdx, parsedFilaments, ditherPct);
                        const filRgb = parsedFilaments[bestFilIdx].rgb;
                        let outR = Math.round(r * (1 - snapFactor) + filRgb[0] * snapFactor);
                        let outG = Math.round(g * (1 - snapFactor) + filRgb[1] * snapFactor);
                        let outB = Math.round(b * (1 - snapFactor) + filRgb[2] * snapFactor);

                        if (tdBlendStrength > 0.02 && bestFilIdx > 0) {
                            const dz = Math.max(0.06, lum * (maxReliefZ - baseZ));
                            const tdMm = Math.max(0.4, parsedFilaments[bestFilIdx].td || 3.0);
                            const transmission = Math.exp(-3.1 * (dz / (tdMm * 0.55)));
                            const baseInfluence = Math.min(0.40, transmission * tdBlendStrength * 0.42);
                            const baseRgb = parsedFilaments[0].rgb;
                            outR = Math.round(outR * (1 - baseInfluence) + baseRgb[0] * baseInfluence);
                            outG = Math.round(outG * (1 - baseInfluence) + baseRgb[1] * baseInfluence);
                            outB = Math.round(outB * (1 - baseInfluence) + baseRgb[2] * baseInfluence);
                        }
                        data[i] = Math.max(0, Math.min(255, outR));
                        data[i + 1] = Math.max(0, Math.min(255, outG));
                        data[i + 2] = Math.max(0, Math.min(255, outB));
                        data[i + 3] = 255;
                    }
                }
            }
            rCtx.putImageData(imgData, 0, 0);

            // Auto-crop around the non-transparent model bounds if canvas background was removed
            let minX = srcW, minY = srcH, maxX = 0, maxY = 0, foundSolid = false;
            for (let y = 0; y < srcH; y++) {
                for (let x = 0; x < srcW; x++) {
                    if (data[(y * srcW + x) * 4 + 3] > 10) {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                        foundSolid = true;
                    }
                }
            }
            const padPx = foundSolid ? 6 : 0;
            const cx0 = foundSolid ? Math.max(0, minX - padPx) : 0;
            const cy0 = foundSolid ? Math.max(0, minY - padPx) : 0;
            const cw = foundSolid ? Math.min(srcW - cx0, (maxX - minX + 1) + padPx * 2) : srcW;
            const ch = foundSolid ? Math.min(srcH - cy0, (maxY - minY + 1) + padPx * 2) : srcH;

            // Export at Ultra-HD 4K Resolution (2400px longest edge)
            const ultraMax = 2400;
            const aspect = cw / Math.max(1, ch);
            const outW = aspect >= 1 ? ultraMax : Math.round(ultraMax * aspect);
            const outH = aspect >= 1 ? Math.round(ultraMax / aspect) : ultraMax;

            const ultraCanvas = document.createElement('canvas');
            ultraCanvas.width = outW;
            ultraCanvas.height = outH;
            const uCtx = ultraCanvas.getContext('2d');
            uCtx.imageSmoothingEnabled = false; // Crisp razor-sharp pixel-exact CAD / filament upscale
            uCtx.drawImage(rawCanvas, cx0, cy0, cw, ch, 0, 0, outW, outH);

            ultraCanvas.toBlob(blob => {
                if (blob) {
                    downloadFileDirect(blob, `StudiosPro_Artwork_Ultra4K_${Date.now()}.png`);
                    showToast(translations[currentLang].toastModelOnlyPNGSaved);
                }
            }, 'image/png');
        } else {
            // Pure 3D Sculpted Model Render at Ultra-HD 4K Super-Sampled Resolution (Tightly Cropped to Model, Zero Recipe Card/UI)
            const glCanvas = renderer.domElement;
            const origW = glCanvas.width;
            const origH = glCanvas.height;
            const origClearAlpha = renderer.getClearAlpha ? renderer.getClearAlpha() : 1;
            const prevBackground = scene.background;

            // Temporarily render at 4K resolution with transparent background so only the 3D model is captured
            const renderW = 2400;
            const renderH = 2400;
            const prevAspect = camera.aspect;
            camera.aspect = 1.0;
            camera.updateProjectionMatrix();
            scene.background = null;
            renderer.setSize(renderW, renderH, false);
            renderer.setClearColor(0x000000, 0);
            renderer.render(scene, camera);

            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = renderW;
            tempCanvas.height = renderH;
            const tCtx = tempCanvas.getContext('2d');
            tCtx.drawImage(glCanvas, 0, 0);

            // Restore viewport camera & renderer state immediately
            scene.background = prevBackground;
            camera.aspect = prevAspect;
            camera.updateProjectionMatrix();
            const container = document.getElementById('viewport-container');
            if (container) {
                renderer.setSize(container.clientWidth, container.clientHeight, false);
            } else {
                renderer.setSize(origW, origH, false);
            }
            renderer.setClearColor(0x090d16, origClearAlpha);
            renderer.render(scene, camera);

            // Auto-crop tightly around the non-transparent 3D model pixels
            const pixels = tCtx.getImageData(0, 0, renderW, renderH).data;
            let minX = renderW, minY = renderH, maxX = 0, maxY = 0;
            let found = false;
            for (let y = 0; y < renderH; y += 2) {
                for (let x = 0; x < renderW; x += 2) {
                    const a = pixels[(y * renderW + x) * 4 + 3];
                    if (a > 10) {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                        found = true;
                    }
                }
            }

            const pad = 48;
            const cropX = found ? Math.max(0, minX - pad) : 0;
            const cropY = found ? Math.max(0, minY - pad) : 0;
            const cropW = found ? Math.min(renderW - cropX, (maxX - minX) + pad * 2) : renderW;
            const cropH = found ? Math.min(renderH - cropY, (maxY - minY) + pad * 2) : renderH;

            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = cropW;
            finalCanvas.height = cropH;
            const fCtx = finalCanvas.getContext('2d');
            fCtx.drawImage(tempCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

            finalCanvas.toBlob(blob => {
                if (blob) {
                    downloadFileDirect(blob, `StudiosPro_3DModel_Ultra4K_${Date.now()}.png`);
                    showToast(translations[currentLang].toastModelOnlyPNGSaved);
                }
            }, 'image/png');
        }
    } catch (err) {
        console.error('Model-only PNG export error:', err);
    }
}

function copyShareLink() {
    const input = document.getElementById('share-input-url');
    if (!input) return;
    navigator.clipboard.writeText(input.value).then(() => {
        const btn = document.getElementById('txt-copy-share-link');
        if (btn) {
            btn.innerText = currentLang === 'fr' ? '✓ Copié !' : '✓ Copied!';
            setTimeout(() => btn.innerText = translations[currentLang].btnCopyLink, 2000);
        }
        showToast(translations[currentLang].toastCopied);
    });
}

function openSlicerModal() {
    closeAllModals();
    document.getElementById('slicer-modal').style.display = 'flex';
}

function showToast(text) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    document.getElementById('toast-text').innerText = text;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3200);
}

// ==========================================
// 📏 TD CALIBRATION STEP-WEDGE STL GENERATOR (0.20mm .. 3.00mm)
// ==========================================
function generateCalibrationWedgeSTL(options = {}) {
    const steps = Math.max(5, Math.min(20, options.steps || 15));
    const stepThicknessMm = options.stepMm || 0.20;
    const stepW = options.stepWidthMm || 10.0;
    const barDepthY = options.barDepthMm || 30.0;
    const totalW = steps * stepW;
    const xStart = -totalW * 0.5;
    const y0 = -barDepthY * 0.5;
    const y1 = barDepthY * 0.5;

    const tris = [];
    const pushRawTri = (a, b, c) => tris.push([a, b, c]);
    const pushQuad = (a, b, c, d) => {
        tris.push([a, b, c]);
        tris.push([a, c, d]);
    };

    const hAt = (k) => Number(((k + 1) * stepThicknessMm).toFixed(4));

    for (let k = 0; k < steps; k++) {
        const x0 = xStart + k * stepW;
        const x1 = x0 + stepW;
        const hk = hAt(k);
        const hPrev = k > 0 ? hAt(k - 1) : 0;

        // Top plateau (+Z)
        pushQuad([x0, y0, hk], [x1, y0, hk], [x1, y1, hk], [x0, y1, hk]);
        // Bottom plate (-Z)
        pushQuad([x0, y1, 0], [x1, y1, 0], [x1, y0, 0], [x0, y0, 0]);

        if (k === 0) {
            // Left cap (-X)
            pushQuad([x0, y1, 0], [x0, y0, 0], [x0, y0, hk], [x0, y1, hk]);
            // Front (-Y) and Back (+Y)
            pushQuad([x0, y0, 0], [x1, y0, 0], [x1, y0, hk], [x0, y0, hk]);
            pushQuad([x1, y1, 0], [x0, y1, 0], [x0, y1, hk], [x1, y1, hk]);
        } else {
            // Vertical step riser (-X)
            pushQuad([x0, y1, hPrev], [x0, y0, hPrev], [x0, y0, hk], [x0, y1, hk]);
            // Front wall (-Y): fan preserving exact shared seams at x0 and x1
            const fB0 = [x0, y0, 0], fM0 = [x0, y0, hPrev], fT0 = [x0, y0, hk];
            const fB1 = [x1, y0, 0], fT1 = [x1, y0, hk];
            pushRawTri(fB0, fB1, fM0);
            pushRawTri(fM0, fB1, fT0);
            pushRawTri(fT0, fB1, fT1);
            // Back wall (+Y): fan preserving exact shared seams at x0 and x1
            const bB0 = [x0, y1, 0], bM0 = [x0, y1, hPrev], bT0 = [x0, y1, hk];
            const bB1 = [x1, y1, 0], bT1 = [x1, y1, hk];
            pushRawTri(bB1, bB0, bM0);
            pushRawTri(bB1, bM0, bT0);
            pushRawTri(bB1, bT0, bT1);
        }

        if (k === steps - 1) {
            // Right cap (+X)
            pushQuad([x1, y0, 0], [x1, y1, 0], [x1, y1, hk], [x1, y0, hk]);
        }
    }

    const buffer = new ArrayBuffer(84 + tris.length * 50);
    const view = new DataView(buffer);
    const hdr = `Studios-Pro TD Step-Wedge ${hAt(0)}-${hAt(steps - 1)}mm`;
    for (let i = 0; i < Math.min(80, hdr.length); i++) view.setUint8(i, hdr.charCodeAt(i));
    view.setUint32(80, tris.length, true);
    let offset = 84;
    for (let i = 0; i < tris.length; i++) {
        const t = tris[i];
        writeStlTriangleToDataView(
            view, offset,
            t[0][0], t[0][1], t[0][2],
            t[1][0], t[1][1], t[1][2],
            t[2][0], t[2][1], t[2][2]
        );
        offset += 50;
    }
    return new Blob([buffer], { type: 'application/octet-stream' });
}

function downloadCalibrationWedgeSTL() {
    const blob = generateCalibrationWedgeSTL();
    downloadFileDirect(blob, `StudiosPro_TD_Calibration_Wedge_0.2-3.0mm.stl`);
    showToast(translations[currentLang].toastTdWedgeExported);
}

// ==========================================
// 💾 PROJECT FILE SAVE / LOAD (.spfp JSON)
// ==========================================
function typedArrayToBase64(typedArr) {
    if (!typedArr) return null;
    const u8 = new Uint8Array(typedArr.buffer, typedArr.byteOffset, typedArr.byteLength);
    let bin = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < u8.length; i += CHUNK) {
        bin += String.fromCharCode.apply(null, u8.subarray(i, Math.min(u8.length, i + CHUNK)));
    }
    return btoa(bin);
}

function base64ToUint8Array(b64) {
    if (!b64) return null;
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
}

function serializeProjectToSPFP() {
    let sourceDataUrl = null;
    try {
        if (sourceCanvas && sourceCanvas.width > 0) sourceDataUrl = sourceCanvas.toDataURL('image/png');
        else if (processedCanvas && processedCanvas.width > 0) sourceDataUrl = processedCanvas.toDataURL('image/png');
    } catch (_) {}

    return JSON.stringify({
        app: 'studios-pro-filament-painting',
        version: 1,
        savedAt: new Date().toISOString(),
        config: { ...config },
        filaments: filaments.map(f => ({ ...f })),
        activeFilamentSlot,
        studioMode,
        isDrawingTemplateActive,
        isCanvasUserEdited,
        editorSymmetryMode,
        activeQRStamp: activeQRStamp ? { ...activeQRStamp, matrix: activeQRStamp.matrix } : null,
        activeSoundwave: activeSoundwave ? { ...activeSoundwave, bars: [...activeSoundwave.bars] } : null,
        customAudioBars: customAudioBars ? [...customAudioBars] : null,
        sourceImageDataUrl: sourceDataUrl,
        bufWidth: processedCanvas ? processedCanvas.width : 0,
        bufHeight: processedCanvas ? processedCanvas.height : 0,
        buffers: {
            colorDataB64: typedArrayToBase64(colorDataBuffer),
            filamentSlotB64: typedArrayToBase64(filamentSlotBuffer),
            customZDeltaB64: typedArrayToBase64(customZDeltaBuffer),
            cutoutMaskB64: typedArrayToBase64(cutoutMaskBuffer),
            userEditMaskB64: typedArrayToBase64(userEditMaskBuffer)
        }
    });
}

function exportProjectSPFP() {
    const jsonStr = serializeProjectToSPFP();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    downloadFileDirect(blob, `StudiosPro_Project_${Date.now()}.spfp`);
    showToast(translations[currentLang].toastProjectSaved);
}

async function loadProjectFromSPFPJson(jsonTextOrObj) {
    const data = typeof jsonTextOrObj === 'string' ? JSON.parse(jsonTextOrObj) : jsonTextOrObj;
    if (!data || data.app !== 'studios-pro-filament-painting') {
        throw new Error('Invalid project file');
    }

    Object.assign(config, data.config || {});
    if (Array.isArray(data.filaments) && data.filaments.length >= 2) {
        filaments = data.filaments.map(f => ({ ...f }));
    }
    if (typeof data.activeFilamentSlot === 'number') activeFilamentSlot = data.activeFilamentSlot;
    if (data.studioMode) studioMode = data.studioMode;
    isDrawingTemplateActive = !!data.isDrawingTemplateActive;
    isCanvasUserEdited = !!data.isCanvasUserEdited;
    editorSymmetryMode = data.editorSymmetryMode || 'none';
    activeQRStamp = data.activeQRStamp || null;
    activeSoundwave = data.activeSoundwave || null;
    customAudioBars = data.customAudioBars || null;

    if (data.sourceImageDataUrl) {
        await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                sourceImage = img;
                if (sourceCanvas) {
                    sourceCanvas.width = img.width || 160;
                    sourceCanvas.height = img.height || 160;
                    const sctx = sourceCanvas.getContext('2d');
                    if (sctx && typeof sctx.drawImage === 'function') sctx.drawImage(img, 0, 0);
                }
                resolve();
            };
            img.onerror = () => resolve();
            img.src = data.sourceImageDataUrl;
        });
    }

    const bw = data.bufWidth || 0;
    const bh = data.bufHeight || 0;
    const bufs = data.buffers || {};
    if (bw > 0 && bh > 0 && processedCanvas) {
        processedCanvas.width = bw;
        processedCanvas.height = bh;
        const cU8 = base64ToUint8Array(bufs.colorDataB64);
        const fU8 = base64ToUint8Array(bufs.filamentSlotB64);
        const zU8 = base64ToUint8Array(bufs.customZDeltaB64);
        const cutU8 = base64ToUint8Array(bufs.cutoutMaskB64);
        const uU8 = base64ToUint8Array(bufs.userEditMaskB64);

        if (cU8) colorDataBuffer = new Uint8ClampedArray(cU8.buffer, cU8.byteOffset, cU8.byteLength);
        if (fU8) filamentSlotBuffer = new Uint8Array(fU8.buffer, fU8.byteOffset, fU8.byteLength);
        if (zU8) {
            const copyAb = zU8.buffer.slice(zU8.byteOffset, zU8.byteOffset + zU8.byteLength);
            customZDeltaBuffer = new Float32Array(copyAb);
        }
        if (cutU8) cutoutMaskBuffer = new Uint8Array(cutU8.buffer, cutU8.byteOffset, cutU8.byteLength);
        if (uU8) userEditMaskBuffer = new Uint8Array(uU8.buffer, uU8.byteOffset, uU8.byteLength);
        lastProcessedMeta = {
            sourceRef: sourceImage,
            rotation: config.rotation,
            flipX: config.flipX,
            flipY: config.flipY,
            cols: bw,
            rows: bh
        };
        if (typeof syncProcessedCanvasFromBuffer === 'function') syncProcessedCanvasFromBuffer();
    } else if (sourceImage) {
        processSourceImage({ skipHistory: true });
    }

    if (typeof syncAllControlsFromConfig === 'function') syncAllControlsFromConfig();
    if (typeof resetEditHistory === 'function') resetEditHistory();
    renderFilamentStackUI();
    updateFilamentSwatchesUI();
    generate3DReliefMesh();
    updateSlicerTable();
    if (centerViewMode === '2d') render2DEditorPreview();
    if (typeof switchStudioMode === 'function') switchStudioMode(studioMode);
    showToast(translations[currentLang].toastProjectLoaded);
    return true;
}

function handleProjectFileImport(event) {
    const file = event && event.target && event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
        try {
            await loadProjectFromSPFPJson(ev.target.result);
        } catch (err) {
            console.error('SPFP load error:', err);
            showToast(translations[currentLang].toastProjectError);
        } finally {
            if (event.target) event.target.value = '';
        }
    };
    reader.readAsText(file);
}

// ==========================================
// 📱 PREVIEW ON WALL (AR): OPTIMIZED COMPACT BINARY .GLB WRITER (~1.2MB vs 15.6MB)
// ==========================================
function buildDownsampledReliefForAR(g, maxGridVerts = 28000) {
    const ud = g.userData;
    const gCols = ud && ud.gridCols;
    const gRows = ud && ud.gridRows;
    if (!gCols || !gRows || (gCols * gRows <= maxGridVerts)) return null;

    const srcPos = g.attributes.position.array;
    const srcNorm = g.attributes.normal ? g.attributes.normal.array : null;
    const srcCol = g.attributes.color ? g.attributes.color.array : null;
    const srcActive = ud.activeCells;
    const srcCellCols = ud.cellCols || (gCols - 1);
    const srcCellRows = ud.cellRows || (gRows - 1);
    const origN = gCols * gRows;

    const stride = Math.max(2, Math.ceil(Math.sqrt((gCols * gRows) / maxGridVerts)));
    const sColIndices = [];
    for (let c = 0; c < gCols; c += stride) sColIndices.push(c);
    if (sColIndices[sColIndices.length - 1] !== gCols - 1) sColIndices.push(gCols - 1);

    const sRowIndices = [];
    for (let r = 0; r < gRows; r += stride) sRowIndices.push(r);
    if (sRowIndices[sRowIndices.length - 1] !== gRows - 1) sRowIndices.push(gRows - 1);

    const cols = sColIndices.length;
    const rows = sRowIndices.length;
    const N = cols * rows;

    const pos = new Float32Array(N * 2 * 3);
    const norm = new Float32Array(N * 2 * 3);
    const col = new Float32Array(N * 2 * 3);

    for (let r = 0; r < rows; r++) {
        const sr = sRowIndices[r];
        for (let c = 0; c < cols; c++) {
            const sc = sColIndices[c];
            const dstTop = r * cols + c;
            const dstBot = N + dstTop;
            const srcTop = sr * gCols + sc;
            const srcBot = origN + srcTop;

            const dt3 = dstTop * 3, db3 = dstBot * 3;
            const st3 = srcTop * 3, sb3 = srcBot * 3;

            pos[dt3] = srcPos[st3]; pos[dt3 + 1] = srcPos[st3 + 1]; pos[dt3 + 2] = srcPos[st3 + 2];
            pos[db3] = srcPos[sb3]; pos[db3 + 1] = srcPos[sb3 + 1]; pos[db3 + 2] = srcPos[sb3 + 2];

            if (srcNorm) {
                norm[dt3] = srcNorm[st3]; norm[dt3 + 1] = srcNorm[st3 + 1]; norm[dt3 + 2] = srcNorm[st3 + 2];
                norm[db3] = srcNorm[sb3]; norm[db3 + 1] = srcNorm[sb3 + 1]; norm[db3 + 2] = srcNorm[sb3 + 2];
            } else {
                norm[dt3] = 0; norm[dt3 + 1] = 0; norm[dt3 + 2] = 1;
                norm[db3] = 0; norm[db3 + 1] = 0; norm[db3 + 2] = -1;
            }

            if (srcCol) {
                col[dt3] = srcCol[st3]; col[dt3 + 1] = srcCol[st3 + 1]; col[dt3 + 2] = srcCol[st3 + 2];
                col[db3] = srcCol[sb3]; col[db3 + 1] = srcCol[sb3 + 1]; col[db3 + 2] = srcCol[sb3 + 2];
            } else {
                col[dt3] = 0.95; col[dt3 + 1] = 0.96; col[dt3 + 2] = 0.98;
                col[db3] = 0.72; col[db3 + 1] = 0.73; col[db3 + 2] = 0.76;
            }
        }
    }

    const cellCols = cols - 1;
    const cellRows = rows - 1;
    const active = new Uint8Array(cellCols * cellRows);
    for (let r = 0; r < cellRows; r++) {
        const srMid = Math.min(srcCellRows - 1, Math.floor((sRowIndices[r] + sRowIndices[r + 1]) * 0.5));
        for (let c = 0; c < cellCols; c++) {
            const scMid = Math.min(srcCellCols - 1, Math.floor((sColIndices[c] + sColIndices[c + 1]) * 0.5));
            active[r * cellCols + c] = srcActive ? srcActive[srMid * srcCellCols + scMid] : 1;
        }
    }

    const idx = [];
    for (let r = 0; r < cellRows; r++) {
        const rowOff = r * cellCols;
        for (let c = 0; c < cellCols; c++) {
            if (!active[rowOff + c]) continue;
            const tl = r * cols + c;
            const tr = tl + 1;
            const bl = (r + 1) * cols + c;
            const br = bl + 1;
            idx.push(tl, bl, tr, tr, bl, br);

            const b_tl = N + tl, b_tr = N + tr, b_bl = N + bl, b_br = N + br;
            idx.push(b_tl, b_tr, b_bl, b_tr, b_br, b_bl);

            if (r === 0 || !active[(r - 1) * cellCols + c]) idx.push(tl, tr, b_tl, tr, b_tr, b_tl);
            if (r === cellRows - 1 || !active[(r + 1) * cellCols + c]) idx.push(bl, b_bl, br, br, b_bl, b_br);
            if (c === 0 || !active[rowOff + (c - 1)]) idx.push(tl, b_tl, bl, bl, b_tl, b_bl);
            if (c === cellCols - 1 || !active[rowOff + (c + 1)]) idx.push(tr, br, b_tr, br, b_br, b_tr);
        }
    }

    return {
        pos: pos,
        norm: norm,
        col: col,
        idx: new Uint32Array(idx),
        defaultColor: [0.95, 0.96, 0.98]
    };
}

function generateWallARGlbBuffer() {
    if (!reliefMesh || !reliefMesh.geometry) {
        generate3DReliefMesh();
    }
    const SCALE_M = 0.001; // 140mm -> 0.14m true scale in AR

    const meshesToPack = [];
    if (reliefMesh && reliefMesh.geometry) {
        const g = reliefMesh.geometry;
        const compactAR = buildDownsampledReliefForAR(g, 28000);
        if (compactAR) {
            meshesToPack.push(compactAR);
        } else {
            meshesToPack.push({
                pos: g.attributes.position.array,
                norm: g.attributes.normal ? g.attributes.normal.array : null,
                col: g.attributes.color ? g.attributes.color.array : null,
                idx: g.index ? g.index.array : null,
                defaultColor: [0.95, 0.96, 0.98]
            });
        }
    }
    if (frameMesh && frameMesh.geometry && config.frameStyle !== 'none') {
        const fg = frameMesh.geometry;
        if (fg.attributes && fg.attributes.position && fg.attributes.position.count > 0) {
            meshesToPack.push({
                pos: fg.attributes.position.array,
                norm: fg.attributes.normal ? fg.attributes.normal.array : null,
                col: fg.attributes.color ? fg.attributes.color.array : null,
                idx: fg.index ? fg.index.array : null,
                defaultColor: [0.12, 0.16, 0.23]
            });
        }
    }

    if (meshesToPack.length === 0) return null;

    let totalVerts = 0;
    let totalIndices = 0;
    meshesToPack.forEach(m => {
        const vCount = Math.floor(m.pos.length / 3);
        totalVerts += vCount;
        totalIndices += m.idx ? m.idx.length : vCount;
    });

    const useUint16 = (totalVerts <= 65535);
    const outPos = new Float32Array(totalVerts * 3);
    const outNorm = new Float32Array(totalVerts * 3);
    // Use normalized VEC4 UNSIGNED_BYTE colors (4 bytes/vert vs 12 bytes Float32 -> 67% smaller + exact 4-byte glTF alignment!)
    const outCol = new Uint8Array(totalVerts * 4);
    const outIdx = useUint16 ? new Uint16Array(totalIndices) : new Uint32Array(totalIndices);

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    let vOff = 0;
    let iOff = 0;

    for (const m of meshesToPack) {
        const vCount = Math.floor(m.pos.length / 3);
        for (let v = 0; v < vCount; v++) {
            const p = v * 3;
            const d3 = (vOff + v) * 3;
            const d4 = (vOff + v) * 4;
            const x = m.pos[p] * SCALE_M;
            const y = m.pos[p + 1] * SCALE_M;
            const z = m.pos[p + 2] * SCALE_M;
            outPos[d3] = x; outPos[d3 + 1] = y; outPos[d3 + 2] = z;
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
            if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;

            if (m.norm) {
                outNorm[d3] = m.norm[p]; outNorm[d3 + 1] = m.norm[p + 1]; outNorm[d3 + 2] = m.norm[p + 2];
            } else {
                outNorm[d3] = 0; outNorm[d3 + 1] = 0; outNorm[d3 + 2] = 1;
            }
            const rF = m.col ? m.col[p] : m.defaultColor[0];
            const gF = m.col ? m.col[p + 1] : m.defaultColor[1];
            const bF = m.col ? m.col[p + 2] : m.defaultColor[2];
            outCol[d4] = Math.max(0, Math.min(255, Math.round(rF * 255)));
            outCol[d4 + 1] = Math.max(0, Math.min(255, Math.round(gF * 255)));
            outCol[d4 + 2] = Math.max(0, Math.min(255, Math.round(bF * 255)));
            outCol[d4 + 3] = 255;
        }
        if (m.idx) {
            for (let k = 0; k < m.idx.length; k++) outIdx[iOff++] = vOff + m.idx[k];
        } else {
            for (let k = 0; k < vCount; k++) outIdx[iOff++] = vOff + k;
        }
        vOff += vCount;
    }

    const posByteLen = outPos.byteLength;
    const normByteLen = outNorm.byteLength;
    const colByteLen = outCol.byteLength;
    const idxByteLen = outIdx.byteLength;
    const rawBinLen = posByteLen + normByteLen + colByteLen + idxByteLen;
    const binPad = (4 - (rawBinLen % 4)) % 4;
    const binLen = rawBinLen + binPad;

    const gltfJson = {
        asset: { version: '2.0', generator: 'Studios-Pro Filament Painting Studio' },
        scene: 0,
        scenes: [{ nodes: [0] }],
        nodes: [{ mesh: 0, name: 'FilamentPaintingAR' }],
        materials: [{
            name: 'FilamentPLA',
            pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0.05, roughnessFactor: 0.42 },
            doubleSided: true
        }],
        meshes: [{
            name: 'FilamentPaintingRelief',
            primitives: [{
                attributes: { POSITION: 0, NORMAL: 1, COLOR_0: 2 },
                indices: 3,
                material: 0
            }]
        }],
        buffers: [{ byteLength: binLen }],
        bufferViews: [
            { buffer: 0, byteOffset: 0, byteLength: posByteLen, target: 34962 },
            { buffer: 0, byteOffset: posByteLen, byteLength: normByteLen, target: 34962 },
            { buffer: 0, byteOffset: posByteLen + normByteLen, byteLength: colByteLen, target: 34962 },
            { buffer: 0, byteOffset: posByteLen + normByteLen + colByteLen, byteLength: idxByteLen, target: 34963 }
        ],
        accessors: [
            { bufferView: 0, componentType: 5126, count: totalVerts, type: 'VEC3', min: [minX, minY, minZ], max: [maxX, maxY, maxZ] },
            { bufferView: 1, componentType: 5126, count: totalVerts, type: 'VEC3' },
            { bufferView: 2, componentType: 5121, normalized: true, count: totalVerts, type: 'VEC4' },
            { bufferView: 3, componentType: useUint16 ? 5123 : 5125, count: totalIndices, type: 'SCALAR' }
        ]
    };

    const jsonBytes = new TextEncoder().encode(JSON.stringify(gltfJson));
    const jsonPad = (4 - (jsonBytes.length % 4)) % 4;
    const jsonChunkLen = jsonBytes.length + jsonPad;
    const totalGlbLen = 12 + 8 + jsonChunkLen + 8 + binLen;

    const glbBuf = new ArrayBuffer(totalGlbLen);
    const dv = new DataView(glbBuf);
    const outU8 = new Uint8Array(glbBuf);

    // Header
    dv.setUint32(0, 0x46546C67, true); // 'glTF'
    dv.setUint32(4, 2, true);
    dv.setUint32(8, totalGlbLen, true);

    // JSON Chunk
    dv.setUint32(12, jsonChunkLen, true);
    dv.setUint32(16, 0x4E4F534A, true); // 'JSON'
    outU8.set(jsonBytes, 20);
    for (let i = 0; i < jsonPad; i++) outU8[20 + jsonBytes.length + i] = 0x20;

    // BIN Chunk
    const binHeaderOff = 20 + jsonChunkLen;
    dv.setUint32(binHeaderOff, binLen, true);
    dv.setUint32(binHeaderOff + 4, 0x004E4942, true); // 'BIN\0'
    let binOff = binHeaderOff + 8;
    outU8.set(new Uint8Array(outPos.buffer), binOff); binOff += posByteLen;
    outU8.set(new Uint8Array(outNorm.buffer), binOff); binOff += normByteLen;
    outU8.set(new Uint8Array(outCol.buffer), binOff); binOff += colByteLen;
    outU8.set(new Uint8Array(outIdx.buffer), binOff);

    return glbBuf;
}

function openWallARPreview() {
    const glbBuffer = generateWallARGlbBuffer();
    if (!glbBuffer) return null;

    const dimsMm = {
        x: Math.round((config.width || 140) * 10) / 10,
        y: Math.round((config.height || 140) * 10) / 10,
        z: Math.round((config.maxRelief || 2.4) * 10) / 10
    };

    const transferId = 'fp_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
    const arPayload = {
        type: 'OPEN_AR_VIEWER',
        payload: {
            transferId: transferId,
            modelData: glbBuffer,
            extension: 'glb',
            isBinary: true,
            name: 'StudiosPro_Filament_Painting.glb',
            placement: 'wall',
            autoScale: 'fixed',
            dimensionsMm: dimsMm,
            sourceStudio: 'filament-painting-studio'
        }
    };

    const inIframe = (typeof window !== 'undefined' && window.parent && window.parent !== window);
    if (typeof window !== 'undefined' && typeof window.studiosProPostToHost === 'function') {
        window.studiosProPostToHost(arPayload);
    } else if (inIframe) {
        try { window.parent.postMessage(arPayload, '*'); } catch (_) {}
    }

    if (inIframe) {
        showToast(translations[currentLang].toastARLaunched);
    } else {
        downloadFileDirect(new Blob([glbBuffer], { type: 'model/gltf-binary' }), `StudiosPro_Filament_Painting_${Date.now()}.glb`);
        showToast(translations[currentLang].toastARStandalone);
    }
    return glbBuffer;
}

