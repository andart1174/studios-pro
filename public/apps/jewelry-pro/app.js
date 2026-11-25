/**
 * Jewelry Maker Pro — Application Controller, Sculpt/Heraldry Studio, Undo/Redo & Bridges
 */
(function () {
  'use strict';

  const E = window.JewelryEngine;
  if (!E) {
    console.error('[JewelryPro] JewelryEngine missing');
    return;
  }

  const $ = (id) => document.getElementById(id);

  /* =========================================================================
     1. STATE, LANGUAGE & UNDO/REDO HISTORY
  ========================================================================= */
  function detectInitialLang() {
    const p = new URLSearchParams(window.location.search).get('lang');
    if (p === 'fr' || p === 'en') return p;
    try {
      const saved = localStorage.getItem('sp_lang');
      if (saved === 'fr' || saved === 'en') return saved;
    } catch (_) {}
    return (navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';
  }

  let lang = detectInitialLang();
  let state = Object.assign({}, E.DEFAULT_STATE);
  let viewport = null;
  let latestBuild = null;
  let rebuildTimer = null;

  // Undo / Redo (25 steps)
  const history = [];
  let historyIdx = -1;
  const MAX_HISTORY = 25;

  function pushHistory() {
    const snap = JSON.stringify(state);
    if (historyIdx >= 0 && history[historyIdx] === snap) return;
    history.splice(historyIdx + 1);
    history.push(snap);
    if (history.length > MAX_HISTORY) history.shift();
    historyIdx = history.length - 1;
    updateUndoButtons();
  }

  function updateUndoButtons() {
    const u = $('btnUndo'), r = $('btnRedo');
    if (u) u.disabled = historyIdx <= 0;
    if (r) r.disabled = historyIdx >= history.length - 1;
  }

  function undo() {
    if (historyIdx <= 0) return;
    historyIdx--;
    state = JSON.parse(history[historyIdx]);
    syncUIFromState();
    scheduleRebuild(false);
    updateUndoButtons();
  }

  function redo() {
    if (historyIdx >= history.length - 1) return;
    historyIdx++;
    state = JSON.parse(history[historyIdx]);
    syncUIFromState();
    scheduleRebuild(false);
    updateUndoButtons();
  }

  /* =========================================================================
     2. ASPECT-LOCKED ENGRAVING & SCULPT / PHOTO HEIGHTMAP BUFFERS
  ========================================================================= */
  const engraveCanvas = document.createElement('canvas');
  engraveCanvas.width = 1024;
  engraveCanvas.height = 256;
  const engraveCtx = engraveCanvas.getContext('2d', { willReadFrequently: true });

  const sculptDataCanvas = document.createElement('canvas');
  sculptDataCanvas.width = 768;
  sculptDataCanvas.height = 384;
  const sculptDataCtx = sculptDataCanvas.getContext('2d', { willReadFrequently: true });
  sculptDataCtx.fillStyle = '#000';
  sculptDataCtx.fillRect(0, 0, sculptDataCanvas.width, sculptDataCanvas.height);

  let hasSculptOrPhotoData = false;
  let sculptHistory = [];

  function buildEngraveHeightMap() {
    const txt = (state.engraveText || '').trim();
    if (!txt) return null;
    const W = engraveCanvas.width, H = engraveCanvas.height;
    engraveCtx.clearRect(0, 0, W, H);
    engraveCtx.fillStyle = '#000000';
    engraveCtx.fillRect(0, 0, W, H);

    const fontPx = Math.round(H * 0.56);
    engraveCtx.font = `700 ${fontPx}px ${state.engraveFont || 'Georgia, serif'}`;
    engraveCtx.textAlign = 'center';
    engraveCtx.textBaseline = 'middle';

    // Measure text width so physical engraving aspect ratio NEVER stretches 10:1!
    const metrics = engraveCtx.measureText(txt);
    const maxW = W * 0.88;
    const fitScale = metrics.width > maxW ? (maxW / metrics.width) : 1.0;

    // 3-pass smooth beveled V-carve profile
    const passes = [
      { blur: 4.5, alpha: 0.35 },
      { blur: 2.0, alpha: 0.65 },
      { blur: 0.0, alpha: 1.00 }
    ];
    for (const p of passes) {
      engraveCtx.save();
      engraveCtx.translate(W * 0.5, H * 0.52);
      engraveCtx.scale(fitScale, 1.0);
      engraveCtx.filter = p.blur > 0 ? `blur(${p.blur}px)` : 'none';
      engraveCtx.globalAlpha = p.alpha;
      engraveCtx.fillStyle = '#FFFFFF';
      engraveCtx.fillText(txt, 0, 0);
      engraveCtx.restore();
    }

    const img = engraveCtx.getImageData(0, 0, W, H);
    const aspectRatio = Math.max(1.8, (Math.min(metrics.width, maxW) / (fontPx * 0.85)));
    return { width: W, height: H, data: img.data, stride: 4, isFloat: false, aspectRatio };
  }

  function buildSculptHeightMap() {
    if (!hasSculptOrPhotoData) return null;
    const W = sculptDataCanvas.width, H = sculptDataCanvas.height;
    const img = sculptDataCtx.getImageData(0, 0, W, H);
    return { width: W, height: H, data: img.data, stride: 4, isFloat: false };
  }

  /* =========================================================================
     3. TOASTS & PAYWALL BRIDGE (UNIFIED STUDIOS-PRO)
  ========================================================================= */
  function toast(msg) {
    const c = $('toastContainer');
    if (!c) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.25s'; setTimeout(() => el.remove(), 260); }, 2800);
  }

  let cachedCredits = { isPro: false, remaining: 5 };
  function updateCreditsBadge() {
    const b = $('creditsBadge');
    if (!b) return;
    if (cachedCredits.isPro) {
      b.textContent = '★ PRO';
      b.className = 'pill ok';
    } else {
      b.textContent = lang === 'fr' ? `${cachedCredits.remaining} Gratuits` : `${cachedCredits.remaining} Free`;
      b.className = cachedCredits.remaining > 0 ? 'pill' : 'pill warn';
    }
  }

  function checkExportGate() {
    return new Promise((resolve) => {
      if (window.parent && window.parent !== window) {
        let settled = false;
        const handler = (ev) => {
          if (ev.data && ev.data.type === 'EXPORT_LIMIT_RESULT') {
            settled = true;
            window.removeEventListener('message', handler);
            const d = ev.data;
            cachedCredits.isPro = !!d.isPro;
            cachedCredits.remaining = typeof d.remaining === 'number' ? d.remaining : (d.allowed ? 1 : 0);
            updateCreditsBadge();
            if (d.allowed) {
              resolve({ allowed: true, isPro: !!d.isPro });
            } else if (d.reason === 'not_authenticated') {
              window.parent.postMessage({ type: 'SHOW_AUTH_MODAL' }, '*');
              resolve({ allowed: false, isPro: false });
            } else {
              window.parent.postMessage({ type: 'SHOW_PAYWALL_MODAL' }, '*');
              resolve({ allowed: false, isPro: false });
            }
          }
        };
        window.addEventListener('message', handler);
        window.parent.postMessage({ type: 'CHECK_EXPORT_LIMIT', studio: 'jewelry-pro' }, '*');
        setTimeout(() => {
          if (!settled) {
            window.removeEventListener('message', handler);
            resolve({ allowed: true, isPro: cachedCredits.isPro });
          }
        }, 1200);
      } else {
        // Standalone fallback (5 free exports in localStorage)
        let used = 0;
        try { used = parseInt(localStorage.getItem('sp_jewelry_exports') || '0', 10) || 0; } catch (_) {}
        const rem = Math.max(0, 5 - used);
        cachedCredits.remaining = rem;
        updateCreditsBadge();
        if (rem > 0) {
          resolve({ allowed: true, isPro: false });
        } else {
          openModal('paymentModal');
          resolve({ allowed: false, isPro: false });
        }
      }
    });
  }

  function recordExportUsed() {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'INCREMENT_EXPORT_COUNT', studio: 'jewelry-pro' }, '*');
    } else {
      try {
        const used = (parseInt(localStorage.getItem('sp_jewelry_exports') || '0', 10) || 0) + 1;
        localStorage.setItem('sp_jewelry_exports', String(used));
        cachedCredits.remaining = Math.max(0, 5 - used);
        updateCreditsBadge();
      } catch (_) {}
    }
  }

  /* =========================================================================
     4. DYNAMIC UI BUILDERS & LANGUAGE SYNC
  ========================================================================= */
  function openModal(id) {
    const m = $(id);
    if (m) m.classList.add('open');
  }
  function closeModal(id) {
    const m = $(id);
    if (m) m.classList.remove('open');
  }

  function applyLanguage() {
    document.body.dataset.lang = lang;
    try { localStorage.setItem('sp_lang', lang); } catch (_) {}

    // Update <option data-en-opt / data-fr-opt>
    document.querySelectorAll('option[data-en-opt]').forEach((opt) => {
      opt.textContent = lang === 'fr' ? opt.dataset.frOpt : opt.dataset.enOpt;
    });

    populatePresets();
    populateAlloys();
    populateGemMaterials();
    populateProfiles();
    populateRingSizes();
    populateStamps();
    updateDynamicLabels();
    updateCreditsBadge();
    if (latestBuild) updateHUD(latestBuild);
  }

  function populatePresets() {
    const grid = $('presetGrid');
    if (!grid) return;
    grid.innerHTML = '';
    Object.keys(E.PRESETS).forEach((key) => {
      const p = E.PRESETS[key];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'preset-btn';
      btn.innerHTML = `<span>${p.icon}</span><span>${lang === 'fr' ? p.nameFr : p.nameEn}</span>`;
      btn.addEventListener('click', () => {
        const prevCat = state.category;
        state = Object.assign({}, state, p.patch, { customGems: [] });
        pushHistory();
        syncUIFromState();
        scheduleRebuild(prevCat !== state.category || true);
        toast(lang === 'fr' ? `Modèle chargé : ${p.nameFr}` : `Loaded preset: ${p.nameEn}`);
      });
      grid.appendChild(btn);
    });
  }

  function populateAlloys() {
    const grid = $('alloyGrid');
    const selInner = $('selectInnerMaterial');
    if (grid) {
      grid.innerHTML = '';
      Object.keys(E.ALLOYS).forEach((id) => {
        const a = E.ALLOYS[id];
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'alloy-btn' + (state.material === id ? ' active' : '');
        btn.dataset.alloy = id;
        const shortName = (lang === 'fr' ? a.nameFr : a.nameEn).replace(/\s*\([^)]*\)/, '');
        btn.innerHTML = `<span class="swatch" style="background:${a.swatch}"></span><span>${shortName}</span>`;
        btn.addEventListener('click', () => {
          state.material = id;
          pushHistory();
          grid.querySelectorAll('.alloy-btn').forEach((b) => b.classList.toggle('active', b.dataset.alloy === id));
          scheduleRebuild(false);
        });
        grid.appendChild(btn);
      });
    }
    if (selInner) {
      selInner.innerHTML = '';
      const optSame = document.createElement('option');
      optSame.value = 'same';
      optSame.textContent = lang === 'fr' ? 'Identique à l’Extérieur' : 'Same as Outer Metal';
      selInner.appendChild(optSame);
      Object.keys(E.ALLOYS).forEach((id) => {
        const a = E.ALLOYS[id];
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = lang === 'fr' ? a.nameFr : a.nameEn;
        selInner.appendChild(opt);
      });
      selInner.value = state.innerMaterial || 'same';
    }
  }

  function populateGemMaterials() {
    const sel = $('selectGemMaterial');
    if (!sel) return;
    sel.innerHTML = '';
    Object.keys(E.GEM_MATERIALS).forEach((id) => {
      const g = E.GEM_MATERIALS[id];
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = lang === 'fr' ? g.nameFr : g.nameEn;
      sel.appendChild(opt);
    });
    sel.value = state.stoneMaterial || 'diamond';
  }

  function populateProfiles() {
    const sel = $('selectProfile');
    if (!sel) return;
    const list = E.CATEGORY_PROFILES[state.category] || E.CATEGORY_PROFILES.rings;
    sel.innerHTML = '';
    list.forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = lang === 'fr' ? p.fr : p.en;
      sel.appendChild(opt);
    });
    if (!list.some((p) => p.id === state.profile)) state.profile = list[0].id;
    sel.value = state.profile;
  }

  function populateRingSizes() {
    const sel = $('selectRingSize');
    const wrap = $('ringSizeWrap');
    if (!sel || !wrap) return;
    sel.innerHTML = '';
    if (state.category === 'rings') {
      wrap.style.display = '';
      E.RING_SIZES.forEach((s) => {
        const opt = document.createElement('option');
        opt.value = s.mm.toFixed(2);
        opt.textContent = `EU ${s.eu} · US ${s.us} · UK ${s.uk} · JP ${s.jp} (${s.mm.toFixed(2)} mm)`;
        sel.appendChild(opt);
      });
      // Match closest ring size
      let best = E.RING_SIZES[5];
      let bestDiff = 99;
      for (const s of E.RING_SIZES) {
        const d = Math.abs(s.mm - state.innerDiameter);
        if (d < bestDiff) { bestDiff = d; best = s; }
      }
      sel.value = best.mm.toFixed(2);
    } else if (state.category === 'bracelets') {
      wrap.style.display = '';
      E.BRACELET_SIZES.forEach((s) => {
        const opt = document.createElement('option');
        opt.value = s.mm.toFixed(1);
        opt.textContent = lang === 'fr' ? s.labelFr : s.labelEn;
        sel.appendChild(opt);
      });
      let best = E.BRACELET_SIZES[2], bd = 999;
      for (const s of E.BRACELET_SIZES) {
        const d = Math.abs(s.mm - state.innerDiameter);
        if (d < bd) { bd = d; best = s; }
      }
      sel.value = best.mm.toFixed(1);
    } else {
      wrap.style.display = 'none';
    }
  }

  function updateDynamicLabels() {
    const rDiam = $('rangeInnerDiameter');
    const rWidth = $('rangeWidth');
    const lblD = $('lblDiameter'), lblDFr = $('lblDiameterFr');
    const lblW = $('lblWidth'), lblWFr = $('lblWidthFr');
    const taperWrap = $('taperWrap');

    if (state.category === 'rings') {
      rDiam.min = 13.5; rDiam.max = 23.5; rDiam.step = 0.05;
      rWidth.min = 1.6; rWidth.max = 14.0; rWidth.step = 0.1;
      lblD.textContent = 'Inner Finger Ø'; lblDFr.textContent = 'Ø Intérieur Doigt';
      lblW.textContent = 'Band Width'; lblWFr.textContent = 'Largeur Anneau';
      taperWrap.style.display = '';
    } else if (state.category === 'bracelets') {
      rDiam.min = 48; rDiam.max = 76; rDiam.step = 0.5;
      rWidth.min = 2.5; rWidth.max = 20; rWidth.step = 0.5;
      lblD.textContent = 'Wrist Inner Ø'; lblDFr.textContent = 'Ø Intérieur Poignet';
      lblW.textContent = 'Cuff Width'; lblWFr.textContent = 'Largeur Manchette';
      taperWrap.style.display = '';
    } else if (state.category === 'medallions') {
      rDiam.min = 14; rDiam.max = 46; rDiam.step = 0.5;
      rWidth.min = 14; rWidth.max = 46; rWidth.step = 0.5;
      lblD.textContent = 'Medallion Ø'; lblDFr.textContent = 'Ø Médaillon';
      lblW.textContent = 'Frame Scale'; lblWFr.textContent = 'Échelle Cadre';
      taperWrap.style.display = 'none';
    } else if (state.category === 'necklaces') {
      rDiam.min = 100; rDiam.max = 200; rDiam.step = 2;
      rWidth.min = 3.5; rWidth.max = 13.0; rWidth.step = 0.25;
      lblD.textContent = 'Chain Drape Ø'; lblDFr.textContent = 'Ø Tombé Colliers';
      lblW.textContent = 'Link Width'; lblWFr.textContent = 'Largeur Maille';
      taperWrap.style.display = 'none';
    } else if (state.category === 'earrings') {
      rDiam.min = 12; rDiam.max = 42; rDiam.step = 0.5;
      rWidth.min = 2.0; rWidth.max = 10.0; rWidth.step = 0.2;
      lblD.textContent = 'Earring Drop / Hoop Ø'; lblDFr.textContent = 'Ø Créole / Hauteur';
      lblW.textContent = 'Frame Width'; lblWFr.textContent = 'Largeur Cadre';
      taperWrap.style.display = 'none';
    } else if (state.category === 'crowns') {
      rDiam.min = 120; rDiam.max = 168; rDiam.step = 1;
      rWidth.min = 20; rWidth.max = 56; rWidth.step = 1;
      lblD.textContent = 'Headband Ø'; lblDFr.textContent = 'Ø Tour de Tête';
      lblW.textContent = 'Tiara Peak Height'; lblWFr.textContent = 'Hauteur Sommet';
      taperWrap.style.display = 'none';
    }

    rDiam.value = state.innerDiameter;
    rWidth.value = state.width;
    $('valInnerDiameter').textContent = `${Number(state.innerDiameter).toFixed(2)} mm`;
    $('valWidth').textContent = `${Number(state.width).toFixed(2)} mm`;
    $('valThickness').textContent = `${Number(state.thickness).toFixed(2)} mm`;
    $('valTaper').textContent = `${Math.round((state.shankTaper || 0) * 100)}%`;
    $('valPatIntensity').textContent = `${Number(state.patIntensity).toFixed(2)} mm`;
    $('valReliefDepth').textContent = `${Number(state.reliefDepth).toFixed(2)} mm`;

    const hasStone = state.stoneType && state.stoneType !== 'none';
    $('gemOptionsWrap').style.display = hasStone ? 'flex' : 'none';
    if (hasStone) {
      const gd = E.getGemDimensionsMm(state.stoneType, state.stoneCarat);
      $('valGemCarat').textContent = `${Number(state.stoneCarat).toFixed(2)} ct · ${gd.w.toFixed(1)}×${gd.l.toFixed(1)} mm`;
    }
  }

  function syncUIFromState() {
    document.querySelectorAll('#categoryGrid .cat-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.cat === state.category);
    });
    populateProfiles();
    populateRingSizes();
    populateAlloys();
    $('selectFinish').value = state.finish || 'mirror';
    $('selectPattern').value = state.procPattern || 'none';
    $('rangePatIntensity').value = state.patIntensity || 0.45;
    $('rangeReliefDepth').value = state.reliefDepth || 0.45;
    $('chkReliefInvert').checked = !!state.reliefInvert;
    $('rangeThickness').value = state.thickness;
    $('rangeTaper').value = Math.round((state.shankTaper || 0) * 100);

    document.querySelectorAll('#gemCutGrid .chip-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.cut === (state.stoneType || 'none'));
    });
    $('selectGemMaterial').value = state.stoneMaterial || 'diamond';
    $('rangeCarat').value = state.stoneCarat || 1.0;
    $('selectStoneLayout').value = state.stoneLayout || 'solitaire';
    $('selectStoneSetting').value = state.stoneSetting || 'prong6';

    $('inputEngraveText').value = state.engraveText || '';
    $('selectEngraveFont').value = state.engraveFont || 'Georgia, serif';
    $('selectEngraveMode').value = state.engraveMode || 'recessed';
    $('chkEngraveInside').checked = !!state.engraveInside;
    $('chkCastableOnly').checked = !!state.castableMetalOnly;
    $('selectShrinkage').value = String(state.shrinkagePercent || 0);

    updateDynamicLabels();
  }

  /* =========================================================================
     5. REBUILD PIPELINE & LIVE METROLOGY HUD
  ========================================================================= */
  function updateHUD(build) {
    const { stats, preflight } = build;
    $('hudDims').textContent = state.category === 'rings' || state.category === 'bracelets'
      ? `Ø ${stats.innerDiamMm.toFixed(2)} / ${stats.outerDiamMm.toFixed(2)} mm`
      : `${stats.sizeMm.x} × ${stats.sizeMm.y} × ${stats.sizeMm.z} mm`;
    $('hudWeight').textContent = `${stats.metalWeightG.toFixed(2)} g`;
    $('hudWax').textContent = `${stats.metalVolCm3.toFixed(2)} ml (${stats.waxWeightG.toFixed(2)} g)`;
    $('hudGems').textContent = stats.gemCount > 0 ? `${stats.gemCount}× · ${stats.totalCarats.toFixed(2)} ctw` : (lang === 'fr' ? 'Aucune' : 'None');
    $('hudPrice').textContent = `€ ${stats.cost.totalEur.toLocaleString()}`;

    const pfBtn = $('btnPreflightPill');
    const pfTxt = $('hudPreflight');
    pfTxt.textContent = `${preflight.score}/100 ${preflight.grade}`;
    pfBtn.className = 'preflight-pill' + (preflight.score >= 90 ? '' : (preflight.score >= 70 ? ' warn' : ' fail'));
  }

  function rebuildNow(resetCamera) {
    const maps = {
      engraveMap: buildEngraveHeightMap(),
      sculptMap: buildSculptHeightMap()
    };
    latestBuild = E.buildJewelry(state, maps);
    updateHUD(latestBuild);
    if (viewport) {
      viewport.renderBuild(latestBuild, !!resetCamera);
    }
  }

  function scheduleRebuild(resetCamera) {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => rebuildNow(resetCamera), 25);
  }

  /* =========================================================================
     6. SCULPT, VECTOR HERALDRY & MICRO-GEM STUDIO MODAL
  ========================================================================= */
  let sculptTool = 'brush';
  let activeStamp = 'fleur';
  let brushSize = 52;
  let isDrawing = false;

  const sculptViewCanvas = $('sculptCanvas');
  const sculptViewCtx = sculptViewCanvas ? sculptViewCanvas.getContext('2d') : null;

  function renderSculptPreview() {
    if (!sculptViewCtx) return;
    const W = sculptViewCanvas.width, H = sculptViewCanvas.height;
    sculptViewCtx.clearRect(0, 0, W, H);
    sculptViewCtx.drawImage(sculptDataCanvas, 0, 0);

    // Subtle golden guide lines (never written to heightmap!)
    sculptViewCtx.strokeStyle = 'rgba(245, 197, 66, 0.25)';
    sculptViewCtx.lineWidth = 1;
    sculptViewCtx.beginPath();
    sculptViewCtx.moveTo(W * 0.5, 0); sculptViewCtx.lineTo(W * 0.5, H);
    sculptViewCtx.moveTo(0, H * 0.5); sculptViewCtx.lineTo(W, H * 0.5);
    sculptViewCtx.stroke();

    // Render custom micro-gem markers ONLY on visual preview layer (zero heightmap spikes!)
    const gems = state.customGems || [];
    for (const g of gems) {
      const gx = g.u * W, gy = g.v * H;
      const gr = Math.max(6, Math.cbrt(g.carat || 0.08) * 18);
      sculptViewCtx.beginPath();
      sculptViewCtx.arc(gx, gy, gr, 0, Math.PI * 2);
      sculptViewCtx.fillStyle = 'rgba(56, 189, 248, 0.35)';
      sculptViewCtx.fill();
      sculptViewCtx.strokeStyle = '#38bdf8';
      sculptViewCtx.lineWidth = 2;
      sculptViewCtx.stroke();
    }
    const cnt = $('sculptGemCount');
    if (cnt) {
      cnt.textContent = lang === 'fr'
        ? `${gems.length} micro-gemme(s) personnalisée(s) placée(s)`
        : `${gems.length} custom micro-gem(s) placed`;
    }
  }

  function saveSculptSnapshot() {
    sculptHistory.push(sculptDataCtx.getImageData(0, 0, sculptDataCanvas.width, sculptDataCanvas.height));
    if (sculptHistory.length > 20) sculptHistory.shift();
  }

  function populateStamps() {
    const g = $('stampGrid');
    if (!g) return;
    g.innerHTML = '';
    E.HERALDRY_STAMPS.forEach((st) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'stamp-btn' + (activeStamp === st.id ? ' active' : '');
      btn.innerHTML = `<span class="sym">${st.sym}</span><span>${lang === 'fr' ? st.fr : st.en}</span>`;
      btn.addEventListener('click', () => {
        activeStamp = st.id;
        sculptTool = 'stamp';
        document.querySelectorAll('[data-stool]').forEach((b) => b.classList.toggle('active', b.dataset.stool === 'stamp'));
        g.querySelectorAll('.stamp-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
      g.appendChild(btn);
    });
  }

  function getCanvasCoords(ev) {
    const rect = sculptViewCanvas.getBoundingClientRect();
    const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
    const clientY = ev.touches ? ev.touches[0].clientY : ev.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * sculptViewCanvas.width,
      y: ((clientY - rect.top) / rect.height) * sculptViewCanvas.height
    };
  }

  function paintBrushAt(x, y) {
    const r = brushSize * 0.5;
    const grad = sculptDataCtx.createRadialGradient(x, y, 0, x, y, r);
    if (sculptTool === 'erase') {
      grad.addColorStop(0, 'rgba(0,0,0,0.85)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
    } else {
      grad.addColorStop(0, 'rgba(255,255,255,0.45)');
      grad.addColorStop(0.6, 'rgba(255,255,255,0.20)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
    }
    sculptDataCtx.fillStyle = grad;
    sculptDataCtx.beginPath();
    sculptDataCtx.arc(x, y, r, 0, Math.PI * 2);
    sculptDataCtx.fill();
    hasSculptOrPhotoData = true;
    renderSculptPreview();
  }

  /* =========================================================================
     7. PREFLIGHT & KARAT MODALS
  ========================================================================= */
  function openPreflightModal() {
    if (!latestBuild) return;
    const pf = latestBuild.preflight;
    const scEl = $('pfScoreBig');
    scEl.textContent = `${pf.score} / 100 · ${pf.grade}`;
    scEl.style.color = pf.score >= 90 ? 'var(--emerald)' : (pf.score >= 70 ? 'var(--amber)' : 'var(--rose)');
    const list = $('pfCheckList');
    list.innerHTML = pf.checks.map((c) => {
      const ico = c.status === 'pass' ? '✅' : (c.status === 'warn' ? '⚠️' : '❌');
      return `<div class="check-item ${c.status}"><span>${ico}</span><span>${lang === 'fr' ? c.fr : c.en}</span></div>`;
    }).join('');
    openModal('preflightModal');
  }

  function openKaratModal() {
    if (!latestBuild) return;
    const { stats } = latestBuild;
    const fr = lang === 'fr';
    const rows = Object.keys(E.ALLOYS).map((id) => {
      const a = E.ALLOYS[id];
      const wt = (stats.metalVolCm3 * a.density).toFixed(2);
      const eur = Math.round(wt * a.spotEur);
      const cls = id === state.material ? ' class="active-row"' : '';
      return `<tr${cls}><td>${fr ? a.nameFr : a.nameEn}</td><td>${a.density} g/cm³</td><td>${wt} g</td><td>€ ${eur.toLocaleString()}</td></tr>`;
    }).join('');
    $('karatBody').innerHTML = `
      <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:12px;color:var(--muted)">
        <span>${fr ? 'Volume métal exact' : 'Exact metal volume'}: <strong style="color:#fff">${stats.metalVolCm3} cm³ (${stats.metalVolMm3} mm³)</strong></span>
        <span>${fr ? 'Encombrement' : 'Bounding Box'}: <strong style="color:#fff">${stats.sizeMm.x}×${stats.sizeMm.y}×${stats.sizeMm.z} mm</strong></span>
        <span>${fr ? 'Triangles' : 'Triangles'}: <strong style="color:#fff">${stats.totalTriangles.toLocaleString()}</strong></span>
      </div>
      <table class="spec-table">
        <thead><tr><th>${fr ? 'Alliage / Titre' : 'Alloy / Karat'}</th><th>${fr ? 'Densité' : 'Density'}</th><th>${fr ? 'Poids Exact' : 'Exact Weight'}</th><th>${fr ? 'Coût Métal' : 'Metal Spot'}</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="background:var(--bg-2);border:1px solid var(--border-gold);border-radius:10px;padding:10px 14px;display:flex;justify-content:space-between;font-size:12.5px">
        <span>${fr ? 'Total Estimé Atelier (Métal + Gemmes + Sertissage)' : 'Total Atelier Valuation (Metal + Gems + Setting)'}</span>
        <strong style="color:var(--gold-hi);font-size:15px">€ ${stats.cost.totalEur.toLocaleString()}</strong>
      </div>`;
    openModal('karatModal');
  }

  /* =========================================================================
     8. EXPORT ACTIONS & .spjewel SAVE/LOAD
  ========================================================================= */
  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  async function doExportSTL() {
    if (!latestBuild) return;
    const gate = await checkExportGate();
    if (!gate.allowed) return;
    const buf = E.exportBinarySTL(latestBuild.parts, {
      castableMetalOnly: state.castableMetalOnly,
      shrinkagePercent: state.shrinkagePercent
    });
    const modeTag = state.castableMetalOnly ? 'castable_metal' : 'full';
    const shrinkTag = state.shrinkagePercent > 0 ? `_shrink${state.shrinkagePercent}pct` : '_1to1mm';
    triggerDownload(new Blob([buf], { type: 'application/octet-stream' }), `jewelry_${state.category}_${state.profile}_${modeTag}${shrinkTag}.stl`);
    recordExportUsed();
    toast(lang === 'fr' ? 'STL 1:1 mm étanche exporté !' : 'Watertight 1:1 mm STL exported!');
  }

  async function doExportOBJ() {
    if (!latestBuild) return;
    const gate = await checkExportGate();
    if (!gate.allowed) return;
    const txt = E.exportOBJ(latestBuild.parts, {
      castableMetalOnly: state.castableMetalOnly,
      shrinkagePercent: state.shrinkagePercent
    });
    triggerDownload(new Blob([txt], { type: 'text/plain' }), `jewelry_${state.category}_${state.profile}_1to1mm.obj`);
    recordExportUsed();
    toast(lang === 'fr' ? 'OBJ 1:1 mm exporté !' : '1:1 mm OBJ exported!');
  }

  async function doExportGLB() {
    if (!viewport || !latestBuild) return;
    const gate = await checkExportGate();
    if (!gate.allowed) return;
    const glb = await viewport.exportGLB({
      castableMetalOnly: state.castableMetalOnly,
      shrinkagePercent: state.shrinkagePercent
    });
    triggerDownload(new Blob([glb], { type: 'model/gltf-binary' }), `jewelry_${state.category}_${state.material}_1to1m.glb`);
    recordExportUsed();
    toast(lang === 'fr' ? 'GLB PBR 1:1 m exporté !' : '1:1 m PBR GLB exported!');
  }

  async function doExportClientProof() {
    if (!viewport || !latestBuild) return;
    const gate = await checkExportGate();
    if (!gate.allowed) return;
    const html = await viewport.buildClientProofHTML(lang);
    triggerDownload(new Blob([html], { type: 'text/html' }), `jewelry_3d_proof_${state.category}.html`);
    recordExportUsed();
    toast(lang === 'fr' ? 'Aperçu 3D Client .HTML exporté !' : 'Interactive 3D Client Proof .HTML exported!');
  }

  async function doExportSpecSheet() {
    if (!viewport || !latestBuild) return;
    const gate = await checkExportGate();
    if (!gate.allowed) return;
    const html = viewport.buildSpecSheetHTML(lang, gate.isPro);
    triggerDownload(new Blob([html], { type: 'text/html' }), `jewelry_spec_sheet_${state.category}.html`);
    recordExportUsed();
    toast(lang === 'fr' ? 'Fiche Technique Bijutier .HTML exportée !' : 'Master Jeweler Spec Sheet .HTML exported!');
  }

  async function doWebAR() {
    if (!viewport || !latestBuild) return;
    try {
      toast(lang === 'fr' ? 'Préparation WebAR 1:1 mm…' : 'Preparing exact 1:1 mm WebAR…');
      await viewport.sendToWebAR();
    } catch (err) {
      console.error('[Jewelry AR]', err);
      toast(lang === 'fr' ? 'Pont AR indisponible en mode hors-ligne' : 'AR Bridge unavailable in standalone preview');
    }
  }

  function doSaveProject() {
    const payload = {
      format: 'spjewel',
      version: 2,
      savedAt: new Date().toISOString(),
      state: state,
      sculptDataUrl: hasSculptOrPhotoData ? sculptDataCanvas.toDataURL('image/png') : null
    };
    triggerDownload(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `jewelry_${state.category}_${state.profile}.spjewel`);
    toast(lang === 'fr' ? 'Projet .spjewel sauvegardé (Gratuit)' : '.spjewel project saved (Free)');
  }

  function doLoadProject(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || !data.state) throw new Error('Invalid');
        state = Object.assign({}, E.DEFAULT_STATE, data.state);
        if (data.sculptDataUrl) {
          const img = new Image();
          img.onload = () => {
            sculptDataCtx.clearRect(0, 0, sculptDataCanvas.width, sculptDataCanvas.height);
            sculptDataCtx.drawImage(img, 0, 0, sculptDataCanvas.width, sculptDataCanvas.height);
            hasSculptOrPhotoData = true;
            scheduleRebuild(true);
          };
          img.src = data.sculptDataUrl;
        } else {
          sculptDataCtx.fillStyle = '#000';
          sculptDataCtx.fillRect(0, 0, sculptDataCanvas.width, sculptDataCanvas.height);
          hasSculptOrPhotoData = false;
        }
        pushHistory();
        syncUIFromState();
        scheduleRebuild(true);
        toast(lang === 'fr' ? 'Projet .spjewel restauré !' : '.spjewel project loaded!');
      } catch (_) {
        toast(lang === 'fr' ? 'Fichier .spjewel invalide' : 'Invalid .spjewel project file');
      }
    };
    reader.readAsText(file);
  }

  /* =========================================================================
     9. WIRE ALL CONTROLS & KEYBOARD SHORTCUTS
  ========================================================================= */
  function bindEvents() {
    // Back button (works inside Studios-Pro iframe AND standalone!)
    $('back-btn').addEventListener('click', () => {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'CLOSE_STUDIO' }, '*');
      } else {
        window.location.href = '/';
      }
    });

    $('langToggle').addEventListener('click', () => {
      lang = (lang === 'en') ? 'fr' : 'en';
      applyLanguage();
    });

    // Mobile tab switcher
    document.querySelectorAll('.mobile-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.body.dataset.mobilePane = btn.dataset.mobileTarget;
        document.querySelectorAll('.mobile-tab').forEach((b) => b.classList.toggle('active', b === btn));
        if (viewport && btn.dataset.mobileTarget === 'viewport') {
          setTimeout(() => viewport.resize(), 40);
        }
      });
    });

    // Categories
    document.querySelectorAll('#categoryGrid .cat-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.cat;
        if (cat === state.category) return;
        state.category = cat;
        const profs = E.CATEGORY_PROFILES[cat];
        state.profile = profs[0].id;
        // Set ergonomic real-mm defaults per category!
        if (cat === 'rings') { state.innerDiameter = 17.20; state.width = 4.5; state.thickness = 2.0; }
        else if (cat === 'bracelets') { state.innerDiameter = 62.0; state.width = 7.0; state.thickness = 3.0; }
        else if (cat === 'medallions') { state.innerDiameter = 24.0; state.width = 24.0; state.thickness = 2.6; }
        else if (cat === 'necklaces') { state.innerDiameter = 145.0; state.width = 7.0; state.thickness = 2.4; }
        else if (cat === 'earrings') { state.innerDiameter = 22.0; state.width = 4.0; state.thickness = 2.0; }
        else if (cat === 'crowns') { state.innerDiameter = 142.0; state.width = 34.0; state.thickness = 2.4; }
        pushHistory();
        syncUIFromState();
        scheduleRebuild(true);
      });
    });

    // Right sidebar controls
    $('selectProfile').addEventListener('change', (e) => { state.profile = e.target.value; pushHistory(); scheduleRebuild(false); });
    $('selectRingSize').addEventListener('change', (e) => {
      state.innerDiameter = parseFloat(e.target.value);
      pushHistory();
      updateDynamicLabels();
      scheduleRebuild(false);
    });
    $('rangeInnerDiameter').addEventListener('input', (e) => {
      state.innerDiameter = parseFloat(e.target.value);
      updateDynamicLabels();
      scheduleRebuild(false);
    });
    $('rangeInnerDiameter').addEventListener('change', () => { populateRingSizes(); pushHistory(); });

    $('rangeWidth').addEventListener('input', (e) => { state.width = parseFloat(e.target.value); updateDynamicLabels(); scheduleRebuild(false); });
    $('rangeWidth').addEventListener('change', pushHistory);

    $('rangeThickness').addEventListener('input', (e) => { state.thickness = parseFloat(e.target.value); updateDynamicLabels(); scheduleRebuild(false); });
    $('rangeThickness').addEventListener('change', pushHistory);

    $('rangeTaper').addEventListener('input', (e) => { state.shankTaper = parseFloat(e.target.value) / 100; updateDynamicLabels(); scheduleRebuild(false); });
    $('rangeTaper').addEventListener('change', pushHistory);

    $('selectInnerMaterial').addEventListener('change', (e) => { state.innerMaterial = e.target.value; pushHistory(); scheduleRebuild(false); });
    $('selectFinish').addEventListener('change', (e) => { state.finish = e.target.value; pushHistory(); scheduleRebuild(false); });

    // Pattern & relief
    $('selectPattern').addEventListener('change', (e) => { state.procPattern = e.target.value; pushHistory(); scheduleRebuild(false); });
    $('rangePatIntensity').addEventListener('input', (e) => { state.patIntensity = parseFloat(e.target.value); updateDynamicLabels(); scheduleRebuild(false); });
    $('rangePatIntensity').addEventListener('change', pushHistory);
    $('rangeReliefDepth').addEventListener('input', (e) => { state.reliefDepth = parseFloat(e.target.value); updateDynamicLabels(); scheduleRebuild(false); });
    $('rangeReliefDepth').addEventListener('change', pushHistory);
    $('chkReliefInvert').addEventListener('change', (e) => { state.reliefInvert = e.target.checked; pushHistory(); scheduleRebuild(false); });

    // Photo Bas-Relief upload
    $('btnUploadPhoto').addEventListener('click', () => $('photoReliefInput').click());
    $('photoReliefInput').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const img = new Image();
      img.onload = () => {
        const W = sculptDataCanvas.width, H = sculptDataCanvas.height;
        sculptDataCtx.fillStyle = '#000';
        sculptDataCtx.fillRect(0, 0, W, H);
        // Fit centered preserving aspect ratio + convert to clean luminance heightmap
        const scale = Math.min((W * 0.84) / img.width, (H * 0.84) / img.height);
        const dw = img.width * scale, dh = img.height * scale;
        sculptDataCtx.filter = 'grayscale(100%) contrast(120%) blur(1px)';
        sculptDataCtx.drawImage(img, (W - dw) * 0.5, (H - dh) * 0.5, dw, dh);
        sculptDataCtx.filter = 'none';
        hasSculptOrPhotoData = true;
        scheduleRebuild(false);
        toast(lang === 'fr' ? 'Bas-relief photo appliqué !' : 'Photo bas-relief applied!');
      };
      img.src = URL.createObjectURL(f);
      e.target.value = '';
    });

    $('btnClearRelief').addEventListener('click', () => {
      sculptDataCtx.fillStyle = '#000';
      sculptDataCtx.fillRect(0, 0, sculptDataCanvas.width, sculptDataCanvas.height);
      hasSculptOrPhotoData = false;
      state.customGems = [];
      pushHistory();
      scheduleRebuild(false);
      toast(lang === 'fr' ? 'Relief & micro-gemmes effacés' : 'Relief & custom gems cleared');
    });

    // Gemstones & settings
    document.querySelectorAll('#gemCutGrid .chip-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.stoneType = btn.dataset.cut;
        if (state.stoneType === 'pearl') state.stoneMaterial = 'pearl';
        document.querySelectorAll('#gemCutGrid .chip-btn').forEach((b) => b.classList.toggle('active', b === btn));
        pushHistory();
        updateDynamicLabels();
        scheduleRebuild(false);
      });
    });
    $('selectGemMaterial').addEventListener('change', (e) => { state.stoneMaterial = e.target.value; pushHistory(); scheduleRebuild(false); });
    $('rangeCarat').addEventListener('input', (e) => { state.stoneCarat = parseFloat(e.target.value); updateDynamicLabels(); scheduleRebuild(false); });
    $('rangeCarat').addEventListener('change', pushHistory);
    $('selectStoneLayout').addEventListener('change', (e) => { state.stoneLayout = e.target.value; pushHistory(); scheduleRebuild(false); });
    $('selectStoneSetting').addEventListener('change', (e) => { state.stoneSetting = e.target.value; pushHistory(); scheduleRebuild(false); });

    // Engraving
    $('inputEngraveText').addEventListener('input', (e) => { state.engraveText = e.target.value; scheduleRebuild(false); });
    $('inputEngraveText').addEventListener('change', pushHistory);
    $('selectEngraveFont').addEventListener('change', (e) => { state.engraveFont = e.target.value; pushHistory(); scheduleRebuild(false); });
    $('selectEngraveMode').addEventListener('change', (e) => { state.engraveMode = e.target.value; pushHistory(); scheduleRebuild(false); });
    $('chkEngraveInside').addEventListener('change', (e) => { state.engraveInside = e.target.checked; pushHistory(); scheduleRebuild(false); });

    // Casting options
    $('chkCastableOnly').addEventListener('change', (e) => {
      state.castableMetalOnly = e.target.checked;
      pushHistory();
      scheduleRebuild(false);
      toast(e.target.checked
        ? (lang === 'fr' ? 'Mode Fonte Métal Seul (griffes ouvertes pour sertisseur)' : 'Castable Metal-Only mode (open prongs ready for stone setting)')
        : (lang === 'fr' ? 'Mode Assemblage Complet (métal + gemmes)' : 'Full Assembly mode (metal + gemstones)'));
    });
    $('selectShrinkage').addEventListener('change', (e) => { state.shrinkagePercent = parseFloat(e.target.value) || 0; pushHistory(); scheduleRebuild(false); });

    // Showroom & Camera pills
    document.querySelectorAll('#showroomBar [data-showroom]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#showroomBar [data-showroom]').forEach((b) => b.classList.toggle('active', b === btn));
        if (viewport) viewport.setShowroom(btn.dataset.showroom);
      });
    });
    document.querySelectorAll('[data-cam]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (viewport) viewport.setCameraPreset(btn.dataset.cam, true);
      });
    });
    $('btnAutoSpin').addEventListener('click', (e) => {
      const on = !e.currentTarget.classList.contains('active');
      e.currentTarget.classList.toggle('active', on);
      if (viewport) viewport.setAutoSpin(on, 1.6);
    });
    $('btnScaleGuide').addEventListener('click', (e) => {
      const on = !e.currentTarget.classList.contains('active');
      e.currentTarget.classList.toggle('active', on);
      if (viewport) viewport.setScaleGuide(on);
    });
    $('btnWireframe').addEventListener('click', (e) => {
      const on = !e.currentTarget.classList.contains('active');
      e.currentTarget.classList.toggle('active', on);
      if (viewport) viewport.setWireframe(on);
    });
    $('rangeLightAngle').addEventListener('input', (e) => {
      if (viewport) viewport.setLightAngle(parseFloat(e.target.value));
    });

    // Topbar & Export buttons
    $('btnUndo').addEventListener('click', undo);
    $('btnRedo').addEventListener('click', redo);
    $('btnSaveProject').addEventListener('click', doSaveProject);
    $('btnLoadProject').addEventListener('click', () => $('projectFileInput').click());
    $('projectFileInput').addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) doLoadProject(e.target.files[0]);
      e.target.value = '';
    });

    $('btnScreenshot').addEventListener('click', () => {
      if (!viewport) return;
      const url = viewport.captureRenderPNG(cachedCredits.isPro);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jewelry_render_${state.category}_${Date.now()}.png`;
      a.click();
      toast(lang === 'fr' ? 'Rendu Studio PNG téléchargé (Gratuit) !' : 'Studio Render PNG saved (Free)!');
    });

    $('btnVideo').addEventListener('click', () => openModal('videoModal'));
    $('btnRecordFree').addEventListener('click', async () => {
      if (!viewport) return;
      const mode = $('selectVideoMode').value;
      const prog = $('videoProgressWrap');
      prog.style.display = 'block';
      try {
        const blob = await viewport.recordShowcaseVideo(mode, false, (pct) => {
          prog.textContent = (lang === 'fr' ? 'Enregistrement vidéo… ' : 'Recording showcase video… ') + pct + '%';
        });
        triggerDownload(blob, `jewelry_${state.category}_${mode}.webm`);
        toast(lang === 'fr' ? 'Vidéo .WEBM enregistrée !' : '.WEBM showcase video saved!');
      } catch (_) {
        toast(lang === 'fr' ? 'Enregistrement vidéo non supporté' : 'Video recording unavailable');
      }
      prog.style.display = 'none';
      closeModal('videoModal');
    });
    $('btnRecordPro').addEventListener('click', async () => {
      if (!viewport) return;
      const gate = await checkExportGate();
      if (!gate.allowed) return;
      const mode = $('selectVideoMode').value;
      const prog = $('videoProgressWrap');
      prog.style.display = 'block';
      try {
        const blob = await viewport.recordShowcaseVideo(mode, true, (pct) => {
          prog.textContent = (lang === 'fr' ? 'Enregistrement Pro… ' : 'Recording clean Pro video… ') + pct + '%';
        });
        triggerDownload(blob, `jewelry_${state.category}_${mode}_pro.webm`);
        recordExportUsed();
        toast(lang === 'fr' ? 'Vidéo Pro sans filigrane enregistrée !' : 'Clean Pro .WEBM video saved!');
      } catch (_) {
        toast(lang === 'fr' ? 'Enregistrement vidéo non supporté' : 'Video recording unavailable');
      }
      prog.style.display = 'none';
      closeModal('videoModal');
    });

    $('btnExportStl').addEventListener('click', doExportSTL);
    $('btnExportStlTop').addEventListener('click', doExportSTL);
    $('btnExportGlb').addEventListener('click', doExportGLB);
    $('btnExportObj').addEventListener('click', doExportOBJ);
    $('btnExportHtml').addEventListener('click', doExportClientProof);
    $('btnExportSpec').addEventListener('click', doExportSpecSheet);
    $('btnKaratSpecExport').addEventListener('click', doExportSpecSheet);
    $('btnPreviewAr').addEventListener('click', doWebAR);

    // Modals
    $('btnPreflightPill').addEventListener('click', openPreflightModal);
    $('btnKaratModal').addEventListener('click', openKaratModal);
    $('btnAutoFix').addEventListener('click', () => {
      const patch = E.getAutoFixPatch(state);
      Object.assign(state, patch);
      pushHistory();
      syncUIFromState();
      rebuildNow(false);
      openPreflightModal();
      toast(lang === 'fr' ? 'Paramètres corrigés pour la fonte !' : 'Auto-fixed dimensions for safe casting!');
    });

    $('btnOpenSculpt').addEventListener('click', () => {
      renderSculptPreview();
      openModal('sculptModal');
    });
    $('btnSculptApply').addEventListener('click', () => {
      pushHistory();
      scheduleRebuild(false);
      closeModal('sculptModal');
      toast(lang === 'fr' ? 'Sculpture & estampes appliquées en 3D !' : 'Sculpt & vector heraldry applied in 3D!');
    });
    $('btnSculptUndo').addEventListener('click', () => {
      if (sculptHistory.length > 0) {
        const prev = sculptHistory.pop();
        sculptDataCtx.putImageData(prev, 0, 0);
        renderSculptPreview();
      } else if (state.customGems && state.customGems.length > 0) {
        state.customGems.pop();
        renderSculptPreview();
      }
    });
    $('btnSculptClear').addEventListener('click', () => {
      saveSculptSnapshot();
      sculptDataCtx.fillStyle = '#000';
      sculptDataCtx.fillRect(0, 0, sculptDataCanvas.width, sculptDataCanvas.height);
      hasSculptOrPhotoData = false;
      state.customGems = [];
      renderSculptPreview();
    });

    document.querySelectorAll('[data-stool]').forEach((btn) => {
      btn.addEventListener('click', () => {
        sculptTool = btn.dataset.stool;
        document.querySelectorAll('[data-stool]').forEach((b) => b.classList.toggle('active', b === btn));
      });
    });
    $('rangeBrushSize').addEventListener('input', (e) => {
      brushSize = parseInt(e.target.value, 10) || 52;
      $('valBrushSize').textContent = `${brushSize} px`;
    });

    if (sculptViewCanvas) {
      const onDown = (ev) => {
        ev.preventDefault();
        const { x, y } = getCanvasCoords(ev);
        if (sculptTool === 'stamp') {
          saveSculptSnapshot();
          E.drawVectorReliefStamp(sculptDataCtx, activeStamp, x, y, brushSize * 1.9);
          hasSculptOrPhotoData = true;
          renderSculptPreview();
        } else if (sculptTool === 'gem') {
          state.customGems = state.customGems || [];
          state.customGems.push({
            u: x / sculptViewCanvas.width,
            v: y / sculptViewCanvas.height,
            carat: Math.max(0.03, Math.min(0.45, (brushSize / 140) * 0.35))
          });
          renderSculptPreview();
        } else {
          saveSculptSnapshot();
          isDrawing = true;
          paintBrushAt(x, y);
        }
      };
      const onMove = (ev) => {
        if (!isDrawing) return;
        ev.preventDefault();
        const { x, y } = getCanvasCoords(ev);
        paintBrushAt(x, y);
      };
      const onUp = () => { isDrawing = false; };
      sculptViewCanvas.addEventListener('mousedown', onDown);
      sculptViewCanvas.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      sculptViewCanvas.addEventListener('touchstart', onDown, { passive: false });
      sculptViewCanvas.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('touchend', onUp);
    }

    // Close modals
    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
    });
    document.querySelectorAll('.modal-backdrop').forEach((bd) => {
      bd.addEventListener('click', (e) => { if (e.target === bd) bd.classList.remove('open'); });
    });

    $('btnUpgradePro').addEventListener('click', () => {
      closeModal('paymentModal');
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'SHOW_PAYWALL_MODAL' }, '*');
      } else {
        window.open('/pricing', '_blank');
      }
    });

    // Global Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    });
  }

  /* =========================================================================
     10. PLATFORM COMPATIBILITY BRIDGES (getAppState & getAppTags)
  ========================================================================= */
  window.getAppState = function () {
    return { vals: Object.assign({}, state) };
  };

  window.getAppTags = function () {
    const tags = [{
      x: 50, y: 74,
      label_en: `${state.category.toUpperCase()} (Ø ${Number(state.innerDiameter).toFixed(2)} mm)`,
      label_fr: `${state.category.toUpperCase()} (Ø ${Number(state.innerDiameter).toFixed(2)} mm)`,
      desc_en: `Width: ${state.width}mm · Wall: ${state.thickness}mm · Alloy: ${state.material}`,
      desc_fr: `Largeur : ${state.width}mm · Paroi : ${state.thickness}mm · Alliage : ${state.material}`
    }];
    if (state.stoneType && state.stoneType !== 'none') {
      tags.push({
        x: 50, y: 26,
        label_en: `${Number(state.stoneCarat).toFixed(2)}ct ${state.stoneMaterial.toUpperCase()}`,
        label_fr: `${state.stoneMaterial.toUpperCase()} ${Number(state.stoneCarat).toFixed(2)}ct`,
        desc_en: `Cut: ${state.stoneType} · Setting: ${state.stoneSetting} · Layout: ${state.stoneLayout}`,
        desc_fr: `Taille : ${state.stoneType} · Serti : ${state.stoneSetting} · Disposition : ${state.stoneLayout}`
      });
    }
    return tags;
  };

  /* =========================================================================
     11. BOOTSTRAP
  ========================================================================= */
  function initViewport() {
    if (viewport || !window.JewelryViewport) return;
    viewport = new window.JewelryViewport($('viewport'));
    rebuildNow(true);
  }

  function boot() {
    bindEvents();
    applyLanguage();
    syncUIFromState();
    pushHistory();
    if (window.JewelryViewport) {
      initViewport();
    } else {
      window.addEventListener('jewelry-viewport-ready', initViewport, { once: true });
      // Also render HUD immediately even before WebGL module finishes importing!
      rebuildNow(false);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
