// ==========================================
// UNIVERSAL 3MF (BAMBU / ORCA / PRUSA) + BINARY STL + TRUE VECTOR LASER DXF/SVG
// + 256x256 PLATE PACKER + 6-MIN CALIBRATION SWATCH + BATCH PRO (RANGE & CSV) + AR FIX
// ==========================================

class XmlChunkBuilder {
    constructor() { this.chunks = []; }
    push(s) { this.chunks.push(s); }
    toString() { return this.chunks.join(''); }
}

function escapeXml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function sanitizeFileSlug(str) {
    return String(str || 'item')
        .trim()
        .replace(/[^a-zA-Z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 40) || 'item';
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.dataset.bypassed = 'true';
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
        URL.revokeObjectURL(url);
    }, 2500);
}

function captureThumbnailBase64() {
    try {
        if (!renderer || !scene || !camera) return null;
        const prevClip = renderer.localClippingEnabled;
        renderer.localClippingEnabled = false;
        renderer.render(scene, camera);
        const dataUrl = renderer.domElement.toDataURL('image/png');
        renderer.localClippingEnabled = prevClip;
        renderer.render(scene, camera);
        const idx = dataUrl.indexOf('base64,');
        return idx >= 0 ? dataUrl.slice(idx + 7) : null;
    } catch (_) {
        return null;
    }
}

// ==========================================
// MESH EXTRACTION & WATER-TIGHT WELDING
// ==========================================

function extractMeshTriangles(group) {
    const verts = [];
    const tris = [];
    if (!group) return { verts, tris };
    group.updateMatrixWorld(true);

    group.traverse(child => {
        if (child.userData && child.userData.isPreviewOnly) return;
        if (child.isInstancedMesh && child.geometry) {
            const owned = !!child.geometry.index;
            const geo = owned ? child.geometry.toNonIndexed() : child.geometry;
            const pos = geo.attributes.position;
            if (!pos || pos.count === 0) { if (owned) geo.dispose(); return; }

            const instanceMatrix = new THREE.Matrix4();
            const combined = new THREE.Matrix4();
            const v = new THREE.Vector3();

            for (let i = 0; i < child.count; i++) {
                child.getMatrixAt(i, instanceMatrix);
                combined.multiplyMatrices(child.matrixWorld, instanceMatrix);
                const baseIdx = verts.length;
                for (let p = 0; p < pos.count; p++) {
                    v.set(pos.getX(p), pos.getY(p), pos.getZ(p)).applyMatrix4(combined);
                    verts.push([v.x, v.y, v.z]);
                }
                for (let f = 0; f < pos.count; f += 3) {
                    tris.push([baseIdx + f, baseIdx + f + 1, baseIdx + f + 2]);
                }
            }
            if (owned) geo.dispose();
        } else if (child.isMesh && child.geometry) {
            const owned = !!child.geometry.index;
            const geo = owned ? child.geometry.toNonIndexed() : child.geometry;
            const pos = geo.attributes.position;
            if (!pos || pos.count === 0) { if (owned) geo.dispose(); return; }

            const baseIdx = verts.length;
            const worldMatrix = child.matrixWorld;
            const v = new THREE.Vector3();
            for (let i = 0; i < pos.count; i++) {
                v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(worldMatrix);
                verts.push([v.x, v.y, v.z]);
            }
            for (let f = 0; f < pos.count; f += 3) {
                tris.push([baseIdx + f, baseIdx + f + 1, baseIdx + f + 2]);
            }
            if (owned) geo.dispose();
        }
    });
    return { verts, tris };
}

function weldAndTransformMesh(rawVerts, rawTris, zOffset = 0, flipFaceDown = false, maxThreeY = 0) {
    const factor = 2000;
    const weldedVerts = [];
    const vertMap = new Map();
    const weldedTris = [];

    const quantize = (n) => {
        const q = Math.round(n * factor);
        return q === 0 ? 0 : q;
    };

    for (let i = 0; i < rawTris.length; i++) {
        const tri = rawTris[i];
        const newTri = [];
        for (let j = 0; j < 3; j++) {
            const v = rawVerts[tri[j]];
            // Determinant = +1 in BOTH branches (preserves outward normals!):
            // Standard Z-up: (x, -z, y + zOffset)
            // Face-Down PEI 180-deg X flip: (x, +z, maxThreeY - y)
            const px = v[0];
            const py = flipFaceDown ? v[2] : -v[2];
            const pz = flipFaceDown ? (maxThreeY - v[1]) : (v[1] + zOffset);

            const qx = quantize(px);
            const qy = quantize(py);
            const qz = quantize(pz);
            const key = `${qx}_${qy}_${qz}`;

            let idx = vertMap.get(key);
            if (idx === undefined) {
                idx = weldedVerts.length;
                vertMap.set(key, idx);
                weldedVerts.push([qx / factor, qy / factor, qz / factor]);
            }
            newTri.push(idx);
        }
        if (newTri[0] !== newTri[1] && newTri[1] !== newTri[2] && newTri[0] !== newTri[2]) {
            weldedTris.push(newTri);
        }
    }
    return { verts: weldedVerts, tris: weldedTris };
}

function getExportParts(forceNoFlip = false) {
    const rawBase = extractMeshTriangles(baseMeshGroup);
    const rawQuiet = extractMeshTriangles(quietZoneMeshGroup);
    const rawQR = extractMeshTriangles(qrMeshGroup);

    const rawTextOnly = extractMeshTriangles(textMeshGroup);
    const rawBadgeOnly = extractMeshTriangles(badgeMeshGroup);
    const rawText = {
        verts: rawTextOnly.verts.concat(rawBadgeOnly.verts),
        tris: rawTextOnly.tris.concat(rawBadgeOnly.tris.map(t => [
            t[0] + rawTextOnly.verts.length,
            t[1] + rawTextOnly.verts.length,
            t[2] + rawTextOnly.verts.length
        ]))
    };

    let minY = Infinity, maxY = -Infinity;
    [rawBase, rawQuiet, rawQR, rawText].forEach(p => {
        for (let i = 0; i < p.verts.length; i++) {
            const vy = p.verts[i][1];
            if (vy < minY) minY = vy;
            if (vy > maxY) maxY = vy;
        }
    });
    if (!isFinite(minY)) { minY = 0; maxY = 0; }

    const flip = (!forceNoFlip && isFaceDownMode && currentShape !== 'stand' && currentShape !== 'tent' && currentShape !== 'caddy');
    const zOffset = -minY;

    const basePart = weldAndTransformMesh(rawBase.verts, rawBase.tris, zOffset, flip, maxY);
    const quietPart = weldAndTransformMesh(rawQuiet.verts, rawQuiet.tris, zOffset, flip, maxY);
    const qrPart = weldAndTransformMesh(rawQR.verts, rawQR.tris, zOffset, flip, maxY);
    const textPart = weldAndTransformMesh(rawText.verts, rawText.tris, zOffset, flip, maxY);

    const parts = [
        { name: `1_Base_${baseColorHex}`, color: baseColorHex, verts: basePart.verts, tris: basePart.tris }
    ];
    if (quietPart.verts.length > 0 && quietPart.tris.length > 0) {
        parts.push({ name: `2_QuietZone_${quietZoneColorHex}`, color: quietZoneColorHex, verts: quietPart.verts, tris: quietPart.tris });
    }
    if (qrPart.verts.length > 0 && qrPart.tris.length > 0) {
        parts.push({ name: `3_QR_${qrColorHex}`, color: qrColorHex, verts: qrPart.verts, tris: qrPart.tris });
    }
    if (textPart.verts.length > 0 && textPart.tris.length > 0) {
        parts.push({ name: `4_Text_Badge_${accentColorHex}`, color: accentColorHex, verts: textPart.verts, tris: textPart.tris });
    }

    // Measure XY footprint of exported parts
    let minX = Infinity, maxX = -Infinity, minPy = Infinity, maxPy = -Infinity;
    parts.forEach(p => {
        for (const v of p.verts) {
            if (v[0] < minX) minX = v[0]; if (v[0] > maxX) maxX = v[0];
            if (v[1] < minPy) minPy = v[1]; if (v[1] > maxPy) maxPy = v[1];
        }
    });

    return {
        basePart,
        quietPart,
        qrPart,
        textPart,
        parts,
        footprint: {
            width: isFinite(minX) ? (maxX - minX) : 100,
            height: isFinite(minPy) ? (maxPy - minPy) : 100,
            cx: isFinite(minX) ? (minX + maxX) * 0.5 : 0,
            cy: isFinite(minPy) ? (minPy + maxPy) * 0.5 : 0
        }
    };
}

