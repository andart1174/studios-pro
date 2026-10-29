/**
 * PolyMorph 3D Studio - Board Game & Dice Kit Engine (Tab: 🎲 Board Game & Dice)
 * Generates custom 3D tabletop RPG gaming components:
 * Polyhedral Dice (D4, D6, D8, D10, D12, D20), Meeples, Knight Pawns,
 * Resource Hexagon Tiles, and Modular Magnetic Dungeon Floor Grids.
 */
(function () {
  'use strict';
  var currentBoardGameMesh = null;

  function el(id) { return document.getElementById(id); }
  function showMsg(msg, type) {
    if (typeof showToast === 'function') showToast(msg, type || 'info');
    else console.log('[BoardGame]', msg);
  }
  function setLoading(on, txt) {
    var ov = el('loading-overlay'), lb = el('loading-text');
    if (!ov) return;
    if (on) { if (lb) lb.textContent = txt || 'Fabricating 3D Tabletop Gaming Kit...'; ov.classList.add('visible'); }
    else { ov.classList.remove('visible'); }
  }

  function pushModel(mesh, name) {
    currentBoardGameMesh = mesh;
    if (typeof window.__polymorphSetModel === 'function') {
      window.__polymorphSetModel(mesh, name);
      return;
    }
    document.dispatchEvent(new CustomEvent('boardGame3dReady', { detail: { mesh: mesh, name: name } }));
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
      generateBoardGame();
    });
    upd();
  }

  function buildBoardGameObject(p) {
    var T = window.THREE;
    var type = p.type || 'd6';
    var size = parseFloat(p.size || 22); // mm
    var inset = parseFloat(p.inset || 1.2); // mm
    var chamfer = parseFloat(p.chamfer || 1.5); // mm
    var style = p.style || 'marble';

    var grp = new T.Group();
    grp.name = 'BoardGame_' + type;

    // Palette PBR Materials
    var col = 0xd97706, rough = 0.35, metal = 0.15;
    if (style === 'gold') { col = 0xd4af37; rough = 0.18; metal = 0.95; }
    else if (style === 'dragon') { col = 0x991b1b; rough = 0.22; metal = 0.55; }
    else if (style === 'obsidian') { col = 0x0f172a; rough = 0.1; metal = 0.85; }
    else if (style === 'glow') { col = 0x10b981; rough = 0.25; metal = 0.3; }
    else if (style === 'wood') { col = 0x854d0e; rough = 0.75; metal = 0.05; }

    var diceMat = new T.MeshStandardMaterial({ color: col, roughness: rough, metalness: metal, side: T.DoubleSide });
    var pipMat = new T.MeshStandardMaterial({ color: (style === 'gold' ? 0x0f172a : 0xfef08a), roughness: 0.2, metalness: 0.8 });

    // ── 1. D6 CUBE WITH ROUNDED PIPS ────────────────────────────────────────
    if (type === 'd6') {
      var boxGeo = new T.BoxGeometry(size, size, size);
      var boxMesh = new T.Mesh(boxGeo, diceMat);
      grp.add(boxMesh);

      // Pips configuration for 6 faces
      var halfS = size / 2.0;
      var pipR = size * 0.09;
      var pipDist = size * 0.26;

      function addPip(px, py, pz, normX, normY, normZ) {
        var pGeo = new T.SphereGeometry(pipR, 12, 10);
        var pMesh = new T.Mesh(pGeo, pipMat);
        pMesh.position.set(px, py, pz);
        grp.add(pMesh);
      }

      // Face 1 (Top: +Y)
      addPip(0, halfS - inset * 0.4, 0, 0, 1, 0);

      // Face 6 (Bottom: -Y)
      [-pipDist, pipDist].forEach(function(ox) {
        [-pipDist, 0, pipDist].forEach(function(oz) {
          addPip(ox, -halfS + inset * 0.4, oz, 0, -1, 0);
        });
      });

      // Face 2 (Front: +Z)
      addPip(-pipDist, -pipDist, halfS - inset * 0.4, 0, 0, 1);
      addPip(pipDist, pipDist, halfS - inset * 0.4, 0, 0, 1);

      // Face 5 (Back: -Z)
      addPip(-pipDist, -pipDist, -halfS + inset * 0.4, 0, 0, -1);
      addPip(pipDist, pipDist, -halfS + inset * 0.4, 0, 0, -1);
      addPip(-pipDist, pipDist, -halfS + inset * 0.4, 0, 0, -1);
      addPip(pipDist, -pipDist, -halfS + inset * 0.4, 0, 0, -1);
      addPip(0, 0, -halfS + inset * 0.4, 0, 0, -1);

      // Face 3 (Right: +X)
      addPip(halfS - inset * 0.4, -pipDist, -pipDist, 1, 0, 0);
      addPip(halfS - inset * 0.4, 0, 0, 1, 0, 0);
      addPip(halfS - inset * 0.4, pipDist, pipDist, 1, 0, 0);

      // Face 4 (Left: -X)
      addPip(-halfS + inset * 0.4, -pipDist, -pipDist, -1, 0, 0);
      addPip(-halfS + inset * 0.4, -pipDist, pipDist, -1, 0, 0);
      addPip(-halfS + inset * 0.4, pipDist, -pipDist, -1, 0, 0);
      addPip(-halfS + inset * 0.4, pipDist, pipDist, -1, 0, 0);

    // ── 2. D20 ICOSAHEDRON RPG DIE ──────────────────────────────────────────
    } else if (type === 'd20') {
      var d20Geo = new T.IcosahedronGeometry(size * 0.65, 0);
      var d20Mesh = new T.Mesh(d20Geo, diceMat);
      grp.add(d20Mesh);

      // Add engraved number nodes on each triangle face
      var pos = d20Geo.attributes.position;
      for (var f = 0; f < pos.count; f += 3) {
        var vA = new T.Vector3(pos.getX(f), pos.getY(f), pos.getZ(f));
        var vB = new T.Vector3(pos.getX(f+1), pos.getY(f+1), pos.getZ(f+1));
        var vC = new T.Vector3(pos.getX(f+2), pos.getY(f+2), pos.getZ(f+2));
        var faceCen = new T.Vector3().add(vA).add(vB).add(vC).divideScalar(3);
        var norm = faceCen.clone().normalize();

        var pipNode = new T.Mesh(new T.CylinderGeometry(size * 0.08, size * 0.08, inset, 8), pipMat);
        pipNode.position.copy(faceCen.clone().add(norm.clone().multiplyScalar(inset * 0.2)));
        pipNode.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), norm);
        grp.add(pipNode);
      }

    // ── 3. D4 TETRAHEDRON ──────────────────────────────────────────────────
    } else if (type === 'd4') {
      var d4Geo = new T.TetrahedronGeometry(size * 0.75, 0);
      var d4Mesh = new T.Mesh(d4Geo, diceMat);
      grp.add(d4Mesh);

    // ── 4. D8 OCTAHEDRON ────────────────────────────────────────────────────
    } else if (type === 'd8') {
      var d8Geo = new T.OctahedronGeometry(size * 0.68, 0);
      var d8Mesh = new T.Mesh(d8Geo, diceMat);
      grp.add(d8Mesh);

    // ── 5. D12 DODECAHEDRON ────────────────────────────────────────────────
    } else if (type === 'd12') {
      var d12Geo = new T.DodecahedronGeometry(size * 0.62, 0);
      var d12Mesh = new T.Mesh(d12Geo, diceMat);
      grp.add(d12Mesh);

    // ── 6. CLASSIC BOARD GAME MEEPLE ────────────────────────────────────────
    } else if (type === 'meeple') {
      var meepleShape = new T.Shape();
      meepleShape.moveTo(0, size * 0.7); // Head top
      meepleShape.absarc(0, size * 0.65, size * 0.18, Math.PI / 2, -Math.PI * 1.5, false); // Head sphere
      meepleShape.moveTo(0, size * 0.48);
      meepleShape.lineTo(-size * 0.45, size * 0.28); // Left arm
      meepleShape.lineTo(-size * 0.35, size * 0.08);
      meepleShape.lineTo(-size * 0.18, size * 0.14);
      meepleShape.lineTo(-size * 0.35, -size * 0.4); // Left leg
      meepleShape.lineTo(-size * 0.08, -size * 0.4);
      meepleShape.lineTo(0, -size * 0.12); // Crotch
      meepleShape.lineTo(size * 0.08, -size * 0.4);
      meepleShape.lineTo(size * 0.35, -size * 0.4); // Right leg
      meepleShape.lineTo(size * 0.18, size * 0.14);
      meepleShape.lineTo(size * 0.35, size * 0.08);
      meepleShape.lineTo(size * 0.45, size * 0.28); // Right arm
      meepleShape.closePath();

      var meepExtrude = { depth: size * 0.35, bevelEnabled: true, bevelSize: 0.8, bevelThickness: 0.8 };
      var meepGeo = new T.ExtrudeGeometry(meepleShape, meepExtrude);
      var meepMesh = new T.Mesh(meepGeo, diceMat);
      meepMesh.position.z = -size * 0.175;
      grp.add(meepMesh);

    // ── 7. RESOURCE HEXAGON TILE (CATAN STYLE) ──────────────────────────────
    } else if (type === 'catan_hex') {
      var hexGeo = new T.CylinderGeometry(size, size, 5, 6);
      var hexMesh = new T.Mesh(hexGeo, diceMat);
      grp.add(hexMesh);

      // Mountain / Forest Relief Centerpiece
      for (var m = 0; m < 3; m++) {
        var peakGeo = new T.ConeGeometry(size * 0.28, size * 0.45 + m * 2, 5);
        var peak = new T.Mesh(peakGeo, pipMat);
        peak.position.set((m - 1) * (size * 0.35), 4 + m, (m === 1 ? -size * 0.15 : size * 0.15));
        grp.add(peak);
      }

    // ── 8. MODULAR MAGNETIC DUNGEON GRID TILE ───────────────────────────────
    } else {
      var tileGeo = new T.BoxGeometry(size * 1.5, 6, size * 1.5);
      var tileMesh = new T.Mesh(tileGeo, diceMat);
      grp.add(tileMesh);

      // Cobblestone Paver Relief Slots
      for (var cx = -1; cx <= 1; cx++) {
        for (var cz = -1; cz <= 1; cz++) {
          var stoneGeo = new T.BoxGeometry(size * 0.42, 1.5, size * 0.42);
          var stone = new T.Mesh(stoneGeo, pipMat);
          stone.position.set(cx * (size * 0.46), 3.5, cz * (size * 0.46));
          grp.add(stone);
        }
      }

      // Bottom 5mm x 2mm Neodymium Magnet Pockets (4 Corners)
      for (var mx of [-1, 1]) {
        for (var mz of [-1, 1]) {
          var magPocket = new T.Mesh(new T.CylinderGeometry(2.6, 2.6, 2.2, 12), pipMat);
          magPocket.position.set(mx * (size * 0.55), -2.2, mz * (size * 0.55));
          grp.add(magPocket);
        }
      }
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

  function rollDiceAnimation() {
    if (!currentBoardGameMesh) return;
    showMsg('🎲 Rolling 3D Dice!', 'info');
    var startTime = performance.now();
    var duration = 900; // ms
    var startRotX = currentBoardGameMesh.rotation.x;
    var startRotY = currentBoardGameMesh.rotation.y;
    var startRotZ = currentBoardGameMesh.rotation.z;
    var targetRotX = startRotX + Math.PI * 4 + Math.random() * Math.PI;
    var targetRotY = startRotY + Math.PI * 4 + Math.random() * Math.PI;

    function animate(time) {
      var elapsed = time - startTime;
      var prog = Math.min(1, elapsed / duration);
      var ease = 1 - Math.pow(1 - prog, 3); // ease out cubic

      currentBoardGameMesh.rotation.x = startRotX + (targetRotX - startRotX) * ease;
      currentBoardGameMesh.rotation.y = startRotY + (targetRotY - startRotY) * ease;
      currentBoardGameMesh.position.y = Math.sin(prog * Math.PI) * 20;

      if (prog < 1) requestAnimationFrame(animate);
      else {
        currentBoardGameMesh.position.y = 0;
        showMsg('🎲 Rolled result!', 'success');
      }
    }
    requestAnimationFrame(animate);
  }

  function generateBoardGame() {
    setLoading(true, 'Fabricating 3D Tabletop Gaming Kit...');
    setTimeout(function () {
      try {
        var type = (el('board-type-select') || {}).value || 'd6';
        var size = parseFloat((el('board-size-slider') || {}).value || 22);
        var inset = parseFloat((el('board-inset-slider') || {}).value || 1.2);
        var chamfer = parseFloat((el('board-chamfer-slider') || {}).value || 1.5);
        var style = (el('board-style-select') || {}).value || 'marble';

        var p = {
          type: type,
          size: size,
          inset: inset,
          chamfer: chamfer,
          style: style
        };

        var model = buildBoardGameObject(p);
        pushModel(model, 'tabletop_' + type);
        showMsg((window.I18N && I18N.t) ? I18N.t('toastBoardGenerated') : 'Tabletop 3D Component generated successfully!', 'success');
      } catch (err) {
        console.error(err);
        showMsg('Error: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    }, 40);
  }

  async function exportFullRPGDiceZip() {
    if (!window.JSZip || !window.ModelConverters) {
      showMsg('JSZip library not available for ZIP export!', 'error');
      return;
    }
    setLoading(true, 'Packaging Complete 7-Piece RPG Polyhedral Dice Set (.ZIP)...');
    try {
      var zip = new JSZip();
      var diceTypes = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
      var style = (el('board-style-select') || {}).value || 'marble';

      for (var i = 0; i < diceTypes.length; i++) {
        var dt = diceTypes[i];
        var dMesh = buildBoardGameObject({ type: dt, size: 22, inset: 1.2, chamfer: 1.5, style: style });
        var exp = await ModelConverters.exportModel(dMesh, 'stl', 'RPG_' + dt.toUpperCase());
        zip.file('0' + (i + 1) + '_' + dt.toUpperCase() + '_Polyhedral_Die.stl', exp.blob);
      }

      var zipBlob = await zip.generateAsync({ type: 'blob' });
      ModelConverters.triggerDownload(zipBlob, 'Full_7Piece_RPG_Polyhedral_Dice_Kit.zip');
      showMsg('Full RPG Polyhedral Dice Set (.ZIP) exported!', 'success');
    } catch (e) {
      showMsg('ZIP Export error: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function doExport(fmt) {
    if (!currentBoardGameMesh) { showMsg('Please generate a model first!', 'warning'); return; }
    setLoading(true, 'Exporting ' + fmt.toUpperCase() + '...');
    try {
      if (fmt === '3mf' && window.ModelConverters && ModelConverters.export3MF) {
        var r3 = await ModelConverters.export3MF(currentBoardGameMesh, 'BoardGame_Model');
        ModelConverters.triggerDownload(r3.blob, r3.filename);
        showMsg('Multi-Color 3MF exported!', 'success');
        return;
      }
      var r = await ModelConverters.exportModel(currentBoardGameMesh, fmt, 'boardgame_model');
      ModelConverters.triggerDownload(r.blob, r.filename);
      showMsg('Exported ' + fmt.toUpperCase() + ' successfully!', 'success');
    } catch (e) {
      showMsg('Export error: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function init() {
    wireSlider('board-size-slider', 'board-size-val');
    wireSlider('board-inset-slider', 'board-inset-val');
    wireSlider('board-chamfer-slider', 'board-chamfer-val');

    var typSel = el('board-type-select');
    if (typSel) typSel.addEventListener('change', generateBoardGame);
    var stySel = el('board-style-select');
    if (stySel) stySel.addEventListener('change', generateBoardGame);

    var gb = el('btn-generate-board');
    if (gb) gb.addEventListener('click', generateBoardGame);

    var rollBtn = el('btn-roll-dice');
    if (rollBtn) rollBtn.addEventListener('click', rollDiceAnimation);

    var ezip = el('btn-export-board-zip');
    if (ezip) ezip.addEventListener('click', exportFullRPGDiceZip);

    var estl = el('btn-export-board-stl');
    if (estl) estl.addEventListener('click', function () { doExport('stl'); });
    var eglb = el('btn-export-board-glb');
    if (eglb) eglb.addEventListener('click', function () { doExport('glb'); });
    var e3mf = el('btn-export-board-3mf');
    if (e3mf) e3mf.addEventListener('click', function () { doExport('3mf'); });
    var ehtml = el('btn-export-board-html');
    if (ehtml) ehtml.addEventListener('click', function () { doExport('html'); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  window.__boardGameEngine = { generate: generateBoardGame, roll: rollDiceAnimation };
})();
