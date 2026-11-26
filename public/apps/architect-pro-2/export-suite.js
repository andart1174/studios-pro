/**
 * Architect Pro 2 (v3.0) — Professional Engineering, CAD, 3D & AR Export Suite
 * Exports strictly clean `exportGroup` (ZERO 200m ground plane / GridHelper!).
 * Supports: PDF Dossier (jsPDF), Excel BOQ (.CSV), AutoCAD 2D (.DXF R12), Blueprint (.SVG),
 * Clean 3D (.GLB, Binary .STL 1:100 maquette, .OBJ, Standalone .HTML), Save/Load (.sparch2), PNG, and AR Dual-Scale.
 */
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1500);
}

function slugName(project) {
  const f = project.floors || 1;
  return `ArchitectPro2_${Math.round(project.length)}x${Math.round(project.width)}m_${f}F`;
}

// Clones ONLY the architectural exportGroup, optional uniform scale & Z-up rotation, base resting on 0
function cloneCleanBuilding(scale = 1.0, zUpForPrint = false) {
  const src = window.Arch3D && window.Arch3D.getExportGroup();
  if (!src) return null;

  const wrapper = new THREE.Group();
  wrapper.name = 'ArchitectPro2_Export';
  const clone = src.clone(true);

  // Convert transparent materials to clean opaque solid for 3D prints / AR unless glass
  clone.traverse(obj => {
    if (obj.isMesh && obj.material) {
      const m = obj.material.clone();
      m.wireframe = false;
      obj.material = m;
    }
  });

  if (scale !== 1.0) clone.scale.setScalar(scale);
  if (zUpForPrint) clone.rotation.x = Math.PI / 2;

  wrapper.add(clone);
  wrapper.updateMatrixWorld(true);

  // Align lowest point cleanly to Y=0 (or Z=0 if zUpForPrint)
  const box = new THREE.Box3().setFromObject(wrapper);
  if (isFinite(box.min.y)) {
    if (zUpForPrint) clone.position.z -= box.min.z;
    else clone.position.y -= box.min.y;
  }
  wrapper.updateMatrixWorld(true);
  return wrapper;
}

// =========================================================================
// 1. PURE GENERATORS (CSV BOQ, AUTOCAD DXF R12, DIMENSIONED SVG)
// =========================================================================

function buildBOQCSVString(state, boq) {
  const isFr = state.lang === 'fr';
  const isImp = state.unitSystem === 'imperial';
  const esc = v => `"${String(v).replace(/"/g, '""')}"`;

  const header = isFr
    ? ['Phase', 'Code', 'Désignation', 'Quantité', 'Unité', 'Prix Unitaire ($)', 'Sous-Total ($)']
    : ['Phase', 'Item ID', 'Material / Trade Description', 'Quantity', 'Unit', 'Unit Price ($)', 'Subtotal ($)'];

  const rows = [header.map(esc).join(',')];

  boq.phases.forEach(ph => {
    const phTitle = isFr ? ph.fr : ph.en;
    ph.items.forEach(it => {
      const qty = isImp ? it.qtyImperial : it.qtyMetric;
      const unit = isImp ? it.unitImperial : it.unitMetric;
      const uPrice = isImp ? it.unitPriceImperial : it.unitPriceMetric;
      rows.push([
        esc(phTitle),
        esc(it.id),
        esc(isFr ? it.fr : it.en),
        qty,
        esc(unit),
        uPrice,
        it.total
      ].join(','));
    });
    rows.push([
      esc(phTitle),
      esc(ph.id + '_labor'),
      esc(isFr ? 'Main-d\'Œuvre Estimée Phase' : 'Estimated Phase Labor'),
      1,
      esc('lot'),
      ph.laborTotal,
      ph.laborTotal
    ].join(','));
  });

  rows.push('');
  rows.push([esc('SUMMARY'), '', esc(isFr ? 'Total Matériaux' : 'Materials Subtotal'), '', '', '', boq.matTotal].join(','));
  rows.push([esc('SUMMARY'), '', esc(isFr ? 'Total Main-d\'Œuvre' : 'Labor Subtotal'), '', '', '', boq.laborTotal].join(','));
  rows.push([esc('SUMMARY'), '', esc(isFr ? 'TOTAL GÉNÉRAL ESTIMÉ' : 'GRAND TOTAL ESTIMATE'), '', '', '', boq.grandTotal].join(','));

  return '\uFEFF' + rows.join('\r\n');
}