// ==========================================
// UNIVERSAL MULTI-OBJECT 3MF GENERATOR (BAMBU STUDIO + ORCASLICER + PRUSASLICER!)
// ==========================================

/**
 * Supports either:
 *  - Flat parts array [{ name, color, verts, tris }] -> single assembly object on plate
 *  - Array of independent assemblies [{ name, tx, ty, parts: [...] }] -> movable independent objects on plate!
 */
function createUniversal3MFZip(assembliesInput, title) {
    let assemblies = [];
    if (Array.isArray(assembliesInput) && assembliesInput.length > 0) {
        if (assembliesInput[0].parts) {
            assemblies = assembliesInput;
        } else {
            assemblies = [{ name: title || 'StudiosPro_Coaster', tx: 0, ty: 0, parts: assembliesInput }];
        }
    }

    const cleanAssemblies = assemblies.map(a => ({
        name: a.name || 'Coaster',
        tx: a.tx || 0,
        ty: a.ty || 0,
        parts: (a.parts || []).filter(p => p.verts && p.verts.length > 0 && p.tris && p.tris.length > 0)
    })).filter(a => a.parts.length > 0);

    if (cleanAssemblies.length === 0) return null;

    const zip = new JSZip();
    const thumbB64 = captureThumbnailBase64();

    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="config" ContentType="text/plain"/>
</Types>`);

    zip.folder('_rels').file('.rels', `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
  ${thumbB64 ? '<Relationship Target="/Metadata/plate_1.png" Id="rel-2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/thumbnail"/>' : ''}
</Relationships>`);

    const colorSlots = [];
    const normColor = (hex) => (String(hex || '#111827').startsWith('#') ? hex : '#' + hex).toUpperCase().slice(0, 7);
    cleanAssemblies.forEach(a => a.parts.forEach(part => {
        const nc = normColor(part.color);
        if (!colorSlots.includes(nc)) colorSlots.push(nc);
    }));

    const xb = new XmlChunkBuilder();
    xb.push(`<?xml version="1.0" encoding="UTF-8"?>\n`);
    xb.push(`<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02">\n`);
    xb.push(`  <metadata name="Title">${escapeXml(title || 'Studios-Pro 3D Coaster')}</metadata>\n`);
    xb.push(`  <metadata name="Application">Studios-Pro 3D QR Coaster Studio V2</metadata>\n`);
    xb.push(`  <resources>\n`);
    xb.push(`    <basematerials id="1">\n`);
    colorSlots.forEach((hex6, idx) => {
        xb.push(`      <base name="Slot_${idx + 1}_${hex6}" displaycolor="${hex6}FF"/>\n`);
    });
    xb.push(`    </basematerials>\n`);

    let nextId = 10;
    const bambuObjectsXml = [];
    const bambuInstancesXml = [];
    const prusaObjectsXml = [];
    const buildItemsXml = [];

    cleanAssemblies.forEach((asm) => {
        const asmId = nextId++;
        const compLines = [];
        const bambuParts = [];
        const prusaVolumes = [];

        asm.parts.forEach((part) => {
            const meshId = nextId++;
            const nc = normColor(part.color);
            const slotIdx = colorSlots.indexOf(nc);
            const extruderNum = slotIdx + 1;

            compLines.push(`      <component objectid="${meshId}" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>`);
            bambuParts.push(`    <part id="${meshId}" subtype="normal_part">\n      <metadata key="name" value="${escapeXml(part.name)}"/>\n      <metadata key="extruder" value="${extruderNum}"/>\n      <metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/>\n    </part>`);
            prusaVolumes.push(`    <volume firstid="0" lastid="${Math.max(0, part.tris.length - 1)}">\n      <metadata type="volume" key="name" value="${escapeXml(part.name)}"/>\n      <metadata type="volume" key="extruder" value="${extruderNum}"/>\n    </volume>`);

            xb.push(`    <object id="${meshId}" pid="1" pindex="${slotIdx}" name="${escapeXml(part.name)}" type="model">\n`);
            xb.push(`      <mesh>\n        <vertices>\n`);
            for (let i = 0; i < part.verts.length; i++) {
                const v = part.verts[i];
                xb.push(`          <vertex x="${v[0].toFixed(4)}" y="${v[1].toFixed(4)}" z="${v[2].toFixed(4)}"/>\n`);
            }
            xb.push(`        </vertices>\n        <triangles>\n`);
            for (let i = 0; i < part.tris.length; i++) {
                const t = part.tris[i];
                xb.push(`          <triangle v1="${t[0]}" v2="${t[1]}" v3="${t[2]}" pid="1" p1="${slotIdx}"/>\n`);
            }
            xb.push(`        </triangles>\n      </mesh>\n    </object>\n`);
        });

        xb.push(`    <object id="${asmId}" type="model" name="${escapeXml(asm.name)}">\n      <components>\n${compLines.join('\n')}\n      </components>\n    </object>\n`);
        // 3MF build transform (row-major 4x3): 1 0 0  0 1 0  0 0 1  tx ty tz
        const tx = (asm.tx || 0).toFixed(3);
        const ty = (asm.ty || 0).toFixed(3);
        buildItemsXml.push(`    <item objectid="${asmId}" transform="1 0 0 0 1 0 0 0 1 ${tx} ${ty} 0" printable="1"/>`);

        bambuObjectsXml.push(`  <object id="${asmId}">\n    <metadata key="name" value="${escapeXml(asm.name)}"/>\n    <metadata key="extruder" value="1"/>\n${bambuParts.join('\n')}\n  </object>`);
        bambuInstancesXml.push(`    <model_instance>\n      <metadata key="object_id" value="${asmId}"/>\n      <metadata key="instance_id" value="0"/>\n    </model_instance>`);
        prusaObjectsXml.push(`  <object id="${asmId}" instances_count="1">\n    <metadata type="object" key="name" value="${escapeXml(asm.name)}"/>\n    <metadata type="object" key="extruder" value="1"/>\n${prusaVolumes.join('\n')}\n  </object>`);
    });

    xb.push(`  </resources>\n  <build>\n${buildItemsXml.join('\n')}\n  </build>\n</model>\n`);
    zip.folder('3D').file('3dmodel.model', xb.toString());

    const meta = zip.folder('Metadata');
    // 1. Bambu Studio & OrcaSlicer object/extruder config
    meta.file('model_settings.config', `<?xml version="1.0" encoding="UTF-8"?>
<config>
${bambuObjectsXml.join('\n')}
  <plate>
    <metadata key="plater_id" value="1"/>
${bambuInstancesXml.join('\n')}
  </plate>
</config>`);

    // 2. Bambu Studio & OrcaSlicer filament palette config
    meta.file('project_settings.config', JSON.stringify({
        filament_colour: colorSlots,
        filament_type: colorSlots.map(() => 'PLA'),
        filament_vendor: colorSlots.map(() => 'Generic'),
        printer_model: 'Bambu Lab X1 Carbon'
    }, null, 2));

    // 3. PrusaSlicer / SuperSlicer native extruder mapping!
    meta.file('Slic3r_PE_model.config', `<?xml version="1.0" encoding="UTF-8"?>
<config>
${prusaObjectsXml.join('\n')}
</config>`);

    if (thumbB64) {
        meta.file('plate_1.png', thumbB64, { base64: true });
    }
    return zip;
}

