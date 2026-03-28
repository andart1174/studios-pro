/**
 * app.js — 4D Figure Builder PRO
 * ================================
 * Main application: Three.js scene, 4D animation, UI, i18n,
 * Video/Audio recording, Music, Robots, Aliens + PRO features.
 */

// ── Three.js Scene Setup ──────────────────────────────────────────────────
const container = document.getElementById('stage-container');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setClearColor(0x000007, 1);
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.01, 1000);
camera.position.set(0, 0, 4.5);
if (container.clientWidth > 0 && container.clientHeight > 0) {
    camera.aspect = container.clientWidth / container.clientHeight;
}
camera.updateProjectionMatrix();

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

// Bloom post-processing (optional — graceful fallback if CDN scripts fail)
let composer = null, bloomPass = null, chromaPass = null;
try {
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene, camera));
    bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(container.clientWidth, container.clientHeight), 1.2, 0.4, 0.1
    );
    composer.addPass(bloomPass);

    // Chromatic Aberration pass
    chromaPass = new THREE.ShaderPass(ChromaAbrShader);
    chromaPass.renderToScreen = true;
    composer.addPass(chromaPass);
} catch(e) {
    console.warn('Post-processing unavailable (CDN may be blocked). Using direct rendering.', e);
    composer = null; bloomPass = null; chromaPass = null;
}

// Grid
const gridHelper = new THREE.GridHelper(6, 24, 0x0a0a3a, 0x050520);
gridHelper.position.y = -1.6;
scene.add(gridHelper);

// Init extras that need scene
ReactiveBG.init(scene);
HyperTunnel.init(scene);

// ── State ──────────────────────────────────────────────────────────────────
const state = {
    figId:         'tesseract',
    cat:           'polytopes',
    isRobot:       false,
    animating:     false,
    autoSlice:     false,
    lang:          'en',
    theme:         'cyberpunk',
    renderMode:    'wireframe',
    proj:          'stereo',
    animMode:      'w-rotation',
    speed:         1.0,
    glow:          1.2,
    trail:         0.0,
    rotation:      { xy:true, xz:false, xw:true, yz:false, yw:false, zw:true },
    params:        { radius:1.0, tube:0.3, segs:24, twist:0, wOffset:0 },
    wSlice:        0,
    burstT:        -1,
    beatSyncSpeed: false,
    useMorphSlider:false,
};

const THEMES = {
    cyberpunk:  { c:'#00f3ff', g:'rgba(0,243,255,0.5)' },
    matrix:     { c:'#00ff44', g:'rgba(0,255,68,0.5)' },
    fire:       { c:'#ff5500', g:'rgba(255,85,0,0.5)' },
    ice:        { c:'#88ddff', g:'rgba(136,221,255,0.5)' },
    gold:       { c:'#ffcc00', g:'rgba(255,204,0,0.5)' },
    vaporwave:  { c:'#ff00cc', g:'rgba(255,0,204,0.5)' },
    aurora:     { c:'#44ffaa', g:'rgba(68,255,170,0.5)' },
    cosmic:     { c:'#cc88ff', g:'rgba(204,136,255,0.5)' },
};

const PRESETS_APP = [
    { name:'Quantum',  cat:'abstract',  id:'lissajous',  theme:'cyberpunk', animMode:'isoclinic',    rotXW:true, rotZW:true },
    { name:'Nature',   cat:'organic',   id:'jellyfish',  theme:'aurora',    animMode:'breathing',    rotXY:true },
    { name:'Inferno',  cat:'aliens',    id:'rift',       theme:'fire',      animMode:'w-rotation',   rotXW:true, rotZW:true },
    { name:'Vortex',   cat:'abstract',  id:'spiral4d',  theme:'vaporwave', animMode:'kaleidoscope', rotXY:true, rotZW:true },
    { name:'Mystic',   cat:'surfaces',  id:'hopf',       theme:'cosmic',    animMode:'double',       rotXW:true, rotYW:true },
    { name:'Freeze',   cat:'polytopes', id:'cell24',     theme:'ice',       animMode:'w-rotation',   rotXY:true },
    { name:'Blossom',  cat:'aliens',    id:'amoeba',     theme:'aurora',    animMode:'breathing',    rotXY:true },
    { name:'Cosmos',   cat:'aliens',    id:'vortexeye',  theme:'cosmic',    animMode:'isoclinic',    rotXW:true },
    { name:'DNA',      cat:'organic',   id:'neural',     theme:'matrix',    animMode:'morph-loop',   rotXY:true },
    { name:'Web',      cat:'aliens',    id:'tendril',    theme:'vaporwave', animMode:'kaleidoscope', rotXY:true },
    { name:'Knot',     cat:'surfaces',  id:'torusknot',  theme:'gold',      animMode:'double',       rotXW:true },
    { name:'Klein',    cat:'surfaces',  id:'klein',      theme:'fire',      animMode:'w-rotation',   rotXZ:true },
];

let currentColor = new THREE.Color(THEMES.cyberpunk.c);
let rotAngles = { xy:0, xz:0, xw:0, yz:0, yw:0, zw:0 };

let fxGroup = null;
let baseVerts4d = null; // unmodified verts for mouse gravity
let particleCount = 200;
let particles;

function buildParticles(count) {
    if (particles) scene.remove(particles);
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        pos[i*3]   = (Math.random()-0.5)*12;
        pos[i*3+1] = (Math.random()-0.5)*8;
        pos[i*3+2] = (Math.random()-0.5)*10;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: currentColor, size: 0.03, transparent:true, opacity:0.6, blending:THREE.AdditiveBlending });
    particles = new THREE.Points(geo, mat);
    scene.add(particles);
}
buildParticles(200);

