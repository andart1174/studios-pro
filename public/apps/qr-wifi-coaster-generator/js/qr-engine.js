// ==========================================
// QR PAYLOAD ENGINE (UTF-8), 14 PRESETS, REAL jsQR OPTICAL VERIFIER & DUAL-SIDED STATE
// ==========================================

if (typeof qrcode !== 'undefined' && qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) {
    qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
}

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
        defaultBadge: 'whatsapp'
    },
    vcard: {
        name: 'Alexandre Dupont',
        phone: '+33612345678',
        email: 'contact@studios-pro.com',
        company: 'Studios Pro Design',
        website: 'https://studios-pro.com',
        topText: 'BUSINESS CARD',
        bottomText: 'SAVE CONTACT',
        defaultBadge: 'none'
    },
    url: {
        url: 'https://studios-pro.com',
        topText: 'SCAN QR CODE',
        bottomText: 'STUDIOS-PRO.COM',
        defaultBadge: 'none'
    },
    airbnb: {
        ssid: 'Airbnb_Guest_5G',
        pass: 'Relax2026!',
        auth: 'WPA',
        hidden: false,
        topText: 'WELCOME HOME',
        bottomText: 'WI-FI: Relax2026!',
        defaultBadge: 'home'
    },
    sepa: {
        name: 'Le Petit Bistro SARL',
        iban: 'FR7630006000011234567890189',
        bic: 'BNPAFRPPXXX',
        amount: '',
        ref: 'Table Tip',
        topText: 'INSTANT SEPA PAY',
        bottomText: 'SCAN WITH BANK APP',
        defaultBadge: 'heart'
    },
    maps: {
        query: 'https://maps.google.com/?q=Eiffel+Tower+Paris',
        topText: 'FIND US ON MAPS',
        bottomText: 'GET DIRECTIONS',
        defaultBadge: 'star'
    },
    event: {
        title: 'VIP Opening Night',
        date: '2026-06-15T19:00',
        loc: 'Grand Hall, Paris',
        topText: 'SAVE THE DATE',
        bottomText: 'ADD TO CALENDAR',
        defaultBadge: 'star'
    },
    tiktok: {
        user: '@studios.pro',
        topText: 'FOLLOW OUR FEED',
        bottomText: '@studios.pro',
        defaultBadge: 'spotify'
    }
};

let activePreset = 'wifi';
let badgeType = 'wifi';
let badgeScale = 1.0;
let qrECCLevel = 'H';
let qrPixelStyle = 'square'; // 'square' | 'dots' | 'connected'
let qrFinderStyle = 'square'; // 'square' | 'rounded' | 'circle'
let customBadgeImg = null;
let customLogoThreshold = 150;
let customLogoInvert = false;
let currentQRMatrix = [];
let currentQRPayload = '';
let lastClearedRatio = 0;
let previewRealColors = true;
let lastOpticalScanResult = { ok: true, ms: 0, text: '' };
let userEditedBottomText = false;

// Dual-Sided Coaster State (Side A is ALWAYS Top +Y, Side B is ALWAYS Bottom -Y)
let isDualSided = false;
let activeSide = 'A';
let isFlipped180 = false;

