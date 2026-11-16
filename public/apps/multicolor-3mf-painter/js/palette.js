// ==========================================
// 🎨 FILAMENT SLOTS PALETTE, HSV PICKER & CIELAB MATCHING
// ==========================================
let filamentSlots = [
    { id: 1, name: "Jade White", color: "#f8fafc", hex: "#f8fafc", type: "PLA Basic" },
    { id: 2, name: "Flame Red", color: "#ad002b", hex: "#ad002b", type: "PLA Basic" },
    { id: 3, name: "Carbon Black", color: "#111827", hex: "#111827", type: "PLA Basic" },
    { id: 4, name: "Emerald Green", color: "#10b981", hex: "#10b981", type: "PLA Basic" }
];

let activeSlotIndex = 1;
let slotRgbFloats = [];
let slotLabs = [];

const filamentCatalogs = {
    'studio-pla': [
        { name: "Pure White", hex: "#FFFFFF" },
        { name: "Deep Charcoal", hex: "#111827" },
        { name: "Flame Crimson", hex: "#AD002B" },
        { name: "Emerald Green", hex: "#10B981" },
        { name: "Vibrant Orange", hex: "#FF6A13" },
        { name: "Cobalt Blue", hex: "#0047BB" },
        { name: "Solar Yellow", hex: "#FFD100" },
        { name: "Vivid Magenta", hex: "#D62598" },
        { name: "Cyan Ice", hex: "#00A3E0" },
        { name: "Titanium Grey", hex: "#A2AAAD" },
        { name: "Imperial Gold", hex: "#D4AF37" },
        { name: "Rich Walnut", hex: "#6B4423" }
    ],
    'studio-matte': [
        { name: "Matte Charcoal", hex: "#2B2D2F" },
        { name: "Matte Ivory White", hex: "#F4F4F0" },
        { name: "Matte Sakura Pink", hex: "#F8BBD0" },
        { name: "Matte Ice Blue", hex: "#81D4FA" },
        { name: "Matte Desert Tan", hex: "#D2B48C" },
        { name: "Matte Marine Blue", hex: "#1A365D" },
        { name: "Matte Ash Grey", hex: "#708090" },
        { name: "Matte Forest Green", hex: "#4CAF50" },
        { name: "Matte Espresso", hex: "#8D6E63" }
    ],
    'studio-silk': [
        { name: "Silk Gold", hex: "#FFD700" },
        { name: "Silk Silver", hex: "#C0C0C0" },
        { name: "Silk Copper", hex: "#B87333" },
        { name: "Silk Bronze", hex: "#CD7F32" },
        { name: "Silk Rose Gold", hex: "#B76E79" }
    ],
    'studio-pro': [
        { name: "Studio Orange", hex: "#F05A22" },
        { name: "Galaxy Black", hex: "#1E1E24" },
        { name: "Lipstick Red", hex: "#B31B1B" },
        { name: "Metallic Silver", hex: "#9E9E9E" },
        { name: "Tactical Olive", hex: "#4B5320" }
    ]
};

