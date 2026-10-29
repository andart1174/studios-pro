/**
 * PolyMorph 3D Studio - Magic Optics & 3D Illusions Engine
 * 1. Dual-View Ambiguous Cylinders (Sugihara Optical Illusions)
 * 2. Dual-Word Orthogonal Anamorphic 3D Typography
 * 3. 3D Digital Sundial Generator with Solar Raycast Simulation
 * 4. Virtual Studio Mirror Simulator
 */
class OpticsEngine {
  /**
   * Library of Optical Illusion & Magic 3D Presets
   */
  static getMagicPresets() {
    return [
      { id: 'ambiguous_circle_square', nameKey: 'opticsCircleSquare', category: 'ambiguous', icon: '🔄' },
      { id: 'ambiguous_circle_hex', nameKey: 'opticsCircleHex', category: 'ambiguous', icon: '⬡' },
      { id: 'ambiguous_heart_diamond', nameKey: 'opticsHeartDiamond', category: 'ambiguous', icon: '💖' },
      { id: 'ambiguous_arch_columns', nameKey: 'opticsArchColumns', category: 'ambiguous', icon: '🏛️' },
      { id: 'dual_word_typography', nameKey: 'opticsDualWord', category: 'typography', icon: '🔤' },
      { id: 'digital_sundial', nameKey: 'opticsDigitalSundial', category: 'sundial', icon: '☀️' }
    ];
  }

  // =========================================================================
  // 1. DUAL-VIEW AMBIGUOUS CYLINDERS (Kokichi Sugihara Illusions)
  // =========================================================================

