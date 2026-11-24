// ==========================================
// 📦 EXPORT ENGINE: BAMBU/ORCA/PRUSA 3MF, STL, SPLIT SLABS, MURAL DOVETAIL & HTML 3D
// ==========================================
let _isExportRunning = false;
let _toastHideTimer = null;

function openExportModal() {
    closeAllModals();
    if (typeof flushPending3DMeshIfDirty === 'function') flushPending3DMeshIfDirty();
    const modal = document.getElementById('export-modal');
    if (modal) modal.style.display = 'flex';
}

function closeAllModals() {
    ['export-modal', 'slicer-modal', 'share-modal', 'camera-td-modal', 'spool-rack-modal', 'mockup-modal', 'timelapse-modal', 'cost-modal'].forEach(id => {
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
    if (_isExportRunning) return false;
    _isExportRunning = true;
    const pBox = document.getElementById('export-progress-box');
    const pBar = document.getElementById('export-progress-bar');
    const pText = document.getElementById('export-status-text');

    try {
        if (typeof flushPending3DMeshIfDirty === 'function') flushPending3DMeshIfDirty();
        const chkQ = document.getElementById('chk-export-quantize');
        const chkF = document.getElementById('chk-export-frame');
        const chkA = document.getElementById('chk-export-adaptive');
        const profSel = document.getElementById('select-slicer-profile');
        const murConnSel = document.getElementById('select-mural-connector');
        if (chkQ) config.exportQuantize = chkQ.checked;
        if (chkF) config.exportIncludeFrame = chkF.checked;
        if (chkA) config.adaptiveMesh = chkA.checked;
        if (profSel) config.slicerProfile = profSel.value;
        if (murConnSel) config.muralConnector = murConnSel.value;

        if (pBox) pBox.style.display = 'block';
        if (pBar) pBar.style.width = '22%';
        if (pText) pText.innerText = currentLang === 'fr' ? 'Échantillonnage CAD Haute-Définition...' : 'High-Definition CAD Resampling...';
        await new Promise(r => setTimeout(r, 40));

        const options = {
            quality: config.exportQuality,
            quantize: config.exportQuantize,
            includeFrame: config.exportIncludeFrame,
            adaptiveMesh: config.adaptiveMesh,
            slicerProfile: config.slicerProfile || 'bambu_ams',
            muralConnector: config.muralConnector || 'dovetail'
        };

        if (format === 'stl') {
            if (pBar) pBar.style.width = '62%';
            if (pText) pText.innerText = currentLang === 'fr' ? 'Génération du STL binaire étanche (Worker)...' : 'Building watertight binary STL (Worker)...';
            await new Promise(r => setTimeout(r, 30));
            const blob = await generateBinarySTLAsync(options);
            if (!blob || blob.size < 84) throw new Error('Empty STL geometry');
            downloadFileDirect(blob, `StudiosPro_Filament_Painting_${Date.now()}.stl`);
        } else if (format === '3mf') {
            if (pBar) pBar.style.width = '60%';
            if (pText) pText.innerText = currentLang === 'fr' ? 'Injection Bambu/Orca AMS + Auto-Swap G-Code + DEFLATE...' : 'Injecting Bambu/Orca AMS + Auto-Swap G-Code + DEFLATE...';
            await new Promise(r => setTimeout(r, 50));
            const blob = await generate3MFPackage(options);
            if (!blob || blob.size < 64) throw new Error('Empty 3MF package');
            downloadFileDirect(blob, `StudiosPro_Filament_Painting_${Date.now()}.3mf`);
        } else if (format === 'stl_split') {
            if (pBar) pBar.style.width = '60%';
            if (pText) pText.innerText = currentLang === 'fr' ? 'Découpe des solides étanches par filament...' : 'Slicing watertight per-filament STLs...';
            await new Promise(r => setTimeout(r, 50));
            const blob = await generateSplitLayerSTLsZip(options);
            if (!blob || blob.size < 64) throw new Error('Empty Split ZIP');
            downloadFileDirect(blob, `StudiosPro_Split_Layers_${Date.now()}.zip`);
        } else if (format === 'mural_zip') {
            const gridN = parseInt(document.getElementById('select-mural-grid')?.value, 10) || 2;
            if (pBar) pBar.style.width = '55%';
            if (pText) pText.innerText = currentLang === 'fr' ? `Création Mural ${gridN}×${gridN} (.3MF + connecteurs)...` : `Building ${gridN}×${gridN} Multi-Color .3MF Wall Mural...`;
            await new Promise(r => setTimeout(r, 50));
            const blob = await generateWallMuralZip({ ...options, gridN });
            if (!blob || blob.size < 64) throw new Error('Empty Mural ZIP');
            downloadFileDirect(blob, `StudiosPro_Wall_Mural_${gridN}x${gridN}_3MF_${Date.now()}.zip`);
        } else if (format === 'triptych_zip') {
            if (pBar) pBar.style.width = '55%';
            if (pText) pText.innerText = currentLang === 'fr' ? 'Création Triptyque 3 Panneaux (.3MF ZIP)...' : 'Building 3-Panel Wall Triptych (.3MF ZIP)...';
            await new Promise(r => setTimeout(r, 50));
            const blob = await generateWallTriptychZip(options);
            if (!blob || blob.size < 64) throw new Error('Empty Triptych ZIP');
            downloadFileDirect(blob, `StudiosPro_Wall_Triptych_3Panels_3MF_${Date.now()}.zip`);
        } else if (format === 'html_3d') {
            if (pBar) pBar.style.width = '65%';
            if (pText) pText.innerText = currentLang === 'fr' ? 'Compilation de la visionneuse 3D HTML autonome...' : 'Packaging standalone interactive 3D HTML showcase...';
            await new Promise(r => setTimeout(r, 40));
            // Call internal exporter directly so bridge.js _exportInFlight guard never blocks it!
            const ok = await exportStandaloneHTML3DInternal();
            if (!ok) throw new Error('HTML 3D export failed');
        } else {
            return false;
        }

        if (pBar) pBar.style.width = '100%';
        if (pText) pText.innerText = currentLang === 'fr' ? 'Exportation terminée !' : 'Export Complete!';
        await new Promise(r => setTimeout(r, 260));

        closeAllModals();
        showToast(format === 'mural_zip'
            ? (translations[currentLang]?.toastMuralExported || 'Wall Mural ZIP exported!')
            : (format === 'triptych_zip'
                ? (translations[currentLang]?.toastTriptychExported || '🖼️ 3-Panel Wall Triptych (.3MF ZIP) exported!')
                : (translations[currentLang]?.toastExportSuccess || 'Export complete!')));
        return true;
    } catch (err) {
        console.error('Export failed:', err);
        showToast(currentLang === 'fr' ? '⚠️ Erreur lors de l’exportation.' : '⚠️ Export error occurred.');
        return false;
    } finally {
        _isExportRunning = false;
        if (pBox) pBox.style.display = 'none';
    }
}

// ==========================================
// 🧱 UNIFIED ULTRA-HD WATERTIGHT SOLID GENERATOR (100% PARITY WITH 3D PREVIEW + Z-UP!)
// ==========================================
// Real Male + Female Blind Underside Dovetail Interlock (Zero visible front artwork seam + 0.25mm FDM clearance!)
function getMuralDovetailTabZ(baseZ) {
    return Math.min(Math.max(0.48, baseZ * 0.54), 1.10);
}

function computeMuralFemaleDovetailDepthMm(x, y, w, h, baseZ, tileCrop, connectorType) {
    if (!tileCrop || connectorType !== 'dovetail') return 0.0;
    const { rowTile, colTile } = tileCrop;
    const hw = w * 0.5, hh = h * 0.5;
    const clearXY = 0.28; // Real FDM slide-fit clearance per side
    const tabNeckHalf = 4.6 * 0.5 + clearXY;
    const tabHeadHalf = 7.4 * 0.5 + clearXY;
    const tabDepth = 4.2 + clearXY;
    const pocketZ = Math.min(baseZ - 0.36, getMuralDovetailTabZ(baseZ) + 0.16);
    if (pocketZ <= 0.20) return 0.0;

    // West interior edge (-X, colTile > 0): receives East male dovetails of neighbor (colTile - 1)
    if (colTile > 0) {
        const u = x - (-hw); // distance inward from West edge [0 .. tabDepth]
        if (u >= -0.05 && u <= tabDepth) {
            const frac = Math.max(0, Math.min(1, u / tabDepth));
            const halfW = tabNeckHalf + (tabHeadHalf - tabNeckHalf) * frac;
            if (Math.abs(y - (-h * 0.26)) <= halfW || Math.abs(y - (h * 0.26)) <= halfW) {
                return pocketZ;
            }
        }
    }

    // North interior edge (+Y, rowTile > 0): receives South male dovetails of neighbor (rowTile - 1)
    if (rowTile > 0) {
        const v = hh - y; // distance inward from North edge [0 .. tabDepth]
        if (v >= -0.05 && v <= tabDepth) {
            const frac = Math.max(0, Math.min(1, v / tabDepth));
            const halfW = tabNeckHalf + (tabHeadHalf - tabNeckHalf) * frac;
            if (Math.abs(x - (-w * 0.26)) <= halfW || Math.abs(x - (w * 0.26)) <= halfW) {
                return pocketZ;
            }
        }
    }
    return 0.0;
}

function buildInterlockingMuralConnectors(w, h, baseZ, tileCrop, connectorType) {
    if (!tileCrop || !connectorType || connectorType === 'none') return [];
    const { rowTile, colTile } = tileCrop;
    const gridCols = tileCrop.gridCols || tileCrop.gridN || 1;
    const gridRows = tileCrop.gridRows || tileCrop.gridN || 1;
    const tris = [];
    const hw = w * 0.5, hh = h * 0.5;
    const tabZ = getMuralDovetailTabZ(baseZ);

    if (connectorType === 'dovetail') {
        // Male dovetail alignment tongues on East & South interior edges [Z=0..tabZ]
        // (mating cleanly into underside female sockets on neighbor's West & North edges!)
        const tabNeckW = 4.6, tabHeadW = 7.4, tabDepth = 4.2;
        if (colTile < gridCols - 1) {
            [-h * 0.26, h * 0.26].forEach(ty => {
                const pts = [
                    [hw - 0.6, ty - tabNeckW * 0.5],
                    [hw + tabDepth, ty - tabHeadW * 0.5],
                    [hw + tabDepth, ty + tabHeadW * 0.5],
                    [hw - 0.6, ty + tabNeckW * 0.5]
                ];
                const v = [
                    [pts[0][0], pts[0][1], 0], [pts[1][0], pts[1][1], 0], [pts[2][0], pts[2][1], 0], [pts[3][0], pts[3][1], 0],
                    [pts[0][0], pts[0][1], tabZ], [pts[1][0], pts[1][1], tabZ], [pts[2][0], pts[2][1], tabZ], [pts[3][0], pts[3][1], tabZ]
                ];
                const fIdx = [0,2,1, 0,3,2, 4,5,6, 4,6,7, 0,1,5, 0,5,4, 2,3,7, 2,7,6, 0,4,7, 0,7,3, 1,2,6, 1,6,5];
                for (let fi = 0; fi < fIdx.length; fi += 3) tris.push([v[fIdx[fi]], v[fIdx[fi+1]], v[fIdx[fi+2]]]);
            });
        }
        if (rowTile < gridRows - 1) {
            [-w * 0.26, w * 0.26].forEach(tx => {
                const pts = [
                    [tx - tabNeckW * 0.5, -hh + 0.6],
                    [tx + tabNeckW * 0.5, -hh + 0.6],
                    [tx + tabHeadW * 0.5, -hh - tabDepth],
                    [tx - tabHeadW * 0.5, -hh - tabDepth]
                ];
                const v = [
                    [pts[0][0], pts[0][1], 0], [pts[1][0], pts[1][1], 0], [pts[2][0], pts[2][1], 0], [pts[3][0], pts[3][1], 0],
                    [pts[0][0], pts[0][1], tabZ], [pts[1][0], pts[1][1], tabZ], [pts[2][0], pts[2][1], tabZ], [pts[3][0], pts[3][1], tabZ]
                ];
                const fIdx = [0,2,1, 0,3,2, 4,5,6, 4,6,7, 0,1,5, 0,5,4, 2,3,7, 2,7,6, 0,4,7, 0,7,3, 1,2,6, 1,6,5];
                for (let fi = 0; fi < fIdx.length; fi += 3) tris.push([v[fIdx[fi]], v[fIdx[fi+1]], v[fIdx[fi+2]]]);
            });
        }
    } else if (connectorType === 'magnets') {
        // Rear magnetic alignment flange ears with Ø6.3mm magnet rings along shared interior edges
        const addEar = (ex, ey) => {
            const inPts = [], outPts = [];
            for (let s = 0; s < 20; s++) {
                const a = (s / 20) * Math.PI * 2;
                inPts.push([ex + Math.cos(a) * 3.15, ey + Math.sin(a) * 3.15]);
                outPts.push([ex + Math.cos(a) * 5.2, ey + Math.sin(a) * 5.2]);
            }
            tris.push(...buildClosedAnnularPrismTris(inPts, outPts, 0, Math.max(1.2, tabZ)));
        };
        if (colTile < gridCols - 1) addEar(hw + 1.5, 0);
        if (rowTile < gridRows - 1) addEar(0, -hh - 1.5);
    }
    return tris;
}

function buildWatertightReliefData(options = {}) {
    if (!sourceImage && (!processedCanvas.width || !processedCanvas.height)) return null;

    // Respect Export Quality pills properly (standard=220, hd=360, ultra=480)
    let maxRes = options.quality === 'standard' ? 220 : (options.quality === 'ultra' ? 480 : 360);
    if (options.tileCrop) {
        maxRes = options.quality === 'ultra' ? 256 : (options.quality === 'hd' ? 208 : 168);
    }
    if (activeQRStamp && !options.tileCrop) {
        maxRes = Math.max(maxRes, 288);
    }

    const gridCols = options.tileCrop ? (options.tileCrop.gridCols || options.tileCrop.gridN || 1) : 1;
    const gridRows = options.tileCrop ? (options.tileCrop.gridRows || options.tileCrop.gridN || 1) : 1;
    const w = Math.max(20, (config.width || 140) / gridCols);
    const h = Math.max(20, (config.height || 140) / gridRows);
    const plaqueAspect = h / w;

    // Symmetric resolution clamping (prevents memory explosion on tall/portrait images!)
    let targetCols, targetRows;
    if (w >= h) {
        targetCols = maxRes;
        targetRows = Math.max(64, Math.min(maxRes, Math.round(maxRes * plaqueAspect)));
    } else {
        targetRows = maxRes;
        targetCols = Math.max(64, Math.min(maxRes, Math.round(maxRes / plaqueAspect)));
    }

    const expCanvas = document.createElement('canvas');
    expCanvas.width = targetCols;
    expCanvas.height = targetRows;
    const ctx = expCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (processedCanvas && processedCanvas.width > 0) {
        if (options.tileCrop) {
            const { rowTile, colTile } = options.tileCrop;
            const sw = processedCanvas.width / gridCols;
            const sh = processedCanvas.height / gridRows;
            ctx.drawImage(processedCanvas, colTile * sw, rowTile * sh, sw, sh, 0, 0, targetCols, targetRows);
        } else {
            ctx.drawImage(processedCanvas, 0, 0, targetCols, targetRows);
        }
    } else if (sourceImage) {
        ctx.drawImage(sourceImage, 0, 0, targetCols, targetRows);
    }

    // REMOVED redundant double Gaussian blur so exports stay razor-sharp like the 3D preview!
    const imgData = ctx.getImageData(0, 0, targetCols, targetRows);
    const data = imgData.data;

    const cols = targetCols;
    const rows = targetRows;
    let baseZ = typeof getEffectiveRearBaseZ === 'function' ? getEffectiveRearBaseZ() : Math.max(0.20, config.baseThickness || 0.60);
    // Ensure dovetail murals have enough base thickness for strong underside blind sockets + continuous front roof!
    if (options.tileCrop && options.muralConnector === 'dovetail') {
        baseZ = Math.max(baseZ, 1.40);
    }
    const maxReliefZ = Math.max(baseZ + 0.4, config.maxRelief || 2.4);
    const layerH = Math.max(0.04, config.layerHeight || 0.08);
    const N = cols * rows;

    const positions = new Float32Array(N * 2 * 3);
    const reliefHeights = new Float32Array(N);
    const botHeights = new Float32Array(N);

    const parsedFilaments = filaments.map((f, idx) => {
        const { startZ } = (typeof getSlotStartZAndLayer === 'function')
            ? getSlotStartZAndLayer(idx)
            : { startZ: idx === 0 ? 0 : (baseZ + f.startPct * (maxReliefZ - baseZ)) };
        return {
            idx,
            color: f.color,
            rgb: hexToRgb(f.color),
            startPct: idx === 0 ? 0 : f.startPct,
            td: f.td || 3.0,
            startZ
        };
    });
    const baseRgbCache = parsedFilaments[0] ? parsedFilaments[0].rgb : [17, 24, 39];
    const ditherPct = config.opticalDithering !== undefined ? config.opticalDithering : 20;

    // Include removeCanvasBg & cameo_dome in background RGB computation (fixes die-cut export!)
    const needBg = (config.bgMode === 'flatten_bg' || config.bgMode === 'cameo_dome' || (config.sculpturalDome && config.sculpturalDome > 0) || config.removeCanvasBg);
    const cachedBgRgb = needBg
        ? computeBorderBackgroundRGB(colorDataBuffer || data, (colorDataBuffer && processedCanvas.width) ? processedCanvas.width : cols, (colorDataBuffer && processedCanvas.height) ? processedCanvas.height : rows)
        : [0, 0, 0];

    const globalColOff = options.tileCrop ? (options.tileCrop.colTile * (cols - 1)) : 0;
    const globalRowOff = options.tileCrop ? (options.tileCrop.rowTile * (rows - 1)) : 0;

    function getBestFilamentIndex(r, g, b, zVal, vertIdx) {
        let vc = 0, vr = 0;
        if (vertIdx !== undefined) {
            vc = vertIdx % cols;
            vr = Math.floor(vertIdx / cols);
            const gNormX = options.tileCrop
                ? (options.tileCrop.colTile + (vc / Math.max(1, cols - 1))) / gridCols
                : (vc / Math.max(1, cols - 1));
            const gNormY = options.tileCrop
                ? (options.tileCrop.rowTile + (vr / Math.max(1, rows - 1))) / gridRows
                : (vr / Math.max(1, rows - 1));
            const vnx = gNormX * 2.0 - 1.0;
            const vny = 1.0 - gNormY * 2.0;
            if (isOutsideOutlineShape(vnx, vny, config.outlineShape)) return 0;

            const qrSample = sampleActiveQRStamp(gNormX, gNormY);
            if (qrSample !== null) {
                return qrSample ? 0 : Math.max(0, parsedFilaments.length - 1);
            }
            const waveSample = sampleActiveSoundwave(gNormX, gNormY);
            if (waveSample !== null) {
                return (waveSample === true || waveSample === 1) ? Math.max(0, parsedFilaments.length - 1) : 0;
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
            // Global Bayer coordinates ensure seamless zero-step dithering across mural tile borders!
            return findClosestFilamentWithDither(r, g, b, globalColOff + vc, globalRowOff + vr, parsedFilaments, ditherPct);
        } else {
            let fIdx = 0;
            for (let k = 1; k < parsedFilaments.length; k++) {
                if (zVal >= parsedFilaments[k].startZ - 1e-4) fIdx = k;
            }
            return fIdx;
        }
    }

    const sharpAmt = (config.detailSharpness || 0) * 0.032;
    const activeTopo = options.tileCrop ? 'flat' : (config.topography || 'flat');
    const reliefSpan = maxReliefZ - baseZ;

    // Pass 1: Unified height computation (100% consistent with engine-3d.js!)
    for (let r = 0; r < rows; r++) {
        const y = h * 0.5 - (r / Math.max(1, rows - 1)) * h;
        const gNormY = options.tileCrop
            ? (options.tileCrop.rowTile + (r / Math.max(1, rows - 1))) / gridRows
            : (r / Math.max(1, rows - 1));
        const ny = 1.0 - gNormY * 2.0;

        for (let c = 0; c < cols; c++) {
            const x = -w * 0.5 + (c / Math.max(1, cols - 1)) * w;
            const gNormX = options.tileCrop
                ? (options.tileCrop.colTile + (c / Math.max(1, cols - 1))) / gridCols
                : (c / Math.max(1, cols - 1));
            const nx = gNormX * 2.0 - 1.0;
            const outsideShape = isOutsideOutlineShape(nx, ny, config.outlineShape);

            const topIdx = r * cols + c;
            const imgIdx = topIdx * 4;
            const red = data[imgIdx], green = data[imgIdx + 1], blue = data[imgIdx + 2];

            let lum = (0.299 * red + 0.587 * green + 0.114 * blue) / 255.0;
            let userFilSlot = null;
            let userZDelta = 0;

            if (processedCanvas && processedCanvas.width > 0) {
                const origC = Math.min(processedCanvas.width - 1, Math.round(gNormX * (processedCanvas.width - 1)));
                const origR = Math.min(processedCanvas.height - 1, Math.round(gNormY * (processedCanvas.height - 1)));
                const pIdx = origR * processedCanvas.width + origC;
                if (heightDataBuffer && heightDataBuffer.length > pIdx) lum = heightDataBuffer[pIdx];
                if (filamentSlotBuffer && filamentSlotBuffer[pIdx] !== 255 && filamentSlotBuffer[pIdx] < parsedFilaments.length) {
                    userFilSlot = filamentSlotBuffer[pIdx];
                }
                if (customZDeltaBuffer && customZDeltaBuffer[pIdx] !== 0) {
                    userZDelta = customZDeltaBuffer[pIdx];
                }
            }

            // Sharpen non-painted pixels (uses clamped neighbor indices so mural borders don't create seam steps!)
            if (sharpAmt > 0.001 && userFilSlot === null) {
                const rUp = Math.max(0, r - 1), rDn = Math.min(rows - 1, r + 1);
                const cLt = Math.max(0, c - 1), cRt = Math.min(cols - 1, c + 1);
                const lumAt = (rr, cc) => {
                    const ii = (rr * cols + cc) * 4;
                    return (0.299 * data[ii] + 0.587 * data[ii + 1] + 0.114 * data[ii + 2]) / 255.0;
                };
                const avgN = (lumAt(rUp, c) + lumAt(rDn, c) + lumAt(r, cLt) + lumAt(r, cRt)) * 0.25;
                lum = Math.max(0, Math.min(1, lum + (lum - avgN) * sharpAmt * 3.5));
            }

            if (config.bgMode === 'vignette' && userFilSlot === null) {
                const rSq = nx * nx + ny * ny;
                lum *= Math.max(0.08, 1.0 - rSq * 0.42);
            } else if (config.bgMode === 'flatten_bg' && userFilSlot === null) {
                const dBg = Math.sqrt(colorDistSq(red, green, blue, cachedBgRgb[0], cachedBgRgb[1], cachedBgRgb[2]));
                if (dBg < 55) lum *= (dBg / 55) * 0.35;
            } else if (config.bgMode === 'cameo_dome') {
                lum = computeSculpturalBasReliefZ(lum, nx, ny, red, green, blue, cachedBgRgb, Math.max(45, config.sculpturalDome || 45));
            }

            if (config.sculpturalDome > 0 && config.bgMode !== 'cameo_dome') {
                lum = computeSculpturalBasReliefZ(lum, nx, ny, red, green, blue, cachedBgRgb, config.sculpturalDome);
            }

            // Smart AI Subject Cutout Flatten mode parity with 3D viewport!
            if (config.smartCutoutActive && config.smartCutoutMode === 'flatten' && smartCutoutMask && processedCanvas && processedCanvas.width > 0) {
                const sc = Math.min(processedCanvas.width - 1, Math.round(gNormX * (processedCanvas.width - 1)));
                const sr = Math.min(processedCanvas.height - 1, Math.round(gNormY * (processedCanvas.height - 1)));
                if (smartCutoutMask[sr * processedCanvas.width + sc] === 1) lum = 0.0;
            }

            let z;
            if (config.colorMode === 'cmyw') {
                const ch = computeCMYWChannels(red, green, blue);
                z = baseZ + (1.0 - Math.pow(ch.lum, 0.72)) * reliefSpan;
            } else {
                z = baseZ + lum * reliefSpan;
            }

            if (userFilSlot !== null && (config.colorMode === 'stratified' || isDrawingTemplateActive)) {
                const filStartZ = baseZ + parsedFilaments[userFilSlot].startPct * reliefSpan;
                z = Math.min(maxReliefZ, filStartZ + (userFilSlot > 0 ? 0.16 : 0.0));
            }
            if (userZDelta !== 0) {
                z += userZDelta;
            }

            const waveSample = sampleActiveSoundwave(gNormX, gNormY);
            if (waveSample !== null && !outsideShape) {
                z = (waveSample === true || waveSample === 1) ? maxReliefZ : Math.max(baseZ, maxReliefZ - Math.max(0.24, layerH * 3));
            }

            const qrSample = sampleActiveQRStamp(gNormX, gNormY);
            if (qrSample !== null && !outsideShape) {
                if (config.colorMode === 'stratified') {
                    z = qrSample ? baseZ : maxReliefZ;
                } else {
                    z = qrSample ? maxReliefZ : Math.max(baseZ, maxReliefZ - Math.max(0.24, layerH * 3));
                }
            }

            // Slicer-phase aligned quantization preserving negative Z-Chisel engraving down to baseZ * 0.5!
            const minZClamp = Math.max(0.24, baseZ * 0.5);
            if (options.quantize || (config.layerQuantizeStep && config.layerQuantizeStep > 0)) {
                const qStep = (config.layerQuantizeStep && config.layerQuantizeStep > 0) ? config.layerQuantizeStep : layerH;
                z = quantizeHeightToSlicerLayer(z, qStep, minZClamp, maxReliefZ + 0.64);
            } else {
                z = Math.max(minZClamp, Math.min(maxReliefZ + 0.64, z));
            }

            if (outsideShape) z = baseZ * 0.55;
            reliefHeights[topIdx] = z;
            if (options.tileCrop) {
                const femalePocket = computeMuralFemaleDovetailDepthMm(x, y, w, h, baseZ, options.tileCrop, options.muralConnector);
                const rearMount = options.tileCrop.isTriptych ? computeRearCavityDepthMm(x, y, z, w, h, baseZ) : 0.0;
                botHeights[topIdx] = Math.max(femalePocket, rearMount);
            } else {
                botHeights[topIdx] = computeRearCavityDepthMm(x, y, z, w, h, baseZ);
            }
        }
    }

    // Pass 1.5: Anti-spike clamp (matching 3D viewport preview!)
    if (config.bilateralEdgeLock) {
        const tmpZ = new Float32Array(reliefHeights);
        for (let r = 1; r < rows - 1; r++) {
            for (let c = 1; c < cols - 1; c++) {
                const idx = r * cols + c;
                const zc = tmpZ[idx];
                const nAvg = (tmpZ[idx - 1] + tmpZ[idx + 1] + tmpZ[idx - cols] + tmpZ[idx + cols]) * 0.25;
                const maxDiff = Math.max(
                    Math.abs(zc - tmpZ[idx - 1]), Math.abs(zc - tmpZ[idx + 1]),
                    Math.abs(zc - tmpZ[idx - cols]), Math.abs(zc - tmpZ[idx + cols])
                );
                if (maxDiff > 0.72 && Math.abs(zc - nAvg) > 0.45) {
                    reliefHeights[idx] = nAvg + (zc - nAvg) * 0.52;
                }
            }
        }
    }

    // Pass 1.8: Write Z-UP Export Coordinates (arc / half_cyl / cylinder stand upright at Z = 0!)
    for (let r = 0; r < rows; r++) {
        const y = h * 0.5 - (r / Math.max(1, rows - 1)) * h;
        for (let c = 0; c < cols; c++) {
            const x = -w * 0.5 + (c / Math.max(1, cols - 1)) * w;
            const topIdx = r * cols + c;
            const z = reliefHeights[topIdx];
            const botZ = botHeights[topIdx];
            const [tx, ty, tz] = applyTopographyVertex(x, y, z, w, h, activeTopo, true);
            positions[topIdx * 3] = tx;
            positions[topIdx * 3 + 1] = ty;
            positions[topIdx * 3 + 2] = tz;

            const [bx, by, bz] = applyTopographyVertex(x, y, botZ, w, h, activeTopo, true);
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
    const procW = (processedCanvas && processedCanvas.width > 0) ? processedCanvas.width : cols;
    const procH = (processedCanvas && processedCanvas.height > 0) ? processedCanvas.height : rows;

    for (let r = 0; r < cellRows; r++) {
        const gCenterY = options.tileCrop
            ? (options.tileCrop.rowTile + ((r + 0.5) / Math.max(1, cellRows))) / gridRows
            : ((r + 0.5) / Math.max(1, cellRows));
        const origR = Math.min(procH - 1, Math.round(gCenterY * (procH - 1)));
        for (let c = 0; c < cellCols; c++) {
            const gCenterX = options.tileCrop
                ? (options.tileCrop.colTile + ((c + 0.5) / Math.max(1, cellCols))) / gridCols
                : ((c + 0.5) / Math.max(1, cellCols));
            const origC = Math.min(procW - 1, Math.round(gCenterX * (procW - 1)));
            if (!isPixelCutoutVoid(origC, origR, procW, procH, cachedBgRgb, baseRgbCache)) {
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

    for (let r = 0; r < cellRows; r++) {
        const rowOff = r * cellCols;
        const gCenterY = options.tileCrop
            ? (options.tileCrop.rowTile + ((r + 0.5) / Math.max(1, cellRows))) / gridRows
            : ((r + 0.5) / Math.max(1, cellRows));
        for (let c = 0; c < cellCols; c++) {
            if (activeCells[rowOff + c] === 0) continue;

            const wrapEast = isClosedCyl && (c === cellCols - 1);
            const tl = r * cols + c;
            const tr = wrapEast ? (r * cols) : (tl + 1);
            const bl = (r + 1) * cols + c;
            const br = wrapEast ? ((r + 1) * cols) : (bl + 1);

            const gCenterX = options.tileCrop
                ? (options.tileCrop.colTile + ((c + 0.5) / Math.max(1, cellCols))) / gridCols
                : ((c + 0.5) / Math.max(1, cellCols));
            const qrCell = sampleActiveQRStamp(gCenterX, gCenterY);
            const waveCell = sampleActiveSoundwave(gCenterX, gCenterY);

            let filIdx1, filIdx2;
            if (qrCell !== null) {
                const qrFil = qrCell ? 0 : Math.max(0, parsedFilaments.length - 1);
                filIdx1 = qrFil;
                filIdx2 = qrFil;
            } else if (waveCell !== null) {
                const waveFil = (waveCell === true || waveCell === 1) ? Math.max(0, parsedFilaments.length - 1) : 0;
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
        includeMounting: !!options.includeFrame,
        tileCrop: options.tileCrop,
        previewMode: false
    });
    let frameTriangles = cad.combined;
    if (options.tileCrop && options.muralConnector && options.muralConnector !== 'none') {
        const connTris = buildInterlockingMuralConnectors(w, h, baseZ, options.tileCrop, options.muralConnector);
        if (connTris.length > 0) frameTriangles = [...frameTriangles, ...connTris];
    }

    return {
        positions,
        indices,
        triangleFilamentIdx,
        vertCount: N * 2,
        triCount: totalTriangles,
        frameTriangles,
        baseZ,
        maxReliefZ,
        reliefHeights,
        botHeights,
        splitMeta: { activeCells, cellFil1, cellFil2, cellRows, cellCols, cols, rows, N, isClosedCyl, w, h, activeTopo }
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
    // Float32Array (50% memory vs Float64Array) + Transferable zero-copy!
    const frameFlat = new Float32Array(frameCount * 9);
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
            const workerRef = _stlWorkerInstance;
            const jobId = ++_stlWorkerJobId;

            const cleanup = () => {
                clearTimeout(timer);
                try {
                    workerRef.removeEventListener('message', onMsg);
                    workerRef.removeEventListener('error', onErr);
                } catch (_) {}
            };

            const timer = setTimeout(() => {
                cleanup();
                try { workerRef.terminate(); } catch (_) {}
                if (_stlWorkerInstance === workerRef) _stlWorkerInstance = null;
                finishFallback();
            }, 25000);

            const onMsg = (e) => {
                if (!e || !e.data || e.data.id !== jobId) return;
                cleanup();
                if (settled) return;
                settled = true;
                if (e.data.ok && e.data.buffer) {
                    resolve(new Blob([e.data.buffer], { type: 'application/octet-stream' }));
                } else {
                    resolve(new Blob([packBinaryStlLocal(solidData)], { type: 'application/octet-stream' }));
                }
            };
            const onErr = () => {
                cleanup();
                try { workerRef.terminate(); } catch (_) {}
                if (_stlWorkerInstance === workerRef) _stlWorkerInstance = null;
                finishFallback();
            };

            workerRef.addEventListener('message', onMsg);
            workerRef.addEventListener('error', onErr);
            const posCopy = new Float32Array(positions);
            const idxCopy = new Uint32Array(indices);
            workerRef.postMessage({
                type: 'PACK_STL',
                id: jobId,
                headerStr: 'Studios-Pro 3D Ultra-HD Watertight Filament Painting',
                triCount,
                frameCount,
                positions: posCopy,
                indices: idxCopy,
                frameFlat
            }, [posCopy.buffer, idxCopy.buffer, frameFlat.buffer]);
        } catch (_) {
            finishFallback();
        }
    });
}

// ==========================================
// 🎁 AUTHENTIC BAMBU STUDIO / ORCASLICER / PRUSASLICER MULTI-COLOR + AUTO-SWAP .3MF
// ==========================================
// Standard Bambu Studio / OrcaSlicer / PrusaSlicer 4-bit triangle paint_color hex codes:
// Extruder 1 (base) -> omitted; Extruder 2 -> "8"; Extruder 3 -> "0C"; Extruder 4 -> "1C"; Extruder 5 -> "2C"; Extruder 6 -> "3C"
const BAMBU_PAINT_COLOR_CODES = ['', '8', '0C', '1C', '2C', '3C', '4C', '5C'];

function renderCompact3MFThumbnailBase64(maxPx = 512) {
    try {
        if (!renderer || !scene || !camera) return null;
        renderer.render(scene, camera);
        const src = renderer.domElement;
        if (!src || !src.width || !src.height) return null;
        const scale = Math.min(1, maxPx / Math.max(src.width, src.height));
        const tw = Math.max(64, Math.round(src.width * scale));
        const th = Math.max(64, Math.round(src.height * scale));
        const thumbCvs = document.createElement('canvas');
        thumbCvs.width = tw;
        thumbCvs.height = th;
        const tctx = thumbCvs.getContext('2d');
        tctx.drawImage(src, 0, 0, src.width, src.height, 0, 0, tw, th);
        return thumbCvs.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
    } catch (_) {
        return null;
    }
}

function buildBambuCustomGcodePerLayerXML(slicerProfile) {
    const isManualM600 = (slicerProfile === 'manual_m600' || slicerProfile === 'cura_pause');
    const lines = ['<?xml version="1.0" encoding="utf-8"?>', '<custom_gcodes_per_print_z>'];

    // Emit exact layer swap entries for Stratified / HueForge mode (or manual M600 profile)
    if (config.colorMode === 'stratified' || isManualM600) {
        for (let idx = 1; idx < filaments.length; idx++) {
            const { startZ, startLayer } = getSlotStartZAndLayer(idx);
            const fil = filaments[idx];
            const hex = (fil.color || '#ffffff').slice(0, 7).toUpperCase();
            if (isManualM600) {
                lines.push(`  <plate id="1">`);
                lines.push(`    <layer top_z="${startZ.toFixed(2)}" type="3" extruder="1" color="${hex}" extra="M600 ; Swap to Slot ${idx + 1}: ${window.safeEscapeHtml(fil.name)} (Layer ${startLayer})" gcode="M600"/>`);
                lines.push(`  </plate>`);
            } else {
                // Bambu Studio / OrcaSlicer / PrusaSlicer native AMS automatic filament change (type="2", extruder=1-based)
                const amsSlot = (slicerProfile === 'bambu_ams' || slicerProfile === 'bambu_ams_lite')
                    ? ((idx % 4) + 1)
                    : (idx + 1);
                lines.push(`  <plate id="1">`);
                lines.push(`    <layer top_z="${startZ.toFixed(2)}" type="2" extruder="${amsSlot}" color="${hex}" extra="Auto AMS Swap -> Slot ${idx + 1}: ${window.safeEscapeHtml(fil.name)} (Layer ${startLayer})" gcode=""/>`);
                lines.push(`  </plate>`);
            }
        }
    }

    // Optional NFC cavity pause at Z = 0.60mm
    if (config.nfcPocket && (!config.topography || config.topography === 'flat')) {
        lines.push(`  <plate id="1">`);
        lines.push(`    <layer top_z="0.60" type="1" extruder="1" color="" extra="PAUSE: Insert 25mm NFC Tag" gcode="M400 U1"/>`);
        lines.push(`  </plate>`);
    }

    lines.push('</custom_gcodes_per_print_z>');
    return lines.join('\n');
}

async function generate3MFPackage(options = {}) {
    const solidData = buildWatertightReliefData(options);
    if (!solidData) return new Blob();

    const { positions, indices, triangleFilamentIdx, vertCount, triCount, frameTriangles } = solidData;
    const zip = createArchiveZip();
    const slicerProfile = options.slicerProfile || config.slicerProfile || 'bambu_ams';
    const isChromaticPaint = (config.colorMode === 'chromatic');

    const objName = options.tileCrop
        ? `Mural_Tile_R${options.tileCrop.rowTile + 1}_C${options.tileCrop.colTile + 1}`
        : `Filament_Painting_Relief`;

    const thumbB64 = renderCompact3MFThumbnailBase64(512);

    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
  <Default Extension="config" ContentType="application/vnd.bambulab.bambustudio.config+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
</Types>`);

    const thumbRelLine = thumbB64
        ? '\n  <Relationship Target="/Metadata/thumbnail.png" Id="rel1" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/thumbnail"/>'
        : '';
    zip.folder('_rels').file('.rels', `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>${thumbRelLine}
</Relationships>`);

    // Compact relief vertices
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
        const paintCode = (isChromaticPaint && filIdx > 0 && BAMBU_PAINT_COLOR_CODES[filIdx]) ? BAMBU_PAINT_COLOR_CODES[filIdx] : '';
        if (paintCode) {
            triChunks[f] = `<triangle v1="${v1}" v2="${v2}" v3="${v3}" pid="1" p1="${filIdx}" paint_color="${paintCode}" slic3rpe:mmu_segmentation="${paintCode}"/>\n`;
        } else {
            triChunks[f] = `<triangle v1="${v1}" v2="${v2}" v3="${v3}" pid="1" p1="${filIdx}"/>\n`;
        }
    }

    const colorChunks = ['<m:colorgroup id="1">\n'];
    filaments.forEach(fil => {
        const hexColor = (fil.color || '#ffffff').slice(0, 7).toUpperCase();
        colorChunks.push(`  <m:color color="${hexColor}" />\n`);
    });
    colorChunks.push('</m:colorgroup>');

    // Weld Outer_Frame_Mounting vertices via spatial hash -> 100% WATERTIGHT MANIFOLD 3MF object!
    let frameObjectXML = '';
    const hasFrameObj = (frameTriangles && frameTriangles.length > 0);
    if (hasFrameObj) {
        const weldMap = new Map();
        const frameVertChunks = [];
        const frameTriChunks = [];
        let fVertCount = 0;
        const weldVert = (pt) => {
            const xS = pt[0].toFixed(3), yS = pt[1].toFixed(3), zS = pt[2].toFixed(3);
            const key = `${xS},${yS},${zS}`;
            let idx = weldMap.get(key);
            if (idx === undefined) {
                idx = fVertCount++;
                weldMap.set(key, idx);
                frameVertChunks.push(`<vertex x="${xS}" y="${yS}" z="${zS}"/>\n`);
            }
            return idx;
        };
        for (let fi = 0; fi < frameTriangles.length; fi++) {
            const tri = frameTriangles[fi];
            const a = weldVert(tri[0]), b = weldVert(tri[1]), c = weldVert(tri[2]);
            if (a !== b && b !== c && a !== c) {
                frameTriChunks.push(`<triangle v1="${a}" v2="${b}" v3="${c}" pid="1" p1="0"/>\n`);
            }
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
    }

    // Wrap Relief (id=2) + Frame (id=3) inside unified Assembly (id=1) so Slicer Auto-Arrange NEVER separates them!
    const assemblyXML = hasFrameObj ? `
    <object id="1" name="${objName}_Assembly" type="model">
      <components>
        <component objectid="2"/>
        <component objectid="3"/>
      </components>
    </object>` : '';
    const buildItemsXML = hasFrameObj ? '<item objectid="1"/>' : '<item objectid="2"/>';

    const modelXML = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US"
  xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"
  xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02"
  xmlns:BambuStudio="http://schemas.bambulab.com/package/2021"
  xmlns:slic3rpe="http://schemas.slic3r.org/3mf/2017/06">
  <metadata name="BambuStudio:3mfVersion">1</metadata>
  <metadata name="Title">StudiosPro_3D_Filament_Painting</metadata>
  <metadata name="Application">Studios-Pro Filament Painting Studio</metadata>
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
    </object>${frameObjectXML}${assemblyXML}
  </resources>
  <build>
    ${buildItemsXML}
  </build>
</model>`;

    zip.folder('3D').file('3dmodel.model', modelXML);

    // Bambu Studio / OrcaSlicer native project_settings.config (filament colors + 100% infill + exact layer heights!)
    const projectSettingsObj = {
        filament_colour: filaments.map(f => (f.color || '#ffffff').slice(0, 7).toUpperCase()),
        filament_type: filaments.map(() => 'PLA'),
        filament_vendor: filaments.map(f => (f.name || 'Studios-Pro').split(' ')[0]),
        layer_height: String((config.layerHeight || 0.08).toFixed(2)),
        initial_layer_print_height: String((config.firstLayerHeight || 0.20).toFixed(2)),
        sparse_infill_density: '100%',
        sparse_infill_pattern: 'rectilinear',
        wall_loops: '1',
        top_shell_layers: '0',
        bottom_shell_layers: '1',
        enable_prime_tower: isChromaticPaint ? '1' : '0'
    };
    const metaDir = zip.folder('Metadata');
    metaDir.file('project_settings.config', JSON.stringify(projectSettingsObj, null, 2));

    // Bambu Studio / OrcaSlicer / PrusaSlicer exact layer-swap G-code injection!
    metaDir.file('custom_gcode_per_print_z.xml', buildBambuCustomGcodePerLayerXML(slicerProfile));

    const filamentMetadataLines = filaments.map((fil, idx) => {
        const { startZ, startLayer } = getSlotStartZAndLayer(idx);
        return `    <metadata key="studios_pro_slot_${idx + 1}" value="${(fil.color || '#ffffff').slice(0, 7).toUpperCase()} | ${startZ.toFixed(2)}mm | L${startLayer} | TD ${(fil.td || 2.0).toFixed(1)}mm"/>`;
    }).join('\n');

    const rootObjId = hasFrameObj ? '1' : '2';
    const partsXML = hasFrameObj
        ? `    <part id="2" subtype="normal_part"><metadata key="name" value="${objName}"/><metadata key="extruder" value="1"/></part>
    <part id="3" subtype="normal_part"><metadata key="name" value="Outer_Frame_Mounting"/><metadata key="extruder" value="1"/></part>`
        : `    <part id="2" subtype="normal_part"><metadata key="name" value="${objName}"/><metadata key="extruder" value="1"/></part>`;

    const modelSettingsConfig = `<?xml version="1.0" encoding="UTF-8"?>
<config>
  <object id="${rootObjId}">
    <metadata key="name" value="${objName}"/>
    <metadata key="extruder" value="1"/>
${filamentMetadataLines}
${partsXML}
  </object>
  <plate>
    <metadata key="plater_id" value="1"/>
    <metadata key="plater_name" value="Plate 1"/>
    <metadata key="thumbnail_file" value="Metadata/plate_1.png"/>
    <model_instance>
      <metadata key="object_id" value="${rootObjId}"/>
      <metadata key="instance_id" value="0"/>
    </model_instance>
  </plate>
</config>`;
    metaDir.file('model_settings.config', modelSettingsConfig);

    const sliceInfoConfig = `<?xml version="1.0" encoding="UTF-8"?>
<config>
  <header>
    <metadata key="major_version" value="1"/>
    <metadata key="minor_version" value="9"/>
  </header>
  <plate>
    <metadata key="index" value="1"/>
  </plate>
</config>`;
    metaDir.file('slice_info.config', sliceInfoConfig);

    if (thumbB64) {
        metaDir.file('thumbnail.png', thumbB64, { base64: true });
        metaDir.file('plate_1.png', thumbB64, { base64: true });
    }

    // DEFLATE level 6 compression -> 5x to 10x smaller .3mf files!
    return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

// ==========================================
// 🗂️ SPLIT LAYER STLS ZIP ARCHIVE (HORIZONTAL Z-SLABS IN STRATIFIED + COLUMNS IN CHROMATIC + FRAME!)
// ==========================================
function buildHorizontalSlabStlBuffer(solidData, zLow, zHigh, extraTris, headerTitle) {
    const { reliefHeights, botHeights, splitMeta } = solidData;
    const { activeCells, cellRows, cellCols, cols, rows, isClosedCyl, w, h, activeTopo } = splitMeta;
    const tris = [];
    const pushQuad = (a, b, c, d) => { tris.push([a, b, c]); tris.push([a, c, d]); };
    const ptAt = (r, c, z) => {
        const x = -w * 0.5 + (c / Math.max(1, cols - 1)) * w;
        const y = h * 0.5 - (r / Math.max(1, rows - 1)) * h;
        return applyTopographyVertex(x, y, z, w, h, activeTopo, true);
    };

    const slabActive = new Uint8Array(cellRows * cellCols);
    for (let r = 0; r < cellRows; r++) {
        for (let c = 0; c < cellCols; c++) {
            const ci = r * cellCols + c;
            if (!activeCells[ci]) continue;
            const tl = r * cols + c;
            const tr = (isClosedCyl && c === cellCols - 1) ? (r * cols) : (tl + 1);
            const bl = tl + cols;
            const br = (isClosedCyl && c === cellCols - 1) ? ((r + 1) * cols) : (bl + 1);
            const maxCellZ = Math.max(reliefHeights[tl], reliefHeights[tr], reliefHeights[bl], reliefHeights[br]);
            if (maxCellZ > zLow + 0.005) slabActive[ci] = 1;
        }
    }

    const clampTop = (vIdx) => Math.max(zLow, Math.min(zHigh, reliefHeights[vIdx]));
    const clampBot = (vIdx) => Math.max(zLow, Math.min(zHigh, botHeights[vIdx]));

    for (let r = 0; r < cellRows; r++) {
        for (let c = 0; c < cellCols; c++) {
            const ci = r * cellCols + c;
            if (!slabActive[ci]) continue;
            const cNext = (isClosedCyl && c === cellCols - 1) ? 0 : (c + 1);
            const tl = r * cols + c, tr = r * cols + cNext, bl = (r + 1) * cols + c, br = (r + 1) * cols + cNext;

            const tTL = ptAt(r, c, clampTop(tl)), tTR = ptAt(r, cNext, clampTop(tr));
            const tBL = ptAt(r + 1, c, clampTop(bl)), tBR = ptAt(r + 1, cNext, clampTop(br));
            const bTL = ptAt(r, c, clampBot(tl)), bTR = ptAt(r, cNext, clampBot(tr));
            const bBL = ptAt(r + 1, c, clampBot(bl)), bBR = ptAt(r + 1, cNext, clampBot(br));

            // Top CCW + Bottom CW
            tris.push([tTL, tBL, tTR], [tTR, tBL, tBR]);
            tris.push([bTL, bTR, bBL], [bTR, bBR, bBL]);

            // Boundary side walls
            if (r === 0 || !slabActive[(r - 1) * cellCols + c]) pushQuad(tTL, tTR, bTR, bTL);
            if (r === cellRows - 1 || !slabActive[(r + 1) * cellCols + c]) pushQuad(tBL, bBL, bBR, tBR);
            if (!isClosedCyl) {
                if (c === 0 || !slabActive[r * cellCols + (c - 1)]) pushQuad(tTL, bTL, bBL, tBL);
                if (c === cellCols - 1 || !slabActive[r * cellCols + (c + 1)]) pushQuad(tTR, tBR, bBR, bTR);
            }
        }
    }

    if (extraTris && extraTris.length) {
        for (let i = 0; i < extraTris.length; i++) tris.push(extraTris[i]);
    }
    if (tris.length === 0) return null;

    const buffer = new ArrayBuffer(84 + tris.length * 50);
    const view = new DataView(buffer);
    for (let i = 0; i < headerTitle.length && i < 80; i++) view.setUint8(i, headerTitle.charCodeAt(i) & 0x7F);
    view.setUint32(80, tris.length, true);
    let offset = 84;
    for (let i = 0; i < tris.length; i++) {
        const t = tris[i];
        writeStlTriangleToDataView(view, offset, t[0][0], t[0][1], t[0][2], t[1][0], t[1][1], t[1][2], t[2][0], t[2][1], t[2][2]);
        offset += 50;
    }
    return buffer;
}

async function generateSplitLayerSTLsZip(options = {}) {
    const zip = createArchiveZip();
    const solidData = buildWatertightReliefData({ ...options, preserveGridForSplit: true });
    if (!solidData) return new Blob();

    const { positions, frameTriangles, splitMeta, maxReliefZ } = solidData;

    if (config.colorMode === 'stratified') {
        // TRUE HORIZONTAL Z-SLAB SLICING for Stratified / HueForge mode!
        for (let idx = 0; idx < filaments.length; idx++) {
            const fil = filaments[idx];
            const zLow = (idx === 0) ? 0.0 : getSlotStartZAndLayer(idx).startZ;
            const zHigh = (idx + 1 < filaments.length) ? getSlotStartZAndLayer(idx + 1).startZ : (maxReliefZ + 0.70);
            const extra = (idx === 0 && options.includeFrame) ? frameTriangles : [];
            const buf = buildHorizontalSlabStlBuffer(solidData, zLow, zHigh, extra, `Studios-Pro Z-Slab ${idx + 1} ${fil.name}`);
            if (buf) {
                const safeName = fil.name.replace(/[^a-zA-Z0-9]/g, '_');
                zip.file(`Slot_${idx + 1}_${safeName}_(${zLow.toFixed(2)}-${Math.min(maxReliefZ, zHigh).toFixed(2)}mm).stl`, buf);
            }
        }
    } else {
        const { activeCells, cellFil1, cellFil2, cellRows, cellCols, cols, N, isClosedCyl } = splitMeta;
        const perFilamentTris = Array.from({ length: filaments.length }, () => []);
        const emitTri = (fIdx, a, b, c) => {
            if (fIdx >= 0 && fIdx < perFilamentTris.length) perFilamentTris[fIdx].push(a, b, c);
        };
        const emitQuad = (fIdx, a, b, c, d) => { emitTri(fIdx, a, b, c); emitTri(fIdx, c, b, d); };

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
                const f1 = cellFil1[cellIdx], f2 = cellFil2[cellIdx];

                emitTri(f1, tl, bl, tr);
                emitTri(f1, b_tl, b_tr, b_bl);
                const nFil = (r > 0 && activeCells[(r - 1) * cellCols + c] === 1) ? cellFil2[(r - 1) * cellCols + c] : 255;
                if (nFil !== f1) { emitTri(f1, tl, tr, b_tl); emitTri(f1, tr, b_tr, b_tl); }
                const wc = c > 0 ? c - 1 : (isClosedCyl ? cellCols - 1 : -1);
                const wFil = (wc >= 0 && activeCells[rowOff + wc] === 1) ? cellFil2[rowOff + wc] : 255;
                if (wFil !== f1) emitQuad(f1, tl, b_tl, bl, b_bl);
                if (f2 !== f1) emitQuad(f1, bl, b_bl, tr, b_tr);

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
            const extraFrame = (filIdx === 0 && options.includeFrame) ? frameTriangles : [];
            const triCountFil = Math.floor((vertIdxList ? vertIdxList.length : 0) / 3);
            const totalFilTris = triCountFil + extraFrame.length;
            if (totalFilTris === 0) continue;

            const buffer = new ArrayBuffer(84 + totalFilTris * 50);
            const view = new DataView(buffer);
            const headerStr = `Studios-Pro Slot ${filIdx + 1} - ${fil.name}`;
            for (let i = 0; i < headerStr.length && i < 80; i++) view.setUint8(i, headerStr.charCodeAt(i) & 0x7F);
            view.setUint32(80, totalFilTris, true);

            let offset = 84;
            for (let i = 0; i < triCountFil; i++) {
                const iA = vertIdxList[i * 3] * 3, iB = vertIdxList[i * 3 + 1] * 3, iC = vertIdxList[i * 3 + 2] * 3;
                writeStlTriangleToDataView(view, offset, positions[iA], positions[iA + 1], positions[iA + 2], positions[iB], positions[iB + 1], positions[iB + 2], positions[iC], positions[iC + 1], positions[iC + 2]);
                offset += 50;
            }
            for (let i = 0; i < extraFrame.length; i++) {
                const t = extraFrame[i];
                writeStlTriangleToDataView(view, offset, t[0][0], t[0][1], t[0][2], t[1][0], t[1][1], t[1][2], t[2][0], t[2][1], t[2][2]);
                offset += 50;
            }
            const safeName = fil.name.replace(/[^a-zA-Z0-9]/g, '_');
            zip.file(`Slot_${filIdx + 1}_${safeName}.stl`, buffer);
        }
    }

    zip.file('README_Slicer_Settings.txt', generateSlicerScriptText());
    return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

// ==========================================
// 🧩 MULTI-TILE XL WALL MURAL SPLITTER (INTERLOCKING DOVETAIL / MAGNETS + DEFLATE)
// ==========================================
async function generateWallMuralZip(options = {}) {
    const zip = createArchiveZip();
    const gridN = Math.max(2, Math.min(4, options.gridN || 2));
    const tileW = (config.width / gridN).toFixed(1);
    const tileH = (config.height / gridN).toFixed(1);
    const connMode = options.muralConnector || config.muralConnector || 'dovetail';

    for (let r = 0; r < gridN; r++) {
        for (let c = 0; c < gridN; c++) {
            const tile3MFBlob = await generate3MFPackage({
                ...options,
                includeFrame: false,
                muralConnector: connMode,
                tileCrop: { rowTile: r, colTile: c, gridN }
            });
            const arrayBuf = await tile3MFBlob.arrayBuffer();
            zip.file(`Tile_Row${r + 1}_Col${c + 1}_(${tileW}x${tileH}mm).3mf`, arrayBuf);
        }
    }

    let guide = `============================================================\n`;
    guide += `STUDIOS-PRO XL MULTI-TILE WALL MURAL ASSEMBLY GUIDE (${gridN}x${gridN})\n`;
    guide += `============================================================\n`;
    guide += `Format               : Compressed Bambu/Orca/Prusa Multi-Color .3MF Packages\n`;
    guide += `Interlock Connector  : ${connMode.toUpperCase()} (Seamless Global Bayer Dithering)\n`;
    guide += `Total Wall Mural Size: ${config.width} mm x ${config.height} mm\n`;
    guide += `Individual Tile Size : ${tileW} mm x ${tileH} mm x ${config.maxRelief} mm\n`;
    guide += `Total Tiles to Print : ${gridN * gridN} Multi-Color .3MF Tiles\n\n`;
    guide += `WALL LAYOUT MATRIX (Top-to-Bottom, Left-to-Right):\n`;
    for (let r = 0; r < gridN; r++) {
        let rowStr = `  `;
        for (let c = 0; c < gridN; c++) {
            rowStr += `[ Tile_Row${r + 1}_Col${c + 1}_(${tileW}x${tileH}mm).3mf ]  `;
        }
        guide += rowStr + `\n`;
    }
    guide += `\n` + generateSlicerScriptText();
    zip.file('README_Mural_Assembly_Guide.txt', guide);

    return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

// ==========================================
// 🖼️ 3-PANEL WALL TRIPTYCH GENERATOR (3 SEPARATE FRAMED .3MF PANELS + HANGING GUIDE)
// ==========================================
async function generateWallTriptychZip(options = {}) {
    const zip = createArchiveZip();
    const panelNames = ['Left', 'Center', 'Right'];
    const gapMm = Math.max(10, Math.min(40, Number(config.triptychGapMm) || 20));
    const panelW = (config.width / 3).toFixed(1);
    const panelH = Number(config.height || 140).toFixed(1);
    const totalWallW = (Number(config.width || 140) + gapMm * 2).toFixed(1);

    for (let col = 0; col < 3; col++) {
        const panelBlob = await generate3MFPackage({
            ...options,
            includeFrame: options.includeFrame !== false,
            muralConnector: 'none',
            tileCrop: { rowTile: 0, colTile: col, gridCols: 3, gridRows: 1, gridN: 3, isTriptych: true }
        });
        const ab = await panelBlob.arrayBuffer();
        zip.file(`Triptych_Panel_${col + 1}_${panelNames[col]}_(${panelW}x${panelH}mm).3mf`, ab);
    }

    let guide = `============================================================\n`;
    guide += `STUDIOS-PRO 3-PANEL GALLERY WALL TRIPTYCH GUIDE\n`;
    guide += `============================================================\n`;
    guide += `Format                 : 3 Separate Multi-Color .3MF Panels (Bambu/Orca/Prusa)\n`;
    guide += `Individual Panel Size  : ${panelW} mm x ${panelH} mm x ${config.maxRelief} mm\n`;
    guide += `Recommended Wall Gap   : ${gapMm} mm between adjacent panels\n`;
    guide += `Total Mounted Wall Span: ${totalWallW} mm wide x ${panelH} mm tall\n`;
    guide += `Outer Frame Style      : ${(config.frameStyle || 'none').toUpperCase()}\n\n`;
    guide += `WALL HANGING LAYOUT (Left -> Right):\n`;
    guide += `  [ Panel 1: Left ] <-- ${gapMm}mm gap --> [ Panel 2: Center ] <-- ${gapMm}mm gap --> [ Panel 3: Right ]\n\n`;
    guide += generateSlicerScriptText();
    zip.file('README_Triptych_Hanging_Guide.txt', guide);

    return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
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
            const slotMeta = typeof getSlotStartZAndLayer === 'function' ? getSlotStartZAndLayer(idx) : { startZ: idx === 0 ? 0 : (config.baseThickness + fil.startPct * (config.maxRelief - config.baseThickness)), startLayer: idx === 0 ? 1 : heightToLayerNumber(config.baseThickness + fil.startPct * (config.maxRelief - config.baseThickness), true) };
            const startZVal = stSlot.startZ !== undefined ? stSlot.startZ : slotMeta.startZ;
            const startZ = startZVal.toFixed(2);
            const startLayer = stSlot.startLayer || slotMeta.startLayer;
            const slotMass = stSlot.grams !== undefined ? ` • ~${stSlot.grams}g (${(stSlot.meters || 0).toFixed(2)}m)` : '';
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

            // Name + HEX + volumetric grams/meters (clipped safely before TD column!)
            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.fillText(`${fil.name}`, rightX + 124, midY - 6, 294);
            ctx.fillStyle = '#94a3b8';
            ctx.font = '12px monospace';
            ctx.fillText(`${fil.color.toUpperCase()}${slotMass}`, rightX + 124, midY + 11, 294);

            // TD
            ctx.fillStyle = '#e2e8f0';
            ctx.font = 'bold 13px Inter, sans-serif';
            ctx.fillText(`${(fil.td || 3.0).toFixed(1)} mm`, rightX + 430, midY);

            // Start Layer
            ctx.fillStyle = '#a855f7';
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.fillText(idx === 0 ? (isFr ? 'Couche #1 (Début)' : 'Layer #1 (Start)') : `${isFr ? 'Couche' : 'Layer'} #${startLayer}`, rightX + 530, midY, 145);

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

        const maxNoteW = footW - 168;
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 13px Inter, sans-serif';
        ctx.fillText(isFr ? '📌 INSTRUCTIONS BAMBU STUDIO / ORCASLICER / PRUSA' : '📌 CRITICAL SLICER CHECKLIST (BAMBU / ORCA / PRUSA)', rightX + 52, footY + 28, maxNoteW);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '13px Inter, sans-serif';
        const amsPlan = (typeof computeFourSlotAmsPlan === 'function') ? computeFourSlotAmsPlan(metrics.perSlot || []) : { active: false, swaps: [] };
        const amsSummary = (amsPlan.active && amsPlan.swaps.length > 0)
            ? amsPlan.swaps.map(s => `A${s.amsBay}→#${s.toSlot}(L${s.windowStartLayer}-${s.windowEndLayer})`).join(', ')
            : null;
        const amsLine = amsSummary
            ? (isFr ? `4. 4-Slots AMS (${filaments.length}c) : ${amsSummary}` : `4. 4-Slot AMS (${filaments.length}c): ${amsSummary}`)
            : null;
        const notes = isFr ? [
            '1. Remplissage (Infill) : 100% Rectiligne obligatoire pour la transmission TD.',
            `2. Couche : ${config.layerHeight.toFixed(2)} mm | 1ère couche : ${firstH} mm | Parois : 1.`,
            '3. Mono-buse : Pause M600 aux couches Z ci-dessus (pré-injecté dans le .3MF).',
            amsLine || '4. Bambu AMS / OrcaSlicer : Ouvrez le .3MF (slots & swaps pré-configurés).'
        ] : [
            '1. Infill Density: 100% Rectilinear (Mandatory for accurate TD transmission).',
            `2. Layer Height: ${config.layerHeight.toFixed(2)} mm | First Layer: ${firstH} mm | Walls: 1.`,
            '3. Single-Extruder: M600 pauses pre-injected into .3MF (or set at Z above).',
            amsLine || '4. Bambu AMS / OrcaSlicer: Open the .3MF project (slots & swaps auto-loaded).'
        ];
        notes.forEach((line, lIdx) => {
            ctx.fillText(line, rightX + 52, footY + 56 + lIdx * 24, maxNoteW);
        });

        // Render scannable mini QR badge on the right side of the footer box
        const qrMatrix = (activeQRStamp && activeQRStamp.matrix)
            ? activeQRStamp.matrix
            : (typeof generateRealQRCodeMatrix === 'function' ? generateRealQRCodeMatrix('https://studios-pro.com') : null);
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
            const sortedFilaments = (typeof prepareSortedFilamentsForTD === 'function')
                ? prepareSortedFilamentsForTD(filaments)
                : parsedFilaments.slice().sort((a, b) => a.startPct - b.startPct);

            const snapFactor = ((config.boundarySharpness !== undefined ? config.boundarySharpness : config.colorSnap) ?? 78) / 100.0;
            const ditherPct = config.opticalDithering || 0;
            const tdBlendStrength = (config.tdOpticalBlend !== undefined ? config.tdOpticalBlend : 65) / 100.0;
            const baseZ = config.baseThickness;
            const maxReliefZ = config.maxRelief;
            const reliefSpan = Math.max(0.08, maxReliefZ - baseZ);
            const hasHeightOffset = (typeof customZDeltaBuffer !== 'undefined' && customZDeltaBuffer && customZDeltaBuffer.length === srcW * srcH);

            const cachedBgRgb = computeBorderBackgroundRGB(colorDataBuffer, srcW, srcH);
            const baseRgbCache = (parsedFilaments[0] && parsedFilaments[0].rgb) ? parsedFilaments[0].rgb : [20, 20, 24];

            for (let pIdx = 0; pIdx < srcW * srcH; pIdx++) {
                const i = pIdx * 4;
                const colIdx = pIdx % srcW;
                const rowIdx = (pIdx / srcW) | 0;

                // Respect Die-Cut Model-Only Mode, Drilled Through-Holes & Plaque Cutout Shapes -> 100% Transparent!
                if (isPixelCutoutVoid(colIdx, rowIdx, srcW, srcH, cachedBgRgb, baseRgbCache)) {
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
                    const zDelta = hasHeightOffset ? customZDeltaBuffer[pIdx] : 0;
                    if (config.colorMode === 'luminance') {
                        const v = Math.round(lum * 255);
                        data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = 255;
                    } else if (config.colorMode === 'cmyw' && typeof computeCMYWBacklitColor === 'function') {
                        const kelvinHex = config.lightboxKelvin === 2700 ? 0xffd2a1 : (config.lightboxKelvin === 6500 ? 0xf0f8ff : 0xfff4e0);
                        const [cR, cG, cB] = computeCMYWBacklitColor(r, g, b, Math.max(0.2, (1.0 - lum) * reliefSpan), maxReliefZ, kelvinHex);
                        data[i] = cR; data[i + 1] = cG; data[i + 2] = cB; data[i + 3] = 255;
                    } else if (config.colorMode === 'stratified') {
                        let dLum = lum;
                        if (ditherPct > 0 && typeof BAYER_8X8 !== 'undefined') {
                            const bayer = ((BAYER_8X8[((rowIdx & 7) << 3) | (colIdx & 7)] / 64.0) - 0.5) * (ditherPct / 100.0) * 0.14;
                            dLum = Math.max(0, Math.min(1, lum + bayer));
                        }
                        const zVal = Math.max(baseZ, Math.min(maxReliefZ, baseZ + dLum * reliefSpan + zDelta));
                        const [tdR, tdG, tdB] = computeBeerLambertTDColor(
                            dLum, zVal, baseZ, maxReliefZ, sortedFilaments, tdBlendStrength, true
                        );
                        data[i] = tdR; data[i + 1] = tdG; data[i + 2] = tdB; data[i + 3] = 255;
                    } else {
                        const bestFilIdx = findClosestFilamentWithDither(r, g, b, colIdx, rowIdx, parsedFilaments, ditherPct);
                        const filRgb = parsedFilaments[bestFilIdx].rgb;
                        let outR = Math.round(r * (1 - snapFactor) + filRgb[0] * snapFactor);
                        let outG = Math.round(g * (1 - snapFactor) + filRgb[1] * snapFactor);
                        let outB = Math.round(b * (1 - snapFactor) + filRgb[2] * snapFactor);

                        if (tdBlendStrength > 0.02 && bestFilIdx > 0) {
                            const dz = Math.max(0.06, lum * reliefSpan);
                            const tdMm = Math.max(0.4, parsedFilaments[bestFilIdx].td || 3.0);
                            const transmission = Math.exp(-4.605 * (dz / tdMm));
                            const baseInfluence = Math.min(0.40, transmission * tdBlendStrength * 0.45);
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
            // Pure 3D Sculpted Model Render at Ultra-HD 4K Transparent Resolution (HiDPI-Safe + Tight Auto-Crop!)
            const glCanvas = renderer.domElement;
            const prevPixelRatio = renderer.getPixelRatio ? renderer.getPixelRatio() : 1;
            const origClearAlpha = renderer.getClearAlpha ? renderer.getClearAlpha() : 1;
            const prevBackground = scene.background;
            const prevAspect = camera.aspect;

            const renderW = 2400;
            const renderH = 2400;
            camera.aspect = 1.0;
            camera.updateProjectionMatrix();
            scene.background = null;
            // Temporarily force pixelRatio=1 so backing buffer is exact 2400x2400 (no 4800px OOM or Retina 25% clip!)
            renderer.setPixelRatio(1);
            renderer.setSize(renderW, renderH, false);
            renderer.setClearColor(0x000000, 0);
            renderer.render(scene, camera);

            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = renderW;
            tempCanvas.height = renderH;
            const tCtx = tempCanvas.getContext('2d');
            tCtx.clearRect(0, 0, renderW, renderH);
            tCtx.drawImage(glCanvas, 0, 0, glCanvas.width, glCanvas.height, 0, 0, renderW, renderH);

            // Restore viewport camera & renderer immediately
            scene.background = prevBackground;
            camera.aspect = prevAspect;
            camera.updateProjectionMatrix();
            renderer.setPixelRatio(prevPixelRatio);
            const container = document.getElementById('viewport-container');
            if (container && container.clientWidth > 0 && container.clientHeight > 0) {
                renderer.setSize(container.clientWidth, container.clientHeight, false);
            }
            renderer.setClearColor(isLightbox ? 0x020306 : 0x06090e, origClearAlpha);
            renderer.render(scene, camera);

            // Auto-crop tightly around non-transparent 3D model pixels (works thanks to alpha: true!)
            const pixels = tCtx.getImageData(0, 0, renderW, renderH).data;
            let minX = renderW, minY = renderH, maxX = 0, maxY = 0;
            let found = false;
            for (let y = 0; y < renderH; y += 2) {
                for (let x = 0; x < renderW; x += 2) {
                    const a = pixels[(y * renderW + x) * 4 + 3];
                    if (a > 12) {
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
        return false;
    }
}

function copyShareLink() {
    const input = document.getElementById('share-input-url');
    if (!input) return;
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(input.value).then(() => {
            const btn = document.getElementById('txt-copy-share-link');
            if (btn) {
                btn.innerText = currentLang === 'fr' ? '✓ Copié !' : '✓ Copied!';
                setTimeout(() => btn.innerText = translations[currentLang].btnCopyLink, 2000);
            }
            showToast(translations[currentLang].toastCopied);
        }).catch(() => {});
    }
}

function openSlicerModal() {
    closeAllModals();
    updateSlicerTable();
    document.getElementById('slicer-modal').style.display = 'flex';
}

function showToast(text) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    const txtEl = document.getElementById('toast-text');
    if (txtEl) txtEl.innerText = text;
    toast.classList.add('show');
    if (_toastHideTimer) clearTimeout(_toastHideTimer);
    _toastHideTimer = setTimeout(() => {
        toast.classList.remove('show');
        _toastHideTimer = null;
    }, 3400);
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
        // CRITICAL FIX: Always sync sourceCanvas from real sourceImage so we NEVER save a blank 300x150 canvas!
        if (sourceImage && typeof syncSourceCanvasFromImage === 'function') {
            syncSourceCanvasFromImage(sourceImage);
            sourceDataUrl = sourceCanvas.toDataURL('image/png');
        } else if (processedCanvas && processedCanvas.width > 0) {
            sourceDataUrl = processedCanvas.toDataURL('image/png');
        }
    } catch (_) {}

    // Convert Uint8Array QR matrix rows to plain JS Arrays for clean JSON roundtrip!
    const serializedQR = activeQRStamp
        ? {
            ...activeQRStamp,
            matrix: Array.isArray(activeQRStamp.matrix) ? activeQRStamp.matrix.map(row => Array.from(row)) : null
        }
        : null;

    return JSON.stringify({
        app: 'studios-pro-filament-painting',
        version: 2,
        savedAt: new Date().toISOString(),
        config: { ...config },
        filaments: filaments.map(f => ({ ...f })),
        activeFilamentSlot,
        studioMode,
        isDrawingTemplateActive,
        isCanvasUserEdited,
        editorSymmetryMode,
        activeQRStamp: serializedQR,
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
    if (typeof data.activeFilamentSlot === 'number') {
        activeFilamentSlot = Math.max(0, Math.min(filaments.length - 1, data.activeFilamentSlot));
    }
    if (data.studioMode) studioMode = data.studioMode;
    isDrawingTemplateActive = !!data.isDrawingTemplateActive;
    isCanvasUserEdited = !!data.isCanvasUserEdited;
    editorSymmetryMode = data.editorSymmetryMode || 'none';

    // Restore QR matrix safely into Uint8Array[] even from v1 object-serialized rows!
    if (data.activeQRStamp && Array.isArray(data.activeQRStamp.matrix)) {
        const restoredMat = data.activeQRStamp.matrix.map(row => {
            if (Array.isArray(row)) return new Uint8Array(row);
            if (row && typeof row === 'object') {
                const keys = Object.keys(row).map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
                const u8 = new Uint8Array(keys.length);
                keys.forEach((k, i) => { u8[i] = row[k] ? 1 : 0; });
                return u8;
            }
            return new Uint8Array(0);
        });
        activeQRStamp = { ...data.activeQRStamp, matrix: restoredMat };
    } else {
        activeQRStamp = null;
    }

    activeSoundwave = data.activeSoundwave || null;
    customAudioBars = data.customAudioBars || null;

    if (data.sourceImageDataUrl) {
        await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                sourceImage = img;
                if (typeof syncSourceCanvasFromImage === 'function') syncSourceCanvasFromImage(img);
                const thumb = document.getElementById('source-thumb-preview');
                if (thumb) thumb.src = data.sourceImageDataUrl;
                const bar = document.getElementById('source-preview-bar');
                if (bar) bar.style.display = 'flex';
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
        bufferWidth = bw;
        bufferHeight = bh;
        const pxCount = bw * bh;

        const cU8 = base64ToUint8Array(bufs.colorDataB64);
        const fU8 = base64ToUint8Array(bufs.filamentSlotB64);
        const zU8 = base64ToUint8Array(bufs.customZDeltaB64);
        const cutU8 = base64ToUint8Array(bufs.cutoutMaskB64);
        const uU8 = base64ToUint8Array(bufs.userEditMaskB64);

        colorDataBuffer = (cU8 && cU8.byteLength === pxCount * 4)
            ? new Uint8ClampedArray(cU8.buffer, cU8.byteOffset, cU8.byteLength)
            : new Uint8ClampedArray(pxCount * 4);
        heightDataBuffer = new Float32Array(pxCount);
        for (let p = 0; p < pxCount; p++) {
            const i4 = p * 4;
            heightDataBuffer[p] = (0.299 * colorDataBuffer[i4] + 0.587 * colorDataBuffer[i4 + 1] + 0.114 * colorDataBuffer[i4 + 2]) / 255.0;
        }
        filamentSlotBuffer = (fU8 && fU8.byteLength === pxCount)
            ? new Uint8Array(fU8.buffer, fU8.byteOffset, fU8.byteLength)
            : (new Uint8Array(pxCount)).fill(255);
        if (zU8 && zU8.byteLength === pxCount * 4) {
            const copyAb = zU8.buffer.slice(zU8.byteOffset, zU8.byteOffset + zU8.byteLength);
            customZDeltaBuffer = new Float32Array(copyAb);
        } else {
            customZDeltaBuffer = new Float32Array(pxCount);
        }
        cutoutMaskBuffer = (cutU8 && cutU8.byteLength === pxCount)
            ? new Uint8Array(cutU8.buffer, cutU8.byteOffset, cutU8.byteLength)
            : new Uint8Array(pxCount);
        userEditMaskBuffer = (uU8 && uU8.byteLength === pxCount)
            ? new Uint8Array(uU8.buffer, uU8.byteOffset, uU8.byteLength)
            : new Uint8Array(pxCount);

        lastProcessedMeta = {
            w: bw,
            h: bh,
            rot: config.rotation || 0,
            flipX: config.flipX,
            flipY: config.flipY
        };
        if (typeof syncProcessedCanvasFromBuffer === 'function') syncProcessedCanvasFromBuffer();
        if (typeof rebuildBgExteriorVoidMask === 'function') rebuildBgExteriorVoidMask(bw, bh);
        if (config.smartCutoutActive && typeof computeSmartAISubjectMask === 'function') computeSmartAISubjectMask(bw, bh);
    } else if (sourceImage) {
        processSourceImage(false, true);
    }

    if (typeof rebuildBacksideSignatureMask === 'function') rebuildBacksideSignatureMask();
    if (typeof syncSmartCutoutUI === 'function') syncSmartCutoutUI();
    if (typeof syncCropSlidersUI === 'function') syncCropSlidersUI();

    // Update Photo/Draw sidebar visibility WITHOUT calling openCleanBlankCanvas() (which wiped loaded Draw projects!)
    const btnPhoto = document.getElementById('btn-studio-photo');
    const btnDraw = document.getElementById('btn-studio-draw');
    const subPhoto = document.getElementById('subpanel-photo-src');
    const subDrawTpl = document.getElementById('subpanel-draw-tpl');
    if (btnPhoto) btnPhoto.classList.toggle('active', studioMode === 'photo');
    if (btnDraw) btnDraw.classList.toggle('active', studioMode === 'draw');
    if (subPhoto) subPhoto.style.display = studioMode === 'photo' ? 'block' : 'none';
    if (subDrawTpl) subDrawTpl.style.display = studioMode === 'draw' ? 'block' : 'none';

    if (typeof syncAllControlsFromConfig === 'function') syncAllControlsFromConfig();
    if (typeof resetEditHistory === 'function') resetEditHistory();
    renderFilamentStackUI();
    if (typeof updateFilamentSwatchesUI === 'function') updateFilamentSwatchesUI();
    generate3DReliefMesh();
    updateSlicerTable();
    if (centerViewMode === '2d') render2DEditorPreview();
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
    // Temporarily suppress false-color diagnostic inspectors so AR shows real filament colors!
    const hadDiag = isOverhangWarning || isZebraExposure || isNozzleInspectMode || isDeltaEHeatmap;
    const prevO = isOverhangWarning, prevZ = isZebraExposure, prevN = isNozzleInspectMode, prevD = isDeltaEHeatmap;
    if (hadDiag) {
        isOverhangWarning = false; isZebraExposure = false; isNozzleInspectMode = false; isDeltaEHeatmap = false;
        generate3DReliefMesh();
    } else if (!reliefMesh || !reliefMesh.geometry) {
        generate3DReliefMesh();
    }

    const SCALE_M = 0.001; // 140mm -> 0.14m true scale in AR
    const meshesToPack = [];
    const baseRgb0 = hexToRgb((filaments[0] && filaments[0].color) ? filaments[0].color : '#111827');
    const baseLinear0 = [SRGB_TO_LIN_LUT[baseRgb0[0]], SRGB_TO_LIN_LUT[baseRgb0[1]], SRGB_TO_LIN_LUT[baseRgb0[2]]];

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
    // Include outer frame / hanging eyelet (exclude detached side easel stand on wall AR!)
    if (frameMesh && frameMesh.geometry && (config.frameStyle !== 'none' || config.mounting === 'hole')) {
        const fg = frameMesh.geometry;
        if (fg.attributes && fg.attributes.position && fg.attributes.position.count > 0) {
            meshesToPack.push({
                pos: fg.attributes.position.array,
                norm: fg.attributes.normal ? fg.attributes.normal.array : null,
                col: null,
                idx: fg.index ? fg.index.array : null,
                defaultColor: [baseRgb0[0] / 255, baseRgb0[1] / 255, baseRgb0[2] / 255]
            });
        }
    }

    // Restore diagnostic state if it was temporarily disabled
    if (hadDiag) {
        isOverhangWarning = prevO; isZebraExposure = prevZ; isNozzleInspectMode = prevN; isDeltaEHeatmap = prevD;
        generate3DReliefMesh();
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

            // CRITICAL FIX: glTF 2.0 COLOR_0 MUST be LINEAR RGB (convert Three.js r128 sRGB -> Linear!)
            const rSrgb = m.col ? m.col[p] : m.defaultColor[0];
            const gSrgb = m.col ? m.col[p + 1] : m.defaultColor[1];
            const bSrgb = m.col ? m.col[p + 2] : m.defaultColor[2];
            const rLin = SRGB_TO_LIN_LUT[Math.max(0, Math.min(255, Math.round(rSrgb * 255)))];
            const gLin = SRGB_TO_LIN_LUT[Math.max(0, Math.min(255, Math.round(gSrgb * 255)))];
            const bLin = SRGB_TO_LIN_LUT[Math.max(0, Math.min(255, Math.round(bSrgb * 255)))];

            outCol[d4] = Math.max(0, Math.min(255, Math.round(rLin * 255)));
            outCol[d4 + 1] = Math.max(0, Math.min(255, Math.round(gLin * 255)));
            outCol[d4 + 2] = Math.max(0, Math.min(255, Math.round(bLin * 255)));
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
            pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0.05, roughnessFactor: 0.44 },
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

    dv.setUint32(0, 0x46546C67, true);
    dv.setUint32(4, 2, true);
    dv.setUint32(8, totalGlbLen, true);

    dv.setUint32(12, jsonChunkLen, true);
    dv.setUint32(16, 0x4E4F534A, true);
    outU8.set(jsonBytes, 20);
    for (let i = 0; i < jsonPad; i++) outU8[20 + jsonBytes.length + i] = 0x20;

    const binHeaderOff = 20 + jsonChunkLen;
    dv.setUint32(binHeaderOff, binLen, true);
    dv.setUint32(binHeaderOff + 4, 0x004E4942, true);
    let binOff = binHeaderOff + 8;
    outU8.set(new Uint8Array(outPos.buffer), binOff); binOff += posByteLen;
    outU8.set(new Uint8Array(outNorm.buffer), binOff); binOff += normByteLen;
    outU8.set(new Uint8Array(outCol.buffer), binOff); binOff += colByteLen;
    outU8.set(new Uint8Array(outIdx.buffer), binOff);

    return glbBuf;
}

function openWallARPreview() {
    if (typeof flushPending3DMeshIfDirty === 'function') flushPending3DMeshIfDirty();
    const glbBuffer = generateWallARGlbBuffer();
    if (!glbBuffer) {
        showToast(currentLang === 'fr' ? '⚠️ Moteur 3D indisponible pour la prévisualisation AR.' : '⚠️ 3D engine unavailable for AR preview.');
        return null;
    }

    const isFlat = (!config.topography || config.topography === 'flat');
    const borderW = (isFlat && config.frameStyle !== 'none') ? (config.frameStyle === 'thin' ? 2.5 : (config.frameStyle === 'deep' ? 8.0 : 5.0)) : 0;
    const dimsMm = isFlat
        ? {
            x: Math.round(((config.width || 140) + borderW * 2) * 10) / 10,
            y: Math.round(((config.height || 140) + borderW * 2) * 10) / 10,
            z: Math.round((Math.max(getEffectiveRearBaseZ() + 0.4, config.maxRelief || 2.4) + (config.frameStyle === 'deep' ? 3 : 0)) * 10) / 10
        }
        : {
            x: Math.round(((config.width || 140) / Math.PI) * 10) / 10,
            y: Math.round((config.height || 140) * 10) / 10,
            z: Math.round(((config.width || 140) / Math.PI) * 10) / 10
        };

    const arPlacement = isFlat ? 'wall' : 'floor';

    // Route strictly through official StudiosProAR external contract (handles BOTH iframe & standalone cleanly!)
    if (typeof window !== 'undefined' && window.StudiosProAR && typeof window.StudiosProAR.sendModel === 'function') {
        window.StudiosProAR.sendModel({
            modelData: glbBuffer,
            extension: 'glb',
            isBinary: true,
            name: 'StudiosPro_Filament_Painting.glb',
            placement: arPlacement,
            autoScale: 'fixed',
            dimensionsMm: dimsMm,
            sourceStudio: 'filament-painting-studio'
        });
        showToast(translations[currentLang]?.toastARLaunched || 'AR Preview launched!');
        return glbBuffer;
    }

    // Fallback if ar-bridge.js wasn't loaded
    const inIframe = (typeof window !== 'undefined' && window.parent && window.parent !== window);
    if (inIframe) {
        const arPayload = {
            type: 'OPEN_AR_VIEWER',
            payload: {
                transferId: 'fp_' + Date.now().toString(36),
                modelData: glbBuffer,
                extension: 'glb',
                isBinary: true,
                name: 'StudiosPro_Filament_Painting.glb',
                placement: arPlacement,
                autoScale: 'fixed',
                dimensionsMm: dimsMm,
                sourceStudio: 'filament-painting-studio'
            }
        };
        try { window.parent.postMessage(arPayload, '*'); } catch (_) {}
        showToast(translations[currentLang]?.toastARLaunched || 'AR Preview launched!');
    } else {
        downloadFileDirect(new Blob([glbBuffer], { type: 'model/gltf-binary' }), `StudiosPro_Filament_Painting_${Date.now()}.glb`);
        showToast(translations[currentLang]?.toastARStandalone || 'GLB downloaded!');
    }
    return glbBuffer;
}

// ==========================================
// 🖼️ 4K STUDIO GALLERY MOCKUP RENDERER (WALL / DESK EASEL / LED LIGHTBOX / ETSY 4:5 CARD)
// ==========================================
function openMockupModal() {
    closeAllModals();
    if (typeof flushPending3DMeshIfDirty === 'function') flushPending3DMeshIfDirty();
    const m = document.getElementById('mockup-modal');
    if (m) m.style.display = 'flex';
}

function captureTransparent3DArtworkCanvas(sizePx = 1800) {
    if (!renderer || !scene || !camera) return null;
    const glCanvas = renderer.domElement;
    const prevPixelRatio = renderer.getPixelRatio ? renderer.getPixelRatio() : 1;
    const prevClearAlpha = renderer.getClearAlpha ? renderer.getClearAlpha() : 1;
    const prevBg = scene.background;
    const prevAspect = camera.aspect;

    camera.aspect = 1.0;
    camera.updateProjectionMatrix();
    scene.background = null;
    renderer.setPixelRatio(1);
    renderer.setSize(sizePx, sizePx, false);
    renderer.setClearColor(0x000000, 0);
    renderer.render(scene, camera);

    const tmp = document.createElement('canvas');
    tmp.width = sizePx; tmp.height = sizePx;
    const tCtx = tmp.getContext('2d');
    tCtx.drawImage(glCanvas, 0, 0, glCanvas.width, glCanvas.height, 0, 0, sizePx, sizePx);

    // Restore viewport cleanly
    scene.background = prevBg;
    camera.aspect = prevAspect;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(prevPixelRatio);
    const cont = document.getElementById('viewport-container');
    if (cont && cont.clientWidth > 0 && cont.clientHeight > 0) renderer.setSize(cont.clientWidth, cont.clientHeight, false);
    renderer.setClearColor(isLightbox ? 0x020306 : 0x06090e, prevClearAlpha);
    renderer.render(scene, camera);

    // Auto-crop around visible pixels
    const px = tCtx.getImageData(0, 0, sizePx, sizePx).data;
    let minX = sizePx, minY = sizePx, maxX = 0, maxY = 0, found = false;
    for (let y = 0; y < sizePx; y += 3) {
        for (let x = 0; x < sizePx; x += 3) {
            if (px[(y * sizePx + x) * 4 + 3] > 14) {
                if (x < minX) minX = x; if (x > maxX) maxX = x;
                if (y < minY) minY = y; if (y > maxY) maxY = y;
                found = true;
            }
        }
    }
    if (!found) return tmp;
    const pad = 20;
    const cx = Math.max(0, minX - pad), cy = Math.max(0, minY - pad);
    const cw = Math.min(sizePx - cx, (maxX - minX) + pad * 2);
    const ch = Math.min(sizePx - cy, (maxY - minY) + pad * 2);
    const cropped = document.createElement('canvas');
    cropped.width = cw; cropped.height = ch;
    cropped.getContext('2d').drawImage(tmp, cx, cy, cw, ch, 0, 0, cw, ch);
    return cropped;
}

function downloadStudioMockupPNG(sceneType = 'wall_gallery') {
    try {
        const hero = captureTransparent3DArtworkCanvas(1800) || processedCanvas;
        if (!hero || !hero.width) return false;

        const isEtsy = (sceneType === 'etsy_card');
        const W = isEtsy ? 2000 : 2560;
        const H = isEtsy ? 2500 : 1600;
        const cvs = document.createElement('canvas');
        cvs.width = W; cvs.height = H;
        const ctx = cvs.getContext('2d');
        const isFr = currentLang === 'fr';
        const metrics = computePrintMetrics();

        if (sceneType === 'wall_gallery') {
            // Modern Scandinavian Sunlit Gallery Wall
            const wall = ctx.createLinearGradient(0, 0, W, H);
            wall.addColorStop(0, '#f3f1ec');
            wall.addColorStop(0.55, '#e7e2d9');
            wall.addColorStop(1, '#d8d1c5');
            ctx.fillStyle = wall;
            ctx.fillRect(0, 0, W, H);

            // Soft diagonal sunlight beam from top-left
            const sun = ctx.createRadialGradient(W * 0.18, H * 0.12, 80, W * 0.35, H * 0.35, W * 0.85);
            sun.addColorStop(0, 'rgba(255, 250, 238, 0.72)');
            sun.addColorStop(1, 'rgba(255, 250, 238, 0.0)');
            ctx.fillStyle = sun;
            ctx.fillRect(0, 0, W, H);

            // Subtle architectural dado rail & warm oak floor line
            ctx.fillStyle = '#d4cab8';
            ctx.fillRect(0, H * 0.86, W, 12);
            ctx.fillStyle = '#c8baa2';
            ctx.fillRect(0, H * 0.86 + 12, W, H * 0.14);

            const maxH = H * 0.64, maxW = W * 0.56;
            const sc = Math.min(maxW / hero.width, maxH / hero.height);
            const dw = hero.width * sc, dh = hero.height * sc;
            const dx = (W - dw) * 0.5, dy = (H * 0.84 - dh) * 0.48;

            ctx.save();
            ctx.shadowColor = 'rgba(20, 18, 15, 0.42)';
            ctx.shadowBlur = 65;
            ctx.shadowOffsetX = 28;
            ctx.shadowOffsetY = 38;
            ctx.drawImage(hero, dx, dy, dw, dh);
            ctx.restore();
        } else if (sceneType === 'desk_easel') {
            // Moody Warm Studio Desk + Wooden Easel
            const bg = ctx.createRadialGradient(W * 0.5, H * 0.35, 100, W * 0.5, H * 0.45, W * 0.75);
            bg.addColorStop(0, '#273142');
            bg.addColorStop(1, '#0d131f');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, W, H);

            const deskGrad = ctx.createLinearGradient(0, H * 0.72, 0, H);
            deskGrad.addColorStop(0, '#6e472b');
            deskGrad.addColorStop(0.18, '#53341d');
            deskGrad.addColorStop(1, '#2d1a0d');
            ctx.fillStyle = deskGrad;
            ctx.fillRect(0, H * 0.72, W, H * 0.28);

            const maxH = H * 0.62, maxW = W * 0.52;
            const sc = Math.min(maxW / hero.width, maxH / hero.height);
            const dw = hero.width * sc, dh = hero.height * sc;
            const dx = (W - dw) * 0.5, dy = H * 0.76 - dh;

            // Wooden easel back legs
            ctx.fillStyle = '#8b5a2b';
            ctx.beginPath(); ctx.moveTo(W * 0.5 - dw * 0.34, H * 0.80); ctx.lineTo(W * 0.5 - dw * 0.26, H * 0.80); ctx.lineTo(W * 0.5 - 16, dy - 35); ctx.lineTo(W * 0.5 - 38, dy - 35); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(W * 0.5 + dw * 0.34, H * 0.80); ctx.lineTo(W * 0.5 + dw * 0.26, H * 0.80); ctx.lineTo(W * 0.5 + 16, dy - 35); ctx.lineTo(W * 0.5 + 38, dy - 35); ctx.closePath(); ctx.fill();

            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.72)';
            ctx.shadowBlur = 55;
            ctx.shadowOffsetY = 26;
            ctx.drawImage(hero, dx, dy, dw, dh);
            ctx.restore();

            // Front easel shelf lip
            ctx.fillStyle = '#9c6634';
            ctx.fillRect(dx - 24, dy + dh - 10, dw + 48, 22);
        } else if (sceneType === 'led_lightbox') {
            // Glowing Dark Gallery LED Lightbox Showcase
            ctx.fillStyle = '#03060c';
            ctx.fillRect(0, 0, W, H);
            const maxH = H * 0.68, maxW = W * 0.58;
            const sc = Math.min(maxW / hero.width, maxH / hero.height);
            const dw = hero.width * sc, dh = hero.height * sc;
            const dx = (W - dw) * 0.5, dy = (H - dh) * 0.48;

            const halo = ctx.createRadialGradient(W * 0.5, H * 0.48, Math.min(dw, dh) * 0.15, W * 0.5, H * 0.48, Math.max(dw, dh) * 0.82);
            const kHex = config.lightboxKelvin === 2700 ? 'rgba(255,196,120,0.42)' : (config.lightboxKelvin === 6500 ? 'rgba(180,225,255,0.38)' : 'rgba(255,244,218,0.40)');
            halo.addColorStop(0, kHex);
            halo.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = halo;
            ctx.fillRect(0, 0, W, H);

            ctx.save();
            ctx.shadowColor = kHex;
            ctx.shadowBlur = 90;
            ctx.drawImage(hero, dx, dy, dw, dh);
            ctx.restore();
        } else {
            // Etsy / MakerWorld 4:5 Listing Hero Card (2000 x 2500)
            const bg = ctx.createLinearGradient(0, 0, W, H);
            bg.addColorStop(0, '#090e1a');
            bg.addColorStop(0.5, '#131d33');
            bg.addColorStop(1, '#090d16');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, W, H);

            // Top Banner
            ctx.fillStyle = '#38bdf8';
            ctx.font = '800 34px Outfit, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(isFr ? 'TABLEAU 3D MULTI-COULEURS • PRÊT À IMPRIMER' : '3D MULTI-COLOR FILAMENT PAINTING • PRINT READY', W * 0.5, 110);
            ctx.fillStyle = '#ffffff';
            ctx.font = '800 66px Outfit, sans-serif';
            ctx.fillText(`${config.width} × ${config.height} mm  •  ${filaments.length} ${isFr ? 'Couleurs' : 'Colors'}`, W * 0.5, 195);

            // Hero 3D Model
            const maxH = 1520, maxW = 1660;
            const sc = Math.min(maxW / hero.width, maxH / hero.height);
            const dw = hero.width * sc, dh = hero.height * sc;
            const dx = (W - dw) * 0.5, dy = 260 + (maxH - dh) * 0.5;
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.72)';
            ctx.shadowBlur = 70;
            ctx.shadowOffsetY = 30;
            ctx.drawImage(hero, dx, dy, dw, dh);
            ctx.restore();

            // Filament Swatch Strip + Specs Footer
            const footY = 1920;
            drawRoundedRectPath(ctx, 110, footY, W - 220, 440, 32);
            ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
            ctx.lineWidth = 3;
            ctx.stroke();

            const swGap = 24;
            const swW = Math.min(280, Math.floor((W - 340 - swGap * (filaments.length - 1)) / filaments.length));
            const totalSwW = swW * filaments.length + swGap * (filaments.length - 1);
            let sx = (W - totalSwW) * 0.5;
            filaments.forEach((f, idx) => {
                const { startLayer } = getSlotStartZAndLayer(idx);
                drawRoundedRectPath(ctx, sx, footY + 46, swW, 110, 18);
                ctx.fillStyle = f.color;
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.45)';
                ctx.lineWidth = 3;
                ctx.stroke();
                ctx.fillStyle = '#f8fafc';
                ctx.font = '700 26px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`L#${startLayer} • TD ${f.td}mm`, sx + swW * 0.5, footY + 195, swW);
                ctx.fillStyle = '#94a3b8';
                ctx.font = '600 22px Inter, sans-serif';
                ctx.fillText(f.name.slice(0, 18), sx + swW * 0.5, footY + 230, swW);
                sx += swW + swGap;
            });

            ctx.fillStyle = '#38bdf8';
            ctx.font = '700 32px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${config.layerHeight.toFixed(2)}mm Layer • 100% Infill • ~${metrics.totalGrams}g • ${metrics.timeStr} • Bambu AMS / Prusa / M600`, W * 0.5, footY + 345);
        }

        // Subtle bottom-right signature watermark on gallery mockups
        if (!isEtsy) {
            ctx.fillStyle = sceneType === 'wall_gallery' ? 'rgba(15, 23, 42, 0.55)' : 'rgba(248, 250, 252, 0.65)';
            ctx.font = '700 24px Outfit, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`Studios-Pro.com • ${config.width}×${config.height}mm • ${filaments.length} Filaments`, W - 48, H - 36);
        }

        cvs.toBlob(blob => {
            if (blob) {
                downloadFileDirect(blob, `StudiosPro_Mockup_${sceneType}_${Date.now()}.png`);
                showToast(currentLang === 'fr' ? '🖼️ Mockup 4K Studio téléchargé !' : '🖼️ 4K Studio Mockup downloaded!');
            }
        }, 'image/png');
        return true;
    } catch (err) {
        console.error('Mockup export error:', err);
        return false;
    }
}

// ==========================================
// 🌐 STANDALONE INTERACTIVE 3D HTML EXPORT (100% OFFLINE SELF-CONTAINED SHOWCASE!)
// ==========================================
function buildStandaloneHTML3DString() {
    if ((!reliefMesh || !reliefMesh.geometry) && typeof THREE !== 'undefined') generate3DReliefMesh();
    const g = reliefMesh && reliefMesh.geometry ? reliefMesh.geometry : null;

    let compact = null;
    if (g) {
        compact = buildDownsampledReliefForAR(g, 14000) || {
            pos: g.attributes.position.array,
            norm: g.attributes.normal ? g.attributes.normal.array : null,
            col: g.attributes.color ? g.attributes.color.array : null,
            idx: g.index ? g.index.array : null
        };
    } else {
        // Headless / WebGL-fallback path: build directly from watertight CAD relief data!
        const solid = buildWatertightReliefData({ resolution: 96, includeFrame: false, quantize: false, adaptive: false });
        if (!solid || !solid.positions || !solid.indices) return null;
        const vCount = solid.vertCount;
        const col = new Float32Array(vCount * 3);
        const pal = filaments.map(f => hexToRgb(f.color));
        const baseRgb = pal[0] || [20, 24, 34];
        for (let v = 0; v < vCount; v++) {
            col[v * 3] = baseRgb[0] / 255;
            col[v * 3 + 1] = baseRgb[1] / 255;
            col[v * 3 + 2] = baseRgb[2] / 255;
        }
        for (let t = 0; t < solid.triCount; t++) {
            const rgb = pal[solid.triangleFilamentIdx[t]] || baseRgb;
            for (let k = 0; k < 3; k++) {
                const vi = solid.indices[t * 3 + k];
                col[vi * 3] = rgb[0] / 255;
                col[vi * 3 + 1] = rgb[1] / 255;
                col[vi * 3 + 2] = rgb[2] / 255;
            }
        }
        compact = { pos: solid.positions, col, idx: solid.indices };
    }

    const posRounded = Array.from(compact.pos, v => Math.round(v * 100) / 100);
    const colBytes = compact.col ? Array.from(compact.col, v => Math.max(0, Math.min(255, Math.round(v * 255)))) : [];
    const idxArr = compact.idx ? Array.from(compact.idx) : [];
    const metrics = computePrintMetrics();
    const recipeRows = filaments.map((f, idx) => {
        const { startZ, startLayer } = getSlotStartZAndLayer(idx);
        return { slot: idx + 1, name: f.name, color: f.color, td: f.td, layer: startLayer, z: startZ };
    });

    const payloadJson = JSON.stringify({
        width: config.width,
        height: config.height,
        maxRelief: config.maxRelief,
        layerHeight: config.layerHeight,
        totalLayers: metrics.totalLayers,
        grams: metrics.totalGrams,
        timeStr: metrics.timeStr,
        recipe: recipeRows,
        pos: posRounded,
        col: colBytes,
        idx: idxArr
    }).replace(/<\/script>/gi, '<\\/script>');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Studios-Pro 3D Filament Painting Interactive Showcase</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
body{background:#06090e;color:#f8fafc;height:100vh;display:flex;overflow:hidden}
#stage{flex:1;position:relative;cursor:grab}
#stage:active{cursor:grabbing}
canvas{width:100%;height:100%;display:block}
#panel{width:310px;background:#0f172a;border-left:1px solid rgba(255,255,255,.1);padding:20px;overflow-y:auto;display:flex;flex-direction:column;gap:14px}
h1{font-size:1.05rem;color:#38bdf8}
.meta{font-size:.82rem;color:#94a3b8;line-height:1.5}
.row{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.04);padding:8px 10px;border-radius:8px;font-size:.8rem}
.dot{width:18px;height:18px;border-radius:5px;border:1px solid rgba(255,255,255,.35);flex-shrink:0}
.hint{position:absolute;bottom:14px;left:16px;background:rgba(15,23,42,.82);padding:7px 14px;border-radius:20px;font-size:.76rem;color:#cbd5e1;border:1px solid rgba(255,255,255,.1)}
@media(max-width:760px){body{flex-direction:column}#panel{width:100%;height:38vh;border-left:none;border-top:1px solid rgba(255,255,255,.1)}}
</style>
</head>
<body>
<div id="stage"><canvas id="gl"></canvas><div class="hint">Drag to orbit • Scroll to zoom • 100% Offline WebGL Viewer</div></div>
<aside id="panel">
<h1>Studios-Pro 3D Showcase</h1>
<div class="meta" id="meta"></div>
<div id="recipe" style="display:flex;flex-direction:column;gap:8px;"></div>
<a href="https://studios-pro.com/?ref=filament-painting-studio" target="_blank" style="margin-top:auto;text-align:center;background:#0284c7;color:#fff;padding:10px;border-radius:10px;text-decoration:none;font-weight:700;font-size:.85rem;">Create Yours Free on Studios-Pro</a>
</aside>
<script>
const DATA=${payloadJson};
document.getElementById('meta').innerHTML='<strong>'+DATA.width+' × '+DATA.height+' × '+DATA.maxRelief+' mm</strong><br>Layer: '+DATA.layerHeight+'mm • '+DATA.totalLayers+' layers • ~'+DATA.grams+'g ('+DATA.timeStr+')';
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const rec=document.getElementById('recipe');
DATA.recipe.forEach(r=>{const d=document.createElement('div');d.className='row';const col=/^#[0-9a-f]{6}$/i.test(r.color||'')?r.color:'#38bdf8';d.innerHTML='<span class="dot" style="background:'+col+'"></span><div style="flex:1"><strong>#'+r.slot+' '+esc(r.name)+'</strong><br><span style="color:#94a3b8;font-size:.72rem">Layer #'+r.layer+' ('+r.z.toFixed(2)+'mm) • TD '+r.td+'mm</span></div>';rec.appendChild(d);});
const canvas=document.getElementById('gl'),gl=canvas.getContext('webgl',{antialias:true});
if(gl){
  const vs='attribute vec3 p;attribute vec3 c;uniform mat4 mvp;varying vec3 vc;void main(){vc=c;gl_Position=mvp*vec4(p,1.0);}';
  const fs='precision mediump float;varying vec3 vc;void main(){gl_FragColor=vec4(vc,1.0);}';
  const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);return o;};
  const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,vs));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(pr);gl.useProgram(pr);
  const pb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,pb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(DATA.pos),gl.STATIC_DRAW);
  const pl=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(pl);gl.vertexAttribPointer(pl,3,gl.FLOAT,false,0,0);
  const cb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,cb);gl.bufferData(gl.ARRAY_BUFFER,new Uint8Array(DATA.col),gl.STATIC_DRAW);
  const cl=gl.getAttribLocation(pr,'c');gl.enableVertexAttribArray(cl);gl.vertexAttribPointer(cl,3,gl.UNSIGNED_BYTE,true,0,0);
  const use32=DATA.pos.length/3>65535&&gl.getExtension('OES_element_index_uint');
  const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,use32?new Uint32Array(DATA.idx):new Uint16Array(DATA.idx),gl.STATIC_DRAW);
  const uMvp=gl.getUniformLocation(pr,'mvp');
  let rotX=-0.35,rotY=0.35,dist=Math.max(DATA.width,DATA.height)*1.85,drag=false,lx=0,ly=0;
  canvas.onpointerdown=e=>{drag=true;lx=e.clientX;ly=e.clientY;};
  window.onpointerup=()=>{drag=false;};
  window.onpointermove=e=>{if(!drag)return;rotY+=(e.clientX-lx)*0.008;rotX=Math.max(-1.4,Math.min(1.4,rotX+(e.clientY-ly)*0.008));lx=e.clientX;ly=e.clientY;};
  canvas.onwheel=e=>{e.preventDefault();dist=Math.max(40,Math.min(900,dist*(e.deltaY>0?1.08:0.92)));};
  const mul=(a,b)=>{const o=new Float32Array(16);for(let i=0;i<4;i++)for(let j=0;j<4;j++)o[i*4+j]=a[j]*b[i*4]+a[4+j]*b[i*4+1]+a[8+j]*b[i*4+2]+a[12+j]*b[i*4+3];return o;};
  const draw=()=>{
    const r=canvas.getBoundingClientRect();const w=Math.max(1,r.width|0),h=Math.max(1,r.height|0);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    gl.viewport(0,0,w,h);gl.enable(gl.DEPTH_TEST);gl.clearColor(0.024,0.035,0.055,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    const f=1/Math.tan(0.35),asp=w/h,n=1,fa=2000;
    const P=new Float32Array([f/asp,0,0,0, 0,f,0,0, 0,0,(fa+n)/(n-fa),-1, 0,0,(2*fa*n)/(n-fa),0]);
    const T=new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,-dist,1]);
    const cx=Math.cos(rotX),sx=Math.sin(rotX),cy=Math.cos(rotY),sy=Math.sin(rotY);
    const RX=new Float32Array([1,0,0,0, 0,cx,sx,0, 0,-sx,cx,0, 0,0,0,1]);
    const RY=new Float32Array([cy,0,-sy,0, 0,1,0,0, sy,0,cy,0, 0,0,0,1]);
    gl.uniformMatrix4fv(uMvp,false,mul(P,mul(T,mul(RX,RY))));
    gl.drawElements(gl.TRIANGLES,DATA.idx.length,use32?gl.UNSIGNED_INT:gl.UNSIGNED_SHORT,0);
    requestAnimationFrame(draw);
  };
  draw();
}
</script>
</body>
</html>`;
}

async function exportStandaloneHTML3DInternal() {
    try {
        if (typeof flushPending3DMeshIfDirty === 'function') flushPending3DMeshIfDirty();
        const htmlStr = buildStandaloneHTML3DString();
        if (!htmlStr) return false;
        const blob = new Blob([htmlStr], { type: 'text/html;charset=utf-8' });
        downloadFileDirect(blob, `StudiosPro_Interactive_3D_Showcase_${Date.now()}.html`);
        showToast(currentLang === 'fr' ? '🌐 Fichier 3D HTML interactif autonome téléchargé !' : '🌐 Standalone Interactive 3D HTML exported!');
        return true;
    } catch (err) {
        console.error('Standalone HTML 3D export error:', err);
        return false;
    }
}

async function downloadStandaloneHTML3D() {
    return await exportStandaloneHTML3DInternal();
}

// ==========================================
// 🎬 1-CLICK LAYER-BUILD TIME-LAPSE REEL GENERATOR (9:16 TIKTOK/REELS & 1:1 ETSY WEBM)
// ==========================================
let _isRecordingTimelapse = false;

function openTimelapseModal() {
    closeAllModals();
    if (typeof flushPending3DMeshIfDirty === 'function') flushPending3DMeshIfDirty();
    const modal = document.getElementById('timelapse-modal');
    if (modal) modal.style.display = 'flex';
}

async function recordLayerBuildTimelapse(aspectMode = '9:16') {
    if (_isRecordingTimelapse) return;
    if (!renderer || !scene || !camera || !controls) {
        showToast(currentLang === 'fr' ? 'Moteur 3D requis pour la vidéo.' : '3D engine required for video export.');
        return;
    }
    if (typeof MediaRecorder === 'undefined' || typeof HTMLCanvasElement.prototype.captureStream !== 'function') {
        showToast(currentLang === 'fr' ? 'Votre navigateur ne supporte pas MediaRecorder WebM.' : 'Your browser does not support WebM MediaRecorder.');
        return;
    }

    _isRecordingTimelapse = true;
    const pBox = document.getElementById('timelapse-progress-box');
    const pBar = document.getElementById('timelapse-progress-bar');
    const pText = document.getElementById('timelapse-status-text');
    if (pBox) pBox.style.display = 'block';
    if (pBar) pBar.style.width = '5%';
    if (pText) pText.innerText = currentLang === 'fr' ? 'Préparation du rendu Time-Lapse...' : 'Preparing Time-Lapse video render...';

    // Save current studio camera, clipPlane & raking light so we restore seamlessly!
    const savedPos = camera.position.clone();
    const savedTarget = controls.target.clone();
    const savedAz = config.rakingLightAngle;
    const savedEl = config.rakingLightElevation;
    const savedLayer = currentSimLayer;
    const wasSimActive = isSlicerSimulationActive;
    const wasCrossActive = config.crossSectionActive;
    if (wasCrossActive && crossSectionClipPlane) crossSectionClipPlane.constant = 10000;

    const isVertical = (aspectMode === '9:16');
    const outW = isVertical ? 720 : 960;
    const outH = isVertical ? 1280 : 960;
    const compCvs = document.createElement('canvas');
    compCvs.width = outW;
    compCvs.height = outH;
    const ctx = compCvs.getContext('2d');

    const mimeCandidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    const mimeType = mimeCandidates.find(m => MediaRecorder.isTypeSupported(m)) || '';
    const stream = compCvs.captureStream(30);
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 4500000 } : { videoBitsPerSecond: 4500000 });
    const chunks = [];
    recorder.ondataavailable = (ev) => { if (ev.data && ev.data.size > 0) chunks.push(ev.data); };

    const recDonePromise = new Promise((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType || 'video/webm' }));
    });

    try {
        const totalLayers = getTotalLayerCount();
        const metrics = computePrintMetrics();
        const isFreeUser = !window.isPremiumUser;
        const wMm = Math.max(40, config.width || 140);
        const hMm = Math.max(40, config.height || 140);
        const baseRadius = Math.max(wMm, hMm) * 1.95;

        // Precompute swap layers so live caption displays the active filament name!
        const swapSchedule = filaments.map((f, idx) => {
            const { startLayer, startZ } = getSlotStartZAndLayer(idx);
            return { idx, name: f.name, color: f.color, startLayer, startZ };
        });

        recorder.start();
        const totalFrames = 195; // ~6.5 seconds @ 30fps
        const buildEndFrame = 120;
        const orbitEndFrame = 175;

        for (let frame = 0; frame < totalFrames; frame++) {
            const prog = frame / (totalFrames - 1);
            let activeLayer = totalLayers;
            let activeFil = swapSchedule[swapSchedule.length - 1];

            if (frame <= buildEndFrame) {
                const t = frame / buildEndFrame;
                activeLayer = Math.max(1, Math.min(totalLayers, Math.round(1 + t * (totalLayers - 1))));
                updateSlicerSimulation(activeLayer);
                for (let k = swapSchedule.length - 1; k >= 0; k--) {
                    if (activeLayer >= swapSchedule[k].startLayer) { activeFil = swapSchedule[k]; break; }
                }
                const ang = -0.32 + t * 0.64;
                camera.position.set(Math.sin(ang) * baseRadius * 0.48, -baseRadius * 0.56, Math.cos(ang) * baseRadius * 0.92);
                controls.target.set(0, 0, 1.2);
                camera.lookAt(0, 0, 1.2);
            } else if (frame <= orbitEndFrame) {
                if (frame === buildEndFrame + 1) resetSlicerSimulation();
                const t = (frame - buildEndFrame) / (orbitEndFrame - buildEndFrame);
                const ang = 0.32 - Math.sin(t * Math.PI) * 0.68;
                camera.position.set(Math.sin(ang) * baseRadius * 0.45, -baseRadius * (0.56 - t * 0.36), Math.cos(ang) * baseRadius * 0.96);
                controls.target.set(0, 0, 1.2);
                camera.lookAt(0, 0, 1.2);
                // Sweep raking light to shimmer across 0.08mm relief ridges!
                config.rakingLightAngle = Math.round((savedAz + t * 140) % 360);
                config.rakingLightElevation = 28;
                updateRakingLightPosition();
            } else {
                // Hero finale hold
                camera.position.set(0, -baseRadius * 0.22, baseRadius * 0.98);
                controls.target.set(0, 0, 1.2);
                camera.lookAt(0, 0, 1.2);
            }

            renderer.render(scene, camera);

            // Composite sleek Studio Reel frame
            const grad = ctx.createLinearGradient(0, 0, 0, outH);
            grad.addColorStop(0, '#070b14');
            grad.addColorStop(0.5, '#0c1324');
            grad.addColorStop(1, '#050810');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, outW, outH);

            // Fit rendered WebGL canvas cleanly in center
            const glCvs = renderer.domElement;
            const stagePad = isVertical ? 36 : 42;
            const stageTop = isVertical ? 150 : 92;
            const stageBot = isVertical ? 230 : 120;
            const availW = outW - stagePad * 2;
            const availH = outH - stageTop - stageBot;
            const scale = Math.min(availW / Math.max(1, glCvs.width), availH / Math.max(1, glCvs.height));
            const dw = glCvs.width * scale;
            const dh = glCvs.height * scale;
            ctx.drawImage(glCvs, (outW - dw) * 0.5, stageTop + (availH - dh) * 0.5, dw, dh);

            // Top title & live layer progress pill
            ctx.fillStyle = '#38bdf8';
            ctx.font = '800 26px Outfit, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('3D FILAMENT PAINTING', outW * 0.5, isVertical ? 68 : 44);

            // Live layer pill
            const pillW = Math.min(outW - 72, 520);
            const pillH = 44;
            const pillX = (outW - pillW) * 0.5;
            const pillY = isVertical ? 90 : 58;
            drawRoundedRectPath(ctx, pillX, pillY, pillW, pillH, 22);
            ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = activeFil ? activeFil.color : '#38bdf8';
            ctx.beginPath();
            ctx.arc(pillX + 24, pillY + pillH * 0.5, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = '#f8fafc';
            ctx.font = '700 18px Inter, system-ui, sans-serif';
            ctx.textAlign = 'left';
            const statusStr = frame <= buildEndFrame
                ? `Layer ${activeLayer}/${totalLayers}  •  ${(activeFil?.name || '').slice(0, 24)}`
                : `Complete 3D Relief  •  ${config.width}×${config.height}mm (${metrics.totalGrams}g)`;
            ctx.fillText(statusStr, pillX + 44, pillY + pillH * 0.5 + 6);

            // Bottom Filament Swatch Bar
            const swY = outH - (isVertical ? 148 : 88);
            const swGap = 10;
            const swSize = Math.min(46, Math.floor((outW - 110) / Math.max(1, filaments.length)) - swGap);
            const totalSwW = filaments.length * (swSize + swGap) - swGap;
            let sx = (outW - totalSwW) * 0.5;
            filaments.forEach((f, idx) => {
                drawRoundedRectPath(ctx, sx, swY, swSize, 22, 6);
                ctx.fillStyle = f.color;
                ctx.fill();
                ctx.strokeStyle = (activeFil && activeFil.idx === idx && frame <= buildEndFrame) ? '#38bdf8' : 'rgba(255,255,255,0.35)';
                ctx.lineWidth = (activeFil && activeFil.idx === idx && frame <= buildEndFrame) ? 3 : 1;
                ctx.stroke();
                sx += swSize + swGap;
            });

            // Specs footer + Watermark on Free accounts (100% Free Viral Export!)
            ctx.textAlign = 'center';
            ctx.fillStyle = '#94a3b8';
            ctx.font = '600 16px Inter, system-ui, sans-serif';
            ctx.fillText(`${config.width}×${config.height}×${config.maxRelief}mm  •  ${config.layerHeight}mm Layers  •  ${filaments.length} Spools`, outW * 0.5, outH - (isVertical ? 94 : 44));

            if (isFreeUser) {
                ctx.fillStyle = '#38bdf8';
                ctx.font = '700 18px Outfit, system-ui, sans-serif';
                ctx.fillText('Created with Studios-Pro.com', outW * 0.5, outH - (isVertical ? 48 : 18));
            }

            if (pBar) pBar.style.width = `${Math.round(8 + prog * 88)}%`;
            if (pText && frame % 12 === 0) {
                pText.innerText = currentLang === 'fr'
                    ? `Enregistrement Time-Lapse (${Math.round(prog * 100)}%)...`
                    : `Recording Time-Lapse Reel (${Math.round(prog * 100)}%)...`;
            }
            await new Promise(r => setTimeout(r, 33));
        }

        recorder.stop();
        const videoBlob = await recDonePromise;
        if (videoBlob && videoBlob.size > 1000) {
            const tag = isVertical ? '9x16_Reels' : '1x1_Square';
            downloadFileDirect(videoBlob, `StudiosPro_LayerBuild_${tag}_${Date.now()}.webm`);
            showToast(currentLang === 'fr'
                ? '🎬 Vidéo Time-Lapse (.webm) téléchargée ! Prête pour TikTok / Reels / Etsy.'
                : '🎬 Layer-Build Time-Lapse (.webm) downloaded! Ready for TikTok / Reels / Etsy.');
            closeAllModals();
        } else {
            throw new Error('Empty recording');
        }
    } catch (err) {
        console.error('Time-lapse recording failed:', err);
        showToast(currentLang === 'fr' ? '⚠️ Erreur lors de la génération vidéo.' : '⚠️ Time-lapse recording error.');
    } finally {
        // Restore studio state cleanly
        camera.position.copy(savedPos);
        controls.target.copy(savedTarget);
        controls.update();
        config.rakingLightAngle = savedAz;
        config.rakingLightElevation = savedEl;
        updateRakingLightPosition();
        if (wasSimActive) updateSlicerSimulation(savedLayer);
        else resetSlicerSimulation();
        if (wasCrossActive && typeof syncCrossSectionCutaway === 'function') syncCrossSectionCutaway();
        renderer.render(scene, camera);
        _isRecordingTimelapse = false;
        if (pBox) pBox.style.display = 'none';
    }
}

