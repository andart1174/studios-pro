// ==========================================
// 🚀 PRO TOOLS: 3D QR CODE STAMPER, BATCH NAME 3MF GENERATOR,
// 360° TURNTABLE VIDEO EXPORTER & .SP3MF PROJECT SAVE/LOAD
// ==========================================

let isQRStampingMode = false;
let pendingQRConfig = {
    text: 'https://studios-pro.com',
    mode: 'inlay',
    fgSlot: 2,
    bgSlot: 0,
    includeBackplate: true,
    size: 20,
    depth: 0.8,
    rotation: 0,
    wrap: 'flat'
};

let isBatchPlacementMode = false;
let pendingBatchConfig = {
    names: ['ALEX', 'MARIA', 'DAVID'],
    sampleName: 'ALEX',
    mode: 'emboss',
    slot: 1,
    size: 7,
    depth: 1.0,
    rotation: 0,
    wrap: 'flat',
    font: 'Outfit, Inter, sans-serif'
};
let capturedBatchHit = null;
let capturedBatchCamQuat = null;
let isRecordingTurntable = false;

// ==========================================
// 📱 PURE-JS ISO/IEC 18004 QR CODE ENCODER (BYTE MODE, ECC-L, VERSIONS 1..6)
// ==========================================
const QR_GF_EXP = new Uint8Array(512);
const QR_GF_LOG = new Uint8Array(256);
(function initQrGalois() {
    let x = 1;
    for (let i = 0; i < 255; i++) {
        QR_GF_EXP[i] = x;
        QR_GF_LOG[x] = i;
        x <<= 1;
        if (x & 0x100) x ^= 0x11D;
    }
    for (let i = 255; i < 512; i++) QR_GF_EXP[i] = QR_GF_EXP[i - 255];
})();

function qrGfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return QR_GF_EXP[QR_GF_LOG[a] + QR_GF_LOG[b]];
}

function qrRsGeneratorPoly(ecLen) {
    let poly = [1];
    for (let i = 0; i < ecLen; i++) {
        const next = new Array(poly.length + 1).fill(0);
        const factor = QR_GF_EXP[i];
        for (let j = 0; j < poly.length; j++) {
            next[j] ^= poly[j];
            next[j + 1] ^= qrGfMul(poly[j], factor);
        }
        poly = next;
    }
    return poly;
}

function qrRsRemainder(dataBytes, ecLen) {
    const gen = qrRsGeneratorPoly(ecLen);
    const buf = new Uint8Array(dataBytes.length + ecLen);
    buf.set(dataBytes, 0);
    for (let i = 0; i < dataBytes.length; i++) {
        const coef = buf[i];
        if (coef !== 0) {
            for (let j = 0; j < gen.length; j++) {
                buf[i + j] ^= qrGfMul(gen[j], coef);
            }
        }
    }
    return buf.slice(dataBytes.length);
}

// Version specs for ECC-L (1..6, Byte mode capacity up to 134 bytes)
const QR_SPECS_L = [
    null,
    { ver: 1, size: 21, dataCodewords: 19,  ecPerBlock: 7,  blocks: 1, align: [] },
    { ver: 2, size: 25, dataCodewords: 34,  ecPerBlock: 10, blocks: 1, align: [6, 18] },
    { ver: 3, size: 29, dataCodewords: 55,  ecPerBlock: 15, blocks: 1, align: [6, 22] },
    { ver: 4, size: 33, dataCodewords: 80,  ecPerBlock: 20, blocks: 1, align: [6, 26] },
    { ver: 5, size: 37, dataCodewords: 108, ecPerBlock: 26, blocks: 1, align: [6, 30] },
    { ver: 6, size: 41, dataCodewords: 136, ecPerBlock: 18, blocks: 2, align: [6, 34] }
];

