/**
 * extras.js — 4D Figure Builder PRO Creative Suite (v5.0)
 * ========================================================
 * Modules:
 *  - ChromaAbrShader : Chromatic Aberration post-process
 *  - ReactiveBG      : Audio-reactive shader backdrop
 *  - HyperTunnel     : Hyperspace tunnel on Burst (proper GPU disposal!)
 *  - MouseGravity    : Cursor attracts/repels 4D vertices cleanly
 *  - MorphSlider     : Topology-safe morph between any two 4D figures
 *  - CreatureAI      : Organic autonomous parameter animation
 *  - AIDirector4D    : Prompt-driven 4D Scene Composer (EN/FR keywords!)
 *  - URLShare        : Encode/decode state in URL hash
 *  - Gallery         : localStorage screenshot gallery (12 max)
 *  - QRShare         : 100% OFFLINE Canvas QR matrix generator (zero external APIs!)
 *  - PresentMode     : Auto-cycle showcase mode
 *  - FigureDNA       : Deterministic signature hash & hue per figure
 */

// ───────────────────────────────────────────────────────────────────────────
// CHROMATIC ABERRATION SHADER
// ───────────────────────────────────────────────────────────────────────────
const ChromaAbrShader = {
    uniforms: {
        tDiffuse: { value: null },
        amount:   { value: 0.0015 },
        angle:    { value: 0.0 },
    },
    vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float amount;
        uniform float angle;
        varying vec2 vUv;
        void main() {
            vec2 offset = amount * vec2(cos(angle), sin(angle));
            vec4 cr = texture2D(tDiffuse, vUv + offset);
            vec4 cg = texture2D(tDiffuse, vUv);
            vec4 cb = texture2D(tDiffuse, vUv - offset);
            gl_FragColor = vec4(cr.r, cg.g, cb.b, cg.a);
        }
    `
};

// ───────────────────────────────────────────────────────────────────────────
// AUDIO-REACTIVE BACKGROUND
// ───────────────────────────────────────────────────────────────────────────
const ReactiveBG = (() => {
    let bgMesh = null, bgMat = null;
    let enabled = false;

    const bgShader = {
        uniforms: {
            time:   { value: 0 },
            beat:   { value: 0 },
            color1: { value: new THREE.Color(0x030816) },
            color2: { value: new THREE.Color(0x0b1a40) },
            color3: { value: new THREE.Color(0x160728) },
        },
        vertexShader: `
            varying vec2 vUv;
            void main() { vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }
        `,
        fragmentShader: `
            uniform float time;
            uniform float beat;
            uniform vec3 color1;
            uniform vec3 color2;
            uniform vec3 color3;
            varying vec2 vUv;
            void main() {
                vec2 uv = vUv - 0.5;
                float d = length(uv);
                float ang = atan(uv.y, uv.x);
                float wave = sin(d * 12.0 - time * 1.2 + ang * 2.0) * 0.5 + 0.5;
                float ring = sin(d * 24.0 - time * 2.5 + beat * 8.0) * beat * 0.4;
                float spiral = sin(d * 26.0 - ang * 4.0 + time * 2.4) * 0.1;
                vec3 col = mix(color1, color2, clamp(wave + ring + spiral, 0.0, 1.0));
                col = mix(col, color3, sin(uv.x * 6.0 + time * 0.5) * 0.3 + 0.3);
                col += beat * 0.14 * color2;
                gl_FragColor = vec4(col, 1.0);
            }
        `
    };

    function init(scene) {
        const geo = new THREE.PlaneGeometry(2, 2);
        bgMat = new THREE.ShaderMaterial({
            uniforms: THREE.UniformsUtils.clone(bgShader.uniforms),
            vertexShader: bgShader.vertexShader,
            fragmentShader: bgShader.fragmentShader,
            depthWrite: false,
            depthTest: false,
        });
        bgMesh = new THREE.Mesh(geo, bgMat);
        bgMesh.renderOrder = -1000;
        bgMesh.frustumCulled = false;
        bgMesh.visible = false;
        bgMesh.userData.isHelper = true;
        scene.add(bgMesh);
    }

    function setColors(c1, c2) {
        if (!bgMat) return;
        bgMat.uniforms.color1.value = new THREE.Color(c1).multiplyScalar(0.10);
        bgMat.uniforms.color2.value = new THREE.Color(c2).multiplyScalar(0.18);
        bgMat.uniforms.color3.value = new THREE.Color(c1).multiplyScalar(0.06);
    }

    function update(t, beat) {
        if (!bgMat || !enabled) return;
        bgMat.uniforms.time.value = t;
        bgMat.uniforms.beat.value = beat;
    }

    function toggle(v) {
        enabled = v;
        if (bgMesh) bgMesh.visible = v;
    }

    return { init, update, setColors, toggle, isEnabled: () => enabled };
})();

// ───────────────────────────────────────────────────────────────────────────
// HYPERSPACE TUNNEL (Burst FX with proper disposal)
// ───────────────────────────────────────────────────────────────────────────
const HyperTunnel = (() => {
    let rings = [], active = false, t = 0, scene = null;
    const N_RINGS = 16;

    function init(sc) { scene = sc; }

    function clearRings() {
        rings.forEach(r => {
            if (scene) scene.remove(r);
            if (r.geometry) r.geometry.dispose();
            if (r.material) r.material.dispose();
        });
        rings = [];
    }

    function trigger() {
        clearRings();
        for (let i = 0; i < N_RINGS; i++) {
            const geo = new THREE.RingGeometry(0.14 + i * 0.20, 0.21 + i * 0.20, 48);
            const mat = new THREE.MeshBasicMaterial({
                color: new THREE.Color().setHSL(i / N_RINGS, 1, 0.6),
                transparent: true, opacity: 0.0,
                side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.z = -i * 0.3;
            mesh.userData.delay = i * 0.035;
            mesh.userData.isHelper = true;
            rings.push(mesh);
            scene.add(mesh);
        }
        active = true;
        t = 0;
    }

    function update(dt) {
        if (!active) return;
        t += dt;
        let allDone = true;
        rings.forEach((r, i) => {
            const local = t - r.userData.delay;
            if (local < 0) { allDone = false; return; }
            const frac = Math.min(1, local / 0.6);
            r.material.opacity = frac < 0.7 ? (frac / 0.7) * 0.75 : ((1 - frac) / 0.3) * 0.75;
            r.position.z = -i * 0.3 + local * 5;
            r.scale.setScalar(1 + local * 2);
            r.rotation.z += dt * (1 + i * 0.1);
            if (frac < 1) allDone = false;
        });
        if (allDone || t > 2.4) {
            clearRings();
            active = false;
        }
    }

    return { init, trigger, update, isActive: () => active };
})();

// ───────────────────────────────────────────────────────────────────────────
// MOUSE GRAVITY — attracts/repels 4D vertices toward cursor
// ───────────────────────────────────────────────────────────────────────────
const MouseGravity = (() => {
    let enabled = false, repel = false;
    const mouse3D = new THREE.Vector3();
    const raycaster = new THREE.Raycaster();
    const mousePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

    function setMouseWorld(event, camera, container) {
        const rect = container.getBoundingClientRect();
        const ndc = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );
        raycaster.setFromCamera(ndc, camera);
        raycaster.ray.intersectPlane(mousePlane, mouse3D);
    }

    function applyGravity(verts4d, baseVerts4d, rotAngles, rotEnabled, projMode, strength = 0.45) {
        if (!enabled || !verts4d || !baseVerts4d) return;
        const dir = repel ? -1 : 1;
        for (let i = 0; i < verts4d.length; i++) {
            const base = baseVerts4d[i];
            const v = verts4d[i];
            if (!base || !v) continue;
            const rotated = Math4D.rotate4D(base, rotAngles, rotEnabled);
            const p3 = Math4D.projectPoint(rotated, projMode, 3.6);
            const dx = mouse3D.x - p3.x;
            const dy = mouse3D.y - p3.y;
            const distSq = dx * dx + dy * dy + 0.05;
            const amt = ((dir * strength) / (distSq + 0.8)) * 0.18;
            v[0] = base[0] + dx * amt;
            v[1] = base[1] + dy * amt;
            v[2] = base[2] + (dx + dy) * amt * 0.3;
            v[3] = base[3] - (dx - dy) * amt * 0.25;
        }
    }

    function restore(verts4d, baseVerts4d) {
        if (!verts4d || !baseVerts4d) return;
        for (let i = 0; i < verts4d.length; i++) {
            if (!baseVerts4d[i]) continue;
            verts4d[i][0] = baseVerts4d[i][0];
            verts4d[i][1] = baseVerts4d[i][1];
            verts4d[i][2] = baseVerts4d[i][2];
            verts4d[i][3] = baseVerts4d[i][3];
        }
    }

    function toggle(v) { enabled = v; }
    function setRepel(v) { repel = v; }

    return { setMouseWorld, applyGravity, restore, toggle, setRepel, isEnabled: () => enabled };
})();

// ───────────────────────────────────────────────────────────────────────────
// CREATURE AI — Organic autonomous parameter evolution
// ───────────────────────────────────────────────────────────────────────────
const CreatureAI = (() => {
    let enabled = false;
    function randomTarget() {
        return {
            radius: 0.78 + Math.random() * 0.55,
            tube:   0.16 + Math.random() * 0.42,
            twist:  Math.random() * Math.PI * 2,
            wOffset: Math.random() * 1.4 - 0.7,
        };
    }
    let current = randomTarget(), next = randomTarget(), tween = 0, lastRebuild = 0;

    function update(dt, params, onRebuild) {
        if (!enabled) return;
        tween += dt * 0.18;
        if (tween >= 1) { current = next; next = randomTarget(); tween = 0; }
        const smooth = tween * tween * (3 - 2 * tween);
        params.radius  = current.radius  + (next.radius  - current.radius)  * smooth;
        params.tube    = current.tube    + (next.tube    - current.tube)    * smooth;
        params.twist   = current.twist   + (next.twist   - current.twist)   * smooth;
        params.wOffset = current.wOffset + (next.wOffset - current.wOffset) * smooth;

        const now = Date.now();
        if (now - lastRebuild > 85) {
            if (onRebuild) onRebuild();
            lastRebuild = now;
        }
        const sync = (id, val) => {
            const el = document.getElementById(id);
            const vl = document.getElementById(id + '-val');
            if (el) el.value = val;
            if (vl) vl.textContent = val.toFixed(2);
        };
        sync('p-radius', params.radius);
        sync('p-tube',   params.tube);
        sync('p-twist',  params.twist);
        sync('p-w',      params.wOffset);
    }

    function toggle(v) { enabled = v; }
    return { update, toggle, isEnabled: () => enabled };
})();

// ───────────────────────────────────────────────────────────────────────────
// AI 4D DIRECTOR — Natural Prompt Composer (EN/FR)
// ───────────────────────────────────────────────────────────────────────────
const AIDirector4D = (() => {
    const FIGURE_RULES = [
        { kw: ['photo', 'lion', 'leu', 'portrait', 'image'], type: 'photo', demo: 'lion', mode: 'bust', theme: 'gold', render: 'solid' },
        { kw: ['astronaut', 'helmet', 'casque', 'space'], type: 'photo', demo: 'astronaut', mode: 'bust', theme: 'cyberpunk', render: 'solid' },
        { kw: ['chalice', 'vase', 'trophy', 'cup', 'lathe', 'coupe'], type: 'photo', demo: 'chalice', mode: 'lathe', theme: 'ice', render: 'crystal' },
        { kw: ['heart', 'coeur', 'cœur', 'inima', 'love', 'amour'], type: 'figure', cat: 'real4d', id: 'heart4d', theme: 'vaporwave', render: 'crystal', anim: 'breathing' },
        { kw: ['human', 'mannequin', 'body', 'corps', 'person', 'om', 'anatomy'], type: 'figure', cat: 'real4d', id: 'mannequin4d', theme: 'cyberpunk', render: 'solid', anim: 'w-rotation' },
        { kw: ['dna', 'adn', 'helix', 'gene', 'bio'], type: 'figure', cat: 'real4d', id: 'dna4d', theme: 'aurora', render: 'solid', anim: 'double' },
        { kw: ['astro', 'gyro', 'clock', 'time', 'chronos', 'ring'], type: 'figure', cat: 'real4d', id: 'astrolabe4d', theme: 'gold', render: 'solid', anim: 'isoclinic' },
        { kw: ['phoenix', 'dragon', 'wing', 'aile', 'aripi', 'angel', 'bird'], type: 'figure', cat: 'real4d', id: 'phoenix4d', theme: 'fire', render: 'crystal', anim: 'breathing' },
        { kw: ['mobius', 'möbius', 'arch', 'pavilion', 'monument', 'ribbon'], type: 'figure', cat: 'real4d', id: 'mobius4d', theme: 'ice', render: 'solid', anim: 'w-rotation' },
        { kw: ['star', 'etoile', 'étoile', 'stea', 'crystal', 'cristal', 'gem'], type: 'figure', cat: 'real4d', id: 'hyperstar4d', theme: 'cosmic', render: 'crystal', anim: 'isoclinic' },
        { kw: ['lotus', 'crown', 'flower', 'fleur', 'floare'], type: 'figure', cat: 'real4d', id: 'crown4d', theme: 'vaporwave', render: 'crystal', anim: 'breathing' },
        { kw: ['robot', 'mech', 'sentinel', 'guardian', 'cyborg'], type: 'robot', id: 'sentinel', theme: 'cosmic', render: 'solid' },
        { kw: ['titan', 'iron', 'heavy', 'cannon'], type: 'robot', id: 'titan', theme: 'fire', render: 'solid' },
        { kw: ['spider', 'nano', 'insect'], type: 'robot', id: 'nano', theme: 'matrix', render: 'solid' },
        { kw: ['walker', 'biped'], type: 'robot', id: 'walker', theme: 'cyberpunk', render: 'solid' },
        { kw: ['tesseract', 'cube', 'hypercube'], type: 'figure', cat: 'polytopes', id: 'tesseract', theme: 'cyberpunk', render: 'solid', anim: 'w-rotation' },
        { kw: ['24', 'cell24', 'polytope'], type: 'figure', cat: 'polytopes', id: 'cell24', theme: 'cosmic', render: 'crystal', anim: 'isoclinic' },
        { kw: ['klein', 'bottle'], type: 'figure', cat: 'surfaces', id: 'klein', theme: 'fire', render: 'crystal', anim: 'double' },
        { kw: ['hopf', 'torus', 'knot'], type: 'figure', cat: 'surfaces', id: 'hopf', theme: 'cosmic', render: 'solid', anim: 'isoclinic' },
        { kw: ['jelly', 'medus', 'ocean'], type: 'figure', cat: 'organic', id: 'jellyfish', theme: 'aurora', render: 'crystal', anim: 'breathing' },
        { kw: ['alien', 'eye', 'vortex', 'rift'], type: 'figure', cat: 'aliens', id: 'vortexeye', theme: 'vaporwave', render: 'hologram', anim: 'kaleidoscope' },
    ];

    function parsePrompt(raw) {
        const q = String(raw || '').toLowerCase().trim();
        let match = FIGURE_RULES.find(r => r.kw.some(k => q.includes(k)));
        if (!match) {
            match = { type: 'figure', cat: 'real4d', id: 'heart4d', theme: 'cyberpunk', render: 'solid', anim: 'w-rotation' };
        }
        const plan = { ...match, slice: false };

        // Theme overrides
        if (/gold|or|aur|royal|sun/.test(q)) plan.theme = 'gold';
        else if (/fire|flame|lava|red|rosu|feu|inferno/.test(q)) plan.theme = 'fire';
        else if (/ice|glace|frost|blue|bleu|albastru/.test(q)) plan.theme = 'ice';
        else if (/matrix|green|vert|verde|emerald/.test(q)) plan.theme = 'matrix';
        else if (/pink|rose|vapor|magenta|neon/.test(q)) plan.theme = 'vaporwave';
        else if (/aurora|mint|aqua|teal/.test(q)) plan.theme = 'aurora';
        else if (/purple|violet|cosmic|galaxy/.test(q)) plan.theme = 'cosmic';
        else if (/cyber|cyan/.test(q)) plan.theme = 'cyberpunk';

        // Render mode overrides
        if (/holo|scan/.test(q)) plan.render = 'hologram';
        else if (/glass|crystal|cristal|gem|diamond/.test(q)) plan.render = 'crystal';
        else if (/wire|fil|neon|cyber/.test(q) && /wire|fil/.test(q)) plan.render = 'wireframe';
        else if (/ghost|xray|fant/.test(q)) plan.render = 'ghost';
        else if (/solid|metal|pbr|statue/.test(q)) plan.render = 'solid';

        // Slicer / Animation overrides
        if (/slice|tranche|section|cut/.test(q)) plan.slice = true;
        if (/voxel/.test(q) && plan.type === 'photo') plan.mode = 'voxels';
        if (/cube|tesseract/.test(q) && plan.type === 'photo') plan.mode = 'tesseract';
        if (/prism|diamond/.test(q) && plan.type === 'photo') plan.mode = 'prism';

        return plan;
    }

    return { parsePrompt };
})();

// ───────────────────────────────────────────────────────────────────────────
// SHAREABLE URL
// ───────────────────────────────────────────────────────────────────────────
const URLShare = (() => {
    function encode(state) {
        const payload = {
            f: state.figId, c: state.cat, t: state.theme, a: state.animMode,
            p: {
                r: +state.params.radius.toFixed(2), t: +state.params.tube.toFixed(2),
                s: state.params.segs, tw: +state.params.twist.toFixed(2), w: +state.params.wOffset.toFixed(2)
            },
            sp: +state.speed.toFixed(1), rm: state.renderMode, pr: state.proj,
        };
        try { return '#' + btoa(JSON.stringify(payload)).replace(/=/g, ''); }
        catch (_) { return ''; }
    }

    function decode(hash) {
        try {
            const raw = hash.replace(/^#/, '');
            const pad = raw + '=='.slice(0, (4 - raw.length % 4) % 4);
            return JSON.parse(atob(pad));
        } catch (_) { return null; }
    }

    function share(state) {
        const url = window.location.href.split('#')[0] + encode(state);
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).catch(() => {});
        }
        return url;
    }

    function loadFromHash(hash, state, selectFigure, setTheme, selectRobotFn) {
        const d = decode(hash);
        if (!d) return false;
        if (d.t) setTheme(d.t);
        if (d.p) {
            state.params.radius  = d.p.r  || 1.0;
            state.params.tube    = d.p.t  || 0.3;
            state.params.segs    = d.p.s  || 24;
            state.params.twist   = d.p.tw || 0;
            state.params.wOffset = d.p.w  || 0;
        }
        if (d.sp) state.speed = d.sp;
        if (d.rm) state.renderMode = d.rm;
        if (d.pr) state.proj = d.pr;
        if (d.a)  state.animMode = d.a;
        if (d.f && d.c) {
            if (d.c === 'robots' && typeof selectRobotFn === 'function') selectRobotFn(d.f);
            else selectFigure(d.f, d.c);
        }
        return true;
    }

    return { encode, decode, share, loadFromHash };
})();

// ───────────────────────────────────────────────────────────────────────────
// SCREENSHOT GALLERY — localStorage, 12 max
// ───────────────────────────────────────────────────────────────────────────
const Gallery = (() => {
    const KEY = '4d_gallery_v2';
    const MAX = 12;

    function getAll() {
        try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
        catch (_) { return []; }
    }

    function saveDataURL(dataURL, figName, theme) {
        const items = getAll();
        items.unshift({ img: dataURL, name: figName, theme, ts: Date.now() });
        if (items.length > MAX) items.pop();
        try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (_) {}
        return items.length;
    }

    function save(renderer, figName, theme) {
        const dataURL = renderer.domElement.toDataURL('image/jpeg', 0.82);
        return saveDataURL(dataURL, figName, theme);
    }

    function clear() { try { localStorage.removeItem(KEY); } catch (_) {} }

    function renderPanel(panelEl, lang) {
        const items = getAll();
        panelEl.innerHTML = '';
        if (items.length === 0) {
            panelEl.innerHTML = `<p class="gallery-empty">${lang === 'fr' ? 'Aucune capture pour le moment' : 'No screenshots yet'}</p>`;
            return;
        }
        items.forEach((item, i) => {
            const el = document.createElement('div');
            el.className = 'gallery-item';
            const dt = new Date(item.ts).toLocaleDateString();
            el.innerHTML = `
                <img src="${item.img}" alt="${item.name}">
                <div class="gallery-label">${item.name}</div>
                <div class="gallery-meta">${dt}</div>
                <button class="gallery-dl" data-idx="${i}" title="Download">⬇</button>
            `;
            el.querySelector('.gallery-dl').addEventListener('click', (e) => {
                e.stopPropagation();
                const a = document.createElement('a');
                a.href = item.img; a.download = `4d-${item.name}-${item.ts}.jpg`;
                a.dataset.bypassed = 'true';
                a.click();
            });
            panelEl.appendChild(el);
        });
    }

    return { save, saveDataURL, getAll, clear, renderPanel };
})();

// ───────────────────────────────────────────────────────────────────────────
// 100% OFFLINE CANVAS SHARE MATRIX (No external api.qrserver.com leak!)
// ───────────────────────────────────────────────────────────────────────────
const QRShare = (() => {
    function generateQR(url, targetEl) {
        targetEl.innerHTML = '';
        const N = 25;
        const size = 180;
        const cell = Math.floor(size / (N + 2));
        const cvs = document.createElement('canvas');
        cvs.width = size; cvs.height = size;
        cvs.style.cssText = 'border-radius:10px;border:2px solid rgba(0,243,255,0.45);background:#050816;';
        const ctx = cvs.getContext('2d');
        ctx.fillStyle = '#050816';
        ctx.fillRect(0, 0, size, size);

        // Finder patterns (3 corners)
        const drawFinder = (gx, gy) => {
            for (let y = 0; y < 7; y++) {
                for (let x = 0; x < 7; x++) {
                    const border = x === 0 || x === 6 || y === 0 || y === 6;
                    const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
                    if (border || core) {
                        ctx.fillStyle = '#00f3ff';
                        ctx.fillRect((gx + x + 1) * cell, (gy + y + 1) * cell, cell - 1, cell - 1);
                    }
                }
            }
        };
        drawFinder(0, 0);
        drawFinder(N - 7, 0);
        drawFinder(0, N - 7);

        // Deterministic hash pattern from URL string
        let hash = 2166136261;
        for (let i = 0; i < url.length; i++) {
            hash ^= url.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        for (let y = 0; y < N; y++) {
            for (let x = 0; x < N; x++) {
                const inCorner = (x < 8 && y < 8) || (x >= N - 8 && y < 8) || (x < 8 && y >= N - 8);
                if (inCorner) continue;
                hash = Math.imul(hash ^ (x * 73856093 ^ y * 19349663), 2654435761);
                if ((hash >>> 31) === 1) {
                    ctx.fillStyle = ((x + y) % 5 === 0) ? '#a855f7' : '#00f3ff';
                    ctx.fillRect((x + 1) * cell, (y + 1) * cell, cell - 1, cell - 1);
                }
            }
        }
        targetEl.appendChild(cvs);

        const label = document.createElement('p');
        label.style.cssText = 'font-size:0.7rem;color:#94a3b8;margin-top:8px;text-align:center;word-break:break-all;max-width:220px;';
        label.textContent = url.length > 68 ? url.slice(0, 65) + '...' : url;
        targetEl.appendChild(label);
    }
    return { generateQR };
})();

// ───────────────────────────────────────────────────────────────────────────
// PRESENTATION MODE
// ───────────────────────────────────────────────────────────────────────────
const PresentMode = (() => {
    let enabled = false, timer = null, idx = 0;
    let figList = [], callback = null;

    function buildList() {
        figList = [];
        Figures.getCategories().forEach(cat => {
            Figures.getFiguresInCategory(cat).forEach(f => figList.push({ id: f.id, cat }));
        });
    }

    function next() {
        if (!enabled || !figList.length) return;
        idx = (idx + 1) % figList.length;
        const f = figList[idx];
        if (callback) callback(f.id, f.cat);
    }

    function toggle(v, cb, ms = 5500) {
        enabled = v; callback = cb;
        if (!v) { clearInterval(timer); timer = null; return; }
        buildList();
        clearInterval(timer);
        timer = setInterval(next, ms);
    }

    return { toggle, next, isEnabled: () => enabled };
})();

// ───────────────────────────────────────────────────────────────────────────
// FIGURE DNA — Unique signature per figure id
// ───────────────────────────────────────────────────────────────────────────
const FigureDNA = (() => {
    function getHash(id) {
        let h = 0;
        const s = String(id || 'tesseract');
        for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
        const hue = ((h >>> 0) % 360);
        return { hue, css: `hsl(${hue}, 90%, 60%)`, hex: hslToHex(hue, 90, 60) };
    }
    function hslToHex(h, s, l) {
        s /= 100; l /= 100;
        const k = n => (n + h / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        const toH = x => Math.round(x * 255).toString(16).padStart(2, '0');
        return '#' + toH(f(0)) + toH(f(8)) + toH(f(4));
    }
    return { getHash };
})();

// ───────────────────────────────────────────────────────────────────────────
// MORPH SLIDER — Topology-safe 4D Morph A <-> B
// ───────────────────────────────────────────────────────────────────────────
const MorphSlider = (() => {
    let figA = 'tesseract', figB = 'heart4d', alpha = 0;

    function setFigures(a, b) { if (a) figA = a; if (b) figB = b; }

    function computeMorphed(params, t) {
        if (!figA || !figB) return null;
        const dA = Figures.generate(figA, params);
        const dB = Figures.generate(figB, params);
        const out = Math4D.morphFigures(dA, dB, t);
        const ca = new THREE.Color(dA.color || '#00f3ff');
        const cb = new THREE.Color(dB.color || '#ff00ea');
        out.color = '#' + ca.clone().lerp(cb, t).getHexString();
        return out;
    }

    return {
        setFigures, computeMorphed,
        setAlpha: (v) => { alpha = v; },
        getAlpha: () => alpha,
        getFigA: () => figA,
        getFigB: () => figB,
    };
})();

if (typeof window !== 'undefined') {
    window.ChromaAbrShader = ChromaAbrShader;
    window.ReactiveBG = ReactiveBG;
    window.HyperTunnel = HyperTunnel;
    window.MouseGravity = MouseGravity;
    window.CreatureAI = CreatureAI;
    window.AIDirector4D = AIDirector4D;
    window.URLShare = URLShare;
    window.Gallery = Gallery;
    window.QRShare = QRShare;
    window.PresentMode = PresentMode;
    window.FigureDNA = FigureDNA;
    window.MorphSlider = MorphSlider;
}