function buildDXFString(state) {
  const L = state.project.length * 1000; // 1:1 mm for AutoCAD
  const W = state.project.width * 1000;
  const fp = (state.floorPlans && state.floorPlans[state.activeFloor || 0]) || { walls: [], windows: [], doors: [], stairs: [], columns: [] };
  const Eng = window.ArchEng;

  const lines = [
    '0', 'SECTION', '2', 'HEADER',
    '9', '$INSUNITS', '70', '4', // Millimeters
    '0', 'ENDSEC',
    '0', 'SECTION', '2', 'TABLES',
    '0', 'TABLE', '2', 'LAYER',
    ...makeDxfLayer('EXT_WALLS', 7),
    ...makeDxfLayer('INT_WALLS', 3),
    ...makeDxfLayer('COLUMNS', 1),
    ...makeDxfLayer('WINDOWS', 4),
    ...makeDxfLayer('DOORS', 2),
    ...makeDxfLayer('STAIRS', 5),
    ...makeDxfLayer('ROOMS', 6),
    ...makeDxfLayer('DIMS', 8),
    '0', 'ENDTAB', '0', 'ENDSEC',
    '0', 'SECTION', '2', 'ENTITIES'
  ];

  const addLine = (layer, x1, y1, x2, y2) => {
    // Flip Y so architectural North is +Y in CAD
    lines.push('0', 'LINE', '8', layer,
      '10', x1.toFixed(1), '20', (W - y1).toFixed(1), '30', '0.0',
      '11', x2.toFixed(1), '21', (W - y2).toFixed(1), '31', '0.0');
  };
  const addRect = (layer, x, y, w, h) => {
    addLine(layer, x, y, x + w, y);
    addLine(layer, x + w, y, x + w, y + h);
    addLine(layer, x + w, y + h, x, y + h);
    addLine(layer, x, y + h, x, y);
  };
  const addText = (layer, x, y, h, txt) => {
    lines.push('0', 'TEXT', '8', layer,
      '10', x.toFixed(1), '20', (W - y).toFixed(1), '30', '0.0',
      '40', h.toFixed(1), '1', String(txt));
  };

  // Exterior double-line walls (300mm thick)
  addRect('EXT_WALLS', 0, 0, L, W);
  addRect('EXT_WALLS', 300, 300, Math.max(100, L - 600), Math.max(100, W - 600));

  // Interior walls
  (fp.walls || []).forEach(w => {
    const x1 = w.x1 * 1000, y1 = w.y1 * 1000, x2 = w.x2 * 1000, y2 = w.y2 * 1000;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const ht = ((w.thickness || 0.15) * 1000) / 2;
    const nx = (-dy / len) * ht, ny = (dx / len) * ht;
    addLine('INT_WALLS', x1 + nx, y1 + ny, x2 + nx, y2 + ny);
    addLine('INT_WALLS', x1 - nx, y1 - ny, x2 - nx, y2 - ny);
    addLine('INT_WALLS', x1 + nx, y1 + ny, x1 - nx, y1 - ny);
    addLine('INT_WALLS', x2 + nx, y2 + ny, x2 - nx, y2 - ny);
  });

  // Structural Columns
  (fp.columns || []).forEach(c => {
    const s = (c.size || 0.30) * 1000;
    addRect('COLUMNS', c.x * 1000 - s / 2, c.y * 1000 - s / 2, s, s);
    addLine('COLUMNS', c.x * 1000 - s / 2, c.y * 1000 - s / 2, c.x * 1000 + s / 2, c.y * 1000 + s / 2);
  });

  // Helper to locate outer/inner wall
  const allWalls = [
    { id: 'ext-top', x1: 0, y1: 0, x2: state.project.length, y2: 0 },
    { id: 'ext-bottom', x1: 0, y1: state.project.width, x2: state.project.length, y2: state.project.width },
    { id: 'ext-left', x1: 0, y1: 0, x2: 0, y2: state.project.width },
    { id: 'ext-right', x1: state.project.length, y1: 0, x2: state.project.length, y2: state.project.width },
    ...(fp.walls || [])
  ];
  const findW = id => allWalls.find(w => w.id === id);

  // Windows
  (fp.windows || []).forEach(win => {
    const w = findW(win.wallId);
    if (!w) return;
    const ang = Math.atan2(w.y2 - w.y1, w.x2 - w.x1);
    const cx = (w.x1 + (w.x2 - w.x1) * win.t) * 1000;
    const cy = (w.y1 + (w.y2 - w.y1) * win.t) * 1000;
    const hw = ((win.width || 1.4) * 1000) / 2;
    addLine('WINDOWS', cx - Math.cos(ang) * hw, cy - Math.sin(ang) * hw, cx + Math.cos(ang) * hw, cy + Math.sin(ang) * hw);
  });

  // Doors
  (fp.doors || []).forEach(dr => {
    const w = findW(dr.wallId);
    if (!w) return;
    const ang = Math.atan2(w.y2 - w.y1, w.x2 - w.x1);
    const cx = (w.x1 + (w.x2 - w.x1) * dr.t) * 1000;
    const cy = (w.y1 + (w.y2 - w.y1) * dr.t) * 1000;
    const hw = ((dr.width || 0.9) * 1000) / 2;
    const hx = cx - Math.cos(ang) * hw;
    const hy = cy - Math.sin(ang) * hw;
    addLine('DOORS', hx, hy, hx - Math.sin(ang) * (hw * 2), hy + Math.cos(ang) * (hw * 2));
  });

  // Stairs
  (fp.stairs || []).forEach(st => {
    const x = st.x * 1000, y = st.y * 1000, sw = st.w * 1000, sh = st.h * 1000;
    addRect('STAIRS', x, y, sw, sh);
    const steps = st.steps || 16;
    const isVert = st.dir === 'up' || st.dir === 'down';
    for (let i = 1; i < steps; i++) {
      if (isVert) addLine('STAIRS', x, y + (sh * i) / steps, x + sw, y + (sh * i) / steps);
      else addLine('STAIRS', x + (sw * i) / steps, y, x + (sw * i) / steps, y + sh);
    }
  });

  // Room labels & Overall Dimensions
  const rooms = Eng.detectRooms(state.project.length, state.project.width, fp.walls || [], state.lang);
  rooms.forEach(rm => {
    addText('ROOMS', rm.cx * 1000 - 400, rm.cy * 1000, 220, `${rm.label} (${rm.area} m2)`);
  });
  addLine('DIMS', 0, -650, L, -650);
  addText('DIMS', L / 2 - 400, -900, 260, `${state.project.length.toFixed(2)} m`);
  addLine('DIMS', -650, 0, -650, W);
  addText('DIMS', -1600, W / 2, 260, `${state.project.width.toFixed(2)} m`);

  lines.push('0', 'ENDSEC', '0', 'EOF');
  return lines.join('\r\n');
}

