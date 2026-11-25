/**
 * Mech Gen Pro — Fasteners, Helical Threads & Structural CNC Hardware Engine (8 ISO/DIN/NEMA Modules)
 * Modules: screw, leadscrew, standoff, collar, connect, tslot, nema, bracket.
 * Runs in Browser (window.MechHardware) & Node.js test harness.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./mech-core.js'));
  } else {
    root.MechHardware = factory(root.MechCore);
  }
}(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';

  const { PI, TAU, DEG, clamp, lerp, round2 } = C;

  /* =========================================================================
     11. ISO 68-1 / DIN 13 METRIC BOLT & NUT (REAL 60° HELICAL THREADS!)
  ========================================================================= */
  const ISO_METRIC = {
    M3:  { d: 3,  p: 0.50, s: 5.5,  kHex: 2.0,  dCap: 5.5,  kCap: 3.0,  allen: 2.5, mNut: 2.4 },
    M4:  { d: 4,  p: 0.70, s: 7.0,  kHex: 2.8,  dCap: 7.0,  kCap: 4.0,  allen: 3.0, mNut: 3.2 },
    M5:  { d: 5,  p: 0.80, s: 8.0,  kHex: 3.5,  dCap: 8.5,  kCap: 5.0,  allen: 4.0, mNut: 4.7 },
    M6:  { d: 6,  p: 1.00, s: 10.0, kHex: 4.0,  dCap: 10.0, kCap: 6.0,  allen: 5.0, mNut: 5.2 },
    M8:  { d: 8,  p: 1.25, s: 13.0, kHex: 5.3,  dCap: 13.0, kCap: 8.0,  allen: 6.0, mNut: 6.8 },
    M10: { d: 10, p: 1.50, s: 16.0, kHex: 6.4,  dCap: 16.0, kCap: 10.0, allen: 8.0, mNut: 8.4 },
    M12: { d: 12, p: 1.75, s: 18.0, kHex: 7.5,  dCap: 18.0, kCap: 12.0, allen: 10.0,mNut: 10.8 },
    M16: { d: 16, p: 2.00, s: 24.0, kHex: 10.0, dCap: 24.0, kCap: 16.0, allen: 14.0,mNut: 14.8 }
  };

  function buildScrew(p, fitTol) {
    const std = ISO_METRIC[p.size] || ISO_METRIC.M8;
    const d = p.customDiam > 0 ? clamp(p.customDiam, 3, 24) : std.d;
    const pitch = p.customPitch > 0 ? clamp(p.customPitch, 0.5, 3.0) : std.p;
    const headType = p.headType || 'hex'; // hex | socket | countersunk
    const partMode = p.partMode || 'assembly'; // assembly | bolt | nut
    const shaftLen = clamp(p.length || 30, 8, 120);
    const threadLen = clamp(p.threadLength || Math.min(shaftLen, Math.max(shaftLen * 0.72, d * 2.5)), 4, shaftLen);
    const sHex = std.s; // Exact ISO 4017 across-flats wrench size!
    const nutH = std.mNut;
    const threadTol = Math.max(fitTol, 0);

    const parts = [];
    const loops = [];

    if (partMode === 'bolt' || partMode === 'assembly') {
      const boltSubs = [];
      let headH = std.kHex;

      if (headType === 'hex') {
        headH = std.kHex;
        // Exact ISO 4017 Hex Head: flat-to-flat EXACTLY sHex!
        const hexOuter = C.hex2D(sHex, 0, 0, PI / 6);
        boltSubs.push(C.extrudePolygon2D(hexOuter, [], 0, headH, { name: 'bolt_hex_head' }));
        loops.push({ layer: 'OUTER', pts: hexOuter });
      } else if (headType === 'socket') {
        // DIN 912 Socket Head Cap Screw with REAL internal hexagonal Allen recess!
        headH = std.kCap;
        const rCap = std.dCap * 0.5;
        const recDepth = headH * 0.55;
        const capOuter = C.circle2D(0, 0, rCap, 40);
        const allenHole = C.hex2D(std.allen + fitTol * 0.5, 0, 0, PI / 6);
        // Bottom solid base of socket cap + upper recessed wall!
        boltSubs.push(C.extrudePolygon2D(capOuter, [], 0, headH - recDepth + 0.05, { name: 'cap_solid' }));
        boltSubs.push(C.extrudePolygon2D(capOuter, [allenHole], headH - recDepth, headH, { name: 'cap_recess' }));
        loops.push({ layer: 'OUTER', pts: capOuter }, { layer: 'HOLES', pts: allenHole });
      } else {
        // DIN 7991 90° Countersunk Flat Head with real Allen recess!
        const rTop = d * 1.0;
        const rBot = d * 0.5;
        headH = rTop - rBot + 0.6;
        const recDepth = headH * 0.55;
        const capOuter = C.circle2D(0, 0, rTop, 40);
        const allenHole = C.hex2D(std.allen + fitTol * 0.5, 0, 0, PI / 6);
        // Tapered cone: y = 0 (head top, wide) -> y = headH (shaft junction, narrow)
        boltSubs.push(C.extrudeLoft2D(capOuter, [allenHole], 0, recDepth, 3, (u) => ({
          scaleOuter: lerp(1.0, lerp(1.0, rBot / rTop, recDepth / headH), u), scaleHole: 1
        }), { name: 'csk_top' }));
        boltSubs.push(C.extrudeLoft2D(C.circle2D(0, 0, lerp(rTop, rBot, recDepth / headH), 40), [], recDepth - 0.05, headH, 3, (u) => ({
          scaleOuter: lerp(1.0, rBot / lerp(rTop, rBot, recDepth / headH), u), scaleHole: 1
        }), { name: 'csk_bot' }));
        loops.push({ layer: 'OUTER', pts: capOuter }, { layer: 'HOLES', pts: allenHole });
      }

      // Smooth unthreaded shank (if threadLen < shaftLen)
      const smoothLen = shaftLen - threadLen;
      let yCur = headH;
      if (smoothLen > 0.5) {
        boltSubs.push(C.buildPrismY(0, yCur - 0.1, yCur + smoothLen + 0.1, 0, (d - threadTol * 0.5) * 0.5, 36, 0, { name: 'bolt_shank' }));
        yCur += smoothLen;
      }

      // TRUE ISO 68-1 60° HELICAL EXTERNAL THREAD!
      boltSubs.push(C.buildExternalThreadY({
        majorDiam: d,
        pitch,
        starts: 1,
        y0: yCur - 0.15,
        y1: headH + shaftLen,
        profile: 'iso60',
        tol: threadTol * 0.5,
        radialSegs: 42,
        stepsPerPitch: 6,
        meta: { name: 'bolt_thread' }
      }));

      const bolt = C.mergeParts(boltSubs, {
        name: `iso_bolt_${p.size || 'M8'}`, role: 'bolt', color: null,
        pivot: [0, 0, 0], explodeVec: [0, -10, 0]
      });
      parts.push(bolt);
    }

    if (partMode === 'nut' || partMode === 'assembly') {
      // TRUE ISO 4032 INTERNALLY THREADED HEX NUT!
      const nutY0 = partMode === 'assembly' ? (std.kHex + Math.max(shaftLen * 0.45, shaftLen - nutH - 4)) : 0;
      const nut = C.buildInternalThreadRingY({
        majorDiam: d,
        pitch,
        starts: 1,
        y0: nutY0,
        y1: nutY0 + nutH,
        profile: 'iso60',
        tol: threadTol,
        radialSegs: 48, // Multiple of 6 -> sharp crisp ISO hex vertices!
        stepsPerPitch: 6,
        outerRadiusFn: (theta) => C.polygonRadiusAtAngle(theta, sHex, 6, 0),
        meta: {
          name: `iso_nut_${p.size || 'M8'}`, role: 'nut',
          color: partMode === 'assembly' ? '#f59e0b' : null,
          pivot: [0, nutY0 + nutH * 0.5, 0],
          explodeVec: [0, partMode === 'assembly' ? 18 : 0, 0]
        }
      });
      parts.push(nut);
      if (loops.length === 0) loops.push({ layer: 'OUTER', pts: C.hex2D(sHex, 0, 0, PI / 6) });
    }

    C.seatOnBed(parts);
    const minorD = d - 1.22687 * pitch;
    return {
      parts,
      draw2D: { loops, circles: [{ layer: 'PITCH_CIRCLE', cx: 0, cy: 0, r: d * 0.5 }] },
      specs: {
        standard: `ISO 68-1 / ${headType === 'hex' ? 'ISO 4017' : (headType === 'socket' ? 'DIN 912' : 'DIN 7991')} (${p.size || 'M8'}×${pitch})`,
        metrics: [
          { k: 'Major Ø (d)',     v: `${round2(d)} mm` },
          { k: 'Pitch (P)',       v: `${round2(pitch)} mm` },
          { k: 'Minor Ø (d3)',    v: `${round2(minorD)} mm` },
          { k: 'Wrench Flats s',  v: `${round2(sHex)} mm` },
          { k: 'Thread Profile',  v: 'ISO 60° Helical' }
        ],
        warnings: []
      },
      kinematics: partMode === 'assembly'
        ? { type: 'screw_nut', nutIdx: 1, pitch, travel: Math.min(12, threadLen * 0.4) }
        : { type: 'spin', parts: [{ idx: 0, axis: 'y', rate: 1 }] }
    };
  }

  /* =========================================================================
     12. ISO 2901 / DIN 103 30° TRAPEZOIDAL LEAD SCREW & FLANGED NUT
  ========================================================================= */
  function buildLeadScrew(p, fitTol) {
    const d = clamp(p.diam || 8, 6, 20);
    const pitch = clamp(p.pitch || 2.0, 1.5, 5.0);
    const starts = clamp(Math.round(p.starts || 4), 1, 4);
    const lead = pitch * starts;
    const len = clamp(p.length || 70, 25, 220);
    const partMode = p.partMode || 'assembly'; // assembly | screw | nut
    const flangeStyle = p.flangeStyle || 't8_flat'; // round | t8_flat
    const flangeOD = clamp(p.flangeOD || Math.max(22, d * 2.75), d + 10, 48);
    const nutH = clamp(p.nutHeight || 15, 8, 30);
    const flangeT = 3.6;

    const parts = [];
    const loops = [];

    if (partMode === 'screw' || partMode === 'assembly') {
      const rod = C.buildExternalThreadY({
        majorDiam: d,
        pitch,
        starts,
        y0: 0,
        y1: len,
        profile: 'tr30',
        tol: fitTol * 0.5,
        radialSegs: 42,
        stepsPerPitch: 6,
        meta: {
          name: `leadscrew_Tr${d}x${lead}`, role: 'screw', color: null,
          pivot: [0, len * 0.5, 0], explodeVec: [0, -10, 0]
        }
      });
      parts.push(rod);
    }

    if (partMode === 'nut' || partMode === 'assembly') {
      const nutY0 = partMode === 'assembly' ? (len * 0.45) : 0;
      const bodyR = d * 0.5 + 2.2;
      const fR = flangeOD * 0.5;
      const pcdR = (bodyR + fR) * 0.52;
      const mountHoleR = (3.5 + fitTol) * 0.5; // Standard M3.5 clearance holes!

      // 1. Internally threaded cylindrical sleeve (ISO 2901 30° trapezoidal internal threads!)
      const coreNut = C.buildInternalThreadRingY({
        majorDiam: d,
        pitch,
        starts,
        y0: nutY0,
        y1: nutY0 + nutH,
        profile: 'tr30',
        tol: Math.max(fitTol, 0.05),
        radialSegs: 48,
        stepsPerPitch: 6,
        outerRadiusFn: () => bodyR,
        meta: { name: 'tr_nut_core', color: '#d4a238' }
      });

      // 2. Flange plate with 4 REAL perpendicular mounting holes (ZERO fake black cylinders!)
      let flangeOuter;
      if (flangeStyle === 't8_flat') {
        // Classic T8 anti-collision flange clipped flat at ±0.76*fR along Y2D
        const clipY = fR * 0.76;
        const aClip = Math.asin(clamp(clipY / fR, 0.2, 0.98));
        flangeOuter = [];
        for (let i = 0; i <= 16; i++) {
          const a = lerp(-aClip, aClip, i / 16);
          flangeOuter.push([Math.cos(a) * fR, Math.sin(a) * fR]);
        }
        for (let i = 0; i <= 16; i++) {
          const a = lerp(PI - aClip, PI + aClip, i / 16);
          flangeOuter.push([Math.cos(a) * fR, Math.sin(a) * fR]);
        }
      } else {
        flangeOuter = C.circle2D(0, 0, fR, 48);
      }

      const fHoles = [C.circle2D(0, 0, bodyR - 0.15, 36)];
      const boltAngles = [PI * 0.25, PI * 0.75, PI * 1.25, PI * 1.75];
      for (let i = 0; i < 4; i++) {
        const a = boltAngles[i];
        fHoles.push(C.circle2D(Math.cos(a) * pcdR, Math.sin(a) * pcdR, mountHoleR, 20));
      }
      const flangePart = C.extrudePolygon2D(flangeOuter, fHoles, nutY0, nutY0 + flangeT, { name: 'tr_nut_flange', color: '#d4a238' });

      const nutMerged = C.mergeParts([coreNut, flangePart], {
        name: `tr_nut_Tr${d}x${lead}`, role: 'nut', color: '#d4a238',
        pivot: [0, nutY0 + nutH * 0.5, 0], explodeVec: [0, partMode === 'assembly' ? 16 : 0, 0]
      });
      parts.push(nutMerged);
      loops.push({ layer: 'OUTER', pts: flangeOuter });
      fHoles.forEach((h) => loops.push({ layer: 'HOLES', pts: h }));
    }

    C.seatOnBed(parts);
    return {
      parts,
      draw2D: { loops, circles: [{ layer: 'PITCH_CIRCLE', cx: 0, cy: 0, r: d * 0.5 }] },
      specs: {
        standard: `ISO 2901 / DIN 103 30° Trapezoidal (Tr${d}×${lead})`,
        metrics: [
          { k: 'Nominal Ø',     v: `${round2(d)} mm` },
          { k: 'Pitch / Starts',v: `${round2(pitch)} mm × ${starts}S` },
          { k: 'Lead / Rev',    v: `${round2(lead)} mm/rev` },
          { k: 'Flange Ø',      v: `${round2(flangeOD)} mm (4×M3.5)` }
        ],
        warnings: []
      },
      kinematics: partMode === 'assembly'
        ? { type: 'screw_nut', nutIdx: 1, pitch: lead, travel: Math.min(20, len * 0.35) }
        : { type: 'spin', parts: [{ idx: 0, axis: 'y', rate: 1 }] }
    };
  }

  /* =========================================================================
     13. ISO HEX / ROUND / KNURLED STANDOFF & SPACER
  ========================================================================= */
  function buildStandoff(p, fitTol) {
    const shapeType = p.shapeType || 'hex'; // hex | round | knurled
    const od = clamp(p.od || 7.0, 4.5, 25); // For hex = EXACT across-flats s!
    const boreD = clamp(p.boreDiam || 3.2, 1.5, od - 1.6);
    const len = clamp(p.length || 20, 3, 100);
    const threaded = !!p.threaded;
    const pitch = clamp(p.pitch || (boreD <= 3.5 ? 0.5 : (boreD <= 4.5 ? 0.7 : 0.8)), 0.5, 1.5);

    let part;
    let outerLoop;
    if (shapeType === 'hex') {
      outerLoop = C.hex2D(od, 0, 0, PI / 6);
    } else if (shapeType === 'knurled') {
      const teeth = Math.max(16, Math.round(od * 2.5));
      const rMax = od * 0.5, rMin = rMax - 0.45;
      outerLoop = [];
      for (let i = 0; i < teeth * 2; i++) {
        const a = (i / (teeth * 2)) * TAU;
        const r = (i % 2 === 0) ? rMax : rMin;
        outerLoop.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
    } else {
      outerLoop = C.circle2D(0, 0, od * 0.5, 48);
    }

    const boreLoop = C.circle2D(0, 0, (boreD + fitTol) * 0.5, 32);

    if (threaded) {
      part = C.buildInternalThreadRingY({
        majorDiam: boreD,
        pitch,
        starts: 1,
        y0: 0,
        y1: len,
        profile: 'iso60',
        tol: fitTol,
        radialSegs: shapeType === 'hex' ? 48 : 48,
        stepsPerPitch: 5,
        outerRadiusFn: (theta) => {
          if (shapeType === 'hex') return C.polygonRadiusAtAngle(theta, od, 6, 0);
          if (shapeType === 'knurled') return od * 0.5 - (Math.sin(theta * 24) * 0.22 + 0.22);
          return od * 0.5;
        },
        meta: { name: `standoff_${shapeType}_${len}mm` }
      });
    } else {
      part = C.extrudePolygon2D(outerLoop, [boreLoop], 0, len, { name: `standoff_${shapeType}_${len}mm` });
    }

    const wall = (od - boreD) * 0.5;
    const warnings = [];
    if (wall < 1.0) warnings.push({ severity: 'warn', en: `Thin wall (${round2(wall)} mm < 1.0 mm)`, fr: `Paroi fine (${round2(wall)} mm < 1.0 mm)` });

    return {
      parts: [part],
      draw2D: { loops: [{ layer: 'OUTER', pts: outerLoop }, { layer: 'HOLES', pts: boreLoop }], circles: [] },
      specs: {
        standard: `ISO Spacer / Standoff (${shapeType.toUpperCase()}${threaded ? ' Threaded' : ''})`,
        metrics: [
          { k: shapeType === 'hex' ? 'Wrench Flats s' : 'Outer Ø', v: `${round2(od)} mm` },
          { k: 'Inner Bore', v: `${round2(boreD + fitTol)} mm` },
          { k: 'Length (L)', v: `${round2(len)} mm` },
          { k: 'Min Wall',   v: `${round2(wall)} mm` }
        ],
        warnings
      },
      kinematics: { type: 'spin', parts: [{ idx: 0, axis: 'y', rate: 1 }] }
    };
  }

  /* =========================================================================
     14. CLAMPING SPLIT / SET-SCREW SHAFT COLLAR (ZERO INVALID HOLES!)
  ========================================================================= */
  function buildCollar(p, fitTol) {
    const type = p.collarType || 'split'; // split | setscrew
    const boreD = clamp(p.boreDiam || 10, 4, 40);
    const od = clamp(p.od || Math.max(boreD + 12, boreD * 2.1), boreD + 6, 80);
    const width = clamp(p.width || 10, 5, 30);
    const screwD = clamp(p.screwDiam || 3.2, 2.5, 6.5);

    const rIn = (boreD + fitTol) * 0.5;
    const rOut = od * 0.5;
    const parts = [];
    const loops = [];

    if (type === 'split') {
      // Single continuous valid C-ring contour with real clamping slit gap (slitGap = 1.6 mm) + twin bolt clamping ears!
      const slitGap = clamp(1.6 + fitTol, 1.2, 3.0);
      const halfGap = slitGap * 0.5;
      const earLen = Math.max(screwD * 2.2, 7.5);
      const earThick = Math.max(4.5, (rOut - rIn) * 0.85);

      const aOut = Math.asin(clamp(halfGap / rOut, 0.03, 0.4));
      const aIn = Math.asin(clamp(halfGap / rIn, 0.05, 0.6));
      const segs = 44;
      const cPts = [];
      // Outer C arc from +aOut around to 2π - aOut
      for (let i = 0; i <= segs; i++) {
        const a = lerp(aOut, TAU - aOut, i / segs);
        cPts.push([Math.cos(a) * rOut, Math.sin(a) * rOut]);
      }
      // Inner C arc backward from 2π - aIn back to +aIn (forms single continuous watertight C-ring!)
      for (let i = segs; i >= 0; i--) {
        const a = lerp(aIn, TAU - aIn, i / segs);
        cPts.push([Math.cos(a) * rIn, Math.sin(a) * rIn]);
      }
      const cRing = C.extrudePolygon2D(cPts, [], 0, width, { name: 'collar_c_ring' });

      // Twin Clamping Ear Lugs sticking out +X on either side of slit, each with a REAL transverse bolt hole!
      const earX0 = rOut * Math.cos(aOut) - 1.5;
      const earX1 = rOut + earLen;
      const boltX = (rOut + earX1) * 0.52;
      const boltY = width * 0.5;
      // Build each ear in XY plane (X along lug, Y along collar width) extruded across Z (ear thickness)!
      const ear2D = C.roundedRect2D((earX0 + earX1) * 0.5, boltY, earX1 - earX0, width, 1.4, 4);
      const earHole = C.circle2D(boltX, boltY, (screwD + fitTol) * 0.5, 22);
      const earTop = C.extrudePolygon2D(ear2D, [earHole], 0, earThick, { name: 'ear_1' });
      // extrudePolygon2D maps 2D (x, y) -> (x, extruded_y, -y); rotate X +PI/2 maps extruded Y -> +Z and -y -> +Y!
      C.rotatePartX(earTop, PI * 0.5);
      C.translatePart(earTop, 0, 0, halfGap); // sits at z ∈ [halfGap, halfGap + earThick]

      const earBot = C.clonePart(earTop, { name: 'ear_2' });
      C.translatePart(earBot, 0, 0, -(earThick + slitGap)); // sits at z ∈ [-(halfGap + earThick), -halfGap]

      parts.push(C.mergeParts([cRing, earTop, earBot], { name: 'split_clamp_collar' }));
      loops.push({ layer: 'OUTER', pts: cPts });
    } else {
      // Set-screw collar: solid collar + flat machined boss + radial set screw recess
      const outer = C.circle2D(0, 0, rOut, 48);
      const bore = C.circle2D(0, 0, rIn, 36);
      const ring = C.extrudePolygon2D(outer, [bore], 0, width, { name: 'setscrew_collar' });
      // Add realistic hex socket grub screw seated radially inside boss
      const bossH = Math.max(2.5, (rOut - rIn) * 0.35);
      const boss = C.extrudePolygon2D(C.circle2D(0, 0, screwD * 1.15, 28), [C.hex2D(screwD * 0.65, 0, 0, PI / 6)], 0, bossH, { color: '#475569' });
      C.rotatePartZ(boss, -PI * 0.5);
      C.translatePart(boss, rOut - 0.8, width * 0.5, 0);
      parts.push(C.mergeParts([ring, boss], { name: 'setscrew_collar' }));
      loops.push({ layer: 'OUTER', pts: outer }, { layer: 'HOLES', pts: bore });
    }

    return {
      parts,
      draw2D: { loops, circles: [{ layer: 'PITCH_CIRCLE', cx: 0, cy: 0, r: rIn }] },
      specs: {
        standard: `DIN 705 ${type === 'split' ? 'Split Clamp' : 'Set-Screw'} Shaft Collar`,
        metrics: [
          { k: 'Shaft Bore Ø', v: `${round2(boreD + fitTol)} mm` },
          { k: 'Outer Ø',      v: `${round2(od)} mm` },
          { k: 'Width',        v: `${round2(width)} mm` },
          { k: 'Clamp Screw',  v: `Ø${round2(screwD)} mm` }
        ],
        warnings: []
      },
      kinematics: { type: 'spin', parts: [{ idx: 0, axis: 'y', rate: 1 }] }
    };
  }

  /* =========================================================================
     15. MATING MECHANICAL CONNECTORS (BOTH MALE + FEMALE WITH EXACT TOLERANCE!)
  ========================================================================= */
  function buildConnect(p, fitTol) {
    const connType = p.connType || 'dovetail'; // dovetail | snap | bayonet
    const width = clamp(p.width || 24, 12, 60);
    const thick = clamp(p.thickness || 10, 4, 30);
    const len = clamp(p.length || 32, 16, 80);
    const tol = Math.max(0.10, (p.clearance != null ? p.clearance : 0.20) + fitTol);
    const mode = p.pairMode || 'pair'; // pair | assembled | male | female

    const parts = [];
    const loops = [];
    const gapView = mode === 'pair' ? Math.max(8, len * 0.35) : 0;

    if (connType === 'dovetail') {
      // Exact 60° Dovetail Male & Female mating blocks!
      const neckW = width * 0.36;
      const headW = width * 0.56;
      const depthD = clamp(len * 0.38, 6, 22);
      const baseL = len * 0.55;
      const hw = width * 0.5;

      // Male (extends +X from -baseL to +depthD)
      const malePts = [
        [-baseL, -hw], [0, -hw],
        [0, -neckW * 0.5], [depthD, -headW * 0.5],
        [depthD, headW * 0.5], [0, neckW * 0.5],
        [0, hw], [-baseL, hw]
      ];
      // Female (recess widened by +tol on every mating edge!)
      const fNeck = neckW + tol * 2;
      const fHead = headW + tol * 2;
      const fDepth = depthD + tol;
      const femPts = [
        [0, -hw], [baseL + fDepth, -hw],
        [baseL + fDepth, hw], [0, hw],
        [0, fNeck * 0.5], [fDepth, fHead * 0.5],
        [fDepth, -fHead * 0.5], [0, -fNeck * 0.5]
      ];

      if (mode !== 'female') {
        const mPart = C.extrudePolygon2D(malePts, [], 0, thick, {
          name: 'dovetail_male', role: 'male', color: '#f97316',
          explodeVec: [-10, 0, 0]
        });
        if (gapView) C.translatePart(mPart, -gapView * 0.5, 0, 0);
        parts.push(mPart);
        loops.push({ layer: 'OUTER', pts: malePts.map(([x, y]) => [x - gapView * 0.5, y]) });
      }
      if (mode !== 'male') {
        const fPart = C.extrudePolygon2D(femPts, [], 0, thick, {
          name: 'dovetail_female', role: 'female', color: '#38bdf8',
          explodeVec: [10, 0, 0]
        });
        if (gapView) C.translatePart(fPart, gapView * 0.5, 0, 0);
        parts.push(fPart);
        loops.push({ layer: 'OUTER', pts: femPts.map(([x, y]) => [x + gapView * 0.5, y]) });
      }
    } else if (connType === 'snap') {
      // Twin-arm Cantilever Snap-Fit Buckle (Male Prongs + Female Receiver Socket!)
      const hw = width * 0.5;
      const armT = clamp(width * 0.12, 2.0, 4.5);
      const hookH = clamp(width * 0.09, 1.5, 3.2);
      const prongL = len * 0.58;
      const baseL = len * 0.42;
      const outerY = hw * 0.72;
      const innerY = outerY - armT;

      const malePts = [
        [-baseL, -hw], [0, -hw],
        [0, -outerY], [prongL - 4, -outerY], [prongL - 4, -outerY - hookH], [prongL, -innerY],
        [prongL, -innerY + 0.2], [0, -innerY],
        [0, innerY], [prongL, innerY - 0.2],
        [prongL, innerY], [prongL - 4, outerY + hookH], [prongL - 4, outerY], [0, outerY],
        [0, hw], [-baseL, hw]
      ];
      // Female socket with side latch windows & exact +tol clearance!
      const cOuter = outerY + tol;
      const wallY = hw;
      const sockL = prongL + 4;
      const femPts = [
        [0, -wallY], [sockL + baseL * 0.6, -wallY], [sockL + baseL * 0.6, wallY], [0, wallY],
        [0, cOuter], [prongL - 4.2, cOuter], [prongL - 4.2, cOuter + hookH + tol], [prongL + 1.5, cOuter + hookH + tol],
        [prongL + 1.5, -cOuter - hookH - tol], [prongL - 4.2, -cOuter - hookH - tol], [prongL - 4.2, -cOuter], [0, -cOuter]
      ];

      if (mode !== 'female') {
        const mPart = C.extrudePolygon2D(malePts, [], 0, thick, { name: 'snap_male', role: 'male', color: '#f97316', explodeVec: [-12, 0, 0] });
        if (gapView) C.translatePart(mPart, -gapView * 0.5, 0, 0);
        parts.push(mPart);
        loops.push({ layer: 'OUTER', pts: malePts });
      }
      if (mode !== 'male') {
        const fPart = C.extrudePolygon2D(femPts, [], 0, thick, { name: 'snap_female', role: 'female', color: '#38bdf8', explodeVec: [12, 0, 0] });
        if (gapView) C.translatePart(fPart, gapView * 0.5, 0, 0);
        parts.push(fPart);
        loops.push({ layer: 'OUTER', pts: femPts });
      }
    } else {
      // Bayonet Twist-Lock Coupling (Cylindrical Male Pin Hub + Female Slotted Collar!)
      const rOuter = width * 0.5;
      const rCore = rOuter * 0.62;
      const pinR = clamp(rOuter * 0.14, 1.8, 4.0);
      const hBay = len * 0.65;
      if (mode !== 'female') {
        const base = C.buildPrismY(0, 0, 6, 0, rOuter, 40, 0, { color: '#f97316' });
        const shaft = C.buildPrismY(0, 5.8, hBay, 0, rCore - tol * 0.5, 36, 0, { color: '#f97316' });
        const pin = C.buildPrismY(0, -(rCore + pinR * 1.4), rCore + pinR * 1.4, 0, pinR, 20, 0, { color: '#ea580c' });
        C.rotatePartZ(pin, PI * 0.5);
        C.translatePart(pin, 0, hBay - pinR * 2.2, 0);
        const mPart = C.mergeParts([base, shaft, pin], { name: 'bayonet_male', role: 'male', color: '#f97316', explodeVec: [0, -10, 0] });
        if (gapView) C.translatePart(mPart, -rOuter - 4, 0, 0);
        parts.push(mPart);
      }
      if (mode !== 'male') {
        const sleeve = C.buildTubeY(0, 0, hBay, 0, rOuter, rCore + tol * 0.5, 44, { name: 'bayonet_female', role: 'female', color: '#38bdf8', explodeVec: [0, 14, 0] });
        if (gapView) C.translatePart(sleeve, rOuter + 4, 0, 0);
        else C.translatePart(sleeve, 0, 6.2, 0);
        parts.push(sleeve);
      }
    }

    return {
      parts,
      draw2D: { loops, circles: [] },
      specs: {
        standard: `Mating ${connType.toUpperCase()} Connector Pair`,
        metrics: [
          { k: 'Mating Clearance', v: `${round2(tol)} mm` },
          { k: 'Width × Thick',    v: `${round2(width)} × ${round2(thick)} mm` },
          { k: 'Mode',             v: mode.toUpperCase() }
        ],
        warnings: []
      },
      kinematics: { type: 'explode_cycle', parts: parts.map((_, idx) => idx) }
    };
  }

  /* =========================================================================
     16. AUTHENTIC 2020 / 2040 / 3030 / 4040 V-SLOT & T-SLOT EXTRUSION
  ========================================================================= */
  function buildTSlot(p, fitTol) {
    const stdKey = p.profile || '2020V';
    const PROFILES = {
      '2020V': { nx: 1, ny: 1, u: 20, vSlot: true,  slotOpen: 6.2, slotInnerW: 11.0, slotDepth: 6.1, lipT: 1.8, bore: 4.2, cornerR: 1.5, label: '2020 OpenBuilds V-Slot' },
      '2020T': { nx: 1, ny: 1, u: 20, vSlot: false, slotOpen: 6.0, slotInnerW: 11.0, slotDepth: 6.0, lipT: 1.8, bore: 4.2, cornerR: 1.5, label: '2020 Bosch T-Slot' },
      '2040V': { nx: 2, ny: 1, u: 20, vSlot: true,  slotOpen: 6.2, slotInnerW: 11.0, slotDepth: 6.1, lipT: 1.8, bore: 4.2, cornerR: 1.5, label: '2040 OpenBuilds V-Slot' },
      '3030T': { nx: 1, ny: 1, u: 30, vSlot: false, slotOpen: 8.2, slotInnerW: 16.0, slotDepth: 9.0, lipT: 2.6, bore: 6.8, cornerR: 2.0, label: '3030 Industrial T-Slot' },
      '4040T': { nx: 1, ny: 1, u: 40, vSlot: false, slotOpen: 8.2, slotInnerW: 19.5, slotDepth: 11.5,lipT: 3.2, bore: 6.8, cornerR: 2.5, label: '4040 Heavy T-Slot' }
    };
    const pr = PROFILES[stdKey] || PROFILES['2020V'];
    const len = clamp(p.length || 100, 15, 500);
    const W = pr.nx * pr.u;
    const H = pr.ny * pr.u;
    const hw = W * 0.5, hh = H * 0.5;
    const vChamf = pr.vSlot ? 1.5 : 0.0;

    // Helper: trace a single T-slot/V-slot pocket inward along local normal (nx, ny) centered at (cx, cy) with tangent (tx, ty)
    function pushSlot(pts, cx, cy, tx, ty, inX, inY) {
      const ho = pr.slotOpen * 0.5;
      const hi = pr.slotInnerW * 0.5;
      const lt = pr.lipT;
      const sd = pr.slotDepth;
      const pt = (along, depth) => [cx + tx * along + inX * depth, cy + ty * along + inY * depth];

      if (vChamf > 0) {
        // 45° V-wheel chamfer on entry lips!
        pts.push(pt(-(ho + vChamf), 0));
        pts.push(pt(-ho, vChamf));
      } else {
        pts.push(pt(-ho, 0));
      }
      pts.push(pt(-ho, lt));
      pts.push(pt(-hi, lt + 1.1));
      pts.push(pt(-hi, sd));
      pts.push(pt(+hi, sd));
      pts.push(pt(+hi, lt + 1.1));
      pts.push(pt(+ho, lt));
      if (vChamf > 0) {
        pts.push(pt(+ho, vChamf));
        pts.push(pt(+(ho + vChamf), 0));
      } else {
        pts.push(pt(+ho, 0));
      }
    }

    // Trace SINGLE CONTINUOUS WATERTIGHT CCW OUTER CONTOUR (ZERO invalid self-intersecting holes!)
    const pts = [];
    const cr = pr.cornerR;
    // Bottom edge (-hh): left to right (+X tangent, +Y inward)
    pts.push([-hw + cr, -hh]);
    for (let i = 0; i < pr.nx; i++) {
      const cx = -hw + (i + 0.5) * pr.u;
      pushSlot(pts, cx, -hh, 1, 0, 0, 1);
    }
    pts.push([hw - cr, -hh]);
    // Bottom-right corner bevel
    pts.push([hw, -hh + cr]);
    // Right edge (+hw): bottom to top (+Y tangent, -X inward)
    for (let j = 0; j < pr.ny; j++) {
      const cy = -hh + (j + 0.5) * pr.u;
      pushSlot(pts, hw, cy, 0, 1, -1, 0);
    }
    pts.push([hw, hh - cr]);
    // Top-right corner
    pts.push([hw - cr, hh]);
    // Top edge (+hh): right to left (-X tangent, -Y inward)
    for (let i = pr.nx - 1; i >= 0; i--) {
      const cx = -hw + (i + 0.5) * pr.u;
      pushSlot(pts, cx, hh, -1, 0, 0, -1);
    }
    pts.push([-hw + cr, hh]);
    // Top-left corner
    pts.push([-hw, hh - cr]);
    // Left edge (-hw): top to bottom (-Y tangent, +X inward)
    for (let j = pr.ny - 1; j >= 0; j--) {
      const cy = -hh + (j + 0.5) * pr.u;
      pushSlot(pts, -hw, cy, 0, -1, 1, 0);
    }
    pts.push([-hw, -hh + cr]);

    // Center M5/M8 tap bores (one per unit cell!)
    const holes = [];
    for (let i = 0; i < pr.nx; i++) {
      for (let j = 0; j < pr.ny; j++) {
        const cx = -hw + (i + 0.5) * pr.u;
        const cy = -hh + (j + 0.5) * pr.u;
        holes.push(C.circle2D(cx, cy, (pr.bore + fitTol) * 0.5, 28));
      }
    }

    const part = C.extrudePolygon2D(pts, holes, 0, len, { name: `extrusion_${stdKey}_${len}mm` });
    // Lay horizontally along X so long extrusions sit naturally on the print bed!
    C.rotatePartZ(part, -PI * 0.5);
    C.translatePart(part, -len * 0.5, 0, 0);
    C.seatOnBed([part]);

    return {
      parts: [part],
      draw2D: { loops: [{ layer: 'OUTER', pts }, ...holes.map((h) => ({ layer: 'HOLES', pts: h }))], circles: [] },
      specs: {
        standard: `${pr.label} Extrusion`,
        metrics: [
          { k: 'Section W × H', v: `${W}.00 × ${H}.00 mm` },
          { k: 'Slot Throat',   v: `${round2(pr.slotOpen)} mm` },
          { k: 'Center Tap Ø',  v: `Ø${round2(pr.bore)} mm (${pr.bore < 5 ? 'M5' : 'M8'})` },
          { k: 'Length (L)',    v: `${round2(len)} mm` }
        ],
        warnings: []
      },
      kinematics: { type: 'spin', parts: [{ idx: 0, axis: 'y', rate: 0.6 }] }
    };
  }

  /* =========================================================================
     17. STANDARD NEMA 11 / 14 / 17 / 23 STEPPER MOTOR MOUNT
  ========================================================================= */
  function buildNema(p, fitTol) {
    const NEMA = {
      11: { size: 28.2, pilot: 22.0, pitch: 23.00, bolt: 2.8, baseBolt: 3.4, label: 'NEMA 11' },
      14: { size: 35.2, pilot: 22.0, pitch: 26.00, bolt: 3.4, baseBolt: 4.4, label: 'NEMA 14' },
      17: { size: 42.3, pilot: 22.2, pitch: 31.00, bolt: 3.4, baseBolt: 4.4, label: 'NEMA 17' },
      23: { size: 57.2, pilot: 38.1, pitch: 47.14, bolt: 5.4, baseBolt: 5.5, label: 'NEMA 23' }
    };
    const spec = NEMA[p.nemaSize] || NEMA[17];
    const wallT = clamp(p.thickness || 5.0, 3.0, 12.0);
    const baseDepth = clamp(p.baseDepth || Math.max(36, spec.size * 0.95), 24, 90);
    const slotted = p.slotted !== false;
    const gussets = p.gussets !== false;
    const slotTravel = slotted ? clamp(p.slotTravel || 6.0, 3, 14) : 0;

    const W = spec.size + (slotted ? slotTravel : 0) + 2.0;
    const H = spec.size + wallT + 2.0;
    const cxFace = 0;
    const cyFace = wallT + spec.size * 0.5 + 1.0;

    // 1. Vertical Motor Faceplate (XY plane, extruded along Z in [0, wallT])
    const faceOuter = C.roundedRect2D(cxFace, cyFace, W, H, 3.0, 5);
    const faceHoles = [];
    // Pilot bore (obround horizontal slot if tensioner enabled, else exact NEMA pilot circle!)
    const pilotD = spec.pilot + fitTol;
    if (slotted && slotTravel > 1) {
      faceHoles.push(C.slot2D(-slotTravel * 0.5, cyFace, slotTravel * 0.5, cyFace, pilotD, 14));
    } else {
      faceHoles.push(C.circle2D(0, cyFace, pilotD * 0.5, 40));
    }
    // 4 NEMA mounting bolts (horizontal linear tensioning slots if slotted — NOT diagonal!)
    const hp = spec.pitch * 0.5;
    const bD = spec.bolt + fitTol;
    const corners = [[-hp, -hp], [hp, -hp], [hp, hp], [-hp, hp]];
    for (let i = 0; i < 4; i++) {
      const bx = corners[i][0], by = cyFace + corners[i][1];
      if (slotted && slotTravel > 1) {
        faceHoles.push(C.slot2D(bx - slotTravel * 0.5, by, bx + slotTravel * 0.5, by, bD, 10));
      } else {
        faceHoles.push(C.circle2D(bx, by, bD * 0.5, 22));
      }
    }

    const facePart = C.extrudePolygon2D(faceOuter, faceHoles, 0, wallT, { name: 'nema_faceplate' });
    // Map XY faceplate vertical: extrudePolygon2D maps (x, y2D) -> (x, y_extrude, -y2D).
    // Rotate X by +PI/2 -> (x, y2D, y_extrude)! Now plate stands upright with height along +Y and thickness z ∈ [0, wallT]!
    C.rotatePartX(facePart, PI * 0.5);

    // 2. Horizontal Base Flange (XZ plane, y ∈ [0, wallT], z ∈ [wallT - 0.1, baseDepth]) with REAL vertical slots!
    const baseOuter = C.roundedRect2D(0, -(baseDepth * 0.5), W, baseDepth, 3.0, 5);
    const baseHoles = [];
    const bhD = spec.baseBolt + fitTol;
    const bRowZ = -(wallT + (baseDepth - wallT) * 0.52);
    const bSpanX = Math.max(10, W * 0.5 - wallT - 7.5);
    const slotLen = Math.min(12, (baseDepth - wallT) * 0.35);
    baseHoles.push(C.slot2D(-bSpanX, bRowZ - slotLen * 0.5, -bSpanX, bRowZ + slotLen * 0.5, bhD, 10));
    baseHoles.push(C.slot2D(+bSpanX, bRowZ - slotLen * 0.5, +bSpanX, bRowZ + slotLen * 0.5, bhD, 10));

    const basePart = C.extrudePolygon2D(baseOuter, baseHoles, 0, wallT, { name: 'nema_base' });

    const subParts = [facePart, basePart];

    // 3. Flush-aligned Twin Triangular Reinforcement Gusset Ribs!
    if (gussets) {
      const gH = Math.min(spec.size * 0.88, H - wallT - 3);
      const gD = Math.min(baseDepth - wallT - 2, gH * 0.85);
      // Triangle in (z, y) plane: (wallT-0.1, wallT-0.1) -> (wallT + gD, wallT-0.1) -> (wallT-0.1, wallT + gH)
      const gusPts = [[wallT - 0.1, wallT - 0.1], [wallT + gD, wallT - 0.1], [wallT - 0.1, wallT + gH]];
      const gLeft = C.extrudePolygon2D(gusPts, [], 0, wallT, { name: 'gusset_L' });
      // extrudePolygon2D maps (x2d, y2d) -> (x2d, extrudeY, -y2d).
      // We want x2d -> +Z, y2d -> +Y, extrudeY -> +X:
      // rotateX(+PI/2) -> (x2d, y2d, extrudeY); then rotateY(-PI/2) -> (extrudeY, y2d, -x2d)? Wait:
      // Let's trace exact rotation:
      // Start: (zVal, tVal, -yVal). rotateZ(+PI/2) -> (-tVal, zVal, -yVal).
      // Better: transform directly cleanly!
      C.transformPart(gLeft, (px, py, pz) => [-W * 0.5 + py, -pz, px]);
      const gRight = C.clonePart(gLeft, { name: 'gusset_R' });
      C.translatePart(gRight, W - wallT, 0, 0);
      subParts.push(gLeft, gRight);
    }

    const merged = C.mergeParts(subParts, { name: `nema_${p.nemaSize || 17}_mount` });
    C.seatOnBed([merged]);

    return {
      parts: [merged],
      draw2D: {
        loops: [{ layer: 'OUTER', pts: faceOuter }, ...faceHoles.map((h) => ({ layer: 'HOLES', pts: h }))],
        circles: [{ layer: 'PITCH_CIRCLE', cx: 0, cy: cyFace, r: spec.pilot * 0.5 }]
      },
      specs: {
        standard: `${spec.label} Stepper Motor Bracket (${slotted ? 'Linear Tensioner' : 'Fixed'})`,
        metrics: [
          { k: 'Pilot Bore Ø',  v: `${round2(spec.pilot)} mm` },
          { k: 'Bolt Pitch',    v: `${round2(spec.pitch)} × ${round2(spec.pitch)} mm` },
          { k: 'Face Width',    v: `${round2(W)} mm` },
          { k: 'Wall Thick',    v: `${round2(wallT)} mm` }
        ],
        warnings: []
      },
      kinematics: { type: 'spin', parts: [{ idx: 0, axis: 'y', rate: 0.7 }] }
    };
  }

  /* =========================================================================
     18. GUSSETED STRUCTURAL BRACKET (L / U / T / 2020 CORNER — REAL PERPENDICULAR HOLES!)
  ========================================================================= */
  function buildBracket(p, fitTol) {
    const type = p.bracketType || 'L'; // L | U | corner2020 | T
    const W = clamp(p.width || 40, 16, 150);
    const H = clamp(p.height || 40, 16, 150);
    const D = clamp(p.depth || 28, 12, 120);
    const T = clamp(p.thickness || 5.0, 2.5, 16);
    const holeD = clamp(p.holeDiam || 5.3, 0, Math.min(W, D) * 0.45);
    const holesPerFace = clamp(Math.round(p.holesPerFace || 2), 0, 4);
    const gussets = p.gussets !== false;

    const effH = holeD > 0.5 ? (holeD + fitTol) : 0;
    const subParts = [];
    const drawLoops = [];

    function makeFaceHoles(spanX, spanY, cx, cy, count) {
      if (effH <= 0.5 || count <= 0) return [];
      const r = effH * 0.5;
      const list = [];
      if (count === 1) {
        list.push(C.circle2D(cx, cy, r, 24));
      } else if (count === 2) {
        const dx = Math.min(spanX * 0.28, Math.max(r * 2.2, spanX * 0.25));
        list.push(C.circle2D(cx - dx, cy, r, 24), C.circle2D(cx + dx, cy, r, 24));
      } else {
        const dx = spanX * 0.26, dy = spanY * 0.26;
        list.push(
          C.circle2D(cx - dx, cy - dy, r, 22), C.circle2D(cx + dx, cy - dy, r, 22),
          C.circle2D(cx + dx, cy + dy, r, 22), C.circle2D(cx - dx, cy + dy, r, 22)
        );
      }
      return list;
    }

    if (type === 'L' || type === 'corner2020') {
      const bW = type === 'corner2020' ? 28 : W;
      const bH = type === 'corner2020' ? 28 : H;
      const bD = type === 'corner2020' ? 18 : D;
      const hCnt = type === 'corner2020' ? 1 : holesPerFace;

      // 1. Horizontal Base Flange (XZ plane, x ∈ [0, bW], z ∈ [-bD/2, bD/2], y ∈ [0, T])
      const baseOuter = C.roundedRect2D(bW * 0.5, 0, bW, bD, 2.0, 4);
      const baseHoles = makeFaceHoles(bD - T, bW - T, T + (bW - T) * 0.5, 0, hCnt === 2 ? 1 : hCnt);
      // Place holes evenly along Z (depth) on the flat horizontal leg!
      const bHolesClean = [];
      if (effH > 0.5 && hCnt > 0) {
        const hx = T + (bW - T) * 0.55;
        if (hCnt === 1) bHolesClean.push(C.circle2D(hx, 0, effH * 0.5, 24));
        else if (hCnt === 2) bHolesClean.push(C.circle2D(hx, -bD * 0.26, effH * 0.5, 24), C.circle2D(hx, bD * 0.26, effH * 0.5, 24));
        else {
          const x1 = T + (bW - T) * 0.34, x2 = T + (bW - T) * 0.74;
          bHolesClean.push(
            C.circle2D(x1, -bD * 0.25, effH * 0.5, 22), C.circle2D(x1, bD * 0.25, effH * 0.5, 22),
            C.circle2D(x2, -bD * 0.25, effH * 0.5, 22), C.circle2D(x2, bD * 0.25, effH * 0.5, 22)
          );
        }
      }
      subParts.push(C.extrudePolygon2D(baseOuter, bHolesClean, 0, T, { name: 'bracket_base' }));
      drawLoops.push({ layer: 'OUTER', pts: baseOuter }, ...bHolesClean.map((h) => ({ layer: 'HOLES', pts: h })));

      // 2. Vertical Leg (YZ plane, x ∈ [0, T], y ∈ [0, bH], z ∈ [-bD/2, bD/2]) with REAL horizontal perpendicular holes!
      const vertOuter = C.roundedRect2D(bH * 0.5, 0, bH, bD, 2.0, 4);
      const vHoles = [];
      if (effH > 0.5 && hCnt > 0) {
        const hy = T + (bH - T) * 0.55;
        if (hCnt === 1) vHoles.push(C.circle2D(hy, 0, effH * 0.5, 24));
        else if (hCnt === 2) vHoles.push(C.circle2D(hy, -bD * 0.26, effH * 0.5, 24), C.circle2D(hy, bD * 0.26, effH * 0.5, 24));
        else {
          const y1 = T + (bH - T) * 0.34, y2 = T + (bH - T) * 0.74;
          vHoles.push(
            C.circle2D(y1, -bD * 0.25, effH * 0.5, 22), C.circle2D(y1, bD * 0.25, effH * 0.5, 22),
            C.circle2D(y2, -bD * 0.25, effH * 0.5, 22), C.circle2D(y2, bD * 0.25, effH * 0.5, 22)
          );
        }
      }
      const vertPart = C.extrudePolygon2D(vertOuter, vHoles, 0, T, { name: 'bracket_vertical' });
      // Map (x2d->+Y, extrudeY->+X, z->z):
      C.transformPart(vertPart, (px, py, pz) => [py, px, pz]);
      subParts.push(vertPart);

      // 3. Twin Triangular Side Reinforcement Gussets!
      if (gussets) {
        const gW = Math.max(6, bW - T - 2);
        const gH = Math.max(6, bH - T - 2);
        const gT = Math.min(T, 4.0);
        const gPts = [[T - 0.1, T - 0.1], [T + gW, T - 0.1], [T - 0.1, T + gH]];
        const g1 = C.extrudePolygon2D(gPts, [], 0, gT, { name: 'gusset_1' });
        C.transformPart(g1, (px, py, pz) => [px, -pz, -bD * 0.5 + py]);
        const g2 = C.clonePart(g1, { name: 'gusset_2' });
        C.translatePart(g2, 0, 0, bD - gT);
        subParts.push(g1, g2);
      }
    } else if (type === 'U') {
      // U-Channel Structural Bracket: Flat Base + Left & Right Vertical Walls, ALL with real perpendicular holes!
      const baseOuter = C.roundedRect2D(0, 0, W, D, 2.0, 4);
      const bHoles = makeFaceHoles(W - T * 2 - 4, D - 4, 0, 0, Math.min(holesPerFace, 2));
      subParts.push(C.extrudePolygon2D(baseOuter, bHoles, 0, T, { name: 'u_base' }));
      drawLoops.push({ layer: 'OUTER', pts: baseOuter }, ...bHoles.map((h) => ({ layer: 'HOLES', pts: h })));

      const wallOuter = C.roundedRect2D(H * 0.5, 0, H, D, 2.0, 4);
      const wHoles = effH > 0.5 && holesPerFace > 0 ? [C.circle2D(T + (H - T) * 0.55, 0, effH * 0.5, 24)] : [];
      const wallL = C.extrudePolygon2D(wallOuter, wHoles, 0, T, { name: 'u_wall_L' });
      C.transformPart(wallL, (px, py, pz) => [-W * 0.5 + py, px, pz]);
      const wallR = C.clonePart(wallL, { name: 'u_wall_R' });
      C.translatePart(wallR, W - T, 0, 0);
      subParts.push(wallL, wallR);
    } else {
      // Heavy Flat T-Joining Plate (e.g., 2020/4040 T-plate with 5 M5 mounting holes!)
      const armW = Math.min(D, W * 0.45);
      const tPts = [
        [-W * 0.5, 0], [W * 0.5, 0], [W * 0.5, armW],
        [armW * 0.5, armW], [armW * 0.5, H],
        [-armW * 0.5, H], [-armW * 0.5, armW], [-W * 0.5, armW]
      ];
      const tHoles = [];
      if (effH > 0.5) {
        const r = effH * 0.5;
        tHoles.push(
          C.circle2D(0, armW * 0.5, r, 22),
          C.circle2D(-W * 0.34, armW * 0.5, r, 22),
          C.circle2D(+W * 0.34, armW * 0.5, r, 22),
          C.circle2D(0, armW + (H - armW) * 0.35, r, 22),
          C.circle2D(0, armW + (H - armW) * 0.78, r, 22)
        );
      }
      subParts.push(C.extrudePolygon2D(tPts, tHoles, 0, T, { name: 't_joining_plate' }));
      drawLoops.push({ layer: 'OUTER', pts: tPts }, ...tHoles.map((h) => ({ layer: 'HOLES', pts: h })));
    }

    const merged = C.mergeParts(subParts, { name: `bracket_${type}` });
    const b = C.getPartsBounds([merged]);
    C.translatePart(merged, -(b.minX + b.maxX) * 0.5, -b.minY, -(b.minZ + b.maxZ) * 0.5);

    return {
      parts: [merged],
      draw2D: { loops: drawLoops, circles: [] },
      specs: {
        standard: `Structural ${type.toUpperCase()} Bracket (Real Perpendicular Bores)`,
        metrics: [
          { k: 'Envelope W×H×D', v: `${round2(b.sx)} × ${round2(b.sy)} × ${round2(b.sz)} mm` },
          { k: 'Wall Thick',     v: `${round2(T)} mm` },
          { k: 'Mount Holes',    v: effH > 0.5 ? `Ø${round2(effH)} mm (${holesPerFace}/face)` : 'None' }
        ],
        warnings: []
      },
      kinematics: { type: 'spin', parts: [{ idx: 0, axis: 'y', rate: 0.7 }] }
    };
  }

  return {
    screw: buildScrew,
    leadscrew: buildLeadScrew,
    standoff: buildStandoff,
    collar: buildCollar,
    connect: buildConnect,
    tslot: buildTSlot,
    nema: buildNema,
    bracket: buildBracket
  };
}));