function createBinarySTL(part) {
    const triCount = (part && part.tris) ? part.tris.length : 0;
    const buffer = new ArrayBuffer(84 + triCount * 50);
    const view = new DataView(buffer);
    const hdr = 'Studios-Pro 3D Coaster Binary STL V2';
    for (let i = 0; i < Math.min(80, hdr.length); i++) view.setUint8(i, hdr.charCodeAt(i));
    view.setUint32(80, triCount, true);

    let offset = 84;
    for (let i = 0; i < triCount; i++) {
        const t = part.tris[i];
        const a = part.verts[t[0]], b = part.verts[t[1]], c = part.verts[t[2]];
        const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
        const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        const len = Math.hypot(nx, ny, nz);
        if (len > 1e-10) { nx /= len; ny /= len; nz /= len; } else { nx = 0; ny = 0; nz = 1; }

        view.setFloat32(offset, nx, true);
        view.setFloat32(offset + 4, ny, true);
        view.setFloat32(offset + 8, nz, true);
        view.setFloat32(offset + 12, a[0], true); view.setFloat32(offset + 16, a[1], true); view.setFloat32(offset + 20, a[2], true);
        view.setFloat32(offset + 24, b[0], true); view.setFloat32(offset + 28, b[1], true); view.setFloat32(offset + 32, b[2], true);
        view.setFloat32(offset + 36, c[0], true); view.setFloat32(offset + 40, c[1], true); view.setFloat32(offset + 44, c[2], true);
        view.setUint16(offset + 48, 0, true);
        offset += 50;
    }
    return new Blob([buffer], { type: 'application/octet-stream' });
}

// ==========================================
// 256x256 BUILD PLATE SHELF AUTO-PACKER
// ==========================================

function packItemsIntoBuildPlates(items, plateW = 244, plateH = 244, gap = 8) {
    const plates = [];
    let currentPlate = [];
    let curX = 0, curY = 0, rowH = 0;

    for (const item of items) {
        const w = item.width;
        const h = item.height;

        if (curX > 0 && curX + w > plateW) {
            curX = 0;
            curY += rowH + gap;
            rowH = 0;
        }
        if (curY > 0 && curY + h > plateH) {
            plates.push(currentPlate);
            currentPlate = [];
            curX = 0;
            curY = 0;
            rowH = 0;
        }

        currentPlate.push({
            ...item,
            placeX: curX + w * 0.5,
            placeY: curY + h * 0.5
        });
        curX += w + gap;
        if (h > rowH) rowH = h;
    }
    if (currentPlate.length > 0) plates.push(currentPlate);

    // Center each plate around (128, 128) (standard Bambu/Prusa 256x256 plate center)
    return plates.map(plate => {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        plate.forEach(it => {
            minX = Math.min(minX, it.placeX - it.width * 0.5);
            maxX = Math.max(maxX, it.placeX + it.width * 0.5);
            minY = Math.min(minY, it.placeY - it.height * 0.5);
            maxY = Math.max(maxY, it.placeY + it.height * 0.5);
        });
        const cx = (minX + maxX) * 0.5;
        const cy = (minY + maxY) * 0.5;
        return plate.map(it => ({
            ...it,
            tx: 128 + (it.placeX - cx) - (it.cx || 0),
            ty: 128 + (it.placeY - cy) - (it.cy || 0)
        }));
    });
}

// ==========================================
// EXPORT MODAL & AR PREVIEW (FIXED INSTANCES + NO PREVIEW HELPERS!)
// ==========================================

function openExportModal() {
    if (typeof closeAllModals === 'function') closeAllModals();
    const setSlot = (dotId, hexId, col) => {
        const d = document.getElementById(dotId);
        const h = document.getElementById(hexId);
        if (d) d.style.backgroundColor = col;
        if (h) h.innerText = col.toUpperCase();
    };
    setSlot('ams-slot-1-dot', 'ams-slot-1-hex', baseColorHex);
    setSlot('ams-slot-2-dot', 'ams-slot-2-hex', qrColorHex);
    setSlot('ams-slot-3-dot', 'ams-slot-3-hex', accentColorHex);
    setSlot('ams-slot-4-dot', 'ams-slot-4-hex', quietZoneColorHex);

    const slot4Wrap = document.getElementById('ams-slot-4-wrap');
    if (slot4Wrap) slot4Wrap.style.display = useWhiteQuietZone ? 'inline-block' : 'none';

    const modal = document.getElementById('export-modal');
    if (modal) {
        modal.style.display = 'flex';
        refreshIcons();
    }
}

function closeExportModal() {
    const modal = document.getElementById('export-modal');
    if (modal) modal.style.display = 'none';
}

/**
 * FIX BUG #7: Bakes InstancedMesh & strips userData.isPreviewOnly helpers BEFORE
 * calling the frozen window.StudiosProAR bridge!
 */
function openARPreview() {
    if (!window.StudiosProAR) {
        showToast('AR Viewer bridge unavailable');
        return;
    }

    const arGroup = new THREE.Group();
    const bakeCleanGroup = (srcGrp) => {
        if (!srcGrp) return;
        srcGrp.updateMatrixWorld(true);
        srcGrp.traverse(child => {
            if (child.userData && child.userData.isPreviewOnly) return;
            if (child.isInstancedMesh && child.geometry) {
                const geoms = [];
                const instMat = new THREE.Matrix4();
                const comb = new THREE.Matrix4();
                for (let i = 0; i < child.count; i++) {
                    child.getMatrixAt(i, instMat);
                    comb.multiplyMatrices(child.matrixWorld, instMat);
                    const g = child.geometry.clone();
                    g.applyMatrix4(comb);
                    geoms.push(g);
                }
                const merged = mergeSimpleBufferGeometries(geoms);
                geoms.forEach(g => g.dispose());
                if (merged) {
                    const mat = child.material ? child.material.clone() : new THREE.MeshStandardMaterial({ color: 0xffffff });
                    mat.clippingPlanes = [];
                    arGroup.add(new THREE.Mesh(merged, mat));
                }
            } else if (child.isMesh && child.geometry) {
                const g = child.geometry.clone();
                g.applyMatrix4(child.matrixWorld);
                const mat = child.material ? child.material.clone() : new THREE.MeshStandardMaterial({ color: 0xffffff });
                mat.clippingPlanes = [];
                arGroup.add(new THREE.Mesh(g, mat));
            }
        });
    };

    [baseMeshGroup, quietZoneMeshGroup, qrMeshGroup, textMeshGroup, badgeMeshGroup].forEach(bakeCleanGroup);
    if (arGroup.children.length === 0) {
        showToast('Generate a coaster first.');
        return;
    }

    window.StudiosProAR.exportSceneAndOpenAR(arGroup, {
        name: 'QR_WiFi_Coaster',
        placement: 'floor',
        unit: 'mm',
        sourceStudio: 'qr-wifi-coaster-generator'
    });
}

