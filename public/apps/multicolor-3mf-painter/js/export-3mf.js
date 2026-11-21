// ==========================================
// 3MF / BAMBU NATIVE / STL / OBJ / WATERTIGHT SPLITTER & AR EXPORT
// ==========================================

class XmlChunkBuilder {
    constructor() {
        this.chunks = [];
    }
    push(str) {
        this.chunks.push(str);
    }
    toString() {
        return this.chunks.join('');
    }
}

function escapeXml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        if (a.parentNode) a.parentNode.removeChild(a);
        URL.revokeObjectURL(url);
    }, 2500);
}

/**
 * Weld duplicated non-indexed BufferGeometry vertices into a clean indexed mesh,
 * convert Three.js Y-up (x, y, z) to CAD Z-up (x, -z, y) with minZ=0 and centered XY,
 * and drop degenerate zero-area triangles.
 */
function weldGeometryAndColors(geom, triColors, convertYUpToZUp = true) {
    const pos = geom.attributes.position;
    const rawTriCount = Math.floor(pos.count / 3);

    const rawCoords = new Float64Array(pos.count * 3);
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const cx = x;
        const cy = convertYUpToZUp ? -z : y;
        const cz = convertYUpToZUp ? y : z;
        rawCoords[i * 3] = cx;
        rawCoords[i * 3 + 1] = cy;
        rawCoords[i * 3 + 2] = cz;
        if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
        if (cz < minZ) minZ = cz; if (cz > maxZ) maxZ = cz;
    }

    const offsetX = convertYUpToZUp ? -((minX + maxX) * 0.5) : 0;
    const offsetY = convertYUpToZUp ? -((minY + maxY) * 0.5) : 0;
    const offsetZ = convertYUpToZUp ? -minZ : 0;

    const vertMap = new Map();
    const vertices = []; // Flat array [x, y, z, ...] or tuples
    const triangles = [];

    const quantize = (v) => {
        const q = Math.round(v * 1000);
        return q === 0 ? 0 : q;
    };

    const getVertexIndex = (px, py, pz) => {
        const qx = quantize(px);
        const qy = quantize(py);
        const qz = quantize(pz);
        const key = `${qx},${qy},${qz}`;
        let idx = vertMap.get(key);
        if (idx === undefined) {
            idx = vertices.length;
            vertices.push([px, py, pz]);
            vertMap.set(key, idx);
        }
        return idx;
    };

    for (let t = 0; t < rawTriCount; t++) {
        const i3 = t * 3;
        const v1 = getVertexIndex(
            rawCoords[i3 * 3] + offsetX,
            rawCoords[i3 * 3 + 1] + offsetY,
            rawCoords[i3 * 3 + 2] + offsetZ
        );
        const v2 = getVertexIndex(
            rawCoords[(i3 + 1) * 3] + offsetX,
            rawCoords[(i3 + 1) * 3 + 1] + offsetY,
            rawCoords[(i3 + 1) * 3 + 2] + offsetZ
        );
        const v3 = getVertexIndex(
            rawCoords[(i3 + 2) * 3] + offsetX,
            rawCoords[(i3 + 2) * 3 + 1] + offsetY,
            rawCoords[(i3 + 2) * 3 + 2] + offsetZ
        );
        if (v1 === v2 || v2 === v3 || v3 === v1) continue;

        const a = vertices[v1], b = vertices[v2], c = vertices[v3];
        const abx = b[0] - a[0], aby = b[1] - a[1], abz = b[2] - a[2];
        const acx = c[0] - a[0], acy = c[1] - a[1], acz = c[2] - a[2];
        const nx = aby * acz - abz * acy;
        const ny = abz * acx - abx * acz;
        const nz = abx * acy - aby * acx;
        if (nx * nx + ny * ny + nz * nz < 1e-14) continue;

        const slot = triColors ? (triColors[t] || 0) : 0;
        triangles.push({ v1, v2, v3, slot });
    }

    return {
        vertices,
        triangles,
        bounds: {
            minX: minX + offsetX, maxX: maxX + offsetX,
            minY: minY + offsetY, maxY: maxY + offsetY,
            minZ: minZ + offsetZ, maxZ: maxZ + offsetZ
        }
    };
}

function captureThumbnailBase64() {
    try {
        if (!renderer || !scene || !camera) return null;
        renderer.render(scene, camera);
        const dataUrl = renderer.domElement.toDataURL('image/png');
        const idx = dataUrl.indexOf('base64,');
        return idx >= 0 ? dataUrl.slice(idx + 7) : null;
    } catch (_) {
        return null;
    }
}

