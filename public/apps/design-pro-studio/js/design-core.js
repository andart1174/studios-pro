/**
 * Design Pro Studio v4.0 — Pure Architectural Core, 4 Room Shapes, 58-Item Multi-Category
 * Furniture Catalog, 6 Curated Interior Design Styles, Zero-Collision Ergonomic Auto-Layout,
 * Rotated OBB Collisions, Real m² Renovation + Furniture Devis, Metric/Imperial & FR/EN i18n.
 * Zero DOM/WebGL dependencies — 100% testable in Node.js and Browser.
 */
(function (globalScope) {
  'use strict';

  const DEG2RAD = Math.PI / 180;
  const WALL_THICKNESS_CM = 18;

  // =========================================================================
  // 1. UNIT CONVERSIONS & LOCALE-SAFE FORMATTING
  // =========================================================================

  function fmtLen(cm, unit = 'metric') {
    const v = Number(cm) || 0;
    if (unit === 'imperial') {
      const totalIn = v / 2.54;
      if (totalIn >= 36) {
        const ft = Math.floor(totalIn / 12);
        const remIn = Math.round(totalIn - ft * 12);
        if (remIn === 12) return `${ft + 1}'0"`;
        return `${ft}'${remIn}"`;
      }
      return `${Math.round(totalIn * 10) / 10} in`;
    }
    if (Math.abs(v) >= 1000) return `${(v / 100).toFixed(2)} m`;
    return `${Math.round(v)} cm`;
  }

  function fmtMeters(cm, unit = 'metric') {
    const v = Number(cm) || 0;
    if (unit === 'imperial') return `${(v / 30.48).toFixed(2)} ft`;
    return `${(v / 100).toFixed(2)} m`;
  }

  function fmtArea(m2, unit = 'metric') {
    const v = Number(m2) || 0;
    if (unit === 'imperial') return `${(v * 10.76391).toFixed(1)} ft²`;
    return `${v.toFixed(2)} m²`;
  }

  function fmtMoney(amount, currency = 'EUR') {
    const n = Math.round(Number(amount) || 0);
    const formatted = n.toLocaleString('en-US');
    return currency === 'USD' ? `$${formatted}` : `${formatted} €`;
  }

  // =========================================================================
  // 2. ROOM SHAPES & EXACT ARCHITECTURAL WALL SEGMENTS (cm coordinates, CW)
  // =========================================================================

  const ROOM_SHAPES = [
    { id: 'rect',   en: 'Rectangle',       fr: 'Rectangle' },
    { id: 'l_shape',en: 'L-Shape',         fr: 'Forme en L' },
    { id: 'loft',   en: 'Open Loft + Wall',fr: 'Loft + Cloison' },
    { id: 'alcove', en: 'Studio Alcove',   fr: 'Studio Alcové' }
  ];

  const ROOM_TYPES = [
    { id: 'living',   en: 'Living Room',  fr: 'Salon',          icon: '🛋️', defW: 560, defD: 440, defH: 270 },
    { id: 'bedroom',  en: 'Bedroom',      fr: 'Chambre',        icon: '🛏️', defW: 440, defD: 380, defH: 265 },
    { id: 'kitchen',  en: 'Kitchen',      fr: 'Cuisine',        icon: '🍳', defW: 460, defD: 360, defH: 265 },
    { id: 'bathroom', en: 'Bathroom',     fr: 'Salle de bain',  icon: '🛁', defW: 320, defD: 260, defH: 255 },
    { id: 'office',   en: 'Home Office',  fr: 'Bureau',         icon: '💼', defW: 420, defD: 340, defH: 265 },
    { id: 'dining',   en: 'Dining Room',  fr: 'Salle à manger', icon: '🍽️', defW: 480, defD: 380, defH: 270 }
  ];

  // Build clockwise polygon (in cm) & wall segments for any room shape
  function buildRoomGeometry(room) {
    const W = Math.max(220, Math.min(1400, Number(room.w) || 520));
    const D = Math.max(200, Math.min(1200, Number(room.d) || 420));
    const H = Math.max(210, Math.min(480, Number(room.h) || 270));
    const shape = room.shape || 'rect';

    let poly;
    let partitions = [];
    if (shape === 'l_shape') {
      // Cutout top-right notch (42% W × 42% D) -> spacious L-shaped room
      const cutX = Math.round(W * 0.58);
      const cutY = Math.round(D * 0.42);
      poly = [
        [0, 0], [cutX, 0], [cutX, cutY], [W, cutY], [W, D], [0, D]
      ];
    } else if (shape === 'alcove') {
      // Cozy side alcove bump-in on right side
      const alX = Math.round(W * 0.72);
      const alY1 = Math.round(D * 0.28);
      const alY2 = Math.round(D * 0.72);
      poly = [
        [0, 0], [W, 0], [W, alY1], [alX, alY1], [alX, alY2], [W, alY2], [W, D], [0, D]
      ];
    } else {
      poly = [[0, 0], [W, 0], [W, D], [0, D]];
      if (shape === 'loft') {
        // Interior feature partition wall spanning 48% depth at X = 60%
        const px = Math.round(W * 0.62);
        const pyEnd = Math.round(D * 0.48);
        partitions.push({ id: 'part_1', x1: px, y1: 0, x2: px, y2: pyEnd, isPartition: true });
      }
    }

    // Compute signed area (shoelace)
    let area2 = 0;
    for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i];
      const [x2, y2] = poly[(i + 1) % poly.length];
      area2 += (x1 * y2 - x2 * y1);
    }
    const areaM2 = Math.abs(area2) / 2 / 10000;

    // Build perimeter wall definitions with inward unit normals!
    const walls = [];
    let perimeterCm = 0;
    const wallOverrides = room.wallStyles || {};

    for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i];
      const [x2, y2] = poly[(i + 1) % poly.length];
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      perimeterCm += len;
      const id = `w${i}`;
      // For CW polygon in screen coords (x right, y down), inward normal is (-dy/len, dx/len)
      const nx = -dy / len;
      const ny = dx / len;
      const ov = wallOverrides[id] || {};
      const dirLabel = Math.abs(dx) >= Math.abs(dy)
        ? (ny > 0 ? 'North' : 'South')
        : (nx > 0 ? 'West' : 'East');
      walls.push({
        id, index: i, label: `${dirLabel} #${i + 1}`,
        x1, y1, x2, y2, len,
        angle: Math.atan2(dy, dx),
        nx, ny,
        isPartition: false,
        material: ov.material || room.wallMaterial || 'paint',
        color: ov.color || room.wallColor || '#ede9e2'
      });
    }

    partitions.forEach((p, idx) => {
      const dx = p.x2 - p.x1, dy = p.y2 - p.y1;
      const len = Math.hypot(dx, dy);
      const ov = wallOverrides[p.id] || {};
      walls.push({
        id: p.id, index: walls.length, label: `Partition ${idx + 1}`,
        x1: p.x1, y1: p.y1, x2: p.x2, y2: p.y2, len,
        angle: Math.atan2(dy, dx),
        nx: -dy / len, ny: dx / len,
        isPartition: true,
        material: ov.material || room.accentMaterial || 'wood_slats',
        color: ov.color || room.accentColor || '#a67b51'
      });
    });

    return { W, D, H, shape, poly, walls, areaM2, perimeterM: perimeterCm / 100 };
  }

  function pointInPoly(px, py, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1];
      const xj = poly[j][0], yj = poly[j][1];
      const intersect = ((yi > py) !== (yj > py)) &&
        (px < ((xj - xi) * (py - yi)) / ((yj - yi) || 1e-9) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // =========================================================================
  // 3. 6 CURATED REAL INTERIOR DESIGN STYLES (Transform Everything!)
  // =========================================================================

  const DESIGN_STYLES = {
    modern: {
      id: 'modern', en: 'Modern Minimal', fr: 'Moderne Minimal', icon: '✨',
      floorMaterial: 'parquet', floorColor: '#c49a6c',
      wallMaterial: 'paint', wallColor: '#f1efe9',
      accentMaterial: 'wood_slats', accentColor: '#9d7147',
      ceilingColor: '#faf9f7',
      timeOfDay: 14, ambient: 0.72,
      palette: { primary: '#3d4856', wood: '#9e744c', metal: '#1f242d', accent: '#c98a5b', fabric: '#d8d2c7' }
    },
    scandinavian: {
      id: 'scandinavian', en: 'Scandinavian Oak', fr: 'Scandinave Chêne', icon: '🌿',
      floorMaterial: 'wood', floorColor: '#dfc39d',
      wallMaterial: 'paint', wallColor: '#f7f5f0',
      accentMaterial: 'wood_slats', accentColor: '#d1ad7e',
      ceilingColor: '#ffffff',
      timeOfDay: 11, ambient: 0.82,
      palette: { primary: '#8ea096', wood: '#d6b384', metal: '#2c3035', accent: '#d99f77', fabric: '#edeae3' }
    },
    luxury: {
      id: 'luxury', en: 'Parisian Luxury', fr: 'Luxe Parisien', icon: '💎',
      floorMaterial: 'marble', floorColor: '#edeae4',
      wallMaterial: 'plaster', wallColor: '#ece5db',
      accentMaterial: 'marble_wall', accentColor: '#e4dfd8',
      ceilingColor: '#faf8f4',
      timeOfDay: 16, ambient: 0.70,
      palette: { primary: '#2b3e4f', wood: '#573c28', metal: '#c9a352', accent: '#9e7c44', fabric: '#e8dfd1' }
    },
    japandi: {
      id: 'japandi', en: 'Japandi Zen', fr: 'Japandi Zen', icon: '🎋',
      floorMaterial: 'wood', floorColor: '#c9a980',
      wallMaterial: 'plaster', wallColor: '#eae2d3',
      accentMaterial: 'wood_slats', accentColor: '#8d6a49',
      ceilingColor: '#f3ede3',
      timeOfDay: 15, ambient: 0.76,
      palette: { primary: '#6e655c', wood: '#8f6c4a', metal: '#262422', accent: '#7c8b71', fabric: '#e6ded0' }
    },
    industrial: {
      id: 'industrial', en: 'Industrial Loft', fr: 'Loft Industriel', icon: '🧱',
      floorMaterial: 'concrete', floorColor: '#8d9096',
      wallMaterial: 'concrete', wallColor: '#c7c9ce',
      accentMaterial: 'brick', accentColor: '#9c523b',
      ceilingColor: '#d8dadf',
      timeOfDay: 17, ambient: 0.66,
      palette: { primary: '#7c482b', wood: '#69462d', metal: '#1b1d22', accent: '#b86839', fabric: '#4a4e57' }
    },
    mediterranean: {
      id: 'mediterranean', en: 'Mediterranean', fr: 'Méditerranéen', icon: '☀️',
      floorMaterial: 'terracotta', floorColor: '#c77f59',
      wallMaterial: 'plaster', wallColor: '#f5efe2',
      accentMaterial: 'plaster', accentColor: '#e7d7bf',
      ceilingColor: '#fbf8f1',
      timeOfDay: 13, ambient: 0.84,
      palette: { primary: '#3b6c8c', wood: '#9e6c42', metal: '#8c6943', accent: '#c9784f', fabric: '#f0e7d8' }
    }
  };

  // =========================================================================
  // 4. 58-ITEM MULTI-PART FURNITURE & DECOR CATALOG (7 Cross-Room Categories!)
  // =========================================================================

  const FLOOR_MATERIALS = [
    { id: 'parquet',    en: 'Herringbone Oak', fr: 'Parquet Chevron',  priceM2: 68 },
    { id: 'wood',       en: 'Natural Plank',   fr: 'Parquet Chêne',    priceM2: 54 },
    { id: 'walnut',     en: 'Dark Walnut',     fr: 'Noyer Foncé',      priceM2: 76 },
    { id: 'marble',     en: 'Carrara Marble',  fr: 'Marbre Carrare',   priceM2: 115 },
    { id: 'tile',       en: 'Porcelain Tile',  fr: 'Carrelage Grès',   priceM2: 48 },
    { id: 'concrete',   en: 'Microcement',     fr: 'Béton Ciré',       priceM2: 62 },
    { id: 'carpet',     en: 'Berber Carpet',   fr: 'Moquette Berbère', priceM2: 38 },
    { id: 'terracotta', en: 'Terracotta',      fr: 'Terre Cuite',      priceM2: 58 },
    { id: 'slate',      en: 'Natural Slate',   fr: 'Ardoise Naturelle',priceM2: 72 },
    { id: 'checker',    en: 'Bistro Checker',  fr: 'Damier Bistrot',   priceM2: 64 }
  ];

  const WALL_MATERIALS = [
    { id: 'paint',       en: 'Matte Plaster',    fr: 'Peinture Mate',      priceM2: 18 },
    { id: 'plaster',     en: 'Venetian Lime',    fr: 'Chaux Vénitienne',   priceM2: 42 },
    { id: 'wood_slats',  en: 'Acoustic Slats',   fr: 'Riflaj Bois Acust.', priceM2: 88 },
    { id: 'brick',       en: 'Exposed Brick',    fr: 'Brique Loft',        priceM2: 65 },
    { id: 'concrete',    en: 'Arch. Concrete',   fr: 'Béton Architectural',priceM2: 52 },
    { id: 'subway_tile', en: 'Subway Ceramic',   fr: 'Faïence Métro',      priceM2: 56 },
    { id: 'wallpaper',   en: 'Fluted Wallpaper', fr: 'Papier Peint Strié', priceM2: 34 },
    { id: 'marble_wall', en: 'Calacatta Slab',   fr: 'Marbre Calacatta',   priceM2: 135 }
  ];

  const CATALOG_CATEGORIES = [
    { id: 'living',   en: 'Living',   fr: 'Salon',    icon: '🛋️' },
    { id: 'bedroom',  en: 'Bedroom',  fr: 'Chambre',  icon: '🛏️' },
    { id: 'kitchen',  en: 'Kitchen',  fr: 'Cuisine',  icon: '🍳' },
    { id: 'bathroom', en: 'Bath',     fr: 'Bain',     icon: '🛁' },
    { id: 'office',   en: 'Office',   fr: 'Bureau',   icon: '💼' },
    { id: 'dining',   en: 'Dining',   fr: 'Repas',    icon: '🍽️' },
    { id: 'decor',    en: 'Light & Decor', fr: 'Déco & Lum.', icon: '💡' }
  ];

  const FURNITURE_CATALOG = [
    // LIVING (11)
    { id: 'sofa_l',        cat: 'living',   en: 'L-Shape Sectional', fr: 'Canapé d’Angle L',  w: 250, d: 165, h: 84, z: 0,   price: 1850, color: '#465362', role: 'primary' },
    { id: 'sofa',          cat: 'living',   en: '3-Seat Sofa',       fr: 'Canapé 3 Places',   w: 220, d: 92,  h: 84, z: 0,   price: 1290, color: '#475569', role: 'primary' },
    { id: 'sofa2',         cat: 'living',   en: '2-Seat Loveseat',   fr: 'Canapé 2 Places',   w: 165, d: 88,  h: 82, z: 0,   price: 890,  color: '#64748b', role: 'primary' },
    { id: 'armchair',      cat: 'living',   en: 'Bouclé Armchair',   fr: 'Fauteuil Bouclé',   w: 84,  d: 84,  h: 84, z: 0,   price: 490,  color: '#d9cfc1', role: 'fabric' },
    { id: 'tv_stand',      cat: 'living',   en: '65" OLED + Console',fr: 'Meuble TV + OLED',  w: 180, d: 46,  h: 145,z: 0,   price: 1150, color: '#8a6544', role: 'wood' },
    { id: 'coffee_table',  cat: 'living',   en: 'Marble Coffee Tbl', fr: 'Table Basse Marbre',w: 120, d: 65,  h: 40, z: 0,   price: 380,  color: '#ebe6de', role: 'accent' },
    { id: 'side_table',    cat: 'living',   en: 'Round Side Table',  fr: 'Guéridon Rond',     w: 50,  d: 50,  h: 54, z: 0,   price: 165,  color: '#9e744c', role: 'wood' },
    { id: 'bookshelf',     cat: 'living',   en: 'Arch. Bookcase',    fr: 'Bibliothèque',      w: 110, d: 36,  h: 205,z: 0,   price: 460,  color: '#8f6947', role: 'wood' },
    { id: 'fireplace',     cat: 'living',   en: 'Modern Fireplace',  fr: 'Cheminée Moderne',  w: 140, d: 42,  h: 115,z: 0,   price: 1650, color: '#e6e2da', role: 'accent', emitsLight: true },
    { id: 'ottoman',       cat: 'living',   en: 'Round Ottoman',     fr: 'Pouf Rond',         w: 72,  d: 72,  h: 42, z: 0,   price: 220,  color: '#c98a5b', role: 'accent' },
    { id: 'rug',           cat: 'living',   en: 'Woven Area Rug',    fr: 'Tapis Tissé',       w: 240, d: 170, h: 2,  z: 0,   price: 290,  color: '#dfd8cc', role: 'fabric', isRug: true },

    // BEDROOM (9)
    { id: 'bed_king',      cat: 'bedroom',  en: 'King Platform Bed', fr: 'Lit King Size',     w: 200, d: 215, h: 110,z: 0,   price: 1590, color: '#d8d0c5', role: 'fabric' },
    { id: 'bed_double',    cat: 'bedroom',  en: 'Queen Platform Bed',fr: 'Lit Double Queen',  w: 168, d: 210, h: 108,z: 0,   price: 1190, color: '#d4ccc0', role: 'fabric' },
    { id: 'bed_single',    cat: 'bedroom',  en: 'Single Studio Bed', fr: 'Lit Simple',        w: 102, d: 205, h: 100,z: 0,   price: 680,  color: '#d2cabf', role: 'fabric' },
    { id: 'wardrobe',      cat: 'bedroom',  en: 'Sliding Wardrobe',  fr: 'Dressing Couliss.', w: 200, d: 62,  h: 230,z: 0,   price: 1180, color: '#e8e4dc', role: 'wood' },
    { id: 'nightstand',    cat: 'bedroom',  en: 'Nightstand + Lamp', fr: 'Chevet + Lampe',    w: 52,  d: 44,  h: 92, z: 0,   price: 240,  color: '#9e744c', role: 'wood', emitsLight: true },
    { id: 'dresser',       cat: 'bedroom',  en: '6-Drawer Dresser',  fr: 'Commode 6 Tiroirs', w: 120, d: 48,  h: 86, z: 0,   price: 540,  color: '#966f4b', role: 'wood' },
    { id: 'vanity',        cat: 'bedroom',  en: 'Vanity Desk+Mirror',fr: 'Coiffeuse Miroir',  w: 110, d: 48,  h: 145,z: 0,   price: 490,  color: '#e8e2d8', role: 'wood' },
    { id: 'bench',         cat: 'bedroom',  en: 'End-of-Bed Bench',  fr: 'Banc de Lit',       w: 130, d: 42,  h: 46, z: 0,   price: 260,  color: '#c9a984', role: 'fabric' },
    { id: 'mirror',        cat: 'bedroom',  en: 'Full Arch Mirror',  fr: 'Miroir Arche',      w: 75,  d: 6,   h: 185,z: 10,  price: 280,  color: '#c9a352', role: 'metal', isWallMount: true },

    // KITCHEN (9)
    { id: 'kitchen_counter',cat:'kitchen',  en: 'Kitchen Counter+Sink',fr:'Plan Cuisine+Évier',w: 240, d: 64,  h: 215,z: 0,   price: 2200, color: '#e8e6e1', role: 'wood' },
    { id: 'kitchen_base',  cat: 'kitchen',  en: 'Prep Cabinet 120',  fr: 'Meuble Bas 120',    w: 120, d: 64,  h: 90, z: 0,   price: 780,  color: '#e5e2dc', role: 'wood' },
    { id: 'island',        cat: 'kitchen',  en: 'Kitchen Island',    fr: 'Îlot Central',      w: 170, d: 88,  h: 92, z: 0,   price: 1950, color: '#414952', role: 'primary' },
    { id: 'bar_stool',     cat: 'kitchen',  en: 'Counter Bar Stool', fr: 'Tabouret de Bar',   w: 44,  d: 44,  h: 94, z: 0,   price: 165,  color: '#8c5a3c', role: 'accent' },
    { id: 'fridge',        cat: 'kitchen',  en: 'French-Door Fridge',fr: 'Réfrigérateur US',  w: 84,  d: 72,  h: 190,z: 0,   price: 1450, color: '#c4c9d0', role: 'metal' },
    { id: 'stove',         cat: 'kitchen',  en: 'Induction + Hood',  fr: 'Cuisinière + Hotte',w: 80,  d: 64,  h: 215,z: 0,   price: 1120, color: '#2b2f38', role: 'metal' },
    { id: 'dishwasher',    cat: 'kitchen',  en: 'Dishwasher',        fr: 'Lave-Vaisselle',    w: 60,  d: 62,  h: 86, z: 0,   price: 640,  color: '#d4d8de', role: 'metal' },
    { id: 'kitchen_table', cat: 'kitchen',  en: 'Bistro Table',      fr: 'Table Bistrot',     w: 130, d: 82,  h: 75, z: 0,   price: 520,  color: '#a37b52', role: 'wood' },
    { id: 'kitchen_chair', cat: 'kitchen',  en: 'Wood Dining Chair', fr: 'Chaise Bois',       w: 46,  d: 48,  h: 86, z: 0,   price: 145,  color: '#a37b52', role: 'wood' },

    // BATHROOM (8)
    { id: 'bathtub',       cat: 'bathroom', en: 'Soaking Bathtub',   fr: 'Baignoire Îlot',    w: 172, d: 80,  h: 62, z: 0,   price: 1680, color: '#f8fafc', role: 'fabric' },
    { id: 'shower',        cat: 'bathroom', en: 'Walk-In Glass Shower',fr:'Douche Italienne', w: 110, d: 95,  h: 212,z: 0,   price: 1290, color: '#1f2937', role: 'metal' },
    { id: 'toilet',        cat: 'bathroom', en: 'Modern Rimless WC', fr: 'WC Suspendu',       w: 40,  d: 62,  h: 78, z: 0,   price: 440,  color: '#f8fafc', role: 'fabric' },
    { id: 'sink',          cat: 'bathroom', en: 'Vanity + LED Mirror',fr:'Meuble Vasque LED',w: 84,  d: 50,  h: 190,z: 0,   price: 680,  color: '#8f6b47', role: 'wood', emitsLight: true },
    { id: 'double_sink',   cat: 'bathroom', en: 'Double Vanity LED', fr: 'Double Vasque LED', w: 140, d: 52,  h: 190,z: 0,   price: 1180, color: '#8f6b47', role: 'wood', emitsLight: true },
    { id: 'towel_rack',    cat: 'bathroom', en: 'Heated Towel Rail', fr: 'Sèche-Serviettes',  w: 56,  d: 12,  h: 128,z: 70,  price: 260,  color: '#2b303a', role: 'metal', isWallMount: true },
    { id: 'bath_cabinet',  cat: 'bathroom', en: 'Tall Linen Column', fr: 'Colonne Rangement', w: 45,  d: 36,  h: 185,z: 0,   price: 380,  color: '#e5e0d8', role: 'wood' },
    { id: 'washer',        cat: 'bathroom', en: 'Washer / Dryer',    fr: 'Lave-Linge',        w: 60,  d: 60,  h: 85, z: 0,   price: 690,  color: '#f1f5f9', role: 'fabric' },

    // OFFICE (7)
    { id: 'office_desk',   cat: 'office',   en: 'Executive Desk+2x4K',fr:'Bureau Pro + Écrans',w: 165, d: 80,  h: 118,z: 0,   price: 980,  color: '#8c6643', role: 'wood' },
    { id: 'desk',          cat: 'office',   en: 'Studio Desk',       fr: 'Bureau Studio',     w: 130, d: 65,  h: 76, z: 0,   price: 460,  color: '#a37b52', role: 'wood' },
    { id: 'office_chair',  cat: 'office',   en: 'Ergonomic Chair',   fr: 'Fauteuil Ergonom.', w: 66,  d: 66,  h: 118,z: 0,   price: 540,  color: '#2c3340', role: 'primary' },
    { id: 'bookshelf_office',cat:'office',  en: 'Office Shelving',   fr: 'Étagère Bureau',    w: 100, d: 35,  h: 205,z: 0,   price: 420,  color: '#343a46', role: 'metal' },
    { id: 'filing_cabinet',cat: 'office',   en: '3-Drawer Pedestal', fr: 'Caisson 3 Tiroirs', w: 46,  d: 58,  h: 72, z: 0,   price: 240,  color: '#3e4552', role: 'metal' },
    { id: 'meeting_table', cat: 'office',   en: 'Conference Table',  fr: 'Table Réunion',     w: 230, d: 105, h: 75, z: 0,   price: 1450, color: '#7a583b', role: 'wood' },
    { id: 'sofa_office',   cat: 'office',   en: 'Lounge Sofa',       fr: 'Canapé Accueil',    w: 175, d: 82,  h: 80, z: 0,   price: 980,  color: '#3d4c5c', role: 'primary' },

    // DINING (6)
    { id: 'dining_table',  cat: 'dining',   en: 'Oak Dining Table',  fr: 'Table Repas Chêne', w: 190, d: 95,  h: 76, z: 0,   price: 960,  color: '#9c734b', role: 'wood' },
    { id: 'round_dining',  cat: 'dining',   en: 'Round Pedestal Tbl',fr: 'Table Ronde 130',   w: 130, d: 130, h: 76, z: 0,   price: 820,  color: '#e8e2d8', role: 'accent' },
    { id: 'dining_chair',  cat: 'dining',   en: 'Upholstered Chair', fr: 'Chaise Velours',    w: 48,  d: 52,  h: 86, z: 0,   price: 185,  color: '#4e5d6c', role: 'primary' },
    { id: 'sideboard',     cat: 'dining',   en: 'Fluted Sideboard',  fr: 'Buffet Cannelé',    w: 175, d: 46,  h: 82, z: 0,   price: 840,  color: '#8f6947', role: 'wood' },
    { id: 'display_cabinet',cat:'dining',   en: 'Glass Vitrine',     fr: 'Vitrine Éclairée',  w: 95,  d: 42,  h: 205,z: 0,   price: 920,  color: '#2c323b', role: 'metal', emitsLight: true },
    { id: 'bar_cart',      cat: 'dining',   en: 'Brass Bar Cart',    fr: 'Chariot Bar Laiton',w: 72,  d: 42,  h: 84, z: 0,   price: 340,  color: '#c9a352', role: 'metal' },

    // LIGHTING & DECOR (8 — Usable in EVERY room!)
    { id: 'lamp',          cat: 'decor',    en: 'Arc Floor Lamp',    fr: 'Lampadaire Arc',    w: 44,  d: 44,  h: 185,z: 0,   price: 290,  color: '#c9a352', role: 'metal', emitsLight: true },
    { id: 'chandelier',    cat: 'decor',    en: 'Pendant Chandelier',fr: 'Suspension Design', w: 68,  d: 68,  h: 58, z: 205, price: 420,  color: '#c9a352', role: 'metal', isCeiling: true, emitsLight: true },
    { id: 'plant',         cat: 'decor',    en: 'Fiddle-Leaf Tree',  fr: 'Plante Ficus XL',   w: 52,  d: 52,  h: 155,z: 0,   price: 135,  color: '#3f6e49', role: 'plant' },
    { id: 'olive_tree',    cat: 'decor',    en: 'Potted Olive Tree', fr: 'Olivier en Pot',    w: 58,  d: 58,  h: 175,z: 0,   price: 185,  color: '#5a7352', role: 'plant' },
    { id: 'wall_art',      cat: 'decor',    en: 'Framed Gallery Art',fr: 'Tableau Encadré',   w: 110, d: 6,   h: 82, z: 125, price: 240,  color: '#c98a5b', role: 'accent', isWallMount: true },
    { id: 'wall_art_trio', cat: 'decor',    en: 'Triptych Wall Art', fr: 'Triptyque Mural',   w: 160, d: 6,   h: 72, z: 130, price: 360,  color: '#3d5a73', role: 'primary', isWallMount: true },
    { id: 'curtains',      cat: 'decor',    en: 'Sheer Drapes',      fr: 'Rideaux Voilage',   w: 180, d: 18,  h: 255,z: 0,   price: 280,  color: '#f2eee6', role: 'fabric', isWallMount: true },
    { id: 'rug_round',     cat: 'decor',    en: 'Round Jute Rug',    fr: 'Tapis Rond Jute',   w: 180, d: 180, h: 2,  z: 0,   price: 210,  color: '#d4bd9b', role: 'wood', isRug: true }
  ];

  function getCatalogItem(id) {
    return FURNITURE_CATALOG.find(item => item.id === id) || FURNITURE_CATALOG[0];
  }

  // =========================================================================
  // 5. ROTATED OBB COLLISIONS, ROOM CLAMPING & ERGONOMIC CLEARANCE CHECK
  // =========================================================================

  function getRotatedHalfExtents(w, d, rotDeg) {
    const rad = (Number(rotDeg) || 0) * DEG2RAD;
    const c = Math.abs(Math.cos(rad)), s = Math.abs(Math.sin(rad));
    return {
      hx: (w * c + d * s) * 0.5,
      hy: (w * s + d * c) * 0.5
    };
  }

  function getOBBCorners(item) {
    const rad = (Number(item.rot) || 0) * DEG2RAD;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const hw = item.w * 0.5, hd = item.d * 0.5;
    const pts = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]];
    return pts.map(([lx, ly]) => [
      item.x + lx * cos - ly * sin,
      item.y + lx * sin + ly * cos
    ]);
  }

  // Separating Axis Theorem (SAT) for exact rotated 2D OBB overlap!
  function itemsCollideOBB(a, b, marginCm = -1) {
    if (!a || !b || a.uid === b.uid) return false;
    const ca = getCatalogItem(a.id), cb = getCatalogItem(b.id);
    if (ca.isRug || cb.isRug || ca.isCeiling || cb.isCeiling) return false;
    // Vertical height clearance check (e.g. wall art above sofa never collides!)
    const aZ0 = a.z || 0, aZ1 = aZ0 + a.h;
    const bZ0 = b.z || 0, bZ1 = bZ0 + b.h;
    if (aZ1 <= bZ0 + 2 || bZ1 <= aZ0 + 2) return false;

    const cornersA = getOBBCorners(a);
    const cornersB = getOBBCorners(b);
    const axes = [];
    for (const c of [cornersA, cornersB]) {
      for (let i = 0; i < 2; i++) {
        const dx = c[i + 1][0] - c[i][0];
        const dy = c[i + 1][1] - c[i][1];
        const l = Math.hypot(dx, dy) || 1;
        axes.push([-dy / l, dx / l]);
      }
    }
    for (const [ax, ay] of axes) {
      let minA = Infinity, maxA = -Infinity;
      let minB = Infinity, maxB = -Infinity;
      for (const [x, y] of cornersA) { const p = x * ax + y * ay; if (p < minA) minA = p; if (p > maxA) maxA = p; }
      for (const [x, y] of cornersB) { const p = x * ax + y * ay; if (p < minB) minB = p; if (p > maxB) maxB = p; }
      if (maxA + marginCm <= minB || maxB + marginCm <= minA) return false;
    }
    return true;
  }

  function clampItemToRoom(item, room) {
    const geom = buildRoomGeometry(room);
    const { hx, hy } = getRotatedHalfExtents(item.w, item.d, item.rot);
    item.x = Math.max(hx + 2, Math.min(geom.W - hx - 2, item.x));
    item.y = Math.max(hy + 2, Math.min(geom.D - hy - 2, item.y));

    // If L-shape notch encroaches on item, gently push into main wing
    if (geom.shape === 'l_shape') {
      const cutX = Math.round(geom.W * 0.58);
      const cutY = Math.round(geom.D * 0.42);
      if (item.x + hx > cutX - 2 && item.y - hy < cutY + 2) {
        const pushLeft = (item.x + hx) - (cutX - 2);
        const pushDown = (cutY + 2) - (item.y - hy);
        if (pushLeft < pushDown) item.x = Math.max(hx + 2, cutX - hx - 4);
        else item.y = Math.min(geom.D - hy - 2, cutY + hy + 4);
      }
    } else if (geom.shape === 'alcove') {
      const alX = Math.round(geom.W * 0.72);
      const alY1 = Math.round(geom.D * 0.28);
      const alY2 = Math.round(geom.D * 0.72);
      if (item.x + hx > alX - 2 && item.y + hy > alY1 + 2 && item.y - hy < alY2 - 2) {
        item.x = Math.max(hx + 2, alX - hx - 4);
      }
    }
    return item;
  }

  // Ergonomic Walkway & Door Clearance Audit!
  function analyzeErgonomics(state) {
    const collisions = new Set();
    const tightPairs = [];
    const items = state.furniture || [];
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        if (itemsCollideOBB(items[i], items[j], -1)) {
          collisions.add(items[i].uid);
          collisions.add(items[j].uid);
        } else {
          // Check tight walkway (< 55 cm between non-paired major pieces)
          const ca = getCatalogItem(items[i].id), cb = getCatalogItem(items[j].id);
          const isAccentDecor = c => c.isRug || c.isWallMount || c.isCeiling || c.id === 'lamp' || c.id === 'plant' || c.id === 'olive_tree' || c.id === 'side_table';
          if (!isAccentDecor(ca) && !isAccentDecor(cb)) {
            const pairExempt = (a, b) =>
              (a.includes('sofa') && (b.includes('coffee') || b.includes('side') || b.includes('ottoman'))) ||
              (a.includes('table') && b.includes('chair')) ||
              (a.includes('desk') && (b.includes('chair') || b.includes('filing'))) ||
              (a.includes('bed') && (b.includes('nightstand') || b.includes('bench'))) ||
              (a.includes('island') && b.includes('bar_stool'));
            if (!pairExempt(items[i].id, items[j].id) && !pairExempt(items[j].id, items[i].id)) {
              if (itemsCollideOBB(items[i], items[j], 45)) {
                tightPairs.push([items[i], items[j]]);
              }
            }
          }
        }
      }
    }
    return { collisions, tightPairs };
  }

  // =========================================================================
  // 6. ZERO-COLLISION ERGONOMIC AUTO-LAYOUT ENGINE (6 ROOMS × 4 SHAPES × 6 STYLES!)
  // =========================================================================

  let _uidSeq = 1;
  function makeUid(prefix = 'f') { return `${prefix}_${_uidSeq++}_${Math.floor(Math.random() * 9999)}`; }

  function pickStyleColor(catItem, styleObj) {
    if (!styleObj || !styleObj.palette) return catItem.color;
    if (catItem.role === 'plant') return catItem.color;
    return styleObj.palette[catItem.role] || catItem.color;
  }

  function createPlacedItem(id, x, y, rot, styleObj, overrides = {}) {
    const def = getCatalogItem(id);
    return {
      uid: makeUid('item'),
      id: def.id,
      x: Math.round(x),
      y: Math.round(y),
      z: overrides.z !== undefined ? overrides.z : (def.z || 0),
      w: overrides.w || def.w,
      d: overrides.d || def.d,
      h: overrides.h || def.h,
      rot: ((rot || 0) % 360 + 360) % 360,
      color: overrides.color || pickStyleColor(def, styleObj),
      price: overrides.price !== undefined ? overrides.price : def.price
    };
  }

  function generateFullRoom(opts = {}) {
    const type = opts.type || 'living';
    const typeMeta = ROOM_TYPES.find(r => r.id === type) || ROOM_TYPES[0];
    const shape = opts.shape || 'rect';
    const styleId = DESIGN_STYLES[opts.style] ? opts.style : 'modern';
    const st = DESIGN_STYLES[styleId];

    const W = Math.max(240, Math.min(1200, Number(opts.w) || typeMeta.defW));
    const D = Math.max(220, Math.min(1000, Number(opts.d) || typeMeta.defD));
    const H = Math.max(220, Math.min(450, Number(opts.h) || typeMeta.defH));

    // Accent Wall #0 (North wall behind hero furniture!)
    const wallStyles = {
      w0: { material: st.accentMaterial, color: st.accentColor }
    };

    const room = {
      type, shape, style: styleId,
      w: W, d: D, h: H,
      floorMaterial: st.floorMaterial,
      floorColor: st.floorColor,
      wallMaterial: st.wallMaterial,
      wallColor: st.wallColor,
      accentMaterial: st.accentMaterial,
      accentColor: st.accentColor,
      ceilingColor: st.ceilingColor,
      wallStyles
    };

    const geom = buildRoomGeometry(room);
    // Safe main bounding box inside L-shape / Alcove / Loft so NOTHING ever clips or collides!
    const safeW = shape === 'l_shape' ? Math.round(W * 0.56) : (shape === 'alcove' ? Math.round(W * 0.70) : (shape === 'loft' ? Math.round(W * 0.58) : W));
    const safeCX = Math.round(safeW * 0.5);
    const cy = Math.round(D * 0.5);

    // Architectural Doors & Daylight Windows placed cleanly on perimeter walls!
    const westWall = geom.walls.find(w => !w.isPartition && w.nx > 0.5) || geom.walls[geom.walls.length - 1];
    const southWall = geom.walls.find(w => !w.isPartition && w.ny < -0.5) || geom.walls[2];
    const eastWall = geom.walls.find(w => !w.isPartition && w.nx < -0.5 && w.len >= 160);

    const doors = [
      {
        uid: makeUid('door'),
        wallId: southWall.id,
        offset: Math.max(25, Math.min(southWall.len - 115, Math.round(southWall.len * 0.14))),
        w: 88, h: 210, style: 'single', swing: 'inward', hinge: 'left', color: st.palette.wood
      }
    ];

    const windows = [];
    if (westWall && westWall.len >= 150) {
      const winW = Math.min(180, Math.round(westWall.len * 0.44));
      windows.push({
        uid: makeUid('win'),
        wallId: westWall.id,
        offset: Math.round((westWall.len - winW) * 0.5),
        w: winW, h: 145, sill: 82, style: 'double', color: '#2b303a'
      });
    }
    if (eastWall && eastWall.len >= 220 && shape !== 'alcove') {
      const winW = Math.min(150, Math.round(eastWall.len * 0.38));
      windows.push({
        uid: makeUid('win'),
        wallId: eastWall.id,
        offset: Math.round((eastWall.len - winW) * 0.5),
        w: winW, h: 145, sill: 82, style: 'double', color: '#2b303a'
      });
    }

    const furniture = [];
    const tryAdd = (id, x, y, rot, ov = {}) => {
      const item = createPlacedItem(id, x, y, rot, st, ov);
      clampItemToRoom(item, room);
      const hasConflict = furniture.some(other => itemsCollideOBB(item, other, 2));
      if (!hasConflict) furniture.push(item);
      return !hasConflict ? item : null;
    };

    if (type === 'living') {
      // Cozy ergonomic living composition: Sofa facing TV Console, Coffee Table centered 48 cm clear, Rug under!
      const sofaW = Math.min(220, safeW - 110);
      const sofaY = 58;
      tryAdd('rug', safeCX, Math.min(D - 110, sofaY + 115), 0, { w: Math.min(250, safeW - 60), d: Math.min(180, D - 140) });
      tryAdd('sofa', safeCX, sofaY, 0, { w: sofaW });
      tryAdd('wall_art_trio', safeCX, 6, 0, { z: 132 });
      tryAdd('coffee_table', safeCX, sofaY + 115, 0, { w: Math.min(120, sofaW - 50) });
      tryAdd('tv_stand', safeCX, D - 32, 180, { w: Math.min(180, safeW - 110) });
      tryAdd('lamp', safeCX + sofaW * 0.5 + 34, 48, 0);
      tryAdd('plant', Math.max(40, safeCX - sofaW * 0.5 - 38), 46, 0);
      if (W - safeW >= 140) {
        // Extra reading nook in L-shape / Loft wing!
        tryAdd('armchair', W - 75, D - 85, 225);
        tryAdd('bookshelf', W - 70, D - 24, 180, { w: 100 });
      } else if (safeW >= 480) {
        tryAdd('armchair', safeW - 64, sofaY + 115, 270);
      }
      tryAdd('chandelier', safeCX, sofaY + 115, 0, { z: H - 62 });
    } else if (type === 'bedroom') {
      const bedId = safeW >= 380 ? 'bed_double' : 'bed_single';
      const bedDef = getCatalogItem(bedId);
      const bedY = Math.round(bedDef.d * 0.5) + 10;
      tryAdd('rug', safeCX, bedY + 40, 0, { w: Math.min(250, safeW - 50), d: Math.min(180, D - 90) });
      tryAdd(bedId, safeCX, bedY, 0);
      tryAdd('wall_art', safeCX, 6, 0, { z: 138 });
      tryAdd('nightstand', safeCX - bedDef.w * 0.5 - 34, 30, 0);
      tryAdd('nightstand', safeCX + bedDef.w * 0.5 + 34, 30, 0);
      tryAdd('wardrobe', safeW - 40, D - 125, 270, { w: Math.min(180, D - 110) });
      tryAdd('dresser', 78, D - 34, 180, { w: Math.min(115, safeW * 0.35) });
      tryAdd('plant', 42, 42, 0);
      tryAdd('chandelier', safeCX, cy, 0, { z: H - 62 });
    } else if (type === 'kitchen') {
      const cntW = Math.max(120, Math.min(240, safeW - 95));
      tryAdd('kitchen_counter', 10 + cntW * 0.5, 36, 0, { w: cntW });
      tryAdd('fridge', safeW - 48, 44, 0, { w: Math.min(80, safeW - cntW - 22) });
      tryAdd('stove', 42, 138, 90);
      if (D >= 320 && safeW >= 320) {
        tryAdd('island', safeCX + 20, Math.round(D * 0.58), 0, { w: Math.min(165, safeW - 140) });
        tryAdd('bar_stool', safeCX - 15, Math.round(D * 0.58) + 68, 180);
        tryAdd('bar_stool', safeCX + 55, Math.round(D * 0.58) + 68, 180);
      } else {
        tryAdd('kitchen_table', W - 82, D - 70, 0, { w: 110, d: 74 });
        tryAdd('kitchen_chair', W - 82, D - 126, 0);
      }
      tryAdd('chandelier', safeCX, Math.round(D * 0.55), 0, { z: H - 62 });
    } else if (type === 'bathroom') {
      if (safeW >= 270) {
        tryAdd('bathtub', 94, 46, 0, { w: Math.min(168, safeW - 120) });
        tryAdd('shower', safeW - 56, 54, 0, { w: 96, d: 92 });
        tryAdd('double_sink', safeCX, D - 34, 180, { w: Math.min(130, safeW - 110) });
      } else {
        tryAdd('shower', 54, 52, 0, { w: 92, d: 90 });
        tryAdd('sink', safeCX, D - 32, 180, { w: 80 });
        tryAdd('bathtub', W - 84, D - 46, 0, { w: 135, d: 72 });
      }
      tryAdd('toilet', 38, Math.round(D * 0.62), 90);
      tryAdd('towel_rack', safeW - 10, Math.round(D * 0.62), 270);
      tryAdd('plant', safeW - 32, D - 32, 0, { w: 36, d: 36, h: 105 });
    } else if (type === 'office') {
      tryAdd('rug', safeCX, cy, 0, { w: Math.min(220, safeW - 60), d: Math.min(160, D - 100) });
      tryAdd('office_desk', safeCX, 62, 0, { w: Math.min(160, safeW - 110) });
      tryAdd('office_chair', safeCX, 136, 180);
      tryAdd('bookshelf_office', safeW - 60, 26, 0, { w: 96 });
      tryAdd('filing_cabinet', Math.max(36, safeCX - 108), 44, 0);
      tryAdd('plant', 42, 42, 0);
      tryAdd('sofa_office', safeCX + 20, D - 52, 180, { w: Math.min(165, safeW - 130) });
      tryAdd('lamp', safeW - 38, D - 46, 0);
      tryAdd('wall_art', safeCX, 6, 0, { z: 135 });
    } else if (type === 'dining') {
      const tblW = Math.min(190, safeW - 130);
      tryAdd('rug', safeCX, cy, 0, { w: Math.min(260, safeW - 60), d: Math.min(190, D - 90) });
      tryAdd('dining_table', safeCX, cy, 0, { w: tblW });
      const chOff = Math.round(tblW * 0.28);
      tryAdd('dining_chair', safeCX - chOff, cy - 72, 0);
      tryAdd('dining_chair', safeCX + chOff, cy - 72, 0);
      tryAdd('dining_chair', safeCX - chOff, cy + 72, 180);
      tryAdd('dining_chair', safeCX + chOff, cy + 72, 180);
      tryAdd('sideboard', safeCX, 28, 0, { w: Math.min(170, safeW - 120) });
      tryAdd('wall_art_trio', safeCX, 6, 0, { z: 132 });
      tryAdd('olive_tree', safeW - 44, 46, 0);
      tryAdd('chandelier', safeCX, cy, 0, { z: H - 62 });
    }

    return {
      format: 'studios-pro-design-v4',
      room,
      doors,
      windows,
      furniture,
      lighting: {
        timeOfDay: st.timeOfDay,
        ambient: st.ambient,
        lampsOn: true,
        preset: st.timeOfDay >= 16.5 ? 'sunset' : 'day'
      },
      budgetLimit: 8500,
      currency: 'EUR'
    };
  }

  function applyDesignStyleToState(state, styleId) {
    const st = DESIGN_STYLES[styleId];
    if (!st || !state || !state.room) return state;
    state.room.style = styleId;
    state.room.floorMaterial = st.floorMaterial;
    state.room.floorColor = st.floorColor;
    state.room.wallMaterial = st.wallMaterial;
    state.room.wallColor = st.wallColor;
    state.room.accentMaterial = st.accentMaterial;
    state.room.accentColor = st.accentColor;
    state.room.ceilingColor = st.ceilingColor;
    if (!state.room.wallStyles) state.room.wallStyles = {};
    state.room.wallStyles.w0 = { material: st.accentMaterial, color: st.accentColor };
    state.lighting.timeOfDay = st.timeOfDay;
    state.lighting.ambient = st.ambient;
    state.furniture.forEach(item => {
      const def = getCatalogItem(item.id);
      if (def.role !== 'plant') item.color = pickStyleColor(def, st);
    });
    return st;
  }

  // Natural-Language AI Room Prompt Parser (EN & FR!)
  function parseRoomPrompt(promptText) {
    const q = String(promptText || '').toLowerCase();
    let type = 'living';
    if (/bed|chambre|sleep|master|suite/.test(q)) type = 'bedroom';
    else if (/kitchen|cuisine|cook|îlot|island/.test(q)) type = 'kitchen';
    else if (/bath|salle de bain|douche|shower|spa|tub/.test(q)) type = 'bathroom';
    else if (/office|bureau|work|studio desk|télétravail/.test(q)) type = 'office';
    else if (/dining|manger|repas|restaurant/.test(q)) type = 'dining';

    let style = 'modern';
    if (/scand|nordic|nordique|oak|chêne/.test(q)) style = 'scandinavian';
    else if (/lux|paris|marble|marbre|gold|doré|classic|classiq/.test(q)) style = 'luxury';
    else if (/japan|zen|wabi|minimal|bois/.test(q)) style = 'japandi';
    else if (/industr|loft|brick|brique|béton|concrete/.test(q)) style = 'industrial';
    else if (/mediter|villa|terracotta|soleil|warm|chaud/.test(q)) style = 'mediterranean';

    let shape = 'rect';
    if (/l-shape|forme l|en l/.test(q)) shape = 'l_shape';
    else if (/loft|open|cloison|partition/.test(q)) shape = 'loft';
    else if (/alcov|niche/.test(q)) shape = 'alcove';

    let w = null, d = null;
    const dimM = q.match(/(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)/);
    if (dimM) {
      let a = parseFloat(dimM[1].replace(',', '.'));
      let b = parseFloat(dimM[2].replace(',', '.'));
      if (a <= 20) a *= 100;
      if (b <= 20) b *= 100;
      w = Math.round(Math.max(240, Math.min(1200, a)));
      d = Math.round(Math.max(220, Math.min(1000, b)));
    }

    return { type, style, shape, w, d };
  }

  // =========================================================================
  // 7. REAL ARCHITECTURAL RENOVATION + FURNITURE DEVIS (m² + ml + Units!)
  // =========================================================================

  function computeDevis(state) {
    const geom = buildRoomGeometry(state.room);
    const floorMat = FLOOR_MATERIALS.find(m => m.id === state.room.floorMaterial) || FLOOR_MATERIALS[0];
    const wallMat = WALL_MATERIALS.find(m => m.id === state.room.wallMaterial) || WALL_MATERIALS[0];
    const accentMat = WALL_MATERIALS.find(m => m.id === state.room.accentMaterial) || WALL_MATERIALS[0];

    const openingsAreaM2 =
      (state.doors || []).reduce((acc, d) => acc + (d.w * d.h) / 10000, 0) +
      (state.windows || []).reduce((acc, w) => acc + (w.w * w.h) / 10000, 0);

    let mainWallM2 = 0, accentWallM2 = 0;
    geom.walls.forEach(w => {
      const m2 = (w.len * geom.H) / 10000;
      if (w.material === state.room.accentMaterial && w.id === 'w0') accentWallM2 += m2;
      else mainWallM2 += m2;
    });
    mainWallM2 = Math.max(0, mainWallM2 - openingsAreaM2);

    const floorOrderM2 = geom.areaM2 * 1.10; // 10% real architectural waste allowance!
    const doorWidthM = (state.doors || []).reduce((acc, d) => acc + d.w / 100, 0);
    const baseboardM = Math.max(0, geom.perimeterM - doorWidthM);

    const floorCost = Math.round(floorOrderM2 * floorMat.priceM2);
    const mainWallCost = Math.round(mainWallM2 * wallMat.priceM2);
    const accentWallCost = Math.round(accentWallM2 * accentMat.priceM2);
    const baseboardCost = Math.round(baseboardM * 16);
    const doorsCost = (state.doors || []).length * 380;
    const windowsCost = (state.windows || []).length * 620;

    const materialsSubtotal = floorCost + mainWallCost + accentWallCost + baseboardCost + doorsCost + windowsCost;
    const furnitureSubtotal = (state.furniture || []).reduce((acc, f) => acc + (Number(f.price) || 0), 0);
    const grandTotal = materialsSubtotal + furnitureSubtotal;

    return {
      areaM2: geom.areaM2,
      floorOrderM2,
      mainWallM2,
      accentWallM2,
      baseboardM,
      lines: [
        { key: 'floor',    en: `Flooring (${floorMat.en}, +10%)`, fr: `Sol (${floorMat.fr}, +10%)`, qty: `${floorOrderM2.toFixed(1)} m²`, cost: floorCost },
        { key: 'walls',    en: `Walls (${wallMat.en})`,           fr: `Murs (${wallMat.fr})`,       qty: `${mainWallM2.toFixed(1)} m²`,   cost: mainWallCost },
        ...(accentWallM2 > 0 ? [{ key: 'accent', en: `Accent Wall (${accentMat.en})`, fr: `Mur Accent (${accentMat.fr})`, qty: `${accentWallM2.toFixed(1)} m²`, cost: accentWallCost }] : []),
        { key: 'trim',     en: 'Baseboards & Trim',               fr: 'Plinthes & Finitions',       qty: `${baseboardM.toFixed(1)} ml`,   cost: baseboardCost },
        ...(doorsCost > 0 ? [{ key: 'doors', en: 'Interior Doors', fr: 'Portes Intérieures', qty: `${state.doors.length} u`, cost: doorsCost }] : []),
        ...(windowsCost > 0 ? [{ key: 'windows', en: 'Architectural Windows', fr: 'Fenêtres Double Vitr.', qty: `${state.windows.length} u`, cost: windowsCost }] : [])
      ],
      materialsSubtotal,
      furnitureSubtotal,
      grandTotal
    };
  }

  // =========================================================================
  // 8. COMPLETE 100% BILINGUAL FR / EN DICTIONARY (Zero Raw Keys, Zero Mojibake!)
  // =========================================================================

  const I18N = {
    fr: {
      back: 'Retour',
      appTitle: 'Design Pro Studio',
      newProj: 'Nouveau',
      saveProj: 'Sauver',
      loadProj: 'Ouvrir',
      arView: 'Vue AR 1:1',
      exportBtn: 'Exporter',
      wizTitle: 'Créez votre Espace Architectural',
      wizSub: 'Configurez la géométrie, les dimensions réelles et le style décoratif',
      wizRoomType: 'Type de pièce',
      wizShape: 'Forme de la pièce',
      wizDims: 'Dimensions réelles',
      wizStyle: 'Style architectural (appliqué en 1 clic)',
      wizStart: 'Créer l’espace 3D photoréaliste',
      tabRoom: 'Pièce & IA',
      tabFurn: 'Mobilier (58)',
      tabArch: 'Murs & Ouv.',
      tabDesign: 'Matériaux',
      tabDevis: 'Devis m²',
      viewSplit: 'Split',
      view2D: 'Plan 2D',
      view3D: 'Vue 3D',
      camPersp: 'Maison',
      camCorner: 'Intérieur',
      camWalk: 'Visite 1P',
      camTop: 'Plan 3D',
      snap: 'Grille',
      dims: 'Cotes',
      ergo: 'Ergonomie',
      ceiling: 'Plafond',
      toolSelect: 'Sélection',
      toolRuler: 'Mesurer',
      addDoor: '+ Porte',
      addWindow: '+ Fenêtre',
      aiPromptLbl: 'Designer IA (Prompt)',
      aiPromptPh: 'ex: "salon luxe marbre 6x4" ou "chambre scandinave"',
      aiRestyle: 'Réaménager sans collision',
      floorMat: 'Revêtement Sol',
      wallMat: 'Murs Principaux',
      accentMat: 'Mur d’Accent (Nord)',
      lighting: 'Soleil & Éclairage',
      timeLbl: 'Heure solaire',
      ambientLbl: 'Lumière ambiante',
      lampsLbl: 'Lampes intérieures',
      envDay: 'Jour',
      envSunset: 'Coucher',
      envBlue: 'Crépuscule',
      envNight: 'Soirée',
      selEmpty: 'Cliquez sur un meuble, une porte ou une fenêtre en 2D ou 3D',
      expTitle: 'Exporter Plans, Rendu 2K, PDF, 3D & AR 1:1',
      expPng3d: 'Rendu 3D Photoréaliste 2K (.PNG)',
      expPng3dDesc: 'Image HD 1920×1080 sans interface ni bandes noires',
      expPdf: 'Dossier Client Complet (.PDF)',
      expPdfDesc: 'Rendu 3D + Plan 2D coté + Devis travaux & mobilier',
      expSvg: 'Plan Architectural CAD (.SVG)',
      expSvgDesc: 'Vectoriel complet : murs, portes, fenêtres, cotes & cartouche',
      expGlb: 'Modèle 3D PBR 1:1 (.GLB)',
      expGlbDesc: 'Échelle réelle en mètres, textures PBR incluses',
      expStlObj: 'Export 3D Impression / CAO (.STL / .OBJ)',
      expStlObjDesc: 'Géométrie propre à l’échelle réelle',
      expAr: 'Visite Réalité Augmentée 1:1 (AR)',
      expArDesc: 'Ouvre votre pièce à taille réelle dans Studios-Pro AR',
      expCsv: 'Devis Tableur Excel (.CSV)',
      expCsvDesc: 'Matériaux m² + mobilier chiffré (UTF-8 Excel)',
      expSaveFree: 'Sauver Projet (.spdesign GRATUIT)',
      expSaveFreeDesc: 'Sauvegarde locale complète modifiable à tout moment'
    },
    en: {
      back: 'Back',
      appTitle: 'Design Pro Studio',
      newProj: 'New',
      saveProj: 'Save',
      loadProj: 'Load',
      arView: 'AR View 1:1',
      exportBtn: 'Export',
      wizTitle: 'Design Your Architectural Space',
      wizSub: 'Configure room shape, exact real-world dimensions and curated interior style',
      wizRoomType: 'Room Type',
      wizShape: 'Room Shape',
      wizDims: 'Real Dimensions',
      wizStyle: 'Curated Interior Style (Applied Instantly)',
      wizStart: 'Launch Photorealistic 3D Studio',
      tabRoom: 'Room & AI',
      tabFurn: 'Catalog (58)',
      tabArch: 'Openings',
      tabDesign: 'Materials',
      tabDevis: 'Quote m²',
      viewSplit: 'Split',
      view2D: '2D CAD',
      view3D: '3D View',
      camPersp: 'Dollhouse',
      camCorner: 'Interior',
      camWalk: 'Walk 1P',
      camTop: '3D Plan',
      snap: 'Snap',
      dims: 'Dims',
      ergo: 'Ergonomics',
      ceiling: 'Ceiling',
      toolSelect: 'Select',
      toolRuler: 'Measure',
      addDoor: '+ Door',
      addWindow: '+ Window',
      aiPromptLbl: 'AI Interior Designer',
      aiPromptPh: 'e.g. "luxury marble living 6x4" or "scandinavian bedroom"',
      aiRestyle: 'Auto-Arrange Collision-Free',
      floorMat: 'Flooring Finish',
      wallMat: 'Main Walls',
      accentMat: 'Accent Wall (North)',
      lighting: 'Sun & Practical Lighting',
      timeLbl: 'Solar Time',
      ambientLbl: 'Ambient Fill',
      lampsLbl: 'Interior Lamps',
      envDay: 'Daylight',
      envSunset: 'Golden Hr',
      envBlue: 'Twilight',
      envNight: 'Evening',
      selEmpty: 'Click any furniture piece, door, or window in 2D or 3D',
      expTitle: 'Export 2K Render, Client PDF, CAD SVG, 3D & 1:1 AR',
      expPng3d: 'Photorealistic 2K 3D Render (.PNG)',
      expPng3dDesc: 'Clean 1920×1080 HD render with zero letterboxing',
      expPdf: 'Client Presentation Dossier (.PDF)',
      expPdfDesc: '3D Render + Dimensioned 2D Blueprint + m² Quote',
      expSvg: 'Architectural 2D Blueprint (.SVG)',
      expSvgDesc: 'Vector walls, doors with swing arcs, ALL windows & title block',
      expGlb: 'Real-Scale PBR 3D Model (.GLB)',
      expGlbDesc: 'True 1:1 meter scale with PBR materials',
      expStlObj: 'CAD / 3D Print Mesh (.STL / .OBJ)',
      expStlObjDesc: 'Clean architectural geometry at real scale',
      expAr: '1:1 Real-Scale AR Walkthrough',
      expArDesc: 'Opens your room at true scale in Studios-Pro AR Viewer',
      expCsv: 'Itemized Quote Spreadsheet (.CSV)',
      expCsvDesc: 'Renovation m² materials + furniture BOM (UTF-8 Excel)',
      expSaveFree: 'Save Project (.spdesign FREE)',
      expSaveFreeDesc: 'Full local backup editable anytime without limits'
    }
  };

  function getT(lang) { return I18N[lang === 'en' ? 'en' : 'fr']; }

  const DesignCore = {
    WALL_THICKNESS_CM, ROOM_SHAPES, ROOM_TYPES, DESIGN_STYLES,
    FLOOR_MATERIALS, WALL_MATERIALS, CATALOG_CATEGORIES, FURNITURE_CATALOG, I18N,
    fmtLen, fmtMeters, fmtArea, fmtMoney, getT,
    buildRoomGeometry, pointInPoly, getCatalogItem, getRotatedHalfExtents, getOBBCorners,
    itemsCollideOBB, clampItemToRoom, analyzeErgonomics,
    makeUid, createPlacedItem, generateFullRoom, applyDesignStyleToState, parseRoomPrompt, computeDevis
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = DesignCore;
  if (globalScope) globalScope.DesignCore = DesignCore;
})(typeof window !== 'undefined' ? window : globalThis);
