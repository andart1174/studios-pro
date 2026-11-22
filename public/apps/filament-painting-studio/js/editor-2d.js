// ==========================================
// 🎨 2D STUDIO & SMART HEALING ERASER ENGINE
// ==========================================
// editorZoom is declared in js/catalog-td.js

function updateEditorCanvasDisplaySize() {
    if (!editorCanvas || !processedCanvas.width || !processedCanvas.height) return;
    const stage = document.getElementById('editor-canvas-stage');
    
    // The aspect ratio must strictly match the 3D model plate (config.width / config.height)
    const plateAspect = (config.width && config.height) ? (config.width / config.height) : 1.0;
    
    const maxStageW = stage ? Math.max(300, stage.clientWidth - 80) : 600;
    const maxStageH = stage ? Math.max(300, stage.clientHeight - 80) : 600;

    let baseW = 560;
    let baseH = baseW / plateAspect;

    if (baseH > maxStageH && maxStageH > 250) {
        baseH = maxStageH;
        baseW = baseH * plateAspect;
    }
    if (baseW > maxStageW && maxStageW > 250) {
        baseW = maxStageW;
        baseH = baseW / plateAspect;
    }

    const finalW = Math.round(baseW * editorZoom);
    const finalH = Math.round(baseH * editorZoom);

    editorCanvas.style.width = `${finalW}px`;
    editorCanvas.style.height = `${finalH}px`;
    editorCanvas.style.aspectRatio = `${plateAspect}`;

    const zoomBadge = document.getElementById('btn-zoom-val');
    if (zoomBadge) zoomBadge.innerText = `${Math.round(editorZoom * 100)}%`;
}

function zoomEditor(delta) {
    editorZoom = Math.max(0.5, Math.min(3.0, editorZoom + delta));
    updateEditorCanvasDisplaySize();
}

function resetEditorZoom() {
    editorZoom = 1.0;
    updateEditorCanvasDisplaySize();
}

window.addEventListener('resize', () => {
    if (centerViewMode === '2d') updateEditorCanvasDisplaySize();
});

// Renders 2D Canvas matching the 3D Viewport photorealistic colors + Symmetry, Cutout Alpha & Z-Chisel Overlays
let _last2DDisplayW = 0, _last2DDisplayH = 0, _last2DDisplayZoom = 0;

function render2DEditorPreview() {
    if (!editorCanvas || !editorCtx || !colorDataBuffer || !processedCanvas.width) return;
    const width = processedCanvas.width;
    const height = processedCanvas.height;

    let sizeChanged = false;
    if (editorCanvas.width !== width || editorCanvas.height !== height) {
        editorCanvas.width = width;
        editorCanvas.height = height;
        sizeChanged = true;
    }

    const imgData = editorCtx.createImageData(width, height);
    const data = imgData.data;
    const showZMap = (activeEditorTool === 'chisel' || activeEditorTool === 'fx') && (activeEditorTool === 'fx' || !!document.getElementById('chk-show-zmap')?.checked);

    const snapFactor = ((config.boundarySharpness !== undefined ? config.boundarySharpness : config.colorSnap) || 80) / 100.0;
    const tdBlendStrength = (config.tdOpticalBlend !== undefined ? config.tdOpticalBlend : 65) / 100.0;
    const ditherPct = config.opticalDithering !== undefined ? config.opticalDithering : 20;
    const baseZ = typeof getEffectiveRearBaseZ === 'function' ? getEffectiveRearBaseZ() : (config.baseThickness || 0.60);
    const maxReliefZ = Math.max(baseZ + 0.4, config.maxRelief || 2.4);
    const parsedFilaments = filaments.map(f => ({
        rgb: hexToRgb(f.color),
        color: f.color,
        startPct: f.startPct,
        td: f.td || 3.0
    }));
    const sortedTD = prepareSortedFilamentsForTD(filaments);
    const baseRgbCache = parsedFilaments[0] ? parsedFilaments[0].rgb : [17, 24, 39];
    const cachedBgRgb = computeBorderBackgroundRGB(colorDataBuffer, width, height);

    let hasSolidPixels = false;
    for (let pIdx = 0; pIdx < width * height; pIdx++) {
        if (!isPixelCutoutVoid(pIdx % width, (pIdx / width) | 0, width, height, cachedBgRgb, baseRgbCache)) {
            hasSolidPixels = true;
            break;
        }
    }

    const isDrawOrTemplate = (studioMode === 'draw' || isDrawingTemplateActive);
    const kelvinHex = (typeof KELVIN_HEX_MAP !== 'undefined' ? KELVIN_HEX_MAP[config.lightboxKelvin || 4000] : 0xfff4e0) || 0xfff4e0;

    for (let i = 0; i < colorDataBuffer.length; i += 4) {
        const pIdx = i >> 2;
        const colIdx = pIdx % width;
        const rowIdx = (pIdx / width) | 0;

        // Show dark studio alpha-checkerboard in BOTH Photo AND Draw/Template modes for voids/cutouts/shapes!
        if (hasSolidPixels && isPixelCutoutVoid(colIdx, rowIdx, width, height, cachedBgRgb, baseRgbCache)) {
            const checker = (((colIdx >> 3) + (rowIdx >> 3)) & 1) === 0;
            data[i] = checker ? 13 : 21;
            data[i + 1] = checker ? 18 : 29;
            data[i + 2] = checker ? 28 : 44;
            data[i + 3] = 255;
            continue;
        }

        const userFilSlot = (filamentSlotBuffer && filamentSlotBuffer[pIdx] !== 255 && filamentSlotBuffer[pIdx] < parsedFilaments.length) ? filamentSlotBuffer[pIdx] : null;

        if (userFilSlot !== null) {
            // Live remap from active filaments[userFilSlot] so changing spool color ALWAYS updates 2D Draw/Template view!
            const filRgb = parsedFilaments[userFilSlot].rgb;
            data[i] = filRgb[0];
            data[i + 1] = filRgb[1];
            data[i + 2] = filRgb[2];
            data[i + 3] = 255;
        } else if (isDrawOrTemplate) {
            data[i] = colorDataBuffer[i];
            data[i + 1] = colorDataBuffer[i + 1];
            data[i + 2] = colorDataBuffer[i + 2];
            data[i + 3] = 255;
        } else {
            const r = colorDataBuffer[i];
            const g = colorDataBuffer[i + 1];
            const b = colorDataBuffer[i + 2];
            const lum = heightDataBuffer ? heightDataBuffer[pIdx] : ((0.299 * r + 0.587 * g + 0.114 * b) / 255.0);
            const zDelta = customZDeltaBuffer ? customZDeltaBuffer[pIdx] : 0;

            if (config.colorMode === 'luminance') {
                const gVal = Math.round(lum * 255);
                data[i] = gVal; data[i + 1] = gVal; data[i + 2] = gVal; data[i + 3] = 255;
            } else if (config.colorMode === 'cmyw') {
                const thick = baseZ + (1.0 - Math.pow(lum, 0.72)) * (maxReliefZ - baseZ) + zDelta;
                const [cr2, cg2, cb2] = computeCMYWBacklitColor(r, g, b, Math.max(0.2, thick), maxReliefZ, kelvinHex);
                data[i] = cr2; data[i + 1] = cg2; data[i + 2] = cb2; data[i + 3] = 255;
            } else if (config.colorMode === 'stratified') {
                const zVal = Math.max(baseZ, Math.min(maxReliefZ, baseZ + lum * (maxReliefZ - baseZ) + zDelta));
                const [tdR, tdG, tdB] = computeBeerLambertTDColor(lum, zVal, baseZ, maxReliefZ, sortedTD, tdBlendStrength, true);
                data[i] = tdR; data[i + 1] = tdG; data[i + 2] = tdB; data[i + 3] = 255;
            } else {
                const bestFilIdx = findClosestFilamentWithDither(r, g, b, colIdx, rowIdx, parsedFilaments, ditherPct);
                const filRgb = parsedFilaments[bestFilIdx].rgb;
                let outR = r + (filRgb[0] - r) * snapFactor;
                let outG = g + (filRgb[1] - g) * snapFactor;
                let outB = b + (filRgb[2] - b) * snapFactor;

                if (!config.removeCanvasBg && tdBlendStrength > 0.05 && bestFilIdx > 0) {
                    const dz = Math.max(0.04, lum * (maxReliefZ - baseZ));
                    const tdMm = Math.max(0.25, parsedFilaments[bestFilIdx].td || 3.0);
                    const transmission = Math.exp(-3.45 * dz / tdMm);
                    const baseInfluence = Math.min(0.36, transmission * tdBlendStrength * 0.40);
                    outR = outR * (1 - baseInfluence) + baseRgbCache[0] * baseInfluence;
                    outG = outG * (1 - baseInfluence) + baseRgbCache[1] * baseInfluence;
                    outB = outB * (1 - baseInfluence) + baseRgbCache[2] * baseInfluence;
                }

                data[i] = Math.max(0, Math.min(255, Math.round(outR)));
                data[i + 1] = Math.max(0, Math.min(255, Math.round(outG)));
                data[i + 2] = Math.max(0, Math.min(255, Math.round(outB)));
                data[i + 3] = 255;
            }
        }

        if (showZMap && customZDeltaBuffer) {
            const zd = customZDeltaBuffer[pIdx];
            if (Math.abs(zd) > 0.01) {
                const alpha = Math.min(0.65, Math.abs(zd) * 0.9);
                if (zd > 0) {
                    data[i] = Math.round(data[i] * (1 - alpha) + 52 * alpha);
                    data[i + 1] = Math.round(data[i + 1] * (1 - alpha) + 211 * alpha);
                    data[i + 2] = Math.round(data[i + 2] * (1 - alpha) + 153 * alpha);
                } else {
                    data[i] = Math.round(data[i] * (1 - alpha) + 251 * alpha);
                    data[i + 1] = Math.round(data[i + 1] * (1 - alpha) + 146 * alpha);
                    data[i + 2] = Math.round(data[i + 2] * (1 - alpha) + 60 * alpha);
                }
            }
        }
    }

    editorCtx.putImageData(imgData, 0, 0);

    // Draw visual symmetry axes matching applyWithSymmetry() geometry 100%!
    if (editorSymmetryMode !== 'none') {
        editorCtx.save();
        editorCtx.strokeStyle = 'rgba(56, 189, 248, 0.50)';
        editorCtx.lineWidth = Math.max(1, width / 280);
        editorCtx.setLineDash([4, 4]);
        const cx = width / 2;
        const cy = height / 2;
        const m = Math.max(width, height);

        const radialMap = { hex6: 6, mandala: 8, rosette12: 12, sun16: 16, lotus24: 24, rot4: 4 };
        if (radialMap[editorSymmetryMode]) {
            const spokes = radialMap[editorSymmetryMode];
            // Offset hex6 by +30deg (pi/6) so guides align with Y-axis mirror folds!
            const phaseOffset = (editorSymmetryMode === 'hex6') ? (Math.PI / 6) : 0;
            for (let k = 0; k < spokes; k++) {
                const ang = phaseOffset + (k * Math.PI * 2) / spokes;
                editorCtx.beginPath();
                editorCtx.moveTo(cx, cy);
                editorCtx.lineTo(cx + Math.cos(ang) * m, cy + Math.sin(ang) * m);
                editorCtx.stroke();
            }
            editorCtx.beginPath();
            editorCtx.arc(cx, cy, Math.min(width, height) * 0.04, 0, Math.PI * 2);
            editorCtx.stroke();
        } else if (editorSymmetryMode === 'tile') {
            editorCtx.beginPath(); editorCtx.moveTo(cx, 0); editorCtx.lineTo(cx, height); editorCtx.stroke();
            editorCtx.beginPath(); editorCtx.moveTo(0, cy); editorCtx.lineTo(width, cy); editorCtx.stroke();
        } else {
            if (editorSymmetryMode === 'x' || editorSymmetryMode === 'quad') {
                editorCtx.beginPath(); editorCtx.moveTo(cx, 0); editorCtx.lineTo(cx, height); editorCtx.stroke();
            }
            if (editorSymmetryMode === 'y' || editorSymmetryMode === 'quad') {
                editorCtx.beginPath(); editorCtx.moveTo(0, cy); editorCtx.lineTo(width, cy); editorCtx.stroke();
            }
            if (editorSymmetryMode === 'diag') {
                // Single main diagonal matching (dx,dy) -> (dy,dx) reflection!
                editorCtx.beginPath(); editorCtx.moveTo(cx - m, cy - m); editorCtx.lineTo(cx + m, cy + m); editorCtx.stroke();
            }
        }
        editorCtx.restore();
    }

    // Draw interactive drag handle crosshair for active un-locked Text, Stamp, or Pattern
    if (activeEditorTool === 'text' && editorTextState.hasLivePreview && editorTextState.posX !== null) {
        editorCtx.save();
        editorCtx.strokeStyle = 'rgba(251, 191, 36, 0.85)';
        editorCtx.lineWidth = 1.5;
        editorCtx.setLineDash([3, 3]);
        editorCtx.beginPath();
        editorCtx.arc(editorTextState.posX, editorTextState.posY, 6, 0, Math.PI * 2);
        editorCtx.stroke();
        editorCtx.restore();
    } else if (activeEditorTool === 'stamp' && editorStampState.hasLivePreview && editorStampState.posX !== null) {
        editorCtx.save();
        editorCtx.strokeStyle = 'rgba(192, 132, 252, 0.85)';
        editorCtx.lineWidth = 1.5;
        editorCtx.setLineDash([3, 3]);
        editorCtx.beginPath();
        editorCtx.arc(editorStampState.posX, editorStampState.posY, 6, 0, Math.PI * 2);
        editorCtx.stroke();
        editorCtx.restore();
    } else if (activeEditorTool === 'pattern' && editorPatternState.hasLivePreview && editorPatternState.posX !== null) {
        editorCtx.save();
        editorCtx.strokeStyle = 'rgba(251, 113, 133, 0.85)';
        editorCtx.lineWidth = 1.5;
        editorCtx.setLineDash([3, 3]);
        editorCtx.beginPath();
        editorCtx.arc(editorPatternState.posX, editorPatternState.posY, 7, 0, Math.PI * 2);
        editorCtx.stroke();
        editorCtx.restore();
    }

    // Only recompute CSS display box when dimensions or zoom actually changed (eliminates layout thrashing!)
    if (sizeChanged || _last2DDisplayW !== config.width || _last2DDisplayH !== config.height || _last2DDisplayZoom !== editorZoom) {
        _last2DDisplayW = config.width;
        _last2DDisplayH = config.height;
        _last2DDisplayZoom = editorZoom;
        updateEditorCanvasDisplaySize();
    }
}

function syncBufferToEditorCanvas() {
    render2DEditorPreview();
}

function ensureUserEditMaskBuffer(pixelCount) {
    if (!pixelCount || pixelCount <= 0) return null;
    if (!userEditMaskBuffer || userEditMaskBuffer.length !== pixelCount) {
        userEditMaskBuffer = new Uint8Array(pixelCount);
    }
    return userEditMaskBuffer;
}

function markUserEditedPixel(pIdx) {
    const len = processedCanvas && processedCanvas.width ? (processedCanvas.width * processedCanvas.height) : 0;
    if (len > 0 && pIdx >= 0 && pIdx < len) {
        ensureUserEditMaskBuffer(len)[pIdx] = 1;
    }
}

function writeEditedPixel(pIdx, r, g, b, slotIdx, zDeltaVal = undefined, cutoutVal = 0) {
    const idx = pIdx * 4;
    colorDataBuffer[idx] = r;
    colorDataBuffer[idx + 1] = g;
    colorDataBuffer[idx + 2] = b;
    colorDataBuffer[idx + 3] = 255;
    if (filamentSlotBuffer && slotIdx !== undefined && slotIdx !== null) filamentSlotBuffer[pIdx] = slotIdx;
    if (customZDeltaBuffer && zDeltaVal !== undefined) customZDeltaBuffer[pIdx] = zDeltaVal;
    if (cutoutMaskBuffer && cutoutVal !== undefined) cutoutMaskBuffer[pIdx] = cutoutVal;
    markUserEditedPixel(pIdx);
}

function cloneLayerMiniBackup(b) {
    if (!b || !b.color) return null;
    return {
        width: b.width,
        height: b.height,
        color: new Uint8ClampedArray(b.color),
        slots: b.slots ? new Uint8Array(b.slots) : null
    };
}

function captureCurrentCanvasBackup(includeMeta = false) {
    if (!colorDataBuffer || !processedCanvas.width) return null;
    const snap = {
        width: processedCanvas.width,
        height: processedCanvas.height,
        color: new Uint8ClampedArray(colorDataBuffer),
        slots: filamentSlotBuffer ? new Uint8Array(filamentSlotBuffer) : null,
        zDelta: customZDeltaBuffer ? new Float32Array(customZDeltaBuffer) : null,
        cutout: cutoutMaskBuffer ? new Uint8Array(cutoutMaskBuffer) : null,
        userMask: userEditMaskBuffer ? new Uint8Array(userEditMaskBuffer) : null
    };
    if (includeMeta) {
        snap.removeCanvasBg = !!config.removeCanvasBg;
        snap.isCanvasUserEdited = !!isCanvasUserEdited;
        snap.isDrawingTemplateActive = !!isDrawingTemplateActive;
        snap.editorSymmetryMode = editorSymmetryMode || 'none';
        snap.activeQRStamp = activeQRStamp ? { ...activeQRStamp } : null;
        snap.preQRBackup = cloneLayerMiniBackup(preQRBackup);
        snap.activeSoundwave = activeSoundwave ? { ...activeSoundwave } : null;
        snap.preSoundwaveBackup = cloneLayerMiniBackup(preSoundwaveBackup);
        snap.textLive = { posX: editorTextState.posX, posY: editorTextState.posY, hasLivePreview: !!editorTextState.hasLivePreview };
        snap.stampLive = { posX: editorStampState.posX, posY: editorStampState.posY, hasLivePreview: !!editorStampState.hasLivePreview };
        snap.patternLive = { posX: editorPatternState.posX, posY: editorPatternState.posY, hasLivePreview: !!editorPatternState.hasLivePreview };
        if (preLiveToolBackup && preLiveToolBackup.color && (editorTextState.hasLivePreview || editorStampState.hasLivePreview || editorPatternState.hasLivePreview)) {
            snap.preLiveLayer = {
                width: preLiveToolBackup.width,
                height: preLiveToolBackup.height,
                color: new Uint8ClampedArray(preLiveToolBackup.color),
                slots: preLiveToolBackup.slots ? new Uint8Array(preLiveToolBackup.slots) : null,
                zDelta: preLiveToolBackup.zDelta ? new Float32Array(preLiveToolBackup.zDelta) : null,
                cutout: preLiveToolBackup.cutout ? new Uint8Array(preLiveToolBackup.cutout) : null,
                userMask: preLiveToolBackup.userMask ? new Uint8Array(preLiveToolBackup.userMask) : null
            };
        }
    }
    return snap;
}

function resetEditHistory() {
    historyStack.length = 0;
    redoStack.length = 0;
    historyIndex = -1;
}

function restoreCanvasFromBackup(backup) {
    if (!backup || !colorDataBuffer || backup.width !== processedCanvas.width || backup.height !== processedCanvas.height) return false;
    colorDataBuffer.set(backup.color);
    if (backup.slots && filamentSlotBuffer) filamentSlotBuffer.set(backup.slots);
    if (backup.zDelta && customZDeltaBuffer) customZDeltaBuffer.set(backup.zDelta);
    if (backup.cutout && cutoutMaskBuffer) cutoutMaskBuffer.set(backup.cutout);
    const len = backup.width * backup.height;
    if (backup.userMask) {
        ensureUserEditMaskBuffer(len).set(backup.userMask);
    } else if (userEditMaskBuffer && userEditMaskBuffer.length === len) {
        userEditMaskBuffer.fill(0);
    }
    if (backup.removeCanvasBg !== undefined) {
        config.removeCanvasBg = !!backup.removeCanvasBg;
        syncRemoveCanvasUI();
    }
    if (backup.isCanvasUserEdited !== undefined) isCanvasUserEdited = !!backup.isCanvasUserEdited;
    if (backup.isDrawingTemplateActive !== undefined) isDrawingTemplateActive = !!backup.isDrawingTemplateActive;
    if (backup.editorSymmetryMode !== undefined) {
        editorSymmetryMode = backup.editorSymmetryMode;
        const symSel = document.getElementById('select-editor-symmetry');
        if (symSel) symSel.value = editorSymmetryMode;
    }
    if (backup.activeQRStamp !== undefined) {
        activeQRStamp = backup.activeQRStamp ? { ...backup.activeQRStamp } : null;
        preQRBackup = cloneLayerMiniBackup(backup.preQRBackup);
        const btnClrQr = document.getElementById('btn-clear-qr');
        if (btnClrQr) btnClrQr.style.display = activeQRStamp ? 'inline-flex' : 'none';
    }
    if (backup.activeSoundwave !== undefined) {
        activeSoundwave = backup.activeSoundwave ? { ...backup.activeSoundwave } : null;
        preSoundwaveBackup = cloneLayerMiniBackup(backup.preSoundwaveBackup);
        const btnClrWv = document.getElementById('btn-clear-wave');
        if (btnClrWv) btnClrWv.style.display = activeSoundwave ? 'inline-flex' : 'none';
    }
    if (backup.textLive) {
        editorTextState.posX = backup.textLive.posX;
        editorTextState.posY = backup.textLive.posY;
        editorTextState.hasLivePreview = !!backup.textLive.hasLivePreview;
    }
    if (backup.stampLive) {
        editorStampState.posX = backup.stampLive.posX;
        editorStampState.posY = backup.stampLive.posY;
        editorStampState.hasLivePreview = !!backup.stampLive.hasLivePreview;
    }
    if (backup.patternLive) {
        editorPatternState.posX = backup.patternLive.posX;
        editorPatternState.posY = backup.patternLive.posY;
        editorPatternState.hasLivePreview = !!backup.patternLive.hasLivePreview;
    }
    return true;
}

function commitLiveToolIfNeeded() {
    if (editorTextState.hasLivePreview || editorStampState.hasLivePreview || editorPatternState.hasLivePreview) {
        editorTextState.hasLivePreview = false;
        editorStampState.hasLivePreview = false;
        editorPatternState.hasLivePreview = false;
        preLiveToolBackup = null;
        syncProcessedCanvasFromBuffer();
        requestMeshUpdate();
    }
}

function syncProcessedCanvasFromBuffer() {
    if (!colorDataBuffer || !processedCanvas.width) return;
    const pCtx = processedCanvas.getContext('2d');
    const outImg = pCtx.createImageData(processedCanvas.width, processedCanvas.height);
    outImg.data.set(colorDataBuffer);
    pCtx.putImageData(outImg, 0, 0);
}

function switchStudioMode(mode) {
    commitLiveToolIfNeeded();
    const prevMode = studioMode;
    studioMode = mode;
    const btnPhoto = document.getElementById('btn-studio-photo');
    const btnDraw = document.getElementById('btn-studio-draw');
    const subPhoto = document.getElementById('subpanel-photo-src');
    const subDrawTpl = document.getElementById('subpanel-draw-tpl');
    const subCleaner = document.getElementById('subpanel-stray-cleaner');
    const subDrawTools = document.getElementById('subpanel-draw-tools');
    const subOrient = document.getElementById('subpanel-orientation');
    const sec1Title = document.getElementById('txt-title-sec1');

    if (mode === 'draw') {
        // Non-destructively back up Photo Mode buffers BEFORE opening blank Draw canvas!
        if (prevMode === 'photo' && !isDrawingTemplateActive && colorDataBuffer) {
            savedPhotoStateBackup = captureCurrentCanvasBackup(false);
        }
        if (btnPhoto) btnPhoto.classList.remove('active');
        if (btnDraw) btnDraw.classList.add('active');
        if (subPhoto) subPhoto.style.display = 'none';
        if (subDrawTpl) subDrawTpl.style.display = 'block';
        if (subCleaner) subCleaner.style.display = 'none';
        if (subDrawTools) subDrawTools.style.display = 'block';
        if (subOrient) subOrient.style.display = 'none';
        if (sec1Title) sec1Title.innerText = currentLang === 'fr' ? '1. Modèles CAD & Toile Vierge' : '1. CAD Templates & Clean Screen';

        openCleanBlankCanvas();
    } else {
        if (btnPhoto) btnPhoto.classList.add('active');
        if (btnDraw) btnDraw.classList.remove('active');
        if (subPhoto) subPhoto.style.display = 'block';
        if (subDrawTpl) subDrawTpl.style.display = 'none';
        if (subCleaner) subCleaner.style.display = 'block';
        if (subDrawTools) subDrawTools.style.display = 'block';
        if (subOrient) subOrient.style.display = 'block';
        if (sec1Title) sec1Title.innerText = translations[currentLang].titleSourceImage;

        isDrawingTemplateActive = false;
        config.removeCanvasBg = false;
        syncRemoveCanvasUI();

        // Restore the user's photo cleanly instead of stranding them on the blank black canvas!
        if (savedPhotoStateBackup && restoreCanvasFromBackup(savedPhotoStateBackup)) {
            syncProcessedCanvasFromBuffer();
            if (typeof rebuildBgExteriorVoidMask === 'function') rebuildBgExteriorVoidMask(processedCanvas.width, processedCanvas.height);
        } else if (sourceImage) {
            processSourceImage(false, true);
        }
        setCenterViewMode('3d');
    }
    if (window.lucide) lucide.createIcons();
}

function setCenterViewMode(mode) {
    if (mode !== '2d') commitLiveToolIfNeeded();
    centerViewMode = mode;
    const btn3D = document.getElementById('btn-tab-3d');
    const btn2D = document.getElementById('btn-tab-2d');
    const editorWrapper = document.getElementById('editor-2d-wrapper');
    const slicerHud = document.getElementById('viewport-slicer-hud');
    const vHud = document.querySelector('.viewport-hud');
    const cpHud = document.querySelector('.viewport-controls-hud');

    if (mode === '2d') {
        if (btn3D) btn3D.classList.remove('active');
        if (btn2D) btn2D.classList.add('active');
        if (editorWrapper) editorWrapper.style.display = 'flex';
        if (slicerHud) slicerHud.style.display = 'none';
        if (vHud) vHud.style.display = 'none';
        if (cpHud) cpHud.style.display = 'none';

        init2DEditor();
        populateOutlineSlotDropdowns();
        render2DEditorPreview();
        updateFilamentSwatchesUI();
        setTimeout(updateEditorCanvasDisplaySize, 30);
    } else {
        if (btn3D) btn3D.classList.add('active');
        if (btn2D) btn2D.classList.remove('active');
        if (editorWrapper) editorWrapper.style.display = 'none';
        if (slicerHud) slicerHud.style.display = 'flex';
        if (vHud) vHud.style.display = 'flex';
        if (cpHud) cpHud.style.display = 'flex';

        if (colorDataBuffer && processedCanvas.width) {
            syncProcessedCanvasFromBuffer();
            if (typeof flushPending3DMeshIfDirty === 'function') flushPending3DMeshIfDirty();
            generate3DReliefMesh();
        }
    }
    if (window.lucide) lucide.createIcons();
}

function openHealingStudio() {
    setCenterViewMode('2d');
    setEditorTool('heal');
    showToast(translations[currentLang].toastHealingApplied);
}

function openTextStudioIn2D() {
    setCenterViewMode('2d');
    setEditorTool('text');
    const inp = document.getElementById('editor-text-input');
    if (inp) {
        inp.focus();
        inp.select();
    }
}

function openCleanBlankCanvas() {
    loadDrawingTemplate('blank');
    setCenterViewMode('2d');
    // Automatically pick a bright contrasting filament color (e.g. White/Gold) so drawing on the dark base is immediately visible
    if (activeFilamentSlot === 0 && filaments.length > 1) {
        activeFilamentSlot = filaments.length - 1;
        updateFilamentSwatchesUI();
    }
    if (activeEditorTool === 'heal') {
        setEditorTool('brush');
    }
    showToast(translations[currentLang].toastCleanCanvasReady);
}