// ── Build 4D Figure ────────────────────────────────────────────────────────
function buildFigure(id, params, fromMorph = false) {
    if (fxGroup) { scene.remove(fxGroup); fxGroup = null; }

    let fig;
    if (fromMorph && state.useMorphSlider) {
        fig = MorphSlider.computeMorphed(params, MorphSlider.getAlpha());
        if (!fig) { fig = Figures.generate(id, params); }
    } else {
        fig = Figures.generate(id, params);
    }

    if (!fig || !Array.isArray(fig.verts)) {
        console.error('Invalid figure data', fig);
        return { verts4d: [], edges: [], col: new THREE.Color() };
    }

    const verts4d = fig.verts.map(v => [...v]);
    const edges = fig.edges || [];
    const faces = fig.faces || [];
    const col = new THREE.Color(fig.color || currentColor.getStyle());
    const n = verts4d.length;

    fxGroup = new THREE.Group();
    fxGroup.userData = { verts4d, edges, faces, fig, baseVerts4d: fig.verts.map(v => [...v]) };

    const positions = new Float32Array(edges.length * 2 * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    let mat;
    if (state.renderMode === 'ghost') {
        mat = new THREE.LineBasicMaterial({ color: col, transparent:true, opacity:0.3, blending:THREE.AdditiveBlending });
    } else if (state.renderMode === 'hologram') {
        mat = new THREE.LineBasicMaterial({ color: 0x00ffcc, transparent:true, opacity:0.7, blending:THREE.AdditiveBlending });
    } else {
        mat = new THREE.LineBasicMaterial({ color: col, transparent:true, opacity:0.92, blending:THREE.AdditiveBlending });
    }

    const lineSegs = new THREE.LineSegments(geo, mat);
    fxGroup.add(lineSegs);
    fxGroup.userData.lineSeg   = lineSegs;
    fxGroup.userData.positions = positions;
    scene.add(fxGroup);

    // HUD
    document.getElementById('hud-name').textContent = state.lang === 'fr' ? (fig.name_fr || fig.name_en) : fig.name_en;
    document.getElementById('hud-stats').textContent = `V:${n} | E:${edges.length}`;
    document.getElementById('info-text').textContent = state.lang === 'fr' ? (fig.desc_fr || fig.desc_en) : fig.desc_en;

    // Figure DNA
    const dna = FigureDNA.getHash(id);
    const dnaBar = document.getElementById('fig-dna');
    const dnaDot = document.getElementById('hud-dna-dot');
    if (dnaBar) {
        dnaBar.style.display = 'flex';
        const dnaCanvas = document.getElementById('dna-canvas');
        if (dnaCanvas) {
            const ctx = dnaCanvas.getContext('2d');
            const grad = ctx.createLinearGradient(0,0,220,0);
            grad.addColorStop(0, dna.css);
            grad.addColorStop(0.5, '#ffffff22');
            grad.addColorStop(1, currentColor.getStyle());
            ctx.clearRect(0,0,220,16);
            ctx.fillStyle = grad;
            ctx.fillRect(0,4,220,8);
            ctx.fillStyle = dna.css;
            for (let i = 0; i < 220; i += 8) { ctx.fillRect(i, 0, 3, 16); }
        }
        const dnaHash = document.getElementById('dna-hash');
        if (dnaHash) dnaHash.textContent = '#' + id.split('').map(c => c.charCodeAt(0).toString(16)).join('').slice(0,6);
    }
    if (dnaDot) dnaDot.style.background = dna.css;

    // Reactive background colors
    ReactiveBG.setColors(dna.hex, currentColor.getStyle());

    return { verts4d, edges, col };
}

// ── 4D Rotation ───────────────────────────────────────────────────────────
function rotate4D(v, angles) {
    let [x, y, z, w] = v;
    if (state.rotation.xy) { const c=Math.cos(angles.xy),s=Math.sin(angles.xy); [x,y]=[c*x-s*y,s*x+c*y]; }
    if (state.rotation.xz) { const c=Math.cos(angles.xz),s=Math.sin(angles.xz); [x,z]=[c*x-s*z,s*x+c*z]; }
    if (state.rotation.xw) { const c=Math.cos(angles.xw),s=Math.sin(angles.xw); [x,w]=[c*x-s*w,s*x+c*w]; }
    if (state.rotation.yz) { const c=Math.cos(angles.yz),s=Math.sin(angles.yz); [y,z]=[c*y-s*z,s*y+c*z]; }
    if (state.rotation.yw) { const c=Math.cos(angles.yw),s=Math.sin(angles.yw); [y,w]=[c*y-s*w,s*y+c*w]; }
    if (state.rotation.zw) { const c=Math.cos(angles.zw),s=Math.sin(angles.zw); [z,w]=[c*z-s*w,s*z+c*w]; }
    return [x, y, z, w];
}

function project4Dto3D(v4) {
    if (state.proj === 'ortho') return new THREE.Vector3(v4[0], v4[1], v4[2]);
    const dist = 3, d = dist - v4[3];
    if (Math.abs(d) < 0.001) return new THREE.Vector3(0,0,0);
    const fac = dist / d;
    return new THREE.Vector3(v4[0]*fac, v4[1]*fac, v4[2]*fac);
}

// ── Animation Loop ─────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    const t  = clock.elapsedTime;
    const sp = state.speed;

    // Rotation angles
    if (state.animating) {
        const r = state.rotation;
        const base = dt * sp;
        switch (state.animMode) {
            case 'w-rotation':  if(r.xy)rotAngles.xy+=base*.5; if(r.xw)rotAngles.xw+=base*1.2; if(r.zw)rotAngles.zw+=base*.7; break;
            case 'double':      if(r.xy)rotAngles.xy+=base*.8; if(r.xw)rotAngles.xw+=base*.8; if(r.yz)rotAngles.yz+=base*.5; if(r.zw)rotAngles.zw+=base*.5; break;
            case 'breathing':   if(r.xw)rotAngles.xw+=base*.4; if(r.yw)rotAngles.yw+=base*.4; state.params.wOffset=Math.sin(t*sp*1.5)*.6; break;
            case 'kaleidoscope':Object.keys(rotAngles).forEach(k=>{if(r[k])rotAngles[k]+=base*(.4+Math.sin(t*.7)*.3);}); break;
            case 'morph-loop':  if(r.xw)rotAngles.xw+=base*.6; if(r.zw)rotAngles.zw+=base*.4; state.params.twist=Math.sin(t*sp)*2; break;
            case 'isoclinic':   if(r.xy||r.zw){rotAngles.xy+=base*.9;rotAngles.zw+=base*.9;} if(r.xw||r.yz){rotAngles.xw+=base*.9;rotAngles.yz+=base*.9;} break;
            default:            if(r.xw)rotAngles.xw+=base;
        }
    }

    // Auto-slicer
    if (state.autoSlice) {
        state.wSlice = Math.sin(t * 0.5 * sp) * 2.2;
        const sw = document.getElementById('slicer-w');
        const sv = document.getElementById('slicer-val');
        if (sw) sw.value = state.wSlice;
        if (sv) sv.textContent = `W = ${state.wSlice.toFixed(3)}`;
    }

    // Robot update
    if (state.isRobot) {
        try { RobotEngine.update(dt, sp); } catch(e) { console.error("Robot update failed", e); }
    }

    // Beat power for reactive FX
    const beat = MusicEngine.getBeatPower();

    // Reactive background
    ReactiveBG.update(t, beat);

    // Beat-sync animation speed
    if (state.animating && state.beatSyncSpeed && MusicEngine.isPlaying()) {
        const bpm = MusicEngine.getCurrentBpm();
        state.speed = Math.max(0.3, Math.min(3.0, bpm / 120));
        const sv = document.getElementById('fx-speed-val');
        if (sv) sv.textContent = state.speed.toFixed(1);
    }

    // Creature AI
    if (CreatureAI.isEnabled() && !state.isRobot) {
        CreatureAI.update(dt, state.params, buildFigure, state.figId);
    }

    // Mic Voice Sculptor
    if (typeof MicSculptor !== 'undefined') {
        try { MicSculptor.update(dt); } catch(e) { console.error("MicSculptor update failed", e); }
    }

    // Hyperspace tunnel
    HyperTunnel.update(dt);

    // Hyper-Sketch updates
    if (SketchEngine.isEnabled()) {
        const geom = SketchEngine.getGeometry(t, state.params);
        if (geom.verts.length > 1) {
            updateSketchMesh(geom);
        }
    }

    // Update 4D figure geometry
    if (fxGroup && !state.isRobot && !SketchEngine.isEnabled()) {
        const { verts4d, edges, lineSeg, positions, baseVerts4d: localBase } = fxGroup.userData;
        if (lineSeg && verts4d && edges) {
            // Mouse gravity distortion
            if (MouseGravity.isEnabled() && localBase) {
                MouseGravity.applyGravity(verts4d, localBase, rotAngles, project4Dto3D, rotate4D);
            }

            const proj = verts4d.map(v => project4Dto3D(rotate4D(v, rotAngles)));
            edges.forEach((e, i) => {
                const a = proj[e[0]], b = proj[e[1]];
                if (!a || !b) return;
                positions[i*6]   = a.x; positions[i*6+1] = a.y; positions[i*6+2] = a.z;
                positions[i*6+3] = b.x; positions[i*6+4] = b.y; positions[i*6+5] = b.z;
            });
            lineSeg.geometry.attributes.position.needsUpdate = true;

            // Burst
            if (state.burstT >= 0) {
                const bt = state.burstT;
                fxGroup.scale.setScalar(Math.max(0.01, bt < 0.5 ? 1 + bt * 4 : 5 - bt * 4));
                state.burstT += dt * 2;
                if (state.burstT > 2) { state.burstT = -1; fxGroup.scale.setScalar(1); }
            }
        }
    }

    // Particles drift + beat-reactive scale
    if (particles) {
        particles.rotation.y += dt * 0.02;
        particles.rotation.x += dt * 0.005;
        const beatScale = 1 + beat * 0.4;
        particles.material.size = 0.03 * beatScale;
    }

    // Dancing text
    updateTextBeat(dt, t);

    // Render
    if (bloomPass) bloomPass.strength = state.glow;
    if (chromaPass) chromaPass.uniforms.angle.value = t * 0.3;

    if (composer) {
        try {
            composer.render();
        } catch (e) {
            console.error('Composer failed, falling back to basic renderer', e);
            composer = null; // Disable permanently
            renderer.render(scene, camera);
        }
    } else {
        renderer.render(scene, camera);
    }
    controls.update();

    // REC timer
    if (recState.recording && recState.startTime) {
        const sec = Math.floor((Date.now() - recState.startTime) / 1000);
        const el = document.getElementById('rec-timer');
        if (el) el.textContent = `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;
    }
}

// ── Video Recording (audio + video) ────────────────────────────────────────
const recState = { recording:false, recorder:null, chunks:[], startTime:null };

function startRec() {
    const canvasStream = renderer.domElement.captureStream(30);
    let combinedStream = canvasStream;
    try {
        const audioStream = MusicEngine.getAudioStream();
        if (audioStream && audioStream.getAudioTracks().length > 0) {
            combinedStream = new MediaStream([...canvasStream.getVideoTracks(), ...audioStream.getAudioTracks()]);
        }
    } catch(e) {}

    recState.chunks = [];
    const mimeTypes = ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
    let opts = {};
    for (const m of mimeTypes) { if (MediaRecorder.isTypeSupported(m)) { opts = { mimeType: m }; break; } }
    try { recState.recorder = new MediaRecorder(combinedStream, opts); }
    catch(e) { recState.recorder = new MediaRecorder(combinedStream); }

    recState.recorder.ondataavailable = e => { if (e.data.size > 0) recState.chunks.push(e.data); };
    recState.recorder.onstop = () => {
        const blob = new Blob(recState.chunks, { type:'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `4d-${state.figId}-${Date.now()}.webm`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(state.lang==='fr' ? '✅ Vidéo+Audio exportés!' : '✅ Video+Audio exported!');
    };
    recState.recorder.start(100);
    recState.recording = true;
    recState.startTime = Date.now();
    document.getElementById('btn-rec').classList.add('recording');
    document.getElementById('rec-overlay').style.display = 'flex';
    showToast(state.lang==='fr' ? '🔴 Enregistrement...' : '🔴 Recording (audio+video)...');
}

function stopRec() {
    if (recState.recorder && recState.recording) {
        recState.recorder.stop();
        recState.recording = false; recState.startTime = null;
        document.getElementById('btn-rec').classList.remove('recording');
        document.getElementById('rec-overlay').style.display = 'none';
    }
}

// ── Dancing Text System ─────────────────────────────────────────────────────
const textState = { 
    mesh:null, canvas:null, ctx2d:null, texture:null, 
    text:'', color:'#ff88cc', 
    fontSize: 160, fontFamily: "'Outfit', sans-serif",
    beatSync:true, scaleY:1, phase:0 
};

function buildTextMesh(text, color) {
    if (textState.mesh) { scene.remove(textState.mesh); textState.mesh = null; }
    if (!text.trim()) return;
    const W = 1024, H = 256;
    if (!textState.canvas) {
        textState.canvas = document.createElement('canvas');
        textState.canvas.width = W; textState.canvas.height = H;
        textState.ctx2d = textState.canvas.getContext('2d');
    }
    const ctx = textState.ctx2d;
    ctx.clearRect(0,0,W,H);
    
    // Use user-defined font size and family
    const fSize = textState.fontSize || Math.min(160, Math.floor(W * 0.14));
    const fFamily = textState.fontFamily || "'Outfit', sans-serif";
    
    ctx.font = `800 ${fSize}px ${fFamily}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = color; ctx.shadowBlur = 28;
    for (let i=0;i<3;i++) { ctx.fillStyle = color+'55'; ctx.fillText(text,W/2,H/2); }
    ctx.shadowBlur = 0; ctx.fillStyle = '#ffffff';
    ctx.fillText(text, W/2, H/2);
    if (textState.texture) textState.texture.dispose();
    textState.texture = new THREE.CanvasTexture(textState.canvas);
    const geo = new THREE.PlaneGeometry(4, 1);
    const mat = new THREE.MeshBasicMaterial({ map:textState.texture, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide });
    textState.mesh = new THREE.Mesh(geo, mat);
    textState.mesh.position.set(0,0,0.1);
    scene.add(textState.mesh);
}

function updateTextBeat(dt, t) {
    if (!textState.mesh) return;
    const beat = MusicEngine.getBeatPower();
    const bpm  = MusicEngine.getCurrentBpm();
    if (textState.beatSync && MusicEngine.isPlaying()) {
        const sy = 1 + beat * 1.8; textState.scaleY += (sy - textState.scaleY) * 0.3;
        textState.phase += dt * (bpm / 60) * Math.PI * 2;
        const bobY = Math.sin(textState.phase) * beat * 0.4;
        const bobX = Math.cos(textState.phase * 0.5) * beat * 0.15;
        textState.mesh.scale.set(1 + beat * 0.5, textState.scaleY, 1);
        textState.mesh.position.set(bobX, bobY, 0.1);
        textState.mesh.rotation.z = Math.sin(textState.phase * 0.3) * beat * 0.12;
    } else {
        textState.mesh.position.y = Math.sin(t * 0.8) * 0.15;
        textState.mesh.rotation.z = Math.sin(t * 0.5) * 0.04;
        textState.mesh.scale.set(1,1,1);
    }
}

// ── UI Helpers ─────────────────────────────────────────────────────────────
function showToast(msg, dur = 2500) {
    let el = document.getElementById('toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); }
    el.textContent = msg; el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), dur);
}