// ==========================================
// 1. UNIVERSAL 3MF EXPORT
// ==========================================

async function export3MF() {
    closeExportModal();
    showToast(currentLang === 'fr' ? 'Génération du fichier 3MF universel...' : 'Generating Universal Multi-Color 3MF...');
    const { parts } = getExportParts();
    const zip = createUniversal3MFZip(parts, 'StudiosPro_Coaster');
    if (!zip) {
        showToast('No 3D geometry found to export');
        return;
    }
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    const fname = isFaceDownMode ? 'StudiosPro_FaceDown_PEI_Coaster.3mf' : `StudiosPro_${currentShape}_Coaster.3mf`;
    downloadBlob(blob, fname);
    showToast(t('toastExport3MF'));
    setTimeout(() => { if (typeof openShareDesignModal === 'function') openShareDesignModal(true); }, 650);
}

// ==========================================
// 2. SEPARATE BINARY STLS + UNIFIED ACCURATE README
// ==========================================

async function exportSeparateSTLs() {
    closeExportModal();
    showToast(currentLang === 'fr' ? 'Génération des fichiers STL binaires...' : 'Generating Binary STLs archive...');
    const { basePart, quietPart, qrPart, textPart } = getExportParts();
    const zip = new JSZip();

    if (basePart.verts.length > 0 && basePart.tris.length > 0) zip.file('1_Coaster_Base.stl', createBinarySTL(basePart));
    if (quietPart.verts.length > 0 && quietPart.tris.length > 0) zip.file('2_Quiet_Zone_Plate.stl', createBinarySTL(quietPart));
    if (qrPart.verts.length > 0 && qrPart.tris.length > 0) zip.file('3_QR_Code.stl', createBinarySTL(qrPart));
    if (textPart.verts.length > 0 && textPart.tris.length > 0) zip.file('4_Text_and_Badge.stl', createBinarySTL(textPart));

    const m = lastModelMetrics || {};
    const carved = m.carved || {};
    const lines = [
        'Studios-Pro 3D Coaster — Binary STL & Print Guide',
        '=================================================',
        `Dimensions: ${(m.widthMm || 100).toFixed(1)} x ${(m.depthMm || 100).toFixed(1)} x ${(m.heightMm || 3.2).toFixed(1)} mm`,
        `Estimated Filament: ~${(m.gramsTotal || 0).toFixed(1)} g PLA (~${m.estMinutes || 20} min)`,
        `Print Style: ${isFaceDownMode ? 'FACE-DOWN PEI MIRROR (Z=0..0.6mm)' : printStyle.toUpperCase()}`,
        `White Quiet Zone: ${useWhiteQuietZone ? 'YES (2_Quiet_Zone_Plate.stl)' : 'NO'}`,
        `Color / Pause Guide: ${m.swapInfo || ''}`,
        ''
    ];
    if (carved.nfcSealed) {
        const pauseL = Math.round(carved.nfcPauseZ / 0.2);
        lines.push(`SEALED INTERNAL NFC CAVITY (Ø25.4mm):`);
        lines.push(`-> Add an M600 / Pause at Z = ${carved.nfcPauseZ.toFixed(2)} mm (Layer ${pauseL} @ 0.20mm) to insert your NTAG215 tag before the roof seals it!`);
        lines.push('');
    }
    if (printStyle === 'debossed') {
        lines.push(`DEBOSSED CARVED CAVITY NOTE:`);
        lines.push(`1_Coaster_Base.stl contains real 2D-vector carved pockets for QR, text & center logo — ready for resin pour or paint fill.`);
    }
    zip.file('README_PRINT_INSTRUCTIONS.txt', lines.join('\n'));

    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    downloadBlob(blob, 'StudiosPro_Coaster_Separate_STLs.zip');
    showToast(t('toastExportSTL'));
    setTimeout(() => { if (typeof openShareDesignModal === 'function') openShareDesignModal(true); }, 650);
}

// ==========================================
// 3. FIXED SHAPE-MATCHED CADDY + COASTERS (256x256 INDEPENDENT OBJECTS!)
// ==========================================

async function exportCaddyFullSet3MF() {
    closeExportModal();
    showToast(currentLang === 'fr' ? 'Assemblage Pack Support + Sous-Verres (256×256)...' : 'Assembling Shape-Matched Caddy + Coasters (256×256)...');

    const prevShape = currentShape;
    try {
        const coasterShape = ['caddy', 'stand', 'tent'].includes(prevShape) ? lastCoasterShape : prevShape;
        const count = Math.max(2, Math.min(8, parseInt(document.getElementById('slider-caddy-slots')?.value || 4, 10)));

        // 1. Build Coaster (respects Face-Down PEI mode!)
        currentShape = coasterShape;
        rebuild3DModel();
        const coasterExp = getExportParts(false);

        // 2. Build Shape-Matched Caddy Rack (always upright!)
        currentShape = 'caddy';
        rebuild3DModel();
        const caddyExp = getExportParts(true);

        const packList = [
            {
                name: 'Caddy_Holder_Rack',
                parts: caddyExp.parts,
                width: caddyExp.footprint.width,
                height: caddyExp.footprint.height,
                cx: caddyExp.footprint.cx,
                cy: caddyExp.footprint.cy
            }
        ];
        for (let i = 1; i <= count; i++) {
            packList.push({
                name: `Coaster_${i}`,
                parts: coasterExp.parts,
                width: coasterExp.footprint.width,
                height: coasterExp.footprint.height,
                cx: coasterExp.footprint.cx,
                cy: coasterExp.footprint.cy
            });
        }

        const plates = packItemsIntoBuildPlates(packList, 244, 244, 8);

        if (plates.length === 1) {
            const zip3mf = createUniversal3MFZip(plates[0], `StudiosPro_Caddy_Plus_${count}_Coasters`);
            if (zip3mf) {
                const blob = await zip3mf.generateAsync({ type: 'blob', compression: 'DEFLATE' });
                downloadBlob(blob, `StudiosPro_Caddy_Plus_${count}_Coasters.3mf`);
            }
        } else {
            const masterZip = new JSZip();
            for (let pIdx = 0; pIdx < plates.length; pIdx++) {
                const plate3mf = createUniversal3MFZip(plates[pIdx], `StudiosPro_Set_Plate_${pIdx + 1}`);
                if (plate3mf) {
                    const pBlob = await plate3mf.generateAsync({ type: 'blob', compression: 'DEFLATE' });
                    masterZip.file(`Plate_${pIdx + 1}_of_${plates.length}.3mf`, pBlob);
                }
            }
            masterZip.file('README_PLATES.txt', `Studios-Pro Shape-Matched Caddy + ${count} Coasters\nAuto-packed cleanly into ${plates.length} build plates (<= 244x244 mm for 256x256 Bambu/Prusa beds).\nEvery item is an independent object you can move or arrange freely in your slicer.`);
            const masterBlob = await masterZip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
            downloadBlob(masterBlob, `StudiosPro_Caddy_Set_${plates.length}_Plates.zip`);
        }

        showToast(currentLang === 'fr'
            ? `Pack Support + ${count} Sous-Verres (${plates.length} plateau(x) 256×256) téléchargé !`
            : `Caddy + ${count} Coasters (${plates.length} × 256×256 plate(s)) downloaded!`);
    } finally {
        currentShape = prevShape;
        rebuild3DModel();
    }
}

