// ArchitectPro — Three.js 3D Scene + Floor Plan Sync
"use strict";

let _scene, _camera, _renderer;
let _houseGroup = null, _fpGroup = null;
let _animating = false, _wireframe = false, _phaseIdx = 0;
const _mats = {};

/* ── INIT ─────────────────────────────────────────────────── */
function init3D() {
    const canvas = document.getElementById('canvas-3d');
    if (!window.THREE || _renderer) return;
    _scene = new THREE.Scene();
    _scene.background = new THREE.Color(0x0a0c12);
    _scene.fog = new THREE.FogExp2(0x0a0c12, 0.015);

    const w = canvas.offsetWidth || 600, h = canvas.offsetHeight || 500;
    _camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 500);
    _renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    _renderer.setSize(w, h);
    _renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    _renderer.shadowMap.enabled = true;
    _renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    _renderer.toneMapping = THREE.ACESFilmicToneMapping;
    _renderer.toneMappingExposure = 1.1;
    window._three3DRenderer = _renderer; window._three3DCamera = _camera; window._three3DScene = _scene;

    // Lights
    _scene.add(new THREE.AmbientLight(0xfff3e0, 0.5));
    const sun = new THREE.DirectionalLight(0xfff8e7, 1.3);
    sun.position.set(30, 50, 20); sun.castShadow = true;
    sun.shadow.mapSize.width = sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.left = sun.shadow.camera.bottom = -40;
    sun.shadow.camera.right = sun.shadow.camera.top = 40;
    _scene.add(sun);
    const fill = new THREE.DirectionalLight(0xc0d8ff, 0.4); fill.position.set(-20, 15, -20); _scene.add(fill);
    _scene.add(new THREE.HemisphereLight(0x87ceeb, 0x556b2f, 0.35));

    // Ground
    const gMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(colors.ground) });
    _mats.ground = gMat;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), gMat);
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; _scene.add(ground);
    const grid = new THREE.GridHelper(150, 50, 0x1e2235, 0x1e2235); grid.position.y = 0.01; _scene.add(grid);

    setupOrbit(canvas);
    buildHouse(_phaseIdx);
    buildFloorPlanMeshes();
    _animating = true; animate();
}

function start3D() { if (!_renderer) init3D(); else { buildHouse(_phaseIdx); buildFloorPlanMeshes(); } }

/* ── HOUSE GEOMETRY ─────────────────────────────────────────── */
function buildHouse(phaseIdx) {
    if (!_scene) return;
    _phaseIdx = phaseIdx;
    if (_houseGroup) { _scene.remove(_houseGroup); _houseGroup.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    _houseGroup = new THREE.Group();

    const L = project.length || 10, W = project.width || 8;
    const fH = project.floorHeight || 2.8, FL = project.floors || 1;
    const totH = fH * FL, wt = 0.3, baseY = 0.6;
    const showFnd = phaseIdx >= 0, showWal = phaseIdx >= 1, showRof = phaseIdx >= 2, showWin = phaseIdx >= 3;

    if (showFnd) {
        const fMat = makeMat(0x5c4033, 'foundation');
        const fnd = new THREE.Mesh(new THREE.BoxGeometry(L + 1.2, 0.6, W + 1.2), fMat);
        fnd.position.set(0, 0.3, 0); fnd.castShadow = true; _houseGroup.add(fnd);
        if (phaseIdx === 0) glowMesh(fnd, 0xf59e0b);
    }

    if (showWal) {
        const wMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(colors.extWalls) }); _mats.extWalls = wMat;
        // Walls as 4 panels
        const panels = [
            [L, totH, wt, 0, baseY + totH / 2, W / 2],
            [L, totH, wt, 0, baseY + totH / 2, -W / 2],
            [wt, totH, W, -L / 2, baseY + totH / 2, 0],
            [wt, totH, W, L / 2, baseY + totH / 2, 0]
        ];
        panels.forEach(([gx, gy, gz, px, py, pz]) => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(gx, gy, gz), wMat);
            m.position.set(px, py, pz); m.castShadow = true; m.receiveShadow = true; _houseGroup.add(m);
        });
        // Floor slabs
        const flMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(colors.floor) }); _mats.floor = flMat;
        for (let f = 0; f < FL; f++) {
            const sl = new THREE.Mesh(new THREE.BoxGeometry(L - wt * 2, 0.15, W - wt * 2), flMat);
            sl.position.set(0, baseY + 0.075 + fH * f, 0); sl.receiveShadow = true; _houseGroup.add(sl);
        }
    }

    if (showWin) { addWindowsDoors3D(L, W, baseY, totH, fH, FL); }

    if (showRof) { buildRoof3D(L, W, baseY + totH); }

    _houseGroup.position.set(0, 0, 0);
    _scene.add(_houseGroup);
    const md = Math.max(L, W, totH);
    _camera.position.set(md * 1.8, md * 1.3, md * 2.1);
    _camera.lookAt(0, totH / 2, 0);
    update3DColors(colors);
}

