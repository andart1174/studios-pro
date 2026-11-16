// ==========================================
// 3MF / BINARY STL / MULTI-LAYER LASER DXF+SVG / CADDY FULL SET & BATCH EXPORT
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
        renderer.render(scene, camera);
        const dataUrl = renderer.domElement.toDataURL('image/png');
        const idx = dataUrl.indexOf('base64,');
        return idx >= 0 ? dataUrl.slice(idx + 7) : null;
    } catch (_) {
        return null;
    }
}

function extractMeshTriangles(group) {
    const verts = [];
    const tris = [];
    if (!group) return { verts, tris };
    group.updateMatrixWorld(true);

    group.traverse(child => {
        if (child.userData && child.userData.isPreviewOnly) return;
        if (child.isInstancedMesh && child.geometry) {
            let geo = child.geometry;
            if (geo.index) geo = geo.toNonIndexed();
            const pos = geo.attributes.position;
            if (!pos || pos.count === 0) return;

            const instanceMatrix = new THREE.Matrix4();
            const worldMatrix = child.matrixWorld;
            const combined = new THREE.Matrix4();
            const v = new THREE.Vector3();

            for (let i = 0; i < child.count; i++) {
                child.getMatrixAt(i, instanceMatrix);
                combined.multiplyMatrices(worldMatrix, instanceMatrix);
                const baseIdx = verts.length;
                for (let p = 0; p < pos.count; p++) {
                    v.set(pos.getX(p), pos.getY(p), pos.getZ(p)).applyMatrix4(combined);
                    verts.push([v.x, v.y, v.z]);
                }
                for (let f = 0; f < pos.count; f += 3) {
                    tris.push([baseIdx + f, baseIdx + f + 1, baseIdx + f + 2]);
                }
            }
        } else if (child.isMesh && child.geometry) {
            let geo = child.geometry;
            if (geo.index) geo = geo.toNonIndexed();
            const pos = geo.attributes.position;
            if (!pos || pos.count === 0) return;

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
            // Preserve +1 determinant:
            // Standard Z-up: (x, -z, y + zOffset)
            // Face-Down PEI 180-deg flip around X: (x, +z, maxThreeY - y)
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
    const rawQR = extractMeshTriangles(qrMeshGroup);

    const combinedTextBadge = new THREE.Group();
    if (textMeshGroup) combinedTextBadge.add(textMeshGroup.clone(true));
    if (badgeMeshGroup) combinedTextBadge.add(badgeMeshGroup.clone(true));
    const rawText = extractMeshTriangles(combinedTextBadge);

    let minY = Infinity, maxY = -Infinity;
    [rawBase, rawQR, rawText].forEach(p => {
        for (let i = 0; i < p.verts.length; i++) {
            const vy = p.verts[i][1];
            if (vy < minY) minY = vy;
            if (vy > maxY) maxY = vy;
        }
    });
    if (!isFinite(minY)) { minY = 0; maxY = 0; }

    const flip = (!forceNoFlip && typeof isFaceDownMode !== 'undefined' && isFaceDownMode && currentShape !== 'stand' && currentShape !== 'caddy');
    const zOffset = -minY;

    const basePart = weldAndTransformMesh(rawBase.verts, rawBase.tris, zOffset, flip, maxY);
    const qrPart = weldAndTransformMesh(rawQR.verts, rawQR.tris, zOffset, flip, maxY);
    const textPart = weldAndTransformMesh(rawText.verts, rawText.tris, zOffset, flip, maxY);

    return {
        basePart,
        qrPart,
        textPart,
        parts: [
            { name: `1_Base_${baseColorHex}`, color: baseColorHex, verts: basePart.verts, tris: basePart.tris },
            { name: `2_QR_${qrColorHex}`, color: qrColorHex, verts: qrPart.verts, tris: qrPart.tris },
            { name: `3_Text_Badge_${accentColorHex}`, color: accentColorHex, verts: textPart.verts, tris: textPart.tris }
        ]
    };
}

function createMultiPart3MFZip(parts, title) {
    const activeParts = parts.filter(p => p.verts && p.verts.length > 0 && p.tris && p.tris.length > 0);
    if (activeParts.length === 0) return null;

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
    activeParts.forEach(part => {
        const norm = (part.color.startsWith('#') ? part.color : '#' + part.color).toUpperCase().slice(0, 7);
        if (!colorSlots.includes(norm)) colorSlots.push(norm);
    });

    const xb = new XmlChunkBuilder();
    xb.push(`<?xml version="1.0" encoding="UTF-8"?>\n`);
    xb.push(`<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02">\n`);
    xb.push(`  <metadata name="Title">${escapeXml(title || 'Studios-Pro 3D Coaster')}</metadata>\n`);
    xb.push(`  <metadata name="Application">Studios-Pro 3D QR Coaster Studio</metadata>\n`);
    xb.push(`  <resources>\n`);
    xb.push(`    <basematerials id="1">\n`);
    colorSlots.forEach((hex6, idx) => {
        xb.push(`      <base name="Slot_${idx + 1}_${hex6}" displaycolor="${hex6}FF"/>\n`);
    });
    xb.push(`    </basematerials>\n`);
    xb.push(`    <m:colorgroup id="2">\n`);
    colorSlots.forEach(hex6 => {
        xb.push(`      <m:color color="${hex6}"/>\n`);
    });
    xb.push(`    </m:colorgroup>\n`);

    let componentsXml = '';
    let bambuPartsXml = '';

    activeParts.forEach((part, idx) => {
        const objId = idx + 10;
        const norm = (part.color.startsWith('#') ? part.color : '#' + part.color).toUpperCase().slice(0, 7);
        const slotIdx = colorSlots.indexOf(norm);
        const extruderNum = slotIdx + 1;

        componentsXml += `\n      <component objectid="${objId}" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>`;
        bambuPartsXml += `\n    <part id="${objId}" subtype="normal_part">\n      <metadata key="name" value="${escapeXml(part.name)}"/>\n      <metadata key="extruder" value="${extruderNum}"/>\n      <metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/>\n    </part>`;

        xb.push(`    <object id="${objId}" pid="1" pindex="${slotIdx}" name="${escapeXml(part.name)}" type="model">\n`);
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

    xb.push(`    <object id="3" type="model" name="StudiosPro_Coaster_Assembly">\n      <components>${componentsXml}\n      </components>\n    </object>\n`);
    xb.push(`  </resources>\n  <build>\n    <item objectid="3" transform="1 0 0 0 1 0 0 0 1 0 0 0" printable="1"/>\n  </build>\n</model>\n`);

    zip.folder('3D').file('3dmodel.model', xb.toString());

    const meta = zip.folder('Metadata');
    meta.file('model_settings.config', `<?xml version="1.0" encoding="UTF-8"?>
<config>
  <object id="3">
    <metadata key="name" value="${escapeXml(title || 'StudiosPro_Coaster')}"/>
    <metadata key="extruder" value="1"/>${bambuPartsXml}
  </object>
  <plate>
    <metadata key="plater_id" value="1"/>
    <model_instance>
      <metadata key="object_id" value="3"/>
      <metadata key="instance_id" value="0"/>
    </model_instance>
  </plate>
</config>`);

    meta.file('project_settings.config', JSON.stringify({
        filament_colour: colorSlots,
        filament_type: colorSlots.map(() => 'PLA'),
        filament_vendor: colorSlots.map(() => 'Generic'),
        printer_model: 'Bambu Lab X1 Carbon'
    }, null, 2));

    if (thumbB64) {
        meta.file('plate_1.png', thumbB64, { base64: true });
    }
    return zip;
}

function createBinarySTL(part) {
    const triCount = (part && part.tris) ? part.tris.length : 0;
    const buffer = new ArrayBuffer(84 + triCount * 50);
    const view = new DataView(buffer);
    const hdr = 'Studios-Pro 3D Coaster Binary STL';
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

function openExportModal() {
    if (typeof closeAllModals === 'function') closeAllModals();
    const s1Dot = document.getElementById('ams-slot-1-dot');
    const s1Hex = document.getElementById('ams-slot-1-hex');
    const s2Dot = document.getElementById('ams-slot-2-dot');
    const s2Hex = document.getElementById('ams-slot-2-hex');
    const s3Dot = document.getElementById('ams-slot-3-dot');
    const s3Hex = document.getElementById('ams-slot-3-hex');
    if (s1Dot) s1Dot.style.backgroundColor = baseColorHex;
    if (s1Hex) s1Hex.innerText = baseColorHex.toUpperCase();
    if (s2Dot) s2Dot.style.backgroundColor = qrColorHex;
    if (s2Hex) s2Hex.innerText = qrColorHex.toUpperCase();
    if (s3Dot) s3Dot.style.backgroundColor = accentColorHex;
    if (s3Hex) s3Hex.innerText = accentColorHex.toUpperCase();

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

function openARPreview() {
    if (!window.StudiosProAR) {
        showToast('AR Viewer bridge unavailable');
        return;
    }
    const arGroup = new THREE.Group();
    [baseMeshGroup, qrMeshGroup, textMeshGroup, badgeMeshGroup].forEach(g => {
        if (g && g.children && g.children.length > 0) arGroup.add(g.clone(true));
    });
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

async function export3MF() {
    closeExportModal();
    showToast(t('generating3MF', currentLang === 'fr' ? 'Génération du fichier 3MF...' : 'Generating Multi-Color 3MF...'));
    const { parts } = getExportParts();
    const zip = createMultiPart3MFZip(parts, 'StudiosPro_Coaster');
    if (!zip) {
        showToast('No 3D geometry found to export');
        return;
    }
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    downloadBlob(blob, isFaceDownMode ? 'StudiosPro_FaceDown_PEI_Coaster.3mf' : 'StudiosPro_MultiColor_Coaster.3mf');
    showToast(t('toastExport3MF'));
    setTimeout(() => { if (typeof openShareDesignModal === 'function') openShareDesignModal(true); }, 650);
}

async function exportSeparateSTLs() {
    closeExportModal();
    showToast(currentLang === 'fr' ? 'Génération des fichiers STL binaires...' : 'Generating Binary STLs archive...');
    const { basePart, qrPart, textPart } = getExportParts();
    const zip = new JSZip();

    if (basePart.verts.length > 0 && basePart.tris.length > 0) {
        zip.file('1_Coaster_Base.stl', createBinarySTL(basePart));
    }
    if (qrPart.verts.length > 0 && qrPart.tris.length > 0) {
        zip.file('2_QR_Code.stl', createBinarySTL(qrPart));
    }
    if (textPart.verts.length > 0 && textPart.tris.length > 0) {
        zip.file('3_Text_and_Badge.stl', createBinarySTL(textPart));
    }

    const baseThick = parseFloat(document.getElementById('slider-base-thick')?.value || 3.2);
    const swapZ = (printStyle === 'embossed' && !isFaceDownMode) ? baseThick : 0.6;
    const pauseLayer = Math.round(swapZ / 0.2);
    const readme = `Studios-Pro 3D Coaster — Binary STL Multi-Color Guide\n====================================================\nDiameter/Width: ${document.getElementById('slider-size')?.value || 100} mm\nBase Thickness: ${baseThick.toFixed(2)} mm\nMode: ${isFaceDownMode ? 'Face-Down PEI Mirror' : printStyle.toUpperCase()}\nFilament Swap Z: ${swapZ.toFixed(2)} mm (Layer ${pauseLayer} at 0.20mm layer height)\n\nNOTE ON DEBOSSED MODE:\n1_Coaster_Base.stl contains real carved physical pockets for resin pour or single-extruder paint fill.`;
    zip.file('README_PRINT_INSTRUCTIONS.txt', readme);

    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    downloadBlob(blob, 'StudiosPro_Coaster_Separate_STLs.zip');
    showToast(t('toastExportSTL'));
    setTimeout(() => { if (typeof openShareDesignModal === 'function') openShareDesignModal(true); }, 650);
}

/**
 * Genius Export: 1 Floored Ergonomic Caddy Holder + 4 Matching Coasters on 1 print plate!
 */
async function exportCaddyFullSet3MF() {
    closeExportModal();
    showToast(currentLang === 'fr' ? 'Assemblage Pack Support + 4 Sous-Verres...' : 'Assembling Full Plate: 1 Rack + 4 Coasters...');

    const prevShape = currentShape;
    try {
        // 1. Build 1 Coaster from circular/polygon active settings
        const coasterShape = (prevShape === 'caddy' || prevShape === 'stand') ? 'circle' : prevShape;
        currentShape = coasterShape;
        rebuild3DModel();
        const coasterExport = getExportParts(true);

        // 2. Build 1 Ergonomic Caddy Rack
        currentShape = 'caddy';
        rebuild3DModel();
        const caddyExport = getExportParts(true);

        const size = parseFloat(document.getElementById('slider-size')?.value || 100);
        const step = size + 12;
        const offsets = [
            [-step * 0.55, -step * 0.55],
            [step * 0.55, -step * 0.55],
            [-step * 0.55, step * 0.55],
            [step * 0.55, step * 0.55]
        ];

        const plateParts = [];
        // Put Rack centered at (0, 0) ONLY if offsets clear center, or shift grid cleanly:
        const caddyOffset = [0, 0];
        if (caddyExport.basePart.verts.length > 0) {
            plateParts.push({
                name: 'Caddy_Holder_Rack',
                color: baseColorHex,
                verts: caddyExport.basePart.verts.map(v => [v[0] + caddyOffset[0], v[1] + caddyOffset[1], v[2]]),
                tris: caddyExport.basePart.tris
            });
        }

        // Surround rack cleanly in 4 outer quadrants around rack radius
        const radial = size * 1.15 + 10;
        const corners = [
            [-radial * 0.5, -radial * 0.5],
            [radial * 0.5, -radial * 0.5],
            [-radial * 0.5, radial * 0.5],
            [radial * 0.5, radial * 0.5]
        ];

        // Arrange on a clean 2x2 + 1 side grid (non-overlapping XY footprint!)
        const rackShiftX = -(size * 1.15);
        plateParts.forEach(p => {
            p.verts = p.verts.map(v => [v[0] + rackShiftX, v[1], v[2]]);
        });
        offsets.forEach(([ox, oy], cIdx) => {
            coasterExport.parts.forEach((p, pIdx) => {
                if (p.verts.length === 0) return;
                plateParts.push({
                    name: `Coaster_${cIdx + 1}_Part_${pIdx + 1}`,
                    color: p.color,
                    verts: p.verts.map(v => [v[0] + ox + size * 0.65, v[1] + oy, v[2]]),
                    tris: p.tris
                });
            });
        });

        const zip = createMultiPart3MFZip(plateParts, 'StudiosPro_Caddy_4Coaster_Set');
        if (zip) {
            const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
            downloadBlob(blob, 'StudiosPro_Caddy_Plus_4_Coasters.3mf');
            showToast(currentLang === 'fr' ? 'Pack complet Support + 4 Sous-Verres téléchargé !' : 'Complete Rack + 4 Coasters .3MF downloaded!');
        }
    } finally {
        currentShape = prevShape;
        rebuild3DModel();
    }
}

/**
 * Multi-Layer Laser CAD Pack (.DXF + .SVG in 1 clean ZIP, real newlines, ALL shapes + text/badge!).
 */
function buildLaserOutlinePoints2D(shapeType, size, invertShield = false) {
    const pts = [];
    const half = size / 2;
    if (shapeType === 'circle' || shapeType === 'keychain') {
        const segs = 72;
        for (let i = 0; i < segs; i++) {
            const a = (i * Math.PI * 2) / segs;
            pts.push([Math.cos(a) * half, Math.sin(a) * half]);
        }
        return pts;
    }
    if (shapeType === 'hexagon' || shapeType === 'octagon') {
        const sides = shapeType === 'hexagon' ? 6 : 8;
        const off = shapeType === 'hexagon' ? 0 : Math.PI / 8;
        for (let i = 0; i < sides; i++) {
            const a = off + (i * Math.PI * 2) / sides;
            pts.push([Math.cos(a) * half, Math.sin(a) * half]);
        }
        return pts;
    }
    if (typeof buildShape2DContour === 'function') {
        const shape2d = buildShape2DContour(shapeType, size, invertShield);
        return shape2d.getPoints(48).map(p => [p.x, p.y]);
    }
    return [[-half, -half], [half, -half], [half, half], [-half, half]];
}

async function exportLaserBlueprint() {
    closeExportModal();
    const rawSize = parseFloat(document.getElementById('slider-size')?.value || 100);
    const shapeType = (currentShape === 'caddy' || currentShape === 'stand') ? 'squircle' : currentShape;
    const effSize = shapeType === 'keychain' ? rawSize * 0.6 : rawSize;
    const invertShield = !!document.getElementById('chk-invert-shield')?.checked;
    const M = currentQRMatrix.length || 25;
    const qrAreaSize = effSize * 0.58;
    const pixelSize = qrAreaSize / M;
    const startOffset = -qrAreaSize / 2;

    // 1. REAL Newline CAD DXF (Zero \\n bugs!)
    const dxfLines = ['0', 'SECTION', '2', 'ENTITIES'];

    if (shapeType === 'circle') {
        dxfLines.push('0', 'CIRCLE', '8', '0_CUT', '10', '0.000', '20', '0.000', '30', '0.000', '40', (effSize / 2).toFixed(3));
    } else {
        const outlinePts = buildLaserOutlinePoints2D(shapeType, effSize, invertShield);
        dxfLines.push('0', 'POLYLINE', '8', '0_CUT', '66', '1', '70', '1');
        outlinePts.forEach(([px, py]) => {
            dxfLines.push('0', 'VERTEX', '8', '0_CUT', '10', px.toFixed(3), '20', py.toFixed(3), '30', '0.000');
        });
        dxfLines.push('0', 'SEQEND');

        if (shapeType === 'keychain' && typeof createKeychainShapeWithHole === 'function') {
            const kh = createKeychainShapeWithHole(effSize);
            dxfLines.push('0', 'CIRCLE', '8', '0_CUT_HOLE', '10', '0.000', '20', (-kh.holeCenterZ).toFixed(3), '30', '0.000', '40', kh.holeRadius.toFixed(3));
        }
    }

    for (let r = 0; r < M; r++) {
        for (let c = 0; c < M; c++) {
            if (!currentQRMatrix[r][c]) continue;
            const x1 = (startOffset + c * pixelSize).toFixed(3);
            const y1 = (startOffset + (M - 1 - r) * pixelSize).toFixed(3);
            const x2 = (startOffset + (c + 1) * pixelSize).toFixed(3);
            const y2 = (startOffset + (M - r) * pixelSize).toFixed(3);
            dxfLines.push(
                '0', 'POLYLINE', '8', '1_ENGRAVE_QR', '66', '1', '70', '1',
                '0', 'VERTEX', '8', '1_ENGRAVE_QR', '10', x1, '20', y1, '30', '0.000',
                '0', 'VERTEX', '8', '1_ENGRAVE_QR', '10', x2, '20', y1, '30', '0.000',
                '0', 'VERTEX', '8', '1_ENGRAVE_QR', '10', x2, '20', y2, '30', '0.000',
                '0', 'VERTEX', '8', '1_ENGRAVE_QR', '10', x1, '20', y2, '30', '0.000',
                '0', 'SEQEND'
            );
        }
    }

    const topTxt = (document.getElementById('input-top-text')?.value || '').trim();
    const botTxt = (document.getElementById('input-bottom-text')?.value || '').trim();
    const topOff = parseFloat(document.getElementById('slider-top-offset')?.value || 38) * (effSize / 100);
    const botOff = parseFloat(document.getElementById('slider-bottom-offset')?.value || 38) * (effSize / 100);
    const txtSizeMm = parseFloat(document.getElementById('slider-text-size')?.value || 8.0) * (shapeType === 'keychain' ? 0.72 : 1);

    if (topTxt) {
        dxfLines.push('0', 'TEXT', '8', '2_ENGRAVE_TEXT', '10', '0.000', '20', topOff.toFixed(3), '30', '0.000', '40', txtSizeMm.toFixed(2), '72', '1', '11', '0.000', '21', topOff.toFixed(3), '1', topTxt);
    }
    if (botTxt) {
        dxfLines.push('0', 'TEXT', '8', '2_ENGRAVE_TEXT', '10', '0.000', '20', (-botOff).toFixed(3), '30', '0.000', '40', txtSizeMm.toFixed(2), '72', '1', '11', '0.000', '21', (-botOff).toFixed(3), '1', botTxt);
    }

    dxfLines.push('0', 'ENDSEC', '0', 'EOF', '');
    const dxfContent = dxfLines.join('\n');

    // 2. Clean Multi-Layer Vector SVG for LightBurn / Inkscape / Cricut
    const pad = 6;
    const vbSize = effSize + pad * 2;
    const halfVb = vbSize / 2;
    const svgParts = [];
    svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${vbSize.toFixed(1)}mm" height="${vbSize.toFixed(1)}mm" viewBox="${(-halfVb).toFixed(2)} ${(-halfVb).toFixed(2)} ${vbSize.toFixed(2)} ${vbSize.toFixed(2)}">`);
    svgParts.push(`  <!-- Cut Outline (Red) -->`);
    if (shapeType === 'circle') {
        svgParts.push(`  <circle cx="0" cy="0" r="${(effSize / 2).toFixed(2)}" fill="none" stroke="#ff0000" stroke-width="0.25"/>`);
    } else {
        const ptsAttr = buildLaserOutlinePoints2D(shapeType, effSize, invertShield).map(([px, py]) => `${px.toFixed(2)},${(-py).toFixed(2)}`).join(' ');
        svgParts.push(`  <polygon points="${ptsAttr}" fill="none" stroke="#ff0000" stroke-width="0.25"/>`);
        if (shapeType === 'keychain' && typeof createKeychainShapeWithHole === 'function') {
            const kh = createKeychainShapeWithHole(effSize);
            svgParts.push(`  <circle cx="0" cy="${kh.holeCenterZ.toFixed(2)}" r="${kh.holeRadius.toFixed(2)}" fill="none" stroke="#ff0000" stroke-width="0.25"/>`);
        }
    }

    svgParts.push(`  <!-- QR Engrave (Black) -->`);
    for (let r = 0; r < M; r++) {
        for (let c = 0; c < M; c++) {
            if (!currentQRMatrix[r][c]) continue;
            const px = startOffset + c * pixelSize;
            const py = startOffset + r * pixelSize;
            if (qrPixelStyle === 'dots' && !(typeof isFinderModule === 'function' && isFinderModule(r, c, M))) {
                svgParts.push(`  <circle cx="${(px + pixelSize * 0.5).toFixed(2)}" cy="${(py + pixelSize * 0.5).toFixed(2)}" r="${(pixelSize * 0.43).toFixed(2)}" fill="#000000"/>`);
            } else {
                svgParts.push(`  <rect x="${px.toFixed(2)}" y="${py.toFixed(2)}" width="${(pixelSize * 0.99).toFixed(2)}" height="${(pixelSize * 0.99).toFixed(2)}" fill="#000000"/>`);
            }
        }
    }

    svgParts.push(`  <!-- Text & Center Badge (Blue Engrave Layer) -->`);
    if (topTxt) {
        svgParts.push(`  <text x="0" y="${(-topOff).toFixed(2)}" text-anchor="middle" dominant-baseline="central" font-family="sans-serif" font-weight="900" font-size="${txtSizeMm.toFixed(2)}" fill="#0000ff">${escapeXml(topTxt)}</text>`);
    }
    if (botTxt) {
        svgParts.push(`  <text x="0" y="${botOff.toFixed(2)}" text-anchor="middle" dominant-baseline="central" font-family="sans-serif" font-weight="900" font-size="${txtSizeMm.toFixed(2)}" fill="#0000ff">${escapeXml(botTxt)}</text>`);
    }
    if (badgeType !== 'none') {
        const br = qrAreaSize * 0.145;
        svgParts.push(`  <circle cx="0" cy="0" r="${br.toFixed(2)}" fill="#ffffff" stroke="#0000ff" stroke-width="0.4"/>`);
    }
    svgParts.push(`</svg>`);

    const zip = new JSZip();
    zip.file('StudiosPro_Coaster_Laser.dxf', dxfContent);
    zip.file('StudiosPro_Coaster_Laser.svg', svgParts.join('\n'));
    zip.file('README_LASER.txt', 'LightBurn / Glowforge / CNC Guide:\n- 0_CUT / Red (#ff0000): Outer Cut + Keyhole\n- 1_ENGRAVE_QR / Black (#000000): Fill Engrave QR Code\n- 2_ENGRAVE_TEXT / Blue (#0000ff): Labels & Center Badge\nAll coordinates are millimeter 1:1 true scale.');

    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    downloadBlob(zipBlob, 'StudiosPro_Coaster_Laser_Pack.zip');
    showToast(t('toastExportLaser'));
}

// ==========================================
// NON-BLOCKING RESTAURANT TABLE BATCH GENERATOR
// ==========================================

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

function updateBatchPreview() {
    const start = parseInt(document.getElementById('batch-start-num')?.value || 1, 10);
    const end = Math.max(start, parseInt(document.getElementById('batch-end-num')?.value || 20, 10));
    const total = end - start + 1;
    const countEl = document.getElementById('batch-total-count');
    if (countEl) countEl.innerText = `${total} Coasters`;

    const slider = document.getElementById('batch-preview-slider');
    if (slider) {
        slider.min = start;
        slider.max = end;
        if (parseInt(slider.value, 10) < start || parseInt(slider.value, 10) > end) slider.value = start;
        onBatchSliderChange(slider.value);
    }
    const maxLbl = document.getElementById('batch-max-slider-lbl');
    if (maxLbl) maxLbl.innerText = `Table ${end}`;
}

function onBatchSliderChange(val) {
    const num = parseInt(val, 10);
    const padStr = num < 10 ? '0' + num : '' + num;
    const prefix = document.getElementById('batch-table-prefix')?.value || 'TABLE {n}';
    const urlTpl = document.getElementById('batch-url-template')?.value || 'https://mybistro.com/order?table={n}';
    const lblEl = document.getElementById('batch-preview-label');
    const urlEl = document.getElementById('batch-url-sample');
    if (lblEl) lblEl.innerText = prefix.replace(/\{n\}/g, num).replace(/\{pad\}/g, padStr);
    if (urlEl) urlEl.innerText = 'URL: ' + urlTpl.replace(/\{n\}/g, num).replace(/\{pad\}/g, padStr);
}

function csvCell(v) {
    const s = String(v ?? '');
    return `"${s.replace(/"/g, '""')}"`;
}

async function generateTableBatchZIP() {
    const start = parseInt(document.getElementById('batch-start-num')?.value || 1, 10);
    const end = Math.min(start + 99, Math.max(start, parseInt(document.getElementById('batch-end-num')?.value || 20, 10)));
    const urlTpl = document.getElementById('batch-url-template')?.value || 'https://mybistro.com/order?table={n}';
    const headerTpl = document.getElementById('batch-header-template')?.value || 'SCAN TO ORDER';
    const footerTpl = document.getElementById('batch-footer-template')?.value || 'TABLE {n}';

    const progressBar = document.getElementById('batch-progress-bar');
    const progressFill = document.getElementById('batch-progress-fill');
    const exportBtn = document.getElementById('btn-batch-export');
    if (progressBar) progressBar.style.display = 'block';
    if (exportBtn) exportBtn.disabled = true;

    // Preserve user active coaster inputs before generating batch
    const origTop = document.getElementById('input-top-text')?.value || '';
    const origBot = document.getElementById('input-bottom-text')?.value || '';
    const origMatrix = currentQRMatrix.map(r => [...r]);

    try {
        const zip = new JSZip();
        const csvLines = ['Table Number,Scannable Target URL,Header Label,Footer Label,Dimensions mm,Filament Swap'];
        const size = document.getElementById('slider-size')?.value || 100;
        const baseThick = parseFloat(document.getElementById('slider-base-thick')?.value || 3.2);
        const total = end - start + 1;

        for (let i = start; i <= end; i++) {
            const padStr = i < 10 ? '0' + i : '' + i;
            const tableUrl = urlTpl.replace(/\{n\}/g, i).replace(/\{pad\}/g, padStr);
            const tableHeader = headerTpl.replace(/\{n\}/g, i).replace(/\{pad\}/g, padStr);
            const tableFooter = footerTpl.replace(/\{n\}/g, i).replace(/\{pad\}/g, padStr);

            const built = generateMatrixFromPayload(tableUrl, qrECCLevel, badgeType);
            document.getElementById('input-top-text').value = tableHeader;
            document.getElementById('input-bottom-text').value = tableFooter;
            currentQRMatrix = built.matrix;
            rebuild3DModel();

            const { parts } = getExportParts();
            const subZip = createMultiPart3MFZip(parts, `Restaurant Coaster - Table ${padStr}`);
            if (subZip) {
                const table3mfBlob = await subZip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
                zip.file(`Table_${padStr}.3mf`, table3mfBlob);
            }

            const swapZ = isFaceDownMode ? 0.6 : baseThick;
            csvLines.push([
                csvCell(`Table ${padStr}`),
                csvCell(tableUrl),
                csvCell(tableHeader),
                csvCell(tableFooter),
                csvCell(`${size}x${size}x${baseThick}mm`),
                csvCell(`Pause at ${swapZ}mm (Layer ${Math.round(swapZ / 0.2)})`)
            ].join(','));

            if (progressFill) {
                progressFill.style.width = `${Math.round(((i - start + 1) / total) * 100)}%`;
            }
            // Yield back to UI browser paint loop so progress bar renders smoothly without freezing!
            await new Promise(r => setTimeout(r, 0));
        }

        zip.file('TABLES_MANIFEST.csv', csvLines.join('\n'));
        zip.file('README_PRINT_INSTRUCTIONS.txt', `RESTAURANT TABLE COASTERS BATCH SET\nTotal Tables Generated: ${total}\nSize: ${size} mm\nBase Thickness: ${baseThick} mm`);

        const finalBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        downloadBlob(finalBlob, 'Restaurant_Table_Coasters_Set.zip');
        showToast(t('toastBatchDone'));
    } finally {
        // Restore user's active texts & QR matrix cleanly!
        if (document.getElementById('input-top-text')) document.getElementById('input-top-text').value = origTop;
        if (document.getElementById('input-bottom-text')) document.getElementById('input-bottom-text').value = origBot;
        currentQRMatrix = origMatrix;
        rebuild3DModel();
        if (progressBar) progressBar.style.display = 'none';
        if (progressFill) progressFill.style.width = '0%';
        if (exportBtn) exportBtn.disabled = false;
        closeBatchModal();
    }
}