function makeDxfLayer(name, colorIdx) {
  return ['0', 'LAYER', '2', name, '70', '0', '62', String(colorIdx), '6', 'CONTINUOUS'];
}

function buildSVGString(state) {
  const L = state.project.length;
  const W = state.project.width;
  const fp = (state.floorPlans && state.floorPlans[state.activeFloor || 0]) || { walls: [], windows: [], doors: [], stairs: [], columns: [] };
  const Eng = window.ArchEng;
  const sc = 60;
  const pad = 75;
  const vw = Math.round(L * sc + pad * 2);
  const vh = Math.round(W * sc + pad * 2);
  const px = x => (pad + x * sc).toFixed(1);
  const py = y => (pad + y * sc).toFixed(1);

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${vh}" width="${vw}" height="${vh}" style="background:#0f172a;font-family:Inter,Arial,sans-serif">`,
    `<rect width="${vw}" height="${vh}" fill="#0f172a"/>`,
    `<rect x="${px(0)}" y="${py(0)}" width="${(L * sc).toFixed(1)}" height="${(W * sc).toFixed(1)}" fill="#162033" stroke="#e5d5c0" stroke-width="${(0.30 * sc).toFixed(1)}"/>`
  ];

  // Interior walls
  (fp.walls || []).forEach(w => {
    parts.push(`<line x1="${px(w.x1)}" y1="${py(w.y1)}" x2="${px(w.x2)}" y2="${py(w.y2)}" stroke="#e2e8f0" stroke-width="${((w.thickness || 0.15) * sc).toFixed(1)}" stroke-linecap="square"/>`);
  });

  // Columns
  (fp.columns || []).forEach(c => {
    const s = (c.size || 0.30) * sc;
    parts.push(`<rect x="${(pad + c.x * sc - s / 2).toFixed(1)}" y="${(pad + c.y * sc - s / 2).toFixed(1)}" width="${s.toFixed(1)}" height="${s.toFixed(1)}" fill="#64748b" stroke="#f59e0b" stroke-width="1.5"/>`);
  });

  // Stairs
  (fp.stairs || []).forEach(st => {
    parts.push(`<rect x="${px(st.x)}" y="${py(st.y)}" width="${(st.w * sc).toFixed(1)}" height="${(st.h * sc).toFixed(1)}" fill="rgba(99,102,241,0.22)" stroke="#818cf8" stroke-width="1.5"/>`);
  });

  // Room labels
  const rooms = Eng.detectRooms(L, W, fp.walls || [], state.lang);
  rooms.forEach(rm => {
    parts.push(`<text x="${px(rm.cx)}" y="${py(rm.cy) - 5}" text-anchor="middle" fill="#cbd5e1" font-size="12" font-weight="600">${rm.label}</text>`);
    parts.push(`<text x="${px(rm.cx)}" y="${py(rm.cy) + 11}" text-anchor="middle" fill="#f59e0b" font-size="12" font-weight="700">${Eng.fmtArea(rm.area, state.unitSystem)}</text>`);
  });

  // Exterior dimensions
  parts.push(`<line x1="${px(0)}" y1="${pad - 32}" x2="${px(L)}" y2="${pad - 32}" stroke="#f59e0b" stroke-width="1.4"/>`);
  parts.push(`<text x="${px(L / 2)}" y="${pad - 38}" text-anchor="middle" fill="#f59e0b" font-size="13" font-weight="700">${Eng.fmtLen(L, state.unitSystem)}</text>`);
  parts.push(`<line x1="${pad - 32}" y1="${py(0)}" x2="${pad - 32}" y2="${py(W)}" stroke="#f59e0b" stroke-width="1.4"/>`);
  parts.push(`<text x="${pad - 42}" y="${py(W / 2)}" text-anchor="middle" fill="#f59e0b" font-size="13" font-weight="700" transform="rotate(-90 ${pad - 42} ${py(W / 2)})">${Eng.fmtLen(W, state.unitSystem)}</text>`);

  parts.push(`<text x="${pad}" y="${vh - 18}" fill="#64748b" font-size="11">Architect Pro 2 (v3.0) — ${Eng.fmtLen(L, state.unitSystem)} × ${Eng.fmtLen(W, state.unitSystem)} · ${state.project.floors}F</text>`);
  parts.push('</svg>');
  return parts.join('\n');
}