  /**
   * Creates an Ambiguous Cylinder (Circle from front, Square from mirror / 90 deg rotation)
   * Formula: Boundary upper curve z(theta) = h + R * cos(2 * theta)
   */
  static createAmbiguousCylinder(type = 'circle_square', options = {}) {
    const radius = options.radius || 25;
    const baseHeight = options.height || 45;
    const segments = 128;
    const wallThickness = options.wallThickness || 3.0;

    const group = new THREE.Group();
    group.name = `Ambiguous_Cylinder_${type}`;

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(options.color || 0x00f0ff),
      roughness: 0.35,
      metalness: 0.25,
      side: THREE.DoubleSide
    });

    // Helper to calculate top Z height along perimeter angle theta
    const getTopZ = (theta) => {
      if (type === 'circle_square') {
        // Circle from +45 deg, Square from -45 deg
        return baseHeight + (radius * 0.45) * Math.cos(2 * theta);
      } else if (type === 'circle_hex') {
        return baseHeight + (radius * 0.38) * Math.cos(3 * theta);
      } else if (type === 'heart_diamond') {
        return baseHeight + (radius * 0.5) * (Math.sin(theta) + 0.5 * Math.cos(2 * theta));
      }
      return baseHeight + (radius * 0.45) * Math.cos(2 * theta);
    };

    // Construct Inner and Outer Boundary Meshes
    const outerGeo = new THREE.BufferGeometry();
    const positions = [];
    const indices = [];

    const rOut = radius;
    const rIn = radius - wallThickness;

    // Generate Outer Ring Vertices (Bottom & Top) and Inner Ring Vertices
    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      const theta = u * Math.PI * 2;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      const topZ = getTopZ(theta);

      // Outer Bottom (0)
      positions.push(rOut * cosT, 0, rOut * sinT);
      // Outer Top (1)
      positions.push(rOut * cosT, topZ, rOut * sinT);
      // Inner Bottom (2)
      positions.push(rIn * cosT, 0, rIn * sinT);
      // Inner Top (3)
      positions.push(rIn * cosT, topZ - 0.5, rIn * sinT);
    }

    // Connect Quad faces
    for (let i = 0; i < segments; i++) {
      const b = i * 4;
      const nb = (i + 1) * 4;

      // Outer wall
      indices.push(b, b + 1, nb + 1);
      indices.push(b, nb + 1, nb);

      // Inner wall
      indices.push(b + 2, nb + 3, b + 3);
      indices.push(b + 2, nb + 2, nb + 3);

      // Top rim
      indices.push(b + 1, b + 3, nb + 3);
      indices.push(b + 1, nb + 3, nb + 1);

      // Bottom rim
      indices.push(b, nb + 2, b + 2);
      indices.push(b, nb, nb + 2);
    }

    outerGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    outerGeo.setIndex(indices);
    outerGeo.computeVertexNormals();

    const mesh = new THREE.Mesh(outerGeo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    // Pedestal Stand
    const standGeo = new THREE.CylinderGeometry(radius * 1.2, radius * 1.3, 4, 48);
    const standMat = new THREE.MeshStandardMaterial({ color: 0x1a1d24, roughness: 0.7, metalness: 0.3 });
    const stand = new THREE.Mesh(standGeo, standMat);
    stand.position.set(0, -2, 0);
    group.add(stand);

    // Initial 45 degree tilt for maximum illusion viewing
    group.rotation.x = -Math.PI / 6;
    group.rotation.y = Math.PI / 4;

    return group;
  }

  /**
   * Creates an Ambiguous 4-Column Arch
   */
  static createAmbiguousArch(options = {}) {
    const group = new THREE.Group();
    group.name = "Ambiguous_Arch_Columns";

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(options.color || 0x00f0ff),
      roughness: 0.35,
      metalness: 0.25,
      side: THREE.DoubleSide
    });

    const offsets = [
      [-18, -18],
      [18, -18],
      [-18, 18],
      [18, 18]
    ];

    offsets.forEach(([ox, oz]) => {
      const cyl = OpticsEngine.createAmbiguousCylinder('circle_square', { radius: 12, height: 35, color: options.color || 0x00f0ff });
      cyl.position.set(ox, 0, oz);
      cyl.rotation.set(0, 0, 0);
      group.add(cyl);
    });

    // Connecting top roof arches
    const barGeo = new THREE.BoxGeometry(42, 4, 6);
    const bar1 = new THREE.Mesh(barGeo, mat);
    bar1.position.set(0, 38, -18);
    const bar2 = new THREE.Mesh(barGeo, mat);
    bar2.position.set(0, 38, 18);
    group.add(bar1, bar2);

    group.rotation.x = -Math.PI / 6;
    group.rotation.y = Math.PI / 4;
    return group;
  }

  // =========================================================================
  // 2. DUAL-WORD ORTHOGONAL ANAMORPHIC 3D TYPOGRAPHY
  // =========================================================================

  /**
   * Generates a 3D sculpture from two intersecting words (Word 1 viewed from Left, Word 2 viewed from Right)
   * @param {string} word1 e.g. "LOVE"
   * @param {string} word2 e.g. "LIFE"
   * @param {Object} options 
   */
  static createDualWordTypography(word1 = "LOVE", word2 = "LIFE", options = {}) {
    const group = new THREE.Group();
    group.name = `DualWord_${word1}_${word2}`;

    const textMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(options.color || 0xffb703),
      roughness: 0.35,
      metalness: 0.3
    });

    const w1 = (word1 || "LOVE").toUpperCase().padEnd(4, ' ').slice(0, 5);
    const w2 = (word2 || "LIFE").toUpperCase().padEnd(4, ' ').slice(0, 5);
    const maxLen = Math.max(w1.length, w2.length);

    // 5x5 Matrix Letter Definitions
    const font5x5 = {
      'A': [[0,1,1,1,0],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1]],
      'B': [[1,1,1,1,0],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,1],[1,1,1,1,0]],
      'C': [[0,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[0,1,1,1,1]],
      'D': [[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0]],
      'E': [[1,1,1,1,1],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,0],[1,1,1,1,1]],
      'F': [[1,1,1,1,1],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0]],
      'G': [[0,1,1,1,1],[1,0,0,0,0],[1,0,1,1,1],[1,0,0,0,1],[0,1,1,1,1]],
      'H': [[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1]],
      'I': [[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[1,1,1,1,1]],
      'J': [[0,0,1,1,1],[0,0,0,1,0],[0,0,0,1,0],[1,0,0,1,0],[0,1,1,0,0]],
      'K': [[1,0,0,0,1],[1,0,0,1,0],[1,1,1,0,0],[1,0,0,1,0],[1,0,0,0,1]],
      'L': [[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
      'M': [[1,0,0,0,1],[1,1,0,1,1],[1,0,1,0,1],[1,0,0,0,1],[1,0,0,0,1]],
      'N': [[1,0,0,0,1],[1,1,0,0,1],[1,0,1,0,1],[1,0,0,1,1],[1,0,0,0,1]],
      'O': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
      'P': [[1,1,1,1,0],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0]],
      'Q': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,1,1],[0,1,1,1,1]],
      'R': [[1,1,1,1,0],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,1,0],[1,0,0,0,1]],
      'S': [[0,1,1,1,1],[1,0,0,0,0],[0,1,1,1,0],[0,0,0,0,1],[1,1,1,1,0]],
      'T': [[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
      'U': [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
      'V': [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0]],
      'W': [[1,0,0,0,1],[1,0,0,0,1],[1,0,1,0,1],[1,1,0,1,1],[1,0,0,0,1]],
      'X': [[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,1,0,1,0],[1,0,0,0,1]],
      'Y': [[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
      'Z': [[1,1,1,1,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[1,1,1,1,1]],
      '0': [[0,1,1,1,0],[1,0,0,1,1],[1,0,1,0,1],[1,1,0,0,1],[0,1,1,1,0]],
      '1': [[0,0,1,0,0],[0,1,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,1,1,1,0]],
      '2': [[0,1,1,1,0],[1,0,0,0,1],[0,0,1,1,0],[0,1,0,0,0],[1,1,1,1,1]],
      '3': [[1,1,1,1,0],[0,0,0,0,1],[0,1,1,1,0],[0,0,0,0,1],[1,1,1,1,0]],
      '4': [[1,0,0,1,0],[1,0,0,1,0],[1,1,1,1,1],[0,0,0,1,0],[0,0,0,1,0]],
      '5': [[1,1,1,1,1],[1,0,0,0,0],[1,1,1,1,0],[0,0,0,0,1],[1,1,1,1,0]],
      '6': [[0,1,1,1,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,1],[0,1,1,1,0]],
      '7': [[1,1,1,1,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[0,1,0,0,0]],
      '8': [[0,1,1,1,0],[1,0,0,0,1],[0,1,1,1,0],[1,0,0,0,1],[0,1,1,1,0]],
      '9': [[0,1,1,1,0],[1,0,0,0,1],[0,1,1,1,1],[0,0,0,0,1],[0,1,1,1,0]],
      ' ': [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]]
    };

    const cellSize = 3.5;
    const letterWidth = 5 * cellSize;
    const letterSpacing = 2.0;
    const totalW = maxLen * (letterWidth + letterSpacing);

    for (let charIdx = 0; charIdx < maxLen; charIdx++) {
      const c1 = w1[charIdx] || ' ';
      const c2 = w2[charIdx] || ' ';
      const grid1 = font5x5[c1] || font5x5['A'];
      const grid2 = font5x5[c2] || font5x5['A'];

      const charOffset = (charIdx - maxLen / 2 + 0.5) * (letterWidth + letterSpacing);

      // Perform 3D voxel intersection: Voxel(x, y, z) = Grid1(row, col) AND Grid2(row, col)
      for (let r = 0; r < 5; r++) { // Y-axis (height: top to bottom)
        const y = (4 - r) * cellSize;
        for (let colX = 0; colX < 5; colX++) { // X-axis
          for (let colZ = 0; colZ < 5; colZ++) { // Z-axis
            const v1 = grid1[r][colX];
            const v2 = grid2[r][colZ];

            if (v1 === 1 && v2 === 1) {
              const voxelGeo = new THREE.BoxGeometry(cellSize * 0.98, cellSize * 0.98, cellSize * 0.98);
              const voxelMesh = new THREE.Mesh(voxelGeo, textMat);
              voxelMesh.position.set(
                charOffset + (colX - 2) * cellSize,
                y + cellSize / 2,
                (colZ - 2) * cellSize
              );
              voxelMesh.castShadow = true;
              voxelMesh.receiveShadow = true;
              group.add(voxelMesh);
            }
          }
        }
      }
    }

    // Elegant Display Base
    const baseGeo = new THREE.BoxGeometry(totalW + 15, 3, letterWidth + 15);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.8, metalness: 0.2 });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.set(0, -1.5, 0);
    group.add(baseMesh);

    return group;
  }

  // =========================================================================
  // 3. 3D DIGITAL SUNDIAL GENERATOR (Solar Raycast Pinhole Matrix)
  // =========================================================================

  /**
   * Generates a 3D Printable Digital Sundial with interactive solar light raycast
   * @param {Object} options 
   */
  static createDigitalSundial(options = {}) {
    const latitude = options.latitude !== undefined ? options.latitude : 45.0; // Degrees
    const size = options.size || 50;
    const timeHours = options.timeHours !== undefined ? options.timeHours : 12.0; // e.g. 12.5 = 12:30

    const group = new THREE.Group();
    group.name = "Digital_Sundial_3D";

    const dialMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(options.color || 0x222630),
      roughness: 0.6,
      metalness: 0.2,
      side: THREE.DoubleSide
    });

    const latRad = (latitude * Math.PI) / 180;

    // 1. Semi-Cylindrical Gnomon (Sun-Aligned Tube)
    const gnomonLength = size * 1.5;
    const gnomonRadius = size * 0.45;
    const gnomonGeo = new THREE.CylinderGeometry(gnomonRadius, gnomonRadius, gnomonLength, 32, 1, true, 0, Math.PI);
    const gnomonMesh = new THREE.Mesh(gnomonGeo, dialMat);
    gnomonMesh.rotation.z = Math.PI / 2;
    gnomonMesh.rotation.y = Math.PI / 2;
    gnomonMesh.position.set(0, size * 0.8, 0);
    gnomonMesh.castShadow = true;
    gnomonMesh.receiveShadow = true;

    // Tilt according to latitude
    const gnomonPivot = new THREE.Group();
    gnomonPivot.rotation.x = -(Math.PI / 2 - latRad);
    gnomonPivot.add(gnomonMesh);

    // 2. Add Internal Light Slits / Perforations
    const slitMat = new THREE.MeshBasicMaterial({ color: 0xffe066 });
    for (let h = 9; h <= 15; h += 1) {
      const angleH = ((h - 12) * 15 * Math.PI) / 180;
      const slitGeo = new THREE.BoxGeometry(1.2, 0.6, size * 0.6);
      const slit = new THREE.Mesh(slitGeo, slitMat);
      slit.position.set(Math.sin(angleH) * (gnomonRadius - 1), gnomonRadius * 0.6, Math.cos(angleH) * (gnomonRadius - 1));
      slit.rotation.y = angleH;
      gnomonPivot.add(slit);
    }
    group.add(gnomonPivot);

    // 3. Base Plate with Projection Screen (where digits are cast)
    const baseW = size * 1.8;
    const baseL = size * 2.2;
    const basePlateGeo = new THREE.BoxGeometry(baseW, 4, baseL);
    const basePlateMat = new THREE.MeshStandardMaterial({
      color: 0xf8f9fa,
      roughness: 0.9,
      metalness: 0.05
    });
    const basePlate = new THREE.Mesh(basePlateGeo, basePlateMat);
    basePlate.position.set(0, -2, 0);
    basePlate.receiveShadow = true;
    group.add(basePlate);

    // 4. Projected Digital Time Display (7-Segment LED style projected onto base)
    const hourInt = Math.floor(timeHours);
    const minInt = Math.floor((timeHours - hourInt) * 60);
    const timeStr = `${hourInt < 10 ? '0' + hourInt : hourInt}:${minInt < 10 ? '0' + minInt : minInt}`;

    const projGroup = OpticsEngine.createProjectedDigitDisplay(timeStr, { size: size * 0.28 });
    projGroup.position.set(0, 0.2, size * 0.35);
    projGroup.rotation.x = -Math.PI / 2;
    group.add(projGroup);

    // 5. Compass Rose & Latitude Dial Engraving
    const compassGeo = new THREE.RingGeometry(size * 0.15, size * 0.18, 24);
    const compassMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide });
    const compass = new THREE.Mesh(compassGeo, compassMat);
    compass.rotation.x = -Math.PI / 2;
    compass.position.set(0, 0.1, -size * 0.75);
    group.add(compass);

    return { group, gnomonPivot, projGroup };
  }

  /**
   * Helper to create 7-Segment projected digital numbers on the sundial plate
   */
  static createProjectedDigitDisplay(text = "12:00", options = {}) {
    const digitGroup = new THREE.Group();
    digitGroup.name = "Projected_Digits";

    const s = options.size || 10;
    const segMat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.95
    });

    const digitMaps = {
      '0': [1,1,1,1,1,1,0],
      '1': [0,1,1,0,0,0,0],
      '2': [1,1,0,1,1,0,1],
      '3': [1,1,1,1,0,0,1],
      '4': [0,1,1,0,0,1,1],
      '5': [1,0,1,1,0,1,1],
      '6': [1,0,1,1,1,1,1],
      '7': [1,1,1,0,0,0,0],
      '8': [1,1,1,1,1,1,1],
      '9': [1,1,1,1,0,1,1]
    };

    const draw7Seg = (digitChar, offsetX) => {
      const g = new THREE.Group();
      g.position.x = offsetX;
      const mask = digitMaps[digitChar] || digitMaps['0'];

      const w = s * 0.55;
      const h = s * 0.95;
      const thick = s * 0.12;

      // Segments A, B, C, D, E, F, G
      const segs = [
        { p: [0, h / 2], sz: [w, thick] }, // A (top)
        { p: [w / 2, h / 4], sz: [thick, h / 2] }, // B (top-right)
        { p: [w / 2, -h / 4], sz: [thick, h / 2] }, // C (bottom-right)
        { p: [0, -h / 2], sz: [w, thick] }, // D (bottom)
        { p: [-w / 2, -h / 4], sz: [thick, h / 2] }, // E (bottom-left)
        { p: [-w / 2, h / 4], sz: [thick, h / 2] }, // F (top-left)
        { p: [0, 0], sz: [w, thick] } // G (middle)
      ];

      segs.forEach((seg, idx) => {
        if (mask[idx] === 1) {
          const m = new THREE.Mesh(new THREE.PlaneGeometry(seg.sz[0], seg.sz[1]), segMat);
          m.position.set(seg.p[0], seg.p[1], 0);
          g.add(m);
        }
      });
      return g;
    };

    let curX = -s * 1.3;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === ':') {
        // Colon dots
        const dotGeo = new THREE.CircleGeometry(s * 0.08, 8);
        const dot1 = new THREE.Mesh(dotGeo, segMat);
        dot1.position.set(curX + s * 0.2, s * 0.2, 0);
        const dot2 = new THREE.Mesh(dotGeo, segMat);
        dot2.position.set(curX + s * 0.2, -s * 0.2, 0);
        digitGroup.add(dot1, dot2);
        curX += s * 0.45;
      } else {
        digitGroup.add(draw7Seg(ch, curX));
        curX += s * 0.75;
      }
    }

    return digitGroup;
  }

  // =========================================================================
  // 4. VIRTUAL STUDIO MIRROR HELPER
  // =========================================================================

  /**
   * Adds or removes a virtual studio mirror behind the scene object
   * @param {THREE.Scene} scene 
   * @param {boolean} enable 
   * @param {Object} bounds 
   */
  static toggleVirtualMirror(scene, enable = true, bounds = { size: 100, zOffset: -60 }) {
    if (!scene) return null;

    const existingMirror = scene.getObjectByName("Studio_Virtual_Mirror");
    if (existingMirror) {
      scene.remove(existingMirror);
      if (existingMirror.geometry) existingMirror.geometry.dispose();
      if (existingMirror.material) existingMirror.material.dispose();
    }

    if (!enable) return null;

    const mirrorGroup = new THREE.Group();
    mirrorGroup.name = "Studio_Virtual_Mirror";

    // High-gloss mirror pane
    const mirrorGeo = new THREE.PlaneGeometry(bounds.size * 1.5, bounds.size * 1.2);
    const mirrorMat = new THREE.MeshStandardMaterial({
      color: 0x3a404d,
      metalness: 0.95,
      roughness: 0.05,
      side: THREE.DoubleSide
    });
    const mirrorMesh = new THREE.Mesh(mirrorGeo, mirrorMat);
    mirrorMesh.position.set(0, bounds.size * 0.4, bounds.zOffset || -50);
    mirrorGroup.add(mirrorMesh);

    // Mirror Beveled Frame
    const frameGeo = new THREE.BoxGeometry(bounds.size * 1.55, bounds.size * 1.25, 3);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x11141a, roughness: 0.7, metalness: 0.3 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(0, bounds.size * 0.4, (bounds.zOffset || -50) - 2);
    mirrorGroup.add(frame);

    scene.add(mirrorGroup);
    return mirrorGroup;
  }
}

window.OpticsEngine = OpticsEngine;