function setTheme(name) {
    state.theme = name;
    const th = THEMES[name] || THEMES.cyberpunk;
    currentColor = new THREE.Color(th.c);
    if (fxGroup) fxGroup.children.forEach(c => { if (c.material) c.material.color.set(currentColor); });
    if (particles) particles.material.color.set(currentColor);
    document.querySelectorAll('.theme-dot').forEach(b => b.classList.toggle('active', b.dataset.theme === name));
    ReactiveBG.setColors(currentColor.getStyle(), currentColor.getStyle());
}

function selectFigure(id, cat) {
    if (state.figId === id && !state.isRobot && !SketchEngine.isEnabled()) return;
    state.figId = id;
    state.cat = cat;
    state.isRobot = false;
    SketchEngine.setEnabled(false);
    if (sketchGroup) { scene.remove(sketchGroup); sketchGroup = null; }
    state.useMorphSlider = false;
    if (fxGroup) { scene.remove(fxGroup); fxGroup = null; }
    RobotEngine.remove(scene);
    buildFigure(id, state.params);
    document.querySelectorAll('.fig-item').forEach(el => el.classList.toggle('active', el.dataset.id === id));
}

function selectRobot(id) {
    state.isRobot = true; state.figId = id; state.useMorphSlider = false;
    SketchEngine.setEnabled(false);
    if (sketchGroup) { scene.remove(sketchGroup); sketchGroup = null; }
    if (fxGroup) { scene.remove(fxGroup); fxGroup = null; }
    const def = RobotEngine.build(id, scene);
    document.getElementById('hud-name').textContent = state.lang==='fr' ? def.name_fr : def.name_en;
    document.getElementById('hud-stats').textContent = state.lang==='fr' ? def.desc_fr : def.desc_en;
    document.getElementById('info-text').textContent = state.lang==='fr' ? def.desc_fr : def.desc_en;
    document.querySelectorAll('.fig-item').forEach(el => el.classList.toggle('active', el.dataset.id === id));
}

// ── Figure List ────────────────────────────────────────────────────────────
function renderFigureList(cat) {
    const list = document.getElementById('figure-list');
    list.innerHTML = '';
    if (cat === 'robots') {
        RobotEngine.getRobotDefs().forEach((def, i) => {
            const el = document.createElement('div');
            el.className = 'fig-item' + (state.figId === def.id && state.isRobot ? ' active' : '');
            el.dataset.id = def.id;
            el.style.animationDelay = (i * 0.06) + 's';
            el.innerHTML = `<div class="fig-icon" style="background:rgba(255,204,0,0.15);">${def.icon}</div>
                <div class="fig-info"><span class="fig-name">${state.lang==='fr'?def.name_fr:def.name_en}</span><span class="fig-meta">Animated 3D</span></div>`;
            el.addEventListener('click', () => selectRobot(def.id));
            list.appendChild(el);
        });
        return;
    }
    const figs = Figures.getFiguresInCategory(cat);
    figs.forEach((fig, i) => {
        let data, dna;
        try {
            data = Figures.generate(fig.id, state.params);
            dna = FigureDNA.getHash(fig.id);
        } catch(e) {
            data = { icon: '⬡', color: '#00f3ff', name_en: fig.id, name_fr: fig.id, verts: [], edges: [] };
            dna = { css: '#00f3ff' };
        }
        const el = document.createElement('div');
        el.className = 'fig-item' + (state.figId === fig.id && !state.isRobot ? ' active' : '');
        el.dataset.id = fig.id;
        el.style.animationDelay = (i * 0.06) + 's';
        el.innerHTML = `<div class="fig-icon" style="background:${data.color}22;border-color:${dna.css}44;">${data.icon}</div>
            <div class="fig-info"><span class="fig-name">${state.lang==='fr'?data.name_fr:data.name_en}</span>
            <span class="fig-meta">V:${data.verts.length} E:${data.edges.length}</span></div>`;
        el.addEventListener('click', () => selectFigure(fig.id, cat));
        list.appendChild(el);
    });
}

