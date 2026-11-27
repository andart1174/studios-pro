/**
 * app.js — 4D Figure Builder PRO v5.0 Main Engine
 * ================================================
 * Real Solid PBR 4D Sculpture Renderer + Photo-to-4D Living Figures +
 * Live W-Hyperplane Slicer + Solid PBR Mechs + Multi-Stroke Mandala Sketch +
 * AI 4D Prompt Director + Unified GLB/STL/OBJ/AR/Video/PNG/HTML Export Suite.
 */

// ── Three.js Studio PBR Scene Setup ────────────────────────────────────────
const container = document.getElementById('stage-container');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(container.clientWidth || 800, container.clientHeight || 600);
renderer.setClearColor(0x050713, 1);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, Math.max(0.1, (container.clientWidth || 800) / Math.max(1, container.clientHeight || 600)), 0.05, 500);
camera.position.set(0.35, 0.55, 4.35);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;

// ── 3-Point Studio PBR Lighting Rig ────────────────────────────────────────
const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x161230, 0.95);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
keyLight.position.set(4.5, 6.5, 5.5);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x00f3ff, 0.9);
rimLight.position.set(-5.0, 2.5, -4.5);
scene.add(rimLight);

const fillLight = new THREE.PointLight(0xff00ea, 0.72, 22);
fillLight.position.set(3.5, -3.2, 3.2);
scene.add(fillLight);

const camLight = new THREE.PointLight(0xffffff, 0.35, 16);
camera.add(camLight);
scene.add(camera);

// Subtle studio floor grid
const gridHelper = new THREE.GridHelper(8, 28, 0x1e2956, 0x0b1026);
gridHelper.position.y = -1.65;
gridHelper.userData.isHelper = true;
scene.add(gridHelper);

// Post-processing (subtle bloom so Solid PBR & Photo textures stay ultra-crisp!)
let composer = null, bloomPass = null, chromaPass = null;
try {
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene, camera));
    bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(container.clientWidth || 800, container.clientHeight || 600),
        0.45, 0.35, 0.42
    );
    composer.addPass(bloomPass);
    chromaPass = new THREE.ShaderPass(ChromaAbrShader);
    chromaPass.uniforms.amount.value = 0.001;
    chromaPass.renderToScreen = true;
    composer.addPass(chromaPass);
} catch (e) {
    console.warn('Post-processing fallback:', e);
    composer = null; bloomPass = null; chromaPass = null;
}

// Trail Fade Scene (genuine motion-trail rendering when Trail > 0)
const trailScene = new THREE.Scene();
const trailCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const trailMat = new THREE.MeshBasicMaterial({ color: 0x050713, transparent: true, opacity: 0.15, depthTest: false, depthWrite: false });
const trailQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), trailMat);
trailScene.add(trailQuad);

// Init Extras
ReactiveBG.init(scene);
HyperTunnel.init(scene);

// ── Master Application State ───────────────────────────────────────────────
const state = {
    mode:          'figure',    // 'figure' | 'photo4d' | 'robot' | 'sketch'
    figId:         'tesseract',
    cat:           'polytopes',
    animating:     true,        // Gently rotates 4D right on boot!
    autoSlice:     false,
    showCross:     false,
    lang:          'en',
    theme:         'cyberpunk',
    renderMode:    'solid',     // Solid PBR default!
    proj:          'stereo',    // 'stereo' | 'ortho' | 'slice'
    animMode:      'w-rotation',
    speed:         0.75,
    glow:          0.45,
    trail:         0.0,
    rotation:      { xy: true, xz: false, xw: true, yz: false, yw: false, zw: true },
    params:        { radius: 1.0, tube: 0.32, segs: 24, twist: 0, wOffset: 0 },
    wSlice:        0,
    burstT:        -1,
    useMorphSlider: false,
    reelOrbiting:  false,
    reelStartAngle: 0,
    reelStartTime: 0,
};

const THEMES = {
    cyberpunk: { c: '#00f3ff', sec: '#a855f7' },
    matrix:    { c: '#00ff55', sec: '#00c4ff' },
    fire:      { c: '#ff5500', sec: '#fbbf24' },
    ice:       { c: '#60d5ff', sec: '#e0f2fe' },
    gold:      { c: '#fbbf24', sec: '#f97316' },
    vaporwave: { c: '#ff2a9d', sec: '#00f3ff' },
    aurora:    { c: '#34d399', sec: '#38bdf8' },
    cosmic:    { c: '#a855f7', sec: '#f472b6' },
};

const PRESETS_APP = [
    { name: '4D Heart',  cat: 'real4d',    id: 'heart4d',     theme: 'vaporwave', render: 'crystal', animMode: 'breathing' },
    { name: 'Mannequin', cat: 'real4d',    id: 'mannequin4d', theme: 'cyberpunk', render: 'solid',   animMode: 'w-rotation' },
    { name: 'DNA 4D',    cat: 'real4d',    id: 'dna4d',       theme: 'aurora',    render: 'solid',   animMode: 'double' },
    { name: 'Astrolabe', cat: 'real4d',    id: 'astrolabe4d', theme: 'gold',      render: 'solid',   animMode: 'isoclinic' },
    { name: 'Phoenix',   cat: 'real4d',    id: 'phoenix4d',   theme: 'fire',      render: 'crystal', animMode: 'breathing' },
    { name: 'Hyperstar', cat: 'real4d',    id: 'hyperstar4d', theme: 'cosmic',    render: 'crystal', animMode: 'isoclinic' },
    { name: '24-Cell',   cat: 'polytopes', id: 'cell24',      theme: 'ice',       render: 'solid',   animMode: 'w-rotation' },
    { name: 'Hopf S³',   cat: 'surfaces',  id: 'hopf',        theme: 'cosmic',    render: 'solid',   animMode: 'double' },
    { name: 'Klein 4D',  cat: 'surfaces',  id: 'klein',       theme: 'fire',      render: 'crystal', animMode: 'w-rotation' },
];

let currentColor = new THREE.Color(THEMES.cyberpunk.c);
let secondaryColor = new THREE.Color(THEMES.cyberpunk.sec);
let rotAngles = { xy: 0.25, xz: 0, xw: 0.35, yz: 0, yw: 0, zw: 0.2 };

// ── Ambient Particles ──────────────────────────────────────────────────────
let particleCount = 180;
let particles = null;

function buildParticles(count) {
    if (particles) {
        scene.remove(particles);
        particles.geometry.dispose();
        particles.material.dispose();
        particles = null;
    }
    if (count <= 0) return;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        pos[i * 3]     = (Math.random() - 0.5) * 14;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 9;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 12;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
        color: currentColor, size: 0.032, transparent: true, opacity: 0.55,
        blending: THREE.AdditiveBlending, depthWrite: false,
    });
    particles = new THREE.Points(geo, mat);
    particles.userData.isHelper = true;
    scene.add(particles);
}
buildParticles(particleCount);

// ═══════════════════════════════════════════════════════════════════════════
// VOLUMETRIC SOLID PBR 4D FIGURE ENGINE + LIVE W-HYPERPLANE SLICER
// ═══════════════════════════════════════════════════════════════════════════
let fxGroup = null;
let sliceGroup = null;

// Reusable scratch vectors/matrices (zero GC allocation per frame!)
const _up = new THREE.Vector3(0, 1, 0);
const _vA = new THREE.Vector3();
const _vB = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _tmpCol = new THREE.Color();
const _hiCol = new THREE.Color(0xffffff);

function disposeObject3D(obj) {
    if (!obj) return;
    obj.traverse(ch => {
        if (ch.geometry) ch.geometry.dispose();
        if (ch.material) {
            if (Array.isArray(ch.material)) ch.material.forEach(m => m.dispose());
            else ch.material.dispose();
        }
    });
}

function makeSurfaceMaterial(baseHex, mode, isSliceGhost = false) {
    const col = new THREE.Color(baseHex);
    if (isSliceGhost) {
        return new THREE.MeshPhysicalMaterial({
            color: col, transparent: true, opacity: 0.14,
            roughness: 0.3, metalness: 0.2, depthWrite: false, side: THREE.DoubleSide,
        });
    }
    if (mode === 'wireframe') {
        return new THREE.MeshBasicMaterial({
            color: col, wireframe: true, transparent: true, opacity: 0.42,
        });
    }
    if (mode === 'hologram') {
        return new THREE.MeshStandardMaterial({
            color: 0x00ffcc, emissive: 0x00d9ff, emissiveIntensity: 0.55,
            roughness: 0.16, metalness: 0.4, transparent: true, opacity: 0.52,
            vertexColors: true, side: THREE.DoubleSide, depthWrite: false,
        });
    }
    if (mode === 'crystal') {
        return new THREE.MeshPhysicalMaterial({
            color: 0xffffff, emissive: col, emissiveIntensity: 0.18,
            roughness: 0.06, metalness: 0.18, clearcoat: 1.0, clearcoatRoughness: 0.04,
            transparent: true, opacity: 0.72, vertexColors: true,
            side: THREE.DoubleSide, flatShading: false,
        });
    }
    if (mode === 'cyber') {
        return new THREE.MeshStandardMaterial({
            color: 0x0f172a, emissive: col, emissiveIntensity: 0.22,
            roughness: 0.25, metalness: 0.82, transparent: true, opacity: 0.62,
            vertexColors: true, side: THREE.DoubleSide,
        });
    }
    // Solid PBR Studio Sculpture (default!)
    return new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: col,
        emissiveIntensity: 0.12,
        roughness: 0.26,
        metalness: 0.52,
        vertexColors: true,
        side: THREE.DoubleSide,
    });
}

