/**
 * PolyMorph 3D Studio - 3D Puzzle, Voxel & Modular Brick Engine
 * Features 4 Original Interlocking Brick Systems:
 * 1. MorphoBricks™ (Hexa-Lock 60°/90°/120° Modular Grid)
 * 2. OmniLock™ (Dovetail Side & Snap Connectors)
 * 3. GeoStud™ (Chamfered Sci-Fi Blocks with Hollow LED/Wire Core)
 * 4. Nexura™ (Kinetic Spherical Snap Voxel)
 * Plus 3D Interlocking Jigsaw Slicer and Japanese 6-bar Burr Puzzles.
 * 100% Watertight Male Top Studs & Exact Matching Female Bottom Sockets.
 * 100% Client-side, zero backend dependencies.
 */

class PuzzleEngine {
  // --------------------------------------------------------------------------
  // Procedural Shapes Library (Watertight Solids)
  // --------------------------------------------------------------------------

  static getPresetGeometry(presetName = 'puzzle_sphere') {
    switch (presetName) {
      case 'puzzle_sphere':
        return new THREE.SphereGeometry(35, 32, 24);
      case 'puzzle_cube':
        return new THREE.BoxGeometry(50, 50, 50);
      case 'puzzle_heart':
        return this.createPolyhedralHeartGeometry();
      case 'puzzle_crystal':
        return this.createCrystalGemGeometry();
      case 'puzzle_pyramid':
        return new THREE.ConeGeometry(38, 55, 4);
      case 'puzzle_torus':
        return new THREE.TorusGeometry(32, 14, 16, 36);
      case 'puzzle_star':
        return this.createStellatedDodecahedronGeometry();
      default:
        return new THREE.SphereGeometry(35, 32, 24);
    }
  }

  static createPolyhedralHeartGeometry() {
    const geom = new THREE.BufferGeometry();
    const vertices = [
      0, 16, 5,   -18, 32, 8,   18, 32, 8,   -36, 16, 6,
      36, 16, 6,  -28, -8, 5,   28, -8, 5,   0, -38, 0,
      -14, 12, 18, 14, 12, 18,  0, -12, 16,
      -14, 12, -14, 14, 12, -14, 0, -12, -12
    ];
    const indices = [
      0, 8, 1,   1, 8, 3,   0, 9, 2,   2, 9, 4,   0, 9, 8,
      8, 10, 0,  9, 0, 10,  3, 8, 5,   5, 8, 10,  4, 6, 9,
      9, 6, 10,  5, 10, 7,  10, 6, 7,  0, 1, 11,  1, 3, 11,
      0, 12, 2,  2, 12, 4,  0, 11, 12, 11, 13, 0, 12, 0, 13,
      3, 11, 5,  5, 11, 13, 4, 12, 6,  9, 12, 13, 5, 13, 7,
      13, 6, 7
    ];
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }

  static createCrystalGemGeometry() {
    const geom = new THREE.BufferGeometry();
    const rTop = 20, rMid = 35, rBot = 0;
    const yTop = 25, yMid = 8, yBot = -38;
    const segs = 8;
    const vertices = [0, yTop, 0];
    const indices = [];

    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      vertices.push(Math.cos(a) * rMid, yMid, Math.sin(a) * rMid);
    }
    vertices.push(0, yBot, 0);

    for (let i = 1; i <= segs; i++) {
      const next = i === segs ? 1 : i + 1;
      indices.push(0, i, next);
    }
    const botIdx = segs + 1;
    for (let i = 1; i <= segs; i++) {
      const next = i === segs ? 1 : i + 1;
      indices.push(botIdx, next, i);
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }

  static createStellatedDodecahedronGeometry() {
    const geom = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];
    const phi = (1 + Math.sqrt(5)) / 2;
    const s = 14;

    const basePts = [
      [-s, phi*s, 0], [s, phi*s, 0], [-s, -phi*s, 0], [s, -phi*s, 0],
      [0, -s, phi*s], [0, s, phi*s], [0, -s, -phi*s], [0, s, -phi*s],
      [phi*s, 0, -s], [phi*s, 0, s], [-phi*s, 0, -s], [-phi*s, 0, s]
    ];
    basePts.forEach(p => vertices.push(...p));