function createBinarySTL(triList, vertices) {
    const triCount = triList.length;
    const buffer = new ArrayBuffer(84 + triCount * 50);
    const view = new DataView(buffer);
    const headerStr = 'Studios-Pro MultiColor 3MF Painter Binary STL';
    for (let i = 0; i < Math.min(80, headerStr.length); i++) {
        view.setUint8(i, headerStr.charCodeAt(i));
    }
    view.setUint32(80, triCount, true);

    let offset = 84;
    for (let i = 0; i < triCount; i++) {
        const tri = triList[i];
        const a = vertices[tri.v1];
        const b = vertices[tri.v2];
        const c = vertices[tri.v3];

        const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
        const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
        let nx = uy * vz - uz * vy;
        let ny = uz * vx - ux * vz;
        let nz = ux * vy - uy * vx;
        const len = Math.hypot(nx, ny, nz);
        if (len > 1e-12) { nx /= len; ny /= len; nz /= len; } else { nx = 0; ny = 0; nz = 1; }

        view.setFloat32(offset, nx, true);
        view.setFloat32(offset + 4, ny, true);
        view.setFloat32(offset + 8, nz, true);

        view.setFloat32(offset + 12, a[0], true);
        view.setFloat32(offset + 16, a[1], true);
        view.setFloat32(offset + 20, a[2], true);

        view.setFloat32(offset + 24, b[0], true);
        view.setFloat32(offset + 28, b[1], true);
        view.setFloat32(offset + 32, b[2], true);

        view.setFloat32(offset + 36, c[0], true);
        view.setFloat32(offset + 40, c[1], true);
        view.setFloat32(offset + 44, c[2], true);

        view.setUint16(offset + 48, 0, true);
        offset += 50;
    }
    return new Blob([buffer], { type: 'application/octet-stream' });
}

function openExportModal() {
    const modal = document.getElementById('export-modal');
    if (!modal) return;
    modal.classList.add('open');
    if (typeof refreshIcons === 'function') refreshIcons();
}

function closeExportModal() {
    const modal = document.getElementById('export-modal');
    if (modal) modal.classList.remove('open');
}

// ==========================================
// 1. NATIVE BAMBU STUDIO / ORCASLICER 3MF (paint_color + model_settings)
// ==========================================

