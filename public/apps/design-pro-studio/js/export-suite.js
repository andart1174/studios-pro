/**
 * Design Pro Studio v4.0 — Pro Architectural Export Suite
 * Exports:
 *  - Photorealistic 2K HD 3D Render (.PNG)
 *  - Complete Architectural 2D CAD Blueprint (.SVG) — walls, ALL doors + swing arcs, ALL windows, furniture & title block!
 *  - Multi-Page Client Interior Design Dossier (.PDF via jsPDF) — 3D Render + 2D Blueprint + m² Renovation & Furniture Quote!
 *  - True 1:1 Real-Scale 3D Models (.GLB PBR, .OBJ, .STL in mm)
 *  - Direct 1:1 Real-Scale AR View via ES-Module GLTFExporter -> window.StudiosProAR.sendModel(...) (ZERO 20x miniature bug!)
 *  - Excel UTF-8 BOM Quote (.CSV) & FREE Local Project Backup (.spdesign)
 */
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';

function DC() { return window.DesignCore; }

function safeName(state) {
  const type = state?.room?.type || 'interior';
  const style = state?.room?.style || 'modern';
  return `DesignPro_${type}_${style}`.replace(/[^a-zA-Z0-9_-]+/g, '_');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try { document.body.removeChild(a); } catch (_) {}
    try { URL.revokeObjectURL(url); } catch (_) {}
  }, 1500);
}

function dataURLToBlob(dataURL) {
  const [head, b64] = dataURL.split(',');
  const mime = (head.match(/:(.*?);/) || [])[1] || 'image/png';
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

// Pure ASCII/Latin-safe helper for jsPDF standard Helvetica font
function pdfSafe(s) {
  return String(s || '')
    .replace(/€/g, 'EUR')
    .replace(/²/g, '2')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[^\x20-\xFF]/g, '');
}

// =========================================================================
// 1. ARCHITECTURAL 2D CAD BLUEPRINT (.SVG) — Complete with ALL Doors & Windows!
// =========================================================================

