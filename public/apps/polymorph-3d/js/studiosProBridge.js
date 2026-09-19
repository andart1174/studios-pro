/**
 * Studios-Pro Integration Bridge & Premium Security Layer
 * PolyMorph 3D Studio - Studios-Pro Ecosystem
 * Language standard: Strictly English (en) and French (fr)
 */
(function() {
  'use strict';

  // 1. BroadcastChannel Communication with Studios-Pro Parent
  const channel = new BroadcastChannel('studios_pro_channel');
  let isAllowed = false;
  let isPremiumUser = false;
  let pendingTarget = null;

  window.isPremiumUser = false;

  // Request user account status from parent site
  channel.postMessage({ type: 'GET_USER_STATUS' });

  // Handle incoming messages from Studios-Pro ecosystem
  channel.onmessage = function(e) {
    if (!e || !e.data) return;
    const msg = e.data;

    if (msg.type === 'EXPORT_ALLOWED') {
      isAllowed = true;
      isPremiumUser = !!(msg.payload && msg.payload.isPremium);
      window.isPremiumUser = isPremiumUser;
      
      const localModal = document.getElementById('local-payment-modal');
      if (localModal) localModal.style.display = 'none';

      if (pendingTarget) {
        const target = pendingTarget;
        pendingTarget = null;
        target.dataset.bypassed = 'true';
        target.click();
        setTimeout(function() {
          delete target.dataset.bypassed;
        }, 1000);
      }
    } else if (msg.type === 'USER_STATUS_RESPONSE' || msg.type === 'USER_STATUS_CHANGED') {
      isPremiumUser = !!(msg.payload && msg.payload.isPremium);
      window.isPremiumUser = isPremiumUser;
    } else if (msg.type === 'AR_VIEWER_READY') {
      // Send active 3D model to AR Viewer
      if (window.lastArModelData) {
        channel.postMessage({
          type: 'LOAD_EXTERNAL_FILE',
          payload: {
            name: window.lastArModelName || 'model.obj',
            extension: window.lastArModelExt || 'obj',
            data: window.lastArModelData,
            isBinary: window.lastArModelIsBinary !== false
          }
        });
      }
    }
  };

  // 2. Setup Back to Studios Button
  function setupBackButton() {
    const backBtn = document.getElementById('back-btn');
    if (!backBtn) return;
    backBtn.onclick = function(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      channel.postMessage({ type: 'CLOSE_STUDIO' });
      window.parent.postMessage({ type: 'CLOSE_STUDIO' }, '*');
      if (window.self === window.top) {
        window.location.href = '/';
      }
    };
  }

  // 3. Setup AR Viewer Trigger ("📱 View in AR")
  function setupARViewer() {
    const arBtn = document.getElementById('tool-view-in-ar');
    if (!arBtn) return;

    arBtn.onclick = function(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }

      const getModel = window.__polymorphGetModel;
      const model = (typeof getModel === 'function' && getModel()) || (window.Viewer && window.Viewer.currentModel);

      if (!model) {
        const isFr = (window.I18N && window.I18N.currentLang === 'fr');
        alert(isFr ? "Veuillez d'abord générer ou charger un modèle 3D !" : "Please generate or load a 3D model first!");
        return;
      }

      // Convert current 3D model for AR Viewer
      if (typeof THREE !== 'undefined' && typeof THREE.OBJExporter !== 'undefined') {
        try {
          const exporter = new THREE.OBJExporter();
          const result = exporter.parse(model);

          window.lastArModelData = result;
          window.lastArModelName = 'polymorph_model.obj';
          window.lastArModelExt = 'obj';
          window.lastArModelIsBinary = false;
          window.lastGeneratedModel = result;

          // Notify parent site to open AR Viewer overlay
          window.parent.postMessage({
            type: 'OPEN_AR_VIEWER',
            payload: { url: 'broadcast', modelData: result }
          }, '*');

          // Broadcast model directly for AR Viewer iframe
          channel.postMessage({
            type: 'LOAD_EXTERNAL_FILE',
            payload: {
              name: 'polymorph_model.obj',
              extension: 'obj',
              data: result,
              isBinary: false
            }
          });

          // Fallback if tested in standalone mode
          if (window.parent === window) {
            setTimeout(function() {
              window.open('/apps/ar-viewer/index.html?url=broadcast', '_blank');
            }, 600);
          }
        } catch (err) {
          console.error('[StudiosProBridge] AR export error:', err);
        }
      }
    };
  }

  // 4. Setup Local Payment Modal Handlers
  function setupLocalModal() {
    const modal = document.getElementById('local-payment-modal');
    if (!modal) return;

    const closeBtn = document.getElementById('modal-close-btn');
    if (closeBtn) {
      closeBtn.onclick = function() {
        modal.style.display = 'none';
        pendingTarget = null;
      };
    }

    const payBtn = document.getElementById('pay-premium-btn');
    if (payBtn) {
      payBtn.onclick = function() {
        channel.postMessage({
          type: 'START_STRIPE_PAYMENT',
          payload: { type: 'premium', ref: 'polymorph' }
        });
        modal.style.display = 'none';
      };
    }
  }

  // 5. Intercept Click Events on Protected Export Buttons
  const exportKeywords = [
    'export', 'download', 'telecharger', 'télécharger', 'save', 'sauvegarder',
    'stl', 'glb', 'gltf', 'obj', 'ply', '3mf', 'dxf', 'pdf', 'html',
    'snapshot', 'video', 'record', 'zip', 'takesnapshot'
  ];

  document.addEventListener('click', function(e) {
    if (!e.isTrusted) return;

    // Check if user is already authorized or action was granted
    if (isAllowed || isPremiumUser || window.isPremiumUser) {
      if (isAllowed) {
        isAllowed = false;
        channel.postMessage({ type: 'EXPORT_COMPLETED' });
      }
      return;
    }

    let target = e.target;
    if (!target) return;
    if (typeof target.closest === 'function') {
      target = target.closest('button') || target.closest('a') || target;
    }
    if (!target) return;

    // Bypass internal UI buttons
    if (target.dataset && target.dataset.bypassed === 'true') return;
    const id = (target.id || '').toLowerCase();
    if (id === 'back-btn' || id === 'tool-view-in-ar' || id === 'modal-close-btn' || id === 'pay-premium-btn') return;
    if (target.classList && target.classList.contains('lang-btn')) return;

    const text = (target.innerText || target.textContent || '').toLowerCase();
    const titleAttr = (target.getAttribute('title') || '').toLowerCase();
    const aria = (target.getAttribute('aria-label') || '').toLowerCase();
    const cls = typeof target.className === 'string' ? target.className.toLowerCase() : '';

    const isExport = exportKeywords.some(function(kw) {
      return text.includes(kw) || titleAttr.includes(kw) || aria.includes(kw) || id.includes(kw) || cls.includes(kw);
    });

    if (isExport) {
      e.preventDefault();
      e.stopImmediatePropagation();
      pendingTarget = target;

      // Broadcast to parent site to show payment request modal
      channel.postMessage({
        type: 'TRIGGER_PAYMENT_MODAL',
        payload: { ref: 'polymorph' }
      });

      // Show local fallback modal if standalone
      if (window.parent === window) {
        const localModal = document.getElementById('local-payment-modal');
        if (localModal) localModal.style.display = 'flex';
      }
    }
  }, true); // Capturing phase

  // 6. Intercept Programmatic Anchor Clicks (Filesaver / Direct Downloads)
  const origAnchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function() {
    if (this.download && this.href && !this.dataset.bypassed) {
      if (!isPremiumUser && !window.isPremiumUser && !isAllowed) {
        channel.postMessage({
          type: 'TRIGGER_PAYMENT_MODAL',
          payload: { ref: 'polymorph' }
        });
        if (window.parent === window) {
          const localModal = document.getElementById('local-payment-modal');
          if (localModal) localModal.style.display = 'flex';
        }
        return;
      }
    }
    return origAnchorClick.apply(this, arguments);
  };

  // 7. Clipboard and Copy Protection (Zero copying without Premium)
  ['copy', 'cut'].forEach(function(evt) {
    document.addEventListener(evt, function(e) {
      if (!isPremiumUser && !window.isPremiumUser && !isAllowed) {
        e.preventDefault();
        e.stopPropagation();
        channel.postMessage({
          type: 'TRIGGER_PAYMENT_MODAL',
          payload: { ref: 'polymorph', forcePremium: true }
        });
        if (window.parent === window) {
          const localModal = document.getElementById('local-payment-modal');
          if (localModal) localModal.style.display = 'flex';
        }
      }
    });
  });

  // Initialize once DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setupBackButton();
      setupARViewer();
      setupLocalModal();
    });
  } else {
    setupBackButton();
    setupARViewer();
    setupLocalModal();
  }
})();