function addWindowsDoors3D(L, W, baseY, totH, fH, FL) {
    const winMat = new THREE.MeshPhongMaterial({ color: new THREE.Color(colors.windows), transparent: true, opacity: 0.6, shininess: 120 });
    _mats.windows = winMat;
    const frameMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(colors.windows) });
    const wH = 1.0, wW = 0.9, wY = baseY + 1.4;
    // Front windows
    for (let f = 0; f < FL; f++) {
        [-L * 0.28, L * 0.28].forEach(xo => {
            const w = new THREE.Mesh(new THREE.BoxGeometry(wW, wH, 0.34), winMat);
            w.position.set(xo, wY + f * fH, W / 2); _houseGroup.add(w);
        });
    }
    // Side windows
    for (let f = 0; f < FL; f++) {
        [-W * 0.2, W * 0.2].forEach(zo => {
            const w = new THREE.Mesh(new THREE.BoxGeometry(0.34, wH, wW), winMat);
            w.position.set(L / 2, wY + f * fH, zo); _houseGroup.add(w);
        });
    }
    // Door
    const dMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(colors.windows) });
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.1, 0.34), dMat);
    door.position.set(0, baseY + 1.05, W / 2); _houseGroup.add(door);
}

function buildRoof3D(L, W, baseY) {
    const rMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(colors.roof), side: THREE.DoubleSide }); _mats.roof = rMat;
    const rType = project.roofType || 0, rH = Math.min(L, W) * 0.38;
    if (rType === 0) {
        const r = new THREE.Mesh(new THREE.BoxGeometry(L + 0.6, 0.25, W + 0.6), rMat); r.position.set(0, baseY + 0.12, 0); r.castShadow = true; _houseGroup.add(r);
    } else if (rType === 1) { buildGable(L, W, baseY, rH, rMat); }
    else { buildHip(L, W, baseY, rH, rMat); }
}

