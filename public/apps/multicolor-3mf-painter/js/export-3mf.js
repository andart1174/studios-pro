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

    const projectConfigJson = JSON.stringify({
        filament_colour: slots.map(s => (s.color || '#FFFFFF').toUpperCase()),
        filament_type: slots.map(() => 'PLA'),
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
// 5. WATERTIGHT CLOSED-SHELL SNAP-FIT PART SPLITTER
// ==========================================

/**
 * Builds a guaranteed watertight closed 3D solid from a surface patch belonging to targetSlot
 * by generating an inward offset shell (wall thickness shellMm) + boundary skirt walls.
 */
function buildClosedSolidForSlot(welded, targetSlot, shellMm = 2.0, clearanceMm = 0.15) {
    const patchTris = welded.triangles.filter(t => t.slot === targetSlot);
    if (patchTris.length === 0) return null;

    // If patch contains literally ALL triangles of a closed model, export original closed solid directly!
    if (patchTris.length === welded.triangles.length) {
        return {
            vertices: welded.vertices,
            triangles: patchTris,
            boundaryEdges: 0,
            isClosedOriginal: true
        };
    }

    const vCount = welded.vertices.length;
    // Compute area-weighted vertex normals across the whole model for smooth inward offset
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

    // Clamp shell thickness cleanly to avoid inverting ultra-thin models
    const minExtent = Math.max(1.0, Math.min(
        welded.bounds.maxX - welded.bounds.minX,
        welded.bounds.maxY - welded.bounds.minY,
        welded.bounds.maxZ - welded.bounds.minZ
    ));
    const safeShell = Math.max(0.4, Math.min(shellMm, minExtent * 0.28));

    // Find directed boundary edges where reverse half-edge is NOT inside patchTris
    const halfEdges = new Set();
    const boundaryEdges = [];
    const boundaryVerts = new Set();

    for (let i = 0; i < patchTris.length; i++) {
        const tr = patchTris[i];
        halfEdges.add(`${tr.v1}_${tr.v2}`);
        halfEdges.add(`${tr.v2}_${tr.v3}`);
        halfEdges.add(`${tr.v3}_${tr.v1}`);
    }
    for (let i = 0; i < patchTris.length; i++) {
        const tr = patchTris[i];
        const pairs = [[tr.v1, tr.v2], [tr.v2, tr.v3], [tr.v3, tr.v1]];
        for (const [u, v] of pairs) {
            if (!halfEdges.has(`${v}_${u}`)) {
                boundaryEdges.push([u, v]);
                boundaryVerts.add(u);
                boundaryVerts.add(v);
            }
        }
    }

    // Build compact vertex table: for every vertex used in patchTris, allocate [outerIdx, innerIdx]
    const outMap = new Map();
    const inMap = new Map();
    const outVertices = [];

    const ensureOuter = (origV) => {
        let idx = outMap.get(origV);
        if (idx === undefined) {
            const p = welded.vertices[origV];
            const nx = vNormals[origV * 3], ny = vNormals[origV * 3 + 1], nz = vNormals[origV * 3 + 2];
            // Slight inward press on boundary seam for real-world snap-fit tolerance
            const shrink = boundaryVerts.has(origV) ? clearanceMm * 0.5 : 0;
            idx = outVertices.length;
            outVertices.push([p[0] - nx * shrink, p[1] - ny * shrink, p[2] - nz * shrink]);
            outMap.set(origV, idx);
        }
        return idx;
    };

    const ensureInner = (origV) => {
        let idx = inMap.get(origV);
        if (idx === undefined) {
            const p = welded.vertices[origV];
            const nx = vNormals[origV * 3], ny = vNormals[origV * 3 + 1], nz = vNormals[origV * 3 + 2];
            idx = outVertices.length;
            outVertices.push([p[0] - nx * safeShell, p[1] - ny * safeShell, p[2] - nz * safeShell]);
            inMap.set(origV, idx);
        }
        return idx;
    };

    const outTris = [];
    // 1. Outer skin + 2. Reversed inner skin
    for (let i = 0; i < patchTris.length; i++) {
        const tr = patchTris[i];
        const oa = ensureOuter(tr.v1), ob = ensureOuter(tr.v2), oc = ensureOuter(tr.v3);
        const ia = ensureInner(tr.v1), ib = ensureInner(tr.v2), ic = ensureInner(tr.v3);
        outTris.push({ v1: oa, v2: ob, v3: oc, slot: targetSlot });
        outTris.push({ v1: ia, v2: ic, v3: ib, slot: targetSlot });
    }

    // 3. Watertight perimeter skirt stitching outer <-> inner along every boundary edge
    for (let i = 0; i < boundaryEdges.length; i++) {
        const [u, v] = boundaryEdges[i];
        const ou = ensureOuter(u), ov = ensureOuter(v);
        const iu = ensureInner(u), iv = ensureInner(v);
        outTris.push({ v1: ou, v2: iu, v3: ov, slot: targetSlot });
        outTris.push({ v1: ov, v2: iu, v3: iv, slot: targetSlot });
    }

    return {
        vertices: outVertices,
        triangles: outTris,
        boundaryEdges: boundaryEdges.length,
        isClosedOriginal: false
    };
}

function openSplitterModal() {
    const modal = document.getElementById('splitter-modal');
    const summaryEl = document.getElementById('splitter-parts-preview');
    if (!modal) return;

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
    const modal = document.getElementById('splitter-modal');
    if (modal) modal.classList.remove('open');
}

async function executeSplitterExport() {
    if (!currentMesh || !currentMesh.geometry || !triangleColors) return;
    const clearance = parseFloat(document.getElementById('splitter-tolerance')?.value || '0.15');
    const shellMm = parseFloat(document.getElementById('splitter-shell-thickness')?.value || '2.0');

    showToast(t('splittingParts', 'Generating watertight closed solid parts...'));
    const welded = weldGeometryAndColors(currentMesh.geometry, triangleColors, true);
    const usedSet = new Set(welded.triangles.map(t => t.slot));
    const zip = new JSZip();
    let exportedCount = 0;

    for (const s of usedSet) {
        const solid = buildClosedSolidForSlot(welded, s, shellMm, clearance);
        if (!solid || solid.triangles.length === 0) continue;
        const safeName = (filamentSlots[s]?.name || `Part_${s + 1}`).replace(/[^\w\-]/g, '_');
        const stlBlob = createBinarySTL(solid.triangles, solid.vertices);
        zip.file(`SolidKit_${s + 1}_${safeName}.stl`, stlBlob);
        exportedCount++;
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(zipBlob, 'StudiosPro_Watertight_Kit.zip');
    closeSplitterModal();
    showToast(`Exported ${exportedCount} watertight solid STL parts!`);
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
