/**
 * Mech Gen Pro — Power-Transmission & Flexible-Drive Engine (10 ISO/DIN/ANSI Modules)
 * Modules: gear, planetary, bevel, rack, worm, geneva, cam (#28), pulley, sprocket, idler.
 * Runs in Browser (window.MechGears) & Node.js test harness.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./mech-core.js'));
  } else {
    root.MechGears = factory(root.MechCore);
  }
}(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';

  const { PI, TAU, DEG, clamp, lerp, round2, round3 } = C;

  /* Helper: Lightening spoke hole cutouts for gears / sprockets */
  function buildSpokeHoles(count, rInnerLim, rOuterLim) {
    const holes = [];
    if (!count || count < 3) return holes;
    const rMin = rInnerLim, rMax = rOuterLim;
    if (rMax - rMin < 3.0) return holes;
    const step = TAU / count;
    const spokeHalfAng = clamp(1.8 / Math.max(rMin, 4), 0.10, step * 0.28);
    const arcSegs = 10;
    for (let k = 0; k < count; k++) {
      const a0 = k * step + spokeHalfAng;
      const a1 = (k + 1) * step - spokeHalfAng;
      if (a1 - a0 < 0.14) continue;
      const pts = [];
      for (let i = 0; i <= arcSegs; i++) {
        const a = lerp(a0, a1, i / arcSegs);
        pts.push([Math.cos(a) * rMax, Math.sin(a) * rMax]);
      }
      for (let i = arcSegs; i >= 0; i--) {
        const a = lerp(a0, a1, i / arcSegs);
        pts.push([Math.cos(a) * rMin, Math.sin(a) * rMin]);
      }
      holes.push(pts);
    }
    return holes;
  }

  /* =========================================================================
     1. ISO 53 / DIN 867 SPUR / HELICAL / HERRINGBONE GEAR (+ TWIN MESHING!)
  ========================================================================= */
  function buildGear(p, fitTol) {
    const Z = Math.max(6, Math.round(p.teeth || 20));
    const m = clamp(p.module || 2.0, 0.5, 10);
    const thick = clamp(p.thickness || 5.0, 1.5, 80);
    const alpha = p.pressureAngle || 20;
    const x = clamp(p.profileShift || 0, -0.5, 0.8);
    const backlash = Math.max(0, (p.backlash || 0) + fitTol * 0.5);
    const gearType = p.gearType || 'spur'; // spur | helical | herringbone
    const helixDeg = gearType === 'spur' ? 0 : clamp(p.helixAngle || 20, 5, 35);
    const boreType = p.boreType || 'round';
    const boreDiam = clamp(p.boreDiam != null ? p.boreDiam : 10, 0, m * Z * 0.72);
    const spokes = Math.round(p.spokes || 0);
    const hubH = p.hubEnabled ? clamp(p.hubHeight || 5, 1, 30) : 0;
    const showTwin = !!p.showTwin;
    const Z2 = Math.max(6, Math.round(p.twinTeeth || 12));

    const warnings = [];
    if (Z < 17 && alpha === 20 && x < (17 - Z) / 17 - 0.05) {
      warnings.push({
        severity: 'warn',
        en: `Undercut alert: Z=${Z} < 17 at 20° PA. Apply Profile Shift x ≥ ${round2((17 - Z) / 17)}`,
        fr: `Risque de sous-coupe : Z=${Z} < 17 à 20°. Appliquez déport x ≥ ${round2((17 - Z) / 17)}`
      });
    }

    function makeSingleGear(teeth, name, role, helixSign, useSpokes, useHub, colorOverride) {
      const inv = C.involuteGear2D({ teeth, module: m, pressureAngle: alpha, profileShift: x, backlash, ptsPerFlank: 6 });
      const maxSafeBore = Math.max(0, inv.rootDiam - 2.4);
      const effBore = Math.min(boreDiam, maxSafeBore);
      if (boreDiam > maxSafeBore && name === 'primary_gear') {
        warnings.push({ severity: 'warn', en: `Bore clamped to ${round2(effBore)} mm to preserve ≥1.2 mm tooth root wall`, fr: `Alésage limité à ${round2(effBore)} mm pour préserver une paroi ≥1.2 mm` });
      }
      const holes = [];
      const boreLoop = C.buildBore2D({ type: boreType, diam: effBore, tol: fitTol, segs: 40 });
      if (boreLoop) holes.push(boreLoop);

      const hubR = effBore > 0.5 ? Math.min(inv.rootRadius - 1.4, effBore * 0.5 + Math.max(2.5, m * 1.6)) : inv.rootRadius * 0.35;
      const spokeHoles = (useSpokes && spokes >= 3) ? buildSpokeHoles(spokes, hubR + 1.5, inv.rootRadius - Math.max(2.2, m * 1.1)) : [];
      for (let i = 0; i < spokeHoles.length; i++) holes.push(spokeHoles[i]);

      let part;
      if (gearType === 'spur' || helixDeg < 0.5) {
        part = C.extrudePolygon2D(inv.points, holes, 0, thick, { name, role, color: colorOverride });
      } else {
        // Total twist across face width = thick * tan(beta) / rp
        const totalTwist = helixSign * (thick * Math.tan(helixDeg * DEG)) / inv.pitchRadius;
        const slices = gearType === 'herringbone' ? 14 : 10;
        // For helical/herringbone keep spoke holes off or untwisted only on bore
        const twistHolesList = boreLoop ? [boreLoop] : [];
        part = C.extrudeLoft2D(inv.points, twistHolesList, 0, thick, slices, (u) => {
          const tw = gearType === 'herringbone'
            ? totalTwist * (1 - Math.abs(2 * u - 1)) * 0.5
            : totalTwist * (u - 0.5);
          return { scaleOuter: 1, scaleHole: 1, twist: tw, twistHoles: false };
        }, { name, role, color: colorOverride });
      }

      const subParts = [part];
      if (useHub && hubH > 0.5 && hubR > effBore * 0.5 + 1.2) {
        const hubOuter = C.circle2D(0, 0, hubR, 44);
        const hubHoles = boreLoop ? [boreLoop] : [];
        const hubPart = C.extrudePolygon2D(hubOuter, hubHoles, thick, thick + hubH, { name: name + '_hub', role, color: colorOverride });
        subParts.push(hubPart);
      }
      return {
        part: subParts.length > 1 ? C.mergeParts(subParts, { name, role, color: colorOverride }) : part,
        inv, holes
      };
    }

    const g1 = makeSingleGear(Z, 'primary_gear', 'primary', +1, true, hubH > 0, null);
    const parts = [g1.part];
    const loops = [{ layer: 'OUTER', pts: g1.inv.points }];
    g1.holes.forEach((h) => loops.push({ layer: 'HOLES', pts: h }));
    const circles = [{ layer: 'PITCH_CIRCLE', cx: 0, cy: 0, r: g1.inv.pitchRadius }];

    let centerDist = 0;
    let kinematics = { type: 'spin', parts: [{ idx: 0, axis: 'y', rate: 1 }] };

    if (showTwin) {
      centerDist = m * (Z + Z2) * 0.5 + m * x * 2;
      const g2 = makeSingleGear(Z2, 'twin_gear', 'secondary', -1, false, false, '#f59e0b');
      // Align mating tooth into valley at -X of gear 2:
      // Gear 1 has tooth centered at angle 0 (+X). Gear 2 touches Gear 1 at angle PI (-X).
      // If Z2 is even, Gear 2 has a tooth at PI -> rotate by PI/Z2 to place valley at PI!
      const phase = (Z2 % 2 === 0) ? (PI / Z2) : 0;
      C.rotatePartY(g2.part, phase);
      C.translatePart(g2.part, centerDist, 0, 0);
      g2.part.pivot = [centerDist, 0, 0];
      g2.part.explodeVec = [14, 0, 0];
      g1.part.explodeVec = [-6, 0, 0];
      parts.push(g2.part);

      const cosP = Math.cos(-phase), sinP = Math.sin(-phase);
      const tPts = g2.inv.points.map(([px, py]) => [px * cosP - py * sinP + centerDist, px * sinP + py * cosP]);
      loops.push({ layer: 'OUTER', pts: tPts });
      circles.push({ layer: 'PITCH_CIRCLE', cx: centerDist, cy: 0, r: g2.inv.pitchRadius });

      kinematics = {
        type: 'twin_gear',
        parts: [
          { idx: 0, axis: 'y', rate: 1.0 },
          { idx: 1, axis: 'y', rate: -Z / Z2 }
        ]
      };
    }

    const metrics = [
      { k: 'Pitch Ø (d)', v: `${round2(g1.inv.pitchDiam)} mm` },
      { k: 'Tip Ø (da)',  v: `${round2(g1.inv.tipDiam)} mm` },
      { k: 'Root Ø (df)', v: `${round2(g1.inv.rootDiam)} mm` },
      { k: 'Face Width',  v: `${round2(thick)} mm` },
      { k: 'Pitch (p)',   v: `${round2(g1.inv.circularPitch)} mm` }
    ];
    if (showTwin) {
      metrics.push({ k: 'Center Dist (a)', v: `${round2(centerDist)} mm` });
      metrics.push({ k: 'Ratio (i)', v: `1 : ${round2(Z2 / Z)}` });
    }

    return {
      parts,
      draw2D: { loops, circles },
      specs: { standard: `ISO 53 / DIN 867 (${alpha}° PA)`, metrics, warnings },
      kinematics
    };
  }

  /* =========================================================================
     2. ISO PLANETARY GEARBOX (SUN + N PLANETS + INTERNAL RING + CARRIER)
  ========================================================================= */
  function buildPlanetary(p, fitTol) {
    const m = clamp(p.module || 2.0, 0.8, 6.0);
    const Zs = Math.max(8, Math.round(p.sunTeeth || 12));
    const Zp = Math.max(8, Math.round(p.planetTeeth || 12));
    const Zr = Zs + 2 * Zp; // Exact coaxial condition Zr = Zs + 2*Zp
    const N = clamp(Math.round(p.planetCount || 3), 2, 6);
    const thick = clamp(p.thickness || 10, 3, 40);
    const backlash = Math.max(0.05, (p.backlash || 0.12) + fitTol * 0.5);
    const showCarrier = p.showCarrier !== false;

    const warnings = [];
    const assemblyRem = (Zs + Zr) % N;
    if (assemblyRem !== 0) {
      warnings.push({
        severity: 'fail',
        en: `Assembly Rule Violation: (Zs+Zr)=${Zs + Zr} is not divisible by N=${N}! Try N=${(Zs + Zr) % 3 === 0 ? 3 : ((Zs + Zr) % 4 === 0 ? 4 : 2)} or adjust Zs/Zp.`,
        fr: `Règle d'assemblage violée : (Zs+Zr)=${Zs + Zr} n'est pas divisible par N=${N} ! Essayez N=${(Zs + Zr) % 3 === 0 ? 3 : ((Zs + Zr) % 4 === 0 ? 4 : 2)}.`
      });
    }

    const rOrb = m * (Zs + Zp) * 0.5;
    const sunBore = clamp(p.sunBore || 6, 0, m * Zs * 0.55);
    const pinD = clamp(m * Zp * 0.30, 3, 14);

    // 1. Sun Gear
    const sunInv = C.involuteGear2D({ teeth: Zs, module: m, backlash, ptsPerFlank: 5 });
    const sunHoles = sunBore > 0.5 ? [C.buildBore2D({ type: p.boreType || 'dshaft', diam: sunBore, tol: fitTol })] : [];
    const sunPart = C.extrudePolygon2D(sunInv.points, sunHoles, 0, thick, {
      name: 'sun_gear', role: 'primary', color: '#f97316', pivot: [0, 0, 0], explodeVec: [0, thick * 1.4, 0]
    });

    // 2. Internal Ring Gear (Real Involute Internal Teeth!)
    const ringInv = C.involuteGear2D({ teeth: Zr, module: m, backlash, isInternal: true, ptsPerFlank: 5 });
    const ringOD = ringInv.rootDiam + Math.max(6, m * 3.5);
    const ringOuter = C.circle2D(0, 0, ringOD * 0.5, 96);
    const ringPart = C.extrudePolygon2D(ringOuter, [ringInv.points], 0, thick, {
      name: 'ring_gear', role: 'housing', color: '#64748b', pivot: [0, 0, 0], explodeVec: [0, 0, 0]
    });
    // Align ring teeth to match planet 0 phase:
    const ringPhase = (Zp % 2 === 0) ? (PI / Zr) : 0;
    if (ringPhase) C.rotatePartY(ringPart, ringPhase);

    const parts = [sunPart, ringPart];
    const loops = [
      { layer: 'OUTER', pts: ringOuter },
      { layer: 'HOLES', pts: ringInv.points },
      { layer: 'OUTER', pts: sunInv.points }
    ];
    const circles = [
      { layer: 'PITCH_CIRCLE', cx: 0, cy: 0, r: sunInv.pitchRadius },
      { layer: 'PITCH_CIRCLE', cx: 0, cy: 0, r: ringInv.pitchRadius }
    ];

    // 3. N Planet Gears
    const planInv = C.involuteGear2D({ teeth: Zp, module: m, backlash, ptsPerFlank: 5 });
    const planHoles = [C.circle2D(0, 0, (pinD + fitTol + 0.2) * 0.5, 28)];
    const basePlanet = C.extrudePolygon2D(planInv.points, planHoles, 0, thick, { name: 'planet_base', color: '#38bdf8' });

    const planetIndices = [];
    for (let j = 0; j < N; j++) {
      const ang = (j / N) * TAU;
      const px = Math.cos(ang) * rOrb;
      const pz = -Math.sin(ang) * rOrb;
      // Exact meshing phase for planet j
      const selfPhase = ang * (1 + Zs / Zp) + (Zp % 2 === 0 ? PI / Zp : 0);
      const pMesh = C.clonePart(basePlanet, {
        name: `planet_${j + 1}`,
        role: 'planet',
        pivot: [px, 0, pz],
        explodeVec: [Math.cos(ang) * 10, thick * 0.7, -Math.sin(ang) * 10]
      });
      C.rotatePartY(pMesh, selfPhase);
      C.translatePart(pMesh, px, 0, pz);
      planetIndices.push(parts.length);
      parts.push(pMesh);
      circles.push({ layer: 'PITCH_CIRCLE', cx: px, cy: -pz, r: planInv.pitchRadius });
    }

    // 4. Planet Carrier Plate + Coaxial Pins
    let carrierIdx = -1;
    if (showCarrier) {
      const plateT = Math.max(3.0, thick * 0.35);
      const yPlate0 = -plateT - Math.max(0.4, fitTol + 0.25);
      const yPlate1 = yPlate0 + plateT;
      const carrierR = rOrb + pinD * 0.85;
      const carrierOuter = C.circle2D(0, 0, carrierR, 64);
      const carrierHoles = sunBore > 0.5 ? [C.circle2D(0, 0, (sunBore + 1.2) * 0.5, 28)] : [];
      const plate = C.extrudePolygon2D(carrierOuter, carrierHoles, yPlate0, yPlate1, { name: 'carrier_plate', color: '#cbd5e1' });
      const pinParts = [plate];
      for (let j = 0; j < N; j++) {
        const ang = (j / N) * TAU;
        const px = Math.cos(ang) * rOrb, pz = -Math.sin(ang) * rOrb;
        pinParts.push(C.buildPrismY(px, yPlate1 - 0.2, thick - 0.3, pz, pinD * 0.5, 24, 0, { name: `carrier_pin_${j}`, color: '#cbd5e1' }));
      }
      const carrier = C.mergeParts(pinParts, {
        name: 'planet_carrier', role: 'carrier', color: '#cbd5e1',
        pivot: [0, 0, 0], explodeVec: [0, -thick * 1.4, 0]
      });
      carrierIdx = parts.length;
      parts.push(carrier);
    }

    C.seatOnBed(parts);
    const ratio = 1 + Zr / Zs;
    return {
      parts,
      draw2D: { loops, circles },
      specs: {
        standard: 'ISO 53 Planetary Reduction',
        metrics: [
          { k: 'Ring Teeth (Zr)', v: `${Zr}T (Exact)` },
          { k: 'Reduction Ratio', v: `${round2(ratio)} : 1` },
          { k: 'Orbit Radius',    v: `${round2(rOrb)} mm` },
          { k: 'Ring Outer Ø',    v: `${round2(ringOD)} mm` },
          { k: 'Assembly Check',  v: assemblyRem === 0 ? 'PASS (Coaxial)' : 'FAIL' }
        ],
        warnings
      },
      kinematics: {
        type: 'planetary',
        sunIdx: 0,
        carrierIdx,
        planetIndices,
        Zs, Zp, Zr, rOrb
      }
    };
  }

  /* =========================================================================
     3. TRUE 3D CONICAL BEVEL GEAR (+ 90° MESHING PAIR!)
  ========================================================================= */
  function buildBevel(p, fitTol) {
    const Z1 = Math.max(10, Math.round(p.teeth || 20));
    const Z2 = Math.max(10, Math.round(p.mateTeeth || 20));
    const m = clamp(p.module || 2.0, 0.8, 6.0);
    const faceW = clamp(p.faceWidth || 10, 4, 30);
    const spiralDeg = clamp(p.spiralAngle || 0, 0, 30);
    const boreDiam = clamp(p.boreDiam || 8, 0, m * Z1 * 0.52);
    const boreType = p.boreType || 'round';
    const showPair = p.showPair !== false;
    const backlash = fitTol * 0.5;

    // Exact 90° pitch cone angles: delta1 = atan(Z1/Z2), delta2 = 90° - delta1
    const delta1 = Math.atan2(Z1, Z2);
    const delta2 = PI * 0.5 - delta1;
    const rp1 = m * Z1 * 0.5;
    const rp2 = m * Z2 * 0.5;
    // Outer cone distance R_cone = rp1 / sin(delta1) = rp2 / sin(delta2) = sqrt(rp1^2 + rp2^2)
    const Rcone = Math.hypot(rp1, rp2);
    const maxSafeFW = Rcone * 0.34;
    const fw = Math.min(faceW, maxSafeFW);
    const warnings = [];
    if (faceW > maxSafeFW + 0.2) {
      warnings.push({ severity: 'warn', en: `Face width capped at ${round2(fw)} mm (≤ 1/3 pitch cone distance ${round2(Rcone)} mm)`, fr: `Largeur de denture limitée à ${round2(fw)} mm (≤ 1/3 distance conique)` });
    }

    function makeBevelMesh(Z, delta, spiralSign, name, role, color) {
      const rp = m * Z * 0.5;
      const coneH = rp / Math.tan(delta); // Distance from back pitch circle to cone apex along gear axis!
      const axialH = fw * Math.cos(delta);
      const scaleTop = clamp((Rcone - fw) / Rcone, 0.45, 0.92);

      const inv = C.involuteGear2D({ teeth: Z, module: m, backlash, ptsPerFlank: 5 });
      const effBore = Math.min(boreDiam, inv.rootDiam * scaleTop - 2.4);
      const boreLoop = effBore > 0.5 ? C.buildBore2D({ type: boreType, diam: effBore, tol: fitTol, segs: 36 }) : null;
      const holes = boreLoop ? [boreLoop] : [];

      const twistRad = spiralDeg > 0.5 ? spiralSign * (fw * Math.tan(spiralDeg * DEG)) / rp : 0;
      const slices = spiralDeg > 0.5 ? 10 : 4;

      // Build conical frustum teeth from y = 0 (heel / outer cone) up to y = axialH (toe / inner cone)
      const conePart = C.extrudeLoft2D(inv.points, holes, 0, axialH, slices, (u) => ({
        scaleOuter: lerp(1.0, scaleTop, u),
        scaleHole: 1.0, // Keep bore strictly cylindrical!
        twist: twistRad * u,
        twistHoles: false
      }), { name: name + '_cone', color });

      // Solid mounting back hub behind heel (y = -hubH to 0) with REAL through-bore!
      const hubH = Math.max(4.0, m * 2.5);
      const hubR = Math.min(inv.rootRadius * 0.82, Math.max(effBore * 0.5 + 3.5, rp * 0.58));
      const hubPart = C.extrudePolygon2D(C.circle2D(0, 0, hubR, 44), holes, -hubH, 0.05, { name: name + '_hub', color });

      const merged = C.mergeParts([conePart, hubPart], { name, role, color });
      // Shift so cone apex sits at origin (0, 0, 0) and heel sits at y = -coneH!
      C.translatePart(merged, 0, -coneH, 0);
      return { part: merged, inv, coneH, axialH, hubH, scaleTop };
    }

    const b1 = makeBevelMesh(Z1, delta1, +1, 'bevel_gear_1', 'primary', null);
    b1.part.pivot = [0, 0, 0];
    b1.part.explodeVec = [0, -10, 0];
    const parts = [b1.part];
    let kinematics = { type: 'spin', parts: [{ idx: 0, axis: 'y', rate: 1 }] };

    if (showPair) {
      const b2 = makeBevelMesh(Z2, delta2, -1, 'bevel_gear_2', 'secondary', '#f59e0b');
      // Phase tooth into valley at contact seam (+X on Gear 1, -Y -> +X after 90° rotation on Gear 2)
      const phase = (Z2 % 2 === 0) ? (PI / Z2) : 0;
      C.rotatePartY(b2.part, phase);
      // Rotate Gear 2 by -90° around Z so its axis (+Y) points along +X and apex stays at (0,0,0)!
      // Wait: gear 1 heel is at y = -coneH1, teeth extend toward +Y (apex 0).
      // If we rotate gear 2 by +90° around Z: (0, -coneH2, 0) -> (+coneH2, 0, 0), teeth extend toward -X (apex 0)!
      // At contact line (angle delta1 from +Y toward +X): Gear 1 rim at (+rp1, -coneH1, 0),
      // Gear 2 rim after rotZ(+PI/2) is at (+coneH2, -rp2, 0). Since coneH2 = rp1 and rp2 = coneH1, THEY MEET AT (+rp1, -coneH1, 0) EXACTLY!!
      C.rotatePartZ(b2.part, PI * 0.5);
      b2.part.pivot = [0, 0, 0];
      b2.part.explodeVec = [10, 0, 0];
      parts.push(b2.part);
      kinematics = {
        type: 'bevel_pair',
        parts: [
          { idx: 0, axis: 'y', rate: 1.0 },
          { idx: 1, axis: 'x', rate: -Z1 / Z2 }
        ]
      };
    }

    C.seatOnBed(parts);
    return {
      parts,
      draw2D: {
        loops: [{ layer: 'OUTER', pts: b1.inv.points }],
        circles: [{ layer: 'PITCH_CIRCLE', cx: 0, cy: 0, r: rp1 }]
      },
      specs: {
        standard: `ISO 23509 ${spiralDeg > 0 ? 'Spiral' : 'Straight'} Bevel (90° Shaft Angle)`,
        metrics: [
          { k: 'Pitch Ø1 / Ø2', v: `${round2(rp1 * 2)} / ${round2(rp2 * 2)} mm` },
          { k: 'Cone Angle δ1', v: `${round2(delta1 / DEG)}°` },
          { k: 'Cone Angle δ2', v: `${round2(delta2 / DEG)}°` },
          { k: 'Face Width',    v: `${round2(fw)} mm` },
          { k: 'Ratio (i)',     v: `1 : ${round2(Z2 / Z1)}` }
        ],
        warnings
      },
      kinematics
    };
  }

  /* =========================================================================
     4. ISO 53 RACK & PINION (SYNCHRONIZED 20° STRAIGHT FLANKS!)
  ========================================================================= */
  function buildRack(p, fitTol) {
    const m = clamp(p.module || 2.0, 0.8, 8.0);
    const Z = Math.max(8, Math.round(p.pinionTeeth || 14));
    const rackLen = clamp(p.rackLength || 120, 40, 300);
    const thick = clamp(p.thickness || 8, 3, 40);
    const baseH = clamp(p.rackBase || 10, 4, 30);
    const boreDiam = clamp(p.boreDiam || 6, 0, m * Z * 0.55);
    const showMountHoles = p.mountHoles !== false;
    const alpha = 20 * DEG;
    const pitch = PI * m;
    const backlash = fitTol * 0.5;

    // 1. Exact ISO 20° Rack contour in 2D (X along rack, Y upward to teeth!)
    // Pitch line sits at y = 0; addendum +m, dedendum -1.25*m, solid back bar down to -(1.25*m + baseH)
    const numTeeth = Math.max(4, Math.floor(rackLen / pitch));
    const totalW = numTeeth * pitch;
    const xStart = -totalW * 0.5;
    const yBot = -(1.25 * m + baseH);
    const yRoot = -1.25 * m;
    const yTip = +1.0 * m;
    const tanA = Math.tan(alpha);
    // Tooth thickness at pitch line = pitch/2 - backlash
    const halfToothPitch = pitch * 0.25 - backlash * 0.5;
    const dxAdd = m * tanA;
    const dxDed = 1.25 * m * tanA;

    const rackPts = [[xStart, yBot], [xStart + totalW, yBot]];
    // Walk teeth right-to-left along top (+Y) so loop is CCW
    for (let k = numTeeth - 1; k >= 0; k--) {
      const cx = xStart + (k + 0.5) * pitch;
      const xRightRoot = Math.min(xStart + totalW, cx + halfToothPitch + dxDed);
      const xRightTip = cx + Math.max(0.1, halfToothPitch - dxAdd);
      const xLeftTip = cx - Math.max(0.1, halfToothPitch - dxAdd);
      const xLeftRoot = Math.max(xStart, cx - halfToothPitch - dxDed);
      rackPts.push([xRightRoot, yRoot], [xRightTip, yTip], [xLeftTip, yTip], [xLeftRoot, yRoot]);
    }
    const rackHoles = [];
    if (showMountHoles && baseH >= 6) {
      const mhR = clamp(baseH * 0.22, 1.5, 4.0) + fitTol * 0.5;
      const holeY = yBot + baseH * 0.5;
      const count = Math.max(2, Math.round(totalW / 45) + 1);
      for (let i = 0; i < count; i++) {
        const hx = lerp(xStart + 10, xStart + totalW - 10, i / (count - 1));
        rackHoles.push(C.circle2D(hx, holeY, mhR, 20));
      }
    }
    const rackPart = C.extrudePolygon2D(rackPts, rackHoles, 0, thick, {
      name: 'iso_rack', role: 'rack', color: '#64748b', pivot: [0, 0, 0], explodeVec: [0, 0, 10]
    });

    // 2. Mating ISO Involute Pinion seated ABOVE rack teeth (y2D = +rp -> z3D = -rp!)
    const pinInv = C.involuteGear2D({ teeth: Z, module: m, backlash, ptsPerFlank: 6 });
    const pinHoles = boreDiam > 0.5 ? [C.buildBore2D({ type: p.boreType || 'round', diam: boreDiam, tol: fitTol })] : [];
    const pinPart = C.extrudePolygon2D(pinInv.points, pinHoles, 0, thick, {
      name: 'iso_pinion', role: 'pinion', color: '#f97316',
      pivot: [0, 0, -pinInv.pitchRadius], explodeVec: [0, 0, -10]
    });
    // Pinion bottom contact point is at -Y2D (angle -PI/2 in 2D). Align tooth/valley cleanly with rack center!
    // At x=0: if numTeeth is odd, rack has a TOOTH at x=0 -> pinion needs VALLEY at -PI/2.
    // Pinion has tooth at angle 0, so at -PI/2 (quarter turn = Z/4 teeth):
    const toothAtBottom = ((Z * 0.25) % 1);
    const wantValley = (numTeeth % 2 === 1);
    const targetFrac = wantValley ? 0.5 : 0.0;
    const phaseFix = (targetFrac - toothAtBottom) * (TAU / Z);
    C.rotatePartY(pinPart, phaseFix);
    C.translatePart(pinPart, 0, 0, -pinInv.pitchRadius);

    const parts = [rackPart, pinPart];
    const loops = [
      { layer: 'OUTER', pts: rackPts },
      ...rackHoles.map((h) => ({ layer: 'HOLES', pts: h })),
      { layer: 'OUTER', pts: pinInv.points.map(([px, py]) => [px, py + pinInv.pitchRadius]) }
    ];

    return {
      parts,
      draw2D: { loops, circles: [{ layer: 'PITCH_CIRCLE', cx: 0, cy: pinInv.pitchRadius, r: pinInv.pitchRadius }] },
      specs: {
        standard: 'ISO 53 / DIN 867 Rack & Pinion (20° PA)',
        metrics: [
          { k: 'Linear Pitch (p)', v: `${round2(pitch)} mm` },
          { k: 'Pinion Pitch Ø',   v: `${round2(pinInv.pitchDiam)} mm` },
          { k: 'Travel / Rev',     v: `${round2(pitch * Z)} mm` },
          { k: 'Rack Length',      v: `${round2(totalW)} mm (${numTeeth}T)` }
        ],
        warnings: []
      },
      kinematics: {
        type: 'rack_pinion',
        rackIdx: 0,
        pinionIdx: 1,
        pitchRadius: pinInv.pitchRadius,
        maxStroke: Math.max(10, totalW * 0.32)
      }
    };
  }

  /* =========================================================================
     5. ISO WORM & HELICAL WORM WHEEL (SOLID CORE + EXACT AXIAL PITCH π·m!)
  ========================================================================= */
  function buildWorm(p, fitTol) {
    const m = clamp(p.module || 2.0, 1.0, 5.0);
    const Z2 = Math.max(12, Math.round(p.wheelTeeth || 24));
    const starts = clamp(Math.round(p.starts || 1), 1, 2);
    const wormLen = clamp(p.wormLength || 44, 24, 110);
    const thick = clamp(p.thickness || 12, 5, 30);
    const d1Pitch = Math.max(m * 8, 14); // Standard worm pitch diameter q*m (q ≈ 8..10)
    const d1Outer = d1Pitch + 2 * m;
    const d2Pitch = m * Z2;
    const centerDist = (d1Pitch + d2Pitch) * 0.5;
    const leadAngle = Math.atan2(starts * m, d1Pitch); // Exact lead angle gamma = atan(z1*m / d1)
    const px = PI * m; // Exact axial pitch!

    // 1. Solid-Core Helical Worm Shaft (horizontal along X axis!)
    const wormThread = C.buildExternalThreadY({
      majorDiam: d1Outer,
      pitch: px,
      starts,
      y0: -wormLen * 0.5,
      y1: wormLen * 0.5,
      profile: 'worm20',
      toothDepth: 2.2 * m,
      tol: fitTol * 0.5,
      radialSegs: 40,
      stepsPerPitch: 7,
      meta: { name: 'worm_thread', color: '#f97316' }
    });
    // Add solid bearing journal stub shafts at both ends of the worm
    const stubR = Math.max(2.5, (d1Pitch - 2.5 * m) * 0.45);
    const stubL = 8;
    const sBot = C.buildPrismY(0, -wormLen * 0.5 - stubL, -wormLen * 0.5 + 0.5, 0, stubR, 24, 0, { color: '#f97316' });
    const sTop = C.buildPrismY(0, wormLen * 0.5 - 0.5, wormLen * 0.5 + stubL, 0, stubR, 24, 0, { color: '#f97316' });
    const wormPart = C.mergeParts([wormThread, sBot, sTop], { name: 'worm_shaft', role: 'worm', color: '#f97316' });
    // Orient worm along X axis at z = -centerDist, y = thick/2
    C.rotatePartZ(wormPart, -PI * 0.5);
    C.translatePart(wormPart, 0, thick * 0.5, -centerDist);
    wormPart.pivot = [0, thick * 0.5, -centerDist];
    wormPart.explodeVec = [0, 0, -12];

    // 2. Helical Worm Wheel twisted precisely to leadAngle!
    const wheelInv = C.involuteGear2D({ teeth: Z2, module: m, backlash: fitTol * 0.5, ptsPerFlank: 5 });
    const boreDiam = clamp(p.boreDiam || 8, 0, wheelInv.rootDiam - 3);
    const wheelHoles = boreDiam > 0.5 ? [C.buildBore2D({ type: p.boreType || 'keyway', diam: boreDiam, tol: fitTol })] : [];
    const twistRad = (thick * Math.tan(leadAngle)) / wheelInv.pitchRadius;
    const wheelPart = C.extrudeLoft2D(wheelInv.points, wheelHoles, 0, thick, 10, (u) => ({
      scaleOuter: 1, scaleHole: 1, twist: twistRad * (u - 0.5), twistHoles: false
    }), { name: 'worm_wheel', role: 'wheel', color: '#94a3b8', pivot: [0, thick * 0.5, 0], explodeVec: [0, 0, 8] });

    const parts = [wheelPart, wormPart];
    C.seatOnBed(parts);

    return {
      parts,
      draw2D: {
        loops: [{ layer: 'OUTER', pts: wheelInv.points }, ...wheelHoles.map((h) => ({ layer: 'HOLES', pts: h }))],
        circles: [{ layer: 'PITCH_CIRCLE', cx: 0, cy: 0, r: wheelInv.pitchRadius }]
      },
      specs: {
        standard: 'ISO 10828 / DIN 3975 Worm Drive (20° ZA)',
        metrics: [
          { k: 'Ratio (i)',       v: `${round2(Z2 / starts)} : 1` },
          { k: 'Axial Pitch px',  v: `${round2(px)} mm` },
          { k: 'Lead Angle γ',    v: `${round2(leadAngle / DEG)}°` },
          { k: 'Center Dist (a)', v: `${round2(centerDist)} mm` },
          { k: 'Self-Locking',    v: (leadAngle / DEG) < 6.0 ? 'YES (γ < 6°)' : 'NO (Reversible)' }
        ],
        warnings: []
      },
      kinematics: {
        type: 'worm_drive',
        wheelIdx: 0,
        wormIdx: 1,
        starts,
        Z2
      }
    };
  }

  /* =========================================================================
     6. EXACT KINEMATIC GENEVA DRIVE (OPEN RADIAL SLOTS + CRESCENT LOCKING DISC!)
  ========================================================================= */
  function buildGeneva(p, fitTol) {
    const N = clamp(Math.round(p.slots || 6), 4, 8);
    const Rw = clamp(p.wheelRadius || 32, 16, 80); // Driven wheel outer radius
    const thick = clamp(p.thickness || 6, 3, 25);
    const pinR = clamp(p.pinRadius || 2.5, 1.5, 6);
    const boreD = clamp(p.boreDiam || 6, 3, 16);

    const halfBeta = PI / N;
    // EXACT Geneva Geometry:
    // Center distance C = Rw / cos(pi/N)
    // Crank pin arm radius Rc = C * sin(pi/N) = Rw * tan(pi/N)
    // Wait: classic tangent entry occurs when C^2 = Rw^2 + Rc^2 -> Rc = C * sin(pi/N), Rw_tangent = C * cos(pi/N)!
    const Cdist = Rw / Math.cos(halfBeta);
    const Rc = Cdist * Math.sin(halfBeta);
    const slotHalfW = pinR + Math.max(0.25, fitTol * 0.5 + 0.15);
    // Minimum slot bottom distance from driven wheel center = Cdist - Rc - slotClearance
    const rSlotBot = Math.max(boreD * 0.5 + 3.0, (Cdist - Rc) - pinR - 1.5);
    // Locking crescent disc radius on driver: R_lock = Cdist - Rw_hub (fits into concave dwell arcs!)
    const Rlock = clamp(Rc - pinR - 2.2, 6, Cdist - rSlotBot - 2.5);
    const lockClear = Rlock + Math.max(0.3, fitTol + 0.2);

    // 1. Driven Slotted Wheel — SINGLE CONTINUOUS WATERTIGHT CONTOUR (ZERO self-intersecting holes!)
    const wPts = [];
    const step = TAU / N;
    const slotEntryAng = Math.asin(clamp(slotHalfW / Rw, 0.03, 0.45));

    for (let k = 0; k < N; k++) {
      const cAng = k * step; // Center of slot k
      const nextAng = (k + 1) * step;

      // A. Enter slot k on left wall (cAng - slotEntryAng) from Rw down to rSlotBot
      const ux = Math.cos(cAng), uy = Math.sin(cAng);
      const nx = -uy, ny = ux; // perpendicular +CCW
      const pEntryL = [Math.cos(cAng - slotEntryAng) * Rw, Math.sin(cAng - slotEntryAng) * Rw];
      wPts.push(pEntryL);
      // Rounded semicircular bottom of slot k (centered at rSlotBot along cAng)
      const cxB = ux * rSlotBot, cyB = uy * rSlotBot;
      for (let i = 0; i <= 8; i++) {
        // Sweep from -normal (left wall) around bottom toward +normal (right wall)
        const a = cAng - PI * 0.5 - (i / 8) * PI;
        wPts.push([cxB + Math.cos(a) * slotHalfW, cyB + Math.sin(a) * slotHalfW]);
      }
      const pEntryR = [Math.cos(cAng + slotEntryAng) * Rw, Math.sin(cAng + slotEntryAng) * Rw];
      wPts.push(pEntryR);

      // B. Between slot k and slot k+1, trace outer arc with CONCAVE LOCKING CUTOUT matching driver crescent disc!
      const midAng = cAng + step * 0.5;
      // Driver center relative to driven wheel when locked is at distance Cdist along midAng
      const dCx = Math.cos(midAng) * Cdist, dCy = Math.sin(midAng) * Cdist;
      // Intersection of outer circle (Rw) with locking circle (lockClear centered at dC)
      const cosGamma = clamp((Rw * Rw + Cdist * Cdist - lockClear * lockClear) / (2 * Rw * Cdist), -0.99, 0.99);
      const gamma = Math.acos(cosGamma);
      const arcStart = cAng + slotEntryAng;
      const lockStart = Math.max(arcStart + 0.02, midAng - gamma);
      const lockEnd = Math.min(nextAng - slotEntryAng - 0.02, midAng + gamma);

      // Short outer rim before concave dwell arc
      if (lockStart > arcStart + 0.01) {
        wPts.push([Math.cos(lockStart) * Rw, Math.sin(lockStart) * Rw]);
      }
      // Concave circular dwell locking arc (radius = lockClear centered at dC)
      if (lockEnd > lockStart + 0.02) {
        const a0 = Math.atan2(Math.sin(lockStart) * Rw - dCy, Math.cos(lockStart) * Rw - dCx);
        const a1 = Math.atan2(Math.sin(lockEnd) * Rw - dCy, Math.cos(lockEnd) * Rw - dCx);
        let dA = a1 - a0;
        while (dA > PI) dA -= TAU;
        while (dA < -PI) dA += TAU;
        const arcSegs = 10;
        for (let i = 1; i <= arcSegs; i++) {
          const a = a0 + dA * (i / arcSegs);
          wPts.push([dCx + Math.cos(a) * lockClear, dCy + Math.sin(a) * lockClear]);
        }
      }
    }

    const wBore = C.buildBore2D({ type: 'round', diam: boreD, tol: fitTol, segs: 32 });
    const drivenWheel = C.extrudePolygon2D(wPts, [wBore], thick * 0.6, thick * 1.6, {
      name: 'geneva_driven_wheel', role: 'driven', color: '#38bdf8',
      pivot: [0, 0, 0], explodeVec: [-10, 4, 0]
    });

    // 2. Driver Assembly: Base Crank Disc + Drive Pin + Raised Crescent Locking Disc!
    const driverBase = C.extrudePolygon2D(C.circle2D(0, 0, Rc + pinR * 1.8, 56), [wBore], 0, thick * 0.55, { color: '#f97316' });
    const drivePin = C.buildPrismY(-Rc, thick * 0.5, thick * 1.6, 0, pinR, 24, 0, { color: '#f97316' });

    // Crescent locking disc: circular disc radius Rlock with cutout window on -X side (where drive pin engages!)
    const lockPts = [];
    const cutHalfAng = clamp(halfBeta + 0.35, 0.65, 1.35); // Open window around angle PI (-X, drive pin side)
    const segsL = 40;
    for (let i = 0; i <= segsL; i++) {
      const a = lerp(-PI + cutHalfAng, PI - cutHalfAng, i / segsL);
      lockPts.push([Math.cos(a) * Rlock, Math.sin(a) * Rlock]);
    }
    // Close crescent with gentle concave chord clearing pin & hub
    const rHubClear = Math.max(boreD * 0.5 + 1.5, Rlock * 0.45);
    lockPts.push([Math.cos(PI - cutHalfAng) * rHubClear, Math.sin(PI - cutHalfAng) * rHubClear]);
    lockPts.push([Math.cos(-PI + cutHalfAng) * rHubClear, Math.sin(-PI + cutHalfAng) * rHubClear]);
    const crescent = C.extrudePolygon2D(lockPts, [wBore], thick * 0.55, thick * 1.55, { color: '#ea580c' });

    const driverPart = C.mergeParts([driverBase, drivePin, crescent], {
      name: 'geneva_driver', role: 'driver', color: '#f97316',
      pivot: [Cdist, 0, 0], explodeVec: [10, -4, 0]
    });
    C.translatePart(driverPart, Cdist, 0, 0);

    const parts = [drivenWheel, driverPart];
    C.seatOnBed(parts);

    return {
      parts,
      draw2D: {
        loops: [
          { layer: 'OUTER', pts: wPts },
          { layer: 'HOLES', pts: wBore },
          { layer: 'OUTER', pts: lockPts.map(([px, py]) => [px + Cdist, py]) }
        ],
        circles: [
          { layer: 'PITCH_CIRCLE', cx: 0, cy: 0, r: Rw },
          { layer: 'PITCH_CIRCLE', cx: Cdist, cy: 0, r: Rc }
        ]
      },
      specs: {
        standard: `ISO Exact ${N}-Slot Geneva Indexer (w/ Crescent Lock)`,
        metrics: [
          { k: 'Center Dist (C)', v: `${round2(Cdist)} mm` },
          { k: 'Crank Radius',    v: `${round2(Rc)} mm` },
          { k: 'Lock Disc Ø',     v: `${round2(Rlock * 2)} mm` },
          { k: 'Index Step',      v: `${round2(360 / N)}° / rev` },
          { k: 'Dwell Ratio',     v: `${round2((1 - (N - 2) / (2 * N)) * 100)}% locked` }
        ],
        warnings: []
      },
      kinematics: {
        type: 'geneva',
        drivenIdx: 0,
        driverIdx: 1,
        N, Cdist, Rc
      }
    };
  }

  /* =========================================================================
     7. #28 BONUS MODULE: CAM & TRANSLATING FOLLOWER (HARMONIC / CYCLOIDAL / 3-4-5)
  ========================================================================= */
  function buildCam(p, fitTol) {
    const profile = p.motionLaw || 'cycloidal'; // harmonic | cycloidal | poly345 | double
    const rBase = clamp(p.baseRadius || 22, 12, 60);
    const lift = clamp(p.lift || 14, 4, 40);
    const thick = clamp(p.thickness || 10, 4, 30);
    const boreD = clamp(p.boreDiam || 8, 3, rBase * 0.9);
    const boreType = p.boreType || 'keyway';
    const followerType = p.followerType || 'roller'; // roller | flat
    const rollerR = clamp(p.rollerRadius || 5, 2.5, 12);

    // Rise 0..120°, Dwell-High 120..180°, Return 180..300°, Dwell-Low 300..360°
    function evalLift(deg) {
      const d = ((deg % 360) + 360) % 360;
      if (profile === 'double') {
        const s = 0.5 * (1 - Math.cos(2 * d * DEG));
        return lift * s;
      }
      let u = 0;
      if (d < 120) u = d / 120;
      else if (d < 180) u = 1;
      else if (d < 300) u = 1 - (d - 180) / 120;
      else u = 0;

      if (profile === 'harmonic') return lift * 0.5 * (1 - Math.cos(PI * u));
      if (profile === 'poly345') return lift * (10 * u ** 3 - 15 * u ** 4 + 6 * u ** 5);
      // Cycloidal (zero jerk at dwell boundaries!)
      return lift * (u - Math.sin(TAU * u) / TAU);
    }

    // Build Cam Plate in XY plane (stands upright so follower translates vertically along +Y!)
    const N = 144;
    const camPts = [];
    for (let i = 0; i < N; i++) {
      const deg = (i / N) * 360;
      const a = deg * DEG + PI * 0.5; // Angle 0 lift starts at +Y (top contact!)
      const r = rBase + evalLift(deg);
      camPts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    const boreLoop = C.buildBore2D({ type: boreType, diam: boreD, tol: fitTol, segs: 36 });
    const camBody = C.extrudePolygon2D(camPts, [boreLoop], -thick * 0.5, thick * 0.5, { color: '#f97316' });
    // Add reinforced hub collar
    const hubR = Math.min(rBase - 2.0, boreD * 0.5 + 5.0);
    const camHub = C.extrudePolygon2D(C.circle2D(0, 0, hubR, 36), [boreLoop], thick * 0.5 - 0.1, thick * 0.5 + 5.0, { color: '#ea580c' });
    const camPart = C.mergeParts([camBody, camHub], { name: 'cam_disc', role: 'cam', color: '#f97316' });
    // Rotate upright so cam rotates around Z axis and follower translates along +Y!
    C.rotatePartX(camPart, PI * 0.5);
    camPart.pivot = [0, 0, 0];
    camPart.explodeVec = [0, 0, -10];

    // 2. Follower Assembly (Roller + Yoke + Stem OR Flat Mushroom Foot + Stem)
    const folParts = [];
    const stemR = Math.max(3.0, thick * 0.32);
    const stemLen = rBase + lift + 18;
    const contactY = rBase + evalLift(0);

    if (followerType === 'roller') {
      // Roller wheel touching cam at y = contactY (roller center at contactY + rollerR)
      const roller = C.buildPrismY(0, -thick * 0.42, thick * 0.42, 0, rollerR, 32, 0, { color: '#38bdf8' });
      C.rotatePartX(roller, PI * 0.5);
      C.translatePart(roller, 0, contactY + rollerR, 0);
      const pin = C.buildPrismY(0, -thick * 0.72, thick * 0.72, 0, rollerR * 0.42, 20, 0, { color: '#cbd5e1' });
      C.rotatePartX(pin, PI * 0.5);
      C.translatePart(pin, 0, contactY + rollerR, 0);
      const yoke = C.buildBox(0, contactY + rollerR * 2.1, 0, rollerR * 2.2, rollerR * 1.4, thick * 1.45, { color: '#94a3b8' });
      const stem = C.buildPrismY(0, contactY + rollerR * 2.6, contactY + rollerR * 2.6 + stemLen * 0.65, 0, stemR, 28, 0, { color: '#94a3b8' });
      folParts.push(roller, pin, yoke, stem);
    } else {
      const foot = C.buildPrismY(0, contactY, contactY + 4.0, 0, Math.max(10, rollerR * 2.2), 36, 0, { color: '#38bdf8' });
      const stem = C.buildPrismY(0, contactY + 3.8, contactY + 3.8 + stemLen * 0.65, 0, stemR, 28, 0, { color: '#94a3b8' });
      folParts.push(foot, stem);
    }
    const followerPart = C.mergeParts(folParts, {
      name: 'cam_follower', role: 'follower', color: '#38bdf8',
      pivot: [0, 0, 0], explodeVec: [0, 14, 0]
    });

    // 3. Stationary Guide Bushing Collar around stem
    const guideY0 = rBase + lift + (followerType === 'roller' ? rollerR * 2.9 : 8);
    const guidePart = C.buildTubeY(0, guideY0, guideY0 + 16, 0, stemR + 4.5, stemR + Math.max(0.25, fitTol + 0.15), 36, {
      name: 'follower_guide', role: 'housing', color: '#64748b',
      pivot: [0, 0, 0], explodeVec: [0, 22, 0]
    });

    const parts = [camPart, followerPart, guidePart];
    C.seatOnBed(parts);

    // Max pressure angle estimate for cycloidal/harmonic
    const maxV = profile === 'cycloidal' ? (2 * lift / (120 * DEG)) : (profile === 'harmonic' ? (PI * lift / (2 * 120 * DEG)) : (1.875 * lift / (120 * DEG)));
    const maxPA = Math.atan2(maxV, rBase + lift * 0.5) / DEG;
    const warnings = [];
    if (maxPA > 30) {
      warnings.push({ severity: 'warn', en: `High pressure angle (${round2(maxPA)}° > 30°): increase Base Radius to avoid follower jamming!`, fr: `Angle de pression élevé (${round2(maxPA)}° > 30°) : augmentez le rayon de base !` });
    }

    return {
      parts,
      draw2D: {
        loops: [{ layer: 'OUTER', pts: camPts }, { layer: 'HOLES', pts: boreLoop }],
        circles: [{ layer: 'PITCH_CIRCLE', cx: 0, cy: 0, r: rBase }, { layer: 'PITCH_CIRCLE', cx: 0, cy: 0, r: rBase + lift }]
      },
      specs: {
        standard: `Machine Design Radial Cam (${profile.toUpperCase()})`,
        metrics: [
          { k: 'Base Ø / Max Ø', v: `${round2(rBase * 2)} / ${round2((rBase + lift) * 2)} mm` },
          { k: 'Total Lift (L)', v: `${round2(lift)} mm` },
          { k: 'Max Press. Ang', v: `${round2(maxPA)}°` },
          { k: 'Motion Law',     v: profile.toUpperCase() }
        ],
        warnings
      },
      kinematics: {
        type: 'cam_follower',
        camIdx: 0,
        followerIdx: 1,
        profile,
        lift
      }
    };
  }

  /* =========================================================================
     8. GATES POWERGRIP GT2 / GT3 / HTD-3M / HTD-5M TIMING PULLEY
  ========================================================================= */
  function buildPulley(p, fitTol) {
    const beltType = p.beltType || 'GT2'; // GT2 | GT3 | HTD3M | HTD5M
    const BELTS = {
      GT2:   { pitch: 2.0, pld: 0.254, grooveDepth: 0.76, grooveW: 1.38 },
      GT3:   { pitch: 3.0, pld: 0.381, grooveDepth: 1.14, grooveW: 2.02 },
      HTD3M: { pitch: 3.0, pld: 0.381, grooveDepth: 1.22, grooveW: 1.92 },
      HTD5M: { pitch: 5.0, pld: 0.571, grooveDepth: 2.06, grooveW: 3.25 }
    };
    const spec = BELTS[beltType] || BELTS.GT2;
    const Z = clamp(Math.round(p.teeth || 20), 12, 80);
    const beltW = clamp(p.beltWidth || 6.5, 4, 25);
    const boreD = clamp(p.boreDiam || 5.0, 2, 30);
    const boreType = p.boreType || 'dshaft';
    const hasFlanges = p.flanges !== false;
    const hasHub = p.hub !== false;

    const pitchD = (Z * spec.pitch) / PI;
    const outerD = pitchD - 2 * spec.pld; // Exact Gates PLD formula! (GT2 20T -> OD = 12.22 mm!)
    const rOuter = outerD * 0.5;
    const rRoot = rOuter - spec.grooveDepth;
    const grooveHalfAng = clamp((spec.grooveW * 0.5 + fitTol * 0.25) / rOuter, 0.02, PI / Z * 0.85);

    const warnings = [];
    if (boreD > rRoot * 2 - 2.0) {
      warnings.push({ severity: 'warn', en: `Bore Ø${boreD}mm is tight for ${Z}T ${beltType} pulley (root Ø${round2(rRoot * 2)}mm)`, fr: `Alésage Ø${boreD}mm serré pour poulie ${Z}T ${beltType} (fond Ø${round2(rRoot * 2)}mm)` });
    }
    const effBore = Math.min(boreD, Math.max(2, rRoot * 2 - 1.8));
    const boreLoop = C.buildBore2D({ type: boreType, diam: effBore, tol: fitTol, segs: 36 });

    // Authentic circular-arc toothed outer contour
    const pts = [];
    const step = TAU / Z;
    for (let k = 0; k < Z; k++) {
      const cAng = k * step; // Center of groove k
      const gStart = cAng - grooveHalfAng;
      const gEnd = cAng + grooveHalfAng;
      // Outer tooth land before groove
      const prevLand = cAng - step * 0.5;
      pts.push([Math.cos(prevLand) * rOuter, Math.sin(prevLand) * rOuter]);
      pts.push([Math.cos(gStart) * rOuter, Math.sin(gStart) * rOuter]);
      // Smooth circular-arc tooth groove (7 points dipping smoothly to rRoot)
      for (let i = 1; i < 7; i++) {
        const u = i / 7;
        const a = lerp(gStart, gEnd, u);
        const depth = Math.sin(u * PI) ** 1.15 * spec.grooveDepth;
        const r = rOuter - depth;
        pts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
      pts.push([Math.cos(gEnd) * rOuter, Math.sin(gEnd) * rOuter]);
    }

    const flangeT = hasFlanges ? 1.4 : 0;
    const flangeR = rOuter + Math.max(1.8, spec.pitch * 0.85);
    const hubH = hasHub ? 6.0 : 0;
    const hubR = Math.min(flangeR - 0.5, Math.max(effBore * 0.5 + 3.2, rRoot * 0.92));

    const parts = [];
    let yCur = 0;

    if (hasHub) {
      parts.push(C.extrudePolygon2D(C.circle2D(0, 0, hubR, 44), [boreLoop], yCur, yCur + hubH, { name: 'pulley_hub' }));
      yCur += hubH;
    }
    if (hasFlanges) {
      // Chamfered lower flange
      parts.push(C.extrudeLoft2D(C.circle2D(0, 0, flangeR, 56), [boreLoop], yCur, yCur + flangeT, 2, (u) => ({
        scaleOuter: u < 0.5 ? 1.0 : (rOuter + (flangeR - rOuter) * 0.85) / flangeR, scaleHole: 1
      }), { name: 'flange_bottom' }));
      yCur += flangeT;
    }
    // Exact toothed belt channel (height = beltW EXACTLY!)
    parts.push(C.extrudePolygon2D(pts, [boreLoop], yCur, yCur + beltW, { name: 'pulley_teeth' }));
    yCur += beltW;

    if (hasFlanges) {
      parts.push(C.extrudeLoft2D(C.circle2D(0, 0, flangeR, 56), [boreLoop], yCur, yCur + flangeT, 2, (u) => ({
        scaleOuter: u > 0.5 ? 1.0 : (rOuter + (flangeR - rOuter) * 0.85) / flangeR, scaleHole: 1
      }), { name: 'flange_top' }));
      yCur += flangeT;
    }

    const merged = C.mergeParts(parts, { name: `pulley_${beltType}_${Z}T`, role: 'primary' });
    return {
      parts: [merged],
      draw2D: {
        loops: [{ layer: 'OUTER', pts }, { layer: 'HOLES', pts: boreLoop }],
        circles: [{ layer: 'PITCH_CIRCLE', cx: 0, cy: 0, r: pitchD * 0.5 }]
      },
      specs: {
        standard: `Gates ${beltType} (${spec.pitch} mm Pitch · PLD ${spec.pld} mm)`,
        metrics: [
          { k: 'Pitch Ø (PD)',  v: `${round2(pitchD)} mm` },
          { k: 'Outer Ø (OD)',  v: `${round2(outerD)} mm` },
          { k: 'Belt Channel',  v: `${round2(beltW)} mm` },
          { k: 'Total Height',  v: `${round2(yCur)} mm` }
        ],
        warnings
      },
      kinematics: { type: 'spin', parts: [{ idx: 0, axis: 'y', rate: 1 }] }
    };
  }

  /* =========================================================================
     9. ISO 606 / ANSI B29.1 ROLLER CHAIN SPROCKET
  ========================================================================= */
  function buildSprocket(p, fitTol) {
    const chainStd = p.chainStd || 'ANSI35';
    const CHAINS = {
      ANSI25: { name: 'ANSI #25',  P: 6.35,  Dr: 3.30, T: 2.8 },
      ANSI35: { name: 'ANSI #35',  P: 9.525, Dr: 5.08, T: 4.3 },
      ANSI40: { name: 'ANSI #40',  P: 12.70, Dr: 7.92, T: 7.2 },
      ISO06B: { name: 'ISO 06B-1', P: 9.525, Dr: 6.35, T: 5.3 },
      ISO08B: { name: 'ISO 08B-1', P: 12.70, Dr: 8.51, T: 7.2 },
      BIKE:   { name: 'Bicycle 1/2"', P: 12.70, Dr: 7.75, T: 2.2 }
    };
    const ch = CHAINS[chainStd] || CHAINS.ANSI35;
    const Z = clamp(Math.round(p.teeth || 18), 9, 60);
    const P = p.pitchOverride > 0 ? p.pitchOverride : ch.P;
    const Dr = p.rollerOverride > 0 ? p.rollerOverride : ch.Dr;
    const thick = clamp(p.thickness || ch.T, 1.8, 25);
    const boreD = clamp(p.boreDiam || 12, 0, 80);
    const boreType = p.boreType || 'keyway';
    const spokes = Math.round(p.spokes || 0);

    // Exact ANSI B29.1 / ISO 606 formulas:
    const PD = P / Math.sin(PI / Z);
    const rp = PD * 0.5;
    const Rs = 0.505 * Dr + fitTol * 0.25; // Roller seating pocket radius!
    const rootD = PD - Dr;
    const od = P * (0.6 + 1 / Math.tan(PI / Z)); // Exact standard sprocket outer diameter!
    const rOuter = od * 0.5;

    // Build exact circular roller seating pockets + smooth tooth flanks
    const pts = [];
    const step = TAU / Z;
    for (let k = 0; k < Z; k++) {
      const cAng = k * step; // Center of roller pocket k on pitch circle!
      const rx = Math.cos(cAng) * rp, ry = Math.sin(cAng) * rp;
      // Roller pocket arc: sweeps inward around (rx, ry) with radius Rs
      // Entry angle relative to roller center = cAng - PI/2 -> bottom cAng + PI -> exit cAng + PI/2
      const pocketSpan = PI * 0.72;
      for (let i = 0; i <= 8; i++) {
        const a = (cAng + PI - pocketSpan * 0.5) + (i / 8) * pocketSpan;
        pts.push([rx + Math.cos(a) * Rs, ry + Math.sin(a) * Rs]);
      }
      // Smooth tooth tip between roller k and roller k+1
      const tipAng = cAng + step * 0.5;
      const tipHalf = Math.min(step * 0.14, 0.08);
      pts.push([Math.cos(tipAng - tipHalf) * rOuter, Math.sin(tipAng - tipHalf) * rOuter]);
      pts.push([Math.cos(tipAng) * rOuter, Math.sin(tipAng) * rOuter]);
      pts.push([Math.cos(tipAng + tipHalf) * rOuter, Math.sin(tipAng + tipHalf) * rOuter]);
    }

    const effBore = Math.min(boreD, rootD - 6);
    const holes = [];
    if (effBore > 0.5) holes.push(C.buildBore2D({ type: boreType, diam: effBore, tol: fitTol, segs: 36 }));
    if (spokes >= 3) {
      const sp = buildSpokeHoles(spokes, effBore * 0.5 + 5, rootD * 0.5 - 5);
      sp.forEach((h) => holes.push(h));
    }

    const part = C.extrudePolygon2D(pts, holes, 0, thick, { name: `sprocket_${chainStd}_${Z}T`, role: 'primary' });
    return {
      parts: [part],
      draw2D: {
        loops: [{ layer: 'OUTER', pts }, ...holes.map((h) => ({ layer: 'HOLES', pts: h }))],
        circles: [{ layer: 'PITCH_CIRCLE', cx: 0, cy: 0, r: rp }]
      },
      specs: {
        standard: `ISO 606 / ${ch.name} (P=${P} mm · Dr=${Dr} mm)`,
        metrics: [
          { k: 'Pitch Ø (PD)',  v: `${round2(PD)} mm` },
          { k: 'Outer Ø (OD)',  v: `${round2(od)} mm` },
          { k: 'Root Ø (Df)',   v: `${round2(rootD)} mm` },
          { k: 'Seat Radius',   v: `${round2(Rs)} mm` },
          { k: 'Plate Thick',   v: `${round2(thick)} mm` }
        ],
        warnings: []
      },
      kinematics: { type: 'spin', parts: [{ idx: 0, axis: 'y', rate: 1 }] }
    };
  }

  /* =========================================================================
     10. WATERTIGHT FLANGED SMOOTH IDLER PULLEY (CLOSED LATHE!)
  ========================================================================= */
  function buildIdler(p, fitTol) {
    const od = clamp(p.od || 18, 10, 60);
    const boreD = clamp(p.boreDiam || 5, 3, od - 4);
    const beltW = clamp(p.beltWidth || 7.0, 3, 25);
    const flangeOD = clamp(p.flangeOD || (od + 5), od + 1, od + 20);
    const flangeT = clamp(p.flangeThick || 1.5, 0.8, 5);
    const crowned = !!p.crowned;
    const crownH = crowned ? 0.6 : 0;

    const rBore = (boreD + fitTol) * 0.5;
    const rBody = od * 0.5;
    const rFlange = flangeOD * 0.5;
    const totalH = beltW + flangeT * 2;
    const y0 = 0, y1 = flangeT, y2 = flangeT + beltW, y3 = totalH;

    // 100% CLOSED ANNULAR LATHE PROFILE (ZERO open paper ends!)
    const profile = [
      [rBore, y0],
      [rFlange - 0.4, y0],
      [rFlange, y0 + 0.4],
      [rFlange, y1 - 0.3],
      [rBody, y1],
      ...(crowned ? [[rBody + crownH * 0.7, lerp(y1, y2, 0.25)], [rBody + crownH, lerp(y1, y2, 0.5)], [rBody + crownH * 0.7, lerp(y1, y2, 0.75)]] : []),
      [rBody, y2],
      [rFlange, y2 + 0.3],
      [rFlange, y3 - 0.4],
      [rFlange - 0.4, y3],
      [rBore, y3]
    ];

    const part = C.buildClosedLatheY(profile, 56, { name: 'smooth_idler', role: 'primary' });
    return {
      parts: [part],
      draw2D: {
        loops: [
          { layer: 'OUTER', pts: C.circle2D(0, 0, rFlange, 56) },
          { layer: 'HOLES', pts: C.circle2D(0, 0, rBore, 40) }
        ],
        circles: [{ layer: 'PITCH_CIRCLE', cx: 0, cy: 0, r: rBody }]
      },
      specs: {
        standard: `Closed-Lathe Belt Idler (${crowned ? 'Crowned' : 'Flat'})`,
        metrics: [
          { k: 'Belt Surface Ø', v: `${round2(od)} mm` },
          { k: 'Flange Ø',       v: `${round2(flangeOD)} mm` },
          { k: 'Belt Channel',   v: `${round2(beltW)} mm` },
          { k: 'Total Width',    v: `${round2(totalH)} mm` }
        ],
        warnings: []
      },
      kinematics: { type: 'spin', parts: [{ idx: 0, axis: 'y', rate: 1.5 }] }
    };
  }

  return {
    gear: buildGear,
    planetary: buildPlanetary,
    bevel: buildBevel,
    rack: buildRack,
    worm: buildWorm,
    geneva: buildGeneva,
    cam: buildCam,
    pulley: buildPulley,
    sprocket: buildSprocket,
    idler: buildIdler
  };
}));
