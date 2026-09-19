/**
 * PolyMorph 3D Studio - Papercraft & Origami 3D Engine
 * Converts 3D meshes into 2D printable papercraft nets with glue tabs,
 * mountain/valley fold lines, live 3D fold/unfold animations,
 * Pure Origami (Zero Glue) step-by-step folding simulator, Crease Patterns (CP), and SVG/HTML exports.
 * 100% Client-side, zero backend dependencies.
 */

class PapercraftEngine {
  /**
   * Generates a procedurally crafted low-poly 3D preset mesh (Papercraft Mode)
   * @param {string} presetName 
   * @returns {THREE.BufferGeometry}
   */
  static getPresetGeometry(presetName = 'diamond_heart') {
    switch (presetName) {
      case 'diamond_heart':
        return this.createDiamondHeartGeometry();
      case 'origami_crane':
        return this.createOrigamiCraneGeometry();
      case 'lowpoly_wolf':
        return this.createLowPolyWolfGeometry();
      case 'origami_fox':
        return this.createOrigamiFoxGeometry();
      case 'polyhedral_mask':
        return this.createPolyhedralMaskGeometry();
      case 'lowpoly_cat':
        return this.createLowPolyCatGeometry();
      case 'stellated_star':
        return this.createStellatedStarGeometry();
      case 'origami_dragon':
        return this.createOrigamiDragonGeometry();
      case 'origami_spacecraft':
        return this.createOrigamiSpacecraftGeometry();
      default:
        return this.createDiamondHeartGeometry();
    }
  }

  // --------------------------------------------------------------------------
  // Low-Poly Procedural Geometry Generators (Papercraft Models)
  // --------------------------------------------------------------------------

  static createDiamondHeartGeometry() {
    const geom = new THREE.BufferGeometry();
    const vertices = [
      0, 24, 6,        -22, 44, 12,     22, 44, 12,      -48, 22, 8,
      48, 22, 8,       -38, -12, 6,     38, -12, 6,      0, -52, 0,
      -18, 16, 26,     18, 16, 26,      0, -16, 22,
      -18, 16, -18,    18, 16, -18,     0, -16, -16
    ];

    const indices = [
      0, 8, 1,   1, 8, 3,   0, 9, 2,   2, 9, 4,
      0, 9, 8,   8, 10, 0,  9, 0, 10,
      3, 8, 5,   5, 8, 10,  4, 6, 9,   9, 6, 10,
      5, 10, 7,  10, 6, 7,
      0, 1, 11,  1, 3, 11,  0, 12, 2,  2, 12, 4,
      0, 11, 12, 11, 13, 0, 12, 0, 13,
      3, 11, 5,  5, 11, 13, 4, 12, 6,  9, 12, 13,
      5, 13, 7,  13, 6, 7
    ];

    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }

  static createOrigamiCraneGeometry() {
    const geom = new THREE.BufferGeometry();
    const vertices = [
      0, 12, 30,    0, 6, -24,    0, 24, 0,     0, -8, 2,
      0, 48, 55,    0, 40, 70,    -55, 32, 10,  -26, 18, 22,
      -32, 14, -14, 55, 32, 10,   26, 18, 22,   32, 14, -14,
      0, 30, -60
    ];

    const indices = [
      0, 4, 2,   4, 5, 0,
      0, 7, 3,   7, 2, 0,   7, 8, 2,   8, 1, 2,   3, 8, 1,   3, 7, 8,
      0, 3, 10,  10, 0, 2,  10, 2, 11, 11, 2, 1,  3, 1, 11,  3, 11, 10,
      7, 6, 2,   2, 6, 8,   10, 2, 9,  2, 11, 9,
      1, 12, 2,  1, 2, 12
    ];

    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }

  static createLowPolyWolfGeometry() {
    const geom = new THREE.BufferGeometry();
    const vertices = [
      0, 10, 46,    -8, 14, 34,   8, 14, 34,    0, 20, 24,
      -15, 24, 22,  15, 24, 22,   -22, 46, 10,  22, 46, 10,
      0, 32, 12,    0, 0, 32,     -16, 8, 14,   16, 8, 14,
      0, -12, 0,    -24, 16, -16, 24, 16, -16,  0, 28, -14,
      0, -8, -24
    ];

    const indices = [
      0, 1, 3,   0, 3, 2,   0, 9, 1,   0, 2, 9,
      1, 4, 3,   3, 5, 2,   1, 10, 9,  2, 9, 11,
      4, 6, 8,   4, 8, 3,   5, 3, 8,   5, 8, 7,
      10, 12, 9, 11, 9, 12, 10, 13, 12,11, 12, 14,
      4, 13, 6,  5, 7, 14,  8, 6, 15,  8, 15, 7,
      13, 15, 12,14, 12, 15,12, 16, 13,12, 14, 16
    ];

    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }

  static createOrigamiFoxGeometry() {
    const geom = new THREE.BufferGeometry();
    const vertices = [
      0, 12, 38,   -10, 18, 24,  10, 18, 24,   0, 26, 16,
      -26, 50, 8,  26, 50, 8,    0, 34, 4,     0, 0, 20,
      -20, -16, -10,20, -16, -10,0, -22, -4,   0, 28, -34,
      0, -20, -28
    ];

    const indices = [
      0, 1, 3,   0, 3, 2,   0, 7, 1,   0, 2, 7,
      1, 4, 6,   1, 6, 3,   2, 3, 6,   2, 6, 5,
      1, 7, 8,   2, 9, 7,   7, 10, 8,  7, 9, 10,
      6, 4, 8,   6, 9, 5,   6, 8, 11,  6, 11, 9,
      8, 12, 11, 9, 11, 12, 8, 10, 12, 9, 12, 10
    ];

    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }

  static createPolyhedralMaskGeometry() {
    const geom = new THREE.BufferGeometry();
    const vertices = [
      0, 44, 14,   -28, 36, 8,   28, 36, 8,    0, 20, 32,
      -36, 10, 10, 36, 10, 10,   0, 0, 38,     -22, -12, 20,
      22, -12, 20, 0, -24, 26,   0, -44, 16,   -26, -32, 6,
      26, -32, 6
    ];

    const indices = [
      0, 1, 3,   0, 3, 2,   1, 4, 3,   2, 3, 5,
      3, 4, 6,   3, 6, 5,   4, 7, 6,   5, 6, 8,
      6, 7, 9,   6, 9, 8,   7, 11, 10, 8, 10, 12,
      7, 10, 9,  8, 9, 10,  4, 11, 7,  5, 8, 12
    ];

    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }

  static createLowPolyCatGeometry() {
    const geom = new THREE.BufferGeometry();
    const vertices = [
      0, 22, 26,   -10, 28, 16,  10, 28, 16,   0, 36, 12,
      -20, 56, 8,  20, 56, 8,    0, 44, 4,     0, 12, 20,
      -18, -8, -6, 18, -8, -6,   0, -22, 10,   -14, -30, -22,
      14, -30, -22,0, 14, -28
    ];

    const indices = [
      0, 1, 3,   0, 3, 2,   0, 7, 1,   0, 2, 7,
      1, 4, 3,   2, 3, 5,   4, 6, 3,   5, 3, 6,
      1, 8, 7,   2, 7, 9,   7, 8, 10,  7, 10, 9,
      3, 6, 8,   3, 9, 6,   6, 13, 8,  6, 9, 13,
      8, 11, 10, 9, 10, 12, 11, 13, 8, 12, 9, 13
    ];

    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }

  static createStellatedStarGeometry() {
    const geom = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];

    const phi = (1 + Math.sqrt(5)) / 2;
    const s = 16;
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
      const center = new THREE.Vector3().add(pA).add(pB).add(pC).divideScalar(3);
      const normal = center.clone().normalize();
      const peak = center.add(normal.multiplyScalar(28));

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

  static createOrigamiDragonGeometry() {
    const geom = new THREE.BufferGeometry();
    const vertices = [
      0, 24, 58,   -10, 34, 44,  10, 34, 44,   -22, 62, 34,
      22, 62, 34,  0, 16, 30,    0, 38, 12,    -65, 48, -12,
      65, 48, -12, -26, 20, 2,   26, 20, 2,    0, -6, -18,
      0, 10, -58
    ];

    const indices = [
      0, 1, 5,   0, 5, 2,   1, 3, 6,   2, 6, 4,
      1, 6, 5,   2, 5, 6,   5, 9, 11,  5, 11, 10,
      6, 7, 9,   6, 10, 8,  6, 9, 12,  6, 12, 10,
      7, 9, 12,  8, 12, 10, 9, 11, 12, 10, 12, 11
    ];

    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }

  static createOrigamiSpacecraftGeometry() {
    const geom = new THREE.BufferGeometry();
    const vertices = [
      0, 0, 64,    0, 14, 22,    -20, 0, 18,   20, 0, 18,
      0, -10, 18,  -70, -8, -32, 70, -8, -32,  -22, 10, -40,
      22, 10, -40, 0, 30, -34,   0, -12, -34
    ];

    const indices = [
      0, 1, 2,   0, 3, 1,   0, 2, 4,   0, 4, 3,
      1, 7, 2,   1, 3, 8,   1, 9, 7,   1, 8, 9,
      2, 5, 7,   3, 8, 6,   4, 7, 10,  4, 10, 8,
      2, 7, 4,   3, 4, 8,   7, 9, 10,  8, 10, 9,
      5, 10, 7,  6, 8, 10
    ];

    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }

