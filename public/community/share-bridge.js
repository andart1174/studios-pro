/* Studios-PRO → Community Share Bridge v1.0 */
(function () {
  'use strict';

  const COMM_URL = '/community/';
  const LS_KEY = 'studios_community_share';
  const SOURCE_TITLE = document.title || location.pathname;

  const CSS = `
  #_sp_fab {
    position:fixed;bottom:24px;right:24px;z-index:2147483640;
    display:flex;align-items:center;gap:8px;
    padding:11px 20px;border-radius:999px;border:none;cursor:pointer;
    background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;
    font-family:'Inter',system-ui,sans-serif;font-size:.83rem;font-weight:700;
    box-shadow:0 4px 22px rgba(99,102,241,.55);
    transition:all .22s ease;user-select:none;
  }
  #_sp_fab:hover{transform:translateY(-3px);box-shadow:0 8px 28px rgba(99,102,241,.75);}
  #_sp_fab .dot{width:8px;height:8px;border-radius:50%;background:#10b981;
    box-shadow:0 0 8px #10b981;animation:_sp_pulse 2s infinite;}
  @keyframes _sp_pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.5)}}
  #_sp_overlay{
    position:fixed;inset:0;background:rgba(0,0,0,.82);backdrop-filter:blur(8px);
    z-index:2147483641;display:flex;align-items:center;justify-content:center;padding:20px;
  }
  #_sp_modal{
    background:#0b1120;border:1px solid rgba(99,102,241,.35);border-radius:20px;
    width:100%;max-width:400px;overflow:hidden;
    box-shadow:0 24px 64px rgba(0,0,0,.7);animation:_sp_in .22s ease;
  }
  @keyframes _sp_in{from{opacity:0;transform:scale(.92) translateY(10px)}to{opacity:1;transform:none}}
  #_sp_modal h3{
    margin:0;padding:18px 20px;font-size:.95rem;font-weight:800;color:#fff;
    font-family:'Inter',system-ui,sans-serif;border-bottom:1px solid rgba(255,255,255,.07);
    background:linear-gradient(135deg,rgba(99,102,241,.15),transparent);
    display:flex;align-items:center;gap:9px;
  }
  ._sp_opts{padding:16px;display:flex;flex-direction:column;gap:9px;}
  ._sp_opt{
    display:flex;align-items:center;gap:12px;padding:13px 15px;
    border-radius:13px;border:1px solid rgba(255,255,255,.08);
    background:rgba(255,255,255,.04);cursor:pointer;transition:all .18s;
    font-family:'Inter',system-ui,sans-serif;text-align:left;
  }
  ._sp_opt:hover{background:rgba(99,102,241,.18);border-color:rgba(99,102,241,.4);}
  ._sp_opt .ico{font-size:1.5rem;flex-shrink:0;width:36px;text-align:center;}
  ._sp_opt .lbl{color:#e2e8f0;font-size:.84rem;font-weight:600;}
  ._sp_opt .sub{color:#64748b;font-size:.72rem;margin-top:2px;}
  ._sp_opt.dis{opacity:.38;cursor:not-allowed;pointer-events:none;}
  ._sp_cancel{
    width:100%;padding:11px;border:none;background:rgba(255,255,255,.04);
    border-top:1px solid rgba(255,255,255,.07);color:#64748b;
    font-family:'Inter',system-ui,sans-serif;font-size:.82rem;font-weight:600;
    cursor:pointer;transition:all .18s;
  }
  ._sp_cancel:hover{background:rgba(255,255,255,.08);color:#e2e8f0;}
  ._sp_toast{
    position:fixed;bottom:90px;right:24px;z-index:2147483642;
    background:rgba(16,185,129,.18);border:1px solid rgba(16,185,129,.4);
    color:#34d399;padding:11px 18px;border-radius:12px;
    font-family:'Inter',system-ui,sans-serif;font-size:.82rem;font-weight:600;
    transform:translateX(140%);transition:transform .3s;max-width:280px;
  }
  ._sp_toast.show{transform:translateX(0);}
  ._sp_prog{
    position:fixed;bottom:90px;right:24px;z-index:2147483642;
    background:#0b1120;border:1px solid rgba(99,102,241,.4);
    color:#a78bfa;padding:11px 18px;border-radius:12px;
    font-family:'Inter',system-ui,sans-serif;font-size:.81rem;font-weight:600;
    display:none;gap:10px;align-items:center;
  }
  ._sp_prog.show{display:flex;}
  ._sp_spinner{width:16px;height:16px;border:2px solid rgba(99,102,241,.3);
    border-top-color:#6366f1;border-radius:50%;animation:_sp_spin .7s linear infinite;flex-shrink:0;}
  @keyframes _sp_spin{to{transform:rotate(360deg)}}
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  function hasThreeJS() {
    return !!(window.THREE && document.querySelector('canvas')) || !!window.scene || !!window.renderer;
  }
  function hasCanvas() { return !!document.querySelector('canvas'); }
  function hasCode() {
    return !!(document.querySelector('.CodeMirror') || document.querySelector('.monaco-editor') ||
      document.querySelector('#codeEditor,#editor,#code'));
  }
  function getCode() {
    const m = document.querySelector('.CodeMirror');
    if (m && m.CodeMirror) return m.CodeMirror.getValue();
    if (window.monaco) { const md = window.monaco.editor.getModels(); if (md[0]) return md[0].getValue(); }
    const ta = document.querySelector('#codeEditor,#editor,#code,textarea');
    return ta ? ta.value : '';
  }

  function createFAB() {
    if (document.getElementById('_sp_fab')) return;
    const btn = document.createElement('button');
    btn.id = '_sp_fab';
    btn.innerHTML = '<span class="dot"></span><span>&#10022; Share to Community</span>';
    btn.addEventListener('click', showModal);
    document.body.appendChild(btn);
  }

  let overlay = null;
  function showModal() {
    removeModal();
    const ov = document.createElement('div');
    ov.id = '_sp_overlay';
    ov.addEventListener('click', e => { if (e.target === ov) removeModal(); });
    const threeOk = hasThreeJS(), canvOk = hasCanvas(), codeOk = hasCode();
    ov.innerHTML = `<div id="_sp_modal">
      <h3><span>&#128640;</span> Share to Studios-PRO Community</h3>
      <div class="_sp_opts">
        <div class="_sp_opt ${threeOk?'':'dis'}" id="_sp_o3d">
          <span class="ico">&#128302;</span>
          <div><div class="lbl">Share 3D Model</div><div class="sub">${threeOk?'Three.js scene detected':'No 3D scene in this page'}</div></div>
        </div>
        <div class="_sp_opt ${canvOk?'':'dis'}" id="_sp_oscr">
          <span class="ico">&#128248;</span>
          <div><div class="lbl">Share Screenshot</div><div class="sub">${canvOk?'Capture current canvas view':'No canvas found'}</div></div>
        </div>
        <div class="_sp_opt ${codeOk?'':'dis'}" id="_sp_ocode">
          <span class="ico">&#128187;</span>
          <div><div class="lbl">Share HTML / Code</div><div class="sub">${codeOk?'Share code with live preview':'No code editor detected'}</div></div>
        </div>
        <div class="_sp_opt" id="_sp_oimgup">
          <span class="ico">&#128444;</span>
          <div><div class="lbl">Upload Image</div><div class="sub">PNG, JPG, GIF from your computer</div></div>
        </div>
      </div>
      <button class="_sp_cancel">&#10005; Cancel</button>
    </div>`;
    if (threeOk) ov.querySelector('#_sp_o3d').addEventListener('click', () => { removeModal(); do3D(); });
    if (canvOk) ov.querySelector('#_sp_oscr').addEventListener('click', () => { removeModal(); doScreenshot(); });
    if (codeOk) ov.querySelector('#_sp_ocode').addEventListener('click', () => { removeModal(); doCode(); });
    ov.querySelector('#_sp_oimgup').addEventListener('click', () => { removeModal(); doImageUpload(); });
    ov.querySelector('._sp_cancel').addEventListener('click', removeModal);
    document.body.appendChild(ov);
    overlay = ov;
  }
  function removeModal() { overlay && overlay.remove(); overlay = null; }

  function do3D() {
    showProgress('Serializing 3D model...');
    setTimeout(() => {
      try {
        let mesh = null;
        const sc = window.scene || window.threeScene || window.mainScene;
        if (sc) sc.traverse(o => { if (o.isMesh && o.geometry && !mesh) mesh = o; });
        if (!mesh) { for (const k of Object.keys(window)) { const v = window[k]; if (v && v.isMesh && v.geometry) { mesh = v; break; } } }
        if (!mesh) { hideProgress(); doScreenshot(); return; }
        const geo = mesh.geometry.clone();
        if (!geo.attributes.position) { hideProgress(); doScreenshot(); return; }
        const pos = Array.from(geo.attributes.position.array);
        const nor = geo.attributes.normal ? Array.from(geo.attributes.normal.array) : null;
        const idx = geo.index ? Array.from(geo.index.array) : null;
        if (pos.length * 4 > 4 * 1024 * 1024) { hideProgress(); doScreenshot(); return; }
        let color = '#6366f1';
        if (mesh.material && mesh.material.color) color = '#' + mesh.material.color.getHexString();
        let preview = null;
        const cv = document.querySelector('canvas');
        if (cv) { try { const t = document.createElement('canvas'); t.width = Math.min(cv.width,800); t.height = Math.min(cv.height,600); t.getContext('2d').drawImage(cv,0,0,t.width,t.height); preview = t.toDataURL('image/jpeg',.7); } catch(e){} }
        hideProgress();
        send({ type:'3dmodel', modelData:{positions:pos,normals:nor,indices:idx,color}, preview, source:SOURCE_TITLE });
      } catch(e) { hideProgress(); doScreenshot(); }
    }, 80);
  }

  function doScreenshot() {
    showProgress('Taking screenshot...');
    setTimeout(() => {
      const cv = document.querySelector('canvas');
      if (!cv) { hideProgress(); toast('No canvas found'); return; }
      try {
        const W = Math.min(cv.width,1200), H = Math.min(cv.height,900);
        const t = document.createElement('canvas'); t.width = W; t.height = H;
        t.getContext('2d').drawImage(cv,0,0,W,H);
        const dataUrl = t.toDataURL('image/jpeg',.82);
        hideProgress();
        send({ type:'screenshot', imageDataUrl:dataUrl, source:SOURCE_TITLE });
      } catch(e) { hideProgress(); toast('Screenshot blocked (CORS)'); }
    }, 60);
  }

  function doCode() {
    const code = getCode();
    if (!code || !code.trim()) { toast('No code found'); return; }
    send({ type:'html', code:code.slice(0,50000), source:SOURCE_TITLE });
  }

  function doImageUpload() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true; inp.style.display = 'none';
    document.body.appendChild(inp);
    inp.addEventListener('change', () => {
      const files = Array.from(inp.files).slice(0,4);
      if (!files.length) { inp.remove(); return; }
      showProgress('Reading images...');
      Promise.all(files.map(f => new Promise(res => {
        if (f.size > 5*1024*1024) { res(null); return; }
        const r = new FileReader(); r.onload = e => res(e.target.result); r.readAsDataURL(f);
      }))).then(urls => { hideProgress(); inp.remove(); send({ type:'images', imageDataUrls:urls.filter(Boolean), source:SOURCE_TITLE }); });
    });
    inp.click();
  }

  function send(data) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({...data, ts:Date.now(), sourcePage:location.pathname}));
      toast('Opening Community...', true);
      setTimeout(() => window.open(COMM_URL+'?share=1','_blank'), 400);
    } catch(e) {
      if (data.modelData) data.modelData = null;
      try { localStorage.setItem(LS_KEY, JSON.stringify({...data, ts:Date.now()})); window.open(COMM_URL+'?share=1','_blank'); }
      catch(e2) { toast('Data too large to share'); }
    }
  }

  let progEl = null;
  function showProgress(msg) {
    if (!progEl) { progEl = document.createElement('div'); progEl.className = '_sp_prog'; document.body.appendChild(progEl); }
    progEl.innerHTML = '<div class="_sp_spinner"></div><span>'+msg+'</span>';
    progEl.classList.add('show');
  }
  function hideProgress() { progEl && progEl.classList.remove('show'); }
  function toast(msg, ok) {
    let t = document.querySelector('._sp_toast');
    if (!t) { t = document.createElement('div'); t.className = '_sp_toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.style.background = ok ? 'rgba(16,185,129,.18)' : 'rgba(239,68,68,.18)';
    t.style.borderColor = ok ? 'rgba(16,185,129,.4)' : 'rgba(239,68,68,.4)';
    t.style.color = ok ? '#34d399' : '#f87171';
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', createFAB);
  else createFAB();
})();
