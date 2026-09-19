/**
 * PolyMorph 3D Studio - GridMaster Workshop & Rugged Storage Engine (Tab: GridMaster)
 * High-Precision Parametric Workshop Organizers & Functional Enclosures:
 * - Gridfinity Modular Storage Bins (42mm standard, finger scoop, magnet sockets, label tabs)
 * - Rugged Waterproof Utility Box (Peli-style, print-in-place hinges, snap latches, gasket channel, dynamic lid angle)
 * - Honeycomb Storage Wall (HSW) & Modular Snap Tool Holders
 * - Modular Tiered Drill Bit & Hex Driver Carousel
 * 100% 3D Printable, parametric, and watertight.
 */

(function () {
  'use strict';

  var currentGridMesh = null;
  var currentGridType = 'gridfinity';

  function el(id) { return document.getElementById(id); }
  function showMsg(msg, type) {
    if (typeof showToast === 'function') showToast(msg, type || 'info');
    else console.log('[GridMaster]', msg);
  }
  function setLoading(on, txt) {
    var ov = el('loading-overlay'), lb = el('loading-text');
    if (!ov) return;
    if (on) { if (lb) lb.textContent = txt || 'Generating Parametric Storage Model...'; ov.classList.add('visible'); }
    else { ov.classList.remove('visible'); }
  }

  function pushModel(mesh, name) {
    currentGridMesh = mesh;
    if (typeof window.__polymorphSetModel === 'function') {
      window.__polymorphSetModel(mesh, name);
      return;
    }
    document.dispatchEvent(new CustomEvent('gridmaster3dReady', { detail: { mesh: mesh, name: name } }));
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
      generateGridmaster();
    });
    upd();
  }

  // ── 1. GRIDFINITY MODULAR STORAGE BIN (42mm Standard) ────────────────────
  function buildGridfinityBin(p) {
    var T = window.THREE;
    var unitsX = parseInt(p.unitsX) || 2; // 1 to 5
    var unitsY = parseInt(p.unitsY) || 2; // 1 to 5
    var unitsZ = parseInt(p.unitsZ) || 3; // 2 to 8 (7mm each)
    var divX = parseInt(p.divX) || 1; // internal partitions along X
    var divY = parseInt(p.divY) || 1; // internal partitions along Y
    var scoop = p.scoop !== false; // curved scoop bottom for small screws
    var magnets = p.magnets !== false; // 6.5x2.4mm magnet recesses
    var labelTab = p.labelTab !== false; // 12mm angled label lip

    var grp = new T.Group();
    grp.name = 'Gridfinity_Bin_' + unitsX + 'x' + unitsY + 'x' + unitsZ;

    var pitch = 42.0; // mm Gridfinity base grid pitch
    var clearance = 0.5; // mm standard clearance
    var totalW = unitsX * pitch - clearance;
    var totalD = unitsY * pitch - clearance;
    var totalH = unitsZ * 7.0; // mm height (e.g. 3u = 21mm)
    var wall = 1.6; // mm wall thickness
    var lipH = 2.6; // mm stacking lip height

    // Palette: Industrial Tech Orange or Matte Gray
    var matBin = new T.MeshStandardMaterial({
      color: (p.matColor === 'gray') ? 0x334155 : ((p.matColor === 'blue') ? 0x0284c7 : 0xe11d48), // Ruby/Tech Red default
      roughness: 0.35,
      metalness: 0.15
    });
    var matLip = new T.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.2
    });

    // 1. Base Gridfinity Profile Bases (each 42x42 footprint has beveled stacking feet)
    for (var gx = 0; gx < unitsX; gx++) {
      for (var gy = 0; gy < unitsY; gy++) {
        var cx = (gx - (unitsX - 1) / 2.0) * pitch;
        var cz = (gy - (unitsY - 1) / 2.0) * pitch;

        // Beveled foot pad
        var footGeo = new T.CylinderGeometry(pitch / 2 - 1.2, pitch / 2 - 2.8, 4.2, 4);
        var foot = new T.Mesh(footGeo, matBin);
        foot.rotation.y = Math.PI / 4;
        foot.position.set(cx, 2.1, cz);
        grp.add(foot);

        // Corner Magnet Pockets (6.5mm diam x 2.4mm depth)
        if (magnets) {
          var magOffset = 13.0; // mm from unit center to corner hole
          var corners = [
            { x: cx - magOffset, z: cz - magOffset },
            { x: cx + magOffset, z: cz - magOffset },
            { x: cx - magOffset, z: cz + magOffset },
            { x: cx + magOffset, z: cz + magOffset }
          ];
          var magGeo = new T.CylinderGeometry(3.25, 3.25, 2.4, 16);
          var magMat = new T.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.1 });
          corners.forEach(function (cPos) {
            var mag = new T.Mesh(magGeo, magMat);
            mag.position.set(cPos.x, 1.2, cPos.z);
            grp.add(mag);
          });
        }
      }
    }

    // 2. Main Outer Tub Walls
    // Bottom plate
    var floorGeo = new T.BoxGeometry(totalW, 2.0, totalD);
    var floor = new T.Mesh(floorGeo, matBin);
    floor.position.set(0, 5.0, 0);
    grp.add(floor);

    // Outer 4 perimeter walls
    var wallH = totalH - 4.0;
    var wallSpecs = [
      { w: totalW, h: wallH, d: wall, x: 0, y: 5.0 + wallH / 2, z: totalD / 2 - wall / 2 },
      { w: totalW, h: wallH, d: wall, x: 0, y: 5.0 + wallH / 2, z: -totalD / 2 + wall / 2 },
      { w: wall, h: wallH, d: totalD - wall * 2, x: -totalW / 2 + wall / 2, y: 5.0 + wallH / 2, z: 0 },
      { w: wall, h: wallH, d: totalD - wall * 2, x: totalW / 2 - wall / 2, y: 5.0 + wallH / 2, z: 0 }
    ];
    wallSpecs.forEach(function (ws) {
      var wMesh = new T.Mesh(new T.BoxGeometry(ws.w, ws.h, ws.d), matBin);
      wMesh.position.set(ws.x, ws.y, ws.z);
      grp.add(wMesh);
    });

    // 3. Stacking Top Rim Lip (interlocking 45-deg top profile)
    var lipSpecs = [
      { w: totalW + 0.8, h: lipH, d: 2.4, x: 0, y: totalH + lipH / 2 + 1.0, z: totalD / 2 - 1.2 },
      { w: totalW + 0.8, h: lipH, d: 2.4, x: 0, y: totalH + lipH / 2 + 1.0, z: -totalD / 2 + 1.2 },
      { w: 2.4, h: lipH, d: totalD - 1.6, x: -totalW / 2 + 1.2, y: totalH + lipH / 2 + 1.0, z: 0 },
      { w: 2.4, h: lipH, d: totalD - 1.6, x: totalW / 2 - 1.2, y: totalH + lipH / 2 + 1.0, z: 0 }
    ];
    lipSpecs.forEach(function (ls) {
      var lMesh = new T.Mesh(new T.BoxGeometry(ls.w, ls.h, ls.d), matLip);
      lMesh.position.set(ls.x, ls.y, ls.z);
      grp.add(lMesh);
    });

    // 4. Internal Dividers / Compartments
    if (divX > 1) {
      var slotW = (totalW - wall * 2) / divX;
      for (var dx = 1; dx < divX; dx++) {
        var dpx = -totalW / 2 + wall + dx * slotW;
        var partGeo = new T.BoxGeometry(wall, wallH * 0.9, totalD - wall * 2);
        var part = new T.Mesh(partGeo, matBin);
        part.position.set(dpx, 5.0 + (wallH * 0.9) / 2, 0);
        grp.add(part);
      }
    }
    if (divY > 1) {
      var slotD = (totalD - wall * 2) / divY;
      for (var dy = 1; dy < divY; dy++) {
        var dpz = -totalD / 2 + wall + dy * slotD;
        var partYGeo = new T.BoxGeometry(totalW - wall * 2, wallH * 0.9, wall);
        var partY = new T.Mesh(partYGeo, matBin);
        partY.position.set(0, 5.0 + (wallH * 0.9) / 2, dpz);
        grp.add(partY);
      }
    }

    // 5. Ergonomic Finger Scoop Bottom Fillet
    if (scoop) {
      var scoopGeo = new T.CylinderGeometry(5.0, 5.0, totalW - wall * 2, 16, 1, false, 0, Math.PI / 2);
      var scoopMesh = new T.Mesh(scoopGeo, matBin);
      scoopMesh.rotation.z = Math.PI / 2;
      scoopMesh.rotation.y = Math.PI / 2;
      scoopMesh.position.set(0, 8.5, totalD / 2 - wall - 3.5);
      grp.add(scoopMesh);
    }

    // 6. Angled Label Tab Lip
    if (labelTab) {
      var tabW = Math.min(totalW * 0.6, 40.0);
      var tabGeo = new T.BoxGeometry(tabW, 8.0, 1.6);
      var tabMesh = new T.Mesh(tabGeo, matLip);
      tabMesh.rotation.x = -Math.PI / 4;
      tabMesh.position.set(0, totalH + 2.0, -totalD / 2 + 4.0);
      grp.add(tabMesh);
    }

    return grp;
  }

  // ── 2. RUGGED WATERPROOF UTILITY BOX (Peli-Style) ─────────────────────────
  function buildRuggedBox(p) {
    var T = window.THREE;
    var len = p.boxL || 95; // mm
    var width = p.boxW || 65; // mm
    var height = p.boxH || 38; // mm
    var wall = 3.2; // mm
    var openAngle = (parseFloat(p.lidAngle) || 0) * (Math.PI / 180.0); // 0 to 120 deg

    var grp = new T.Group();
    grp.name = 'Rugged_Waterproof_Case';

    // Materials
    var matCase = new T.MeshStandardMaterial({
      color: 0x0f172a, // Mil-Spec Tactical Slate Black
      roughness: 0.45,
      metalness: 0.15
    });
    var matLid = new T.MeshStandardMaterial({
      color: 0xd97706, // High-Vis Safety Amber Orange
      roughness: 0.35,
      metalness: 0.2
    });
    var matSeal = new T.MeshStandardMaterial({
      color: 0x22c55e, // Neon Green TPU gasket seal
      roughness: 0.7,
      metalness: 0.05
    });
    var matLatch = new T.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.3,
      metalness: 0.7
    });

    // 1. Lower Case Tub
    var tubH = height * 0.65;
    var tubGeo = new T.BoxGeometry(len, tubH, width);
    var tubMesh = new T.Mesh(tubGeo, matCase);
    tubMesh.position.set(0, tubH / 2, 0);
    grp.add(tubMesh);

    // External Structural Reinforcement Ribs on Tub
    for (var rx = -len / 2 + 12; rx <= len / 2 - 12; rx += 18) {
      var ribGeo = new T.BoxGeometry(3.0, tubH + 1.0, width + 4.0);
      var rib = new T.Mesh(ribGeo, matCase);
      rib.position.set(rx, tubH / 2, 0);
      grp.add(rib);
    }

    // Perimeter Tongue Groove with TPU Gasket
    var sealGeo = new T.BoxGeometry(len - wall, 1.8, width - wall);
    var seal = new T.Mesh(sealGeo, matSeal);
    seal.position.set(0, tubH + 0.9, 0);
    grp.add(seal);

    // 2. Hinged Lid Assembly (Rotates dynamically along rear hinge axis!)
    var lidH = height * 0.35;
    var lidGrp = new T.Group();
    // Hinge Pivot is located at rear top of tub: z = -width / 2, y = tubH
    lidGrp.position.set(0, tubH, -width / 2);
    lidGrp.rotation.x = -openAngle;

    var lidBoxGeo = new T.BoxGeometry(len, lidH, width);
    var lidMesh = new T.Mesh(lidBoxGeo, matLid);
    lidMesh.position.set(0, lidH / 2, width / 2);
    lidGrp.add(lidMesh);

    // Lid Reinforcement Ribs
    for (var lx = -len / 2 + 12; lx <= len / 2 - 12; lx += 18) {
      var lRibGeo = new T.BoxGeometry(3.0, lidH + 2.5, width + 3.0);
      var lRib = new T.Mesh(lRibGeo, matLid);
      lRib.position.set(lx, lidH / 2, width / 2);
      lidGrp.add(lRib);
    }

    // Front Over-Center Snap Latches (2x)
    var latchW = 14;
    var latchPositions = [-len * 0.28, len * 0.28];
    latchPositions.forEach(function (lx) {
      var latchGeo = new T.BoxGeometry(latchW, tubH * 0.7, 5.0);
      var latch = new T.Mesh(latchGeo, matLatch);
      latch.position.set(lx, tubH * 0.65, width / 2 + 3.5);
      grp.add(latch);

      // Latch hinge pins
      var pinGeo = new T.CylinderGeometry(1.6, 1.6, latchW + 4, 16);
      var pin = new T.Mesh(pinGeo, matLatch);
      pin.rotation.z = Math.PI / 2;
      pin.position.set(lx, tubH * 0.9, width / 2 + 4.5);
      grp.add(pin);
    });

    // Rear Print-in-Place Hinge Barrels
    var hingePositions = [-len * 0.32, 0, len * 0.32];
    hingePositions.forEach(function (hx) {
      var barrelGeo = new T.CylinderGeometry(3.5, 3.5, 12, 16);
      var barrel = new T.Mesh(barrelGeo, matCase);
      barrel.rotation.z = Math.PI / 2;
      barrel.position.set(hx, tubH, -width / 2 - 2.5);
      grp.add(barrel);
    });

    grp.add(lidGrp);

    // Heavy-Duty Ergonomic Folding Carry Handle
    var handleGeo = new T.TorusGeometry(18, 3.5, 12, 32, Math.PI);
    var handle = new T.Mesh(handleGeo, matLatch);
    handle.position.set(0, tubH * 0.5, width / 2 + 14);
    handle.rotation.x = Math.PI / 2;
    grp.add(handle);

    return grp;
  }

  // ── 3. HONEYCOMB STORAGE WALL (HSW) & TOOL HOLDERS ────────────────────────
  function buildHoneycombWall(p) {
    var T = window.THREE;
    var toolType = p.toolType || 'screwdriver';
    var wallSize = 110; // mm square tile
    var hexR = 9.5; // mm hexagon cell inradius
    var thickness = 6.0; // mm

    var grp = new T.Group();
    grp.name = 'Honeycomb_Storage_Wall_' + toolType;

    var matWall = new T.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.45,
      metalness: 0.2
    });
    var matTool = new T.MeshStandardMaterial({
      color: 0x06b6d4, // Vivid Cyan Tech
      roughness: 0.3,
      metalness: 0.3
    });

    // 1. Hexagonal Honeycomb Perforated Wall Tile
    var rows = 6, cols = 6;
    var dx = hexR * Math.sqrt(3) + 1.8;
    var dy = hexR * 1.5 + 1.8;

    for (var r = -rows / 2; r < rows / 2; r++) {
      for (var c = -cols / 2; c < cols / 2; c++) {
        var hx = c * dx + ((Math.abs(r) % 2 === 1) ? dx / 2 : 0);
        var hy = r * dy;

        if (Math.abs(hx) < wallSize / 2 - hexR && Math.abs(hy) < wallSize / 2 - hexR) {
          // Hollow hexagon rim
          var hexRing = new T.Mesh(new T.CylinderGeometry(hexR + 1.4, hexR + 1.4, thickness, 6), matWall);
          hexRing.rotation.x = Math.PI / 2;
          hexRing.position.set(hx, hy, 0);
          grp.add(hexRing);
        }
      }
    }

    // Outer framing boundary
    var frameGeo = new T.BoxGeometry(wallSize, 3.5, thickness + 1.0);
    var topF = new T.Mesh(frameGeo, matWall);
    topF.position.set(0, wallSize / 2, 0);
    var botF = new T.Mesh(frameGeo, matWall);
    botF.position.set(0, -wallSize / 2, 0);
    var sideGeo = new T.BoxGeometry(3.5, wallSize, thickness + 1.0);
    var leftF = new T.Mesh(sideGeo, matWall);
    leftF.position.set(-wallSize / 2, 0, 0);
    var rightF = new T.Mesh(sideGeo, matWall);
    rightF.position.set(wallSize / 2, 0, 0);
    grp.add(topF, botF, leftF, rightF);

    // 2. Snap-in Modular Tool Holders mounted in front of the wall
    var mountZ = thickness / 2 + 14;

    if (toolType === 'screwdriver') {
      // Stepped Multi-Screwdriver Rack (5 tiered slots)
      var rackGeo = new T.BoxGeometry(70, 10, 26);
      var rack = new T.Mesh(rackGeo, matTool);
      rack.position.set(0, 0, mountZ);
      grp.add(rack);

      // Holes for screwdrivers
      [-24, -12, 0, 12, 24].forEach(function (hx, idx) {
        var holeR = 3.5 + idx * 0.7;
        var hole = new T.Mesh(new T.CylinderGeometry(holeR, holeR, 12, 16), new T.MeshStandardMaterial({ color: 0x0f172a }));
        hole.position.set(hx, 0, mountZ);
        grp.add(hole);
      });
    } else if (toolType === 'pliers') {
      // Dual-Jaw Pliers Holster Bracket
      var holsterL = new T.Mesh(new T.BoxGeometry(12, 38, 22), matTool);
      holsterL.position.set(-18, 0, mountZ);
      var holsterR = new T.Mesh(new T.BoxGeometry(12, 38, 22), matTool);
      holsterR.position.set(18, 0, mountZ);
      var crossBar = new T.Mesh(new T.BoxGeometry(48, 6, 22), matTool);
      crossBar.position.set(0, -16, mountZ);
      grp.add(holsterL, holsterR, crossBar);
    } else {
      // Universal Caliper / Tape Measure Hanger
      var hookL = new T.Mesh(new T.CylinderGeometry(3.5, 3.5, 30, 16), matTool);
      hookL.rotation.x = Math.PI / 2;
      hookL.position.set(-16, 0, mountZ);
      var hookR = new T.Mesh(new T.CylinderGeometry(3.5, 3.5, 30, 16), matTool);
      hookR.rotation.x = Math.PI / 2;
      hookR.position.set(16, 0, mountZ);
      grp.add(hookL, hookR);
    }

    return grp;
  }

  // ── 4. MODULAR DRILL BIT & HEX CAROUSEL ────────────────────────────────────
  function buildBitCarousel(p) {
    var T = window.THREE;
    var radius = p.scale || 50; // mm
    var grp = new T.Group();
    grp.name = 'Modular_Bit_Carousel';

    var matBase = new T.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.3 });
    var matTier = new T.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.6 }); // Amber Gold
    var matBit = new T.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.15, metalness: 0.95 });

    // Tier 1: Outer lower ring for 1/4" Hex Bits (20 positions)
    var t1H = 14;
    var t1Mesh = new T.Mesh(new T.CylinderGeometry(radius, radius + 4, t1H, 36), matTier);
    t1Mesh.position.y = t1H / 2;
    grp.add(t1Mesh);

    var count1 = 18;
    for (var i = 0; i < count1; i++) {
      var a1 = (i * Math.PI * 2) / count1;
      var bx = Math.cos(a1) * (radius * 0.82);
      var bz = Math.sin(a1) * (radius * 0.82);

      // Hex driver bit simulated in hole
      var bitMesh = new T.Mesh(new T.CylinderGeometry(3.175, 3.175, 18, 6), matBit);
      bitMesh.position.set(bx, t1H + 4, bz);
      grp.add(bitMesh);
    }

    // Tier 2: Mid ring for drill bits 3mm-6mm (12 positions)
    var t2R = radius * 0.62;
    var t2H = 26;
    var t2Mesh = new T.Mesh(new T.CylinderGeometry(t2R, t2R + 2, t2H, 32), matTier);
    t2Mesh.position.y = t2H / 2;
    grp.add(t2Mesh);

    var count2 = 12;
    for (var j = 0; j < count2; j++) {
      var a2 = (j * Math.PI * 2) / count2;
      var cx = Math.cos(a2) * (t2R * 0.72);
      var cz = Math.sin(a2) * (t2R * 0.72);

      var drillMesh = new T.Mesh(new T.CylinderGeometry(2.5, 2.5, 24, 16), matBit);
      drillMesh.position.set(cx, t2H + 6, cz);
      grp.add(drillMesh);
    }

    // Tier 3: Top center knob with finger grip
    var centerPost = new T.Mesh(new T.CylinderGeometry(10, 12, 38, 24), matBase);
    centerPost.position.y = 19;
    var knob = new T.Mesh(new T.TorusGeometry(10, 3.5, 16, 32), matBase);
    knob.position.y = 38;
    grp.add(centerPost, knob);

    return grp;
  }

  // ── GENERATE CONTROLLER ───────────────────────────────────────────────────
  function generateGridmaster() {
    setLoading(true, 'Building GridMaster 3D Model...');
    setTimeout(function () {
      try {
        var typeSel = el('grid-type-select');
        currentGridType = typeSel ? typeSel.value : 'gridfinity';

        var p = {
          unitsX: el('grid-units-x') ? el('grid-units-x').value : 2,
          unitsY: el('grid-units-y') ? el('grid-units-y').value : 2,
          unitsZ: el('grid-units-z') ? el('grid-units-z').value : 3,
          divX: el('grid-div-x') ? el('grid-div-x').value : 1,
          divY: el('grid-div-y') ? el('grid-div-y').value : 1,
          scoop: el('grid-scoop-toggle') ? el('grid-scoop-toggle').checked : true,
          magnets: el('grid-magnets-toggle') ? el('grid-magnets-toggle').checked : true,
          labelTab: el('grid-label-toggle') ? el('grid-label-toggle').checked : true,
          boxL: parseFloat(el('grid-box-len') ? el('grid-box-len').value : 95),
          boxW: parseFloat(el('grid-box-width') ? el('grid-box-width').value : 65),
          boxH: parseFloat(el('grid-box-height') ? el('grid-box-height').value : 38),
          lidAngle: parseFloat(el('grid-lid-angle') ? el('grid-lid-angle').value : 0),
          toolType: el('grid-tool-type') ? el('grid-tool-type').value : 'screwdriver',
          matColor: el('grid-color-select') ? el('grid-color-select').value : 'red'
        };

        var model = null;
        if (currentGridType === 'gridfinity') model = buildGridfinityBin(p);
        else if (currentGridType === 'rugged_box') model = buildRuggedBox(p);
        else if (currentGridType === 'hsw_wall') model = buildHoneycombWall(p);
        else if (currentGridType === 'bit_carousel') model = buildBitCarousel(p);
        else model = buildGridfinityBin(p);

        if (model) {
          pushModel(model, 'GridMaster_' + currentGridType);
          showMsg('GridMaster 3D model generated!', 'success');
        }
      } catch (err) {
        console.error('[GridMaster Error]', err);
        showMsg('Error generating model: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    }, 40);
  }

  // ── EXPORT HANDLER ────────────────────────────────────────────────────────
  async function doExport(fmt) {
    if (!currentGridMesh) { showMsg('Please generate a storage model first!', 'warning'); return; }
    setLoading(true, 'Exporting ' + fmt.toUpperCase() + '...');
    try {
      if (fmt === '3mf' && window.ModelConverters && ModelConverters.export3MF) {
        var r3 = await ModelConverters.export3MF(currentGridMesh, 'GridMaster_' + currentGridType);
        ModelConverters.triggerDownload(r3.blob, r3.filename);
        showMsg('Multi-Color 3MF exported!', 'success');
        return;
      }
      var r = await ModelConverters.exportModel(currentGridMesh, fmt, 'gridmaster_' + currentGridType);
      ModelConverters.triggerDownload(r.blob, r.filename);
      showMsg('Exported ' + fmt.toUpperCase() + ' successfully!', 'success');
    } catch (e) {
      showMsg('Export error: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function updateTypeUI() {
    var type = el('grid-type-select') ? el('grid-type-select').value : 'gridfinity';
    var binParams = el('grid-bin-params');
    var boxParams = el('grid-box-params');
    var hswParams = el('grid-hsw-params');

    if (binParams) binParams.style.display = (type === 'gridfinity') ? 'flex' : 'none';
    if (boxParams) boxParams.style.display = (type === 'rugged_box') ? 'flex' : 'none';
    if (hswParams) hswParams.style.display = (type === 'hsw_wall') ? 'flex' : 'none';
  }

  function init() {
    var typeSel = el('grid-type-select');
    if (typeSel) {
      typeSel.addEventListener('change', function () {
        updateTypeUI();
        generateGridmaster();
      });
      updateTypeUI();
    }

    wireSlider('grid-units-x', 'grid-units-x-val');
    wireSlider('grid-units-y', 'grid-units-y-val');
    wireSlider('grid-units-z', 'grid-units-z-val');
    wireSlider('grid-div-x', 'grid-div-x-val');
    wireSlider('grid-div-y', 'grid-div-y-val');
    wireSlider('grid-box-len', 'grid-box-len-val');
    wireSlider('grid-box-width', 'grid-box-width-val');
    wireSlider('grid-box-height', 'grid-box-height-val');
    wireSlider('grid-lid-angle', 'grid-lid-angle-val');

    var sTog = el('grid-scoop-toggle');
    if (sTog) sTog.addEventListener('change', generateGridmaster);
    var mTog = el('grid-magnets-toggle');
    if (mTog) mTog.addEventListener('change', generateGridmaster);
    var lTog = el('grid-label-toggle');
    if (lTog) lTog.addEventListener('change', generateGridmaster);

    var toolSel = el('grid-tool-type');
    if (toolSel) toolSel.addEventListener('change', generateGridmaster);
    var colSel = el('grid-color-select');
    if (colSel) colSel.addEventListener('change', generateGridmaster);

    var gb = el('btn-generate-grid');
    if (gb) gb.addEventListener('click', generateGridmaster);

    var estl = el('btn-export-grid-stl');
    if (estl) estl.addEventListener('click', function () { doExport('stl'); });
    var eglb = el('btn-export-grid-glb');
    if (eglb) eglb.addEventListener('click', function () { doExport('glb'); });
    var e3mf = el('btn-export-grid-3mf');
    if (e3mf) e3mf.addEventListener('click', function () { doExport('3mf'); });
    var ehtml = el('btn-export-grid-html');
    if (ehtml) ehtml.addEventListener('click', function () { doExport('html'); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.GridMasterEngine = {
    generate: generateGridmaster,
    buildGridfinityBin,
    buildRuggedBox,
    buildHoneycombWall,
    buildBitCarousel
  };
  window.__gridmasterEngine = { generate: generateGridmaster };
})();