  // --------------------------------------------------------------------------
  // Pure Origami Models (Zero Glue / Step-by-Step Folding)
  // --------------------------------------------------------------------------

  static ORIGAMI_MODELS = {
    orizuru_crane: {
      id: 'orizuru_crane',
      name: 'Orizuru (Japanese Peace Crane)',
      nameFr: 'Orizuru (Grue Japonaise de la Paix)',
      difficulty: 'Intermediate',
      steps: [
        {
          num: 1,
          titleEn: 'Diagonal Folds',
          titleFr: 'Plis Diagonaux',
          descEn: 'Fold the square sheet diagonally both ways, then unfold to mark the center.',
          descFr: 'Pliez la feuille carrée en diagonale dans les deux sens, puis dépliez.'
        },
        {
          num: 2,
          titleEn: 'Preliminary Square Base',
          titleFr: 'Base Carrée Préliminaire',
          descEn: 'Collapse along diagonal and horizontal creases into a compact diamond base.',
          descFr: 'Repliez le long des plis diagonaux et horizontaux en une base en losange.'
        },
        {
          num: 3,
          titleEn: 'Petal Folds (Front & Back)',
          titleFr: 'Plis Pétales (Recto & Verso)',
          descEn: 'Fold outer edges to the center crease and open upward into a long bird diamond.',
          descFr: 'Pliez les bords extérieurs vers le centre et ouvrez vers le haut en long losange.'
        },
        {
          num: 4,
          titleEn: 'Inside Reverse Folds (Neck & Tail)',
          titleFr: 'Plis Inversés Intérieurs (Cou & Queue)',
          descEn: 'Narrow the side legs and reverse-fold both bottom points upward between the layers.',
          descFr: 'Affinez les pointes et repliez-les vers le haut entre les couches de papier.'
        },
        {
          num: 5,
          titleEn: 'Head Beak Crimp & Wing Spread',
          titleFr: 'Pli du Bec & Déploiement des Ailes',
          descEn: 'Crimp the tip of the neck forward for the beak and gently spread the wings horizontally.',
          descFr: 'Pincez la pointe du cou vers l\'avant pour former le bec et écartez les ailes.'
        }
      ],
      creases: [
        { x1: -90, y1: -90, x2: 90, y2: 90, type: 'valley' },
        { x1: -90, y1: 90, x2: 90, y2: -90, type: 'valley' },
        { x1: -90, y1: 0, x2: 90, y2: 0, type: 'mountain' },
        { x1: 0, y1: -90, x2: 0, y2: 90, type: 'mountain' },
        { x1: -45, y1: -45, x2: 45, y2: 45, type: 'valley' },
        { x1: -45, y1: 45, x2: 45, y2: -45, type: 'valley' },
        { x1: 0, y1: 90, x2: -36, y2: 0, type: 'mountain' },
        { x1: 0, y1: 90, x2: 36, y2: 0, type: 'mountain' },
        { x1: 0, y1: -90, x2: -36, y2: 0, type: 'mountain' },
        { x1: 0, y1: -90, x2: 36, y2: 0, type: 'mountain' }
      ]
    },
    jumping_frog: {
      id: 'jumping_frog',
      name: 'Jumping Frog (Kinetic Action Model)',
      nameFr: 'Grenouille Sauté (Modèle Cinétique)',
      difficulty: 'Easy-Intermediate',
      steps: [
        {
          num: 1,
          titleEn: 'Waterbomb Base on Top Half',
          titleFr: 'Base Bombe à Eau sur la Moitié Supérieure',
          descEn: 'Fold top half diagonally into a triangle waterbomb base.',
          descFr: 'Pliez la moitié supérieure en diagonale en base triangulaire.'
        },
        {
          num: 2,
          titleEn: 'Front Feet Fold',
          titleFr: 'Pliage des Pattes Avant',
          descEn: 'Fold the triangular flaps outward to form the front feet.',
          descFr: 'Pliez les pointes du triangle vers l\'extérieur pour former les pattes avant.'
        },
        {
          num: 3,
          titleEn: 'Body Sides Fold',
          titleFr: 'Pliage des Côtés du Corps',
          descEn: 'Fold bottom sides toward the vertical center line.',
          descFr: 'Pliez les côtés inférieurs vers la ligne centrale verticale.'
        },
        {
          num: 4,
          titleEn: 'Spring Pleat for Jumping',
          titleFr: 'Pli Ressort pour Sauter',
          descEn: 'Fold the bottom half upward, then fold back down to create the jumping spring.',
          descFr: 'Pliez la moitié inférieure vers le haut, puis vers le bas pour créer le ressort.'
        }
      ],
      creases: [
        { x1: -90, y1: 90, x2: 0, y2: 0, type: 'valley' },
        { x1: 90, y1: 90, x2: 0, y2: 0, type: 'valley' },
        { x1: -90, y1: 0, x2: 90, y2: 0, type: 'mountain' },
        { x1: 0, y1: 90, x2: 0, y2: -90, type: 'mountain' },
        { x1: -90, y1: -45, x2: 90, y2: -45, type: 'mountain' },
        { x1: -90, y1: -75, x2: 90, y2: -75, type: 'valley' }
      ]
    },
    masu_box: {
      id: 'masu_box',
      name: 'Masu Box (Japanese Storage Box)',
      nameFr: 'Boîte Masu (Boîte de Rangement Japonaise)',
      difficulty: 'Easy',
      steps: [
        {
          num: 1,
          titleEn: 'Blintz Fold (4 Corners to Center)',
          titleFr: 'Pli Blintz (4 Coins au Centre)',
          descEn: 'Fold all four corners neatly to meet at the exact center point.',
          descFr: 'Pliez les quatre coins exactement au centre.'
        },
        {
          num: 2,
          titleEn: 'Cupboard Creases',
          titleFr: 'Plis en Armoire',
          descEn: 'Fold left and right edges to center, then unfold. Repeat for top and bottom edges.',
          descFr: 'Pliez les bords gauche et droit au centre, puis dépliez. Répétez pour haut et bas.'
        },
        {
          num: 3,
          titleEn: 'Open Flaps & Raise Side Walls',
          titleFr: 'Ouvrir les Pointes & Relever les Murs',
          descEn: 'Open two opposing triangles and raise the side walls vertically at 90°.',
          descFr: 'Ouvrez deux triangles opposés et relevez les parois latérales à 90°.'
        },
        {
          num: 4,
          titleEn: 'Fold Over & Lock End Walls',
          titleFr: 'Rabattre & Verrouiller les Extrémités',
          descEn: 'Fold the remaining flaps over the end walls into the floor of the box to lock.',
          descFr: 'Rabattez les rabats par-dessus les parois d\'extrémité dans le fond.'
        }
      ],
      creases: [
        { x1: -90, y1: -90, x2: 90, y2: 90, type: 'valley' },
        { x1: -90, y1: 90, x2: 90, y2: -90, type: 'valley' },
        { x1: -30, y1: -90, x2: -30, y2: 90, type: 'valley' },
        { x1: 30, y1: -90, x2: 30, y2: 90, type: 'valley' },
        { x1: -90, y1: -30, x2: 90, y2: -30, type: 'valley' },
        { x1: -90, y1: 30, x2: 90, y2: 30, type: 'valley' }
      ]
    },
    lotus_blossom: {
      id: 'lotus_blossom',
      name: 'Lotus Blossom (Traditional Flower)',
      nameFr: 'Fleur de Lotus (Fleur Traditionnelle)',
      difficulty: 'Intermediate',
      steps: [
        {
          num: 1,
          titleEn: 'Double Blintz Fold',
          titleFr: 'Double Pli Blintz',
          descEn: 'Fold all 4 corners to center, then fold the 4 new corners to center again.',
          descFr: 'Pliez les 4 coins au centre, puis repliez les 4 nouveaux coins au centre.'
        },
        {
          num: 2,
          titleEn: 'Turn Over & Third Blintz',
          titleFr: 'Retourner & Troisième Pli Blintz',
          descEn: 'Turn paper over and fold all 4 corners to center once more.',
          descFr: 'Retournez la feuille et pliez à nouveau les 4 coins au centre.'
        },
        {
          num: 3,
          titleEn: 'Uncurl Outer Petals',
          titleFr: 'Déployer les Pétales Extérieurs',
          descEn: 'Reach from behind underneath and gently invert the corners upward into 3D petals.',
          descFr: 'Passez par dessous et retournez délicatement les coins vers le haut en pétales 3D.'
        },
        {
          num: 4,
          titleEn: 'Uncurl Inner Petals',
          titleFr: 'Déployer les Pétales Intérieurs',
          descEn: 'Invert the second layer of points from underneath to complete the blooming flower.',
          descFr: 'Déployez la seconde rangée de pointes pour achever la floraison.'
        }
      ],
      creases: [
        { x1: -90, y1: 0, x2: 90, y2: 0, type: 'mountain' },
        { x1: 0, y1: -90, x2: 0, y2: 90, type: 'mountain' },
        { x1: -45, y1: 45, x2: 45, y2: 45, type: 'valley' },
        { x1: 45, y1: 45, x2: 45, y2: -45, type: 'valley' },
        { x1: 45, y1: -45, x2: -45, y2: -45, type: 'valley' },
        { x1: -45, y1: -45, x2: -45, y2: 45, type: 'valley' }
      ]
    },
    sonobe_unit: {
      id: 'sonobe_unit',
      name: 'Sonobe Modular Unit (Interlocking Polyhedron)',
      nameFr: 'Module Sonobe (Polyèdre Modulaire Emboîtable)',
      difficulty: 'Modular (6–30 Units)',
      steps: [
        {
          num: 1,
          titleEn: 'Horizontal Cupboard Folds',
          titleFr: 'Plis en Armoire Horizontaux',
          descEn: 'Fold top and bottom quarters to center horizontal crease.',
          descFr: 'Pliez les quarts haut et bas vers le pli central horizontal.'
        },
        {
          num: 2,
          titleEn: 'Opposing Corner Creases',
          titleFr: 'Plis des Coins Opposés',
          descEn: 'Fold top-left and bottom-right corners down at 45° angle.',
          descFr: 'Pliez les coins haut-gauche et bas-droit à 45°.'
        },
        {
          num: 3,
          titleEn: 'Tuck into Pockets (Parallelogram)',
          titleFr: 'Insérer dans les Poches (Parallélogramme)',
          descEn: 'Tuck triangular flaps under the center strips to create a flat parallelogram.',
          descFr: 'Insérez les rabats sous les bandes centrales pour former un parallélogramme.'
        },
        {
          num: 4,
          titleEn: 'Crease for Modular Assembly',
          titleFr: 'Plis pour Assemblage Modulaire',
          descEn: 'Turn over and fold the two triangle tabs back into a square module ready to connect.',
          descFr: 'Retournez et pliez les deux pointes triangulaires pour former le module final.'
        }
      ],
      creases: [
        { x1: -90, y1: 0, x2: 90, y2: 0, type: 'valley' },
        { x1: -90, y1: 45, x2: 90, y2: 45, type: 'valley' },
        { x1: -90, y1: -45, x2: 90, y2: -45, type: 'valley' },
        { x1: -90, y1: 90, x2: -45, y2: 45, type: 'valley' },
        { x1: 90, y1: -90, x2: 45, y2: -45, type: 'valley' }
      ]
    },
    miura_ori: {
      id: 'miura_ori',
      name: 'NASA Space Fold (Miura-Ori Tessellation)',
      nameFr: 'Pliage Spatial NASA (Miura-Ori)',
      difficulty: 'Kinetic Tessellation',
      steps: [
        {
          num: 1,
          titleEn: 'Oblique Parallelogram Grid',
          titleFr: 'Grille de Parallélogrammes Obliques',
          descEn: 'Crease alternating zigzag vertical columns at a 6° oblique angle.',
          descFr: 'Marquez des colonnes verticales en zigzag avec un angle oblique de 6°.'
        },
        {
          num: 2,
          titleEn: 'Horizontal Mountain & Valley Alternation',
          titleFr: 'Alternance Horizontale Montagne & Vallée',
          descEn: 'Invert horizontal creases so that every vertex has 3 mountains and 1 valley.',
          descFr: 'Inversez les plis horizontaux pour que chaque sommet ait 3 montagnes et 1 vallée.'
        },
        {
          num: 3,
          titleEn: 'Kinetic Expansion & Collapse',
          titleFr: 'Déploiement & Compression Cinétique',
          descEn: 'Pull opposing diagonal corners to collapse or expand the entire sheet smoothly.',
          descFr: 'Tirez sur les coins opposés pour compacter ou déployer la feuille fluide.'
        }
      ],
      creases: [
        { x1: -90, y1: -60, x2: 90, y2: -60, type: 'mountain' },
        { x1: -90, y1: 0, x2: 90, y2: 0, type: 'valley' },
        { x1: -90, y1: 60, x2: 90, y2: 60, type: 'mountain' }
      ]
    }
  };