async function buildBambu3MFBlob(geom, triColors, slots) {
    const welded = weldGeometryAndColors(geom, triColors, true);
    const activeIndices = [];
    const slotUsed = new Uint8Array(slots.length);
    for (let i = 0; i < welded.triangles.length; i++) {
        slotUsed[welded.triangles[i].slot] = 1;
    }
    for (let s = 0; s < slots.length; s++) {
        if (slotUsed[s] || s === 0) activeIndices.push(s);
    }

    const slotToMatIdx = new Map();
    activeIndices.forEach((s, idx) => slotToMatIdx.set(s, idx));

    const xb = new XmlChunkBuilder();
    xb.push(`<?xml version="1.0" encoding="UTF-8"?>\n`);
    xb.push(`<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02">\n`);
    xb.push(`  <metadata name="Application">Studios-Pro MultiColor 3MF Painter</metadata>\n`);
    xb.push(`  <metadata name="BambuStudio:3mfVersion">1</metadata>\n`);
    xb.push(`  <metadata name="StudiosPro:UpAxis">Z</metadata>\n`);
    xb.push(`  <resources>\n`);
    xb.push(`    <basematerials id="1">\n`);
    for (const s of activeIndices) {
        const slot = slots[s];
        const hex = (slot.color || '#FFFFFF').toUpperCase();
        xb.push(`      <base name="${escapeXml(slot.name || `Slot ${s + 1}`)}" displaycolor="${hex}FF"/>\n`);
    }
    xb.push(`    </basematerials>\n`);
    xb.push(`    <object id="1" type="model" name="StudiosPro_Painted_Model">\n`);
    xb.push(`      <mesh>\n`);
    xb.push(`        <vertices>\n`);
    for (let i = 0; i < welded.vertices.length; i++) {
        const v = welded.vertices[i];
        xb.push(`          <vertex x="${v[0].toFixed(4)}" y="${v[1].toFixed(4)}" z="${v[2].toFixed(4)}"/>\n`);
    }
    xb.push(`        </vertices>\n`);
    xb.push(`        <triangles>\n`);
    for (let i = 0; i < welded.triangles.length; i++) {
        const t = welded.triangles[i];
        const matIdx = slotToMatIdx.get(t.slot) ?? 0;
        const code = typeof encodeBambuPaintColor === 'function'
            ? encodeBambuPaintColor(t.slot)
            : (t.slot <= 0 ? null : (t.slot === 1 ? '8' : (t.slot - 2).toString(16).toUpperCase() + 'C'));
        if (!code) {
            xb.push(`          <triangle v1="${t.v1}" v2="${t.v2}" v3="${t.v3}" pid="1" p1="${matIdx}"/>\n`);
        } else {
            xb.push(`          <triangle v1="${t.v1}" v2="${t.v2}" v3="${t.v3}" pid="1" p1="${matIdx}" paint_color="${code}"/>\n`);
        }
    }
    xb.push(`        </triangles>\n`);
    xb.push(`      </mesh>\n`);
    xb.push(`    </object>\n`);
    xb.push(`  </resources>\n`);
    xb.push(`  <build>\n`);
    xb.push(`    <item objectid="1" transform="1 0 0 0 1 0 0 0 1 0 0 0" printable="1"/>\n`);
    xb.push(`  </build>\n`);
    xb.push(`</model>\n`);

    const modelSettingsXml = `<?xml version="1.0" encoding="UTF-8"?>
<config>
  <object id="1">
    <metadata key="name" value="StudiosPro_Painted_Model"/>
    <metadata key="extruder" value="1"/>
    <part id="1" subtype="normal_part">
      <metadata key="name" value="PaintedMesh"/>
      <metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/>
      <metadata key="extruder" value="1"/>
    </part>
  </object>
  <plate>
    <metadata key="plater_id" value="1"/>
    <metadata key="plater_name" value="plate_1"/>
    <model_instance>
      <metadata key="object_id" value="1"/>
      <metadata key="instance_id" value="0"/>
      <metadata key="identify_id" value="1"/>
    </model_instance>
  </plate>
</config>
`;

    const mapSlicerType = (rawType) => {
        const tStr = String(rawType || 'PLA').toUpperCase();
        if (tStr.includes('PETG')) return 'PETG';
        if (tStr.includes('ABS')) return 'ABS';
        if (tStr.includes('ASA')) return 'ASA';
        if (tStr.includes('TPU')) return 'TPU';
        return 'PLA';
    };

    const projectConfigJson = JSON.stringify({
        filament_colour: slots.map(s => (s.color || '#FFFFFF').toUpperCase()),
        filament_type: slots.map(s => mapSlicerType(s.type)),
        filament_settings_id: slots.map(s => s.type || 'Generic PLA'),
        filament_vendor: slots.map(() => 'Generic'),
        printer_model: 'Bambu Lab X1 Carbon'
    }, null, 2);

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="config" ContentType="text/plain"/>
</Types>`;

    const thumbB64 = captureThumbnailBase64();
    const relsXml = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
  ${thumbB64 ? '<Relationship Target="/Metadata/plate_1.png" Id="rel-2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/thumbnail"/>' : ''}
</Relationships>`;

    const zip = new JSZip();
    zip.file('[Content_Types].xml', contentTypesXml);
    zip.file('_rels/.rels', relsXml);
    zip.file('3D/3dmodel.model', xb.toString());
    zip.file('Metadata/model_settings.config', modelSettingsXml);
    zip.file('Metadata/project_settings.config', projectConfigJson);
    if (thumbB64) {
        zip.file('Metadata/plate_1.png', thumbB64, { base64: true });
    }
    return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

async function exportBambu3MF() {
    if (!currentMesh || !currentMesh.geometry || !triangleColors) return;
    showToast(t('exportingBambu3MF', 'Generating Bambu/Orca Native 3MF...'));
    const blob = await buildBambu3MFBlob(currentMesh.geometry, triangleColors, filamentSlots);
    downloadBlob(blob, 'StudiosPro_Bambu_Painted.3mf');
    closeExportModal();
    showToast(t('exportedBambu3MF', 'Bambu & OrcaSlicer Native .3mf exported!'));
}

// ==========================================
// 2. WELDED MULTI-PART 3MF (SEPARATE OBJECTS PER COLOR)
// ==========================================

async function export3MF() {
    if (!currentMesh || !currentMesh.geometry || !triangleColors) return;
    showToast(t('exportingMulti3MF', 'Generating Multi-Part 3MF...'));
    const welded = weldGeometryAndColors(currentMesh.geometry, triangleColors, true);

    const trisBySlot = new Map();
    for (let i = 0; i < welded.triangles.length; i++) {
        const tri = welded.triangles[i];
        if (!trisBySlot.has(tri.slot)) trisBySlot.set(tri.slot, []);
        trisBySlot.get(tri.slot).push(tri);
    }

    const usedSlots = Array.from(trisBySlot.keys()).sort((a, b) => a - b);
    const xb = new XmlChunkBuilder();
    xb.push(`<?xml version="1.0" encoding="UTF-8"?>\n`);
    xb.push(`<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">\n`);
    xb.push(`  <metadata name="Application">Studios-Pro MultiColor 3MF Painter</metadata>\n`);
    xb.push(`  <resources>\n`);
    xb.push(`    <basematerials id="1">\n`);
    usedSlots.forEach((s) => {
        const slot = filamentSlots[s] || { color: '#FFFFFF', name: `Slot ${s + 1}` };
        xb.push(`      <base name="${escapeXml(slot.name)}" displaycolor="${slot.color.toUpperCase()}FF"/>\n`);
    });
    xb.push(`    </basematerials>\n`);

    const objectIds = [];
    usedSlots.forEach((s, matIdx) => {
        const objId = matIdx + 2;
        objectIds.push({ objId, s });
        const slotName = (filamentSlots[s]?.name || `Color_${s + 1}`).replace(/[^\w\-]/g, '_');
        const triList = trisBySlot.get(s);

        // Local compact vertex index map per part
        const localVertMap = new Map();
        const localVerts = [];
        const getLocal = (globalV) => {
            let lv = localVertMap.get(globalV);
            if (lv === undefined) {
                lv = localVerts.length;
                localVerts.push(welded.vertices[globalV]);
                localVertMap.set(globalV, lv);
            }
            return lv;
        };

        xb.push(`    <object id="${objId}" type="model" name="Color_${s + 1}_${escapeXml(slotName)}" pid="1" pindex="${matIdx}">\n`);
        xb.push(`      <mesh>\n        <vertices>\n`);
        const mappedTris = triList.map(tr => ({
            v1: getLocal(tr.v1),
            v2: getLocal(tr.v2),
            v3: getLocal(tr.v3)
        }));
        for (let k = 0; k < localVerts.length; k++) {
            const v = localVerts[k];
            xb.push(`          <vertex x="${v[0].toFixed(4)}" y="${v[1].toFixed(4)}" z="${v[2].toFixed(4)}"/>\n`);
        }
        xb.push(`        </vertices>\n        <triangles>\n`);
        for (let k = 0; k < mappedTris.length; k++) {
            const mt = mappedTris[k];
            xb.push(`          <triangle v1="${mt.v1}" v2="${mt.v2}" v3="${mt.v3}" pid="1" p1="${matIdx}"/>\n`);
        }
        xb.push(`        </triangles>\n      </mesh>\n    </object>\n`);
    });

    xb.push(`    <object id="100" type="model" name="MultiColor_Assembly">\n      <components>\n`);
    for (const item of objectIds) {
        xb.push(`        <component objectid="${item.objId}" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>\n`);
    }
    xb.push(`      </components>\n    </object>\n`);
    xb.push(`  </resources>\n  <build>\n    <item objectid="100" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>\n  </build>\n</model>\n`);

    const zip = new JSZip();
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>`);
    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>`);
    zip.file('3D/3dmodel.model', xb.toString());

    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    downloadBlob(blob, 'StudiosPro_MultiPart_Color.3mf');
    closeExportModal();
    showToast(t('exportedMulti3MF', 'Multi-Part .3mf exported!'));
}

