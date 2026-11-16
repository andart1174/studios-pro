/**
 * TRUE MULTI-COLOR 3MF SLICER EXPORTER FOR NEW 3D 4D STUDIO ULTRA
 * Generates Bambu Studio / OrcaSlicer / PrusaSlicer compatible OPC `.3mf` packages with:
 *   • Watertight vertices & triangles oriented flat on bed (Z >= 0)
 *   • High-res plate thumbnail (`Metadata/plate_1.png`)
 *   • Color palette & HueForge-style Z-layer swap metadata (`Metadata/project_settings.config`)
 */

const Export3MF_N3D = (() => {

  function xmlEscape(str) {
    return String(str || '').replace(/[<>&"']/g, c => ({
      '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;'
    }[c]));
  }

  function weldResultTo3MFMesh(meshResult) {
    const { mesh } = meshResult;
    const { verts, indices, topTriangles, extraTriangles, shapeProfile, bounds } = mesh;
    const isCurved = (shapeProfile === 'curved');
    const shiftZ = isCurved ? -bounds.minY : -Math.min(0, bounds.minZ);

    const rotPt = (x, y, z) => isCurved ? [x, -z, y + shiftZ] : [x, y, z + shiftZ];

    const outVerts = [];
    const vertMap = new Map();
    const outTris = [];

    const quant = (n) => {
      const q = Math.round(n * 2000);
      return q === 0 ? 0 : q;
    };

    function internPt(p) {
      const qx = quant(p[0]), qy = quant(p[1]), qz = quant(p[2]);
      const key = `${qx}_${qy}_${qz}`;
      let idx = vertMap.get(key);
      if (idx === undefined) {
        idx = outVerts.length;
        vertMap.set(key, idx);
        outVerts.push([qx / 2000, qy / 2000, qz / 2000]);
      }
      return idx;
    }

    for (let ti = 0; ti < topTriangles; ti++) {
      const ii = ti * 3;
      const i0 = indices[ii] * 3, i1 = indices[ii + 1] * 3, i2 = indices[ii + 2] * 3;
      const v0 = internPt(rotPt(verts[i0], verts[i0 + 1], verts[i0 + 2]));
      const v1 = internPt(rotPt(verts[i1], verts[i1 + 1], verts[i1 + 2]));
      const v2 = internPt(rotPt(verts[i2], verts[i2 + 1], verts[i2 + 2]));
      if (v0 !== v1 && v1 !== v2 && v0 !== v2) outTris.push([v0, v1, v2]);
    }

    for (let i = 0; i < extraTriangles.length; i++) {
      const [p0, p1, p2] = extraTriangles[i];
      const v0 = internPt(rotPt(p0[0], p0[1], p0[2]));
      const v1 = internPt(rotPt(p1[0], p1[1], p1[2]));
      const v2 = internPt(rotPt(p2[0], p2[1], p2[2]));
      if (v0 !== v1 && v1 !== v2 && v0 !== v2) outTris.push([v0, v1, v2]);
    }

    return { verts: outVerts, tris: outTris };
  }

  async function build3MFBlob(meshResult, opts = {}) {
    if (typeof JSZip === 'undefined') {
      throw new Error('JSZip library not loaded');
    }
    const {
      baseColor = '#0f172a',
      accentColor = '#4f8eff',
      topColor = '#ffffff',
      title = 'StudiosPro_Ultra_3D_Sculpture',
      thumbBase64 = null
    } = opts;

    const { verts, tris } = weldResultTo3MFMesh(meshResult);
    if (tris.length === 0) throw new Error('Mesh contains 0 triangles');

    // Shift center cleanly around plate center (128, 128) for Bambu Studio / PrusaSlicer
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, maxZ = 0;
    for (let i = 0; i < verts.length; i++) {
      const [x, y, z] = verts[i];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z > maxZ) maxZ = z;
    }
    const cx = (minX + maxX) * 0.5;
    const cy = (minY + maxY) * 0.5;

    const vLines = new Array(verts.length);
    for (let i = 0; i < verts.length; i++) {
      const [x, y, z] = verts[i];
      vLines[i] = `        <vertex x="${(x - cx).toFixed(4)}" y="${(y - cy).toFixed(4)}" z="${z.toFixed(4)}" />`;
    }
    const tLines = new Array(tris.length);
    for (let i = 0; i < tris.length; i++) {
      const [a, b, c] = tris[i];
      tLines[i] = `        <triangle v1="${a}" v2="${b}" v3="${c}" />`;
    }

    const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:BambuStudio="http://schemas.bambulab.com/package/2021">
  <metadata name="Title">${xmlEscape(title)}</metadata>
  <metadata name="Designer">Studios-Pro New 3D 4D Ultra</metadata>
  <metadata name="Application">Studios-Pro.com</metadata>
  <resources>
    <object id="1" type="model">
      <mesh>
        <vertices>
${vLines.join('\n')}
        </vertices>
        <triangles>
${tLines.join('\n')}
        </triangles>
      </mesh>
    </object>
  </resources>
  <build>
    <item objectid="1" transform="1 0 0 0 1 0 0 0 1 128 128 0" printable="1" />
  </build>
</model>`;

    const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml" />
  <Default Extension="png" ContentType="image/png" />
  <Default Extension="config" ContentType="text/plain" />
</Types>`;

    const rels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2015/02/3dmodel" />
  ${thumbBase64 ? '<Relationship Target="/Metadata/plate_1.png" Id="rel-thumb" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/thumbnail" />' : ''}
</Relationships>`;

    const modelConfig = `<?xml version="1.0" encoding="UTF-8"?>
<config>
  <object id="1">
    <metadata key="name" value="${xmlEscape(title)}" />
    <metadata key="extruder" value="1" />
  </object>
  <plate>
    <metadata key="plater_id" value="1" />
    <metadata key="plater_name" value="Ultra Sculpture Plate 1" />
  </plate>
</config>`;

    const baseH = Math.max(0.4, meshResult.baseMM || 2.0);
    const totalH = Math.max(baseH + 0.6, maxZ);
    const midH = baseH + (totalH - baseH) * 0.45;
    const topH = baseH + (totalH - baseH) * 0.78;

    const projectConfig = JSON.stringify({
      filament_colour: [baseColor, accentColor, topColor],
      layer_height: '0.12',
      initial_layer_print_height: '0.20',
      suggested_layer_swaps_mm: [
        +baseH.toFixed(2),
        +midH.toFixed(2),
        +topH.toFixed(2)
      ],
      notes: 'Recommended 0.12mm layer height for Ultra Bas-Relief / Lithophane clarity.'
    }, null, 2);

    const zip = new JSZip();
    zip.file('[Content_Types].xml', contentTypes);
    zip.file('_rels/.rels', rels);
    zip.file('3D/3dmodel.model', modelXml);
    zip.file('Metadata/model_settings.config', modelConfig);
    zip.file('Metadata/project_settings.config', projectConfig);
    if (thumbBase64) {
      zip.file('Metadata/plate_1.png', thumbBase64, { base64: true });
    }

    return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  }

  return { build3MFBlob, weldResultTo3MFMesh };
})();

window.Export3MF_N3D = Export3MF_N3D;