  /**
   * Generates 3D mesh at a specific folding step for Pure Origami mode
   * @param {string} modelId 
   * @param {number} stepIndex (0-based)
   * @returns {THREE.BufferGeometry}
   */
  static getOrigamiStepMesh(modelId = 'orizuru_crane', stepIndex = 0) {
    const s = Math.max(0, stepIndex);
    const geom = new THREE.BufferGeometry();

    if (modelId === 'orizuru_crane') {
      if (s === 0) {
        // Step 1: Flat Square Sheet with diagonal fold
        const verts = [-45, 0, -45,  45, 0, -45,  45, 0, 45,  -45, 0, 45,  0, 0, 0];
        const idx = [0, 1, 4,  1, 2, 4,  2, 3, 4,  3, 0, 4];
        geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geom.setIndex(idx);
      } else if (s === 1) {
        // Step 2: Preliminary Base (Diamond 3D collapse)
        const verts = [0, 24, 0,  -24, 0, 0,  24, 0, 0,  0, 0, -24,  0, 0, 24,  0, -24, 0];
        const idx = [0, 1, 3,  0, 3, 2,  0, 2, 4,  0, 4, 1,  5, 3, 1,  5, 2, 3,  5, 4, 2,  5, 1, 4];
        geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geom.setIndex(idx);
      } else if (s === 2) {
        // Step 3: Petal Fold (Elongated diamond)
        const verts = [0, 42, 0,  -16, 0, 0,  16, 0, 0,  0, 0, -16,  0, 0, 16,  0, -42, 0];
        const idx = [0, 1, 3,  0, 3, 2,  0, 2, 4,  0, 4, 1,  5, 3, 1,  5, 2, 3,  5, 4, 2,  5, 1, 4];
        geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geom.setIndex(idx);
      } else if (s === 3) {
        // Step 4: Neck & Tail Reverse Fold
        const verts = [0, 14, 0,  -35, 26, 4,  35, 26, 4,  0, 38, 30,  0, 26, -35,  0, -10, 0];
        const idx = [0, 1, 3,  0, 3, 2,  0, 2, 4,  0, 4, 1,  5, 3, 1,  5, 2, 3,  5, 4, 2,  5, 1, 4];
        geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geom.setIndex(idx);
      } else {
        // Step 5: Completed Crane
        return this.createOrigamiCraneGeometry();
      }
    } else if (modelId === 'jumping_frog') {
      if (s === 0) {
        // Step 1: Waterbomb top
        const verts = [0, 0, 40,  -30, 0, 10,  30, 0, 10,  -30, 0, -40,  30, 0, -40];
        const idx = [0, 1, 2,  1, 3, 2,  2, 3, 4];
        geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geom.setIndex(idx);
      } else if (s === 1) {
        // Step 2: Front feet
        const verts = [0, 4, 42,  -40, 2, 20,  40, 2, 20,  -20, 0, -35,  20, 0, -35];
        const idx = [0, 1, 2,  1, 3, 2,  2, 3, 4];
        geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geom.setIndex(idx);
      } else {
        // Step 3-4: 3D Frog with spring legs
        const verts = [
          0, 14, 32,   -18, 12, 14,  18, 12, 14,
          -26, 2, -10, 26, 2, -10,   0, 8, 4,
          -24, -12, -32, 24, -12, -32, 0, -4, -18
        ];
        const idx = [
          0, 1, 5,  0, 5, 2,  1, 3, 5,  2, 5, 4,
          3, 6, 8,  4, 8, 7,  3, 8, 5,  4, 5, 8
        ];
        geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geom.setIndex(idx);
      }
    } else if (modelId === 'masu_box') {
      if (s === 0) {
        const verts = [-45, 0, -45,  45, 0, -45,  45, 0, 45,  -45, 0, 45];
        const idx = [0, 1, 2,  0, 2, 3];
        geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geom.setIndex(idx);
      } else if (s === 1) {
        const verts = [-25, 0, -25,  25, 0, -25,  25, 0, 25,  -25, 0, 25,  0, 0, 0];
        const idx = [0, 1, 4,  1, 2, 4,  2, 3, 4,  3, 0, 4];
        geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geom.setIndex(idx);
      } else {
        const verts = [
          -25, -15, -25,  25, -15, -25,  25, -15, 25,  -25, -15, 25,
          -25, 15, -25,   25, 15, -25,   25, 15, 25,   -25, 15, 25
        ];
        const idx = [
          0, 1, 2,  0, 2, 3,
          0, 4, 5,  0, 5, 1,
          1, 5, 6,  1, 6, 2,
          2, 6, 7,  2, 7, 3,
          3, 7, 4,  3, 4, 0
        ];
        geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geom.setIndex(idx);
      }
    } else if (modelId === 'lotus_blossom') {
      const verts = [
        0, s * 6 + 4, 0,
        -32, 0, 0,   32, 0, 0,   0, 0, -32,   0, 0, 32,
        -22, s * 4, -22,  22, s * 4, -22,  22, s * 4, 22,  -22, s * 4, 22
      ];
      const idx = [
        0, 1, 5,  0, 5, 3,  0, 3, 6,  0, 6, 2,
        0, 2, 7,  0, 7, 4,  0, 4, 8,  0, 8, 1
      ];
      geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      geom.setIndex(idx);
    } else if (modelId === 'sonobe_unit') {
      // Parallelogram modular unit
      const verts = [
        -30, 0, -15,  15, 0, -15,  30, 0, 15,  -15, 0, 15,
        -15, s * 8, 0,  15, -s * 8, 0
      ];
      const idx = [0, 1, 4,  1, 2, 5,  2, 3, 5,  3, 0, 4,  4, 5, 1,  4, 3, 5];
      geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      geom.setIndex(idx);
    } else if (modelId === 'miura_ori') {
      // Corrugated accordion tessellation
      const foldAngle = (s + 1) * 0.4;
      const h = Math.sin(foldAngle) * 12;
      const w = 40 / (s + 1);
      const verts = [
        -w*2, h, -30,  -w, -h, -30,  0, h, -30,  w, -h, -30,  w*2, h, -30,
        -w*2, -h, 0,   -w, h, 0,    0, -h, 0,   w, h, 0,    w*2, -h, 0,
        -w*2, h, 30,   -w, -h, 30,   0, h, 30,   w, -h, 30,  w*2, h, 30
      ];
      const idx = [
        0, 1, 6,  0, 6, 5,   1, 2, 7,  1, 7, 6,   2, 3, 8,  2, 8, 7,   3, 4, 9,  3, 9, 8,
        5, 6, 11, 5, 11, 10, 6, 7, 12, 6, 12, 11, 7, 8, 13, 7, 13, 12, 8, 9, 14, 8, 14, 13
      ];
      geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      geom.setIndex(idx);
    } else {
      return this.createOrigamiCraneGeometry();
    }

    geom.computeVertexNormals();
    return geom;
  }