function buildGable(L, W, baseY, rH, mat) {
    const ov = 0.3, hL = L / 2 + ov, hW = W / 2 + ov;
    const ridgeL = new THREE.Vector3(-hL, 0, 0), ridgeR = new THREE.Vector3(hL, 0, 0);
    const mkSlope = (pts) => {
        const g = new THREE.BufferGeometry();
        const v = new Float32Array(pts.length / 3 * 9);
        // triangulate quad from 4 points or tri from 3
        if (pts.length === 4) {
            const p = pts.map(([x, y, z]) => new THREE.Vector3(x, y, z));
            const arr = [p[0], p[1], p[2], p[0], p[2], p[3]];
            arr.forEach((pt, i) => { v[i * 3] = pt.x; v[i * 3 + 1] = pt.y; v[i * 3 + 2] = pt.z; });
            g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(arr.length * 3), 3));
            arr.forEach((pt, i) => { g.attributes.position.setXYZ(i, pt.x, pt.y, pt.z); });
        } else {
            pts.forEach(([x, y, z], i) => { v[i * 3] = x; v[i * 3 + 1] = y; v[i * 3 + 2] = z; });
            g.setAttribute('position', new THREE.BufferAttribute(v, 3));
        }
        g.computeVertexNormals();
        const m = new THREE.Mesh(g, mat); m.position.y = baseY; m.castShadow = true; _houseGroup.add(m);
    };
    const rY = rH;
    mkSlope([[-hL, 0, hW], [hL, 0, hW], [hL, rY, 0], [-hL, rY, 0]]);
    mkSlope([[-hL, 0, -hW], [-hL, rY, 0], [hL, rY, 0], [hL, 0, -hW]]);
    mkSlope([[-hL, 0, hW], [-hL, rY, 0], [-hL, 0, -hW]]);
    mkSlope([[hL, 0, hW], [hL, 0, -hW], [hL, rY, 0]]);
}

function buildHip(L, W, baseY, rH, mat) {
    const ov = 0.4, hL = L / 2 + ov, hW = W / 2 + ov, rL = L / 2 * 0.55;
    const mkF = (pts) => {
        const g = new THREE.BufferGeometry();
        const arr = pts.length === 4 ? [pts[0], pts[1], pts[2], pts[0], pts[2], pts[3]] : pts;
        const v = new Float32Array(arr.length * 3);
        arr.forEach(([x, y, z], i) => { v[i * 3] = x; v[i * 3 + 1] = y; v[i * 3 + 2] = z; });
        g.setAttribute('position', new THREE.BufferAttribute(v, 3));
        g.computeVertexNormals();
        const m = new THREE.Mesh(g, mat); m.position.y = baseY; m.castShadow = true; _houseGroup.add(m);
    };
    const rH2 = rH;
    mkF([[-hL, 0, hW], [hL, 0, hW], [rL, rH2, 0], [-rL, rH2, 0]]);
    mkF([[-hL, 0, -hW], [-rL, rH2, 0], [rL, rH2, 0], [hL, 0, -hW]]);
    mkF([[-hL, 0, hW], [-rL, rH2, 0], [-hL, 0, -hW]]);
    mkF([[hL, 0, hW], [hL, 0, -hW], [rL, rH2, 0]]);
}

/* ── FLOOR PLAN SYNC ────────────────────────────────────────── */
function syncFloorPlanTo3D() {
    if (!_scene) { init3D(); return; }
    buildFloorPlanMeshes();
}