function buildFigure(id, params, fromMorph = false) {
    if (fxGroup) { scene.remove(fxGroup); disposeObject3D(fxGroup); fxGroup = null; }
    if (sliceGroup) { scene.remove(sliceGroup); disposeObject3D(sliceGroup); sliceGroup = null; }

    let fig;
    if (fromMorph && state.useMorphSlider) {
        fig = MorphSlider.computeMorphed(params, MorphSlider.getAlpha());
        if (!fig) fig = Figures.generate(id, params);
    } else {
        fig = Figures.generate(id, params);
    }

    const verts4d = fig.verts.map(v => [...v]);
    const baseVerts4d = fig.verts.map(v => [...v]);
    const edges = fig.edges || [];
    const faces = fig.faces || [];
    const nV = verts4d.length;
    const isSliceOnly = state.proj === 'slice';

    const figCol = currentColor.clone();
    const secCol = secondaryColor.clone();

    fxGroup = new THREE.Group();
    fxGroup.name = fig.id || id;

    // 1. REAL SOLID TRIANGULATED SURFACE MESH (with dynamic W-depth vertex colors!)
    let faceMesh = null;
    if (faces.length > 0) {
        const facePos = new Float32Array(nV * 3);
        const faceCol = new Float32Array(nV * 3);
        const flatIdx = new Uint32Array(faces.length * 3);
        for (let i = 0; i < faces.length; i++) {
            flatIdx[i * 3]     = faces[i][0];
            flatIdx[i * 3 + 1] = faces[i][1];
            flatIdx[i * 3 + 2] = faces[i][2];
        }
        const fGeo = new THREE.BufferGeometry();
        fGeo.setAttribute('position', new THREE.BufferAttribute(facePos, 3));
        fGeo.setAttribute('color', new THREE.BufferAttribute(faceCol, 3));
        fGeo.setIndex(new THREE.BufferAttribute(flatIdx, 1));

        // On polytopes in Solid mode, slightly translucent crystal faces let you see the 4D inner cell!
        const isPolytope = (fig.category === 'polytopes');
        const fMat = makeSurfaceMaterial(figCol.getHex(), state.renderMode, isSliceOnly);
        if (isPolytope && state.renderMode === 'solid' && !isSliceOnly) {
            fMat.transparent = true;
            fMat.opacity = 0.36;
            fMat.depthWrite = false;
        }
        faceMesh = new THREE.Mesh(fGeo, fMat);
        fxGroup.add(faceMesh);
    }

    // 2. VOLUMETRIC 3D STRUT TUBES (InstancedMesh cylinders along 4D edges — 100% solid & exportable!)
    let strutInst = null;
    let activeEdges = edges;
    const showStruts = (edges.length > 0) && (
        fig.category === 'polytopes' ||
        state.renderMode === 'cyber' ||
        state.renderMode === 'wireframe' ||
        state.renderMode === 'hologram' ||
        faces.length === 0 ||
        edges.length <= 260
    );
    if (showStruts) {
        // Subsample cleanly if figure has thousands of grid edges so FPS stays locked at 60!
        if (edges.length > 520) {
            const stride = Math.ceil(edges.length / 520);
            activeEdges = edges.filter((_, i) => i % stride === 0);
        }
        const radial = activeEdges.length > 200 ? 5 : 8;
        const tubeScale = (fig.tubeScale !== undefined ? fig.tubeScale : 0.55);
        const baseRad = Math.max(0.012, params.tube * 0.095 * tubeScale);
        const cylGeo = new THREE.CylinderGeometry(baseRad, baseRad, 1, radial, 1, false);
        const strutMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: figCol,
            emissiveIntensity: state.renderMode === 'cyber' || state.renderMode === 'wireframe' ? 0.85 : 0.42,
            roughness: 0.2,
            metalness: 0.72,
            transparent: isSliceOnly,
            opacity: isSliceOnly ? 0.22 : 1.0,
        });
        strutInst = new THREE.InstancedMesh(cylGeo, strutMat, activeEdges.length);
        strutInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        fxGroup.add(strutInst);
    }

    // 3. GLOWING 4D VERTEX GEMS (on Polytopes & sparse sculptural figures!)
    let gemInst = null;
    if (nV <= 80 && !isSliceOnly) {
        const gemRad = Math.max(0.028, params.tube * 0.16 * (fig.tubeScale || 0.8));
        const gemGeo = new THREE.IcosahedronGeometry(gemRad, 1);
        const gemMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: secCol,
            emissiveIntensity: 0.9,
            roughness: 0.12,
            metalness: 0.65,
        });
        gemInst = new THREE.InstancedMesh(gemGeo, gemMat, nV);
        gemInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        fxGroup.add(gemInst);
    }

    // 4. SUBTLE NEON EDGE LINES (for crisp silhouette definition in hologram/cyber/wire modes)
    let lineSeg = null;
    if (edges.length > 0 && (state.renderMode === 'wireframe' || state.renderMode === 'hologram' || isSliceOnly)) {
        const lGeo = new THREE.BufferGeometry();
        lGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(edges.length * 6), 3));
        const lMat = new THREE.LineBasicMaterial({
            color: state.renderMode === 'hologram' ? 0x00ffcc : figCol,
            transparent: true,
            opacity: isSliceOnly ? 0.18 : 0.75,
        });
        lineSeg = new THREE.LineSegments(lGeo, lMat);
        lineSeg.userData.isTrim = true;
        fxGroup.add(lineSeg);
    }

    // 5. LIVE W-HYPERPLANE CROSS-SECTION GROUP (Real 4D Slice Visualization!)
    sliceGroup = new THREE.Group();
    sliceGroup.name = 'W_Hyperplane_Slice';
    const sliceFillGeo = new THREE.BufferGeometry();
    const sliceFillMat = new THREE.MeshStandardMaterial({
        color: 0xffd166, emissive: 0xff9f1c, emissiveIntensity: 0.75,
        roughness: 0.15, metalness: 0.4, transparent: true, opacity: 0.68,
        side: THREE.DoubleSide,
    });
    const sliceFillMesh = new THREE.Mesh(sliceFillGeo, sliceFillMat);
    const sliceLineGeo = new THREE.BufferGeometry();
    const sliceLineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });
    const sliceLineMesh = new THREE.LineSegments(sliceLineGeo, sliceLineMat);
    sliceLineMesh.userData.isTrim = true;
    sliceGroup.add(sliceFillMesh, sliceLineMesh);
    sliceGroup.userData = { fillMesh: sliceFillMesh, lineMesh: sliceLineMesh };
    sliceGroup.visible = false;
    scene.add(sliceGroup);

    fxGroup.userData = {
        verts4d, baseVerts4d, edges, activeEdges, faces, fig,
        faceMesh, strutInst, gemInst, lineSeg,
    };
    scene.add(fxGroup);

    // Update HUD & Info
    const displayName = state.lang === 'fr' ? (fig.name_fr || fig.name_en) : fig.name_en;
    document.getElementById('hud-name').textContent = displayName;
    document.getElementById('hud-stats').textContent = `V:${nV} | E:${edges.length} | Tris:${faces.length}`;
    document.getElementById('info-text').textContent = state.lang === 'fr' ? (fig.desc_fr || fig.desc_en) : fig.desc_en;

    // DNA visual hash
    const dna = FigureDNA.getHash(id);
    const dnaBar = document.getElementById('fig-dna');
    const dnaDot = document.getElementById('hud-dna-dot');
    if (dnaBar) {
        dnaBar.style.display = 'flex';
        const dnaCanvas = document.getElementById('dna-canvas');
        if (dnaCanvas) {
            const ctx = dnaCanvas.getContext('2d');
            const grad = ctx.createLinearGradient(0, 0, 200, 0);
            grad.addColorStop(0, dna.css);
            grad.addColorStop(0.5, '#ffffff33');
            grad.addColorStop(1, currentColor.getStyle());
            ctx.clearRect(0, 0, 200, 14);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 3, 200, 8);
            ctx.fillStyle = dna.css;
            for (let i = 0; i < 200; i += 8) ctx.fillRect(i, 0, 3, 14);
        }
        const dnaHash = document.getElementById('dna-hash');
        if (dnaHash) dnaHash.textContent = '#' + id.split('').map(c => c.charCodeAt(0).toString(16)).join('').slice(0, 6);
    }
    if (dnaDot) dnaDot.style.background = dna.css;
    ReactiveBG.setColors(dna.hex, currentColor.getStyle());

    // Immediately project frame 0 so geometry is visible right away!
    update4DFigure(0, 0);
}

function update4DFigure(t, beat) {
    if (!fxGroup || state.mode !== 'figure') return;
    const ud = fxGroup.userData;
    const { verts4d, baseVerts4d, edges, activeEdges, faceMesh, strutInst, gemInst, lineSeg } = ud;
    if (!verts4d) return;

    // Mouse Gravity live deformation
    if (MouseGravity.isEnabled() && baseVerts4d) {
        MouseGravity.applyGravity(verts4d, baseVerts4d, rotAngles, state.rotation, state.proj);
    }

    // Dynamic Breathing 4D & Living Twist modifiers (no heavy rebuilds!)
    const breathW = (state.animating && state.animMode === 'breathing') ? Math.sin(t * state.speed * 1.8) * 0.48 : 0;
    const breathScale = (state.animating && state.animMode === 'breathing') ? (1 + Math.sin(t * state.speed * 1.8) * 0.1 + beat * 0.12) : (1 + beat * 0.1);
    const liveTwist = (state.animating && state.animMode === 'morph-loop') ? Math.sin(t * state.speed * 1.3) * 0.65 : 0;

    const n = verts4d.length;
    const rotated = new Array(n);
    const proj = new Array(n);

    for (let i = 0; i < n; i++) {
        let x = verts4d[i][0] * breathScale;
        let y = verts4d[i][1] * breathScale;
        let z = verts4d[i][2] * breathScale;
        let w = verts4d[i][3] + breathW;

        if (liveTwist !== 0) {
            const a = liveTwist * (z * 0.7 + w * 0.5);
            const ca = Math.cos(a), sa = Math.sin(a);
            const nx = x * ca - y * sa, ny = x * sa + y * ca;
            x = nx; y = ny;
        }
        const r4 = Math4D.rotate4D([x, y, z, w], rotAngles, state.rotation);
        rotated[i] = r4;
        proj[i] = Math4D.projectPoint(r4, state.proj === 'ortho' ? 'ortho' : 'stereo', 3.6);
    }

    // 1. Update solid triangulated surface positions + W-depth spectral colors!
    if (faceMesh) {
        const posArr = faceMesh.geometry.attributes.position.array;
        const colArr = faceMesh.geometry.attributes.color.array;
        for (let i = 0; i < n; i++) {
            const p = proj[i];
            posArr[i * 3]     = p.x;
            posArr[i * 3 + 1] = p.y;
            posArr[i * 3 + 2] = p.z;
            // Map 4th dimension W (-1.5..+1.5) to rich color gradient (secondary -> primary -> bright gem!)
            const wn = Math.max(0, Math.min(1, (p.w + 1.3) / 2.6));
            _tmpCol.copy(secondaryColor).lerp(currentColor, wn);
            if (wn > 0.72) _tmpCol.lerp(_hiCol, (wn - 0.72) * 1.1);
            colArr[i * 3]     = _tmpCol.r;
            colArr[i * 3 + 1] = _tmpCol.g;
            colArr[i * 3 + 2] = _tmpCol.b;
        }
        faceMesh.geometry.attributes.position.needsUpdate = true;
        faceMesh.geometry.attributes.color.needsUpdate = true;
        faceMesh.geometry.computeVertexNormals();
    }

    // 2. Update volumetric 4D strut tubes (InstancedMesh)
    if (strutInst && activeEdges) {
        for (let i = 0; i < activeEdges.length; i++) {
            const a = proj[activeEdges[i][0]], b = proj[activeEdges[i][1]];
            if (!a || !b) continue;
            _vA.set(a.x, a.y, a.z);
            _vB.set(b.x, b.y, b.z);
            _mid.addVectors(_vA, _vB).multiplyScalar(0.5);
            _dir.subVectors(_vB, _vA);
            const len = _dir.length();
            if (len < 1e-5) {
                _scale.set(0, 0, 0);
            } else {
                _quat.setFromUnitVectors(_up, _dir.normalize());
                const wThick = Math.max(0.45, Math.min(1.65, (a.scale + b.scale) * 0.5));
                _scale.set(wThick, len, wThick);
            }
            _mat4.compose(_mid, _quat, _scale);
            strutInst.setMatrixAt(i, _mat4);

            const avgW = Math.max(0, Math.min(1, ((a.w + b.w) * 0.5 + 1.3) / 2.6));
            _tmpCol.copy(secondaryColor).lerp(currentColor, avgW);
            strutInst.setColorAt(i, _tmpCol);
        }
        strutInst.instanceMatrix.needsUpdate = true;
        if (strutInst.instanceColor) strutInst.instanceColor.needsUpdate = true;
    }

    // 3. Update glowing 4D vertex gems
    if (gemInst) {
        for (let i = 0; i < n; i++) {
            const p = proj[i];
            _mid.set(p.x, p.y, p.z);
            _quat.identity();
            const gs = Math.max(0.5, Math.min(1.85, p.scale));
            _scale.set(gs, gs, gs);
            _mat4.compose(_mid, _quat, _scale);
            gemInst.setMatrixAt(i, _mat4);
        }
        gemInst.instanceMatrix.needsUpdate = true;
    }

    // 4. Update crisp wireframe lines when visible
    if (lineSeg) {
        const lPos = lineSeg.geometry.attributes.position.array;
        for (let i = 0; i < edges.length; i++) {
            const a = proj[edges[i][0]], b = proj[edges[i][1]];
            if (!a || !b) continue;
            lPos[i * 6] = a.x; lPos[i * 6 + 1] = a.y; lPos[i * 6 + 2] = a.z;
            lPos[i * 6 + 3] = b.x; lPos[i * 6 + 4] = b.y; lPos[i * 6 + 5] = b.z;
        }
        lineSeg.geometry.attributes.position.needsUpdate = true;
    }

    // 5. TRUE LIVE 4D W-HYPERPLANE CROSS-SECTION RENDERING!
    if (sliceGroup) {
        const wantSlice = state.proj === 'slice' || state.showCross || state.autoSlice;
        sliceGroup.visible = wantSlice;
        if (wantSlice) {
            const res = Math4D.crossSectionDetailed(rotated, edges, ud.faces, state.wSlice);
            const { fillMesh, lineMesh } = sliceGroup.userData;
            if (res.segments.length > 0) {
                const lArr = new Float32Array(res.segments.length * 6);
                const tArr = new Float32Array(res.segments.length * 9);
                const [cx, cy, cz] = res.center;
                for (let i = 0; i < res.segments.length; i++) {
                    const [p0, p1] = res.segments[i];
                    lArr[i * 6]     = p0[0]; lArr[i * 6 + 1] = p0[1]; lArr[i * 6 + 2] = p0[2];
                    lArr[i * 6 + 3] = p1[0]; lArr[i * 6 + 4] = p1[1]; lArr[i * 6 + 5] = p1[2];

                    tArr[i * 9]     = cx;    tArr[i * 9 + 1] = cy;    tArr[i * 9 + 2] = cz;
                    tArr[i * 9 + 3] = p0[0]; tArr[i * 9 + 4] = p0[1]; tArr[i * 9 + 5] = p0[2];
                    tArr[i * 9 + 6] = p1[0]; tArr[i * 9 + 7] = p1[1]; tArr[i * 9 + 8] = p1[2];
                }
                lineMesh.geometry.setAttribute('position', new THREE.BufferAttribute(lArr, 3));
                fillMesh.geometry.setAttribute('position', new THREE.BufferAttribute(tArr, 3));
                fillMesh.geometry.computeVertexNormals();
                fillMesh.visible = true;
                lineMesh.visible = true;
            } else {
                fillMesh.visible = false;
                lineMesh.visible = false;
            }
        }
    }
}

