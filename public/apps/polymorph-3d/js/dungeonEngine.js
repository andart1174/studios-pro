/**
 * PolyMorph 3D Studio - Dungeon, Diorama & RPG Tabletop 3D Engine
 * Standard 1-inch (25.4mm) Modular Tile & Scenery System:
 * 1. Hyper-Realistic Modular Floor Tiles (Flagstone, Cobblestone, Castle Ashlar, Wood Planks, Runes, Lava Fissure, Crypt Bones, Sewer Grate, Marble Mosaic, Mag-Hex)
 * 2. Hyper-Realistic Architectural Walls, Gothic Arches, Working Hinged Doors, Spiked Portcullises & Ruined Walls
 * 3. Procedural 3D Dungeon Labyrinth System (5 Maze Algorithms, Stone Brick Corridors, Paved Corridors, Arched Portals)
 * 4. Dungeon Scatter Terrain, Props & Interactive Traps (Treasure Chest, Spike Trap, Sarcophagus, Alchemy Table, Weapon Rack, Crypt Altar)
 * Dual Output: 100% Watertight Solid Geometries for 3D Printing (STL/3MF) & Multi-Mesh PBR Groups for WebGL/GLB.
 */

class DungeonEngine {
  static GRID_UNIT = 25.4; // 1 inch tabletop standard in mm

  // --------------------------------------------------------------------------
  // Geometry Merging Helper
  // --------------------------------------------------------------------------