// ==========================================
// 3. WELDED SINGLE-MESH MULTI-MATERIAL 3MF
// ==========================================

async function exportSingleMesh3MF() {
    if (!currentMesh || !currentMesh.geometry || !triangleColors) return;
    showToast(t('exportingSingle3MF', 'Generating Single-Mesh 3MF...'));
    const welded = weldGeometryAndColors(currentMesh.geometry, triangleColors, true);

    const xb = new XmlChunkBuilder();
    xb.push(`<?xml version="1.0" encoding="UTF-8"?>\n`);
    xb.push(`<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">\n`);
    xb.push(`  <metadata name="Application">Studios-Pro MultiColor 3MF Painter</metadata>\n`);
    xb.push(`  <resources>\n    <basematerials id="1">\n`);
    filamentSlots.forEach((slot, s) => {
        xb.push(`      <base name="${escapeXml(slot.name || `Slot ${s + 1}`)}" displaycolor="${(slot.color || '#FFFFFF').toUpperCase()}FF"/>\n`);
    });
    xb.push(`    </basematerials>\n    <object id="1" type="model" name="PaintedMesh">\n      <mesh>\n        <vertices>\n`);
    for (let i = 0; i < welded.vertices.length; i++) {
        const v = welded.vertices[i];
        xb.push(`          <vertex x="${v[0].toFixed(4)}" y="${v[1].toFixed(4)}" z="${v[2].toFixed(4)}"/>\n`);
    }
    xb.push(`        </vertices>\n        <triangles>\n`);
    for (let i = 0; i < welded.triangles.length; i++) {
        const tr = welded.triangles[i];
        xb.push(`          <triangle v1="${tr.v1}" v2="${tr.v2}" v3="${tr.v3}" pid="1" p1="${tr.slot}"/>\n`);
    }
    xb.push(`        </triangles>\n      </mesh>\n    </object>\n  </resources>\n  <build>\n    <item objectid="1" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>\n  </build>\n</model>\n`);

    const zip = new JSZip();
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>`);
    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>`);
    zip.file('3D/3dmodel.model', xb.toString());

    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    downloadBlob(blob, 'StudiosPro_SingleMesh.3mf');
    closeExportModal();
    showToast(t('exportedSingle3MF', 'Single-Mesh .3mf exported!'));
}

// ==========================================
// 4. ALIGNED SEPARATE STLs ZIP & OBJ
// ==========================================

async function exportSeparateSTLs() {
    if (!currentMesh || !currentMesh.geometry || !triangleColors) return;
    const welded = weldGeometryAndColors(currentMesh.geometry, triangleColors, true);
    const trisBySlot = new Map();
    for (let i = 0; i < welded.triangles.length; i++) {
        const tr = welded.triangles[i];
        if (!trisBySlot.has(tr.slot)) trisBySlot.set(tr.slot, []);
        trisBySlot.get(tr.slot).push(tr);
    }

    const zip = new JSZip();
    trisBySlot.forEach((triList, s) => {
        const safeName = (filamentSlots[s]?.name || `Slot_${s + 1}`).replace(/[^\w\-]/g, '_');
        const stlBlob = createBinarySTL(triList, welded.vertices);
        zip.file(`Part_${s + 1}_${safeName}.stl`, stlBlob);
    });
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(zipBlob, 'StudiosPro_Aligned_STLs.zip');
    closeExportModal();
    showToast(t('exportedSTLs', 'Aligned STLs ZIP exported!'));
}

