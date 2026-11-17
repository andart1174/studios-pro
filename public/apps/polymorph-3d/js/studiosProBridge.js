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
    } else if (msg.type === 'AR_VIEWER_READY' && window.parent === window) {
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

  // 3. Setup AR Viewer Trigger & Unified AR-Ready Pipeline ("📱 View in AR")
  function setupARViewer() {
    let isExporting = false;
    let lastTapTime = 0;

    function isNodeVisible(node) {
      let cur = node;
      while (cur) {
        if (cur.visible === false) return false;
        cur = cur.parent;
      }
      return true;
    }

    function mergeCompatibleGeometries(entries) {
      // Merge world-transformed BufferGeometries sharing a material
      const hasAnyNormals = entries.every(e => e.geo.attributes.normal);
      const hasAnyUvs = entries.every(e => e.geo.attributes.uv);
      const hasAnyColors = entries.every(e => e.geo.attributes.color);

      let totalVerts = 0;
      const nonIndexed = entries.map(({ geo, worldMat }) => {
        const g = geo.index ? geo.toNonIndexed() : geo.clone();
        g.applyMatrix4(worldMat);
        if (!g.attributes.normal && hasAnyNormals) g.computeVertexNormals();
        totalVerts += g.attributes.position.count;
        return g;
      });

      const posArr = new Float32Array(totalVerts * 3);
      const normArr = hasAnyNormals ? new Float32Array(totalVerts * 3) : null;
      const uvArr = hasAnyUvs ? new Float32Array(totalVerts * 2) : null;
      const colArr = hasAnyColors ? new Float32Array(totalVerts * 3) : null;

      let offset = 0;
      for (const g of nonIndexed) {
        const p = g.attributes.position;
        posArr.set(p.array, offset * 3);
        if (normArr && g.attributes.normal) normArr.set(g.attributes.normal.array, offset * 3);
        if (uvArr && g.attributes.uv) uvArr.set(g.attributes.uv.array, offset * 2);
        if (colArr && g.attributes.color) {
          const itemSize = g.attributes.color.itemSize || 3;
          if (itemSize === 3) {
            colArr.set(g.attributes.color.array, offset * 3);
          } else {
            for (let k = 0; k < p.count; k++) {
              colArr[(offset + k) * 3] = g.attributes.color.getX(k);
              colArr[(offset + k) * 3 + 1] = g.attributes.color.getY(k);
              colArr[(offset + k) * 3 + 2] = g.attributes.color.getZ(k);
            }
          }
        }
        offset += p.count;
        g.dispose();
      }

      const merged = new THREE.BufferGeometry();
      merged.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
      if (normArr) merged.setAttribute('normal', new THREE.BufferAttribute(normArr, 3));
      else merged.computeVertexNormals();
      if (uvArr) merged.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
      if (colArr) merged.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
      return merged;
    }

    function buildAROptimizedScene(sourceModel) {
      const exportScene = new THREE.Scene();
      const clone = sourceModel.clone(true);
      clone.updateMatrixWorld(true);

      const visibleMeshes = [];
      let totalTris = 0;
      const toRemove = [];

      clone.traverse((c) => {
        if (c.isLine || c.isLineSegments || c.isPoints || c.isCamera || c.isLight || (c.userData && c.userData.isHelper) || !isNodeVisible(c)) {
          toRemove.push(c);
        } else if (c.isMesh && c.geometry && c.geometry.attributes && c.geometry.attributes.position) {
          const pos = c.geometry.attributes.position;
          totalTris += c.geometry.index ? (c.geometry.index.count / 3) : (pos.count / 3);
          visibleMeshes.push(c);
        }
      });
      toRemove.forEach((c) => { if (c.parent) c.parent.remove(c); });

      const tempDisposableGeos = [];
      let rootNode = clone;

      // Consolidate high-draw-call assemblies (e.g. 1,843 Bricks / Horology) by material
      if (visibleMeshes.length > 45 && typeof THREE !== 'undefined') {
        const buckets = new Map();
        clone.updateMatrixWorld(true);
        visibleMeshes.forEach((m) => {
          const mat = Array.isArray(m.material) ? m.material[0] : m.material;
          if (!mat) return;
          const key = [
            mat.color ? mat.color.getHexString() : 'ffffff',
            mat.roughness != null ? mat.roughness.toFixed(2) : '0.50',
            mat.metalness != null ? mat.metalness.toFixed(2) : '0.10',
            mat.emissive ? mat.emissive.getHexString() : '000000',
            mat.side || 0,
            mat.vertexColors ? 1 : 0,
            mat.map ? mat.map.uuid : ''
          ].join('|');
          if (!buckets.has(key)) buckets.set(key, { mat, entries: [] });
          buckets.get(key).entries.push({ geo: m.geometry, worldMat: m.matrixWorld });
        });

        const mergedGroup = new THREE.Group();
        mergedGroup.name = sourceModel.name || 'PolyMorph_AR_Model';
        let idx = 0;
        buckets.forEach(({ mat, entries }) => {
          const mergedGeo = mergeCompatibleGeometries(entries);
          tempDisposableGeos.push(mergedGeo);
          const mergedMesh = new THREE.Mesh(mergedGeo, mat);
          mergedMesh.name = `AR_Part_${idx++}`;
          mergedGroup.add(mergedMesh);
        });
        rootNode = mergedGroup;
      }

      // Guard mobile WebXR triangle budget (cap ultra-dense >120k relief meshes for AR only)
      if (totalTris > 120000 && window.CADInspector && typeof window.CADInspector.decimateMesh === 'function') {
        const hasMaps = [];
        rootNode.traverse((c) => {
          if (c.isMesh && c.material && c.material.map) hasMaps.push(c);
        });
        if (hasMaps.length === 0) {
          const targetRatio = Math.max(0.25, Math.min(0.65, 1 - (95000 / totalTris)));
          try {
            window.CADInspector.decimateMesh(rootNode, targetRatio);
          } catch (e) {
            console.warn('[StudiosProBridge] AR decimate skipped:', e);
          }
        }
      }

      // Normalize AR stage: centered in X/Z, grounded flush on Y=0
      rootNode.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(rootNode);
      if (!box.isEmpty()) {
        const center = new THREE.Vector3();
        box.getCenter(center);
        rootNode.position.x -= center.x;
        rootNode.position.z -= center.z;
        rootNode.position.y -= box.min.y;
        rootNode.updateMatrixWorld(true);
      }

      exportScene.add(rootNode);
      exportScene.updateMatrixWorld(true);
      return {
        exportScene,
        rootNode,
        cleanup: () => { tempDisposableGeos.forEach((g) => g.dispose()); }
      };
    }

    async function handleViewInAR(e, customTrigger) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      // Debounce touch/click triggers on mobile phones
      const now = Date.now();
      if (now - lastTapTime < 700) return;
      lastTapTime = now;

      if (isExporting) return;

      const getModel = window.__polymorphGetModel;
      const model = (typeof getModel === 'function' && getModel()) ||
                    (window.Viewer && window.Viewer.currentModel) ||
                    (window.__polymorphViewer && window.__polymorphViewer.currentModel);

      if (!model) {
        const isFr = (window.I18N && window.I18N.currentLang === 'fr');
        alert(isFr ? "Veuillez d'abord générer ou charger un modèle 3D !" : "Please generate or load a 3D model first!");
        return;
      }

      const activeBtn = customTrigger || (e && e.currentTarget) || document.getElementById('tool-view-in-ar');
      const arQrModal = document.getElementById('ar-qr-modal');
      if (arQrModal && arQrModal.style.display !== 'none') arQrModal.style.display = 'none';

      isExporting = true;
      const originalHtml = activeBtn ? activeBtn.innerHTML : null;
      const isFr = (window.I18N && window.I18N.currentLang === 'fr');
      if (activeBtn) {
        activeBtn.innerHTML = `<span>⏳ ${isFr ? 'Préparation AR...' : 'Preparing AR...'}</span>`;
      }

      let prepared = null;
      try {
        let exportSuccess = false;

        const rawDimsMm = (window.StudiosProAR && typeof window.StudiosProAR.measureObjectMm === 'function')
          ? window.StudiosProAR.measureObjectMm(model)
          : null;

        prepared = buildAROptimizedScene(model);

        // Strategy A: Native Three.js GLTFExporter on optimized grounded scene (r128 uses 3-arg parse)
        if (typeof THREE !== 'undefined' && typeof THREE.GLTFExporter !== 'undefined') {
          try {
            const exporter = new THREE.GLTFExporter();
            const glbBuffer = await new Promise((resolve, reject) => {
              try {
                exporter.parse(
                  prepared.exportScene,
                  (gltf) => {
                    if (gltf instanceof ArrayBuffer && gltf.byteLength > 0) {
                      resolve(gltf);
                    } else {
                      reject(new Error('GLTFExporter did not return binary ArrayBuffer'));
                    }
                  },
                  { binary: true }
                );
              } catch (syncErr) {
                reject(syncErr);
              }
            });

            broadcastARModel(glbBuffer, 'polymorph_model.glb', 'glb', true, rawDimsMm);
            exportSuccess = true;
          } catch (gltfErr) {
            console.warn('[StudiosProBridge] Native GLTFExporter on AR clone failed:', gltfErr);
          }
        }

        // Strategy B: Fallback through ModelConverters GLB exporter
        if (!exportSuccess && window.ModelConverters && typeof window.ModelConverters.exportModel === 'function') {
          try {
            const expResult = await window.ModelConverters.exportModel(prepared.rootNode || model, 'glb', 'polymorph_model');
            if (expResult && expResult.blob) {
              const glbBuffer = await expResult.blob.arrayBuffer();
              broadcastARModel(glbBuffer, 'polymorph_model.glb', 'glb', true, rawDimsMm);
              exportSuccess = true;
            }
          } catch (glbErr) {
            console.warn('[StudiosProBridge] ModelConverters GLB export failed:', glbErr);
          }
        }

        // Strategy C: OBJExporter fallback
        if (!exportSuccess && typeof THREE !== 'undefined' && typeof THREE.OBJExporter !== 'undefined') {
          try {
            const exporter = new THREE.OBJExporter();
            const result = exporter.parse(prepared.rootNode || model);
            broadcastARModel(result, 'polymorph_model.obj', 'obj', false, rawDimsMm);
            exportSuccess = true;
          } catch (objErr) {
            console.error('[StudiosProBridge] OBJ fallback failed:', objErr);
          }
        }
      } catch (err) {
        console.error('[StudiosProBridge] AR View trigger error:', err);
      } finally {
        if (prepared && typeof prepared.cleanup === 'function') prepared.cleanup();
        if (activeBtn && originalHtml !== null) activeBtn.innerHTML = originalHtml;
        isExporting = false;
      }
    }

    function broadcastARModel(modelData, name, extension, isBinary, dimensionsMm) {
      const transferId = 'poly_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
      window.lastArModelData = modelData;
      window.lastArModelName = name;
      window.lastArModelExt = extension;
      window.lastArModelIsBinary = isBinary;
      window.lastGeneratedModel = modelData;

      if (window.StudiosProAR && typeof window.StudiosProAR.sendModel === 'function') {
        window.StudiosProAR.sendModel({
          transferId,
          modelData,
          name,
          extension,
          isBinary,
          placement: 'floor',
          dimensionsMm: dimensionsMm || null,
          sourceStudio: 'polymorph-3d'
        });
      } else {
        window.parent.postMessage({
          type: 'OPEN_AR_VIEWER',
          payload: {
            transferId,
            modelData,
            name,
            extension,
            isBinary,
            placement: 'floor',
            dimensionsMm: dimensionsMm || null,
            sourceStudio: 'polymorph-3d'
          }
        }, '*');
      }
    }

    window.launchPolyMorphARViewer = function(triggerEl) {
      return handleViewInAR(null, triggerEl || null);
    };

    const arButtonIds = [
      'tool-view-in-ar',
      'tool-ar-qr',
      'btn-quick-photo-ar-qr',
      'btn-launch-internal-ar',
      'quick-launch-ar',
      'btn-modal-launch-ar'
    ];
    arButtonIds.forEach((btnId) => {
      const el = document.getElementById(btnId);
      if (!el) return;
      el.addEventListener('click', (e) => handleViewInAR(e, el));
      if (btnId === 'tool-view-in-ar' || btnId === 'btn-launch-internal-ar' || btnId === 'quick-launch-ar') {
        el.addEventListener('touchend', (e) => handleViewInAR(e, el), { passive: false });
      }
    });
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
  const exportRegex = /\b(export|exporter|download|telecharger|télécharger|save|sauvegarder|stl|glb|gltf|obj|ply|3mf|dxf|usdz|pdf|svg|depthmap|snapshot|takesnapshot|bundle|record\s*video|record\s*360)\b/i;
  const exportExactIds = new Set([
    'btn-convert-action', 'btn-batch-process', 'tool-snapshot', 'tool-record-video'
  ]);
  const nonPaywallBypassIds = new Set([
    'back-btn', 'tool-view-in-ar', 'tool-ar-qr', 'btn-quick-photo-ar-qr',
    'btn-launch-internal-ar', 'quick-launch-ar', 'btn-modal-launch-ar',
    'modal-close-btn', 'pay-premium-btn', 'btn-acoustic-mic-toggle', 'btn-acoustic-play-recorded'
  ]);

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

    // Bypass internal UI / AR / interactive microphone & apply buttons
    if (target.dataset && (target.dataset.bypassed === 'true' || target.dataset.noPaywall === 'true')) return;
    const id = (target.id || '').toLowerCase();
    if (nonPaywallBypassIds.has(id) || /^btn-(generate|create|build|preview|.*apply)/i.test(id)) return;
    if (target.classList && target.classList.contains('lang-btn')) return;

    const text = (target.innerText || target.textContent || '');
    const titleAttr = (target.getAttribute('title') || '');
    const aria = (target.getAttribute('aria-label') || '');

    const isExport = exportExactIds.has(id) ||
      /^(?:quick-export-|btn-export-|btn-modal-export-)/i.test(id) ||
      exportRegex.test(text) || exportRegex.test(titleAttr) || exportRegex.test(aria) || exportRegex.test(id.replace(/[-_]/g, ' '));

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

  // 7. Clipboard Protection (Allow normal editing inside inputs/textareas)
  ['copy', 'cut'].forEach(function(evt) {
    document.addEventListener(evt, function(e) {
      const target = e.target;
      const tag = target && target.tagName ? target.tagName.toUpperCase() : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (target && target.isContentEditable)) return;

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
