/**
 * 4D Music Composer (v4.0) — Leak-Free Three.js r165 4D Concert Stage Visualizer
 * Features:
 *  - Strict GPU resource disposal (zero VRAM leaks when switching models or neon titles!)
 *  - 17 Procedural 4D Visual Entities (all 15 classic + 4D Tesseract Hypercube + 32-Bar Audio Cathedral!)
 *  - 7 Neon Concert Color Themes + Live 3-Band FFT Audio Reactivity (Bass / Mid / Treble)
 *  - Floating 3D Neon Song Title Sprite (debounced & cleanly disposed)
 *  - Cinematic VJ Auto-Camera synced to bass transients + Lite Performance Mode
 *  - Automatic pause on document.hidden + preserveDrawingBuffer for MP4/WebM Music Video capture!
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const THEMES = {
  cyberpunk: { primary: 0x00f0ff, secondary: 0xff00aa, accent: 0x9b51e0, bg: 0x050712, grid: 0x102845 },
  synthwave: { primary: 0xff2a85, secondary: 0x00e5ff, accent: 0xffb703, bg: 0x0b0519, grid: 0x2d1145 },
  matrix:    { primary: 0x00ff6a, secondary: 0x00b84c, accent: 0xb8ffda, bg: 0x020d06, grid: 0x0c3018 },
  fire:      { primary: 0xff5a1f, secondary: 0xffc837, accent: 0xff1e56, bg: 0x110504, grid: 0x3b120c },
  ocean:     { primary: 0x00d2ff, secondary: 0x3a7bd5, accent: 0x70f8ba, bg: 0x030c18, grid: 0x0d2b45 },
  gold:      { primary: 0xffd166, secondary: 0xf4a261, accent: 0xfff3b0, bg: 0x0d0a04, grid: 0x332710 },
  vaporwave: { primary: 0xff71ce, secondary: 0x01cdfe, accent: 0xb967ff, bg: 0x0d071a, grid: 0x2e1745 }
};

const VISUAL_MODELS = [
  { id: 'tesseract',    en: '4D Tesseract Hypercube', fr: 'Hypercube 4D Tesseract' },
  { id: 'cathedral',    en: '3D Audio Cathedral',     fr: 'Cathédrale Spectre 3D' },
  { id: 'sentinel',     en: 'Cyber Sentinel',         fr: 'Sentinelle Cyber' },
  { id: 'jellyfish',    en: 'Bioluminescent Medusa',  fr: 'Méduse Bioluminescente' },
  { id: 'golem',        en: 'Crystal Golem',          fr: 'Golem de Cristal' },
  { id: 'seraphim',     en: 'Neon Seraphim',          fr: 'Séraphin Néon' },
  { id: 'arachnoid',    en: 'Mecha Arachnoid',        fr: 'Arachnoïde Méca' },
  { id: 'parasite',     en: 'Orbital Symbiote',       fr: 'Symbiote Orbital' },
  { id: 'twins',        en: 'Harmonic Twins',         fr: 'Jumeaux Harmoniques' },
  { id: 'lotus',        en: 'Sacred Lotus',           fr: 'Lotus Sacré' },
  { id: 'torusknot',    en: '4D Quantum Knot',        fr: 'Nœud Quantique 4D' },
  { id: 'icosahedron',  en: 'Plasma Core',            fr: 'Noyau Plasma' },
  { id: 'dodecahedron', en: 'Aether Crystal',         fr: 'Cristal Éther' },
  { id: 'torus',        en: 'Singularity Ring',       fr: 'Anneau Singularité' },
  { id: 'sphere',       en: 'Harmonic Globe',         fr: 'Globe Harmonique' },
  { id: 'pyramid',      en: 'Obsidian Pyramid',       fr: 'Pyramide Obsidienne' },
  { id: 'cube',         en: 'Monolith Cube',          fr: 'Cube Monolithe' }
];

// 4D Hypercube (Tesseract) canonical 16 vertices & 32 edges
const TESS_VERTS_4D = [];
for (let i = 0; i < 16; i++) {
  TESS_VERTS_4D.push([
    (i & 1) ? 1 : -1,
    (i & 2) ? 1 : -1,
    (i & 4) ? 1 : -1,
    (i & 8) ? 1 : -1
  ]);
}
const TESS_EDGES = [];
for (let i = 0; i < 16; i++) {
  for (let b = 0; b < 4; b++) {
    const j = i ^ (1 << b);
    if (j > i) TESS_EDGES.push([i, j]);
  }
}

function disposeObjectTree(root) {
  if (!root) return;
  root.traverse(obj => {
    if (obj.geometry) {
      try { obj.geometry.dispose(); } catch (_) {}
    }
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach(m => {
        if (!m) return;
        if (m.map) try { m.map.dispose(); } catch (_) {}
        if (m.emissiveMap) try { m.emissiveMap.dispose(); } catch (_) {}
        try { m.dispose(); } catch (_) {}
      });
    }
  });
}

const Visuals4D = (() => {
  let _container = null;
  let _scene = null, _camera = null, _renderer = null, _controls = null;
  let _ambientLight = null, _keyLight = null, _rimLight = null;
  let _gridHelper = null, _floorRing = null, _stars = null;
  let _entityGroup = null, _titleSprite = null;

  let _modelId = 'tesseract';
  let _themeId = 'cyberpunk';
  let _vjCamera = false;
  let _liteMode = false;
  let _rafId = null;
  let _clock = null;
  let _elapsed = 0;
  let _smoothBass = 0, _smoothMid = 0, _smoothTreble = 0;
  let _vjAngle = 0, _vjHeight = 2.4, _vjTargetHeight = 2.4, _lastCutTime = 0;
  let _pulseBoost = 0;

  // Dynamic handles for active animated models
  let _cathedralBars = [];
  let _tesseractLine = null;
  let _tesseractNodes = [];
  let _titleDebounce = null;
  let _resizeObserver = null;

  function getTheme() { return THEMES[_themeId] || THEMES.cyberpunk; }

  function init(containerEl) {
    if (!containerEl) return false;
    _container = containerEl;
    _clock = new THREE.Clock();

    const w = Math.max(320, _container.clientWidth || 800);
    const h = Math.max(240, _container.clientHeight || 480);

    _scene = new THREE.Scene();
    const th = getTheme();
    _scene.background = new THREE.Color(th.bg);
    _scene.fog = new THREE.FogExp2(th.bg, 0.042);

    _camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 160);
    _camera.position.set(0, 2.3, 7.6);

    _renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true, // Required for clean MP4/WebM capture & screenshots!
      powerPreference: 'high-performance'
    });
    _renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, _liteMode ? 1 : 1.75));
    _renderer.setSize(w, h);
    _renderer.toneMapping = THREE.ACESFilmicToneMapping;
    _renderer.toneMappingExposure = 1.18;

    _container.innerHTML = '';
    _container.appendChild(_renderer.domElement);

    _controls = new OrbitControls(_camera, _renderer.domElement);
    _controls.enableDamping = true;
    _controls.dampingFactor = 0.06;
    _controls.minDistance = 3.2;
    _controls.maxDistance = 18;
    _controls.maxPolarAngle = Math.PI * 0.56;
    _controls.target.set(0, 0.4, 0);

    // Stage Lights
    _ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    _keyLight = new THREE.PointLight(th.primary, 4.5, 30);
    _keyLight.position.set(4.5, 5.5, 5.5);
    _rimLight = new THREE.PointLight(th.secondary, 4.0, 30);
    _rimLight.position.set(-5.0, 3.0, -4.5);
    _scene.add(_ambientLight, _keyLight, _rimLight);

    // Neon Stage Floor Grid + Halo Ring
    _gridHelper = new THREE.GridHelper(34, 34, th.primary, th.grid);
    _gridHelper.position.y = -2.2;
    _scene.add(_gridHelper);

    const ringGeo = new THREE.RingGeometry(2.65, 2.78, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: th.primary, side: THREE.DoubleSide, transparent: true, opacity: 0.42 });
    _floorRing = new THREE.Mesh(ringGeo, ringMat);
    _floorRing.rotation.x = -Math.PI / 2;
    _floorRing.position.y = -2.18;
    _scene.add(_floorRing);

    buildStarfield();
    setModel(_modelId);

    // Resize handling
    if (typeof ResizeObserver !== 'undefined') {
      _resizeObserver = new ResizeObserver(() => handleResize());
      _resizeObserver.observe(_container);
    }
    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibility);

    startLoop();
    return true;
  }

  function buildStarfield() {
    if (_stars) {
      _scene.remove(_stars);
      disposeObjectTree(_stars);
      _stars = null;
    }
    const count = _liteMode ? 220 : 650;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 8 + Math.random() * 22;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) - 1.5;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: getTheme().primary,
      size: 0.11,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    _stars = new THREE.Points(geo, mat);
    _scene.add(_stars);
  }

  function makeWireAndSolid(geo, th, solidOpacity = 0.24) {
    const grp = new THREE.Group();
    const solidMat = new THREE.MeshStandardMaterial({
      color: th.primary,
      emissive: th.secondary,
      emissiveIntensity: 0.35,
      metalness: 0.65,
      roughness: 0.22,
      transparent: true,
      opacity: solidOpacity
    });
    const wireMat = new THREE.MeshBasicMaterial({
      color: th.primary,
      wireframe: true,
      transparent: true,
      opacity: 0.88
    });
    grp.add(new THREE.Mesh(geo, solidMat));
    grp.add(new THREE.Mesh(geo.clone(), wireMat));
    return grp;
  }

  function setModel(modelId) {
    _modelId = VISUAL_MODELS.some(m => m.id === modelId) ? modelId : 'tesseract';
    if (!_scene) return;

    // STRICT GPU CLEANUP — ZERO VRAM LEAK!
    if (_entityGroup) {
      _scene.remove(_entityGroup);
      disposeObjectTree(_entityGroup);
      _entityGroup = null;
    }
    _cathedralBars = [];
    _tesseractLine = null;
    _tesseractNodes = [];

    const th = getTheme();
    const g = new THREE.Group();
    g.position.y = 0.55;

    const primMat = new THREE.MeshStandardMaterial({
      color: th.primary, emissive: th.primary, emissiveIntensity: 0.42,
      metalness: 0.6, roughness: 0.25
    });
    const secMat = new THREE.MeshStandardMaterial({
      color: th.secondary, emissive: th.secondary, emissiveIntensity: 0.45,
      metalness: 0.55, roughness: 0.28
    });
    const wireMat = new THREE.MeshBasicMaterial({ color: th.accent, wireframe: true, transparent: true, opacity: 0.75 });

    switch (_modelId) {
      case 'tesseract': {
        // Real 4D Hypercube projected into 3D space (32 dynamic edges + 16 glowing nodes)!
        const edgePositions = new Float32Array(TESS_EDGES.length * 2 * 3);
        const lineGeo = new THREE.BufferGeometry();
        lineGeo.setAttribute('position', new THREE.BufferAttribute(edgePositions, 3));
        const lineMat = new THREE.LineBasicMaterial({ color: th.primary, transparent: true, opacity: 0.95 });
        _tesseractLine = new THREE.LineSegments(lineGeo, lineMat);
        g.add(_tesseractLine);

        const nodeGeo = new THREE.SphereGeometry(0.085, 10, 10);
        for (let i = 0; i < 16; i++) {
          const m = new THREE.Mesh(nodeGeo, i < 8 ? primMat : secMat);
          g.add(m);
          _tesseractNodes.push(m);
        }
        // Inner core energy octahedron
        g.add(makeWireAndSolid(new THREE.OctahedronGeometry(0.68, 0), th, 0.35));
        break;
      }

      case 'cathedral': {
        // 32-Bar Radial 3D Audio Spectrum Ring + levitating resonant crystal!
        const barCount = 32;
        const barGeo = new THREE.BoxGeometry(0.18, 1.0, 0.24);
        for (let i = 0; i < barCount; i++) {
          const ang = (i / barCount) * Math.PI * 2;
          const mat = new THREE.MeshStandardMaterial({
            color: i % 2 === 0 ? th.primary : th.secondary,
            emissive: i % 2 === 0 ? th.primary : th.secondary,
            emissiveIntensity: 0.5,
            metalness: 0.45, roughness: 0.25
          });
          const bar = new THREE.Mesh(barGeo, mat);
          bar.position.set(Math.cos(ang) * 2.25, -0.7, Math.sin(ang) * 2.25);
          bar.rotation.y = -ang;
          g.add(bar);
          _cathedralBars.push(bar);
        }
        const core = makeWireAndSolid(new THREE.IcosahedronGeometry(0.95, 1), th, 0.3);
        core.position.y = 0.25;
        g.add(core);
        break;
      }

      case 'sentinel': {
        g.add(makeWireAndSolid(new THREE.OctahedronGeometry(1.1, 0), th, 0.3));
        for (let i = 0; i < 3; i++) {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(1.55 + i * 0.32, 0.04, 12, 64), i % 2 ? secMat : primMat);
          ring.rotation.set(i * 0.9, i * 0.7, 0);
          g.add(ring);
        }
        break;
      }

      case 'jellyfish': {
        const bell = makeWireAndSolid(new THREE.SphereGeometry(1.25, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.58), th, 0.35);
        bell.position.y = 0.45;
        g.add(bell);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const tent = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.012, 2.2, 8), i % 2 ? secMat : primMat);
          tent.position.set(Math.cos(a) * 0.72, -0.75, Math.sin(a) * 0.72);
          tent.userData.phase = i * 0.75;
          g.add(tent);
        }
        break;
      }

      case 'golem': {
        const torso = makeWireAndSolid(new THREE.DodecahedronGeometry(0.95, 0), th, 0.42);
        const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), secMat);
        head.position.y = 1.38;
        const shL = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.85, 0.55), primMat);
        shL.position.set(-1.35, 0.35, 0);
        const shR = shL.clone();
        shR.position.x = 1.35;
        g.add(torso, head, shL, shR);
        break;
      }

      case 'seraphim': {
        g.add(makeWireAndSolid(new THREE.OctahedronGeometry(0.85, 1), th, 0.35));
        for (let side of [-1, 1]) {
          for (let f = 0; f < 4; f++) {
            const feather = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.9 - f * 0.25, 4), f % 2 ? secMat : primMat);
            feather.position.set(side * (1.1 + f * 0.38), 0.65 - f * 0.35, -0.2);
            feather.rotation.z = side * -(0.65 + f * 0.22);
            g.add(feather);
          }
        }
        break;
      }

      case 'arachnoid': {
        g.add(makeWireAndSolid(new THREE.SphereGeometry(0.72, 16, 12), th, 0.4));
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const leg = new THREE.Mesh(new THREE.ConeGeometry(0.1, 2.0, 5), i % 2 ? primMat : secMat);
          leg.position.set(Math.cos(a) * 1.35, -0.25, Math.sin(a) * 1.35);
          leg.rotation.z = Math.cos(a) * 0.9;
          leg.rotation.x = -Math.sin(a) * 0.9;
          g.add(leg);
        }
        break;
      }

      case 'parasite': {
        g.add(makeWireAndSolid(new THREE.TorusKnotGeometry(0.92, 0.24, 90, 14, 3, 5), th, 0.3));
        for (let i = 0; i < 6; i++) {
          const orb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), secMat);
          const a = (i / 6) * Math.PI * 2;
          orb.position.set(Math.cos(a) * 1.85, Math.sin(a * 2) * 0.55, Math.sin(a) * 1.85);
          g.add(orb);
        }
        break;
      }

      case 'twins': {
        const a = makeWireAndSolid(new THREE.IcosahedronGeometry(0.85, 0), th, 0.34);
        a.position.set(-1.15, 0.2, 0);
        const b = makeWireAndSolid(new THREE.OctahedronGeometry(0.85, 0), th, 0.34);
        b.position.set(1.15, -0.2, 0);
        const bridge = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.04, 10, 48), wireMat);
        bridge.rotation.x = Math.PI / 2;
        g.add(a, b, bridge);
        break;
      }

      case 'lotus': {
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16), secMat);
        g.add(core);
        for (let layer = 0; layer < 2; layer++) {
          const n = layer === 0 ? 8 : 12;
          for (let i = 0; i < n; i++) {
            const ang = (i / n) * Math.PI * 2 + layer * 0.25;
            const petal = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.35 + layer * 0.4, 4), layer === 0 ? primMat : secMat);
            petal.position.set(Math.cos(ang) * (0.75 + layer * 0.45), -0.15 + layer * 0.15, Math.sin(ang) * (0.75 + layer * 0.45));
            petal.rotation.z = -Math.cos(ang) * (0.7 + layer * 0.35);
            petal.rotation.x = Math.sin(ang) * (0.7 + layer * 0.35);
            g.add(petal);
          }
        }
        break;
      }

      case 'torusknot':
        g.add(makeWireAndSolid(new THREE.TorusKnotGeometry(1.15, 0.32, 110, 16), th, 0.3));
        break;
      case 'icosahedron':
        g.add(makeWireAndSolid(new THREE.IcosahedronGeometry(1.45, 1), th, 0.28));
        break;
      case 'dodecahedron':
        g.add(makeWireAndSolid(new THREE.DodecahedronGeometry(1.45, 0), th, 0.3));
        break;
      case 'torus':
        g.add(makeWireAndSolid(new THREE.TorusGeometry(1.35, 0.42, 20, 64), th, 0.3));
        break;
      case 'sphere':
        g.add(makeWireAndSolid(new THREE.SphereGeometry(1.42, 24, 18), th, 0.26));
        break;
      case 'pyramid':
        g.add(makeWireAndSolid(new THREE.ConeGeometry(1.45, 2.25, 4), th, 0.32));
        break;
      case 'cube':
      default:
        g.add(makeWireAndSolid(new THREE.BoxGeometry(1.85, 1.85, 1.85, 2, 2, 2), th, 0.28));
        break;
    }

    _entityGroup = g;
    _scene.add(_entityGroup);
  }

  function setTheme(themeId) {
    _themeId = THEMES[themeId] ? themeId : 'cyberpunk';
    if (!_scene) return;
    const th = getTheme();
    _scene.background.setHex(th.bg);
    if (_scene.fog) _scene.fog.color.setHex(th.bg);
    if (_keyLight) _keyLight.color.setHex(th.primary);
    if (_rimLight) _rimLight.color.setHex(th.secondary);
    if (_floorRing) _floorRing.material.color.setHex(th.primary);
    if (_stars) _stars.material.color.setHex(th.primary);

    // Rebuild grid cleanly with theme colors
    if (_gridHelper) {
      _scene.remove(_gridHelper);
      disposeObjectTree(_gridHelper);
      _gridHelper = new THREE.GridHelper(34, 34, th.primary, th.grid);
      _gridHelper.position.y = -2.2;
      _scene.add(_gridHelper);
    }
    setModel(_modelId);
  }

  // Debounced floating 3D Neon Song Title Sprite with strict texture disposal!
  function setNeonTitle(text) {
    if (_titleDebounce) clearTimeout(_titleDebounce);
    _titleDebounce = setTimeout(() => buildNeonTitleSprite(text), 120);
  }

  function buildNeonTitleSprite(text) {
    if (!_scene) return;
    if (_titleSprite) {
      _scene.remove(_titleSprite);
      disposeObjectTree(_titleSprite);
      _titleSprite = null;
    }
    const clean = String(text || '').trim().slice(0, 36);
    if (!clean) return;

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');
    const th = getTheme();
    const colHex = '#' + th.primary.toString(16).padStart(6, '0');
    const secHex = '#' + th.secondary.toString(16).padStart(6, '0');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '800 68px "Space Grotesk", "Inter", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = colHex;
    ctx.shadowBlur = 24;
    const grad = ctx.createLinearGradient(120, 0, 900, 0);
    grad.addColorStop(0, colHex);
    grad.addColorStop(0.5, '#ffffff');
    grad.addColorStop(1, secHex);
    ctx.fillStyle = grad;
    ctx.fillText(clean.toUpperCase(), 512, 96);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    _titleSprite = new THREE.Sprite(mat);
    _titleSprite.scale.set(5.4, 1.0, 1);
    _titleSprite.position.set(0, 2.72, -1.1);
    _scene.add(_titleSprite);
  }

  function triggerPulse(strength = 0.5) {
    _pulseBoost = Math.min(1.0, Math.max(_pulseBoost, strength));
  }

  function setVJCamera(enabled) { _vjCamera = !!enabled; }

  function setLiteMode(enabled) {
    _liteMode = !!enabled;
    if (_renderer) _renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, _liteMode ? 1 : 1.75));
    if (_scene) buildStarfield();
  }

  function updateTesseract4D(t, bass, mid) {
    if (!_tesseractLine || _tesseractNodes.length !== 16) return;
    const a1 = t * 0.65 + bass * 0.5;
    const a2 = t * 0.42 + mid * 0.4;
    const cos1 = Math.cos(a1), sin1 = Math.sin(a1);
    const cos2 = Math.cos(a2), sin2 = Math.sin(a2);

    const proj = new Array(16);
    const scaleBase = 1.65 + bass * 0.42;
    for (let i = 0; i < 16; i++) {
      let [x, y, z, w] = TESS_VERTS_4D[i];
      // Rotate in XW plane
      const nx = x * cos1 - w * sin1;
      const nw = x * sin1 + w * cos1;
      // Rotate in YZ plane
      const ny = y * cos2 - z * sin2;
      const nz = y * sin2 + z * cos2;
      // Perspective projection 4D -> 3D
      const d = 2.65 - nw;
      const factor = scaleBase / Math.max(0.8, d);
      const px = nx * factor, py = ny * factor, pz = nz * factor;
      proj[i] = [px, py, pz];
      _tesseractNodes[i].position.set(px, py, pz);
      const ns = 0.85 + bass * 0.65;
      _tesseractNodes[i].scale.setScalar(ns);
    }

    const posAttr = _tesseractLine.geometry.attributes.position;
    let idx = 0;
    for (let e = 0; e < TESS_EDGES.length; e++) {
      const pA = proj[TESS_EDGES[e][0]];
      const pB = proj[TESS_EDGES[e][1]];
      posAttr.array[idx++] = pA[0]; posAttr.array[idx++] = pA[1]; posAttr.array[idx++] = pA[2];
      posAttr.array[idx++] = pB[0]; posAttr.array[idx++] = pB[1]; posAttr.array[idx++] = pB[2];
    }
    posAttr.needsUpdate = true;
  }

  function animate() {
    _rafId = requestAnimationFrame(animate);
    if (document.hidden || !_renderer || !_scene || !_camera) return;

    const dt = Math.min(0.05, _clock.getDelta());
    _elapsed += dt;
    _pulseBoost = Math.max(0, _pulseBoost - dt * 2.4);

    // Pull real 3-band FFT audio energy from AudioEngine!
    const bands = (window.AudioEngine && window.AudioEngine.getAudioBands)
      ? window.AudioEngine.getAudioBands()
      : { bass: 0, mid: 0, treble: 0, level: 0 };

    const targetBass = Math.min(1, bands.bass + _pulseBoost * 0.55);
    const targetMid = Math.min(1, bands.mid + _pulseBoost * 0.35);
    const targetTreble = Math.min(1, bands.treble + _pulseBoost * 0.25);

    _smoothBass += (targetBass - _smoothBass) * Math.min(1, dt * 14);
    _smoothMid += (targetMid - _smoothMid) * Math.min(1, dt * 12);
    _smoothTreble += (targetTreble - _smoothTreble) * Math.min(1, dt * 16);

    if (_entityGroup) {
      _entityGroup.rotation.y += dt * (0.28 + _smoothMid * 1.15);
      _entityGroup.rotation.x = Math.sin(_elapsed * 0.55) * 0.16 + _smoothTreble * 0.14;
      const s = 1.0 + _smoothBass * 0.26;
      _entityGroup.scale.setScalar(s);
      _entityGroup.position.y = 0.55 + Math.sin(_elapsed * 1.4) * 0.16 + _smoothBass * 0.12;

      if (_modelId === 'tesseract') {
        updateTesseract4D(_elapsed, _smoothBass, _smoothMid);
      } else if (_modelId === 'cathedral' && _cathedralBars.length) {
        for (let i = 0; i < _cathedralBars.length; i++) {
          const wave = 0.38 + Math.abs(Math.sin(_elapsed * 2.6 + i * 0.42)) * 0.55;
          const energy = (i % 3 === 0 ? _smoothBass : i % 3 === 1 ? _smoothMid : _smoothTreble);
          const barH = 0.35 + wave * (0.45 + energy * 3.1);
          _cathedralBars[i].scale.y = barH;
          _cathedralBars[i].position.y = -1.35 + barH * 0.5;
        }
      }
    }

    if (_floorRing) {
      const rs = 1.0 + _smoothBass * 0.22;
      _floorRing.scale.set(rs, rs, 1);
      _floorRing.material.opacity = 0.32 + _smoothBass * 0.55;
    }
    if (_stars) {
      _stars.rotation.y += dt * (0.04 + _smoothTreble * 0.18);
    }
    if (_keyLight) {
      _keyLight.intensity = 3.8 + _smoothBass * 4.5;
    }
    if (_titleSprite) {
      _titleSprite.position.y = 2.68 + Math.sin(_elapsed * 1.8) * 0.08 + _smoothBass * 0.08;
    }

    // Cinematic VJ Auto-Camera synced to bass transients!
    if (_vjCamera) {
      _vjAngle += dt * (0.28 + _smoothMid * 0.45);
      if (_smoothBass > 0.62 && _elapsed - _lastCutTime > 2.2) {
        _lastCutTime = _elapsed;
        _vjTargetHeight = 1.1 + Math.random() * 3.2;
      }
      _vjHeight += (_vjTargetHeight - _vjHeight) * dt * 1.8;
      const dist = 7.4 - _smoothBass * 0.95;
      _camera.position.set(Math.cos(_vjAngle) * dist, _vjHeight, Math.sin(_vjAngle) * dist);
      _camera.lookAt(0, 0.45, 0);
    } else if (_controls) {
      _controls.update();
    }

    _renderer.render(_scene, _camera);
  }

  function startLoop() {
    if (_rafId) cancelAnimationFrame(_rafId);
    animate();
  }

  function handleVisibility() {
    if (!document.hidden && _clock) _clock.getDelta();
  }

  function handleResize() {
    if (!_container || !_renderer || !_camera) return;
    const w = _container.clientWidth;
    const h = _container.clientHeight;
    if (w <= 0 || h <= 0) return;
    _camera.aspect = w / h;
    _camera.updateProjectionMatrix();
    _renderer.setSize(w, h);
  }

  function getCanvas() { return _renderer ? _renderer.domElement : null; }

  return {
    THEMES, VISUAL_MODELS,
    init, setModel, setTheme, setNeonTitle, triggerPulse, setVJCamera, setLiteMode, handleResize, getCanvas,
    getState: () => ({ model: _modelId, theme: _themeId, vjCamera: _vjCamera, liteMode: _liteMode })
  };
})();

window.Visuals4D = Visuals4D;
export default Visuals4D;
