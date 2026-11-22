// ==========================================
// WORKING AUTO-SAVE, UNDO/REDO HISTORY, PROJECT .JSON IMPORT/EXPORT
// & STUDIOS-PRO LICENSE / PAYWALL BRIDGE
// ==========================================

const COASTER_PREFS_KEY = 'studiosPro_qrCoaster_prefs_v3';
const MAX_HISTORY_STEPS = 40;

let coasterHistory = [];
let coasterHistoryIndex = -1;
let isRestoringHistory = false;
let autoSaveTimer = null;

function serializeSideForStorage(side, includeWifiPass = true) {
    if (!side) return null;
    const fieldsCopy = { ...(side.fields || {}) };
    if (!includeWifiPass && (side.preset === 'wifi' || side.preset === 'airbnb')) {
        fieldsCopy.pass = '';
    }
    return {
        preset: side.preset,
        topText: side.topText || '',
        bottomText: (!includeWifiPass && (side.preset === 'wifi' || side.preset === 'airbnb') && /^PASS:|^WI-FI:/i.test(side.bottomText || ''))
            ? 'PASS: ********'
            : (side.bottomText || ''),
        badge: side.badge || 'none',
        badgeScale: side.badgeScale || 1.0,
        customLogoThreshold: side.customLogoThreshold || 150,
        customLogoInvert: !!side.customLogoInvert,
        ecc: side.ecc || 'H',
        textSize: side.textSize ?? 8.0,
        topOffset: side.topOffset ?? 38,
        bottomOffset: side.bottomOffset ?? 38,
        fields: fieldsCopy
    };
}

function captureCoasterStateSnapshot(includeWifiPass = true) {
    if (typeof syncActiveSideStateFromDOM === 'function') syncActiveSideStateFromDOM();
    return {
        version: 3,
        shape: currentShape,
        lastCoasterShape,
        printStyle,
        debossHollow,
        isFaceDownMode,
        useWhiteQuietZone,
        textLayoutStyle,
        activeVectorFontId,
        qrPixelStyle,
        qrFinderStyle,
        isDualSided,
        activeSide,
        baseColorHex,
        qrColorHex,
        accentColorHex,
        quietZoneColorHex,
        size: parseFloat(document.getElementById('slider-size')?.value || '100'),
        baseThick: parseFloat(document.getElementById('slider-base-thick')?.value || '3.2'),
        reliefHeight: parseFloat(document.getElementById('slider-relief-height')?.value || '1.2'),
        lipHeight: parseFloat(document.getElementById('slider-lip-height')?.value || '1.6'),
        standAngle: parseFloat(document.getElementById('slider-stand-angle')?.value || '65'),
        caddySlots: parseInt(document.getElementById('slider-caddy-slots')?.value || '6', 10),
        caddyBrand: document.getElementById('input-caddy-brand')?.value || '',
        invertShield: !!document.getElementById('chk-invert-shield')?.checked,
        rubberFeet: !!document.getElementById('chk-rubber-feet')?.checked,
        magnetPockets: !!document.getElementById('chk-magnet-pockets')?.checked,
        nfcPocket: !!document.getElementById('chk-nfc-pocket')?.checked,
        nfcMode,
        drainGrooves: !!document.getElementById('chk-drain-grooves')?.checked,
        sideA: serializeSideForStorage(sideAData, includeWifiPass),
        sideB: serializeSideForStorage(sideBData, includeWifiPass)
    };
}

function hydrateSideFromSnapshot(saved, fallbackPreset) {
    const base = makeDefaultSideState(saved?.preset || fallbackPreset);
    if (!saved) return base;
    base.preset = PRESETS_DATA[saved.preset] ? saved.preset : fallbackPreset;
    base.topText = saved.topText ?? base.topText;
    base.bottomText = saved.bottomText ?? base.bottomText;
    base.badge = saved.badge ?? base.badge;
    base.badgeScale = saved.badgeScale ?? 1.0;
    base.customLogoThreshold = saved.customLogoThreshold ?? 150;
    base.customLogoInvert = !!saved.customLogoInvert;
    base.ecc = saved.ecc || 'H';
    base.textSize = saved.textSize ?? 8.0;
    base.topOffset = saved.topOffset ?? 38;
    base.bottomOffset = saved.bottomOffset ?? 38;
    base.fields = { ...(PRESETS_DATA[base.preset] || {}), ...(saved.fields || {}) };
    const payload = buildQRStringFromState(base.preset, base.fields);
    const built = safeGenerateMatrix(payload, base.ecc, base.badge, base.badgeScale);
    base.rawData = built.payload;
    base.qrMatrix = built.matrix;
    base.clearedRatio = built.clearedRatio;
    return base;
}