// ==========================================
// 4. NEW: 6-MINUTE MINI CALIBRATION TEST SWATCH (.3MF + .STL ZIP)
// ==========================================

async function exportCalibrationSwatch() {
    closeExportModal();
    showToast(currentLang === 'fr' ? 'Génération de l’échantillon de calibration (6 min)...' : 'Generating 6-Min Calibration Test Swatch...');

    const size = parseFloat(document.getElementById('slider-size')?.value || 100);
    const effSize = currentShape === 'keychain' ? size * 0.6 : size;
    const M = currentQRMatrix.length || 25;
    const exactPixelMm = (effSize * 0.56) / M;

    // Build a compact Version-1 (21x21) real scannable QR ("OK") at the EXACT pixel pitch (mm/px)!
    const testBuilt = safeGenerateMatrix('TEST OK', 'M', 'none', 1.0);
    const testM = testBuilt.matrix.length;
    const testQrArea = testM * exactPixelMm;
    const swatchSize = Math.max(30, Math.min(54, Math.ceil(testQrArea + 10)));
    const swatchThick = 2.0;
    const swatchInlay = isFaceDownMode ? 0.6 : Math.min(1.0, parseFloat(document.getElementById('slider-relief-height')?.value || 0.8));
    const effMode = isFaceDownMode ? 'flush' : printStyle;

    const swBase = new THREE.Group();
    const swQuiet = new THREE.Group();
    const swQr = new THREE.Group();
    const swText = new THREE.Group();
    const swBadge = new THREE.Group();

    const mB = new THREE.MeshStandardMaterial({ color: baseColorHex });
    const mQ = new THREE.MeshStandardMaterial({ color: quietZoneColorHex });
    const mQR = new THREE.MeshStandardMaterial({ color: qrColorHex });
    const mA = new THREE.MeshStandardMaterial({ color: accentColorHex });

    const coreH = effMode === 'embossed' ? swatchThick : Math.max(0.6, swatchThick - swatchInlay);
    const slabRes = buildSolidSlabGeometry('squircle', swatchSize, coreH, false, false, null);
    swBase.add(new THREE.Mesh(slabRes.geom, mB));

    buildFaceAssembly({
        sideState: {
            qrMatrix: testBuilt.matrix,
            topText: `${exactPixelMm.toFixed(2)}MM`,
            bottomText: 'TEST',
            badge: 'none',
            badgeScale: 1.0,
            textSize: 3.4,
            topOffset: (swatchSize * 0.5 - 2.6) * (100 / swatchSize),
            bottomOffset: (swatchSize * 0.5 - 2.6) * (100 / swatchSize)
        },
        shapeType: 'squircle',
        effectiveSize: swatchSize,
        qrAreaSize: testQrArea,
        baseThick: swatchThick,
        reliefH: swatchInlay,
        styleMode: effMode,
        inlayDepth: swatchInlay,
        invertShield: false,
        hasDripLip: false,
        baseMat: mB,
        quietMat: mQ,
        qrMat: mQR,
        accentMat: mA,
        targetBaseGroup: swBase,
        targetQuietGroup: swQuiet,
        targetQrGroup: swQr,
        targetTextGroup: swText,
        targetBadgeGroup: swBadge,
        isBottomFace: false
    });

    const rawB = extractMeshTriangles(swBase);
    const rawQ = extractMeshTriangles(swQuiet);
    const rawQR = extractMeshTriangles(swQr);
    const rawT = extractMeshTriangles(swText);

    let maxY = 0, minY = 0;
    [rawB, rawQ, rawQR, rawT].forEach(p => p.verts.forEach(v => { if (v[1] > maxY) maxY = v[1]; if (v[1] < minY) minY = v[1]; }));

    const pBase = weldAndTransformMesh(rawB.verts, rawB.tris, -minY, isFaceDownMode, maxY);
    const pQuiet = weldAndTransformMesh(rawQ.verts, rawQ.tris, -minY, isFaceDownMode, maxY);
    const pQr = weldAndTransformMesh(rawQR.verts, rawQR.tris, -minY, isFaceDownMode, maxY);
    const pTxt = weldAndTransformMesh(rawT.verts, rawT.tris, -minY, isFaceDownMode, maxY);

    const parts = [{ name: `1_Base_${baseColorHex}`, color: baseColorHex, verts: pBase.verts, tris: pBase.tris }];
    if (pQuiet.verts.length) parts.push({ name: `2_QuietZone_${quietZoneColorHex}`, color: quietZoneColorHex, verts: pQuiet.verts, tris: pQuiet.tris });
    if (pQr.verts.length) parts.push({ name: `3_QR_${qrColorHex}`, color: qrColorHex, verts: pQr.verts, tris: pQr.tris });
    if (pTxt.verts.length) parts.push({ name: `4_Text_${accentColorHex}`, color: accentColorHex, verts: pTxt.verts, tris: pTxt.tris });

    const outZip = new JSZip();
    const swatch3mf = createUniversal3MFZip(parts, `Calibration_Swatch_${exactPixelMm.toFixed(2)}mm`);
    if (swatch3mf) {
        outZip.file(`Calibration_Swatch_${exactPixelMm.toFixed(2)}mm.3mf`, await swatch3mf.generateAsync({ type: 'blob', compression: 'DEFLATE' }));
    }
    outZip.file('1_Swatch_Base.stl', createBinarySTL(pBase));
    if (pQr.verts.length) outZip.file('2_Swatch_QR.stl', createBinarySTL(pQr));
    outZip.file('README_CALIBRATION.txt', `6-MINUTE QR CALIBRATION SWATCH\nSize: ${swatchSize} x ${swatchSize} x ${swatchThick} mm\nExact QR Pixel Pitch: ${exactPixelMm.toFixed(3)} mm/module\nStyle: ${isFaceDownMode ? 'FACE-DOWN PEI' : printStyle.toUpperCase()}\n\nPrint this tiny swatch (~6 min, ~2.5g PLA) and scan it with your phone to verify nozzle clarity and filament contrast before printing a full batch!`);

    [swBase, swQuiet, swQr, swText, swBadge].forEach(disposeObject3D);

    const blob = await outZip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    downloadBlob(blob, 'StudiosPro_6Min_Calibration_Swatch.zip');
    showToast(t('toastExportSwatch'));
}

// ==========================================
// 5. TRUE VECTOR MULTI-LAYER LASER EXPORT (.DXF + .SVG, UPRIGHT SHIELD, KEYCHAIN LUG, CURVED TEXT, BADGE & DUAL-SIDED!)
// ==========================================

