/**
 * Maker Studio 7 — Three.js r165 Interactive CAD Viewport, Simulators & Exporters
 * Features: PMREM Studio Lighting, 220×220 mm Print Bed Overlay, PBR 4-Map Material Binding,
 *           Live Twin-Gear Meshing Animation, Maze BFS Solution Glow, Live Animated G-Code Nozzle,
 *           1:1 m GLB Export, WebAR Bridge (window.StudiosProAR), PNG Snapshot & Client Proof HTML.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

class MakerViewport {
  constructor(container) {
    this.container = container;
    this.showBed220 = true;
    this.showWireframe = false;
    this.autoRotate = false;
    this.latestBuild = null;

    // Live simulation states
    this.gearAnim = { active: false, primary: null, twin: null, ratio: -1, angle: 0 };
    this.gcodeSim = { active: false, playing: true, speed: 1.5, segments: [], headMesh: null, cursor: 0 };

    this.scene = new THREE.Scene();

    const w = Math.max(100, container.clientWidth);
    const h = Math.max(100, container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(40, w / h, 0.2, 4000);
    this.camera.position.set(140, 120, 180);

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
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxDistance = 1400;

    // Clean neutral studio PMREM environment (no neon pink glare!)
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Balanced 3-point CAD studio lighting
    this.scene.add(new THREE.HemisphereLight(0xf8fafc, 0x334155, 0.65));
    this.keyLight = new THREE.DirectionalLight(0xffffff, 1.65);
    this.keyLight.position.set(160, 260, 180);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.camera.left = -220;
    this.keyLight.shadow.camera.right = 220;
    this.keyLight.shadow.camera.top = 220;
    this.keyLight.shadow.camera.bottom = -220;
    this.keyLight.shadow.camera.far = 900;
    this.scene.add(this.keyLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.75);
    rimLight.position.set(-180, 120, -140);
    this.scene.add(rimLight);

    // Build 220×220 mm Standard 3D Print Bed Overlay + Floor Shadow Catcher
    this.bedGroup = this._createPrintBed220();
    this.scene.add(this.bedGroup);

    this.shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(800, 800),
      new THREE.ShadowMaterial({ opacity: 0.25 })
    );
    this.shadowPlane.rotation.x = -Math.PI / 2;
    this.shadowPlane.position.y = -0.04;
    this.shadowPlane.receiveShadow = true;
    this.scene.add(this.shadowPlane);

    // Main exportable geometry group + visual overlays group
    this.modelGroup = new THREE.Group();
    this.modelGroup.name = 'MakerStudio7Model';
    this.scene.add(this.modelGroup);

    this.overlayGroup = new THREE.Group();
    this.overlayGroup.name = 'SimulationOverlay';
    this.scene.add(this.overlayGroup);

    this._lastTime = performance.now();
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);

    const tick = (now) => {
      requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - this._lastTime) / 1000);
      this._lastTime = now;
      this._stepSimulations(dt);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    requestAnimationFrame(tick);
  }

  _createPrintBed220() {
    const g = new THREE.Group();
    // 220×220 mm build plate outline (22×22 10 mm squares!)
    const grid = new THREE.GridHelper(220, 22, 0x38bdf8, 0x1e293b);
    grid.material.transparent = true;
    grid.material.opacity = 0.42;
    g.add(grid);

    const borderPts = [
      new THREE.Vector3(-110, 0.1, -110), new THREE.Vector3(110, 0.1, -110),
      new THREE.Vector3(110, 0.1, 110),   new THREE.Vector3(-110, 0.1, 110),
      new THREE.Vector3(-110, 0.1, -110)
    ];
    const borderGeo = new THREE.BufferGeometry().setFromPoints(borderPts);
    const borderLine = new THREE.Line(borderGeo, new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 }));
    g.add(borderLine);
    return g;
  }

  _stepSimulations(dt) {
    // 1. Live Twin Meshing Gear synchronized counter-rotation!
    if (this.gearAnim.active && this.gearAnim.primary && this.gearAnim.twin) {
      this.gearAnim.angle += dt * 0.95;
      this.gearAnim.primary.rotation.y = this.gearAnim.angle;
      this.gearAnim.twin.rotation.y = this.gearAnim.angle * this.gearAnim.ratio;
    }
    // 2. Live Animated G-Code CNC / 3D Printer Nozzle Head!
    if (this.gcodeSim.active && this.gcodeSim.playing && this.gcodeSim.segments.length > 0 && this.gcodeSim.headMesh) {
      const segs = this.gcodeSim.segments;
      this.gcodeSim.cursor = (this.gcodeSim.cursor + dt * 28 * this.gcodeSim.speed) % segs.length;
      const idx = Math.floor(this.gcodeSim.cursor);
      const frac = this.gcodeSim.cursor - idx;
      const seg = segs[idx];
      const x = seg.x0 + (seg.x1 - seg.x0) * frac;
      const y = seg.y0 + (seg.y1 - seg.y0) * frac;
      const z = seg.z0 + (seg.z1 - seg.z0) * frac;
      this.gcodeSim.headMesh.position.set(x, y + 6, z);
    }
  }

  _clearGroup(group) {
    while (group.children.length > 0) {
      const ch = group.children.pop();
      ch.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => {
            if (m.map) m.map.dispose();
            if (m.normalMap) m.normalMap.dispose();
            if (m.roughnessMap) m.roughnessMap.dispose();
            if (m.aoMap) m.aoMap.dispose();
            m.dispose();
          });
        }
      });
    }
  }

  _assignBoxUVs(geo) {
    const pos = geo.attributes.position;
    const nrm = geo.attributes.normal;
    const uvs = new Float32Array(pos.count * 2);
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    const sx = Math.max(1, bb.max.x - bb.min.x);
    const sy = Math.max(1, bb.max.y - bb.min.y);
    const sz = Math.max(1, bb.max.z - bb.min.z);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const nx = Math.abs(nrm.getX(i)), ny = Math.abs(nrm.getY(i)), nz = Math.abs(nrm.getZ(i));
      let u = 0, v = 0;
      if (nx >= ny && nx >= nz) { u = (z - bb.min.z) / sz; v = (y - bb.min.y) / sy; }
      else if (ny >= nx && ny >= nz) { u = (x - bb.min.x) / sx; v = (z - bb.min.z) / sz; }
      else { u = (x - bb.min.x) / sx; v = (y - bb.min.y) / sy; }
      uvs[i * 2] = u; uvs[i * 2 + 1] = v;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  }

  _assignSphericalUVs(geo) {
    const pos = geo.attributes.position;
    const uvs = new Float32Array(pos.count * 2);
    geo.computeBoundingBox();
    const cy = (geo.boundingBox.min.y + geo.boundingBox.max.y) * 0.5;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i) - cy, z = pos.getZ(i);
      const r = Math.hypot(x, y, z) || 1;
      const u = 0.5 + Math.atan2(z, x) / (Math.PI * 2);
      const v = 0.5 + Math.asin(Math.max(-1, Math.min(1, y / r))) / Math.PI;
      uvs[i * 2] = u; uvs[i * 2 + 1] = v;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  }

  renderBuild(buildResult, resetCamera) {
    this.latestBuild = buildResult;
    this._clearGroup(this.modelGroup);
    this._clearGroup(this.overlayGroup);
    this.gearAnim = { active: false, primary: null, twin: null, ratio: -1, angle: 0 };
    this.gcodeSim.active = false;

    const { parts, stats, extras, studioId } = buildResult;
    const minY = stats.bounds.minY;
    const cx = (stats.bounds.minX + stats.bounds.maxX) * 0.5;
    const cz = (stats.bounds.minZ + stats.bounds.maxZ) * 0.5;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(part.positions, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(part.normals, 3));
      geo.setIndex(new THREE.BufferAttribute(part.indices, 1));

      const matCfg = {
        color: new THREE.Color(part.color || '#3b82f6'),
        roughness: part.roughness != null ? part.roughness : 0.42,
        metalness: part.metalness != null ? part.metalness : 0.15,
        flatShading: !!part.flatShaded,
        wireframe: this.showWireframe
      };

      // Bind real 4-map PBR textures for PBR Texture Forge!
      if (part.pbrMaps) {
        if (part.name === 'pbr_sphere') this._assignSphericalUVs(geo);
        else this._assignBoxUVs(geo);

        const rep = part.pbrRepeat || 2;
        const makeTex = (canvas, isColor) => {
          const t = new THREE.CanvasTexture(canvas);
          t.wrapS = t.wrapT = THREE.RepeatWrapping;
          t.repeat.set(rep, rep);
          if (isColor) t.colorSpace = THREE.SRGBColorSpace;
          return t;
        };
        matCfg.map = makeTex(part.pbrMaps.albedo, true);
        matCfg.normalMap = makeTex(part.pbrMaps.normal, false);
        matCfg.normalScale = new THREE.Vector2(part.normalDepth || 1.2, part.normalDepth || 1.2);
        matCfg.roughnessMap = makeTex(part.pbrMaps.roughness, false);
        matCfg.aoMap = makeTex(part.pbrMaps.ao, false);
        matCfg.aoMapIntensity = 0.65;
      }

      const mat = new THREE.MeshStandardMaterial(matCfg);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = part.name || ('part_' + i);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Support live Twin-Gear counter-rotation around exact gear pivots!
      if (part.animRole === 'gear_primary') {
        const pivot = new THREE.Group();
        pivot.add(mesh);
        this.modelGroup.add(pivot);
        this.gearAnim.primary = pivot;
      } else if (part.animRole === 'gear_twin') {
        // Shift vertices locally so twin rotates cleanly around its own pivotX!
        geo.translate(-part.pivotX, 0, 0);
        const pivot = new THREE.Group();
        pivot.position.set(part.pivotX, 0, 0);
        pivot.add(mesh);
        this.modelGroup.add(pivot);
        this.gearAnim.twin = pivot;
        this.gearAnim.ratio = part.ratio || -1;
        this.gearAnim.active = true;
      } else {
        this.modelGroup.add(mesh);
      }
    }

    // Center horizontally on print bed and seat cleanly at y = 0
    this.modelGroup.position.set(-cx, -minY, -cz);
    this.overlayGroup.position.set(-cx, -minY, -cz);

    // Overlay 1: Maze BFS Shortest-Path Glowing Solution Ribbon!
    if (extras && extras.solutionPath3D && extras.solutionPath3D.length > 1) {
      const pts = extras.solutionPath3D.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x22d3ee, linewidth: 3 });
      this.overlayGroup.add(new THREE.Line(lineGeo, lineMat));

      // Entrance (Green) & Exit (Rose) glowing markers
      const mkPin = (pt, hex) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(2.6, 14, 14), new THREE.MeshBasicMaterial({ color: hex }));
        m.position.copy(pt);
        this.overlayGroup.add(m);
      };
      mkPin(pts[0], 0x10b981);
      mkPin(pts[pts.length - 1], 0xf43f5e);
    }

    // Overlay 2: Real G-Code Toolpath Lines (Green Cuts + Red Rapids) & Live Animated Nozzle Head!
    if (studioId === 'gcode' && extras && extras.gcode) {
      const segs = extras.gcode.segments.filter((seg) => seg.layer <= extras.maxLayer);
      const cutVerts = [], rapidVerts = [];
      for (const seg of segs) {
        const arr = seg.rapid ? rapidVerts : cutVerts;
        arr.push(seg.x0, seg.y0, seg.z0, seg.x1, seg.y1, seg.z1);
      }
      if (cutVerts.length > 0) {
        const cg = new THREE.BufferGeometry();
        cg.setAttribute('position', new THREE.Float32BufferAttribute(cutVerts, 3));
        this.overlayGroup.add(new THREE.LineSegments(cg, new THREE.LineBasicMaterial({ color: new THREE.Color(extras.toolColor || '#10b981') })));
      }
      if (rapidVerts.length > 0) {
        const rg = new THREE.BufferGeometry();
        rg.setAttribute('position', new THREE.Float32BufferAttribute(rapidVerts, 3));
        this.overlayGroup.add(new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.38 })));
      }
      // Animated 3D Brass Extruder Nozzle / CNC Spindle Head!
      const head = new THREE.Mesh(
        new THREE.ConeGeometry(3.2, 12, 16),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.2 })
      );
      head.rotation.x = Math.PI; // Tip points straight down onto toolpath!
      this.overlayGroup.add(head);
      this.gcodeSim.segments = segs;
      this.gcodeSim.headMesh = head;
      this.gcodeSim.cursor = Math.min(this.gcodeSim.cursor, Math.max(0, segs.length - 1));
      this.gcodeSim.active = segs.length > 0;
    }

    if (resetCamera) this.fitCamera();
  }

  fitCamera(view = 'iso') {
    if (!this.latestBuild) return;
    const { sizeMm } = this.latestBuild.stats;
    const maxD = Math.max(sizeMm.x, sizeMm.y, sizeMm.z, 45);
    const dist = maxD * 1.95;
    const cy = sizeMm.y * 0.45;
    this.controls.target.set(0, cy, 0);
    if (view === 'top') this.camera.position.set(0, cy + dist * 1.15, 0.1);
    else if (view === 'front') this.camera.position.set(0, cy + dist * 0.12, dist * 1.15);
    else if (view === 'side') this.camera.position.set(dist * 1.15, cy + dist * 0.15, 0);
    else this.camera.position.set(dist * 0.68, cy + dist * 0.56, dist * 0.86);
    this.controls.update();
  }

  setBedVisible(v) { this.showBed220 = !!v; this.bedGroup.visible = this.showBed220; }
  setWireframe(v) { this.showWireframe = !!v; if (this.latestBuild) this.renderBuild(this.latestBuild, false); }
  setAutoRotate(v) { this.autoRotate = !!v; this.controls.autoRotate = this.autoRotate; this.controls.autoRotateSpeed = 1.6; }
  setGcodePlayback(playing, speed) {
    if (playing != null) this.gcodeSim.playing = !!playing;
    if (speed != null) this.gcodeSim.speed = Number(speed) || 1.5;
  }

  /**
   * Exports exact 1:1 Meter-Scale GLB (mm * 0.001) — compatible with Blender, WebAR, SceneViewer & QuickLook!
   */
  exportGLB() {
    return new Promise((resolve, reject) => {
      if (!this.latestBuild) return reject(new Error('No geometry'));
      const scale = 0.001;
      const root = new THREE.Group();
      root.name = 'StudiosProMaker7';
      this.modelGroup.updateMatrixWorld(true);
      const clone = this.modelGroup.clone(true);
      clone.position.multiplyScalar(scale);
      clone.scale.setScalar(scale);
      root.add(clone);
      root.updateMatrixWorld(true);

      const exporter = new GLTFExporter();
      exporter.parse(root, (res) => resolve(res), (err) => reject(err), { binary: true });
    });
  }

  async sendToWebAR() {
    if (!this.latestBuild || !window.StudiosProAR) throw new Error('AR bridge unavailable');
    const glb = await this.exportGLB();
    const { stats, studioId } = this.latestBuild;
    window.StudiosProAR.sendModel({
      modelData: glb,
      extension: 'glb',
      isBinary: true,
      name: `maker7_${studioId}.glb`,
      placement: 'floor',
      dimensionsMm: { x: stats.sizeMm.x, y: stats.sizeMm.y, z: stats.sizeMm.z },
      sourceStudio: 'maker7'
    });
  }

  capturePNG(isPro) {
    this.renderer.render(this.scene, this.camera);
    const src = this.renderer.domElement;
    const out = document.createElement('canvas');
    out.width = src.width; out.height = src.height;
    const ctx = out.getContext('2d');
    const g = ctx.createRadialGradient(out.width * 0.5, out.height * 0.45, 20, out.width * 0.5, out.height * 0.5, out.width * 0.7);
    g.addColorStop(0, '#131c2e'); g.addColorStop(1, '#05070d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(src, 0, 0);
    if (!isPro) {
      ctx.font = `700 ${Math.max(14, Math.round(out.width * 0.015))}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.textAlign = 'right';
      ctx.fillText('Studios-Pro · Maker Studio 7', out.width - 22, out.height - 18);
    }
    return out.toDataURL('image/png');
  }

  async buildClientProofHTML(lang = 'en') {
    const glb = await this.exportGLB();
    const u8 = new Uint8Array(glb);
    let bin = '';
    for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    const b64 = btoa(bin);
    const { stats, studioId } = this.latestBuild;
    const title = `Maker Studio 7 — ${studioId.toUpperCase()} 3D Proof`;
    return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{margin:0;overflow:hidden;background:radial-gradient(circle,#131c2e,#05070d);color:#f8fafc;font-family:Inter,system-ui,sans-serif}
.hud{position:fixed;top:16px;left:16px;background:rgba(15,23,42,.82);border:1px solid rgba(56,189,248,.35);border-radius:12px;padding:12px 16px}
.hud h1{margin:0 0 4px;font-size:14px;color:#38bdf8}.hud p{margin:2px 0;font-size:12px;color:#cbd5e1}</style>
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/"}}</script>
</head><body><div class="hud"><h1>🛠️ ${title}</h1><p>${stats.sizeMm.x} × ${stats.sizeMm.y} × ${stats.sizeMm.z} mm · Est. PLA ${stats.plaGrams} g</p></div>
<script type="module">
import * as THREE from 'three';import { OrbitControls } from 'three/addons/controls/OrbitControls.js';import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
const s=new THREE.Scene(),c=new THREE.PerspectiveCamera(40,innerWidth/innerHeight,0.001,20);const r=new THREE.WebGLRenderer({antialias:true,alpha:true});r.setSize(innerWidth,innerHeight);document.body.appendChild(r.domElement);
const p=new THREE.PMREMGenerator(r);s.environment=p.fromScene(new RoomEnvironment(),0.04).texture;const ctrl=new OrbitControls(c,r.domElement);ctrl.enableDamping=true;ctrl.autoRotate=true;
const raw=atob("${b64}");const b=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)b[i]=raw.charCodeAt(i);
new GLTFLoader().parse(b.buffer,'',g=>{s.add(g.scene);const bx=new THREE.Box3().setFromObject(g.scene),sz=bx.getSize(new THREE.Vector3()),ct=bx.getCenter(new THREE.Vector3());const md=Math.max(sz.x,sz.y,sz.z,0.04);ctrl.target.copy(ct);c.position.set(ct.x+md*1.2,ct.y+md*0.9,ct.z+md*1.5);});
addEventListener('resize',()=>{c.aspect=innerWidth/innerHeight;c.updateProjectionMatrix();r.setSize(innerWidth,innerHeight);});
(function loop(){requestAnimationFrame(loop);ctrl.update();r.render(s,c);})();
</script></body></html>`;
  }

  resize() {
    const w = Math.max(100, this.container.clientWidth);
    const h = Math.max(100, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}

window.MakerViewport = MakerViewport;
window.dispatchEvent(new CustomEvent('maker-viewport-ready'));
