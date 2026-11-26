/**
 * Architect Pro 1 (v2.0) — Core Architectural CAD Engine
 * Units (m/cm/in/ft), 24-Item Furniture/Structure Catalog, Magnetic Snap,
 * Planar Auto-Room Detection (m²), BOM Cost Engine, Smart AI Architect v2,
 * 6 Pro Templates, and 1:1 AutoCAD DXF R12 & SVG 2D Floor Plan Exporters.
 *
 * Pure UMD module (zero DOM dependency -> 100% testable in Node.js).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ArchCore = factory();
  }
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  // ============================================================================
  // 1. EXACT UNIT CONVERSION (Canonical storage = centimeters)
  // ============================================================================
  const UNIT_FACTORS = {
    cm: 1,
    m: 100,
    in: 2.54,
    ft: 30.48
  };

  function cmToUnit(cm, unit) {
    const f = UNIT_FACTORS[unit] || 1;
    return (Number(cm) || 0) / f;
  }

  function unitToCm(val, unit) {
    const f = UNIT_FACTORS[unit] || 1;
    return (Number(val) || 0) * f;
  }

  function formatLength(cm, unit) {
    const u = UNIT_FACTORS[unit] ? unit : 'm';
    const v = cmToUnit(cm, u);
    const dec = u === 'cm' ? 0 : (u === 'in' ? 1 : 2);
    return `${v.toFixed(dec)} ${u}`;
  }

  function formatArea(sqM, unit) {
    if (unit === 'ft' || unit === 'in') {
      return `${(sqM * 10.7639104).toFixed(1)} ft²`;
    }
    return `${sqM.toFixed(1)} m²`;
  }

  // ============================================================================
  // 2. 25-ITEM 3D FURNITURE, KITCHEN, BATH, STAIRS & OUTDOOR CATALOG
  // ============================================================================
  const CATALOG = {
    // Living & Bedroom (Original 10 upgraded!)
    sofa:            { cat: 'living',    w: 220, l: 95,  h: 82,  color: '#475569', cost: 850,  icon: '🛋️', en: 'Sofa',             fr: 'Canapé' },
    table:           { cat: 'living',    w: 130, l: 75,  h: 46,  color: '#8B5A2B', cost: 280,  icon: '🪵', en: 'Coffee Table',     fr: 'Table Basse' },
    chair:           { cat: 'living',    w: 58,  l: 58,  h: 86,  color: '#9A6B42', cost: 120,  icon: '🪑', en: 'Chair',            fr: 'Chaise' },
    tv:              { cat: 'living',    w: 160, l: 42,  h: 115, color: '#1E293B', cost: 650,  icon: '📺', en: 'TV & Console',     fr: 'TV & Meuble' },
    bookshelf:       { cat: 'living',    w: 120, l: 38,  h: 210, color: '#784A24', cost: 340,  icon: '📚', en: 'Bookshelf',        fr: 'Bibliothèque' },
    lamp:            { cat: 'living',    w: 42,  l: 42,  h: 165, color: '#D4AF37', cost: 140,  icon: '🛋', en: 'Floor Lamp',       fr: 'Lampadaire' },
    plant:           { cat: 'living',    w: 52,  l: 52,  h: 125, color: '#15803D', cost: 75,   icon: '🪴', en: 'Indoor Plant',     fr: 'Plante' },
    bed:             { cat: 'bedroom',   w: 170, l: 210, h: 95,  color: '#64748B', cost: 950,  icon: '🛏️', en: 'Double Bed',       fr: 'Lit Double' },
    cabinet:         { cat: 'bedroom',   w: 160, l: 60,  h: 220, color: '#926239', cost: 580,  icon: '🗄️', en: 'Wardrobe',         fr: 'Armoire' },
    desk:            { cat: 'bedroom',   w: 150, l: 75,  h: 76,  color: '#A16207', cost: 360,  icon: '💻', en: 'Office Desk',      fr: 'Bureau' },

    // Kitchen & Dining
    kitchen_counter: { cat: 'kitchen',   w: 240, l: 65,  h: 90,  color: '#E2E8F0', cost: 1450, icon: '🍳', en: 'Kitchen Counter',  fr: 'Plan de Cuisine' },
    kitchen_island:  { cat: 'kitchen',   w: 180, l: 90,  h: 90,  color: '#CBD5E1', cost: 1100, icon: '🍽️', en: 'Kitchen Island',   fr: 'Îlot Central' },
    fridge:          { cat: 'kitchen',   w: 80,  l: 75,  h: 195, color: '#94A3B8', cost: 980,  icon: '🧊', en: 'Refrigerator',     fr: 'Réfrigérateur' },
    dining_set:      { cat: 'kitchen',   w: 180, l: 110, h: 78,  color: '#7C4A22', cost: 790,  icon: '🪑', en: 'Dining Set (4p)',  fr: 'Table à Manger' },

    // Bathroom
    bathtub:         { cat: 'bath',      w: 175, l: 80,  h: 60,  color: '#F8FAFC', cost: 780,  icon: '🛁', en: 'Bathtub',          fr: 'Baignoire' },
    shower:          { cat: 'bath',      w: 100, l: 100, h: 210, color: '#E0F2FE', cost: 640,  icon: '🚿', en: 'Walk-in Shower',   fr: 'Douche Italienne' },
    toilet:          { cat: 'bath',      w: 44,  l: 68,  h: 80,  color: '#F8FAFC', cost: 290,  icon: '🚽', en: 'Toilet (WC)',      fr: 'Toilettes (WC)' },
    vanity:          { cat: 'bath',      w: 100, l: 52,  h: 85,  color: '#E2E8F0', cost: 420,  icon: '🚰', en: 'Vanity Sink',      fr: 'Lavabo Meuble' },

    // Structural & Circulation (Stairs, Columns, Railing)
    stairs_straight: { cat: 'structure', w: 110, l: 320, h: 280, color: '#9A6B42', cost: 2400, icon: '🪜', en: 'Straight Stairs',  fr: 'Escalier Droit' },
    stairs_l:        { cat: 'structure', w: 220, l: 260, h: 280, color: '#9A6B42', cost: 3100, icon: '📐', en: 'L-Shape Stairs',   fr: 'Escalier en L' },
    stairs_spiral:   { cat: 'structure', w: 170, l: 170, h: 280, color: '#475569', cost: 3400, icon: '🌀', en: 'Spiral Stairs',    fr: 'Escalier Colimaçon' },
    column:          { cat: 'structure', w: 35,  l: 35,  h: 280, color: '#CBD5E1', cost: 240,  icon: '🏛️', en: 'Structural Column', fr: 'Colonne / Pilier' },
    railing:         { cat: 'structure', w: 200, l: 12,  h: 105, color: '#334155', cost: 310,  icon: '🚧', en: 'Glass Railing',    fr: 'Garde-Corps Verre' },

    // Outdoor
    pool:            { cat: 'outdoor',   w: 500, l: 300, h: 20,  color: '#0EA5E9', cost: 6500, icon: '🏊', en: 'Swimming Pool',    fr: 'Piscine' },
    tree:            { cat: 'outdoor',   w: 140, l: 140, h: 320, color: '#16A34A', cost: 180,  icon: '🌳', en: 'Garden Tree',      fr: 'Arbre Jardin' }
  };

  // ============================================================================
  // 3. WALL GEOMETRY, SNAPPING & SAFE OPENING CLAMPING
  // ============================================================================
  function wallLength(w) {
    return Math.hypot((w.x2 || 0) - (w.x1 || 0), (w.y2 || 0) - (w.y1 || 0));
  }

  /**
   * Resizes wall length by moving (x2, y2) along wall direction so 2D & 3D stay 100% synced!
   */
  function resizeWallLength(wall, newLenCm) {
    const target = Math.max(20, Number(newLenCm) || 100);
    const dx = wall.x2 - wall.x1;
    const dy = wall.y2 - wall.y1;
    const cur = Math.hypot(dx, dy);
    if (cur < 1e-4) {
      wall.x2 = wall.x1 + target;
      wall.y2 = wall.y1;
    } else {
      wall.x2 = wall.x1 + (dx / cur) * target;
      wall.y2 = wall.y1 + (dy / cur) * target;
    }
    wall.length = target;
    return wall;
  }

  /**
   * Guarantees door/window hole stays strictly inside wall span [margin..len-margin]
   * so Three.js ExtrudeGeometry Earcut triangulation NEVER breaks near corners!
   */
  function clampOpeningOnWall(op, wall) {
    if (!wall) return op;
    const len = wallLength(wall);
    wall.length = len;
    const margin = Math.max(8, (wall.thick || 20) * 0.55);
    const maxW = Math.max(30, len - margin * 2);
    const ow = Math.min(Math.max(30, Number(op.length) || 90), maxW);
    op.length = ow;

    const minT = (margin + ow * 0.5) / Math.max(1, len);
    const maxT = 1 - minT;
    if (minT >= maxT) {
      op.t = 0.5;
    } else {
      op.t = Math.max(minT, Math.min(maxT, Number(op.t) || 0.5));
    }

    const wh = Number(wall.height) || 280;
    const elev = Math.max(0, Math.min(wh - 30, Number(op.elevation) || 0));
    op.elevation = elev;
    op.height = Math.max(30, Math.min(wh - elev - 5, Number(op.height) || (op.type === 'door' ? 210 : 120)));
    return op;
  }

  /**
   * Deletes an element AND cleans up orphaned doors/windows attached to a deleted wall!
   */
  function deleteElementCascade(elements, id) {
    return elements.filter(el => el.id !== id && el.wallId !== id);
  }

  /**
   * Magnetic 2D CAD Snap (World cm):
   * 1) Wall Endpoints (18 cm radius)
   * 2) Wall Midpoints (14 cm radius)
   * 3) Grid (gridStep cm)
   */
  function snapWorldPoint(wx, wy, elements, activeFloor, opts) {
    const o = Object.assign({ snapEndpoints: true, snapGrid: true, gridStep: 10, endTol: 18, midTol: 14, excludeId: null }, opts || {});

    if (o.snapEndpoints && Array.isArray(elements)) {
      let best = null, bestD = o.endTol;
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        if (el.type !== 'wall' || el.id === o.excludeId) continue;
        if ((el.floor || 0) !== (activeFloor || 0)) continue;
        const pts = [
          { x: el.x1, y: el.y1, kind: 'endpoint' },
          { x: el.x2, y: el.y2, kind: 'endpoint' },
          { x: (el.x1 + el.x2) * 0.5, y: (el.y1 + el.y2) * 0.5, kind: 'midpoint' }
        ];
        for (let k = 0; k < pts.length; k++) {
          const tol = pts[k].kind === 'endpoint' ? bestD : Math.min(bestD, o.midTol);
          const d = Math.hypot(wx - pts[k].x, wy - pts[k].y);
          if (d < tol) {
            bestD = d;
            best = pts[k];
          }
        }
      }
      if (best) return { x: best.x, y: best.y, snapped: best.kind };
    }

    if (o.snapGrid && o.gridStep > 0) {
      return {
        x: Math.round(wx / o.gridStep) * o.gridStep,
        y: Math.round(wy / o.gridStep) * o.gridStep,
        snapped: 'grid'
      };
    }
    return { x: wx, y: wy, snapped: null };
  }

  /**
   * World-coordinate Ortho / 45-deg Angle Snap (fixes old screen-vs-dragStart bug!).
   */
  function snapOrthoWorld(startX, startY, curX, curY, allow45, thresholdDeg) {
    const dx = curX - startX;
    const dy = curY - startY;
    const len = Math.hypot(dx, dy);
    if (len < 1) return { x: curX, y: curY, snappedAngle: null };

    const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
    const step = allow45 ? 45 : 90;
    const nearest = Math.round(deg / step) * step;
    const diff = Math.abs(deg - nearest);
    const tol = thresholdDeg || 10;

    if (diff <= tol) {
      const rad = (nearest * Math.PI) / 180;
      return {
        x: startX + Math.cos(rad) * len,
        y: startY + Math.sin(rad) * len,
        snappedAngle: ((nearest % 360) + 360) % 360
      };
    }
    return { x: curX, y: curY, snappedAngle: null };
  }

  // ============================================================================
  // 4. PLANAR AUTO-ROOM DETECTION (EXACT AREA m² + SMART ROOM NAMING!)
  // ============================================================================
  function polySignedArea(pts) {
    let a = 0;
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i], p2 = pts[(i + 1) % pts.length];
      a += p1.x * p2.y - p2.x * p1.y;
    }
    return a * 0.5;
  }

  function pointInPoly(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y;
      const xj = poly[j].x, yj = poly[j].y;
      const hit = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi);
      if (hit) inside = !inside;
    }
    return inside;
  }

  /**
   * Detects all closed interior rooms formed by walls on `floor` (handles T-junctions & shared interior walls!).
   */
  function detectRooms(elements, floor) {
    const walls = (elements || []).filter(e => e.type === 'wall' && (e.floor || 0) === (floor || 0));
    if (walls.length < 3) return [];

    // Step 1: Split walls at T-junctions & intersections so interior partition rooms close cleanly!
    const SNAP = 18; // cm merge tolerance
    const splitPoints = walls.map(() => [0, 1]);

    for (let i = 0; i < walls.length; i++) {
      const a = walls[i];
      for (let j = i + 1; j < walls.length; j++) {
        const b = walls[j];
        // Check endpoints of b lying on segment a
        [ [b.x1, b.y1], [b.x2, b.y2] ].forEach(([px, py]) => {
          const t = projParam(px, py, a.x1, a.y1, a.x2, a.y2);
          if (t.t > 0.02 && t.t < 0.98 && t.dist < SNAP) splitPoints[i].push(t.t);
        });
        // Check endpoints of a lying on segment b
        [ [a.x1, a.y1], [a.x2, a.y2] ].forEach(([px, py]) => {
          const t = projParam(px, py, b.x1, b.y1, b.x2, b.y2);
          if (t.t > 0.02 && t.t < 0.98 && t.dist < SNAP) splitPoints[j].push(t.t);
        });
        // Segment-segment intersection
        const inter = segIntersect(a.x1, a.y1, a.x2, a.y2, b.x1, b.y1, b.x2, b.y2);
        if (inter && inter.t > 0.02 && inter.t < 0.98 && inter.u > 0.02 && inter.u < 0.98) {
          splitPoints[i].push(inter.t);
          splitPoints[j].push(inter.u);
        }
      }
    }

    // Build merged vertex list
    const verts = [];
    function getVert(x, y) {
      for (let i = 0; i < verts.length; i++) {
        if (Math.hypot(verts[i].x - x, verts[i].y - y) < SNAP) return i;
      }
      verts.push({ x, y });
      return verts.length - 1;
    }

    const edgeSet = new Set();
    const adj = new Map();
    function addEdge(u, v) {
      if (u === v) return;
      const key = u < v ? `${u}_${v}` : `${v}_${u}`;
      if (edgeSet.has(key)) return;
      edgeSet.add(key);
      if (!adj.has(u)) adj.set(u, []);
      if (!adj.has(v)) adj.set(v, []);
      adj.get(u).push(v);
      adj.get(v).push(u);
    }

    for (let i = 0; i < walls.length; i++) {
      const w = walls[i];
      const ts = splitPoints[i].sort((a, b) => a - b);
      const dedup = [ts[0]];
      for (let k = 1; k < ts.length; k++) {
        if (ts[k] - dedup[dedup.length - 1] > 0.02) dedup.push(ts[k]);
      }
      for (let k = 0; k + 1 < dedup.length; k++) {
        const t0 = dedup[k], t1 = dedup[k + 1];
        const u = getVert(w.x1 + (w.x2 - w.x1) * t0, w.y1 + (w.y2 - w.y1) * t0);
        const v = getVert(w.x1 + (w.x2 - w.x1) * t1, w.y1 + (w.y2 - w.y1) * t1);
        addEdge(u, v);
      }
    }

    // Sort outgoing edges around each vertex by angle (CCW in Y-down screen space)
    for (const [u, list] of adj.entries()) {
      const vu = verts[u];
      list.sort((a, b) => Math.atan2(verts[a].y - vu.y, verts[a].x - vu.x) - Math.atan2(verts[b].y - vu.y, verts[b].x - vu.x));
    }

    // Planar minimal face extraction via directed half-edges (always turn sharpest CW / next-in-sorted order)
    const visitedHE = new Set();
    const faces = [];

    for (const [u, list] of adj.entries()) {
      for (let i = 0; i < list.length; i++) {
        const v = list[i];
        const startKey = `${u}->${v}`;
        if (visitedHE.has(startKey)) continue;

        const cycle = [];
        let cu = u, cv = v;
        let guard = 0;
        let closed = false;

        while (guard++ < 200) {
          const hk = `${cu}->${cv}`;
          if (visitedHE.has(hk)) {
            if (hk === startKey) closed = true;
            break;
          }
          visitedHE.add(hk);
          cycle.push(verts[cu]);

          const nbs = adj.get(cv);
          if (!nbs || nbs.length < 2) break;
          const backIdx = nbs.indexOf(cu);
          if (backIdx === -1) break;
          // Choose previous neighbor in angular order -> right-hand minimal interior cycle
          const nextV = nbs[(backIdx - 1 + nbs.length) % nbs.length];
          cu = cv;
          cv = nextV;
        }

        if (closed && cycle.length >= 3) {
          const areaCm2 = polySignedArea(cycle);
          // Positive area in Y-down screen space = interior CW face; negative = infinite outer boundary!
          if (areaCm2 > 5000) { // > 0.5 m²
            const areaSqM = areaCm2 / 10000;
            let cx = 0, cy = 0;
            cycle.forEach(p => { cx += p.x; cy += p.y; });
            cx /= cycle.length; cy /= cycle.length;
            faces.push({ polygon: cycle, areaSqM, cx, cy });
          }
        }
      }
    }

    // Smart room auto-naming from interior furniture on this floor
    const furns = (elements || []).filter(e => e.type === 'furniture' && (e.floor || 0) === (floor || 0));
    faces.sort((a, b) => b.areaSqM - a.areaSqM);

    return faces.map((room, idx) => {
      const inside = furns.filter(f => pointInPoly(f.x, f.y, room.polygon));
      const variants = new Set(inside.map(f => f.modelVariant));
      let labelEn = `Room ${idx + 1}`, labelFr = `Pièce ${idx + 1}`;
      if (variants.has('bathtub') || variants.has('shower') || variants.has('toilet')) {
        labelEn = 'Bathroom'; labelFr = 'Salle de Bain';
      } else if (variants.has('kitchen_counter') || variants.has('fridge') || variants.has('kitchen_island')) {
        labelEn = variants.has('sofa') ? 'Living & Kitchen' : 'Kitchen';
        labelFr = variants.has('sofa') ? 'Salon & Cuisine' : 'Cuisine';
      } else if (variants.has('bed')) {
        labelEn = 'Bedroom'; labelFr = 'Chambre';
      } else if (variants.has('sofa') || variants.has('tv')) {
        labelEn = 'Living Room'; labelFr = 'Salon';
      } else if (variants.has('desk')) {
        labelEn = 'Office'; labelFr = 'Bureau';
      } else if (variants.has('dining_set')) {
        labelEn = 'Dining Room'; labelFr = 'Salle à Manger';
      } else if (variants.has('stairs_straight') || variants.has('stairs_l') || variants.has('stairs_spiral')) {
        labelEn = 'Hallway'; labelFr = 'Hall / Escalier';
      }
      return Object.assign(room, { id: `room_${floor}_${idx}`, labelEn, labelFr });
    });
  }

  function projParam(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const l2 = dx * dx + dy * dy;
    if (l2 < 1e-6) return { t: 0, dist: Math.hypot(px - x1, py - y1) };
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2));
    return { t, dist: Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy)) };
  }

  function segIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
    const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(den) < 1e-6) return null;
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
    return { t, u };
  }

  // ============================================================================
  // 5. UNIFIED BOM & COST ENGINE (SYNCS HEADER BADGE + SIDEBAR BOM + PDF!)
  // ============================================================================
  const RATES = {
    wallSqM: 48,      // $/m² framing + drywall + finish
    floorSqM: 62,     // $/m² slab + finish
    roofSqM: 85,      // $/m² structure + tiles
    door: 340,
    window: 280,
    lightNode: 85
  };

  function calculateBOM(elements) {
    const cats = {
      Walls:     { labelFr: 'Murs',       count: 0, qty: 0, unit: 'm²', cost: 0 },
      Floors:    { labelFr: 'Sols',       count: 0, qty: 0, unit: 'm²', cost: 0 },
      Roofs:     { labelFr: 'Toitures',   count: 0, qty: 0, unit: 'm²', cost: 0 },
      Openings:  { labelFr: 'Portes/Fen', count: 0, qty: 0, unit: 'u',  cost: 0 },
      Furniture: { labelFr: 'Mobilier',   count: 0, qty: 0, unit: 'u',  cost: 0 },
      Lighting:  { labelFr: 'Éclairage',  count: 0, qty: 0, unit: 'u',  cost: 0 }
    };

    let total = 0;
    let totalWallLenM = 0;
    let totalFloorAreaSqM = 0;

    (elements || []).forEach(el => {
      const override = (el.cost !== undefined && el.cost !== null && Number(el.cost) > 0) ? Number(el.cost) : null;

      if (el.type === 'wall') {
        const len = wallLength(el);
        const sqM = (len / 100) * ((Number(el.height) || 280) / 100);
        const c = override !== null ? override : sqM * RATES.wallSqM;
        cats.Walls.count++;
        cats.Walls.qty += sqM;
        cats.Walls.cost += c;
        totalWallLenM += len / 100;
        total += c;
      } else if (el.type === 'floor') {
        const sqM = el.polygon
          ? Math.abs(polySignedArea(el.polygon)) / 10000
          : ((Number(el.width) || 100) / 100) * ((Number(el.height) || 100) / 100);
        const c = override !== null ? override : sqM * RATES.floorSqM;
        cats.Floors.count++;
        cats.Floors.qty += sqM;
        cats.Floors.cost += c;
        totalFloorAreaSqM += sqM;
        total += c;
      } else if (el.type === 'roof') {
        const sqM = el.polygon
          ? Math.abs(polySignedArea(el.polygon)) / 10000
          : ((Number(el.width) || 100) / 100) * ((Number(el.height) || 100) / 100);
        const c = override !== null ? override : sqM * RATES.roofSqM;
        cats.Roofs.count++;
        cats.Roofs.qty += sqM;
        cats.Roofs.cost += c;
        total += c;
      } else if (el.type === 'door' || el.type === 'window') {
        const c = override !== null ? override : (el.type === 'door' ? RATES.door : RATES.window);
        cats.Openings.count++;
        cats.Openings.qty++;
        cats.Openings.cost += c;
        total += c;
      } else if (el.type === 'furniture') {
        const spec = CATALOG[el.modelVariant];
        const c = override !== null ? override : (spec ? spec.cost : 200);
        cats.Furniture.count++;
        cats.Furniture.qty++;
        cats.Furniture.cost += c;
        total += c;
      } else if (el.type === 'lightNode') {
        const c = override !== null ? override : RATES.lightNode;
        cats.Lighting.count++;
        cats.Lighting.qty++;
        cats.Lighting.cost += c;
        total += c;
      }
    });

    return { total, totalWallLenM, totalFloorAreaSqM, categories: cats };
  }

  // ============================================================================
  // 6. SMART AI ARCHITECTURAL LAYOUT GENERATOR v2 & 6 PRO TEMPLATES
  // ============================================================================
  function mkWall(id, x1, y1, x2, y2, floor, h, thick, mat, color) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    return {
      id, type: 'wall', x1, y1, x2, y2, length: len,
      height: h || 280, thick: thick || 20,
      curvature: 0, material: mat || 'concrete', color: color || '#f1f5f9',
      floor: floor || 0, cost: Math.round((len / 100) * ((h || 280) / 100) * RATES.wallSqM)
    };
  }

  function mkOpening(id, type, wall, t, length, variant, color) {
    const op = {
      id, type, wallId: wall.id, t,
      length: length || (type === 'door' ? 95 : 140),
      height: type === 'door' ? 215 : 130,
      elevation: type === 'door' ? 0 : 90,
      modelVariant: variant || 'single',
      color: color || (type === 'door' ? '#7c4a22' : '#334155'),
      floor: wall.floor || 0,
      cost: type === 'door' ? RATES.door : RATES.window
    };
    return clampOpeningOnWall(op, wall);
  }

  function mkFloor(id, x, y, w, h, floor, mat, color) {
    return {
      id, type: 'floor', x, y, width: w, height: h,
      material: mat || 'wood', color: color || '#c69c6d',
      rotation: 0, floor: floor || 0,
      cost: Math.round((w * h / 10000) * RATES.floorSqM)
    };
  }

  function mkRoof(id, x, y, w, h, floor, elev, variant, color) {
    return {
      id, type: 'roof', x, y, width: w, height: h,
      elevation: elev || 280, modelVariant: variant || 'hipped',
      material: 'tiles', color: color || '#475569',
      rotation: 0, floor: floor || 0,
      cost: Math.round((w * h / 10000) * RATES.roofSqM)
    };
  }

  function mkFurn(id, variant, x, y, floor, rot, opts) {
    const spec = CATALOG[variant] || CATALOG.table;
    return Object.assign({
      id, type: 'furniture', modelVariant: variant,
      x, y,
      width: spec.w, length: spec.l, height: spec.h,
      elevation: 0, rotation: rot || 0,
      color: spec.color, floor: floor || 0, cost: spec.cost
    }, opts || {});
  }

  function mkLight(id, x, y, floor, elev, intensity) {
    return {
      id, type: 'lightNode', x, y,
      elevation: elev || 255, intensity: intensity || 1.2,
      color: '#ffedd5', floor: floor || 0, cost: RATES.lightNode
    };
  }

  function mkCam(id, x, y, floor, elev) {
    return { id, type: 'cameraNode', x, y, elevation: elev || 168, floor: floor || 0, cost: 0 };
  }

  /**
   * Builds a rich multi-room architectural layout for any W x D dimensions (cm) & style!
   */
  function buildMultiRoomPlan(W, D, opts) {
    const o = Object.assign({
      style: 'villa', // 'villa' | 'apartment' | 'studio' | 'office' | 'duplex'
      wallH: 280,
      thick: 20,
      floor: 0,
      withPool: false,
      withRoof: true,
      seed: 1
    }, opts || {});

    const els = [];
    const uid = (p) => `${p}_${o.seed}_${els.length + 1}`;
    const hx = W / 2, hy = D / 2;
    const f = o.floor;
    const h = o.wallH;
    const th = o.thick;

    // Outer perimeter walls (clockwise: Top, Right, Bottom, Left)
    const wTop = mkWall(uid('w'), -hx, -hy, hx, -hy, f, h, th, 'concrete', '#f1f5f9');
    const wRight = mkWall(uid('w'), hx, -hy, hx, hy, f, h, th, 'concrete', '#f1f5f9');
    const wBot = mkWall(uid('w'), hx, hy, -hx, hy, f, h, th, 'concrete', '#f1f5f9');
    const wLeft = mkWall(uid('w'), -hx, hy, -hx, -hy, f, h, th, 'concrete', '#f1f5f9');
    els.push(wTop, wRight, wBot, wLeft);

    if (o.style === 'studio') {
      // Open loft with corner bathroom partition
      const bx = hx - Math.min(260, W * 0.36);
      const by = -hy + Math.min(240, D * 0.44);
      const wBathV = mkWall(uid('w'), bx, -hy, bx, by, f, h, 14, 'none', '#e2e8f0');
      const wBathH = mkWall(uid('w'), bx, by, hx, by, f, h, 14, 'none', '#e2e8f0');
      els.push(wBathV, wBathH);

      els.push(mkFloor(uid('fl'), -hx, -hy, W, D, f, 'wood', '#c8a274'));
      els.push(mkFloor(uid('fl'), bx, -hy, hx - bx, by - (-hy), f, 'tiles', '#cbd5e1'));

      els.push(mkOpening(uid('dr'), 'door', wBot, 0.72, 95, 'single'));
      els.push(mkOpening(uid('dr'), 'door', wBathH, 0.45, 80, 'single'));
      els.push(mkOpening(uid('wn'), 'window', wTop, 0.32, 180, 'double'));
      els.push(mkOpening(uid('wn'), 'window', wLeft, 0.5, 160, 'sliding'));

      els.push(mkFurn(uid('fr'), 'bed', -hx + 125, -hy + 130, f, 0));
      els.push(mkFurn(uid('fr'), 'sofa', -hx + 160, hy - 110, f, 180));
      els.push(mkFurn(uid('fr'), 'kitchen_counter', -hx + 145, 20, f, 90, { width: Math.min(200, D * 0.35) }));
      els.push(mkFurn(uid('fr'), 'desk', hx - 120, hy - 95, f, 180, { width: 130 }));
      els.push(mkFurn(uid('fr'), 'shower', hx - 65, -hy + 65, f, 0));
      els.push(mkFurn(uid('fr'), 'toilet', bx + 45, -hy + 55, f, 0));
      els.push(mkFurn(uid('fr'), 'vanity', bx + 70, by - 40, f, 180, { width: 85 }));
      els.push(mkLight(uid('lt'), -40, 0, f));
      els.push(mkLight(uid('lt'), (bx + hx) / 2, (-hy + by) / 2, f));
    } else if (o.style === 'office') {
      // Executive room + Open studio workspace
      const splitX = -hx + W * 0.35;
      const wDiv = mkWall(uid('w'), splitX, -hy, splitX, hy, f, h, 15, 'none', '#e2e8f0');
      els.push(wDiv);
      els.push(mkFloor(uid('fl'), -hx, -hy, W, D, f, 'carpet', '#475569'));
      els.push(mkFloor(uid('fl'), -hx, -hy, W * 0.35, D, f, 'wood', '#b68c5e'));

      els.push(mkOpening(uid('dr'), 'door', wBot, 0.5, 130, 'double'));
      els.push(mkOpening(uid('dr'), 'door', wDiv, 0.55, 90, 'single'));
      els.push(mkOpening(uid('wn'), 'window', wTop, 0.25, 180, 'double'));
      els.push(mkOpening(uid('wn'), 'window', wTop, 0.72, 240, 'sliding'));
      els.push(mkOpening(uid('wn'), 'window', wRight, 0.5, 220, 'double'));

      els.push(mkFurn(uid('fr'), 'dining_set', -hx + W * 0.17, 0, f, 90));
      els.push(mkFurn(uid('fr'), 'bookshelf', -hx + 45, -hy + 120, f, 90));
      els.push(mkFurn(uid('fr'), 'desk', splitX + 140, -hy + 130, f, 0));
      els.push(mkFurn(uid('fr'), 'desk', hx - 140, -hy + 130, f, 0));
      els.push(mkFurn(uid('fr'), 'desk', splitX + 140, hy - 160, f, 180));
      els.push(mkFurn(uid('fr'), 'sofa', hx - 150, hy - 110, f, 180));
      els.push(mkFurn(uid('fr'), 'plant', splitX + 50, hy - 60, f, 0));
      els.push(mkFurn(uid('fr'), 'plant', hx - 55, -hy + 55, f, 0));
      els.push(mkLight(uid('lt'), -hx + W * 0.17, 0, f));
      els.push(mkLight(uid('lt'), splitX + W * 0.32, 0, f));
    } else {
      // Full Villa / Apartment / Duplex Ground Floor:
      // Left 54%: Living Room (bottom-left) + Kitchen/Dining (top-left)
      // Right 46%: Master Bedroom (bottom-right) + Bathroom (top-right)
      const splitX = -hx + W * 0.54;
      const splitYRight = -hy + D * 0.42;

      const wCenterV = mkWall(uid('w'), splitX, -hy, splitX, hy, f, h, 15, 'none', '#e2e8f0');
      const wRightH = mkWall(uid('w'), splitX, splitYRight, hx, splitYRight, f, h, 15, 'none', '#e2e8f0');
      els.push(wCenterV, wRightH);

      // Room Floors (Wood in Living/Bedroom, Ceramic Tiles in Kitchen/Bath)
      els.push(mkFloor(uid('fl'), -hx, -hy + D * 0.42, W * 0.54, D * 0.58, f, 'wood', '#c49a6c'));
      els.push(mkFloor(uid('fl'), -hx, -hy, W * 0.54, D * 0.42, f, 'tiles', '#d6d3d1'));
      els.push(mkFloor(uid('fl'), splitX, -hy, W * 0.46, D * 0.42, f, 'tiles', '#cbd5e1'));
      els.push(mkFloor(uid('fl'), splitX, splitYRight, W * 0.46, D * 0.58, f, 'wood', '#b5895a'));

      // Doors (Front Entrance + Bathroom + Bedroom)
      els.push(mkOpening(uid('dr'), 'door', wBot, 0.72, 120, 'double'));
      els.push(mkOpening(uid('dr'), 'door', wCenterV, 0.22, 85, 'single'));
      els.push(mkOpening(uid('dr'), 'door', wCenterV, 0.68, 90, 'single'));

      // Panoramic & Room Windows
      els.push(mkOpening(uid('wn'), 'window', wTop, 0.25, 190, 'double'));
      els.push(mkOpening(uid('wn'), 'window', wTop, 0.78, 120, 'single'));
      els.push(mkOpening(uid('wn'), 'window', wLeft, 0.35, 220, 'sliding'));
      els.push(mkOpening(uid('wn'), 'window', wRight, 0.72, 160, 'double'));

      // Living Room Furniture (Bottom-Left)
      els.push(mkFurn(uid('fr'), 'sofa', -hx + 165, hy - 145, f, 180));
      els.push(mkFurn(uid('fr'), 'table', -hx + 165, hy - 260, f, 0));
      els.push(mkFurn(uid('fr'), 'tv', splitX - 45, hy - 180, f, -90));
      els.push(mkFurn(uid('fr'), 'lamp', -hx + 55, hy - 65, f, 0));
      els.push(mkFurn(uid('fr'), 'plant', -hx + 55, hy - 320, f, 0));

      // Kitchen & Dining (Top-Left)
      els.push(mkFurn(uid('fr'), 'kitchen_counter', -hx + 165, -hy + 52, f, 0));
      els.push(mkFurn(uid('fr'), 'fridge', -hx + 340, -hy + 58, f, 0));
      els.push(mkFurn(uid('fr'), 'kitchen_island', -hx + 190, -hy + 195, f, 0));

      // Bathroom (Top-Right)
      els.push(mkFurn(uid('fr'), 'bathtub', hx - 110, -hy + 60, f, 0));
      els.push(mkFurn(uid('fr'), 'vanity', splitX + 120, -hy + 46, f, 0));
      els.push(mkFurn(uid('fr'), 'toilet', hx - 55, splitYRight - 65, f, -90));

      // Master Bedroom (Bottom-Right)
      els.push(mkFurn(uid('fr'), 'bed', hx - 145, splitYRight + 165, f, -90));
      els.push(mkFurn(uid('fr'), 'cabinet', splitX + 145, hy - 52, f, 180));
      els.push(mkFurn(uid('fr'), 'desk', splitX + 115, splitYRight + 65, f, 0, { width: 130 }));

      // Optional Stairs for Duplex
      if (o.style === 'duplex') {
        els.push(mkFurn(uid('st'), 'stairs_l', splitX - 135, -hy + 170, f, 0));
      }

      // Interior Lights
      els.push(mkLight(uid('lt'), -hx + W * 0.27, hy - D * 0.28, f));
      els.push(mkLight(uid('lt'), -hx + W * 0.27, -hy + D * 0.21, f));
      els.push(mkLight(uid('lt'), splitX + W * 0.23, splitYRight + D * 0.28, f));
      els.push(mkLight(uid('lt'), splitX + W * 0.23, -hy + D * 0.21, f));

      // Virtual Tour Camera Path Nodes (ready to record .webm!)
      els.push(mkCam(uid('cm'), -hx + 120, hy - 80, f, 168));
      els.push(mkCam(uid('cm'), -hx + 240, -hy + 220, f, 168));
      els.push(mkCam(uid('cm'), splitX + 140, splitYRight + 140, f, 168));
    }

    // Outdoor Pool & Garden Trees for Villa
    if (o.withPool) {
      els.push(mkFloor(uid('fl'), -hx - 60, hy + 10, W + 120, 380, f, 'paving', '#94a3b8'));
      els.push(mkFurn(uid('pl'), 'pool', 40, hy + 200, f, 0, { width: Math.min(480, W * 0.55), length: 240 }));
      els.push(mkFurn(uid('tr'), 'tree', -hx - 120, -hy - 90, f, 0));
      els.push(mkFurn(uid('tr'), 'tree', hx + 130, -hy - 60, f, 0));
      els.push(mkFurn(uid('tr'), 'tree', -hx - 110, hy + 220, f, 0));
    }

    // Roof on top floor
    if (o.withRoof) {
      const ov = 35;
      els.push(mkRoof(uid('rf'), -hx - ov, -hy - ov, W + ov * 2, D + ov * 2, f, h, o.style === 'office' ? 'flat' : 'hipped', '#334155'));
    }

    return els;
  }

  function createTemplate(templateId, wallH) {
    const h = Number(wallH) || 280;
    if (templateId === 'empty') return [];
    if (templateId === 'studio') return buildMultiRoomPlan(650, 550, { style: 'studio', wallH: h, withRoof: true, seed: 10 });
    if (templateId === 'apartment') return buildMultiRoomPlan(1000, 760, { style: 'apartment', wallH: h, withRoof: false, seed: 20 });
    if (templateId === 'office') return buildMultiRoomPlan(1050, 720, { style: 'office', wallH: h, withRoof: true, seed: 30 });
    if (templateId === 'duplex') {
      const gf = buildMultiRoomPlan(860, 720, { style: 'duplex', wallH: h, floor: 0, withRoof: false, seed: 40 });
      const f1 = buildMultiRoomPlan(860, 720, { style: 'apartment', wallH: h, floor: 1, withRoof: true, seed: 41 });
      // Add balcony railing on floor 1
      f1.push(mkFurn('rail_f1', 'railing', 0, 360, 1, 0, { width: 320 }));
      return gf.concat(f1);
    }
    // Default: 'villa' (10 x 8 m Modern Villa with Pool & Garden!)
    return buildMultiRoomPlan(1000, 800, { style: 'villa', wallH: h, withPool: true, withRoof: true, seed: 1 });
  }

  /**
   * Smart AI Architect v2 — Parses natural-language EN/FR/RO prompts into complete multi-room floor plans!
   */
  function generateFromPrompt(promptText, opts) {
    const text = String(promptText || '').toLowerCase();
    const o = Object.assign({ wallH: 280, activeFloor: 0 }, opts || {});

    // Extract dimensions e.g. "12x9", "10 x 8", "6.5x5"
    let W = 900, D = 700;
    const dimMatch = text.match(/(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)/);
    if (dimMatch) {
      const a = parseFloat(dimMatch[1]);
      const b = parseFloat(dimMatch[2]);
      // If values <= 40 assume meters, else cm
      W = Math.max(350, Math.min(2400, a <= 40 ? a * 100 : a));
      D = Math.max(350, Math.min(2000, b <= 40 ? b * 100 : b));
    }

    let style = 'villa';
    if (/studio|garsonier|loft|small|petit/.test(text) || (W <= 650 && D <= 600)) style = 'studio';
    else if (/office|birou|bureau|workspace|agency/.test(text)) style = 'office';
    else if (/duplex|2\s*floor|2\s*etaj|etage|two\s*stor/.test(text)) style = 'duplex';
    else if (/apart|flat|2br|2\s*bed|2\s*chambr|2\s*camer/.test(text)) style = 'apartment';

    const withPool = /pool|piscin|garden|jardin|villa|casa|maison|house/.test(text);
    const seed = Date.now() % 100000;

    if (style === 'duplex') {
      const gf = buildMultiRoomPlan(W, D, { style: 'duplex', wallH: o.wallH, floor: 0, withPool, withRoof: false, seed });
      const f1 = buildMultiRoomPlan(W, D, { style: 'apartment', wallH: o.wallH, floor: 1, withPool: false, withRoof: true, seed: seed + 1 });
      return gf.concat(f1);
    }

    return buildMultiRoomPlan(W, D, {
      style,
      wallH: o.wallH,
      floor: o.activeFloor || 0,
      withPool,
      withRoof: true,
      seed
    });
  }

  // ============================================================================
  // 7. 2D CAD EXPORTERS: AUTOCAD DXF R12 (1:1 mm) & DIMENSIONED SVG
  // ============================================================================
  function exportFloorPlanDXF(elements, floor) {
    const active = (elements || []).filter(e => (e.floor || 0) === (floor || 0));
    const lines = [];
    const push = (c, v) => { lines.push(String(c)); lines.push(String(v)); };

    // Convert cm -> mm (*10) with Y-up Cartesian flip
    const toMm = (v) => (v * 10).toFixed(2);

    push(0, 'SECTION'); push(2, 'HEADER');
    push(9, '$ACADVER'); push(1, 'AC1009');
    push(9, '$INSUNITS'); push(70, 4); // Millimeters (1:1 architectural scale!)
    push(9, '$MEASUREMENT'); push(70, 1);
    push(0, 'ENDSEC');

    push(0, 'SECTION'); push(2, 'TABLES');
    push(0, 'TABLE'); push(2, 'LAYER'); push(70, 5);
    [['WALLS', 7], ['DOORS', 30], ['WINDOWS', 4], ['FURNITURE', 3], ['FLOORS', 8]].forEach(([name, aci]) => {
      push(0, 'LAYER'); push(2, name); push(70, 0); push(62, aci); push(6, 'CONTINUOUS');
    });
    push(0, 'ENDTAB'); push(0, 'ENDSEC');

    push(0, 'SECTION'); push(2, 'ENTITIES');

    function emitPoly(layer, aci, pts, closed) {
      push(0, 'POLYLINE'); push(8, layer); push(62, aci); push(66, 1);
      push(10, '0'); push(20, '0'); push(30, '0');
      push(70, closed ? 1 : 0);
      pts.forEach(p => {
        push(0, 'VERTEX'); push(8, layer);
        push(10, toMm(p.x)); push(20, toMm(-p.y)); push(30, '0');
      });
      push(0, 'SEQEND'); push(8, layer);
    }

    // Walls (true double-line thickness footprint!)
    active.filter(e => e.type === 'wall').forEach(w => {
      const ang = Math.atan2(w.y2 - w.y1, w.x2 - w.x1);
      const nx = -Math.sin(ang) * ((w.thick || 20) * 0.5);
      const ny = Math.cos(ang) * ((w.thick || 20) * 0.5);
      emitPoly('WALLS', 7, [
        { x: w.x1 + nx, y: w.y1 + ny },
        { x: w.x2 + nx, y: w.y2 + ny },
        { x: w.x2 - nx, y: w.y2 - ny },
        { x: w.x1 - nx, y: w.y1 - ny }
      ], true);
    });

    // Doors & Windows
    active.filter(e => e.type === 'door' || e.type === 'window').forEach(op => {
      const w = active.find(x => x.id === op.wallId);
      if (!w) return;
      const cx = w.x1 + op.t * (w.x2 - w.x1);
      const cy = w.y1 + op.t * (w.y2 - w.y1);
      const ang = Math.atan2(w.y2 - w.y1, w.x2 - w.x1);
      const cA = Math.cos(ang), sA = Math.sin(ang);
      const hw = op.length * 0.5, ht = (w.thick || 20) * 0.55;
      const xform = (lx, ly) => ({ x: cx + lx * cA - ly * sA, y: cy + lx * sA + ly * cA });
      const layer = op.type === 'door' ? 'DOORS' : 'WINDOWS';
      const aci = op.type === 'door' ? 30 : 4;
      emitPoly(layer, aci, [xform(-hw, -ht), xform(hw, -ht), xform(hw, ht), xform(-hw, ht)], true);
    });

    // Furniture footprints
    active.filter(e => e.type === 'furniture').forEach(f => {
      const rad = ((f.rotation || 0) * Math.PI) / 180;
      const cA = Math.cos(rad), sA = Math.sin(rad);
      const hw = (f.width || 80) * 0.5, hl = (f.length || 80) * 0.5;
      const xform = (lx, ly) => ({ x: f.x + lx * cA - ly * sA, y: f.y + lx * sA + ly * cA });
      emitPoly('FURNITURE', 3, [xform(-hw, -hl), xform(hw, -hl), xform(hw, hl), xform(-hw, hl)], true);
    });

    push(0, 'ENDSEC');
    push(0, 'EOF');
    return lines.join('\r\n') + '\r\n';
  }

  function exportFloorPlanSVG(elements, floor, unit) {
    const active = (elements || []).filter(e => (e.floor || 0) === (floor || 0));
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const grow = (x, y) => {
      if (x < minX) minX = x; if (y < minY) minY = y;
      if (x > maxX) maxX = x; if (y > maxY) maxY = y;
    };
    active.forEach(e => {
      if (e.type === 'wall') { grow(e.x1, e.y1); grow(e.x2, e.y2); }
      else if (e.type === 'floor' || e.type === 'roof') {
        if (e.polygon) e.polygon.forEach(p => grow(p.x, p.y));
        else { grow(e.x, e.y); grow(e.x + e.width, e.y + e.height); }
      } else if (e.x !== undefined && e.y !== undefined) {
        grow(e.x - (e.width || 60) / 2, e.y - (e.length || 60) / 2);
        grow(e.x + (e.width || 60) / 2, e.y + (e.length || 60) / 2);
      }
    });
    if (!Number.isFinite(minX)) { minX = -400; minY = -400; maxX = 400; maxY = 400; }
    const pad = 80;
    minX -= pad; minY -= pad; maxX += pad; maxY += pad;
    const vw = maxX - minX, vh = maxY - minY;
    // Scale 1:100 architectural sheet in mm (1 cm -> 0.1 mm on sheet, or true cm viewBox)
    const out = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<svg xmlns="http://www.w3.org/2000/svg" width="${(vw * 0.2).toFixed(1)}mm" height="${(vh * 0.2).toFixed(1)}mm" viewBox="${minX.toFixed(1)} ${minY.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}">`,
      `<rect x="${minX.toFixed(1)}" y="${minY.toFixed(1)}" width="${vw.toFixed(1)}" height="${vh.toFixed(1)}" fill="#0f172a"/>`
    ];

    // Floors
    active.filter(e => e.type === 'floor').forEach(fl => {
      if (fl.polygon) {
        const pts = fl.polygon.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
        out.push(`<polygon points="${pts}" fill="${fl.color || '#64748b'}" fill-opacity="0.22" stroke="none"/>`);
      } else {
        out.push(`<rect x="${fl.x.toFixed(1)}" y="${fl.y.toFixed(1)}" width="${fl.width.toFixed(1)}" height="${fl.height.toFixed(1)}" fill="${fl.color || '#64748b'}" fill-opacity="0.22"/>`);
      }
    });

    // Furniture
    active.filter(e => e.type === 'furniture').forEach(f => {
      out.push(`<g transform="translate(${f.x.toFixed(1)},${f.y.toFixed(1)}) rotate(${(f.rotation || 0).toFixed(1)})">`);
      out.push(`<rect x="${(-f.width / 2).toFixed(1)}" y="${(-f.length / 2).toFixed(1)}" width="${f.width.toFixed(1)}" height="${f.length.toFixed(1)}" fill="${f.color || '#64748b'}" fill-opacity="0.45" stroke="#94a3b8" stroke-width="2"/>`);
      out.push('</g>');
    });

    // Walls + Dimensions
    active.filter(e => e.type === 'wall').forEach(w => {
      out.push(`<line x1="${w.x1.toFixed(1)}" y1="${w.y1.toFixed(1)}" x2="${w.x2.toFixed(1)}" y2="${w.y2.toFixed(1)}" stroke="#f8fafc" stroke-width="${(w.thick || 20).toFixed(1)}" stroke-linecap="square"/>`);
      const mx = (w.x1 + w.x2) / 2, my = (w.y1 + w.y2) / 2 - 18;
      out.push(`<text x="${mx.toFixed(1)}" y="${my.toFixed(1)}" fill="#34d399" font-family="Inter,sans-serif" font-size="18" text-anchor="middle">${formatLength(wallLength(w), unit || 'm')}</text>`);
    });

    // Detected room labels
    const rooms = detectRooms(elements, floor);
    rooms.forEach(r => {
      out.push(`<text x="${r.cx.toFixed(1)}" y="${r.cy.toFixed(1)}" fill="#e2e8f0" font-family="Inter,sans-serif" font-size="22" font-weight="700" text-anchor="middle">${r.labelEn}</text>`);
      out.push(`<text x="${r.cx.toFixed(1)}" y="${(r.cy + 24).toFixed(1)}" fill="#38bdf8" font-family="monospace" font-size="18" text-anchor="middle">${formatArea(r.areaSqM, unit || 'm')}</text>`);
    });

    out.push('</svg>');
    return out.join('\n');
  }

  return {
    UNIT_FACTORS,
    CATALOG,
    RATES,
    cmToUnit,
    unitToCm,
    formatLength,
    formatArea,
    wallLength,
    resizeWallLength,
    clampOpeningOnWall,
    deleteElementCascade,
    snapWorldPoint,
    snapOrthoWorld,
    polySignedArea,
    pointInPoly,
    detectRooms,
    calculateBOM,
    createTemplate,
    generateFromPrompt,
    exportFloorPlanDXF,
    exportFloorPlanSVG
  };
});