async function exportOBJ() {
    if (!currentMesh || !currentMesh.geometry || !triangleColors) return;
    const welded = weldGeometryAndColors(currentMesh.geometry, triangleColors, true);
    const xb = new XmlChunkBuilder();
    xb.push('# Studios-Pro MultiColor 3MF Painter OBJ Export\n');
    xb.push('mtllib model.mtl\n');
    for (let i = 0; i < welded.vertices.length; i++) {
        const v = welded.vertices[i];
        xb.push(`v ${v[0].toFixed(4)} ${v[1].toFixed(4)} ${v[2].toFixed(4)}\n`);
    }
    let lastSlot = -1;
    const sorted = [...welded.triangles].sort((a, b) => a.slot - b.slot);
    for (let i = 0; i < sorted.length; i++) {
        const tr = sorted[i];
        if (tr.slot !== lastSlot) {
            lastSlot = tr.slot;
            xb.push(`usemtl slot_${lastSlot + 1}\n`);
        }
        xb.push(`f ${tr.v1 + 1} ${tr.v2 + 1} ${tr.v3 + 1}\n`);
    }

    const mtl = filamentSlots.map((slot, s) => {
        const c = new THREE.Color(slot.color || '#FFFFFF');
        return `newmtl slot_${s + 1}\nKd ${c.r.toFixed(4)} ${c.g.toFixed(4)} ${c.b.toFixed(4)}\nKa 0.1 0.1 0.1\n`;
    }).join('\n');

    const zip = new JSZip();
    zip.file('model.obj', xb.toString());
    zip.file('model.mtl', mtl);
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, 'StudiosPro_Color_OBJ.zip');
    closeExportModal();
    showToast(t('exportedOBJ', 'Color OBJ + MTL ZIP exported!'));
}

// ==========================================
// 5. #9 TRUE MECHANICAL SNAP-FIT PART SPLITTER (DOWEL PINS + TANGENT CLEARANCE + EXPLODED VIEW!)
// ==========================================
let explodedPreviewGroup = null;

