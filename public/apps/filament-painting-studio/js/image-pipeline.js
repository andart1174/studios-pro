// ==========================================
// 3. IMAGE UPLOAD, SMART CROP, TD OPTICAL PHYSICS & SAMPLE ENGINE
// ==========================================

let _uploadRequestSeq = 0;

// Precomputed sRGB [0..255] -> Linear [0..1] lookup table (IEC 61966-2-1)
const SRGB_TO_LIN_LUT = new Float32Array(256);
for (let i = 0; i < 256; i++) {
    const s = i / 255;
    SRGB_TO_LIN_LUT[i] = s <= 0.04045 ? (s / 12.92) : Math.pow((s + 0.055) / 1.055, 2.4);
}

function srgbToLinear(c255) {
    return SRGB_TO_LIN_LUT[Math.max(0, Math.min(255, c255 | 0))];
}

function linearToSrgb255(lin) {
    const v = Math.max(0, Math.min(1, lin));
    const s = v <= 0.0031308 ? (v * 12.92) : (1.055 * Math.pow(v, 1 / 2.4) - 0.055);
    return Math.round(Math.max(0, Math.min(1, s)) * 255);
}

function hexToRgb(hex) {
    let clean = String(hex || '#000000').replace('#', '').trim();
    if (clean.length === 3) {
        clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
    }
    const v = parseInt(clean, 16);
    if (!isFinite(v)) return [0, 0, 0];
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function rgbToHex(r, g, b) {
    const cr = Math.max(0, Math.min(255, Math.round(r)));
    const cg = Math.max(0, Math.min(255, Math.round(g)));
    const cb = Math.max(0, Math.min(255, Math.round(b)));
    return '#' + ((1 << 24) | (cr << 16) | (cg << 8) | cb).toString(16).slice(1);
}

// Perceptual CIELAB & CIEDE2000 (ΔE2000) Color Science
function rgbToLab(r, g, b) {
    const lr = SRGB_TO_LIN_LUT[Math.max(0, Math.min(255, r | 0))];
    const lg = SRGB_TO_LIN_LUT[Math.max(0, Math.min(255, g | 0))];
    const lb = SRGB_TO_LIN_LUT[Math.max(0, Math.min(255, b | 0))];
    const x = (lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375) / 0.95047;
    const y = (lr * 0.2126729 + lg * 0.7151522 + lb * 0.0721750);
    const z = (lr * 0.0193339 + lg * 0.1191920 + lb * 0.9503041) / 1.08883;
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : (7.787 * t + 16 / 116));
    const fx = f(x), fy = f(y), fz = f(z);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function deltaE2000(lab1, lab2) {
    const L1 = lab1[0], a1 = lab1[1], b1 = lab1[2];
    const L2 = lab2[0], a2 = lab2[1], b2 = lab2[2];
    const C1 = Math.sqrt(a1 * a1 + b1 * b1);
    const C2 = Math.sqrt(a2 * a2 + b2 * b2);
    const Cbar = (C1 + C2) * 0.5;
    const Cbar7 = Math.pow(Cbar, 7);
    const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + 6103515625)));
    const a1p = (1 + G) * a1;
    const a2p = (1 + G) * a2;
    const C1p = Math.sqrt(a1p * a1p + b1 * b1);
    const C2p = Math.sqrt(a2p * a2p + b2 * b2);
    const h1p = (C1p === 0) ? 0 : ((Math.atan2(b1, a1p) * 180 / Math.PI) + 360) % 360;
    const h2p = (C2p === 0) ? 0 : ((Math.atan2(b2, a2p) * 180 / Math.PI) + 360) % 360;

    const dLp = L2 - L1;
    const dCp = C2p - C1p;
    let dhp = 0;
    if (C1p * C2p !== 0) {
        const diff = h2p - h1p;
        if (Math.abs(diff) <= 180) dhp = diff;
        else if (diff > 180) dhp = diff - 360;
        else dhp = diff + 360;
    }
    const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp * Math.PI / 180) * 0.5);

    const Lpbar = (L1 + L2) * 0.5;
    const Cpbar = (C1p + C2p) * 0.5;
    let Hpbar = h1p + h2p;
    if (C1p * C2p !== 0) {
        if (Math.abs(h1p - h2p) <= 180) Hpbar = (h1p + h2p) * 0.5;
        else if (h1p + h2p < 360) Hpbar = (h1p + h2p + 360) * 0.5;
        else Hpbar = (h1p + h2p - 360) * 0.5;
    }

    const rad = Math.PI / 180;
    const T = 1
        - 0.17 * Math.cos((Hpbar - 30) * rad)
        + 0.24 * Math.cos((2 * Hpbar) * rad)
        + 0.32 * Math.cos((3 * Hpbar + 6) * rad)
        - 0.20 * Math.cos((4 * Hpbar - 63) * rad);

    const dTheta = 30 * Math.exp(-Math.pow((Hpbar - 275) / 25, 2));
    const Cpbar7 = Math.pow(Cpbar, 7);
    const RC = 2 * Math.sqrt(Cpbar7 / (Cpbar7 + 6103515625));
    const Lp50sq = (Lpbar - 50) * (Lpbar - 50);
    const SL = 1 + (0.015 * Lp50sq) / Math.sqrt(20 + Lp50sq);
    const SC = 1 + 0.045 * Cpbar;
    const SH = 1 + 0.015 * Cpbar * T;
    const RT = -Math.sin(2 * dTheta * rad) * RC;

    const termL = dLp / SL;
    const termC = dCp / SC;
    const termH = dHp / SH;
    return Math.sqrt(termL * termL + termC * termC + termH * termH + RT * termC * termH);
}

// ==========================================
// UPLOAD & SMART CROP / ASPECT PRESETS
// ==========================================

function setupDropzone() {
    const dz = document.getElementById('dropzone');
    if (!dz) return;
    dz.addEventListener('dragover', (e) => {
        e.preventDefault();
        dz.classList.add('dragover');
    });
    dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
    dz.addEventListener('drop', (e) => {
        e.preventDefault();
        dz.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            loadUploadedFile(e.dataTransfer.files[0]);
        }
    });
}

function handleFileSelect(e) {
    const file = e && e.target && e.target.files ? e.target.files[0] : null;
    if (file) loadUploadedFile(file);
    if (e && e.target) e.target.value = ''; // Allow re-uploading same file cleanly
}

function syncSourceCanvasFromImage(img) {
    if (!img) return;
    const natW = img.naturalWidth || img.width || 512;
    const natH = img.naturalHeight || img.height || 512;
    const maxStore = 1024;
    const scale = Math.min(1, maxStore / Math.max(natW, natH));
    sourceCanvas.width = Math.max(1, Math.round(natW * scale));
    sourceCanvas.height = Math.max(1, Math.round(natH * scale));
    const sctx = sourceCanvas.getContext('2d');
    sctx.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);
    sctx.drawImage(img, 0, 0, sourceCanvas.width, sourceCanvas.height);
}

const ASPECT_PRESETS_MAP = {
    '1:1': { w: 140, h: 140 },
    '4:5': { w: 140, h: 175 },
    '3:4': { w: 135, h: 180 },
    '16:9': { w: 200, h: 112 },
    'a5': { w: 148, h: 210 },
    'a4': { w: 210, h: 297 },
    'a1mini': { w: 170, h: 170 },
    'x1c': { w: 240, h: 240 },
    'polaroid': { w: 100, h: 120 }
};

function applyAspectCropPreset(preset, skipRefresh = false) {
    config.aspectPreset = preset || 'auto';
    if (config.aspectPreset === 'auto' && sourceImage) {
        const isRot90 = ((config.rotation || 0) % 180 !== 0);
        const natW = isRot90 ? (sourceImage.naturalHeight || sourceImage.height || 1) : (sourceImage.naturalWidth || sourceImage.width || 1);
        const natH = isRot90 ? (sourceImage.naturalWidth || sourceImage.width || 1) : (sourceImage.naturalHeight || sourceImage.height || 1);
        const longest = Math.max(120, Math.min(240, Math.max(config.width || 140, config.height || 140)));
        if (natW >= natH) {
            config.width = Math.round(longest);
            config.height = Math.max(50, Math.round(longest * (natH / natW)));
        } else {
            config.height = Math.round(longest);
            config.width = Math.max(50, Math.round(longest * (natW / natH)));
        }
    } else if (ASPECT_PRESETS_MAP[config.aspectPreset]) {
        const p = ASPECT_PRESETS_MAP[config.aspectPreset];
        config.width = p.w;
        config.height = p.h;
    }

    const sel = document.getElementById('select-aspect-preset');
    if (sel) sel.value = config.aspectPreset;
    const inW = document.getElementById('input-width');
    const inH = document.getElementById('input-height');
    if (inW) inW.value = config.width;
    if (inH) inH.value = config.height;
    const polWrap = document.getElementById('polaroid-caption-wrap');
    if (polWrap) polWrap.style.display = (config.aspectPreset === 'polaroid') ? 'block' : 'none';

    if (!skipRefresh) {
        if (!isDrawingTemplateActive && sourceImage) {
            processSourceImage(false, true);
        }
        if (typeof updateEditorCanvasDisplaySize === 'function') updateEditorCanvasDisplaySize();
        if (typeof renderSplitCompareSource === 'function' && isSplitCompareMode) renderSplitCompareSource();
        requestMeshUpdate();
    }
}

function updateCropTransform() {
    const zEl = document.getElementById('slider-crop-zoom');
    const xEl = document.getElementById('slider-crop-panx');
    const yEl = document.getElementById('slider-crop-pany');
    const capEl = document.getElementById('input-polaroid-caption');
    if (zEl) {
        config.cropZoom = parseFloat(zEl.value) / 100;
        const vz = document.getElementById('val-crop-zoom');
        if (vz) vz.innerText = Math.round(config.cropZoom * 100) + '%';
    }
    if (xEl) {
        config.cropPanX = parseFloat(xEl.value) / 100;
        const vx = document.getElementById('val-crop-panx');
        if (vx) vx.innerText = Math.round(config.cropPanX * 100) + '%';
    }
    if (yEl) {
        config.cropPanY = parseFloat(yEl.value) / 100;
        const vy = document.getElementById('val-crop-pany');
        if (vy) vy.innerText = Math.round(config.cropPanY * 100) + '%';
    }
    if (capEl) config.polaroidCaption = capEl.value || '';

    if (!isDrawingTemplateActive && sourceImage) {
        processSourceImage(false, true);
        requestMeshUpdate();
    }
}

