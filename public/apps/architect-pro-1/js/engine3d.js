/**
 * Architect Pro 1 (v2.0) — Three.js r165 Photorealistic 3D Engine
 * ACESFilmic PBR, Procedural 512px Albedo+Bump Textures, Dynamic Sun/Sky (06:00-22:00),
 * 25+ Detailed Architectural/Furniture/Kitchen/Bath/Stairs/Pool Models,
 * Dollhouse Cutaway & X-Ray Modes, Iframe-Safe WASD Walkthrough,
 * Catmull-Rom .WEBM Tour Recorder & Clean Export Group (GLB/STL/OBJ/AR).
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';

// Expose Three & Exporters cleanly for export.js
window.THREE_ARCH = { THREE, GLTFExporter, STLExporter, OBJExporter };

const Engine3D = {
  container: null,
  canvas: null,
  renderer: null,
  scene: null,
  camera: null,
  controls: null,
  archGroup: null,    // PURE exportable architectural geometry (no grid/hitboxes!)
  helperGroup: null,  // Grid, lights, visual bulbs
  interactableMeshes: [],
  materialsCache: {},
  gltfCache: {},

  needsRebuild: true,
  viewMode3D: 'dollhouse', // 'full' | 'dollhouse' | 'xray'
  sunTime: 13.5,
  isNight: false,

  // Iframe-safe Walkthrough state
  isWalkthrough: false,
  walkYaw: 0,
  walkPitch: 0,
  walkDrag: false,
  walkLastPtr: { x: 0, y: 0 },
  keys: { w: false, a: false, s: false, d: false },
  lastTick: 0,
  raycaster: new THREE.Raycaster(),
  pointerNdc: new THREE.Vector2(),

  init(canvas) {
    this.canvas = canvas;
    this.container = canvas.parentElement;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true // FIXES black 3D PDF & PNG exports!
    });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x0d1526, 1);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0d1526, 0.00018);

    // PMREM soft realistic architectural reflections
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const w = Math.max(100, this.container.clientWidth || 600);
    const h = Math.max(100, this.container.clientHeight || 400);
    this.camera = new THREE.PerspectiveCamera(44, w / h, 5, 18000);
    this.camera.position.set(-900, 920, 1050);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.minDistance = 80;
    this.controls.maxDistance = 6000;

    // Scene groups: separate exportable architecture from debug/grid helpers!
    this.archGroup = new THREE.Group();
    this.archGroup.name = 'ArchitectureRoot';
    this.helperGroup = new THREE.Group();
    this.helperGroup.name = 'HelpersRoot';
    this.scene.add(this.archGroup, this.helperGroup);

    // Ground Grid & Subtle Lawn Base
    const grid = new THREE.GridHelper(4000, 80, 0x334155, 0x1e293b);
    grid.material.opacity = 0.45;
    grid.material.transparent = true;
    this.helperGroup.add(grid);

    // Studio & Sun Lighting
    this.hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.85);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfffbeb, 1.85);
    this.sunLight.position.set(700, 1200, 550);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    const sc = this.sunLight.shadow.camera;
    sc.near = 100; sc.far = 4500;
    sc.left = -1600; sc.right = 1600; sc.top = 1600; sc.bottom = -1600;
    sc.bias = -0.0005;
    this.scene.add(this.sunLight);

    this.fillLight = new THREE.DirectionalLight(0x60a5fa, 0.45);
    this.fillLight.position.set(-800, 600, -700);
    this.scene.add(this.fillLight);

    this._bindInteractions();
    this.resize();
    this.updateSunPath(this.sunTime);
    this._startAnimLoop();
  },

  _bindInteractions() {
    const dom = this.renderer.domElement;
    let downX = 0, downY = 0;

    dom.addEventListener('pointerdown', e => {
      downX = e.clientX; downY = e.clientY;
      if (this.isWalkthrough) {
        this.walkDrag = true;
        this.walkLastPtr = { x: e.clientX, y: e.clientY };
        dom.setPointerCapture(e.pointerId);
      }
    });

    dom.addEventListener('pointermove', e => {
      if (this.isWalkthrough && this.walkDrag) {
        const dx = e.clientX - this.walkLastPtr.x;
        const dy = e.clientY - this.walkLastPtr.y;
        this.walkLastPtr = { x: e.clientX, y: e.clientY };
        this.walkYaw -= dx * 0.0045;
        this.walkPitch = Math.max(-1.1, Math.min(1.1, this.walkPitch - dy * 0.004));
      }
    });

    dom.addEventListener('pointerup', e => {
      if (this.isWalkthrough) {
        this.walkDrag = false;
        return;
      }
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 5) return; // Orbit drag
      const rect = dom.getBoundingClientRect();
      this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointerNdc, this.camera);
      const hits = this.raycaster.intersectObjects(this.interactableMeshes, true);
      if (hits.length > 0) {
        let obj = hits[0].object;
        while (obj && (!obj.userData || !obj.userData.id)) obj = obj.parent;
        if (obj && obj.userData && obj.userData.id) {
          const found = STATE.elements.find(el => el.id === obj.userData.id);
          if (found && window.selectElement) {
            window.selectElement(found);
            if (window.Editor2D) window.Editor2D.needsRedraw = true;
          }
        }
      }
    });

    window.addEventListener('keydown', e => {
      if (!this.isWalkthrough) return;
      if (e.key === 'Escape') { this.toggleWalkthrough(false); return; }
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') this.keys.w = true;
      if (k === 's' || e.key === 'ArrowDown') this.keys.s = true;
      if (k === 'a' || e.key === 'ArrowLeft') this.keys.a = true;
      if (k === 'd' || e.key === 'ArrowRight') this.keys.d = true;
    });
    window.addEventListener('keyup', e => {
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') this.keys.w = false;
      if (k === 's' || e.key === 'ArrowDown') this.keys.s = false;
      if (k === 'a' || e.key === 'ArrowLeft') this.keys.a = false;
      if (k === 'd' || e.key === 'ArrowRight') this.keys.d = false;
    });
  },

  _startAnimLoop() {
    const loop = (ts) => {
      requestAnimationFrame(loop);
      const dt = Math.min(0.05, (ts - (this.lastTick || ts)) / 1000);
      this.lastTick = ts;

      if (this.isWalkthrough) {
        const speed = 340 * dt;
        const fwd = new THREE.Vector3(-Math.sin(this.walkYaw), 0, -Math.cos(this.walkYaw));
        const right = new THREE.Vector3(Math.cos(this.walkYaw), 0, -Math.sin(this.walkYaw));
        if (this.keys.w) this.camera.position.addScaledVector(fwd, speed);
        if (this.keys.s) this.camera.position.addScaledVector(fwd, -speed);
        if (this.keys.d) this.camera.position.addScaledVector(right, speed);
        if (this.keys.a) this.camera.position.addScaledVector(right, -speed);
        // Keep eye height aligned to active floor!
        const eyeY = ((STATE.activeFloor || 0) * (STATE.globWallHeight || 280)) + 168;
        this.camera.position.y = eyeY;
        const euler = new THREE.Euler(this.walkPitch, this.walkYaw, 0, 'YXZ');
        this.camera.quaternion.setFromEuler(euler);
      } else if (this.controls) {
        this.controls.update();
      }

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };
    requestAnimationFrame(loop);
  },

  resize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = Math.max(100, this.container.clientWidth);
    const h = Math.max(100, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  },

  setCameraPreset(preset) {
    if (this.isWalkthrough) this.toggleWalkthrough(false);
    const box = new THREE.Box3().setFromObject(this.archGroup);
    const center = box.isEmpty() ? new THREE.Vector3(0, 120, 0) : box.getCenter(new THREE.Vector3());
    const size = box.isEmpty() ? new THREE.Vector3(800, 300, 800) : box.getSize(new THREE.Vector3());
    const dist = Math.max(700, Math.hypot(size.x, size.y, size.z) * 1.15);

    if (preset === 'top') {
      this.camera.position.set(center.x, center.y + dist * 1.25, center.z + 10);
    } else if (preset === 'front') {
      this.camera.position.set(center.x, center.y + size.y * 0.55, center.z + dist * 1.15);
    } else {
      // 'iso'
      this.camera.position.set(center.x - dist * 0.72, center.y + dist * 0.68, center.z + dist * 0.85);
    }
    this.controls.target.copy(center);
    this.controls.update();
  },

  setViewMode3D(mode) {
    this.viewMode3D = mode; // 'full' | 'dollhouse' | 'xray'
    this.needsRebuild = true;
  },

  toggleWalkthrough(forceState) {
    this.isWalkthrough = typeof forceState === 'boolean' ? forceState : !this.isWalkthrough;
    const status = document.getElementById('mode3DStatus');
    const btn = document.getElementById('btnWalk');
    if (this.isWalkthrough) {
      if (this.controls) this.controls.enabled = false;
      const floorY = ((STATE.activeFloor || 0) * (STATE.globWallHeight || 280)) + 168;
      this.camera.position.set(0, floorY, 260);
      this.walkYaw = 0;
      this.walkPitch = -0.05;
      if (status) status.textContent = 'Walk: WASD + Drag · Esc';
      if (btn) btn.classList.add('active');
    } else {
      if (this.controls) this.controls.enabled = true;
      this.setCameraPreset('iso');
      if (status) status.textContent = 'Orbit';
      if (btn) btn.classList.remove('active');
    }
  },

  updateSunPath(time) {
    this.sunTime = time;
    const t = Math.max(0, Math.min(1, (time - 6) / 16)); // 06:00 -> 22:00
    const ang = Math.PI * t;
    const r = 1600;
    const sx = -Math.cos(ang) * r;
    const sy = Math.max(80, Math.sin(ang) * r);
    const sz = 450 * Math.sin(ang) + 200;

    if (this.sunLight) {
      this.sunLight.position.set(sx, sy, sz);
      const isNight = time < 7.2 || time > 19.5;
      const isGolden = (time >= 7.2 && time < 9) || (time > 17.5 && time <= 19.5);
      this.isNight = isNight;

      if (isNight) {
        this.sunLight.color.setHex(0x64748b);
        this.sunLight.intensity = 0.28;
        this.hemiLight.intensity = 0.25;
        this.renderer.setClearColor(0x060b16, 1);
        this.scene.fog.color.setHex(0x060b16);
      } else if (isGolden) {
        this.sunLight.color.setHex(0xffb36b);
        this.sunLight.intensity = 1.45;
        this.hemiLight.intensity = 0.65;
        this.renderer.setClearColor(0x1e293b, 1);
        this.scene.fog.color.setHex(0x1e293b);
      } else {
        this.sunLight.color.setHex(0xfffbeb);
        this.sunLight.intensity = 1.9;
        this.hemiLight.intensity = 0.9;
        this.renderer.setClearColor(0x132038, 1);
        this.scene.fog.color.setHex(0x132038);
      }
    }

    // Auto-switch interior lights ON at golden hour / night!
    const nightFactor = (time < 8.5 || time > 18.0) ? 1.8 : 0.45;
    this.scene.traverse(ch => {
      if (ch.isPointLight && ch.userData && ch.userData.isArchLight) {
        ch.intensity = (ch.userData.baseIntensity || 1.2) * nightFactor * 45000;
      }
    });
  },

  // ============================================================================
  // PROCEDURAL 512px PBR TEXTURES (ALBEDO + BUMP/ROUGHNESS)
  // ============================================================================
  getMaterial(type, baseColor, extraOpts) {
    const xray = extraOpts && extraOpts.xray;
    const key = `${type || 'none'}_${baseColor || '#fff'}_${xray ? 'xr' : 's'}`;
    if (this.materialsCache[key]) return this.materialsCache[key];

    const col = (type === 'none' || !type) ? (baseColor || '#f1f5f9') : '#ffffff';
    const mat = new THREE.MeshStandardMaterial({
      color: col,
      roughness: 0.72,
      metalness: 0.05,
      transparent: !!xray,
      opacity: xray ? 0.34 : 1.0,
      depthWrite: !xray
    });

    if (type && type !== 'none') {
      if (type === 'mirror') {
        mat.color.setHex(0xdbeafe);
        mat.metalness = 0.92;
        mat.roughness = 0.06;
      } else if (type === 'water') {
        mat.map = this._makeTex('water', baseColor || '#0ea5e9');
        mat.transparent = true;
        mat.opacity = 0.84;
        mat.roughness = 0.08;
        mat.metalness = 0.25;
      } else {
        const tex = this._makeTex(type, baseColor || '#cbd5e1');
        mat.map = tex;
        if (type === 'brick' || type === 'concrete' || type === 'paving' || type === 'wood') {
          mat.bumpMap = tex;
          mat.bumpScale = type === 'brick' ? 3.5 : 1.5;
        }
        if (type === 'tiles') mat.roughness = 0.24;
        else if (type === 'wood') mat.roughness = 0.48;
        else if (type === 'carpet' || type === 'grass' || type === 'dirt') mat.roughness = 0.94;
      }
    }

    this.materialsCache[key] = mat;
    return mat;
  },

  _makeTex(type, colorStr) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = colorStr;
    ctx.fillRect(0, 0, 256, 256);

    if (type === 'wood') {
      // Realistic architectural parquet planks
      const plankH = 32;
      for (let y = 0; y < 256; y += plankH) {
        ctx.fillStyle = ((y / plankH) % 2 === 0) ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
        ctx.fillRect(0, y, 256, plankH);
        ctx.strokeStyle = 'rgba(0,0,0,0.22)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
        const joint = ((y / plankH) * 96) % 256;
        ctx.beginPath(); ctx.moveTo(joint, y); ctx.lineTo(joint, y + plankH); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(60,30,10,0.09)';
      for (let i = 0; i < 65; i++) {
        const yy = (i * 4) % 256;
        ctx.beginPath(); ctx.moveTo(0, yy); ctx.bezierCurveTo(85, yy + 3, 170, yy - 3, 256, yy); ctx.stroke();
      }
    } else if (type === 'brick') {
      ctx.strokeStyle = 'rgba(220,220,220,0.45)';
      ctx.lineWidth = 3;
      for (let y = 0; y < 256; y += 32) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
        const off = ((y / 32) % 2) * 32;
        for (let x = off; x < 256; x += 64) {
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 32); ctx.stroke();
        }
      }
    } else if (type === 'tiles') {
      ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      ctx.lineWidth = 2;
      for (let p = 0; p <= 256; p += 64) {
        ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(256, p); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 256); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(0, 0, 64, 64); ctx.fillRect(128, 128, 64, 64);
    } else if (type === 'paving') {
      ctx.strokeStyle = 'rgba(15,23,42,0.35)';
      ctx.lineWidth = 3;
      for (let y = 0; y < 256; y += 64) {
        const off = ((y / 64) % 2) * 32;
        for (let x = -64; x < 256; x += 64) {
          ctx.fillStyle = ((x + y) % 128 === 0) ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
          ctx.fillRect(x + off, y, 64, 64);
          ctx.strokeRect(x + off, y, 64, 64);
        }
      }
    } else if (type === 'water') {
      for (let i = 0; i < 36; i++) {
        const x = (i * 53) % 256, y = (i * 97) % 256;
        const g = ctx.createRadialGradient(x, y, 4, x, y, 36);
        g.addColorStop(0, 'rgba(255,255,255,0.35)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, 36, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      // Concrete / Carpet / Grass / Dirt subtle grain
      const img = ctx.getImageData(0, 0, 256, 256);
      const d = img.data;
      let seed = 1337;
      for (let i = 0; i < d.length; i += 4) {
        seed = (seed * 16807) % 2147483647;
        const n = ((seed / 2147483647) - 0.5) * (type === 'concrete' ? 16 : 28);
        d[i] = Math.max(0, Math.min(255, d[i] + n));
        d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
        d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
      }
      ctx.putImageData(img, 0, 0);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(0.01, 0.01); // 1 repeat = 100 cm (1 meter)!
    tex.needsUpdate = true;
    return tex;
  },

  // ============================================================================
  // SCENE REBUILD
  // ============================================================================
  _clearGroup(grp) {
    while (grp.children.length > 0) {
      const ch = grp.children[0];
      grp.remove(ch);
      ch.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
      });
    }
  },

  buildScene(elements) {
    this._clearGroup(this.archGroup);
    // Keep only grid in helperGroup (index 0)
    while (this.helperGroup.children.length > 1) {
      const ch = this.helperGroup.children.pop();
      ch.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    }
    this.interactableMeshes = [];

    if (window.STATE && STATE.blueprintImage && STATE.blueprintVisible !== false) {
      this._buildBlueprintPlane();
    }

    this._buildTerrain(elements);

    elements.forEach(el => {
      if (el.type === 'wall') this._buildWall(el, elements);
      else if (el.type === 'floor') this._buildFloor(el);
      else if (el.type === 'roof' && this.viewMode3D !== 'dollhouse') this._buildRoof(el);
      else if (el.type === 'door' || el.type === 'window') this._buildOpening(el, elements);
      else if (el.type === 'furniture') this._buildFurniture(el);
      else if (el.type === 'lightNode') this._buildLight(el);
    });
  },

  _buildBlueprintPlane() {
    const img = STATE.blueprintImage;
    const tex = new THREE.CanvasTexture(img);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sc = STATE.blueprintScale || 1.0;
    const geo = new THREE.PlaneGeometry(img.width * sc, img.height * sc);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: STATE.blueprintOpacity || 0.45, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -2;
    this.helperGroup.add(mesh);
  },

  _buildTerrain(elements) {
    const splats = elements.filter(e => e.type === 'terrainSplat');
    if (splats.length === 0) return;

    const geo = new THREE.PlaneGeometry(4400, 4400, 88, 88);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colArr = new Float32Array(pos.count * 3);
    const baseC = new THREE.Color(0x22c55e);

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i), vz = pos.getZ(i);
      let elev = -3;
      let r = baseC.r, g = baseC.g, b = baseC.b;
      for (const s of splats) {
        const d = Math.hypot(vx - s.x, vz - s.y);
        if (d < s.radius) {
          const w = (Math.cos(Math.PI * (d / s.radius)) + 1) * 0.5;
          elev += (s.force || 20) * w;
          if (s.color) {
            const sc = new THREE.Color(s.color);
            r = r * (1 - w) + sc.r * w;
            g = g * (1 - w) + sc.g * w;
            b = b * (1 - w) + sc.b * w;
          }
        }
      }
      pos.setY(i, elev);
      colArr[i * 3] = r; colArr[i * 3 + 1] = g; colArr[i * 3 + 2] = b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, flatShading: true }));
    mesh.receiveShadow = true;
    this.archGroup.add(mesh);
  },

  _buildWall(wall, allElements) {
    const len = ArchCore.wallLength(wall);
    if (len < 5) return;
    const rawH = Number(wall.height) || 280;
    const h = this.viewMode3D === 'dollhouse' ? Math.min(rawH, rawH * 0.62) : rawH;
    const th = Number(wall.thick) || 20;
    const baseY = (wall.floor || 0) * (STATE.globWallHeight || 280);
    const xray = this.viewMode3D === 'xray';
    const mat = this.getMaterial(wall.material || 'concrete', wall.color || '#f1f5f9', { xray });

    if (wall.curvature && Math.abs(wall.curvature) > 2) {
      // Curved Architectural Wall via vertical profile swept along XZ QuadraticBezierCurve3
      const cx = (wall.x1 + wall.x2) * 0.5, cy = (wall.y1 + wall.y2) * 0.5;
      const lx1 = wall.x1 - cx, ly1 = wall.y1 - cy;
      const lx2 = wall.x2 - cx, ly2 = wall.y2 - cy;
      const ang = Math.atan2(ly2 - ly1, lx2 - lx1);
      const cp = new THREE.Vector3(Math.cos(ang - Math.PI / 2) * wall.curvature * 2, 0, Math.sin(ang - Math.PI / 2) * wall.curvature * 2);
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(lx1, 0, ly1), cp, new THREE.Vector3(lx2, 0, ly2));

      const segs = 24;
      const pts = curve.getPoints(segs);
      const verts = [], uvs = [], indices = [];
      let accLen = 0;
      for (let i = 0; i <= segs; i++) {
        const p = pts[i];
        const t = curve.getTangent(i / segs).normalize();
        const nx = -t.z * (th * 0.5), nz = t.x * (th * 0.5);
        if (i > 0) accLen += pts[i].distanceTo(pts[i - 1]);
        // 4 vertices per slice: LeftBot, RightBot, RightTop, LeftTop
        verts.push(p.x + nx, 0, p.z + nz, p.x - nx, 0, p.z - nz, p.x - nx, h, p.z - nz, p.x + nx, h, p.z + nz);
        uvs.push(accLen, 0, accLen, 0, accLen, h, accLen, h);
        if (i < segs) {
          const a = i * 4, b = (i + 1) * 4;
          // Outer face, Inner face, Top cap, Bottom cap
          indices.push(a + 0, b + 0, b + 3, a + 0, b + 3, a + 3);
          indices.push(a + 1, a + 2, b + 2, a + 1, b + 2, b + 1);
          indices.push(a + 3, b + 3, b + 2, a + 3, b + 2, a + 2);
          indices.push(a + 0, a + 1, b + 1, a + 0, b + 1, b + 0);
        }
      }
      // End caps
      const last = segs * 4;
      indices.push(0, 3, 2, 0, 2, 1, last, last + 1, last + 2, last, last + 2, last + 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(cx, baseY, cy);
      mesh.castShadow = !xray; mesh.receiveShadow = true;
      mesh.userData = { id: wall.id };
      this.archGroup.add(mesh);
      this.interactableMeshes.push(mesh);
      return;
    }

    // Straight Wall with SAFE Clamped Door/Window Cutouts!
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.lineTo(len, 0); shape.lineTo(len, h); shape.lineTo(0, h); shape.closePath();

    const openings = allElements.filter(e => (e.type === 'door' || e.type === 'window') && e.wallId === wall.id);
    openings.forEach(op => {
      ArchCore.clampOpeningOnWall(op, wall);
      const hx = Math.max(4, Math.min(len - op.length - 4, op.t * len - op.length * 0.5));
      const hy = Math.max(0.5, op.elevation || 0);
      const topY = Math.min(h - 3, hy + op.height);
      if (topY > hy + 10 && hx + op.length < len - 2) {
        const hole = new THREE.Path();
        hole.moveTo(hx, hy);
        hole.lineTo(hx + op.length, hy);
        hole.lineTo(hx + op.length, topY);
        hole.lineTo(hx, topY);
        hole.closePath();
        shape.holes.push(hole);
      }
    });

    const geo = new THREE.ExtrudeGeometry(shape, { depth: th, bevelEnabled: false });
    geo.translate(0, 0, -th * 0.5);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = !xray;
    mesh.receiveShadow = true;
    mesh.position.set(wall.x1, baseY, wall.y1);
    mesh.rotation.y = -Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1);
    // FIX: Now straight walls ARE selectable in 3D!
    mesh.userData = { id: wall.id };

    this.archGroup.add(mesh);
    this.interactableMeshes.push(mesh);
  },

  _buildOpening(op, allElements) {
    const wall = allElements.find(w => w.id === op.wallId);
    if (!wall) return;
    ArchCore.clampOpeningOnWall(op, wall);

    const cx = wall.x1 + op.t * (wall.x2 - wall.x1);
    const cy = wall.y1 + op.t * (wall.y2 - wall.y1);
    const ang = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1);
    const wallH = Number(wall.height) || 280;
    const effWallH = this.viewMode3D === 'dollhouse' ? wallH * 0.62 : wallH;
    const elev = op.elevation || 0;
    if (elev >= effWallH - 8) return;
    const h = Math.min(op.height, effWallH - elev);
    const w = op.length;
    const th = (wall.thick || 20) + 4;

    const group = new THREE.Group();
    const isWin = op.type === 'window';
    const frameMat = new THREE.MeshStandardMaterial({ color: op.color || (isWin ? '#334155' : '#7c4a22'), roughness: 0.45, metalness: isWin ? 0.35 : 0.08 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xbae6fd, roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.42, clearcoat: 1.0 });
    const leafMat = new THREE.MeshStandardMaterial({ color: op.color || '#8b5a2b', roughness: 0.55 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.88, roughness: 0.22 });

    const ft = 5;
    const addBox = (bw, bh, bd, x, y, z, mat) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mat);
      m.position.set(x, y, z);
      m.castShadow = true; m.receiveShadow = true;
      group.add(m);
    };

    // Frame
    addBox(w, ft, th, 0, h - ft / 2, 0, frameMat);
    if (isWin) addBox(w + 6, ft + 1, th + 6, 0, ft / 2, 0, frameMat); // Window sill!
    addBox(ft, h, th, -w / 2 + ft / 2, h / 2, 0, frameMat);
    addBox(ft, h, th, w / 2 - ft / 2, h / 2, 0, frameMat);

    const iw = w - ft * 2, ih = h - (isWin ? ft * 2 : ft);
    const midY = isWin ? h / 2 : (h - ft) / 2;

    if (op.modelVariant === 'double') {
      addBox(ft * 0.8, ih, th * 0.8, 0, midY, 0, frameMat);
      addBox(iw / 2 - 2, ih, isWin ? 2 : 5, -iw / 4, midY, 0, isWin ? glassMat : leafMat);
      addBox(iw / 2 - 2, ih, isWin ? 2 : 5, iw / 4, midY, 0, isWin ? glassMat : leafMat);
      if (!isWin) {
        addBox(3, 14, 12, -8, 100, 0, brassMat);
        addBox(3, 14, 12, 8, 100, 0, brassMat);
      }
    } else if (op.modelVariant === 'sliding') {
      addBox(iw * 0.54, ih, isWin ? 2 : 5, -iw * 0.22, midY, -3, isWin ? glassMat : leafMat);
      addBox(iw * 0.54, ih, isWin ? 2 : 5, iw * 0.22, midY, 3, isWin ? glassMat : leafMat);
    } else {
      addBox(iw, ih, isWin ? 2 : 5, 0, midY, 0, isWin ? glassMat : leafMat);
      if (!isWin) addBox(3, 14, 12, iw / 2 - 12, 100, 0, brassMat);
    }

    const baseY = (op.floor || 0) * (STATE.globWallHeight || 280);
    group.position.set(cx, baseY + elev, cy);
    group.rotation.y = -ang;
    group.userData = { id: op.id };

    this.archGroup.add(group);
    this.interactableMeshes.push(group);
  },

  _buildFloor(fl) {
    let geo;
    if (fl.polygon && fl.polygon.length >= 3) {
      const sh = new THREE.Shape(fl.polygon.map(p => new THREE.Vector2(p.x, -p.y)));
      geo = new THREE.ExtrudeGeometry(sh, { depth: 12, bevelEnabled: false });
      geo.rotateX(-Math.PI / 2);
      geo.translate(0, -12, 0);
    } else {
      geo = new THREE.BoxGeometry(fl.width, 12, fl.height);
      geo.translate(fl.width / 2, -6, fl.height / 2);
      const uv = geo.attributes.uv, pos = geo.attributes.position;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i), pos.getZ(i));
      uv.needsUpdate = true;
    }

    const mat = this.getMaterial(fl.material || 'wood', fl.color || '#c49a6c');
    const mesh = new THREE.Mesh(geo, mat);
    const baseY = (fl.floor || 0) * (STATE.globWallHeight || 280);
    if (!fl.polygon) mesh.position.set(fl.x, baseY, fl.y);
    else mesh.position.set(0, baseY, 0);
    mesh.receiveShadow = true;
    mesh.userData = { id: fl.id };

    this.archGroup.add(mesh);
    this.interactableMeshes.push(mesh);
  },

  _buildRoof(roof) {
    let geo;
    const w = roof.width || 400, d = roof.height || 400;
    if (roof.modelVariant === 'flat') {
      geo = new THREE.BoxGeometry(w, 22, d);
      geo.translate(0, 11, 0);
    } else {
      geo = new THREE.BufferGeometry();
      const inset = Math.min(w, d) * 0.45;
      const h = Math.min(260, Math.min(w, d) * 0.34);
      const isGabled = roof.modelVariant === 'gabled';
      const v = [-w / 2, 0, -d / 2, w / 2, 0, -d / 2, w / 2, 0, d / 2, -w / 2, 0, d / 2];
      const idx = [];
      if (w >= d) {
        const ix = isGabled ? 0 : inset;
        v.push(-w / 2 + ix, h, 0, w / 2 - ix, h, 0);
        idx.push(0, 4, 5, 0, 5, 1, 1, 5, 2, 2, 5, 4, 2, 4, 3, 3, 4, 0, 0, 1, 2, 0, 2, 3);
      } else {
        const iz = isGabled ? 0 : inset;
        v.push(0, h, -d / 2 + iz, 0, h, d / 2 - iz);
        idx.push(0, 4, 1, 1, 4, 5, 1, 5, 2, 2, 5, 3, 3, 5, 4, 3, 4, 0, 0, 1, 2, 0, 2, 3);
      }
      geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
      const uvs = [];
      for (let i = 0; i < v.length; i += 3) uvs.push(v[i] + w / 2, v[i + 2] + d / 2);
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(idx);
      geo.computeVertexNormals();
    }

    const mat = this.getMaterial(roof.material || 'tiles', roof.color || '#334155');
    mat.side = THREE.DoubleSide;
    const mesh = new THREE.Mesh(geo, mat);
    const baseY = (roof.floor || 0) * (STATE.globWallHeight || 280);
    const elev = roof.elevation !== undefined ? roof.elevation : (STATE.globWallHeight || 280);
    mesh.position.set(roof.x + w / 2, baseY + elev, roof.y + d / 2);
    mesh.rotation.y = -((roof.rotation || 0) * Math.PI) / 180;
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData = { id: roof.id };

    this.archGroup.add(mesh);
    this.interactableMeshes.push(mesh);
  },

  // ============================================================================
  // 25+ REALISTIC 3D ARCHITECTURAL, FURNITURE, KITCHEN, BATH & STAIRS MODELS
  // ============================================================================
  _buildFurniture(fur) {
    const group = new THREE.Group();
    const w = Number(fur.width) || 100;
    const l = Number(fur.length) || 100;
    const h = Number(fur.height) || (ArchCore.CATALOG[fur.modelVariant]?.h || 90);
    const v = fur.modelVariant || 'table';

    const primMat = new THREE.MeshStandardMaterial({ color: fur.color || '#8B5A2B', roughness: 0.58, metalness: 0.08 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.05 });
    const fabricMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.88 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.4 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.16 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xbae6fd, roughness: 0.06, transparent: true, opacity: 0.45 });

    const box = (bw, bh, bd, x, y, z, mat) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mat);
      m.position.set(x, y, z);
      m.castShadow = true; m.receiveShadow = true;
      group.add(m);
      return m;
    };
    const cyl = (rt, rb, ch, x, y, z, mat, segs) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, ch, segs || 16), mat);
      m.position.set(x, y, z);
      m.castShadow = true; m.receiveShadow = true;
      group.add(m);
      return m;
    };

    if (v === 'sofa') {
      box(w, 16, l, 0, 14, 0, primMat);
      box(w - 28, 16, l - 22, 0, 30, 8, fabricMat);
      box(w, 72, 20, 0, 42, -l / 2 + 10, primMat);
      box(16, 54, l, -w / 2 + 8, 33, 0, primMat);
      box(16, 54, l, w / 2 - 8, 33, 0, primMat);
      // Throw pillows
      box(34, 28, 12, -w * 0.28, 48, -l / 2 + 24, darkMat);
      box(34, 28, 12, w * 0.28, 48, -l / 2 + 24, darkMat);
    } else if (v === 'bed') {
      box(w, 22, l, 0, 14, 0, primMat);
      box(w, 98, 10, 0, 49, -l / 2 + 5, primMat);
      box(w - 8, 22, l - 16, 0, 34, 4, whiteMat);
      // Duvet cover
      const blanketMat = new THREE.MeshStandardMaterial({ color: fur.color || '#475569', roughness: 0.85 });
      box(w - 4, 24, l * 0.58, 0, 35, l * 0.16, blanketMat);
      // 2 Pillows
      box(w * 0.38, 12, 34, -w * 0.23, 50, -l / 2 + 34, whiteMat);
      box(w * 0.38, 12, 34, w * 0.23, 50, -l / 2 + 34, whiteMat);
    } else if (v === 'table') {
      box(w, 6, l, 0, h - 3, 0, primMat);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
        cyl(3, 2, h - 6, sx * (w / 2 - 10), (h - 6) / 2, sz * (l / 2 - 10), darkMat, 10);
      });
    } else if (v === 'dining_set') {
      box(w * 0.72, 6, l * 0.65, 0, 75, 0, primMat);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
        box(6, 72, 6, sx * (w * 0.32), 36, sz * (l * 0.28), primMat);
        // 4 chairs tucked neatly
        const cx = sx * (w * 0.2), cz = sz * (l * 0.42);
        box(44, 5, 42, cx, 45, cz, fabricMat);
        box(44, 42, 5, cx, 66, cz + sz * 18, primMat);
        box(4, 45, 4, cx - 18, 22.5, cz - 16, darkMat);
        box(4, 45, 4, cx + 18, 22.5, cz - 16, darkMat);
        box(4, 45, 4, cx - 18, 22.5, cz + 16, darkMat);
        box(4, 45, 4, cx + 18, 22.5, cz + 16, darkMat);
      });
    } else if (v === 'chair') {
      box(w, 6, l, 0, 45, 0, primMat);
      box(w, 44, 6, 0, 67, -l / 2 + 3, primMat);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => box(5, 45, 5, sx * (w / 2 - 4), 22.5, sz * (l / 2 - 4), darkMat));
    } else if (v === 'desk') {
      box(w, 5, l, 0, 74, 0, primMat);
      box(5, 72, l - 4, -w / 2 + 4, 36, 0, darkMat);
      box(5, 72, l - 4, w / 2 - 4, 36, 0, darkMat);
      // Widescreen Monitor
      const scrMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x0369a1, emissiveIntensity: 0.45, roughness: 0.2 });
      box(56, 34, 3, 0, 102, -l * 0.2, darkMat);
      box(52, 30, 1, 0, 102, -l * 0.2 + 2, scrMat);
      box(8, 14, 4, 0, 82, -l * 0.2, chromeMat);
    } else if (v === 'tv') {
      box(w, 46, l, 0, 23, 0, primMat);
      const scrMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x1e3a5f, emissiveIntensity: 0.35, roughness: 0.15 });
      box(w * 0.85, 68, 5, 0, 88, -4, darkMat);
      box(w * 0.81, 63, 1, 0, 88, -1, scrMat);
    } else if (v === 'cabinet') {
      box(w, h, l, 0, h / 2, 0, primMat);
      box(w - 6, h - 8, 3, 0, h / 2, l / 2 + 1, fabricMat);
      box(3, 28, 4, -7, h * 0.52, l / 2 + 4, chromeMat);
      box(3, 28, 4, 7, h * 0.52, l / 2 + 4, chromeMat);
    } else if (v === 'bookshelf') {
      box(4, h, l, -w / 2 + 2, h / 2, 0, primMat);
      box(4, h, l, w / 2 - 2, h / 2, 0, primMat);
      box(w, h, 3, 0, h / 2, -l / 2 + 1.5, primMat);
      const bCols = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6];
      for (let sy = 12; sy < h - 10; sy += 38) {
        box(w - 8, 4, l - 4, 0, sy, 1, primMat);
        for (let bx = -w / 2 + 14; bx < w / 2 - 14; bx += 14) {
          box(10, 24, l * 0.6, bx, sy + 14, 2, new THREE.MeshStandardMaterial({ color: bCols[Math.abs(Math.round(bx + sy)) % bCols.length], roughness: 0.7 }));
        }
      }
    } else if (v === 'kitchen_counter') {
      box(w, 86, l, 0, 43, 0, primMat);
      box(w + 4, 5, l + 4, 0, 88.5, 1, darkMat); // Granite countertop
      box(56, 3, 42, -w * 0.22, 91, 0, chromeMat); // Stainless sink
      cyl(1.5, 1.5, 22, -w * 0.22, 102, -16, chromeMat, 10); // Faucet
      // Induction stove burners
      cyl(9, 9, 1, w * 0.22 - 12, 91.5, -10, darkMat, 16);
      cyl(9, 9, 1, w * 0.22 + 12, 91.5, 10, darkMat, 16);
      // Upper wall cabinets
      box(w, 68, 36, 0, 192, -l / 2 + 18, whiteMat);
    } else if (v === 'kitchen_island') {
      box(w, 86, l * 0.75, 0, 43, -l * 0.1, primMat);
      box(w + 8, 6, l, 0, 89, 0, whiteMat);
      // 2 Bar stools
      [-w * 0.25, w * 0.25].forEach(sx => {
        cyl(16, 16, 4, sx, 64, l * 0.42, darkMat, 16);
        cyl(2.5, 2.5, 62, sx, 31, l * 0.42, chromeMat, 10);
      });
    } else if (v === 'fridge') {
      box(w, h, l, 0, h / 2, 0, chromeMat);
      box(w - 4, 2, 3, 0, h * 0.38, l / 2 + 1, darkMat);
      box(3, 42, 4, -w * 0.35, h * 0.65, l / 2 + 3, darkMat);
      box(3, 28, 4, -w * 0.35, h * 0.22, l / 2 + 3, darkMat);
    } else if (v === 'bathtub') {
      box(w, 55, l, 0, 27.5, 0, whiteMat);
      const waterMat = this.getMaterial('water', '#38bdf8');
      box(w - 18, 4, l - 18, 0, 48, 0, waterMat);
      cyl(2, 2, 18, -w / 2 + 12, 62, 0, chromeMat, 10);
    } else if (v === 'shower') {
      box(w, 10, l, 0, 5, 0, whiteMat);
      box(w, 200, 3, 0, 105, l / 2 - 2, glassMat);
      box(3, 200, l, w / 2 - 2, 105, 0, glassMat);
      cyl(10, 4, 4, 0, 198, -l / 2 + 24, chromeMat, 16);
    } else if (v === 'toilet') {
      box(w, 42, 18, 0, 58, -l / 2 + 10, whiteMat);
      cyl(w * 0.44, w * 0.32, 40, 0, 20, 6, whiteMat, 16);
      cyl(w * 0.46, w * 0.46, 4, 0, 42, 6, whiteMat, 16);
    } else if (v === 'vanity') {
      box(w, 80, l, 0, 40, 0, primMat);
      box(w + 2, 5, l + 2, 0, 82.5, 0, whiteMat);
      cyl(18, 14, 12, 0, 88, 0, whiteMat, 18);
      // Mirror above vanity
      box(w * 0.82, 76, 3, 0, 150, -l / 2 + 4, this.getMaterial('mirror', '#ffffff'));
    } else if (v === 'stairs_straight') {
      const steps = 14;
      const stepH = h / steps, stepD = l / steps;
      for (let i = 0; i < steps; i++) {
        box(w, stepH * 0.35, stepD + 3, 0, (i + 1) * stepH, l / 2 - (i + 0.5) * stepD, primMat);
        box(6, h * 0.04, stepD + 6, -w / 2 + 4, (i + 0.5) * stepH + 92, l / 2 - (i + 0.5) * stepD, darkMat);
        box(6, h * 0.04, stepD + 6, w / 2 - 4, (i + 0.5) * stepH + 92, l / 2 - (i + 0.5) * stepD, darkMat);
      }
      // Stringer beam
      const diag = Math.hypot(l, h);
      const beam = box(14, 18, diag, 0, h * 0.45, 0, darkMat);
      beam.rotation.x = Math.atan2(h, l);
    } else if (v === 'stairs_l') {
      const half = 7;
      const stepH = h / (half * 2);
      const run1 = (l - w * 0.5) / half;
      for (let i = 0; i < half; i++) {
        box(w * 0.48, stepH * 0.4, run1 + 2, -w * 0.25, (i + 1) * stepH, l / 2 - (i + 0.5) * run1, primMat);
      }
      // Corner landing
      box(w * 0.48, 12, w * 0.48, -w * 0.25, half * stepH, -l / 2 + w * 0.24, primMat);
      const run2 = (w * 0.52) / half;
      for (let i = 0; i < half; i++) {
        box(run2 + 2, stepH * 0.4, w * 0.48, (i + 0.5) * run2, (half + i + 1) * stepH, -l / 2 + w * 0.24, primMat);
      }
    } else if (v === 'stairs_spiral') {
      const rad = Math.min(w, l) * 0.5;
      cyl(9, 9, h + 10, 0, h / 2, 0, darkMat, 16);
      const steps = 16;
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const sy = ((i + 1) / steps) * h;
        const tread = new THREE.Mesh(new THREE.BoxGeometry(rad - 8, 6, 30), primMat);
        tread.position.set(Math.cos(a) * (rad * 0.5), sy, Math.sin(a) * (rad * 0.5));
        tread.rotation.y = -a;
        tread.castShadow = true; tread.receiveShadow = true;
        group.add(tread);
        // Baluster post
        cyl(2, 2, 92, Math.cos(a) * (rad - 6), sy + 46, Math.sin(a) * (rad - 6), chromeMat, 8);
      }
    } else if (v === 'column') {
      box(w + 10, 14, l + 10, 0, 7, 0, whiteMat);
      cyl(w * 0.46, w * 0.48, h - 28, 0, h / 2, 0, primMat, 20);
      box(w + 10, 14, l + 10, 0, h - 7, 0, whiteMat);
    } else if (v === 'railing') {
      box(w, 6, 8, 0, h - 3, 0, chromeMat);
      box(w, h - 18, 3, 0, h / 2, 0, glassMat);
      for (let rx = -w / 2 + 4; rx <= w / 2 - 4; rx += Math.max(60, w / 3)) {
        box(5, h, 5, rx, h / 2, 0, darkMat);
      }
    } else if (v === 'pool') {
      const rim = 24;
      box(w + rim * 2, 16, rim, 0, 8, -l / 2 - rim / 2, whiteMat);
      box(w + rim * 2, 16, rim, 0, 8, l / 2 + rim / 2, whiteMat);
      box(rim, 16, l, -w / 2 - rim / 2, 8, 0, whiteMat);
      box(rim, 16, l, w / 2 + rim / 2, 8, 0, whiteMat);
      box(w, 10, l, 0, 8, 0, this.getMaterial('water', '#0ea5e9'));
    } else if (v === 'tree' || v === 'plant') {
      const isTree = v === 'tree';
      const leafMat = new THREE.MeshStandardMaterial({ color: isTree ? 0x15803d : 0x16a34a, roughness: 0.82 });
      if (isTree) {
        cyl(10, 15, 130, 0, 65, 0, new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 }), 10);
        [[0, 185, 0, 68], [-35, 160, 22, 46], [34, 168, -20, 48], [10, 225, 14, 42]].forEach(([x, y, z, r]) => {
          const s = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), leafMat);
          s.position.set(x, y, z); s.castShadow = true; group.add(s);
        });
      } else {
        cyl(16, 11, 32, 0, 16, 0, whiteMat, 14);
        const s = new THREE.Mesh(new THREE.DodecahedronGeometry(26, 1), leafMat);
        s.position.y = 54; s.castShadow = true; group.add(s);
      }
    } else if (v === 'lamp') {
      cyl(16, 18, 4, 0, 2, 0, darkMat, 16);
      cyl(2.2, 2.2, 136, 0, 70, 0, chromeMat, 10);
      const shadeMat = new THREE.MeshStandardMaterial({ color: 0xfffbeb, emissive: 0xfde68a, emissiveIntensity: 0.65, roughness: 0.3 });
      cyl(12, 22, 30, 0, 148, 0, shadeMat, 18);
      const pl = new THREE.PointLight(0xffedd5, 40000, 700, 1.8);
      pl.position.y = 142;
      pl.userData = { isArchLight: true, baseIntensity: 1.0 };
      group.add(pl);
    } else if (v === 'custom_glb' && fur.gltfData) {
      if (this.gltfCache[fur.id]) {
        group.add(this.gltfCache[fur.id].clone());
      } else {
        const placeholder = box(w, 80, l, 0, 40, 0, new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true }));
        placeholder.name = 'placeholder';
        const loader = new GLTFLoader();
        loader.load(fur.gltfData, gltf => {
          const m = gltf.scene;
          const bb = new THREE.Box3().setFromObject(m);
          const sz = bb.getSize(new THREE.Vector3());
          const sc = (Math.max(sz.x, sz.y, sz.z) > 0) ? (w / Math.max(sz.x, sz.y, sz.z)) : 1;
          m.scale.setScalar(sc);
          const cb = new THREE.Box3().setFromObject(m);
          m.position.set(-(cb.max.x + cb.min.x) / 2, -cb.min.y, -(cb.max.z + cb.min.z) / 2);
          m.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
          this.gltfCache[fur.id] = m;
          const ph = group.getObjectByName('placeholder');
          if (ph) group.remove(ph);
          group.add(m.clone());
        });
      }
    }

    const baseY = (fur.floor || 0) * (STATE.globWallHeight || 280);
    group.position.set(fur.x, baseY + (fur.elevation || 0), fur.y);
    group.rotation.y = -((fur.rotation || 0) * Math.PI) / 180;
    group.userData = { id: fur.id };

    this.archGroup.add(group);
    this.interactableMeshes.push(group);
  },

  _buildLight(l) {
    const group = new THREE.Group();
    const col = l.color || '#ffedd5';
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(8, 14, 14),
      new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.1 })
    );
    group.add(bulb);

    const nightFactor = (this.sunTime < 8.5 || this.sunTime > 18.0) ? 1.8 : 0.45;
    const pl = new THREE.PointLight(col, (l.intensity || 1.2) * nightFactor * 45000, 1200, 1.8);
    pl.userData = { isArchLight: true, baseIntensity: l.intensity || 1.2 };
    group.add(pl);

    const baseY = (l.floor || 0) * (STATE.globWallHeight || 280);
    group.position.set(l.x, baseY + (l.elevation || 255), l.y);
    group.userData = { id: l.id };

    this.helperGroup.add(group);
    this.interactableMeshes.push(bulb);
  },

  /**
   * Returns a clean scaled clone of ONLY architectural geometry (NO GridHelper, NO debug bulbs!)
   * scaleFactor: 0.01 (cm -> meters 1:1), 0.0002 (1:50 tabletop AR maquette), 0.1 (1:100 mm STL maquette!)
   */
  getCleanExportGroup(scaleFactor) {
    const clone = this.archGroup.clone(true);
    // Strip any PointLights from furniture lamps before mesh export
    const toRemove = [];
    clone.traverse(ch => { if (ch.isLight) toRemove.push(ch); });
    toRemove.forEach(l => l.parent && l.parent.remove(l));

    clone.scale.setScalar(scaleFactor || 0.01);
    clone.updateMatrixWorld(true);
    // Ground cleanly at Y = 0
    const bb = new THREE.Box3().setFromObject(clone);
    if (!bb.isEmpty()) {
      const c = bb.getCenter(new THREE.Vector3());
      clone.position.set(-c.x, -bb.min.y, -c.z);
      clone.updateMatrixWorld(true);
    }
    return clone;
  },

  startVideoTour(nodes, onDone) {
    if (!nodes || nodes.length < 2) return;
    const pts = nodes.map(n => new THREE.Vector3(n.x, (n.floor || 0) * (STATE.globWallHeight || 280) + (n.elevation || 168), n.y));
    const curve = new THREE.CatmullRomCurve3(pts);

    const stream = this.renderer.domElement.captureStream(30);
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType: mime });
    const chunks = [];
    recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'architect_virtual_tour.webm';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      if (this.controls) this.controls.enabled = true;
      const st = document.getElementById('mode3DStatus');
      if (st) st.textContent = 'Orbit';
      if (onDone) onDone();
    };

    if (this.controls) this.controls.enabled = false;
    const st = document.getElementById('mode3DStatus');
    if (st) st.textContent = '🎥 REC...';
    recorder.start();

    const duration = Math.max(4000, nodes.length * 2200);
    const startTs = performance.now();
    const step = () => {
      const p = (performance.now() - startTs) / duration;
      if (p >= 1) { recorder.stop(); return; }
      const pos = curve.getPoint(p);
      const look = curve.getPoint(Math.min(1, p + 0.03));
      this.camera.position.copy(pos);
      this.camera.lookAt(look);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  },

  render() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
};

window.Engine3D = Engine3D;
