/**
 * PolyMorph 3D Studio - GearMorph & Kinetic Automata Engine
 * Generates print-in-place planetary gearboxes, mechanical clock escapements,
 * flapping wing automata, and captive ball bearings.
 */
(function () {
  'use strict';
  var currentGearsMesh = null;

  function el(id) { return document.getElementById(id); }
  function showMsg(msg, type) {
    if (typeof showToast === 'function') showToast(msg, type || 'info');
    else console.log('[Gears]', msg);
  }
  function setLoading(on, txt) {
    var ov = el('loading-overlay'), lb = el('loading-text');
    if (!ov) return;
    if (on) { if (lb) lb.textContent = txt || 'Calculating Involute Gear Teeth...'; ov.classList.add('visible'); }
    else { ov.classList.remove('visible'); }
  }

  function pushModel(mesh, name) {
    currentGearsMesh = mesh;
    if (typeof window.__polymorphSetModel === 'function') {
      window.__polymorphSetModel(mesh, name);
      return;
    }
    document.dispatchEvent(new CustomEvent('gears3dReady', { detail: { mesh: mesh, name: name } }));
  }

  function wireSlider(sid, vid) {
    var s = el(sid), v = el(vid);
    if (!s || !v) return;
    function upd() {
      var step = parseFloat(s.step || 1);
      var decimals = step < 1 ? 1 : 0;
      v.textContent = parseFloat(s.value).toFixed(decimals) + (s.dataset.unit || '');
    }
    s.addEventListener('input', upd);
    upd();
  }

  function createGearGeometry(radius, teeth, thick, toothProfile) {
    var T = window.THREE;
    var shape = new T.Shape();
    var numPoints = teeth * 4;

    for (var i = 0; i < numPoints; i++) {
      var angle = (i / numPoints) * Math.PI * 2;
      var step = i % 4;
      var r = radius;
      if (step === 1 || step === 2) {
        r = radius + (toothProfile === 'herringbone' ? 3.5 : 2.8);
      }
      var gx = Math.cos(angle) * r;
      var gy = Math.sin(angle) * r;

      if (i === 0) shape.moveTo(gx, gy);
      else shape.lineTo(gx, gy);
    }
    shape.closePath();

    // Center axle hole
    var holePath = new T.Path();
    holePath.absarc(0, 0, radius * 0.25, 0, Math.PI * 2, true);
    shape.holes.push(holePath);

    var extrudeOpts = {
      depth: thick,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: toothProfile === 'herringbone' ? 4 : 1,
      bevelSize: 0.6,
      bevelThickness: 0.6
    };
    var geo = new T.ExtrudeGeometry(shape, extrudeOpts);
    geo.center();
    return geo;
  }

  function buildGearsMechanism(p) {
    var T = window.THREE;
    var type = p.type;
    var ratio = p.ratio;
    var toothType = p.toothType;
    var outDiam = p.diam;
    var radius = outDiam / 2.0;
    var thick = 12.0;

    var grp = new T.Group();
    grp.name = 'GearMorph_Kinetic_Assembly';

    var sunMat = new T.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.8, roughness: 0.25 });
    var planetMat = new T.MeshStandardMaterial({ color: 0x10b981, metalness: 0.8, roughness: 0.25 });
    var ringMat = new T.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.2 });
    var brassMat = new T.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.2 });

    // ── CASE 1: PRINT-IN-PLACE PLANETARY GEARBOX ────────────────────────────
    if (type === 'planetary') {
      var ringR = radius;
      var sunR = radius / (ratio > 6 ? 4 : 3);
      var planetR = (ringR - sunR) / 2.0;
      var numPlanets = 3;

      // 1. Central Sun Gear
      var sunGeo = createGearGeometry(sunR, Math.round(sunR * 0.8), thick, toothType);
      var sunMesh = new T.Mesh(sunGeo, sunMat);
      grp.add(sunMesh);

      // Central Hex Input Shaft
      var shaftGeo = new T.CylinderGeometry(4, 4, thick + 10, 6);
      var shaft = new T.Mesh(shaftGeo, brassMat);
      shaft.rotation.x = Math.PI / 2;
      grp.add(shaft);

      // 2. Three Planet Gears
      var orbitR = sunR + planetR;
      for (var k = 0; k < numPlanets; k++) {
        var pAngle = (k * Math.PI * 2) / numPlanets;
        var pGeo = createGearGeometry(planetR, Math.round(planetR * 0.8), thick, toothType);
        var pMesh = new T.Mesh(pGeo, planetMat);
        pMesh.position.set(Math.cos(pAngle) * orbitR, Math.sin(pAngle) * orbitR, 0);
        grp.add(pMesh);

        // Planet Carrier Axle Pins
        var pPin = new T.Mesh(new T.CylinderGeometry(2.5, 2.5, thick + 4, 16), brassMat);
        pPin.position.set(Math.cos(pAngle) * orbitR, Math.sin(pAngle) * orbitR, 0);
        pPin.rotation.x = Math.PI / 2;
        grp.add(pPin);
      }

      // 3. Outer Ring Gear Housing (Enclosing Ring)
      var ringGeo = new T.RingGeometry(ringR - 2, ringR + 6, 32);
      var ringWall = new T.Mesh(new T.CylinderGeometry(ringR + 6, ringR + 6, thick + 2, 32, 1, true), ringMat);
      ringWall.rotation.x = Math.PI / 2;
      grp.add(ringWall);

    // ── CASE 2: TOURBILLON & CLOCKWORK ESCAPEMENT ───────────────────────────
    } else if (type === 'escapement') {
      // Escape Wheel with 15 ratchet teeth
      var escGeo = createGearGeometry(radius * 0.65, 15, 4, 'spur');
      var escMesh = new T.Mesh(escGeo, brassMat);
      grp.add(escMesh);

      // Anchor Pallet Fork (Ticking mechanism)
      var anchorShape = new T.Shape();
      anchorShape.moveTo(-12, 18);
      anchorShape.lineTo(0, 24);
      anchorShape.lineTo(12, 18);
      anchorShape.lineTo(4, 32);
      anchorShape.lineTo(-4, 32);
      anchorShape.closePath();

      var anchorGeo = new T.ExtrudeGeometry(anchorShape, { depth: 4, bevelEnabled: false });
      var anchorMesh = new T.Mesh(anchorGeo, ringMat);
      anchorMesh.position.set(0, radius * 0.6, -2);
      grp.add(anchorMesh);

      // Balance Wheel with 3 spokes
      var balRing = new T.Mesh(new T.TorusGeometry(radius * 0.85, 2.4, 12, 32), brassMat);
      balRing.position.z = 8;
      grp.add(balRing);

      for (var sp = 0; sp < 3; sp++) {
        var spokeAngle = (sp * Math.PI * 2) / 3;
        var spoke = new T.Mesh(new T.BoxGeometry(radius * 1.6, 2.2, 2.2), brassMat);
        spoke.position.z = 8;
        spoke.rotation.z = spokeAngle;
        grp.add(spoke);
      }

    // ── CASE 3: KINETIC FLAPPING WING AUTOMATA ──────────────────────────────
    } else if (type === 'automata') {
      var basePlaque = new T.Mesh(new T.BoxGeometry(radius * 1.6, radius * 1.2, 8), ringMat);
      basePlaque.position.z = -25;
      grp.add(basePlaque);

      // Cam Shaft and Crank Handle
      var crankShaft = new T.Mesh(new T.CylinderGeometry(3, 3, radius * 1.5, 16), brassMat);
      crankShaft.position.set(0, -10, 0);
      crankShaft.rotation.z = Math.PI / 2;
      grp.add(crankShaft);

      // Flapping Wings
      for (var w = -1; w <= 1; w += 2) {
        var wingShape = new T.Shape();
        wingShape.moveTo(0, 0);
        wingShape.bezierCurveTo(w * radius * 0.6, 25, w * radius * 1.4, 15, w * radius * 1.6, 0);
        wingShape.bezierCurveTo(w * radius * 1.0, -15, w * radius * 0.4, -10, 0, 0);

        var wingGeo = new T.ExtrudeGeometry(wingShape, { depth: 2, bevelEnabled: true, bevelSize: 0.5, bevelThickness: 0.5 });
        var wingMesh = new T.Mesh(wingGeo, sunMat);
        wingMesh.position.set(w * 8, 15, 5);
        wingMesh.rotation.y = w * 0.35;
        grp.add(wingMesh);
      }

    // ── CASE 4: PRINT-IN-PLACE CAPTIVE BALL BEARING ─────────────────────────
    } else {
      var ir = radius * 0.5, orad = radius;
      var ballCount = 8;
      var ballR = (orad - ir) / 3.2;

      // Inner Race Ring
      var innerRace = new T.Mesh(new T.CylinderGeometry(ir, ir, thick, 32), brassMat);
      innerRace.rotation.x = Math.PI / 2;
      grp.add(innerRace);

      // Outer Race Ring
      var outerRace = new T.Mesh(new T.CylinderGeometry(orad + 4, orad + 4, thick, 32, 1, true), ringMat);
      outerRace.rotation.x = Math.PI / 2;
      grp.add(outerRace);

      // Captive Ball Spheres
      var raceMidR = (ir + orad) / 2.0;
      for (var b = 0; b < ballCount; b++) {
        var bAngle = (b * Math.PI * 2) / ballCount;
        var ballMesh = new T.Mesh(new T.SphereGeometry(ballR, 16, 16), sunMat);
        ballMesh.position.set(Math.cos(bAngle) * raceMidR, Math.sin(bAngle) * raceMidR, 0);
        grp.add(ballMesh);
      }
    }

    return grp;
  }

  function generateGears() {
    setLoading(true, 'Calculating Gear Ratios & Clearances...');
    setTimeout(function () {
      try {
        var type = (el('gears-type-select') || {}).value || 'planetary';
        var ratio = parseFloat((el('gears-ratio-slider') || {}).value || 4.0);
        var toothType = (el('gears-teeth-select') || {}).value || 'herringbone';
        var diam = parseFloat((el('gears-diam-slider') || {}).value || 70);

        var p = { type: type, ratio: ratio, toothType: toothType, diam: diam };
        var model = buildGearsMechanism(p);
        model.updateMatrixWorld(true);
        var box = new THREE.Box3().setFromObject(model);
        var cen = new THREE.Vector3();
        box.getCenter(cen);
        model.position.x = -cen.x;
        model.position.z = -cen.z;
        model.position.y = -box.min.y;
        model.updateMatrixWorld(true);

        pushModel(model, 'gears_' + type);
        showMsg((window.I18N && I18N.t) ? I18N.t('toastGearsGenerated') : 'Kinetic Gear Mechanism generated!', 'success');
      } catch (err) {
        console.error(err);
        showMsg('Error: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    }, 60);
  }

  async function doExport(fmt) {
    if (!currentGearsMesh) { showMsg('Please generate a Gear model first!', 'warning'); return; }
    setLoading(true, 'Exporting ' + fmt.toUpperCase() + '...');
    try {
      if (fmt === '3mf' && window.ModelConverters && ModelConverters.export3MF) {
        var r3 = await ModelConverters.export3MF(currentGearsMesh, 'GearMorph_Kinetic_Assembly');
        ModelConverters.triggerDownload(r3.blob, r3.filename);
        showMsg('Multi-Color 3MF exported!', 'success');
        return;
      }
      var r = await ModelConverters.exportModel(currentGearsMesh, fmt, 'gears_mechanism');
      ModelConverters.triggerDownload(r.blob, r.filename);
      showMsg('Exported ' + fmt.toUpperCase() + ' successfully!', 'success');
    } catch (e) {
      showMsg('Export error: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function init() {
    wireSlider('gears-ratio-slider', 'gears-ratio-val');
    wireSlider('gears-diam-slider', 'gears-diam-val');

    var typeSel = el('gears-type-select');
    if (typeSel) typeSel.addEventListener('change', generateGears);
    var teethSel = el('gears-teeth-select');
    if (teethSel) teethSel.addEventListener('change', generateGears);

    var gb = el('btn-generate-gears');
    if (gb) gb.addEventListener('click', generateGears);

    var estl = el('btn-export-gears-stl');
    if (estl) estl.addEventListener('click', function () { doExport('stl'); });
    var eglb = el('btn-export-gears-glb');
    if (eglb) eglb.addEventListener('click', function () { doExport('glb'); });
    var e3mf = el('btn-export-gears-3mf');
    if (e3mf) e3mf.addEventListener('click', function () { doExport('3mf'); });
    var ehtml = el('btn-export-gears-html');
    if (ehtml) ehtml.addEventListener('click', function () { doExport('html'); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  window.__gearEngine = { generate: generateGears };
})();