function escapeWifiField(str) {
    return String(str ?? '').replace(/([\\;,:"])/g, '\\$1');
}

function escapeVCardField(str) {
    return String(str ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,');
}

function normalizeHttpUrl(raw) {
    const s = String(raw || '').trim();
    if (!s) return 'https://studios-pro.com';
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(s)) return s;
    return 'https://' + s;
}

function buildQRStringFromState(p, f = {}) {
    if (p === 'wifi' || p === 'airbnb') {
        const ssid = String(f.ssid ?? 'Guest_WiFi').trim() || 'Guest_WiFi';
        const pass = String(f.pass ?? '').trim();
        const auth = f.auth || 'WPA';
        const hidden = !!f.hidden;
        let out = `WIFI:T:${auth};S:${escapeWifiField(ssid)};`;
        if (auth !== 'nopass') out += `P:${escapeWifiField(pass)};`;
        if (hidden) out += `H:true;`;
        return out + ';';
    }
    if (p === 'instagram') {
        const user = String(f.user ?? 'studios.pro').trim().replace(/^@/, '');
        return `https://instagram.com/${user || 'studios.pro'}`;
    }
    if (p === 'tiktok') {
        const raw = String(f.user ?? '@studios.pro').trim();
        if (/^https?:\/\//i.test(raw)) return raw;
        const handle = raw.replace(/^@/, '');
        return `https://tiktok.com/@${handle || 'studios.pro'}`;
    }
    if (p === 'whatsapp') {
        const phone = String(f.phone ?? '+40712345678').trim().replace(/[^0-9]/g, '');
        const msg = String(f.msg ?? '').trim();
        return msg ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/${phone}`;
    }
    if (p === 'vcard') {
        const fullName = String(f.name ?? 'Alexandre Dupont').trim() || 'Contact';
        const nameParts = fullName.split(/\s+/);
        const firstName = nameParts.slice(0, -1).join(' ') || fullName;
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
        const phone = String(f.phone ?? '').trim();
        const email = String(f.email ?? '').trim();
        const company = String(f.company ?? '').trim();
        const website = String(f.website ?? '').trim();
        const lines = [
            'BEGIN:VCARD',
            'VERSION:3.0',
            `N:${escapeVCardField(lastName)};${escapeVCardField(firstName)};;;`,
            `FN:${escapeVCardField(fullName)}`
        ];
        if (company) lines.push(`ORG:${escapeVCardField(company)}`);
        if (phone) lines.push(`TEL;TYPE=CELL:${phone}`);
        if (email) lines.push(`EMAIL:${email}`);
        if (website) lines.push(`URL:${normalizeHttpUrl(website)}`);
        lines.push('END:VCARD');
        return lines.join('\n');
    }
    if (p === 'sepa') {
        // EPC069-12 European SEPA Instant Credit Transfer QR
        const bic = String(f.bic ?? '').trim().toUpperCase();
        const name = String(f.name ?? 'Merchant').trim().slice(0, 70);
        const iban = String(f.iban ?? '').replace(/\s+/g, '').toUpperCase();
        const amtNum = parseFloat(String(f.amount ?? '').replace(',', '.'));
        const amtStr = (isFinite(amtNum) && amtNum > 0) ? `EUR${amtNum.toFixed(2)}` : '';
        const ref = String(f.ref ?? '').trim().slice(0, 140);
        return ['BCD', '002', '1', 'SCT', bic, name, iban, amtStr, '', '', ref].join('\n');
    }
    if (p === 'maps') {
        const q = String(f.query ?? '').trim();
        if (!q) return 'https://maps.google.com';
        if (/^https?:\/\//i.test(q) || /^geo:/i.test(q)) return q;
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
    }
    if (p === 'event') {
        const title = escapeVCardField(String(f.title ?? 'Event').trim());
        const loc = escapeVCardField(String(f.loc ?? '').trim());
        const dtRaw = String(f.date ?? '2026-06-15T19:00').replace(/[-:]/g, '');
        const dtStart = dtRaw.length >= 13 ? (dtRaw.slice(0, 13) + '00') : '20260615T190000';
        const lines = ['BEGIN:VEVENT', `SUMMARY:${title}`, `DTSTART:${dtStart}`];
        if (loc) lines.push(`LOCATION:${loc}`);
        lines.push('END:VEVENT');
        return lines.join('\n');
    }
    return normalizeHttpUrl(f.url ?? PRESETS_DATA[p]?.url ?? 'https://studios-pro.com');
}

function makeDefaultSideState(presetKey) {
    const p = PRESETS_DATA[presetKey] || PRESETS_DATA.wifi;
    const fields = { ...p };
    const rawData = buildQRStringFromState(presetKey, fields);
    const badge = p.defaultBadge || 'none';
    const built = safeGenerateMatrix(rawData, 'H', badge, 1.0);
    return {
        preset: presetKey,
        topText: p.topText,
        bottomText: p.bottomText,
        badge,
        badgeScale: 1.0,
        customBadgeImg: null,
        customLogoThreshold: 150,
        customLogoInvert: false,
        ecc: 'H',
        textSize: 8.0,
        topOffset: 38,
        bottomOffset: 38,
        fields,
        rawData,
        qrMatrix: built.matrix,
        clearedRatio: built.clearedRatio
    };
}

let sideAData = null;
let sideBData = null;

function ensureSideStatesInitialized() {
    if (!sideAData) sideAData = makeDefaultSideState('wifi');
    if (!sideBData) sideBData = makeDefaultSideState('menu');
}

function readCurrentFormFields() {
    const fields = {};
    if (activePreset === 'wifi' || activePreset === 'airbnb') {
        fields.ssid = document.getElementById('input-wifi-ssid')?.value ?? 'Guest_WiFi';
        fields.pass = document.getElementById('input-wifi-pass')?.value ?? 'Welcome2026!';
        fields.auth = document.getElementById('select-wifi-auth')?.value ?? 'WPA';
        fields.hidden = !!document.getElementById('chk-wifi-hidden')?.checked;
    } else if (activePreset === 'instagram') {
        fields.user = document.getElementById('input-insta-user')?.value ?? 'studios.pro';
    } else if (activePreset === 'tiktok') {
        fields.user = document.getElementById('input-tiktok-user')?.value ?? '@studios.pro';
    } else if (activePreset === 'whatsapp') {
        fields.phone = document.getElementById('input-wa-phone')?.value ?? '+40712345678';
        fields.msg = document.getElementById('input-wa-msg')?.value ?? '';
    } else if (activePreset === 'vcard') {
        fields.name = document.getElementById('input-vcard-name')?.value ?? 'Alexandre Dupont';
        fields.phone = document.getElementById('input-vcard-phone')?.value ?? '+33612345678';
        fields.email = document.getElementById('input-vcard-email')?.value ?? 'contact@studios-pro.com';
        fields.company = document.getElementById('input-vcard-company')?.value ?? 'Studios Pro Design';
        fields.website = document.getElementById('input-vcard-website')?.value ?? '';
    } else if (activePreset === 'sepa') {
        fields.name = document.getElementById('input-sepa-name')?.value ?? 'Le Petit Bistro SARL';
        fields.iban = document.getElementById('input-sepa-iban')?.value ?? '';
        fields.bic = document.getElementById('input-sepa-bic')?.value ?? '';
        fields.amount = document.getElementById('input-sepa-amount')?.value ?? '';
        fields.ref = document.getElementById('input-sepa-ref')?.value ?? '';
    } else if (activePreset === 'maps') {
        fields.query = document.getElementById('input-maps-query')?.value ?? '';
    } else if (activePreset === 'event') {
        fields.title = document.getElementById('input-event-title')?.value ?? '';
        fields.date = document.getElementById('input-event-date')?.value ?? '2026-06-15T19:00';
        fields.loc = document.getElementById('input-event-loc')?.value ?? '';
    } else {
        fields.url = document.getElementById('input-generic-url')?.value ?? (PRESETS_DATA[activePreset]?.url || 'https://studios-pro.com');
    }
    return fields;
}

function selectPreset(presetKey, preservedFields = null, preservedTop = null, preservedBottom = null, preservedBadge = null, skipAirbnbAutoDual = false) {
    ensureSideStatesInitialized();
    activePreset = PRESETS_DATA[presetKey] ? presetKey : 'wifi';
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById('preset-' + activePreset);
    if (activeBtn) activeBtn.classList.add('active');

    const data = PRESETS_DATA[activePreset];
    const topEl = document.getElementById('input-top-text');
    const btmEl = document.getElementById('input-bottom-text');
    if (topEl) topEl.value = preservedTop !== null ? preservedTop : data.topText;
    if (btmEl) btmEl.value = preservedBottom !== null ? preservedBottom : data.bottomText;
    userEditedBottomText = false;

    const targetBadge = preservedBadge !== null ? preservedBadge : data.defaultBadge;
    badgeType = targetBadge || 'none';
    updateBadgeButtonsUI();

    renderPresetForm(preservedFields);

    // Special 1-Click Airbnb 2-in-1 Welcome Kit: auto-populates Side B with House Guide / Review!
    if (activePreset === 'airbnb' && !skipAirbnbAutoDual && preservedFields === null) {
        sideBData = makeDefaultSideState('review');
        sideBData.topText = 'HOUSE GUIDE & 5★';
        sideBData.bottomText = 'ENJOY YOUR STAY!';
        sideBData.badge = 'star';
        if (!isDualSided) {
            const chk = document.getElementById('chk-dual-sided');
            if (chk) chk.checked = true;
            toggleDualSided(true, true);
        }
        if (typeof showToast === 'function') {
            showToast(currentLang === 'fr'
                ? 'Kit Airbnb 2-en-1 activé : Recto Wi-Fi + Verso Guide/Avis 5★ !'
                : 'Airbnb 2-in-1 Kit enabled: Side A Wi-Fi + Side B House Guide/Review!');
        }
    }

    updateQRData();
}

function updateBadgeButtonsUI() {
    document.querySelectorAll('.badge-btn').forEach(b => b.classList.remove('active'));
    const bEl = document.getElementById('badge-' + badgeType);
    if (bEl) bEl.classList.add('active');
    const customWrap = document.getElementById('custom-logo-controls');
    if (customWrap) customWrap.style.display = (badgeType === 'custom') ? 'block' : 'none';
    const scaleWrap = document.getElementById('badge-scale-controls');
    if (scaleWrap) scaleWrap.style.display = (badgeType !== 'none') ? 'block' : 'none';
}

function renderPresetForm(overrideFields = null) {
    const container = document.getElementById('dynamic-form');
    if (!container) return;
    const p = activePreset;
    const f = overrideFields || PRESETS_DATA[p] || {};
    const escAttr = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    let html = '';

    if (p === 'wifi' || p === 'airbnb') {
        const ssid = escAttr(f.ssid ?? (p === 'airbnb' ? 'Airbnb_Guest_5G' : 'Guest_WiFi'));
        const pass = escAttr(f.pass ?? 'Welcome2026!');
        const auth = f.auth || 'WPA';
        const hiddenChecked = f.hidden ? 'checked' : '';
        const passDisabled = auth === 'nopass' ? 'disabled style="opacity:0.45;"' : '';
        html = `
            <div class="input-group">
                <label class="input-label" data-i18n="labelSSID">${t('labelSSID')}</label>
                <input type="text" class="text-input" id="input-wifi-ssid" value="${ssid}" oninput="updateQRData()">
            </div>
            <div class="input-group" id="wrap-wifi-pass">
                <label class="input-label" data-i18n="labelPass">${t('labelPass')}</label>
                <input type="text" class="text-input" id="input-wifi-pass" value="${pass}" ${passDisabled} oninput="onWifiPassInput(this.value)">
            </div>
            <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;">
                <div class="input-group" style="margin-bottom:0;">
                    <label class="input-label" data-i18n="labelAuth">${t('labelAuth')}</label>
                    <select class="text-input" id="select-wifi-auth" onchange="onWifiAuthChange(this.value)" style="cursor:pointer;">
                        <option value="WPA" data-i18n="optAuthWPA" ${auth === 'WPA' ? 'selected' : ''}>${t('optAuthWPA')}</option>
                        <option value="WEP" data-i18n="optAuthWEP" ${auth === 'WEP' ? 'selected' : ''}>${t('optAuthWEP')}</option>
                        <option value="nopass" data-i18n="optAuthOpen" ${auth === 'nopass' ? 'selected' : ''}>${t('optAuthOpen')}</option>
                    </select>
                </div>
                <label class="checkbox-label" style="margin-top:16px;">
                    <input type="checkbox" id="chk-wifi-hidden" ${hiddenChecked} onchange="updateQRData()">
                    <span data-i18n="labelHidden">${t('labelHidden')}</span>
                </label>
            </div>
        `;
    } else if (p === 'instagram') {
        html = `
            <div class="input-group">
                <label class="input-label" data-i18n="labelUsername">${t('labelUsername')}</label>
                <input type="text" class="text-input" id="input-insta-user" value="${escAttr(f.user ?? 'studios.pro')}" oninput="onSocialHandleInput(this.value)">
            </div>
        `;
    } else if (p === 'tiktok') {
        html = `
            <div class="input-group">
                <label class="input-label" data-i18n="labelTiktokUser">${t('labelTiktokUser')}</label>
                <input type="text" class="text-input" id="input-tiktok-user" value="${escAttr(f.user ?? '@studios.pro')}" oninput="onSocialHandleInput(this.value)">
            </div>
        `;
    } else if (p === 'whatsapp') {
        html = `
            <div class="input-group">
                <label class="input-label" data-i18n="labelPhone">${t('labelPhone')}</label>
                <input type="text" class="text-input" id="input-wa-phone" value="${escAttr(f.phone ?? '+40712345678')}" oninput="updateQRData()">
            </div>
            <div class="input-group">
                <label class="input-label" data-i18n="labelWhatsAppMsg">${t('labelWhatsAppMsg')}</label>
                <input type="text" class="text-input" id="input-wa-msg" value="${escAttr(f.msg ?? '')}" oninput="updateQRData()">
            </div>
        `;
    } else if (p === 'vcard') {
        html = `
            <div class="input-group">
                <label class="input-label" data-i18n="labelFullName">${t('labelFullName')}</label>
                <input type="text" class="text-input" id="input-vcard-name" value="${escAttr(f.name ?? 'Alexandre Dupont')}" oninput="updateQRData()">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div class="input-group">
                    <label class="input-label" data-i18n="labelPhone">${t('labelPhone')}</label>
                    <input type="text" class="text-input" id="input-vcard-phone" value="${escAttr(f.phone ?? '+33612345678')}" oninput="updateQRData()">
                </div>
                <div class="input-group">
                    <label class="input-label" data-i18n="labelEmail">${t('labelEmail')}</label>
                    <input type="text" class="text-input" id="input-vcard-email" value="${escAttr(f.email ?? 'contact@studios-pro.com')}" oninput="updateQRData()">
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div class="input-group">
                    <label class="input-label" data-i18n="labelCompany">${t('labelCompany')}</label>
                    <input type="text" class="text-input" id="input-vcard-company" value="${escAttr(f.company ?? 'Studios Pro Design')}" oninput="updateQRData()">
                </div>
                <div class="input-group">
                    <label class="input-label" data-i18n="labelWebsite">${t('labelWebsite')}</label>
                    <input type="text" class="text-input" id="input-vcard-website" value="${escAttr(f.website ?? '')}" oninput="updateQRData()">
                </div>
            </div>
        `;
    } else if (p === 'sepa') {
        html = `
            <div class="input-group">
                <label class="input-label" data-i18n="labelSepaName">${t('labelSepaName')}</label>
                <input type="text" class="text-input" id="input-sepa-name" value="${escAttr(f.name ?? 'Le Petit Bistro SARL')}" oninput="updateQRData()">
            </div>
            <div class="input-group">
                <label class="input-label" data-i18n="labelSepaIban">${t('labelSepaIban')}</label>
                <input type="text" class="text-input" id="input-sepa-iban" value="${escAttr(f.iban ?? 'FR7630006000011234567890189')}" oninput="updateQRData()">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div class="input-group">
                    <label class="input-label" data-i18n="labelSepaBic">${t('labelSepaBic')}</label>
                    <input type="text" class="text-input" id="input-sepa-bic" value="${escAttr(f.bic ?? '')}" oninput="updateQRData()">
                </div>
                <div class="input-group">
                    <label class="input-label" data-i18n="labelSepaAmount">${t('labelSepaAmount')}</label>
                    <input type="text" class="text-input" id="input-sepa-amount" placeholder="e.g. 5.00" value="${escAttr(f.amount ?? '')}" oninput="updateQRData()">
                </div>
            </div>
            <div class="input-group">
                <label class="input-label" data-i18n="labelSepaRef">${t('labelSepaRef')}</label>
                <input type="text" class="text-input" id="input-sepa-ref" value="${escAttr(f.ref ?? 'Table Tip')}" oninput="updateQRData()">
            </div>
        `;
    } else if (p === 'maps') {
        html = `
            <div class="input-group">
                <label class="input-label" data-i18n="labelMapsQuery">${t('labelMapsQuery')}</label>
                <input type="text" class="text-input" id="input-maps-query" value="${escAttr(f.query ?? 'https://maps.google.com/?q=Eiffel+Tower+Paris')}" oninput="updateQRData()">
            </div>
        `;
    } else if (p === 'event') {
        html = `
            <div class="input-group">
                <label class="input-label" data-i18n="labelEventTitle">${t('labelEventTitle')}</label>
                <input type="text" class="text-input" id="input-event-title" value="${escAttr(f.title ?? 'VIP Opening Night')}" oninput="updateQRData()">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div class="input-group">
                    <label class="input-label" data-i18n="labelEventDate">${t('labelEventDate')}</label>
                    <input type="datetime-local" class="text-input" id="input-event-date" value="${escAttr(f.date ?? '2026-06-15T19:00')}" oninput="updateQRData()">
                </div>
                <div class="input-group">
                    <label class="input-label" data-i18n="labelEventLoc">${t('labelEventLoc')}</label>
                    <input type="text" class="text-input" id="input-event-loc" value="${escAttr(f.loc ?? 'Grand Hall, Paris')}" oninput="updateQRData()">
                </div>
            </div>
        `;
    } else {
        const defVal = escAttr(f.url ?? PRESETS_DATA[p]?.url ?? 'https://studios-pro.com');
        html = `
            <div class="input-group">
                <label class="input-label" data-i18n="labelUrl">${t('labelUrl')}</label>
                <input type="text" class="text-input" id="input-generic-url" value="${defVal}" oninput="updateQRData()">
            </div>
        `;
    }

    container.innerHTML = html;
}

function onWifiPassInput(val) {
    if (!userEditedBottomText) {
        const b = document.getElementById('input-bottom-text');
        if (b) b.value = val ? ((activePreset === 'airbnb' ? 'WI-FI: ' : 'PASS: ') + val) : 'OPEN NETWORK';
    }
    updateQRData();
}

function onWifiAuthChange(authVal) {
    const passInput = document.getElementById('input-wifi-pass');
    if (passInput) {
        passInput.disabled = (authVal === 'nopass');
        passInput.style.opacity = (authVal === 'nopass') ? '0.45' : '1';
    }
    if (!userEditedBottomText) {
        const b = document.getElementById('input-bottom-text');
        if (b) {
            if (authVal === 'nopass') b.value = 'OPEN WI-FI';
            else if (passInput && passInput.value) b.value = (activePreset === 'airbnb' ? 'WI-FI: ' : 'PASS: ') + passInput.value;
        }
    }
    updateQRData();
}

function onSocialHandleInput(val) {
    if (!userEditedBottomText) {
        const b = document.getElementById('input-bottom-text');
        const cleaned = String(val || '').trim();
        if (b && !/^https?:\/\//i.test(cleaned)) {
            b.value = '@' + cleaned.replace(/^@/, '');
        }
    }
    updateQRData();
}

function setBadge(type) {
    badgeType = type || 'none';
    updateBadgeButtonsUI();

    if (badgeType !== 'none' && qrECCLevel === 'L') {
        qrECCLevel = 'H';
        const sel = document.getElementById('select-ecc');
        if (sel) sel.value = 'H';
        updateQRECCLabel('H');
        if (typeof showToast === 'function') {
            showToast(currentLang === 'fr'
                ? "ECC automatiquement monté à H (30%) pour sécuriser le logo central !"
                : "ECC auto-upgraded to High 'H' (30%) to keep center logo scannable!");
        }
    }
    updateQRData();
}

function setBadgeScale(val) {
    badgeScale = Math.max(0.65, Math.min(1.2, parseFloat(val) || 1.0));
    const lbl = document.getElementById('label-badge-scale');
    if (lbl) lbl.innerText = Math.round(badgeScale * 100) + '%';
    updateQRData();
}

function onCustomLogoParamChange() {
    customLogoThreshold = parseInt(document.getElementById('slider-logo-threshold')?.value || '150', 10);
    customLogoInvert = !!document.getElementById('chk-logo-invert')?.checked;
    const lbl = document.getElementById('label-logo-threshold');
    if (lbl) lbl.innerText = String(customLogoThreshold);
    render2DPreview();
    if (typeof scheduleRebuild3D === 'function') scheduleRebuild3D(30);
    else if (typeof rebuild3DModel === 'function') rebuild3DModel();
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
    // Reset input value so re-uploading the same file triggers onchange
    e.target.value = '';
}

function updateQRECCLabel(val) {
    const isFr = currentLang === 'fr';
    const labelMap = {
        'H': isFr ? "Haut 'H' (30% — Logo Sûr)" : "High 'H' (30% Logo Safe)",
        'Q': isFr ? "Niveau 'Q' (25% — Fiable)" : "Level 'Q' (25% Redundant)",
        'M': isFr ? "Niveau 'M' (15% — Standard)" : "Level 'M' (15% Standard)",
        'L': isFr ? "Niveau 'L' (7% — Compact)" : "Level 'L' (7% Compact)"
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
    render2DPreview();
    if (typeof scheduleRebuild3D === 'function') scheduleRebuild3D(20);
    else if (typeof rebuild3DModel === 'function') rebuild3DModel();
}

function setQRFinderStyle(style) {
    qrFinderStyle = style || 'square';
    ['square', 'rounded', 'circle'].forEach(s => {
        const btn = document.getElementById('qr-finder-' + s);
        if (btn) btn.classList.toggle('active', s === qrFinderStyle);
    });
    render2DPreview();
    if (typeof scheduleRebuild3D === 'function') scheduleRebuild3D(20);
    else if (typeof rebuild3DModel === 'function') rebuild3DModel();
}

function togglePreviewColorMode() {
    previewRealColors = !previewRealColors;
    const btn = document.getElementById('btn-toggle-scan-colors');
    if (btn) btn.innerText = previewRealColors ? t('btnToggleRealColors') : t('btnToggleBW');
    render2DPreview();
}

function getQRString() {
    return buildQRStringFromState(activePreset, readCurrentFormFields());
}

function isFinderModule(r, c, M) {
    if (r < 8 && c < 8) return true;
    if (r < 8 && c >= M - 8) return true;
    if (r >= M - 8 && c < 8) return true;
    return false;
}

function isFinderPatternCore(r, c, M) {
    if (r < 7 && c < 7) return true;
    if (r < 7 && c >= M - 7) return true;
    if (r >= M - 7 && c < 7) return true;
    return false;
}

function safeGenerateMatrix(rawData, eccLevel = 'H', withBadge = 'none', scaleMul = 1.0) {
    const payload = (rawData && String(rawData).trim()) ? String(rawData) : 'https://studios-pro.com';
    const tryLevels = [eccLevel, 'Q', 'M', 'L'];
    let qr = null;
    let usedEcc = eccLevel;

    for (const lvl of tryLevels) {
        try {
            const candidate = qrcode(0, lvl);
            candidate.addData(payload);
            candidate.make();
            qr = candidate;
            usedEcc = lvl;
            break;
        } catch (_) {}
    }

    if (!qr) {
        throw new Error('QR payload exceeds maximum capacity');
    }

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
        const maxRadiusByEcc = (usedEcc === 'H') ? 0.145 : (usedEcc === 'Q' ? 0.12 : 0.085);
        const badgeModuleRadius = Math.max(2.1, M * maxRadiusByEcc * scaleMul);
        for (let r = 0; r < M; r++) {
            for (let c = 0; c < M; c++) {
                if (isFinderModule(r, c, M)) continue;
                const dist = Math.hypot(r - center, c - center);
                if (dist <= badgeModuleRadius + 0.3) {
                    matrix[r][c] = false;
                    clearedModules++;
                }
            }
        }
    }

    return {
        matrix,
        moduleCount: M,
        clearedRatio: clearedModules / totalDataModules,
        usedEcc,
        payload
    };
}

function generateMatrixFromPayload(rawData, eccLevel = qrECCLevel, withBadge = badgeType, scaleMul = badgeScale) {
    return safeGenerateMatrix(rawData, eccLevel, withBadge, scaleMul);
}

function syncActiveSideStateFromDOM() {
    ensureSideStatesInitialized();
    const target = (activeSide === 'A') ? sideAData : sideBData;
    target.preset = activePreset;
    target.topText = document.getElementById('input-top-text')?.value || '';
    target.bottomText = document.getElementById('input-bottom-text')?.value || '';
    target.badge = badgeType;
    target.badgeScale = badgeScale;
    target.customBadgeImg = customBadgeImg;
    target.customLogoThreshold = customLogoThreshold;
    target.customLogoInvert = customLogoInvert;
    target.ecc = qrECCLevel;
    target.textSize = parseFloat(document.getElementById('slider-text-size')?.value || 8.0);
    target.topOffset = parseFloat(document.getElementById('slider-top-offset')?.value || 38);
    target.bottomOffset = parseFloat(document.getElementById('slider-bottom-offset')?.value || 38);
    target.fields = readCurrentFormFields();
    if (currentQRPayload) target.rawData = currentQRPayload;
    if (currentQRMatrix && currentQRMatrix.length > 0) {
        target.qrMatrix = currentQRMatrix.map(row => [...row]);
    }
    target.clearedRatio = lastClearedRatio;
}

function updateQRData(immediate = false) {
    ensureSideStatesInitialized();
    const rawData = getQRString();
    try {
        const built = safeGenerateMatrix(rawData, qrECCLevel, badgeType, badgeScale);
        currentQRMatrix = built.matrix;
        currentQRPayload = built.payload;
        lastClearedRatio = built.clearedRatio;

        syncActiveSideStateFromDOM();
        render2DPreview();
        updatePrintabilityBadge(lastClearedRatio);

        if (immediate && typeof rebuild3DModel === 'function') {
            rebuild3DModel();
        } else if (typeof scheduleRebuild3D === 'function') {
            scheduleRebuild3D(35);
        } else if (typeof rebuild3DModel === 'function') {
            rebuild3DModel();
        }
    } catch (err) {
        console.error('QR Code generation error:', err);
        if (typeof showToast === 'function') {
            showToast(currentLang === 'fr'
                ? '⚠ Texte QR trop long ! Réduisez le texte ou baissez le niveau ECC.'
                : '⚠ QR text too long! Shorten payload or lower ECC level.');
        }
    }
}

function updatePrintabilityBadge(clearedRatio = lastClearedRatio) {
    const pill = document.getElementById('scan-nozzle-pill');
    if (!pill || !currentQRMatrix.length) return;

    const ratio = (typeof clearedRatio === 'number' && !isNaN(clearedRatio)) ? clearedRatio : lastClearedRatio;
    const size = parseFloat(document.getElementById('slider-size')?.value || 100);
    const shape = typeof currentShape !== 'undefined' ? currentShape : 'circle';
    const effSize = (shape === 'keychain') ? size * 0.6 : size;
    const qrArea = effSize * 0.56;
    const pixelMm = qrArea / currentQRMatrix.length;
    const isFr = currentLang === 'fr';

    const eccLimits = { L: 0.05, M: 0.12, Q: 0.21, H: 0.28 };
    if (badgeType !== 'none' && ratio > (eccLimits[qrECCLevel] || 0.28)) {
        pill.className = 'scan-nozzle-pill contrast-danger';
        pill.textContent = isFr
            ? `⚠ Logo trop grand (${Math.round(ratio * 100)}%) pour ECC ${qrECCLevel}`
            : `⚠ Logo too large (${Math.round(ratio * 100)}%) for ECC ${qrECCLevel}`;
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

function drawRoundedRect2D(ctx, x, y, w, h, r) {
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

function drawFinderEye2D(ctx, ox, oy, cell, fgColor, bgColor, style) {
    const outer = 7 * cell;
    const mid = 5 * cell;
    const inner = 3 * cell;

    if (style === 'circle') {
        const cx = ox + outer * 0.5, cy = oy + outer * 0.5;
        ctx.fillStyle = fgColor;
        ctx.beginPath(); ctx.arc(cx, cy, outer * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = bgColor;
        ctx.beginPath(); ctx.arc(cx, cy, mid * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = fgColor;
        ctx.beginPath(); ctx.arc(cx, cy, inner * 0.5, 0, Math.PI * 2); ctx.fill();
    } else if (style === 'rounded') {
        ctx.fillStyle = fgColor;
        drawRoundedRect2D(ctx, ox, oy, outer, outer, cell * 1.6); ctx.fill();
        ctx.fillStyle = bgColor;
        drawRoundedRect2D(ctx, ox + cell, oy + cell, mid, mid, cell * 1.1); ctx.fill();
        ctx.fillStyle = fgColor;
        drawRoundedRect2D(ctx, ox + 2 * cell, oy + 2 * cell, inner, inner, cell * 0.75); ctx.fill();
    } else {
        ctx.fillStyle = fgColor;
        ctx.fillRect(ox, oy, outer, outer);
        ctx.fillStyle = bgColor;
        ctx.fillRect(ox + cell, oy + cell, mid, mid);
        ctx.fillStyle = fgColor;
        ctx.fillRect(ox + 2 * cell, oy + 2 * cell, inner, inner);
    }
}

function render2DPreview() {
    const container = document.getElementById('qr-preview-canvas');
    if (!container || !currentQRMatrix.length) return;
    container.innerHTML = '';

    const M = currentQRMatrix.length;
    const quietModules = 2;
    const scale = Math.max(6, Math.floor(240 / (M + quietModules * 2)));
    const totalPx = (M + quietModules * 2) * scale;
    const padPx = quietModules * scale;

    const canvas = document.createElement('canvas');
    canvas.width = totalPx;
    canvas.height = totalPx;
    const ctx = canvas.getContext('2d');

    const qzActive = (typeof useWhiteQuietZone !== 'undefined' && useWhiteQuietZone);
    const bgHex = previewRealColors
        ? (qzActive ? (typeof quietZoneColorHex !== 'undefined' ? quietZoneColorHex : '#ffffff') : (typeof baseColorHex !== 'undefined' ? baseColorHex : '#111827'))
        : '#ffffff';
    const fgHex = previewRealColors
        ? (typeof qrColorHex !== 'undefined' ? qrColorHex : '#f8fafc')
        : '#000000';
    const accHex = previewRealColors
        ? (typeof accentColorHex !== 'undefined' ? accentColorHex : '#38bdf8')
        : '#0ea5e9';

    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, totalPx, totalPx);

    // Draw the 3 styled Finder Eyes
    const finderOrigins = [
        [0, 0],
        [M - 7, 0],
        [0, M - 7]
    ];
    for (const [fc, fr] of finderOrigins) {
        drawFinderEye2D(ctx, padPx + fc * scale, padPx + fr * scale, scale, fgHex, bgHex, qrFinderStyle);
    }

    // Draw Data Modules
    ctx.fillStyle = fgHex;
    for (let r = 0; r < M; r++) {
        for (let c = 0; c < M; c++) {
            if (!currentQRMatrix[r][c] || isFinderPatternCore(r, c, M)) continue;
            const x = padPx + c * scale;
            const y = padPx + r * scale;
            if (qrPixelStyle === 'dots') {
                ctx.beginPath();
                ctx.arc(x + scale * 0.5, y + scale * 0.5, scale * 0.43, 0, Math.PI * 2);
                ctx.fill();
            } else if (qrPixelStyle === 'connected') {
                const n = r > 0 && currentQRMatrix[r - 1][c] && !isFinderPatternCore(r - 1, c, M);
                const s = r + 1 < M && currentQRMatrix[r + 1][c] && !isFinderPatternCore(r + 1, c, M);
                const w = c > 0 && currentQRMatrix[r][c - 1] && !isFinderPatternCore(r, c - 1, M);
                const e = c + 1 < M && currentQRMatrix[r][c + 1] && !isFinderPatternCore(r, c + 1, M);
                const rad = scale * 0.42;
                const rTL = (!n && !w) ? rad : 0;
                const rTR = (!n && !e) ? rad : 0;
                const rBR = (!s && !e) ? rad : 0;
                const rBL = (!s && !w) ? rad : 0;
                ctx.beginPath();
                ctx.moveTo(x + rTL, y);
                ctx.lineTo(x + scale - rTR, y);
                if (rTR > 0) ctx.quadraticCurveTo(x + scale, y, x + scale, y + rTR);
                ctx.lineTo(x + scale, y + scale - rBR);
                if (rBR > 0) ctx.quadraticCurveTo(x + scale, y + scale, x + scale - rBR, y + scale);
                ctx.lineTo(x + rBL, y + scale);
                if (rBL > 0) ctx.quadraticCurveTo(x, y + scale, x, y + scale - rBL);
                ctx.lineTo(x, y + rTL);
                if (rTL > 0) ctx.quadraticCurveTo(x, y, x + rTL, y);
                ctx.closePath();
                ctx.fill();
            } else {
                ctx.fillRect(x, y, scale, scale);
            }
        }
    }

    // Center Badge / Real Uploaded Custom Logo
    if (badgeType !== 'none') {
        const cx = totalPx / 2, cy = totalPx / 2;
        const r = (M * scale) * 0.145 * badgeScale;
        ctx.fillStyle = bgHex;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
        ctx.fill();

        if (badgeType === 'custom' && customBadgeImg) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.92, 0, Math.PI * 2);
            ctx.clip();
            const nw = customBadgeImg.naturalWidth || customBadgeImg.width || 1;
            const nh = customBadgeImg.naturalHeight || customBadgeImg.height || 1;
            const maxD = r * 1.65;
            const asp = nw / Math.max(1, nh);
            const dw = asp >= 1 ? maxD : maxD * asp;
            const dh = asp >= 1 ? maxD / asp : maxD;
            ctx.drawImage(customBadgeImg, cx - dw / 2, cy - dh / 2, dw, dh);
            ctx.restore();
        } else {
            ctx.fillStyle = accHex;
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.92, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = bgHex;
            ctx.font = `bold ${Math.round(r * 1.05)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const iconSymbolMap = {
                wifi: '📶', coffee: '☕', beer: '🍺', instagram: '📷',
                spotify: '🎵', star: '★', heart: '♥', menu: '🍴',
                whatsapp: '💬', home: '🏠', custom: '★'
            };
            ctx.fillText(iconSymbolMap[badgeType] || '★', cx, cy + 1);
        }
    }

    // REAL OPTICAL DECODER VERIFICATION (jsQR)
    runRealOpticalQRVerification(canvas, ctx);

    canvas.style.width = '144px';
    canvas.style.height = '144px';
    canvas.style.display = 'block';
    canvas.style.borderRadius = '6px';
    container.style.background = bgHex;
    container.appendChild(canvas);
}

function runRealOpticalQRVerification(canvas, ctx) {
    const pill = document.getElementById('scan-verify-pill');
    if (!pill) return;

    if (typeof window === 'undefined' || typeof window.jsQR !== 'function') {
        pill.className = 'scan-nozzle-pill contrast-good';
        pill.textContent = currentLang === 'fr' ? 'QR ISO Généré' : 'ISO QR Generated';
        return;
    }

    const t0 = performance.now();
    try {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const decoded = window.jsQR(imgData.data, canvas.width, canvas.height, {
            inversionAttempts: 'attemptBoth'
        });
        const elapsed = Math.max(1, Math.round(performance.now() - t0));
        const isFr = currentLang === 'fr';

        if (decoded && decoded.data) {
            const matched = (decoded.data === currentQRPayload) || (decoded.data.trim() === currentQRPayload.trim());
            // Also check if standard non-inverted works (better phone compatibility)
            const stdOnly = window.jsQR(imgData.data, canvas.width, canvas.height, {
                inversionAttempts: 'dontInvert'
            });
            lastOpticalScanResult = { ok: true, ms: elapsed, text: decoded.data, invertedOnly: !stdOnly };

            if (!stdOnly && previewRealColors) {
                pill.className = 'scan-nozzle-pill contrast-warn';
                pill.textContent = isFr
                    ? `⚠ Scannable mais inversé (${elapsed}ms)`
                    : `⚠ Inverted QR (${elapsed}ms) — Add White Plate`;
                pill.title = decoded.data;
            } else if (matched) {
                pill.className = 'scan-nozzle-pill contrast-good';
                pill.textContent = isFr
                    ? `✓ Vérifié jsQR (${elapsed} ms)`
                    : `✓ Optical Scan OK (${elapsed} ms)`;
                pill.title = decoded.data;
            } else {
                pill.className = 'scan-nozzle-pill contrast-good';
                pill.textContent = isFr ? `✓ Decodé (${elapsed} ms)` : `✓ Decoded (${elapsed} ms)`;
                pill.title = decoded.data;
            }
        } else {
            lastOpticalScanResult = { ok: false, ms: elapsed, text: '' };
            pill.className = 'scan-nozzle-pill contrast-danger';
            pill.textContent = isFr
                ? '✕ Échec Scan Optique — Contraste / Logo !'
                : '✕ Optical Scan Failed — Fix Contrast / Logo!';
            pill.title = '';
        }
    } catch (_) {}
}

function toggleDualSided(enabled, silent = false) {
    ensureSideStatesInitialized();
    isDualSided = !!enabled;
    const ctrl = document.getElementById('dual-sided-controls');
    if (ctrl) ctrl.style.display = isDualSided ? 'block' : 'none';

    if (isDualSided) {
        syncActiveSideStateFromDOM();
        // Rebuild opposite side cleanly using buildQRStringFromState (fixes Bug #3!)
        const opp = (activeSide === 'A') ? sideBData : sideAData;
        if (!opp.qrMatrix || opp.qrMatrix.length === 0) {
            const payload = buildQRStringFromState(opp.preset, opp.fields);
            const built = safeGenerateMatrix(payload, opp.ecc || 'H', opp.badge || 'none', opp.badgeScale || 1.0);
            opp.rawData = built.payload;
            opp.qrMatrix = built.matrix;
            opp.clearedRatio = built.clearedRatio;
        }
        // Embossed + Dual-Sided cannot rest flat on build plate -> auto-switch to Flush
        if (typeof printStyle !== 'undefined' && printStyle === 'embossed') {
            if (typeof setPrintStyle === 'function') setPrintStyle('flush', true);
            if (!silent && typeof showToast === 'function') {
                showToast(currentLang === 'fr'
                    ? 'Double-Face : basculé en Surface Plate (Flush) pour impression stable sans supports !'
                    : 'Dual-Sided: auto-switched to Flush Inlay so both sides print cleanly without supports!');
            }
        }
    } else {
        if (activeSide === 'B') switchSide('A');
    }

    if (typeof syncIncompatibleControlsUI === 'function') syncIncompatibleControlsUI();
    if (typeof scheduleRebuild3D === 'function') scheduleRebuild3D(20);
    else if (typeof rebuild3DModel === 'function') rebuild3DModel();
}

function switchSide(side) {
    ensureSideStatesInitialized();
    if (side !== 'A' && side !== 'B') return;
    if (activeSide === side) return;

    syncActiveSideStateFromDOM();
    activeSide = side;

    document.getElementById('btn-side-a')?.classList.toggle('active', side === 'A');
    document.getElementById('btn-side-b')?.classList.toggle('active', side === 'B');

    const source = (side === 'A') ? sideAData : sideBData;
    qrECCLevel = source.ecc || 'H';
    badgeScale = source.badgeScale || 1.0;
    customBadgeImg = source.customBadgeImg || null;
    customLogoThreshold = source.customLogoThreshold || 150;
    customLogoInvert = !!source.customLogoInvert;

    const selEcc = document.getElementById('select-ecc');
    if (selEcc) selEcc.value = qrECCLevel;
    updateQRECCLabel(qrECCLevel);

    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    setVal('slider-text-size', source.textSize ?? 8.0);
    setVal('slider-top-offset', source.topOffset ?? 38);
    setVal('slider-bottom-offset', source.bottomOffset ?? 38);
    setVal('slider-badge-scale', badgeScale);
    const bsLbl = document.getElementById('label-badge-scale');
    if (bsLbl) bsLbl.innerText = Math.round(badgeScale * 100) + '%';
    setVal('slider-logo-threshold', customLogoThreshold);
    const thLbl = document.getElementById('label-logo-threshold');
    if (thLbl) thLbl.innerText = String(customLogoThreshold);
    const invChk = document.getElementById('chk-logo-invert');
    if (invChk) invChk.checked = customLogoInvert;

    selectPreset(source.preset, source.fields, source.topText, source.bottomText, source.badge, true);

    // Side A is ALWAYS top (+Y), Side B is ALWAYS bottom (-Y) (or back of Table Tent) -> orient camera to match!
    if ((isDualSided || (typeof currentShape !== 'undefined' && currentShape === 'tent')) && typeof focusCameraOnSide === 'function') {
        focusCameraOnSide(side);
    }
}
