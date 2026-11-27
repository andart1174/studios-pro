/**
 * engine3d.js — Scripting Studio PRO v5.0 Real PBR CAD & Animation Engine
 * ========================================================================
 * Provides:
 *  - Three.js r128 Studio PBR renderer (ACESFilmic, soft shadows, procedural PMREM softbox envMap)
 *  - Full backwards-compatible + CAD-upgraded `api.*` (addBox, addRoundedBox, addGear, addTube,
 *    smooth addLathe/addExtrude, addArch, addCapsule, addPyramid, addText3D, pushTransform/popTransform,
 *    radialArray, PBR material presets, custom lights, live api.param sliders)
 *  - Safe infinite-loop guard (aborts runaway while/for loops without freezing the browser!)
 *  - Lazy Cannon.js 3D physics with REAL quaternion tumbling & zero 60fps geometry GC leaks
 *  - Rate-limited console logging + Web Audio / simulated spectrum + Webcam capture
 */

const ScriptingEngine3D = (() => {

    // ─── PBR Material Presets ────────────────────────────────────────────────
    const MATERIAL_PRESETS = {
        gold:     { color: 0xf5b942, metalness: 0.92, roughness: 0.16 },
        chrome:   { color: 0xe8eef5, metalness: 0.96, roughness: 0.08 },
        steel:    { color: 0x94a3b8, metalness: 0.88, roughness: 0.24 },
        titanium: { color: 0x7c8aa0, metalness: 0.86, roughness: 0.28 },
        copper:   { color: 0xd97742, metalness: 0.90, roughness: 0.20 },
        bronze:   { color: 0xb47b3a, metalness: 0.84, roughness: 0.28 },
        obsidian: { color: 0x1e293b, metalness: 0.72, roughness: 0.20 },
        glass:    { color: 0xcbe8ff, metalness: 0.10, roughness: 0.05, transparent: true, opacity: 0.48, clearcoat: 1.0 },
        diamond:  { color: 0xe0f7ff, metalness: 0.18, roughness: 0.03, transparent: true, opacity: 0.72, clearcoat: 1.0 },
        emerald:  { color: 0x10b981, metalness: 0.18, roughness: 0.08, transparent: true, opacity: 0.82, clearcoat: 1.0 },
        ruby:     { color: 0xf43f5e, metalness: 0.20, roughness: 0.08, transparent: true, opacity: 0.82, clearcoat: 1.0 },
        sapphire: { color: 0x3b82f6, metalness: 0.22, roughness: 0.08, transparent: true, opacity: 0.82, clearcoat: 1.0 },
        ceramic:  { color: 0xf8fafc, metalness: 0.06, roughness: 0.18, clearcoat: 0.85 },
        wood:     { color: 0x9a5b32, metalness: 0.04, roughness: 0.62 },
        marble:   { color: 0xe2e8f0, metalness: 0.05, roughness: 0.26, clearcoat: 0.5 },
        neon:     { color: 0x00f3ff, metalness: 0.22, roughness: 0.18, emissive: 0x00f3ff, emissiveIntensity: 0.9 },
        plasma:   { color: 0xf472b6, metalness: 0.22, roughness: 0.18, emissive: 0xec4899, emissiveIntensity: 0.95 },
    };

    const SCENE_STYLES = {
        studio: { bg: 0x0b1122, grid1: 0x26355a, grid2: 0x131c36, rim: 0x38bdf8, fill: 0xf59e0b },
        cyber:  { bg: 0x050816, grid1: 0x00d9ff, grid2: 0x0d1b38, rim: 0x00f3ff, fill: 0xec4899 },
        sunset: { bg: 0x160b1c, grid1: 0xf97316, grid2: 0x2c142c, rim: 0xfbbf24, fill: 0xf43f5e },
        matrix: { bg: 0x030e08, grid1: 0x10b981, grid2: 0x092418, rim: 0x22c55e, fill: 0x06b6d4 },
        light:  { bg: 0xe8eef6, grid1: 0x94a3b8, grid2: 0xcbd5e1, rim: 0x3b82f6, fill: 0xf59e0b },
    };

    // ─── Engine State ────────────────────────────────────────────────────────
    let container = null;
    let renderer = null, scene = null, camera = null, controls = null;
    let pmremTarget = null;
    let gridHelper = null, rimLight = null, fillLight = null, keyLight = null, hemiLight = null;
    let rootGroup = null;
    let defaultModelHex = '#38bdf8';
    let currentSceneStyle = 'studio';
    let rafId = 0;

    // Script runtime state
    let compiledFn = null;
    let isAnimating = false;
    let animStartMs = 0;
    let lastAnimEvalMs = 0;
    let frameCount = 0;
    let userParams = {};          // { name: { value, min, max, step, type } }
    let paramOrder = [];
    let onParamsChanged = null;
    let onLog = null;
    let onStats = null;
    let lastLogText = '', lastLogTs = 0;

    // Geometry & Material caches (eliminates 60fps ExtrudeGeometry/shader GPU churn!)
    const geoCache = new Map();
    const matCache = new Map();
    const MAX_GEO_CACHE = 48;
    const MAX_MAT_CACHE = 64;
    const ANIM_INTERVAL_MS = 42; // ~24 fps script rebuilds while OrbitControls stays 60fps

    function getCachedGeo(key, builder) {
        if (geoCache.has(key)) return geoCache.get(key);
        const geo = builder();
        geo.userData = geo.userData || {};
        geo.userData.cached = true;
        if (geoCache.size >= MAX_GEO_CACHE) {
            const oldestKey = geoCache.keys().next().value;
            const oldest = geoCache.get(oldestKey);
            geoCache.delete(oldestKey);
            try { if (oldest) oldest.dispose(); } catch (_) {}
        }
        geoCache.set(key, geo);
        return geo;
    }

    // Interactive Inputs
    const keys = {};
    const mouse = { x: 0, y: 0, down: false };

    // Lazy Physics (Cannon.js) & Audio & Webcam
    let cannonLoaded = false, cannonLoading = null;
    let physWorld = null, physBodies = [];
    let audioCtx = null, audioAnalyser = null, audioData = null, audioStream = null;
    let camVideo = null, camCanvas = null, camCtx = null, camStream = null;

    // ─── Procedural PMREM Studio Softbox Environment (Zero external HDRI!) ──
    function buildStudioEnvMap(rend) {
        try {
            const pmrem = new THREE.PMREMGenerator(rend);
            pmrem.compileEquirectangularShader();
            const envScene = new THREE.Scene();
            envScene.background = new THREE.Color(0x11182c);

            // Overhead bright softbox + warm/cool architectural reflection panels
            const makePanel = (w, h, color, pos, rot) => {
                const m = new THREE.Mesh(
                    new THREE.PlaneGeometry(w, h),
                    new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
                );
                m.position.set(pos[0], pos[1], pos[2]);
                m.rotation.set(rot[0], rot[1], rot[2]);
                envScene.add(m);
            };
            makePanel(18, 18, 0xffffff, [0, 12, 0], [Math.PI / 2, 0, 0]);
            makePanel(14, 9,  0xbae6fd, [12, 4, 6], [0, -Math.PI / 2.2, 0]);
            makePanel(14, 9,  0xfde68a, [-12, 3, 4], [0, Math.PI / 2.2, 0]);
            makePanel(16, 8,  0xc4b5fd, [0, 5, -13], [0, 0, 0]);
            makePanel(16, 16, 0x1e293b, [0, -10, 0], [-Math.PI / 2, 0, 0]);

            const rt = pmrem.fromScene(envScene, 0.035);
            pmrem.dispose();
            envScene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
            return rt;
        } catch (e) {
            console.warn('PMREM fallback:', e);
            return null;
        }
    }

    // ─── Initialize Three.js Viewport ────────────────────────────────────────
    function init(domContainer, callbacks = {}) {
        container = domContainer;
        onParamsChanged = callbacks.onParamsChanged || null;
        onLog = callbacks.onLog || null;
        onStats = callbacks.onStats || null;

        const w = container.clientWidth || 800;
        const h = container.clientHeight || 600;

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(w, h);
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.18;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        // Automatic WebGL context-loss resilience
        renderer.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            cancelAnimationFrame(rafId);
        }, false);
        renderer.domElement.addEventListener('webglcontextrestored', () => {
            pmremTarget = buildStudioEnvMap(renderer);
            if (pmremTarget && scene) scene.environment = pmremTarget.texture;
            if (compiledFn) runCompiled(false);
            startLoop();
        }, false);

        scene = new THREE.Scene();
        pmremTarget = buildStudioEnvMap(renderer);
        if (pmremTarget) scene.environment = pmremTarget.texture;

        camera = new THREE.PerspectiveCamera(46, Math.max(0.1, w / Math.max(1, h)), 0.1, 1000);
        camera.position.set(11, 8.5, 14);

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.07;
        controls.autoRotateSpeed = 2.0;

        // 4-Light Studio PBR Rig
        hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 0.78);
        scene.add(hemiLight);

        keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
        keyLight.position.set(12, 18, 14);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.set(1024, 1024);
        keyLight.shadow.camera.near = 1;
        keyLight.shadow.camera.far = 65;
        const d = 18;
        keyLight.shadow.camera.left = -d; keyLight.shadow.camera.right = d;
        keyLight.shadow.camera.top = d; keyLight.shadow.camera.bottom = -d;
        scene.add(keyLight);

        rimLight = new THREE.DirectionalLight(0x38bdf8, 0.85);
        rimLight.position.set(-14, 8, -12);
        scene.add(rimLight);

        fillLight = new THREE.PointLight(0xf59e0b, 0.55, 50);
        fillLight.position.set(10, -6, -10);
        scene.add(fillLight);

        applySceneStyle('studio');

        rootGroup = new THREE.Group();
        rootGroup.name = 'Scripting_Root';
        scene.add(rootGroup);

        // Input tracking for interactive scripts
        window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
        window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
        renderer.domElement.addEventListener('pointermove', (e) => {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
        });
        renderer.domElement.addEventListener('pointerdown', () => { mouse.down = true; });
        window.addEventListener('pointerup', () => { mouse.down = false; });

        startLoop();
        return { renderer, scene, camera, controls };
    }

    function applySceneStyle(styleId) {
        const st = SCENE_STYLES[styleId] || SCENE_STYLES.studio;
        currentSceneStyle = styleId in SCENE_STYLES ? styleId : 'studio';
        if (scene) scene.background = new THREE.Color(st.bg);
        if (rimLight) rimLight.color.setHex(st.rim);
        if (fillLight) fillLight.color.setHex(st.fill);
        if (gridHelper) {
            scene.remove(gridHelper);
            if (gridHelper.geometry) gridHelper.geometry.dispose();
            if (gridHelper.material) {
                if (Array.isArray(gridHelper.material)) gridHelper.material.forEach(m => m.dispose());
                else gridHelper.material.dispose();
            }
            gridHelper = null;
        }
        gridHelper = new THREE.GridHelper(30, 30, st.grid1, st.grid2);
        gridHelper.position.y = -0.02;
        gridHelper.userData.isHelper = true;
        scene.add(gridHelper);
    }

    function setBackgroundColor(hex) {
        if (scene) scene.background = new THREE.Color(hex);
    }

    function setDefaultModelColor(hex) {
        defaultModelHex = hex;
        // Re-tint default-colored meshes without re-running animation/physics!
        if (!rootGroup) return;
        rootGroup.traverse(obj => {
            if (obj.userData && obj.userData.usesDefaultColor && obj.material && obj.material.color) {
                obj.material.color.set(hex);
            }
        });
    }

    function setAutoRotate(on) {
        if (controls) controls.autoRotate = !!on;
    }

    function resize() {
        if (!renderer || !camera || !container) return;
        const w = container.clientWidth || 800;
        const h = container.clientHeight || 600;
        camera.aspect = Math.max(0.1, w / Math.max(1, h));
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }

    function disposeGroup(grp) {
        if (!grp) return;
        while (grp.children.length > 0) {
            const ch = grp.children[0];
            grp.remove(ch);
            ch.traverse(o => {
                if (o.geometry && !(o.geometry.userData && o.geometry.userData.cached)) {
                    o.geometry.dispose();
                }
                if (o.material) {
                    if (Array.isArray(o.material)) {
                        o.material.forEach(m => {
                            if (m && !(m.userData && m.userData.cached)) {
                                if (m.map) m.map.dispose();
                                m.dispose();
                            }
                        });
                    } else if (!(o.material.userData && o.material.userData.cached)) {
                        if (o.material.map) o.material.map.dispose();
                        o.material.dispose();
                    }
                }
            });
        }
    }

    // ─── Geometry & Material Builders for `api.*` ────────────────────────────
    function parseOpts(colorOrOpts) {
        if (!colorOrOpts) return {};
        if (typeof colorOrOpts === 'string') {
            const key = colorOrOpts.toLowerCase().trim();
            if (MATERIAL_PRESETS[key]) return { ...MATERIAL_PRESETS[key] };
            return { color: colorOrOpts };
        }
        if (typeof colorOrOpts === 'number') return { color: colorOrOpts };
        if (typeof colorOrOpts === 'object') {
            if (colorOrOpts.material && typeof colorOrOpts.material === 'string') {
                const preset = MATERIAL_PRESETS[colorOrOpts.material.toLowerCase().trim()];
                if (preset) return { ...preset, ...colorOrOpts };
            }
            return { ...colorOrOpts };
        }
        return {};
    }

    function buildMaterial(opts) {
        const usesDefault = (opts.color === undefined);
        const col = new THREE.Color(usesDefault ? defaultModelHex : opts.color);
        const usePhysical = opts.clearcoat !== undefined || opts.transparent;
        const metalness = opts.metalness !== undefined ? opts.metalness : 0.38;
        const roughness = opts.roughness !== undefined ? opts.roughness : 0.28;
        const wireframe = !!opts.wireframe;
        const side = opts.doubleSide ? THREE.DoubleSide : THREE.FrontSide;
        const emHex = opts.emissive !== undefined ? new THREE.Color(opts.emissive).getHex() : -1;
        const emInt = opts.emissiveIntensity !== undefined ? opts.emissiveIntensity : 0.85;
        const opacity = opts.opacity !== undefined ? opts.opacity : (opts.transparent ? 0.65 : 1.0);
        const transparent = !!(opts.transparent || opacity < 0.99);
        const cc = usePhysical ? (opts.clearcoat !== undefined ? opts.clearcoat : 0.9) : 0;
        const ccr = usePhysical ? (opts.clearcoatRoughness !== undefined ? opts.clearcoatRoughness : 0.08) : 0;

        if (!usesDefault) {
            const key = `${usePhysical ? 'P' : 'S'}|${col.getHex()}|${metalness.toFixed(2)}|${roughness.toFixed(2)}|${wireframe ? 1 : 0}|${side}|${emHex}|${emInt.toFixed(2)}|${transparent ? 1 : 0}|${opacity.toFixed(2)}|${cc.toFixed(2)}|${ccr.toFixed(2)}`;
            if (matCache.has(key)) return matCache.get(key);
            const matParams = { color: col, metalness, roughness, wireframe, side };
            if (emHex >= 0) { matParams.emissive = new THREE.Color(emHex); matParams.emissiveIntensity = emInt; }
            if (transparent) { matParams.transparent = true; matParams.opacity = opacity; }
            if (usePhysical) { matParams.clearcoat = cc; matParams.clearcoatRoughness = ccr; }
            const mat = usePhysical ? new THREE.MeshPhysicalMaterial(matParams) : new THREE.MeshStandardMaterial(matParams);
            mat.userData.usesDefaultColor = false;
            mat.userData.cached = true;
            if (matCache.size >= MAX_MAT_CACHE) {
                const oldestKey = matCache.keys().next().value;
                const oldest = matCache.get(oldestKey);
                matCache.delete(oldestKey);
                try { if (oldest) oldest.dispose(); } catch (_) {}
            }
            matCache.set(key, mat);
            return mat;
        }

        const matParams = { color: col, metalness, roughness, wireframe, side };
        if (emHex >= 0) { matParams.emissive = new THREE.Color(emHex); matParams.emissiveIntensity = emInt; }
        if (transparent) { matParams.transparent = true; matParams.opacity = opacity; }
        if (usePhysical) { matParams.clearcoat = cc; matParams.clearcoatRoughness = ccr; }
        const mat = usePhysical ? new THREE.MeshPhysicalMaterial(matParams) : new THREE.MeshStandardMaterial(matParams);
        mat.userData.usesDefaultColor = true;
        return mat;
    }

    function createSpurGearGeometry(teeth, outerR, thickness, boreR) {
        const T = Math.max(5, Math.min(64, Math.round(teeth || 14)));
        const R = Math.max(0.4, Number(outerR) || 2.5);
        const thick = Math.max(0.1, Number(thickness) || 0.6);
        const bore = Number(boreR !== undefined ? boreR : R * 0.28);
        const cacheKey = `gear|${T}|${R.toFixed(3)}|${thick.toFixed(3)}|${bore.toFixed(3)}`;
        return getCachedGeo(cacheKey, () => {
            const rootR = R * 0.80;
            const pitchR = R * 0.92;
            const step = (Math.PI * 2) / T;
            const shape = new THREE.Shape();

            for (let i = 0; i < T; i++) {
                const a0 = i * step;
                const a1 = a0 + step * 0.16;
                const a2 = a0 + step * 0.28;
                const a3 = a0 + step * 0.50;
                const a4 = a0 + step * 0.62;
                const a5 = a0 + step * 0.78;
                const pts = [
                    [Math.cos(a0) * rootR, Math.sin(a0) * rootR],
                    [Math.cos(a1) * rootR, Math.sin(a1) * rootR],
                    [Math.cos(a2) * pitchR, Math.sin(a2) * pitchR],
                    [Math.cos(a2 + step * 0.04) * R, Math.sin(a2 + step * 0.04) * R],
                    [Math.cos(a3 - step * 0.04) * R, Math.sin(a3 - step * 0.04) * R],
                    [Math.cos(a3) * pitchR, Math.sin(a3) * pitchR],
                    [Math.cos(a4) * rootR, Math.sin(a4) * rootR],
                    [Math.cos(a5) * rootR, Math.sin(a5) * rootR],
                ];
                pts.forEach((pt, idx) => {
                    if (i === 0 && idx === 0) shape.moveTo(pt[0], pt[1]);
                    else shape.lineTo(pt[0], pt[1]);
                });
            }
            shape.closePath();

            if (bore > 0.06 && bore < rootR * 0.85) {
                const hole = new THREE.Path();
                hole.absarc(0, 0, bore, 0, Math.PI * 2, true);
                shape.holes.push(hole);
            }

            const bev = Math.min(0.06, thick * 0.12);
            const geo = new THREE.ExtrudeGeometry(shape, {
                depth: Math.max(0.05, thick - bev * 2),
                bevelEnabled: true,
                bevelThickness: bev,
                bevelSize: bev,
                bevelSegments: 2,
                curveSegments: 16,
            });
            geo.center();
            return geo;
        });
    }

    function createRoundedBoxGeometry(w, h, d, r) {
        const W = Math.max(0.1, Number(w) || 1);
        const H = Math.max(0.1, Number(h) || 1);
        const D = Math.max(0.1, Number(d) || 1);
        const rad = Math.min(Math.max(0.02, Number(r) || Math.min(W, H, D) * 0.12), W * 0.4, H * 0.4, D * 0.4);
        const cacheKey = `rbox|${W.toFixed(3)}|${H.toFixed(3)}|${D.toFixed(3)}|${rad.toFixed(3)}`;
        return getCachedGeo(cacheKey, () => {
            const hw = W / 2 - rad, hh = H / 2 - rad;
            const s = new THREE.Shape();
            s.moveTo(-hw, -H / 2);
            s.lineTo(hw, -H / 2);
            s.quadraticCurveTo(W / 2, -H / 2, W / 2, -hh);
            s.lineTo(W / 2, hh);
            s.quadraticCurveTo(W / 2, H / 2, hw, H / 2);
            s.lineTo(-hw, H / 2);
            s.quadraticCurveTo(-W / 2, H / 2, -W / 2, hh);
            s.lineTo(-W / 2, -hh);
            s.quadraticCurveTo(-W / 2, -H / 2, -hw, -H / 2);
            const geo = new THREE.ExtrudeGeometry(s, {
                depth: Math.max(0.04, D - rad * 2),
                bevelEnabled: true,
                bevelThickness: rad,
                bevelSize: rad,
                bevelSegments: 3,
            });
            geo.center();
            return geo;
        });
    }

    // ─── Infinite-Loop Guard (Protects UI thread from while(true){}) ─────────
    function instrumentCode(code) {
        const guardDecl = 'let __lc = 0; const __g = () => { if (++__lc > 180000) throw new Error("Loop guard: exceeded 180,000 iterations (possible infinite loop)"); };\n';
        // Inject __g(); at opening brace of for/while/do loops
        const safe = code
            .replace(/\b(for|while)\s*\(([^;{}()]*|\([^()]*\))*\)\s*\{/g, (m) => `${m} __g(); `)
            .replace(/\bdo\s*\{/g, (m) => `${m} __g(); `);
        return guardDecl + safe;
    }

    function stripCommentsAndStrings(code) {
        return code
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\/\/[^\n]*/g, '')
            .replace(/(['"`])(?:\\.|(?!\1)[^\\])*\1/g, '""');
    }

    // ─── Lazy Cannon.js Loader ───────────────────────────────────────────────
    function ensureCannonLoaded() {
        if (typeof window !== 'undefined' && typeof window.CANNON !== 'undefined') {
            cannonLoaded = true;
            return Promise.resolve(true);
        }
        if (cannonLoading) return cannonLoading;
        cannonLoading = new Promise((resolve) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/cannon.js/0.6.2/cannon.min.js';
            s.onload = () => { cannonLoaded = true; resolve(true); };
            s.onerror = () => { resolve(false); };
            document.head.appendChild(s);
        });
        return cannonLoading;
    }

    // ─── Per-Frame Scripting API Builder ─────────────────────────────────────
    function createExecutionContext(isFrameUpdate) {
        const containerStack = [rootGroup];
        const rawVerts = [];
        const rawEdges = [];
        const rawFaces = [];
        const rawParticles = [];
        const discoveredParams = {};
        const discoveredOrder = [];

        const currentParent = () => containerStack[containerStack.length - 1];

        const addMesh = (geo, x, y, z, colorOrOpts) => {
            const opts = parseOpts(colorOrOpts);
            const mat = buildMaterial(opts);
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(Number(x) || 0, Number(y) || 0, Number(z) || 0);
            if (opts.rx) mesh.rotation.x = opts.rx;
            if (opts.ry) mesh.rotation.y = opts.ry;
            if (opts.rz) mesh.rotation.z = opts.rz;
            if (opts.qx !== undefined) mesh.quaternion.set(opts.qx, opts.qy, opts.qz, opts.qw);
            if (opts.sx !== undefined || opts.sy !== undefined || opts.sz !== undefined) {
                mesh.scale.set(opts.sx || 1, opts.sy || 1, opts.sz || 1);
            } else if (opts.scale !== undefined) {
                mesh.scale.setScalar(opts.scale);
            }
            mesh.castShadow = opts.castShadow !== false;
            mesh.receiveShadow = opts.receiveShadow !== false;
            mesh.userData.usesDefaultColor = mat.userData.usesDefaultColor;
            if (opts.name) mesh.name = opts.name;
            currentParent().add(mesh);
            return mesh;
        };

        const registerParam = (name, defaultVal, min = 0, max = 100, step = 1, type = 'range') => {
            const key = String(name);
            if (!(key in userParams)) {
                userParams[key] = { value: defaultVal, min, max, step, type };
            } else {
                userParams[key].min = min; userParams[key].max = max; userParams[key].step = step; userParams[key].type = type;
            }
            discoveredParams[key] = userParams[key];
            if (!discoveredOrder.includes(key)) discoveredOrder.push(key);
            return userParams[key].value;
        };

        const api = {
            time: isAnimating ? (performance.now() - animStartMs) / 1000 : 0,
            frame: frameCount,
            keys,
            mouse,
            MATERIALS: Object.keys(MATERIAL_PRESETS),

            // Live parameters
            param: (name, def, min = 0, max = 100, step = 1) => registerParam(name, def, min, max, step, 'range'),
            addSlider: (name, def, min = 0, max = 100, step = 1) => registerParam(name, def, min, max, step, 'range'),
            addColorPicker: (name, defHex = '#38bdf8') => registerParam(name, defHex, 0, 0, 0, 'color'),

            // Transform stack for hierarchical assemblies
            pushTransform: (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) => {
                const g = new THREE.Group();
                g.position.set(x, y, z);
                g.rotation.set(rx, ry, rz);
                if (s !== 1) g.scale.setScalar(s);
                currentParent().add(g);
                containerStack.push(g);
            },
            popTransform: () => {
                if (containerStack.length > 1) containerStack.pop();
            },
            radialArray: (count, radius, fn) => {
                const n = Math.max(1, Math.min(200, Math.round(count)));
                for (let i = 0; i < n; i++) {
                    const angle = (i / n) * Math.PI * 2;
                    api.pushTransform(Math.cos(angle) * radius, 0, Math.sin(angle) * radius, 0, -angle, 0, 1);
                    fn(i, angle);
                    api.popTransform();
                }
            },

            // Real Solid PBR CAD Primitives (cached by quantized dims to eliminate per-frame GPU churn)
            addBox: (x, y, z, w = 2, h = 2, d = 2, opts) => {
                const W = Math.max(0.01, Number(w) || 1), H = Math.max(0.01, Number(h) || 1), D = Math.max(0.01, Number(d) || 1);
                return addMesh(getCachedGeo(`box|${W.toFixed(3)}|${H.toFixed(3)}|${D.toFixed(3)}`, () => new THREE.BoxGeometry(W, H, D)), x, y, z, opts);
            },
            addRoundedBox: (x, y, z, w = 2, h = 2, d = 2, r = 0.2, opts) =>
                addMesh(createRoundedBoxGeometry(w, h, d, r), x, y, z, opts),
            addCube: (x, y, z, size = 2, opts) => {
                const s = Math.max(0.01, Number(size) || 1);
                return addMesh(getCachedGeo(`box|${s.toFixed(3)}|${s.toFixed(3)}|${s.toFixed(3)}`, () => new THREE.BoxGeometry(s, s, s)), x, y, z, opts);
            },
            addSphere: (x, y, z, r = 1, opts) => {
                const rad = Number(r);
                const safeR = Number.isFinite(rad) && rad > 0 ? rad : 0.5;
                return addMesh(getCachedGeo(`sph|${safeR.toFixed(3)}`, () => new THREE.SphereGeometry(safeR, 28, 22)), x, y, z, opts);
            },
            addCylinder: (x, y, z, rTop = 1, rBot = 1, h = 2, opts) => {
                const rt = Math.max(0, Number(rTop)), rb = Math.max(0, Number(rBot)), H = Math.max(0.01, Number(h) || 1);
                return addMesh(getCachedGeo(`cyl|${rt.toFixed(3)}|${rb.toFixed(3)}|${H.toFixed(3)}`, () => new THREE.CylinderGeometry(rt, rb, H, 28)), x, y, z, opts);
            },
            addCone: (x, y, z, r = 1, h = 2, opts) => {
                const R = Math.max(0.01, Number(r) || 1), H = Math.max(0.01, Number(h) || 1);
                return addMesh(getCachedGeo(`cone|${R.toFixed(3)}|${H.toFixed(3)}`, () => new THREE.ConeGeometry(R, H, 28)), x, y, z, opts);
            },
            addTorus: (x, y, z, r = 2, tubeR = 0.4, rSeg = 18, tSeg = 36, opts) => {
                const R = Math.max(0.05, Number(r) || 1), tr = Math.max(0.02, Number(tubeR) || 0.2);
                const rs = Math.max(6, Math.round(rSeg) || 16), ts = Math.max(8, Math.round(tSeg) || 32);
                return addMesh(getCachedGeo(`tor|${R.toFixed(3)}|${tr.toFixed(3)}|${rs}|${ts}`, () => new THREE.TorusGeometry(R, tr, rs, ts)), x, y, z, opts);
            },
            addCapsule: (x, y, z, r = 0.5, len = 1.6, opts) => {
                const R = Math.max(0.05, Number(r) || 0.5);
                const L = Math.max(0.05, Number(len) || 1.2);
                const g = new THREE.Group();
                g.position.set(Number(x) || 0, Number(y) || 0, Number(z) || 0);
                const o = parseOpts(opts);
                if (o.rx) g.rotation.x = o.rx; if (o.ry) g.rotation.y = o.ry; if (o.rz) g.rotation.z = o.rz;
                const mat = buildMaterial(o);
                const cyl = new THREE.Mesh(new THREE.CylinderGeometry(R, R, L, 24), mat);
                const top = new THREE.Mesh(new THREE.SphereGeometry(R, 24, 16), mat); top.position.y = L / 2;
                const bot = new THREE.Mesh(new THREE.SphereGeometry(R, 24, 16), mat); bot.position.y = -L / 2;
                [cyl, top, bot].forEach(m => { m.castShadow = true; m.receiveShadow = true; m.userData.usesDefaultColor = mat.userData.usesDefaultColor; g.add(m); });
                currentParent().add(g);
                return g;
            },
            addPyramid: (x, y, z, r = 1.5, h = 2.5, sides = 4, opts) =>
                addMesh(new THREE.ConeGeometry(Math.max(0.05, Number(r) || 1), Math.max(0.05, Number(h) || 1), Math.max(3, Math.round(sides) || 4)), x, y, z, opts),
            addPlane: (x, y, z, w = 6, h = 6, opts) => {
                const o = parseOpts(opts);
                o.doubleSide = true;
                return addMesh(new THREE.PlaneGeometry(Math.max(0.05, Number(w) || 2), Math.max(0.05, Number(h) || 2)), x, y, z, o);
            },
            addGear: (x, y, z, teeth = 14, outerR = 2.6, thickness = 0.65, boreR = 0.7, opts) =>
                addMesh(createSpurGearGeometry(teeth, outerR, thickness, boreR), x, y, z, opts),
            addTube: (points, radius = 0.22, opts) => {
                if (!Array.isArray(points) || points.length < 2) return null;
                const o = parseOpts(opts);
                const vecs = points.map(p => Array.isArray(p) ? new THREE.Vector3(p[0], p[1], p[2]) : new THREE.Vector3(p.x, p.y, p.z));
                const curve = new THREE.CatmullRomCurve3(vecs, !!o.closed);
                const segs = Math.min(240, Math.max(16, o.segments || vecs.length * 2));
                const geo = new THREE.TubeGeometry(curve, segs, Math.max(0.02, Number(radius) || 0.2), o.radialSegments || 12, !!o.closed);
                return addMesh(geo, o.x || 0, o.y || 0, o.z || 0, o);
            },
            addArch: (x, y, z, width = 4, height = 4.5, depth = 0.8, thickness = 0.55, opts) => {
                const W = Math.max(1, Number(width) || 4);
                const H = Math.max(1, Number(height) || 4);
                const T = Math.min(W * 0.35, Math.max(0.15, Number(thickness) || 0.5));
                const legH = Math.max(0.4, H - W / 2);
                const outerR = W / 2, innerR = Math.max(0.2, outerR - T);
                const s = new THREE.Shape();
                s.moveTo(-outerR, 0);
                s.lineTo(-outerR, legH);
                s.absarc(0, legH, outerR, Math.PI, 0, true);
                s.lineTo(outerR, 0);
                s.lineTo(innerR, 0);
                s.lineTo(innerR, legH);
                s.absarc(0, legH, innerR, 0, Math.PI, false);
                s.lineTo(-innerR, 0);
                s.closePath();
                const geo = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.1, Number(depth) || 0.8), bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2 });
                geo.translate(0, 0, -(Number(depth) || 0.8) / 2);
                return addMesh(geo, x, y, z, opts);
            },
            addLathe: (points, segs = 40, opts) => {
                if (!Array.isArray(points) || points.length < 2) return null;
                const o = parseOpts(opts);
                o.doubleSide = true;
                const vecs = points.map(p => Array.isArray(p) ? new THREE.Vector2(Math.max(0, p[0]), p[1]) : new THREE.Vector2(Math.max(0, p.x), p.y));
                const geo = new THREE.LatheGeometry(vecs, Math.max(12, Math.min(96, Math.round(segs) || 40)));
                geo.computeVertexNormals();
                return addMesh(geo, o.x || 0, o.y || 0, o.z || 0, o);
            },
            addExtrude: (points, depth = 1.2, bevelEnabled = true, opts) => {
                if (!Array.isArray(points) || points.length < 3) return null;
                const o = parseOpts(opts);
                const s = new THREE.Shape();
                points.forEach((p, idx) => {
                    const px = Array.isArray(p) ? p[0] : p.x;
                    const py = Array.isArray(p) ? p[1] : p.y;
                    if (idx === 0) s.moveTo(px, py); else s.lineTo(px, py);
                });
                s.closePath();
                if (Array.isArray(o.holes)) {
                    o.holes.forEach(hPts => {
                        const hp = new THREE.Path();
                        hPts.forEach((p, i) => { if (i === 0) hp.moveTo(p[0], p[1]); else hp.lineTo(p[0], p[1]); });
                        hp.closePath();
                        s.holes.push(hp);
                    });
                }
                const dVal = Math.max(0.05, Number(depth) || 1);
                const geo = new THREE.ExtrudeGeometry(s, {
                    depth: dVal,
                    bevelEnabled: !!bevelEnabled,
                    bevelThickness: bevelEnabled ? Math.min(0.15, dVal * 0.14) : 0,
                    bevelSize: bevelEnabled ? Math.min(0.12, dVal * 0.12) : 0,
                    bevelSegments: 3,
                });
                if (o.center !== false) geo.center();
                return addMesh(geo, o.x || 0, o.y || 0, o.z || 0, o);
            },
            addText3D: (text, x = 0, y = 0, z = 0, opts) => {
                const o = parseOpts(opts);
                const cvs = document.createElement('canvas');
                cvs.width = 512; cvs.height = 128;
                const ctx = cvs.getContext('2d');
                ctx.fillStyle = o.bg || 'rgba(15, 23, 42, 0.85)';
                ctx.fillRect(0, 0, 512, 128);
                ctx.strokeStyle = o.color || '#38bdf8';
                ctx.lineWidth = 6; ctx.strokeRect(4, 4, 504, 120);
                ctx.font = '800 56px Inter, system-ui, sans-serif';
                ctx.fillStyle = o.color || '#ffffff';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(String(text || '3D').slice(0, 24), 256, 66);
                const tex = new THREE.CanvasTexture(cvs);
                const w = o.width || 4.8, h = o.height || 1.2, d = o.depth || 0.25;
                const sideMat = buildMaterial({ color: o.color || '#38bdf8', metalness: 0.7, roughness: 0.25 });
                const faceMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.25, metalness: 0.15 });
                const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [sideMat, sideMat, sideMat, sideMat, faceMat, faceMat]);
                mesh.position.set(x, y, z);
                if (o.rx) mesh.rotation.x = o.rx; if (o.ry) mesh.rotation.y = o.ry; if (o.rz) mesh.rotation.z = o.rz;
                currentParent().add(mesh);
                return mesh;
            },
            addLight: (type = 'point', x = 0, y = 6, z = 0, color = '#00f3ff', intensity = 1.2) => {
                const l = type === 'directional'
                    ? new THREE.DirectionalLight(color, intensity)
                    : new THREE.PointLight(color, intensity, 35);
                l.position.set(x, y, z);
                currentParent().add(l);
                return l;
            },

            // Legacy Raw Geometry (now smooth indexed faces + export-safe edges!)
            addVertex: (x, y, z) => { rawVerts.push([Number(x) || 0, Number(y) || 0, Number(z) || 0]); return rawVerts.length - 1; },
            addEdge: (i, j) => { rawEdges.push([i, j]); },
            addFace: (i, j, k) => { rawFaces.push([i, j, k]); },
            addParticle: (x, y, z, size = 0.3, color) => {
                rawParticles.push({ x: Number(x) || 0, y: Number(y) || 0, z: Number(z) || 0, size: Number(size) || 0.3, color: color || defaultModelHex });
            },

            // Console & Clear
            clear: () => {
                disposeGroup(rootGroup);
                rawVerts.length = 0; rawEdges.length = 0; rawFaces.length = 0; rawParticles.length = 0;
                containerStack.length = 1;
            },
            log: (msg) => {
                const text = String(msg);
                const now = performance.now();
                // Rate-limit repeated logs during 60fps animation so DOM never floods!
                if (isFrameUpdate && (now - lastLogTs < 450 || text === lastLogText)) return;
                lastLogText = text; lastLogTs = now;
                if (onLog) onLog(text, 'info');
            },

            // Lazy Physics (Cannon.js with real Quaternions!)
            initPhysics: (gravityY = -9.82) => {
                if (!cannonLoaded || typeof window.CANNON === 'undefined') {
                    ensureCannonLoaded().then(ok => {
                        if (ok && compiledFn) runCompiled(false);
                    });
                    return false;
                }
                physWorld = new window.CANNON.World();
                physWorld.gravity.set(0, gravityY, 0);
                physWorld.broadphase = new window.CANNON.NaiveBroadphase();
                physBodies = [];
                return true;
            },
            addPhysicalFloor: (y = 0) => {
                if (!physWorld || typeof window.CANNON === 'undefined') return null;
                const b = new window.CANNON.Body({ mass: 0 });
                b.addShape(new window.CANNON.Plane());
                b.quaternion.setFromAxisAngle(new window.CANNON.Vec3(1, 0, 0), -Math.PI / 2);
                b.position.set(0, y, 0);
                physWorld.addBody(b);
                return b;
            },
            addPhysicalSphere: (x, y, z, r = 0.8, mass = 1, color = '#38bdf8') => {
                if (!physWorld || typeof window.CANNON === 'undefined') return null;
                const b = new window.CANNON.Body({ mass, shape: new window.CANNON.Sphere(r), position: new window.CANNON.Vec3(x, y, z) });
                b.userData = { type: 'sphere', r, color };
                physWorld.addBody(b);
                physBodies.push(b);
                return b;
            },
            addPhysicalBox: (x, y, z, w = 1.2, h = 1.2, d = 1.2, mass = 1, color = '#f59e0b') => {
                if (!physWorld || typeof window.CANNON === 'undefined') return null;
                const b = new window.CANNON.Body({ mass, shape: new window.CANNON.Box(new window.CANNON.Vec3(w / 2, h / 2, d / 2)), position: new window.CANNON.Vec3(x, y, z) });
                b.angularVelocity.set((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
                b.userData = { type: 'box', w, h, d, color };
                physWorld.addBody(b);
                physBodies.push(b);
                return b;
            },
            stepPhysics: (dt = 1 / 60) => { if (physWorld) physWorld.step(dt); },
            getPhysicalBodies: () => physBodies.map(b => ({
                x: b.position.x, y: b.position.y, z: b.position.z,
                qx: b.quaternion.x, qy: b.quaternion.y, qz: b.quaternion.z, qw: b.quaternion.w,
                ...b.userData
            })),

            // Web Audio (with rich synthetic demo beat fallback when mic is off/blocked!)
            initAudio: () => {
                if (audioAnalyser) return true;
                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                        audioStream = stream;
                        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                        const src = audioCtx.createMediaStreamSource(stream);
                        audioAnalyser = audioCtx.createAnalyser();
                        audioAnalyser.fftSize = 128;
                        audioData = new Uint8Array(audioAnalyser.frequencyBinCount);
                        src.connect(audioAnalyser);
                    }).catch(() => {});
                }
                return true;
            },
            getAudioData: () => {
                if (audioAnalyser && audioData) {
                    audioAnalyser.getByteFrequencyData(audioData);
                    return audioData;
                }
                // Synthesized rhythmic 64-bin demo spectrum so Audio City ALWAYS looks alive!
                const t = (performance.now() - animStartMs) / 1000;
                const out = new Uint8Array(64);
                const kick = Math.pow(0.5 + 0.5 * Math.sin(t * 6.2), 3);
                for (let i = 0; i < 64; i++) {
                    const wave = 0.5 + 0.5 * Math.sin(t * (3.2 + i * 0.14) - i * 0.35);
                    const bassBoost = i < 10 ? kick * 120 : 0;
                    out[i] = Math.min(255, Math.round(45 + wave * 145 + bassBoost));
                }
                return out;
            },

            // Webcam
            initCamera: () => {
                if (camVideo) return true;
                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    navigator.mediaDevices.getUserMedia({ video: { width: 120, height: 90 } }).then(stream => {
                        camStream = stream;
                        camVideo = document.createElement('video');
                        camVideo.srcObject = stream; camVideo.muted = true; camVideo.play();
                        camCanvas = document.createElement('canvas');
                        camCanvas.width = 64; camCanvas.height = 48;
                        camCtx = camCanvas.getContext('2d', { willReadFrequently: true });
                    }).catch(() => {});
                }
                return true;
            },
            getCameraData: () => {
                if (!camVideo || !camCtx || camVideo.readyState < 2) return null;
                camCtx.drawImage(camVideo, 0, 0, 64, 48);
                return camCtx.getImageData(0, 0, 64, 48);
            },
        };

        const finalizeRawGeometry = () => {
            // Smooth indexed custom faces (fixes flat-shaded soup!)
            if (rawFaces.length > 0 && rawVerts.length > 0) {
                const pos = new Float32Array(rawVerts.length * 3);
                for (let i = 0; i < rawVerts.length; i++) {
                    pos[i * 3] = rawVerts[i][0]; pos[i * 3 + 1] = rawVerts[i][1]; pos[i * 3 + 2] = rawVerts[i][2];
                }
                const idx = [];
                for (let f = 0; f < rawFaces.length; f++) {
                    const [a, b, c] = rawFaces[f];
                    if (a >= 0 && b >= 0 && c >= 0 && a < rawVerts.length && b < rawVerts.length && c < rawVerts.length) {
                        idx.push(a, b, c);
                    }
                }
                if (idx.length > 0) {
                    const g = new THREE.BufferGeometry();
                    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
                    g.setIndex(idx);
                    g.computeVertexNormals();
                    const mat = buildMaterial({ doubleSide: true });
                    const m = new THREE.Mesh(g, mat);
                    m.userData.usesDefaultColor = true;
                    rootGroup.add(m);
                }
            }
            // Raw edges (stored cleanly with exportable metadata)
            if (rawEdges.length > 0 && rawVerts.length > 0) {
                const pos = [];
                for (let e = 0; e < rawEdges.length; e++) {
                    const a = rawVerts[rawEdges[e][0]], b = rawVerts[rawEdges[e][1]];
                    if (!a || !b) continue;
                    pos.push(a[0], a[1], a[2], b[0], b[1], b[2]);
                }
                if (pos.length > 0) {
                    const g = new THREE.BufferGeometry();
                    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
                    const mat = new THREE.LineBasicMaterial({ color: defaultModelHex });
                    const lines = new THREE.LineSegments(g, mat);
                    lines.userData.usesDefaultColor = true;
                    lines.userData.exportAsTubes = true;
                    rootGroup.add(lines);
                }
            }
            // Particles (honors user size!)
            if (rawParticles.length > 0) {
                const pos = new Float32Array(rawParticles.length * 3);
                const col = new Float32Array(rawParticles.length * 3);
                let sizeSum = 0;
                const tmpC = new THREE.Color();
                for (let i = 0; i < rawParticles.length; i++) {
                    const p = rawParticles[i];
                    pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
                    tmpC.set(p.color || defaultModelHex);
                    col[i * 3] = tmpC.r; col[i * 3 + 1] = tmpC.g; col[i * 3 + 2] = tmpC.b;
                    sizeSum += p.size;
                }
                const g = new THREE.BufferGeometry();
                g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
                g.setAttribute('color', new THREE.BufferAttribute(col, 3));
                const mat = new THREE.PointsMaterial({
                    size: Math.max(0.08, sizeSum / rawParticles.length),
                    vertexColors: true, transparent: true, opacity: 0.92,
                });
                const pts = new THREE.Points(g, mat);
                rootGroup.add(pts);
            }
        };

        return { api, finalizeRawGeometry, discoveredParams, discoveredOrder };
    }

    // ─── Compile & Execute Script ────────────────────────────────────────────
    function runScript(code, options = {}) {
        const keepCamera = !!options.keepCamera;
        const resetParams = !!options.resetParams;

        if (resetParams) {
            userParams = {};
            paramOrder = [];
        }
        isAnimating = false;
        compiledFn = null;
        frameCount = 0;
        physWorld = null;
        physBodies = [];

        try {
            const stripped = stripCommentsAndStrings(code);
            const wantsAnim = /\bapi\.(?:time|frame|getAudioData|getCameraData|stepPhysics|keys|mouse)\b/.test(stripped);
            const guarded = instrumentCode(code);
            compiledFn = new Function('api', 'THREE', guarded);
            isAnimating = wantsAnim;
            animStartMs = performance.now();

            const result = runCompiled(false);
            if (!keepCamera && result.ok) fitCameraToRoot();
            return result;
        } catch (err) {
            if (onLog) onLog(`❌ ${err.message}`, 'error');
            return { ok: false, error: err.message };
        }
    }

    function runCompiled(isFrameUpdate) {
        if (!compiledFn || !rootGroup) return { ok: false };
        disposeGroup(rootGroup);
        const ctx = createExecutionContext(isFrameUpdate);
        try {
            compiledFn(ctx.api, THREE);
            ctx.finalizeRawGeometry();

            if (!isFrameUpdate) {
                paramOrder = ctx.discoveredOrder;
                // Prune stale params not in this script
                Object.keys(userParams).forEach(k => { if (!ctx.discoveredParams[k]) delete userParams[k]; });
                if (onParamsChanged) onParamsChanged(paramOrder.map(k => ({ name: k, ...userParams[k] })));
            }

            const stats = countSceneStats();
            if (!isFrameUpdate && onStats) onStats(stats);
            return { ok: true, stats };
        } catch (err) {
            isAnimating = false;
            if (onLog) onLog(`❌ Runtime: ${err.message}`, 'error');
            return { ok: false, error: err.message };
        }
    }

    /** Execute a single REPL command WITHOUT wiping or duplicating existing geometry! */
    function runREPL(cmd) {
        if (!rootGroup) return { ok: false, error: 'Engine not initialized' };
        const ctx = createExecutionContext(false);
        try {
            const fn = new Function('api', 'THREE', `return (${cmd});`);
            let val;
            try { val = fn(ctx.api, THREE); }
            catch (_) {
                const stmt = new Function('api', 'THREE', instrumentCode(cmd));
                val = stmt(ctx.api, THREE);
            }
            ctx.finalizeRawGeometry();
            const stats = countSceneStats();
            if (onStats) onStats(stats);
            return { ok: true, value: val, stats };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    }

    function setParamValue(name, val) {
        if (!userParams[name]) return;
        userParams[name].value = val;
        if (!isAnimating) runCompiled(false);
    }

    function countSceneStats() {
        let meshes = 0, triangles = 0;
        if (rootGroup) {
            rootGroup.traverse(o => {
                if (o.isMesh && o.geometry && o.geometry.attributes && o.geometry.attributes.position) {
                    meshes++;
                    const g = o.geometry;
                    triangles += g.index ? Math.floor(g.index.count / 3) : Math.floor(g.attributes.position.count / 3);
                }
            });
        }
        return { meshes, triangles, animating: isAnimating };
    }

    function fitCameraToRoot() {
        if (!rootGroup || !camera || !controls) return;
        const box = new THREE.Box3().setFromObject(rootGroup);
        if (box.isEmpty()) return;
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z, 2);
        const dist = maxDim * 1.65;
        controls.target.copy(center);
        camera.position.set(center.x + dist * 0.72, center.y + dist * 0.56, center.z + dist * 0.92);
        controls.update();
    }

    function startLoop() {
        cancelAnimationFrame(rafId);
        const tick = (now) => {
            rafId = requestAnimationFrame(tick);
            if (typeof document !== 'undefined' && document.hidden) return;
            if (isAnimating && compiledFn) {
                const t = now || performance.now();
                if (t - lastAnimEvalMs >= ANIM_INTERVAL_MS) {
                    lastAnimEvalMs = t;
                    frameCount++;
                    runCompiled(true);
                }
            }
            if (controls) controls.update();
            if (renderer && scene && camera) renderer.render(scene, camera);
        };
        rafId = requestAnimationFrame(tick);
    }

    function teardown() {
        cancelAnimationFrame(rafId);
        isAnimating = false;
        if (audioStream) { audioStream.getTracks().forEach(t => t.stop()); audioStream = null; }
        if (audioCtx) { try { audioCtx.close(); } catch (_) {} audioCtx = null; audioAnalyser = null; }
        if (camStream) { camStream.getTracks().forEach(t => t.stop()); camStream = null; camVideo = null; }
        disposeGroup(rootGroup);
    }

    return {
        MATERIAL_PRESETS,
        SCENE_STYLES,
        init, resize, runScript, runREPL, setParamValue,
        applySceneStyle, setBackgroundColor, setDefaultModelColor, setAutoRotate,
        fitCameraToRoot, countSceneStats, instrumentCode, teardown,
        getRenderer: () => renderer,
        getScene: () => scene,
        getCamera: () => camera,
        getControls: () => controls,
        getRootGroup: () => rootGroup,
        getGridHelper: () => gridHelper,
        getSceneStyle: () => currentSceneStyle,
        getParams: () => paramOrder.map(k => ({ name: k, ...userParams[k] })),
    };
})();

if (typeof window !== 'undefined') window.ScriptingEngine3D = ScriptingEngine3D;
if (typeof module !== 'undefined' && module.exports) module.exports = ScriptingEngine3D;