function generateQRMatrix(text) {
    const bytes = Array.from(new TextEncoder().encode(String(text || 'https://studios-pro.com'))).slice(0, 130);
    let spec = null;
    for (let v = 1; v <= 6; v++) {
        // Byte mode header: 4 bits mode + 8 bits len + bytes*8 + 4 bits terminator <= dataCodewords*8
        if (bytes.length + 2 <= QR_SPECS_L[v].dataCodewords) {
            spec = QR_SPECS_L[v];
            break;
        }
    }
    if (!spec) spec = QR_SPECS_L[6];

    // Encode bit stream
    const bits = [];
    const pushBits = (val, len) => {
        for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
    };
    pushBits(0b0100, 4); // Byte mode
    pushBits(bytes.length, 8);
    bytes.forEach(b => pushBits(b, 8));

    const maxBits = spec.dataCodewords * 8;
    for (let i = 0; i < 4 && bits.length < maxBits; i++) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);

    const dataCW = [];
    for (let i = 0; i < bits.length; i += 8) {
        let b = 0;
        for (let k = 0; k < 8; k++) b = (b << 1) | bits[i + k];
        dataCW.push(b);
    }
    const padBytes = [0xEC, 0x11];
    let pi = 0;
    while (dataCW.length < spec.dataCodewords) {
        dataCW.push(padBytes[pi++ & 1]);
    }

    // Split into blocks & interleave RS error correction codewords
    const blockSize = Math.floor(spec.dataCodewords / spec.blocks);
    const dataBlocks = [];
    const ecBlocks = [];
    let offset = 0;
    for (let b = 0; b < spec.blocks; b++) {
        const blk = dataCW.slice(offset, offset + blockSize);
        offset += blockSize;
        dataBlocks.push(blk);
        ecBlocks.push(qrRsRemainder(blk, spec.ecPerBlock));
    }

    const finalCW = [];
    for (let i = 0; i < blockSize; i++) {
        for (let b = 0; b < spec.blocks; b++) finalCW.push(dataBlocks[b][i]);
    }
    for (let i = 0; i < spec.ecPerBlock; i++) {
        for (let b = 0; b < spec.blocks; b++) finalCW.push(ecBlocks[b][i]);
    }

    const N = spec.size;
    const mat = Array.from({ length: N }, () => new Int8Array(N));       // 0/1
    const isFunc = Array.from({ length: N }, () => new Uint8Array(N));   // 1 = reserved function module

    const setFunc = (r, c, dark) => {
        if (r < 0 || r >= N || c < 0 || c >= N) return;
        mat[r][c] = dark ? 1 : 0;
        isFunc[r][c] = 1;
    };

    // Finder patterns + separators
    const drawFinder = (r0, c0) => {
        for (let dr = -1; dr <= 7; dr++) {
            for (let dc = -1; dc <= 7; dc++) {
                const r = r0 + dr, c = c0 + dc;
                if (r < 0 || r >= N || c < 0 || c >= N) continue;
                const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
                const onBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
                const inCore = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
                setFunc(r, c, inOuter && (onBorder || inCore));
            }
        }
    };
    drawFinder(0, 0);
    drawFinder(0, N - 7);
    drawFinder(N - 7, 0);

    // Alignment patterns
    const aligns = spec.align;
    for (let i = 0; i < aligns.length; i++) {
        for (let j = 0; j < aligns.length; j++) {
            const r = aligns[i], c = aligns[j];
            if (isFunc[r][c]) continue;
            for (let dr = -2; dr <= 2; dr++) {
                for (let dc = -2; dc <= 2; dc++) {
                    const dark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
                    setFunc(r + dr, c + dc, dark);
                }
            }
        }
    }

    // Timing patterns
    for (let i = 8; i < N - 8; i++) {
        if (!isFunc[6][i]) setFunc(6, i, i % 2 === 0);
        if (!isFunc[i][6]) setFunc(i, 6, i % 2 === 0);
    }

    // Dark module + reserve format info areas
    setFunc(N - 8, 8, true);
    for (let i = 0; i <= 8; i++) {
        if (!isFunc[8][i]) isFunc[8][i] = 1;
        if (!isFunc[i][8]) isFunc[i][8] = 1;
    }
    for (let i = N - 8; i < N; i++) {
        if (!isFunc[8][i]) isFunc[8][i] = 1;
        if (!isFunc[i][8]) isFunc[i][8] = 1;
    }

    // Place data bits in standard right-to-left zig-zag columns
    const stream = [];
    finalCW.forEach(cw => {
        for (let b = 7; b >= 0; b--) stream.push((cw >> b) & 1);
    });
    let bitIdx = 0;
    let upward = true;
    for (let col = N - 1; col >= 1; col -= 2) {
        if (col === 6) col--;
        for (let step = 0; step < N; step++) {
            const row = upward ? (N - 1 - step) : step;
            for (let dc = 0; dc < 2; dc++) {
                const c = col - dc;
                if (!isFunc[row][c]) {
                    const bit = bitIdx < stream.length ? stream[bitIdx++] : 0;
                    // Apply Mask 0: (row + col) % 2 === 0 (clean checkerboard mask)
                    mat[row][c] = bit ^ (((row + c) % 2 === 0) ? 1 : 0);
                }
            }
        }
        upward = !upward;
    }

    // Write Format Info for ECC-L (01) + Mask 0 (000) -> 5-bit data = 01000
    // Precomputed BCH(15,5) + XOR 0x5412 for ECC-L Mask 0: 0x77C4 (111011111000100)
    const fmtBits = 0x77C4;
    for (let i = 0; i < 15; i++) {
        const bit = (fmtBits >> i) & 1;
        // Around top-left finder
        if (i < 6) mat[i][8] = bit;
        else if (i < 8) mat[i + 1][8] = bit;
        else mat[N - 15 + i][8] = bit;

        if (i < 8) mat[8][N - 1 - i] = bit;
        else if (i < 9) mat[8][15 - i] = bit;
        else mat[8][14 - i] = bit;
    }

    return { size: N, matrix: mat };
}

