/**
 * Depth Maps Pro — Interactive 3D PBR Relief, Backlit Lithophane LED Simulator,
 * WEBM Video Recorder, Textured GLB AR Exporter & HTML 3D Client Proof.
 * Uses Three.js r128 + OrbitControls + GLTFExporter.
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

  function createProceduralTexture(kind) {
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 512;
    const ctx = cv.getContext('2d');

    if (kind === 'wood' || kind === 'oak') {
      const base = kind === 'oak' ? '#b88a58' : '#6c4527';
      const dark = kind === 'oak' ? '#8c5e32' : '#3d2211';
      const light = kind === 'oak' ? '#d4ab7a' : '#8d5d38';
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, 512, 512);
      for (let y = 0; y < 512; y++) {
        const wave = Math.sin(y * 0.08) * 14 + Math.sin(y * 0.023) * 28;
        const g = Math.sin((y + wave) * 0.22);
        ctx.fillStyle = g > 0.25 ? light : (g < -0.35 ? dark : base);
        ctx.globalAlpha = 0.22 + Math.abs(g) * 0.2;
        ctx.fillRect(0, y, 512, 1.5);
      }
      ctx.globalAlpha = 0.09;
      for (let i = 0; i < 650; i++) {
        ctx.fillStyle = i % 2 === 0 ? dark : light;
        ctx.fillRect((i * 73) % 512, (i * 29) % 512, 48 + (i % 70), 1);
      }
      ctx.globalAlpha = 1;
    } else if (kind === 'brass') {
      const grad = ctx.createLinearGradient(0, 0, 512, 512);
      grad.addColorStop(0, '#d8b25c');
      grad.addColorStop(0.5, '#f2d588');
      grad.addColorStop(1, '#b58832');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);
      ctx.globalAlpha = 0.08;
      for (let y = 0; y < 512; y += 2) {
        ctx.fillStyle = (y % 4 === 0) ? '#ffffff' : '#4a3208';
        ctx.fillRect(0, y, 512, 1);
      }
      ctx.globalAlpha = 1;
    } else if (kind === 'marble') {
      ctx.fillStyle = '#edf0f5';
      ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = 'rgba(120, 132, 152, 0.22)';
      for (let v = 0; v < 18; v++) {
        ctx.lineWidth = 1 + (v % 3);
        ctx.beginPath();
        let px = (v * 43) % 512;
        let py = 0;
        ctx.moveTo(px, py);
        for (let s = 1; s <= 16; s++) {
          px += Math.sin(s * 0.7 + v) * 28 + 10;
          py = (s / 16) * 512;
          ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    } else if (kind === 'slate') {
      ctx.fillStyle = '#242933';
      ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 1800; i++) {
        const shade = 26 + (i * 19) % 26;
        ctx.fillStyle = `rgba(${shade},${shade + 4},${shade + 10},0.25)`;
        ctx.fillRect((i * 97) % 512, (i * 53) % 512, 14 + (i % 24), 4 + (i % 10));
      }
    } else {
      // clay / terracotta
      ctx.fillStyle = '#c47555';
      ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 1200; i++) {
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,220,200,0.06)' : 'rgba(90,35,20,0.08)';
        ctx.fillRect((i * 61) % 512, (i * 89) % 512, 8, 8);
      }
    }

    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
    tex.needsUpdate = true;
    return tex;
  }

  function buildLithophaneTexture(processedData, w, h, opts) {
    const o = opts || {};
    const kelvin = Number(o.kelvin) || 4000;
    const ledBrightness = Math.max(0.15, Math.min(1.6, Number(o.ledBrightness) || 1.0));
    const minT = Number(o.minThickMm) || 0.8;
    const maxT = Number(o.maxThickMm) || 3.2;

    // LED color temperature tint
    let tintR = 1.0, tintG = 0.96, tintB = 0.88;
    if (kelvin <= 3000) {
      tintR = 1.0; tintG = 0.84; tintB = 0.62; // Warm 2700K
    } else if (kelvin >= 5800) {
      tintR = 0.90; tintG = 0.96; tintB = 1.0; // Cool 6500K
    }

    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d');
    const id = ctx.createImageData(w, h);
    const dst = id.data;

    // Beer-Lambert optical attenuation through translucent white PLA
    const kAbsorb = 0.88;
    for (let i = 0; i < processedData.length; i++) {
      const d = processedData[i]; // brighter pixel = thinner wall
      const thick = minT + (1 - d) * (maxT - minT);
      const trans = Math.exp(-kAbsorb * (thick - minT));
      const glow = Math.min(1, Math.pow(trans, 0.92) * ledBrightness);
      const p = i * 4;
      dst[p] = Math.round(Math.min(255, glow * tintR * 255));
      dst[p + 1] = Math.round(Math.min(255, glow * tintG * 255));
      dst[p + 2] = Math.round(Math.min(255, glow * tintB * 255));
      dst[p + 3] = 255;
    }
    ctx.putImageData(id, 0, 0);
    const tex = new THREE.CanvasTexture(cv);
    if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
    tex.needsUpdate = true;
    return tex;
  }

  class DepthStudio3D {
    constructor(canvasEl) {
      this.canvas = canvasEl;
      this.initialized = false;
      this.hasCameraFramed = false;
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.controls = null;
      this.keyLight = null;
      this.fillLight = null;
      this.rimLight = null;
      this.ambientLight = null;
      this.backLight = null;
      this.rootGroup = null;
      this.activeObject = null;
      this.wireOverlay = null;
      this.lastMeshData = null;
      this.lastProcessed = null;
      this.lastPhotoCanvas = null;
      this.lastDepthCanvas = null;
      this.procTextures = {};
      this.autoRotate = false;
      this.rafId = null;
      this.resizeObserver = null;
      this.recording = false;

      this.state = {
        viewMode: 'relief',     // relief | lithophane | wireframe | pointcloud
        material: 'wood',       // wood | oak | brass | marble | slate | clay | photo
        lightAzimuth: 40,       // 0..360 deg
        lightElevation: 38,     // 10..85 deg
        lightIntensity: 1.55,
        ledKelvin: 2700,
        ledBrightness: 1.15,
        pointSize: 2.2,
        pointColorMode: 'depth' // depth | photo
      };
    }

    init() {
      if (this.initialized || typeof THREE === 'undefined' || !this.canvas) return;
      const w = Math.max(300, this.canvas.clientWidth || (this.canvas.parentElement ? this.canvas.parentElement.clientWidth : 800));
      const h = Math.max(260, this.canvas.clientHeight || 440);

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x080d18);

      this.camera = new THREE.PerspectiveCamera(40, w / h, 0.2, 4000);
      this.camera.position.set(0, -40, 210);

      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        preserveDrawingBuffer: true,
        alpha: false
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
        this.controls.dampingFactor = 0.07;
        this.controls.rotateSpeed = 0.85;
        this.controls.zoomSpeed = 1.0;
      }

      this.ambientLight = new THREE.AmbientLight(0xdbe8ff, 0.36);
      this.scene.add(this.ambientLight);

      this.keyLight = new THREE.DirectionalLight(0xfff6e8, 1.55);
      this.scene.add(this.keyLight);

      this.fillLight = new THREE.DirectionalLight(0x88b4ff, 0.42);
      this.fillLight.position.set(-140, -90, 120);
      this.scene.add(this.fillLight);

      this.rimLight = new THREE.DirectionalLight(0xa855f7, 0.32);
      this.rimLight.position.set(0, 140, -140);
      this.scene.add(this.rimLight);

      this.backLight = new THREE.PointLight(0xffd28a, 0, 500);
      this.backLight.position.set(0, 0, -45);
      this.scene.add(this.backLight);

      this.rootGroup = new THREE.Group();
      this.scene.add(this.rootGroup);

      this.updateLighting();
      this.initialized = true;

      // Automatic viewport resizing (fixes B4 resize bug!)
      if (typeof ResizeObserver !== 'undefined' && this.canvas.parentElement) {
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.canvas.parentElement);
      }
      window.addEventListener('resize', () => this.resize());

      const animate = () => {
        this.rafId = requestAnimationFrame(animate);
        if (this.autoRotate && this.rootGroup && !this.recording) {
          this.rootGroup.rotation.y += 0.007;
        }
        if (this.controls) this.controls.update();
        this.renderer.render(this.scene, this.camera);
      };
      animate();
    }

    resize() {
      if (!this.initialized || !this.renderer || !this.canvas) return;
      const parent = this.canvas.parentElement;
      const w = Math.max(240, (parent ? parent.clientWidth : this.canvas.clientWidth) || 640);
      const h = Math.max(260, (parent ? parent.clientHeight : this.canvas.clientHeight) || 440);
      if (w <= 0 || h <= 0) return;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h, false);
    }

    getProcTexture(kind) {
      if (!this.procTextures[kind]) {
        this.procTextures[kind] = createProceduralTexture(kind);
      }
      return this.procTextures[kind];
    }

    updateLighting() {
      if (!this.keyLight) return;
      const az = (this.state.lightAzimuth || 40) * (Math.PI / 180);
      const el = (this.state.lightElevation || 38) * (Math.PI / 180);
      const dist = 260;
      const lx = Math.cos(el) * Math.cos(az) * dist;
      const ly = Math.cos(el) * Math.sin(az) * dist;
      const lz = Math.sin(el) * dist;
      this.keyLight.position.set(lx, ly, lz);

      if (this.state.viewMode === 'lithophane') {
        this.scene.background = new THREE.Color(0x04060c);
        this.ambientLight.intensity = 0.14;
        this.keyLight.intensity = 0.28;
        this.fillLight.intensity = 0.1;
        this.rimLight.intensity = 0.15;
        this.backLight.intensity = 1.6 * (this.state.ledBrightness || 1.0);
        this.backLight.color.setHex(
          this.state.ledKelvin <= 3000 ? 0xffc980 : (this.state.ledKelvin >= 5800 ? 0xdbeeff : 0xfff3de)
        );
      } else {
        this.scene.background = new THREE.Color(0x080d18);
        this.ambientLight.intensity = 0.36;
        this.keyLight.intensity = this.state.lightIntensity || 1.55;
        this.fillLight.intensity = 0.42;
        this.rimLight.intensity = 0.32;
        this.backLight.intensity = 0;
      }
    }

    setState(patch, rebuild) {
      Object.assign(this.state, patch || {});
      this.updateLighting();
      if (rebuild && this.lastMeshData) {
        this.updateScene(this.lastMeshData, this.lastProcessed, this.lastPhotoCanvas, this.lastDepthCanvas, false);
      }
    }

    disposeActive() {
      if (!this.rootGroup) return;
      while (this.rootGroup.children.length) {
        const ch = this.rootGroup.children[0];
        this.rootGroup.remove(ch);
        if (ch.geometry) ch.geometry.dispose();
        if (ch.material) {
          if (Array.isArray(ch.material)) ch.material.forEach(m => m.dispose());
          else ch.material.dispose();
        }
      }
      this.activeObject = null;
      this.wireOverlay = null;
    }

    buildGeometryFromMeshData(meshData) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(meshData.positions), 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(meshData.uvs), 2));
      geo.setIndex(new THREE.BufferAttribute(new Uint32Array(meshData.indices), 1));
      geo.computeVertexNormals();
      geo.computeBoundingBox();
      // Center around origin so OrbitControls pivots cleanly
      const box = geo.boundingBox;
      const cx = (box.min.x + box.max.x) * 0.5;
      const cy = (box.min.y + box.max.y) * 0.5;
      const cz = (box.min.z + box.max.z) * 0.5;
      geo.translate(-cx, -cy, -cz);
      geo.computeBoundingSphere();
      return geo;
    }

    createMaterial(meshData, processed, photoCanvas) {
      if (this.state.viewMode === 'lithophane') {
        const tex = buildLithophaneTexture(processed.data, processed.width, processed.height, {
          kelvin: this.state.ledKelvin,
          ledBrightness: this.state.ledBrightness,
          minThickMm: meshData.minThickMm,
          maxThickMm: meshData.maxThickMm
        });
        return new THREE.MeshStandardMaterial({
          color: 0xffffff,
          map: tex,
          emissive: new THREE.Color(0xffffff),
          emissiveMap: tex,
          emissiveIntensity: 0.92,
          roughness: 0.52,
          metalness: 0.02
        });
      }

      const matKey = this.state.material || 'wood';
      if (matKey === 'photo' && photoCanvas) {
        const pTex = new THREE.CanvasTexture(photoCanvas);
        if (THREE.sRGBEncoding) pTex.encoding = THREE.sRGBEncoding;
        pTex.needsUpdate = true;
        return new THREE.MeshStandardMaterial({
          map: pTex,
          roughness: 0.55,
          metalness: 0.06
        });
      }

      const presets = {
        wood:   { tex: 'wood',   roughness: 0.62, metalness: 0.04, color: 0xffffff },
        oak:    { tex: 'oak',    roughness: 0.66, metalness: 0.03, color: 0xffffff },
        brass:  { tex: 'brass',  roughness: 0.28, metalness: 0.82, color: 0xf6db92 },
        marble: { tex: 'marble', roughness: 0.34, metalness: 0.05, color: 0xffffff },
        slate:  { tex: 'slate',  roughness: 0.78, metalness: 0.08, color: 0xd8e0ec },
        clay:   { tex: 'clay',   roughness: 0.74, metalness: 0.02, color: 0xffffff }
      };
      const p = presets[matKey] || presets.wood;
      return new THREE.MeshStandardMaterial({
        color: p.color,
        map: this.getProcTexture(p.tex),
        roughness: p.roughness,
        metalness: p.metalness
      });
    }

    updateScene(meshData, processed, photoCanvas, depthCanvas, resetCameraIfNew) {
      if (!this.initialized) this.init();
      if (!this.initialized || !meshData) return;

      this.lastMeshData = meshData;
      this.lastProcessed = processed;
      this.lastPhotoCanvas = photoCanvas;
      this.lastDepthCanvas = depthCanvas;

      this.disposeActive();
      this.updateLighting();

      if (this.state.viewMode === 'pointcloud') {
        const geo = new THREE.BufferGeometry();
        const cols = meshData.cols;
        const rows = meshData.rows;
        const topCount = cols * rows;
        const pos = new Float32Array(topCount * 3);
        const colors = new Float32Array(topCount * 3);

        const srcCv = (this.state.pointColorMode === 'photo' && photoCanvas) ? photoCanvas : depthCanvas;
        let px = null, sw = 1, sh = 1;
        if (srcCv) {
          sw = srcCv.width; sh = srcCv.height;
          px = srcCv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, sw, sh).data;
        }

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
        for (let i = 0; i < topCount; i++) {
          const x = meshData.positions[i * 3];
          const y = meshData.positions[i * 3 + 1];
          const z = meshData.positions[i * 3 + 2];
          pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
          if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;

          if (px) {
            const u = meshData.uvs[i * 2];
            const v = 1 - meshData.uvs[i * 2 + 1];
            const ix = Math.min(sw - 1, Math.max(0, Math.round(u * (sw - 1))));
            const iy = Math.min(sh - 1, Math.max(0, Math.round(v * (sh - 1))));
            const pi = (iy * sw + ix) * 4;
            colors[i * 3] = px[pi] / 255;
            colors[i * 3 + 1] = px[pi + 1] / 255;
            colors[i * 3 + 2] = px[pi + 2] / 255;
          } else {
            colors[i * 3] = 0.4; colors[i * 3 + 1] = 0.65; colors[i * 3 + 2] = 1.0;
          }
        }
        const cx = (minX + maxX) * 0.5, cy = (minY + maxY) * 0.5, cz = (minZ + maxZ) * 0.5;
        for (let i = 0; i < topCount; i++) {
          pos[i * 3] -= cx; pos[i * 3 + 1] -= cy; pos[i * 3 + 2] -= cz;
        }
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geo.computeBoundingSphere();
        const ptMat = new THREE.PointsMaterial({
          size: this.state.pointSize || 2.2,
          vertexColors: true,
          sizeAttenuation: true
        });
        this.activeObject = new THREE.Points(geo, ptMat);
        this.rootGroup.add(this.activeObject);
      } else {
        const geo = this.buildGeometryFromMeshData(meshData);
        const mat = this.createMaterial(meshData, processed, photoCanvas);
        this.activeObject = new THREE.Mesh(geo, mat);
        this.rootGroup.add(this.activeObject);

        if (this.state.viewMode === 'wireframe') {
          const wireMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            wireframe: true,
            transparent: true,
            opacity: 0.35
          });
          this.wireOverlay = new THREE.Mesh(geo, wireMat);
          this.rootGroup.add(this.wireOverlay);
        }
      }

      // Preserve user camera on slider tweaks (fixes B4!); only frame on initial load or explicit reset!
      if (!this.hasCameraFramed || resetCameraIfNew) {
        this.setCameraPreset('iso');
        this.hasCameraFramed = true;
      }
      this.resize();
    }

    setCameraPreset(preset) {
      if (!this.camera || !this.lastMeshData) return;
      const d = this.lastMeshData.dimensionsMm;
      const maxDim = Math.max(d.x, d.y, d.z * 4, 60);
      const dist = maxDim * 1.48;
      if (this.rootGroup) this.rootGroup.rotation.set(0, 0, 0);

      if (preset === 'front') {
        this.camera.position.set(0, 0, dist);
      } else if (preset === 'side') {
        this.camera.position.set(dist * 0.92, -dist * 0.12, dist * 0.38);
      } else if (preset === 'top') {
        this.camera.position.set(0, dist * 0.88, dist * 0.45);
      } else {
        // 'iso' / 3/4 sculptural studio angle
        this.camera.position.set(dist * 0.38, -dist * 0.32, dist * 0.92);
      }
      this.camera.lookAt(0, 0, 0);
      if (this.controls) {
        this.controls.target.set(0, 0, 0);
        this.controls.update();
      }
    }

    // ── Export Textured Watertight GLB for AR Viewer & Download ──────────────
    exportGLB(photoCanvas, preferPhoto) {
      return new Promise((resolve, reject) => {
        if (typeof THREE === 'undefined' || typeof THREE.GLTFExporter !== 'function') {
          reject(new Error('GLTFExporter not available'));
          return;
        }
        if (!this.lastMeshData || !this.lastProcessed) {
          reject(new Error('No 3D relief mesh generated yet'));
          return;
        }

        const geo = this.buildGeometryFromMeshData(this.lastMeshData);
        // Scale mm -> meters for real-world 1:1 AR sizing!
        geo.scale(0.001, 0.001, 0.001);

        let mat;
        const usePhoto = preferPhoto !== false && photoCanvas && (this.state.material === 'photo' || preferPhoto === true);
        if (usePhoto) {
          const tex = new THREE.CanvasTexture(photoCanvas);
          if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
          tex.needsUpdate = true;
          mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.05 });
        } else if (this.state.viewMode === 'lithophane') {
          const tex = buildLithophaneTexture(this.lastProcessed.data, this.lastProcessed.width, this.lastProcessed.height, {
            kelvin: this.state.ledKelvin,
            ledBrightness: this.state.ledBrightness,
            minThickMm: this.lastMeshData.minThickMm,
            maxThickMm: this.lastMeshData.maxThickMm
          });
          mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.48, metalness: 0.02 });
        } else {
          // Convert sRGB color to Linear RGB for accurate AR Viewer colors!
          const colMap = {
            wood: 0x8b5a34, oak: 0xc2935e, brass: 0xe6c166,
            marble: 0xeaeef4, slate: 0x3b4454, clay: 0xc47555
          };
          const c = new THREE.Color(colMap[this.state.material] || 0xc2935e);
          if (typeof c.convertSRGBToLinear === 'function') c.convertSRGBToLinear();
          mat = new THREE.MeshStandardMaterial({
            color: c,
            roughness: this.state.material === 'brass' ? 0.28 : 0.58,
            metalness: this.state.material === 'brass' ? 0.80 : 0.06
          });
        }

        const exportScene = new THREE.Scene();
        const mesh = new THREE.Mesh(geo, mat);
        mesh.name = 'StudiosPro_DepthRelief';
        exportScene.add(mesh);

        const exporter = new THREE.GLTFExporter();
        exporter.parse(
          exportScene,
          (result) => {
            geo.dispose();
            mat.dispose();
            if (result instanceof ArrayBuffer) resolve(result);
            else reject(new Error('Expected binary GLB ArrayBuffer'));
          },
          { binary: true }
        );
      });
    }

    // ── Cinematic WEBM Video Recorder (Turntable / Raking Light / Parallax) ──
    async recordVideo(opts) {
      const o = opts || {};
      const animMode = o.mode || 'turntable'; // turntable | raking | parallax
      const durationSec = Math.max(2, Math.min(12, Number(o.durationSec) || 5));
      const isPro = !!o.isPro;
      const onProgress = typeof o.onProgress === 'function' ? o.onProgress : function () {};

      if (!this.initialized || !this.renderer || !this.lastMeshData) {
        throw new Error('3D viewport not ready');
      }
      if (typeof MediaRecorder === 'undefined') {
        throw new Error('MediaRecorder is not supported in this browser');
      }

      this.recording = true;
      const savedRotY = this.rootGroup ? this.rootGroup.rotation.y : 0;
      const savedAz = this.state.lightAzimuth;
      const savedCamPos = this.camera.position.clone();
      const savedTarget = this.controls ? this.controls.target.clone() : new THREE.Vector3();

      const compCanvas = document.createElement('canvas');
      compCanvas.width = 960;
      compCanvas.height = 540;
      const cctx = compCanvas.getContext('2d');

      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      const stream = compCanvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4500000 });
      const chunks = [];
      recorder.ondataavailable = (ev) => { if (ev.data && ev.data.size > 0) chunks.push(ev.data); };

      const donePromise = new Promise((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
      });

      recorder.start();
      const fps = 30;
      const totalFrames = Math.round(durationSec * fps);
      const d = this.lastMeshData.dimensionsMm;
      const maxDim = Math.max(d.x, d.y, 60);
      const baseDist = maxDim * 1.48;

      try {
        for (let f = 0; f <= totalFrames; f++) {
          const p = f / totalFrames;
          if (animMode === 'turntable') {
            this.camera.position.set(
              Math.sin(p * Math.PI * 2) * baseDist * 0.95,
              -baseDist * 0.22,
              Math.cos(p * Math.PI * 2) * baseDist * 0.95
            );
            this.camera.lookAt(0, 0, 0);
          } else if (animMode === 'raking') {
            this.camera.position.set(baseDist * 0.25, -baseDist * 0.22, baseDist * 1.05);
            this.camera.lookAt(0, 0, 0);
            this.state.lightAzimuth = (savedAz + p * 360) % 360;
            this.updateLighting();
          } else {
            // 2.5D Ken Burns Parallax sweep
            const ang = Math.sin(p * Math.PI * 2) * 0.36;
            const elev = Math.cos(p * Math.PI * 2) * 0.14;
            const zDist = baseDist * (1.12 - 0.14 * Math.sin(p * Math.PI));
            this.camera.position.set(Math.sin(ang) * zDist, elev * zDist, Math.cos(ang) * zDist);
            this.camera.lookAt(0, 0, 0);
          }

          this.renderer.render(this.scene, this.camera);

          // Composite onto 16:9 canvas with optional Free watermark
          cctx.fillStyle = '#070b14';
          cctx.fillRect(0, 0, compCanvas.width, compCanvas.height);
          const sw = this.canvas.width, sh = this.canvas.height;
          const scale = Math.min(compCanvas.width / sw, compCanvas.height / sh);
          const dw = sw * scale, dh = sh * scale;
          cctx.drawImage(this.canvas, (compCanvas.width - dw) * 0.5, (compCanvas.height - dh) * 0.5, dw, dh);

          if (!isPro) {
            cctx.save();
            cctx.fillStyle = 'rgba(7, 11, 20, 0.62)';
            cctx.fillRect(compCanvas.width - 265, compCanvas.height - 40, 250, 28);
            cctx.fillStyle = 'rgba(226, 232, 240, 0.88)';
            cctx.font = '600 13px Inter, sans-serif';
            cctx.fillText('Studios-Pro.com · Depth Maps', compCanvas.width - 252, compCanvas.height - 21);
            cctx.restore();
          }

          onProgress(Math.round(p * 100));
          await new Promise((r) => setTimeout(r, 33));
        }
      } finally {
        recorder.stop();
        this.recording = false;
        if (this.rootGroup) this.rootGroup.rotation.y = savedRotY;
        this.state.lightAzimuth = savedAz;
        this.camera.position.copy(savedCamPos);
        if (this.controls) {
          this.controls.target.copy(savedTarget);
          this.controls.update();
        }
        this.updateLighting();
      }

      return donePromise;
    }

    // ── Standalone XSS-Safe Interactive 3D HTML Client Proof ─────────────────
    generateClientProofHTML(stlBuffer, opts) {
      const o = opts || {};
      const title = escapeHtml(o.title || '3D Depth Relief Proof');
      const dims = o.dimensionsMm || { x: 120, y: 120, z: 6 };
      const bytes = new Uint8Array(stlBuffer);
      let bin = '';
      const CHUNK = 0x8000;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
      }
      const b64 = btoa(bin);
      const isLitho = o.mode === 'lithophane';

      return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>${title} — 3D Client Proof</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#070b14;color:#e2e8f0;font-family:Inter,system-ui,sans-serif;overflow:hidden}
  #stage{width:100vw;height:100vh;display:block}
  .hud{position:fixed;bottom:20px;left:20px;background:rgba(14,21,37,.86);backdrop-filter:blur(12px);border:1px solid rgba(99,160,255,.22);border-radius:16px;padding:16px 18px;width:270px;box-shadow:0 16px 40px rgba(0,0,0,.5)}
  .hud h2{font-size:15px;color:#60a5fa;margin-bottom:4px}
  .hud .meta{font-size:12px;color:#94a3b8;margin-bottom:12px}
  .row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;font-size:12px}
  .row select,.row input[type=range]{background:#141d30;color:#e2e8f0;border:1px solid rgba(99,160,255,.25);border-radius:8px;padding:5px 8px;font-size:12px}
  .brand{position:fixed;top:16px;right:18px;font-size:11px;color:#94a3b8;background:rgba(14,21,37,.75);padding:6px 12px;border-radius:20px;border:1px solid rgba(99,160,255,.18)}
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/STLLoader.js"><\/script>
</head>
<body>
<canvas id="stage"></canvas>
<div class="brand">Interactive 3D Proof · Studios-Pro</div>
<div class="hud">
  <h2>${title}</h2>
  <div class="meta">${dims.x} × ${dims.y} × ${dims.z} mm · Drag to orbit · Scroll to zoom</div>
  <div class="row"><label>Material</label><select id="matSel"><option value="wood">Carved Wood</option><option value="brass">Brushed Brass</option><option value="marble">White Marble</option><option value="litho"${isLitho ? ' selected' : ''}>Lithophane Ivory</option><option value="slate">Black Slate</option></select></div>
  <div class="row"><label>Raking Light</label><input type="range" id="lightRng" min="0" max="360" value="40" /></div>
  <div class="row"><label>Auto-Rotate</label><input type="checkbox" id="rotChk" checked /></div>
</div>
<script>
(function(){
  const b64="${b64}";
  const raw=atob(b64),bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  const cv=document.getElementById('stage');
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x070b14);
  const cam=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,0.2,4000);
  const ren=new THREE.WebGLRenderer({canvas:cv,antialias:true});
  ren.setPixelRatio(Math.min(devicePixelRatio||1,2));ren.setSize(innerWidth,innerHeight);
  const ctrl=new THREE.OrbitControls(cam,cv);ctrl.enableDamping=true;ctrl.autoRotate=true;ctrl.autoRotateSpeed=1.4;
  scene.add(new THREE.AmbientLight(0xdbe8ff,0.42));
  const key=new THREE.DirectionalLight(0xfff4e0,1.5);key.position.set(160,120,180);scene.add(key);
  const fill=new THREE.DirectionalLight(0x7aa2f7,0.45);fill.position.set(-140,-100,110);scene.add(fill);
  const geo=new THREE.STLLoader().parse(bytes.buffer);geo.center();geo.computeVertexNormals();geo.computeBoundingBox();
  const sz=new THREE.Vector3();geo.boundingBox.getSize(sz);const md=Math.max(sz.x,sz.y,sz.z*3,50);
  cam.position.set(md*0.4,-md*0.35,md*1.45);ctrl.update();
  const mat=new THREE.MeshStandardMaterial({color:0xb88652,roughness:0.55,metalness:0.08});
  const mesh=new THREE.Mesh(geo,mat);scene.add(mesh);
  function applyMat(k){
    const m={wood:{c:0xa67346,r:.62,m:.04,e:0},brass:{c:0xe5c168,r:.28,m:.82,e:0},marble:{c:0xeef2f7,r:.34,m:.05,e:0},litho:{c:0xfff6e5,r:.48,m:.02,e:0x3d3018},slate:{c:0x363f4f,r:.78,m:.08,e:0}}[k]||{c:0xa67346,r:.6,m:.05,e:0};
    mat.color.setHex(m.c);mat.roughness=m.r;mat.metalness=m.m;mat.emissive.setHex(m.e);
  }
  applyMat(document.getElementById('matSel').value);
  document.getElementById('matSel').onchange=e=>applyMat(e.target.value);
  document.getElementById('lightRng').oninput=e=>{const a=e.target.value*Math.PI/180;key.position.set(Math.cos(a)*220,Math.sin(a)*220,140);};
  document.getElementById('rotChk').onchange=e=>{ctrl.autoRotate=e.target.checked;};
  addEventListener('resize',()=>{cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();ren.setSize(innerWidth,innerHeight);});
  (function loop(){requestAnimationFrame(loop);ctrl.update();ren.render(scene,cam);})();
})();
<\/script>
</body>
</html>`;
    }
  }

  global.DepthStudio3D = DepthStudio3D;
}(typeof window !== 'undefined' ? window : globalThis));
