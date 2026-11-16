// ==========================================
// QR PAYLOAD PARSER, DUAL-SIDED PRESET ENGINE & PRINTABILITY VALIDATOR
// ==========================================

const PRESETS_DATA = {
    wifi: {
        ssid: 'Guest_WiFi',
        pass: 'Welcome2026!',
        auth: 'WPA',
        hidden: false,
        topText: 'FREE WI-FI',
        bottomText: 'PASS: Welcome2026!',
        defaultBadge: 'wifi'
    },
    instagram: {
        user: 'studios.pro',
        topText: 'FOLLOW US',
        bottomText: '@studios.pro',
        defaultBadge: 'instagram'
    },
    menu: {
        url: 'https://studios-pro.com/menu',
        topText: 'DIGITAL MENU',
        bottomText: 'SCAN FOR SPECIALS',
        defaultBadge: 'menu'
    },
    review: {
        url: 'https://g.page/review/studios-pro',
        topText: 'LEAVE A REVIEW',
        bottomText: '★★★★★ 5 STARS',
        defaultBadge: 'star'
    },
    spotify: {
        url: 'https://open.spotify.com/playlist/studiospro',
        topText: 'SCAN TO LISTEN',
        bottomText: "TODAY'S PLAYLIST",
        defaultBadge: 'spotify'
    },
    payment: {
        url: 'https://paypal.me/studiospro',
        topText: 'TIPS & PAYMENT',
        bottomText: 'THANK YOU!',
        defaultBadge: 'heart'
    },
    whatsapp: {
        phone: '+40712345678',
        msg: 'Hello! I would like to inquire.',
        topText: 'CHAT ON WHATSAPP',
        bottomText: 'INSTANT SUPPORT',
        defaultBadge: 'wifi'
    },
    vcard: {
        name: 'Alexandre Dupont',
        phone: '+33612345678',
        email: 'contact@studios-pro.com',
        company: 'Studios Pro Design',
        topText: 'DIGITAL BUSINESS CARD',
        bottomText: 'SAVE CONTACT INFO',
        defaultBadge: 'none'
    },
    url: {
        url: 'https://studios-pro.com',
        topText: 'SCAN QR CODE',
        bottomText: 'STUDIOS-PRO.COM',
        defaultBadge: 'none'
    }
};

let activePreset = 'wifi';
let badgeType = 'none';
let qrECCLevel = 'H';
let qrPixelStyle = 'square'; // 'square' | 'dots' | 'connected'
let customBadgeImg = null;
let currentQRMatrix = [];

// Dual-Sided Coaster State (Complete per-side form fields + QR matrix)
let isDualSided = false;
let activeSide = 'A';
let isFlipped180 = false;

function makeDefaultSideState(presetKey) {
    const p = PRESETS_DATA[presetKey] || PRESETS_DATA.wifi;
    return {
        preset: presetKey,
        topText: p.topText,
        bottomText: p.bottomText,
        badge: p.defaultBadge || 'none',
        fields: { ...p },
        qrMatrix: []
    };
}

let sideAData = makeDefaultSideState('wifi');
let sideBData = makeDefaultSideState('menu');

