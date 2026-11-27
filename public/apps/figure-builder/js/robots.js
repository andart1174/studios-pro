/**
 * robots.js — Solid PBR Articulated 4D Mech & Sentinel Engine (v5.0)
 * ==================================================================
 * Builds real solid PBR-armored, skeletal-animated Three.js Mechs with
 * metallic bevels, glowing reactor cores, theme color sync, render mode
 * support (Solid / Crystal / Cyber / Hologram / Wire), and 100% GLB/STL/AR export.
 */

const RobotEngine = (() => {

    let robotGroup = null;
    let currentRobot = null;
    let animTime = 0;
    let activeThemeHex = 0x00f3ff;
    let activeRenderMode = 'solid';

    // ── Material Factory (Responds live to Render Mode & Color Theme!) ──────
    function makeArmorMat(colorHex, accent = false) {
        const col = new THREE.Color(colorHex);
        if (activeRenderMode === 'wireframe') {
            return new THREE.MeshBasicMaterial({
                color: col, wireframe: true, transparent: true, opacity: 0.9,
            });
        }
        if (activeRenderMode === 'hologram') {
            return new THREE.MeshStandardMaterial({
                color: accent ? 0xff00ea : 0x00ffcc,
                emissive: accent ? 0xff00ea : 0x00ffcc,
                emissiveIntensity: 0.55,
                roughness: 0.2, metalness: 0.3,
                transparent: true, opacity: 0.52,
                side: THREE.DoubleSide,
            });
        }
        if (activeRenderMode === 'ghost') {
            return new THREE.MeshPhysicalMaterial({
                color: col, emissive: col, emissiveIntensity: 0.25,
                roughness: 0.15, metalness: 0.2,
                transparent: true, opacity: 0.36,
                side: THREE.DoubleSide,
            });
        }
        if (activeRenderMode === 'crystal') {
            return new THREE.MeshPhysicalMaterial({
                color: col, emissive: col, emissiveIntensity: accent ? 0.45 : 0.18,
                roughness: 0.08, metalness: 0.18,
                clearcoat: 1.0, clearcoatRoughness: 0.06,
                transparent: true, opacity: 0.78,
            });
        }
        // Default: Solid PBR Studio Metallic Armor
        return new THREE.MeshStandardMaterial({
            color: accent ? col : col.clone().lerp(new THREE.Color(0x1e293b), 0.38),
            emissive: accent ? col : col.clone().multiplyScalar(0.18),
            emissiveIntensity: accent ? 0.55 : 0.22,
            roughness: accent ? 0.22 : 0.32,
            metalness: accent ? 0.55 : 0.78,
        });
    }

    function makeDarkJointMat() {
        if (activeRenderMode === 'wireframe') {
            return new THREE.MeshBasicMaterial({ color: activeThemeHex, wireframe: true, opacity: 0.55, transparent: true });
        }
        return new THREE.MeshStandardMaterial({
            color: 0x161b2e, roughness: 0.45, metalness: 0.85,
        });
    }

    function makeCoreMat(hex = 0xffffff) {
        return new THREE.MeshStandardMaterial({
            color: hex, emissive: hex, emissiveIntensity: 1.4,
            roughness: 0.1, metalness: 0.1,
        });
    }

    function addNeonTrim(mesh, colorHex) {
        if (activeRenderMode === 'solid') return mesh;
        const edges = new THREE.EdgesGeometry(mesh.geometry, 25);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
            color: colorHex, transparent: true, opacity: 0.65,
        }));
        line.userData.isTrim = true;
        mesh.add(line);
        return mesh;
    }

    function box(w, h, d, colorHex, accent = false, dark = false) {
        const mat = dark ? makeDarkJointMat() : makeArmorMat(colorHex, accent);
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        m.castShadow = true; m.receiveShadow = true;
        m.userData.partRole = dark ? 'joint' : (accent ? 'accent' : 'armor');
        return addNeonTrim(m, colorHex);
    }

    function cyl(rt, rb, h, colorHex, segs = 14, accent = false, dark = false) {
        const mat = dark ? makeDarkJointMat() : makeArmorMat(colorHex, accent);
        const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segs), mat);
        m.castShadow = true; m.receiveShadow = true;
        m.userData.partRole = dark ? 'joint' : (accent ? 'accent' : 'armor');
        return addNeonTrim(m, colorHex);
    }

    function sphere(r, colorHex, segs = 14, isCore = false) {
        const mat = isCore ? makeCoreMat(colorHex) : makeArmorMat(colorHex, false);
        const m = new THREE.Mesh(new THREE.SphereGeometry(r, segs, segs), mat);
        m.userData.partRole = isCore ? 'core' : 'armor';
        return m;
    }

    function ico(r, colorHex, detail = 1, accent = false) {
        const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail), makeArmorMat(colorHex, accent));
        m.userData.partRole = accent ? 'accent' : 'armor';
        return addNeonTrim(m, colorHex);
    }

    // ────────────────────────────────────────────────────────────────────────
    // MECH 1: Cyber Walker — Armored Humanoid Biped
    // ────────────────────────────────────────────────────────────────────────
    function buildWalker(color = 0x00f3ff) {
        const g = new THREE.Group();
        g.userData.type = 'robot';
        g.userData.name = 'Cyber Walker';

        // Sculpted Chest Armor + Arc Core
        const torso = box(0.56, 0.58, 0.34, color); torso.position.y = 0.32; g.add(torso);
        const chestPlate = box(0.46, 0.32, 0.12, color, true); chestPlate.position.set(0, 0.38, 0.16); g.add(chestPlate);
        const core = sphere(0.085, color, 16, true); core.position.set(0, 0.38, 0.23); g.add(core);
        const abs = cyl(0.18, 0.15, 0.22, color, 10, false, true); abs.position.y = 0.02; g.add(abs);

        // Head + Visor
        const headG = new THREE.Group(); headG.position.y = 0.84; g.add(headG);
        const helm = ico(0.21, color, 1, false); headG.add(helm);
        const visor = box(0.28, 0.08, 0.14, 0xffffff, true);
        visor.material = makeCoreMat(color);
        visor.position.set(0, 0.02, 0.14); headG.add(visor);
        const ant = cyl(0.014, 0.02, 0.24, color, 8, false, true); ant.position.set(0, 0.26, 0); headG.add(ant);
        const antTip = sphere(0.042, 0xffcc00, 12, true); antTip.position.set(0, 0.4, 0); headG.add(antTip);

        // Pauldrons + Articulated Arms
        const armL = new THREE.Group(); armL.position.set(-0.38, 0.46, 0); g.add(armL);
        const armR = new THREE.Group(); armR.position.set(0.38, 0.46, 0); g.add(armR);
        [armL, armR].forEach((ag, idx) => {
            const s = idx === 0 ? -1 : 1;
            const pauldron = ico(0.14, color, 1, true); pauldron.position.set(s * 0.02, 0.04, 0); ag.add(pauldron);
            const uArm = cyl(0.075, 0.068, 0.34, color, 10, false, false); uArm.position.y = -0.18; ag.add(uArm);
            const elbow = sphere(0.072, color, 10, false); elbow.position.y = -0.36; ag.add(elbow);
        });

        const foreArmL = new THREE.Group(); foreArmL.position.y = -0.36; armL.add(foreArmL);
        const foreArmR = new THREE.Group(); foreArmR.position.y = -0.36; armR.add(foreArmR);
        [foreArmL, foreArmR].forEach(fa => {
            const cuff = box(0.12, 0.30, 0.12, color, true); cuff.position.y = -0.17; fa.add(cuff);
            const hand = ico(0.075, 0xffffff, 0, false); hand.material = makeDarkJointMat(); hand.position.y = -0.35; fa.add(hand);
        });

        // Pelvis + Articulated Legs
        const pelvis = box(0.46, 0.20, 0.30, color); pelvis.position.y = -0.11; g.add(pelvis);
        const legL = new THREE.Group(); legL.position.set(-0.16, -0.22, 0); g.add(legL);
        const legR = new THREE.Group(); legR.position.set(0.16, -0.22, 0); g.add(legR);
        [legL, legR].forEach(lg => {
            const thigh = box(0.17, 0.42, 0.18, color); thigh.position.y = -0.21; lg.add(thigh);
            const knee = cyl(0.075, 0.075, 0.18, color, 10, false, true); knee.rotation.z = Math.PI / 2; knee.position.y = -0.44; lg.add(knee);
        });

        const kneeLG = new THREE.Group(); kneeLG.position.y = -0.44; legL.add(kneeLG);
        const kneeRG = new THREE.Group(); kneeRG.position.y = -0.44; legR.add(kneeRG);
        [kneeLG, kneeRG].forEach(kn => {
            const shin = box(0.15, 0.38, 0.17, color, true); shin.position.y = -0.20; kn.add(shin);
            const foot = box(0.17, 0.09, 0.29, color); foot.position.set(0, -0.42, 0.06); kn.add(foot);
        });

        g.userData.anim = { armL, armR, foreArmL, foreArmR, legL, legR, kneeLG, kneeRG, head: headG, core };
        return g;
    }

    // ────────────────────────────────────────────────────────────────────────
    // MECH 2: Iron Titan — Heavy Armored Siege Mech
    // ────────────────────────────────────────────────────────────────────────
    function buildTitan(color = 0xff5500) {
        const g = new THREE.Group();
        g.userData.type = 'robot';
        g.userData.name = 'Iron Titan';

        const torso = box(0.92, 0.78, 0.56, color); torso.position.y = 0.42; g.add(torso);
        const chest = box(0.68, 0.42, 0.16, color, true); chest.position.set(0, 0.46, 0.28); g.add(chest);
        const reactor = cyl(0.13, 0.13, 0.10, color, 16);
        reactor.material = makeCoreMat(0xffe066);
        reactor.rotation.x = Math.PI / 2; reactor.position.set(0, 0.46, 0.36); g.add(reactor);

        const head = new THREE.Group(); head.position.y = 0.96; g.add(head);
        head.add(box(0.42, 0.32, 0.36, color));
        const visor = box(0.36, 0.10, 0.12, 0xffff00);
        visor.material = makeCoreMat(0xffe066); visor.position.set(0, 0.02, 0.16); head.add(visor);

        // Twin Shoulder Plasma Cannons
        [-1, 1].forEach(side => {
            const sg = new THREE.Group(); sg.position.set(side * 0.62, 0.68, 0); g.add(sg);
            sg.add(box(0.30, 0.28, 0.34, color, true));
            const barrel = cyl(0.068, 0.082, 0.62, color, 12, false, true);
            barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.05, 0.35); sg.add(barrel);
            const muzzle = cyl(0.055, 0.055, 0.08, color, 12);
            muzzle.material = makeCoreMat(color);
            muzzle.rotation.x = Math.PI / 2; muzzle.position.set(0, 0.05, 0.66); sg.add(muzzle);
        });

        const armLG = new THREE.Group(); armLG.position.set(-0.68, 0.28, 0); g.add(armLG);
        const armRG = new THREE.Group(); armRG.position.set(0.68, 0.28, 0); g.add(armRG);
        [armLG, armRG].forEach(ag => {
            const uA = box(0.24, 0.46, 0.24, color); uA.position.y = -0.24; ag.add(uA);
        });
        const foreL = new THREE.Group(); foreL.position.y = -0.50; armLG.add(foreL);
        const foreR = new THREE.Group(); foreR.position.y = -0.50; armRG.add(foreR);
        [foreL, foreR].forEach(fa => {
            const fA = box(0.22, 0.42, 0.24, color, true); fA.position.y = -0.22; fa.add(fA);
            const claw = ico(0.13, color, 0, false); claw.material = makeDarkJointMat(); claw.position.y = -0.46; fa.add(claw);
        });

        const pelvis = box(0.70, 0.22, 0.44, color, false, true); pelvis.position.y = -0.05; g.add(pelvis);
        const legLG = new THREE.Group(); legLG.position.set(-0.28, -0.14, 0); g.add(legLG);
        const legRG = new THREE.Group(); legRG.position.set(0.28, -0.14, 0); g.add(legRG);
        [legLG, legRG].forEach(lg => {
            const uL = box(0.28, 0.48, 0.28, color); uL.position.y = -0.25; lg.add(uL);
        });
        const kLG = new THREE.Group(); kLG.position.y = -0.52; legLG.add(kLG);
        const kRG = new THREE.Group(); kRG.position.y = -0.52; legRG.add(kRG);
        [kLG, kRG].forEach(kn => {
            const lL = box(0.26, 0.42, 0.28, color, true); lL.position.y = -0.22; kn.add(lL);
            const foot = box(0.32, 0.12, 0.44, color); foot.position.set(0, -0.46, 0.08); kn.add(foot);
        });

        g.userData.anim = { armLG, armRG, foreL, foreR, legLG, legRG, kLG, kRG, head };
        return g;
    }

    // ────────────────────────────────────────────────────────────────────────
    // MECH 3: Nano Spider — Solid Hexapod Drone
    // ────────────────────────────────────────────────────────────────────────
    function buildNanoBot(color = 0x44ffaa) {
        const g = new THREE.Group();
        g.userData.type = 'robot';
        g.userData.name = 'Nano Spider';

        const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 1), makeArmorMat(color, true));
        addNeonTrim(core, color); g.add(core);
        const glowRing = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.025, 8, 24), makeCoreMat(color));
        glowRing.rotation.x = Math.PI / 2; g.add(glowRing);

        const head = sphere(0.22, color, 14); head.position.set(0, 0.02, 0.36); g.add(head);
        [[-0.08, 0.07, 0.54], [0.08, 0.07, 0.54], [0, 0.13, 0.52]].forEach(([x, y, z]) => {
            const e = sphere(0.042, 0xff3355, 10, true); e.position.set(x, y, z); g.add(e);
        });

        const legGroups = [];
        for (let side = -1; side <= 1; side += 2) {
            for (let li = 0; li < 3; li++) {
                const lg = new THREE.Group();
                lg.position.set(side * 0.28, 0, (li - 1) * 0.24);
                g.add(lg);

                const seg1 = new THREE.Group(); lg.add(seg1);
                const s1 = cyl(0.032, 0.026, 0.34, color, 8, false, true);
                s1.position.y = -0.17; seg1.add(s1);
                seg1.rotation.z = side * 0.95;

                const seg2 = new THREE.Group(); seg2.position.set(side * 0.02, -0.34, 0); seg1.add(seg2);
                const joint = sphere(0.04, color, 8); seg2.add(joint);
                const s2 = cyl(0.026, 0.018, 0.30, color, 8, true);
                s2.position.y = -0.15; seg2.add(s2);

                const seg3 = new THREE.Group(); seg3.position.y = -0.30; seg2.add(seg3);
                const foot = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.16, 6), makeCoreMat(0xffe066));
                foot.rotation.x = Math.PI; foot.position.y = -0.08; seg3.add(foot);

                legGroups.push({ seg1, seg2, seg3, side, li });
            }
        }

        const tail = cyl(0.04, 0.09, 0.42, color, 10); tail.position.set(0, 0.06, -0.42); tail.rotation.x = Math.PI / 2.2; g.add(tail);
        const stinger = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 8), makeCoreMat(0xff3355));
        stinger.position.set(0, 0.12, -0.66); stinger.rotation.x = -Math.PI / 2.2; g.add(stinger);

        g.userData.anim = { core, head, legGroups, glowRing };
        return g;
    }

    // ────────────────────────────────────────────────────────────────────────
    // MECH 4 (NEW): Quantum Sentinel 4D — Levitating Hyper-Guardian
    // ────────────────────────────────────────────────────────────────────────
    function buildSentinel(color = 0xa855f7) {
        const g = new THREE.Group();
        g.userData.type = 'robot';
        g.userData.name = 'Quantum Sentinel 4D';

        // Floating sculpted armored bust + energy spine
        const chest = ico(0.34, color, 1, false); chest.scale.set(1.1, 1.25, 0.82); chest.position.y = 0.25; g.add(chest);
        const heart = sphere(0.12, 0x00f3ff, 16, true); heart.position.set(0, 0.28, 0.22); g.add(heart);

        const head = new THREE.Group(); head.position.y = 0.82; g.add(head);
        const crown = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), makeArmorMat(color, true));
        head.add(crown);
        const eye = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.02, 8, 20), makeCoreMat(0x00f3ff));
        eye.position.set(0, 0, 0.13); head.add(eye);

        // Levitating Armor Wings / Shields
        const shieldL = new THREE.Group(); shieldL.position.set(-0.62, 0.35, 0.05); g.add(shieldL);
        const shieldR = new THREE.Group(); shieldR.position.set(0.62, 0.35, 0.05); g.add(shieldR);
        [shieldL, shieldR].forEach((sh, i) => {
            const s = i === 0 ? -1 : 1;
            const plate = box(0.16, 0.68, 0.28, color, true);
            plate.rotation.z = s * 0.22; sh.add(plate);
            const blade = box(0.06, 0.52, 0.14, color);
            blade.material = makeCoreMat(color);
            blade.position.set(s * 0.14, -0.08, -0.05); sh.add(blade);
        });

        // Lower levitating tail crystal
        const lower = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.72, 6), makeArmorMat(color, false));
        lower.rotation.x = Math.PI; lower.position.y = -0.45; g.add(lower);

        // Rotating 4D Dual Halo Rings behind the Sentinel
        const haloOuter = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.032, 10, 40), makeCoreMat(color));
        haloOuter.position.set(0, 0.32, -0.35); g.add(haloOuter);
        const haloInner = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.025, 10, 32), makeCoreMat(0x00f3ff));
        haloInner.position.set(0, 0.32, -0.35); g.add(haloInner);

        g.userData.anim = { head, heart, shieldL, shieldR, haloOuter, haloInner };
        return g;
    }

    const ROBOT_DEFS = [
        { id: 'sentinel', name_en: 'Quantum Sentinel 4D', name_fr: 'Sentinelle Quantique 4D', icon: '⚡', color: 0xa855f7, build: buildSentinel,
          desc_en: 'Levitating 4D armored guardian with twin energy shields and dual hyper-halo rings.',
          desc_fr: 'Gardien blindé 4D en lévitation avec boucliers énergétiques et doubles anneaux hyperdimensionnels.' },
        { id: 'walker',   name_en: 'Cyber Walker',        name_fr: 'Marcheur Cyber',          icon: '🚶', color: 0x00f3ff, build: buildWalker,
          desc_en: 'Solid PBR bipedal humanoid robot with articulated limbs, glowing arc core and walking cycle.',
          desc_fr: 'Robot bipède humanoïde PBR solide à membres articulés, cœur lumineux et cycle de marche.' },
        { id: 'titan',    name_en: 'Iron Titan',          name_fr: 'Titan de Fer',            icon: '🦾', color: 0xff5500, build: buildTitan,
          desc_en: 'Heavy PBR armored siege mech with dual shoulder plasma cannons and animated combat stance.',
          desc_fr: 'Mech de siège blindé PBR lourd avec doubles canons plasma et posture de combat animée.' },
        { id: 'nano',     name_en: 'Nano Spider',         name_fr: 'Araignée Nano',           icon: '🕷️', color: 0x44ffaa, build: buildNanoBot,
          desc_en: 'Solid hexapod nano-drone with 6 multi-jointed legs, ruby optics and articulated stinger.',
          desc_fr: 'Nano-drone hexapode solide à 6 pattes articulées, optiques rubis et dard plasma.' },
    ];

    function disposeGroup(grp) {
        if (!grp) return;
        grp.traverse(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                else obj.material.dispose();
            }
        });
    }

    function getRobotDefs() { return ROBOT_DEFS; }
    function getGroup() { return robotGroup; }

    function build(id, scene, opts = {}) {
        if (robotGroup) { scene.remove(robotGroup); disposeGroup(robotGroup); robotGroup = null; }
        const def = ROBOT_DEFS.find(r => r.id === id) || ROBOT_DEFS[0];
        if (opts.renderMode) activeRenderMode = opts.renderMode;
        activeThemeHex = opts.colorHex !== undefined ? opts.colorHex : def.color;
        robotGroup = def.build(activeThemeHex);
        robotGroup.position.set(0, 0.25, 0);
        scene.add(robotGroup);
        currentRobot = def.id;
        return { ...def, verts: 0, edges: 0 };
    }

    function rebuildStyle(scene, colorHex, renderMode) {
        if (!currentRobot) return;
        build(currentRobot, scene, { colorHex, renderMode });
    }

    function remove(scene) {
        if (robotGroup) { scene.remove(robotGroup); disposeGroup(robotGroup); robotGroup = null; }
        currentRobot = null;
    }

    function update(dt, speed = 1) {
        animTime += dt * speed;
        if (!robotGroup) return;
        const t = animTime;
        const a = robotGroup.userData.anim;
        if (!a) return;

        if (currentRobot === 'sentinel') {
            robotGroup.position.y = 0.25 + Math.sin(t * 2.2) * 0.14;
            a.head.rotation.y = Math.sin(t * 1.1) * 0.35;
            a.shieldL.position.y = 0.35 + Math.sin(t * 2.8) * 0.08;
            a.shieldR.position.y = 0.35 + Math.cos(t * 2.8) * 0.08;
            a.haloOuter.rotation.z = t * 0.9;
            a.haloOuter.rotation.x = Math.sin(t * 0.7) * 0.55;
            a.haloInner.rotation.y = t * 1.6;
            a.haloInner.rotation.x = Math.cos(t * 0.9) * 0.7;
            const pulse = 1 + Math.sin(t * 4) * 0.12;
            a.heart.scale.setScalar(pulse);
        } else if (currentRobot === 'walker') {
            const walk = Math.sin(t * 4);
            a.armL.rotation.x = walk * 0.6;
            a.armR.rotation.x = -walk * 0.6;
            a.foreArmL.rotation.x = Math.max(0, Math.sin(t * 4 - 0.5) * 0.65);
            a.foreArmR.rotation.x = Math.max(0, Math.sin(t * 4 + 0.5 + Math.PI) * 0.65);
            a.legL.rotation.x = -walk * 0.65;
            a.legR.rotation.x = walk * 0.65;
            a.kneeLG.rotation.x = Math.max(0, -Math.sin(t * 4 - 1) * 0.85);
            a.kneeRG.rotation.x = Math.max(0, Math.sin(t * 4) * 0.85);
            a.head.rotation.y = Math.sin(t * 0.7) * 0.3;
            robotGroup.position.y = 0.38 + Math.abs(Math.sin(t * 4)) * 0.05;
        } else if (currentRobot === 'titan') {
            a.armLG.rotation.z = 0.25 + Math.sin(t * 2) * 0.25;
            a.armRG.rotation.z = -0.25 - Math.sin(t * 2) * 0.25;
            a.foreL.rotation.x = -Math.abs(Math.sin(t * 2)) * 0.45;
            a.foreR.rotation.x = -Math.abs(Math.sin(t * 2 + Math.PI)) * 0.45;
            a.legLG.rotation.x = Math.sin(t * 1.8) * 0.22;
            a.legRG.rotation.x = -Math.sin(t * 1.8) * 0.22;
            a.kLG.rotation.x = Math.max(0, Math.sin(t * 1.8 - 0.8) * 0.35);
            a.kRG.rotation.x = Math.max(0, -Math.sin(t * 1.8 - 0.8) * 0.35);
            a.head.rotation.y = Math.sin(t * 0.6) * 0.25;
            robotGroup.rotation.y += dt * 0.22 * speed;
        } else if (currentRobot === 'nano') {
            a.core.rotation.y += dt * 1.8 * speed;
            a.glowRing.rotation.z -= dt * 2.4 * speed;
            a.head.rotation.y = Math.sin(t * 1.5) * 0.38;
            a.legGroups.forEach((lg, i) => {
                const phase = (i / a.legGroups.length) * Math.PI * 2;
                lg.seg1.rotation.x = Math.sin(t * 6 + phase) * 0.4;
                lg.seg2.rotation.x = Math.abs(Math.sin(t * 6 + phase)) * 0.48;
                lg.seg3.rotation.x = -Math.abs(Math.sin(t * 6 + phase)) * 0.28;
            });
            robotGroup.position.y = 0.15 + Math.abs(Math.sin(t * 6)) * 0.04;
        }
    }

    return { getRobotDefs, getGroup, build, rebuildStyle, remove, update };
})();

if (typeof window !== 'undefined') window.RobotEngine = RobotEngine;
if (typeof module !== 'undefined' && module.exports) module.exports = RobotEngine;