function resetCropTransform() {
    config.cropZoom = 1.0;
    config.cropPanX = 0.0;
    config.cropPanY = 0.0;
    const zEl = document.getElementById('slider-crop-zoom');
    const xEl = document.getElementById('slider-crop-panx');
    const yEl = document.getElementById('slider-crop-pany');
    if (zEl) zEl.value = 100;
    if (xEl) xEl.value = 0;
    if (yEl) yEl.value = 0;
    const vz = document.getElementById('val-crop-zoom');
    const vx = document.getElementById('val-crop-panx');
    const vy = document.getElementById('val-crop-pany');
    if (vz) vz.innerText = '100%';
    if (vx) vx.innerText = '0%';
    if (vy) vy.innerText = '0%';
    updateCropTransform();
}

function loadUploadedFile(file) {
    if (!file || !file.type || !file.type.startsWith('image/')) {
        showToast(translations[currentLang]?.toastInvalidImg || 'Please upload a valid PNG/JPG/WebP image.');
        return;
    }
    const reqSeq = ++_uploadRequestSeq;
    const reader = new FileReader();
    reader.onload = (ev) => {
        if (reqSeq !== _uploadRequestSeq) return;
        const img = new Image();
        img.onload = () => {
            if (reqSeq !== _uploadRequestSeq) return;
            sourceImage = img;
            syncSourceCanvasFromImage(img);
            isDrawingTemplateActive = false;
            studioMode = 'photo';
            savedPhotoStateBackup = null;
            config.rotation = 0;
            config.flipX = false;
            config.flipY = false;
            config.cropZoom = 1.0;
            config.cropPanX = 0.0;
            config.cropPanY = 0.0;
            config.removeCanvasBg = false;
            editorSymmetryMode = 'none';
            activeQRStamp = null;
            activeSoundwave = null;
            studioOverlays = { texts: [], stamps: [], qr: null, soundwave: null };
            preQRBackup = null;
            preSoundwaveBackup = null;
            preLiveToolBackup = null;
            if (typeof resetEditHistory === 'function') resetEditHistory();
            if (typeof syncRemoveCanvasUI === 'function') syncRemoveCanvasUI();

            const clearQrBtn = document.getElementById('btn-clear-qr');
            const clearWaveBtn = document.getElementById('btn-clear-wave');
            if (clearQrBtn) clearQrBtn.style.display = 'none';
            if (clearWaveBtn) clearWaveBtn.style.display = 'none';
            if (qr3DMesh && scene) {
                scene.remove(qr3DMesh);
                if (qr3DMesh.geometry) qr3DMesh.geometry.dispose();
                if (qr3DMesh.material) qr3DMesh.material.dispose();
                qr3DMesh = null;
            }

            // Auto-adapt plaque dimensions to match photo aspect ratio when in 'auto' mode
            applyAspectCropPreset(config.aspectPreset || 'auto', true);

            const thumb = document.getElementById('source-thumb-preview');
            if (thumb) thumb.src = ev.target.result;
            const info = document.getElementById('source-img-info');
            if (info) info.innerText = `${img.naturalWidth || img.width} × ${img.naturalHeight || img.height} px • ${config.width}×${config.height}mm`;
            const bar = document.getElementById('source-preview-bar');
            if (bar) bar.style.display = 'flex';

            processSourceImage(false, true);
            if (typeof generateAIPalettesFromImage === 'function') generateAIPalettesFromImage();
            if (typeof applyAIPalette === 'function') applyAIPalette(0);
            requestMeshUpdate(true);
            if (typeof renderSplitCompareSource === 'function' && isSplitCompareMode) renderSplitCompareSource();
            if (typeof render2DEditorPreview === 'function' && centerViewMode === '2d') render2DEditorPreview();
            showToast(translations[currentLang]?.toastImageLoaded || 'Image loaded & analyzed!');
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
}

// ==========================================
// COLOR DISTANCE, BAYER DITHERING & LINEAR OPTICAL ENGINE
// ==========================================

function colorDistSq(r1, g1, b1, r2, g2, b2) {
    const rmean = (r1 + r2) * 0.5;
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    return (((512 + rmean) * dr * dr) / 256) + 4 * dg * dg + (((767 - rmean) * db * db) / 256);
}

function findClosestFilamentIndex(r, g, b, parsedFilaments) {
    let bestIdx = 0;
    let minD = Infinity;
    for (let i = 0; i < parsedFilaments.length; i++) {
        const f = parsedFilaments[i].rgb;
        const d = colorDistSq(r, g, b, f[0], f[1], f[2]);
        if (d < minD) {
            minD = d;
            bestIdx = i;
        }
    }
    return bestIdx;
}

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

// True Chromatic 2-Spool Vector Bayer Dithering (handles iso-luminant hue transitions cleanly!)
function findClosestFilamentWithDither(r, g, b, x, y, parsedFilaments, ditherPct) {
    const n = parsedFilaments.length;
    if (n <= 1) return 0;
    if (!ditherPct || ditherPct <= 0) {
        return findClosestFilamentIndex(r, g, b, parsedFilaments);
    }

    let bestIdx = 0, secondIdx = 1;
    let d1 = Infinity, d2 = Infinity;
    for (let i = 0; i < n; i++) {
        const f = parsedFilaments[i].rgb;
        const d = colorDistSq(r, g, b, f[0], f[1], f[2]);
        if (d < d1) {
            d2 = d1; secondIdx = bestIdx;
            d1 = d; bestIdx = i;
        } else if (d < d2) {
            d2 = d; secondIdx = i;
        }
    }

    const dist1 = Math.sqrt(d1);
    const dist2 = Math.sqrt(d2);
    const sumD = dist1 + dist2;
    if (sumD < 1e-4) return bestIdx;

    // Relative proximity ratio [0..0.5] toward the second-best spool
    const ratio = dist1 / sumD;
    const strength = Math.min(1.0, ditherPct / 100);
    // Only dither pixels inside the blend transition band between the 2 nearest spools
    const threshold = (BAYER_8X8[((y & 7) << 3) | (x & 7)] + 0.5) / 64.0;
    const mixProb = Math.max(0, Math.min(0.5, (ratio - (0.5 - 0.38 * strength)) / Math.max(0.05, 0.76 * strength)));
    return (threshold < mixProb) ? secondIdx : bestIdx;
}

// Pre-parse and pre-sort filaments ONCE per frame (eliminates 262,144 sorts/rebuild!)
function prepareSortedFilamentsForTD(filList) {
    const src = filList || filaments || [];
    const parsed = new Array(src.length);
    for (let i = 0; i < src.length; i++) {
        const f = src[i];
        const rgb = Array.isArray(f.rgb) ? f.rgb : hexToRgb(f.color || f.hex);
        const lin = Array.isArray(f.lin) ? f.lin : [SRGB_TO_LIN_LUT[rgb[0]], SRGB_TO_LIN_LUT[rgb[1]], SRGB_TO_LIN_LUT[rgb[2]]];
        parsed[i] = {
            origIdx: i,
            name: f.name || `Slot ${i + 1}`,
            color: f.color || f.hex || '#000000',
            rgb,
            lin,
            lab: Array.isArray(f.lab) ? f.lab : rgbToLab(rgb[0], rgb[1], rgb[2]),
            td: Math.max(0.2, parseFloat(f.td) || 1.5),
            startPct: i === 0 ? 0.0 : (typeof f.startPct === 'number' ? f.startPct : 0.0)
        };
    }
    parsed.sort((a, b) => a.startPct - b.startPct);
    parsed._isPreSorted = true;
    return parsed;
}

// Physically Accurate Linear-RGB Kubelka-Munk / Beer-Lambert / TD-Cubic Optical Engine
// - Respects actual sculpted zVal (Z-Chisel, Sculptural Dome, Subject Pop, Quantization)
// - Zero phantom +0.35mm thickness inflation
// - Zero discontinuous 35% opacity jump at dz -> 0
// - Zero per-pixel sorting when passed prepareSortedFilamentsForTD()
function computeBeerLambertTDColor(lum, zVal, baseZ, maxReliefZ, parsedFilaments, blendStrength, alreadySorted = false) {
    if (!parsedFilaments || parsedFilaments.length === 0) return [0, 0, 0];

    let sorted;
    if (alreadySorted || parsedFilaments._isPreSorted) {
        sorted = parsedFilaments;
    } else {
        sorted = prepareSortedFilamentsForTD(parsedFilaments);
    }

    const span = Math.max(0.08, maxReliefZ - baseZ);
    const effZ = (typeof zVal === 'number' && isFinite(zVal))
        ? Math.max(baseZ, Math.min(maxReliefZ, zVal))
        : (baseZ + Math.max(0, Math.min(1, lum)) * span);

    const b0 = sorted[0];
    let accR = b0.lin ? b0.lin[0] : SRGB_TO_LIN_LUT[b0.rgb[0]];
    let accG = b0.lin ? b0.lin[1] : SRGB_TO_LIN_LUT[b0.rgb[1]];
    let accB = b0.lin ? b0.lin[2] : SRGB_TO_LIN_LUT[b0.rgb[2]];

    const bStrength = Math.max(0, Math.min(1, typeof blendStrength === 'number' ? blendStrength : ((config.tdOpticalBlend !== undefined ? config.tdOpticalBlend : 65) / 100)));
    const model = config.opticalModel || 'kubelka_munk';
    const n = sorted.length;

    for (let i = 1; i < n; i++) {
        const curr = sorted[i];
        const layerStartZ = baseZ + curr.startPct * span;
        if (effZ <= layerStartZ) break;

        const nextStartZ = (i + 1 < n) ? (baseZ + sorted[i + 1].startPct * span) : maxReliefZ;
        const bandTopZ = Math.min(effZ, Math.max(layerStartZ, nextStartZ));
        const dz = bandTopZ - layerStartZ;
        if (dz <= 1e-5) continue;

        const currR = curr.lin ? curr.lin[0] : SRGB_TO_LIN_LUT[curr.rgb[0]];
        const currG = curr.lin ? curr.lin[1] : SRGB_TO_LIN_LUT[curr.rgb[1]];
        const currB = curr.lin ? curr.lin[2] : SRGB_TO_LIN_LUT[curr.rgb[2]];

        // When blendStrength = 0, effective TD collapses to ~0.08mm (hard crisp step);
        // at 0.65..1.0, uses real physical filament TD (mm where transmission drops to ~1%).
        const effTd = Math.max(0.06, Math.max(0.2, curr.td || 1.5) * (0.12 + bStrength * 1.15));

        if (model === 'cubic') {
            const u = Math.min(1.0, dz / Math.max(0.12, effTd));
            const alpha = u * u * (3.0 - 2.0 * u);
            accR += (currR - accR) * alpha;
            accG += (currG - accG) * alpha;
            accB += (currB - accB) * alpha;
        } else if (model === 'beer_lambert') {
            // Standard physical Beer-Lambert: T = exp(-ln(100) * dz / TD) => 1% transmission at dz = TD
            const alpha = 1.0 - Math.exp(-4.60517 * dz / effTd);
            accR += (currR - accR) * alpha;
            accG += (currG - accG) * alpha;
            accB += (currB - accB) * alpha;
        } else {
            // Two-Flux Kubelka-Munk Subsurface Reflectance in Linear RGB
            const tau = 3.45 * dz / effTd;
            const T = Math.exp(-tau);
            const oneMinusT = 1.0 - T;
            const bounceR = 1.0 / Math.max(0.65, 1.0 - accR * (1.0 - currR) * 0.16 * oneMinusT);
            const bounceG = 1.0 / Math.max(0.65, 1.0 - accG * (1.0 - currG) * 0.16 * oneMinusT);
            const bounceB = 1.0 / Math.max(0.65, 1.0 - accB * (1.0 - currB) * 0.16 * oneMinusT);
            accR = Math.min(1.0, currR * oneMinusT + accR * T * bounceR);
            accG = Math.min(1.0, currG * oneMinusT + accG * T * bounceG);
            accB = Math.min(1.0, currB * oneMinusT + accB * T * bounceB);
        }
    }

    return [linearToSrgb255(accR), linearToSrgb255(accG), linearToSrgb255(accB)];
}

// ==========================================
// CMYW 4-SPOOL FULL-COLOR LITHOPHANE ENGINE (Bambu CMYK Lithophane Bundle)
// ==========================================
function computeCMYWChannels(r, g, b) {
    const lr = SRGB_TO_LIN_LUT[Math.max(0, Math.min(255, r | 0))];
    const lg = SRGB_TO_LIN_LUT[Math.max(0, Math.min(255, g | 0))];
    const lb = SRGB_TO_LIN_LUT[Math.max(0, Math.min(255, b | 0))];
    // Subtractive CMY optical densities [0..1] + luminance thickness for white detail relief
    const c = Math.max(0, Math.min(1, 1.0 - lr));
    const m = Math.max(0, Math.min(1, 1.0 - lg));
    const y = Math.max(0, Math.min(1, 1.0 - lb));
    const k = Math.min(c, m, y);
    const lum = 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
    return { c, m, y, k, lum };
}

function computeCMYWBacklitColor(r, g, b, thicknessMm = 1.2, maxReliefZ = 2.4, kelvinHex = 0xfff4e0) {
    const safeThick = Number.isFinite(thicknessMm) ? thicknessMm : 1.2;
    const safeMaxZ = Number.isFinite(maxReliefZ) && maxReliefZ > 0 ? maxReliefZ : 2.4;
    const kr = ((kelvinHex >> 16) & 255) / 255;
    const kg = ((kelvinHex >> 8) & 255) / 255;
    const kb = (kelvinHex & 255) / 255;
    const ch = computeCMYWChannels(r, g, b);
    // White filament lithophane transmission attenuated by subtractive CMY filter layers
    const normThick = Math.max(0.05, Math.min(1.0, safeThick / Math.max(0.5, safeMaxZ)));
    const whiteTrans = Math.exp(-2.15 * normThick);
    const cTrans = Math.exp(-2.4 * ch.c * 0.85);
    const mTrans = Math.exp(-2.4 * ch.m * 0.85);
    const yTrans = Math.exp(-2.4 * ch.y * 0.85);

    const outLinR = Math.min(1, kr * whiteTrans * cTrans * 1.45);
    const outLinG = Math.min(1, kg * whiteTrans * mTrans * 1.45);
    const outLinB = Math.min(1, kb * whiteTrans * yTrans * 1.45);
    return [linearToSrgb255(outLinR), linearToSrgb255(outLinG), linearToSrgb255(outLinB)];
}

// ==========================================
// CAMERA TD AUTO-CALIBRATOR REGRESSION FITTER ("SNAP & MEASURE TD")
// Fits Beer-Lambert curve I(z) = I_inf + (I_0 - I_inf) * exp(-k * z) on 15 step-wedge samples
// Returns exact physical TD (mm) where light transmission drops to 1% (ln(100)/k) + R^2 fit quality
// ==========================================
function computeCameraTDFromSamples(stepLuminances, stepThicknessesMm) {
    if (!Array.isArray(stepLuminances) || stepLuminances.length < 4) {
        return { td: 2.0, r2: 0, error: 'Insufficient samples' };
    }
    const n = stepLuminances.length;
    const zs = stepThicknessesMm || stepLuminances.map((_, i) => 0.20 * (i + 1));

    // Normalize relative to thinnest/brightest reference and thickest/opaque asymptote
    const iMax = Math.max(...stepLuminances);
    const iMin = Math.min(...stepLuminances);
    const range = Math.max(1e-4, iMax - iMin);

    // Grid-search + golden-section refinement for extinction coefficient k in [0.25 .. 22.0] mm^-1
    // (corresponds to TD = ln(100)/k in [0.21 .. 18.4] mm)
    const evalSSE = (k) => {
        // Closed-form linear least squares for a, b in y_i ≈ a + b * exp(-k * z_i)
        let s1 = 0, sx = 0, sxx = 0, sy = 0, sxy = 0;
        for (let i = 0; i < n; i++) {
            const x = Math.exp(-k * zs[i]);
            const y = (stepLuminances[i] - iMin) / range;
            s1 += 1; sx += x; sxx += x * x; sy += y; sxy += x * y;
        }
        const det = s1 * sxx - sx * sx;
        if (Math.abs(det) < 1e-10) return { sse: 1e9, a: 0, b: 1 };
        const a = (sxx * sy - sx * sxy) / det;
        const b = (s1 * sxy - sx * sy) / det;
        if (b < 0.05) return { sse: 1e9, a, b }; // Physically, transmission must decay with thickness
        let sse = 0;
        for (let i = 0; i < n; i++) {
            const pred = a + b * Math.exp(-k * zs[i]);
            const y = (stepLuminances[i] - iMin) / range;
            const d = y - pred;
            sse += d * d;
        }
        return { sse, a, b };
    };

    let bestK = 2.3;
    let bestFit = { sse: Infinity, a: 0, b: 1 };
    for (let k = 0.25; k <= 22.0; k += 0.15) {
        const fit = evalSSE(k);
        if (fit.sse < bestFit.sse) {
            bestFit = fit;
            bestK = k;
        }
    }
    // Fine local refinement around bestK
    let lo = Math.max(0.22, bestK - 0.2), hi = Math.min(23.0, bestK + 0.2);
    for (let iter = 0; iter < 24; iter++) {
        const m1 = lo + (hi - lo) * 0.382;
        const m2 = lo + (hi - lo) * 0.618;
        if (evalSSE(m1).sse < evalSSE(m2).sse) hi = m2;
        else lo = m1;
    }
    bestK = (lo + hi) * 0.5;
    bestFit = evalSSE(bestK);

    // Compute R^2 goodness of fit
    let meanY = 0;
    for (let i = 0; i < n; i++) meanY += (stepLuminances[i] - iMin) / range;
    meanY /= n;
    let sst = 0;
    for (let i = 0; i < n; i++) {
        const d = ((stepLuminances[i] - iMin) / range) - meanY;
        sst += d * d;
    }
    const r2 = sst > 1e-6 ? Math.max(0, Math.min(1, 1 - bestFit.sse / sst)) : 0;
    const rawTd = Math.log(100) / bestK; // 4.60517 / k
    const td = Math.round(Math.max(0.2, Math.min(16.0, rawTd)) * 10) / 10;

    return {
        td,
        k: Math.round(bestK * 1000) / 1000,
        r2: Math.round(r2 * 1000) / 1000,
        predictedCurve: zs.map(z => Math.max(0, Math.min(1, bestFit.a + bestFit.b * Math.exp(-bestK * z))))
    };
}

// ==========================================
// EDGE-PRESERVING FILTERS (BILATERAL, DUAL-POLARITY FINE LINE, MEDIAN DESPECKLE)
// ==========================================

function applyBilateralFilterRGB(data, w, h, radius = 1, sigmaColor = 34) {
    const src = new Uint8ClampedArray(data);
    const inv2SigmaC = 1.0 / (2.0 * sigmaColor * sigmaColor);
    const inv2SigmaS = 1.0 / (2.0 * Math.max(0.8, radius * 0.85) * Math.max(0.8, radius * 0.85));

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const cR = src[idx], cG = src[idx + 1], cB = src[idx + 2];
            let sumR = 0, sumG = 0, sumB = 0, sumW = 0;

            const yMin = Math.max(0, y - radius), yMax = Math.min(h - 1, y + radius);
            const xMin = Math.max(0, x - radius), xMax = Math.min(w - 1, x + radius);

            for (let ny = yMin; ny <= yMax; ny++) {
                const dy = ny - y;
                for (let nx = xMin; nx <= xMax; nx++) {
                    const dx = nx - x;
                    const nIdx = (ny * w + nx) * 4;
                    const dr = src[nIdx] - cR;
                    const dg = src[nIdx + 1] - cG;
                    const db = src[nIdx + 2] - cB;
                    const distColorSq = dr * dr + dg * dg + db * db;
                    const distSpaceSq = dx * dx + dy * dy;
                    const weight = Math.exp(-distColorSq * inv2SigmaC - distSpaceSq * inv2SigmaS);
                    sumR += src[nIdx] * weight;
                    sumG += src[nIdx + 1] * weight;
                    sumB += src[nIdx + 2] * weight;
                    sumW += weight;
                }
            }
            if (sumW > 0) {
                data[idx] = Math.round(sumR / sumW);
                data[idx + 1] = Math.round(sumG / sumW);
                data[idx + 2] = Math.round(sumB / sumW);
            }
        }
    }
}