function applyCoasterStateSnapshot(state) {
    if (!state || typeof state !== 'object') return false;
    isRestoringHistory = true;
    try {
        const setVal = (id, v) => { const el = document.getElementById(id); if (el && v !== undefined && v !== null) el.value = v; };
        const setChk = (id, v) => { const el = document.getElementById(id); if (el && v !== undefined) el.checked = !!v; };

        printStyle = state.printStyle || 'flush';
        debossHollow = !!state.debossHollow;
        isFaceDownMode = !!state.isFaceDownMode;
        useWhiteQuietZone = !!state.useWhiteQuietZone;
        currentShape = state.shape || 'circle';
        lastCoasterShape = state.lastCoasterShape || 'circle';
        textLayoutStyle = state.textLayoutStyle || 'straight';
        activeVectorFontId = (VECTOR_FONTS && VECTOR_FONTS[state.activeVectorFontId]) ? state.activeVectorFontId : 'outfit';
        qrPixelStyle = state.qrPixelStyle || 'square';
        qrFinderStyle = state.qrFinderStyle || 'square';
        isDualSided = !!state.isDualSided;
        activeSide = (state.activeSide === 'B' && isDualSided) ? 'B' : 'A';
        nfcMode = state.nfcMode === 'sealed' ? 'sealed' : 'open';

        baseColorHex = state.baseColorHex || '#111827';
        qrColorHex = state.qrColorHex || '#f8fafc';
        accentColorHex = state.accentColorHex || '#38bdf8';
        quietZoneColorHex = state.quietZoneColorHex || '#ffffff';

        setVal('picker-base-color', baseColorHex);
        setVal('picker-qr-color', qrColorHex);
        setVal('picker-accent-color', accentColorHex);
        setVal('picker-quiet-color', quietZoneColorHex);
        setVal('slider-size', state.size ?? 100);
        setVal('slider-base-thick', state.baseThick ?? 3.2);
        setVal('slider-relief-height', state.reliefHeight ?? 1.2);
        setVal('slider-lip-height', state.lipHeight ?? 1.6);
        setVal('slider-stand-angle', state.standAngle ?? 65);
        setVal('slider-caddy-slots', state.caddySlots ?? 6);
        setVal('input-caddy-brand', state.caddyBrand ?? '');
        setVal('select-vector-font', activeVectorFontId);
        setVal('select-nfc-mode', nfcMode);

        setChk('chk-deboss-hollow', debossHollow);
        setChk('chk-facedown-pei', isFaceDownMode);
        setChk('chk-white-quiet-zone', useWhiteQuietZone);
        setChk('chk-dual-sided', isDualSided);
        setChk('chk-invert-shield', state.invertShield);
        setChk('chk-rubber-feet', state.rubberFeet !== undefined ? state.rubberFeet : true);
        setChk('chk-magnet-pockets', state.magnetPockets);
        setChk('chk-nfc-pocket', state.nfcPocket);
        setChk('chk-drain-grooves', state.drainGrooves);

        // Restore Side A & Side B states
        sideAData = hydrateSideFromSnapshot(state.sideA, 'wifi');
        sideBData = hydrateSideFromSnapshot(state.sideB, 'menu');
        const activeSrc = (activeSide === 'B') ? sideBData : sideAData;

        qrECCLevel = activeSrc.ecc || 'H';
        badgeScale = activeSrc.badgeScale || 1.0;
        customLogoThreshold = activeSrc.customLogoThreshold || 150;
        customLogoInvert = !!activeSrc.customLogoInvert;
        setVal('select-ecc', qrECCLevel);
        setVal('slider-text-size', activeSrc.textSize ?? 8.0);
        setVal('slider-top-offset', activeSrc.topOffset ?? 38);
        setVal('slider-bottom-offset', activeSrc.bottomOffset ?? 38);
        setVal('slider-badge-scale', badgeScale);
        setVal('slider-logo-threshold', customLogoThreshold);
        setChk('chk-logo-invert', customLogoInvert);

        // Sync UI active classes
        ['flush', 'embossed', 'debossed'].forEach(s => document.getElementById('style-' + s)?.classList.toggle('active', s === printStyle));
        ['circle', 'squircle', 'hexagon', 'octagon', 'shield', 'keychain', 'stand', 'tent', 'magnet', 'caddy'].forEach(s => document.getElementById('shape-' + s)?.classList.toggle('active', s === currentShape));
        ['square', 'dots', 'connected'].forEach(s => document.getElementById('qr-style-' + s)?.classList.toggle('active', s === qrPixelStyle));
        ['square', 'rounded', 'circle'].forEach(s => document.getElementById('qr-finder-' + s)?.classList.toggle('active', s === qrFinderStyle));
        document.getElementById('text-layout-straight')?.classList.toggle('active', textLayoutStyle === 'straight');
        document.getElementById('text-layout-curved')?.classList.toggle('active', textLayoutStyle === 'curved');
        document.getElementById('btn-side-a')?.classList.toggle('active', activeSide === 'A');
        document.getElementById('btn-side-b')?.classList.toggle('active', activeSide === 'B');
        const dualCtrl = document.getElementById('dual-sided-controls');
        if (dualCtrl) dualCtrl.style.display = isDualSided ? 'block' : 'none';

        if (typeof loadVectorFont === 'function') loadVectorFont(activeVectorFontId);
        if (typeof updateQRECCLabel === 'function') updateQRECCLabel(qrECCLevel);
        if (typeof updateShapeContextualControls === 'function') updateShapeContextualControls();
        if (typeof syncIncompatibleControlsUI === 'function') syncIncompatibleControlsUI();

        selectPreset(activeSrc.preset, activeSrc.fields, activeSrc.topText, activeSrc.bottomText, activeSrc.badge, true);
        if (typeof updateColors === 'function') updateColors(true);
        if (typeof rebuild3DModel === 'function') rebuild3DModel();
        return true;
    } catch (e) {
        console.warn('Failed to restore coaster state:', e);
        return false;
    } finally {
        isRestoringHistory = false;
    }
}

