/**
 * Architect Pro 1 (v2.0) — Master UI Orchestrator
 * Restores Undo/Redo, Save/Load Project, Default Wall Height/Thickness, Top/Iso 3D Camera,
 * True Unit Conversion (m/cm/in/ft), Synced BOM & Header Price Badge, 25-Item Catalog,
 * Smart AI Architect v2, EN/FR i18n, and Unified Studios-Pro Host Contracts.
 */
(function () {
  'use strict';

  window.STATE = {
    lang: 'en',
    activeTool: 'select',
    unit: 'm',               // Matches #unitSelect default 'm' (fixes cm/m mismatch!)
    elements: [],
    selectedElement: null,
    globWallHeight: 280,     // Internal cm
    globWallThick: 20,       // Internal cm
    activeFloor: 0,
    blueprintImage: null,
    blueprintVisible: true,
    blueprintOpacity: 0.45,
    blueprintScale: 1.0
  };

  window.STATE_HISTORY = {
    past: [],
    future: [],
    saveState() {
      this.past.push(JSON.stringify(STATE.elements));
      this.future = [];
      if (this.past.length > 50) this.past.shift();
      updateHistoryButtons();
    },
    undo() {
      if (!this.past.length) return;
      this.future.push(JSON.stringify(STATE.elements));
      STATE.elements = JSON.parse(this.past.pop());
      window.selectElement(null);
      updateHistoryButtons();
      window.triggerUpdate();
      window.showToast('Undo', 'Annulé');
    },
    redo() {
      if (!this.future.length) return;
      this.past.push(JSON.stringify(STATE.elements));
      STATE.elements = JSON.parse(this.future.pop());
      window.selectElement(null);
      updateHistoryButtons();
      window.triggerUpdate();
      window.showToast('Redo', 'Rétabli');
    }
  };

  const $ = id => document.getElementById(id);

  // Toast helper
  let toastTimer = null;
  window.showToast = function (en, fr) {
    const el = $('toast');
    if (!el) return;
    el.textContent = (STATE.lang === 'fr' && fr) ? fr : en;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  };

  function updateHistoryButtons() {
    const u = $('btnUndo'), r = $('btnRedo');
    if (u) u.disabled = STATE_HISTORY.past.length === 0;
    if (r) r.disabled = STATE_HISTORY.future.length === 0;
  }

  // ============================================================================
  // SYNCED BOM & ROOM SCHEDULE UPDATER (FIXES $0.00 HEADER BADGE!)
  // ============================================================================
  function updateBOMAndRooms() {
    const bom = ArchCore.calculateBOM(STATE.elements);
    const totalStr = bom.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Sync BOTH top header badge AND sidebar BOM total!
    const badgeVal = document.querySelector('#totalPriceBadge .price-value');
    if (badgeVal) badgeVal.textContent = totalStr;
    const tbTotal = $('bomTotal');
    if (tbTotal) tbTotal.textContent = `$${totalStr}`;

    const tbody = $('bomTableBody');
    if (tbody) {
      tbody.innerHTML = '';
      let rows = 0;
      Object.keys(bom.categories).forEach(k => {
        const c = bom.categories[k];
        if (c.count === 0) return;
        rows++;
        const tr = document.createElement('tr');
        const label = STATE.lang === 'fr' ? c.labelFr : k;
        const qtyStr = c.unit === 'm²' ? ArchCore.formatArea(c.qty, STATE.unit) : `${c.qty}`;
        tr.innerHTML = `<td>${label}</td><td style="text-align:right;color:#94a3b8">${qtyStr}</td><td>$${c.cost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>`;
        tbody.appendChild(tr);
      });
      if (rows === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:#64748b;padding:10px 0">${STATE.lang === 'fr' ? 'Ajoutez des murs ou meubles' : 'Add walls or items to estimate'}</td></tr>`;
      }
    }

    // Auto-Detected Rooms Area Schedule
    const rooms = ArchCore.detectRooms(STATE.elements, STATE.activeFloor);
    const areaSum = rooms.reduce((s, r) => s + r.areaSqM, 0) || bom.totalFloorAreaSqM;
    const areaTxt = ArchCore.formatArea(areaSum, STATE.unit);
    if ($('badgeArea2D')) $('badgeArea2D').textContent = areaTxt;
    if ($('totalAreaBadge')) $('totalAreaBadge').textContent = areaTxt;

    const rList = $('roomScheduleList');
    if (rList) {
      rList.innerHTML = '';
      if (rooms.length === 0) {
        rList.textContent = STATE.lang === 'fr' ? 'Fermez des murs pour détecter les pièces automatiquement.' : 'Close walls to auto-detect rooms & m².';
      } else {
        rooms.forEach(r => {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;justify-content:space-between;padding:4px 6px;background:rgba(9,14,24,.65);border-radius:5px';
          row.innerHTML = `<span style="color:#e2e8f0;font-weight:600">${STATE.lang === 'fr' ? r.labelFr : r.labelEn}</span><span style="color:#38bdf8;font-family:JetBrains Mono,monospace;font-weight:700">${ArchCore.formatArea(r.areaSqM, STATE.unit)}</span>`;
          rList.appendChild(row);
        });
      }
    }
  }

  window.triggerUpdate = function () {
    updateBOMAndRooms();
    if (window.Editor2D) Editor2D.needsRedraw = true;
    if (window.Engine3D) Engine3D.needsRebuild = true;
  };

  // ============================================================================
  // SAFE PROPERTIES INSPECTOR (ZERO NULL CRASH ON LIGHT / TERRAIN + TRUE UNITS!)
  // ============================================================================
  function fmtInputVal(cmVal) {
    const v = ArchCore.cmToUnit(cmVal, STATE.unit);
    return Number(v.toFixed(STATE.unit === 'cm' ? 0 : 2));
  }

  function syncUnitLabels() {
    document.querySelectorAll('.curr-unit').forEach(el => { el.textContent = STATE.unit; });
    $('globWallHeight').value = fmtInputVal(STATE.globWallHeight);
    $('globWallThick').value = fmtInputVal(STATE.globWallThick);
  }

  window.selectElement = function (el) {
    STATE.selectedElement = el;
    $('emptyProps').style.display = el ? 'none' : 'flex';
    $('dynamicProps').style.display = el ? 'flex' : 'none';
    if (el) {
      switchSideTab('props');
      window.updatePropertiesUI();
    }
  };

  window.updatePropertiesUI = function () {
    const el = STATE.selectedElement;
    if (!el) return;

    $('propHeaderType').textContent = (el.modelVariant || el.type).toUpperCase().replace(/_/g, ' ');
    $('propHeaderFloor').textContent = `Floor ${el.floor || 0}`;

    // Reset visibility & labels safely (NO fragile previousElementSibling!)
    $('groupWidth').style.display = 'flex';
    $('groupHeight').style.display = 'flex';
    $('groupElevation').style.display = 'flex';
    $('groupRotation').style.display = 'flex';
    $('groupCurvature').style.display = 'none';
    $('groupModel').style.display = 'none';
    $('groupMaterial').style.display = 'none';
    $('groupColor').style.display = 'flex';
    $('unitWidth').textContent = STATE.unit;
    $('unitHeight').textContent = STATE.unit;
    $('unitElevation').textContent = STATE.unit;

    $('lblWidth').textContent = STATE.lang === 'fr' ? 'Largeur' : 'Width';
    $('lblHeight').textContent = STATE.lang === 'fr' ? 'Hauteur / Long.' : 'Height / Len';
    $('lblElevation').textContent = STATE.lang === 'fr' ? 'Élévation' : 'Elevation';

    $('propRotation').value = Math.round(el.rotation || 0);
    $('propColor').value = /^#[0-9a-fA-F]{6}$/.test(el.color || '') ? el.color : '#f1f5f9';
    $('propCost').value = Math.round(el.cost || 0);

    if (el.type === 'wall') {
      $('lblWidth').textContent = STATE.lang === 'fr' ? 'Longueur' : 'Length';
      $('lblHeight').textContent = STATE.lang === 'fr' ? 'Hauteur' : 'Height';
      $('propWidth').value = fmtInputVal(ArchCore.wallLength(el));
      $('propHeight').value = fmtInputVal(el.height || 280);
      $('groupElevation').style.display = 'none';
      $('groupRotation').style.display = 'none';
      $('groupCurvature').style.display = 'flex';
      $('propCurvature').value = fmtInputVal(el.curvature || 0);
      $('groupMaterial').style.display = 'flex';
      $('propMaterial').value = el.material || 'concrete';
    } else if (el.type === 'door' || el.type === 'window') {
      $('propWidth').value = fmtInputVal(el.length || 95);
      $('propHeight').value = fmtInputVal(el.height || 210);
      $('propElevation').value = fmtInputVal(el.elevation || 0);
      $('groupRotation').style.display = 'none';
      populateModelSelect(
        el.type === 'door'
          ? [['single', 'Single Door'], ['double', 'Double Door'], ['sliding', 'Sliding Door']]
          : [['single', 'Single Window'], ['double', 'Double Window'], ['sliding', 'Sliding Window']],
        el.modelVariant || 'single'
      );
    } else if (el.type === 'furniture') {
      $('lblHeight').textContent = STATE.lang === 'fr' ? 'Profondeur' : 'Depth';
      $('propWidth').value = fmtInputVal(el.width || 100);
      $('propHeight').value = fmtInputVal(el.length || 100);
      $('propElevation').value = fmtInputVal(el.elevation || 0);
      const opts = Object.keys(ArchCore.CATALOG).map(k => [k, `${ArchCore.CATALOG[k].icon} ${STATE.lang === 'fr' ? ArchCore.CATALOG[k].fr : ArchCore.CATALOG[k].en}`]);
      if (el.modelVariant === 'custom_glb') opts.push(['custom_glb', '📦 Custom GLB']);
      populateModelSelect(opts, el.modelVariant || 'table');
    } else if (el.type === 'floor') {
      $('lblHeight').textContent = STATE.lang === 'fr' ? 'Profondeur' : 'Depth';
      $('propWidth').value = fmtInputVal(el.width || 300);
      $('propHeight').value = fmtInputVal(el.height || 300);
      $('groupElevation').style.display = 'none';
      $('groupMaterial').style.display = 'flex';
      $('propMaterial').value = el.material || 'wood';
    } else if (el.type === 'roof') {
      $('lblHeight').textContent = STATE.lang === 'fr' ? 'Profondeur' : 'Depth';
      $('propWidth').value = fmtInputVal(el.width || 400);
      $('propHeight').value = fmtInputVal(el.height || 400);
      $('propElevation').value = fmtInputVal(el.elevation !== undefined ? el.elevation : STATE.globWallHeight);
      $('groupMaterial').style.display = 'flex';
      $('propMaterial').value = el.material || 'tiles';
      populateModelSelect([['hipped', 'Hipped Roof'], ['gabled', 'Gabled Roof'], ['flat', 'Flat Roof']], el.modelVariant || 'hipped');
    } else if (el.type === 'lightNode') {
      $('lblWidth').textContent = STATE.lang === 'fr' ? 'Intensité' : 'Intensity';
      $('unitWidth').textContent = '×';
      $('propWidth').value = Number((el.intensity || 1.2).toFixed(1));
      $('groupHeight').style.display = 'none';
      $('groupRotation').style.display = 'none';
      $('propElevation').value = fmtInputVal(el.elevation || 255);
    } else if (el.type === 'terrainSplat') {
      $('lblWidth').textContent = STATE.lang === 'fr' ? 'Rayon' : 'Radius';
      $('lblElevation').textContent = STATE.lang === 'fr' ? 'Force Z' : 'Force Z';
      $('propWidth').value = fmtInputVal(el.radius || 140);
      $('propElevation').value = fmtInputVal(el.force || 25);
      $('groupHeight').style.display = 'none';
      $('groupRotation').style.display = 'none';
    } else if (el.type === 'cameraNode') {
      $('groupWidth').style.display = 'none';
      $('groupHeight').style.display = 'none';
      $('groupRotation').style.display = 'none';
      $('groupColor').style.display = 'none';
      $('propElevation').value = fmtInputVal(el.elevation || 168);
    }
  };

  function populateModelSelect(pairs, currentVal) {
    const sel = $('propModel');
    $('groupModel').style.display = 'flex';
    sel.innerHTML = '';
    pairs.forEach(([val, lbl]) => {
      const opt = document.createElement('option');
      opt.value = val; opt.textContent = lbl;
      if (val === currentVal) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  function applyPropertyEdits() {
    const el = STATE.selectedElement;
    if (!el) return;
    const wCm = ArchCore.unitToCm($('propWidth').value, STATE.unit);
    const hCm = ArchCore.unitToCm($('propHeight').value, STATE.unit);
    const eCm = ArchCore.unitToCm($('propElevation').value, STATE.unit);

    if (el.type === 'wall') {
      // REAL wall resize updating (x2, y2) cleanly!
      ArchCore.resizeWallLength(el, Math.max(20, wCm));
      el.height = Math.max(50, hCm);
      el.curvature = ArchCore.unitToCm($('propCurvature').value, STATE.unit);
      el.material = $('propMaterial').value;
      STATE.elements.filter(o => o.wallId === el.id).forEach(o => ArchCore.clampOpeningOnWall(o, el));
    } else if (el.type === 'door' || el.type === 'window') {
      el.length = Math.max(30, wCm);
      el.height = Math.max(30, hCm);
      el.elevation = Math.max(0, eCm);
      el.modelVariant = $('propModel').value;
      const host = STATE.elements.find(w => w.id === el.wallId);
      if (host) ArchCore.clampOpeningOnWall(el, host);
    } else if (el.type === 'furniture') {
      el.width = Math.max(20, wCm);
      el.length = Math.max(20, hCm);
      el.elevation = Math.max(0, eCm);
      el.rotation = parseFloat($('propRotation').value) || 0;
      const newVar = $('propModel').value;
      if (newVar && newVar !== el.modelVariant) {
        el.modelVariant = newVar;
        const spec = ArchCore.CATALOG[newVar];
        if (spec) {
          el.width = spec.w; el.length = spec.l; el.height = spec.h;
          el.color = spec.color; el.cost = spec.cost;
          window.updatePropertiesUI();
        }
      }
    } else if (el.type === 'floor') {
      el.width = Math.max(30, wCm);
      el.height = Math.max(30, hCm);
      el.rotation = parseFloat($('propRotation').value) || 0;
      el.material = $('propMaterial').value;
    } else if (el.type === 'roof') {
      el.width = Math.max(40, wCm);
      el.height = Math.max(40, hCm);
      el.elevation = Math.max(0, eCm);
      el.rotation = parseFloat($('propRotation').value) || 0;
      el.material = $('propMaterial').value;
      el.modelVariant = $('propModel').value;
    } else if (el.type === 'lightNode') {
      el.intensity = Math.max(0.1, Math.min(5, parseFloat($('propWidth').value) || 1.2));
      el.elevation = Math.max(20, eCm);
    } else if (el.type === 'terrainSplat') {
      el.radius = Math.max(30, wCm);
      el.force = eCm;
    } else if (el.type === 'cameraNode') {
      el.elevation = Math.max(20, eCm);
    }

    el.color = $('propColor').value;
    el.cost = Math.max(0, parseFloat($('propCost').value) || 0);
    window.triggerUpdate();
  }

  // ============================================================================
  // 25+ ITEM CATALOG RENDERER
  // ============================================================================
  function renderCatalogGrid(filterCat) {
    const grid = $('catalogGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const cat = filterCat || 'all';
    Object.keys(ArchCore.CATALOG).forEach(key => {
      const item = ArchCore.CATALOG[key];
      if (cat !== 'all' && item.cat !== cat) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cat-item' + (Editor2D.activeFurnitureVariant === key ? ' active' : '');
      btn.innerHTML = `<span>${item.icon}</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${STATE.lang === 'fr' ? item.fr : item.en}</span>`;
      btn.addEventListener('click', () => {
        Editor2D.activeFurnitureVariant = key;
        setActiveTool('furniture');
        renderCatalogGrid($('catFilter').value);
        window.showToast(`Selected ${item.en} — click 2D plan to place`, `${item.fr} sélectionné — cliquez sur le plan 2D`);
      });
      grid.appendChild(btn);
    });
  }

  function switchSideTab(tab) {
    document.querySelectorAll('.side-tab').forEach(b => b.classList.toggle('active', b.dataset.stab === tab));
    $('paneProps').style.display = tab === 'props' ? 'flex' : 'none';
    $('paneCatalog').style.display = tab === 'catalog' ? 'flex' : 'none';
    $('paneBom').style.display = tab === 'bom' ? 'flex' : 'none';
  }

  function setActiveTool(tool) {
    STATE.activeTool = tool;
    document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === tool));
    if (tool !== 'select') window.selectElement(null);
    if (window.Editor2D) Editor2D.setTool(tool);
    if (tool === 'furniture') switchSideTab('catalog');
  }

  function setLanguage(lang) {
    STATE.lang = lang === 'fr' ? 'fr' : 'en';
    document.body.setAttribute('data-lang', STATE.lang);
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === STATE.lang));
    renderCatalogGrid($('catFilter').value);
    updateBOMAndRooms();
    if (STATE.selectedElement) window.updatePropertiesUI();
    if (window.Editor2D) Editor2D.needsRedraw = true;
  }

  // ============================================================================
  // PAYWALL & STUDIOS-PRO HOST BRIDGE
  // ============================================================================
  let isPremiumUser = false;
  let pendingExportFn = null;
  const broadcastCh = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('studios_pro_channel') : null;
  const FREE_KEY = 'sp_arch1_free_exports';

  function gatedExport(fn) {
    if (isPremiumUser) { fn(); return; }
    if (window.parent && window.parent !== window) {
      pendingExportFn = fn;
      window.parent.postMessage({ type: 'CHECK_EXPORT_LIMIT', studio: 'architect-pro-1' }, '*');
      setTimeout(() => {
        if (pendingExportFn === fn) {
          pendingExportFn = null;
          localQuotaCheck(fn);
        }
      }, 850);
    } else {
      localQuotaCheck(fn);
    }
  }

  function localQuotaCheck(fn) {
    let used = 0;
    try { used = parseInt(localStorage.getItem(FREE_KEY) || '0', 10) || 0; } catch (_) {}
    if (used < 5) {
      try { localStorage.setItem(FREE_KEY, String(used + 1)); } catch (_) {}
      fn();
    } else {
      $('exportModal').classList.remove('show');
      $('paymentModal').classList.add('show');
    }
  }

  function handleHostMsg(d) {
    if (!d || typeof d !== 'object') return;
    if (d.type === 'SET_LANG' && (d.lang === 'en' || d.lang === 'fr')) setLanguage(d.lang);
    else if (d.type === 'USER_TIER_STATUS' || d.type === 'USER_STATUS_RESPONSE' || d.type === 'USER_STATUS_CHANGED') {
      const p = d.payload || d;
      isPremiumUser = !!(p.isPremium || p.tier === 'pro' || p.tier === 'premium');
    } else if (d.type === 'EXPORT_ALLOWED') {
      if (d.payload && d.payload.isPremium) isPremiumUser = true;
      if (pendingExportFn) { const f = pendingExportFn; pendingExportFn = null; f(); }
    } else if (d.type === 'EXPORT_DENIED' || d.type === 'EXPORT_LIMIT_REACHED') {
      pendingExportFn = null;
      if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'SHOW_PAYWALL_MODAL' }, '*');
      else $('paymentModal').classList.add('show');
    }
  }

  window.addEventListener('message', e => { if (e.origin !== window.location.origin) return; handleHostMsg(e.data); });
  if (broadcastCh) {
    broadcastCh.onmessage = e => handleHostMsg(e.data);
    broadcastCh.postMessage({ type: 'GET_USER_STATUS' });
  }

  window.getAppState = () => ({
    studio: 'architect-pro-1',
    version: 2,
    unit: STATE.unit,
    activeFloor: STATE.activeFloor,
    globWallHeight: STATE.globWallHeight,
    globWallThick: STATE.globWallThick,
    elements: STATE.elements
  });
  window.getAppTags = () => ['architect-pro-1', 'floor-plan', '2d-cad', '3d-architecture', 'interior-design', 'dxf', 'bom', 'ar-maquette'];

  // ============================================================================
  // EVENT WIRING
  // ============================================================================
  function bindEvents() {
    $('back-btn').addEventListener('click', () => {
      if (broadcastCh) broadcastCh.postMessage({ type: 'CLOSE_STUDIO' });
      if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'CLOSE_STUDIO' }, '*');
      else window.history.back();
    });

    document.querySelectorAll('.lang-btn').forEach(b => b.addEventListener('click', () => setLanguage(b.dataset.lang)));
    document.querySelectorAll('.side-tab').forEach(b => b.addEventListener('click', () => switchSideTab(b.dataset.stab)));
    document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.addEventListener('click', () => setActiveTool(b.dataset.tool)));

    // Template Loader
    $('templateSelect').addEventListener('change', e => {
      STATE_HISTORY.saveState();
      STATE.elements = ArchCore.createTemplate(e.target.value, STATE.globWallHeight);
      STATE.activeFloor = 0;
      $('activeFloorSelect').value = '0';
      window.selectElement(null);
      window.triggerUpdate();
      Editor2D.fitToContent();
      if (window.Engine3D) {
        Engine3D.buildScene(STATE.elements);
        Engine3D.needsRebuild = false;
        Engine3D.setCameraPreset('iso');
      }
      window.showToast(`Loaded template: ${e.target.options[e.target.selectedIndex].text}`, `Modèle chargé : ${e.target.options[e.target.selectedIndex].text}`);
    });

    // Active Floor Selector
    $('activeFloorSelect').addEventListener('change', e => {
      STATE.activeFloor = parseInt(e.target.value, 10) || 0;
      window.selectElement(null);
      window.triggerUpdate();
      window.showToast(`Switched to Floor ${STATE.activeFloor}`, `Étage actif : ${STATE.activeFloor}`);
    });

    // Measurement Units (m / cm / in / ft — TRUE CONVERSION!)
    $('unitSelect').addEventListener('change', e => {
      STATE.unit = e.target.value;
      syncUnitLabels();
      if (STATE.selectedElement) window.updatePropertiesUI();
      window.triggerUpdate();
    });

    // FIXED: Live Default Wall Height & Wall Thickness!
    $('globWallHeight').addEventListener('change', e => {
      STATE.globWallHeight = Math.max(150, Math.min(600, ArchCore.unitToCm(e.target.value, STATE.unit)));
      window.showToast(`Default Wall Height: ${ArchCore.formatLength(STATE.globWallHeight, STATE.unit)}`, `Hauteur mur par défaut : ${ArchCore.formatLength(STATE.globWallHeight, STATE.unit)}`);
    });
    $('globWallThick').addEventListener('change', e => {
      STATE.globWallThick = Math.max(6, Math.min(80, ArchCore.unitToCm(e.target.value, STATE.unit)));
      window.showToast(`Default Wall Thickness: ${ArchCore.formatLength(STATE.globWallThick, STATE.unit)}`, `Épaisseur mur : ${ArchCore.formatLength(STATE.globWallThick, STATE.unit)}`);
    });

    // AI Architect v2 Generator
    const runAI = () => {
      const txt = $('aiPrompt').value.trim();
      if (!txt) return;
      STATE_HISTORY.saveState();
      const generated = ArchCore.generateFromPrompt(txt, { wallH: STATE.globWallHeight, activeFloor: STATE.activeFloor });
      STATE.elements = generated;
      window.selectElement(null);
      window.triggerUpdate();
      Editor2D.fitToContent();
      if (window.Engine3D) {
        Engine3D.buildScene(STATE.elements);
        Engine3D.needsRebuild = false;
        Engine3D.setCameraPreset('iso');
      }
      $('aiPrompt').value = '';
      window.showToast(`AI generated layout (${generated.length} elements)!`, `Plan IA généré (${generated.length} éléments) !`);
    };
    $('btnAIGenerate').addEventListener('click', runAI);
    $('aiPrompt').addEventListener('keydown', e => { if (e.key === 'Enter') runAI(); });

    // Restored Undo / Redo
    $('btnUndo').addEventListener('click', () => STATE_HISTORY.undo());
    $('btnRedo').addEventListener('click', () => STATE_HISTORY.redo());

    // Auto-Floor & Auto-Roof 1-Click Magic!
    $('btnAutoFloorRoof').addEventListener('click', () => {
      const rooms = ArchCore.detectRooms(STATE.elements, STATE.activeFloor);
      const walls = STATE.elements.filter(e => e.type === 'wall' && (e.floor || 0) === STATE.activeFloor);
      if (walls.length < 3) return window.showToast('Draw a closed room with walls first', 'Tracez d’abord une pièce fermée');
      STATE_HISTORY.saveState();
      // Remove existing floors/roof on active floor to avoid overlap
      STATE.elements = STATE.elements.filter(e => !((e.type === 'floor' || e.type === 'roof') && (e.floor || 0) === STATE.activeFloor));
      rooms.forEach((rm, idx) => {
        STATE.elements.push({
          id: `auto_fl_${Date.now()}_${idx}`,
          type: 'floor',
          polygon: rm.polygon.map(p => ({ x: p.x, y: p.y })),
          material: rm.labelEn === 'Bathroom' || rm.labelEn === 'Kitchen' ? 'tiles' : 'wood',
          color: rm.labelEn === 'Bathroom' ? '#cbd5e1' : '#c49a6c',
          floor: STATE.activeFloor,
          cost: Math.round(rm.areaSqM * ArchCore.RATES.floorSqM)
        });
      });
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      walls.forEach(w => {
        minX = Math.min(minX, w.x1, w.x2); minY = Math.min(minY, w.y1, w.y2);
        maxX = Math.max(maxX, w.x1, w.x2); maxY = Math.max(maxY, w.y1, w.y2);
      });
      const ov = 35;
      STATE.elements.push({
        id: 'auto_rf_' + Date.now(),
        type: 'roof',
        x: minX - ov, y: minY - ov,
        width: (maxX - minX) + ov * 2, height: (maxY - minY) + ov * 2,
        elevation: STATE.globWallHeight,
        modelVariant: 'hipped',
        material: 'tiles',
        color: '#334155',
        rotation: 0,
        floor: STATE.activeFloor,
        cost: Math.round(((maxX - minX) * (maxY - minY) / 10000) * ArchCore.RATES.roofSqM)
      });
      window.triggerUpdate();
      window.showToast(`Auto-generated ${rooms.length} room floors + hipped roof!`, `${rooms.length} sols + toit générés automatiquement !`);
    });

    // Properties inputs
    ['propWidth', 'propHeight', 'propElevation', 'propRotation', 'propCurvature', 'propColor', 'propCost'].forEach(id => {
      $(id).addEventListener('input', applyPropertyEdits);
    });
    ['propModel', 'propMaterial'].forEach(id => $(id).addEventListener('change', applyPropertyEdits));

    $('btnRotate45').addEventListener('click', () => {
      if (!STATE.selectedElement) return;
      STATE_HISTORY.saveState();
      STATE.selectedElement.rotation = ((STATE.selectedElement.rotation || 0) + 45) % 360;
      window.updatePropertiesUI();
      window.triggerUpdate();
    });

    $('btnDuplicate').addEventListener('click', () => {
      const el = STATE.selectedElement;
      if (!el || el.type === 'door' || el.type === 'window') return;
      STATE_HISTORY.saveState();
      const copy = JSON.parse(JSON.stringify(el));
      copy.id = 'dup_' + Date.now();
      if (copy.type === 'wall') { copy.x1 += 40; copy.y1 += 40; copy.x2 += 40; copy.y2 += 40; }
      else { copy.x = (copy.x || 0) + 40; copy.y = (copy.y || 0) + 40; }
      STATE.elements.push(copy);
      window.selectElement(copy);
      window.triggerUpdate();
    });

    $('btnDelete').addEventListener('click', () => {
      if (!STATE.selectedElement) return;
      STATE_HISTORY.saveState();
      STATE.elements = ArchCore.deleteElementCascade(STATE.elements, STATE.selectedElement.id);
      window.selectElement(null);
      window.triggerUpdate();
    });

    // Catalog filter & Custom GLB import
    $('catFilter').addEventListener('change', e => renderCatalogGrid(e.target.value));
    $('btnImportGLB').addEventListener('click', () => $('importGLBFile').click());
    $('importGLBFile').addEventListener('change', e => {
      const f = e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = ev => {
        STATE_HISTORY.saveState();
        const item = {
          id: 'glb_' + Date.now(), type: 'furniture', x: 0, y: 0,
          width: 120, length: 120, height: 120, elevation: 0, rotation: 0,
          modelVariant: 'custom_glb', gltfData: ev.target.result,
          color: '#ffffff', floor: STATE.activeFloor, cost: 350
        };
        STATE.elements.push(item);
        window.selectElement(item);
        window.triggerUpdate();
        window.showToast('Custom .GLB model imported!', 'Modèle .GLB importé !');
      };
      reader.readAsDataURL(f);
      e.target.value = '';
    });

    // 2D Blueprint Underlay with Opacity & Scale
    $('btnLoadBlueprint').addEventListener('click', () => $('blueprintFile').click());
    $('blueprintFile').addEventListener('change', e => {
      const f = e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
          STATE.blueprintImage = img;
          STATE.blueprintVisible = true;
          $('blueprintControls').style.display = 'flex';
          window.triggerUpdate();
          window.showToast('2D Blueprint image loaded!', 'Image de plan 2D chargée !');
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(f);
      e.target.value = '';
    });
    $('rngBpOpacity').addEventListener('input', e => {
      STATE.blueprintOpacity = parseInt(e.target.value, 10) / 100;
      $('valBpOp').textContent = e.target.value + '%';
      window.triggerUpdate();
    });
    $('rngBpScale').addEventListener('input', e => {
      STATE.blueprintScale = parseFloat(e.target.value);
      $('valBpSc').textContent = STATE.blueprintScale.toFixed(1) + '×';
      window.triggerUpdate();
    });
    $('btnClearBlueprint').addEventListener('click', () => {
      STATE.blueprintImage = null;
      $('blueprintControls').style.display = 'none';
      window.triggerUpdate();
    });

    // 2D Pane Controls
    $('btnToggleSnap').addEventListener('click', e => {
      Editor2D.snapEnabled = !Editor2D.snapEnabled;
      e.currentTarget.classList.toggle('active', Editor2D.snapEnabled);
    });
    $('btnToggleRoof2D').addEventListener('click', e => {
      Editor2D.showRoofOverlay = !Editor2D.showRoofOverlay;
      e.currentTarget.classList.toggle('active', Editor2D.showRoofOverlay);
      Editor2D.needsRedraw = true;
    });
    $('btnZoomIn2D').addEventListener('click', () => { Editor2D.camera.zoom = Math.min(4, Editor2D.camera.zoom * 1.22); Editor2D.needsRedraw = true; });
    $('btnZoomOut2D').addEventListener('click', () => { Editor2D.camera.zoom = Math.max(0.08, Editor2D.camera.zoom / 1.22); Editor2D.needsRedraw = true; });
    $('btnReset2D').addEventListener('click', () => Editor2D.fitToContent());

    // 3D Pane Controls (FIXED Top / Iso + Dollhouse / Full / X-Ray + Sun Time + Walk!)
    $('timeSlider').addEventListener('input', e => {
      const t = parseFloat(e.target.value);
      const hh = Math.floor(t), mm = Math.round((t - hh) * 60);
      $('timeLabel').textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      if (window.Engine3D) Engine3D.updateSunPath(t);
    });
    document.querySelectorAll('[data-v3d]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-v3d]').forEach(b => b.classList.toggle('active', b === btn));
        if (window.Engine3D) Engine3D.setViewMode3D(btn.dataset.v3d);
      });
    });
    $('btnWalk').addEventListener('click', () => window.Engine3D && Engine3D.toggleWalkthrough());
    $('btnCamTop').addEventListener('click', () => window.Engine3D && Engine3D.setCameraPreset('top'));
    $('btnCamIso').addEventListener('click', () => window.Engine3D && Engine3D.setCameraPreset('iso'));

    // Quick Save / Load Project (.sparch / .json — RESTORED!)
    const loadProjectHandler = (file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const parsed = JSON.parse(String(ev.target.result || ''));
          const els = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.elements) ? parsed.elements : null);
          if (!els) throw new Error('Invalid');
          STATE_HISTORY.saveState();
          STATE.elements = els;
          if (parsed.unit && ArchCore.UNIT_FACTORS[parsed.unit]) {
            STATE.unit = parsed.unit; $('unitSelect').value = parsed.unit; syncUnitLabels();
          }
          if (parsed.globWallHeight) STATE.globWallHeight = parsed.globWallHeight;
          if (parsed.globWallThick) STATE.globWallThick = parsed.globWallThick;
          window.selectElement(null);
          window.triggerUpdate();
          Editor2D.fitToContent();
          window.showToast(`Loaded project (${els.length} elements)!`, `Projet chargé (${els.length} éléments) !`);
        } catch (err) {
          window.showToast('Invalid project JSON/.sparch file', 'Fichier projet invalide');
        }
      };
      reader.readAsText(file);
    };
    $('btnQuickSave').addEventListener('click', () => ArchExporter.exportProjectJSON());
    $('btnQuickLoad').addEventListener('click', () => $('loadProjectFile').click());
    $('loadProjectFile').addEventListener('change', e => { loadProjectHandler(e.target.files[0]); e.target.value = ''; });

    // Modals & Exports
    $('btnExport').addEventListener('click', () => $('exportModal').classList.add('show'));
    $('btnShortcuts').addEventListener('click', () => $('shortcutsModal').classList.add('show'));
    $('btnQuickAR').addEventListener('click', () => ArchExporter.previewAR('1to50'));
    document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => $(b.dataset.close).classList.remove('show')));

    $('doExportGLB').addEventListener('click', () => gatedExport(() => ArchExporter.exportGLB()));
    $('doExportSTL').addEventListener('click', () => gatedExport(() => ArchExporter.exportSTL('1to100')));
    $('doExportOBJ').addEventListener('click', () => gatedExport(() => ArchExporter.exportOBJ()));
    $('doExportHTML').addEventListener('click', () => gatedExport(() => ArchExporter.exportInteractiveHTML()));
    $('doExportDXF').addEventListener('click', () => gatedExport(() => ArchExporter.exportDXF()));
    $('doExportSVG').addEventListener('click', () => gatedExport(() => ArchExporter.exportSVG()));
    $('doExportPDF').addEventListener('click', () => gatedExport(() => ArchExporter.exportPDF()));

    $('doPreviewARMaq').addEventListener('click', () => { $('exportModal').classList.remove('show'); ArchExporter.previewAR('1to50'); });
    $('doPreviewARReal').addEventListener('click', () => { $('exportModal').classList.remove('show'); ArchExporter.previewAR('1to1'); });
    $('doExportHR').addEventListener('click', () => { $('exportModal').classList.remove('show'); ArchExporter.exportHighResPNG(); });
    $('doExportVideo').addEventListener('click', () => { $('exportModal').classList.remove('show'); ArchExporter.exportVideoTour(); });
    $('doExportJSON').addEventListener('click', () => ArchExporter.exportProjectJSON());
    $('doLoadJSON').addEventListener('click', () => { $('exportModal').classList.remove('show'); $('loadProjectFile').click(); });

    $('btnUpgradePro').addEventListener('click', () => {
      $('paymentModal').classList.remove('show');
      if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'SHOW_PAYWALL_MODAL' }, '*');
      if (broadcastCh) broadcastCh.postMessage({ type: 'START_STRIPE_PAYMENT', payload: { type: 'premium', ref: 'arp1' } });
    });

    // Complete Keyboard Shortcuts (ALL TOOLS + Ctrl+Z/Y + Del!)
    window.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
      if (window.Engine3D && Engine3D.isWalkthrough) return;
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); STATE_HISTORY.undo(); return; }
      if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); STATE_HISTORY.redo(); return; }
      const map = { v: 'select', w: 'wall', d: 'door', n: 'window', f: 'floor', r: 'roof', m: 'furniture', s: 'stairs', t: 'terrain', c: 'camera', l: 'light', q: 'measure' };
      if (map[k]) setActiveTool(map[k]);
      else if (k === 'delete' || k === 'backspace') $('btnDelete').click();
    });

    // Resizable Split View
    let draggingSplit = false;
    $('vSplitter').addEventListener('mousedown', () => { draggingSplit = true; $('vSplitter').classList.add('dragging'); });
    window.addEventListener('mousemove', e => {
      if (!draggingSplit) return;
      const rect = $('splitView').getBoundingClientRect();
      const pct = Math.max(22, Math.min(78, ((e.clientX - rect.left) / rect.width) * 100));
      $('pane2D').style.flex = `0 0 ${pct}%`;
      $('pane3D').style.flex = `0 0 ${100 - pct}%`;
      if (window.Editor2D) Editor2D.resize();
      if (window.Engine3D) Engine3D.resize();
    });
    window.addEventListener('mouseup', () => {
      if (draggingSplit) { draggingSplit = false; $('vSplitter').classList.remove('dragging'); }
    });
    window.addEventListener('resize', () => {
      if (window.Editor2D) Editor2D.resize();
      if (window.Engine3D) Engine3D.resize();
    });
  }

  // ============================================================================
  // BOOTSTRAP (MODULE-READY HANDSHAKE FOR THREE.JS r165)
  // ============================================================================
  function boot() {
    if (!window.Engine3D) { setTimeout(boot, 25); return; }
    Editor2D.init($('canvas2D'));
    Engine3D.init($('canvas3D'));
    bindEvents();
    syncUnitLabels();
    renderCatalogGrid('all');

    // Check optional Studios-Pro remix state
    let loadedRemix = false;
    try {
      const raw = localStorage.getItem('sp_remix_state');
      if (raw) {
        const rx = JSON.parse(raw);
        if (rx && rx.studio === 'architect-pro-1' && Array.isArray(rx.elements)) {
          STATE.elements = rx.elements;
          loadedRemix = true;
          localStorage.removeItem('sp_remix_state');
        }
      }
    } catch (_) {}

    if (!loadedRemix) {
      // Load Modern 10x8m Furnished Villa immediately (zero empty black screen!)
      STATE.elements = ArchCore.createTemplate('villa', STATE.globWallHeight);
    }

    window.triggerUpdate();
    Editor2D.fitToContent();
    Engine3D.buildScene(STATE.elements);
    Engine3D.needsRebuild = false;
    Engine3D.setCameraPreset('iso');

    // Synchronized render/rebuild loop
    (function loop() {
      requestAnimationFrame(loop);
      if (Editor2D.needsRedraw) { Editor2D.draw(); Editor2D.needsRedraw = false; }
      if (Engine3D.needsRebuild) { Engine3D.buildScene(STATE.elements); Engine3D.needsRebuild = false; }
    })();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
