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

function formatRelativeTimeAgo(savedAtMs, isFr) {
    const diffSec = Math.max(0, Math.floor((Date.now() - (savedAtMs || Date.now())) / 1000));
    if (diffSec < 60) return isFr ? "à l'instant" : 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return isFr ? `il y a ${diffMin} min` : `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return isFr ? `il y a ${diffHr} h` : `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    return isFr ? `il y a ${diffDays} j` : `${diffDays}d ago`;
}

async function saveProjectToIndexedDB(silent = false) {
    if (!currentMesh || !currentMesh.geometry || !triangleColors) return false;
    const posAttr = currentMesh.geometry.attributes.position;
    if (!posAttr || posAttr.count === 0) return false;

    // Avoid wasting IDB quota on gigantic >800k tri meshes
    if (triangleColors.length > 800000) return false;

    let db = null;
    try {
        db = await openPainterDB();
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
                name: String(s.name || '').slice(0, 40),
                type: s.type || 'PLA Basic',
                brand: s.brand || 'Generic',
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
            tx.onerror = (e) => reject(e.target.error || new Error('IDB write error'));
            tx.onabort = (e) => reject(e.target.error || new Error('IDB write aborted'));
        });

        autoSaveDirty = false;
        updateSaveIndicator(payload.savedAt);
        if (!silent && typeof showToast === 'function') {
            showToast(t('projectSaved', 'Project saved to browser storage!'));
        }
        return true;
    } catch (err) {
        console.warn('AutoSave warning:', err);
        if (!silent && typeof showToast === 'function') {
            const isFr = (typeof currentLang !== 'undefined' && currentLang === 'fr');
            showToast(isFr
                ? 'Stockage navigateur plein — utilisez "Sauvegarder .sp3mf" à la place.'
                : 'Browser storage full — use "Save .sp3mf" file instead.');
        }
        return false;
    } finally {
        if (db) { try { db.close(); } catch (_) {} }
    }
}

window.addEventListener('pagehide', () => {
    if (autoSaveDirty) {
        clearTimeout(autoSaveTimer);
        saveProjectToIndexedDB(true);
    }
});

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
    let db = null;
    try {
        db = await openPainterDB();
        const saved = await new Promise((resolve) => {
            const tx = db.transaction(PAINTER_STORE_NAME, 'readonly');
            const req = tx.objectStore(PAINTER_STORE_NAME).get(PAINTER_SAVE_KEY);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });

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
            const isFr = (typeof currentLang !== 'undefined' && currentLang === 'fr');
            const relTime = formatRelativeTimeAgo(saved.savedAt, isFr);
            msgEl.textContent = isFr
                ? `Session sauvegardée (${saved.modelTitle || 'Modèle'}, ${relTime})`
                : `Saved session found (${saved.modelTitle || 'Model'}, ${relTime})`;
            banner.style.display = 'flex';
        }
    } catch (_) {
        // Ignore IDB errors in restricted incognito contexts
    } finally {
        if (db) { try { db.close(); } catch (_) {} }
    }
}