// =========================================================================
// 2. MULTI-PAGE ARCHITECTURAL & ENGINEERING PDF DOSSIER (jsPDF)
// =========================================================================

function exportPDFDossier(state, stats, eng, thermal, boq, gantt) {
  const JsPDF = window.jspdf && window.jspdf.jsPDF;
  if (!JsPDF) throw new Error('jsPDF library not loaded');

  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const Eng = window.ArchEng;
  const isFr = state.lang === 'fr';
  const units = state.unitSystem;
  const p = state.project;

  // --- PAGE 1: EXECUTIVE DOSSIER, 2D PLAN + 3D RENDER & ENGINEERING KPIs ---
  doc.setFillColor(12, 16, 27);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setFillColor(245, 158, 11);
  doc.rect(0, 28, 210, 1.5, 'F');

  doc.setTextColor(245, 158, 11);
  doc.setFontSize(17);
  doc.setFont('helvetica', 'bold');
  doc.text('ARCHITECT PRO 2 — ENGINEERING DOSSIER', 14, 13);

  doc.setTextColor(203, 213, 225);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  const fndMeta = Eng.getFoundationMeta(p.foundationType);
  const roofMeta = Eng.getRoofMeta(p.roofType);
  const regMeta = Eng.getRegionMeta(p.region);
  doc.text(
    `${Eng.fmtLen(p.length, units)} × ${Eng.fmtLen(p.width, units)} · ${p.floors} ${isFr ? 'Niveaux' : 'Floors'} · ${isFr ? fndMeta.fr : fndMeta.en} · ${isFr ? roofMeta.fr : roofMeta.en}`,
    14, 21
  );
  doc.text(new Date().toLocaleDateString(), 196, 21, { align: 'right' });

  // KPI Strip (4 boxes)
  const kpis = [
    [isFr ? 'Surface Totale' : 'Total Area', Eng.fmtArea(stats.totalArea, units)],
    [isFr ? 'Estimation Totale' : 'Total Estimate', Eng.fmtMoney(boq.grandTotal)],
    [isFr ? 'Durée Chantier' : 'Build Schedule', `${gantt.totalWeeks} ${isFr ? 'sem.' : 'wks'} (${gantt.totalMonths} mo)`],
    [isFr ? 'Classe Énergie' : 'Energy Rating', `${thermal.energyClass} (${thermal.energyIntensity} kWh/m²·yr)`]
  ];
  kpis.forEach(([lbl, val], idx) => {
    const x = 14 + idx * 46.5;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(x, 34, 44, 17, 2, 2, 'F');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(lbl.toUpperCase(), x + 3, 40);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.text(val, x + 3, 47.5);
  });

  // Side-by-side 2D Floor Plan & 3D Structural Render
  const img2D = window.ArchCAD2D && window.ArchCAD2D.getCanvasDataURL();
  const img3D = window.Arch3D && window.Arch3D.getSnapshotDataURL();
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(isFr ? 'Plan Structural 2D (Niveau Actif)' : '2D Structural Floor Plan (Active Floor)', 14, 58);
  doc.text(isFr ? 'Modèle 3D Ingénierie' : '3D Engineering Model', 110, 58);

  if (img2D) doc.addImage(img2D, 'PNG', 14, 61, 88, 66);
  if (img3D) doc.addImage(img3D, 'PNG', 110, 61, 86, 66);

  // Structural & Thermal Summary Table
  let y = 136;
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(isFr ? 'Synthèse Ingénierie Structurale & Thermique' : 'Structural Engineering & Thermal Summary', 14, y);
  y += 5;

  const specRows = [
    [isFr ? 'Fondation & Hors-Gel' : 'Foundation & Frost Depth', `${isFr ? fndMeta.fr : fndMeta.en} (${Eng.fmtLen(eng.frostDepthM, units)})`],
    [isFr ? 'Béton Total (Fond. + Struct.)' : 'Total Structural Concrete', `${Eng.fmtVol(eng.totalConcreteM3, units)} (${eng.totalConcreteTons} t) — Fnd: ${Eng.fmtVol(eng.fndConcreteM3, units)}`],
    [isFr ? 'Aciers Armatures (HA16/12/8)' : 'Reinforcing Rebar Steel', `${Eng.fmtMass(eng.totalRebarKg, units)} (Ø16: ${eng.rebar16Kg}kg · Ø12: ${eng.rebar12Kg}kg · Ø8: ${eng.rebar08Kg}kg)`],
    [isFr ? 'Terrassement & Étanchéité' : 'Excavation & Waterproofing', `${Eng.fmtVol(eng.excavationM3, units)} / ${Eng.fmtArea(eng.fndWaterproofM2, units)}`],
    [isFr ? 'Enveloppe Thermique (U-Value)' : 'Thermal Envelope (U-Values)', `Wall ${thermal.uWall} · Roof ${thermal.uRoof} · Glazing ${thermal.uWin} W/m²K (WWR ${thermal.wwrPct}%)`],
    [isFr ? 'Zone Climatique & Neige' : 'Climate Zone & Snow Load', `${isFr ? regMeta.fr : regMeta.en} · ${eng.snowLoadKpa} kPa (${eng.snowTotalKn} kN)`],
    [isFr ? 'Éléments 2D Synchronisés' : 'Synced 2D Plan Geometry', `${stats.intWallLen}m int. walls · ${stats.extWindowCount} ext. windows · ${stats.intDoorCount + stats.extDoorCount} doors · ${stats.roomCount} rooms`]
  ];

  specRows.forEach(([k, v], idx) => {
    doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 252 : 255);
    doc.rect(14, y, 182, 7.5, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text(k, 16, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(v, 76, y + 5);
    y += 7.5;
  });

  // --- PHASE COST SUMMARY + GANTT CHART ON PAGE 2 ---
  doc.addPage();
  doc.setFillColor(12, 16, 27);
  doc.rect(0, 0, 210, 18, 'F');
  doc.setTextColor(245, 158, 11);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(isFr ? 'PLANNING GANTT & RÉCAPITULATIF FINANCIER (7 PHASES)' : '7-PHASE GANTT SCHEDULE & COST BREAKDOWN', 14, 12);

  y = 26;
  const maxW = Math.max(1, gantt.totalWeeks);
  gantt.tasks.forEach(t => {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`${t.phaseIdx + 1}. ${isFr ? t.fr : t.en}`, 14, y + 4.5);

    // Track bar
    const barAreaX = 82, barAreaW = 92;
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(barAreaX, y, barAreaW, 6, 1.5, 1.5, 'F');
    const bx = barAreaX + (t.startWeek / maxW) * barAreaW;
    const bw = Math.max(4, (t.durationWeeks / maxW) * barAreaW);
    doc.setFillColor(245, 158, 11);
    doc.roundedRect(bx, y, bw, 6, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`W${Math.floor(t.startWeek) + 1}–W${Math.ceil(t.endWeek)} (${t.durationWeeks}w)`, 196, y + 4.5, { align: 'right' });
    y += 10;
  });

  y += 6;
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(isFr ? 'Coûts Estimés par Phase' : 'Estimated Cost Summary by Phase', 14, y);
  y += 5;

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(14, y, 182, 7.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text(isFr ? 'Phase' : 'Phase', 16, y + 5);
  doc.text(isFr ? 'Matériaux' : 'Materials', 128, y + 5, { align: 'right' });
  doc.text(isFr ? 'Main-d\'Œuvre' : 'Labor', 160, y + 5, { align: 'right' });
  doc.text('Total', 194, y + 5, { align: 'right' });
  y += 7.5;

  boq.phases.forEach((ph, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 252 : 255);
    doc.rect(14, y, 182, 7, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.text(`${idx + 1}. ${isFr ? ph.fr : ph.en}`, 16, y + 4.8);
    doc.text(Eng.fmtMoney(ph.matTotal), 128, y + 4.8, { align: 'right' });
    doc.text(Eng.fmtMoney(ph.laborTotal), 160, y + 4.8, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(Eng.fmtMoney(ph.total), 194, y + 4.8, { align: 'right' });
    y += 7;
  });

  doc.setFillColor(254, 243, 199);
  doc.rect(14, y, 182, 8.5, 'F');
  doc.setTextColor(146, 64, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(isFr ? 'TOTAL GÉNÉRAL ESTIMÉ' : 'GRAND TOTAL ESTIMATE', 16, y + 5.8);
  doc.text(Eng.fmtMoney(boq.matTotal), 128, y + 5.8, { align: 'right' });
  doc.text(Eng.fmtMoney(boq.laborTotal), 160, y + 5.8, { align: 'right' });
  doc.text(Eng.fmtMoney(boq.grandTotal), 194, y + 5.8, { align: 'right' });

  // --- PAGE 3+: FULL BILL OF QUANTITIES (58 ITEMS) ---
  doc.addPage();
  const drawBoqHeader = (topY) => {
    doc.setFillColor(12, 16, 27);
    doc.rect(14, topY, 182, 7, 'F');
    doc.setTextColor(245, 158, 11);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(isFr ? 'Poste / Matériau' : 'Material / Trade Item', 16, topY + 4.8);
    doc.text(isFr ? 'Qté' : 'Qty', 124, topY + 4.8, { align: 'right' });
    doc.text(isFr ? 'Unité' : 'Unit', 142, topY + 4.8, { align: 'right' });
    doc.text(isFr ? 'P.U. ($)' : 'Unit ($)', 166, topY + 4.8, { align: 'right' });
    doc.text('Total', 194, topY + 4.8, { align: 'right' });
    return topY + 7;
  };

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(isFr ? 'MÉTRÉ COMPLET — BILL OF QUANTITIES (BOQ)' : 'COMPLETE BILL OF QUANTITIES (BOQ)', 14, 15);
  y = drawBoqHeader(20);

  const isImp = units === 'imperial';
  boq.phases.forEach(ph => {
    if (y > 266) { doc.addPage(); y = drawBoqHeader(14); }
    doc.setFillColor(226, 232, 240);
    doc.rect(14, y, 182, 6, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`${ph.idx + 1}. ${(isFr ? ph.fr : ph.en).toUpperCase()}`, 16, y + 4.2);
    y += 6;

    ph.items.forEach(it => {
      if (y > 276) { doc.addPage(); y = drawBoqHeader(14); }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.6);
      doc.setTextColor(30, 41, 59);
      doc.text(String(isFr ? it.fr : it.en).slice(0, 56), 16, y + 4);
      doc.text(String(isImp ? it.qtyImperial : it.qtyMetric), 124, y + 4, { align: 'right' });
      doc.text(isImp ? it.unitImperial : it.unitMetric, 142, y + 4, { align: 'right' });
      doc.text(`$${isImp ? it.unitPriceImperial : it.unitPriceMetric}`, 166, y + 4, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text(Eng.fmtMoney(it.total), 194, y + 4, { align: 'right' });
      doc.setDrawColor(226, 232, 240);
      doc.line(14, y + 5.5, 196, y + 5.5);
      y += 5.6;
    });
  });

  doc.save(`${slugName(p)}_Engineering_Dossier.pdf`);
}

// =========================================================================
// 3. CLEAN 3D EXPORTS (GLB / BINARY STL MAQUETTE / OBJ / HTML / AR)
// =========================================================================

function exportGLB(project) {
  return new Promise((resolve, reject) => {
    const clean = cloneCleanBuilding(1.0, false);
    if (!clean) return reject(new Error('3D scene not ready'));
    const exporter = new GLTFExporter();
    exporter.parse(
      clean,
      res => {
        const blob = new Blob([res], { type: 'model/gltf-binary' });
        downloadBlob(blob, `${slugName(project)}.glb`);
        resolve(blob.size);
      },
      err => reject(err),
      { binary: true }
    );
  });
}

function exportSTL(project) {
  // 1:100 Architectural Maquette in Millimeters (1m -> 10mm), Z-up print-ready!
  const clean = cloneCleanBuilding(10.0, true);
  if (!clean) throw new Error('3D scene not ready');
  const exporter = new STLExporter();
  const dataView = exporter.parse(clean, { binary: true });
  const bytes = dataView instanceof DataView
    ? new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength)
    : new Uint8Array(dataView);
  const blob = new Blob([bytes], { type: 'application/octet-stream' });
  downloadBlob(blob, `${slugName(project)}_Maquette_1to100.stl`);
  return blob.size;
}

function exportOBJ(project) {
  const clean = cloneCleanBuilding(1.0, false);
  if (!clean) throw new Error('3D scene not ready');
  const exporter = new OBJExporter();
  const text = exporter.parse(clean);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, `${slugName(project)}.obj`);
  return text.length;
}

function exportStandaloneHTML(project) {
  return new Promise((resolve, reject) => {
    const clean = cloneCleanBuilding(1.0, false);
    if (!clean) return reject(new Error('3D scene not ready'));
    const exporter = new GLTFExporter();
    exporter.parse(
      clean,
      res => {
        const bytes = new Uint8Array(res);
        let bin = '';
        for (let i = 0; i < bytes.length; i += 8192) {
          bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
        }
        const b64 = btoa(bin);
        const title = `Architect Pro 2 — ${project.length}m × ${project.width}m (${project.floors}F)`;
        const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
<style>body{margin:0;background:#0b101d;color:#f8fafc;font-family:Inter,system-ui,sans-serif;overflow:hidden}#hud{position:fixed;top:14px;left:14px;background:rgba(15,23,42,.82);border:1px solid rgba(245,158,11,.35);padding:10px 16px;border-radius:10px;font-size:13px;backdrop-filter:blur(8px)}b{color:#f59e0b}</style>
<script type="importmap">{"imports":{"three":"https://unpkg.com/three@0.165.0/build/three.module.js","three/addons/":"https://unpkg.com/three@0.165.0/examples/jsm/"}}</script>
</head><body><div id="hud"><b>${title}</b><br/>Drag to rotate · Scroll to zoom · Right-click to pan</div>
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const scene=new THREE.Scene();scene.background=new THREE.Color(0x0b101d);
const cam=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,0.1,300);cam.position.set(16,13,18);
const ren=new THREE.WebGLRenderer({antialias:true});ren.setSize(innerWidth,innerHeight);ren.toneMapping=THREE.ACESFilmicToneMapping;document.body.appendChild(ren.domElement);
const ctrl=new OrbitControls(cam,ren.domElement);ctrl.enableDamping=true;
scene.add(new THREE.HemisphereLight(0xdbeafe,0x1e293b,1.1));
const sun=new THREE.DirectionalLight(0xfff7ed,1.8);sun.position.set(18,28,20);scene.add(sun);
scene.add(new THREE.GridHelper(40,40,0x334155,0x1e293b));
const raw=atob("${b64}");const buf=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)buf[i]=raw.charCodeAt(i);
new GLTFLoader().parse(buf.buffer,'',g=>{scene.add(g.scene);const b=new THREE.Box3().setFromObject(g.scene);ctrl.target.copy(b.getCenter(new THREE.Vector3()));ctrl.update();});
addEventListener('resize',()=>{cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();ren.setSize(innerWidth,innerHeight);});
(function loop(){requestAnimationFrame(loop);ctrl.update();ren.render(scene,cam);})();
</script></body></html>`;
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        downloadBlob(blob, `${slugName(project)}_Interactive3D.html`);
        resolve(blob.size);
      },
      err => reject(err),
      { binary: true }
    );
  });
}

async function openARViewer(scaleMode, project) {
  if (!window.StudiosProAR || typeof window.StudiosProAR.exportSceneAndOpenAR !== 'function') {
    throw new Error('Studios-Pro AR Bridge not loaded');
  }
  const scale = scaleMode === 'real' ? 1.0 : 0.02; // 1:1 meters OR 1:50 tabletop maquette
  const clean = cloneCleanBuilding(scale, false);
  if (!clean) throw new Error('3D model not ready');
  await window.StudiosProAR.exportSceneAndOpenAR(clean, {
    title: `Architect Pro 2 (${scaleMode === 'real' ? '1:1' : '1:50'})`,
    placement: 'floor'
  });
}

// =========================================================================
// 4. FREE PROJECT SAVE/LOAD, PNG & CSV/DXF/SVG TRIGGERS
// =========================================================================

function saveProjectFile(state) {
  const payload = {
    format: 'studios-pro-arch2-v3',
    savedAt: new Date().toISOString(),
    project: state.project,
    unitSystem: state.unitSystem,
    lang: state.lang,
    colors: state.colors,
    floorPlans: state.floorPlans,
    completedSteps: state.completedSteps,
    customPrices: state.customPrices
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `${slugName(state.project)}.sparch2`);
}

function exportPNG(project) {
  const dataUrl = window.Arch3D && window.Arch3D.getSnapshotDataURL();
  if (!dataUrl) throw new Error('3D snapshot unavailable');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `${slugName(project)}_3D_Render.png`;
  a.click();
}

function exportBOQCSV(state, boq) {
  const csv = buildBOQCSVString(state, boq);
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${slugName(state.project)}_BOQ.csv`);
}

function exportDXF2D(state) {
  const dxf = buildDXFString(state);
  downloadBlob(new Blob([dxf], { type: 'application/dxf;charset=utf-8' }), `${slugName(state.project)}_FloorPlan.dxf`);
}

function exportSVG2D(state) {
  const svg = buildSVGString(state);
  downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `${slugName(state.project)}_FloorPlan.svg`);
}

window.ArchExports = {
  buildBOQCSVString,
  buildDXFString,
  buildSVGString,
  exportPDFDossier,
  exportBOQCSV,
  exportDXF2D,
  exportSVG2D,
  exportGLB,
  exportSTL,
  exportOBJ,
  exportStandaloneHTML,
  openARViewer,
  saveProjectFile,
  exportPNG
};