// Dual-Polarity Fine-Line Enhancer: reinforces BOTH bright lines on dark AND dark lines (eyelashes/stripes/ink) on bright!
function applyFineLineBoosterRGB(data, w, h) {
    const src = new Uint8ClampedArray(data);
    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            const idx = (y * w + x) * 4;
            const cR = src[idx], cG = src[idx + 1], cB = src[idx + 2];
            const cLum = 0.299 * cR + 0.587 * cG + 0.114 * cB;

            const n1 = ((y - 1) * w + x) * 4;
            const n2 = ((y + 1) * w + x) * 4;
            const n3 = (y * w + (x - 1)) * 4;
            const n4 = (y * w + (x + 1)) * 4;
            const nIdxs = [n1, n2, n3, n4];

            let avgLum = 0;
            let brightestLum = -1, darkestLum = 999;
            let brightIdx = idx, darkIdx = idx;

            for (let k = 0; k < 4; k++) {
                const ni = nIdxs[k];
                const nl = 0.299 * src[ni] + 0.587 * src[ni + 1] + 0.114 * src[ni + 2];
                avgLum += nl;
                if (nl > brightestLum) { brightestLum = nl; brightIdx = ni; }
                if (nl < darkestLum) { darkestLum = nl; darkIdx = ni; }
            }
            avgLum *= 0.25;
            const contrast = cLum - avgLum;

            // 1. Center pixel IS a crisp fine bright ridge (e.g., white whisker/highlight) -> gently boost contrast
            if (contrast > 24 && (brightestLum - darkestLum) > 28) {
                const boost = 1.16;
                data[idx] = Math.min(255, Math.round(avgLum + (cR - avgLum) * boost));
                data[idx + 1] = Math.min(255, Math.round(avgLum + (cG - avgLum) * boost));
                data[idx + 2] = Math.min(255, Math.round(avgLum + (cB - avgLum) * boost));
            }
            // 2. Center pixel IS a crisp fine dark ink/eyelash/stripe line -> gently deepen instead of washing out!
            else if (contrast < -24 && (brightestLum - darkestLum) > 28) {
                const deepen = 0.86;
                data[idx] = Math.max(0, Math.round(cR * deepen));
                data[idx + 1] = Math.max(0, Math.round(cG * deepen));
                data[idx + 2] = Math.max(0, Math.round(cB * deepen));
            }
            // 3. Adjacent to an extreme high-contrast thin bright whisker on very dark background -> anti-alias reinforce
            else if (cLum < 40 && brightestLum - cLum > 95 && darkestLum < 45) {
                data[idx] = Math.min(255, Math.round(cR + (src[brightIdx] - cR) * 0.24));
                data[idx + 1] = Math.min(255, Math.round(cG + (src[brightIdx + 1] - cG) * 0.24));
                data[idx + 2] = Math.min(255, Math.round(cB + (src[brightIdx + 2] - cB) * 0.24));
            }
            // 4. Adjacent to an extreme dark ink line on bright paper -> crisp edge reinforce
            else if (cLum > 210 && cLum - darkestLum > 95 && brightestLum > 205) {
                data[idx] = Math.max(0, Math.round(cR + (src[darkIdx] - cR) * 0.22));
                data[idx + 1] = Math.max(0, Math.round(cG + (src[darkIdx + 1] - cG) * 0.22));
                data[idx + 2] = Math.max(0, Math.round(cB + (src[darkIdx + 2] - cB) * 0.22));
            }
        }
    }
}