function escapeWifiField(str) {
    return String(str ?? '').replace(/([\\;,:"])/g, '\\$1');
}

function readCurrentFormFields() {
    const fields = {};
    if (activePreset === 'wifi') {
        fields.ssid = document.getElementById('input-wifi-ssid')?.value ?? 'Guest_WiFi';
        fields.pass = document.getElementById('input-wifi-pass')?.value ?? 'Welcome2026!';
        fields.auth = document.getElementById('select-wifi-auth')?.value ?? 'WPA';
        fields.hidden = !!document.getElementById('chk-wifi-hidden')?.checked;
    } else if (activePreset === 'instagram') {
        fields.user = document.getElementById('input-insta-user')?.value ?? 'studios.pro';
    } else if (activePreset === 'whatsapp') {
        fields.phone = document.getElementById('input-wa-phone')?.value ?? '+40712345678';
        fields.msg = document.getElementById('input-wa-msg')?.value ?? '';
    } else if (activePreset === 'vcard') {
        fields.name = document.getElementById('input-vcard-name')?.value ?? 'Alexandre Dupont';
        fields.phone = document.getElementById('input-vcard-phone')?.value ?? '+33612345678';
        fields.email = document.getElementById('input-vcard-email')?.value ?? 'contact@studios-pro.com';
        fields.company = document.getElementById('input-vcard-company')?.value ?? 'Studios Pro Design';
    } else {
        fields.url = document.getElementById('input-generic-url')?.value ?? (PRESETS_DATA[activePreset]?.url || 'https://studios-pro.com');
    }
    return fields;
}

function selectPreset(presetKey, preservedFields = null, preservedTop = null, preservedBottom = null, preservedBadge = null) {
    activePreset = PRESETS_DATA[presetKey] ? presetKey : 'wifi';
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById('preset-' + activePreset);
    if (activeBtn) activeBtn.classList.add('active');

    const data = PRESETS_DATA[activePreset];
    const topEl = document.getElementById('input-top-text');
    const btmEl = document.getElementById('input-bottom-text');
    if (topEl) topEl.value = preservedTop !== null ? preservedTop : data.topText;
    if (btmEl) btmEl.value = preservedBottom !== null ? preservedBottom : data.bottomText;

    const targetBadge = preservedBadge !== null ? preservedBadge : data.defaultBadge;
    badgeType = targetBadge || 'none';
    document.querySelectorAll('.badge-btn').forEach(b => b.classList.remove('active'));
    const bEl = document.getElementById('badge-' + badgeType);
    if (bEl) bEl.classList.add('active');

    renderPresetForm(preservedFields);
    updateQRData();
}

function renderPresetForm(overrideFields = null) {
    const container = document.getElementById('dynamic-form');
    if (!container) return;
    const p = activePreset;
    const f = overrideFields || PRESETS_DATA[p] || {};
    const escAttr = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    let html = '';

    if (p === 'wifi') {
        const ssid = escAttr(f.ssid ?? 'Guest_WiFi');
        const pass = escAttr(f.pass ?? 'Welcome2026!');
        const auth = f.auth || 'WPA';
        const hiddenChecked = f.hidden ? 'checked' : '';
        html = `
            <div class="input-group">
                <label class="input-label" data-i18n="labelSSID">${t('labelSSID', 'Network Name (SSID):')}</label>
                <input type="text" class="text-input" id="input-wifi-ssid" value="${ssid}" oninput="updateQRData()">
            </div>
            <div class="input-group">
                <label class="input-label" data-i18n="labelPass">${t('labelPass', 'Password:')}</label>
                <input type="text" class="text-input" id="input-wifi-pass" value="${pass}" oninput="updateQRData(); syncWifiBottomPass(this.value)">
            </div>
            <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;">
                <div class="input-group" style="margin-bottom:0;">
                    <label class="input-label" data-i18n="labelAuth">${t('labelAuth', 'Security Type:')}</label>
                    <select class="text-input" id="select-wifi-auth" onchange="updateQRData()" style="cursor:pointer;">
                        <option value="WPA" ${auth === 'WPA' ? 'selected' : ''}>WPA / WPA2 / WPA3</option>
                        <option value="WEP" ${auth === 'WEP' ? 'selected' : ''}>WEP (Legacy)</option>
                        <option value="nopass" ${auth === 'nopass' ? 'selected' : ''}>None (Open)</option>
                    </select>
                </div>
                <label class="checkbox-label" style="margin-top:16px;">
                    <input type="checkbox" id="chk-wifi-hidden" ${hiddenChecked} onchange="updateQRData()">
                    <span data-i18n="labelHidden">${t('labelHidden', 'Hidden')}</span>
                </label>
            </div>
        `;
    } else if (p === 'instagram') {
        html = `
            <div class="input-group">
                <label class="input-label" data-i18n="labelUsername">${t('labelUsername', 'Instagram Username:')}</label>
                <input type="text" class="text-input" id="input-insta-user" value="${escAttr(f.user ?? 'studios.pro')}" oninput="updateQRData(); syncInstaBottom(this.value)">
            </div>
        `;
    } else if (p === 'whatsapp') {
        html = `
            <div class="input-group">
                <label class="input-label" data-i18n="labelPhone">${t('labelPhone', 'Phone:')}</label>
                <input type="text" class="text-input" id="input-wa-phone" value="${escAttr(f.phone ?? '+40712345678')}" oninput="updateQRData()">
            </div>
            <div class="input-group">
                <label class="input-label" data-i18n="labelWhatsAppMsg">${t('labelWhatsAppMsg', 'Pre-filled Message:')}</label>
                <input type="text" class="text-input" id="input-wa-msg" value="${escAttr(f.msg ?? '')}" oninput="updateQRData()">
            </div>
        `;
    } else if (p === 'vcard') {
        html = `
            <div class="input-group">
                <label class="input-label" data-i18n="labelFullName">${t('labelFullName', 'Full Name:')}</label>
                <input type="text" class="text-input" id="input-vcard-name" value="${escAttr(f.name ?? 'Alexandre Dupont')}" oninput="updateQRData()">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div class="input-group">
                    <label class="input-label" data-i18n="labelPhone">${t('labelPhone', 'Phone:')}</label>
                    <input type="text" class="text-input" id="input-vcard-phone" value="${escAttr(f.phone ?? '+33612345678')}" oninput="updateQRData()">
                </div>
                <div class="input-group">
                    <label class="input-label" data-i18n="labelEmail">${t('labelEmail', 'Email:')}</label>
                    <input type="text" class="text-input" id="input-vcard-email" value="${escAttr(f.email ?? 'contact@studios-pro.com')}" oninput="updateQRData()">
                </div>
            </div>
            <div class="input-group">
                <label class="input-label" data-i18n="labelCompany">${t('labelCompany', 'Company / Venue:')}</label>
                <input type="text" class="text-input" id="input-vcard-company" value="${escAttr(f.company ?? 'Studios Pro Design')}" oninput="updateQRData()">
            </div>
        `;
    } else {
        const defVal = escAttr(f.url ?? PRESETS_DATA[p]?.url ?? 'https://studios-pro.com');
        html = `
            <div class="input-group">
                <label class="input-label" data-i18n="labelUrl">${t('labelUrl', 'Website / Menu Link:')}</label>
                <input type="text" class="text-input" id="input-generic-url" value="${defVal}" oninput="updateQRData()">
            </div>
        `;
    }

    container.innerHTML = html;
}

function syncWifiBottomPass(val) {
    const b = document.getElementById('input-bottom-text');
    if (b) {
        b.value = val ? ('PASS: ' + val) : 'OPEN NETWORK';
        if (typeof rebuild3DModel === 'function') rebuild3DModel();
    }
}

function syncInstaBottom(val) {
    const b = document.getElementById('input-bottom-text');
    if (b) {
        b.value = '@' + val.replace('@', '');
        if (typeof rebuild3DModel === 'function') rebuild3DModel();
    }
}

function setBadge(type) {
    badgeType = type || 'none';
    document.querySelectorAll('.badge-btn').forEach(b => b.classList.remove('active'));
    const activeEl = document.getElementById('badge-' + badgeType);
    if (activeEl) activeEl.classList.add('active');

    // Protect QR readability: center logo requires higher redundancy (Q or H)
    if (badgeType !== 'none' && qrECCLevel === 'L') {
        qrECCLevel = 'H';
        const sel = document.getElementById('select-ecc');
        if (sel) sel.value = 'H';
        updateQRECCLabel('H');
        if (typeof showToast === 'function') {
            showToast(currentLang === 'fr'
                ? "ECC automatiquement monté à H (30%) pour sécuriser le logo central !"
                : "ECC auto-upgraded to High 'H' (30%) to keep center logo 100% scannable!");
        }
    }
    updateQRData();
}

function handleCustomBadgeUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (evt) {
        const img = new Image();
        img.onload = function () {
            customBadgeImg = img;
            setBadge('custom');
        };
        img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
}

function updateQRECCLabel(val) {
    const labelMap = {
        'H': "High 'H' (30% Logo Safe)",
        'Q': "Level 'Q' (25% Redundant)",
        'M': "Level 'M' (15% Standard)",
        'L': "Level 'L' (7% Compact)"
    };
    const lbl = document.getElementById('val-ecc');
    if (lbl) lbl.innerText = labelMap[val] || val;
}

function updateQRECC(val) {
    qrECCLevel = val || 'H';
    updateQRECCLabel(qrECCLevel);
    updateQRData();
}

function setQRStyle(style) {
    qrPixelStyle = style || 'square';
    ['square', 'dots', 'connected'].forEach(s => {
        const btn = document.getElementById('qr-style-' + s);
        if (btn) btn.classList.toggle('active', s === qrPixelStyle);
    });
    if (typeof currentQRMatrix !== 'undefined' && currentQRMatrix.length > 0) {
        render2DPreview();
    }
    if (typeof rebuild3DModel === 'function') rebuild3DModel();
}

function getQRString() {
    const p = activePreset;
    if (p === 'wifi') {
        const ssid = (document.getElementById('input-wifi-ssid')?.value || 'Guest_WiFi').trim();
        const pass = (document.getElementById('input-wifi-pass')?.value || '').trim();
        const auth = document.getElementById('select-wifi-auth')?.value || 'WPA';
        const hidden = !!document.getElementById('chk-wifi-hidden')?.checked;
        let out = `WIFI:T:${auth};S:${escapeWifiField(ssid)};`;
        if (auth !== 'nopass') out += `P:${escapeWifiField(pass)};`;
        if (hidden) out += `H:true;`;
        return out + ';';
    } else if (p === 'instagram') {
        const user = (document.getElementById('input-insta-user')?.value || 'studios.pro').trim().replace(/^@/, '');
        return `https://instagram.com/${user}`;
    } else if (p === 'whatsapp') {
        const phone = (document.getElementById('input-wa-phone')?.value || '+40712345678').trim().replace(/[^0-9]/g, '');
        const msg = (document.getElementById('input-wa-msg')?.value || '').trim();
        return msg ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/${phone}`;
    } else if (p === 'vcard') {
        const name = (document.getElementById('input-vcard-name')?.value || 'Alexandre Dupont').trim();
        const phone = (document.getElementById('input-vcard-phone')?.value || '').trim();
        const email = (document.getElementById('input-vcard-email')?.value || '').trim();
        const company = (document.getElementById('input-vcard-company')?.value || '').trim();
        const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${name}`];
        if (company) lines.push(`ORG:${company}`);
        if (phone) lines.push(`TEL:${phone}`);
        if (email) lines.push(`EMAIL:${email}`);
        lines.push('END:VCARD');
        return lines.join('\n');
    } else {
        return (document.getElementById('input-generic-url')?.value || 'https://studios-pro.com').trim();
    }
}

function isFinderModule(r, c, M) {
    // 7x7 corner finders + 1-module white separator
    if (r < 8 && c < 8) return true;
    if (r < 8 && c >= M - 8) return true;
    if (r >= M - 8 && c < 8) return true;
    return false;
}

function generateMatrixFromPayload(rawData, eccLevel = qrECCLevel, withBadge = badgeType) {
    const qr = qrcode(0, eccLevel);
    qr.addData(rawData);
    qr.make();
    const M = qr.getModuleCount();
    const matrix = [];
    for (let r = 0; r < M; r++) {
        const row = [];
        for (let c = 0; c < M; c++) row.push(qr.isDark(r, c));
        matrix.push(row);
    }

    let clearedModules = 0;
    const totalDataModules = Math.max(1, M * M - 192);
    if (withBadge !== 'none') {
        const center = (M - 1) / 2;
        const maxRadiusByEcc = (eccLevel === 'H') ? 0.14 : (eccLevel === 'Q' ? 0.12 : 0.08);
        const badgeModuleRadius = Math.max(2.2, M * maxRadiusByEcc);
        for (let r = 0; r < M; r++) {
            for (let c = 0; c < M; c++) {
                if (isFinderModule(r, c, M)) continue;
                const dist = Math.hypot(r - center, c - center);
                if (dist <= badgeModuleRadius + 0.25) {
                    matrix[r][c] = false;
                    clearedModules++;
                }
            }
        }
    }

    return {
        matrix,
        moduleCount: M,
        clearedRatio: clearedModules / totalDataModules
    };
}

function updateQRData() {
    const rawData = getQRString();
    try {
        const built = generateMatrixFromPayload(rawData, qrECCLevel, badgeType);
        currentQRMatrix = built.matrix;

        if (activeSide === 'A') {
            sideAData.preset = activePreset;
            sideAData.topText = document.getElementById('input-top-text')?.value || '';
            sideAData.bottomText = document.getElementById('input-bottom-text')?.value || '';
            sideAData.badge = badgeType;
            sideAData.fields = readCurrentFormFields();
            sideAData.qrMatrix = built.matrix;
        } else {
            sideBData.preset = activePreset;
            sideBData.topText = document.getElementById('input-top-text')?.value || '';
            sideBData.bottomText = document.getElementById('input-bottom-text')?.value || '';
            sideBData.badge = badgeType;
            sideBData.fields = readCurrentFormFields();
            sideBData.qrMatrix = built.matrix;
        }

        render2DPreview();
        updatePrintabilityBadge(built.clearedRatio);
        if (typeof rebuild3DModel === 'function') rebuild3DModel();
    } catch (err) {
        console.error('QR Code generation error:', err);
    }
}

function updatePrintabilityBadge(clearedRatio = 0) {
    const pill = document.getElementById('scan-nozzle-pill');
    if (!pill || !currentQRMatrix.length) return;
    const size = parseFloat(document.getElementById('slider-size')?.value || 100);
    const shape = typeof currentShape !== 'undefined' ? currentShape : 'circle';
    const effSize = (shape === 'keychain') ? size * 0.6 : size;
    const qrArea = effSize * 0.58;
    const pixelMm = qrArea / currentQRMatrix.length;
    const isFr = currentLang === 'fr';

    const eccLimits = { L: 0.05, M: 0.12, Q: 0.20, H: 0.26 };
    if (badgeType !== 'none' && clearedRatio > (eccLimits[qrECCLevel] || 0.25)) {
        pill.className = 'scan-nozzle-pill contrast-danger';
        pill.textContent = isFr ? `⚠ Logo trop grand pour ECC ${qrECCLevel}` : `⚠ Logo exceeds ECC ${qrECCLevel} limit`;
        return;
    }

    if (pixelMm < 0.72) {
        pill.className = 'scan-nozzle-pill contrast-danger';
        pill.textContent = isFr
            ? `${pixelMm.toFixed(2)} mm/px • Buse 0.2mm requise`
            : `${pixelMm.toFixed(2)} mm/px • Use 0.2mm nozzle`;
    } else if (pixelMm < 0.92) {
        pill.className = 'scan-nozzle-pill contrast-warn';
        pill.textContent = isFr
            ? `${pixelMm.toFixed(2)} mm/px • Détail fin (0.4mm)`
            : `${pixelMm.toFixed(2)} mm/px • Fine detail (0.4mm)`;
    } else {
        pill.className = 'scan-nozzle-pill contrast-good';
        pill.textContent = isFr
            ? `${pixelMm.toFixed(2)} mm/px • Buse 0.4mm OK`
            : `${pixelMm.toFixed(2)} mm/px • 0.4mm Nozzle OK`;
    }
}

function render2DPreview() {
    const container = document.getElementById('qr-preview-canvas');
    if (!container || !currentQRMatrix.length) return;
    container.innerHTML = '';

    const canvas = document.createElement('canvas');
    const M = currentQRMatrix.length;
    const scale = Math.max(4, Math.floor(136 / M));
    const size = M * scale;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000000';

    for (let r = 0; r < M; r++) {
        for (let c = 0; c < M; c++) {
            if (!currentQRMatrix[r][c]) continue;
            const x = c * scale;
            const y = r * scale;
            if (qrPixelStyle === 'dots' && !isFinderModule(r, c, M)) {
                ctx.beginPath();
                ctx.arc(x + scale * 0.5, y + scale * 0.5, scale * 0.43, 0, Math.PI * 2);
                ctx.fill();
            } else if (qrPixelStyle === 'connected' && !isFinderModule(r, c, M)) {
                ctx.beginPath();
                ctx.arc(x + scale * 0.5, y + scale * 0.5, scale * 0.46, 0, Math.PI * 2);
                ctx.fill();
                if (c + 1 < M && currentQRMatrix[r][c + 1]) ctx.fillRect(x + scale * 0.5, y + scale * 0.08, scale, scale * 0.84);
                if (r + 1 < M && currentQRMatrix[r + 1][c]) ctx.fillRect(x + scale * 0.08, y + scale * 0.5, scale * 0.84, scale);
            } else {
                ctx.fillRect(x, y, scale, scale);
            }
        }
    }

    if (badgeType !== 'none') {
        const cx = size / 2, cy = size / 2;
        const r = size * 0.145;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0ea5e9';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(r * 1.1)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const iconSymbolMap = {
            wifi: '📶', coffee: '☕', beer: '🍺', instagram: '📷',
            spotify: '🎵', star: '★', heart: '♥', menu: '🍴', custom: '★'
        };
        ctx.fillText(iconSymbolMap[badgeType] || '★', cx, cy + 1);
    }

    canvas.style.width = '140px';
    canvas.style.height = '140px';
    canvas.style.display = 'block';
    container.appendChild(canvas);
}

function saveCurrentSideData(side) {
    const target = (side === 'A') ? sideAData : sideBData;
    target.topText = (document.getElementById('input-top-text')?.value || '').trim();
    target.bottomText = (document.getElementById('input-bottom-text')?.value || '').trim();
    target.preset = activePreset;
    target.badge = badgeType;
    target.fields = readCurrentFormFields();
    target.qrMatrix = currentQRMatrix.map(row => [...row]);
}

function toggleDualSided(enabled) {
    isDualSided = !!enabled;
    const ctrl = document.getElementById('dual-sided-controls');
    if (ctrl) ctrl.style.display = isDualSided ? 'block' : 'none';
    if (isDualSided) {
        saveCurrentSideData(activeSide);
        // Generate initial Side B matrix if still empty
        const other = (activeSide === 'A') ? sideBData : sideAData;
        if (!other.qrMatrix || other.qrMatrix.length === 0) {
            const defUrl = PRESETS_DATA[other.preset]?.url || 'https://studios-pro.com/menu';
            other.qrMatrix = generateMatrixFromPayload(defUrl, qrECCLevel, other.badge).matrix;
        }
    }
    if (typeof rebuild3DModel === 'function') rebuild3DModel();
}

function switchSide(side) {
    if (side !== 'A' && side !== 'B') return;
    if (activeSide === side) return;
    saveCurrentSideData(activeSide);
    activeSide = side;

    const btnA = document.getElementById('btn-side-a');
    const btnB = document.getElementById('btn-side-b');
    if (btnA) btnA.classList.toggle('active', side === 'A');
    if (btnB) btnB.classList.toggle('active', side === 'B');

    const source = (side === 'A') ? sideAData : sideBData;
    selectPreset(source.preset, source.fields, source.topText, source.bottomText, source.badge);

    if (isDualSided && typeof flipCoaster180 === 'function') {
        if (side === 'B' && !isFlipped180) flipCoaster180();
        else if (side === 'A' && isFlipped180) flipCoaster180();
    }
}