function populateOutlineSlotDropdowns() {
    ['select-text-outline-slot', 'select-stamp-outline-slot', 'select-shape-outline-slot'].forEach(selId => {
        const sel = document.getElementById(selId);
        if (!sel) return;
        const curNum = parseInt(sel.value, 10);
        const noneLabel = translations[currentLang]?.optOutlineNone || 'None';
        let html = `<option value="-1">${noneLabel}</option>`;
        filaments.forEach((f, idx) => {
            html += `<option value="${idx}">Slot ${idx + 1}: ${window.safeEscapeHtml(f.name.split(' ')[0])} (${f.color.toUpperCase()})</option>`;
        });
        sel.innerHTML = html;
        sel.value = (!isNaN(curNum) && curNum >= -1 && curNum < filaments.length) ? String(curNum) : '-1';
    });

    const rimSel = document.getElementById('select-brush-rim-slot');
    if (rimSel) {
        const curRim = parseInt(rimSel.value, 10);
        let html = '';
        filaments.forEach((f, idx) => {
            html += `<option value="${idx}">Slot ${idx + 1}: ${window.safeEscapeHtml(f.name.split(' ')[0])} (${f.color.toUpperCase()})</option>`;
        });
        rimSel.innerHTML = html;
        rimSel.value = (!isNaN(curRim) && curRim >= 0 && curRim < filaments.length) ? String(curRim) : '0';
    }
}

const ALL_CAD_SHAPE_TYPES = [
    'rect', 'circle', 'line', 'triangle', 'diamond', 'pentagon', 'hexagon', 'octagon',
    'star_poly', 'gear', 'flower', 'heart_shape', 'crescent', 'cross', 'arrow', 'spiral', 'wave', 'rings'
];

function isCADShapeTool(tool) {
    return tool === 'shapes' || ALL_CAD_SHAPE_TYPES.includes(tool);
}

function selectCADShapeType(shapeType) {
    activeCADShapeType = shapeType || 'rect';
    ALL_CAD_SHAPE_TYPES.forEach(st => {
        document.getElementById(`cad-shape-btn-${st}`)?.classList.toggle('active', st === activeCADShapeType);
    });
    if (shapeType === 'rect' || shapeType === 'circle' || shapeType === 'line') {
        setEditorTool(shapeType);
    } else {
        setEditorTool('shapes');
    }
}

function setEditorTool(tool) {
    if (activeEditorTool !== tool) {
        commitLiveToolIfNeeded();
    }
    activeEditorTool = tool;
    if (tool === 'rect' || tool === 'circle' || tool === 'line') {
        activeCADShapeType = tool;
        ALL_CAD_SHAPE_TYPES.forEach(st => {
            document.getElementById(`cad-shape-btn-${st}`)?.classList.toggle('active', st === activeCADShapeType);
        });
    }

    ['heal', 'brush', 'fill', 'recolor', 'chisel', 'cutout', 'fx', 'rect', 'circle', 'line', 'shapes', 'pattern', 'text', 'stamp'].forEach(t => {
        const btn = document.getElementById(`tool-btn-${t}`);
        if (btn) {
            btn.classList.remove('active', 'heal-active');
            if (t === tool) {
                if (tool === 'heal') btn.classList.add('heal-active');
                else btn.classList.add('active');
            }
        }
    });

    // Toggle contextual sub-toolbars
    const subBrush = document.getElementById('editor-subbar-brush');
    const subText = document.getElementById('editor-subbar-text');
    const subStamp = document.getElementById('editor-subbar-stamp');
    const subChisel = document.getElementById('editor-subbar-chisel');
    const subShape = document.getElementById('editor-subbar-shape');
    const subPattern = document.getElementById('editor-subbar-pattern');
    const subCutout = document.getElementById('editor-subbar-cutout');
    const subFx = document.getElementById('editor-subbar-fx');

    if (subBrush) subBrush.classList.toggle('active', tool === 'brush');
    if (subText) subText.classList.toggle('active', tool === 'text');
    if (subStamp) subStamp.classList.toggle('active', tool === 'stamp');
    if (subChisel) subChisel.classList.toggle('active', tool === 'chisel');
    if (subShape) subShape.classList.toggle('active', isCADShapeTool(tool));
    if (subPattern) subPattern.classList.toggle('active', tool === 'pattern');
    if (subCutout) subCutout.classList.toggle('active', tool === 'cutout');
    if (subFx) subFx.classList.toggle('active', tool === 'fx');

    populateOutlineSlotDropdowns();

    if (tool === 'text') {
        if (activeFilamentSlot === 0 && filaments.length > 1) {
            activeFilamentSlot = filaments.length - 1;
            updateFilamentSwatchesUI();
        }
        // Prevent double-clicking Text button from baking a duplicate into preLiveToolBackup!
        if (!editorTextState.hasLivePreview) {
            pushHistoryState();
            preLiveToolBackup = captureCurrentCanvasBackup();
        }
        if (editorTextState.posX === null || editorTextState.posY === null) {
            editorTextState.posX = Math.round((processedCanvas.width || 360) / 2);
            editorTextState.posY = Math.round((processedCanvas.height || 360) / 2);
        }
        onEditorTextControlChange();
        setTimeout(() => {
            const inp = document.getElementById('editor-text-input');
            if (inp && centerViewMode === '2d') inp.focus();
        }, 40);
    } else if (tool === 'stamp') {
        if (activeFilamentSlot === 0 && filaments.length > 1) {
            activeFilamentSlot = filaments.length - 1;
            updateFilamentSwatchesUI();
        }
        if (!editorStampState.hasLivePreview) {
            pushHistoryState();
            preLiveToolBackup = captureCurrentCanvasBackup();
        }
        if (editorStampState.posX === null || editorStampState.posY === null) {
            editorStampState.posX = Math.round((processedCanvas.width || 360) / 2);
            editorStampState.posY = Math.round((processedCanvas.height || 360) / 2);
        }
        onEditorStampControlChange();
    } else if (tool === 'pattern') {
        if (activeFilamentSlot === 0 && filaments.length > 1) {
            activeFilamentSlot = filaments.length - 1;
            updateFilamentSwatchesUI();
        }
        if (!editorPatternState.hasLivePreview) {
            pushHistoryState();
            preLiveToolBackup = captureCurrentCanvasBackup();
        }
        if (editorPatternState.posX === null || editorPatternState.posY === null) {
            editorPatternState.posX = Math.round((processedCanvas.width || 360) / 2);
            editorPatternState.posY = Math.round((processedCanvas.height || 360) / 2);
        }
        updateLivePatternPreview();
    } else {
        render2DEditorPreview();
    }

    setTimeout(updateEditorCanvasDisplaySize, 20);
}

function updateEditorSymmetry(val) {
    editorSymmetryMode = val || 'none';
    render2DEditorPreview();
}

function updateEditorRadius(val) {
    editorBrushRadius = parseInt(val);
    const badge = document.getElementById('badge-editor-radius');
    if (badge) badge.innerText = `${val}px`;
}

function updateEditorTolerance(val) {
    editorFillTolerance = parseInt(val) || 38;
    const badge = document.getElementById('badge-editor-tolerance');
    if (badge) badge.innerText = `${editorFillTolerance}`;
}

function updateFilamentSwatchesUI() {
    const container = document.getElementById('editor-filament-swatches');
    if (!container) return;
    container.innerHTML = '';

    filaments.forEach((fil, idx) => {
        const chip = document.createElement('div');
        chip.className = `filament-swatch-chip ${idx === activeFilamentSlot ? 'selected' : ''}`;
        chip.style.backgroundColor = fil.color;
        chip.title = `Slot ${idx + 1}: ${fil.name} (${fil.color})`;
        chip.onclick = () => selectActiveFilamentSlot(idx);
        container.appendChild(chip);
    });

    const colorPicker = document.getElementById('editor-active-color-picker');
    if (colorPicker && filaments[activeFilamentSlot]) {
        colorPicker.value = filaments[activeFilamentSlot].color;
    }
}

function selectActiveFilamentSlot(idx) {
    activeFilamentSlot = idx;
    updateFilamentSwatchesUI();
    if (activeEditorTool === 'heal') {
        setEditorTool('brush');
    } else if (activeEditorTool === 'text') {
        updateLiveTextPreview();
    } else if (activeEditorTool === 'stamp') {
        updateLiveStampPreview();
    } else if (activeEditorTool === 'pattern') {
        updateLivePatternPreview();
    }
}

function updateActiveFilamentCustomColor(hexColor) {
    if (!filaments[activeFilamentSlot]) return;
    filaments[activeFilamentSlot].color = hexColor;
    updateFilamentSwatchesUI();
    renderFilamentStackUI();
    if (activeEditorTool === 'text') {
        updateLiveTextPreview();
    } else if (activeEditorTool === 'stamp') {
        updateLiveStampPreview();
    } else if (activeEditorTool === 'pattern') {
        updateLivePatternPreview();
    } else {
        render2DEditorPreview();
        requestMeshUpdate();
    }
}

function init2DEditor() {
    if (!editorCanvas) {
        editorCanvas = document.getElementById('interactive-editor-canvas');
        if (!editorCanvas) return;
        editorCtx = editorCanvas.getContext('2d');
        editorCanvas.style.touchAction = 'none';

        editorCanvas.addEventListener('pointerdown', handleEditorPointerDown);
        window.addEventListener('pointermove', handleEditorPointerMove);
        window.addEventListener('pointerup', handleEditorPointerUp);
        window.addEventListener('pointercancel', handleEditorPointerUp);
    }

    if (processedCanvas.width > 0) {
        editorCanvas.width = processedCanvas.width;
        editorCanvas.height = processedCanvas.height;
        updateEditorCanvasDisplaySize();
    }
}

// Global Undo/Redo shortcuts work in BOTH 3D and 2D views immediately on boot!
window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
    }
});

function applyHistorySnapshot(state, toastMsg) {
    if (!state) return false;
    if (!restoreCanvasFromBackup(state)) return false;
    if (state.preLiveLayer) {
        preLiveToolBackup = state.preLiveLayer;
    } else {
        preLiveToolBackup = captureCurrentCanvasBackup();
    }
    if (!state.textLive) editorTextState.hasLivePreview = false;
    if (!state.stampLive) editorStampState.hasLivePreview = false;
    if (!state.patternLive) editorPatternState.hasLivePreview = false;
    syncProcessedCanvasFromBuffer();
    render2DEditorPreview();
    requestMeshUpdate();
    showToast(toastMsg);
    return true;
}

function pushHistoryState() {
    const snap = captureCurrentCanvasBackup(true);
    if (!snap) return;
    redoStack.length = 0;
    historyStack.push(snap);
    if (historyStack.length > MAX_HISTORY) {
        historyStack.shift();
    }
    historyIndex = historyStack.length - 1;
}

function undo() {
    if (historyStack.length === 0) return;
    const cur = captureCurrentCanvasBackup(true);
    const prev = historyStack.pop();
    historyIndex = historyStack.length - 1;
    if (applyHistorySnapshot(prev, translations[currentLang].toastUndo)) {
        if (cur) {
            redoStack.push(cur);
            if (redoStack.length > MAX_HISTORY) redoStack.shift();
        }
    }
}

function redo() {
    if (redoStack.length === 0) return;
    const cur = captureCurrentCanvasBackup(true);
    const next = redoStack.pop();
    if (applyHistorySnapshot(next, translations[currentLang].toastRedo)) {
        if (cur) {
            historyStack.push(cur);
            if (historyStack.length > MAX_HISTORY) historyStack.shift();
        }
        historyIndex = historyStack.length - 1;
    }
}

// ==========================================
// 🪞 12-MODE LIVE SYMMETRY, KALEIDOSCOPE MANDALA & TILE TRANSFORMER
// ==========================================
function applyWithSymmetry(x0, y0, x1, y1, drawFn) {
    const w = processedCanvas.width || 360;
    const h = processedCanvas.height || 360;
    const cx = (w - 1) / 2;
    const cy = (h - 1) / 2;

    drawFn(Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1));
    if (editorSymmetryMode === 'none') return;

    if (editorSymmetryMode === 'x' || editorSymmetryMode === 'quad') {
        drawFn(Math.round(w - 1 - x0), Math.round(y0), Math.round(w - 1 - x1), Math.round(y1));
    }
    if (editorSymmetryMode === 'y' || editorSymmetryMode === 'quad') {
        drawFn(Math.round(x0), Math.round(h - 1 - y0), Math.round(x1), Math.round(h - 1 - y1));
    }
    if (editorSymmetryMode === 'quad') {
        drawFn(Math.round(w - 1 - x0), Math.round(h - 1 - y0), Math.round(w - 1 - x1), Math.round(h - 1 - y1));
        return;
    }
    if (editorSymmetryMode === 'diag') {
        const dx0 = x0 - cx, dy0 = y0 - cy;
        const dx1 = x1 - cx, dy1 = y1 - cy;
        drawFn(Math.round(cx + dy0), Math.round(cy + dx0), Math.round(cx + dy1), Math.round(cy + dx1));
        return;
    }
    if (editorSymmetryMode === 'rot4') {
        const dx0 = x0 - cx, dy0 = y0 - cy;
        const dx1 = x1 - cx, dy1 = y1 - cy;
        drawFn(Math.round(cx - dy0), Math.round(cy + dx0), Math.round(cx - dy1), Math.round(cy + dx1));
        drawFn(Math.round(cx - dx0), Math.round(cy - dy0), Math.round(cx - dx1), Math.round(cy - dy1));
        drawFn(Math.round(cx + dy0), Math.round(cy - dx0), Math.round(cx + dy1), Math.round(cy - dx1));
        return;
    }
    if (editorSymmetryMode === 'tile') {
        const hw = Math.round(w / 2);
        const hh = Math.round(h / 2);
        const dx = x1 - x0;
        const dy = y1 - y0;
        [[hw, 0], [0, hh], [hw, hh]].forEach(([ox, oy]) => {
            const tx0 = ((Math.round(x0) + ox) % w + w) % w;
            const ty0 = ((Math.round(y0) + oy) % h + h) % h;
            const tx1 = Math.round(tx0 + dx);
            const ty1 = Math.round(ty0 + dy);
            // Only draw continuous segment if it does not wrap across seam (eliminates streaking!)
            if (tx1 >= 0 && tx1 < w && ty1 >= 0 && ty1 < h) {
                drawFn(tx0, ty0, tx1, ty1);
            }
        });
        return;
    }

    // N-Fold Radial Mandala / Kaleidoscope Modes: hex6 (6x), mandala (8x), rosette12 (12x), sun16 (16x), lotus24 (24x)
    const foldMap = { hex6: 3, mandala: 4, rosette12: 6, sun16: 8, lotus24: 12 };
    const folds = foldMap[editorSymmetryMode];
    if (folds) {
        const dx0 = x0 - cx, dy0 = y0 - cy;
        const dx1 = x1 - cx, dy1 = y1 - cy;
        for (let k = 0; k < folds; k++) {
            const ang = (k * Math.PI * 2) / folds;
            const cosA = Math.cos(ang), sinA = Math.sin(ang);
            // Rotated copy
            if (k > 0) {
                const rx0 = dx0 * cosA - dy0 * sinA;
                const ry0 = dx0 * sinA + dy0 * cosA;
                const rx1 = dx1 * cosA - dy1 * sinA;
                const ry1 = dx1 * sinA + dy1 * cosA;
                drawFn(Math.round(cx + rx0), Math.round(cy + ry0), Math.round(cx + rx1), Math.round(cy + ry1));
            }
            // Reflected + Rotated copy (Kaleidoscope mirror)
            const mx0 = -dx0 * cosA - dy0 * sinA;
            const my0 = -dx0 * sinA + dy0 * cosA;
            const mx1 = -dx1 * cosA - dy1 * sinA;
            const my1 = -dx1 * sinA + dy1 * cosA;
            drawFn(Math.round(cx + mx0), Math.round(cy + my0), Math.round(cx + mx1), Math.round(cy + my1));
        }
    }
}

// ==========================================
// 🧹 AUTO-CLEAN STRAY PAINT SPECKS (QUANTIZED FOR REAL PHOTOS & CAD!)
// ==========================================
function applyDespeckleToBuffer(radius = 2, threshold = 0.65) {
    if (!colorDataBuffer || !processedCanvas.width || !processedCanvas.height) return;
    isCanvasUserEdited = true;
    const width = processedCanvas.width;
    const height = processedCanvas.height;
    const result = new Uint8ClampedArray(colorDataBuffer);
    const slotResult = filamentSlotBuffer ? new Uint8Array(filamentSlotBuffer) : null;
    const parsedFils = filaments.map(f => ({ rgb: hexToRgb(f.color) }));

    // Quantize RGB into 5-bit perceptual buckets (or explicit filament slots) so real continuous photos NEVER shift by 2px!
    const bucketKey = (pIdx) => {
        if (filamentSlotBuffer && filamentSlotBuffer[pIdx] < parsedFils.length) {
            return 1000000 + filamentSlotBuffer[pIdx];
        }
        const i = pIdx * 4;
        return ((colorDataBuffer[i] >> 4) << 8) | ((colorDataBuffer[i + 1] >> 4) << 4) | (colorDataBuffer[i + 2] >> 4);
    };

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pIdx = y * width + x;
            const idx = pIdx * 4;
            const curKey = bucketKey(pIdx);

            const counts = new Map();
            const sumR = new Map(), sumG = new Map(), sumB = new Map();
            const slotCounts = new Map();
            let maxCount = 0;
            let dominantKey = curKey;
            let validNeighbors = 0;

            for (let dy = -radius; dy <= radius; dy++) {
                const ny = y + dy;
                if (ny < 0 || ny >= height) continue;
                for (let dx = -radius; dx <= radius; dx++) {
                    const nx = x + dx;
                    if (nx < 0 || nx >= width) continue;
                    validNeighbors++;
                    const nPIdx = ny * width + nx;
                    const nIdx = nPIdx * 4;
                    const nKey = bucketKey(nPIdx);
                    const c = (counts.get(nKey) || 0) + 1;
                    counts.set(nKey, c);
                    sumR.set(nKey, (sumR.get(nKey) || 0) + colorDataBuffer[nIdx]);
                    sumG.set(nKey, (sumG.get(nKey) || 0) + colorDataBuffer[nIdx + 1]);
                    sumB.set(nKey, (sumB.get(nKey) || 0) + colorDataBuffer[nIdx + 2]);
                    if (filamentSlotBuffer) {
                        const ns = filamentSlotBuffer[nPIdx];
                        slotCounts.set(ns, (slotCounts.get(ns) || 0) + 1);
                    }
                    if (c > maxCount) {
                        maxCount = c;
                        dominantKey = nKey;
                    }
                }
            }

            const currentCount = counts.get(curKey) || 0;
            if (dominantKey !== curKey && maxCount >= 3 && (currentCount <= validNeighbors * 0.18 || maxCount >= validNeighbors * threshold)) {
                const dc = counts.get(dominantKey) || 1;
                result[idx] = Math.round((sumR.get(dominantKey) || 0) / dc);
                result[idx + 1] = Math.round((sumG.get(dominantKey) || 0) / dc);
                result[idx + 2] = Math.round((sumB.get(dominantKey) || 0) / dc);
                markUserEditedPixel(pIdx);
                if (slotResult && slotCounts.size > 0) {
                    let maxSc = 0, domSlot = 255;
                    for (const [s, sc] of slotCounts.entries()) {
                        if (sc > maxSc) { maxSc = sc; domSlot = s; }
                    }
                    slotResult[pIdx] = domSlot;
                }
            }
        }
    }
    colorDataBuffer.set(result);
    if (filamentSlotBuffer && slotResult) {
        filamentSlotBuffer.set(slotResult);
    }
    syncProcessedCanvasFromBuffer();
}

function autoCleanStrayPaint() {
    pushHistoryState();
    applyDespeckleToBuffer(2, 0.65);
    render2DEditorPreview();
    requestMeshUpdate();
    showToast(translations[currentLang].toastCleanSuccess);
}

// ==========================================
// ✨ SMART HEALING ERASER (QUANTIZED RING CLUSTER IN-PAINT + BRESENHAM STROKE)
// ==========================================
function smartHealSingle(cx, cy, radius) {
    if (!colorDataBuffer || !processedCanvas.width) return;
    isCanvasUserEdited = true;
    const width = processedCanvas.width;
    const height = processedCanvas.height;

    const counts = new Map();
    const sumR = new Map(), sumG = new Map(), sumB = new Map();
    const slotCounts = new Map();
    const rOuter = radius + 3;
    const rInner = radius;

    for (let dy = -rOuter; dy <= rOuter; dy++) {
        const ny = cy + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -rOuter; dx <= rOuter; dx++) {
            const nx = cx + dx;
            if (nx < 0 || nx >= width) continue;
            const distSq = dx * dx + dy * dy;
            if (distSq >= rInner * rInner && distSq <= rOuter * rOuter) {
                const pIdx = ny * width + nx;
                const idx = pIdx * 4;
                const r = colorDataBuffer[idx], g = colorDataBuffer[idx + 1], b = colorDataBuffer[idx + 2];
                const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
                counts.set(key, (counts.get(key) || 0) + 1);
                sumR.set(key, (sumR.get(key) || 0) + r);
                sumG.set(key, (sumG.get(key) || 0) + g);
                sumB.set(key, (sumB.get(key) || 0) + b);
                if (filamentSlotBuffer) {
                    const s = filamentSlotBuffer[pIdx];
                    slotCounts.set(s, (slotCounts.get(s) || 0) + 1);
                }
            }
        }
    }

    if (counts.size === 0) return;

    let maxCount = 0;
    let dominantKey = null;
    for (const [key, count] of counts.entries()) {
        if (count > maxCount) {
            maxCount = count;
            dominantKey = key;
        }
    }
    if (dominantKey === null) return;

    let dominantSlot = 255;
    let maxSlotCount = 0;
    for (const [slot, count] of slotCounts.entries()) {
        if (count > maxSlotCount) {
            maxSlotCount = count;
            dominantSlot = slot;
        }
    }

    const domR = Math.round((sumR.get(dominantKey) || 0) / maxCount);
    const domG = Math.round((sumG.get(dominantKey) || 0) / maxCount);
    const domB = Math.round((sumB.get(dominantKey) || 0) / maxCount);

    for (let dy = -radius; dy <= radius; dy++) {
        const ny = cy + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -radius; dx <= radius; dx++) {
            const nx = cx + dx;
            if (nx < 0 || nx >= width) continue;
            if (dx * dx + dy * dy <= radius * radius) {
                const pIdx = ny * width + nx;
                writeEditedPixel(pIdx, domR, domG, domB, dominantSlot, undefined, undefined);
            }
        }
    }
}

function smartHeal(x0, y0, radius, x1 = x0, y1 = y0) {
    applyWithSymmetry(x0, y0, x1, y1, (sx0, sy0, sx1, sy1) => {
        const dist = Math.hypot(sx1 - sx0, sy1 - sy0);
        const step = Math.max(1, Math.floor(radius * 0.6));
        const steps = Math.max(1, Math.ceil(dist / step));
        for (let s = 0; s <= steps; s++) {
            const t = steps === 0 ? 0 : (s / steps);
            smartHealSingle(Math.round(sx0 + (sx1 - sx0) * t), Math.round(sy0 + (sy1 - sy0) * t), radius);
        }
    });
}

// ==========================================
// 🖌️ 6-MODE FILAMENT BRUSH STUDIO, AUTO-INK 3D OUTLINER, ORNATE FRAME & Z-CHISEL
// ==========================================
let rainbowStrokeCounter = 0;
let pearlStepCounter = 0;

function paintBrushStrokeSingle(x0, y0, x1, y1, radius, filIdx, activeFilOverride = null) {
    if (!colorDataBuffer || !processedCanvas.width) return;
    isCanvasUserEdited = true;
    const width = processedCanvas.width;
    const height = processedCanvas.height;
    let activeFilIdx = (activeFilOverride !== null) ? activeFilOverride : filIdx;
    const brushMode = (activeEditorTool === 'brush') ? (document.getElementById('select-brush-mode')?.value || 'solid') : 'solid';
    const fil = filaments[activeFilIdx] || filaments[0];
    const [r, g, b] = hexToRgb(fil.color);

    const rimSlot = Math.max(0, Math.min(filaments.length - 1, parseInt(document.getElementById('select-brush-rim-slot')?.value) || 0));
    const [rimR, rimG, rimB] = hexToRgb((filaments[rimSlot] || filaments[0]).color);

    if ((brushMode === 'halo' || brushMode === 'ridge' || brushMode === 'pearls' || brushMode === 'stitch') && (!customZDeltaBuffer || customZDeltaBuffer.length !== width * height)) {
        customZDeltaBuffer = new Float32Array(width * height);
    }

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let curX = x0, curY = y0;
    const rSqMax = Math.max(1, radius * radius);
    const pearlSpacing = Math.max(4, Math.round(radius * 2.1));
    let localPearlCounter = pearlStepCounter;

    while (true) {
        localPearlCounter++;
        const isPearlCenter = (brushMode !== 'pearls') || ((localPearlCounter % pearlSpacing) === 1);
        if (isPearlCenter) {
            for (let dy2 = -radius; dy2 <= radius; dy2++) {
                const py = curY + dy2;
                if (py < 0 || py >= height) continue;
                for (let dx2 = -radius; dx2 <= radius; dx2++) {
                    const px = curX + dx2;
                    if (px < 0 || px >= width) continue;

                    const pIdx = py * width + px;

                    if (brushMode === 'square') {
                        writeEditedPixel(pIdx, r, g, b, activeFilIdx);
                    } else if (brushMode === 'calligraphy') {
                        const u = (dx2 + dy2) * 0.7071;
                        const v = (dx2 - dy2) * 0.7071;
                        if (Math.abs(u) <= radius * 1.15 && Math.abs(v) <= Math.max(1.2, radius * 0.34)) {
                            writeEditedPixel(pIdx, r, g, b, activeFilIdx);
                        }
                    } else if (brushMode === 'stitch') {
                        // 3D Embroidery Chevron / Cross-Stitch Texture (+Z)
                        const pat = ((px + py) % Math.max(3, radius)) < Math.max(2, radius * 0.55) || ((px - py + 1024) % Math.max(3, radius)) < Math.max(2, radius * 0.55);
                        if (pat && (dx2 * dx2 + dy2 * dy2) <= rSqMax) {
                            const nextZ = customZDeltaBuffer ? Math.max(customZDeltaBuffer[pIdx], 0.44) : 0.44;
                            writeEditedPixel(pIdx, r, g, b, activeFilIdx, nextZ);
                        }
                    } else {
                        const dSq = dx2 * dx2 + dy2 * dy2;
                        if (dSq > rSqMax) continue;

                        if (brushMode === 'stipple') {
                            const gx = (px >> 1), gy = (py >> 1);
                            if (((gx * 73 + gy * 37) & 3) === 0) {
                                writeEditedPixel(pIdx, r, g, b, activeFilIdx);
                            }
                        } else if (brushMode === 'halo') {
                            const normD = Math.sqrt(dSq) / Math.max(1, radius);
                            if (normD <= 0.58) {
                                const nextZ = customZDeltaBuffer ? Math.max(customZDeltaBuffer[pIdx], 0.42) : 0.42;
                                writeEditedPixel(pIdx, r, g, b, activeFilIdx, nextZ);
                            } else if (filamentSlotBuffer && filamentSlotBuffer[pIdx] !== activeFilIdx) {
                                const nextZ = customZDeltaBuffer ? Math.max(customZDeltaBuffer[pIdx], 0.16) : 0.16;
                                writeEditedPixel(pIdx, rimR, rimG, rimB, rimSlot, nextZ);
                            }
                        } else if (brushMode === 'ridge' || brushMode === 'pearls') {
                            const dome = Math.sqrt(Math.max(0, 1.0 - dSq / (rSqMax + 0.5)));
                            const nextZ = customZDeltaBuffer ? Math.max(customZDeltaBuffer[pIdx], (brushMode === 'pearls' ? 0.62 : 0.52) * dome) : 0;
                            writeEditedPixel(pIdx, r, g, b, activeFilIdx, nextZ);
                        } else {
                            writeEditedPixel(pIdx, r, g, b, activeFilIdx);
                        }
                    }
                }
            }
        }
        if (curX === x1 && curY === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; curX += sx; }
        if (e2 < dx) { err += dx; curY += sy; }
    }
}

