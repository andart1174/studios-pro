/**
 * extras.js — 4D Figure Builder PRO Feature Suite
 * ================================================
 * Modules:
 *  - ChromaAbr     : Chromatic Aberration post-process
 *  - ReactiveBG    : Audio-reactive background
 *  - HyperTunnel   : Hyperspace tunnel on Burst
 *  - MouseGravity  : Cursor attracts/repels 4D vertices
 *  - MorphSlider   : Smooth morph between two figures
 *  - CreatureAI    : Organic autonomous parameter animation
 *  - URLShare      : Encode/decode full state in URL hash
 *  - Gallery       : localStorage screenshot gallery (12 max)
 *  - QRShare       : QR code from shareable URL
 *  - PresentMode   : Auto-cycle presentation mode
 *  - FigureDNA     : Unique color hash display per figure
 *  - OBJExport     : Export current 3D slice as .obj
 */

// ───────────────────────────────────────────────────────────────────────────
// CHROMATIC ABERRATION SHADER
// ───────────────────────────────────────────────────────────────────────────
const ChromaAbrShader = {
    uniforms: {
        tDiffuse: { value: null },
        amount:   { value: 0.002 },
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
            gl_FragColor = vec4(cr.r, cg.g, cb.b, 1.0);
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
            time:      { value: 0 },
            beat:      { value: 0 },
            color1:    { value: new THREE.Color(0x000510) },
            color2:    { value: new THREE.Color(0x001030) },
            color3:    { value: new THREE.Color(0x100005) },
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
                float spiral = sin(d * 30.0 - ang * 5.0 + time * 3.0) * 0.1;
                vec3 col = mix(color1, color2, wave + ring + spiral);
                col = mix(col, color3, sin(uv.x * 6.0 + time * 0.5) * 0.3 + 0.3);
                col += beat * 0.15 * color2;
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
        scene.add(bgMesh);
    }

    function setColors(c1, c2) {
        if (!bgMat) return;
        bgMat.uniforms.color1.value = new THREE.Color(c1).multiplyScalar(0.08);
        bgMat.uniforms.color2.value = new THREE.Color(c2).multiplyScalar(0.15);
        bgMat.uniforms.color3.value = new THREE.Color(c1).multiplyScalar(0.05);
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
// HYPERSPACE TUNNEL (Burst enhancement)
// ───────────────────────────────────────────────────────────────────────────
const HyperTunnel = (() => {
    let rings = [], active = false, t = 0, scene = null;
    const N_RINGS = 18;

    function init(sc) { scene = sc; }

    function trigger() {
        // Remove old rings
        rings.forEach(r => scene.remove(r));
        rings = [];
        for (let i = 0; i < N_RINGS; i++) {
            const geo = new THREE.RingGeometry(0.1 + i * 0.22, 0.18 + i * 0.22, 64);
            const mat = new THREE.MeshBasicMaterial({
                color: new THREE.Color().setHSL(i / N_RINGS, 1, 0.6),
                transparent: true,
                opacity: 0.0,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                depthWrite: true,
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.z = -i * 0.3;
            mesh.userData.delay = i * 0.04;
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
            r.material.opacity = frac < 0.7 ? frac / 0.7 * 0.8 : (1 - frac) / 0.3 * 0.8;
            r.position.z = -i * 0.3 + local * 5;
            r.scale.setScalar(1 + local * 2);
            r.rotation.z += dt * (1 + i * 0.1);
            if (frac < 1) allDone = false;
        });
        if (allDone || t > 2.5) {
            rings.forEach(r => scene.remove(r));
            rings = [];
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
    let mouse3D = new THREE.Vector3();
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

    function applyGravity(verts4d, baseVerts4d, rotAngles, project4Dto3D, rotate4D, strength = 0.45) {
        if (!enabled) return;
        const dir = repel ? -1 : 1;
        verts4d.forEach((v, i) => {
            const base = baseVerts4d[i];
            const rotated = rotate4D(base, rotAngles);
            const p3 = project4Dto3D(rotated);
            const dx = mouse3D.x - p3.x;
            const dy = mouse3D.y - p3.y;
            const distSq = dx*dx + dy*dy + 0.01;
            const force = (dir * strength) / (distSq + 0.8);
            
            // Apply distortion to all 4D components proportionally to their contribution
            // This makes the "pull" feel much more organic and 4D-aware
            const amt = force * 0.15;
            v[0] = base[0] + dx * amt;
            v[1] = base[1] + dy * amt;
            v[2] = base[2] + (dx + dy) * amt * 0.3;
            v[3] = base[3] - (dx - dy) * amt * 0.2;
        });
    }

    function toggle(v) { enabled = v; }
    function setRepel(v) { repel = v; }

    return { setMouseWorld, applyGravity, toggle, setRepel, isEnabled: () => enabled };
})();

// ───────────────────────────────────────────────────────────────────────────
// CREATURE AI — organic autonomous parameter animation
// ───────────────────────────────────────────────────────────────────────────
const CreatureAI = (() => {
    let enabled = false;
    let targets = {};
    let phase = Math.random() * 100;

    function randomTarget() {
        return {
            radius: 0.6 + Math.random() * 0.8,
            tube:   0.1 + Math.random() * 0.5,
            twist:  Math.random() * Math.PI * 2,
            wOffset:Math.random() * 2 - 1,
        };
    }

    let current = randomTarget(), next = randomTarget(), tween = 0;
    let lastRebuild = 0;

    function update(dt, params, buildFigure, figId) {
        if (!enabled) return;
        phase += dt * 0.3;
        tween += dt * 0.15;
        if (tween >= 1) { current = next; next = randomTarget(); tween = 0; }
        const f = tween < 0.5 ? tween * 2 : (1 - tween) * 2;
        const smooth = f * f * (3 - 2 * f);
        params.radius  = current.radius  + (next.radius  - current.radius)  * smooth;
        params.tube    = current.tube    + (next.tube    - current.tube)    * smooth;
        params.twist   = current.twist   + (next.twist   - current.twist)   * smooth;
        params.wOffset = current.wOffset + (next.wOffset - current.wOffset) * smooth;
        
        // Performance optimization: Throttle geometry rebuilds to ~20fps during AI mode
        const now = Date.now();
        if (now - lastRebuild > 50) {
            buildFigure(figId, params);
            lastRebuild = now;
        }
        // Sync UI sliders
        const sync = (id, val, min, max) => {
            const el = document.getElementById(id);
            const vl = document.getElementById(id + '-val');
            if (el) el.value = val;
            if (vl) vl.textContent = val.toFixed ? val.toFixed(2) : val;
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
// SHAREABLE URL — encode full state in URL hash
// ───────────────────────────────────────────────────────────────────────────
const URLShare = (() => {
    function encode(state) {
        const payload = {
            f: state.figId,
            c: state.cat,
            t: state.theme,
            a: state.animMode,
            p: { r: +state.params.radius.toFixed(2), t: +state.params.tube.toFixed(2),
                 s: state.params.segs, tw: +state.params.twist.toFixed(2), w: +state.params.wOffset.toFixed(2) },
            sp: +state.speed.toFixed(1),
            rm: state.renderMode,
            pr: state.proj,
        };
        try { return '#' + btoa(JSON.stringify(payload)).replace(/=/g,''); }
        catch(e) { return ''; }
    }

    function decode(hash) {
        try {
            const raw = hash.replace(/^#/, '');
            // Pad base64
            const pad = raw + '=='.slice(0, (4 - raw.length % 4) % 4);
            return JSON.parse(atob(pad));
        } catch(e) { return null; }
    }

    function share(state) {
        const url = window.location.href.split('#')[0] + encode(state);
        navigator.clipboard.writeText(url).then(() => true).catch(() => {
            // fallback: show url
            prompt('🔗 Share this URL:', url);
        });
        return url;
    }

    function loadFromHash(hash, state, selectFigure, setTheme) {
        const d = decode(hash);
        if (!d) return false;
        if (d.t) setTheme(d.t);
        if (d.f && d.c) {
            if (d.p) {
                state.params.radius  = d.p.r  || 1.0;
                state.params.tube    = d.p.t   || 0.3;
                state.params.segs    = d.p.s   || 24;
                state.params.twist   = d.p.tw  || 0;
                state.params.wOffset = d.p.w   || 0;
            }
            if (d.sp) state.speed = d.sp;
            if (d.rm) state.renderMode = d.rm;
            if (d.pr) state.proj = d.pr;
            if (d.a)  state.animMode = d.a;
            if (d.c === 'robots' && typeof selectRobot === 'function') {
                selectRobot(d.f);
            } else {
                selectFigure(d.f, d.c);
            }
        }
        return true;
    }

    return { encode, decode, share, loadFromHash };
})();

// ───────────────────────────────────────────────────────────────────────────
// SCREENSHOT GALLERY — localStorage, 12 max
// ───────────────────────────────────────────────────────────────────────────
const Gallery = (() => {
    const KEY = '4d_gallery_v1';
    const MAX = 12;

    function getAll() {
        try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
        catch(e) { return []; }
    }

    function save(renderer, figName, theme) {
        const dataURL = renderer.domElement.toDataURL('image/jpeg', 0.8);
        const items = getAll();
        items.unshift({ img: dataURL, name: figName, theme, ts: Date.now() });
        if (items.length > MAX) items.pop();
        localStorage.setItem(KEY, JSON.stringify(items));
        return items.length;
    }

    function clear() { localStorage.removeItem(KEY); }

    function renderPanel(panelEl, lang) {
        const items = getAll();
        panelEl.innerHTML = '';
        if (items.length === 0) {
            panelEl.innerHTML = `<p class="gallery-empty">${lang==='fr'?'Aucune capture':'No screenshots yet'}</p>`;
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
            el.querySelector('.gallery-dl').addEventListener('click', () => {
                const a = document.createElement('a');
                a.href = item.img; a.download = `4d-${item.name}-${item.ts}.jpg`;
                a.click();
            });
            panelEl.appendChild(el);
        });
    }

    return { save, getAll, clear, renderPanel };
})();

// ───────────────────────────────────────────────────────────────────────────
// QR CODE GENERATOR
// ───────────────────────────────────────────────────────────────────────────
const QRShare = (() => {
    function generateQR(url, targetEl) {
        targetEl.innerHTML = '';
        const encoded = encodeURIComponent(url);
        const qrImg = document.createElement('img');
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encoded}&bgcolor=050510&color=00f3ff&qzone=2`;
        qrImg.style.cssText = 'width:180px;height:180px;border-radius:8px;border:2px solid rgba(0,243,255,0.4);';
        qrImg.alt = 'QR Code';
        targetEl.appendChild(qrImg);
        const label = document.createElement('p');
        label.style.cssText = 'font-size:0.7rem;color:#7a7a9a;margin-top:6px;text-align:center;word-break:break-all;max-width:180px;';
        label.textContent = url.length > 60 ? url.slice(0, 57) + '...' : url;
        targetEl.appendChild(label);
    }
    return { generateQR };
})();

// ───────────────────────────────────────────────────────────────────────────
// PRESENTATION MODE — auto-cycle figures
// ───────────────────────────────────────────────────────────────────────────
const PresentMode = (() => {
    let enabled = false, timer = null, idx = 0;
    let figList = [], callback = null, interval = 5000;

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

    function toggle(v, cb, ms = 6000) {
        enabled = v; callback = cb; interval = ms;
        if (!v) { clearInterval(timer); timer = null; return; }
        buildList();
        clearInterval(timer);
        timer = setInterval(next, interval);
    }

    return { toggle, next, isEnabled: () => enabled };
})();

// ───────────────────────────────────────────────────────────────────────────
// FIGURE DNA — unique color hash per figure id
// ───────────────────────────────────────────────────────────────────────────
const FigureDNA = (() => {
    function getHash(id) {
        let h = 0;
        for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
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
// OBJ EXPORT — current 3D projection as Wavefront OBJ
// ───────────────────────────────────────────────────────────────────────────
const OBJExport = (() => {
    function export3D(figId, verts3d, edges) {
        // Build Wavefront OBJ content
        let obj = `# 4D Figure Builder PRO — ${figId}\n`;
        obj += `# Vertices: ${verts3d.length}  Edges: ${edges.length}\n`;
        obj += `o ${figId}\n`;
        verts3d.forEach(v => {
            obj += `v ${v.x.toFixed(6)} ${v.y.toFixed(6)} ${v.z.toFixed(6)}\n`;
        });
        edges.forEach(e => {
            obj += `l ${e[0]+1} ${e[1]+1}\n`;
        });
        
        // Export faces if the figure has them (PRO feature enhancement)
        const ud = fxGroup?.userData;
        if (ud && ud.faces && ud.faces.length > 0) {
            obj += "# Faces\n";
            ud.faces.forEach(f => {
                obj += `f ${f[0]+1} ${f[1]+1} ${f[2]+1}\n`;
            });
        }

        const blob = new Blob([obj], { type: 'text/plain' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `4d-${figId}-${Date.now()}.obj`;
        document.body.appendChild(a);
        a.click();
        // Give the browser 500ms to initiate the download BEFORE revoking the URL
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 500);
    }
    return { export3D };
})();

// ───────────────────────────────────────────────────────────────────────────
// MORPH SLIDER — smooth morph between two figures
// ───────────────────────────────────────────────────────────────────────────
const MorphSlider = (() => {
    let figA = null, figB = null, alpha = 0;

    function setFigures(a, b) { figA = a; figB = b; }

    function computeMorphed(params, alpha) {
        if (!figA || !figB) return null;
        const dA = Figures.generate(figA, params);
        const dB = Figures.generate(figB, params);
        const nA = dA.verts.length, nB = dB.verts.length;
        const n = Math.max(nA, nB);
        const verts = [];
        for (let i = 0; i < n; i++) {
            const vA = dA.verts[i % nA];
            const vB = dB.verts[i % nB];
            verts.push([
                vA[0] + (vB[0] - vA[0]) * alpha,
                vA[1] + (vB[1] - vA[1]) * alpha,
                vA[2] + (vB[2] - vA[2]) * alpha,
                vA[3] + (vB[3] - vA[3]) * alpha,
            ]);
        }
        const edges = alpha < 0.5 ? dA.edges : dB.edges;
        const color = blendColors(dA.color, dB.color, alpha);
        return { verts, edges, color,
            name_en: alpha < 0.5 ? dA.name_en : dB.name_en,
            name_fr: alpha < 0.5 ? dA.name_fr : dB.name_fr,
            icon: alpha < 0.5 ? dA.icon : dB.icon,
            desc_en: `Morph ${dA.name_en} ↔ ${dB.name_en}`,
            desc_fr: `Morphose ${dA.name_fr} ↔ ${dB.name_fr}`,
        };
    }

    function blendColors(a, b, t) {
        const ca = new THREE.Color(a || '#00f3ff'), cb = new THREE.Color(b || '#ff00ea');
        return '#' + ca.clone().lerp(cb, t).getHexString();
    }

    function setAlpha(v) { alpha = v; }
    function getAlpha() { return alpha; }
    function getFigA()  { return figA; }
    function getFigB()  { return figB; }

    return { setFigures, computeMorphed, setAlpha, getAlpha, getFigA, getFigB };
})();
