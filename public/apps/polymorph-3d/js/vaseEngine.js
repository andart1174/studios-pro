/**
 * PolyMorph 3D Studio - VaseMorph & Parametric Kinetic Lamps Engine
 * Generates sculptural mathematical harmonic vases, origami pleated lampshades,
 * and continuous spiral vase mode 3D printing meshes.
 */
(function () {
  'use strict';
  var currentVaseMesh = null;

  function el(id) { return document.getElementById(id); }
  function showMsg(msg, type) {
    if (typeof showToast === 'function') showToast(msg, type || 'info');
    else console.log('[Vase]', msg);
  }
  function setLoading(on, txt) {
    var ov = el('loading-overlay'), lb = el('loading-text');
    if (!ov) return;
    if (on) { if (lb) lb.textContent = txt || 'Lofting Parametric Waveforms...'; ov.classList.add('visible'); }
    else { ov.classList.remove('visible'); }
  }

  function pushModel(mesh, name) {
    currentVaseMesh = mesh;
    if (typeof window.__polymorphSetModel === 'function') {
      window.__polymorphSetModel(mesh, name);
      return;
    }
    document.dispatchEvent(new CustomEvent('vase3dReady', { detail: { mesh: mesh, name: name } }));
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

  function buildVaseObject(p) {
    var T = window.THREE;
    var style = p.style;
    var height = p.height;
    var maxDiam = p.width;
    var maxR = maxDiam / 2.0;
    var ribs = p.ribs;
    var twistDeg = p.twist;
    var twistRad = (twistDeg * Math.PI) / 180.0;
    var socket = p.socket;

    var grp = new T.Group();
    grp.name = 'VaseMorph_Parametric_Model';

    var ceramicMat = new T.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.25,
      metalness: 0.1,
      side: T.DoubleSide
    });
    var lampMat = new T.MeshStandardMaterial({
      color: 0xfef08a,
      roughness: 0.45,
      metalness: 0.05,
      side: T.DoubleSide
    });

    var numLayers = 100;
    var numCirc = 64;
    var geo = new T.PlaneGeometry(maxDiam, height, numCirc, numLayers);
    var pos = geo.attributes.position;

    // Loft parametric surface: z-height, radial modulation, harmonic ribs & twist
    for (var j = 0; j <= numLayers; j++) {
      var vNorm = j / numLayers; // [0, 1] from base to rim
      var yH = (vNorm - 0.5) * height;

      // Base radius profile curve
      var baseR = maxR * (0.5 + 0.5 * Math.sin(vNorm * Math.PI));
      if (style === 'origami') {
        baseR = maxR * (0.65 + 0.35 * Math.cos(vNorm * Math.PI * 2));
      } else if (style === 'twist') {
        baseR = maxR * (0.4 + 0.6 * Math.sqrt(vNorm));
      }

      var currentTwist = vNorm * twistRad;

      for (var i = 0; i <= numCirc; i++) {
        var uNorm = i / numCirc;
        var angle = uNorm * Math.PI * 2 + currentTwist;

        // Harmonic waveform rib modulation
        var rMod = 0;
        if (style === 'harmonic') {
          rMod = Math.sin(uNorm * Math.PI * 2 * ribs) * (maxR * 0.18);
        } else if (style === 'origami') {
          // Sharp accordion pleats
          var sawtooth = Math.abs((((uNorm * ribs) % 1) - 0.5) * 2);
          rMod = (sawtooth - 0.5) * (maxR * 0.24);
        } else if (style === 'voronoi') {
          rMod = Math.sin(uNorm * Math.PI * ribs) * Math.cos(vNorm * Math.PI * 8) * (maxR * 0.12);
        } else {
          // Fibonacci swirl
          rMod = Math.sin(uNorm * Math.PI * 2 * ribs + vNorm * 8) * (maxR * 0.15);
        }

        var finalR = Math.max(8.0, baseR + rMod);
        var vx = Math.cos(angle) * finalR;
        var vz = Math.sin(angle) * finalR;

        var vIdx = j * (numCirc + 1) + i;
        if (vIdx < pos.count) {
          pos.setXYZ(vIdx, vx, yH, vz);
        }
      }
    }

    pos.needsUpdate = true;
    geo.computeVertexNormals();

    var vaseMesh = new T.Mesh(geo, (style === 'origami' || style === 'voronoi') ? lampMat : ceramicMat);
    grp.add(vaseMesh);

    // Solid base plate or screw-thread socket
    if (socket !== 'vase') {
      var sockR = (socket === 'e27' ? 14 : 8.5);
      var sockBase = new T.Mesh(new T.CylinderGeometry(sockR, sockR + 2, 8, 32, 1, true), new T.MeshStandardMaterial({ color: 0x222222 }));
      sockBase.position.y = -height / 2;
      grp.add(sockBase);
    } else {
      var botCap = new T.Mesh(new T.CylinderGeometry(maxR * 0.5, maxR * 0.5, 3, 32), ceramicMat);
      botCap.position.y = -height / 2;
      grp.add(botCap);
    }

    return grp;
  }

  function generateVase() {
    setLoading(true, 'Calculating Spiral Vase Geometry...');
    setTimeout(function () {
      try {
        var style = (el('vase-type-select') || {}).value || 'harmonic';
        var height = parseFloat((el('vase-height-slider') || {}).value || 140);
        var width = parseFloat((el('vase-width-slider') || {}).value || 75);
        var ribs = parseInt((el('vase-ribs-slider') || {}).value || 8, 10);
        var twist = parseFloat((el('vase-twist-slider') || {}).value || 45);
        var socket = (el('vase-socket-select') || {}).value || 'e27';

        var p = { style: style, height: height, width: width, ribs: ribs, twist: twist, socket: socket };
        var model = buildVaseObject(p);
        model.updateMatrixWorld(true);
        var box = new THREE.Box3().setFromObject(model);
        var cen = new THREE.Vector3();
        box.getCenter(cen);
        model.position.x = -cen.x;
        model.position.z = -cen.z;
        model.position.y = -box.min.y;
        model.updateMatrixWorld(true);

        pushModel(model, 'vase_' + style);
        showMsg((window.I18N && I18N.t) ? I18N.t('toastVaseGenerated') : 'Parametric Vase/Lamp generated — vase-mode ready!', 'success');
      } catch (err) {
        console.error(err);
        showMsg('Error: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    }, 60);
  }

  async function doExport(fmt) {
    if (!currentVaseMesh) { showMsg('Please generate a Vase model first!', 'warning'); return; }
    setLoading(true, 'Exporting ' + fmt.toUpperCase() + '...');
    try {
      if (fmt === '3mf' && window.ModelConverters && ModelConverters.export3MF) {
        var r3 = await ModelConverters.export3MF(currentVaseMesh, 'VaseMorph_Parametric');
        ModelConverters.triggerDownload(r3.blob, r3.filename);
        showMsg('Multi-Color 3MF exported!', 'success');
        return;
      }
      var r = await ModelConverters.exportModel(currentVaseMesh, fmt, 'vase_model');
      ModelConverters.triggerDownload(r.blob, r.filename);
      showMsg('Exported ' + fmt.toUpperCase() + ' successfully!', 'success');
    } catch (e) {
      showMsg('Export error: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function init() {
    wireSlider('vase-height-slider', 'vase-height-val');
    wireSlider('vase-width-slider', 'vase-width-val');
    wireSlider('vase-ribs-slider', 'vase-ribs-val');
    wireSlider('vase-twist-slider', 'vase-twist-val');

    var styleSel = el('vase-type-select');
    if (styleSel) styleSel.addEventListener('change', generateVase);
    var socketSel = el('vase-socket-select');
    if (socketSel) socketSel.addEventListener('change', generateVase);

    var gb = el('btn-generate-vase');
    if (gb) gb.addEventListener('click', generateVase);

    var estl = el('btn-export-vase-stl');
    if (estl) estl.addEventListener('click', function () { doExport('stl'); });
    var eglb = el('btn-export-vase-glb');
    if (eglb) eglb.addEventListener('click', function () { doExport('glb'); });
    var e3mf = el('btn-export-vase-3mf');
    if (e3mf) e3mf.addEventListener('click', function () { doExport('3mf'); });
    var ehtml = el('btn-export-vase-html');
    if (ehtml) ehtml.addEventListener('click', function () { doExport('html'); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  window.__vaseEngine = { generate: generateVase };
})();
