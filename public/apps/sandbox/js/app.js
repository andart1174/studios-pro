/**
 * Zen Sandscape v4.0 — Main Atelier Application Controller
 * Wires SandMaterials + SandboxEngine (60 FPS) + AIDirector (12 Living Worlds & Prompt)
 * + ArtRenderer (3D Relief + Bloom + Trails + 8-Way Mandala) + ZenAudio (Non-Clipping Synth)
 * + SandExports (4K Print, MP4+Audio, Interactive HTML, 3D Relief STL/GLB & 1:1 AR Wall Art)
 * + Studios-Pro BroadcastChannel('studios_pro_channel') + Lazy Stencils!
 */
(function () {
  'use strict';

  const SM = window.SandMaterials;
  const AI = window.AIDirector;
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
    activeWorld: 'kyoto',
    brushSize: 10,
    brushShape: 'circle',
    symmetry: 'off',
    laserDir: 0,
    customColor: '#f5c542',
    isPro: false,
    pendingExport: null,
    isPointerDown: false,
    lastX: 0, lastY: 0,
    cursor: { x: 0, y: 0, radius: 10, shape: 'circle', inside: false },
    recStartMs: 0,
    recTimerId: null,
    stencilsBuilt: false
  };

  const engine = new window.SandboxEngine(600, 420);
  const renderer = new window.ArtRenderer($('sand-canvas'), 600, 420);

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

  // =========================================================================
  // 1. UI BUILDERS (MATERIALS, 12 AI WORLDS, 8 PALETTES, LAZY STENCILS)
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
        engine.autoStrata = true;
        $('chk-auto-strata').checked = true;
        pGrid.querySelectorAll('.pal-btn').forEach(el => el.classList.toggle('active', el.dataset.pal === p.id));
        showToast(`🎨 ${ui.lang === 'fr' ? p.fr : p.en}`);
      });
      pGrid.appendChild(b);
    });
  }

  function loadLivingWorld(worldId, opts = {}) {
    const meta = AI.buildWorld(engine, worldId, opts);
    ui.activeWorld = meta.id;
    renderer.backdrop = meta.backdrop || 'obsidian';
    renderer.fxBloom = meta.bloom !== false;
    renderer.fxTrails = !!meta.trails;
    renderer.clearTrails();

    $('art-title-input').value = ui.lang === 'fr' ? meta.fr : meta.en;
    syncControlsFromEngine();
    renderAIWorldsPanel();
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
  }

  // Lazy-load Stencils from models/*.png ONLY when user opens Stencils Modal (0 bytes at startup!)
  function openStencilsModal() {
    if (!ui.stencilsBuilt) {
      const grid = $('stencil-grid');
      grid.innerHTML = '';
      STENCILS.forEach(st => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'stencil-card';
        card.innerHTML = `<img src="models/${st.id}.png" loading="lazy" alt="${st.en}"><span>${ui.lang === 'fr' ? st.fr : st.en}</span>`;
        card.addEventListener('click', () => bakeImageFromUrl(`models/${st.id}.png`, ui.lang === 'fr' ? st.fr : st.en));
        grid.appendChild(card);
      });
      ui.stencilsBuilt = true;
    }
    $('modal-stencils').classList.remove('hidden');
  }

  function bakeImageFromUrl(src, label) {
    const img = new Image();
    img.onload = () => {
      const targetW = Math.min(340, engine.w - 40);
      const scale = Math.min(targetW / img.width, (engine.h - 40) / img.height);
      const dw = Math.max(40, Math.round(img.width * scale));
      const dh = Math.max(40, Math.round(img.height * scale));
      const tmp = document.createElement('canvas');
      tmp.width = dw; tmp.height = dh;
      const tctx = tmp.getContext('2d');
      tctx.drawImage(img, 0, 0, dw, dh);
      const data = tctx.getImageData(0, 0, dw, dh);
      const matId = Number($('sel-stencil-mat').value) || SM.MAT.SAND;
      const keepRgb = $('chk-stencil-rgb').checked;
      const count = AI.bakeImageDataToEngine(engine, data, dw, dh, { matId, preserveRGB: keepRgb, customHex: ui.customColor });
      $('modal-stencils').classList.add('hidden');
      showToast(`✨ Baked ${label} (${count.toLocaleString('en-US')} particles)`);
    };
    img.onerror = () => showToast('❌ Failed to load stencil image');
    img.src = src;
  }

  // =========================================================================
  // 2. CANVAS DRAWING INTERACTION (CONTINUOUS STROKE + HOLD-TO-POUR!)
  // =========================================================================

  function getCanvasCoords(e) {
    const cv = $('sand-canvas');
    const rect = cv.getBoundingClientRect();
    return [
      Math.max(0, Math.min(engine.w - 1, Math.floor(((e.clientX - rect.left) / rect.width) * engine.w))),
      Math.max(0, Math.min(engine.h - 1, Math.floor(((e.clientY - rect.top) / rect.height) * engine.h)))
    ];
  }

  function currentStrokeOpts() {
    return {
      matId: ui.activeMat,
      radius: ui.brushSize,
      shape: ui.brushShape,
      symmetry: ui.symmetry,
      color: ui.customColor,
      laserDir: ui.laserDir
    };
  }

  function bindCanvasEvents() {
    const cv = $('sand-canvas');
    cv.addEventListener('pointerdown', e => {
      e.preventDefault();
      try { cv.setPointerCapture(e.pointerId); } catch (_) {}
      const [x, y] = getCanvasCoords(e);
      ui.isPointerDown = true;
      ui.lastX = x; ui.lastY = y;
      ui.cursor = { x, y, radius: ui.brushSize, shape: ui.brushShape, inside: true };
      engine.drawStroke(x, y, x, y, currentStrokeOpts());
    });

    cv.addEventListener('pointermove', e => {
      const [x, y] = getCanvasCoords(e);
      ui.cursor = { x, y, radius: ui.brushSize, shape: ui.brushShape, inside: true };
      if (!ui.isPointerDown) return;
      engine.drawStroke(ui.lastX, ui.lastY, x, y, currentStrokeOpts());
      ui.lastX = x; ui.lastY = y;
    });

    const endStroke = () => {
      if (!ui.isPointerDown) return;
      ui.isPointerDown = false;
      engine.pushUndo();
    };
    cv.addEventListener('pointerup', endStroke);
    cv.addEventListener('pointercancel', endStroke);
    cv.addEventListener('pointerleave', () => { ui.cursor.inside = false; });
  }

  // =========================================================================
  // 3. EXPORT PERMISSION GATE (Studios-Pro BroadcastChannel — ZERO FALSE TRAPS!)
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
  window.addEventListener('message', e => handleHostMessage(e.data));
  if (hostChannel) hostChannel.onmessage = e => handleHostMessage(e.data);

  // =========================================================================
  // 4. BILINGUAL I18N (EN / FR)
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
  }

  // =========================================================================
  // 5. EVENT BINDINGS
  // =========================================================================

  function bindEvents() {
    // Clean CLOSE_STUDIO (shuts down audio & any active video recording!)
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

    // Play / Pause / Step / Undo / Redo / Clear
    $('btn-play-pause').addEventListener('click', () => {
      engine.isPaused = !engine.isPaused;
      const t = SM.getT(ui.lang);
      $('btn-play-pause').classList.toggle('active', !engine.isPaused);
      $('btn-play-pause').innerHTML = engine.isPaused ? `▶ <span>${t.play}</span>` : `⏸ <span>${t.pause}</span>`;
    });
    $('btn-step').addEventListener('click', () => {
      const prev = engine.isPaused;
      engine.isPaused = false;
      engine.step();
      engine.isPaused = prev;
    });
    $('btn-undo').addEventListener('click', () => { if (engine.undo()) { renderer.clearTrails(); showToast('↶ Undo'); } });
    $('btn-redo').addEventListener('click', () => { if (engine.redo()) { renderer.clearTrails(); showToast('↷ Redo'); } });
    $('btn-clear').addEventListener('click', () => { engine.clear(); renderer.clearTrails(); engine.pushUndo(); showToast('🗑 Canvas cleared'); });

    // Stencils & Full-Color Photo->Living Sand Upload
    $('btn-stencils').addEventListener('click', openStencilsModal);
    $('btn-stencils-close').addEventListener('click', () => $('modal-stencils').classList.add('hidden'));
    $('modal-stencils').addEventListener('click', e => { if (e.target === $('modal-stencils')) $('modal-stencils').classList.add('hidden'); });

    $('btn-photo-sand').addEventListener('click', () => $('file-photo-sand').click());
    $('file-photo-sand').addEventListener('change', e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => bakeImageFromUrl(String(reader.result), file.name);
      reader.readAsDataURL(file);
      e.target.value = '';
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

    // Brush, Symmetry, Shapes, Laser Dir & Palette Harmonize
    $('brush-size').addEventListener('input', e => {
      ui.brushSize = Number(e.target.value) || 10;
      $('val-brush-size').textContent = String(ui.brushSize);
    });
    $('color-picker').addEventListener('input', e => {
      ui.customColor = e.target.value;
      engine.autoStrata = false;
      $('chk-auto-strata').checked = false;
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
    $('chk-auto-strata').addEventListener('change', e => { engine.autoStrata = e.target.checked; });
    $('btn-harmonize').addEventListener('click', () => {
      AI.harmonizeCanvasPalette(engine, engine.paletteId);
      showToast('✨ Artwork harmonized to palette!');
    });

    // Visual Shaders & Backdrops
    $('btn-fx-3d').addEventListener('click', e => { renderer.fx3d = !renderer.fx3d; e.currentTarget.classList.toggle('active', renderer.fx3d); });
    $('btn-fx-bloom').addEventListener('click', e => { renderer.fxBloom = !renderer.fxBloom; e.currentTarget.classList.toggle('active', renderer.fxBloom); });
    $('btn-fx-trails').addEventListener('click', e => {
      renderer.fxTrails = !renderer.fxTrails;
      if (!renderer.fxTrails) renderer.clearTrails();
      e.currentTarget.classList.toggle('active', renderer.fxTrails);
    });
    $('sel-backdrop').addEventListener('change', e => { renderer.backdrop = e.target.value; });

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
      const res = EX.exportProjectFree(engine, { fx3d: renderer.fx3d, fxBloom: renderer.fxBloom, fxTrails: renderer.fxTrails, backdrop: renderer.backdrop }, $('art-title-input').value);
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
              if (data.fx.fx3d !== undefined) renderer.fx3d = !!data.fx.fx3d;
              if (data.fx.fxBloom !== undefined) renderer.fxBloom = !!data.fx.fxBloom;
              if (data.fx.fxTrails !== undefined) renderer.fxTrails = !!data.fx.fxTrails;
            }
            if (data.title) $('art-title-input').value = data.title;
            renderer.clearTrails();
            syncControlsFromEngine();
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

    // Keyboard shortcuts (Space Pause, Ctrl+Z/Y Undo/Redo, Escape Close)
    window.addEventListener('keydown', e => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
      if (e.code === 'Space') { e.preventDefault(); $('btn-play-pause').click(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); $('btn-undo').click(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); $('btn-redo').click(); }
      else if (e.key === 'Escape') { $('modal-export').classList.add('hidden'); $('modal-stencils').classList.add('hidden'); }
    });
  }

  // =========================================================================
  // 6. HOST NEXUS CONTRACTS (getAppState, getAppTags, sp_remix_state)
  // =========================================================================

  window.getAppState = () => ({
    ...engine.serializeRLE(),
    title: $('art-title-input').value,
    fx: { fx3d: renderer.fx3d, fxBloom: renderer.fxBloom, fxTrails: renderer.fxTrails, backdrop: renderer.backdrop }
  });

  window.getAppTags = () => ['zen-sandscape', 'generative-art', ui.activeWorld, engine.paletteId];

  // =========================================================================
  // 7. 60 FPS ANIMATION LOOP & BOOT
  // =========================================================================

  let frameCounter = 0;
  function loop() {
    requestAnimationFrame(loop);
    if (document.hidden) return;

    // Hold-to-Pour continuous stream while pointer is held!
    if (ui.isPointerDown) {
      engine.drawStroke(ui.lastX, ui.lastY, ui.lastX, ui.lastY, currentStrokeOpts());
    }

    if (!engine.isPaused) {
      const steps = Math.max(1, Math.min(3, engine.timeScale | 0));
      for (let s = 0; s < steps; s++) engine.step();
    }

    renderer.render(engine, {
      clean: EX.isRecording(),
      symmetry: ui.symmetry,
      cursor: ui.cursor
    });

    if ((++frameCounter & 15) === 0) {
      $('stat-particles').textContent = `${engine.particlesCount.toLocaleString('en-US')} px`;
    }
  }

  function boot() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('lang') === 'fr') ui.lang = 'fr';

    bindCanvasEvents();
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

    if (!restored) loadLivingWorld('kyoto');

    if (hostChannel && window.parent !== window) {
      try { hostChannel.postMessage({ type: 'GET_USER_STATUS' }); } catch (_) {}
    }

    loop();
  }

  boot();
})();
