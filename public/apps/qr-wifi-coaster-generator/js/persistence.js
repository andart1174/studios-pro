// ==========================================
// SETTINGS AUTO-SAVE & STUDIOS-PRO LICENSE / PAYWALL BRIDGE
// ==========================================

const COASTER_PREFS_KEY = 'studiosPro_qrCoaster_prefs_v2';

function saveCoasterPrefs() {
    try {
        const state = {
            preset: activePreset,
            shape: currentShape,
            printStyle,
            isFaceDownMode,
            textLayoutStyle,
            qrPixelStyle,
            qrECCLevel,
            badgeType,
            baseColorHex,
            qrColorHex,
            accentColorHex,
            topText: document.getElementById('input-top-text')?.value || '',
            bottomText: document.getElementById('input-bottom-text')?.value || '',
            size: document.getElementById('slider-size')?.value || '100',
            baseThick: document.getElementById('slider-base-thick')?.value || '3.2',
            reliefHeight: document.getElementById('slider-relief-height')?.value || '1.2',
            lipHeight: document.getElementById('slider-lip-height')?.value || '1.6'
        };
        localStorage.setItem(COASTER_PREFS_KEY, JSON.stringify(state));
    } catch (_) {}
}

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

    // Wrap top-level export actions (downloadBlob also carries bypassed="true" so single exports charge ONLY 1 time)
    [
        'export3MF',
        'exportSeparateSTLs',
        'exportCaddyFullSet3MF',
        'exportLaserBlueprint',
        'generateTableBatchZIP',
        'downloadStudioPhoto',
        'downloadShareSnapshot'
    ].forEach((fnName) => {
        const origFn = window[fnName];
        if (typeof origFn === 'function') {
            window[fnName] = function (...args) {
                return window.triggerStudiosProPaywall(() => origFn.apply(this, args));
            };
        }
    });

    // Safe anti-copy guard: allow copy/cut inside all text inputs & forms!
    ['copy', 'cut'].forEach((evt) => {
        document.addEventListener(evt, (e) => {
            const rawTgt = e && e.target;
            const tgt = (rawTgt && rawTgt.nodeType === 3) ? rawTgt.parentElement : rawTgt;
            const tag = tgt && tgt.tagName ? tgt.tagName.toUpperCase() : '';
            if (
                tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
                (tgt && tgt.isContentEditable) ||
                (tgt && tgt.closest && tgt.closest('input, textarea, select, [contenteditable="true"]'))
            ) {
                return;
            }
            if (!isPremiumUser && !window.isPremiumUser && !isAllowed) {
                e.preventDefault();
                e.stopPropagation();
                window.triggerStudiosProPaywall(null, true);
            }
        });
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