// ── Active Exportable Group Resolver (WORKS FOR ALL 4 MODES!) ──────────────
function getActiveExportGroups() {
    const groups = [];
    if (state.mode === 'photo4d' && Photo4DEngine.getGroup()) {
        groups.push(Photo4DEngine.getGroup());
    } else if (state.mode === 'robot' && RobotEngine.getGroup()) {
        groups.push(RobotEngine.getGroup());
    } else if (state.mode === 'sketch' && SketchEngine.getGroup()) {
        groups.push(SketchEngine.getGroup());
    } else if (fxGroup) {
        groups.push(fxGroup);
        if (sliceGroup && sliceGroup.visible) groups.push(sliceGroup);
    }
    if (textState.mesh && textState.mesh.visible) groups.push(textState.mesh);
    return groups;
}

function getExportBaseName() {
    if (state.mode === 'photo4d') return Photo4DEngine.getName() || 'photo-4d';
    if (state.mode === 'sketch') return 'hypersketch-4d';
    return `4d-${state.figId || 'figure'}`;
}

// ── Clear Other Scene Modes Cleanly ────────────────────────────────────────
function clearAllModes() {
    if (fxGroup) { scene.remove(fxGroup); disposeObject3D(fxGroup); fxGroup = null; }
    if (sliceGroup) { scene.remove(sliceGroup); disposeObject3D(sliceGroup); sliceGroup = null; }
    RobotEngine.remove(scene);
    Photo4DEngine.remove(scene);
    SketchEngine.remove(scene);
}

// ── Mode Selectors ─────────────────────────────────────────────────────────
function selectFigure(id, cat) {
    clearAllModes();
    state.mode = 'figure';
    state.figId = id;
    if (cat) state.cat = cat;
    state.useMorphSlider = false;
    buildFigure(id, state.params);
    syncCategoryTabUI(state.cat);
    document.querySelectorAll('.fig-item').forEach(el => el.classList.toggle('active', el.dataset.id === id));
}

function selectRobot(id) {
    clearAllModes();
    state.mode = 'robot';
    state.cat = 'robots';
    state.figId = id;
    state.useMorphSlider = false;
    const def = RobotEngine.build(id, scene, {
        colorHex: currentColor.getHex(),
        renderMode: state.renderMode,
    });
    document.getElementById('hud-name').textContent = state.lang === 'fr' ? def.name_fr : def.name_en;
    document.getElementById('hud-stats').textContent = 'Solid PBR Articulated 4D Mech';
    document.getElementById('info-text').textContent = state.lang === 'fr' ? def.desc_fr : def.desc_en;
    syncCategoryTabUI('robots');
    document.querySelectorAll('.fig-item').forEach(el => el.classList.toggle('active', el.dataset.id === id));
}

function activatePhoto4D(demoId = null) {
    clearAllModes();
    state.mode = 'photo4d';
    state.cat = 'photo4d';
    state.useMorphSlider = false;
    Photo4DEngine.setOptions({ renderMode: state.renderMode });
    const stats = demoId ? Photo4DEngine.loadDemo(demoId, scene) : Photo4DEngine.rebuild(scene);
    updatePhoto4DHUD(stats);
    syncCategoryTabUI('photo4d');
}

function updatePhoto4DHUD(stats) {
    if (!stats) return;
    const thumb = document.getElementById('photo4d-thumb');
    if (thumb && stats.previewDataURL) thumb.src = stats.previewDataURL;
    const modeName = Photo4DEngine.getOptions().mode.toUpperCase();
    document.getElementById('hud-name').textContent = `📸 ${stats.name || 'Photo 4D'} (${modeName})`;
    document.getElementById('hud-stats').textContent = `V:${stats.vertsCount} | Tris:${stats.trisCount} | PBR 4D`;
    document.getElementById('info-text').textContent = state.lang === 'fr'
        ? 'Sculpture 4D générée en direct depuis votre photo avec découpe intelligente et export GLB / STL / AR.'
        : 'Real volumetric 4D sculpture built live from your photo with smart cutout and full GLB / STL / AR export.';
}