function normalizeHex(raw, fallback = '#FFFFFF') {
    let h = String(raw || '').trim().replace(/[^0-9a-fA-F#]/g, '');
    if (!h.startsWith('#')) h = '#' + h;
    if (/^#[0-9a-fA-F]{3}$/.test(h)) {
        h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
    }
    if (/^#[0-9a-fA-F]{8}$/.test(h)) {
        h = h.slice(0, 7);
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(h)) return fallback.toUpperCase();
    return h.toUpperCase();
}

function hexToRgb(hex) {
    const clean = normalizeHex(hex, '#FFFFFF');
    const num = parseInt(clean.slice(1), 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex(r, g, b) {
    const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
    return '#' + ((1 << 24) + (clamp(r) << 16) + (clamp(g) << 8) + clamp(b)).toString(16).slice(1).toUpperCase();
}

// Perceptual sRGB -> CIE L*a*b* conversion for accurate filament matching
function srgb01ToLab(r, g, b) {
    const lin = v => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    const rl = lin(r), gl = lin(g), bl = lin(b);
    let x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047;
    let y = (rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750) / 1.00000;
    let z = (rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041) / 1.08883;
    const f = t => (t > 0.008856 ? Math.cbrt(t) : (7.787 * t + 16 / 116));
    x = f(x); y = f(y); z = f(z);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

function findClosestSlotPerceptual(r01, g01, b01, allowedIndices = null) {
    const lab = srgb01ToLab(r01, g01, b01);
    let bestIdx = allowedIndices ? allowedIndices[0] : 0;
    let minD = Infinity;
    const list = allowedIndices || slotLabs.map((_, i) => i);
    for (let i = 0; i < list.length; i++) {
        const idx = list[i];
        const sLab = slotLabs[idx];
        if (!sLab) continue;
        const dL = lab[0] - sLab[0];
        const da = lab[1] - sLab[1];
        const db = lab[2] - sLab[2];
        const dSq = dL * dL + da * da + db * db;
        if (dSq < minD) {
            minD = dSq;
            bestIdx = idx;
        }
    }
    return bestIdx;
}

function getSlotLuminance01(slotIdx) {
    const rgb = slotRgbFloats[slotIdx];
    if (!rgb) return 0.5;
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function refreshSlotRgbFloats() {
    slotRgbFloats = [];
    slotLabs = [];
    for (let i = 0; i < filamentSlots.length; i++) {
        const cleanHex = normalizeHex(filamentSlots[i].color || filamentSlots[i].hex);
        filamentSlots[i].color = cleanHex;
        filamentSlots[i].hex = cleanHex;
        const rgb = hexToRgb(cleanHex);
        const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
        slotRgbFloats.push([r, g, b]);
        slotLabs.push(srgb01ToLab(r, g, b));
    }
}
refreshSlotRgbFloats();

function isColorDark(hex) {
    try {
        const { r, g, b } = hexToRgb(hex);
        return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 130;
    } catch (_) {
        return true;
    }
}

function renderFilamentGrid() {
    if (typeof updateMobileFilamentBar === 'function') updateMobileFilamentBar();
    const grid = document.getElementById('filament-grid');
    if (!grid) return;
    grid.innerHTML = '';
    filamentSlots.forEach((slot, index) => {
        const div = document.createElement('div');
        div.className = `filament-slot ${index === activeSlotIndex ? 'active' : ''}`;
        div.style.backgroundColor = slot.color;
        div.onclick = () => selectSlot(index);
        div.ondblclick = (e) => { e.stopPropagation(); openColorEditor(index); };

        const dark = isColorDark(slot.color);
        div.innerHTML = `
            <span class="slot-number" style="color:${dark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)'};text-shadow:${dark ? '0 1px 2px #000' : 'none'};">#${slot.id}</span>
            <span class="slot-edit-badge" onclick="event.stopPropagation(); openColorEditor(${index})" title="Edit Color"><i data-lucide="edit-2" style="width:10px;height:10px;"></i></span>
            <span class="slot-name" style="color:${dark ? '#fff' : '#0f172a'};text-shadow:${dark ? '0 1px 3px rgba(0,0,0,0.9)' : 'none'};">${slot.name}</span>
        `;
        grid.appendChild(div);
    });
    refreshIcons();
    populateSlotDropdowns();
}

function selectSlot(index) {
    if (index < 0 || index >= filamentSlots.length) return;
    activeSlotIndex = index;
    renderFilamentGrid();
    if (typeof activeTool !== 'undefined' && activeTool === 'eraser' && typeof selectTool === 'function') {
        selectTool('brush');
    }
    if (typeof drawPatternPreview === 'function') drawPatternPreview();
    if (typeof updateMobileFilamentBar === 'function') updateMobileFilamentBar();
}

function addNewFilamentSlot() {
    if (filamentSlots.length >= 16) {
        showToast(currentLang === 'fr' ? "Maximum 16 bobines (4 AMS) supportées." : "Maximum 16 slots (4 AMS) supported.");
        return;
    }
    if (typeof saveHistory === 'function') saveHistory();
    const newId = filamentSlots.length + 1;
    const defaultColors = ["#06B6D4", "#EAB308", "#EC4899", "#8B5CF6", "#14B8A6", "#F43F5E", "#64748B", "#D97706", "#3B82F6", "#A3E635", "#FB923C", "#E2E8F0"];
    const color = defaultColors[(newId - 5 + defaultColors.length) % defaultColors.length] || "#888888";
    filamentSlots.push({
        id: newId,
        name: `Color #${newId}`,
        color: color,
        hex: color,
        type: "PLA Basic"
    });
    refreshSlotRgbFloats();
    activeSlotIndex = filamentSlots.length - 1;
    renderFilamentGrid();
    if (typeof updateStats === 'function') updateStats();
    showToast(currentLang === 'fr' ? `Slot Filament #${newId} ajouté !` : `Filament Slot #${newId} added!`);
}

function removeActiveSlot() {
    if (filamentSlots.length <= 2) {
        showToast(currentLang === 'fr' ? "Au moins 2 slots sont requis." : "At least 2 filament slots required.");
        return;
    }
    const removedIdx = activeSlotIndex;
    if (typeof saveHistory === 'function') saveHistory();
    if (typeof triangleColors !== 'undefined' && triangleColors) {
        for (let f = 0; f < triangleColors.length; f++) {
            if (triangleColors[f] === removedIdx) triangleColors[f] = 0;
            else if (triangleColors[f] > removedIdx) triangleColors[f]--;
        }
    }
    filamentSlots.splice(removedIdx, 1);
    filamentSlots.forEach((s, idx) => s.id = idx + 1);
    refreshSlotRgbFloats();
    activeSlotIndex = Math.max(0, Math.min(filamentSlots.length - 1, removedIdx - 1));
    renderFilamentGrid();
    if (typeof updateMeshVisualColors === 'function') updateMeshVisualColors();
    showToast(currentLang === 'fr' ? "Slot supprimé." : "Slot deleted.");
}

function applyPresetPalette(type) {
    if (typeof saveHistory === 'function') saveHistory();
    if (type === 'studio4') {
        filamentSlots = [
            { id: 1, name: "Jade White", color: "#F8FAFC", hex: "#F8FAFC", type: "PLA Basic" },
            { id: 2, name: "Flame Red", color: "#AD002B", hex: "#AD002B", type: "PLA Basic" },
            { id: 3, name: "Carbon Black", color: "#111827", hex: "#111827", type: "PLA Basic" },
            { id: 4, name: "Emerald Green", color: "#10B981", hex: "#10B981", type: "PLA Basic" }
        ];
    } else if (type === 'studio8') {
        filamentSlots = [
            { id: 1, name: "Jade White", color: "#F8FAFC", hex: "#F8FAFC", type: "PLA Basic" },
            { id: 2, name: "Flame Red", color: "#AD002B", hex: "#AD002B", type: "PLA Basic" },
            { id: 3, name: "Carbon Black", color: "#111827", hex: "#111827", type: "PLA Basic" },
            { id: 4, name: "Emerald Green", color: "#10B981", hex: "#10B981", type: "PLA Basic" },
            { id: 5, name: "Vibrant Orange", color: "#FF6A13", hex: "#FF6A13", type: "PLA Basic" },
            { id: 6, name: "Cobalt Blue", color: "#0047BB", hex: "#0047BB", type: "PLA Basic" },
            { id: 7, name: "Solar Yellow", color: "#FFD100", hex: "#FFD100", type: "PLA Basic" },
            { id: 8, name: "Imperial Gold", color: "#D4AF37", hex: "#D4AF37", type: "PLA Silk" }
        ];
    } else if (type === 'cyberpunk') {
        filamentSlots = [
            { id: 1, name: "Neon Cyan", color: "#06B6D4", hex: "#06B6D4", type: "PLA Basic" },
            { id: 2, name: "Hot Magenta", color: "#EC4899", hex: "#EC4899", type: "PLA Basic" },
            { id: 3, name: "Laser Yellow", color: "#EAB308", hex: "#EAB308", type: "PLA Basic" },
            { id: 4, name: "Deep Violet", color: "#581C87", hex: "#581C87", type: "PLA Basic" }
        ];
    } else if (type === 'earth') {
        filamentSlots = [
            { id: 1, name: "Birch Wood", color: "#D7C4A3", hex: "#D7C4A3", type: "PLA Basic" },
            { id: 2, name: "Forest Olive", color: "#556B2F", hex: "#556B2F", type: "PLA Basic" },
            { id: 3, name: "Terracotta", color: "#C86446", hex: "#C86446", type: "PLA Basic" },
            { id: 4, name: "Walnut Dark", color: "#3D2314", hex: "#3D2314", type: "PLA Basic" }
        ];
    } else if (type === 'pastel') {
        filamentSlots = [
            { id: 1, name: "Baby Pink", color: "#FBCFE8", hex: "#FBCFE8", type: "PLA Matte" },
            { id: 2, name: "Pastel Mint", color: "#A7F3D0", hex: "#A7F3D0", type: "PLA Matte" },
            { id: 3, name: "Sky Blue", color: "#BAE6FD", hex: "#BAE6FD", type: "PLA Matte" },
            { id: 4, name: "Lavender", color: "#E9D5FF", hex: "#E9D5FF", type: "PLA Matte" }
        ];
    }
    if (typeof triangleColors !== 'undefined' && triangleColors) {
        for (let f = 0; f < triangleColors.length; f++) {
            if (triangleColors[f] >= filamentSlots.length) triangleColors[f] = triangleColors[f] % filamentSlots.length;
        }
    }
    refreshSlotRgbFloats();
    activeSlotIndex = 0;
    renderFilamentGrid();
    if (typeof updateMeshVisualColors === 'function') updateMeshVisualColors();
    showToast(currentLang === 'fr' ? "Palette prédéfinie appliquée !" : "Preset palette applied!");
}

// K-Means++ inspired palette extractor from image
function extractPaletteFromImage(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 120; canvas.height = 120;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, 120, 120);
            const data = ctx.getImageData(0, 0, 120, 120).data;

            const samples = [];
            for (let i = 0; i < data.length; i += 16) {
                if (data[i + 3] < 64) continue;
                samples.push([data[i], data[i + 1], data[i + 2]]);
            }
            if (samples.length < 4) {
                showToast(currentLang === 'fr' ? "Image vide ou transparente." : "Image is empty or transparent.");
                return;
            }

            const kCount = Math.min(8, Math.max(4, filamentSlots.length));
            const centers = [samples[0]];
            while (centers.length < kCount) {
                let farthest = samples[0], maxDist = -1;
                for (let s = 0; s < samples.length; s += 3) {
                    let minC = Infinity;
                    for (let c = 0; c < centers.length; c++) {
                        const d = (samples[s][0] - centers[c][0]) ** 2 + (samples[s][1] - centers[c][1]) ** 2 + (samples[s][2] - centers[c][2]) ** 2;
                        if (d < minC) minC = d;
                    }
                    if (minC > maxDist) { maxDist = minC; farthest = samples[s]; }
                }
                centers.push(farthest.slice());
            }

            for (let iter = 0; iter < 6; iter++) {
                const sums = Array.from({ length: kCount }, () => [0, 0, 0, 0]);
                for (let s = 0; s < samples.length; s++) {
                    const p = samples[s];
                    let minD = Infinity, bestC = 0;
                    for (let c = 0; c < kCount; c++) {
                        const d = (p[0] - centers[c][0]) ** 2 + (p[1] - centers[c][1]) ** 2 + (p[2] - centers[c][2]) ** 2;
                        if (d < minD) { minD = d; bestC = c; }
                    }
                    sums[bestC][0] += p[0]; sums[bestC][1] += p[1]; sums[bestC][2] += p[2]; sums[bestC][3]++;
                }
                for (let c = 0; c < kCount; c++) {
                    if (sums[c][3] > 0) {
                        centers[c] = [
                            Math.round(sums[c][0] / sums[c][3]),
                            Math.round(sums[c][1] / sums[c][3]),
                            Math.round(sums[c][2] / sums[c][3])
                        ];
                    }
                }
            }

            if (typeof saveHistory === 'function') saveHistory();
            filamentSlots = centers.map((c, idx) => {
                const hex = rgbToHex(c[0], c[1], c[2]);
                return { id: idx + 1, name: `Extracted #${idx + 1}`, color: hex, hex: hex, type: "PLA Basic" };
            });
            refreshSlotRgbFloats();
            activeSlotIndex = 0;
            renderFilamentGrid();
            if (typeof updateMeshVisualColors === 'function') updateMeshVisualColors();
            showToast(currentLang === 'fr' ? "Palette extraite de l'image !" : "Palette extracted from image!");
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
}

function populateSlotDropdowns() {
    const selects = ['relief-base-slot', 'relief-emboss-slot', 'cavity-slot-select', 'swap-slot-a', 'swap-slot-b', 'text-color-slot', 'stencil-color-slot'];
    selects.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const prevVal = parseInt(el.value, 10);
        el.innerHTML = '';
        filamentSlots.forEach((slot, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = `#${slot.id} - ${slot.name} (${slot.color})`;
            el.appendChild(opt);
        });
        if (!isNaN(prevVal) && prevVal >= 0 && prevVal < filamentSlots.length) {
            el.value = prevVal;
        } else if (id === 'relief-base-slot') el.value = 0;
        else if (id === 'relief-emboss-slot') el.value = Math.min(1, filamentSlots.length - 1);
        else if (id === 'cavity-slot-select') el.value = Math.min(2, filamentSlots.length - 1);
        else if (id === 'swap-slot-b') el.value = Math.min(1, filamentSlots.length - 1);
        else if (id === 'text-color-slot') el.value = Math.min(1, filamentSlots.length - 1);
        else if (id === 'stencil-color-slot') el.value = Math.min(activeSlotIndex, filamentSlots.length - 1);
    });
}

// ==========================================
// 🎨 TRUE HSV IN-APP COLOR PICKER ENGINE (FIXED!)
// ==========================================
let editingSlotIndex = 1;
let pickerHue = 0;
let pickerSat = 1;
let pickerVal = 1;
let spectrumListenersInitialized = false;

function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max;
    if (d !== 0) {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h * 360, s, v };
}

function hsvToHex(h, s, v) {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(1, s));
    v = Math.max(0, Math.min(1, v));
    const i = Math.floor(h / 60) % 6;
    const f = h / 60 - Math.floor(h / 60);
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    let r = 0, g = 0, b = 0;
    switch (i) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }
    return rgbToHex(r * 255, g * 255, b * 255);
}