// Edge-Preserving Vector-Median Despeckle Filter (Eliminates sub-nozzle specks without averaging across color edges!)
function applyDespeckleFilterRGB(data, w, h, level = 1) {
    if (!level || level <= 0) return;
    const passes = level >= 2 ? 2 : 1;
    const radius = level >= 2 ? 2 : 1;
    const colorThreshSq = level >= 2 ? (46 * 46) : (36 * 36);

    for (let pass = 0; pass < passes; pass++) {
        const src = new Uint8ClampedArray(data);
        for (let y = radius; y < h - radius; y++) {
            for (let x = radius; x < w - radius; x++) {
                const idx = (y * w + x) * 4;
                const cR = src[idx], cG = src[idx + 1], cB = src[idx + 2];

                let similarCount = 0;
                let totalNeighbors = 0;
                const nR = [], nG = [], nB = [];

                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nIdx = ((y + dy) * w + (x + dx)) * 4;
                        const r = src[nIdx], g = src[nIdx + 1], b = src[nIdx + 2];
                        const dSq = (r - cR) * (r - cR) + (g - cG) * (g - cG) + (b - cB) * (b - cB);
                        if (dSq < colorThreshSq) similarCount++;
                        nR.push(r); nG.push(g); nB.push(b);
                        totalNeighbors++;
                    }
                }

                // Only replace isolated specks with the true chromatic medoid neighbor (preserves crisp edges!)
                if (similarCount < Math.ceil(totalNeighbors * 0.28)) {
                    let bestK = 0, bestSum = Infinity;
                    for (let a = 0; a < nR.length; a++) {
                        let s = 0;
                        for (let b = 0; b < nR.length; b++) {
                            s += Math.abs(nR[a] - nR[b]) + Math.abs(nG[a] - nG[b]) + Math.abs(nB[a] - nB[b]);
                        }
                        if (s < bestSum) { bestSum = s; bestK = a; }
                    }
                    data[idx] = nR[bestK];
                    data[idx + 1] = nG[bestK];
                    data[idx + 2] = nB[bestK];
                }
            }
        }
    }
}

// ==========================================
// EXTERIOR FLOOD-FILL BACKGROUND VOID MASK (Prevents punching holes in subject pupils/stripes!)
// ==========================================
function rebuildBgExteriorVoidMask(w, h) {
    if (!colorDataBuffer || !w || !h) {
        bgExteriorVoidMask = null;
        return;
    }
    const N = w * h;
    const mask = new Uint8Array(N);
    const bgRgb = computeBorderBackgroundRGB(colorDataBuffer, w, h);
    const baseRgb = hexToRgb((filaments[0] || { color: '#111827' }).color);

    const isBorderBgLike = (pIdx) => {
        const i4 = pIdx * 4;
        const r = colorDataBuffer[i4], g = colorDataBuffer[i4 + 1], b = colorDataBuffer[i4 + 2];
        const dBg = (r - bgRgb[0]) * (r - bgRgb[0]) + (g - bgRgb[1]) * (g - bgRgb[1]) + (b - bgRgb[2]) * (b - bgRgb[2]);
        if (dBg < 2400) return true;
        const dBase = (r - baseRgb[0]) * (r - baseRgb[0]) + (g - baseRgb[1]) * (g - baseRgb[1]) + (b - baseRgb[2]) * (b - baseRgb[2]);
        if (dBase < 950) return true;
        return false;
    };

    const queue = new Int32Array(N);
    let qHead = 0, qTail = 0;
    const enqueue = (pIdx) => {
        if (mask[pIdx] === 1) return;
        if (!isBorderBgLike(pIdx)) return;
        mask[pIdx] = 1;
        queue[qTail++] = pIdx;
    };

    for (let x = 0; x < w; x++) {
        enqueue(x);
        enqueue((h - 1) * w + x);
    }
    for (let y = 1; y < h - 1; y++) {
        enqueue(y * w);
        enqueue(y * w + (w - 1));
    }

    while (qHead < qTail) {
        const p = queue[qHead++];
        const x = p % w;
        const y = (p - x) / w;
        if (x > 0) enqueue(p - 1);
        if (x < w - 1) enqueue(p + 1);
        if (y > 0) enqueue(p - w);
        if (y < h - 1) enqueue(p + w);
    }

    bgExteriorVoidMask = mask;
}

// ==========================================
// MAIN IMAGE PROCESSING PIPELINE
// ==========================================

