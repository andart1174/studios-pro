/**
 * Mech Gen Pro — Bearings, Joints, Couplers, Springs & Motion Hardware Engine (10 ISO/DIN Modules)
 * Modules: bearing, linbear, pillow, coupler, cardan, balljoint, hinge, chain, spring, handwheel.
 * Runs in Browser (window.MechMotion) & Node.js test harness.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./mech-core.js'));
  } else {
    root.MechMotion = factory(root.MechCore);
  }
}(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';

  const { PI, TAU, DEG, clamp, lerp, round2 } = C;

  /* =========================================================================
     19. ISO 15 DEEP-GROOVE BALL BEARING (REAL CONCAVE RACEWAYS + BALL CAGE!)
  ========================================================================= */
  const BEARING_STD = {
    '608':  { id: 8,  od: 22, w: 7,  balls: 7,  label: 'ISO 608 (Skate/CNC)' },
    '6000': { id: 10, od: 26, w: 8,  balls: 8,  label: 'ISO 6000' },
    '6200': { id: 10, od: 30, w: 9,  balls: 8,  label: 'ISO 6200' },
    '6202': { id: 15, od: 35, w: 11, balls: 9,  label: 'ISO 6202' },
    '6805': { id: 25, od: 37, w: 7,  balls: 14, label: 'ISO 6805 Thin' }
  };

  function buildBearing(p, fitTol) {
    const std = BEARING_STD[p.preset] || BEARING_STD['608'];
    const id = clamp(p.id || std.id, 4, 80);
    const od = clamp(p.od || std.od, id + 8, 140);
    const W = clamp(p.width || std.w, 4, 40);
    const tol = Math.max(0.05, (p.clearance != null ? p.clearance : 0.15) + fitTol);
    const showCage = p.showCage !== false;

    const rID = id * 0.5;
    const rOD = od * 0.5;
    const rPitch = (rID + rOD) * 0.5;
    const radialSection = rOD - rID;
    // Standard ISO ball proportion ~ 0.58 * radialSection capped at 0.78 * W
    const ballD = clamp(Math.min(radialSection * 0.56, W * 0.74), 2.2, 24);
    const rBall = ballD * 0.5;
    const maxBalls = Math.max(5, Math.floor((PI * rPitch * 2) / (ballD * 1.32)));
    const numBalls = clamp(Math.round(p.balls || Math.min(std.balls, maxBalls)), 5, maxBalls);

    // Concave Gothic-Arch / Toroidal Raceway Geometry:
    // Raceway groove radius Rg = 1.04 * rBall + tol/2, groove penetrates ~22% of rBall into each race shoulder!
    const rGroove = rBall + tol * 0.5;
    const shoulderGap = rBall * 0.58; // Radial clearance between inner shoulder and ball pitch -> balls are CAPTIVE!
    const rInnerShoulder = Math.max(rID + 1.0, rPitch - shoulderGap);
    const rOuterShoulder = Math.min(rOD - 1.0, rPitch + shoulderGap);
    const yMid = W * 0.5;
    const ch = Math.min(0.45, W * 0.08); // Internal 45° edge chamfer (zero bloat!)

    // Inner Ring Closed Lathe Profile (EXACT ID = id, EXACT Width = W!)
    const innerProf = [
      [rID + ch, 0], [rInnerShoulder - ch, 0], [rInnerShoulder, ch]
    ];
    // Concave outer groove arc on inner ring: circle centered at (rPitch, yMid) of radius rGroove
    const dxIn = clamp(rPitch - rInnerShoulder, 0.05, rGroove * 0.96);
    const halfAngIn = Math.acos(clamp(dxIn / rGroove, 0.05, 0.98));
    const gSegs = 12;
    for (let i = 0; i <= gSegs; i++) {
      const a = lerp(PI + halfAngIn, PI - halfAngIn, i / gSegs);
      const r = Math.max(rID + 0.8, rPitch + Math.cos(a) * rGroove);
      const y = clamp(yMid + Math.sin(a) * rGroove, ch, W - ch);
      innerProf.push([r, y]);
    }
    innerProf.push([rInnerShoulder, W - ch], [rInnerShoulder - ch, W], [rID + ch, W], [rID, W - ch], [rID, ch]);
    const innerRing = C.buildClosedLatheY(innerProf, 56, {
      name: 'bearing_inner_race', role: 'inner', color: '#cbd5e1',
      pivot: [0, yMid, 0], explodeVec: [0, -W * 1.1, 0]
    });

    // Outer Ring Closed Lathe Profile (EXACT OD = od, EXACT Width = W!)
    const outerProf = [
      [rOuterShoulder + ch, 0], [rOD - ch, 0], [rOD, ch],
      [rOD, W - ch], [rOD - ch, W], [rOuterShoulder + ch, W], [rOuterShoulder, W - ch]
    ];
    const dxOut = clamp(rOuterShoulder - rPitch, 0.05, rGroove * 0.96);
    const halfAngOut = Math.acos(clamp(dxOut / rGroove, 0.05, 0.98));
    for (let i = 0; i <= gSegs; i++) {
      const a = lerp(halfAngOut, -halfAngOut, i / gSegs);
      const r = Math.min(rOD - 0.8, rPitch + Math.cos(a) * rGroove);
      const y = clamp(yMid + Math.sin(a) * rGroove, ch, W - ch);
      outerProf.push([r, y]);
    }
    outerProf.push([rOuterShoulder, ch]);
    const outerRing = C.buildClosedLatheY(outerProf, 56, {
      name: 'bearing_outer_race', role: 'outer', color: '#94a3b8',
      pivot: [0, yMid, 0], explodeVec: [0, 0, 0]
    });

    // Balls merged into orbiting ball-set mesh
    const ballList = [];
    for (let i = 0; i < numBalls; i++) {
      const a = (i / numBalls) * TAU;
      ballList.push(C.buildSphere(Math.cos(a) * rPitch, yMid, Math.sin(a) * rPitch, rBall, 18, 12, { color: '#e2e8f0' }));
    }
    const ballsPart = C.mergeParts(ballList, {
      name: 'bearing_balls', role: 'balls', color: '#e2e8f0', metalness: 0.95, roughness: 0.12,
      pivot: [0, yMid, 0], explodeVec: [0, W * 0.9, 0]
    });

    const parts = [outerRing, innerRing, ballsPart];
    let cageIdx = -1;

    // Optional Ball Retainer Cage (Continuous annular ring with spacing fingers seated below ball equator!)
    if (showCage) {
      const cageT = clamp(radialSection * 0.16, 0.7, 2.2);
      const cageH = clamp(W * 0.22, 1.0, 2.8);
      const cageY0 = Math.max(0.4, yMid - rBall - cageH * 0.55);
      const cageSubs = [
        C.buildTubeY(0, cageY0, cageY0 + cageH, 0, rPitch + cageT * 0.5, rPitch - cageT * 0.5, 48, { color: '#d4a238' })
      ];
      // Separator posts between adjacent balls
      for (let i = 0; i < numBalls; i++) {
        const a = ((i + 0.5) / numBalls) * TAU;
        const px = Math.cos(a) * rPitch, pz = Math.sin(a) * rPitch;
        cageSubs.push(C.buildPrismY(px, cageY0, yMid + rBall * 0.45, pz, cageT * 0.65, 10, 0, { color: '#d4a238' }));
      }
      cageIdx = parts.length;
      parts.push(C.mergeParts(cageSubs, {
        name: 'bearing_cage', role: 'cage', color: '#d4a238',
        pivot: [0, yMid, 0], explodeVec: [0, W * 1.9, 0]
      }));
    }

    return {
      parts,
      draw2D: {
        loops: [
          { layer: 'OUTER', pts: C.circle2D(0, 0, rOD, 64) },
          { layer: 'HOLES', pts: C.circle2D(0, 0, rID, 48) }
        ],
        circles: [{ layer: 'PITCH_CIRCLE', cx: 0, cy: 0, r: rPitch }]
      },
      specs: {
        standard: `ISO 15 Deep-Groove Ball Bearing (${p.preset || 'Custom'})`,
        metrics: [
          { k: 'ID × OD × W',  v: `${round2(id)} × ${round2(od)} × ${round2(W)} mm` },
          { k: 'Ball Ø × Qty', v: `Ø${round2(ballD)} mm × ${numBalls}` },
          { k: 'Raceway Type', v: 'Concave Captive' },
          { k: 'Radial Clear', v: `${round2(tol)} mm` }
        ],
        warnings: []
      },
      kinematics: {
        type: 'bearing',
        innerIdx: 1,
        ballsIdx: 2,
        cageIdx
      }
    };
  }

  /* =========================================================================
     20. ISO LINEAR BEARING / IGUS BUSHING (LM6UU / LM8UU / LM10UU / LM12UU)
         Single unified watertight mesh: 2 EXTERNAL CIRCLIP GROOVES + INTERNAL LOW-FRICTION WIPER FLUTES!
  ========================================================================= */
  const LMUU_STD = {
    LM6UU:  { id: 6,  od: 12, L: 19, B: 13.5, gW: 1.1, gD: 0.5, flutes: 5 },
    LM8UU:  { id: 8,  od: 15, L: 24, B: 17.5, gW: 1.1, gD: 0.7, flutes: 6 },
    LM10UU: { id: 10, od: 19, L: 29, B: 22.0, gW: 1.3, gD: 0.8, flutes: 6 },
    LM12UU: { id: 12, od: 21, L: 30, B: 23.0, gW: 1.3, gD: 0.9, flutes: 7 }
  };

  function buildLinBear(p, fitTol) {
    const std = LMUU_STD[p.preset] || LMUU_STD.LM8UU;
    const id = clamp(p.id || std.id, 4, 30);
    const od = clamp(p.od || std.od, id + 4, 50);
    const L = clamp(p.length || std.L, 12, 80);
    const flutes = clamp(Math.round(p.flutes || std.flutes), 4, 10);
    const B = Math.min(L - 3.5, std.B * (L / std.L));
    const gW = std.gW, gD = std.gD;

    const rInBase = (id + fitTol) * 0.5;
    const rOutBase = od * 0.5;
    const grooveDepthIn = Math.min(0.65, (rOutBase - rInBase) * 0.25);
    const yG1 = (L - B) * 0.5;
    const yG2 = L - yG1;
    const ch = 0.5;

    // Axial stations capturing exact entry chamfers & BOTH external circlip grooves!
    const yStations = [
      { y: 0,           rO: rOutBase - ch, rI: rInBase + ch },
      { y: ch,          rO: rOutBase,      rI: rInBase },
      { y: yG1 - 0.05,  rO: rOutBase,      rI: rInBase },
      { y: yG1,         rO: rOutBase - gD, rI: rInBase },
      { y: yG1 + gW,    rO: rOutBase - gD, rI: rInBase },
      { y: yG1 + gW+0.05,rO: rOutBase,     rI: rInBase },
      { y: yG2 - gW-0.05,rO: rOutBase,     rI: rInBase },
      { y: yG2 - gW,    rO: rOutBase - gD, rI: rInBase },
      { y: yG2,         rO: rOutBase - gD, rI: rInBase },
      { y: yG2 + 0.05,  rO: rOutBase,      rI: rInBase },
      { y: L - ch,      rO: rOutBase,      rI: rInBase },
      { y: L,           rO: rOutBase - ch, rI: rInBase + ch }
    ];

    const N = flutes * 12; // Exact angular alignment with internal relief flutes!
    const R = yStations.length;
    const halfV = R * N;
    const positions = new Float32Array(halfV * 2 * 3);

    for (let r = 0; r < R; r++) {
      const st = yStations[r];
      const isEnd = (r === 0 || r === R - 1);
      for (let i = 0; i < N; i++) {
        const theta = (i / N) * TAU;
        const c = Math.cos(theta), s = Math.sin(theta);
        // Outer wall with exact circlip grooves
        const oi = (r * N + i) * 3;
        positions[oi] = c * st.rO; positions[oi + 1] = st.y; positions[oi + 2] = s * st.rO;
        // Inner low-friction fluted wiper bore (continuous smooth relief channels!)
        const fluteWave = Math.sin(theta * flutes);
        const relief = (!isEnd && fluteWave > 0.35) ? grooveDepthIn * ((fluteWave - 0.35) / 0.65) : 0;
        const radIn = st.rI + relief;
        const ii = (halfV + r * N + i) * 3;
        positions[ii] = c * radIn; positions[ii + 1] = st.y; positions[ii + 2] = s * radIn;
      }
    }

    const quadCount = (R - 1) * N * 2 + N * 2;
    const indices = new Uint32Array(quadCount * 6);
    let ptr = 0;
    for (let r = 0; r < R - 1; r++) {
      const r0 = r * N, r1 = (r + 1) * N;
      for (let i = 0; i < N; i++) {
        const iN = (i + 1) % N;
        indices[ptr++] = r0 + i; indices[ptr++] = r1 + i; indices[ptr++] = r1 + iN;
        indices[ptr++] = r0 + i; indices[ptr++] = r1 + iN; indices[ptr++] = r0 + iN;
      }
    }
    for (let r = 0; r < R - 1; r++) {
      const r0 = halfV + r * N, r1 = halfV + (r + 1) * N;
      for (let i = 0; i < N; i++) {
        const iN = (i + 1) % N;
        indices[ptr++] = r0 + i; indices[ptr++] = r1 + iN; indices[ptr++] = r1 + i;
        indices[ptr++] = r0 + i; indices[ptr++] = r0 + iN; indices[ptr++] = r1 + iN;
      }
    }
    const oTop = (R - 1) * N, iTop = halfV + (R - 1) * N;
    for (let i = 0; i < N; i++) {
      const iN = (i + 1) % N;
      indices[ptr++] = i; indices[ptr++] = iN; indices[ptr++] = halfV + iN;
      indices[ptr++] = i; indices[ptr++] = halfV + iN; indices[ptr++] = halfV + i;
      indices[ptr++] = oTop + i; indices[ptr++] = iTop + iN; indices[ptr++] = oTop + iN;
      indices[ptr++] = oTop + i; indices[ptr++] = iTop + i; indices[ptr++] = iTop + iN;
    }

    const part = C.makePart(positions, indices, { name: `linbear_${p.preset || 'LM8UU'}`, role: 'primary' });
    // Build clean inner loop for 2D export
    const inner2D = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU;
      const fw = Math.sin(a * flutes);
      const rad = rInBase + (fw > 0.35 ? grooveDepthIn * ((fw - 0.35) / 0.65) : 0);
      inner2D.push([Math.cos(a) * rad, Math.sin(a) * rad]);
    }

    return {
      parts: [part],
      draw2D: {
        loops: [{ layer: 'OUTER', pts: C.circle2D(0, 0, rOutBase, 56) }, { layer: 'HOLES', pts: inner2D }],
        circles: [{ layer: 'PITCH_CIRCLE', cx: 0, cy: 0, r: rInBase }]
      },
      specs: {
        standard: `ISO ${p.preset || 'LM8UU'} Linear Bushing (Circlip Grooves + Wiper Flutes)`,
        metrics: [
          { k: 'ID × OD × L',    v: `${round2(id)} × ${round2(od)} × ${round2(L)} mm` },
          { k: 'Circlip Span B', v: `${round2(B)} mm` },
          { k: 'Wiper Flutes',   v: `${flutes} Low-Friction Pads` }
        ],
        warnings: []
      },
      kinematics: { type: 'spin', parts: [{ idx: 0, axis: 'y', rate: 1 }] }
    };
  }

  /* =========================================================================
     21. PILLOW BLOCK BEARING HOUSING (KP08 / KP000 / UCP204 — VERTICAL SLOTTED FEET!)
  ========================================================================= */
  function buildPillow(p, fitTol) {
    const brgOD = clamp(p.bearingOD || 22, 12, 60);
    const shaftD = clamp(p.shaftDiam || 8, 4, brgOD - 6);
    const centerH = clamp(p.centerHeight || Math.max(18, brgOD * 0.85), brgOD * 0.6 + 4, 65);
    const baseLen = clamp(p.baseLength || Math.max(55, brgOD * 2.5), brgOD + 24, 150);
    const depth = clamp(p.depth || 14, 7, 40);
    const mountD = clamp(p.mountHole || 5.2, 3, 12);
    const includeBearing = p.includeBearing !== false;

    const baseH = clamp(depth * 0.42, 4.5, 14);
    const rSeat = (brgOD + fitTol) * 0.5;
    const rHead = rSeat + Math.max(5.5, brgOD * 0.28);

    // 1. Horizontal Base Plate (XZ plane, y ∈ [0, baseH]) with 2 REAL VERTICAL SLOTTED MOUNTING HOLES!
    const baseOuter = C.roundedRect2D(0, 0, baseLen, depth, 2.5, 5);
    const holeSpanX = (rHead + baseLen * 0.5) * 0.5;
    const slotHalf = Math.min(3.5, (baseLen * 0.5 - rHead - mountD) * 0.25);
    const hD = mountD + fitTol;
    const baseHoles = [
      C.slot2D(-holeSpanX - slotHalf, 0, -holeSpanX + slotHalf, 0, hD, 10),
      C.slot2D(+holeSpanX - slotHalf, 0, +holeSpanX + slotHalf, 0, hD, 10)
    ];
    const basePart = C.extrudePolygon2D(baseOuter, baseHoles, 0, baseH, { name: 'pillow_base' });

    // 2. Upright Saddle Housing (XY plane, z ∈ [-depth/2, +depth/2]) with REAL Bearing Seat Bore!
    const saddPts = [[-rHead - 4, baseH - 0.2], [rHead + 4, baseH - 0.2]];
    const arcSegs = 36;
    for (let i = 0; i <= arcSegs; i++) {
      const a = lerp(0, PI, i / arcSegs);
      saddPts.push([Math.cos(a) * rHead, centerH + Math.sin(a) * rHead]);
    }
    const seatHole = C.circle2D(0, centerH, rSeat, 48);
    const saddlePart = C.extrudePolygon2D(saddPts, [seatHole], -depth * 0.5, depth * 0.5, { name: 'pillow_saddle' });
    // extrudePolygon2D maps (x2d, y2d) -> (x2d, extrudeY, -y2d); rotateX(+PI/2) -> (x2d, y2d, extrudeY)!
    C.rotatePartX(saddlePart, PI * 0.5);

    const housing = C.mergeParts([basePart, saddlePart], {
      name: 'pillow_block_housing', role: 'housing', color: null,
      pivot: [0, centerH, 0], explodeVec: [0, 0, -8]
    });
    const parts = [housing];

    if (includeBearing) {
      const brgW = Math.min(depth - 1.5, Math.max(6, brgOD * 0.32));
      const bBuilt = buildBearing({ preset: '608', id: shaftD, od: brgOD - 0.1, width: brgW, clearance: 0.12, showCage: false }, 0);
      const brgMerged = C.mergeParts(bBuilt.parts, {
        name: 'seated_bearing', role: 'bearing', color: '#e2e8f0', metalness: 0.9, roughness: 0.18,
        pivot: [0, centerH, 0], explodeVec: [0, 0, 14]
      });
      // Bearing axis is Y -> rotate X +PI/2 so axis is Z and center sits at (0, centerH, 0)!
      C.translatePart(brgMerged, 0, -brgW * 0.5, 0);
      C.rotatePartX(brgMerged, PI * 0.5);
      C.translatePart(brgMerged, 0, centerH, 0);
      parts.push(brgMerged);
    }

    return {
      parts,
      draw2D: {
        loops: [
          { layer: 'OUTER', pts: saddPts },
          { layer: 'HOLES', pts: seatHole },
          { layer: 'OUTER', pts: baseOuter.map(([x, y]) => [x, y - 24]) },
          ...baseHoles.map((h) => ({ layer: 'HOLES', pts: h.map(([x, y]) => [x, y - 24]) }))
        ],
        circles: [{ layer: 'PITCH_CIRCLE', cx: 0, cy: centerH, r: shaftD * 0.5 }]
      },
      specs: {
        standard: `KP / UCP Pillow Block Housing (Vertical Slotted Feet)`,
        metrics: [
          { k: 'Bearing Seat Ø', v: `${round2(brgOD)} mm` },
          { k: 'Center Height',  v: `${round2(centerH)} mm` },
          { k: 'Mount Pitch',    v: `${round2(holeSpanX * 2)} mm (2×Ø${round2(mountD)})` },
          { k: 'Base Length',    v: `${round2(baseLen)} mm` }
        ],
        warnings: []
      },
      kinematics: includeBearing
        ? { type: 'spin', parts: [{ idx: 1, axis: 'z', rate: 1.5 }] }
        : { type: 'spin', parts: [{ idx: 0, axis: 'y', rate: 0.7 }] }
    };
  }

  /* =========================================================================
     22. CNC SHAFT COUPLER (HELICAL FLEX / 3-PIECE JAW-SPIDER / RIGID SPLIT-CLAMP)
         ZERO FAKE BLACK BOXES!
  ========================================================================= */
  function buildCoupler(p, fitTol) {
    const type = p.couplerType || 'jaw'; // jaw | flex | rigid
    const od = clamp(p.od || 20, 12, 50);
    const len = clamp(p.length || 26, 16, 65);
    const d1 = clamp(p.bore1 || 5.0, 2, od - 5);
    const d2 = clamp(p.bore2 || 8.0, 2, od - 5);
    const boreType = p.boreType || 'dshaft';

    const rOut = od * 0.5;
    const b1Loop = C.buildBore2D({ type: boreType, diam: d1, tol: fitTol, segs: 36 });
    const b2Loop = C.buildBore2D({ type: boreType, diam: d2, tol: fitTol, segs: 36 });
    const outerCircle = C.circle2D(0, 0, rOut, 48);
    const parts = [];

    if (type === 'jaw') {
      // 3-Piece Lovejoy / Oldham Jaw Coupler: Lower Hub (d1) + Elastomer Spider + Upper Hub (d2)!
      const hubH = len * 0.34;
      const jawH = len * 0.32;
      const jawCount = 3;
      const rJawIn = Math.max((Math.max(d1, d2) + fitTol) * 0.5 + 1.5, rOut * 0.52);

      function makeJawHub(boreLoop, yBase0, yBase1, yJaw0, yJaw1, phaseOff, name, color, expY) {
        const subs = [C.extrudePolygon2D(outerCircle, [boreLoop], yBase0, yBase1, { color })];
        // 3 Curved Sector Jaws!
        const sectorHalf = (TAU / (jawCount * 4)) * 0.88;
        for (let k = 0; k < jawCount; k++) {
          const cA = phaseOff + (k / jawCount) * TAU;
          const jPts = [];
          for (let i = 0; i <= 6; i++) {
            const a = lerp(cA - sectorHalf, cA + sectorHalf, i / 6);
            jPts.push([Math.cos(a) * rOut, Math.sin(a) * rOut]);
          }
          for (let i = 6; i >= 0; i--) {
            const a = lerp(cA - sectorHalf, cA + sectorHalf, i / 6);
            jPts.push([Math.cos(a) * rJawIn, Math.sin(a) * rJawIn]);
          }
          subs.push(C.extrudePolygon2D(jPts, [], yJaw0, yJaw1, { color }));
        }
        return C.mergeParts(subs, { name, color, pivot: [0, len * 0.5, 0], explodeVec: [0, expY, 0] });
      }

      const botHub = makeJawHub(b1Loop, 0, hubH, hubH - 0.1, hubH + jawH, 0, 'coupler_hub_bottom', '#cbd5e1', -12);
      const topHub = makeJawHub(b2Loop, len - hubH, len, len - hubH - jawH, len - hubH + 0.1, PI / jawCount, 'coupler_hub_top', '#94a3b8', 12);

      // 6-Leg Elastomer Star Spider seated tightly between lower & upper jaws!
      const spiderPts = [];
      const legs = jawCount * 2;
      const legHalf = (TAU / (legs * 2)) * 0.52 - (fitTol * 0.4) / rOut;
      const rSpIn = Math.max(rJawIn * 0.85, (Math.max(d1, d2) + 2) * 0.5);
      for (let k = 0; k < legs; k++) {
        const cA = (k + 0.5) * (TAU / legs);
        const a0 = cA - legHalf, a1 = cA + legHalf;
        spiderPts.push([Math.cos(a0) * rSpIn, Math.sin(a0) * rSpIn]);
        spiderPts.push([Math.cos(a0) * (rOut - 0.2), Math.sin(a0) * (rOut - 0.2)]);
        spiderPts.push([Math.cos(a1) * (rOut - 0.2), Math.sin(a1) * (rOut - 0.2)]);
        spiderPts.push([Math.cos(a1) * rSpIn, Math.sin(a1) * rSpIn]);
      }
      const spHole = C.circle2D(0, 0, Math.max(2.0, rSpIn - 2.2), 28);
      const spider = C.extrudePolygon2D(spiderPts, [spHole], hubH + 0.3, len - hubH - 0.3, {
        name: 'coupler_elastomer_spider', role: 'spider', color: '#f97316',
        pivot: [0, len * 0.5, 0], explodeVec: [0, 0, 0]
      });

      parts.push(botHub, spider, topHub);
    } else if (type === 'flex') {
      // REAL Helical-Beam Flexible Coupler: Solid bottom hub (d1) + 3 Parallel Helical Spring Coils + Solid top hub (d2)!
      const hubH = len * 0.30;
      const flexY0 = hubH - 0.4, flexY1 = len - hubH + 0.4;
      const botHub = C.extrudePolygon2D(outerCircle, [b1Loop], 0, hubH, { name: 'flex_hub_bot' });
      const topHub = C.extrudePolygon2D(outerCircle, [b2Loop], len - hubH, len, { name: 'flex_hub_top' });
      const rMean = (rOut + Math.max(d1, d2) * 0.5 + 1.5) * 0.5;
      const beamR = clamp((rOut - Math.max(d1, d2) * 0.5) * 0.42, 1.0, 3.0);
      const coils = [botHub, topHub];
      const strands = 3;
      for (let s = 0; s < strands; s++) {
        const a0 = (s / strands) * TAU;
        const path = [];
        const steps = 36;
        for (let i = 0; i <= steps; i++) {
          const u = i / steps;
          const a = a0 + u * TAU * 0.85;
          path.push([Math.cos(a) * rMean, lerp(flexY0, flexY1, u), Math.sin(a) * rMean]);
        }
        coils.push(C.buildClosedSweepTube(path, beamR, 12, { name: `flex_beam_${s}` }));
      }
      parts.push(C.mergeParts(coils, { name: 'helical_flex_coupler', pivot: [0, len * 0.5, 0] }));
    } else {
      // Rigid Split-Clamp Coupler (Real C-slot clamping gap + independent bores d1 & d2!)
      const halfL = len * 0.5;
      const slitGap = 1.4;
      const aOut = Math.asin(clamp(slitGap * 0.5 / rOut, 0.04, 0.3));
      function makeSplitHalf(boreD, y0, y1) {
        const rIn = (boreD + fitTol) * 0.5;
        const aIn = Math.asin(clamp(slitGap * 0.5 / rIn, 0.05, 0.55));
        const pts = [];
        for (let i = 0; i <= 40; i++) { const a = lerp(aOut, TAU - aOut, i / 40); pts.push([Math.cos(a) * rOut, Math.sin(a) * rOut]); }
        for (let i = 40; i >= 0; i--) { const a = lerp(aIn, TAU - aIn, i / 40); pts.push([Math.cos(a) * rIn, Math.sin(a) * rIn]); }
        return C.extrudePolygon2D(pts, [], y0, y1, {});
      }
      parts.push(C.mergeParts([
        makeSplitHalf(d1, 0, halfL + 0.1),
        makeSplitHalf(d2, halfL - 0.1, len)
      ], { name: 'rigid_split_coupler', pivot: [0, len * 0.5, 0] }));
    }

    return {
      parts,
      draw2D: {
        loops: [{ layer: 'OUTER', pts: outerCircle }, { layer: 'HOLES', pts: b1Loop }, { layer: 'HOLES', pts: b2Loop }],
        circles: []
      },
      specs: {
        standard: `CNC Shaft Coupler (${type.toUpperCase()} · ${round2(d1)}→${round2(d2)} mm)`,
        metrics: [
          { k: 'Bore 1 → Bore 2', v: `Ø${round2(d1)} → Ø${round2(d2)} mm` },
          { k: 'Outer Ø × L',     v: `Ø${round2(od)} × ${round2(len)} mm` },
          { k: 'Bore Profile',    v: boreType.toUpperCase() }
        ],
        warnings: []
      },
      kinematics: { type: 'spin', parts: parts.map((_, idx) => ({ idx, axis: 'y', rate: 1.4 })) }
    };
  }

  /* =========================================================================
     23. WORKING UNIVERSAL JOINT (CARDAN / HOOKE'S JOINT WITH REAL SHAFTS & SPIDER!)
  ========================================================================= */
  function buildCardan(p, fitTol) {
    const od = clamp(p.od || 24, 14, 60);
    const boreD = clamp(p.boreDiam || 8, 3, od * 0.55);
    const jointDeg = clamp(p.angle || 22, 0, 35);
    const boreType = p.boreType || 'dshaft';

    const rHub = od * 0.5;
    const hubL = od * 0.58;
    const armT = clamp(od * 0.19, 3.0, 9.0);
    const armW = od * 0.62;
    const forkGap = od - armT * 2;
    const forkReach = od * 0.56;
    const pinR = clamp(od * 0.14, 2.0, 6.5);
    const pinClearR = pinR + Math.max(0.15, fitTol * 0.5);

    const boreLoop = C.buildBore2D({ type: boreType, diam: boreD, tol: fitTol, segs: 32 });

    // Build a single complete Yoke centered so its transverse pin axis sits at (0, 0, 0) along X!
    // Hub extends downward along -Y from y = -(forkReach) down to y = -(forkReach + hubL)!
    function makeYoke(name, color, expVec) {
      const hub = C.extrudePolygon2D(C.circle2D(0, 0, rHub, 40), [boreLoop], -(forkReach + hubL), -forkReach + 1.0, { color });
      // Fork bridge collar linking hub to twin fork arms
      const bridge = C.buildBox(0, -forkReach + armT * 0.45, 0, od, armT, armW, { color });

      // Twin Fork Arms in YZ plane (height from -forkReach up to +pinR*2.0), with REAL transverse pin bore at (y=0, z=0)!
      const armH = forkReach + pinR * 1.9;
      const armOuter = C.roundedRect2D(-forkReach + armH * 0.5, 0, armH, armW, pinR * 1.4, 6);
      const pinHole = C.circle2D(0, 0, pinClearR, 26);
      // extrudePolygon2D(armOuter, [pinHole], 0, armT): 2D x -> Y, 2D y -> Z, extrudeY -> X!
      const armL = C.extrudePolygon2D(armOuter, [pinHole], 0, armT, { color });
      C.transformPart(armL, (px, py, pz) => [-rHub + py, px, pz]);
      const armR = C.clonePart(armL);
      C.translatePart(armR, od - armT, 0, 0);

      return C.mergeParts([hub, bridge, armL, armR], { name, color, pivot: [0, 0, 0], explodeVec: expVec });
    }

    const yoke1 = makeYoke('cardan_yoke_input', '#94a3b8', [0, -14, 0]);
    const yoke2 = makeYoke('cardan_yoke_output', '#38bdf8', [0, 14, 0]);
    // Flip Yoke 2 upside down (180° around Z) and rotate 90° around Y so its pin axis lies along Z (orthogonal to Yoke 1's X axis)!
    C.rotatePartZ(yoke2, PI);
    C.rotatePartY(yoke2, PI * 0.5);
    // Articulate Yoke 2 around X axis by jointDeg!
    const jRad = jointDeg * DEG;
    if (Math.abs(jRad) > 1e-4) C.rotatePartX(yoke2, jRad);

    // Central Cross Spider (Cube core + 4 Orthogonal Pins matching exact fork width!)
    const coreS = Math.max(pinR * 2.4, forkGap - 2.2);
    const pinSpan = od - 1.2;
    const core = C.buildBox(0, 0, 0, coreS * 0.85, coreS * 0.85, coreS * 0.85, { color: '#f97316' });
    const pinX = C.buildPrismY(0, -pinSpan * 0.5, pinSpan * 0.5, 0, pinR, 24, 0, { color: '#f97316' });
    C.rotatePartZ(pinX, PI * 0.5);
    const pinZ = C.buildPrismY(0, -pinSpan * 0.5, pinSpan * 0.5, 0, pinR, 24, 0, { color: '#f97316' });
    C.rotatePartX(pinZ, PI * 0.5);
    const spider = C.mergeParts([core, pinX, pinZ], {
      name: 'cardan_cross_spider', role: 'spider', color: '#f97316',
      pivot: [0, 0, 0], explodeVec: [0, 0, 0]
    });

    const parts = [yoke1, spider, yoke2];
    C.seatOnBed(parts);

    return {
      parts,
      draw2D: {
        loops: [{ layer: 'OUTER', pts: C.circle2D(0, 0, rHub, 44) }, { layer: 'HOLES', pts: boreLoop }],
        circles: [{ layer: 'PITCH_CIRCLE', cx: 0, cy: 0, r: pinR }]
      },
      specs: {
        standard: `DIN 808 Universal Joint / Cardan (${round2(jointDeg)}° Articulation)`,
        metrics: [
          { k: 'Joint Outer Ø',  v: `${round2(od)} mm` },
          { k: 'Shaft Bores',    v: `2× Ø${round2(boreD)} mm (${boreType})` },
          { k: 'Spider Pin Ø',   v: `Ø${round2(pinR * 2)} mm` },
          { k: 'Operating Ang.', v: `${round2(jointDeg)}°` }
        ],
        warnings: []
      },
      kinematics: { type: 'cardan', yoke1Idx: 0, spiderIdx: 1, yoke2Idx: 2, jointRad: jRad }
    };
  }

  /* =========================================================================
     24. ISO 12240 CAPTIVE SPHERICAL BALL JOINT / ROD END (HEIM JOINT!)
         REAL CONCAVE SPHERICAL SOCKET + REAL HOLLOW BORED BALL + FUSED ISO THREADED ROD!
  ========================================================================= */
  function buildBallJoint(p, fitTol) {
    const boreD = clamp(p.boreDiam || 8, 4, 20);
    const ballOD = clamp(p.ballOD || Math.max(boreD * 1.9, boreD + 7), boreD + 5, 42);
    const housingW = clamp(p.housingWidth || ballOD * 0.58, 6, 26);
    const ballW = clamp(p.ballWidth || housingW * 1.25, housingW + 1.0, ballOD * 0.88);
    const shankLen = clamp(p.shankLength || 28, 12, 70);
    const shankD = clamp(p.shankDiam || boreD, 4, 20);
    const tol = Math.max(0.15, (p.clearance != null ? p.clearance : 0.25) + fitTol);

    const rBall = ballOD * 0.5;
    const rBore = (boreD + fitTol) * 0.5;
    const rSock = rBall + tol;
    const rHeadOuter = rSock + Math.max(3.5, ballOD * 0.24);

    // 1. REAL HOLLOW BORED SPHERICAL BALL via Closed Lathe (ZERO fake black cylinder!)
    const hBall = Math.min(ballW * 0.5, rBall * 0.92);
    const ballProf = [];
    const sSegs = 20;
    const aMax = Math.asin(clamp(hBall / rBall, 0.2, 0.96));
    for (let i = 0; i <= sSegs; i++) {
      const a = lerp(-aMax, aMax, i / sSegs);
      ballProf.push([Math.cos(a) * rBall, Math.sin(a) * rBall]);
    }
    ballProf.push([rBore, hBall], [rBore, -hBall]);
    const ballPart = C.buildClosedLatheY(ballProf, 44, {
      name: 'heim_captive_ball', role: 'ball', color: '#e2e8f0', metalness: 0.92, roughness: 0.15,
      pivot: [0, 0, 0], explodeVec: [0, 16, 0]
    });

    // 2. HOUSING RING WITH REAL CONCAVE SPHERICAL INNER SOCKET (Captures Ball!)
    const hHous = Math.min(housingW * 0.5, rSock * 0.86);
    const aHous = Math.asin(clamp(hHous / rSock, 0.2, 0.90));
    const housProf = [[rHeadOuter, -hHous], [rHeadOuter, hHous]];
    // Concave spherical inner cavity from +hHous down to -hHous!
    for (let i = 0; i <= sSegs; i++) {
      const a = lerp(aHous, -aHous, i / sSegs);
      housProf.push([Math.cos(a) * rSock, Math.sin(a) * rSock]);
    }
    const ringHead = C.buildClosedLatheY(housProf, 48, { color: '#94a3b8' });

    // 3. Fused Collar Boss + REAL ISO 68-1 Threaded Shank protruding along +X (SOLIDLY CONNECTED!)
    const pitch = shankD <= 6 ? 1.0 : (shankD <= 8 ? 1.25 : (shankD <= 10 ? 1.5 : 1.75));
    const neckLen = 5.5;
    const neck = C.buildPrismY(0, rHeadOuter - 2.0, rHeadOuter + neckLen, 0, Math.min(hHous * 0.95, shankD * 0.68), 28, 0, { color: '#94a3b8' });
    C.rotatePartZ(neck, -PI * 0.5);
    const threadShank = C.buildExternalThreadY({
      majorDiam: shankD,
      pitch,
      starts: 1,
      y0: rHeadOuter + neckLen - 0.5,
      y1: rHeadOuter + neckLen + shankLen,
      profile: 'iso60',
      tol: fitTol * 0.5,
      radialSegs: 36,
      stepsPerPitch: 5,
      meta: { color: '#94a3b8' }
    });
    C.rotatePartZ(threadShank, -PI * 0.5);

    const housing = C.mergeParts([ringHead, neck, threadShank], {
      name: 'heim_rod_end_housing', role: 'housing', color: '#94a3b8',
      pivot: [0, 0, 0], explodeVec: [0, 0, 0]
    });

    const parts = [housing, ballPart];
    C.seatOnBed(parts);

    return {
      parts,
      draw2D: {
        loops: [
          { layer: 'OUTER', pts: C.circle2D(0, 0, rHeadOuter, 48) },
          { layer: 'HOLES', pts: C.circle2D(0, 0, rBore, 36) }
        ],
        circles: [{ layer: 'PITCH_CIRCLE', cx: 0, cy: 0, r: rBall }]
      },
      specs: {
        standard: `ISO 12240 Spherical Rod End (M${round2(shankD)}×${pitch} Heim Joint)`,
        metrics: [
          { k: 'Ball Bore Ø',   v: `Ø${round2(boreD)} mm (Real)` },
          { k: 'Sphere Ø',      v: `Ø${round2(ballOD)} mm (Captive)` },
          { k: 'Housing Ø × W', v: `Ø${round2(rHeadOuter * 2)} × ${round2(housingW)} mm` },
          { k: 'Socket Clear',  v: `${round2(tol)} mm` }
        ],
        warnings: []
      },
      kinematics: { type: 'ball_joint', ballIdx: 1 }
    };
  }

  /* =========================================================================
     25. TRUE PRINT-IN-PLACE MECHANICAL HINGE (45° SELF-SUPPORTING CONES + REAL SCREW HOLES!)
  ========================================================================= */
  function buildHinge(p, fitTol) {
    const length = clamp(p.length || 56, 24, 140);
    const leafW = clamp(p.leafWidth || 22, 12, 60);
    const leafT = clamp(p.leafThick || 4.0, 2.5, 10);
    const knuckles = clamp(Math.round(p.knuckles || 5), 3, 9);
    const holeD = clamp(p.holeDiam || 4.2, 0, 8);
    const tol = Math.max(0.20, (p.clearance != null ? p.clearance : 0.30) + fitTol);
    const openDeg = clamp(p.openAngle != null ? p.openAngle : 180, 30, 180);

    const rBarrel = Math.max(leafT * 0.95, 4.2);
    const rPin = rBarrel * 0.48;
    const knLen = (length - (knuckles - 1) * tol) / knuckles;
    const coneH = Math.min(rPin * 0.95, knLen * 0.25);

    // Helper: Build one leaf (side = -1 Left, +1 Right) with REAL perpendicular screw holes!
    function buildLeaf(side, name, color) {
      const subs = [];
      const xStart = side > 0 ? 0 : -leafW;
      const cxLeaf = side * (leafW * 0.5);
      // Leaf plate in XZ plane (X along leaf width, Z along hinge length, Y ∈ [0, leafT])
      const plateOuter = C.roundedRect2D(cxLeaf, 0, leafW, length, 2.0, 4);
      const holes = [];
      if (holeD > 0.5) {
        const hCount = length >= 65 ? 3 : 2;
        const hx = side * clamp(leafW * 0.62, rBarrel + holeD, leafW - holeD * 0.9);
        for (let i = 0; i < hCount; i++) {
          const hz = lerp(-length * 0.34, length * 0.34, hCount === 1 ? 0.5 : i / (hCount - 1));
          holes.push(C.circle2D(hx, hz, (holeD + fitTol) * 0.5, 22));
        }
      }
      // Actually trim inner edge at barrel clearance where OTHER leaf's knuckles sit!
      // Cleanest mechanical design: leaf plate starts at x = side * (rBarrel + tol) so alternating knuckles NEVER collide!
      const plateW = Math.max(6, leafW - (rBarrel + tol));
      const plateCx = side * (rBarrel + tol + plateW * 0.5);
      const plateRect = C.roundedRect2D(plateCx, 0, plateW, length, 1.8, 4);
      const cleanHoles = [];
      if (holeD > 0.5) {
        const hCount = length >= 65 ? 3 : 2;
        const hx = side * (rBarrel + tol + plateW * 0.52);
        for (let i = 0; i < hCount; i++) {
          const hz = lerp(-length * 0.34, length * 0.34, hCount === 1 ? 0.5 : i / (hCount - 1));
          cleanHoles.push(C.circle2D(hx, hz, (holeD + fitTol) * 0.5, 22));
        }
      }
      subs.push(C.extrudePolygon2D(plateRect, cleanHoles, 0, leafT, { color }));

      // Add this leaf's knuckles + connecting webs + 45° self-supporting pivot cones!
      const isLeft = side < 0;
      for (let k = 0; k < knuckles; k++) {
        const owns = isLeft ? (k % 2 === 0) : (k % 2 === 1);
        if (!owns) continue;
        const z0 = -length * 0.5 + k * (knLen + tol);
        const z1 = z0 + knLen;
        const zMid = (z0 + z1) * 0.5;
        // Web tab connecting knuckle directly to leaf plate across clearance gap
        subs.push(C.buildBox(side * (rBarrel * 0.65 + tol * 0.6), leafT * 0.5, zMid, rBarrel + tol * 2 + 1.5, leafT, knLen, { color }));

        if (isLeft) {
          // Outer/even knuckles carry 45° self-supporting conical pivot pins pointing into neighboring odd knuckles!
          const prof = [];
          const hasPrev = k > 0, hasNext = k < knuckles - 1;
          if (hasPrev) prof.push([0, z0 - coneH], [rPin, z0]);
          else prof.push([0, z0]);
          prof.push([rBarrel, z0], [rBarrel, z1]);
          if (hasNext) prof.push([rPin, z1], [0, z1 + coneH]);
          else prof.push([0, z1]);
          const kn = C.buildClosedLatheY(prof, 32, { color });
          C.rotatePartX(kn, PI * 0.5); // Axis along Z!
          C.translatePart(kn, 0, rBarrel, 0);
          subs.push(kn);
        } else {
          // Odd knuckles have matching 45° conical recesses (through-socket) with exact clearance!
          const rSock = rPin + tol * 0.85;
          const prof = [
            [rSock, z0], [rBarrel, z0], [rBarrel, z1], [rSock, z1],
            [rSock * 0.35, zMid] // Center hourglass socket matching 45° pins!
          ];
          const kn = C.buildClosedLatheY(prof, 32, { color });
          C.rotatePartX(kn, PI * 0.5);
          C.translatePart(kn, 0, rBarrel, 0);
          subs.push(kn);
        }
      }

      const merged = C.mergeParts(subs, {
        name, color,
        pivot: [0, rBarrel, 0],
        explodeVec: [side * 10, 0, 0]
      });
      return { part: merged, plateRect, cleanHoles };
    }

    const left = buildLeaf(-1, 'hinge_leaf_left', '#94a3b8');
    const right = buildLeaf(+1, 'hinge_leaf_right', '#f97316');

    // Fold right leaf to requested initial openAngle (180° = flat print-in-place!)
    const foldRad = (180 - openDeg) * DEG;
    if (Math.abs(foldRad) > 1e-4) {
      C.translatePart(right.part, 0, -rBarrel, 0);
      C.rotatePartZ(right.part, foldRad);
      C.translatePart(right.part, 0, rBarrel, 0);
    }

    const parts = [left.part, right.part];
    C.seatOnBed(parts);

    return {
      parts,
      draw2D: {
        loops: [
          { layer: 'OUTER', pts: left.plateRect },
          ...left.cleanHoles.map((h) => ({ layer: 'HOLES', pts: h })),
          { layer: 'OUTER', pts: right.plateRect },
          ...right.cleanHoles.map((h) => ({ layer: 'HOLES', pts: h }))
        ],
        circles: []
      },
      specs: {
        standard: `Print-in-Place ${knuckles}-Knuckle Hinge (45° Captive Cones)`,
        metrics: [
          { k: 'Total Length',   v: `${round2(length)} mm` },
          { k: 'Open Span',      v: `${round2(leafW * 2)} mm` },
          { k: 'Barrel Ø',       v: `Ø${round2(rBarrel * 2)} mm` },
          { k: 'Axial Clear',    v: `${round2(tol)} mm (Zero Fuse)` }
        ],
        warnings: []
      },
      kinematics: { type: 'hinge', rightIdx: 1, baseFold: foldRad }
    };
  }

  /* =========================================================================
     26. CABLE DRAG CHAIN / E-CHAIN (REAL HOLLOW LONGITUDINAL CABLE TUNNEL!)
  ========================================================================= */
  function buildChain(p, fitTol) {
    const innerW = clamp(p.innerWidth || 18, 8, 50);
    const innerH = clamp(p.innerHeight || 12, 6, 32);
    const pitch = clamp(p.pitch || 20, 12, 36);
    const links = clamp(Math.round(p.links || 7), 1, 16);
    const bendDeg = clamp(p.bendAngle || 0, 0, 35); // Bend angle per link!
    const wallT = clamp(p.wallThick || 2.4, 1.6, 5.0);

    const outerW = innerW + wallT * 2;
    const outerH = innerH + wallT * 2;
    const pinR = clamp(outerH * 0.16, 1.5, 3.2);
    const linkL = pitch + pinR * 2.4;

    // Build ONE authentic E-Chain Link with LONGITUDINAL HOLLOW CABLE TUNNEL along X!
    function buildSingleLink(idx) {
      const subs = [];
      // Left & Right side walls (running longitudinally along X, spanning full linkL!)
      // Front end (+X) slightly stepped outward; rear end (-X) stepped inward so adjacent links interlock!
      const stepT = wallT * 0.52;
      const rearZ = innerW * 0.5 + stepT * 0.5;
      const frontZ = innerW * 0.5 + stepT + fitTol * 0.5 + stepT * 0.5;

      // Side wall main panels (Left -Z & Right +Z) with integrated stepped overlap lugs!
      for (const s of [-1, 1]) {
        // Rear half (inner plane, carries outward pivot pins!)
        subs.push(C.buildBox(-pitch * 0.25, outerH * 0.5, s * rearZ, pitch * 0.65, outerH, stepT, { color: '#475569' }));
        // Front half (outer overlap ear)
        subs.push(C.buildBox(+pitch * 0.28, outerH * 0.5, s * frontZ, pitch * 0.62, outerH, stepT, { color: '#475569' }));
        // Cylindrical pivot pin projecting outward at x = -pitch * 0.5 (engages next link's front ear!)
        const pin = C.buildPrismY(0, -stepT * 0.8, stepT * 0.8, 0, pinR, 16, 0, { color: '#f97316' });
        C.rotatePartX(pin, PI * 0.5);
        C.translatePart(pin, -pitch * 0.5, outerH * 0.5, s * (rearZ + stepT * 0.6));
        subs.push(pin);
      }

      // Bottom & Top Transverse Crossbars framing the REAL HOLLOW CABLE TUNNEL (cable passes freely along X!)
      const barL = pitch * 0.48;
      const botBar = C.buildBox(0, wallT * 0.5, 0, barL, wallT, innerW + stepT, { color: '#64748b' });
      const topBar = C.buildBox(0, outerH - wallT * 0.5, 0, barL, wallT, innerW + stepT, { color: '#f97316' });
      subs.push(botBar, topBar);

      return C.mergeParts(subs, { name: `drag_chain_link_${idx + 1}`, color: idx % 2 === 0 ? '#475569' : '#64748b' });
    }

    const parts = [];
    let curX = 0, curY = 0, curAng = 0;
    const stepRad = bendDeg * DEG;

    for (let i = 0; i < links; i++) {
      const link = buildSingleLink(i);
      if (Math.abs(curAng) > 1e-4) C.rotatePartZ(link, curAng);
      C.translatePart(link, curX, curY, 0);
      link.explodeVec = [i * 4 - links * 2, 0, 0];
      parts.push(link);

      // Advance smoothly along true circular arc so pivot pins stay locked in sockets!
      const nextAng = curAng + stepRad;
      curX += Math.cos(curAng) * (pitch * 0.5) + Math.cos(nextAng) * (pitch * 0.5);
      curY += Math.sin(curAng) * (pitch * 0.5) + Math.sin(nextAng) * (pitch * 0.5);
      curAng = nextAng;
    }

    // Center & seat on bed
    const b = C.getPartsBounds(parts);
    const cx = (b.minX + b.maxX) * 0.5, cy = b.minY;
    for (let i = 0; i < parts.length; i++) C.translatePart(parts[i], -cx, -cy, 0);

    const bendR = stepRad > 0.01 ? (pitch / (2 * Math.sin(stepRad * 0.5))) : Infinity;
    return {
      parts,
      draw2D: {
        loops: [
          { layer: 'OUTER', pts: C.rect2D(0, outerH * 0.5, outerW, outerH) },
          { layer: 'HOLES', pts: C.rect2D(0, outerH * 0.5, innerW, innerH) }
        ],
        circles: []
      },
      specs: {
        standard: `E-Chain Cable Carrier (${innerW}×${innerH} mm Internal Tunnel)`,
        metrics: [
          { k: 'Cable Tunnel', v: `${round2(innerW)} × ${round2(innerH)} mm` },
          { k: 'Outer W × H',  v: `${round2(outerW)} × ${round2(outerH)} mm` },
          { k: 'Link Pitch',   v: `${round2(pitch)} mm × ${links} links` },
          { k: 'Bend Radius',  v: isFinite(bendR) ? `R${round2(bendR)} mm` : 'Straight' }
        ],
        warnings: []
      },
      kinematics: { type: 'spin', parts: parts.map((_, idx) => ({ idx, axis: 'y', rate: 0.5 })) }
    };
  }

  /* =========================================================================
     27. DIN 2095 WATERTIGHT HELICAL SPRING (COMPRESSION / EXTENSION / TORSION!)
         100% CAPPED WATERTIGHT SWEEP + EXACT NOMINAL HEIGHT L (ZERO +wd BLOAT!)
  ========================================================================= */
  function buildSpring(p) {
    const type = p.springType || 'compression'; // compression | extension | torsion
    const od = clamp(p.od || 18, 6, 80);
    const wd = clamp(p.wireDiam || 2.2, 0.8, 10);
    const coils = clamp(p.coils || 6, 2, 20);
    const freeLen = clamp(p.length || 38, wd * (coils + 1.5), 200);
    const torsionDeg = clamp(p.torsionAngle || 90, 45, 270);

    const rWire = wd * 0.5;
    const meanD = Math.max(wd * 2.2, od - wd);
    const rMean = meanD * 0.5;
    const springIndex = meanD / wd;
    const solidH = (coils + 1.5) * wd;

    const warnings = [];
    if (springIndex < 4) warnings.push({ severity: 'warn', en: `Spring Index C=${round2(springIndex)} < 4 (high coil stress, hard to form)`, fr: `Indice de ressort C=${round2(springIndex)} < 4 (contraintes élevées)` });
    if (type === 'compression' && freeLen < solidH + 1.0) warnings.push({ severity: 'warn', en: `Free length ${freeLen} mm is near solid height ${round2(solidH)} mm`, fr: `Longueur libre proche de la hauteur bloc ${round2(solidH)} mm` });

    const pathPts = [];
    const segsPerTurn = 28;

    if (type === 'compression') {
      // DIN 2095 Closed & Ground Flat End Coils -> Centerline spans [rWire, freeLen - rWire],
      // so TOTAL BOUNDING HEIGHT is EXACTLY `freeLen` (0.00 mm wire-diameter bloat!)
      const yMin = rWire, yMax = freeLen - rWire;
      const deadTurns = 0.75; // Closed seating coil at bottom & top
      const totalTurns = coils + deadTurns * 2;
      const totalSteps = Math.round(totalTurns * segsPerTurn);
      for (let i = 0; i <= totalSteps; i++) {
        const u = i / totalSteps;
        const turn = u * totalTurns;
        const a = turn * TAU;
        let y;
        if (turn <= deadTurns) {
          // Flat bottom seating coil rising smoothly by 1 wire diameter
          const f = turn / deadTurns;
          y = yMin + wd * 0.5 * (f * f);
        } else if (turn >= totalTurns - deadTurns) {
          const f = (totalTurns - turn) / deadTurns;
          y = yMax - wd * 0.5 * (f * f);
        } else {
          const f = (turn - deadTurns) / coils;
          y = lerp(yMin + wd * 0.5, yMax - wd * 0.5, f);
        }
        pathPts.push([Math.cos(a) * rMean, y, Math.sin(a) * rMean]);
      }
    } else if (type === 'extension') {
      // Closed-wound coil body + Top & Bottom Circular Crossover Hook Loops!
      const hookR = rMean * 0.72;
      const bodyH = Math.max(coils * (wd * 1.08), freeLen - hookR * 4.2);
      const y0 = hookR * 2.0 + rWire;
      const y1 = y0 + bodyH;
      // Bottom hook loop in XY plane (r = hookR, centered at (0, y0 - hookR, 0))
      for (let i = 0; i <= 18; i++) {
        const a = lerp(PI * 0.75, TAU + PI * 0.45, i / 18);
        pathPts.push([Math.cos(a) * hookR, (y0 - hookR) + Math.sin(a) * hookR, 0]);
      }
      // Transition to helix start (rMean, y0, 0)
      pathPts.push([rMean * 0.65, y0 - hookR * 0.15, 0]);
      const bodySteps = Math.round(coils * segsPerTurn);
      for (let i = 0; i <= bodySteps; i++) {
        const u = i / bodySteps;
        const a = u * coils * TAU;
        pathPts.push([Math.cos(a) * rMean, lerp(y0, y1, u), Math.sin(a) * rMean]);
      }
      // Top hook loop in XY plane!
      pathPts.push([rMean * 0.65, y1 + hookR * 0.15, 0]);
      for (let i = 0; i <= 18; i++) {
        const a = lerp(-PI * 0.45, PI * 1.25, i / 18);
        pathPts.push([Math.cos(a) * hookR, (y1 + hookR) + Math.sin(a) * hookR, 0]);
      }
    } else {
      // Torsion Spring: Tight helical body + Two Straight Tangential Legs at exact torsionDeg!
      const legLen = Math.max(rMean * 1.8, 18);
      const bodyH = coils * (wd * 1.15);
      // Entry straight leg tangent at a = 0 (from (rMean, 0, -legLen) -> (rMean, 0, 0))
      for (let i = 0; i <= 6; i++) pathPts.push([rMean, rWire, lerp(-legLen, 0, i / 6)]);
      const totalTurns = coils + torsionDeg / 360;
      const bodySteps = Math.round(totalTurns * segsPerTurn);
      for (let i = 1; i <= bodySteps; i++) {
        const u = i / bodySteps;
        const a = u * totalTurns * TAU;
        pathPts.push([Math.cos(a) * rMean, rWire + u * bodyH, Math.sin(a) * rMean]);
      }
      // Exit straight leg tangent at end angle
      const endA = totalTurns * TAU;
      const ex = Math.cos(endA) * rMean, ez = Math.sin(endA) * rMean;
      const tx = -Math.sin(endA), tz = Math.cos(endA);
      for (let i = 1; i <= 6; i++) {
        const d = (i / 6) * legLen;
        pathPts.push([ex + tx * d, rWire + bodyH, ez + tz * d]);
      }
    }

    const part = C.buildClosedSweepTube(pathPts, rWire, 14, { name: `spring_${type}`, role: 'primary' });
    C.seatOnBed([part]);

    return {
      parts: [part],
      draw2D: {
        loops: [{ layer: 'OUTER', pts: C.circle2D(0, 0, od * 0.5, 48) }, { layer: 'HOLES', pts: C.circle2D(0, 0, Math.max(0.5, od * 0.5 - wd), 40) }],
        circles: [{ layer: 'PITCH_CIRCLE', cx: 0, cy: 0, r: rMean }]
      },
      specs: {
        standard: `DIN 2095 Capped Helical Spring (${type.toUpperCase()})`,
        metrics: [
          { k: 'Outer Ø (De)',  v: `${round2(od)} mm` },
          { k: 'Wire Ø (d)',    v: `${round2(wd)} mm` },
          { k: 'Spring Index C',v: `${round2(springIndex)} (Dm/d)` },
          { k: 'Solid Height',  v: `${round2(solidH)} mm` }
        ],
        warnings
      },
      kinematics: { type: 'spin', parts: [{ idx: 0, axis: 'y', rate: 1 }] }
    };
  }

  /* =========================================================================
     28. DIN 950 SPOKED INDUSTRIAL HANDWHEEL (REAL BORE/KEYWAY + REVOLVING HANDLE!)
  ========================================================================= */
  function buildHandwheel(p, fitTol) {
    const od = clamp(p.od || 100, 50, 220);
    const boreD = clamp(p.boreDiam || 10, 4, 30);
    const boreType = p.boreType || 'keyway';
    const spokes = clamp(Math.round(p.spokes || 3), 3, 6);
    const hasHandle = p.handle !== false;

    const rOuter = od * 0.5;
    const rimTubeR = clamp(od * 0.085, 5.0, 14.0);
    const rRimCenter = rOuter - rimTubeR;
    const hubOD = Math.max(boreD + 12, od * 0.24);
    const rHub = hubOD * 0.5;
    const hubH = Math.max(rimTubeR * 2.2, 18);

    // 1. Contoured Ergonomic Rim via Closed Lathe (Ovalized Torus — EXACT Outer Ø = od!)
    const rimProf = [];
    const rSegs = 24;
    for (let i = 0; i < rSegs; i++) {
      const a = (i / rSegs) * TAU;
      rimProf.push([rRimCenter + Math.cos(a) * rimTubeR, hubH * 0.68 + Math.sin(a) * rimTubeR * 0.92]);
    }
    const rimPart = C.buildClosedLatheY(rimProf, 60, { name: 'handwheel_rim' });

    // 2. Central Hub with REAL Through-Bore (Round / Keyway / D-Shaft — ZERO black cylinder!)
    const boreLoop = C.buildBore2D({ type: boreType, diam: boreD, tol: fitTol, segs: 36 });
    const hubPart = C.extrudePolygon2D(C.circle2D(0, 0, rHub, 44), [boreLoop], 0, hubH, { name: 'handwheel_hub' });

    // 3. Tapered Dish Spokes connecting Hub to Rim cleanly
    const subs = [rimPart, hubPart];
    const spThick = clamp(rimTubeR * 0.85, 4.5, 11.0);
    const spLen = rRimCenter - rHub + 3.0;
    for (let k = 0; k < spokes; k++) {
      const a = (k / spokes) * TAU;
      const spoke = C.buildPrismY(0, rHub - 1.5, rRimCenter + 1.5, 0, spThick * 0.52, 16, 0, {});
      // Tilt slightly into classic dished handwheel cone!
      C.rotatePartZ(spoke, -PI * 0.5 + 0.08);
      C.translatePart(spoke, 0, hubH * 0.52, 0);
      C.rotatePartY(spoke, a);
      subs.push(spoke);
    }

    // 4. Revolving Contoured Ergonomic Crank Handle mounted upright on Rim!
    if (hasHandle) {
      const hLen = clamp(od * 0.42, 26, 65);
      const handleProf = [
        [0, 0], [4.5, 0], [4.5, 4.0], [5.8, hLen * 0.22],
        [7.6, hLen * 0.65], [7.2, hLen * 0.92], [4.5, hLen], [0, hLen]
      ];
      const handle = C.buildClosedLatheY(handleProf, 28, { color: '#334155' });
      C.translatePart(handle, rRimCenter, hubH * 0.68 + rimTubeR * 0.65, 0);
      subs.push(handle);
    }

    const merged = C.mergeParts(subs, { name: `handwheel_${od}mm_${spokes}spoke`, role: 'primary' });
    C.seatOnBed([merged]);

    return {
      parts: [merged],
      draw2D: {
        loops: [{ layer: 'OUTER', pts: C.circle2D(0, 0, rOuter, 64) }, { layer: 'HOLES', pts: boreLoop }],
        circles: [{ layer: 'PITCH_CIRCLE', cx: 0, cy: 0, r: rRimCenter }]
      },
      specs: {
        standard: `DIN 950 Industrial Spoked Handwheel (${spokes} Spokes)`,
        metrics: [
          { k: 'Wheel Outer Ø', v: `${round2(od)} mm` },
          { k: 'Hub Bore Ø',    v: `Ø${round2(boreD)} mm (${boreType})` },
          { k: 'Hub Ø × H',     v: `Ø${round2(hubOD)} × ${round2(hubH)} mm` },
          { k: 'Crank Handle',  v: hasHandle ? 'Ergonomic Included' : 'None' }
        ],
        warnings: []
      },
      kinematics: { type: 'spin', parts: [{ idx: 0, axis: 'y', rate: 1.2 }] }
    };
  }

  return {
    bearing: buildBearing,
    linbear: buildLinBear,
    pillow: buildPillow,
    coupler: buildCoupler,
    cardan: buildCardan,
    balljoint: buildBallJoint,
    hinge: buildHinge,
    chain: buildChain,
    spring: buildSpring,
    handwheel: buildHandwheel
  };
}));
