/* Studios-PRO → Community Share Bridge v2.0 — Screenshot only, single tab */
(function () {
  'use strict';

  const COMM_URL = '/community/';
  const LS_KEY   = 'studios_community_share';
  const WIN_NAME = 'studios_community_tab'; // reuse same tab always
  const SRC      = document.title || location.pathname;

  /* ── CSS ─────────────────────────────────────────────── */
  const style = document.createElement('style');
  style.textContent = `
  #_sp_fab {
    position:fixed;bottom:24px;right:24px;z-index:2147483640;
    display:flex;align-items:center;gap:9px;
    padding:11px 22px;border-radius:999px;border:none;cursor:pointer;
    background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;
    font-family:'Inter',system-ui,sans-serif;font-size:.83rem;font-weight:700;
    box-shadow:0 4px 22px rgba(99,102,241,.55);
    transition:transform .18s,box-shadow .18s;user-select:none;
  }
  #_sp_fab:hover{transform:translateY(-3px);box-shadow:0 8px 28px rgba(99,102,241,.75);}
  #_sp_fab:active{transform:translateY(0);box-shadow:0 2px 10px rgba(99,102,241,.4);}
  #_sp_fab .sp-dot{width:8px;height:8px;border-radius:50%;background:#10b981;
    box-shadow:0 0 8px #10b981;animation:_sp_pl 2s infinite;flex-shrink:0;}
  @keyframes _sp_pl{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.5)}}
  ._sp_toast{
    position:fixed;bottom:80px;right:24px;z-index:2147483641;
    padding:10px 18px;border-radius:12px;
    font-family:'Inter',system-ui,sans-serif;font-size:.82rem;font-weight:600;
    transform:translateX(140%);transition:transform .28s;pointer-events:none;max-width:280px;
  }
  ._sp_toast.ok{background:rgba(16,185,129,.18);border:1px solid rgba(16,185,129,.4);color:#34d399;}
  ._sp_toast.err{background:rgba(239,68,68,.18);border:1px solid rgba(239,68,68,.4);color:#f87171;}
  ._sp_toast.show{transform:translateX(0);}
  `;
  document.head.appendChild(style);

  /* ── FAB ─────────────────────────────────────────────── */
  function createFAB() {
    if (document.getElementById('_sp_fab')) return;
    const btn = document.createElement('button');
    btn.id = '_sp_fab';
    btn.title = 'Share screenshot to Community';
    btn.innerHTML = '<span class="sp-dot"></span><span>&#10022; Share to Community</span>';
    btn.addEventListener('click', doShare);
    document.body.appendChild(btn);
  }

  /* ── Main share action ───────────────────────────────── */
  function doShare() {
    const fab = document.getElementById('_sp_fab');
    if (fab) { fab.style.opacity = '.6'; fab.style.pointerEvents = 'none'; }

    // Force Three.js render so canvas isn't black
    try {
      const rend = window.renderer || window.threeRenderer;
      const sc   = window.scene   || window.threeScene  || window.mainScene;
      const cam  = window.camera  || window.cam         || window.threeCamera || window.mainCamera;
      if (rend && rend.render && sc && cam) rend.render(sc, cam);
    } catch(e) {}

    // Wait 2 animation frames so GPU flushes to canvas
    requestAnimationFrame(() => requestAnimationFrame(() => {
      takeScreenshot(function(dataUrl, err) {
        if (fab) { fab.style.opacity = ''; fab.style.pointerEvents = ''; }
        if (err || !dataUrl) { showToast('No canvas found — open a 3D tool first', 'err'); return; }

        // Save to localStorage
        try {
          localStorage.setItem(LS_KEY, JSON.stringify({
            type: 'screenshot',
            imageDataUrl: dataUrl,
            source: SRC,
            sourcePage: location.pathname,
            ts: Date.now()
          }));
        } catch(e) {
          showToast('Screenshot too large to share', 'err');
          return;
        }

        showToast('Opening Community… ✦', 'ok');

        // Open or focus the SAME community tab (named window)
        setTimeout(() => {
          window.open(COMM_URL + '?share=1', WIN_NAME);
        }, 300);
      });
    }));
  }

  /* ── Screenshot ──────────────────────────────────────── */
  function takeScreenshot(cb) {
    // Find best canvas — prefer the largest one (likely the 3D viewport)
    const canvases = Array.from(document.querySelectorAll('canvas'));
    if (!canvases.length) { cb(null, true); return; }
    const cv = canvases.reduce((a, b) => (a.width * a.height >= b.width * b.height ? a : b));

    try {
      const MAX_W = 1200, MAX_H = 900;
      const ratio = Math.min(MAX_W / (cv.width || 1), MAX_H / (cv.height || 1), 1);
      const W = Math.round((cv.width  || 800) * ratio);
      const H = Math.round((cv.height || 600) * ratio);

      const tmp = document.createElement('canvas');
      tmp.width = W; tmp.height = H;
      const ctx = tmp.getContext('2d');

      // Dark background in case canvas has transparency
      ctx.fillStyle = '#0b0f1a';
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(cv, 0, 0, W, H);

      // Check if still black
      const px  = ctx.getImageData(0, 0, Math.min(W, 40), Math.min(H, 40)).data;
      let sum = 0;
      for (let i = 0; i < px.length; i += 4) sum += px[i] + px[i+1] + px[i+2];
      if (sum < 200 && cv.width > 0) {
        // Try again with background already drawn (CORS might block — just proceed)
      }

      const dataUrl = tmp.toDataURL('image/jpeg', 0.85);
      cb(dataUrl, null);
    } catch(e) {
      cb(null, e);
    }
  }

  /* ── Toast ───────────────────────────────────────────── */
  function showToast(msg, type) {
    let t = document.querySelector('._sp_toast');
    if (!t) { t = document.createElement('div'); t.className = '_sp_toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.className = '_sp_toast ' + (type || 'ok');
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
  }

  /* ── Init ────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createFAB);
  } else {
    createFAB();
  }
})();
