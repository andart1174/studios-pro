/**
 * Mech Gen Pro — 28-Module ISO/DIN Mechanical CAD Application Controller
 * Includes: 5 Engineering Families, 1-Click ISO/DIN/ANSI Presets, Global Fit Class & Material Mass,
 * Live Cutaway Slicer, Exact Kinematics, Exploded View, 25-Step Undo/Redo, .spmech Save/Load,
 * 1:1 mm STL/OBJ/GLB/DXF/SVG/HTML Spec Sheet Exports & Studios-Pro Host Bridges.
 */
(function () {
  'use strict';

  const C = window.MechCore;
  const ENGINES = Object.assign({}, window.MechGears, window.MechHardware, window.MechMotion);
  if (!C || !ENGINES.gear) {
    console.error('[MechGenPro] Core CAD engines missing');
    return;
  }
  const $ = (id) => document.getElementById(id);

  /* =========================================================================
     1. CATALOG OF ALL 28 REAL MECHANICAL MODULES (5 ENGINEERING FAMILIES)
  ========================================================================= */
  const CATALOG = [
    // Family 1: Transmissions & Gears (7 incl. #28 Cam & Follower!)
    { id: 'gear',      fam: 'gears',      ico: '⚙️', en: 'Spur / Helical Gear',     fr: 'Engrenage Droit / Hélicoïdal', tagEn: 'ISO 53 Involute · Twin Mesh',      tagFr: 'Évolvente ISO 53 · Paire' },
    { id: 'planetary', fam: 'gears',      ico: '🪐', en: 'Planetary Gearbox',       fr: 'Réducteur Planétaire',         tagEn: 'Carrier + Internal Ring · Coaxial',tagFr: 'Porte-Satellites + Couronne' },
    { id: 'bevel',     fam: 'gears',      ico: '🔺', en: 'Conical Bevel Gear',      fr: 'Engrenage Conique 90°',        tagEn: 'True 3D Cone · Straight / Spiral', tagFr: 'Cône 3D Réel · Paire 90°' },
    { id: 'rack',      fam: 'gears',      ico: '📏', en: 'Rack & Pinion',           fr: 'Crémaillère & Pignon',         tagEn: 'ISO 20° Linear Drive · Holes',     tagFr: 'Flancs 20° · Synchronisé' },
    { id: 'worm',      fam: 'gears',      ico: '🌀', en: 'Worm & Worm Wheel',       fr: 'Vis Sans Fin & Roue',          tagEn: 'Solid Core ZA · Helical Wheel',    tagFr: 'Vis Pleine · Roue Hélicoïdale' },
    { id: 'geneva',    fam: 'gears',      ico: '⏱️', en: 'Geneva Indexer Drive',    fr: 'Croix de Malte (Genève)',      tagEn: 'Crescent Lock Disc · Exact Dwell', tagFr: 'Disque Blocage · Cinématique' },
    { id: 'cam',       fam: 'gears',      ico: '📈', en: 'Cam & Follower (#28)',    fr: 'Came & Poussoir (#28)',        tagEn: 'Cycloidal / Harmonic / 3-4-5',     tagFr: 'Cycloïdal / Harmonique / 3-4-5' },

    // Family 2: Flexible Drives — Belts & Chains (3)
    { id: 'pulley',    fam: 'belts',      ico: '🔄', en: 'GT2 / HTD Timing Pulley', fr: 'Poulie Crantée GT2 / HTD',     tagEn: 'Gates PLD · Flanges · D-Shaft',    tagFr: 'Profil Gates · Joues · Arbre D' },
    { id: 'sprocket',  fam: 'belts',      ico: '⛓️', en: 'Roller Chain Sprocket',   fr: 'Pignon Chaîne à Rouleaux',     tagEn: 'ISO 606 · ANSI #25/#35/#40',       tagFr: 'ISO 606 · ANSI #25/#35/#40' },
    { id: 'idler',     fam: 'belts',      ico: '⭕', en: 'Flanged Smooth Idler',    fr: 'Galet Lisse à Flasques',       tagEn: 'Closed Lathe · Crowned Option',    tagFr: 'Tournage Étanche · Bombé' },

    // Family 3: Fasteners, Threads & Connectors (5)
    { id: 'screw',     fam: 'fasteners',  ico: '🔩', en: 'ISO Metric Bolt & Nut',   fr: 'Vis & Écrou Métrique ISO',     tagEn: 'Real 60° Thread · M3–M16',         tagFr: 'Filetage 60° Réel · M3–M16' },
    { id: 'leadscrew', fam: 'fasteners',  ico: '🪜', en: 'Trapezoidal Lead Screw',  fr: 'Vis Trapézoïdale Tr 30°',      tagEn: 'DIN 103 · Tr8×8 4-Start + Nut',    tagFr: 'DIN 103 · Tr8×8 + Écrou Bride' },
    { id: 'standoff',  fam: 'fasteners',  ico: '⬡',  en: 'Hex / Knurled Standoff',  fr: 'Entretoise Hexa / Moletée',    tagEn: 'Exact Wrench Flats s · Thread',    tagFr: 'Cote Clé Exacte s · Taraudée' },
    { id: 'collar',    fam: 'fasteners',  ico: '💍', en: 'Clamping Shaft Collar',   fr: 'Bague d’Arrêt Fendue',         tagEn: 'DIN 705 Split Clamp / Set-Screw',  tagFr: 'DIN 705 Fendue / Vis Pression' },
    { id: 'connect',   fam: 'fasteners',  ico: '🧩', en: 'Mating Connectors (M+F)', fr: 'Connecteurs Mâle + Femelle',   tagEn: 'Dovetail · Snap-Fit · Bayonet',    tagFr: 'Queue d’Aronde · Clip · Baïonnette' },

    // Family 4: Bearings, Joints & Motion Couplings (7)
    { id: 'bearing',   fam: 'motion',     ico: '🎯', en: 'Deep-Groove Ball Bearing',fr: 'Roulement à Billes ISO',       tagEn: 'Concave Raceways · 608 / 6000',    tagFr: 'Gorges Concaves · 608 / 6000' },
    { id: 'linbear',   fam: 'motion',     ico: '🔋', en: 'Linear Bearing LMUU',     fr: 'Douille Linéaire LMUU',        tagEn: 'LM8UU/10/12 · Circlip Grooves',    tagFr: 'LM8UU/10/12 · Gorges Circlips' },
    { id: 'pillow',    fam: 'motion',     ico: '🏛️', en: 'Pillow Block Bearing',    fr: 'Palier Applique (KP/UCP)',     tagEn: 'Vertical Slotted Feet + Seat',     tagFr: 'Fixation Verticale + Roulement' },
    { id: 'coupler',   fam: 'motion',     ico: '🔗', en: 'CNC Shaft Coupler',       fr: 'Accouplement d’Arbre CNC',     tagEn: 'Jaw Spider · Helical Flex · Clamp',tagFr: 'Étoile · Hélicoïdal · Rigide' },
    { id: 'cardan',    fam: 'motion',     ico: '🔀', en: 'Universal Joint (Cardan)',fr: 'Joint de Cardan Articulé',     tagEn: 'DIN 808 · Real Spider · 0°–35°',   tagFr: 'DIN 808 · Croisillon · 0°–35°' },
    { id: 'balljoint', fam: 'motion',     ico: '🔮', en: 'Spherical Ball Joint',    fr: 'Rotule / Embout à Rotule',     tagEn: 'ISO 12240 Captive Socket + Rod',   tagFr: 'ISO 12240 Sphère Captive + Tige' },
    { id: 'hinge',     fam: 'motion',     ico: '🚪', en: 'Print-in-Place Hinge',    fr: 'Charnière Print-in-Place',     tagEn: '45° Captive Cones · Screw Holes',  tagFr: 'Cônes 45° · Trous de Fixation' },

    // Family 5: Structural Extrusions, CNC, Springs & Controls (6)
    { id: 'tslot',     fam: 'structural', ico: '➕', en: 'V-Slot / T-Slot Profile', fr: 'Profilé Alu V-Slot / T-Slot',  tagEn: '2020 · 2040 · 3030 · 4040 Exact',  tagFr: '2020 · 2040 · 3030 · 4040 Exact' },
    { id: 'nema',      fam: 'structural', ico: '⚡', en: 'NEMA Stepper Mount',      fr: 'Support Moteur NEMA',          tagEn: 'NEMA 11/14/17/23 · Linear Slots',  tagFr: 'NEMA 11/14/17/23 · Fentes Droites' },
    { id: 'bracket',   fam: 'structural', ico: '📐', en: 'Gusseted L / U / T Brk',  fr: 'Équerre Renforcée L / U / T',  tagEn: 'Perpendicular Bores · 2020 Corner',tagFr: 'Trous Perpendiculaires · Goussets' },
    { id: 'chain',     fam: 'structural', ico: '🐛', en: 'Cable Drag Chain',        fr: 'Chaîne Porte-Câbles',          tagEn: 'Hollow Cable Tunnel · Arc Bend',   tagFr: 'Tunnel Câbles Creux · Rayon R' },
    { id: 'spring',    fam: 'structural', ico: '➰', en: 'DIN 2095 Helical Spring', fr: 'Ressort Hélicoïdal DIN 2095',  tagEn: 'Compression · Extension · Torsion',tagFr: 'Compression · Traction · Torsion' },
    { id: 'handwheel', fam: 'structural', ico: '🎡', en: 'DIN 950 Handwheel',       fr: 'Volant de Manœuvre DIN 950',   tagEn: 'Contoured Rim · Keyway · Handle',  tagFr: 'Jante Profilée · Clavette · Poignée' }
  ];

  /* =========================================================================
     2. DEFAULTS, 1-CLICK ISO/DIN PRESETS & PARAMETER SCHEMAS FOR ALL 28 PARTS
  ========================================================================= */
  const DEFAULTS = {
    gear:      { teeth: 20, module: 2.0, thickness: 5.0, boreDiam: 10, boreType: 'round', gearType: 'spur', helixAngle: 20, pressureAngle: 20, profileShift: 0, backlash: 0, spokes: 0, hubEnabled: false, hubHeight: 5, showTwin: false, twinTeeth: 12 },
    planetary: { module: 2.0, sunTeeth: 12, planetTeeth: 12, planetCount: 3, thickness: 10, sunBore: 6, boreType: 'dshaft', backlash: 0.12, showCarrier: true },
    bevel:     { teeth: 20, mateTeeth: 20, module: 2.0, faceWidth: 9, spiralAngle: 0, boreDiam: 8, boreType: 'round', showPair: true },
    rack:      { module: 2.0, pinionTeeth: 14, rackLength: 120, thickness: 8, rackBase: 10, boreDiam: 6, boreType: 'round', mountHoles: true },
    worm:      { module: 2.0, wheelTeeth: 24, starts: 1, wormLength: 44, thickness: 12, boreDiam: 8, boreType: 'keyway' },
    geneva:    { slots: 6, wheelRadius: 32, thickness: 6, pinRadius: 2.5, boreDiam: 6 },
    cam:       { motionLaw: 'cycloidal', baseRadius: 22, lift: 14, thickness: 10, boreDiam: 8, boreType: 'keyway', followerType: 'roller', rollerRadius: 5 },
    pulley:    { beltType: 'GT2', teeth: 20, beltWidth: 6.5, boreDiam: 5.0, boreType: 'dshaft', flanges: true, hub: true },
    sprocket:  { chainStd: 'ANSI35', teeth: 18, thickness: 4.3, boreDiam: 12, boreType: 'keyway', spokes: 5 },
    idler:     { od: 18, boreDiam: 5, beltWidth: 7.0, flangeOD: 23, flangeThick: 1.5, crowned: false },
    screw:     { size: 'M8', headType: 'hex', partMode: 'assembly', length: 30, threadLength: 22 },
    leadscrew: { diam: 8, pitch: 2.0, starts: 4, length: 70, partMode: 'assembly', flangeStyle: 't8_flat', flangeOD: 22, nutHeight: 15 },
    standoff:  { shapeType: 'hex', od: 7.0, boreDiam: 3.2, length: 20, threaded: false, pitch: 0.5 },
    collar:    { collarType: 'split', boreDiam: 10, od: 22, width: 10, screwDiam: 3.2 },
    connect:   { connType: 'dovetail', pairMode: 'pair', width: 24, thickness: 10, length: 32, clearance: 0.20 },
    bearing:   { preset: '608', id: 8, od: 22, width: 7, balls: 7, clearance: 0.15, showCage: true },
    linbear:   { preset: 'LM8UU', id: 8, od: 15, length: 24, flutes: 6 },
    pillow:    { bearingOD: 22, shaftDiam: 8, centerHeight: 18, baseLength: 55, depth: 14, mountHole: 5.2, includeBearing: true },
    coupler:   { couplerType: 'jaw', od: 20, length: 26, bore1: 5.0, bore2: 8.0, boreType: 'dshaft' },
    cardan:    { od: 24, boreDiam: 8, angle: 22, boreType: 'dshaft' },
    balljoint: { boreDiam: 8, ballOD: 15, housingWidth: 9, ballWidth: 11, shankLength: 28, shankDiam: 8, clearance: 0.25 },
    hinge:     { length: 56, leafWidth: 22, leafThick: 4.0, knuckles: 5, holeDiam: 4.2, clearance: 0.30, openAngle: 180 },
    tslot:     { profile: '2020V', length: 100 },
    nema:      { nemaSize: 17, thickness: 5.0, baseDepth: 40, slotted: true, slotTravel: 6.0, gussets: true },
    bracket:   { bracketType: 'L', width: 40, height: 40, depth: 28, thickness: 5.0, holeDiam: 5.3, holesPerFace: 2, gussets: true },
    chain:     { innerWidth: 18, innerHeight: 12, pitch: 20, links: 7, bendAngle: 0, wallThick: 2.4 },
    spring:    { springType: 'compression', od: 18, wireDiam: 2.2, coils: 6, length: 38, torsionAngle: 90 },
    handwheel: { od: 100, boreDiam: 10, boreType: 'keyway', spokes: 3, handle: true }
  };

  const PRESETS = {
    gear: [
      { label: 'm2 Z20 (Ø44×5)',    v: { teeth: 20, module: 2.0, thickness: 5, boreDiam: 10, boreType: 'round', gearType: 'spur', spokes: 0, hubEnabled: false, showTwin: false } },
      { label: 'Twin Pair 20:12',   v: { teeth: 20, module: 2.0, thickness: 8, boreDiam: 8, boreType: 'keyway', gearType: 'spur', spokes: 5, showTwin: true, twinTeeth: 12 } },
      { label: 'Herringbone m2',    v: { teeth: 22, module: 2.0, thickness: 14, boreDiam: 8, boreType: 'dshaft', gearType: 'herringbone', helixAngle: 25, showTwin: true, twinTeeth: 14 } },
      { label: 'NEMA17 m1 Z16',     v: { teeth: 16, module: 1.0, thickness: 8, boreDiam: 5, boreType: 'dshaft', profileShift: 0.2, gearType: 'spur', hubEnabled: true, hubHeight: 6, showTwin: false } }
    ],
    planetary: [
      { label: '4:1 (12/12/36 · N3)', v: { module: 2.0, sunTeeth: 12, planetTeeth: 12, planetCount: 3, thickness: 10, showCarrier: true } },
      { label: '5:1 (12/18/48 · N3)', v: { module: 1.5, sunTeeth: 12, planetTeeth: 18, planetCount: 3, thickness: 10, showCarrier: true } },
      { label: '6:1 (12/24/60 · N4)', v: { module: 1.5, sunTeeth: 12, planetTeeth: 24, planetCount: 4, thickness: 12, showCarrier: true } }
    ],
    bevel: [
      { label: '1:1 Miter Pair',   v: { teeth: 20, mateTeeth: 20, module: 2.0, faceWidth: 10, spiralAngle: 0, showPair: true } },
      { label: '2:1 Reducer Pair', v: { teeth: 16, mateTeeth: 32, module: 1.8, faceWidth: 10, spiralAngle: 0, showPair: true } },
      { label: 'Spiral Bevel 1:1', v: { teeth: 20, mateTeeth: 20, module: 2.0, faceWidth: 10, spiralAngle: 22, showPair: true } }
    ],
    rack: [
      { label: 'm2 Standard',   v: { module: 2.0, pinionTeeth: 14, rackLength: 120, thickness: 8, mountHoles: true } },
      { label: 'CNC m1.5 Fine', v: { module: 1.5, pinionTeeth: 18, rackLength: 140, thickness: 10, mountHoles: true } },
      { label: 'Heavy m3',      v: { module: 3.0, pinionTeeth: 12, rackLength: 160, thickness: 14, mountHoles: true } }
    ],
    worm: [
      { label: '24:1 Self-Lock',  v: { module: 2.0, wheelTeeth: 24, starts: 1, wormLength: 44, thickness: 12 } },
      { label: '12:1 2-Start',    v: { module: 2.0, wheelTeeth: 24, starts: 2, wormLength: 48, thickness: 12 } },
      { label: '36:1 High Torque',v: { module: 1.5, wheelTeeth: 36, starts: 1, wormLength: 40, thickness: 10 } }
    ],
    geneva: [
      { label: '4-Slot (90°)', v: { slots: 4, wheelRadius: 32, thickness: 6, pinRadius: 3.0 } },
      { label: '6-Slot (60°)', v: { slots: 6, wheelRadius: 32, thickness: 6, pinRadius: 2.5 } },
      { label: '8-Slot (45°)', v: { slots: 8, wheelRadius: 36, thickness: 6, pinRadius: 2.0 } }
    ],
    cam: [
      { label: 'Cycloidal Roller', v: { motionLaw: 'cycloidal', baseRadius: 22, lift: 14, followerType: 'roller' } },
      { label: 'Harmonic Flat',    v: { motionLaw: 'harmonic', baseRadius: 24, lift: 12, followerType: 'flat' } },
      { label: '3-4-5 Polynomial', v: { motionLaw: 'poly345', baseRadius: 22, lift: 16, followerType: 'roller' } },
      { label: 'Double-Lobe',      v: { motionLaw: 'double', baseRadius: 20, lift: 10, followerType: 'roller' } }
    ],
    pulley: [
      { label: 'GT2 20T (Ø5)',   v: { beltType: 'GT2', teeth: 20, beltWidth: 6.5, boreDiam: 5.0, boreType: 'dshaft', flanges: true, hub: true } },
      { label: 'GT2 40T (Ø8)',   v: { beltType: 'GT2', teeth: 40, beltWidth: 6.5, boreDiam: 8.0, boreType: 'round', flanges: true, hub: true } },
      { label: 'HTD-3M 24T',     v: { beltType: 'HTD3M', teeth: 24, beltWidth: 9.5, boreDiam: 8.0, boreType: 'keyway', flanges: true, hub: true } },
      { label: 'HTD-5M 20T',     v: { beltType: 'HTD5M', teeth: 20, beltWidth: 15.5, boreDiam: 10.0, boreType: 'keyway', flanges: true, hub: true } }
    ],
    sprocket: [
      { label: 'ANSI #25 20T', v: { chainStd: 'ANSI25', teeth: 20, thickness: 2.8, boreDiam: 8, spokes: 4 } },
      { label: 'ANSI #35 18T', v: { chainStd: 'ANSI35', teeth: 18, thickness: 4.3, boreDiam: 12, spokes: 5 } },
      { label: 'ANSI #40 16T', v: { chainStd: 'ANSI40', teeth: 16, thickness: 7.2, boreDiam: 16, spokes: 5 } },
      { label: 'Bicycle 1/2"', v: { chainStd: 'BIKE', teeth: 22, thickness: 2.2, boreDiam: 20, spokes: 6 } }
    ],
    idler: [
      { label: 'GT2 6mm (Ø5)',   v: { od: 14, boreDiam: 5, beltWidth: 6.8, flangeOD: 18, flangeThick: 1.2, crowned: false } },
      { label: 'GT2 10mm (Ø8)',  v: { od: 20, boreDiam: 8, beltWidth: 10.5, flangeOD: 25, flangeThick: 1.5, crowned: false } },
      { label: 'Crowned 15mm',   v: { od: 24, boreDiam: 8, beltWidth: 15, flangeOD: 29, flangeThick: 1.8, crowned: true } }
    ],
    screw: [
      { label: 'M3×16 Cap',  v: { size: 'M3', headType: 'socket', partMode: 'assembly', length: 16, threadLength: 14 } },
      { label: 'M5×25 Cap',  v: { size: 'M5', headType: 'socket', partMode: 'assembly', length: 25, threadLength: 20 } },
      { label: 'M8×30 Hex',  v: { size: 'M8', headType: 'hex', partMode: 'assembly', length: 30, threadLength: 22 } },
      { label: 'M10×40 Hex', v: { size: 'M10', headType: 'hex', partMode: 'assembly', length: 40, threadLength: 28 } },
      { label: 'M6×20 CSK',  v: { size: 'M6', headType: 'countersunk', partMode: 'bolt', length: 20, threadLength: 16 } }
    ],
    leadscrew: [
      { label: 'Tr8×8 (4-Start)', v: { diam: 8, pitch: 2.0, starts: 4, length: 70, flangeStyle: 't8_flat', flangeOD: 22, partMode: 'assembly' } },
      { label: 'Tr8×2 (1-Start)', v: { diam: 8, pitch: 2.0, starts: 1, length: 70, flangeStyle: 'round', flangeOD: 22, partMode: 'assembly' } },
      { label: 'Tr10×2 Precision',v: { diam: 10, pitch: 2.0, starts: 1, length: 80, flangeStyle: 'round', flangeOD: 26, partMode: 'assembly' } },
      { label: 'T8 Nut Only',     v: { diam: 8, pitch: 2.0, starts: 4, flangeStyle: 't8_flat', flangeOD: 22, partMode: 'nut' } }
    ],
    standoff: [
      { label: 'M3 Hex 15mm',   v: { shapeType: 'hex', od: 5.5, boreDiam: 3.2, length: 15, threaded: false } },
      { label: 'M4 Hex 20mm',   v: { shapeType: 'hex', od: 7.0, boreDiam: 4.2, length: 20, threaded: false } },
      { label: 'M5 Threaded',   v: { shapeType: 'hex', od: 8.0, boreDiam: 5.0, length: 16, threaded: true, pitch: 0.8 } },
      { label: 'Knurled Ø12',   v: { shapeType: 'knurled', od: 12.0, boreDiam: 5.2, length: 24, threaded: false } }
    ],
    collar: [
      { label: 'Ø8 Split M3',   v: { collarType: 'split', boreDiam: 8, od: 20, width: 9, screwDiam: 3.2 } },
      { label: 'Ø10 Split M4',  v: { collarType: 'split', boreDiam: 10, od: 24, width: 11, screwDiam: 4.2 } },
      { label: 'Ø12 Set-Screw', v: { collarType: 'setscrew', boreDiam: 12, od: 24, width: 10, screwDiam: 4.0 } }
    ],
    connect: [
      { label: 'Dovetail 60°',  v: { connType: 'dovetail', pairMode: 'pair', width: 24, thickness: 10, length: 32, clearance: 0.20 } },
      { label: 'Snap-Fit Clip', v: { connType: 'snap', pairMode: 'pair', width: 24, thickness: 8, length: 36, clearance: 0.25 } },
      { label: 'Bayonet Lock',  v: { connType: 'bayonet', pairMode: 'pair', width: 26, thickness: 10, length: 34, clearance: 0.25 } }
    ],
    bearing: [
      { label: '608 (8×22×7)',   v: { preset: '608', id: 8, od: 22, width: 7, balls: 7, showCage: true } },
      { label: '6000 (10×26×8)', v: { preset: '6000', id: 10, od: 26, width: 8, balls: 8, showCage: true } },
      { label: '6200 (10×30×9)', v: { preset: '6200', id: 10, od: 30, width: 9, balls: 8, showCage: true } },
      { label: '6202 (15×35×11)',v: { preset: '6202', id: 15, od: 35, width: 11, balls: 9, showCage: true } },
      { label: '6805 (25×37×7)', v: { preset: '6805', id: 25, od: 37, width: 7, balls: 14, showCage: true } }
    ],
    linbear: [
      { label: 'LM6UU (6×12×19)',  v: { preset: 'LM6UU', id: 6, od: 12, length: 19, flutes: 5 } },
      { label: 'LM8UU (8×15×24)',  v: { preset: 'LM8UU', id: 8, od: 15, length: 24, flutes: 6 } },
      { label: 'LM10UU (10×19×29)',v: { preset: 'LM10UU', id: 10, od: 19, length: 29, flutes: 6 } },
      { label: 'LM12UU (12×21×30)',v: { preset: 'LM12UU', id: 12, od: 21, length: 30, flutes: 7 } }
    ],
    pillow: [
      { label: 'KP08 (Ø8 / 608)',  v: { bearingOD: 22, shaftDiam: 8, centerHeight: 18, baseLength: 55, depth: 14, mountHole: 5.2, includeBearing: true } },
      { label: 'KP000 (Ø10 / 6000)',v: { bearingOD: 26, shaftDiam: 10, centerHeight: 22, baseLength: 66, depth: 16, mountHole: 6.4, includeBearing: true } },
      { label: 'UCP204 (Ø20)',     v: { bearingOD: 47, shaftDiam: 20, centerHeight: 33.3, baseLength: 127, depth: 28, mountHole: 10.5, includeBearing: true } }
    ],
    coupler: [
      { label: 'Jaw 5→8 (NEMA-T8)', v: { couplerType: 'jaw', od: 20, length: 26, bore1: 5, bore2: 8, boreType: 'dshaft' } },
      { label: 'Helical Flex 5→8',  v: { couplerType: 'flex', od: 20, length: 28, bore1: 5, bore2: 8, boreType: 'round' } },
      { label: 'Rigid Split 8→8',   v: { couplerType: 'rigid', od: 20, length: 26, bore1: 8, bore2: 8, boreType: 'round' } }
    ],
    cardan: [
      { label: 'Ø8 Std (22°)',  v: { od: 24, boreDiam: 8, angle: 22, boreType: 'dshaft' } },
      { label: 'Ø5 Mini (15°)', v: { od: 16, boreDiam: 5, angle: 15, boreType: 'dshaft' } },
      { label: 'Ø12 Heavy',     v: { od: 34, boreDiam: 12, angle: 25, boreType: 'keyway' } }
    ],
    balljoint: [
      { label: 'M6 Rod End', v: { boreDiam: 6, ballOD: 12, housingWidth: 7, ballWidth: 9, shankLength: 24, shankDiam: 6 } },
      { label: 'M8 Rod End', v: { boreDiam: 8, ballOD: 15, housingWidth: 9, ballWidth: 11, shankLength: 28, shankDiam: 8 } },
      { label: 'M10 Heavy',  v: { boreDiam: 10, ballOD: 19, housingWidth: 11, ballWidth: 14, shankLength: 34, shankDiam: 10 } }
    ],
    hinge: [
      { label: 'Std 5-Knuckle',  v: { length: 56, leafWidth: 22, leafThick: 4.0, knuckles: 5, holeDiam: 4.2, openAngle: 180 } },
      { label: 'Heavy 7-Knuckle',v: { length: 84, leafWidth: 28, leafThick: 5.0, knuckles: 7, holeDiam: 5.2, openAngle: 180 } },
      { label: 'Mini 3-Knuckle', v: { length: 32, leafWidth: 16, leafThick: 3.2, knuckles: 3, holeDiam: 3.4, openAngle: 180 } }
    ],
    tslot: [
      { label: '2020 V-Slot', v: { profile: '2020V', length: 100 } },
      { label: '2020 T-Slot', v: { profile: '2020T', length: 100 } },
      { label: '2040 V-Slot', v: { profile: '2040V', length: 100 } },
      { label: '3030 T-Slot', v: { profile: '3030T', length: 120 } },
      { label: '4040 T-Slot', v: { profile: '4040T', length: 120 } }
    ],
    nema: [
      { label: 'NEMA 17 Tensioner', v: { nemaSize: 17, thickness: 5, baseDepth: 40, slotted: true, slotTravel: 6, gussets: true } },
      { label: 'NEMA 17 Fixed',     v: { nemaSize: 17, thickness: 5, baseDepth: 36, slotted: false, gussets: true } },
      { label: 'NEMA 23 Heavy',     v: { nemaSize: 23, thickness: 6, baseDepth: 55, slotted: true, slotTravel: 8, gussets: true } },
      { label: 'NEMA 14 Compact',   v: { nemaSize: 14, thickness: 4, baseDepth: 32, slotted: false, gussets: true } }
    ],
    bracket: [
      { label: 'L-Bracket 40×40', v: { bracketType: 'L', width: 40, height: 40, depth: 28, thickness: 5, holeDiam: 5.3, holesPerFace: 2, gussets: true } },
      { label: '2020 Corner',     v: { bracketType: 'corner2020', thickness: 4.5, holeDiam: 5.3, gussets: true } },
      { label: 'U-Channel 50×40', v: { bracketType: 'U', width: 50, height: 40, depth: 30, thickness: 5, holeDiam: 5.3, holesPerFace: 2 } },
      { label: 'T-Plate 60×50',   v: { bracketType: 'T', width: 60, height: 50, depth: 20, thickness: 4.5, holeDiam: 5.3 } }
    ],
    chain: [
      { label: '18×12 Straight',  v: { innerWidth: 18, innerHeight: 12, pitch: 20, links: 7, bendAngle: 0 } },
      { label: '18×12 Curved R',  v: { innerWidth: 18, innerHeight: 12, pitch: 20, links: 8, bendAngle: 22 } },
      { label: '30×18 Heavy CNC', v: { innerWidth: 30, innerHeight: 18, pitch: 26, links: 6, bendAngle: 18 } }
    ],
    spring: [
      { label: 'Compression Ø18', v: { springType: 'compression', od: 18, wireDiam: 2.2, coils: 6, length: 38 } },
      { label: 'Extension Hooks', v: { springType: 'extension', od: 14, wireDiam: 1.8, coils: 8, length: 46 } },
      { label: 'Torsion 90°',     v: { springType: 'torsion', od: 16, wireDiam: 2.0, coils: 5, torsionAngle: 90 } }
    ],
    handwheel: [
      { label: 'Ø100 3-Spoke', v: { od: 100, boreDiam: 10, boreType: 'keyway', spokes: 3, handle: true } },
      { label: 'Ø140 5-Spoke', v: { od: 140, boreDiam: 12, boreType: 'keyway', spokes: 5, handle: true } },
      { label: 'Ø80 Compact',  v: { od: 80, boreDiam: 8, boreType: 'dshaft', spokes: 4, handle: true } }
    ]
  };

  const BORE_OPTS = [
    ['round', 'Round (Cylindrical)', 'Rond (Cylindrique)'],
    ['dshaft', 'D-Shaft (Motor Flat)', 'Arbre en D (Méplat)'],
    ['keyway', 'DIN 6885 Keyway', 'Rainure Clavette DIN 6885'],
    ['hex', 'ISO Hexagonal', 'Hexagonal ISO']
  ];

  const SCHEMAS = {
    gear: [
      { k: 'gearType', t: 'sel', en: 'Tooth Geometry', fr: 'Type de Denture', opts: [['spur','Spur (Straight)','Droit'],['helical','Helical','Hélicoïdal'],['herringbone','Herringbone (Double-V)','À Chevrons (V)']] },
      { k: 'teeth', t: 'rng', en: 'Teeth Count (Z)', fr: 'Nombre de Dents (Z)', min: 6, max: 80, step: 1 },
      { k: 'module', t: 'rng', en: 'Module (m) mm', fr: 'Module (m) mm', min: 0.5, max: 8.0, step: 0.25 },
      { k: 'thickness', t: 'rng', en: 'Face Width (b) mm', fr: 'Largeur Denture (b) mm', min: 2, max: 50, step: 0.5 },
      { k: 'pressureAngle', t: 'sel', en: 'Pressure Angle (α)', fr: 'Angle de Pression (α)', opts: [[20,'20° ISO Standard','20° Standard ISO'],[14.5,'14.5° Classic','14.5° Classique'],[25,'25° High Strength','25° Haute Résistance']], num: true },
      { k: 'helixAngle', t: 'rng', en: 'Helix Angle (β°)', fr: 'Angle Hélice (β°)', min: 5, max: 35, step: 1, showIf: (v) => v.gearType !== 'spur' },
      { k: 'profileShift', t: 'rng', en: 'Profile Shift (x)', fr: 'Déport de Profil (x)', min: -0.4, max: 0.6, step: 0.05 },
      { k: 'backlash', t: 'rng', en: 'Tooth Backlash mm', fr: 'Jeu de Flanc mm', min: 0, max: 0.5, step: 0.02 },
      { k: 'boreType', t: 'sel', en: 'Shaft Bore Profile', fr: 'Profil d’Alésage', opts: BORE_OPTS },
      { k: 'boreDiam', t: 'rng', en: 'Bore Diameter mm', fr: 'Diamètre Alésage mm', min: 0, max: 40, step: 0.5 },
      { k: 'spokes', t: 'rng', en: 'Lightening Spokes', fr: 'Évidements / Rayons', min: 0, max: 8, step: 1 },
      { k: 'hubEnabled', t: 'chk', en: 'Add Raised Hub Boss', fr: 'Ajouter Moyeu' },
      { k: 'hubHeight', t: 'rng', en: 'Hub Height mm', fr: 'Hauteur Moyeu mm', min: 2, max: 20, step: 0.5, showIf: (v) => v.hubEnabled },
      { k: 'showTwin', t: 'chk', en: 'Meshing Twin Gear Pair', fr: 'Afficher Paire Engrenée' },
      { k: 'twinTeeth', t: 'rng', en: 'Mating Gear Teeth (Z2)', fr: 'Dents Roue Menée (Z2)', min: 6, max: 60, step: 1, showIf: (v) => v.showTwin }
    ],
    planetary: [
      { k: 'module', t: 'rng', en: 'Module (m) mm', fr: 'Module (m) mm', min: 1.0, max: 5.0, step: 0.25 },
      { k: 'sunTeeth', t: 'rng', en: 'Sun Teeth (Zs)', fr: 'Dents Planétaire (Zs)', min: 8, max: 32, step: 1 },
      { k: 'planetTeeth', t: 'rng', en: 'Planet Teeth (Zp)', fr: 'Dents Satellites (Zp)', min: 8, max: 32, step: 1 },
      { k: 'planetCount', t: 'rng', en: 'Planet Count (N)', fr: 'Nombre Satellites (N)', min: 2, max: 6, step: 1 },
      { k: 'thickness', t: 'rng', en: 'Gear Thickness mm', fr: 'Épaisseur mm', min: 4, max: 30, step: 1 },
      { k: 'sunBore', t: 'rng', en: 'Sun Shaft Bore mm', fr: 'Alésage Arbre Soleil mm', min: 0, max: 20, step: 0.5 },
      { k: 'boreType', t: 'sel', en: 'Sun Bore Profile', fr: 'Profil Alésage Soleil', opts: BORE_OPTS },
      { k: 'backlash', t: 'rng', en: 'Mesh Backlash mm', fr: 'Jeu d’Engrenage mm', min: 0.05, max: 0.4, step: 0.02 },
      { k: 'showCarrier', t: 'chk', en: 'Include Planet Carrier + Pins', fr: 'Inclure Porte-Satellites + Axes' }
    ],
    bevel: [
      { k: 'teeth', t: 'rng', en: 'Pinion Teeth (Z1)', fr: 'Dents Pignon (Z1)', min: 10, max: 45, step: 1 },
      { k: 'mateTeeth', t: 'rng', en: 'Crown Gear Teeth (Z2)', fr: 'Dents Couronne (Z2)', min: 10, max: 50, step: 1 },
      { k: 'module', t: 'rng', en: 'Outer Module (m) mm', fr: 'Module Extérieur (m) mm', min: 1.0, max: 5.0, step: 0.25 },
      { k: 'faceWidth', t: 'rng', en: 'Face Width mm', fr: 'Largeur Denture mm', min: 4, max: 24, step: 0.5 },
      { k: 'spiralAngle', t: 'rng', en: 'Spiral Twist (°)', fr: 'Angle Spirale (°)', min: 0, max: 30, step: 1 },
      { k: 'boreDiam', t: 'rng', en: 'Shaft Bore mm', fr: 'Alésage Arbre mm', min: 0, max: 24, step: 0.5 },
      { k: 'boreType', t: 'sel', en: 'Bore Profile', fr: 'Profil Alésage', opts: BORE_OPTS },
      { k: 'showPair', t: 'chk', en: 'Show 90° Meshing Pair', fr: 'Afficher Paire à 90°' }
    ],
    rack: [
      { k: 'module', t: 'rng', en: 'Module (m) mm', fr: 'Module (m) mm', min: 1.0, max: 6.0, step: 0.25 },
      { k: 'pinionTeeth', t: 'rng', en: 'Pinion Teeth (Z)', fr: 'Dents Pignon (Z)', min: 8, max: 36, step: 1 },
      { k: 'rackLength', t: 'rng', en: 'Rack Length mm', fr: 'Longueur Crémaillère mm', min: 50, max: 240, step: 5 },
      { k: 'thickness', t: 'rng', en: 'Face Width mm', fr: 'Épaisseur mm', min: 3, max: 30, step: 1 },
      { k: 'rackBase', t: 'rng', en: 'Rack Spine Height mm', fr: 'Hauteur Dos Crémaillère mm', min: 5, max: 25, step: 1 },
      { k: 'boreDiam', t: 'rng', en: 'Pinion Bore mm', fr: 'Alésage Pignon mm', min: 0, max: 20, step: 0.5 },
      { k: 'boreType', t: 'sel', en: 'Pinion Bore Profile', fr: 'Profil Alésage Pignon', opts: BORE_OPTS },
      { k: 'mountHoles', t: 'chk', en: 'Include Rack Mounting Holes', fr: 'Trous de Fixation Crémaillère' }
    ],
    worm: [
      { k: 'module', t: 'rng', en: 'Module (m) mm', fr: 'Module (m) mm', min: 1.0, max: 4.0, step: 0.25 },
      { k: 'wheelTeeth', t: 'rng', en: 'Worm Wheel Teeth (Z2)', fr: 'Dents Roue Melée (Z2)', min: 12, max: 50, step: 1 },
      { k: 'starts', t: 'sel', en: 'Worm Starts (z1)', fr: 'Filets de la Vis (z1)', opts: [[1,'1 Start (Self-Locking)','1 Filet (Irréversible)'],[2,'2 Starts (Fast)','2 Filets (Rapide)']], num: true },
      { k: 'wormLength', t: 'rng', en: 'Worm Thread Length mm', fr: 'Longueur Filetée Vis mm', min: 25, max: 90, step: 2 },
      { k: 'thickness', t: 'rng', en: 'Wheel Thickness mm', fr: 'Épaisseur Roue mm', min: 6, max: 24, step: 1 },
      { k: 'boreDiam', t: 'rng', en: 'Wheel Bore mm', fr: 'Alésage Roue mm', min: 0, max: 24, step: 0.5 },
      { k: 'boreType', t: 'sel', en: 'Wheel Bore Profile', fr: 'Profil Alésage Roue', opts: BORE_OPTS }
    ],
    geneva: [
      { k: 'slots', t: 'rng', en: 'Slot Count (N)', fr: 'Nombre de Fentes (N)', min: 4, max: 8, step: 1 },
      { k: 'wheelRadius', t: 'rng', en: 'Driven Wheel Radius mm', fr: 'Rayon Roue Menée mm', min: 18, max: 65, step: 1 },
      { k: 'thickness', t: 'rng', en: 'Plate Thickness mm', fr: 'Épaisseur mm', min: 3, max: 18, step: 0.5 },
      { k: 'pinRadius', t: 'rng', en: 'Drive Pin Radius mm', fr: 'Rayon Doigt d’Entraînement mm', min: 1.5, max: 5.5, step: 0.25 },
      { k: 'boreDiam', t: 'rng', en: 'Shaft Bores mm', fr: 'Alésages Axes mm', min: 3, max: 14, step: 0.5 }
    ],
    cam: [
      { k: 'motionLaw', t: 'sel', en: 'Cam Motion Law', fr: 'Loi de Levée', opts: [['cycloidal','Cycloidal (Zero Jerk)','Cycloïdale (Sans À-coups)'],['harmonic','Simple Harmonic (SHM)','Harmonique Simple'],['poly345','3-4-5 Polynomial','Polynomiale 3-4-5'],['double','Double-Lobe Symmetric','Double Lobe Symétrique']] },
      { k: 'baseRadius', t: 'rng', en: 'Base Circle Radius mm', fr: 'Rayon de Base mm', min: 14, max: 50, step: 1 },
      { k: 'lift', t: 'rng', en: 'Follower Lift (Stroke) mm', fr: 'Course / Levée mm', min: 4, max: 32, step: 1 },
      { k: 'thickness', t: 'rng', en: 'Cam Width mm', fr: 'Épaisseur Came mm', min: 4, max: 24, step: 1 },
      { k: 'followerType', t: 'sel', en: 'Follower Foot', fr: 'Type de Poussoir', opts: [['roller','Roller Follower','Poussoir à Galet'],['flat','Flat Mushroom Foot','Poussoir Plateau']] },
      { k: 'rollerRadius', t: 'rng', en: 'Roller Radius mm', fr: 'Rayon Galet mm', min: 3, max: 10, step: 0.5, showIf: (v) => v.followerType === 'roller' },
      { k: 'boreDiam', t: 'rng', en: 'Cam Shaft Bore mm', fr: 'Alésage Arbre Came mm', min: 3, max: 20, step: 0.5 },
      { k: 'boreType', t: 'sel', en: 'Bore Profile', fr: 'Profil Alésage', opts: BORE_OPTS }
    ],
    pulley: [
      { k: 'beltType', t: 'sel', en: 'Belt Standard', fr: 'Standard Courroie', opts: [['GT2','Gates GT2 (2.0 mm)','Gates GT2 (2.0 mm)'],['GT3','Gates GT3 (3.0 mm)','Gates GT3 (3.0 mm)'],['HTD3M','HTD-3M (3.0 mm)','HTD-3M (3.0 mm)'],['HTD5M','HTD-5M (5.0 mm)','HTD-5M (5.0 mm)']] },
      { k: 'teeth', t: 'rng', en: 'Teeth Count (Z)', fr: 'Nombre de Dents (Z)', min: 12, max: 72, step: 1 },
      { k: 'beltWidth', t: 'rng', en: 'Belt Channel Width mm', fr: 'Largeur Gorge Courroie mm', min: 4.5, max: 22, step: 0.5 },
      { k: 'boreDiam', t: 'rng', en: 'Shaft Bore mm', fr: 'Alésage Arbre mm', min: 3, max: 20, step: 0.25 },
      { k: 'boreType', t: 'sel', en: 'Bore Profile', fr: 'Profil Alésage', opts: BORE_OPTS },
      { k: 'flanges', t: 'chk', en: 'Retaining Side Flanges', fr: 'Joues de Guidage' },
      { k: 'hub', t: 'chk', en: 'Set-Screw Hub Boss', fr: 'Moyeu de Fixation' }
    ],
    sprocket: [
      { k: 'chainStd', t: 'sel', en: 'Roller Chain Standard', fr: 'Norme Chaîne', opts: [['ANSI25','ANSI #25 (6.35 mm)','ANSI #25 (6.35 mm)'],['ANSI35','ANSI #35 (9.525 mm)','ANSI #35 (9.525 mm)'],['ANSI40','ANSI #40 (12.7 mm)','ANSI #40 (12.7 mm)'],['ISO06B','ISO 06B-1 (9.525 mm)','ISO 06B-1 (9.525 mm)'],['ISO08B','ISO 08B-1 (12.7 mm)','ISO 08B-1 (12.7 mm)'],['BIKE','Bicycle 1/2" (12.7 mm)','Vélo 1/2" (12.7 mm)']] },
      { k: 'teeth', t: 'rng', en: 'Teeth Count (Z)', fr: 'Nombre de Dents (Z)', min: 9, max: 48, step: 1 },
      { k: 'thickness', t: 'rng', en: 'Plate Thickness mm', fr: 'Épaisseur Plaque mm', min: 2.0, max: 16, step: 0.2 },
      { k: 'boreDiam', t: 'rng', en: 'Shaft Bore mm', fr: 'Alésage Arbre mm', min: 0, max: 40, step: 0.5 },
      { k: 'boreType', t: 'sel', en: 'Bore Profile', fr: 'Profil Alésage', opts: BORE_OPTS },
      { k: 'spokes', t: 'rng', en: 'Lightening Cutouts', fr: 'Évidements', min: 0, max: 8, step: 1 }
    ],
    idler: [
      { k: 'od', t: 'rng', en: 'Belt Contact Ø mm', fr: 'Ø Contact Courroie mm', min: 10, max: 50, step: 0.5 },
      { k: 'boreDiam', t: 'rng', en: 'Bearing / Shaft Bore mm', fr: 'Alésage Axe / Roulement mm', min: 3, max: 30, step: 0.5 },
      { k: 'beltWidth', t: 'rng', en: 'Belt Channel Width mm', fr: 'Largeur Courroie mm', min: 4, max: 24, step: 0.5 },
      { k: 'flangeOD', t: 'rng', en: 'Flange Outer Ø mm', fr: 'Ø Extérieur Flasques mm', min: 13, max: 65, step: 0.5 },
      { k: 'flangeThick', t: 'rng', en: 'Flange Thickness mm', fr: 'Épaisseur Flasques mm', min: 0.8, max: 4.0, step: 0.2 },
      { k: 'crowned', t: 'chk', en: 'Crowned Self-Tracking Belt Surface', fr: 'Surface Bombée Auto-Centrante' }
    ],
    screw: [
      { k: 'size', t: 'sel', en: 'ISO Metric Size', fr: 'Dimension Métrique ISO', opts: [['M3','M3 × 0.5','M3 × 0.5'],['M4','M4 × 0.7','M4 × 0.7'],['M5','M5 × 0.8','M5 × 0.8'],['M6','M6 × 1.0','M6 × 1.0'],['M8','M8 × 1.25','M8 × 1.25'],['M10','M10 × 1.5','M10 × 1.5'],['M12','M12 × 1.75','M12 × 1.75'],['M16','M16 × 2.0','M16 × 2.0']] },
      { k: 'headType', t: 'sel', en: 'Head Standard', fr: 'Type de Tête', opts: [['hex','ISO 4017 Hex Head','Tête Hexagonale ISO 4017'],['socket','DIN 912 Allen Socket Cap','CHC Six Pans Creux DIN 912'],['countersunk','DIN 7991 90° Countersunk','Fraisée 90° DIN 7991']] },
      { k: 'partMode', t: 'sel', en: 'Assembly Mode', fr: 'Mode d’Assemblage', opts: [['assembly','Bolt + Threaded Nut','Vis + Écrou Fileté'],['bolt','Bolt Only','Vis Seule'],['nut','ISO 4032 Nut Only','Écrou ISO 4032 Seul']] },
      { k: 'length', t: 'rng', en: 'Shank Length (L) mm', fr: 'Longueur Sous Tête (L) mm', min: 10, max: 90, step: 2, showIf: (v) => v.partMode !== 'nut' },
      { k: 'threadLength', t: 'rng', en: 'Threaded Length (b) mm', fr: 'Longueur Filetée (b) mm', min: 6, max: 90, step: 2, showIf: (v) => v.partMode !== 'nut' }
    ],
    leadscrew: [
      { k: 'diam', t: 'rng', en: 'Nominal Diameter (Tr) mm', fr: 'Diamètre Nominal (Tr) mm', min: 6, max: 16, step: 1 },
      { k: 'pitch', t: 'rng', en: 'Thread Pitch (P) mm', fr: 'Pas du Filet (P) mm', min: 1.5, max: 4.0, step: 0.5 },
      { k: 'starts', t: 'rng', en: 'Thread Starts (Lead=P×S)', fr: 'Nombre de Filets', min: 1, max: 4, step: 1 },
      { k: 'length', t: 'rng', en: 'Screw Length mm', fr: 'Longueur Vis mm', min: 30, max: 160, step: 5 },
      { k: 'partMode', t: 'sel', en: 'Export Mode', fr: 'Mode', opts: [['assembly','Screw + Flanged Nut','Vis + Écrou à Bride'],['screw','Lead Screw Only','Vis Trapézoïdale Seule'],['nut','Flanged Nut Only','Écrou à Bride Seul']] },
      { k: 'flangeStyle', t: 'sel', en: 'Nut Flange Shape', fr: 'Forme Bride Écrou', opts: [['t8_flat','T8 Trimmed Flat Flange','Bride T8 Coupée'],['round','Full Round Flange (4×M3.5)','Bride Ronde (4×M3.5)']] },
      { k: 'flangeOD', t: 'rng', en: 'Flange Outer Ø mm', fr: 'Ø Bride mm', min: 18, max: 40, step: 1 }
    ],
    standoff: [
      { k: 'shapeType', t: 'sel', en: 'Outer Body', fr: 'Profil Extérieur', opts: [['hex','ISO Hexagonal (Wrench s)','Hexagonal ISO (Clé s)'],['round','Smooth Cylindrical','Cylindrique Lisse'],['knurled','Knurled Grip','Moleté']] },
      { k: 'od', t: 'rng', en: 'Wrench Flats / OD mm', fr: 'Cote Clé s / Ø Ext mm', min: 5.0, max: 22, step: 0.5 },
      { k: 'boreDiam', t: 'rng', en: 'Inner Bore / Thread Ø mm', fr: 'Alésage / Filet Ø mm', min: 2.0, max: 12, step: 0.2 },
      { k: 'length', t: 'rng', en: 'Exact Length (L) mm', fr: 'Longueur Exacte (L) mm', min: 4, max: 80, step: 1 },
      { k: 'threaded', t: 'chk', en: 'Internal ISO 60° Thread', fr: 'Taraudage Intérieur ISO 60°' },
      { k: 'pitch', t: 'rng', en: 'Thread Pitch mm', fr: 'Pas du Filet mm', min: 0.5, max: 1.5, step: 0.1, showIf: (v) => v.threaded }
    ],
    collar: [
      { k: 'collarType', t: 'sel', en: 'Clamping Style', fr: 'Type de Serrage', opts: [['split','Split C-Clamp (Bolt Ear)','Fendue à Oreilles (Vis)'],['setscrew','Set-Screw Collar','À Vis de Pression']] },
      { k: 'boreDiam', t: 'rng', en: 'Shaft Bore Ø mm', fr: 'Alésage Arbre Ø mm', min: 4, max: 35, step: 0.5 },
      { k: 'od', t: 'rng', en: 'Outer Ø mm', fr: 'Diamètre Extérieur mm', min: 12, max: 60, step: 1 },
      { k: 'width', t: 'rng', en: 'Collar Width mm', fr: 'Largeur Bague mm', min: 6, max: 24, step: 1 },
      { k: 'screwDiam', t: 'rng', en: 'Clamp Bolt Ø mm', fr: 'Ø Vis de Serrage mm', min: 2.5, max: 6.0, step: 0.2 }
    ],
    connect: [
      { k: 'connType', t: 'sel', en: 'Joint Type', fr: 'Type d’Assemblage', opts: [['dovetail','60° Dovetail Slide','Queue d’Aronde 60°'],['snap','Cantilever Snap-Fit Clip','Clip Encliquetable'],['bayonet','Bayonet Twist-Lock','Verrouillage Baïonnette']] },
      { k: 'pairMode', t: 'sel', en: 'Mating Pieces', fr: 'Pièces Générées', opts: [['pair','Male + Female Pair','Paire Mâle + Femelle'],['assembled','Assembled Fit Check','Assemblé (Vérif Jeu)'],['male','Male Plug Only','Mâle Seul'],['female','Female Socket Only','Femelle Seule']] },
      { k: 'width', t: 'rng', en: 'Connector Width mm', fr: 'Largeur mm', min: 14, max: 50, step: 1 },
      { k: 'thickness', t: 'rng', en: 'Thickness mm', fr: 'Épaisseur mm', min: 5, max: 24, step: 1 },
      { k: 'length', t: 'rng', en: 'Half Length mm', fr: 'Longueur Demi-Pièce mm', min: 18, max: 65, step: 2 },
      { k: 'clearance', t: 'rng', en: 'Mating Clearance mm', fr: 'Jeu Fonctionnel mm', min: 0.1, max: 0.6, step: 0.05 }
    ],
    bearing: [
      { k: 'id', t: 'rng', en: 'Inner Bore Ø (d) mm', fr: 'Alésage Intérieur (d) mm', min: 4, max: 50, step: 1 },
      { k: 'od', t: 'rng', en: 'Outer Ø (D) mm', fr: 'Diamètre Extérieur (D) mm', min: 14, max: 90, step: 1 },
      { k: 'width', t: 'rng', en: 'Bearing Width (B) mm', fr: 'Largeur (B) mm', min: 4, max: 28, step: 0.5 },
      { k: 'balls', t: 'rng', en: 'Ball Count', fr: 'Nombre de Billes', min: 5, max: 20, step: 1 },
      { k: 'clearance', t: 'rng', en: 'Raceway Clearance mm', fr: 'Jeu de Roulement mm', min: 0.05, max: 0.45, step: 0.05 },
      { k: 'showCage', t: 'chk', en: 'Include Ball Retainer Cage', fr: 'Inclure Cage à Billes' }
    ],
    linbear: [
      { k: 'id', t: 'rng', en: 'Rod Bore Ø (ID) mm', fr: 'Alésage Tige (ID) mm', min: 4, max: 25, step: 1 },
      { k: 'od', t: 'rng', en: 'Outer Ø (OD) mm', fr: 'Diamètre Extérieur mm', min: 10, max: 42, step: 1 },
      { k: 'length', t: 'rng', en: 'Total Length (L) mm', fr: 'Longueur Totale (L) mm', min: 14, max: 65, step: 1 },
      { k: 'flutes', t: 'rng', en: 'Low-Friction Wiper Flutes', fr: 'Rainures Anti-Friction', min: 4, max: 10, step: 1 }
    ],
    pillow: [
      { k: 'bearingOD', t: 'rng', en: 'Bearing Seat Ø mm', fr: 'Ø Logement Roulement mm', min: 14, max: 52, step: 1 },
      { k: 'shaftDiam', t: 'rng', en: 'Shaft Ø mm', fr: 'Ø Arbre mm', min: 5, max: 25, step: 1 },
      { k: 'centerHeight', t: 'rng', en: 'Shaft Center Height mm', fr: 'Hauteur d’Axe mm', min: 12, max: 50, step: 0.5 },
      { k: 'baseLength', t: 'rng', en: 'Base Footprint Length mm', fr: 'Longueur Semelle mm', min: 40, max: 140, step: 2 },
      { k: 'depth', t: 'rng', en: 'Housing Depth mm', fr: 'Profondeur Palier mm', min: 8, max: 34, step: 1 },
      { k: 'mountHole', t: 'rng', en: 'Base Slot Bolt Ø mm', fr: 'Ø Vis Fixation Semelle mm', min: 3.2, max: 11, step: 0.2 },
      { k: 'includeBearing', t: 'chk', en: 'Include Seated Ball Bearing', fr: 'Inclure Roulement Monté' }
    ],
    coupler: [
      { k: 'couplerType', t: 'sel', en: 'Coupler Architecture', fr: 'Type d’Accouplement', opts: [['jaw','3-Piece Jaw + Elastomer Spider','À Griffes + Étoile Élastomère'],['flex','Helical Beam Flex Coupler','Flexible Hélicoïdal'],['rigid','Rigid Split-Clamp Coupler','Rigide à Fente']] },
      { k: 'od', t: 'rng', en: 'Outer Ø mm', fr: 'Diamètre Extérieur mm', min: 14, max: 45, step: 1 },
      { k: 'length', t: 'rng', en: 'Total Length mm', fr: 'Longueur Totale mm', min: 18, max: 55, step: 1 },
      { k: 'bore1', t: 'rng', en: 'Bottom Shaft Bore (d1) mm', fr: 'Alésage Bas (d1) mm', min: 3, max: 20, step: 0.25 },
      { k: 'bore2', t: 'rng', en: 'Top Shaft Bore (d2) mm', fr: 'Alésage Haut (d2) mm', min: 3, max: 20, step: 0.25 },
      { k: 'boreType', t: 'sel', en: 'Bore Profile', fr: 'Profil Alésage', opts: BORE_OPTS }
    ],
    cardan: [
      { k: 'od', t: 'rng', en: 'Joint Outer Ø mm', fr: 'Diamètre Extérieur mm', min: 14, max: 48, step: 1 },
      { k: 'boreDiam', t: 'rng', en: 'Shaft Bores Ø mm', fr: 'Alésages Arbres Ø mm', min: 4, max: 20, step: 0.5 },
      { k: 'boreType', t: 'sel', en: 'Shaft Bore Profile', fr: 'Profil Alésage', opts: BORE_OPTS },
      { k: 'angle', t: 'rng', en: 'Articulation Angle (°)', fr: 'Angle d’Articulation (°)', min: 0, max: 35, step: 1 }
    ],
    balljoint: [
      { k: 'boreDiam', t: 'rng', en: 'Ball Through-Bore Ø mm', fr: 'Alésage Rotule Ø mm', min: 4, max: 16, step: 0.5 },
      { k: 'ballOD', t: 'rng', en: 'Captive Sphere Ø mm', fr: 'Ø Sphère Captive mm', min: 10, max: 34, step: 0.5 },
      { k: 'housingWidth', t: 'rng', en: 'Housing Width mm', fr: 'Épaisseur Corps mm', min: 6, max: 20, step: 0.5 },
      { k: 'ballWidth', t: 'rng', en: 'Ball Flat Width mm', fr: 'Largeur Sphère mm', min: 7, max: 24, step: 0.5 },
      { k: 'shankDiam', t: 'rng', en: 'Threaded Rod Ø (M) mm', fr: 'Ø Tige Filetée (M) mm', min: 4, max: 16, step: 1 },
      { k: 'shankLength', t: 'rng', en: 'Threaded Rod Length mm', fr: 'Longueur Tige Filetée mm', min: 14, max: 60, step: 2 },
      { k: 'clearance', t: 'rng', en: 'Socket Clearance mm', fr: 'Jeu Sphérique mm', min: 0.15, max: 0.55, step: 0.05 }
    ],
    hinge: [
      { k: 'length', t: 'rng', en: 'Hinge Length mm', fr: 'Longueur Charnière mm', min: 28, max: 120, step: 2 },
      { k: 'leafWidth', t: 'rng', en: 'Single Leaf Width mm', fr: 'Largeur d’une Aile mm', min: 14, max: 50, step: 1 },
      { k: 'leafThick', t: 'rng', en: 'Leaf Thickness mm', fr: 'Épaisseur Aile mm', min: 2.5, max: 8.0, step: 0.5 },
      { k: 'knuckles', t: 'rng', en: 'Knuckle Segments', fr: 'Nombre de Nœuds', min: 3, max: 9, step: 2 },
      { k: 'holeDiam', t: 'rng', en: 'Screw Hole Ø mm', fr: 'Ø Trous de Vis mm', min: 0, max: 7.0, step: 0.2 },
      { k: 'clearance', t: 'rng', en: 'Print-in-Place Gap mm', fr: 'Jeu Print-in-Place mm', min: 0.20, max: 0.60, step: 0.05 },
      { k: 'openAngle', t: 'rng', en: 'Opening Angle (°)', fr: 'Angle d’Ouverture (°)', min: 45, max: 180, step: 5 }
    ],
    tslot: [
      { k: 'profile', t: 'sel', en: 'Extrusion Standard', fr: 'Profilé Standard', opts: [['2020V','2020 OpenBuilds V-Slot','2020 OpenBuilds V-Slot'],['2020T','2020 Bosch T-Slot','2020 Bosch T-Slot'],['2040V','2040 OpenBuilds V-Slot','2040 OpenBuilds V-Slot'],['3030T','3030 Industrial T-Slot','3030 Industriel T-Slot'],['4040T','4040 Heavy T-Slot','4040 Lourd T-Slot']] },
      { k: 'length', t: 'rng', en: 'Extrusion Length (L) mm', fr: 'Longueur Profilé (L) mm', min: 20, max: 400, step: 5 }
    ],
    nema: [
      { k: 'nemaSize', t: 'sel', en: 'NEMA Motor Frame', fr: 'Standard Moteur NEMA', opts: [[11,'NEMA 11 (28.2 mm)','NEMA 11 (28.2 mm)'],[14,'NEMA 14 (35.2 mm)','NEMA 14 (35.2 mm)'],[17,'NEMA 17 (42.3 mm)','NEMA 17 (42.3 mm)'],[23,'NEMA 23 (57.2 mm)','NEMA 23 (57.2 mm)']], num: true },
      { k: 'thickness', t: 'rng', en: 'Plate Wall Thickness mm', fr: 'Épaisseur Tôle mm', min: 3.0, max: 10.0, step: 0.5 },
      { k: 'baseDepth', t: 'rng', en: 'Base Flange Depth mm', fr: 'Profondeur Semelle mm', min: 26, max: 75, step: 2 },
      { k: 'slotted', t: 'chk', en: 'Linear Belt-Tensioning Slots', fr: 'Fentes Linéaires Tension Courroie' },
      { k: 'slotTravel', t: 'rng', en: 'Tension Slot Travel mm', fr: 'Course de Tension mm', min: 3, max: 12, step: 1, showIf: (v) => v.slotted },
      { k: 'gussets', t: 'chk', en: 'Triangular Side Gusset Ribs', fr: 'Goussets Latéraux de Renfort' }
    ],
    bracket: [
      { k: 'bracketType', t: 'sel', en: 'Bracket Style', fr: 'Type d’Équerre', opts: [['L','L-Bracket (90° Gusseted)','Équerre L (90° Renforcée)'],['corner2020','2020 Profile Corner Gusset','Équerre d’Angle 2020'],['U','U-Channel Bracket','Étrier en U'],['T','Flat T-Joining Plate','Plaque Jonction en T']] },
      { k: 'width', t: 'rng', en: 'Base Width (W) mm', fr: 'Largeur Base (W) mm', min: 20, max: 120, step: 2, showIf: (v) => v.bracketType !== 'corner2020' },
      { k: 'height', t: 'rng', en: 'Leg Height (H) mm', fr: 'Hauteur Aile (H) mm', min: 20, max: 120, step: 2, showIf: (v) => v.bracketType !== 'corner2020' },
      { k: 'depth', t: 'rng', en: 'Extrusion Depth (D) mm', fr: 'Profondeur (D) mm', min: 14, max: 80, step: 2, showIf: (v) => v.bracketType !== 'corner2020' },
      { k: 'thickness', t: 'rng', en: 'Wall Thickness mm', fr: 'Épaisseur Paroi mm', min: 3.0, max: 12.0, step: 0.5 },
      { k: 'holeDiam', t: 'rng', en: 'Bolt Hole Ø mm', fr: 'Ø Trous Boulons mm', min: 0, max: 10, step: 0.2 },
      { k: 'holesPerFace', t: 'rng', en: 'Holes per Flange', fr: 'Trous par Face', min: 0, max: 4, step: 1, showIf: (v) => v.bracketType === 'L' || v.bracketType === 'U' },
      { k: 'gussets', t: 'chk', en: 'Side Gusset Ribs', fr: 'Goussets de Rigidité', showIf: (v) => v.bracketType === 'L' || v.bracketType === 'corner2020' }
    ],
    chain: [
      { k: 'innerWidth', t: 'rng', en: 'Internal Cable Width mm', fr: 'Largeur Intérieure Câbles mm', min: 10, max: 45, step: 1 },
      { k: 'innerHeight', t: 'rng', en: 'Internal Cable Height mm', fr: 'Hauteur Intérieure Câbles mm', min: 8, max: 28, step: 1 },
      { k: 'pitch', t: 'rng', en: 'Link Pitch mm', fr: 'Pas du Maillon mm', min: 14, max: 32, step: 1 },
      { k: 'links', t: 'rng', en: 'Link Count', fr: 'Nombre de Maillons', min: 1, max: 14, step: 1 },
      { k: 'bendAngle', t: 'rng', en: 'Bend Angle / Link (°)', fr: 'Angle Courbure / Maillon (°)', min: 0, max: 30, step: 2 },
      { k: 'wallThick', t: 'rng', en: 'Link Wall Thickness mm', fr: 'Épaisseur Paroi mm', min: 1.8, max: 4.5, step: 0.2 }
    ],
    spring: [
      { k: 'springType', t: 'sel', en: 'Spring Type', fr: 'Type de Ressort', opts: [['compression','DIN 2095 Compression (Flat Ends)','Compression DIN 2095 (Bouts Meulés)'],['extension','Extension (Closed Hooks)','Traction (Boucles Fermées)'],['torsion','Torsion (Tangential Legs)','Torsion (Bras Tangentiels)']] },
      { k: 'od', t: 'rng', en: 'Outer Ø (De) mm', fr: 'Diamètre Extérieur (De) mm', min: 8, max: 60, step: 1 },
      { k: 'wireDiam', t: 'rng', en: 'Wire Ø (d) mm', fr: 'Diamètre Fil (d) mm', min: 1.0, max: 6.0, step: 0.2 },
      { k: 'coils', t: 'rng', en: 'Active Coils (n)', fr: 'Spires Utiles (n)', min: 2, max: 16, step: 0.5 },
      { k: 'length', t: 'rng', en: 'Free Length (L0) mm', fr: 'Longueur Libre (L0) mm', min: 14, max: 140, step: 2, showIf: (v) => v.springType !== 'torsion' },
      { k: 'torsionAngle', t: 'rng', en: 'Leg Free Angle (°)', fr: 'Angle Libre des Bras (°)', min: 45, max: 270, step: 15, showIf: (v) => v.springType === 'torsion' }
    ],
    handwheel: [
      { k: 'od', t: 'rng', en: 'Handwheel Outer Ø mm', fr: 'Diamètre Volant mm', min: 60, max: 200, step: 5 },
      { k: 'boreDiam', t: 'rng', en: 'Hub Bore Ø mm', fr: 'Alésage Moyeu Ø mm', min: 5, max: 24, step: 0.5 },
      { k: 'boreType', t: 'sel', en: 'Hub Bore Profile', fr: 'Profil Alésage Moyeu', opts: BORE_OPTS },
      { k: 'spokes', t: 'rng', en: 'Spoke Count', fr: 'Nombre de Bras', min: 3, max: 6, step: 1 },
      { k: 'handle', t: 'chk', en: 'Revolving Crank Handle', fr: 'Poignée Tournante Ergonomique' }
    ]
  };

  /* =========================================================================
     3. STATE, UNDO/REDO & HOST CREDIT BRIDGE
  ========================================================================= */
  function detectLang() {
    const q = new URLSearchParams(window.location.search).get('lang');
    if (q === 'fr' || q === 'en') return q;
    try { const s = localStorage.getItem('sp_lang'); if (s === 'fr' || s === 'en') return s; } catch (_) {}
    return (navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';
  }

  let lang = detectLang();
  let activeFamily = 'all';
  let activeModule = 'gear';
  let fitClass = 'nominal'; // CNC / ISO Nominal 0.00 mm default per owner choice!
  let materialKey = 'steel';
  let params = JSON.parse(JSON.stringify(DEFAULTS));
  let viewport = null;
  let latestBuild = null;
  let rebuildTimer = null;

  function t(en, fr) { return lang === 'fr' ? fr : en; }
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2600);
  }

  // Undo / Redo (25 steps)
  const history = [];
  let histIdx = -1;
  function pushHistory() {
    const snap = JSON.stringify({ activeModule, fitClass, materialKey, params });
    if (histIdx >= 0 && history[histIdx] === snap) return;
    history.splice(histIdx + 1);
    history.push(snap);
    if (history.length > 25) history.shift();
    histIdx = history.length - 1;
    updateUndoUI();
  }
  function updateUndoUI() {
    $('btnUndo').disabled = histIdx <= 0;
    $('btnRedo').disabled = histIdx >= history.length - 1;
  }
  function restoreSnap(snapStr) {
    const d = JSON.parse(snapStr);
    activeModule = d.activeModule;
    fitClass = d.fitClass || 'nominal';
    materialKey = d.materialKey || 'steel';
    params = d.params;
    $('fitSelect').value = fitClass;
    $('matSelect').value = materialKey;
    renderPartList(); renderPresets(); renderControls(); rebuildNow(true); updateUndoUI();
  }
  function undo() { if (histIdx > 0) restoreSnap(history[--histIdx]); }
  function redo() { if (histIdx < history.length - 1) restoreSnap(history[++histIdx]); }

  // Unified Studios-Pro Export Metering Bridge
  const credits = { isPro: false, remaining: 5 };
  try {
    const used = parseInt(localStorage.getItem('sp_mech_exports_used') || '0', 10) || 0;
    credits.remaining = Math.max(0, 5 - used);
  } catch (_) {}

  function updateCreditsBadge() {
    const b = $('creditsBadge');
    if (credits.isPro) { b.textContent = '✦ PRO'; b.classList.add('pro'); }
    else { b.textContent = t(`${credits.remaining} Free`, `${credits.remaining} Gratuits`); b.classList.remove('pro'); }
  }

  let pendingExportResolve = null;
  window.addEventListener('message', (ev) => {
    const d = ev.data || {};
    if (d.type === 'USER_TIER_STATUS' || d.type === 'PREMIUM_STATUS') {
      credits.isPro = !!(d.isPro || d.isPremium || d.tier === 'pro');
      updateCreditsBadge();
    } else if (d.type === 'EXPORT_LIMIT_RESULT' && pendingExportResolve) {
      const fn = pendingExportResolve; pendingExportResolve = null;
      fn(!!d.allowed);
    } else if (d.type === 'SET_LANG' && (d.lang === 'en' || d.lang === 'fr')) {
      lang = d.lang; applyLanguage();
    }
  });

  function checkExportAllowed() {
    if (credits.isPro) return Promise.resolve(true);
    if (window.parent && window.parent !== window) {
      return new Promise((resolve) => {
        pendingExportResolve = resolve;
        window.parent.postMessage({ type: 'CHECK_EXPORT_LIMIT', studio: 'mech-gen-pro' }, '*');
        setTimeout(() => {
          if (pendingExportResolve === resolve) {
            pendingExportResolve = null;
            resolve(consumeLocalCredit());
          }
        }, 700);
      });
    }
    return Promise.resolve(consumeLocalCredit());
  }

  function consumeLocalCredit() {
    if (credits.remaining <= 0) {
      $('paymentModal').classList.add('open');
      return false;
    }
    credits.remaining--;
    try { localStorage.setItem('sp_mech_exports_used', String(5 - credits.remaining)); } catch (_) {}
    updateCreditsBadge();
    return true;
  }

  /* =========================================================================
     4. RENDERING CATALOG, PRESETS, SCHEMA CONTROLS & METROLOGY HUD
  ========================================================================= */
  function populateGlobalSelects() {
    const fitSel = $('fitSelect');
    fitSel.innerHTML = Object.values(C.FIT_CLASSES).map((f) => `<option value="${f.id}">${t(f.en, f.fr)}</option>`).join('');
    fitSel.value = fitClass;

    const matSel = $('matSelect');
    matSel.innerHTML = Object.values(C.MATERIALS).map((m) => `<option value="${m.id}">${t(m.en, m.fr)} (${m.density} g/cm³)</option>`).join('');
    matSel.value = materialKey;
  }

  function renderPartList() {
    const q = ($('partSearch').value || '').trim().toLowerCase();
    const list = $('partList');
    const items = CATALOG.filter((item) => {
      if (activeFamily !== 'all' && item.fam !== activeFamily) return false;
      if (!q) return true;
      return (item.en + ' ' + item.fr + ' ' + item.tagEn + ' ' + item.tagFr + ' ' + item.id).toLowerCase().includes(q);
    });
    list.innerHTML = items.map((item) => `
      <button type="button" class="part-card ${item.id === activeModule ? 'active' : ''}" data-mod="${item.id}">
        <div class="part-ico">${item.ico}</div>
        <div class="part-meta">
          <div class="part-name">${t(item.en, item.fr)}</div>
          <div class="part-tag">${t(item.tagEn, item.tagFr)}</div>
        </div>
      </button>`).join('');

    list.querySelectorAll('.part-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeModule = btn.dataset.mod;
        if (viewport) {
          viewport.setExplode(0);
          $('explodeSlider').value = 0; $('explodeVal').textContent = '0%';
          viewport.resetKinematics();
        }
        renderPartList(); renderPresets(); renderControls(); rebuildNow(true); pushHistory();
        if (window.innerWidth <= 900) setMobilePane('viewport');
      });
    });
  }

  function renderPresets() {
    const list = PRESETS[activeModule] || [];
    const host = $('presetList');
    $('presetsCard').style.display = list.length ? '' : 'none';
    host.innerHTML = list.map((pr, idx) => `<button type="button" class="preset-chip" data-pidx="${idx}">${pr.label}</button>`).join('');
    host.querySelectorAll('.preset-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pr = list[Number(btn.dataset.pidx)];
        if (!pr) return;
        params[activeModule] = Object.assign({}, params[activeModule], pr.v);
        renderControls(); rebuildNow(true); pushHistory();
        toast(t(`Applied ISO Preset: ${pr.label}`, `Préréglage ISO appliqué : ${pr.label}`));
      });
    });
  }

  function renderControls() {
    const schema = SCHEMAS[activeModule] || [];
    const cur = params[activeModule];
    const host = $('controlsHost');
    host.innerHTML = '';

    for (let i = 0; i < schema.length; i++) {
      const f = schema[i];
      if (f.showIf && !f.showIf(cur)) continue;
      const wrap = document.createElement('div');
      wrap.className = 'ctrl';

      if (f.t === 'rng') {
        const val = cur[f.k];
        wrap.innerHTML = `
          <div class="ctrl-head">
            <span>${t(f.en, f.fr)}</span>
            <input type="number" class="ctrl-num" value="${val}" min="${f.min}" max="${f.max}" step="${f.step}" />
          </div>
          <input type="range" class="ctrl-range" value="${val}" min="${f.min}" max="${f.max}" step="${f.step}" />`;
        const rng = wrap.querySelector('.ctrl-range');
        const num = wrap.querySelector('.ctrl-num');
        const applyVal = (v, commit) => {
          const nv = C.clamp(parseFloat(v) || f.min, f.min, f.max);
          cur[f.k] = nv; rng.value = nv; num.value = nv;
          scheduleRebuild(false);
          if (commit) pushHistory();
        };
        rng.addEventListener('input', () => applyVal(rng.value, false));
        rng.addEventListener('change', () => pushHistory());
        num.addEventListener('change', () => applyVal(num.value, true));
      } else if (f.t === 'sel') {
        wrap.innerHTML = `
          <div class="ctrl-head"><span>${t(f.en, f.fr)}</span></div>
          <select class="ctrl-select">
            ${f.opts.map((o) => `<option value="${o[0]}" ${String(cur[f.k]) === String(o[0]) ? 'selected' : ''}>${t(o[1], o[2] || o[1])}</option>`).join('')}
          </select>`;
        const sel = wrap.querySelector('select');
        sel.addEventListener('change', () => {
          cur[f.k] = f.num ? Number(sel.value) : sel.value;
          renderControls(); rebuildNow(false); pushHistory();
        });
      } else if (f.t === 'chk') {
        wrap.innerHTML = `<label class="ctrl-check"><span>${t(f.en, f.fr)}</span><input type="checkbox" ${cur[f.k] ? 'checked' : ''} /></label>`;
        const cb = wrap.querySelector('input');
        cb.addEventListener('change', () => {
          cur[f.k] = cb.checked;
          renderControls(); rebuildNow(false); pushHistory();
        });
      }
      host.appendChild(wrap);
    }
  }

  function updateHUD(build) {
    const item = CATALOG.find((x) => x.id === activeModule);
    $('activePartTitle').textContent = (item ? t(item.en, item.fr) : activeModule).toUpperCase();
    const st = build.stats;
    const b = st.bounds;
    const pf = st.preflight;

    $('hudStd').textContent = (build.specs && build.specs.standard) || 'ISO / DIN';
    const pfBtn = $('btnPreflight');
    pfBtn.textContent = `${pf.score}/100`;
    pfBtn.className = 'hud-pf' + (pf.score < 70 ? ' fail' : (pf.score < 95 ? ' warn' : ''));

    const dimStr = `${b.sx.toFixed(2)}×${b.sy.toFixed(2)}×${b.sz.toFixed(2)} mm`;
    $('exportDimTag').textContent = `${b.sx.toFixed(1)}×${b.sy.toFixed(1)}×${b.sz.toFixed(1)} mm`;

    const rows = [
      { k: t('Bounds X×Y×Z', 'Cotes X×Y×Z'), v: dimStr },
      { k: t('Volume / Mass', 'Volume / Masse'), v: `${st.volumeCm3.toFixed(2)} cm³ · ${st.massGrams.toFixed(1)} g` },
      { k: t('Mesh Integrity', 'Intégrité 3D'), v: st.manifold.watertight ? `✓ Watertight (${st.manifold.triangles.toLocaleString()} Δ)` : `⚠ ${st.manifold.boundaryEdges} open` }
    ];
    if (build.specs && build.specs.metrics) {
      for (let i = 0; i < Math.min(4, build.specs.metrics.length); i++) rows.push(build.specs.metrics[i]);
    }
    $('hudRows').innerHTML = rows.map((r) => `<div class="hud-row"><span class="hud-k">${r.k}</span><span class="hud-v">${r.v}</span></div>`).join('');
  }

  /* =========================================================================
     5. REBUILD ENGINE
  ========================================================================= */
  function scheduleRebuild(refit) {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => rebuildNow(refit), 18);
  }

  function rebuildNow(refit) {
    const fn = ENGINES[activeModule];
    if (!fn) return;
    try {
      const tol = C.getFitTol(fitClass);
      const raw = fn(params[activeModule], tol);
      raw.stats = C.analyzeBuild(raw.parts, raw.specs, { material: materialKey, fitClass });
      latestBuild = raw;
      updateHUD(raw);
      if (viewport) viewport.setBuild(raw, materialKey, !!refit);
    } catch (err) {
      console.error('[MechGenPro] Build error:', err);
      toast(t('Geometry constraint clamped', 'Contrainte géométrique ajustée'));
    }
  }

  /* =========================================================================
     6. EXPORTS (1:1 mm STL, OBJ, 1:1 m GLB, DXF mm, SVG mm, HTML SPEC SHEET, AR)
  ========================================================================= */
  function dlBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function baseFilename() { return `mechgen_${activeModule}_${fitClass}_${Date.now()}`; }

  async function doExportSTL() {
    if (!latestBuild) return;
    if (!(await checkExportAllowed())) return;
    const bin = C.exportBinarySTL(latestBuild.parts);
    dlBlob(new Blob([bin], { type: 'application/octet-stream' }), baseFilename() + '.stl');
    toast(t('1:1 mm Watertight Binary STL exported!', 'STL Binarisé 1:1 mm étanche exporté !'));
  }

  async function doExportOBJ() {
    if (!latestBuild) return;
    if (!(await checkExportAllowed())) return;
    dlBlob(new Blob([C.exportOBJ(latestBuild.parts)], { type: 'text/plain' }), baseFilename() + '.obj');
    toast(t('1:1 mm OBJ exported!', 'OBJ 1:1 mm exporté !'));
  }

  async function doExportGLB() {
    if (!latestBuild || !viewport) return;
    if (!(await checkExportAllowed())) return;
    const blob = await viewport.exportGLB();
    dlBlob(blob, baseFilename() + '.glb');
    toast(t('1:1 m PBR GLB exported!', 'GLB PBR 1:1 m exporté !'));
  }

  async function doExportDXF() {
    if (!latestBuild) return;
    if (!(await checkExportAllowed())) return;
    const dxf = C.exportDXF(latestBuild.draw2D, latestBuild.parts);
    dlBlob(new Blob([dxf], { type: 'application/dxf' }), baseFilename() + '.dxf');
    toast(t('AutoCAD R12 1:1 mm DXF exported!', 'DXF R12 1:1 mm exporté !'));
  }

  async function doExportSVG() {
    if (!latestBuild) return;
    if (!(await checkExportAllowed())) return;
    const svg = C.exportSVG(latestBuild.draw2D, latestBuild.parts, activeModule);
    dlBlob(new Blob([svg], { type: 'image/svg+xml' }), baseFilename() + '.svg');
    toast(t('Exact 1:1 mm SVG exported!', 'SVG Exact 1:1 mm exporté !'));
  }

  async function doExportHtmlSheet() {
    if (!latestBuild || !viewport) return;
    if (!(await checkExportAllowed())) return;
    const glbBlob = await viewport.exportGLB();
    const b64 = await new Promise((res) => {
      const r = new FileReader();
      r.onloadend = () => res(String(r.result).split(',')[1]);
      r.readAsDataURL(glbBlob);
    });
    const st = latestBuild.stats;
    const item = CATALOG.find((x) => x.id === activeModule);
    const title = item ? item.en : activeModule;
    const rowsHtml = [
      `<tr><td>Standard</td><td>${(latestBuild.specs && latestBuild.specs.standard) || 'ISO / DIN'}</td></tr>`,
      `<tr><td>Exact 1:1 mm Bounds</td><td>${st.bounds.sx.toFixed(2)} × ${st.bounds.sy.toFixed(2)} × ${st.bounds.sz.toFixed(2)} mm</td></tr>`,
      `<tr><td>Fit Class</td><td>${st.fitClass.en}</td></tr>`,
      `<tr><td>Material &amp; Mass</td><td>${st.material.en} (${st.material.density} g/cm³) — <b>${st.massGrams.toFixed(1)} g</b> (${st.volumeCm3.toFixed(2)} cm³)</td></tr>`,
      `<tr><td>Manifold Audit</td><td>${st.manifold.watertight ? '100% Watertight (0 open edges)' : 'Review'} · ${st.manifold.triangles.toLocaleString()} tris</td></tr>`,
      ...((latestBuild.specs && latestBuild.specs.metrics) || []).map((m) => `<tr><td>${m.k}</td><td>${m.v}</td></tr>`)
    ].join('');

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — ISO Engineering Spec Sheet | Studios-Pro</title>
<style>body{margin:0;background:#070b13;color:#f1f5f9;font-family:Inter,system-ui,sans-serif;display:grid;grid-template-columns:1fr 340px;height:100vh;overflow:hidden}
#c{width:100%;height:100%}aside{background:#0e1525;border-left:1px solid #1e293b;padding:20px;overflow-y:auto}
h1{font-size:17px;color:#f97316;margin:0 0 6px}p{font-size:12px;color:#94a3b8;margin:0 0 14px}
table{width:100%;border-collapse:collapse;font-size:12px}td{padding:7px 4px;border-bottom:1px solid #1e293b}td:first-child{color:#94a3b8}td:last-child{text-align:right;font-family:monospace;font-weight:700}
@media(max-width:800px){body{grid-template-columns:1fr;grid-template-rows:55vh 45vh}}</style>
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/"}}</script>
</head><body><div id="c"></div><aside><h1>${title}</h1><p>Generated by Studios-Pro Mech Gen Pro · Exact 1:1 mm ISO/DIN Parametric CAD</p><table>${rowsHtml}</table></aside>
<script type="module">import * as THREE from 'three';import {OrbitControls} from 'three/addons/controls/OrbitControls.js';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
const el=document.getElementById('c');const scene=new THREE.Scene();const cam=new THREE.PerspectiveCamera(40,el.clientWidth/el.clientHeight,0.001,100);
const ren=new THREE.WebGLRenderer({antialias:true});ren.setSize(el.clientWidth,el.clientHeight);ren.toneMapping=THREE.ACESFilmicToneMapping;el.appendChild(ren.domElement);
const pm=new THREE.PMREMGenerator(ren);scene.environment=pm.fromScene(new RoomEnvironment(),0.04).texture;scene.add(new THREE.HemisphereLight(0xffffff,0x334155,0.8));
const dl=new THREE.DirectionalLight(0xffffff,1.6);dl.position.set(2,3,2);scene.add(dl);const ctrl=new OrbitControls(cam,ren.domElement);ctrl.enableDamping=true;
const bytes=Uint8Array.from(atob("${b64}"),c=>c.charCodeAt(0));
new GLTFLoader().parse(bytes.buffer,'',g=>{scene.add(g.scene);const b=new THREE.Box3().setFromObject(g.scene);const ctr=b.getCenter(new THREE.Vector3());const sz=b.getSize(new THREE.Vector3());
const d=Math.max(sz.x,sz.y,sz.z)*2.1||0.1;ctrl.target.copy(ctr);cam.position.set(ctr.x+d*0.8,ctr.y+d*0.65,ctr.z+d*0.9);ctrl.update();});
function loop(){requestAnimationFrame(loop);ctrl.update();ren.render(scene,cam);}loop();
window.addEventListener('resize',()=>{cam.aspect=el.clientWidth/el.clientHeight;cam.updateProjectionMatrix();ren.setSize(el.clientWidth,el.clientHeight);});
</script></body></html>`;
    dlBlob(new Blob([html], { type: 'text/html' }), baseFilename() + '_spec_sheet.html');
    toast(t('Interactive 3D Technical Spec Sheet exported!', 'Fiche Technique 3D Interactive exportée !'));
  }

  /* =========================================================================
     7. HOST COMPATIBILITY CONTRACTS (REMIX / TAGS / AR / BACK)
  ========================================================================= */
  window.getAppState = function () {
    return {
      studio: 'mech-gen-pro',
      version: 2,
      activeModule,
      fitClass,
      materialKey,
      params: params[activeModule]
    };
  };

  window.getAppTags = function () {
    const item = CATALOG.find((x) => x.id === activeModule);
    const st = latestBuild && latestBuild.stats;
    return [{
      x: 50, y: 30,
      label_en: item ? item.en : activeModule,
      label_fr: item ? item.fr : activeModule,
      desc_en: st ? `${st.bounds.sx.toFixed(1)}×${st.bounds.sy.toFixed(1)}×${st.bounds.sz.toFixed(1)} mm · ${st.massGrams.toFixed(1)}g (${st.material.en})` : 'ISO 1:1 mm mechanical part',
      desc_fr: st ? `${st.bounds.sx.toFixed(1)}×${st.bounds.sy.toFixed(1)}×${st.bounds.sz.toFixed(1)} mm · ${st.massGrams.toFixed(1)}g (${st.material.fr})` : 'Pièce mécanique ISO 1:1 mm'
    }];
  };

  function checkRemixRestore() {
    try {
      const raw = localStorage.getItem('sp_remix_state');
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d && d.studio === 'mech-gen-pro' && d.activeModule && ENGINES[d.activeModule]) {
        activeModule = d.activeModule;
        if (d.fitClass && C.FIT_CLASSES[d.fitClass]) fitClass = d.fitClass;
        if (d.materialKey && C.MATERIALS[d.materialKey]) materialKey = d.materialKey;
        if (d.params) params[activeModule] = Object.assign({}, DEFAULTS[activeModule], d.params);
        localStorage.removeItem('sp_remix_state');
      }
    } catch (_) {}
  }

  function applyLanguage() {
    document.body.dataset.lang = lang;
    try { localStorage.setItem('sp_lang', lang); } catch (_) {}
    $('partSearch').placeholder = t('🔍 Search 28 parts (gear, M8, 608, 2020...)', '🔍 Rechercher 28 pièces (M8, 608, 2020...)');
    populateGlobalSelects();
    renderPartList();
    renderControls();
    updateCreditsBadge();
    if (latestBuild) updateHUD(latestBuild);
  }

  function setMobilePane(pane) {
    document.body.dataset.mobilePane = pane;
    document.querySelectorAll('.mobile-tab').forEach((b) => b.classList.toggle('active', b.dataset.mobileTarget === pane));
    if (pane === 'viewport' && viewport) setTimeout(() => viewport.resize(), 40);
  }

  /* =========================================================================
     8. EVENT BINDINGS & BOOT
  ========================================================================= */
  function bindEvents() {
    $('back-btn').addEventListener('click', () => {
      if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'CLOSE_STUDIO' }, '*');
      else window.location.href = '/';
    });

    $('langToggle').addEventListener('click', () => {
      lang = lang === 'en' ? 'fr' : 'en';
      applyLanguage();
    });

    document.querySelectorAll('.mobile-tab').forEach((b) => {
      b.addEventListener('click', () => setMobilePane(b.dataset.mobileTarget));
    });

    $('partSearch').addEventListener('input', renderPartList);
    $('familyPills').querySelectorAll('.cat-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeFamily = btn.dataset.fam;
        $('familyPills').querySelectorAll('.cat-pill').forEach((x) => x.classList.toggle('active', x === btn));
        renderPartList();
      });
    });

    $('fitSelect').addEventListener('change', (e) => {
      fitClass = e.target.value; rebuildNow(false); pushHistory();
    });
    $('matSelect').addEventListener('change', (e) => {
      materialKey = e.target.value; rebuildNow(false); pushHistory();
    });

    $('btnResetPart').addEventListener('click', () => {
      params[activeModule] = JSON.parse(JSON.stringify(DEFAULTS[activeModule]));
      renderControls(); rebuildNow(true); pushHistory();
      toast(t('Parameters reset to ISO default', 'Paramètres réinitialisés'));
    });

    // Camera & Shading pills
    document.querySelectorAll('[data-cam]').forEach((b) => {
      b.addEventListener('click', () => { if (viewport) viewport.fitCamera(b.dataset.cam); });
    });
    document.querySelectorAll('[data-shade]').forEach((b) => {
      b.addEventListener('click', () => {
        document.querySelectorAll('[data-shade]').forEach((x) => x.classList.toggle('active', x === b));
        if (viewport) viewport.setViewMode(b.dataset.shade);
      });
    });
    $('btnToggleGrid').addEventListener('click', (e) => {
      const on = !e.currentTarget.classList.contains('active');
      e.currentTarget.classList.toggle('active', on);
      if (viewport) viewport.setGridVisible(on);
    });
    $('btnToggleSpin').addEventListener('click', (e) => {
      const on = !e.currentTarget.classList.contains('active');
      e.currentTarget.classList.toggle('active', on);
      if (viewport) viewport.setAutoRotate(on);
    });

    // Kinematics
    $('btnKinPlay').addEventListener('click', (e) => {
      const on = !e.currentTarget.classList.contains('active');
      e.currentTarget.classList.toggle('active', on);
      if (viewport) viewport.setKinematics(on, 1.0);
    });
    $('btnKinReset').addEventListener('click', () => {
      $('btnKinPlay').classList.remove('active');
      if (viewport) { viewport.setKinematics(false); viewport.resetKinematics(); }
    });

    // Live GPU Cross-Section Cutaway
    document.querySelectorAll('[data-cut]').forEach((b) => {
      b.addEventListener('click', () => {
        const axis = b.dataset.cut;
        document.querySelectorAll('[data-cut]').forEach((x) => x.classList.toggle('active', x === b));
        $('cutSlider').disabled = (axis === 'off');
        if (viewport) viewport.setCutaway(axis, Number($('cutSlider').value) / 100);
      });
    });
    $('cutSlider').addEventListener('input', (e) => {
      const activeBtn = document.querySelector('[data-cut].active');
      const axis = activeBtn ? activeBtn.dataset.cut : 'off';
      if (viewport && axis !== 'off') viewport.setCutaway(axis, Number(e.target.value) / 100);
    });

    // Exploded Assembly Slider
    $('explodeSlider').addEventListener('input', (e) => {
      const pct = Number(e.target.value);
      $('explodeVal').textContent = `${pct}%`;
      if (viewport) viewport.setExplode(pct / 100);
    });

    // Save / Load .spmech (FREE!)
    $('btnSaveProj').addEventListener('click', () => {
      const payload = { format: 'spmech', version: 2, activeModule, fitClass, materialKey, params };
      dlBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `mechgen_${activeModule}.spmech`);
      toast(t('.spmech project saved (Free)', 'Projet .spmech sauvegardé (Gratuit)'));
    });
    $('btnLoadProj').addEventListener('click', () => $('projFileInput').click());
    $('projFileInput').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const d = JSON.parse(r.result);
          if (d.activeModule && ENGINES[d.activeModule] && d.params) {
            activeModule = d.activeModule;
            if (d.fitClass) fitClass = d.fitClass;
            if (d.materialKey) materialKey = d.materialKey;
            params = Object.assign(JSON.parse(JSON.stringify(DEFAULTS)), d.params);
            populateGlobalSelects(); renderPartList(); renderPresets(); renderControls(); rebuildNow(true); pushHistory();
            toast(t('.spmech project restored!', 'Projet .spmech restauré !'));
          }
        } catch (_) { toast(t('Invalid .spmech file', 'Fichier .spmech invalide')); }
      };
      r.readAsText(f);
      e.target.value = '';
    });

    // Undo / Redo / PNG / AR / Exports
    $('btnUndo').addEventListener('click', undo);
    $('btnRedo').addEventListener('click', redo);
    $('btnSnap').addEventListener('click', () => {
      if (!viewport) return;
      const a = document.createElement('a');
      a.href = viewport.capturePNG(credits.isPro);
      a.download = baseFilename() + '.png';
      a.click();
      toast(t('Studio PNG saved (Free)!', 'Rendu PNG sauvegardé (Gratuit) !'));
    });

    $('btnExportStl').addEventListener('click', doExportSTL);
    $('btnExportStlTop').addEventListener('click', doExportSTL);
    $('btnExportObj').addEventListener('click', doExportOBJ);
    $('btnExportGlb').addEventListener('click', doExportGLB);
    $('btnExportDxf').addEventListener('click', doExportDXF);
    $('btnExportSvg').addEventListener('click', doExportSVG);
    $('btnExportHtml').addEventListener('click', doExportHtmlSheet);

    $('btnPreviewAr').addEventListener('click', async () => {
      if (!viewport) return;
      try {
        toast(t('Opening exact 1:1 m WebAR Preview…', 'Ouverture WebAR 1:1 m exacte…'));
        await viewport.sendToWebAR(`MechGenPro_${activeModule}`);
      } catch (_) {
        toast(t('AR Bridge requires host Studios-Pro', 'Le pont AR nécessite Studios-Pro'));
      }
    });

    // Pre-Flight Modal
    $('btnPreflight').addEventListener('click', () => {
      if (!latestBuild) return;
      const pf = latestBuild.stats.preflight;
      $('preflightBody').innerHTML = `
        <div style="font-size:24px;font-weight:900;color:${pf.score >= 90 ? 'var(--emerald)' : 'var(--amber)'}">${pf.score} / 100 · ${pf.grade}</div>
        ${pf.checks.map((c) => `<div class="check-item ${c.status}">${c.status === 'pass' ? '✅' : (c.status === 'warn' ? '⚠️' : '❌')} ${t(c.en, c.fr)}</div>`).join('')}`;
      $('preflightModal').classList.add('open');
    });

    $('btnUpgradePro').addEventListener('click', () => {
      $('paymentModal').classList.remove('open');
      if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'SHOW_PAYWALL_MODAL' }, '*');
      else window.open('/pricing', '_blank');
    });

    document.querySelectorAll('[data-close-modal]').forEach((b) => {
      b.addEventListener('click', () => $(b.dataset.closeModal).classList.remove('open'));
    });
    document.querySelectorAll('.modal-backdrop').forEach((bd) => {
      bd.addEventListener('click', (e) => { if (e.target === bd) bd.classList.remove('open'); });
    });

    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    });
  }

  function initViewport() {
    if (viewport || !window.MechViewport) return;
    viewport = new window.MechViewport($('viewport'));
    rebuildNow(true);
  }

  function boot() {
    checkRemixRestore();
    bindEvents();
    applyLanguage();
    renderPresets();
    pushHistory();
    if (window.MechViewport) initViewport();
    else {
      window.addEventListener('mech-viewport-ready', initViewport, { once: true });
      rebuildNow(false);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