// ── Morph Select Populate ─────────────────────────────────────────────────
function populateMorphSelects() {
    const allFigs = [];
    Figures.getCategories().forEach(cat => {
        Figures.getFiguresInCategory(cat).forEach(f => {
            const d = Figures.generate(f.id, state.params);
            allFigs.push({ id: f.id, label: d.name_en });
        });
    });
    ['morph-fig-a','morph-fig-b'].forEach((sid, idx) => {
        const sel = document.getElementById(sid);
        if (!sel) return;
        sel.innerHTML = '';
        allFigs.forEach((f, i) => {
            const opt = document.createElement('option');
            opt.value = f.id; opt.textContent = f.label;
            if (i === idx * Math.floor(allFigs.length / 2)) opt.selected = true;
            sel.appendChild(opt);
        });
    });
    MorphSlider.setFigures(
        document.getElementById('morph-fig-a')?.value,
        document.getElementById('morph-fig-b')?.value
    );
}

// ── Preset Grid ────────────────────────────────────────────────────────────
function buildPresetGrid() {
    const grid = document.getElementById('preset-grid');
    grid.innerHTML = '';
    PRESETS_APP.forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'preset-btn';
        btn.textContent = p.name;
        btn.addEventListener('click', () => {
            selectFigure(p.id, p.cat);
            setTheme(p.theme);
            state.animMode = p.animMode;
            const am = document.getElementById('anim-mode');
            if (am) am.value = p.animMode;
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            showToast(`${p.name} loaded`);
        });
        grid.appendChild(btn);
    });
}
buildPresetGrid();

// ── Music Drawer ───────────────────────────────────────────────────────────
function buildMelodyGrid() {
    const grid = document.getElementById('melody-grid');
    grid.innerHTML = '';
    MusicEngine.PRESETS.forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'melody-btn'; btn.dataset.id = p.id;
        btn.innerHTML = `${p.icon} ${state.lang==='fr'?p.name_fr:p.name_en}`;
        btn.addEventListener('click', () => {
            MusicEngine.playPreset(p.id);
            document.querySelectorAll('.melody-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const np = document.getElementById('music-now-playing');
            np.style.display = 'flex';
            document.getElementById('music-playing-name').textContent = state.lang==='fr'?p.name_fr:p.name_en;
            const badge = document.getElementById('music-bpm-badge');
            if (badge) badge.textContent = `${p.bpm} BPM`;
            const slider = document.getElementById('music-bpm');
            if (slider) slider.value = p.bpm;
        });
        grid.appendChild(btn);
    });
}

// ── i18n ───────────────────────────────────────────────────────────────────
const i18n = {
    en: {
        appTitle:'4D Figure Builder PRO', random:'Random', screenshot:'PNG', recBtn:'REC',
        labTitle:'4D Laboratory', parametersTitle:'Parameters', projTitle:'4D→3D Projection',
        presetsTitle:'Presets', fxTitle:'Animation & FX', animMode:'Animation Mode',
        animW:'↗ W-Rotation', animDouble:'⊕ Double Rotation', animBreath:'💨 Breathing 4D',
        animKaleid:'🔮 Kaleidoscope', animMorph:'🌊 Living Morph', animIso:'♾ Isoclinic Spin',
        speed:'Speed', rotPlanes:'Rotation Planes', colorTheme:'Color Theme',
        renderMode:'Render Mode', rWire:'Wire', rSolid:'Solid', rGhost:'Ghost', rHolo:'Hologram',
        glow:'Glow', trail:'Trail', particles:'Particles', crossTitle:'Live W Section',
        animCross:'Animate Slice', slicerLabel:'W Hyperplane Slice', autoScan:'Auto-Scan',
        showCross:'Section', infoTitle:'About', infoDefault:'Select a figure.',
        paramRadius:'Radius', paramTube:'Thickness', paramSegs:'Segments', paramTwist:'Twist', paramW:'W Offset',
        projStereo:'Stereo', projOrtho:'Ortho', projSlice:'W Slice',
        animate:'Animate', resetView:'Reset', explode:'Burst!', morph:'Morph',
        polytopes:'Polytopes', surfaces:'Surfaces', organic:'Organic', abstract:'Abstract',
        aliens:'👽 Aliens', robots:'🤖 Robots',
        musicBtn:'Music', musicTitle:'4D Music Studio', aiGenMusic:'AI Generate', volLabel:'Vol', bpmLabel:'BPM',
        textBtn:'Text', morphSliderTitle:'Morph A↔B', morphAlpha:'Alpha',
        galleryBtn:'Gallery', galleryTitle:'Gallery', galleryClear:'Clear',
        presentBtn:'Present', shareTitle:'Share', copyUrl:'Copy Link',
    },
    fr: {
        appTitle:'Constructeur 4D PRO', random:'Aléatoire', screenshot:'PNG', recBtn:'REC',
        labTitle:'Laboratoire 4D', parametersTitle:'Paramètres', projTitle:'Projection 4D→3D',
        presetsTitle:'Préréglages', fxTitle:'Animation & FX', animMode:"Mode d'Animation",
        animW:'↗ Rotation-W', animDouble:'⊕ Double Rotation', animBreath:'💨 Respiration 4D',
        animKaleid:'🔮 Kaléidoscope', animMorph:'🌊 Morphose Vivante', animIso:'♾ Spin Isoclinique',
        speed:'Vitesse', rotPlanes:'Plans Rotation', colorTheme:'Thème Couleur',
        renderMode:'Mode de Rendu', rWire:'Fil de Fer', rSolid:'Solide', rGhost:'Fantôme', rHolo:'Hologramme',
        glow:'Lueur', trail:'Traîne', particles:'Particules', crossTitle:'Section W en Direct',
        animCross:'Animer la Tranche', slicerLabel:'Tranche Hyperplan W', autoScan:'Balayage Auto',
        showCross:'Section', infoTitle:'À propos', infoDefault:'Sélectionnez une figure.',
        paramRadius:'Rayon', paramTube:'Épaisseur', paramSegs:'Segments', paramTwist:'Torsion', paramW:'Décalage W',
        projStereo:'Stéréo', projOrtho:'Ortho', projSlice:'Tranche W',
        animate:'Animer', resetView:'Réinitialiser', explode:'Explosion!', morph:'Morphose',
        polytopes:'Polytopes', surfaces:'Surfaces', organic:'Organique', abstract:'Abstrait',
        aliens:'👽 Extraterrestres', robots:'🤖 Robots',
        musicBtn:'Musique', musicTitle:'Studio Musical 4D', aiGenMusic:'IA Générer', volLabel:'Vol', bpmLabel:'BPM',
        textBtn:'Texte', morphSliderTitle:'Morphose A↔B', morphAlpha:'Alpha',
        galleryBtn:'Galerie', galleryTitle:'Galerie', galleryClear:'Vider',
        presentBtn:'Présentation', shareTitle:'Partager', copyUrl:'Copier le lien',
    }
};

function applyLang(lang) {
    state.lang = lang;
    const d = i18n[lang];
    document.querySelectorAll('[data-i18n]').forEach(el => { const k=el.dataset.i18n; if(d[k]) el.textContent=d[k]; });
    document.documentElement.lang = lang;
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENT BINDINGS
// ═══════════════════════════════════════════════════════════════════════════

// Category tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.cat = btn.dataset.cat;
        renderFigureList(state.cat);
    });
});

// Parameters
['radius','tube','segs','twist','w'].forEach(name => {
    const el = document.getElementById(`p-${name}`);
    const vl = document.getElementById(`p-${name}-val`);
    if (!el) return;
    el.addEventListener('input', () => {
        const v = parseFloat(el.value);
        if (vl) vl.textContent = v.toFixed(2);
        const map = { radius:'radius', tube:'tube', segs:'segs', twist:'twist', w:'wOffset' };
        state.params[map[name]] = v;
        if (!state.isRobot) buildFigure(state.figId, state.params);
    });
});

// Animation
document.getElementById('btn-animate').addEventListener('click', () => {
    state.animating = !state.animating;
    document.getElementById('btn-animate').classList.toggle('playing', state.animating);
    const sp = document.getElementById('btn-animate').querySelector('[data-i18n]');
    if (sp) sp.textContent = state.animating ? '⏹ Stop' : (state.lang==='fr'?'Animer':'Animate');
});
document.getElementById('anim-mode')?.addEventListener('change', e => { state.animMode = e.target.value; });
document.getElementById('fx-speed')?.addEventListener('input', e => {
    state.speed = parseFloat(e.target.value);
    const v = document.getElementById('fx-speed-val');
    if (v) v.textContent = state.speed.toFixed(1);
});