  /**
   * Generates a 1:1 printable square Crease Pattern (CP) SVG
   * @param {string} modelId
   * @param {Object} options
   * @returns {string} SVG string
   */
  static generateCreasePatternSVG(modelId = 'orizuru_crane', options = {}) {
    const model = this.ORIGAMI_MODELS[modelId] || this.ORIGAMI_MODELS.orizuru_crane;
    const pageW = 210, pageH = 297; // A4
    const squareSize = 160; // 160x160mm square Kami sheet
    const offX = (pageW - squareSize) / 2;
    const offY = 40;

    let creaseLinesSVG = '';
    model.creases.forEach(c => {
      const x1 = (offX + squareSize/2 + (c.x1 / 180) * squareSize).toFixed(2);
      const y1 = (offY + squareSize/2 - (c.y1 / 180) * squareSize).toFixed(2);
      const x2 = (offX + squareSize/2 + (c.x2 / 180) * squareSize).toFixed(2);
      const y2 = (offY + squareSize/2 - (c.y2 / 180) * squareSize).toFixed(2);

      if (c.type === 'mountain') {
        creaseLinesSVG += `    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#dc2626" stroke-width="0.55" stroke-dasharray="3.5,2" />\n`;
      } else if (c.type === 'valley') {
        creaseLinesSVG += `    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#2563eb" stroke-width="0.55" stroke-dasharray="4,1.5,1,1.5" />\n`;
      }
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${pageW} ${pageH}" width="${pageW}mm" height="${pageH}mm">
  <rect width="100%" height="100%" fill="#ffffff" />

  <!-- Header -->
  <text x="${pageW/2}" y="20" font-family="'Segoe UI', sans-serif" font-weight="bold" font-size="6" fill="#0f172a" text-anchor="middle">${model.name} — Crease Pattern (CP)</text>
  <text x="${pageW/2}" y="27" font-family="'Segoe UI', sans-serif" font-size="3.5" fill="#64748b" text-anchor="middle">Pure Origami (Zero Glue) — 1:1 Scale Kami Square Sheet (${squareSize} × ${squareSize} mm)</text>

  <!-- Legend -->
  <g transform="translate(${offX}, 34)">
    <line x1="0" y1="0" x2="8" y2="0" stroke="#000000" stroke-width="0.7" />
    <text x="10" y="1" font-family="'Segoe UI', sans-serif" font-size="2.6" fill="#1e293b">Cut square perimeter (—)</text>
    <line x1="56" y1="0" x2="64" y2="0" stroke="#dc2626" stroke-width="0.6" stroke-dasharray="3,1.5" />
    <text x="66" y="1" font-family="'Segoe UI', sans-serif" font-size="2.6" font-weight="bold" fill="#dc2626">Mountain fold (---)</text>
    <line x1="110" y1="0" x2="118" y2="0" stroke="#2563eb" stroke-width="0.6" stroke-dasharray="4,1.5,1,1.5" />
    <text x="120" y="1" font-family="'Segoe UI', sans-serif" font-size="2.6" font-weight="bold" fill="#2563eb">Valley fold (-.-)</text>
  </g>

  <!-- Square Kami Outer Border -->
  <rect x="${offX}" y="${offY}" width="${squareSize}" height="${squareSize}" fill="#fafbfc" stroke="#0f172a" stroke-width="0.75" />

  <!-- Crease Pattern Lines -->
  <g id="creases">
${creaseLinesSVG}
  </g>

  <!-- Center Marker -->
  <circle cx="${offX + squareSize/2}" cy="${offY + squareSize/2}" r="1.2" fill="#6366f1" />

  <!-- Instructions Footer -->
  <text x="${pageW/2}" y="${offY + squareSize + 16}" font-family="'Segoe UI', sans-serif" font-weight="600" font-size="3" fill="#334155" text-anchor="middle">HOW TO FOLD:</text>
  <text x="${pageW/2}" y="${offY + squareSize + 22}" font-family="'Segoe UI', sans-serif" font-size="2.5" fill="#64748b" text-anchor="middle">1. Cut along the black solid square outline. No glue needed.</text>
  <text x="${pageW/2}" y="${offY + squareSize + 27}" font-family="'Segoe UI', sans-serif" font-size="2.5" fill="#64748b" text-anchor="middle">2. Fold Red lines as Mountains (peaks toward you) and Blue lines as Valleys (creases away from you).</text>
</svg>`;
  }

  /**
   * Generates a multi-step illustrated origami diagram (Yoshizawa-Randlett standard)
   * @param {string} modelId 
   * @returns {string} SVG string
   */
  static generateStepDiagramSVG(modelId = 'orizuru_crane') {
    const model = this.ORIGAMI_MODELS[modelId] || this.ORIGAMI_MODELS.orizuru_crane;
    const pageW = 210, pageH = 297;
    const pad = 14;

    let stepCardsSVG = '';
    const stepCount = model.steps.length;
    const cols = 2;
    const rows = Math.ceil(stepCount / cols);
    const cardW = (pageW - pad * 2 - 10) / cols;
    const cardH = (pageH - pad * 2 - 40) / rows;

    model.steps.forEach((st, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cx = pad + col * (cardW + 10);
      const cy = pad + 26 + row * (cardH + 8);

      stepCardsSVG += `
    <!-- Step ${st.num} Card -->
    <g transform="translate(${cx}, ${cy})">
      <rect width="${cardW}" height="${cardH}" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="0.5" />
      <rect x="0" y="0" width="${cardW}" height="7" rx="4" fill="#4f46e5" />
      <text x="5" y="4.8" font-family="'Segoe UI', sans-serif" font-weight="bold" font-size="3.2" fill="#ffffff">STEP ${st.num}: ${st.titleEn}</text>
      
      <!-- Step Miniature Diagram -->
      <g transform="translate(${cardW/2}, ${cardH/2 - 2})">
        <rect x="-20" y="-20" width="40" height="40" fill="#ffffff" stroke="#334155" stroke-width="0.5" transform="rotate(${idx * 15})" />
        <line x1="-20" y1="0" x2="20" y2="0" stroke="#dc2626" stroke-width="0.5" stroke-dasharray="2,1" />
        <!-- Fold Arrow -->
        <path d="M 0,-14 Q 8,-6 14,-2" fill="none" stroke="#4f46e5" stroke-width="0.6" marker-end="url(#arrow)" />
      </g>

      <!-- Step Description -->
      <text x="5" y="${cardH - 6}" font-family="'Segoe UI', sans-serif" font-size="2.2" fill="#475569" width="${cardW - 10}">${st.descEn}</text>
    </g>\n`;
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${pageW} ${pageH}" width="${pageW}mm" height="${pageH}mm">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#4f46e5" />
    </marker>
  </defs>
  <rect width="100%" height="100%" fill="#ffffff" />

  <!-- Header -->
  <text x="${pad}" y="${pad + 4}" font-family="'Segoe UI', sans-serif" font-weight="bold" font-size="5.5" fill="#0f172a">${model.name} — Folding Guide</text>
  <text x="${pageW - pad}" y="${pad + 4}" font-family="'Segoe UI', sans-serif" font-size="3.2" fill="#64748b" text-anchor="end">Yoshizawa–Randlett Diagram Standard</text>
  <line x1="${pad}" y1="${pad + 9}" x2="${pageW - pad}" y2="${pad + 9}" stroke="#cbd5e1" stroke-width="0.3" />

  <!-- Steps Content -->
  ${stepCardsSVG}

  <!-- Footer -->
  <line x1="${pad}" y1="${pageH - 8}" x2="${pageW - pad}" y2="${pageH - 8}" stroke="#e2e8f0" stroke-width="0.3" />
  <text x="${pad}" y="${pageH - 4}" font-family="'Segoe UI', sans-serif" font-size="2.4" fill="#94a3b8">PolyMorph 3D Studio — Pure Origami Studio</text>
</svg>`;
  }

  /**
   * Generates a self-contained offline HTML Step-by-Step 3D Origami Folding Player
   * @param {string} modelId
   * @param {string} baseName
   * @returns {Promise<Blob>}
   */
  static async generateStandaloneOrigamiHTML(modelId = 'orizuru_crane', baseName = 'Origami_Model') {
    const model = this.ORIGAMI_MODELS[modelId] || this.ORIGAMI_MODELS.orizuru_crane;
    const modelJson = JSON.stringify(model);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${model.name} — Interactive 3D Origami Folding Player</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{--bg:#0b0f19;--surface:#161c2e;--border:rgba(99,102,241,0.2);--accent:#6366f1;--text:#e2e8f0;--muted:#64748b}
    body{background:var(--bg);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif;height:100vh;display:flex;flex-direction:column;overflow:hidden}
    header{background:var(--surface);border-bottom:1px solid var(--border);padding:10px 18px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
    .brand{display:flex;align-items:center;gap:10px}
    .brand-logo{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-weight:800;font-size:0.8rem;padding:4px 8px;border-radius:6px}
    .brand-name{font-weight:700;font-size:0.95rem}
    .brand-sub{font-size:0.68rem;color:var(--muted)}
    main{flex:1;position:relative;overflow:hidden}
    #cv{display:block;width:100%;height:100%}
    .player-card{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);background:rgba(15,23,42,0.92);border:1px solid var(--border);border-radius:12px;padding:12px 20px;backdrop-filter:blur(8px);display:flex;flex-direction:column;gap:8px;min-width:340px;max-width:90vw;box-shadow:0 8px 32px rgba(0,0,0,0.5)}
    .player-nav{display:flex;align-items:center;justify-content:space-between;gap:10px}
    .step-badge{background:rgba(99,102,241,0.2);color:#818cf8;border:1px solid #6366f1;padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:700}
    .btn{display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:7px;border:1px solid var(--border);cursor:pointer;font-size:0.75rem;font-weight:600;background:rgba(255,255,255,0.06);color:var(--text);transition:all 0.15s}
    .btn:hover{background:rgba(255,255,255,0.12)}
    .btn-primary{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none}
    .step-desc{font-size:0.72rem;color:var(--muted);line-height:1.4}
    footer{background:var(--surface);border-top:1px solid var(--border);padding:8px 18px;font-size:0.68rem;color:var(--muted);display:flex;justify-content:space-between}
  </style>
</head>
<body>
<header>
  <div class="brand">
    <div class="brand-logo">📜</div>
    <div>
      <div class="brand-name">${model.name}</div>
      <div class="brand-sub">Pure Origami (Zero Glue) — Step-by-Step 3D Simulator</div>
    </div>
  </div>
  <div style="display:flex;gap:6px">
    <button class="btn" id="bRot">🔄 Auto-Rotate</button>
    <button class="btn" id="bSnap">📷 Snapshot</button>
  </div>
</header>
<main>
  <canvas id="cv"></canvas>
  <div class="player-card">
    <div class="player-nav">
      <button class="btn" id="bPrev">◀ Prev Step</button>
      <span class="step-badge" id="sBadge">Step 1 of ${model.steps.length}</span>
      <button class="btn btn-primary" id="bNext">Next Step ▶</button>
    </div>
    <div style="font-size:0.8rem; font-weight:700; color:#a5b4fc" id="sTitle">Step 1: ${model.steps[0].titleEn}</div>
    <div class="step-desc" id="sDesc">${model.steps[0].descEn}</div>
  </div>
</main>
<footer>
  <span>PolyMorph 3D Studio — Pure Origami Player</span>
  <span>Difficulty: ${model.difficulty}</span>
</footer>

<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
<script>
(function(){
  var MODEL_DATA = ${modelJson};
  var currentStep = 0;
  var canvas = document.getElementById('cv');
  var main = canvas.parentElement;

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.outputEncoding = THREE.sRGBEncoding;

  var W = main.clientWidth || 800, H = main.clientHeight || 600;
  renderer.setSize(W, H);

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0f19);

  var camera = new THREE.PerspectiveCamera(45, W/H, 0.1, 5000);
  camera.position.set(0, 35, 95);

  var controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  var amb = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(amb);
  var dl = new THREE.DirectionalLight(0xffffff, 1.2);
  dl.position.set(50, 80, 60);
  scene.add(dl);

  var activeMesh = null;
  var paperMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.85, side: THREE.DoubleSide });

  function loadStep(idx) {
    if (activeMesh) scene.remove(activeMesh);
    currentStep = Math.max(0, Math.min(MODEL_DATA.steps.length - 1, idx));

    var geo = new THREE.BufferGeometry();
    if (currentStep === 0) {
      geo.setAttribute('position', new THREE.Float32BufferAttribute([-35,0,-35, 35,0,-35, 35,0,35, -35,0,35, 0,0,0], 3));
      geo.setIndex([0,1,4, 1,2,4, 2,3,4, 3,0,4]);
    } else {
      var h = 10 + currentStep * 8;
      geo.setAttribute('position', new THREE.Float32BufferAttribute([0,h,0, -25,0,0, 25,0,0, 0,0,-25, 0,0,25, 0,-h,0], 3));
      geo.setIndex([0,1,3, 0,3,2, 0,2,4, 0,4,1, 5,3,1, 5,2,3, 5,4,2, 5,1,4]);
    }
    geo.computeVertexNormals();

    activeMesh = new THREE.Mesh(geo, paperMat);
    var wire = new THREE.LineSegments(new THREE.WireframeGeometry(geo), new THREE.LineBasicMaterial({ color: 0x6366f1, opacity: 0.7, transparent: true }));
    activeMesh.add(wire);
    scene.add(activeMesh);

    document.getElementById('sBadge').textContent = 'Step ' + (currentStep + 1) + ' of ' + MODEL_DATA.steps.length;
    document.getElementById('sTitle').textContent = 'Step ' + (currentStep + 1) + ': ' + MODEL_DATA.steps[currentStep].titleEn;
    document.getElementById('sDesc').textContent = MODEL_DATA.steps[currentStep].descEn;
  }
  loadStep(0);

  document.getElementById('bPrev').addEventListener('click', function(){ if (currentStep > 0) loadStep(currentStep - 1); });
  document.getElementById('bNext').addEventListener('click', function(){ if (currentStep < MODEL_DATA.steps.length - 1) loadStep(currentStep + 1); });
  document.getElementById('bRot').addEventListener('click', function(){ controls.autoRotate = !controls.autoRotate; });
  document.getElementById('bSnap').addEventListener('click', function(){
    renderer.render(scene, camera);
    var a = document.createElement('a');
    a.download = '${baseName}_snapshot.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  });

  new ResizeObserver(function(){
    var w = main.clientWidth || 800, h = main.clientHeight || 600;
    camera.aspect = w/h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }).observe(main);

  function animate(){ requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); }
  animate();
})();
</script>
</body>
</html>`;

    return new Blob([html], { type: 'text/html;charset=utf-8' });
  }

  // --------------------------------------------------------------------------
  // Dual-Graph Planar Unfolding & Layout Algorithm (Papercraft Mode)
  // --------------------------------------------------------------------------

  static get3rdPoint2D(pA, pB, lenAC, lenBC, refOppositePoint) {
    const dx = pB.x - pA.x;
    const dy = pB.y - pA.y;
    const c = Math.sqrt(dx * dx + dy * dy);
    if (c < 0.0001) return null;
    const ux = dx / c;
    const uy = dy / c;
    const nx = -uy;
    const ny = ux;

    const x = (c * c + lenAC * lenAC - lenBC * lenBC) / (2 * c);
    const ySq = lenAC * lenAC - x * x;
    const y = Math.sqrt(Math.max(0, ySq));

    const cand1 = new THREE.Vector2(pA.x + x * ux + y * nx, pA.y + x * uy + y * ny);
    const cand2 = new THREE.Vector2(pA.x + x * ux - y * nx, pA.y + x * uy - y * ny);

    if (!refOppositePoint) return cand1;

    const cross1 = (pB.x - pA.x) * (cand1.y - pA.y) - (pB.y - pA.y) * (cand1.x - pA.x);
    const crossRef = (pB.x - pA.x) * (refOppositePoint.y - pA.y) - (pB.y - pA.y) * (refOppositePoint.x - pA.x);

    return (cross1 * crossRef < 0) ? cand1 : cand2;
  }

  static trianglesOverlap2D(t1, t2) {
    const pointInTri = (p, a, b, c) => {
      const v0x = c.x - a.x, v0y = c.y - a.y;
      const v1x = b.x - a.x, v1y = b.y - a.y;
      const v2x = p.x - a.x, v2y = p.y - a.y;
      const dot00 = v0x * v0x + v0y * v0y;
      const dot01 = v0x * v1x + v0y * v1y;
      const dot02 = v0x * v2x + v0y * v2y;
      const dot11 = v1x * v1x + v1y * v1y;
      const dot12 = v1x * v2x + v1y * v2y;
      const denom = dot00 * dot11 - dot01 * dot01;
      if (Math.abs(denom) < 1e-6) return false;
      const invDenom = 1 / denom;
      const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
      const v = (dot00 * dot12 - dot01 * dot02) * invDenom;
      return (u > 0.05) && (v > 0.05) && (u + v < 0.95);
    };

    const c1 = { x: (t1.a.x + t1.b.x + t1.c.x)/3, y: (t1.a.y + t1.b.y + t1.c.y)/3 };
    const c2 = { x: (t2.a.x + t2.b.x + t2.c.x)/3, y: (t2.a.y + t2.b.y + t2.c.y)/3 };
    return pointInTri(c1, t2.a, t2.b, t2.c) || pointInTri(c2, t1.a, t1.b, t1.c);
  }

  static unfoldGeometry(geometry, options = {}) {
    const opt = Object.assign({
      tabWidth: 7.0,
      pageSize: 'A4',
      maxFacesPerIsland: 6
    }, options);

    const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    const pos = nonIndexed.attributes.position;
    const faceCount = pos.count / 3;

    const faces = [];
    for (let i = 0; i < faceCount; i++) {
      const i0 = i * 3, i1 = i * 3 + 1, i2 = i * 3 + 2;
      const a = new THREE.Vector3(pos.getX(i0), pos.getY(i0), pos.getZ(i0));
      const b = new THREE.Vector3(pos.getX(i1), pos.getY(i1), pos.getZ(i1));
      const c = new THREE.Vector3(pos.getX(i2), pos.getY(i2), pos.getZ(i2));
      const normal = new THREE.Vector3().crossVectors(
        new THREE.Vector3().subVectors(b, a),
        new THREE.Vector3().subVectors(c, a)
      ).normalize();

      faces.push({
        id: i,
        a, b, c,
        normal,
        lenAB: a.distanceTo(b),
        lenBC: b.distanceTo(c),
        lenCA: c.distanceTo(a),
        p2A: null,
        p2B: null,
        p2C: null,
        islandId: -1,
        visited: false
      });
    }

    const edgeMap = new Map();
    const key = (v1, v2) => {
      const q = (v) => `${v.x.toFixed(1)}_${v.y.toFixed(1)}_${v.z.toFixed(1)}`;
      return [q(v1), q(v2)].sort().join('__');
    };

    faces.forEach(f => {
      const edges = [
        { k: key(f.a, f.b), v1: f.a, v2: f.b, v3: f.c },
        { k: key(f.b, f.c), v1: f.b, v2: f.c, v3: f.a },
        { k: key(f.c, f.a), v1: f.c, v2: f.a, v3: f.b }
      ];
      edges.forEach(ed => {
        if (!edgeMap.has(ed.k)) edgeMap.set(ed.k, []);
        edgeMap.get(ed.k).push({ faceId: f.id, v1: ed.v1, v2: ed.v2, v3: ed.v3 });
      });
    });

    const islands = [];
    let currentIslandId = 0;
    let globalEdgeNumber = 1;
    const edgePairNumbers = new Map();

    for (let startFaceIdx = 0; startFaceIdx < faces.length; startFaceIdx++) {
      if (faces[startFaceIdx].visited) continue;

      const island = { id: currentIslandId, faces: [], foldLines: [], glueTabs: [], edgeLabels: [], bounds: null };
      const queue = [faces[startFaceIdx]];
      faces[startFaceIdx].visited = true;
      faces[startFaceIdx].islandId = currentIslandId;

      const root = faces[startFaceIdx];
      root.p2A = new THREE.Vector2(0, 0);
      root.p2B = new THREE.Vector2(root.lenAB, 0);
      const cosA = (root.lenAB * root.lenAB + root.lenCA * root.lenCA - root.lenBC * root.lenBC) / (2 * root.lenAB * root.lenCA);
      const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
      root.p2C = new THREE.Vector2(root.lenCA * cosA, root.lenCA * sinA);
      island.faces.push(root);

      while (queue.length > 0) {
        const curr = queue.shift();
        if (island.faces.length >= opt.maxFacesPerIsland) break;

        const currEdges = [
          { k: key(curr.a, curr.b), p1: curr.p2A, p2: curr.p2B, pOpp: curr.p2C, v1: curr.a, v2: curr.b },
          { k: key(curr.b, curr.c), p1: curr.p2B, p2: curr.p2C, pOpp: curr.p2A, v1: curr.b, v2: curr.c },
          { k: key(curr.c, curr.a), p1: curr.p2C, p2: curr.p2A, pOpp: curr.p2B, v1: curr.c, v2: curr.a }
        ];

        for (const ed of currEdges) {
          const adjList = edgeMap.get(ed.k) || [];
          for (const adj of adjList) {
            if (adj.faceId !== curr.id) {
              const neighbor = faces[adj.faceId];
              if (!neighbor.visited) {
                const v3 = adj.v3;
                const len1 = ed.v1.distanceTo(v3);
                const len2 = ed.v2.distanceTo(v3);

                const p3Candidate = this.get3rdPoint2D(ed.p1, ed.p2, len1, len2, ed.pOpp);
                if (!p3Candidate) continue;

                const testCandidateTri = { a: ed.p1, b: ed.p2, c: p3Candidate };
                let overlaps = false;
                for (const existingFace of island.faces) {
                  const existingTri = { a: existingFace.p2A, b: existingFace.p2B, c: existingFace.p2C };
                  if (this.trianglesOverlap2D(testCandidateTri, existingTri)) {
                    overlaps = true;
                    break;
                  }
                }

                if (overlaps) continue;

                neighbor.p2A = ed.p1.clone();
                neighbor.p2B = ed.p2.clone();
                neighbor.p2C = p3Candidate;
                neighbor.visited = true;
                neighbor.islandId = currentIslandId;

                const dotNorm = curr.normal.dot(neighbor.normal);
                const foldType = dotNorm > 0 ? 'mountain' : 'valley';

                island.faces.push(neighbor);
                island.foldLines.push({
                  p1: ed.p1.clone(),
                  p2: ed.p2.clone(),
                  type: foldType
                });

                queue.push(neighbor);
              }
            }
          }
        }
      }

      islands.push(island);
      currentIslandId++;
    }

    // 4. Pass 2: Generate Glue Tabs & Matching Edge Numbers on All Perimeter Edges
    islands.forEach(island => {
      island.faces.forEach(f => {
        const perimeterEdges = [
          { p1: f.p2A, p2: f.p2B, pOpp: f.p2C, v1: f.a, v2: f.b },
          { p1: f.p2B, p2: f.p2C, pOpp: f.p2A, v1: f.b, v2: f.c },
          { p1: f.p2C, p2: f.p2A, pOpp: f.p2B, v1: f.c, v2: f.a }
        ];

        perimeterEdges.forEach(pe => {
          const k = key(pe.v1, pe.v2);
          const adj = edgeMap.get(k) || [];
          if (adj.length > 1) {
            const other = adj.find(a => a.faceId !== f.id);
            if (other && faces[other.faceId].islandId !== island.id) {
              if (!edgePairNumbers.has(k)) {
                edgePairNumbers.set(k, globalEdgeNumber++);
              }
              const edgeNum = edgePairNumbers.get(k);

              if (island.id < faces[other.faceId].islandId) {
                const dir = new THREE.Vector2().subVectors(pe.p2, pe.p1);
                const len = dir.length();
                const norm = new THREE.Vector2(-dir.y, dir.x).normalize();

                const testPt = pe.p1.clone().add(norm);
                const crossTest = (pe.p2.x - pe.p1.x) * (testPt.y - pe.p1.y) - (pe.p2.y - pe.p1.y) * (testPt.x - pe.p1.x);
                const crossOpp = (pe.p2.x - pe.p1.x) * (pe.pOpp.y - pe.p1.y) - (pe.p2.y - pe.p1.y) * (pe.pOpp.x - pe.p1.x);
                if (crossTest * crossOpp > 0) {
                  norm.negate();
                }

                const w = Math.min(opt.tabWidth, Math.max(4, len * 0.35));
                const t1 = pe.p1.clone().add(dir.clone().multiplyScalar(0.18)).add(norm.clone().multiplyScalar(w));
                const t2 = pe.p2.clone().sub(dir.clone().multiplyScalar(0.18)).add(norm.clone().multiplyScalar(w));

                island.glueTabs.push({
                  num: edgeNum,
                  p1: pe.p1.clone(),
                  p2: pe.p2.clone(),
                  t1, t2
                });
              } else {
                const mid = new THREE.Vector2().addVectors(pe.p1, pe.p2).multiplyScalar(0.5);
                const dir = new THREE.Vector2().subVectors(pe.p2, pe.p1);
                const norm = new THREE.Vector2(-dir.y, dir.x).normalize();
                
                const testPt = mid.clone().add(norm);
                const crossTest = (pe.p2.x - pe.p1.x) * (testPt.y - pe.p1.y) - (pe.p2.y - pe.p1.y) * (testPt.x - pe.p1.x);
                const crossOpp = (pe.p2.x - pe.p1.x) * (pe.pOpp.y - pe.p1.y) - (pe.p2.y - pe.p1.y) * (pe.pOpp.x - pe.p1.x);
                if (crossTest * crossOpp < 0) {
                  norm.negate();
                }

                const labelPos = mid.clone().add(norm.multiplyScalar(4));
                island.edgeLabels.push({
                  num: edgeNum,
                  pos: labelPos
                });
              }
            }
          }
        });
      });

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      island.faces.forEach(f => {
        [f.p2A, f.p2B, f.p2C].forEach(p => {
          if (p) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
          }
        });
      });
      island.glueTabs.forEach(t => {
        [t.t1, t.t2].forEach(p => {
          if (p) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
          }
        });
      });

      island.bounds = { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
    });

    return {
      faces,
      islands,
      totalFaces: faces.length,
      totalIslands: islands.length,
      pageSize: opt.pageSize
    };
  }

  static createUnfoldRigGroup(unfoldNet, material) {
    const group = new THREE.Group();
    group.name = "PapercraftUnfoldRig";

    unfoldNet.islands.forEach((island, islIdx) => {
      const islandGroup = new THREE.Group();
      const col = islIdx % 3;
      const row = Math.floor(islIdx / 3);
      const islandBaseX = (col - 1) * 85;
      const islandBaseY = (1 - row) * 85;

      island.faces.forEach(face => {
        const singleGeo = new THREE.BufferGeometry();
        const p3A = face.a, p3B = face.b, p3C = face.c;

        const p2A = new THREE.Vector3((face.p2A?.x || 0) + islandBaseX, (face.p2A?.y || 0) + islandBaseY, 0);
        const p2B = new THREE.Vector3((face.p2B?.x || 0) + islandBaseX, (face.p2B?.y || 0) + islandBaseY, 0);
        const p2C = new THREE.Vector3((face.p2C?.x || 0) + islandBaseX, (face.p2C?.y || 0) + islandBaseY, 0);

        const currentVerts = new Float32Array([
          p3A.x, p3A.y, p3A.z,
          p3B.x, p3B.y, p3B.z,
          p3C.x, p3C.y, p3C.z
        ]);

        singleGeo.setAttribute('position', new THREE.BufferAttribute(currentVerts, 3));
        singleGeo.computeVertexNormals();

        const mesh = new THREE.Mesh(singleGeo, material);
        mesh.userData = { p3A, p3B, p3C, p2A, p2B, p2C };

        const wireGeo = new THREE.WireframeGeometry(singleGeo);
        const wireLine = new THREE.LineSegments(wireGeo, new THREE.LineBasicMaterial({
          color: 0x111827,
          linewidth: 1.5,
          transparent: true,
          opacity: 0.85
        }));
        mesh.add(wireLine);

        islandGroup.add(mesh);
      });

      group.add(islandGroup);
    });

    return group;
  }

  static setUnfoldFactor(rigGroup, factor) {
    if (!rigGroup) return;
    const t = Math.max(0, Math.min(1, factor));
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    rigGroup.traverse(child => {
      if (child.isMesh && child.userData && child.userData.p3A) {
        const { p3A, p3B, p3C, p2A, p2B, p2C } = child.userData;
        const posAttr = child.geometry.attributes.position;
        if (posAttr) {
          const vA = new THREE.Vector3().lerpVectors(p3A, p2A, ease);
          const vB = new THREE.Vector3().lerpVectors(p3B, p2B, ease);
          const vC = new THREE.Vector3().lerpVectors(p3C, p2C, ease);

          posAttr.setXYZ(0, vA.x, vA.y, vA.z);
          posAttr.setXYZ(1, vB.x, vB.y, vB.z);
          posAttr.setXYZ(2, vC.x, vC.y, vC.z);
          posAttr.needsUpdate = true;
          child.geometry.computeVertexNormals();
        }
      }
    });
  }

  static createPaperMaterial(type = 'cardstock', baseColorHex = '#f8fafc') {
    const color = new THREE.Color(baseColorHex);
    switch (type) {
      case 'kraft':
        return new THREE.MeshStandardMaterial({
          color: new THREE.Color(0xbfa588),
          roughness: 0.92,
          metalness: 0.0,
          side: THREE.DoubleSide
        });
      case 'washi_gold':
        return new THREE.MeshStandardMaterial({
          color: new THREE.Color(0xd4af37),
          roughness: 0.35,
          metalness: 0.65,
          side: THREE.DoubleSide
        });
      case 'cyber_neon':
        return new THREE.MeshStandardMaterial({
          color: new THREE.Color(0x00f0ff),
          emissive: new THREE.Color(0x003344),
          roughness: 0.25,
          metalness: 0.1,
          side: THREE.DoubleSide
        });
      case 'metallic_foil':
        return new THREE.MeshStandardMaterial({
          color: new THREE.Color(0xe2e8f0),
          roughness: 0.15,
          metalness: 0.85,
          side: THREE.DoubleSide
        });
      case 'cardstock':
      default:
        return new THREE.MeshStandardMaterial({
          color,
          roughness: 0.85,
          metalness: 0.02,
          side: THREE.DoubleSide
        });
    }
  }

  static generateSVGSheets(unfoldNet, options = {}) {
    const opt = Object.assign({
      modelName: 'Papercraft_Model',
      pageSize: 'A4',
      lineColorCut: '#111827',
      lineColorMountain: '#dc2626',
      lineColorValley: '#2563eb',
      showTabNumbers: true
    }, options);

    const dims = {
      'A4': { w: 210, h: 297 },
      'A3': { w: 297, h: 420 },
      'LETTER': { w: 216, h: 279 }
    };
    const pageDim = dims[opt.pageSize] || dims['A4'];
    const pad = 14;
    const drawW = pageDim.w - pad * 2;
    const drawH = pageDim.h - pad * 2 - 22;

    const pages = [];
    const islandsPerPage = 2;
    const pageCount = Math.ceil(unfoldNet.islands.length / islandsPerPage) || 1;

    for (let p = 0; p < pageCount; p++) {
      const pageIslands = unfoldNet.islands.slice(p * islandsPerPage, (p + 1) * islandsPerPage);
      let svgContent = '';

      pageIslands.forEach((island, idx) => {
        const b = island.bounds;
        if (!b || b.width <= 0 || b.height <= 0) return;

        const targetH = drawH / pageIslands.length - 8;
        const scale = Math.min(drawW / b.width, targetH / b.height) * 0.88;

        const offX = pad + (drawW - b.width * scale) / 2 - b.minX * scale;
        const offY = pad + 18 + idx * (drawH / pageIslands.length) + (targetH - b.height * scale) / 2 - b.minY * scale;

        const pieceNum = p * islandsPerPage + idx + 1;
        const pieceBadgeX = pad + 4;
        const pieceBadgeY = offY - 4;
        svgContent += `    <text x="${pieceBadgeX}" y="${pieceBadgeY}" font-family="'Segoe UI', sans-serif" font-weight="bold" font-size="3.8" fill="#4f46e5">PIECE #${pieceNum}</text>\n`;

        island.faces.forEach((f, fIdx) => {
          if (!f.p2A || !f.p2B || !f.p2C) return;
          const ax = (offX + f.p2A.x * scale).toFixed(2);
          const ay = (offY + f.p2A.y * scale).toFixed(2);
          const bx = (offX + f.p2B.x * scale).toFixed(2);
          const by = (offY + f.p2B.y * scale).toFixed(2);
          const cx = (offX + f.p2C.x * scale).toFixed(2);
          const cy = (offY + f.p2C.y * scale).toFixed(2);

          const fillShade = fIdx % 2 === 0 ? '#f8fafc' : '#ffffff';
          svgContent += `    <polygon points="${ax},${ay} ${bx},${by} ${cx},${cy}" fill="${fillShade}" stroke="${opt.lineColorCut}" stroke-width="0.5" stroke-linejoin="round" />\n`;
        });

        island.foldLines.forEach(fl => {
          const x1 = (offX + fl.p1.x * scale).toFixed(2);
          const y1 = (offY + fl.p1.y * scale).toFixed(2);
          const x2 = (offX + fl.p2.x * scale).toFixed(2);
          const y2 = (offY + fl.p2.y * scale).toFixed(2);

          if (fl.type === 'mountain') {
            svgContent += `    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${opt.lineColorMountain}" stroke-width="0.45" stroke-dasharray="3,1.5" />\n`;
          } else {
            svgContent += `    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${opt.lineColorValley}" stroke-width="0.45" stroke-dasharray="4,1.5,1,1.5" />\n`;
          }
        });

        island.glueTabs.forEach(tab => {
          const p1x = (offX + tab.p1.x * scale).toFixed(2);
          const p1y = (offY + tab.p1.y * scale).toFixed(2);
          const p2x = (offX + tab.p2.x * scale).toFixed(2);
          const p2y = (offY + tab.p2.y * scale).toFixed(2);
          const t1x = (offX + tab.t1.x * scale).toFixed(2);
          const t1y = (offY + tab.t1.y * scale).toFixed(2);
          const t2x = (offX + tab.t2.x * scale).toFixed(2);
          const t2y = (offY + tab.t2.y * scale).toFixed(2);

          svgContent += `    <polygon points="${p1x},${p1y} ${t1x},${t1y} ${t2x},${t2y} ${p2x},${p2y}" fill="#e5e7eb" stroke="#6b7280" stroke-width="0.3" stroke-dasharray="1.5,1" />\n`;
          
          if (opt.showTabNumbers) {
            const midX = ((parseFloat(t1x) + parseFloat(t2x) + parseFloat(p1x) + parseFloat(p2x)) / 4).toFixed(2);
            const midY = ((parseFloat(t1y) + parseFloat(t2y) + parseFloat(p1y) + parseFloat(p2y)) / 4).toFixed(2);
            svgContent += `    <text x="${midX}" y="${midY}" font-family="'Segoe UI', sans-serif" font-weight="bold" font-size="3" fill="#1f2937" text-anchor="middle" dominant-baseline="central">${tab.num}</text>\n`;
          }
        });

        island.edgeLabels.forEach(el => {
          const lx = (offX + el.pos.x * scale).toFixed(2);
          const ly = (offY + el.pos.y * scale).toFixed(2);
          svgContent += `    <text x="${lx}" y="${ly}" font-family="'Segoe UI', sans-serif" font-size="2.6" font-weight="600" fill="#6b7280" text-anchor="middle" dominant-baseline="central">${el.num}</text>\n`;
        });
      });

      const fullSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${pageDim.w} ${pageDim.h}" width="${pageDim.w}mm" height="${pageDim.h}mm">
  <rect width="100%" height="100%" fill="#ffffff" />
  
  <text x="${pad}" y="${pad - 2}" font-family="'Segoe UI', sans-serif" font-weight="bold" font-size="5.2" fill="#0f172a">${opt.modelName} — 3D Papercraft Pattern</text>
  <text x="${pageDim.w - pad}" y="${pad - 2}" font-family="'Segoe UI', sans-serif" font-weight="600" font-size="3.8" fill="#64748b" text-anchor="end">Page ${p + 1} of ${pageCount} (${opt.pageSize})</text>
  
  <g transform="translate(${pad}, ${pad + 4})">
    <line x1="0" y1="0" x2="10" y2="0" stroke="${opt.lineColorCut}" stroke-width="0.6" />
    <text x="12" y="1.2" font-family="'Segoe UI', sans-serif" font-size="2.8" font-weight="600" fill="#1e293b">Cut line (—)</text>
    <line x1="38" y1="0" x2="48" y2="0" stroke="${opt.lineColorMountain}" stroke-width="0.6" stroke-dasharray="3,1.5" />
    <text x="50" y="1.2" font-family="'Segoe UI', sans-serif" font-size="2.8" font-weight="bold" fill="#dc2626">Mountain fold (---)</text>
    <line x1="88" y1="0" x2="98" y2="0" stroke="${opt.lineColorValley}" stroke-width="0.6" stroke-dasharray="4,1.5,1,1.5" />
    <text x="100" y="1.2" font-family="'Segoe UI', sans-serif" font-size="2.8" font-weight="bold" fill="#2563eb">Valley fold (-.-)</text>
    <rect x="138" y="-2" width="6" height="4" fill="#e5e7eb" stroke="#6b7280" stroke-width="0.3" />
    <text x="146" y="1.2" font-family="'Segoe UI', sans-serif" font-size="2.8" font-weight="600" fill="#475569">Glue tab [N]</text>
  </g>

  <g id="patterns">
${svgContent}
  </g>

  <line x1="${pad}" y1="${pageDim.h - 10}" x2="${pageDim.w - pad}" y2="${pageDim.h - 10}" stroke="#cbd5e1" stroke-width="0.3" />
  <text x="${pad}" y="${pageDim.h - 5.5}" font-family="'Segoe UI', sans-serif" font-size="2.5" fill="#94a3b8">Print at 100% Scale (Actual Size) on 160–220 gsm Cardstock. Match matching numbers to glue.</text>
  <text x="${pageDim.w - pad}" y="${pageDim.h - 5.5}" font-family="'Segoe UI', sans-serif" font-size="2.5" fill="#94a3b8" text-anchor="end">PolyMorph 3D Studio — Papercraft Engine</text>
</svg>`;

      pages.push({
        page: p + 1,
        svg: fullSvg,
        filename: `${opt.modelName}_Sheet_${p + 1}_of_${pageCount}.svg`
      });
    }

    return pages;
  }

  static async generateStandalonePapercraftHTML(geometry, unfoldNet, baseName = 'Papercraft_Sculpture') {
    let glbBase64 = '';
    try {
      const scene = new THREE.Scene();
      const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0.05, side: THREE.DoubleSide })
      );
      scene.add(mesh);
      const { blob } = await ModelConverters.exportModel(scene, 'glb', baseName);
      const buf = await blob.arrayBuffer();
      const bytes = new Uint8Array(buf);
      const chunkSize = 8192;
      let bin = '';
      for (let i = 0; i < bytes.byteLength; i += chunkSize) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunkSize, bytes.byteLength)));
      }
      glbBase64 = btoa(bin);
    } catch (e) {
      console.warn('Papercraft GLB export fallback:', e);
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${baseName} — 3D Papercraft &amp; Origami Interactive Viewer</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{--bg:#0b0f19;--surface:#161c2e;--border:rgba(0,240,255,0.15);--accent:#00f0ff;--accent2:#8b5cf6;--text:#e2e8f0;--muted:#64748b}
    body{background:var(--bg);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif;height:100vh;display:flex;flex-direction:column;overflow:hidden}
    header{background:var(--surface);border-bottom:1px solid var(--border);padding:10px 18px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
    .brand{display:flex;align-items:center;gap:10px}
    .brand-logo{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;font-weight:800;font-size:0.8rem;padding:4px 8px;border-radius:6px}
    .brand-name{font-weight:700;font-size:0.95rem}
    .brand-sub{font-size:0.68rem;color:var(--muted)}
    .btn{display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:7px;border:1px solid var(--border);cursor:pointer;font-size:0.75rem;font-weight:600;background:rgba(255,255,255,0.05);color:var(--text);transition:all 0.15s}
    .btn:hover{background:rgba(255,255,255,0.12)}
    main{flex:1;position:relative;overflow:hidden}
    #cv{display:block;width:100%;height:100%}
    .slider-panel{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);background:rgba(11,15,25,0.9);border:1px solid var(--border);border-radius:10px;padding:10px 18px;backdrop-filter:blur(8px);display:flex;flex-direction:column;gap:6px;min-width:320px;z-index:5}
    .slider-header{display:flex;justify-content:space-between;font-size:0.75rem;font-weight:700;color:var(--accent)}
    input[type=range]{width:100%;accent-color:var(--accent);cursor:pointer}
    .slider-labels{display:flex;justify-content:space-between;font-size:0.68rem;color:var(--muted)}
    footer{background:var(--surface);border-top:1px solid var(--border);padding:8px 18px;font-size:0.68rem;color:var(--muted);display:flex;justify-content:space-between;flex-wrap:wrap}
  </style>
</head>
<body>
<header>
  <div class="brand">
    <div class="brand-logo">✂️</div>
    <div>
      <div class="brand-name">${baseName}</div>
      <div class="brand-sub">PolyMorph 3D Studio — Papercraft &amp; Origami Viewer</div>
    </div>
  </div>
  <div style="display:flex;gap:6px">
    <button class="btn" id="bWire">📐 Wireframe</button>
    <button class="btn" id="bRot">🔄 Auto-Rotate</button>
    <button class="btn" id="bSnap">📷 Snapshot</button>
  </div>
</header>
<main>
  <canvas id="cv"></canvas>
  <div class="slider-panel">
    <div class="slider-header">
      <span>✂️ Fold / Unfold Simulation</span>
      <span id="sVal">0% (3D Solid)</span>
    </div>
    <input type="range" id="uSlider" min="0" max="100" value="0">
    <div class="slider-labels">
      <span>0% (Assembled 3D)</span>
      <span>50% (Unfolding)</span>
      <span>100% (Flat Net)</span>
    </div>
  </div>
</main>
<footer>
  <span>PolyMorph 3D Studio — Papercraft 3D Engine</span>
  <span>Total Faces: ${unfoldNet.totalFaces} | Islands: ${unfoldNet.totalIslands}</span>
</footer>

<script id="glb-data" type="text/plain">${glbBase64}</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
<script>
(function(){
  var b64 = document.getElementById('glb-data').textContent.trim();
  var canvas = document.getElementById('cv');
  var main = canvas.parentElement;

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.outputEncoding = THREE.sRGBEncoding;

  var W = main.clientWidth || 800, H = main.clientHeight || 600;
  renderer.setSize(W, H);

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0f19);

  var camera = new THREE.PerspectiveCamera(45, W/H, 0.1, 5000);
  camera.position.set(0, 40, 120);

  var controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  var amb = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(amb);
  var dl1 = new THREE.DirectionalLight(0xffffff, 1.2);
  dl1.position.set(60, 100, 80);
  scene.add(dl1);
  var dl2 = new THREE.DirectionalLight(0x00f0ff, 0.6);
  dl2.position.set(-60, 60, -40);
  scene.add(dl2);

  var loadedModel = null;
  if (b64 && b64.length > 20) {
    var bin = atob(b64);
    var buf = new ArrayBuffer(bin.length);
    var view = new Uint8Array(buf);
    for(var i=0; i<bin.length; i++) view[i] = bin.charCodeAt(i);

    new THREE.GLTFLoader().parse(buf, '', function(gltf){
      loadedModel = gltf.scene;
      scene.add(loadedModel);
      var box = new THREE.Box3().setFromObject(loadedModel);
      var sz = box.getSize(new THREE.Vector3());
      var maxDim = Math.max(sz.x, sz.y, sz.z) || 1;
      camera.position.set(0, maxDim*0.6, maxDim*2.2);
      controls.target.set(0, 0, 0);
      controls.update();
    });
  }

  var slider = document.getElementById('uSlider');
  var sVal = document.getElementById('sVal');
  slider.addEventListener('input', function(e){
    var v = parseInt(e.target.value, 10);
    sVal.textContent = v === 0 ? '0% (3D Solid)' : (v === 100 ? '100% (Flat Net)' : v + '% (Unfolding)');
    if (loadedModel) {
      var scale = 1.0 - (v / 100) * 0.4;
      loadedModel.scale.set(scale, scale, 1.0 - (v / 100) * 0.95);
      loadedModel.rotation.x = (v / 100) * (Math.PI / 4);
    }
  });

  document.getElementById('bWire').addEventListener('click', function(){
    if (loadedModel) {
      loadedModel.traverse(function(c){
        if (c.isMesh && c.material) c.material.wireframe = !c.material.wireframe;
      });
    }
  });

  document.getElementById('bRot').addEventListener('click', function(){
    controls.autoRotate = !controls.autoRotate;
  });

  document.getElementById('bSnap').addEventListener('click', function(){
    renderer.render(scene, camera);
    var a = document.createElement('a');
    a.download = '${baseName}_snapshot.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  });

  new ResizeObserver(function(){
    var w = main.clientWidth || 800, h = main.clientHeight || 600;
    camera.aspect = w/h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }).observe(main);

  function animate(){
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
}

if (typeof window !== 'undefined') {
  window.PapercraftEngine = PapercraftEngine;
}
if (typeof module !== 'undefined') {
  module.exports = PapercraftEngine;
}
