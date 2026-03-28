/**
 * robots.js — Animated Robot & Alien Three.js Assembly System
 * =============================================================
 * Builds articulated Three.js Group objects for robots (moving arms/legs)
 * and living alien creatures. These bypass the 4D math pipeline and render
 * directly in 3D with skeletal animation.
 */

const RobotEngine = (() => {

    const TAU = Math.PI * 2;
    let robotGroup = null;
    let alienGroup = null;
    let currentRobot = null;
    let animTime = 0;

    // ── Material factory ─────────────────────────────────────────────────────
    function wireMat(color, opacity = 0.9) {
        return new THREE.MeshBasicMaterial({
            color, wireframe: true, transparent: true, opacity,
            blending: THREE.AdditiveBlending, depthWrite: false,
        });
    }
    function edgeMat(color) {
        return new THREE.LineBasicMaterial({
            color, transparent: true, opacity: 0.85,
            blending: THREE.AdditiveBlending, depthWrite: false,
        });
    }
    function solidMat(color, opacity = 0.25) {
        return new THREE.MeshBasicMaterial({
            color, transparent: true, opacity,
            blending: THREE.AdditiveBlending, depthWrite: true, side: THREE.DoubleSide,
        });
    }

    function addEdges(mesh) {
        const edges = new THREE.EdgesGeometry(mesh.geometry);
        const line = new THREE.LineSegments(edges, edgeMat(mesh.material.color.getHex()));
        mesh.add(line);
        return mesh;
    }

    // ── Box helper ───────────────────────────────────────────────────────────
    function box(w, h, d, color, solid = false) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = solid ? solidMat(color) : wireMat(color);
        const m = new THREE.Mesh(geo, mat);
        if (!solid) addEdges(m);
        return m;
    }
    function cyl(rt, rb, h, color, segs = 8) {
        const geo = new THREE.CylinderGeometry(rt, rb, h, segs);
        const m = new THREE.Mesh(geo, wireMat(color));
        addEdges(m);
        return m;
    }
    function sphere(r, color, segs = 6) {
        const geo = new THREE.SphereGeometry(r, segs, segs);
        const m = new THREE.Mesh(geo, wireMat(color));
        addEdges(m);
        return m;
    }
    function ico(r, color, detail = 0) {
        const geo = new THREE.IcosahedronGeometry(r, detail);
        const m = new THREE.Mesh(geo, wireMat(color));
        addEdges(m);
        return m;
    }

    // ────────────────────────────────────────────────────────────────────────
    // ROBOT 1: Walker — bipedal humanoid robot
    // ────────────────────────────────────────────────────────────────────────
    function buildWalker(color = 0x00f3ff) {
        const g = new THREE.Group();
        g.userData.type = 'robot';
        g.userData.name = 'Cyber Walker';

        // Torso
        const torso = box(0.5, 0.6, 0.3, color);
        torso.position.y = 0.3;
        g.add(torso);

        // Head
        const head = ico(0.2, color);
        head.position.y = 0.85;
        g.add(head);

        // Eyes
        [[-0.08, 0.88, 0.18],[0.08, 0.88, 0.18]].forEach(([x,y,z]) => {
            const eye = sphere(0.04, 0xffffff);
            eye.position.set(x, y, z);
            g.add(eye);
        });

        // Shoulders
        const shoulderL = cyl(0.06, 0.06, 0.12, color);
        shoulderL.rotation.z = Math.PI / 2;
        shoulderL.position.set(-0.32, 0.45, 0);
        g.add(shoulderL);
        const shoulderR = shoulderL.clone();
        shoulderR.position.set(0.32, 0.45, 0);
        g.add(shoulderR);

        // Upper arms (pivot group)
        const armL = new THREE.Group(); armL.position.set(-0.36, 0.4, 0); g.add(armL);
        const armR = new THREE.Group(); armR.position.set(0.36, 0.4, 0);  g.add(armR);
        const uArmL = box(0.1, 0.32, 0.1, color); uArmL.position.y = -0.18; armL.add(uArmL);
        const uArmR = box(0.1, 0.32, 0.1, color); uArmR.position.y = -0.18; armR.add(uArmR);

        // Forearms
        const foreArmL = new THREE.Group(); foreArmL.position.y = -0.36; armL.add(foreArmL);
        const foreArmR = new THREE.Group(); foreArmR.position.y = -0.36; armR.add(foreArmR);
        const faL = box(0.08, 0.28, 0.08, color); faL.position.y = -0.15; foreArmL.add(faL);
        const faR = box(0.08, 0.28, 0.08, color); faR.position.y = -0.15; foreArmR.add(faR);

        // Hands
        const handL = ico(0.07, 0xffffff); handL.position.y = -0.31; foreArmL.add(handL);
        const handR = ico(0.07, 0xffffff); handR.position.y = -0.31; foreArmR.add(handR);

        // Pelvis
        const pelvis = box(0.4, 0.18, 0.28, color); pelvis.position.y = -0.09; g.add(pelvis);

        // Upper legs (pivot group)
        const legL = new THREE.Group(); legL.position.set(-0.14, -0.2, 0); g.add(legL);
        const legR = new THREE.Group(); legR.position.set(0.14, -0.2, 0);  g.add(legR);
        const uLegL = box(0.14, 0.38, 0.14, color); uLegL.position.y = -0.2; legL.add(uLegL);
        const uLegR = box(0.14, 0.38, 0.14, color); uLegR.position.y = -0.2; legR.add(uLegR);

        // Knee + lower legs
        const kneeLG = new THREE.Group(); kneeLG.position.y = -0.42; legL.add(kneeLG);
        const kneeRG = new THREE.Group(); kneeRG.position.y = -0.42; legR.add(kneeRG);
        const lLegL = box(0.11, 0.34, 0.11, color); lLegL.position.y = -0.18; kneeLG.add(lLegL);
        const lLegR = box(0.11, 0.34, 0.11, color); lLegR.position.y = -0.18; kneeRG.add(lLegR);

        // Feet
        const footL = box(0.12, 0.06, 0.22, color); footL.position.set(0, -0.37, 0.05); kneeLG.add(footL);
        const footR = box(0.12, 0.06, 0.22, color); footR.position.set(0, -0.37, 0.05); kneeRG.add(footR);

        // Antenna
        const ant = cyl(0.01, 0.01, 0.25, 0xffff00);
        ant.position.set(0, 1.12, 0);
        g.add(ant);
        const antTip = sphere(0.04, 0xffff00);
        antTip.position.set(0, 1.26, 0);
        g.add(antTip);

        // Store references for animation
        g.userData.anim = { armL, armR, foreArmL, foreArmR, legL, legR, kneeLG, kneeRG, head };
        return g;
    }

    // ────────────────────────────────────────────────────────────────────────
    // ROBOT 2: Titan — heavy armored mech
    // ────────────────────────────────────────────────────────────────────────
    function buildTitan(color = 0xff5500) {
        const g = new THREE.Group();
        g.userData.type = 'robot';
        g.userData.name = 'Iron Titan';

        // Massive torso
        const torso = box(0.9, 0.8, 0.5, color);
        torso.position.y = 0.4;
        g.add(torso);

        // Head — blocky visor
        const head = box(0.45, 0.35, 0.35, color); head.position.y = 0.98; g.add(head);
        const visor = box(0.38, 0.12, 0.1, 0xffff00); visor.position.set(0, 0.98, 0.2); g.add(visor);

        // Shoulder cannons
        [-1, 1].forEach(side => {
            const sg = new THREE.Group(); sg.position.set(side * 0.65, 0.6, 0); g.add(sg);
            const shoulder = box(0.28, 0.28, 0.28, color); sg.add(shoulder);
            const cannon = cyl(0.07, 0.05, 0.55, color); cannon.rotation.z = Math.PI/2;
            cannon.position.set(side * 0.32, 0, 0); sg.add(cannon);
            const barrel = cyl(0.05, 0.05, 0.12, 0xffff00); barrel.rotation.z = Math.PI/2;
            barrel.position.set(side * 0.62, 0, 0); sg.add(barrel);
            g.userData['cannonGroup' + (side < 0 ? 'L' : 'R')] = sg;
        });

        // Arms — massive
        const armLG = new THREE.Group(); armLG.position.set(-0.7, 0.25, 0); g.add(armLG);
        const armRG = new THREE.Group(); armRG.position.set(0.7, 0.25, 0);  g.add(armRG);
        const uAL = box(0.22, 0.5, 0.22, color); uAL.position.y = -0.26; armLG.add(uAL);
        const uAR = box(0.22, 0.5, 0.22, color); uAR.position.y = -0.26; armRG.add(uAR);
        const foreL = new THREE.Group(); foreL.position.y = -0.55; armLG.add(foreL);
        const foreR = new THREE.Group(); foreR.position.y = -0.55; armRG.add(foreR);
        const fAL = box(0.18, 0.4, 0.18, color); fAL.position.y = -0.22; foreL.add(fAL);
        const fAR = box(0.18, 0.4, 0.18, color); fAR.position.y = -0.22; foreR.add(fAR);
        const clawL = ico(0.12, 0xffff00); clawL.position.y = -0.45; foreL.add(clawL);
        const clawR = ico(0.12, 0xffff00); clawR.position.y = -0.45; foreR.add(clawR);

        // Legs — wide stance
        const legLG = new THREE.Group(); legLG.position.set(-0.28, -0.1, 0); g.add(legLG);
        const legRG = new THREE.Group(); legRG.position.set(0.28, -0.1, 0); g.add(legRG);
        const uLL = box(0.28, 0.5, 0.28, color); uLL.position.y = -0.27; legLG.add(uLL);
        const uLR = box(0.28, 0.5, 0.28, color); uLR.position.y = -0.27; legRG.add(uLR);
        const kLG = new THREE.Group(); kLG.position.y = -0.55; legLG.add(kLG);
        const kRG = new THREE.Group(); kRG.position.y = -0.55; legRG.add(kRG);
        const lLL = box(0.22, 0.42, 0.22, color); lLL.position.y = -0.23; kLG.add(lLL);
        const lLR = box(0.22, 0.42, 0.22, color); lLR.position.y = -0.23; kRG.add(lLR);
        const footL = box(0.28, 0.1, 0.38, color); footL.position.set(0, -0.49, 0.06); kLG.add(footL);
        const footR = box(0.28, 0.1, 0.38, color); footR.position.set(0, -0.49, 0.06); kRG.add(footR);

        g.userData.anim = { armLG, armRG, foreL, foreR, legLG, legRG, kLG, kRG, head };
        return g;
    }

    // ────────────────────────────────────────────────────────────────────────
    // ROBOT 3: NanoBot — insectoid with 6 legs
    // ────────────────────────────────────────────────────────────────────────
    function buildNanoBot(color = 0x44ffaa) {
        const g = new THREE.Group();
        g.userData.type = 'robot';
        g.userData.name = 'Nano Spider';

        // Central core
        const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), wireMat(color));
        addEdges(core);
        g.add(core);

        // Head sphere
        const head = sphere(0.2, color, 8);
        head.position.set(0, 0, 0.32);
        g.add(head);

        // Eyes
        [[-0.07,0.06,0.5],[0.07,0.06,0.5]].forEach(([x,y,z]) => {
            const e = sphere(0.04, 0xff4444); e.position.set(x,y,z); g.add(e);
        });

        // 6 legs — 3 per side
        const legGroups = [];
        for (let side = -1; side <= 1; side += 2) {
            for (let li = 0; li < 3; li++) {
                const lg = new THREE.Group();
                const zOff = (li - 1) * 0.22;
                lg.position.set(side * 0.28, 0, zOff);
                g.add(lg);

                const seg1 = new THREE.Group(); lg.add(seg1);
                const s1 = cyl(0.02, 0.02, 0.28, color); s1.position.y = -0.14; seg1.add(s1);
                seg1.rotation.z = side * 0.9;

                const seg2 = new THREE.Group(); seg2.position.set(side * 0.25, -0.14, 0); seg1.add(seg2);
                const s2 = cyl(0.015, 0.015, 0.24, color, 6); s2.position.y = -0.12; seg2.add(s2);

                const seg3 = new THREE.Group(); seg3.position.y = -0.26; seg2.add(seg3);
                const foot = cyl(0.02, 0.04, 0.12, 0xffff00, 4); foot.position.y = -0.07; seg3.add(foot);

                legGroups.push({ seg1, seg2, seg3, side, li });
            }
        }

        // Tail
        const tail = cyl(0.02, 0.06, 0.35, color);
        tail.position.set(0, 0, -0.35); tail.rotation.x = Math.PI / 2; g.add(tail);
        const stinger = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 6), wireMat(0xff4444));
        addEdges(stinger); stinger.position.set(0, 0, -0.56); stinger.rotation.x = Math.PI / 2; g.add(stinger);

        g.userData.anim = { core, head, legGroups };
        return g;
    }

    // ────────────────────────────────────────────────────────────────────────
    // Build given robot by id
    // ────────────────────────────────────────────────────────────────────────
    const ROBOT_DEFS = [
        { id: 'walker', name_en: 'Cyber Walker',  name_fr: 'Marcheur Cyber',  icon: '🚶', color: 0x00f3ff, build: buildWalker,
          desc_en:'A bipedal neon-skeleton robot with fully animated arms, legs and walking cycle.',
          desc_fr:'Un robot bipède squelettique avec bras, jambes et cycle de marche animés.' },
        { id: 'titan',  name_en: 'Iron Titan',    name_fr: 'Titan de Fer',    icon: '🦾', color: 0xff5500, build: buildTitan,
          desc_en:'A heavy armored mech with massive shoulder cannons, animated limbs in combat stance.',
          desc_fr:'Un mech blindé lourd avec canons épaulières massifs, membres animés en posture de combat.' },
        { id: 'nano',   name_en: 'Nano Spider',   name_fr: 'Araignée Nano',   icon: '🕷️', color: 0x44ffaa, build: buildNanoBot,
          desc_en:'An insectoid hexapod nano-robot with 6 animated legs, pulsing core and scorpion tail.',
          desc_fr:'Un nano-robot hexapode insectoïde avec 6 pattes animées, noyau pulsant et queue de scorpion.' },
    ];

    function getRobotDefs() { return ROBOT_DEFS; }

    function build(id, scene) {
        if (robotGroup) { scene.remove(robotGroup); robotGroup = null; }
        const def = ROBOT_DEFS.find(r => r.id === id);
        if (!def) return null;
        robotGroup = def.build(def.color);
        robotGroup.position.set(0, 0.55, 0);
        scene.add(robotGroup);
        currentRobot = id;
        return { ...def, verts: 0, edges: 0 }; // dummy for HUD
    }

    function remove(scene) {
        if (robotGroup) { scene.remove(robotGroup); robotGroup = null; }
        currentRobot = null;
    }

    // ────────────────────────────────────────────────────────────────────────
    // Animation update — call every frame
    // ────────────────────────────────────────────────────────────────────────
    function update(dt, speed = 1) {
        animTime += dt * speed;
        if (!robotGroup) return;
        const t = animTime;
        const a = robotGroup.userData.anim;
        if (!a) return;

        if (currentRobot === 'walker') {
            // Walking cycle
            const walk = Math.sin(t * 4);
            a.armL.rotation.x = walk * 0.6;
            a.armR.rotation.x = -walk * 0.6;
            a.foreArmL.rotation.x = Math.max(0, Math.sin(t * 4 - 0.5) * 0.7);
            a.foreArmR.rotation.x = Math.max(0, Math.sin(t * 4 + 0.5 + Math.PI) * 0.7);
            a.legL.rotation.x = -walk * 0.7;
            a.legR.rotation.x = walk * 0.7;
            a.kneeLG.rotation.x = Math.max(0, -Math.sin(t * 4 - 1) * 0.9);
            a.kneeRG.rotation.x = Math.max(0, Math.sin(t * 4) * 0.9);
            a.head.rotation.y = Math.sin(t * 0.7) * 0.3;
            robotGroup.position.y = 0.55 + Math.abs(Math.sin(t * 4)) * 0.04;
        }

        if (currentRobot === 'titan') {
            // Heavy sway
            const sway = Math.sin(t * 1.5) * 0.2;
            a.armLG.rotation.z = 0.3 + Math.sin(t * 2) * 0.3;
            a.armRG.rotation.z = -0.3 - Math.sin(t * 2) * 0.3;
            a.foreL.rotation.x = Math.abs(Math.sin(t * 2)) * 0.5;
            a.foreR.rotation.x = Math.abs(Math.sin(t * 2 + Math.PI)) * 0.5;
            a.legLG.rotation.x = Math.sin(t * 1.8) * 0.22;
            a.legRG.rotation.x = -Math.sin(t * 1.8) * 0.22;
            a.kLG.rotation.x = Math.max(0, Math.sin(t * 1.8 - 0.8) * 0.35);
            a.kRG.rotation.x = Math.max(0, -Math.sin(t * 1.8 - 0.8) * 0.35);
            a.head.rotation.y = Math.sin(t * 0.5) * 0.2;
            robotGroup.rotation.y += dt * 0.2;
        }

        if (currentRobot === 'nano') {
            // Spider walk
            a.core.rotation.y += dt * 2;
            a.core.rotation.x = Math.sin(t * 3) * 0.15;
            a.head.rotation.y = Math.sin(t * 1.5) * 0.4;
            a.legGroups.forEach((lg, i) => {
                const phase = (i / a.legGroups.length) * Math.PI * 2;
                lg.seg1.rotation.x = Math.sin(t * 6 + phase) * 0.4;
                lg.seg2.rotation.x = Math.abs(Math.sin(t * 6 + phase)) * 0.5;
                lg.seg3.rotation.x = -Math.abs(Math.sin(t * 6 + phase)) * 0.3;
            });
            robotGroup.position.y = 0.2 + Math.abs(Math.sin(t * 6)) * 0.03;
        }
    }

    return { getRobotDefs, build, remove, update };
})();