export function buildBlueprintSVG(state, unit = 'metric', lang = 'fr') {
  const geom = DC().buildRoomGeometry(state.room);
  const devis = DC().computeDevis(state);
  const pad = 95;
  const vbW = geom.W + pad * 2;
  const vbH = geom.D + pad * 2 + 70;
  const esc = s => String(s || '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

  const polyPts = geom.poly.map(([x, y]) => `${x + pad},${y + pad}`).join(' ');

  let wallsSvg = '';
  geom.walls.forEach(w => {
    const strokeW = w.isPartition ? 12 : DC().WALL_THICKNESS_CM;
    const col = w.id === 'w0' ? '#b45309' : '#1e293b';
    wallsSvg += `<line x1="${w.x1 + pad}" y1="${w.y1 + pad}" x2="${w.x2 + pad}" y2="${w.y2 + pad}" stroke="${col}" stroke-width="${strokeW}" stroke-linecap="square"/>`;
  });

  // Doors with accurate 90° quarter-circle swing arcs on ALL walls!
  let doorsSvg = '';
  (state.doors || []).forEach(d => {
    const wall = geom.walls.find(w => w.id === d.wallId);
    if (!wall) return;
    const ux = (wall.x2 - wall.x1) / wall.len, uy = (wall.y2 - wall.y1) / wall.len;
    const x1 = wall.x1 + ux * d.offset + pad;
    const y1 = wall.y1 + uy * d.offset + pad;
    const deg = Math.atan2(uy, ux) * 180 / Math.PI;
    const sw = d.swing === 'outward' ? -1 : 1;
    const r = d.w;
    const sweepFlag = sw > 0 ? 1 : 0;
    doorsSvg += `<g transform="translate(${x1.toFixed(1)},${y1.toFixed(1)}) rotate(${deg.toFixed(2)})">
      <rect x="0" y="-11" width="${r}" height="22" fill="#f8fafc"/>
      <line x1="0" y1="0" x2="0" y2="${sw * r}" stroke="#d97706" stroke-width="4"/>
      <path d="M ${r} 0 A ${r} ${r} 0 0 ${sweepFlag} 0 ${sw * r}" fill="none" stroke="#d97706" stroke-width="2" stroke-dasharray="6,4"/>
    </g>`;
  });

  // ALL Windows drawn cleanly on ANY wall!
  let winsSvg = '';
  (state.windows || []).forEach(w => {
    const wall = geom.walls.find(wl => wl.id === w.wallId);
    if (!wall) return;
    const ux = (wall.x2 - wall.x1) / wall.len, uy = (wall.y2 - wall.y1) / wall.len;
    const x1 = wall.x1 + ux * w.offset + pad;
    const y1 = wall.y1 + uy * w.offset + pad;
    const deg = Math.atan2(uy, ux) * 180 / Math.PI;
    winsSvg += `<g transform="translate(${x1.toFixed(1)},${y1.toFixed(1)}) rotate(${deg.toFixed(2)})">
      <rect x="0" y="-9" width="${w.w}" height="18" fill="#e0f2fe" stroke="#0284c7" stroke-width="2.5"/>
      <line x1="0" y1="-2" x2="${w.w}" y2="-2" stroke="#0284c7" stroke-width="1.5"/>
      <line x1="0" y1="2" x2="${w.w}" y2="2" stroke="#0284c7" stroke-width="1.5"/>
    </g>`;
  });

  // Furniture CAD shapes + labels
  let furnSvg = '';
  (state.furniture || []).forEach(f => {
    const def = DC().getCatalogItem(f.id);
    const lbl = esc((lang === 'en' ? def.en : def.fr).slice(0, 15));
    const dash = def.isRug ? ' stroke-dasharray="8,5"' : (def.isCeiling ? ' stroke-dasharray="4,4"' : '');
    const op = def.isRug ? '0.28' : (def.isCeiling ? '0.22' : '0.78');
    furnSvg += `<g transform="translate(${(f.x + pad).toFixed(1)},${(f.y + pad).toFixed(1)}) rotate(${f.rot || 0})">
      <rect x="${(-f.w / 2).toFixed(1)}" y="${(-f.d / 2).toFixed(1)}" width="${f.w}" height="${f.d}" rx="4" fill="${f.color || def.color}" fill-opacity="${op}" stroke="#0f172a" stroke-width="2"${dash}/>
      ${!def.isRug && f.w >= 45 ? `<text x="0" y="4" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="13" font-weight="600" fill="#0f172a">${lbl}</text>` : ''}
    </g>`;
  });

  const wLbl = `${DC().fmtLen(geom.W, unit)} (${DC().fmtMeters(geom.W, unit)})`;
  const dLbl = `${DC().fmtLen(geom.D, unit)} (${DC().fmtMeters(geom.D, unit)})`;
  const areaLbl = DC().fmtArea(geom.areaM2, unit);
  const totLbl = DC().fmtMoney(devis.grandTotal, state.currency || 'EUR');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vbW} ${vbH}" width="${Math.round(vbW * 1.4)}" height="${Math.round(vbH * 1.4)}">
  <rect width="100%" height="100%" fill="#f8fafc"/>
  <polygon points="${polyPts}" fill="${state.room.floorColor || '#e2d6c3'}" fill-opacity="0.22" stroke="none"/>
  ${wallsSvg}
  ${doorsSvg}
  ${winsSvg}
  ${furnSvg}
  <!-- Dimension Witness Lines -->
  <g stroke="#334155" stroke-width="2" font-family="Inter,Arial,sans-serif" font-size="16" font-weight="700" fill="#0f172a">
    <line x1="${pad}" y1="${pad - 36}" x2="${pad + geom.W}" y2="${pad - 36}"/>
    <line x1="${pad}" y1="${pad - 46}" x2="${pad}" y2="${pad - 26}"/>
    <line x1="${pad + geom.W}" y1="${pad - 46}" x2="${pad + geom.W}" y2="${pad - 26}"/>
    <text x="${pad + geom.W / 2}" y="${pad - 44}" text-anchor="middle">${esc(wLbl)}</text>

    <line x1="${pad - 36}" y1="${pad}" x2="${pad - 36}" y2="${pad + geom.D}"/>
    <line x1="${pad - 46}" y1="${pad}" x2="${pad - 26}" y2="${pad}"/>
    <line x1="${pad - 46}" y1="${pad + geom.D}" x2="${pad - 26}" y2="${pad + geom.D}"/>
    <text x="${pad - 48}" y="${pad + geom.D / 2}" text-anchor="middle" transform="rotate(-90 ${pad - 48} ${pad + geom.D / 2})">${esc(dLbl)}</text>
  </g>
  <!-- Architectural Title Block -->
  <rect x="24" y="${vbH - 58}" width="${vbW - 48}" height="42" rx="6" fill="#0f172a"/>
  <text x="42" y="${vbH - 32}" font-family="Inter,Arial,sans-serif" font-size="16" font-weight="700" fill="#f8fafc">DESIGN PRO STUDIO v4.0 — ${esc(state.room.type.toUpperCase())} (${esc(state.room.style.toUpperCase())})</text>
  <text x="${vbW - 42}" y="${vbH - 32}" text-anchor="end" font-family="Inter,Arial,sans-serif" font-size="15" font-weight="600" fill="#38bdf8">${esc(areaLbl)}  |  ${state.furniture.length} items  |  ${esc(totLbl)}</text>
</svg>`;
}

export function exportBlueprintSVG(state, unit, lang) {
  const svg = buildBlueprintSVG(state, unit, lang);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const fname = safeName(state) + '_Blueprint.svg';
  downloadBlob(blob, fname);
  return { filename: fname, size: blob.size };
}

// =========================================================================
// 2. PHOTOREALISTIC 2K 3D RENDER (.PNG)
// =========================================================================

export function exportRender2KPNG(scene3d, state) {
  const dataUrl = scene3d.renderHDDataURL(1920, 1080);
  const blob = dataURLToBlob(dataUrl);
  const fname = safeName(state) + '_Render_2K.png';
  downloadBlob(blob, fname);
  return { filename: fname, size: blob.size };
}

// =========================================================================
// 3. MULTI-PAGE CLIENT PRESENTATION DOSSIER (.PDF via jsPDF)
// =========================================================================

export function exportClientPDF(scene3d, cad2d, state, unit = 'metric', lang = 'fr') {
  const jsPDF = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDF) throw new Error('jsPDF unavailable');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const geom = DC().buildRoomGeometry(state.room);
  const devis = DC().computeDevis(state);
  const cur = state.currency || 'EUR';

  // PAGE 1: Executive Visual Proposal (3D Render + 2D Blueprint + Key Specs)
  doc.setFillColor(12, 18, 36);
  doc.rect(0, 0, 297, 24, 'F');
  doc.setTextColor(248, 250, 252);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(pdfSafe(`DESIGN PRO STUDIO v4.0 — ${state.room.type.toUpperCase()} (${state.room.style.toUpperCase()})`), 12, 11);
  doc.setFontSize(9.5);
  doc.setTextColor(56, 189, 248);
  doc.text(pdfSafe(`Area: ${DC().fmtArea(geom.areaM2, unit)}  |  Dimensions: ${DC().fmtMeters(geom.W, unit)} x ${DC().fmtMeters(geom.D, unit)} x ${DC().fmtMeters(geom.H, unit)}  |  Estimated Total: ${DC().fmtMoney(devis.grandTotal, cur)}`), 12, 18.5);

  // Capture crisp 3D Render + 2D Blueprint images
  const img3d = scene3d.renderHDDataURL(1280, 720);
  const img2d = cad2d.toDataURL();
  doc.addImage(img3d, 'PNG', 12, 30, 166, 94);
  doc.addImage(img2d, 'PNG', 184, 30, 101, 94);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('3D Photorealistic Interior View', 12, 130);
  doc.text('Dimensioned 2D Architectural Plan', 184, 130);

  // Summary KPI Strip on Page 1 Bottom
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(12, 138, 273, 56, 3, 3, 'F');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(pdfSafe(lang === 'fr' ? 'Synthèse du Projet Architectural' : 'Architectural Project Summary'), 18, 148);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(pdfSafe(`- Room Shape: ${state.room.shape}   |   Flooring: ${state.room.floorMaterial} (${devis.floorOrderM2.toFixed(1)} m2 incl. 10% waste)`), 18, 157);
  doc.text(pdfSafe(`- Main Walls: ${state.room.wallMaterial} (${devis.mainWallM2.toFixed(1)} m2)   |   Accent Wall: ${state.room.accentMaterial}`), 18, 164);
  doc.text(pdfSafe(`- Openings: ${state.doors.length} Door(s), ${state.windows.length} Window(s)   |   Furniture & Decor: ${state.furniture.length} item(s)`), 18, 171);
  doc.setFont('helvetica', 'bold');
  doc.text(pdfSafe(`Renovation Materials: ${DC().fmtMoney(devis.materialsSubtotal, cur)}    +    Furniture & Decor: ${DC().fmtMoney(devis.furnitureSubtotal, cur)}    =    GRAND TOTAL: ${DC().fmtMoney(devis.grandTotal, cur)}`), 18, 184);

  // PAGE 2: Itemized Renovation & Furniture Quote (Devis)
  doc.addPage();
  doc.setFillColor(12, 18, 36);
  doc.rect(0, 0, 297, 18, 'F');
  doc.setTextColor(248, 250, 252);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(pdfSafe(lang === 'fr' ? 'DEVIS DÉTAILLÉ — TRAVAUX m2 & MOBILIER' : 'ITEMIZED QUOTE — RENOVATION m2 & FURNITURE'), 12, 12);

  let y = 28;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(pdfSafe(lang === 'fr' ? '1. Matériaux & Travaux (m2 / ml / u)' : '1. Architectural Finishes & Openings'), 12, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  devis.lines.forEach(ln => {
    doc.text(pdfSafe(lang === 'fr' ? ln.fr : ln.en), 14, y);
    doc.text(pdfSafe(ln.qty), 165, y);
    doc.text(pdfSafe(DC().fmtMoney(ln.cost, cur)), 278, y, { align: 'right' });
    y += 6;
  });

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(pdfSafe(lang === 'fr' ? '2. Mobilier, Luminaires & Décoration' : '2. Furniture, Lighting & Decor'), 12, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  (state.furniture || []).slice(0, 22).forEach(f => {
    const def = DC().getCatalogItem(f.id);
    doc.text(pdfSafe(lang === 'fr' ? def.fr : def.en), 14, y);
    doc.text(pdfSafe(`${f.w}x${f.d}x${f.h} cm`), 165, y);
    doc.text(pdfSafe(DC().fmtMoney(f.price, cur)), 278, y, { align: 'right' });
    y += 5.5;
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(pdfSafe(`GRAND TOTAL: ${DC().fmtMoney(devis.grandTotal, cur)}`), 278, Math.min(198, y + 8), { align: 'right' });

  const fname = safeName(state) + '_Client_Dossier.pdf';
  doc.save(fname);
  return { filename: fname };
}

// =========================================================================
// 4. 3D REAL-SCALE EXPORTS (.GLB PBR, .STL mm, .OBJ) & DIRECT 1:1 AR VIEW!
// =========================================================================

export function encodeSceneToGLB(scene3d, exportOpts = {}) {
  return new Promise((resolve, reject) => {
    const root = scene3d.prepareExportRoot(exportOpts);
    const exporter = new GLTFExporter();
    exporter.parse(
      root,
      result => {
        scene3d.restoreAfterExport();
        if (result instanceof ArrayBuffer) resolve(result);
        else reject(new Error('GLTFExporter did not return binary GLB'));
      },
      err => {
        scene3d.restoreAfterExport();
        reject(err || new Error('GLB export error'));
      },
      { binary: true, onlyVisible: true }
    );
  });
}

export async function exportGLB(scene3d, state) {
  const buf = await encodeSceneToGLB(scene3d);
  const blob = new Blob([buf], { type: 'model/gltf-binary' });
  const fname = safeName(state) + '_1to1.glb';
  downloadBlob(blob, fname);
  return { filename: fname, size: blob.size };
}

export function exportSTL(scene3d, state) {
  const root = scene3d.prepareExportRoot();
  const clone = root.clone(true);
  clone.scale.setScalar(1000); // Real architectural meters -> exact millimeters for CAD/slicers!
  clone.updateMatrixWorld(true);
  const exporter = new STLExporter();
  const res = exporter.parse(clone, { binary: true });
  scene3d.restoreAfterExport();
  const blob = new Blob([res], { type: 'application/octet-stream' });
  const fname = safeName(state) + '_mm.stl';
  downloadBlob(blob, fname);
  return { filename: fname, size: blob.size };
}

export function exportOBJ(scene3d, state) {
  const root = scene3d.prepareExportRoot();
  const exporter = new OBJExporter();
  const txt = exporter.parse(root);
  scene3d.restoreAfterExport();
  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
  const fname = safeName(state) + '_1to1.obj';
  downloadBlob(blob, fname);
  return { filename: fname, size: blob.size };
}

// DIRECT 1:1 REAL-SCALE AR VIEW HANDOFF (ES-Module GLTFExporter -> StudiosProAR.sendModel({ modelData, ... })!)
export async function openInARViewer(scene3d, state) {
  if (!window.StudiosProAR || typeof window.StudiosProAR.sendModel !== 'function') {
    throw new Error('StudiosProAR bridge unavailable');
  }
  const glbBuffer = await encodeSceneToGLB(scene3d, { maxExtentM: 4.4 });
  const fname = safeName(state) + '_AR_1to1.glb';
  const ok = window.StudiosProAR.sendModel({
    modelData: glbBuffer,
    name: fname,
    extension: 'glb',
    isBinary: true,
    placement: 'floor',
    dimensionsMm: {
      x: Math.round((state.room.w || 500) * 10),
      y: Math.round((state.room.h || 270) * 10),
      z: Math.round((state.room.d || 400) * 10)
    },
    sourceStudio: 'design-pro-studio'
  });
  return { ok, filename: fname, size: glbBuffer.byteLength };
}

// =========================================================================
// 5. EXCEL UTF-8 BOM QUOTE (.CSV) & FREE PROJECT BACKUP (.spdesign)
// =========================================================================

export function buildQuoteCSV(state, lang = 'fr') {
  const devis = DC().computeDevis(state);
  const cur = state.currency || 'EUR';
  const rows = [
    [lang === 'fr' ? 'Catégorie' : 'Category', lang === 'fr' ? 'Désignation' : 'Item', lang === 'fr' ? 'Quantité / Dimensions' : 'Qty / Dimensions', `Price (${cur})`]
  ];
  devis.lines.forEach(ln => rows.push([lang === 'fr' ? 'Travaux' : 'Renovation', lang === 'fr' ? ln.fr : ln.en, ln.qty, ln.cost]));
  (state.furniture || []).forEach(f => {
    const def = DC().getCatalogItem(f.id);
    rows.push([def.cat, lang === 'fr' ? def.fr : def.en, `${f.w}x${f.d}x${f.h} cm`, f.price]);
  });
  rows.push(['TOTAL', lang === 'fr' ? 'Total Général Estimé' : 'Estimated Grand Total', `${devis.areaM2.toFixed(2)} m2`, devis.grandTotal]);
  return '\uFEFF' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
}

export function exportQuoteCSV(state, lang = 'fr') {
  const csv = buildQuoteCSV(state, lang);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const fname = safeName(state) + '_Quote.csv';
  downloadBlob(blob, fname);
  return { filename: fname, size: blob.size };
}

export function exportProjectFree(state) {
  const clean = {
    format: 'studios-pro-design-v4',
    savedAt: new Date().toISOString(),
    room: state.room,
    doors: state.doors,
    windows: state.windows,
    furniture: state.furniture,
    lighting: state.lighting,
    budgetLimit: state.budgetLimit,
    currency: state.currency
  };
  const blob = new Blob([JSON.stringify(clean, null, 2)], { type: 'application/json' });
  const fname = safeName(state) + '.spdesign';
  downloadBlob(blob, fname);
  return { filename: fname, size: blob.size };
}