function buildFloorPlanMeshes() {
    if (!_scene) return;
    if (_fpGroup) { _scene.remove(_fpGroup); _fpGroup.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    _fpGroup = new THREE.Group();

    const baseY = 0.6, fH = project.floorHeight || 2.8;

    floorPlan.floors.forEach((fl, fi) => {
        const yBase = baseY + fi * fH;
        // Interior walls
        fl.walls.forEach(w => {
            const dx = w.x2 - w.x1, dy = w.y2 - w.y1, len = Math.hypot(dx, dy);
            if (len < 0.1) return;
            const ang = Math.atan2(dy, dx);
            const cx = (w.x1 + w.x2) / 2, cz = (w.y1 + w.y2) / 2;
            const mat = new THREE.MeshLambertMaterial({ color: new THREE.Color(w.color || colors.intWalls) });
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(len, fH * 0.95, w.thickness || 0.15), mat);
            // Three.js: x=real x, y=up, z=real y
            mesh.position.set(cx - project.length / 2, yBase + fH * 0.475, cz - project.width / 2);
            mesh.rotation.y = -ang;
            mesh.castShadow = true; mesh.receiveShadow = true;
            _fpGroup.add(mesh);
        });

        const allWalls = [...getExtWalls(), ...fl.walls];
        // Windows on interior walls (glass overlay)
        fl.windows.forEach(win => {
            const wall = allWalls.find(w => w.id === win.wallId); if (!wall) return;
            const cx = wall.x1 + win.t * (wall.x2 - wall.x1), cz = wall.y1 + win.t * (wall.y2 - wall.y1);
            const ang = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1);
            const wThick = wall.ext ? 0.3 : (wall.thickness || 0.15);
            const gMat = new THREE.MeshPhongMaterial({ color: new THREE.Color(win.color || colors.windows), transparent: true, opacity: 0.55, shininess: 100 });
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(win.width, win.height, wThick + 0.04), gMat);
            mesh.position.set(cx - project.length / 2, yBase + win.height / 2 + 0.9, cz - project.width / 2);
            mesh.rotation.y = -ang;
            _fpGroup.add(mesh);
            // Frame
            const fMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(win.color) });
            const fd = wThick + 0.06;
            [[win.width + 0.06, 0.06, fd, 0, win.height / 2 + 0.03], [win.width + 0.06, 0.06, fd, 0, -win.height / 2 - 0.03],
            [0.06, win.height + 0.06, fd, -win.width / 2 - 0.03, 0], [0.06, win.height + 0.06, fd, win.width / 2 + 0.03, 0]
            ].forEach(([fw, fh, fdep, ox, oy]) => {
                const fm = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, fdep), fMat);
                fm.position.set(cx - project.length / 2 + ox, yBase + 0.9 + win.height / 2 + oy, cz - project.width / 2);
                fm.rotation.y = -ang; _fpGroup.add(fm);
            });
        });

        // Doors
        fl.doors.forEach(door => {
            const wall = allWalls.find(w => w.id === door.wallId); if (!wall) return;
            const cx = wall.x1 + door.t * (wall.x2 - wall.x1), cz = wall.y1 + door.t * (wall.y2 - wall.y1);
            const ang = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1);
            const wThick = wall.ext ? 0.3 : (wall.thickness || 0.15);
            const dMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(door.color || colors.windows) });
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(door.width, door.height, wThick + 0.06), dMat);
            mesh.position.set(cx - project.length / 2, yBase + door.height / 2, cz - project.width / 2);
            mesh.rotation.y = -ang; mesh.castShadow = true; _fpGroup.add(mesh);
        });

        // Stairs
        fl.stairs.forEach(s => {
            const nSteps = Math.round(fH / 0.18);
            const stepH = fH / nSteps, stepD = s.length / nSteps;
            const stairMat = new THREE.MeshLambertMaterial({ color: 0x8b7355 });
            const cx3 = s.x - project.length / 2 + s.length / 2, cz3 = s.y - project.width / 2 + s.width / 2;
            for (let i = 0; i < nSteps; i++) {
                const step = new THREE.Mesh(new THREE.BoxGeometry(stepD, stepH * (i + 1), s.width), stairMat);
                const ang = s.direction === 'up' || s.direction === 'down' ? 0 : Math.PI / 2;
                const xOff = (i - nSteps / 2 + 0.5) * stepD * (s.direction === 'left' ? -1 : 1);
                const zOff = s.direction === 'up' || (s.direction === 'down') ? (i - nSteps / 2 + 0.5) * stepD : 0;
                step.position.set(
                    cx3 + (s.direction === 'right' || s.direction === 'left' ? xOff : 0),
                    yBase + stepH * (i + 1) / 2,
                    cz3 + (s.direction === 'up' || s.direction === 'down' ? zOff : 0)
                );
                step.castShadow = true; step.receiveShadow = true;
                _fpGroup.add(step);
            }
        });
    });

    _scene.add(_fpGroup);
}

/* ── COLOR UPDATE ───────────────────────────────────────────── */
function update3DColors(cols) {
    if (!_scene) return;
    if (_mats.extWalls) _mats.extWalls.color.set(new THREE.Color(cols.extWalls));
    if (_mats.roof) _mats.roof.color.set(new THREE.Color(cols.roof));
    if (_mats.windows) _mats.windows.color.set(new THREE.Color(cols.windows));
    if (_mats.floor) _mats.floor.color.set(new THREE.Color(cols.floor));
    if (_mats.ground) _mats.ground.color.set(new THREE.Color(cols.ground));
}

