/* Studios-PRO → Community Share Bridge v7.0
   Inline "Create Post" modal — publishes directly to Firebase.
   NO new tab, NO navigation. The post appears in Community when
   the user visits it later.
*/
(function () {
  'use strict';

  /* ── Firebase config ───────────────────────────────────── */
  const FB_CFG = {
    apiKey: "AIzaSyBNB1Whl4DCQPLGiCmAOpW7yXK1uGZXc9c",
    authDomain: "studios-pro.firebaseapp.com",
    projectId: "studios-pro",
    storageBucket: "studios-pro.firebasestorage.app",
    messagingSenderId: "337301506363",
    appId: "1:337301506363:web:68b84724390b830bbf4f1e"
  };
  const COLL = 'studios_community_posts';

  let _fb = null, _auth = null, _db = null, _stor = null, _curUser = null;
  let _fbReady = false;
  let _fbLoading = false;
  // Promise that resolves after the FIRST onAuthStateChanged fires (may be logged-in or null)
  let _authReadyPromise = null;
  let _authReadyResolve = null;
  let _curModelData = null;

  /* ── Extract 3D Model Geometry (Safe for Firestore) ────── */
  function get3DModelData() {
    try {
      const THREE = window.THREE;
      if (!THREE) return null;

      const sc = window.spScene || window.scene || window.threeScene;
      let candidates = [];

      // Helper function to check if a mesh is a background/grid/helper
      function isHelper(o) {
        const name = (o.name || '').toLowerCase();
        const materialName = (o.material && o.material.name || '').toLowerCase();
        return name.includes('grid') || name.includes('helper') || name.includes('ground') || 
               name.includes('floor') || name.includes('plane') || name.includes('sky') ||
               name.includes('background') || materialName.includes('grid') || 
               o.isGridHelper || o.isAxesHelper || o.type === 'LineSegments' || o.type === 'GridHelper';
      }

      if (sc) {
        sc.traverse(function(o) {
          if (o.isMesh && o.geometry && !isHelper(o) && o.visible) {
            candidates.push(o);
          }
        });
      }

      // If no candidate found via traversal, look in window variables
      if (candidates.length === 0) {
        for (const k of Object.keys(window)) {
          try {
            const v = window[k];
            if (v && v.isMesh && v.geometry && !isHelper(v) && v.visible) {
              candidates.push(v);
            }
          } catch(x){}
        }
      }

      if (candidates.length === 0) return null;

      // Extract and merge all candidates into a single non-indexed geometry array
      const MAX_FLOATS = 120000; // Limit to ~40,000 vertices to prevent exceeding 1MB Firestore limit
      let mergedPositions = [];
      let stop = false;
      let mainColor = '#d4af37'; // Default gold color for jewelry/3D

      for (let k = 0; k < candidates.length; k++) {
        if (stop) break;
        const mesh = candidates[k];
        const geo = mesh.geometry;
        if (!geo || !geo.attributes || !geo.attributes.position) continue;

        const posAttr = geo.attributes.position;
        const indexAttr = geo.index;

        // Force update matrixWorld to ensure we have the latest transformation
        mesh.updateMatrixWorld(true);
        const matrix = mesh.matrixWorld;

        // Save the color of the largest mesh to represent the whole model
        if (k === 0 && mesh.material) {
          if (mesh.material.color) {
            mainColor = '#' + mesh.material.color.getHexString();
          } else if (Array.isArray(mesh.material) && mesh.material[0] && mesh.material[0].color) {
            mainColor = '#' + mesh.material[0].color.getHexString();
          }
        }

        const tempV = new THREE.Vector3();

        if (indexAttr) {
          // Indexed geometry: map indices to raw positions to create a non-indexed merged mesh
          for (let i = 0; i < indexAttr.count; i++) {
            if (mergedPositions.length >= MAX_FLOATS) { stop = true; break; }
            const idx = indexAttr.getX(i);
            tempV.set(posAttr.getX(idx), posAttr.getY(idx), posAttr.getZ(idx));
            tempV.applyMatrix4(matrix);
            // Precision optimization: round to 4 decimal places to drastically reduce JSON payload size
            mergedPositions.push(
              Math.round(tempV.x * 10000) / 10000,
              Math.round(tempV.y * 10000) / 10000,
              Math.round(tempV.z * 10000) / 10000
            );
          }
        } else {
          // Non-indexed geometry: extract positions directly
          for (let i = 0; i < posAttr.count; i++) {
            if (mergedPositions.length >= MAX_FLOATS) { stop = true; break; }
            tempV.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
            tempV.applyMatrix4(matrix);
            mergedPositions.push(
              Math.round(tempV.x * 10000) / 10000,
              Math.round(tempV.y * 10000) / 10000,
              Math.round(tempV.z * 10000) / 10000
            );
          }
        }
      }

      if (mergedPositions.length === 0) return null;

      return {
        positions: mergedPositions,
        normals: null, // Let community view compute normals on client side to save 50% data space
        indices: null,   // We're sending raw non-indexed triangles
        color: mainColor
      };
    } catch(e) {
      console.warn('Could not extract merged 3D geometry:', e);
      return null;
    }
  }

  /* ── Load Firebase SDK lazily ──────────────────────────── */
  function loadFirebase(cb) {
    // If already ready, wait for auth state then call cb
    if (_fbReady && _authReadyPromise) { _authReadyPromise.then(function() { cb(); }); return; }
    if (_fbLoading) {
      const t = setInterval(function() {
        if (_fbReady && _authReadyPromise) { clearInterval(t); _authReadyPromise.then(function() { cb(); }); }
      }, 80);
      return;
    }
    _fbLoading = true;

    function loadScript(src, onLoad) {
      const s = document.createElement('script'); s.src = src;
      s.onload = onLoad; s.onerror = function() { toast('Firebase load error', 'err'); };
      document.head.appendChild(s);
    }

    loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js', function() {
      loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js', function() {
        loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js', function() {
          loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-storage-compat.js', function() {
            try {
              if (!firebase.apps.length) firebase.initializeApp(FB_CFG);
              _auth = firebase.auth();
              _db   = firebase.firestore();
              _stor = firebase.storage();
              // Create a promise that resolves after the FIRST auth state is known
              _authReadyPromise = new Promise(function(resolve) { _authReadyResolve = resolve; });
              _auth.onAuthStateChanged(function(u) {
                _curUser = u;
                // Resolve only the first time (subsequent calls update _curUser only)
                if (_authReadyResolve) { _authReadyResolve(u); _authReadyResolve = null; }
              });
              _fbReady = true;
              // cb fires AFTER auth state is known (not before)
              _authReadyPromise.then(function() { cb(); });
            } catch(e) { toast('Firebase init error', 'err'); }
          });
        });
      });
    });
  }

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

  /* ── inline share modal ────────────────────────────────── */
  #_sp_ov{position:fixed;inset:0;background:rgba(0,0,0,.82);backdrop-filter:blur(8px);
    z-index:2147483641;display:flex;align-items:center;justify-content:center;padding:20px;}
  #_sp_modal{background:#0b1120;border:1px solid rgba(99,102,241,.35);border-radius:20px;
    width:100%;max-width:440px;max-height:92vh;overflow-y:auto;
    box-shadow:0 24px 64px rgba(0,0,0,.7);animation:_spin .22s ease;
    font-family:'Inter',system-ui,sans-serif;}
  @keyframes _spin{from{opacity:0;transform:scale(.94) translateY(10px)}to{opacity:1;transform:none}}
  #_sp_modal h3{margin:0;padding:18px 20px;font-size:.95rem;font-weight:800;color:#fff;
    display:flex;align-items:center;justify-content:space-between;
    border-bottom:1px solid rgba(255,255,255,.07);}
  #_sp_modal h3 span.ic{background:linear-gradient(135deg,#6366f1,#8b5cf6);
    -webkit-background-clip:text;-webkit-text-fill-color:transparent;}
  #_sp_cls{background:none;border:none;color:#64748b;cursor:pointer;font-size:1.2rem;padding:0;
    transition:color .18s;}
  #_sp_cls:hover{color:#e2e8f0;}
  #_sp_body{padding:18px 20px;display:flex;flex-direction:column;gap:14px;}
  #_sp_thumb{width:100%;max-height:200px;object-fit:contain;border-radius:12px;
    background:#111827;border:1px solid rgba(255,255,255,.08);}
  #_sp_not_logged{color:#f87171;font-size:.84rem;text-align:center;padding:10px;
    background:rgba(239,68,68,.08);border-radius:10px;border:1px solid rgba(239,68,68,.2);}
  #_sp_not_logged a{color:#a78bfa;text-decoration:none;font-weight:700;}
  #_sp_content{width:100%;box-sizing:border-box;
    background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
    border-radius:12px;color:#e2e8f0;padding:12px;resize:vertical;min-height:90px;
    font-family:'Inter',system-ui,sans-serif;font-size:.88rem;outline:none;
    transition:border-color .18s;}
  #_sp_content:focus{border-color:rgba(99,102,241,.6);}
  #_sp_cat{width:100%;box-sizing:border-box;
    background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
    border-radius:12px;color:#e2e8f0;padding:10px 12px;
    font-family:'Inter',system-ui,sans-serif;font-size:.88rem;outline:none;cursor:pointer;}
  #_sp_cat option{background:#1e293b;}
  #_sp_pub{width:100%;padding:12px;border:none;border-radius:12px;cursor:pointer;font-weight:700;
    font-family:'Inter',system-ui,sans-serif;font-size:.9rem;
    background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;
    transition:opacity .18s,transform .18s;}
  #_sp_pub:hover{opacity:.9;transform:translateY(-1px);}
  #_sp_pub:disabled{opacity:.5;cursor:not-allowed;transform:none;}
  #_sp_prog_row{display:none;align-items:center;gap:10px;}
  #_sp_prog_row.show{display:flex;}
  #_sp_prog_bar_wrap{flex:1;height:5px;border-radius:99px;background:rgba(255,255,255,.1);}
  #_sp_prog_bar{height:100%;border-radius:99px;background:linear-gradient(90deg,#6366f1,#8b5cf6);
    width:0%;transition:width .3s;}
  #_sp_prog_txt{color:#a78bfa;font-size:.76rem;font-weight:600;white-space:nowrap;}

  /* toast */
  ._sp_t{position:fixed;bottom:80px;right:24px;z-index:2147483645;
    padding:10px 18px;border-radius:12px;
    font-family:'Inter',system-ui,sans-serif;font-size:.82rem;font-weight:600;
    transform:translateX(140%);transition:transform .28s;pointer-events:none;max-width:290px;}
  ._sp_t.ok{background:rgba(16,185,129,.18);border:1px solid rgba(16,185,129,.4);color:#34d399;}
  ._sp_t.err{background:rgba(239,68,68,.18);border:1px solid rgba(239,68,68,.4);color:#f87171;}
  ._sp_t.info{background:rgba(99,102,241,.18);border:1px solid rgba(99,102,241,.4);color:#a78bfa;}
  ._sp_t.show{transform:translateX(0);}
  `;
  document.head.appendChild(style);

  /* ── FAB button ───────────────────────────────────────── */
  function createFAB() {
    if (document.getElementById('_sp_fab')) return;
    const btn = document.createElement('button');
    btn.id = '_sp_fab';
    btn.title = 'Share to SP Nexus Community';
    btn.innerHTML = '<span class="sp-dot"></span><span>&#10022; Share to Community</span>';
    btn.addEventListener('click', onClickShare);
    document.body.appendChild(btn);
  }

  /* ── Click Share ──────────────────────────────────────── */
  function onClickShare() {
    setFab(false);
    toast('Capturing…', 'info');
    _curModelData = get3DModelData();

    // Case 1: Studio Pro 4D iframe
    const iframe = document.getElementById('preview-iframe');
    if (iframe && iframe.contentWindow && iframe.src && iframe.src !== 'about:blank') {
      captureViaIframe(iframe, function(dataUrl) {
        setFab(true);
        if (dataUrl) showShareModal(dataUrl);
        else toast('No 3D preview loaded yet', 'err');
      });
      return;
    }

    // Case 2: Three.js exposed renderer
    const rend = window.spRenderer || window.renderer || window.threeRenderer;
    const sc   = window.spScene   || window.scene    || window.threeScene;
    const cam  = window.spCamera  || window.camera   || window.threeCamera;
    if (rend && rend.getContext && sc && cam) {
      const dataUrl = captureViaGLReadPixels(rend, sc, cam);
      setFab(true);
      if (dataUrl) { showShareModal(dataUrl); return; }
    }

    // Case 3: Any canvas
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const dataUrl = captureCanvas();
      setFab(true);
      if (dataUrl) showShareModal(dataUrl);
      else toast('No canvas found in this tool', 'err');
    }));
  }

  /* ── Capture methods ─────────────────────────────────── */
  function captureViaIframe(iframe, cb) {
    let done = false;
    const to = setTimeout(() => { if (!done) { done=true; cb(null); } }, 3000);
    window.addEventListener('message', function h(e) {
      if (e.data && (e.data.type === 'captureOK' || e.data.type === 'captureERR')) {
        clearTimeout(to); window.removeEventListener('message', h);
        if (!done) { done=true; cb(e.data.url || null); }
      }
    });
    iframe.contentWindow.postMessage('capture3d', '*');
  }

  function captureViaGLReadPixels(renderer, scene, camera) {
    try {
      renderer.render(scene, camera);
      const gl = renderer.getContext();
      const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
      if (!W || !H) return null;
      const pix = new Uint8Array(W * H * 4);
      gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, pix);
      let b = 0;
      for (let i = 0; i < Math.min(pix.length, 400); i += 4) b += pix[i]+pix[i+1]+pix[i+2];
      if (b < 100) return null;
      const MAX = 1100, r = Math.min(MAX/W, MAX/H, 1);
      const tW = Math.round(W*r), tH = Math.round(H*r);
      const full = document.createElement('canvas'); full.width=W; full.height=H;
      const fc = full.getContext('2d'), id = fc.createImageData(W, H);
      for (let row = 0; row < H; row++) {
        const s = (H-1-row)*W*4, d = row*W*4;
        id.data.set(pix.subarray(s, s+W*4), d);
      }
      fc.putImageData(id, 0, 0);
      const tmp = document.createElement('canvas'); tmp.width=tW; tmp.height=tH;
      tmp.getContext('2d').drawImage(full, 0, 0, tW, tH);
      return tmp.toDataURL('image/jpeg', 0.85);
    } catch(e) { return null; }
  }

  function captureCanvas() {
    const all = Array.from(document.querySelectorAll('canvas'));
    if (!all.length) return null;
    const cv = all.reduce((a,b) => (a.width*a.height >= b.width*b.height ? a : b));
    if (!cv.width || !cv.height) return null;
    try {
      const MAX = 1100, r = Math.min(MAX/cv.width, MAX/cv.height, 1);
      const W = Math.round(cv.width*r), H = Math.round(cv.height*r);
      const tmp = document.createElement('canvas'); tmp.width=W; tmp.height=H;
      const ctx = tmp.getContext('2d');
      ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, W, H);
      ctx.drawImage(cv, 0, 0, W, H);
      return tmp.toDataURL('image/jpeg', 0.85);
    } catch(e) { return null; }
  }

  /* ── Show inline Create Post modal ───────────────────── */
  function showShareModal(dataUrl) {
    closeModal();
    const sourceTitle = document.title || 'Studios-PRO Tool';

    const ov = document.createElement('div');
    ov.id = '_sp_ov';
    ov.addEventListener('click', e => { if (e.target === ov) closeModal(); });

    ov.innerHTML = `
      <div id="_sp_modal">
        <h3>
          <span class="ic">✦ Create Post</span>
          <button id="_sp_cls" title="Close">✕</button>
        </h3>
        <div id="_sp_body">
          <img id="_sp_thumb" src="${dataUrl}" alt="Preview">
          <div id="_sp_auth_area">
            <div id="_sp_not_logged" style="display:none;">
              ⚠ You must be <a href="/community/" target="_blank">signed in to Community</a> to publish a post.
            </div>
          </div>
          <textarea id="_sp_content" placeholder="Add a description…">Shared from: ${sourceTitle}</textarea>
          <select id="_sp_cat">
            <option value="showcase">🏆 Showcase — Share your creation</option>
            <option value="3dmodel">🔷 3D Models</option>
            <option value="hologram">✨ Hologram HUD</option>
            <option value="photo">🖼 Photos</option>
            <option value="general">💬 General</option>
          </select>
          <div id="_sp_prog_row">
            <div id="_sp_prog_bar_wrap"><div id="_sp_prog_bar"></div></div>
            <span id="_sp_prog_txt">Uploading…</span>
          </div>
          <button id="_sp_pub">✦ Publish Post</button>
        </div>
      </div>`;

    document.body.appendChild(ov);
    ov.querySelector('#_sp_cls').addEventListener('click', closeModal);
    ov.querySelector('#_sp_pub').addEventListener('click', () => doPublish(dataUrl, sourceTitle));

    // Load Firebase and wait for auth state before showing any warning
    loadFirebase(function() {
      // onAuthStateChanged has fired by now — _curUser is correct
      if (!_curUser) {
        const nl = document.getElementById('_sp_not_logged');
        if (nl) nl.style.display = '';
        const btn = document.getElementById('_sp_pub');
        if (btn) { btn.disabled = true; btn.textContent = 'Sign in required'; }
      }
      // If logged in: modal is already ready, Publish button is enabled by default
    });
  }

  function closeModal() {
    const ov = document.getElementById('_sp_ov');
    if (ov) ov.remove();
  }

  /* ── Publish directly to Firebase ────────────────────── */
  async function doPublish(dataUrl, sourceTitle) {
    const btn = document.getElementById('_sp_pub');
    if (!btn) return;

    if (!_curUser) { toast('Sign in to Community first', 'err'); return; }

    const content = (document.getElementById('_sp_content')?.value || '').trim();
    const cat     = document.getElementById('_sp_cat')?.value || 'showcase';

    btn.disabled = true; btn.textContent = 'Publishing…';

    try {
      // 1. Convert dataUrl to Blob and upload to Firebase Storage
      setProgress(10, 'Uploading image…');
      const blob = await (await fetch(dataUrl)).blob();
      const ref  = _stor.ref(`studios_community_images/${_curUser.uid}/${Date.now()}`);
      const snap = await ref.put(blob);
      setProgress(70, 'Saving post…');
      const imageUrl = await snap.ref.getDownloadURL();

      // 2. Write post to Firestore
      const ud = (await _db.collection('users').doc(_curUser.uid).get()).data() || {};
      const postPayload = {
        uid: _curUser.uid,
        displayName: _curUser.displayName || 'Anonymous',
        photoURL: _curUser.photoURL || null,
        content: content || `Shared from: ${sourceTitle}`,
        category: _curModelData ? '3dmodel' : cat,
        images: [imageUrl],
        videoUrl: '',
        likes: [], likesCount: 0, commentsCount: 0,
        userPostCount: ud.postCount || 0,
        sourcePage: location.pathname,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (_curModelData) {
        postPayload.modelData = _curModelData;
      }
      await _db.collection(COLL).add(postPayload);
      _curModelData = null; // reset

      // 3. Increment user post count
      try { await _db.collection('users').doc(_curUser.uid).update({ postCount: firebase.firestore.FieldValue.increment(1) }); } catch(x){}

      setProgress(100, 'Done!');
      setTimeout(() => {
        closeModal();
        toast('✦ Post published to Community! 🎉', 'ok');
      }, 400);

    } catch(err) {
      _curModelData = null; // reset on error
      console.error('Share publish error:', err);
      btn.disabled = false; btn.textContent = '✦ Publish Post';
      hideProgress();
      toast('Publish error: ' + (err.message || err), 'err');
    }
  }

  function setProgress(pct, txt) {
    const row = document.getElementById('_sp_prog_row');
    const bar = document.getElementById('_sp_prog_bar');
    const label = document.getElementById('_sp_prog_txt');
    if (row) row.classList.add('show');
    if (bar) bar.style.width = pct + '%';
    if (label) label.textContent = txt;
  }
  function hideProgress() {
    const row = document.getElementById('_sp_prog_row');
    if (row) row.classList.remove('show');
  }

  /* ── Utils ───────────────────────────────────────────── */
  function setFab(enabled) {
    const fab = document.getElementById('_sp_fab');
    if (!fab) return;
    fab.style.opacity = enabled ? '' : '.5';
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
    t._tid = setTimeout(() => t.classList.remove('show'), 4000);
  }

  /* ── Init ────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createFAB);
  } else {
    createFAB();
  }
})();