function openColorEditor(slotIdx) {
    editingSlotIndex = slotIdx !== undefined ? slotIdx : activeSlotIndex;
    const slot = filamentSlots[editingSlotIndex];
    if (!slot) return;

    const titleEl = document.getElementById('color-editor-title');
    if (titleEl) titleEl.innerText = `${translations[currentLang].btnEditColor} Slot #${slot.id} (${slot.name})`;
    document.getElementById('modal-slot-name').value = slot.name;
    document.getElementById('modal-slot-type').value = slot.type || "PLA Basic";

    setPickerFromHex(slot.color);
    drawSpectrum();
    switchCatalogTab('studio-pla');
    document.getElementById('color-editor-modal').style.display = 'flex';
}

function closeColorEditor() {
    document.getElementById('color-editor-modal').style.display = 'none';
    if (colorUpdateRaf) cancelAnimationFrame(colorUpdateRaf);
    // Rollback live preview if user clicked Cancel!
    if (typeof updateMeshVisualColors === 'function') updateMeshVisualColors();
}

function applyColorEditor() {
    const rawHex = document.getElementById('modal-hex-input').value.trim();
    const fallback = filamentSlots[editingSlotIndex] ? filamentSlots[editingSlotIndex].color : '#FFFFFF';
    const hex = normalizeHex(rawHex, fallback);
    const name = document.getElementById('modal-slot-name').value.trim() || hex;
    const type = document.getElementById('modal-slot-type').value;

    if (typeof saveHistory === 'function') saveHistory();
    filamentSlots[editingSlotIndex].color = hex;
    filamentSlots[editingSlotIndex].hex = hex;
    filamentSlots[editingSlotIndex].name = name;
    filamentSlots[editingSlotIndex].type = type;

    refreshSlotRgbFloats();
    renderFilamentGrid();
    updateSingleSlotColor(editingSlotIndex);
    document.getElementById('color-editor-modal').style.display = 'none';
    showToast(`Slot #${filamentSlots[editingSlotIndex].id}: ${name}`);
}