// Rotation planes
['xy','xz','xw','yz','yw','zw'].forEach(p => {
    const el = document.getElementById(`rot-${p}`);
    if (el) el.addEventListener('change', e => { state.rotation[p] = e.target.checked; });
});

// Glow + Chroma + Trail + Particles
document.getElementById('fx-glow')?.addEventListener('input', e => {
    state.glow = parseFloat(e.target.value);
    const v = document.getElementById('fx-glow-val'); if (v) v.textContent = state.glow.toFixed(1);
});
document.getElementById('fx-chroma')?.addEventListener('input', e => {
    const v = parseFloat(e.target.value);
    if (chromaPass) chromaPass.uniforms.amount.value = v;
    const vl = document.getElementById('fx-chroma-val'); if (vl) vl.textContent = v.toFixed(3);
});
document.getElementById('fx-trail')?.addEventListener('input', e => {
    state.trail = parseFloat(e.target.value);
    const v = document.getElementById('fx-trail-val'); if (v) v.textContent = state.trail.toFixed(2);
    renderer.setClearAlpha(1 - state.trail * 0.85);
});
document.getElementById('fx-particles')?.addEventListener('input', e => {
    particleCount = parseInt(e.target.value);
    const v = document.getElementById('fx-particles-val'); if (v) v.textContent = particleCount;
    buildParticles(particleCount);
});
document.getElementById('fx-cross')?.addEventListener('input', e => {
    state.wSlice = parseFloat(e.target.value);
    const v = document.getElementById('fx-cross-val'); if (v) v.textContent = state.wSlice.toFixed(2);
});
document.getElementById('btn-cross-anim')?.addEventListener('click', () => {
    state.autoSlice = !state.autoSlice;
    document.getElementById('btn-cross-anim').classList.toggle('active', state.autoSlice);
    if (!state.animating) { state.animating = true; document.getElementById('btn-animate').classList.add('playing'); }
});

// Theme dots
document.querySelectorAll('.theme-dot').forEach(btn => {
    btn.addEventListener('click', () => setTheme(btn.dataset.theme));
});

// Render mode
document.querySelectorAll('[data-render]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('[data-render]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.renderMode = btn.dataset.render;
        if (!state.isRobot) buildFigure(state.figId, state.params);
    });
});

// Projection
document.querySelectorAll('[data-proj]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('[data-proj]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.proj = btn.dataset.proj;
        if (!state.isRobot) buildFigure(state.figId, state.params);
    });
});

// Burst + Morph
document.getElementById('btn-explode').addEventListener('click', () => {
    state.burstT = 0;
    HyperTunnel.trigger();
    if (!state.animating) { state.animating = true; document.getElementById('btn-animate').classList.add('playing'); }
});
document.getElementById('btn-morph').addEventListener('click', () => {
    const cats = Figures.getCategories();
    const cat = cats[Math.floor(Math.random() * cats.length)];
    const figs = Figures.getFiguresInCategory(cat);
    const fig = figs[Math.floor(Math.random() * figs.length)];
    if (fig) selectFigure(fig.id, cat);
});

// Random
document.getElementById('btn-randomize').addEventListener('click', () => {
    const cats = Figures.getCategories();
    const cat  = cats[Math.floor(Math.random() * cats.length)];
    const figs = Figures.getFiguresInCategory(cat);
    const fig  = figs[Math.floor(Math.random() * figs.length)];
    if (fig) selectFigure(fig.id, cat);
    const themeKeys = Object.keys(THEMES);
    setTheme(themeKeys[Math.floor(Math.random() * themeKeys.length)]);
    state.animMode = ['w-rotation','double','breathing','kaleidoscope','isoclinic'][Math.floor(Math.random()*5)];
    const am = document.getElementById('anim-mode'); if (am) am.value = state.animMode;
    if (!state.animating) { state.animating = true; document.getElementById('btn-animate').classList.add('playing'); }
});

// Screenshot (saves to gallery too)
document.getElementById('btn-screenshot').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = renderer.domElement.toDataURL('image/png');
    a.download = `4d-${state.figId}-${Date.now()}.png`; a.click();
    const count = Gallery.save(renderer, state.figId, state.theme);
    showToast(`📸 Saved! (Gallery: ${count}/12)`);
});

// Fullscreen
document.getElementById('btn-fullscreen').addEventListener('click', () => {
    document.body.classList.toggle('fullscreen');
    onResize();
});

// Language
document.getElementById('btn-lang').addEventListener('click', () => {
    applyLang(state.lang === 'en' ? 'fr' : 'en');
    renderFigureList(state.cat);
    buildMelodyGrid();
});

// REC
document.getElementById('btn-rec').addEventListener('click', () => {
    if (recState.recording) stopRec(); else startRec();
});

// ── PRO TOOLS BAR ──────────────────────────────────────────────────────────
// Mouse Gravity
document.getElementById('btn-mouse-gravity').addEventListener('click', () => {
    const newState = !MouseGravity.isEnabled();
    MouseGravity.toggle(newState);
    document.getElementById('btn-mouse-gravity').classList.toggle('active', newState);
    document.body.classList.toggle('gravity-mode', newState);
    if (!newState && fxGroup && baseVerts4d) {
        // Restore vertices
        fxGroup.userData.verts4d.forEach((v, i) => { v[0]=baseVerts4d[i][0]; v[1]=baseVerts4d[i][1]; });
    }
    showToast(newState ? '🧲 Mouse Gravity ON' : '🧲 Mouse Gravity OFF');
});
// Repel toggle
document.getElementById('btn-repel').addEventListener('click', () => {
    const newRepel = !document.getElementById('btn-repel').classList.contains('active');
    MouseGravity.setRepel(newRepel);
    document.getElementById('btn-repel').classList.toggle('active', newRepel);
    showToast(newRepel ? '🔀 Repel Mode ON' : '🔀 Attract Mode ON');
});
// Mouse move for gravity
document.getElementById('stage-container').addEventListener('mousemove', e => {
    if (MouseGravity.isEnabled()) MouseGravity.setMouseWorld(e, camera, container);
});

// Creature AI
document.getElementById('btn-creature-ai').addEventListener('click', () => {
    const newState = !CreatureAI.isEnabled();
    CreatureAI.toggle(newState);
    document.getElementById('btn-creature-ai').classList.toggle('active', newState);
    showToast(newState ? '🧬 Creature AI ON' : '🧬 Creature AI OFF');
    if (newState && !state.animating) { state.animating = true; document.getElementById('btn-animate').classList.add('playing'); }
});

// Reactive Background
document.getElementById('btn-reactive-bg').addEventListener('click', () => {
    const newState = !ReactiveBG.isEnabled();
    ReactiveBG.toggle(newState);
    document.getElementById('btn-reactive-bg').classList.toggle('active', newState);
    if (newState) renderer.setClearColor(0x000000, 0);
    else renderer.setClearColor(0x000007, 1);
    showToast(newState ? '🌊 Reactive BG ON' : '🌊 Reactive BG OFF');
});

// Chromatic Aberration
document.getElementById('btn-chroma-abr').addEventListener('click', () => {
    const on = !document.getElementById('btn-chroma-abr').classList.contains('active');
    if (chromaPass) chromaPass.uniforms.amount.value = on ? 0.004 : 0;
    const sl = document.getElementById('fx-chroma');
    if (sl) sl.value = on ? 0.004 : 0;
    const vl = document.getElementById('fx-chroma-val');
    if (vl) vl.textContent = on ? '0.004' : '0.000';
    document.getElementById('btn-chroma-abr').classList.toggle('active', on);
    showToast(chromaPass ? (on ? '🔴🟢🔵 Chromatic aberration ON' : '🔵 Chroma OFF') : '⚠️ Post-processing not available');
});

// OBJ Export
document.getElementById('btn-export-obj').addEventListener('click', () => {
    if (!fxGroup) { showToast('No figure loaded'); return; }
    const { verts4d, edges } = fxGroup.userData;
    const verts3d = verts4d.map(v => project4Dto3D(rotate4D(v, rotAngles)));
    OBJExport.export3D(state.figId, verts3d, edges);
    showToast('💾 OBJ Exported!');
});