function buildQRMaskAndPreview(cfg) {
    const qr = generateQRMatrix(cfg.text);
    const N = qr.size;
    const quiet = 2; // 2-module quiet zone border for reliable scanning
    const totalMods = N + quiet * 2;
    const pxPerMod = 2;
    const S = totalMods * pxPerMod;

    const fgMask = new Uint8Array(S * S);
    const bgMask = new Uint8Array(S * S);
    bgMask.fill(1);

    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            if (qr.matrix[r][c] === 1) {
                for (let dy = 0; dy < pxPerMod; dy++) {
                    for (let dx = 0; dx < pxPerMod; dx++) {
                        const px = (c + quiet) * pxPerMod + dx;
                        const py = (r + quiet) * pxPerMod + dy;
                        fgMask[py * S + px] = 1;
                    }
                }
            }
        }
    }

    const fgHex = (filamentSlots[cfg.fgSlot] && filamentSlots[cfg.fgSlot].color) || '#111827';
    const bgHex = (filamentSlots[cfg.bgSlot] && filamentSlots[cfg.bgSlot].color) || '#FFFFFF';

    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = S * 2;
    previewCanvas.height = S * 2;
    const pCtx = previewCanvas.getContext('2d');
    pCtx.scale(2, 2);
    if (cfg.includeBackplate) {
        pCtx.fillStyle = bgHex;
        pCtx.fillRect(0, 0, S, S);
    }
    pCtx.fillStyle = fgHex;
    for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
            if (fgMask[y * S + x]) pCtx.fillRect(x, y, 1, 1);
        }
    }
    pCtx.strokeStyle = '#38bdf8';
    pCtx.lineWidth = 1;
    pCtx.strokeRect(0.5, 0.5, S - 1, S - 1);

    return { fgMask, bgMask, S, previewCanvas, modules: N };
}

function openQRBatchModal(initialTab = 'qr') {
    if (!currentMesh) { showToast(t('aiNoModel', 'Load a 3D model first.')); return; }
    if (typeof cancelStampingMode === 'function') cancelStampingMode(true);
    populateSlotDropdowns();
    switchQRBatchTab(initialTab);
    updateQRModalPreview();
    document.getElementById('qr-batch-modal').style.display = 'flex';
    refreshIcons();
}

function closeQRBatchModal() {
    document.getElementById('qr-batch-modal').style.display = 'none';
}

function switchQRBatchTab(tab) {
    const isQR = (tab !== 'batch');
    const pQR = document.getElementById('panel-tab-qr');
    const pBatch = document.getElementById('panel-tab-batch');
    const bQR = document.getElementById('btn-tab-qr');
    const bBatch = document.getElementById('btn-tab-batch');
    if (pQR) pQR.style.display = isQR ? 'block' : 'none';
    if (pBatch) pBatch.style.display = isQR ? 'none' : 'block';
    if (bQR) bQR.classList.toggle('active', isQR);
    if (bBatch) bBatch.classList.toggle('active', !isQR);
}