function paintBrushStroke(x0, y0, x1, y1, radius, filIdx) {
    const brushMode = (activeEditorTool === 'brush') ? (document.getElementById('select-brush-mode')?.value || 'solid') : 'solid';
    let sharedFilIdx = filIdx;
    if (brushMode === 'rainbow' && filaments.length > 1) {
        rainbowStrokeCounter++;
        const nonBaseCount = Math.max(1, filaments.length - 1);
        sharedFilIdx = 1 + (Math.floor(rainbowStrokeCounter / 5) % nonBaseCount);
    }
    applyWithSymmetry(x0, y0, x1, y1, (sx0, sy0, sx1, sy1) => {
        paintBrushStrokeSingle(sx0, sy0, sx1, sy1, radius, filIdx, sharedFilIdx);
    });
    pearlStepCounter += Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0)));
}

// ==========================================
// 🕳️ 3D CUTOUT / PHYSICAL THROUGH-HOLE DRILL & STENCIL INVERTER
// ==========================================
function paintCutoutDrillSingle(x0, y0, x1, y1, radius) {
    if (!colorDataBuffer || !processedCanvas.width) return;
    isCanvasUserEdited = true;
    const width = processedCanvas.width;
    const height = processedCanvas.height;
    if (!cutoutMaskBuffer || cutoutMaskBuffer.length !== width * height) {
        cutoutMaskBuffer = new Uint8Array(width * height);
    }
    const holeShape = document.getElementById('select-cutout-shape')?.value || 'circle';
    const [r0, g0, b0] = hexToRgb((filaments[0] || { color: '#09090b' }).color);
    const r = Math.max(2, radius);
    const rSqMax = r * r;

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let curX = x0, curY = y0;

    while (true) {
        for (let dy2 = -r; dy2 <= r; dy2++) {
            const py = curY + dy2;
            if (py < 0 || py >= height) continue;
            const ny = dy2 / r;
            for (let dx2 = -r; dx2 <= r; dx2++) {
                const px = curX + dx2;
                if (px < 0 || px >= width) continue;
                const nx = dx2 / r;

                let inside = false;
                if (holeShape === 'square') {
                    inside = Math.abs(nx) <= 0.92 && Math.abs(ny) <= 0.92;
                } else if (holeShape === 'hex') {
                    const ax = Math.abs(nx), ay = Math.abs(ny);
                    inside = Math.max(ax, ax * 0.5 + ay * 0.866025) <= 0.92;
                } else if (holeShape === 'star') {
                    const ang = Math.atan2(ny, nx);
                    const rad = Math.hypot(nx, ny);
                    inside = rad <= (0.58 + 0.38 * Math.cos(ang * 5.0));
                } else if (holeShape === 'heart') {
                    const hx = nx * 1.25;
                    const hy = -ny * 1.25 + 0.18;
                    const a = hx * hx + hy * hy - 0.85;
                    inside = (a * a * a - hx * hx * hy * hy * hy) <= 0.0;
                } else {
                    inside = (dx2 * dx2 + dy2 * dy2) <= rSqMax;
                }

                if (inside) {
                    const pIdx = py * width + px;
                    writeEditedPixel(pIdx, r0, g0, b0, 0, 0, 1);
                }
            }
        }
        if (curX === x1 && curY === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; curX += sx; }
        if (e2 < dx) { err += dx; curY += sy; }
    }
}

function paintCutoutDrillStroke(x0, y0, x1, y1, radius) {
    applyWithSymmetry(x0, y0, x1, y1, (sx0, sy0, sx1, sy1) => {
        paintCutoutDrillSingle(sx0, sy0, sx1, sy1, radius);
    });
}

function invertModelStencil() {
    if (!colorDataBuffer || !processedCanvas.width) return;
    pushHistoryState();
    isCanvasUserEdited = true;
    const width = processedCanvas.width;
    const height = processedCanvas.height;
    if (!cutoutMaskBuffer || cutoutMaskBuffer.length !== width * height) {
        cutoutMaskBuffer = new Uint8Array(width * height);
    }
    if (!filamentSlotBuffer || filamentSlotBuffer.length !== width * height) {
        filamentSlotBuffer = new Uint8Array(width * height);
    }
    const plateSlot = (activeFilamentSlot > 0) ? activeFilamentSlot : Math.min(2, filaments.length - 1);
    const [pR, pG, pB] = hexToRgb((filaments[plateSlot] || filaments[0]).color);
    const [bR, bG, bB] = hexToRgb((filaments[0] || { color: '#09090b' }).color);
    const cachedBgRgb = computeBorderBackgroundRGB(colorDataBuffer, width, height);
    const isPhoto = !(studioMode === 'draw' || isDrawingTemplateActive);

    for (let pIdx = 0; pIdx < width * height; pIdx++) {
        let wasHole = (cutoutMaskBuffer[pIdx] === 1) || (filamentSlotBuffer[pIdx] === 0);
        if (!wasHole && isPhoto) {
            // In Photo Mode, treat exterior background or dark pixels (<22% lum) as background to invert cleanly!
            if (bgExteriorVoidMask && bgExteriorVoidMask[pIdx] === 1) wasHole = true;
            else {
                const i4 = pIdx * 4;
                const dBg = colorDistSq(colorDataBuffer[i4], colorDataBuffer[i4 + 1], colorDataBuffer[i4 + 2], cachedBgRgb[0], cachedBgRgb[1], cachedBgRgb[2]);
                if (dBg < 2400) wasHole = true;
            }
        }
        if (wasHole) {
            writeEditedPixel(pIdx, pR, pG, pB, plateSlot, undefined, 0);
        } else {
            writeEditedPixel(pIdx, bR, bG, bB, 0, undefined, 1);
        }
    }
    config.removeCanvasBg = false;
    syncRemoveCanvasUI();
    syncProcessedCanvasFromBuffer();
    render2DEditorPreview();
    requestMeshUpdate();
    showToast(translations[currentLang].toastStencilInverted);
}

function restoreAllCutoutHoles() {
    if (!processedCanvas.width) return;
    pushHistoryState();
    const width = processedCanvas.width, height = processedCanvas.height;
    const fillSlot = Math.min(filaments.length - 1, Math.max(1, activeFilamentSlot || 1));
    const [fR, fG, fB] = hexToRgb((filaments[fillSlot] || filaments[0]).color);
    if (cutoutMaskBuffer) {
        for (let pIdx = 0; pIdx < width * height; pIdx++) {
            if (cutoutMaskBuffer[pIdx] === 1) {
                cutoutMaskBuffer[pIdx] = 0;
                // Also restore Slot 0 drilled pixels so CAD templates & removeCanvasBg genuinely refill the holes!
                if (filamentSlotBuffer && filamentSlotBuffer[pIdx] === 0) {
                    writeEditedPixel(pIdx, fR, fG, fB, fillSlot, 0, 0);
                }
            }
        }
    }
    syncProcessedCanvasFromBuffer();
    render2DEditorPreview();
    requestMeshUpdate();
    showToast(translations[currentLang].toastCutoutsRestored);
}

// Helper: reliably identifies subject/model pixels in BOTH Draw/CAD Mode AND default Photo Mode!
function buildReliefFxForegroundMask(width, height, cachedBgRgb) {
    const N = width * height;
    const fgMask = new Uint8Array(N);
    const baseRgbCache = hexToRgb((filaments[0] || { color: '#111827' }).color);
    const isPhoto = !(studioMode === 'draw' || isDrawingTemplateActive);

    let bgCount = 0;
    for (let pIdx = 0; pIdx < N; pIdx++) {
        const c = pIdx % width;
        const r = (pIdx / width) | 0;
        let isBg = isPixelCutoutVoid(c, r, width, height, cachedBgRgb, baseRgbCache) || (filamentSlotBuffer && filamentSlotBuffer[pIdx] === 0);
        if (!isBg && isPhoto) {
            if (bgExteriorVoidMask && bgExteriorVoidMask[pIdx] === 1) {
                isBg = true;
            } else {
                const i4 = pIdx * 4;
                const dBg = colorDistSq(colorDataBuffer[i4], colorDataBuffer[i4 + 1], colorDataBuffer[i4 + 2], cachedBgRgb[0], cachedBgRgb[1], cachedBgRgb[2]);
                const lum = heightDataBuffer ? heightDataBuffer[pIdx] : ((0.299 * colorDataBuffer[i4] + 0.587 * colorDataBuffer[i4 + 1] + 0.114 * colorDataBuffer[i4 + 2]) / 255);
                if (dBg < 2600 || lum < 0.16) isBg = true;
            }
        }
        if (isBg) bgCount++;
        else fgMask[pIdx] = 1;
    }

    // Fallback: if entire canvas is solid (no dark border), treat outer 4px frame as boundary so Dome Inflate & Aura ALWAYS produce visible 3D relief!
    if (bgCount < N * 0.02) {
        const margin = Math.max(4, Math.round(Math.min(width, height) * 0.04));
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (x < margin || x >= width - margin || y < margin || y >= height - margin) {
                    fgMask[y * width + x] = 0;
                }
            }
        }
    }
    return fgMask;
}

// ==========================================
// 🪄 3D RELIEF FX & SURFACE MICRO-TEXTURE STUDIO
// ==========================================
// 1. 💎 3D Cushion Dome Bevel Inflate (+Z) via Chamfer Distance Transform
function apply3DBevelInflateToModel() {
    if (!colorDataBuffer || !processedCanvas.width) return;
    pushHistoryState();
    isCanvasUserEdited = true;
    const width = processedCanvas.width;
    const height = processedCanvas.height;
    const N = width * height;
    if (!customZDeltaBuffer || customZDeltaBuffer.length !== N) {
        customZDeltaBuffer = new Float32Array(N);
    }

    const cachedBgRgb = computeBorderBackgroundRGB(colorDataBuffer, width, height);
    const fgMask = buildReliefFxForegroundMask(width, height, cachedBgRgb);
    const dist = new Float32Array(N);
    const INF = 9999.0;

    for (let pIdx = 0; pIdx < N; pIdx++) {
        dist[pIdx] = fgMask[pIdx] ? INF : 0.0;
    }

    // Forward Chamfer pass
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const p = y * width + x;
            if (dist[p] > 0) {
                const d1 = Math.min(dist[p - 1] + 1.0, dist[p - width] + 1.0);
                const d2 = Math.min(dist[p - width - 1] + 1.414, dist[p - width + 1] + 1.414);
                dist[p] = Math.min(dist[p], d1, d2);
            }
        }
    }
    // Backward Chamfer pass
    let maxDist = 1.0;
    for (let y = height - 2; y >= 1; y--) {
        for (let x = width - 2; x >= 1; x--) {
            const p = y * width + x;
            if (dist[p] > 0) {
                const d1 = Math.min(dist[p + 1] + 1.0, dist[p + width] + 1.0);
                const d2 = Math.min(dist[p + width + 1] + 1.414, dist[p + width - 1] + 1.414);
                dist[p] = Math.min(dist[p], d1, d2);
                if (dist[p] < INF && dist[p] > maxDist) maxDist = dist[p];
            }
        }
    }

    const bevelSpan = Math.min(maxDist, Math.max(8.0, Math.min(width, height) * 0.09));
    for (let pIdx = 0; pIdx < N; pIdx++) {
        if (dist[pIdx] > 0 && dist[pIdx] < INF) {
            const t = Math.min(1.0, dist[pIdx] / bevelSpan);
            const domeProfile = Math.sqrt(Math.max(0.0, 1.0 - (1.0 - t) * (1.0 - t)));
            customZDeltaBuffer[pIdx] = Math.min(0.64, customZDeltaBuffer[pIdx] + domeProfile * 0.56);
            markUserEditedPixel(pIdx);
        }
    }

    render2DEditorPreview();
    requestMeshUpdate();
    showToast(translations[currentLang].toast3DDomeInflated);
}

// 2. 🌈 Multi-Color Concentric 3D Aura Rings around Model Silhouette
function applyMultiColorConcentricAura() {
    if (!colorDataBuffer || !processedCanvas.width) return;
    pushHistoryState();
    isCanvasUserEdited = true;
    const width = processedCanvas.width;
    const height = processedCanvas.height;
    const N = width * height;
    if (!customZDeltaBuffer || customZDeltaBuffer.length !== N) {
        customZDeltaBuffer = new Float32Array(N);
    }
    if (!filamentSlotBuffer || filamentSlotBuffer.length !== N) {
        filamentSlotBuffer = new Uint8Array(N);
    }

    const cachedBgRgb = computeBorderBackgroundRGB(colorDataBuffer, width, height);
    const fgMask = buildReliefFxForegroundMask(width, height, cachedBgRgb);
    const dist = new Float32Array(N);
    const INF = 9999.0;

    for (let pIdx = 0; pIdx < N; pIdx++) {
        dist[pIdx] = fgMask[pIdx] ? 0.0 : INF;
    }

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const p = y * width + x;
            if (dist[p] > 0) {
                dist[p] = Math.min(dist[p], dist[p - 1] + 1.0, dist[p - width] + 1.0, dist[p - width - 1] + 1.414, dist[p - width + 1] + 1.414);
            }
        }
    }
    for (let y = height - 2; y >= 1; y--) {
        for (let x = width - 2; x >= 1; x--) {
            const p = y * width + x;
            if (dist[p] > 0) {
                dist[p] = Math.min(dist[p], dist[p + 1] + 1.0, dist[p + width] + 1.0, dist[p + width + 1] + 1.414, dist[p + width - 1] + 1.414);
            }
        }
    }

    const ringWidth = Math.max(4, Math.round(Math.min(width, height) * 0.026));
    const numRings = 3;
    const maxAuraDist = ringWidth * numRings;
    const nonZeroSlots = [];
    for (let s = 1; s < filaments.length; s++) nonZeroSlots.push(s);
    if (nonZeroSlots.length === 0) nonZeroSlots.push(0);

    for (let pIdx = 0; pIdx < N; pIdx++) {
        const d = dist[pIdx];
        if (d > 0 && d <= maxAuraDist) {
            const ringIdx = Math.min(numRings - 1, Math.floor((d - 0.01) / ringWidth));
            const slot = nonZeroSlots[(nonZeroSlots.length - 1 - ringIdx + nonZeroSlots.length * 4) % nonZeroSlots.length];
            const [r, g, b] = hexToRgb((filaments[slot] || filaments[0]).color);
            writeEditedPixel(pIdx, r, g, b, slot, (numRings - ringIdx) * 0.14, 0);
        }
    }

    syncProcessedCanvasFromBuffer();
    render2DEditorPreview();
    requestMeshUpdate();
    showToast(translations[currentLang].toastMultiColorAuraApplied);
}

// 3. 🪨 Emboss Physical 3D Surface Micro-Texture
function apply3DSurfaceMicroTexture() {
    if (!colorDataBuffer || !processedCanvas.width) return;
    pushHistoryState();
    isCanvasUserEdited = true;
    const width = processedCanvas.width;
    const height = processedCanvas.height;
    const N = width * height;
    if (!customZDeltaBuffer || customZDeltaBuffer.length !== N) {
        customZDeltaBuffer = new Float32Array(N);
    }

    const texType = document.getElementById('select-fx-texture')?.value || 'carbon';
    const targetZone = document.getElementById('select-fx-target')?.value || 'model';
    const cachedBgRgb = computeBorderBackgroundRGB(colorDataBuffer, width, height);
    const fgMask = buildReliefFxForegroundMask(width, height, cachedBgRgb);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pIdx = y * width + x;
            if (cutoutMaskBuffer && cutoutMaskBuffer[pIdx] === 1) continue;

            const isModel = fgMask[pIdx] === 1;
            if (targetZone === 'model' && !isModel) continue;
            if ((targetZone === 'base' || targetZone === 'bg') && isModel) continue;

            let dz = 0.0;
            if (texType === 'carbon') {
                // 2x2 Twill Carbon Fiber Weave
                const cellX = (x >> 1), cellY = (y >> 1);
                const phase = (cellX + cellY * 2) & 3;
                dz = (phase < 2) ? 0.24 : -0.16;
            } else if (texType === 'knurl') {
                // Diamond Pyramid Knurled Grip
                const s1 = Math.sin((x + y) * 0.65);
                const s2 = Math.sin((x - y) * 0.65);
                dz = (s1 * s2) * 0.34;
            } else if (texType === 'hammered') {
                // Voronoi-like Hammered Forged Metal Dimples
                const gx = x * 0.22, gy = y * 0.22;
                const w1 = Math.sin(gx * 1.7 + Math.cos(gy * 1.9)) * Math.cos(gy * 1.6 - Math.sin(gx * 1.4));
                dz = (Math.abs(w1) - 0.45) * 0.48;
            } else if (texType === 'topo') {
                // Concentric Topographic Contour Ridges
                const nx = (x / Math.max(1, width - 1)) * 2.0 - 1.0;
                const ny = (y / Math.max(1, height - 1)) * 2.0 - 1.0;
                const r = Math.hypot(nx, ny) + 0.18 * Math.sin(nx * 5.0) * Math.cos(ny * 5.0);
                dz = (Math.sin(r * 38.0) > 0.25) ? 0.28 : -0.12;
            } else if (texType === 'hex_dimple') {
                // Hexagonal Golf-Ball / Honeycomb Micro-Dimples
                const scale = 7.5;
                const qx = x / scale;
                const qy = y / (scale * 0.866025);
                const row = Math.round(qy);
                const col = Math.round(qx - (row & 1 ? 0.5 : 0.0));
                const cx = (col + (row & 1 ? 0.5 : 0.0)) * scale;
                const cy = row * (scale * 0.866025);
                const dNorm = Math.hypot(x - cx, y - cy) / (scale * 0.48);
                dz = (dNorm < 0.82) ? -0.26 * (1.0 - dNorm * dNorm) : 0.16;
            }

            customZDeltaBuffer[pIdx] = Math.max(-0.48, Math.min(0.64, customZDeltaBuffer[pIdx] + dz));
            if (dz !== 0) markUserEditedPixel(pIdx);
        }
    }

    render2DEditorPreview();
    requestMeshUpdate();
    showToast(translations[currentLang].toastMicroTextureApplied);
}

// ✨ 1-CLICK STAINED-GLASS / ENAMEL PIN 3D AUTO-INK OUTLINER
function applyAutoInkOutlinesToCanvas() {
    if (!colorDataBuffer || !processedCanvas.width) return;
    pushHistoryState();
    isCanvasUserEdited = true;
    const width = processedCanvas.width;
    const height = processedCanvas.height;
    if (!customZDeltaBuffer || customZDeltaBuffer.length !== width * height) {
        customZDeltaBuffer = new Float32Array(width * height);
    }

    const inkSlot = Math.max(0, Math.min(filaments.length - 1, parseInt(document.getElementById('select-brush-rim-slot')?.value) || 0));
    const [inkR, inkG, inkB] = hexToRgb((filaments[inkSlot] || filaments[0]).color);
    const origColor = new Uint8ClampedArray(colorDataBuffer);
    const origSlots = filamentSlotBuffer ? new Uint8Array(filamentSlotBuffer) : null;
    const edgeMask = new Uint8Array(width * height);

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const pIdx = y * width + x;
            const idx = pIdx * 4;
            const s0 = origSlots ? origSlots[pIdx] : 255;
            if (s0 === inkSlot) continue;

            const r0 = origColor[idx], g0 = origColor[idx + 1], b0 = origColor[idx + 2];
            const neighbors = [pIdx + 1, pIdx - 1, pIdx + width, pIdx - width];
            let isEdge = false;
            for (let k = 0; k < 4; k++) {
                const np = neighbors[k];
                if (origSlots && origSlots[np] !== 255 && s0 !== 255) {
                    if (origSlots[np] !== s0 && origSlots[np] !== inkSlot) {
                        isEdge = true;
                        break;
                    }
                } else {
                    const nIdx = np * 4;
                    const dist = Math.abs(r0 - origColor[nIdx]) + Math.abs(g0 - origColor[nIdx + 1]) + Math.abs(b0 - origColor[nIdx + 2]);
                    if (dist > 85) {
                        isEdge = true;
                        break;
                    }
                }
            }
            if (isEdge) edgeMask[pIdx] = 1;
        }
    }

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const pIdx = y * width + x;
            if (!edgeMask[pIdx]) continue;
            // 2px crisp 0.4mm-nozzle-safe contour line
            for (let dy = 0; dy <= 1; dy++) {
                for (let dx = 0; dx <= 1; dx++) {
                    const tp = (y + dy) * width + (x + dx);
                    writeEditedPixel(tp, inkR, inkG, inkB, inkSlot, 0.34, undefined);
                }
            }
        }
    }

    syncProcessedCanvasFromBuffer();
    render2DEditorPreview();
    requestMeshUpdate();
    showToast(translations[currentLang].toastAutoInkApplied);
}

// 🖼️ 1-CLICK ORNATE 3D DECORATIVE BORDER FRAME
function applyOrnate3DBorderFrame() {
    if (!colorDataBuffer || !processedCanvas.width) return;
    pushHistoryState();
    isCanvasUserEdited = true;
    const width = processedCanvas.width;
    const height = processedCanvas.height;
    if (!customZDeltaBuffer || customZDeltaBuffer.length !== width * height) {
        customZDeltaBuffer = new Float32Array(width * height);
    }

    const filIdx = activeFilamentSlot;
    const [r, g, b] = hexToRgb((filaments[filIdx] || filaments[0]).color);

    const tempCvs = document.createElement('canvas');
    tempCvs.width = width;
    tempCvs.height = height;
    const ctx = tempCvs.getContext('2d');
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    const scale = Math.min(width, height) / 360.0;
    const pad1 = Math.round(10 * scale);
    const pad2 = Math.round(20 * scale);

    // Outer thick frame + Inner fine filigree frame
    ctx.lineWidth = Math.max(3, Math.round(5 * scale));
    ctx.strokeRect(pad1, pad1, width - pad1 * 2, height - pad1 * 2);
    ctx.lineWidth = Math.max(2, Math.round(2.5 * scale));
    ctx.strokeRect(pad2, pad2, width - pad2 * 2, height - pad2 * 2);

    // Ornate corner medallions
    const corners = [
        [pad2 + 6 * scale, pad2 + 6 * scale],
        [width - pad2 - 6 * scale, pad2 + 6 * scale],
        [pad2 + 6 * scale, height - pad2 - 6 * scale],
        [width - pad2 - 6 * scale, height - pad2 - 6 * scale]
    ];
    corners.forEach(([cx, cy]) => {
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(4, 9 * scale), 0, Math.PI * 2);
        ctx.fill();
    });

    const mask = ctx.getImageData(0, 0, width, height).data;
    for (let pIdx = 0; pIdx < width * height; pIdx++) {
        if (mask[pIdx * 4 + 3] > 80) {
            writeEditedPixel(pIdx, r, g, b, filIdx, 0.45, 0);
        }
    }

    syncProcessedCanvasFromBuffer();
    render2DEditorPreview();
    requestMeshUpdate();
    showToast(translations[currentLang].toastOrnateFrameApplied);
}

// ⛰️ 3D Depth Z-Chisel Brush (+Z Raise Emboss / -Z Carve Engrave / Smooth Reset)
function paintZChiselStrokeSingle(x0, y0, x1, y1, radius) {
    if (!processedCanvas.width) return;
    const width = processedCanvas.width;
    const height = processedCanvas.height;
    if (!customZDeltaBuffer || customZDeltaBuffer.length !== width * height) {
        customZDeltaBuffer = new Float32Array(width * height);
    }
    isCanvasUserEdited = true;
    const mode = document.getElementById('select-chisel-mode')?.value || 'raise';
    const maxStep = (parseInt(document.getElementById('slider-chisel-zstep')?.value) || 32) / 100.0;

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let curX = x0, curY = y0;
    const rSqMax = Math.max(1, radius * radius);

    while (true) {
        for (let dy2 = -radius; dy2 <= radius; dy2++) {
            const py = curY + dy2;
            if (py < 0 || py >= height) continue;
            for (let dx2 = -radius; dx2 <= radius; dx2++) {
                const px = curX + dx2;
                if (px < 0 || px >= width) continue;
                const dSq = dx2 * dx2 + dy2 * dy2;
                if (dSq <= rSqMax) {
                    const pIdx = py * width + px;
                    const falloff = 1.0 - (dSq / (rSqMax + 1)) * 0.45;
                    if (mode === 'reset') {
                        customZDeltaBuffer[pIdx] *= 0.80;
                        if (Math.abs(customZDeltaBuffer[pIdx]) < 0.015) customZDeltaBuffer[pIdx] = 0;
                        markUserEditedPixel(pIdx);
                    } else if (mode === 'raise') {
                        // Never flatten an already-higher Z peak down to maxStep!
                        const targetZ = Math.min(0.64, maxStep * falloff);
                        customZDeltaBuffer[pIdx] = Math.max(customZDeltaBuffer[pIdx], targetZ);
                        markUserEditedPixel(pIdx);
                    } else if (mode === 'carve') {
                        const targetZ = Math.max(-0.64, -maxStep * falloff);
                        customZDeltaBuffer[pIdx] = Math.min(customZDeltaBuffer[pIdx], targetZ);
                        markUserEditedPixel(pIdx);
                    }
                }
            }
        }
        if (curX === x1 && curY === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; curX += sx; }
        if (e2 < dx) { err += dx; curY += sy; }
    }
}

function paintZChiselStroke(x0, y0, x1, y1, radius) {
    applyWithSymmetry(x0, y0, x1, y1, (sx0, sy0, sx1, sy1) => {
        paintZChiselStrokeSingle(sx0, sy0, sx1, sy1, radius);
    });
}

function floodFillBuffer(startX, startY, filIdx, tolerance = 35) {
    if (!colorDataBuffer || !processedCanvas.width) return;
    isCanvasUserEdited = true;
    const width = processedCanvas.width;
    const height = processedCanvas.height;
    const sx = Math.max(0, Math.min(width - 1, Math.round(startX)));
    const sy = Math.max(0, Math.min(height - 1, Math.round(startY)));
    const fil = filaments[filIdx] || filaments[0];
    const [fillR, fillG, fillB] = hexToRgb(fil.color);

    const startP = sy * width + sx;
    const startIdx = startP * 4;
    const targetR = colorDataBuffer[startIdx];
    const targetG = colorDataBuffer[startIdx + 1];
    const targetB = colorDataBuffer[startIdx + 2];
    const startWasVoid = cutoutMaskBuffer && cutoutMaskBuffer[startP] === 1;
    const startSlot = filamentSlotBuffer ? filamentSlotBuffer[startP] : 255;

    if (!startWasVoid && startSlot === filIdx && Math.abs(targetR - fillR) < 5 && Math.abs(targetG - fillG) < 5 && Math.abs(targetB - fillB) < 5) return;

    const tolSq = tolerance * tolerance;
    function match(pIdx) {
        const idx = pIdx * 4;
        const dr = colorDataBuffer[idx] - targetR;
        const dg = colorDataBuffer[idx + 1] - targetG;
        const db = colorDataBuffer[idx + 2] - targetB;
        return (dr * dr + dg * dg + db * db) <= tolSq;
    }

    // Flat Int32Array queue + mark visited ON PUSH (4x less memory, zero duplicate pops!)
    const visited = new Uint8Array(width * height);
    const queue = new Int32Array(width * height);
    let qHead = 0, qTail = 0;
    visited[startP] = 1;
    queue[qTail++] = startP;

    while (qHead < qTail) {
        const pIdx = queue[qHead++];
        if (!match(pIdx)) continue;
        writeEditedPixel(pIdx, fillR, fillG, fillB, filIdx, undefined, 0);

        const cx = pIdx % width;
        const cy = (pIdx - cx) / width;
        if (cx + 1 < width) { const n = pIdx + 1; if (!visited[n]) { visited[n] = 1; queue[qTail++] = n; } }
        if (cx > 0) { const n = pIdx - 1; if (!visited[n]) { visited[n] = 1; queue[qTail++] = n; } }
        if (cy + 1 < height) { const n = pIdx + width; if (!visited[n]) { visited[n] = 1; queue[qTail++] = n; } }
        if (cy > 0) { const n = pIdx - width; if (!visited[n]) { visited[n] = 1; queue[qTail++] = n; } }
    }
}