function saveCoasterPrefs() {
    if (isRestoringHistory) return;
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        try {
            const snap = captureCoasterStateSnapshot(true);
            const json = JSON.stringify(snap);
            localStorage.setItem(COASTER_PREFS_KEY, json);
            pushUndoSnapshot(json);
        } catch (_) {}
    }, 260);
}

function loadCoasterPrefs() {
    try {
        const raw = localStorage.getItem(COASTER_PREFS_KEY);
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        const ok = applyCoasterStateSnapshot(parsed);
        if (ok) {
            coasterHistory = [raw];
            coasterHistoryIndex = 0;
            updateUndoRedoButtons();
        }
        return ok;
    } catch (_) {
        return false;
    }
}

// ==========================================
// UNDO / REDO STACK (CTRL+Z / CTRL+Y)
// ==========================================

function pushUndoSnapshot(jsonStr) {
    if (isRestoringHistory) return;
    if (coasterHistoryIndex >= 0 && coasterHistory[coasterHistoryIndex] === jsonStr) return;
    coasterHistory = coasterHistory.slice(0, coasterHistoryIndex + 1);
    coasterHistory.push(jsonStr);
    if (coasterHistory.length > MAX_HISTORY_STEPS) {
        coasterHistory.shift();
    }
    coasterHistoryIndex = coasterHistory.length - 1;
    updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
    const btnU = document.getElementById('btn-undo');
    const btnR = document.getElementById('btn-redo');
    if (btnU) btnU.disabled = coasterHistoryIndex <= 0;
    if (btnR) btnR.disabled = coasterHistoryIndex >= coasterHistory.length - 1;
}

function undoCoaster() {
    if (coasterHistoryIndex <= 0) return;
    coasterHistoryIndex--;
    try {
        applyCoasterStateSnapshot(JSON.parse(coasterHistory[coasterHistoryIndex]));
        localStorage.setItem(COASTER_PREFS_KEY, coasterHistory[coasterHistoryIndex]);
        updateUndoRedoButtons();
        showToast(currentLang === 'fr' ? 'Annulé (Ctrl+Z)' : 'Undone (Ctrl+Z)');
    } catch (_) {}
}

function redoCoaster() {
    if (coasterHistoryIndex >= coasterHistory.length - 1) return;
    coasterHistoryIndex++;
    try {
        applyCoasterStateSnapshot(JSON.parse(coasterHistory[coasterHistoryIndex]));
        localStorage.setItem(COASTER_PREFS_KEY, coasterHistory[coasterHistoryIndex]);
        updateUndoRedoButtons();
        showToast(currentLang === 'fr' ? 'Rétabli (Ctrl+Y)' : 'Redone (Ctrl+Y)');
    } catch (_) {}
}

