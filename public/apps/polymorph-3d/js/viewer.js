/**
 * PolyMorph 3D Studio - Three.js WebGL 3D Studio Viewport
 */
class Viewer3D {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.currentModel = null;
    this.wireframeOverlayMesh = null;
    this.renderMode = 'shaded'; // 'shaded', 'wireframe', 'matcap', 'normals', 'xray', 'litho'
    this.isTurntable = false;
    this.isSlicing = false;
    this.slicingOffset = 0;
    this.clippingPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 100);

    this.init();
  }

  init() {
    // 1. Scene & Renderer
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c0e14);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      preserveDrawingBuffer: true,
      alpha: true
    });
    this.renderer.setSize(this.canvas.parentElement.clientWidth, this.canvas.parentElement.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.localClippingEnabled = true;

    // 2. Camera & OrbitControls
    const aspect = this.canvas.parentElement.clientWidth / this.canvas.parentElement.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 2000);
    this.camera.position.set(60, 50, 80);

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 1500;
    this.controls.minDistance = 2;

    // 3. Grid & Ground
    this.grid = new THREE.GridHelper(120, 24, 0x00f0ff, 0x242d3d);
    this.grid.position.y = -0.01;
    this.scene.add(this.grid);

    // 4. Lighting System
    this.lightsGroup = new THREE.Group();
    this.scene.add(this.lightsGroup);
    this.setupLighting('studio');

    // 5. Backlit lamp for Lithophane simulation
    this.lithoLight = new THREE.PointLight(0xfff0dd, 2.5, 200);
    this.lithoLight.position.set(0, 30, -35);
    this.lithoLight.visible = false;
    this.scene.add(this.lithoLight);

    // 6. Matcap & Shader materials
    this.setupSpecialMaterials();

    // 7. Event Listeners
    window.addEventListener('resize', () => this.onWindowResize());

    // 8. Animation Loop
    this.animate();
  }

  setupLighting(preset = 'studio') {
    // Clear existing lights
    while (this.lightsGroup.children.length > 0) {
      this.lightsGroup.remove(this.lightsGroup.children[0]);
    }

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.lightsGroup.add(ambient);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(50, 80, 50);
    dirLight1.castShadow = true;
    this.lightsGroup.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight2.position.set(-50, 40, -50);
    this.lightsGroup.add(dirLight2);

    if (preset === 'cyber') {
      dirLight1.color.setHex(0x00f0ff);
      dirLight2.color.setHex(0xff007f);
      ambient.color.setHex(0x1a1a3a);
    } else if (preset === 'warm') {
      dirLight1.color.setHex(0xffecc4);
      dirLight2.color.setHex(0xd47a28);
      ambient.color.setHex(0x3a2818);
    } else if (preset === 'sky') {
      dirLight1.color.setHex(0xfcfcff);
      dirLight2.color.setHex(0x90c5ff);
      ambient.color.setHex(0x283b54);
    } else if (preset === 'dark') {
      dirLight1.intensity = 0.5;
      dirLight2.intensity = 0.2;
      ambient.intensity = 0.2;
    }
  }

  setupSpecialMaterials() {
    this.normalMaterial = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });

    this.xrayMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      transmission: 0.9,
      thickness: 1.2,
      side: THREE.DoubleSide
    });

    this.matcapMaterial = new THREE.MeshStandardMaterial({
      color: 0xb0b8c4,
      roughness: 0.25,
      metalness: 0.6,
      side: THREE.DoubleSide
    });
  }

  setModel(object3D) {
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
    }
    if (this.wireframeOverlayMesh) {
      this.scene.remove(this.wireframeOverlayMesh);
      this.wireframeOverlayMesh = null;
    }

    this.currentModel = object3D;
    this.scene.add(this.currentModel);

    // Save original materials
    this.currentModel.traverse((child) => {
      if (child.isMesh) {
        child.userData.originalMaterial = child.material;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Auto-frame camera
    this.fitCameraToModel();
    this.applyRenderMode();
  }

  fitCameraToModel() {
    if (!this.currentModel) return;

    const box = new THREE.Box3().setFromObject(this.currentModel);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z) || 30;
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.6;

    this.camera.position.set(center.x + cameraZ * 0.8, center.y + cameraZ * 0.6, center.z + cameraZ * 0.9);
    this.camera.lookAt(center);
    this.controls.target.copy(center);
    this.controls.update();

    // Adjust Grid Size
    const gridDim = Math.max(100, Math.ceil(maxDim * 2.5 / 10) * 10);
    this.grid.scale.set(gridDim / 100, 1, gridDim / 100);

    // Update clipping limits
    this.modelHeight = size.y || 50;
    this.modelCenterY = center.y;
    this.clippingPlane.constant = this.modelCenterY + this.modelHeight;
  }

  setRenderMode(mode) {
    this.renderMode = mode;
    this.applyRenderMode();
  }

  applyRenderMode() {
    if (!this.currentModel) return;

    this.lithoLight.visible = (this.renderMode === 'litho');

    this.currentModel.traverse((child) => {
      if (child.isMesh) {
        if (this.renderMode === 'shaded') {
          child.material = child.userData.customPbrMaterial || child.userData.originalMaterial;
          child.material.wireframe = false;
          child.visible = true;
        } else if (this.renderMode === 'wireframe') {
          child.material = child.userData.originalMaterial;
          child.material.wireframe = true;
          child.visible = true;
        } else if (this.renderMode === 'matcap') {
          child.material = this.matcapMaterial;
          child.material.wireframe = false;
          child.visible = true;
        } else if (this.renderMode === 'normals') {
          child.material = this.normalMaterial;
          child.material.wireframe = false;
          child.visible = true;
        } else if (this.renderMode === 'xray') {
          child.material = this.xrayMaterial;
          child.material.wireframe = false;
          child.visible = true;
        } else if (this.renderMode === 'litho') {
          child.material = child.userData.originalMaterial;
          child.material.wireframe = false;
          child.visible = true;
        }

        // Apply clipping plane to material if slicing active
        if (this.isSlicing) {
          child.material.clippingPlanes = [this.clippingPlane];
          child.material.clipShadows = true;
        } else {
          child.material.clippingPlanes = [];
        }
      }
    });
  }

  setWireframeOverlay(enabled) {
    if (!this.currentModel) return;

    if (!enabled) {
      if (this.wireframeOverlayMesh) {
        this.scene.remove(this.wireframeOverlayMesh);
        this.wireframeOverlayMesh = null;
      }
      return;
    }

    if (this.wireframeOverlayMesh) {
      this.scene.remove(this.wireframeOverlayMesh);
    }

    const wireframeGroup = new THREE.Group();
    this.currentModel.traverse((child) => {
      if (child.isMesh && child.geometry) {
        const wireGeo = new THREE.WireframeGeometry(child.geometry);
        const wireMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, linewidth: 1 });
        const wireMesh = new THREE.LineSegments(wireGeo, wireMat);
        wireMesh.matrix.copy(child.matrix);
        wireMesh.matrixAutoUpdate = false;
        wireframeGroup.add(wireMesh);
      }
    });

    this.wireframeOverlayMesh = wireframeGroup;
    this.scene.add(this.wireframeOverlayMesh);
  }

  updateCustomMaterial({ color, metalness, roughness }) {
    if (!this.currentModel) return;

    this.currentModel.traverse((child) => {
      if (child.isMesh) {
        if (!child.userData.customPbrMaterial) {
          child.userData.customPbrMaterial = new THREE.MeshStandardMaterial({
            side: THREE.DoubleSide
          });
        }
        if (color) child.userData.customPbrMaterial.color.set(color);
        if (metalness !== undefined) child.userData.customPbrMaterial.metalness = parseFloat(metalness);
        if (roughness !== undefined) child.userData.customPbrMaterial.roughness = parseFloat(roughness);
      }
    });

    if (this.renderMode === 'shaded') {
      this.applyRenderMode();
    }
  }

  setSlicing(active, normalizedPosition = 0.5) {
    this.isSlicing = active;
    if (this.currentModel) {
      const box = new THREE.Box3().setFromObject(this.currentModel);
      const cutY = box.min.y + (box.max.y - box.min.y) * normalizedPosition;
      this.clippingPlane.constant = cutY;
    }
    this.applyRenderMode();
  }

  toggleTurntable() {
    this.isTurntable = !this.isTurntable;
    this.controls.autoRotate = this.isTurntable;
    this.controls.autoRotateSpeed = 3.0;
    return this.isTurntable;
  }

  resetCamera() {
    this.fitCameraToModel();
  }

  /**
   * Records a 360-degree rotating turntable video (.webm) of the active 3D model
   * @param {number} durationSec 
   * @returns {Promise<Blob>}
   */
  async record360Video(durationSec = 5) {
    if (!this.canvas.captureStream || !window.MediaRecorder) {
      throw new Error("Video recording not supported in this browser.");
    }

    const wasTurntable = this.controls.autoRotate;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = (360 / (durationSec * 60)) * 60;

    const stream = this.canvas.captureStream(60);
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType: mime });
    const chunks = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    return new Promise((resolve) => {
      recorder.onstop = () => {
        this.controls.autoRotate = wasTurntable;
        this.controls.autoRotateSpeed = 3.0;
        const blob = new Blob(chunks, { type: 'video/webm' });
        resolve(blob);
      };

      recorder.start();
      setTimeout(() => {
        recorder.stop();
      }, durationSec * 1000);
    });
  }

  captureScreenshot(transparent = true) {
    const originalBg = this.scene.background;
    const gridVisible = this.grid.visible;

    if (transparent) {
      this.scene.background = null;
      this.grid.visible = false;
    }

    this.renderer.render(this.scene, this.camera);
    const dataUrl = this.canvas.toDataURL('image/png');

    // Restore
    this.scene.background = originalBg;
    this.grid.visible = gridVisible;
    this.renderer.render(this.scene, this.camera);

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `PolyMorph_3D_Snapshot_${Date.now()}.png`;
    link.click();
  }

  onWindowResize() {
    if (!this.canvas.parentElement) return;
    const w = this.canvas.parentElement.clientWidth;
    const h = this.canvas.parentElement.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();

    if (this.wireframeOverlayMesh && this.currentModel) {
      this.wireframeOverlayMesh.position.copy(this.currentModel.position);
      this.wireframeOverlayMesh.rotation.copy(this.currentModel.rotation);
      this.wireframeOverlayMesh.scale.copy(this.currentModel.scale);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.Viewer3D = Viewer3D;