function updateQRModalPreview() {
    const canvas = document.getElementById('qr-modal-preview');
    if (!canvas) return;
    const text = document.getElementById('qr-content-input')?.value || 'https://studios-pro.com';
    const fgSlot = parseSlotSelectSafe('qr-fg-slot', Math.min(2, filamentSlots.length - 1));
    const bgSlot = parseSlotSelectSafe('qr-bg-slot', 0);
    const includeBackplate = document.getElementById('qr-include-backplate')?.checked !== false;
    const res = buildQRMaskAndPreview({ text, fgSlot, bgSlot, includeBackplate });
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(res.previewCanvas, 0, 0, canvas.width, canvas.height);
}

function startQRStampingMode() {
    const text = (document.getElementById('qr-content-input')?.value || '').trim() || 'https://studios-pro.com';
    const mode = document.getElementById('qr-stamp-mode')?.value || 'inlay';
    const fgSlot = parseSlotSelectSafe('qr-fg-slot', Math.min(2, filamentSlots.length - 1));
    const bgSlot = parseSlotSelectSafe('qr-bg-slot', 0);
    const includeBackplate = document.getElementById('qr-include-backplate')?.checked !== false;
    const size = parseFloat(document.getElementById('slider-qr-size')?.value) || 20;
    const depth = parseFloat(document.getElementById('slider-qr-depth')?.value) || 0.8;

    pendingQRConfig = { text, mode, fgSlot, bgSlot, includeBackplate, size, depth, rotation: 0, wrap: 'flat' };
    closeQRBatchModal();

    isTextStampingMode = false;
    isStencilStampingMode = false;
    isBatchPlacementMode = false;
    isQRStampingMode = true;

    const built = buildQRMaskAndPreview(pendingQRConfig);
    buildStampGhostFromCanvas(built.previewCanvas, size, size, 'qr');

    controls.enabled = true;
    if (controls.mouseButtons) controls.mouseButtons.LEFT = null;
    if (controls.touches && typeof THREE.TOUCH !== 'undefined') controls.touches.ONE = null;
    document.getElementById('viewport-container').style.cursor = 'crosshair';
    showToast(currentLang === 'fr' ? "Cliquez sur une surface plane pour placer votre QR Code 3D !" : "Click on a flat surface to stamp your 3D QR Code!");
}

function applyQRStampAtHit(hit) {
    isQRStampingMode = false;
    clearStampGhost();
    selectTool(activeTool);
    if (!hit || !currentMesh || !triangleColors) return;

    const built = buildQRMaskAndPreview(pendingQRConfig);
    const sz = pendingQRConfig.size || 20;

    // Optional quiet-zone backing plate first (slightly recessed behind FG modules so zero Z-fighting!)
    if (pendingQRConfig.includeBackplate && pendingQRConfig.mode !== 'engrave') {
        const bgDepth = pendingQRConfig.mode === 'inlay' ? 0.01 : Math.max(0.3, (pendingQRConfig.depth || 0.8) * 0.45);
        applyBinaryMaskStampToSurface(built.bgMask, built.S, built.S, sz, sz, {
            mode: pendingQRConfig.mode === 'surface' ? 'surface' : 'emboss',
            slot: pendingQRConfig.bgSlot,
            depth: bgDepth,
            rotation: pendingQRConfig.rotation || 0,
            wrap: pendingQRConfig.wrap || 'flat',
            skipHistoryCommit: true,
            suppressToast: true
        }, hit, null);
    }

    const ok = applyBinaryMaskStampToSurface(built.fgMask, built.S, built.S, sz, sz, {
        mode: pendingQRConfig.mode,
        slot: pendingQRConfig.fgSlot,
        depth: pendingQRConfig.depth || 0.8,
        rotation: pendingQRConfig.rotation || 0,
        wrap: pendingQRConfig.wrap || 'flat',
        skipHistoryCommit: true,
        suppressToast: true
    }, hit, null);

    if (ok) {
        commitHistory(true);
        showToast(currentLang === 'fr' ? "QR Code 3D scannable estampé avec succès !" : "Scannable 3D QR Code stamped successfully!");
    }
}