async function restoreSavedProject() {
    let db = null;
    try {
        db = await openPainterDB();
        const saved = await new Promise((resolve) => {
            const tx = db.transaction(PAINTER_STORE_NAME, 'readonly');
            const req = tx.objectStore(PAINTER_STORE_NAME).get(PAINTER_SAVE_KEY);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });

        if (!saved || !saved.positions || !saved.triangleColors) {
            if (typeof showToast === 'function') showToast('No saved session found');
            return false;
        }

        if (Array.isArray(saved.filamentSlots) && saved.filamentSlots.length > 0) {
            filamentSlots.length = 0;
            saved.filamentSlots.slice(0, 16).forEach((s, idx) => {
                const safeCol = typeof normalizeHex === 'function' ? normalizeHex(s.color || s.hex) : (s.color || '#FFFFFF');
                filamentSlots.push({
                    id: idx + 1,
                    color: safeCol,
                    hex: safeCol,
                    name: String(s.name || `Slot #${idx + 1}`).replace(/[<>]/g, '').slice(0, 40),
                    type: String(s.type || 'PLA Basic').slice(0, 32),
                    brand: String(s.brand || 'Generic').slice(0, 32),
                    visible: s.visible !== false
                });
            });
            activeSlotIndex = Math.max(0, Math.min(filamentSlots.length - 1, parseInt(saved.activeSlotIndex, 10) || 0));
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
        for (let i = 0; i < restoredColors.length; i++) {
            if (restoredColors[i] >= filamentSlots.length) restoredColors[i] = 0;
        }

        if (typeof setLoadedGeometry === 'function') {
            setLoadedGeometry(geom, restoredColors, null, true);
        }
        currentModelTitle = String(saved.modelTitle || 'Restored Model').slice(0, 80);

        if (Array.isArray(saved.cameraPos) && saved.cameraPos.length === 3 && camera && controls) {
            camera.position.set(saved.cameraPos[0], saved.cameraPos[1], saved.cameraPos[2]);
            if (Array.isArray(saved.cameraTarget) && saved.cameraTarget.length === 3) {
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
    } finally {
        if (db) { try { db.close(); } catch (_) {} }
    }
}

async function dismissRecoveryBanner() {
    const banner = document.getElementById('recovery-banner');
    if (banner) banner.style.display = 'none';
}

async function clearSavedProject() {
    clearTimeout(autoSaveTimer);
    autoSaveDirty = false;
    let db = null;
    try {
        db = await openPainterDB();
        await new Promise((resolve) => {
            const tx = db.transaction(PAINTER_STORE_NAME, 'readwrite');
            tx.objectStore(PAINTER_STORE_NAME).delete(PAINTER_SAVE_KEY);
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
            tx.onabort = () => resolve();
        });
        dismissRecoveryBanner();
        if (typeof showToast === 'function') showToast(t('savedCleared', 'Saved browser session cleared'));
    } catch (_) {
    } finally {
        if (db) { try { db.close(); } catch (_) {} }
    }
}

// ==========================================
// STUDIOS-PRO LICENSE & PAYWALL BRIDGE (HARDENED)
// ==========================================

function initStudiosProBridge() {
    const STUDIO_REF = 'multicolor-3mf-painter';
    const isEmbedded = (window.self !== window.top);
    const channel = (isEmbedded && typeof BroadcastChannel !== 'undefined')
        ? new BroadcastChannel('studios_pro_channel')
        : null;

    let isAllowed = false;
    let isPremiumUser = false;
    let pendingAction = null;
    let exportInFlight = false;
    let msgSeq = 0;

    // Read-only accessor so watermark/UI checks work without allowing console spoofing
    window.isStudiosProPremium = function () { return isPremiumUser === true; };

    function isTrustedOrigin(origin) {
        if (!origin) return true;
        if (origin === window.location.origin) return true;
        if (origin === 'https://studios-pro.com' || origin === 'https://www.studios-pro.com') return true;
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
        return false;
    }

    function postToHost(msg) {
        const envelope = {
            ...msg,
            _msgId: `${STUDIO_REF}_${Date.now()}_${++msgSeq}`
        };
        if (channel && isEmbedded) {
            try { channel.postMessage(envelope); } catch (_) {}
        }
        if (isEmbedded && window.parent) {
            const targetOrigin = (window.location.origin && window.location.origin !== 'null')
                ? window.location.origin
                : '*';
            try { window.parent.postMessage(envelope, targetOrigin); } catch (_) {
                try { window.parent.postMessage(envelope, '*'); } catch (__) {}
            }
        }
    }
    window.studiosProPostToHost = postToHost;

    // Request current user status immediately when embedded
    if (isEmbedded) {
        postToHost({ type: 'GET_USER_STATUS' });
    }

    function runExportWithConsumption(act) {
        if (typeof act !== 'function') return;
        if (exportInFlight) return;
        exportInFlight = true;
        Promise.resolve()
            .then(() => act())
            .then(() => {
                if (!isPremiumUser) {
                    isAllowed = false;
                    if (isEmbedded) postToHost({ type: 'EXPORT_COMPLETED' });
                }
            })
            .catch((err) => {
                console.error('Export action error:', err);
                isAllowed = false;
            })
            .finally(() => {
                exportInFlight = false;
            });
    }

    function handleHostMessage(msg) {
        if (!msg || typeof msg !== 'object') return;
        if (msg.type === 'EXPORT_ALLOWED') {
            isAllowed = true;
            isPremiumUser = !!(msg.payload && msg.payload.isPremium);
            const modal = document.getElementById('local-payment-modal');
            if (modal) modal.style.display = 'none';

            if (typeof pendingAction === 'function') {
                const act = pendingAction;
                pendingAction = null;
                runExportWithConsumption(act);
            }
        } else if (msg.type === 'USER_STATUS_RESPONSE' || msg.type === 'USER_STATUS_CHANGED') {
            isPremiumUser = !!(msg.payload && msg.payload.isPremium);
        }
    }

    if (channel) {
        channel.onmessage = (e) => { if (e && e.data) handleHostMessage(e.data); };
    }
    window.addEventListener('message', (e) => {
    if (e.origin !== window.location.origin) return;
        if (!e || !e.data || !isTrustedOrigin(e.origin)) return;
        handleHostMessage(e.data);
    });

    // Back button closes embedded iframe cleanly or navigates home standalone
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.onclick = function (e) {
            if (e) { e.preventDefault(); e.stopPropagation(); }
            if (isEmbedded) {
                postToHost({ type: 'CLOSE_STUDIO' });
            } else {
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
            if (isEmbedded) {
                postToHost({
                    type: 'START_STRIPE_PAYMENT',
                    payload: { type: 'premium', ref: STUDIO_REF }
                });
            } else {
                window.location.href = `https://studios-pro.com/?ref=${STUDIO_REF}&upgrade=pro`;
            }
        };
    }

    window.triggerStudiosProPaywall = function (actionCallback, forcePremium) {
        if (exportInFlight) return;
        if (isAllowed || isPremiumUser) {
            if (typeof actionCallback === 'function') {
                runExportWithConsumption(actionCallback);
            }
            return;
        }

        pendingAction = actionCallback;

        if (isEmbedded) {
            postToHost({
                type: 'TRIGGER_PAYMENT_MODAL',
                payload: { ref: STUDIO_REF, forcePremium: !!forcePremium }
            });
        } else {
            if (!forcePremium) {
                let used = 0;
                try { used = parseInt(localStorage.getItem('freeExportsUsed') || '0', 10) || 0; } catch (_) {}
                if (used < 5) {
                    used++;
                    try { localStorage.setItem('freeExportsUsed', used.toString()); } catch (_) {}
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

    // Approved Paywall Policy:
    // PAYWALLED = Production 3D/Client exports (.3mf, .stl ZIP, .obj ZIP, Snap-Fit Kit, Batch .3mf ZIP, HTML 3D Client Proof, 4K Mockups)
    // 100% FREE = .sp3mf project save/load, AR Preview, watermarked PNG Snapshot, watermarked Time-Lapse Video, Turntable, Spool Rack backup
    [
        'exportBambu3MF',
        'export3MF',
        'exportSingleMesh3MF',
        'exportSeparateSTLs',
        'exportOBJ',
        'executeSplitterExport',
        'executeBatchName3MFExport',
        'exportStandaloneHTML3D',
        'render4KStudioMockup'
    ].forEach((fnName) => {
        const origFn = window[fnName];
        if (typeof origFn === 'function' && !origFn._paywallWrapped) {
            const wrapped = function (...args) {
                window.triggerStudiosProPaywall(() => origFn.apply(this, args));
            };
            wrapped._paywallWrapped = true;
            window[fnName] = wrapped;
        }
    });

    // Anchor download interceptor (allows dataset.bypassed === 'true' for FREE items!)
    const origAnchorClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
        if (this.download && this.href && this.dataset.bypassed !== 'true') {
            if (!isPremiumUser && !isAllowed) {
                const selfAnchor = this;
                window.triggerStudiosProPaywall(() => {
                    selfAnchor.dataset.bypassed = 'true';
                    origAnchorClick.call(selfAnchor);
                    setTimeout(() => { delete selfAnchor.dataset.bypassed; }, 1000);
                });
                return;
            }
        }
        return origAnchorClick.apply(this, arguments);
    };
}
