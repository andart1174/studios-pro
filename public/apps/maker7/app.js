/**
 * Maker Studio 7 — 17-in-1 Schema-Driven Application Controller, Undo/Redo & Bridges
 */
(function () {
  'use strict';

  const C = window.MakerCore;
  const CAD = window.MakerCadEngine;
  const ART = window.MakerArtEngine;
  if (!C || !CAD || !ART) {
    console.error('[Maker7] Engines missing');
    return;
  }
  const $ = (id) => document.getElementById(id);

  /* =========================================================================
     1. CATALOG OF ALL 17 STUDIOS (4 CLEAR WORKSHOPS!)
  ========================================================================= */
  const STUDIOS = [
    // Workshop: Functional 3D CAD (6)
    { id: 'box',      ws: 'cad',   ico: '📦', en: 'Finger-Joint Laser Box',  fr: 'Boîte Laser à Dents',       tagEn: 'Kerf · Lid · Dividers · Explode', tagFr: 'Kerf · Couvercle · Éclaté' },
    { id: 'gear',     ws: 'cad',   ico: '⚙️', en: 'Involute Spur Gear',      fr: 'Engrenage Évolvente',       tagEn: 'Metric m · Twin Meshing Sim',     tagFr: 'Module m · Double Engrenage' },
    { id: 'stand',    ws: 'cad',   ico: '📱', en: 'Ergonomic Phone Stand',   fr: 'Support Téléphone USB',     tagEn: 'Anti-Tip · USB-C Cable Slot',     tagFr: 'Anti-Bascule · Passage Câble' },
    { id: 'cookie',   ws: 'cad',   ico: '🍪', en: 'Cookie Cutter Studio',    fr: 'Emporte-Pièce Pro',         tagEn: 'Constant Blade · Emboss Stamp',   tagFr: 'Lame Constante · Tampon' },
    { id: 'qrcode',   ws: 'cad',   ico: '📲', en: '3D QR & Wi-Fi Plaque',    fr: 'Plaque QR & Wi-Fi 3D',      tagEn: 'Wi-Fi Wizard · Filament Swap',    tagFr: 'Assistant Wi-Fi · Bicolore' },
    { id: 'keychain', ws: 'cad',   ico: '🏷️', en: 'Unicode Keychain Tag',    fr: 'Porte-Clés Unicode',        tagEn: 'Raised / Carved Inlay · Ring',    tagFr: 'Relief / Gravé · Anneau' },

    // Workshop: Photo, Relief & PBR (5)
    { id: 'texture',  ws: 'photo', ico: '🎨', en: 'PBR Texture Forge',       fr: 'Forge Textures PBR',        tagEn: '8 Procedural + Photo · 4 Maps',   tagFr: '8 Procéduraux + Photo · 4 Cartes' },
    { id: 'litho',    ws: 'photo', ico: '🖼️', en: 'Solid Lithophane',        fr: 'Lithophanie Solide',        tagEn: 'Watertight · Flat / Curved',      tagFr: 'Étanche · Plate / Courbée' },
    { id: 'globe',    ws: 'photo', ico: '🌐', en: 'Hollow Globe Lamp',       fr: 'Lampe Globe Creux',         tagEn: 'Hollow Cavity · LED Socket',      tagFr: 'Cavité Creuse · Douille LED' },
    { id: 'topo',     ws: 'photo', ico: '🏔️', en: 'Stepped Topography',      fr: 'Topographie en Marches',    tagEn: 'Solid Terraces · Laser Slices',   tagFr: 'Terrasses 3D · Couches Laser' },
    { id: 'halftone', ws: 'photo', ico: '🔆', en: 'Halftone Dot Plaque',     fr: 'Plaque Trame de Points',    tagEn: 'Solid Backing · Laser Dots',      tagFr: 'Plaque Solide · Points Laser' },

    // Workshop: Generative Art & Games (4)
    { id: 'vase',     ws: 'art',   ico: '🏺', en: 'Pottery & Spiral Vase',   fr: 'Vase Spirale & Poterie',    tagEn: 'Hollow Cavity · Fluted Twist',    tagFr: 'Paroi Étanche · Torsade' },
    { id: 'mandala',  ws: 'art',   ico: '🌀', en: '3D Shadowbox Mandala',    fr: 'Mandala 3D Multistrates',   tagEn: 'Solid Tiers · Full Laser SVG',    tagFr: 'Couches 3D · SVG Laser Complet' },
    { id: 'voronoi',  ws: 'art',   ico: '🧬', en: 'True Voronoi Lattice',    fr: 'Treillis Voronoi Réel',     tagEn: 'Clipped Cells · Solid Frame',     tagFr: 'Cellules Réelles · Cadre Solide' },
    { id: 'maze',     ws: 'art',   ico: '🧩', en: 'Solvable 3D Labyrinth',   fr: 'Labyrinthe 3D Résolvable',  tagEn: 'DFS Perfect Maze · BFS Path',     tagFr: 'DFS Garanti · Solution BFS' },

    // Workshop: Typography & CNC (2)
    { id: 'text',     ws: 'cnc',   ico: '🔤', en: 'Unicode 3D Typography',   fr: 'Texte 3D Unicode',          tagEn: 'Diacritics · 2 Lines · Stand',    tagFr: 'Accents · 2 Lignes · Socle' },
    { id: 'gcode',    ws: 'cnc',   ico: '⚡', en: 'Real G-Code Simulator',   fr: 'Simulateur G-Code Réel',    tagEn: '.gcode Parser · Live Nozzle',     tagFr: 'Parseur .gcode · Buse 3D' }
  ];

  const DEFAULT_PARAMS = {
    texture:  { preset: 'brick', previewShape: 'sphere', repeat: 2, roughness: 0.55, normalDepth: 1.6, color: '#ffffff' },
    box:      { width: 110, height: 60, depth: 85, thickness: 3.0, tabWidth: 12, kerf: 0.12, lidType: 'liftoff', dividersX: 1, dividersY: 0, explodePct: 18, color: '#d97706' },
    gear:     { teeth: 20, module: 2.5, thickness: 10, boreType: 'keyway', boreDiam: 10, spokeCutouts: true, showTwin: true, twinTeeth: 14, color: '#64748b' },
    stand:    { angle: 62, deviceThick: 13, width: 68, cableSlot: true, color: '#3b82f6' },
    cookie:   { shape: 'heart', sizeMm: 78, bladeDepth: 16, bladeThick: 1.2, gripWidth: 5.5, embossStamp: true, color: '#ec4899' },
    qrcode:   { mode: 'wifi', text: 'https://studios-pro.com', wifiSsid: 'StudiosPro_Guest', wifiPass: 'Welcome2026', wifiSec: 'WPA', sizeMm: 90, baseThick: 2.4, codeHeight: 1.2, roundedCorners: true, keychainHole: true, baseColor: '#f8fafc', dotColor: '#0f172a' },
    keychain: { text: 'Étoile ★', shape: 'pill', fontStyle: 'Inter, system-ui, sans-serif', thickness: 3.4, fontSize: 14, textHeight: 1.6, recessed: false, padding: 7, ringHole: 3.0, baseColor: '#e2e8f0', textColor: '#ef4444' },
    litho:    { widthMm: 120, maxThick: 3.6, baseLayer: 0.8, contrast: 1.15, invert: false, curved: true, frameMm: 4.0, resolution: 64, color: '#f8fafc' },
    globe:    { diameterMm: 110, wallThick: 2.2, reliefDepth: 2.6, socketHoleMm: 34, invert: false, resolution: 52, color: '#fefce8' },
    topo:     { widthMm: 140, maxHeight: 28, baseMm: 3.0, steps: 9, invert: false, resolution: 64, color: '#8b5cf6' },
    halftone: { widthMm: 140, spacingMm: 7.5, maxDotMm: 6.4, dotHeight: 3.8, baseThick: 2.4, invert: false, dotShape: 'circle', color: '#38bdf8', baseColor: '#0f172a' },
    vase:     { heightMm: 125, baseR: 28, bellyR: 46, neckR: 22, rimR: 27, wallThick: 3.2, twistDeg: 95, flutes: 16, fluteDepth: 2.4, sides: 64, color: '#14b8a6' },
    mandala:  { symmetry: 10, layers: 4, radiusMm: 72, layerThick: 2.0, strokeW: 2.5, shapes: ['star', 'flower', 'circle', 'hexa'], color: '#c026d3' },
    voronoi:  { widthMm: 130, heightMm: 100, cellCount: 24, wallThick: 3.2, depthMm: 6.0, frameMm: 5.0, seed: 42, jitter: 0.72, color: '#e2e8f0' },
    maze:     { shape: 'square', gridSize: 11, sizeMm: 110, wallHeight: 10, wallThick: 2.0, baseThick: 2.2, seed: 77, showSolution: true, color: '#f59e0b', floorColor: '#1e293b' },
    text:     { text: 'STUDIO 7', line2: 'CRÉATION ★', fontStyle: 'Inter, system-ui, sans-serif', sizeMm: 24, depthMm: 12, standingBase: true, color: '#38bdf8' },
    gcode:    { sample: 'vase', uploadedText: '', layerPct: 100, speed: 1.5, playing: true, color: '#10b981' }
  };

  /* =========================================================================
     2. STATE, LANGUAGE, PHOTO/GCODE BUFFERS & UNDO/REDO
  ========================================================================= */
  function detectLang() {
    const p = new URLSearchParams(window.location.search).get('lang');
    if (p === 'fr' || p === 'en') return p;
    try {
      const s = localStorage.getItem('sp_lang');
      if (s === 'fr' || s === 'en') return s;
    } catch (_) {}
    return (navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';
  }

  let lang = detectLang();
  let activeWorkshop = 'all';
  let activeStudio = 'texture';
  let params = JSON.parse(JSON.stringify(DEFAULT_PARAMS));
  let uploadedImageBuf = null; // { width, height, data, name }
  let viewport = null;
  let latestBuild = null;
  let rebuildTimer = null;

  // Undo / Redo (25 steps)
  const history = [];
  let histIdx = -1;
  function pushHistory() {
    const snap = JSON.stringify({ activeStudio, params });
    if (histIdx >= 0 && history[histIdx] === snap) return;
    history.splice(histIdx + 1);
    history.push(snap);
    if (history.length > 25) history.shift();
    histIdx = history.length - 1;
    updateUndoUI();
  }
  function updateUndoUI() {
    $('btnUndo').disabled = histIdx <= 0;
    $('btnRedo').disabled = histIdx >= history.length - 1;
  }
  function undo() {
    if (histIdx <= 0) return;
    histIdx--;
    const d = JSON.parse(history[histIdx]);
    activeStudio = d.activeStudio; params = d.params;
    renderStudioList(); renderControls(); scheduleRebuild(true); updateUndoUI();
  }
  function redo() {
    if (histIdx >= history.length - 1) return;
    histIdx++;
    const d = JSON.parse(history[histIdx]);
    activeStudio = d.activeStudio; params = d.params;
    renderStudioList(); renderControls(); scheduleRebuild(true); updateUndoUI();
  }

  function t(en, fr) { return lang === 'fr' ? fr : en; }
  function toast(msg) {
    const c = $('toastContainer');
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.25s'; setTimeout(() => el.remove(), 260); }, 2600);
  }

  /* =========================================================================
     3. PAYWALL BRIDGE (UNIFIED STUDIOS-PRO)
  ========================================================================= */
  let credits = { isPro: false, remaining: 5 };
  function updateCreditsBadge() {
    const b = $('creditsBadge');
    if (credits.isPro) { b.textContent = '★ PRO'; b.className = 'pill ok'; }
    else { b.textContent = t(`${credits.remaining} Free`, `${credits.remaining} Gratuits`); b.className = credits.remaining > 0 ? 'pill' : 'pill warn'; }
  }
  function checkExportGate() {
    return new Promise((resolve) => {
      if (window.parent && window.parent !== window) {
        let done = false;
        const onMsg = (ev) => {
          if (ev.data && ev.data.type === 'EXPORT_LIMIT_RESULT') {
            done = true; window.removeEventListener('message', onMsg);
            const d = ev.data;
            credits.isPro = !!d.isPro;
            credits.remaining = typeof d.remaining === 'number' ? d.remaining : (d.allowed ? 1 : 0);
            updateCreditsBadge();
            if (d.allowed) resolve({ allowed: true, isPro: !!d.isPro });
            else {
              window.parent.postMessage({ type: d.reason === 'not_authenticated' ? 'SHOW_AUTH_MODAL' : 'SHOW_PAYWALL_MODAL' }, '*');
              resolve({ allowed: false, isPro: false });
            }
          }
        };
        window.addEventListener('message', onMsg);
        window.parent.postMessage({ type: 'CHECK_EXPORT_LIMIT', studio: 'maker7' }, '*');
        setTimeout(() => { if (!done) { window.removeEventListener('message', onMsg); resolve({ allowed: true, isPro: credits.isPro }); } }, 1200);
      } else {
        let used = 0;
        try { used = parseInt(localStorage.getItem('sp_maker7_exports') || '0', 10) || 0; } catch (_) {}
        const rem = Math.max(0, 5 - used);
        credits.remaining = rem; updateCreditsBadge();
        if (rem > 0) resolve({ allowed: true, isPro: false });
        else { $('paymentModal').classList.add('open'); resolve({ allowed: false, isPro: false }); }
      }
    });
  }
  function markExportUsed() {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'INCREMENT_EXPORT_COUNT', studio: 'maker7' }, '*');
    } else {
      try {
        const used = (parseInt(localStorage.getItem('sp_maker7_exports') || '0', 10) || 0) + 1;
        localStorage.setItem('sp_maker7_exports', String(used));
        credits.remaining = Math.max(0, 5 - used); updateCreditsBadge();
      } catch (_) {}
    }
  }

  /* =========================================================================
     4. RENDER 4-WORKSHOP STUDIO LIST (LEFT PANEL)
  ========================================================================= */
  function renderStudioList() {
    const q = ($('studioSearch').value || '').toLowerCase().trim();
    const list = $('studioList');
    list.innerHTML = '';
    STUDIOS.forEach((st) => {
      if (activeWorkshop !== 'all' && st.ws !== activeWorkshop) return;
      const hay = `${st.id} ${st.en} ${st.fr} ${st.tagEn} ${st.tagFr}`.toLowerCase();
      if (q && !hay.includes(q)) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'studio-card' + (st.id === activeStudio ? ' active' : '');
      btn.dataset.studio = st.id;
      btn.innerHTML = `
        <span class="studio-ico">${st.ico}</span>
        <span class="studio-meta">
          <span class="studio-name">${t(st.en, st.fr)}</span>
          <span class="studio-tag">${t(st.tagEn, st.tagFr)}</span>
        </span>`;
      btn.addEventListener('click', () => switchStudio(st.id));
      list.appendChild(btn);
    });
  }

  function switchStudio(id) {
    if (!DEFAULT_PARAMS[id]) return;
    activeStudio = id;
    pushHistory();
    renderStudioList();
    renderControls();
    rebuildNow(true);
  }

  /* =========================================================================
     5. DYNAMIC PER-STUDIO CONTROL BUILDERS (ALL 17 STUDIOS!)
  ========================================================================= */
  function mkCard(titleEn, titleFr) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<div class="card-title"><span>${t(titleEn, titleFr)}</span></div>`;
    return card;
  }

  function addSlider(card, key, lblEn, lblFr, min, max, step, unit) {
    const p = params[activeStudio];
    const div = document.createElement('div');
    div.className = 'field';
    const valSpan = document.createElement('span');
    valSpan.className = 'field-val';
    valSpan.textContent = p[key] + (unit || '');
    const row = document.createElement('div');
    row.className = 'field-row';
    row.innerHTML = `<span>${t(lblEn, lblFr)}</span>`;
    row.appendChild(valSpan);
    const inp = document.createElement('input');
    inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step; inp.value = p[key];
    inp.addEventListener('input', () => {
      p[key] = parseFloat(inp.value);
      valSpan.textContent = p[key] + (unit || '');
      scheduleRebuild(false);
    });
    inp.addEventListener('change', pushHistory);
    div.appendChild(row); div.appendChild(inp); card.appendChild(div);
  }

  function addSelect(card, key, lblEn, lblFr, options, onAfter) {
    const p = params[activeStudio];
    const div = document.createElement('div');
    div.className = 'field';
    div.innerHTML = `<div class="field-row"><span>${t(lblEn, lblFr)}</span></div>`;
    const sel = document.createElement('select');
    options.forEach((o) => {
      const opt = document.createElement('option');
      opt.value = o.v; opt.textContent = t(o.en, o.fr || o.en);
      sel.appendChild(opt);
    });
    sel.value = p[key];
    sel.addEventListener('change', () => {
      p[key] = sel.value;
      pushHistory();
      if (onAfter) onAfter();
      scheduleRebuild(false);
    });
    div.appendChild(sel); card.appendChild(div);
  }

  function addText(card, key, lblEn, lblFr, placeholder) {
    const p = params[activeStudio];
    const div = document.createElement('div');
    div.className = 'field';
    div.innerHTML = `<div class="field-row"><span>${t(lblEn, lblFr)}</span></div>`;
    const inp = document.createElement('input');
    inp.type = 'text'; inp.value = p[key] || ''; inp.placeholder = placeholder || '';
    inp.addEventListener('input', () => { p[key] = inp.value; scheduleRebuild(false); });
    inp.addEventListener('change', pushHistory);
    div.appendChild(inp); card.appendChild(div);
  }

  function addColor(card, key, lblEn, lblFr) {
    const p = params[activeStudio];
    const div = document.createElement('div');
    div.className = 'field';
    div.innerHTML = `<div class="field-row"><span>${t(lblEn, lblFr)}</span></div>`;
    const inp = document.createElement('input');
    inp.type = 'color'; inp.value = p[key] || '#3b82f6';
    inp.addEventListener('input', () => { p[key] = inp.value; scheduleRebuild(false); });
    inp.addEventListener('change', pushHistory);
    div.appendChild(inp); card.appendChild(div);
  }

  function addToggle(card, key, lblEn, lblFr, onAfter) {
    const p = params[activeStudio];
    const lbl = document.createElement('label');
    lbl.className = 'toggle-row';
    lbl.innerHTML = `<span>${t(lblEn, lblFr)}</span>`;
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = !!p[key];
    cb.addEventListener('change', () => {
      p[key] = cb.checked; pushHistory();
      if (onAfter) onAfter();
      scheduleRebuild(false);
    });
    lbl.appendChild(cb); card.appendChild(lbl);
  }

  function addPhotoDropzone(card, noteEn, noteFr) {
    const dz = document.createElement('div');
    dz.className = 'dropzone';
    const loadedName = uploadedImageBuf ? `✓ ${uploadedImageBuf.name}` : t('Click or Drop Photo (JPG/PNG)', 'Cliquez ou Déposez une Photo');
    dz.innerHTML = `<div style="font-size:20px;margin-bottom:4px">📷</div><strong>${loadedName}</strong><div style="color:var(--muted);font-size:10.5px;margin-top:3px">${t(noteEn, noteFr)}</div>`;
    dz.addEventListener('click', () => $('photoUploadInput').click());
    card.appendChild(dz);
  }

  function renderControls() {
    const box = $('dynamicControls');
    box.innerHTML = '';
    const s = params[activeStudio];
    const stInfo = STUDIOS.find((x) => x.id === activeStudio);
    $('activeStudioTitle').textContent = (stInfo ? `${stInfo.ico} ${t(stInfo.en, stInfo.fr)}` : activeStudio).toUpperCase();

    if (activeStudio === 'texture') {
      const c = mkCard('PBR Texture Forge (4 Maps)', 'Forge Textures PBR (4 Cartes)');
      addPhotoDropzone(c, 'Upload texture photo OR choose a procedural material below', 'Importez une photo OU choisissez un matériau procédural');
      const opts = ART.PBR_PRESETS.map((pr) => ({ v: pr.id, en: pr.en, fr: pr.fr }));
      if (uploadedImageBuf) opts.unshift({ v: 'photo', en: '📷 Uploaded Photo Maps', fr: '📷 Cartes Photo Importée' });
      addSelect(c, 'preset', 'Material Generator', 'Générateur Matériau', opts);
      addSelect(c, 'previewShape', 'Preview Geometry', 'Forme Aperçu 3D', [
        { v: 'sphere', en: 'Sphere', fr: 'Sphère' }, { v: 'cube', en: 'Cube', fr: 'Cube' },
        { v: 'cylinder', en: 'Cylinder', fr: 'Cylindre' }, { v: 'plane', en: 'Flat Tile', fr: 'Dalle Plate' }
      ]);
      addSlider(c, 'repeat', 'UV Tiling Repeat', 'Répétition UV', 1, 6, 1, '×');
      addSlider(c, 'roughness', 'Roughness', 'Rugosité', 0.05, 1.0, 0.05, '');
      addSlider(c, 'normalDepth', 'Sobel Normal Strength', 'Force Normale Sobel', 0, 3.5, 0.1, '');
      addColor(c, 'color', 'Albedo Tint', 'Teinte Albédo');
      // Live 4-map PBR thumbnails container
      const thumbWrap = document.createElement('div');
      thumbWrap.id = 'pbrThumbWrap';
      thumbWrap.className = 'pbr-thumbs';
      c.appendChild(thumbWrap);
      const dlBtn = document.createElement('button');
      dlBtn.type = 'button'; dlBtn.className = 'btn-full';
      dlBtn.innerHTML = `🖼️ ${t('Download 4× PBR PNG Pack', 'Télécharger Pack 4× PNG PBR')}`;
      dlBtn.addEventListener('click', doDownloadPBRPack);
      c.appendChild(dlBtn);
      box.appendChild(c);
    } else if (activeStudio === 'box') {
      const c = mkCard('Finger-Joint Laser Box', 'Boîte Laser à Dents');
      addSlider(c, 'width', 'Outer Width (X)', 'Largeur Ext. (X)', 40, 260, 2, ' mm');
      addSlider(c, 'height', 'Outer Height (Y)', 'Hauteur Ext. (Y)', 30, 180, 2, ' mm');
      addSlider(c, 'depth', 'Outer Depth (Z)', 'Profondeur Ext. (Z)', 40, 260, 2, ' mm');
      addSlider(c, 'thickness', 'Sheet Thickness', 'Épaisseur Plaque', 1.5, 8.0, 0.5, ' mm');
      addSlider(c, 'tabWidth', 'Finger Tab Width', 'Largeur Dents', 6, 26, 1, ' mm');
      addSlider(c, 'kerf', 'Laser Kerf Comp.', 'Compensation Kerf', 0, 0.30, 0.02, ' mm');
      addSelect(c, 'lidType', 'Lid Style', 'Type Couvercle', [
        { v: 'liftoff', en: 'Finger-Joint Lift-Off Lid', fr: 'Couvercle à Dents Amovible' },
        { v: 'sliding', en: 'Sliding Lid + Thumb Pull', fr: 'Couvercle Coulissant' },
        { v: 'open', en: 'Open Top Tray', fr: 'Bac Ouvert Sans Couvercle' }
      ]);
      addSlider(c, 'dividersX', 'Dividers (X)', 'Cloisons (X)', 0, 3, 1, '');
      addSlider(c, 'dividersY', 'Dividers (Y)', 'Cloisons (Y)', 0, 3, 1, '');
      addSlider(c, 'explodePct', '3D Exploded View', 'Vue Éclatée 3D', 0, 100, 2, '%');
      addColor(c, 'color', 'Wood / Acrylic Tint', 'Couleur Bois / Acrylique');
      box.appendChild(c);
    } else if (activeStudio === 'gear') {
      const c = mkCard('Metric Involute Spur Gear', 'Engrenage Évolvente Métrique');
      addSlider(c, 'teeth', 'Teeth Count (Z1)', 'Nombre de Dents (Z1)', 8, 60, 1, '');
      addSlider(c, 'module', 'Metric Module (m)', 'Module Métrique (m)', 1.0, 5.0, 0.25, ' mm');
      addSlider(c, 'thickness', 'Gear Thickness', 'Épaisseur', 3, 36, 1, ' mm');
      addSelect(c, 'boreType', 'Center Shaft Bore', 'Alésage Central', [
        { v: 'round', en: 'Round Bore', fr: 'Alésage Rond' },
        { v: 'keyway', en: 'Machinist Keyway', fr: 'Rainure de Clavette' },
        { v: 'dshaft', en: 'Motor D-Shaft', fr: 'Arbre Moteur en D' },
        { v: 'hex', en: 'Hex Shaft / Nut', fr: 'Hexagonal' }
      ]);
      addSlider(c, 'boreDiam', 'Bore Diameter', 'Diamètre Alésage', 0, 40, 1, ' mm');
      addToggle(c, 'spokeCutouts', 'Weight-Reduction Spokes', 'Évidements d’Allègement');
      addToggle(c, 'showTwin', 'Live Twin Meshing Gear', 'Simuler 2ᵉ Roue Engrenée', renderControls);
      if (s.showTwin) addSlider(c, 'twinTeeth', 'Twin Gear Teeth (Z2)', 'Dents 2ᵉ Roue (Z2)', 8, 48, 1, '');
      addColor(c, 'color', 'Material Color', 'Couleur Matériau');
      const info = document.createElement('div'); info.id = 'studioInfoBox'; info.className = 'info-box';
      c.appendChild(info);
      box.appendChild(c);
    } else if (activeStudio === 'stand') {
      const c = mkCard('Ergonomic Phone Stand', 'Support Téléphone Anti-Bascule');
      addSlider(c, 'angle', 'Viewing Angle', 'Angle de Vue', 45, 75, 1, '°');
      addSlider(c, 'deviceThick', 'Phone + Case Depth', 'Épaisseur Appareil', 8, 22, 1, ' mm');
      addSlider(c, 'width', 'Stand Width', 'Largeur Support', 44, 110, 2, ' mm');
      addToggle(c, 'cableSlot', 'USB-C Charging Cable Slot', 'Passage Câble USB-C');
      addColor(c, 'color', 'Filament Color', 'Couleur Filament');
      box.appendChild(c);
    } else if (activeStudio === 'cookie') {
      const c = mkCard('Constant-Offset Cookie Cutter', 'Emporte-Pièce Lame Constante');
      addSelect(c, 'shape', 'Cutter Silhouette', 'Silhouette', [
        { v: 'heart', en: 'Heart', fr: 'Cœur' }, { v: 'star', en: '5-Point Star', fr: 'Étoile' },
        { v: 'flower', en: '6-Petal Flower', fr: 'Fleur' }, { v: 'cloud', en: 'Cloud', fr: 'Nuage' },
        { v: 'drop', en: 'Teardrop', fr: 'Goutte' }, { v: 'circle', en: 'Circle', fr: 'Cercle' },
        { v: 'square', en: 'Square', fr: 'Carré' }, { v: 'hex', en: 'Hexagon', fr: 'Hexagone' },
        { v: 'pent', en: 'Pentagon', fr: 'Pentagone' }, { v: 'tri', en: 'Triangle', fr: 'Triangle' }
      ]);
      addSlider(c, 'sizeMm', 'Outer Width', 'Largeur Totale', 40, 140, 2, ' mm');
      addSlider(c, 'bladeDepth', 'Blade Height', 'Hauteur Lame', 8, 28, 1, ' mm');
      addSlider(c, 'bladeThick', 'Blade Thickness', 'Épaisseur Lame', 0.8, 2.2, 0.1, ' mm');
      addSlider(c, 'gripWidth', 'Grip Flange Rim', 'Rebord de Prise', 3.0, 10.0, 0.5, ' mm');
      addToggle(c, 'embossStamp', 'Inner Embossing Stamp', 'Tampon Intérieur Embossé');
      addColor(c, 'color', 'Material Color', 'Couleur Matériau');
      box.appendChild(c);
    } else if (activeStudio === 'qrcode') {
      const c = mkCard('3D QR Code & Wi-Fi Plaque', 'Plaque QR Code & Wi-Fi 3D');
      addSelect(c, 'mode', 'QR Content Mode', 'Mode de Contenu', [
        { v: 'wifi', en: '📶 Wi-Fi Auto-Connect Wizard', fr: '📶 Assistant Wi-Fi Auto' },
        { v: 'url', en: '🔗 Website URL / Text', fr: '🔗 Lien Web / Texte' }
      ], renderControls);
      if (s.mode === 'wifi') {
        addText(c, 'wifiSsid', 'Wi-Fi Network Name (SSID)', 'Nom Réseau Wi-Fi (SSID)', 'MyWiFi');
        addText(c, 'wifiPass', 'Wi-Fi Password', 'Mot de Passe Wi-Fi', 'Password123');
        addSelect(c, 'wifiSec', 'Security', 'Sécurité', [
          { v: 'WPA', en: 'WPA / WPA2 / WPA3' }, { v: 'WEP', en: 'WEP' }, { v: 'nopass', en: 'Open (No Password)', fr: 'Ouvert' }
        ]);
      } else {
        addText(c, 'text', 'URL or Message', 'URL ou Message', 'https://studios-pro.com');
      }
      addSlider(c, 'sizeMm', 'Plaque Size', 'Taille Plaque', 50, 160, 5, ' mm');
      addSlider(c, 'baseThick', 'Base Thickness', 'Épaisseur Base', 1.4, 6.0, 0.2, ' mm');
      addSlider(c, 'codeHeight', 'QR Relief Height', 'Hauteur Relief QR', 0.6, 3.0, 0.2, ' mm');
      addToggle(c, 'roundedCorners', 'Rounded Corners', 'Coins Arrondis');
      addToggle(c, 'keychainHole', 'Keychain / Hang Hole', 'Trou Porte-Clés / Accroche');
      addColor(c, 'baseColor', 'Base Filament', 'Filament Base');
      addColor(c, 'dotColor', 'QR Code Filament', 'Filament Code QR');
      const info = document.createElement('div'); info.id = 'studioInfoBox'; info.className = 'info-box';
      c.appendChild(info);
      box.appendChild(c);
    } else if (activeStudio === 'keychain') {
      const c = mkCard('Unicode Keychain Tag', 'Porte-Clés Unicode');
      addText(c, 'text', 'Name / Text (Unicode OK!)', 'Texte (Accents & Symboles OK)', 'Étoile ★');
      addSelect(c, 'shape', 'Tag Shape', 'Forme Étiquette', [
        { v: 'pill', en: 'Classic Pill', fr: 'Pilule Classique' }, { v: 'rect', en: 'Rounded Rect', fr: 'Rectangle Arrondi' },
        { v: 'circle', en: 'Coin / Circle', fr: 'Cercle / Médaille' }, { v: 'diamond', en: 'Diamond', fr: 'Losange' },
        { v: 'heart', en: 'Heart', fr: 'Cœur' }
      ]);
      addSelect(c, 'fontStyle', 'Font Style', 'Style Police', [
        { v: 'Inter, system-ui, sans-serif', en: 'Modern Bold Sans' },
        { v: 'Georgia, serif', en: 'Classic Serif' },
        { v: "'Courier New', monospace", en: 'Tech Mono' }
      ]);
      addToggle(c, 'recessed', 'Carved Recessed Inlay Mode', 'Mode Gravé Incrusté (Creux)');
      addSlider(c, 'thickness', 'Base Thickness', 'Épaisseur Base', 2.0, 8.0, 0.2, ' mm');
      addSlider(c, 'fontSize', 'Text Size', 'Taille Texte', 8, 24, 1, ' mm');
      addSlider(c, 'textHeight', 'Text Relief / Pocket', 'Relief / Creux Texte', 0.6, 3.6, 0.2, ' mm');
      addSlider(c, 'padding', 'Edge Margin', 'Marge Bord', 4, 16, 1, ' mm');
      addSlider(c, 'ringHole', 'Eyelet Hole Radius', 'Rayon Trou Anneau', 2.0, 6.0, 0.5, ' mm');
      addColor(c, 'baseColor', 'Base Color', 'Couleur Base');
      addColor(c, 'textColor', 'Text / Inlay Color', 'Couleur Texte');
      box.appendChild(c);
    } else if (activeStudio === 'litho') {
      const c = mkCard('Watertight Solid Lithophane', 'Lithophanie Solide Étanche');
      addPhotoDropzone(c, 'Upload a portrait or landscape photo for solid 3D lithophane', 'Importez une photo pour générer la lithophanie solide');
      addSlider(c, 'widthMm', 'Width', 'Largeur', 60, 200, 5, ' mm');
      addSlider(c, 'maxThick', 'Max Thickness', 'Épaisseur Max', 1.8, 6.0, 0.2, ' mm');
      addSlider(c, 'baseLayer', 'Min Base Layer', 'Couche Min Base', 0.4, 2.0, 0.1, ' mm');
      addSlider(c, 'frameMm', 'Border Frame', 'Cadre Bordure', 0, 10, 1, ' mm');
      addSlider(c, 'contrast', 'Contrast Gamma', 'Contraste', 0.5, 2.4, 0.1, '');
      addSlider(c, 'resolution', 'Mesh Detail', 'Finesse Maillage', 40, 110, 8, '');
      addToggle(c, 'curved', 'Curved Self-Standing Arc', 'Courbure Autoportante');
      addToggle(c, 'invert', 'Invert Relief (Positive)', 'Inverser Relief (Positif)');
      addColor(c, 'color', 'Filament Color', 'Couleur Filament');
      box.appendChild(c);
    } else if (activeStudio === 'globe') {
      const c = mkCard('Hollow Moon / Photo Globe Lamp', 'Lampe Globe Photo Creux');
      addPhotoDropzone(c, 'Upload equirectangular or portrait photo for hollow lamp globe', 'Importez une photo pour la lampe sphérique creuse');
      addSlider(c, 'diameterMm', 'Globe Diameter', 'Diamètre Globe', 60, 180, 5, ' mm');
      addSlider(c, 'wallThick', 'Hollow Wall Thickness', 'Épaisseur Paroi', 1.4, 4.5, 0.2, ' mm');
      addSlider(c, 'reliefDepth', 'Relief Depth', 'Profondeur Relief', 0.6, 5.0, 0.2, ' mm');
      addSlider(c, 'socketHoleMm', 'LED Socket Hole Ø', 'Ø Douille LED Bas', 20, 65, 2, ' mm');
      addSlider(c, 'resolution', 'Sphere Detail', 'Résolution Sphère', 32, 84, 4, '');
      addToggle(c, 'invert', 'Invert Relief', 'Inverser Relief');
      addColor(c, 'color', 'Lamp Filament', 'Filament Lampe');
      box.appendChild(c);
    } else if (activeStudio === 'topo') {
      const c = mkCard('Stepped Topography + Laser Slices', 'Topographie en Marches + Laser');
      addPhotoDropzone(c, 'Upload elevation heightmap or photo for terraced 3D terrain', 'Importez une carte d’altitude ou photo');
      addSlider(c, 'widthMm', 'Map Width', 'Largeur Carte', 70, 210, 5, ' mm');
      addSlider(c, 'maxHeight', 'Peak Elevation (Y)', 'Altitude Max (Y)', 6, 65, 2, ' mm');
      addSlider(c, 'baseMm', 'Solid Base Thickness', 'Socle Solide', 1.5, 10, 0.5, ' mm');
      addSlider(c, 'steps', 'Terrace Steps', 'Nombre de Marches', 3, 20, 1, '');
      addSlider(c, 'resolution', 'Grid Detail', 'Précision Grille', 40, 104, 8, '');
      addToggle(c, 'invert', 'Invert Elevation', 'Inverser Altitude');
      addColor(c, 'color', 'Terrain Color', 'Couleur Relief');
      box.appendChild(c);
    } else if (activeStudio === 'halftone') {
      const c = mkCard('Halftone Dot-Art Plaque', 'Plaque Trame de Points');
      addPhotoDropzone(c, 'Upload high-contrast portrait or logo for 3D dot matrix', 'Importez un portrait ou logo contrasté');
      addSelect(c, 'dotShape', 'Dot Geometry', 'Forme des Points', [
        { v: 'circle', en: 'Cylinders (Circles)', fr: 'Cylindres (Cercles)' },
        { v: 'square', en: 'Square Pillars', fr: 'Piliers Carrés' },
        { v: 'hex', en: 'Hexagonal Prisms', fr: 'Prismes Hexagonaux' }
      ]);
      addSlider(c, 'widthMm', 'Plaque Width', 'Largeur Plaque', 70, 200, 5, ' mm');
      addSlider(c, 'spacingMm', 'Grid Pitch Spacing', 'Pas de Grille', 4.5, 15, 0.5, ' mm');
      addSlider(c, 'maxDotMm', 'Max Dot Diameter', 'Diamètre Max Point', 2.0, 14, 0.2, ' mm');
      addSlider(c, 'dotHeight', '3D Dot Extrusion', 'Hauteur Points 3D', 1.0, 12, 0.5, ' mm');
      addSlider(c, 'baseThick', 'Backing Plaque', 'Épaisseur Plaque', 1.4, 6, 0.2, ' mm');
      addToggle(c, 'invert', 'Invert Dots (Dark = Big)', 'Inverser (Sombre = Gros)');
      addColor(c, 'color', 'Dot Color', 'Couleur Points');
      addColor(c, 'baseColor', 'Base Plaque Color', 'Couleur Plaque');
      box.appendChild(c);
    } else if (activeStudio === 'vase') {
      const c = mkCard('Watertight Pottery & Spiral Vase', 'Vase Spirale & Poterie Étanche');
      addSlider(c, 'heightMm', 'Height', 'Hauteur', 50, 220, 5, ' mm');
      addSlider(c, 'baseR', 'Base Radius', 'Rayon Base', 15, 70, 1, ' mm');
      addSlider(c, 'bellyR', 'Belly Radius', 'Rayon Ventre', 18, 85, 1, ' mm');
      addSlider(c, 'neckR', 'Neck Radius', 'Rayon Col', 12, 70, 1, ' mm');
      addSlider(c, 'rimR', 'Lip Rim Radius', 'Rayon Bord', 12, 75, 1, ' mm');
      addSlider(c, 'wallThick', 'Solid Wall Thickness', 'Épaisseur Paroi', 1.8, 7.0, 0.2, ' mm');
      addSlider(c, 'flutes', 'Fluted Ribs Count', 'Nombre Cannelures', 0, 36, 1, '');
      addSlider(c, 'fluteDepth', 'Rib Depth', 'Profondeur Ribs', 0, 6.0, 0.2, ' mm');
      addSlider(c, 'twistDeg', 'Spiral Twist Angle', 'Torsade Spirale', -240, 240, 5, '°');
      addSlider(c, 'sides', 'Radial Smoothness', 'Finesse Radiale', 20, 112, 4, '');
      addColor(c, 'color', 'Ceramic Glaze', 'Couleur Céramique');
      box.appendChild(c);
    } else if (activeStudio === 'mandala') {
      const c = mkCard('3D Shadowbox Mandala', 'Mandala 3D Multistrates');
      const grp = document.createElement('div');
      grp.className = 'field';
      grp.innerHTML = `<div class="field-row"><span>${t('Layer Shapes', 'Formes des Couches')}</span></div>`;
      const chips = document.createElement('div');
      chips.className = 'chip-group';
      [['star', '★ Star'], ['flower', '✿ Flower'], ['circle', '○ Circles'], ['hexa', '⬡ Hex'], ['square', '◆ Diamonds'], ['spiral', '🌀 Spirals']].forEach(([sid, lbl]) => {
        const active = (s.shapes || []).includes(sid);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip-check' + (active ? ' active' : '');
        btn.textContent = lbl;
        btn.addEventListener('click', () => {
          const arr = new Set(s.shapes || []);
          if (arr.has(sid) && arr.size > 1) arr.delete(sid); else arr.add(sid);
          s.shapes = Array.from(arr);
          btn.classList.toggle('active', arr.has(sid));
          pushHistory(); scheduleRebuild(false);
        });
        chips.appendChild(btn);
      });
      grp.appendChild(chips); c.appendChild(grp);
      addSlider(c, 'symmetry', 'Symmetry Fold', 'Symétrie', 4, 20, 1, '×');
      addSlider(c, 'layers', 'Stacked 3D Tiers', 'Couches 3D', 2, 6, 1, '');
      addSlider(c, 'radiusMm', 'Outer Radius', 'Rayon Extérieur', 35, 105, 5, ' mm');
      addSlider(c, 'layerThick', 'Tier Thickness', 'Épaisseur Couche', 1.2, 4.0, 0.2, ' mm');
      addSlider(c, 'strokeW', 'Rib Width', 'Largeur Nervure', 1.4, 5.0, 0.2, ' mm');
      addColor(c, 'color', 'Primary Accent', 'Couleur Principale');
      box.appendChild(c);
    } else if (activeStudio === 'voronoi') {
      const c = mkCard('True 2D Voronoi Bio-Lattice', 'Treillis Voronoi Réel');
      addSlider(c, 'widthMm', 'Width', 'Largeur', 60, 200, 5, ' mm');
      addSlider(c, 'heightMm', 'Height', 'Hauteur', 60, 200, 5, ' mm');
      addSlider(c, 'cellCount', 'Voronoi Cells', 'Cellules Voronoi', 8, 56, 2, '');
      addSlider(c, 'wallThick', 'Strut Thickness', 'Épaisseur Nervures', 1.8, 7.0, 0.2, ' mm');
      addSlider(c, 'depthMm', '3D Depth', 'Profondeur 3D', 2.0, 20.0, 0.5, ' mm');
      addSlider(c, 'frameMm', 'Outer Solid Frame', 'Cadre Solide', 3.0, 12.0, 0.5, ' mm');
      addSlider(c, 'jitter', 'Organic Chaos', 'Chaos Organique', 0.1, 1.0, 0.05, '');
      const rndBtn = document.createElement('button');
      rndBtn.type = 'button'; rndBtn.className = 'btn-full';
      rndBtn.innerHTML = `🎲 ${t('New Organic Seed', 'Nouvelle Graine Voronoi')}`;
      rndBtn.addEventListener('click', () => { s.seed = Math.floor(Math.random() * 9999); pushHistory(); scheduleRebuild(false); });
      c.appendChild(rndBtn);
      addColor(c, 'color', 'Material Color', 'Couleur Matériau');
      box.appendChild(c);
    } else if (activeStudio === 'maze') {
      const c = mkCard('Solvable 3D Labyrinth Maze', 'Labyrinthe 3D Résolvable');
      addSelect(c, 'shape', 'Board Shape', 'Forme Plateau', [
        { v: 'square', en: 'Square Labyrinth', fr: 'Labyrinthe Carré' },
        { v: 'circle', en: 'Circular Disk Maze', fr: 'Disque Circulaire' }
      ]);
      addSlider(c, 'gridSize', 'Grid Complexity', 'Complexité Grille', 5, 21, 1, '×');
      addSlider(c, 'sizeMm', 'Board Size', 'Taille Plateau', 60, 180, 5, ' mm');
      addSlider(c, 'wallHeight', 'Wall Height', 'Hauteur Murs', 4, 24, 1, ' mm');
      addSlider(c, 'wallThick', 'Wall Thickness', 'Épaisseur Murs', 1.4, 3.6, 0.2, ' mm');
      addToggle(c, 'showSolution', 'Show BFS Shortest-Path Solution', 'Afficher Solution BFS');
      const rndBtn = document.createElement('button');
      rndBtn.type = 'button'; rndBtn.className = 'btn-full primary';
      rndBtn.innerHTML = `🎲 ${t('Generate New Solvable Maze', 'Générer Nouveau Labyrinthe')}`;
      rndBtn.addEventListener('click', () => { s.seed = Math.floor(Math.random() * 99999); pushHistory(); scheduleRebuild(false); });
      c.appendChild(rndBtn);
      addColor(c, 'color', 'Wall Color', 'Couleur Murs');
      addColor(c, 'floorColor', 'Floor Base Color', 'Couleur Base');
      const info = document.createElement('div'); info.id = 'studioInfoBox'; info.className = 'info-box';
      c.appendChild(info);
      box.appendChild(c);
    } else if (activeStudio === 'text') {
      const c = mkCard('Unicode 3D Typography', 'Typographie 3D Unicode');
      addText(c, 'text', 'Line 1 (Unicode & Symbols OK!)', 'Ligne 1 (Accents & Symboles OK)', 'STUDIO 7');
      addText(c, 'line2', 'Line 2 (Optional)', 'Ligne 2 (Optionnelle)', 'CRÉATION ★');
      addSelect(c, 'fontStyle', 'Font Family', 'Police', [
        { v: 'Inter, system-ui, sans-serif', en: 'Modern Heavy Sans' },
        { v: 'Georgia, serif', en: 'Classic Royal Serif' },
        { v: "'Courier New', monospace", en: 'Industrial Mono' }
      ]);
      addSlider(c, 'sizeMm', 'Letter Height', 'Hauteur Lettres', 14, 48, 2, ' mm');
      addSlider(c, 'depthMm', 'Extrusion Depth', 'Profondeur Extrusion', 3, 35, 1, ' mm');
      addToggle(c, 'standingBase', 'Include Desk Stand Base', 'Socle Bureau Autoportant');
      addColor(c, 'color', 'Text Color', 'Couleur Texte');
      box.appendChild(c);
    } else if (activeStudio === 'gcode') {
      const c = mkCard('Real .gcode / .nc Simulator', 'Simulateur .gcode / .nc Réel');
      const dz = document.createElement('div');
      dz.className = 'dropzone';
      dz.innerHTML = `<div style="font-size:20px;margin-bottom:4px">⚡</div><strong>${t('Upload Real .gcode / .nc File', 'Importer Fichier .gcode / .nc Réel')}</strong><div style="color:var(--muted);font-size:10.5px;margin-top:3px">${t('Parses G0/G1 moves, layers & animates nozzle live', 'Analyse G0/G1, strates et anime la buse 3D')}</div>`;
      dz.addEventListener('click', () => $('gcodeUploadInput').click());
      c.appendChild(dz);
      const sampleOpts = [
        { v: 'vase', en: 'Demo: 3D Spiral Vase (36 Layers)', fr: 'Démo : Vase Spirale 3D (36 Couches)' },
        { v: 'cnc_pocket', en: 'Demo: CNC Pocket Mill', fr: 'Démo : Fraisage Poche CNC' },
        { v: 'laser_star', en: 'Demo: Laser Geometric Star', fr: 'Démo : Étoile Laser' }
      ];
      if (s.uploadedText) sampleOpts.unshift({ v: 'uploaded', en: '📂 Uploaded G-Code File', fr: '📂 Fichier G-Code Importé' });
      addSelect(c, 'sample', 'Active G-Code Program', 'Programme G-Code Actif', sampleOpts);
      addSlider(c, 'layerPct', 'Layer Scrubber', 'Curseur de Couches', 5, 100, 1, '%');
      const playRow = document.createElement('div');
      playRow.style.cssText = 'display:flex;gap:6px';
      const pBtn = document.createElement('button');
      pBtn.type = 'button'; pBtn.className = 'btn-full primary';
      pBtn.textContent = s.playing ? t('⏸ Pause Nozzle', '⏸ Pause Buse') : t('▶ Play Nozzle', '▶ Lancer Buse');
      pBtn.addEventListener('click', () => {
        s.playing = !s.playing;
        pBtn.textContent = s.playing ? t('⏸ Pause Nozzle', '⏸ Pause Buse') : t('▶ Play Nozzle', '▶ Lancer Buse');
        if (viewport) viewport.setGcodePlayback(s.playing, s.speed);
      });
      playRow.appendChild(pBtn); c.appendChild(playRow);
      addSlider(c, 'speed', 'Animation Speed', 'Vitesse Simulation', 0.5, 6.0, 0.5, '×');
      addColor(c, 'color', 'Toolpath Color', 'Couleur Trajet');
      const info = document.createElement('div'); info.id = 'studioInfoBox'; info.className = 'info-box';
      c.appendChild(info);
      box.appendChild(c);
    }
  }

  /* =========================================================================
     6. DISPATCH BUILD & UPDATE LIVE METROLOGY HUD
  ========================================================================= */
  function runActiveBuilder() {
    const s = params[activeStudio];
    let res;
    switch (activeStudio) {
      case 'box':      res = CAD.buildBoxStudio(s); break;
      case 'gear':     res = CAD.buildGearStudio(s); break;
      case 'stand':    res = CAD.buildStandStudio(s); break;
      case 'cookie':   res = CAD.buildCookieStudio(s); break;
      case 'qrcode':   res = CAD.buildQRStudio(s); break;
      case 'keychain': res = CAD.buildKeychainStudio(s); break;
      case 'text':     res = CAD.buildTextStudio(s); break;
      case 'texture':  res = ART.buildTextureStudio(s, uploadedImageBuf); break;
      case 'litho':    res = ART.buildLithoStudio(s, uploadedImageBuf); break;
      case 'globe':    res = ART.buildGlobeStudio(s, uploadedImageBuf); break;
      case 'topo':     res = ART.buildTopoStudio(s, uploadedImageBuf); break;
      case 'halftone': res = ART.buildHalftoneStudio(s, uploadedImageBuf); break;
      case 'vase':     res = ART.buildVaseStudio(s); break;
      case 'mandala':  res = ART.buildMandalaStudio(s); break;
      case 'voronoi':  res = ART.buildVoronoiStudio(s); break;
      case 'maze':     res = ART.buildMazeStudio(s); break;
      case 'gcode':    res = ART.buildGCodeStudio(s); break;
      default:         res = CAD.buildBoxStudio(params.box); break;
    }
    const stats = C.analyzeBuild(res.parts, activeStudio);
    return { studioId: activeStudio, parts: res.parts, vectors2D: res.vectors2D || [], extras: res.extras || {}, stats };
  }

  function updateHUD(build) {
    const { stats, extras, studioId } = build;
    $('hudDims').textContent = `${stats.sizeMm.x} × ${stats.sizeMm.y} × ${stats.sizeMm.z} mm`;
    $('hudPla').textContent = `${stats.plaGrams} g · €${stats.plaCostEur.toFixed(2)}`;
    const bedEl = $('hudBed');
    bedEl.textContent = stats.fitsBed220 ? t('✓ FITS', '✓ OK 220') : t('⚠ >220mm', '⚠ >220mm');
    bedEl.className = 'stat-v ' + (stats.fitsBed220 ? 'ok' : 'warn');
    $('hudTris').textContent = stats.totalTris.toLocaleString();

    const pf = stats.preflight;
    $('hudPreflight').textContent = `${pf.score}/100 ${pf.grade}`;
    $('btnPreflight').className = 'pf-pill' + (pf.score >= 90 ? '' : ' warn');

    // Update contextual studio info boxes & PBR thumbs
    const infoBox = $('studioInfoBox');
    if (infoBox) {
      if (studioId === 'gear') {
        infoBox.innerHTML = `${t('Pitch Ø', 'Ø Primitif')}: <strong>${extras.pitchDiam} mm</strong> · ${t('Outer Ø', 'Ø Ext.')}: <strong>${extras.outerDiam} mm</strong><br>` +
          (extras.centerDistance > 0 ? `${t('Exact Meshing Center Distance', 'Entraxe Exact')}: <strong>${extras.centerDistance} mm</strong> · ${t('Ratio', 'Rapport')}: <strong>${extras.gearRatio}</strong>` : t('Enable Twin Gear to test live meshing!', 'Activez la 2ᵉ roue pour simuler l’engrenage !'));
      } else if (studioId === 'qrcode') {
        infoBox.innerHTML = `✓ ${extras.moduleCount}×${extras.moduleCount} ${t('modules merged watertight', 'modules fusionnés étanches')}<br>🎨 ${t('Multi-Color Filament Swap at', 'Changement Filament à')} <strong>Z = ${extras.swapLayerZ}</strong>`;
      } else if (studioId === 'maze') {
        infoBox.innerHTML = `✓ <strong>${t('100% Solvable Perfect Maze', 'Labyrinthe 100% Résolvable')}</strong><br>🧭 ${t('BFS Shortest Path', 'Plus court chemin BFS')}: <strong>${extras.solutionLength} ${t('cells', 'cases')}</strong>`;
      } else if (studioId === 'gcode' && extras.gcode) {
        const g = extras.gcode;
        infoBox.innerHTML = `📊 <strong>${g.totalLayers}</strong> ${t('layers', 'couches')} · ${t('Cut', 'Usinage')}: <strong>${(g.cutDistMm / 1000).toFixed(2)} m</strong><br>🚀 ${t('Rapids', 'Rapides')}: ${(g.rapidDistMm / 1000).toFixed(2)} m · ⏱ ~<strong>${g.estMinutes} min</strong>`;
      }
    }

    if (studioId === 'texture' && extras.pbrMaps) {
      const wrap = $('pbrThumbWrap');
      if (wrap) {
        wrap.innerHTML = '';
        [['albedo', 'Albedo'], ['normal', 'Normal'], ['roughness', 'Rough'], ['ao', 'AO']].forEach(([k, lbl]) => {
          const item = document.createElement('div');
          item.className = 'pbr-thumb';
          const c = document.createElement('canvas'); c.width = 64; c.height = 64;
          c.getContext('2d').drawImage(extras.pbrMaps[k], 0, 0, 64, 64);
          item.appendChild(c);
          const sp = document.createElement('span'); sp.textContent = lbl;
          item.appendChild(sp);
          wrap.appendChild(item);
        });
      }
    }
  }

  function rebuildNow(resetCamera) {
    latestBuild = runActiveBuilder();
    updateHUD(latestBuild);
    if (viewport) {
      viewport.renderBuild(latestBuild, !!resetCamera);
      if (activeStudio === 'gcode') {
        viewport.setGcodePlayback(params.gcode.playing, params.gcode.speed);
      }
    }
  }

  function scheduleRebuild(resetCamera) {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => rebuildNow(resetCamera), 30);
  }

  /* =========================================================================
     7. EXPORTS (BINARY STL, GLB, SVG, DXF, PDF, HTML PROOF, PBR PACK, AR, .spmaker7)
  ========================================================================= */
  function dlBlob(blob, name) {
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 4000);
  }

  async function doExportSTL() {
    if (!latestBuild) return;
    const g = await checkExportGate(); if (!g.allowed) return;
    const buf = C.exportBinarySTL(latestBuild.parts);
    dlBlob(new Blob([buf], { type: 'application/octet-stream' }), `maker7_${activeStudio}_1to1mm.stl`);
    markExportUsed();
    toast(t('Watertight 1:1 mm Binary STL exported!', 'STL Binaire 1:1 mm étanche exporté !'));
  }

  async function doExportGLB() {
    if (!viewport || !latestBuild) return;
    const g = await checkExportGate(); if (!g.allowed) return;
    const buf = await viewport.exportGLB();
    dlBlob(new Blob([buf], { type: 'model/gltf-binary' }), `maker7_${activeStudio}_1to1m.glb`);
    markExportUsed();
    toast(t('1:1 m PBR GLB exported!', 'GLB PBR 1:1 m exporté !'));
  }

  async function doExportSVG() {
    if (!latestBuild) return;
    if (!latestBuild.vectors2D || latestBuild.vectors2D.length === 0) {
      toast(t('No 2D vector layout for this 3D studio — export STL/GLB instead.', 'Pas de découpe 2D pour ce studio — utilisez STL/GLB.'));
      return;
    }
    const g = await checkExportGate(); if (!g.allowed) return;
    const svg = C.exportSVG(latestBuild.vectors2D, latestBuild.stats.sizeMm);
    dlBlob(new Blob([svg], { type: 'image/svg+xml' }), `maker7_${activeStudio}_laser_1to1mm.svg`);
    markExportUsed();
    toast(t('1:1 mm Laser SVG exported!', 'SVG Laser 1:1 mm exporté !'));
  }

  async function doExportDXF() {
    if (!latestBuild) return;
    if (!latestBuild.vectors2D || latestBuild.vectors2D.length === 0) {
      toast(t('No 2D CAD paths for this studio — export STL/GLB instead.', 'Pas de tracés 2D CAD pour ce studio — utilisez STL/GLB.'));
      return;
    }
    const g = await checkExportGate(); if (!g.allowed) return;
    const dxf = C.exportDXF(latestBuild.vectors2D);
    dlBlob(new Blob([dxf], { type: 'application/dxf' }), `maker7_${activeStudio}_cad_1to1mm.dxf`);
    markExportUsed();
    toast(t('1:1 mm DXF exported!', 'DXF 1:1 mm exporté !'));
  }

  async function doExportPDF() {
    if (!latestBuild || !window.jspdf) return;
    if (!latestBuild.vectors2D || latestBuild.vectors2D.length === 0) {
      toast(t('No 2D vector layout for PDF — use PNG Render or STL!', 'Pas de plan 2D PDF — utilisez PNG ou STL !'));
      return;
    }
    const g = await checkExportGate(); if (!g.allowed) return;
    const { jsPDF } = window.jspdf;
    const items = latestBuild.vectors2D;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const it of items) for (const pt of it.points) {
      if (pt[0] < minX) minX = pt[0]; if (pt[0] > maxX) maxX = pt[0];
      if (pt[1] < minY) minY = pt[1]; if (pt[1] > maxY) maxY = pt[1];
    }
    const w = Math.max(40, maxX - minX + 20), h = Math.max(40, maxY - minY + 20);
    const doc = new jsPDF({ orientation: w > h ? 'l' : 'p', unit: 'mm', format: [w, h] });
    doc.setLineWidth(0.25);
    const ox = minX - 10, oy = maxY + 10;
    for (const it of items) {
      const pts = it.points;
      if (pts.length < 2) continue;
      if (it.layer === 'engrave') doc.setDrawColor(37, 99, 235); else doc.setDrawColor(220, 38, 38);
      const count = it.closed ? pts.length : pts.length - 1;
      for (let i = 0; i < count; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        doc.line(a[0] - ox, oy - a[1], b[0] - ox, oy - b[1]);
      }
    }
    doc.save(`maker7_${activeStudio}_1to1mm.pdf`);
    markExportUsed();
    toast(t('1:1 mm Vector PDF exported!', 'PDF Vectoriel 1:1 mm exporté !'));
  }

  async function doExportHtml() {
    if (!viewport || !latestBuild) return;
    const g = await checkExportGate(); if (!g.allowed) return;
    const html = await viewport.buildClientProofHTML(lang);
    dlBlob(new Blob([html], { type: 'text/html' }), `maker7_${activeStudio}_3d_proof.html`);
    markExportUsed();
    toast(t('Interactive 3D Client Proof exported!', 'Aperçu 3D Client .HTML exporté !'));
  }

  async function doDownloadPBRPack() {
    if (!latestBuild || !latestBuild.extras || !latestBuild.extras.pbrMaps) return;
    const g = await checkExportGate(); if (!g.allowed) return;
    const maps = latestBuild.extras.pbrMaps;
    const preset = params.texture.preset || 'pbr';
    ['albedo', 'normal', 'roughness', 'ao'].forEach((k, idx) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = maps[k].toDataURL('image/png');
        a.download = `maker7_${preset}_${k}.png`;
        a.click();
      }, idx * 180);
    });
    markExportUsed();
    toast(t('Downloading 4× PBR Maps (Albedo, Normal, Roughness, AO)!', 'Téléchargement des 4 cartes PBR (Albédo, Normale, Rugosité, AO) !'));
  }

  /* =========================================================================
     8. WIRE GLOBAL EVENTS & BOOTSTRAP
  ========================================================================= */
  function bindGlobalEvents() {
    $('back-btn').addEventListener('click', () => {
      if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'CLOSE_STUDIO' }, '*');
      else window.location.href = '/';
    });

    $('langToggle').addEventListener('click', () => {
      lang = lang === 'en' ? 'fr' : 'en';
      document.body.dataset.lang = lang;
      try { localStorage.setItem('sp_lang', lang); } catch (_) {}
      renderStudioList(); renderControls(); updateCreditsBadge();
      if (latestBuild) updateHUD(latestBuild);
    });

    document.querySelectorAll('.mobile-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.body.dataset.mobilePane = btn.dataset.mobileTarget;
        document.querySelectorAll('.mobile-tab').forEach((b) => b.classList.toggle('active', b === btn));
        if (viewport && btn.dataset.mobileTarget === 'viewport') setTimeout(() => viewport.resize(), 40);
      });
    });

    $('studioSearch').addEventListener('input', renderStudioList);
    document.querySelectorAll('#workshopPills .cat-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeWorkshop = btn.dataset.ws;
        document.querySelectorAll('#workshopPills .cat-pill').forEach((b) => b.classList.toggle('active', b === btn));
        renderStudioList();
      });
    });

    // Camera & Stage Pills
    document.querySelectorAll('[data-cam]').forEach((btn) => {
      btn.addEventListener('click', () => { if (viewport) viewport.fitCamera(btn.dataset.cam); });
    });
    $('btnToggleBed').addEventListener('click', (e) => {
      const on = !e.currentTarget.classList.contains('active');
      e.currentTarget.classList.toggle('active', on);
      if (viewport) viewport.setBedVisible(on);
    });
    $('btnToggleSpin').addEventListener('click', (e) => {
      const on = !e.currentTarget.classList.contains('active');
      e.currentTarget.classList.toggle('active', on);
      if (viewport) viewport.setAutoRotate(on);
    });
    $('btnToggleWire').addEventListener('click', (e) => {
      const on = !e.currentTarget.classList.contains('active');
      e.currentTarget.classList.toggle('active', on);
      if (viewport) viewport.setWireframe(on);
    });

    // Photo & G-Code Uploads
    $('photoUploadInput').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        const maxD = 512;
        let w = img.width, h = img.height;
        if (w > maxD || h > maxD) {
          const s = maxD / Math.max(w, h); w = Math.round(w * s); h = Math.round(h * s);
        }
        c.width = w; c.height = h;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        uploadedImageBuf = { width: w, height: h, data: ctx.getImageData(0, 0, w, h).data, name: f.name };
        if (activeStudio === 'texture') params.texture.preset = 'photo';
        renderControls();
        rebuildNow(false);
        toast(t(`Photo loaded: ${f.name}`, `Photo chargée : ${f.name}`));
      };
      img.src = URL.createObjectURL(f);
      e.target.value = '';
    });

    $('gcodeUploadInput').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        params.gcode.uploadedText = String(reader.result || '');
        params.gcode.sample = 'uploaded';
        renderControls();
        rebuildNow(true);
        toast(t(`Parsed G-Code: ${f.name}`, `G-Code analysé : ${f.name}`));
      };
      reader.readAsText(f);
      e.target.value = '';
    });

    // Save / Load .spmaker7 (FREE!)
    $('btnSaveProj').addEventListener('click', () => {
      const payload = { format: 'spmaker7', version: 2, activeStudio, params };
      dlBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `maker7_${activeStudio}.spmaker7`);
      toast(t('.spmaker7 project saved (Free)', 'Projet .spmaker7 sauvegardé (Gratuit)'));
    });
    $('btnLoadProj').addEventListener('click', () => $('projFileInput').click());
    $('projFileInput').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const d = JSON.parse(r.result);
          if (d.activeStudio && d.params) {
            activeStudio = d.activeStudio;
            params = Object.assign(JSON.parse(JSON.stringify(DEFAULT_PARAMS)), d.params);
            pushHistory(); renderStudioList(); renderControls(); rebuildNow(true);
            toast(t('.spmaker7 project restored!', 'Projet .spmaker7 restauré !'));
          }
        } catch (_) { toast(t('Invalid project file', 'Fichier projet invalide')); }
      };
      r.readAsText(f);
      e.target.value = '';
    });

    // Actions & Exports
    $('btnUndo').addEventListener('click', undo);
    $('btnRedo').addEventListener('click', redo);
    $('btnSnap').addEventListener('click', () => {
      if (!viewport) return;
      const a = document.createElement('a');
      a.href = viewport.capturePNG(credits.isPro);
      a.download = `maker7_${activeStudio}_${Date.now()}.png`;
      a.click();
      toast(t('Studio Render PNG saved (Free)!', 'Rendu PNG sauvegardé (Gratuit) !'));
    });
    $('btnExportStl').addEventListener('click', doExportSTL);
    $('btnExportStlTop').addEventListener('click', doExportSTL);
    $('btnExportGlb').addEventListener('click', doExportGLB);
    $('btnExportSvg').addEventListener('click', doExportSVG);
    $('btnExportDxf').addEventListener('click', doExportDXF);
    $('btnExportPdf').addEventListener('click', doExportPDF);
    $('btnExportHtml').addEventListener('click', doExportHtml);
    $('btnPreviewAr').addEventListener('click', async () => {
      if (!viewport) return;
      try {
        toast(t('Opening 1:1 m WebAR Preview…', 'Ouverture WebAR 1:1 m…'));
        await viewport.sendToWebAR();
      } catch (_) { toast(t('AR Bridge unavailable standalone', 'Pont AR indisponible hors-ligne')); }
    });

    // Pre-Flight Modal
    $('btnPreflight').addEventListener('click', () => {
      if (!latestBuild) return;
      const pf = latestBuild.stats.preflight;
      $('preflightBody').innerHTML = `
        <div style="font-size:26px;font-weight:900;color:${pf.score >= 90 ? 'var(--emerald)' : 'var(--amber)'}">${pf.score} / 100 · ${pf.grade}</div>
        ${pf.checks.map((c) => `<div class="check-item ${c.status}">${c.status === 'pass' ? '✅' : (c.status === 'warn' ? '⚠️' : '❌')} ${t(c.en, c.fr)}</div>`).join('')}`;
      $('preflightModal').classList.add('open');
    });

    $('btnUpgradePro').addEventListener('click', () => {
      $('paymentModal').classList.remove('open');
      if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'SHOW_PAYWALL_MODAL' }, '*');
      else window.open('/pricing', '_blank');
    });

    document.querySelectorAll('[data-close-modal]').forEach((b) => {
      b.addEventListener('click', () => $(b.dataset.closeModal).classList.remove('open'));
    });
    document.querySelectorAll('.modal-backdrop').forEach((bd) => {
      bd.addEventListener('click', (e) => { if (e.target === bd) bd.classList.remove('open'); });
    });

    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    });
  }

  function initViewport() {
    if (viewport || !window.MakerViewport) return;
    viewport = new window.MakerViewport($('viewport'));
    rebuildNow(true);
  }

  function boot() {
    document.body.dataset.lang = lang;
    bindGlobalEvents();
    updateCreditsBadge();
    renderStudioList();
    renderControls();
    pushHistory();
    if (window.MakerViewport) initViewport();
    else {
      window.addEventListener('maker-viewport-ready', initViewport, { once: true });
      rebuildNow(false);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
