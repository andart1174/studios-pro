/**
 * PolyMorph 3D Studio - Haute Horlogerie & Watchmaker CAD Studio Engine (Tab: ⏱️ Watch & Horology)
 * Generates authentic Swiss Haute Horlogerie timepieces and mechanical movements:
 * 1. 👑 Complete Luxury Timepiece (Case + Calibre + Dial + Hands + Sapphire + Bracelet)
 * 2. ⚙️ Real Movements: Swiss Lever Escapement, Flying Tourbillon (360° cage), Skeleton Calibre, Automatic Rotor
 * 3. ⏱️ Bespoke Dials: 3D Guilloché (Clous de Paris, Sunburst, Tapisserie, Flinqué), Applied Numerals, Sub-dials, Open-Heart
 * 4. 🛡️ Watch Cases & Hands: Oyster, Cushion, Octagonal (Royal Oak), Tonneau, Fluted/Diver Bezels, Dauphine/Breguet Hands
 * 5. ⛓️ Articulated Bracelets: Oyster 3-Link, Jubilee 5-Link, President, Milanese Mesh, Stitched Alligator Leather
 * Supports Live Ticking Physics Simulation, Exploded Watchmaker View, Print-Bed Layout, and Full Watchmaker Kit Exports.
 */
(function () {
  'use strict';

  var currentHorologyMesh = null;
  var tickingAnimId = null;
  var isTicking = false;
  var tickAngle = 0;
  var lastTickTime = 0;

  function el(id) { return document.getElementById(id); }
  function showMsg(msg, type) {
    if (typeof showToast === 'function') showToast(msg, type || 'info');
    else console.log('[Horology]', msg);
  }
  function setLoading(on, txt) {
    var ov = el('loading-overlay'), lb = el('loading-text');
    if (!ov) return;
    if (on) {
      if (lb) lb.textContent = txt || 'Calculating Haute Horlogerie Geometry...';
      ov.classList.add('visible');
    } else {
      ov.classList.remove('visible');
    }
  }

  function pushModel(mesh, name) {
    currentHorologyMesh = mesh;
    if (typeof window.__polymorphSetModel === 'function') {
      window.__polymorphSetModel(mesh, name);
      return;
    }
    document.dispatchEvent(new CustomEvent('horology3dReady', { detail: { mesh: mesh, name: name } }));
  }

  function wireSlider(sid, vid) {
    var s = el(sid), v = el(vid);
    if (!s || !v) return;
    function upd() {
      var step = parseFloat(s.step || 1);
      var decimals = step < 1 ? 1 : 0;
      v.textContent = parseFloat(s.value).toFixed(decimals) + (s.dataset.unit || '');
    }
    s.addEventListener('input', function () {
      upd();
      generateHorology();
    });
    upd();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. LUXURY HOROLOGICAL PBR MATERIALS & FINISHES
  // ─────────────────────────────────────────────────────────────────────────────
  function createHorologyMaterials(finish, dialColor, hasJewels) {
    var T = window.THREE;
    var f = finish || 'rhodium';
    var dc = dialColor || 'blue';

    // Metal finishes for mainplates, bridges, and case
    var plateCol = 0xe2e8f0, plateRough = 0.22, plateMetal = 0.95;
    if (f === 'rosegold') { plateCol = 0xf43f5e; plateRough = 0.18; plateMetal = 0.9; }
    else if (f === 'bluesteel') { plateCol = 0x1d4ed8; plateRough = 0.15; plateMetal = 0.95; }
    else if (f === 'anthracite') { plateCol = 0x334155; plateRough = 0.28; plateMetal = 0.88; }
    else if (f === 'twotone') { plateCol = 0xf1f5f9; plateRough = 0.2; plateMetal = 0.95; }

    var plateMat = new T.MeshStandardMaterial({
      color: plateCol,
      roughness: plateRough,
      metalness: plateMetal,
      side: T.DoubleSide
    });

    var goldMat = new T.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.18,
      metalness: 0.92,
      side: T.DoubleSide
    });

    var brassMat = new T.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.2,
      metalness: 0.92,
      side: T.DoubleSide
    });

    var steelMat = new T.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.12,
      metalness: 0.98,
      side: T.DoubleSide
    });

    var polishedSteelMat = new T.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.08,
      metalness: 0.99,
      side: T.DoubleSide
    });

    var blueScrewMat = new T.MeshStandardMaterial({
      color: 0x1e40af,
      roughness: 0.15,
      metalness: 0.92,
      side: T.DoubleSide
    });

    var rubyMat = new T.MeshStandardMaterial({
      color: 0xe11d48,
      roughness: 0.05,
      metalness: 0.1,
      transparent: true,
      opacity: 0.88
    });

    var lumeMat = new T.MeshStandardMaterial({
      color: 0xdcfce7,
      emissive: 0x22c55e,
      emissiveIntensity: 0.45,
      roughness: 0.35,
      metalness: 0.1
    });

    var sapphireMat = new T.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.02,
      metalness: 0.05,
      transparent: true,
      opacity: 0.28,
      side: T.DoubleSide
    });

    // Dial Colors
    var dCol = 0x1e3a8a, dRough = 0.25, dMetal = 0.85;
    if (dc === 'black') { dCol = 0x090d16; dRough = 0.35; dMetal = 0.4; }
    else if (dc === 'green') { dCol = 0x064e3b; dRough = 0.22; dMetal = 0.85; }
    else if (dc === 'silver') { dCol = 0xe2e8f0; dRough = 0.28; dMetal = 0.9; }
    else if (dc === 'champagne') { dCol = 0xfef08a; dRough = 0.22; dMetal = 0.88; }

    var dialMat = new T.MeshStandardMaterial({
      color: dCol,
      roughness: dRough,
      metalness: dMetal,
      side: T.DoubleSide
    });

    var leatherMat = new T.MeshStandardMaterial({
      color: 0x3d1a04,
      roughness: 0.72,
      metalness: 0.05,
      side: T.DoubleSide
    });

    var stitchMat = new T.MeshStandardMaterial({
      color: 0xfef3c7,
      roughness: 0.6,
      metalness: 0.1
    });

    var velvetMat = new T.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.94,
      metalness: 0.04,
      side: T.DoubleSide
    });

    var pedestalMat = new T.MeshStandardMaterial({
      color: 0x181e29,
      roughness: 0.18,
      metalness: 0.85,
      side: T.DoubleSide
    });

    var moonEnamelMat = new T.MeshStandardMaterial({
      color: 0x08152e,
      roughness: 0.15,
      metalness: 0.6,
      side: T.DoubleSide
    });

    return {
      plate: plateMat,
      gold: goldMat,
      brass: brassMat,
      steel: steelMat,
      polishedSteel: polishedSteelMat,
      blueScrew: blueScrewMat,
      ruby: rubyMat,
      lume: lumeMat,
      sapphire: sapphireMat,
      dial: dialMat,
      leather: leatherMat,
      stitch: stitchMat,
      velvet: velvetMat,
      pedestal: pedestalMat,
      moonEnamel: moonEnamelMat
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. PROCEDURAL INVOLUTE & CYCLOIDAL WATCH GEAR GENERATOR
  // ─────────────────────────────────────────────────────────────────────────────
  function buildWatchGear(T, opts) {
    var teeth = opts.teeth || 36;
    var radius = opts.radius || 15;
    var thickness = opts.thickness || 1.2;
    var spokeCount = opts.spokes || 5;
    var mat = opts.material;
    var hasPinion = opts.hasPinion !== false;
    var pinionTeeth = opts.pinionTeeth || 8;
    var pinionR = opts.pinionRadius || (radius * 0.22);
    var pinionH = opts.pinionHeight || (thickness * 2.5);

    var shape = new T.Shape();
    var addendum = radius * 0.12;
    var dedendum = radius * 0.12;
    var rOut = radius + addendum;
    var rIn = radius - dedendum;

    var numPoints = teeth * 4;
    for (var i = 0; i < numPoints; i++) {
      var angle = (i / numPoints) * Math.PI * 2;
      var step = i % 4;
      var curR = (step === 1 || step === 2) ? rOut : rIn;
      var px = Math.cos(angle) * curR;
      var py = Math.sin(angle) * curR;
      if (i === 0) shape.moveTo(px, py);
      else shape.lineTo(px, py);
    }
    shape.closePath();

    // Spoke Crossings (Weight-reducing hollowed openings)
    if (spokeCount > 0 && radius > 8) {
      var hubR = radius * 0.28;
      var rimInR = radius * 0.72;
      var segAng = (Math.PI * 2) / spokeCount;
      var spokeHalf = 0.14;

      for (var s = 0; s < spokeCount; s++) {
        var a1 = s * segAng + spokeHalf;
        var a2 = (s + 1) * segAng - spokeHalf;
        var hole = new T.Path();

        hole.moveTo(Math.cos(a1) * hubR, Math.sin(a1) * hubR);
        hole.lineTo(Math.cos(a1) * rimInR, Math.sin(a1) * rimInR);
        hole.absarc(0, 0, rimInR, a1, a2, false);
        hole.lineTo(Math.cos(a2) * hubR, Math.sin(a2) * hubR);
        hole.absarc(0, 0, hubR, a2, a1, true);
        shape.holes.push(hole);
      }
    }

    // Center Arbor Hole
    var arborPath = new T.Path();
    arborPath.absarc(0, 0, Math.max(0.8, radius * 0.08), 0, Math.PI * 2, true);
    shape.holes.push(arborPath);

    var geo = new T.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: true,
      bevelSize: 0.15,
      bevelThickness: 0.15,
      curveSegments: 16
    });
    var mesh = new T.Mesh(geo, mat);

    // Central Pinion Arbor
    if (hasPinion) {
      var pinGeo = new T.CylinderGeometry(pinionR, pinionR, pinionH, pinionTeeth * 2);
      var pinMesh = new T.Mesh(pinGeo, opts.pinionMaterial || mat);
      pinMesh.rotation.x = Math.PI / 2;
      pinMesh.position.z = thickness / 2;
      mesh.add(pinMesh);

      // Steel pivot arbor needle
      var pivotGeo = new T.CylinderGeometry(pinionR * 0.35, pinionR * 0.35, pinionH * 1.8, 12);
      var pivotMesh = new T.Mesh(pivotGeo, opts.pinionMaterial || mat);
      pivotMesh.rotation.x = Math.PI / 2;
      pivotMesh.position.z = thickness / 2;
      mesh.add(pivotMesh);
    }

    return mesh;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. AUTHENTIC SWISS LEVER 15-TOOTH CLUB ESCAPE WHEEL
  // ─────────────────────────────────────────────────────────────────────────────
  function buildSwissEscapeWheel(T, radius, thickness, steelMat) {
    var teeth = 15;
    var shape = new T.Shape();
    var rBase = radius * 0.72;
    var rImpulse = radius;
    var rTip = radius * 1.05;

    var totalPoints = [];
    for (var i = 0; i < teeth; i++) {
      var baseAng = (i / teeth) * Math.PI * 2;
      var dAng = (Math.PI * 2) / teeth;

      // 1. Root dedendum
      var a0 = baseAng;
      totalPoints.push(new T.Vector2(Math.cos(a0) * rBase, Math.sin(a0) * rBase));

      // 2. Undercut locking stalk
      var a1 = baseAng + dAng * 0.35;
      totalPoints.push(new T.Vector2(Math.cos(a1) * (rBase * 1.15), Math.sin(a1) * (rBase * 1.15)));

      // 3. Locking Face (Rest plane)
      var a2 = baseAng + dAng * 0.48;
      totalPoints.push(new T.Vector2(Math.cos(a2) * rImpulse, Math.sin(a2) * rImpulse));

      // 4. Club Tooth Impulse Face (Slanted lift angle)
      var a3 = baseAng + dAng * 0.65;
      totalPoints.push(new T.Vector2(Math.cos(a3) * rTip, Math.sin(a3) * rTip));

      // 5. Club Heel Release
      var a4 = baseAng + dAng * 0.72;
      totalPoints.push(new T.Vector2(Math.cos(a4) * (rImpulse * 0.95), Math.sin(a4) * (rImpulse * 0.95)));
    }

    shape.setFromPoints(totalPoints);
    shape.closePath();

    // 4 Curved Lightened Crossings
    var spokes = 4;
    var hubR = radius * 0.22;
    var rimInR = radius * 0.62;
    var segAng = (Math.PI * 2) / spokes;
    for (var s = 0; s < spokes; s++) {
      var a1 = s * segAng + 0.2;
      var a2 = (s + 1) * segAng - 0.2;
      var hole = new T.Path();
      hole.moveTo(Math.cos(a1) * hubR, Math.sin(a1) * hubR);
      hole.lineTo(Math.cos(a1) * rimInR, Math.sin(a1) * rimInR);
      hole.absarc(0, 0, rimInR, a1, a2, false);
      hole.lineTo(Math.cos(a2) * hubR, Math.sin(a2) * hubR);
      hole.absarc(0, 0, hubR, a2, a1, true);
      shape.holes.push(hole);
    }

    var geo = new T.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: true,
      bevelSize: 0.1,
      bevelThickness: 0.1,
      curveSegments: 16
    });
    var mesh = new T.Mesh(geo, steelMat);

    // Escape pinion (6-leaf steel pinion)
    var pinGeo = new T.CylinderGeometry(radius * 0.18, radius * 0.18, thickness * 3, 12);
    var pinMesh = new T.Mesh(pinGeo, steelMat);
    pinMesh.rotation.x = Math.PI / 2;
    pinMesh.position.z = thickness / 2;
    mesh.add(pinMesh);

    return mesh;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. AUTHENTIC SWISS LEVER PALLET FORK WITH RUBY PALLETS & SAFETY DART
  // ─────────────────────────────────────────────────────────────────────────────
  function buildSwissPalletFork(T, length, thickness, steelMat, rubyMat) {
    var grp = new T.Group();
    grp.name = 'Swiss_Pallet_Fork_Assembly';

    var forkShape = new T.Shape();
    var hw = length * 0.08;
    var L = length;

    // Body & Pivot Boss
    forkShape.moveTo(-hw, 0);
    forkShape.lineTo(hw, 0);

    // Left Entry Pallet Arm
    forkShape.lineTo(L * 0.32, L * 0.45);
    forkShape.lineTo(L * 0.45, L * 0.52);
    forkShape.lineTo(L * 0.38, L * 0.62);
    forkShape.lineTo(L * 0.22, L * 0.48);

    // Fork Lever Neck
    forkShape.lineTo(hw * 0.6, L * 0.7);

    // Fork Horns
    forkShape.lineTo(L * 0.18, L * 0.98);
    forkShape.lineTo(L * 0.08, L * 1.05);
    forkShape.lineTo(0, L * 0.88); // Fork notch
    forkShape.lineTo(-L * 0.08, L * 1.05);
    forkShape.lineTo(-L * 0.18, L * 0.98);

    // Right Exit Pallet Arm
    forkShape.lineTo(-hw * 0.6, L * 0.7);
    forkShape.lineTo(-L * 0.22, L * 0.48);
    forkShape.lineTo(-L * 0.38, L * 0.62);
    forkShape.lineTo(-L * 0.45, L * 0.52);
    forkShape.lineTo(-L * 0.32, L * 0.45);
    forkShape.closePath();

    // Center pivot hole
    var pivotHole = new T.Path();
    pivotHole.absarc(0, 0, length * 0.06, 0, Math.PI * 2, true);
    forkShape.holes.push(pivotHole);

    var forkGeo = new T.ExtrudeGeometry(forkShape, {
      depth: thickness,
      bevelEnabled: true,
      bevelSize: 0.12,
      bevelThickness: 0.12
    });
    var forkMesh = new T.Mesh(forkGeo, steelMat);
    grp.add(forkMesh);

    // Synthetic Ruby Pallet Stones (Entry and Exit, angled at authentic 12° impulse)
    var rubyGeo = new T.BoxGeometry(length * 0.14, length * 0.08, thickness * 1.3);
    var entryRuby = new T.Mesh(rubyGeo, rubyMat);
    entryRuby.position.set(L * 0.34, L * 0.54, thickness / 2);
    entryRuby.rotation.z = -0.22;
    grp.add(entryRuby);

    var exitRuby = new T.Mesh(rubyGeo, rubyMat);
    exitRuby.position.set(-L * 0.34, L * 0.54, thickness / 2);
    exitRuby.rotation.z = 0.22;
    grp.add(exitRuby);

    // Safety Dart (Guard pin)
    var dartGeo = new T.CylinderGeometry(length * 0.025, length * 0.025, length * 0.25, 8);
    var dartMesh = new T.Mesh(dartGeo, steelMat);
    dartMesh.position.set(0, L * 0.95, thickness / 2);
    grp.add(dartMesh);

    // Pivot Arbor
    var arborGeo = new T.CylinderGeometry(length * 0.04, length * 0.04, thickness * 3.5, 12);
    var arborMesh = new T.Mesh(arborGeo, steelMat);
    arborMesh.rotation.x = Math.PI / 2;
    arborMesh.position.z = thickness / 2;
    grp.add(arborMesh);

    return grp;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. GLUCYDUR BALANCE WHEEL, ARCHIMEDEAN HAIRSPRING & INCABLOC SHOCK COCK
  // ─────────────────────────────────────────────────────────────────────────────
  function buildBalanceAssembly(T, radius, thickness, mats) {
    var grp = new T.Group();
    grp.name = 'Balance_Hairspring_Assembly';

    // 1. Glucydur Balance Rim (Torus ring with heavy inertia)
    var rimGeo = new T.TorusGeometry(radius, thickness * 0.65, 12, 48);
    var rimMesh = new T.Mesh(rimGeo, mats.gold);
    grp.add(rimMesh);

    // 3 Aerodynamic Spoke Arms
    for (var a = 0; a < 3; a++) {
      var armAng = (a * Math.PI * 2) / 3;
      var armGeo = new T.BoxGeometry(radius * 0.95, thickness * 0.45, thickness * 0.7);
      var armMesh = new T.Mesh(armGeo, mats.gold);
      armMesh.position.set(Math.cos(armAng) * (radius * 0.48), Math.sin(armAng) * (radius * 0.48), 0);
      armMesh.rotation.z = armAng;
      grp.add(armMesh);
    }

    // 16 Gold Timing Screws around Rim Perimeter
    var numScrews = 16;
    for (var s = 0; s < numScrews; s++) {
      var sAng = (s * Math.PI * 2) / numScrews;
      var scGeo = new T.CylinderGeometry(radius * 0.045, radius * 0.045, radius * 0.12, 8);
      var scMesh = new T.Mesh(scGeo, s % 4 === 0 ? mats.blueScrew : mats.gold);
      scMesh.rotation.z = sAng + Math.PI / 2;
      scMesh.position.set(Math.cos(sAng) * (radius * 1.08), Math.sin(sAng) * (radius * 1.08), 0);
      grp.add(scMesh);
    }

    // 2. Double Roller Table with Ruby Impulse Pin
    var rollerGeo = new T.CylinderGeometry(radius * 0.22, radius * 0.22, thickness * 0.9, 18);
    var rollerMesh = new T.Mesh(rollerGeo, mats.steel);
    rollerMesh.rotation.x = Math.PI / 2;
    rollerMesh.position.z = -thickness * 0.8;
    grp.add(rollerMesh);

    var impRubyGeo = new T.CylinderGeometry(radius * 0.035, radius * 0.035, thickness * 1.1, 8);
    var impRuby = new T.Mesh(impRubyGeo, mats.ruby);
    impRuby.rotation.x = Math.PI / 2;
    impRuby.position.set(radius * 0.14, 0, -thickness * 0.8);
    grp.add(impRuby);

    // 3. Multi-Turn Archimedean Spiral Hairspring (Spirale Breguet)
    var hsPoints = [];
    var coils = 5;
    var totalPts = 220;
    var rInner = radius * 0.14;
    var rOuter = radius * 0.65;

    for (var p = 0; p < totalPts; p++) {
      var t = (p / totalPts) * (Math.PI * 2 * coils);
      var curR = rInner + (t / (Math.PI * 2 * coils)) * (rOuter - rInner);
      hsPoints.push(new T.Vector3(Math.cos(t) * curR, Math.sin(t) * curR, 0));
    }
    var hsCurve = new T.CatmullRomCurve3(hsPoints);
    var hsGeo = new T.TubeGeometry(hsCurve, 160, radius * 0.018, 6, false);
    var hsMesh = new T.Mesh(hsGeo, mats.blueScrew);
    hsMesh.position.z = thickness * 0.7;
    grp.add(hsMesh);

    // Collet (Center clamp for hairspring)
    var colletGeo = new T.CylinderGeometry(radius * 0.14, radius * 0.14, thickness * 0.6, 16);
    var colletMesh = new T.Mesh(colletGeo, mats.steel);
    colletMesh.rotation.x = Math.PI / 2;
    colletMesh.position.z = thickness * 0.7;
    grp.add(colletMesh);

    return grp;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. FLYING TOURBILLON 360° REVOLVING CARRIAGE CAGE
  // ─────────────────────────────────────────────────────────────────────────────
  function buildFlyingTourbillonCarriage(T, cageR, p, mats) {
    var grp = new T.Group();
    grp.name = 'Flying_Tourbillon_Carriage_Assembly';

    // 1. Lower Carriage Base (3-Arm Open Titanium Frame)
    var baseShape = new T.Shape();
    var numArms = 3;
    var hubR = cageR * 0.22;
    var rimR = cageR;

    for (var a = 0; a < numArms; a++) {
      var aAng = (a * Math.PI * 2) / numArms;
      var aNext = ((a + 1) * Math.PI * 2) / numArms;
      var tipX = Math.cos(aAng) * rimR;
      var tipY = Math.sin(aAng) * rimR;

      if (a === 0) baseShape.moveTo(Math.cos(aAng - 0.2) * hubR, Math.sin(aAng - 0.2) * hubR);
      baseShape.quadraticCurveTo(Math.cos(aAng) * (rimR * 0.6), Math.sin(aAng) * (rimR * 0.6), tipX, tipY);
      baseShape.absarc(0, 0, rimR, aAng, aAng + 0.15, false);
      baseShape.quadraticCurveTo(Math.cos(aAng + 0.3) * (rimR * 0.6), Math.sin(aAng + 0.3) * (rimR * 0.6), Math.cos(aNext - 0.2) * hubR, Math.sin(aNext - 0.2) * hubR);
    }
    baseShape.closePath();

    var baseGeo = new T.ExtrudeGeometry(baseShape, { depth: 1.4, bevelEnabled: true, bevelSize: 0.2, bevelThickness: 0.2 });
    var baseMesh = new T.Mesh(baseGeo, mats.steel);
    grp.add(baseMesh);

    // 2. Carriage Support Pillars (Holding top bridge)
    for (var pl = 0; pl < 3; pl++) {
      var plAng = (pl * Math.PI * 2) / 3;
      var pillar = new T.Mesh(new T.CylinderGeometry(1.2, 1.2, 9.5, 12), mats.polishedSteel);
      pillar.rotation.x = Math.PI / 2;
      pillar.position.set(Math.cos(plAng) * (cageR * 0.88), Math.sin(plAng) * (cageR * 0.88), 5.5);
      grp.add(pillar);
    }

    // 3. Escape Wheel and Pinion mounted inside cage
    var escWheel = buildSwissEscapeWheel(T, cageR * 0.36, 0.9, mats.steel);
    escWheel.position.set(cageR * 0.38, cageR * 0.15, 3.2);
    grp.add(escWheel);
    grp.userData.escapeWheel = escWheel;

    // 4. Pallet Fork mounted inside cage
    var palletFork = buildSwissPalletFork(T, cageR * 0.34, 0.9, mats.steel, mats.ruby);
    palletFork.position.set(cageR * 0.12, cageR * 0.42, 4.2);
    grp.add(palletFork);
    grp.userData.palletFork = palletFork;

    // 5. Concentric Glucydur Balance Wheel inside cage
    var balanceWheel = buildBalanceAssembly(T, cageR * 0.72, 1.2, mats);
    balanceWheel.position.set(0, 0, 7.2);
    grp.add(balanceWheel);
    grp.userData.balanceWheel = balanceWheel;

    // 6. Upper Tourbillon Cage Bridge (Gracefully beveled curved bar)
    var topBridgeShape = new T.Shape();
    topBridgeShape.moveTo(-cageR * 0.92, -2.2);
    topBridgeShape.lineTo(cageR * 0.92, -2.2);
    topBridgeShape.lineTo(cageR * 0.92, 2.2);
    topBridgeShape.lineTo(-cageR * 0.92, 2.2);
    topBridgeShape.closePath();

    var topBridgeGeo = new T.ExtrudeGeometry(topBridgeShape, { depth: 1.4, bevelEnabled: true, bevelSize: 0.3, bevelThickness: 0.3 });
    var topBridgeMesh = new T.Mesh(topBridgeGeo, mats.steel);
    topBridgeMesh.position.z = 10.5;
    grp.add(topBridgeMesh);

    // Endstone Ruby Chaton at Top Bridge Center
    var chatonGeo = new T.CylinderGeometry(2.4, 2.4, 1.8, 16);
    var chatonMesh = new T.Mesh(chatonGeo, mats.gold);
    chatonMesh.rotation.x = Math.PI / 2;
    chatonMesh.position.set(0, 0, 11.2);
    grp.add(chatonMesh);

    var endRubyGeo = new T.CylinderGeometry(1.4, 1.4, 2.0, 16);
    var endRuby = new T.Mesh(endRubyGeo, mats.ruby);
    endRuby.rotation.x = Math.PI / 2;
    endRuby.position.set(0, 0, 11.3);
    grp.add(endRuby);

    return grp;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. SKELETON HAUTE HORLOGERIE CALIBRE & MAINPLATE
  // ─────────────────────────────────────────────────────────────────────────────
  function buildSkeletonCalibreMovement(T, radius, p, mats) {
    var grp = new T.Group();
    grp.name = 'Skeleton_Calibre_Movement';

    // 1. Skeletonized Filigree Mainplate
    var plateShape = new T.Shape();
    plateShape.absarc(0, 0, radius, 0, Math.PI * 2, false);

    // Organic Skeleton Windows (Haute Horlogerie openwork filigree)
    var windows = [
      { x: -radius * 0.4, y: radius * 0.38, r: radius * 0.28 }, // Barrel aperture
      { x: radius * 0.35, y: radius * 0.35, r: radius * 0.26 },  // Third wheel
      { x: 0, y: -radius * 0.42, r: radius * 0.36 },             // Escapement / Tourbillon well
      { x: -radius * 0.38, y: -radius * 0.25, r: radius * 0.22 } // Keyless winding works
    ];

    windows.forEach(function (w) {
      var wPath = new T.Path();
      wPath.absarc(w.x, w.y, w.r, 0, Math.PI * 2, true);
      plateShape.holes.push(wPath);
    });

    var plateGeo = new T.ExtrudeGeometry(plateShape, {
      depth: 3.5,
      bevelEnabled: true,
      bevelSize: 0.6,
      bevelThickness: 0.6,
      curveSegments: 32
    });
    var plateMesh = new T.Mesh(plateGeo, mats.plate);
    grp.add(plateMesh);

    // 2. Mainspring Barrel & Sunburst Winding Ratchet Wheel
    var barrelGrp = new T.Group();
    barrelGrp.position.set(-radius * 0.4, radius * 0.38, 4.5);

    var barrelDrum = new T.Mesh(new T.CylinderGeometry(radius * 0.32, radius * 0.32, 3.2, 48), mats.brass);
    barrelDrum.rotation.x = Math.PI / 2;
    barrelGrp.add(barrelDrum);

    // Sunburst Winding Ratchet Wheel with spiral teeth
    var ratchetWheel = buildWatchGear(T, {
      teeth: 32,
      radius: radius * 0.34,
      thickness: 1.2,
      spokes: 0,
      material: mats.steel,
      hasPinion: false
    });
    ratchetWheel.position.z = 2.2;
    barrelGrp.add(ratchetWheel);

    // Click and Click Spring (Anti-reverse ratchet)
    var clickShape = new T.Shape();
    clickShape.moveTo(0, 0);
    clickShape.lineTo(radius * 0.12, radius * 0.08);
    clickShape.lineTo(radius * 0.15, radius * 0.02);
    clickShape.lineTo(radius * 0.06, -radius * 0.06);
    clickShape.closePath();
    var clickMesh = new T.Mesh(new T.ExtrudeGeometry(clickShape, { depth: 1.0, bevelEnabled: false }), mats.blueScrew);
    clickMesh.position.set(radius * 0.26, -radius * 0.08, 2.5);
    barrelGrp.add(clickMesh);

    grp.add(barrelGrp);

    // 3. Center Wheel (Drives minute hand)
    var centerWheel = buildWatchGear(T, {
      teeth: 48,
      radius: radius * 0.42,
      thickness: 1.4,
      spokes: 5,
      material: mats.brass,
      hasPinion: true,
      pinionTeeth: 10
    });
    centerWheel.position.set(0, 0, 8);
    grp.add(centerWheel);

    // 4. Third Wheel
    var thirdWheel = buildWatchGear(T, {
      teeth: 38,
      radius: radius * 0.3,
      thickness: 1.2,
      spokes: 5,
      material: mats.brass,
      hasPinion: true,
      pinionTeeth: 8
    });
    thirdWheel.position.set(radius * 0.35, radius * 0.32, 11);
    grp.add(thirdWheel);

    // 5. Fourth Wheel (Runs at 1 RPM for continuous seconds)
    var fourthWheel = buildWatchGear(T, {
      teeth: 32,
      radius: radius * 0.26,
      thickness: 1.2,
      spokes: 4,
      material: mats.brass,
      hasPinion: true,
      pinionTeeth: 8
    });
    fourthWheel.position.set(radius * 0.15, -radius * 0.12, 13.5);
    grp.add(fourthWheel);

    // 6. Swiss Lever Escapement Assembly
    var escWheel = buildSwissEscapeWheel(T, radius * 0.24, 1.2, mats.steel);
    escWheel.position.set(-radius * 0.08, -radius * 0.32, 16);
    grp.add(escWheel);
    grp.userData.escapeWheel = escWheel;

    var palletFork = buildSwissPalletFork(T, radius * 0.26, 1.2, mats.steel, mats.ruby);
    palletFork.position.set(radius * 0.08, -radius * 0.45, 18);
    grp.add(palletFork);
    grp.userData.palletFork = palletFork;

    // 7. Glucydur Balance Wheel with Archimedean Hairspring
    var balWheel = buildBalanceAssembly(T, radius * 0.38, 1.4, mats);
    balWheel.position.set(0, -radius * 0.42, 21);
    grp.add(balWheel);
    grp.userData.balanceWheel = balWheel;

    // 8. Balance Bridge (Cock) with Incabloc Shock Absorber
    var cockShape = new T.Shape();
    cockShape.moveTo(-radius * 0.35, 0);
    cockShape.lineTo(radius * 0.35, 0);
    cockShape.quadraticCurveTo(radius * 0.2, -radius * 0.45, 0, -radius * 0.45);
    cockShape.quadraticCurveTo(-radius * 0.2, -radius * 0.45, -radius * 0.35, 0);
    cockShape.closePath();

    var cockGeo = new T.ExtrudeGeometry(cockShape, { depth: 2.2, bevelEnabled: true, bevelSize: 0.5, bevelThickness: 0.5 });
    var cockMesh = new T.Mesh(cockGeo, mats.plate);
    cockMesh.position.set(0, -radius * 0.12, 24);
    grp.add(cockMesh);

    // Incabloc Lyre Spring & Ruby Cap Jewel on Cock
    var incaRuby = new T.Mesh(new T.CylinderGeometry(2.0, 2.0, 1.6, 16), mats.ruby);
    incaRuby.rotation.x = Math.PI / 2;
    incaRuby.position.set(0, -radius * 0.42, 25.5);
    grp.add(incaRuby);

    var incaSpring = new T.Mesh(new T.TorusGeometry(2.6, 0.4, 8, 24), mats.gold);
    incaSpring.position.set(0, -radius * 0.42, 26);
    grp.add(incaSpring);

    // Blued Steel Bridge Screws
    for (var sc of [-1, 1]) {
      var screw = new T.Mesh(new T.CylinderGeometry(1.8, 1.8, 1.5, 16), mats.blueScrew);
      screw.rotation.x = Math.PI / 2;
      screw.position.set(sc * (radius * 0.28), -radius * 0.12, 26.5);
      grp.add(screw);
    }

    return grp;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. AUTOMATIC ROTOR OSCILLATING WEIGHT ASSEMBLY
  // ─────────────────────────────────────────────────────────────────────────────
  function buildAutomaticRotorAssembly(T, radius, mats) {
    var grp = new T.Group();
    grp.name = 'Automatic_Winding_Rotor_Assembly';

    // Semi-Circular Heavy Oscillating Weight (Rotor)
    var rotorShape = new T.Shape();
    var rHub = radius * 0.25;
    var rOut = radius * 0.94;

    rotorShape.absarc(0, 0, rOut, 0, Math.PI, false);
    rotorShape.lineTo(-rHub, 0);
    rotorShape.absarc(0, 0, rHub, Math.PI, 0, true);
    rotorShape.lineTo(rOut, 0);
    rotorShape.closePath();

    // Lightened Skeleton Cutouts in Rotor
    for (var c = 0; c < 3; c++) {
      var cAng1 = (c * 0.3) + 0.35;
      var cAng2 = cAng1 + 0.22;
      var cutHole = new T.Path();
      cutHole.moveTo(Math.cos(cAng1) * (rHub * 1.4), Math.sin(cAng1) * (rHub * 1.4));
      cutHole.lineTo(Math.cos(cAng1) * (rOut * 0.72), Math.sin(cAng1) * (rOut * 0.72));
      cutHole.absarc(0, 0, rOut * 0.72, cAng1, cAng2, false);
      cutHole.lineTo(Math.cos(cAng2) * (rHub * 1.4), Math.sin(cAng2) * (rHub * 1.4));
      cutHole.absarc(0, 0, rHub * 1.4, cAng2, cAng1, true);
      rotorShape.holes.push(cutHole);
    }

    var rotorGeo = new T.ExtrudeGeometry(rotorShape, {
      depth: 2.2,
      bevelEnabled: true,
      bevelSize: 0.4,
      bevelThickness: 0.4
    });
    var rotorMesh = new T.Mesh(rotorGeo, mats.gold);
    grp.add(rotorMesh);

    // Heavy Tungsten Edge Segment (Extra winding torque)
    var rimShape = new T.Shape();
    rimShape.absarc(0, 0, rOut, 0.1, Math.PI - 0.1, false);
    rimShape.absarc(0, 0, rOut * 0.82, Math.PI - 0.1, 0.1, true);
    rimShape.closePath();

    var rimGeo = new T.ExtrudeGeometry(rimShape, { depth: 3.2, bevelEnabled: true, bevelSize: 0.3 });
    var rimMesh = new T.Mesh(rimGeo, mats.steel);
    rimMesh.position.z = -0.5;
    grp.add(rimMesh);

    // Central Ball Bearing Hub
    var hubGeo = new T.CylinderGeometry(rHub, rHub, 3.5, 24);
    var hubMesh = new T.Mesh(hubGeo, mats.steel);
    hubMesh.rotation.x = Math.PI / 2;
    hubMesh.position.z = 1.0;
    grp.add(hubMesh);

    // 7 Miniature Steel Ball Bearings
    for (var b = 0; b < 7; b++) {
      var bAng = (b * Math.PI * 2) / 7;
      var ball = new T.Mesh(new T.SphereGeometry(radius * 0.032, 12, 12), mats.polishedSteel);
      ball.position.set(Math.cos(bAng) * (rHub * 0.65), Math.sin(bAng) * (rHub * 0.65), 2.6);
      grp.add(ball);
    }

    return grp;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. BESPOKE WATCH DIAL & GUILLOCHÉ ENGINE
  // ─────────────────────────────────────────────────────────────────────────────
  function buildBespokeWatchDial(T, dialR, p, mats) {
    var grp = new T.Group();
    grp.name = 'Bespoke_Watch_Dial_Assembly';

    var guilloche = p.guilloche || 'clous_de_paris';
    var indexStyle = p.indexStyle || 'baton';
    var subdial = p.subdial || 'small_seconds';
    var comp = p.complication || 'none';
    var brandName = (p.brand || 'POLYMORPH GENÈVE').trim().toUpperCase();

    // 1. Dial Base Disc (SOLID by default to guarantee no bleeding from behind)
    var dialShape = new T.Shape();
    dialShape.absarc(0, 0, dialR, 0, Math.PI * 2, false);

    // Open-Heart Tourbillon / Balance Aperture ONLY when explicitly selected
    var hasOpenHeart = (comp === 'open_heart');
    if (hasOpenHeart) {
      var ohHole = new T.Path();
      ohHole.absarc(0, -dialR * 0.42, dialR * 0.30, 0, Math.PI * 2, true);
      dialShape.holes.push(ohHole);
    }

    // Framed Date Window at 3 o'clock
    if (comp === 'date_window') {
      var dwHole = new T.Path();
      var dwW = dialR * 0.16, dwH = dialR * 0.12;
      var dwX = dialR * 0.58, dwY = 0;
      dwHole.moveTo(dwX - dwW / 2, dwY - dwH / 2);
      dwHole.lineTo(dwX + dwW / 2, dwY - dwH / 2);
      dwHole.lineTo(dwX + dwW / 2, dwY + dwH / 2);
      dwHole.lineTo(dwX - dwW / 2, dwY + dwH / 2);
      dwHole.closePath();
      dialShape.holes.push(dwHole);
    }

    // Center Arbor Pinion Hole (tight 0.8mm clearance)
    var centerHole = new T.Path();
    centerHole.absarc(0, 0, dialR * 0.05, 0, Math.PI * 2, true);
    dialShape.holes.push(centerHole);

    var dialGeo = new T.ExtrudeGeometry(dialShape, {
      depth: 1.0,
      bevelEnabled: true,
      bevelSize: 0.15,
      bevelThickness: 0.15,
      curveSegments: 36
    });
    var dialMesh = new T.Mesh(dialGeo, mats.dial);
    grp.add(dialMesh);

    // 2. 3D Guilloché Engine-Turned Surface Relief
    if (guilloche === 'clous_de_paris') {
      // Clous de Paris: 3D Hobnail 4-Sided Pyramids
      var pySize = dialR * 0.055;
      var pyrGeo = new T.ConeGeometry(pySize * 0.65, pySize * 0.55, 4);
      pyrGeo.rotateY(Math.PI / 4);

      var pyrInst = new T.InstancedMesh(pyrGeo, mats.dial, 190);
      var dummy = new T.Object3D();
      var count = 0;

      for (var gx = -dialR * 0.70; gx <= dialR * 0.70; gx += pySize) {
        for (var gy = -dialR * 0.70; gy <= dialR * 0.70; gy += pySize) {
          var dist = Math.sqrt(gx * gx + gy * gy);
          if (dist > dialR * 0.18 && dist < dialR * 0.76) {
            if (hasOpenHeart && Math.sqrt(gx * gx + (gy + dialR * 0.42) * (gy + dialR * 0.42)) < dialR * 0.34) continue;
            if (subdial === 'moonphase' && Math.sqrt(gx * gx + (gy + dialR * 0.42) * (gy + dialR * 0.42)) < dialR * 0.28) continue;
            if (count < 190) {
              dummy.position.set(gx, gy, 1.15);
              dummy.rotation.set(Math.PI / 2, 0, 0);
              dummy.updateMatrix();
              pyrInst.setMatrixAt(count++, dummy.matrix);
            }
          }
        }
      }
      pyrInst.count = count;
      pyrInst.instanceMatrix.needsUpdate = true;
      grp.add(pyrInst);

    } else if (guilloche === 'sunburst') {
      // Sunburst: Radial Fluted Rays
      for (var r = 0; r < 48; r++) {
        var rayAng = (r * Math.PI * 2) / 48;
        var rayGeo = new T.BoxGeometry(dialR * 0.72, 0.32, 0.32);
        var rayMesh = new T.Mesh(rayGeo, mats.steel);
        rayMesh.position.set(Math.cos(rayAng) * (dialR * 0.40), Math.sin(rayAng) * (dialR * 0.40), 1.05);
        rayMesh.rotation.z = rayAng;
        grp.add(rayMesh);
      }
    } else if (guilloche === 'tapisserie') {
      // Grande Tapisserie (Waffle grid relief)
      var sqSize = dialR * 0.08;
      for (var tx = -dialR * 0.65; tx <= dialR * 0.65; tx += sqSize * 1.18) {
        for (var ty = -dialR * 0.65; ty <= dialR * 0.65; ty += sqSize * 1.18) {
          if (Math.sqrt(tx * tx + ty * ty) < dialR * 0.74) {
            if (hasOpenHeart && Math.sqrt(tx * tx + (ty + dialR * 0.42) * (ty + dialR * 0.42)) < dialR * 0.34) continue;
            var sq = new T.Mesh(new T.BoxGeometry(sqSize, sqSize, 0.35), mats.dial);
            sq.position.set(tx, ty, 1.1);
            grp.add(sq);
          }
        }
      }
    }

    // 3. Railway Minute Track (Chemin de fer) & Hour Markers
    var trackRing = new T.Mesh(new T.TorusGeometry(dialR * 0.88, 0.35, 6, 64), mats.steel);
    trackRing.position.z = 1.1;
    grp.add(trackRing);

    for (var m = 0; m < 60; m++) {
      var mAng = (m * Math.PI * 2) / 60;
      var isHour = m % 5 === 0;
      var pipLen = isHour ? dialR * 0.055 : dialR * 0.028;
      var pip = new T.Mesh(new T.BoxGeometry(pipLen, isHour ? 0.7 : 0.35, 0.35), isHour ? mats.gold : mats.steel);
      pip.position.set(Math.cos(mAng) * (dialR * 0.88), Math.sin(mAng) * (dialR * 0.88), 1.15);
      pip.rotation.z = mAng;
      grp.add(pip);
    }

    // 4. Custom Brand Typography Plaque at 12 o'clock
    var plaqueGrp = new T.Group();
    var bPlaque = new T.Mesh(new T.BoxGeometry(dialR * 0.55, dialR * 0.12, 0.4), mats.polishedSteel);
    bPlaque.position.set(0, dialR * 0.48, 1.15);
    plaqueGrp.add(bPlaque);

    // Decorative relief bar representing precision serif lettering
    var bTextBar = new T.Mesh(new T.BoxGeometry(dialR * 0.46, dialR * 0.035, 0.4), mats.gold);
    bTextBar.position.set(0, dialR * 0.48, 1.35);
    plaqueGrp.add(bTextBar);
    grp.add(plaqueGrp);

    // 5. Applied 3D Hour Markers & Indices
    var indexR = dialR * 0.75;
    for (var h = 1; h <= 12; h++) {
      if ((hasOpenHeart || subdial === 'moonphase') && (h === 5 || h === 6 || h === 7)) continue;
      if (comp === 'date_window' && h === 3) continue;
      if (h === 12 && indexStyle !== 'diver') {
        [-1, 1].forEach(function (off) {
          var b12 = new T.Mesh(new T.BoxGeometry(dialR * 0.12, dialR * 0.032, 0.8), mats.gold);
          b12.position.set(off * dialR * 0.04, indexR, 1.4);
          b12.rotation.z = Math.PI / 2;
          grp.add(b12);
        });
        continue;
      }

      var hAng = Math.PI / 2 - (h * Math.PI * 2) / 12;
      var hx = Math.cos(hAng) * indexR;
      var hy = Math.sin(hAng) * indexR;

      if (indexStyle === 'baton') {
        var baton = new T.Mesh(new T.BoxGeometry(dialR * 0.14, dialR * 0.042, 0.8), mats.gold);
        baton.position.set(hx, hy, 1.4);
        baton.rotation.z = hAng;
        grp.add(baton);

        var lumeInsert = new T.Mesh(new T.BoxGeometry(dialR * 0.10, dialR * 0.022, 0.3), mats.lume);
        lumeInsert.position.set(hx, hy, 1.82);
        lumeInsert.rotation.z = hAng;
        grp.add(lumeInsert);

      } else if (indexStyle === 'diver') {
        if (h === 12) {
          var triShape = new T.Shape();
          triShape.moveTo(-dialR * 0.05, 0);
          triShape.lineTo(dialR * 0.05, 0);
          triShape.lineTo(0, dialR * 0.11);
          triShape.closePath();
          var tri = new T.Mesh(new T.ExtrudeGeometry(triShape, { depth: 0.7 }), mats.lume);
          tri.position.set(hx, hy - dialR * 0.05, 1.35);
          grp.add(tri);
        } else {
          var dot = new T.Mesh(new T.CylinderGeometry(dialR * 0.038, dialR * 0.038, 0.7, 16), mats.lume);
          dot.rotation.x = Math.PI / 2;
          dot.position.set(hx, hy, 1.4);
          grp.add(dot);
        }

      } else {
        var numPlate = new T.Mesh(new T.BoxGeometry(dialR * 0.13, dialR * 0.045, 0.8), mats.gold);
        numPlate.position.set(hx, hy, 1.4);
        numPlate.rotation.z = hAng;
        grp.add(numPlate);
      }
    }

    // 6. Complications & Sub-Dials (Moonphase, Power Reserve, Date Window, Open-Heart)
    if (subdial === 'moonphase') {
      var mpAperture = new T.Group();
      mpAperture.position.set(0, -dialR * 0.42, 1.05);

      var mpDisc = new T.Mesh(new T.CylinderGeometry(dialR * 0.22, dialR * 0.22, 0.5, 32), mats.moonEnamel);
      mpDisc.rotation.x = Math.PI / 2;
      mpAperture.add(mpDisc);

      var moonMesh = new T.Mesh(new T.TorusGeometry(dialR * 0.07, dialR * 0.03, 10, 24, Math.PI * 1.4), mats.gold);
      moonMesh.position.set(0, dialR * 0.04, 0.35);
      mpAperture.add(moonMesh);

      for (var st = 0; st < 6; st++) {
        var sAng = (st * Math.PI * 2) / 6;
        var star = new T.Mesh(new T.SphereGeometry(dialR * 0.014, 8, 8), mats.gold);
        star.position.set(Math.cos(sAng) * (dialR * 0.14), Math.sin(sAng) * (dialR * 0.14), 0.35);
        mpAperture.add(star);
      }

      var mpRing = new T.Mesh(new T.TorusGeometry(dialR * 0.24, 0.6, 8, 36), mats.gold);
      mpRing.position.z = 0.4;
      mpAperture.add(mpRing);
      grp.add(mpAperture);

    } else if (subdial === 'power_reserve') {
      var prGrp = new T.Group();
      prGrp.position.set(-dialR * 0.50, 0, 1.15);

      var prTrack = new T.Mesh(new T.TorusGeometry(dialR * 0.20, 0.4, 6, 24, Math.PI * 0.7), mats.gold);
      prTrack.position.z = 0.1;
      prGrp.add(prTrack);

      var prHand = new T.Mesh(new T.BoxGeometry(dialR * 0.15, 0.45, 0.4), mats.blueScrew);
      prHand.position.set(dialR * 0.07, 0, 0.25);
      prHand.rotation.z = Math.PI * 0.22;
      prGrp.add(prHand);
      grp.add(prGrp);

    } else if (subdial === 'small_seconds' && !hasOpenHeart) {
      var ssGrp = new T.Group();
      ssGrp.position.set(0, -dialR * 0.42, 1.15);

      var ssRing = new T.Mesh(new T.TorusGeometry(dialR * 0.20, 0.45, 8, 36), mats.steel);
      ssRing.position.z = 0.1;
      ssGrp.add(ssRing);

      var ssHand = new T.Mesh(new T.BoxGeometry(dialR * 0.14, 0.35, 0.3), mats.blueScrew);
      ssHand.position.set(0, dialR * 0.06, 0.2);
      ssHand.rotation.z = Math.PI / 2;
      ssGrp.add(ssHand);
      grp.add(ssGrp);
    }

    if (hasOpenHeart) {
      var ohRing = new T.Mesh(new T.TorusGeometry(dialR * 0.30, 0.7, 8, 36), mats.polishedSteel);
      ohRing.position.set(0, -dialR * 0.42, 1.25);
      grp.add(ohRing);
    }

    if (comp === 'date_window') {
      var frameMesh = new T.Mesh(new T.BoxGeometry(dialR * 0.18, dialR * 0.14, 0.55), mats.gold);
      frameMesh.position.set(dialR * 0.58, 0, 1.25);
      grp.add(frameMesh);

      var datePlate = new T.Mesh(new T.BoxGeometry(dialR * 0.14, dialR * 0.10, 0.2), mats.plate);
      datePlate.position.set(dialR * 0.58, 0, 1.05);
      grp.add(datePlate);
    }

    return grp;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. LUXURY WATCH CASE, BEZEL, CROWN & HANDS
  // ─────────────────────────────────────────────────────────────────────────────
  function buildWatchCaseAndBezel(T, caseR, p, mats) {
    var grp = new T.Group();
    grp.name = 'Watch_Case_Bezel_Assembly';

    var shapeType = p.caseShape || 'oyster';
    var bezelType = p.bezel || 'fluted';

    // 1. Case Middle Body with Sculpted Lugs
    var caseShape = new T.Shape();
    var r = caseR;
    var lugLen = caseR * 1.35;
    var lugW = caseR * 0.42;

    if (shapeType === 'cushion') {
      var cr = caseR * 1.05;
      caseShape.moveTo(-cr * 0.7, -cr);
      caseShape.lineTo(cr * 0.7, -cr);
      caseShape.quadraticCurveTo(cr, -cr, cr, -cr * 0.7);
      caseShape.lineTo(cr, cr * 0.7);
      caseShape.quadraticCurveTo(cr, cr, cr * 0.7, cr);
      caseShape.lineTo(-cr * 0.7, cr);
      caseShape.quadraticCurveTo(-cr, cr, -cr, cr * 0.7);
      caseShape.lineTo(-cr, -cr * 0.7);
      caseShape.quadraticCurveTo(-cr, -cr, -cr * 0.7, -cr);
    } else if (shapeType === 'octagonal') {
      for (var oc = 0; oc < 8; oc++) {
        var ocAng = (oc * Math.PI * 2) / 8 + Math.PI / 8;
        var ox = Math.cos(ocAng) * (caseR * 1.12);
        var oy = Math.sin(ocAng) * (caseR * 1.12);
        if (oc === 0) caseShape.moveTo(ox, oy);
        else caseShape.lineTo(ox, oy);
      }
    } else {
      caseShape.absarc(0, 0, r * 1.05, 0, Math.PI * 2, false);
    }
    caseShape.closePath();

    // Central Calibre Chamber Hollow
    var chamber = new T.Path();
    chamber.absarc(0, 0, r * 0.88, 0, Math.PI * 2, true);
    caseShape.holes.push(chamber);

    var caseGeo = new T.ExtrudeGeometry(caseShape, {
      depth: 10.0,
      bevelEnabled: true,
      bevelSize: 0.7,
      bevelThickness: 0.7,
      curveSegments: 36
    });
    var caseMesh = new T.Mesh(caseGeo, mats.plate);
    caseMesh.position.z = -4.5;
    grp.add(caseMesh);

    // 4 Curved Ergonomic Lugs
    [-1, 1].forEach(function (lx) {
      [-1, 1].forEach(function (ly) {
        var lug = new T.Mesh(new T.BoxGeometry(caseR * 0.22, caseR * 0.44, 8.5), mats.plate);
        lug.position.set(lx * lugW, ly * (lugLen * 0.82), 0.5);
        lug.rotation.x = ly * 0.22;
        grp.add(lug);

        // Spring bar drilled hole
        var sbHole = new T.Mesh(new T.CylinderGeometry(0.9, 0.9, 3, 12), mats.steel);
        sbHole.rotation.z = Math.PI / 2;
        sbHole.position.set(lx * (lugW * 0.85), ly * (lugLen * 0.94), 0.2);
        grp.add(sbHole);
      });
    });

    // 2. Fluted / Smooth / Ceramic Diver Bezel
    var bezelR = caseR * 0.92;
    if (bezelType === 'fluted') {
      var flutedRing = new T.Mesh(new T.TorusGeometry(bezelR, 2.0, 4, 60), mats.gold);
      flutedRing.position.z = 6.2;
      grp.add(flutedRing);
    } else if (bezelType === 'diver') {
      var diverRing = new T.Mesh(new T.CylinderGeometry(bezelR * 1.04, bezelR * 1.04, 2.8, 64), mats.plate);
      diverRing.rotation.x = Math.PI / 2;
      diverRing.position.z = 6.2;
      grp.add(diverRing);

      var diverPip = new T.Mesh(new T.SphereGeometry(1.4, 12, 12), mats.lume);
      diverPip.position.set(0, bezelR * 1.02, 7.8);
      grp.add(diverPip);
    } else {
      var domeRing = new T.Mesh(new T.TorusGeometry(bezelR, 1.7, 16, 64), mats.polishedSteel);
      domeRing.position.z = 6.2;
      grp.add(domeRing);
    }

    // 3. Fluted Screw-Down Winding Crown at 3 o'clock
    var crown = new T.Mesh(new T.CylinderGeometry(caseR * 0.12, caseR * 0.12, caseR * 0.18, 24), mats.gold);
    crown.rotation.z = Math.PI / 2;
    crown.position.set(caseR * 1.20, 0, 1.0);
    grp.add(crown);

    // Crown Guard Horns
    [-1, 1].forEach(function (cgh) {
      var horn = new T.Mesh(new T.BoxGeometry(caseR * 0.12, caseR * 0.14, 5.0), mats.plate);
      horn.position.set(caseR * 1.08, cgh * (caseR * 0.16), 1.0);
      grp.add(horn);
    });

    // 4. Exhibition Sapphire Caseback on Back (-Z)
    var casebackRing = new T.Mesh(new T.TorusGeometry(caseR * 0.85, 2.2, 12, 48), mats.plate);
    casebackRing.position.z = -4.8;
    grp.add(casebackRing);

    // 6 Watchmaker Tool Notches around Caseback
    for (var n = 0; n < 6; n++) {
      var nAng = (n * Math.PI * 2) / 6;
      var notch = new T.Mesh(new T.BoxGeometry(2.2, 1.2, 0.8), mats.steel);
      notch.position.set(Math.cos(nAng) * (caseR * 0.88), Math.sin(nAng) * (caseR * 0.88), -5.5);
      notch.rotation.z = nAng;
      grp.add(notch);
    }

    // Exhibition Transparent Sapphire Glass at Back
    var casebackGlass = new T.Mesh(new T.CylinderGeometry(caseR * 0.80, caseR * 0.80, 0.8, 36), mats.sapphire);
    casebackGlass.rotation.x = Math.PI / 2;
    casebackGlass.position.z = -5.0;
    grp.add(casebackGlass);

    // 5. Front Scratch-Resistant Sapphire Crystal (+Z)
    var crystal = new T.Mesh(new T.CylinderGeometry(caseR * 0.86, caseR * 0.86, 1.0, 48), mats.sapphire);
    crystal.rotation.x = Math.PI / 2;
    crystal.position.z = 7.8;
    grp.add(crystal);

    return grp;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 11. LUXURY WATCH HANDS GENERATOR
  // ─────────────────────────────────────────────────────────────────────────────
  function buildWatchHands(T, radius, style, mats) {
    var grp = new T.Group();
    grp.name = 'Watch_Hands_Assembly';

    var hStyle = style || 'dauphine';
    var hourLen = radius * 0.52;
    var minLen = radius * 0.78;
    var secLen = radius * 0.85;

    var hourAng = (10 / 12) * Math.PI * 2 + (10 / 720) * Math.PI * 2;
    var minAng = (10 / 60) * Math.PI * 2;

    function createHandMesh(len, width, zPos, angle, isSec) {
      var hGrp = new T.Group();
      if (hStyle === 'breguet') {
        var stem = new T.Mesh(new T.BoxGeometry(width, len * 0.75, 0.35), mats.blueScrew);
        stem.position.y = len * 0.38;
        hGrp.add(stem);

        var moon = new T.Mesh(new T.TorusGeometry(width * 1.6, 0.4, 8, 24), mats.blueScrew);
        moon.position.y = len * 0.78;
        hGrp.add(moon);

        var tip = new T.Mesh(new T.ConeGeometry(width * 0.8, len * 0.20, 4), mats.blueScrew);
        tip.position.y = len * 0.95;
        hGrp.add(tip);

      } else if (hStyle === 'sword') {
        var swordShape = new T.Shape();
        swordShape.moveTo(-width * 0.4, 0);
        swordShape.lineTo(-width * 0.8, len * 0.7);
        swordShape.lineTo(0, len);
        swordShape.lineTo(width * 0.8, len * 0.7);
        swordShape.lineTo(width * 0.4, 0);
        swordShape.closePath();

        var sMesh = new T.Mesh(new T.ExtrudeGeometry(swordShape, { depth: 0.45, bevelEnabled: false }), mats.steel);
        hGrp.add(sMesh);

        var sLume = new T.Mesh(new T.BoxGeometry(width * 0.6, len * 0.55, 0.55), mats.lume);
        sLume.position.y = len * 0.45;
        hGrp.add(sLume);

      } else {
        var dauShape = new T.Shape();
        dauShape.moveTo(-width * 0.5, 0);
        dauShape.lineTo(-width, len * 0.35);
        dauShape.lineTo(0, len);
        dauShape.lineTo(width, len * 0.35);
        dauShape.lineTo(width * 0.5, 0);
        dauShape.closePath();

        var dMesh = new T.Mesh(new T.ExtrudeGeometry(dauShape, { depth: 0.5, bevelEnabled: true, bevelSize: 0.12 }), mats.gold);
        hGrp.add(dMesh);

        if (!isSec) {
          var dLume = new T.Mesh(new T.BoxGeometry(width * 0.5, len * 0.45, 0.6), mats.lume);
          dLume.position.y = len * 0.45;
          hGrp.add(dLume);
        }
      }

      hGrp.position.z = zPos;
      hGrp.rotation.z = -angle + Math.PI / 2;
      return hGrp;
    }

    var hourHand = createHandMesh(hourLen, radius * 0.05, 1.8, hourAng, false);
    var minHand = createHandMesh(minLen, radius * 0.04, 2.4, minAng, false);

    var secHand = new T.Group();
    var needle = new T.Mesh(new T.CylinderGeometry(radius * 0.008, radius * 0.014, secLen, 8), mats.ruby);
    needle.position.y = secLen / 2;
    secHand.add(needle);

    var counterWeight = new T.Mesh(new T.SphereGeometry(radius * 0.042, 12, 12), mats.ruby);
    counterWeight.position.y = -secLen * 0.22;
    secHand.add(counterWeight);

    secHand.position.z = 3.0;
    grp.userData.secHand = secHand;
    grp.add(hourHand);
    grp.add(minHand);
    grp.add(secHand);

    var cap = new T.Mesh(new T.CylinderGeometry(radius * 0.038, radius * 0.038, 1.0, 16), mats.gold);
    cap.rotation.x = Math.PI / 2;
    cap.position.z = 3.4;
    grp.add(cap);

    return grp;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 12. ARTICULATED WATCH BRACELETS, STRAPS & COLLECTOR STAND
  // ─────────────────────────────────────────────────────────────────────────────
  function buildWatchBraceletOrStrap(T, caseR, p, mats) {
    var grp = new T.Group();
    grp.name = 'Watch_Bracelet_Assembly';

    var strapType = p.strap || 'oyster';
    var claspType = p.clasp || 'deployant';
    var wristR = caseR * 1.45;
    var numRows = 14;

    [-1, 1].forEach(function (side) {
      var sideGrp = new T.Group();

      if (strapType === 'leather') {
        var sLen = caseR * 1.8;
        var sW1 = caseR * 0.48;

        var strapGeo = new T.BoxGeometry(sW1, sLen, 2.8);
        var strapMesh = new T.Mesh(strapGeo, mats.leather);
        strapMesh.position.set(0, side * (caseR * 1.08 + sLen / 2), 0);
        sideGrp.add(strapMesh);

        for (var st = -sLen * 0.45; st <= sLen * 0.45; st += 3.5) {
          [-sW1 * 0.42, sW1 * 0.42].forEach(function (sx) {
            var stitch = new T.Mesh(new T.BoxGeometry(0.7, 2.0, 0.4), mats.stitch);
            stitch.position.set(sx, side * (caseR * 1.08 + sLen / 2) + st, 1.6);
            sideGrp.add(stitch);
          });
        }

      } else {
        for (var r = 0; r < numRows; r++) {
          var t = (r / numRows) * (Math.PI * 0.48);
          var ly = side * (caseR * 1.08 + Math.sin(t) * wristR);
          var lz = -Math.cos(t) * wristR + wristR * 0.95;

          var linkRow = new T.Group();
          var linkW = caseR * 0.46;
          var linkThick = 2.6;

          if (strapType === 'jubilee') {
            var outerW = linkW * 0.22;
            var centerW = linkW * 0.16;
            [-linkW * 0.38, linkW * 0.38].forEach(function (ox) {
              var oLink = new T.Mesh(new T.BoxGeometry(outerW, 4.4, linkThick), mats.plate);
              oLink.position.x = ox;
              linkRow.add(oLink);
            });
            [-centerW, 0, centerW].forEach(function (cx) {
              var cBead = new T.Mesh(new T.CylinderGeometry(linkThick * 0.44, linkThick * 0.44, 4.2, 12), mats.polishedSteel);
              cBead.rotation.z = Math.PI / 2;
              cBead.position.x = cx;
              linkRow.add(cBead);
            });

          } else if (strapType === 'president') {
            var pLink = new T.Mesh(new T.CylinderGeometry(linkThick * 0.48, linkThick * 0.48, linkW, 16), mats.gold);
            pLink.rotation.z = Math.PI / 2;
            linkRow.add(pLink);

          } else if (strapType === 'milanese') {
            var meshBand = new T.Mesh(new T.BoxGeometry(linkW, 4.2, 1.6), mats.steel);
            linkRow.add(meshBand);

          } else {
            var oW = linkW * 0.28;
            var cW = linkW * 0.44;
            [-linkW * 0.36, linkW * 0.36].forEach(function (ox) {
              var outMesh = new T.Mesh(new T.BoxGeometry(oW, 6.0, linkThick), mats.plate);
              outMesh.position.x = ox;
              linkRow.add(outMesh);
            });
            var cenMesh = new T.Mesh(new T.BoxGeometry(cW, 6.0, linkThick * 1.05), mats.polishedSteel);
            linkRow.add(cenMesh);
          }

          linkRow.position.set(0, ly, lz);
          linkRow.rotation.x = -side * t * 0.85;
          sideGrp.add(linkRow);
        }
      }

      grp.add(sideGrp);
    });

    if (claspType === 'deployant') {
      var clasp = new T.Mesh(new T.BoxGeometry(caseR * 0.48, caseR * 0.44, 4.2), mats.polishedSteel);
      clasp.position.set(0, 0, -wristR * 0.95);
      grp.add(clasp);
    }

    return grp;
  }

  // 12b. HAUTE HORLOGERIE VELVET CUSHION & PEDESTAL STAND
  function buildCollectorCushionStand(T, caseR, mats) {
    var standGrp = new T.Group();
    standGrp.name = 'Collector_Watch_Cushion_Stand';

    var wristR = caseR * 1.45;
    var cushionW = caseR * 0.65;

    // 1. Velvet Watch Pillow / Cushion
    var cushionGeo = new T.CylinderGeometry(wristR * 0.88, wristR * 0.88, cushionW, 36);
    var cushion = new T.Mesh(cushionGeo, mats.velvet);
    cushion.rotation.z = Math.PI / 2;
    cushion.position.set(0, 0, -wristR * 0.45);
    standGrp.add(cushion);

    [-cushionW / 2, cushionW / 2].forEach(function (cx) {
      var endCap = new T.Mesh(new T.SphereGeometry(wristR * 0.88, 24, 16), mats.velvet);
      endCap.scale.set(0.25, 1, 1);
      endCap.position.set(cx, 0, -wristR * 0.45);
      standGrp.add(endCap);
    });

    // 2. Angled Brass / Steel Support Arm
    var armGeo = new T.BoxGeometry(caseR * 0.25, caseR * 0.16, wristR * 1.1);
    var arm = new T.Mesh(armGeo, mats.gold);
    arm.position.set(0, -wristR * 0.85, -wristR * 0.9);
    arm.rotation.x = 0.45;
    standGrp.add(arm);

    // 3. Heavy Polished Collector's Pedestal Base
    var baseGeo = new T.CylinderGeometry(caseR * 1.35, caseR * 1.45, 6.0, 36);
    var pedestal = new T.Mesh(baseGeo, mats.pedestal);
    pedestal.position.set(0, -wristR * 1.5, -wristR * 1.3);
    standGrp.add(pedestal);

    var brassTrim = new T.Mesh(new T.TorusGeometry(caseR * 1.40, 1.0, 8, 36), mats.gold);
    brassTrim.rotation.x = Math.PI / 2;
    brassTrim.position.set(0, -wristR * 1.5 + 3.0, -wristR * 1.3);
    standGrp.add(brassTrim);

    return standGrp;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 13. MASTER BUILD HOROLOGY TIMEPIECE (SUB-MODE ROUTER)
  // ─────────────────────────────────────────────────────────────────────────────
  function buildHorologyMovement(p) {
    var T = window.THREE;
    var submode = p.submode || 'complete';
    var diam = p.diam || (submode === 'movement' ? 75 : 42);
    var viewMode = p.viewMode || 'assembled';
    var explodeDist = p.explodeDist || 30;
    var finish = p.finish || 'rhodium';
    var dialColor = p.dialColor || 'blue';
    var hasJewels = p.jewels !== false;
    var showStand = p.showStand !== false;

    var grp = new T.Group();
    grp.name = 'Haute_Horlogerie_' + submode;

    var mats = createHorologyMaterials(finish, dialColor, hasJewels);
    var radius = diam / 2.0;
    var parts = [];

    if (submode === 'movement') {
      // ⚙️ SUB-MODE 1: FREESTANDING MECHANICAL CALIBRE MOVEMENTS
      var type = p.type || 'tourbillon';
      if (type === 'tourbillon') {
        var tourb = buildFlyingTourbillonCarriage(T, radius * 0.75, p, mats);
        parts.push({ name: '01_Flying_Tourbillon_Movement', mesh: tourb, baseZ: 0, bedX: 0, bedY: 0 });
        grp.userData.tourbillonCage = tourb;
        grp.userData.escapeWheel = tourb.userData.escapeWheel;
        grp.userData.palletFork = tourb.userData.palletFork;
        grp.userData.balanceWheel = tourb.userData.balanceWheel;
      } else if (type === 'rotor') {
        var baseCalibre = buildSkeletonCalibreMovement(T, radius, p, mats);
        parts.push({ name: '01_Calibre_Base', mesh: baseCalibre, baseZ: 0, bedX: 0, bedY: 0 });
        var rotor = buildAutomaticRotorAssembly(T, radius, mats);
        rotor.position.z = 8.5;
        parts.push({ name: '02_Automatic_Winding_Rotor', mesh: rotor, baseZ: 8.5, bedX: radius * 1.5, bedY: 0 });
        grp.userData.rotor = rotor;
        grp.userData.escapeWheel = baseCalibre.userData.escapeWheel;
        grp.userData.palletFork = baseCalibre.userData.palletFork;
        grp.userData.balanceWheel = baseCalibre.userData.balanceWheel;
      } else {
        var skel = buildSkeletonCalibreMovement(T, radius, p, mats);
        parts.push({ name: '01_Swiss_Lever_Skeleton_Calibre', mesh: skel, baseZ: 0, bedX: 0, bedY: 0 });
        grp.userData.escapeWheel = skel.userData.escapeWheel;
        grp.userData.palletFork = skel.userData.palletFork;
        grp.userData.balanceWheel = skel.userData.balanceWheel;
      }

    } else if (submode === 'dial') {
      // ⏱️ SUB-MODE 2: BESPOKE WATCH DIALS & GUILLOCHÉ
      var dial = buildBespokeWatchDial(T, radius, p, mats);
      parts.push({ name: '01_Bespoke_Guilloche_Dial', mesh: dial, baseZ: 0, bedX: 0, bedY: 0 });

    } else if (submode === 'case') {
      // 🛡️ SUB-MODE 3: WATCH CASES, BEZELS & HANDS
      var watchCase = buildWatchCaseAndBezel(T, radius, p, mats);
      parts.push({ name: '01_Watch_Case_And_Bezel', mesh: watchCase, baseZ: 0, bedX: 0, bedY: 0 });
      var hands = buildWatchHands(T, radius * 0.85, p.hands, mats);
      hands.position.z = 4.5;
      parts.push({ name: '02_Watch_Hands', mesh: hands, baseZ: 4.5, bedX: radius * 1.4, bedY: 0 });
      grp.userData.secHand = hands.userData.secHand;

    } else if (submode === 'strap') {
      // ⛓️ SUB-MODE 4: ARTICULATED BRACELETS & STRAPS
      var bracelet = buildWatchBraceletOrStrap(T, radius, p, mats);
      parts.push({ name: '01_Articulated_Bracelet', mesh: bracelet, baseZ: 0, bedX: 0, bedY: 0 });

    } else {
      // 👑 SUB-MODE 5: COMPLETE LUXURY TIMEPIECE (PHYSICAL LAYER SEPARATION)
      // 1. Luxury Watch Case Middle, Fluted Bezel & Sapphire Glass
      var fullCase = buildWatchCaseAndBezel(T, radius, p, mats);
      parts.push({ name: '01_Watch_Case_Bezel_Assembly', mesh: fullCase, baseZ: 0, bedX: -radius * 1.6, bedY: radius * 1.4 });

      // 2. Mechanical Calibre Movement inside case cavity facing Exhibition Back (-Z)
      var calibreMesh = (p.type === 'tourbillon')
        ? buildFlyingTourbillonCarriage(T, radius * 0.55, p, mats)
        : buildSkeletonCalibreMovement(T, radius * 0.78, p, mats);

      // Invert orientation so the bridges and balance wheel face the exhibition caseback (-Z)
      calibreMesh.rotation.x = Math.PI;
      calibreMesh.position.z = 2.8;
      parts.push({ name: '02_Mechanical_Calibre_Movement', mesh: calibreMesh, baseZ: 2.8, bedX: 0, bedY: radius * 1.4 });

      grp.userData.escapeWheel = calibreMesh.userData.escapeWheel;
      grp.userData.palletFork = calibreMesh.userData.palletFork;
      grp.userData.balanceWheel = calibreMesh.userData.balanceWheel;
      if (p.type === 'tourbillon') grp.userData.tourbillonCage = calibreMesh;

      // Automatic Rotor (swings facing rear exhibition glass)
      if (p.type === 'rotor' || p.type === 'skeleton') {
        var rearRotor = buildAutomaticRotorAssembly(T, radius * 0.76, mats);
        rearRotor.rotation.x = Math.PI;
        rearRotor.position.z = -3.8;
        parts.push({ name: '03_Automatic_Winding_Rotor', mesh: rearRotor, baseZ: -3.8, bedX: 0, bedY: -radius * 1.4 });
        grp.userData.rotor = rearRotor;
      }

      // 3. Bespoke Watch Dial facing Front (+Z)
      var fullDial = buildBespokeWatchDial(T, radius * 0.82, p, mats);
      fullDial.position.z = 3.6;
      parts.push({ name: '04_Bespoke_Watch_Dial', mesh: fullDial, baseZ: 3.6, bedX: radius * 1.6, bedY: radius * 1.4 });

      // 4. Watch Hands (Hour, Minute, Central Seconds)
      var fullHands = buildWatchHands(T, radius * 0.70, p.hands, mats);
      fullHands.position.z = 4.8;
      parts.push({ name: '05_Watch_Hands_Assembly', mesh: fullHands, baseZ: 4.8, bedX: -radius * 1.6, bedY: -radius * 1.4 });
      grp.userData.secHand = fullHands.userData.secHand;

      // 5. Articulated Curved Bracelet / Strap
      var fullStrap = buildWatchBraceletOrStrap(T, radius, p, mats);
      fullStrap.position.z = 0;
      parts.push({ name: '06_Articulated_Bracelet_Strap', mesh: fullStrap, baseZ: 0, bedX: radius * 1.6, bedY: -radius * 1.4 });

      // 6. Haute Horlogerie Velvet Cushion & Pedestal Stand
      if (showStand && viewMode === 'assembled') {
        var stand = buildCollectorCushionStand(T, radius, mats);
        parts.push({ name: '07_Collector_Cushion_Stand', mesh: stand, baseZ: 0, bedX: 0, bedY: 0 });
      }
    }

    // Apply View Modes (Assembled, Exploded, Printbed)
    if (viewMode === 'exploded') {
      parts.forEach(function (pItem, idx) {
        pItem.mesh.position.z = pItem.baseZ + (idx - parts.length / 2) * explodeDist;
        grp.add(pItem.mesh);
      });
      // Cyan Axis Guide Line
      var guideMat = new T.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.65 });
      var gPoints = [new T.Vector3(0, 0, -explodeDist * 3), new T.Vector3(0, 0, explodeDist * 4)];
      grp.add(new T.Line(new T.BufferGeometry().setFromPoints(gPoints), guideMat));

    } else if (viewMode === 'printbed') {
      parts.forEach(function (pItem) {
        pItem.mesh.position.set(pItem.bedX, pItem.bedY, 0);
        pItem.mesh.rotation.x = 0;
        grp.add(pItem.mesh);
      });
      // Direct Print Bed Platform
      var bedMat = new T.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85, metalness: 0.15 });
      var bedMesh = new T.Mesh(new T.BoxGeometry(diam * 4.2, diam * 4.2, 2.5), bedMat);
      bedMesh.position.z = -1.5;
      grp.add(bedMesh);

    } else {
      // Assembled Working Timepiece
      parts.forEach(function (pItem) {
        pItem.mesh.position.z = pItem.baseZ;
        grp.add(pItem.mesh);
      });
    }

    grp.userData.partsList = parts;

    // Auto-center in X/Z and ground at Y=0
    grp.updateMatrixWorld(true);
    var box = new T.Box3().setFromObject(grp);
    var cen = new T.Vector3();
    box.getCenter(cen);
    grp.position.x = -cen.x;
    grp.position.z = -cen.z;
    grp.position.y = -box.min.y;
    grp.updateMatrixWorld(true);

    return grp;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 14. LIVE TICKING PHYSICAL SIMULATION LOOP
  // ─────────────────────────────────────────────────────────────────────────────
  function startTickingSimulation() {
    if (isTicking) {
      isTicking = false;
      if (tickingAnimId) cancelAnimationFrame(tickingAnimId);
      showMsg('⏱️ Movement Ticking Paused', 'info');
      var tb = el('btn-tick-horology');
      if (tb) tb.textContent = (window.I18N && I18N.t) ? I18N.t('btnTickHorology') : '⏱️ Start Live Ticking Simulation';
      return;
    }

    if (!currentHorologyMesh) {
      showMsg('Generate a Horology Timepiece or Movement first!', 'warning');
      return;
    }

    isTicking = true;
    showMsg('⏱️ Haute Horlogerie Calibre running at 28,800 vph (4Hz)!', 'success');
    var tb2 = el('btn-tick-horology');
    if (tb2) tb2.textContent = '⏸️ Pause Ticking Simulation';

    lastTickTime = performance.now();

    function tickLoop(now) {
      if (!isTicking || !currentHorologyMesh) return;
      var dt = (now - lastTickTime) * 0.001;
      lastTickTime = now;
      tickAngle += dt * 8.0; // 4 Hz beat rate

      var esc = currentHorologyMesh.userData.escapeWheel;
      var fork = currentHorologyMesh.userData.palletFork;
      var bal = currentHorologyMesh.userData.balanceWheel;
      var cage = currentHorologyMesh.userData.tourbillonCage;
      var rotor = currentHorologyMesh.userData.rotor;
      var secHand = currentHorologyMesh.userData.secHand;

      // 1. Discrete Escapement Stepping
      if (esc) esc.rotation.z += 0.045;

      // 2. Pallet Fork Snapping between Banking Pins
      if (fork) fork.rotation.z = Math.sin(tickAngle * Math.PI * 2) * 0.16;

      // 3. Balance Wheel Harmonic Oscillation with Spirale
      if (bal) bal.rotation.z = Math.sin(tickAngle * Math.PI * 2) * 0.85;

      // 4. Flying Tourbillon 360° Continuous Revolving
      if (cage) cage.rotation.z += 0.015;

      // 5. Automatic Rotor Swinging
      if (rotor) rotor.rotation.z = Math.sin(tickAngle * 0.8) * 0.65;

      // 6. Central Sweeping Seconds Hand
      if (secHand) secHand.rotation.z -= dt * (Math.PI * 2 / 60);

      tickingAnimId = requestAnimationFrame(tickLoop);
    }
    tickingAnimId = requestAnimationFrame(tickLoop);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 15. UI CONTROLS BINDING & GENERATION ROUTER
  // ─────────────────────────────────────────────────────────────────────────────
  function updateSubmodeUI() {
    var submode = (el('horology-submode-select') || {}).value || 'complete';
    var secMv = el('horology-sec-movement');
    var secDial = el('horology-sec-dial');
    var secCase = el('horology-sec-case');
    var secStrap = el('horology-sec-strap');

    if (secMv) secMv.style.display = (submode === 'movement' || submode === 'complete') ? 'block' : 'none';
    if (secDial) secDial.style.display = (submode === 'dial' || submode === 'complete') ? 'block' : 'none';
    if (secCase) secCase.style.display = (submode === 'case' || submode === 'complete') ? 'block' : 'none';
    if (secStrap) secStrap.style.display = (submode === 'strap' || submode === 'complete') ? 'block' : 'none';

    // Update default diameter
    var diamSlider = el('horology-diam-slider');
    var diamVal = el('horology-diam-val');
    if (diamSlider && diamVal) {
      if (submode === 'movement' && parseFloat(diamSlider.value) < 60) {
        diamSlider.value = 75;
        diamVal.textContent = '75mm';
      } else if (submode !== 'movement' && parseFloat(diamSlider.value) > 60) {
        diamSlider.value = 42;
        diamVal.textContent = '42mm';
      }
    }
  }

  function updateViewModeUI() {
    var vm = (el('horology-view-select') || {}).value || 'assembled';
    var eg = el('horology-explode-group');
    if (eg) eg.style.display = (vm === 'exploded') ? 'block' : 'none';
  }

  function inspectViewport(targetView) {
    var v = window.__polymorphViewer || window.Viewer;
    if (!v || !v.camera || !v.controls) {
      showMsg('3D Viewer viewport initializing...', 'info');
      return;
    }

    var targetCenter = new THREE.Vector3(0, 20, 0);
    if (currentHorologyMesh) {
      var box = new THREE.Box3().setFromObject(currentHorologyMesh);
      box.getCenter(targetCenter);
    }

    if (targetView === 'front') {
      v.camera.position.set(targetCenter.x, targetCenter.y, targetCenter.z + 105);
      v.controls.target.copy(targetCenter);
      v.controls.update();
      showMsg('👁️ Viewing Front Dial & Complications', 'info');

    } else if (targetView === 'back') {
      v.camera.position.set(targetCenter.x, targetCenter.y, targetCenter.z - 105);
      v.controls.target.copy(targetCenter);
      v.controls.update();
      showMsg('🔄 Viewing Exhibition Caseback & Mechanical Calibre', 'info');

    } else if (targetView === 'macro') {
      v.camera.position.set(targetCenter.x, targetCenter.y - 8, targetCenter.z - 26);
      v.controls.target.set(targetCenter.x, targetCenter.y - 8, targetCenter.z);
      v.controls.update();
      showMsg('🔬 Macro Escapement & Regulating Organ Zoom', 'info');
    }
  }

  function updateSpecsHUD(p) {
    var freqEl = el('horology-spec-freq-val');
    var jewelsEl = el('horology-spec-jewels-val');
    var powerEl = el('horology-spec-power-val');
    var shockEl = el('horology-spec-shock-val');
    var casebackEl = el('horology-spec-caseback-val');

    var type = p.type || 'tourbillon';
    if (type === 'tourbillon') {
      if (freqEl) freqEl.textContent = '21,600 vph (3 Hz)';
      if (jewelsEl) jewelsEl.textContent = '28 Synthetic Rubies';
      if (powerEl) powerEl.textContent = '72 Hours Mainspring';
      if (shockEl) shockEl.textContent = 'Kif Elastor Lyre Spring';
      if (casebackEl) casebackEl.textContent = 'Exhibition Sapphire Crystal';
    } else if (type === 'rotor') {
      if (freqEl) freqEl.textContent = '28,800 vph (4 Hz)';
      if (jewelsEl) jewelsEl.textContent = '31 Synthetic Rubies';
      if (powerEl) powerEl.textContent = '70 Hours Bi-directional';
      if (shockEl) shockEl.textContent = 'Incabloc Shock Protection';
      if (casebackEl) casebackEl.textContent = '21K Gold Rotor Exhibition Glass';
    } else {
      if (freqEl) freqEl.textContent = '28,800 vph (4 Hz)';
      if (jewelsEl) jewelsEl.textContent = '25 Synthetic Rubies';
      if (powerEl) powerEl.textContent = '65 Hours Manual Wind';
      if (shockEl) shockEl.textContent = 'Incabloc Lyre Spring';
      if (casebackEl) casebackEl.textContent = 'Openwork Exhibition Sapphire';
    }
  }

  function generateHorology() {
    setLoading(true, 'Calculating Haute Horlogerie Geometry...');
    setTimeout(function () {
      try {
        var submode = (el('horology-submode-select') || {}).value || 'complete';
        var type = (el('horology-type-select') || {}).value || 'tourbillon';
        var diam = parseFloat((el('horology-diam-slider') || {}).value || (submode === 'movement' ? 75 : 42));
        var viewMode = (el('horology-view-select') || {}).value || 'assembled';
        var explodeDist = parseFloat((el('horology-explode-slider') || {}).value || 30);
        var finish = (el('horology-finish-select') || {}).value || 'rhodium';
        var dialColor = (el('horology-dial-color-select') || {}).value || 'blue';
        var guilloche = (el('horology-guilloche-select') || {}).value || 'clous_de_paris';
        var indexStyle = (el('horology-index-select') || {}).value || 'baton';
        var subdial = (el('horology-subdial-select') || {}).value || 'small_seconds';
        var comp = (el('horology-complication-select') || {}).value || 'none';
        var caseShape = (el('horology-case-select') || {}).value || 'oyster';
        var bezel = (el('horology-bezel-select') || {}).value || 'fluted';
        var hands = (el('horology-hands-select') || {}).value || 'dauphine';
        var strap = (el('horology-strap-select') || {}).value || 'oyster';
        var clasp = (el('horology-clasp-select') || {}).value || 'deployant';
        var jewels = !!(el('horology-jewels-toggle') || {}).checked;
        var showStand = !!(el('horology-stand-toggle') || {}).checked;
        var brand = (el('horology-brand-input') || {}).value || 'POLYMORPH GENÈVE';

        var p = {
          submode: submode,
          type: type,
          diam: diam,
          viewMode: viewMode,
          explodeDist: explodeDist,
          finish: finish,
          dialColor: dialColor,
          guilloche: guilloche,
          indexStyle: indexStyle,
          subdial: subdial,
          complication: comp,
          caseShape: caseShape,
          bezel: bezel,
          hands: hands,
          strap: strap,
          clasp: clasp,
          jewels: jewels,
          showStand: showStand,
          brand: brand
        };

        updateSpecsHUD(p);
        var model = buildHorologyMovement(p);
        pushModel(model, 'horology_' + submode + '_' + type);
        showMsg((window.I18N && I18N.t) ? I18N.t('toastHorologyGenerated') : 'Haute Horlogerie Timepiece generated successfully!', 'success');
      } catch (err) {
        console.error(err);
        showMsg('Error: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    }, 40);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 16. WATCHMAKER FABRICATION KIT (.ZIP) & MULTI-FORMAT EXPORTERS
  // ─────────────────────────────────────────────────────────────────────────────
  async function exportFullWatchmakerZip() {
    if (!window.JSZip || !window.ModelConverters) {
      showMsg('JSZip library not available!', 'error');
      return;
    }
    setLoading(true, 'Packaging Complete Watchmaker Fabrication Kit (.ZIP)...');
    try {
      var zip = new JSZip();
      var submode = (el('horology-submode-select') || {}).value || 'complete';
      var diam = parseFloat((el('horology-diam-slider') || {}).value || 42);

      var p = {
        submode: submode,
        type: (el('horology-type-select') || {}).value || 'tourbillon',
        diam: diam,
        viewMode: 'assembled',
        finish: 'rhodium',
        dialColor: 'blue',
        guilloche: 'clous_de_paris',
        indexStyle: 'baton',
        subdial: 'small_seconds',
        complication: 'none',
        caseShape: 'oyster',
        bezel: 'fluted',
        hands: 'dauphine',
        strap: 'oyster',
        clasp: 'deployant',
        jewels: true,
        showStand: false,
        brand: (el('horology-brand-input') || {}).value || 'POLYMORPH GENÈVE'
      };

      var fullModel = buildHorologyMovement(p);
      var parts = fullModel.userData.partsList || [];

      for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        var singleGrp = new THREE.Group();
        var cloneMesh = part.mesh.clone(true);
        cloneMesh.position.set(0, 0, 0);
        singleGrp.add(cloneMesh);
        var exp = await ModelConverters.exportModel(singleGrp, 'stl', part.name);
        zip.file(part.name + '.stl', exp.blob);
      }

      // Add HTML Assembly Manual
      var manualHtml = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Haute Horlogerie Assembly Guide</title></head>' +
        '<body style="font-family:sans-serif;padding:24px;background:#0f172a;color:#f8fafc;line-height:1.6;">' +
        '<h1 style="color:#60a5fa;">⏱️ Haute Horlogerie Watchmaker Assembly Manual</h1>' +
        '<p>PolyMorph 3D Studio - Professional Watchmaker Fabrication Kit</p>' +
        '<h2 style="color:#93c5fd;">Component Inventory:</h2><ul>' +
        parts.map(function (pt) { return '<li><strong>' + pt.name + '.stl</strong></li>'; }).join('') +
        '</ul><h2 style="color:#93c5fd;">Watchmaker Assembly Steps:</h2><ol>' +
        '<li>Inspect and de-burr all precision components and gear pivots.</li>' +
        '<li>Press synthetic ruby pivot jewels into mainplate and bridge chatons.</li>' +
        '<li>Seat mainspring barrel, center wheel, third wheel, and fourth wheel into gear train arbors.</li>' +
        '<li>Mount Swiss club escape wheel and engage pallet fork ruby stones at 12° impulse angle.</li>' +
        '<li>Fit Glucydur balance wheel with Archimedean spiral hairspring onto the balance staff.</li>' +
        '<li>Secure balance cock with blued steel screws and test live escapement oscillation.</li>' +
        '<li>Place bespoke guilloché dial over dial posts and press hour, minute, and central second hands.</li>' +
        '<li>Casing: Mount calibre inside watch case, seal exhibition caseback, and attach articulated bracelet.</li></ol>' +
        '</body></html>';
      zip.file('Watchmaker_Assembly_Manual.html', manualHtml);

      var zipBlob = await zip.generateAsync({ type: 'blob' });
      ModelConverters.triggerDownload(zipBlob, 'Watchmaker_Haute_Horlogerie_Kit.zip');
      showMsg('Watchmaker Fabrication Kit (.ZIP) exported successfully!', 'success');
    } catch (e) {
      showMsg('ZIP Export error: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function doExport(fmt) {
    if (!currentHorologyMesh) {
      showMsg('Please generate a horology timepiece or movement first!', 'warning');
      return;
    }
    setLoading(true, 'Exporting ' + fmt.toUpperCase() + '...');
    try {
      if (fmt === '3mf' && window.ModelConverters && ModelConverters.export3MF) {
        var r3 = await ModelConverters.export3MF(currentHorologyMesh, 'Haute_Horlogerie_Timepiece');
        ModelConverters.triggerDownload(r3.blob, r3.filename);
        showMsg('Multi-Color 3MF exported!', 'success');
        return;
      }
      var r = await ModelConverters.exportModel(currentHorologyMesh, fmt, 'haute_horlogerie_model');
      ModelConverters.triggerDownload(r.blob, r.filename);
      showMsg('Exported ' + fmt.toUpperCase() + ' successfully!', 'success');
    } catch (e) {
      showMsg('Export error: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function init() {
    wireSlider('horology-diam-slider', 'horology-diam-val');
    wireSlider('horology-explode-slider', 'horology-explode-val');

    var submodeSel = el('horology-submode-select');
    if (submodeSel) {
      submodeSel.addEventListener('change', function () {
        updateSubmodeUI();
        generateHorology();
      });
    }

    var vmSel = el('horology-view-select');
    if (vmSel) {
      vmSel.addEventListener('change', function () {
        updateViewModeUI();
        generateHorology();
      });
    }

    var selectsToWire = [
      'horology-type-select',
      'horology-guilloche-select',
      'horology-index-select',
      'horology-subdial-select',
      'horology-complication-select',
      'horology-dial-color-select',
      'horology-case-select',
      'horology-bezel-select',
      'horology-hands-select',
      'horology-strap-select',
      'horology-clasp-select',
      'horology-finish-select'
    ];

    selectsToWire.forEach(function (id) {
      var s = el(id);
      if (s) s.addEventListener('change', generateHorology);
    });

    var jewTog = el('horology-jewels-toggle');
    if (jewTog) jewTog.addEventListener('change', generateHorology);

    var standTog = el('horology-stand-toggle');
    if (standTog) standTog.addEventListener('change', generateHorology);

    var brandInput = el('horology-brand-input');
    if (brandInput) {
      brandInput.addEventListener('input', function () {
        clearTimeout(brandInput._debounceTimer);
        brandInput._debounceTimer = setTimeout(generateHorology, 400);
      });
    }

    // Viewport Inspector Buttons
    var btnFront = el('btn-horology-view-front');
    if (btnFront) btnFront.addEventListener('click', function () { inspectViewport('front'); });

    var btnBack = el('btn-horology-view-back');
    if (btnBack) btnBack.addEventListener('click', function () { inspectViewport('back'); });

    var btnMacro = el('btn-horology-view-macro');
    if (btnMacro) btnMacro.addEventListener('click', function () { inspectViewport('macro'); });

    var gb = el('btn-generate-horology');
    if (gb) gb.addEventListener('click', generateHorology);

    var tickBtn = el('btn-tick-horology');
    if (tickBtn) tickBtn.addEventListener('click', startTickingSimulation);

    var ezip = el('btn-export-horology-zip');
    if (ezip) ezip.addEventListener('click', exportFullWatchmakerZip);

    var estl = el('btn-export-horology-stl');
    if (estl) estl.addEventListener('click', function () { doExport('stl'); });
    var eglb = el('btn-export-horology-glb');
    if (eglb) eglb.addEventListener('click', function () { doExport('glb'); });
    var e3mf = el('btn-export-horology-3mf');
    if (e3mf) e3mf.addEventListener('click', function () { doExport('3mf'); });
    var ehtml = el('btn-export-horology-html');
    if (ehtml) ehtml.addEventListener('click', function () { doExport('html'); });

    updateSubmodeUI();
    updateViewModeUI();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.__horologyEngine = {
    generate: generateHorology,
    tick: startTickingSimulation,
    buildMovement: buildHorologyMovement,
    inspect: inspectViewport
  };
})();