function switchCatalogTab(tab) {
    document.querySelectorAll('.cat-tab-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('tab-' + tab);
    if (btn) btn.classList.add('active');

    const grid = document.getElementById('catalog-swatches-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const swatches = filamentCatalogs[tab] || [];
    swatches.forEach(s => {
        const chip = document.createElement('div');
        chip.className = 'swatch-chip';
        chip.style.backgroundColor = s.hex;
        chip.title = `${s.name} (${s.hex})`;
        chip.onclick = () => {
            setPickerFromHex(s.hex);
            document.getElementById('modal-slot-name').value = s.name;
            updateSingleSlotColorLive(editingSlotIndex, s.hex);
        };
        grid.appendChild(chip);
    });
}

function setPickerFromHex(hex) {
    const clean = normalizeHex(hex, '#FFFFFF');
    const rgb = hexToRgb(clean);
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    // Keep previous hue if color is greyscale (saturation 0)
    if (hsv.s > 0.001) pickerHue = hsv.h;
    pickerSat = hsv.s;
    pickerVal = hsv.v;
    const hueSlider = document.getElementById('color-hue-slider');
    if (hueSlider) hueSlider.value = pickerHue;
    updateModalColorInputs(clean, rgb.r, rgb.g, rgb.b);
    drawSpectrum();
}

function drawSpectrum() {
    const canvas = document.getElementById('color-spectrum-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;

    ctx.fillStyle = `hsl(${pickerHue}, 100%, 50%)`;
    ctx.fillRect(0, 0, w, h);

    const whiteGrad = ctx.createLinearGradient(0, 0, w, 0);
    whiteGrad.addColorStop(0, 'rgba(255,255,255,1)');
    whiteGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = whiteGrad;
    ctx.fillRect(0, 0, w, h);

    const blackGrad = ctx.createLinearGradient(0, 0, 0, h);
    blackGrad.addColorStop(0, 'rgba(0,0,0,0)');
    blackGrad.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = blackGrad;
    ctx.fillRect(0, 0, w, h);

    const cursor = document.getElementById('color-wheel-cursor');
    if (cursor) {
        cursor.style.left = `${Math.max(0, Math.min(100, pickerSat * 100))}%`;
        cursor.style.top = `${Math.max(0, Math.min(100, (1 - pickerVal) * 100))}%`;
    }
}

function setupSpectrumInteractions() {
    if (spectrumListenersInitialized) return;
    const wrapper = document.getElementById('color-spectrum-wrapper');
    if (!wrapper) return;
    spectrumListenersInitialized = true;
    let isDragging = false;

    function handlePos(e) {
        const rect = wrapper.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
        pickerSat = x / rect.width;
        pickerVal = 1 - (y / rect.height);

        const hex = hsvToHex(pickerHue, pickerSat, pickerVal);
        const rgb = hexToRgb(hex);
        updateModalColorInputs(hex, rgb.r, rgb.g, rgb.b);
        drawSpectrum();
        updateSingleSlotColorLive(editingSlotIndex, hex);
    }

    wrapper.addEventListener('pointerdown', (e) => { isDragging = true; handlePos(e); });
    window.addEventListener('pointermove', (e) => { if (isDragging) handlePos(e); });
    window.addEventListener('pointerup', () => { isDragging = false; });
}

function onHueSliderInput(val) {
    pickerHue = parseFloat(val) || 0;
    const hex = hsvToHex(pickerHue, pickerSat, pickerVal);
    const rgb = hexToRgb(hex);
    updateModalColorInputs(hex, rgb.r, rgb.g, rgb.b);
    drawSpectrum();
    updateSingleSlotColorLive(editingSlotIndex, hex);
}

function onHexTextInput(val) {
    const trimmed = val.trim();
    const withHash = trimmed.startsWith('#') ? trimmed : ('#' + trimmed);
    if (/^#[0-9A-Fa-f]{6}$/.test(withHash)) {
        setPickerFromHex(withHash);
        updateSingleSlotColorLive(editingSlotIndex, withHash);
    }
}

function onRgbNumberInput() {
    const r = Math.max(0, Math.min(255, parseInt(document.getElementById('modal-r-input').value, 10) || 0));
    const g = Math.max(0, Math.min(255, parseInt(document.getElementById('modal-g-input').value, 10) || 0));
    const b = Math.max(0, Math.min(255, parseInt(document.getElementById('modal-b-input').value, 10) || 0));
    const hex = rgbToHex(r, g, b);
    setPickerFromHex(hex);
    updateSingleSlotColorLive(editingSlotIndex, hex);
}

function updateModalColorInputs(hex, r, g, b) {
    document.getElementById('modal-swatch-current').style.backgroundColor = hex;
    document.getElementById('modal-hex-input').value = hex.toUpperCase();
    document.getElementById('modal-r-input').value = Math.round(r);
    document.getElementById('modal-g-input').value = Math.round(g);
    document.getElementById('modal-b-input').value = Math.round(b);
}

async function pickColorFromScreen() {
    if ('EyeDropper' in window) {
        try {
            const dropper = new EyeDropper();
            const result = await dropper.open();
            if (result && result.sRGBHex) {
                setPickerFromHex(result.sRGBHex);
                updateSingleSlotColorLive(editingSlotIndex, result.sRGBHex);
            }
        } catch (_) {}
    } else {
        showToast(currentLang === 'fr' ? "Pipette d'écran non supportée par ce navigateur." : "Screen eyedropper is not supported in this browser.");
    }
}

let colorUpdateRaf = null;
function updateSingleSlotColorLive(slotIdx, newHex) {
    if (colorUpdateRaf) cancelAnimationFrame(colorUpdateRaf);
    colorUpdateRaf = requestAnimationFrame(() => {
        if (!currentMesh || !triangleColors) return;
        const rgb = hexToRgb(newHex);
        const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
        const geom = currentMesh.geometry;
        const colorAttr = geom.attributes.color;
        if (!colorAttr) return;
        const colArr = colorAttr.array;
        const faceCount = triangleColors.length;

        for (let f = 0; f < faceCount; f++) {
            if (triangleColors[f] === slotIdx) {
                const base = f * 9;
                colArr[base] = r; colArr[base + 1] = g; colArr[base + 2] = b;
                colArr[base + 3] = r; colArr[base + 4] = g; colArr[base + 5] = b;
                colArr[base + 6] = r; colArr[base + 7] = g; colArr[base + 8] = b;
            }
        }
        colorAttr.needsUpdate = true;
    });
}

function updateSingleSlotColor(slotIdx) {
    if (!currentMesh || !triangleColors) return;
    const rgb = slotRgbFloats[slotIdx];
    if (!rgb) return;
    const geom = currentMesh.geometry;
    const colorAttr = geom.attributes.color;
    if (!colorAttr) return;
    const colArr = colorAttr.array;
    const faceCount = triangleColors.length;

    for (let f = 0; f < faceCount; f++) {
        if (triangleColors[f] === slotIdx) {
            const base = f * 9;
            colArr[base] = rgb[0]; colArr[base + 1] = rgb[1]; colArr[base + 2] = rgb[2];
            colArr[base + 3] = rgb[0]; colArr[base + 4] = rgb[1]; colArr[base + 5] = rgb[2];
            colArr[base + 6] = rgb[0]; colArr[base + 7] = rgb[1]; colArr[base + 8] = rgb[2];
        }
    }
    colorAttr.needsUpdate = true;
}

function openSwapModal() {
    populateSlotDropdowns();
    document.getElementById('swap-modal').style.display = 'flex';
}

function closeSwapModal() {
    document.getElementById('swap-modal').style.display = 'none';
}

function executeSwapSlots() {
    if (!triangleColors) return;
    if (typeof saveHistory === 'function') saveHistory();
    const slotA = parseInt(document.getElementById('swap-slot-a').value, 10);
    const slotB = parseInt(document.getElementById('swap-slot-b').value, 10);
    if (slotA === slotB) return;

    for (let f = 0; f < triangleColors.length; f++) {
        if (triangleColors[f] === slotA) triangleColors[f] = slotB;
        else if (triangleColors[f] === slotB) triangleColors[f] = slotA;
    }
    if (typeof updateMeshVisualColors === 'function') updateMeshVisualColors();
    closeSwapModal();
    showToast(`Slots #${slotA + 1} ⇄ #${slotB + 1}`);
}

function executeReplaceSlot() {
    if (!triangleColors) return;
    if (typeof saveHistory === 'function') saveHistory();
    const slotA = parseInt(document.getElementById('swap-slot-a').value, 10);
    const slotB = parseInt(document.getElementById('swap-slot-b').value, 10);
    if (slotA === slotB) return;

    for (let f = 0; f < triangleColors.length; f++) {
        if (triangleColors[f] === slotA) triangleColors[f] = slotB;
    }
    if (typeof updateMeshVisualColors === 'function') updateMeshVisualColors();
    closeSwapModal();
    showToast(`Slot #${slotA + 1} ➔ #${slotB + 1}`);
}