// ── MUSIC DRAWER ──────────────────────────────────────────────────────────
document.getElementById('btn-music-toggle').addEventListener('click', () => {
    const d = document.getElementById('music-drawer');
    const vis = d.style.display !== 'none';
    d.style.display = vis ? 'none' : 'block';
    if (!vis) buildMelodyGrid();
});
document.getElementById('btn-music-close').addEventListener('click', () => {
    document.getElementById('music-drawer').style.display = 'none';
});
document.getElementById('btn-music-stop').addEventListener('click', () => {
    MusicEngine.stop();
    document.getElementById('music-now-playing').style.display = 'none';
    document.querySelectorAll('.melody-btn').forEach(b => b.classList.remove('active'));
});
document.getElementById('music-vol')?.addEventListener('input', e => {
    MusicEngine.setVolume(parseFloat(e.target.value));
});
document.getElementById('music-bpm')?.addEventListener('input', e => {
    const val = parseInt(e.target.value);
    MusicEngine.setBPM(val);
    const badge = document.getElementById('music-bpm-badge');
    if (badge) badge.textContent = `${val} BPM`;
});
document.getElementById('btn-ai-music').addEventListener('click', () => {
    const theme = document.getElementById('ai-theme-select').value;
    const preset = MusicEngine.aiGenerate(theme);
    document.getElementById('music-now-playing').style.display = 'flex';
    document.getElementById('music-playing-name').textContent = `🤖 ${state.lang==='fr'?preset.name_fr:preset.name_en}`;
    const badge = document.getElementById('music-bpm-badge');
    if (badge) badge.textContent = `${preset.bpm} BPM`;
    const slider = document.getElementById('music-bpm');
    if (slider) slider.value = preset.bpm;
    document.querySelectorAll('.melody-btn').forEach(b => b.classList.remove('active'));
    showToast(`🎵 AI: ${preset.name_en}`);
});

// ── HYPER-SKETCH STUDIO ───────────────────────────────────────────────────
let sketchCtx = null;
function initSketchCanvas() {
    const cvs = document.getElementById('sketch-canvas');
    if (!cvs || sketchCtx) return;
    sketchCtx = cvs.getContext('2d');
    sketchCtx.lineCap = 'round';
    sketchCtx.lineJoin = 'round';
    sketchCtx.lineWidth = 2 + SketchEngine.getThickness() * 60;
    sketchCtx.strokeStyle = SketchEngine.getColor();

    document.getElementById('sketch-color').addEventListener('input', e => {
        SketchEngine.setColor(e.target.value);
        sketchCtx.strokeStyle = e.target.value;
    });
    document.getElementById('sketch-thickness').addEventListener('input', e => {
        const val = parseFloat(e.target.value);
        SketchEngine.setThickness(val);
        sketchCtx.lineWidth = 2 + val * 60; // Dynamic 2D feedback
    });
    document.querySelectorAll('.sketch-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            const col = btn.dataset.color;
            SketchEngine.setColor(col);
            sketchCtx.strokeStyle = col;
            document.getElementById('sketch-color').value = col;
            document.querySelectorAll('.sketch-preset').forEach(b => b.style.borderColor = 'rgba(255,255,255,0.2)');
            btn.style.borderColor = '#fff';
        });
    });

    document.querySelectorAll('.sketch-style-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.sketch-style-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            SketchEngine.setStyle(btn.dataset.style);
        });
    });

    let isDown = false;
    cvs.addEventListener('mousedown', () => { isDown = true; sketchCtx.beginPath(); });
    window.addEventListener('mouseup', () => { isDown = false; });
    cvs.addEventListener('mousemove', e => {
        if (!isDown) return;
        const rect = cvs.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        sketchCtx.lineTo(x, y);
        sketchCtx.stroke();
        // Convert canvas (0-600) to 4D-ish space (-2.5 to 2.5)
        const fx = (x / cvs.width) * 5 - 2.5;
        const fy = -(y / cvs.height) * 5 + 2.5;
        SketchEngine.addPoint(fx, fy);
    });
}
document.getElementById('btn-hyper-sketch').addEventListener('click', () => {
    document.getElementById('sketch-overlay').style.display = 'block';
    initSketchCanvas();
});
document.getElementById('btn-sketch-close').addEventListener('click', () => {
    document.getElementById('sketch-overlay').style.display = 'none';
});
document.getElementById('btn-sketch-clear').addEventListener('click', () => {
    if (sketchCtx) sketchCtx.clearRect(0, 0, 600, 600);
    SketchEngine.reset();
    if (sketchGroup) { scene.remove(sketchGroup); sketchGroup = null; }
});
document.getElementById('btn-sketch-apply').addEventListener('click', () => {
    if (!SketchEngine.hasPoints()) { showToast('Draw something first!'); return; }
    SketchEngine.setEnabled(true);
    document.getElementById('sketch-overlay').style.display = 'none';
    if (fxGroup) fxGroup.visible = false;
    showToast('✨ DRAWING COMES TO LIFE!');
});

let sketchGroup = null;
function updateSketchMesh(geom) {
    const { verts, edges } = geom;
    if (verts.length < 2) return;

    const col = SketchEngine.getColor();
    const thick = SketchEngine.getThickness();
    const style = SketchEngine.getStyle();

    if (!sketchGroup) {
        sketchGroup = new THREE.Group();
        scene.add(sketchGroup);
    }
    // Deep cleanup to prevent memory leaks
    if (sketchGroup.children.length > 0) {
        sketchGroup.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
            }
        });
        sketchGroup.clear();
    }

    const projPoints = verts.map(v => project4Dto3D(rotate4D(v, rotAngles)));
    
    try {
        const curve = new THREE.CatmullRomCurve3(projPoints);

        switch(style) {
            case 'PULSE':
            case 'NEON': {
                const tubeGeo = new THREE.TubeGeometry(curve, Math.max(20, projPoints.length * 2), thick, 8, false);
                const mat = new THREE.MeshPhysicalMaterial({
                    color: col, emissive: col, emissiveIntensity: 0.8,
                    roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.95, clearcoat: 1.0
                });
                const mesh = new THREE.Mesh(tubeGeo, mat);
                sketchGroup.add(mesh);

                if (style === 'PULSE') {
                    const headPos = projPoints[projPoints.length - 1];
                    const pointGeo = new THREE.SphereGeometry(thick * 3.5, 24, 24);
                    const pointMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
                    const pointMesh = new THREE.Mesh(pointGeo, pointMat);
                    pointMesh.position.copy(headPos);
                    sketchGroup.add(pointMesh);
                    // Add secondary glow
                    const bigGlowGeo = new THREE.SphereGeometry(thick * 8.0, 16, 16);
                    const bigGlowMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.2 });
                    const bigGlowMesh = new THREE.Mesh(bigGlowGeo, bigGlowMat);
                    bigGlowMesh.position.copy(headPos);
                    sketchGroup.add(bigGlowMesh);
                }
                break;
            }

            case 'RIBBON': {
                const tubeGeo = new THREE.TubeGeometry(curve, Math.max(20, projPoints.length * 2), thick * 4, 2, false);
                const mat = new THREE.MeshPhysicalMaterial({
                    color: col, emissive: col, emissiveIntensity: 1.2,
                    side: THREE.DoubleSide, transparent: true, opacity: 0.8, wireframe: false
                });
                const mesh = new THREE.Mesh(tubeGeo, mat);
                sketchGroup.add(mesh);
                break;
            }

            case 'QUANTUM': {
                const pointsCount = projPoints.length * 15;
                const posArr = new Float32Array(pointsCount * 3);
                const sampling = curve.getPoints(pointsCount);
                for(let i=0; i<pointsCount; i++) {
                    const p = sampling[i];
                    const offset = (Math.random()-0.5) * thick * 10;
                    posArr[i*3]   = p.x + offset;
                    posArr[i*3+1] = p.y + offset;
                    posArr[i*3+2] = p.z + offset;
                }
                const geo = new THREE.BufferGeometry();
                geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
                const pMat = new THREE.PointsMaterial({ color: col, size: 0.04, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
                const pSystem = new THREE.Points(geo, pMat);
                sketchGroup.add(pSystem);
                break;
            }

            case 'CRYSTAL': {
                const tubeGeo = new THREE.TubeGeometry(curve, Math.max(8, Math.floor(projPoints.length / 2)), thick * 2, 4, false);
                const mat = new THREE.MeshStandardMaterial({
                    color: col, emissive: col, emissiveIntensity: 0.4,
                    flatShading: true, metalness: 0.8, roughness: 0.2
                });
                const mesh = new THREE.Mesh(tubeGeo, mat);
                sketchGroup.add(mesh);
                break;
            }

            case 'NEURAL': {
                for (let j=0; j<3; j++) {
                    const offset = j * 0.05;
                    const offsetPoints = projPoints.map(p => new THREE.Vector3(p.x+offset, p.y+offset, p.z+offset));
                    const offCurve = new THREE.CatmullRomCurve3(offsetPoints);
                    const tubeGeo = new THREE.TubeGeometry(offCurve, Math.max(20, projPoints.length * 2), thick * 0.4, 6, false);
                    const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.6 - j*0.1 });
                    sketchGroup.add(new THREE.Mesh(tubeGeo, mat));
                }
                break;
            }
        }

    } catch(e) {
        console.warn("Sketch render failed", e);
    }
}

