// ==========================================
// INDEXEDDB AUTO-SAVE & STUDIOS-PRO LICENSE / PAYWALL BRIDGE
// ==========================================

const PAINTER_DB_NAME = 'studiosPro3MFPainterDB';
const PAINTER_STORE_NAME = 'autosave';
const PAINTER_SAVE_KEY = 'latest_session';
let autoSaveTimer = null;
let autoSaveDirty = false;
let currentModelTitle = 'StudiosPro Model';

function markProjectDirty(modelTitle) {
    if (modelTitle) currentModelTitle = modelTitle;
    autoSaveDirty = true;
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        if (autoSaveDirty) saveProjectToIndexedDB(true);
    }, 3500);
}

function openPainterDB() {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB unavailable'));
            return;
        }
        const req = indexedDB.open(PAINTER_DB_NAME, 1);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(PAINTER_STORE_NAME)) {
                db.createObjectStore(PAINTER_STORE_NAME);
            }
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = (e) => reject(e.target.error);
    });
}

async function saveProjectToIndexedDB(silent = false) {
    if (!currentMesh || !currentMesh.geometry || !triangleColors) return false;
    const posAttr = currentMesh.geometry.attributes.position;
    if (!posAttr || posAttr.count === 0) return false;

    // Avoid wasting IDB quota on gigantic >2.5M tri meshes
    if (triangleColors.length > 800000) return false;

    try {
        const db = await openPainterDB();
        const payload = {
            version: 3,
            savedAt: Date.now(),
            hasUserEdits: true,
            modelTitle: currentModelTitle,
            positions: new Float32Array(posAttr.array),
            triangleColors: new Uint8Array(triangleColors),
            filamentSlots: filamentSlots.map(s => ({
                id: s.id,
                color: s.color,
                hex: s.color,
                name: s.name,
                type: s.type || 'PLA Basic',
                visible: s.visible !== false
            })),
            activeSlotIndex: typeof activeSlotIndex === 'number' ? activeSlotIndex : 0,
            cameraPos: camera ? [camera.position.x, camera.position.y, camera.position.z] : null,
            cameraTarget: controls ? [controls.target.x, controls.target.y, controls.target.z] : null
        };

        await new Promise((resolve, reject) => {
            const tx = db.transaction(PAINTER_STORE_NAME, 'readwrite');
            const store = tx.objectStore(PAINTER_STORE_NAME);
            store.put(payload, PAINTER_SAVE_KEY);
            tx.oncomplete = () => resolve(true);
            tx.onerror = (e) => reject(e.target.error);
        });

        db.close();
        autoSaveDirty = false;
        updateSaveIndicator(payload.savedAt);
        if (!silent && typeof showToast === 'function') {
            showToast(t('projectSaved', 'Project saved to browser storage!'));
        }
        return true;
    } catch (err) {
        console.warn('AutoSave warning:', err);
        return false;
    }
}

function updateSaveIndicator(timestampMs) {
    const el = document.getElementById('autosave-status');
    if (!el) return;
    const d = new Date(timestampMs || Date.now());
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    el.textContent = `${hh}:${mm}`;
    el.title = `Last saved at ${hh}:${mm}`;
}

