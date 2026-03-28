// engine3d.js
window.Engine3D = {
    container: null,
    renderer: null,
    scene: null,
    camera: null,
    controls: null,
    needsRebuild: true,
    transformControl: null,
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),

    meshes: [], // To store active Three.JS meshes for easy cleanup
    interactableMeshes: [], // Meshes that can be clicked/moved

    init(canvas) {
        this.container = canvas.parentElement;

        this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        // Dark theme clear color
        this.renderer.setClearColor(0x10141d, 1);

        // Standard materials cache
        this.materialsCache = {};

        this.scene = new THREE.Scene();

        // Camera
        this.camera = new THREE.PerspectiveCamera(45, this.container.clientWidth / this.container.clientHeight, 1, 10000);
        this.camera.position.set(-500, 500, 500);

        // Grid Base
        const gridHelper = new THREE.GridHelper(2000, 40, 0x333333, 0x222222);
        this.scene.add(gridHelper);

        // Lights
        this.ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(this.ambient);

        this.dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.dirLight.position.set(300, 600, 200);
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.width = 2048;
        this.dirLight.shadow.mapSize.height = 2048;
        this.scene.add(this.dirLight);

        this.fillLight = new THREE.DirectionalLight(0x4f8eff, 0.3);
        this.fillLight.position.set(-300, 400, -200);
        this.scene.add(this.fillLight);

        // Orbit Controls
        if (THREE.OrbitControls) {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.maxPolarAngle = Math.PI; // Allow free rotation
            this.controls.addEventListener('change', () => this.render());
        }

        this.setupSelection();

        // Setup CubeCamera for real-time mirror reflections
        if (THREE.WebGLCubeRenderTarget && THREE.CubeCamera) {
            this.cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
                format: THREE.RGBFormat,
                generateMipmaps: true,
                minFilter: THREE.LinearMipmapLinearFilter
            });
            this.cubeCamera = new THREE.CubeCamera(1, 100000, this.cubeRenderTarget);
            this.scene.add(this.cubeCamera);
        }

        this.resize();

        // Attach UI buttons
        const btnToggleLight = document.getElementById('btnToggleLight');
        if (btnToggleLight) {
            btnToggleLight.addEventListener('click', () => {
                this.isNight = !this.isNight;
                if (this.isNight) {
                    this.renderer.setClearColor(0x050510, 1);
                    this.ambient.intensity = 0.1;
                    this.dirLight.intensity = 0.2;
                    this.fillLight.intensity = 0.5; // moonlight
                    this.fillLight.color.setHex(0x2244ff);
                } else {
                    this.renderer.setClearColor(0x10141d, 1);
                    this.ambient.intensity = 0.6;
                    this.dirLight.intensity = 0.8;
                    this.fillLight.intensity = 0.3;
                    this.fillLight.color.setHex(0x4f8eff);
                }

                // Toggle lamps and lightNodes
                this.scene.traverse((child) => {
                    if (child.name === "lampLight" || (child.userData && child.userData.type === 'lightNode')) {
                        const baseIntensity = child.userData && child.userData.intensity ? child.userData.intensity : 1.0;
                        child.intensity = this.isNight ? baseIntensity * 1.5 : 0;
                    }
                });

                this.render();
            });
        }

        // Attach UI buttons
        if (UIElems.btnCamTop) UIElems.btnCamTop.addEventListener('click', () => {
            this.camera.position.set(0, 1000, 0);
            this.camera.lookAt(0, 0, 0);
        });
        if (UIElems.btnCamIso) UIElems.btnCamIso.addEventListener('click', () => {
            this.camera.position.set(-500, 500, 500);
            this.camera.lookAt(0, 0, 0);
        });

        // Walkthrough Controls
        if (THREE.PointerLockControls) {
            this.walkControls = new THREE.PointerLockControls(this.camera, document.body);

            this.walkControls.addEventListener('lock', () => {
                const ms = document.getElementById('mode3DStatus');
                if (ms) ms.textContent = "(Walk Mode: WASD, Esc to exit)";
            });
            this.walkControls.addEventListener('unlock', () => {
                this.isWalkthrough = false;
                const ms = document.getElementById('mode3DStatus');
                if (ms) ms.textContent = "(Orbit Controls)";
                this.camera.position.set(-500, 500, 500);
                this.camera.lookAt(0, 0, 0);
                if (this.controls) this.controls.enabled = true;
                cancelAnimationFrame(this.walkReq);
                this.render();
            });

            this.keys = { w: false, a: false, s: false, d: false };
            document.addEventListener('keydown', (e) => {
                if (this.isWalkthrough) {
                    if (e.key === 'w' || e.key === 'W') this.keys.w = true;
                    if (e.key === 'a' || e.key === 'A') this.keys.a = true;
                    if (e.key === 's' || e.key === 'S') this.keys.s = true;
                    if (e.key === 'd' || e.key === 'D') this.keys.d = true;
                }
            });
            document.addEventListener('keyup', (e) => {
                if (this.isWalkthrough) {
                    if (e.key === 'w' || e.key === 'W') this.keys.w = false;
                    if (e.key === 'a' || e.key === 'A') this.keys.a = false;
                    if (e.key === 's' || e.key === 'S') this.keys.s = false;
                    if (e.key === 'd' || e.key === 'D') this.keys.d = false;
                }
            });
        }
    },

    resize() {
        if (!this.container || !this.renderer) return;
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        this.renderer.setSize(w, h);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.render();
    },

    toggleWalkthrough() {
        if (!this.walkControls) return;
        this.isWalkthrough = !this.isWalkthrough;
        if (this.isWalkthrough) {
            if (this.controls) this.controls.enabled = false;
            // Position camera inside room roughly
            this.camera.position.set(0, 170, 0); // eye level 1.7m
            this.camera.lookAt(0, 170, 100);
            this.walkControls.lock();
            this.lastTime = performance.now();
            this.updateWalk();
        } else {
            this.walkControls.unlock();
        }
    },

    updateWalk() {
        if (!this.isWalkthrough) return;
        this.walkReq = requestAnimationFrame(() => this.updateWalk());

        const time = performance.now();
        const delta = (time - this.lastTime) / 1000;
        this.lastTime = time;

        const speed = 400.0 * delta; // cm per sec

        if (this.keys.w) this.walkControls.moveForward(speed);
        if (this.keys.s) this.walkControls.moveForward(-speed);
        if (this.keys.a) this.walkControls.moveRight(-speed);
        if (this.keys.d) this.walkControls.moveRight(speed);

        // Lock Y position
        this.camera.position.y = 170;

        this.renderer.render(this.scene, this.camera);
    },

    updateSunPath(time) {
        // time is 6.0 to 20.0
        const t = (time - 6) / (20 - 6); // 0 to 1
        const angle = Math.PI * t; // 0 to PI

        // Hemisphere radius
        const r = 1000;
        const x = Math.cos(angle) * r; // sunrise = +1000, sunset = -1000
        const y = Math.max(10, Math.sin(angle) * r);
        const z = 300 * Math.sin(angle);

        if (this.dirLight) {
            this.dirLight.position.set(-x, y, z);

            let rC = 1.0, gC = 1.0, bC = 1.0;
            let intensity = 0.8;

            if (time < 8) {
                const rt = (time - 6) / 2; // 0 to 1
                rC = 1.0; gC = 0.6 + 0.4 * rt; bC = 0.2 + 0.8 * rt;
                intensity = 0.2 + 0.6 * rt;
            } else if (time > 18) {
                const rt = (20 - time) / 2; // 0 to 1
                rC = 1.0; gC = 0.6 + 0.4 * rt; bC = 0.2 + 0.8 * rt;
                intensity = 0.2 + 0.6 * rt;
            }

            this.dirLight.color.setRGB(rC, gC, bC);
            this.dirLight.intensity = intensity;
        }

        if (this.ambient) {
            this.ambient.intensity = 0.3 + 0.4 * Math.sin(angle);
        }

        if (this.renderer) {
            const darkSky = new THREE.Color(0x050510);
            const noonSky = new THREE.Color(0x87CEEB);
            const sunsetSky = new THREE.Color(0xff8c42);
            let sky = new THREE.Color();

            if (time < 7) {
                sky.lerpColors(darkSky, sunsetSky, time - 6);
            } else if (time < 9) {
                sky.lerpColors(sunsetSky, noonSky, (time - 7) / 2);
            } else if (time < 17) {
                sky = noonSky;
            } else if (time < 19) {
                sky.lerpColors(noonSky, sunsetSky, (time - 17) / 2);
            } else {
                sky.lerpColors(sunsetSky, darkSky, time - 19);
            }
            this.renderer.setClearColor(sky, 1);
        }

        // Toggle lamps based on time
        const shouldBeNight = (time < 7.5 || time > 18.5);
        this.isNight = shouldBeNight;
        this.scene.traverse((child) => {
            if (child.name === "lampLight" || (child.userData && child.userData.type === 'lightNode')) {
                const baseIntensity = child.userData && child.userData.intensity ? child.userData.intensity : 1.0;
                child.intensity = shouldBeNight ? baseIntensity * 1.5 : 0;
            }
        });

        this.render();
    },

    getMaterial(type, baseColor) {
        const key = `${type}_${baseColor}`;
        if (this.materialsCache[key]) return this.materialsCache[key];

        // If using a texture map, the base material color must be white to avoid darkening the texture.
        const matColor = (type === 'none') ? baseColor : '#ffffff';
        const mat = new THREE.MeshStandardMaterial({ color: matColor, roughness: 0.8 });

        if (type === 'wood') {
            mat.map = this.createPatternTexture('wood', baseColor);
            mat.roughness = 0.6;
        } else if (type === 'brick') {
            mat.map = this.createPatternTexture('brick', baseColor);
            mat.roughness = 0.9;
        } else if (type === 'concrete') {
            mat.map = this.createPatternTexture('concrete', baseColor);
            mat.roughness = 0.8;
            mat.bumpMap = mat.map;
            mat.bumpScale = 0.05;
        } else if (type === 'tiles') {
            mat.map = this.createPatternTexture('tiles', baseColor);
            mat.roughness = 0.2; // shiny
        } else if (type === 'carpet') {
            mat.map = this.createPatternTexture('carpet', baseColor);
            mat.roughness = 1.0;
        } else if (type === 'grass') {
            mat.map = this.createPatternTexture('grass', baseColor);
            mat.roughness = 0.9;
        } else if (type === 'paving') {
            mat.map = this.createPatternTexture('paving', baseColor);
            mat.roughness = 0.8;
            mat.bumpMap = mat.map;
            mat.bumpScale = 0.1;
        } else if (type === 'dirt') {
            mat.map = this.createPatternTexture('dirt', baseColor);
            mat.roughness = 1.0;
        } else if (type === 'water') {
            mat.map = this.createPatternTexture('water', baseColor);
            mat.transparent = true;
            mat.opacity = 0.85;
            mat.roughness = 0.05; // reflective
            mat.metalness = 0.1;
        } else if (type === 'mirror') {
            mat.roughness = 0.0;
            mat.metalness = 1.0;
            mat.color.setHex(0xffffff);
            if (this.cubeRenderTarget) {
                mat.envMap = this.cubeRenderTarget.texture;
                mat.envMapIntensity = 1.0;
            }
        }

        this.materialsCache[key] = mat;
        return mat;
    },

    createPatternTexture(type, colorStr) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = colorStr;
        ctx.fillRect(0, 0, 256, 256);

        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 2;

        if (type === 'brick') {
            for (let y = 0; y < 256; y += 32) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(256, y);
                ctx.stroke();
                const offset = (y / 32) % 2 === 0 ? 0 : 32;
                for (let x = offset; x < 256 + offset; x += 64) {
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x, y + 32);
                    ctx.stroke();
                }
            }
        } else if (type === 'tiles') {
            for (let y = 0; y <= 256; y += 64) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
            }
            for (let x = 0; x <= 256; x += 64) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke();
            }
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.fillRect(0, 0, 64, 64);
            ctx.fillRect(128, 128, 64, 64);
        } else if (type === 'wood') {
            ctx.strokeStyle = 'rgba(0,0,0,0.05)';
            for (let i = 0; i < 100; i++) {
                ctx.beginPath();
                let x = Math.random() * 256;
                ctx.moveTo(x, 0);
                ctx.bezierCurveTo(x + Math.random() * 20, 100, x - Math.random() * 20, 200, x, 256);
                ctx.stroke();
            }
        } else if (type === 'carpet' || type === 'concrete') {
            // generic noise
            const imgData = ctx.getImageData(0, 0, 256, 256);
            for (let i = 0; i < imgData.data.length; i += 4) {
                const noise = (Math.random() - 0.5) * 30; // +/- 15
                imgData.data[i] = Math.min(255, Math.max(0, imgData.data[i] + noise));
                imgData.data[i + 1] = Math.min(255, Math.max(0, imgData.data[i + 1] + noise));
                imgData.data[i + 2] = Math.min(255, Math.max(0, imgData.data[i + 2] + noise));
            }
            ctx.putImageData(imgData, 0, 0);
        } else if (type === 'grass') {
            // noise + blades of grass
            const imgData = ctx.getImageData(0, 0, 256, 256);
            for (let i = 0; i < imgData.data.length; i += 4) {
                const noise = (Math.random() - 0.5) * 40;
                imgData.data[i] = Math.min(255, Math.max(0, imgData.data[i] + noise));
                imgData.data[i + 1] = Math.min(255, Math.max(0, imgData.data[i + 1] + noise * 1.5));
                imgData.data[i + 2] = Math.min(255, Math.max(0, imgData.data[i + 2] + noise));
            }
            ctx.putImageData(imgData, 0, 0);

            for (let i = 0; i < 3000; i++) {
                let x = Math.random() * 256;
                let y = Math.random() * 256;
                let len = 4 + Math.random() * 8;
                let ang = (Math.random() - 0.5) * Math.PI / 3;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + Math.sin(ang) * len, y - Math.cos(ang) * len);
                ctx.strokeStyle = `rgba(34, 139, 34, ${0.3 + Math.random() * 0.5})`;
                ctx.lineWidth = 1 + Math.random();
                ctx.stroke();
            }
        } else if (type === 'dirt') {
            // Clumped soil
            for (let i = 0; i < 400; i++) {
                let x = Math.random() * 256;
                let y = Math.random() * 256;
                let r = 2 + Math.random() * 12;
                let light = Math.random() > 0.5;
                ctx.fillStyle = `rgba(${light ? '255,255,255' : '0,0,0'}, ${Math.random() * 0.15})`;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
            }
            const imgData = ctx.getImageData(0, 0, 256, 256);
            for (let i = 0; i < imgData.data.length; i += 4) {
                const noise = (Math.random() - 0.5) * 35;
                imgData.data[i] = Math.min(255, Math.max(0, imgData.data[i] + noise));
                imgData.data[i + 1] = Math.min(255, Math.max(0, imgData.data[i + 1] + noise * 0.9));
                imgData.data[i + 2] = Math.min(255, Math.max(0, imgData.data[i + 2] + noise * 0.8));
            }
            ctx.putImageData(imgData, 0, 0);
        } else if (type === 'paving') {
            // Staggered paving stones
            const blockW = 64;
            const blockH = 32;
            for (let y = 0; y < 256; y += blockH) {
                let offset = (y / blockH) % 2 === 0 ? 0 : blockW / 2;
                for (let x = -blockW; x < 256; x += blockW) {
                    const shade = Math.random() * 60 - 30;
                    ctx.fillStyle = `rgba(${(shade > 0 ? 255 : 0)},${(shade > 0 ? 255 : 0)},${(shade > 0 ? 255 : 0)}, ${Math.abs(shade) / 255})`;
                    ctx.fillRect(x + offset, y, blockW, blockH);

                    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(x + offset, y, blockW, blockH);
                }
            }
            const imgData = ctx.getImageData(0, 0, 256, 256);
            for (let i = 0; i < imgData.data.length; i += 4) {
                const noise = (Math.random() - 0.5) * 20;
                imgData.data[i] = Math.min(255, Math.max(0, imgData.data[i] + noise));
                imgData.data[i + 1] = Math.min(255, Math.max(0, imgData.data[i + 1] + noise));
                imgData.data[i + 2] = Math.min(255, Math.max(0, imgData.data[i + 2] + noise));
            }
            ctx.putImageData(imgData, 0, 0);
        } else if (type === 'water') {
            for (let i = 0; i < 50; i++) {
                let x = Math.random() * 256;
                let y = Math.random() * 256;
                let r = 10 + Math.random() * 40;
                let grad = ctx.createRadialGradient(x, y, r * 0.3, x, y, r);
                grad.addColorStop(0, 'rgba(255,255,255, 0)');
                grad.addColorStop(0.5, 'rgba(255,255,255, 0.4)');
                grad.addColorStop(1, 'rgba(255,255,255, 0)');

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(1 / 100, 1 / 100);
        tex.needsUpdate = true;
        return tex;
    },

    setupSelection() {
        let isDragging = false;
        this.renderer.domElement.addEventListener('mousedown', () => isDragging = false);
        this.renderer.domElement.addEventListener('mousemove', () => isDragging = true);

        this.renderer.domElement.addEventListener('click', (e) => {
            if (isDragging) return; // Orbiting
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.interactableMeshes, true);

            if (intersects.length > 0) {
                // Find root object that contains userData.id
                let object = intersects[0].object;
                while (object && (!object.userData || !object.userData.id)) {
                    object = object.parent;
                }

                if (object && object.userData.id) {
                    const elData = STATE.elements.find(el => el.id === object.userData.id);
                    if (elData && window.selectElement) {
                        selectElement(elData);
                        if (window.Editor2D) Editor2D.needsRedraw = true;
                    }
                }
            } else {
                if (window.selectElement) selectElement(null);
            }
        });
    },

    buildScene(elements) {
        // Clear old
        this.meshes.forEach(m => {
            this.scene.remove(m);
            if (m.geometry) m.geometry.dispose();
            if (m.material) {
                if (Array.isArray(m.material)) m.material.forEach(mat => mat.dispose());
                else m.material.dispose();
            }
        });
        this.meshes = [];

        // Rebuild
        if (window.STATE && STATE.blueprintImage) {
            this.buildBlueprintPlane();
        }

        this.interactableMeshes = [];

        this.buildTerrain(elements);

        elements.forEach(el => {
            if (el.type === 'wall') this.buildWall(el, elements);
            else if (el.type === 'floor') this.buildFloor(el);
            else if (el.type === 'roof') this.buildRoof(el);
            else if (el.type === 'door' || el.type === 'window') this.buildOpening(el, elements);
            else if (el.type === 'furniture') this.buildFurniture(el);
            else if (el.type === 'lightNode') this.buildLight(el);
        });

        this.render();
    },

    buildTerrain(elements) {
        const splats = elements.filter(e => e.type === 'terrainSplat');
        if (splats.length === 0) return; // No sculpted terrain

        // Create a high-res plane for terrain
        const size = 6000;
        const segments = 120; // 50cm per triangle roughly
        const geo = new THREE.PlaneGeometry(size, size, segments, segments);
        geo.rotateX(-Math.PI / 2);

        const posAttribute = geo.attributes.position;
        const v = new THREE.Vector3();

        // Add vertex colors
        const colorAttribute = new THREE.BufferAttribute(new Float32Array(posAttribute.count * 3), 3);
        const baseColor = new THREE.Color('#34d399'); // Default grass green

        for (let i = 0; i < posAttribute.count; i++) {
            v.fromBufferAttribute(posAttribute, i);
            let elevation = 0;

            let r = baseColor.r;
            let g = baseColor.g;
            let b = baseColor.b;

            let totalColorInfluence = 0;

            splats.forEach(s => {
                const dist = Math.hypot(v.x - s.x, v.z - s.y);
                if (dist < s.radius) {
                    const influence = (Math.cos(Math.PI * (dist / s.radius)) + 1) / 2;
                    elevation += s.force * influence;

                    if (s.color) {
                        const sColor = new THREE.Color(s.color);
                        r = r * (1 - influence) + sColor.r * influence;
                        g = g * (1 - influence) + sColor.g * influence;
                        b = b * (1 - influence) + sColor.b * influence;
                    }
                }
            });

            v.y += elevation;
            posAttribute.setXYZ(i, v.x, v.y, v.z);
            colorAttribute.setXYZ(i, r, g, b);
        }

        geo.setAttribute('color', colorAttribute);
        geo.computeVertexNormals();

        const mat = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.9,
            metalness: 0.05,
            flatShading: true
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = -0.5;
        mesh.receiveShadow = true;

        this.scene.add(mesh);
        this.meshes.push(mesh);
    },

    buildBlueprintPlane() {
        const img = STATE.blueprintImage;
        const tex = new THREE.CanvasTexture(img);

        const geo = new THREE.PlaneGeometry(img.width, img.height);
        const mat = new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = -1; // just below the grid

        this.scene.add(mesh);
        this.meshes.push(mesh);
    },

    buildWall(wall, allElements) {
        const len = wall.length;
        const h = wall.height;
        const th = wall.thick;

        if (wall.curvature) {
            // Curved Wall: Extrude a cross-section along a Bezier path
            const shape = new THREE.Shape();
            shape.moveTo(-th / 2, 0);
            shape.lineTo(th / 2, 0);
            shape.lineTo(th / 2, h);
            shape.lineTo(-th / 2, h);
            shape.lineTo(-th / 2, 0);

            // To rotate the resulting geometry without misplacing the wall in world space,
            // we must build the curve relative to the wall's center, not absolute world coords.
            const cx = (wall.x1 + wall.x2) / 2;
            const cy = (wall.y1 + wall.y2) / 2;

            // Local coordinates relative to center
            const lx1 = wall.x1 - cx;
            const ly1 = wall.y1 - cy;
            const lx2 = wall.x2 - cx;
            const ly2 = wall.y2 - cy;

            // Build curve on XZ plane (horizontal)
            const p0 = new THREE.Vector3(lx1, 0, ly1);
            const p2 = new THREE.Vector3(lx2, 0, ly2);
            const angle = Math.atan2(ly2 - ly1, lx2 - lx1);
            const nx = Math.cos(angle - Math.PI / 2);
            const ny = Math.sin(angle - Math.PI / 2);

            // CP is pushed out along normal from the center (which is 0,0)
            const cpX = nx * (wall.curvature * 2);
            const cpZ = ny * (wall.curvature * 2);
            const cp = new THREE.Vector3(cpX, 0, cpZ);

            const curve = new THREE.QuadraticBezierCurve3(p0, cp, p2);

            // Force the extrusion 'up' vector to be exactly Y (0,1,0) to prevent the wall from lying flat
            curve.computeFrenetFrames = function (segments, closed) {
                const tangent = new THREE.Vector3();
                const normal = new THREE.Vector3();
                const binormal = new THREE.Vector3();
                const tangents = [];
                const normals = [];
                const binormals = [];
                for (let i = 0; i <= segments; i++) {
                    let u = i / segments;
                    curve.getTangentAt(u, tangent);
                    tangent.normalize();

                    binormal.set(0, 1, 0); // Up is Y
                    normal.crossVectors(tangent, binormal).normalize();

                    tangents.push(tangent.clone());
                    normals.push(normal.clone());
                    binormals.push(binormal.clone());
                }
                return { tangents: tangents, normals: normals, binormals: binormals };
            };

            const extrudeSettings = {
                steps: 20,
                bevelEnabled: false,
                extrudePath: curve
            };

            const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);

            const mat = this.getMaterial(wall.material || 'none', wall.color);
            const mesh = new THREE.Mesh(geo, mat);

            mesh.castShadow = true;
            mesh.receiveShadow = true;

            // Mesh is centered at origin. We position it back to (cx, baseY, cy)
            const baseY = (wall.floor || 0) * (STATE.globWallHeight || 280);
            mesh.position.set(cx, baseY, cy);

            // invisible hitbox approx
            mesh.userData = { id: wall.id };

            this.scene.add(mesh);
            this.meshes.push(mesh);
            return; // Skip normal straight wall logic
        }

        // Create 2D Shape of the wall surface (length x height)
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(len, 0);
        shape.lineTo(len, h);
        shape.lineTo(0, h);
        shape.lineTo(0, 0);

        // Punch holes for windows and doors attached to this wall
        const holes = allElements.filter(e => (e.type === 'door' || e.type === 'window') && e.wallId === wall.id);
        holes.forEach(hole => {
            const hw = hole.length;
            const hh = hole.height;
            const hx = hole.t * len - hw / 2;
            const hy = hole.elevation || 0;

            const p = new THREE.Path();
            p.moveTo(hx, hy);
            p.lineTo(hx + hw, hy);
            p.lineTo(hx + hw, hy + hh);
            p.lineTo(hx, hy + hh);
            p.lineTo(hx, hy);
            shape.holes.push(p);
        });

        const extrudeSettings = { depth: th, bevelEnabled: false };
        const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);

        // Center the geometry origin to facilitate rotation
        geo.translate(0, 0, -th / 2);

        // Apply custom texture or color
        const mat = this.getMaterial(wall.material || 'none', wall.color);

        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Position and Rotate in 3D world
        // In 2D canvas, Y goes DOWN. In 3D, Z goes BACK. Y goes UP.
        // So 2D (x, y) -> 3D (x, 0, y)
        const baseY = (wall.floor || 0) * (STATE.globWallHeight || 280);
        mesh.position.set(wall.x1, baseY, wall.y1);

        const angle = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1);
        mesh.rotation.y = -angle; // invert because 3D Y rotation goes counter-clockwise

        this.scene.add(mesh);
        this.meshes.push(mesh);
    },

    buildOpening(op, allElements) {
        const wall = allElements.find(w => w.id === op.wallId);
        if (!wall) return;

        const cx = wall.x1 + op.t * (wall.x2 - wall.x1);
        const cy = wall.y1 + op.t * (wall.y2 - wall.y1);
        const angle = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1);
        const elevation = op.elevation || 0;

        const group = new THREE.Group();
        const thickness = wall.thick + 4; // slightly thicker than wall

        const frameColor = op.color || (op.type === 'window' ? '#aaaaaa' : '#8B5A2B');
        const frameMat = new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.8 });

        const isGlass = op.type === 'window';
        const fillMat = isGlass ?
            new THREE.MeshStandardMaterial({ color: '#88ccff', roughness: 0.1, metalness: 0.8, transparent: true, opacity: 0.5 })
            : new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.7 });

        // Outer Frame
        const frameThickness = 4;
        const topFrame = new THREE.Mesh(new THREE.BoxGeometry(op.length, frameThickness, thickness), frameMat);
        topFrame.position.y = op.height - frameThickness / 2;
        const bottomFrame = new THREE.Mesh(new THREE.BoxGeometry(op.length, frameThickness, thickness), frameMat);
        bottomFrame.position.y = frameThickness / 2;
        const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, op.height, thickness), frameMat);
        leftFrame.position.set(-op.length / 2 + frameThickness / 2, op.height / 2, 0);
        const rightFrame = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, op.height, thickness), frameMat);
        rightFrame.position.set(op.length / 2 - frameThickness / 2, op.height / 2, 0);

        group.add(topFrame, bottomFrame, leftFrame, rightFrame);

        // Inner pieces based on variant
        const innerW = op.length - frameThickness * 2;
        const innerH = op.height - frameThickness * 2;

        if (op.modelVariant === 'double') {
            // Central mullion
            const centerMullion = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, innerH, thickness), frameMat);
            centerMullion.position.y = op.height / 2;
            group.add(centerMullion);

            // Two panes/doors
            const paneW = (innerW - frameThickness) / 2;
            const leftPane = new THREE.Mesh(new THREE.BoxGeometry(paneW, innerH, isGlass ? 2 : thickness - 2), fillMat);
            leftPane.position.set(-paneW / 2 - frameThickness / 2, op.height / 2, 0);
            const rightPane = new THREE.Mesh(new THREE.BoxGeometry(paneW, innerH, isGlass ? 2 : thickness - 2), fillMat);
            rightPane.position.set(paneW / 2 + frameThickness / 2, op.height / 2, 0);
            group.add(leftPane, rightPane);
        } else if (op.modelVariant === 'sliding') {
            const paneW = innerW / 2 + frameThickness; // slight overlap
            const backPane = new THREE.Mesh(new THREE.BoxGeometry(paneW, innerH, isGlass ? 2 : thickness / 2), fillMat);
            backPane.position.set(-innerW / 4, op.height / 2, -2);

            // Frame around sliding pane
            const slideFrame = new THREE.Mesh(new THREE.BoxGeometry(paneW, innerH, thickness / 2), frameMat);
            slideFrame.position.set(innerW / 4, op.height / 2, 2);
            const frontPane = new THREE.Mesh(new THREE.BoxGeometry(paneW - 4, innerH - 4, isGlass ? 2.5 : thickness / 2 + 0.5), fillMat);
            frontPane.position.set(innerW / 4, op.height / 2, 2);

            group.add(backPane, slideFrame, frontPane);
        } else {
            // Single
            const singlePane = new THREE.Mesh(new THREE.BoxGeometry(innerW, innerH, isGlass ? 2 : thickness - 2), fillMat);
            singlePane.position.y = op.height / 2;
            group.add(singlePane);
        }

        // Invisible interaction box
        const hitGeo = new THREE.BoxGeometry(op.length, op.height, thickness);
        const hitMat = new THREE.MeshBasicMaterial({ visible: false });
        const hitBox = new THREE.Mesh(hitGeo, hitMat);
        hitBox.position.y = op.height / 2;
        group.add(hitBox);

        const baseY = (op.floor || 0) * (STATE.globWallHeight || 280);
        group.position.set(cx, baseY + elevation, cy);
        group.rotation.y = -angle;

        // Ensure shadows
        group.children.forEach(c => {
            if (c.material !== hitMat) {
                c.castShadow = true;
                c.receiveShadow = true;
            }
        });

        // Setup interaction
        group.userData = { id: op.id };
        hitBox.userData = { id: op.id };

        this.scene.add(group);
        this.meshes.push(group);
        this.interactableMeshes.push(hitBox);
    },

    buildFloor(floor) {
        const geo = new THREE.BoxGeometry(floor.width, 10, floor.height);
        geo.translate(floor.width / 2, -5, floor.height / 2); // Origin to top-left corner

        // Transform normalized [0,1] UVs to world-space sizes
        if (geo.attributes.uv) {
            const uv = geo.attributes.uv;
            const pos = geo.attributes.position;
            for (let i = 0; i < uv.count; i++) {
                const x = pos.getX(i);
                const y = pos.getY(i);
                const z = pos.getZ(i);
                if (Math.abs(y) > 0.1) {
                    uv.setXY(i, x, z); // Top/Bottom faces
                } else if (x < 0.1 || x > floor.width - 0.1) {
                    uv.setXY(i, z, y); // Side faces along Z
                } else {
                    uv.setXY(i, x, y); // Side faces along X
                }
            }
            uv.needsUpdate = true;
        }

        const mat = this.getMaterial(floor.material || 'none', floor.color);
        const mesh = new THREE.Mesh(geo, mat);

        const baseY = (floor.floor || 0) * (STATE.globWallHeight || 280);
        mesh.position.set(floor.x, baseY, floor.y);
        mesh.receiveShadow = true;
        mesh.userData = { id: floor.id };

        this.scene.add(mesh);
        this.meshes.push(mesh);
        this.interactableMeshes.push(mesh);
    },

    buildRoof(roof) {
        let geo;

        if (roof.modelVariant === 'flat') {
            geo = new THREE.BoxGeometry(roof.width, 20, roof.height);
        } else if (roof.modelVariant === 'hipped' || roof.modelVariant === 'gabled' || !roof.modelVariant) {
            geo = new THREE.BufferGeometry();
            const w = roof.width;
            const d = roof.height;
            const inset = Math.min(w, d) / 2;
            const h = inset; // 45-degree pitch
            const isGabled = (roof.modelVariant === 'gabled' || !roof.modelVariant);

            const v = [];
            // Base vertices
            v.push(-w / 2, 0, -d / 2); // 0: NW
            v.push(w / 2, 0, -d / 2);  // 1: NE
            v.push(w / 2, 0, d / 2);   // 2: SE
            v.push(-w / 2, 0, d / 2);  // 3: SW

            const indices = [];
            if (w >= d) {
                // Ridge along X
                const insetX = isGabled ? 0 : inset;
                v.push(-w / 2 + insetX, h, 0); // 4: W ridge
                v.push(w / 2 - insetX, h, 0);  // 5: E ridge
                indices.push(
                    0, 4, 5, 0, 5, 1, // North
                    1, 5, 2,            // East
                    2, 5, 4, 2, 4, 3, // South
                    3, 4, 0             // West
                );
            } else {
                // Ridge along Z
                const insetZ = isGabled ? 0 : inset;
                v.push(0, h, -d / 2 + insetZ); // 4: N ridge
                v.push(0, h, d / 2 - insetZ);  // 5: S ridge
                indices.push(
                    0, 4, 1,            // North
                    1, 4, 5, 1, 5, 2, // East
                    2, 5, 3,            // South
                    3, 5, 4, 3, 4, 0  // West
                );
            }

            geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
            geo.setIndex(indices);
            geo.computeVertexNormals();

            // Setup UVs based on X/Z coordinates
            const uvs = [];
            for (let i = 0; i < v.length; i += 3) {
                uvs.push(v[i] + w / 2, v[i + 2] + d / 2);
            }
            geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        } else if (roof.modelVariant === 'complex_tent') {
            geo = new THREE.BufferGeometry();
            const poly = roof.polygon;

            let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
            poly.forEach(p => {
                minX = Math.min(minX, p.x); minZ = Math.min(minZ, p.y);
                maxX = Math.max(maxX, p.x); maxZ = Math.max(maxZ, p.y);
            });
            const rcx = (minX + maxX) / 2;
            const rcz = (minZ + maxZ) / 2;

            const w = maxX - minX;
            const d = maxZ - minZ;
            const peakH = Math.min(w, d) / 2; // 45 degree pitch 

            const v = [];
            const uvs = [];
            const peakIdx = poly.length;

            for (let i = 0; i < poly.length; i++) {
                v.push(poly[i].x - rcx, 0, poly[i].y - rcz);
                uvs.push(poly[i].x, poly[i].y);
            }
            v.push(0, peakH, 0); // Peak
            uvs.push(rcx, rcz);

            const indices = [];
            for (let i = 0; i < poly.length; i++) {
                const nextI = (i + 1) % poly.length;
                // Add both windings to ensure visibility regardless of array order
                indices.push(i, nextI, peakIdx);
                indices.push(nextI, i, peakIdx);
            }
            geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
            geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            geo.setIndex(indices);
            geo.computeVertexNormals();
        }

        if (roof.modelVariant === 'flat') {
            if (geo.attributes.uv) {
                const uv = geo.attributes.uv;
                for (let i = 0; i < uv.count; i++) {
                    uv.setXY(i, uv.getX(i) * roof.width, uv.getY(i) * Math.max(roof.height, 100));
                }
                uv.needsUpdate = true;
            }
        }

        const mat = this.getMaterial(roof.material || 'none', roof.color);
        // Force double side for roof
        mat.side = THREE.DoubleSide;
        const mesh = new THREE.Mesh(geo, mat);

        // Calculate center for positioning
        let cx, cy;
        if (roof.polygon) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            roof.polygon.forEach(p => {
                minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
            });
            cx = (minX + maxX) / 2;
            cy = (minY + maxY) / 2;
        } else {
            cx = roof.x + roof.width / 2;
            cy = roof.y + roof.height / 2;
        }

        const h = roof.elevation !== undefined ? roof.elevation : STATE.globWallHeight;
        const baseY = (roof.floor || 0) * (STATE.globWallHeight || 280);

        mesh.position.set(cx, baseY + h, cy);
        mesh.rotation.y = -(roof.rotation || 0) * Math.PI / 180;
        mesh.castShadow = true;
        mesh.userData = { id: roof.id };

        this.scene.add(mesh);
        this.meshes.push(mesh);
        this.interactableMeshes.push(mesh);
    },

    buildFurniture(fur) {
        let geo, mat;
        let h = 0;
        const group = new THREE.Group();

        const baseColor = fur.color || '#8B4513';
        const primaryMat = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.7 });
        const secondaryMat = new THREE.MeshStandardMaterial({ color: '#dddddd', roughness: 0.9 }); // fabric/white
        const accentMat = new THREE.MeshStandardMaterial({ color: '#222222', roughness: 0.4 }); // dark/metal/screen

        if (fur.modelVariant === 'table') {
            h = 80;
            // Top
            geo = new THREE.BoxGeometry(fur.width, 5, fur.length);
            let top = new THREE.Mesh(geo, primaryMat);
            top.position.y = 80 - 2.5;
            top.castShadow = true; top.receiveShadow = true;
            group.add(top);
            // Legs
            const lw = 6, inset = 10;
            const legGeo = new THREE.BoxGeometry(lw, 80, lw);
            const poses = [
                [-fur.width / 2 + inset, -fur.length / 2 + inset],
                [fur.width / 2 - inset, -fur.length / 2 + inset],
                [-fur.width / 2 + inset, fur.length / 2 - inset],
                [fur.width / 2 - inset, fur.length / 2 - inset]
            ];
            poses.forEach(pos => {
                let leg = new THREE.Mesh(legGeo, primaryMat);
                leg.position.set(pos[0], 40, pos[1]);
                leg.castShadow = true; leg.receiveShadow = true;
                group.add(leg);
            });
        }
        else if (fur.modelVariant === 'bed') {
            h = 50;
            // Frame
            let frame = new THREE.Mesh(new THREE.BoxGeometry(fur.width, 20, fur.length), primaryMat);
            frame.position.y = 10;
            // Headboard
            let headboard = new THREE.Mesh(new THREE.BoxGeometry(fur.width, 100, 10), primaryMat);
            headboard.position.set(0, 50, -fur.length / 2 + 5);
            // Mattress
            let mattress = new THREE.Mesh(new THREE.BoxGeometry(fur.width - 4, 20, fur.length - 14), secondaryMat);
            mattress.position.set(0, 30, 5);
            // Pillows
            let pillowGeo = new THREE.BoxGeometry(fur.width / 2 - 10, 8, 30);
            let p1 = new THREE.Mesh(pillowGeo, secondaryMat);
            p1.position.set(-fur.width / 4, 44, -fur.length / 2 + 30);
            let p2 = new THREE.Mesh(pillowGeo, secondaryMat);
            p2.position.set(fur.width / 4, 44, -fur.length / 2 + 30);

            [frame, headboard, mattress, p1, p2].forEach(m => { m.castShadow = true; m.receiveShadow = true; group.add(m); });
        }
        else if (fur.modelVariant === 'sofa') {
            h = 80;
            // Base/Seat
            let seat = new THREE.Mesh(new THREE.BoxGeometry(fur.width, 40, fur.length - 20), primaryMat);
            seat.position.set(0, 20, 10);
            // Backrest
            let back = new THREE.Mesh(new THREE.BoxGeometry(fur.width, 80, 20), primaryMat);
            back.position.set(0, 40, -fur.length / 2 + 10);
            // Armrests
            let leftArm = new THREE.Mesh(new THREE.BoxGeometry(20, 60, fur.length), primaryMat);
            leftArm.position.set(-fur.width / 2 + 10, 30, 0);
            let rightArm = new THREE.Mesh(new THREE.BoxGeometry(20, 60, fur.length), primaryMat);
            rightArm.position.set(fur.width / 2 - 10, 30, 0);

            [seat, back, leftArm, rightArm].forEach(m => { m.castShadow = true; m.receiveShadow = true; group.add(m); });
        }
        else if (fur.modelVariant === 'cabinet') {
            h = 200;
            // Main body
            let body = new THREE.Mesh(new THREE.BoxGeometry(fur.width, 200, fur.length), primaryMat);
            body.position.y = 100;
            // Doors (visual inset)
            let doors = new THREE.Mesh(new THREE.BoxGeometry(fur.width - 4, 190, 4), accentMat);
            doors.position.set(0, 100, fur.length / 2 + 1); // sticks out front slightly
            // Handles
            let h1 = new THREE.Mesh(new THREE.BoxGeometry(4, 30, 4), secondaryMat);
            h1.position.set(-5, 100, fur.length / 2 + 3);
            let h2 = new THREE.Mesh(new THREE.BoxGeometry(4, 30, 4), secondaryMat);
            h2.position.set(5, 100, fur.length / 2 + 3);

            [body, doors, h1, h2].forEach(m => { m.castShadow = true; m.receiveShadow = true; group.add(m); });
        }
        else if (fur.modelVariant === 'desk') {
            h = 75;
            // Top
            let top = new THREE.Mesh(new THREE.BoxGeometry(fur.width, 4, fur.length), primaryMat);
            top.position.y = 75 - 2;
            // Sides
            let sideL = new THREE.Mesh(new THREE.BoxGeometry(4, 75, fur.length), primaryMat);
            sideL.position.set(-fur.width / 2 + 2, 75 / 2, 0);
            let sideR = new THREE.Mesh(new THREE.BoxGeometry(4, 75, fur.length), primaryMat);
            sideR.position.set(fur.width / 2 - 2, 75 / 2, 0);
            // Modesty panel
            let back = new THREE.Mesh(new THREE.BoxGeometry(fur.width - 8, 50, 2), primaryMat);
            back.position.set(0, 50, -fur.length / 2 + 10);

            [top, sideL, sideR, back].forEach(m => { m.castShadow = true; m.receiveShadow = true; group.add(m); });
        }
        else if (fur.modelVariant === 'tv') {
            h = 100;
            let scrW = fur.width;
            let scrH = Math.max(60, fur.width * 0.6);
            let screen = new THREE.Mesh(new THREE.BoxGeometry(scrW, scrH, 6), accentMat);
            screen.position.y = 20 + scrH / 2;
            let standBase = new THREE.Mesh(new THREE.BoxGeometry(scrW * 0.4, 4, 30), secondaryMat);
            standBase.position.y = 2;
            let standNeck = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 20), secondaryMat);
            standNeck.position.y = 10;

            [screen, standBase, standNeck].forEach(m => { m.castShadow = true; group.add(m); });
        }
        else if (fur.modelVariant === 'bookshelf') {
            h = 200;
            // Frame
            let left = new THREE.Mesh(new THREE.BoxGeometry(4, 200, fur.length), primaryMat);
            left.position.set(-fur.width / 2 + 2, 100, 0);
            let right = new THREE.Mesh(new THREE.BoxGeometry(4, 200, fur.length), primaryMat);
            right.position.set(fur.width / 2 - 2, 100, 0);
            let back = new THREE.Mesh(new THREE.BoxGeometry(fur.width, 200, 2), primaryMat);
            back.position.set(0, 100, -fur.length / 2 + 1);
            group.add(left, right, back);

            // Shelves
            for (let sy = 10; sy < 200; sy += 40) {
                let shelf = new THREE.Mesh(new THREE.BoxGeometry(fur.width - 8, 4, fur.length - 4), primaryMat);
                shelf.position.set(0, sy, 2);
                group.add(shelf);
            }
        }
        else if (fur.modelVariant === 'plant') {
            h = fur.width;
            let pot = new THREE.Mesh(new THREE.CylinderGeometry(fur.width * 0.3, fur.width * 0.2, fur.width * 0.6), secondaryMat);
            pot.position.y = fur.width * 0.3;
            let leavesMat = new THREE.MeshStandardMaterial({ color: '#228B22', roughness: 0.8 });
            let leaves = new THREE.Mesh(new THREE.DodecahedronGeometry(fur.width * 0.4, 1), leavesMat);
            leaves.position.y = fur.width * 0.6 + fur.width * 0.3;
            [pot, leaves].forEach(m => { m.castShadow = true; group.add(m); });
        }
        else if (fur.modelVariant === 'lamp') {
            h = 160;
            // base
            let base = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 5), primaryMat);
            base.position.y = 2.5;
            // pole
            let pole = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 140), primaryMat);
            pole.position.y = 70;
            // shade
            let shadeMat = new THREE.MeshStandardMaterial({ color: '#ffffee', roughness: 0.2, emissive: '#444433' });
            let shade = new THREE.Mesh(new THREE.CylinderGeometry(10, 20, 30, 16, 1, true), shadeMat);
            shade.position.y = 145;

            [base, pole, shade].forEach(m => { m.castShadow = true; m.receiveShadow = true; group.add(m); });

            // LIGHT: Dynamic Point Light
            let pl = new THREE.PointLight(0xffefcc, this.isNight ? 1.5 : 0, 800);
            pl.position.y = 145;
            pl.castShadow = true;
            pl.name = "lampLight";
            // Reduce shadow map size for performance
            pl.shadow.mapSize.width = 512;
            pl.shadow.mapSize.height = 512;
            group.add(pl);
        }
        else if (fur.modelVariant === 'custom_glb' && fur.gltfData) {
            h = fur.height || 100;
            if (!this.gltfCache) this.gltfCache = {};

            if (this.gltfCache[fur.id]) {
                const model = this.gltfCache[fur.id].clone();
                group.add(model);
            } else {
                let tempMesh = new THREE.Mesh(new THREE.BoxGeometry(fur.width, h, fur.length), new THREE.MeshBasicMaterial({ color: 0x888888, wireframe: true }));
                tempMesh.position.y = h / 2;
                tempMesh.name = "tempBox";
                group.add(tempMesh);

                if (THREE.GLTFLoader) {
                    const loader = new THREE.GLTFLoader();
                    loader.load(fur.gltfData, (gltf) => {
                        const sceneModel = gltf.scene;
                        const box = new THREE.Box3().setFromObject(sceneModel);
                        const size = box.getSize(new THREE.Vector3());
                        let maxDim = Math.max(size.x, size.y, size.z);
                        let scale = maxDim > 0 ? (100 / maxDim) : 1;
                        sceneModel.scale.set(scale, scale, scale);

                        const centeredBox = new THREE.Box3().setFromObject(sceneModel);
                        sceneModel.position.y = -centeredBox.min.y;
                        sceneModel.position.x = -(centeredBox.max.x + centeredBox.min.x) / 2;
                        sceneModel.position.z = -(centeredBox.max.z + centeredBox.min.z) / 2;

                        sceneModel.traverse((child) => {
                            if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
                        });

                        this.gltfCache[fur.id] = sceneModel;

                        const actualModel = sceneModel.clone();
                        let tBox = group.getObjectByName("tempBox");
                        if (tBox) group.remove(tBox);
                        group.add(actualModel);
                        this.render();
                    }, undefined, (err) => console.error("GLTF Load Error:", err));
                }
            }
        }
        else { // chair fallback
            h = 90;
            let seat = new THREE.Mesh(new THREE.BoxGeometry(fur.width, 6, fur.length), primaryMat);
            seat.position.y = 45;
            let back = new THREE.Mesh(new THREE.BoxGeometry(fur.width, 45, 6), primaryMat);
            back.position.set(0, 45 + 22.5, -fur.length / 2 + 3);
            let legGeo = new THREE.BoxGeometry(4, 45, 4);
            [[-fur.width / 2 + 3, -fur.length / 2 + 3], [fur.width / 2 - 3, -fur.length / 2 + 3], [-fur.width / 2 + 3, fur.length / 2 - 3], [fur.width / 2 - 3, fur.length / 2 - 3]].forEach(p => {
                let leg = new THREE.Mesh(legGeo, primaryMat);
                leg.position.set(p[0], 22.5, p[1]);
                group.add(leg);
            });
            [seat, back].forEach(m => group.add(m));
        }

        // Add an invisible hitbox for raycasting to interact with the whole group easily
        const hitGeo = new THREE.BoxGeometry(fur.width, h, fur.length);
        const hitMat = new THREE.MeshBasicMaterial({ visible: false });
        const hitBox = new THREE.Mesh(hitGeo, hitMat);
        hitBox.position.y = h / 2;
        group.add(hitBox);

        const baseY = (fur.floor || 0) * (STATE.globWallHeight || 280);
        group.position.set(fur.x, baseY + (fur.elevation || 0), fur.y);
        group.rotation.y = -(fur.rotation || 0) * Math.PI / 180;

        // Setup userData for picking
        group.userData = { id: fur.id };
        hitBox.userData = { id: fur.id }; // ensures raycaster hitting this invisible box selects the root

        this.scene.add(group);
        this.meshes.push(group);
        this.interactableMeshes.push(hitBox); // Add hitbox specifically for raycasting interaction
    },

    buildLight(l) {
        const group = new THREE.Group();

        // Visual indicator (Bulb)
        const bulb = new THREE.Mesh(
            new THREE.SphereGeometry(8, 16, 16),
            new THREE.MeshStandardMaterial({
                color: l.color || 0xffefcc,
                emissive: l.color || 0xffefcc,
                emissiveIntensity: 0.5
            })
        );
        group.add(bulb);

        // Actual THREE Light
        const intensity = (l.intensity || 1.0) * (this.isNight ? 1.5 : 0.5);
        const pl = new THREE.PointLight(l.color || 0xffefcc, intensity, 1000);
        pl.castShadow = true;
        pl.shadow.mapSize.width = 512;
        pl.shadow.mapSize.height = 512;
        pl.userData = { type: 'lightNode', intensity: l.intensity || 1.0 };
        group.add(pl);

        const baseY = (l.floor || 0) * 280;
        group.position.set(l.x, baseY + (l.elevation || 250), l.y);

        group.userData = { id: l.id };

        this.scene.add(group);
        this.meshes.push(group);
        this.interactableMeshes.push(bulb);
    },

    render() {
        if (this.renderer && this.scene && this.camera) {
            // Update reflections if we have mirrors
            if (this.cubeCamera && this.cubeRenderTarget) {
                const mirrors = [];
                this.scene.traverse(child => {
                    if (child.isMesh && child.material && child.material.envMap === this.cubeRenderTarget.texture) {
                        mirrors.push(child);
                    }
                });

                if (mirrors.length > 0) {
                    mirrors.forEach(m => m.visible = false); // Hide mirrors during capture

                    // Position cube camera at the center of the first mirror
                    const mirrorPos = new THREE.Vector3();
                    mirrors[0].getWorldPosition(mirrorPos);
                    this.cubeCamera.position.copy(mirrorPos);

                    // Slightly offset from the face to prevent extreme near-clipping
                    this.cubeCamera.position.add(new THREE.Vector3(1, 1, 1));

                    this.cubeCamera.update(this.renderer, this.scene);

                    mirrors.forEach(m => m.visible = true);
                }
            }

            this.renderer.render(this.scene, this.camera);
        }
    },

    startVideoTour(nodes) {
        if (!nodes || nodes.length < 2) return;

        // Sort nodes by creation time or just use order in elements (assumed sequential)
        const points = nodes.map(n => new THREE.Vector3(n.x, (n.floor || 0) * 280 + (n.elevation || 160), n.y));
        const curve = new THREE.CatmullRomCurve3(points);

        const canvas = this.renderer.domElement;
        const stream = canvas.captureStream(30); // 30 FPS
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
        const chunks = [];

        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'tour_virtual.webm';
            a.click();

            // Restore original controls
            if (this.controls) this.controls.enabled = true;
            this.isNight = oldNight; // restore
            document.getElementById('mode3DStatus').textContent = "(Orbit Controls)";
        };

        const oldNight = this.isNight;

        if (this.controls) this.controls.enabled = false;
        document.getElementById('mode3DStatus').textContent = "🎥 RECORDING TOUR...";

        recorder.start();

        let progress = 0;
        const duration = nodes.length * 2000; // 2 seconds per node
        const startTime = Date.now();

        const animateTour = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            progress = elapsed / duration;

            if (progress >= 1.0) {
                recorder.stop();
                return;
            }

            const pos = curve.getPoint(progress);
            const lookAtPos = curve.getPoint(Math.min(1.0, progress + 0.01));

            this.camera.position.copy(pos);
            this.camera.lookAt(lookAtPos);

            this.renderer.render(this.scene, this.camera);
            requestAnimationFrame(animateTour);
        };

        animateTour();
    }
};
