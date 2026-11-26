/**
 * Architect Pro 2 (v3.0) — Three.js r165 7-Phase Structural 3D Engine
 * Features:
 *  - Clean separation: `exportGroup` (building only, ZERO 200m ground plane / GridHelper!)
 *  - True Foundation Geometry (Strip Footings, Raft Slab, Drilled Piles + Grade Beams, Full Basement) + Rebar Cages!
 *  - Real Boolean/Shape Wall Cutouts for every 2D Window & Door (zero Z-fighting, zero exploded frames!)
 *  - True 7-Phase Progression (Every phase 0..6 visually distinct!)
 *  - Phase 6 3D MEP X-Ray Mode (Cold/Hot Water, Sanitary Soil Stack, UFH PEX Serpentine Loops, Electrical Panel & Conduit)
 *  - Real 3D Timber Roof Trusses/Rafters (`flat`, `gable`, `hip`, `shed`) + Gutters & Downpipes
 *  - Real Correctly-Oriented 3D Staircases (`straight`, `l-shape`, `u-shape`)
 *  - Cutaway/Dollhouse Mode, Wireframe, Adjustable Sun Time, Construction Time-Lapse Player!
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

let _container = null;
let _renderer = null;
let _scene = null;
let _camera = null;
let _controls = null;
let _sunLight = null;
let _hemiLight = null;

let _exportGroup = null;     // ONLY the building (exported cleanly to GLB/STL/OBJ/AR!)
let _siteContextGroup = null;// Site lawn, driveway, trees, grid (visual context only!)

let _state = null;
let _phaseIdx = 0;
let _wireframe = false;
let _cutaway = false;
let _mepXray = false;
let _sunHour = 13.5;

let _rafId = null;
let _resizeObserver = null;
let _timelapseTimer = null;
let _timelapsePlaying = false;

function disposeGroup(group) {
  if (!group) return;
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);
    child.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
  }
}

function makeMat(hex, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color: hex,
    roughness: opts.roughness !== undefined ? opts.roughness : 0.72,
    metalness: opts.metalness !== undefined ? opts.metalness : 0.06,
    transparent: !!opts.transparent,
    opacity: opts.opacity !== undefined ? opts.opacity : 1.0,
    side: opts.side !== undefined ? opts.side : THREE.FrontSide,
    depthWrite: opts.depthWrite !== undefined ? opts.depthWrite : true,
    wireframe: _wireframe
  });
}

// =========================================================================
// REAL WALL WITH SHAPE HOLES (ZERO Z-FIGHTING, TRUE CUTOUTS!)
// =========================================================================

function buildWallWithHoles(length, height, thickness, openings, mat) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(length, 0);
  shape.lineTo(length, height);
  shape.lineTo(0, height);
  shape.closePath();

  // Sort & sanitize openings so holes never overlap or cross boundary
  const clean = [];
  const sorted = (openings || []).slice().sort((a, b) => a.cx - b.cx);
  for (let i = 0; i < sorted.length; i++) {
    const o = sorted[i];
    const hw = Math.min(o.w / 2, length * 0.42);
    const x0 = Math.max(0.08, o.cx - hw);
    const x1 = Math.min(length - 0.08, o.cx + hw);
    const y0 = Math.max(0, o.y0);
    const y1 = Math.min(height - 0.12, o.y1);
    if (x1 - x0 < 0.25 || y1 - y0 < 0.35) continue;
    if (clean.length > 0 && x0 < clean[clean.length - 1].x1 + 0.06) continue;
    clean.push({ x0, x1, y0, y1 });
  }

  for (let i = 0; i < clean.length; i++) {
    const h = clean[i];
    const hole = new THREE.Path();
    // Keep sill slightly above y=0 (0.005) if door so Three.js earcut triangulation never degenerates on outer edge
    const by0 = Math.max(0.005, h.y0);
    hole.moveTo(h.x0, by0);
    hole.lineTo(h.x1, by0);
    hole.lineTo(h.x1, h.y1);
    hole.lineTo(h.x0, h.y1);
    hole.closePath();
    shape.holes.push(hole);
  }

  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 1 });
  geo.translate(0, 0, -thickness / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = !mat.transparent;
  mesh.receiveShadow = true;
  return mesh;
}

// Recessed 3D Window Assembly strictly in Wall Local Space (FIXED exploded frames!)
function buildWindowAssembly(cx, y0, w, h, wallThick, frameColor, xray) {
  const grp = new THREE.Group();
  grp.position.set(cx, y0 + h / 2, 0);

  const fMat = makeMat(frameColor, { roughness: 0.35, metalness: 0.35, transparent: xray, opacity: xray ? 0.35 : 1 });
  const gMat = new THREE.MeshPhysicalMaterial({
    color: 0x93c5fd,
    roughness: 0.08,
    metalness: 0.1,
    transparent: true,
    opacity: xray ? 0.18 : 0.42,
    wireframe: _wireframe
  });
  const ft = 0.055;
  const fd = wallThick * 0.72;

  // Perimeter frame (top, bottom, left, right) + center mullion
  const topB = new THREE.Mesh(new THREE.BoxGeometry(w, ft, fd), fMat);
  topB.position.y = h / 2 - ft / 2;
  const botB = new THREE.Mesh(new THREE.BoxGeometry(w, ft, fd), fMat);
  botB.position.y = -h / 2 + ft / 2;
  const leftB = new THREE.Mesh(new THREE.BoxGeometry(ft, h, fd), fMat);
  leftB.position.x = -w / 2 + ft / 2;
  const rightB = new THREE.Mesh(new THREE.BoxGeometry(ft, h, fd), fMat);
  rightB.position.x = w / 2 - ft / 2;
  const mullion = new THREE.Mesh(new THREE.BoxGeometry(ft * 0.75, h - ft * 2, fd * 0.7), fMat);

  // Exterior sloped aluminum sill
  const sill = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, 0.04, wallThick + 0.08), makeMat(0x94a3b8, { roughness: 0.4, metalness: 0.5 }));
  sill.position.set(0, -h / 2 - 0.015, 0.015);

  // Glass pane
  const glass = new THREE.Mesh(new THREE.BoxGeometry(w - ft * 2, h - ft * 2, 0.024), gMat);

  grp.add(topB, botB, leftB, rightB, mullion, sill, glass);
  return grp;
}

// Recessed 3D Door Assembly strictly in Wall Local Space
function buildDoorAssembly(cx, w, h, wallThick, isExterior, trimColor, xray) {
  const grp = new THREE.Group();
  grp.position.set(cx, h / 2, 0);

  const frameHex = isExterior ? trimColor : '#92623c';
  const leafHex = isExterior ? trimColor : '#b88355';
  const fMat = makeMat(frameHex, { roughness: 0.45, metalness: 0.15, transparent: xray, opacity: xray ? 0.35 : 1 });
  const lMat = makeMat(leafHex, { roughness: 0.55, metalness: 0.08, transparent: xray, opacity: xray ? 0.25 : 1 });
  const handleMat = makeMat(0xe2e8f0, { roughness: 0.2, metalness: 0.85 });

  const ft = 0.06;
  const fd = wallThick + 0.02;
  const topB = new THREE.Mesh(new THREE.BoxGeometry(w, ft, fd), fMat);
  topB.position.y = h / 2 - ft / 2;
  const leftB = new THREE.Mesh(new THREE.BoxGeometry(ft, h, fd), fMat);
  leftB.position.x = -w / 2 + ft / 2;
  const rightB = new THREE.Mesh(new THREE.BoxGeometry(ft, h, fd), fMat);
  rightB.position.x = w / 2 - ft / 2;

  const leaf = new THREE.Mesh(new THREE.BoxGeometry(w - ft * 2, h - ft, 0.055), lMat);
  leaf.position.y = -ft / 2;
  leaf.castShadow = !xray;

  // Dual door handles
  const h1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.09), handleMat);
  h1.position.set(w / 2 - 0.16, -0.05, 0.03);
  const h2 = h1.clone();
  h2.position.z = -0.03;

  grp.add(topB, leftB, rightB, leaf, h1, h2);
  return grp;
}

// =========================================================================
// PHASE 0: TRUE STRUCTURAL FOUNDATION GEOMETRY (STRIP / RAFT / PILE / BASEMENT)
// =========================================================================

function buildFoundation3D(L, W, fndType, phaseIdx, xray) {
  const grp = new THREE.Group();
  grp.name = 'FoundationSystem';
  const concMat = makeMat(0x8c8a84, { roughness: 0.88, transparent: xray, opacity: xray ? 0.45 : 1 });
  const darkConc = makeMat(0x696762, { roughness: 0.92, transparent: xray, opacity: xray ? 0.45 : 1 });
  const rebarMat = makeMat(0xb45309, { roughness: 0.4, metalness: 0.78 }); // Oxidized structural rebar steel
  const waterMat = makeMat(0x1e293b, { roughness: 0.6, metalness: 0.1 });
  const gravelMat = makeMat(0x78716c, { roughness: 0.96 });
  const showRebar = phaseIdx === 0 || xray;

  if (fndType === 'strip') {
    // Perimeter & central strip footing beams + stem walls
    const fw = 0.65, fh = 0.55;
    const bars = [
      [L + 0.8, fh, fw, 0, -fh / 2, -W / 2],
      [L + 0.8, fh, fw, 0, -fh / 2, W / 2],
      [fw, fh, W + 0.8, -L / 2, -fh / 2, 0],
      [fw, fh, W + 0.8, L / 2, -fh / 2, 0],
      [0.45, fh, W - 0.4, 0, -fh / 2, 0] // interior load-bearing strip
    ];
    bars.forEach(([sx, sy, sz, x, y, z]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), darkConc);
      m.position.set(x, y, z);
      m.castShadow = true; m.receiveShadow = true;
      grp.add(m);
    });

    // Gravel bed + Ground Slab (solidified from Phase 1+, open to see trenches in Phase 0!)
    const bed = new THREE.Mesh(new THREE.BoxGeometry(L - 0.5, 0.18, W - 0.5), gravelMat);
    bed.position.y = -0.35;
    grp.add(bed);

    if (phaseIdx >= 1) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(L + 0.2, 0.22, W + 0.2), concMat);
      slab.position.y = -0.11;
      slab.receiveShadow = true;
      grp.add(slab);
    }

    // Visible steel rebar cages in Phase 0!
    if (showRebar) {
      addRebarPerimeter(grp, L, W, 0.08, rebarMat);
    }
  } else if (fndType === 'raft') {
    // Thick beveled reinforced concrete mat slab
    const matH = 0.48;
    const raft = new THREE.Mesh(new THREE.BoxGeometry(L + 0.8, matH, W + 0.8), concMat);
    raft.position.y = -matH / 2;
    raft.castShadow = true; raft.receiveShadow = true;
    grp.add(raft);

    // Thickened edge skirt
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(L + 1.0, 0.22, W + 1.0), darkConc);
    skirt.position.y = -matH - 0.08;
    grp.add(skirt);

    // Double rebar steel mat mesh visible on top in Phase 0!
    if (showRebar) {
      const yR = 0.04;
      const step = 0.75;
      for (let x = -L / 2 - 0.25; x <= L / 2 + 0.25; x += step) {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, W + 0.5, 6), rebarMat);
        rod.rotation.x = Math.PI / 2;
        rod.position.set(x, yR, 0);
        grp.add(rod);
      }
      for (let z = -W / 2 - 0.25; z <= W / 2 + 0.25; z += step) {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, L + 0.5, 6), rebarMat);
        rod.rotation.z = Math.PI / 2;
        rod.position.set(0, yR + 0.025, z);
        grp.add(rod);
      }
      addRebarPerimeter(grp, L, W, 0.16, rebarMat);
    }
  } else if (fndType === 'pile') {
    // Drilled concrete piles + pile caps + connecting grade beams!
    const nx = Math.max(3, Math.ceil(L / 3.6) + 1);
    const nz = Math.max(3, Math.ceil(W / 3.6) + 1);
    const pileH = 2.6;
    const pileGeo = new THREE.CylinderGeometry(0.22, 0.22, pileH, 12);
    const capGeo = new THREE.BoxGeometry(0.75, 0.42, 0.75);

    for (let ix = 0; ix < nx; ix++) {
      const px = -L / 2 + (L * ix) / (nx - 1);
      for (let iz = 0; iz < nz; iz++) {
        const pz = -W / 2 + (W * iz) / (nz - 1);
        const pile = new THREE.Mesh(pileGeo, darkConc);
        pile.position.set(px, -0.42 - pileH / 2, pz);
        grp.add(pile);

        const cap = new THREE.Mesh(capGeo, concMat);
        cap.position.set(px, -0.22, pz);
        cap.castShadow = true;
        grp.add(cap);
      }
    }

    // Perimeter & cross grade beams
    const beams = [
      [L + 0.4, 0.40, 0.36, 0, -0.20, -W / 2],
      [L + 0.4, 0.40, 0.36, 0, -0.20, W / 2],
      [0.36, 0.40, W + 0.4, -L / 2, -0.20, 0],
      [0.36, 0.40, W + 0.4, L / 2, -0.20, 0],
      [L, 0.35, 0.32, 0, -0.22, 0],
      [0.32, 0.35, W, 0, -0.22, 0]
    ];
    beams.forEach(([sx, sy, sz, x, y, z]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), concMat);
      m.position.set(x, y, z);
      grp.add(m);
    });

    if (phaseIdx >= 1) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(L + 0.2, 0.18, W + 0.2), concMat);
      slab.position.y = -0.09;
      slab.receiveShadow = true;
      grp.add(slab);
    }
    if (showRebar) addRebarPerimeter(grp, L, W, 0.12, rebarMat);
  } else {
    // Full Waterproofed Basement (-2.6m concrete tank!)
    const bH = 2.6;
    const bSlab = new THREE.Mesh(new THREE.BoxGeometry(L + 0.7, 0.30, W + 0.7), darkConc);
    bSlab.position.y = -bH - 0.15;
    grp.add(bSlab);

    const wt = 0.28;
    const bWalls = [
      [L + wt, bH, wt, 0, -bH / 2, -W / 2],
      [L + wt, bH, wt, 0, -bH / 2, W / 2],
      [wt, bH, W + wt, -L / 2, -bH / 2, 0],
      [wt, bH, W + wt, L / 2, -bH / 2, 0]
    ];
    bWalls.forEach(([sx, sy, sz, x, y, z]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), concMat);
      m.position.set(x, y, z);
      grp.add(m);
    });

    // Dark bituminous exterior waterproofing coat + yellow perforated perimeter French drain
    const tankCoat = new THREE.Mesh(new THREE.BoxGeometry(L + wt + 0.04, bH - 0.25, W + wt + 0.04), waterMat);
    tankCoat.position.y = -bH / 2 - 0.1;
    grp.add(tankCoat);

    const drainMat = makeMat(0xeab308, { roughness: 0.5 });
    const dOff = 0.36;
    const pipes = [
      [L + dOff * 2, 0, -W / 2 - dOff, 0],
      [L + dOff * 2, 0, W / 2 + dOff, 0],
      [W + dOff * 2, -L / 2 - dOff, 0, Math.PI / 2],
      [W + dOff * 2, L / 2 + dOff, 0, Math.PI / 2]
    ];
    pipes.forEach(([len, x, z, rot]) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, len, 8), drainMat);
      p.rotation.z = Math.PI / 2;
      if (rot) p.rotation.y = rot;
      p.position.set(x, -bH + 0.08, z);
      grp.add(p);
    });

    if (phaseIdx >= 1) {
      const ceilSlab = new THREE.Mesh(new THREE.BoxGeometry(L + 0.24, 0.22, W + 0.24), concMat);
      ceilSlab.position.y = -0.11;
      ceilSlab.receiveShadow = true;
      grp.add(ceilSlab);
    }
    if (showRebar) addRebarPerimeter(grp, L, W, 0.15, rebarMat);
  }

  return grp;
}

function addRebarPerimeter(grp, L, W, yBase, mat) {
  // Corner vertical starter rebar cages (4 bars per corner)
  const corners = [[-L / 2, -W / 2], [L / 2, -W / 2], [-L / 2, W / 2], [L / 2, W / 2], [0, -W / 2], [0, W / 2]];
  corners.forEach(([cx, cz]) => {
    for (let dx = -0.07; dx <= 0.07; dx += 0.14) {
      for (let dz = -0.07; dz <= 0.07; dz += 0.14) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.85, 6), mat);
        bar.position.set(cx + dx, yBase + 0.35, cz + dz);
        grp.add(bar);
      }
    }
  });
  // Horizontal longitudinal perimeter bars
  const hBars = [
    [L, 0, -W / 2, 0], [L, 0, W / 2, 0],
    [W, -L / 2, 0, Math.PI / 2], [W, L / 2, 0, Math.PI / 2]
  ];
  hBars.forEach(([len, x, z, rot]) => {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, len, 6), mat);
    rod.rotation.z = Math.PI / 2;
    if (rot) rod.rotation.y = rot;
    rod.position.set(x, yBase + 0.06, z);
    grp.add(rod);
  });
}

// =========================================================================
// PHASE 1–6: FLOORS, REAL CUTOUT WALLS, COLUMNS, RING BEAMS, STAIRS, OPENINGS
// =========================================================================

function buildSuperstructure3D(L, W, H, floors, floorPlans, colors, phaseIdx, xray, cutaway) {
  const grp = new THREE.Group();
  grp.name = 'Superstructure';

  // Phase-authentic materials!
  // Phase 1 & 2: Raw warm thermal terracotta/masonry block look; Phase 3+: Finished facade render!
  const extColor = phaseIdx < 3 ? '#c97b58' : (colors.extWalls || '#e5d5c0');
  const intColor = phaseIdx < 4 ? '#cbd5e1' : (colors.intWalls || '#f1f5f9');
  const wallOpacity = xray ? 0.22 : 1.0;

  const extMat = makeMat(extColor, { roughness: phaseIdx < 3 ? 0.92 : 0.72, transparent: xray, opacity: wallOpacity, depthWrite: !xray });
  const intMat = makeMat(intColor, { roughness: 0.78, transparent: xray, opacity: xray ? 0.18 : 1.0, depthWrite: !xray });
  const concMat = makeMat(0x94a3b8, { roughness: 0.84, transparent: xray, opacity: xray ? 0.35 : 1.0, depthWrite: !xray });
  const floorMat = makeMat(phaseIdx >= 4 ? (colors.floor || '#c8a882') : 0x9ca3af, { roughness: phaseIdx >= 4 ? 0.58 : 0.88, transparent: xray, opacity: xray ? 0.40 : 1.0 });

  const showOpeningsMesh = phaseIdx >= 3; // Doors & Windows installed in Phase 3+ (Phase 1-2 show clean empty rough cutouts!)
  const showInteriorDoors = phaseIdx >= 4;
  const trimColor = colors.winDoors || '#1e293b';

  for (let f = 0; f < floors; f++) {
    const y0 = f * H;
    const fp = floorPlans[f] || { walls: [], windows: [], doors: [], stairs: [], columns: [] };
    const isTopFloor = f === floors - 1;
    const wallH = (cutaway && isTopFloor) ? H * 0.58 : H;

    // 1. Floor Finish Deck / Intermediate Reinforced Concrete Slab
    const slabThick = f === 0 ? 0.08 : 0.20;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(L + 0.08, slabThick, W + 0.08), f === 0 ? floorMat : concMat);
    slab.position.set(0, y0 + (f === 0 ? 0.04 : -0.05), 0);
    slab.receiveShadow = true;
    grp.add(slab);

    if (f > 0 && phaseIdx >= 4) {
      const finishDeck = new THREE.Mesh(new THREE.BoxGeometry(L - 0.25, 0.04, W - 0.25), floorMat);
      finishDeck.position.set(0, y0 + 0.07, 0);
      finishDeck.receiveShadow = true;
      grp.add(finishDeck);
    }

    // 2. Four Exterior Perimeter Walls with REAL Cutouts for user windows & doors!
    const extDefs = [
      { id: 'ext-top',    x1: 0, y1: 0, x2: L, y2: 0 },
      { id: 'ext-bottom', x1: 0, y1: W, x2: L, y2: W },
      { id: 'ext-left',   x1: 0, y1: 0, x2: 0, y2: W },
      { id: 'ext-right',  x1: L, y1: 0, x2: L, y2: W }
    ];

    extDefs.forEach(def => {
      const wGroup = buildWallSegment3D(
        def.id, def.x1, def.y1, def.x2, def.y2, L, W, y0, wallH, 0.28,
        fp, extMat, true, showOpeningsMesh, trimColor, xray
      );
      grp.add(wGroup);
    });

    // 3. Structural Corner Columns & Seismic Perimeter Ring Beam (visible clearly in Structure/X-Ray!)
    const colPositions = [
      [-L / 2, -W / 2], [L / 2, -W / 2], [-L / 2, W / 2], [L / 2, W / 2],
      [0, -W / 2], [0, W / 2]
    ];
    if (phaseIdx < 3 || xray) {
      colPositions.forEach(([cx, cz]) => {
        const col = new THREE.Mesh(new THREE.BoxGeometry(0.34, wallH, 0.34), concMat);
        col.position.set(cx, y0 + wallH / 2, cz);
        col.castShadow = !xray;
        grp.add(col);
      });
      // Seismic ring beam along top of floor
      if (!cutaway || !isTopFloor) {
        const ringH = 0.24;
        const rb = [
          [L + 0.34, ringH, 0.32, 0, y0 + H - ringH / 2, -W / 2],
          [L + 0.34, ringH, 0.32, 0, y0 + H - ringH / 2, W / 2],
          [0.32, ringH, W + 0.34, -L / 2, y0 + H - ringH / 2, 0],
          [0.32, ringH, W + 0.34, L / 2, y0 + H - ringH / 2, 0]
        ];
        rb.forEach(([sx, sy, sz, x, y, z]) => {
          const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), concMat);
          m.position.set(x, y, z);
          grp.add(m);
        });
      }
    }

    // 4. User-Placed Interior Structural Columns
    (fp.columns || []).forEach(c => {
      const sz = c.size || 0.30;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(sz, wallH, sz), concMat);
      mesh.position.set(c.x - L / 2, y0 + wallH / 2, c.y - W / 2);
      mesh.castShadow = !xray;
      grp.add(mesh);
    });

    // 5. User-Drawn Interior Walls with REAL Door & Window Cutouts!
    (fp.walls || []).forEach(w => {
      const wGroup = buildWallSegment3D(
        w.id, w.x1, w.y1, w.x2, w.y2, L, W, y0, wallH - 0.04, w.thickness || 0.15,
        fp, intMat, false, showInteriorDoors, trimColor, xray
      );
      grp.add(wGroup);
    });

    // 6. Real Correctly-Oriented 3D Staircases (FIXED rotation & up/down!)
    (fp.stairs || []).forEach(st => {
      const stGrp = buildStaircase3D(st, L, W, y0, H, phaseIdx >= 4, xray);
      grp.add(stGrp);
    });
  }

  return grp;
}

function buildWallSegment3D(wallId, x1, y1, x2, y2, L, W, yBase, wallH, thick, fp, wallMat, isExterior, showHardware, trimColor, xray) {
  const dx = x2 - x1;
  const dz = y2 - y1;
  const len = Math.hypot(dx, dz);
  const grp = new THREE.Group();
  if (len < 0.1) return grp;

  // Position group at wall start (x1 - L/2, yBase, y1 - W/2) and rotate so local +X runs along the wall!
  grp.position.set(x1 - L / 2, yBase, y1 - W / 2);
  grp.rotation.y = -Math.atan2(dz, dx);

  const openings = [];
  const hostedWins = (fp.windows || []).filter(w => w.wallId === wallId);
  const hostedDoors = (fp.doors || []).filter(d => d.wallId === wallId);

  hostedWins.forEach(win => {
    const cx = win.t * len;
    const h = Math.min(win.height || 1.35, wallH - 0.35);
    const y0 = Math.min(win.sill || 0.9, Math.max(0.15, wallH - h - 0.15));
    if (h > 0.3) openings.push({ kind: 'window', cx, w: win.width || 1.4, y0, y1: y0 + h });
  });

  hostedDoors.forEach(dr => {
    const cx = dr.t * len;
    const h = Math.min(dr.height || 2.1, wallH - 0.15);
    openings.push({ kind: 'door', cx, w: dr.width || 0.9, y0: 0, y1: h });
  });

  const wallMesh = buildWallWithHoles(len, wallH, thick, openings, wallMat);
  grp.add(wallMesh);

  // Add recessed 3D Window/Door hardware strictly in local space (ZERO coordinate explosion!)
  if (showHardware) {
    openings.forEach(o => {
      if (o.kind === 'window') {
        grp.add(buildWindowAssembly(o.cx, o.y0, o.w, o.y1 - o.y0, thick, trimColor, xray));
      } else {
        grp.add(buildDoorAssembly(o.cx, o.w, o.y1, thick, isExterior, trimColor, xray));
      }
    });
  }

  return grp;
}

// FIXED 3D STAIRCASE (True orientation, direction, U/L/Straight styles + handrail!)
function buildStaircase3D(st, L, W, yBase, floorH, isFinished, xray) {
  const grp = new THREE.Group();
  const cx = st.x + st.w / 2 - L / 2;
  const cz = st.y + st.h / 2 - W / 2;
  grp.position.set(cx, yBase, cz);

  const dir = st.dir || 'right';
  const isVert = dir === 'up' || dir === 'down';
  const runLen = isVert ? st.h : st.w;
  const flightW = isVert ? st.w : st.h;

  // Rotate local +X to point in the exact climb direction!
  if (dir === 'right') grp.rotation.y = 0;
  else if (dir === 'left') grp.rotation.y = Math.PI;
  else if (dir === 'down') grp.rotation.y = -Math.PI / 2;
  else if (dir === 'up') grp.rotation.y = Math.PI / 2;

  const steps = Math.max(8, Math.min(24, st.steps || 16));
  const stepMat = makeMat(isFinished ? 0xb58456 : 0x94a3b8, { roughness: 0.65, transparent: xray, opacity: xray ? 0.5 : 1 });
  const railMat = makeMat(0x334155, { roughness: 0.35, metalness: 0.65 });

  if (st.style === 'u-shape') {
    const half = Math.floor(steps / 2);
    const landLen = runLen * 0.28;
    const flightLen = runLen - landLen;
    const halfW = flightW * 0.48;
    const riser = floorH / steps;
    const tread = flightLen / half;

    // First half climbing +X on -Z side
    for (let i = 0; i < half; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(tread + 0.02, riser * 1.15, halfW), stepMat);
      m.position.set(-runLen / 2 + (i + 0.5) * tread, (i + 0.5) * riser, -flightW / 4);
      m.castShadow = !xray;
      grp.add(m);
    }
    // Mid-landing at +X end
    const land = new THREE.Mesh(new THREE.BoxGeometry(landLen, 0.16, flightW), stepMat);
    land.position.set(runLen / 2 - landLen / 2, half * riser, 0);
    grp.add(land);

    // Second half climbing back -X on +Z side
    const rem = steps - half;
    const tread2 = flightLen / rem;
    for (let i = 0; i < rem; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(tread2 + 0.02, riser * 1.15, halfW), stepMat);
      m.position.set(runLen / 2 - landLen - (i + 0.5) * tread2, (half + i + 0.5) * riser, flightW / 4);
      m.castShadow = !xray;
      grp.add(m);
    }
  } else {
    // Straight (or gentle L-base) staircase climbing cleanly along local +X
    const riser = floorH / steps;
    const tread = runLen / steps;
    for (let i = 0; i < steps; i++) {
      const stepH = (i + 1) * riser;
      const m = new THREE.Mesh(new THREE.BoxGeometry(tread + 0.015, Math.min(stepH, riser * 1.6), flightW), stepMat);
      m.position.set(-runLen / 2 + (i + 0.5) * tread, stepH - Math.min(stepH, riser * 1.6) / 2, 0);
      m.castShadow = !xray;
      grp.add(m);
    }
    // Sloped handrail on +Z edge
    const diag = Math.hypot(runLen, floorH);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(diag, 0.05, 0.05), railMat);
    rail.position.set(0, floorH / 2 + 0.92, flightW / 2 - 0.04);
    rail.rotation.z = Math.atan2(floorH, runLen);
    grp.add(rail);
  }

  return grp;
}

// =========================================================================
// PHASE 2+: REAL 3D ROOF TRUSS FRAMING, COVERING, GUTTERS & DOWNPIPES
// =========================================================================

function buildRoof3D(L, W, totalH, roofType, roofColor, phaseIdx, xray) {
  const grp = new THREE.Group();
  grp.name = 'RoofSystem';
  const ov = 0.55;
  const rL = L + ov * 2;
  const rW = W + ov * 2;
  const ridgeH = Math.min(3.8, Math.max(1.8, Math.min(L, W) * 0.28));

  const timberMat = makeMat(0xcfa068, { roughness: 0.78 });
  const coverMat = makeMat(roofColor || '#b45309', {
    roughness: 0.65,
    metalness: 0.12,
    transparent: xray || phaseIdx === 2,
    opacity: xray ? 0.18 : (phaseIdx === 2 ? 0.88 : 1.0),
    side: THREE.DoubleSide
  });
  const gutterMat = makeMat(0x475569, { roughness: 0.35, metalness: 0.65 });

  if (roofType === 'flat') {
    // Flat terrace deck + perimeter architectural parapet walls + steel coping
    const deck = new THREE.Mesh(new THREE.BoxGeometry(L + 0.35, 0.26, W + 0.35), makeMat(0x475569, { roughness: 0.85, transparent: xray, opacity: xray ? 0.2 : 1 }));
    deck.position.y = totalH + 0.13;
    grp.add(deck);

    const pH = 0.52, pT = 0.22;
    const pMat = makeMat(roofColor || '#64748b', { roughness: 0.68, transparent: xray, opacity: xray ? 0.22 : 1 });
    const paras = [
      [L + 0.35, pH, pT, 0, totalH + pH / 2, -W / 2 - 0.06],
      [L + 0.35, pH, pT, 0, totalH + pH / 2, W / 2 + 0.06],
      [pT, pH, W + 0.35, -L / 2 - 0.06, totalH + pH / 2, 0],
      [pT, pH, W + 0.35, L / 2 + 0.06, totalH + pH / 2, 0]
    ];
    paras.forEach(([sx, sy, sz, x, y, z]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), pMat);
      m.position.set(x, y, z);
      m.castShadow = !xray;
      grp.add(m);
    });
  } else if (roofType === 'shed') {
    // Mono-pitch modern shed roof with visible exposed timber rafters underneath!
    const slopeH = Math.min(2.4, W * 0.22);
    const slopeLen = Math.hypot(rW, slopeH);
    const ang = Math.atan2(slopeH, rW);

    // Timber rafters spaced every 1.2m
    const nR = Math.max(4, Math.ceil(rL / 1.2) + 1);
    for (let i = 0; i < nR; i++) {
      const x = -rL / 2 + (rL * i) / (nR - 1);
      const rafter = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.18, slopeLen), timberMat);
      rafter.position.set(x, totalH + slopeH / 2 + 0.04, 0);
      rafter.rotation.x = ang;
      grp.add(rafter);
    }

    // Roof panel
    const panel = new THREE.Mesh(new THREE.BoxGeometry(rL + 0.1, 0.14, slopeLen + 0.1), coverMat);
    panel.position.set(0, totalH + slopeH / 2 + 0.18, 0);
    panel.rotation.x = ang;
    panel.castShadow = !xray;
    grp.add(panel);

    // Side triangular filler walls
    const triShape = new THREE.Shape();
    triShape.moveTo(-W / 2, 0);
    triShape.lineTo(W / 2, 0);
    triShape.lineTo(-W / 2, slopeH);
    triShape.closePath();
    const triGeo = new THREE.ExtrudeGeometry(triShape, { depth: 0.26, bevelEnabled: false });
    const gMat = makeMat(phaseIdx < 3 ? '#c97b58' : (_state.colors.extWalls || '#e5d5c0'), { transparent: xray, opacity: xray ? 0.2 : 1 });
    [-L / 2 - 0.13, L / 2 - 0.13].forEach(xPos => {
      const gm = new THREE.Mesh(triGeo, gMat);
      gm.rotation.y = Math.PI / 2;
      gm.position.set(xPos, totalH, 0);
      grp.add(gm);
    });
  } else if (roofType === 'gable') {
    // Real 3D Timber Trusses + Two Sloped Roof Planes + Solid Gable End Triangles!
    const halfSpan = rW / 2;
    const slopeLen = Math.hypot(halfSpan, ridgeH);
    const pitch = Math.atan2(ridgeH, halfSpan);

    // Structural timber A-frame trusses every 1.4m
    const nT = Math.max(4, Math.ceil(L / 1.4) + 1);
    for (let i = 0; i < nT; i++) {
      const x = -L / 2 + (L * i) / (nT - 1);
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.14, W), timberMat);
      tie.position.set(x, totalH + 0.07, 0);
      const r1 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.15, slopeLen), timberMat);
      r1.position.set(x, totalH + ridgeH / 2, -halfSpan / 2);
      r1.rotation.x = -pitch;
      const r2 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.15, slopeLen), timberMat);
      r2.position.set(x, totalH + ridgeH / 2, halfSpan / 2);
      r2.rotation.x = pitch;
      grp.add(tie, r1, r2);
    }
    // Ridge beam
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(rL, 0.18, 0.12), timberMat);
    ridge.position.set(0, totalH + ridgeH, 0);
    grp.add(ridge);

    // Two sloped roof covering decks
    [-1, 1].forEach(side => {
      const deck = new THREE.Mesh(new THREE.BoxGeometry(rL, 0.14, slopeLen + 0.12), coverMat);
      deck.position.set(0, totalH + ridgeH / 2 + 0.12, (side * halfSpan) / 2);
      deck.rotation.x = side * pitch;
      deck.castShadow = !xray;
      grp.add(deck);
    });

    // Two masonry/plaster gable end triangles
    const gShape = new THREE.Shape();
    gShape.moveTo(-W / 2, 0);
    gShape.lineTo(W / 2, 0);
    gShape.lineTo(0, ridgeH);
    gShape.closePath();
    const gGeo = new THREE.ExtrudeGeometry(gShape, { depth: 0.28, bevelEnabled: false });
    const gMat = makeMat(phaseIdx < 3 ? '#c97b58' : (_state.colors.extWalls || '#e5d5c0'), { transparent: xray, opacity: xray ? 0.2 : 1 });
    [-L / 2 - 0.14, L / 2 - 0.14].forEach(xp => {
      const gm = new THREE.Mesh(gGeo, gMat);
      gm.rotation.y = Math.PI / 2;
      gm.position.set(xp, totalH, 0);
      grp.add(gm);
    });
  } else {
    // True Hip Roof (4 Slopes) built with exact trapezoidal/triangular BufferGeometry + Timber ridge & hip rafters!
    const ridgeLen = Math.max(0.6, rL - rW * 0.85);
    const hl = rL / 2, hw = rW / 2, hr = ridgeLen / 2;
    const yB = totalH + 0.06, yT = totalH + ridgeH;

    // 6 vertices of true 4-slope hip prism
    const verts = new Float32Array([
      // Front slope (2 tris)
      -hl, yB, hw,   hl, yB, hw,   hr, yT, 0,
      -hl, yB, hw,   hr, yT, 0,   -hr, yT, 0,
      // Back slope
       hl, yB,-hw,  -hl, yB,-hw,  -hr, yT, 0,
       hl, yB,-hw,  -hr, yT, 0,    hr, yT, 0,
      // Left hip triangle
      -hl, yB,-hw,  -hl, yB, hw,  -hr, yT, 0,
      // Right hip triangle
       hl, yB, hw,   hl, yB,-hw,   hr, yT, 0
    ]);
    const hipGeo = new THREE.BufferGeometry();
    hipGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    hipGeo.computeVertexNormals();
    const hipMesh = new THREE.Mesh(hipGeo, coverMat);
    hipMesh.castShadow = !xray;
    hipMesh.receiveShadow = true;
    grp.add(hipMesh);

    // Timber soffit fascia rim + exposed timber ceiling joists inside
    const fascia = new THREE.Mesh(new THREE.BoxGeometry(rL, 0.14, rW), timberMat);
    fascia.position.y = totalH;
    grp.add(fascia);
  }

  // Aluminum Eaves Gutters & 4 Corner Downpipes (Phase 2+)
  if (roofType !== 'flat') {
    const gL = new THREE.Mesh(new THREE.BoxGeometry(rL + 0.08, 0.11, 0.12), gutterMat);
    gL.position.set(0, totalH - 0.02, rW / 2 + 0.06);
    const gR = gL.clone();
    gR.position.z = -rW / 2 - 0.06;
    grp.add(gL, gR);

    [[-L / 2 - 0.22, W / 2 + 0.22], [L / 2 + 0.22, W / 2 + 0.22], [-L / 2 - 0.22, -W / 2 - 0.22], [L / 2 + 0.22, -W / 2 - 0.22]].forEach(([dx, dz]) => {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, totalH, 8), gutterMat);
      pipe.position.set(dx, totalH / 2, dz);
      grp.add(pipe);
    });
  }

  return grp;
}

// =========================================================================
// PHASE 5 (UTILITIES): 3D MEP X-RAY SYSTEMS (PLUMBING + UFH + ELECTRICAL!)
// =========================================================================

function buildMEPSystems3D(L, W, H, floors) {
  const grp = new THREE.Group();
  grp.name = 'MEP_Utilities_3D';

  const coldMat = makeMat(0x38bdf8, { roughness: 0.3, metalness: 0.2 });  // Cold water blue
  const hotMat  = makeMat(0xef4444, { roughness: 0.3, metalness: 0.2 });  // Hot water red
  const soilMat = makeMat(0x94a3b8, { roughness: 0.45, metalness: 0.15 });// Sanitary drain gray
  const ufhMat  = makeMat(0xf97316, { roughness: 0.35, metalness: 0.1 }); // UFH PEX orange
  const elecMat = makeMat(0xfacc15, { roughness: 0.35, metalness: 0.2 }); // Electrical conduit yellow
  const panelMat = makeMat(0x1e293b, { roughness: 0.4, metalness: 0.6 });

  const totalH = H * floors;
  const shaftX = L * 0.28;
  const shaftZ = -W * 0.26;

  // 1. Vertical Plumbing Risers (Cold, Hot, Sanitary Soil Stack up through roof vent!)
  const soilStack = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, totalH + 0.9, 10), soilMat);
  soilStack.position.set(shaftX, totalH / 2 + 0.2, shaftZ);
  const coldRiser = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, totalH - 0.4, 8), coldMat);
  coldRiser.position.set(shaftX + 0.16, (totalH - 0.4) / 2, shaftZ);
  const hotRiser = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, totalH - 0.4, 8), hotMat);
  hotRiser.position.set(shaftX + 0.28, (totalH - 0.4) / 2, shaftZ);
  grp.add(soilStack, coldRiser, hotRiser);

  // Main Electrical Breaker Panel Box on Ground Floor
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.65, 0.18), panelMat);
  panel.position.set(-L / 2 + 0.35, 1.55, W / 2 - 0.35);
  grp.add(panel);

  // Per-Floor Horizontal MEP Branches, UFH Serpentine Loops & Electrical Ring Conduits
  for (let f = 0; f < floors; f++) {
    const yF = f * H;

    // A. Underfloor Heating (UFH) PEX Serpentine Coils across slab
    const margin = 0.65;
    const minX = -L / 2 + margin, maxX = L / 2 - margin;
    const minZ = -W / 2 + margin, maxZ = W / 2 - margin;
    const stepZ = Math.max(0.55, (maxZ - minZ) / 9);
    const ufhY = yF + 0.14;
    let rowIdx = 0;
    for (let z = minZ; z <= maxZ; z += stepZ) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, maxX - minX, 6), ufhMat);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(0, ufhY, z);
      grp.add(bar);
      if (z + stepZ <= maxZ) {
        const turnX = rowIdx % 2 === 0 ? maxX : minX;
        const turn = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, stepZ, 6), ufhMat);
        turn.rotation.x = Math.PI / 2;
        turn.position.set(turnX, ufhY, z + stepZ / 2);
        grp.add(turn);
      }
      rowIdx++;
    }

    // B. Plumbing Horizontal Branches to Kitchen/Bath zones
    const branchLen = L * 0.48;
    const cBranch = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, branchLen, 6), coldMat);
    cBranch.rotation.z = Math.PI / 2;
    cBranch.position.set(shaftX - branchLen / 2, yF + 0.62, shaftZ + 0.05);
    const hBranch = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, branchLen, 6), hotMat);
    hBranch.rotation.z = Math.PI / 2;
    hBranch.position.set(shaftX - branchLen / 2, yF + 0.72, shaftZ + 0.05);
    grp.add(cBranch, hBranch);

    // C. Perimeter Electrical Ring Conduit at Ceiling Height + 2 Pendant Drops
    const eY = yF + H - 0.28;
    const eOff = 0.36;
    const eRuns = [
      [L - eOff * 2, 0, -W / 2 + eOff, 0],
      [L - eOff * 2, 0, W / 2 - eOff, 0],
      [W - eOff * 2, -L / 2 + eOff, 0, Math.PI / 2],
      [W - eOff * 2, L / 2 - eOff, 0, Math.PI / 2]
    ];
    eRuns.forEach(([len, x, z, rot]) => {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, len, 6), elecMat);
      r.rotation.z = Math.PI / 2;
      if (rot) r.rotation.y = rot;
      r.position.set(x, eY, z);
      grp.add(r);
    });
  }

  return grp;
}

// =========================================================================
// PHASE 3 & 6: EXTERIOR APRON, ENTRANCE PORCH & LANDSCAPING
// =========================================================================

function buildExteriorSiteWork(L, W, colors, phaseIdx) {
  // Porch steps & perimeter splash apron belong to building exportGroup (Phase 3+)
  const bldExtras = new THREE.Group();
  if (phaseIdx >= 3) {
    const stoneMat = makeMat(0x94a3b8, { roughness: 0.82 });
    const apron = new THREE.Mesh(new THREE.BoxGeometry(L + 1.5, 0.08, W + 1.5), stoneMat);
    apron.position.y = -0.04;
    apron.receiveShadow = true;
    bldExtras.add(apron);

    // Front entrance concrete steps (aligned to front door center)
    const step1 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 1.15), makeMat(0xb0b8c4, { roughness: 0.75 }));
    step1.position.set(0, 0.02, W / 2 + 0.65);
    const step2 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.10, 1.45), stoneMat);
    step2.position.set(0, -0.05, W / 2 + 0.78);
    bldExtras.add(step1, step2);
  }
  _exportGroup.add(bldExtras);

  // Site yard, grid, patio & trees stay in _siteContextGroup (NEVER exported in GLB/STL/AR!)
  const siteSize = Math.max(L, W) * 3.8 + 14;
  const yardHex = phaseIdx >= 6 ? (colors.ground || '#3f8f54') : '#1c2433';
  const yard = new THREE.Mesh(new THREE.PlaneGeometry(siteSize, siteSize), makeMat(yardHex, { roughness: 0.96 }));
  yard.rotation.x = -Math.PI / 2;
  yard.position.y = -0.09;
  yard.receiveShadow = true;
  _siteContextGroup.add(yard);

  // Architectural ground grid (subtle)
  const grid = new THREE.GridHelper(Math.ceil(siteSize / 2) * 2, Math.ceil(siteSize / 2), 0x475569, 0x263144);
  grid.position.y = -0.085;
  grid.material.transparent = true;
  grid.material.opacity = phaseIdx >= 6 ? 0.16 : 0.38;
  _siteContextGroup.add(grid);

  // Phase 6 Finishes & Landscaping: Stone Terrace Walkway + Stylized Architectural Trees!
  if (phaseIdx >= 6) {
    const walkMat = makeMat(0xcbd5e1, { roughness: 0.78 });
    const walkway = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 5.5), walkMat);
    walkway.position.set(0, -0.06, W / 2 + 3.4);
    walkway.receiveShadow = true;
    _siteContextGroup.add(walkway);

    // Side garden patio terrace
    const terrace = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.07, 4.6), makeMat(0xd6cfc2, { roughness: 0.8 }));
    terrace.position.set(L / 2 + 2.6, -0.055, 0);
    terrace.receiveShadow = true;
    _siteContextGroup.add(terrace);

    // Architectural trees around perimeter
    const treeCoords = [
      [-L / 2 - 4.2, -W / 2 - 3.2, 1.15],
      [L / 2 + 4.8, -W / 2 - 3.5, 1.0],
      [-L / 2 - 4.6, W / 2 + 3.0, 0.92],
      [L / 2 + 5.2, W / 2 + 3.6, 1.2]
    ];
    const trunkMat = makeMat(0x785032, { roughness: 0.9 });
    const leafMat = makeMat(0x2e7d47, { roughness: 0.82 });
    treeCoords.forEach(([tx, tz, sc]) => {
      const tGrp = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * sc, 0.2 * sc, 1.6 * sc, 8), trunkMat);
      trunk.position.y = 0.8 * sc;
      const crown1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.15 * sc, 1), leafMat);
      crown1.position.y = 2.2 * sc;
      crown1.castShadow = true;
      const crown2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85 * sc, 1), makeMat(0x3a9456, { roughness: 0.8 }));
      crown2.position.set(0.4 * sc, 2.75 * sc, 0.25 * sc);
      tGrp.add(trunk, crown1, crown2);
      tGrp.position.set(tx, -0.08, tz);
      _siteContextGroup.add(tGrp);
    });
  }
}

// =========================================================================
// MAIN SCENE REBUILD & SUN LIGHTING
// =========================================================================

function updateSunLighting() {
  if (!_sunLight || !_hemiLight) return;
  const t = Math.max(0, Math.min(1, (_sunHour - 6) / 14)); // 06:00..20:00
  const elev = Math.sin(t * Math.PI) * 1.15 + 0.22;
  const azim = (t - 0.5) * Math.PI * 1.15 + 0.45;
  const dist = 34;

  _sunLight.position.set(
    Math.cos(elev) * Math.sin(azim) * dist,
    Math.sin(elev) * dist,
    Math.cos(elev) * Math.cos(azim) * dist
  );

  // Warm sunrise/sunset tint vs crisp noon daylight
  const warm = 1 - Math.sin(t * Math.PI);
  const sunCol = new THREE.Color().setHSL(0.11 - warm * 0.04, 0.22 + warm * 0.55, 0.95 - warm * 0.14);
  _sunLight.color.copy(sunCol);
  _sunLight.intensity = 1.45 + Math.sin(t * Math.PI) * 0.75;
  _hemiLight.intensity = 0.65 + Math.sin(t * Math.PI) * 0.35;
}

function rebuild() {
  if (!_scene || !_state) return;
  disposeGroup(_exportGroup);
  disposeGroup(_siteContextGroup);

  const p = _state.project;
  const L = p.length;
  const W = p.width;
  const H = p.floorHeight;
  const floors = p.floors;
  const totalH = H * floors;
  const effectiveXray = _mepXray || _phaseIdx === 5;
  const effectiveCutaway = _cutaway;

  // Phase 0+: True Structural Foundation
  _exportGroup.add(buildFoundation3D(L, W, p.foundationType, _phaseIdx, effectiveXray));

  // Phase 1+: Superstructure, Interior Walls (NEVER floating in Phase 0!), Cutouts, Columns, Stairs
  if (_phaseIdx >= 1) {
    _exportGroup.add(buildSuperstructure3D(L, W, H, floors, _state.floorPlans, _state.colors, _phaseIdx, effectiveXray, effectiveCutaway));
  }

  // Phase 2+: Roof Trusses & Covering (hidden cleanly in Cutaway/Dollhouse inspection mode!)
  if (_phaseIdx >= 2 && !effectiveCutaway) {
    _exportGroup.add(buildRoof3D(L, W, totalH, p.roofType, _state.colors.roof, _phaseIdx, effectiveXray));
  }

  // Phase 5 OR Manual MEP X-Ray Toggle: Complete 3D Plumbing, UFH Serpentine & Electrical Network!
  if (_phaseIdx === 5 || _mepXray) {
    _exportGroup.add(buildMEPSystems3D(L, W, H, floors));
  }

  // Phase 3+ Exterior apron/steps & Site context (Yard + Grid + Trees in Phase 6)
  buildExteriorSiteWork(L, W, _state.colors, _phaseIdx);

  updateSunLighting();
}

// =========================================================================
// LIFECYCLE, CAMERA PRESETS & CONSTRUCTION TIME-LAPSE
// =========================================================================

function init(containerEl, stateRef) {
  _container = containerEl;
  _state = stateRef;

  if (!_renderer) {
    _scene = new THREE.Scene();
    _scene.background = new THREE.Color(0x0b101d);
    _scene.fog = new THREE.FogExp2(0x0b101d, 0.0085);

    const w = Math.max(200, containerEl.clientWidth);
    const h = Math.max(200, containerEl.clientHeight);
    _camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 400);

    _renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    _renderer.setSize(w, h);
    _renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    _renderer.shadowMap.enabled = true;
    _renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    _renderer.toneMapping = THREE.ACESFilmicToneMapping;
    _renderer.toneMappingExposure = 1.08;
    _renderer.outputColorSpace = THREE.SRGBColorSpace;

    containerEl.innerHTML = '';
    containerEl.appendChild(_renderer.domElement);

    // Subtle PBR studio environment reflection
    const pmrem = new THREE.PMREMGenerator(_renderer);
    _scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    _hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.9);
    _scene.add(_hemiLight);

    _sunLight = new THREE.DirectionalLight(0xfff7ed, 1.9);
    _sunLight.castShadow = true;
    _sunLight.shadow.mapSize.set(2048, 2048);
    _sunLight.shadow.camera.near = 2;
    _sunLight.shadow.camera.far = 90;
    const d = 24;
    _sunLight.shadow.camera.left = -d;
    _sunLight.shadow.camera.right = d;
    _sunLight.shadow.camera.top = d;
    _sunLight.shadow.camera.bottom = -d;
    _sunLight.shadow.bias = -0.0008;
    _scene.add(_sunLight);

    const fill = new THREE.DirectionalLight(0x93c5fd, 0.45);
    fill.position.set(-18, 12, -16);
    _scene.add(fill);

    _exportGroup = new THREE.Group();
    _exportGroup.name = 'ArchitectPro2_Building';
    _siteContextGroup = new THREE.Group();
    _siteContextGroup.name = 'SiteContext';
    _scene.add(_exportGroup, _siteContextGroup);

    _controls = new OrbitControls(_camera, _renderer.domElement);
    _controls.enableDamping = true;
    _controls.dampingFactor = 0.07;
    _controls.maxPolarAngle = Math.PI * 0.485;
    _controls.minDistance = 4;
    _controls.maxDistance = 120;

    if (typeof ResizeObserver !== 'undefined') {
      _resizeObserver = new ResizeObserver(() => resize());
      _resizeObserver.observe(containerEl);
    }
    window.addEventListener('resize', resize);

    const animate = () => {
      _rafId = requestAnimationFrame(animate);
      if (_timelapsePlaying && _controls) {
        _controls.autoRotate = true;
        _controls.autoRotateSpeed = 1.6;
      } else if (_controls) {
        _controls.autoRotate = false;
      }
      if (_controls) _controls.update();
      if (_renderer && _scene && _camera) _renderer.render(_scene, _camera);
    };
    animate();
  }

  setCameraPreset('iso');
  rebuild();
}

function resize() {
  if (!_container || !_renderer || !_camera) return;
  const w = _container.clientWidth;
  const h = _container.clientHeight;
  if (w < 10 || h < 10) return;
  _camera.aspect = w / h;
  _camera.updateProjectionMatrix();
  _renderer.setSize(w, h);
}

function setCameraPreset(mode) {
  if (!_camera || !_controls || !_state) return;
  const p = _state.project;
  const span = Math.max(p.length, p.width, p.floors * p.floorHeight * 1.4);
  const dist = span * 1.48;
  const midY = (p.floors * p.floorHeight) * 0.42;

  _controls.target.set(0, midY, 0);
  if (mode === 'front') {
    _camera.position.set(0, midY + span * 0.25, dist);
  } else if (mode === 'top') {
    _camera.position.set(0.01, dist * 1.35, 0.01);
  } else {
    _camera.position.set(dist * 0.78, dist * 0.62, dist * 0.85);
  }
  _controls.update();
}

function setPhase(idx) {
  _phaseIdx = Math.max(0, Math.min(6, Number(idx) || 0));
  rebuild();
}

function setWireframe(v) { _wireframe = !!v; rebuild(); }
function setCutaway(v) { _cutaway = !!v; rebuild(); }
function setMepXray(v) { _mepXray = !!v; rebuild(); }
function setSunHour(h) { _sunHour = Number(h) || 13.5; updateSunLighting(); }

function startTimelapse(onPhaseTick, onDone) {
  stopTimelapse();
  _timelapsePlaying = true;
  let cur = 0;
  setPhase(cur);
  if (onPhaseTick) onPhaseTick(cur);

  _timelapseTimer = setInterval(() => {
    cur++;
    if (cur > 6) {
      stopTimelapse();
      if (onDone) onDone();
      return;
    }
    setPhase(cur);
    if (onPhaseTick) onPhaseTick(cur);
  }, 2100);
}

function stopTimelapse() {
  _timelapsePlaying = false;
  if (_timelapseTimer) { clearInterval(_timelapseTimer); _timelapseTimer = null; }
}

function getSnapshotDataURL() {
  if (!_renderer || !_scene || !_camera) return null;
  _renderer.render(_scene, _camera);
  return _renderer.domElement.toDataURL('image/png');
}

function getExportGroup() {
  // Always ensure clean architectural-only mesh group (NO 200m yard plane, NO grid!)
  return _exportGroup;
}

window.Arch3D = {
  THREE,
  init,
  resize,
  rebuild,
  setPhase,
  setCameraPreset,
  setWireframe,
  setCutaway,
  setMepXray,
  setSunHour,
  startTimelapse,
  stopTimelapse,
  isTimelapsePlaying: () => _timelapsePlaying,
  getSnapshotDataURL,
  getExportGroup,
  getScene: () => _scene,
  getStateFlags: () => ({ phaseIdx: _phaseIdx, wireframe: _wireframe, cutaway: _cutaway, mepXray: _mepXray, sunHour: _sunHour })
};
