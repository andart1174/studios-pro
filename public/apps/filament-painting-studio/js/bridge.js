        (function() {
const STUDIO_REF = 'filament-painting-studio';
const channel = new BroadcastChannel('studios_pro_channel');
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
    try { channel.postMessage(envelope); } catch(e) {}
    if (window.parent && window.parent !== window) {
        try { window.parent.postMessage(envelope, '*'); } catch(e) {}
    }
}
window.studiosProPostToHost = postToHost;

// Request status from parent Studios-Pro site
postToHost({ type: 'GET_USER_STATUS' });

function runExportWithConsumption(act) {
    if (typeof act !== 'function') return;
    Promise.resolve(act()).finally(() => {
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
    if (isAllowed || isPremiumUser || window.isPremiumUser) {
        if (typeof actionCallback === 'function') {
            runExportWithConsumption(actionCallback);
        }
        return;
    }

    pendingAction = actionCallback;

    // In iframe
    if (window.self !== window.top) {
        postToHost({
            type: 'TRIGGER_PAYMENT_MODAL',
            payload: { ref: STUDIO_REF, forcePremium: !!forcePremium }
        });
    } else {
        // Standalone fallback: 5 free exports check
        if (!forcePremium) {
            let used = parseInt(localStorage.getItem('freeExportsUsed') || '0', 10);
            if (used < 5) {
                used++;
                localStorage.setItem('freeExportsUsed', used.toString());
                const remaining = 5 - used;
                alert(currentLang === 'fr'
                    ? `Export autorisé ! Il vous reste ${remaining} export(s) gratuit(s).`
                    : `Export granted! You have ${remaining} free export(s) left.`);
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

// Wrap executeExport
const origExecuteExport = window.executeExport;
if (typeof origExecuteExport === 'function') {
    window.executeExport = function(format) {
        window.triggerStudiosProPaywall(() => origExecuteExport(format));
    };
}

// Wrap downloadRecipeCardPNG
const origDownloadRecipeCardPNG = window.downloadRecipeCardPNG;
if (typeof origDownloadRecipeCardPNG === 'function') {
    window.downloadRecipeCardPNG = function() {
        window.triggerStudiosProPaywall(() => origDownloadRecipeCardPNG());
    };
}

// Wrap downloadModelOnlyPNG
const origDownloadModelOnlyPNG = window.downloadModelOnlyPNG;
if (typeof origDownloadModelOnlyPNG === 'function') {
    window.downloadModelOnlyPNG = function(mode) {
        window.triggerStudiosProPaywall(() => origDownloadModelOnlyPNG(mode));
    };
}

// Wrap downloadSlicerGcodeScript
const origDownloadSlicerGcodeScript = window.downloadSlicerGcodeScript;
if (typeof origDownloadSlicerGcodeScript === 'function') {
    window.downloadSlicerGcodeScript = function() {
        window.triggerStudiosProPaywall(() => origDownloadSlicerGcodeScript());
    };
}

// Wrap downloadShareSnapshot
const origDownloadShareSnapshot = window.downloadShareSnapshot;
if (typeof origDownloadShareSnapshot === 'function') {
    window.downloadShareSnapshot = function() {
        window.triggerStudiosProPaywall(() => origDownloadShareSnapshot());
    };
}

// Anti-copy & Anti-cut protection (allow normal typing/copying inside inputs & textareas)
['copy', 'cut'].forEach(function(evt) {
    document.addEventListener(evt, function(e) {
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

// Anchor download interceptor
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