function appendCylinderPinToSolid(vertices, triangles, origin, dir, radius, length, slot, segs = 14) {
    const N = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize();
    const up = Math.abs(N.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const T = new THREE.Vector3().crossVectors(up, N).normalize();
    const B = new THREE.Vector3().crossVectors(N, T).normalize();

    const baseCenterIdx = vertices.length;
    vertices.push([origin[0], origin[1], origin[2]]);
    const tipCenterIdx = vertices.length;
    vertices.push([origin[0] + N.x * length, origin[1] + N.y * length, origin[2] + N.z * length]);

    const baseRing = [];
    const tipRing = [];
    const tipR = radius * 0.88; // Slight chamfered lead-in tip for easy press-fit assembly!
    for (let i = 0; i < segs; i++) {
        const ang = (i / segs) * Math.PI * 2;
        const ca = Math.cos(ang), sa = Math.sin(ang);
        const rx = T.x * ca + B.x * sa;
        const ry = T.y * ca + B.y * sa;
        const rz = T.z * ca + B.z * sa;
        baseRing.push(vertices.length);
        vertices.push([origin[0] + rx * radius, origin[1] + ry * radius, origin[2] + rz * radius]);
        tipRing.push(vertices.length);
        vertices.push([
            origin[0] + N.x * length + rx * tipR,
            origin[1] + N.y * length + ry * tipR,
            origin[2] + N.z * length + rz * tipR
        ]);
    }

    for (let i = 0; i < segs; i++) {
        const ni = (i + 1) % segs;
        // Side wall (outward)
        triangles.push({ v1: baseRing[i], v2: baseRing[ni], v3: tipRing[ni], slot });
        triangles.push({ v1: baseRing[i], v2: tipRing[ni], v3: tipRing[i], slot });
        // Tip cap (+N)
        triangles.push({ v1: tipCenterIdx, v2: tipRing[i], v3: tipRing[ni], slot });
        // Base cap (-N)
        triangles.push({ v1: baseCenterIdx, v2: baseRing[ni], v3: baseRing[i], slot });
    }
}

/**
 * Builds a guaranteed watertight closed 3D solid from a surface patch belonging to targetSlot
 * with true IN-PLANE tangent seam clearance + optional mechanical alignment dowel pins!
 */
function buildClosedSolidForSlot(welded, targetSlot, shellMm = 2.0, clearanceMm = 0.18, addPins = true) {
    const patchTris = welded.triangles.filter(t => t.slot === targetSlot);
    if (patchTris.length === 0) return null;

    if (patchTris.length === welded.triangles.length) {
        return {
            vertices: welded.vertices,
            triangles: patchTris,
            boundaryEdges: 0,
            pinCount: 0,
            isClosedOriginal: true
        };
    }

    const vCount = welded.vertices.length;
    const vNormals = new Float64Array(vCount * 3);
    for (let i = 0; i < welded.triangles.length; i++) {
        const tr = welded.triangles[i];
        const a = welded.vertices[tr.v1], b = welded.vertices[tr.v2], c = welded.vertices[tr.v3];
        const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
        const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
        const nx = uy * vz - uz * vy;
        const ny = uz * vx - ux * vz;
        const nz = ux * vy - uy * vx;
        const verts = [tr.v1, tr.v2, tr.v3];
        for (const vid of verts) {
            vNormals[vid * 3] += nx;
            vNormals[vid * 3 + 1] += ny;
            vNormals[vid * 3 + 2] += nz;
        }
    }
    for (let v = 0; v < vCount; v++) {
        const nx = vNormals[v * 3], ny = vNormals[v * 3 + 1], nz = vNormals[v * 3 + 2];
        const len = Math.hypot(nx, ny, nz) || 1;
        vNormals[v * 3] = nx / len;
        vNormals[v * 3 + 1] = ny / len;
        vNormals[v * 3 + 2] = nz / len;
    }

    const minExtent = Math.max(1.0, Math.min(
        welded.bounds.maxX - welded.bounds.minX,
        welded.bounds.maxY - welded.bounds.minY,
        welded.bounds.maxZ - welded.bounds.minZ
    ));
    const safeShell = Math.max(0.4, Math.min(shellMm, minExtent * 0.28));

    // Find directed boundary edges & compute TRUE IN-PLANE inward tangent shrink per boundary vertex!
    const halfEdges = new Set();
    const boundaryEdges = [];
    const boundaryInward = new Map(); // origV -> [tx, ty, tz]

    for (let i = 0; i < patchTris.length; i++) {
        const tr = patchTris[i];
        halfEdges.add(`${tr.v1}_${tr.v2}`);
        halfEdges.add(`${tr.v2}_${tr.v3}`);
        halfEdges.add(`${tr.v3}_${tr.v1}`);
    }
    for (let i = 0; i < patchTris.length; i++) {
        const tr = patchTris[i];
        const a = welded.vertices[tr.v1], b = welded.vertices[tr.v2], c = welded.vertices[tr.v3];
        const fNx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
        const fNy = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
        const fNz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
        const fLen = Math.hypot(fNx, fNy, fNz) || 1;
        const fnx = fNx / fLen, fny = fNy / fLen, fnz = fNz / fLen;

        const pairs = [[tr.v1, tr.v2], [tr.v2, tr.v3], [tr.v3, tr.v1]];
        for (const [u, v] of pairs) {
            if (!halfEdges.has(`${v}_${u}`)) {
                boundaryEdges.push([u, v]);
                // Inward in-plane tangent = faceNormal x (v - u) (points INTO the patch!)
                const pu = welded.vertices[u], pv = welded.vertices[v];
                const ex = pv[0] - pu[0], ey = pv[1] - pu[1], ez = pv[2] - pu[2];
                const eLen = Math.hypot(ex, ey, ez) || 1;
                const edx = ex / eLen, edy = ey / eLen, edz = ez / eLen;
                const ix = fny * edz - fnz * edy;
                const iy = fnz * edx - fnx * edz;
                const iz = fnx * edy - fny * edx;
                for (const vid of [u, v]) {
                    const acc = boundaryInward.get(vid) || [0, 0, 0];
                    acc[0] += ix; acc[1] += iy; acc[2] += iz;
                    boundaryInward.set(vid, acc);
                }
            }
        }
    }

    const outMap = new Map();
    const inMap = new Map();
    const outVertices = [];

    const getShrinkVec = (origV) => {
        const acc = boundaryInward.get(origV);
        if (!acc || clearanceMm <= 0) return [0, 0, 0];
        const l = Math.hypot(acc[0], acc[1], acc[2]);
        if (l < 1e-6) return [0, 0, 0];
        const s = clearanceMm * 0.5 / l;
        return [acc[0] * s, acc[1] * s, acc[2] * s];
    };

    const ensureOuter = (origV) => {
        let idx = outMap.get(origV);
        if (idx === undefined) {
            const p = welded.vertices[origV];
            const sv = getShrinkVec(origV);
            idx = outVertices.length;
            outVertices.push([p[0] + sv[0], p[1] + sv[1], p[2] + sv[2]]);
            outMap.set(origV, idx);
        }
        return idx;
    };

    const ensureInner = (origV) => {
        let idx = inMap.get(origV);
        if (idx === undefined) {
            const p = welded.vertices[origV];
            const nx = vNormals[origV * 3], ny = vNormals[origV * 3 + 1], nz = vNormals[origV * 3 + 2];
            const sv = getShrinkVec(origV);
            idx = outVertices.length;
            outVertices.push([
                p[0] + sv[0] - nx * safeShell,
                p[1] + sv[1] - ny * safeShell,
                p[2] + sv[2] - nz * safeShell
            ]);
            inMap.set(origV, idx);
        }
        return idx;
    };

    const outTris = [];
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < patchTris.length; i++) {
        const tr = patchTris[i];
        const oa = ensureOuter(tr.v1), ob = ensureOuter(tr.v2), oc = ensureOuter(tr.v3);
        const ia = ensureInner(tr.v1), ib = ensureInner(tr.v2), ic = ensureInner(tr.v3);
        outTris.push({ v1: oa, v2: ob, v3: oc, slot: targetSlot });
        outTris.push({ v1: ia, v2: ic, v3: ib, slot: targetSlot });
        const pa = welded.vertices[tr.v1];
        cx += pa[0]; cy += pa[1]; cz += pa[2];
    }
    cx /= patchTris.length; cy /= patchTris.length; cz /= patchTris.length;

    for (let i = 0; i < boundaryEdges.length; i++) {
        const [u, v] = boundaryEdges[i];
        const ou = ensureOuter(u), ov = ensureOuter(v);
        const iu = ensureInner(u), iv = ensureInner(v);
        outTris.push({ v1: ou, v2: iu, v3: ov, slot: targetSlot });
        outTris.push({ v1: ov, v2: iu, v3: iv, slot: targetSlot });
    }

    // Generate REAL Mechanical Registration Dowel Pins on interior backing wall of secondary parts!
    let pinCount = 0;
    if (addPins && targetSlot > 0 && patchTris.length >= 4) {
        const pinRadius = Math.max(0.7, Math.min(1.6, safeShell * 0.65) - clearanceMm * 0.5);
        const pinLen = Math.max(1.6, Math.min(3.4, safeShell * 1.35));
        const usedOrigins = [];
        const step = Math.max(1, Math.floor(patchTris.length / 6));
        for (let i = 0; i < patchTris.length && pinCount < 3; i += step) {
            const tr = patchTris[i];
            const vid = tr.v1;
            if (boundaryInward.has(vid)) continue;
            const p = welded.vertices[vid];
            const nx = vNormals[vid * 3], ny = vNormals[vid * 3 + 1], nz = vNormals[vid * 3 + 2];
            const orig = [p[0] - nx * (safeShell * 0.85), p[1] - ny * (safeShell * 0.85), p[2] - nz * (safeShell * 0.85)];
            const tooClose = usedOrigins.some(o => Math.hypot(o[0] - orig[0], o[1] - orig[1], o[2] - orig[2]) < pinRadius * 4.5);
            if (tooClose) continue;
            usedOrigins.push(orig);
            appendCylinderPinToSolid(outVertices, outTris, orig, [-nx, -ny, -nz], pinRadius, pinLen, targetSlot, 14);
            pinCount++;
        }
    }

    return {
        vertices: outVertices,
        triangles: outTris,
        boundaryEdges: boundaryEdges.length,
        pinCount,
        centroid: [cx, cy, cz],
        isClosedOriginal: false
    };
}

