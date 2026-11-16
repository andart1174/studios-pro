/**
 * Studios-Pro Host Bridge, License / Paywall Gateway, External File Drop & HTML Export
 * for New 3D 4D Studio Ultra (`ref: 'n3d'`).
 */
(function () {
  'use strict';

  const STUDIO_REF = 'n3d';
  const channel = typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('studios_pro_channel')
    : null;

  let isAllowed = false;
  let isPremiumUser = false;
  let pendingAction = null;
  let msgSeq = 0;
  window.isPremiumUser = false;

  // Monkey-patch Blob constructor to accept DataView safely (used by STLs/GLBs)
  const OriginalBlob = window.Blob;
  const CustomBlob = function (blobParts, options) {
    if (blobParts && Array.isArray(blobParts)) {
      const safeParts = blobParts.map((part) => {
        if (typeof DataView !== 'undefined' && part instanceof DataView) {
          return new Uint8Array(part.buffer, part.byteOffset, part.byteLength);
        }
        return part;
      });
      return new OriginalBlob(safeParts, options);
    }
    return new OriginalBlob(blobParts, options);
  };
  CustomBlob.prototype = OriginalBlob.prototype;
  window.Blob = CustomBlob;

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

  function runWithConsumption(act) {
    if (typeof act !== 'function') return Promise.resolve();
    return Promise.resolve(act()).finally(() => {
      if (!isPremiumUser && !window.isPremiumUser) {
        isAllowed = false;
        postToHost({ type: 'EXPORT_COMPLETED' });
      }
    });
  }

  function injectExternalFile(file) {
    try {
      const dt = new DataTransfer();
      dt.items.add(file);
      const inputs = document.querySelectorAll('input[type="file"]');
      inputs.forEach((input) => {
        try {
          input.files = dt.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (_) {}
      });
    } catch (err) {
      console.error('External file inject failed:', err);
    }
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
        runWithConsumption(act);
      }
    } else if (msg.type === 'USER_STATUS_RESPONSE' || msg.type === 'USER_STATUS_CHANGED') {
      isPremiumUser = !!(msg.payload && msg.payload.isPremium);
      window.isPremiumUser = isPremiumUser;
    } else if (msg.type === 'LOAD_EXTERNAL_FILE' && msg.payload) {
      (async () => {
        try {
          const { name, data, isBinary } = msg.payload;
          let file;
          if (isBinary) {
            const res = await fetch(data);
            const blob = await res.blob();
            file = new File([blob], name || 'imported.png', { type: blob.type || 'image/png' });
          } else {
            file = new File([data], name || 'imported.svg', { type: 'image/svg+xml' });
          }
          injectExternalFile(file);
        } catch (err) {
          console.error('Error handling LOAD_EXTERNAL_FILE:', err);
        }
      })();
    } else if (msg.type === 'LOAD_EXTERNAL_URL' && msg.payload) {
      (async () => {
        try {
          const { url } = msg.payload;
          const name = url.split('/').pop().split('?')[0] || 'imported.png';
          const res = await fetch(url);
          const blob = await res.blob();
          injectExternalFile(new File([blob], name, { type: blob.type || 'image/png' }));
        } catch (err) {
          console.error('Error handling LOAD_EXTERNAL_URL:', err);
        }
      })();
    }
  }

  if (channel) {
    channel.onmessage = (e) => handleHostMessage(e.data);
  }
  window.addEventListener('message', (e) => handleHostMessage(e.data));

  postToHost({ type: 'GET_USER_STATUS' });

  window.triggerStudiosProPaywall = function (actionCallback) {
    if (isAllowed || isPremiumUser || window.isPremiumUser) {
      return runWithConsumption(actionCallback);
    }
    const standalone = (window.self === window.top);
    pendingAction = actionCallback;
    const modal = document.getElementById('local-payment-modal');
    if (modal && standalone) {
      modal.style.display = 'flex';
      return Promise.resolve();
    }
    postToHost({ type: 'TRIGGER_PAYMENT_MODAL', payload: { ref: STUDIO_REF } });
    // Fallback if host never answers within 350ms when standalone / offline preview
    if (standalone) {
      return runWithConsumption(actionCallback);
    }
    return Promise.resolve();
  };

  window.generateStandaloneHTMLViewer = async function (glbBuffer, titleName) {
    const u8 = new Uint8Array(glbBuffer);
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < u8.length; i += chunk) {
      bin += String.fromCharCode.apply(null, u8.subarray(i, i + chunk));
    }
    const base64Data = btoa(bin);
    const safeTitle = String(titleName || 'model_4d_ultra').replace(/[<>"']/g, '');
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${safeTitle} — Interactive 4D Viewer</title>
  <style>
    body { margin:0; background:#060c1a; color:#fff; font-family:Inter,sans-serif; overflow:hidden; }
    #c { width:100vw; height:100vh; display:block; }
    .hud { position:fixed; bottom:20px; left:20px; background:rgba(15,23,42,.85); backdrop-filter:blur(8px); padding:14px 18px; border-radius:14px; border:1px solid rgba(255,255,255,.12); font-size:12px; }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"><\/script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"><\/script>
</head>
<body>
  <div id="c"></div>
  <div class="hud"><strong>${safeTitle}</strong><br/>Drag to orbit · Scroll to zoom · Studios-Pro.com</div>
  <script>
    const bytes = Uint8Array.from(atob("${base64Data}"), c => c.charCodeAt(0));
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x060c1a);
    const cam = new THREE.PerspectiveCamera(45, innerWidth/innerHeight, 0.001, 100);
    cam.position.set(0, 0.05, 0.38);
    const ren = new THREE.WebGLRenderer({ antialias: true });
    ren.setSize(innerWidth, innerHeight); ren.setPixelRatio(Math.min(devicePixelRatio, 2));
    document.getElementById('c').appendChild(ren.domElement);
    scene.add(new THREE.AmbientLight(0xffffff, 0.72));
    const d1 = new THREE.DirectionalLight(0xffffff, 0.7); d1.position.set(1, 1.5, 2); scene.add(d1);
    const ctl = new THREE.OrbitControls(cam, ren.domElement); ctl.enableDamping = true;
    let mixer = null; const clk = new THREE.Clock();
    new THREE.GLTFLoader().parse(bytes.buffer, '', (g) => {
      scene.add(g.scene);
      if (g.animations && g.animations.length) {
        mixer = new THREE.AnimationMixer(g.scene);
        g.animations.forEach(a => mixer.clipAction(a).play());
      }
    });
    function loop() { requestAnimationFrame(loop); const dt = clk.getDelta(); if (mixer) mixer.update(dt); ctl.update(); ren.render(scene, cam); }
    loop();
    addEventListener('resize', () => { cam.aspect = innerWidth/innerHeight; cam.updateProjectionMatrix(); ren.setSize(innerWidth, innerHeight); });
  <\/script>
</body>
</html>`;
    return new OriginalBlob([html], { type: 'text/html;charset=utf-8' });
  };

  document.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      backBtn.onclick = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        postToHost({ type: 'CLOSE_STUDIO' });
        if (window.self === window.top) window.location.href = '/';
      };
    }

    const modal = document.getElementById('local-payment-modal');
    if (modal) {
      const closeBtn = document.getElementById('modal-close-btn');
      if (closeBtn) closeBtn.onclick = () => { modal.style.display = 'none'; pendingAction = null; };
      const paySingleBtn = document.getElementById('pay-single-btn');
      if (paySingleBtn) {
        paySingleBtn.onclick = () => {
          postToHost({ type: 'START_STRIPE_PAYMENT', payload: { type: 'single', ref: STUDIO_REF } });
          modal.style.display = 'none';
        };
      }
      const payPremiumBtn = document.getElementById('pay-premium-btn');
      if (payPremiumBtn) {
        payPremiumBtn.onclick = () => {
          postToHost({ type: 'START_STRIPE_PAYMENT', payload: { type: 'premium', ref: STUDIO_REF } });
          modal.style.display = 'none';
        };
      }
    }
  });
})();
