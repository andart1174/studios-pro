/**
 * Zen Sandscape v4.5 — Main Atelier Application Controller
 * Wires:
 *  - Clean Blank-Canvas Boot + Quick-Launch Welcome Bar
 *  - Front-and-Center Full Color Studio (12 Quick Swatches, Custom Hex, Strata, Rainbow Flow, Eyedropper)
 *  - Interactive On-Canvas Photo / Stencil / Text Placement Stage (Drag, Corner Resize, Rotate, Flip,
 *    Object-Only Smart CIE-Lab Cutout vs Full Photo + Artistic Masks + Magic Wand + Keep/Erase Refine Brush
 *    + Static Gallery Photo Backdrop + 6 Living Physics Modes + AI Multi-Material Split!)
 *  - 6 Kinetic Sculpt Magic Brushes (Paint, Recolor, Melt, Freeze, Zen Rake, Magnet)
 *  - Magnetic Reverse-Sand Reassemble Magic (Lock Target -> Shatter -> Fly Back!)
 *  - 60 FPS SandboxEngine + 12 Living AI Worlds + ZenAudio + 7 Exports incl. 1:1 AR Wall Art!
 */
(function () {
  'use strict';

  const SM = window.SandMaterials;
  const AI = window.AIDirector;
  const PC = window.PhotoComposer;
  const ZA = window.ZenAudio;
  const EX = window.SandExports;
  const $ = id => document.getElementById(id);

  const STENCILS = [
    { id: 'dragon',  en: 'Fire Dragon',     fr: 'Dragon de Feu' },
    { id: 'castle',  en: 'Medieval Castle', fr: 'Château Médiéval' },
    { id: 'lion',    en: 'Wild Lion',       fr: 'Lion Royal' },
    { id: 'wolf',    en: 'Dire Wolf',       fr: 'Loup Polaire' },
    { id: 'wizard',  en: 'Arcane Wizard',   fr: 'Mage Astral' },
    { id: 'ship',    en: 'Pirate Galleon',  fr: 'Galion Pirate' },
    { id: 'ufo',     en: 'Cosmic UFO',      fr: 'OVNI Cosmique' },
    { id: 'fighter', en: 'Star Fighter',    fr: 'Chasseur Spatial' },
    { id: 'alien',   en: 'Star Visitor',    fr: 'Visiteur Astral' },
    { id: 'hero',    en: 'Cyber Hero',      fr: 'Héros Cyber' }
  ];

  const ui = {
    lang: 'en',
    activeMat: SM.MAT.SAND,
    activeWorld: 'blank',
    activeTool: 'paint', // 'paint' | 'tint' | 'melt' | 'freeze' | 'rake' | 'magnet' | 'eyedropper'
    brushSize: 10,
    brushShape: 'circle',
    symmetry: 'off',
    laserDir: 0,
    customColor: '#f5c542',
    textFont: 'bold',
    isPro: false,
    pendingExport: null,
    isPointerDown: false,
    lastX: 0, lastY: 0,
    cursor: { x: 0, y: 0, radius: 10, shape: 'circle', tool: 'paint', inside: false },
    recStartMs: 0,
    recTimerId: null,
    stencilsBuilt: false,
    stageDrag: null // { mode: 'move'|'resize'|'rotate'|'refine', startX, startY, origCx, origCy, origScale, origRot, origDist, origAng }
  };

  const engine = new window.SandboxEngine(600, 420);
  const renderer = new window.ArtRenderer($('sand-canvas'), 600, 420);
  const photoStage = new PC.InteractivePhotoStage(600, 420);

  engine.onPianoHit = yNorm => ZA.playChime(yNorm);
  engine.onExplosion = r => ZA.playBoom(r);

  const hostChannel = (typeof BroadcastChannel !== 'undefined')
    ? new BroadcastChannel('studios_pro_channel')
    : null;

  let _toastTimer = null;
  function showToast(msg, ms = 2500) {
    const el = $('toast-banner');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.add('hidden'), ms);
  }

  function updateWelcomeVisibility() {
    const el = $('blank-welcome');
    if (!el) return;
    const isEmpty = engine.particlesCount === 0 && !renderer.bgPhoto && !photoStage.active && !(engine.reformAnim && engine.reformAnim.active);
    el.classList.toggle('hidden', !isEmpty);
  }

  function syncPlayPauseButton() {
    const t = SM.getT(ui.lang);
    $('btn-play-pause').classList.toggle('active', !engine.isPaused);
    $('btn-play-pause').innerHTML = engine.isPaused ? `▶ <span>${t.play}</span>` : `⏸ <span>${t.pause}</span>`;
  }

  // =========================================================================
  // 1. COLOR STUDIO & TOOL STATE CONTROLLERS
  // =========================================================================

  function setColorMode(mode) {
    engine.colorMode = mode;
    engine.autoStrata = (mode === 'strata');
    $('chk-auto-strata').checked = engine.autoStrata;
    document.querySelectorAll('.cmode-btn[data-cmode]').forEach(b => {
      b.classList.toggle('active', b.dataset.cmode === mode);
    });
    if (ui.activeTool === 'eyedropper') setActiveTool('paint');
  }

  function setCustomColor(hex, switchToCustom = true) {
    ui.customColor = String(hex || '#f5c542').toLowerCase();
    $('color-picker').value = ui.customColor;
    $('val-color-hex').textContent = ui.customColor.toUpperCase();
    document.querySelectorAll('.q-swatch').forEach(s => {
      s.classList.toggle('active', s.dataset.hex === ui.customColor);
    });
    if (switchToCustom) setColorMode('custom');
  }

  function setActiveTool(tool) {
    ui.activeTool = tool;
    ui.cursor.tool = tool;
    document.querySelectorAll('.ktool-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tool === tool);
    });
    $('btn-eyedropper').classList.toggle('active', tool === 'eyedropper');
    $('sand-canvas').style.cursor = tool === 'eyedropper' ? 'copy' : 'crosshair';
  }

  function renderQuickSwatches() {
    const wrap = $('quick-swatches');
    wrap.innerHTML = '';
    SM.QUICK_COLORS.forEach(hex => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'q-swatch' + (ui.customColor === hex.toLowerCase() ? ' active' : '');
      b.dataset.hex = hex.toLowerCase();
      b.style.background = hex;
      b.title = hex.toUpperCase();
      b.addEventListener('click', () => {
        setCustomColor(hex, true);
        showToast(`🎨 Color ${hex.toUpperCase()}`);
      });
      wrap.appendChild(b);
    });
  }

  // =========================================================================
  // 2. UI BUILDERS (MATERIALS, 12 AI WORLDS, 8 PALETTES, LAZY STENCILS)
  // =========================================================================

  function renderMaterialsPanel() {
    const wrap = $('materials-groups');
    wrap.innerHTML = '';
    SM.GROUPS.forEach(grp => {
      const sec = document.createElement('div');
      const title = document.createElement('div');
      title.className = 'mat-group-title';
      title.textContent = ui.lang === 'fr' ? grp.fr : grp.en;
      const grid = document.createElement('div');
      grid.className = 'mat-grid';

      SM.MATERIAL_LIST.filter(m => m.group === grp.id).forEach(m => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'mat-btn' + (ui.activeMat === m.id ? ' active' : '');
        b.dataset.mat = String(m.id);
        b.innerHTML = `<span>${m.icon}</span><span>${ui.lang === 'fr' ? m.fr : m.en}</span>`;
        b.addEventListener('click', () => {
          ui.activeMat = m.id;
          setActiveTool('paint');
          wrap.querySelectorAll('.mat-btn').forEach(el => el.classList.toggle('active', Number(el.dataset.mat) === m.id));
        });
        grid.appendChild(b);
      });
      sec.append(title, grid);
      wrap.appendChild(sec);
    });
  }

  function renderAIWorldsPanel() {
    const grid = $('ai-worlds-grid');
    grid.innerHTML = '';
    $('btn-world-blank').classList.toggle('active', ui.activeWorld === 'blank');

    AI.LIVING_WORLDS.forEach(w => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'world-btn' + (ui.activeWorld === w.id ? ' active' : '');
      b.dataset.world = w.id;
      b.innerHTML = `<span>${w.icon}</span><span>${ui.lang === 'fr' ? w.fr : w.en}</span>`;
      b.addEventListener('click', () => loadLivingWorld(w.id));
      grid.appendChild(b);
    });

    const pGrid = $('palettes-grid');
    pGrid.innerHTML = '';
    Object.values(SM.PALETTES).forEach(p => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pal-btn' + (engine.paletteId === p.id ? ' active' : '');
      b.dataset.pal = p.id;
      b.innerHTML = `<span>${ui.lang === 'fr' ? p.fr : p.en}</span><div class="pal-bar" style="background:linear-gradient(90deg,${p.colors.join(',')})"></div>`;
      b.addEventListener('click', () => {
        engine.paletteId = p.id;
        setColorMode('strata');
        pGrid.querySelectorAll('.pal-btn').forEach(el => el.classList.toggle('active', el.dataset.pal === p.id));
        showToast(`🎨 ${ui.lang === 'fr' ? p.fr : p.en}`);
      });
      pGrid.appendChild(b);
    });
  }

  function resetToBlankCanvas(silent = false) {
    if (photoStage.active) closePhotoStage();
    engine.clear();
    engine.reformAnim = null;
    engine.isPaused = false;
    renderer.bgPhoto = null;
    renderer.clearTrails();
    $('btn-clear-bg-photo').classList.add('hidden');
    ui.activeWorld = 'blank';
    $('art-title-input').value = ui.lang === 'fr' ? 'Mon Zen Sandscape' : 'My Zen Sandscape';
    engine.pushUndo();
    syncPlayPauseButton();
    renderAIWorldsPanel();
    updateWelcomeVisibility();
    if (!silent) showToast(ui.lang === 'fr' ? '✨ Écran vierge prêt à créer' : '✨ Clean Blank Canvas Ready');
  }

  function loadLivingWorld(worldId, opts = {}) {
    if (photoStage.active) closePhotoStage();
    const meta = AI.buildWorld(engine, worldId, opts);
    ui.activeWorld = meta.id;
    renderer.backdrop = meta.backdrop || 'obsidian';
    renderer.bgPhoto = null;
    $('btn-clear-bg-photo').classList.add('hidden');
    renderer.fxBloom = meta.bloom !== false;
    renderer.fxTrails = !!meta.trails;
    renderer.clearTrails();

    $('art-title-input').value = ui.lang === 'fr' ? meta.fr : meta.en;
    syncControlsFromEngine();
    renderAIWorldsPanel();
    updateWelcomeVisibility();
    showToast(`${meta.icon} ${ui.lang === 'fr' ? meta.fr : meta.en}`);
  }

  function syncControlsFromEngine() {
    $('slider-grav').value = engine.gravY;
    $('val-grav').textContent = engine.gravY === 0 ? '0G' : String(engine.gravY);
    $('slider-wind').value = engine.windX;
    $('val-wind').textContent = String(engine.windX);
    $('sel-backdrop').value = renderer.backdrop;
    $('btn-fx-3d').classList.toggle('active', renderer.fx3d);
    $('btn-fx-bloom').classList.toggle('active', renderer.fxBloom);
    $('btn-fx-trails').classList.toggle('active', renderer.fxTrails);
    $('chk-auto-strata').checked = engine.autoStrata;
    syncPlayPauseButton();
  }

  // =========================================================================
  // 3. INTERACTIVE PHOTO / STENCIL / TEXT PLACEMENT STAGE CONTROLLER!
  // =========================================================================

  function openPhotoStageFromImage(img, label, defaultOpts = {}) {
    const tmp = document.createElement('canvas');
    tmp.width = img.naturalWidth || img.width || 300;
    tmp.height = img.naturalHeight || img.height || 300;
    tmp.getContext('2d').drawImage(img, 0, 0, tmp.width, tmp.height);
    openPhotoStageFromCanvas(tmp, label, defaultOpts);
  }

  function openPhotoStageFromCanvas(srcCanvas, label, defaultOpts = {}) {
    const s = photoStage.openFromCanvas(srcCanvas, label, {
      cutoutMode: defaultOpts.cutoutMode || 'object', // Default RECOMMENDED: Object Only!
      bakeMode: defaultOpts.bakeMode || 'statue'
    });
    $('photo-stage-panel').classList.remove('hidden');
    $('pp-label').textContent = label;
    syncPhotoPanelFromSession();
    updateWelcomeVisibility();
    const modeTag = s.engineUsed === 'complex_lab'
      ? 'Smart Lab Subject Cutout'
      : (s.engineUsed === 'studio_flood' ? 'Clean Studio Cutout' : 'Transparent Cutout');
    showToast(`🦁 ${label}: ${modeTag} — Drag, resize or switch mode!`, 3200);
  }

  function closePhotoStage() {
    photoStage.close();
    ui.stageDrag = null;
    $('photo-stage-panel').classList.add('hidden');
    updateWelcomeVisibility();
  }

  function syncPhotoPanelFromSession() {
    const s = photoStage.session;
    if (!s) return;
    $('pp-mode-object').classList.toggle('active', s.cutoutMode === 'object');
    $('pp-mode-full').classList.toggle('active', s.cutoutMode === 'full');
    $('pp-object-controls').classList.toggle('hidden', s.cutoutMode !== 'object');
    $('pp-full-controls').classList.toggle('hidden', s.cutoutMode !== 'full');

    $('pp-sens').value = s.sensitivity;
    $('val-pp-sens').textContent = String(s.sensitivity);
    $('pp-feather').value = s.feather;
    $('val-pp-feather').textContent = `${s.feather}px`;
    $('pp-scale').value = Math.round(s.scale * 100);
    $('val-pp-scale').textContent = `${Math.round(s.scale * 100)}%`;
    $('pp-rot').value = Math.round(s.rotDeg);
    $('val-pp-rot').textContent = `${Math.round(s.rotDeg)}°`;
    $('pp-bake-mode').value = s.bakeMode;
    $('pp-style').value = s.style;
    $('pp-clear-before').checked = s.clearBefore;
    $('pp-pause-after').checked = s.pauseAfter;

    document.querySelectorAll('.pp-tool').forEach(b => b.classList.toggle('active', b.dataset.ptool === s.tool));
    document.querySelectorAll('.pp-shape').forEach(b => b.classList.toggle('active', b.dataset.pshape === s.shapeMask));
  }

  function openStencilsModal() {
    if (!ui.stencilsBuilt) {
      const grid = $('stencil-grid');
      grid.innerHTML = '';
      STENCILS.forEach(st => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'stencil-card';
        card.innerHTML = `<img src="models/${st.id}.png" loading="lazy" alt="${st.en}"><span>${ui.lang === 'fr' ? st.fr : st.en}</span>`;
        card.addEventListener('click', () => {
          const img = new Image();
          img.onload = () => {
            $('modal-stencils').classList.add('hidden');
            openPhotoStageFromImage(img, ui.lang === 'fr' ? st.fr : st.en, { cutoutMode: 'object', bakeMode: 'statue' });
          };
          img.onerror = () => showToast('❌ Failed to load stencil image');
          img.src = `models/${st.id}.png`;
        });
        grid.appendChild(card);
      });
      ui.stencilsBuilt = true;
    }
    $('modal-stencils').classList.remove('hidden');
  }

  function bindPhotoPanelEvents() {
    $('pp-close').addEventListener('click', closePhotoStage);

    $('pp-mode-object').addEventListener('click', () => {
      if (!photoStage.session) return;
      photoStage.session.cutoutMode = 'object';
      photoStage.recomputeMask(true);
      syncPhotoPanelFromSession();
    });
    $('pp-mode-full').addEventListener('click', () => {
      if (!photoStage.session) return;
      photoStage.session.cutoutMode = 'full';
      photoStage.session.tool = 'move';
      photoStage.recomputeMask(true);
      syncPhotoPanelFromSession();
    });

    $('pp-sens').addEventListener('input', e => {
      if (!photoStage.session) return;
      photoStage.session.sensitivity = Number(e.target.value);
      $('val-pp-sens').textContent = String(photoStage.session.sensitivity);
      photoStage.recomputeMask(false);
    });
    $('pp-feather').addEventListener('input', e => {
      if (!photoStage.session) return;
      photoStage.session.feather = Number(e.target.value);
      $('val-pp-feather').textContent = `${photoStage.session.feather}px`;
      photoStage.recomputeMask(false);
    });

    document.querySelectorAll('.pp-tool').forEach(b => {
      b.addEventListener('click', () => {
        if (!photoStage.session) return;
        photoStage.session.tool = b.dataset.ptool;
        syncPhotoPanelFromSession();
        if (b.dataset.ptool === 'wand') showToast('🪄 Click any background area on preview to erase it!');
      });
    });

    $('pp-undo-mask').addEventListener('click', () => {
      if (photoStage.undoMask()) showToast('↶ Cutout mask undone');
    });
    $('pp-reset-mask').addEventListener('click', () => {
      if (!photoStage.session) return;
      photoStage.recomputeMask(true);
      showToast('↺ Auto cutout recomputed');
    });

    document.querySelectorAll('.pp-shape').forEach(b => {
      b.addEventListener('click', () => {
        if (!photoStage.session) return;
        photoStage.session.shapeMask = b.dataset.pshape;
        photoStage.recomputeMask(true);
        syncPhotoPanelFromSession();
      });
    });

    $('pp-scale').addEventListener('input', e => {
      if (!photoStage.session) return;
      photoStage.session.scale = Math.max(0.15, Math.min(2.0, Number(e.target.value) / 100));
      $('val-pp-scale').textContent = `${Math.round(photoStage.session.scale * 100)}%`;
    });
    $('pp-rot').addEventListener('input', e => {
      if (!photoStage.session) return;
      photoStage.session.rotDeg = Number(e.target.value);
      $('val-pp-rot').textContent = `${Math.round(photoStage.session.rotDeg)}°`;
    });

    $('pp-flip-x').addEventListener('click', () => { if (photoStage.session) photoStage.session.flipX = !photoStage.session.flipX; });
    $('pp-flip-y').addEventListener('click', () => { if (photoStage.session) photoStage.session.flipY = !photoStage.session.flipY; });
    $('pp-align-center').addEventListener('click', () => { photoStage.align('center'); syncPhotoPanelFromSession(); });
    $('pp-align-ground').addEventListener('click', () => { photoStage.align('ground'); syncPhotoPanelFromSession(); });
    $('pp-align-fit').addEventListener('click', () => { photoStage.align('fit'); syncPhotoPanelFromSession(); });

    $('pp-bake-mode').addEventListener('change', e => { if (photoStage.session) photoStage.session.bakeMode = e.target.value; });
    $('pp-style').addEventListener('change', e => {
      if (!photoStage.session) return;
      photoStage.session.style = e.target.value;
      photoStage.rebuildPreview();
    });
    $('pp-clear-before').addEventListener('change', e => { if (photoStage.session) photoStage.session.clearBefore = e.target.checked; });
    $('pp-pause-after').addEventListener('change', e => { if (photoStage.session) photoStage.session.pauseAfter = e.target.checked; });

    $('pp-stamp').addEventListener('click', () => {
      if (!photoStage.session) return;
      const lbl = photoStage.session.label;
      const count = photoStage.bakeTo(engine);
      $('photo-stage-panel').classList.add('hidden');
      if (lbl) $('art-title-input').value = lbl;
      syncPlayPauseButton();
      updateWelcomeVisibility();
      showToast(`✨ Stamped ${lbl} (${count.toLocaleString('en-US')} particles)!`);
    });

    // BONUS GENIUS: Set uploaded photo as Static Gallery Backdrop behind live sand!
    $('pp-as-backdrop').addEventListener('click', () => {
      if (!photoStage.session) return;
      const s = photoStage.session;
      const bgCv = document.createElement('canvas');
      bgCv.width = s.srcW; bgCv.height = s.srcH;
      const bctx = bgCv.getContext('2d');
      const id = bctx.createImageData(s.srcW, s.srcH);
      id.data.set(s.rgba);
      bctx.putImageData(id, 0, 0);
      renderer.bgPhoto = bgCv;
      $('btn-clear-bg-photo').classList.remove('hidden');
      closePhotoStage();
      showToast('🌄 Photo set as Gallery Backdrop — paint live sand & gold right over it!', 3200);
    });
  }

  // =========================================================================
  // 4. CANVAS POINTER INTERACTION (PHOTO STAGE TRANSFORM + PAINT + KINETIC TOOLS!)
  // =========================================================================

  function getCanvasCoords(e) {
    const cv = $('sand-canvas');
    const rect = cv.getBoundingClientRect();
    return [
      Math.max(0, Math.min(engine.w - 1, ((e.clientX - rect.left) / rect.width) * engine.w)),
      Math.max(0, Math.min(engine.h - 1, ((e.clientY - rect.top) / rect.height) * engine.h))
    ];
  }

  function currentStrokeOpts() {
    return {
      matId: ui.activeMat,
      tool: ui.activeTool,
      radius: ui.brushSize,
      shape: ui.brushShape,
      symmetry: ui.symmetry,
      color: ui.customColor,
      laserDir: ui.laserDir
    };
  }

  function bindCanvasEvents() {
    const cv = $('sand-canvas');

    // Mouse wheel smoothly zooms active photo/stencil right on the canvas!
    cv.addEventListener('wheel', e => {
      if (!photoStage.active || !photoStage.session) return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? 1.07 : 0.93;
      photoStage.session.scale = Math.max(0.15, Math.min(2.0, photoStage.session.scale * delta));
      syncPhotoPanelFromSession();
    }, { passive: false });

    cv.addEventListener('pointerdown', e => {
      e.preventDefault();
      try { cv.setPointerCapture(e.pointerId); } catch (_) {}
      const [x, y] = getCanvasCoords(e);
      ui.cursor = { x, y, radius: ui.brushSize, shape: ui.brushShape, tool: ui.activeTool, inside: true };

      // A) Interactive Photo / Stencil / Text Placement Stage active!
      if (photoStage.active && photoStage.session) {
        const s = photoStage.session;
        const hit = photoStage.hitTest(x, y);
        if (hit === 'rotate') {
          ui.stageDrag = {
            mode: 'rotate',
            origRot: s.rotDeg,
            origAng: Math.atan2(y - s.cy, x - s.cx)
          };
          return;
        }
        if (hit === 'nw' || hit === 'ne' || hit === 'se' || hit === 'sw') {
          ui.stageDrag = {
            mode: 'resize',
            origScale: s.scale,
            origDist: Math.max(10, Math.hypot(x - s.cx, y - s.cy))
          };
          return;
        }
        if (s.tool === 'wand') {
          const removed = photoStage.applyMagicWandAt(x, y);
          if (removed > 0) showToast(`🪄 Erased ${removed.toLocaleString('en-US')} background pixels`);
          return;
        }
        if (s.tool === 'keep' || s.tool === 'erase') {
          photoStage.pushMaskUndo();
          photoStage.applyRefineAt(x, y, s.tool);
          ui.stageDrag = { mode: 'refine', refineMode: s.tool };
          return;
        }
        // Default: smooth Move / Drag anywhere on canvas!
        ui.stageDrag = { mode: 'move', startX: x, startY: y, origCx: s.cx, origCy: s.cy };
        return;
      }

      // B) Eyedropper Mode
      if (ui.activeTool === 'eyedropper') {
        const picked = engine.sampleColorAt(x, y);
        if (picked) {
          setCustomColor(picked, true);
          showToast(`💉 Picked ${picked.toUpperCase()}`);
        } else {
          showToast('💉 Click on a colored particle to pick its color');
        }
        setActiveTool('paint');
        return;
      }

      // C) Normal Material Painting OR Kinetic Sculpt Magic Tools!
      ui.isPointerDown = true;
      ui.lastX = x | 0; ui.lastY = y | 0;
      if (ui.activeTool === 'paint') {
        engine.drawStroke(ui.lastX, ui.lastY, ui.lastX, ui.lastY, currentStrokeOpts());
      } else {
        engine.applyKineticTool(ui.lastX, ui.lastY, ui.lastX, ui.lastY, currentStrokeOpts());
      }
      updateWelcomeVisibility();
    });

    cv.addEventListener('pointermove', e => {
      const [x, y] = getCanvasCoords(e);
      ui.cursor = { x, y, radius: ui.brushSize, shape: ui.brushShape, tool: ui.activeTool, inside: true };

      if (photoStage.active && photoStage.session) {
        const s = photoStage.session;
        if (!ui.stageDrag) {
          const hit = photoStage.hitTest(x, y);
          cv.style.cursor = hit === 'rotate' ? 'grab' : ((hit === 'nw' || hit === 'se') ? 'nwse-resize' : ((hit === 'ne' || hit === 'sw') ? 'nesw-resize' : (s.tool === 'move' ? 'move' : 'crosshair')));
          return;
        }
        if (ui.stageDrag.mode === 'move') {
          s.cx = Math.max(10, Math.min(engine.w - 10, ui.stageDrag.origCx + (x - ui.stageDrag.startX)));
          s.cy = Math.max(10, Math.min(engine.h - 10, ui.stageDrag.origCy + (y - ui.stageDrag.startY)));
        } else if (ui.stageDrag.mode === 'resize') {
          const curDist = Math.max(10, Math.hypot(x - s.cx, y - s.cy));
          s.scale = Math.max(0.15, Math.min(2.0, ui.stageDrag.origScale * (curDist / ui.stageDrag.origDist)));
          syncPhotoPanelFromSession();
        } else if (ui.stageDrag.mode === 'rotate') {
          const curAng = Math.atan2(y - s.cy, x - s.cx);
          let deg = ui.stageDrag.origRot + ((curAng - ui.stageDrag.origAng) * 180) / Math.PI;
          while (deg > 180) deg -= 360;
          while (deg < -180) deg += 360;
          s.rotDeg = Math.round(deg);
          syncPhotoPanelFromSession();
        } else if (ui.stageDrag.mode === 'refine') {
          photoStage.applyRefineAt(x, y, ui.stageDrag.refineMode);
        }
        return;
      }

      if (!ui.isPointerDown) return;
      const ix = x | 0, iy = y | 0;
      if (ui.activeTool === 'paint') {
        engine.drawStroke(ui.lastX, ui.lastY, ix, iy, currentStrokeOpts());
      } else {
        engine.applyKineticTool(ui.lastX, ui.lastY, ix, iy, currentStrokeOpts());
      }
      ui.lastX = ix; ui.lastY = iy;
    });

    const endPointer = () => {
      if (ui.stageDrag) { ui.stageDrag = null; return; }
      if (!ui.isPointerDown) return;
      ui.isPointerDown = false;
      engine.pushUndo();
      updateWelcomeVisibility();
    };
    cv.addEventListener('pointerup', endPointer);
    cv.addEventListener('pointercancel', endPointer);
    cv.addEventListener('pointerleave', () => { ui.cursor.inside = false; });
  }

  // =========================================================================
  // 5. EXPORT PERMISSION GATE (Studios-Pro BroadcastChannel — ZERO FALSE TRAPS!)
  // =========================================================================

  function setExportStatus(msg) {
    const bar = $('export-status-bar');
    if (!msg) { bar.classList.add('hidden'); return; }
    bar.textContent = msg;
    bar.classList.remove('hidden');
  }

  function executePendingExport() {
    if (!ui.pendingExport) return;
    const { format, fn } = ui.pendingExport;
    ui.pendingExport = null;
    Promise.resolve(fn())
      .then(() => {
        if (hostChannel) {
          try { hostChannel.postMessage({ type: 'EXPORT_COMPLETED', payload: { format, app: 'sandbox' }, _msgId: 'zs_done_' + Date.now() }); } catch (_) {}
        }
      })
      .catch(err => setExportStatus('❌ ' + (err?.message || String(err))));
  }

  function requestExportPermission(format, fn) {
    if (window.parent === window || ui.isPro) {
      Promise.resolve(fn()).catch(err => setExportStatus('❌ ' + (err?.message || String(err))));
      return;
    }
    setExportStatus(ui.lang === 'fr' ? '⏳ Vérification de l’autorisation d’export...' : '⏳ Verifying export permission...');
    ui.pendingExport = { format, fn };
    const msg = {
      type: 'TRIGGER_PAYMENT_MODAL',
      payload: { format, app: 'sandbox' },
      _msgId: 'zs_exp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)
    };
    if (hostChannel) hostChannel.postMessage(msg);
    else window.parent.postMessage(msg, '*');
  }

  function handleHostMessage(d) {
    if (!d || typeof d !== 'object') return;
    if (d.type === 'SET_LANG' && d.lang) setLanguage(d.lang);
    else if (d.type === 'USER_TIER_STATUS') ui.isPro = !!(d.isPro || d.tier === 'pro' || d.tier === 'vip');
    else if (d.type === 'USER_STATUS_RESPONSE' && d.payload) ui.isPro = !!d.payload.isPremium;
    else if (d.type === 'EXPORT_ALLOWED') {
      if (d.payload && d.payload.isPremium) ui.isPro = true;
      executePendingExport();
    } else if (d.type === 'SHOW_PAYWALL_MODAL' || d.type === 'EXPORT_BLOCKED') {
      ui.pendingExport = null;
      setExportStatus('');
    }
  }
  window.addEventListener('message', e => { if (e.origin !== window.location.origin) return; handleHostMessage(e.data); });
  if (hostChannel) hostChannel.onmessage = e => handleHostMessage(e.data);

  // =========================================================================
  // 6. BILINGUAL I18N (EN / FR)
  // =========================================================================

  function setLanguage(lang) {
    ui.lang = lang === 'fr' ? 'fr' : 'en';
    const dict = SM.getT(ui.lang);
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const k = el.getAttribute('data-i18n');
      if (dict[k]) el.textContent = dict[k];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const k = el.getAttribute('data-i18n-placeholder');
      if (dict[k]) el.placeholder = dict[k];
    });
    $('btn-lang-en').classList.toggle('active', ui.lang === 'en');
    $('btn-lang-fr').classList.toggle('active', ui.lang === 'fr');
    ui.stencilsBuilt = false;
    renderMaterialsPanel();
    renderAIWorldsPanel();
    syncPlayPauseButton();
  }

  // =========================================================================
  // 7. EVENT BINDINGS
  // =========================================================================

  function bindEvents() {
    // Clean CLOSE_STUDIO
    $('btn-back').addEventListener('click', () => {
      if (EX.isRecording()) EX.stopVideoRec();
      ZA.shutdown();
      if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'CLOSE_STUDIO' }, '*');
      else showToast('Studio stopped cleanly');
    });

    // AI Prompt Bar
    const runPrompt = () => {
      const txt = $('ai-prompt-input').value.trim();
      if (!txt) return;
      const p = AI.parseArtPrompt(txt);
      loadLivingWorld(p.worldId, { palette: p.palette || undefined, grav: p.grav });
    };
    $('btn-ai-prompt').addEventListener('click', runPrompt);
    $('ai-prompt-input').addEventListener('keydown', e => { if (e.key === 'Enter') runPrompt(); });

    // Play / Pause / Step / Undo / Redo / Blank Canvas
    $('btn-play-pause').addEventListener('click', () => {
      engine.isPaused = !engine.isPaused;
      syncPlayPauseButton();
    });
    $('btn-step').addEventListener('click', () => {
      const prev = engine.isPaused;
      engine.isPaused = false;
      engine.step();
      engine.isPaused = prev;
    });
    $('btn-undo').addEventListener('click', () => { if (engine.undo()) { renderer.clearTrails(); updateWelcomeVisibility(); showToast('↶ Undo'); } });
    $('btn-redo').addEventListener('click', () => { if (engine.redo()) { renderer.clearTrails(); updateWelcomeVisibility(); showToast('↷ Redo'); } });
    $('btn-clear').addEventListener('click', () => resetToBlankCanvas(false));
    $('btn-world-blank').addEventListener('click', () => resetToBlankCanvas(false));

    // Blank Canvas Quick-Start Welcome Pills
    $('bw-draw').addEventListener('click', () => {
      $('blank-welcome').classList.add('hidden');
      setCustomColor('#f5c542', true);
      showToast('🖌 Start drawing directly on the blank canvas!');
    });
    $('bw-photo').addEventListener('click', () => $('file-photo-sand').click());
    $('bw-stencils').addEventListener('click', openStencilsModal);
    $('bw-kyoto').addEventListener('click', () => loadLivingWorld('kyoto'));

    // Stencils, Photo Upload & Typography Text -> Living Sand!
    $('btn-stencils').addEventListener('click', openStencilsModal);
    $('btn-stencils-close').addEventListener('click', () => $('modal-stencils').classList.add('hidden'));
    $('modal-stencils').addEventListener('click', e => { if (e.target === $('modal-stencils')) $('modal-stencils').classList.add('hidden'); });

    $('btn-photo-sand').addEventListener('click', () => $('file-photo-sand').click());
    $('file-photo-sand').addEventListener('change', e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const cleanName = file.name.replace(/\.[^.]+$/, '');
          openPhotoStageFromImage(img, cleanName, { cutoutMode: 'object', bakeMode: 'statue' });
        };
        img.onerror = () => showToast('❌ Could not decode image');
        img.src = String(reader.result);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    });

    // Typography Text -> Living Sand Modal
    $('btn-text-sand').addEventListener('click', () => {
      $('text-sand-color').value = ui.customColor;
      $('modal-text').classList.remove('hidden');
      setTimeout(() => $('text-sand-input').focus(), 40);
    });
    $('btn-text-close').addEventListener('click', () => $('modal-text').classList.add('hidden'));
    $('modal-text').addEventListener('click', e => { if (e.target === $('modal-text')) $('modal-text').classList.add('hidden'); });
    document.querySelectorAll('.tfont-btn').forEach(b => {
      b.addEventListener('click', () => {
        ui.textFont = b.dataset.tfont;
        document.querySelectorAll('.tfont-btn').forEach(el => el.classList.toggle('active', el === b));
      });
    });
    $('btn-text-launch').addEventListener('click', () => {
      const txt = $('text-sand-input').value.trim() || 'ZEN ART';
      const hex = $('text-sand-color').value || ui.customColor;
      const cv = PC.InteractivePhotoStage.createTextCanvas(txt, ui.textFont, hex);
      $('modal-text').classList.add('hidden');
      openPhotoStageFromCanvas(cv, txt, { cutoutMode: 'object', bakeMode: 'sand' });
    });

    // Direct 1:1 AR Wall Art Handoff (FREE!)
    const runAR = () => {
      try {
        const res = EX.openARWallArt(engine, $('art-title-input').value);
        showToast(`📱 AR 3D Wall Art Ready (${(res.size / 1024).toFixed(0)} KB)`);
      } catch (err) {
        showToast('❌ AR Error: ' + err.message);
      }
    };
    $('btn-ar-wall').addEventListener('click', runAR);

    // Language
    $('btn-lang-en').addEventListener('click', () => setLanguage('en'));
    $('btn-lang-fr').addEventListener('click', () => setLanguage('fr'));

    // Dock Tabs
    document.querySelectorAll('.dock-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const t = tab.dataset.tab;
        document.querySelectorAll('.dock-tab').forEach(b => b.classList.toggle('active', b === tab));
        document.querySelectorAll('.dock-pane').forEach(p => p.classList.toggle('active', p.id === `pane-${t}`));
      });
    });

    // Color Studio Controls
    $('color-picker').addEventListener('input', e => setCustomColor(e.target.value, true));
    document.querySelectorAll('.cmode-btn[data-cmode]').forEach(b => {
      b.addEventListener('click', () => {
        setColorMode(b.dataset.cmode);
        showToast(`🎨 Color Mode: ${b.dataset.cmode.toUpperCase()}`);
      });
    });
    $('btn-eyedropper').addEventListener('click', () => {
      setActiveTool(ui.activeTool === 'eyedropper' ? 'paint' : 'eyedropper');
      if (ui.activeTool === 'eyedropper') showToast('💉 Click any colored grain on the canvas to pick its color!');
    });

    // Kinetic Magic Tools & Brush Controls
    document.querySelectorAll('.ktool-btn').forEach(b => {
      b.addEventListener('click', () => {
        setActiveTool(b.dataset.tool);
        showToast(`🛠 Tool: ${b.textContent.trim()}`);
      });
    });
    $('brush-size').addEventListener('input', e => {
      ui.brushSize = Number(e.target.value) || 10;
      $('val-brush-size').textContent = String(ui.brushSize);
    });
    document.querySelectorAll('.sym-btn').forEach(b => {
      b.addEventListener('click', () => {
        ui.symmetry = b.dataset.sym;
        document.querySelectorAll('.sym-btn').forEach(el => el.classList.toggle('active', el === b));
      });
    });
    document.querySelectorAll('.shape-btn').forEach(b => {
      b.addEventListener('click', () => {
        ui.brushShape = b.dataset.shape;
        document.querySelectorAll('.shape-btn').forEach(el => el.classList.toggle('active', el === b));
      });
    });
    document.querySelectorAll('.ldir-btn').forEach(b => {
      b.addEventListener('click', () => {
        ui.laserDir = Number(b.dataset.ldir) || 0;
        document.querySelectorAll('.ldir-btn').forEach(el => el.classList.toggle('active', el === b));
      });
    });
    $('chk-auto-strata').addEventListener('change', e => setColorMode(e.target.checked ? 'strata' : 'custom'));
    $('btn-harmonize').addEventListener('click', () => {
      AI.harmonizeCanvasPalette(engine, engine.paletteId);
      showToast('✨ Artwork harmonized to palette!');
    });

    // Magnetic Reverse-Sand Reassemble Controls!
    $('btn-lock-target').addEventListener('click', () => {
      const cnt = engine.lockReformTarget();
      if (cnt < 20) {
        showToast('⚠️ Draw or stamp artwork first before locking target!');
        return;
      }
      $('btn-magnetic-reform').disabled = false;
      $('reform-status').textContent = `📸 Target locked (${cnt.toLocaleString('en-US')} px) — melt or shatter, then hit Reassemble!`;
      showToast(`📸 Artwork target locked (${cnt.toLocaleString('en-US')} px)!`);
    });
    $('btn-magnetic-reform').addEventListener('click', () => {
      const flying = engine.startMagneticReform(75);
      if (flying > 0) {
        updateWelcomeVisibility();
        showToast(`⏪ Magnetically reassembling ${flying.toLocaleString('en-US')} living grains!`, 3000);
      }
    });

    // Visual Shaders & Custom Backdrop Color
    $('btn-fx-3d').addEventListener('click', e => { renderer.fx3d = !renderer.fx3d; e.currentTarget.classList.toggle('active', renderer.fx3d); });
    $('btn-fx-bloom').addEventListener('click', e => { renderer.fxBloom = !renderer.fxBloom; e.currentTarget.classList.toggle('active', renderer.fxBloom); });
    $('btn-fx-trails').addEventListener('click', e => {
      renderer.fxTrails = !renderer.fxTrails;
      if (!renderer.fxTrails) renderer.clearTrails();
      e.currentTarget.classList.toggle('active', renderer.fxTrails);
    });
    $('sel-backdrop').addEventListener('change', e => { renderer.backdrop = e.target.value; });
    $('bg-color-picker').addEventListener('input', e => {
      renderer.customBgHex = e.target.value;
      renderer.backdrop = 'custom';
      $('sel-backdrop').value = 'custom';
    });
    $('btn-clear-bg-photo').addEventListener('click', () => {
      renderer.bgPhoto = null;
      $('btn-clear-bg-photo').classList.add('hidden');
      updateWelcomeVisibility();
      showToast('🌄 Static gallery backdrop cleared');
    });

    // Physics Sliders
    $('slider-grav').addEventListener('input', e => {
      engine.gravY = Number(e.target.value);
      $('val-grav').textContent = engine.gravY === 0 ? '0G' : String(engine.gravY);
    });
    $('slider-wind').addEventListener('input', e => {
      engine.windX = Number(e.target.value);
      $('val-wind').textContent = String(engine.windX);
    });
    $('slider-speed').addEventListener('input', e => {
      engine.timeScale = Number(e.target.value) || 1;
      $('val-speed').textContent = `${engine.timeScale}×`;
    });

    // Zen Audio Controls
    $('btn-audio-toggle').addEventListener('click', e => {
      const on = ZA.setEnabled(!ZA.isEnabled());
      e.currentTarget.classList.toggle('active', on);
      e.currentTarget.innerHTML = `${on ? '🔊' : '🔇'} <span>${SM.getT(ui.lang).audioToggle}</span>`;
    });
    $('sel-scale').addEventListener('change', e => ZA.setScale(e.target.value));
    $('slider-vol').addEventListener('input', e => {
      ZA.setVolume(Number(e.target.value) / 100);
      $('val-vol').textContent = `${e.target.value}%`;
    });

    // FREE Save / Load .zsand
    const saveZsand = () => {
      const res = EX.exportProjectFree(engine, {
        fx3d: renderer.fx3d, fxBloom: renderer.fxBloom, fxTrails: renderer.fxTrails,
        backdrop: renderer.backdrop, customBgHex: renderer.customBgHex
      }, $('art-title-input').value);
      showToast(`💾 Saved ${res.filename} (${(res.size / 1024).toFixed(1)} KB)`);
      return res;
    };
    $('btn-save-zsand').addEventListener('click', saveZsand);
    $('btn-load-zsand').addEventListener('click', () => $('file-load-zsand').click());
    $('file-load-zsand').addEventListener('change', e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result));
          if (engine.deserializeRLE(data)) {
            if (data.fx) {
              if (data.fx.backdrop) renderer.backdrop = data.fx.backdrop;
              if (data.fx.customBgHex) { renderer.customBgHex = data.fx.customBgHex; $('bg-color-picker').value = data.fx.customBgHex; }
              if (data.fx.fx3d !== undefined) renderer.fx3d = !!data.fx.fx3d;
              if (data.fx.fxBloom !== undefined) renderer.fxBloom = !!data.fx.fxBloom;
              if (data.fx.fxTrails !== undefined) renderer.fxTrails = !!data.fx.fxTrails;
            }
            if (data.title) $('art-title-input').value = data.title;
            renderer.clearTrails();
            syncControlsFromEngine();
            updateWelcomeVisibility();
            showToast(`📂 Loaded ${file.name}`);
          } else showToast('❌ Invalid .zsand file');
        } catch (_) { showToast('❌ Parse error'); }
        e.target.value = '';
      };
      reader.readAsText(file);
    });

    // Export Modal & All 7 Cards
    $('btn-export-open').addEventListener('click', () => { setExportStatus(''); $('modal-export').classList.remove('hidden'); });
    $('btn-export-close').addEventListener('click', () => $('modal-export').classList.add('hidden'));
    $('modal-export').addEventListener('click', e => { if (e.target === $('modal-export')) $('modal-export').classList.add('hidden'); });

    $('exp-btn-png4k').addEventListener('click', () => requestExportPermission('png', async () => {
      renderer.render(engine, { clean: true });
      const res = await EX.exportFramed4KPNG($('sand-canvas'), $('art-title-input').value, $('chk-gallery-frame').checked);
      setExportStatus(`✅ Exported 4K Fine-Art Print: ${res.filename} (${(res.size / 1024).toFixed(0)} KB)`);
    }));

    const stopRecUI = () => {
      clearInterval(ui.recTimerId);
      ui.recTimerId = null;
      $('rec-badge').classList.add('hidden');
    };
    $('btn-stop-rec-pill').addEventListener('click', () => EX.stopVideoRec());

    $('exp-btn-video').addEventListener('click', () => {
      if (EX.isRecording()) { EX.stopVideoRec(); return; }
      requestExportPermission('mp4', () => {
        $('modal-export').classList.add('hidden');
        const info = EX.startVideoRec($('sand-canvas'), $('art-title-input').value, res => {
          stopRecUI();
          if (res) showToast(`🎬 Saved ${res.filename} (${(res.size / 1024).toFixed(0)} KB)`, 3500);
        });
        if (info) {
          ui.recStartMs = Date.now();
          $('rec-badge').classList.remove('hidden');
          ui.recTimerId = setInterval(() => {
            const sec = Math.floor((Date.now() - ui.recStartMs) / 1000);
            $('rec-txt').textContent = `REC ${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
          }, 400);
          showToast(`🔴 Recording Living Art (.${info.ext.toUpperCase()})...`);
        }
      });
    });

    $('exp-btn-html').addEventListener('click', () => requestExportPermission('html', () => {
      const res = EX.exportInteractiveHTML(engine, $('art-title-input').value);
      setExportStatus(`✅ Exported Interactive Web Art: ${res.filename} (${(res.size / 1024).toFixed(1)} KB)`);
    }));

    $('exp-btn-stl').addEventListener('click', () => requestExportPermission('stl', () => {
      const res = EX.exportReliefSTL(engine, $('art-title-input').value);
      setExportStatus(`✅ Exported Watertight 3D Sand-Relief STL: ${res.filename} (${(res.size / 1024).toFixed(0)} KB)`);
    }));

    $('exp-btn-glb').addEventListener('click', () => requestExportPermission('glb', () => {
      const res = EX.exportReliefGLB(engine, $('art-title-input').value);
      setExportStatus(`✅ Exported Colored 3D Relief GLB: ${res.filename} (${(res.size / 1024).toFixed(0)} KB)`);
    }));

    $('exp-btn-ar').addEventListener('click', () => {
      $('modal-export').classList.add('hidden');
      runAR();
    });

    $('exp-btn-zsand').addEventListener('click', () => {
      const res = saveZsand();
      setExportStatus(`✅ Saved FREE Backup: ${res.filename} (${(res.size / 1024).toFixed(1)} KB)`);
    });

    // Keyboard shortcuts (Space Pause, Ctrl+Z/Y Undo/Redo, Enter Stamp Stage, Escape Close)
    window.addEventListener('keydown', e => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
      if (e.code === 'Space') { e.preventDefault(); $('btn-play-pause').click(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); $('btn-undo').click(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); $('btn-redo').click(); }
      else if (e.key === 'Enter' && photoStage.active) { e.preventDefault(); $('pp-stamp').click(); }
      else if (e.key === 'Escape') {
        $('modal-export').classList.add('hidden');
        $('modal-stencils').classList.add('hidden');
        $('modal-text').classList.add('hidden');
        if (photoStage.active) closePhotoStage();
      }
    });
  }

  // =========================================================================
  // 8. HOST NEXUS CONTRACTS & DEBUG HOOKS
  // =========================================================================

  window.getAppState = () => ({
    ...engine.serializeRLE(),
    title: $('art-title-input').value,
    fx: {
      fx3d: renderer.fx3d, fxBloom: renderer.fxBloom, fxTrails: renderer.fxTrails,
      backdrop: renderer.backdrop, customBgHex: renderer.customBgHex
    }
  });

  window.getAppTags = () => ['zen-sandscape', 'generative-art', ui.activeWorld, engine.paletteId];

  // =========================================================================
  // 9. 60 FPS ANIMATION LOOP & CLEAN BLANK-CANVAS BOOT
  // =========================================================================

  let frameCounter = 0;
  function loop() {
    requestAnimationFrame(loop);
    if (document.hidden) return;

    // Hold-to-Pour continuous stream while pointer is held (when Photo Stage is inactive!)
    if (ui.isPointerDown && !photoStage.active) {
      if (ui.activeTool === 'paint') {
        engine.drawStroke(ui.lastX, ui.lastY, ui.lastX, ui.lastY, currentStrokeOpts());
      } else if (ui.activeTool === 'magnet' || ui.activeTool === 'tint' || ui.activeTool === 'melt' || ui.activeTool === 'freeze') {
        engine.applyKineticTool(ui.lastX, ui.lastY, ui.lastX, ui.lastY, currentStrokeOpts());
      }
    }

    if (engine.reformAnim && engine.reformAnim.active) {
      const stillRunning = engine.stepMagneticReform();
      if (!stillRunning) syncPlayPauseButton();
    } else if (!engine.isPaused) {
      const steps = Math.max(1, Math.min(3, engine.timeScale | 0));
      for (let s = 0; s < steps; s++) engine.step();
    }

    renderer.render(engine, {
      clean: EX.isRecording(),
      symmetry: ui.symmetry,
      cursor: ui.cursor,
      photoStage
    });

    if ((++frameCounter & 15) === 0) {
      $('stat-particles').textContent = `${engine.particlesCount.toLocaleString('en-US')} px`;
    }
  }

  function boot() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('lang') === 'fr') ui.lang = 'fr';

    renderQuickSwatches();
    bindCanvasEvents();
    bindPhotoPanelEvents();
    bindEvents();
    setLanguage(ui.lang);

    let restored = false;
    try {
      const raw = localStorage.getItem('sp_remix_state');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.format === 'studios-pro-zsand-v4' && engine.deserializeRLE(parsed)) {
          restored = true;
          localStorage.removeItem('sp_remix_state');
        }
      }
    } catch (_) {}

    // Recommended Clean Blank Studio Boot (zero clutter on launch!)
    if (!restored) {
      resetToBlankCanvas(true);
    } else {
      syncControlsFromEngine();
      updateWelcomeVisibility();
    }

    if (hostChannel && window.parent !== window) {
      try { hostChannel.postMessage({ type: 'GET_USER_STATUS' }); } catch (_) {}
    }

    loop();
  }

  boot();
})();