function processSourceImage(preserveUserEdits = true, forceFromSource = false) {
    // CRITICAL FIX: Never let photo sliders wipe an active CAD template / drawing canvas!
    if (isDrawingTemplateActive && !forceFromSource) {
        if (typeof render2DEditorPreview === 'function' && centerViewMode === '2d') render2DEditorPreview();
        return;
    }
    if (!sourceImage) return;

    // 1. Preserve user painted/sculpted edits before regenerating base photo
    let savedUserLayer = null;
    if (preserveUserEdits && userEditMaskBuffer && colorDataBuffer && filamentSlotBuffer && bufferWidth > 0 && bufferHeight > 0) {
        let hasAnyUserEdits = false;
        for (let i = 0; i < userEditMaskBuffer.length; i++) {
            if (userEditMaskBuffer[i] === 1) { hasAnyUserEdits = true; break; }
        }
        if (hasAnyUserEdits) {
            savedUserLayer = {
                w: bufferWidth,
                h: bufferHeight,
                mask: new Uint8Array(userEditMaskBuffer),
                color: new Uint8ClampedArray(colorDataBuffer),
                slot: new Uint8Array(filamentSlotBuffer),
                zDelta: customZDeltaBuffer ? new Float32Array(customZDeltaBuffer) : null,
                cutout: cutoutMaskBuffer ? new Uint8Array(cutoutMaskBuffer) : null
            };
        }
    }

    // 2. Compute true aspect-ratio preserved target grid (FIXES PORTRAIT SQUASH!)
    const maxEngineRes = Math.max(160, Math.min(512, config.engineResolution || 360));
    const plaqueW = Math.max(20, config.width || 140);
    const plaqueH = Math.max(20, config.height || 140);
    const plaqueAspect = plaqueH / plaqueW; // H / W

    let targetCols, targetRows;
    if (plaqueW >= plaqueH) {
        targetCols = maxEngineRes;
        targetRows = Math.max(80, Math.min(maxEngineRes, Math.round(maxEngineRes * plaqueAspect)));
    } else {
        targetRows = maxEngineRes;
        targetCols = Math.max(80, Math.min(maxEngineRes, Math.round(maxEngineRes / plaqueAspect)));
    }

    processedCanvas.width = targetCols;
    processedCanvas.height = targetRows;
    const ctx = processedCanvas.getContext('2d', { willReadFrequently: true });

    const isRot90 = ((config.rotation || 0) % 180 !== 0);
    const imgNatW = sourceImage.naturalWidth || sourceImage.width || 1;
    const imgNatH = sourceImage.naturalHeight || sourceImage.height || 1;
    const srcW = isRot90 ? imgNatH : imgNatW;
    const srcH = isRot90 ? imgNatW : imgNatH;

    // 3. Draw source image into oriented offscreen canvas first (clean rotation + flip + Polaroid strip)
    const orientedCanvas = document.createElement('canvas');
    orientedCanvas.width = srcW;
    orientedCanvas.height = srcH;
    const octx = orientedCanvas.getContext('2d');
    octx.save();
    octx.translate(srcW / 2, srcH / 2);
    if (config.flipX || config.flipY) octx.scale(config.flipX ? -1 : 1, config.flipY ? -1 : 1);
    if (config.rotation) octx.rotate((config.rotation * Math.PI) / 180);
    octx.drawImage(sourceImage, -imgNatW / 2, -imgNatH / 2, imgNatW, imgNatH);
    octx.restore();

    // 4. Smart Crop & Framing (cover-fit + zoom + pan; Polaroid reserves bottom white caption strip)
    const isPolaroid = config.aspectPreset === 'polaroid';
    const photoAreaX = isPolaroid ? Math.round(targetCols * 0.06) : 0;
    const photoAreaY = isPolaroid ? Math.round(targetRows * 0.05) : 0;
    const photoAreaW = isPolaroid ? (targetCols - photoAreaX * 2) : targetCols;
    const photoAreaH = isPolaroid ? Math.round(targetRows * 0.74) : targetRows;

    if (isPolaroid) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, targetCols, targetRows);
    } else {
        ctx.clearRect(0, 0, targetCols, targetRows);
    }

    const dstRatio = photoAreaW / Math.max(1, photoAreaH);
    const srcRatio = srcW / Math.max(1, srcH);
    const zoom = Math.max(1.0, Math.min(3.0, config.cropZoom || 1.0));
    let cropW = srcW, cropH = srcH;
    if (srcRatio > dstRatio) {
        cropW = srcH * dstRatio;
    } else {
        cropH = srcW / dstRatio;
    }
    cropW /= zoom;
    cropH /= zoom;

    const maxPanX = Math.max(0, (srcW - cropW) * 0.5);
    const maxPanY = Math.max(0, (srcH - cropH) * 0.5);
    const sx = (srcW - cropW) * 0.5 + (config.cropPanX || 0) * maxPanX;
    const sy = (srcH - cropH) * 0.5 + (config.cropPanY || 0) * maxPanY;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(orientedCanvas, sx, sy, cropW, cropH, photoAreaX, photoAreaY, photoAreaW, photoAreaH);

    // Optional Polaroid caption text at bottom
    if (isPolaroid && config.polaroidCaption && config.polaroidCaption.trim()) {
        ctx.save();
        ctx.fillStyle = '#111827';
        const fontPx = Math.max(12, Math.round(targetRows * 0.075));
        ctx.font = `700 ${fontPx}px "Outfit", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(config.polaroidCaption.trim().slice(0, 28), targetCols * 0.5, targetRows * 0.895, targetCols * 0.86);
        ctx.restore();
    }

    // 5. Read pixels & apply EDGE-PRESERVING BILATERAL FIRST (never blur before bilateral!)
    let imgData = ctx.getImageData(0, 0, targetCols, targetRows);
    let data = imgData.data;

    if (config.bilateralEdgeLock && config.smoothing > 0) {
        const bRad = config.smoothing >= 4 ? 2 : 1;
        const bSigma = 22 + config.smoothing * 7;
        applyBilateralFilterRGB(data, targetCols, targetRows, bRad, bSigma);
    } else if (config.smoothing > 1) {
        // Safe offscreen Gaussian blur (never draws canvas onto itself!)
        const tmpBlur = document.createElement('canvas');
        tmpBlur.width = targetCols;
        tmpBlur.height = targetRows;
        const tbCtx = tmpBlur.getContext('2d');
        tbCtx.putImageData(imgData, 0, 0);
        ctx.save();
        ctx.filter = `blur(${((config.smoothing - 1) * 0.42).toFixed(2)}px)`;
        ctx.drawImage(tmpBlur, 0, 0);
        ctx.restore();
        imgData = ctx.getImageData(0, 0, targetCols, targetRows);
        data = imgData.data;
    }

    if (config.boostFineLines) {
        applyFineLineBoosterRGB(data, targetCols, targetRows);
    }
    if (config.despeckleRadius > 0) {
        applyDespeckleFilterRGB(data, targetCols, targetRows, config.despeckleRadius);
    }

    bufferWidth = targetCols;
    bufferHeight = targetRows;
    heightDataBuffer = new Float32Array(targetCols * targetRows);
    colorDataBuffer = new Uint8ClampedArray(targetCols * targetRows * 4);
    filamentSlotBuffer = new Uint8Array(targetCols * targetRows);
    filamentSlotBuffer.fill(255);
    customZDeltaBuffer = new Float32Array(targetCols * targetRows);
    cutoutMaskBuffer = new Uint8Array(targetCols * targetRows);
    userEditMaskBuffer = new Uint8Array(targetCols * targetRows);

    // Invalidate stale transient backups cleanly
    preLiveToolBackup = null;
    editorTextState.hasLivePreview = false;
    editorStampState.hasLivePreview = false;
    editorPatternState.hasLivePreview = false;

    const brightOff = config.brightness * 2.55;
    const contrastF = (259 * (config.contrast + 255)) / (255 * (259 - config.contrast));
    const gammaVal = Math.max(0.35, Math.min(2.5, config.gamma || 1.0));
    const invGamma = 1.0 / gammaVal;
    // Fixed: shadowLift maps 0..40% directly to 0.00..0.40 (matching slider UI label)
    const minNorm = Math.max(0, Math.min(0.45, (config.shadowLift || 0) / 100));
    const maxNorm = Math.max(minNorm + 0.12, Math.min(1.0, (config.highlightCeiling !== undefined ? config.highlightCeiling : 100) / 100));
    const vibranceF = (config.vibrance || 0) / 100;
    const popFactor = (config.subjectPop || 0) / 100;

    for (let y = 0; y < targetRows; y++) {
        const ny = (y / Math.max(1, targetRows - 1)) * 2 - 1;
        for (let x = 0; x < targetCols; x++) {
            const pIdx = y * targetCols + x;
            const i = pIdx * 4;
            let r = data[i], g = data[i + 1], b = data[i + 2];

            // Universal center/chroma Subject Pop (works on ANY photo & respects negative sign!)
            if (Math.abs(popFactor) > 0.01) {
                const nx = (x / Math.max(1, targetCols - 1)) * 2 - 1;
                const centerWeight = Math.max(0, 1.0 - (nx * nx + ny * ny) * 0.65);
                const maxC = Math.max(r, g, b), minC = Math.min(r, g, b);
                const sat = maxC > 0 ? (maxC - minC) / maxC : 0;
                const fgWeight = Math.min(1, centerWeight * 0.72 + sat * 0.35);
                const boost = 1.0 + popFactor * (fgWeight - 0.38) * 0.48;
                r = Math.max(0, Math.min(255, r * boost));
                g = Math.max(0, Math.min(255, g * boost));
                b = Math.max(0, Math.min(255, b * boost));
            }

            // Brightness & Contrast
            r = Math.max(0, Math.min(255, contrastF * (r - 128) + 128 + brightOff));
            g = Math.max(0, Math.min(255, contrastF * (g - 128) + 128 + brightOff));
            b = Math.max(0, Math.min(255, contrastF * (b - 128) + 128 + brightOff));

            // Vibrance (Boosts muted tones cleanly without clipping saturated channels)
            if (Math.abs(vibranceF) > 0.01) {
                const maxC = Math.max(r, g, b);
                const avgC = (r + g + b) / 3.0;
                const sat = maxC > 0 ? (maxC - Math.min(r, g, b)) / maxC : 0;
                const amt = vibranceF * (1.0 - sat * 0.55) * 1.15;
                r = Math.max(0, Math.min(255, avgC + (r - avgC) * (1 + amt)));
                g = Math.max(0, Math.min(255, avgC + (g - avgC) * (1 + amt)));
                b = Math.max(0, Math.min(255, avgC + (b - avgC) * (1 + amt)));
            }

            // Perceptual Luminance + Gamma + Smooth Tone Curve
            let lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
            if (config.invert) {
                lum = 1.0 - lum;
                r = 255 - r; g = 255 - g; b = 255 - b;
            }
            if (Math.abs(gammaVal - 1.0) > 0.01) {
                lum = Math.pow(Math.max(0, Math.min(1, lum)), invGamma);
            }
            // Smooth Hermite S-curve shadow lift & highlight ceiling
            if (minNorm > 0.001 || maxNorm < 0.999) {
                const clamped = Math.max(0, Math.min(1, lum));
                const soft = clamped * clamped * (3 - 2 * clamped);
                const curved = clamped * 0.65 + soft * 0.35;
                lum = minNorm + curved * (maxNorm - minNorm);
            }
            lum = Math.max(0, Math.min(1, lum));

            heightDataBuffer[pIdx] = lum;
            colorDataBuffer[i] = Math.round(r);
            colorDataBuffer[i + 1] = Math.round(g);
            colorDataBuffer[i + 2] = Math.round(b);
            colorDataBuffer[i + 3] = 255;

            data[i] = colorDataBuffer[i];
            data[i + 1] = colorDataBuffer[i + 1];
            data[i + 2] = colorDataBuffer[i + 2];
            data[i + 3] = 255;
        }
    }

    ctx.putImageData(imgData, 0, 0);

    // 6. Re-apply preserved user edits (nearest-neighbor resample on resolution change)
    if (savedUserLayer) {
        const sw = savedUserLayer.w, sh = savedUserLayer.h;
        for (let y = 0; y < targetRows; y++) {
            const sy2 = Math.min(sh - 1, Math.floor((y / targetRows) * sh));
            for (let x = 0; x < targetCols; x++) {
                const sx2 = Math.min(sw - 1, Math.floor((x / targetCols) * sw));
                const srcP = sy2 * sw + sx2;
                if (savedUserLayer.mask[srcP] === 1) {
                    const dstP = y * targetCols + x;
                    userEditMaskBuffer[dstP] = 1;
                    const s4 = srcP * 4, d4 = dstP * 4;
                    colorDataBuffer[d4] = savedUserLayer.color[s4];
                    colorDataBuffer[d4 + 1] = savedUserLayer.color[s4 + 1];
                    colorDataBuffer[d4 + 2] = savedUserLayer.color[s4 + 2];
                    colorDataBuffer[d4 + 3] = 255;
                    heightDataBuffer[dstP] = (0.299 * colorDataBuffer[d4] + 0.587 * colorDataBuffer[d4 + 1] + 0.114 * colorDataBuffer[d4 + 2]) / 255.0;
                    filamentSlotBuffer[dstP] = savedUserLayer.slot[srcP];
                    if (savedUserLayer.zDelta) customZDeltaBuffer[dstP] = savedUserLayer.zDelta[srcP];
                    if (savedUserLayer.cutout) cutoutMaskBuffer[dstP] = savedUserLayer.cutout[srcP];
                }
            }
        }
        if (typeof syncProcessedCanvasFromBuffer === 'function') syncProcessedCanvasFromBuffer();
    }

    // 7. Re-apply non-destructive overlays (QR, Soundwave, etc.) cleanly on top!
    if (activeQRStamp && typeof applyActiveQRStampToBuffers === 'function') {
        applyActiveQRStampToBuffers();
    }
    if (activeSoundwave && typeof applyActiveSoundwaveToBuffers === 'function') {
        applyActiveSoundwaveToBuffers();
    }

    // 8. Build exterior-connected background mask for safe Photo Mode die-cut removal
    rebuildBgExteriorVoidMask(targetCols, targetRows);

    lastProcessedMeta = {
        w: targetCols,
        h: targetRows,
        rot: config.rotation || 0,
        flipX: config.flipX,
        flipY: config.flipY
    };

    if (typeof render2DEditorPreview === 'function' && centerViewMode === '2d') {
        render2DEditorPreview();
    }
}

// ==========================================
// IMAGE PARAMS & TRANSFORMS
// ==========================================

function updateImageParams() {
    const bEl = document.getElementById('slider-brightness');
    const cEl = document.getElementById('slider-contrast');
    const sEl = document.getElementById('slider-smoothing');
    const dEl = document.getElementById('slider-dithering');
    if (bEl) config.brightness = parseInt(bEl.value, 10);
    if (cEl) config.contrast = parseInt(cEl.value, 10);
    if (sEl) config.smoothing = parseInt(sEl.value, 10);
    if (dEl) config.opticalDithering = parseInt(dEl.value, 10);

    const vb = document.getElementById('val-brightness');
    const vc = document.getElementById('val-contrast');
    const vs = document.getElementById('val-smoothing');
    const vd = document.getElementById('val-dithering');
    if (vb) vb.innerText = config.brightness;
    if (vc) vc.innerText = config.contrast;
    if (vs) vs.innerText = config.smoothing;
    if (vd) vd.innerText = config.opticalDithering + '%';

    processSourceImage(true, false);
    requestMeshUpdate();
}

function rotateImage() {
    if (isDrawingTemplateActive) {
        showToast(currentLang === 'fr' ? 'Rotation photo désactivée en mode Dessin CAD.' : 'Photo rotation is disabled in Draw CAD mode.');
        return;
    }
    if (typeof pushHistoryState === 'function') pushHistoryState();
    config.rotation = ((config.rotation || 0) + 90) % 360;
    if (config.aspectPreset === 'auto') {
        const tmp = config.width;
        config.width = config.height;
        config.height = tmp;
        const inW = document.getElementById('input-width');
        const inH = document.getElementById('input-height');
        if (inW) inW.value = config.width;
        if (inH) inH.value = config.height;
    }
    processSourceImage(false, true);
    if (typeof render2DEditorPreview === 'function' && centerViewMode === '2d') render2DEditorPreview();
    requestMeshUpdate();
    showToast(`${translations[currentLang]?.toastRotated || 'Rotated'}: ${config.rotation}°`);
}

function toggleFlipX() {
    if (isDrawingTemplateActive) return;
    if (typeof pushHistoryState === 'function') pushHistoryState();
    config.flipX = !config.flipX;
    processSourceImage(false, true);
    if (typeof render2DEditorPreview === 'function' && centerViewMode === '2d') render2DEditorPreview();
    requestMeshUpdate();
}

function toggleFlipY() {
    if (isDrawingTemplateActive) return;
    if (typeof pushHistoryState === 'function') pushHistoryState();
    config.flipY = !config.flipY;
    processSourceImage(false, true);
    if (typeof render2DEditorPreview === 'function' && centerViewMode === '2d') render2DEditorPreview();
    requestMeshUpdate();
}

function resetOrientation() {
    if (isDrawingTemplateActive) return;
    if (typeof pushHistoryState === 'function') pushHistoryState();
    config.rotation = 0;
    config.flipX = false;
    config.flipY = false;
    config.cropZoom = 1.0;
    config.cropPanX = 0.0;
    config.cropPanY = 0.0;
    const zEl = document.getElementById('slider-crop-zoom');
    const pxEl = document.getElementById('slider-crop-panx');
    const pyEl = document.getElementById('slider-crop-pany');
    if (zEl) zEl.value = 1;
    if (pxEl) pxEl.value = 0;
    if (pyEl) pyEl.value = 0;
    const vz = document.getElementById('val-crop-zoom'); if (vz) vz.innerText = '1.00×';
    const vx = document.getElementById('val-crop-panx'); if (vx) vx.innerText = '0%';
    const vy = document.getElementById('val-crop-pany'); if (vy) vy.innerText = '0%';
    processSourceImage(false, true);
    if (typeof render2DEditorPreview === 'function' && centerViewMode === '2d') render2DEditorPreview();
    requestMeshUpdate();
}

function updateBgSculptMode() {
    const bgEl = document.getElementById('select-bg-mode');
    if (bgEl) config.bgMode = bgEl.value;
    if (typeof render2DEditorPreview === 'function' && centerViewMode === '2d') render2DEditorPreview();
    requestMeshUpdate();
}

function toggleInvertColors() {
    if (isDrawingTemplateActive) return;
    config.invert = !config.invert;
    const btn = document.getElementById('btn-invert');
    if (btn) btn.classList.toggle('active', config.invert);
    processSourceImage(true, false);
    if (typeof render2DEditorPreview === 'function' && centerViewMode === '2d') render2DEditorPreview();
    requestMeshUpdate();
}

function updateTopographyOptions() {
    const topoEl = document.getElementById('select-topography');
    const shapeEl = document.getElementById('select-outline-shape');
    const bgEl = document.getElementById('select-bg-mode');
    if (topoEl) config.topography = topoEl.value;
    if (shapeEl) config.outlineShape = shapeEl.value;
    if (bgEl) config.bgMode = bgEl.value;

    // Reposition backlight dynamically if Lightbox mode is active
    if (typeof applyLightboxKelvinToScene === 'function' && isLightbox) {
        applyLightboxKelvinToScene();
    }
    if (typeof render2DEditorPreview === 'function' && centerViewMode === '2d') render2DEditorPreview();
    requestMeshUpdate();
    if (typeof updateHUD === 'function') updateHUD();
    if (typeof updateSlicerTable === 'function') updateSlicerTable();
}

function toggleRemoveCanvasBg(forceVal) {
    if (typeof forceVal === 'boolean') {
        config.removeCanvasBg = forceVal;
    } else {
        config.removeCanvasBg = !config.removeCanvasBg;
    }
    if (config.removeCanvasBg && !isDrawingTemplateActive) {
        rebuildBgExteriorVoidMask(bufferWidth, bufferHeight);
    }
    syncRemoveCanvasUI();
    if (typeof render2DEditorPreview === 'function' && centerViewMode === '2d') render2DEditorPreview();
    requestMeshUpdate();
    showToast(config.removeCanvasBg ? (translations[currentLang]?.toastCanvasRemoved || 'Background Removed (Model Only)') : (translations[currentLang]?.toastCanvasRestored || 'Canvas Background Restored'));
}

function syncRemoveCanvasUI() {
    const on = !!config.removeCanvasBg;
    const ids = [
        'btn-top-remove-canvas',
        'btn-hud-remove-canvas',
        'btn-toolbar-remove-canvas',
        'btn-sec1-remove-canvas',
        'btn-subbar-remove-canvas'
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('active', on);
    });
    const chk = document.getElementById('chk-remove-canvas-sec6');
    if (chk) chk.checked = on;
}

// ==========================================
// 3D GEOMETRY SHAPING, DIE-CUT VOIDS, TOPOGRAPHY & SOUNDWAVE SAMPLER
// ==========================================

function isOutsideOutlineShape(nx, ny, shape, aspectRatio = null) {
    if (!shape || shape === 'rect') return false;
    // Aspect-ratio correction so circle/heart/star/hex stay geometrically true on non-square plaques!
    const ar = aspectRatio !== null ? aspectRatio : ((config.width || 140) / Math.max(1, config.height || 140));
    let ax = nx, ay = ny;
    if (ar > 1.001) {
        ax = nx * ar;
    } else if (ar < 0.999) {
        ay = ny / ar;
    }

    if (shape === 'circle') {
        return (ax * ax + ay * ay) > 0.99;
    }
    if (shape === 'oval') {
        return (nx * nx + ny * ny) > 0.98;
    }
    if (shape === 'hexagon') {
        const absX = Math.abs(ax);
        const absY = Math.abs(ay);
        return (absY > 0.92) || (0.866025 * absX + 0.5 * absY > 0.92);
    }
    if (shape === 'heart') {
        const hx = ax * 1.18;
        const hy = ay * 1.18 + 0.14;
        const a = hx * hx + hy * hy - 1.0;
        return (a * a * a - hx * hx * hy * hy * hy) > 0.0;
    }
    if (shape === 'shield') {
        if (ay > 0.94 || ay < -0.96 || Math.abs(ax) > 0.88) return true;
        if (ay < 0.0) {
            const t = (-ay) / 0.96;
            const maxX = 0.88 * Math.pow(Math.max(0, 1.0 - t * t), 0.72);
            return Math.abs(ax) > maxX;
        }
        return false;
    }
    if (shape === 'star') {
        // Crisp 5-pointed geometric star (replaces old 8-petal flower!)
        const r = Math.hypot(ax, ay);
        if (r > 0.98) return true;
        if (r < 0.36) return false;
        const theta = Math.atan2(ay, ax) - Math.PI / 2;
        const sector = (2 * Math.PI) / 5;
        let a = ((theta % sector) + sector) % sector;
        if (a > sector * 0.5) a = sector - a;
        const outerR = 0.96;
        const innerR = 0.41;
        // Exact straight-edge polar equation between (outerR, 0) and (innerR, pi/5)
        const halfSec = sector * 0.5;
        const x1 = outerR, y1 = 0;
        const x2 = innerR * Math.cos(halfSec), y2 = innerR * Math.sin(halfSec);
        const denom = (y2 - y1) * Math.cos(a) - (x2 - x1) * Math.sin(a);
        const edgeR = Math.abs(denom) > 1e-6 ? ((x1 * y2 - y1 * x2) / (-denom)) : outerR;
        return r > Math.abs(edgeR);
    }
    if (shape === 'arch') {
        if (Math.abs(nx) > 0.96 || ny < -0.96) return true;
        if (ny > 0.0) {
            return (nx * nx + ny * ny) > 0.96;
        }
        return false;
    }
    return false;
}

// Canonical per-pixel cutout test: (colIdx, rowIdx, w, h, bgRgb, baseRgbCache)
// Protects active QR/Soundwave areas from die-cut perforation, and uses exterior BFS mask in Photo Mode!
function isPixelCutoutVoid(colIdx, rowIdx, w, h, bgRgb, baseRgbCache = null) {
    const pIdx = rowIdx * w + colIdx;
    const u = colIdx / Math.max(1, w - 1);
    const v = rowIdx / Math.max(1, h - 1);
    const nx = u * 2.0 - 1.0;
    const ny = 1.0 - v * 2.0;

    if (isOutsideOutlineShape(nx, ny, config.outlineShape)) return true;
    if (cutoutMaskBuffer && cutoutMaskBuffer[pIdx] === 1) return true;
    if (!config.removeCanvasBg) return false;

    // Protect active QR Code & Soundwave zones from being punched out in Model-Only mode
    if (activeQRStamp && u >= activeQRStamp.u0 && u <= activeQRStamp.u1 && v >= activeQRStamp.v0 && v <= activeQRStamp.v1) {
        return false;
    }
    if (activeSoundwave && u >= activeSoundwave.u0 && u <= activeSoundwave.u1 && v >= activeSoundwave.v0 && v <= activeSoundwave.v1) {
        return false;
    }

    if (filamentSlotBuffer && filamentSlotBuffer[pIdx] === 0) {
        return true;
    }

    // In Draw / CAD Template mode, explicit Slot 0 + dark base marks background void
    if (isDrawingTemplateActive || studioMode === 'draw') {
        if (!colorDataBuffer) return false;
        const i4 = pIdx * 4;
        const r = colorDataBuffer[i4], g = colorDataBuffer[i4 + 1], b = colorDataBuffer[i4 + 2];
        const bRgb = baseRgbCache || hexToRgb((filaments[0] || { color: '#111827' }).color);
        const dBase = (r - bRgb[0]) * (r - bRgb[0]) + (g - bRgb[1]) * (g - bRgb[1]) + (b - bRgb[2]) * (b - bRgb[2]);
        return dBase < 900;
    }

    // In Photo Mode, ONLY cut out exterior-connected background pixels (protects interior eyes/stripes!)
    if (bgExteriorVoidMask && bgExteriorVoidMask.length > pIdx) {
        return bgExteriorVoidMask[pIdx] === 1;
    }

    if (!colorDataBuffer) return false;
    const i4 = pIdx * 4;
    const r = colorDataBuffer[i4], g = colorDataBuffer[i4 + 1], b = colorDataBuffer[i4 + 2];
    const bRgb = baseRgbCache || hexToRgb((filaments[0] || { color: '#111827' }).color);
    const dBase = (r - bRgb[0]) * (r - bRgb[0]) + (g - bRgb[1]) * (g - bRgb[1]) + (b - bRgb[2]) * (b - bRgb[2]);
    if (dBase < 900) return true;
    if (bgRgb) {
        const dBg = (r - bgRgb[0]) * (r - bgRgb[0]) + (g - bgRgb[1]) * (g - bgRgb[1]) + (b - bgRgb[2]) * (b - bgRgb[2]);
        if (dBg < 2200) return true;
    }
    return false;
}

// Maps planar (x, y, z) onto Curved Arc / Half-Cylinder / 360° Cylinder.
// When zUpExport === true (STL / 3MF export), outputs Z-up standing upright with base resting at Z = 0!
function applyTopographyVertex(x, y, z, w, h, topo, zUpExport = false) {
    if (!topo || topo === 'flat') return [x, y, z];

    let angleSpan = Math.PI * 0.44;
    if (topo === 'half_cyl') angleSpan = Math.PI;
    else if (topo === 'cylinder') angleSpan = Math.PI * 2.0;

    const R = w / angleSpan;
    const theta = (x / w) * angleSpan;
    const rEff = R + z;

    if (zUpExport) {
        // Standing upright on Z=0 build plate: vertical height y -> Z in [0, h]
        const outX = rEff * Math.sin(theta);
        const outY = (topo === 'cylinder')
            ? (rEff * Math.cos(theta))
            : (rEff * Math.cos(theta) - R);
        const outZ = y + h * 0.5;
        return [outX, outY, outZ];
    }

    // Three.js viewport preview coordinates (Y-up centered)
    if (topo === 'cylinder') {
        return [rEff * Math.sin(theta), y, rEff * Math.cos(theta)];
    }
    return [rEff * Math.sin(theta), y, rEff * Math.cos(theta) - R];
}

function computeBorderBackgroundRGB(cBuf, w, h) {
    if (!cBuf || w < 2 || h < 2) return [0, 0, 0];
    let rSum = 0, gSum = 0, bSum = 0, cnt = 0;
    const stepX = Math.max(1, Math.floor(w / 24));
    const stepY = Math.max(1, Math.floor(h / 24));
    for (let x = 0; x < w; x += stepX) {
        let i = x * 4; rSum += cBuf[i]; gSum += cBuf[i + 1]; bSum += cBuf[i + 2]; cnt++;
        i = ((h - 1) * w + x) * 4; rSum += cBuf[i]; gSum += cBuf[i + 1]; bSum += cBuf[i + 2]; cnt++;
    }
    for (let y = 0; y < h; y += stepY) {
        let i = (y * w) * 4; rSum += cBuf[i]; gSum += cBuf[i + 1]; bSum += cBuf[i + 2]; cnt++;
        i = (y * w + (w - 1)) * 4; rSum += cBuf[i]; gSum += cBuf[i + 1]; bSum += cBuf[i + 2]; cnt++;
    }
    return cnt > 0 ? [rSum / cnt, gSum / cnt, bSum / cnt] : [0, 0, 0];
}

// Smooth soft-knee 2.5D sculptural dome (no 38% highlight plateau clipping!)
function computeSculpturalBasReliefZ(lum, nx, ny, r, g, b, bgRgb, domePct) {
    const domeStrength = Math.max(0, Math.min(1, (domePct || 0) / 100));
    if (domeStrength <= 0.005) return lum;

    const rSq = nx * nx + ny * ny;
    const centerCushion = Math.max(0, Math.cos(Math.min(1.0, Math.sqrt(rSq * 0.92)) * (Math.PI * 0.5)));
    const distBg = bgRgb ? Math.min(1.0, Math.sqrt(colorDistSq(r, g, b, bgRgb[0], bgRgb[1], bgRgb[2])) / 340.0) : 0.65;
    const fgMask = Math.min(1.0, Math.pow(distBg, 0.72) * 0.70 + centerCushion * 0.45);
    const domeCurve = Math.pow(centerCushion, 0.85) * fgMask;

    // Soft-knee blend keeps top highlights smoothly differentiated instead of flat-clipping
    const boosted = lum * (1.0 - 0.28 * domeStrength) + domeCurve * 0.36 * domeStrength;
    return Math.max(0, Math.min(1.0, boosted / (0.85 + 0.15 * boosted)));
}

// Samples Active 3D Soundwave (supports BOTH discrete rounded bars AND continuous Heartbeat ECG trace!)
function sampleActiveSoundwave(u, v) {
    if (!activeSoundwave || !activeSoundwave.bars || activeSoundwave.bars.length === 0) return null;
    const { u0, u1, v0, v1, bars, style, preset } = activeSoundwave;
    if (u < u0 || u > u1 || v < v0 || v > v1) return null;

    const lu = (u - u0) / Math.max(1e-5, u1 - u0);
    const lv = (v - v0) / Math.max(1e-5, v1 - v0);

    // Rounded pill border mask
    const dx = Math.abs(lu - 0.5) * 2;
    const dy = Math.abs(lv - 0.5) * 2;
    if (dx > 0.96 && dy > 0.75) {
        const cx = (dx - 0.96) / 0.04;
        const cy = (dy - 0.75) / 0.25;
        if (cx * cx + cy * cy > 1.0) return null;
    }

    const innerU = (lu - 0.04) / 0.92;
    if (innerU < 0 || innerU > 1) return false;
    const centerDist = Math.abs(lv - 0.5) * 2;

    if (style === 'heartbeat' || preset === 'heartbeat') {
        const idxF = innerU * (bars.length - 1);
        const i0 = Math.floor(idxF);
        const i1 = Math.min(bars.length - 1, i0 + 1);
        const t = idxF - i0;
        const amp = bars[i0] * (1 - t) + bars[i1] * t;
        // Signed ECG deflection around center line (lv = 0.5)
        const targetV = 0.5 - (amp - 0.22) * 0.62;
        if (Math.abs(lv - targetV) < 0.075) return true;
        // Connect vertical QRS spikes smoothly between adjacent sample points
        const prevTarget = 0.5 - (bars[i0] - 0.22) * 0.62;
        const nextTarget = 0.5 - (bars[i1] - 0.22) * 0.62;
        const minV = Math.min(prevTarget, nextTarget) - 0.045;
        const maxV = Math.max(prevTarget, nextTarget) + 0.045;
        if (lv >= minV && lv <= maxV) return true;
        return false;
    }

    const barCount = bars.length;
    const barF = innerU * barCount;
    const barIdx = Math.min(barCount - 1, Math.floor(barF));
    const localBarPos = barF - barIdx;
    if (localBarPos < 0.17 || localBarPos > 0.83) return false;
    const amp = Math.max(0.12, Math.min(0.90, bars[barIdx]));
    return centerDist <= amp;
}

// ==========================================
// BUILT-IN PROCEDURAL SAMPLES (SCALED CLEANLY)
// ==========================================

function drawSampleGraphic(ctxOrCanvas, wOrType, h, type) {
    let ctx = ctxOrCanvas, w = wOrType, hh = h, t = type;
    if (ctxOrCanvas && typeof ctxOrCanvas.getContext === 'function') {
        ctx = ctxOrCanvas.getContext('2d');
        w = ctxOrCanvas.width;
        hh = ctxOrCanvas.height;
        t = wOrType;
    }
    if (!ctx || !w || !hh) return;
    h = hh;
    type = t;
    ctx.clearRect(0, 0, w, h);
    const scale = Math.min(w, h) / 340.0;

    if (type === 'tiger') {
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#042f2e');
        bgGrad.addColorStop(0.5, '#064e3b');
        bgGrad.addColorStop(1, '#022c22');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        ctx.fillStyle = '#065f46';
        for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            ctx.ellipse((w * 0.1) + i * (w * 0.16), h * 0.15, w * 0.12, h * 0.06, (i % 2 ? 0.5 : -0.5), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        const drawTigerFigure = (cx, cy, s) => {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(s * scale, s * scale);
            ctx.fillStyle = '#f97316';
            ctx.beginPath(); ctx.ellipse(0, 22, 34, 56, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fed7aa';
            ctx.beginPath(); ctx.ellipse(0, 26, 20, 40, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ea580c';
            ctx.beginPath(); ctx.arc(0, -36, 30, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(-22, -56, 10, 0, Math.PI * 2); ctx.arc(22, -56, 10, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.ellipse(-12, -30, 12, 8, 0.2, 0, Math.PI * 2); ctx.ellipse(12, -30, 12, 8, -0.2, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#0a0a0c';
            ctx.lineWidth = 4.5;
            ctx.lineCap = 'round';
            const stripes = [[-22, 0, -6, 6], [22, 0, 6, 6], [-24, 18, -7, 22], [24, 18, 7, 22], [-20, 36, -6, 40], [20, 36, 6, 40], [-14, -52, -5, -45], [14, -52, 5, -45], [0, -60, 0, -48]];
            stripes.forEach(st => { ctx.beginPath(); ctx.moveTo(st[0], st[1]); ctx.lineTo(st[2], st[3]); ctx.stroke(); });
            ctx.fillStyle = '#facc15';
            ctx.beginPath(); ctx.arc(-10, -41, 4.5, 0, Math.PI * 2); ctx.arc(10, -41, 4.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#050507';
            ctx.beginPath(); ctx.arc(-10, -41, 2.2, 0, Math.PI * 2); ctx.arc(10, -41, 2.2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#f43f5e';
            ctx.beginPath(); ctx.moveTo(-6, -32); ctx.lineTo(6, -32); ctx.lineTo(0, -25); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.0;
            [-1, 1].forEach(dir => {
                ctx.beginPath(); ctx.moveTo(dir * 14, -30); ctx.lineTo(dir * 34, -34); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(dir * 14, -27); ctx.lineTo(dir * 34, -26); ctx.stroke();
            });
            ctx.restore();
        };

        drawTigerFigure(w * 0.5, h * 0.48, 1.35);
        drawTigerFigure(w * 0.25, h * 0.72, 0.72);
        drawTigerFigure(w * 0.75, h * 0.72, 0.72);
    } else if (type === 'cyberpunk') {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#090517');
        grad.addColorStop(0.55, '#4c1d95');
        grad.addColorStop(0.85, '#ec4899');
        grad.addColorStop(1, '#1e1b4b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        const sunGrad = ctx.createLinearGradient(0, h * 0.16, 0, h * 0.62);
        sunGrad.addColorStop(0, '#fef08a');
        sunGrad.addColorStop(0.5, '#f97316');
        sunGrad.addColorStop(1, '#ec4899');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.42, w * 0.28, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1e1b4b';
        for (let i = 0; i < 6; i++) {
            const sy = h * 0.44 + i * (h * 0.042);
            ctx.fillRect(w * 0.18, sy, w * 0.64, h * (0.012 + i * 0.003));
        }

        ctx.fillStyle = '#09090b';
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.lineTo(0, h * 0.62);
        ctx.lineTo(w * 0.15, h * 0.62); ctx.lineTo(w * 0.15, h * 0.46); ctx.lineTo(w * 0.26, h * 0.46);
        ctx.lineTo(w * 0.26, h * 0.58); ctx.lineTo(w * 0.38, h * 0.58); ctx.lineTo(w * 0.38, h * 0.36);
        ctx.lineTo(w * 0.48, h * 0.36); ctx.lineTo(w * 0.48, h * 0.54); ctx.lineTo(w * 0.62, h * 0.54);
        ctx.lineTo(w * 0.62, h * 0.41); ctx.lineTo(w * 0.74, h * 0.41); ctx.lineTo(w * 0.74, h * 0.60);
        ctx.lineTo(w * 0.86, h * 0.60); ctx.lineTo(w * 0.86, h * 0.50); ctx.lineTo(w, h * 0.50);
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = Math.max(1.5, 2.5 * scale);
        for (let y = h * 0.72; y < h; y += h * 0.06) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }
    } else if (type === 'cat') {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);
        const rad = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.05, w * 0.5, h * 0.5, w * 0.48);
        rad.addColorStop(0, '#f97316');
        rad.addColorStop(0.6, '#7c2d12');
        rad.addColorStop(1, '#0f172a');
        ctx.fillStyle = rad;
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#fb923c';
        ctx.beginPath(); ctx.arc(w * 0.5, h * 0.54, w * 0.30, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(w * 0.24, h * 0.42); ctx.lineTo(w * 0.20, h * 0.14); ctx.lineTo(w * 0.42, h * 0.28); ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(w * 0.76, h * 0.42); ctx.lineTo(w * 0.80, h * 0.14); ctx.lineTo(w * 0.58, h * 0.28); ctx.closePath(); ctx.fill();

        ctx.fillStyle = '#fef3c7';
        ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.64, w * 0.16, h * 0.12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#22c55e';
        ctx.beginPath(); ctx.ellipse(w * 0.38, h * 0.49, w * 0.065, h * 0.055, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(w * 0.62, h * 0.49, w * 0.065, h * 0.055, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#09090b';
        ctx.beginPath(); ctx.ellipse(w * 0.38, h * 0.49, w * 0.022, h * 0.045, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(w * 0.62, h * 0.49, w * 0.022, h * 0.045, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(w * 0.365, h * 0.47, w * 0.014, 0, Math.PI * 2); ctx.arc(w * 0.605, h * 0.47, w * 0.014, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath(); ctx.moveTo(w * 0.46, h * 0.59); ctx.lineTo(w * 0.54, h * 0.59); ctx.lineTo(w * 0.50, h * 0.64); ctx.closePath(); ctx.fill();
    } else if (type === 'mountain') {
        const sky = ctx.createLinearGradient(0, 0, 0, h * 0.65);
        sky.addColorStop(0, '#0f172a');
        sky.addColorStop(0.5, '#1d4ed8');
        sky.addColorStop(1, '#fb923c');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#fef9c3';
        ctx.beginPath(); ctx.arc(w * 0.72, h * 0.25, w * 0.11, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#1e3a8a';
        ctx.beginPath(); ctx.moveTo(0, h * 0.75); ctx.lineTo(w * 0.28, h * 0.34); ctx.lineTo(w * 0.55, h * 0.62); ctx.lineTo(w * 0.78, h * 0.28); ctx.lineTo(w, h * 0.58); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();

        ctx.fillStyle = '#f8fafc';
        ctx.beginPath(); ctx.moveTo(w * 0.28, h * 0.34); ctx.lineTo(w * 0.20, h * 0.46); ctx.lineTo(w * 0.27, h * 0.44); ctx.lineTo(w * 0.35, h * 0.48); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(w * 0.78, h * 0.28); ctx.lineTo(w * 0.70, h * 0.42); ctx.lineTo(w * 0.79, h * 0.39); ctx.lineTo(w * 0.87, h * 0.43); ctx.closePath(); ctx.fill();

        ctx.fillStyle = '#0c4a6e';
        ctx.fillRect(0, h * 0.72, w, h * 0.28);
        ctx.fillStyle = '#facc15';
        ctx.globalAlpha = 0.45;
        ctx.fillRect(w * 0.62, h * 0.75, w * 0.20, h * 0.03);
        ctx.fillRect(w * 0.65, h * 0.81, w * 0.14, h * 0.025);
        ctx.fillRect(w * 0.68, h * 0.87, w * 0.08, h * 0.02);
        ctx.globalAlpha = 1.0;
    } else if (type === 'mona') {
        const bg = ctx.createRadialGradient(w * 0.5, h * 0.42, w * 0.05, w * 0.5, h * 0.5, w * 0.6);
        bg.addColorStop(0, '#d97706');
        bg.addColorStop(0.55, '#451a03');
        bg.addColorStop(1, '#09090b');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#1c1917';
        ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.92, w * 0.34, h * 0.26, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fde68a';
        ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.44, w * 0.18, h * 0.24, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#292524';
        ctx.beginPath(); ctx.arc(w * 0.5, h * 0.36, w * 0.22, Math.PI, Math.PI * 2); ctx.fill();
        ctx.fillRect(w * 0.28, h * 0.35, w * 0.08, h * 0.38);
        ctx.fillRect(w * 0.64, h * 0.35, w * 0.08, h * 0.38);
        ctx.fillStyle = '#1c1917';
        ctx.beginPath(); ctx.arc(w * 0.43, h * 0.41, w * 0.025, 0, Math.PI * 2); ctx.arc(w * 0.57, h * 0.41, w * 0.025, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = Math.max(2, 3 * scale);
        ctx.beginPath(); ctx.arc(w * 0.5, h * 0.50, w * 0.07, 0.2, Math.PI - 0.2); ctx.stroke();
    }
}

function populateSampleThumbnails() {
    ['tiger', 'cyberpunk', 'cat', 'mountain', 'mona'].forEach(t => {
        const c = document.getElementById(`thumb-${t}`);
        if (c) drawSampleGraphic(c.getContext('2d'), c.width, c.height, t);
    });
}

function loadSample(type) {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = 420;
    offCanvas.height = 420;
    drawSampleGraphic(offCanvas.getContext('2d'), 420, 420, type);
    const dataUrl = offCanvas.toDataURL('image/png');
    const img = new Image();
    img.onload = () => {
        sourceImage = img;
        syncSourceCanvasFromImage(img);
        isDrawingTemplateActive = false;
        studioMode = 'photo';
        savedPhotoStateBackup = null;
    // Re-set rotation cleanly on sample load
    config.rotation = 0;
        config.flipX = false;
        config.flipY = false;
        config.cropZoom = 1.0;
        config.cropPanX = 0.0;
        config.cropPanY = 0.0;
        config.removeCanvasBg = false;
        activeQRStamp = null;
        activeSoundwave = null;
        studioOverlays = { texts: [], stamps: [], qr: null, soundwave: null };
        if (typeof resetEditHistory === 'function') resetEditHistory();
        if (typeof syncRemoveCanvasUI === 'function') syncRemoveCanvasUI();

        if (config.aspectPreset === 'auto') {
            config.width = 140;
            config.height = 140;
            const inW = document.getElementById('input-width');
            const inH = document.getElementById('input-height');
            if (inW) inW.value = 140;
            if (inH) inH.value = 140;
        }

        const thumb = document.getElementById('source-thumb-preview');
        if (thumb) thumb.src = dataUrl;
        const info = document.getElementById('source-img-info');
        if (info) info.innerText = `420 × 420 px (Sample: ${type})`;
        const bar = document.getElementById('source-preview-bar');
        if (bar) bar.style.display = 'flex';

        processSourceImage(false, true);
        if (typeof generateAIPalettesFromImage === 'function') generateAIPalettesFromImage();

        if (type === 'tiger') {
            filaments = [
                { name: 'Black (Base)', color: '#111827', td: 0.6, startPct: 0.00 },
                { name: 'Forest Green', color: '#14532d', td: 1.5, startPct: 0.24 },
                { name: 'Tiger Orange', color: '#ea580c', td: 3.5, startPct: 0.48 },
                { name: 'Warm Yellow', color: '#facc15', td: 4.5, startPct: 0.72 },
                { name: 'Pure White', color: '#ffffff', td: 5.0, startPct: 0.88 }
            ];
            if (typeof renderFilamentStackUI === 'function') renderFilamentStackUI();
            requestMeshUpdate(true);
        } else if (typeof applyAIPalette === 'function') {
            // FIXED: non-tiger samples immediately get their optimal extracted palette!
            applyAIPalette(0);
            requestMeshUpdate(true);
        } else {
            requestMeshUpdate(true);
        }

        if (typeof renderSplitCompareSource === 'function' && isSplitCompareMode) renderSplitCompareSource();
        if (typeof render2DEditorPreview === 'function' && centerViewMode === '2d') render2DEditorPreview();
    };
    img.src = dataUrl;
}