function clearExplodedPreview() {
    if (explodedPreviewGroup && scene) {
        explodedPreviewGroup.traverse(c => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
        });
        scene.remove(explodedPreviewGroup);
        explodedPreviewGroup = null;
    }
    if (currentMesh) currentMesh.visible = true;
    const sl = document.getElementById('splitter-explode-slider');
    if (sl) sl.value = 0;
    const lbl = document.getElementById('val-splitter-explode');
    if (lbl) lbl.textContent = '0%';
}

function previewExplodedSplit(ratioVal) {
    const ratio = Math.max(0, Math.min(1, parseFloat(ratioVal) || 0));
    const lbl = document.getElementById('val-splitter-explode');
    if (lbl) lbl.textContent = `${Math.round(ratio * 100)}%`;

    if (ratio <= 0.01) {
        clearExplodedPreview();
        return;
    }
    if (!currentMesh || !currentMesh.geometry || !triangleColors) return;

    if (!explodedPreviewGroup) {
        const clearance = parseFloat(document.getElementById('splitter-tolerance')?.value || '0.18');
        const shellMm = parseFloat(document.getElementById('splitter-shell-thickness')?.value || '2.0');
        const addPins = document.getElementById('splitter-include-pins')?.checked !== false;
        // Keep viewport Y-up for live exploded preview (convertYUpToZUp = false!)
        const welded = weldGeometryAndColors(currentMesh.geometry, triangleColors, false);
        const usedSet = new Set(welded.triangles.map(t => t.slot));

        const modelCenter = new THREE.Vector3(
            (welded.bounds.minX + welded.bounds.maxX) * 0.5,
            (welded.bounds.minY + welded.bounds.maxY) * 0.5,
            (welded.bounds.minZ + welded.bounds.maxZ) * 0.5
        );
        const maxDim = Math.max(
            welded.bounds.maxX - welded.bounds.minX,
            welded.bounds.maxY - welded.bounds.minY,
            welded.bounds.maxZ - welded.bounds.minZ,
            15
        );

        explodedPreviewGroup = new THREE.Group();
        for (const s of usedSet) {
            const solid = buildClosedSolidForSlot(welded, s, shellMm, clearance, addPins);
            if (!solid || solid.triangles.length === 0) continue;
            const posArr = new Float32Array(solid.triangles.length * 9);
            for (let i = 0; i < solid.triangles.length; i++) {
                const tr = solid.triangles[i];
                const a = solid.vertices[tr.v1], b = solid.vertices[tr.v2], c = solid.vertices[tr.v3];
                const k = i * 9;
                posArr[k] = a[0]; posArr[k + 1] = a[1]; posArr[k + 2] = a[2];
                posArr[k + 3] = b[0]; posArr[k + 4] = b[1]; posArr[k + 5] = b[2];
                posArr[k + 6] = c[0]; posArr[k + 7] = c[1]; posArr[k + 8] = c[2];
            }
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
            g.computeVertexNormals();
            const mat = new THREE.MeshStandardMaterial({
                color: filamentSlots[s]?.color || '#ffffff',
                roughness: 0.45,
                metalness: 0.1,
                side: THREE.DoubleSide
            });
            const m = new THREE.Mesh(g, mat);
            const cVec = solid.centroid ? new THREE.Vector3(solid.centroid[0], solid.centroid[1], solid.centroid[2]) : modelCenter.clone();
            const dir = cVec.sub(modelCenter);
            if (dir.lengthSq() < 0.01) dir.set(Math.cos(s * 2.1), 0.3, Math.sin(s * 2.1));
            dir.normalize();
            m.userData = { explodeDir: dir, explodeDist: maxDim * 0.55 };
            explodedPreviewGroup.add(m);
        }
        scene.add(explodedPreviewGroup);
        currentMesh.visible = false;
    }

    explodedPreviewGroup.children.forEach(m => {
        const d = m.userData.explodeDir;
        const dist = m.userData.explodeDist * ratio;
        m.position.set(d.x * dist, d.y * dist, d.z * dist);
    });
}