function syncCategoryTabUI(cat) {
    document.querySelectorAll('#cat-tabs .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
    const p4dPanel = document.getElementById('photo4d-panel');
    const figList = document.getElementById('figure-list');
    if (cat === 'photo4d') {
        if (p4dPanel) p4dPanel.classList.add('visible');
        if (figList) figList.style.display = 'none';
    } else {
        if (p4dPanel) p4dPanel.classList.remove('visible');
        if (figList) figList.style.display = 'flex';
        renderFigureList(cat);
    }
}

// ── Main 60fps Animation Loop ──────────────────────────────────────────────
const clock = new THREE.Clock();
let rafId = 0;

function animate() {
    rafId = requestAnimationFrame(animate);
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.elapsedTime;
    const sp = state.speed;

    // 4D Rotation Planes
    if (state.animating) {
        const r = state.rotation;
        const base = dt * sp;
        switch (state.animMode) {
            case 'w-rotation':
                if (r.xy) rotAngles.xy += base * 0.45;
                if (r.xz) rotAngles.xz += base * 0.5;
                if (r.xw) rotAngles.xw += base * 1.05;
                if (r.yz) rotAngles.yz += base * 0.4;
                if (r.yw) rotAngles.yw += base * 0.65;
                if (r.zw) rotAngles.zw += base * 0.65;
                break;
            case 'double':
                if (r.xy) rotAngles.xy += base * 0.8;
                if (r.xw) rotAngles.xw += base * 0.8;
                if (r.yz) rotAngles.yz += base * 0.55;
                if (r.zw) rotAngles.zw += base * 0.55;
                break;
            case 'breathing':
                if (r.xw) rotAngles.xw += base * 0.45;
                if (r.yw) rotAngles.yw += base * 0.35;
                if (r.xy) rotAngles.xy += base * 0.25;
                break;
            case 'kaleidoscope':
                Object.keys(rotAngles).forEach(k => { if (r[k]) rotAngles[k] += base * (0.45 + Math.sin(t * 0.8) * 0.28); });
                break;
            case 'morph-loop':
                if (r.xw) rotAngles.xw += base * 0.6;
                if (r.zw) rotAngles.zw += base * 0.5;
                if (r.xy) rotAngles.xy += base * 0.35;
                break;
            case 'isoclinic':
                rotAngles.xy += base * 0.85;
                rotAngles.zw += base * 0.85;
                rotAngles.xw += base * 0.55;
                rotAngles.yz += base * 0.55;
                break;
        }
    }

    // Auto-Slicer Sweep
    if (state.autoSlice) {
        state.wSlice = Math.sin(t * 0.65 * sp) * 1.45;
        syncWSliceUI(state.wSlice);
    }

    // 360° Turntable Reel Orbit
    if (state.reelOrbiting) {
        const elapsed = (Date.now() - state.reelStartTime) / 1000;
        const frac = Math.min(1, elapsed / 6.0);
        const ang = state.reelStartAngle + frac * Math.PI * 2;
        const rad = 4.35;
        camera.position.set(Math.sin(ang) * rad, 0.55 + Math.sin(frac * Math.PI * 2) * 0.35, Math.cos(ang) * rad);
        camera.lookAt(0, 0, 0);
    }

    const beat = MusicEngine.getBeatPower();
    ReactiveBG.update(t, beat);
    HyperTunnel.update(dt);

    if (CreatureAI.isEnabled() && state.mode === 'figure') {
        CreatureAI.update(dt, state.params, () => buildFigure(state.figId, state.params));
    }

    if (typeof MicSculptor !== 'undefined') MicSculptor.update(dt);

    if (state.mode === 'robot') {
        RobotEngine.update(dt, sp);
    } else if (state.mode === 'photo4d') {
        Photo4DEngine.update(t, rotAngles, state.rotation, state.proj === 'ortho' ? 'ortho' : 'stereo', state.params.wOffset);
    } else if (state.mode === 'sketch') {
        SketchEngine.update(t, sp, state.animating);
    } else if (state.mode === 'figure') {
        update4DFigure(t, beat);
        if (fxGroup && state.burstT >= 0) {
            const bt = state.burstT;
            fxGroup.scale.setScalar(Math.max(0.05, bt < 0.5 ? 1 + bt * 2.4 : 3.4 - bt * 2.4));
            state.burstT += dt * 2.2;
            if (state.burstT > 1.0) { state.burstT = -1; fxGroup.scale.setScalar(1); }
        }
    }

    if (particles) {
        particles.rotation.y += dt * 0.025;
        particles.material.size = 0.032 * (1 + beat * 0.5);
    }

    updateTextBeat(dt, t);

    // Render with genuine Trail or Post-processing Bloom/Chroma
    if (bloomPass) bloomPass.strength = state.glow;
    if (chromaPass) chromaPass.uniforms.angle.value = t * 0.35;

    if (state.trail > 0.02) {
        renderer.autoClearColor = false;
        trailMat.opacity = Math.max(0.04, 1 - state.trail * 0.94);
        renderer.render(trailScene, trailCam);
        renderer.clearDepth();
        renderer.render(scene, camera);
    } else {
        renderer.autoClearColor = true;
        if (composer) {
            try { composer.render(); }
            catch (_) { composer = null; renderer.render(scene, camera); }
        } else {
            renderer.render(scene, camera);
        }
    }
    controls.update();

    // REC timer
    if (Export4D.isRecording()) {
        const sec = Math.floor((Date.now() - Export4D.getRecStartTime()) / 1000);
        const el = document.getElementById('rec-timer');
        if (el) el.textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
    }
}

// ── Dancing 3D Text System ─────────────────────────────────────────────────
const textState = {
    mesh: null, canvas: null, ctx2d: null, texture: null,
    text: '', color: '#f472b6', fontSize: 150, fontFamily: "'Outfit', sans-serif",
    beatSync: true, scaleY: 1, phase: 0,
};

function buildTextMesh(text, color) {
    if (textState.mesh) {
        scene.remove(textState.mesh);
        textState.mesh.geometry.dispose();
        textState.mesh.material.dispose();
        textState.mesh = null;
    }
    if (!text.trim()) return;
    const W = 1024, H = 256;
    if (!textState.canvas) {
        textState.canvas = document.createElement('canvas');
        textState.canvas.width = W; textState.canvas.height = H;
        textState.ctx2d = textState.canvas.getContext('2d');
    }
    const ctx = textState.ctx2d;
    ctx.clearRect(0, 0, W, H);
    ctx.font = `800 ${textState.fontSize}px ${textState.fontFamily}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = color; ctx.shadowBlur = 24;
    ctx.fillStyle = color; ctx.fillText(text, W / 2, H / 2);
    ctx.shadowBlur = 0; ctx.fillStyle = '#ffffff'; ctx.fillText(text, W / 2, H / 2);
    if (textState.texture) textState.texture.dispose();
    textState.texture = new THREE.CanvasTexture(textState.canvas);
    const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(3.8, 0.95),
        new THREE.MeshBasicMaterial({ map: textState.texture, transparent: true, depthWrite: false, side: THREE.DoubleSide })
    );
    mesh.position.set(0, -1.25, 0.5);
    textState.mesh = mesh;
    scene.add(mesh);
}

function updateTextBeat(dt, t) {
    if (!textState.mesh) return;
    const beat = MusicEngine.getBeatPower();
    if (textState.beatSync && MusicEngine.isPlaying()) {
        textState.scaleY += ((1 + beat * 1.2) - textState.scaleY) * 0.25;
        textState.mesh.scale.set(1 + beat * 0.3, textState.scaleY, 1);
    } else {
        textState.mesh.position.y = -1.25 + Math.sin(t * 1.2) * 0.08;
        textState.mesh.scale.set(1, 1, 1);
    }
}

// ── UI Helpers & Populators ────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, dur = 2600) {
    let el = document.getElementById('toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), dur);
}

function syncWSliceUI(val) {
    const sw = document.getElementById('slicer-w');
    const sv = document.getElementById('slicer-val');
    const fx = document.getElementById('fx-cross');
    const fxv = document.getElementById('fx-cross-val');
    if (sw) sw.value = val;
    if (sv) sv.textContent = `W = ${val.toFixed(3)}`;
    if (fx) fx.value = val;
    if (fxv) fxv.textContent = val.toFixed(2);
}

function setTheme(name) {
    state.theme = name;
    const th = THEMES[name] || THEMES.cyberpunk;
    currentColor = new THREE.Color(th.c);
    secondaryColor = new THREE.Color(th.sec);
    rimLight.color.copy(currentColor);
    fillLight.color.copy(secondaryColor);
    if (particles) particles.material.color.copy(currentColor);
    document.querySelectorAll('.theme-dot').forEach(b => b.classList.toggle('active', b.dataset.theme === name));
    ReactiveBG.setColors(th.c, th.sec);

    if (state.mode === 'figure') buildFigure(state.figId, state.params, state.useMorphSlider);
    else if (state.mode === 'robot') RobotEngine.rebuildStyle(scene, currentColor.getHex(), state.renderMode);
}

function renderFigureList(cat) {
    const list = document.getElementById('figure-list');
    if (!list) return;
    list.innerHTML = '';
    if (cat === 'robots') {
        RobotEngine.getRobotDefs().forEach(def => {
            const el = document.createElement('div');
            el.className = 'fig-item' + (state.mode === 'robot' && state.figId === def.id ? ' active' : '');
            el.dataset.id = def.id;
            el.innerHTML = `<div class="fig-icon" style="background:rgba(251,191,36,0.16);">${def.icon}</div>
                <div class="fig-info"><span class="fig-name">${state.lang === 'fr' ? def.name_fr : def.name_en}</span>
                <span class="fig-meta">Solid PBR 4D Mech</span></div>`;
            el.addEventListener('click', () => selectRobot(def.id));
            list.appendChild(el);
        });
        return;
    }
    const figs = Figures.getFiguresInCategory(cat);
    figs.forEach(fig => {
        const data = Figures.generate(fig.id, state.params);
        const dna = FigureDNA.getHash(fig.id);
        const el = document.createElement('div');
        el.className = 'fig-item' + (state.mode === 'figure' && state.figId === fig.id ? ' active' : '');
        el.dataset.id = fig.id;
        el.innerHTML = `<div class="fig-icon" style="background:${data.color}22;border:1px solid ${dna.css}44;">${data.icon}</div>
            <div class="fig-info"><span class="fig-name">${state.lang === 'fr' ? data.name_fr : data.name_en}</span>
            <span class="fig-meta">V:${data.verts.length} • Tris:${(data.faces || []).length}</span></div>`;
        el.addEventListener('click', () => selectFigure(fig.id, cat));
        list.appendChild(el);
    });
}

function populateMorphSelects() {
    const allFigs = [];
    Figures.getCategories().forEach(cat => {
        Figures.getFiguresInCategory(cat).forEach(f => {
            const d = Figures.generate(f.id, state.params);
            allFigs.push({ id: f.id, label: state.lang === 'fr' ? (d.name_fr || d.name_en) : d.name_en });
        });
    });
    ['morph-fig-a', 'morph-fig-b'].forEach((sid, idx) => {
        const sel = document.getElementById(sid);
        if (!sel) return;
        sel.innerHTML = '';
        allFigs.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f.id; opt.textContent = f.label;
            if ((idx === 0 && f.id === 'tesseract') || (idx === 1 && f.id === 'heart4d')) opt.selected = true;
            sel.appendChild(opt);
        });
    });
    MorphSlider.setFigures(
        document.getElementById('morph-fig-a')?.value || 'tesseract',
        document.getElementById('morph-fig-b')?.value || 'heart4d'
    );
}

function buildPresetGrid() {
    const grid = document.getElementById('preset-grid');
    if (!grid) return;
    grid.innerHTML = '';
    PRESETS_APP.forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'preset-btn';
        btn.textContent = p.name;
        btn.addEventListener('click', () => {
            state.renderMode = p.render || 'solid';
            syncRenderModeUI();
            state.animMode = p.animMode || 'w-rotation';
            const am = document.getElementById('anim-mode');
            if (am) am.value = state.animMode;
            setTheme(p.theme);
            selectFigure(p.id, p.cat);
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            showToast(`✨ ${p.name}`);
        });
        grid.appendChild(btn);
    });
}

function buildMelodyGrid() {
    const grid = document.getElementById('melody-grid');
    if (!grid) return;
    grid.innerHTML = '';
    MusicEngine.PRESETS.forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'melody-btn';
        btn.innerHTML = `${p.icon} ${state.lang === 'fr' ? p.name_fr : p.name_en}`;
        btn.addEventListener('click', () => {
            MusicEngine.playPreset(p.id);
            document.querySelectorAll('.melody-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('music-now-playing').style.display = 'flex';
            document.getElementById('music-playing-name').textContent = state.lang === 'fr' ? p.name_fr : p.name_en;
            document.getElementById('music-bpm-badge').textContent = `${p.bpm} BPM`;
            document.getElementById('music-bpm').value = p.bpm;
        });
        grid.appendChild(btn);
    });
}

function syncRenderModeUI() {
    document.querySelectorAll('[data-render]').forEach(b => b.classList.toggle('active', b.dataset.render === state.renderMode));
}

// ── i18n (Complete EN / FR) ────────────────────────────────────────────────
const i18n = {
    en: {
        backBtn: 'Back', appTitle: '4D Figure Builder', aiPlaceholder: 'AI 4D: Golden Heart, Lion Photo, Sentinel...', aiGo: '4D AI',
        photo4dBtn: 'Photo→4D', recBtn: 'REC', screenshot: 'PNG', exportBtn: 'Export',
        labTitle: '4D Laboratory', tabPhoto4d: '📸 Photo→4D', tabReal4d: '🗿 Real 4D',
        polytopes: 'Polytopes', surfaces: 'Surfaces', organic: 'Organic', abstract: 'Abstract', aliens: '👽 Aliens', robots: '🤖 Robots',
        p4dUpload: 'Upload Photo', p4dDemos: 'Instant HD Demos', p4dCutout: 'Subject Isolation',
        p4dObjOnly: '🎯 Object Only', p4dFullBg: '🖼️ Full Frame', p4dTol: 'Cutout Tol', p4dModes: '4D Reconstruction Mode',
        p4dDepth: '3D Depth', p4dSmooth: 'Smooth', p4dWamp: '4D W-Wave', p4dDouble: 'Double-Sided 3D', p4dInvert: 'Invert Cutout',
        parametersTitle: 'Parameters', paramRadius: 'Radius', paramTube: 'Thickness', paramSegs: 'Detail', paramTwist: 'Twist', paramW: 'W Offset',
        morphSliderTitle: 'Morph A↔B', morphAlpha: 'Alpha', projTitle: '4D→3D Projection', projStereo: 'Stereo', projOrtho: 'Ortho', projSlice: 'W Slice',
        presetsTitle: 'Presets', dropPhotoHint: 'Drop Photo to Sculpt 4D Figure!',
        stopAnim: 'Stop', animate: 'Animate', resetView: 'Reset', explode: 'Burst!', morph: 'Morph', reelBtn: '360° Reel',
        fxTitle: 'Animation & FX', animMode: 'Animation Mode',
        animW: '↗ W-Rotation', animDouble: '⊕ Double Rotation', animBreath: '💨 Breathing 4D', animKaleid: '🔮 Kaleidoscope', animMorph: '🌊 Living Twist 4D', animIso: '♾ Isoclinic Spin',
        speed: 'Speed', rotPlanes: 'Rotation Planes', colorTheme: 'Color Theme', renderMode: 'Material & Render',
        rSolid: 'Solid PBR', rCrystal: 'Crystal', rCyber: 'Cyber', rHolo: 'Holo', rWire: 'Wire',
        glow: 'Glow', trail: 'Trail', particles: 'Particles', crossTitle: 'Live W Section', animCross: 'Animate W-Slice',
        infoTitle: 'About', infoDefault: 'Select a figure or upload a photo.',
        slicerLabel: 'W Hyperplane Slice', autoScan: 'Auto-Scan', showCross: 'Section',
        expSuiteTitle: '4D Studio Export Suite', expGlbDesc: 'Full color PBR + Photo textures for Blender, Unity & Web',
        expStlDesc: 'Watertight binary mesh ready for Bambu / Prusa / Cura', expObjDesc: 'Universal 3D mesh with vertices, UVs & triangle faces',
        expArDesc: 'Instant real-world Augmented Reality with GLB colors', expVidDesc: 'Record live 4D animation with synced music (MP4/WebM)',
        expReelDesc: '1-click automatic 6s showcase video orbit + 4D spin', expHtmlDesc: 'Standalone offline 3D web viewer with Orbit & Lighting',
        expCinDesc: 'Auto-capture 3 dramatic studio camera renders', pngTrans: 'Transparent BG', expPngBtn: 'Download PNG',
        projFreeLabel: 'Project File (.sp4dfig — FREE)', saveProj: 'Save', loadProj: 'Load',
        musicTitle: '4D Music Studio', aiGenMusic: 'AI Generate', galleryTitle: 'Gallery', shareTitle: 'Share 4D Link', copyUrl: 'Copy Link',
    },
    fr: {
        backBtn: 'Retour', appTitle: 'Constructeur 4D', aiPlaceholder: 'IA 4D : Cœur Or, Lion Photo, Sentinelle...', aiGo: 'IA 4D',
        photo4dBtn: 'Photo→4D', recBtn: 'ENR', screenshot: 'PNG', exportBtn: 'Exporter',
        labTitle: 'Laboratoire 4D', tabPhoto4d: '📸 Photo→4D', tabReal4d: '🗿 Réel 4D',
        polytopes: 'Polytopes', surfaces: 'Surfaces', organic: 'Organique', abstract: 'Abstrait', aliens: '👽 Aliens', robots: '🤖 Robots',
        p4dUpload: 'Charger Photo', p4dDemos: 'Démos HD Instantanées', p4dCutout: 'Découpe du Sujet',
        p4dObjOnly: '🎯 Objet Seul', p4dFullBg: '🖼️ Cadre Complet', p4dTol: 'Tolérance', p4dModes: 'Mode de Reconstruction 4D',
        p4dDepth: 'Profondeur', p4dSmooth: 'Lissage', p4dWamp: 'Onde 4D (W)', p4dDouble: 'Double Face 3D', p4dInvert: 'Inverser',
        parametersTitle: 'Paramètres', paramRadius: 'Rayon', paramTube: 'Épaisseur', paramSegs: 'Détail', paramTwist: 'Torsion', paramW: 'Décalage W',
        morphSliderTitle: 'Morphose A↔B', morphAlpha: 'Alpha', projTitle: 'Projection 4D→3D', projStereo: 'Stéréo', projOrtho: 'Ortho', projSlice: 'Tranche W',
        presetsTitle: 'Préréglages', dropPhotoHint: 'Déposez une photo pour sculpter en 4D !',
        stopAnim: 'Stop', animate: 'Animer', resetView: 'Reset', explode: 'Burst !', morph: 'Morphose', reelBtn: 'Reel 360°',
        fxTitle: 'Animation & FX', animMode: "Mode d'Animation",
        animW: '↗ Rotation-W', animDouble: '⊕ Double Rotation', animBreath: '💨 Respiration 4D', animKaleid: '🔮 Kaléidoscope', animMorph: '🌊 Torsion 4D', animIso: '♾ Spin Isoclinique',
        speed: 'Vitesse', rotPlanes: 'Plans Rotation', colorTheme: 'Thème Couleur', renderMode: 'Matière & Rendu',
        rSolid: 'Solide PBR', rCrystal: 'Cristal', rCyber: 'Cyber', rHolo: 'Holo', rWire: 'Fil',
        glow: 'Lueur', trail: 'Traînée', particles: 'Particules', crossTitle: 'Section W Live', animCross: 'Animer la Tranche',
        infoTitle: 'À propos', infoDefault: 'Choisissez une figure ou importez une photo.',
        slicerLabel: 'Tranche Hyperplan W', autoScan: 'Scan Auto', showCross: 'Section',
        expSuiteTitle: 'Suite Export Studio 4D', expGlbDesc: 'Binaire PBR couleur + texture photo (Blender, Unity, Web)',
        expStlDesc: 'Maillage binaire solide prêt pour Bambu / Prusa / Cura', expObjDesc: 'Maillage 3D universel avec sommets, UVs et faces',
        expArDesc: 'Réalité Augmentée instantanée en couleur GLB', expVidDesc: 'Enregistrer la vidéo 60fps + musique (MP4/WebM)',
        expReelDesc: 'Vidéo showcase automatique 6s orbite 360° + 4D', expHtmlDesc: 'Visionneuse web 3D autonome hors-ligne (1 fichier)',
        expCinDesc: 'Capture automatique de 3 angles cinéma studio', pngTrans: 'Fond Transparent', expPngBtn: 'Télécharger PNG',
        projFreeLabel: 'Fichier Projet (.sp4dfig — GRATUIT)', saveProj: 'Sauver', loadProj: 'Charger',
        musicTitle: 'Studio Musical 4D', aiGenMusic: 'IA Générer', galleryTitle: 'Galerie', shareTitle: 'Partager Lien 4D', copyUrl: 'Copier le Lien',
    },
};

function applyLang(lang) {
    state.lang = lang;
    const d = i18n[lang] || i18n.en;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const k = el.dataset.i18n;
        if (d[k]) el.textContent = d[k];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const k = el.dataset.i18nPlaceholder;
        if (d[k]) el.placeholder = d[k];
    });
    document.documentElement.lang = lang;
    const animSpan = document.querySelector('#btn-animate span');
    if (animSpan) animSpan.textContent = state.animating ? d.stopAnim : d.animate;
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENT BINDINGS
// ═══════════════════════════════════════════════════════════════════════════

// Back button
document.getElementById('back-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (window.StudiosProGate) window.StudiosProGate.closeStudio();
});

// AI 4D Prompt Director
function runAIPrompt() {
    const inp = document.getElementById('ai-prompt-input');
    const txt = (inp && inp.value || '').trim();
    const plan = AIDirector4D.parsePrompt(txt || 'golden crystal heart');
    state.renderMode = plan.render || 'solid';
    syncRenderModeUI();
    if (plan.anim) {
        state.animMode = plan.anim;
        const am = document.getElementById('anim-mode');
        if (am) am.value = plan.anim;
    }
    setTheme(plan.theme || 'cyberpunk');
    if (plan.type === 'photo') {
        Photo4DEngine.setOptions({ mode: plan.mode || 'bust', renderMode: state.renderMode });
        activatePhoto4D(plan.demo || 'lion');
    } else if (plan.type === 'robot') {
        selectRobot(plan.id || 'sentinel');
    } else {
        selectFigure(plan.id || 'heart4d', plan.cat || 'real4d');
    }
    if (plan.slice) {
        state.showCross = true;
        state.autoSlice = true;
        document.getElementById('btn-cross-visible')?.classList.add('active');
        document.getElementById('btn-slicer-auto')?.classList.add('active');
    }
    showToast(`✨ AI 4D: ${document.getElementById('hud-name').textContent}`);
}
document.getElementById('btn-ai-compose')?.addEventListener('click', runAIPrompt);
document.getElementById('ai-prompt-input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') runAIPrompt(); });

// Quick Photo->4D Header Button
document.getElementById('btn-photo4d-quick')?.addEventListener('click', () => {
    activatePhoto4D(Photo4DEngine.isActive() ? null : 'lion');
    showToast(state.lang === 'fr' ? '📸 Studio Photo→4D activé ! Importez votre photo.' : '📸 Photo→4D Studio ready! Upload any photo.');
});

// Category Tabs
document.querySelectorAll('#cat-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const cat = btn.dataset.cat;
        state.cat = cat;
        if (cat === 'photo4d') {
            activatePhoto4D(Photo4DEngine.isActive() ? null : 'lion');
        } else if (cat === 'robots') {
            syncCategoryTabUI('robots');
            if (state.mode !== 'robot') selectRobot('sentinel');
        } else {
            syncCategoryTabUI(cat);
            const firstId = Figures.getFirst(cat);
            selectFigure(firstId, cat);
        }
    });
});

// ── PHOTO -> 4D PANEL CONTROLS & CANVAS DRAG-AND-DROP ──────────────────────
const p4dFile = document.getElementById('photo4d-file');
document.getElementById('btn-photo4d-upload')?.addEventListener('click', () => p4dFile && p4dFile.click());
p4dFile?.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    await handleUploadedPhoto(file);
    p4dFile.value = '';
});

async function handleUploadedPhoto(file) {
    try {
        clearAllModes();
        state.mode = 'photo4d';
        state.cat = 'photo4d';
        Photo4DEngine.setOptions({ renderMode: state.renderMode });
        const stats = await Photo4DEngine.loadFile(file, scene);
        updatePhoto4DHUD(stats);
        syncCategoryTabUI('photo4d');
        showToast(`📸 4D Sculpture built (${stats.trisCount.toLocaleString()} tris)!`);
    } catch (err) {
        console.error(err);
        showToast('❌ Could not load photo');
    }
}

// Drag & drop any photo right onto the 3D viewport!
const dropOverlay = document.getElementById('photo-drop-overlay');
['dragenter', 'dragover'].forEach(ev => {
    container.addEventListener(ev, (e) => { e.preventDefault(); if (dropOverlay) dropOverlay.classList.add('active'); });
});
['dragleave', 'drop'].forEach(ev => {
    container.addEventListener(ev, (e) => { e.preventDefault(); if (dropOverlay) dropOverlay.classList.remove('active'); });
});
container.addEventListener('drop', async (e) => {
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) await handleUploadedPhoto(file);
});

// Photo->4D Demo buttons
document.querySelectorAll('.photo-demo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.photo-demo-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activatePhoto4D(btn.dataset.demo);
    });
});

// Photo->4D Cutout Toggle
document.querySelectorAll('.p4d-cut-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.p4d-cut-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const stats = Photo4DEngine.setOptions({ cutoutMode: btn.dataset.cut }, scene);
        if (stats) updatePhoto4DHUD(stats);
    });
});

// Photo->4D Reconstruction Mode buttons
document.querySelectorAll('.p4d-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.p4d-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const stats = Photo4DEngine.setOptions({ mode: btn.dataset.p4dmode }, scene);
        if (stats) updatePhoto4DHUD(stats);
    });
});

// Photo->4D Sliders & Checkboxes
const bindP4DRange = (id, key, fmt) => {
    const el = document.getElementById(id);
    const vl = document.getElementById(id + '-val');
    if (!el) return;
    el.addEventListener('input', () => {
        const v = parseFloat(el.value);
        if (vl) vl.textContent = fmt ? fmt(v) : String(v);
        const stats = Photo4DEngine.setOptions({ [key]: v }, scene);
        if (stats) updatePhoto4DHUD(stats);
    });
};
bindP4DRange('p4d-tol', 'tolerance', v => String(Math.round(v)));
bindP4DRange('p4d-depth', 'depth', v => v.toFixed(2));
bindP4DRange('p4d-smooth', 'smooth', v => String(Math.round(v)));
bindP4DRange('p4d-wamp', 'wAmp', v => v.toFixed(2));

document.getElementById('p4d-double')?.addEventListener('change', (e) => {
    const stats = Photo4DEngine.setOptions({ doubleSided: e.target.checked }, scene);
    if (stats) updatePhoto4DHUD(stats);
});
document.getElementById('p4d-invert')?.addEventListener('change', (e) => {
    const stats = Photo4DEngine.setOptions({ invertMask: e.target.checked }, scene);
    if (stats) updatePhoto4DHUD(stats);
});

// ── Geometry Parameters ────────────────────────────────────────────────────
['radius', 'tube', 'segs', 'twist', 'w'].forEach(name => {
    const el = document.getElementById(`p-${name}`);
    const vl = document.getElementById(`p-${name}-val`);
    if (!el) return;
    el.addEventListener('input', () => {
        const v = parseFloat(el.value);
        if (vl) vl.textContent = name === 'segs' ? String(Math.round(v)) : v.toFixed(2);
        const map = { radius: 'radius', tube: 'tube', segs: 'segs', twist: 'twist', w: 'wOffset' };
        state.params[map[name]] = v;
        if (state.mode === 'figure') buildFigure(state.figId, state.params, state.useMorphSlider);
    });
});

// Animation & FX Bindings
document.getElementById('btn-animate')?.addEventListener('click', () => {
    state.animating = !state.animating;
    const btn = document.getElementById('btn-animate');
    btn.classList.toggle('playing', state.animating);
    btn.querySelector('i').className = state.animating ? 'fa-solid fa-pause' : 'fa-solid fa-play';
    const sp = btn.querySelector('span');
    if (sp) sp.textContent = state.animating ? (i18n[state.lang].stopAnim) : (i18n[state.lang].animate);
});
document.getElementById('anim-mode')?.addEventListener('change', e => { state.animMode = e.target.value; });
document.getElementById('fx-speed')?.addEventListener('input', e => {
    state.speed = parseFloat(e.target.value);
    document.getElementById('fx-speed-val').textContent = state.speed.toFixed(1);
});

['xy', 'xz', 'xw', 'yz', 'yw', 'zw'].forEach(p => {
    document.getElementById(`rot-${p}`)?.addEventListener('change', e => { state.rotation[p] = e.target.checked; });
});

document.getElementById('fx-glow')?.addEventListener('input', e => {
    state.glow = parseFloat(e.target.value);
    document.getElementById('fx-glow-val').textContent = state.glow.toFixed(2);
});
document.getElementById('fx-chroma')?.addEventListener('input', e => {
    const v = parseFloat(e.target.value);
    if (chromaPass) chromaPass.uniforms.amount.value = v;
    document.getElementById('fx-chroma-val').textContent = v.toFixed(3);
});
document.getElementById('fx-trail')?.addEventListener('input', e => {
    state.trail = parseFloat(e.target.value);
    document.getElementById('fx-trail-val').textContent = state.trail.toFixed(2);
});
document.getElementById('fx-particles')?.addEventListener('input', e => {
    particleCount = parseInt(e.target.value, 10);
    document.getElementById('fx-particles-val').textContent = String(particleCount);
    buildParticles(particleCount);
});

// Bidirectional W-Slice Sync + Real 4D Cross-Section Toggle
function setWSliceValue(val) {
    state.wSlice = val;
    syncWSliceUI(val);
    if (!state.showCross && state.proj !== 'slice') {
        state.showCross = true;
        document.getElementById('btn-cross-visible')?.classList.add('active');
    }
}
document.getElementById('fx-cross')?.addEventListener('input', e => setWSliceValue(parseFloat(e.target.value)));
document.getElementById('slicer-w')?.addEventListener('input', e => setWSliceValue(parseFloat(e.target.value)));

function toggleAutoSlice() {
    state.autoSlice = !state.autoSlice;
    if (state.autoSlice) state.showCross = true;
    document.getElementById('btn-cross-anim')?.classList.toggle('active', state.autoSlice);
    document.getElementById('btn-slicer-auto')?.classList.toggle('active', state.autoSlice);
    document.getElementById('btn-cross-visible')?.classList.toggle('active', state.showCross);
}
document.getElementById('btn-cross-anim')?.addEventListener('click', toggleAutoSlice);
document.getElementById('btn-slicer-auto')?.addEventListener('click', toggleAutoSlice);
document.getElementById('btn-cross-visible')?.addEventListener('click', () => {
    state.showCross = !state.showCross;
    document.getElementById('btn-cross-visible').classList.toggle('active', state.showCross);
    showToast(state.showCross ? '✂️ 4D W-Section ON' : '✂️ 4D W-Section OFF');
});

// Themes, Render Modes, Projection Modes
document.querySelectorAll('.theme-dot').forEach(btn => btn.addEventListener('click', () => setTheme(btn.dataset.theme)));

document.querySelectorAll('[data-render]').forEach(btn => {
    btn.addEventListener('click', () => {
        state.renderMode = btn.dataset.render;
        syncRenderModeUI();
        if (state.mode === 'figure') buildFigure(state.figId, state.params, state.useMorphSlider);
        else if (state.mode === 'robot') RobotEngine.rebuildStyle(scene, currentColor.getHex(), state.renderMode);
        else if (state.mode === 'photo4d') {
            const stats = Photo4DEngine.setOptions({ renderMode: state.renderMode }, scene);
            if (stats) updatePhoto4DHUD(stats);
        }
    });
});

document.querySelectorAll('[data-proj]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('[data-proj]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.proj = btn.dataset.proj;
        if (state.proj === 'slice') {
            state.showCross = true;
            document.getElementById('btn-cross-visible')?.classList.add('active');
        }
        if (state.mode === 'figure') buildFigure(state.figId, state.params, state.useMorphSlider);
    });
});

// Stage Actions: Reset, Burst, Morph, Random
document.getElementById('btn-reset-view')?.addEventListener('click', () => {
    camera.position.set(0.35, 0.55, 4.35);
    controls.reset();
    rotAngles = { xy: 0.25, xz: 0, xw: 0.35, yz: 0, yw: 0, zw: 0.2 };
});
document.getElementById('btn-explode')?.addEventListener('click', () => {
    state.burstT = 0;
    HyperTunnel.trigger();
});
document.getElementById('btn-morph')?.addEventListener('click', () => {
    const cats = Figures.getCategories();
    const cat = cats[Math.floor(Math.random() * cats.length)];
    const figs = Figures.getFiguresInCategory(cat);
    const fig = figs[Math.floor(Math.random() * figs.length)];
    if (fig) selectFigure(fig.id, cat);
});
document.getElementById('btn-randomize')?.addEventListener('click', () => {
    const cats = Figures.getCategories();
    const cat = cats[Math.floor(Math.random() * cats.length)];
    const figs = Figures.getFiguresInCategory(cat);
    const fig = figs[Math.floor(Math.random() * figs.length)];
    const tKeys = Object.keys(THEMES);
    setTheme(tKeys[Math.floor(Math.random() * tKeys.length)]);
    if (fig) selectFigure(fig.id, cat);
});

// Morph A <-> B
document.getElementById('morph-fig-a')?.addEventListener('change', e => MorphSlider.setFigures(e.target.value, document.getElementById('morph-fig-b')?.value));
document.getElementById('morph-fig-b')?.addEventListener('change', e => MorphSlider.setFigures(document.getElementById('morph-fig-a')?.value, e.target.value));
document.getElementById('morph-alpha')?.addEventListener('input', e => {
    const v = parseFloat(e.target.value);
    MorphSlider.setAlpha(v);
    document.getElementById('morph-alpha-val').textContent = v.toFixed(2);
    state.useMorphSlider = v > 0.005 && v < 0.995;
    if (state.mode !== 'figure') {
        clearAllModes();
        state.mode = 'figure';
    }
    buildFigure(v >= 0.995 ? MorphSlider.getFigB() : MorphSlider.getFigA(), state.params, state.useMorphSlider);
});

// ═══════════════════════════════════════════════════════════════════════════
// UNIFIED EXPORT SUITE HANDLERS (GLB, STL, OBJ, AR, VIDEO, REEL, PNG, HTML, .SP4DFIG)
// ═══════════════════════════════════════════════════════════════════════════
const exportModal = document.getElementById('export-modal');
document.getElementById('btn-open-export')?.addEventListener('click', () => exportModal.classList.add('open'));
document.getElementById('btn-export-close')?.addEventListener('click', () => exportModal.classList.remove('open'));
exportModal?.addEventListener('click', (e) => { if (e.target === exportModal) exportModal.classList.remove('open'); });

document.getElementById('btn-export-glb')?.addEventListener('click', () => {
    const groups = getActiveExportGroups();
    if (!groups.length) { showToast('⚠️ No 3D figure loaded'); return; }
    window.StudiosProGate.requireExport('glb', async () => {
        try {
            const res = await Export4D.exportGLB(groups, getExportBaseName());
            showToast(`🗿 GLB exported (${Math.round(res.bytes / 1024)} KB • ${res.triangles.toLocaleString()} tris)!`);
            exportModal.classList.remove('open');
        } catch (err) {
            console.error(err);
            showToast('❌ GLB export failed: ' + err.message);
        }
    });
});

document.getElementById('btn-export-stl')?.addEventListener('click', () => {
    const groups = getActiveExportGroups();
    if (!groups.length) { showToast('⚠️ No 3D figure loaded'); return; }
    window.StudiosProGate.requireExport('stl', () => {
        const res = Export4D.exportSTL(groups, getExportBaseName());
        if (res.ok) {
            showToast(`🖨️ STL exported (${Math.round(res.bytes / 1024)} KB • ${res.triangles.toLocaleString()} tris)!`);
            exportModal.classList.remove('open');
        } else {
            showToast('❌ STL error: ' + res.error);
        }
    });
});

document.getElementById('btn-export-obj')?.addEventListener('click', () => {
    const groups = getActiveExportGroups();
    if (!groups.length) { showToast('⚠️ No 3D figure loaded'); return; }
    window.StudiosProGate.requireExport('obj', () => {
        const res = Export4D.exportOBJ(groups, getExportBaseName());
        if (res.ok) {
            showToast(`📐 OBJ exported (${Math.round(res.bytes / 1024)} KB • ${res.triangles.toLocaleString()} tris)!`);
            exportModal.classList.remove('open');
        } else {
            showToast('❌ OBJ error: ' + res.error);
        }
    });
});

async function launchARViewer() {
    const groups = getActiveExportGroups();
    if (!groups.length) { showToast('⚠️ No 3D figure loaded'); return; }
    exportModal.classList.remove('open');
    showToast('📱 Preparing Solid PBR GLB for AR Viewer…', 2000);
    try {
        const placement = (state.mode === 'photo4d' && !Photo4DEngine.getOptions().doubleSided) ? 'wall' : 'floor';
        const res = await Export4D.openInARViewer(groups, getExportBaseName(), placement);
        showToast(`📱 Sent ${res.name} (${Math.round(res.bytes / 1024)} KB) to AR Viewer!`);
    } catch (err) {
        console.error(err);
        showToast('❌ AR handoff error: ' + err.message);
    }
}
document.getElementById('btn-preview-ar')?.addEventListener('click', launchARViewer);
document.getElementById('btn-modal-ar')?.addEventListener('click', launchARViewer);

document.getElementById('btn-export-html')?.addEventListener('click', () => {
    const groups = getActiveExportGroups();
    if (!groups.length) { showToast('⚠️ No 3D figure loaded'); return; }
    window.StudiosProGate.requireExport('html', async () => {
        try {
            const title = document.getElementById('hud-name')?.textContent || '4D Sculpture';
            const res = await Export4D.exportInteractiveHTML(groups, getExportBaseName(), title);
            showToast(`🌐 Interactive HTML exported (${Math.round(res.bytes / 1024)} KB)!`);
            exportModal.classList.remove('open');
        } catch (err) {
            console.error(err);
            showToast('❌ HTML export failed: ' + err.message);
        }
    });
});

// PNG Quick & HQ/Transparent
function runPNGExport(scale = 1, transparent = false) {
    window.StudiosProGate.requireExport('png', () => {
        const res = Export4D.exportPNG(renderer, scene, camera, composer, {
            scale, transparent, baseName: getExportBaseName(), gridHelper,
        });
        const count = Gallery.saveDataURL(res.dataURL, getExportBaseName(), state.theme);
        showToast(`📸 PNG ${res.width}×${res.height}${transparent ? ' Alpha' : ''} saved! (Gallery ${count}/12)`);
        exportModal.classList.remove('open');
    });
}
document.getElementById('btn-screenshot')?.addEventListener('click', () => runPNGExport(1, false));
document.getElementById('btn-export-png-hq')?.addEventListener('click', () => {
    const scale = parseInt(document.getElementById('png-scale-select')?.value || '2', 10);
    const transparent = !!document.getElementById('png-transparent')?.checked;
    runPNGExport(scale, transparent);
});

// Video Recording (NEVER paywalls Stop!) + 1-Click 360° 4D Turntable Reel
function toggleVideoRecord() {
    if (Export4D.isRecording()) {
        state.reelOrbiting = false;
        Export4D.stopRecording();
        document.getElementById('btn-rec')?.classList.remove('recording');
        document.getElementById('rec-overlay').style.display = 'none';
        return;
    }
    window.StudiosProGate.requireExport('video', () => {
        exportModal.classList.remove('open');
        const ok = Export4D.startRecording(renderer, MusicEngine, getExportBaseName(), (info) => {
            showToast(`🎬 Video exported (${Math.round(info.bytes / 1024)} KB .${info.ext})!`);
        });
        if (ok) {
            document.getElementById('btn-rec')?.classList.add('recording');
            document.getElementById('rec-overlay').style.display = 'flex';
            showToast('🔴 Recording 60fps Video + Audio… Click REC to stop.');
        }
    });
}
document.getElementById('btn-rec')?.addEventListener('click', toggleVideoRecord);
document.getElementById('btn-modal-video')?.addEventListener('click', toggleVideoRecord);

function record360Reel() {
    if (Export4D.isRecording()) { toggleVideoRecord(); return; }
    window.StudiosProGate.requireExport('reel360', () => {
        exportModal.classList.remove('open');
        state.animating = true;
        state.reelOrbiting = true;
        state.reelStartTime = Date.now();
        state.reelStartAngle = Math.atan2(camera.position.x, camera.position.z);
        Export4D.startRecording(renderer, MusicEngine, `${getExportBaseName()}_360reel`, (info) => {
            showToast(`🎥 360° 4D Reel exported (${Math.round(info.bytes / 1024)} KB .${info.ext})!`);
        });
        document.getElementById('btn-rec')?.classList.add('recording');
        document.getElementById('rec-overlay').style.display = 'flex';
        showToast('🎥 Recording 6s 360° 4D Turntable Reel…', 3000);
        setTimeout(() => {
            state.reelOrbiting = false;
            if (Export4D.isRecording()) toggleVideoRecord();
        }, 6100);
    });
}
document.getElementById('btn-reel-360')?.addEventListener('click', record360Reel);
document.getElementById('btn-modal-reel')?.addEventListener('click', record360Reel);

// FREE Project Save / Load (.sp4dfig)
document.getElementById('btn-save-project')?.addEventListener('click', () => {
    const payload = {
        mode: state.mode, figId: state.figId, cat: state.cat, theme: state.theme,
        renderMode: state.renderMode, proj: state.proj, animMode: state.animMode,
        speed: state.speed, glow: state.glow, rotation: state.rotation, params: state.params,
        wSlice: state.wSlice,
        photo4d: state.mode === 'photo4d' ? {
            opts: Photo4DEngine.getOptions(),
            name: Photo4DEngine.getName(),
            imageDataURL: Photo4DEngine.exportDataURL(),
        } : null,
    };
    const res = Export4D.saveProject(payload, getExportBaseName());
    showToast(`💾 Project .sp4dfig saved (${Math.round(res.bytes / 1024)} KB — FREE)!`);
});

const projLoadInput = document.getElementById('project-load-input');
document.getElementById('btn-load-project')?.addEventListener('click', () => projLoadInput && projLoadInput.click());
projLoadInput?.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
        const d = await Export4D.loadProject(file);
        if (d.params) Object.assign(state.params, d.params);
        if (d.rotation) Object.assign(state.rotation, d.rotation);
        if (d.renderMode) { state.renderMode = d.renderMode; syncRenderModeUI(); }
        if (d.theme) setTheme(d.theme);
        if (d.mode === 'photo4d' && d.photo4d && d.photo4d.imageDataURL) {
            Photo4DEngine.setOptions(d.photo4d.opts || {});
            clearAllModes();
            state.mode = 'photo4d';
            state.cat = 'photo4d';
            const stats = await Photo4DEngine.loadFromDataURL(d.photo4d.imageDataURL, scene, d.photo4d.name || 'photo-4d');
            updatePhoto4DHUD(stats);
            syncCategoryTabUI('photo4d');
        } else if (d.mode === 'robot') {
            selectRobot(d.figId || 'sentinel');
        } else {
            selectFigure(d.figId || 'tesseract', d.cat || 'polytopes');
        }
        exportModal.classList.remove('open');
        showToast('📂 Project .sp4dfig loaded!');
    } catch (err) {
        showToast('❌ ' + err.message);
    }
    projLoadInput.value = '';
});

// ── PRO TOOLS BAR & CREATIVE MODALS ────────────────────────────────────────
document.getElementById('btn-mouse-gravity')?.addEventListener('click', () => {
    const on = !MouseGravity.isEnabled();
    MouseGravity.toggle(on);
    document.getElementById('btn-mouse-gravity').classList.toggle('active', on);
    if (!on && fxGroup && fxGroup.userData.verts4d && fxGroup.userData.baseVerts4d) {
        MouseGravity.restore(fxGroup.userData.verts4d, fxGroup.userData.baseVerts4d);
    }
    showToast(on ? '🧲 Mouse Gravity ON' : '🧲 Mouse Gravity OFF');
});
document.getElementById('btn-repel')?.addEventListener('click', () => {
    const on = !document.getElementById('btn-repel').classList.contains('active');
    MouseGravity.setRepel(on);
    document.getElementById('btn-repel').classList.toggle('active', on);
    showToast(on ? '↔️ Repel Mode ON' : '↔️ Attract Mode ON');
});
container.addEventListener('mousemove', e => {
    if (MouseGravity.isEnabled()) MouseGravity.setMouseWorld(e, camera, container);
});

document.getElementById('btn-creature-ai')?.addEventListener('click', () => {
    const on = !CreatureAI.isEnabled();
    CreatureAI.toggle(on);
    document.getElementById('btn-creature-ai').classList.toggle('active', on);
    showToast(on ? '🧬 Creature AI Evolution ON' : '🧬 Creature AI OFF');
});
document.getElementById('btn-reactive-bg')?.addEventListener('click', () => {
    const on = !ReactiveBG.isEnabled();
    ReactiveBG.toggle(on);
    document.getElementById('btn-reactive-bg').classList.toggle('active', on);
    renderer.setClearColor(on ? 0x000000 : 0x050713, on ? 0 : 1);
    showToast(on ? '🌊 Reactive Shader BG ON' : '🌊 Studio Dark BG');
});
document.getElementById('btn-chroma-abr')?.addEventListener('click', () => {
    const on = !document.getElementById('btn-chroma-abr').classList.contains('active');
    if (chromaPass) chromaPass.uniforms.amount.value = on ? 0.004 : 0;
    document.getElementById('fx-chroma').value = on ? 0.004 : 0;
    document.getElementById('fx-chroma-val').textContent = on ? '0.004' : '0.000';
    document.getElementById('btn-chroma-abr').classList.toggle('active', on);
});

// Music Drawer
document.getElementById('btn-music-toggle')?.addEventListener('click', () => {
    const d = document.getElementById('music-drawer');
    const vis = d.style.display !== 'none';
    d.style.display = vis ? 'none' : 'block';
    if (!vis) buildMelodyGrid();
});
document.getElementById('btn-music-close')?.addEventListener('click', () => { document.getElementById('music-drawer').style.display = 'none'; });
document.getElementById('btn-music-stop')?.addEventListener('click', () => {
    MusicEngine.stop();
    document.getElementById('music-now-playing').style.display = 'none';
    document.querySelectorAll('.melody-btn').forEach(b => b.classList.remove('active'));
});
document.getElementById('music-vol')?.addEventListener('input', e => MusicEngine.setVolume(parseFloat(e.target.value)));
document.getElementById('music-bpm')?.addEventListener('input', e => {
    const v = parseInt(e.target.value, 10);
    MusicEngine.setBPM(v);
    document.getElementById('music-bpm-badge').textContent = `${v} BPM`;
});
document.getElementById('btn-ai-music')?.addEventListener('click', () => {
    const theme = document.getElementById('ai-theme-select').value;
    const p = MusicEngine.aiGenerate(theme);
    document.getElementById('music-now-playing').style.display = 'flex';
    document.getElementById('music-playing-name').textContent = `🤖 ${state.lang === 'fr' ? p.name_fr : p.name_en}`;
    document.getElementById('music-bpm-badge').textContent = `${p.bpm} BPM`;
    document.getElementById('music-bpm').value = p.bpm;
    showToast(`🎵 AI Track: ${p.name_en}`);
});

// Text Studio
document.getElementById('btn-text-toggle')?.addEventListener('click', () => {
    const p = document.getElementById('text-studio');
    p.style.display = p.style.display === 'none' ? 'block' : 'none';
});
let txtTimer = null;
const scheduleText = () => { clearTimeout(txtTimer); txtTimer = setTimeout(() => buildTextMesh(textState.text, textState.color), 120); };
document.getElementById('text-input')?.addEventListener('input', e => { textState.text = e.target.value; scheduleText(); });
document.getElementById('text-color')?.addEventListener('input', e => { textState.color = e.target.value; scheduleText(); });
document.getElementById('text-size')?.addEventListener('input', e => { textState.fontSize = parseInt(e.target.value, 10); scheduleText(); });
document.getElementById('text-font')?.addEventListener('change', e => { textState.fontFamily = e.target.value; scheduleText(); });
document.getElementById('btn-text-beat')?.addEventListener('click', () => {
    textState.beatSync = !textState.beatSync;
    showToast(textState.beatSync ? '🎵 Text Beat Sync ON' : '🎵 Text Beat Sync OFF');
});
document.getElementById('btn-text-clear')?.addEventListener('click', () => {
    document.getElementById('text-input').value = '';
    textState.text = '';
    buildTextMesh('', textState.color);
});

// Gallery, Share/QR, Presentation, Fullscreen, Language
document.getElementById('btn-gallery')?.addEventListener('click', () => {
    const p = document.getElementById('gallery-panel');
    const vis = p.style.display !== 'none';
    p.style.display = vis ? 'none' : 'block';
    if (!vis) Gallery.renderPanel(document.getElementById('gallery-grid'), state.lang);
});
document.getElementById('btn-gallery-close')?.addEventListener('click', () => { document.getElementById('gallery-panel').style.display = 'none'; });
document.getElementById('btn-gallery-clear')?.addEventListener('click', () => {
    Gallery.clear();
    Gallery.renderPanel(document.getElementById('gallery-grid'), state.lang);
});

const qrModal = document.getElementById('qr-modal');
document.getElementById('btn-share')?.addEventListener('click', () => {
    const url = URLShare.share(state);
    qrModal.classList.add('open');
    QRShare.generateQR(url, document.getElementById('qr-container'));
});
document.getElementById('btn-qr-close')?.addEventListener('click', () => qrModal.classList.remove('open'));
qrModal?.addEventListener('click', e => { if (e.target === qrModal) qrModal.classList.remove('open'); });
document.getElementById('btn-copy-url')?.addEventListener('click', () => {
    const url = URLShare.share(state);
    showToast('🔗 Link copied!');
    qrModal.classList.remove('open');
});

document.getElementById('btn-present')?.addEventListener('click', () => {
    const on = !PresentMode.isEnabled();
    PresentMode.toggle(on, (id, cat) => {
        const tKeys = Object.keys(THEMES);
        setTheme(tKeys[Math.floor(Math.random() * tKeys.length)]);
        selectFigure(id, cat);
    }, 5000);
    document.getElementById('btn-present').classList.toggle('active', on);
    showToast(on ? '🎬 Auto-Showcase ON' : '🎬 Auto-Showcase OFF');
});

document.getElementById('btn-fullscreen')?.addEventListener('click', () => {
    document.body.classList.toggle('fullscreen');
    onResize();
});
document.getElementById('btn-lang')?.addEventListener('click', () => {
    applyLang(state.lang === 'en' ? 'fr' : 'en');
    if (state.cat !== 'photo4d') renderFigureList(state.cat);
    populateMorphSelects();
});

// ── HYPER-SKETCH 4D MANDALA STUDIO ─────────────────────────────────────────
const sketchOverlay = document.getElementById('sketch-overlay');
let sketchCtx = null;

function redrawSketch2D() {
    const cvs = document.getElementById('sketch-canvas');
    if (!cvs || !sketchCtx) return;
    sketchCtx.clearRect(0, 0, cvs.width, cvs.height);
    const sym = SketchEngine.getSymmetry();
    const cx = cvs.width * 0.5, cy = cvs.height * 0.5;
    // Draw subtle symmetry guide axes
    if (sym > 1) {
        sketchCtx.save();
        sketchCtx.strokeStyle = 'rgba(0, 243, 255, 0.14)';
        sketchCtx.lineWidth = 1;
        for (let i = 0; i < sym; i++) {
            const a = (i / sym) * Math.PI * 2;
            sketchCtx.beginPath();
            sketchCtx.moveTo(cx, cy);
            sketchCtx.lineTo(cx + Math.cos(a) * 320, cy + Math.sin(a) * 320);
            sketchCtx.stroke();
        }
        sketchCtx.restore();
    }
    sketchCtx.strokeStyle = SketchEngine.getColor();
    sketchCtx.lineWidth = 2 + SketchEngine.getThickness() * 55;
    sketchCtx.lineCap = 'round';
    sketchCtx.lineJoin = 'round';
    const strokes = SketchEngine.getStrokes();
    for (let c = 0; c < sym; c++) {
        const a = (c / sym) * Math.PI * 2;
        const ca = Math.cos(a), sa = Math.sin(a);
        strokes.forEach(st => {
            if (st.length < 2) return;
            sketchCtx.beginPath();
            st.forEach((pt, idx) => {
                const rx = pt.x * ca - pt.y * sa;
                const ry = pt.x * sa + pt.y * ca;
                const px = ((rx + 2.2) / 4.4) * cvs.width;
                const py = ((-ry + 1.5) / 3.0) * cvs.height;
                if (idx === 0) sketchCtx.moveTo(px, py); else sketchCtx.lineTo(px, py);
            });
            sketchCtx.stroke();
        });
    }
}

function initSketchCanvas() {
    const cvs = document.getElementById('sketch-canvas');
    if (!cvs || sketchCtx) return;
    sketchCtx = cvs.getContext('2d');
    let drawing = false;

    const toSpace = (e) => {
        const rect = cvs.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 4.4 - 2.2;
        const y = -(((e.clientY - rect.top) / rect.height) * 3.0 - 1.5);
        return [x, y];
    };

    cvs.addEventListener('pointerdown', e => {
        drawing = true;
        const [x, y] = toSpace(e);
        SketchEngine.startStroke(x, y);
        redrawSketch2D();
    });
    window.addEventListener('pointerup', () => {
        if (drawing) { drawing = false; SketchEngine.endStroke(); }
    });
    cvs.addEventListener('pointermove', e => {
        if (!drawing) return;
        const [x, y] = toSpace(e);
        SketchEngine.addPoint(x, y);
        redrawSketch2D();
    });

    document.getElementById('sketch-color')?.addEventListener('input', e => { SketchEngine.setColor(e.target.value); redrawSketch2D(); });
    document.getElementById('sketch-thickness')?.addEventListener('input', e => { SketchEngine.setThickness(parseFloat(e.target.value)); redrawSketch2D(); });
    document.querySelectorAll('.sketch-preset').forEach(b => b.addEventListener('click', () => {
        SketchEngine.setColor(b.dataset.color);
        document.getElementById('sketch-color').value = b.dataset.color;
        redrawSketch2D();
    }));
    document.querySelectorAll('.sketch-style-btn').forEach(b => b.addEventListener('click', () => {
        document.querySelectorAll('.sketch-style-btn').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        SketchEngine.setStyle(b.dataset.style);
    }));
    document.querySelectorAll('.sym-btn').forEach(b => b.addEventListener('click', () => {
        document.querySelectorAll('.sym-btn').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        SketchEngine.setSymmetry(parseInt(b.dataset.sym, 10));
        redrawSketch2D();
    }));
}

document.getElementById('btn-hyper-sketch')?.addEventListener('click', () => {
    sketchOverlay.classList.add('open');
    initSketchCanvas();
    redrawSketch2D();
});
document.getElementById('btn-sketch-close')?.addEventListener('click', () => sketchOverlay.classList.remove('open'));
document.getElementById('btn-sketch-undo')?.addEventListener('click', () => { SketchEngine.undo(); redrawSketch2D(); });
document.getElementById('btn-sketch-clear')?.addEventListener('click', () => { SketchEngine.reset(); redrawSketch2D(); });
document.getElementById('btn-sketch-apply')?.addEventListener('click', () => {
    if (!SketchEngine.hasPoints()) { showToast('✏️ Draw something first!'); return; }
    clearAllModes();
    state.mode = 'sketch';
    SketchEngine.setEnabled(true);
    SketchEngine.buildGroup(scene, state.params);
    sketchOverlay.classList.remove('open');
    document.getElementById('hud-name').textContent = `🎨 Hyper-Sketch 4D (${SketchEngine.getSymmetry()}×)`;
    document.getElementById('hud-stats').textContent = `Style: ${SketchEngine.getStyle()} • Ready for GLB/STL/AR`;
    showToast('✨ Sketch lifted into 4D Sculpture!');
});

// ── MIC VOICE SCULPTOR ─────────────────────────────────────────────────────
const MicSculptor = (() => {
    let enabled = false, micCtx = null, analyser = null, data = null, stream = null;
    let smoothBass = 0, smoothMid = 0;
    const specCanvas = document.getElementById('mic-spectrum');
    const specCtx = specCanvas ? specCanvas.getContext('2d') : null;

    async function start() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            micCtx = new (window.AudioContext || window.webkitAudioContext)();
            const src = micCtx.createMediaStreamSource(stream);
            analyser = micCtx.createAnalyser();
            analyser.fftSize = 256;
            data = new Uint8Array(analyser.frequencyBinCount);
            src.connect(analyser);
            enabled = true;
            if (specCanvas) specCanvas.style.display = 'block';
            return true;
        } catch (_) {
            showToast('🚫 Microphone permission denied');
            return false;
        }
    }

    function stop() {
        enabled = false;
        if (stream) stream.getTracks().forEach(t => t.stop());
        if (micCtx) try { micCtx.close(); } catch (_) {}
        stream = null; micCtx = null; analyser = null; data = null;
        if (specCanvas) specCanvas.style.display = 'none';
    }

    function update() {
        if (!enabled || !analyser || !data) return;
        analyser.getByteFrequencyData(data);
        let bSum = 0, mSum = 0;
        for (let i = 0; i < 10; i++) bSum += data[i];
        for (let i = 10; i < 40; i++) mSum += data[i];
        smoothBass += ((bSum / 10 / 255) - smoothBass) * 0.22;
        smoothMid += ((mSum / 30 / 255) - smoothMid) * 0.18;

        if (specCtx) {
            const W = specCanvas.width, H = specCanvas.height;
            specCtx.fillStyle = 'rgba(5,8,20,0.8)';
            specCtx.fillRect(0, 0, W, H);
            const bw = W / 48;
            for (let i = 0; i < 48; i++) {
                const bh = (data[i] / 255) * H;
                specCtx.fillStyle = `hsl(${185 + i * 3}, 95%, 60%)`;
                specCtx.fillRect(i * bw, H - bh, bw - 1, bh);
            }
        }
        if (state.mode === 'figure' && fxGroup && fxGroup.userData.baseVerts4d) {
            const { verts4d, baseVerts4d } = fxGroup.userData;
            for (let i = 0; i < verts4d.length; i++) {
                const b = baseVerts4d[i], v = verts4d[i];
                const ph = (i / verts4d.length) * Math.PI * 2;
                const sc = 1 + smoothMid * 0.45;
                v[0] = b[0] * sc; v[1] = b[1] * sc; v[2] = b[2] * sc;
                v[3] = b[3] + smoothBass * 0.65 * Math.sin(ph * 3);
            }
        }
    }
    return { start, stop, update, isEnabled: () => enabled };
})();

document.getElementById('btn-mic')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-mic');
    if (MicSculptor.isEnabled()) {
        MicSculptor.stop();
        btn.classList.remove('active');
        showToast('🎤 Mic Sculptor OFF');
    } else if (await MicSculptor.start()) {
        btn.classList.add('active');
        showToast('🎤 Mic Voice Sculptor ON!');
    }
});

// ── CINEMATIC 3-ANGLE SNAPSHOT ─────────────────────────────────────────────
const CINEMATIC_ANGLES = [
    { label: 'Studio Hero', pos: [0.3, 0.5, 4.1] },
    { label: 'High Orbit',  pos: [2.7, 2.3, 2.8] },
    { label: 'Low Drama',   pos: [-2.4, -1.1, 3.4] },
];

async function runCinematicSnapshot() {
    exportModal.classList.remove('open');
    const panel = document.getElementById('cinematic-panel');
    const grid = document.getElementById('cinematic-grid');
    const figName = document.getElementById('hud-name')?.textContent || '4D';
    const savedPos = camera.position.clone();
    const savedTarget = controls.target.clone();
    grid.innerHTML = '';

    for (const ang of CINEMATIC_ANGLES) {
        const fl = document.createElement('div');
        fl.className = 'cinematic-flash';
        document.body.appendChild(fl);
        setTimeout(() => fl.remove(), 600);

        camera.position.set(ang.pos[0], ang.pos[1], ang.pos[2]);
        camera.lookAt(0, 0, 0);
        controls.update();
        await new Promise(r => setTimeout(r, 90));
        if (composer) composer.render(); else renderer.render(scene, camera);
        const url = renderer.domElement.toDataURL('image/png');

        const card = document.createElement('div');
        card.className = 'cinematic-card';
        card.innerHTML = `<img src="${url}" alt="${ang.label}"><div class="card-label">${figName} — ${ang.label}</div><button class="dl-btn" title="Download">⬇</button>`;
        card.querySelector('.dl-btn').addEventListener('click', () => {
            const a = document.createElement('a');
            a.href = url; a.download = `${getExportBaseName()}-${ang.label.replace(/\s+/g, '-')}.png`;
            a.dataset.bypassed = 'true';
            a.click();
        });
        grid.appendChild(card);
    }

    camera.position.copy(savedPos);
    controls.target.copy(savedTarget);
    controls.update();
    panel.style.display = 'flex';
}
document.getElementById('btn-cinematic')?.addEventListener('click', runCinematicSnapshot);
document.getElementById('btn-modal-cinematic')?.addEventListener('click', runCinematicSnapshot);
document.getElementById('btn-cinematic-close')?.addEventListener('click', () => { document.getElementById('cinematic-panel').style.display = 'none'; });

// ── RESIZE & CLEAN TEARDOWN ────────────────────────────────────────────────
function onResize() {
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 600;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    if (composer) composer.setSize(w, h);
}
window.addEventListener('resize', onResize);

window.FigureBuilderTeardown = () => {
    cancelAnimationFrame(rafId);
    Export4D.stopRecording();
    MicSculptor.stop();
    PresentMode.toggle(false);
    MusicEngine.dispose();
};

// Escape closes active modal
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        exportModal.classList.remove('open');
        qrModal.classList.remove('open');
        sketchOverlay.classList.remove('open');
        document.getElementById('cinematic-panel').style.display = 'none';
    }
});

// ── BOOT SEQUENCE ──────────────────────────────────────────────────────────
function startApp() {
    applyLang('en');
    renderFigureList('polytopes');
    populateMorphSelects();
    buildPresetGrid();

    if (window.location.hash && window.location.hash.length > 5) {
        try { URLShare.loadFromHash(window.location.hash, state, selectFigure, setTheme, selectRobot); }
        catch (_) { buildFigure('tesseract', state.params); }
    } else {
        buildFigure('tesseract', state.params);
    }
    onResize();
    animate();
    showToast('🌌 4D Figure Builder PRO v5.0 Ready ✨', 2800);
}

startApp();