// ==========================================
// 🏷️ #8 BATCH PERSONALIZED NAME GENERATOR (CSV / LINES -> ZIP OF .3MF FILES!)
// ==========================================
function startBatchAnchorPlacement() {
    const rawNames = (document.getElementById('batch-names-input')?.value || '')
        .split(/\r?\n|,|;/)
        .map(s => s.trim())
        .filter(Boolean)
        .slice(0, 50);

    if (rawNames.length === 0) {
        showToast(currentLang === 'fr' ? "Entrez au moins un prénom/texte !" : "Enter at least one name first!");
        return;
    }

    const mode = document.getElementById('batch-stamp-mode')?.value || 'emboss';
    const slot = parseSlotSelectSafe('batch-color-slot', activeSlotIndex);
    const size = parseFloat(document.getElementById('slider-batch-size')?.value) || 7;
    const depth = parseFloat(document.getElementById('slider-batch-depth')?.value) || 1.0;
    const font = document.getElementById('batch-stamp-font')?.value || 'Outfit, Inter, sans-serif';
    const hex = (filamentSlots[slot] && filamentSlots[slot].color) || '#38bdf8';

    pendingBatchConfig = {
        names: rawNames,
        sampleName: rawNames[0],
        mode, slot, size, depth, rotation: 0, wrap: 'conformal', font, hex
    };

    closeQRBatchModal();
    isTextStampingMode = false;
    isStencilStampingMode = false;
    isQRStampingMode = false;
    isBatchPlacementMode = true;

    const rendered = renderTextToBitmapCanvas({ ...pendingBatchConfig, text: rawNames[0] });
    buildStampGhostFromCanvas(rendered.previewCanvas, rendered.physW, rendered.physH, 'batch');

    controls.enabled = true;
    if (controls.mouseButtons) controls.mouseButtons.LEFT = null;
    document.getElementById('viewport-container').style.cursor = 'crosshair';
    showToast(currentLang === 'fr'
        ? `Cliquez sur le modèle pour placer le lot de ${rawNames.length} prénoms (Q/E pivoter, +/- taille) !`
        : `Click on the model to anchor all ${rawNames.length} batch names (Q/E rotate, +/- scale)!`);
}

function captureBatchAnchorAtHit(hit) {
    isBatchPlacementMode = false;
    clearStampGhost();
    selectTool(activeTool);
    if (!hit || !currentMesh) return;

    capturedBatchHit = {
        point: hit.point.clone(),
        face: hit.face ? { normal: hit.face.normal.clone() } : { normal: new THREE.Vector3(0, 0, 1) }
    };
    capturedBatchCamQuat = camera ? camera.quaternion.clone() : new THREE.Quaternion();

    const statusEl = document.getElementById('batch-anchor-status');
    if (statusEl) {
        statusEl.textContent = currentLang === 'fr'
            ? `✅ Position ancrée (${pendingBatchConfig.names.length} modèles prêts — ${pendingBatchConfig.size}mm, ${pendingBatchConfig.rotation}°)`
            : `✅ Anchor locked (${pendingBatchConfig.names.length} models ready — ${pendingBatchConfig.size}mm, ${pendingBatchConfig.rotation}°)`;
    }
    const genBtn = document.getElementById('btn-generate-batch-zip');
    if (genBtn) genBtn.disabled = false;

    openQRBatchModal('batch');
    showToast(currentLang === 'fr' ? "Position ancrée ! Cliquez sur 'Générer le ZIP .3MF'." : "Anchor locked! Click 'Generate Batch .3MF ZIP'.");
}

