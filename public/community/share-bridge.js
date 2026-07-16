/* Studios-PRO → Community Share Bridge v5.0 — ping/pong via storage events */
(function () {
  'use strict';

  const COMM_URL = '/community/';
  const LS_KEY   = 'studios_community_share';
  const BC_NAME  = 'sp_community_channel';
  const SRC      = document.title || location.pathname;

  /* ── CSS ──────────────────────────────────────────────── */
  const style = document.createElement('style');
  style.textContent = `
  #_sp_fab{position:fixed;bottom:24px;right:24px;z-index:2147483640;
    display:flex;align-items:center;gap:9px;
    padding:11px 22px;border-radius:999px;border:none;cursor:pointer;
    background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;
    font-family:'Inter',system-ui,sans-serif;font-size:.83rem;font-weight:700;
    box-shadow:0 4px 22px rgba(99,102,241,.55);
    transition:transform .18s,box-shadow .18s,opacity .18s;user-select:none;}
  #_sp_fab:hover{transform:translateY(-3px);box-shadow:0 8px 28px rgba(99,102,241,.75);}
  #_sp_fab:active{transform:translateY(0);}
  #_sp_fab .sp-dot{width:8px;height:8px;border-radius:50%;background:#10b981;
    box-shadow:0 0 8px #10b981;animation:_spl 2s infinite;flex-shrink:0;}
  @keyframes _spl{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.5)}}
  ._sp_t{position:fixed;bottom:80px;right:24px;z-index:2147483641;
    padding:10px 18px;border-radius:12px;
    font-family:'Inter',system-ui,sans-serif;font-size:.82rem;font-weight:600;
    transform:translateX(140%);transition:transform .28s;pointer-events:none;max-width:290px;}
  ._sp_t.ok{background:rgba(16,185,129,.18);border:1px solid rgba(16,185,129,.4);color:#34d399;}
  ._sp_t.err{background:rgba(239,68,68,.18);border:1px solid rgba(239,68,68,.4);color:#f87171;}
  ._sp_t.info{background:rgba(99,102,241,.18);border:1px solid rgba(99,102,241,.4);color:#a78bfa;}
  ._sp_t.show{transform:translateX(0);}
  `;
  document.head.appendChild(style);

  /* ── FAB ──────────────────────────────────────────────── */
  function createFAB() {
    if (document.getElementById('_sp_fab')) return;
    const btn = document.createElement('button');
    btn.id = '_sp_fab';
    btn.title = 'Share screenshot to Community';
    btn.innerHTML = '<span class="sp-dot"></span><span>&#10022; Share to Community</span>';
    btn.addEventListener('click', doShare);
    document.body.appendChild(btn);
  }

  /* ── Main ─────────────────────────────────────────────── */
  function doShare() {
    setFab(false);
    toast('Capturing…', 'info');

    // Case 1: Studio Pro 4D — has a preview iframe with capture3d postMessage
    const iframe = document.getElementById('preview-iframe');
    if (iframe && iframe.contentWindow && iframe.src && iframe.src !== 'about:blank') {
      captureViaIframe(iframe, function(dataUrl) {
        setFab(true);
        if (dataUrl) {
          sendShare(dataUrl);
        } else {
          toast('No 3D preview loaded yet', 'err');
        }
      });
      return;
    }

    // Case 2: Three.js with exposed spRenderer — use WebGL readPixels (no taint)
    const rend = window.spRenderer || window.renderer || window.threeRenderer;
    const sc   = window.spScene   || window.scene    || window.threeScene;
    const cam  = window.spCamera  || window.camera   || window.threeCamera;

    if (rend && rend.getContext && sc && cam) {
      const dataUrl = captureViaGLReadPixels(rend, sc, cam);
      setFab(true);
      if (dataUrl) { sendShare(dataUrl); return; }
    }

    // Case 3: Any other canvas — try normal toDataURL
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const dataUrl = captureCanvas();
      setFab(true);
      if (dataUrl) {
        sendShare(dataUrl);
      } else {
        toast('No canvas found in this tool', 'err');
      }
    }));
  }

  /* ── Capture Methods ──────────────────────────────────── */

  // For Studio Pro 4D (iframe-based): use existing capture3d postMessage
  function captureViaIframe(iframe, cb) {
    toast('Capturing from 3D preview…', 'info');
    let done = false;
    const timeout = setTimeout(function() {
      if (!done) { done = true; cb(null); }
    }, 3000);

    window.addEventListener('message', function handler(e) {
      if (e.data && e.data.type === 'captureOK') {
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        if (!done) { done = true; cb(e.data.url || null); }
      }
      if (e.data && e.data.type === 'captureERR') {
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        if (!done) { done = true; cb(null); }
      }
    });
    iframe.contentWindow.postMessage('capture3d', '*');
  }

  // WebGL readPixels — bypasses canvas taint (works with cross-origin textures)
  function captureViaGLReadPixels(renderer, scene, camera) {
    try {
      renderer.render(scene, camera);
      const gl = renderer.getContext();
      const W  = gl.drawingBufferWidth;
      const H  = gl.drawingBufferHeight;
      if (!W || !H) return null;

      const pixels = new Uint8Array(W * H * 4);
      gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      let bright = 0;
      for (let i = 0; i < Math.min(pixels.length, 400); i += 4) {
        bright += pixels[i] + pixels[i+1] + pixels[i+2];
      }
      if (bright < 100) return null;

      const MAX = 1100;
      const ratio = Math.min(MAX / W, MAX / H, 1);
      const tW = Math.round(W * ratio);
      const tH = Math.round(H * ratio);

      const full = document.createElement('canvas');
      full.width = W; full.height = H;
      const fctx = full.getContext('2d');
      const imgData = fctx.createImageData(W, H);
      for (let row = 0; row < H; row++) {
        const src = (H - 1 - row) * W * 4;
        const dst = row * W * 4;
        imgData.data.set(pixels.subarray(src, src + W * 4), dst);
      }
      fctx.putImageData(imgData, 0, 0);

      const tmp = document.createElement('canvas');
      tmp.width = tW; tmp.height = tH;
      tmp.getContext('2d').drawImage(full, 0, 0, tW, tH);
      return tmp.toDataURL('image/jpeg', 0.85);
    } catch(e) {
      return null;
    }
  }

  // Fallback: normal canvas capture
  function captureCanvas() {
    const all = Array.from(document.querySelectorAll('canvas'));
    if (!all.length) return null;
    const cv = all.reduce((a, b) => (a.width * a.height >= b.width * b.height ? a : b));
    if (!cv.width || !cv.height) return null;
    try {
      const MAX = 1100;
      const ratio = Math.min(MAX / cv.width, MAX / cv.height, 1);
      const W = Math.round(cv.width * ratio);
      const H = Math.round(cv.height * ratio);
      const tmp = document.createElement('canvas');
      tmp.width = W; tmp.height = H;
      const ctx = tmp.getContext('2d');
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(cv, 0, 0, W, H);
      return tmp.toDataURL('image/jpeg', 0.85);
    } catch(e) { return null; }
  }

  /* ── Send to Community ────────────────────────────────── */
  /*
   * PING-PONG via localStorage storage events (NOT throttled in background tabs).
   * 1. Tool writes share data + ping token to localStorage.
   * 2. Community receives the 'storage' event (fires even if tab is sleeping).
   * 3. Community writes pong token back to localStorage + shows modal.
   * 4. Tool reads pong after 350ms — if it matches, community is open → NO window.open.
   * 5. If no pong → community is NOT open → window.open to open it.
   */
  function sendShare(dataUrl) {
    const pingToken = Date.now().toString();
    const payload = {
      type: 'screenshot',
      imageDataUrl: dataUrl,
      source: SRC,
      sourcePage: location.pathname,
      ts: Date.now()
    };

    // 1. Save share data to localStorage
    try { localStorage.setItem(LS_KEY, JSON.stringify(payload)); } catch(e) {}

    // 2. Send ping — community's storage event listener will respond
    try { localStorage.setItem('studios_community_ping', pingToken); } catch(e) {}

    // 3. Also send via BroadcastChannel (redundant but helps in same-window tabs)
    try {
      const bc = new BroadcastChannel(BC_NAME);
      bc.postMessage({ type: 'share', data: payload });
      setTimeout(function() { try { bc.close(); } catch(x) {} }, 1500);
    } catch(e) {}

    toast('Sending to Community…', 'info');

    // 4. Wait 350ms — enough for storage event to fire and pong to be written
    setTimeout(function() {
      let pongReceived = false;
      try {
        const pong = localStorage.getItem('studios_community_pong');
        // Pong must be within 2 seconds and match our ping era
        if (pong && (Date.now() - parseInt(pong)) < 2000) {
          pongReceived = true;
        }
      } catch(e) {}

      if (pongReceived) {
        // Community is open and received the data
        toast('✦ Sent! Switch to your Community tab', 'ok');
      } else {
        // Community is NOT open — open it (it will read from localStorage on load)
        toast('✦ Opening Community…', 'ok');
        setTimeout(function() {
          window.open(COMM_URL + '?share=1', 'studios_community_tab');
        }, 200);
      }
    }, 350);
  }

  /* ── Utils ────────────────────────────────────────────── */
  function setFab(enabled) {
    const fab = document.getElementById('_sp_fab');
    if (!fab) return;
    fab.style.opacity   = enabled ? '' : '.5';
    fab.style.pointerEvents = enabled ? '' : 'none';
  }

  function toast(msg, type) {
    let t = document.querySelector('._sp_t');
    if (!t) { t = document.createElement('div'); t.className = '_sp_t'; document.body.appendChild(t); }
    t.textContent = msg;
    t.className = '_sp_t ' + (type || 'ok');
    void t.offsetWidth;
    t.classList.add('show');
    clearTimeout(t._tid);
    t._tid = setTimeout(() => t.classList.remove('show'), 3500);
  }

  /* ── Init ─────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createFAB);
  } else {
    createFAB();
  }
})();
