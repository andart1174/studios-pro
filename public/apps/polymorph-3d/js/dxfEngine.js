/**
 * PolyMorph 3D Studio - DXF Engine (Parser & Exporter)
 * Supports standard AutoCAD ASCII DXF for 3D faces, polylines, lines and 2D CNC contour exports.
 */
class DXFEngine {
  /**
   * Parses ASCII DXF content into a Three.js Group
   * @param {string} dxfText 
   * @returns {THREE.Group}
   */
  static parse(dxfText) {
    const lines = dxfText.split(/\r?\n/).map(l => l.trim());
    const group = new THREE.Group();
    group.name = "DXF_Model";

    const positions = [];
    const linePositions = [];

    let i = 0;
    while (i < lines.length - 1) {
      const code = parseInt(lines[i], 10);
      const val = lines[i + 1];

      if (code === 0 && val === '3DFACE') {
        i += 2;
        const pts = [{}, {}, {}, {}];
        while (i < lines.length - 1) {
          const c = parseInt(lines[i], 10);
          const v = lines[i + 1];
          if (c === 0) break; // Next entity

          if (c === 10) pts[0].x = parseFloat(v);
          else if (c === 20) pts[0].y = parseFloat(v);
          else if (c === 30) pts[0].z = parseFloat(v);
          else if (c === 11) pts[1].x = parseFloat(v);
          else if (c === 21) pts[1].y = parseFloat(v);
          else if (c === 31) pts[1].z = parseFloat(v);
          else if (c === 12) pts[2].x = parseFloat(v);
          else if (c === 22) pts[2].y = parseFloat(v);
          else if (c === 32) pts[2].z = parseFloat(v);
          else if (c === 13) pts[3].x = parseFloat(v);
          else if (c === 23) pts[3].y = parseFloat(v);
          else if (c === 33) pts[3].z = parseFloat(v);
          i += 2;
        }

        // Tri 1
        positions.push(pts[0].x || 0, pts[0].y || 0, pts[0].z || 0);
        positions.push(pts[1].x || 0, pts[1].y || 0, pts[1].z || 0);
        positions.push(pts[2].x || 0, pts[2].y || 0, pts[2].z || 0);

        // Tri 2 if quad
        if (pts[3].x !== undefined && (pts[3].x !== pts[2].x || pts[3].y !== pts[2].y || pts[3].z !== pts[2].z)) {
          positions.push(pts[0].x || 0, pts[0].y || 0, pts[0].z || 0);
          positions.push(pts[2].x || 0, pts[2].y || 0, pts[2].z || 0);
          positions.push(pts[3].x || 0, pts[3].y || 0, pts[3].z || 0);
        }
        continue;
      } else if (code === 0 && val === 'LINE') {
        i += 2;
        let x1 = 0, y1 = 0, z1 = 0, x2 = 0, y2 = 0, z2 = 0;
        while (i < lines.length - 1) {
          const c = parseInt(lines[i], 10);
          const v = lines[i + 1];
          if (c === 0) break;
          if (c === 10) x1 = parseFloat(v);
          else if (c === 20) y1 = parseFloat(v);
          else if (c === 30) z1 = parseFloat(v);
          else if (c === 11) x2 = parseFloat(v);
          else if (c === 21) y2 = parseFloat(v);
          else if (c === 31) z2 = parseFloat(v);
          i += 2;
        }
        linePositions.push(x1, y1, z1, x2, y2, z2);
        continue;
      } else if (code === 0 && (val === 'POLYLINE' || val === 'LWPOLYLINE')) {
        i += 2;
        const polyPts = [];
        let curPt = {};
        while (i < lines.length - 1) {
          const c = parseInt(lines[i], 10);
          const v = lines[i + 1];
          if (c === 0 && (v === 'SEQEND' || v !== 'VERTEX')) {
            if (c === 0 && v !== 'VERTEX') break;
          }
          if (c === 10) curPt.x = parseFloat(v);
          else if (c === 20) curPt.y = parseFloat(v);
          else if (c === 30) curPt.z = parseFloat(v);
          else if (c === 0 && v === 'VERTEX') {
            if (curPt.x !== undefined) polyPts.push({ ...curPt });
            curPt = {};
          }
          i += 2;
        }
        if (curPt.x !== undefined) polyPts.push(curPt);

        for (let p = 0; p < polyPts.length - 1; p++) {
          linePositions.push(
            polyPts[p].x || 0, polyPts[p].y || 0, polyPts[p].z || 0,
            polyPts[p+1].x || 0, polyPts[p+1].y || 0, polyPts[p+1].z || 0
          );
        }
        continue;
      }
      i += 2;
    }

    // Build 3D Mesh
    if (positions.length > 0) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.computeVertexNormals();
      const material = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        roughness: 0.4,
        metalness: 0.2,
        side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(geometry, material);
      group.add(mesh);
    }

