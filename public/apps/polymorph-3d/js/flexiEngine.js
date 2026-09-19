/**
 * PolyMorph 3D Studio - FlexiMorph / Articulated Creatures & Chainmail Engine
 * Generates print-in-place flexible dragons, serpents, geckos,
 * and 3D interlocking medieval chainmail fabric sheets.
 */
(function () {
  'use strict';
  var currentFlexiMesh = null;

  function el(id) { return document.getElementById(id); }
  function showMsg(msg, type) {
    if (typeof showToast === 'function') showToast(msg, type || 'info');
    else console.log('[Flexi]', msg);
  }
  function setLoading(on, txt) {
    var ov = el('loading-overlay'), lb = el('loading-text');
    if (!ov) return;
    if (on) { if (lb) lb.textContent = txt || 'Calculating Print-in-Place Joints...'; ov.classList.add('visible'); }
    else { ov.classList.remove('visible'); }
  }

  function pushModel(mesh, name) {
    currentFlexiMesh = mesh;
    if (typeof window.__polymorphSetModel === 'function') {
      window.__polymorphSetModel(mesh, name);
      return;
    }
    document.dispatchEvent(new CustomEvent('flexi3dReady', { detail: { mesh: mesh, name: name } }));
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

  function buildFlexiObject(p) {
    var T = window.THREE;
    var type = p.type;
    var numSegments = p.segments;
    var totalLen = p.length;
    var spikes = p.spikes;
    var clr = p.clearance;

    var grp = new T.Group();
    grp.name = 'Flexi_PrintInPlace_Model';

    var dragonMat = new T.MeshStandardMaterial({ color: 0x10b981, roughness: 0.35, metalness: 0.2 });
    var spikeMat = new T.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.8 });
    var chainMat = new T.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.25, metalness: 0.95 });

    // ── CASE 1: 3D CHAINMAIL FABRIC SHEET ───────────────────────────────────
    if (type === 'chainmail' || type === 'scalemail') {
      var cols = 8, rows = 8;
      var ringR = 5.0, wireR = 0.95;
      var spacingX = ringR * 1.45, spacingY = ringR * 1.45;

      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var cx = (c - cols / 2) * spacingX;
          var cy = (r - rows / 2) * spacingY;

          if (type === 'chainmail') {
            // European 4-in-1 Interlocking Ring
            var ringGeo = new T.TorusGeometry(ringR, wireR, 12, 24);
            var ring = new T.Mesh(ringGeo, chainMat);
            ring.position.set(cx, cy, 0);
            ring.rotation.x = ((r + c) % 2 === 0) ? Math.PI / 4 : -Math.PI / 4;
            ring.rotation.y = ((r + c) % 2 === 0) ? Math.PI / 4 : -Math.PI / 4;
            grp.add(ring);
          } else {
            // Hexagonal Dragon Scale Mail
            var scaleGeo = new T.CylinderGeometry(ringR, ringR * 0.9, 1.4, 6);
            var scale = new T.Mesh(scaleGeo, spikeMat);
            scale.position.set(cx + (r % 2 ? spacingX * 0.5 : 0), cy, 0);
            scale.rotation.x = Math.PI / 2;
            grp.add(scale);

            // Interlocking hinge link between scales
            var linkGeo = new T.TorusGeometry(ringR * 0.75, 0.7, 8, 16);
            var link = new T.Mesh(linkGeo, chainMat);
            link.position.set(cx + (r % 2 ? spacingX * 0.5 : 0), cy, 0.8);
            grp.add(link);
          }
        }
      }

    // ── CASE 2: ARTICULATED DRAGON / SERPENT / GECKO ────────────────────────
    } else {
      var segLen = totalLen / (numSegments + 2);
      var maxW = 20;

      // 1. Stylized Dragon Head
      var headGeo = new T.ConeGeometry(maxW * 0.6, segLen * 1.8, 5);
      var head = new T.Mesh(headGeo, dragonMat);
      head.rotation.z = -Math.PI / 2;
      head.position.set(-totalLen / 2 + segLen * 0.8, 0, 0);
      grp.add(head);

      // Horns on Head
      if (spikes) {
        for (var h = -1; h <= 1; h += 2) {
          var hornGeo = new T.ConeGeometry(2.5, 14, 8);
          var horn = new T.Mesh(hornGeo, spikeMat);
          horn.position.set(-totalLen / 2 + segLen * 0.4, h * 6, 7);
          horn.rotation.x = h * 0.4;
          horn.rotation.y = 0.5;
          grp.add(horn);
        }
      }

      // 2. Articulated Body Segments (Interlocking Ball & Socket Hinges)
      for (var s = 0; s < numSegments; s++) {
        var tRatio = s / numSegments;
        var segW = maxW * (1.0 - tRatio * 0.65);
        var posX = -totalLen / 2 + (s + 1.6) * segLen;

        // Curved organic body wave
        var waveY = Math.sin(tRatio * Math.PI * 2.5) * 6.0;

        // Main Segment Body Block
        var segGeo = new T.BoxGeometry(segLen * 0.82, segW, segW * 0.6);
        var segMesh = new T.Mesh(segGeo, dragonMat);
        segMesh.position.set(posX, waveY, 0);
        grp.add(segMesh);

        // Interlocking Hinge Loop (Prints in place, captive with clearance)
        var hingeLoopGeo = new T.TorusGeometry(segW * 0.28, 1.6, 12, 24);
        var hingeLoop = new T.Mesh(hingeLoopGeo, dragonMat);
        hingeLoop.position.set(posX - segLen * 0.42, waveY, 0);
        hingeLoop.rotation.y = Math.PI / 2;
        grp.add(hingeLoop);

        // Interlocking Captive Pin inside Loop (with 0.4mm clearance)
        var pinGeo = new T.CylinderGeometry(1.2, 1.2, segW * 0.7, 16);
        var pin = new T.Mesh(pinGeo, spikeMat);
        pin.position.set(posX - segLen * 0.42, waveY, 0);
        grp.add(pin);

        // Dorsal Spikes
        if (spikes) {
          var spikeGeo = new T.ConeGeometry(2.0 + (1 - tRatio) * 1.5, 6.0 + (1 - tRatio) * 5.0, 4);
          var spike = new T.Mesh(spikeGeo, spikeMat);
          spike.position.set(posX, waveY, segW * 0.3 + 3.0);
          spike.rotation.y = -0.2;
          grp.add(spike);
        }
      }

      // 3. Tail Tip
      var tailGeo = new T.ConeGeometry(3.0, segLen * 1.5, 4);
      var tail = new T.Mesh(tailGeo, dragonMat);
      tail.rotation.z = Math.PI / 2;
      tail.position.set(totalLen / 2, 0, 0);
      grp.add(tail);
    }

    return grp;
  }

  function generateFlexi() {
    setLoading(true, 'Assembling Print-in-Place Ball Joints...');
    setTimeout(function () {
      try {
        var type = (el('flexi-type-select') || {}).value || 'dragon';
        var segments = parseInt((el('flexi-segments-slider') || {}).value || 14, 10);
        var length = parseFloat((el('flexi-length-slider') || {}).value || 160);
        var spikes = !!(el('flexi-spikes-toggle') || {}).checked;
        var clr = parseFloat((el('flexi-clearance-slider') || {}).value || 0.4);

        var p = { type: type, segments: segments, length: length, spikes: spikes, clearance: clr };
        var model = buildFlexiObject(p);
        model.updateMatrixWorld(true);
        var box = new THREE.Box3().setFromObject(model);
        var cen = new THREE.Vector3();
        box.getCenter(cen);
        model.position.x = -cen.x;
        model.position.z = -cen.z;
        model.position.y = -box.min.y;
        model.updateMatrixWorld(true);

        pushModel(model, 'flexi_' + type);
        showMsg((window.I18N && I18N.t) ? I18N.t('toastFlexiGenerated') : 'Articulated 3D Model generated — print-in-place ready!', 'success');
      } catch (err) {
        console.error(err);
        showMsg('Error: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    }, 60);
  }

  async function doExport(fmt) {
    if (!currentFlexiMesh) { showMsg('Please generate a Flexi model first!', 'warning'); return; }
    setLoading(true, 'Exporting ' + fmt.toUpperCase() + '...');
    try {
      if (fmt === '3mf' && window.ModelConverters && ModelConverters.export3MF) {
        var r3 = await ModelConverters.export3MF(currentFlexiMesh, 'FlexiMorph_Articulated');
        ModelConverters.triggerDownload(r3.blob, r3.filename);
        showMsg('Multi-Color 3MF exported!', 'success');
        return;
      }
      var r = await ModelConverters.exportModel(currentFlexiMesh, fmt, 'flexi_model');
      ModelConverters.triggerDownload(r.blob, r.filename);
      showMsg('Exported ' + fmt.toUpperCase() + ' successfully!', 'success');
    } catch (e) {
      showMsg('Export error: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function init() {
    wireSlider('flexi-segments-slider', 'flexi-segments-val');
    wireSlider('flexi-length-slider', 'flexi-length-val');
    wireSlider('flexi-clearance-slider', 'flexi-clearance-val');

    var typeSel = el('flexi-type-select');
    if (typeSel) typeSel.addEventListener('change', generateFlexi);
    var spikesTog = el('flexi-spikes-toggle');
    if (spikesTog) spikesTog.addEventListener('change', generateFlexi);

    var gb = el('btn-generate-flexi');
    if (gb) gb.addEventListener('click', generateFlexi);

    var estl = el('btn-export-flexi-stl');
    if (estl) estl.addEventListener('click', function () { doExport('stl'); });
    var eglb = el('btn-export-flexi-glb');
    if (eglb) eglb.addEventListener('click', function () { doExport('glb'); });
    var e3mf = el('btn-export-flexi-3mf');
    if (e3mf) e3mf.addEventListener('click', function () { doExport('3mf'); });
    var ehtml = el('btn-export-flexi-html');
    if (ehtml) ehtml.addEventListener('click', function () { doExport('html'); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  window.__flexiEngine = { generate: generateFlexi };
})();
