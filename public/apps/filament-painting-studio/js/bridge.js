(function() {
    const STUDIO_REF = 'filament-painting-studio';
    const channel = new BroadcastChannel('studios_pro_channel');
    let isAllowed = false;
    let isPremiumUser = false;
    let pendingAction = null;
    let msgSeq = 0;
    let _exportInFlight = false;
    window.isPremiumUser = false;

    function postToHost(msg) {
        const envelope = {
            ...msg,
            _msgId: `${STUDIO_REF}_${Date.now()}_${++msgSeq}`
        };
        const inIframe = (window.parent && window.parent !== window);
        // Never duplicate multi-MB OPEN_AR_VIEWER payloads over BOTH BroadcastChannel AND parent.postMessage!
        if (inIframe && msg && msg.type === 'OPEN_AR_VIEWER') {
            try { window.parent.postMessage(envelope, '*'); } catch (e) {}
            return;
        }
        try { channel.postMessage(envelope); } catch (e) {}
        if (inIframe) {
            try { window.parent.postMessage(envelope, '*'); } catch (e) {}
        }
    }
    window.studiosProPostToHost = postToHost;

    // Request status from parent Studios-Pro site
    postToHost({ type: 'GET_USER_STATUS' });

    function runExportWithConsumption(act) {
        if (typeof act !== 'function') return;
        if (_exportInFlight) return;
        _exportInFlight = true;
        Promise.resolve()
            .then(() => act())
            .then((result) => {
                // Only consume an export credit if the export succeeded (didn't return false)
                if (result !== false && !isPremiumUser && !window.isPremiumUser) {
                    isAllowed = false;
                    postToHost({ type: 'EXPORT_COMPLETED' });
                }
            })
            .catch((err) => {
                console.error('[Bridge] Export action failed (credit not consumed):', err);
            })
            .finally(() => {
                _exportInFlight = false;
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

    channel.onmessage = function(e) {
        if (e && e.data) handleHostMessage(e.data);
    };
    window.addEventListener('message', function(e) {
        if (e && e.data) handleHostMessage(e.data);
    });

    // Back button handling
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.onclick = function(e) {
            if (e) { e.preventDefault(); e.stopPropagation(); }
            postToHost({ type: 'CLOSE_STUDIO' });
            if (window.self === window.top) {
                window.location.href = '/';
            }
        };
    }

    // Local fallback modal handlers
    const localModal = document.getElementById('local-payment-modal');
    const closeLocalBtn = document.getElementById('close-local-pricing-modal');
    const startFreeBtn = document.getElementById('btn-local-start-free');
    const upgradeProBtn = document.getElementById('btn-local-upgrade-pro');

    if (closeLocalBtn) {
        closeLocalBtn.onclick = () => { if (localModal) localModal.style.display = 'none'; pendingAction = null; };
    }
    if (startFreeBtn) {
        startFreeBtn.onclick = () => { if (localModal) localModal.style.display = 'none'; pendingAction = null; };
    }
    if (upgradeProBtn) {
        upgradeProBtn.onclick = () => {
            postToHost({
                type: 'START_STRIPE_PAYMENT',
                payload: { type: 'premium', ref: STUDIO_REF }
            });
            if (window.self === window.top) {
                window.location.href = 'https://studios-pro.com/?ref=' + STUDIO_REF + '&upgrade=pro';
            }
        };
    }

    window.triggerStudiosProPaywall = function(actionCallback, forcePremium) {
        if (_exportInFlight) return;
        if (isAllowed || isPremiumUser || window.isPremiumUser) {
            if (typeof actionCallback === 'function') {
                runExportWithConsumption(actionCallback);
            }
            return;
        }

        pendingAction = actionCallback;

        if (window.self !== window.top) {
            postToHost({
                type: 'TRIGGER_PAYMENT_MODAL',
                payload: { ref: STUDIO_REF, forcePremium: !!forcePremium }
            });
        } else {
            // Standalone fallback: 5 free exports with non-blocking toast (no alert()!)
            if (!forcePremium) {
                let used = parseInt(localStorage.getItem('freeExportsUsed') || '0', 10);
                if (used < 5) {
                    used++;
                    localStorage.setItem('freeExportsUsed', used.toString());
                    const remaining = 5 - used;
                    if (typeof showToast === 'function') {
                        showToast(currentLang === 'fr'
                            ? `Export autorisé ! (${remaining} export(s) gratuit(s) restant(s))`
                            : `Export granted! (${remaining} free export(s) remaining)`);
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

    // Paywalled PRODUCTION exports ONLY:
    // (.3mf, .stl, Split ZIP, Mural ZIP, 4K Model-Only PNG, 4K Studio Mockup, Recipe Card PNG, Standalone HTML 3D, Slicer Script)
    // Utility actions remain 100% FREE: Save .spfp, TD Calibration Wedge STL, Watermarked Share Snapshot, AR Preview, Spool Rack Backup!
    const wrapPaywalled = (fnName) => {
        const orig = window[fnName];
        if (typeof orig === 'function') {
            window[fnName] = function(...args) {
                window.triggerStudiosProPaywall(() => orig.apply(this, args));
            };
        }
    };

    wrapPaywalled('executeExport');
    wrapPaywalled('downloadRecipeCardPNG');
    wrapPaywalled('downloadModelOnlyPNG');
    wrapPaywalled('downloadStudioMockupPNG');
    wrapPaywalled('downloadStandaloneHTML3D');
    wrapPaywalled('downloadSlicerGcodeScript');

    // Anchor download interceptor (respects dataset.bypassed for free utilities & post-paywall downloads)
    const origAnchorClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function() {
        if (this.download && this.href && !this.dataset.bypassed) {
            if (!isPremiumUser && !window.isPremiumUser && !isAllowed) {
                const selfAnchor = this;
                window.triggerStudiosProPaywall(() => {
                    selfAnchor.dataset.bypassed = 'true';
                    selfAnchor.click();
                    setTimeout(() => delete selfAnchor.dataset.bypassed, 1000);
                });
                return;
            }
        }
        return origAnchorClick.apply(this, arguments);
    };
})();