    // Build Lines
    if (linePositions.length > 0) {
      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
      const lineMat = new THREE.LineBasicMaterial({ color: 0x00f0ff });
      const lineMesh = new THREE.LineSegments(lineGeo, lineMat);
      group.add(lineMesh);
    }

    return group;
  }

  /**
   * Exports a Three.js Object3D / Geometry into AutoCAD DXF ASCII format
   * @param {THREE.Object3D} object 
   * @returns {string}
   */
  static export(object) {
    let out = "0\nSECTION\n2\nHEADER\n0\nENDSEC\n";
    out += "0\nSECTION\n2\nTABLES\n0\nENDSEC\n";
    out += "0\nSECTION\n2\nBLOCKS\n0\nENDSEC\n";
    out += "0\nSECTION\n2\nENTITIES\n";

    object.updateMatrixWorld(true);

    object.traverse((child) => {
      if (child.isMesh && child.geometry) {
        let geo = child.geometry;
        if (!geo.isBufferGeometry) return;

        const posAttr = geo.attributes.position;
        const indexAttr = geo.index;
        const matrix = child.matrixWorld;
        const vA = new THREE.Vector3();
        const vB = new THREE.Vector3();
        const vC = new THREE.Vector3();

        const numTriangles = indexAttr ? indexAttr.count / 3 : posAttr.count / 3;

        for (let i = 0; i < numTriangles; i++) {
          let iA, iB, iC;
          if (indexAttr) {
            iA = indexAttr.getX(i * 3);
            iB = indexAttr.getX(i * 3 + 1);
            iC = indexAttr.getX(i * 3 + 2);
          } else {
            iA = i * 3;
            iB = i * 3 + 1;
            iC = i * 3 + 2;
          }

          vA.fromBufferAttribute(posAttr, iA).applyMatrix4(matrix);
          vB.fromBufferAttribute(posAttr, iB).applyMatrix4(matrix);
          vC.fromBufferAttribute(posAttr, iC).applyMatrix4(matrix);

          out += "0\n3DFACE\n8\nPOLYMORPH_MESH\n";
          out += `10\n${vA.x.toFixed(5)}\n20\n${vA.y.toFixed(5)}\n30\n${vA.z.toFixed(5)}\n`;
          out += `11\n${vB.x.toFixed(5)}\n21\n${vB.y.toFixed(5)}\n31\n${vB.z.toFixed(5)}\n`;
          out += `12\n${vC.x.toFixed(5)}\n22\n${vC.y.toFixed(5)}\n32\n${vC.z.toFixed(5)}\n`;
          out += `13\n${vC.x.toFixed(5)}\n23\n${vC.y.toFixed(5)}\n33\n${vC.z.toFixed(5)}\n`;
        }
      }
    });

    out += "0\nENDSEC\n0\nEOF\n";
    return out;
  }

  /**
   * Generates 2D DXF contours from 2D pixel/vector contours
   * @param {Array<Array<{x:number, y:number}>>} paths 
   * @returns {string}
   */
  static export2DContours(paths) {
    let out = "0\nSECTION\n2\nHEADER\n0\nENDSEC\n";
    out += "0\nSECTION\n2\nENTITIES\n";

    paths.forEach((path, pathIdx) => {
      if (path.length < 2) return;
      out += "0\nLWPOLYLINE\n8\nCONTOURS\n";
      out += `90\n${path.length}\n`;
      out += "70\n1\n"; // Closed polyline
      
      for (const pt of path) {
        out += `10\n${pt.x.toFixed(4)}\n20\n${pt.y.toFixed(4)}\n`;
      }
    });

    out += "0\nENDSEC\n0\nEOF\n";
    return out;
  }
}

window.DXFEngine = DXFEngine;