// ── TEXT STUDIO (RESTORED) ────────────────────────────────────────────────
document.getElementById('btn-text-toggle').addEventListener('click', () => {
    const p = document.getElementById('text-studio');
    p.style.display = p.style.display === 'none' ? 'block' : 'none';
});
let textRebuildTimer = null;
document.getElementById('text-input').addEventListener('input', e => {
    textState.text = e.target.value;
    textState.color = document.getElementById('text-color').value;
    clearTimeout(textRebuildTimer);
    textRebuildTimer = setTimeout(() => buildTextMesh(textState.text, textState.color), 150);
});
document.getElementById('text-color').addEventListener('input', e => {
    textState.color = e.target.value;
    clearTimeout(textRebuildTimer);
    textRebuildTimer = setTimeout(() => buildTextMesh(textState.text, textState.color), 150);
});
document.getElementById('text-size').addEventListener('input', e => {
    textState.fontSize = parseInt(e.target.value);
    clearTimeout(textRebuildTimer);
    textRebuildTimer = setTimeout(() => buildTextMesh(textState.text, textState.color), 50);
});
document.getElementById('text-font').addEventListener('change', e => {
    textState.fontFamily = e.target.value;
    buildTextMesh(textState.text, textState.color);
});
document.getElementById('btn-text-beat').addEventListener('click', () => {
    textState.beatSync = !textState.beatSync;
    const btn = document.getElementById('btn-text-beat');
    btn.style.background = textState.beatSync ? 'rgba(255,136,204,0.25)' : '';
    btn.style.boxShadow  = textState.beatSync ? '0 0 14px rgba(255,136,204,0.6)' : '';
    showToast(textState.beatSync ? '🎵 Beat Sync ON' : '🎵 Beat Sync OFF');
});
document.getElementById('btn-text-clear').addEventListener('click', () => {
    document.getElementById('text-input').value = '';
    textState.text = '';
    if (textState.mesh) { scene.remove(textState.mesh); textState.mesh = null; }
});

// ── GALLERY ────────────────────────────────────────────────────────────────
document.getElementById('btn-gallery').addEventListener('click', () => {
    const p = document.getElementById('gallery-panel');
    const vis = p.style.display !== 'none';
    p.style.display = vis ? 'none' : 'block';
    if (!vis) Gallery.renderPanel(document.getElementById('gallery-grid'), state.lang);
});
document.getElementById('btn-gallery-close').addEventListener('click', () => {
    document.getElementById('gallery-panel').style.display = 'none';
});
document.getElementById('btn-gallery-clear').addEventListener('click', () => {
    Gallery.clear();
    Gallery.renderPanel(document.getElementById('gallery-grid'), state.lang);
    showToast(state.lang==='fr' ? '🗑 Galerie vidée' : '🗑 Gallery cleared');
});

// ── SHARE / QR ────────────────────────────────────────────────────────────
document.getElementById('btn-share').addEventListener('click', () => {
    const url = URLShare.share(state);
    const modal = document.getElementById('qr-modal');
    modal.style.display = 'flex';
    QRShare.generateQR(url || window.location.href, document.getElementById('qr-container'));
});
document.getElementById('btn-qr-close').addEventListener('click', () => {
    document.getElementById('qr-modal').style.display = 'none';
});
document.getElementById('btn-copy-url').addEventListener('click', () => {
    const url = window.location.href.split('#')[0] + URLShare.encode(state);
    navigator.clipboard.writeText(url).catch(() => {});
    showToast('🔗 URL copied!');
    document.getElementById('qr-modal').style.display = 'none';
});

// ── PRESENTATION MODE ─────────────────────────────────────────────────────
document.getElementById('btn-present').addEventListener('click', () => {
    const on = !PresentMode.isEnabled();
    PresentMode.toggle(on, (id, cat) => {
        selectFigure(id, cat);
        const themeKeys = Object.keys(THEMES);
        setTheme(themeKeys[Math.floor(Math.random() * themeKeys.length)]);
        if (!state.animating) { state.animating = true; document.getElementById('btn-animate').classList.add('playing'); }
    }, 6000);
    document.getElementById('btn-present').classList.toggle('active', on);
    showToast(on ? '🎬 Présentation ON (6s/figure)' : '🎬 Présentation OFF');
    if (on && !state.animating) { state.animating = true; document.getElementById('btn-animate').classList.add('playing'); }
});

// ── MORPH SLIDER ──────────────────────────────────────────────────────────
document.getElementById('morph-fig-a')?.addEventListener('change', e => {
    MorphSlider.setFigures(e.target.value, document.getElementById('morph-fig-b')?.value);
});
document.getElementById('morph-fig-b')?.addEventListener('change', e => {
    MorphSlider.setFigures(document.getElementById('morph-fig-a')?.value, e.target.value);
});
document.getElementById('morph-alpha')?.addEventListener('input', e => {
    const v = parseFloat(e.target.value);
    MorphSlider.setAlpha(v);
    const vl = document.getElementById('morph-alpha-val'); if (vl) vl.textContent = v.toFixed(2);
    state.useMorphSlider = v > 0 && v < 1;
    // Rebuild with morph
    if (!state.isRobot) {
        if (fxGroup) { scene.remove(fxGroup); fxGroup = null; }
        buildFigure(state.figId, state.params, true);
    }
});

// ── W SLICER ──────────────────────────────────────────────────────────────
document.getElementById('slicer-w')?.addEventListener('input', e => {
    state.wSlice = parseFloat(e.target.value);
    const v = document.getElementById('slicer-val');
    if (v) v.textContent = `W = ${state.wSlice.toFixed(3)}`;
});
document.getElementById('btn-slicer-auto')?.addEventListener('click', () => {
    state.autoSlice = !state.autoSlice;
    document.getElementById('btn-slicer-auto').classList.toggle('active', state.autoSlice);
    if (!state.animating) { state.animating = true; document.getElementById('btn-animate').classList.add('playing'); }
});
document.getElementById('btn-cross-visible')?.addEventListener('click', () => {
    state.showCross = !state.showCross;
});

// ── RESET VIEW ────────────────────────────────────────────────────────────
document.getElementById('btn-reset-view').addEventListener('click', () => {
    camera.position.set(0,0,4.5);
    controls.reset();
    rotAngles = { xy:0,xz:0,xw:0,yz:0,yw:0,zw:0 };
    if (!state.isRobot) buildFigure(state.figId, state.params);
});

// ── RESIZE ────────────────────────────────────────────────────────────────
function onResize() {
    const w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    if (composer) composer.setSize(w, h);
}
window.addEventListener('resize', onResize);

// ── LOAD FROM URL HASH ────────────────────────────────────────────────────
if (window.location.hash && window.location.hash.length > 5) {
    try { URLShare.loadFromHash(window.location.hash, state, selectFigure, setTheme); }
    catch(e) {}
}

// INITIALIZATION MOVED TO END OF FILE