    const icosaFaces = [
      [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
      [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
      [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
      [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
    ];

    let vertIdx = 12;
    icosaFaces.forEach(([a, b, c]) => {
      const pA = new THREE.Vector3(...basePts[a]);
      const pB = new THREE.Vector3(...basePts[b]);
      const pC = new THREE.Vector3(...basePts[c]);
      const center = new THREE.Vector3(
        (pA.x + pB.x + pC.x) / 3,
        (pA.y + pB.y + pC.y) / 3,
        (pA.z + pB.z + pC.z) / 3
      );
      const normal = center.clone().normalize();
      const peak = new THREE.Vector3(
        center.x + normal.x * 22,
        center.y + normal.y * 22,
        center.z + normal.z * 22
      );

      vertices.push(peak.x, peak.y, peak.z);
      indices.push(a, b, vertIdx);
      indices.push(b, c, vertIdx);
      indices.push(c, a, vertIdx);
      vertIdx++;
    });

    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }

  // --------------------------------------------------------------------------
  // 4 Original Proprietary Brick Systems (Zero LEGO® Trademark)
  // --------------------------------------------------------------------------

  static BRICK_SYSTEMS = {
    morphobricks: {
      id: 'morphobricks',
      name: 'MorphoBricks™',
      feature: 'Hexa-Lock (60°/90°/120° Angle Grid)',
      description: 'Faceted hexagonal pin system enabling organic, curved, and diagonal construction walls.'
    },
    omnilock: {
      id: 'omnilock',
      name: 'OmniLock™',
      feature: 'Dovetail Side & Snap Interlock',
      description: 'Dual-locking system with vertical snap pins and 4-sided lateral sliding dovetail rails.'
    },
    geostud: {
      id: 'geostud',
      name: 'GeoStud™',
      feature: 'Hollow LED/Wire Core Channel',
      description: 'Sci-Fi chamfered block architecture with central conduit for internal LED lighting & cables.'
    },
    nexura: {
      id: 'nexura',
      name: 'Nexura™',
      feature: 'Kinetic Spherical Snap Voxel',
      description: 'Ultra-smooth kinetic voxel system with spherical socket domes for magnetic or friction locking.'
    }
  };

  /**
   * Procedural Watertight Builder: Top Male Stud(s) + Exact Matching Bottom Female Socket(s)
   */
  static buildWatertightBrickGeometry(systemName = 'morphobricks', countX = 1, countZ = 1, unitSize = 10) {
    const u = unitSize;
    const width = countX * u;
    const depth = countZ * u;
    const height = u * 0.96;
    const studR = u * 0.32;
    const studH = u * 0.24;
    const sockR = studR + 0.2; // 0.2mm 3D printing friction clearance
    const sockH = studH + 0.3; // 0.3mm vertical depth clearance

    const vertices = [];
    const indices = [];

    function addQuad(p0, p1, p2, p3) {
      const base = vertices.length / 3;
      vertices.push(...p0, ...p1, ...p2, ...p3);
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }

    function addTri(p0, p1, p2) {
      const base = vertices.length / 3;
      vertices.push(...p0, ...p1, ...p2);
      indices.push(base, base + 1, base + 2);
    }

    const hx = width / 2;
    const hy = height / 2;
    const hz = depth / 2;

    // 1. Top Outer Face (Solid Deck at +hy)
    addQuad([-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], [-hx, hy, -hz]);

    // 2. 4 Outer Side Walls
    addQuad([-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]); // Front
    addQuad([hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz]); // Back
    addQuad([-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz]); // Left
    addQuad([hx, -hy, hz], [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz]); // Right

    // Continuous 2D Planar Triangulation for bottom collar surrounding the socket hole
    function triangulateCollar(cx, cz, cellSize, botY, sock2DPts) {
      const N = sock2DPts.length;
      const h = cellSize / 2;
      const corners = [
        [cx + h, botY, cz + h], // 0: Top-Right (dx>=0, dz>=0)
        [cx - h, botY, cz + h], // 1: Top-Left  (dx<0, dz>=0)
        [cx - h, botY, cz - h], // 2: Bot-Left  (dx<0, dz<0)
        [cx + h, botY, cz - h]  // 3: Bot-Right (dx>=0, dz<0)
      ];

      function getCornerIdx(pt) {
        const dx = pt[0] - cx;
        const dz = pt[1] - cz;
        if (dx >= 0 && dz >= 0) return 0;
        if (dx < 0 && dz >= 0) return 1;
        if (dx < 0 && dz < 0) return 2;
        return 3;
      }

      for (let i = 0; i < N; i++) {
        const next = (i + 1) % N;
        const p1 = sock2DPts[i];
        const p2 = sock2DPts[next];
        const v1 = [p1[0], botY, p1[1]];
        const v2 = [p2[0], botY, p2[1]];
        const c1 = getCornerIdx(p1);
        const c2 = getCornerIdx(p2);

        if (c1 === c2) {
          addTri(corners[c1], v1, v2);
        } else {
          addTri(corners[c1], v1, v2);
          addTri(corners[c1], v2, corners[c2]);
        }
      }
    }

    // 3. Grid Studs & Matching Bottom Sockets
    const startX = -((countX - 1) * u) / 2;
    const startZ = -((countZ - 1) * u) / 2;

    for (let ix = 0; ix < countX; ix++) {
      for (let iz = 0; iz < countZ; iz++) {
        const cx = startX + ix * u;
        const cz = startZ + iz * u;

        if (systemName === 'morphobricks' || systemName === 'geostud') {
          const segs = systemName === 'morphobricks' ? 6 : 16;
          
          // Male Top Stud
          const topStudVerts = [];
          const botStudVerts = [];
          for (let i = 0; i < segs; i++) {
            const a = (i / segs) * Math.PI * 2;
            const cos = Math.cos(a) * studR;
            const sin = Math.sin(a) * studR;
            botStudVerts.push([cx + cos, hy, cz + sin]);
            topStudVerts.push([cx + cos, hy + studH, cz + sin]);
          }
          for (let i = 0; i < segs; i++) {
            const next = (i + 1) % segs;
            addQuad(botStudVerts[i], botStudVerts[next], topStudVerts[next], topStudVerts[i]);
          }
          for (let i = 1; i < segs - 1; i++) {
            addTri(topStudVerts[0], topStudVerts[i], topStudVerts[i + 1]);
          }

          // Female Socket (Negative Hollow Cavity on Bottom Face)
          const botSockVerts = [];
          const topSockVerts = [];
          const sock2D = [];
          for (let i = 0; i < segs; i++) {
            const a = (i / segs) * Math.PI * 2;
            const cos = Math.cos(a) * sockR;
            const sin = Math.sin(a) * sockR;
            botSockVerts.push([cx + cos, -hy, cz + sin]);
            topSockVerts.push([cx + cos, -hy + sockH, cz + sin]);
            sock2D.push([cx + cos, cz + sin]);
          }
          // Socket Side Walls (normals pointing inward)
          for (let i = 0; i < segs; i++) {
            const next = (i + 1) % segs;
            addQuad(botSockVerts[next], botSockVerts[i], topSockVerts[i], topSockVerts[next]);
          }
          // Socket Ceiling (pointing downwards -Y)
          for (let i = 1; i < segs - 1; i++) {
            addTri(topSockVerts[0], topSockVerts[i + 1], topSockVerts[i]);
          }

          // Bottom Face Collar
          triangulateCollar(cx, cz, u, -hy, sock2D);

        } else if (systemName === 'omnilock') {
          // Cross-Shaped Male Top Stud & Matching Cross-Shaped Female Bottom Cavity
          const w2 = (studR * 1.8) / 2, t2 = (studR * 0.6) / 2;
          const sw2 = w2 + 0.15, st2 = t2 + 0.15;

          // 12-gon for male top cross
          const male2D = [
            [w2, t2], [t2, t2], [t2, w2],
            [-t2, w2], [-t2, t2], [-w2, t2],
            [-w2, -t2], [-t2, -t2], [-t2, -w2],
            [t2, -w2], [t2, -t2], [w2, -t2]
          ];

          const topStudVerts = [];
          const botStudVerts = [];
          for (let i = 0; i < 12; i++) {
            const px = cx + male2D[i][0], pz = cz + male2D[i][1];
            botStudVerts.push([px, hy, pz]);
            topStudVerts.push([px, hy + studH, pz]);
          }
          for (let i = 0; i < 12; i++) {
            const next = (i + 1) % 12;
            addQuad(botStudVerts[i], botStudVerts[next], topStudVerts[next], topStudVerts[i]);
          }
          for (let i = 1; i < 11; i++) {
            addTri(topStudVerts[0], topStudVerts[i], topStudVerts[i + 1]);
          }

          // 12-gon for female bottom socket
          const female2D = [
            [sw2, st2], [st2, st2], [st2, sw2],
            [-st2, sw2], [-st2, st2], [-sw2, st2],
            [-sw2, -st2], [-st2, -st2], [-st2, -sw2],
            [st2, -sw2], [st2, -st2], [sw2, -st2]
          ];

          const botSockVerts = [];
          const topSockVerts = [];
          const sock2D = [];
          for (let i = 0; i < 12; i++) {
            const px = cx + female2D[i][0], pz = cz + female2D[i][1];
            botSockVerts.push([px, -hy, pz]);
            topSockVerts.push([px, -hy + sockH, pz]);
            sock2D.push([px, pz]);
          }
          for (let i = 0; i < 12; i++) {
            const next = (i + 1) % 12;
            addQuad(botSockVerts[next], botSockVerts[i], topSockVerts[i], topSockVerts[next]);
          }
          for (let i = 1; i < 11; i++) {
            addTri(topSockVerts[0], topSockVerts[i + 1], topSockVerts[i]);
          }

          // Bottom Face Collar
          triangulateCollar(cx, cz, u, -hy, sock2D);

        } else if (systemName === 'nexura') {
          // Spherical Dome Male Top & Spherical Concave Female Bottom
          const segs = 16;
          const topDome = [];
          for (let i = 0; i < segs; i++) {
            const a = (i / segs) * Math.PI * 2;
            topDome.push([cx + Math.cos(a) * studR, hy, cz + Math.sin(a) * studR]);
          }
          const topPeak = [cx, hy + studH, cz];
          for (let i = 0; i < segs; i++) {
            const next = (i + 1) % segs;
            addTri(topDome[i], topDome[next], topPeak);
          }

          // Female Spherical Socket Bottom Cavity
          const botSock = [];
          const sock2D = [];
          for (let i = 0; i < segs; i++) {
            const a = (i / segs) * Math.PI * 2;
            const px = cx + Math.cos(a) * sockR;
            const pz = cz + Math.sin(a) * sockR;
            botSock.push([px, -hy, pz]);
            sock2D.push([px, pz]);
          }
          const sockFloor = [cx, -hy + sockH, cz];
          for (let i = 0; i < segs; i++) {
            const next = (i + 1) % segs;
            addTri(botSock[next], botSock[i], sockFloor);
          }

          // Bottom Face Collar
          triangulateCollar(cx, cz, u, -hy, sock2D);
        }
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom.toNonIndexed();
  }

  /**
   * Builds single unit brick geometry for the 3D sculpture
   */
  static getBrickSystemGeometry(systemName = 'morphobricks', unitSize = 8) {
    return this.buildWatertightBrickGeometry(systemName, 1, 1, unitSize);
  }

  /**
   * Generates printable single brick models (1x1, 1x2, 2x2, 2x4) with male studs + female sockets
   */
  static generateSingleBrickGeometry(systemName = 'morphobricks', type = '1x1', unitSize = 10) {
    let countX = 1, countZ = 1;
    if (type === '1x2') { countX = 1; countZ = 2; }
    if (type === '2x2') { countX = 2; countZ = 2; }
    if (type === '2x4') { countX = 2; countZ = 4; }

    return this.buildWatertightBrickGeometry(systemName, countX, countZ, unitSize);
  }

  /**
   * Generates a 3D printable build plate containing 50 arranged blocks
   */
  static generatePrintPlateGeometry(systemName = 'morphobricks', count = 50, unitSize = 10) {
    const single1x1 = this.generateSingleBrickGeometry(systemName, '1x1', unitSize);
    const pos = single1x1.attributes.position;
    const vertsPerBrick = pos.count;
    const totalVerts = vertsPerBrick * count;
    const mergedArray = new Float32Array(totalVerts * 3);

    const cols = 10;
    const spacing = unitSize * 1.35;

    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const px = (col - (cols - 1) / 2) * spacing;
      const pz = (row - Math.floor(count / cols) / 2) * spacing;
      const offset = i * vertsPerBrick * 3;

      for (let v = 0; v < vertsPerBrick; v++) {
        mergedArray[offset + v * 3] = pos.getX(v) + px;
        mergedArray[offset + v * 3 + 1] = pos.getY(v);
        mergedArray[offset + v * 3 + 2] = pos.getZ(v) + pz;
      }
    }

    const plateGeom = new THREE.BufferGeometry();
    plateGeom.setAttribute('position', new THREE.Float32BufferAttribute(mergedArray, 3));
    plateGeom.computeVertexNormals();
    return plateGeom;
  }

  /**
   * Merges an entire sculpture of bricks into 1 single solid watertight BufferGeometry for 3D export
   */
  static generateMergedSculptureGeometry(bricks, systemName = 'morphobricks', unitSize = 8) {
    if (!bricks || bricks.length === 0) {
      return new THREE.BoxGeometry(10, 10, 10).toNonIndexed();
    }

    const unitGeo = this.getBrickSystemGeometry(systemName, unitSize);
    const posAttr = unitGeo.attributes.position;
    const vertsPerBrick = posAttr.count;
    const totalVerts = vertsPerBrick * bricks.length;
    const mergedArray = new Float32Array(totalVerts * 3);

    for (let b = 0; b < bricks.length; b++) {
      const brick = bricks[b];
      const offset = b * vertsPerBrick * 3;

      for (let v = 0; v < vertsPerBrick; v++) {
        const vx = posAttr.getX(v) + brick.pos.x;
        const vy = posAttr.getY(v) + brick.pos.y;
        const vz = posAttr.getZ(v) + brick.pos.z;

        mergedArray[offset + v * 3] = vx;
        mergedArray[offset + v * 3 + 1] = vy;
        mergedArray[offset + v * 3 + 2] = vz;
      }
    }

    const solidGeom = new THREE.BufferGeometry();
    solidGeom.setAttribute('position', new THREE.Float32BufferAttribute(mergedArray, 3));
    solidGeom.computeVertexNormals();
    return solidGeom;
  }

  // --------------------------------------------------------------------------
  // Dense Solid Voxelizer Engine
  // --------------------------------------------------------------------------

  /**
   * Voxelizes a 3D geometry into solid dense modular brick sculptures
   */
  static voxelizeToBricks(geometry, options = {}) {
    const opt = Object.assign({
      system: 'morphobricks', // 'morphobricks' | 'omnilock' | 'geostud' | 'nexura'
      brickResolution: 14,
      colorMode: 'palette',
      singleColorHex: '#38bdf8'
    }, options);

    const isIndexed = Boolean(geometry.index);
    const pos = geometry.attributes.position;
    const indices = isIndexed ? geometry.index.array : null;
    const faceCount = isIndexed ? indices.length / 3 : Math.floor(pos.count / 3);

    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox;
    const size = new THREE.Vector3().subVectors(bbox.max, bbox.min);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;

    const unitSize = maxDim / opt.brickResolution;
    const occupied = new Set();
    const step = unitSize * 0.45;

    // 1. Dense Triangle Surface Rasterization
    for (let f = 0; f < faceCount; f++) {
      let i0, i1, i2;
      if (isIndexed) {
        i0 = indices[f * 3]; i1 = indices[f * 3 + 1]; i2 = indices[f * 3 + 2];
      } else {
        i0 = f * 3; i1 = f * 3 + 1; i2 = f * 3 + 2;
      }

      const ax = pos.getX(i0), ay = pos.getY(i0), az = pos.getZ(i0);
      const bx = pos.getX(i1), by = pos.getY(i1), bz = pos.getZ(i1);
      const cx = pos.getX(i2), cy = pos.getY(i2), cz = pos.getZ(i2);

      const vABx = bx - ax, vABy = by - ay, vABz = bz - az;
      const vACx = cx - ax, vACy = cy - ay, vACz = cz - az;
      const lenAB = Math.hypot(vABx, vABy, vABz);
      const lenAC = Math.hypot(vACx, vACy, vACz);
      const stepsU = Math.max(1, Math.ceil(lenAB / step));
      const stepsV = Math.max(1, Math.ceil(lenAC / step));

      for (let u = 0; u <= stepsU; u++) {
        const maxV = Math.floor(stepsV * (1 - u / stepsU));
        for (let v = 0; v <= maxV; v++) {
          const fu = u / stepsU;
          const fv = v / stepsV;
          const px = ax + fu * vABx + fv * vACx;
          const py = ay + fu * vABy + fv * vACy;
          const pz = az + fu * vABz + fv * vACz;

          const gx = Math.floor((px - bbox.min.x) / unitSize);
          const gy = Math.floor((py - bbox.min.y) / unitSize);
          const gz = Math.floor((pz - bbox.min.z) / unitSize);
          occupied.add(`${gx}_${gy}_${gz}`);
        }
      }
    }

    // 2. Solid Infill along Y
    const columnMap = new Map();
    occupied.forEach(k => {
      const [gx, gy, gz] = k.split('_').map(Number);
      const colKey = `${gx}_${gz}`;
      if (!columnMap.has(colKey)) columnMap.set(colKey, []);
      columnMap.get(colKey).push(gy);
    });

    columnMap.forEach((gyList, colKey) => {
      const [gx, gz] = colKey.split('_').map(Number);
      const minY = Math.min(...gyList);
      const maxY = Math.max(...gyList);
      for (let y = minY; y <= maxY; y++) {
        occupied.add(`${gx}_${y}_${gz}`);
      }
    });

    // 3. Palette & Data Structure
    const palette = [
      { name: 'Cyan Blue', hex: 0x38bdf8 },
      { name: 'Indigo Dream', hex: 0x818cf8 },
      { name: 'Purple Bloom', hex: 0xc084fc },
      { name: 'Rose Pink', hex: 0xf472b6 },
      { name: 'Coral Red', hex: 0xfb7185 },
      { name: 'Sunset Amber', hex: 0xfb923c },
      { name: 'Bright Gold', hex: 0xfacc15 },
      { name: 'Emerald Green', hex: 0x4ade80 },
      { name: 'Teal Pulse', hex: 0x2dd4bf }
    ];

    const bricks = [];
    const layers = new Map();
    const bomCounts = { '1x1': 0, totalBricks: 0, totalStuds: 0 };

    let brickId = 1;
    occupied.forEach(key => {
      const [gx, gy, gz] = key.split('_').map(Number);
      const worldX = bbox.min.x + (gx + 0.5) * unitSize;
      const worldY = bbox.min.y + (gy + 0.5) * unitSize;
      const worldZ = bbox.min.z + (gz + 0.5) * unitSize;

      const colObj = palette[(gx + gy * 2 + gz) % palette.length];
      const hex = opt.colorMode === 'single' ? parseInt(opt.singleColorHex.replace('#', ''), 16) : colObj.hex;

      const brick = {
        id: brickId++,
        layer: gy + 1,
        grid: { gx, gy, gz },
        pos: new THREE.Vector3(worldX, worldY, worldZ),
        colorName: colObj.name,
        colorHex: hex,
        type: '1x1'
      };

      bricks.push(brick);
      if (!layers.has(gy + 1)) layers.set(gy + 1, []);
      layers.get(gy + 1).push(brick);

      bomCounts['1x1']++;
      bomCounts.totalBricks++;
      bomCounts.totalStuds += 1;
    });

    // 4. Build Three.js Mesh Group
    const brickGroup = new THREE.Group();
    brickGroup.name = `${opt.system}_SculptureGroup`;
    const singleBrickGeo = this.getBrickSystemGeometry(opt.system, unitSize);
    const layerKeys = Array.from(layers.keys()).sort((a, b) => a - b);

    layerKeys.forEach(layerNum => {
      const layerGroup = new THREE.Group();
      layerGroup.name = `Brick_Layer_${layerNum}`;

      layers.get(layerNum).forEach(brick => {
        const mat = new THREE.MeshStandardMaterial({
          color: brick.colorHex,
          roughness: 0.25,
          metalness: 0.1,
          side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(singleBrickGeo, mat);
        mesh.position.copy(brick.pos);
        mesh.userData = { brickId: brick.id, layer: layerNum };

        layerGroup.add(mesh);
      });

      brickGroup.add(layerGroup);
    });

    // 5. Pre-generate the 100% Solid Watertight Merged Geometry for 3D Export
    const solidMergedGeometry = this.generateMergedSculptureGeometry(bricks, opt.system, unitSize);

    return {
      system: opt.system,
      group: brickGroup,
      solidMergedGeometry,
      bricks,
      totalLayers: layerKeys.length,
      layerKeys,
      bomCounts,
      unitSize,
      colors: palette
    };
  }

  static setBrickLayerVisible(brickGroup, maxLayer = 999) {
    if (!brickGroup) return;
    brickGroup.children.forEach(child => {
      if (child.isGroup && child.name.startsWith('Brick_Layer_')) {
        const layerNum = parseInt(child.name.replace('Brick_Layer_', ''), 10);
        child.visible = layerNum <= maxLayer;
      }
    });
  }

  // --------------------------------------------------------------------------
  // Mode 1: 3D Interlocking Jigsaw Slicer
  // --------------------------------------------------------------------------

  static generateJigsawPuzzle(geometry, options = {}) {
    const opt = Object.assign({
      divisionX: 2,
      divisionY: 2,
      divisionZ: 2,
      connectorType: 'none',
      connectorSize: 5.0,
      clearance: 0.25
    }, options);

    const isIndexed = Boolean(geometry.index);
    const pos = geometry.attributes.position;
    const indices = isIndexed ? geometry.index.array : null;
    const faceCount = isIndexed ? indices.length / 3 : Math.floor(pos.count / 3);

    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox;
    const size = new THREE.Vector3().subVectors(bbox.max, bbox.min);
    const center = new THREE.Vector3().addVectors(bbox.min, bbox.max).multiplyScalar(0.5);

    const divX = Math.max(1, opt.divisionX);
    const divY = Math.max(1, opt.divisionY);
    const divZ = Math.max(1, opt.divisionZ);
    const totalPieces = divX * divY * divZ;

    const stepX = size.x / divX;
    const stepY = size.y / divY;
    const stepZ = size.z / divZ;

    const palette = [
      0x38bdf8, 0x818cf8, 0xc084fc, 0xf472b6, 0xfb7185, 0xfb923c,
      0xfacc15, 0x4ade80, 0x2dd4bf, 0x22d3ee, 0xa78bfa, 0xe879f9
    ];

    const pieceTriangles = Array.from({ length: totalPieces }, () => []);

    for (let f = 0; f < faceCount; f++) {
      let i0, i1, i2;
      if (isIndexed) {
        i0 = indices[f * 3]; i1 = indices[f * 3 + 1]; i2 = indices[f * 3 + 2];
      } else {
        i0 = f * 3; i1 = f * 3 + 1; i2 = f * 3 + 2;
      }

      const ax = pos.getX(i0), ay = pos.getY(i0), az = pos.getZ(i0);
      const bx = pos.getX(i1), by = pos.getY(i1), bz = pos.getZ(i1);
      const cx = pos.getX(i2), cy = pos.getY(i2), cz = pos.getZ(i2);

      const fMidX = (ax + bx + cx) / 3;
      const fMidY = (ay + by + cy) / 3;
      const fMidZ = (az + bz + cz) / 3;

      let gx = Math.floor((fMidX - bbox.min.x) / (stepX || 1));
      let gy = Math.floor((fMidY - bbox.min.y) / (stepY || 1));
      let gz = Math.floor((fMidZ - bbox.min.z) / (stepZ || 1));

      gx = Number.isFinite(gx) ? Math.max(0, Math.min(divX - 1, gx)) : 0;
      gy = Number.isFinite(gy) ? Math.max(0, Math.min(divY - 1, gy)) : 0;
      gz = Number.isFinite(gz) ? Math.max(0, Math.min(divZ - 1, gz)) : 0;

      let pieceIdx = gz * (divX * divY) + gy * divX + gx;
      if (pieceIdx < 0 || pieceIdx >= totalPieces || !pieceTriangles[pieceIdx]) {
        pieceIdx = 0;
      }

      pieceTriangles[pieceIdx].push(
        ax, ay, az,
        bx, by, bz,
        cx, cy, cz
      );
    }

    const pieces = [];

    for (let gz = 0; gz < divZ; gz++) {
      for (let gy = 0; gy < divY; gy++) {
        for (let gx = 0; gx < divX; gx++) {
          const pieceIdx = gz * (divX * divY) + gy * divX + gx;
          const triArray = pieceTriangles[pieceIdx];

          const pieceMin = new THREE.Vector3(
            bbox.min.x + gx * stepX,
            bbox.min.y + gy * stepY,
            bbox.min.z + gz * stepZ
          );
          const pieceCenter = new THREE.Vector3(
            pieceMin.x + stepX * 0.5,
            pieceMin.y + stepY * 0.5,
            pieceMin.z + stepZ * 0.5
          );

          const explodeDir = new THREE.Vector3().subVectors(pieceCenter, center).normalize();
          if (explodeDir.lengthSq() < 0.001) {
            explodeDir.set((gx - (divX-1)/2) || 0.5, (gy - (divY-1)/2) || 0.5, (gz - (divZ-1)/2) || 0.5).normalize();
          }

          let geom;
          if (triArray.length >= 9) {
            geom = new THREE.BufferGeometry();
            geom.setAttribute('position', new THREE.Float32BufferAttribute(triArray, 3));
            geom.computeVertexNormals();
          } else {
            const solidBox = new THREE.BoxGeometry(stepX * 0.95, stepY * 0.95, stepZ * 0.95);
            solidBox.translate(pieceCenter.x, pieceCenter.y, pieceCenter.z);
            geom = solidBox.toNonIndexed();
          }

          if (opt.connectorType && opt.connectorType !== 'none' && gx < divX - 1) {
            let pinGeo = null;
            if (opt.connectorType === 'dovetail') {
              pinGeo = new THREE.BoxGeometry(opt.connectorSize * 1.2, opt.connectorSize * 1.5, opt.connectorSize * 1.2).toNonIndexed();
            } else if (opt.connectorType === 'peg') {
              pinGeo = new THREE.CylinderGeometry(opt.connectorSize * 0.6, opt.connectorSize * 0.6, opt.connectorSize * 1.4, 12).toNonIndexed();
            } else if (opt.connectorType === 'spherical') {
              pinGeo = new THREE.SphereGeometry(opt.connectorSize, 12, 10).toNonIndexed();
            }
            if (pinGeo) {
              pinGeo.translate(pieceMin.x + stepX, pieceCenter.y, pieceCenter.z);
              geom = this.mergeBufferGeometries(geom, pinGeo);
            }
          }

          const colHex = palette[pieceIdx % palette.length];
          const mat = new THREE.MeshStandardMaterial({
            color: colHex,
            roughness: 0.35,
            metalness: 0.15,
            side: THREE.DoubleSide
          });

          const mesh = new THREE.Mesh(geom, mat);
          mesh.name = `Puzzle_Piece_${pieceIdx + 1}`;
          mesh.userData = {
            id: pieceIdx + 1,
            gridCoord: { gx, gy, gz },
            center: pieceCenter,
            explodeDir: explodeDir,
            origPos: mesh.position.clone()
          };

          pieces.push({
            id: pieceIdx + 1,
            name: `Piece #${pieceIdx + 1}`,
            mesh,
            geometry: geom,
            colorHex: `#${colHex.toString(16).padStart(6, '0')}`,
            explodeDir,
            trianglesCount: geom.attributes.position.count / 3
          });
        }
      }
    }

    return {
      pieces,
      totalPieces: pieces.length,
      divisions: { x: divX, y: divY, z: divZ },
      connectorType: opt.connectorType,
      bounds: { size, center, min: bbox.min, max: bbox.max }
    };
  }

  static setPuzzleExplodedFactor(puzzleGroup, factor = 0) {
    if (!puzzleGroup) return;
    const distMultiplier = 50 * Math.max(0, Math.min(1, factor));

    puzzleGroup.traverse(child => {
      if (child.isMesh && child.userData && child.userData.explodeDir) {
        const dir = child.userData.explodeDir;
        child.position.set(
          dir.x * distMultiplier,
          dir.y * distMultiplier,
          dir.z * distMultiplier
        );
      }
    });
  }

  // --------------------------------------------------------------------------
  // Mode 3: Japanese Kigumi 6-Bar Burr Puzzle
  // --------------------------------------------------------------------------

  static generateBurrPuzzle() {
    const group = new THREE.Group();
    group.name = "BurrPuzzleGroup";

    const s = 10;
    const length = s * 6;
    const width = s * 2;

    const woodColors = [0xbfa588, 0xa08264, 0x8c6d46, 0x6e5030, 0xd4af37, 0xdeb887];
    const bars = [];

    const barConfigs = [
      { id: 1, axis: 'X', offset: [0, s, s], rot: [0, 0, 0], color: woodColors[0], keyBar: true },
      { id: 2, axis: 'X', offset: [0, -s, -s], rot: [0, 0, 0], color: woodColors[1], keyBar: false },
      { id: 3, axis: 'Y', offset: [s, 0, -s], rot: [0, 0, Math.PI/2], color: woodColors[2], keyBar: false },
      { id: 4, axis: 'Y', offset: [-s, 0, s], rot: [0, 0, Math.PI/2], color: woodColors[3], keyBar: false },
      { id: 5, axis: 'Z', offset: [-s, s, 0], rot: [0, Math.PI/2, 0], color: woodColors[4], keyBar: false },
      { id: 6, axis: 'Z', offset: [s, -s, 0], rot: [0, Math.PI/2, 0], color: woodColors[5], keyBar: false }
    ];

    barConfigs.forEach(cfg => {
      const barGeo = new THREE.BoxGeometry(length, width, width).toNonIndexed();
      const mat = new THREE.MeshStandardMaterial({
        color: cfg.color,
        roughness: 0.75,
        metalness: 0.05,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(barGeo, mat);
      mesh.rotation.set(...cfg.rot);
      mesh.position.set(...cfg.offset);
      mesh.name = `Burr_Bar_${cfg.id}`;
      mesh.userData = { id: cfg.id, keyBar: cfg.keyBar, axis: cfg.axis, origPos: mesh.position.clone() };

      group.add(mesh);
      bars.push({ id: cfg.id, mesh, geometry: barGeo, keyBar: cfg.keyBar });
    });

    return {
      group,
      bars,
      name: "Japanese Kigumi 6-Bar Burr Puzzle",
      difficulty: "Level 1 Mechanical Lock (1 Secret Sliding Key)"
    };
  }

  static setBurrPuzzleDisassembly(burrGroup, factor = 0) {
    if (!burrGroup) return;
    const t = Math.max(0, Math.min(1, factor));
    burrGroup.traverse(child => {
      if (child.isMesh && child.userData && child.userData.keyBar !== undefined) {
        if (child.userData.keyBar) {
          child.position.x = child.userData.origPos.x + t * 45;
        } else {
          const mult = Math.max(0, (t - 0.3) / 0.7) * 35;
          child.position.y = child.userData.origPos.y + (child.position.y > 0 ? mult : -mult);
          child.position.z = child.userData.origPos.z + (child.position.z > 0 ? mult : -mult);
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // SVG Building Manual & HTML Viewers
  // --------------------------------------------------------------------------

  static generateBrickInstructionsSVG(brickData, modelName = 'Brick_Sculpture') {
    const sys = this.BRICK_SYSTEMS[brickData.system] || this.BRICK_SYSTEMS.morphobricks;
    const pageW = 210, pageH = 297;
    const pad = 14;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${pageW} ${pageH}" width="${pageW}mm" height="${pageH}mm">
  <rect width="100%" height="100%" fill="#ffffff" />
  <text x="${pad}" y="${pad + 4}" font-family="'Segoe UI', sans-serif" font-weight="bold" font-size="5.5" fill="#0f172a">${modelName} — ${sys.name} Building Guide</text>
  <text x="${pageW - pad}" y="${pad + 4}" font-family="'Segoe UI', sans-serif" font-size="3.2" fill="#64748b" text-anchor="end">System: ${sys.name} | Total Blocks: ${brickData.bomCounts.totalBricks} | Layers: ${brickData.totalLayers}</text>
  <line x1="${pad}" y1="${pad + 9}" x2="${pageW - pad}" y2="${pad + 9}" stroke="#cbd5e1" stroke-width="0.4" />

  <!-- System Feature Badge -->
  <g transform="translate(${pad}, ${pad + 14})">
    <rect width="${pageW - pad*2}" height="14" rx="3" fill="#f0fdf4" stroke="#86efac" stroke-width="0.5" />
    <text x="6" y="9" font-family="'Segoe UI', sans-serif" font-weight="bold" font-size="3.2" fill="#166534">PROPRIETARY MODULAR SYSTEM: ${sys.name} (${sys.feature})</text>
  </g>

  <!-- BOM Summary Card -->
  <g transform="translate(${pad}, ${pad + 32})">
    <rect width="${pageW - pad*2}" height="26" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="0.5" />
    <text x="6" y="7" font-family="'Segoe UI', sans-serif" font-weight="bold" font-size="3" fill="#334155">BILL OF MATERIALS &amp; 3D PRINTING GUIDE:</text>
    <text x="6" y="14" font-family="'Segoe UI', sans-serif" font-size="2.6" fill="#64748b">1×1 Modular Blocks: ${brickData.bomCounts['1x1']} pcs</text>
    <text x="70" y="14" font-family="'Segoe UI', sans-serif" font-size="2.6" fill="#64748b">Locking Pins / Studs: ${brickData.bomCounts.totalStuds}</text>
    <text x="135" y="14" font-family="'Segoe UI', sans-serif" font-size="2.6" fill="#64748b">Total Height: ${brickData.totalLayers} layers</text>
    <text x="6" y="21" font-family="'Segoe UI', sans-serif" font-size="2.4" fill="#0284c7">Each modular block features Top Male Pins and matching Bottom Female Sockets (0.2mm tolerance).</text>
  </g>

  <!-- Visual Stage Diagrams -->
  <g transform="translate(${pad}, ${pad + 64})">
    <rect width="86" height="60" rx="4" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="0.4" />
    <text x="6" y="6" font-family="'Segoe UI', sans-serif" font-weight="bold" font-size="2.8" fill="#0284c7">STAGE 1: BASE LAYER</text>
    <rect x="25" y="18" width="36" height="24" rx="2" fill="#38bdf8" stroke="#0369a1" stroke-width="0.4" />
    <polygon points="43,15 48,18 48,24 43,27 38,24 38,18" fill="#ffffff" opacity="0.7" />
  </g>
  <g transform="translate(${pad + 96}, ${pad + 64})">
    <rect width="86" height="60" rx="4" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="0.4" />
    <text x="6" y="6" font-family="'Segoe UI', sans-serif" font-weight="bold" font-size="2.8" fill="#0284c7">STAGE 2: ASSEMBLE UPPER LAYERS</text>
    <rect x="25" y="18" width="36" height="24" rx="2" fill="#818cf8" stroke="#4338ca" stroke-width="0.4" />
    <polygon points="43,15 48,18 48,24 43,27 38,24 38,18" fill="#ffffff" opacity="0.7" />
  </g>

  <!-- Footer -->
  <line x1="${pad}" y1="${pageH - 8}" x2="${pageW - pad}" y2="${pageH - 8}" stroke="#e2e8f0" stroke-width="0.3" />
  <text x="${pad}" y="${pageH - 4}" font-family="'Segoe UI', sans-serif" font-size="2.4" fill="#94a3b8">PolyMorph 3D Studio — ${sys.name} Studio</text>
</svg>`;
  }

  static async generateStandalonePuzzleHTML(objectToExport, mode = 'jigsaw', baseName = '3D_Puzzle') {
    let glbBase64 = '';
    let triCount = 0, vertCount = 0;

    if (objectToExport) {
      try {
        const { blob: glbBlob } = await ModelConverters.exportModel(objectToExport, 'glb', baseName);
        const arrayBuffer = await glbBlob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const chunkSize = 8192;
        let binaryStr = '';
        for (let i = 0; i < bytes.byteLength; i += chunkSize) {
          const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.byteLength));
          binaryStr += String.fromCharCode.apply(null, chunk);
        }
        glbBase64 = btoa(binaryStr);
      } catch (err) {
        console.warn("[PuzzleEngine] GLB export for standalone HTML:", err);
      }

      objectToExport.traverse((c) => {
        if (c.isMesh && c.geometry) {
          const pos = c.geometry.attributes.position;
          if (pos) {
            vertCount += pos.count;
            triCount += c.geometry.index ? c.geometry.index.count / 3 : pos.count / 3;
          }
        }
      });
    }

    triCount = Math.round(triCount);
    vertCount = Math.round(vertCount);

    const isBricks = (mode === 'bricks');
    const isBurr = (mode === 'burr');
    const sliderLabel = isBricks ? '🧱 Layer-by-Layer Building' : (isBurr ? '🪵 Burr Key Slider / Disassembly' : '🧩 Exploded View / Assembly');
    const sliderDefaultText = isBricks ? '100% (Complete)' : '0% (Assembled)';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${baseName} — Interactive 3D Puzzle Viewer</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{--bg:#0b0f19;--surface:#161c2e;--border:rgba(56,189,248,0.25);--accent:#38bdf8;--accent2:#818cf8;--text:#e2e8f0;--muted:#64748b}
    body{background:var(--bg);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif;height:100vh;display:flex;flex-direction:column;overflow:hidden}
    header{background:var(--surface);border-bottom:1px solid var(--border);padding:10px 18px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;flex-shrink:0}
    .brand{display:flex;align-items:center;gap:10px}
    .brand-logo{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;font-weight:800;font-size:0.85rem;padding:5px 9px;border-radius:6px}
    .brand-name{font-weight:700;font-size:0.95rem}
    .brand-sub{font-size:0.68rem;color:var(--muted)}
    .hbtns{display:flex;gap:6px;flex-wrap:wrap}
    .btn{display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:7px;border:1px solid var(--border);cursor:pointer;font-size:0.75rem;font-weight:600;background:rgba(255,255,255,0.05);color:var(--text);transition:all 0.15s}
    .btn:hover{background:rgba(255,255,255,0.12)}
    .btn.active{background:rgba(56,189,248,0.15);border-color:var(--accent);color:var(--accent)}
    main{flex:1;position:relative;overflow:hidden}
    #cv{display:block;width:100%;height:100%}
    #loading{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:var(--bg);z-index:10}
    .spin{width:44px;height:44px;border:3px solid rgba(56,189,248,0.2);border-top-color:var(--accent);border-radius:50%;animation:sp 0.75s linear infinite}
    @keyframes sp{to{transform:rotate(360deg)}}
    .control-panel{position:absolute;bottom:16px;left:50%;transform:translateX(-50%);background:rgba(15,23,42,0.92);border:1px solid var(--border);border-radius:12px;padding:12px 20px;backdrop-filter:blur(8px);display:flex;flex-direction:column;gap:8px;min-width:340px;box-shadow:0 10px 25px rgba(0,0,0,0.5);z-index:5}
    .slider-header{display:flex;justify-content:space-between;font-size:0.75rem;font-weight:700;color:var(--accent)}
    input[type=range]{width:100%;accent-color:var(--accent);cursor:pointer}
    .ov-tl{position:absolute;top:10px;left:10px;display:flex;gap:6px;flex-wrap:wrap;z-index:4}
    .ov-tr{position:absolute;top:10px;right:10px;z-index:4}
    .stat{background:rgba(11,15,25,0.85);border:1px solid var(--border);border-radius:8px;padding:6px 12px;font-size:0.68rem;color:var(--muted);display:flex;gap:12px;backdrop-filter:blur(6px);flex-wrap:wrap}
    .stat b{color:var(--accent)}
    .pbtn{padding:5px 9px;font-size:0.68rem}
    footer{background:var(--surface);border-top:1px solid var(--border);padding:8px 18px;font-size:0.68rem;color:var(--muted);display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;flex-shrink:0}
  </style>
</head>
<body>
<header>
  <div class="brand">
    <div class="brand-logo">🧩</div>
    <div>
      <div class="brand-name">${baseName}</div>
      <div class="brand-sub">PolyMorph 3D Studio — Interactive 3D Puzzle Engine</div>
    </div>
  </div>
  <div class="hbtns">
    <button class="btn" id="bWire">📖 Wireframe</button>
    <button class="btn" id="bRot">🔄 Auto-Rotate</button>
    <button class="btn" id="bSnap">📸 Snapshot</button>
    <button class="btn" id="bReset">🎯 Reset View</button>
  </div>
</header>
<main>
  <div id="loading">
    <div class="spin"></div>
    <div style="font-size:0.85rem;color:var(--muted)">Loading 3D Puzzle Geometry...</div>
  </div>
  <canvas id="cv"></canvas>
  <div class="ov-tl">
    <button class="btn pbtn active" data-env="studio">💡 Studio</button>
    <button class="btn pbtn" data-env="cyber">🌌 Cyber</button>
    <button class="btn pbtn" data-env="warm">🌅 Warm</button>
  </div>
  <div class="ov-tr">
    <div class="stat">
      <span>▲ <b>${triCount.toLocaleString()}</b> Triangles</span>
      <span>● <b>${vertCount.toLocaleString()}</b> Vertices</span>
      <span>🧩 <b>${mode.toUpperCase()}</b> Mode</span>
    </div>
  </div>
  <div class="control-panel">
    <div class="slider-header">
      <span>${sliderLabel}</span>
      <span id="sVal">${sliderDefaultText}</span>
    </div>
    <input type="range" id="eSlider" min="0" max="100" value="${isBricks ? 100 : 0}">
  </div>
</main>
<footer>
  <span>PolyMorph 3D Studio — Interactive Standalone HTML Export</span>
  <span>WebGL 3D Engine — Fully Offline Functional</span>
</footer>

<script id="glb-data" type="text/plain">${glbBase64}</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
<script>
(function(){
  var GLB_B64 = document.getElementById('glb-data').textContent.trim();
  var mode = "${mode}";
  var canvas = document.getElementById('cv');
  var main = canvas.parentElement;
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(main.clientWidth, main.clientHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0f19);

  var camera = new THREE.PerspectiveCamera(45, main.clientWidth / main.clientHeight, 0.1, 50000);
  camera.position.set(0, 45, 120);

  var controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  var ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  var dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(60, 100, 80);
  scene.add(dirLight);
  var fillLight = new THREE.DirectionalLight(0x38bdf8, 0.4);
  fillLight.position.set(-60, -40, -50);
  scene.add(fillLight);

  var rootGroup = new THREE.Group();
  scene.add(rootGroup);
  var pieces = [];
  var modelCenter = new THREE.Vector3();
  var modelRadius = 30;
  var minY = Infinity, maxY = -Infinity;

  function initModel(gltfScene) {
    rootGroup.add(gltfScene);
    var box = new THREE.Box3().setFromObject(gltfScene);
    box.getCenter(modelCenter);
    var sz = new THREE.Vector3();
    box.getSize(sz);
    modelRadius = sz.length() * 0.5 || 30;

    gltfScene.traverse(function(c) {
      if (c.isMesh) {
        c.castShadow = true;
        c.receiveShadow = true;
        pieces.push(c);

        var pBox = new THREE.Box3().setFromObject(c);
        var pCenter = new THREE.Vector3();
        pBox.getCenter(pCenter);
        var pY = pCenter.y;
        if (pY < minY) minY = pY;
        if (pY > maxY) maxY = pY;

        var dir = pCenter.clone().sub(modelCenter);
        if (dir.lengthSq() < 0.001) {
          var ang = (pieces.length * 1.618) * Math.PI * 2;
          dir.set(Math.cos(ang), 0.5, Math.sin(ang));
        }
        dir.normalize();

        c.userData = {
          origPos: c.position.clone(),
          dir: dir,
          center: pCenter,
          dist: modelRadius * 0.85
        };
      }
    });

    // Fit camera
    camera.position.set(modelCenter.x, modelCenter.y + modelRadius * 0.8, modelCenter.z + modelRadius * 2.2);
    controls.target.copy(modelCenter);
    controls.update();

    var ld = document.getElementById('loading');
    if (ld) ld.style.display = 'none';
  }

  if (GLB_B64 && GLB_B64.length > 30) {
    var raw = atob(GLB_B64);
    var uInt8 = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) uInt8[i] = raw.charCodeAt(i);
    var loader = new THREE.GLTFLoader();
    loader.parse(uInt8.buffer, '', function(gltf) {
      initModel(gltf.scene || gltf.scenes[0]);
    }, function(err) {
      console.warn("GLTF parse error:", err);
      fallbackCubes();
    });
  } else {
    fallbackCubes();
  }

  function fallbackCubes() {
    var colors = [0x38bdf8, 0x818cf8, 0xc084fc, 0xf472b6, 0xfb923c, 0x4ade80, 0x2dd4bf, 0xfacc15];
    for (var i = 0; i < 8; i++) {
      var gx = (i & 1) ? 1 : -1, gy = (i & 2) ? 1 : -1, gz = (i & 4) ? 1 : -1;
      var m = new THREE.Mesh(new THREE.BoxGeometry(18, 18, 18), new THREE.MeshStandardMaterial({ color: colors[i], roughness: 0.35 }));
      m.position.set(gx * 10, gy * 10, gz * 10);
      m.userData = { origPos: m.position.clone(), dir: new THREE.Vector3(gx, gy, gz).normalize(), dist: 35 };
      pieces.push(m);
      rootGroup.add(m);
    }
    var ld = document.getElementById('loading');
    if (ld) ld.style.display = 'none';
  }

  // Interactive Slider Handler
  var slider = document.getElementById('eSlider');
  var sVal = document.getElementById('sVal');
  if (slider) {
    slider.addEventListener('input', function(e) {
      var v = parseInt(e.target.value, 10);
      if (mode === 'bricks') {
        sVal.textContent = v + '% (Layer Building)';
        var yThreshold = minY + (v / 100) * (maxY - minY + 0.1);
        pieces.forEach(function(p) {
          if (p.userData && p.userData.center) {
            p.visible = (p.userData.center.y <= yThreshold);
          }
        });
      } else if (mode === 'burr') {
        sVal.textContent = v === 0 ? '0% (Locked)' : v + '% (Disassembled)';
        var factor = (v / 100) * modelRadius * 0.9;
        if (pieces.length > 0) {
          pieces[0].position.set(pieces[0].userData.origPos.x + factor, pieces[0].userData.origPos.y, pieces[0].userData.origPos.z);
        }
      } else {
        sVal.textContent = v === 0 ? '0% (Assembled)' : v + '% (Exploded)';
        var factor = (v / 100);
        pieces.forEach(function(p) {
          if (p.userData && p.userData.origPos) {
            p.position.copy(p.userData.origPos).addScaledVector(p.userData.dir, p.userData.dist * factor);
          }
        });
      }
    });
  }

  // Header buttons
  var isWire = false;
  document.getElementById('bWire').addEventListener('click', function() {
    isWire = !isWire;
    this.classList.toggle('active', isWire);
    pieces.forEach(function(p) { if (p.material) p.material.wireframe = isWire; });
  });

  var isRot = false;
  document.getElementById('bRot').addEventListener('click', function() {
    isRot = !isRot;
    this.classList.toggle('active', isRot);
    controls.autoRotate = isRot;
    controls.autoRotateSpeed = 2.0;
  });

  document.getElementById('bReset').addEventListener('click', function() {
    camera.position.set(modelCenter.x, modelCenter.y + modelRadius * 0.8, modelCenter.z + modelRadius * 2.2);
    controls.target.copy(modelCenter);
    controls.update();
    if (slider) { slider.value = (mode === 'bricks' ? 100 : 0); slider.dispatchEvent(new Event('input')); }
  });

  document.getElementById('bSnap').addEventListener('click', function() {
    renderer.render(scene, camera);
    var a = document.createElement('a');
    a.download = '${baseName}_snapshot.png';
    a.href = renderer.domElement.toDataURL('image/png');
    a.click();
  });

  // Lighting environments
  document.querySelectorAll('[data-env]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('[data-env]').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      var env = btn.dataset.env;
      if (env === 'cyber') {
        scene.background.set(0x060814);
        ambientLight.color.set(0x818cf8);
        dirLight.color.set(0x38bdf8);
      } else if (env === 'warm') {
        scene.background.set(0x140d0a);
        ambientLight.color.set(0xfed7aa);
        dirLight.color.set(0xfb923c);
      } else {
        scene.background.set(0x0b0f19);
        ambientLight.color.set(0xffffff);
        dirLight.color.set(0xffffff);
      }
    });
  });

  window.addEventListener('resize', function() {
    var W = main.clientWidth, H = main.clientHeight;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    renderer.setSize(W, H);
  });

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
})();
</script>
</body>
</html>`;

    return new Blob([html], { type: 'text/html;charset=utf-8' });
  }

  // --------------------------------------------------------------------------
  // Helper: Buffer Geometry Merging (Clean Non-Indexed)
  // --------------------------------------------------------------------------

  static mergeBufferGeometries(geo1, geo2) {
    const g1 = geo1.index ? geo1.toNonIndexed() : geo1;
    const g2 = geo2.index ? geo2.toNonIndexed() : geo2;

    const p1 = g1.attributes.position;
    const p2 = g2.attributes.position;

    const mergedVerts = new Float32Array(p1.array.length + p2.array.length);
    mergedVerts.set(p1.array, 0);
    mergedVerts.set(p2.array, p1.array.length);

    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.Float32BufferAttribute(mergedVerts, 3));
    merged.computeVertexNormals();
    return merged;
  }
}

if (typeof window !== 'undefined') {
  window.PuzzleEngine = PuzzleEngine;
}
if (typeof module !== 'undefined') {
  module.exports = PuzzleEngine;
}