// ==========================================
// PROJECT SAVE / LOAD (.coaster.json) & FACTORY RESET
// ==========================================

function openProjectModal() {
    if (typeof closeAllModals === 'function') closeAllModals();
    const modal = document.getElementById('project-modal');
    if (modal) { modal.style.display = 'flex'; refreshIcons(); }
}

function closeProjectModal() {
    const modal = document.getElementById('project-modal');
    if (modal) modal.style.display = 'none';
}

function exportProjectJson() {
    const incPass = !!document.getElementById('chk-include-wifi-pass')?.checked;
    const snap = captureCoasterStateSnapshot(incPass);
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `StudiosPro_Coaster_Project_${Date.now()}.coaster.json`);
    showToast(currentLang === 'fr' ? 'Projet .coaster.json sauvegardé !' : 'Project .coaster.json saved!');
}

function handleProjectJsonUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const parsed = JSON.parse(String(evt.target.result || ''));
            if (applyCoasterStateSnapshot(parsed)) {
                saveCoasterPrefs();
                closeProjectModal();
                showToast(currentLang === 'fr' ? 'Projet chargé avec succès !' : 'Project loaded successfully!');
            }
        } catch (_) {
            showToast(currentLang === 'fr' ? 'Fichier JSON invalide.' : 'Invalid project JSON file.');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

function resetCoasterDefaults() {
    try { localStorage.removeItem(COASTER_PREFS_KEY); } catch (_) {}
    applyCoasterStateSnapshot({
        version: 3,
        shape: 'circle',
        lastCoasterShape: 'circle',
        printStyle: 'flush',
        debossHollow: false,
        isFaceDownMode: false,
        useWhiteQuietZone: true,
        textLayoutStyle: 'straight',
        activeVectorFontId: 'outfit',
        qrPixelStyle: 'square',
        qrFinderStyle: 'square',
        isDualSided: false,
        activeSide: 'A',
        baseColorHex: '#111827',
        qrColorHex: '#111827',
        accentColorHex: '#38bdf8',
        quietZoneColorHex: '#ffffff',
        size: 100,
        baseThick: 3.2,
        reliefHeight: 1.2,
        lipHeight: 1.6,
        standAngle: 65,
        caddySlots: 6,
        caddyBrand: '',
        invertShield: false,
        rubberFeet: true,
        magnetPockets: false,
        nfcPocket: false,
        nfcMode: 'open',
        drainGrooves: false,
        sideA: null,
        sideB: null
    });
    saveCoasterPrefs();
    closeProjectModal();
    showToast(currentLang === 'fr' ? 'Paramètres par défaut restaurés !' : 'Factory defaults restored!');
}

// ==========================================
// STUDIOS-PRO LICENSE / PAYWALL BRIDGE
// ==========================================

function initStudiosProBridge() {
    const STUDIO_REF = 'qr-wifi-coaster-generator';
    const channel = typeof BroadcastChannel !== 'undefined'
        ? new BroadcastChannel('studios_pro_channel')
        : null;

    let isAllowed = false;
    let isPremiumUser = false;
    let pendingAction = null;
    let msgSeq = 0;
    window.isPremiumUser = false;

    function postToHost(msg) {
        const envelope = {
            ...msg,
            _msgId: `${STUDIO_REF}_${Date.now()}_${++msgSeq}`
        };
        // Obey AR bridge contract: do not duplicate OPEN_AR_VIEWER via both BroadcastChannel & postMessage inside iframe
        if (msg && msg.type === 'OPEN_AR_VIEWER' && window.parent && window.parent !== window) {
            try { window.parent.postMessage(envelope, '*'); } catch (_) {}
            return;
        }
        if (channel) {
            try { channel.postMessage(envelope); } catch (_) {}
        }
        if (window.parent && window.parent !== window) {
            try { window.parent.postMessage(envelope, '*'); } catch (_) {}
        }
    }
    window.studiosProPostToHost = postToHost;

    postToHost({ type: 'GET_USER_STATUS' });

    function runExportWithConsumption(act) {
        if (typeof act !== 'function') return Promise.resolve();
        return Promise.resolve(act()).finally(() => {
            if (!isPremiumUser && !window.isPremiumUser) {
                isAllowed = false;
                postToHost({ type: 'EXPORT_COMPLETED' });
            }
        });
    }

    function handleHostMessage(msg) {
        if (!msg || typeof msg !== 'object') return;
        if (msg.type === 'EXPORT_ALLOWED') {
            isAllowed = true;
            isPremiumUser = !!(msg.payload && msg.payload.isPremium);
            window.isPremiumUser = isPremiumUser;
            const modal = document.getElementById('local-payment-modal');
            if (modal) modal.style.display = 'none';

            if (typeof pendingAction === 'function') {
                const act = pendingAction;
                pendingAction = null;
                runExportWithConsumption(act);
            }
        } else if (msg.type === 'USER_STATUS_RESPONSE' || msg.type === 'USER_STATUS_CHANGED') {
            isPremiumUser = !!(msg.payload && msg.payload.isPremium);
            window.isPremiumUser = isPremiumUser;
        }
    }

    if (channel) {
        channel.onmessage = (e) => { if (e && e.data) handleHostMessage(e.data); };
    }
    window.addEventListener('message', (e) => {
        if (e && e.data) handleHostMessage(e.data);
    });

    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.onclick = function (e) {
            if (e) { e.preventDefault(); e.stopPropagation(); }
            postToHost({ type: 'CLOSE_STUDIO' });
            if (window.self === window.top) window.location.href = '/';
        };
    }

    const localModal = document.getElementById('local-payment-modal');
    const closeLocalBtn = document.getElementById('close-local-pricing-modal');
    const startFreeBtn = document.getElementById('btn-local-start-free');
    const upgradeProBtn = document.getElementById('btn-local-upgrade-pro');

    if (closeLocalBtn) closeLocalBtn.onclick = () => { if (localModal) localModal.style.display = 'none'; pendingAction = null; };
    if (startFreeBtn) startFreeBtn.onclick = () => { if (localModal) localModal.style.display = 'none'; pendingAction = null; };
    if (upgradeProBtn) {
        upgradeProBtn.onclick = () => {
            postToHost({
                type: 'START_STRIPE_PAYMENT',
                payload: { type: 'premium', ref: STUDIO_REF }
            });
            if (window.self === window.top) {
                window.location.href = `https://studios-pro.com/?ref=${STUDIO_REF}&upgrade=pro`;
            }
        };
    }

    window.triggerStudiosProPaywall = function (actionCallback, forcePremium = false) {
        if (isAllowed || isPremiumUser || window.isPremiumUser) {
            if (typeof actionCallback === 'function') return runExportWithConsumption(actionCallback);
            return Promise.resolve();
        }

        pendingAction = actionCallback;

        if (window.self !== window.top) {
            postToHost({
                type: 'TRIGGER_PAYMENT_MODAL',
                payload: { ref: STUDIO_REF, forcePremium: !!forcePremium }
            });
        } else {
            if (!forcePremium) {
                let used = parseInt(localStorage.getItem('freeExportsUsed') || '0', 10);
                if (used < 5) {
                    used++;
                    localStorage.setItem('freeExportsUsed', used.toString());
                    const remaining = 5 - used;
                    if (typeof showToast === 'function') {
                        showToast(currentLang === 'fr'
                            ? `Export autorisé ! ${remaining} export(s) gratuit(s) restant(s).`
                            : `Export granted! ${remaining} free export(s) left.`);
                    }
                    isAllowed = true;
                    if (typeof pendingAction === 'function') {
                        const act = pendingAction;
                        pendingAction = null;
                        runExportWithConsumption(act);
                    }
                    return;
                }
            }
            if (localModal) localModal.style.display = 'flex';
        }
    };

    // Wrap fabrication exports only (downloadShareSnapshot & exportProjectJson stay FREE!)
    [
        'export3MF',
        'exportSeparateSTLs',
        'exportCaddyFullSet3MF',
        'exportLaserBlueprint',
        'exportCalibrationSwatch',
        'generateTableBatchZIP',
        'downloadStudioPhoto'
    ].forEach((fnName) => {
        const origFn = window[fnName];
        if (typeof origFn === 'function') {
            window[fnName] = function (...args) {
                return window.triggerStudiosProPaywall(() => origFn.apply(this, args));
            };
        }
    });

    const origAnchorClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
        if (this.download && this.href && !this.dataset.bypassed) {
            if (!isPremiumUser && !window.isPremiumUser && !isAllowed) {
                const selfAnchor = this;
                window.triggerStudiosProPaywall(() => {
                    selfAnchor.dataset.bypassed = 'true';
                    selfAnchor.click();
                    setTimeout(() => { delete selfAnchor.dataset.bypassed; }, 1000);
                });
                return;
            }
        }
        return origAnchorClick.apply(this, arguments);
    };
}