async function executeBatchName3MFExport() {
    if (!currentMesh || !capturedBatchHit || !pendingBatchConfig.names.length) {
        showToast(currentLang === 'fr' ? "Placez d'abord la position d'ancrage sur le modèle !" : "Place the anchor position on the model first!");
        return;
    }

    const names = pendingBatchConfig.names;
    const basePos = new Float32Array(currentMesh.geometry.attributes.position.array);
    const baseColors = new Uint8Array(triangleColors);
    const savedCamQuat = camera.quaternion.clone();

    showToast(currentLang === 'fr'
        ? `Génération du lot de ${names.length} fichiers .3mf...`
        : `Generating batch of ${names.length} personalized .3mf files...`);

    const zip = new JSZip();
    const restoreBase = () => {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(basePos), 3));
        g.computeVertexNormals();
        g.computeBoundingBox();
        if (g.computeBoundsTree) g.computeBoundsTree();
        if (currentMesh.geometry.disposeBoundsTree) currentMesh.geometry.disposeBoundsTree();
        currentMesh.geometry.dispose();
        currentMesh.geometry = g;
        triangleColors = new Uint8Array(baseColors);
        spatialGrid = new SpatialGrid(g, 32);
        meshTopology = buildMeshTopology(g);
    };

    try {
        // Temporarily align camera quaternion to captured anchor orientation for identical text basis
        if (capturedBatchCamQuat) camera.quaternion.copy(capturedBatchCamQuat);

        for (let i = 0; i < names.length; i++) {
            const label = names[i];
            restoreBase();
            const rendered = renderTextToBitmapCanvas({ ...pendingBatchConfig, text: label });
            applyBinaryMaskStampToSurface(
                rendered.maskBits, rendered.W, rendered.H, rendered.physW, rendered.physH,
                { ...pendingBatchConfig, skipHistoryCommit: true, suppressToast: true },
                capturedBatchHit, null
            );
            const blob = await buildBambu3MFBlob(currentMesh.geometry, triangleColors, filamentSlots);
            const safeName = label.replace(/[^\w\-]+/g, '_').slice(0, 32) || `Item_${i + 1}`;
            zip.file(`${String(i + 1).padStart(2, '0')}_${safeName}.3mf`, blob);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(zipBlob, `StudiosPro_Batch_${names.length}_Models.zip`);
        closeQRBatchModal();
        showToast(currentLang === 'fr'
            ? `✅ Lot de ${names.length} fichiers .3mf téléchargé !`
            : `✅ Batch ZIP with ${names.length} personalized .3mf files downloaded!`);
    } finally {
        camera.quaternion.copy(savedCamQuat);
        restoreBase();
        precomputeGeometryMetrics(currentMesh.geometry);
        updateMeshVisualColors();
    }
}

// ==========================================
// 🎬 #12 360° TURNTABLE SHOWCASE VIDEO EXPORTER (WEBM)
// ==========================================
function exportTurntableVideo() {
    if (!renderer || !scene || !camera || !controls || !currentMesh) {
        showToast(t('aiNoModel', 'Load a 3D model first.'));
        return;
    }
    if (isRecordingTurntable) return;
    if (typeof MediaRecorder === 'undefined' || !renderer.domElement.captureStream) {
        showToast(currentLang === 'fr'
            ? "Enregistrement vidéo non supporté — téléchargement d'une photo HD à la place."
            : "Video recording unsupported in this browser — saving HD PNG snapshot instead.");
        if (typeof downloadShareSnapshot === 'function') downloadShareSnapshot();
        return;
    }

    isRecordingTurntable = true;
    const prevRingVis = brushHelperRing ? brushHelperRing.visible : false;
    if (brushHelperRing) brushHelperRing.visible = false;
    const prevCamPos = camera.position.clone();
    const target = controls.target.clone();
    const startOffset = prevCamPos.clone().sub(target);

    const stream = renderer.domElement.captureStream(30);
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : (MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : '');
    const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    const chunks = [];
    recorder.ondataavailable = (ev) => { if (ev.data && ev.data.size > 0) chunks.push(ev.data); };
    recorder.onstop = () => {
        isRecordingTurntable = false;
        camera.position.copy(prevCamPos);
        controls.target.copy(target);
        controls.update();
        if (brushHelperRing) brushHelperRing.visible = prevRingVis;
        const blob = new Blob(chunks, { type: mime || 'video/webm' });
        downloadBlob(blob, 'StudiosPro_360_Turntable.webm');
        showToast(currentLang === 'fr' ? "🎬 Vidéo 360° Turntable exportée (.webm) !" : "🎬 360° Turntable Showcase video exported (.webm)!");
    };

    showToast(currentLang === 'fr' ? "🎬 Enregistrement 360° en cours (4s)..." : "🎬 Recording 360° Turntable (4s)...");
    closeShareDesignModal();
    recorder.start();

    const totalFrames = 120;
    let frame = 0;
    const upAxis = new THREE.Vector3(0, 1, 0);

    function stepTurn() {
        if (frame >= totalFrames) {
            recorder.stop();
            return;
        }
        const angle = (frame / totalFrames) * Math.PI * 2;
        const rotOffset = startOffset.clone().applyAxisAngle(upAxis, angle);
        camera.position.copy(target).add(rotOffset);
        camera.lookAt(target);
        renderer.render(scene, camera);
        frame++;
        requestAnimationFrame(stepTurn);
    }
    requestAnimationFrame(stepTurn);
}

