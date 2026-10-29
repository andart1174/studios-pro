/**
 * PolyMorph 3D Studio - Cryptex & Modular Mechanical Assembly Suite
 * Generates Da Vinci Password Cryptex cylinders, 3D gravity marble mazes,
 * and Japanese sliding trick boxes with Assembled, Exploded (Assembly Kit),
 * and 3D Print-Bed Flat Layout modes, plus full modular .ZIP print kit exports.
 */
(function () {
  'use strict';
  var currentCryptexMesh = null;
  var currentPartsList = [];

  function el(id) { return document.getElementById(id); }
  function showMsg(msg, type) {
    if (typeof showToast === 'function') showToast(msg, type || 'info');
    else console.log('[Cryptex]', msg);
  }
  function setLoading(on, txt) {
    var ov = el('loading-overlay'), lb = el('loading-text');
    if (!ov) return;
    if (on) { if (lb) lb.textContent = txt || 'Calculating Mechanical Assembly...'; ov.classList.add('visible'); }
    else { ov.classList.remove('visible'); }
  }

  function pushModel(mesh, name) {
    currentCryptexMesh = mesh;
    if (typeof window.__polymorphSetModel === 'function') {
      window.__polymorphSetModel(mesh, name);
      return;
    }
    document.dispatchEvent(new CustomEvent('cryptex3dReady', { detail: { mesh: mesh, name: name } }));
  }

  function wireSlider(sid, vid) {
    var s = el(sid), v = el(vid);
    if (!s || !v) return;
    function upd() {
      var step = parseFloat(s.step || 1);
      var decimals = step < 1 ? 2 : 0;
      v.textContent = parseFloat(s.value).toFixed(decimals) + (s.dataset.unit || '');
    }
    s.addEventListener('input', function () {
      upd();
      generateCryptex();
    });
    upd();
  }

  // ── PROCEDURAL TEXTURE GENERATOR FOR ENGRAVED ALPHABET BANDS ──────────────
  function createDialAlphabetTexture(matchingLetter) {
    var canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 128;
    var ctx = canvas.getContext('2d');

    // Brass / Gold background
    ctx.fillStyle = '#b48c36';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle metallic brush lines
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    for (var i = 0; i < 20; i++) {
      ctx.fillRect(0, i * 6.4, canvas.width, 2);
    }

    var numLetters = 26;
    var segmentW = canvas.width / numLetters;

    ctx.font = 'bold 54px monospace, "Courier New", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (var l = 0; l < numLetters; l++) {
      var char = String.fromCharCode(65 + l);
      var cx = l * segmentW + segmentW / 2;

      // Divider groove
      ctx.strokeStyle = '#4a3512';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(l * segmentW, 0);
      ctx.lineTo(l * segmentW, canvas.height);
      ctx.stroke();

      // Highlight active matching password letter
      if (char === matchingLetter) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(l * segmentW + 3, 4, segmentW - 6, canvas.height - 8);
        ctx.fillStyle = '#fbbf24';
      } else {
        ctx.fillStyle = '#261b0a';
      }

      ctx.fillText(char, cx, canvas.height / 2);
    }

    var tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  // ── BUILD MODULAR ASSEMBLY / EXPLODED / PRINT BED ─────────────────────────
  function buildCryptexMechanism(p) {
    var T = window.THREE;
    var type = p.type || 'password';
    var viewMode = p.viewMode || 'assembled'; // 'assembled' | 'exploded' | 'printbed'
    var explodeDist = p.explodeDist || 45;
    var pwd = (p.password || 'SECRET').toUpperCase().replace(/[^A-Z]/g, '') || 'SECRET';
    var numRings = Math.max(3, Math.min(8, pwd.length));
    var outDiam = p.diam || 55;
    var outRadius = outDiam / 2.0;
    var coreRadius = outRadius * 0.58;
    var ringWidth = 14;
    var tol = p.tol || 0.35;

    var grp = new T.Group();
    grp.name = 'Cryptex_Mechanical_Assembly';
    currentPartsList = [];

    // Materials
    var brassMat = new T.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.88, roughness: 0.22, side: T.DoubleSide });
    var darkBronzeMat = new T.MeshStandardMaterial({ color: 0x5c4028, metalness: 0.75, roughness: 0.4, side: T.DoubleSide });
    var steelMat = new T.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.92, roughness: 0.18, side: T.DoubleSide });
    var copperMat = new T.MeshStandardMaterial({ color: 0xb45309, metalness: 0.85, roughness: 0.3, side: T.DoubleSide });
    var scrollMat = new T.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.85, metalness: 0.05, side: T.DoubleSide });

    // ── MECHANISM 1: DA VINCI MODULAR PASSWORD CRYPTEX ──────────────────────
    if (type === 'password') {
      var totalLen = numRings * ringWidth;

      // 1. INNER CORE SHAFT WITH KEYWAY CHANNEL & SECRET CHAMBER
      var coreGroup = new T.Group();
      coreGroup.name = '01_Inner_Core_Keyway_Shaft';

      var chamberGeo = new T.CylinderGeometry(coreRadius - tol, coreRadius - tol, totalLen + 26, 36);
      var chamber = new T.Mesh(chamberGeo, darkBronzeMat);
      chamber.rotation.x = Math.PI / 2;
      chamber.castShadow = true;
      coreGroup.add(chamber);

      // Continuous Sliding Keyway Track Slot along Core
      var keywayGeo = new T.BoxGeometry(2.8, 2.8, totalLen + 22);
      var keyway = new T.Mesh(keywayGeo, steelMat);
      keyway.position.set(0, coreRadius - 0.5, 0);
      coreGroup.add(keyway);

      // Core Stop Flange (Front fixed retention ring)
      var coreFlangeGeo = new T.CylinderGeometry(outRadius + 1.5, outRadius + 1.5, 6, 36);
      var coreFlange = new T.Mesh(coreFlangeGeo, darkBronzeMat);
      coreFlange.rotation.x = Math.PI / 2;
      coreFlange.position.z = totalLen / 2 + 13;
      coreGroup.add(coreFlange);

      currentPartsList.push({ name: '01_Inner_Core_Shaft', mesh: coreGroup });

      // 2. INNER SECRET SCROLL & VIAL CAPSULE (Hollow storage payload)
      var scrollGroup = new T.Group();
      scrollGroup.name = '02_Inner_Secret_Scroll_Capsule';
      var scrollGeo = new T.CylinderGeometry(coreRadius * 0.65, coreRadius * 0.65, totalLen * 0.85, 28);
      var scrollMesh = new T.Mesh(scrollGeo, scrollMat);
      scrollMesh.rotation.x = Math.PI / 2;
      scrollGroup.add(scrollMesh);

      // Wax Seal Ribbon Band
      var sealGeo = new T.CylinderGeometry(coreRadius * 0.68, coreRadius * 0.68, 8, 28);
      var sealMesh = new T.Mesh(sealGeo, new T.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 }));
      sealMesh.rotation.x = Math.PI / 2;
      scrollGroup.add(sealMesh);

      currentPartsList.push({ name: '02_Secret_Scroll_Capsule', mesh: scrollGroup });

      // 3. SEPARATE ROTATING TUMBLER RINGS (Each with engraved 26 letters & inner locking lug)
      var ringGroups = [];
      for (var r = 0; r < numRings; r++) {
        var char = pwd[r] || 'A';
        var ringGrp = new T.Group();
        ringGrp.name = '03_Dial_Ring_' + (r + 1) + '_Letter_' + char;

        // Outer Tumbler Ring Cylinder
        var ringGeo = new T.CylinderGeometry(outRadius, outRadius, ringWidth - 0.8, 36);
        var dialTex = createDialAlphabetTexture(char);
        var dialMat = new T.MeshStandardMaterial({
          map: dialTex,
          metalness: 0.85,
          roughness: 0.25,
          side: T.DoubleSide
        });
        var ringMesh = new T.Mesh(ringGeo, dialMat);
        ringMesh.rotation.x = Math.PI / 2;
        ringMesh.castShadow = true;
        ringGrp.add(ringMesh);

        // Internal Locking Lug / Tooth (aligned with secret letter keyway)
        var lugGeo = new T.BoxGeometry(2.4, 2.4, ringWidth - 2.5);
        var lug = new T.Mesh(lugGeo, steelMat);
        lug.position.set(0, coreRadius + 1.2, 0);
        ringGrp.add(lug);

        // Knurled Grip Flanges on Ring Borders
        [-ringWidth / 2 + 0.6, ringWidth / 2 - 0.6].forEach(function (offsetZ) {
          var flangeGeo = new T.TorusGeometry(outRadius + 0.6, 0.7, 8, 36);
          var flange = new T.Mesh(flangeGeo, copperMat);
          flange.position.z = offsetZ;
          ringGrp.add(flange);
        });

        ringGroups.push(ringGrp);
        currentPartsList.push({ name: 'Ring_' + (r + 1) + '_' + char, mesh: ringGrp });
      }

      // 4. FRONT ORNATE END CAP
      var frontCapGrp = new T.Group();
      frontCapGrp.name = '04_Front_Beveled_Cap';
      var fCapGeo = new T.CylinderGeometry(outRadius + 4, outRadius + 1, 14, 36);
      var fCap = new T.Mesh(fCapGeo, darkBronzeMat);
      fCap.rotation.x = Math.PI / 2;
      frontCapGrp.add(fCap);
      var fKnob = new T.Mesh(new T.SphereGeometry(outRadius * 0.4, 24, 24), brassMat);
      fKnob.position.z = 9;
      frontCapGrp.add(fKnob);
      currentPartsList.push({ name: '04_Front_Cap', mesh: frontCapGrp });

      // 5. REAR THREADED LOCKING END CAP
      var rearCapGrp = new T.Group();
      rearCapGrp.name = '05_Rear_Threaded_Lock_Ring';
      var rCapGeo = new T.CylinderGeometry(outRadius + 4, outRadius + 1, 14, 36);
      var rCap = new T.Mesh(rCapGeo, darkBronzeMat);
      rCap.rotation.x = -Math.PI / 2;
      rearCapGrp.add(rCap);
      var rKnob = new T.Mesh(new T.SphereGeometry(outRadius * 0.4, 24, 24), brassMat);
      rKnob.position.z = -9;
      rearCapGrp.add(rKnob);
      currentPartsList.push({ name: '05_Rear_Lock_Cap', mesh: rearCapGrp });

      // ── POSITION ACCORDING TO VIEW MODE ──────────────────────────────────
      if (viewMode === 'assembled') {
        // 🧩 ASSEMBLED WORKING POSITION
        grp.add(coreGroup);
        grp.add(scrollGroup);

        for (var i = 0; i < numRings; i++) {
          var zP = -totalLen / 2 + i * ringWidth + ringWidth / 2;
          ringGroups[i].position.set(0, 0, zP);
          grp.add(ringGroups[i]);
        }

        frontCapGrp.position.set(0, 0, totalLen / 2 + 13);
        rearCapGrp.position.set(0, 0, -totalLen / 2 - 13);
        grp.add(frontCapGrp);
        grp.add(rearCapGrp);

      } else if (viewMode === 'exploded') {
        // 💥 EXPLODED ASSEMBLY INSPECTION KIT (Smoothly spaced along Z-axis)
        var stepDist = explodeDist * (1.0 + 30 / totalLen);

        // Core in center
        coreGroup.position.set(0, 0, 0);
        grp.add(coreGroup);

        // Scroll capsule pops out along Y
        scrollGroup.position.set(0, outRadius * 2.2, 0);
        grp.add(scrollGroup);

        // Spaced rings
        for (var j = 0; j < numRings; j++) {
          var expZ = (j - (numRings - 1) / 2) * (ringWidth + stepDist);
          ringGroups[j].position.set(0, 0, expZ);
          grp.add(ringGroups[j]);
        }

        // End caps pulled outward
        var maxZ = ((numRings - 1) / 2) * (ringWidth + stepDist) + stepDist * 1.4;
        frontCapGrp.position.set(0, 0, maxZ);
        rearCapGrp.position.set(0, 0, -maxZ);
        grp.add(frontCapGrp);
        grp.add(rearCapGrp);

        // Exploded Centerline Guide Wire (Cyan Laser)
        var guideGeo = new T.BufferGeometry().setFromPoints([
          new T.Vector3(0, 0, -maxZ - 20),
          new T.Vector3(0, 0, maxZ + 20)
        ]);
        var guideLine = new T.Line(guideGeo, new T.LineDashedMaterial({ color: 0x06b6d4, dashSize: 4, gapSize: 3 }));
        guideLine.computeLineDistances();
        grp.add(guideLine);

      } else {
        // 🖨️ 3D PRINT BED FLAT LAYOUT (All parts arranged flat on build plate at Z=0)
        var bedGridX = 0, bedGridY = 0;
        var spacing = outDiam * 1.25;

        // 1. Core Shaft laid horizontal
        coreGroup.rotation.y = Math.PI / 2;
        coreGroup.position.set(0, coreRadius, 0);
        grp.add(coreGroup);

        // 2. Rings stood vertical on flat edge
        for (var k = 0; k < numRings; k++) {
          var col = (k % 4) - 1.5;
          var row = Math.floor(k / 4) + 1;
          ringGroups[k].position.set(col * spacing, outRadius, row * spacing);
          grp.add(ringGroups[k]);
        }

        // 3. Caps laid flat base down
        frontCapGrp.rotation.x = Math.PI / 2;
        frontCapGrp.position.set(-spacing * 1.5, 7, -spacing);
        grp.add(frontCapGrp);

        rearCapGrp.rotation.x = -Math.PI / 2;
        rearCapGrp.position.set(spacing * 1.5, 7, -spacing);
        grp.add(rearCapGrp);

        // Scroll capsule
        scrollGroup.rotation.y = Math.PI / 2;
        scrollGroup.position.set(0, coreRadius * 0.65, -spacing);
        grp.add(scrollGroup);

        // Virtual 3D Print Bed Outline (220mm x 220mm)
        var bedGeo = new T.PlaneGeometry(240, 240);
        var bedMat = new T.MeshBasicMaterial({ color: 0x0f172a, side: T.DoubleSide, transparent: true, opacity: 0.6 });
        var bedMesh = new T.Mesh(bedGeo, bedMat);
        bedMesh.rotation.x = -Math.PI / 2;
        bedMesh.position.y = -0.1;
        grp.add(bedMesh);
      }

    // ── MECHANISM 2: 3D SPHERICAL MARBLE GRAVITY MAZE ───────────────────────
    } else if (type === 'marble') {
      var mazeR = outRadius * 1.25;

      // Transparent Outer Sphere Shell (Clear Acrylic Globe)
      var shellGeo = new T.SphereGeometry(mazeR, 48, 48);
      var shellMat = new T.MeshPhysicalMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.35,
        roughness: 0.1,
        metalness: 0.1,
        transmission: 0.85,
        thickness: 2.0,
        side: T.DoubleSide
      });
      var shell = new T.Mesh(shellGeo, shellMat);
      grp.add(shell);

      // Multi-Tiered Internal Spiral Track Maze
      var trackLevels = 6;
      for (var l = 0; l < trackLevels; l++) {
        var tR = mazeR * (0.35 + 0.55 * (l / trackLevels));
        var tY = (l / (trackLevels - 1) - 0.5) * mazeR * 1.3;

        var pathGeo = new T.TorusGeometry(tR, 2.2, 12, 48, Math.PI * 1.6);
        var pathMesh = new T.Mesh(pathGeo, brassMat);
        pathMesh.position.y = tY;
        pathMesh.rotation.x = Math.PI / 2 + (l % 2 === 0 ? 0.15 : -0.15);
        pathMesh.rotation.z = (l * Math.PI) / 3;
        grp.add(pathMesh);

        var chuteGeo = new T.CylinderGeometry(2.5, 2.5, mazeR * 0.28, 16);
        var chute = new T.Mesh(chuteGeo, steelMat);
        chute.position.set(Math.cos(l) * tR * 0.8, tY - mazeR * 0.14, Math.sin(l) * tR * 0.8);
        grp.add(chute);
      }

      var ballGeo = new T.SphereGeometry(5, 24, 24);
      var ball = new T.Mesh(ballGeo, steelMat);
      ball.position.set(0, mazeR * 0.3, mazeR * 0.4);
      ball.castShadow = true;
      grp.add(ball);

      var cradleGeo = new T.CylinderGeometry(mazeR * 0.7, mazeR * 0.85, 8, 32);
      var cradle = new T.Mesh(cradleGeo, darkBronzeMat);
      cradle.position.y = -mazeR - 4;
      grp.add(cradle);

      currentPartsList.push({ name: 'Spherical_Maze_Assembly', mesh: grp });

    // ── MECHANISM 3: JAPANESE SLIDING TRICK BOX (HIMITSU-BAKO) ──────────────
    } else {
      var bW = outDiam * 1.3, bH = outDiam * 0.85, bL = outDiam * 1.6;

      var walnutMat = new T.MeshStandardMaterial({ color: 0x451a03, roughness: 0.6, metalness: 0.05, side: T.DoubleSide });
      var mapleMat = new T.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.4, metalness: 0.05, side: T.DoubleSide });

      var boxBase = new T.Mesh(new T.BoxGeometry(bW, bH, bL), walnutMat);
      boxBase.castShadow = true;
      grp.add(boxBase);

      var pThick = 3.5;
      var topSlider = new T.Mesh(new T.BoxGeometry(bW * 0.9, pThick, bL * 0.85), mapleMat);
      topSlider.position.set(8, bH / 2 + pThick / 2, 0);
      grp.add(topSlider);

      var sideSlider = new T.Mesh(new T.BoxGeometry(pThick, bH * 0.8, bL * 0.85), brassMat);
      sideSlider.position.set(bW / 2 + pThick / 2, 0, -6);
      grp.add(sideSlider);

      var frontSlider = new T.Mesh(new T.BoxGeometry(bW * 0.8, bH * 0.8, pThick), mapleMat);
      frontSlider.position.set(0, -4, bL / 2 + pThick / 2);
      grp.add(frontSlider);

      for (var s = -2; s <= 2; s++) {
        var stripGeo = new T.BoxGeometry(bW + 0.4, 1.8, 1.8);
        var strip = new T.Mesh(stripGeo, darkBronzeMat);
        strip.position.set(0, s * (bH / 5), bL / 2 + 0.2);
        grp.add(strip);
      }

      currentPartsList.push({ name: 'Himitsu_Bako_TrickBox', mesh: grp });
    }

    // Auto-center and ground at Y=0
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

  function generateCryptex() {
    setLoading(true, 'Calculating Interlocking Tumbler Clearances...');
    setTimeout(function () {
      try {
        var type = (el('cryptex-type-select') || {}).value || 'password';
        var viewMode = (el('cryptex-view-select') || {}).value || 'assembled';
        var explodeDist = parseFloat((el('cryptex-explode-slider') || {}).value || 45);
        var pwd = (el('cryptex-password-input') || {}).value || 'SECRET';
        var diam = parseFloat((el('cryptex-diam-slider') || {}).value || 55);
        var tol = parseFloat((el('cryptex-tol-slider') || {}).value || 0.35);

        var p = { type: type, viewMode: viewMode, explodeDist: explodeDist, password: pwd, diam: diam, tol: tol };
        var model = buildCryptexMechanism(p);

        pushModel(model, 'cryptex_' + type + '_' + viewMode);
        showMsg((window.I18N && I18N.t) ? I18N.t('toastCryptexGenerated') : 'Mechanical 3D Puzzle generated with custom password!', 'success');
      } catch (err) {
        console.error(err);
        showMsg('Error: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    }, 40);
  }

  // ── FULL MODULAR PRINT KIT (.ZIP) EXPORT ──────────────────────────────────
  async function exportModularKitZip() {
    if (!currentCryptexMesh || currentPartsList.length === 0) {
      showMsg('Please generate a Cryptex model first!', 'warning');
      return;
    }
    if (typeof JSZip === 'undefined' || typeof THREE.STLExporter === 'undefined') {
      showMsg('Exporting combined STL...', 'info');
      doExport('stl');
      return;
    }

    setLoading(true, 'Generating Full Modular Print Kit (.ZIP)...');
    try {
      var zip = new JSZip();
      var exporter = new THREE.STLExporter();
      var pwd = ((el('cryptex-password-input') || {}).value || 'SECRET').toUpperCase();

      // Export each separate individual mechanical part STL
      currentPartsList.forEach(function (part, idx) {
        var partGroup = new THREE.Group();
        partGroup.add(part.mesh.clone(true));
        partGroup.updateMatrixWorld(true);

        // Ground individual part
        var pBox = new THREE.Box3().setFromObject(partGroup);
        var pCen = new THREE.Vector3();
        pBox.getCenter(pCen);
        partGroup.position.set(-pCen.x, -pBox.min.y, -pCen.z);
        partGroup.updateMatrixWorld(true);

        var stlStr = exporter.parse(partGroup, { binary: true });
        var cleanName = (idx + 1).toString().padStart(2, '0') + '_' + part.name.replace(/[^a-zA-Z0-9_-]/g, '_') + '.stl';
        zip.file(cleanName, stlStr);
      });

      // Also include full combined assembly
      var fullStl = exporter.parse(currentCryptexMesh, { binary: true });
      zip.file('Cryptex_Full_Assembly_Combined.stl', fullStl);

      // Assembly Instructions Guide HTML
      var guideHtml = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cryptex 3D Assembly Manual</title>' +
        '<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:24px;line-height:1.6;background:#0f172a;color:#f8fafc;}' +
        'h1{color:#fbbf24;}h2{color:#38bdf8;border-bottom:1px solid #334155;padding-bottom:8px;}' +
        '.part-card{background:#1e293b;border:1px solid #334155;border-radius:8px;padding:12px;margin:10px 0;}' +
        '.pwd-badge{background:#d97706;color:#fff;padding:4px 12px;border-radius:6px;font-family:monospace;font-size:1.4rem;letter-spacing:4px;display:inline-block;margin:10px 0;}' +
        'ol li{margin:12px 0;}</style></head><body>' +
        '<h1>🔐 Da Vinci Password Cryptex - 3D Printing & Assembly Guide</h1>' +
        '<p>Congratulations on generating your custom 3D printable Da Vinci Cryptex puzzle!</p>' +
        '<h2>🔑 Programmed Unlock Password</h2>' +
        '<div class="pwd-badge">' + pwd + '</div>' +
        '<h2>📦 Included Modular 3D Printable Parts</h2>' +
        '<ol>' +
        currentPartsList.map(function(p){ return '<li class="part-card"><strong>' + p.name + '.stl</strong> — High precision mechanical print</li>'; }).join('') +
        '</ol>' +
        '<h2>🛠️ Step-by-Step Assembly Instructions</h2>' +
        '<ol>' +
        '<li><strong>Print all individual STL files:</strong> Recommended layer height 0.16mm or 0.20mm, 20% infill, 3 perimeters for strength.</li>' +
        '<li><strong>Prepare the Inner Core:</strong> Lightly sand the longitudinal keyway channel so the tumbler lugs slide effortlessly.</li>' +
        '<li><strong>Slide Tumbler Rings onto Core:</strong> Slide Ring 1 through Ring ' + pwd.length + ' sequentially over the core. Ensure each secret letter aligns with the top alignment guide notch.</li>' +
        '<li><strong>Insert Secret Scroll:</strong> Place your rolled message or treasure inside the hollow core capsule.</li>' +
        '<li><strong>Screw on End Caps:</strong> Fasten the front beveled cap and rear locking ring.</li>' +
        '<li><strong>Lock the Cryptex:</strong> Spin the dial rings to scramble the password. The chamber is now securely locked!</li>' +
        '</ol></body></html>';

      zip.file('Assembly_Instructions.html', guideHtml);

      var content = await zip.generateAsync({ type: 'blob' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(content);
      a.download = 'Cryptex_' + pwd + '_Modular_Print_Kit.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      showMsg((window.I18N && I18N.t) ? I18N.t('toastCryptexZipExported') : 'Full modular Cryptex print kit (.ZIP) exported with all separate parts STLs!', 'success');
    } catch (err) {
      console.error(err);
      showMsg('ZIP Export Error: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function doExport(fmt) {
    if (!currentCryptexMesh) { showMsg('Please generate a Cryptex model first!', 'warning'); return; }
    setLoading(true, 'Exporting ' + fmt.toUpperCase() + '...');
    try {
      if (fmt === '3mf' && window.ModelConverters && ModelConverters.export3MF) {
        var r3 = await ModelConverters.export3MF(currentCryptexMesh, 'Cryptex_Mechanical_Assembly');
        ModelConverters.triggerDownload(r3.blob, r3.filename);
        showMsg('Multi-Color 3MF exported!', 'success');
        return;
      }
      var r = await ModelConverters.exportModel(currentCryptexMesh, fmt, 'cryptex_puzzle');
      ModelConverters.triggerDownload(r.blob, r.filename);
      showMsg('Exported ' + fmt.toUpperCase() + ' successfully!', 'success');
    } catch (e) {
      showMsg('Export error: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function init() {
    wireSlider('cryptex-diam-slider', 'cryptex-diam-val');
    wireSlider('cryptex-tol-slider', 'cryptex-tol-val');
    wireSlider('cryptex-explode-slider', 'cryptex-explode-val');

    var typeSel = el('cryptex-type-select');
    if (typeSel) {
      typeSel.addEventListener('change', function () {
        var pwdGroup = el('cryptex-password-group');
        if (pwdGroup) pwdGroup.style.display = (typeSel.value === 'password') ? 'block' : 'none';
        generateCryptex();
      });
    }

    var viewSel = el('cryptex-view-select');
    if (viewSel) {
      viewSel.addEventListener('change', function () {
        var expGroup = el('cryptex-explode-group');
        if (expGroup) expGroup.style.display = (viewSel.value === 'exploded') ? 'block' : 'none';
        generateCryptex();
      });
    }

    var pwdInput = el('cryptex-password-input');
    if (pwdInput) {
      pwdInput.addEventListener('input', function () {
        generateCryptex();
      });
    }

    var gb = el('btn-generate-cryptex');
    if (gb) gb.addEventListener('click', generateCryptex);

    var ezip = el('btn-export-cryptex-zip');
    if (ezip) ezip.addEventListener('click', exportModularKitZip);
    var estl = el('btn-export-cryptex-stl');
    if (estl) estl.addEventListener('click', function () { doExport('stl'); });
    var eglb = el('btn-export-cryptex-glb');
    if (eglb) eglb.addEventListener('click', function () { doExport('glb'); });
    var e3mf = el('btn-export-cryptex-3mf');
    if (e3mf) e3mf.addEventListener('click', function () { doExport('3mf'); });
    var ehtml = el('btn-export-cryptex-html');
    if (ehtml) ehtml.addEventListener('click', function () { doExport('html'); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  window.__cryptexEngine = { generate: generateCryptex, exportZIP: exportModularKitZip };
})();
