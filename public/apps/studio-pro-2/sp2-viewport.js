/**
 * Studio Pro 2 — Three.js r165 Real-Time 4D Viewport, GPU UnrealBloomPass,
 * 8 PBR Studio Materials, 5 Atmospheres, Live WEBM Video Recorder & Color-Preserving 1:1 m GLB/AR Bridge.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const PI = Math.PI;
const DEG = Math.PI / 180;

class SP2Viewport {
  constructor(container) {
    this.container = container;
    this.showGrid = true;
    this.wireframe = false;
    this.bloomEnabled = false;
    this.playing4D = true;
    this.speed4D = 1.0;
    this.time4D = 0;

    this.materialKey = 'auto';
    this.themeKey = 'cyber';
    this.globalColor = '#38bdf8';

    this.latestBuild = null;
    this.partMeshes = [];
    this.particleCloud = null;

    this.scene = new THREE.Scene();

    const w = Math.max(120, container.clientWidth);
    const h = Math.max(120, container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(40, w / h, 0.2, 5000);
    this.camera.position.set(110, 88, 130);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    // GPU Post-Processing Pipeline (Crisp Electric UnrealBloomPass!)
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.42, 0.35, 0.82);
    this.outputPass = new OutputPass();
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.outputPass);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxDistance = 1600;

    // Neutral HDRI PMREM environment for authentic Glassmorphism, Chrome, Gold & Crystal!
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Balanced 3-point studio lighting
    this.hemi = new THREE.HemisphereLight(0xf8fafc, 0x1e293b, 0.65);
    this.scene.add(this.hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(140, 220, 160);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004;
    key.shadow.camera.left = -180; key.shadow.camera.right = 180;
    key.shadow.camera.top = 180; key.shadow.camera.bottom = -180;
    key.shadow.camera.far = 900;
    this.scene.add(key);

    const rim = new THREE.DirectionalLight(0x8b5cf6, 0.85);
    rim.position.set(-160, 110, -140);
    this.scene.add(rim);

    this.gridGroup = new THREE.Group();
    this.scene.add(this.gridGroup);
    this._rebuildGrid();

    this.shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(800, 800),
      new THREE.ShadowMaterial({ opacity: 0.22 })
    );
    this.shadowPlane.rotation.x = -PI / 2;
    this.shadowPlane.position.y = -0.04;
    this.shadowPlane.receiveShadow = true;
    this.scene.add(this.shadowPlane);

    this.modelGroup = new THREE.Group();
    this.modelGroup.name = 'StudioPro2Model';
    this.scene.add(this.modelGroup);

    this.fxGroup = new THREE.Group();
    this.fxGroup.name = 'StudioPro2FX';
    this.scene.add(this.fxGroup);

    this.setTheme('cyber');

    this._lastTime = performance.now();
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);

    const tick = (now) => {
      this._raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - this._lastTime) / 1000);
      this._lastTime = now;
      if (this.playing4D) this._step4D(dt);
      this.controls.update();
      if (this.bloomEnabled) this.composer.render();
      else this.renderer.render(this.scene, this.camera);
    };
    this._raf = requestAnimationFrame(tick);
  }

  _rebuildGrid() {
    this._disposeGroup(this.gridGroup);
    const C = window.SP2Core;
    const th = (C && C.THEMES[this.themeKey]) || { grid1: 0x334155, grid2: 0x1e293b };
    const grid = new THREE.GridHelper(220, 22, th.grid1, th.grid2);
    grid.material.transparent = true;
    grid.material.opacity = 0.48;
    this.gridGroup.add(grid);
    this.gridGroup.visible = this.showGrid;
  }

  setTheme(key) {
    this.themeKey = key || 'cyber';
    const C = window.SP2Core;
    const th = (C && C.THEMES[this.themeKey]) || { bg: '#060a14' };
    this.scene.background = new THREE.Color(th.bg);
    this._rebuildGrid();
  }

  resize() {
    const w = Math.max(100, this.container.clientWidth);
    const h = Math.max(100, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.bloomPass.setSize(w, h);
  }

  _disposeGroup(grp) {
    while (grp.children.length) {
      const ch = grp.children[0];
      grp.remove(ch);
      ch.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
    }
  }

  /**
   * Builds crisp Crease-Split display BufferGeometry preserving per-vertex RGB colors!
   * For live-morphing 4D geometries (wave / organic), keeps indexed BufferGeometry so vertex updates are O(V) 60 FPS!
   */
  _buildDisplayGeometry(part, keepIndexed) {
    const pos = part.positions, idx = part.indices, cols = part.colors;
    const pivot = part.pivot || [0, 0, 0];

    const toLin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

    if (keepIndexed || (part.creaseDeg && part.creaseDeg >= 170)) {
      const localPos = new Float32Array(pos.length);
      for (let i = 0; i < pos.length; i += 3) {
        localPos[i] = pos[i] - pivot[0];
        localPos[i + 1] = pos[i + 1] - pivot[1];
        localPos[i + 2] = pos[i + 2] - pivot[2];
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(localPos, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(part.normals), 3));
      if (cols) {
        const linCols = new Float32Array(cols.length);
        for (let i = 0; i < cols.length; i++) linCols[i] = toLin(cols[i]);
        geo.setAttribute('color', new THREE.BufferAttribute(linCols, 3));
      }
      geo.setIndex(new THREE.BufferAttribute(new Uint32Array(idx), 1));
      geo.computeVertexNormals();
      return geo;
    }

    // SolidWorks-grade crease-split normals for sharp architectural / faceted / voxel / gear edges!
    const triCount = idx.length / 3;
    const cosThresh = Math.cos((part.creaseDeg || 36) * DEG);
    const faceN = new Float32Array(triCount * 3);
    const vCount = pos.length / 3;
    const vTris = new Array(vCount);
    for (let i = 0; i < vCount; i++) vTris[i] = [];

    for (let t = 0; t < triCount; t++) {
      const i0 = idx[t * 3], i1 = idx[t * 3 + 1], i2 = idx[t * 3 + 2];
      vTris[i0].push(t); vTris[i1].push(t); vTris[i2].push(t);
      const ax = pos[i0 * 3], ay = pos[i0 * 3 + 1], az = pos[i0 * 3 + 2];
      const bx = pos[i1 * 3] - ax, by = pos[i1 * 3 + 1] - ay, bz = pos[i1 * 3 + 2] - az;
      const cx = pos[i2 * 3] - ax, cy = pos[i2 * 3 + 1] - ay, cz = pos[i2 * 3 + 2] - az;
      let nx = by * cz - bz * cy, ny = bz * cx - bx * cz, nz = bx * cy - by * cx;
      const l = Math.hypot(nx, ny, nz) || 1;
      faceN[t * 3] = nx / l; faceN[t * 3 + 1] = ny / l; faceN[t * 3 + 2] = nz / l;
    }

    const outPos = new Float32Array(triCount * 9);
    const outNorm = new Float32Array(triCount * 9);
    const outCol = cols ? new Float32Array(triCount * 9) : null;

    for (let t = 0; t < triCount; t++) {
      const fnx = faceN[t * 3], fny = faceN[t * 3 + 1], fnz = faceN[t * 3 + 2];
      for (let c = 0; c < 3; c++) {
        const vi = idx[t * 3 + c];
        const o = (t * 3 + c) * 3;
        outPos[o]     = pos[vi * 3]     - pivot[0];
        outPos[o + 1] = pos[vi * 3 + 1] - pivot[1];
        outPos[o + 2] = pos[vi * 3 + 2] - pivot[2];
        if (outCol) {
          outCol[o] = toLin(cols[vi * 3]); outCol[o + 1] = toLin(cols[vi * 3 + 1]); outCol[o + 2] = toLin(cols[vi * 3 + 2]);
        }
        let sx = fnx, sy = fny, sz = fnz;
        const adj = vTris[vi];
        for (let k = 0; k < adj.length; k++) {
          const ot = adj[k];
          if (ot === t) continue;
          const onx = faceN[ot * 3], ony = faceN[ot * 3 + 1], onz = faceN[ot * 3 + 2];
          if (fnx * onx + fny * ony + fnz * onz >= cosThresh) { sx += onx; sy += ony; sz += onz; }
        }
        const sl = Math.hypot(sx, sy, sz) || 1;
        outNorm[o] = sx / sl; outNorm[o + 1] = sy / sl; outNorm[o + 2] = sz / sl;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(outPos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(outNorm, 3));
    if (outCol) geo.setAttribute('color', new THREE.BufferAttribute(outCol, 3));
    return geo;
  }

  _makeMaterial(part) {
    const C = window.SP2Core;
    const matSpec = (C && C.MATERIALS[this.materialKey]) || { metalness: 0.25, roughness: 0.35, emissive: 0 };
    const useVertCol = !!part.colors && this.materialKey !== 'gold' && this.materialKey !== 'chrome';
    const baseHex = matSpec.overrideColor || (useVertCol ? '#ffffff' : (part.color || this.globalColor || '#38bdf8'));
    const isGlass = (this.materialKey === 'glass') || (this.materialKey === 'auto' && part.glass);
    const emInt = part.emissive != null ? part.emissive : (matSpec.emissive || 0);

    if (isGlass && !this.wireframe) {
      return new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(baseHex),
        vertexColors: useVertCol,
        metalness: 0.05,
        roughness: 0.06,
        transmission: part.opacity < 0.9 ? 0.55 : 0.88,
        thickness: 12,
        ior: 1.52,
        transparent: part.opacity < 0.99,
        opacity: part.opacity != null ? part.opacity : 1.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05
      });
    }

    if (matSpec.iridescence && !this.wireframe) {
      return new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(baseHex),
        vertexColors: useVertCol,
        metalness: 0.72,
        roughness: 0.16,
        iridescence: 1.0,
        iridescenceIOR: 1.38,
        clearcoat: 0.8,
        emissive: new THREE.Color(baseHex),
        emissiveIntensity: emInt
      });
    }

    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(baseHex),
      vertexColors: useVertCol,
      metalness: matSpec.metalness,
      roughness: matSpec.roughness,
      wireframe: this.wireframe,
      emissive: emInt > 0 ? new THREE.Color(part.color || this.globalColor || '#00f3ff') : new THREE.Color(0x000000),
      emissiveIntensity: emInt
    });
  }

  setBuild(build, opts, refit) {
    this.latestBuild = build;
    if (opts) {
      if (opts.materialKey) this.materialKey = opts.materialKey;
      if (opts.globalColor) this.globalColor = opts.globalColor;
    }
    this.time4D = 0;
    this.modelGroup.rotation.set(0, 0, 0);
    this.modelGroup.position.set(0, 0, 0);

    // Strict zero-leak GPU disposal!
    this._disposeGroup(this.modelGroup);
    this._disposeGroup(this.fxGroup);
    this.partMeshes = [];
    this.particleCloud = null;

    const keepIdx = !!(build.anim4D && (build.anim4D.type === 'wave_live' || build.anim4D.type === 'organic_morph'));

    for (let i = 0; i < build.parts.length; i++) {
      const p = build.parts[i];
      const pivot = p.pivot || [0, 0, 0];
      const geo = this._buildDisplayGeometry(p, keepIdx);
      const mesh = new THREE.Mesh(geo, this._makeMaterial(p));
      mesh.name = p.name || `part_${i}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.position.set(pivot[0], pivot[1], pivot[2]);
      mesh.userData.part = p;
      this.modelGroup.add(mesh);
      this.partMeshes.push(mesh);
    }

    // Optional live 4D starfield particles (Galaxy studio!)
    if (build.particles) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(build.particles.positions, 3));
      g.setAttribute('color', new THREE.BufferAttribute(build.particles.colors, 3));
      const m = new THREE.PointsMaterial({
        size: build.particles.size || 1.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      this.particleCloud = new THREE.Points(g, m);
      this.fxGroup.add(this.particleCloud);
    }

    if (refit) this.fitCamera('iso');
  }

  refreshMaterials(materialKey, globalColor) {
    if (materialKey) this.materialKey = materialKey;
    if (globalColor) this.globalColor = globalColor;
    for (let i = 0; i < this.partMeshes.length; i++) {
      const m = this.partMeshes[i];
      m.material.dispose();
      m.material = this._makeMaterial(m.userData.part);
    }
  }

  setBloom(on) { this.bloomEnabled = !!on; }
  setWireframe(on) { this.wireframe = !!on; this.refreshMaterials(); }
  setGridVisible(on) { this.showGrid = !!on; this.gridGroup.visible = this.showGrid; }
  set4DPlay(on, speed) { this.playing4D = !!on; if (speed != null) this.speed4D = speed; }

  /**
   * Freezes current live 4D wave/organic deformation right back into `latestBuild.parts`
   * so STL/OBJ/GLB exports capture the EXACT frame currently visible!
   */
  freeze4DToBuild() {
    if (!this.latestBuild) return false;
    for (let i = 0; i < this.partMeshes.length; i++) {
      const m = this.partMeshes[i], p = m.userData.part;
      const posAttr = m.geometry.attributes.position;
      if (posAttr && posAttr.array.length === p.positions.length) {
        const pivot = p.pivot || [0, 0, 0];
        for (let k = 0; k < p.positions.length; k += 3) {
          p.positions[k] = posAttr.array[k] + pivot[0];
          p.positions[k + 1] = posAttr.array[k + 1] + pivot[1];
          p.positions[k + 2] = posAttr.array[k + 2] + pivot[2];
        }
        p.normals = window.SP2Core.computeVertexNormals(p.positions, p.indices);
        const colAttr = m.geometry.attributes.color;
        if (colAttr && p.colors && colAttr.array.length === p.colors.length) {
          p.colors.set(colAttr.array);
        }
      }
    }
    return true;
  }

  _step4D(dt) {
    if (!this.latestBuild || !this.latestBuild.anim4D) return;
    const a = this.latestBuild.anim4D;
    this.time4D += dt * this.speed4D;
    const t = this.time4D;

    if (a.type === 'turntable') {
      this.modelGroup.rotation.y += dt * (a.speed || 0.45) * this.speed4D;
    } else if (a.type === 'float_hover') {
      this.modelGroup.position.y = Math.sin(t * 2.0) * (a.amp || 3.0);
      this.modelGroup.rotation.y = Math.sin(t * 0.7) * 0.28;
    } else if (a.type === 'parallax_sway') {
      this.modelGroup.rotation.y = Math.sin(t * 0.9) * (a.amp || 0.24);
      this.modelGroup.rotation.x = Math.cos(t * 0.65) * 0.08;
    } else if (a.type === 'twin_spin') {
      if (this.partMeshes[0]) this.partMeshes[0].rotation.y = t * 1.1;
      if (this.partMeshes[1]) this.partMeshes[1].rotation.y = t * 1.1 * (a.ratio || -1);
    } else if (a.type === 'neon_pulse') {
      const m = this.partMeshes[0];
      if (m && m.material && m.material.emissiveIntensity !== undefined) {
        const baseE = (m.userData.part && m.userData.part.emissive) || 2.0;
        m.material.emissiveIntensity = baseE * (0.86 + 0.18 * Math.sin(t * 4.2));
      }
    } else if (a.type === 'galaxy_orbit') {
      const rate = dt * (a.speed || 0.45) * this.speed4D;
      if (this.particleCloud) this.particleCloud.rotation.y += rate;
      if (this.partMeshes[0]) this.partMeshes[0].rotation.y += rate * 1.4;
      if (this.partMeshes[1]) this.partMeshes[1].rotation.y += rate;
    } else if (a.type === 'wave_live' && this.partMeshes[0]) {
      const mesh = this.partMeshes[0];
      const pos = mesh.geometry.attributes.position.array;
      const col = mesh.geometry.attributes.color ? mesh.geometry.attributes.color.array : null;
      const nx = a.cols + 1, nz = a.rows + 1, k = a.freq * 0.08;
      for (let r = 0; r < nz; r++) {
        for (let c = 0; c < nx; c++) {
          const vi = (r * nx + c) * 3;
          const x = pos[vi], z = pos[vi + 2];
          let w = 0;
          if (a.waveMode === 'ripple') {
            const rad = Math.hypot(x, z);
            w = Math.cos(rad * k * 2.2 - t * 2.6) * Math.exp(-rad / (a.sizeMm * 0.55));
          } else if (a.waveMode === 'interference') {
            const r1 = Math.hypot(x - a.sizeMm * 0.22, z), r2 = Math.hypot(x + a.sizeMm * 0.22, z);
            w = 0.55 * Math.sin(r1 * k * 2.4 - t * 2.4) + 0.55 * Math.sin(r2 * k * 2.4 - t * 2.4);
          } else {
            w = 0.55 * Math.sin(x * k * 1.4 + z * k * 0.5 + t * 2.2)
              + 0.30 * Math.cos(z * k * 1.9 - x * k * 0.8 + t * 1.6)
              + 0.18 * Math.sin((x + z) * k * 2.7 - t * 2.9);
          }
          const h = Math.max(0.5, a.baseH + a.amp + w * a.amp);
          pos[vi + 1] = h;
          if (col) {
            const n = Math.max(0, Math.min(1, (h - a.baseH) / Math.max(1, a.amp * 2)));
            let sr, sg, sb;
            if (n > 0.78) {
              const f = (n - 0.78) / 0.22;
              sr = 0.22 + 0.74 * f; sg = 0.84 + 0.14 * f; sb = 0.98 + 0.02 * f;
            } else {
              sr = 0.03 + 0.13 * n; sg = 0.18 + 0.60 * n; sb = 0.45 + 0.51 * n;
            }
            col[vi] = sr * sr; col[vi + 1] = sg * sg; col[vi + 2] = sb * sb;
          }
        }
      }
      mesh.geometry.attributes.position.needsUpdate = true;
      if (col) mesh.geometry.attributes.color.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
    } else if (a.type === 'organic_morph' && this.partMeshes[0] && a.disp > 0.05) {
      const C = window.SP2Core;
      const mesh = this.partMeshes[0];
      const pos = mesh.geometry.attributes.position.array;
      const bp = a.basePos, bn = a.baseNorm, freq = a.freq, disp = a.disp;
      const pivot = (mesh.userData.part && mesh.userData.part.pivot) || [0, 0, 0];
      let minY = Infinity;
      for (let i = 0; i < pos.length; i += 3) {
        const bx = bp[i], by = bp[i + 1], bz = bp[i + 2];
        let d = 0;
        if (a.noiseMode === 'ridged') d = (C.ridged3D(bx * freq + t * 0.5, by * freq - t * 0.35, bz * freq + t * 0.25, 3) * 2 - 1) * disp;
        else if (a.noiseMode === 'ripple') d = Math.sin(Math.hypot(bx, by, bz) * freq * 3 + by * freq * 4 + t * 2.5) * disp * 0.75;
        else d = C.fbm3D(bx * freq + t * 0.5, by * freq + t * 0.3, bz * freq - t * 0.4, 3) * disp;
        pos[i] = bx + bn[i] * d - pivot[0];
        pos[i + 1] = by + bn[i + 1] * d - pivot[1];
        pos[i + 2] = bz + bn[i + 2] * d - pivot[2];
        if (pos[i + 1] < minY) minY = pos[i + 1];
      }
      mesh.position.y = Math.max(0, -minY);
      mesh.geometry.attributes.position.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
    }
  }

  fitCamera(view) {
    const box = new THREE.Box3().setFromObject(this.modelGroup);
    if (box.isEmpty()) return;
    const ctr = new THREE.Vector3(), sz = new THREE.Vector3();
    box.getCenter(ctr); box.getSize(sz);
    const rad = Math.max(16, Math.hypot(sz.x, sz.y, sz.z) * 0.5);
    const dist = rad * 2.45;
    this.controls.target.copy(ctr);
    if (view === 'top') this.camera.position.set(ctr.x, ctr.y + dist * 1.15, ctr.z + 0.01);
    else if (view === 'front') this.camera.position.set(ctr.x, ctr.y + rad * 0.1, ctr.z + dist * 1.15);
    else if (view === 'right') this.camera.position.set(ctr.x + dist * 1.15, ctr.y + rad * 0.1, ctr.z);
    else this.camera.position.set(ctr.x + dist * 0.72, ctr.y + dist * 0.56, ctr.z + dist * 0.85);
    this.camera.lookAt(ctr);
    this.controls.update();
  }

  capturePNG(isPro) {
    if (this.bloomEnabled) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
    const src = this.renderer.domElement;
    if (isPro) return src.toDataURL('image/png');
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(src, 0, 0);
    ctx.font = '600 14px Inter, sans-serif';
    ctx.fillStyle = 'rgba(248,250,252,0.55)';
    ctx.textAlign = 'right';
    ctx.fillText('Studio Pro 2 · 4D Creative CAD · studios-pro.com', c.width - 16, c.height - 14);
    return c.toDataURL('image/png');
  }

  /**
   * Records a crisp 5-second live 4D / Turntable WebM video directly from WebGL canvas (FREE!).
   */
  recordWEBM(seconds) {
    return new Promise((resolve, reject) => {
      const canvas = this.renderer.domElement;
      if (!canvas.captureStream || typeof MediaRecorder === 'undefined') {
        reject(new Error('WebM capture unsupported in this browser'));
        return;
      }
      const stream = canvas.captureStream(30);
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4500000 });
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
      rec.onerror = reject;
      const wasPlaying = this.playing4D;
      this.playing4D = true;
      rec.start();
      setTimeout(() => {
        rec.stop();
        this.playing4D = wasPlaying;
      }, (seconds || 4.5) * 1000);
    });
  }

  /**
   * Builds an exact 1:1 METER scaled clone preserving ALL per-vertex RGB colors & PBR finishes for GLB & WebAR!
   */
  _buildMeterGroup() {
    this.freeze4DToBuild();
    const grp = new THREE.Group();
    grp.name = 'StudioPro2_1to1Meters';
    for (let i = 0; i < this.partMeshes.length; i++) {
      const m = this.partMeshes[i];
      const mat = new THREE.MeshStandardMaterial({
        color: m.material.color.clone(),
        vertexColors: !!m.geometry.attributes.color && m.material.vertexColors,
        metalness: m.material.metalness != null ? m.material.metalness : 0.25,
        roughness: m.material.roughness != null ? m.material.roughness : 0.35,
        emissive: m.material.emissive ? m.material.emissive.clone() : new THREE.Color(0x000000),
        emissiveIntensity: m.material.emissiveIntensity || 0
      });
      const clone = new THREE.Mesh(m.geometry.clone(), mat);
      clone.name = m.name;
      clone.position.copy(m.position);
      clone.rotation.copy(m.rotation);
      grp.add(clone);
    }
    grp.scale.setScalar(0.001); // 1 mm -> 0.001 m exact real-world AR scale!
    grp.updateMatrixWorld(true);
    return grp;
  }

  exportGLB() {
    return new Promise((resolve, reject) => {
      const exporter = new GLTFExporter();
      const meterGroup = this._buildMeterGroup();
      exporter.parse(
        meterGroup,
        (glb) => { this._disposeGroup(meterGroup); resolve(new Blob([glb], { type: 'model/gltf-binary' })); },
        (err) => { this._disposeGroup(meterGroup); reject(err); },
        { binary: true }
      );
    });
  }

  async sendToWebAR(name) {
    if (!window.StudiosProAR || typeof window.StudiosProAR.sendModel !== 'function') {
      throw new Error('AR Bridge unavailable');
    }
    const meterGroup = this._buildMeterGroup();
    const box = new THREE.Box3().setFromObject(meterGroup);
    const sz = new THREE.Vector3();
    box.getSize(sz);
    const dimsMm = { x: Math.round(sz.x * 1000 * 10) / 10, y: Math.round(sz.y * 1000 * 10) / 10, z: Math.round(sz.z * 1000 * 10) / 10 };
    try {
      const exporter = new GLTFExporter();
      await new Promise((resolve, reject) => {
        exporter.parse(
          meterGroup,
          glb => {
            window.StudiosProAR.sendModel({
              modelData: glb,
              extension: 'glb',
              isBinary: true,
              name: (name || 'StudioPro2_Creation').replace(/\.glb$/i, '') + '.glb',
              placement: 'floor',
              dimensionsMm: dimsMm,
              autoScale: 'auto',
              sourceStudio: 'studio-pro-2'
            });
            resolve(true);
          },
          err => reject(err),
          { binary: true }
        );
      });
    } finally {
      this._disposeGroup(meterGroup);
    }
  }
}

window.SP2Viewport = SP2Viewport;
window.dispatchEvent(new CustomEvent('sp2-viewport-ready'));
