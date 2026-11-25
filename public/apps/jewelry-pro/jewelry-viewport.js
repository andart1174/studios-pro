/**
 * Jewelry Maker Pro — Photorealistic Haute-Joaillerie Three.js Viewport & Exporters
 * Uses Three.js r165 ES Modules (MeshPhysicalMaterial + Dispersion + PMREM Studio Softbox).
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

const SHOWROOMS = {
  pearl:  { bg: 'radial-gradient(circle at 50% 34%, #ffffff 0%, #e8edf5 55%, #cbd5e1 100%)', fog: 0xe2e8f0, gridA: 0x94a3b8, gridB: 0xcbd5e1, shadowOp: 0.16, envInt: 1.45, keyInt: 2.3 },
  white:  { bg: 'radial-gradient(circle at 50% 40%, #ffffff 0%, #f8fafc 70%, #eef2f6 100%)', fog: 0xf8fafc, gridA: 0xcbd5e1, gridB: 0xe2e8f0, shadowOp: 0.11, envInt: 1.55, keyInt: 2.5 },
  velvet: { bg: 'radial-gradient(circle at 50% 36%, #3f3122 0%, #241b13 58%, #120d09 100%)', fog: 0x1c140e, gridA: 0x785a3a, gridB: 0x3b2c1e, shadowOp: 0.36, envInt: 1.60, keyInt: 2.6 },
  royal:  { bg: 'radial-gradient(circle at 50% 34%, #1d3566 0%, #0f1f40 58%, #071022 100%)', fog: 0x0f1f40, gridA: 0x3b63a8, gridB: 0x1e3a6e, shadowOp: 0.38, envInt: 1.65, keyInt: 2.6 },
  dark:   { bg: 'radial-gradient(circle at 50% 34%, #252834 0%, #14161e 58%, #08090d 100%)', fog: 0x12141b, gridA: 0x475569, gridB: 0x1e293b, shadowOp: 0.42, envInt: 1.75, keyInt: 2.7 }
};

class JewelryViewport {
  constructor(container) {
    this.container = container;
    this.showroom = 'pearl';
    this.autoSpin = false;
    this.spinSpeed = 1.6;
    this.showScaleGuide = false;
    this.showWireframe = false;
    this.lightAngle = 0;
    this.latestBuild = null;
    this.materialCache = new Map();
    this.bumpMaps = this._createFinishBumpMaps();

    this.scene = new THREE.Scene();

    const w = Math.max(100, container.clientWidth);
    const h = Math.max(100, container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(34, w / h, 0.2, 2500);
    this.camera.position.set(28, 22, 42);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 4.0;
    this.controls.maxDistance = 650;
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = 1.6;

    // Build custom Haute-Joaillerie PMREM Studio Softbox Environment
    this.envTexture = this._buildJewelrySoftboxEnv();
    this.scene.environment = this.envTexture;

    // Key, Rim, Fill & Diamond Sparkle Light Rig
    this.lightRig = new THREE.Group();
    this.scene.add(this.lightRig);

    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0xcbd5e1, 0.75);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xfffaf0, 2.3);
    this.keyLight.position.set(45, 75, 55);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.bias = -0.0004;
    this.keyLight.shadow.camera.near = 5;
    this.keyLight.shadow.camera.far = 400;
    const sc = 85;
    this.keyLight.shadow.camera.left = -sc;
    this.keyLight.shadow.camera.right = sc;
    this.keyLight.shadow.camera.top = sc;
    this.keyLight.shadow.camera.bottom = -sc;
    this.lightRig.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0xe0f2fe, 1.45);
    this.rimLight.position.set(-55, 45, -45);
    this.lightRig.add(this.rimLight);

    this.sparkleLight1 = new THREE.PointLight(0xffffff, 38, 180, 1.5);
    this.sparkleLight1.position.set(16, 38, 26);
    this.lightRig.add(this.sparkleLight1);

    this.sparkleLight2 = new THREE.PointLight(0xfffbeb, 28, 180, 1.5);
    this.sparkleLight2.position.set(-22, 30, 18);
    this.lightRig.add(this.sparkleLight2);

    // Stage floor shadow plane + subtle millimeter grid
    this.floorGroup = new THREE.Group();
    this.scene.add(this.floorGroup);

    this.shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(500, 500),
      new THREE.ShadowMaterial({ opacity: 0.16 })
    );
    this.shadowPlane.rotation.x = -Math.PI / 2;
    this.shadowPlane.receiveShadow = true;
    this.floorGroup.add(this.shadowPlane);

    this.gridHelper = new THREE.GridHelper(120, 24, 0x94a3b8, 0xcbd5e1);
    this.gridHelper.material.transparent = true;
    this.gridHelper.material.opacity = 0.28;
    this.gridHelper.position.y = 0.02;
    this.floorGroup.add(this.gridHelper);

    // Root groups
    this.jewelryGroup = new THREE.Group();
    this.jewelryGroup.name = 'JewelryPiece';
    this.scene.add(this.jewelryGroup);

    this.guideGroup = new THREE.Group();
    this.guideGroup.name = 'ScaleReferenceGuide';
    this.guideGroup.visible = false;
    this.scene.add(this.guideGroup);

    this.setShowroom('pearl');

    // Camera transition target
    this._camAnim = null;

    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);

    this._raf = null;
    this._loop = () => {
      this._raf = requestAnimationFrame(this._loop);
      if (this._camAnim) {
        this._camAnim.t = Math.min(1, this._camAnim.t + 0.08);
        const e = 1 - Math.pow(1 - this._camAnim.t, 3);
        this.camera.position.lerpVectors(this._camAnim.p0, this._camAnim.p1, e);
        this.controls.target.lerpVectors(this._camAnim.t0, this._camAnim.t1, e);
        if (this._camAnim.t >= 1) this._camAnim = null;
      }
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    this._loop();
  }

  /**
   * Builds a genuine Haute-Joaillerie PMREM studio softbox HDRI with bright studio strips
   * and crisp dark contrast bands so mirror gold gleams and diamonds blaze with contrast!
   */
  _buildJewelrySoftboxEnv() {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x1b1f29);

    const addPanel = (color, intensity, pos, rot, scale) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide })
      );
      m.position.set(pos[0], pos[1], pos[2]);
      m.rotation.set(rot[0], rot[1], rot[2]);
      m.scale.set(scale[0], scale[1], 1);
      envScene.add(m);
    };

    // Overhead main light-tent canopy
    addPanel(0xffffff, 2.8, [0, 14, 0], [Math.PI / 2, 0, 0], [18, 18]);
    // Warm left softbox + cool right softbox (creates classic jewelry gold-vs-platinum gradient!)
    addPanel(0xfff5e0, 2.5, [-14, 5, 6], [0, Math.PI / 2.4, 0], [14, 9]);
    addPanel(0xe8f3ff, 2.4, [14, 6, 5], [0, -Math.PI / 2.4, 0], [14, 9]);
    // Front high fill strip
    addPanel(0xffffff, 2.0, [0, 7, 15], [0, Math.PI, 0], [16, 4.5]);
    // Rear rim strip
    addPanel(0xffffff, 2.6, [0, 8, -14], [0, 0, 0], [18, 5]);
    // Crisp jewelry-photography contrast & warm under-bounce cards (luminous platinum/gold undersides!)
    addPanel(0x1e2433, 1.0, [-11, -3, 10], [0, Math.PI / 4, 0], [8, 8]);
    addPanel(0x1e2433, 1.0, [11, -3, 10], [0, -Math.PI / 4, 0], [8, 8]);
    addPanel(0xdbeafe, 1.15, [0, -10, 4], [-Math.PI / 2, 0, 0], [20, 20]);
    // Pinpoint sparkle bulbs for brilliant diamond fire flashes!
    const bulbGeo = new THREE.SphereGeometry(0.65, 10, 10);
    const bulbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffffff).multiplyScalar(8.5) });
    const bulbCoords = [[5, 11, 8], [-6, 10, 7], [8, 8, -6], [-8, 9, -5], [0, 12, 3], [4, 7, 11]];
    for (const c of bulbCoords) {
      const b = new THREE.Mesh(bulbGeo, bulbMat);
      b.position.set(c[0], c[1], c[2]);
      envScene.add(b);
    }

    const rt = pmrem.fromScene(envScene, 0.02);
    pmrem.dispose();
    return rt.texture;
  }

  _createFinishBumpMaps() {
    const makeTex = (drawFn) => {
      const c = document.createElement('canvas');
      c.width = 256; c.height = 256;
      const ctx = c.getContext('2d');
      drawFn(ctx, 256, 256);
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(4, 4);
      return tex;
    };
    const brushed = makeTex((ctx, w, h) => {
      ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y++) {
        const v = 110 + ((Math.sin(y * 17.3) * 43758.5) % 1) * 35;
        ctx.fillStyle = `rgb(${v | 0},${v | 0},${v | 0})`;
        ctx.fillRect(0, y, w, 1);
      }
    });
    const sandblasted = makeTex((ctx, w, h) => {
      const img = ctx.createImageData(w, h);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 90 + Math.random() * 85;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    });
    return { brushed, sandblasted };
  }

  _getMetalMaterial(alloyId, finish) {
    const key = `m_${alloyId}_${finish}_${this.showWireframe}`;
    if (this.materialCache.has(key)) return this.materialCache.get(key);
    const alloy = (window.JewelryEngine && window.JewelryEngine.ALLOYS[alloyId]) || {
      color: '#F2C75C', metalness: 0.97, roughness: 0.08
    };
    let rough = alloy.roughness;
    let bumpMap = null;
    let bumpScale = 0;
    let clearcoat = 0.0;
    if (finish === 'satin') rough = Math.min(0.32, alloy.roughness + 0.16);
    else if (finish === 'brushed') { rough = 0.26; bumpMap = this.bumpMaps.brushed; bumpScale = 0.05; }
    else if (finish === 'sandblasted') { rough = 0.44; bumpMap = this.bumpMaps.sandblasted; bumpScale = 0.08; }
    else if (finish === 'mirror') { rough = Math.max(0.04, alloy.roughness); clearcoat = alloyId === 'waxresin' ? 0.55 : 0.12; }

    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(alloy.color),
      metalness: alloy.metalness,
      roughness: rough,
      clearcoat,
      clearcoatRoughness: 0.06,
      bumpMap,
      bumpScale,
      envMapIntensity: SHOWROOMS[this.showroom].envInt,
      wireframe: this.showWireframe
    });
    this.materialCache.set(key, mat);
    return mat;
  }

  _getGemMaterial(gemId) {
    const key = `g_${gemId}_${this.showWireframe}`;
    if (this.materialCache.has(key)) return this.materialCache.get(key);
    const gm = (window.JewelryEngine && window.JewelryEngine.GEM_MATERIALS[gemId]) || {
      color: '#FFFFFF', attenuation: '#EEF6FF', ior: 2.417, dispersion: 0.044, transmission: 0.96, roughness: 0.015
    };

    let mat;
    if (gm.isPearl) {
      mat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(gm.color),
        metalness: 0.05,
        roughness: 0.14,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
        iridescence: 0.85,
        iridescenceIOR: 1.35,
        envMapIntensity: 1.5,
        wireframe: this.showWireframe
      });
    } else if (gm.transmission <= 0.05) {
      mat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(gm.color),
        metalness: 0.1,
        roughness: 0.04,
        clearcoat: 1.0,
        clearcoatRoughness: 0.03,
        flatShading: true,
        envMapIntensity: 1.8,
        wireframe: this.showWireframe
      });
    } else {
      const cfg = {
        color: new THREE.Color(gm.color),
        metalness: 0.0,
        roughness: gm.roughness,
        ior: gm.ior,
        transmission: gm.transmission,
        thickness: 3.6,
        attenuationColor: new THREE.Color(gm.attenuation || gm.color),
        attenuationDistance: gm.id === 'diamond' ? 14.0 : 4.2,
        reflectivity: 1.0,
        specularIntensity: 1.4,
        specularColor: new THREE.Color(0xffffff),
        envMapIntensity: 2.35,
        flatShading: true,
        wireframe: this.showWireframe
      };
      // Three.js r165+ physical chromatic diamond dispersion!
      if ('dispersion' in THREE.MeshPhysicalMaterial.prototype && gm.dispersion) {
        cfg.dispersion = gm.dispersion * 4.5;
      }
      mat = new THREE.MeshPhysicalMaterial(cfg);
    }
    this.materialCache.set(key, mat);
    return mat;
  }

  /**
   * Renders the build output from JewelryEngine.buildJewelry() onto the showroom stage!
   */
  renderBuild(buildResult, resetCamera) {
    this.latestBuild = buildResult;
    this.materialCache.clear();

    // Dispose old meshes cleanly
    while (this.jewelryGroup.children.length > 0) {
      const child = this.jewelryGroup.children.pop();
      if (child.geometry) child.geometry.dispose();
    }

    const { parts, state, stats } = buildResult;
    const minY = stats.bounds.minY;
    const cx = (stats.bounds.minX + stats.bounds.maxX) * 0.5;
    const cz = (stats.bounds.minZ + stats.bounds.maxZ) * 0.5;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(part.positions, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(part.normals, 3));

      let mesh;
      if (part.role === 'metal' && part.zones && part.innerMaterialId && part.innerMaterialId !== part.materialId) {
        // Two-tone exact seam material splitting (ZERO vertex-color bleeding!)
        const outerIdx = [];
        const innerIdx = [];
        const idx = part.indices;
        const z = part.zones;
        for (let t = 0; t < idx.length; t += 3) {
          const a = idx[t], b = idx[t + 1], c = idx[t + 2];
          if (z[a] === 1 && z[b] === 1 && z[c] === 1) {
            innerIdx.push(a, b, c);
          } else {
            outerIdx.push(a, b, c);
          }
        }
        const combined = new Uint32Array(outerIdx.length + innerIdx.length);
        combined.set(outerIdx, 0);
        combined.set(innerIdx, outerIdx.length);
        geo.setIndex(new THREE.BufferAttribute(combined, 1));
        geo.addGroup(0, outerIdx.length, 0);
        geo.addGroup(outerIdx.length, innerIdx.length, 1);
        const mats = [
          this._getMetalMaterial(part.materialId, state.finish),
          this._getMetalMaterial(part.innerMaterialId, state.finish)
        ];
        mesh = new THREE.Mesh(geo, mats);
      } else {
        geo.setIndex(new THREE.BufferAttribute(part.indices, 1));
        const mat = part.role === 'gem'
          ? this._getGemMaterial(part.materialId)
          : this._getMetalMaterial(part.materialId, state.finish);
        mesh = new THREE.Mesh(geo, mat);
      }

      mesh.name = part.name || ('part_' + i);
      mesh.userData = { role: part.role, subRole: part.subRole || '' };
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.jewelryGroup.add(mesh);
    }

    // Rest jewelry cleanly on showroom stage (y = 0) centered horizontally
    this.jewelryGroup.position.set(-cx, -minY, -cz);
    this.jewelryGroup.updateMatrixWorld(true);

    // Update scale reference overlay (virtual finger / millimeter caliper!)
    this._rebuildScaleGuide(buildResult, cx, minY, cz);

    // Adjust grid & shadow frustum for large categories (necklaces/crowns/bracelets)
    const maxDim = Math.max(stats.sizeMm.x, stats.sizeMm.y, stats.sizeMm.z, 20);
    const gridScale = maxDim > 85 ? 2.4 : (maxDim > 45 ? 1.5 : 1.0);
    this.gridHelper.scale.set(gridScale, 1, gridScale);
    const sc = Math.max(45, maxDim * 1.4);
    this.keyLight.shadow.camera.left = -sc;
    this.keyLight.shadow.camera.right = sc;
    this.keyLight.shadow.camera.top = sc;
    this.keyLight.shadow.camera.bottom = -sc;
    this.keyLight.shadow.camera.updateProjectionMatrix();

    if (resetCamera) {
      this.setCameraPreset('hero', false);
    }
  }

  /**
   * Builds toggleable visual scale reference (translucent ergonomic finger cylinder + mm ruler!).
   * Strictly visual — completely separate from jewelryGroup so it is NEVER exported!
   */
  _rebuildScaleGuide(buildResult, cx, minY, cz) {
    while (this.guideGroup.children.length > 0) {
      const ch = this.guideGroup.children.pop();
      if (ch.geometry) ch.geometry.dispose();
      if (ch.material) ch.material.dispose();
    }
    const { state, stats } = buildResult;
    const hCenter = (stats.bounds.maxY - minY) * 0.5;

    if (state.category === 'rings') {
      const rIn = (Number(state.innerDiameter) || 17.2) * 0.5;
      // Translucent ergonomic finger silhouette passing through the ring bore along Z
      const fingerGeo = new THREE.CylinderGeometry(rIn * 0.992, rIn * 1.01, 56, 48);
      fingerGeo.rotateX(Math.PI / 2);
      const fingerMat = new THREE.MeshPhysicalMaterial({
        color: 0xf1c2a0,
        roughness: 0.48,
        metalness: 0.0,
        transparent: true,
        opacity: 0.42,
        depthWrite: false
      });
      const finger = new THREE.Mesh(fingerGeo, fingerMat);
      finger.position.set(0, -minY, 0);
      this.guideGroup.add(finger);

      // Inner bore caliper ring indicator
      const calGeo = new THREE.RingGeometry(rIn - 0.14, rIn, 64);
      const calMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
      const calRing = new THREE.Mesh(calGeo, calMat);
      calRing.position.set(0, -minY, (state.width || 4.5) * 0.5 + 0.4);
      this.guideGroup.add(calRing);
    }

    // Millimeter precision caliper bar on showroom floor
    const span = Math.max(25, Math.ceil((stats.sizeMm.x + 12) / 10) * 10);
    const tickMat = new THREE.LineBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.78 });
    const pts = [];
    const zLine = stats.sizeMm.z * 0.5 + 8;
    pts.push(new THREE.Vector3(-span * 0.5, 0.08, zLine), new THREE.Vector3(span * 0.5, 0.08, zLine));
    for (let x = -span * 0.5; x <= span * 0.5 + 0.01; x += 5) {
      const major = (Math.round(x) % 10 === 0);
      pts.push(new THREE.Vector3(x, 0.08, zLine), new THREE.Vector3(x, 0.08, zLine + (major ? 2.8 : 1.4)));
    }
    const tickGeo = new THREE.BufferGeometry().setFromPoints(pts);
    this.guideGroup.add(new THREE.LineSegments(tickGeo, tickMat));
    this.guideGroup.visible = this.showScaleGuide;
  }

  setShowroom(themeId) {
    const t = SHOWROOMS[themeId] || SHOWROOMS.pearl;
    this.showroom = themeId;
    this.container.style.background = t.bg;
    this.shadowPlane.material.opacity = t.shadowOp;
    this.keyLight.intensity = t.keyInt;
    this.materialCache.forEach((mat) => {
      if (mat.metalness > 0.3) mat.envMapIntensity = t.envInt;
    });
  }

  setAutoSpin(enabled, speed) {
    this.autoSpin = !!enabled;
    if (speed != null) this.spinSpeed = Number(speed);
    this.controls.autoRotate = this.autoSpin;
    this.controls.autoRotateSpeed = this.spinSpeed;
  }

  setScaleGuide(enabled) {
    this.showScaleGuide = !!enabled;
    this.guideGroup.visible = this.showScaleGuide;
  }

  setWireframe(enabled) {
    this.showWireframe = !!enabled;
    if (this.latestBuild) this.renderBuild(this.latestBuild, false);
  }

  setLightAngle(deg) {
    this.lightAngle = deg;
    this.lightRig.rotation.y = (deg * Math.PI) / 180;
  }

  /**
   * Camera presets including Jeweler's 10× Macro Loupe directly inspecting the crown & prongs!
   */
  setCameraPreset(preset, animate = true) {
    if (!this.latestBuild) return;
    const { stats, state } = this.latestBuild;
    const h = stats.sizeMm.y;
    const maxD = Math.max(stats.sizeMm.x, stats.sizeMm.y, stats.sizeMm.z, 18);
    const dist = maxD * 2.05;
    let target = new THREE.Vector3(0, h * 0.5, 0);
    let pos = new THREE.Vector3(dist * 0.62, h * 0.5 + dist * 0.42, dist * 0.85);

    if (preset === 'front') {
      pos.set(0, h * 0.52, dist * 1.15);
    } else if (preset === 'top') {
      pos.set(0, h + dist * 1.05, 0.01);
    } else if (preset === 'side') {
      pos.set(dist * 1.15, h * 0.52, 0);
    } else if (preset === 'inside') {
      // Inspect inside comfort-fit bore & interior engraving!
      pos.set(0, h * 0.56, dist * 0.78);
      target.set(0, h * 0.36, 0);
    } else if (preset === 'loupe10x') {
      // 10× Jeweler's Macro Loupe zoomed directly onto the setting crown & diamond facets!
      const focusY = (state.category === 'rings') ? (h * 0.86) : (h * 0.54);
      const loupeDist = Math.max(9.5, Math.min(20, maxD * 0.58));
      target.set(0, focusY, 0);
      pos.set(loupeDist * 0.55, focusY + loupeDist * 0.52, loupeDist * 0.72);
    }

    if (animate) {
      this._camAnim = { p0: this.camera.position.clone(), p1: pos, t0: this.controls.target.clone(), t1: target, t: 0 };
    } else {
      this._camAnim = null;
      this.camera.position.copy(pos);
      this.controls.target.copy(target);
      this.controls.update();
    }
  }

  /**
   * Exports exact 1:1 Meter-Scale GLB (mm * 0.001) — compatible with Blender, WebAR, SceneViewer & QuickLook!
   */
  exportGLB(options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.latestBuild) return reject(new Error('No geometry'));
      const scaleMmToMeters = 0.001 * (1 + (Number(options.shrinkagePercent) || 0) / 100);
      const castableOnly = !!options.castableMetalOnly;

      const exportRoot = new THREE.Group();
      exportRoot.name = 'StudiosProJewelry';
      this.jewelryGroup.updateMatrixWorld(true);

      this.jewelryGroup.children.forEach((mesh) => {
        if (castableOnly && mesh.userData && mesh.userData.role === 'gem') return;
        const clone = mesh.clone();
        clone.position.copy(this.jewelryGroup.position).multiplyScalar(scaleMmToMeters);
        clone.scale.setScalar(scaleMmToMeters);
        exportRoot.add(clone);
      });
      exportRoot.updateMatrixWorld(true);

      const exporter = new GLTFExporter();
      exporter.parse(
        exportRoot,
        (result) => resolve(result),
        (err) => reject(err),
        { binary: true }
      );
    });
  }

  /**
   * True 1:1 mm-accurate WebAR Preview via external contract window.StudiosProAR!
   * Fixes the 3.8-meter AR bug completely — zero edits to AR Viewer!
   */
  async sendToWebAR() {
    if (!this.latestBuild || !window.StudiosProAR) {
      throw new Error('AR bridge unavailable');
    }
    const { state, stats } = this.latestBuild;
    const glbBuffer = await this.exportGLB({ castableMetalOnly: state.castableMetalOnly, shrinkagePercent: 0 });
    window.StudiosProAR.sendModel({
      modelData: glbBuffer,
      extension: 'glb',
      isBinary: true,
      name: `jewelry_${state.category}_${state.material}.glb`,
      placement: 'floor',
      dimensionsMm: {
        x: stats.sizeMm.x,
        y: stats.sizeMm.y,
        z: stats.sizeMm.z
      },
      sourceStudio: 'jewelry-pro'
    });
  }

  /**
   * Captures a luxury studio PNG snapshot (Free: subtle watermark / Pro: 2x crisp clean render!).
   */
  captureRenderPNG(isPro) {
    this.renderer.render(this.scene, this.camera);
    const src = this.renderer.domElement;
    const out = document.createElement('canvas');
    out.width = src.width;
    out.height = src.height;
    const ctx = out.getContext('2d');

    // Paint showroom backdrop gradient behind alpha WebGL canvas
    const grad = ctx.createRadialGradient(out.width * 0.5, out.height * 0.36, out.width * 0.05, out.width * 0.5, out.height * 0.5, out.width * 0.72);
    if (this.showroom === 'dark') { grad.addColorStop(0, '#252834'); grad.addColorStop(1, '#08090d'); }
    else if (this.showroom === 'royal') { grad.addColorStop(0, '#1d3566'); grad.addColorStop(1, '#071022'); }
    else if (this.showroom === 'velvet') { grad.addColorStop(0, '#3f3122'); grad.addColorStop(1, '#120d09'); }
    else if (this.showroom === 'white') { grad.addColorStop(0, '#ffffff'); grad.addColorStop(1, '#eef2f6'); }
    else { grad.addColorStop(0, '#ffffff'); grad.addColorStop(1, '#cbd5e1'); }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(src, 0, 0);

    if (!isPro) {
      ctx.save();
      ctx.font = `700 ${Math.max(14, Math.round(out.width * 0.016))}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = this.showroom === 'pearl' || this.showroom === 'white' ? 'rgba(15,23,42,0.45)' : 'rgba(255,215,0,0.65)';
      ctx.textAlign = 'right';
      ctx.fillText('Studios-Pro · Jewelry Maker Pro', out.width - 24, out.height - 20);
      ctx.restore();
    }
    return out.toDataURL('image/png');
  }

  /**
   * Records a 4.5s cinematic luxury .WEBM showcase video (360° Turntable, Macro Loupe Orbit, or Light Sweep).
   */
  recordShowcaseVideo(mode = 'turntable', isPro = false, onProgress = null) {
    return new Promise((resolve, reject) => {
      if (typeof MediaRecorder === 'undefined') return reject(new Error('MediaRecorder unsupported'));
      const src = this.renderer.domElement;
      const comp = document.createElement('canvas');
      comp.width = Math.min(1280, src.width);
      comp.height = Math.min(720, src.height);
      const ctx = comp.getContext('2d');

      const stream = comp.captureStream(30);
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4500000 });
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
      rec.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));

      const origPos = this.camera.position.clone();
      const origTarget = this.controls.target.clone();
      const origSpin = this.controls.autoRotate;
      const origLight = this.lightRig.rotation.y;
      this.controls.autoRotate = false;

      if (mode === 'loupe') this.setCameraPreset('loupe10x', false);
      const startOffset = this.camera.position.clone().sub(this.controls.target);
      const radius = Math.hypot(startOffset.x, startOffset.z);
      const startAng = Math.atan2(startOffset.x, startOffset.z);
      const startY = startOffset.y;

      rec.start();
      const durationMs = 4500;
      const tStart = performance.now();

      const tick = (now) => {
        const p = Math.min(1, (now - tStart) / durationMs);
        if (mode === 'lightsweep') {
          this.lightRig.rotation.y = origLight + p * Math.PI * 2;
          const a = startAng + Math.sin(p * Math.PI * 2) * 0.35;
          this.camera.position.set(
            this.controls.target.x + Math.sin(a) * radius,
            this.controls.target.y + startY,
            this.controls.target.z + Math.cos(a) * radius
          );
        } else {
          const a = startAng + p * Math.PI * 2;
          this.camera.position.set(
            this.controls.target.x + Math.sin(a) * radius,
            this.controls.target.y + startY + Math.sin(p * Math.PI * 2) * (mode === 'loupe' ? 1.8 : 2.5),
            this.controls.target.z + Math.cos(a) * radius
          );
        }
        this.camera.lookAt(this.controls.target);
        this.renderer.render(this.scene, this.camera);

        // Composite backdrop + WebGL frame + optional Free watermark
        ctx.fillStyle = (this.showroom === 'pearl' || this.showroom === 'white') ? '#e8edf5' : '#11141d';
        ctx.fillRect(0, 0, comp.width, comp.height);
        ctx.drawImage(src, 0, 0, comp.width, comp.height);
        if (!isPro) {
          ctx.font = '700 16px Inter, system-ui, sans-serif';
          ctx.fillStyle = (this.showroom === 'pearl' || this.showroom === 'white') ? 'rgba(15,23,42,0.5)' : 'rgba(255,215,0,0.75)';
          ctx.textAlign = 'right';
          ctx.fillText('Studios-Pro · Jewelry Maker Pro', comp.width - 20, comp.height - 16);
        }
        if (onProgress) onProgress(Math.round(p * 100));

        if (p < 1) requestAnimationFrame(tick);
        else {
          rec.stop();
          this.camera.position.copy(origPos);
          this.controls.target.copy(origTarget);
          this.lightRig.rotation.y = origLight;
          this.controls.autoRotate = origSpin;
          this.controls.update();
        }
      };
      requestAnimationFrame(tick);
    });
  }

  /**
   * Generates a standalone Interactive 3D Client Approval Proof (.HTML) with embedded base64 GLB!
   */
  async buildClientProofHTML(lang = 'en') {
    const glb = await this.exportGLB({ castableMetalOnly: false, shrinkagePercent: 0 });
    const bytes = new Uint8Array(glb);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    const b64 = btoa(bin);
    const { state, stats } = this.latestBuild;
    const alloy = window.JewelryEngine.ALLOYS[state.material] || window.JewelryEngine.ALLOYS.gold18k;
    const title = lang === 'fr' ? 'Aperçu 3D Haute Joaillerie — Studios-Pro' : '3D Luxury Jewelry Proof — Studios-Pro';
    const alloyName = lang === 'fr' ? alloy.nameFr : alloy.nameEn;

    return `<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>body{margin:0;overflow:hidden;background:radial-gradient(circle at 50% 35%,#1e2433,#090b10);color:#f8fafc;font-family:Inter,system-ui,sans-serif}
.hud{position:fixed;top:18px;left:18px;background:rgba(15,23,42,.78);backdrop-filter:blur(12px);border:1px solid rgba(250,204,21,.35);border-radius:14px;padding:14px 18px;max-width:300px}
.hud h1{margin:0 0 6px;font-size:15px;color:#fde047;letter-spacing:.04em}
.hud p{margin:3px 0;font-size:12px;color:#cbd5e1}
.foot{position:fixed;bottom:14px;left:50%;transform:translateX(-50%);background:rgba(15,23,42,.72);padding:7px 14px;border-radius:99px;font-size:11px;color:#94a3b8;border:1px solid rgba(255,255,255,.1)}</style>
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/"}}</script>
</head><body>
<div class="hud"><h1>💎 ${title}</h1>
<p><strong>${alloyName}</strong> · ${stats.metalWeightG} g</p>
<p>Ø ${stats.innerDiamMm} / ${stats.outerDiamMm} mm · ${stats.sizeMm.x} × ${stats.sizeMm.y} × ${stats.sizeMm.z} mm</p>
${stats.gemCount > 0 ? `<p>${stats.gemCount} stone(s) · ${stats.totalCarats} ctw</p>` : ''}</div>
<div class="foot">Drag to Rotate · Scroll to Zoom · Created with Studios-Pro Jewelry Maker Pro</div>
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(35,innerWidth/innerHeight,0.0005,10);
cam.position.set(0.035,0.028,0.055);
const r=new THREE.WebGLRenderer({antialias:true,alpha:true});r.setSize(innerWidth,innerHeight);r.setPixelRatio(Math.min(devicePixelRatio,2));
r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.2;document.body.appendChild(r.domElement);
const pmrem=new THREE.PMREMGenerator(r);scene.environment=pmrem.fromScene(new RoomEnvironment(),0.03).texture;
const ctrl=new OrbitControls(cam,r.domElement);ctrl.enableDamping=true;ctrl.autoRotate=true;ctrl.autoRotateSpeed=1.4;
const raw=atob("${b64}");const u8=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)u8[i]=raw.charCodeAt(i);
new GLTFLoader().parse(u8.buffer,'',g=>{scene.add(g.scene);const b=new THREE.Box3().setFromObject(g.scene),s=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3());
const md=Math.max(s.x,s.y,s.z,0.015);ctrl.target.copy(c);cam.position.set(c.x+md*1.2,c.y+md*0.8,c.z+md*1.7);});
addEventListener('resize',()=>{cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();r.setSize(innerWidth,innerHeight);});
(function loop(){requestAnimationFrame(loop);ctrl.update();r.render(scene,cam);})();
</script></body></html>`;
  }

  /**
   * Generates a Print-Ready Atelier Jeweler Spec Sheet (.HTML) with snapshot, exact mm dimensions,
   * karat weight table, wax weight, gemstone list & cost breakdown!
   */
  buildSpecSheetHTML(lang = 'en', isPro = true) {
    const { state, stats, preflight } = this.latestBuild;
    const alloy = window.JewelryEngine.ALLOYS[state.material] || window.JewelryEngine.ALLOYS.gold18k;
    const gemMat = window.JewelryEngine.GEM_MATERIALS[state.stoneMaterial] || window.JewelryEngine.GEM_MATERIALS.diamond;
    const snapshot = this.captureRenderPNG(isPro);
    const fr = lang === 'fr';
    const alloyRows = ['gold24k', 'gold18k', 'gold14k', 'rosegold18k', 'platinum950', 'silver925', 'waxresin'].map((id) => {
      const a = window.JewelryEngine.ALLOYS[id];
      const w = (stats.metalVolCm3 * a.density).toFixed(2);
      const active = id === state.material ? ' style="background:#fef9c3;font-weight:700"' : '';
      return `<tr${active}><td>${fr ? a.nameFr : a.nameEn}</td><td>${a.density} g/cm³</td><td>${w} g</td><td>€ ${Math.round(w * a.spotEur).toLocaleString()}</td></tr>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="utf-8"><title>${fr ? 'Fiche Technique Joaillerie' : 'Master Jeweler Spec Sheet'} — Studios-Pro</title>
<style>body{font-family:Inter,system-ui,sans-serif;color:#0f172a;background:#f8fafc;margin:0;padding:32px}
.sheet{max-width:860px;margin:0 auto;background:#fff;border:1px solid #cbd5e1;border-radius:16px;padding:32px;box-shadow:0 12px 30px rgba(15,23,42,.08)}
.head{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #eab308;padding-bottom:16px;margin-bottom:24px}
.head h1{margin:0;font-size:22px}.badge{background:#fef9c3;color:#854d0e;border:1px solid #facc15;padding:6px 12px;border-radius:99px;font-weight:700;font-size:12px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px}
.shot{width:100%;border-radius:12px;border:1px solid #e2e8f0}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}
th,td{padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:left}th{background:#f1f5f9;font-weight:700}
.foot{margin-top:24px;font-size:11px;color:#64748b;display:flex;justify-content:space-between}
@media print{body{padding:0;background:#fff}.sheet{box-shadow:none;border:none}}</style></head><body>
<div class="sheet">
  <div class="head">
    <div><h1>💍 ${fr ? 'Fiche Technique d’Atelier Joaillerie' : 'Master Jeweler Casting & CAD Spec Sheet'}</h1>
    <div style="font-size:12px;color:#64748b;margin-top:4px">Studios-Pro Jewelry Maker Pro · 1:1 mm Precision CAD · ${new Date().toLocaleDateString()}</div></div>
    <div class="badge">Pre-Flight: ${preflight.score}/100 (${preflight.grade})</div>
  </div>
  <div class="grid">
    <img class="shot" src="${snapshot}" alt="Jewelry Render" />
    <div>
      <h3 style="margin-top:0">${fr ? 'Spécifications Dimensionnelles (1:1 mm)' : 'Dimensional Specifications (1:1 mm)'}</h3>
      <table>
        <tr><td>${fr ? 'Catégorie / Profil' : 'Category / Profile'}</td><td><strong>${state.category.toUpperCase()} / ${state.profile}</strong></td></tr>
        <tr><td>${fr ? 'Diamètre Int. / Ext.' : 'Inner / Outer Ø'}</td><td><strong>Ø ${stats.innerDiamMm} / ${stats.outerDiamMm} mm</strong></td></tr>
        <tr><td>${fr ? 'Encombrement Total' : 'Bounding Box'}</td><td>${stats.sizeMm.x} × ${stats.sizeMm.y} × ${stats.sizeMm.z} mm</td></tr>
        <tr><td>${fr ? 'Largeur / Épaisseur' : 'Band Width / Wall'}</td><td>${state.width} mm / ${state.thickness} mm</td></tr>
        <tr><td>${fr ? 'Volume Métal Exact' : 'Exact Metal Volume'}</td><td><strong>${stats.metalVolCm3} cm³ (${stats.metalVolMm3} mm³)</strong></td></tr>
        <tr><td>${fr ? 'Poids Résine / Cire' : 'Castable Wax Weight'}</td><td>${stats.waxWeightG} g (${stats.metalVolCm3} ml)</td></tr>
        <tr><td>${fr ? 'Sertissage & Pierres' : 'Gemstones & Setting'}</td><td>${stats.gemCount > 0 ? `${stats.gemCount}× ${state.stoneType} (${fr ? gemMat.nameFr : gemMat.nameEn}) — <strong>${stats.totalCarats} ctw</strong>` : (fr ? 'Aucune pierre' : 'None')}</td></tr>
        <tr><td>${fr ? 'Retrait Fonte STL' : 'STL Shrinkage Comp.'}</td><td>+${Number(state.shrinkagePercent || 0).toFixed(1)}% · ${state.castableMetalOnly ? (fr ? 'Métal Seul (Fonte)' : 'Castable Metal-Only') : (fr ? 'Assemblage Complet' : 'Full Assembly')}</td></tr>
        ${state.engraveText ? `<tr><td>${fr ? 'Gravure' : 'Engraving'}</td><td>"${state.engraveText}" (${state.engraveInside ? (fr ? 'Intérieur' : 'Inside') : (fr ? 'Extérieur' : 'Outside')})</td></tr>` : ''}
      </table>
    </div>
  </div>
  <h3>${fr ? 'Tableau de Poids Exact & Estimation Métal par Alliage' : 'Exact Casting Weight & Metal Valuation by Alloy'}</h3>
  <table><thead><tr><th>${fr ? 'Alliage' : 'Alloy'}</th><th>${fr ? 'Densité' : 'Density'}</th><th>${fr ? 'Poids Exact' : 'Exact Weight'}</th><th>${fr ? 'Coût Métal Est.' : 'Est. Metal Spot'}</th></tr></thead>
  <tbody>${alloyRows}</tbody></table>
  <div class="foot"><span>${fr ? 'Estimation Totale Atelier' : 'Total Atelier Estimate'}: <strong>€ ${stats.cost.totalEur.toLocaleString()}</strong> (${fr ? 'Métal' : 'Metal'} €${stats.cost.metalEur} + ${fr ? 'Pierres' : 'Gems'} €${stats.cost.gemEur} + ${fr ? 'Main-d’œuvre' : 'Labor'} €${stats.cost.laborEur})</span><span>Watertight Manifold: ${stats.isWatertight ? 'PASS (0 open edges)' : 'CHECK'}</span></div>
</div></body></html>`;
  }

  resize() {
    const w = Math.max(100, this.container.clientWidth);
    const h = Math.max(100, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}

window.JewelryViewport = JewelryViewport;
window.dispatchEvent(new CustomEvent('jewelry-viewport-ready'));