async function checkSavedProjectBanner() {
    try {
        const db = await openPainterDB();
        const saved = await new Promise((resolve) => {
            const tx = db.transaction(PAINTER_STORE_NAME, 'readonly');
            const req = tx.objectStore(PAINTER_STORE_NAME).get(PAINTER_SAVE_KEY);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
        db.close();

        if (!saved || !saved.positions || !saved.triangleColors || saved.triangleColors.length === 0) return;
        // Only offer restore banner if the session had actual user edits (not untouched default demo!)
        if (saved.version >= 3 && !saved.hasUserEdits) return;
        let nonZero = 0;
        for (let i = 0; i < saved.triangleColors.length; i++) {
            if (saved.triangleColors[i] !== 0) { nonZero++; break; }
        }
        if (nonZero === 0) return;

        const banner = document.getElementById('recovery-banner');
        const msgEl = document.getElementById('recovery-banner-text');
        if (banner && msgEl) {
            const minsAgo = Math.max(1, Math.round((Date.now() - saved.savedAt) / 60000));
            const isFr = (typeof currentLang !== 'undefined' && currentLang === 'fr');
            msgEl.textContent = isFr
                ? `Session sauvegardée (${saved.modelTitle || 'Modèle'}, il y a ${minsAgo} min)`
                : `Saved session found (${saved.modelTitle || 'Model'}, ${minsAgo} min ago)`;
            banner.style.display = 'flex';
        }
    } catch (_) {
        // Ignore IDB errors in restricted incognito contexts
    }
}

async function restoreSavedProject() {
    try {
        const db = await openPainterDB();
        const saved = await new Promise((resolve) => {
            const tx = db.transaction(PAINTER_STORE_NAME, 'readonly');
            const req = tx.objectStore(PAINTER_STORE_NAME).get(PAINTER_SAVE_KEY);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
        db.close();

        if (!saved || !saved.positions || !saved.triangleColors) {
            if (typeof showToast === 'function') showToast('No saved session found');
            return false;
        }

        if (Array.isArray(saved.filamentSlots) && saved.filamentSlots.length > 0) {
            filamentSlots.length = 0;
            saved.filamentSlots.forEach((s, idx) => filamentSlots.push({
                id: s.id || (idx + 1),
                color: s.color,
                hex: s.hex || s.color,
                name: s.name,
                type: s.type || 'PLA Basic',
                visible: s.visible !== false
            }));
            if (typeof saved.activeSlotIndex === 'number') activeSlotIndex = saved.activeSlotIndex;
            if (typeof refreshSlotRgbFloats === 'function') refreshSlotRgbFloats();
            if (typeof renderFilamentGrid === 'function') renderFilamentGrid();
        }

        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(saved.positions), 3));
        geom.computeVertexNormals();
        geom.computeBoundingBox();

        const triCount = Math.floor(saved.positions.length / 9);
        const restoredColors = new Uint8Array(triCount);
        restoredColors.set(saved.triangleColors.subarray(0, triCount));

        if (typeof setLoadedGeometry === 'function') {
            setLoadedGeometry(geom, restoredColors, null, true);
        }
        currentModelTitle = saved.modelTitle || 'Restored Model';

        if (saved.cameraPos && camera && controls) {
            camera.position.set(saved.cameraPos[0], saved.cameraPos[1], saved.cameraPos[2]);
            if (saved.cameraTarget) {
                controls.target.set(saved.cameraTarget[0], saved.cameraTarget[1], saved.cameraTarget[2]);
            }
            controls.update();
        }

        const banner = document.getElementById('recovery-banner');
        if (banner) banner.style.display = 'none';
        updateSaveIndicator(saved.savedAt);
        if (typeof showToast === 'function') showToast(t('sessionRestored', 'Previous painted session restored!'));
        return true;
    } catch (err) {
        console.error('Restore error:', err);
        return false;
    }
}

async function dismissRecoveryBanner() {
    const banner = document.getElementById('recovery-banner');
    if (banner) banner.style.display = 'none';
}

async function clearSavedProject() {
    try {
        const db = await openPainterDB();
        await new Promise((resolve) => {
            const tx = db.transaction(PAINTER_STORE_NAME, 'readwrite');
            tx.objectStore(PAINTER_STORE_NAME).delete(PAINTER_SAVE_KEY);
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        });
        db.close();
        dismissRecoveryBanner();
        if (typeof showToast === 'function') showToast(t('savedCleared', 'Saved browser session cleared'));
    } catch (_) {}
}

// ==========================================
// STUDIOS-PRO LICENSE & PAYWALL BRIDGE
// ==========================================

function initStudiosProBridge() {
    const STUDIO_REF = 'multicolor-3mf-painter';
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

    // Request current user status immediately
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

    if (channel) {
        channel.onmessage = (e) => { if (e && e.data) handleHostMessage(e.data); };
    }
    window.addEventListener('message', (e) => {
        if (e && e.data) handleHostMessage(e.data);
    });

    // Back button closes embedded iframe cleanly or navigates home standalone
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.onclick = function (e) {
            if (e) { e.preventDefault(); e.stopPropagation(); }
            postToHost({ type: 'CLOSE_STUDIO' });
            if (window.self === window.top) {
                window.location.href = '/';
            }
        };
    }

    // Standalone local fallback modal buttons
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
                window.location.href = `https://studios-pro.com/?ref=${STUDIO_REF}&upgrade=pro`;
            }
        };
    }

    window.triggerStudiosProPaywall = function (actionCallback, forcePremium) {
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
            if (!forcePremium) {
                let used = parseInt(localStorage.getItem('freeExportsUsed') || '0', 10);
                if (used < 5) {
                    used++;
                    localStorage.setItem('freeExportsUsed', used.toString());
                    const remaining = 5 - used;
                    if (typeof showToast === 'function') {
                        const isFr = (typeof currentLang !== 'undefined' && currentLang === 'fr');
                        showToast(isFr
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

    // Wrap export & share functions transparently through paywall
    [
        'exportBambu3MF',
        'export3MF',
        'exportSingleMesh3MF',
        'exportSeparateSTLs',
        'exportOBJ',
        'executeSplitterExport',
        'downloadShareSnapshot'
    ].forEach((fnName) => {
        const origFn = window[fnName];
        if (typeof origFn === 'function') {
            window[fnName] = function (...args) {
                window.triggerStudiosProPaywall(() => origFn.apply(this, args));
            };
        }
    });

    // Safe copy/cut guard: NEVER interfere with editable inputs, textareas, selects, or normal canvas shortcuts
    ['copy', 'cut'].forEach((evt) => {
        document.addEventListener(evt, (e) => {
            const rawTgt = e && e.target;
            const tgt = (rawTgt && rawTgt.nodeType === 3) ? rawTgt.parentElement : rawTgt;
            const tag = tgt && tgt.tagName ? tgt.tagName.toUpperCase() : '';
            if (
                tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'CANVAS' ||
                (tgt && tgt.isContentEditable) ||
                (tgt && tgt.closest && tgt.closest('input, textarea, select, [contenteditable="true"]'))
            ) {
                return;
            }
        });
    });

    // Anchor download interceptor
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