// ==========================================
// 🎨 FEATURE 8: SMART COLOR REPLACE / CLICK-TO-RECOLOR (2D & 3D)
// ==========================================
function smartRecolorZone(startX, startY, filIdx, tolerance = 38, isGlobal = false) {
    if (!colorDataBuffer || !processedCanvas.width || !processedCanvas.height) return;
    const width = processedCanvas.width;
    const height = processedCanvas.height;
    const sx = Math.max(0, Math.min(width - 1, Math.round(startX)));
    const sy = Math.max(0, Math.min(height - 1, Math.round(startY)));

    const parsedFils = filaments.map(f => ({ rgb: hexToRgb(f.color) }));
    const fil = filaments[filIdx] || filaments[0];
    const [fillR, fillG, fillB] = hexToRgb(fil.color);

    const startPIdx = sy * width + sx;
    const startIdx = startPIdx * 4;
    const targetR = colorDataBuffer[startIdx];
    const targetG = colorDataBuffer[startIdx + 1];
    const targetB = colorDataBuffer[startIdx + 2];
    const targetLum = Math.max(0.05, (0.2126 * targetR + 0.7152 * targetG + 0.0722 * targetB) / 255.0);
    const targetFilIdx = findClosestFilamentIndex(targetR, targetG, targetB, parsedFils);

    const tolSq = Math.max(12, tolerance) * Math.max(12, tolerance) * 3.2;

    function matchesZone(pIdx) {
        const idx = pIdx * 4;
        const r = colorDataBuffer[idx];
        const g = colorDataBuffer[idx + 1];
        const b = colorDataBuffer[idx + 2];
        const dist = colorDistSq(r, g, b, targetR, targetG, targetB);
        if (dist <= tolSq) return true;
        if (tolerance >= 55 && findClosestFilamentIndex(r, g, b, parsedFils) === targetFilIdx) return true;
        return false;
    }

    function applyPixelRecolor(pIdx) {
        const idx = pIdx * 4;
        const origR = colorDataBuffer[idx];
        const origG = colorDataBuffer[idx + 1];
        const origB = colorDataBuffer[idx + 2];
        const origLum = (0.2126 * origR + 0.7152 * origG + 0.0722 * origB) / 255.0;
        // Fixed base multiplier 1.0 (was 0.85, which darkened colors by 15% on every click!)
        const shadeRatio = Math.max(0.80, Math.min(1.22, 1.0 + (origLum - targetLum) * 0.40));

        writeEditedPixel(
            pIdx,
            Math.max(0, Math.min(255, Math.round(fillR * shadeRatio))),
            Math.max(0, Math.min(255, Math.round(fillG * shadeRatio))),
            Math.max(0, Math.min(255, Math.round(fillB * shadeRatio))),
            filIdx,
            undefined,
            undefined
        );
    }

    isCanvasUserEdited = true;

    if (isGlobal) {
        const totalPixels = width * height;
        for (let pIdx = 0; pIdx < totalPixels; pIdx++) {
            if (matchesZone(pIdx)) {
                applyPixelRecolor(pIdx);
            }
        }
    } else {
        const visited = new Uint8Array(width * height);
        const queue = [startPIdx];
        visited[startPIdx] = 1;

        while (queue.length > 0) {
            const currP = queue.pop();
            if (!matchesZone(currP)) continue;

            applyPixelRecolor(currP);

            const cx = currP % width;
            const cy = Math.floor(currP / width);

            if (cx + 1 < width) {
                const np = currP + 1;
                if (!visited[np]) { visited[np] = 1; queue.push(np); }
            }
            if (cx - 1 >= 0) {
                const np = currP - 1;
                if (!visited[np]) { visited[np] = 1; queue.push(np); }
            }
            if (cy + 1 < height) {
                const np = currP + width;
                if (!visited[np]) { visited[np] = 1; queue.push(np); }
            }
            if (cy - 1 >= 0) {
                const np = currP - width;
                if (!visited[np]) { visited[np] = 1; queue.push(np); }
            }
        }
    }

    syncProcessedCanvasFromBuffer();
}

// ==========================================
// 📐 18+ CAD & SACRED GEOMETRY SHAPES + STEPPED 3D PYRAMID ENGINE
// ==========================================
function getZDeltaFromMode(zMode) {
    if (zMode === 'emboss') return 0.48;
    if (zMode === 'engrave') return -0.36;
    return 0.0;
}