// ═══════════════════════════════════════════════════════════════════════════
// 🎤  MIC VOICE SCULPTOR
//     Real-time microphone audio → 4D geometry deformation
// ═══════════════════════════════════════════════════════════════════════════
const MicSculptor = (() => {
    let enabled = false;
    let micCtx = null, micAnalyser = null, micData = null, micStream = null;
    let smoothBass = 0, smoothMid = 0, smoothHigh = 0;
    const specCanvas = document.getElementById('mic-spectrum');
    const specCtx = specCanvas ? specCanvas.getContext('2d') : null;

    async function start() {
        try {
            micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            micCtx = new (window.AudioContext || window.webkitAudioContext)();
            const source = micCtx.createMediaStreamSource(micStream);
            micAnalyser = micCtx.createAnalyser();
            micAnalyser.fftSize = 512;
            micAnalyser.smoothingTimeConstant = 0.75;
            micData = new Uint8Array(micAnalyser.frequencyBinCount);
            source.connect(micAnalyser);
            enabled = true;
            if (specCanvas) specCanvas.style.display = 'block';
            return true;
        } catch(e) {
            showToast('🚫 Microphone access denied', 2500);
            return false;
        }
    }

    function stop() {
        enabled = false;
        if (micStream) micStream.getTracks().forEach(t => t.stop());
        if (micCtx) micCtx.close();
        micCtx = null; micAnalyser = null; micData = null; micStream = null;
        smoothBass = 0; smoothMid = 0; smoothHigh = 0;
        if (specCanvas) specCanvas.style.display = 'none';
    }

    function drawSpectrum(data) {
        if (!specCtx) return;
        const W = specCanvas.width, H = specCanvas.height;
        specCtx.clearRect(0, 0, W, H);
        specCtx.fillStyle = 'rgba(0,0,10,0.7)';
        specCtx.fillRect(0, 0, W, H);
        const bins = Math.min(data.length, 64);
        const bw = W / bins;
        for (let i = 0; i < bins; i++) {
            const v = data[i] / 255;
            const bh = v * H;
            const hue = (i / bins) * 240 + 180 * smoothBass;  // cyan → purple
            specCtx.fillStyle = `hsla(${hue}, 100%, ${40 + v * 50}%, 0.9)`;
            specCtx.fillRect(i * bw + 1, H - bh, bw - 2, bh);
        }
    }

    function update(dt) {
        if (!enabled || !micAnalyser || !micData || !fxGroup) return;
        micAnalyser.getByteFrequencyData(micData);
        const { verts4d, baseVerts4d: localBase } = fxGroup.userData;
        const bassEnd   = Math.floor(micData.length * 0.05);   // 0–5%   bass
        const midEnd    = Math.floor(micData.length * 0.25);   // 5–25%  mid
        const highEnd   = Math.floor(micData.length * 0.55);   // 25–55% high

        let bassSum = 0, midSum = 0, highSum = 0;
        for (let i = 0;       i < bassEnd; i++) bassSum += micData[i];
        for (let i = bassEnd; i < midEnd;  i++) midSum  += micData[i];
        for (let i = midEnd;  i < highEnd; i++) highSum += micData[i];

        const rawBass = (bassSum / bassEnd) / 255;
        const rawMid  = (midSum  / (midEnd  - bassEnd)) / 255;
        const rawHigh = (highSum / (highEnd - midEnd))  / 255;

        smoothBass += (rawBass - smoothBass) * 0.2;
        smoothMid  += (rawMid  - smoothMid)  * 0.15;
        smoothHigh += (rawHigh - smoothHigh) * 0.12;

        drawSpectrum(micData);

        // Apply deformation to the 4D figure vertices in real-time
        if (!fxGroup || state.isRobot) return;
        const ud = fxGroup.userData;
        if (!ud || !ud.verts4d || !ud.baseVerts4d) return;

        const nv = ud.verts4d.length;
        for (let i = 0; i < nv; i++) {
            const b = ud.baseVerts4d[i];
            const v = ud.verts4d[i];
            const phase = (i / nv) * Math.PI * 2;

            // Bass → W-axis pulse (4D depth breathing)
            const wPush = smoothBass * 0.6 * Math.sin(phase * 3);
            // Mid  → radial expansion in XY
            const midR  = 1 + smoothMid * 0.5;
            // High → rotational twist distortion
            const twist = smoothHigh * 0.8 * Math.sin(phase * 5 + smoothBass * 6);

            v[0] = b[0] * midR + Math.sin(twist) * smoothHigh * 0.15;
            v[1] = b[1] * midR + Math.cos(twist) * smoothHigh * 0.15;
            v[2] = b[2] * (1 + smoothMid * 0.3);
            v[3] = b[3] + wPush;
        }
        ud.dirty = true;
    }

    return { start, stop, update, isEnabled: () => enabled };
})();

// MIC button
document.getElementById('btn-mic').addEventListener('click', async () => {
    const btn = document.getElementById('btn-mic');
    if (MicSculptor.isEnabled()) {
        MicSculptor.stop();
        btn.classList.remove('mic-active');
        showToast('🎤 Mic Sculptor OFF');
    } else {
        showToast('🎤 Starting microphone…', 1500);
        const ok = await MicSculptor.start();
        if (ok) {
            btn.classList.add('mic-active');
            showToast('🎤 Mic Sculptor ON — speak or sing! 🎵', 3000);
        }
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// 🎬  CINEMATIC SNAPSHOT MODE
//     3-angle automated capture with flash + lightbox gallery
// ═══════════════════════════════════════════════════════════════════════════
const CINEMATIC_ANGLES = [
    { label: 'Front View',   pos: [0, 0.4, 4.2],   target: [0, 0, 0] },
    { label: 'Top Orbit',    pos: [2.8, 2.2, 2.8], target: [0, 0, 0] },
    { label: 'Drama Low',    pos: [-2.5, -1.5, 3.5], target: [0, 0.2, 0] },
];

function cinematicFlash() {
    const el = document.createElement('div');
    el.className = 'cinematic-flash';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 700);
}

function captureAngle(angleConfig, label) {
    return new Promise(resolve => {
        const [px, py, pz] = angleConfig.pos;
        const [tx, ty, tz] = angleConfig.target;
        camera.position.set(px, py, pz);
        camera.lookAt(tx, ty, tz);
        controls.update();

        // Give one frame to render
        setTimeout(() => {
            if (composer) { composer.render(); } else { renderer.render(scene, camera); }
            const dataURL = renderer.domElement.toDataURL('image/jpeg', 0.9);
            resolve({ dataURL, label });
        }, 80);
    });
}

async function cinematicSnapshot() {
    const panel  = document.getElementById('cinematic-panel');
    const grid   = document.getElementById('cinematic-grid');
    const figName = document.getElementById('hud-name')?.textContent || state.figId;

    // Save current camera
    const savedPos = camera.position.clone();
    const savedTarget = controls.target.clone();

    showToast('🎬 Capturing cinematic angles…', 2500);

    grid.innerHTML = '';  // clear old shots

    const shots = [];
    for (const [i, angle] of CINEMATIC_ANGLES.entries()) {
        cinematicFlash();
        await new Promise(r => setTimeout(r, i * 350));
        const shot = await captureAngle(angle, angle.label);
        shots.push(shot);
    }

    // Restore camera
    camera.position.copy(savedPos);
    controls.target.copy(savedTarget);
    camera.lookAt(controls.target);
    controls.update();

    // Build gallery cards
    shots.forEach(({ dataURL, label }) => {
        const card = document.createElement('div');
        card.className = 'cinematic-card';
        const img = document.createElement('img');
        img.src = dataURL;
        img.alt = label;
        const lbl = document.createElement('div');
        lbl.className = 'card-label';
        lbl.textContent = `${figName} — ${label}`;
        const dlBtn = document.createElement('button');
        dlBtn.className = 'dl-btn';
        dlBtn.title = 'Download';
        dlBtn.innerHTML = '⬇';
        dlBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const a = document.createElement('a');
            a.href = dataURL;
            a.download = `4d-${figName}-${label.replace(/ /g,'-')}-${Date.now()}.jpg`;
            a.click();
        });
        card.appendChild(img);
        card.appendChild(lbl);
        card.appendChild(dlBtn);
        grid.appendChild(card);
    });

    // Show lightbox
    panel.style.display = 'flex';
}

// Cinematic button
document.getElementById('btn-cinematic').addEventListener('click', () => {
    cinematicSnapshot();
});

// Close cinematic panel
document.getElementById('btn-cinematic-close').addEventListener('click', () => {
    document.getElementById('cinematic-panel').style.display = 'none';
});
// Click outside to close
document.getElementById('cinematic-panel').addEventListener('click', (e) => {
    if (e.target === document.getElementById('cinematic-panel')) {
        document.getElementById('cinematic-panel').style.display = 'none';
    }
});

// ── STARTUP SEQUENCE ────────────────────────────────────────────────────────
console.log("🚀 [APP] Initializing Startup Sequence...");
state.isRobot = false; 

function startApp() {
    console.log("📦 [APP] Populating UI...");
    try {
        renderFigureList('polytopes');
        populateMorphSelects();
        buildPresetGrid();
        
        console.log("🎨 [APP] Creating Initial Figure...");
        buildFigure('tesseract', state.params);
        
        onResize(); 
        animate();
        console.log("✅ [APP] Initialization Complete.");
    } catch(e) {
        console.error("❌ [APP] Boot Error:", e);
        showToast("⚠️ Software Boot Error: " + e.message, 5000);
    }
}

// Small delay to ensure all constants are defined (Sync)
setTimeout(startApp, 50);

applyLang('en');
if(!window.location.hash) showToast('🌌 4D Figure Builder PRO ready ✨', 3500);