function ringToSvgSubpath(pts, ox = 0, oy = 0) {
    if (!pts || pts.length < 3) return '';
    let d = `M ${(pts[0].x + ox).toFixed(2)} ${(pts[0].y + oy).toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) {
        d += ` L ${(pts[i].x + ox).toFixed(2)} ${(pts[i].y + oy).toFixed(2)}`;
    }
    return d + ' Z';
}

function vectorShapesToSvgPathD(shapes, ox = 0, oy = 0) {
    const segs = [];
    for (const s of (shapes || [])) {
        if (!s.outer || s.outer.length < 3) continue;
        segs.push(ringToSvgSubpath(s.outer, ox, oy));
        for (const h of (s.holes || [])) {
            if (h && h.length >= 3) segs.push(ringToSvgSubpath(h, ox, oy));
        }
    }
    return segs.join(' ');
}

function appendDxfPolyline(dxfLines, pts, layer, ox = 0, oy = 0) {
    if (!pts || pts.length < 3) return;
    dxfLines.push('0', 'POLYLINE', '8', layer, '66', '1', '70', '1');
    for (const p of pts) {
        // Consistent Y-flip: Coaster 2D space has -Y = TOP, DXF has +Y = TOP -> negate y!
        dxfLines.push('0', 'VERTEX', '8', layer, '10', (p.x + ox).toFixed(3), '20', (-(p.y + oy)).toFixed(3), '30', '0.000');
    }
    dxfLines.push('0', 'SEQEND');
}

function buildDxfHeaderLines() {
    return [
        '0', 'SECTION', '2', 'HEADER',
        '9', '$ACADVER', '1', 'AC1009',
        '9', '$INSUNITS', '70', '4',      // 4 = Millimeters
        '9', '$MEASUREMENT', '70', '1',   // 1 = Metric
        '0', 'ENDSEC',
        '0', 'SECTION', '2', 'ENTITIES'
    ];
}

function appendFaceLayoutToLaser(layout, dxfLines, svgParts, ox = 0, oy = 0) {
    if (!layout) return;
    const { shapeType, effectiveSize, invertShield, qrShapes, textShapes, badgeShapes } = layout;

    // 1. Outer Cut Contour (includes full keychain lug + upright shield!)
    if (shapeType === 'circle') {
        dxfLines.push('0', 'CIRCLE', '8', '0_CUT', '10', ox.toFixed(3), '20', (-oy).toFixed(3), '30', '0.000', '40', (effectiveSize / 2).toFixed(3));
        svgParts.push(`  <circle cx="${ox.toFixed(2)}" cy="${oy.toFixed(2)}" r="${(effectiveSize / 2).toFixed(2)}" fill="none" stroke="#ff0000" stroke-width="0.25"/>`);
    } else {
        const outerPts = getOuterContourPoints2D(shapeType, effectiveSize, invertShield, 0);
        appendDxfPolyline(dxfLines, outerPts, '0_CUT', ox, oy);
        svgParts.push(`  <path d="${ringToSvgSubpath(outerPts, ox, oy)}" fill="none" stroke="#ff0000" stroke-width="0.25"/>`);

        if (shapeType === 'keychain') {
            const kh = createKeychainShapeWithHole(effectiveSize, 0);
            dxfLines.push('0', 'CIRCLE', '8', '0_CUT_HOLE', '10', ox.toFixed(3), '20', (-(kh.holeCenterY + oy)).toFixed(3), '30', '0.000', '40', kh.holeRadius.toFixed(3));
            svgParts.push(`  <circle cx="${ox.toFixed(2)}" cy="${(kh.holeCenterY + oy).toFixed(2)}" r="${kh.holeRadius.toFixed(2)}" fill="none" stroke="#ff0000" stroke-width="0.25"/>`);
        }
    }

    // 2. QR Modules & Finder Eyes (Exact vectors: Square, Dots, Connected, Rounded/Circle Finders!)
    for (const s of (qrShapes || [])) {
        appendDxfPolyline(dxfLines, s.outer, '1_ENGRAVE_QR', ox, oy);
        for (const h of (s.holes || [])) appendDxfPolyline(dxfLines, h, '1_ENGRAVE_QR', ox, oy);
    }
    const qrD = vectorShapesToSvgPathD(qrShapes, ox, oy);
    if (qrD) svgParts.push(`  <path d="${qrD}" fill="#000000" fill-rule="evenodd"/>`);

    // 3. True Vector Text (Straight OR Curved Arc!)
    for (const s of (textShapes || [])) {
        appendDxfPolyline(dxfLines, s.outer, '2_ENGRAVE_TEXT', ox, oy);
        for (const h of (s.holes || [])) appendDxfPolyline(dxfLines, h, '2_ENGRAVE_TEXT', ox, oy);
    }
    const txtD = vectorShapesToSvgPathD(textShapes, ox, oy);
    if (txtD) svgParts.push(`  <path d="${txtD}" fill="#0000ff" fill-rule="evenodd"/>`);

    // 4. Center Vector Badge Icon (Built-in OR Custom Logo!)
    for (const s of (badgeShapes || [])) {
        appendDxfPolyline(dxfLines, s.outer, '3_ENGRAVE_BADGE', ox, oy);
        for (const h of (s.holes || [])) appendDxfPolyline(dxfLines, h, '3_ENGRAVE_BADGE', ox, oy);
    }
    const bdgD = vectorShapesToSvgPathD(badgeShapes, ox, oy);
    if (bdgD) svgParts.push(`  <path d="${bdgD}" fill="#0000ff" fill-rule="evenodd"/>`);
}

function buildSingleFaceLaserFiles(layout) {
    const pad = 8;
    const extraTop = layout.shapeType === 'keychain' ? layout.effectiveSize * 0.25 : 0;
    const vbW = layout.effectiveSize + pad * 2;
    const vbH = layout.effectiveSize + extraTop + pad * 2;
    const minX = -vbW / 2;
    const minY = -(layout.effectiveSize / 2 + extraTop + pad);

    const dxfLines = buildDxfHeaderLines();
    const svgParts = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${vbW.toFixed(1)}mm" height="${vbH.toFixed(1)}mm" viewBox="${minX.toFixed(2)} ${minY.toFixed(2)} ${vbW.toFixed(2)} ${vbH.toFixed(2)}">`
    ];
    appendFaceLayoutToLaser(layout, dxfLines, svgParts, 0, 0);
    dxfLines.push('0', 'ENDSEC', '0', 'EOF', '');
    svgParts.push('</svg>');

    return { dxf: dxfLines.join('\n'), svg: svgParts.join('\n') };
}

async function exportLaserBlueprint() {
    closeExportModal();
    if (!lastFaceLayouts.A) {
        const prev = currentShape;
        if (currentShape === 'caddy') { currentShape = lastCoasterShape; rebuild3DModel(); }
        if (!lastFaceLayouts.A) { showToast('Switch to a coaster shape first.'); return; }
        currentShape = prev;
    }

    const zip = new JSZip();
    const sideAFiles = buildSingleFaceLaserFiles(lastFaceLayouts.A);
    zip.file(lastFaceLayouts.B ? 'StudiosPro_Coaster_SideA.dxf' : 'StudiosPro_Coaster_Laser.dxf', sideAFiles.dxf);
    zip.file(lastFaceLayouts.B ? 'StudiosPro_Coaster_SideA.svg' : 'StudiosPro_Coaster_Laser.svg', sideAFiles.svg);

    if (lastFaceLayouts.B) {
        const sideBFiles = buildSingleFaceLaserFiles(lastFaceLayouts.B);
        zip.file('StudiosPro_Coaster_SideB.dxf', sideBFiles.dxf);
        zip.file('StudiosPro_Coaster_SideB.svg', sideBFiles.svg);
    }

    zip.file('README_LASER.txt', [
        'Studios-Pro Multi-Layer Laser CAD Pack (1:1 Millimeter True Scale)',
        '==================================================================',
        '- Layer 0_CUT / Red (#ff0000): Outer Contour Cut + Keychain Lug',
        '- Layer 0_CUT_HOLE / Red (#ff0000): Keychain Hole',
        '- Layer 1_ENGRAVE_QR / Black (#000000): Vector QR Code & Finder Eyes',
        '- Layer 2_ENGRAVE_TEXT / Blue (#0000ff): Vector Typography (Straight & Curved)',
        '- Layer 3_ENGRAVE_BADGE / Blue (#0000ff): Vector Center Brand Shield / Logo',
        'DXF includes $INSUNITS=4 (mm) for zero-scale-error import in LightBurn, AutoCAD, Fusion 360 & RDWorks.'
    ].join('\n'));

    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    downloadBlob(zipBlob, 'StudiosPro_Coaster_Laser_Pack.zip');
    showToast(t('toastExportLaser'));
}

