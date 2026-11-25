/**
 * 3D Studio Pro — Interactive Three.js r128 PBR & Optical LED Lithophane Viewport
 * Features:
 *  - Zero VRAM leak (full BufferGeometry / Material / Texture disposal)
 *  - True Beer-Lambert Optical LED Backlight (ON/OFF, 2700K/4000K/6500K/Amber, Color Backlit Sheet Preview)
 *  - Virtual 3D LED Bulb inside Cylinder / Sphere Lamps
 *  - 8 Sculpted PBR Materials + Raking Light 360° + Wireframe Overlay
 *  - Viral WEBM Video Recorder ("Magic Light-Up Reveal", 360° Turntable, Raking Light Sweep)
 *  - 1:1 Meter-Scale Textured GLB Exporter (Linear RGB) for WebAR & Standalone HTML 3D Client Proof
 */
(function (global) {
  'use strict';

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function ledRgbFromKelvin(kelvin) {
    if (kelvin === 'amber' || kelvin <= 2200) return [1.0, 0.72, 0.38];
    if (kelvin <= 3000) return [1.0, 0.87, 0.66];
    if (kelvin >= 5800) return [0.90, 0.96, 1.0];
    return [1.0, 0.96, 0.90];
  }

  function createLithoOpticalTexture(heightfield, colorCanvas, opts) {
    const o = opts || {};
    const w = heightfield.width;
    const h = heightfield.height;
    const src = heightfield.data;
    const minT = Number(o.minThickMm) || 0.8;
    const maxT = Number(o.maxThickMm) || 3.2;
    const span = Math.max(0.2, maxT - minT);
    const ledIntensity = Math.max(0.1, Math.min(1.8, Number(o.ledIntensity) || 1.15));
    const [tr, tg, tb] = ledRgbFromKelvin(o.ledKelvin || 2700);
    const colorSheet = !!o.colorBacklit && !!colorCanvas;

    let colPx = null;
    if (colorSheet) {
      const tmp = document.createElement('canvas');
      tmp.width = w; tmp.height = h;
      const tctx = tmp.getContext('2d', { willReadFrequently: true });
      tctx.drawImage(colorCanvas, 0, 0, w, h);
      colPx = tctx.getImageData(0, 0, w, h).data;
    }

    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    const id = ctx.createImageData(w, h);
    const dst = id.data;
    const kAbs = 0.85;

    for (let i = 0; i < src.length; i++) {
      const lum = src[i];
      const thick = o.mode === 'lithophane' ? (minT + (1 - lum) * span) : (minT + lum * span);
      const trans = Math.exp(-kAbs * (thick - minT));
      const glow = Math.min(1, Math.pow(trans, 0.92) * ledIntensity);
      const p = i * 4;
      if (colPx) {
        // Backlit color paper laminated behind white PLA
        const cr = 0.28 + 0.72 * (colPx[p] / 255);
        const cg = 0.28 + 0.72 * (colPx[p + 1] / 255);
        const cb = 0.28 + 0.72 * (colPx[p + 2] / 255);
        dst[p] = Math.round(Math.min(255, glow * tr * cr * 255));
        dst[p + 1] = Math.round(Math.min(255, glow * tg * cg * 255));
        dst[p + 2] = Math.round(Math.min(255, glow * tb * cb * 255));
      } else {
        dst[p] = Math.round(Math.min(255, glow * tr * 255));
        dst[p + 1] = Math.round(Math.min(255, glow * tg * 255));
        dst[p + 2] = Math.round(Math.min(255, glow * tb * 255));
      }
      dst[p + 3] = 255;
    }
    ctx.putImageData(id, 0, 0);
    const tex = new THREE.CanvasTexture(cv);
    if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
    tex.needsUpdate = true;
    return tex;
  }

  function createWoodOrMarbleTex(kind) {
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 512;
    const ctx = cv.getContext('2d');
    if (kind === 'wood') {
      ctx.fillStyle = '#734a28'; ctx.fillRect(0, 0, 512, 512);
      for (let y = 0; y < 512; y++) {
        const wv = Math.sin(y * 0.08) * 14 + Math.sin(y * 0.025) * 24;
        const g = Math.sin((y + wv) * 0.22);
        ctx.fillStyle = g > 0.2 ? '#98673e' : (g < -0.3 ? '#432610' : '#734a28');
        ctx.globalAlpha = 0.24 + Math.abs(g) * 0.18;
        ctx.fillRect(0, y, 512, 1.5);
      }
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = '#eef1f6'; ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = 'rgba(120,132,152,0.22)';
      for (let v = 0; v < 16; v++) {
        ctx.lineWidth = 1 + (v % 3);
        ctx.beginPath();
        let x = (v * 47) % 512; ctx.moveTo(x, 0);
        for (let s = 1; s <= 16; s++) { x += Math.sin(s * 0.8 + v) * 26 + 8; ctx.lineTo(x, (s / 16) * 512); }
        ctx.stroke();
      }
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
    tex.needsUpdate = true;
    return tex;
  }

  class StudioViewport3D {
    constructor(canvasEl) {
      this.canvas = canvasEl;
      this.initialized = false;
      this.hasCameraFramed = false;
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.controls = null;
      this.rootGroup = null;
      this.activeMesh = null;
      this.wireMesh = null;
      this.ledBulb = null;
      this.activeTextures = [];
      this.procCache = {};

      this.ambientLight = null;
      this.keyLight = null;
      this.fillLight = null;
      this.rimLight = null;
      this.bulbLight = null;

      this.lastMeshData = null;
      this.lastHeightfield = null;
      this.lastColorCanvas = null;
      this.autoRotate = false;
      this.recording = false;

      this.state = {
        ledOn: true,
        ledKelvin: 2700,
        ledIntensity: 1.15,
        colorBacklit: false,
        material: 'litho', // litho | ivory | bronze | gold | marble | wood | emerald | clay
        wireframe: false,
        lightAzimuth: 38,
        lightElevation: 34
      };
    }

    init() {
      if (this.initialized || typeof THREE === 'undefined' || !this.canvas) return;
      const parent = this.canvas.parentElement;
      const w = Math.max(260, (parent ? parent.clientWidth : this.canvas.clientWidth) || 820);
      const h = Math.max(260, (parent ? parent.clientHeight : this.canvas.clientHeight) || 560);

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x060913);

      this.camera = new THREE.PerspectiveCamera(40, w / h, 0.2, 5000);
      this.camera.position.set(60, 25, 200);

      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        preserveDrawingBuffer: true
      });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.setSize(w, h, false);
      if (THREE.sRGBEncoding) this.renderer.outputEncoding = THREE.sRGBEncoding;
      if (THREE.ACESFilmicToneMapping) {
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.08;
      }

      if (typeof THREE.OrbitControls === 'function') {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.06;
        this.controls.minDistance = 20;
        this.controls.maxDistance = 1200;
      }

      this.ambientLight = new THREE.AmbientLight(0xdbe8ff, 0.35);
      this.scene.add(this.ambientLight);

      this.keyLight = new THREE.DirectionalLight(0xfff5e4, 1.5);
      this.scene.add(this.keyLight);

      this.fillLight = new THREE.DirectionalLight(0x7aa2f7, 0.42);
      this.fillLight.position.set(-140, -60, 120);
      this.scene.add(this.fillLight);

      this.rimLight = new THREE.DirectionalLight(0xa855f7, 0.32);
      this.rimLight.position.set(0, 160, -140);
      this.scene.add(this.rimLight);

      this.bulbLight = new THREE.PointLight(0xffd28a, 1.8, 420);
      this.bulbLight.position.set(0, 0, -28);
      this.scene.add(this.bulbLight);

      this.rootGroup = new THREE.Group();
      this.scene.add(this.rootGroup);

      // Subtle reference print bed grid below upright models
      const grid = new THREE.GridHelper(260, 26, 0x1e3a5f, 0x111a2e);
      grid.name = 'helper_grid';
      grid.position.y = -70;
      this.bedGrid = grid;
      this.scene.add(grid);

      this.updateLighting();
      this.initialized = true;

      if (typeof ResizeObserver !== 'undefined' && parent) {
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(parent);
      }
      window.addEventListener('resize', () => this.resize());

      const loop = () => {
        requestAnimationFrame(loop);
        if (this.autoRotate && this.rootGroup && !this.recording) {
          this.rootGroup.rotation.y += 0.007;
        }
        if (this.controls) this.controls.update();
        this.renderer.render(this.scene, this.camera);
      };
      loop();
    }

    resize() {
      if (!this.initialized || !this.renderer || !this.canvas) return;
      const parent = this.canvas.parentElement;
      const w = Math.max(240, (parent ? parent.clientWidth : this.canvas.clientWidth) || 640);
      const h = Math.max(240, (parent ? parent.clientHeight : this.canvas.clientHeight) || 480);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h, false);
    }

    disposeActive() {
      if (!this.rootGroup) return;
      while (this.rootGroup.children.length) {
        const ch = this.rootGroup.children[0];
        this.rootGroup.remove(ch);
        if (ch.geometry) ch.geometry.dispose();
        if (ch.material) {
          if (Array.isArray(ch.material)) ch.material.forEach((m) => m.dispose());
          else ch.material.dispose();
        }
      }
      for (const tex of this.activeTextures) {
        if (tex && typeof tex.dispose === 'function') tex.dispose();
      }
      this.activeTextures = [];
      this.activeMesh = null;
      this.wireMesh = null;
      this.ledBulb = null;
    }

    getProcTex(kind) {
      if (!this.procCache[kind]) this.procCache[kind] = createWoodOrMarbleTex(kind);
      return this.procCache[kind];
    }

    updateLighting() {
      if (!this.keyLight) return;
      const az = (this.state.lightAzimuth || 38) * (Math.PI / 180);
      const el = (this.state.lightElevation || 34) * (Math.PI / 180);
      const R = 280;
      this.keyLight.position.set(Math.cos(el) * Math.cos(az) * R, Math.sin(el) * R, Math.cos(el) * Math.sin(az) * R + 120);

      const ledActive = !!this.state.ledOn;
      if (ledActive) {
        this.scene.background = new THREE.Color(0x04060d);
        this.ambientLight.intensity = 0.16;
        this.keyLight.intensity = 0.32;
        this.fillLight.intensity = 0.14;
        this.rimLight.intensity = 0.18;
        const [r, g, b] = ledRgbFromKelvin(this.state.ledKelvin);
        this.bulbLight.color.setRGB(r, g, b);
        this.bulbLight.intensity = 2.1 * (this.state.ledIntensity || 1.1);
      } else {
        this.scene.background = new THREE.Color(0x080d1a);
        this.ambientLight.intensity = 0.42;
        this.keyLight.intensity = 1.55;
        this.fillLight.intensity = 0.48;
        this.rimLight.intensity = 0.35;
        this.bulbLight.intensity = 0;
      }
      if (this.ledBulb) this.ledBulb.visible = ledActive;
    }

    buildGeometry(meshData) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(meshData.positions), 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(meshData.uvs), 2));
      geo.setIndex(new THREE.BufferAttribute(new Uint32Array(meshData.indices), 1));
      geo.computeVertexNormals();
      geo.computeBoundingBox();
      const box = geo.boundingBox;
      const cx = (box.min.x + box.max.x) * 0.5;
      const cy = (box.min.y + box.max.y) * 0.5;
      const cz = (box.min.z + box.max.z) * 0.5;
      geo.translate(-cx, -cy, -cz);
      geo.computeBoundingBox();
      geo.computeBoundingSphere();
      return geo;
    }

    createMaterial(meshData, heightfield, colorCanvas) {
      if (this.state.ledOn) {
        const tex = createLithoOpticalTexture(heightfield, colorCanvas, {
          minThickMm: meshData.minThickMm,
          maxThickMm: meshData.maxThickMm,
          mode: meshData.mode,
          ledKelvin: this.state.ledKelvin,
          ledIntensity: this.state.ledIntensity,
          colorBacklit: this.state.colorBacklit
        });
        this.activeTextures.push(tex);
        return new THREE.MeshStandardMaterial({
          color: 0xffffff,
          map: tex,
          emissive: new THREE.Color(0xffffff),
          emissiveMap: tex,
          emissiveIntensity: 0.96,
          roughness: 0.48,
          metalness: 0.02
        });
      }

      const presets = {
        litho:   { color: 0xf4f7fb, roughness: 0.44, metalness: 0.02 },
        ivory:   { color: 0xfef3c7, roughness: 0.48, metalness: 0.03 },
        bronze:  { color: 0xb87333, roughness: 0.28, metalness: 0.84 },
        gold:    { color: 0xe6c166, roughness: 0.24, metalness: 0.88 },
        marble:  { color: 0xffffff, roughness: 0.32, metalness: 0.04, tex: 'marble' },
        wood:    { color: 0xffffff, roughness: 0.66, metalness: 0.03, tex: 'wood' },
        emerald: { color: 0x059669, roughness: 0.22, metalness: 0.35 },
        clay:    { color: 0xc87454, roughness: 0.78, metalness: 0.02 }
      };
      const p = presets[this.state.material] || presets.litho;
      return new THREE.MeshStandardMaterial({
        color: p.color,
        map: p.tex ? this.getProcTex(p.tex) : null,
        roughness: p.roughness,
        metalness: p.metalness
      });
    }

    setState(patch, rebuildMaterialOnly) {
      Object.assign(this.state, patch || {});
      this.updateLighting();
      if (rebuildMaterialOnly && this.activeMesh && this.lastMeshData && this.lastHeightfield) {
        // Fast material/wireframe swap WITHOUT rebuilding geometry (fixes B3!)
        if (this.activeMesh.material) this.activeMesh.material.dispose();
        for (const tex of this.activeTextures) if (tex && tex.dispose) tex.dispose();
        this.activeTextures = [];
        this.activeMesh.material = this.createMaterial(this.lastMeshData, this.lastHeightfield, this.lastColorCanvas);
        if (this.wireMesh) this.wireMesh.visible = !!this.state.wireframe;
      }
    }

    updateMesh(meshData, heightfield, colorCanvas, resetCamera) {
      if (!this.initialized) this.init();
      if (!this.initialized || !meshData) return;

      this.lastMeshData = meshData;
      this.lastHeightfield = heightfield;
      this.lastColorCanvas = colorCanvas;

      this.disposeActive();
      this.updateLighting();

      const geo = this.buildGeometry(meshData);
      const mat = this.createMaterial(meshData, heightfield, colorCanvas);
      this.activeMesh = new THREE.Mesh(geo, mat);
      this.rootGroup.add(this.activeMesh);

      // Wireframe overlay (toggled without geometry rebuild)
      const wireMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        wireframe: true,
        transparent: true,
        opacity: 0.28
      });
      this.wireMesh = new THREE.Mesh(geo, wireMat);
      this.wireMesh.visible = !!this.state.wireframe;
      this.rootGroup.add(this.wireMesh);

      // Virtual glowing LED bulb inside cylinder / sphere lamps or behind plaques
      const bulbGeo = new THREE.SphereGeometry(Math.max(4, Math.min(10, meshData.dimensionsMm.x * 0.06)), 16, 12);
      const [r, g, b] = ledRgbFromKelvin(this.state.ledKelvin);
      const bulbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) });
      this.ledBulb = new THREE.Mesh(bulbGeo, bulbMat);
      if (meshData.shape === 'cylinder' || meshData.shape === 'sphere') {
        this.ledBulb.position.set(0, 0, 0);
        this.bulbLight.position.set(0, 0, 0);
      } else {
        this.ledBulb.position.set(0, 0, -Math.max(24, meshData.dimensionsMm.x * 0.28));
        this.bulbLight.position.copy(this.ledBulb.position);
      }
      this.ledBulb.visible = !!this.state.ledOn;
      this.rootGroup.add(this.ledBulb);

      if (this.bedGrid && geo.boundingBox) {
        this.bedGrid.position.y = geo.boundingBox.min.y - 2;
      }

      if (!this.hasCameraFramed || resetCamera) {
        this.setCameraPreset('iso');
        this.hasCameraFramed = true;
      }
      this.resize();
    }

    setCameraPreset(preset) {
      if (!this.camera || !this.lastMeshData) return;
      const d = this.lastMeshData.dimensionsMm;
      const maxDim = Math.max(d.x, d.y, d.z, 60);
      const dist = maxDim * 1.62;
      if (this.rootGroup) this.rootGroup.rotation.set(0, 0, 0);

      if (preset === 'front') {
        // True frontal view facing the upright relief / lithophane (Fixes B5!)
        this.camera.position.set(0, 0, dist);
      } else if (preset === 'side') {
        this.camera.position.set(dist * 0.94, maxDim * 0.1, dist * 0.34);
      } else if (preset === 'top') {
        this.camera.position.set(0, dist * 0.95, dist * 0.30);
      } else {
        // 3/4 sculptural studio angle
        this.camera.position.set(dist * 0.42, maxDim * 0.24, dist * 0.92);
      }
      this.camera.lookAt(0, 0, 0);
      if (this.controls) {
        this.controls.target.set(0, 0, 0);
        this.controls.update();
      }
    }

    // ── 1:1 Meter-Scale Textured GLB Exporter for AR Viewer & Download ───────
    exportGLB() {
      return new Promise((resolve, reject) => {
        if (typeof THREE === 'undefined' || typeof THREE.GLTFExporter !== 'function') {
          reject(new Error('GLTFExporter unavailable')); return;
        }
        if (!this.lastMeshData || !this.lastHeightfield) {
          reject(new Error('No 3D model ready')); return;
        }

        const geo = this.buildGeometry(this.lastMeshData);
        // Real-world 1:1 mm -> meters scale for WebAR!
        geo.scale(0.001, 0.001, 0.001);

        let mat;
        let tempTex = null;
        if (this.state.ledOn || this.state.colorBacklit) {
          tempTex = createLithoOpticalTexture(this.lastHeightfield, this.lastColorCanvas, {
            minThickMm: this.lastMeshData.minThickMm,
            maxThickMm: this.lastMeshData.maxThickMm,
            mode: this.lastMeshData.mode,
            ledKelvin: this.state.ledKelvin,
            ledIntensity: this.state.ledIntensity,
            colorBacklit: this.state.colorBacklit
          });
          mat = new THREE.MeshStandardMaterial({ map: tempTex, roughness: 0.46, metalness: 0.03 });
        } else {
          const hexMap = {
            litho: 0xf4f7fb, ivory: 0xfef3c7, bronze: 0xb87333, gold: 0xe6c166,
            marble: 0xeaeef4, wood: 0x8a5b32, emerald: 0x059669, clay: 0xc87454
          };
          const col = new THREE.Color(hexMap[this.state.material] || 0xf4f7fb);
          if (typeof col.convertSRGBToLinear === 'function') col.convertSRGBToLinear();
          const metallic = (this.state.material === 'bronze' || this.state.material === 'gold') ? 0.84 : 0.05;
          mat = new THREE.MeshStandardMaterial({ color: col, roughness: metallic > 0.5 ? 0.28 : 0.52, metalness: metallic });
        }

        const scene = new THREE.Scene();
        const mesh = new THREE.Mesh(geo, mat);
        mesh.name = 'StudiosPro_3DStudio_Model';
        scene.add(mesh);

        new THREE.GLTFExporter().parse(
          scene,
          (res) => {
            geo.dispose(); mat.dispose();
            if (tempTex) tempTex.dispose();
            if (res instanceof ArrayBuffer) resolve(res);
            else reject(new Error('Expected binary GLB'));
          },
          { binary: true }
        );
      });
    }

    // ── Viral WEBM Video Recorder ("Magic Light-Up Reveal" / Turntable / Raking) ─
    async recordShowcaseVideo(opts) {
      const o = opts || {};
      const animMode = o.mode || 'lightup'; // lightup | turntable | raking
      const durationSec = Math.max(2, Math.min(10, Number(o.durationSec) || 4.5));
      const isPro = !!o.isPro;
      const onProgress = typeof o.onProgress === 'function' ? o.onProgress : function () {};

      if (!this.initialized || !this.lastMeshData) throw new Error('3D viewport not ready');
      if (typeof MediaRecorder === 'undefined') throw new Error('MediaRecorder unsupported');

      this.recording = true;
      const savedCam = this.camera.position.clone();
      const savedRotY = this.rootGroup ? this.rootGroup.rotation.y : 0;
      const savedLed = this.state.ledOn;
      const savedLedInt = this.state.ledIntensity;
      const savedAz = this.state.lightAzimuth;

      const comp = document.createElement('canvas');
      comp.width = 960; comp.height = 540;
      const cctx = comp.getContext('2d');

      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
      const stream = comp.captureStream(30);
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4500000 });
      const chunks = [];
      rec.ondataavailable = (ev) => { if (ev.data && ev.data.size > 0) chunks.push(ev.data); };
      const done = new Promise((resolve) => { rec.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' })); });

      rec.start();
      const fps = 30;
      const totalFrames = Math.round(durationSec * fps);
      const d = this.lastMeshData.dimensionsMm;
      const maxDim = Math.max(d.x, d.y, d.z, 60);
      const dist = maxDim * 1.6;

      // For Magic Light-Up Reveal: ensure lithophane emissive material is loaded, then animate emissiveIntensity 0 -> 1!
      if (animMode === 'lightup') {
        this.setState({ ledOn: true }, true);
      }

      try {
        for (let f = 0; f <= totalFrames; f++) {
          const p = f / totalFrames;
          if (animMode === 'lightup') {
            // Smooth reveal: 0..25% lights off (pure sculpted PLA), 25..75% LED ramps ON, 75..100% glowing glory!
            const glowP = Math.max(0, Math.min(1, (p - 0.2) / 0.55));
            const smoothGlow = glowP * glowP * (3 - 2 * glowP);
            if (this.activeMesh && this.activeMesh.material) {
              this.activeMesh.material.emissiveIntensity = smoothGlow * 1.05;
            }
            this.ambientLight.intensity = 0.42 - smoothGlow * 0.26;
            this.keyLight.intensity = 1.45 - smoothGlow * 1.1;
            this.bulbLight.intensity = smoothGlow * 2.2;
            if (this.ledBulb) this.ledBulb.visible = smoothGlow > 0.08;
            const ang = -0.35 + p * 0.7;
            this.camera.position.set(Math.sin(ang) * dist, maxDim * 0.14, Math.cos(ang) * dist);
            this.camera.lookAt(0, 0, 0);
          } else if (animMode === 'turntable') {
            this.camera.position.set(Math.sin(p * Math.PI * 2) * dist, maxDim * 0.18, Math.cos(p * Math.PI * 2) * dist);
            this.camera.lookAt(0, 0, 0);
          } else {
            this.camera.position.set(dist * 0.35, maxDim * 0.18, dist * 0.95);
            this.camera.lookAt(0, 0, 0);
            this.state.lightAzimuth = (savedAz + p * 360) % 360;
            this.updateLighting();
          }

          this.renderer.render(this.scene, this.camera);

          cctx.fillStyle = '#050811';
          cctx.fillRect(0, 0, comp.width, comp.height);
          const scale = Math.min(comp.width / this.canvas.width, comp.height / this.canvas.height);
          const dw = this.canvas.width * scale, dh = this.canvas.height * scale;
          cctx.drawImage(this.canvas, (comp.width - dw) * 0.5, (comp.height - dh) * 0.5, dw, dh);

          if (!isPro) {
            cctx.fillStyle = 'rgba(7, 11, 20, 0.65)';
            cctx.fillRect(comp.width - 246, comp.height - 38, 232, 26);
            cctx.fillStyle = 'rgba(226, 232, 240, 0.9)';
            cctx.font = '600 12px Inter, sans-serif';
            cctx.fillText('Studios-Pro.com · 3D Studio', comp.width - 234, comp.height - 20);
          }
          onProgress(Math.round(p * 100));
          await new Promise((r) => setTimeout(r, 33));
        }
      } finally {
        rec.stop();
        this.recording = false;
        this.camera.position.copy(savedCam);
        if (this.rootGroup) this.rootGroup.rotation.y = savedRotY;
        this.setState({ ledOn: savedLed, ledIntensity: savedLedInt, lightAzimuth: savedAz }, true);
      }
      return done;
    }

    // ── Standalone XSS-Safe Interactive 3D Client Proof (.HTML) ──────────────
    generateClientProofHTML(stlBuffer, opts) {
      const o = opts || {};
      const title = escapeHtml(o.title || '3D Lithophane & Relief Proof');
      const dims = o.dimensionsMm || { x: 120, y: 120, z: 3.2 };
      const bytes = new Uint8Array(stlBuffer);
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      }
      const b64 = btoa(bin);
      const isLitho = o.mode === 'lithophane';

      return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>${title} — 3D Studio Client Proof</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#060913;color:#e2e8f0;font-family:Inter,system-ui,sans-serif;overflow:hidden}
  #cv{width:100vw;height:100vh;display:block}
  .hud{position:fixed;bottom:20px;left:20px;width:276px;background:rgba(14,21,37,.88);backdrop-filter:blur(12px);border:1px solid rgba(99,160,255,.25);border-radius:16px;padding:16px 18px;box-shadow:0 18px 48px rgba(0,0,0,.55)}
  .hud h2{font-size:15px;color:#60a5fa;margin-bottom:4px}
  .hud .meta{font-size:11px;color:#94a3b8;margin-bottom:12px}
  .row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px;font-size:12px}
  .row select,.row input[type=range]{background:#141d30;color:#e2e8f0;border:1px solid rgba(99,160,255,.25);border-radius:8px;padding:5px 8px;font-size:12px}
  .tag{position:fixed;top:16px;right:18px;font-size:11px;color:#94a3b8;background:rgba(14,21,37,.78);padding:6px 12px;border-radius:20px;border:1px solid rgba(99,160,255,.2)}
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/STLLoader.js"><\/script>
</head>
<body>
<canvas id="cv"></canvas>
<div class="tag">3D Studio Client Proof · Studios-Pro</div>
<div class="hud">
  <h2>${title}</h2>
  <div class="meta">${dims.x} × ${dims.y} × ${dims.z} mm · Drag to orbit · Scroll to zoom</div>
  <div class="row"><label>Material</label><select id="mat"><option value="litho"${isLitho ? ' selected' : ''}>Lithophane Glow</option><option value="ivory">Warm Ivory PLA</option><option value="bronze">Antique Bronze</option><option value="marble">Carrara Marble</option><option value="wood">Carved Wood</option></select></div>
  <div class="row"><label>LED Glow</label><input type="checkbox" id="led"${isLitho ? ' checked' : ''} /></div>
  <div class="row"><label>Raking Light</label><input type="range" id="az" min="0" max="360" value="40" /></div>
  <div class="row"><label>Auto-Rotate</label><input type="checkbox" id="rot" checked /></div>
</div>
<script>
(function(){
  const raw=atob("${b64}"),bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  const cv=document.getElementById('cv');
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x060913);
  const cam=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,0.2,4000);
  const ren=new THREE.WebGLRenderer({canvas:cv,antialias:true});
  ren.setPixelRatio(Math.min(devicePixelRatio||1,2));ren.setSize(innerWidth,innerHeight);
  const ctrl=new THREE.OrbitControls(cam,cv);ctrl.enableDamping=true;ctrl.autoRotate=true;ctrl.autoRotateSpeed=1.3;
  scene.add(new THREE.AmbientLight(0xdbe8ff,0.38));
  const key=new THREE.DirectionalLight(0xfff5e4,1.45);key.position.set(160,120,180);scene.add(key);
  const back=new THREE.PointLight(0xffcf87,1.4,450);back.position.set(0,0,-40);scene.add(back);
  const geo=new THREE.STLLoader().parse(bytes.buffer);geo.center();geo.computeVertexNormals();geo.computeBoundingBox();
  const sz=new THREE.Vector3();geo.boundingBox.getSize(sz);const md=Math.max(sz.x,sz.y,sz.z,50);
  cam.position.set(md*0.4,md*0.2,md*1.55);ctrl.update();
  const mat=new THREE.MeshStandardMaterial({color:0xf8fafc,roughness:0.45,metalness:0.04});
  const mesh=new THREE.Mesh(geo,mat);scene.add(mesh);
  function sync(){
    const k=document.getElementById('mat').value, led=document.getElementById('led').checked;
    const p={litho:{c:0xf8fafc,r:.44,m:.02},ivory:{c:0xfef3c7,r:.48,m:.03},bronze:{c:0xb87333,r:.28,m:.84},marble:{c:0xeef2f7,r:.34,m:.04},wood:{c:0x8a5b32,r:.64,m:.03}}[k]||{c:0xf8fafc,r:.45,m:.03};
    mat.color.setHex(p.c);mat.roughness=p.r;mat.metalness=p.m;
    mat.emissive.setHex(led?0x5c4422:0x000000);back.intensity=led?1.8:0;
  }
  sync();
  document.getElementById('mat').onchange=sync;
  document.getElementById('led').onchange=sync;
  document.getElementById('az').oninput=e=>{const a=e.target.value*Math.PI/180;key.position.set(Math.cos(a)*220,120,Math.sin(a)*220);};
  document.getElementById('rot').onchange=e=>{ctrl.autoRotate=e.target.checked;};
  addEventListener('resize',()=>{cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();ren.setSize(innerWidth,innerHeight);});
  (function loop(){requestAnimationFrame(loop);ctrl.update();ren.render(scene,cam);})();
})();
<\/script>
</body>
</html>`;
    }
  }

  global.StudioViewport3D = StudioViewport3D;
}(typeof window !== 'undefined' ? window : globalThis));
