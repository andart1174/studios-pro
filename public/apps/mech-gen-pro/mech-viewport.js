/**
 * Mech Gen Pro — Three.js r165 Precision CAD Viewport, Live Cutaway Slicer, Kinematic Simulator & GLB/AR Bridge
 * Native 1:1 mm scale (1.0 scene unit = 1.000 mm); GLB & WebAR automatically scale by 0.001 to exact 1:1 meters!
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

const PI = Math.PI;
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

class MechViewport {
  constructor(container) {
    this.container = container;
    this.showGrid = true;
    this.viewMode = 'solid'; // solid | wire | xray
    this.autoRotate = false;
    this.explodePct = 0; // 0..1
    this.kinematicPlaying = false;
    this.kinematicSpeed = 1.0;
    this.kinPhase = 0;

    // Live GPU Cross-Section Cutaway Plane
    this.cutAxis = 'off'; // off | x | y | z
    this.cutPct = 0.5;    // 0..1 across model bounding box
    this.clipPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 9999);

    this.latestBuild = null;
    this.activeMaterialKey = 'steel';
    this.partMeshes = [];
    this.partBasePos = [];

    this.scene = new THREE.Scene();

    const w = Math.max(120, container.clientWidth);
    const h = Math.max(120, container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 5000);
    this.camera.position.set(85, 70, 105);

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
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.localClippingEnabled = true;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxDistance = 1600;

    // Clean industrial studio PMREM environment for authentic metallic reflections
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Crisp 3-point CAD lighting
    this.scene.add(new THREE.HemisphereLight(0xf8fafc, 0x1e293b, 0.65));
    const key = new THREE.DirectionalLight(0xffffff, 1.7);
    key.position.set(140, 220, 160);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004;
    key.shadow.camera.left = -200; key.shadow.camera.right = 200;
    key.shadow.camera.top = 200; key.shadow.camera.bottom = -200;
    key.shadow.camera.far = 800;
    this.scene.add(key);

    const rim = new THREE.DirectionalLight(0x38bdf8, 0.75);
    rim.position.set(-160, 100, -140);
    this.scene.add(rim);

    // 220×220 mm CAD Metrology Bed (10 mm major grid + X/Z origin axes)
    this.gridGroup = this._createMetrologyGrid();
    this.scene.add(this.gridGroup);

    this.shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(800, 800),
      new THREE.ShadowMaterial({ opacity: 0.24 })
    );
    this.shadowPlane.rotation.x = -PI / 2;
    this.shadowPlane.position.y = -0.04;
    this.shadowPlane.receiveShadow = true;
    this.scene.add(this.shadowPlane);

    // Visual Cutaway Plane Wire Helper
    const cutGeo = new THREE.PlaneGeometry(1, 1);
    const cutEdge = new THREE.EdgesGeometry(cutGeo);
    this.cutHelper = new THREE.LineSegments(
      cutEdge,
      new THREE.LineBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.75 })
    );
    this.cutHelper.visible = false;
    this.scene.add(this.cutHelper);

    this.modelGroup = new THREE.Group();
    this.modelGroup.name = 'MechGenProAssembly';
    this.scene.add(this.modelGroup);

    this._lastTime = performance.now();
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);

    const tick = (now) => {
      this._raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - this._lastTime) / 1000);
      this._lastTime = now;
      if (this.autoRotate) this.modelGroup.rotation.y += dt * 0.45;
      if (this.kinematicPlaying) this._stepKinematics(dt);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    this._raf = requestAnimationFrame(tick);
  }

  _createMetrologyGrid() {
    const grp = new THREE.Group();
    const grid = new THREE.GridHelper(220, 22, 0x334155, 0x1e293b);
    grid.material.transparent = true;
    grid.material.opacity = 0.55;
    grp.add(grid);

    // Outer 220×220 mm frame border
    const pts = [
      new THREE.Vector3(-110, 0.05, -110), new THREE.Vector3(110, 0.05, -110),
      new THREE.Vector3(110, 0.05, 110), new THREE.Vector3(-110, 0.05, 110),
      new THREE.Vector3(-110, 0.05, -110)
    ];
    grp.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0x475569, transparent: true, opacity: 0.75 })
    ));

    // Crisp X (red) and Z (cyan) 25 mm origin crosshairs
    const xLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.12, 0), new THREE.Vector3(28, 0.12, 0)]),
      new THREE.LineBasicMaterial({ color: 0xef4444 })
    );
    const zLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.12, 0), new THREE.Vector3(0, 0.12, 28)]),
      new THREE.LineBasicMaterial({ color: 0x38bdf8 })
    );
    grp.add(xLine, zLine);
    return grp;
  }

  resize() {
    const w = Math.max(100, this.container.clientWidth);
    const h = Math.max(100, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
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

  _makeMaterial(part, matSpec) {
    const isWire = this.viewMode === 'wire';
    const isXray = this.viewMode === 'xray';
    const isCut = this.cutAxis !== 'off';
    const col = part.color || matSpec.color || '#94a3b8';
    const metal = part.metalness != null ? part.metalness : matSpec.metalness;
    const rough = part.roughness != null ? part.roughness : matSpec.roughness;

    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(col),
      metalness: isXray ? 0.1 : metal,
      roughness: isXray ? 0.3 : rough,
      flatShading: false, // Driven by exact 35° CAD crease-split vertex normals!
      wireframe: isWire,
      transparent: isXray,
      opacity: isXray ? 0.36 : 1.0,
      depthWrite: !isXray,
      side: (isCut || isXray) ? THREE.DoubleSide : THREE.FrontSide,
      clippingPlanes: isCut ? [this.clipPlane] : [],
      clipShadows: true
    });
  }

  /**
   * Computes SolidWorks/Fusion360-grade Crease-Angle Split Normals for display BufferGeometry:
   *  - Faces meeting at > creaseDeg (e.g. 90° flat gear caps vs tooth flanks, hex flats, 2020 channels) get RAZOR-SHARP flat normals!
   *  - Curved surfaces meeting at <= creaseDeg (cylinders, involute curves, threads, bearing raceways) stay silky smooth!
   */
  _buildCreaseGeometry(part, creaseDeg) {
    const pos = part.positions;
    const idx = part.indices;
    const pivot = part.pivot || [0, 0, 0];
    const triCount = idx.length / 3;
    const cosThresh = Math.cos((creaseDeg || 36) * DEG);

    // 1. Compute per-triangle unit face normals and vertex adjacency lists
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

    // 2. Build non-indexed display buffers with crease-averaged normals
    const outPos = new Float32Array(triCount * 9);
    const outNorm = new Float32Array(triCount * 9);
    for (let t = 0; t < triCount; t++) {
      const fnx = faceN[t * 3], fny = faceN[t * 3 + 1], fnz = faceN[t * 3 + 2];
      for (let c = 0; c < 3; c++) {
        const vi = idx[t * 3 + c];
        const o = (t * 3 + c) * 3;
        outPos[o]     = pos[vi * 3]     - pivot[0];
        outPos[o + 1] = pos[vi * 3 + 1] - pivot[1];
        outPos[o + 2] = pos[vi * 3 + 2] - pivot[2];

        let sx = fnx, sy = fny, sz = fnz;
        const adj = vTris[vi];
        for (let k = 0; k < adj.length; k++) {
          const ot = adj[k];
          if (ot === t) continue;
          const onx = faceN[ot * 3], ony = faceN[ot * 3 + 1], onz = faceN[ot * 3 + 2];
          if (fnx * onx + fny * ony + fnz * onz >= cosThresh) {
            sx += onx; sy += ony; sz += onz;
          }
        }
        const sl = Math.hypot(sx, sy, sz) || 1;
        outNorm[o] = sx / sl; outNorm[o + 1] = sy / sl; outNorm[o + 2] = sz / sl;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(outPos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(outNorm, 3));
    return geo;
  }

  setBuild(build, materialKey, refit) {
    this.latestBuild = build;
    this.activeMaterialKey = materialKey || this.activeMaterialKey;
    this.kinPhase = 0;
    this.modelGroup.rotation.set(0, 0, 0);

    this._disposeGroup(this.modelGroup);
    this.partMeshes = [];
    this.partBasePos = [];

    const C = window.MechCore;
    const matSpec = (C && C.MATERIALS[this.activeMaterialKey]) || { color: '#94a3b8', metalness: 0.84, roughness: 0.28 };

    for (let i = 0; i < build.parts.length; i++) {
      const p = build.parts[i];
      const pivot = p.pivot || [0, 0, 0];
      const geo = this._buildCreaseGeometry(p, 36);

      const mesh = new THREE.Mesh(geo, this._makeMaterial(p, matSpec));
      mesh.name = p.name || `part_${i}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.position.set(pivot[0], pivot[1], pivot[2]);
      mesh.userData.part = p;
      mesh.userData.basePos = new THREE.Vector3(pivot[0], pivot[1], pivot[2]);

      this.modelGroup.add(mesh);
      this.partMeshes.push(mesh);
      this.partBasePos.push(new THREE.Vector3(pivot[0], pivot[1], pivot[2]));
    }

    this._applyExplode();
    this._updateCutPlane();
    if (refit) this.fitCamera('iso');
  }

  setMaterial(materialKey) {
    this.activeMaterialKey = materialKey;
    if (this.latestBuild) this.setBuild(this.latestBuild, materialKey, false);
  }

  setViewMode(mode) {
    this.viewMode = mode;
    if (this.latestBuild) this.setBuild(this.latestBuild, this.activeMaterialKey, false);
  }

  setGridVisible(v) { this.showGrid = v; this.gridGroup.visible = v; }
  setAutoRotate(v) { this.autoRotate = v; }

  setExplode(pct) {
    this.explodePct = Math.max(0, Math.min(1, pct));
    this._applyExplode();
  }

  _applyExplode() {
    for (let i = 0; i < this.partMeshes.length; i++) {
      const m = this.partMeshes[i];
      const p = m.userData.part;
      const bp = m.userData.basePos;
      const ev = (p && p.explodeVec) || [0, 0, 0];
      m.position.set(
        bp.x + ev[0] * this.explodePct,
        bp.y + ev[1] * this.explodePct,
        bp.z + ev[2] * this.explodePct
      );
    }
  }

  setCutaway(axis, pct) {
    const prevOff = this.cutAxis === 'off';
    this.cutAxis = axis;
    if (pct != null) this.cutPct = Math.max(0, Math.min(1, pct));
    const nowOff = this.cutAxis === 'off';
    if (prevOff !== nowOff && this.latestBuild) {
      // Rebuild materials to enable/disable clippingPlanes + DoubleSide cleanly
      const C = window.MechCore;
      const matSpec = (C && C.MATERIALS[this.activeMaterialKey]) || { color: '#94a3b8', metalness: 0.84, roughness: 0.28 };
      for (let i = 0; i < this.partMeshes.length; i++) {
        const m = this.partMeshes[i];
        m.material.dispose();
        m.material = this._makeMaterial(m.userData.part, matSpec);
      }
    }
    this._updateCutPlane();
  }

  _updateCutPlane() {
    if (this.cutAxis === 'off' || !this.latestBuild) {
      this.cutHelper.visible = false;
      this.clipPlane.constant = 9999;
      return;
    }
    const b = this.latestBuild.stats ? this.latestBuild.stats.bounds : window.MechCore.getPartsBounds(this.latestBuild.parts);
    const pad = 2.0;
    const cx = (b.minX + b.maxX) * 0.5;
    const cy = (b.minY + b.maxY) * 0.5;
    const cz = (b.minZ + b.maxZ) * 0.5;
    const span = Math.max(b.sx, b.sy, b.sz) * 1.25 + 10;

    this.cutHelper.visible = true;
    this.cutHelper.scale.set(span, span, 1);
    this.cutHelper.rotation.set(0, 0, 0);

    if (this.cutAxis === 'x') {
      const x = b.minX - pad + (b.sx + pad * 2) * this.cutPct;
      this.clipPlane.set(new THREE.Vector3(-1, 0, 0), x);
      this.cutHelper.position.set(x, cy, cz);
      this.cutHelper.rotation.y = PI * 0.5;
    } else if (this.cutAxis === 'y') {
      const y = b.minY - pad + (b.sy + pad * 2) * this.cutPct;
      this.clipPlane.set(new THREE.Vector3(0, -1, 0), y);
      this.cutHelper.position.set(cx, y, cz);
      this.cutHelper.rotation.x = PI * 0.5;
    } else {
      const z = b.minZ - pad + (b.sz + pad * 2) * this.cutPct;
      this.clipPlane.set(new THREE.Vector3(0, 0, -1), z);
      this.cutHelper.position.set(cx, cy, z);
    }
  }

  setKinematics(playing, speed) {
    this.kinematicPlaying = !!playing;
    if (speed != null) this.kinematicSpeed = speed;
    if (!playing) {
      // Reset rotations/offsets cleanly when stopped? Keep paused pose unless reset called!
    }
  }

  resetKinematics() {
    this.kinPhase = 0;
    for (let i = 0; i < this.partMeshes.length; i++) {
      this.partMeshes[i].rotation.set(0, 0, 0);
    }
    this._applyExplode();
  }

  _stepKinematics(dt) {
    if (!this.latestBuild || !this.latestBuild.kinematics) return;
    const k = this.latestBuild.kinematics;
    this.kinPhase += dt * 1.35 * this.kinematicSpeed;
    const th = this.kinPhase;
    const ms = this.partMeshes;

    if (k.type === 'spin' || k.type === 'twin_gear' || k.type === 'bevel_pair') {
      for (let i = 0; i < k.parts.length; i++) {
        const spec = k.parts[i];
        const m = ms[spec.idx];
        if (!m) continue;
        m.rotation[spec.axis || 'y'] = th * (spec.rate || 1);
      }
    } else if (k.type === 'planetary') {
      const sun = ms[k.sunIdx];
      const wSun = th;
      const wCarrier = wSun * k.Zs / (k.Zs + k.Zr);
      const wPlanetSelf = (wCarrier - wSun) * (k.Zs / k.Zp);
      if (sun) sun.rotation.y = wSun;
      if (k.carrierIdx >= 0 && ms[k.carrierIdx]) ms[k.carrierIdx].rotation.y = wCarrier;
      const N = k.planetIndices.length;
      for (let j = 0; j < N; j++) {
        const pm = ms[k.planetIndices[j]];
        if (!pm) continue;
        const a0 = (j / N) * TAU;
        const aCur = a0 + wCarrier;
        const bp = pm.userData.basePos;
        const ev = (pm.userData.part && pm.userData.part.explodeVec) || [0, 0, 0];
        pm.position.set(
          Math.cos(aCur) * k.rOrb + ev[0] * this.explodePct,
          bp.y + ev[1] * this.explodePct,
          -Math.sin(aCur) * k.rOrb + ev[2] * this.explodePct
        );
        pm.rotation.y = wPlanetSelf + wCarrier;
      }
    } else if (k.type === 'rack_pinion') {
      const pin = ms[k.pinionIdx], rack = ms[k.rackIdx];
      const maxAng = k.maxStroke / Math.max(1, k.pitchRadius);
      const ang = Math.sin(th * 0.9) * maxAng;
      if (pin) pin.rotation.y = ang;
      if (rack) {
        const bp = rack.userData.basePos;
        const ev = rack.userData.part.explodeVec || [0, 0, 0];
        rack.position.x = bp.x + ev[0] * this.explodePct + ang * k.pitchRadius;
      }
    } else if (k.type === 'worm_drive') {
      const worm = ms[k.wormIdx], wheel = ms[k.wheelIdx];
      if (worm) worm.rotation.x = th * 4.0;
      if (wheel) wheel.rotation.y = (th * 4.0) * (k.starts / k.Z2);
    } else if (k.type === 'geneva') {
      const drv = ms[k.driverIdx], wh = ms[k.drivenIdx];
      // Exact Geneva Kinematic Law!
      const alpha = ((th % TAU) + TAU) % TAU;
      if (drv) drv.rotation.y = alpha;
      // Engagement occurs around alpha = 0 (since drive pin sits at -Rc along -X toward driven wheel!)
      const aRel = alpha > PI ? (alpha - TAU) : alpha;
      const engageHalf = PI * 0.5 - PI / k.N;
      const revIdx = Math.floor(th / TAU);
      const stepAng = TAU / k.N;
      let beta = revIdx * stepAng;
      if (Math.abs(aRel) <= engageHalf) {
        // Exact slot angle during pin engagement
        const slotAng = Math.atan2(k.Rc * Math.sin(aRel), k.Cdist - k.Rc * Math.cos(aRel));
        beta = (revIdx + (aRel < 0 ? 0.5 : 0.5)) * stepAng - slotAng;
      } else if (aRel > engageHalf) {
        beta = (revIdx + 1) * stepAng;
      }
      if (wh) wh.rotation.y = beta;
    } else if (k.type === 'cam_follower') {
      const cam = ms[k.camIdx], fol = ms[k.followerIdx];
      if (cam) cam.rotation.z = -th;
      if (fol) {
        const deg = (((th / DEG) % 360) + 360) % 360;
        let liftVal = 0;
        if (k.profile === 'double') {
          liftVal = k.lift * 0.5 * (1 - Math.cos(2 * deg * DEG));
        } else {
          let u = 0;
          if (deg < 120) u = deg / 120;
          else if (deg < 180) u = 1;
          else if (deg < 300) u = 1 - (deg - 180) / 120;
          if (k.profile === 'harmonic') liftVal = k.lift * 0.5 * (1 - Math.cos(PI * u));
          else if (k.profile === 'poly345') liftVal = k.lift * (10 * u ** 3 - 15 * u ** 4 + 6 * u ** 5);
          else liftVal = k.lift * (u - Math.sin(TAU * u) / TAU);
        }
        const bp = fol.userData.basePos;
        const ev = fol.userData.part.explodeVec || [0, 0, 0];
        fol.position.y = bp.y + ev[1] * this.explodePct + liftVal;
      }
    } else if (k.type === 'screw_nut') {
      const nut = ms[k.nutIdx];
      if (nut) {
        const turns = (Math.sin(th * 0.8) * 0.5) * (k.travel / Math.max(0.5, k.pitch));
        nut.rotation.y = turns * TAU;
        const bp = nut.userData.basePos;
        const ev = nut.userData.part.explodeVec || [0, 0, 0];
        nut.position.y = bp.y + ev[1] * this.explodePct + turns * k.pitch;
      }
    } else if (k.type === 'bearing') {
      if (ms[k.innerIdx]) ms[k.innerIdx].rotation.y = th * 1.8;
      if (ms[k.ballsIdx]) ms[k.ballsIdx].rotation.y = th * 0.9;
      if (k.cageIdx >= 0 && ms[k.cageIdx]) ms[k.cageIdx].rotation.y = th * 0.9;
    } else if (k.type === 'cardan') {
      if (ms[k.yoke1Idx]) ms[k.yoke1Idx].rotation.y = th;
      if (ms[k.spiderIdx]) ms[k.spiderIdx].rotation.y = th;
      if (ms[k.yoke2Idx]) {
        // Rotate output yoke around its articulated axis!
        const axis = new THREE.Vector3(0, 1, 0).applyAxisAngle(new THREE.Vector3(1, 0, 0), k.jointRad);
        ms[k.yoke2Idx].setRotationFromAxisAngle(axis, th);
      }
    } else if (k.type === 'ball_joint') {
      const b = ms[k.ballIdx];
      if (b) {
        b.rotation.x = Math.sin(th * 1.4) * 0.24;
        b.rotation.z = Math.cos(th * 1.4) * 0.24;
      }
    } else if (k.type === 'hinge') {
      const r = ms[k.rightIdx];
      if (r) r.rotation.z = (Math.sin(th * 1.1) * 0.5 + 0.5) * (135 * DEG) - k.baseFold * 0.5;
    } else if (k.type === 'explode_cycle') {
      const e = Math.sin(th * 1.1) * 0.5 + 0.5;
      for (let i = 0; i < ms.length; i++) {
        const m = ms[i];
        const bp = m.userData.basePos;
        const ev = (m.userData.part && m.userData.part.explodeVec) || [0, 0, 0];
        m.position.set(bp.x + ev[0] * e, bp.y + ev[1] * e, bp.z + ev[2] * e);
      }
    }
  }

  fitCamera(view) {
    const box = new THREE.Box3().setFromObject(this.modelGroup);
    if (box.isEmpty()) return;
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    const radius = Math.max(12, Math.hypot(size.x, size.y, size.z) * 0.5);
    const dist = radius * 2.65;

    this.controls.target.copy(center);
    if (view === 'top') this.camera.position.set(center.x, center.y + dist * 1.15, center.z + 0.01);
    else if (view === 'front') this.camera.position.set(center.x, center.y + radius * 0.08, center.z + dist * 1.15);
    else if (view === 'right') this.camera.position.set(center.x + dist * 1.15, center.y + radius * 0.08, center.z);
    else this.camera.position.set(center.x + dist * 0.72, center.y + dist * 0.58, center.z + dist * 0.85);
    this.camera.lookAt(center);
    this.controls.update();
  }

  capturePNG(isPro) {
    this.renderer.render(this.scene, this.camera);
    if (isPro) return this.renderer.domElement.toDataURL('image/png');
    const src = this.renderer.domElement;
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(src, 0, 0);
    ctx.font = '600 14px Inter, sans-serif';
    ctx.fillStyle = 'rgba(248,250,252,0.55)';
    ctx.textAlign = 'right';
    ctx.fillText('Mech Gen Pro · ISO 1:1 mm · studios-pro.com', c.width - 16, c.height - 14);
    return c.toDataURL('image/png');
  }

  /**
   * Builds a clean 1:1 METER scaled clone of the current mechanical assembly for GLB & WebAR!
   */
  _buildMeterGroup() {
    const grp = new THREE.Group();
    grp.name = 'MechGenPro_1to1Meters';
    for (let i = 0; i < this.partMeshes.length; i++) {
      const m = this.partMeshes[i];
      const clone = new THREE.Mesh(
        m.geometry.clone(),
        new THREE.MeshStandardMaterial({
          color: m.material.color.clone(),
          metalness: m.material.metalness,
          roughness: m.material.roughness,
          flatShaded: m.material.flatShaded
        })
      );
      clone.name = m.name;
      clone.position.copy(m.position);
      clone.rotation.copy(m.rotation);
      grp.add(clone);
    }
    grp.scale.setScalar(0.001); // 1 mm -> 0.001 m (exact real-world AR scale!)
    grp.updateMatrixWorld(true);
    return grp;
  }

  exportGLB() {
    return new Promise((resolve, reject) => {
      const exporter = new GLTFExporter();
      const meterGroup = this._buildMeterGroup();
      exporter.parse(
        meterGroup,
        (glb) => {
          this._disposeGroup(meterGroup);
          resolve(new Blob([glb], { type: 'model/gltf-binary' }));
        },
        (err) => { this._disposeGroup(meterGroup); reject(err); },
        { binary: true }
      );
    });
  }

  async sendToWebAR(partName) {
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
              name: (partName || 'MechGenPro_Part').replace(/\.glb$/i, '') + '.glb',
              placement: 'floor',
              dimensionsMm: dimsMm,
              autoScale: 'auto',
              sourceStudio: 'mech-gen-pro'
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

window.MechViewport = MechViewport;
window.dispatchEvent(new CustomEvent('mech-viewport-ready'));