function traceCADShapePath(ctx, shapeType, cx, cy, rx, ry, cornerRad, ptsCount, x0, y0, x1, y1) {
    ctx.beginPath();
    const r = Math.max(2, Math.hypot(rx, ry));
    const sx = Math.max(2, Math.abs(rx));
    const sy = Math.max(2, Math.abs(ry));
    const N = Math.max(3, ptsCount || 6);

    if (shapeType === 'rect') {
        const cr = Math.min(cornerRad, sx, sy);
        if (ctx.roundRect && cr > 0) {
            ctx.roundRect(cx - sx, cy - sy, sx * 2, sy * 2, cr);
        } else {
            ctx.rect(cx - sx, cy - sy, sx * 2, sy * 2);
        }
    } else if (shapeType === 'circle') {
        ctx.ellipse(cx, cy, sx, sy, 0, 0, Math.PI * 2);
    } else if (shapeType === 'triangle' || shapeType === 'pentagon' || shapeType === 'hexagon' || shapeType === 'octagon') {
        const sidesMap = { triangle: 3, pentagon: 5, hexagon: 6, octagon: 8 };
        const sides = sidesMap[shapeType] || 6;
        for (let i = 0; i < sides; i++) {
            const a = (i * Math.PI * 2) / sides - Math.PI / 2;
            const px = cx + Math.cos(a) * sx;
            const py = cy + Math.sin(a) * sy;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
    } else if (shapeType === 'diamond') {
        ctx.moveTo(cx, cy - sy);
        ctx.lineTo(cx + sx, cy);
        ctx.lineTo(cx, cy + sy);
        ctx.lineTo(cx - sx, cy);
        ctx.closePath();
    } else if (shapeType === 'star_poly') {
        const spikes = N;
        for (let i = 0; i < spikes * 2; i++) {
            const radFactor = (i % 2 === 0) ? 1.0 : 0.42;
            const a = (i * Math.PI) / spikes - Math.PI / 2;
            const px = cx + Math.cos(a) * sx * radFactor;
            const py = cy + Math.sin(a) * sy * radFactor;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
    } else if (shapeType === 'gear') {
        const teeth = Math.max(6, N);
        const steps = teeth * 4;
        for (let i = 0; i < steps; i++) {
            const m = i % 4;
            const radFactor = (m === 0 || m === 1) ? 1.0 : 0.78;
            const a = (i * Math.PI * 2) / steps;
            const px = cx + Math.cos(a) * sx * radFactor;
            const py = cy + Math.sin(a) * sy * radFactor;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        // Center axle hole
        ctx.moveTo(cx + sx * 0.32, cy);
        ctx.ellipse(cx, cy, sx * 0.32, sy * 0.32, 0, 0, Math.PI * 2, true);
    } else if (shapeType === 'flower') {
        const petals = Math.max(4, N);
        const steps = 180;
        for (let i = 0; i <= steps; i++) {
            const a = (i / steps) * Math.PI * 2;
            const mod = 0.42 + 0.58 * Math.abs(Math.cos((petals * a) * 0.5));
            const px = cx + Math.cos(a) * sx * mod;
            const py = cy + Math.sin(a) * sy * mod;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
    } else if (shapeType === 'heart_shape') {
        const steps = 120;
        for (let i = 0; i <= steps; i++) {
            const t = (i / steps) * Math.PI * 2;
            const hx = Math.pow(Math.sin(t), 3);
            const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16.0;
            const px = cx + hx * sx;
            const py = cy + hy * sy;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
    } else if (shapeType === 'crescent') {
        // Exact analytically intersecting outer & inner arcs -> razor-sharp crescent tips (no flat chords!)
        const R = Math.max(4, Math.min(sx, sy));
        const d = R * 0.44;
        const rIn = R * 0.84;
        const cosA = Math.max(-0.98, Math.min(0.98, (R * R + d * d - rIn * rIn) / (2 * R * d)));
        const aOuter = Math.acos(cosA);
        const cosB = Math.max(-0.98, Math.min(0.98, (rIn * rIn + d * d - R * R) / (2 * rIn * d)));
        const aInner = Math.PI - Math.acos(cosB);
        ctx.arc(cx, cy, R, aOuter, Math.PI * 2 - aOuter, false);
        ctx.arc(cx + d, cy, rIn, -aInner, aInner, true);
        ctx.closePath();
    } else if (shapeType === 'cross') {
        const armX = sx * 0.36, armY = sy * 0.36;
        ctx.moveTo(cx - armX, cy - sy);
        ctx.lineTo(cx + armX, cy - sy);
        ctx.lineTo(cx + armX, cy - armY);
        ctx.lineTo(cx + sx, cy - armY);
        ctx.lineTo(cx + sx, cy + armY);
        ctx.lineTo(cx + armX, cy + armY);
        ctx.lineTo(cx + armX, cy + sy);
        ctx.lineTo(cx - armX, cy + sy);
        ctx.lineTo(cx - armX, cy + armY);
        ctx.lineTo(cx - sx, cy + armY);
        ctx.lineTo(cx - sx, cy - armY);
        ctx.lineTo(cx - armX, cy - armY);
        ctx.closePath();
    } else if (shapeType === 'arrow') {
        // Scales cleanly by sx/sy so stepped_pyramid & double_outline shrink proportionally!
        const ang = Math.atan2(y1 - y0, x1 - x0);
        const len = Math.max(8, Math.hypot(sx * 2, sy * 2));
        const headL = len * 0.38;
        const shaftW = Math.max(2.5, len * 0.14);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ang);
        ctx.moveTo(-len * 0.5, -shaftW);
        ctx.lineTo(len * 0.5 - headL, -shaftW);
        ctx.lineTo(len * 0.5 - headL, -shaftW * 2.2);
        ctx.lineTo(len * 0.5, 0);
        ctx.lineTo(len * 0.5 - headL, shaftW * 2.2);
        ctx.lineTo(len * 0.5 - headL, shaftW);
        ctx.lineTo(-len * 0.5, shaftW);
        ctx.closePath();
        ctx.restore();
    } else if (shapeType === 'spiral') {
        const turns = Math.max(2, Math.min(8, Math.round(N / 2)));
        const totalSteps = turns * 48;
        for (let i = 0; i <= totalSteps; i++) {
            const f = i / totalSteps;
            const a = f * turns * Math.PI * 2;
            const px = cx + Math.cos(a) * sx * f;
            const py = cy + Math.sin(a) * sy * f;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
    } else if (shapeType === 'wave') {
        const cycles = Math.max(2, Math.round(N / 2));
        const dist = Math.max(4, Math.hypot(x1 - x0, y1 - y0));
        const ang = Math.atan2(y1 - y0, x1 - x0);
        const amp = Math.max(6, editorBrushRadius * 3.5);
        ctx.save();
        ctx.translate(x0, y0);
        ctx.rotate(ang);
        const steps = 100;
        for (let i = 0; i <= steps; i++) {
            const u = (i / steps) * dist;
            const v = Math.sin((i / steps) * cycles * Math.PI * 2) * amp;
            if (i === 0) ctx.moveTo(u, v);
            else ctx.lineTo(u, v);
        }
        ctx.restore();
    } else if (shapeType === 'rings') {
        const numRings = Math.max(2, Math.min(8, Math.round(N / 2)));
        for (let k = 1; k <= numRings; k++) {
            const f = k / numRings;
            ctx.moveTo(cx + sx * f, cy);
            ctx.ellipse(cx, cy, Math.max(1, sx * f), Math.max(1, sy * f), 0, 0, Math.PI * 2);
        }
    }
}

function drawShapeSingle(shapeType, x0, y0, x1, y1, filIdx) {
    if (!colorDataBuffer || !processedCanvas.width) return;
    isCanvasUserEdited = true;
    const width = processedCanvas.width;
    const height = processedCanvas.height;
    if (!customZDeltaBuffer || customZDeltaBuffer.length !== width * height) {
        customZDeltaBuffer = new Float32Array(width * height);
    }

    if (shapeType === 'line') {
        paintBrushStrokeSingle(x0, y0, x1, y1, editorBrushRadius, filIdx);
        return;
    }

    const fillMode = document.getElementById('select-shape-fill-mode')?.value || 'solid';
    const cornerRad = parseInt(document.getElementById('slider-shape-corner')?.value) || 0;
    const ptsCount = parseInt(document.getElementById('slider-shape-points')?.value) || 6;
    const outlineSlot = parseInt(document.getElementById('select-shape-outline-slot')?.value ?? '-1');
    const zMode = document.getElementById('select-shape-zmode')?.value || 'emboss';
    const baseZDelta = getZDeltaFromMode(zMode);
    const borderW = Math.max(2.5, editorBrushRadius * 1.6);

    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const rx = Math.max(2, Math.abs(x1 - x0) / 2);
    const ry = Math.max(2, Math.abs(y1 - y0) / 2);
    const isStrokeOnlyType = (shapeType === 'spiral' || shapeType === 'wave' || shapeType === 'rings');

    // 🏛️ 3D Stepped Pyramid Mode (Multi-Layer Filament + Stepped Physical Z Relief!)
    if (fillMode === 'stepped_pyramid' && !isStrokeOnlyType) {
        const steps = 4;
        const nonZeroCount = Math.max(1, filaments.length - 1);
        for (let s = 0; s < steps; s++) {
            const scaleF = 1.0 - (s * 0.21);
            // Never wrap stepped_pyramid into Slot 0 (base/void)!
            const stepSlot = filaments.length > 1 ? (1 + ((Math.max(1, filIdx) - 1 + s) % nonZeroCount)) : 0;
            const [sr, sg, sb] = hexToRgb((filaments[stepSlot] || filaments[0]).color);
            const stepZ = (zMode === 'engrave') ? (-0.18 * (s + 1)) : (0.18 * (s + 1));

            const tempCvs = document.createElement('canvas');
            tempCvs.width = width;
            tempCvs.height = height;
            const tCtx = tempCvs.getContext('2d');
            tCtx.fillStyle = '#ffffff';
            traceCADShapePath(tCtx, shapeType, cx, cy, rx * scaleF, ry * scaleF, cornerRad * scaleF, ptsCount, x0, y0, x1, y1);
            tCtx.fill();

            const mask = tCtx.getImageData(0, 0, width, height).data;
            for (let pIdx = 0; pIdx < width * height; pIdx++) {
                if (mask[pIdx * 4 + 3] > 90) {
                    writeEditedPixel(pIdx, sr, sg, sb, stepSlot, stepZ, 0);
                }
            }
        }
        return;
    }

    const fil = filaments[filIdx] || filaments[0];
    const [r, g, b] = hexToRgb(fil.color);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.fillStyle = '#ffffff';
    tCtx.strokeStyle = '#ffffff';
    tCtx.lineWidth = borderW;
    tCtx.lineJoin = 'round';
    tCtx.lineCap = 'round';

    traceCADShapePath(tCtx, shapeType, cx, cy, rx, ry, cornerRad, ptsCount, x0, y0, x1, y1);
    if (isStrokeOnlyType || fillMode === 'outline') {
        tCtx.stroke();
    } else if (fillMode === 'double_outline') {
        tCtx.stroke();
        traceCADShapePath(tCtx, shapeType, cx, cy, rx * 0.72, ry * 0.72, cornerRad * 0.72, ptsCount, x0, y0, x1, y1);
        tCtx.stroke();
    } else {
        tCtx.fill();
    }

    // Optional 2-Color Outline Border
    let outMask = null;
    if (outlineSlot >= 0 && outlineSlot < filaments.length) {
        const outCvs = document.createElement('canvas');
        outCvs.width = width;
        outCvs.height = height;
        const oCtx = outCvs.getContext('2d');
        oCtx.strokeStyle = '#ffffff';
        oCtx.lineWidth = borderW + 4;
        oCtx.lineJoin = 'round';
        oCtx.lineCap = 'round';
        traceCADShapePath(oCtx, shapeType, cx, cy, rx, ry, cornerRad, ptsCount, x0, y0, x1, y1);
        oCtx.stroke();
        outMask = oCtx.getImageData(0, 0, width, height).data;
    }

    const mask = tCtx.getImageData(0, 0, width, height).data;

    if (outMask) {
        const [or, og, ob] = hexToRgb((filaments[outlineSlot] || filaments[0]).color);
        for (let pIdx = 0; pIdx < width * height; pIdx++) {
            if (outMask[pIdx * 4 + 3] > 80) {
                writeEditedPixel(pIdx, or, og, ob, outlineSlot, baseZDelta * 0.7, 0);
            }
        }
    }

    const hatchSpacing = Math.max(5, Math.round(borderW * 2.2));
    for (let pIdx = 0; pIdx < width * height; pIdx++) {
        if (mask[pIdx * 4 + 3] > 90) {
            if (fillMode === 'hatch' && !isStrokeOnlyType) {
                const px = pIdx % width;
                const py = (pIdx / width) | 0;
                const onLine1 = ((px + py) % hatchSpacing) < Math.max(2, borderW * 0.65);
                const onLine2 = ((px - py + 4096) % hatchSpacing) < Math.max(2, borderW * 0.65);
                if (!onLine1 && !onLine2) continue;
            }
            writeEditedPixel(pIdx, r, g, b, filIdx, baseZDelta, 0);
        }
    }
}

function drawShape(toolOrType, x0, y0, x1, y1, filIdx) {
    const actualType = (toolOrType === 'shapes') ? activeCADShapeType : toolOrType;
    applyWithSymmetry(x0, y0, x1, y1, (sx0, sy0, sx1, sy1) => {
        drawShapeSingle(actualType, sx0, sy0, sx1, sy1, filIdx);
    });
}

// ==========================================
// 🌀 PROCEDURAL SPIROGRAPH, GUILLOCHÉ & SACRED GEOMETRY GENERATOR
// ==========================================
function updateLivePatternPreview() {
    if (!colorDataBuffer || !processedCanvas.width) return;
    if (!preLiveToolBackup || preLiveToolBackup.width !== processedCanvas.width || preLiveToolBackup.height !== processedCanvas.height) {
        preLiveToolBackup = captureCurrentCanvasBackup();
    } else {
        restoreCanvasFromBackup(preLiveToolBackup);
    }

    const width = processedCanvas.width;
    const height = processedCanvas.height;
    if (!customZDeltaBuffer || customZDeltaBuffer.length !== width * height) {
        customZDeltaBuffer = new Float32Array(width * height);
    }

    const cx = editorPatternState.posX !== null ? editorPatternState.posX : Math.round(width / 2);
    const cy = editorPatternState.posY !== null ? editorPatternState.posY : Math.round(height / 2);
    editorPatternState.posX = cx;
    editorPatternState.posY = cy;

    const patType = document.getElementById('select-pattern-type')?.value || 'spirograph';
    const lobes = parseInt(document.getElementById('slider-pattern-petals')?.value) || 12;
    const scalePct = (parseInt(document.getElementById('slider-pattern-scale')?.value) || 78) / 100.0;
    const lineThick = parseInt(document.getElementById('slider-pattern-thick')?.value) || 2;
    const zMode = document.getElementById('select-pattern-zmode')?.value || 'emboss';
    const zDelta = getZDeltaFromMode(zMode);

    const maxRad = (Math.min(width, height) * 0.48) * scalePct;
    const tempCvs = document.createElement('canvas');
    tempCvs.width = width;
    tempCvs.height = height;
    const ctx = tempCvs.getContext('2d');
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = lineThick;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (patType === 'spirograph') {
        // Hypotrochoid Spirograph Rosette: closes cleanly in t in [0, 2*PI] with high smooth resolution for ALL lobe counts!
        const L = Math.max(3, lobes);
        const R = maxRad;
        const r = R / L;
        const d = r * (L * 0.35 + 1.2);
        const scaleNorm = maxRad / Math.max(1, (R - r) + d);
        ctx.beginPath();
        const steps = Math.max(720, L * 48);
        for (let i = 0; i <= steps; i++) {
            const t = (i / steps) * Math.PI * 2;
            const x = cx + ((R - r) * Math.cos(t) + d * Math.cos((L - 1) * t)) * scaleNorm;
            const y = cy + ((R - r) * Math.sin(t) - d * Math.sin((L - 1) * t)) * scaleNorm;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
    } else if (patType === 'flower_of_life') {
        // Sacred Geometry Intersecting Circles Lattice
        const rCircle = maxRad / 3.0;
        const centers = [[0, 0]];
        for (let k = 0; k < 6; k++) {
            const a = (k * Math.PI) / 3;
            centers.push([Math.cos(a) * rCircle, Math.sin(a) * rCircle]);
            centers.push([Math.cos(a) * rCircle * 2, Math.sin(a) * rCircle * 2]);
            const aMid = a + Math.PI / 6;
            centers.push([Math.cos(aMid) * rCircle * Math.sqrt(3), Math.sin(aMid) * rCircle * Math.sqrt(3)]);
        }
        centers.forEach(([ox, oy]) => {
            ctx.beginPath();
            ctx.arc(cx + ox, cy + oy, rCircle, 0, Math.PI * 2);
            ctx.stroke();
        });
        ctx.beginPath();
        ctx.arc(cx, cy, maxRad, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, maxRad * 1.04, 0, Math.PI * 2);
        ctx.stroke();
    } else if (patType === 'sunburst') {
        // Op-Art Sunburst Wedges
        const rays = Math.max(6, lobes * 2);
        for (let k = 0; k < rays; k += 2) {
            const a0 = (k * Math.PI * 2) / rays;
            const a1 = ((k + 1) * Math.PI * 2) / rays;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, maxRad, a0, a1);
            ctx.closePath();
            ctx.fill();
        }
    } else if (patType === 'cobweb') {
        const spokes = Math.max(5, lobes);
        for (let k = 0; k < spokes; k++) {
            const a = (k * Math.PI * 2) / spokes;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(a) * maxRad, cy + Math.sin(a) * maxRad);
            ctx.stroke();
        }
        const rings = 6;
        for (let rIdx = 1; rIdx <= rings; rIdx++) {
            const rr = (rIdx / rings) * maxRad;
            ctx.beginPath();
            for (let k = 0; k < spokes; k++) {
                const a0 = (k * Math.PI * 2) / spokes;
                const a1 = ((k + 1) * Math.PI * 2) / spokes;
                const midA = (a0 + a1) * 0.5;
                const xEnd = cx + Math.cos(a1) * rr;
                const yEnd = cy + Math.sin(a1) * rr;
                const xCtrl = cx + Math.cos(midA) * rr * 0.82;
                const yCtrl = cy + Math.sin(midA) * rr * 0.82;
                if (k === 0) ctx.moveTo(cx + Math.cos(a0) * rr, cy + Math.sin(a0) * rr);
                ctx.quadraticCurveTo(xCtrl, yCtrl, xEnd, yEnd);
            }
            ctx.stroke();
        }
    } else if (patType === 'honeycomb') {
        const hexR = Math.max(10, maxRad / Math.max(3, Math.round(lobes * 0.45)));
        const dx = hexR * 1.5;
        const dy = hexR * Math.sqrt(3);
        const cols = Math.ceil(maxRad / dx) + 1;
        const rows = Math.ceil(maxRad / dy) + 1;
        for (let col = -cols; col <= cols; col++) {
            for (let row = -rows; row <= rows; row++) {
                const hx = cx + col * dx;
                const hy = cy + row * dy + ((col & 1) ? dy * 0.5 : 0);
                if (Math.hypot(hx - cx, hy - cy) > maxRad) continue;
                ctx.beginPath();
                for (let s = 0; s < 6; s++) {
                    const a = (s * Math.PI) / 3;
                    const px = hx + Math.cos(a) * (hexR * 0.92);
                    const py = hy + Math.sin(a) * (hexR * 0.92);
                    if (s === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.stroke();
            }
        }
    } else if (patType === 'guilloche') {
        const waves = Math.max(4, lobes);
        for (let phase = 0; phase < 3; phase++) {
            ctx.beginPath();
            const steps = 720;
            for (let i = 0; i <= steps; i++) {
                const a = (i / steps) * Math.PI * 2;
                const r = maxRad * (0.72 + 0.22 * Math.sin(waves * a + (phase * Math.PI * 2) / 3) * Math.cos(2 * a));
                const x = cx + Math.cos(a) * r;
                const y = cy + Math.sin(a) * r;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
        }
    } else if (patType === 'celtic_frame') {
        const fw = Math.max(32, maxRad * 2);
        const fh = Math.max(32, maxRad * 2 * (height / Math.max(1, width)));
        const x0f = cx - fw * 0.5;
        const y0f = cy - fh * 0.5;
        ctx.strokeRect(x0f, y0f, fw, fh);
        ctx.strokeRect(x0f + lineThick * 3, y0f + lineThick * 3, fw - lineThick * 6, fh - lineThick * 6);
        const studs = Math.max(4, lobes);
        for (let i = 0; i <= studs; i++) {
            const t = i / studs;
            ctx.beginPath(); ctx.arc(x0f + t * fw, y0f + lineThick * 1.5, lineThick * 1.3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x0f + t * fw, y0f + fh - lineThick * 1.5, lineThick * 1.3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x0f + lineThick * 1.5, y0f + t * fh, lineThick * 1.3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x0f + fw - lineThick * 1.5, y0f + t * fh, lineThick * 1.3, 0, Math.PI * 2); ctx.fill();
        }
    }

    const pData = ctx.getImageData(0, 0, width, height).data;
    const fillFil = filaments[activeFilamentSlot] || filaments[0];
    const [fR, fG, fB] = hexToRgb(fillFil.color);

    for (let i = 0; i < pData.length; i += 4) {
        if (pData[i + 3] > 80) {
            writeEditedPixel(i / 4, fR, fG, fB, activeFilamentSlot, zDelta, 0);
        }
    }

    editorPatternState.hasLivePreview = true;
    isCanvasUserEdited = true;
    render2DEditorPreview();
    requestMeshUpdate();
}

function commitAndStartNewPattern() {
    if (!colorDataBuffer || !processedCanvas.width) return;
    syncProcessedCanvasFromBuffer();
    pushHistoryState();
    preLiveToolBackup = captureCurrentCanvasBackup();
    showToast(translations[currentLang].toastDrawingUpdated);
}

// Syncs sidebar Text controls with the 2D Studio Text Sub-Bar
function syncTextFromSidebar() {
    const sbText = document.getElementById('draw-text-input');
    const sbSize = document.getElementById('draw-font-size');
    const sbFont = document.getElementById('draw-font-family');
    const edText = document.getElementById('editor-text-input');
    const edSize = document.getElementById('editor-font-size');
    const edFont = document.getElementById('editor-font-family');

    if (sbText && edText) edText.value = sbText.value;
    if (sbSize && edSize) edSize.value = sbSize.value;
    if (sbFont && edFont) edFont.value = sbFont.value;
    onEditorTextControlChange();
}

function toggleEditorTextStyle(prop) {
    if (prop === 'bold') {
        editorTextState.bold = !editorTextState.bold;
        document.getElementById('btn-text-bold')?.classList.toggle('active', editorTextState.bold);
    } else if (prop === 'italic') {
        editorTextState.italic = !editorTextState.italic;
        document.getElementById('btn-text-italic')?.classList.toggle('active', editorTextState.italic);
    }
    onEditorTextControlChange();
}

function onEditorTextControlChange() {
    const edText = document.getElementById('editor-text-input');
    const edSize = document.getElementById('editor-font-size');
    const edFont = document.getElementById('editor-font-family');
    const edOutline = document.getElementById('select-text-outline-slot');
    const edAngle = document.getElementById('slider-text-angle');
    const edArc = document.getElementById('slider-text-arc');
    const edZMode = document.getElementById('select-text-zmode');

    if (edText) editorTextState.text = edText.value;
    if (edSize) editorTextState.fontSize = parseInt(edSize.value) || 32;
    if (edFont) editorTextState.fontFamily = edFont.value || 'Outfit, sans-serif';
    if (edOutline) editorTextState.outlineSlot = parseInt(edOutline.value);
    if (edAngle) editorTextState.angleDeg = parseInt(edAngle.value) || 0;
    if (edArc) editorTextState.arcDeg = parseInt(edArc.value) || 0;
    if (edZMode) editorTextState.zMode = edZMode.value || 'emboss';

    // Update badges & sidebar inputs
    const badgeSize = document.getElementById('badge-editor-font-size');
    if (badgeSize) badgeSize.innerText = `${editorTextState.fontSize}px`;
    const badgeAngle = document.getElementById('badge-text-angle');
    if (badgeAngle) badgeAngle.innerText = `${editorTextState.angleDeg}°`;
    const badgeArc = document.getElementById('badge-text-arc');
    if (badgeArc) badgeArc.innerText = `${editorTextState.arcDeg}`;

    const sbText = document.getElementById('draw-text-input');
    const sbSize = document.getElementById('draw-font-size');
    const sbFont = document.getElementById('draw-font-family');
    if (sbText && sbText.value !== editorTextState.text) sbText.value = editorTextState.text;
    if (sbSize) sbSize.value = editorTextState.fontSize;
    if (sbFont) sbFont.value = editorTextState.fontFamily;

    if (activeEditorTool === 'text') {
        updateLiveTextPreview();
    }
}

function updateLiveTextPreview() {
    if (!colorDataBuffer || !processedCanvas.width) return;
    if (!preLiveToolBackup || preLiveToolBackup.width !== processedCanvas.width || preLiveToolBackup.height !== processedCanvas.height) {
        preLiveToolBackup = captureCurrentCanvasBackup();
    } else {
        restoreCanvasFromBackup(preLiveToolBackup);
    }

    const cx = editorTextState.posX !== null ? editorTextState.posX : Math.round(processedCanvas.width / 2);
    const cy = editorTextState.posY !== null ? editorTextState.posY : Math.round(processedCanvas.height / 2);
    editorTextState.posX = cx;
    editorTextState.posY = cy;

    if (editorTextState.text && editorTextState.text.trim().length > 0) {
        renderTextOntoBuffers(cx, cy);
        editorTextState.hasLivePreview = true;
    } else {
        editorTextState.hasLivePreview = false;
    }

    render2DEditorPreview();
    requestMeshUpdate();
}

function renderTextOntoBuffers(cx, cy) {
    const width = processedCanvas.width;
    const height = processedCanvas.height;
    const text = editorTextState.text || '';
    if (!text.trim()) return;

    isCanvasUserEdited = true;
    const size = editorTextState.fontSize || 32;
    const font = editorTextState.fontFamily || 'Outfit, sans-serif';
    const weight = editorTextState.bold ? 'bold ' : '';
    const style = editorTextState.italic ? 'italic ' : '';
    const fontStr = `${style}${weight}${size}px ${font}`;
    const angleRad = (editorTextState.angleDeg || 0) * Math.PI / 180.0;
    const arcVal = editorTextState.arcDeg || 0;
    const outlineSlot = editorTextState.outlineSlot;
    const zDelta = getZDeltaFromMode(editorTextState.zMode);

    // Render outline mask & fill mask on separate offscreen canvases for razor-sharp filament slot assignment
    const fillCvs = document.createElement('canvas');
    fillCvs.width = width;
    fillCvs.height = height;
    const fCtx = fillCvs.getContext('2d');

    const outCvs = document.createElement('canvas');
    outCvs.width = width;
    outCvs.height = height;
    const oCtx = outCvs.getContext('2d');

    function drawTextGeometry(ctx, isOutline) {
        ctx.save();
        ctx.font = fontStr;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#ffffff';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(3, Math.round(size * 0.22));

        ctx.translate(cx, cy);
        if (angleRad !== 0) ctx.rotate(angleRad);

        if (Math.abs(arcVal) < 3) {
            const lines = text.split('\n');
            const lineH = size * 1.15;
            const startY = -((lines.length - 1) * lineH) / 2;
            lines.forEach((line, idx) => {
                const ly = startY + idx * lineH;
                if (isOutline) ctx.strokeText(line, 0, ly);
                else ctx.fillText(line, 0, ly);
            });
        } else {
            // Curved Circular Arc Text — FIXED negative arc reads Left-to-Right (never backwards!)
            const cleanLine = text.replace(/\n+/g, ' ');
            const chars = Array.from(cleanLine);
            const absTotalAngle = (Math.abs(arcVal) / 100.0) * Math.PI * 0.85;
            const charMetrics = chars.map(ch => Math.max(size * 0.32, ctx.measureText(ch).width));
            const totalWidth = charMetrics.reduce((a, b) => a + b, 0);
            const radius = Math.max(size * 0.9, totalWidth / Math.max(0.15, absTotalAngle));
            const sign = arcVal >= 0 ? 1 : -1;

            let curAngle = -absTotalAngle / 2;
            for (let i = 0; i < chars.length; i++) {
                const chAngle = (charMetrics[i] / Math.max(1, totalWidth)) * absTotalAngle;
                const midAngle = curAngle + chAngle / 2;
                ctx.save();
                if (sign > 0) {
                    // Upper rainbow arch (convex up): sweeps left -> right cleanly
                    ctx.translate(0, radius);
                    ctx.rotate(midAngle);
                    ctx.translate(0, -radius);
                } else {
                    // Lower smile arch (concave up): sweeps left -> right cleanly!
                    ctx.translate(0, -radius);
                    ctx.rotate(-midAngle);
                    ctx.translate(0, radius);
                }
                if (isOutline) ctx.strokeText(chars[i], 0, 0);
                else ctx.fillText(chars[i], 0, 0);
                ctx.restore();
                curAngle += chAngle;
            }
        }
        ctx.restore();
    }

    if (outlineSlot >= 0 && outlineSlot < filaments.length) {
        drawTextGeometry(oCtx, true);
    }
    drawTextGeometry(fCtx, false);

    const fData = fCtx.getImageData(0, 0, width, height).data;
    const oData = (outlineSlot >= 0 && outlineSlot < filaments.length) ? oCtx.getImageData(0, 0, width, height).data : null;

    const fillFil = filaments[activeFilamentSlot] || filaments[0];
    const [fR, fG, fB] = hexToRgb(fillFil.color);

    if (oData) {
        const outFil = filaments[outlineSlot] || filaments[0];
        const [oR, oG, oB] = hexToRgb(outFil.color);
        for (let i = 0; i < oData.length; i += 4) {
            if (oData[i + 3] > 75) {
                writeEditedPixel(i / 4, oR, oG, oB, outlineSlot, zDelta * 0.7, 0);
            }
        }
    }

    for (let i = 0; i < fData.length; i += 4) {
        if (fData[i + 3] > 85) {
            writeEditedPixel(i / 4, fR, fG, fB, activeFilamentSlot, zDelta, 0);
        }
    }
}

function commitAndStartNewText() {
    if (!colorDataBuffer || !processedCanvas.width) return;
    syncProcessedCanvasFromBuffer();
    pushHistoryState();
    preLiveToolBackup = captureCurrentCanvasBackup();
    editorTextState.posY = Math.min(processedCanvas.height - 20, (editorTextState.posY || Math.round(processedCanvas.height / 2)) + Math.max(24, Math.round(editorTextState.fontSize * 1.15)));
    updateLiveTextPreview();
    showToast(translations[currentLang].toastTextLocked);
}

function centerActiveTextStamp() {
    if (!processedCanvas.width) return;
    editorTextState.posX = Math.round(processedCanvas.width / 2);
    editorTextState.posY = Math.round(processedCanvas.height / 2);
    updateLiveTextPreview();
}

function cancelActiveTextStamp() {
    if (preLiveToolBackup) {
        restoreCanvasFromBackup(preLiveToolBackup);
    }
    editorTextState.hasLivePreview = false;
    editorStampState.hasLivePreview = false;
    editorPatternState.hasLivePreview = false;
    syncProcessedCanvasFromBuffer();
    render2DEditorPreview();
    requestMeshUpdate();
}

function stampCurrentText(targetX, targetY) {
    if (centerViewMode !== '2d') {
        setCenterViewMode('2d');
    }
    if (activeEditorTool !== 'text') {
        setEditorTool('text');
    }
    if (targetX !== undefined && targetY !== undefined) {
        editorTextState.posX = targetX;
        editorTextState.posY = targetY;
    }
    updateLiveTextPreview();
    showToast(translations[currentLang].toastDrawingUpdated);
}

// ==========================================
// ⭐ 3D VECTOR ICON & CUSTOM LOGO STAMP ENGINE
// ==========================================
const ALL_VECTOR_STAMPS = ['heart', 'star', 'crown', 'paw', 'bolt', 'gamepad', 'coffee', 'home', 'music', 'shield', 'trophy', 'sparkle', 'mountain', 'anchor', 'butterfly', 'clover'];

function selectVectorStamp(type) {
    activeVectorStamp = type;
    ALL_VECTOR_STAMPS.forEach(t => {
        document.getElementById(`stamp-btn-${t}`)?.classList.toggle('active', t === type);
    });
    onEditorStampControlChange();
}

function handleCustomLogoStampUpload(event) {
    const file = event.target?.files?.[0];
    if (!file) return;
    if (event.target) event.target.value = '';
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const cvs = document.createElement('canvas');
            const maxDim = 200;
            const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
            cvs.width = Math.max(1, Math.round(img.width * scale));
            cvs.height = Math.max(1, Math.round(img.height * scale));
            const c = cvs.getContext('2d');
            c.drawImage(img, 0, 0, cvs.width, cvs.height);
            // Smart background removal for opaque JPEG / white-background logos so they never turn into solid squares!
            const id = c.getImageData(0, 0, cvs.width, cvs.height);
            const px = id.data;
            let hasTransparent = false;
            for (let i = 3; i < px.length; i += 4) { if (px[i] < 200) { hasTransparent = true; break; } }
            if (!hasTransparent) {
                const bgR = px[0], bgG = px[1], bgB = px[2];
                for (let i = 0; i < px.length; i += 4) {
                    const d = Math.abs(px[i] - bgR) + Math.abs(px[i + 1] - bgG) + Math.abs(px[i + 2] - bgB);
                    if (d < 55) px[i + 3] = 0;
                }
                c.putImageData(id, 0, 0);
            }
            customLogoStampCanvas = cvs;
            activeVectorStamp = 'custom_logo';
            ALL_VECTOR_STAMPS.forEach(t => {
                document.getElementById(`stamp-btn-${t}`)?.classList.remove('active');
            });
            onEditorStampControlChange();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function onEditorStampControlChange() {
    const sz = parseInt(document.getElementById('slider-stamp-size')?.value) || 48;
    const ang = parseInt(document.getElementById('slider-stamp-angle')?.value) || 0;
    const bSz = document.getElementById('badge-stamp-size');
    if (bSz) bSz.innerText = `${sz}px`;
    const bAng = document.getElementById('badge-stamp-angle');
    if (bAng) bAng.innerText = `${ang}°`;

    if (activeEditorTool === 'stamp') {
        updateLiveStampPreview();
    }
}

function drawVectorStampGeometry(ctx, type, r) {
    ctx.beginPath();
    if (type === 'heart') {
        ctx.moveTo(0, r * 0.35);
        ctx.bezierCurveTo(0, -r * 0.1, -r * 0.55, -r * 0.55, -r * 0.85, -r * 0.1);
        ctx.bezierCurveTo(-r * 1.15, r * 0.35, -r * 0.4, r * 0.75, 0, r * 0.98);
        ctx.bezierCurveTo(r * 0.4, r * 0.75, r * 1.15, r * 0.35, r * 0.85, -r * 0.1);
        ctx.bezierCurveTo(r * 0.55, -r * 0.55, 0, -r * 0.1, 0, r * 0.35);
        ctx.closePath();
    } else if (type === 'star') {
        for (let i = 0; i < 10; i++) {
            const rad = (i % 2 === 0) ? r : r * 0.44;
            const a = (i * Math.PI) / 5 - Math.PI / 2;
            if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
            else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
        }
        ctx.closePath();
    } else if (type === 'crown') {
        ctx.moveTo(-r * 0.85, r * 0.65);
        ctx.lineTo(-r * 0.95, -r * 0.45);
        ctx.lineTo(-r * 0.42, 0.0);
        ctx.lineTo(0, -r * 0.75);
        ctx.lineTo(r * 0.42, 0.0);
        ctx.lineTo(r * 0.95, -r * 0.45);
        ctx.lineTo(r * 0.85, r * 0.65);
        ctx.closePath();
    } else if (type === 'paw') {
        ctx.ellipse(0, r * 0.32, r * 0.48, r * 0.38, 0, 0, Math.PI * 2);
        [[-r * 0.58, -r * 0.12], [-r * 0.22, -r * 0.45], [r * 0.22, -r * 0.45], [r * 0.58, -r * 0.12]].forEach(([tx, ty]) => {
            ctx.moveTo(tx + r * 0.18, ty);
            ctx.arc(tx, ty, r * 0.18, 0, Math.PI * 2);
        });
    } else if (type === 'bolt') {
        ctx.moveTo(r * 0.15, -r * 0.95);
        ctx.lineTo(-r * 0.65, r * 0.08);
        ctx.lineTo(-r * 0.05, r * 0.08);
        ctx.lineTo(-r * 0.25, r * 0.95);
        ctx.lineTo(r * 0.65, -r * 0.12);
        ctx.lineTo(r * 0.05, -r * 0.12);
        ctx.closePath();
    } else if (type === 'shield') {
        ctx.moveTo(0, -r * 0.92);
        ctx.lineTo(r * 0.82, -r * 0.58);
        ctx.quadraticCurveTo(r * 0.82, r * 0.38, 0, r * 0.95);
        ctx.quadraticCurveTo(-r * 0.82, r * 0.38, -r * 0.82, -r * 0.58);
        ctx.closePath();
    } else if (type === 'sparkle') {
        for (let i = 0; i < 8; i++) {
            const rad = (i % 2 === 0) ? r : r * 0.24;
            const a = (i * Math.PI) / 4;
            if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
            else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
        }
        ctx.closePath();
    } else if (type === 'home') {
        ctx.moveTo(0, -r * 0.9);
        ctx.lineTo(r * 0.92, -r * 0.05);
        ctx.lineTo(r * 0.62, -r * 0.05);
        ctx.lineTo(r * 0.62, r * 0.85);
        ctx.lineTo(-r * 0.62, r * 0.85);
        ctx.lineTo(-r * 0.62, -r * 0.05);
        ctx.lineTo(-r * 0.92, -r * 0.05);
        ctx.closePath();
    } else if (type === 'mountain') {
        ctx.moveTo(-r * 0.95, r * 0.72);
        ctx.lineTo(-r * 0.28, -r * 0.78);
        ctx.lineTo(r * 0.12, -r * 0.08);
        ctx.lineTo(r * 0.42, -r * 0.52);
        ctx.lineTo(r * 0.95, r * 0.72);
        ctx.closePath();
    } else if (type === 'butterfly') {
        // Upper & lower symmetrical wings
        ctx.moveTo(0, -r * 0.15);
        ctx.bezierCurveTo(-r * 0.45, -r * 0.95, -r * 1.05, -r * 0.75, -r * 0.82, -r * 0.05);
        ctx.bezierCurveTo(-r * 0.95, r * 0.55, -r * 0.35, r * 0.95, 0, r * 0.35);
        ctx.bezierCurveTo(r * 0.35, r * 0.95, r * 0.95, r * 0.55, r * 0.82, -r * 0.05);
        ctx.bezierCurveTo(r * 1.05, -r * 0.75, r * 0.45, -r * 0.95, 0, -r * 0.15);
        ctx.closePath();
    } else if (type === 'clover') {
        const leafR = r * 0.36;
        [[0, -r * 0.42], [r * 0.42, 0], [0, r * 0.42], [-r * 0.42, 0]].forEach(([lx, ly], idx) => {
            if (idx === 0) ctx.moveTo(lx + leafR, ly);
            else ctx.moveTo(lx + leafR, ly);
            ctx.arc(lx, ly, leafR, 0, Math.PI * 2);
        });
        ctx.rect(-r * 0.08, r * 0.35, r * 0.16, r * 0.58);
    } else {
        // High-contrast crisp vector glyph fallback for gamepad, coffee, music, trophy, anchor
        const glyphMap = { gamepad: '🎮', coffee: '☕', music: '♫', trophy: '🏆', anchor: '⚓' };
        ctx.font = `bold ${Math.round(r * 1.65)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(glyphMap[type] || '★', 0, 0);
        return;
    }
    ctx.fill();
}

function updateLiveStampPreview() {
    if (!colorDataBuffer || !processedCanvas.width) return;
    if (!preLiveToolBackup || preLiveToolBackup.width !== processedCanvas.width || preLiveToolBackup.height !== processedCanvas.height) {
        preLiveToolBackup = captureCurrentCanvasBackup();
    } else {
        restoreCanvasFromBackup(preLiveToolBackup);
    }

    const width = processedCanvas.width;
    const height = processedCanvas.height;
    const cx = editorStampState.posX !== null ? editorStampState.posX : Math.round(width / 2);
    const cy = editorStampState.posY !== null ? editorStampState.posY : Math.round(height / 2);
    editorStampState.posX = cx;
    editorStampState.posY = cy;

    const size = parseInt(document.getElementById('slider-stamp-size')?.value) || 48;
    const angleRad = ((parseInt(document.getElementById('slider-stamp-angle')?.value) || 0) * Math.PI) / 180.0;
    const outlineSlot = parseInt(document.getElementById('select-stamp-outline-slot')?.value ?? '-1');
    const zMode = document.getElementById('select-stamp-zmode')?.value || 'emboss';
    const zDelta = getZDeltaFromMode(zMode);

    const tempCvs = document.createElement('canvas');
    tempCvs.width = width;
    tempCvs.height = height;
    const tCtx = tempCvs.getContext('2d');

    tCtx.save();
    tCtx.translate(cx, cy);
    if (angleRad !== 0) tCtx.rotate(angleRad);
    tCtx.fillStyle = '#ffffff';

    if (activeVectorStamp === 'custom_logo' && customLogoStampCanvas) {
        const aspect = customLogoStampCanvas.width / Math.max(1, customLogoStampCanvas.height);
        const dw = size * 1.6 * (aspect >= 1 ? 1 : aspect);
        const dh = size * 1.6 * (aspect >= 1 ? 1 / aspect : 1);
        tCtx.drawImage(customLogoStampCanvas, -dw / 2, -dh / 2, dw, dh);
    } else {
        drawVectorStampGeometry(tCtx, activeVectorStamp, size * 0.72);
    }
    tCtx.restore();

    const sData = tCtx.getImageData(0, 0, width, height).data;
    const fillFil = filaments[activeFilamentSlot] || filaments[0];
    const [fR, fG, fB] = hexToRgb(fillFil.color);

    // Optional 3D border dilation around stamp
    if (outlineSlot >= 0 && outlineSlot < filaments.length) {
        const outFil = filaments[outlineSlot] || filaments[0];
        const [oR, oG, oB] = hexToRgb(outFil.color);
        const bRad = Math.max(2, Math.round(size * 0.07));
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const pIdx = y * width + x;
                if (sData[pIdx * 4 + 3] > 80) continue;
                let near = false;
                for (let dy = -bRad; dy <= bRad && !near; dy++) {
                    const ny = y + dy;
                    if (ny < 0 || ny >= height) continue;
                    for (let dx = -bRad; dx <= bRad; dx++) {
                        const nx = x + dx;
                        if (nx < 0 || nx >= width) continue;
                        if (sData[(ny * width + nx) * 4 + 3] > 90) { near = true; break; }
                    }
                }
                if (near) {
                    writeEditedPixel(pIdx, oR, oG, oB, outlineSlot, zDelta * 0.7, 0);
                }
            }
        }
    }

    for (let i = 0; i < sData.length; i += 4) {
        if (sData[i + 3] > 80) {
            writeEditedPixel(i / 4, fR, fG, fB, activeFilamentSlot, zDelta, 0);
        }
    }

    editorStampState.hasLivePreview = true;
    isCanvasUserEdited = true;
    render2DEditorPreview();
    requestMeshUpdate();
}

function commitAndStartNewStamp() {
    if (!colorDataBuffer || !processedCanvas.width) return;
    syncProcessedCanvasFromBuffer();
    pushHistoryState();
    preLiveToolBackup = captureCurrentCanvasBackup();
    editorStampState.posX = Math.min(processedCanvas.width - 25, (editorStampState.posX || Math.round(processedCanvas.width / 2)) + 32);
    updateLiveStampPreview();
    showToast(translations[currentLang].toastDrawingUpdated);
}

// ==========================================
// 📱 3D SCANNABLE QR CODE MATRIX EMBOSSER (ISO/IEC 18004 REED-SOLOMON + BCH)
// ==========================================
function normalizeQRPayload(rawText) {
    let t = (rawText || '').trim();
    if (!t) return 'https://bambulab.com';
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(t) && !/\s/.test(t) && /^(www\.|[a-zA-Z0-9-]+\.[a-zA-Z]{2,})(\/.*)?$/i.test(t)) {
        t = 'https://' + t;
    }
    return t;
}

function generateISOQRCodeMatrix(text) {
    const utf8 = Array.from(new TextEncoder().encode(text));
    // ISO/IEC 18004 Version 1..6 Error Correction Level L capacities & Reed-Solomon parameters
    const VERSION_TABLE = [
        null,
        { v: 1, size: 21, totalCodewords: 26, ecCodewordsPerBlock: 7, blocks: 1, maxBytes: 17, align: [] },
        { v: 2, size: 25, totalCodewords: 44, ecCodewordsPerBlock: 10, blocks: 1, maxBytes: 32, align: [6, 18] },
        { v: 3, size: 29, totalCodewords: 70, ecCodewordsPerBlock: 15, blocks: 1, maxBytes: 53, align: [6, 22] },
        { v: 4, size: 33, totalCodewords: 100, ecCodewordsPerBlock: 20, blocks: 1, maxBytes: 78, align: [6, 26] },
        { v: 5, size: 37, totalCodewords: 134, ecCodewordsPerBlock: 26, blocks: 1, maxBytes: 106, align: [6, 30] },
        { v: 6, size: 41, totalCodewords: 172, ecCodewordsPerBlock: 18, blocks: 2, maxBytes: 134, align: [6, 34] }
    ];

    let verInfo = VERSION_TABLE[6];
    for (let v = 1; v <= 6; v++) {
        if (utf8.length <= VERSION_TABLE[v].maxBytes) {
            verInfo = VERSION_TABLE[v];
            break;
        }
    }
    const payload = utf8.slice(0, verInfo.maxBytes);
    const dataCapacityBytes = verInfo.totalCodewords - verInfo.ecCodewordsPerBlock * verInfo.blocks;

    // Build bitstream: Mode 0100 (Byte mode), 8-bit character count, payload bytes, terminator, pad bytes
    const bitBuf = [];
    function pushBits(val, len) {
        for (let i = len - 1; i >= 0; i--) bitBuf.push((val >>> i) & 1);
    }
    pushBits(0b0100, 4);
    pushBits(payload.length, 8);
    for (let i = 0; i < payload.length; i++) pushBits(payload[i], 8);

    const maxDataBits = dataCapacityBytes * 8;
    const termLen = Math.min(4, maxDataBits - bitBuf.length);
    for (let i = 0; i < termLen; i++) bitBuf.push(0);
    while (bitBuf.length % 8 !== 0) bitBuf.push(0);

    const dataBytes = [];
    for (let i = 0; i < bitBuf.length; i += 8) {
        let b = 0;
        for (let j = 0; j < 8; j++) b = (b << 1) | bitBuf[i + j];
        dataBytes.push(b);
    }
    const padBytes = [0xEC, 0x11];
    let pIdx = 0;
    while (dataBytes.length < dataCapacityBytes) {
        dataBytes.push(padBytes[pIdx % 2]);
        pIdx++;
    }

    // Galois Field GF(256) with primitive polynomial 0x11D
    const gfExp = new Uint8Array(512);
    const gfLog = new Uint8Array(256);
    let x = 1;
    for (let i = 0; i < 255; i++) {
        gfExp[i] = x;
        gfLog[x] = i;
        x <<= 1;
        if (x & 0x100) x ^= 0x11D;
    }
    for (let i = 255; i < 512; i++) gfExp[i] = gfExp[i - 255];

    function gfMul(a, b) {
        if (a === 0 || b === 0) return 0;
        return gfExp[gfLog[a] + gfLog[b]];
    }

    function computeReedSolomon(dataBlock, ecLen) {
        let gen = [1];
        for (let i = 0; i < ecLen; i++) {
            const next = new Array(gen.length + 1).fill(0);
            const root = gfExp[i];
            for (let j = 0; j < gen.length; j++) {
                next[j] ^= gen[j];
                next[j + 1] ^= gfMul(gen[j], root);
            }
            gen = next;
        }
        const msg = new Uint8Array(dataBlock.length + ecLen);
        msg.set(dataBlock, 0);
        for (let i = 0; i < dataBlock.length; i++) {
            const coef = msg[i];
            if (coef !== 0) {
                for (let j = 0; j < gen.length; j++) {
                    msg[i + j] ^= gfMul(gen[j], coef);
                }
            }
        }
        return Array.from(msg.slice(dataBlock.length));
    }

    const dataBlocks = [];
    const ecBlocks = [];
    const blockDataSize = dataCapacityBytes / verInfo.blocks;
    for (let b = 0; b < verInfo.blocks; b++) {
        const blk = dataBytes.slice(b * blockDataSize, (b + 1) * blockDataSize);
        dataBlocks.push(blk);
        ecBlocks.push(computeReedSolomon(blk, verInfo.ecCodewordsPerBlock));
    }

    const finalCodewords = [];
    for (let i = 0; i < blockDataSize; i++) {
        for (let b = 0; b < verInfo.blocks; b++) finalCodewords.push(dataBlocks[b][i]);
    }
    for (let i = 0; i < verInfo.ecCodewordsPerBlock; i++) {
        for (let b = 0; b < verInfo.blocks; b++) finalCodewords.push(ecBlocks[b][i]);
    }

    const M = verInfo.size;
    const grid = Array.from({ length: M }, () => new Uint8Array(M));
    const reserved = Array.from({ length: M }, () => new Uint8Array(M));

    function setFunctionModule(r, c, val) {
        if (r >= 0 && r < M && c >= 0 && c < M) {
            grid[r][c] = val ? 1 : 0;
            reserved[r][c] = 1;
        }
    }

    function placeFinder(r0, c0) {
        for (let dr = -1; dr <= 7; dr++) {
            for (let dc = -1; dc <= 7; dc++) {
                const r = r0 + dr, c = c0 + dc;
                if (r < 0 || r >= M || c < 0 || c >= M) continue;
                if (dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6) {
                    const isBorder = (dr === 0 || dr === 6 || dc === 0 || dc === 6);
                    const isCore = (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4);
                    setFunctionModule(r, c, isBorder || isCore);
                } else {
                    setFunctionModule(r, c, 0);
                }
            }
        }
    }

    placeFinder(0, 0);
    placeFinder(0, M - 7);
    placeFinder(M - 7, 0);

    // Alignment patterns
    if (verInfo.align.length > 0) {
        for (const ar of verInfo.align) {
            for (const ac of verInfo.align) {
                if ((ar === 6 && ac === 6) || (ar === 6 && ac === M - 7) || (ar === M - 7 && ac === 6)) continue;
                for (let dr = -2; dr <= 2; dr++) {
                    for (let dc = -2; dc <= 2; dc++) {
                        const dist = Math.max(Math.abs(dr), Math.abs(dc));
                        setFunctionModule(ar + dr, ac + dc, dist !== 1);
                    }
                }
            }
        }
    }

    // Timing patterns
    for (let i = 8; i < M - 8; i++) {
        if (!reserved[6][i]) setFunctionModule(6, i, i % 2 === 0);
        if (!reserved[i][6]) setFunctionModule(i, 6, i % 2 === 0);
    }

    // Dark module & reserve format areas
    setFunctionModule(4 * verInfo.v + 9, 8, 1);
    for (let i = 0; i <= 8; i++) {
        if (!reserved[8][i]) setFunctionModule(8, i, 0);
        if (!reserved[i][8]) setFunctionModule(i, 8, 0);
    }
    for (let i = 0; i < 8; i++) {
        if (!reserved[8][M - 1 - i]) setFunctionModule(8, M - 1 - i, 0);
        if (!reserved[M - 1 - i][8]) setFunctionModule(M - 1 - i, 8, 0);
    }

    // Upward/downward 2-column zigzag bit placement
    const allBits = [];
    for (const cw of finalCodewords) {
        for (let b = 7; b >= 0; b--) allBits.push((cw >>> b) & 1);
    }

    let bitIdx = 0;
    let upward = true;
    for (let right = M - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;
        for (let vert = 0; vert < M; vert++) {
            const r = upward ? (M - 1 - vert) : vert;
            for (let j = 0; j < 2; j++) {
                const c = right - j;
                if (!reserved[r][c]) {
                    grid[r][c] = (bitIdx < allBits.length) ? allBits[bitIdx++] : 0;
                }
            }
        }
        upward = !upward;
    }

    function writeFormatBits(targetGrid, maskPattern) {
        // Level L = 01; ISO/IEC 18004 places MSB (bit 14) at (8,0) -> LSB (bit 0) at (0,8)!
        const data = (0b01 << 3) | maskPattern;
        let rem = data << 10;
        for (let i = 14; i >= 10; i--) {
            if ((rem >>> i) & 1) rem ^= (0x537 << (i - 10));
        }
        const formatBits = ((data << 10) | rem) ^ 0x5412;

        // Top-left primary format strip (MSB bit 14 -> LSB bit 0)
        for (let i = 0; i <= 5; i++) targetGrid[8][i] = (formatBits >>> (14 - i)) & 1;
        targetGrid[8][7] = (formatBits >>> 8) & 1;
        targetGrid[8][8] = (formatBits >>> 7) & 1;
        targetGrid[7][8] = (formatBits >>> 6) & 1;
        for (let i = 0; i <= 5; i++) targetGrid[5 - i][8] = (formatBits >>> (5 - i)) & 1;

        // Second format strip (bottom-left vertical MSB 14..8 + top-right horizontal 7..0)
        for (let i = 0; i < 8; i++) targetGrid[8][M - 1 - i] = (formatBits >>> i) & 1;
        for (let i = 8; i < 15; i++) targetGrid[M - 15 + i][8] = (formatBits >>> i) & 1;
        targetGrid[M - 8][8] = 1;
    }

    function maskCond(mask, r, c) {
        switch (mask) {
            case 0: return (r + c) % 2 === 0;
            case 1: return r % 2 === 0;
            case 2: return c % 3 === 0;
            case 3: return (r + c) % 3 === 0;
            case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
            case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
            case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
            case 7: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
        }
        return false;
    }

    function scoreGrid(g) {
        let penalty = 0;
        for (let r = 0; r < M; r++) {
            let runLen = 1;
            for (let c = 1; c < M; c++) {
                if (g[r][c] === g[r][c - 1]) {
                    runLen++;
                    if (runLen === 5) penalty += 3;
                    else if (runLen > 5) penalty += 1;
                } else runLen = 1;
            }
        }
        for (let c = 0; c < M; c++) {
            let runLen = 1;
            for (let r = 1; r < M; r++) {
                if (g[r][c] === g[r - 1][c]) {
                    runLen++;
                    if (runLen === 5) penalty += 3;
                    else if (runLen > 5) penalty += 1;
                } else runLen = 1;
            }
        }
        return penalty;
    }

    let bestGrid = null;
    let bestScore = Infinity;
    for (let m = 0; m < 8; m++) {
        const candidate = grid.map(row => new Uint8Array(row));
        for (let r = 0; r < M; r++) {
            for (let c = 0; c < M; c++) {
                if (!reserved[r][c] && maskCond(m, r, c)) {
                    candidate[r][c] ^= 1;
                }
            }
        }
        writeFormatBits(candidate, m);
        const s = scoreGrid(candidate);
        if (s < bestScore) {
            bestScore = s;
            bestGrid = candidate;
        }
    }
    return bestGrid;
}

function generateRealQRCodeMatrix(text) {
    if (typeof window.qrcode === 'function') {
        try {
            const qr = window.qrcode(0, 'M');
            qr.addData(text);
            qr.make();
            const M = qr.getModuleCount();
            const matrix = Array.from({ length: M }, () => new Uint8Array(M));
            for (let r = 0; r < M; r++) {
                for (let c = 0; c < M; c++) {
                    matrix[r][c] = qr.isDark(r, c) ? 1 : 0;
                }
            }
            return matrix;
        } catch (err) {
            console.warn('CDN qrcode fallback to built-in ISO encoder:', err);
        }
    }
    return generateISOQRCodeMatrix(text);
}

function applyActiveQRStampToBuffers() {
    if (!activeQRStamp || !colorDataBuffer || !processedCanvas.width || !processedCanvas.height) return;

    const width = processedCanvas.width;
    const height = processedCanvas.height;
    const darkSlot = 0;
    const lightSlot = Math.max(0, filaments.length - 1);
    const [dR, dG, dB] = hexToRgb(filaments[darkSlot].color);
    const [lR, lG, lB] = hexToRgb(filaments[lightSlot].color);

    const x0 = Math.max(0, Math.floor(activeQRStamp.u0 * (width - 1)));
    const x1 = Math.min(width - 1, Math.ceil(activeQRStamp.u1 * (width - 1)));
    const y0 = Math.max(0, Math.floor(activeQRStamp.v0 * (height - 1)));
    const y1 = Math.min(height - 1, Math.ceil(activeQRStamp.v1 * (height - 1)));

    for (let y = y0; y <= y1; y++) {
        const v = y / Math.max(1, height - 1);
        for (let x = x0; x <= x1; x++) {
            const u = x / Math.max(1, width - 1);
            const qrBit = sampleActiveQRStamp(u, v);
            if (qrBit === null) continue;
            const pIdx = y * width + x;
            const idx = pIdx * 4;
            if (qrBit === true || qrBit === 1) {
                colorDataBuffer[idx] = dR;
                colorDataBuffer[idx + 1] = dG;
                colorDataBuffer[idx + 2] = dB;
                colorDataBuffer[idx + 3] = 255;
                if (filamentSlotBuffer) filamentSlotBuffer[pIdx] = darkSlot;
            } else {
                colorDataBuffer[idx] = lR;
                colorDataBuffer[idx + 1] = lG;
                colorDataBuffer[idx + 2] = lB;
                colorDataBuffer[idx + 3] = 255;
                if (filamentSlotBuffer) filamentSlotBuffer[pIdx] = lightSlot;
            }
        }
    }

    const pCtx = processedCanvas.getContext('2d');
    const outImg = pCtx.createImageData(width, height);
    outImg.data.set(colorDataBuffer);
    pCtx.putImageData(outImg, 0, 0);
}

// ==========================================
// 📶 FEATURE 1: SMART QR CODE MODES (URL / WI-FI AUTO-CONNECT / VCARD CONTACT)
// ==========================================
function onQRModeChange() {
    const mode = document.getElementById('select-qr-mode')?.value || 'url';
    const pUrl = document.getElementById('qr-panel-url');
    const pWifi = document.getElementById('qr-panel-wifi');
    const pVcard = document.getElementById('qr-panel-vcard');
    if (pUrl) pUrl.style.display = mode === 'url' ? 'block' : 'none';
    if (pWifi) {
        pWifi.style.display = mode === 'wifi' ? 'flex' : 'none';
        pWifi.style.flexDirection = 'column';
    }
    if (pVcard) {
        pVcard.style.display = mode === 'vcard' ? 'flex' : 'none';
        pVcard.style.flexDirection = 'column';
    }
}

function escapeQRField(str) {
    return (str || '').trim().replace(/([\\;,:])/g, '\\$1');
}

function buildSmartQRPayload() {
    const mode = document.getElementById('select-qr-mode')?.value || 'url';
    if (mode === 'wifi') {
        const ssidRaw = document.getElementById('qr-wifi-ssid')?.value.trim() || 'Home_WiFi_5G';
        const passRaw = document.getElementById('qr-wifi-pass')?.value.trim() || '';
        const enc = document.getElementById('qr-wifi-enc')?.value || 'WPA';
        const ssid = escapeQRField(ssidRaw);
        const pass = escapeQRField(passRaw);
        if (enc === 'nopass' || !pass) {
            return `WIFI:T:nopass;S:${ssid};;`;
        }
        return `WIFI:T:${enc};S:${ssid};P:${pass};;`;
    } else if (mode === 'vcard') {
        const name = escapeQRField(document.getElementById('qr-vcard-name')?.value.trim() || 'Alex Studio');
        const tel = escapeQRField(document.getElementById('qr-vcard-tel')?.value.trim() || '+33600000000');
        const email = escapeQRField(document.getElementById('qr-vcard-email')?.value.trim() || 'contact@studios-pro.com');
        return `MECARD:N:${name};TEL:${tel};EMAIL:${email};;`;
    } else {
        const qrInput = document.getElementById('qr-text-input');
        const rawText = (qrInput && qrInput.value.trim()) ? qrInput.value.trim() : 'https://bambulab.com';
        const text = normalizeQRPayload(rawText);
        if (qrInput && qrInput.value.trim() && qrInput.value.trim() !== text) {
            qrInput.value = text;
        }
        return text;
    }
}

function stamp3DQRCode() {
    if (!colorDataBuffer || !processedCanvas.width || !processedCanvas.height) return;
    const posSel = document.getElementById('select-qr-pos');
    const text = buildSmartQRPayload();
    const posMode = posSel ? posSel.value : 'br';

    pushHistoryState();

    // Restore pre-QR image buffer if moving or updating an existing QR code
    if (preQRBackup &&
        preQRBackup.width === processedCanvas.width &&
        preQRBackup.height === processedCanvas.height) {
        colorDataBuffer = new Uint8ClampedArray(preQRBackup.color);
        if (preQRBackup.slots && filamentSlotBuffer) {
            filamentSlotBuffer = new Uint8Array(preQRBackup.slots);
        }
    } else {
        preQRBackup = {
            width: processedCanvas.width,
            height: processedCanvas.height,
            color: new Uint8ClampedArray(colorDataBuffer),
            slots: filamentSlotBuffer ? new Uint8Array(filamentSlotBuffer) : null
        };
    }

    isCanvasUserEdited = true;

    const matrix = generateRealQRCodeMatrix(text);
    const M = matrix.length;
    const quietModules = 4; // Mandatory 4-module ISO/IEC 18004 Quiet Zone
    const totalModules = M + quietModules * 2;

    // Maintain square physical aspect ratio on rectangular plaques
    const aspectW = config.width / Math.max(1, config.height);
    const baseSize = (posMode === 'center') ? 0.52 : 0.34;
    const spanU = aspectW >= 1 ? (baseSize / aspectW) : baseSize;
    const spanV = aspectW >= 1 ? baseSize : (baseSize * aspectW);

    let u0, v0;
    const margin = 0.04;
    if (posMode === 'center') {
        u0 = (1.0 - spanU) * 0.5;
        v0 = (1.0 - spanV) * 0.5;
    } else if (posMode === 'bl') {
        u0 = margin;
        v0 = 1.0 - spanV - margin;
    } else {
        u0 = 1.0 - spanU - margin;
        v0 = 1.0 - spanV - margin;
    }

    activeQRStamp = {
        text,
        posMode,
        matrix,
        M,
        quietModules,
        quietZone: quietModules,
        totalModules,
        u0,
        v0,
        u1: u0 + spanU,
        v1: v0 + spanV
    };

    const clearBtn = document.getElementById('btn-clear-qr');
    if (clearBtn) clearBtn.style.display = 'inline-flex';

    applyActiveQRStampToBuffers();
    if (activeSoundwave) applyActiveSoundwaveToBuffers();
    render2DEditorPreview();
    generate3DReliefMesh();
    showToast(translations[currentLang].toastQRStamped);
}

function clear3DQRCode() {
    if (!activeQRStamp && !preQRBackup) return;
    pushHistoryState();
    activeQRStamp = null;
    const clearBtn = document.getElementById('btn-clear-qr');
    if (clearBtn) clearBtn.style.display = 'none';
    if (preQRBackup &&
        preQRBackup.width === processedCanvas.width &&
        preQRBackup.height === processedCanvas.height) {
        colorDataBuffer = new Uint8ClampedArray(preQRBackup.color);
        if (preQRBackup.slots && filamentSlotBuffer) {
            filamentSlotBuffer = new Uint8Array(preQRBackup.slots);
        }
        if (activeSoundwave) applyActiveSoundwaveToBuffers();
        const pCtx = processedCanvas.getContext('2d');
        const outImg = pCtx.createImageData(processedCanvas.width, processedCanvas.height);
        outImg.data.set(colorDataBuffer);
        pCtx.putImageData(outImg, 0, 0);
    }
    preQRBackup = null;
    render2DEditorPreview();
    generate3DReliefMesh();
}

// ==========================================
// 🎙️ FEATURE 4: AUDIO SOUNDWAVE TO 3D RELIEF (MP3/WAV + MIC + PRESETS)
// ==========================================
function generatePresetSoundwaveBars(presetName, numBars = 56) {
    if (presetName === 'custom' && customAudioBars && customAudioBars.length > 0) {
        return customAudioBars;
    }
    const bars = new Float32Array(numBars);
    if (presetName === 'heartbeat') {
        // Realistic P-Q-R-S-T ECG Heartbeat Wave
        for (let i = 0; i < numBars; i++) {
            const t = (i / numBars) * 2.0; // Two full heartbeats across the plaque
            const phase = t % 1.0;
            let amp = 0.10;
            if (phase > 0.18 && phase < 0.28) {
                // P-wave
                amp = 0.28 * Math.sin(((phase - 0.18) / 0.10) * Math.PI);
            } else if (phase >= 0.36 && phase <= 0.46) {
                // Sharp R-peak QRS complex
                const qrs = 1.0 - Math.abs((phase - 0.41) / 0.05);
                amp = 0.15 + 0.85 * Math.max(0, qrs);
            } else if (phase > 0.56 && phase < 0.72) {
                // T-wave
                amp = 0.42 * Math.sin(((phase - 0.56) / 0.16) * Math.PI);
            }
            bars[i] = Math.max(0.08, Math.min(1.0, amp));
        }
    } else if (presetName === 'voice' || presetName === 'love') {
        // "I Love You" — 3 distinct vocal syllables ("I" - "LOVE" - "YOU")
        for (let i = 0; i < numBars; i++) {
            const u = i / Math.max(1, numBars - 1);
            const syl1 = Math.exp(-Math.pow((u - 0.18) / 0.075, 2)) * 0.72;
            const syl2 = Math.exp(-Math.pow((u - 0.50) / 0.135, 2)) * 1.00;
            const syl3 = Math.exp(-Math.pow((u - 0.81) / 0.105, 2)) * 0.84;
            const harmonic = 0.78 + 0.22 * Math.abs(Math.sin(i * 1.35) * Math.cos(i * 0.7));
            bars[i] = Math.max(0.08, Math.min(1.0, (syl1 + syl2 + syl3) * harmonic));
        }
    } else {
        // Energetic Studio Song Acoustic Waveform
        for (let i = 0; i < numBars; i++) {
            const u = i / Math.max(1, numBars - 1);
            const env = Math.sin(u * Math.PI);
            const beat = 0.45 + 0.55 * Math.abs(Math.sin(u * Math.PI * 5.0 + 0.4) * Math.cos(i * 0.85));
            bars[i] = Math.max(0.10, Math.min(1.0, env * beat));
        }
    }
    return Array.from(bars);
}

async function handleAudioFileUpload(event) {
    const file = event.target?.files?.[0];
    if (!file) return;
    if (event.target) event.target.value = '';
    let audioCtx = null;
    try {
        const arrayBuf = await file.arrayBuffer();
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioCtx();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuf);
        const rawData = audioBuffer.getChannelData(0);
        const numBars = 56;
        const blockSize = Math.max(1, Math.floor(rawData.length / numBars));
        const extracted = [];
        let maxPeak = 0.001;

        for (let i = 0; i < numBars; i++) {
            const start = i * blockSize;
            let sumSq = 0;
            let peak = 0;
            for (let j = 0; j < blockSize && (start + j) < rawData.length; j++) {
                const sample = Math.abs(rawData[start + j]);
                sumSq += sample * sample;
                if (sample > peak) peak = sample;
            }
            const rms = Math.sqrt(sumSq / blockSize);
            const val = rms * 0.65 + peak * 0.35;
            if (val > maxPeak) maxPeak = val;
            extracted.push(val);
        }

        customAudioBars = extracted.map(v => Math.max(0.08, Math.min(1.0, Math.pow(v / maxPeak, 0.82))));

        const presetSel = document.getElementById('select-soundwave-preset');
        if (presetSel) {
            let customOpt = presetSel.querySelector('option[value="custom"]');
            if (!customOpt) {
                customOpt = document.createElement('option');
                customOpt.value = 'custom';
                presetSel.appendChild(customOpt);
            }
            customOpt.innerText = currentLang === 'fr' ? `🎵 Audio : ${file.name.slice(0, 18)}` : `🎵 Audio: ${file.name.slice(0, 18)}`;
            presetSel.value = 'custom';
        }

        stamp3DSoundwave();
    } catch (err) {
        console.warn('Audio decode failed:', err);
        showToast(currentLang === 'fr' ? '⚠️ Fichier audio illisible (utilisez MP3 ou WAV).' : '⚠️ Could not decode audio file (use MP3 or WAV).');
    } finally {
        if (audioCtx && audioCtx.state !== 'closed') {
            try { await audioCtx.close(); } catch (_) {}
        }
    }
}

async function recordMicrophoneSoundwave() {
    if (_isRecordingMic) return;
    _isRecordingMic = true;
    const btn = document.getElementById('btn-record-mic');
    const txtSpan = document.getElementById('txt-record-mic');
    const origLabel = txtSpan ? txtSpan.innerText : 'Record Voice (4s)';

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        _isRecordingMic = false;
        const presetSel = document.getElementById('select-soundwave-preset');
        if (presetSel) presetSel.value = 'voice';
        stamp3DSoundwave();
        return;
    }

    let stream = null;
    let audioCtx = null;
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioCtx();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const timeData = new Uint8Array(analyser.fftSize);
        const recordedSamples = [];
        const durationMs = 3600;
        const intervalMs = 60;
        let elapsed = 0;

        if (btn) btn.style.borderColor = '#ef4444';
        showToast(translations[currentLang].toastMicRecording);

        await new Promise(resolve => {
            const timer = setInterval(() => {
                analyser.getByteTimeDomainData(timeData);
                let peak = 0;
                for (let i = 0; i < timeData.length; i++) {
                    const norm = Math.abs((timeData[i] - 128) / 128.0);
                    if (norm > peak) peak = norm;
                }
                recordedSamples.push(peak);
                elapsed += intervalMs;
                const rem = Math.max(0, ((durationMs - elapsed) / 1000)).toFixed(1);
                if (txtSpan) txtSpan.innerText = `🔴 ${rem}s...`;

                if (elapsed >= durationMs) {
                    clearInterval(timer);
                    resolve();
                }
            }, intervalMs);
        });

        const numBars = 56;
        const maxVal = Math.max(0.05, ...recordedSamples);
        const bars = [];
        for (let i = 0; i < numBars; i++) {
            const idx = Math.min(recordedSamples.length - 1, Math.floor((i / numBars) * recordedSamples.length));
            const norm = Math.pow(recordedSamples[idx] / maxVal, 0.78);
            bars.push(Math.max(0.08, Math.min(1.0, norm)));
        }
        customAudioBars = bars;

        const presetSel = document.getElementById('select-soundwave-preset');
        if (presetSel) {
            let customOpt = presetSel.querySelector('option[value="custom"]');
            if (!customOpt) {
                customOpt = document.createElement('option');
                customOpt.value = 'custom';
                presetSel.appendChild(customOpt);
            }
            customOpt.innerText = currentLang === 'fr' ? '🎙️ Voix Enregistrée (Micro)' : '🎙️ Recorded Voice (Mic)';
            presetSel.value = 'custom';
        }

        stamp3DSoundwave();
    } catch (err) {
        console.warn('Microphone access unavailable, using vocal preset:', err);
        const presetSel = document.getElementById('select-soundwave-preset');
        if (presetSel) presetSel.value = 'voice';
        stamp3DSoundwave();
    } finally {
        _isRecordingMic = false;
        if (stream) { try { stream.getTracks().forEach(t => t.stop()); } catch (_) {} }
        if (audioCtx && audioCtx.state !== 'closed') { try { await audioCtx.close(); } catch (_) {} }
        if (btn) btn.style.borderColor = 'rgba(244,63,94,0.45)';
        if (txtSpan) txtSpan.innerText = origLabel;
    }
}

function applyActiveSoundwaveToBuffers() {
    if (!activeSoundwave || !colorDataBuffer || !processedCanvas.width || !processedCanvas.height) return;

    const width = processedCanvas.width;
    const height = processedCanvas.height;
    const darkSlot = 0;
    const lightSlot = Math.max(0, filaments.length - 1);
    const [dR, dG, dB] = hexToRgb(filaments[darkSlot].color);
    const [lR, lG, lB] = hexToRgb(filaments[lightSlot].color);

    const x0 = Math.max(0, Math.floor(activeSoundwave.u0 * (width - 1)));
    const x1 = Math.min(width - 1, Math.ceil(activeSoundwave.u1 * (width - 1)));
    const y0 = Math.max(0, Math.floor(activeSoundwave.v0 * (height - 1)));
    const y1 = Math.min(height - 1, Math.ceil(activeSoundwave.v1 * (height - 1)));

    for (let y = y0; y <= y1; y++) {
        const v = y / Math.max(1, height - 1);
        for (let x = x0; x <= x1; x++) {
            const u = x / Math.max(1, width - 1);
            const waveBit = sampleActiveSoundwave(u, v);
            if (waveBit === null) continue;
            const pIdx = y * width + x;
            const idx = pIdx * 4;
            if (waveBit === true || waveBit === 1) {
                colorDataBuffer[idx] = lR;
                colorDataBuffer[idx + 1] = lG;
                colorDataBuffer[idx + 2] = lB;
                colorDataBuffer[idx + 3] = 255;
                if (filamentSlotBuffer) filamentSlotBuffer[pIdx] = lightSlot;
            } else {
                colorDataBuffer[idx] = dR;
                colorDataBuffer[idx + 1] = dG;
                colorDataBuffer[idx + 2] = dB;
                colorDataBuffer[idx + 3] = 255;
                if (filamentSlotBuffer) filamentSlotBuffer[pIdx] = darkSlot;
            }
        }
    }

    const pCtx = processedCanvas.getContext('2d');
    const outImg = pCtx.createImageData(width, height);
    outImg.data.set(colorDataBuffer);
    pCtx.putImageData(outImg, 0, 0);
}

function stamp3DSoundwave() {
    if (!colorDataBuffer || !processedCanvas.width || !processedCanvas.height) return;
    const presetSel = document.getElementById('select-soundwave-preset');
    const posSel = document.getElementById('select-soundwave-pos');
    const preset = presetSel ? presetSel.value : 'love';
    const posMode = posSel ? posSel.value : 'bottom';

    pushHistoryState();

    if (preSoundwaveBackup &&
        preSoundwaveBackup.width === processedCanvas.width &&
        preSoundwaveBackup.height === processedCanvas.height) {
        colorDataBuffer = new Uint8ClampedArray(preSoundwaveBackup.color);
        if (preSoundwaveBackup.slots && filamentSlotBuffer) {
            filamentSlotBuffer = new Uint8Array(preSoundwaveBackup.slots);
        }
    } else {
        preSoundwaveBackup = {
            width: processedCanvas.width,
            height: processedCanvas.height,
            color: new Uint8ClampedArray(colorDataBuffer),
            slots: filamentSlotBuffer ? new Uint8Array(filamentSlotBuffer) : null
        };
    }

    isCanvasUserEdited = true;
    const bars = generatePresetSoundwaveBars(preset, 56);

    let u0 = 0.08, u1 = 0.92;
    // If a QR stamp is in the bottom corner and soundwave is at the bottom, leave room so they don't overlap
    if (activeQRStamp && posMode === 'bottom') {
        if (activeQRStamp.posMode === 'br') u1 = Math.min(u1, activeQRStamp.u0 - 0.03);
        else if (activeQRStamp.posMode === 'bl') u0 = Math.max(u0, activeQRStamp.u1 + 0.03);
    }

    let v0, v1;
    const bandH = 0.16;
    if (posMode === 'center') {
        v0 = 0.5 - bandH * 0.5;
        v1 = 0.5 + bandH * 0.5;
    } else if (posMode === 'top') {
        v0 = 0.05;
        v1 = 0.05 + bandH;
    } else {
        v0 = 0.95 - bandH;
        v1 = 0.95;
    }

    activeSoundwave = {
        preset,
        style: (preset === 'heartbeat') ? 'heartbeat' : 'bars', // Activates continuous ECG Heartbeat trace!
        posMode,
        bars,
        u0,
        u1,
        v0,
        v1
    };

    const btnClear = document.getElementById('btn-clear-wave');
    if (btnClear) btnClear.style.display = 'inline-flex';

    applyActiveSoundwaveToBuffers();
    if (activeQRStamp) applyActiveQRStampToBuffers();
    render2DEditorPreview();
    generate3DReliefMesh();
    showToast(translations[currentLang].toastWaveStamped);
}

function clear3DSoundwave() {
    if (!activeSoundwave && !preSoundwaveBackup) return;
    pushHistoryState();
    activeSoundwave = null;
    const btnClear = document.getElementById('btn-clear-wave');
    if (btnClear) btnClear.style.display = 'none';

    if (preSoundwaveBackup &&
        preSoundwaveBackup.width === processedCanvas.width &&
        preSoundwaveBackup.height === processedCanvas.height) {
        colorDataBuffer = new Uint8ClampedArray(preSoundwaveBackup.color);
        if (preSoundwaveBackup.slots && filamentSlotBuffer) {
            filamentSlotBuffer = new Uint8Array(preSoundwaveBackup.slots);
        }
        if (activeQRStamp) applyActiveQRStampToBuffers();
        const pCtx = processedCanvas.getContext('2d');
        const outImg = pCtx.createImageData(processedCanvas.width, processedCanvas.height);
        outImg.data.set(colorDataBuffer);
        pCtx.putImageData(outImg, 0, 0);
    }
    preSoundwaveBackup = null;
    render2DEditorPreview();
    generate3DReliefMesh();
}

// ==========================================
// 📐 20 CAD DRAWING STARTER TEMPLATES & CLEAN BLANK CANVAS
// ==========================================
function loadDrawingTemplate(type) {
    isDrawingTemplateActive = true;
    isCanvasUserEdited = true;
    activeQRStamp = null;
    preQRBackup = null;
    activeSoundwave = null;
    preSoundwaveBackup = null;
    editorTextState.hasLivePreview = false;
    editorStampState.hasLivePreview = false;
    editorPatternState.hasLivePreview = false;
    preLiveToolBackup = null;
    editorSymmetryMode = 'none';
    const symSelReset = document.getElementById('select-editor-symmetry');
    if (symSelReset) symSelReset.value = 'none';

    const quickSel = document.getElementById('select-quick-template');
    if (quickSel && quickSel.value !== type) quickSel.value = type;
    const sec1Sel = document.getElementById('select-sec1-template');
    if (sec1Sel && sec1Sel.value !== type) sec1Sel.value = type;

    const maxRes = Math.max(240, config.engineResolution || 360);
    const aspect = (config.width || 150) / Math.max(1, config.height || 150);
    const w = aspect >= 1 ? maxRes : Math.max(120, Math.round(maxRes * aspect));
    const h = aspect >= 1 ? Math.max(120, Math.round(maxRes / aspect)) : maxRes;
    processedCanvas.width = w;
    processedCanvas.height = h;

    const ctx = processedCanvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);

    const s0 = 0;
    const s1 = Math.min(1, filaments.length - 1);
    const s2 = Math.min(2, filaments.length - 1);
    const s3 = Math.min(3, filaments.length - 1);
    const sTop = Math.max(0, filaments.length - 1);

    const fil0 = filaments[s0] || { color: '#09090b' };
    const fil1 = filaments[s1] || { color: '#15803d' };
    const fil2 = filaments[s2] || { color: '#ea580c' };
    const fil3 = filaments[s3] || { color: '#eab308' };
    const filTop = filaments[sTop] || { color: '#f8fafc' };

    ctx.fillStyle = fil0.color;
    ctx.fillRect(0, 0, w, h);

    function drawRoundRect(c, x, y, rw, rh, r) {
        if (c.roundRect) {
            c.beginPath();
            c.roundRect(x, y, rw, rh, r);
            c.fill();
        } else {
            c.beginPath();
            c.moveTo(x + r, y);
            c.arcTo(x + rw, y, x + rw, y + rh, r);
            c.arcTo(x + rw, y + rh, x, y + rh, r);
            c.arcTo(x, y + rh, x, y, r);
            c.arcTo(x, y, x + rw, y, r);
            c.closePath();
            c.fill();
        }
    }

    function strokeRoundRect(c, x, y, rw, rh, r) {
        if (c.roundRect) {
            c.beginPath();
            c.roundRect(x, y, rw, rh, r);
            c.stroke();
        } else {
            c.beginPath();
            c.rect(x, y, rw, rh);
            c.stroke();
        }
    }

    const scale = Math.min(w, h) / 180.0;
    const cx = w / 2, cy = h / 2;

    if (type === 'keychain') {
        const kw = 152 * scale, kh = 82 * scale;
        const kx = (w - kw) / 2, ky = (h - kh) / 2;

        ctx.fillStyle = fil2.color;
        drawRoundRect(ctx, kx, ky, kw, kh, 16 * scale);

        ctx.strokeStyle = fil3.color;
        ctx.lineWidth = Math.max(2, 3.5 * scale);
        strokeRoundRect(ctx, kx + 5 * scale, ky + 5 * scale, kw - 10 * scale, kh - 10 * scale, 12 * scale);

        ctx.fillStyle = fil0.color;
        ctx.beginPath();
        ctx.arc(kx + 18 * scale, ky + kh / 2, 8.5 * scale, 0, Math.PI * 2);
        ctx.fill();

    } else if (type === 'dogtag') {
        const dw = 154 * scale, dh = 86 * scale;
        const dx = (w - dw) / 2, dy = (h - dh) / 2;
        const rCap = dh / 2;

        ctx.fillStyle = fil1.color;
        drawRoundRect(ctx, dx, dy, dw, dh, rCap);

        ctx.strokeStyle = fil3.color;
        ctx.lineWidth = 4 * scale;
        strokeRoundRect(ctx, dx + 5 * scale, dy + 5 * scale, dw - 10 * scale, dh - 10 * scale, rCap - 5 * scale);

        // Chain hole with reinforced collar
        ctx.fillStyle = fil3.color;
        ctx.beginPath();
        ctx.arc(dx + 20 * scale, cy, 11 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = fil0.color;
        ctx.beginPath();
        ctx.arc(dx + 20 * scale, cy, 6.5 * scale, 0, Math.PI * 2);
        ctx.fill();

    } else if (type === 'heart_locket') {
        const hr = 74 * scale;
        // Top eyelet tab
        ctx.fillStyle = fil3.color;
        ctx.beginPath();
        ctx.arc(cx, cy - hr * 0.42, 13 * scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(cx, cy - hr * 0.08);
        ctx.fillStyle = fil2.color;
        drawVectorStampGeometry(ctx, 'heart', hr);
        ctx.strokeStyle = fil3.color;
        ctx.lineWidth = 4.5 * scale;
        ctx.stroke();

        ctx.scale(0.82, 0.82);
        ctx.strokeStyle = filTop.color;
        ctx.lineWidth = 2.5 * scale;
        drawVectorStampGeometry(ctx, 'heart', hr);
        ctx.stroke();
        ctx.restore();

        // Top eyelet hole
        ctx.fillStyle = fil0.color;
        ctx.beginPath();
        ctx.arc(cx, cy - hr * 0.44, 5.8 * scale, 0, Math.PI * 2);
        ctx.fill();

    } else if (type === 'coaster') {
        ctx.fillStyle = fil1.color;
        ctx.beginPath();
        ctx.arc(cx, cy, 78 * scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = fil3.color;
        ctx.lineWidth = 6 * scale;
        ctx.beginPath();
        ctx.arc(cx, cy, 67 * scale, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = fil2.color;
        ctx.lineWidth = 2.5 * scale;
        ctx.beginPath();
        ctx.arc(cx, cy, 56 * scale, 0, Math.PI * 2);
        ctx.stroke();

    } else if (type === 'hexbadge') {
        const rOuter = 78 * scale;
        const rMid = 66 * scale;
        const rInner = 54 * scale;
        const drawHex = (rad) => {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = -Math.PI / 2 + (i * Math.PI * 2) / 6;
                const px = cx + Math.cos(a) * rad;
                const py = cy + Math.sin(a) * rad;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
        };
        ctx.fillStyle = fil1.color;
        drawHex(rOuter);
        ctx.fill();

        ctx.strokeStyle = fil3.color;
        ctx.lineWidth = 5 * scale;
        drawHex(rMid);
        ctx.stroke();

        ctx.strokeStyle = fil2.color;
        ctx.lineWidth = 2.5 * scale;
        drawHex(rInner);
        ctx.stroke();

    } else if (type === 'mandala_plate') {
        ctx.fillStyle = fil1.color;
        ctx.beginPath();
        ctx.arc(cx, cy, 80 * scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = fil2.color;
        ctx.lineWidth = 3 * scale;
        for (let k = 0; k < 12; k++) {
            const a = (k * Math.PI * 2) / 12;
            ctx.beginPath();
            ctx.arc(cx + Math.cos(a) * 34 * scale, cy + Math.sin(a) * 34 * scale, 34 * scale, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.strokeStyle = fil3.color;
        ctx.lineWidth = 4.5 * scale;
        ctx.beginPath();
        ctx.arc(cx, cy, 72 * scale, 0, Math.PI * 2);
        ctx.stroke();

        editorSymmetryMode = 'rosette12';
        const symSel = document.getElementById('select-editor-symmetry');
        if (symSel) symSel.value = 'rosette12';

    } else if (type === 'sign') {
        const sw = 162 * scale, sh = 104 * scale;
        const sx = (w - sw) / 2, sy = (h - sh) / 2;

        ctx.fillStyle = fil2.color;
        drawRoundRect(ctx, sx, sy, sw, sh, 11 * scale);

        ctx.strokeStyle = filTop.color;
        ctx.lineWidth = 3 * scale;
        strokeRoundRect(ctx, sx + 6 * scale, sy + 6 * scale, sw - 12 * scale, sh - 12 * scale, 7 * scale);

        ctx.fillStyle = fil0.color;
        [[sx + 13 * scale, sy + 13 * scale], [sx + sw - 13 * scale, sy + 13 * scale], [sx + 13 * scale, sy + sh - 13 * scale], [sx + sw - 13 * scale, sy + sh - 13 * scale]].forEach(([hx, hy]) => {
            ctx.beginPath();
            ctx.arc(hx, hy, 4.5 * scale, 0, Math.PI * 2);
            ctx.fill();
        });

    } else if (type === 'shield') {
        const r = 76 * scale;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.fillStyle = fil1.color;
        drawVectorStampGeometry(ctx, 'shield', r);
        ctx.strokeStyle = fil3.color;
        ctx.lineWidth = 5 * scale;
        ctx.stroke();
        ctx.restore();

    } else if (type === 'gaming_tag') {
        const gw = 160 * scale, gh = 92 * scale;
        const gx = (w - gw) / 2, gy = (h - gh) / 2;
        const ch = 18 * scale;

        const traceCyberPlaque = (inset) => {
            const x0 = gx + inset, y0 = gy + inset, x1 = gx + gw - inset, y1 = gy + gh - inset;
            const c = Math.max(4, ch - inset * 0.6);
            ctx.beginPath();
            ctx.moveTo(x0 + c, y0);
            ctx.lineTo(x1 - c, y0);
            ctx.lineTo(x1, y0 + c);
            ctx.lineTo(x1, y1 - c);
            ctx.lineTo(x1 - c, y1);
            ctx.lineTo(x0 + c, y1);
            ctx.lineTo(x0, y1 - c);
            ctx.lineTo(x0, y0 + c);
            ctx.closePath();
        };

        ctx.fillStyle = fil1.color;
        traceCyberPlaque(0);
        ctx.fill();

        ctx.strokeStyle = fil3.color;
        ctx.lineWidth = 4 * scale;
        traceCyberPlaque(6 * scale);
        ctx.stroke();

        // Top lanyard slot cutout
        ctx.fillStyle = fil0.color;
        drawRoundRect(ctx, cx - 16 * scale, gy + 11 * scale, 32 * scale, 7 * scale, 3.5 * scale);

    } else if (type === 'bookmark') {
        const bw = 64 * scale, bh = 162 * scale;
        const bx = (w - bw) / 2, by = (h - bh) / 2;

        ctx.fillStyle = fil2.color;
        drawRoundRect(ctx, bx, by, bw, bh, 12 * scale);

        ctx.strokeStyle = fil3.color;
        ctx.lineWidth = 3 * scale;
        strokeRoundRect(ctx, bx + 5 * scale, by + 5 * scale, bw - 10 * scale, bh - 10 * scale, 8 * scale);

        // Top tassel hole
        ctx.fillStyle = fil0.color;
        ctx.beginPath();
        ctx.arc(cx, by + 16 * scale, 5.5 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Inner U-shaped page clip slot cutout
        ctx.strokeStyle = fil0.color;
        ctx.lineWidth = 4.5 * scale;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - 15 * scale, by + 54 * scale);
        ctx.lineTo(cx - 15 * scale, by + 122 * scale);
        ctx.arc(cx, by + 122 * scale, 15 * scale, Math.PI, 0, true);
        ctx.lineTo(cx + 15 * scale, by + 54 * scale);
        ctx.stroke();

    } else if (type === 'bottle_tag') {
        const bw = 96 * scale, bh = 160 * scale;
        const bx = (w - bw) / 2, by = (h - bh) / 2;

        ctx.fillStyle = fil2.color;
        drawRoundRect(ctx, bx, by, bw, bh, 22 * scale);

        ctx.strokeStyle = fil3.color;
        ctx.lineWidth = 3.5 * scale;
        strokeRoundRect(ctx, bx + 5 * scale, by + 5 * scale, bw - 10 * scale, bh - 10 * scale, 17 * scale);

        // Large bottle-neck circular cutout hole at top
        ctx.fillStyle = fil0.color;
        ctx.beginPath();
        ctx.arc(cx, by + 40 * scale, 23 * scale, 0, Math.PI * 2);
        ctx.fill();

    } else if (type === 'ornament') {
        const rad = 66 * scale;
        const oy = cy + 8 * scale;

        // Top crown cap & hanging loop
        ctx.fillStyle = fil3.color;
        drawRoundRect(ctx, cx - 16 * scale, oy - rad - 14 * scale, 32 * scale, 18 * scale, 4 * scale);
        ctx.beginPath();
        ctx.arc(cx, oy - rad - 18 * scale, 11 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Main bauble sphere silhouette
        ctx.fillStyle = fil2.color;
        ctx.beginPath();
        ctx.arc(cx, oy, rad, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = fil3.color;
        ctx.lineWidth = 4 * scale;
        ctx.beginPath();
        ctx.arc(cx, oy, rad - 5 * scale, 0, Math.PI * 2);
        ctx.stroke();

        // Decorative horizontal bands
        ctx.strokeStyle = filTop.color;
        ctx.lineWidth = 2.5 * scale;
        ctx.beginPath();
        ctx.moveTo(cx - rad * 0.85, oy - 22 * scale);
        ctx.lineTo(cx + rad * 0.85, oy - 22 * scale);
        ctx.moveTo(cx - rad * 0.85, oy + 22 * scale);
        ctx.lineTo(cx + rad * 0.85, oy + 22 * scale);
        ctx.stroke();

        // Hanging ring hole
        ctx.fillStyle = fil0.color;
        ctx.beginPath();
        ctx.arc(cx, oy - rad - 19 * scale, 5.2 * scale, 0, Math.PI * 2);
        ctx.fill();

    } else if (type === 'magnet_frame') {
        const fw = 148 * scale, fh = 148 * scale;
        const fx = (w - fw) / 2, fy = (h - fh) / 2;

        ctx.fillStyle = fil3.color;
        drawRoundRect(ctx, fx, fy, fw, fh, 18 * scale);

        ctx.fillStyle = fil2.color;
        drawRoundRect(ctx, fx + 8 * scale, fy + 8 * scale, fw - 16 * scale, fh - 16 * scale, 12 * scale);

        ctx.fillStyle = fil1.color;
        drawRoundRect(ctx, fx + 20 * scale, fy + 20 * scale, fw - 40 * scale, fh - 40 * scale, 8 * scale);

        ctx.strokeStyle = filTop.color;
        ctx.lineWidth = 2.5 * scale;
        strokeRoundRect(ctx, fx + 20 * scale, fy + 20 * scale, fw - 40 * scale, fh - 40 * scale, 8 * scale);

    } else if (type === 'trophy_medal') {
        const mr = 68 * scale;
        const my = cy + 8 * scale;

        // Top ribbon bar
        ctx.fillStyle = fil3.color;
        drawRoundRect(ctx, cx - 26 * scale, my - mr - 16 * scale, 52 * scale, 22 * scale, 5 * scale);

        // Scalloped 16-point star rim
        ctx.fillStyle = fil3.color;
        ctx.beginPath();
        const pts = 32;
        for (let i = 0; i < pts; i++) {
            const r = (i % 2 === 0) ? mr : mr * 0.91;
            const a = (i * Math.PI * 2) / pts;
            const px = cx + Math.cos(a) * r;
            const py = my + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Inner medallion plate
        ctx.fillStyle = fil2.color;
        ctx.beginPath();
        ctx.arc(cx, my, mr * 0.78, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = filTop.color;
        ctx.lineWidth = 3 * scale;
        ctx.beginPath();
        ctx.arc(cx, my, mr * 0.70, 0, Math.PI * 2);
        ctx.stroke();

        // Ribbon through-slot
        ctx.fillStyle = fil0.color;
        drawRoundRect(ctx, cx - 18 * scale, my - mr - 11 * scale, 36 * scale, 7 * scale, 3 * scale);

    } else if (type === 'luggage_tag') {
        const lw = 158 * scale, lh = 94 * scale;
        const lx = (w - lw) / 2, ly = (h - lh) / 2;

        ctx.fillStyle = fil2.color;
        ctx.beginPath();
        ctx.moveTo(lx + 28 * scale, ly);
        ctx.lineTo(lx + lw - 12 * scale, ly);
        ctx.quadraticCurveTo(lx + lw, ly, lx + lw, ly + 12 * scale);
        ctx.lineTo(lx + lw, ly + lh - 12 * scale);
        ctx.quadraticCurveTo(lx + lw, ly + lh, lx + lw - 12 * scale, ly + lh);
        ctx.lineTo(lx + 28 * scale, ly + lh);
        ctx.lineTo(lx, cy + 16 * scale);
        ctx.lineTo(lx, cy - 16 * scale);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = fil3.color;
        ctx.lineWidth = 3.5 * scale;
        strokeRoundRect(ctx, lx + 34 * scale, ly + 9 * scale, lw - 44 * scale, lh - 18 * scale, 8 * scale);

        // Vertical luggage strap slot
        ctx.fillStyle = fil0.color;
        drawRoundRect(ctx, lx + 12 * scale, cy - 15 * scale, 8 * scale, 30 * scale, 4 * scale);

    } else if (type === 'plant_stake') {
        const pw = 128 * scale, ph = 68 * scale;
        const px = (w - pw) / 2, py = cy - 68 * scale;

        // Pointed soil stake shaft
        ctx.fillStyle = fil1.color;
        ctx.beginPath();
        ctx.moveTo(cx - 14 * scale, py + ph - 4 * scale);
        ctx.lineTo(cx + 14 * scale, py + ph - 4 * scale);
        ctx.lineTo(cx + 11 * scale, cy + 52 * scale);
        ctx.lineTo(cx, cy + 82 * scale);
        ctx.lineTo(cx - 11 * scale, cy + 52 * scale);
        ctx.closePath();
        ctx.fill();

        // Top herb signboard
        ctx.fillStyle = fil2.color;
        drawRoundRect(ctx, px, py, pw, ph, 12 * scale);

        ctx.strokeStyle = fil3.color;
        ctx.lineWidth = 3.5 * scale;
        strokeRoundRect(ctx, px + 5 * scale, py + 5 * scale, pw - 10 * scale, ph - 10 * scale, 8 * scale);

    } else if (type === 'celtic_cross') {
        const cr = 74 * scale;
        const armW = 28 * scale;

        // Outer halo ring
        ctx.fillStyle = fil3.color;
        ctx.beginPath();
        ctx.arc(cx, cy, cr * 0.72, 0, Math.PI * 2);
        ctx.fill();

        // Inner ring cutout (creates 4 quadrant through-holes!)
        ctx.fillStyle = fil0.color;
        ctx.beginPath();
        ctx.arc(cx, cy, cr * 0.50, 0, Math.PI * 2);
        ctx.fill();

        // Cross arms
        ctx.fillStyle = fil2.color;
        drawRoundRect(ctx, cx - armW / 2, cy - cr, armW, cr * 2, 7 * scale);
        drawRoundRect(ctx, cx - cr, cy - armW / 2, cr * 2, armW, 7 * scale);

        // Center boss medallion
        ctx.fillStyle = fil3.color;
        ctx.beginPath();
        ctx.arc(cx, cy, armW * 0.75, 0, Math.PI * 2);
        ctx.fill();

        // Top hanging hole
        ctx.fillStyle = fil0.color;
        ctx.beginPath();
        ctx.arc(cx, cy - cr + 11 * scale, 4.8 * scale, 0, Math.PI * 2);
        ctx.fill();

    } else if (type === 'workshop_label') {
        const ww = 164 * scale, wh = 68 * scale;
        const wx = (w - ww) / 2, wy = (h - wh) / 2;

        ctx.fillStyle = fil1.color;
        drawRoundRect(ctx, wx, wy, ww, wh, 9 * scale);

        ctx.fillStyle = fil3.color;
        drawRoundRect(ctx, wx + 6 * scale, wy + 6 * scale, ww - 12 * scale, wh - 12 * scale, 6 * scale);

        ctx.fillStyle = fil1.color;
        drawRoundRect(ctx, wx + 11 * scale, wy + 11 * scale, ww - 22 * scale, wh - 22 * scale, 4 * scale);

        // Left & Right mounting bolt holes
        ctx.fillStyle = fil0.color;
        ctx.beginPath();
        ctx.arc(wx + 20 * scale, cy, 5.2 * scale, 0, Math.PI * 2);
        ctx.arc(wx + ww - 20 * scale, cy, 5.2 * scale, 0, Math.PI * 2);
        ctx.fill();

    } else if (type === 'gothic_window') {
        const gw = 128 * scale, gh = 160 * scale;
        const gx = (w - gw) / 2, gy = (h - gh) / 2;

        const traceGothicArch = (inset) => {
            const x0 = gx + inset, y0 = gy + inset, x1 = gx + gw - inset, y1 = gy + gh - inset;
            const midX = (x0 + x1) / 2;
            const archY = y0 + (y1 - y0) * 0.42;
            ctx.beginPath();
            ctx.moveTo(x0, y1);
            ctx.lineTo(x0, archY);
            ctx.quadraticCurveTo(x0, y0 + (archY - y0) * 0.2, midX, y0);
            ctx.quadraticCurveTo(x1, y0 + (archY - y0) * 0.2, x1, archY);
            ctx.lineTo(x1, y1);
            ctx.closePath();
        };

        ctx.fillStyle = fil1.color;
        traceGothicArch(0);
        ctx.fill();

        ctx.strokeStyle = fil3.color;
        ctx.lineWidth = 4.5 * scale;
        traceGothicArch(6 * scale);
        ctx.stroke();

        // Upper Cathedral Rose Window Tracery
        const ry = gy + gh * 0.40;
        const rr = 34 * scale;
        ctx.strokeStyle = fil2.color;
        ctx.lineWidth = 3 * scale;
        ctx.beginPath();
        ctx.arc(cx, ry, rr, 0, Math.PI * 2);
        ctx.stroke();
        for (let k = 0; k < 8; k++) {
            const a = (k * Math.PI * 2) / 8;
            ctx.beginPath();
            ctx.moveTo(cx, ry);
            ctx.lineTo(cx + Math.cos(a) * rr, ry + Math.sin(a) * rr);
            ctx.stroke();
        }

    } else {
        // 'blank' — 100% Clean Blank Canvas filled with Base Slot 0
        ctx.fillStyle = fil0.color;
        ctx.fillRect(0, 0, w, h);
    }

    const imgData = ctx.getImageData(0, 0, w, h);
    colorDataBuffer = new Uint8ClampedArray(imgData.data);
    filamentSlotBuffer = new Uint8Array(w * h);
    customZDeltaBuffer = new Float32Array(w * h);
    cutoutMaskBuffer = new Uint8Array(w * h);
    userEditMaskBuffer = new Uint8Array(w * h);
    lastProcessedMeta = null;
    resetEditHistory();

    // Map template pixels cleanly to active filament slots
    const parsedPalette = filaments.map(f => hexToRgb(f.color));
    for (let pIdx = 0; pIdx < w * h; pIdx++) {
        const idx = pIdx * 4;
        const pr = colorDataBuffer[idx];
        const pg = colorDataBuffer[idx + 1];
        const pb = colorDataBuffer[idx + 2];
        let bestSlot = 0;
        let bestDist = Infinity;
        for (let s = 0; s < parsedPalette.length; s++) {
            const [fr, fg, fb] = parsedPalette[s];
            const d = (pr - fr) * (pr - fr) + (pg - fg) * (pg - fg) + (pb - fb) * (pb - fb);
            if (d < bestDist) {
                bestDist = d;
                bestSlot = s;
            }
        }
        filamentSlotBuffer[pIdx] = bestSlot;
        colorDataBuffer[idx] = parsedPalette[bestSlot][0];
        colorDataBuffer[idx + 1] = parsedPalette[bestSlot][1];
        colorDataBuffer[idx + 2] = parsedPalette[bestSlot][2];
        colorDataBuffer[idx + 3] = 255;
    }

    // Automatically detect interior through-holes vs exterior background on shaped templates!
    if (type !== 'blank') {
        config.removeCanvasBg = true;
        syncRemoveCanvasUI();

        // Flood-fill slot 0 from canvas border to identify exterior background; any interior slot 0 pixel is a real physical through-hole!
        const isExteriorZero = new Uint8Array(w * h);
        const queue = new Int32Array(w * h);
        let qHead = 0, qTail = 0;
        for (let x = 0; x < w; x++) {
            const topIdx = x;
            const botIdx = (h - 1) * w + x;
            if (filamentSlotBuffer[topIdx] === 0 && !isExteriorZero[topIdx]) { isExteriorZero[topIdx] = 1; queue[qTail++] = topIdx; }
            if (filamentSlotBuffer[botIdx] === 0 && !isExteriorZero[botIdx]) { isExteriorZero[botIdx] = 1; queue[qTail++] = botIdx; }
        }
        for (let y = 0; y < h; y++) {
            const leftIdx = y * w;
            const rightIdx = y * w + (w - 1);
            if (filamentSlotBuffer[leftIdx] === 0 && !isExteriorZero[leftIdx]) { isExteriorZero[leftIdx] = 1; queue[qTail++] = leftIdx; }
            if (filamentSlotBuffer[rightIdx] === 0 && !isExteriorZero[rightIdx]) { isExteriorZero[rightIdx] = 1; queue[qTail++] = rightIdx; }
        }
        while (qHead < qTail) {
            const curr = queue[qHead++];
            const x = curr % w;
            const y = (curr / w) | 0;
            if (x > 0) { const n = curr - 1; if (filamentSlotBuffer[n] === 0 && !isExteriorZero[n]) { isExteriorZero[n] = 1; queue[qTail++] = n; } }
            if (x + 1 < w) { const n = curr + 1; if (filamentSlotBuffer[n] === 0 && !isExteriorZero[n]) { isExteriorZero[n] = 1; queue[qTail++] = n; } }
            if (y > 0) { const n = curr - w; if (filamentSlotBuffer[n] === 0 && !isExteriorZero[n]) { isExteriorZero[n] = 1; queue[qTail++] = n; } }
            if (y + 1 < h) { const n = curr + w; if (filamentSlotBuffer[n] === 0 && !isExteriorZero[n]) { isExteriorZero[n] = 1; queue[qTail++] = n; } }
        }
        for (let pIdx = 0; pIdx < w * h; pIdx++) {
            if (filamentSlotBuffer[pIdx] === 0 && !isExteriorZero[pIdx]) {
                cutoutMaskBuffer[pIdx] = 1;
            }
        }
    } else {
        config.removeCanvasBg = false;
        syncRemoveCanvasUI();
    }

    syncProcessedCanvasFromBuffer();
    pushHistoryState();
    init2DEditor();

    // Position live editable text thoughtfully for each template
    if (type !== 'blank' && type !== 'mandala_plate' && type !== 'celtic_cross') {
        activeFilamentSlot = sTop;
        updateFilamentSwatchesUI();
        let tx = w / 2;
        let ty = h / 2;
        if (type === 'keychain' || type === 'dogtag') tx = w / 2 + 12 * scale;
        else if (type === 'luggage_tag') tx = w / 2 + 14 * scale;
        else if (type === 'bottle_tag') ty = h / 2 + 24 * scale;
        else if (type === 'bookmark') ty = h / 2 - 22 * scale;
        else if (type === 'plant_stake') ty = cy - 34 * scale;
        else if (type === 'ornament' || type === 'trophy_medal') ty = cy + 8 * scale;
        else if (type === 'gothic_window') ty = cy + 36 * scale;

        editorTextState.posX = Math.round(tx);
        editorTextState.posY = Math.round(ty);
        const edText = document.getElementById('editor-text-input');
        if (edText && !edText.value.trim()) {
            edText.value = 'STUDIO 3D';
            editorTextState.text = 'STUDIO 3D';
        }
        setEditorTool('text');
    } else {
        if (type === 'mandala_plate' || type === 'celtic_cross') {
            activeFilamentSlot = sTop;
            updateFilamentSwatchesUI();
            setEditorTool('brush');
        }
        render2DEditorPreview();
        requestMeshUpdate();
    }

    showToast(type === 'blank' ? translations[currentLang].toastCleanCanvasReady : translations[currentLang].toastTemplateLoaded);
}

function clearDrawingCanvas() {
    if (!colorDataBuffer || !processedCanvas.width) return;
    pushHistoryState();
    isCanvasUserEdited = true;
    activeQRStamp = null;
    preQRBackup = null;
    activeSoundwave = null;
    preSoundwaveBackup = null;
    editorTextState.hasLivePreview = false;
    editorStampState.hasLivePreview = false;
    editorPatternState.hasLivePreview = false;
    preLiveToolBackup = null;

    const [r, g, b] = hexToRgb(filaments[0].color);
    for (let i = 0; i < colorDataBuffer.length; i += 4) {
        colorDataBuffer[i] = r;
        colorDataBuffer[i + 1] = g;
        colorDataBuffer[i + 2] = b;
        colorDataBuffer[i + 3] = 255;
    }
    if (filamentSlotBuffer) {
        filamentSlotBuffer.fill(0);
    }
    if (customZDeltaBuffer) {
        customZDeltaBuffer.fill(0);
    }
    if (cutoutMaskBuffer) {
        cutoutMaskBuffer.fill(0);
    }
    if (processedCanvas.width && processedCanvas.height) {
        ensureUserEditMaskBuffer(processedCanvas.width * processedCanvas.height).fill(1);
    }
    config.removeCanvasBg = false;
    syncRemoveCanvasUI();
    syncProcessedCanvasFromBuffer();
    render2DEditorPreview();
    requestMeshUpdate();
    showToast(translations[currentLang].toastCleanCanvasReady);
}

function revertToOriginalPhoto() {
    if (sourceImage) {
        if (colorDataBuffer) pushHistoryState();
        isCanvasUserEdited = false;
        isDrawingTemplateActive = false;
        activeQRStamp = null;
        preQRBackup = null;
        activeSoundwave = null;
        preSoundwaveBackup = null;
        editorTextState.hasLivePreview = false;
        editorStampState.hasLivePreview = false;
        editorPatternState.hasLivePreview = false;
        preLiveToolBackup = null;
        if (customZDeltaBuffer) customZDeltaBuffer.fill(0);
        if (cutoutMaskBuffer) cutoutMaskBuffer.fill(0);
        if (userEditMaskBuffer) userEditMaskBuffer.fill(0);
        config.removeCanvasBg = false;
        syncRemoveCanvasUI();

        processSourceImage(false, true);
        if (centerViewMode === '2d') {
            render2DEditorPreview();
        } else {
            generate3DReliefMesh();
        }
        showToast(translations[currentLang].toastRevertedOriginal);
    } else {
        openCleanBlankCanvas();
    }
}

function applyCanvasTo3D() {
    commitLiveToolIfNeeded();
    setCenterViewMode('3d');
    showToast(translations[currentLang].toastDrawingUpdated);
}

// ==========================================
// 🖱️ 2D EDITOR POINTER & MOUSE EVENTS (TOUCH-SAFE & GUARDED)
// ==========================================
function getCanvasCoords(e) {
    if (!editorCanvas || !editorCanvas.width || !editorCanvas.height) return { x: 0, y: 0 };
    const rect = editorCanvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
    const scaleX = editorCanvas.width / rect.width;
    const scaleY = editorCanvas.height / rect.height;
    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    const x = Math.max(0, Math.min(editorCanvas.width - 1, Math.round((clientX - rect.left) * scaleX)));
    const y = Math.max(0, Math.min(editorCanvas.height - 1, Math.round((clientY - rect.top) * scaleY)));
    return { x, y };
}

function handleEditorPointerDown(e) {
    if (!colorDataBuffer) return;
    if (e.button !== undefined && e.button !== 0) return; // Ignore right/middle click!
    if (activeEditorTool === 'fx') return; // FX subbar uses action buttons, not canvas clicks!
    isEditorInteracting = true;
    const coords = getCanvasCoords(e);
    editorStartX = coords.x;
    editorStartY = coords.y;
    editorLastX = coords.x;
    editorLastY = coords.y;

    if (activeEditorTool === 'text') {
        pushHistoryState();
        editorTextState.posX = coords.x;
        editorTextState.posY = coords.y;
        updateLiveTextPreview();
        return;
    } else if (activeEditorTool === 'stamp') {
        pushHistoryState();
        editorStampState.posX = coords.x;
        editorStampState.posY = coords.y;
        updateLiveStampPreview();
        return;
    } else if (activeEditorTool === 'pattern') {
        pushHistoryState();
        editorPatternState.posX = coords.x;
        editorPatternState.posY = coords.y;
        updateLivePatternPreview();
        return;
    }

    pushHistoryState();

    if (activeEditorTool === 'heal') {
        smartHeal(coords.x, coords.y, editorBrushRadius, coords.x, coords.y);
        render2DEditorPreview();
    } else if (activeEditorTool === 'brush') {
        paintBrushStroke(coords.x, coords.y, coords.x, coords.y, editorBrushRadius, activeFilamentSlot);
        render2DEditorPreview();
    } else if (activeEditorTool === 'chisel') {
        paintZChiselStroke(coords.x, coords.y, coords.x, coords.y, editorBrushRadius);
        render2DEditorPreview();
    } else if (activeEditorTool === 'cutout') {
        paintCutoutDrillStroke(coords.x, coords.y, coords.x, coords.y, editorBrushRadius);
        render2DEditorPreview();
    } else if (activeEditorTool === 'fill') {
        floodFillBuffer(coords.x, coords.y, activeFilamentSlot, editorFillTolerance);
        render2DEditorPreview();
        requestMeshUpdate();
    } else if (activeEditorTool === 'recolor') {
        const isGlobal = !!(document.getElementById('chk-recolor-global')?.checked || e.shiftKey);
        smartRecolorZone(coords.x, coords.y, activeFilamentSlot, editorFillTolerance, isGlobal);
        render2DEditorPreview();
        requestMeshUpdate();
        showToast(translations[currentLang].toastRecolorApplied);
    } else if (isCADShapeTool(activeEditorTool)) {
        preLiveToolBackup = captureCurrentCanvasBackup();
    }
}

function handleEditorPointerMove(e) {
    const cursorCircle = document.getElementById('editor-cursor-circle');
    if (centerViewMode === '2d' && cursorCircle && editorCanvas && editorCanvas.width > 0) {
        const rect = editorCanvas.getBoundingClientRect();
        const insideCanvas = (rect.width > 0 && e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom);
        if (insideCanvas) {
            const displayScale = rect.width / editorCanvas.width;
            const screenR = Math.max(6, Math.round(editorBrushRadius * displayScale));

            cursorCircle.style.display = 'block';
            cursorCircle.style.left = `${e.clientX}px`;
            cursorCircle.style.top = `${e.clientY}px`;
            cursorCircle.style.width = `${screenR * 2}px`;
            cursorCircle.style.height = `${screenR * 2}px`;

            if (activeEditorTool === 'heal') {
                cursorCircle.style.borderColor = '#c084fc';
                cursorCircle.style.background = 'rgba(192,132,252,0.15)';
            } else if (activeEditorTool === 'chisel') {
                cursorCircle.style.borderColor = '#34d399';
                cursorCircle.style.background = 'rgba(52,211,153,0.16)';
            } else if (activeEditorTool === 'cutout') {
                cursorCircle.style.borderColor = '#f43f5e';
                cursorCircle.style.background = 'rgba(244,63,94,0.22)';
            } else if (activeEditorTool === 'text' || activeEditorTool === 'stamp' || activeEditorTool === 'pattern') {
                cursorCircle.style.borderColor = '#fbbf24';
                cursorCircle.style.background = 'rgba(251,191,36,0.12)';
            } else {
                cursorCircle.style.borderColor = '#38bdf8';
                cursorCircle.style.background = 'rgba(56,189,248,0.12)';
            }
        } else {
            cursorCircle.style.display = 'none';
        }
    } else if (cursorCircle) {
        cursorCircle.style.display = 'none';
    }

    if (!isEditorInteracting || !colorDataBuffer) return;
    const coords = getCanvasCoords(e);

    if (activeEditorTool === 'text') {
        editorTextState.posX = coords.x;
        editorTextState.posY = coords.y;
        updateLiveTextPreview();
    } else if (activeEditorTool === 'stamp') {
        editorStampState.posX = coords.x;
        editorStampState.posY = coords.y;
        updateLiveStampPreview();
    } else if (activeEditorTool === 'pattern') {
        editorPatternState.posX = coords.x;
        editorPatternState.posY = coords.y;
        updateLivePatternPreview();
    } else if (activeEditorTool === 'heal') {
        smartHeal(editorLastX, editorLastY, editorBrushRadius, coords.x, coords.y);
        render2DEditorPreview();
    } else if (activeEditorTool === 'brush') {
        paintBrushStroke(editorLastX, editorLastY, coords.x, coords.y, editorBrushRadius, activeFilamentSlot);
        render2DEditorPreview();
    } else if (activeEditorTool === 'chisel') {
        paintZChiselStroke(editorLastX, editorLastY, coords.x, coords.y, editorBrushRadius);
        render2DEditorPreview();
    } else if (activeEditorTool === 'cutout') {
        paintCutoutDrillStroke(editorLastX, editorLastY, coords.x, coords.y, editorBrushRadius);
        render2DEditorPreview();
    } else if (isCADShapeTool(activeEditorTool)) {
        if (preLiveToolBackup) restoreCanvasFromBackup(preLiveToolBackup);
        drawShape(activeEditorTool, editorStartX, editorStartY, coords.x, coords.y, activeFilamentSlot);
        render2DEditorPreview();
    }
    editorLastX = coords.x;
    editorLastY = coords.y;
}

function handleEditorPointerUp(e) {
    if (!isEditorInteracting) return;
    isEditorInteracting = false;
    const coords = getCanvasCoords(e);

    if (activeEditorTool === 'text' || activeEditorTool === 'stamp' || activeEditorTool === 'pattern') {
        syncProcessedCanvasFromBuffer();
        requestMeshUpdate();
        return;
    }

    if (isCADShapeTool(activeEditorTool)) {
        if (preLiveToolBackup) restoreCanvasFromBackup(preLiveToolBackup);
        drawShape(activeEditorTool, editorStartX, editorStartY, coords.x, coords.y, activeFilamentSlot);
        preLiveToolBackup = null;
        render2DEditorPreview();
    }

    syncProcessedCanvasFromBuffer();
    if (activeEditorTool !== 'fill' && activeEditorTool !== 'recolor') {
        requestMeshUpdate();
    }
}


// ==========================================
// 🚀 DOM INITIALIZATION
// ==========================================

// Mobile View Controller (Phone Portrait & Landscape)
let currentMobileView = 'panel';
function setMobileView(view) {
    currentMobileView = view;
    if (view === 'canvas') {
        document.body.classList.add('mobile-view-canvas');
        document.body.classList.remove('mobile-view-panel');
    } else {
        document.body.classList.add('mobile-view-panel');
        document.body.classList.remove('mobile-view-canvas');
    }
    const btnCanvas = document.getElementById('tab-btn-canvas');
    const btnPanel = document.getElementById('tab-btn-panel');
    if (btnCanvas) btnCanvas.classList.toggle('active', view === 'canvas');
    if (btnPanel) btnPanel.classList.toggle('active', view === 'panel');

    setTimeout(() => {
        if (typeof onWindowResize === 'function') onWindowResize();
    }, 60);
}

function applySharedUrlParams() {
    try {
        const params = new URLSearchParams(window.location.search);
        if (!params || Array.from(params.keys()).length === 0) return false;
        let applied = false;
        const numParam = (k, min, max) => {
            const v = parseFloat(params.get(k));
            return Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : null;
        };
        const w = numParam('w', 20, 1200);
        const h = numParam('h', 20, 1200);
        const z = numParam('z', 0.6, 30);
        const lh = numParam('lh', 0.04, 0.32);
        const base = numParam('base', 0.2, 20);
        if (w !== null) { config.width = w; const el = document.getElementById('input-width'); if (el) el.value = w; applied = true; }
        if (h !== null) { config.height = h; const el = document.getElementById('input-height'); if (el) el.value = h; applied = true; }
        if (lh !== null) { config.layerHeight = lh; const el = document.getElementById('select-layer-height'); if (el) el.value = String(lh); applied = true; }
        if (z !== null) { config.maxRelief = z; applied = true; }
        if (base !== null) { config.baseThickness = Math.min(base, config.maxRelief - 0.2); applied = true; }
        const elZ = document.getElementById('input-max-z'); if (elZ) elZ.value = config.maxRelief;
        const elBase = document.getElementById('select-base-thickness'); if (elBase) elBase.value = Number(config.baseThickness || 0.60).toFixed(2);
        const topo = params.get('topo');
        if (topo) { config.topography = topo; const el = document.getElementById('select-topography'); if (el) el.value = topo; applied = true; }
        const shape = params.get('shape');
        if (shape) { config.outlineShape = shape; const el = document.getElementById('select-outline-shape'); if (el) el.value = shape; applied = true; }
        const pal = params.get('pal');
        if (pal) {
            const items = pal.split(',').map(s => s.split(':')).filter(parts => /^#[0-9a-f]{6}$/i.test(parts[0]));
            if (items.length >= 2) {
                filaments = items.slice(0, 6).map((parts, idx) => ({
                    id: Date.now() + idx,
                    name: decodeURIComponent(parts[3] || `Shared #${idx + 1}`).slice(0, 40),
                    color: parts[0],
                    startPct: idx === 0 ? 0 : Math.max(0.02, Math.min(0.98, parseFloat(parts[1]) || (idx / items.length))),
                    td: Math.max(0.1, Math.min(15, parseFloat(parts[2]) || 3.0)),
                    targetFeature: "Shared Stack"
                }));
                applied = true;
            }
        }
        return applied;
    } catch (e) {
        return false;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    if (window.innerWidth <= 900) {
        setMobileView('panel');
    }
    const resSel = document.getElementById('select-engine-res');
    if (resSel) config.engineResolution = parseInt(resSel.value) || config.engineResolution || 360;
    const resBadge = document.getElementById('badge-engine-res');
    if (resBadge) {
        resBadge.innerText = config.engineResolution >= 512 ? 'Ultra-HD 512px' : (config.engineResolution >= 360 ? 'HD 360px' : 'Std 220px');
    }

    try { init3D(); } catch (e) { console.warn('3D init degraded:', e); }
    setLang(currentLang);
    setupDropzone();
    const hasShared = applySharedUrlParams();
    setWorkspaceMode(config.workspaceMode || 'quick', true);

    ['tiger', 'cyberpunk', 'cat', 'mountain', 'mona'].forEach(type => {
        const cvs = document.getElementById(`sample-cvs-${type}`);
        if (cvs) drawSampleGraphic(cvs, type);
    });

    // Load default dual-tiger sample cleanly once (preserving shared URL palette/dims if present)
    const savedFils = hasShared ? filaments.map(f => ({ ...f })) : null;
    loadSample('tiger');
    if (hasShared && savedFils) {
        setTimeout(() => {
            filaments = savedFils;
            renderFilamentStackUI();
            if (typeof updateFilamentSwatchesUI === 'function') updateFilamentSwatchesUI();
            requestMeshUpdate(true);
        }, 80);
    }

    if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAllModals();
    });
});

// ==========================================
// 🎛️ WORKSPACE MODE SWITCHER (QUICK HUEFORGE VS PRO CAD) & ACCORDIONS
// ==========================================
function setWorkspaceMode(mode, silent = false) {
    config.workspaceMode = (mode === 'pro') ? 'pro' : 'quick';
    document.body.classList.toggle('workspace-quick', config.workspaceMode === 'quick');
    document.body.classList.toggle('workspace-pro', config.workspaceMode === 'pro');
    const bQ = document.getElementById('btn-ws-quick');
    const bP = document.getElementById('btn-ws-pro');
    if (bQ) bQ.classList.toggle('active', config.workspaceMode === 'quick');
    if (bP) bP.classList.toggle('active', config.workspaceMode === 'pro');
    if (!silent) {
        showToast(config.workspaceMode === 'quick'
            ? (currentLang === 'fr' ? '⚡ Mode Quick HueForge (4 étapes simples)' : '⚡ Quick HueForge Mode (Clean 4-step workflow)')
            : (currentLang === 'fr' ? '🛠️ Mode Pro CAD & 2D Studio activé' : '🛠️ Pro CAD & 2D Studio Mode enabled'));
    }
}

function toggleAccordionSection(sectionId) {
    const sec = document.getElementById(sectionId);
    if (!sec) return;
    sec.classList.toggle('collapsed');
}

// ==========================================
// 📸 CAMERA TD AUTO-CALIBRATOR ("SNAP & MEASURE TD" — ZERO $50 HARDWARE!)
// ==========================================
let _camTDImg = null;
let _camTDPoints = [];
let _camTDLastResult = null;

function openCameraTDModal() {
    const modal = document.getElementById('camera-td-modal');
    if (modal) modal.style.display = 'flex';
    _camTDPoints = [];
    _camTDLastResult = null;
    renderCameraTDCanvas();
}

function handleCameraTDPhotoUpload(event) {
    const file = event.target?.files?.[0];
    if (!file) return;
    if (event.target) event.target.value = '';
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            _camTDImg = img;
            _camTDPoints = [];
            _camTDLastResult = null;
            renderCameraTDCanvas();
            const resEl = document.getElementById('cam-td-result-box');
            if (resEl) {
                resEl.innerHTML = currentLang === 'fr'
                    ? '👉 Cliquez le <strong>centre de la marche la plus fine (0.20mm)</strong>, puis le <strong>centre de la marche la plus épaisse (3.00mm)</strong>.'
                    : '👉 Click the <strong>center of the thinnest step (0.20mm)</strong>, then the <strong>center of the thickest step (3.00mm)</strong>.';
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function renderCameraTDCanvas() {
    const cvs = document.getElementById('cam-td-canvas');
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    if (!_camTDImg) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 13px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(currentLang === 'fr' ? '1. Imprimez la Cale TD • 2. Posez sur écran/feuille blanche • 3. Importez la photo ici' : '1. Print Calibration Wedge • 2. Hold over white screen/paper • 3. Upload photo here', cvs.width / 2, cvs.height / 2);
        return;
    }

    const scale = Math.min(cvs.width / _camTDImg.width, cvs.height / _camTDImg.height);
    const dw = _camTDImg.width * scale;
    const dh = _camTDImg.height * scale;
    const dx = (cvs.width - dw) * 0.5;
    const dy = (cvs.height - dh) * 0.5;
    ctx.drawImage(_camTDImg, dx, dy, dw, dh);

    if (_camTDPoints.length >= 1) {
        ctx.strokeStyle = '#38bdf8';
        ctx.fillStyle = '#38bdf8';
        ctx.lineWidth = 2;
        _camTDPoints.forEach((p, idx) => {
            ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = '700 11px sans-serif';
            ctx.fillText(idx === 0 ? '0.2mm' : '3.0mm', p.x + 10, p.y - 6);
            ctx.fillStyle = '#38bdf8';
        });
    }
    if (_camTDPoints.length === 2) {
        const p0 = _camTDPoints[0], p1 = _camTDPoints[1];
        ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
        for (let s = 0; s < 15; s++) {
            const t = s / 14;
            const sx = p0.x + (p1.x - p0.x) * t;
            const sy = p0.y + (p1.y - p0.y) * t;
            ctx.strokeStyle = '#10b981';
            ctx.strokeRect(sx - 3, sy - 3, 6, 6);
        }
    }
}

function onCameraTDCanvasClick(e) {
    if (!_camTDImg) return;
    const cvs = document.getElementById('cam-td-canvas');
    if (!cvs) return;
    const rect = cvs.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const x = ((e.clientX - rect.left) / rect.width) * cvs.width;
    const y = ((e.clientY - rect.top) / rect.height) * cvs.height;

    if (_camTDPoints.length >= 2) _camTDPoints = [];
    _camTDPoints.push({ x, y });
    renderCameraTDCanvas();
    if (_camTDPoints.length === 2) runCameraTDFit();
}

function runCameraTDFit() {
    const cvs = document.getElementById('cam-td-canvas');
    if (!cvs || !_camTDImg || _camTDPoints.length < 2) return;
    const tmp = document.createElement('canvas');
    tmp.width = cvs.width; tmp.height = cvs.height;
    const ctx = tmp.getContext('2d');
    const scale = Math.min(tmp.width / _camTDImg.width, tmp.height / _camTDImg.height);
    const dw = _camTDImg.width * scale, dh = _camTDImg.height * scale;
    ctx.drawImage(_camTDImg, (tmp.width - dw) * 0.5, (tmp.height - dh) * 0.5, dw, dh);
    const id = ctx.getImageData(0, 0, tmp.width, tmp.height).data;

    const p0 = _camTDPoints[0], p1 = _camTDPoints[1];
    const lums = [];
    const thicknesses = [];
    let thickR = 0, thickG = 0, thickB = 0;

    for (let s = 0; s < 15; s++) {
        const t = s / 14;
        const cx = Math.round(p0.x + (p1.x - p0.x) * t);
        const cy = Math.round(p0.y + (p1.y - p0.y) * t);
        let sumLin = 0, rS = 0, gS = 0, bS = 0, cnt = 0;
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                const xx = Math.max(0, Math.min(tmp.width - 1, cx + dx));
                const yy = Math.max(0, Math.min(tmp.height - 1, cy + dy));
                const idx = (yy * tmp.width + xx) * 4;
                const r = id[idx], g = id[idx + 1], b = id[idx + 2];
                sumLin += 0.2126 * SRGB_TO_LIN_LUT[r] + 0.7152 * SRGB_TO_LIN_LUT[g] + 0.0722 * SRGB_TO_LIN_LUT[b];
                rS += r; gS += g; bS += b; cnt++;
            }
        }
        lums.push(sumLin / Math.max(1, cnt));
        thicknesses.push(0.20 * (s + 1));
        if (s === 14) {
            thickR = Math.round(rS / cnt);
            thickG = Math.round(gS / cnt);
            thickB = Math.round(bS / cnt);
        }
    }

    const fit = computeCameraTDFromSamples(lums, thicknesses);
    const detectedHex = rgbToHex(thickR, thickG, thickB);
    _camTDLastResult = { ...fit, hex: detectedHex };

    const hexInput = document.getElementById('cam-td-spool-hex');
    if (hexInput) hexInput.value = detectedHex;
    const resEl = document.getElementById('cam-td-result-box');
    if (resEl) {
        const conf = Math.round((fit.r2 || 0) * 100);
        resEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
            <div><strong style="color:#10b981;font-size:1.1rem;">TD = ${fit.td.toFixed(1)} mm</strong>
            <span style="font-size:0.75rem;color:#94a3b8;margin-left:8px;">(Fit R²: ${conf}%)</span></div>
            <span style="display:inline-flex;align-items:center;gap:6px;font-size:0.75rem;"><span style="width:14px;height:14px;border-radius:4px;background:${detectedHex};border:1px solid #fff;display:inline-block;"></span>${detectedHex.toUpperCase()}</span>
        </div>`;
    }
}

function saveCalibratedSpoolToRack() {
    if (!_camTDLastResult) {
        showToast(currentLang === 'fr' ? 'Cliquez d’abord les 2 extrémités de la cale sur la photo.' : 'Click both ends of the printed wedge on the photo first.');
        return;
    }
    const brand = document.getElementById('cam-td-spool-brand')?.value.trim() || 'My Spool';
    const name = document.getElementById('cam-td-spool-name')?.value.trim() || `Calibrated TD ${_camTDLastResult.td}mm`;
    const hex = document.getElementById('cam-td-spool-hex')?.value || _camTDLastResult.hex;
    const entry = addCustomSpoolToRack({ brand, name, hex, td: _camTDLastResult.td, markOwned: true });
    renderFilamentStackUI();
    showToast(`✅ ${entry.name} (TD ${entry.td}mm) ${currentLang === 'fr' ? 'ajoutée à Mon Rack !' : 'saved to My Spool Rack!'}`);
    closeAllModals();
}

// ==========================================
// 🧰 MY SPOOL RACK MODAL (OWNED INVENTORY + .HFP / CSV / JSON IMPORT)
// ==========================================
function openSpoolRackModal() {
    const modal = document.getElementById('spool-rack-modal');
    if (modal) modal.style.display = 'flex';
    renderSpoolRackList();
}

function renderSpoolRackList() {
    const listEl = document.getElementById('spool-rack-list');
    const countEl = document.getElementById('spool-rack-count');
    if (!listEl) return;
    const q = (document.getElementById('spool-rack-search')?.value || '').trim().toLowerCase();
    const brandFilter = document.getElementById('spool-rack-brand-filter')?.value || 'all';
    const onlyOwned = !!document.getElementById('chk-rack-only-owned')?.checked;

    const all = getAllAvailableSpools();
    const ownedCount = getOwnedSpools().length;
    if (countEl) countEl.innerText = `${ownedCount} / ${all.length}`;

    const filtered = all.filter(s => {
        if (onlyOwned && !isSpoolOwned(s.id)) return false;
        if (brandFilter !== 'all' && s.brand !== brandFilter) return false;
        if (q && !(s.name.toLowerCase().includes(q) || s.brand.toLowerCase().includes(q) || (s.color || s.hex).toLowerCase().includes(q))) return false;
        return true;
    });

    listEl.innerHTML = filtered.slice(0, 120).map(s => {
        const owned = isSpoolOwned(s.id);
        const safeId = window.safeEscapeHtml(s.id);
        const safeColor = /^#[0-9a-f]{6}$/i.test(s.color || s.hex) ? (s.color || s.hex) : '#38bdf8';
        return `<div class="spool-rack-item ${owned ? 'owned' : ''}" onclick="onToggleRackSpool('${safeId}')">
            <span class="spool-rack-dot" style="background:${safeColor};"></span>
            <div style="flex:1;min-width:0;">
                <div style="font-size:0.78rem;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${window.safeEscapeHtml(s.name)}</div>
                <div style="font-size:0.68rem;color:#94a3b8;">${window.safeEscapeHtml(s.brand)} • ${safeColor.toUpperCase()} • TD ${s.td}mm</div>
            </div>
            <span style="font-size:0.95rem;">${owned ? '⭐' : '☆'}</span>
        </div>`;
    }).join('') || `<div style="padding:18px;text-align:center;color:#94a3b8;font-size:0.8rem;">No spools match filter.</div>`;
}

function onToggleRackSpool(id) {
    toggleOwnedSpool(id);
    renderSpoolRackList();
    renderFilamentStackUI();
}

function addManualCustomSpool() {
    const brand = document.getElementById('rack-add-brand')?.value.trim() || 'Custom';
    const name = document.getElementById('rack-add-name')?.value.trim();
    const hex = document.getElementById('rack-add-hex')?.value || '#38bdf8';
    const td = parseFloat(document.getElementById('rack-add-td')?.value) || 2.5;
    if (!name) {
        showToast(currentLang === 'fr' ? 'Entrez un nom de bobine.' : 'Enter a spool name.');
        return;
    }
    addCustomSpoolToRack({ brand, name, hex, td, markOwned: true });
    const nameEl = document.getElementById('rack-add-name');
    if (nameEl) nameEl.value = '';
    renderSpoolRackList();
    renderFilamentStackUI();
    showToast(`⭐ ${brand} ${name} (TD ${td}mm) added!`);
}

function handleSpoolRackImportFile(event) {
    const file = event.target?.files?.[0];
    if (!file) return;
    if (event.target) event.target.value = '';
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const res = importSpoolRackFromText(e.target.result);
            renderSpoolRackList();
            renderFilamentStackUI();
            showToast(`📥 Imported ${res.imported} spool(s) (.hfp / JSON / CSV)!`);
        } catch (err) {
            showToast('⚠️ Invalid spool file (.hfp / .json / .csv)');
        }
    };
    reader.readAsText(file);
}

function downloadSpoolRackBackup() {
    const json = exportSpoolRackJSON();
    downloadFileDirect(new Blob([json], { type: 'application/json' }), `StudiosPro_My_Spool_Rack_${Date.now()}.json`);
    showToast('💾 My Spool Rack exported!');
}

function toggleOwnSpoolsOnly(checked) {
    config.ownSpoolsOnly = !!checked;
}

