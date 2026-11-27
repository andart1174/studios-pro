/**
 * sketch.js — Hyper-Sketch 4D Multi-Stroke & Mandala Studio (v5.0)
 * =================================================================
 * Supports multiple disconnected strokes, Undo, 1x/2x/4x/8x radial Mandala
 * symmetry, 6 volumetric styles (NEON, BUBBLE, RIBBON, QUANTUM, CRYSTAL, NEURAL),
 * zero 60fps geometry GC thrashing, and full GLB/STL/OBJ/AR exportability!
 */

const SketchEngine = (() => {
    let strokes = []; // Array of stroke arrays: [[{x, y, dist}, ...], ...]
    let currentStroke = null;
    let enabled = false;
    let currentThickness = 0.065;
    let currentColor = '#00f3ff';
    let currentStyle = 'NEON'; // 'NEON', 'PULSE', 'RIBBON', 'QUANTUM', 'CRYSTAL', 'NEURAL'
    let symmetry = 1;          // 1 | 2 | 4 | 8
    let group = null;
    let dirty = true;

    function reset() {
        strokes = [];
        currentStroke = null;
        dirty = true;
    }

    function startStroke(x, y) {
        currentStroke = [{ x, y, dist: 0 }];
        strokes.push(currentStroke);
        dirty = true;
    }

    function addPoint(x, y) {
        if (!currentStroke) { startStroke(x, y); return; }
        const last = currentStroke[currentStroke.length - 1];
        const d = Math.hypot(x - last.x, y - last.y);
        if (d < 0.03) return;
        currentStroke.push({ x, y, dist: last.dist + d });
        dirty = true;
    }

    function endStroke() {
        if (currentStroke && currentStroke.length < 2) {
            strokes.pop();
        }
        currentStroke = null;
        dirty = true;
    }

    function undo() {
        if (strokes.length > 0) {
            strokes.pop();
            dirty = true;
        }
    }

    function hasPoints() {
        return strokes.some(s => s.length >= 2);
    }

    function disposeGroup(grp) {
        if (!grp) return;
        grp.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
            }
        });
    }

    /**
     * Builds solid volumetric 3D/4D mesh group once (cached until strokes/style change!)
     * and returns the Three.js Group (100% exportable to GLB, STL, OBJ, AR!).
     */
    function buildGroup(scene, params) {
        if (group) {
            if (scene) scene.remove(group);
            disposeGroup(group);
            group = null;
        }
        if (!hasPoints()) return null;

        group = new THREE.Group();
        group.name = 'HyperSketch_4D';
        const col = new THREE.Color(currentColor);
        const thick = Math.max(0.02, currentThickness);
        const symCount = Math.max(1, symmetry);
        const wAmp = 0.45 * (params ? params.tube : 0.3);
        const wOff = params ? params.wOffset : 0;

        for (let sIdx = 0; sIdx < strokes.length; sIdx++) {
            const st = strokes[sIdx];
            if (st.length < 2) continue;

            for (let copy = 0; copy < symCount; copy++) {
                const rotA = (copy / symCount) * Math.PI * 2;
                const ca = Math.cos(rotA), sa = Math.sin(rotA);

                const pts3 = st.map(pt => {
                    const rx = pt.x * ca - pt.y * sa;
                    const ry = pt.x * sa + pt.y * ca;
                    const rz = Math.sin(pt.dist * 2.6 + copy) * wAmp + Math.cos(pt.dist * 1.4) * 0.18;
                    const rw = Math.cos(pt.dist * 2.0 + rotA) * 0.45 + wOff;
                    const p = Math4D.projectPoint([rx, ry, rz, rw], 'stereo', 4.0);
                    return new THREE.Vector3(p.x, p.y, p.z);
                });

                const curve = new THREE.CatmullRomCurve3(pts3);
                const segs = Math.min(96, Math.max(18, pts3.length * 2));

                if (currentStyle === 'CRYSTAL') {
                    const geo = new THREE.TubeGeometry(curve, Math.max(12, Math.floor(segs * 0.6)), thick * 1.35, 4, false);
                    const mat = new THREE.MeshStandardMaterial({
                        color: col, emissive: col, emissiveIntensity: 0.35,
                        flatShading: true, metalness: 0.72, roughness: 0.18,
                    });
                    group.add(new THREE.Mesh(geo, mat));
                } else if (currentStyle === 'RIBBON') {
                    const geo = new THREE.TubeGeometry(curve, segs, thick * 1.9, 3, false);
                    const mat = new THREE.MeshPhysicalMaterial({
                        color: col, emissive: col, emissiveIntensity: 0.45,
                        roughness: 0.16, metalness: 0.45, clearcoat: 1.0,
                        side: THREE.DoubleSide, transparent: true, opacity: 0.9,
                    });
                    group.add(new THREE.Mesh(geo, mat));
                } else if (currentStyle === 'QUANTUM') {
                    // Solid micro-crystals along the stroke using InstancedMesh (exportable to GLB/STL!)
                    const cnt = Math.min(72, Math.max(16, pts3.length * 3));
                    const samples = curve.getPoints(cnt);
                    const octGeo = new THREE.OctahedronGeometry(thick * 0.85, 0);
                    const mat = new THREE.MeshStandardMaterial({
                        color: col, emissive: col, emissiveIntensity: 0.65,
                        roughness: 0.2, metalness: 0.5,
                    });
                    const inst = new THREE.InstancedMesh(octGeo, mat, samples.length);
                    const dummy = new THREE.Object3D();
                    samples.forEach((sp, idx) => {
                        const j = (idx % 3 - 1) * thick * 1.1;
                        dummy.position.set(sp.x + j, sp.y - j * 0.5, sp.z + j * 0.7);
                        dummy.rotation.set(idx * 0.4, idx * 0.6, 0);
                        dummy.scale.setScalar(0.65 + 0.55 * Math.sin(idx * 0.6));
                        dummy.updateMatrix();
                        inst.setMatrixAt(idx, dummy.matrix);
                    });
                    inst.instanceMatrix.needsUpdate = true;
                    group.add(inst);
                } else if (currentStyle === 'NEURAL') {
                    for (let strand = -1; strand <= 1; strand++) {
                        const offPts = pts3.map((pt, i) => new THREE.Vector3(
                            pt.x + Math.sin(i * 0.6 + strand * 2.1) * thick * 1.6,
                            pt.y + Math.cos(i * 0.6 + strand * 2.1) * thick * 1.6,
                            pt.z + strand * thick * 1.2
                        ));
                        const offCurve = new THREE.CatmullRomCurve3(offPts);
                        const geo = new THREE.TubeGeometry(offCurve, segs, thick * 0.48, 6, false);
                        const mat = new THREE.MeshStandardMaterial({
                            color: col, emissive: col, emissiveIntensity: 0.55,
                            roughness: 0.22, metalness: 0.6,
                        });
                        group.add(new THREE.Mesh(geo, mat));
                    }
                } else {
                    // NEON or PULSE
                    const geo = new THREE.TubeGeometry(curve, segs, thick, 10, false);
                    const mat = new THREE.MeshPhysicalMaterial({
                        color: col, emissive: col, emissiveIntensity: 0.6,
                        roughness: 0.14, metalness: 0.68, clearcoat: 1.0,
                    });
                    group.add(new THREE.Mesh(geo, mat));

                    if (currentStyle === 'PULSE') {
                        const tip = pts3[pts3.length - 1];
                        const orb = new THREE.Mesh(
                            new THREE.SphereGeometry(thick * 2.2, 16, 16),
                            new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: col, emissiveIntensity: 1.3 })
                        );
                        orb.position.copy(tip);
                        group.add(orb);
                    }
                }
            }
        }

        if (scene) scene.add(group);
        dirty = false;
        return group;
    }

    function update(t, speed, animating) {
        if (!enabled || !group) return;
        if (animating) {
            group.rotation.y = t * 0.45 * speed;
            group.rotation.x = Math.sin(t * 0.35 * speed) * 0.3;
        }
        const pulse = 1 + Math.sin(t * 2.2) * 0.03;
        group.scale.setScalar(pulse);
    }

    function remove(scene) {
        if (group && scene) {
            scene.remove(group);
            disposeGroup(group);
        }
        group = null;
        enabled = false;
    }

    return {
        startStroke, addPoint, endStroke, undo, reset,
        buildGroup, update, remove,
        getGroup: () => group,
        getStrokes: () => strokes,
        setEnabled: (v) => { enabled = v; },
        isEnabled: () => enabled,
        isDirty: () => dirty,
        hasPoints,
        setThickness: (v) => { currentThickness = v; dirty = true; },
        getThickness: () => currentThickness,
        setColor: (v) => { currentColor = v; dirty = true; },
        getColor: () => currentColor,
        setStyle: (v) => { currentStyle = v; dirty = true; },
        getStyle: () => currentStyle,
        setSymmetry: (v) => { symmetry = v; dirty = true; },
        getSymmetry: () => symmetry,
    };
})();

if (typeof window !== 'undefined') window.SketchEngine = SketchEngine;
if (typeof module !== 'undefined' && module.exports) module.exports = SketchEngine;
