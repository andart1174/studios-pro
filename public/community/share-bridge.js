/* Studios-PRO → Community Share Bridge v3.0 */
(function () {
  'use strict';

  const COMM_URL  = '/community/';
  const LS_KEY    = 'studios_community_share';
  const BC_NAME   = 'sp_community_channel';
  const SRC       = document.title || location.pathname;

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
  ._sp_t.show{transform:translateX(0);}
  `;
  document.head.appendChild(style);

  /* ── Create FAB ───────────────────────────────────────── */
  function createFAB() {
    if (document.getElementById('_sp_fab')) return;
    const btn = document.createElement('button');
    btn.id = '_sp_fab';
    btn.title = 'Share screenshot to Community';
    btn.innerHTML = '<span class="sp-dot"></span><span>&#10022; Share to Community</span>';
    btn.addEventListener('click', doShare);
    document.body.appendChild(btn);
  }

  /* ── Main action ──────────────────────────────────────── */
  function doShare() {
    const fab = document.getElementById('_sp_fab');
    if (fab) { fab.style.opacity = '.5'; fab.style.pointerEvents = 'none'; }

    // Force a Three.js render frame (checks global AND sp* names)
    forceRender();

    // Wait 2 animation frames for GPU flush
    requestAnimationFrame(() => requestAnimationFrame(() => {
      capture(function (dataUrl, err) {
        if (fab) { fab.style.opacity = ''; fab.style.pointerEvents = ''; }

        if (err || !dataUrl) {
          toast('No canvas found in this tool', 'err');
          return;
        }

        const payload = {
          type: 'screenshot',
          imageDataUrl: dataUrl,
          source: SRC,
          sourcePage: location.pathname,
          ts: Date.now()
        };

        // Save to localStorage as fallback
        try {
          localStorage.setItem(LS_KEY, JSON.stringify(payload));
        } catch(e) { /* storage full — try without image */ }

        toast('✦ Sending to Community…', 'ok');

        // Try BroadcastChannel first — if Community tab is open, it receives instantly
        let ackReceived = false;
        try {
          const bc = new BroadcastChannel(BC_NAME);
          bc.onmessage = function(e) {
            if (e.data === 'ack') {
              ackReceived = true;
              toast('✦ Sent! Check Community tab', 'ok');
            }
            bc.close();
          };
          bc.postMessage({ type: 'share', data: payload });

          // Wait 300ms — if no ack, Community tab is closed → open it
          setTimeout(function () {
            bc.close();
            if (!ackReceived) {
              // Open Community in a new tab (just once)
              window.open(COMM_URL + '?share=1', '_blank');
            }
          }, 350);
        } catch(e) {
          // BroadcastChannel not supported — open tab
          window.open(COMM_URL + '?share=1', '_blank');
        }
      });
    }));
  }

  /* ── Force render ─────────────────────────────────────── */
  function forceRender() {
    try {
      // Check sp* names (our exposed vars) and common global names
      const rend = window.spRenderer || window.renderer || window.threeRenderer;
      const sc   = window.spScene   || window.scene    || window.threeScene  || window.mainScene;
      const cam  = window.spCamera  || window.camera   || window.cam         || window.threeCamera;
      if (rend && rend.render && sc && cam) {
        rend.render(sc, cam);
      }
    } catch(e) {}
  }

  /* ── Capture canvas ───────────────────────────────────── */
  function capture(cb) {
    // Prefer the renderer's own canvas if available
    const rend = window.spRenderer || window.renderer || window.threeRenderer;
    let cv = (rend && rend.domElement) ? rend.domElement : null;

    // Fallback: largest canvas on page
    if (!cv) {
      const all = Array.from(document.querySelectorAll('canvas'));
      if (!all.length) { cb(null, true); return; }
      cv = all.reduce((a, b) => (a.width * a.height >= b.width * b.height ? a : b));
    }

    if (!cv || !cv.width || !cv.height) { cb(null, true); return; }

    try {
      const MAX = 1100;
      const ratio = Math.min(MAX / cv.width, MAX / cv.height, 1);
      const W = Math.round(cv.width  * ratio);
      const H = Math.round(cv.height * ratio);

      const tmp = document.createElement('canvas');
      tmp.width = W; tmp.height = H;
      const ctx = tmp.getContext('2d');

      // Dark background first (handles transparent canvases)
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(cv, 0, 0, W, H);

      // Detect if still black (mostly empty canvas)
      try {
        const px = ctx.getImageData(0, 0, Math.min(W, 30), Math.min(H, 30)).data;
        let bright = 0;
        for (let i = 0; i < px.length; i += 4) bright += px[i] + px[i+1] + px[i+2];
        if (bright < 500) {
          // Still very dark — try forcing another render and drawing again
          forceRender();
          ctx.fillStyle = '#0d1117';
          ctx.fillRect(0, 0, W, H);
          ctx.drawImage(cv, 0, 0, W, H);
        }
      } catch(e) { /* CORS pixel read blocked — proceed anyway */ }

      const dataUrl = tmp.toDataURL('image/jpeg', 0.85);
      cb(dataUrl, null);
    } catch(e) {
      cb(null, e);
    }
  }

  /* ── Toast ────────────────────────────────────────────── */
  function toast(msg, type) {
    let t = document.querySelector('._sp_t');
    if (!t) { t = document.createElement('div'); t.className = '_sp_t'; document.body.appendChild(t); }
    t.textContent = msg;
    t.className = '_sp_t ' + (type || 'ok');
    void t.offsetWidth; // force reflow
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
