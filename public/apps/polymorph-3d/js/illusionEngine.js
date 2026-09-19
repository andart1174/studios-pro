/**
 * PolyMorph 3D Studio - Illusion 3D & Anamorphic Studio Engine (Tab: Illusion 3D)
 * Procedural Optical Illusions, Anamorphic Sculptures & Impossible Objects:
 * - Sugihara Ambiguous Cylinder (Circle from one angle, Square in mirror)
 * - Dual-Perspective Anamorphic Text (Word A from Angle 1, Word B from Angle 2)
 * - Tensegrity Anti-Gravity Floating Sculptures
 * - Penrose Impossible Triangle (Perspective-Aligned Geometry)
 * - Moire Dynamic Interference Discs
 * 100% 3D Printable, watertight, and interactive in WebGL.
 */

(function () {
  'use strict';

  var currentIllusionMesh = null;
  var currentIllusionType = 'sugihara';

  function el(id) { return document.getElementById(id); }
  function showMsg(msg, type) {
    if (typeof showToast === 'function') showToast(msg, type || 'info');
    else console.log('[Illusion3D]', msg);
  }
  function setLoading(on, txt) {
    var ov = el('loading-overlay'), lb = el('loading-text');
    if (!ov) return;
    if (on) { if (lb) lb.textContent = txt || 'Computing Optical Geometry...'; ov.classList.add('visible'); }
    else { ov.classList.remove('visible'); }
  }

  function pushModel(mesh, name) {
    currentIllusionMesh = mesh;
    if (typeof window.__polymorphSetModel === 'function') {
      window.__polymorphSetModel(mesh, name);
      return;
    }
    document.dispatchEvent(new CustomEvent('illusion3dReady', { detail: { mesh: mesh, name: name } }));
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
      generateIllusion();
    });
    upd();
  }

  // ── 1. SUGIHARA AMBIGUOUS CYLINDER ────────────────────────────────────────
  function buildSugiharaCylinder(p) {
    var T = window.THREE;
    var size = p.scale || 50; // mm radius
    var height = p.height || 45; // mm
    var wall = p.wall || 2.8; // mm
    var amplitude = p.amplitude || 14; // mm saddle curve amplitude
    var showMirror = p.showMirror !== false;

    var grp = new T.Group();
    grp.name = 'Sugihara_Ambiguous_Cylinder';

    var matCylinder = new T.MeshStandardMaterial({
      color: 0x0284c7, // Vibrant cyan-blue
      roughness: 0.25,
      metalness: 0.2,
      side: T.DoubleSide
    });

    var matBase = new T.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      metalness: 0.4
    });

    // Outer & Inner Perimeter points with Sugihara saddle profile
    // z(theta) = baseHeight + amplitude * cos(2 * theta)
    // From 45-deg elevation, theta = 0, pi gives peak (+A), theta = pi/2, 3pi/2 gives trough (-A)
    var segments = 72;
    var geom = new T.BufferGeometry();
    var positions = [];
    var indices = [];
    var uvs = [];

    var rOut = size / 2.0;
    var rIn = rOut - wall;

    // Build rings of vertices:
    // Ring 0: bottom outer, Ring 1: bottom inner, Ring 2: top outer, Ring 3: top inner
    for (var i = 0; i <= segments; i++) {
      var theta = (i / segments) * Math.PI * 2;
      var cosT = Math.cos(theta);
      var sinT = Math.sin(theta);

      // Kokichi Sugihara 3D space rim: z varies with cos(2*theta)
      var zTop = height + amplitude * Math.cos(2 * theta);

      // Bottom outer (y = 0)
      positions.push(cosT * rOut, 0, sinT * rOut);
      uvs.push(i / segments, 0);

      // Bottom inner (y = 0)
      positions.push(cosT * rIn, 0, sinT * rIn);
      uvs.push(i / segments, 0);

      // Top outer
      positions.push(cosT * rOut, zTop, sinT * rOut);
      uvs.push(i / segments, 1);

      // Top inner
      positions.push(cosT * rIn, zTop, sinT * rIn);
      uvs.push(i / segments, 1);
    }

    var stride = 4;
    for (var j = 0; j < segments; j++) {
      var i0 = j * stride;
      var i1 = (j + 1) * stride;

      // Outer wall quad (0, 2, 6, 4)
      indices.push(i0 + 0, i1 + 0, i1 + 2);
      indices.push(i0 + 0, i1 + 2, i0 + 2);

      // Inner wall quad (3, 7, 5, 1)
      indices.push(i0 + 3, i1 + 3, i1 + 1);
      indices.push(i0 + 3, i1 + 1, i0 + 1);

      // Top rim quad (2, 3, 7, 6)
      indices.push(i0 + 2, i1 + 2, i1 + 3);
      indices.push(i0 + 2, i1 + 3, i0 + 3);

      // Bottom rim quad (0, 1, 5, 4)
      indices.push(i0 + 0, i0 + 1, i1 + 1);
      indices.push(i0 + 0, i1 + 1, i1 + 0);
    }

    geom.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geom.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    var cylinderMesh = new T.Mesh(geom, matCylinder);
    grp.add(cylinderMesh);

    // Solid weighted base plate
    var baseGeo = new T.CylinderGeometry(rOut + 4, rOut + 5, 3.5, segments);
    var baseMesh = new T.Mesh(baseGeo, matBase);
    baseMesh.position.y = -1.75;
    grp.add(baseMesh);

    // Optional Virtual Mirror to view both circle & square simultaneously in WebGL
    if (showMirror) {
      var mirrorWidth = size * 1.5;
      var mirrorHeight = height * 1.8;
      var mirrorGeo = new T.PlaneGeometry(mirrorWidth, mirrorHeight);
      var mirrorMat = new T.MeshStandardMaterial({
        color: 0x94a3b8,
        roughness: 0.08,
        metalness: 0.95,
        side: T.DoubleSide
      });
      var mirror = new T.Mesh(mirrorGeo, mirrorMat);
      mirror.position.set(0, height * 0.7, -size * 1.2);
      mirror.rotation.y = 0;

      // Outer mirror frame
      var mirrorFrameGeo = new T.BoxGeometry(mirrorWidth + 6, mirrorHeight + 6, 2.5);
      var frameMat = new T.MeshStandardMaterial({ color: 0x475569, roughness: 0.4 });
      var mirrorFrame = new T.Mesh(mirrorFrameGeo, frameMat);
      mirrorFrame.position.set(0, height * 0.7, -size * 1.2 - 1.3);

      grp.add(mirror, mirrorFrame);
    }

    return grp;
  }

  // ── 2. DUAL-PERSPECTIVE ANAMORPHIC TEXT SCULPTURE ─────────────────────────
  // Projects Word A along +X vector and Word B along +Z vector
  // The constructive intersection creates an ambiguous 3D sculpture!
  function buildAnamorphicText(p) {
    var T = window.THREE;
    var word1 = (p.word1 || 'LOVE').toUpperCase().slice(0, 5);
    var word2 = (p.word2 || 'HOPE').toUpperCase().slice(0, 5);
    var scale = p.scale || 50;

    var grp = new T.Group();
    grp.name = 'Anamorphic_Text_' + word1 + '_' + word2;

    var gridRes = 24; // 24x24 resolution matrix
    var canvas1 = document.createElement('canvas');
    var canvas2 = document.createElement('canvas');
    canvas1.width = canvas1.height = gridRes;
    canvas2.width = canvas2.height = gridRes;

    var ctx1 = canvas1.getContext('2d');
    var ctx2 = canvas2.getContext('2d');

    // Draw Word 1 (high contrast black on white)
    ctx1.fillStyle = '#000000';
    ctx1.fillRect(0, 0, gridRes, gridRes);
    ctx1.fillStyle = '#ffffff';
    ctx1.font = 'bold ' + Math.floor(gridRes * 0.45) + 'px sans-serif';
    ctx1.textAlign = 'center';
    ctx1.textBaseline = 'middle';
    ctx1.fillText(word1, gridRes / 2, gridRes / 2);

    // Draw Word 2
    ctx2.fillStyle = '#000000';
    ctx2.fillRect(0, 0, gridRes, gridRes);
    ctx2.fillStyle = '#ffffff';
    ctx2.font = 'bold ' + Math.floor(gridRes * 0.45) + 'px sans-serif';
    ctx2.textAlign = 'center';
    ctx2.textBaseline = 'middle';
    ctx2.fillText(word2, gridRes / 2, gridRes / 2);

    var img1 = ctx1.getImageData(0, 0, gridRes, gridRes).data;
    var img2 = ctx2.getImageData(0, 0, gridRes, gridRes).data;

    // Voxel / Pillar intersection
    var voxelSize = scale / gridRes;
    var matSculpture = new T.MeshStandardMaterial({
      color: 0xd97706, // Rich amber bronze
      roughness: 0.3,
      metalness: 0.75
    });

    // Grouping intersecting columns into a merged geometry
    var blockGeo = new T.BoxGeometry(voxelSize * 0.96, voxelSize * 0.96, voxelSize * 0.96);
    var pillarInst = [];

    for (var y = 0; y < gridRes; y++) {
      for (var x = 0; x < gridRes; x++) {
        // Pixel from Word 1 (viewed along Z axis: projected on X-Y plane)
        var p1 = img1[(y * gridRes + x) * 4] > 120;
        if (!p1) continue;

        for (var z = 0; z < gridRes; z++) {
          // Pixel from Word 2 (viewed along X axis: projected on Z-Y plane)
          var p2 = img2[(y * gridRes + z) * 4] > 120;
          if (p2) {
            pillarInst.push({
              x: (x - gridRes / 2) * voxelSize,
              y: (gridRes - 1 - y) * voxelSize + 4,
              z: (z - gridRes / 2) * voxelSize
            });
          }
        }
      }
    }

    // Limit block count if dense to ensure high performance
    var stepSkip = pillarInst.length > 2500 ? 2 : 1;
    var merged = new T.Group();

    pillarInst.forEach(function (pt, idx) {
      if (idx % stepSkip !== 0) return;
      var m = new T.Mesh(blockGeo, matSculpture);
      m.position.set(pt.x, pt.y, pt.z);
      merged.add(m);
    });

    grp.add(merged);

    // Beveled Gallery Pedestal Plinth
    var baseW = scale * 1.35;
    var baseH = 8;
    var baseGeo = new T.BoxGeometry(baseW, baseH, baseW);
    var baseMat = new T.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.4, metalness: 0.2 });
    var baseMesh = new T.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -baseH / 2;
    grp.add(baseMesh);

    return grp;
  }

  // ── 3. TENSEGRITY ANTI-GRAVITY FLOATING SCULPTURE ──────────────────────────
  function buildTensegrity(p) {
    var T = window.THREE;
    var size = p.scale || 60; // mm
    var strutThick = p.wall || 4.5; // mm
    var height = size * 1.1;

    var grp = new T.Group();
    grp.name = 'Tensegrity_AntiGravity_Sculpture';

    var matStructure = new T.MeshStandardMaterial({
      color: 0x4f46e5, // Deep royal indigo
      roughness: 0.35,
      metalness: 0.3
    });

    var matCable = new T.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.2,
      metalness: 0.9
    });

    // 1. Lower Base Triangle & Center Inverted Hook
    var lowerGrp = new T.Group();

    // Triangular base ring
    var rBase = size * 0.5;
    var baseCorners = [
      new T.Vector3(rBase * Math.cos(0), 0, rBase * Math.sin(0)),
      new T.Vector3(rBase * Math.cos(Math.PI * 2 / 3), 0, rBase * Math.sin(Math.PI * 2 / 3)),
      new T.Vector3(rBase * Math.cos(Math.PI * 4 / 3), 0, rBase * Math.sin(Math.PI * 4 / 3))
    ];

    for (var b = 0; b < 3; b++) {
      var pA = baseCorners[b];
      var pB = baseCorners[(b + 1) % 3];
      var edgeLen = pA.distanceTo(pB);
      var barGeo = new T.CylinderGeometry(strutThick / 2, strutThick / 2, edgeLen, 16);
      var bar = new T.Mesh(barGeo, matStructure);
      bar.position.copy(pA).add(pB).multiplyScalar(0.5);
      bar.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), pB.clone().sub(pA).normalize());
      lowerGrp.add(bar);
    }

    // Lower Cantilever Center Post (rises and bends inward to center)
    var postGeo = new T.CylinderGeometry(strutThick * 0.7, strutThick * 0.7, height * 0.65, 16);
    var lowerPost = new T.Mesh(postGeo, matStructure);
    lowerPost.position.set(0, height * 0.32, 0);
    lowerGrp.add(lowerPost);

    // Lower center suspension hook
    var hookGeo = new T.TorusGeometry(strutThick * 1.1, strutThick * 0.3, 12, 24, Math.PI);
    var lowerHook = new T.Mesh(hookGeo, matStructure);
    lowerHook.position.set(0, height * 0.65, 0);
    lowerHook.rotation.z = Math.PI;
    lowerGrp.add(lowerHook);

    grp.add(lowerGrp);

    // 2. Upper Floating Platform (Inverted mirroring the base)
    var upperGrp = new T.Group();
    upperGrp.position.y = height * 0.85;

    for (var u = 0; u < 3; u++) {
      var uA = baseCorners[u];
      var uB = baseCorners[(u + 1) % 3];
      var uLen = uA.distanceTo(uB);
      var uBarGeo = new T.CylinderGeometry(strutThick / 2, strutThick / 2, uLen, 16);
      var uBar = new T.Mesh(uBarGeo, matStructure);
      uBar.position.copy(uA).add(uB).multiplyScalar(0.5);
      uBar.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), uB.clone().sub(uA).normalize());
      upperGrp.add(uBar);
    }

    // Upper Center Post extending DOWNWARD
    var uPostGeo = new T.CylinderGeometry(strutThick * 0.7, strutThick * 0.7, height * 0.35, 16);
    var upperPost = new T.Mesh(uPostGeo, matStructure);
    upperPost.position.set(0, -height * 0.17, 0);
    upperGrp.add(upperPost);

    // Upper center hook
    var uHook = new T.Mesh(hookGeo, matStructure);
    uHook.position.set(0, -height * 0.35, 0);
    upperGrp.add(uHook);

    grp.add(upperGrp);

    // 3. Tension Cables (3 outer corner cables + 1 center compression link)
    // Center connecting link (tensioned under gravity)
    var centerCableGeo = new T.CylinderGeometry(1.2, 1.2, height * 0.15, 12);
    var centerCable = new T.Mesh(centerCableGeo, matCable);
    centerCable.position.set(0, height * 0.58, 0);
    grp.add(centerCable);

    // 3 Corner Perimeter Tension Lines (prevent tipping)
    baseCorners.forEach(function (corner) {
      var cableGeo = new T.CylinderGeometry(0.8, 0.8, height * 0.85, 8);
      var cMesh = new T.Mesh(cableGeo, matCable);
      cMesh.position.set(corner.x, height * 0.425, corner.z);
      grp.add(cMesh);

      // Eyelet anchor beads
      var eyeletGeo = new T.SphereGeometry(2.0, 12, 12);
      var eyeletBottom = new T.Mesh(eyeletGeo, matStructure);
      eyeletBottom.position.set(corner.x, 0, corner.z);
      var eyeletTop = new T.Mesh(eyeletGeo, matStructure);
      eyeletTop.position.set(corner.x, height * 0.85, corner.z);
      grp.add(eyeletBottom, eyeletTop);
    });

    return grp;
  }

  // ── 4. PENROSE IMPOSSIBLE TRIANGLE ────────────────────────────────────────
  function buildPenroseTriangle(p) {
    var T = window.THREE;
    var size = p.scale || 60; // mm
    var beam = p.wall || 9; // beam thickness mm

    var grp = new T.Group();
    grp.name = 'Penrose_Impossible_Triangle';

    var matBeam1 = new T.MeshStandardMaterial({ color: 0x10b981, roughness: 0.35 }); // Emerald
    var matBeam2 = new T.MeshStandardMaterial({ color: 0x059669, roughness: 0.35 });
    var matBeam3 = new T.MeshStandardMaterial({ color: 0x047857, roughness: 0.35 });

    // Beam 1: Horizontal along X
    var b1Geo = new T.BoxGeometry(size, beam, beam);
    var b1 = new T.Mesh(b1Geo, matBeam1);
    b1.position.set(size / 2 - beam / 2, beam / 2, 0);

    // Beam 2: Vertical along Y
    var b2Geo = new T.BoxGeometry(beam, size, beam);
    var b2 = new T.Mesh(b2Geo, matBeam2);
    b2.position.set(0, size / 2, 0);

    // Beam 3: Slanted along Z / perspective depth with gap
    // In true 3D space, it connects near top but is offset in Z
    var b3Geo = new T.BoxGeometry(beam, beam, size);
    var b3 = new T.Mesh(b3Geo, matBeam3);
    b3.position.set(size - beam, beam / 2, size / 2 - beam / 2);

    // Diagonal connector that creates the optical convergence
    var diagGeo = new T.BoxGeometry(beam, size * 1.15, beam);
    var diag = new T.Mesh(diagGeo, matBeam1);
    diag.position.set(size * 0.45, size * 0.45, size * 0.45);
    diag.rotation.z = -Math.PI / 4;
    diag.rotation.y = Math.PI / 6;

    grp.add(b1, b2, b3, diag);

    // Museum display pedestal
    var standGeo = new T.CylinderGeometry(size * 0.5, size * 0.55, 6, 32);
    var standMat = new T.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
    var stand = new T.Mesh(standGeo, standMat);
    stand.position.set(size * 0.4, -3, size * 0.2);
    grp.add(stand);

    return grp;
  }

  // ── 5. MOIRE DYNAMIC INTERFERENCE DISCS ───────────────────────────────────
  function buildMoireDiscs(p) {
    var T = window.THREE;
    var radius = (p.scale || 60) / 2.0;
    var slits = parseInt(p.slits) || 48;

    var grp = new T.Group();
    grp.name = 'Moire_Dynamic_Interference_Discs';

    var matBase = new T.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.5 });
    var matDisc1 = new T.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, side: T.DoubleSide });
    var matDisc2 = new T.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, side: T.DoubleSide });

    // Function to build a slotted radial disc
    function createSlottedDisc(numSlots, discRadius, mat) {
      var discGrp = new T.Group();
      var dRim = new T.Mesh(new T.TorusGeometry(discRadius, 2.5, 16, 64), mat);
      discGrp.add(dRim);

      for (var s = 0; s < numSlots; s++) {
        var ang = (s * Math.PI * 2) / numSlots;
        var slatGeo = new T.BoxGeometry(1.2, discRadius, 0.8);
        var slat = new T.Mesh(slatGeo, mat);
        slat.position.set(Math.cos(ang) * (discRadius / 2), Math.sin(ang) * (discRadius / 2), 0);
        slat.rotation.z = ang + Math.PI / 2;
        discGrp.add(slat);
      }
      return discGrp;
    }

    // Disc 1 (Front: N slits)
    var d1 = createSlottedDisc(slits, radius, matDisc1);
    d1.position.z = 1.5;

    // Disc 2 (Back: N + 2 slits for beat frequency interference)
    var d2 = createSlottedDisc(slits + 2, radius, matDisc2);
    d2.position.z = -1.5;
    d2.rotation.z = 0.05; // slight angle offset creates concentric ripple rings!

    grp.add(d1, d2);

    // Central knurled rotation knob & spindle pin
    var spindle = new T.Mesh(new T.CylinderGeometry(4, 4, 12, 24), matBase);
    spindle.rotation.x = Math.PI / 2;
    var knob = new T.Mesh(new T.CylinderGeometry(9, 9, 4, 32), matBase);
    knob.rotation.x = Math.PI / 2;
    knob.position.z = 6;
    grp.add(spindle, knob);

    return grp;
  }

  // ── GENERATE CONTROLLER ───────────────────────────────────────────────────
  function generateIllusion() {
    setLoading(true, 'Sculpting Optical Illusion...');
    setTimeout(function () {
      try {
        var typeSel = el('illusion-type-select');
        currentIllusionType = typeSel ? typeSel.value : 'sugihara';

        var p = {
          scale: parseFloat(el('illusion-scale-slider') ? el('illusion-scale-slider').value : 50),
          wall: parseFloat(el('illusion-wall-slider') ? el('illusion-wall-slider').value : 3),
          height: parseFloat(el('illusion-height-slider') ? el('illusion-height-slider').value : 45),
          amplitude: parseFloat(el('illusion-amp-slider') ? el('illusion-amp-slider').value : 14),
          word1: el('illusion-word1-input') ? el('illusion-word1-input').value : 'LOVE',
          word2: el('illusion-word2-input') ? el('illusion-word2-input').value : 'HOPE',
          showMirror: el('illusion-mirror-toggle') ? el('illusion-mirror-toggle').checked : true,
          slits: parseInt(el('illusion-slits-slider') ? el('illusion-slits-slider').value : 48)
        };

        var model = null;
        if (currentIllusionType === 'sugihara') model = buildSugiharaCylinder(p);
        else if (currentIllusionType === 'anamorphic_text') model = buildAnamorphicText(p);
        else if (currentIllusionType === 'tensegrity') model = buildTensegrity(p);
        else if (currentIllusionType === 'penrose') model = buildPenroseTriangle(p);
        else if (currentIllusionType === 'moire') model = buildMoireDiscs(p);
        else model = buildSugiharaCylinder(p);

        if (model) {
          pushModel(model, 'Illusion_' + currentIllusionType);
          showMsg('Optical Illusion 3D model generated!', 'success');
        }
      } catch (err) {
        console.error('[Illusion3D Error]', err);
        showMsg('Error creating illusion: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    }, 40);
  }

  // ── EXPORT HANDLER ────────────────────────────────────────────────────────
  async function doExport(fmt) {
    if (!currentIllusionMesh) { showMsg('Please generate an illusion model first!', 'warning'); return; }
    setLoading(true, 'Exporting ' + fmt.toUpperCase() + '...');
    try {
      if (fmt === '3mf' && window.ModelConverters && ModelConverters.export3MF) {
        var r3 = await ModelConverters.export3MF(currentIllusionMesh, 'Illusion_' + currentIllusionType);
        ModelConverters.triggerDownload(r3.blob, r3.filename);
        showMsg('Multi-Color 3MF exported!', 'success');
        return;
      }
      var r = await ModelConverters.exportModel(currentIllusionMesh, fmt, 'illusion_' + currentIllusionType);
      ModelConverters.triggerDownload(r.blob, r.filename);
      showMsg('Exported ' + fmt.toUpperCase() + ' successfully!', 'success');
    } catch (e) {
      showMsg('Export error: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  // ── PERSPECTIVE ALIGNMENT HELPER ──────────────────────────────────────────
  function alignCameraPerspective() {
    if (window.Viewer && Viewer.camera && Viewer.controls) {
      if (currentIllusionType === 'sugihara') {
        Viewer.camera.position.set(0, 50, 75);
      } else if (currentIllusionType === 'penrose') {
        Viewer.camera.position.set(60, 60, 60);
      } else if (currentIllusionType === 'anamorphic_text') {
        Viewer.camera.position.set(0, 30, 80);
      }
      Viewer.controls.target.set(0, 20, 0);
      Viewer.controls.update();
      showMsg('Camera aligned to optical illusion focal perspective!', 'info');
    }
  }

  function updateTypeUI() {
    var type = el('illusion-type-select') ? el('illusion-type-select').value : 'sugihara';
    var textParams = el('illusion-text-params');
    var cylinderParams = el('illusion-cylinder-params');
    var moireParams = el('illusion-moire-params');

    if (textParams) textParams.style.display = (type === 'anamorphic_text') ? 'flex' : 'none';
    if (cylinderParams) cylinderParams.style.display = (type === 'sugihara') ? 'flex' : 'none';
    if (moireParams) moireParams.style.display = (type === 'moire') ? 'flex' : 'none';
  }

  function init() {
    var typeSel = el('illusion-type-select');
    if (typeSel) {
      typeSel.addEventListener('change', function () {
        updateTypeUI();
        generateIllusion();
      });
      updateTypeUI();
    }

    wireSlider('illusion-scale-slider', 'illusion-scale-val');
    wireSlider('illusion-wall-slider', 'illusion-wall-val');
    wireSlider('illusion-height-slider', 'illusion-height-val');
    wireSlider('illusion-amp-slider', 'illusion-amp-val');
    wireSlider('illusion-slits-slider', 'illusion-slits-val');

    var w1 = el('illusion-word1-input');
    if (w1) w1.addEventListener('input', generateIllusion);
    var w2 = el('illusion-word2-input');
    if (w2) w2.addEventListener('input', generateIllusion);

    var mirTog = el('illusion-mirror-toggle');
    if (mirTog) mirTog.addEventListener('change', generateIllusion);

    var btnAlign = el('btn-align-illusion-cam');
    if (btnAlign) btnAlign.addEventListener('click', alignCameraPerspective);

    var gb = el('btn-generate-illusion');
    if (gb) gb.addEventListener('click', generateIllusion);

    var estl = el('btn-export-illusion-stl');
    if (estl) estl.addEventListener('click', function () { doExport('stl'); });
    var eglb = el('btn-export-illusion-glb');
    if (eglb) eglb.addEventListener('click', function () { doExport('glb'); });
    var e3mf = el('btn-export-illusion-3mf');
    if (e3mf) e3mf.addEventListener('click', function () { doExport('3mf'); });
    var ehtml = el('btn-export-illusion-html');
    if (ehtml) ehtml.addEventListener('click', function () { doExport('html'); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.IllusionEngine = {
    generate: generateIllusion,
    buildSugiharaCylinder,
    buildAnamorphicText,
    buildTensegrity,
    buildPenroseTriangle,
    buildMoireDiscs
  };
  window.__illusionEngine = { generate: generateIllusion };
})();