// ==========================================
// 6. BATCH GENERATOR PRO (RANGE + CSV + 3MF / 256x256 PLATES / STL / NESTED LASER SHEET!)
// ==========================================

let batchMode = 'range'; // 'range' | 'csv'

function openBatchModal() {
    if (typeof closeAllModals === 'function') closeAllModals();
    const modal = document.getElementById('batch-tables-modal');
    if (modal) {
        modal.style.display = 'flex';
        updateBatchPreview();
        refreshIcons();
    }
}

function closeBatchModal() {
    const modal = document.getElementById('batch-tables-modal');
    if (modal) modal.style.display = 'none';
}

function setBatchMode(mode) {
    batchMode = (mode === 'csv') ? 'csv' : 'range';
    document.getElementById('batch-tab-range')?.classList.toggle('active', batchMode === 'range');
    document.getElementById('batch-tab-csv')?.classList.toggle('active', batchMode === 'csv');
    const rangeWrap = document.getElementById('batch-range-fields');
    const csvWrap = document.getElementById('batch-csv-fields');
    if (rangeWrap) rangeWrap.style.display = (batchMode === 'range') ? 'block' : 'none';
    if (csvWrap) csvWrap.style.display = (batchMode === 'csv') ? 'block' : 'none';
    updateBatchPreview();
}

function handleBatchCsvUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        const ta = document.getElementById('batch-csv-textarea');
        if (ta) {
            ta.value = String(evt.target.result || '').trim();
            updateBatchPreview();
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

function parseCsvLine(line) {
    const cols = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
            else inQ = !inQ;
        } else if ((ch === ',' || ch === ';') && !inQ) {
            cols.push(cur.trim());
            cur = '';
        } else {
            cur += ch;
        }
    }
    cols.push(cur.trim());
    return cols;
}

function getBatchItemsList() {
    if (batchMode === 'csv') {
        const raw = (document.getElementById('batch-csv-textarea')?.value || '').trim();
        const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const items = [];
        for (let i = 0; i < lines.length; i++) {
            const cols = parseCsvLine(lines[i]);
            if (cols.length < 2) continue;
            // Skip header row if detected
            if (i === 0 && /url|link/i.test(cols[1]) && !/^https?:|^WIFI:/i.test(cols[1])) continue;
            const name = cols[0] || `Item_${i + 1}`;
            const url = cols[1] || 'https://studios-pro.com';
            const header = cols[2] !== undefined && cols[2] !== '' ? cols[2] : 'SCAN HERE';
            const footer = cols[3] !== undefined && cols[3] !== '' ? cols[3] : name.toUpperCase();
            items.push({ index: items.length + 1, label: name, url, header, footer });
            if (items.length >= 100) break;
        }
        return items;
    }

    const start = Math.max(1, parseInt(document.getElementById('batch-start-num')?.value || 1, 10));
    const endRaw = parseInt(document.getElementById('batch-end-num')?.value || 20, 10);
    const end = Math.min(start + 99, Math.max(start, endRaw));
    const prefix = document.getElementById('batch-table-prefix')?.value || 'Table_{pad}';
    const urlTpl = document.getElementById('batch-url-template')?.value || 'https://mybistro.com/order?table={n}';
    const headerTpl = document.getElementById('batch-header-template')?.value || 'SCAN TO ORDER';
    const footerTpl = document.getElementById('batch-footer-template')?.value || 'TABLE {n}';

    const items = [];
    for (let i = start; i <= end; i++) {
        const padStr = i < 10 ? '0' + i : '' + i;
        const sub = (tpl) => String(tpl).replace(/\{n\}/g, i).replace(/\{pad\}/g, padStr);
        items.push({
            index: i,
            label: sub(prefix),
            url: sub(urlTpl),
            header: sub(headerTpl),
            footer: sub(footerTpl)
        });
    }
    return items;
}

function updateBatchPreview() {
    const items = getBatchItemsList();
    const total = items.length;
    const countEl = document.getElementById('batch-total-count');
    if (countEl) {
        countEl.innerText = currentLang === 'fr' ? `${total} Pièce(s)` : `${total} Item(s)`;
    }

    const slider = document.getElementById('batch-preview-slider');
    if (slider) {
        slider.min = 1;
        slider.max = Math.max(1, total);
        if (parseInt(slider.value, 10) > total || parseInt(slider.value, 10) < 1) slider.value = 1;
        onBatchSliderChange(slider.value, false);
    }

    const minLbl = document.getElementById('batch-min-slider-lbl');
    const maxLbl = document.getElementById('batch-max-slider-lbl');
    if (minLbl) minLbl.innerText = items[0] ? items[0].label : '#1';
    if (maxLbl) maxLbl.innerText = items[total - 1] ? items[total - 1].label : '#1';
}

function onBatchSliderChange(val, triggerLive3D = true) {
    const items = getBatchItemsList();
    const idx = Math.max(0, Math.min(items.length - 1, parseInt(val, 10) - 1));
    const item = items[idx];
    const lblEl = document.getElementById('batch-preview-label');
    const urlEl = document.getElementById('batch-url-sample');
    const qrThumb = document.getElementById('batch-mini-qr');
    if (!item) return;

    if (lblEl) lblEl.innerText = `${item.label} — "${item.header} / ${item.footer}"`;
    if (urlEl) urlEl.innerText = 'QR: ' + item.url;

    // Render live mini QR preview inside Batch Modal!
    if (qrThumb) {
        try {
            const built = safeGenerateMatrix(item.url, qrECCLevel, badgeType, badgeScale);
            const M = built.matrix.length;
            const sc = Math.max(2, Math.floor(68 / M));
            qrThumb.width = M * sc;
            qrThumb.height = M * sc;
            const ctx = qrThumb.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, qrThumb.width, qrThumb.height);
            ctx.fillStyle = '#000000';
            for (let r = 0; r < M; r++) {
                for (let c = 0; c < M; c++) {
                    if (built.matrix[r][c]) ctx.fillRect(c * sc, r * sc, sc, sc);
                }
            }
        } catch (_) {}
    }

    // Live 3D viewport preview when user drags the slider!
    if (triggerLive3D && typeof rebuild3DModel === 'function') {
        const backupA = { ...sideAData };
        try {
            const built = safeGenerateMatrix(item.url, qrECCLevel, badgeType, badgeScale);
            sideAData.topText = item.header;
            sideAData.bottomText = item.footer;
            sideAData.qrMatrix = built.matrix;
            rebuild3DModel(true);
        } finally {
            sideAData.topText = backupA.topText;
            sideAData.bottomText = backupA.bottomText;
            sideAData.qrMatrix = backupA.qrMatrix;
        }
    }
}