function openSplitterModal() {
    const modal = document.getElementById('splitter-modal');
    const summaryEl = document.getElementById('splitter-parts-preview');
    if (!modal) return;
    clearExplodedPreview();

    if (currentMesh && triangleColors && summaryEl) {
        const counts = new Int32Array(filamentSlots.length);
        for (let i = 0; i < triangleColors.length; i++) counts[triangleColors[i]]++;
        const parts = [];
        for (let s = 0; s < filamentSlots.length; s++) {
            if (counts[s] > 0) {
                parts.push(`<span class="stat-pill" style="border-left:3px solid ${filamentSlots[s].color}">${filamentSlots[s].name}: ${counts[s]} tris</span>`);
            }
        }
        summaryEl.innerHTML = parts.join(' ');
    }
    modal.classList.add('open');
    if (typeof refreshIcons === 'function') refreshIcons();
}

function closeSplitterModal() {
    clearExplodedPreview();
    const modal = document.getElementById('splitter-modal');
    if (modal) modal.classList.remove('open');
}

async function executeSplitterExport() {
    if (!currentMesh || !currentMesh.geometry || !triangleColors) return;
    const clearance = parseFloat(document.getElementById('splitter-tolerance')?.value || '0.18');
    const shellMm = parseFloat(document.getElementById('splitter-shell-thickness')?.value || '2.0');
    const addPins = document.getElementById('splitter-include-pins')?.checked !== false;

    showToast(t('splittingParts', 'Generating watertight closed solid parts with alignment pins...'));
    const welded = weldGeometryAndColors(currentMesh.geometry, triangleColors, true);
    const usedSet = new Set(welded.triangles.map(t => t.slot));
    const zip = new JSZip();
    let exportedCount = 0;
    let totalPins = 0;

    for (const s of usedSet) {
        const solid = buildClosedSolidForSlot(welded, s, shellMm, clearance, addPins);
        if (!solid || solid.triangles.length === 0) continue;
        const safeName = (filamentSlots[s]?.name || `Part_${s + 1}`).replace(/[^\w\-]/g, '_');
        const stlBlob = createBinarySTL(solid.triangles, solid.vertices);
        zip.file(`SolidKit_${s + 1}_${safeName}.stl`, stlBlob);
        exportedCount++;
        totalPins += solid.pinCount || 0;
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(zipBlob, 'StudiosPro_Watertight_SnapFit_Kit.zip');
    closeSplitterModal();
    showToast(currentLang === 'fr'
        ? `${exportedCount} pièces STL étanches exportées (${totalPins} pions d'alignement) !`
        : `Exported ${exportedCount} watertight solid STL parts (${totalPins} alignment pins)!`);
}

// ==========================================
// 6. AR BRIDGE EXPORT (SAFETY GUARDS AGAINST HEATMAP / CLIPPING)
// ==========================================

async function openARPreview() {
    if (!currentMesh || !currentMesh.geometry) {
        showToast(t('aiNoModel', 'Load a 3D model first.'));
        return;
    }
    if (!window.StudiosProAR || typeof window.StudiosProAR.exportSceneAndOpenAR !== 'function') {
        showToast('AR Bridge unavailable');
        return;
    }

    const prevHeatmap = typeof isShowingPurgeHeatmap !== 'undefined' && isShowingPurgeHeatmap;
    const prevClipRatio = typeof layerSliceRatio !== 'undefined' ? layerSliceRatio : 1.0;

    try {
        if (prevHeatmap && typeof updateMeshVisualColors === 'function') {
            updateMeshVisualColors();
        }
        if (prevClipRatio < 0.999 && currentMesh.material) {
            currentMesh.material.clippingPlanes = null;
        }
        showToast(t('launchingAR', 'Preparing 3D painted model for AR Viewer...'));
        await window.StudiosProAR.exportSceneAndOpenAR(currentMesh, {
            name: 'StudiosPro_MultiColor_Creation',
            placement: 'floor',
            sourceStudio: 'multicolor-3mf-painter'
        });
    } finally {
        if (prevHeatmap && typeof togglePurgeHeatmap === 'function') {
            isShowingPurgeHeatmap = false;
            togglePurgeHeatmap();
        }
        if (prevClipRatio < 0.999 && typeof setLayerSliceRatio === 'function') {
            setLayerSliceRatio(prevClipRatio);
        }
    }
}