// ==========================================
// 💾 #12 SAVE / LOAD EDITABLE PROJECT FILE (.SP3MF)
// ==========================================
async function exportEditableProjectFile() {
    if (!currentMesh || !currentMesh.geometry || !triangleColors) {
        showToast(t('aiNoModel', 'Load a 3D model first.'));
        return;
    }
    const posArr = currentMesh.geometry.attributes.position.array;
    const meta = {
        format: 'studios-pro-painter-project',
        version: 3,
        savedAt: Date.now(),
        modelTitle: typeof currentModelTitle !== 'undefined' ? currentModelTitle : 'StudiosPro_Model',
        filamentSlots: filamentSlots.map(s => ({ id: s.id, name: s.name, color: s.color, hex: s.color, type: s.type || 'PLA Basic' })),
        activeSlotIndex,
        cameraPos: camera ? [camera.position.x, camera.position.y, camera.position.z] : null,
        cameraTarget: controls ? [controls.target.x, controls.target.y, controls.target.z] : null
    };
    const zip = new JSZip();
    zip.file('project.json', JSON.stringify(meta, null, 2));
    zip.file('positions.bin', new Uint8Array(posArr.buffer, posArr.byteOffset, posArr.byteLength));
    zip.file('colors.bin', new Uint8Array(triangleColors.buffer, triangleColors.byteOffset, triangleColors.byteLength));
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const safeTitle = String(meta.modelTitle || 'Project').replace(/[^\w\-]+/g, '_');
    downloadBlob(blob, `${safeTitle}.sp3mf`);
    showToast(currentLang === 'fr' ? "Projet éditable sauvegardé (.sp3mf) !" : "Editable project saved (.sp3mf)!");
}

async function importEditableProjectFile(e) {
    const file = e.target && e.target.files && e.target.files[0];
    if (!file) return;
    try {
        const buf = await file.arrayBuffer();
        const zip = await new JSZip().loadAsync(buf);
        const metaEntry = zip.file('project.json');
        const posEntry = zip.file('positions.bin');
        const colEntry = zip.file('colors.bin');
        if (!metaEntry || !posEntry || !colEntry) {
            showToast(currentLang === 'fr' ? "Fichier projet .sp3mf invalide." : "Invalid .sp3mf project file.");
            return;
        }
        const meta = JSON.parse(await metaEntry.async('text'));
        const posBuf = await posEntry.async('arraybuffer');
        const colBuf = await colEntry.async('arraybuffer');

        if (Array.isArray(meta.filamentSlots) && meta.filamentSlots.length >= 2) {
            filamentSlots = meta.filamentSlots.map((s, idx) => ({
                id: idx + 1,
                name: s.name || `Slot #${idx + 1}`,
                color: normalizeHex(s.color || s.hex),
                hex: normalizeHex(s.color || s.hex),
                type: s.type || 'PLA Basic'
            }));
            activeSlotIndex = Math.min(filamentSlots.length - 1, meta.activeSlotIndex || 0);
            refreshSlotRgbFloats();
            renderFilamentGrid();
        }

        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(posBuf), 3));
        const restoredColors = new Uint8Array(colBuf);
        if (typeof currentModelTitle !== 'undefined') currentModelTitle = meta.modelTitle || file.name;
        setLoadedGeometry(geom, restoredColors, null, true);

        if (meta.cameraPos && camera && controls) {
            camera.position.set(meta.cameraPos[0], meta.cameraPos[1], meta.cameraPos[2]);
            if (meta.cameraTarget) controls.target.set(meta.cameraTarget[0], meta.cameraTarget[1], meta.cameraTarget[2]);
            controls.update();
        }
        showToast(currentLang === 'fr' ? `Projet chargé : ${file.name}` : `Project loaded: ${file.name}`);
    } catch (err) {
        console.error(err);
        showToast(currentLang === 'fr' ? "Erreur de lecture du projet .sp3mf." : "Failed to load .sp3mf project.");
    }
    e.target.value = '';
}