function csvCell(v) {
    return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

async function generateTableBatchZIP() {
    const items = getBatchItemsList();
    if (items.length === 0) {
        showToast(currentLang === 'fr' ? 'Aucune ligne valide à générer !' : 'No valid items to generate!');
        return;
    }

    const fmt = document.getElementById('batch-export-format')?.value || '3mf';
    const keepSideB = !!document.getElementById('chk-batch-keep-sideb')?.checked;

    const progressBar = document.getElementById('batch-progress-bar');
    const progressFill = document.getElementById('batch-progress-fill');
    const exportBtn = document.getElementById('btn-batch-export');
    if (progressBar) progressBar.style.display = 'block';
    if (exportBtn) exportBtn.disabled = true;

    // Backup full state before batch run
    syncActiveSideStateFromDOM();
    const prevShape = currentShape;
    const prevDual = isDualSided;
    const prevActiveSide = activeSide;
    const origSideA = { ...sideAData, qrMatrix: sideAData.qrMatrix.map(r => [...r]) };

    try {
        // Guard against Caddy shape (never export 20 empty caddies!)
        if (currentShape === 'caddy') currentShape = lastCoasterShape;
        if (keepSideB && !isDualSided && currentShape !== 'stand' && currentShape !== 'tent') {
            isDualSided = true;
        }
        activeSide = 'A';

        const zip = new JSZip();
        const csvLines = ['Label,QR Payload,Header,Footer,Dimensions mm,Color / Pause Guide'];
        const packedExports = [];
        const laserLayouts = [];

        for (let idx = 0; idx < items.length; idx++) {
            const item = items[idx];
            const built = safeGenerateMatrix(item.url, qrECCLevel, origSideA.badge, origSideA.badgeScale);

            sideAData.topText = item.header;
            sideAData.bottomText = item.footer;
            sideAData.qrMatrix = built.matrix;
            sideAData.rawData = built.payload;

            // Keep DOM synced with Side A during rebuild
            if (document.getElementById('input-top-text')) document.getElementById('input-top-text').value = item.header;
            if (document.getElementById('input-bottom-text')) document.getElementById('input-bottom-text').value = item.footer;
            currentQRMatrix = built.matrix;

            rebuild3DModel();

            const slug = sanitizeFileSlug(item.label);
            const m = lastModelMetrics || {};
            csvLines.push([
                csvCell(item.label),
                csvCell(item.url),
                csvCell(item.header),
                csvCell(item.footer),
                csvCell(`${(m.widthMm || 100).toFixed(1)}x${(m.depthMm || 100).toFixed(1)}x${(m.heightMm || 3.2).toFixed(1)}`),
                csvCell(m.swapInfo || '')
            ].join(','));

            if (fmt === '3mf') {
                const { parts } = getExportParts();
                const subZip = createUniversal3MFZip(parts, item.label);
                if (subZip) {
                    zip.file(`${slug}.3mf`, await subZip.generateAsync({ type: 'blob', compression: 'DEFLATE' }));
                }
            } else if (fmt === 'plates') {
                const exp = getExportParts();
                packedExports.push({
                    name: slug,
                    parts: exp.parts,
                    width: exp.footprint.width,
                    height: exp.footprint.height,
                    cx: exp.footprint.cx,
                    cy: exp.footprint.cy
                });
            } else if (fmt === 'stl') {
                const { basePart, quietPart, qrPart, textPart } = getExportParts();
                const folder = zip.folder(slug);
                if (basePart.verts.length) folder.file('1_Base.stl', createBinarySTL(basePart));
                if (quietPart.verts.length) folder.file('2_QuietZone.stl', createBinarySTL(quietPart));
                if (qrPart.verts.length) folder.file('3_QR.stl', createBinarySTL(qrPart));
                if (textPart.verts.length) folder.file('4_Text_Badge.stl', createBinarySTL(textPart));
            } else if (fmt === 'laser') {
                if (lastFaceLayouts.A) {
                    laserLayouts.push({ label: slug, layout: lastFaceLayouts.A });
                }
            }

            if (progressFill) {
                progressFill.style.width = `${Math.round(((idx + 1) / items.length) * 100)}%`;
            }
            await new Promise(r => setTimeout(r, 0));
        }

        // Post-process packed 256x256 3MF build plates
        if (fmt === 'plates' && packedExports.length > 0) {
            const plates = packItemsIntoBuildPlates(packedExports, 244, 244, 8);
            for (let p = 0; p < plates.length; p++) {
                const pZip = createUniversal3MFZip(plates[p], `Batch_Plate_${p + 1}`);
                if (pZip) {
                    zip.file(`Plate_${String(p + 1).padStart(2, '0')}_of_${String(plates.length).padStart(2, '0')}.3mf`,
                        await pZip.generateAsync({ type: 'blob', compression: 'DEFLATE' }));
                }
            }
        }

        // Post-process Nested 400x400mm Laser Sheets (.SVG + .DXF)
        if (fmt === 'laser' && laserLayouts.length > 0) {
            const sheetItems = laserLayouts.map(l => ({
                ...l,
                width: l.layout.effectiveSize + 2,
                height: l.layout.effectiveSize + (l.layout.shapeType === 'keychain' ? l.layout.effectiveSize * 0.25 : 0) + 2,
                cx: 0,
                cy: 0
            }));
            const sheets = packItemsIntoBuildPlates(sheetItems, 390, 390, 6);
            sheets.forEach((sheet, sIdx) => {
                const dxf = buildDxfHeaderLines();
                const svg = [`<svg xmlns="http://www.w3.org/2000/svg" width="400mm" height="400mm" viewBox="0 0 400 400">`];
                svg.push(`  <rect x="0" y="0" width="400" height="400" fill="none" stroke="#cbd5e1" stroke-width="0.2" stroke-dasharray="2 2"/>`);
                sheet.forEach(item => {
                    const ox = 200 + (item.tx - 128);
                    const oy = 200 + (item.ty - 128);
                    appendFaceLayoutToLaser(item.layout, dxf, svg, ox, oy);
                });
                dxf.push('0', 'ENDSEC', '0', 'EOF', '');
                svg.push('</svg>');
                const sNum = String(sIdx + 1).padStart(2, '0');
                zip.file(`Laser_Sheet_${sNum}_400x400mm.dxf`, dxf.join('\n'));
                zip.file(`Laser_Sheet_${sNum}_400x400mm.svg`, svg.join('\n'));
            });
        }

        zip.file('BATCH_MANIFEST.csv', csvLines.join('\n'));
        zip.file('README_BATCH.txt', `STUDIOS-PRO BATCH PRO EXPORT\nTotal Items: ${items.length}\nOutput Format: ${fmt.toUpperCase()}\nDual-Sided Shared Back: ${keepSideB ? 'YES' : 'NO'}\n`);

        const finalBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        downloadBlob(finalBlob, `StudiosPro_Batch_${fmt.toUpperCase()}_${items.length}x.zip`);
        showToast(t('toastBatchDone'));
    } finally {
        currentShape = prevShape;
        isDualSided = prevDual;
        activeSide = prevActiveSide;
        sideAData = origSideA;
        const activeSource = (activeSide === 'A') ? sideAData : sideBData;
        if (document.getElementById('input-top-text')) document.getElementById('input-top-text').value = activeSource.topText;
        if (document.getElementById('input-bottom-text')) document.getElementById('input-bottom-text').value = activeSource.bottomText;
        currentQRMatrix = activeSource.qrMatrix.map(r => [...r]);
        rebuild3DModel();

        if (progressBar) progressBar.style.display = 'none';
        if (progressFill) progressFill.style.width = '0%';
        if (exportBtn) exportBtn.disabled = false;
        closeBatchModal();
    }
}