function update3DPhase(idx) { _phaseIdx = idx; buildHouse(idx); buildFloorPlanMeshes(); }

function toggleWireframe() {
    _wireframe = !_wireframe;
    [_houseGroup, _fpGroup].forEach(g => { if (!g) return; g.traverse(o => { if (o.isMesh && o.material) o.material.wireframe = _wireframe; }); });
    const b = document.getElementById('btn-wireframe'); if (b) { b.style.color = _wireframe ? 'var(--accent)' : ''; b.style.opacity = _wireframe ? 1 : 0.7; }
}

function resetCamera() {
    if (!_camera || !project.length) return;
    const md = Math.max(project.length, project.width, project.floorHeight * project.floors);
    _camera.position.set(md * 1.8, md * 1.3, md * 2.1);
    _camera.lookAt(0, (project.floorHeight * project.floors) / 2, 0);
}

/* ── ANIMATE ────────────────────────────────────────────────── */
function animate() {
    if (!_animating) return; requestAnimationFrame(animate);
    if (_renderer && _scene && _camera) _renderer.render(_scene, _camera);
}

/* ── ORBIT CONTROLS ─────────────────────────────────────────── */
function setupOrbit(canvas) {
    let drag = false, pan = false, prevX = 0, prevY = 0;
    let sph = { th: 0.8, ph: 0.9, r: 40 };
    let panY = 5;

    function updCam() {
        const x = sph.r * Math.sin(sph.ph) * Math.sin(sph.th);
        const y = sph.r * Math.cos(sph.ph);
        const z = sph.r * Math.sin(sph.ph) * Math.cos(sph.th);
        _camera.position.set(x, y + panY, z); _camera.lookAt(0, panY, 0);
    }

    canvas.addEventListener('mousedown', e => { if (e.button === 0) drag = true; if (e.button === 2) pan = true; prevX = e.clientX; prevY = e.clientY; });
    window.addEventListener('mousemove', e => {
        const dx = e.clientX - prevX, dy = e.clientY - prevY; prevX = e.clientX; prevY = e.clientY;
        if (drag) { sph.th -= dx * 0.008; sph.ph = Math.max(0.1, Math.min(Math.PI - 0.1, sph.ph + dy * 0.008)); updCam(); }
        if (pan) { panY = Math.max(-5, Math.min(30, panY - dy * 0.05)); updCam(); }
    });
    window.addEventListener('mouseup', () => { drag = false; pan = false; });
    canvas.addEventListener('wheel', e => { e.preventDefault(); sph.r = Math.max(4, Math.min(150, sph.r + e.deltaY * 0.1)); updCam(); }, { passive: false });
    canvas.addEventListener('touchstart', e => { const t = e.touches[0]; drag = true; prevX = t.clientX; prevY = t.clientY; });
    canvas.addEventListener('touchmove', e => { e.preventDefault(); const t = e.touches[0]; const dx = t.clientX - prevX, dy = t.clientY - prevY; prevX = t.clientX; prevY = t.clientY; sph.th -= dx * 0.008; sph.ph = Math.max(0.1, Math.min(Math.PI - 0.1, sph.ph + dy * 0.008)); updCam(); }, { passive: false });
    canvas.addEventListener('touchend', () => drag = false);

    updCam();
}

/* ── HELPERS ────────────────────────────────────────────────── */
function makeMat(hex, key) { const m = new THREE.MeshLambertMaterial({ color: hex }); _mats[key] = m; return m; }
function glowMesh(m, c) { if (m.material && m.material.emissive) { m.material.emissive = new THREE.Color(c); m.material.emissiveIntensity = 0.25; } }
