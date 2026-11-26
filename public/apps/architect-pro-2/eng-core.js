/**
 * Architect Pro 2 (v3.0) — Structural Engineering, Thermal, Gantt, BOQ & Bilingual Core
 * Zero-dependency pure engineering engine (Browser UMD + Node.js testable).
 */
(function (globalScope) {
  'use strict';

  const FT_TO_M = 0.3048;
  const M_TO_FT = 1 / FT_TO_M;
  const SQM_TO_SQFT = 10.7639104167;
  const CBM_TO_CUYD = 1.3079506193;
  const KG_TO_LBS = 2.2046226218;
  const M_TO_IN = 39.37007874;

  // =========================================================================
  // 1. PRESETS, TYPES, FOUNDATIONS, ROOFS & CLIMATE ENGINEERING PARAMETERS
  // =========================================================================

  const HOUSE_TYPES = [
    { id: 'single', floors: 1, en: 'Single Story (Bungalow)', fr: 'Plain-Pied (1 Niveau)' },
    { id: '2floor', floors: 2, en: '2-Story Family Home', fr: 'Maison 2 Étages (R+1)' },
    { id: '3floor', floors: 3, en: '3-Story Residence', fr: 'Résidence 3 Étages (R+2)' },
    { id: '4floor', floors: 4, en: '4-Story Townhouse', fr: 'Immeuble 4 Étages (R+3)' },
    { id: '5floor', floors: 5, en: '5-Story Multi-Family', fr: 'Collectif 5 Étages (R+4)' },
    { id: 'villa',  floors: 2, en: 'Custom Architectural Villa', fr: 'Villa Architecturale Sur-Mesure' }
  ];

  const FOUNDATION_TYPES = [
    {
      id: 'strip',
      en: 'Strip Footing (Continuous)',
      fr: 'Semelles Filantes (Continu)',
      descEn: 'Continuous reinforced perimeter & load-bearing trenches + slab-on-grade',
      descFr: 'Tranchées armées périmétriques & porteurs + dallage sur terre-plein',
      extraWeeks: 0,
      concreteFactor: 1.0,
      rebarFactor: 1.0,
      excavationDepth: 1.0
    },
    {
      id: 'raft',
      en: 'Reinforced Raft Slab',
      fr: 'Radier Général Armé',
      descEn: 'Double-mesh thick reinforced concrete mat for weak soils or multi-story loads',
      descFr: 'Dalle épaisse double nappe armée pour sols faibles ou charges multi-étages',
      extraWeeks: 1,
      concreteFactor: 1.38,
      rebarFactor: 1.55,
      excavationDepth: 0.75
    },
    {
      id: 'pile',
      en: 'Drilled Piles + Grade Beams',
      fr: 'Pieux Forés + Longrines',
      descEn: 'Deep reinforced concrete bored piles with pile caps & perimeter grade beams',
      descFr: 'Pieux béton forés profonds avec massifs de liaison et longrines armées',
      extraWeeks: 2,
      concreteFactor: 1.52,
      rebarFactor: 1.85,
      excavationDepth: 0.65
    },
    {
      id: 'basement',
      en: 'Full Waterproofed Basement',
      fr: 'Sous-Sol Complet Étanche',
      descEn: 'Full -2.6m excavated concrete basement with bituminous tanking & French drain',
      descFr: 'Sous-sol excavé -2,6 m en voiles béton étanches + drainage périphérique',
      extraWeeks: 4,
      concreteFactor: 2.35,
      rebarFactor: 2.25,
      excavationDepth: 2.65
    }
  ];

  const ROOF_TYPES = [
    { id: 'flat',  en: 'Flat Terrace Roof', fr: 'Toit Plat Terrasse', pitchDeg: 2, areaMult: 1.06, timberMult: 0.45, extraWeeks: 0 },
    { id: 'gable', en: 'Gable Roof (2 Slopes)', fr: 'Toit 2 Pans (Pignon)', pitchDeg: 32, areaMult: 1.24, timberMult: 1.0, extraWeeks: 1 },
    { id: 'hip',   en: 'Hip Roof (4 Slopes)', fr: 'Toit 4 Pans (Croupe)', pitchDeg: 30, areaMult: 1.32, timberMult: 1.18, extraWeeks: 1.5 },
    { id: 'shed',  en: 'Mono-Pitch Shed Roof', fr: 'Toit Monopente Moderne', pitchDeg: 18, areaMult: 1.15, timberMult: 0.85, extraWeeks: 0.5 }
  ];

  const REGIONS = [
    {
      id: 'temperate',
      en: 'Temperate (Central Europe / US)',
      fr: 'Tempéré (Europe / Amérique du Nord)',
      laborMult: 1.0,
      frostDepthM: 0.9,
      wallInsMm: 140,
      roofInsMm: 240,
      snowLoadKpa: 1.2,
      hdd: 2600,
      cdd: 350,
      glazingU: 1.0,
      noteEn: 'Balanced frost depth (0.9m) & 140mm ETICS insulation.',
      noteFr: 'Hors-gel équilibré (0,9 m) & ITE 140 mm.'
    },
    {
      id: 'cold',
      en: 'Cold / Alpine / Northern',
      fr: 'Froid / Montagne / Nordique',
      laborMult: 1.22,
      frostDepthM: 1.35,
      wallInsMm: 200,
      roofInsMm: 320,
      snowLoadKpa: 2.8,
      hdd: 4300,
      cdd: 80,
      glazingU: 0.78,
      noteEn: 'Deep frost line (1.35m), heavy snow roof bracing (2.8 kPa) & triple glazing.',
      noteFr: 'Hors-gel profond (1,35 m), charpente neige renforcée (2,8 kPa) & triple vitrage.'
    },
    {
      id: 'hot',
      en: 'Hot & Arid / Mediterranean',
      fr: 'Chaud & Aride / Méditerranéen',
      laborMult: 0.9,
      frostDepthM: 0.55,
      wallInsMm: 100,
      roofInsMm: 200,
      snowLoadKpa: 0.35,
      hdd: 950,
      cdd: 1650,
      glazingU: 1.15,
      noteEn: 'Solar heat-gain control, reflective roof membrane & high-efficiency AC.',
      noteFr: 'Protection solaire, membrane réfléchissante & climatisation haute efficacité.'
    },
    {
      id: 'tropical',
      en: 'Tropical / Coastal High-Wind',
      fr: 'Tropical / Côtier (Vents Forts)',
      laborMult: 0.82,
      frostDepthM: 0.6,
      wallInsMm: 80,
      roofInsMm: 180,
      snowLoadKpa: 0.2,
      hdd: 250,
      cdd: 2300,
      glazingU: 1.25,
      noteEn: 'Hurricane roof tie-downs, elevated damp-proofing & dehumidification HVAC.',
      noteFr: 'Ancrages cycloniques charpente, étanchéité renforcée & déshumidification.'
    }
  ];

  const QUICK_PRESETS = [
    {
      id: 'bungalow',
      icon: '🏡',
      en: 'Modern Bungalow',
      fr: 'Plain-Pied Moderne',
      metaEn: '12 × 9 m · 1 Floor · 108 m²',
      metaFr: '12 × 9 m · 1 Niv. · 108 m²',
      config: { houseType: 'single', length: 12, width: 9, floorHeight: 2.85, floors: 1, foundationType: 'strip', roofType: 'hip', budget: 240000, region: 'temperate', layoutPreset: 'family3' }
    },
    {
      id: 'family2',
      icon: '🏠',
      en: '2-Floor Family Home',
      fr: 'Maison Familiale R+1',
      metaEn: '11 × 8.5 m · 2 Floors · 187 m²',
      metaFr: '11 × 8,5 m · 2 Niv. · 187 m²',
      config: { houseType: '2floor', length: 11, width: 8.5, floorHeight: 2.8, floors: 2, foundationType: 'raft', roofType: 'gable', budget: 360000, region: 'temperate', layoutPreset: 'family3' }
    },
    {
      id: 'villa3',
      icon: '🏛️',
      en: 'Executive Villa + Basement',
      fr: 'Villa d\'Architecte + Sous-Sol',
      metaEn: '14 × 10 m · 2 Floors + B1 · 280 m²',
      metaFr: '14 × 10 m · 2 Niv. + SS · 280 m²',
      config: { houseType: 'villa', length: 14, width: 10, floorHeight: 3.0, floors: 2, foundationType: 'basement', roofType: 'flat', budget: 620000, region: 'cold', layoutPreset: 'villa4' }
    },
    {
      id: 'tiny',
      icon: '🌿',
      en: 'Eco Compact Studio',
      fr: 'Maison Éco Compacte',
      metaEn: '9 × 6 m · 1 Floor · 54 m²',
      metaFr: '9 × 6 m · 1 Niv. · 54 m²',
      config: { houseType: 'single', length: 9, width: 6, floorHeight: 2.75, floors: 1, foundationType: 'pile', roofType: 'shed', budget: 135000, region: 'temperate', layoutPreset: 'open' }
    }
  ];

  // =========================================================================
  // 2. UNIT CONVERSION & FORMATTING HELPERS (FIXED IMPERIAL BUG!)
  // =========================================================================

  function toMeters(val, unitSystem) {
    const n = parseFloat(val);
    if (!Number.isFinite(n)) return 0;
    return unitSystem === 'imperial' ? n * FT_TO_M : n;
  }

  function fromMeters(m, unitSystem) {
    const n = parseFloat(m);
    if (!Number.isFinite(n)) return 0;
    return unitSystem === 'imperial' ? n * M_TO_FT : n;
  }

  function fmtLen(m, unitSystem, dec) {
    const d = dec !== undefined ? dec : (unitSystem === 'imperial' ? 1 : 2);
    if (unitSystem === 'imperial') return (m * M_TO_FT).toFixed(d) + ' ft';
    return Number(m).toFixed(d) + ' m';
  }

  function fmtSmallLen(m, unitSystem) {
    if (unitSystem === 'imperial') return Math.round(m * M_TO_IN) + ' in';
    return Math.round(m * 100) + ' cm';
  }

  function fmtArea(sqm, unitSystem) {
    if (unitSystem === 'imperial') return Math.round(sqm * SQM_TO_SQFT).toLocaleString('en-US') + ' ft²';
    return Number(sqm).toFixed(1) + ' m²';
  }

  function fmtVol(cbm, unitSystem) {
    if (unitSystem === 'imperial') return (cbm * CBM_TO_CUYD).toFixed(1) + ' yd³';
    return Number(cbm).toFixed(1) + ' m³';
  }

  function fmtMass(kg, unitSystem) {
    if (unitSystem === 'imperial') return Math.round(kg * KG_TO_LBS).toLocaleString('en-US') + ' lb';
    if (kg >= 1000) return (kg / 1000).toFixed(2) + ' t';
    return Math.round(kg).toLocaleString('en-US') + ' kg';
  }

  function fmtMoney(n) {
    return '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
  }

  function getFoundationMeta(id) {
    return FOUNDATION_TYPES.find(f => f.id === id) || FOUNDATION_TYPES[0];
  }
  function getRoofMeta(id) {
    return ROOF_TYPES.find(r => r.id === id) || ROOF_TYPES[2];
  }
  function getRegionMeta(id) {
    return REGIONS.find(r => r.id === id) || REGIONS[0];
  }

  // =========================================================================
  // 3. AUTO-PARTITION FLOOR PLAN GENERATORS (1-CLICK STRUCTURAL LAYOUTS)
  // =========================================================================

  let _uidCounter = 1;
  function uid(prefix) {
    return (prefix || 'el') + '_' + (_uidCounter++) + '_' + Math.random().toString(36).slice(2, 6);
  }

  function generatePartitionLayout(L, W, preset, floorIndex, totalFloors) {
    const walls = [];
    const windows = [];
    const doors = [];
    const stairs = [];
    const columns = [];

    const addWall = (x1, y1, x2, y2, thickness) => {
      const w = { id: uid('w'), x1: +x1.toFixed(2), y1: +y1.toFixed(2), x2: +x2.toFixed(2), y2: +y2.toFixed(2), thickness: thickness || 0.15 };
      walls.push(w);
      return w;
    };
    const addCol = (x, y, size) => columns.push({ id: uid('col'), x: +x.toFixed(2), y: +y.toFixed(2), size: size || 0.30 });
    const addExtWin = (side, t, width, height, sill) => windows.push({
      id: uid('win'), wallId: 'ext-' + side, t, width: width || 1.5, height: height || 1.35, sill: sill || 0.9
    });
    const addExtDoor = (side, t, width, height, swing) => doors.push({
      id: uid('dr'), wallId: 'ext-' + side, t, width: width || 1.0, height: height || 2.15, swing: swing || 'in-right'
    });
    const addIntDoor = (wallId, t, width, swing) => doors.push({
      id: uid('dr'), wallId, t, width: width || 0.9, height: 2.1, swing: swing || 'in-left'
    });

    // Always place sensible perimeter windows + main entrance on Ground Floor
    if (floorIndex === 0) {
      addExtDoor('bottom', 0.5, 1.05, 2.15, 'in-right');
      addExtWin('bottom', 0.22, 1.5, 1.35, 0.9);
      addExtWin('bottom', 0.78, 1.5, 1.35, 0.9);
    } else {
      addExtWin('bottom', 0.24, 1.5, 1.35, 0.9);
      addExtWin('bottom', 0.50, 1.6, 1.35, 0.9);
      addExtWin('bottom', 0.76, 1.5, 1.35, 0.9);
    }
    addExtWin('top', 0.28, 1.8, 1.35, 0.9);
    addExtWin('top', 0.72, 1.6, 1.35, 0.9);
    addExtWin('left', 0.5, 1.4, 1.35, 0.9);
    addExtWin('right', 0.5, 1.4, 1.35, 0.9);

    if (preset === 'empty') {
      return { walls, windows, doors, stairs, columns };
    }

    // Structural interior column when span > 7.5m
    if (L >= 10 && W >= 7.5) {
      addCol(L * 0.5, W * 0.5, 0.30);
    }

    if (preset === 'open') {
      // Open-plan living + enclosed bathroom/utility corner
      const bx = +(L * 0.68).toFixed(2);
      const by = +(W * 0.45).toFixed(2);
      const w1 = addWall(bx, 0, bx, by, 0.15);
      const w2 = addWall(bx, by, L, by, 0.15);
      addIntDoor(w1.id, 0.55, 0.85, 'in-right');
      addIntDoor(w2.id, 0.45, 0.85, 'in-left');
    } else if (preset === 'villa4') {
      // Executive 4-room layout with central hall
      const xL = +(L * 0.36).toFixed(2);
      const xR = +(L * 0.66).toFixed(2);
      const yM = +(W * 0.50).toFixed(2);
      const yH = +(W * 0.66).toFixed(2);
      const w1 = addWall(xL, 0, xL, W, 0.18);
      const w2 = addWall(xR, 0, xR, yH, 0.18);
      const w3 = addWall(0, yM, xL, yM, 0.15);
      const w4 = addWall(xR, yM, L, yM, 0.15);
      addIntDoor(w1.id, 0.26, 0.9, 'in-left');
      addIntDoor(w1.id, 0.76, 0.9, 'in-right');
      addIntDoor(w2.id, 0.32, 0.85, 'in-right');
      addIntDoor(w4.id, 0.50, 0.85, 'in-left');
      addCol(xL, yM, 0.30);
      addCol(xR, yM, 0.30);
    } else {
      // Default 'family3': Living + Kitchen + Bedroom + Bath
      const xMid = +(L * 0.54).toFixed(2);
      const yDiv = +(W * 0.46).toFixed(2);
      const wMain = addWall(xMid, 0, xMid, W, 0.18);
      const wSide = addWall(xMid, yDiv, L, yDiv, 0.15);
      const wKit  = addWall(0, yDiv, xMid * 0.55, yDiv, 0.15);
      addIntDoor(wMain.id, 0.25, 0.9, 'in-right');
      addIntDoor(wMain.id, 0.74, 0.9, 'in-left');
      addIntDoor(wSide.id, 0.50, 0.85, 'in-left');
      void wKit;
    }

    // Add real staircase automatically for multi-story buildings
    if (totalFloors > 1) {
      const sw = Math.min(1.15, W * 0.16);
      const sl = Math.min(3.1, L * 0.28);
      stairs.push({
        id: uid('st'),
        x: +(L * 0.5 - sl * 0.5).toFixed(2),
        y: +(W * 0.12).toFixed(2),
        w: +sl.toFixed(2),
        h: +sw.toFixed(2),
        dir: 'right',
        style: 'straight',
        steps: 16
      });
    }

    return { walls, windows, doors, stairs, columns };
  }

  // =========================================================================
  // 4. REAL PLANAR ROOM DETECTION (RASTER FLOOD-FILL OVER EXACT WALL SEGMENTS)
  // =========================================================================

  function detectRooms(L, W, walls, lang) {
    const res = 0.20; // 20 cm cells — fast (<1.5ms) & accurate for arbitrary orthogonal/angled walls
    const cols = Math.max(8, Math.min(140, Math.round(L / res)));
    const rows = Math.max(8, Math.min(140, Math.round(W / res)));
    const cw = L / cols;
    const ch = W / rows;
    const grid = new Uint8Array(cols * rows); // 0 = open, 1 = wall

    // Rasterize every interior wall segment with half-thickness
    for (let i = 0; i < (walls || []).length; i++) {
      const w = walls[i];
      const dx = w.x2 - w.x1;
      const dy = w.y2 - w.y1;
      const len = Math.hypot(dx, dy);
      if (len < 0.05) continue;
      const halfT = Math.max((w.thickness || 0.15) * 0.5, res * 0.55);
      const steps = Math.max(2, Math.ceil(len / (res * 0.4)));
      for (let s = 0; s <= steps; s++) {
        const px = w.x1 + (dx * s) / steps;
        const py = w.y1 + (dy * s) / steps;
        const c0 = Math.max(0, Math.floor((px - halfT) / cw));
        const c1 = Math.min(cols - 1, Math.floor((px + halfT) / cw));
        const r0 = Math.max(0, Math.floor((py - halfT) / ch));
        const r1 = Math.min(rows - 1, Math.floor((py + halfT) / ch));
        for (let r = r0; r <= r1; r++) {
          for (let c = c0; c <= c1; c++) {
            grid[r * cols + c] = 1;
          }
        }
      }
    }

    const visited = new Uint8Array(cols * rows);
    const rooms = [];
    const queue = new Int32Array(cols * rows);
    const cellArea = cw * ch;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const start = r * cols + c;
        if (grid[start] || visited[start]) continue;
        let head = 0, tail = 0;
        queue[tail++] = start;
        visited[start] = 1;
        let count = 0, sumX = 0, sumY = 0;
        let minC = c, maxC = c, minR = r, maxR = r;

        while (head < tail) {
          const idx = queue[head++];
          const cr = (idx / cols) | 0;
          const cc = idx - cr * cols;
          count++;
          sumX += (cc + 0.5) * cw;
          sumY += (cr + 0.5) * ch;
          if (cc < minC) minC = cc;
          if (cc > maxC) maxC = cc;
          if (cr < minR) minR = cr;
          if (cr > maxR) maxR = cr;

          if (cc > 0 && !grid[idx - 1] && !visited[idx - 1]) { visited[idx - 1] = 1; queue[tail++] = idx - 1; }
          if (cc < cols - 1 && !grid[idx + 1] && !visited[idx + 1]) { visited[idx + 1] = 1; queue[tail++] = idx + 1; }
          if (cr > 0 && !grid[idx - cols] && !visited[idx - cols]) { visited[idx - cols] = 1; queue[tail++] = idx - cols; }
          if (cr < rows - 1 && !grid[idx + cols] && !visited[idx + cols]) { visited[idx + cols] = 1; queue[tail++] = idx + cols; }
        }

        const area = count * cellArea;
        if (area >= 2.2) {
          // Pick an interior anchor guaranteed clear of walls (fixes L-shaped room centroid on divider wall!)
          let bestX = sumX / count;
          let bestY = sumY / count;
          const midC = Math.max(0, Math.min(cols - 1, Math.floor(bestX / cw)));
          const midR = Math.max(0, Math.min(rows - 1, Math.floor(bestY / ch)));
          const hasWallNear = (cc, rr) => {
            for (let dr = -2; dr <= 2; dr++) {
              for (let dc = -2; dc <= 2; dc++) {
                const nr = rr + dr, nc = cc + dc;
                if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || grid[nr * cols + nc]) return true;
              }
            }
            return false;
          };
          if (hasWallNear(midC, midR)) {
            let bestClear = -1;
            for (let k = 0; k < tail; k += Math.max(1, Math.floor(tail / 90))) {
              const id = queue[k];
              const rr = (id / cols) | 0;
              const cc = id - rr * cols;
              // Compute minimum distance to boundary or any wall cell (capped at 8 cells)
              let clr = 8;
              for (let d = 1; d <= 7 && d < clr; d++) {
                if (cc - d < 0 || cc + d >= cols || rr - d < 0 || rr + d >= rows ||
                    grid[rr * cols + (cc - d)] || grid[rr * cols + (cc + d)] ||
                    grid[(rr - d) * cols + cc] || grid[(rr + d) * cols + cc]) {
                  clr = d;
                }
              }
              if (clr > bestClear) {
                bestClear = clr;
                bestX = (cc + 0.5) * cw;
                bestY = (rr + 0.5) * ch;
              }
            }
          }
          rooms.push({
            cx: bestX,
            cy: bestY,
            area: +area.toFixed(1),
            bboxW: +((maxC - minC + 1) * cw).toFixed(2),
            bboxH: +((maxR - minR + 1) * ch).toFixed(2)
          });
        }
      }
    }

    // Sort rooms largest first and assign smart architectural labels
    rooms.sort((a, b) => b.area - a.area);
    const isFr = lang === 'fr';
    const labels = rooms.map((rm, idx) => {
      if (rooms.length === 1) return isFr ? 'Espace Principal' : 'Open Floor';
      if (idx === 0) return isFr ? 'Séjour / Salon' : 'Living Room';
      if (rm.area < 8.5) return isFr ? 'Salle d\'Eau' : 'Bathroom';
      if (idx === 1 && rm.area >= 12) return isFr ? 'Chambre 1' : 'Master Bed';
      if (idx === 2) return isFr ? 'Cuisine' : 'Kitchen';
      return (isFr ? 'Chambre ' : 'Room ') + idx;
    });

    return rooms.map((rm, idx) => ({ ...rm, label: labels[idx] }));
  }

  // =========================================================================
  // 5. FLOOR PLAN STATISTICS EXTRACTOR (2D CAD → ENGINEERING & BOQ SYNC)
  // =========================================================================

  function computeFloorPlanStats(project, floorPlans) {
    const L = project.length;
    const W = project.width;
    const H = project.floorHeight;
    const floors = project.floors;
    const perimeter = 2 * (L + W);
    const footprint = L * W;
    const totalArea = footprint * floors;

    let intWallLen = 0;
    let intWallArea = 0;
    let extWindowCount = 0;
    let extWindowArea = 0;
    let intWindowCount = 0;
    let extDoorCount = 0;
    let intDoorCount = 0;
    let stairCount = 0;
    let columnCount = 0;
    let roomCount = 0;

    const plans = Array.isArray(floorPlans) ? floorPlans : [];
    for (let f = 0; f < floors; f++) {
      const fp = plans[f] || { walls: [], windows: [], doors: [], stairs: [], columns: [] };
      const walls = fp.walls || [];
      for (let i = 0; i < walls.length; i++) {
        const w = walls[i];
        const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
        intWallLen += len;
        intWallArea += len * H;
      }
      const wins = fp.windows || [];
      for (let i = 0; i < wins.length; i++) {
        const win = wins[i];
        const wa = (win.width || 1.4) * (win.height || 1.3);
        if (String(win.wallId || '').startsWith('ext-')) {
          extWindowCount++;
          extWindowArea += wa;
        } else {
          intWindowCount++;
          extWindowArea += wa * 0.5;
        }
      }
      const drs = fp.doors || [];
      for (let i = 0; i < drs.length; i++) {
        const dr = drs[i];
        if (String(dr.wallId || '').startsWith('ext-')) extDoorCount++;
        else intDoorCount++;
      }
      stairCount += (fp.stairs || []).length;
      columnCount += (fp.columns || []).length;
      roomCount += Math.max(1, detectRooms(L, W, walls, 'en').length);
    }

    const grossExtWallArea = perimeter * H * floors;
    const extDoorArea = extDoorCount * 2.15;
    const netExtWallArea = Math.max(grossExtWallArea * 0.45, grossExtWallArea - extWindowArea - extDoorArea);

    return {
      footprint,
      totalArea,
      perimeter,
      grossExtWallArea: +grossExtWallArea.toFixed(1),
      netExtWallArea: +netExtWallArea.toFixed(1),
      intWallLen: +intWallLen.toFixed(1),
      intWallArea: +intWallArea.toFixed(1),
      extWindowCount,
      intWindowCount,
      totalWindowCount: extWindowCount + intWindowCount,
      extWindowArea: +extWindowArea.toFixed(1),
      extDoorCount: Math.max(1, extDoorCount),
      intDoorCount,
      stairCount,
      columnCount,
      roomCount
    };
  }

  // =========================================================================
  // 6. REAL STRUCTURAL ENGINEERING & THERMAL / ENERGY CALCULATIONS
  // =========================================================================

  function computeStructuralEngineering(project, fpStats) {
    const L = project.length;
    const W = project.width;
    const H = project.floorHeight;
    const floors = project.floors;
    const fnd = getFoundationMeta(project.foundationType);
    const roof = getRoofMeta(project.roofType);
    const reg = getRegionMeta(project.region);

    const perimeter = 2 * (L + W);
    const footprint = L * W;
    const loadMult = 1 + (floors - 1) * 0.24; // Multi-story load escalation
    const frostDepth = Math.max(fnd.excavationDepth, reg.frostDepthM);

    // 1. Foundation Concrete (m³) & Excavation (m³) by TRUE Foundation Type
    let fndConcreteM3 = 0;
    let excavationM3 = 0;
    let pileCount = 0;
    let fndWaterproofM2 = 0;

    if (project.foundationType === 'strip') {
      // Continuous strip footing (0.52m wide × 0.35m tall) + 0.25m stem wall + 0.12m slab-on-grade
      const stripLen = perimeter + (fpStats.intWallLen / floors) * 0.40;
      const footingWidth = 0.50 + floors * 0.07;
      fndConcreteM3 = stripLen * footingWidth * 0.35 + stripLen * 0.25 * Math.max(0.35, frostDepth - 0.35) + footprint * 0.12;
      excavationM3 = stripLen * (footingWidth + 0.25) * frostDepth + footprint * 0.30;
      fndWaterproofM2 = footprint * 1.15 + perimeter * 0.8;
    } else if (project.foundationType === 'raft') {
      // Full double-mesh structural reinforced raft mat (0.34m + 0.055m per extra floor) + deepened frost edge beam
      const matThick = 0.34 + (floors - 1) * 0.055;
      fndConcreteM3 = (L + 0.6) * (W + 0.6) * matThick + perimeter * 0.42 * 0.40;
      excavationM3 = (L + 1.4) * (W + 1.4) * (matThick + 0.45);
      fndWaterproofM2 = (L + 0.6) * (W + 0.6) * 1.15 + perimeter * 1.0;
    } else if (project.foundationType === 'pile') {
      // Drilled piles on ~3.5m structural grid + pile caps + perimeter & interior grade beams + suspended slab
      const nx = Math.max(3, Math.ceil(L / 3.6) + 1);
      const nz = Math.max(3, Math.ceil(W / 3.6) + 1);
      pileCount = nx * nz;
      const pileDepth = 4.5 + floors * 1.1; // meters
      const pileRadius = 0.22 + (floors >= 4 ? 0.06 : 0);
      const pilesVol = pileCount * Math.PI * pileRadius * pileRadius * pileDepth;
      const gradeBeamsVol = (perimeter + L + W) * 0.40 * 0.45;
      const suspSlabVol = footprint * 0.18;
      fndConcreteM3 = pilesVol + gradeBeamsVol + suspSlabVol;
      excavationM3 = (perimeter + L + W) * 0.70 * 0.80 + pilesVol * 1.15;
      fndWaterproofM2 = footprint * 1.10 + perimeter * 0.9;
    } else {
      // Full Waterproofed Basement (-2.6m deep concrete walls + 0.28m mat slab + ground floor ceiling slab)
      const baseH = 2.6;
      const baseSlabVol = (L + 0.6) * (W + 0.6) * (0.28 + (floors - 1) * 0.04);
      const baseWallsVol = perimeter * 0.28 * baseH + (fpStats.intWallLen / floors) * 0.20 * baseH * 0.4;
      const baseCeilVol = footprint * 0.18;
      fndConcreteM3 = baseSlabVol + baseWallsVol + baseCeilVol;
      excavationM3 = (L + 2.0) * (W + 2.0) * (baseH + 0.45);
      fndWaterproofM2 = footprint * 1.15 + perimeter * (baseH + 0.5);
    }

    // 2. Superstructure Concrete (Corner/Grid Columns + Seismic Ring Beams + Upper Slabs + Stairs)
    const perimCols = Math.max(4, Math.ceil(perimeter / 4.2));
    const totalStructCols = perimCols + Math.max(0, Math.round(fpStats.columnCount / floors));
    const colConcreteM3 = totalStructCols * (0.30 * 0.30) * H * floors;
    const beamConcreteM3 = (perimeter + (fpStats.intWallLen / floors) * 0.5) * 0.28 * 0.32 * floors;
    const upperSlabsM3 = (floors - 1) * footprint * 0.17 + (project.roofType === 'flat' ? footprint * 0.17 : 0);
    const stairsConcreteM3 = Math.max(floors - 1, fpStats.stairCount) * 2.15;
    const structConcreteM3 = colConcreteM3 + beamConcreteM3 + upperSlabsM3 + stairsConcreteM3;

    const totalConcreteM3 = +(fndConcreteM3 + structConcreteM3).toFixed(1);
    const totalConcreteTons = +(totalConcreteM3 * 2.4).toFixed(1);

    // 3. Rebar Steel Breakdown (kg) by bar diameter (∅16/∅12 longitudinal + ∅8 stirrups)
    const fndRebarKgPerM3 = project.foundationType === 'pile' ? 112 : project.foundationType === 'raft' ? 105 : project.foundationType === 'basement' ? 98 : 82;
    const structRebarKgPerM3 = 115 + (floors - 1) * 8;
    const fndRebarKg = fndConcreteM3 * fndRebarKgPerM3 * (0.95 + (floors - 1) * 0.06);
    const structRebarKg = structConcreteM3 * structRebarKgPerM3;
    const totalRebarKg = Math.round(fndRebarKg + structRebarKg);
    const rebar16Kg = Math.round(totalRebarKg * 0.44);
    const rebar12Kg = Math.round(totalRebarKg * 0.36);
    const rebar08Kg = totalRebarKg - rebar16Kg - rebar12Kg;

    // 4. Roof Area & Snow Load Check
    const roofOverhangL = L + 1.0;
    const roofOverhangW = W + 1.0;
    const roofAreaM2 = +(roofOverhangL * roofOverhangW * roof.areaMult).toFixed(1);
    const snowTotalKn = +(roofAreaM2 * reg.snowLoadKpa).toFixed(1);

    return {
      foundationId: project.foundationType,
      frostDepthM: +frostDepth.toFixed(2),
      pileCount,
      excavationM3: +excavationM3.toFixed(1),
      fndConcreteM3: +fndConcreteM3.toFixed(1),
      structConcreteM3: +structConcreteM3.toFixed(1),
      totalConcreteM3,
      totalConcreteTons,
      fndRebarKg: Math.round(fndRebarKg),
      structRebarKg: Math.round(structRebarKg),
      totalRebarKg,
      rebar16Kg,
      rebar12Kg,
      rebar08Kg,
      fndWaterproofM2: +fndWaterproofM2.toFixed(1),
      totalStructCols,
      roofAreaM2,
      snowLoadKpa: reg.snowLoadKpa,
      snowTotalKn,
      loadMult: +loadMult.toFixed(2)
    };
  }

  function computeThermalEnergy(project, fpStats) {
    const reg = getRegionMeta(project.region);
    // U = 1 / (R_si + R_masonry + R_ins + R_se)
    const wallR = 0.17 + (0.25 / 0.22) + ((reg.wallInsMm / 1000) / 0.036); // Thermal block + EPS/Mineral wool
    const roofR = 0.14 + 0.18 + ((reg.roofInsMm / 1000) / 0.035);
    const uWall = +(1 / wallR).toFixed(2);
    const uRoof = +(1 / roofR).toFixed(2);
    const uWin = reg.glazingU;

    const wwrPct = fpStats.grossExtWallArea > 0
      ? Math.min(85, +((fpStats.extWindowArea / fpStats.grossExtWallArea) * 100).toFixed(1))
      : 15;

    // Simplified steady-state transmission + ventilation energy demand (kWh/m²·yr)
    const heatLossWPerK =
      fpStats.netExtWallArea * uWall +
      fpStats.footprint * uRoof +
      fpStats.extWindowArea * uWin +
      fpStats.footprint * 0.22 + // ground floor loss
      fpStats.totalArea * project.floorHeight * 0.14; // HRV ventilation

    const annualHeatKwh = (heatLossWPerK * reg.hdd * 24) / 1000 * 0.72; // Solar & internal gains credit
    const annualCoolKwh = (fpStats.extWindowArea * 0.45 + fpStats.footprint * 0.12) * reg.cdd * 0.085;
    const totalEnergyIntensity = Math.max(18, Math.round((annualHeatKwh + annualCoolKwh) / Math.max(1, fpStats.totalArea)));

    let energyClass = 'C';
    let badgeColor = '#f59e0b';
    if (totalEnergyIntensity <= 38) { energyClass = 'A+'; badgeColor = '#10b981'; }
    else if (totalEnergyIntensity <= 62) { energyClass = 'A'; badgeColor = '#22c55e'; }
    else if (totalEnergyIntensity <= 95) { energyClass = 'B'; badgeColor = '#84cc16'; }
    else if (totalEnergyIntensity <= 135) { energyClass = 'C'; badgeColor = '#f59e0b'; }
    else { energyClass = 'D'; badgeColor = '#ef4444'; }

    const warnings = [];
    if (project.region === 'cold' && wwrPct > 28) {
      warnings.push({
        en: `High glazing ratio (${wwrPct}%) for Cold climate — upgrade to triple Low-E argon windows.`,
        fr: `Taux vitré élevé (${wwrPct}%) pour climat froid — prévoir triple vitrage argon.`
      });
    }
    if (project.region === 'hot' && wwrPct > 32) {
      warnings.push({
        en: `High solar exposure (${wwrPct}% WWR) — add external brise-soleil shading on South/West walls.`,
        fr: `Apport solaire élevé (${wwrPct}% vitré) — prévoir brise-soleil extérieurs Sud/Ouest.`
      });
    }
    if (project.region === 'cold' && project.roofType === 'flat') {
      warnings.push({
        en: `Flat roof in Cold/Alpine zone (${reg.snowLoadKpa} kPa snow) — verify structural beam deflection & heated drains.`,
        fr: `Toit plat en zone froide (${reg.snowLoadKpa} kPa neige) — vérifier flèche dalle & évacuations chauffantes.`
      });
    }
    if (project.floors >= 3 && project.foundationType === 'strip') {
      warnings.push({
        en: `${project.floors} floors on Strip Footings — geotechnical soil bearing check recommended (consider Raft or Piles).`,
        fr: `${project.floors} étages sur semelles filantes — étude géotechnique G2 recommandée (envisager Radier ou Pieux).`
      });
    }

    return {
      uWall,
      uRoof,
      uWin,
      wallInsMm: reg.wallInsMm,
      roofInsMm: reg.roofInsMm,
      wwrPct,
      energyIntensity: totalEnergyIntensity,
      energyClass,
      badgeColor,
      warnings
    };
  }

  // =========================================================================
  // 7. COMPLETE 7-PHASE, 42-STEP BILINGUAL ENGINEERING DATABASE (EN & FR)
  // =========================================================================

  const PHASES_META = [
    { id: 'foundation', idx: 0, icon: '⛏️', color: '#a16207', en: 'Foundation & Earthworks', fr: 'Terrassement & Fondations', laborPct: 0.36 },
    { id: 'structure',  idx: 1, icon: '🧱', color: '#dc2626', en: 'Structural Frame & Masonry', fr: 'Gros Œuvre & Structure', laborPct: 0.42 },
    { id: 'roof',       idx: 2, icon: '🏠', color: '#ea580c', en: 'Roof Framing & Covering', fr: 'Charpente & Couverture', laborPct: 0.40 },
    { id: 'exterior',   idx: 3, icon: '🪟', color: '#0284c7', en: 'Envelope, Glazing & Cladding', fr: 'Enveloppe, Menuiseries & Façade', laborPct: 0.35 },
    { id: 'interior',   idx: 4, icon: '🚪', color: '#7c3aed', en: 'Interior Partitions & Screed', fr: 'Cloisons, Chapes & Sols', laborPct: 0.45 },
    { id: 'utilities',  idx: 5, icon: '⚡', color: '#f59e0b', en: 'MEP Utilities (Plumbing/Elec/HVAC)', fr: 'Réseaux MEP (Plomberie/Élec/CVC)', laborPct: 0.48 },
    { id: 'finishes',   idx: 6, icon: '🎨', color: '#10b981', en: 'Finishes, Painting & Landscaping', fr: 'Finitions, Peinture & Extérieurs', laborPct: 0.46 }
  ];

  const STEPS_DB = [
    // PHASE 0: FOUNDATION (6 steps)
    [
      {
        id: 'f1', durDays: 3,
        en: { title: 'Geotechnical Survey & Topographic Staking', desc: 'Confirm soil bearing capacity (G2 study), mark building corners with batter boards and laser total station, and verify setback easements.', tip: 'Check diagonal equality (Pythagoras 3-4-5) within ±5mm before excavation starts.', warn: 'Never pour foundations without checking underground utility lines and water table depth.', std: 'Eurocode 7 / ASTM D1586' },
        fr: { title: 'Étude Géotechnique & Implantation Topo', desc: 'Valider la portance du sol (étude G2), implanter les chaises et axes au laser/théodolite et vérifier les limites séparatives.', tip: 'Contrôlez l\'égalité des diagonales à ±5 mm avant le premier coup de pelle.', warn: 'Ne terrassez jamais sans DICT (réseaux enterrés) ni vérification de la nappe phréatique.', std: 'Eurocode 7 / NF P94-500' }
      },
      {
        id: 'f2', durDays: 4,
        en: { title: 'Site Clearing & Frost-Line Excavation', desc: 'Strip topsoil (30 cm), excavate trenches/pit below local frost depth, compact subgrade with vibratory plate and install geotextile fabric.', tip: 'Stockpile clean topsoil separately to save landscaping costs during Phase 7.', warn: 'Sloped excavations deeper than 1.5m require trench shoring for worker safety.', std: 'OSHA 1926.652 / DTU 12' },
        fr: { title: 'Décapage & Terrassement Hors-Gel', desc: 'Décaper la terre végétale (30 cm), creuser les fouilles sous la profondeur hors-gel locale, compacter le fond de fouille et poser le géotextile.', tip: 'Stockez la terre végétale à part pour la réutiliser gratuitement en Phase 7.', warn: 'Au-delà de 1,30 m de profondeur, talutez ou blindez impérativement les tranchées.', std: 'DTU 12 / Eurocode 7' }
      },
      {
        id: 'f3', durDays: 2,
        en: { title: 'Blinding Concrete & Formwork Setup', desc: 'Pour 8 cm C12/15 lean blinding concrete to create a clean working surface, then erect braced timber or steel perimeter formwork.', tip: 'Apply release oil to formwork panels before rebar placement so stripping stays crisp.', warn: 'Verify exact elevation benchmarks (+0.00m FFL) against municipal road drainage level.', std: 'ACI 347 / EN 13670' },
        fr: { title: 'Béton de Propreté & Coffrage', desc: 'Couler 8 cm de béton de propreté C12/15 pour assainir le fond de fouille, puis installer et étayer les coffrages périphériques.', tip: 'Huilez les banches avant de poser les ferraillages pour un décoffrage net.', warn: 'Vérifiez le niveau altimétrique (+0,00 m) par rapport à la voirie et au tout-à-l\'égout.', std: 'DTU 13.1 / EN 13670' }
      },
      {
        id: 'f4', durDays: 4,
        en: { title: 'Rebar Cage Assembly & Grounding Loop', desc: 'Tie longitudinal BST500 bars (∅16/∅12) with ∅8 stirrups using 50mm concrete cover spacers; install bare copper 25mm² earthing loop around footing.', tip: 'Overlap spliced rebar by at least 50 × bar diameter (e.g., 60cm for ∅12) and bend L-hooks at corners.', warn: 'Steel bars touching bare soil will corrode and crack the foundation — always use spacers.', std: 'Eurocode 2 / ACI 318' },
        fr: { title: 'Ferraillage Armé & Boucle de Terre', desc: 'Ligaturer les armatures HA (∅16/∅12) et cadres ∅8 sur cales de 5 cm d\'enrobage ; poser le câble cuivre nu 25 mm² en fond de fouille.', tip: 'Respectez un recouvrement minimal de 50 × diamètre aux jonctions et posez des équerres d\'angle.', warn: 'L\'acier en contact direct avec la terre rouille et fait éclater le béton : cales obligatoires.', std: 'Eurocode 2 / NF C 15-100' }
      },
      {
        id: 'f5', durDays: 3,
        en: { title: 'Structural Concrete Pour & Vibration', desc: 'Pour ready-mix C25/30 (or C30/37 for raft/basement) continuously using boom pump, vibrate thoroughly to eliminate voids, and cure damp for 7 days.', tip: 'Schedule pours in early morning when ambient temp is 10–24°C to prevent thermal shrinkage cracks.', warn: 'Never add extra water on site to the mixer truck — it severely reduces concrete MPa strength.', std: 'EN 206 / ACI 301' },
        fr: { title: 'Coulage Béton C25/30 & Vibration', desc: 'Couler en continu au camion-pompe du béton C25/30 (ou C30/37 pour radier/sous-sol), vibrer à l\'aiguille et assurer la cure humide 7 jours.', tip: 'Programmez le coulage tôt le matin (10–24 °C) pour éviter le faïençage thermique.', warn: 'N\'ajoutez jamais d\'eau dans la toupie sur chantier : la résistance MPa chute drastiquement.', std: 'NF EN 206 / DTU 21' }
      },
      {
        id: 'f6', durDays: 3,
        en: { title: 'Waterproofing, Perimeter Drain & Backfill', desc: 'Apply bituminous waterproofing membrane + dimpled protection mat, lay perforated French drain in washed gravel with geotextile, and install radon/vapor barrier.', tip: 'Slope perimeter drainage pipe at minimum 1% toward storm inspection chamber.', warn: 'Do not backfill against basement walls until concrete cures ≥14 days and slab braces the top.', std: 'DIN 18533 / DTU 20.1' },
        fr: { title: 'Étanchéité, Drain Périphérique & Remblai', desc: 'Appliquer l\'enduit bitumineux + nappe à excroissances, poser le drain agricole en gravier lavé sous géotextile et le film polyane/radon.', tip: 'Donnez une pente minimale de 1 cm/m au drain vers un regard de visite visitable.', warn: 'Ne remblayez jamais les voiles de sous-sol avant 14 jours de séchage et plancher haut posé.', std: 'DTU 20.1 / DIN 18533' }
      }
    ],
    // PHASE 1: STRUCTURE (6 steps)
    [
      {
        id: 's1', durDays: 4,
        en: { title: 'Damp-Proof Course & First Masonry Course', desc: 'Lay EPDM/bitumen capillary break under all walls and set the laser-leveled first course of thermal clay/AAC blocks in mortar bed.', tip: 'Laser-leveling the first block course to ±2mm makes every upper course effortless and plumb.', warn: 'Skipping the capillary damp-proof course causes permanent rising damp in ground-floor walls.', std: 'EN 771 / DTU 20.1' },
        fr: { title: 'Arase Étanche & Premier Rang de Maçonnerie', desc: 'Poser la bande d\'arase étanche anti-capillarité et régler au laser le premier rang de briques thermiques ou béton cellulaire.', tip: 'Un premier rang réglé à ±2 mm garantit la planéité parfaite de toute l\'élévation.', warn: 'L\'absence de coupure de capillarité provoque des remontées d\'humidité irréversibles.', std: 'DTU 20.1 / EN 771' }
      },
      {
        id: 's2', durDays: 8,
        en: { title: 'Load-Bearing Exterior & Shear Walls', desc: 'Erect thermal masonry exterior walls with staggered running bond joints, leaving precise rough openings for windows and doors from the 2D CAD plan.', tip: 'Add +20mm rough opening clearance around window/door frames for thermal foam & shims.', warn: 'Verify plumbness every 4 courses and anchor vertical seismic ties at every wall corner.', std: 'Eurocode 6 / Eurocode 8' },
        fr: { title: 'Élévation des Murs Porteurs Extérieurs', desc: 'Monter les murs porteurs en maçonnerie isolante à joints décalés en réservant les tableaux exacts des portes et fenêtres du plan 2D.', tip: 'Prévoyez +20 mm de jeu en tableau pour le réglage et l\'étanchéité à l\'air des menuiseries.', warn: 'Contrôlez l\'aplomb tous les 4 rangs et liez les chaînages verticaux dans chaque angle.', std: 'Eurocode 6 / Eurocode 8' }
      },
      {
        id: 's3', durDays: 5,
        en: { title: 'Reinforced Concrete Columns & Lintels', desc: 'Form and pour structural corner/interior concrete columns tied to foundation starter bars, and install insulated structural lintels over every opening.', tip: 'Ensure minimum 25 cm bearing length on each side of window and door lintels.', warn: 'Wide spans (>2.4m) require engineered steel-reinforced concrete beams, never standard hollow lintels.', std: 'Eurocode 2 / ACI 318' },
        fr: { title: 'Poteaux Béton Armé & Linteaux', desc: 'Coffrer et couler les poteaux d\'angle/intérieurs repris sur les attentes de fondation, et poser des linteaux isolés au-dessus de chaque ouverture.', tip: 'Assurez un appui minimal de 25 cm de chaque côté pour les linteaux porteurs.', warn: 'Les baies >2,4 m exigent une poutre béton calculée, jamais un pré-linteau standard.', std: 'Eurocode 2 / BAEL' }
      },
      {
        id: 's4', durDays: 4,
        en: { title: 'Seismic Perimeter Ring Beams (Tie Beams)', desc: 'Install continuous horizontal reinforced concrete ring beams at the top of every story to lock walls into a rigid seismic diaphragm.', tip: 'Line outer face of concrete ring beams with 50mm XPS insulation to eliminate thermal bridges.', warn: 'Discontinuous ring beams compromise lateral stability under wind and seismic loads.', std: 'Eurocode 8 / IBC 2021' },
        fr: { title: 'Chaînages Horizontaux & Ceintures Sismiques', desc: 'Couler les chaînages béton armé continus en tête de chaque niveau pour solidariser les murs en diaphragme rigide parasismique.', tip: 'Posez des planelles isolantes (50 mm XPS) en rive de dalle pour couper les ponts thermiques.', warn: 'Un chaînage interrompu fragilise gravement la tenue au vent et aux séismes.', std: 'Eurocode 8 / PS-MI' }
      },
      {
        id: 's5', durDays: 6,
        en: { title: 'Intermediate Floor Slabs & Decking', desc: 'Prop temporary shoring, place precast beam-and-block or monolithic reinforced concrete slabs, route slab conduits, and pour compression topping.', tip: 'Maintain full shoring props for at least 21–28 days before stripping under multi-story slabs.', warn: 'Reserve exact stairwell openings and vertical plumbing shaft penetrations before pouring.', std: 'EN 15037 / DTU 23.1' },
        fr: { title: 'Planchers Intermédiaires & Dalles Hautes', desc: 'Installer l\'étaiement, poser le plancher poutrelles-hourdis ou dalle pleine armée, intégrer les réservations et couler la dalle de compression.', tip: 'Conservez l\'étaiement complet au moins 21 à 28 jours avant décoffrage.', warn: 'Vérifiez les dimensions de la trémie d\'escalier et des gaines techniques avant coulage.', std: 'DTU 23.1 / EN 15037' }
      },
      {
        id: 's6', durDays: 4,
        en: { title: 'Structural Staircase Construction', desc: 'Form, reinforce and cast concrete flight(s) (or install steel stringer frame) verifying comfortable Blondel formula (2×Riser + Tread = 60–64 cm).', tip: 'Target 17.5 cm riser height and 28 cm tread depth for ergonomic daily comfort and code compliance.', warn: 'Check minimum 2.10m clear headroom along the entire sloped stair path.', std: 'IBC 1011 / NF P01-012' },
        fr: { title: 'Construction de l\'Escalier Structural', desc: 'Coffrer, ferrailler et couler les volées béton (ou poser la structure acier) en respectant la loi de Blondel (2×Hauteur + Giron = 60–64 cm).', tip: 'Visez 17,5 cm de hauteur de marche et 28 cm de giron pour un confort optimal.', warn: 'Contrôlez l\'échappée de tête minimale de 2,10 m sur toute la trajectoire de l\'escalier.', std: 'NF P01-012 / Blondel' }
      }
    ],
    // PHASE 2: ROOF (6 steps)
    [
      {
        id: 'r1', durDays: 3,
        en: { title: 'Wall Plates & Structural Anchor Bolts', desc: 'Anchor preservative-treated C24 structural timber wall plates onto concrete ring beams with M12 chemical anchors over EPDM capillary gasket.', tip: 'Use galvanized hurricane tie-down straps in coastal or high-wind climate zones.', warn: 'Never rest untreated wood directly on concrete — moisture transfer causes dry rot.', std: 'Eurocode 5 / DTU 31.1' },
        fr: { title: 'Sablières & Ancrages Structuraux', desc: 'Fixer les sablières bois C24 traité classe 2 sur les chaînages béton par tiges filetées M12 scellées chimiquement sur bande EPDM.', tip: 'Ajoutez des équerres anti-arrachement galvanisées en zone de vents forts.', warn: 'Ne posez jamais de bois non protégé directement sur le béton (risque de pourrissement).', std: 'Eurocode 5 / DTU 31.1' }
      },
      {
        id: 'r2', durDays: 5,
        en: { title: 'Roof Trusses / Rafters & Ridge Framing', desc: 'Crane-lift prefabricated C24 timber trusses or assemble rafters, ridge beam, purlins, and diagonal wind bracing engineered for local snow load.', tip: 'Install cross-bracing immediately as trusses go up to prevent domino collapse during wind gusts.', warn: 'Never notch or cut load-bearing truss chords on site without structural engineer sign-off.', std: 'Eurocode 5 / EN 14250' },
        fr: { title: 'Charpente Bois / Fermettes & Contreventement', desc: 'Lever les fermettes C24 ou assembler pannes, chevrons, faîtage et contreventements diagonaux calculés selon la charge de neige locale.', tip: 'Posez immédiatement les lisses de contreventement pour sécuriser la charpente au vent.', warn: 'Ne découpez jamais une barre de fermette industrielle sans avis du bureau d\'études.', std: 'Eurocode 5 / DTU 31.3' }
      },
      {
        id: 'r3', durDays: 3,
        en: { title: 'Breathable Underlayment & Counter-Battens', desc: 'Unroll high-permeability HPV vapor-open membrane (Sd < 0.05m) horizontally with 15cm taped overlaps, then nail vertical ventilation counter-battens.', tip: 'Install eave bird combs and insect mesh at the bottom ventilation intake gap.', warn: 'Maintain an unobstructed 40mm ventilated air gap beneath roof tiles to prevent condensation.', std: 'EN 13859 / DTU 40.29' },
        fr: { title: 'Écran Sous-Toiture HPV & Contre-Lattage', desc: 'Dérouler l\'écran haute perméabilité vapeur (HPV, Sd < 0,05 m) avec recouvrement scotché de 15 cm, puis clouer les contre-lattes de ventilation.', tip: 'Posez des closoirs peignes anti-oiseaux et grilles anti-rongeurs en égout de toit.', warn: 'Garantissez une lame d\'air ventilée continue de 40 mm sous la couverture.', std: 'DTU 40.29 / EN 13859' }
      },
      {
        id: 'r4', durDays: 4,
        en: { title: 'High-R Thermal Roof Insulation & Vapor Control', desc: 'Install cross-layered mineral wool / PIR insulation between and under rafters (or tapered PIR + EPDM/TPO for flat roofs) with airtight smart vapor retarder.', tip: 'Cross-laying two insulation layers eliminates thermal leaks through every timber rafter.', warn: 'Tape every membrane seam and pipe penetration — air leaks carry 100× more moisture than diffusion.', std: 'EN ISO 6946 / RE2020' },
        fr: { title: 'Isolation Thermique Toiture & Pare-Vapeur', desc: 'Poser l\'isolation croisée laine minérale/bois ou panneaux PIR (en pente ou toiture chaude plate) avec membrane pare-vapeur hygrovariable scotchée.', tip: 'La pose en double couche croisée supprime les ponts thermiques des chevrons.', warn: 'Scotchez minutieusement chaque recouvrement et traversée de gaine pour l\'étanchéité à l\'air.', std: 'RE2020 / DTU 45.10' }
      },
      {
        id: 'r5', durDays: 5,
        en: { title: 'Roof Covering (Clay Tiles / Metal / EPDM)', desc: 'Install interlocking ceramic tiles, standing-seam metal, or welded waterproof membrane (for flat roofs) with ventilated dry ridge and lead-free flashings.', tip: 'Clip every perimeter tile and every 3rd field tile in high-wind zones.', warn: 'Waterproof valleys, chimneys and skylights with double-folded step flashings.', std: 'DTU 40.21 / NRCA' },
        fr: { title: 'Couverture (Tuiles / Bac Acier / EPDM)', desc: 'Poser les tuiles terre cuite, le bac acier joint debout ou la membrane EPDM soudée (toit plat) avec faîtage ventilé à sec et solins étanches.', tip: 'Fixez par crochets ou vis toutes les tuiles de rive et 1 tuile sur 3 en zone ventée.', warn: 'Soignez l\'étanchéité des noues, cheminées et fenêtres de toit par abergements façonnés.', std: 'DTU 40.21 / DTU 43.1' }
      },
      {
        id: 'r6', durDays: 2,
        en: { title: 'Fascia, Soffits, Gutters & Downpipes', desc: 'Fit ventilated soffits, aluminum/zinc half-round gutters sloped at 5mm/m, leaf guards, and corner downpipes discharging into storm drainage.', tip: 'Add a 2,000L rainwater harvesting diverter on one downpipe for free garden irrigation.', warn: 'Never discharge roof downpipes directly against foundation walls — extend minimum 2m away.', std: 'EN 612 / DTU 40.5' },
        fr: { title: 'Sous-Faces, Gouttières & Descentes EP', desc: 'Installer les débords ventilés, gouttières zinc/alu avec pente 5 mm/m, crapaudines et descentes raccordées au réseau d\'eaux pluviales.', tip: 'Prévoyez un récupérateur d\'eau de pluie sur une descente pour l\'arrosage extérieur.', warn: 'Ne rejetez jamais les eaux pluviales au pied des fondations : raccordez à plus de 2 m.', std: 'DTU 40.5 / EN 612' }
      }
    ],
    // PHASE 3: EXTERIOR (6 steps)
    [
      {
        id: 'e1', durDays: 5,
        en: { title: 'High-Performance Windows & Airtight Taping', desc: 'Mount triple/double Low-E argon windows aligned with thermal layer, shim level, seal with expanding polyurethane foam + interior vapor & exterior wind tapes.', tip: 'Install windows flush with the outer masonry face when using ETICS cladding to eliminate jamb cold bridges.', warn: 'Test every sash tilt-and-turn operation BEFORE foaming or plastering frames.', std: 'EN 14351 / RAL Montage' },
        fr: { title: 'Pose des Fenêtres & Étanchéité Périphérique', desc: 'Poser les menuiseries Low-E argon alignées sur le plan isolant, caler au niveau, isoler au compribande/mousse + membranes air/pluie.', tip: 'La pose au nu extérieur avec ITE supprime quasi totalement les ponts thermiques de tableau.', warn: 'Testez l\'ouverture et l\'oscillo-battant de chaque vantail AVANT le calfeutrement définitif.', std: 'DTU 36.5 / EN 14351' }
      },
      {
        id: 'e2', durDays: 2,
        en: { title: 'Insulated Entrance Door & Thermal Threshold', desc: 'Fit multi-point security exterior doors with thermally broken aluminum sill, rain deflector drip cap, and airtight perimeter gasket.', tip: 'Choose RC2/RC3 multi-point lock cylinders with Ud ≤ 1.1 W/m²K thermal transmittance.', warn: 'Verify exact finished floor thickness (+12–15 cm screed + tile) when setting door sill height!', std: 'EN 1627 / DTU 36.5' },
        fr: { title: 'Porte d\'Entrée Isolante & Seuil Thermique', desc: 'Installer la porte extérieure multipoints sur seuil aluminium à rupture de pont thermique avec rejingot et joint périphérique.', tip: 'Visez une serrure sécurité RC2/RC3 et un coefficient thermique Ud ≤ 1,1 W/m²K.', warn: 'Calculez impérativement le niveau du sol fini (+12 à 15 cm chape + carrelage) avant scellement !', std: 'EN 1627 / DTU 36.5' }
      },
      {
        id: 'e3', durDays: 6,
        en: { title: 'ETICS External Thermal Cladding System', desc: 'Glue and mechanically dowel graphite EPS or rockwool facade boards in staggered bond, reinforce corners with fiberglass mesh, and apply basecoat.', tip: 'Use waterproof XPS plinth boards on the lower 50cm splash zone above grade.', warn: 'Apply adhesive in perimeter ribbon + dots (never dots alone) to stop chimney airflow behind insulation.', std: 'ETAG 004 / EN 13499' },
        fr: { title: 'Isolation Thermique Extérieure (ITE)', desc: 'Coller et cheviller en quinconce les panneaux PSE graphité ou laine de roche, poser les cornières d\'angle et maroufler la trame fibre de verre.', tip: 'Utilisez du polystyrène extrudé XPS hydrofuge sur les 50 cm de soubassement.', warn: 'Encollez en boudin périphérique + plots pour éviter toute lame d\'air parasite derrière l\'isolant.', std: 'CPT 3035 / ETAG 004' }
      },
      {
        id: 'e4', durDays: 2,
        en: { title: 'Exterior Window Sills & Drip Flashings', desc: 'Set sloped aluminum or stone exterior window sills (≥5° slope) with upturned end-caps and thermal foam bed underneath.', tip: 'Sill front drip edge must project at least 35mm past finished facade plaster to prevent rain streaks.', warn: 'Seal side end-caps with UV-resistant MS polymer sealant against wind-driven rain.', std: 'DTU 26.1 / DIN 18533' },
        fr: { title: 'Appuis de Fenêtres & Bavettes Goutte d\'Eau', desc: 'Poser les appuis extérieurs aluminium ou pierre (pente ≥5°) avec embouts relevés latéraux et joint d\'isolation sous appui.', tip: 'Le nez d\'appui doit dépasser d\'au moins 35 mm de l\'enduit fini pour éviter les coulures.', warn: 'Étanchez les joues latérales au mastic polymère MS résistant aux UV.', std: 'DTU 36.5 / DTU 26.1' }
      },
      {
        id: 'e5', durDays: 4,
        en: { title: 'Silicone Facade Render & Architectural Trim', desc: 'Prime exterior basecoat and trowel breathable hydrophobic silicone render (1.5–2mm grain) continuously wall-to-wall without cold joints.', tip: 'Schedule one full facade elevation per crew pass in shaded conditions (5–25°C) for seamless color.', warn: 'Protect freshly rendered facades from heavy rain or direct blazing sun for 48 hours.', std: 'EN 15824 / DTU 26.1' },
        fr: { title: 'Enduit de Finition Silicone & Modénatures', desc: 'Appliquer le régulateur de fond puis l\'enduit mince organique/silicone hydrofuge (grain 1,5 mm) d\'un seul tenant par façade.', tip: 'Travaillez une façade complète sans reprise et à l\'ombre (5–25 °C) pour une teinte uniforme.', warn: 'Protégez les façades fraîches de la pluie battante et du soleil direct pendant 48 h.', std: 'DTU 26.1 / EN 15824' }
      },
      {
        id: 'e6', durDays: 3,
        en: { title: 'Entrance Porch Steps & Perimeter Apron', desc: 'Cast concrete entrance steps with non-slip finish and lay sloped 80cm perimeter splash apron away from foundation walls.', tip: 'Decouple concrete porch steps from main wall with 20mm XPS expansion joint to stop frost heave.', warn: 'Ensure 2% outward slope on all exterior paving so surface rainwater never pools near walls.', std: 'IBC 1011 / DTU 13.3' },
        fr: { title: 'Perron d\'Entrée & Trottoir Périphérique', desc: 'Couler les marches d\'entrée antidérapantes et réaliser un trottoir de propreté de 80 cm en pente vers l\'extérieur.', tip: 'Désolidarisez le perron de la façade par un joint XPS de 20 mm pour éviter les fissures de gel.', warn: 'Respectez une pente sortante de 2% pour éloigner les eaux de ruissellement.', std: 'DTU 13.3 / PMR' }
      }
    ],
    // PHASE 4: INTERIOR (6 steps)
    [
      {
        id: 'i1', durDays: 6,
        en: { title: 'Interior Partition Walls & Acoustic Framing', desc: 'Build interior masonry/stud partitions matching the 2D CAD floor plan, stuffed with 50mm acoustic mineral wool and green moisture board in wet rooms.', tip: 'Place resilient acoustic foam strip under all metal floor/ceiling tracks to cut flanking noise.', warn: 'Reinforce stud walls with plywood backing wherever wall-hung toilets, TVs or kitchen cabinets go.', std: 'EN 520 / DTU 25.41' },
        fr: { title: 'Cloisons Intérieures & Isolation Acoustique', desc: 'Monter les cloisons de distribution selon le plan 2D avec laine acoustique 50 mm et plaques hydrofuges vertes (H1) dans les pièces d\'eau.', tip: 'Posez une bande résiliente acoustique sous les rails sol/plafond pour bloquer les bruits solidiens.', warn: 'Prévoyez des renforts bois/métal aux emplacements des meubles hauts, TV et WC suspendus.', std: 'DTU 25.41 / EN 520' }
      },
      {
        id: 'i2', durDays: 5,
        en: { title: 'Gypsum Wall Plastering & Ceiling Boarding', desc: 'Apply machine-sprayed gypsum plaster on masonry walls (lime-cement in bathrooms) and install suspended fire/acoustic gypsum ceilings.', tip: 'Embed stainless corner beads on all outside wall angles for crisp impact-resistant edges.', warn: 'Allow plastered walls to dry thoroughly with cross-ventilation before installing wood flooring.', std: 'EN 13279 / DTU 25.1' },
        fr: { title: 'Plâtrerie Murale & Faux-Plafonds', desc: 'Projeter l\'enduit plâtre sur maçonneries (ciment/chaux en pièces humides) et poser les faux-plafonds BA13 sur suspentes acoustiques.', tip: 'Intégrez des baguettes d\'angle galvanisées sur toutes les arêtes saillantes.', warn: 'Ventilez abondamment après plâtrerie pour évacuer l\'humidité avant la pose des parquets.', std: 'DTU 25.1 / DTU 25.41' }
      },
      {
        id: 'i3', durDays: 4,
        en: { title: 'Subfloor Insulation & Floating Screed', desc: 'Lay EPS100 thermal/acoustic floor boards, perimeter expansion strip, underfloor heating pipes (Phase 6), and pour 60mm laser-leveled cement/anhydrite screed.', tip: 'Anhydrite self-leveling screed boosts underfloor heating heat-transfer efficiency by +20%.', warn: 'Always run a controlled 14-day heating ramp-up protocol before gluing wood or large tiles.', std: 'EN 13813 / DTU 26.2' },
        fr: { title: 'Isolant Sol & Chape Flottante', desc: 'Poser l\'isolant TMS/PSE100, la bande périphérique, les boucles de plancher chauffant et couler la chape fluide ou ciment 60 mm au laser.', tip: 'La chape fluide anhydrite améliore le rendement du plancher chauffant d\'environ +20%.', warn: 'Effectuez impérativement le cycle de mise en chauffe progressif avant collage du carrelage/parquet.', std: 'DTU 26.2 / EN 13813' }
      },
      {
        id: 'i4', durDays: 5,
        en: { title: 'Wet-Room Tanking & Ceramic Tile Work', desc: 'Brush two cross-coats of liquid waterproofing membrane + corner tapes in showers/bathrooms, then lay porcelain floor/wall tiles with flexible C2S1 adhesive.', tip: 'Slope walk-in shower floor at 1.5–2% toward linear trench drain.', warn: 'Never grout wall-to-floor corners with rigid cement — use flexible mold-resistant sanitary silicone.', std: 'DTU 52.2 / ANSI A118.10' },
        fr: { title: 'Étanchéité SPEC & Carrelage / Faïence', desc: 'Appliquer 2 couches croisées d\'étanchéité liquide (SPEC) + bandes d\'angle en douche, puis coller grès cérame et faïence au mortier C2S1.', tip: 'Formez une pente régulière de 1,5 à 2% vers le caniveau de douche à l\'italienne.', warn: 'Remplissez toujours les angles murs/sol au silicone sanitaire souple, jamais au joint ciment.', std: 'DTU 52.2 / SPEC' }
      },
      {
        id: 'i5', durDays: 4,
        en: { title: 'Engineered Wood / Laminate Flooring', desc: 'Verify screed moisture (<2.0% CM cement / <0.5% anhydrite), lay high-density acoustic underlay, and install flooring with 10mm wall expansion gaps.', tip: 'Lay floorboards parallel to the primary natural daylight direction from main windows.', warn: 'Acclimatize boxed wood planks inside the room for at least 48 hours before installation.', std: 'DTU 51.11 / NWFA' },
        fr: { title: 'Pose Parquet / Sols Stratifiés', desc: 'Contrôler l\'humidité résiduelle de la chape (<2% ciment / <0,5% anhydrite), poser la sous-couche acoustique et les lames avec jeu périphérique de 10 mm.', tip: 'Orientez les lames dans le sens de la lumière naturelle des fenêtres principales.', warn: 'Laissez les paquets de parquet s\'acclimater 48 h dans la pièce avant pose.', std: 'DTU 51.11 / EN 14342' }
      },
      {
        id: 'i6', durDays: 3,
        en: { title: 'Interior Doors, Casings & Stair Balustrades', desc: 'Hang solid-core interior doors (matching 2D CAD count) with concealed hinges, acoustic drop seals, matching baseboards, and stair handrails.', tip: 'Leave a 10mm undercut gap under bedroom/bathroom doors for balanced HRV ventilation airflow.', warn: 'Check stair balustrade spindle spacing ≤11 cm and handrail height ≥90–100 cm for child safety.', std: 'NF P01-012 / IRC R312' },
        fr: { title: 'Portes Intérieures, Plinthes & Garde-Corps', desc: 'Poser les blocs-portes intérieurs (synchronisés avec le plan 2D), charnières réglables, plinthes assorties et garde-corps d\'escalier.', tip: 'Laissez un détalonnage de 10 mm sous les portes pour la circulation d\'air VMC.', warn: 'Vérifiez l\'espacement des barreaux ≤11 cm et la hauteur de garde-corps ≥1,00 m.', std: 'NF P01-012 / DTU 36.2' }
      }
    ],
    // PHASE 5: UTILITIES / MEP (6 steps)
    [
      {
        id: 'u1', durDays: 5,
        en: { title: 'Plumbing Supply Risers & Sanitary Drain Stacks', desc: 'Install insulated PEX/multilayer cold & hot water manifolds, acoustic 110mm waste stacks with roof air-admittance vent, and pressure-test at 6 bar.', tip: 'Use a centralized home-run PEX manifold with individual shut-off valves per fixture.', warn: 'Maintain 2% slope on horizontal waste pipes and photograph every wall chase before closing.', std: 'EN 806 / IPC / DTU 60.1' },
        fr: { title: 'Réseaux Plomberie EF/EC & Évacuations', desc: 'Installer les collecteurs multicouche/PER eau froide & chaude isolés, colonnes d\'évacuation acoustiques Ø110 ventilées et tester sous pression à 6 bars.', tip: 'Une nourrice centrale avec vannes d\'arrêt par appareil facilite toute maintenance future.', warn: 'Respectez 2 cm/m de pente d\'évacuation et photographiez chaque cloison avant fermeture.', std: 'DTU 60.1 / EN 806' }
      },
      {
        id: 'u2', durDays: 6,
        en: { title: 'Electrical Main Panel, Conduits & Wiring', desc: 'Install main breaker distribution panel with Type A/AC 30mA RCDs, SPD surge protector, dedicated heavy circuits (oven, EV charger, heat pump) and Cat6A LAN.', tip: 'Keep 25% spare DIN rail slots in your breaker panel for future solar PV & battery storage.', warn: 'Strictly observe bathroom electrical safety zones (IP44/IPX4) and verify earthing resistance <100 Ω.', std: 'IEC 60364 / NEC / NF C 15-100' },
        fr: { title: 'Tableau Électrique, Gaines ICTA & Câblage', desc: 'Poser le tableau général avec différentiels 30 mA Type A/AC, parafoudre, circuits spécialisés (four, borne VE, PAC) et réseau RJ45 Cat6A.', tip: 'Conservez 25% d\'emplacements libres sur le tableau pour photovoltaïque ou domotique future.', warn: 'Respectez strictement les volumes de sécurité salle de bain (IP44) et terre <100 Ω.', std: 'NF C 15-100 / IEC 60364' }
      },
      {
        id: 'u3', durDays: 5,
        en: { title: 'Heat Pump & Underfloor Heating (UFH) Loops', desc: 'Lay oxygen-barrier PEX-a underfloor serpentine loops spaced 10–15 cm (tighter near exterior windows), connect flow-meter manifolds, and pair with air-to-water heat pump.', tip: 'Pressure-test all UFH loops at 4 bar air/water during screed pour to detect accidental punctures immediately.', warn: 'Keep each UFH loop under 100m length so hydraulic pressure drops stay balanced.', std: 'EN 1264 / DTU 65.14' },
        fr: { title: 'Pompe à Chaleur & Plancher Chauffant', desc: 'Dérouler les boucles PER-BAO au pas de 10–15 cm (resserré devant baies vitrées), raccorder aux collecteurs débitmètres et coupler à la PAC air-eau.', tip: 'Maintenez les boucles sous pression de 4 bars pendant le coulage de chape pour détecter toute fuite.', warn: 'Limitez chaque boucle à 100 m maximum pour garantir l\'équilibrage hydraulique.', std: 'DTU 65.14 / EN 1264' }
      },
      {
        id: 'u4', durDays: 4,
        en: { title: 'Heat-Recovery Ventilation (HRV / MVHR)', desc: 'Route insulated rigid/semi-rigid supply ducts to living/bedrooms and extract ducts from kitchen/bathrooms through a ≥85% efficiency heat-recovery core.', tip: 'Install inline acoustic silencers on both supply and extract main plenums for whisper-quiet operation (<25 dB).', warn: 'Insulate fresh-air intake and exhaust ducts with vapor-tight foam to avoid cold condensation.', std: 'EN 13141 / ASHRAE 62.2' },
        fr: { title: 'VMC Double Flux Haut Rendement', desc: 'Passer les conduits rigides/semi-rigides d\'insufflation (séjour/chambres) et d\'extraction (cuisine/SdB) vers l\'échangeur thermique ≥85%.', tip: 'Ajoutez des pièges à son sur les plénums principaux pour un fonctionnement silencieux (<25 dB).', warn: 'Isolez les gaines d\'air neuf/rejet en mousse étanche pour éviter la condensation hivernale.', std: 'DTU 68.3 / EN 13141' }
      },
      {
        id: 'u5', durDays: 3,
        en: { title: 'Smart Home, Fiber Network & Security Prep', desc: 'Wire recessed PoE camera drops at roof eaves, smart room thermostats, video intercom at entrance, smoke/CO detectors, and solar-ready conduit to roof.', tip: 'Pull a dedicated 32mm empty conduit from attic to electrical panel for effortless future solar PV.', warn: 'Install interconnected smoke alarms on every floor level and inside hallway escape routes.', std: 'EN 14604 / TIA-568' },
        fr: { title: 'Domotique, Fibre Optique & Pré-Équipement Solaire', desc: 'Câbler les points caméras PoE sous débord, thermostats par zone, visiophone, détecteurs fumée/CO et fourreau solaire vers la toiture.', tip: 'Passez une gaine vide Ø32 mm du tableau aux combles pour le futur raccordement photovoltaïque.', warn: 'Installez au minimum un DAAF normalisé par niveau dans les circulations.', std: 'EN 14604 / NF C 15-100' }
      },
      {
        id: 'u6', durDays: 2,
        en: { title: 'MEP Commissioning, Blower-Door & Inspection', desc: 'Perform electrical continuity/RCD trip tests, plumbing pressure sign-off, HVAC airflow balancing, and optional airtightness blower-door test (n50 ≤ 1.0).', tip: 'An infrared thermal camera check during commissioning immediately spots missing insulation pockets.', warn: 'Collect signed electrical & plumbing compliance certificates required for home insurance.', std: 'ISO 9972 / Consuel' },
        fr: { title: 'Mise en Service MEP, Test Étanchéité & Consuel', desc: 'Réaliser les essais différentiels/terre, contrôle d\'étanchéité réseaux, équilibrage VMC et test d\'infiltrométrie (Q4 ≤ 0,6 m³/h·m²).', tip: 'Un contrôle par caméra thermique repère immédiatement les défauts d\'isolant ou fuites d\'air.', warn: 'Archivez les attestations Consuel et procès-verbaux de pression pour l\'assurance dommage-ouvrage.', std: 'ISO 9972 / RE2020' }
      }
    ],
    // PHASE 6: FINISHES & LANDSCAPING (6 steps)
    [
      {
        id: 'fn1', durDays: 4,
        en: { title: 'Level-4 Wall Skimming, Sanding & Primer', desc: 'Apply fine finishing skim coat across plaster/drywall joints, sand smoothly under raking LED inspection light, and roll pigmented adhesion primer.', tip: 'Check walls with a bright grazing worklight BEFORE painting — every imperfection stands out.', warn: 'Always vacuum wall dust completely before priming to avoid peeling paint.', std: 'EN 13963 / DTU 59.1' },
        fr: { title: 'Ratissage Fin, Ponçage & Sous-Couche', desc: 'Appliquer l\'enduit de lissage sur murs et joints, poncer sous lumière rasante LED et appliquer une impression acrylique opacifiante.', tip: 'Inspectez chaque mur à la lumière rasante AVANT la peinture pour corriger tout défaut.', warn: 'Dépoussiérez intégralement murs et plafonds avant impression pour garantir l\'adhérence.', std: 'DTU 59.1 / Q4' }
      },
      {
        id: 'fn2', durDays: 5,
        en: { title: 'Interior Architectural Painting & Trim', desc: 'Apply two finish coats of low-VOC matte ceiling paint and washable velvet/eggshell wall paint (A+ indoor air quality), plus crisp acrylic caulking.', tip: 'Paint ceilings first, walls second, and baseboards/door trim last for razor-sharp cut lines.', warn: 'Use anti-condensation bathroom paint in shower zones and maintain 18–22°C during curing.', std: 'ISO 11890 / DTU 59.1' },
        fr: { title: 'Peintures Intérieures A+ & Finitions Boiseries', desc: 'Appliquer deux couches de peinture mate plafond et velours lessivable murs (faible COV classe A+) avec joints acryliques nets.', tip: 'Peignez d\'abord les plafonds, puis les murs, et enfin les plinthes et huisseries.', warn: 'Utilisez une peinture spéciale pièces humides en salle de bain à 18–22 °C.', std: 'DTU 59.1 / A+ COV' }
      },
      {
        id: 'fn3', durDays: 4,
        en: { title: 'Sanitary Fixtures, Kitchen & Built-In Millwork', desc: 'Mount wall-hung toilets, vanities, thermostatic shower mixers, fitted kitchen cabinetry with quartz worktop, and connect appliances.', tip: 'Verify dishwasher & sink trap leak-tightness by filling basins full and draining simultaneously.', warn: 'Seal kitchen countertop backsplash and vanity wall joints cleanly with neutral sanitary silicone.', std: 'EN 14516 / DTU 60.1' },
        fr: { title: 'Appareils Sanitaires, Cuisine & Menuiseries', desc: 'Poser WC suspendus, meubles vasques, mitigeurs thermostatiques, cuisine équipée et électroménager raccordé.', tip: 'Testez l\'étanchéité des siphons en vidangeant évier et lavabos remplis à ras bord.', warn: 'Réalisez les joints silicone neutre autour du plan de travail et des vasques.', std: 'DTU 60.1 / EN 14516' }
      },
      {
        id: 'fn4', durDays: 3,
        en: { title: 'LED Lighting Fixtures, Switches & Plates', desc: 'Install recessed warm-white LED downlights (2700–3000K CRI>90), pendant fixtures, exterior façade sconces, wall sockets and smart dimmers.', tip: 'Layer ambient, task, and accent lighting circuits to make architectural spaces feel twice as rich.', warn: 'Switch off main breaker and test dead with voltage tester before terminating any fixture.', std: 'IEC 60598 / NF C 15-100' },
        fr: { title: 'Luminaires LED, Appareillages & Éclairage Ext.', desc: 'Poser les spots LED encastrés (2700–3000K IRC>90), suspensions, appliques de façade IP65, prises et interrupteurs variateurs.', tip: 'Combinez éclairage général, fonctionnel et d\'ambiance sur circuits séparés.', warn: 'Coupez impérativement le disjoncteur général et vérifiez l\'absence de tension avant câblage.', std: 'NF C 15-100 / IEC 60598' }
      },
      {
        id: 'fn5', durDays: 5,
        en: { title: 'Driveway, Terrace Paving & Site Landscaping', desc: 'Grade final site drainage away from house, build outdoor terrace paving & permeable driveway, spread saved topsoil, seed lawn and plant shade trees.', tip: 'Plant deciduous trees on South/West elevations for free summer shade and winter passive sun.', warn: 'Keep large tree roots at least 4–6 meters away from shallow foundations and sewer pipes.', std: 'BS 7533 / DTU 52.1' },
        fr: { title: 'Terrasse, Allée Carrossable & Aménagement Paysager', desc: 'Modeler les pentes du terrain vers l\'extérieur, réaliser la terrasse et l\'allée perméable, étaler la terre végétale, engazonner et planter.', tip: 'Plantez des arbres feuillus au Sud/Ouest : ombre naturelle l\'été, soleil gratuit l\'hiver.', warn: 'Éloignez les arbres à grand développement d\'au moins 5 m des fondations et canalisations.', std: 'Normes Paysage / PMR' }
      },
      {
        id: 'fn6', durDays: 2,
        en: { title: 'Final Snagging Walkthrough & Handover Dossier', desc: 'Inspect every room, window seal, MEP circuit and warranty book; compile as-built CAD plans, structural certificates and keys for formal handover.', tip: 'Keep labeled spare tiles (5%) and touch-up paint batch codes for effortless future repairs.', warn: 'Document any punch-list defects in writing on the official handover report before final payment.', std: 'Handover Protocol / DOE' },
        fr: { title: 'Réception des Travaux, Levée de Réserves & DOE', desc: 'Contrôler chaque pièce, menuiserie, équipement MEP et réunir le Dossier des Ouvrages Exécutés (plans, garanties décennales, notices).', tip: 'Conservez 5% de carrelage de réserve et les références exactes des peintures.', warn: 'Consignez toute réserve par écrit sur le procès-verbal de réception avant le solde final.', std: 'PV Réception / DOE' }
      }
    ]
  ];

  // =========================================================================
  // 8. LIVE 2D-SYNCED BILL OF QUANTITIES (58 STABLE-ID MATERIALS, EN/FR)
  // =========================================================================

  function computeBOQ(project, fpStats, eng, thermal, customPrices) {
    const prices = customPrices || {};
    const reg = getRegionMeta(project.region);
    const L = project.length;
    const W = project.width;
    const floors = project.floors;
    const footprint = fpStats.footprint;
    const totalArea = fpStats.totalArea;
    const perim = fpStats.perimeter;

    const wetRooms = Math.max(1, Math.min(6, Math.round(fpStats.roomCount * 0.28) + (floors > 1 ? 1 : 0)));
    const insWallM2 = +(fpStats.netExtWallArea * 1.06).toFixed(1);
    const insRoofM2 = +(eng.roofAreaM2 * 1.05).toFixed(1);
    const screedM2 = +(totalArea * 1.02).toFixed(1);
    const tileM2 = +(wetRooms * 24 + totalArea * 0.22).toFixed(1);
    const woodM2 = +(Math.max(0, totalArea * 0.72)).toFixed(1);
    const intWallBothSidesM2 = +(fpStats.intWallArea * 2 + fpStats.netExtWallArea).toFixed(1);
    const extDoors = Math.max(1, fpStats.extDoorCount);
    const intDoors = Math.max(Math.max(1, fpStats.roomCount - 1), fpStats.intDoorCount);
    const totalWinM2 = Math.max(6, fpStats.extWindowArea);
    const stairRuns = Math.max(floors > 1 ? floors - 1 : 0, fpStats.stairCount);

    const rawItems = [
      // PHASE 0: FOUNDATION (8 items)
      { id: 'fnd_excav',   p: 0, en: 'Earthworks & Trench Excavation',      fr: 'Terrassement & Fouilles',          qty: eng.excavationM3,                  uM: 'm³', uI: 'yd³', conv: CBM_TO_CUYD, price: 24 },
      { id: 'fnd_gravel',  p: 0, en: 'Compacted Crushed Gravel Sub-base',   fr: 'Gravier Concassé & Hérisson',      qty: +(footprint * 0.24).toFixed(1),    uM: 'm³', uI: 'yd³', conv: CBM_TO_CUYD, price: 42 },
      { id: 'fnd_blind',   p: 0, en: 'Lean Blinding Concrete (C12/15)',     fr: 'Béton de Propreté (C12/15)',       qty: +(footprint * 0.08).toFixed(1),    uM: 'm³', uI: 'yd³', conv: CBM_TO_CUYD, price: 105 },
      { id: 'fnd_conc',    p: 0, en: 'Foundation Ready-Mix Concrete C25/30',fr: 'Béton Fondations Prêt à l\'Emploi', qty: eng.fndConcreteM3,                 uM: 'm³', uI: 'yd³', conv: CBM_TO_CUYD, price: 148 },
      { id: 'fnd_rebar16', p: 0, en: 'Foundation Rebar Steel BST500 (∅16/12)',fr: 'Acier Armatures Fondations HA16/12',qty: eng.fndRebarKg,                    uM: 'kg', uI: 'lb',  conv: KG_TO_LBS,   price: 1.55 },
      { id: 'fnd_form',    p: 0, en: 'Foundation Timber/Steel Formwork',    fr: 'Coffrage Fondations & Étais',      qty: +(perim * (project.foundationType === 'basement' ? 5.2 : 1.5)).toFixed(1), uM: 'm²', uI: 'ft²', conv: SQM_TO_SQFT, price: 26 },
      { id: 'fnd_wproof',  p: 0, en: 'Bituminous Waterproofing & Radon Foil',fr: 'Étanchéité Bitumineuse & Polyane', qty: eng.fndWaterproofM2,               uM: 'm²', uI: 'ft²', conv: SQM_TO_SQFT, price: 18 },
      { id: 'fnd_drain',   p: 0, en: 'Perimeter French Drain Pipe & Fabric',fr: 'Drain Périphérique & Géotextile',  qty: +(perim + 10).toFixed(1),          uM: 'm',  uI: 'ft',  conv: M_TO_FT,     price: 19 },

      // PHASE 1: STRUCTURE (8 items)
      { id: 'str_blocks',  p: 1, en: 'Thermal Masonry Blocks (Exterior)',   fr: 'Briques Thermiques / Parpaings Ext.',qty: +(fpStats.netExtWallArea * 1.06).toFixed(1), uM: 'm²', uI: 'ft²', conv: SQM_TO_SQFT, price: 48 },
      { id: 'str_mortar',  p: 1, en: 'Thin-Bed Thermal Masonry Mortar',     fr: 'Mortier Colle Thermique Maçonnerie',qty: Math.ceil(fpStats.netExtWallArea * 0.45), uM: 'bags', uI: 'bags', conv: 1, price: 14 },
      { id: 'str_conc',    p: 1, en: 'Structural Concrete (Cols/Beams/Slabs)',fr: 'Béton Armé (Poteaux/Chaînages/Dalles)',qty: eng.structConcreteM3,         uM: 'm³', uI: 'yd³', conv: CBM_TO_CUYD, price: 158 },
      { id: 'str_rebar',   p: 1, en: 'Superstructure Rebar & Stirrups (∅12/8)',fr: 'Ferraillage Structure & Cadres HA',qty: eng.structRebarKg,                 uM: 'kg', uI: 'lb',  conv: KG_TO_LBS,   price: 1.60 },
      { id: 'str_lintels', p: 1, en: 'Insulated Structural Window Lintels', fr: 'Linteaux Porteurs Isolés',         qty: Math.max(4, fpStats.extWindowCount + extDoors), uM: 'pcs', uI: 'pcs', conv: 1, price: 95 },
      { id: 'str_slabform',p: 1, en: 'Floor Slab Shoring & Decking System', fr: 'Plancher Hourdis / Étaiement Dalles',qty: +((floors - 1) * footprint + (project.roofType === 'flat' ? footprint : 0)).toFixed(1), uM: 'm²', uI: 'ft²', conv: SQM_TO_SQFT, price: 54 },
      { id: 'str_dpc',     p: 1, en: 'EPDM Capillary Damp-Proof Course',    fr: 'Bande d\'Arase Étanche EPDM',      qty: +(perim * 1.2).toFixed(1),         uM: 'm',  uI: 'ft',  conv: M_TO_FT,     price: 8 },
      { id: 'str_stairs',  p: 1, en: 'Structural Staircase Flight Assembly',fr: 'Escalier Structural (Volée Complète)',qty: stairRuns,                      uM: 'pcs', uI: 'pcs', conv: 1, price: 2450 },

      // PHASE 2: ROOF (8 items)
      { id: 'rof_timber',  p: 2, en: 'C24 Structural Roof Timber / Trusses',fr: 'Charpente Bois C24 / Fermettes',   qty: +(eng.roofAreaM2 * 0.055 * getRoofMeta(project.roofType).timberMult).toFixed(1), uM: 'm³', uI: 'yd³', conv: CBM_TO_CUYD, price: 620 },
      { id: 'rof_deck',    p: 2, en: 'OSB-3 / Roof Sheathing & Battens',    fr: 'Voligeage OSB-3 & Liteaux',        qty: eng.roofAreaM2,                    uM: 'm²', uI: 'ft²', conv: SQM_TO_SQFT, price: 21 },
      { id: 'rof_membr',   p: 2, en: 'HPV Breathable Underlayment Membrane',fr: 'Écran Sous-Toiture HPV',           qty: +(eng.roofAreaM2 * 1.15).toFixed(1), uM: 'm²', uI: 'ft²', conv: SQM_TO_SQFT, price: 6.5 },
      { id: 'rof_insul',   p: 2, en: `Roof Thermal Insulation (${thermal.roofInsMm}mm)`, fr: `Isolant Toiture (${thermal.roofInsMm} mm)`, qty: insRoofM2, uM: 'm²', uI: 'ft²', conv: SQM_TO_SQFT, price: +(14 + thermal.roofInsMm * 0.08).toFixed(1) },
      { id: 'rof_cover',   p: 2, en: project.roofType === 'flat' ? 'EPDM / TPO Waterproof Roof Membrane' : 'Interlocking Clay Roof Tiles / Metal', fr: project.roofType === 'flat' ? 'Membrane Étanchéité EPDM / TPO' : 'Tuiles Terre Cuite / Couverture', qty: eng.roofAreaM2, uM: 'm²', uI: 'ft²', conv: SQM_TO_SQFT, price: project.roofType === 'flat' ? 58 : 44 },
      { id: 'rof_flash',   p: 2, en: 'Ridge Caps, Valleys & Metal Flashings',fr: 'Faîtages, Noues & Zinguerie',     qty: +(perim * 0.85).toFixed(1),        uM: 'm',  uI: 'ft',  conv: M_TO_FT,     price: 34 },
      { id: 'rof_gutter',  p: 2, en: 'Aluminum / Zinc Gutters & Downpipes', fr: 'Gouttières & Descentes EP Alu/Zinc',qty: +(perim * 1.15 + floors * 12).toFixed(1), uM: 'm', uI: 'ft', conv: M_TO_FT, price: 29 },
      { id: 'rof_fasten',  p: 2, en: 'Hurricane Straps, Joist Hangers & Bolts',fr: 'Connecteurs Charpente & Ancrages',qty: Math.ceil(eng.roofAreaM2 * 0.45),  uM: 'kits', uI: 'kits', conv: 1, price: 16 },

      // PHASE 3: EXTERIOR (8 items)
      { id: 'ext_wins',    p: 3, en: `Triple-Glazed Low-E Windows (${fpStats.extWindowCount} pcs)`, fr: `Fenêtres Triple Vitrage Low-E (${fpStats.extWindowCount} u)`, qty: +totalWinM2.toFixed(1), uM: 'm²', uI: 'ft²', conv: SQM_TO_SQFT, price: 410 },
      { id: 'ext_doors',   p: 3, en: 'Insulated Security Exterior Doors',   fr: 'Portes Extérieures Isolantes RC2', qty: extDoors,                          uM: 'pcs', uI: 'pcs', conv: 1, price: 1450 },
      { id: 'ext_etics',   p: 3, en: `ETICS Facade Insulation (${thermal.wallInsMm}mm)`, fr: `Panneaux ITE Façade (${thermal.wallInsMm} mm)`, qty: insWallM2, uM: 'm²', uI: 'ft²', conv: SQM_TO_SQFT, price: +(16 + thermal.wallInsMm * 0.14).toFixed(1) },
      { id: 'ext_mesh',    p: 3, en: 'ETICS Adhesive, Dowels & Glass Mesh', fr: 'Colle ITE, Chevilles & Trame Fibre',qty: insWallM2,                        uM: 'm²', uI: 'ft²', conv: SQM_TO_SQFT, price: 14 },
      { id: 'ext_render',  p: 3, en: 'Hydrophobic Silicone Facade Render',  fr: 'Enduit de Finition Silicone Façade',qty: insWallM2,                        uM: 'm²', uI: 'ft²', conv: SQM_TO_SQFT, price: 24 },
      { id: 'ext_sills',   p: 3, en: 'Exterior Aluminum / Stone Window Sills',fr: 'Appuis de Fenêtres Extérieurs',  qty: Math.max(2, fpStats.extWindowCount), uM: 'pcs', uI: 'pcs', conv: 1, price: 85 },
      { id: 'ext_tapes',   p: 3, en: 'Airtight Window Tapes & Foam Sealant',fr: 'Compribandes & Membranes Air/Pluie',qty: +(fpStats.extWindowCount * 5.2 + extDoors * 6).toFixed(1), uM: 'm', uI: 'ft', conv: M_TO_FT, price: 7.5 },
      { id: 'ext_apron',   p: 3, en: 'Entrance Steps & Perimeter Splash Apron',fr: 'Perron d\'Entrée & Trottoir Garde',qty: +(perim * 0.85 + 6).toFixed(1), uM: 'm²', uI: 'ft²', conv: SQM_TO_SQFT, price: 62 },

      // PHASE 4: INTERIOR (8 items)
      { id: 'int_walls',   p: 4, en: `Interior Partition Walls (${fpStats.intWallLen}m drawn)`, fr: `Cloisons Intérieures (${fpStats.intWallLen} m tracés)`, qty: +(Math.max(12, fpStats.intWallArea)).toFixed(1), uM: 'm²', uI: 'ft²', conv: SQM_TO_SQFT, price: 36 },
      { id: 'int_acoust',  p: 4, en: 'Acoustic Mineral Wool Partition Fill',fr: 'Laine Acoustique Cloisons 50 mm',  qty: +(Math.max(12, fpStats.intWallArea)).toFixed(1), uM: 'm²', uI: 'ft²', conv: SQM_TO_SQFT, price: 9.5 },
      { id: 'int_plaster', p: 4, en: 'Gypsum Wall Plaster & Ceiling Boards',fr: 'Plâtre Projeté & Faux-Plafonds BA13',qty: +(intWallBothSidesM2 + totalArea).toFixed(1), uM: 'm²', uI: 'ft²', conv: SQM_TO_SQFT, price: 18 },
      { id: 'int_flrins',  p: 4, en: 'Subfloor Thermal/Acoustic EPS Boards',fr: 'Isolant Sol TMS / PSE100',         qty: screedM2,                          uM: 'm²', uI: 'ft²', conv: SQM_TO_SQFT, price: 17 },
      { id: 'int_screed',  p: 4, en: 'Self-Leveling Floating Floor Screed', fr: 'Chape Flottante Fluide 60 mm',     qty: screedM2,                          uM: 'm²', uI: 'ft²', conv: SQM_TO_SQFT, price: 26 },
      { id: 'int_tiles',   p: 4, en: 'Wet-Room SPEC Tanking & Porcelain Tile',fr: 'Étanchéité SPEC & Grès Cérame',  qty: tileM2,                            uM: 'm²', uI: 'ft²', conv: SQM_TO_SQFT, price: 54 },
      { id: 'int_wood',    p: 4, en: 'Engineered Hardwood / Acoustic Flooring',fr: 'Parquet Contrecollé & Sous-Couche',qty: woodM2,                          uM: 'm²', uI: 'ft²', conv: SQM_TO_SQFT, price: 58 },
      { id: 'int_doors',   p: 4, en: `Solid-Core Interior Doors (${intDoors} pcs)`, fr: `Blocs-Portes Intérieurs (${intDoors} u)`, qty: intDoors, uM: 'pcs', uI: 'pcs', conv: 1, price: 360 },

      // PHASE 5: UTILITIES / MEP (9 items)
      { id: 'mep_pex',     p: 5, en: 'Insulated PEX/Multilayer Water Piping',fr: 'Tubes Multicouche EF/EC Isolés',  qty: +(totalArea * 1.35).toFixed(1),    uM: 'm',  uI: 'ft',  conv: M_TO_FT,     price: 11 },
      { id: 'mep_waste',   p: 5, en: 'Acoustic PVC Drain Stacks & Fittings',fr: 'Canalisations PVC Acoustiques Ø110',qty: +(wetRooms * 14 + floors * 9).toFixed(1), uM: 'm', uI: 'ft', conv: M_TO_FT, price: 18 },
      { id: 'mep_panel',   p: 5, en: 'Main Electrical Panel, RCDs & SPD',   fr: 'Tableau Électrique, Diff. & Parafoudre',qty: floors,                      uM: 'pcs', uI: 'pcs', conv: 1, price: 1180 },
      { id: 'mep_wire',    p: 5, en: 'Electrical Conduits, Cables & Cat6A', fr: 'Gaines ICTA, Câbles & RJ45 Cat6A', qty: +(totalArea * 4.8).toFixed(0),     uM: 'm',  uI: 'ft',  conv: M_TO_FT,     price: 4.5 },
      { id: 'mep_heatpump',p: 5, en: 'Air-to-Water Heat Pump + Buffer Tank',fr: 'Pompe à Chaleur Air-Eau + Ballon', qty: 1,                                 uM: 'sys', uI: 'sys', conv: 1, price: Math.round(7800 + totalArea * 28) },
      { id: 'mep_ufh',     p: 5, en: 'Underfloor Heating PEX Loops & Manifolds',fr: 'Plancher Chauffant PER & Collecteurs',qty: +(totalArea * 0.92).toFixed(1), uM: 'm²', uI: 'ft²', conv: SQM_TO_SQFT, price: 38 },
      { id: 'mep_hrv',     p: 5, en: 'Heat-Recovery Ventilation (HRV) System',fr: 'VMC Double Flux Haut Rendement', qty: 1,                                 uM: 'sys', uI: 'sys', conv: 1, price: Math.round(3600 + totalArea * 16) },
      { id: 'mep_smart',   p: 5, en: 'Smart Thermostats, Detectors & Intercom',fr: 'Thermostats, DAAF & Visiophone', qty: Math.max(3, fpStats.roomCount),    uM: 'kits', uI: 'kits', conv: 1, price: 145 },
      { id: 'mep_test',    p: 5, en: 'Commissioning & Blower-Door Test',    fr: 'Mise en Service & Infiltrométrie', qty: 1,                                 uM: 'lot', uI: 'lot', conv: 1, price: 850 },

      // PHASE 6: FINISHES & LANDSCAPING (9 items)
      { id: 'fin_skim',    p: 6, en: 'Level-4 Finishing Skim Coat & Primer',fr: 'Enduit de Lissage Q4 & Impression',qty: +(intWallBothSidesM2 + totalArea).toFixed(1), uM: 'm²', uI: 'ft²', conv: SQM_TO_SQFT, price: 9.5 },
      { id: 'fin_paint',   p: 6, en: 'Low-VOC Architectural Paint (2 Coats)',fr: 'Peinture Intérieure A+ (2 Couches)',qty: +(intWallBothSidesM2 + totalArea).toFixed(1), uM: 'm²', uI: 'ft²', conv: SQM_TO_SQFT, price: 11 },
      { id: 'fin_bath',    p: 6, en: `Sanitary Fixtures & Showers (${wetRooms} baths)`, fr: `Sanitaires & Douches (${wetRooms} SdB)`, qty: wetRooms, uM: 'sets', uI: 'sets', conv: 1, price: 2650 },
      { id: 'fin_kitchen', p: 6, en: 'Fitted Kitchen Cabinetry & Quartz Top',fr: 'Cuisine Équipée & Plan Quartz',   qty: 1,                                 uM: 'set', uI: 'set', conv: 1, price: Math.round(7200 + Math.min(200, totalArea) * 24) },
      { id: 'fin_lights',  p: 6, en: 'Recessed LEDs, Sconces & Switches',   fr: 'Spots LED, Appliques & Appareillage',qty: Math.ceil(totalArea * 0.42),     uM: 'pcs', uI: 'pcs', conv: 1, price: 68 },
      { id: 'fin_trim',    p: 6, en: 'Baseboards, Thresholds & Railings',   fr: 'Plinthes, Barres Seuil & Garde-Corps',qty: +(perim * floors + fpStats.intWallLen * 1.8).toFixed(1), uM: 'm', uI: 'ft', conv: M_TO_FT, price: 16 },
      { id: 'fin_terrace', p: 6, en: 'Outdoor Stone Terrace & Driveway Paving',fr: 'Terrasse Pierre & Allée Carrossable',qty: +(Math.max(28, L * 3.5)).toFixed(1), uM: 'm²', uI: 'ft²', conv: SQM_TO_SQFT, price: 82 },
      { id: 'fin_garden',  p: 6, en: 'Topsoil Grading, Lawn & Shade Trees', fr: 'Gazon, Plantations & Arbres d\'Ombre',qty: +(Math.max(60, (L + 6) * (W + 6) - footprint)).toFixed(1), uM: 'm²', uI: 'ft²', conv: SQM_TO_SQFT, price: 19 },
      { id: 'fin_clean',   p: 6, en: 'Final Deep Cleaning & Handover DOE',  fr: 'Nettoyage Fin de Chantier & DOE',  qty: 1,                                 uM: 'lot', uI: 'lot', conv: 1, price: 950 }
    ];

    const phaseSummaries = PHASES_META.map(pm => ({
      id: pm.id,
      idx: pm.idx,
      icon: pm.icon,
      color: pm.color,
      en: pm.en,
      fr: pm.fr,
      items: [],
      matTotal: 0,
      laborTotal: 0,
      total: 0
    }));

    let grandMat = 0;
    let grandLabor = 0;

    for (let i = 0; i < rawItems.length; i++) {
      const it = rawItems[i];
      const qtyMetric = Math.max(0, Number(it.qty) || 0);
      const unitPriceMetric = prices[it.id] !== undefined ? Number(prices[it.id]) : it.price;
      const lineTotal = Math.round(qtyMetric * unitPriceMetric);

      const entry = {
        id: it.id,
        phaseIdx: it.p,
        en: it.en,
        fr: it.fr,
        qtyMetric,
        qtyImperial: +(qtyMetric * it.conv).toFixed(it.conv === 1 ? 0 : 1),
        unitMetric: it.uM,
        unitImperial: it.uI,
        conv: it.conv,
        unitPriceMetric,
        unitPriceImperial: +(unitPriceMetric / it.conv).toFixed(2),
        defaultPriceMetric: it.price,
        total: lineTotal
      };
      phaseSummaries[it.p].items.push(entry);
      phaseSummaries[it.p].matTotal += lineTotal;
      grandMat += lineTotal;
    }

    for (let p = 0; p < phaseSummaries.length; p++) {
      const ps = phaseSummaries[p];
      ps.laborTotal = Math.round(ps.matTotal * PHASES_META[p].laborPct * reg.laborMult);
      ps.total = ps.matTotal + ps.laborTotal;
      grandLabor += ps.laborTotal;
    }

    return {
      phases: phaseSummaries,
      matTotal: grandMat,
      laborTotal: grandLabor,
      grandTotal: grandMat + grandLabor,
      costPerSqm: Math.round((grandMat + grandLabor) / Math.max(1, totalArea)),
      itemCount: rawItems.length
    };
  }

  // =========================================================================
  // 9. INTERACTIVE CONSTRUCTION GANTT SCHEDULE & CASH-FLOW TIMELINE
  // =========================================================================

  function computeGanttSchedule(project, boq) {
    const fnd = getFoundationMeta(project.foundationType);
    const roof = getRoofMeta(project.roofType);
    const totalArea = project.length * project.width * project.floors;
    const areaFactor = Math.max(0.75, Math.min(2.6, Math.sqrt(totalArea / 115)));

    const rawDurs = [
      Math.max(2, Math.round((3.5 + fnd.extraWeeks) * areaFactor)),                 // 0 Foundation
      Math.max(3, Math.round((4.5 + (project.floors - 1) * 2.4) * areaFactor)),     // 1 Structure
      Math.max(2, Math.round((3.0 + roof.extraWeeks) * Math.sqrt(areaFactor))),     // 2 Roof
      Math.max(3, Math.round((4.0 + (project.floors - 1) * 0.9) * areaFactor)),     // 3 Exterior
      Math.max(3, Math.round((4.5 + (project.floors - 1) * 1.1) * areaFactor)),     // 4 Interior
      Math.max(3, Math.round((3.8 + (project.floors - 1) * 0.8) * areaFactor)),     // 5 Utilities
      Math.max(3, Math.round((4.2 + (project.floors - 1) * 0.8) * areaFactor))      // 6 Finishes
    ];

    // Realistic construction overlaps (e.g. Exterior & MEP rough-in overlap Roof/Interior)
    const tasks = [];
    let cursor = 0;
    const overlaps = [0, 0, 0.5, 1.0, 1.5, 2.0, 1.0]; // weeks overlapped with previous phase

    for (let i = 0; i < 7; i++) {
      const dur = rawDurs[i];
      const start = i === 0 ? 0 : Math.max(0, +(cursor - Math.min(overlaps[i], rawDurs[i - 1] * 0.45)).toFixed(1));
      const end = +(start + dur).toFixed(1);
      cursor = end;
      tasks.push({
        phaseIdx: i,
        id: PHASES_META[i].id,
        icon: PHASES_META[i].icon,
        color: PHASES_META[i].color,
        en: PHASES_META[i].en,
        fr: PHASES_META[i].fr,
        startWeek: start,
        durationWeeks: dur,
        endWeek: end,
        cost: boq.phases[i].total
      });
    }

    const totalWeeks = Math.ceil(cursor);
    const weeklyCashFlow = [];
    let cumulative = 0;
    for (let w = 1; w <= totalWeeks; w++) {
      let weekSpend = 0;
      for (let i = 0; i < tasks.length; i++) {
        const t = tasks[i];
        const overlapLen = Math.max(0, Math.min(w, t.endWeek) - Math.max(w - 1, t.startWeek));
        if (overlapLen > 0) weekSpend += (t.cost / t.durationWeeks) * overlapLen;
      }
      cumulative += weekSpend;
      weeklyCashFlow.push({ week: w, spend: Math.round(weekSpend), cumulative: Math.round(cumulative) });
    }

    return {
      tasks,
      totalWeeks,
      totalMonths: +(totalWeeks / 4.33).toFixed(1),
      weeklyCashFlow
    };
  }

  // =========================================================================
  // 10. COMPLETE BILINGUAL UI DICTIONARY (EN / FR)
  // =========================================================================

  const UI_I18N = {
    en: {
      back: 'Back',
      appSub: 'Structural Engineering & 7-Phase Construction Studio',
      wizTitle: 'Configure Your Construction Project',
      wizSub: 'Structural engineering, 7-phase 3D build simulator, live 2D CAD & full BOQ estimator',
      quickPresets: 'Quick-Start Engineering Templates',
      houseType: 'House Type',
      length: 'Length',
      width: 'Width',
      floorHeight: 'Floor Height',
      floors: 'Number of Floors',
      foundation: 'Foundation System',
      roofType: 'Roof Architecture',
      budget: 'Target Budget ($)',
      region: 'Region / Climate Zone',
      layoutPreset: 'Initial Interior Partitioning',
      layoutOpts: { family3: '3-Room Family Layout', villa4: '4-Room Executive Villa', open: 'Open Plan + Bath', empty: 'Empty Structural Shell' },
      generateBtn: 'Launch Engineering Workspace →',
      overallProgress: 'Construction Progress',
      phases: '7 Construction Phases',
      colors: 'Material Palette',
      extWalls: 'Facade',
      roof: 'Roof',
      winDoors: 'Glazing/Trim',
      intWalls: 'Interior',
      floorCol: 'Floor Slab',
      groundCol: 'Site Yard',
      budgetTracker: 'Budget vs Estimate',
      underBudget: 'Within target budget',
      overBudget: 'Over target budget',
      kpiArea: 'Total Area',
      kpiMat: 'Materials BOQ',
      kpiLabor: 'Labor Est.',
      kpiTotal: 'Total Estimate',
      kpiDuration: 'Schedule',
      kpiEnergy: 'Energy Class',
      weeks: 'wks',
      newProj: 'Project Specs',
      saveProj: 'Save',
      loadProj: 'Load',
      exportMenu: 'Export & CAD',
      arBtn: 'AR View',
      timelapse: 'Time-Lapse',
      stopTimelapse: 'Stop',
      mepXray: 'MEP X-Ray',
      cutaway: 'Cutaway',
      wireframe: 'Wire',
      resetCam: 'Reset',
      sunTime: 'Sun',
      tools: { select: 'Select', wall: 'Wall', column: 'Column', window: 'Window', door: 'Door', stairs: 'Stairs', measure: 'Measure', erase: 'Erase' },
      hints: {
        select: 'Click any wall, column, window, door or staircase to edit — drag endpoints or slide openings.',
        wall: 'Click start point and end point to draw an interior wall (magnetic snap + Shift for 45°/90°).',
        column: 'Click anywhere inside the floor plan to place a reinforced concrete structural column.',
        window: 'Hover over any exterior or interior wall and click to insert a real 3D cutout window.',
        door: 'Hover over any wall and click to place an opening door with swing direction.',
        stairs: 'Click to place a structural staircase (Straight, L-Shape or U-Shape) centered at cursor.',
        measure: 'Click two points to measure exact structural distance on the blueprint.',
        erase: 'Click any interior element to delete it and recalculate materials immediately.'
      },
      autoLayout: 'Auto-Layout',
      grid: 'Grid',
      undo: 'Undo',
      redo: 'Redo',
      tabs: { steps: 'Engineering Steps (6)', boq: 'Bill of Quantities (BOQ)', structural: 'Structural & Thermal', gantt: 'Gantt Schedule & Cash-Flow' },
      stepDone: 'Mark Complete',
      stepCompleted: 'Completed ✓',
      proTip: 'Engineering Tip',
      warning: 'Site Safety / Code Warning',
      standard: 'Norm / Code',
      matCol: 'Material / Trade Item',
      qtyCol: 'Quantity',
      unitCol: 'Unit',
      unitPriceCol: 'Unit Price ($)',
      totalCol: 'Subtotal',
      phaseMatSub: 'Phase Materials',
      phaseLaborSub: 'Estimated Labor',
      phaseTotalSub: 'Phase Total',
      resetPrices: 'Reset Default Prices',
      boqActive: 'Active Phase',
      boqAll: 'All 7 Phases (58)',
      propTitle: 'Selected Element',
      propLen: 'Length',
      propThick: 'Thickness',
      propWidth: 'Width',
      propHeight: 'Height',
      propSill: 'Sill Height',
      propSwing: 'Door Swing',
      propDir: 'Direction',
      propStyle: 'Stair Style',
      propSteps: 'Risers',
      propSize: 'Column Size',
      deleteEl: 'Delete Element',
      floorLabel: 'Floor',
      groundFloor: 'Ground Floor',
      basement: 'Basement (B1)',
      exportTitle: 'Professional CAD, Engineering & 3D Exports',
      freeExports: 'Free Project & AR Exports',
      proExports: 'Engineering Dossier, CAD & 3D Exports',
      arTitle: 'Augmented Reality Scale',
      arTabletop: '1:50 Tabletop Maquette (Table)',
      arReal: '1:1 Full Real Scale (Site Walkthrough)',
      structTitle: 'Structural Concrete, Rebar & Load Breakdown',
      thermalTitle: 'Thermal Envelope & Energy Performance',
      ganttTitle: 'Construction Timeline (Weeks) & Cumulative Cash-Flow',
      allPhasesComplete: 'All 42 engineering steps completed!'
    },
    fr: {
      back: 'Retour',
      appSub: 'Studio d\'Ingénierie Structurale & Construction 7 Phases',
      wizTitle: 'Configurer Votre Projet de Construction',
      wizSub: 'Ingénierie structurale, simulateur 3D 7 phases, CAO 2D live & métré BOQ complet',
      quickPresets: 'Modèles d\'Ingénierie Rapides (1-Click)',
      houseType: 'Type de Bâtiment',
      length: 'Longueur',
      width: 'Largeur',
      floorHeight: 'Hauteur sous Plafond',
      floors: 'Nombre de Niveaux',
      foundation: 'Système de Fondations',
      roofType: 'Architecture de Toiture',
      budget: 'Budget Cible ($)',
      region: 'Région / Zone Climatique',
      layoutPreset: 'Cloisonnement Initial 2D',
      layoutOpts: { family3: 'Plan Familial 3 Pièces', villa4: 'Villa 4 Pièces + Hall', open: 'Espace Ouvert + SdB', empty: 'Coque Structurale Vide' },
      generateBtn: 'Lancer l\'Atelier d\'Ingénierie →',
      overallProgress: 'Avancement Chantier',
      phases: '7 Phases de Construction',
      colors: 'Palette Matériaux',
      extWalls: 'Façade',
      roof: 'Toiture',
      winDoors: 'Menuiseries',
      intWalls: 'Intérieur',
      floorCol: 'Dalle Sol',
      groundCol: 'Terrain',
      budgetTracker: 'Budget vs Estimation',
      underBudget: 'Dans le budget cible',
      overBudget: 'Dépassement de budget',
      kpiArea: 'Surface Totale',
      kpiMat: 'Matériaux BOQ',
      kpiLabor: 'Main-d\'Œuvre',
      kpiTotal: 'Total Estimé',
      kpiDuration: 'Durée',
      kpiEnergy: 'Classe Énergie',
      weeks: 'sem',
      newProj: 'Paramètres',
      saveProj: 'Sauver',
      loadProj: 'Ouvrir',
      exportMenu: 'Export & CAO',
      arBtn: 'Vue AR',
      timelapse: 'Time-Lapse',
      stopTimelapse: 'Stop',
      mepXray: 'MEP X-Ray',
      cutaway: 'Coupe 3D',
      wireframe: 'Filaire',
      resetCam: 'Reset',
      sunTime: 'Soleil',
      tools: { select: 'Sélection', wall: 'Mur', column: 'Poteau', window: 'Fenêtre', door: 'Porte', stairs: 'Escalier', measure: 'Mesurer', erase: 'Effacer' },
      hints: {
        select: 'Cliquez un mur, poteau, fenêtre, porte ou escalier — glissez les extrémités ou coulissez les ouvertures.',
        wall: 'Cliquez début et fin pour tracer une cloison (aimantation auto + Shift pour ortho).',
        column: 'Cliquez dans le plan pour placer un poteau porteur en béton armé.',
        window: 'Survolez un mur extérieur ou intérieur et cliquez pour découper une vraie fenêtre 3D.',
        door: 'Survolez un mur et cliquez pour insérer une porte avec son sens d\'ouverture.',
        stairs: 'Cliquez pour placer un escalier structural (Droit, en L ou en U) centré sur le curseur.',
        measure: 'Cliquez deux points pour mesurer la cote exacte sur le plan.',
        erase: 'Cliquez un élément intérieur pour le supprimer et recalculer instantanément le devis.'
      },
      autoLayout: 'Auto-Plan',
      grid: 'Grille',
      undo: 'Annuler',
      redo: 'Rétablir',
      tabs: { steps: 'Étapes Chantier (6)', boq: 'Métré & Devis (BOQ)', structural: 'Structure & Thermique', gantt: 'Planning Gantt & Trésorerie' },
      stepDone: 'Marquer Terminé',
      stepCompleted: 'Terminé ✓',
      proTip: 'Conseil Ingénieur',
      warning: 'Alerte Sécurité / Norme',
      standard: 'Norme / DTU',
      matCol: 'Matériau / Poste Technique',
      qtyCol: 'Quantité',
      unitCol: 'Unité',
      unitPriceCol: 'Prix Unit. ($)',
      totalCol: 'Sous-Total',
      phaseMatSub: 'Matériaux Phase',
      phaseLaborSub: 'Main-d\'Œuvre Est.',
      phaseTotalSub: 'Total Phase',
      resetPrices: 'Réinitialiser Prix',
      boqActive: 'Phase Active',
      boqAll: 'Toutes Phases (58)',
      propTitle: 'Élément Sélectionné',
      propLen: 'Longueur',
      propThick: 'Épaisseur',
      propWidth: 'Largeur',
      propHeight: 'Hauteur',
      propSill: 'Allège',
      propSwing: 'Ouverture',
      propDir: 'Direction',
      propStyle: 'Type Escalier',
      propSteps: 'Marches',
      propSize: 'Section Poteau',
      deleteEl: 'Supprimer',
      floorLabel: 'Étage',
      groundFloor: 'Rez-de-Chaussée',
      basement: 'Sous-Sol (SS1)',
      exportTitle: 'Exports Professionnels CAO, Ingénierie & 3D',
      freeExports: 'Exports Gratuits & Réalité Augmentée',
      proExports: 'Dossier PDF, CAO 2D, Excel & 3D Pro',
      arTitle: 'Échelle Réalité Augmentée (AR)',
      arTabletop: 'Maquette 1:50 (Sur Table)',
      arReal: 'Échelle Réelle 1:1 (Terrain)',
      structTitle: 'Détail Béton Armé, Aciers & Charges',
      thermalTitle: 'Enveloppe Thermique & Performance Énergétique',
      ganttTitle: 'Planning de Chantier (Semaines) & Courbe de Trésorerie',
      allPhasesComplete: 'Les 42 étapes d\'ingénierie sont terminées !'
    }
  };

  function getT(lang) {
    return UI_I18N[lang === 'fr' ? 'fr' : 'en'];
  }

  // =========================================================================
  // 11. EXPORT PUBLIC API (UMD)
  // =========================================================================

  const ArchEng = {
    FT_TO_M, M_TO_FT, SQM_TO_SQFT, CBM_TO_CUYD, KG_TO_LBS, M_TO_IN,
    HOUSE_TYPES, FOUNDATION_TYPES, ROOF_TYPES, REGIONS, QUICK_PRESETS,
    PHASES_META, STEPS_DB, UI_I18N,
    toMeters, fromMeters, fmtLen, fmtSmallLen, fmtArea, fmtVol, fmtMass, fmtMoney,
    getFoundationMeta, getRoofMeta, getRegionMeta, getT,
    uid, generatePartitionLayout, detectRooms,
    computeFloorPlanStats, computeStructuralEngineering,
    computeThermalEnergy, computeBOQ, computeGanttSchedule
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ArchEng;
  }
  if (globalScope) {
    globalScope.ArchEng = ArchEng;
  }
})(typeof window !== 'undefined' ? window : globalThis);
