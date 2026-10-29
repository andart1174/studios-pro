/**
 * PolyMorph 3D Studio - Mask Studio Engine (Tab: 🎭 Mask Studio)
 * Generates custom 3D printable wearable and decorative masks:
 * Venetian Masquerade, Superhero Eye Mask, Samurai Oni Mempo,
 * Kitsune/Cat Mask, Cyberpunk Respirator, and Tribal Ritual Mask.
 */
(function () {
  'use strict';
  var currentMaskMesh = null;

  function el(id) { return document.getElementById(id); }
  function showMsg(msg, type) {
    if (typeof showToast === 'function') showToast(msg, type || 'info');
    else console.log('[Mask]', msg);
  }
  function setLoading(on, txt) {
    var ov = el('loading-overlay'), lb = el('loading-text');
    if (!ov) return;
    if (on) { if (lb) lb.textContent = txt || 'Sculpting Ergonomic 3D Mask...'; ov.classList.add('visible'); }
    else { ov.classList.remove('visible'); }
  }

  function pushModel(mesh, name) {
    currentMaskMesh = mesh;
    if (typeof window.__polymorphSetModel === 'function') {
      window.__polymorphSetModel(mesh, name);
      return;
    }
    document.dispatchEvent(new CustomEvent('mask3dReady', { detail: { mesh: mesh, name: name } }));
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
      generateMask();
    });
    upd();
  }

  function buildMaskModel(p) {
    var T = window.THREE;
    var type = p.type || 'venetian';
    var width = p.width || 155; // mm
    var depth = p.depth || 55; // mm curvature
    var wall = p.wall || 3.0; // mm
    var eyeStyle = p.eyeStyle || 'almond';
    var strapSlots = p.strapSlots !== false;
    var materialStyle = p.materialStyle || 'porcelain';

    var grp = new T.Group();
    grp.name = 'Mask_3D_' + type;

    // Materials
    var mainColor = 0xf8fafc;
    var rough = 0.35, metal = 0.05;
    if (materialStyle === 'gold') { mainColor = 0xd4af37; rough = 0.22; metal = 0.9; }
    else if (materialStyle === 'obsidian') { mainColor = 0x0f172a; rough = 0.15; metal = 0.85; }
    else if (materialStyle === 'cyber') { mainColor = 0x22d3ee; rough = 0.18; metal = 0.75; }
    else if (materialStyle === 'wood') { mainColor = 0x78350f; rough = 0.75; metal = 0.02; }
    else if (materialStyle === 'crimson') { mainColor = 0x991b1b; rough = 0.3; metal = 0.4; }

    var maskMat = new T.MeshStandardMaterial({
      color: mainColor,
      roughness: rough,
      metalness: metal,
      side: T.DoubleSide
    });

    var goldFiligreeMat = new T.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.2,
      metalness: 0.95,
      side: T.DoubleSide
    });

    var cyberAccentMat = new T.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00a8ff,
      emissiveIntensity: 0.6,
      roughness: 0.1,
      metalness: 0.8
    });

    var halfW = width / 2.0;

    // ── 1. VENETIAN / BAUTA MASQUERADE ──────────────────────────────────────
    if (type === 'venetian') {
      var rows = 32, cols = 32;
      var geom = new T.BufferGeometry();
      var pos = [];
      var uvs = [];
      var indices = [];

      for (var r = 0; r <= rows; r++) {
        var v = r / rows; // 0 (top forehead) to 1 (chin)
        var y = (0.5 - v) * (width * 0.95);
        
        // Face width varies by height
        var rowW = halfW * (1.0 - 0.35 * Math.pow(v - 0.25, 2));
        if (v > 0.75) rowW *= (1.0 - (v - 0.75) * 1.6); // Taper to chin

        for (var c = 0; c <= cols; c++) {
          var u = c / cols; // 0 to 1
          var x = (u - 0.5) * 2 * rowW;
          var xNorm = (u - 0.5) * 2; // -1 to 1

          // Curvature / Ergonomic Face Profile
          var z = Math.cos(xNorm * Math.PI * 0.45) * depth;
          z -= Math.pow(v - 0.5, 2) * (depth * 0.35); // Nose bridge protrusion

          // Nose bridge bump
          if (Math.abs(xNorm) < 0.18 && v > 0.3 && v < 0.65) {
            var noseFactor = (1 - Math.abs(xNorm) / 0.18) * Math.sin((v - 0.3) / 0.35 * Math.PI);
            z += noseFactor * 14;
          }

          // Eye cutouts offset
          var inLeftEye = (xNorm > -0.65 && xNorm < -0.22 && v > 0.32 && v < 0.46);
          var inRightEye = (xNorm > 0.22 && xNorm < 0.65 && v > 0.32 && v < 0.46);
          if ((inLeftEye || inRightEye) && eyeStyle !== 'solid') {
            z -= 6; // recessed or open
          }

          pos.push(x, y, z);
          uvs.push(u, v);
        }
      }

      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var a = r * (cols + 1) + c;
          var b = (r + 1) * (cols + 1) + c;
          var c1 = (r + 1) * (cols + 1) + c + 1;
          var d = r * (cols + 1) + c + 1;

          var vMid = (r + 0.5) / rows;
          var uMid = (c + 0.5) / cols;
          var xN = (uMid - 0.5) * 2;
          var inEye = ((xN > -0.62 && xN < -0.25) || (xN > 0.25 && xN < 0.62)) && (vMid > 0.34 && vMid < 0.44);

          if (!inEye || eyeStyle === 'solid') {
            indices.push(a, b, d);
            indices.push(b, c1, d);
          }
        }
      }

      geom.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      geom.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
      geom.setIndex(indices);
      geom.computeVertexNormals();

      var mainMesh = new T.Mesh(geom, maskMat);
      grp.add(mainMesh);

      // Gold baroque filigree brow & eye rims
      var browCurve = new T.CatmullRomCurve3([
        new T.Vector3(-halfW * 0.85, width * 0.3, 5),
        new T.Vector3(-halfW * 0.4, width * 0.38, depth * 0.7),
        new T.Vector3(0, width * 0.42, depth * 0.9),
        new T.Vector3(halfW * 0.4, width * 0.38, depth * 0.7),
        new T.Vector3(halfW * 0.85, width * 0.3, 5)
      ]);
      var browMesh = new T.Mesh(new T.TubeGeometry(browCurve, 32, 2.2, 8, false), goldFiligreeMat);
      grp.add(browMesh);

    // ── 2. SUPERHERO EYE MASK ──────────────────────────────────────────────
    } else if (type === 'hero') {
      var heroShape = new T.Shape();
      heroShape.moveTo(-halfW * 0.9, -5);
      heroShape.quadraticCurveTo(-halfW * 0.6, 25, 0, 18); // top brow arch
      heroShape.quadraticCurveTo(halfW * 0.6, 25, halfW * 0.9, -5);
      heroShape.quadraticCurveTo(halfW * 0.5, -30, 0, -14); // nose notch
      heroShape.quadraticCurveTo(-halfW * 0.5, -30, -halfW * 0.9, -5);

      // Eye cutout holes
      var leftEye = new T.Path();
      leftEye.moveTo(-halfW * 0.65, 0);
      leftEye.quadraticCurveTo(-halfW * 0.42, 14, -halfW * 0.22, 2);
      leftEye.quadraticCurveTo(-halfW * 0.42, -12, -halfW * 0.65, 0);
      heroShape.holes.push(leftEye);

      var rightEye = new T.Path();
      rightEye.moveTo(halfW * 0.65, 0);
      rightEye.quadraticCurveTo(halfW * 0.42, 14, halfW * 0.22, 2);
      rightEye.quadraticCurveTo(halfW * 0.42, -12, halfW * 0.65, 0);
      heroShape.holes.push(rightEye);

      var extrudeSettings = { depth: wall, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 1.2, bevelThickness: 1.2 };
      var heroGeo = new T.ExtrudeGeometry(heroShape, extrudeSettings);

      // Bend along facial curvature
      var hPos = heroGeo.attributes.position;
      for (var i = 0; i < hPos.count; i++) {
        var hx = hPos.getX(i);
        var curfZ = Math.cos((hx / halfW) * Math.PI * 0.42) * depth * 0.75;
        hPos.setZ(i, hPos.getZ(i) + curfZ);
      }
      hPos.needsUpdate = true;
      heroGeo.computeVertexNormals();

      var heroMesh = new T.Mesh(heroGeo, maskMat);
      grp.add(heroMesh);

    // ── 3. SAMURAI ONI HALF-MASK (MEMPO) ───────────────────────────────────
    } else if (type === 'oni') {
      var oniGeo = new T.CylinderGeometry(halfW * 0.85, halfW * 0.65, width * 0.65, 32, 16, true, Math.PI * 0.1, Math.PI * 0.8);
      var oPos = oniGeo.attributes.position;
      for (var oi = 0; oi < oPos.count; oi++) {
        var ox = oPos.getX(oi), oy = oPos.getY(oi), oz = oPos.getZ(oi);
        // Snout & menacing grimace protrusion
        if (Math.abs(ox) < halfW * 0.4 && oy > -10 && oy < 25) {
          oz += Math.cos((ox / (halfW * 0.4)) * Math.PI * 0.5) * 16;
        }
        oPos.setXYZ(oi, ox, oy, oz);
      }
      oPos.needsUpdate = true;
      oniGeo.computeVertexNormals();

      var oniMesh = new T.Mesh(oniGeo, maskMat);
      grp.add(oniMesh);

      // Fearsome Oni Fangs & Teeth
      for (var f = -2; f <= 2; f++) {
        if (f === 0) continue;
        var fangH = (Math.abs(f) === 1) ? 18 : 12;
        var fangGeo = new T.ConeGeometry(3.2, fangH, 8);
        fangGeo.rotateX(Math.PI);
        var fang = new T.Mesh(fangGeo, goldFiligreeMat);
        fang.position.set(f * 11, -8, depth * 0.85);
        grp.add(fang);
      }

      // Nose guard mustache plate
      var noseGuard = new T.Mesh(new T.BoxGeometry(halfW * 0.8, 8, 12), goldFiligreeMat);
      noseGuard.position.set(0, 16, depth * 0.8);
      grp.add(noseGuard);

    // ── 4. KITSUNE / ANIMAL BEAST MASK ──────────────────────────────────────
    } else if (type === 'animal') {
      var animalGeo = new T.SphereGeometry(halfW, 32, 24, 0, Math.PI, 0, Math.PI * 0.7);
      animalGeo.scale(1.0, 1.15, 0.65);
      animalGeo.rotateX(-Math.PI / 2);
      var aMesh = new T.Mesh(animalGeo, maskMat);
      grp.add(aMesh);

      // Pointed Fox Ears
      for (var s of [-1, 1]) {
        var earGeo = new T.ConeGeometry(18, 38, 4);
        earGeo.scale(1.0, 1.0, 0.45);
        var earMesh = new T.Mesh(earGeo, goldFiligreeMat);
        earMesh.position.set(s * halfW * 0.6, width * 0.55, depth * 0.2);
        earMesh.rotation.z = s * -0.35;
        grp.add(earMesh);
      }

      // Snout
      var snoutGeo = new T.ConeGeometry(14, 30, 16);
      snoutGeo.rotateX(Math.PI / 2);
      var snout = new T.Mesh(snoutGeo, maskMat);
      snout.position.set(0, -width * 0.15, depth * 0.7);
      grp.add(snout);

      // Red nose tip
      var noseTip = new T.Mesh(new T.SphereGeometry(4, 12, 12), goldFiligreeMat);
      noseTip.position.set(0, -width * 0.15, depth * 0.7 + 15);
      grp.add(noseTip);

    // ── 5. CYBERPUNK RESPIRATOR HALF-MASK ──────────────────────────────────
    } else if (type === 'cyber') {
      var cyberHull = new T.BoxGeometry(halfW * 1.5, width * 0.55, depth * 0.75);
      var cHullMesh = new T.Mesh(cyberHull, maskMat);
      cHullMesh.position.set(0, 0, depth * 0.35);
      grp.add(cHullMesh);

      // Dual Filtration Canister Ports
      for (var cs of [-1, 1]) {
        var canGeo = new T.CylinderGeometry(18, 18, 22, 24);
        canGeo.rotateZ(Math.PI / 2);
        var canMesh = new T.Mesh(canGeo, goldFiligreeMat);
        canMesh.position.set(cs * (halfW * 0.8), -6, depth * 0.55);
        grp.add(canMesh);

        var ledRing = new T.Mesh(new T.TorusGeometry(17, 1.8, 8, 24), cyberAccentMat);
        ledRing.position.set(cs * (halfW * 0.8 + 11), -6, depth * 0.55);
        ledRing.rotation.y = Math.PI / 2;
        grp.add(ledRing);
      }

      // Center intake grill slats
      for (var sl = -3; sl <= 3; sl++) {
        var slat = new T.Mesh(new T.BoxGeometry(24, 2.5, 6), cyberAccentMat);
        slat.position.set(0, sl * 6 - 5, depth * 0.75);
        grp.add(slat);
      }

    // ── 6. TRIBAL RITUAL MASK ──────────────────────────────────────────────
    } else {
      var tribalShape = new T.Shape();
      tribalShape.moveTo(-halfW * 0.7, width * 0.6);
      tribalShape.lineTo(halfW * 0.7, width * 0.6);
      tribalShape.lineTo(halfW * 0.85, width * 0.2);
      tribalShape.lineTo(halfW * 0.45, -width * 0.5);
      tribalShape.lineTo(0, -width * 0.65);
      tribalShape.lineTo(-halfW * 0.45, -width * 0.5);
      tribalShape.lineTo(-halfW * 0.85, width * 0.2);
      tribalShape.closePath();

      var trGeo = new T.ExtrudeGeometry(tribalShape, { depth: wall * 1.5, bevelEnabled: true, bevelSize: 2 });
      var trPos = trGeo.attributes.position;
      for (var ti = 0; ti < trPos.count; ti++) {
        var tx = trPos.getX(ti);
        trPos.setZ(ti, trPos.getZ(ti) + Math.cos((tx / halfW) * Math.PI * 0.4) * depth * 0.6);
      }
      trPos.needsUpdate = true;
      trGeo.computeVertexNormals();
      var trMesh = new T.Mesh(trGeo, maskMat);
      grp.add(trMesh);

      // Geometric Forehead Horns / Crown Plumes
      for (var p = -2; p <= 2; p++) {
        var pMesh = new T.Mesh(new T.ConeGeometry(5, 25, 4), goldFiligreeMat);
        pMesh.position.set(p * 18, width * 0.68, depth * 0.3);
        grp.add(pMesh);
      }
    }

    // ── STRAP MOUNTING SLOTS ────────────────────────────────────────────────
    if (strapSlots) {
      for (var ss of [-1, 1]) {
        var slotRing = new T.Mesh(new T.TorusGeometry(5, 1.8, 8, 16), goldFiligreeMat);
        slotRing.position.set(ss * (halfW * 0.95), 10, 4);
        slotRing.rotation.y = Math.PI / 2;
        grp.add(slotRing);
      }
    }

    // Grounding and centering
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

  function generateMask() {
    setLoading(true, 'Generating Ergonomic 3D Mask...');
    setTimeout(function () {
      try {
        var type = (el('mask-type-select') || {}).value || 'venetian';
        var width = parseFloat((el('mask-width-slider') || {}).value || 155);
        var depth = parseFloat((el('mask-depth-slider') || {}).value || 55);
        var wall = parseFloat((el('mask-wall-slider') || {}).value || 3.0);
        var eyeStyle = (el('mask-eye-select') || {}).value || 'almond';
        var strapSlots = !!(el('mask-strap-toggle') || {}).checked;
        var materialStyle = (el('mask-mat-select') || {}).value || 'porcelain';

        var p = {
          type: type,
          width: width,
          depth: depth,
          wall: wall,
          eyeStyle: eyeStyle,
          strapSlots: strapSlots,
          materialStyle: materialStyle
        };

        var model = buildMaskModel(p);
        pushModel(model, 'mask_' + type);
        showMsg((window.I18N && I18N.t) ? I18N.t('toastMaskGenerated') : '3D Mask sculpted successfully!', 'success');
      } catch (err) {
        console.error(err);
        showMsg('Error: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    }, 40);
  }

  async function doExport(fmt) {
    if (!currentMaskMesh) { showMsg('Please generate a 3D Mask first!', 'warning'); return; }
    setLoading(true, 'Exporting ' + fmt.toUpperCase() + '...');
    try {
      if (fmt === '3mf' && window.ModelConverters && ModelConverters.export3MF) {
        var r3 = await ModelConverters.export3MF(currentMaskMesh, 'Mask_Studio_Model');
        ModelConverters.triggerDownload(r3.blob, r3.filename);
        showMsg('Multi-Color 3MF exported!', 'success');
        return;
      }
      var r = await ModelConverters.exportModel(currentMaskMesh, fmt, 'mask_model');
      ModelConverters.triggerDownload(r.blob, r.filename);
      showMsg('Exported ' + fmt.toUpperCase() + ' successfully!', 'success');
    } catch (e) {
      showMsg('Export error: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function init() {
    wireSlider('mask-width-slider', 'mask-width-val');
    wireSlider('mask-depth-slider', 'mask-depth-val');
    wireSlider('mask-wall-slider', 'mask-wall-val');

    var typeSel = el('mask-type-select');
    if (typeSel) typeSel.addEventListener('change', generateMask);
    var eyeSel = el('mask-eye-select');
    if (eyeSel) eyeSel.addEventListener('change', generateMask);
    var matSel = el('mask-mat-select');
    if (matSel) matSel.addEventListener('change', generateMask);
    var strapTog = el('mask-strap-toggle');
    if (strapTog) strapTog.addEventListener('change', generateMask);

    var gb = el('btn-generate-mask');
    if (gb) gb.addEventListener('click', generateMask);

    var estl = el('btn-export-mask-stl');
    if (estl) estl.addEventListener('click', function () { doExport('stl'); });
    var eglb = el('btn-export-mask-glb');
    if (eglb) eglb.addEventListener('click', function () { doExport('glb'); });
    var e3mf = el('btn-export-mask-3mf');
    if (e3mf) e3mf.addEventListener('click', function () { doExport('3mf'); });
    var ehtml = el('btn-export-mask-html');
    if (ehtml) ehtml.addEventListener('click', function () { doExport('html'); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  window.__maskEngine = { generate: generateMask };
})();
