/**
 * PolyMorph 3D Studio - Historical Antiquity & Artifact Studio Engine (Tab: 🏺 Historical Artifacts)
 * Generates museum-grade 3D replicas of ancient archaeological treasures:
 * Greek Attic Amphora Vases, Mesopotamian Cuneiform Clay Tablets,
 * Easter Island Moai Monolith Statues, and Roman Corinthian Column Capitals.
 */
(function () {
  'use strict';
  var currentArtifactMesh = null;

  function el(id) { return document.getElementById(id); }
  function showMsg(msg, type) {
    if (typeof showToast === 'function') showToast(msg, type || 'info');
    else console.log('[Artifact]', msg);
  }
  function setLoading(on, txt) {
    var ov = el('loading-overlay'), lb = el('loading-text');
    if (!ov) return;
    if (on) { if (lb) lb.textContent = txt || 'Reconstructing Historical Antiquity 3D Model...'; ov.classList.add('visible'); }
    else { ov.classList.remove('visible'); }
  }

  function pushModel(mesh, name) {
    currentArtifactMesh = mesh;
    if (typeof window.__polymorphSetModel === 'function') {
      window.__polymorphSetModel(mesh, name);
      return;
    }
    document.dispatchEvent(new CustomEvent('artifact3dReady', { detail: { mesh: mesh, name: name } }));
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
      generateArtifact();
    });
    upd();
  }

  function buildArtifactObject(p) {
    var T = window.THREE;
    var type = p.type || 'amphora';
    var height = parseFloat(p.height || 110); // mm
    var weathering = parseFloat(p.weathering || 1.8);
    var patina = p.patina || 'terracotta';
    var hasPlaque = p.hasPlaque !== false;
    var customLabel = p.customLabel || 'Athens, c. 520 BCE';

    var grp = new T.Group();
    grp.name = 'Artifact_' + type;

    // Museum Antiquity PBR Materials
    var col = 0xb45309, rough = 0.85, metal = 0.04;
    if (patina === 'bronze_verdigris') { col = 0x0f766e; rough = 0.75; metal = 0.45; }
    else if (patina === 'basalt_tuff') { col = 0x334155; rough = 0.92; metal = 0.05; }
    else if (patina === 'marble_travertine') { col = 0xe2e8f0; rough = 0.45; metal = 0.08; }
    else if (patina === 'ancient_gold') { col = 0xd4af37; rough = 0.28; metal = 0.88; }

    var artifactMat = new T.MeshStandardMaterial({ color: col, roughness: rough, metalness: metal, side: T.DoubleSide });
    var blackGlazeMat = new T.MeshStandardMaterial({ color: 0x09090b, roughness: 0.35, metalness: 0.15, side: T.DoubleSide });
    var goldInlayMat = new T.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.22, metalness: 0.92 });

    // ── 1. GREEK ATTIC BLACK-FIGURE AMPHORA VASE ────────────────────────────
    if (type === 'amphora') {
      var pts = [];
      // Fluted foot base
      pts.push(new T.Vector2(height * 0.18, 0));
      pts.push(new T.Vector2(height * 0.16, height * 0.06));
      pts.push(new T.Vector2(height * 0.08, height * 0.12));
      // Swelling belly
      pts.push(new T.Vector2(height * 0.22, height * 0.28));
      pts.push(new T.Vector2(height * 0.32, height * 0.52));
      pts.push(new T.Vector2(height * 0.26, height * 0.72));
      // Tapering neck
      pts.push(new T.Vector2(height * 0.12, height * 0.82));
      pts.push(new T.Vector2(height * 0.14, height * 0.94));
      // Flared rim
      pts.push(new T.Vector2(height * 0.19, height));
      pts.push(new T.Vector2(height * 0.14, height));

      var latheGeo = new T.LatheGeometry(pts, 48);
      var vaseMesh = new T.Mesh(latheGeo, artifactMat);
      grp.add(vaseMesh);

      // Black-glaze meander belly frieze band
      var bandGeo = new T.CylinderGeometry(height * 0.322, height * 0.322, height * 0.22, 48, 1, true);
      var bandMesh = new T.Mesh(bandGeo, blackGlazeMat);
      bandMesh.position.y = height * 0.52;
      grp.add(bandMesh);

      // Twin Volute Loop Handles
      for (var s of [-1, 1]) {
        var hCurve = new T.CatmullRomCurve3([
          new T.Vector3(s * height * 0.15, height * 0.92, 0),
          new T.Vector3(s * height * 0.34, height * 0.85, 0),
          new T.Vector3(s * height * 0.36, height * 0.65, 0),
          new T.Vector3(s * height * 0.28, height * 0.58, 0)
        ]);
        var handleGeo = new T.TubeGeometry(hCurve, 24, height * 0.025, 8, false);
        var handle = new T.Mesh(handleGeo, blackGlazeMat);
        grp.add(handle);
      }

    // ── 2. MESOPOTAMIAN CUNEIFORM CLAY TABLET ────────────────────────────────
    } else if (type === 'cuneiform') {
      var tabGeo = new T.BoxGeometry(height * 0.65, height * 0.95, height * 0.16);
      
      // Pillow-curved edges
      var tPos = tabGeo.attributes.position;
      for (var ti = 0; ti < tPos.count; ti++) {
        var tx = tPos.getX(ti), ty = tPos.getY(ti), tz = tPos.getZ(ti);
        var distC = Math.sqrt(tx * tx + ty * ty) / (height * 0.5);
        tz *= (1.0 - distC * 0.25);
        tPos.setXYZ(ti, tx, ty, tz);
      }
      tPos.needsUpdate = true;
      tabGeo.computeVertexNormals();

      var tabMesh = new T.Mesh(tabGeo, artifactMat);
      grp.add(tabMesh);

      // Etched Cuneiform Wedge Inscription Glyphs (Rows of horizontal wedge marks)
      for (var row = -5; row <= 5; row++) {
        for (var colI = -4; colI <= 4; colI++) {
          if ((row + colI) % 2 === 0) {
            var wedgeGeo = new T.ConeGeometry(height * 0.016, height * 0.045, 3);
            wedgeGeo.rotateZ(Math.PI / 2 + (colI % 3) * 0.4);
            var wedge = new T.Mesh(wedgeGeo, blackGlazeMat);
            wedge.position.set(colI * (height * 0.06), row * (height * 0.075), height * 0.082);
            grp.add(wedge);
          }
        }
      }

    // ── 3. EASTER ISLAND MOAI MONOLITH STATUE ───────────────────────────────
    } else if (type === 'moai') {
      var headGeo = new T.CylinderGeometry(height * 0.18, height * 0.22, height * 0.75, 18);
      var mPos = headGeo.attributes.position;
      for (var mi = 0; mi < mPos.count; mi++) {
        var mx = mPos.getX(mi), my = mPos.getY(mi), mz = mPos.getZ(mi);
        // Prominent brow ridge
        if (my > height * 0.15 && mz > 0) {
          mz += height * 0.09;
        }
        // Long angular aquiline nose
        if (Math.abs(mx) < height * 0.05 && my > -height * 0.1 && my < height * 0.2 && mz > 0) {
          mz += height * 0.14;
        }
        // Jutting chin
        if (my < -height * 0.25 && mz > 0) {
          mz += height * 0.08;
        }
        mPos.setXYZ(mi, mx, my, mz);
      }
      mPos.needsUpdate = true;
      headGeo.computeVertexNormals();

      var moaiMesh = new T.Mesh(headGeo, artifactMat);
      moaiMesh.position.y = height * 0.38;
      grp.add(moaiMesh);

      // Pukao Red Scoria Topknot Hat
      var pukaoGeo = new T.CylinderGeometry(height * 0.16, height * 0.19, height * 0.18, 16);
      var pukaoMat = new T.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.9, metalness: 0.05 });
      var pukao = new T.Mesh(pukaoGeo, pukaoMat);
      pukao.position.y = height * 0.85;
      grp.add(pukao);

      // Torso Base
      var torsoGeo = new T.BoxGeometry(height * 0.45, height * 0.25, height * 0.35);
      var torso = new T.Mesh(torsoGeo, artifactMat);
      torso.position.y = height * 0.1;
      grp.add(torso);

    // ── 4. CLASSICAL CORINTHIAN COLUMN CAPITAL ──────────────────────────────
    } else if (type === 'column') {
      // Fluted Shaft
      var shaftGeo = new T.CylinderGeometry(height * 0.22, height * 0.24, height * 0.55, 24);
      var shaft = new T.Mesh(shaftGeo, artifactMat);
      shaft.position.y = height * 0.28;
      grp.add(shaft);

      // Acanthus Leaf Tier 1
      for (var l1 = 0; l1 < 8; l1++) {
        var lAng = (l1 * Math.PI * 2) / 8;
        var leafGeo = new T.ConeGeometry(height * 0.07, height * 0.22, 4);
        var leaf = new T.Mesh(leafGeo, artifactMat);
        leaf.position.set(Math.cos(lAng) * (height * 0.24), height * 0.62, Math.sin(lAng) * (height * 0.24));
        leaf.rotation.z = Math.cos(lAng) * -0.22;
        leaf.rotation.x = Math.sin(lAng) * 0.22;
        grp.add(leaf);
      }

      // Corner Volute Scrolls (4 corners)
      for (var v = 0; v < 4; v++) {
        var vAng = (v * Math.PI * 2) / 4 + Math.PI / 4;
        var volGeo = new T.TorusGeometry(height * 0.08, height * 0.025, 8, 16);
        var volute = new T.Mesh(volGeo, artifactMat);
        volute.position.set(Math.cos(vAng) * (height * 0.28), height * 0.82, Math.sin(vAng) * (height * 0.28));
        volute.rotation.y = vAng;
        grp.add(volute);
      }

      // Top Abacus Slab
      var abacusGeo = new T.BoxGeometry(height * 0.62, height * 0.08, height * 0.62);
      var abacus = new T.Mesh(abacusGeo, artifactMat);
      abacus.position.y = height * 0.95;
      grp.add(abacus);

    // ── 5. ROMAN POMPEII GLADIUS DAGGER ─────────────────────────────────────
    } else {
      // Leaf Blade
      var bladeGeo = new T.BoxGeometry(height * 0.12, height * 0.65, height * 0.025);
      var blade = new T.Mesh(bladeGeo, new T.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.2, metalness: 0.95 }));
      blade.position.y = height * 0.65;
      grp.add(blade);

      // Bronze Crossguard
      var guardGeo = new T.CylinderGeometry(height * 0.08, height * 0.08, height * 0.06, 16);
      var guard = new T.Mesh(guardGeo, goldInlayMat);
      guard.position.y = height * 0.32;
      grp.add(guard);

      // Bone Ribbed Grip
      for (var gr = 0; gr < 4; gr++) {
        var ring = new T.Mesh(new T.TorusGeometry(height * 0.04, height * 0.015, 8, 16), artifactMat);
        ring.position.y = height * 0.16 + gr * (height * 0.04);
        ring.rotation.x = Math.PI / 2;
        grp.add(ring);
      }

      // Spherical Bronze Pommel
      var pommel = new T.Mesh(new T.SphereGeometry(height * 0.07, 16, 12), goldInlayMat);
      pommel.position.y = height * 0.08;
      grp.add(pommel);
    }

    // ── MUSEUM INSCRIBED DISPLAY PLAQUE ─────────────────────────────────────
    if (hasPlaque) {
      var plqGeo = new T.BoxGeometry(height * 0.75, height * 0.08, height * 0.35);
      var plqMesh = new T.Mesh(plqGeo, new T.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.8 }));
      plqMesh.position.set(0, -height * 0.04, 0);
      grp.add(plqMesh);

      // Gold Inscribed Museum Plate
      var plateInlay = new T.Mesh(new T.BoxGeometry(height * 0.65, height * 0.02, height * 0.12), goldInlayMat);
      plateInlay.position.set(0, -height * 0.01, height * 0.14);
      plateInlay.rotation.x = -Math.PI / 4;
      grp.add(plateInlay);
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

  function generateArtifact() {
    setLoading(true, 'Reconstructing Historical Antiquity 3D Model...');
    setTimeout(function () {
      try {
        var type = (el('artifact-type-select') || {}).value || 'amphora';
        var height = parseFloat((el('artifact-height-slider') || {}).value || 110);
        var weathering = parseFloat((el('artifact-weather-slider') || {}).value || 1.8);
        var patina = (el('artifact-patina-select') || {}).value || 'terracotta';
        var hasPlaque = !!(el('artifact-plaque-toggle') || {}).checked;
        var customLabel = (el('artifact-label-input') || {}).value || 'Athens, c. 520 BCE';

        var p = {
          type: type,
          height: height,
          weathering: weathering,
          patina: patina,
          hasPlaque: hasPlaque,
          customLabel: customLabel
        };

        var model = buildArtifactObject(p);
        pushModel(model, 'artifact_' + type);
        showMsg((window.I18N && I18N.t) ? I18N.t('toastArtifactGenerated') : 'Museum Antiquity Replica reconstructed successfully!', 'success');
      } catch (err) {
        console.error(err);
        showMsg('Error: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    }, 40);
  }

  async function doExport(fmt) {
    if (!currentArtifactMesh) { showMsg('Please generate an artifact first!', 'warning'); return; }
    setLoading(true, 'Exporting ' + fmt.toUpperCase() + '...');
    try {
      if (fmt === '3mf' && window.ModelConverters && ModelConverters.export3MF) {
        var r3 = await ModelConverters.export3MF(currentArtifactMesh, 'Historical_Artifact_Model');
        ModelConverters.triggerDownload(r3.blob, r3.filename);
        showMsg('Multi-Color 3MF exported!', 'success');
        return;
      }
      var r = await ModelConverters.exportModel(currentArtifactMesh, fmt, 'artifact_model');
      ModelConverters.triggerDownload(r.blob, r.filename);
      showMsg('Exported ' + fmt.toUpperCase() + ' successfully!', 'success');
    } catch (e) {
      showMsg('Export error: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function init() {
    wireSlider('artifact-height-slider', 'artifact-height-val');
    wireSlider('artifact-weather-slider', 'artifact-weather-val');

    var typSel = el('artifact-type-select');
    if (typSel) typSel.addEventListener('change', generateArtifact);
    var patSel = el('artifact-patina-select');
    if (patSel) patSel.addEventListener('change', generateArtifact);
    var plqTog = el('artifact-plaque-toggle');
    if (plqTog) plqTog.addEventListener('change', generateArtifact);

    var lblInp = el('artifact-label-input');
    if (lblInp) lblInp.addEventListener('change', generateArtifact);

    var gb = el('btn-generate-artifact');
    if (gb) gb.addEventListener('click', generateArtifact);

    var estl = el('btn-export-artifact-stl');
    if (estl) estl.addEventListener('click', function () { doExport('stl'); });
    var eglb = el('btn-export-artifact-glb');
    if (eglb) eglb.addEventListener('click', function () { doExport('glb'); });
    var e3mf = el('btn-export-artifact-3mf');
    if (e3mf) e3mf.addEventListener('click', function () { doExport('3mf'); });
    var ehtml = el('btn-export-artifact-html');
    if (ehtml) ehtml.addEventListener('click', function () { doExport('html'); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  window.__artifactEngine = { generate: generateArtifact };
})();