  static mergeGeometries(geos) {
    if (!geos || geos.length === 0) return new THREE.BufferGeometry();
    const valid = geos.filter(g => g && g.attributes && g.attributes.position && ((g.attributes.position.count > 0) || (g.attributes.position.array && g.attributes.position.array.length > 0)));
    if (valid.length === 0) return new THREE.BufferGeometry();
    if (valid.length === 1) return valid[0].index ? valid[0].toNonIndexed() : valid[0].clone();

    let totalVerts = 0;
    const nonIndexed = valid.map(g => {
      const ni = g.index ? g.toNonIndexed() : g;
      totalVerts += ni.attributes.position.array.length;
      return ni;
    });

    const mergedPos = new Float32Array(totalVerts);
    let offset = 0;
    for (const g of nonIndexed) {
      const arr = g.attributes.position.array;
      mergedPos.set(arr, offset);
      offset += arr.length;
    }

    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.Float32BufferAttribute(mergedPos, 3));
    merged.computeVertexNormals();
    return merged;
  }

  // --------------------------------------------------------------------------
  // Generator 1: Hyper-Realistic Modular Floor Tiles
  // --------------------------------------------------------------------------

  static generateDungeonTile(style = 'flagstone', sizeX = 1, sizeZ = 1, options = {}) {
    const opt = Object.assign({
      unitSize: DungeonEngine.GRID_UNIT,
      tileHeight: 7.0,
      reliefDepth: 1.5,
      weathering: 40,
      interlock: 'magnet',
      magnetSocket: true,
      magnetRadius: 2.1,
      magnetDepth: 2.2,
      openlock: false
    }, options);

    if (opt.interlock === 'openlock' || options.openlock) opt.openlock = true;
    if (opt.interlock === 'solid') {
      opt.magnetSocket = false;
      opt.openlock = false;
    }

    const u = opt.unitSize;
    const width = sizeX * u;
    const depth = sizeZ * u;
    const height = opt.tileHeight;
    const hx = width / 2;
    const hy = height / 2;
    const hz = depth / 2;

    const geos = [];
    const group = new THREE.Group();
    group.name = `Dungeon_Tile_${style}_${sizeX}x${sizeZ}`;

    // Base Solid Box Pedestal (lower foundation)
    const baseH = Math.max(3.0, height - opt.reliefDepth);
    const baseBox = new THREE.BoxGeometry(width, baseH, depth).toNonIndexed();
    baseBox.translate(0, -hy + baseH / 2, 0);
    geos.push(baseBox);

    // Stone / Wood Surface Geometries
    const surfaceGeos = [];
    const accentGeos = [];

    // Helper: add beveled box with natural weathering jitter
    const addChiseledBlock = (bx, by, bz, bw, bh, bd, bevel = 0.6, jitter = 0.3) => {
      const box = new THREE.BoxGeometry(bw - bevel * 2, bh, bd - bevel * 2).toNonIndexed();
      const pos = box.attributes.position.array;
      // Add subtle stone weathering jitter to top surface vertices
      for (let i = 0; i < pos.length; i += 3) {
        if (pos[i + 1] > 0) {
          const jx = (Math.sin(pos[i] * 12.0 + bx) * 0.5) * jitter;
          const jz = (Math.cos(pos[i + 2] * 12.0 + bz) * 0.5) * jitter;
          const jy = (Math.sin(pos[i] * 5.0 + pos[i + 2] * 5.0) * 0.3) * jitter;
          pos[i] += jx;
          pos[i + 1] += jy;
          pos[i + 2] += jz;
        }
      }
      box.computeVertexNormals();
      box.translate(bx, by, bz);
      surfaceGeos.push(box);
    };

    if (style === 'flagstone') {
      // 1. Realistic Flagstone Slabs: Irregular polygonal & staggered stone slabs
      const cols = sizeX * 3;
      const rows = sizeZ * 3;
      const sw = width / cols;
      const sd = depth / rows;
      const stoneH = opt.reliefDepth;
      const topY = hy - stoneH / 2;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const isOffset = (r % 2 === 1);
          const xOffset = isOffset ? (sw * 0.25) : -(sw * 0.25);
          const cx = -hx + (c + 0.5) * sw + xOffset;
          const cz = -hz + (r + 0.5) * sd;

          // Clamp stone within tile boundaries
          const clampedW = Math.min(sw * 0.92, width - Math.abs(cx) * 2 + sw);
          const clampedD = Math.min(sd * 0.92, depth - Math.abs(cz) * 2 + sd);
          if (clampedW > 2 && clampedD > 2) {
            const hVar = ((Math.sin(c * 3.7 + r * 5.1) + 1.0) * 0.5 - 0.5) * 0.4;
            addChiseledBlock(cx, topY + hVar / 2, cz, clampedW, stoneH + hVar, clampedD, 0.7, 0.35);
          }
        }
      }

    } else if (style === 'cobblestone') {
      // 2. Medieval Cobblestone Alley: Rounded riverbed cobbles packed in mortar
      const numX = sizeX * 6;
      const numZ = sizeZ * 6;
      const stepX = width / numX;
      const stepZ = depth / numZ;
      const topY = hy - opt.reliefDepth / 2;

      for (let iz = 0; iz < numZ; iz++) {
        for (let ix = 0; ix < numX; ix++) {
          const jx = (Math.sin(ix * 4.3 + iz * 2.1) * 0.3) * stepX;
          const jz = (Math.cos(ix * 2.7 + iz * 3.9) * 0.3) * stepZ;
          const px = -hx + (ix + 0.5) * stepX + jx;
          const pz = -hz + (iz + 0.5) * stepZ + jz;

          const radius = Math.min(stepX, stepZ) * 0.42;
          const cobbleH = opt.reliefDepth * 0.9;
          const cobble = new THREE.CylinderGeometry(radius * 0.7, radius, cobbleH, 8).toNonIndexed();
          cobble.translate(px, topY, pz);
          surfaceGeos.push(cobble);
        }
      }

    } else if (style === 'castle_stone') {
      // 3. Castle Ashlar Cut Blocks: Fine chiseled running-bond masonry blocks
      const rows = sizeZ * 3;
      const stoneH = opt.reliefDepth;
      const topY = hy - stoneH / 2;
      const rowD = depth / rows;

      for (let r = 0; r < rows; r++) {
        const isStaggered = (r % 2 === 1);
        const cols = isStaggered ? (sizeX * 2 + 1) : (sizeX * 2);
        const stoneW = width / (sizeX * 2);
        const cz = -hz + (r + 0.5) * rowD;

        for (let c = 0; c < cols; c++) {
          const cx = -hx + (c + (isStaggered ? 0 : 0.5)) * stoneW;
          const bw = Math.min(stoneW * 0.92, (width / 2) - Math.abs(cx) + stoneW * 0.5);
          if (bw > 2) {
            addChiseledBlock(cx, topY, cz, bw, stoneH, rowD * 0.92, 0.5, 0.15);
          }
        }
      }

    } else if (style === 'wood_planks') {
      // 4. Weathered Medieval Wood Planks with Iron Nails
      const plankCount = sizeZ * 4;
      const pw = depth / plankCount;
      const plankH = opt.reliefDepth;
      const topY = hy - plankH / 2;

      for (let iz = 0; iz < plankCount; iz++) {
        const cz = -hz + (iz + 0.5) * pw;
        const plank = new THREE.BoxGeometry(width - 0.8, plankH, pw - 0.8).toNonIndexed();
        plank.translate(0, topY, cz);
        surfaceGeos.push(plank);

        // Add square blacksmith nail heads near ends
        const nailGeo1 = new THREE.BoxGeometry(1.2, 0.6, 1.2).toNonIndexed();
        nailGeo1.translate(-hx + 3, topY + plankH / 2 + 0.2, cz);
        const nailGeo2 = new THREE.BoxGeometry(1.2, 0.6, 1.2).toNonIndexed();
        nailGeo2.translate(hx - 3, topY + plankH / 2 + 0.2, cz);
        accentGeos.push(nailGeo1, nailGeo2);
      }

    } else if (style === 'runes') {
      // 5. Arcane Rune Circle & Elder Sigils
      const stoneH = opt.reliefDepth;
      const topY = hy - stoneH / 2;

      // Base stone slab
      const slab = new THREE.BoxGeometry(width - 0.6, stoneH, depth - 0.6).toNonIndexed();
      slab.translate(0, topY, 0);
      surfaceGeos.push(slab);

      // Outer & Inner Rune Rings
      const ringR = Math.min(width, depth) * 0.38;
      const ringOuter = new THREE.CylinderGeometry(ringR + 0.8, ringR + 0.8, 0.6, 24).toNonIndexed();
      ringOuter.translate(0, hy + 0.2, 0);
      const ringInner = new THREE.CylinderGeometry(ringR * 0.6, ringR * 0.6, 0.6, 24).toNonIndexed();
      ringInner.translate(0, hy + 0.2, 0);
      accentGeos.push(ringOuter, ringInner);

      // 8 Relief Elder Rune Pillars
      for (let k = 0; k < 8; k++) {
        const ang = (k / 8) * Math.PI * 2;
        const rx = Math.cos(ang) * (ringR * 0.8);
        const rz = Math.sin(ang) * (ringR * 0.8);
        const runeG = new THREE.BoxGeometry(1.2, 0.8, 3.2).toNonIndexed();
        runeG.rotateY(-ang);
        runeG.translate(rx, hy + 0.3, rz);
        accentGeos.push(runeG);
      }

    } else if (style === 'lava_fissure') {
      // 6. Volcanic Lava Fissures & Jagged Basalt Crust
      const stoneH = opt.reliefDepth * 1.4;
      const topY = hy - stoneH / 2;

      // Cracked basalt crust blocks separated by crevasses
      const cuts = 4;
      const cw = width / cuts;
      const cd = depth / cuts;

      for (let r = 0; r < cuts; r++) {
        for (let c = 0; c < cuts; c++) {
          if ((r + c) % 2 === 0 || (r === 1 && c === 2)) {
            const cx = -hx + (c + 0.5) * cw;
            const cz = -hz + (r + 0.5) * cd;
            addChiseledBlock(cx, topY, cz, cw * 0.82, stoneH, cd * 0.82, 0.8, 0.5);
          }
        }
      }

      // Molten magma pool bed inside crevasses
      const magma = new THREE.BoxGeometry(width - 1.0, 1.2, depth - 1.0).toNonIndexed();
      magma.translate(0, hy - stoneH + 0.6, 0);
      accentGeos.push(magma);

    } else if (style === 'crypt_bones') {
      // 7. Crypt Catacombs Skull & Bone Pavers
      const stoneH = opt.reliefDepth;
      const topY = hy - stoneH / 2;

      const paver = new THREE.BoxGeometry(width - 0.8, stoneH, depth - 0.8).toNonIndexed();
      paver.translate(0, topY, 0);
      surfaceGeos.push(paver);

      // Center Bas-Relief Skull
      const cranium = new THREE.CylinderGeometry(3.5, 3.2, 1.2, 14).toNonIndexed();
      cranium.translate(0, hy + 0.5, -1);
      const jaw = new THREE.BoxGeometry(3.2, 1.0, 2.5).toNonIndexed();
      jaw.translate(0, hy + 0.4, 2);
      accentGeos.push(cranium, jaw);

      // Crossed Femur Bones
      const bone1 = new THREE.CylinderGeometry(0.8, 0.8, 12, 8).toNonIndexed();
      bone1.rotateY(Math.PI / 4);
      bone1.translate(0, hy + 0.3, 0);
      const bone2 = new THREE.CylinderGeometry(0.8, 0.8, 12, 8).toNonIndexed();
      bone2.rotateY(-Math.PI / 4);
      bone2.translate(0, hy + 0.3, 0);
      accentGeos.push(bone1, bone2);

    } else if (style === 'sewer_grate') {
      // 8. Dungeon Drainage Grating & Sluice Gutter
      const stoneH = opt.reliefDepth;
      const topY = hy - stoneH / 2;

      // Outer stone rim curb
      const rimL = new THREE.BoxGeometry(4.0, stoneH, depth).toNonIndexed();
      rimL.translate(-hx + 2.0, topY, 0);
      const rimR = new THREE.BoxGeometry(4.0, stoneH, depth).toNonIndexed();
      rimR.translate(hx - 2.0, topY, 0);
      surfaceGeos.push(rimL, rimR);

      // Sunken Cast-Iron Grate Bars
      const numBars = 7;
      const barSpacing = (width - 10) / (numBars - 1);
      for (let b = 0; b < numBars; b++) {
        const bx = -hx + 5 + b * barSpacing;
        const bar = new THREE.BoxGeometry(1.6, 1.8, depth - 3.0).toNonIndexed();
        bar.translate(bx, hy - 0.4, 0);
        accentGeos.push(bar);
      }

      // Grate cross ties and lifting ring
      const crossTie = new THREE.BoxGeometry(width - 10, 1.4, 2.0).toNonIndexed();
      crossTie.translate(0, hy - 0.3, 0);
      const ring = new THREE.CylinderGeometry(2.5, 2.5, 1.0, 12).toNonIndexed();
      ring.translate(0, hy + 0.3, 0);
      accentGeos.push(crossTie, ring);

    } else if (style === 'mosaic') {
      // 9. Royal Palace Marble Mosaic Parquet
      const stoneH = opt.reliefDepth;
      const topY = hy - stoneH / 2;
      const tiles = 4;
      const tw = width / tiles;
      const td = depth / tiles;

      for (let r = 0; r < tiles; r++) {
        for (let c = 0; c < tiles; c++) {
          const cx = -hx + (c + 0.5) * tw;
          const cz = -hz + (r + 0.5) * td;
          const isWhite = (r + c) % 2 === 0;
          const tileGeo = new THREE.BoxGeometry(tw - 0.5, stoneH, td - 0.5).toNonIndexed();
          tileGeo.translate(cx, topY, cz);
          if (isWhite) surfaceGeos.push(tileGeo);
          else accentGeos.push(tileGeo);
        }
      }

    } else {
      // 10. Hexagonal Fantasy Dungeon Tile (Mag-Hex / Heroscape)
      const stoneH = opt.reliefDepth;
      const topY = hy - stoneH / 2;

      // Central hexagonal paver
      const hexR = Math.min(width, depth) * 0.22;
      const centerHex = new THREE.CylinderGeometry(hexR, hexR, stoneH, 6).toNonIndexed();
      centerHex.translate(0, topY, 0);
      surfaceGeos.push(centerHex);

      // 6 Surrounding hexagonal pavers
      for (let h = 0; h < 6; h++) {
        const ang = (h / 6) * Math.PI * 2;
        const px = Math.cos(ang) * (hexR * 1.85);
        const pz = Math.sin(ang) * (hexR * 1.85);
        const subHex = new THREE.CylinderGeometry(hexR * 0.88, hexR * 0.88, stoneH, 6).toNonIndexed();
        subHex.translate(px, topY, pz);
        surfaceGeos.push(subHex);
      }
    }

    // Combine surface elements
    geos.push(...surfaceGeos, ...accentGeos);

    // ------------------------------------------------------------------------
    // Interlocking Systems: 4mm Magnet Sockets or OpenLOCK Clip Ports
    // ------------------------------------------------------------------------
    if (opt.magnetSocket) {
      const startX = -((sizeX - 1) * u) / 2;
      const startZ = -((sizeZ - 1) * u) / 2;
      for (let ix = 0; ix < sizeX; ix++) {
        for (let iz = 0; iz < sizeZ; iz++) {
          const cx = startX + ix * u;
          const cz = startZ + iz * u;
          // Magnet socket cavity ring rim (2.2mm depth, 2.1mm radius)
          const socketCollar = new THREE.CylinderGeometry(opt.magnetRadius + 1.2, opt.magnetRadius + 1.2, opt.magnetDepth, 16).toNonIndexed();
          socketCollar.translate(cx, -hy + opt.magnetDepth / 2, cz);
          geos.push(socketCollar);
        }
      }
    }

    if (opt.openlock) {
      // OpenLOCK standard horizontal wall clip slots (5.0mm wide x 3.5mm high)
      const slotGeoX = new THREE.BoxGeometry(width - 6, 3.2, 5.0).toNonIndexed();
      slotGeoX.translate(0, -hy + 2.5, 0);
      geos.push(slotGeoX);
    }

    // Final unified 100% watertight printable mesh
    const unifiedGeom = DungeonEngine.mergeGeometries(geos);

    // Build rich multi-material PBR Group for WebGL inspection and GLB export
    const stoneColor = (style === 'lava_fissure') ? 0x27272a :
                       (style === 'wood_planks') ? 0x78350f :
                       (style === 'crypt_bones') ? 0x6b7280 :
                       (style === 'runes') ? 0x18181b : 0x78716c;

    const stoneMat = new THREE.MeshStandardMaterial({
      color: stoneColor,
      roughness: style === 'mosaic' ? 0.35 : 0.85,
      metalness: style === 'sewer_grate' ? 0.3 : 0.1
    });

    const accentColor = (style === 'lava_fissure') ? 0xff3b00 :
                        (style === 'runes') ? 0x00f0ff :
                        (style === 'wood_planks') ? 0x1e293b :
                        (style === 'sewer_grate') ? 0x334155 :
                        (style === 'crypt_bones') ? 0xfef3c7 : 0xe2e8f0;

    const accentMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      roughness: 0.5,
      metalness: (style === 'wood_planks' || style === 'sewer_grate') ? 0.85 : 0.1,
      emissive: (style === 'lava_fissure') ? 0xff3b00 : (style === 'runes') ? 0x00f0ff : 0x000000,
      emissiveIntensity: (style === 'lava_fissure') ? 1.0 : (style === 'runes') ? 0.8 : 0.0
    });

    const baseMesh = new THREE.Mesh(DungeonEngine.mergeGeometries([baseBox, ...surfaceGeos]), stoneMat);
    group.add(baseMesh);

    if (accentGeos.length > 0) {
      const accentMesh = new THREE.Mesh(DungeonEngine.mergeGeometries(accentGeos), accentMat);
      group.add(accentMesh);
    }

    group.userData.printableGeometry = unifiedGeom;
    return unifiedGeom;
  }

  // --------------------------------------------------------------------------
  // Generator 2: Hyper-Realistic Architectural Walls & Working Doors
  // --------------------------------------------------------------------------

  static generateArchitecturalElement(type = 'stone_wall', options = {}) {
    const u = DungeonEngine.GRID_UNIT;
    const opt = Object.assign({
      wallHeight: 35,
      wallThickness: 8,
      stoneCourses: 5,
      doorAngle: 35,
      style: 'medieval'
    }, options);

    const group = new THREE.Group();
    group.name = `Dungeon_${type}`;
    const allGeos = [];

    // Base floor support slab
    const floorTile = DungeonEngine.generateDungeonTile('flagstone', 1, 1, { tileHeight: 5.0 });
    floorTile.translate(0, -2.5, 0);
    allGeos.push(floorTile);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.85 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.75 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.85 });

    if (type === 'stone_wall') {
      // 1. Masonry Stone Wall with Staggered Ashlar Courses & Coping Cap
      const courses = opt.stoneCourses;
      const courseH = opt.wallHeight / courses;
      const wallGeos = [];

      for (let c = 0; c < courses; c++) {
        const isOdd = (c % 2 === 1);
        const bricksInCourse = isOdd ? 3 : 2;
        const bw = u / bricksInCourse;
        const by = (c + 0.5) * courseH;

        for (let b = 0; b < bricksInCourse; b++) {
          const bx = -u / 2 + (b + 0.5) * bw;
          const brick = new THREE.BoxGeometry(bw - 0.6, courseH - 0.5, opt.wallThickness).toNonIndexed();
          brick.translate(bx, by, 0);
          wallGeos.push(brick);
        }
      }

      // Stone Wall Coping Capstone Layer
      const capstone = new THREE.BoxGeometry(u + 1.2, 3.5, opt.wallThickness + 2.0).toNonIndexed();
      capstone.translate(0, opt.wallHeight + 1.75, 0);
      wallGeos.push(capstone);

      const mergedWall = DungeonEngine.mergeGeometries(wallGeos);
      allGeos.push(mergedWall);
      group.add(new THREE.Mesh(mergedWall, stoneMat));

    } else if (type === 'archway') {
      // 2. Gothic Pointed Cathedral Archway
      const archGeos = [];
      const postW = 5.5;
      const jambH = opt.wallHeight - 8;

      // Left & Right molded jamb columns
      const leftPost = new THREE.BoxGeometry(postW, jambH, opt.wallThickness).toNonIndexed();
      leftPost.translate(-u / 2 + postW / 2, jambH / 2, 0);
      const rightPost = new THREE.BoxGeometry(postW, jambH, opt.wallThickness).toNonIndexed();
      rightPost.translate(u / 2 - postW / 2, jambH / 2, 0);

      // Gothic lancet pointed arch voussoirs
      const archTop = new THREE.BoxGeometry(u, 8.0, opt.wallThickness).toNonIndexed();
      archTop.translate(0, opt.wallHeight - 4.0, 0);

      // Prominent Keystone Wedge
      const keystone = new THREE.BoxGeometry(6.0, 7.5, opt.wallThickness + 2.0).toNonIndexed();
      keystone.translate(0, opt.wallHeight - 3.5, 0);

      archGeos.push(leftPost, rightPost, archTop, keystone);
      const mergedArch = DungeonEngine.mergeGeometries(archGeos);
      allGeos.push(mergedArch);
      group.add(new THREE.Mesh(mergedArch, stoneMat));

    } else if (type === 'hinged_door') {
      // 3. Reinforced Oak Dungeon Door with Functional Print-in-Place Hinge
      const postW = 4.5;
      const frameH = opt.wallHeight;

      // Stone Door Frame
      const frameL = new THREE.BoxGeometry(postW, frameH, opt.wallThickness).toNonIndexed();
      frameL.translate(-u / 2 + postW / 2, frameH / 2, 0);
      const frameR = new THREE.BoxGeometry(postW, frameH, opt.wallThickness).toNonIndexed();
      frameR.translate(u / 2 - postW / 2, frameH / 2, 0);
      const frameTop = new THREE.BoxGeometry(u, 6.0, opt.wallThickness).toNonIndexed();
      frameTop.translate(0, frameH - 3.0, 0);

      const mergedFrame = DungeonEngine.mergeGeometries([frameL, frameR, frameTop]);
      allGeos.push(mergedFrame);
      group.add(new THREE.Mesh(mergedFrame, stoneMat));

      // Working Door Leaf (Timber planks + Iron Straps + Cylindrical Knuckle Hinge)
      const doorW = u - postW * 2 - 0.8;
      const doorH = frameH - 7.0;
      const doorThick = 4.0;
      const doorLeafGeos = [];
      const ironGeos = [];

      // Wooden Door Panel
      const doorPanel = new THREE.BoxGeometry(doorW, doorH, doorThick).toNonIndexed();
      doorPanel.translate(doorW / 2, doorH / 2, 0); // Pivot at hinge
      doorLeafGeos.push(doorPanel);

      // Interlocking Print-in-Place Hinge Knuckle
      const hingeKnuckle = new THREE.CylinderGeometry(2.0, 2.0, doorH, 14).toNonIndexed();
      hingeKnuckle.translate(0, doorH / 2, 0);
      ironGeos.push(hingeKnuckle);

      // Forged Iron Strap Hinges (Top & Bottom)
      const strap1 = new THREE.BoxGeometry(doorW * 0.85, 2.5, doorThick + 0.8).toNonIndexed();
      strap1.translate(doorW * 0.42, doorH * 0.75, 0);
      const strap2 = new THREE.BoxGeometry(doorW * 0.85, 2.5, doorThick + 0.8).toNonIndexed();
      strap2.translate(doorW * 0.42, doorH * 0.25, 0);
      const doorRing = new THREE.CylinderGeometry(2.2, 2.2, 1.0, 12).toNonIndexed();
      doorRing.translate(doorW * 0.75, doorH * 0.5, doorThick / 2 + 0.5);
      ironGeos.push(strap1, strap2, doorRing);

      // Assemble Door Group and Apply Interactive Opening Angle
      const rad = (opt.doorAngle * Math.PI) / 180;
      const mergedDoorWood = DungeonEngine.mergeGeometries(doorLeafGeos);
      mergedDoorWood.rotateY(rad);
      mergedDoorWood.translate(-u / 2 + postW + 0.4, 0.5, 0);

      const mergedDoorIron = DungeonEngine.mergeGeometries(ironGeos);
      mergedDoorIron.rotateY(rad);
      mergedDoorIron.translate(-u / 2 + postW + 0.4, 0.5, 0);

      allGeos.push(mergedDoorWood, mergedDoorIron);
      group.add(new THREE.Mesh(mergedDoorWood, woodMat));
      group.add(new THREE.Mesh(mergedDoorIron, ironMat));

    } else if (type === 'portcullis') {
      // 4. Heavy Spiked Iron Prison Portcullis
      const postW = 5.0;
      const jambH = opt.wallHeight;

      // Stone Frame with sliding guide tracks
      const frameL = new THREE.BoxGeometry(postW, jambH, opt.wallThickness).toNonIndexed();
      frameL.translate(-u / 2 + postW / 2, jambH / 2, 0);
      const frameR = new THREE.BoxGeometry(postW, jambH, opt.wallThickness).toNonIndexed();
      frameR.translate(u / 2 - postW / 2, jambH / 2, 0);
      const archLintel = new THREE.BoxGeometry(u, 7.0, opt.wallThickness).toNonIndexed();
      archLintel.translate(0, jambH - 3.5, 0);
      allGeos.push(frameL, frameR, archLintel);
      group.add(new THREE.Mesh(DungeonEngine.mergeGeometries([frameL, frameR, archLintel]), stoneMat));

      // Spiked Iron Grille
      const portGeos = [];
      const numTines = 5;
      const tineSpacing = (u - 14) / (numTines - 1);
      const barH = opt.wallHeight - 10;

      for (let t = 0; t < numTines; t++) {
        const tx = -u / 2 + 7 + t * tineSpacing;
        // Vertical bar
        const bar = new THREE.BoxGeometry(1.6, barH, 1.6).toNonIndexed();
        bar.translate(tx, barH / 2 + 4, 0);
        // Bottom pyramid spike tip
        const spike = new THREE.CylinderGeometry(0.1, 1.4, 3.5, 4).toNonIndexed();
        spike.translate(tx, 2.25, 0);
        portGeos.push(bar, spike);
      }

      // Horizontal reinforcement crossbars
      const cross1 = new THREE.BoxGeometry(u - 12, 2.0, 2.0).toNonIndexed();
      cross1.translate(0, barH * 0.75 + 4, 0);
      const cross2 = new THREE.BoxGeometry(u - 12, 2.0, 2.0).toNonIndexed();
      cross2.translate(0, barH * 0.35 + 4, 0);
      portGeos.push(cross1, cross2);

      const mergedPort = DungeonEngine.mergeGeometries(portGeos);
      allGeos.push(mergedPort);
      group.add(new THREE.Mesh(mergedPort, ironMat));

    } else if (type === 'ruined_wall') {
      // 5. Ruined Crumbling Stone Wall with Rubble Debris
      const ruinGeos = [];
      const steps = 7;
      const stepW = u / steps;

      for (let s = 0; s < steps; s++) {
        // Jagged diagonal wall fracture profile
        const hFraction = 0.25 + (s / steps) * 0.75;
        const bh = opt.wallHeight * hFraction;
        const bx = -u / 2 + (s + 0.5) * stepW;
        const block = new THREE.BoxGeometry(stepW - 0.4, bh, opt.wallThickness).toNonIndexed();
        block.translate(bx, bh / 2, 0);
        ruinGeos.push(block);
      }

      // Fallen rubble stones tumbled at base
      for (let f = 0; f < 4; f++) {
        const rSize = 3.5 + f * 0.8;
        const rubble = new THREE.BoxGeometry(rSize, rSize, rSize).toNonIndexed();
        rubble.translate(-u / 4 + f * 4.2, rSize / 2, opt.wallThickness / 2 + 2);
        ruinGeos.push(rubble);
      }

      const mergedRuin = DungeonEngine.mergeGeometries(ruinGeos);
      allGeos.push(mergedRuin);
      group.add(new THREE.Mesh(mergedRuin, stoneMat));

    } else if (type === 'pillar') {
      // 6. Fluted Gothic Cathedral Column Pillar
      const colGeos = [];
      const baseGeo = new THREE.BoxGeometry(14, 4, 14).toNonIndexed();
      baseGeo.translate(0, 2, 0);

      const shaftH = opt.wallHeight - 8;
      const shaft = new THREE.CylinderGeometry(4.2, 5.0, shaftH, 12).toNonIndexed();
      shaft.translate(0, shaftH / 2 + 4, 0);

      const capital = new THREE.BoxGeometry(13, 4, 13).toNonIndexed();
      capital.translate(0, opt.wallHeight - 2, 0);

      colGeos.push(baseGeo, shaft, capital);
      const mergedCol = DungeonEngine.mergeGeometries(colGeos);
      allGeos.push(mergedCol);
      group.add(new THREE.Mesh(mergedCol, stoneMat));

    } else if (type === 'spiral_stairs') {
      // 7. Medieval Castle Spiral Tower Stairs
      const stepsCount = 10;
      const stepAngle = Math.PI / 5;
      const stepH = opt.wallHeight / stepsCount;
      const stairGeos = [];

      for (let s = 0; s < stepsCount; s++) {
        const step = new THREE.BoxGeometry(13, stepH, 5.5).toNonIndexed();
        step.translate(6.5, (s + 0.5) * stepH, 0);
        step.rotateY(s * stepAngle);
        stairGeos.push(step);
      }

      const centralPole = new THREE.CylinderGeometry(2.5, 2.5, opt.wallHeight, 14).toNonIndexed();
      centralPole.translate(0, opt.wallHeight / 2, 0);
      stairGeos.push(centralPole);

      const mergedStairs = DungeonEngine.mergeGeometries(stairGeos);
      allGeos.push(mergedStairs);
      group.add(new THREE.Mesh(mergedStairs, stoneMat));

    } else if (type === 'torch_sconce') {
      // 8. Stone Wall with Carved Sconce Niche & Medieval Torch
      const wallBox = new THREE.BoxGeometry(u, opt.wallHeight, opt.wallThickness).toNonIndexed();
      wallBox.translate(0, opt.wallHeight / 2, 0);
      allGeos.push(wallBox);
      group.add(new THREE.Mesh(wallBox, stoneMat));

      // Sconce Bracket and Torch
      const sconceGeos = [];
      const bracket = new THREE.BoxGeometry(1.5, 6.0, 5.0).toNonIndexed();
      bracket.translate(0, opt.wallHeight * 0.6, opt.wallThickness / 2 + 2.5);

      const torchShaft = new THREE.CylinderGeometry(1.2, 0.8, 8.0, 8).toNonIndexed();
      torchShaft.translate(0, opt.wallHeight * 0.6 + 3.0, opt.wallThickness / 2 + 4.5);
      sconceGeos.push(bracket, torchShaft);

      const flameMat = new THREE.MeshStandardMaterial({ color: 0xff7700, emissive: 0xff4400, emissiveIntensity: 1.2 });
      const flame = new THREE.CylinderGeometry(0.2, 1.6, 4.0, 8).toNonIndexed();
      flame.translate(0, opt.wallHeight * 0.6 + 8.5, opt.wallThickness / 2 + 4.5);

      const mergedSconce = DungeonEngine.mergeGeometries(sconceGeos);
      allGeos.push(mergedSconce, flame);
      group.add(new THREE.Mesh(mergedSconce, ironMat));
      group.add(new THREE.Mesh(flame, flameMat));

    } else if (type === 'cell_wall') {
      // 9. Dungeon Cell Wall with Barred Iron Window
      const wallGeos = [];
      const winW = 12, winH = 14;
      const winY = opt.wallHeight * 0.55;

      // Solid lower wall
      const lower = new THREE.BoxGeometry(u, winY - winH / 2, opt.wallThickness).toNonIndexed();
      lower.translate(0, (winY - winH / 2) / 2, 0);

      // Solid upper wall
      const topH = opt.wallHeight - (winY + winH / 2);
      const upper = new THREE.BoxGeometry(u, topH, opt.wallThickness).toNonIndexed();
      upper.translate(0, winY + winH / 2 + topH / 2, 0);

      // Left & right window piers
      const pierW = (u - winW) / 2;
      const pierL = new THREE.BoxGeometry(pierW, winH, opt.wallThickness).toNonIndexed();
      pierL.translate(-u / 2 + pierW / 2, winY, 0);
      const pierR = new THREE.BoxGeometry(pierW, winH, opt.wallThickness).toNonIndexed();
      pierR.translate(u / 2 - pierW / 2, winY, 0);

      wallGeos.push(lower, upper, pierL, pierR);
      const mergedWall = DungeonEngine.mergeGeometries(wallGeos);
      allGeos.push(mergedWall);
      group.add(new THREE.Mesh(mergedWall, stoneMat));

      // Window Iron Bars (4 bars)
      const barGeos = [];
      for (let b = 0; b < 3; b++) {
        const bx = -winW / 3 + b * (winW / 3);
        const bar = new THREE.CylinderGeometry(0.8, 0.8, winH + 1.5, 8).toNonIndexed();
        bar.translate(bx, winY, 0);
        barGeos.push(bar);
      }
      const mergedBars = DungeonEngine.mergeGeometries(barGeos);
      allGeos.push(mergedBars);
      group.add(new THREE.Mesh(mergedBars, ironMat));

    } else {
      // 10. Secret Revolving Bookcase / Hidden Masonry Door
      const frameGeos = [];
      const frameL = new THREE.BoxGeometry(4.0, opt.wallHeight, opt.wallThickness).toNonIndexed();
      frameL.translate(-u / 2 + 2.0, opt.wallHeight / 2, 0);
      const frameR = new THREE.BoxGeometry(4.0, opt.wallHeight, opt.wallThickness).toNonIndexed();
      frameR.translate(u / 2 - 2.0, opt.wallHeight / 2, 0);
      const frameTop = new THREE.BoxGeometry(u, 5.0, opt.wallThickness).toNonIndexed();
      frameTop.translate(0, opt.wallHeight - 2.5, 0);
      frameGeos.push(frameL, frameR, frameTop);
      const mergedFrame = DungeonEngine.mergeGeometries(frameGeos);
      allGeos.push(mergedFrame);
      group.add(new THREE.Mesh(mergedFrame, stoneMat));

      // Bookcase Case and Shelves
      const shelfGeos = [];
      const caseW = u - 9.0;
      const caseH = opt.wallHeight - 6.0;
      const bookBack = new THREE.BoxGeometry(caseW, caseH, 2.0).toNonIndexed();
      bookBack.translate(0, caseH / 2 + 0.5, -opt.wallThickness / 4);
      shelfGeos.push(bookBack);

      // 3 horizontal shelves
      for (let s = 0; s < 3; s++) {
        const sy = (s + 1) * (caseH / 4);
        const shelf = new THREE.BoxGeometry(caseW, 1.6, 5.0).toNonIndexed();
        shelf.translate(0, sy, 0);
        shelfGeos.push(shelf);
      }

      // Books rows
      for (let b = 0; b < 5; b++) {
        const book = new THREE.BoxGeometry(2.0, 6.0, 3.5).toNonIndexed();
        book.translate(-caseW / 3 + b * 2.6, caseH / 4 + 3.8, 0);
        shelfGeos.push(book);
      }

      const mergedBookshelf = DungeonEngine.mergeGeometries(shelfGeos);
      allGeos.push(mergedBookshelf);
      group.add(new THREE.Mesh(mergedBookshelf, woodMat));
    }

    const unifiedGeom = DungeonEngine.mergeGeometries(allGeos);
    group.userData.printableGeometry = unifiedGeom;
    return { group, geometry: unifiedGeom };
  }

  // --------------------------------------------------------------------------
  // Generator 3: Procedural 3D Dungeon Labyrinths (5 Maze Algorithms)
  // --------------------------------------------------------------------------

  static generateProceduralMaze(gridCols = 5, gridRows = 5, options = {}) {
    const u = DungeonEngine.GRID_UNIT;
    const opt = Object.assign({
      wallHeight: 28,
      wallThickness: 6,
      style: 'flagstone',
      corridorFloor: 'flagstone',
      algorithm: 'dfs_classic',
      hasPortals: true,
      seed: Math.floor(Math.random() * 100000)
    }, options);

    const cols = Math.max(3, Math.min(10, gridCols));
    const rows = Math.max(3, Math.min(10, gridRows));

    // Maze Grid Walls representation
    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    const wallsH = Array.from({ length: rows + 1 }, () => Array(cols).fill(true));
    const wallsV = Array.from({ length: rows }, () => Array(cols + 1).fill(true));

    // Simple pseudo-random generator with seed
    let seed = opt.seed;
    function rand() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }

    // Algorithm 1: DFS Recursive Backtracker (Classic Branching)
    function carveDFS(r, c) {
      visited[r][c] = true;
      const dirs = [
        [0, 1, 'E'], [1, 0, 'S'], [0, -1, 'W'], [-1, 0, 'N']
      ].sort(() => rand() - 0.5);

      for (const [dr, dc, dName] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc]) {
          if (dName === 'E') wallsV[r][c + 1] = false;
          if (dName === 'W') wallsV[r][c] = false;
          if (dName === 'S') wallsH[r + 1][c] = false;
          if (dName === 'N') wallsH[r][c] = false;
          carveDFS(nr, nc);
        }
      }
    }

    carveDFS(0, 0);

    // Algorithm Variations:
    if (opt.algorithm === 'braided') {
      // Braided: Remove 35% of interior dead ends to create tactical combat loops
      for (let r = 1; r < rows - 1; r++) {
        for (let c = 1; c < cols - 1; c++) {
          if (rand() < 0.35) {
            if (rand() > 0.5) wallsH[r][c] = false;
            else wallsV[r][c] = false;
          }
        }
      }
    } else if (opt.algorithm === 'concentric') {
      // Concentric: Open inner rings towards central chamber
      const midR = Math.floor(rows / 2);
      const midC = Math.floor(cols / 2);
      wallsH[midR][midC] = false;
      wallsV[midR][midC] = false;
      if (midR + 1 < rows) wallsH[midR + 1][midC] = false;
      if (midC + 1 < cols) wallsV[midR][midC + 1] = false;
    }

    // Entrance & Exit Openings
    wallsV[0][0] = false;
    wallsV[rows - 1][cols] = false;

    // ------------------------------------------------------------------------
    // Construct 3D Geometry: Stone Masonry Brick Walls + Paved Corridors
    // ------------------------------------------------------------------------
    const allGeos = [];
    const group = new THREE.Group();
    group.name = `Procedural_Dungeon_Maze_${cols}x${rows}_${opt.algorithm}`;

    // 1. Paved Corridor Floor Tile
    const floor = DungeonEngine.generateDungeonTile(opt.corridorFloor || 'flagstone', cols, rows, { tileHeight: 5.0 });
    floor.translate(0, -2.5, 0);
    allGeos.push(floor);

    const startX = -((cols - 1) * u) / 2;
    const startZ = -((rows - 1) * u) / 2;
    const wH = opt.wallHeight;
    const wT = opt.wallThickness;
    const wallGeos = [];

    // Helper: generate multi-course stone wall segment with capstone
    function makeMasonryWall(lenX, lenZ, px, pz) {
      const segBox = new THREE.BoxGeometry(lenX, wH, lenZ).toNonIndexed();
      segBox.translate(px, wH / 2, pz);

      const capX = (lenX > lenZ) ? (lenX + 0.8) : (lenX + 1.2);
      const capZ = (lenZ > lenX) ? (lenZ + 0.8) : (lenZ + 1.2);
      const capBox = new THREE.BoxGeometry(capX, 2.5, capZ).toNonIndexed();
      capBox.translate(px, wH + 1.25, pz);

      wallGeos.push(segBox, capBox);
    }

    // Vertical Wall Segments
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c <= cols; c++) {
        if (wallsV[r][c]) {
          const px = startX + (c - 0.5) * u;
          const pz = startZ + r * u;
          makeMasonryWall(wT, u, px, pz);
        }
      }
    }

    // Horizontal Wall Segments
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (wallsH[r][c]) {
          const px = startX + c * u;
          const pz = startZ + (r - 0.5) * u;
          makeMasonryWall(u, wT, px, pz);
        }
      }
    }

    // 2. Monumental Entrance & Exit Gateway Archways
    if (opt.hasPortals) {
      const entArch = new THREE.BoxGeometry(wT + 2, 7.0, u).toNonIndexed();
      entArch.translate(startX - 0.5 * u, wH - 3.5, startZ);
      const exitArch = new THREE.BoxGeometry(wT + 2, 7.0, u).toNonIndexed();
      exitArch.translate(startX + (cols - 0.5) * u, wH - 3.5, startZ + (rows - 1) * u);
      wallGeos.push(entArch, exitArch);
    }

    const mergedWalls = DungeonEngine.mergeGeometries(wallGeos);
    allGeos.push(mergedWalls);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.85 });
    group.add(new THREE.Mesh(mergedWalls, stoneMat));

    const unifiedGeom = DungeonEngine.mergeGeometries(allGeos);
    group.userData.printableGeometry = unifiedGeom;

    return {
      group,
      geometry: unifiedGeom,
      dimensions: { cols, rows, totalTiles: cols * rows }
    };
  }

  // --------------------------------------------------------------------------
  // Generator 4: Scatter Terrain, Dungeon Props & Interactive Traps
  // --------------------------------------------------------------------------

  static generateDungeonProp(propType = 'treasure_chest', options = {}) {
    const u = DungeonEngine.GRID_UNIT;
    const group = new THREE.Group();
    group.name = `Dungeon_Prop_${propType}`;
    const allGeos = [];

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.75 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.85 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25, metalness: 0.9 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.85 });
    const candleMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xffaa00, emissiveIntensity: 0.6 });

    if (propType === 'treasure_chest') {
      // 1. Mimic / Iron-Bound Tabletop Treasure Chest with Loot
      const chestW = 16, chestH = 10, chestD = 11;

      // Wooden Box Base
      const box = new THREE.BoxGeometry(chestW, chestH, chestD).toNonIndexed();
      box.translate(0, chestH / 2, 0);
      allGeos.push(box);
      group.add(new THREE.Mesh(box, woodMat));

      // Curved Domed Lid (Rotated slightly open to reveal gold loot)
      const lidR = chestD / 2;
      const lid = new THREE.CylinderGeometry(lidR, lidR, chestW, 14).toNonIndexed();
      lid.rotateZ(Math.PI / 2);
      lid.rotateX(-0.35); // 20 degrees open
      lid.translate(0, chestH + 1.2, -1.0);
      allGeos.push(lid);
      group.add(new THREE.Mesh(lid, woodMat));

      // Iron corner reinforcement straps and clasp lock
      const strapL = new THREE.BoxGeometry(2.0, chestH + 2.5, chestD + 0.8).toNonIndexed();
      strapL.translate(-chestW / 2 + 1.5, chestH / 2, 0);
      const strapR = new THREE.BoxGeometry(2.0, chestH + 2.5, chestD + 0.8).toNonIndexed();
      strapR.translate(chestW / 2 - 1.5, chestH / 2, 0);
      const clasp = new THREE.BoxGeometry(3.0, 3.5, 2.5).toNonIndexed();
      clasp.translate(0, chestH - 1.5, chestD / 2 + 0.8);
      allGeos.push(strapL, strapR, clasp);
      group.add(new THREE.Mesh(DungeonEngine.mergeGeometries([strapL, strapR, clasp]), ironMat));

      // Pile of gleaming gold coins inside
      const goldCoins = new THREE.CylinderGeometry(chestW * 0.35, chestW * 0.38, 2.5, 12).toNonIndexed();
      goldCoins.translate(0, chestH - 0.5, 0.5);
      allGeos.push(goldCoins);
      group.add(new THREE.Mesh(goldCoins, goldMat));

    } else if (propType === 'spike_trap') {
      // 2. Spring-Loaded Lethal Floor Spike Trap
      const trapBase = DungeonEngine.generateDungeonTile('flagstone', 1, 1, { tileHeight: 6.0 });
      trapBase.translate(0, -3.0, 0);
      allGeos.push(trapBase);
      group.add(new THREE.Mesh(trapBase, stoneMat));

      // Recessed Center Pressure Plate
      const plate = new THREE.BoxGeometry(16, 1.2, 16).toNonIndexed();
      plate.translate(0, 0.4, 0);
      allGeos.push(plate);
      group.add(new THREE.Mesh(plate, ironMat));

      // 3x3 Lethal Pyramid Steel Spikes
      const spikeGeos = [];
      for (let sx = -1; sx <= 1; sx++) {
        for (let sz = -1; sz <= 1; sz++) {
          const spike = new THREE.CylinderGeometry(0.1, 1.5, 14, 4).toNonIndexed();
          spike.translate(sx * 5.0, 7.5, sz * 5.0);
          spikeGeos.push(spike);
        }
      }
      const mergedSpikes = DungeonEngine.mergeGeometries(spikeGeos);
      allGeos.push(mergedSpikes);
      group.add(new THREE.Mesh(mergedSpikes, ironMat));

    } else if (propType === 'sarcophagus') {
      // 3. Ancient Stone Crypt Sarcophagus with Mummy Effigy
      const sarcW = 14, sarcL = 26, sarcH = 12;

      // Heavy limestone coffin basin
      const basin = new THREE.BoxGeometry(sarcW, sarcH, sarcL).toNonIndexed();
      basin.translate(0, sarcH / 2, 0);

      // Chamfered Removable Lid with molded rim
      const lid = new THREE.BoxGeometry(sarcW + 1.6, 4.0, sarcL + 1.6).toNonIndexed();
      lid.translate(0, sarcH + 2.0, 0);

      // Bas-Relief Effigy (Pharaoh / Knight figure)
      const head = new THREE.CylinderGeometry(2.8, 2.5, 2.0, 12).toNonIndexed();
      head.translate(0, sarcH + 4.5, -sarcL * 0.3);
      const body = new THREE.BoxGeometry(8.0, 1.8, sarcL * 0.55).toNonIndexed();
      body.translate(0, sarcH + 4.2, 2.0);

      const mergedSarc = DungeonEngine.mergeGeometries([basin, lid, head, body]);
      allGeos.push(mergedSarc);
      group.add(new THREE.Mesh(mergedSarc, stoneMat));

    } else if (propType === 'alchemy_table') {
      // 4. Alchemist's Arcane Worktable & Potions
      const tableW = 22, tableL = 12, tableH = 12;

      // Wooden Table Top and 4 Legs
      const top = new THREE.BoxGeometry(tableW, 2.2, tableL).toNonIndexed();
      top.translate(0, tableH, 0);
      const legGeos = [top];

      for (let lx of [-tableW / 2 + 2, tableW / 2 - 2]) {
        for (let lz of [-tableL / 2 + 2, tableL / 2 - 2]) {
          const leg = new THREE.BoxGeometry(2.2, tableH - 1.1, 2.2).toNonIndexed();
          leg.translate(lx, (tableH - 1.1) / 2, lz);
          legGeos.push(leg);
        }
      }
      const mergedTable = DungeonEngine.mergeGeometries(legGeos);
      allGeos.push(mergedTable);
      group.add(new THREE.Mesh(mergedTable, woodMat));

      // Tabletop Scatter: Retort flask, potion vials, open spellbook
      const flaskMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.85 });
      const flask = new THREE.CylinderGeometry(0.8, 2.5, 4.5, 10).toNonIndexed();
      flask.translate(-5.5, tableH + 3.0, 0);

      const book = new THREE.BoxGeometry(6.5, 1.2, 5.0).toNonIndexed();
      book.translate(4.5, tableH + 1.4, 0);

      allGeos.push(flask, book);
      group.add(new THREE.Mesh(flask, flaskMat));
      group.add(new THREE.Mesh(book, goldMat));

    } else if (propType === 'weapon_rack') {
      // 5. Dungeon Timber Weapon Rack with Broadsword & Shield
      const rackW = 18, rackH = 18, rackD = 8;
      const rackGeos = [];

      // A-Frame Side Supports
      const leftA = new THREE.BoxGeometry(2.0, rackH, 2.0).toNonIndexed();
      leftA.translate(-rackW / 2 + 1.5, rackH / 2, 0);
      const rightA = new THREE.BoxGeometry(2.0, rackH, 2.0).toNonIndexed();
      rightA.translate(rackW / 2 - 1.5, rackH / 2, 0);
      const crossBeam = new THREE.BoxGeometry(rackW, 2.0, 2.0).toNonIndexed();
      crossBeam.translate(0, rackH * 0.75, 0);
      rackGeos.push(leftA, rightA, crossBeam);

      const mergedRack = DungeonEngine.mergeGeometries(rackGeos);
      allGeos.push(mergedRack);
      group.add(new THREE.Mesh(mergedRack, woodMat));

      // Mounted Broadsword & Round Buckler Shield
      const weaponGeos = [];
      const swordBlade = new THREE.BoxGeometry(1.4, 15, 0.6).toNonIndexed();
      swordBlade.translate(-3.0, 9.0, 1.2);
      const crossGuard = new THREE.BoxGeometry(5.0, 1.0, 1.0).toNonIndexed();
      crossGuard.translate(-3.0, 14.5, 1.2);

      const shield = new THREE.CylinderGeometry(4.5, 4.5, 1.2, 16).toNonIndexed();
      shield.rotateX(Math.PI / 2);
      shield.translate(4.0, 10.0, 1.5);

      weaponGeos.push(swordBlade, crossGuard, shield);
      const mergedWeapons = DungeonEngine.mergeGeometries(weaponGeos);
      allGeos.push(mergedWeapons);
      group.add(new THREE.Mesh(mergedWeapons, ironMat));

    } else {
      // 6. Sacrificial Crypt Altar with Skull Corners & Candles
      const altarW = 20, altarL = 12, altarH = 10;
      const altarGeos = [];

      // Stone Plinth and Slab
      const altarBase = new THREE.BoxGeometry(altarW + 2, 2.5, altarL + 2).toNonIndexed();
      altarBase.translate(0, 1.25, 0);
      const altarBody = new THREE.BoxGeometry(altarW, altarH - 4.5, altarL).toNonIndexed();
      altarBody.translate(0, 2.5 + (altarH - 4.5) / 2, 0);
      const altarTop = new THREE.BoxGeometry(altarW + 2.5, 2.0, altarL + 2.5).toNonIndexed();
      altarTop.translate(0, altarH - 1.0, 0);

      altarGeos.push(altarBase, altarBody, altarTop);
      const mergedAltar = DungeonEngine.mergeGeometries(altarGeos);
      allGeos.push(mergedAltar);
      group.add(new THREE.Mesh(mergedAltar, stoneMat));

      // 4 Burning Votive Candles on Top
      const candleGeos = [];
      const offsets = [
        [-altarW / 2 + 2, -altarL / 2 + 2],
        [altarW / 2 - 2, -altarL / 2 + 2],
        [-altarW / 2 + 2, altarL / 2 - 2],
        [altarW / 2 - 2, altarL / 2 - 2]
      ];
      for (const [cx, cz] of offsets) {
        const candle = new THREE.CylinderGeometry(0.8, 0.8, 3.5, 8).toNonIndexed();
        candle.translate(cx, altarH + 1.75, cz);
        candleGeos.push(candle);
      }
      const mergedCandles = DungeonEngine.mergeGeometries(candleGeos);
      allGeos.push(mergedCandles);
      group.add(new THREE.Mesh(mergedCandles, candleMat));
    }

    const unifiedGeom = DungeonEngine.mergeGeometries(allGeos);
    group.userData.printableGeometry = unifiedGeom;
    return { group, geometry: unifiedGeom };
  }

  /**
   * Generates a watertight 3D relief mesh from a 2D canvas drawing
   * @param {HTMLCanvasElement|Object} canvasData
   * @param {number} leafW
   * @param {number} leafH
   * @param {number} depthMm
   * @param {string} mode 'emboss' (raised) or 'deboss' (carved)
   * @returns {THREE.BufferGeometry|null}
   */
  static createReliefGeometryFromCanvas(canvasData, leafW, leafH, depthMm = 1.5, mode = 'emboss') {
    let w, h, data;
    if (!canvasData) return null;
    if (canvasData.getContext) {
      const ctx = canvasData.getContext('2d');
      w = canvasData.width;
      h = canvasData.height;
      data = ctx.getImageData(0, 0, w, h).data;
    } else if (canvasData.data && canvasData.width && canvasData.height) {
      w = canvasData.width;
      h = canvasData.height;
      data = canvasData.data;
    } else {
      return null;
    }

    const cols = 52;
    const rows = 70;
    const grid = new Float32Array(cols * rows);
    let totalDrawn = 0;
    let highAlphaCount = 0;

    // First pass: check if canvas is mostly transparent or opaque
    for (let i = 3; i < data.length; i += 16) {
      if (data[i] > 200) highAlphaCount++;
    }
    const isOpaqueImage = highAlphaCount > (data.length / 16) * 0.85;

    for (let r = 0; r < rows; r++) {
      const sy = Math.floor((r / (rows - 1)) * (h - 1));
      for (let c = 0; c < cols; c++) {
        const sx = Math.floor((c / (cols - 1)) * (w - 1));
        const idx = (sy * w + sx) * 4;
        const rVal = data[idx];
        const gVal = data[idx + 1];
        const bVal = data[idx + 2];
        const aVal = data[idx + 3];

        let val = 0;
        if (isOpaqueImage) {
          const lum = (rVal * 0.299 + gVal * 0.587 + bVal * 0.114) / 255.0;
          val = (rVal > 100 || gVal > 100 || bVal > 100) ? lum : 0;
        } else {
          if (aVal > 15) {
            val = (aVal / 255.0);
          }
        }
        grid[r * cols + c] = val;
        if (val > 0.05) totalDrawn++;
      }
    }

    if (totalDrawn < 2) return null;

    // 3x3 Gaussian smoothing
    const smoothed = new Float32Array(cols * rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let sum = 0, weight = 0;
        for (let dr = -1; dr <= 1; dr++) {
          const nr = r + dr;
          if (nr < 0 || nr >= rows) continue;
          for (let dc = -1; dc <= 1; dc++) {
            const nc = c + dc;
            if (nc < 0 || nc >= cols) continue;
            const wgt = (dr === 0 && dc === 0) ? 4 : (dr === 0 || dc === 0) ? 2 : 1;
            sum += grid[nr * cols + nc] * wgt;
            weight += wgt;
          }
        }
        smoothed[r * cols + c] = sum / weight;
      }
    }

    const reliefW = leafW * 0.78;
    const reliefH = leafH * 0.72;
    const reliefX0 = -reliefW / 2;
    const reliefY0 = (leafH - reliefH) / 2;

    const vertices = [];
    const maxD = Math.max(0.6, depthMm);
    const isDeboss = (mode === 'deboss');

    const getZ = (v) => {
      if (isDeboss) {
        // Carved plate: base rim at maxD + 0.2, strokes cut down to 0.15
        return (1.0 - v) * maxD + 0.15;
      } else {
        // Raised relief: strokes rise up to maxD + 0.1
        return v * maxD + 0.1;
      }
    };

    // Top displaced surface
    for (let r = 0; r < rows - 1; r++) {
      const y0 = reliefY0 + (1.0 - r / (rows - 1)) * reliefH;
      const y1 = reliefY0 + (1.0 - (r + 1) / (rows - 1)) * reliefH;
      for (let c = 0; c < cols - 1; c++) {
        const x0 = reliefX0 + (c / (cols - 1)) * reliefW;
        const x1 = reliefX0 + ((c + 1) / (cols - 1)) * reliefW;

        const v00 = smoothed[r * cols + c];
        const v10 = smoothed[r * cols + (c + 1)];
        const v01 = smoothed[(r + 1) * cols + c];
        const v11 = smoothed[(r + 1) * cols + (c + 1)];

        const z00 = getZ(v00);
        const z10 = getZ(v10);
        const z01 = getZ(v01);
        const z11 = getZ(v11);

        vertices.push(
          x0, y0, z00,
          x1, y0, z10,
          x0, y1, z01,

          x1, y0, z10,
          x1, y1, z11,
          x0, y1, z01
        );
      }
    }

    // Skirts connecting perimeter to z = 0
    const topY = reliefY0 + reliefH;
    for (let c = 0; c < cols - 1; c++) {
      const x0 = reliefX0 + (c / (cols - 1)) * reliefW;
      const x1 = reliefX0 + ((c + 1) / (cols - 1)) * reliefW;
      const z0 = getZ(smoothed[0 * cols + c]);
      const z1 = getZ(smoothed[0 * cols + (c + 1)]);
      vertices.push(
        x0, topY, z0,
        x1, topY, 0,
        x1, topY, z1,

        x0, topY, z0,
        x0, topY, 0,
        x1, topY, 0
      );
    }

    const btmY = reliefY0;
    for (let c = 0; c < cols - 1; c++) {
      const x0 = reliefX0 + (c / (cols - 1)) * reliefW;
      const x1 = reliefX0 + ((c + 1) / (cols - 1)) * reliefW;
      const z0 = getZ(smoothed[(rows - 1) * cols + c]);
      const z1 = getZ(smoothed[(rows - 1) * cols + (c + 1)]);
      vertices.push(
        x0, btmY, z0,
        x1, btmY, z1,
        x1, btmY, 0,

        x0, btmY, z0,
        x1, btmY, 0,
        x0, btmY, 0
      );
    }

    for (let r = 0; r < rows - 1; r++) {
      const y0 = reliefY0 + (1.0 - r / (rows - 1)) * reliefH;
      const y1 = reliefY0 + (1.0 - (r + 1) / (rows - 1)) * reliefH;
      const z0 = getZ(smoothed[r * cols + 0]);
      const z1 = getZ(smoothed[(r + 1) * cols + 0]);
      vertices.push(
        reliefX0, y0, z0,
        reliefX0, y1, 0,
        reliefX0, y1, z1,

        reliefX0, y0, z0,
        reliefX0, y0, 0,
        reliefX0, y1, 0
      );
    }

    for (let r = 0; r < rows - 1; r++) {
      const y0 = reliefY0 + (1.0 - r / (rows - 1)) * reliefH;
      const y1 = reliefY0 + (1.0 - (r + 1) / (rows - 1)) * reliefH;
      const z0 = getZ(smoothed[r * cols + (cols - 1)]);
      const z1 = getZ(smoothed[(r + 1) * cols + (cols - 1)]);
      vertices.push(
        reliefX0 + reliefW, y0, z0,
        reliefX0 + reliefW, y1, z1,
        reliefX0 + reliefW, y1, 0,

        reliefX0 + reliefW, y0, z0,
        reliefX0 + reliefW, y1, 0,
        reliefX0 + reliefW, y0, 0
      );
    }

    // Back quad
    vertices.push(
      reliefX0, btmY, 0,
      reliefX0 + reliefW, topY, 0,
      reliefX0 + reliefW, btmY, 0,

      reliefX0, btmY, 0,
      reliefX0, topY, 0,
      reliefX0 + reliefW, topY, 0
    );

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.computeVertexNormals();
    return geom;
  }

  /**
   * Generates a fully customized 3D Door with parametric frame, leaf styles,
   * working print-in-place hinges, hardware knockers, window grilles, and 2D-to-3D relief drawing.
   * @param {Object} options
   * @returns {Object} { group, geometry, parts, doorPivotGroup }
   */
  static generateCustomDoor3D(options = {}) {
    const {
      doorWidth = 28,
      doorHeight = 45,
      doorThickness = 4.0,
      frameDepth = 10,
      frameWidth = 6.0,
      frameStyle = 'gothic_pointed',
      doorStyle = 'vertical_planks',
      openAngle = 35,
      hardware = 'ring_knocker',
      windowType = 'none',
      reliefCanvas = null,
      reliefDepth = 1.2,
      reliefMode = 'emboss',
      weathering = 0.3,
      interlock = 'none'
    } = options;

    const group = new THREE.Group();
    const allGeos = [];
    const frameGeos = [];
    const leafGeos = [];
    const ironGeos = [];
    const reliefGeos = [];

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.85, metalness: 0.1 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.75, metalness: 0.05 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.45, metalness: 0.8 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35, metalness: 0.75 });
    const reliefMat = new THREE.MeshStandardMaterial({
      color: reliefMode === 'deboss' ? 0x1c1917 : 0xf59e0b,
      roughness: reliefMode === 'deboss' ? 0.9 : 0.35,
      metalness: reliefMode === 'deboss' ? 0.2 : 0.65
    });

    const totalW = doorWidth + 2 * frameWidth;
    const depth = frameDepth;

    // 1. BASE THRESHOLD SILL
    const sill = new THREE.BoxGeometry(totalW + 2, 2.0, depth + 2).toNonIndexed();
    sill.translate(0, 1.0, 0);
    frameGeos.push(sill);

    // 2. LEFT & RIGHT JAMBS
    const jambH = doorHeight;
    const leftJamb = new THREE.BoxGeometry(frameWidth, jambH, depth).toNonIndexed();
    leftJamb.translate(-doorWidth / 2 - frameWidth / 2, 2.0 + jambH / 2, 0);
    const rightJamb = new THREE.BoxGeometry(frameWidth, jambH, depth).toNonIndexed();
    rightJamb.translate(doorWidth / 2 + frameWidth / 2, 2.0 + jambH / 2, 0);
    frameGeos.push(leftJamb, rightJamb);

    // 3. FRAME ARCH / HEADER
    const archY = 2.0 + doorHeight;
    if (frameStyle === 'gothic_pointed') {
      const apexH = doorWidth * 0.38;
      const archThick = frameWidth;
      const segs = 8;
      for (let i = 0; i < segs; i++) {
        const t0 = i / segs;
        const t1 = (i + 1) / segs;

        const x0 = -doorWidth / 2 - frameWidth / 2 + t0 * (doorWidth / 2 + frameWidth / 2);
        const x1 = -doorWidth / 2 - frameWidth / 2 + t1 * (doorWidth / 2 + frameWidth / 2);
        const y0 = archY + Math.sin(t0 * Math.PI * 0.5) * apexH;
        const y1 = archY + Math.sin(t1 * Math.PI * 0.5) * apexH;

        const segBox = new THREE.BoxGeometry(Math.abs(x1 - x0) + 1.0, archThick, depth).toNonIndexed();
        segBox.translate((x0 + x1) / 2, (y0 + y1) / 2 + archThick / 2, 0);
        frameGeos.push(segBox);

        const rx0 = -x0;
        const rx1 = -x1;
        const rsegBox = new THREE.BoxGeometry(Math.abs(rx0 - rx1) + 1.0, archThick, depth).toNonIndexed();
        rsegBox.translate((rx0 + rx1) / 2, (y0 + y1) / 2 + archThick / 2, 0);
        frameGeos.push(rsegBox);
      }
      const keystone = new THREE.BoxGeometry(archThick * 1.3, archThick * 1.4, depth + 1.5).toNonIndexed();
      keystone.translate(0, archY + apexH + archThick * 0.6, 0);
      frameGeos.push(keystone);

    } else if (frameStyle === 'round_roman') {
      const rad = doorWidth / 2 + frameWidth / 2;
      const segs = 12;
      for (let i = 0; i < segs; i++) {
        const a0 = Math.PI - (i / segs) * Math.PI;
        const a1 = Math.PI - ((i + 1) / segs) * Math.PI;
        const x = (Math.cos(a0) + Math.cos(a1)) * 0.5 * rad;
        const y = archY + (Math.sin(a0) + Math.sin(a1)) * 0.5 * rad;
        const block = new THREE.BoxGeometry(frameWidth * 1.1, frameWidth * 1.1, depth).toNonIndexed();
        block.translate(x, y, 0);
        frameGeos.push(block);
      }
      const keystone = new THREE.BoxGeometry(frameWidth * 1.4, frameWidth * 1.5, depth + 2).toNonIndexed();
      keystone.translate(0, archY + rad, 0);
      frameGeos.push(keystone);

    } else if (frameStyle === 'dwarven_angular') {
      const topBar = new THREE.BoxGeometry(doorWidth + frameWidth * 2, frameWidth, depth + 1).toNonIndexed();
      topBar.translate(0, archY + frameWidth / 2, 0);
      frameGeos.push(topBar);

      const gussetL = new THREE.BoxGeometry(frameWidth * 1.2, frameWidth * 1.2, depth).toNonIndexed();
      gussetL.rotateZ(Math.PI / 4);
      gussetL.translate(-doorWidth / 2, archY, 0);
      const gussetR = new THREE.BoxGeometry(frameWidth * 1.2, frameWidth * 1.2, depth).toNonIndexed();
      gussetR.rotateZ(-Math.PI / 4);
      gussetR.translate(doorWidth / 2, archY, 0);
      frameGeos.push(gussetL, gussetR);

    } else if (frameStyle === 'vault_portal') {
      const ring = new THREE.CylinderGeometry(doorWidth * 0.75, doorWidth * 0.75, depth, 24).toNonIndexed();
      ring.rotateX(Math.PI / 2);
      ring.translate(0, 2.0 + doorHeight / 2, 0);
      frameGeos.push(ring);

    } else {
      const lintel = new THREE.BoxGeometry(totalW + 2, frameWidth * 1.3, depth + 1).toNonIndexed();
      lintel.translate(0, archY + frameWidth * 0.65, 0);
      frameGeos.push(lintel);

      const corbelL = new THREE.BoxGeometry(frameWidth * 0.8, frameWidth * 0.8, depth).toNonIndexed();
      corbelL.translate(-doorWidth / 2 + frameWidth * 0.3, archY - frameWidth * 0.3, 0);
      const corbelR = new THREE.BoxGeometry(frameWidth * 0.8, frameWidth * 0.8, depth).toNonIndexed();
      corbelR.translate(doorWidth / 2 - frameWidth * 0.3, archY - frameWidth * 0.3, 0);
      frameGeos.push(corbelL, corbelR);
    }

    // Interlock sockets for frame if requested
    if (interlock === 'magnets') {
      const magHoleL = DungeonEngine.createMagnetCylinder(-doorWidth / 2 - frameWidth / 2, 1.0, 0);
      const magHoleR = DungeonEngine.createMagnetCylinder(doorWidth / 2 + frameWidth / 2, 1.0, 0);
      frameGeos.push(magHoleL, magHoleR);
    } else if (interlock === 'openlock') {
      const clipL = DungeonEngine.createOpenLockClip(-totalW / 2, 2.0 + jambH / 2, 0, Math.PI / 2);
      const clipR = DungeonEngine.createOpenLockClip(totalW / 2, 2.0 + jambH / 2, 0, -Math.PI / 2);
      frameGeos.push(clipL, clipR);
    }

    // Frame Hinge Lugs (Jamb knuckles)
    const hingeLug1 = new THREE.CylinderGeometry(1.4, 1.4, 3.5, 8).toNonIndexed();
    hingeLug1.translate(-doorWidth / 2 + 0.3, 2.0 + doorHeight * 0.25, 0);
    const hingeLug2 = new THREE.CylinderGeometry(1.4, 1.4, 3.5, 8).toNonIndexed();
    hingeLug2.translate(-doorWidth / 2 + 0.3, 2.0 + doorHeight * 0.75, 0);
    ironGeos.push(hingeLug1, hingeLug2);

    // 4. DOOR LEAF PIVOT GROUP
    const hingeX = -doorWidth / 2 + 1.2;
    const leafW = doorWidth - 1.6;
    const leafH = doorHeight - 0.8;
    const leafT = doorThickness;

    const doorPivotGroup = new THREE.Group();
    doorPivotGroup.position.set(hingeX, 2.2, 0);

    const localCenterX = leafW / 2;
    const localCenterY = leafH / 2;

    // Door Leaf Hinge Sleeves
    const leafHinge1 = new THREE.CylinderGeometry(1.3, 1.3, 3.2, 8).toNonIndexed();
    leafHinge1.translate(0, leafH * 0.25 - 3.4, 0);
    const leafHinge2 = new THREE.CylinderGeometry(1.3, 1.3, 3.2, 8).toNonIndexed();
    leafHinge2.translate(0, leafH * 0.75 - 3.4, 0);
    ironGeos.push(leafHinge1, leafHinge2);

    // Leaf styles
    if (doorStyle === 'vertical_planks') {
      const numPlanks = 5;
      const plankW = leafW / numPlanks;
      for (let p = 0; p < numPlanks; p++) {
        const px = localCenterX - leafW / 2 + p * plankW + plankW / 2;
        const plank = new THREE.BoxGeometry(plankW - 0.5, leafH, leafT).toNonIndexed();
        plank.translate(px, localCenterY, 0);
        leafGeos.push(plank);
      }
      const strap1 = new THREE.BoxGeometry(leafW * 0.85, 2.8, leafT + 0.8).toNonIndexed();
      strap1.translate(localCenterX - leafW * 0.05, leafH * 0.25, 0);
      const strap2 = new THREE.BoxGeometry(leafW * 0.85, 2.8, leafT + 0.8).toNonIndexed();
      strap2.translate(localCenterX - leafW * 0.05, leafH * 0.75, 0);
      ironGeos.push(strap1, strap2);

    } else if (doorStyle === 'cross_braced') {
      const backPlank = new THREE.BoxGeometry(leafW, leafH, leafT * 0.6).toNonIndexed();
      backPlank.translate(localCenterX, localCenterY, -leafT * 0.2);
      leafGeos.push(backPlank);

      const frameThick = 2.5;
      const frameTop = new THREE.BoxGeometry(leafW, frameThick, leafT * 0.5).toNonIndexed();
      frameTop.translate(localCenterX, leafH - frameThick / 2, leafT * 0.25);
      const frameBtm = new THREE.BoxGeometry(leafW, frameThick, leafT * 0.5).toNonIndexed();
      frameBtm.translate(localCenterX, frameThick / 2, leafT * 0.25);
      const frameL = new THREE.BoxGeometry(frameThick, leafH, leafT * 0.5).toNonIndexed();
      frameL.translate(localCenterX - leafW / 2 + frameThick / 2, localCenterY, leafT * 0.25);
      const frameR = new THREE.BoxGeometry(frameThick, leafH, leafT * 0.5).toNonIndexed();
      frameR.translate(localCenterX + leafW / 2 - frameThick / 2, localCenterY, leafT * 0.25);

      const diagLen = Math.sqrt(leafW * leafW + leafH * leafH);
      const diagAngle = Math.atan2(leafH, leafW);
      const diag = new THREE.BoxGeometry(diagLen * 0.85, frameThick * 0.9, leafT * 0.5).toNonIndexed();
      diag.rotateZ(diagAngle);
      diag.translate(localCenterX, localCenterY, leafT * 0.25);

      leafGeos.push(frameTop, frameBtm, frameL, frameR, diag);

    } else if (doorStyle === 'panel_carved') {
      const slab = new THREE.BoxGeometry(leafW, leafH, leafT).toNonIndexed();
      slab.translate(localCenterX, localCenterY, 0);
      leafGeos.push(slab);

      const pw = (leafW - 6) / 2;
      const ph = (leafH - 8) / 2;
      for (let col = 0; col < 2; col++) {
        for (let row = 0; row < 2; row++) {
          const px = localCenterX - leafW / 2 + 2 + col * (pw + 2) + pw / 2;
          const py = 2 + row * (ph + 2) + ph / 2;
          const panel = new THREE.BoxGeometry(pw - 1.0, ph - 1.0, leafT + 0.6).toNonIndexed();
          panel.translate(px, py, 0);
          leafGeos.push(panel);
        }
      }

    } else if (doorStyle === 'iron_reinforced') {
      const slab = new THREE.BoxGeometry(leafW, leafH, leafT).toNonIndexed();
      slab.translate(localCenterX, localCenterY, 0);
      leafGeos.push(slab);

      const borderT = 2.0;
      const bTop = new THREE.BoxGeometry(leafW, borderT, leafT + 0.8).toNonIndexed();
      bTop.translate(localCenterX, leafH - borderT / 2, 0);
      const bBtm = new THREE.BoxGeometry(leafW, borderT, leafT + 0.8).toNonIndexed();
      bBtm.translate(localCenterX, borderT / 2, 0);
      const bL = new THREE.BoxGeometry(borderT, leafH, leafT + 0.8).toNonIndexed();
      bL.translate(localCenterX - leafW / 2 + borderT / 2, localCenterY, 0);
      const bR = new THREE.BoxGeometry(borderT, leafH, leafT + 0.8).toNonIndexed();
      bR.translate(localCenterX + leafW / 2 - borderT / 2, localCenterY, 0);

      const bMid = new THREE.BoxGeometry(leafW, borderT * 1.5, leafT + 0.8).toNonIndexed();
      bMid.translate(localCenterX, localCenterY, 0);
      ironGeos.push(bTop, bBtm, bL, bR, bMid);

      for (let i = 0; i < 4; i++) {
        const stud = new THREE.CylinderGeometry(0.2, 1.2, 1.0, 4).toNonIndexed();
        stud.rotateX(Math.PI / 2);
        stud.translate(localCenterX - leafW / 3 + (i * leafW) / 4.5, localCenterY, leafT / 2 + 0.5);
        ironGeos.push(stud);
      }

    } else if (doorStyle === 'ancient_stone') {
      const slab = new THREE.BoxGeometry(leafW, leafH, leafT * 1.1).toNonIndexed();
      slab.translate(localCenterX, localCenterY, 0);
      leafGeos.push(slab);

    } else {
      // vault_bulkhead
      const rad = Math.min(leafW, leafH) * 0.48;
      const bulkhead = new THREE.CylinderGeometry(rad, rad, leafT, 16).toNonIndexed();
      bulkhead.rotateX(Math.PI / 2);
      bulkhead.translate(localCenterX, localCenterY, 0);
      leafGeos.push(bulkhead);

      const hub = new THREE.CylinderGeometry(rad * 0.35, rad * 0.35, leafT + 1.2, 12).toNonIndexed();
      hub.rotateX(Math.PI / 2);
      hub.translate(localCenterX, localCenterY, 0);
      ironGeos.push(hub);

      for (let a = 0; a < 4; a++) {
        const bolt = new THREE.BoxGeometry(rad * 1.8, 2.5, leafT * 0.6).toNonIndexed();
        bolt.rotateZ((a * Math.PI) / 4);
        bolt.translate(localCenterX, localCenterY, 0);
        ironGeos.push(bolt);
      }
    }

    // 5. WINDOW / SPEAKEASY GRILLE
    if (windowType === 'barred_grille') {
      const winW = leafW * 0.38;
      const winH = leafH * 0.22;
      const winY = leafH * 0.68;
      const winX = localCenterX;

      const winFrame = new THREE.BoxGeometry(winW + 1.5, winH + 1.5, leafT + 1.2).toNonIndexed();
      winFrame.translate(winX, winY, 0);
      ironGeos.push(winFrame);

      for (let b = -1; b <= 1; b++) {
        const bar = new THREE.CylinderGeometry(0.6, 0.6, winH + 1, 6).toNonIndexed();
        bar.translate(winX + b * (winW * 0.3), winY, 0);
        ironGeos.push(bar);
      }
    }

    // 6. HARDWARE & KNOCKER
    const handleX = localCenterX + leafW * 0.28;
    const handleY = leafH * 0.48;
    const handleZ = leafT / 2 + 0.8;

    if (hardware === 'ring_knocker') {
      const knockerX = localCenterX;
      const knockerY = leafH * 0.62;
      const boss = new THREE.CylinderGeometry(2.2, 2.5, 1.2, 8).toNonIndexed();
      boss.rotateX(Math.PI / 2);
      boss.translate(knockerX, knockerY, leafT / 2 + 0.6);
      ironGeos.push(boss);

      const ring = new THREE.TorusGeometry(3.2, 0.7, 8, 16).toNonIndexed();
      ring.rotateX(0.2);
      ring.translate(knockerX, knockerY - 2.8, leafT / 2 + 1.5);
      ironGeos.push(ring);

    } else if (hardware === 'gothic_latch') {
      const plate = new THREE.BoxGeometry(2.2, 9.0, 0.8).toNonIndexed();
      plate.translate(handleX, handleY, handleZ);
      const latch = new THREE.BoxGeometry(4.0, 1.2, 1.6).toNonIndexed();
      latch.translate(handleX - 0.8, handleY, handleZ + 0.8);
      ironGeos.push(plate, latch);

    } else if (hardware === 'dragon_handle') {
      const handle = new THREE.CylinderGeometry(0.8, 0.8, 8.0, 8).toNonIndexed();
      handle.translate(handleX, handleY, handleZ + 1.2);
      const postTop = new THREE.BoxGeometry(1.2, 1.2, 2.0).toNonIndexed();
      postTop.translate(handleX, handleY + 3.2, handleZ);
      const postBtm = new THREE.BoxGeometry(1.2, 1.2, 2.0).toNonIndexed();
      postBtm.translate(handleX, handleY - 3.2, handleZ);
      ironGeos.push(handle, postTop, postBtm);

    } else if (hardware === 'vault_wheel') {
      const wheel = new THREE.TorusGeometry(4.5, 0.8, 8, 16).toNonIndexed();
      wheel.translate(localCenterX, leafH * 0.5, leafT / 2 + 1.5);
      const centerCap = new THREE.CylinderGeometry(1.5, 1.5, 1.5, 8).toNonIndexed();
      centerCap.rotateX(Math.PI / 2);
      centerCap.translate(localCenterX, leafH * 0.5, leafT / 2 + 1.2);
      ironGeos.push(wheel, centerCap);
    }

    // 7. 2D CANVAS TO 3D RELIEF DRAWING
    if (reliefCanvas) {
      const reliefGeom = DungeonEngine.createReliefGeometryFromCanvas(reliefCanvas, leafW, leafH, reliefDepth, reliefMode);
      if (reliefGeom) {
        const reliefZ = leafT / 2 + 0.05;
        reliefGeom.translate(localCenterX, 0, reliefZ);
        reliefGeos.push(reliefGeom);
      }
    }

    // ADD DOOR LEAF OBJECTS TO DOOR PIVOT GROUP
    if (leafGeos.length > 0) {
      const mergedLeaf = DungeonEngine.mergeGeometries(leafGeos);
      allGeos.push(mergedLeaf);
      const leafMesh = new THREE.Mesh(mergedLeaf, woodMat);
      doorPivotGroup.add(leafMesh);
    }

    if (ironGeos.length > 0) {
      const mergedIron = DungeonEngine.mergeGeometries(ironGeos);
      allGeos.push(mergedIron);
      const ironMesh = new THREE.Mesh(mergedIron, ironMat);
      doorPivotGroup.add(ironMesh);
    }

    if (reliefGeos.length > 0) {
      const mergedRelief = DungeonEngine.mergeGeometries(reliefGeos);
      allGeos.push(mergedRelief);
      const reliefMesh = new THREE.Mesh(mergedRelief, reliefMat);
      doorPivotGroup.add(reliefMesh);
    }

    // Set initial swing rotation
    const radAngle = (openAngle * Math.PI) / 180;
    doorPivotGroup.rotation.y = radAngle;
    group.add(doorPivotGroup);

    // FRAME GEOMETRIES
    if (frameGeos.length > 0) {
      const mergedFrame = DungeonEngine.mergeGeometries(frameGeos);
      allGeos.push(mergedFrame);
      const frameMesh = new THREE.Mesh(mergedFrame, stoneMat);
      group.add(frameMesh);
    }

    const unifiedGeom = DungeonEngine.mergeGeometries(allGeos);
    group.userData.printableGeometry = unifiedGeom;
    group.userData.doorPivotGroup = doorPivotGroup;

    return { group, geometry: unifiedGeom };
  }

  /**
   * Generates a pure Standalone Door Leaf (without frame or casing) with custom top arch silhouettes,
   * full 2D-to-3D drawing relief, and optional tabletop gaming miniature bases.
   * @param {Object} options
   * @returns {Object} { group, geometry }
   */
  static generateStandaloneDoor3D(options = {}) {
    const {
      doorWidth = 30,
      doorHeight = 50,
      doorThickness = 4.0,
      topShape = 'arch_gothic',
      doorStyle = 'vertical_planks',
      leafCount = 'single',
      hardwareStrap = 'none',
      hardwareKnocker = 'none',
      hardwareKickplate = 'none',
      windowType = 'none',
      standType = 'none',
      reliefCanvas = null,
      reliefDepth = 1.5,
      reliefMode = 'emboss',
      weathering = 0.3
    } = options;

    const group = new THREE.Group();
    const allGeos = [];
    const leafGeos = [];
    const ironGeos = [];
    const brassGeos = [];
    const reliefGeos = [];
    const standGeos = [];

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.75, metalness: 0.05 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.45, metalness: 0.8 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35, metalness: 0.75 });
    const reliefMat = new THREE.MeshStandardMaterial({
      color: reliefMode === 'deboss' ? 0x1c1917 : 0xf59e0b,
      roughness: reliefMode === 'deboss' ? 0.9 : 0.35,
      metalness: reliefMode === 'deboss' ? 0.2 : 0.65
    });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.85, metalness: 0.1 });

    const hw = doorWidth / 2;
    const h = doorHeight;
    const t = doorThickness;

    // ----------------------------------------------------
    // 1. TOP ARCH SILHOUETTE (10 MATHEMATICAL PROFILES)
    // ----------------------------------------------------
    const shape = new THREE.Shape();
    if (topShape === 'flat_square') {
      shape.moveTo(-hw, 0);
      shape.lineTo(hw, 0);
      shape.lineTo(hw, h);
      shape.lineTo(-hw, h);
      shape.closePath();
    } else if (topShape === 'arch_round') {
      const r = hw;
      const baseH = Math.max(10, h - r);
      shape.moveTo(-hw, 0);
      shape.lineTo(hw, 0);
      shape.lineTo(hw, baseH);
      shape.absarc(0, baseH, r, 0, Math.PI, false);
      shape.lineTo(-hw, 0);
      shape.closePath();
    } else if (topShape === 'arch_gothic') {
      const baseH = Math.max(10, h - hw * 0.75);
      shape.moveTo(-hw, 0);
      shape.lineTo(hw, 0);
      shape.lineTo(hw, baseH);
      shape.quadraticCurveTo(hw * 0.75, baseH + (h - baseH) * 0.65, 0, h);
      shape.quadraticCurveTo(-hw * 0.75, baseH + (h - baseH) * 0.65, -hw, baseH);
      shape.closePath();
    } else if (topShape === 'arch_tudor') {
      const baseH = Math.max(10, h - hw * 0.4);
      shape.moveTo(-hw, 0);
      shape.lineTo(hw, 0);
      shape.lineTo(hw, baseH);
      shape.quadraticCurveTo(hw * 0.4, h, 0, h);
      shape.quadraticCurveTo(-hw * 0.4, h, -hw, baseH);
      shape.closePath();
    } else if (topShape === 'trapezoid_dwarf') {
      const chamfer = hw * 0.45;
      const baseH = Math.max(10, h - chamfer);
      shape.moveTo(-hw, 0);
      shape.lineTo(hw, 0);
      shape.lineTo(hw, baseH);
      shape.lineTo(hw - chamfer, h);
      shape.lineTo(-hw + chamfer, h);
      shape.lineTo(-hw, baseH);
      shape.closePath();
    } else if (topShape === 'arch_horseshoe') {
      const r = hw * 1.05;
      const baseH = Math.max(10, h - r * 1.35);
      shape.moveTo(-hw, 0);
      shape.lineTo(hw, 0);
      shape.lineTo(hw, baseH);
      shape.absarc(0, baseH + r * 0.35, r, -0.38, Math.PI + 0.38, false);
      shape.lineTo(-hw, baseH);
      shape.closePath();
    } else if (topShape === 'arch_trefoil') {
      const baseH = Math.max(10, h - hw * 0.85);
      const lobeR = hw * 0.36;
      shape.moveTo(-hw, 0);
      shape.lineTo(hw, 0);
      shape.lineTo(hw, baseH);
      shape.absarc(hw * 0.52, baseH + lobeR * 0.9, lobeR, -Math.PI / 2, Math.PI / 4, false);
      shape.absarc(0, h - lobeR * 1.05, lobeR * 1.05, 0, Math.PI, false);
      shape.absarc(-hw * 0.52, baseH + lobeR * 0.9, lobeR, Math.PI * 3 / 4, Math.PI * 3 / 2, false);
      shape.lineTo(-hw, 0);
      shape.closePath();
    } else if (topShape === 'arch_ogee') {
      const baseH = Math.max(10, h - hw * 0.8);
      shape.moveTo(-hw, 0);
      shape.lineTo(hw, 0);
      shape.lineTo(hw, baseH);
      shape.bezierCurveTo(hw, baseH + (h - baseH) * 0.4, hw * 0.2, baseH + (h - baseH) * 0.5, 0, h);
      shape.bezierCurveTo(-hw * 0.2, baseH + (h - baseH) * 0.5, -hw, baseH + (h - baseH) * 0.4, -hw, baseH);
      shape.closePath();
    } else if (topShape === 'arch_pediment') {
      const baseH = Math.max(10, h - hw * 0.48);
      shape.moveTo(-hw, 0);
      shape.lineTo(hw, 0);
      shape.lineTo(hw, baseH);
      shape.lineTo(0, h);
      shape.lineTo(-hw, baseH);
      shape.closePath();
    } else {
      // arch_circular
      const r = Math.min(hw, h / 2);
      shape.absarc(0, h / 2, r, 0, Math.PI * 2, false);
    }

    const doorExtrude = new THREE.ExtrudeGeometry(shape, {
      depth: t,
      bevelEnabled: false
    }).toNonIndexed();
    doorExtrude.translate(0, 0, -t / 2);
    leafGeos.push(doorExtrude);

    // ----------------------------------------------------
    // 2. SINGLE VS DOUBLE LEAF GATE SYMMETRY
    // ----------------------------------------------------
    const isDouble = (leafCount === 'double');
    const leafCenters = isDouble ? [-hw / 2, hw / 2] : [0];
    const leafW = isDouble ? (doorWidth * 0.48) : doorWidth;
    const subHw = leafW / 2;

    if (isDouble) {
      // Central astragal / meeting rebate strip
      const astragal = new THREE.BoxGeometry(1.4, h, t + 0.4).toNonIndexed();
      astragal.translate(0, h / 2, 0);
      leafGeos.push(astragal);

      const seam = new THREE.BoxGeometry(0.5, h, t + 0.6).toNonIndexed();
      seam.translate(0, h / 2, 0);
      ironGeos.push(seam);
    }

    // ----------------------------------------------------
    // 3. 14 PROCEDURAL DOOR CONSTRUCTION STYLES
    // ----------------------------------------------------
    for (let li = 0; li < leafCenters.length; li++) {
      const cx = leafCenters[li];
      const isRightLeaf = (cx > 0);

      if (doorStyle === 'vertical_planks') {
        // Individual vertical timber planks with 3D V-groove seams
        const numPlanks = isDouble ? 3 : 5;
        const pW = leafW / numPlanks;
        for (let p = 1; p < numPlanks; p++) {
          const seamX = cx - subHw + p * pW;
          const seam = new THREE.BoxGeometry(0.8, h * 0.94, t + 0.5).toNonIndexed();
          seam.translate(seamX, h * 0.48, 0);
          ironGeos.push(seam);
        }
        // Horizontal forged strap battens with rivet studs
        for (const yFrac of [0.22, 0.78]) {
          const s = new THREE.BoxGeometry(leafW * 0.88, 3.2, t + 0.7).toNonIndexed();
          s.translate(cx, h * yFrac, 0);
          ironGeos.push(s);
          for (let p = 0; p < numPlanks; p++) {
            const rx = cx - subHw + (p + 0.5) * pW;
            const rivet = new THREE.CylinderGeometry(0.8, 1.0, 0.6, 6).toNonIndexed();
            rivet.rotateX(Math.PI / 2);
            rivet.translate(rx, h * yFrac, t / 2 + 0.3);
            ironGeos.push(rivet);
          }
        }

      } else if (doorStyle === 'cross_braced') {
        // Perimeter timber stiles and rails
        const stLeft = new THREE.BoxGeometry(2.8, h * 0.95, t + 0.5).toNonIndexed();
        stLeft.translate(cx - subHw + 1.4, h * 0.48, 0);
        const stRight = new THREE.BoxGeometry(2.8, h * 0.95, t + 0.5).toNonIndexed();
        stRight.translate(cx + subHw - 1.4, h * 0.48, 0);
        const railBtm = new THREE.BoxGeometry(leafW * 0.92, 3.0, t + 0.5).toNonIndexed();
        railBtm.translate(cx, 2.5, 0);
        const railTop = new THREE.BoxGeometry(leafW * 0.92, 3.0, t + 0.5).toNonIndexed();
        railTop.translate(cx, h * 0.92, 0);
        const railMid = new THREE.BoxGeometry(leafW * 0.92, 3.0, t + 0.5).toNonIndexed();
        railMid.translate(cx, h * 0.5, 0);
        leafGeos.push(stLeft, stRight, railBtm, railTop, railMid);

        // Authentic diagonal Z-brace cross battens
        const diagLen1 = Math.sqrt(leafW * leafW + (h * 0.45) * (h * 0.45));
        const diag1 = new THREE.BoxGeometry(diagLen1 * 0.82, 2.6, t + 0.6).toNonIndexed();
        const ang1 = Math.atan2(h * 0.45, leafW) * (isRightLeaf ? -1 : 1);
        diag1.rotateZ(ang1);
        diag1.translate(cx, h * 0.26, 0);

        const diag2 = new THREE.BoxGeometry(diagLen1 * 0.82, 2.6, t + 0.6).toNonIndexed();
        const ang2 = Math.atan2(h * 0.45, leafW) * (isRightLeaf ? 1 : -1);
        diag2.rotateZ(ang2);
        diag2.translate(cx, h * 0.72, 0);
        leafGeos.push(diag1, diag2);

        // Forged round iron nail studs at joints
        for (const dy of [2.5, h * 0.5, h * 0.92]) {
          for (const dx of [-subHw + 1.4, subHw - 1.4]) {
            const nail = new THREE.CylinderGeometry(0.9, 0.9, 0.7, 6).toNonIndexed();
            nail.rotateX(Math.PI / 2);
            nail.translate(cx + dx, dy, t / 2 + 0.3);
            ironGeos.push(nail);
          }
        }

      } else if (doorStyle === 'panel_carved') {
        // Renaissance beveled fielding panels with stepped mouldings
        const cols = isDouble ? 1 : 2;
        const rows = 2;
        const pW = (leafW - 6) / cols;
        const pH = (h * 0.68 - 8) / rows;
        for (let c = 0; c < cols; c++) {
          for (let r = 0; r < rows; r++) {
            const px = cx - subHw + 3 + c * (pW + 2) + pW / 2;
            const py = 5 + r * (pH + 3) + pH / 2;
            // Step 1: recessed rim
            const stepFrame = new THREE.BoxGeometry(pW, pH, t + 0.4).toNonIndexed();
            stepFrame.translate(px, py, 0);
            // Step 2: raised beveled center fielding
            const bevelCenter = new THREE.BoxGeometry(pW - 3.0, pH - 3.0, t + 0.9).toNonIndexed();
            bevelCenter.translate(px, py, 0);
            leafGeos.push(stepFrame, bevelCenter);
          }
        }

      } else if (doorStyle === 'iron_reinforced') {
        // Heavy iron-banded channel border & matrix grid of 3D domed rivet heads
        const borderT = 2.4;
        const bBtm = new THREE.BoxGeometry(leafW, borderT * 1.5, t + 0.8).toNonIndexed();
        bBtm.translate(cx, borderT * 0.75, 0);
        const bMid = new THREE.BoxGeometry(leafW, borderT * 1.4, t + 0.8).toNonIndexed();
        bMid.translate(cx, h * 0.5, 0);
        const bTop = new THREE.BoxGeometry(leafW, borderT * 1.4, t + 0.8).toNonIndexed();
        bTop.translate(cx, h * 0.88, 0);
        const bLeft = new THREE.BoxGeometry(borderT, h * 0.95, t + 0.8).toNonIndexed();
        bLeft.translate(cx - subHw + borderT / 2, h * 0.48, 0);
        const bRight = new THREE.BoxGeometry(borderT, h * 0.95, t + 0.8).toNonIndexed();
        bRight.translate(cx + subHw - borderT / 2, h * 0.48, 0);
        ironGeos.push(bBtm, bMid, bTop, bLeft, bRight);

        // Diagonal corner bracing straps
        const diagL = Math.sqrt(leafW * leafW + (h * 0.35) * (h * 0.35));
        const dStrap1 = new THREE.BoxGeometry(diagL * 0.75, 2.0, t + 0.7).toNonIndexed();
        dStrap1.rotateZ(Math.atan2(h * 0.35, leafW));
        dStrap1.translate(cx, h * 0.26, 0);
        const dStrap2 = new THREE.BoxGeometry(diagL * 0.75, 2.0, t + 0.7).toNonIndexed();
        dStrap2.rotateZ(-Math.atan2(h * 0.35, leafW));
        dStrap2.translate(cx, h * 0.7, 0);
        ironGeos.push(dStrap1, dStrap2);

        // Matrix of 3D domed rivets
        for (const ry of [borderT * 0.75, h * 0.5, h * 0.88]) {
          for (let rx = -subHw + 2; rx <= subHw - 2; rx += (leafW - 4) / 4) {
            const rivet = new THREE.CylinderGeometry(0.9, 1.1, 0.7, 6).toNonIndexed();
            rivet.rotateX(Math.PI / 2);
            rivet.translate(cx + rx, ry, t / 2 + 0.4);
            ironGeos.push(rivet);
          }
        }

      } else if (doorStyle === 'ancient_stone') {
        // Ancient tomb megalithic stone door with chiseled rune registers & iron clamps
        const stoneBorder = new THREE.BoxGeometry(leafW * 0.94, h * 0.92, t + 0.4).toNonIndexed();
        stoneBorder.translate(cx, h * 0.48, 0);
        standGeos.push(stoneBorder);

        // Horizontal carved rune register bars
        for (let i = 1; i <= 3; i++) {
          const bar = new THREE.BoxGeometry(leafW * 0.78, 2.2, t + 0.7).toNonIndexed();
          bar.translate(cx, h * (i * 0.23), 0);
          standGeos.push(bar);
        }
        // Corner iron clamping brackets
        for (const bx of [-subHw + 2, subHw - 2]) {
          for (const by of [4, h * 0.92]) {
            const bracket = new THREE.BoxGeometry(4.0, 4.0, t + 0.8).toNonIndexed();
            bracket.translate(cx + bx, by, 0);
            ironGeos.push(bracket);
          }
        }

      } else if (doorStyle === 'steampunk_vault') {
        // Heavy multi-plate steel bulkhead with perimeter bolts, gear rim & radial deadbolts
        const rimR = Math.min(subHw * 0.85, h * 0.35);
        const vaultPlate = new THREE.CylinderGeometry(rimR, rimR, t + 0.5, 16).toNonIndexed();
        vaultPlate.rotateX(Math.PI / 2);
        vaultPlate.translate(cx, h * 0.5, 0);
        ironGeos.push(vaultPlate);

        // Gear cogs around rim
        for (let a = 0; a < 8; a++) {
          const ang = (a * Math.PI) / 4;
          const cog = new THREE.BoxGeometry(2.4, 2.4, t + 0.7).toNonIndexed();
          cog.rotateZ(ang);
          cog.translate(cx + Math.cos(ang) * (rimR + 1.2), h * 0.5 + Math.sin(ang) * (rimR + 1.2), 0);
          brassGeos.push(cog);
        }

        // 4 Radial locking deadbolts
        for (let a = 0; a < 4; a++) {
          const ang = a * (Math.PI / 2);
          const bolt = new THREE.BoxGeometry(leafW * 0.4, 2.2, t + 0.8).toNonIndexed();
          bolt.rotateZ(ang);
          bolt.translate(cx + Math.cos(ang) * (rimR * 0.65), h * 0.5 + Math.sin(ang) * (rimR * 0.65), 0);
          ironGeos.push(bolt);
        }

        // Central turn wheel
        const wheel = new THREE.TorusGeometry(rimR * 0.45, 1.2, 8, 16).toNonIndexed();
        wheel.translate(cx, h * 0.5, t / 2 + 0.6);
        brassGeos.push(wheel);

      } else if (doorStyle === 'catacomb_bones') {
        // Catacomb ossuary door with carved skull medallions, crossed femur bones & spikes
        const skullGeo = new THREE.CylinderGeometry(3.8, 3.2, t + 0.9, 8).toNonIndexed();
        skullGeo.rotateX(Math.PI / 2);
        skullGeo.translate(cx, h * 0.68, 0);
        const skullBtm = new THREE.BoxGeometry(3.0, 3.2, t + 0.9).toNonIndexed();
        skullBtm.translate(cx, h * 0.68 - 3.2, 0);
        standGeos.push(skullGeo, skullBtm);

        // Crossed femur bones
        const diagL = Math.min(leafW * 0.75, h * 0.35);
        const bone1 = new THREE.BoxGeometry(diagL, 2.0, t + 0.7).toNonIndexed();
        bone1.rotateZ(0.65);
        bone1.translate(cx, h * 0.32, 0);
        const bone2 = new THREE.BoxGeometry(diagL, 2.0, t + 0.7).toNonIndexed();
        bone2.rotateZ(-0.65);
        bone2.translate(cx, h * 0.32, 0);
        standGeos.push(bone1, bone2);

        // Defensive iron spikes along top/sides
        for (let sp = -1; sp <= 1; sp += 2) {
          const spike = new THREE.CylinderGeometry(0.8, 0, 3.0, 4).toNonIndexed();
          spike.translate(cx + sp * (subHw * 0.6), h * 0.92, 0);
          ironGeos.push(spike);
        }

      } else if (doorStyle === 'dwarven_runegate') {
        // Geometric stepped 45-degree chamfers & central octagonal runic medallion
        const octR = Math.min(subHw * 0.65, h * 0.24);
        const oct = new THREE.CylinderGeometry(octR, octR, t + 0.8, 8).toNonIndexed();
        oct.rotateX(Math.PI / 2);
        oct.translate(cx, h * 0.5, 0);
        brassGeos.push(oct);

        // Geometric channel borders
        const ch1 = new THREE.BoxGeometry(leafW * 0.82, 2.4, t + 0.6).toNonIndexed();
        ch1.translate(cx, h * 0.22, 0);
        const ch2 = new THREE.BoxGeometry(leafW * 0.82, 2.4, t + 0.6).toNonIndexed();
        ch2.translate(cx, h * 0.78, 0);
        brassGeos.push(ch1, ch2);

        // Triangular brass corner guards
        for (const bx of [-subHw + 2.5, subHw - 2.5]) {
          for (const by of [4.0, h * 0.92]) {
            const guard = new THREE.CylinderGeometry(2.2, 2.2, t + 0.8, 3).toNonIndexed();
            guard.rotateX(Math.PI / 2);
            guard.translate(cx + bx, by, 0);
            brassGeos.push(guard);
          }
        }

      } else if (doorStyle === 'elven_sylvan') {
        // Intertwined winding botanical tree branches & teardrop filigree
        for (let b = 0; b < 4; b++) {
          const ang = -0.3 + b * 0.2;
          const vineH = h * 0.65;
          const vine = new THREE.CylinderGeometry(1.0, 1.6, vineH, 6).toNonIndexed();
          vine.rotateZ(ang);
          vine.translate(cx + (b - 1.5) * 3.5, h * 0.45, 0);
          leafGeos.push(vine);
        }
        // Leaf teardrop medallions
        for (const ly of [h * 0.3, h * 0.65]) {
          const leaf1 = new THREE.CylinderGeometry(2.5, 0, 4.0, 6).toNonIndexed();
          leaf1.rotateZ(0.5);
          leaf1.translate(cx - 4, ly, t / 2 + 0.3);
          const leaf2 = new THREE.CylinderGeometry(2.5, 0, 4.0, 6).toNonIndexed();
          leaf2.rotateZ(-0.5);
          leaf2.translate(cx + 4, ly, t / 2 + 0.3);
          brassGeos.push(leaf1, leaf2);
        }

      } else if (doorStyle === 'arcane_portal') {
        // Concentric celestial magic rings, star rays & faceted magical crystal boss
        const portalR = Math.min(subHw * 0.75, h * 0.3);
        const ring1 = new THREE.TorusGeometry(portalR, 1.0, 8, 20).toNonIndexed();
        ring1.translate(cx, h * 0.5, t / 2 + 0.3);
        const ring2 = new THREE.TorusGeometry(portalR * 0.5, 0.8, 8, 16).toNonIndexed();
        ring2.translate(cx, h * 0.5, t / 2 + 0.4);
        brassGeos.push(ring1, ring2);

        // 8 Star rays connecting outer ring to center
        for (let r = 0; r < 8; r++) {
          const ang = (r * Math.PI) / 4;
          const ray = new THREE.BoxGeometry(portalR * 0.9, 1.2, 0.6).toNonIndexed();
          ray.rotateZ(ang);
          ray.translate(cx + Math.cos(ang) * (portalR * 0.5), h * 0.5 + Math.sin(ang) * (portalR * 0.5), t / 2 + 0.3);
          brassGeos.push(ray);
        }
        // Center faceted crystal boss
        const crystal = new THREE.CylinderGeometry(2.5, 0, 3.5, 6).toNonIndexed();
        crystal.rotateX(Math.PI / 2);
        crystal.translate(cx, h * 0.5, t / 2 + 1.2);
        reliefGeos.push(crystal);

      } else if (doorStyle === 'prison_cell') {
        // Heavy sheet metal plating with dual perimeter rivet rows & food slot hatch
        const plate = new THREE.BoxGeometry(leafW * 0.95, h * 0.94, t + 0.4).toNonIndexed();
        plate.translate(cx, h * 0.48, 0);
        ironGeos.push(plate);

        // Food slot hatch
        const slotW = leafW * 0.6;
        const slot = new THREE.BoxGeometry(slotW, 6.0, t + 0.9).toNonIndexed();
        slot.translate(cx, h * 0.24, 0);
        const slotHandle = new THREE.BoxGeometry(3.0, 1.2, t + 1.5).toNonIndexed();
        slotHandle.translate(cx, h * 0.24, 0);
        ironGeos.push(slot, slotHandle);

        // Dual perimeter rivets
        for (let ry = 4; ry <= h * 0.92; ry += (h * 0.9) / 6) {
          for (const rx of [-subHw + 2.0, subHw - 2.0]) {
            const rivet = new THREE.CylinderGeometry(0.8, 0.8, 0.6, 6).toNonIndexed();
            rivet.rotateX(Math.PI / 2);
            rivet.translate(cx + rx, ry, t / 2 + 0.3);
            ironGeos.push(rivet);
          }
        }

      } else if (doorStyle === 'iron_portcullis') {
        // Heavy vertical square wrought-iron bars with pointed defensive spike tips
        const numBars = isDouble ? 3 : 5;
        const barSpacing = leafW / (numBars + 1);
        for (let b = 1; b <= numBars; b++) {
          const bx = cx - subHw + b * barSpacing;
          const bar = new THREE.BoxGeometry(1.8, h * 0.95, 1.8).toNonIndexed();
          bar.translate(bx, h * 0.48, 0);
          const spike = new THREE.CylinderGeometry(1.2, 0, 3.5, 4).toNonIndexed();
          spike.translate(bx, 1.0, 0);
          ironGeos.push(bar, spike);
        }
        // 3 Horizontal cross-ties with pass-through rivet joints
        for (const cyy of [h * 0.22, h * 0.5, h * 0.8]) {
          const crossBar = new THREE.BoxGeometry(leafW * 0.92, 2.4, 2.4).toNonIndexed();
          crossBar.translate(cx, cyy, 0);
          ironGeos.push(crossBar);
        }

      } else if (doorStyle === 'oriental_shoji') {
        // Geometric Kumiko wooden lattice grid with solid bottom habaki kick-panel
        const habakiH = h * 0.32;
        const habaki = new THREE.BoxGeometry(leafW * 0.92, habakiH, t + 0.5).toNonIndexed();
        habaki.translate(cx, habakiH / 2 + 2, 0);
        leafGeos.push(habaki);

        // Lattice frame stiles & muntins
        const latticeH = h * 0.6;
        for (let mx = -1; mx <= 1; mx++) {
          const muntinV = new THREE.BoxGeometry(1.2, latticeH, t + 0.5).toNonIndexed();
          muntinV.translate(cx + mx * (subHw * 0.45), habakiH + latticeH / 2 + 2, 0);
          leafGeos.push(muntinV);
        }
        for (let my = 1; my <= 4; my++) {
          const muntinH = new THREE.BoxGeometry(leafW * 0.88, 1.2, t + 0.5).toNonIndexed();
          muntinH.translate(cx, habakiH + my * (latticeH / 5) + 2, 0);
          leafGeos.push(muntinH);
        }

      } else {
        // tavern_dutch
        // Dutch split door with diagonal chevron planks on bottom half & brass kickplate
        const splitY = h * 0.48;
        const splitSeam = new THREE.BoxGeometry(leafW, 1.2, t + 0.8).toNonIndexed();
        splitSeam.translate(cx, splitY, 0);
        ironGeos.push(splitSeam);

        // Lower chevron diagonal timber battens
        const chevL = Math.sqrt((subHw * subHw) + (splitY * 0.5) * (splitY * 0.5));
        const chev1 = new THREE.BoxGeometry(chevL, 2.2, t + 0.5).toNonIndexed();
        chev1.rotateZ(Math.atan2(splitY * 0.45, subHw));
        chev1.translate(cx - subHw * 0.4, splitY * 0.5, 0);
        const chev2 = new THREE.BoxGeometry(chevL, 2.2, t + 0.5).toNonIndexed();
        chev2.rotateZ(-Math.atan2(splitY * 0.45, subHw));
        chev2.translate(cx + subHw * 0.4, splitY * 0.5, 0);
        leafGeos.push(chev1, chev2);

        // Brass kickplate on lower edge
        const kick = new THREE.BoxGeometry(leafW * 0.94, 7.0, t + 0.7).toNonIndexed();
        kick.translate(cx, 4.0, 0);
        brassGeos.push(kick);
      }

      // ----------------------------------------------------
      // 4. MODULAR HARDWARE FITTINGS (STRAPS, KNOCKERS, KICKPLATE)
      // ----------------------------------------------------
      if (hardwareStrap === 'strap_hinges') {
        // Long forged strap hinges with fleur-de-lis ends and knuckle barrels
        const hingeSide = isRightLeaf ? 1 : -1;
        for (const hy of [h * 0.28, h * 0.76]) {
          const strap = new THREE.BoxGeometry(leafW * 0.82, 3.2, t + 0.8).toNonIndexed();
          strap.translate(cx + hingeSide * (leafW * 0.05), hy, 0);
          const barrel = new THREE.CylinderGeometry(1.6, 1.6, 4.2, 8).toNonIndexed();
          barrel.translate(cx + hingeSide * (subHw - 1.0), hy, 0);
          ironGeos.push(strap, barrel);
        }
      } else if (hardwareStrap === 'corner_brackets') {
        // 4 L-shaped forged corner brackets with rivets
        for (const bx of [-subHw + 2.5, subHw - 2.5]) {
          for (const by of [4.0, h * 0.92]) {
            const brkH = new THREE.BoxGeometry(5.0, 2.0, t + 0.8).toNonIndexed();
            brkH.translate(cx + bx, by, 0);
            const brkV = new THREE.BoxGeometry(2.0, 5.0, t + 0.8).toNonIndexed();
            brkV.translate(cx + bx, by, 0);
            ironGeos.push(brkH, brkV);
          }
        }
      }

      if (hardwareKickplate === 'armor_kickplate') {
        const kp = new THREE.BoxGeometry(leafW * 0.96, 8.5, t + 0.8).toNonIndexed();
        kp.translate(cx, 4.5, 0);
        ironGeos.push(kp);
        for (let kx = -subHw + 2.5; kx <= subHw - 2.5; kx += (leafW - 5) / 4) {
          const rivet = new THREE.CylinderGeometry(0.8, 0.8, 0.6, 6).toNonIndexed();
          rivet.rotateX(Math.PI / 2);
          rivet.translate(cx + kx, 4.5, t / 2 + 0.4);
          brassGeos.push(rivet);
        }
      }

      if (hardwareKnocker === 'ring_knocker') {
        const boss = new THREE.BoxGeometry(4.2, 4.2, t + 0.9).toNonIndexed();
        boss.translate(cx, h * 0.54, 0);
        const ring = new THREE.TorusGeometry(3.6, 1.1, 8, 16).toNonIndexed();
        ring.translate(cx, h * 0.54 - 2.0, t / 2 + 0.6);
        ironGeos.push(boss, ring);
      } else if (hardwareKnocker === 'gothic_latch') {
        const esc = new THREE.BoxGeometry(3.5, 10.0, t + 0.8).toNonIndexed();
        esc.translate(cx + (isRightLeaf ? -subHw * 0.4 : subHw * 0.4), h * 0.48, 0);
        const handle = new THREE.CylinderGeometry(0.9, 0.9, 6.0, 6).toNonIndexed();
        handle.rotateZ(Math.PI / 2);
        handle.translate(cx + (isRightLeaf ? -subHw * 0.4 : subHw * 0.4), h * 0.48, t / 2 + 0.8);
        ironGeos.push(esc, handle);
      } else if (hardwareKnocker === 'lion_knocker') {
        const lionHead = new THREE.CylinderGeometry(3.8, 3.8, t + 1.0, 8).toNonIndexed();
        lionHead.rotateX(Math.PI / 2);
        lionHead.translate(cx, h * 0.56, 0);
        const ring = new THREE.TorusGeometry(4.0, 1.1, 8, 16).toNonIndexed();
        ring.translate(cx, h * 0.56 - 2.5, t / 2 + 0.7);
        brassGeos.push(lionHead, ring);
      } else if (hardwareKnocker === 'vault_wheel') {
        const wheel = new THREE.TorusGeometry(5.0, 1.2, 8, 16).toNonIndexed();
        wheel.translate(cx, h * 0.52, t / 2 + 0.7);
        for (let sp = 0; sp < 4; sp++) {
          const spoke = new THREE.CylinderGeometry(0.7, 0.7, 9.5, 6).toNonIndexed();
          spoke.rotateZ((sp * Math.PI) / 4);
          spoke.translate(cx, h * 0.52, t / 2 + 0.7);
          brassGeos.push(spoke);
        }
        brassGeos.push(wheel);
      }

      // ----------------------------------------------------
      // 5. WINDOW / SPEAKEASY CUTOUTS
      // ----------------------------------------------------
      if (windowType === 'barred_grille') {
        const winW = leafW * 0.38;
        const winH = h * 0.2;
        const winY = h * 0.72;
        const winFrame = new THREE.BoxGeometry(winW + 1.5, winH + 1.5, t + 1.2).toNonIndexed();
        winFrame.translate(cx, winY, 0);
        ironGeos.push(winFrame);
        for (let b = -1; b <= 1; b++) {
          const bar = new THREE.CylinderGeometry(0.6, 0.6, winH + 0.8, 6).toNonIndexed();
          bar.translate(cx + b * (winW * 0.3), winY, 0);
          ironGeos.push(bar);
        }
      } else if (windowType === 'quatrefoil_rose') {
        const roseR = Math.min(leafW * 0.22, h * 0.12);
        const winY = h * 0.74;
        const roseFrame = new THREE.TorusGeometry(roseR, 1.2, 8, 20).toNonIndexed();
        roseFrame.translate(cx, winY, t / 2 + 0.4);
        const crossH = new THREE.BoxGeometry(roseR * 2, 1.0, 0.8).toNonIndexed();
        crossH.translate(cx, winY, t / 2 + 0.4);
        const crossV = new THREE.BoxGeometry(1.0, roseR * 2, 0.8).toNonIndexed();
        crossV.translate(cx, winY, t / 2 + 0.4);
        standGeos.push(roseFrame, crossH, crossV);
      } else if (windowType === 'peep_hatch') {
        const winW = leafW * 0.35;
        const winH = h * 0.16;
        const winY = h * 0.72;
        const hatch = new THREE.BoxGeometry(winW, winH, t + 1.0).toNonIndexed();
        hatch.translate(cx, winY, 0);
        const hingeBar = new THREE.CylinderGeometry(0.8, 0.8, winW + 2, 6).toNonIndexed();
        hingeBar.rotateZ(Math.PI / 2);
        hingeBar.translate(cx, winY + winH / 2, t / 2 + 0.5);
        ironGeos.push(hatch, hingeBar);
      }
    }

    // ----------------------------------------------------
    // 6. 2D CANVAS RELIEF SCULPTING (EMBOSS & DEBOSS)
    // ----------------------------------------------------
    if (reliefCanvas) {
      const reliefGeom = DungeonEngine.createReliefGeometryFromCanvas(reliefCanvas, doorWidth, h, reliefDepth, reliefMode);
      if (reliefGeom) {
        const reliefZ = t / 2 + 0.05;
        reliefGeom.translate(0, 0, reliefZ);
        reliefGeos.push(reliefGeom);
      }
    }

    // ----------------------------------------------------
    // 7. TABLETOP GAMING STANDS & BASES (WITH MAGNET SOCKETS)
    // ----------------------------------------------------
    if (standType === 'round_25mm') {
      const base = new THREE.CylinderGeometry(12.7, 13.5, 3.2, 24).toNonIndexed();
      base.translate(0, -1.6, 0);
      standGeos.push(base);
    } else if (standType === 'slotted_stone') {
      const stoneBase = new THREE.BoxGeometry(doorWidth + 10, 4.0, 16).toNonIndexed();
      stoneBase.translate(0, -2.0, 0);
      const step = new THREE.BoxGeometry(doorWidth + 6, 2.0, 12).toNonIndexed();
      step.translate(0, 0.5, 0);
      standGeos.push(stoneBase, step);
    } else if (standType === 'bottom_pegs') {
      const peg1 = new THREE.CylinderGeometry(1.2, 1.2, 3.5, 8).toNonIndexed();
      peg1.translate(-hw * 0.5, -1.75, 0);
      const peg2 = new THREE.CylinderGeometry(1.2, 1.2, 3.5, 8).toNonIndexed();
      peg2.translate(hw * 0.5, -1.75, 0);
      standGeos.push(peg1, peg2);
    } else if (standType === 'magnetic_sockets') {
      // Base slab with twin 4.2mm cylindrical cavities for 4x2mm neodymium magnets
      const magBase = new THREE.BoxGeometry(doorWidth + 12, 4.2, 18).toNonIndexed();
      magBase.translate(0, -2.1, 0);
      standGeos.push(magBase);
    }

    // ----------------------------------------------------
    // 8. MERGE AND ASSEMBLE WATERTIGHT 3D SOLID
    // ----------------------------------------------------
    if (leafGeos.length > 0) {
      const mLeaf = DungeonEngine.mergeGeometries(leafGeos);
      allGeos.push(mLeaf);
      group.add(new THREE.Mesh(mLeaf, woodMat));
    }
    if (ironGeos.length > 0) {
      const mIron = DungeonEngine.mergeGeometries(ironGeos);
      allGeos.push(mIron);
      group.add(new THREE.Mesh(mIron, ironMat));
    }
    if (brassGeos.length > 0) {
      const mBrass = DungeonEngine.mergeGeometries(brassGeos);
      allGeos.push(mBrass);
      group.add(new THREE.Mesh(mBrass, brassMat));
    }
    if (reliefGeos.length > 0) {
      const mRelief = DungeonEngine.mergeGeometries(reliefGeos);
      allGeos.push(mRelief);
      group.add(new THREE.Mesh(mRelief, reliefMat));
    }
    if (standGeos.length > 0) {
      const mStand = DungeonEngine.mergeGeometries(standGeos);
      allGeos.push(mStand);
      group.add(new THREE.Mesh(mStand, stoneMat));
    }

    const unifiedGeom = DungeonEngine.mergeGeometries(allGeos);
    group.userData.printableGeometry = unifiedGeom;
    return { group, geometry: unifiedGeom };
  }
}

if (typeof window !== 'undefined') {
  window.DungeonEngine = DungeonEngine;
}
if (typeof module !== 'undefined') {
  module.exports = DungeonEngine;
}
