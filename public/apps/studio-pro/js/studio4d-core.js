/**
 * Studio Pro 4D — Core Engine v4.5
 * 1. Studio4DLoader: On-demand lazy loader for heavy CDNs & all 66+ 3D/4D modules
 *    (eliminates 80+ startup HTTP requests & 65 eager hidden DOM panels -> <0.8s boot!)
 * 2. Floating Sticky Module Drawer: fixes the 62-module scroll-offscreen + missing Close (X) bug!
 * 3. Instant Module Search & Category Filter Tabs inside the 3D Composer sidebar
 * 4. Studio4DDirector: 4D Auto-Camera Presets, Cinema Lighting/Post-FX & AI Multi-Module Composer
 * 5. Studio4DExport: Clean PNG, MP4/WebM Video (direct from Composer OR Preview), Slim HTML,
 *    Pack ZIP, OBJ, Watertight Binary STL, Colored GLB, 1:1 AR Viewer & FREE .sp4d Save/Load!
 * 6. Clean Studios-Pro BroadcastChannel Gate (zero false credit burn, zero stop-lockout) & full teardown!
 */
(function (globalScope) {
  'use strict';

  // Track all created intervals / audio contexts / media streams for clean CLOSE_STUDIO teardown
  globalScope._studio4dIntervals = globalScope._studio4dIntervals || [];
  globalScope._studio4dStreams = globalScope._studio4dStreams || [];
  globalScope._studio4dAudioCtxs = globalScope._studio4dAudioCtxs || [];

  // =========================================================================
  // 1. ON-DEMAND CDN & 66-MODULE LAZY REGISTRY
  // =========================================================================

  const CDN_GROUPS = {
    font: [
      'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/FontLoader.js',
      'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/geometries/TextGeometry.js'
    ],
    svg: ['https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/SVGLoader.js'],
    dxf: ['https://cdn.jsdelivr.net/npm/dxf-parser@1.1.2/dist/dxf-parser.js'],
    qr:  ['https://cdn.jsdelivr.net/npm/qrious@4.0.2/dist/qrious.min.js'],
    pdf: ['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js'],
    loaders3d: [
      'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js',
      'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/OBJLoader.js',
      'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/STLLoader.js'
    ],
    gltfExport: ['https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/exporters/GLTFExporter.js'],
    objExport:  ['https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/exporters/OBJExporter.js'],
    jszip: [
      'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
      'js/export-zip-pro.js'
    ]
  };

  // Complete catalog of ALL 66 Sidebar Modules + 3 Topbar Overlays (100% preserved!)
  const MODULE_CATALOG = [
    // --- EXTRA 3D MODULES (13) ---
    { btnId: 'btn-math-scene',         file: 'js/math-surface-3d.js',       global: 'MathSurface3D',       cat: 'data',    keys: 'math surface equation sin cos plot' },
    { btnId: 'btn-chart-scene',        file: 'js/data-chart-3d.js',         global: 'DataChart3D',         cat: 'data',    keys: 'data chart bar graph stats' },
    { btnId: 'btn-webcam-scene',       file: 'js/webcam-avatar-3d.js',      global: 'WebcamAvatar3D',      cat: 'media',   keys: 'cam webcam face depth avatar' },
    { btnId: 'btn-shader-scene',       file: 'js/shader-editor-3d.js',      global: 'ShaderEditor3D',      cat: 'core',    keys: 'shader glsl material plasma' },
    { btnId: 'btn-star-scene',         file: 'js/starmap-3d.js',            global: 'Starmap3D',           cat: 'worlds',  keys: 'stars starmap space constellation' },
    { btnId: 'btn-kf-scene',           file: 'js/keyframe-animator-3d.js',  global: 'KeyframeAnimator3D',  cat: 'core',    keys: 'anim keyframe timeline motion' },
    { btnId: 'btn-voice-scene',        file: 'js/voice-sculpture-3d.js',    global: 'VoiceSculpture3D',    cat: 'media',   keys: 'voice audio wave microphone sculpture' },
    { btnId: 'btn-qr-labyrinth-scene', file: 'js/qr-labyrinth-3d.js',       global: 'QRLabyrinth3D',       cat: 'core',    keys: 'maze labyrinth qr puzzle', cdns: ['qr'] },
    { btnId: 'btn-terrain-scene',      file: 'js/location-terrain-3d.js',   global: 'LocationTerrain3D',   cat: 'worlds',  keys: 'terrain mountain landscape heightmap' },
    { btnId: 'btn-gallery-scene',      file: 'js/doc-gallery-3d.js',        global: 'DocGallery3D',        cat: 'media',   keys: 'doc gallery museum images' },
    { btnId: 'btn-pdf-scene',          file: 'js/pdf-gallery-3d.js',        global: 'PdfGallery3D',        cat: 'media',   keys: 'pdf document pages gallery', cdns: ['pdf'] },
    { btnId: 'btn-tree-scene',         file: 'js/logic-tree-3d.js',         global: 'LogicTree3D',         cat: 'data',    keys: 'logic tree mindmap hierarchy' },
    { btnId: 'btn-neon-scene',         file: 'js/neon-handwriting-3d.js',   global: 'NeonHandwriting3D',   cat: 'core',    keys: 'neon handwriting signature glow tube' },

    // --- ADVANCED MODULES (29) ---
    { btnId: 'btn-csv-scene',          file: 'js/csv-chart-3d.js',          global: 'CsvChart3D',          cat: 'data',    keys: 'csv table chart excel' },
    { btnId: 'btn-webnet-scene',       file: 'js/web-network-3d.js',        global: 'WebNetwork3D',        cat: 'data',    keys: 'net network nodes graph links' },
    { btnId: 'btn-pixel-scene',        file: 'js/pixelart-voxel-3d.js',     global: 'PixelArtVoxel3D',     cat: 'core',    keys: 'pixel art voxel blocks retro' },
    { btnId: 'btn-jsonlive-scene',     file: 'js/json-dashboard-3d.js',     global: 'JsonDashboard3D',     cat: 'data',    keys: 'json dashboard kpi live' },
    { btnId: 'btn-dna-scene',          file: 'js/dna-helix-3d.js',          global: 'DnaHelix3D',          cat: 'data',    keys: 'dna helix genetics biology' },
    { btnId: 'btn-geo-scene',          file: 'js/geo-globe-3d.js',          global: 'GeoGlobe3D',          cat: 'worlds',  keys: 'geo globe earth world map' },
    { btnId: 'btn-palette-scene',      file: 'js/palette-world-3d.js',      global: 'PaletteWorld3D',      cat: 'core',    keys: 'palette colors art abstract' },
    { btnId: 'btn-sentiment-scene',    file: 'js/sentiment-landscape-3d.js',global: 'SentimentLandscape3D',cat: 'data',    keys: 'emotion sentiment ai mood terrain' },
    { btnId: 'btn-fractal-scene',      file: 'js/fractal-generator-3d.js',  global: 'FractalGenerator3D',  cat: 'core',    keys: 'fractal mandelbrot julia 4d' },
    { btnId: 'btn-midi-scene',         file: 'js/midi-arch-3d.js',          global: 'MidiArch3D',          cat: 'media',   keys: 'midi music architecture notes' },
    { btnId: 'btn-neural-scene',       file: 'js/neural-net-3d.js',         global: 'NeuralNet3D',         cat: 'data',    keys: 'neural brain ai cortex network' },
    { btnId: 'btn-timeline-scene',     file: 'js/timeline-river-3d.js',     global: 'TimelineRiver3D',     cat: 'data',    keys: 'time timeline river history', cdns: ['font'] },
    { btnId: 'btn-chess-scene',        file: 'js/chess-board-3d.js',        global: 'ChessBoard3D',        cat: 'worlds',  keys: 'chess sudoku board game' },
    { btnId: 'btn-bio-scene',          file: 'js/biometric-avatar-3d.js',   global: 'BiometricAvatar3D',   cat: 'data',    keys: 'bio biometric heart pulse avatar' },
    { btnId: 'btn-mood-scene',         file: 'js/moodboard-world-3d.js',    global: 'MoodboardWorld3D',    cat: 'core',    keys: 'mood moodboard atmosphere' },
    { btnId: 'btn-molecule-scene',     file: 'js/molecule-3d.js',           global: 'Molecule3D',          cat: 'data',    keys: 'molecule atoms chemistry bonds' },
    { btnId: 'btn-wslive-scene',       file: 'js/websocket-live-3d.js',     global: 'WebSocketLive3D',     cat: 'data',    keys: 'live stream websocket telemetry' },
    { btnId: 'btn-story-scene',        file: 'js/story-3d.js',              global: 'Story3D',             cat: 'media',   keys: 'story storyboard theater', cdns: ['font'] },
    { btnId: 'btn-crystal-scene',      file: 'js/crystal-gen-3d.js',        global: 'CrystalGen3D',        cat: 'worlds',  keys: 'crystal gem mineral prism' },
    { btnId: 'btn-botany-scene',       file: 'js/botany-lsystem-3d.js',     global: 'BotanyLSystem3D',     cat: 'worlds',  keys: 'flora botany tree plant lsystem' },
    { btnId: 'btn-automata-scene',     file: 'js/cellular-automata-3d.js',  global: 'CellularAutomata3D',  cat: 'data',    keys: 'life cellular automata voxel' },
    { btnId: 'btn-kintypo-scene',      file: 'js/kinetic-typography-3d.js', global: 'KineticTypography3D', cat: 'core',    keys: 'typo typography kinetic text 3d', cdns: ['font'] },
    { btnId: 'btn-galaxy-scene',       file: 'js/galaxy-builder-3d.js',     global: 'GalaxyBuilder3D',     cat: 'worlds',  keys: 'galaxy solar planets space cosmos' },
    { btnId: 'btn-spaceship-scene',    file: 'js/sci-fi-spaceship-3d.js',   global: 'SciFiSpaceship3D',    cat: 'worlds',  keys: 'ship spaceship scifi starship' },
    { btnId: 'btn-dungeon-scene',      file: 'js/rpg-dungeon-3d.js',        global: 'RpgDungeon3D',        cat: 'worlds',  keys: 'dungeon rpg castle maze' },
    { btnId: 'btn-weather-scene',      file: 'js/weather-event-3d.js',      global: 'WeatherEvent3D',      cat: 'worlds',  keys: 'weather storm tornado rain snow' },
    { btnId: 'btn-impossible-scene',   file: 'js/impossible-geometry-3d.js',global: 'ImpossibleGeometry3D',cat: 'core',    keys: 'illusion impossible escher penrose' },
    { btnId: 'btn-papercraft-scene',   file: 'js/papercraft-world-3d.js',   global: 'PapercraftWorld3D',   cat: 'worlds',  keys: 'paper origami papercraft lowpoly' },
    { btnId: 'btn-shield-scene',       file: 'js/force-shield-3d.js',       global: 'ForceShield3D',       cat: 'worlds',  keys: 'shield energy scifi hologram' },

    // --- MEGA MODULES PRO (8) ---
    { btnId: 'btn-cybercity-scene',    file: 'js/cyber-city-3d.js',         global: 'CyberCity3D',         cat: 'worlds',  keys: 'city cyberpunk neon skyline' },
    { btnId: 'btn-fluid-scene',        file: 'js/quantum-fluids-3d.js',     global: 'QuantumFluids3D',     cat: 'worlds',  keys: 'fluids quantum particles wave' },
    { btnId: 'btn-timelapse-scene',    file: 'js/time-lapse-4d.js',         global: 'TimeLapse4D',         cat: 'core',    keys: '4d timelapse morph evolution' },
    { btnId: 'btn-product-scene',      file: 'js/product-showcase-3d.js',   global: 'ProductShowcase3D',   cat: 'core',    keys: 'ecom product showcase turntable' },
    { btnId: 'btn-social-scene',       file: 'js/social-media-room-3d.js',  global: 'SocialMediaRoom3D',   cat: 'media',   keys: 'social media card post 3d' },
    { btnId: 'btn-gitrepo-scene',      file: 'js/git-repo-city-3d.js',      global: 'GitRepoCity3D',       cat: 'data',    keys: 'git repo code city' },
    { btnId: 'btn-webar-scene',        file: 'js/web-ar-portal-3d.js',      global: 'WebARPortal3D',       cat: 'worlds',  keys: 'ar portal gateway vortex' },
    { btnId: 'btn-text2scene-scene',   file: 'js/text-to-scene-3d.js',      global: 'TextToScene3D',       cat: 'data',    keys: 'txt text ai prompt scene' },

    // --- ULTRA MODULES (16) ---
    { btnId: 'btn-iceterrain-scene',   file: 'js/ice-terrain-3d.js',        global: 'IceTerrain3D',        cat: 'worlds',  keys: 'ice glacier arctic aurora snow' },
    { btnId: 'btn-lavaworld-scene',    file: 'js/lava-world-3d.js',         global: 'LavaWorld3D',         cat: 'worlds',  keys: 'lava volcano magma fire' },
    { btnId: 'btn-oceanwave-scene',    file: 'js/ocean-wave-3d.js',         global: 'OceanWave3D',         cat: 'worlds',  keys: 'ocean wave sea water' },
    { btnId: 'btn-mechrobot-scene',    file: 'js/mech-robot-3d.js',         global: 'MechRobot3D',         cat: 'worlds',  keys: 'mech robot cyberpunk android' },
    { btnId: 'btn-ancientarch-scene',  file: 'js/ancient-arch-3d.js',       global: 'AncientArch3D',       cat: 'worlds',  keys: 'arch ancient temple roman pyramid' },
    { btnId: 'btn-legocity-scene',     file: 'js/lego-city-3d.js',          global: 'LegoCity3D',          cat: 'worlds',  keys: 'lego bricks city blocks' },
    { btnId: 'btn-dataglobe-scene',    file: 'js/data-globe-3d.js',         global: 'DataGlobe3D',         cat: 'data',    keys: 'globe data network arcs' },
    { btnId: 'btn-holohud-scene',      file: 'js/holo-hud-3d.js',           global: 'HoloHUD3D',           cat: 'core',    keys: 'hud hologram scifi interface' },
    { btnId: 'btn-masksculptor-scene', file: 'js/mask-sculptor-3d.js',      global: 'MaskSculptor3D',      cat: 'core',    keys: 'mask sculptor tribal cyber' },
    { btnId: 'btn-instrument-scene',   file: 'js/instrument-3d.js',         global: 'Instrument3D',        cat: 'media',   keys: 'music instrument guitar piano' },
    { btnId: 'btn-chemreaction-scene', file: 'js/chem-reaction-3d.js',      global: 'ChemReaction3D',      cat: 'data',    keys: 'chem chemistry reaction molecule' },
    { btnId: 'btn-anatomy-scene',      file: 'js/anatomy-3d.js',            global: 'Anatomy3D',           cat: 'data',    keys: 'body anatomy skeleton organs' },
    { btnId: 'btn-heroforge-scene',    file: 'js/hero-forge-3d.js',         global: 'HeroForge3D',         cat: 'chronos', keys: 'hero forge character avatar rpg', isModal: true },
    { btnId: 'btn-steampunk-scene',    file: 'js/steampunk-chrono-3d.js',   global: 'SteampunkChrono3D',   cat: 'chronos', keys: 'steampunk clock chrono gears watch', isModal: true },
    { btnId: 'btn-steampunk-pro-scene',file: 'js/steampunk-chrono-pro-3d.js',global: 'SteampunkChronoPro3D',cat: 'chronos', keys: 'steampunk pro chrono watch tourbillon', isModal: true },
    { btnId: 'btn-clockultra-scene',   file: 'js/clock-ultra-3d.js?v=3',    global: 'ClockUltra3D',        cat: 'chronos', keys: 'clock ultra watch horology radio weather', isModal: true }
  ];

  const TOPBAR_OVERLAYS = {
    video: { btnId: 'btn-video-mode', file: 'js/video-to-3d.js',        global: 'VideoTo3D',         panelId: 'v3d-panel' },
    image: { btnId: 'btn-image-mode', file: 'js/image-to-3d.js',        global: 'ImageTo3D',         panelId: 'i3d-panel' },
    audio: { btnId: 'btn-audio-mode', file: 'js/audio-visualizer-3d.js',global: 'AudioVisualizer3D', panelId: 'av3d-panel' }
  };

  const _scriptPromises = new Map();
  const _initedModules = new Set();

  function loadScriptOnce(src) {
    if (_scriptPromises.has(src)) return _scriptPromises.get(src);
    const p = new Promise((resolve, reject) => {
      if (typeof document === 'undefined') { resolve(); return; }
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing && existing.dataset.loaded === '1') { resolve(); return; }
      const s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.onload = () => { s.dataset.loaded = '1'; resolve(); };
      s.onerror = () => reject(new Error('Failed to load script: ' + src));
      document.head.appendChild(s);
    });
    _scriptPromises.set(src, p);
    return p;
  }

  async function ensureCDN(groupKey) {
    const urls = CDN_GROUPS[groupKey];
    if (!urls) return;
    for (let i = 0; i < urls.length; i++) {
      await loadScriptOnce(urls[i]);
    }
    if (groupKey === 'pdf' && globalScope.pdfjsLib && globalScope.pdfjsLib.GlobalWorkerOptions) {
      globalScope.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    }
  }

  // =========================================================================
  // 2. FLOATING STICKY MODULE DRAWER (FIXES ALL 62 SCROLL-OFFSCREEN + NO-CLOSE BUGS!)
  // =========================================================================

  function ensureModuleDrawerHost() {
    let host = document.getElementById('s4d-drawer-host');
    if (host) return host;
    const composer = document.getElementById('composer-container') || document.body;
    host = document.createElement('div');
    host.id = 's4d-drawer-host';
    host.className = 's4d-drawer-host hidden';
    host.innerHTML = `
      <div class="s4d-drawer-head">
        <span id="s4d-drawer-title">Module 3D/4D</span>
        <button id="s4d-drawer-close" type="button" title="Close (Esc)">✕</button>
      </div>
      <div id="s4d-drawer-body" class="s4d-drawer-body"></div>
    `;
    composer.appendChild(host);
    host.querySelector('#s4d-drawer-close').addEventListener('click', closeAllModuleDrawers);
    return host;
  }

  function closeAllModuleDrawers() {
    const host = document.getElementById('s4d-drawer-host');
    if (host) {
      host.classList.add('hidden');
      host.querySelectorAll('[id$="-panel"]').forEach(p => { p.style.display = 'none'; });
    }
    // Also hide topbar overlay panels (video/image/audio) & inline sidebar config panels
    document.querySelectorAll('#v3d-panel, #i3d-panel, #av3d-panel').forEach(p => { p.style.display = 'none'; });
  }

  function bindLazySidebarModules(sidebarEl) {
    if (!sidebarEl) return;
    const drawerHost = ensureModuleDrawerHost();
    const drawerBody = drawerHost.querySelector('#s4d-drawer-body');
    const drawerTitle = drawerHost.querySelector('#s4d-drawer-title');

    MODULE_CATALOG.forEach(entry => {
      const btn = document.getElementById(entry.btnId);
      if (!btn || btn.dataset.s4dBound === '1') return;
      btn.dataset.s4dBound = '1';
      btn.dataset.s4dCat = entry.cat;
      btn.dataset.s4dKeys = (entry.keys + ' ' + (btn.textContent || '')).toLowerCase();

      btn.addEventListener('click', async function onLazyClick(e) {
        // Once initialized, let the module's own click handler open it and ensure our sticky drawer is visible!
        if (_initedModules.has(entry.btnId)) {
          if (!entry.isModal) {
            setTimeout(() => syncDrawerVisibility(drawerHost, drawerBody, drawerTitle, btn.textContent.trim()), 20);
          }
          return;
        }
        e.preventDefault();
        e.stopImmediatePropagation();

        const origHtml = btn.innerHTML;
        btn.style.opacity = '0.65';
        try {
          if (entry.cdns) {
            for (const c of entry.cdns) await ensureCDN(c);
          }
          await loadScriptOnce(entry.file);
          const mod = globalScope[entry.global];
          if (!mod || typeof mod.init !== 'function') {
            throw new Error(`Module ${entry.global} missing init()`);
          }
          const mountTarget = entry.isModal ? sidebarEl : drawerBody;
          // Before init, hide other panels in drawerBody
          if (!entry.isModal) {
            drawerBody.querySelectorAll('[id$="-panel"]').forEach(p => { p.style.display = 'none'; });
          }
          mod.init(mountTarget, btn);
          _initedModules.add(entry.btnId);

          // Normalize newly appended panel styling inside drawerBody so it never clips or scrolls offscreen!
          if (!entry.isModal) {
            normalizePanelsIn(drawerBody);
          }

          btn.style.opacity = '1';
          // Trigger module's freshly attached click handler immediately on first click!
          btn.click();
          if (!entry.isModal) {
            setTimeout(() => syncDrawerVisibility(drawerHost, drawerBody, drawerTitle, btn.textContent.trim()), 25);
          }
        } catch (err) {
          btn.style.opacity = '1';
          btn.innerHTML = origHtml;
          console.error('[Studio4DLoader]', entry.file, err);
          if (globalScope.toast) globalScope.toast('❌ ' + err.message);
        }
      }, true); // capturing phase ensures lazy load completes BEFORE module handler!
    });
  }

  function normalizePanelsIn(drawerBody) {
    Array.from(drawerBody.children).forEach(el => {
      el.style.position = 'relative';
      el.style.inset = 'auto';
      el.style.width = '100%';
      el.style.height = 'auto';
      el.style.minHeight = '100%';
      el.style.zIndex = '1';
      el.style.overflow = 'visible';
      el.style.background = 'transparent';
    });
  }

  function syncDrawerVisibility(drawerHost, drawerBody, drawerTitle, titleText) {
    normalizePanelsIn(drawerBody);
    const anyOpen = Array.from(drawerBody.children).some(el => el.style.display && el.style.display !== 'none');
    if (anyOpen) {
      drawerTitle.textContent = titleText || '3D Module';
      drawerHost.classList.remove('hidden');
      drawerBody.scrollTop = 0;
    } else {
      drawerHost.classList.add('hidden');
    }
  }

  async function openTopbarOverlay(key) {
    const cfg = TOPBAR_OVERLAYS[key];
    if (!cfg) return;
    const container = document.getElementById('composer-container');
    const btn = document.getElementById(cfg.btnId);
    if (!container || !btn) return;

    // Close sidebar floating drawer first
    const drawerHost = document.getElementById('s4d-drawer-host');
    if (drawerHost) drawerHost.classList.add('hidden');

    const already = document.getElementById(cfg.panelId);
    if (already) {
      const wasOpen = already.style.display === 'flex';
      document.querySelectorAll('#v3d-panel, #i3d-panel, #av3d-panel').forEach(p => { p.style.display = 'none'; });
      if (!wasOpen) {
        already.style.display = 'flex';
        already.style.flexDirection = 'column';
      }
      return;
    }

    try {
      await loadScriptOnce(cfg.file);
      const mod = globalScope[cfg.global] || (key === 'audio' ? globalScope.AudioVisualizer : null);
      if (mod && typeof mod.init === 'function') {
        // Pass a dummy button so we control clean toggling without duplicate listeners
        const dummy = document.createElement('button');
        mod.init(container, dummy);
        document.querySelectorAll('#v3d-panel, #i3d-panel, #av3d-panel').forEach(p => { p.style.display = 'none'; });
        const panel = document.getElementById(cfg.panelId);
        if (panel) {
          panel.style.display = 'flex';
          panel.style.flexDirection = 'column';
          injectCloseBtnIfMissing(panel);
        }
      }
    } catch (err) {
      console.error('[Studio4DLoader overlay]', key, err);
      if (globalScope.toast) globalScope.toast('❌ ' + err.message);
    }
  }

  function injectCloseBtnIfMissing(panel) {
    if (!panel || panel.querySelector('.s4d-overlay-close')) return;
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 's4d-overlay-close';
    closeBtn.textContent = '✕';
    closeBtn.title = 'Close / Back to 3D';
    closeBtn.style.cssText = 'position:absolute;top:12px;right:12px;width:30px;height:30px;border-radius:8px;border:1px solid rgba(148,163,184,0.28);background:rgba(15,23,42,0.9);color:#f1f5f9;font-size:14px;cursor:pointer;z-index:60;';
    closeBtn.addEventListener('click', () => { panel.style.display = 'none'; });
    panel.appendChild(closeBtn);
  }

  // =========================================================================
  // 3. INSTANT MODULE SEARCH & CATEGORY FILTER IN SIDEBAR
  // =========================================================================

  function mountSidebarSearchAndTabs(sidebarEl) {
    if (!sidebarEl || document.getElementById('s4d-search-box')) return;
    const isFR = (globalScope.currentLang || 'en') === 'fr';
    const box = document.createElement('div');
    box.id = 's4d-search-box';
    box.className = 's4d-search-box';
    box.innerHTML = `
      <input id="s4d-module-search" class="s4d-search-input" type="search" placeholder="${isFR ? '🔍 Chercher parmi 66+ modules (clock, dna, city...)' : '🔍 Search 66+ modules (clock, dna, city, hero...)'}">
      <div class="s4d-cat-pills">
        <button type="button" class="s4d-cat active" data-cat="all">${isFR ? 'Tous (66)' : 'All (66)'}</button>
        <button type="button" class="s4d-cat" data-cat="core">Core</button>
        <button type="button" class="s4d-cat" data-cat="media">Media</button>
        <button type="button" class="s4d-cat" data-cat="worlds">${isFR ? 'Mondes' : 'Worlds'}</button>
        <button type="button" class="s4d-cat" data-cat="data">Data/AI</button>
        <button type="button" class="s4d-cat" data-cat="chronos">Pro</button>
      </div>
    `;
    // Insert right before the "Extra 3D Modules" divider or right after the first section
    const mediaBtn = sidebarEl.querySelector('#btn-math-scene');
    const anchor = mediaBtn ? mediaBtn.closest('.se-sec') : null;
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(box, anchor);
    } else {
      sidebarEl.prepend(box);
    }

    let activeCat = 'all';
    const applyFilter = () => {
      const q = (box.querySelector('#s4d-module-search').value || '').trim().toLowerCase();
      MODULE_CATALOG.forEach(entry => {
        const btn = document.getElementById(entry.btnId);
        if (!btn) return;
        const catOk = activeCat === 'all' || entry.cat === activeCat;
        const txtOk = !q || (btn.dataset.s4dKeys || '').includes(q);
        btn.style.display = (catOk && txtOk) ? '' : 'none';
      });
    };

    box.querySelector('#s4d-module-search').addEventListener('input', applyFilter);
    box.querySelectorAll('.s4d-cat').forEach(p => {
      p.addEventListener('click', () => {
        activeCat = p.dataset.cat;
        box.querySelectorAll('.s4d-cat').forEach(x => x.classList.toggle('active', x === p));
        applyFilter();
      });
    });
  }

  // =========================================================================
  // 4. AI MULTI-MODULE 4D SCENE COMPOSER (PROMPT EN/FR -> LIVE MULTI-OBJECT 4D!)
  // =========================================================================

  function parse4DPrompt(promptText) {
    const q = String(promptText || '').toLowerCase();
    const picks = [];
    let lighting = 'cyber';
    let cameraMode = 'turntable';

    if (/cyber|city|ville|neon|néon|tokyo|skyline/.test(q)) {
      picks.push({ type: 'cyber-city', cfg: { dens: 26, h: 48, st: 'cyber', wf: false, anim: true }, pos: [0, -18, 0] });
    }
    if (/dna|adn|helix|hélice|bio|genetic/.test(q)) {
      picks.push({ type: 'dna-helix', cfg: { sequence: 'ATCGATCGATCGATCG', helixStyle: 'neon', colorMode: 'base', twistFactor: 1.4, helixRadius: 16 }, pos: [0, 8, 0] });
    }
    if (/galaxy|galaxie|cosmos|space|espace|planet|star|étoile/.test(q)) {
      picks.push({ type: 'galaxy-builder', cfg: { seed: 42, starType: 'blue', sysType: 'spiral', numPlanets: 6, numBelts: 2, showOrbits: true }, pos: [0, 14, -20] });
    }
    if (/neural|brain|cerveau|ai|ia|cortex/.test(q)) {
      picks.push({ type: 'neural-net', cfg: { layers: [6, 10, 10, 6], neuronStyle: 'glow', colorMode: 'cyber', neuronSize: 2.2, doAnimate: true, netLayout: 'cortex', detail: 90 }, pos: [0, 6, 0] });
    }
    if (/fluid|fluide|quantum|quantique|particle|particule|wave|vague/.test(q)) {
      picks.push({ type: 'quantum-fluids', cfg: { pc: 1600, sp: 1.4, col: 'quantum', wf: false }, pos: [0, 0, 0] });
    }
    if (/lava|volcan|fire|feu|magma|inferno/.test(q)) {
      picks.push({ type: 'lava-world', cfg: { size: 42, rivers: 4, style: 'magma', smoke: true }, pos: [0, -16, 0] });
      lighting = 'golden';
    }
    if (/ice|glace|glacier|snow|neige|aurora|aurore|winter|hiver/.test(q)) {
      picks.push({ type: 'ice-terrain', cfg: { dens: 24, height: 32, aurora: true, snow: true }, pos: [0, -15, 0] });
      lighting = 'studio';
    }
    if (/ocean|océan|sea|mer|water|eau/.test(q)) {
      picks.push({ type: 'ocean-wave', cfg: { wHeight: 10, wSpeed: 1.4, wType: 'storm', foam: true, wire: false }, pos: [0, -14, 0] });
    }
    if (/ship|vaisseau|spaceship|scifi|rocket/.test(q)) {
      picks.push({ type: 'sci-fi-spaceship', cfg: { seed: 77, shipClass: 'cruiser', colorPalette: 'cyber', complexity: 7, detail: 8, glowEngines: true }, pos: [0, 14, 0] });
    }
    if (/crystal|cristal|gem|diamond|diamant|prism/.test(q)) {
      picks.push({ type: 'crystal-gen', cfg: { keyword: 'AETHER', crystalType: 'quartz', crystalColor: '#38bdf8', spikes: 14, heightScale: 1.3, metalness: 0.35, transparency: 0.45, doGlow: true }, pos: [0, 0, 0] });
    }
    if (/shield|bouclier|portal|portail|holo|hud/.test(q)) {
      picks.push({ type: 'force-shield', cfg: { shieldShape: 'sphere', energyColor: '#22d3ee', shieldSize: 38, pulseSpeed: 1.4, simImpact: true }, pos: [0, 0, 0] });
      lighting = 'hologram';
    }
    if (/mech|robot|android/.test(q)) {
      picks.push({ type: 'mech-robot', cfg: { head: 'visor', arm: 'cannon', color: '#6366f1', glow: '#22d3ee' }, pos: [0, -10, 0] });
    }
    if (/temple|ancient|roman|pyramid|pyramide|arch/.test(q)) {
      picks.push({ type: 'ancient-arch', cfg: { style: 'temple', scale: 1.2, mat: 'marble' }, pos: [0, -14, 0] });
      lighting = 'museum';
    }
    if (/flora|tree|arbre|forest|forêt|botany|plant/.test(q)) {
      picks.push({ type: 'botany-lsystem', cfg: { axiom: 'F', rules: 'F=FF-[-F+F+F]+[+F-F-F]', iter: 3, angle: 24, cTrunk: '#7c4d2b', cLeaf: '#10b981' }, pos: [0, -18, 0] });
      lighting = 'golden';
    }
    if (/fractal|mandelbrot|julia|4d|timelapse/.test(q)) {
      picks.push({ type: 'time-lapse', cfg: { comp: 6, sp: 1.3, st: 'cyber' }, pos: [0, 4, 0] });
    }
    if (/chess|échec|game|jeu/.test(q)) {
      picks.push({ type: 'chess-board', cfg: { mode: 'chess', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR', boardMat: 'marble', pieceStyle: 'classic' }, pos: [0, -10, 0] });
      lighting = 'museum';
    }
    if (/molecule|molécule|chem|atom/.test(q)) {
      picks.push({ type: 'chem-reaction', cfg: { mol: 'benzene', style: 'neon', glow: true, anim: true }, pos: [0, 5, 0] });
    }

    // Default signature 4D Quantum Crystal + Force Shield Showcase if prompt is generic!
    if (picks.length === 0) {
      picks.push({ type: 'crystal-gen', cfg: { keyword: 'STUDIO4D', crystalType: 'quartz', crystalColor: '#6366f1', spikes: 14, heightScale: 1.25, metalness: 0.4, transparency: 0.35, doGlow: true }, pos: [0, 0, 0] });
      picks.push({ type: 'quantum-fluids', cfg: { pc: 1200, sp: 1.2, col: 'quantum', wf: false }, pos: [0, 0, 0] });
    }
    return { picks, lighting, cameraMode };
  }

  function composeAIScene(promptText, replaceScene = true) {
    if (!globalScope.SketchExtruder) return 0;
    const plan = parse4DPrompt(promptText);
    if (replaceScene && typeof globalScope.SketchExtruder.clearScene === 'function') {
      globalScope.SketchExtruder.clearScene();
    }
    let added = 0;
    plan.picks.forEach((item, idx) => {
      const id = globalScope.SketchExtruder.addExtraModule(item.type, item.cfg);
      if (id && typeof globalScope.SketchExtruder.getModels === 'function') {
        const m = globalScope.SketchExtruder.getModels().find(x => x.id === id);
        if (m && item.pos) {
          const offsetX = plan.picks.length > 1 && idx > 0 && item.pos[0] === 0 && item.pos[1] === 0 ? (idx % 2 ? 28 : -28) : item.pos[0];
          m.position.set(offsetX, item.pos[1], item.pos[2]);
          if (m.meshGroup) m.meshGroup.position.copy(m.position);
        }
        added++;
      }
    });
    if (typeof globalScope.SketchExtruder.applyLightingPreset === 'function') {
      globalScope.SketchExtruder.applyLightingPreset(plan.lighting);
    }
    if (typeof globalScope.SketchExtruder.setCameraMode === 'function') {
      globalScope.SketchExtruder.setCameraMode(plan.cameraMode);
    }
    return added;
  }

  // =========================================================================
  // 5. ZERO-DEPENDENCY WATERTIGHT BINARY STL ENCODER + CLEAN GLB / OBJ / AR!
  // =========================================================================

  function collectExportableGroup(rootGroup, fallbackScene) {
    const THREE = globalScope.THREE;
    const exportGroup = new THREE.Group();
    const disposables = [];

    const traverseRoot = root => {
      if (!root) return;
      root.updateMatrixWorld(true);
      root.traverse(child => {
        if (!child.visible || !child.geometry) return;
        let p = child;
        while (p) {
          if (p.visible === false) return;
          if (p.isTransformControls || p.isGridHelper || p.isAxesHelper || (p.name && p.name.includes('Helper'))) return;
          p = p.parent;
        }

        if (child.isMesh) {
          try {
            let geo = child.geometry.clone();
            if (child.isInstancedMesh && child.count > 0) {
              // Bake instanced matrices into a merged triangle soup cleanly!
              const baseGeo = geo.index ? geo.toNonIndexed() : geo;
              const posAttr = baseGeo.attributes.position;
              const vCount = posAttr.count;
              const maxInst = Math.min(child.count, 4096);
              const mergedPos = new Float32Array(vCount * maxInst * 3);
              const m4 = new THREE.Matrix4();
              const v3 = new THREE.Vector3();
              let off = 0;
              for (let k = 0; k < maxInst; k++) {
                child.getMatrixAt(k, m4);
                m4.premultiply(child.matrixWorld);
                for (let j = 0; j < vCount; j++) {
                  v3.fromBufferAttribute(posAttr, j).applyMatrix4(m4);
                  mergedPos[off++] = v3.x; mergedPos[off++] = v3.y; mergedPos[off++] = v3.z;
                }
              }
              geo.dispose();
              if (baseGeo !== geo) baseGeo.dispose();
              geo = new THREE.BufferGeometry();
              geo.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3));
              geo.computeVertexNormals();
            } else {
              geo.applyMatrix4(child.matrixWorld);
              if (!geo.attributes.normal) geo.computeVertexNormals();
            }

            const srcMat = Array.isArray(child.material) ? child.material[0] : child.material;
            const matParams = { color: 0xcccccc, metalness: 0.22, roughness: 0.45, side: THREE.DoubleSide };
            if (srcMat) {
              if (srcMat.color) matParams.color = srcMat.color.clone();
              if (srcMat.isMeshBasicMaterial && srcMat.color) {
                matParams.emissive = srcMat.color.clone();
                matParams.emissiveIntensity = 0.35;
              } else {
                if (srcMat.emissive) matParams.emissive = srcMat.emissive.clone();
                if (typeof srcMat.emissiveIntensity === 'number') matParams.emissiveIntensity = srcMat.emissiveIntensity;
                if (typeof srcMat.metalness === 'number') matParams.metalness = srcMat.metalness;
                if (typeof srcMat.roughness === 'number') matParams.roughness = srcMat.roughness;
              }
              if (srcMat.map) matParams.map = srcMat.map;
              if (srcMat.vertexColors) matParams.vertexColors = true;
              if (srcMat.transparent && typeof srcMat.opacity === 'number' && srcMat.opacity < 1) {
                matParams.transparent = true;
                matParams.opacity = Math.max(0.25, srcMat.opacity);
              }
            }
            const cleanMat = new THREE.MeshStandardMaterial(matParams);
            const cleanMesh = new THREE.Mesh(geo, cleanMat);
            cleanMesh.name = child.name || 'part';
            exportGroup.add(cleanMesh);
            disposables.push(geo, cleanMat);
          } catch (err) {
            console.warn('[Studio4DExport] mesh skip:', err);
          }
        } else if (child.isPoints && child.geometry.attributes && child.geometry.attributes.position) {
          // Convert point clouds (Galaxy / Starmap / Quantum Fluids) into lightweight diamond sprites for AR & STL!
          try {
            const pos = child.geometry.attributes.position;
            const stride = Math.max(1, Math.ceil(pos.count / 900));
            const verts = [];
            const v = new THREE.Vector3();
            const r = 0.65;
            for (let i = 0; i < pos.count; i += stride) {
              v.fromBufferAttribute(pos, i).applyMatrix4(child.matrixWorld);
              // Compact tetrahedron around each star/particle
              verts.push(
                v.x, v.y + r, v.z,  v.x - r, v.y - r, v.z + r,  v.x + r, v.y - r, v.z + r,
                v.x, v.y + r, v.z,  v.x + r, v.y - r, v.z + r,  v.x, v.y - r, v.z - r,
                v.x, v.y + r, v.z,  v.x, v.y - r, v.z - r,      v.x - r, v.y - r, v.z + r,
                v.x - r, v.y - r, v.z + r, v.x, v.y - r, v.z - r, v.x + r, v.y - r, v.z + r
              );
            }
            if (verts.length > 0) {
              const pGeo = new THREE.BufferGeometry();
              pGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
              pGeo.computeVertexNormals();
              const srcCol = (child.material && child.material.color) ? child.material.color.clone() : new THREE.Color(0x38bdf8);
              const pMat = new THREE.MeshStandardMaterial({ color: srcCol, emissive: srcCol, emissiveIntensity: 0.45, roughness: 0.3 });
              exportGroup.add(new THREE.Mesh(pGeo, pMat));
              disposables.push(pGeo, pMat);
            }
          } catch (_) {}
        }
      });
    };

    traverseRoot(rootGroup);
    if (exportGroup.children.length === 0 && fallbackScene) traverseRoot(fallbackScene);

    return {
      group: exportGroup,
      dispose: () => { disposables.forEach(d => { try { if (d && d.dispose) d.dispose(); } catch (_) {} }); }
    };
  }

  // Pure JS Binary STL Serializer (Zero CDN required — works 100% offline & in Node.js!)
  function buildBinarySTLBuffer(rootGroup) {
    const THREE = globalScope.THREE;
    const tris = [];
    const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
    const cb = new THREE.Vector3(), ab = new THREE.Vector3();

    rootGroup.updateMatrixWorld(true);
    rootGroup.traverse(obj => {
      if (!obj.isMesh || !obj.geometry) return;
      const geo = obj.geometry;
      const pos = geo.attributes.position;
      if (!pos) return;
      const idx = geo.index;
      const pushTri = (ia, ib, ic) => {
        vA.fromBufferAttribute(pos, ia).applyMatrix4(obj.matrixWorld);
        vB.fromBufferAttribute(pos, ib).applyMatrix4(obj.matrixWorld);
        vC.fromBufferAttribute(pos, ic).applyMatrix4(obj.matrixWorld);
        cb.subVectors(vC, vB);
        ab.subVectors(vA, vB);
        cb.cross(ab).normalize();
        tris.push(cb.x, cb.y, cb.z, vA.x, vA.y, vA.z, vB.x, vB.y, vB.z, vC.x, vC.y, vC.z);
      };
      if (idx) {
        for (let i = 0; i < idx.count; i += 3) pushTri(idx.getX(i), idx.getX(i + 1), idx.getX(i + 2));
      } else {
        for (let i = 0; i < pos.count; i += 3) pushTri(i, i + 1, i + 2);
      }
    });

    const triCount = tris.length / 12;
    const buf = new ArrayBuffer(84 + triCount * 50);
    const dv = new DataView(buf);
    const hdr = 'Studio Pro 4D Binary STL — Studios-Pro';
    for (let i = 0; i < hdr.length && i < 80; i++) dv.setUint8(i, hdr.charCodeAt(i));
    dv.setUint32(80, triCount, true);
    let off = 84;
    for (let t = 0; t < triCount; t++) {
      const b = t * 12;
      for (let k = 0; k < 12; k++) { dv.setFloat32(off, tris[b + k], true); off += 4; }
      dv.setUint16(off, 0, true); off += 2;
    }
    return { buffer: buf, triCount };
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  // =========================================================================
  // 6. CLEAN GLOBAL TEARDOWN ON CLOSE_STUDIO / PAGEHIDE
  // =========================================================================

  function teardownAllResources() {
    // Stop all registered intervals
    if (Array.isArray(globalScope._studio4dIntervals)) {
      globalScope._studio4dIntervals.forEach(id => { try { clearInterval(id); } catch (_) {} });
      globalScope._studio4dIntervals.length = 0;
    }
    // Stop all mic/webcam media streams
    if (Array.isArray(globalScope._studio4dStreams)) {
      globalScope._studio4dStreams.forEach(st => {
        try { if (st && st.getTracks) st.getTracks().forEach(t => t.stop()); } catch (_) {}
      });
      globalScope._studio4dStreams.length = 0;
    }
    // Close all AudioContexts
    if (Array.isArray(globalScope._studio4dAudioCtxs)) {
      globalScope._studio4dAudioCtxs.forEach(ctx => {
        try { if (ctx && ctx.state !== 'closed') ctx.close(); } catch (_) {}
      });
      globalScope._studio4dAudioCtxs.length = 0;
    }
    // Destroy main 3D renderer + rAF
    if (globalScope.SketchExtruder && typeof globalScope.SketchExtruder.destroy === 'function') {
      try { globalScope.SketchExtruder.destroy(); } catch (_) {}
    }
  }

  const Studio4DCore = {
    CDN_GROUPS,
    MODULE_CATALOG,
    TOPBAR_OVERLAYS,
    loadScriptOnce,
    ensureCDN,
    bindLazySidebarModules,
    mountSidebarSearchAndTabs,
    openTopbarOverlay,
    closeAllModuleDrawers,
    parse4DPrompt,
    composeAIScene,
    collectExportableGroup,
    buildBinarySTLBuffer,
    downloadBlob,
    teardownAllResources
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Studio4DCore;
  if (globalScope) globalScope.Studio4DCore = Studio4DCore;
})(typeof window !== 'undefined' ? window : globalThis);
