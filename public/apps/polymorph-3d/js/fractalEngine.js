/**
 * PolyMorph 3D Studio - Fractal & Mathematical Art Engine (Tab: 🌀 Fractal & Math Art)
 * Generates 3D geometric fractals and chaotic mathematical sculptures:
 * Sierpinski Tetrahedrons, Menger Sponges, Fibonacci Nautilus Shells,
 * Koch 3D Snowflake Stars, and Lorenz Strange Attractor Ribbon Solids.
 */
(function () {
  'use strict';
  var currentFractalMesh = null;

  function el(id) { return document.getElementById(id); }
  function showMsg(msg, type) {
    if (typeof showToast === 'function') showToast(msg, type || 'info');
    else console.log('[Fractal]', msg);
  }
  function setLoading(on, txt) {
    var ov = el('loading-overlay'), lb = el('loading-text');
    if (!ov) return;
    if (on) { if (lb) lb.textContent = txt || 'Computing Recursive Fractal Geometry...'; ov.classList.add('visible'); }
    else { ov.classList.remove('visible'); }
  }

  function pushModel(mesh, name) {
    currentFractalMesh = mesh;
    if (typeof window.__polymorphSetModel === 'function') {
      window.__polymorphSetModel(mesh, name);
      return;
    }
    document.dispatchEvent(new CustomEvent('fractal3dReady', { detail: { mesh: mesh, name: name } }));
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
      generateFractal();
    });
    upd();
  }

  function buildFractalObject(p) {
    var T = window.THREE;
    var type = p.type || 'sierpinski';
    var depth = parseInt(p.depth || 3, 10);
    var size = parseFloat(p.size || 60);
    var twist = parseFloat(p.twist || 0); // degrees
    var strut = parseFloat(p.strut || 2.5); // mm
    var colorTheme = p.colorTheme || 'neon';

    var grp = new T.Group();
    grp.name = 'Fractal_Math_' + type;

    // Palette Material
    var matColor = 0x8b5cf6, rough = 0.25, metal = 0.6;
    if (colorTheme === 'gold') { matColor = 0xd4af37; rough = 0.18; metal = 0.95; }
    else if (colorTheme === 'neon') { matColor = 0x06b6d4; rough = 0.2; metal = 0.7; }
    else if (colorTheme === 'emerald') { matColor = 0x10b981; rough = 0.25; metal = 0.5; }
    else if (colorTheme === 'ruby') { matColor = 0xf43f5e; rough = 0.22; metal = 0.65; }
    else if (colorTheme === 'obsidian') { matColor = 0x1e293b; rough = 0.12; metal = 0.9; }

    var fMat = new T.MeshStandardMaterial({
      color: matColor,
      roughness: rough,
      metalness: metal,
      side: T.DoubleSide
    });

    var accentMat = new T.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.2,
      metalness: 0.9
    });

    // ── 1. 3D SIERPINSKI TETRAHEDRON ────────────────────────────────────────
    if (type === 'sierpinski') {
      var tetraGeo = new T.TetrahedronGeometry(size / 2.0);

      function subdivideTetra(center, curSize, curLevel) {
        if (curLevel >= depth) {
          var tMesh = new T.Mesh(tetraGeo, fMat);
          tMesh.position.copy(center);
          tMesh.scale.setScalar(curSize / (size / 2.0));
          if (twist > 0) {
            tMesh.rotation.y = (center.y / size) * (twist * Math.PI / 180);
          }
          grp.add(tMesh);
          return;
        }

        var halfS = curSize / 2.0;
        var h = halfS * Math.sqrt(2 / 3);
        var r = halfS * Math.sqrt(3) / 3;

        var v0 = new T.Vector3(center.x, center.y + h * 0.75, center.z);
        var v1 = new T.Vector3(center.x, center.y - h * 0.25, center.z + r);
        var v2 = new T.Vector3(center.x - halfS * 0.5, center.y - h * 0.25, center.z - r * 0.5);
        var v3 = new T.Vector3(center.x + halfS * 0.5, center.y - h * 0.25, center.z - r * 0.5);

        subdivideTetra(v0, halfS, curLevel + 1);
        subdivideTetra(v1, halfS, curLevel + 1);
        subdivideTetra(v2, halfS, curLevel + 1);
        subdivideTetra(v3, halfS, curLevel + 1);
      }

      subdivideTetra(new T.Vector3(0, size / 2, 0), size / 2.0, 1);

    // ── 2. 3D MENGER SPONGE ────────────────────────────────────────────────
    } else if (type === 'menger') {
      var boxUnit = new T.BoxGeometry(1, 1, 1);

      function buildMenger(cx, cy, cz, s, lvl) {
        if (lvl >= Math.min(depth, 3)) {
          var bMesh = new T.Mesh(boxUnit, fMat);
          bMesh.position.set(cx, cy, cz);
          bMesh.scale.setScalar(s);
          grp.add(bMesh);
          return;
        }

        var sub = s / 3.0;
        for (var x = -1; x <= 1; x++) {
          for (var y = -1; y <= 1; y++) {
            for (var z = -1; z <= 1; z++) {
              var zeros = (x === 0 ? 1 : 0) + (y === 0 ? 1 : 0) + (z === 0 ? 1 : 0);
              if (zeros >= 2) continue; // Hollow central tunnels along 3 axes
              buildMenger(cx + x * sub, cy + y * sub, cz + z * sub, sub, lvl + 1);
            }
          }
        }
      }

      buildMenger(0, size / 2, 0, size, 1);

    // ── 3. FIBONACCI GOLDEN RATIO NAUTILUS SHELL ───────────────────────────
    } else if (type === 'nautilus') {
      var turns = 3.5;
      var totalPts = 160;
      var phi = 1.61803398875; // Golden Ratio

      for (var i = 0; i < totalPts; i++) {
        var t = (i / totalPts) * (turns * Math.PI * 2);
        var r = (size * 0.04) * Math.exp(0.18 * t);
        var x = Math.cos(t) * r;
        var y = (t / (turns * Math.PI * 2)) * (size * 0.45);
        var z = Math.sin(t) * r;

        var chamberRadius = Math.max(1.2, r * 0.28);
        var chamberGeo = new T.SphereGeometry(chamberRadius, 16, 12);
        chamberGeo.scale(1.0, 0.85, 1.25);
        var chamber = new T.Mesh(chamberGeo, (i % 6 === 0) ? accentMat : fMat);
        chamber.position.set(x, y, z);
        chamber.rotation.y = -t;
        grp.add(chamber);
      }

    // ── 4. KOCH 3D STELLATED SNOWFLAKE POLYHEDRON ─────────────────────────
    } else if (type === 'koch') {
      var icosa = new T.IcosahedronGeometry(size * 0.4, 0);
      var posAttr = icosa.attributes.position;
      var icoMesh = new T.Mesh(icosa, fMat);
      grp.add(icoMesh);

      // Star pyramids on all triangular faces
      for (var f = 0; f < posAttr.count; f += 3) {
        var pA = new T.Vector3(posAttr.getX(f), posAttr.getY(f), posAttr.getZ(f));
        var pB = new T.Vector3(posAttr.getX(f+1), posAttr.getY(f+1), posAttr.getZ(f+1));
        var pC = new T.Vector3(posAttr.getX(f+2), posAttr.getY(f+2), posAttr.getZ(f+2));

        var faceCen = new T.Vector3().add(pA).add(pB).add(pC).divideScalar(3);
        var fNorm = faceCen.clone().normalize();

        var pyrGeo = new T.ConeGeometry(size * 0.16, size * 0.35, 3);
        var pyr = new T.Mesh(pyrGeo, accentMat);
        pyr.position.copy(faceCen.clone().add(fNorm.clone().multiplyScalar(size * 0.16)));
        pyr.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), fNorm);
        grp.add(pyr);
      }

    // ── 5. LORENZ STRANGE ATTRACTOR RIBBON SOLID ───────────────────────────
    } else if (type === 'lorenz') {
      var sigma = 10.0, rho = 28.0, beta = 8.0 / 3.0;
      var lx = 0.1, ly = 0.0, lz = 0.0;
      var dt = 0.012;
      var curvePts = [];

      for (var step = 0; step < 1200; step++) {
        var dx = sigma * (ly - lx) * dt;
        var dy = (lx * (rho - lz) - ly) * dt;
        var dz = (lx * ly - beta * lz) * dt;
        lx += dx; ly += dy; lz += dz;

        if (step > 80 && step % 2 === 0) {
          curvePts.push(new T.Vector3(lx * (size * 0.038), (lz - 20) * (size * 0.038), ly * (size * 0.038)));
        }
      }

      var curve = new T.CatmullRomCurve3(curvePts);
      var tubeGeo = new T.TubeGeometry(curve, 240, strut * 0.8, 10, false);
      var tubeMesh = new T.Mesh(tubeGeo, fMat);
      grp.add(tubeMesh);

    // ── 6. FLUTED TORUS KNOT SOLENOID ──────────────────────────────────────
    } else {
      var knotGeo = new T.TorusKnotGeometry(size * 0.35, size * 0.12, 180, 24, 3, 5);
      var knotMesh = new T.Mesh(knotGeo, fMat);
      grp.add(knotMesh);

      // Fluted ribs around knot
      var cageGeo = new T.TorusKnotGeometry(size * 0.38, size * 0.03, 120, 12, 3, 5);
      var cageMesh = new T.Mesh(cageGeo, accentMat);
      grp.add(cageMesh);
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

  function generateFractal() {
    setLoading(true, 'Computing Recursive Fractal Geometry...');
    setTimeout(function () {
      try {
        var type = (el('fractal-type-select') || {}).value || 'sierpinski';
        var depth = parseInt((el('fractal-depth-select') || {}).value || 3, 10);
        var size = parseFloat((el('fractal-size-slider') || {}).value || 60);
        var twist = parseFloat((el('fractal-twist-slider') || {}).value || 0);
        var strut = parseFloat((el('fractal-strut-slider') || {}).value || 2.5);
        var colorTheme = (el('fractal-color-select') || {}).value || 'neon';

        var p = {
          type: type,
          depth: depth,
          size: size,
          twist: twist,
          strut: strut,
          colorTheme: colorTheme
        };

        var model = buildFractalObject(p);
        pushModel(model, 'fractal_' + type);
        showMsg((window.I18N && I18N.t) ? I18N.t('toastFractalGenerated') : 'Mathematical 3D Fractal computed successfully!', 'success');
      } catch (err) {
        console.error(err);
        showMsg('Error: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    }, 40);
  }

  async function doExport(fmt) {
    if (!currentFractalMesh) { showMsg('Please generate a fractal model first!', 'warning'); return; }
    setLoading(true, 'Exporting ' + fmt.toUpperCase() + '...');
    try {
      if (fmt === '3mf' && window.ModelConverters && ModelConverters.export3MF) {
        var r3 = await ModelConverters.export3MF(currentFractalMesh, 'Fractal_Math_Art');
        ModelConverters.triggerDownload(r3.blob, r3.filename);
        showMsg('Multi-Color 3MF exported!', 'success');
        return;
      }
      var r = await ModelConverters.exportModel(currentFractalMesh, fmt, 'fractal_model');
      ModelConverters.triggerDownload(r.blob, r.filename);
      showMsg('Exported ' + fmt.toUpperCase() + ' successfully!', 'success');
    } catch (e) {
      showMsg('Export error: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function init() {
    wireSlider('fractal-size-slider', 'fractal-size-val');
    wireSlider('fractal-twist-slider', 'fractal-twist-val');
    wireSlider('fractal-strut-slider', 'fractal-strut-val');

    var typSel = el('fractal-type-select');
    if (typSel) typSel.addEventListener('change', generateFractal);
    var depSel = el('fractal-depth-select');
    if (depSel) depSel.addEventListener('change', generateFractal);
    var colSel = el('fractal-color-select');
    if (colSel) colSel.addEventListener('change', generateFractal);

    var gb = el('btn-generate-fractal');
    if (gb) gb.addEventListener('click', generateFractal);

    var estl = el('btn-export-fractal-stl');
    if (estl) estl.addEventListener('click', function () { doExport('stl'); });
    var eglb = el('btn-export-fractal-glb');
    if (eglb) eglb.addEventListener('click', function () { doExport('glb'); });
    var e3mf = el('btn-export-fractal-3mf');
    if (e3mf) e3mf.addEventListener('click', function () { doExport('3mf'); });
    var ehtml = el('btn-export-fractal-html');
    if (ehtml) ehtml.addEventListener('click', function () { doExport('html'); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  window.__fractalEngine = { generate: generateFractal };
})();
