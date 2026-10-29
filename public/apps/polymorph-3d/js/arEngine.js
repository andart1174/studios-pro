/**
 * PolyMorph 3D Studio - AR Universe & Holograms Engine (Tab: AR Studio)
 * Procedural generation and real-time animation for 31 immersive Augmented Reality experiences:
 * 1. AR Interdimensional Portals (7 themes with open-front diorama stage & see-through event horizon)
 * 2. AR Exploded View Mechanisms (5 engineering marvels with dynamic 0-100% disassembly)
 * 3. AR Living Planetarium & Deep Space (4 astronomical & aerospace models)
 * 4. AR 1:1 Virtual Museum Artifacts (6 classical historical masterpieces)
 * 5. AR Holographic Living Dioramas (4 interactive ecosystem dioramas)
 * 6. AR 1:1 Modern Interior Design & Furniture (5 designer pieces)
 */

const AREngine = (function () {
  'use strict';

  /**
   * Helper to create standard PBR material
   */
  function createMat(color, roughness = 0.4, metalness = 0.2, opts = {}) {
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: roughness,
      metalness: metalness,
      side: opts.side !== undefined ? opts.side : (opts.doubleSide ? THREE.DoubleSide : THREE.FrontSide),
      transparent: Boolean(opts.transparent),
      opacity: opts.opacity !== undefined ? opts.opacity : 1.0,
      ...opts
    });
    if (opts.emissive) {
      mat.emissive = new THREE.Color(opts.emissive);
      mat.emissiveIntensity = opts.emissiveIntensity !== undefined ? opts.emissiveIntensity : 0.6;
    }
    return mat;
  }

  // =========================================================================
  // 1. AR INTERDIMENSIONAL PORTALS (Open-Front Diorama Stage)
  // Solves Photo 4: Interior world is built as an open cyclorama stage with NO
  // front occluding face at z = 0, so GLB export renders perfectly in all viewers.
  // =========================================================================
  function createARPortal(theme = 'cyberpunk', options = {}) {
    const group = new THREE.Group();
    group.name = `AR_Portal_${theme}`;

    const portalWidth = options.width || 120;
    const portalHeight = options.height || 210;
    const archRadius = portalWidth / 2;
    const pillarHeight = portalHeight - archRadius;

    // Theme color palettes
    let frameColor = '#111827';
    let glowColor = '#00f0ff';
    let wallColor = '#050b14';
    let floorColor = '#0f172a';

    if (theme === 'temple') {
      frameColor = '#b45309';
      glowColor = '#ffd166';
      wallColor = '#1c1917';
      floorColor = '#292524';
    } else if (theme === 'lunar') {
      frameColor = '#334155';
      glowColor = '#38bdf8';
      wallColor = '#020617';
      floorColor = '#1e293b';
    } else if (theme === 'fantasy') {
      frameColor = '#166534';
      glowColor = '#4ade80';
      wallColor = '#022c22';
      floorColor = '#064e3b';
    } else if (theme === 'atlantis') {
      frameColor = '#0e7490';
      glowColor = '#22d3ee';
      wallColor = '#042f2e';
      floorColor = '#083344';
    } else if (theme === 'stargate') {
      frameColor = '#334155';
      glowColor = '#38bdf8';
      wallColor = '#030712';
      floorColor = '#0f172a';
    } else if (theme === 'inferno') {
      frameColor = '#7f1d1d';
      glowColor = '#f97316';
      wallColor = '#1a0505';
      floorColor = '#2d0a0a';
    }

    const frameMat = createMat(frameColor, 0.25, 0.85);
    const glowMat = createMat(glowColor, 0.1, 0.1, { emissive: glowColor, emissiveIntensity: 0.8 });

    // --- 1. Outer Portal Arch Frame at z = 0 ---
    const pillarGeo = new THREE.BoxGeometry(14, pillarHeight, 16);
    const leftPillar = new THREE.Mesh(pillarGeo, frameMat);
    leftPillar.position.set(-portalWidth / 2, pillarHeight / 2, 0);
    const rightPillar = new THREE.Mesh(pillarGeo, frameMat);
    rightPillar.position.set(portalWidth / 2, pillarHeight / 2, 0);
    group.add(leftPillar, rightPillar);

    // Arch top semi-torus
    const archGeo = new THREE.TorusGeometry(archRadius, 7, 16, 32, Math.PI);
    const archMesh = new THREE.Mesh(archGeo, frameMat);
    archMesh.position.set(0, pillarHeight, 0);
    group.add(archMesh);

    // Glowing Inner Neon Rune Trim
    const neonTrimGeo = new THREE.TorusGeometry(archRadius - 3.5, 2.5, 12, 32, Math.PI);
    const neonTrim = new THREE.Mesh(neonTrimGeo, glowMat);
    neonTrim.position.set(0, pillarHeight, 3);
    group.add(neonTrim);

    const pillarGlowGeo = new THREE.BoxGeometry(2, pillarHeight - 10, 2);
    const leftPillarGlow = new THREE.Mesh(pillarGlowGeo, glowMat);
    leftPillarGlow.position.set(-portalWidth / 2 + 6, pillarHeight / 2, 3);
    const rightPillarGlow = new THREE.Mesh(pillarGlowGeo, glowMat);
    rightPillarGlow.position.set(portalWidth / 2 - 6, pillarHeight / 2, 3);
    group.add(leftPillarGlow, rightPillarGlow);

    // Base Threshold Platform Plate
    const thresholdGeo = new THREE.BoxGeometry(portalWidth + 34, 6, 36);
    const thresholdMesh = new THREE.Mesh(thresholdGeo, frameMat);
    thresholdMesh.position.set(0, 3, 0);
    group.add(thresholdMesh);

    // --- 2. Translucent See-Through Event Horizon Veil (z = 0) ---
    const veilMat = createMat(glowColor, 0.1, 0.1, {
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      emissive: glowColor,
      emissiveIntensity: 0.5
    });
    const veilArchGeo = new THREE.CircleGeometry(archRadius - 2, 32);
    const veilArch = new THREE.Mesh(veilArchGeo, veilMat);
    veilArch.position.set(0, pillarHeight, 0);
    group.add(veilArch);

    const veilBodyGeo = new THREE.PlaneGeometry(portalWidth - 4, pillarHeight - 4);
    const veilBody = new THREE.Mesh(veilBodyGeo, veilMat);
    veilBody.position.set(0, pillarHeight / 2, 0);
    group.add(veilBody);

    // --- 3. Interior Open-Front Diorama Stage (z < 0) ---
    // Zero front wall: camera looking from z > 0 looks straight into the realm!
    const stageW = 320;
    const stageH = 240;
    const stageD = 320;
    const halfW = stageW / 2;
    const centerZ = -stageD / 2;

    const wallMat = createMat(wallColor, 0.85, 0.1);
    const floorMat = createMat(floorColor, 0.7, 0.2);

    // Back wall plane (z = -320)
    const backGeo = new THREE.PlaneGeometry(stageW, stageH);
    const backMesh = new THREE.Mesh(backGeo, wallMat);
    backMesh.position.set(0, stageH / 2, -stageD);
    group.add(backMesh);

    // Floor plane (y = 0)
    const flGeo = new THREE.PlaneGeometry(stageW, stageD);
    const flMesh = new THREE.Mesh(flGeo, floorMat);
    flMesh.rotation.x = -Math.PI / 2;
    flMesh.position.set(0, 0, centerZ);
    group.add(flMesh);

    // Ceiling plane (y = stageH)
    const ceilGeo = new THREE.PlaneGeometry(stageW, stageD);
    const ceilMesh = new THREE.Mesh(ceilGeo, wallMat);
    ceilMesh.rotation.x = Math.PI / 2;
    ceilMesh.position.set(0, stageH, centerZ);
    group.add(ceilMesh);

    // Left wall plane (x = -halfW)
    const leftWGeo = new THREE.PlaneGeometry(stageD, stageH);
    const leftWMesh = new THREE.Mesh(leftWGeo, wallMat);
    leftWMesh.rotation.y = Math.PI / 2;
    leftWMesh.position.set(-halfW, stageH / 2, centerZ);
    group.add(leftWMesh);

    // Right wall plane (x = halfW)
    const rightWGeo = new THREE.PlaneGeometry(stageD, stageH);
    const rightWMesh = new THREE.Mesh(rightWGeo, wallMat);
    rightWMesh.rotation.y = -Math.PI / 2;
    rightWMesh.position.set(halfW, stageH / 2, centerZ);
    group.add(rightWMesh);

    // --- 4. Theme-Specific 3D Realm Elements ---
    if (theme === 'cyberpunk') {
      // Futuristic Neon Skyscraper Cityscape
      const bldgMat = createMat('#0b1329', 0.3, 0.8);

      const towers = [
        { x: -90, z: -110, w: 32, d: 32, h: 140, col: '#ff007f' },
        { x: -45, z: -180, w: 40, d: 40, h: 190, col: '#00f0ff' },
        { x: 50, z: -140, w: 36, d: 36, h: 160, col: '#ffea00' },
        { x: 95, z: -100, w: 30, d: 30, h: 120, col: '#7928ca' },
        { x: 0, z: -250, w: 65, d: 65, h: 220, col: '#00f0ff' },
        { x: -110, z: -220, w: 35, d: 35, h: 170, col: '#ff007f' },
        { x: 100, z: -210, w: 38, d: 38, h: 180, col: '#10b981' }
      ];

      towers.forEach(t => {
        const bMesh = new THREE.Mesh(new THREE.BoxGeometry(t.w, t.h, t.d), bldgMat);
        bMesh.position.set(t.x, t.h / 2, t.z);
        group.add(bMesh);

        // Glowing Holographic Billboard Screen / Beacon
        const beaconMat = createMat(t.col, 0.1, 0.1, { emissive: t.col, emissiveIntensity: 0.9 });
        const beaconMesh = new THREE.Mesh(new THREE.BoxGeometry(t.w * 0.85, 8, t.d * 0.85), beaconMat);
        beaconMesh.position.set(t.x, t.h + 4, t.z);
        group.add(beaconMesh);

        // Window Luminescent Bands
        for (let wy = 30; wy < t.h - 10; wy += 35) {
          const winStrip = new THREE.Mesh(new THREE.BoxGeometry(t.w + 0.6, 3, t.d + 0.6), beaconMat);
          winStrip.position.set(t.x, wy, t.z);
          group.add(winStrip);
        }
      });

      // Neon Highway Grid on Floor
      const roadMat = createMat('#00f0ff', 0.1, 0.1, { emissive: '#00f0ff', emissiveIntensity: 0.7 });
      const roadMesh = new THREE.Mesh(new THREE.BoxGeometry(8, 0.8, stageD - 40), roadMat);
      roadMesh.position.set(0, 0.8, centerZ);
      group.add(roadMesh);

      // Flying Hovercar Speeding between Skyscrapers
      const carMat = createMat('#ec4899', 0.2, 0.8, { emissive: '#ec4899', emissiveIntensity: 0.5 });
      const carMesh = new THREE.Mesh(new THREE.BoxGeometry(16, 5, 28), carMat);
      carMesh.position.set(-15, 110, -160);
      group.add(carMesh);

    } else if (theme === 'temple') {
      // Classical Greek / Egyptian Colonnaded Sanctuary Hall
      const marbleMat = createMat('#f5f5f4', 0.35, 0.05);
      const goldAltarMat = createMat('#d4af37', 0.18, 0.95);
      const fireMat = createMat('#f97316', 0.1, 0.1, { emissive: '#ef4444', emissiveIntensity: 1.0 });

      // Classical Fluted Columns along central nave
      for (let side of [-65, 65]) {
        for (let z = -50; z >= -270; z -= 70) {
          const colBase = new THREE.Mesh(new THREE.CylinderGeometry(10, 12, 8, 20), marbleMat);
          colBase.position.set(side, 4, z);
          const colShaft = new THREE.Mesh(new THREE.CylinderGeometry(8, 9, 150, 24), marbleMat);
          colShaft.position.set(side, 83, z);
          const colCap = new THREE.Mesh(new THREE.BoxGeometry(22, 10, 22), marbleMat);
          colCap.position.set(side, 163, z);
          group.add(colBase, colShaft, colCap);
        }
        // Continuous Entablature Architrave Beam
        const beam = new THREE.Mesh(new THREE.BoxGeometry(18, 14, 260), marbleMat);
        beam.position.set(side, 175, -160);
        group.add(beam);
      }

      // Golden Altar & Mystical Artifact
      const altarBase = new THREE.Mesh(new THREE.BoxGeometry(45, 22, 45), marbleMat);
      altarBase.position.set(0, 11, -210);
      const idol = new THREE.Mesh(new THREE.OctahedronGeometry(16, 2), goldAltarMat);
      idol.position.set(0, 42, -210);
      group.add(altarBase, idol);

      // Bronze Torch Braziers with Fire
      for (let bx of [-35, 35]) {
        const brazier = new THREE.Mesh(new THREE.CylinderGeometry(6, 4, 30, 16), goldAltarMat);
        brazier.position.set(bx, 15, -120);
        const flame = new THREE.Mesh(new THREE.ConeGeometry(5, 12, 12), fireMat);
        flame.position.set(bx, 36, -120);
        group.add(brazier, flame);
      }

    } else if (theme === 'lunar') {
      // Lunar Surface, Research Outpost & Earth in the Cosmos
      const domeMat = createMat('#e2e8f0', 0.25, 0.85);
      const solarMat = createMat('#1e3a8a', 0.2, 0.6);

      // Pressurized Habitat Base Dome
      const dome = new THREE.Mesh(new THREE.SphereGeometry(38, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
      dome.position.set(-60, 0, -180);
      group.add(dome);

      // Airload Corridor Tunnel
      const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 40, 16), domeMat);
      tunnel.rotation.z = Math.PI / 2;
      tunnel.position.set(-25, 8, -180);
      group.add(tunnel);

      // Photovoltaic Solar Arrays
      for (let sp = 0; sp < 2; sp++) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(45, 1, 24), solarMat);
        panel.rotation.x = -Math.PI / 5;
        panel.position.set(60, 20, -140 - sp * 45);
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 25, 12), domeMat);
        mast.position.set(60, 10, -140 - sp * 45);
        group.add(panel, mast);
      }

      // Communications Dish
      const dish = new THREE.Mesh(new THREE.SphereGeometry(14, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2.5), domeMat);
      dish.rotation.x = -Math.PI / 3;
      dish.position.set(-60, 48, -180);
      group.add(dish);

      // Earth suspended in deep black sky
      const earthMat = createMat('#2563eb', 0.35, 0.05, { emissive: '#1d4ed8', emissiveIntensity: 0.3 });
      const earth = new THREE.Mesh(new THREE.SphereGeometry(34, 32, 32), earthMat);
      earth.position.set(30, 175, -280);
      group.add(earth);

    } else if (theme === 'fantasy') {
      // Enchanted Eldritch Forest
      const woodMat = createMat('#3f2314', 0.8, 0.05);
      const leafMat = createMat('#047857', 0.6, 0.1);
      const mushGlowMat1 = createMat('#ec4899', 0.2, 0.1, { emissive: '#ec4899', emissiveIntensity: 0.9 });
      const mushGlowMat2 = createMat('#06b6d4', 0.2, 0.1, { emissive: '#06b6d4', emissiveIntensity: 0.9 });

      // Ancient Sacred Tree
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(14, 24, 130, 16), woodMat);
      trunk.position.set(0, 65, -200);
      const canopy = new THREE.Mesh(new THREE.SphereGeometry(55, 24, 20), leafMat);
      canopy.position.set(0, 140, -200);
      group.add(trunk, canopy);

      // Giant Bioluminescent Mushrooms
      const mushSpots = [
        [-55, -90, mushGlowMat1, 14, 22],
        [60, -110, mushGlowMat2, 16, 26],
        [-75, -170, mushGlowMat2, 18, 30],
        [70, -180, mushGlowMat1, 13, 20]
      ];
      mushSpots.forEach(([x, z, mat, rad, h]) => {
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.3, rad * 0.45, h, 12), createMat('#e2e8f0', 0.6, 0.1));
        stem.position.set(x, h / 2, z);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(rad, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat);
        cap.position.set(x, h, z);
        group.add(stem, cap);
      });

      // Floating Magic Spirit Wisps
      for (let wi = 0; wi < 6; wi++) {
        const wispMat = createMat('#facc15', 0.1, 0.1, { emissive: '#facc15', emissiveIntensity: 1.0 });
        const wisp = new THREE.Mesh(new THREE.SphereGeometry(3.5, 12, 12), wispMat);
        wisp.position.set((Math.random() - 0.5) * 160, 40 + Math.random() * 80, -80 - Math.random() * 160);
        group.add(wisp);
      }

    } else if (theme === 'atlantis') {
      // Sunken Atlantis Ocean Sanctuary
      const ruinMat = createMat('#94a3b8', 0.7, 0.1);
      const coralMat1 = createMat('#f43f5e', 0.4, 0.2);
      const coralMat2 = createMat('#10b981', 0.4, 0.2);
      const goldMat = createMat('#eab308', 0.2, 0.95);

      // Submerged Classical Arches
      for (let archZ of [-120, -220]) {
        const archL = new THREE.Mesh(new THREE.BoxGeometry(10, 110, 10), ruinMat);
        archL.position.set(-50, 55, archZ);
        const archR = new THREE.Mesh(new THREE.BoxGeometry(10, 110, 10), ruinMat);
        archR.position.set(50, 55, archZ);
        const archBeam = new THREE.Mesh(new THREE.BoxGeometry(120, 12, 12), ruinMat);
        archBeam.position.set(0, 116, archZ);
        group.add(archL, archR, archBeam);
      }

      // Sunken Treasure Chest
      const chest = new THREE.Mesh(new THREE.BoxGeometry(32, 20, 22), goldMat);
      chest.position.set(0, 10, -160);
      group.add(chest);

      // Branching Coral Formations
      for (let ci = 0; ci < 8; ci++) {
        const cMat = ci % 2 === 0 ? coralMat1 : coralMat2;
        const cMesh = new THREE.Mesh(new THREE.ConeGeometry(8 + Math.random() * 6, 25 + Math.random() * 20, 8), cMat);
        cMesh.position.set((Math.random() - 0.5) * 200, 15, -60 - Math.random() * 180);
        group.add(cMesh);
      }

    } else if (theme === 'stargate') {
      // Deep Space Wormhole & Glyphs
      const metalMat = createMat('#475569', 0.25, 0.9);
      const glyphMat = createMat('#38bdf8', 0.1, 0.1, { emissive: '#0284c7', emissiveIntensity: 0.9 });
      const chevronMat = createMat('#ef4444', 0.1, 0.1, { emissive: '#dc2626', emissiveIntensity: 1.0 });

      // Stargate Ring
      const sgRing = new THREE.Mesh(new THREE.TorusGeometry(60, 8, 24, 48), metalMat);
      sgRing.position.set(0, 95, -180);
      group.add(sgRing);
      group.userData.stargateRing = sgRing;

      // 9 Chevron Locks around perimeter
      for (let c = 0; c < 9; c++) {
        const ang = (c * Math.PI * 2) / 9;
        const chev = new THREE.Mesh(new THREE.BoxGeometry(6, 12, 8), chevronMat);
        chev.position.set(Math.sin(ang) * 62, 95 + Math.cos(ang) * 62, -180);
        chev.rotation.z = -ang;
        group.add(chev);
      }

      // Central Event Horizon Nebula Disk
      const vortexGeo = new THREE.CircleGeometry(52, 32);
      const vortex = new THREE.Mesh(vortexGeo, glyphMat);
      vortex.position.set(0, 95, -180.5);
      group.add(vortex);

      // Floating Alien Obelisks
      for (let ox of [-90, 90]) {
        const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(4, 8, 120, 4), metalMat);
        obelisk.rotation.y = Math.PI / 4;
        obelisk.position.set(ox, 60, -140);
        group.add(obelisk);
      }

    } else if (theme === 'inferno') {
      // Volcanic Nether Gate
      const basaltMat = createMat('#18181b', 0.8, 0.2);
      const lavaMat = createMat('#ea580c', 0.2, 0.1, { emissive: '#dc2626', emissiveIntensity: 1.0 });

      // Molten Lava River across the floor
      const lavaRiver = new THREE.Mesh(new THREE.BoxGeometry(stageW, 1.2, 35), lavaMat);
      lavaRiver.position.set(0, 1.2, -150);
      group.add(lavaRiver);

      // Jagged Basalt Spires
      for (let s = 0; s < 10; s++) {
        const spire = new THREE.Mesh(new THREE.ConeGeometry(10 + Math.random() * 8, 60 + Math.random() * 70, 5), basaltMat);
        spire.position.set((Math.random() - 0.5) * 240, 30, -50 - Math.random() * 220);
        spire.rotation.z = (Math.random() - 0.5) * 0.2;
        group.add(spire);
      }

      // Fire Braziers
      for (let fx of [-50, 50]) {
        const fBase = new THREE.Mesh(new THREE.CylinderGeometry(7, 5, 26, 12), basaltMat);
        fBase.position.set(fx, 13, -90);
        const fFlame = new THREE.Mesh(new THREE.ConeGeometry(6, 18, 12), lavaMat);
        fFlame.position.set(fx, 35, -90);
        group.add(fBase, fFlame);
      }
    }

    return group;
  }

  // =========================================================================
  // 2. AR EXPLODED MECHANISMS (Disassembly & Engineering Precision)
  // Solves Photo 3: Swiss watch is transformed into a true Haute Horlogerie
  // skeleton movement with balance wheel, hairspring, escapement, bridges,
  // ruby jewels, and thermal blued watchmaker screws.
  // =========================================================================
  function createARExplodedMechanism(type = 'swiss_clockwork', options = {}) {
    const group = new THREE.Group();
    group.name = `AR_Exploded_${type}`;

    const explodedParts = [];
    function registerPart(mesh, dir) {
      group.add(mesh);
      explodedParts.push({ mesh: mesh, dir: dir, origPos: mesh.position.clone() });
    }

    const metalMat = createMat('#94a3b8', 0.25, 0.85);
    const chromeMat = createMat('#e2e8f0', 0.1, 0.98);
    const goldBrassMat = createMat('#d4af37', 0.18, 0.95);
    const copperMat = createMat('#b45309', 0.2, 0.9);
    const rubyMat = createMat('#e11d48', 0.05, 0.1, { transparent: true, opacity: 0.88 });
    const blueSteelMat = createMat('#1d4ed8', 0.15, 0.95);
    const carbonMat = createMat('#18181b', 0.4, 0.3);
    const redAccentMat = createMat('#dc2626', 0.25, 0.5);

    if (type === 'swiss_clockwork' || type === 'swiss') {
      // ---------------------------------------------------------------------
      // HAUTE HORLOGERIE SKELETONIZED MECHANICAL WATCH MOVEMENT
      // ---------------------------------------------------------------------
      const r = 46; // movement radius mm

      // 1. Skeletonized Gilded Mainplate (Perlage cutouts)
      const mainPlate = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 3.5, 48), goldBrassMat);
      mainPlate.position.set(0, 6, 0);
      registerPart(mainPlate, new THREE.Vector3(0, 0, 0));

      // Circular Cutout Relief Rings
      for (let k = 0; k < 3; k++) {
        const cut = new THREE.Mesh(new THREE.TorusGeometry(12 + k * 8, 1.2, 8, 32), goldBrassMat);
        cut.rotation.x = Math.PI / 2;
        cut.position.set(-8 + k * 8, 7.8, -4 + k * 4);
        registerPart(cut, new THREE.Vector3(0, 0, 0));
      }

      // 2. Mainspring Barrel Drum & Winding Ratchet Wheel
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 6.5, 32), copperMat);
      barrel.position.set(-16, 12, 10);
      registerPart(barrel, new THREE.Vector3(-30, 25, 20));

      const ratchet = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 1.2, 28), chromeMat);
      ratchet.position.set(-16, 16, 10);
      registerPart(ratchet, new THREE.Vector3(-30, 36, 20));

      const clickSpring = new THREE.Mesh(new THREE.BoxGeometry(6, 1, 2), blueSteelMat);
      clickSpring.position.set(-23, 16.5, 16);
      registerPart(clickSpring, new THREE.Vector3(-40, 42, 28));

      // 3. Great Center Wheel & Pinion (5-Spoke Brass Wheel)
      const centerWheel = new THREE.Mesh(new THREE.CylinderGeometry(18, 18, 1.8, 36), goldBrassMat);
      centerWheel.position.set(0, 14, 0);
      registerPart(centerWheel, new THREE.Vector3(0, 40, 0));

      const centerPinion = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 7, 16), chromeMat);
      centerPinion.position.set(0, 16, 0);
      registerPart(centerPinion, new THREE.Vector3(0, 46, 0));

      // 4. Third Wheel
      const thirdWheel = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 1.6, 32), goldBrassMat);
      thirdWheel.position.set(13, 17, 9);
      registerPart(thirdWheel, new THREE.Vector3(25, 52, 16));

      // 5. Fourth Seconds Wheel & Sub-Seconds Pinion
      const fourthWheel = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 1.5, 28), goldBrassMat);
      fourthWheel.position.set(8, 20, -13);
      registerPart(fourthWheel, new THREE.Vector3(16, 62, -22));

      // 6. Swiss Club-Tooth Escape Wheel
      const escapeWheel = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 1.4, 15), goldBrassMat);
      escapeWheel.position.set(-10, 22, -14);
      registerPart(escapeWheel, new THREE.Vector3(-22, 72, -24));

      // 7. Pallet Fork Lever with Ruby Pallet Jewels
      const palletFork = new THREE.Mesh(new THREE.BoxGeometry(4, 1.4, 12), chromeMat);
      palletFork.position.set(-6, 25, -19);
      registerPart(palletFork, new THREE.Vector3(-14, 82, -32));

      for (let rj of [-1, 1]) {
        const rubyPallet = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 2.2), rubyMat);
        rubyPallet.position.set(-6 + rj * 2.8, 25.5, -23);
        registerPart(rubyPallet, new THREE.Vector3(-14 + rj * 5, 86, -38));
      }

      // 8. Regulating Organ: Glucydur Balance Wheel with Timing Screws
      const balRing = new THREE.Mesh(new THREE.TorusGeometry(14, 1.5, 12, 36), goldBrassMat);
      balRing.rotation.x = Math.PI / 2;
      balRing.position.set(16, 28, -10);
      registerPart(balRing, new THREE.Vector3(32, 95, -15));
      group.userData.balanceWheel = balRing; // for live oscillation!

      // 8 Gold Regulation Screws on Balance Rim
      for (let s = 0; s < 8; s++) {
        const ang = (s * Math.PI * 2) / 8;
        const bScrew = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.5, 8), goldBrassMat);
        bScrew.position.set(16 + Math.cos(ang) * 14.8, 28, -10 + Math.sin(ang) * 14.8);
        registerPart(bScrew, new THREE.Vector3(32 + Math.cos(ang) * 8, 97, -15 + Math.sin(ang) * 8));
      }

      // 9. Archimedean Spiral Hairspring Coil
      const hairspring = new THREE.Mesh(new THREE.TorusGeometry(8, 0.45, 8, 36), blueSteelMat);
      hairspring.rotation.x = Math.PI / 2;
      hairspring.position.set(16, 30.5, -10);
      registerPart(hairspring, new THREE.Vector3(32, 105, -15));

      // 10. Haute Horlogerie Sculpted Bridges (Anglage & Geneva Stripes)
      // Barrel Bridge
      const barrelBridge = new THREE.Mesh(new THREE.BoxGeometry(28, 3, 24), chromeMat);
      barrelBridge.position.set(-16, 33, 10);
      registerPart(barrelBridge, new THREE.Vector3(-30, 115, 20));

      // Train Wheel Bridge (Center & 3rd/4th wheel)
      const trainBridge = new THREE.Mesh(new THREE.BoxGeometry(36, 3, 28), chromeMat);
      trainBridge.position.set(8, 35, 0);
      registerPart(trainBridge, new THREE.Vector3(15, 122, 0));

      // Balance Cock Cantilevered Bridge with Regulator Arm
      const balanceCock = new THREE.Mesh(new THREE.BoxGeometry(20, 3, 16), chromeMat);
      balanceCock.position.set(16, 37, -10);
      registerPart(balanceCock, new THREE.Vector3(32, 130, -15));

      // 11. Synthetic Ruby Jewel Bearings set in Gold Chatons
      const jewelPositions = [
        [-16, 34.6, 10], [0, 36.6, 0], [13, 36.6, 9], [8, 36.6, -13], [-10, 36.6, -14], [16, 38.6, -10]
      ];
      jewelPositions.forEach(([jx, jy, jz], idx) => {
        const jCh = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 1.2, 16), goldBrassMat);
        jCh.position.set(jx, jy, jz);
        const jRub = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 1.4, 16), rubyMat);
        jRub.position.set(jx, jy + 0.1, jz);
        registerPart(jCh, new THREE.Vector3(jx * 1.5, jy + 95 + idx * 4, jz * 1.5));
        registerPart(jRub, new THREE.Vector3(jx * 1.5, jy + 96 + idx * 4, jz * 1.5));
      });

      // 12. Thermal Heat-Blued Watchmaker Screws
      for (let sc of [[-26, 18], [-6, 18], [2, 12], [22, -4], [22, -16], [-22, -6]]) {
        const screw = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 2.5, 12), blueSteelMat);
        screw.position.set(sc[0], 39, sc[1]);
        registerPart(screw, new THREE.Vector3(sc[0] * 1.6, 150, sc[1] * 1.6));
      }

    } else if (type === 'v6_engine' || type === 'v6') {
      // ---------------------------------------------------------------------
      // HIGH-PERFORMANCE V6 TWIN-TURBO INTERNAL COMBUSTION ENGINE
      // ---------------------------------------------------------------------
      // 1. Engine Main Block
      const blockMesh = new THREE.Mesh(new THREE.BoxGeometry(60, 45, 80), metalMat);
      blockMesh.position.set(0, 30, 0);
      registerPart(blockMesh, new THREE.Vector3(0, 0, 0));

      // 2. Heavy Forged Crankshaft & Flywheel
      const crankMesh = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 90, 16), chromeMat);
      crankMesh.rotation.x = Math.PI / 2;
      crankMesh.position.set(0, 10, 0);
      registerPart(crankMesh, new THREE.Vector3(0, -40, 0));

      const flywheel = new THREE.Mesh(new THREE.CylinderGeometry(20, 20, 6, 32), metalMat);
      flywheel.rotation.x = Math.PI / 2;
      flywheel.position.set(0, 10, -48);
      registerPart(flywheel, new THREE.Vector3(0, -40, -40));

      // 3. Lower Oil Pan Sump
      const oilPan = new THREE.Mesh(new THREE.BoxGeometry(50, 12, 75), metalMat);
      oilPan.position.set(0, 2, 0);
      registerPart(oilPan, new THREE.Vector3(0, -65, 0));

      // 4. 6 Pistons & Connecting Rods (60° V-Bank)
      for (let i = 0; i < 3; i++) {
        const zPos = -25 + i * 25;
        // Left Bank (+X)
        const pLeft = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 14, 16), chromeMat);
        pLeft.rotation.z = -Math.PI / 6;
        pLeft.position.set(22, 42, zPos);
        registerPart(pLeft, new THREE.Vector3(55, 45, 0));

        // Right Bank (-X)
        const pRight = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 14, 16), chromeMat);
        pRight.rotation.z = Math.PI / 6;
        pRight.position.set(-22, 42, zPos);
        registerPart(pRight, new THREE.Vector3(-55, 45, 0));
      }

      // 5. Dual Overhead Cylinder Heads
      const headL = new THREE.Mesh(new THREE.BoxGeometry(20, 12, 75), metalMat);
      headL.rotation.z = -Math.PI / 6;
      headL.position.set(28, 56, 0);
      registerPart(headL, new THREE.Vector3(65, 65, 0));

      const headR = new THREE.Mesh(new THREE.BoxGeometry(20, 12, 75), metalMat);
      headR.rotation.z = Math.PI / 6;
      headR.position.set(-28, 56, 0);
      registerPart(headR, new THREE.Vector3(-65, 65, 0));

      // 6. Red Crinkle Valve Covers
      const coverL = new THREE.Mesh(new THREE.BoxGeometry(18, 6, 74), redAccentMat);
      coverL.rotation.z = -Math.PI / 6;
      coverL.position.set(33, 64, 0);
      registerPart(coverL, new THREE.Vector3(80, 80, 0));

      const coverR = new THREE.Mesh(new THREE.BoxGeometry(18, 6, 74), redAccentMat);
      coverR.rotation.z = Math.PI / 6;
      coverR.position.set(-33, 64, 0);
      registerPart(coverR, new THREE.Vector3(-80, 80, 0));

      // 7. Intake Manifold & Throttle Body
      const intake = new THREE.Mesh(new THREE.BoxGeometry(32, 16, 60), metalMat);
      intake.position.set(0, 68, 0);
      registerPart(intake, new THREE.Vector3(0, 85, 0));

      const throttle = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 14, 16), chromeMat);
      throttle.position.set(0, 78, 25);
      registerPart(throttle, new THREE.Vector3(0, 105, 25));

    } else if (type === 'exploded_drone' || type === 'drone') {
      // ---------------------------------------------------------------------
      // FPV RACING QUADCOPTER UNIBODY & FLIGHT ELECTRONICS
      // ---------------------------------------------------------------------
      // 1. Carbon Fiber Bottom Main Frame (X-Chassis)
      const carbonFrame = new THREE.Mesh(new THREE.BoxGeometry(65, 2.5, 65), carbonMat);
      carbonFrame.position.set(0, 10, 0);
      registerPart(carbonFrame, new THREE.Vector3(0, 0, 0));

      // 2. 4 Brushless Stator Motors at 4 Arm Corners
      const motorCoords = [[-24, -24], [24, -24], [-24, 24], [24, 24]];
      motorCoords.forEach(([mx, mz]) => {
        const motorStator = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 7, 16), metalMat);
        motorStator.position.set(mx, 15, mz);
        registerPart(motorStator, new THREE.Vector3(mx * 1.8, 30, mz * 1.8));

        // Neon Tri-Blade Propeller
        const propHub = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 3, 12), redAccentMat);
        const propBlade1 = new THREE.Mesh(new THREE.BoxGeometry(16, 0.8, 3), redAccentMat);
        propBlade1.rotation.y = 0;
        const propBlade2 = new THREE.Mesh(new THREE.BoxGeometry(16, 0.8, 3), redAccentMat);
        propBlade2.rotation.y = Math.PI * 2 / 3;
        const propBlade3 = new THREE.Mesh(new THREE.BoxGeometry(16, 0.8, 3), redAccentMat);
        propBlade3.rotation.y = Math.PI * 4 / 3;
        const propGroup = new THREE.Group();
        propGroup.add(propHub, propBlade1, propBlade2, propBlade3);
        propGroup.position.set(mx, 20, mz);
        registerPart(propGroup, new THREE.Vector3(mx * 2.2, 55, mz * 2.2));
      });

      // 3. 4-in-1 ESC & F7 Flight Controller Stack
      const escBoard = new THREE.Mesh(new THREE.BoxGeometry(22, 1.5, 22), createMat('#0284c7', 0.2, 0.6));
      escBoard.position.set(0, 14, 0);
      registerPart(escBoard, new THREE.Vector3(0, 25, 0));

      const fcBoard = new THREE.Mesh(new THREE.BoxGeometry(20, 1.5, 20), createMat('#10b981', 0.2, 0.6));
      fcBoard.position.set(0, 18, 0);
      registerPart(fcBoard, new THREE.Vector3(0, 45, 0));

      // 4. Carbon Top Plate & FPV Camera
      const topPlate = new THREE.Mesh(new THREE.BoxGeometry(26, 2, 45), carbonMat);
      topPlate.position.set(0, 23, 0);
      registerPart(topPlate, new THREE.Vector3(0, 70, 0));

      const fpvCam = new THREE.Mesh(new THREE.BoxGeometry(9, 9, 10), redAccentMat);
      fpvCam.position.set(0, 24, 22);
      registerPart(fpvCam, new THREE.Vector3(0, 85, 30));

      // 5. 4S LiPo Battery Pack
      const battery = new THREE.Mesh(new THREE.BoxGeometry(20, 14, 40), goldBrassMat);
      battery.position.set(0, 31, -2);
      registerPart(battery, new THREE.Vector3(0, 105, -5));

    } else if (type === 'exploded_lock' || type === 'lock') {
      // ---------------------------------------------------------------------
      // HIGH-SECURITY PIN-TUMBLER PADLOCK
      // ---------------------------------------------------------------------
      // 1. Heavy Brass Padlock Body (with Cutaway Chamber View)
      const lockBody = new THREE.Mesh(new THREE.BoxGeometry(45, 54, 22), goldBrassMat);
      lockBody.position.set(0, 27, 0);
      registerPart(lockBody, new THREE.Vector3(0, 0, 0));

      // 2. Hardened Steel Shackle (U-Arc)
      const shackle = new THREE.Mesh(new THREE.TorusGeometry(15, 4, 16, 32, Math.PI), chromeMat);
      shackle.position.set(0, 54, 0);
      registerPart(shackle, new THREE.Vector3(0, 45, 0));

      const shackleLegL = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 28, 16), chromeMat);
      shackleLegL.position.set(-15, 40, 0);
      registerPart(shackleLegL, new THREE.Vector3(-10, 45, 0));

      const shackleLegR = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 28, 16), chromeMat);
      shackleLegR.position.set(15, 40, 0);
      registerPart(shackleLegR, new THREE.Vector3(10, 45, 0));

      // 3. Rotating Cylinder Core / Plug
      const corePlug = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 40, 20), chromeMat);
      corePlug.rotation.x = Math.PI / 2;
      corePlug.position.set(0, 16, 0);
      registerPart(corePlug, new THREE.Vector3(0, 0, 50));

      // 4. 5 Pin Tumbler Chambers (Key Pins, Driver Pins, Springs)
      for (let p = 0; p < 5; p++) {
        const pz = -14 + p * 7;
        const keyPin = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 6 + (p % 3) * 2, 12), goldBrassMat);
        keyPin.position.set(0, 16, pz);
        registerPart(keyPin, new THREE.Vector3(0, -25, pz));

        const driverPin = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 7, 12), chromeMat);
        driverPin.position.set(0, 24, pz);
        registerPart(driverPin, new THREE.Vector3(0, 30, pz));

        const spring = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 8, 8), copperMat);
        spring.position.set(0, 32, pz);
        registerPart(spring, new THREE.Vector3(0, 55, pz));
      }

    } else if (type === 'exploded_jet' || type === 'jet') {
      // ---------------------------------------------------------------------
      // HIGH-BYPASS TURBOFAN JET ENGINE
      // ---------------------------------------------------------------------
      // 1. Central Drive Shaft Axis
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 140, 16), chromeMat);
      shaft.rotation.x = Math.PI / 2;
      shaft.position.set(0, 35, 0);
      registerPart(shaft, new THREE.Vector3(0, 0, 0));

      // 2. Titanium Front Fan Rotor & Nose Spinner
      const fanHub = new THREE.Mesh(new THREE.ConeGeometry(8, 18, 20), chromeMat);
      fanHub.rotation.x = -Math.PI / 2;
      fanHub.position.set(0, 35, 62);
      registerPart(fanHub, new THREE.Vector3(0, 0, 65));

      const fanBlades = new THREE.Mesh(new THREE.CylinderGeometry(28, 28, 4, 24), metalMat);
      fanBlades.rotation.x = Math.PI / 2;
      fanBlades.position.set(0, 35, 52);
      registerPart(fanBlades, new THREE.Vector3(0, 0, 50));
      group.userData.jetFan = fanBlades; // for live rotation!

      // 3. Low-Pressure & High-Pressure Compressor Stages
      const comp1 = new THREE.Mesh(new THREE.CylinderGeometry(20, 20, 10, 24), metalMat);
      comp1.rotation.x = Math.PI / 2;
      comp1.position.set(0, 35, 30);
      registerPart(comp1, new THREE.Vector3(0, 0, 25));

      const comp2 = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 14, 24), metalMat);
      comp2.rotation.x = Math.PI / 2;
      comp2.position.set(0, 35, 12);
      registerPart(comp2, new THREE.Vector3(0, 0, 10));

      // 4. Annular Combustion Chamber with Swirl Nozzles
      const combustor = new THREE.Mesh(new THREE.TorusGeometry(14, 4, 16, 24), copperMat);
      combustor.position.set(0, 35, -10);
      registerPart(combustor, new THREE.Vector3(0, 0, -12));

      // 5. High-Pressure & Low-Pressure Turbine Stages
      const turbineHP = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 5, 24), metalMat);
      turbineHP.rotation.x = Math.PI / 2;
      turbineHP.position.set(0, 35, -24);
      registerPart(turbineHP, new THREE.Vector3(0, 0, -30));

      const turbineLP = new THREE.Mesh(new THREE.CylinderGeometry(18, 18, 6, 24), metalMat);
      turbineLP.rotation.x = Math.PI / 2;
      turbineLP.position.set(0, 35, -36);
      registerPart(turbineLP, new THREE.Vector3(0, 0, -48));

      // 6. Exhaust Core Tailcone
      const exhaustCone = new THREE.Mesh(new THREE.ConeGeometry(10, 28, 16), chromeMat);
      exhaustCone.rotation.x = Math.PI / 2;
      exhaustCone.position.set(0, 35, -58);
      registerPart(exhaustCone, new THREE.Vector3(0, 0, -75));

      // 7. Split Outer Nacelle Cowling (Left & Right Halves)
      const nacelleL = new THREE.Mesh(new THREE.CylinderGeometry(32, 30, 80, 16, 1, true, 0, Math.PI), createMat('#3b82f6', 0.25, 0.8, { side: THREE.DoubleSide }));
      nacelleL.rotation.x = Math.PI / 2;
      nacelleL.position.set(0, 35, 10);
      registerPart(nacelleL, new THREE.Vector3(50, 20, 0));

      const nacelleR = new THREE.Mesh(new THREE.CylinderGeometry(32, 30, 80, 16, 1, true, Math.PI, Math.PI), createMat('#3b82f6', 0.25, 0.8, { side: THREE.DoubleSide }));
      nacelleR.rotation.x = Math.PI / 2;
      nacelleR.position.set(0, 35, 10);
      registerPart(nacelleR, new THREE.Vector3(-50, 20, 0));
    }

    group.userData.explodedParts = explodedParts;
    const initialFactor = options.explosionFactor !== undefined ? options.explosionFactor : 0.0;
    setExplosionFactor(group, initialFactor);

    return group;
  }

  function setExplosionFactor(mechanismGroup, factor = 0.0) {
    if (!mechanismGroup || !mechanismGroup.userData || !mechanismGroup.userData.explodedParts) return;
    const clamped = Math.max(0.0, Math.min(1.0, factor));

    mechanismGroup.userData.explodedParts.forEach(p => {
      if (p.mesh && p.origPos && p.dir) {
        p.mesh.position.x = p.origPos.x + p.dir.x * clamped;
        p.mesh.position.y = p.origPos.y + p.dir.y * clamped;
        p.mesh.position.z = p.origPos.z + p.dir.z * clamped;
      }
    });
  }

  // =========================================================================
  // 3. AR LIVING PLANETARIUM & DEEP SPACE
  // =========================================================================
  function createARPlanetarium(typeOrOpts = 'solar', options = {}) {
    let type = 'solar';
    let opts = options;
    if (typeof typeOrOpts === 'object' && typeOrOpts !== null) {
      opts = typeOrOpts;
      type = opts.type || 'solar';
    } else if (typeof typeOrOpts === 'string') {
      type = typeOrOpts;
    }

    const group = new THREE.Group();
    group.name = `AR_Planetarium_${type}`;
    const baseRadius = opts.scale || 1.0;

    if (type === 'solar') {
      // Center Sun with Pulsing Corona
      const sunGeo = new THREE.SphereGeometry(18 * baseRadius, 32, 32);
      const sunMat = createMat('#ff9900', 0.2, 0.0, { emissive: '#ff5500', emissiveIntensity: 0.85 });
      const sunMesh = new THREE.Mesh(sunGeo, sunMat);
      sunMesh.position.set(0, 40, 0);
      group.add(sunMesh);

      // Planets configuration [name, color, size, distance, speed, hasRing, hasMoon]
      const planets = [
        { name: 'Mercury', color: '#a3a3a3', size: 3.5, dist: 35, speed: 4.0 },
        { name: 'Venus', color: '#eab308', size: 6.0, dist: 52, speed: 2.8 },
        { name: 'Earth', color: '#2563eb', size: 6.5, dist: 75, speed: 2.0, hasMoon: true },
        { name: 'Mars', color: '#dc2626', size: 4.5, dist: 98, speed: 1.6 },
        { name: 'Jupiter', color: '#d97706', size: 14.0, dist: 135, speed: 1.0 },
        { name: 'Saturn', color: '#fde047', size: 11.0, dist: 175, speed: 0.7, hasRing: true }
      ];

      group.userData.orbitObjects = [];

      planets.forEach(p => {
        const orbitDist = p.dist * baseRadius;

        // Orbit Guideline Ring
        const orbitLineGeo = new THREE.RingGeometry(orbitDist - 0.3, orbitDist + 0.3, 64);
        const orbitLineMat = createMat('#38bdf8', 0.1, 0.1, { transparent: true, opacity: 0.25, side: THREE.DoubleSide });
        const orbitRing = new THREE.Mesh(orbitLineGeo, orbitLineMat);
        orbitRing.rotation.x = Math.PI / 2;
        orbitRing.position.set(0, 40, 0);
        group.add(orbitRing);

        // Planet Pivot Node
        const pivot = new THREE.Group();
        pivot.position.set(0, 40, 0);
        group.add(pivot);

        const pGeo = new THREE.SphereGeometry(p.size * baseRadius, 24, 24);
        const pMat = createMat(p.color, 0.4, 0.1);
        const pMesh = new THREE.Mesh(pGeo, pMat);
        pMesh.position.set(orbitDist, 0, 0);
        pivot.add(pMesh);

        // Saturn Rings
        if (p.hasRing) {
          const ringGeo = new THREE.RingGeometry(p.size * 1.4 * baseRadius, p.size * 2.4 * baseRadius, 32);
          const ringMat = createMat('#e2e8f0', 0.5, 0.2, { side: THREE.DoubleSide });
          const ringMesh = new THREE.Mesh(ringGeo, ringMat);
          ringMesh.rotation.x = Math.PI / 3;
          pMesh.add(ringMesh);
        }

        // Earth Moon
        if (p.hasMoon) {
          const moonPivot = new THREE.Group();
          pMesh.add(moonPivot);
          const moonGeo = new THREE.SphereGeometry(1.8 * baseRadius, 16, 16);
          const moonMat = createMat('#cbd5e1', 0.6, 0.0);
          const moonMesh = new THREE.Mesh(moonGeo, moonMat);
          moonMesh.position.set(12 * baseRadius, 0, 0);
          moonPivot.add(moonMesh);
          group.userData.orbitObjects.push({ node: moonPivot, speed: 6.0 });
        }

        group.userData.orbitObjects.push({ node: pivot, speed: p.speed, planetMesh: pMesh });
      });

      // Hologram Pedestal Base
      const baseGeo = new THREE.CylinderGeometry(200 * baseRadius, 210 * baseRadius, 8, 48);
      const baseMesh = new THREE.Mesh(baseGeo, createMat('#0f172a', 0.2, 0.8));
      baseMesh.position.set(0, 4, 0);
      group.add(baseMesh);

    } else if (type === 'blackhole') {
      // ---------------------------------------------------------------------
      // GARGANTUA SUPERMASSIVE BLACK HOLE
      // ---------------------------------------------------------------------
      // 1. Pitch-Black Event Horizon Sphere
      const holeMat = createMat('#000000', 1.0, 0.0);
      const holeSphere = new THREE.Mesh(new THREE.SphereGeometry(18, 36, 36), holeMat);
      holeSphere.position.set(0, 45, 0);
      group.add(holeSphere);

      // 2. Glowing Inner Photon Ring
      const photonMat = createMat('#f8fafc', 0.1, 0.1, { emissive: '#e0f2fe', emissiveIntensity: 1.0, side: THREE.DoubleSide });
      const photonRing = new THREE.Mesh(new THREE.RingGeometry(18.2, 21, 64), photonMat);
      photonRing.rotation.x = Math.PI / 2;
      photonRing.position.set(0, 45, 0);
      group.add(photonRing);

      // 3. Broad Glowing Keplerian Accretion Disk
      const diskMat = createMat('#f97316', 0.2, 0.1, { emissive: '#ea580c', emissiveIntensity: 0.9, side: THREE.DoubleSide });
      const accretionDisk = new THREE.Mesh(new THREE.RingGeometry(22, 65, 64), diskMat);
      accretionDisk.rotation.x = Math.PI / 2.3;
      accretionDisk.position.set(0, 45, 0);
      group.add(accretionDisk);
      group.userData.blackHoleDisk = accretionDisk; // for live rotation!

      // 4. Gravitational Lensing Vertical Halo Ring (Light Bending)
      const lensRingMat = createMat('#fbbf24', 0.1, 0.1, { emissive: '#f59e0b', emissiveIntensity: 0.7, side: THREE.DoubleSide });
      const lensRing = new THREE.Mesh(new THREE.RingGeometry(18.5, 48, 64), lensRingMat);
      lensRing.position.set(0, 45, 0);
      group.add(lensRing);

      // 5. Polar Relativistic Plasma Jets (Top & Bottom)
      const jetMat = createMat('#00f0ff', 0.1, 0.1, { transparent: true, opacity: 0.85, emissive: '#00f0ff', emissiveIntensity: 1.0 });
      const jetTop = new THREE.Mesh(new THREE.ConeGeometry(5, 75, 20), jetMat);
      jetTop.position.set(0, 90, 0);
      const jetBot = new THREE.Mesh(new THREE.ConeGeometry(5, 75, 20), jetMat);
      jetBot.rotation.x = Math.PI;
      jetBot.position.set(0, 0, 0);
      group.add(jetTop, jetBot);
      group.userData.plasmaJetTop = jetTop;
      group.userData.plasmaJetBottom = jetBot;

    } else if (type === 'iss') {
      // ---------------------------------------------------------------------
      // INTERNATIONAL SPACE STATION (ISS)
      // ---------------------------------------------------------------------
      const modMat = createMat('#e2e8f0', 0.3, 0.7);
      const solarMat = createMat('#1e3a8a', 0.2, 0.8);
      const trussMat = createMat('#94a3b8', 0.4, 0.6);

      // Central Integrated Truss Structure
      const truss = new THREE.Mesh(new THREE.BoxGeometry(160, 4, 4), trussMat);
      truss.position.set(0, 40, 0);
      group.add(truss);

      // Pressurized Modules Cluster (Destiny, Harmony, Unity, Zvezda)
      const coreMod1 = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 32, 16), modMat);
      coreMod1.position.set(0, 40, 0);
      const coreMod2 = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 36, 16), modMat);
      coreMod2.rotation.x = Math.PI / 2;
      coreMod2.position.set(0, 40, 6);
      group.add(coreMod1, coreMod2);

      // 8 Articulated Gold-Blue Photovoltaic Solar Array Wings
      for (let side of [-70, -50, 50, 70]) {
        const wingTop = new THREE.Mesh(new THREE.BoxGeometry(16, 0.8, 48), solarMat);
        wingTop.position.set(side, 40, 28);
        const wingBot = new THREE.Mesh(new THREE.BoxGeometry(16, 0.8, 48), solarMat);
        wingBot.position.set(side, 40, -28);
        group.add(wingTop, wingBot);
      }

      // Cupola Observation Dome with Blue Earth-Facing Glass
      const cupola = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 12), createMat('#38bdf8', 0.1, 0.2));
      cupola.position.set(0, 34, 10);
      group.add(cupola);

    } else if (type === 'james_webb') {
      // ---------------------------------------------------------------------
      // JAMES WEBB SPACE TELESCOPE (JWST)
      // ---------------------------------------------------------------------
      const goldMirrorMat = createMat('#fbbf24', 0.05, 0.98); // 24k gold primary mirror
      const kaptonMat = createMat('#b45309', 0.3, 0.5); // Kapton sunshield layers
      const silverMat = createMat('#cbd5e1', 0.2, 0.8);

      // 1. 5-Layer Stepped Kapton Sunshield
      for (let lyr = 0; lyr < 5; lyr++) {
        const shield = new THREE.Mesh(new THREE.BoxGeometry(85 - lyr * 3, 0.8, 48 - lyr * 2), kaptonMat);
        shield.position.set(0, 16 + lyr * 2, 0);
        group.add(shield);
      }

      // 2. Honeycomb 18-Segment Gold Primary Mirror Array
      const mirrorGroup = new THREE.Group();
      mirrorGroup.position.set(0, 42, 6);
      mirrorGroup.rotation.x = -Math.PI / 8;

      const hexR = 7;
      const hexCoords = [
        [0, 0], [0, hexR * 1.73], [0, -hexR * 1.73],
        [hexR * 1.5, hexR * 0.86], [hexR * 1.5, -hexR * 0.86],
        [-hexR * 1.5, hexR * 0.86], [-hexR * 1.5, -hexR * 0.86],
        [hexR * 3, 0], [-hexR * 3, 0],
        [hexR * 1.5, hexR * 2.6], [-hexR * 1.5, hexR * 2.6],
        [hexR * 1.5, -hexR * 2.6], [-hexR * 1.5, -hexR * 2.6],
        [0, hexR * 3.46], [0, -hexR * 3.46]
      ];
      hexCoords.forEach(([hx, hy]) => {
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(hexR * 0.95, hexR * 0.95, 1.2, 6), goldMirrorMat);
        seg.rotation.x = Math.PI / 2;
        seg.position.set(hx, hy, 0);
        mirrorGroup.add(seg);
      });
      group.add(mirrorGroup);

      // 3. Secondary Mirror Tripod
      const secMirror = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 1.5, 16), silverMat);
      secMirror.position.set(0, 50, 32);
      group.add(secMirror);

      for (let legX of [-18, 0, 18]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 38, 8), silverMat);
        leg.position.set(legX * 0.5, 46, 18);
        leg.rotation.x = Math.PI / 4;
        group.add(leg);
      }
    }

    return group;
  }

  // =========================================================================
  // 4. AR 1:1 VIRTUAL MUSEUM ARTIFACTS
  // =========================================================================
  function createARMuseumPiece(pieceId = 'thinker_hamangia', options = {}) {
    const group = new THREE.Group();
    group.name = `AR_Museum_${pieceId}`;

    const marbleMat = createMat('#f8fafc', 0.3, 0.05);
    const bronzeAntiqueMat = createMat('#854d0e', 0.4, 0.7);
    const goldPlaqueMat = createMat('#eab308', 0.18, 0.95);
    const pedestalMat = createMat('#1e293b', 0.25, 0.3);
    const slateMat = createMat('#334155', 0.7, 0.1);

    // Museum Presentation Pedestal (60x60x70cm)
    const pedGeo = new THREE.BoxGeometry(50, 70, 50);
    const pedestal = new THREE.Mesh(pedGeo, pedestalMat);
    pedestal.position.set(0, 35, 0);
    group.add(pedestal);

    const plaqueGeo = new THREE.BoxGeometry(24, 8, 1);
    const plaque = new THREE.Mesh(plaqueGeo, goldPlaqueMat);
    plaque.position.set(0, 50, 25.6);
    group.add(plaque);

    const statueGroup = new THREE.Group();
    statueGroup.position.set(0, 70, 0);
    group.add(statueGroup);

    if (pieceId === 'thinker_hamangia' || pieceId === 'thinker') {
      // ---------------------------------------------------------------------
      // GÂNDITORUL DE LA HAMANGIA (5000 BC Neolithic Masterpiece)
      // ---------------------------------------------------------------------
      const bodyMat = bronzeAntiqueMat;
      const stool = new THREE.Mesh(new THREE.CylinderGeometry(10, 12, 10, 16), bodyMat);
      stool.position.set(0, 5, 0);
      statueGroup.add(stool);

      const torso = new THREE.Mesh(new THREE.CylinderGeometry(7, 9, 26, 16), bodyMat);
      torso.rotation.x = Math.PI / 8;
      torso.position.set(0, 22, -2);
      statueGroup.add(torso);

      const armGeo = new THREE.CylinderGeometry(2.5, 2.5, 22, 12);
      const armL = new THREE.Mesh(armGeo, bodyMat);
      armL.rotation.set(Math.PI / 4, 0, -Math.PI / 6);
      armL.position.set(-6, 26, 4);
      const armR = new THREE.Mesh(armGeo, bodyMat);
      armR.rotation.set(Math.PI / 4, 0, Math.PI / 6);
      armR.position.set(6, 26, 4);
      statueGroup.add(armL, armR);

      const head = new THREE.Mesh(new THREE.SphereGeometry(6.5, 20, 20), bodyMat);
      head.position.set(0, 37, 5);
      statueGroup.add(head);

    } else if (pieceId === 'greek_caryatid' || pieceId === 'greek') {
      // ---------------------------------------------------------------------
      // CLASSICAL GREEK CARYATID STATUE & COLUMN
      // ---------------------------------------------------------------------
      const colMat = marbleMat;
      const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(14, 16, 8, 24), colMat);
      baseMesh.position.set(0, 4, 0);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(11, 13, 55, 24), colMat);
      shaft.position.set(0, 35, 0);
      const caryatidFigure = new THREE.Mesh(new THREE.CylinderGeometry(9, 11, 40, 16), colMat);
      caryatidFigure.position.set(0, 78, 0);
      const capital = new THREE.Mesh(new THREE.BoxGeometry(26, 10, 26), colMat);
      capital.position.set(0, 103, 0);
      statueGroup.add(baseMesh, shaft, caryatidFigure, capital);

    } else if (pieceId === 'egyptian_obelisk' || pieceId === 'egypt') {
      // ---------------------------------------------------------------------
      // EGYPTIAN GOLDEN HIEROGLYPHIC OBELISK
      // ---------------------------------------------------------------------
      const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(8, 14, 90, 4), slateMat);
      obelisk.rotation.y = Math.PI / 4;
      obelisk.position.set(0, 45, 0);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(8 * Math.SQRT2, 16, 4), goldPlaqueMat);
      cap.rotation.y = Math.PI / 4;
      cap.position.set(0, 98, 0);
      statueGroup.add(obelisk, cap);

    } else if (pieceId === 'rosetta_stone' || pieceId === 'rosetta') {
      // ---------------------------------------------------------------------
      // THE ROSETTA STONE STELE (Granodiorite Slab with Inscriptions)
      // ---------------------------------------------------------------------
      const stoneSlab = new THREE.Mesh(new THREE.BoxGeometry(36, 52, 10), slateMat);
      stoneSlab.rotation.x = -Math.PI / 16;
      stoneSlab.position.set(0, 28, 0);
      statueGroup.add(stoneSlab);

      // Tripartite Text Band Dividers (Hieroglyphic, Demotic, Greek)
      for (let lineY of [18, 32]) {
        const divider = new THREE.Mesh(new THREE.BoxGeometry(32, 0.8, 10.6), createMat('#94a3b8', 0.8, 0.1));
        divider.rotation.x = -Math.PI / 16;
        divider.position.set(0, lineY, 0);
        statueGroup.add(divider);
      }

    } else if (pieceId === 'antikythera_mechanism' || pieceId === 'antikythera') {
      // ---------------------------------------------------------------------
      // ANTIKYTHERA ASTRONOMICAL GEAR COMPUTER (205 BC)
      // ---------------------------------------------------------------------
      const corrodedBronze = createMat('#15803d', 0.6, 0.6);
      const bronzeGear = createMat('#b45309', 0.3, 0.85);

      // Wooden Fragment Display Cradle
      const cradle = new THREE.Mesh(new THREE.BoxGeometry(40, 8, 30), createMat('#78350f', 0.7, 0.1));
      cradle.position.set(0, 4, 0);
      statueGroup.add(cradle);

      // Great 240-Tooth Sun Gear & Differential Wheel Train
      const mainGear = new THREE.Mesh(new THREE.CylinderGeometry(18, 18, 2.5, 36), bronzeGear);
      mainGear.position.set(0, 20, 0);
      statueGroup.add(mainGear);

      // Meshing Planetary Pinions & Dial Rings
      for (let g = 0; g < 4; g++) {
        const ang = (g * Math.PI * 2) / 4;
        const subG = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 2, 20), corrodedBronze);
        subG.position.set(Math.cos(ang) * 12, 24 + g * 2, Math.sin(ang) * 12);
        statueGroup.add(subG);
      }

      // Zodiac Dial Ring Plate
      const zodiacRing = new THREE.Mesh(new THREE.RingGeometry(18, 22, 32), corrodedBronze);
      zodiacRing.rotation.x = -Math.PI / 2;
      zodiacRing.position.set(0, 32, 0);
      statueGroup.add(zodiacRing);

    } else if (pieceId === 'nefertiti_bust' || pieceId === 'nefertiti') {
      // ---------------------------------------------------------------------
      // ICONIC BUST OF QUEEN NEFERTITI
      // ---------------------------------------------------------------------
      const skinMat = createMat('#d97706', 0.45, 0.1);
      const royalBlueCrownMat = createMat('#1d4ed8', 0.3, 0.2);

      // Slender Neck & Graceful Torso
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 7.5, 20, 16), skinMat);
      neck.position.set(0, 12, 0);
      const head = new THREE.Mesh(new THREE.SphereGeometry(8.5, 20, 20), skinMat);
      head.position.set(0, 26, 1);
      statueGroup.add(neck, head);

      // Tall Royal Flat-Top Blue Crown
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(11, 8.5, 24, 20), royalBlueCrownMat);
      crown.position.set(0, 42, -1);
      crown.rotation.x = -Math.PI / 20;

      // Golden Diadem Ribbon & Uraeus Serpent
      const diadem = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 3, 20), goldPlaqueMat);
      diadem.position.set(0, 33, -1);
      diadem.rotation.x = -Math.PI / 20;
      statueGroup.add(crown, diadem);

      // Egyptian Multi-Color Collar Necklace
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(16, 18, 4, 24), goldPlaqueMat);
      collar.position.set(0, 2, 0);
      statueGroup.add(collar);
    }

    return group;
  }

  // =========================================================================
  // 5. AR LIVING DIORAMAS & AQUARIUM
  // =========================================================================
  function createARLiveAquarium(typeOrOpts = 'aquarium_live', options = {}) {
    let type = 'aquarium_live';
    if (typeof typeOrOpts === 'string') type = typeOrOpts;

    const group = new THREE.Group();
    group.name = `AR_Diorama_${type}`;

    if (type === 'aquarium_live') {
      const width = 85;
      const height = 55;
      const depth = 55;

      // Transparent Glass Cube Tank
      const glassMat = createMat('#38bdf8', 0.1, 0.1, { transparent: true, opacity: 0.35, side: THREE.DoubleSide });
      const tank = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), glassMat);
      tank.position.set(0, height / 2 + 5, 0);
      group.add(tank);

      // Modern Wood & Steel Stand
      const stand = new THREE.Mesh(new THREE.BoxGeometry(width + 6, 6, depth + 6), createMat('#0f172a', 0.3, 0.7));
      stand.position.set(0, 3, 0);
      group.add(stand);

      // White Sand Bed
      const sand = new THREE.Mesh(new THREE.PlaneGeometry(width - 2, depth - 2), createMat('#fde68a', 0.8, 0.0));
      sand.rotation.x = -Math.PI / 2;
      sand.position.set(0, 6.2, 0);
      group.add(sand);

      // Multi-Color Corals
      const coralCols = ['#ff007f', '#00f0ff', '#10b981', '#f59e0b'];
      for (let i = 0; i < 7; i++) {
        const coral = new THREE.Mesh(new THREE.ConeGeometry(5 + (i % 3) * 3, 16 + (i % 4) * 5, 8), createMat(coralCols[i % coralCols.length], 0.3, 0.1));
        coral.position.set((Math.random() - 0.5) * (width - 24), 14, (Math.random() - 0.5) * (depth - 24));
        group.add(coral);
      }

      // Animated Swimming Fish
      const fishObjects = [];
      const fishColors = ['#ff5722', '#00e5ff', '#ffeb3b', '#e91e63', '#8b5cf6'];
      for (let f = 0; f < 6; f++) {
        const fishGroup = new THREE.Group();
        const fMat = createMat(fishColors[f % fishColors.length], 0.2, 0.3);
        const fBody = new THREE.Mesh(new THREE.ConeGeometry(2.8, 8.5, 8), fMat);
        fBody.rotation.z = -Math.PI / 2;
        const fTail = new THREE.Mesh(new THREE.BoxGeometry(3.5, 4.5, 0.5), fMat);
        fTail.position.set(-4.5, 0, 0);
        fishGroup.add(fBody, fTail);

        fishGroup.position.set((Math.random() - 0.5) * 45, 22 + Math.random() * 22, (Math.random() - 0.5) * 35);
        group.add(fishGroup);

        fishObjects.push({
          group: fishGroup,
          radiusX: 16 + Math.random() * 18,
          radiusZ: 12 + Math.random() * 12,
          speed: 0.8 + Math.random() * 0.7,
          baseY: fishGroup.position.y,
          offset: Math.random() * Math.PI * 2
        });
      }
      group.userData.fishObjects = fishObjects;

    } else if (type === 'diorama_bonsai' || type === 'bonsai') {
      // ---------------------------------------------------------------------
      // JAPANESE ZEN BONSAI GARDEN DIORAMA
      // ---------------------------------------------------------------------
      const slateMat = createMat('#334155', 0.6, 0.2);
      const woodMat = createMat('#451a03', 0.8, 0.1);
      const foliageMat = createMat('#15803d', 0.7, 0.1);
      const sandMat = createMat('#e2e8f0', 0.9, 0.0);

      // Ceramic Rectangular Bonsai Pot
      const pot = new THREE.Mesh(new THREE.BoxGeometry(70, 14, 50), slateMat);
      pot.position.set(0, 7, 0);
      group.add(pot);

      // Raked Zen Sand Surface
      const sand = new THREE.Mesh(new THREE.PlaneGeometry(66, 46), sandMat);
      sand.rotation.x = -Math.PI / 2;
      sand.position.set(0, 14.1, 0);
      group.add(sand);

      // Gnarled Twisted Pine Bonsai Trunk
      const trunk1 = new THREE.Mesh(new THREE.CylinderGeometry(5, 7, 28, 12), woodMat);
      trunk1.rotation.z = -Math.PI / 10;
      trunk1.position.set(-6, 26, 0);
      const trunk2 = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 5, 24, 12), woodMat);
      trunk2.rotation.z = Math.PI / 6;
      trunk2.position.set(0, 46, 0);
      group.add(trunk1, trunk2);

      // Sculpted Evergreen Cloud Foliage Pads
      const clouds = [[-18, 38, -4, 14], [12, 54, 2, 16], [-2, 64, -2, 18], [24, 48, 6, 12]];
      clouds.forEach(([cx, cy, cz, crad]) => {
        const pad = new THREE.Mesh(new THREE.SphereGeometry(crad, 16, 12), foliageMat);
        pad.scale.set(1.4, 0.45, 1.2);
        pad.position.set(cx, cy, cz);
        group.add(pad);
      });

      // Miniature Granite Stone Pagoda Lantern
      const lanternBase = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 8), slateMat);
      lanternBase.position.set(20, 16, 14);
      const lanternPillar = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 14, 8), slateMat);
      lanternPillar.position.set(20, 23, 14);
      const lanternRoof = new THREE.Mesh(new THREE.ConeGeometry(8, 6, 4), slateMat);
      lanternRoof.position.set(20, 33, 14);
      group.add(lanternBase, lanternPillar, lanternRoof);

    } else if (type === 'diorama_cyber_garage' || type === 'cyber_garage') {
      // ---------------------------------------------------------------------
      // CYBERPUNK HOVERCAR WORKSHOP DIORAMA
      // ---------------------------------------------------------------------
      const padMat = createMat('#0f172a', 0.25, 0.85);
      const carMat = createMat('#0284c7', 0.2, 0.95);
      const glowCyan = createMat('#00f0ff', 0.1, 0.1, { emissive: '#00f0ff', emissiveIntensity: 0.9 });
      const orangeMat = createMat('#f97316', 0.3, 0.7);

      // Hexagonal Industrial Grated Workshop Pad
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(48, 50, 6, 6), padMat);
      pad.position.set(0, 3, 0);
      group.add(pad);

      // Floating Aerodynamic Speeder Hovercar (Bobs live in animation)
      const hovercarGroup = new THREE.Group();
      hovercarGroup.position.set(0, 32, 0);
      const carBody = new THREE.Mesh(new THREE.BoxGeometry(26, 8, 55), carMat);
      const cockpit = new THREE.Mesh(new THREE.BoxGeometry(16, 7, 24), glowCyan);
      cockpit.position.set(0, 6, -2);
      const repulsorL = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 2, 16), glowCyan);
      repulsorL.position.set(-10, -4.5, 14);
      const repulsorR = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 2, 16), glowCyan);
      repulsorR.position.set(10, -4.5, 14);
      hovercarGroup.add(carBody, cockpit, repulsorL, repulsorR);
      group.add(hovercarGroup);
      group.userData.hovercar = hovercarGroup;
      group.userData.hovercarBaseY = 32;

      // Articulated Robotic Welding Arm
      const armBase = new THREE.Mesh(new THREE.CylinderGeometry(5, 6, 6, 16), orangeMat);
      armBase.position.set(-28, 9, -15);
      const armLower = new THREE.Mesh(new THREE.BoxGeometry(4, 22, 4), orangeMat);
      armLower.rotation.z = -Math.PI / 6;
      armLower.position.set(-24, 20, -15);
      const armUpper = new THREE.Mesh(new THREE.BoxGeometry(3, 18, 3), orangeMat);
      armUpper.rotation.z = Math.PI / 4;
      armUpper.position.set(-14, 32, -15);
      group.add(armBase, armLower, armUpper);

    } else if (type === 'diorama_arctic' || type === 'arctic') {
      // ---------------------------------------------------------------------
      // ARCTIC POLAR ICEBERG DIORAMA
      // ---------------------------------------------------------------------
      const waterMat = createMat('#0284c7', 0.1, 0.3, { transparent: true, opacity: 0.75 });
      const iceMat = createMat('#f8fafc', 0.2, 0.1);
      const iceSubMat = createMat('#38bdf8', 0.1, 0.2, { transparent: true, opacity: 0.85 });

      // Cylindrical Ocean Water Base
      const ocean = new THREE.Mesh(new THREE.CylinderGeometry(45, 45, 18, 32), waterMat);
      ocean.position.set(0, 9, 0);
      group.add(ocean);

      // Sculpted Crystalline Iceberg
      const iceAbove = new THREE.Mesh(new THREE.ConeGeometry(18, 35, 6), iceMat);
      iceAbove.position.set(-8, 32, 2);
      const iceShelf = new THREE.Mesh(new THREE.BoxGeometry(32, 6, 26), iceMat);
      iceShelf.position.set(2, 19, 0);
      const iceSub = new THREE.Mesh(new THREE.ConeGeometry(24, 18, 7), iceSubMat);
      iceSub.rotation.x = Math.PI;
      iceSub.position.set(-6, 9, 2);
      group.add(iceAbove, iceShelf, iceSub);

      // Emperor Penguin Figures on Ice Floe
      for (let px of [4, 12]) {
        const penguin = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2, 8, 12), createMat('#0f172a', 0.5, 0.1));
        penguin.position.set(px, 24, -4);
        group.add(penguin);
      }
    }

    return group;
  }

  // =========================================================================
  // 6. AR 1:1 MODERN INTERIOR FURNITURE & DECOR
  // =========================================================================
  function createARModernFurniture(type = 'epoxy_river_table', options = {}) {
    const group = new THREE.Group();
    group.name = `AR_Furniture_${type}`;

    const woodMat = createMat('#78350f', 0.4, 0.1);
    const epoxyRiverMat = createMat('#00f0ff', 0.1, 0.2, { transparent: true, opacity: 0.78 });
    const blackSteelMat = createMat('#18181b', 0.3, 0.85);
    const leatherMat = createMat('#9a3412', 0.6, 0.1);
    const whiteMarbleMat = createMat('#f8fafc', 0.2, 0.1);

    if (type === 'epoxy_river_table' || type === 'river_table') {
      // Walnut & Translucent Epoxy River Coffee Table (100x50x45cm)
      const tableW = 100, tableD = 50, tableH = 45;

      const plankGeo = new THREE.BoxGeometry(tableW, 5, (tableD - 14) / 2);
      const leftPlank = new THREE.Mesh(plankGeo, woodMat);
      leftPlank.position.set(0, tableH, -15);
      const rightPlank = new THREE.Mesh(plankGeo, woodMat);
      rightPlank.position.set(0, tableH, 15);
      group.add(leftPlank, rightPlank);

      const river = new THREE.Mesh(new THREE.BoxGeometry(tableW, 4.8, 16), epoxyRiverMat);
      river.position.set(0, tableH, 0);
      group.add(river);

      // Matte Black Steel Trapezoid Legs
      const legGeo = new THREE.CylinderGeometry(2, 2, tableH, 12);
      [
        [-tableW / 2 + 8, tableH / 2, -tableD / 2 + 6],
        [-tableW / 2 + 8, tableH / 2, tableD / 2 - 6],
        [tableW / 2 - 8, tableH / 2, -tableD / 2 + 6],
        [tableW / 2 - 8, tableH / 2, tableD / 2 - 6]
      ].forEach(pos => {
        const leg = new THREE.Mesh(legGeo, blackSteelMat);
        leg.position.set(...pos);
        group.add(leg);
      });

    } else if (type === 'scandinavian_chair' || type === 'nordic_chair') {
      // Nordic Modern Lounge Chair
      const seat = new THREE.Mesh(new THREE.BoxGeometry(45, 6, 45), leatherMat);
      seat.position.set(0, 38, 0);
      const back = new THREE.Mesh(new THREE.BoxGeometry(45, 40, 5), leatherMat);
      back.rotation.x = -Math.PI / 16;
      back.position.set(0, 60, -20);
      group.add(seat, back);

      for (let x of [-18, 18]) {
        for (let z of [-18, 18]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(2, 1.4, 38, 12), woodMat);
          leg.position.set(x, 19, z);
          leg.rotation.z = (x < 0 ? 1 : -1) * 0.12;
          leg.rotation.x = (z < 0 ? -1 : 1) * 0.12;
          group.add(leg);
        }
      }

    } else if (type === 'arc_floor_lamp' || type === 'arc_lamp') {
      // Luxury Minimalist Arc Floor Lamp (190cm high)
      const marbleBase = new THREE.Mesh(new THREE.CylinderGeometry(18, 18, 4, 32), whiteMarbleMat);
      marbleBase.position.set(0, 2, 0);
      group.add(marbleBase);

      const arcMesh = new THREE.Mesh(new THREE.TorusGeometry(60, 2, 16, 32, Math.PI / 1.3), blackSteelMat);
      arcMesh.rotation.z = Math.PI / 4;
      arcMesh.position.set(30, 95, 0);
      group.add(arcMesh);

      const dome = new THREE.Mesh(new THREE.SphereGeometry(14, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), blackSteelMat);
      dome.rotation.x = Math.PI;
      dome.position.set(70, 120, 0);
      group.add(dome);

    } else if (type === 'eames_lounge' || type === 'furniture_eames_lounge') {
      // ---------------------------------------------------------------------
      // MID-CENTURY EAMES LOUNGE CHAIR & OTTOMAN
      // ---------------------------------------------------------------------
      const rosewoodMat = createMat('#451a03', 0.3, 0.1);
      const blackLeather = createMat('#18181b', 0.5, 0.1);
      const polishedAlu = createMat('#e2e8f0', 0.1, 0.95);

      // Molded Rosewood Seat Shell & Cushions
      const seatShell = new THREE.Mesh(new THREE.BoxGeometry(50, 4, 46), rosewoodMat);
      seatShell.position.set(0, 36, 0);
      seatShell.rotation.x = -Math.PI / 18;
      const seatCushion = new THREE.Mesh(new THREE.BoxGeometry(46, 6, 42), blackLeather);
      seatCushion.position.set(0, 40, 0);
      seatCushion.rotation.x = -Math.PI / 18;
      group.add(seatShell, seatCushion);

      // Backrest Shell & Cushions
      const backShell = new THREE.Mesh(new THREE.BoxGeometry(46, 42, 4), rosewoodMat);
      backShell.rotation.x = -Math.PI / 8;
      backShell.position.set(0, 62, -18);
      const backCushion = new THREE.Mesh(new THREE.BoxGeometry(42, 38, 6), blackLeather);
      backCushion.rotation.x = -Math.PI / 8;
      backCushion.position.set(0, 62, -16);
      group.add(backShell, backCushion);

      // Padded Armrests
      for (let ax of [-24, 24]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(5, 4, 28), blackLeather);
        arm.position.set(ax, 50, -4);
        group.add(arm);
      }

      // 5-Star Die-Cast Aluminum Swivel Base
      const baseStem = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 26, 16), polishedAlu);
      baseStem.position.set(0, 15, 0);
      group.add(baseStem);

      for (let star = 0; star < 5; star++) {
        const sang = (star * Math.PI * 2) / 5;
        const starLeg = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 22), polishedAlu);
        starLeg.rotation.y = sang;
        starLeg.position.set(Math.sin(sang) * 11, 3, Math.cos(sang) * 11);
        group.add(starLeg);
      }

    } else if (type === 'geometric_bookshelf' || type === 'bookshelf') {
      // ---------------------------------------------------------------------
      // ARCHITECTURAL GEOMETRIC ASYMMETRIC BOOKSHELF
      // ---------------------------------------------------------------------
      const oakMat = createMat('#a16207', 0.5, 0.1);
      const bW = 80, bH = 140, bD = 28;

      // Outer Frame
      const fBottom = new THREE.Mesh(new THREE.BoxGeometry(bW, 4, bD), oakMat);
      fBottom.position.set(0, 2, 0);
      const fTop = new THREE.Mesh(new THREE.BoxGeometry(bW, 4, bD), oakMat);
      fTop.position.set(0, bH, 0);
      const fLeft = new THREE.Mesh(new THREE.BoxGeometry(4, bH, bD), oakMat);
      fLeft.position.set(-bW / 2 + 2, bH / 2, 0);
      const fRight = new THREE.Mesh(new THREE.BoxGeometry(4, bH, bD), oakMat);
      fRight.position.set(bW / 2 - 2, bH / 2, 0);
      group.add(fBottom, fTop, fLeft, fRight);

      // Horizontal Shelf Tiers
      for (let ty of [36, 72, 106]) {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(bW - 8, 3.5, bD), oakMat);
        shelf.position.set(0, ty, 0);
        group.add(shelf);
      }

      // Asymmetric Vertical Dividers
      const div1 = new THREE.Mesh(new THREE.BoxGeometry(3.5, 34, bD), oakMat);
      div1.position.set(-14, 19, 0);
      const div2 = new THREE.Mesh(new THREE.BoxGeometry(3.5, 34, bD), oakMat);
      div2.position.set(16, 54, 0);
      const div3 = new THREE.Mesh(new THREE.BoxGeometry(3.5, 34, bD), oakMat);
      div3.position.set(-10, 89, 0);
      group.add(div1, div2, div3);

      // Decor Accents: Ceramic Vases & Book Stacks
      const vase1 = new THREE.Mesh(new THREE.CylinderGeometry(4, 6, 18, 16), createMat('#06b6d4', 0.2, 0.1));
      vase1.position.set(22, 47, 0);
      const bookStack = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 18), createMat('#ef4444', 0.6, 0.1));
      bookStack.position.set(-26, 42, 0);
      group.add(vase1, bookStack);
    }

    return group;
  }

  // =========================================================================
  // PUBLIC API
  // =========================================================================
  return {
    createARPortal,
    createARPlanetarium,
    createARExplodedMechanism,
    setExplosionFactor,
    createARMuseumPiece,
    createARLiveAquarium,
    createARModernFurniture,

    generateStandaloneARHtml(modelName, glbBase64) {
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PolyMorph AR - ${modelName}</title>
  <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"></script>
  <style>
    body { margin: 0; padding: 0; background: #0b0f19; font-family: sans-serif; display: flex; flex-direction: column; height: 100vh; }
    model-viewer { width: 100%; height: 100%; flex: 1; --poster-color: transparent; }
    .ar-bar { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); display: flex; gap: 10px; }
    .ar-btn { background: #00f0ff; color: #000; border: none; padding: 14px 28px; font-size: 16px; font-weight: bold; border-radius: 30px; cursor: pointer; box-shadow: 0 4px 20px rgba(0,240,255,0.4); }
  </style>
</head>
<body>
  <model-viewer src="${glbBase64 || 'model.glb'}" ar ar-modes="webxr scene-viewer quick-look" camera-controls touch-action="pan-y" auto-rotate shadow-intensity="1">
    <div class="ar-bar" slot="ar-button">
      <button class="ar-btn">📱 VIEW IN YOUR ROOM (AR)</button>
    </div>
  </model-viewer>
</body>
</html>`;
    }
  };
})();

// Attach to window
if (typeof window !== 'undefined') {
  window.AREngine = AREngine;
}
