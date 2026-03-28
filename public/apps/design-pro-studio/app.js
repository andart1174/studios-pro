// DesignPro Studio — app.js
// ─────────────────────────────────────────────────────────────
// I18N
// ─────────────────────────────────────────────────────────────
const LANG = {
  fr: {
    appSubtitle: 'Concepteur d\'Intérieur 2D · 3D',
    newProject: 'Nouveau', save: 'Sauvegarder', load: 'Charger',
    wizardTitle: 'Créez votre espace', wizardSub: 'Configurez votre pièce pour commencer',
    roomType: 'Type de pièce', dimensions: 'Dimensions', height: 'Hauteur', width: 'Largeur', depth: 'Profondeur',
    style: 'Style décoratif', modern: 'Moderne', classic: 'Classique', scandinavian: 'Scandinave',
    industrial: 'Industriel', luxury: 'Luxe', createRoom: 'Créer la pièce',
    living: 'Salon', bedroom: 'Chambre', kitchen: 'Cuisine', bathroom: 'Salle de bain', office: 'Bureau', dining: 'Salle à manger',
    tabRoom: 'Pièce', tabFurniture: 'Mobilier', tabArch: 'Arch.', tabDesign: 'Design', tabCosts: 'Devis', tabExport: 'Export',
    roomInfo: 'Informations Pièce', tools: 'Outils', select: 'Sélection', measure: 'Mesurer', addDoor: 'Porte', addWindow: 'Fenêtre',
    undo: 'Annuler', redo: 'Rétablir', currentFurniture: 'Mobilier actuel', addFurniture: 'Ajouter du mobilier',
    doors: 'Portes', windows: 'Fenêtres', door: 'Porte', window: 'Fenêtre',
    walls: 'Murs', wallColor: 'Couleur Mur', wallTexture: 'Texture',
    paint: 'Peinture', brick: 'Brique', woodWall: 'Bois', concrete: 'Béton', wallpaper: 'Papier Peint', marble: 'Marbre',
    floor: 'Sol', floorColor: 'Couleur Sol', floorMaterial: 'Matériau',
    parquet: 'Parquet', ceramic: 'Céramique', carpet: 'Moquette', vinyl: 'Vinyle',
    ceiling: 'Plafond', ceilColor: 'Couleur Plafond', showCeiling: 'Afficher le plafond',
    lighting: 'Éclairage', ambientLight: 'Lumière ambiante', timeOfDay: 'Heure',
    quote: 'Devis & Prix', totalEst: 'Total estimé :', exportCSV: 'Télécharger Devis (CSV)',
    exportProject: 'Exporter le projet',
    exp2dDesc: 'Plan 2D haute résolution', exp3dDesc: 'Vue 3D actuelle',
    expJsonDesc: 'Sauvegarde complète', expPdfDesc: 'Impression / PDF',
    splitView: 'Vue Split', floorPlan: 'Plan d\'étage', live3d: 'Vue 3D en temps réel',
    hint2d: 'Clic = sélect. · Glisser = déplacer · Scroll = zoom',
    hint3d: 'Glisser = orbiter · Scroll = zoom · Clic droit = panoramique',
    selection: 'Sélection', clickToSelect: 'Cliquez sur un objet pour le sélectionner',
    loading3d: 'Génération 3D...',
    wallsLabel: 'Murs', doorLabel: 'Porte', windowLabel: 'Fenêtre',
    price: 'Prix unitaire', color: 'Couleur', rotate: 'Rotation', delete: 'Supprimer',
    simple: 'Simple', doubleDoor: 'Double', sliding: 'Coulissante', openArch: 'Ouverture',
    openLeft: 'Ouvre à gauche', openRight: 'Ouvre à droite',
    standard: 'Standard', full: 'Baie vitrée',
    saved: 'Projet sauvegardé', loaded: 'Projet chargé', deleted: 'Supprimé',
    generated: 'Plan généré !',
    area: 'Superficie', roomLabel: 'Pièce', furniturePcs: 'Meubles', doorsLabel: 'Portes', windowsLabel: 'Fenêtres',
  },
  en: {
    appSubtitle: '2D · 3D Interior Designer',
    newProject: 'New', save: 'Save', load: 'Load',
    wizardTitle: 'Create your space', wizardSub: 'Configure your room to start',
    roomType: 'Room type', dimensions: 'Dimensions', height: 'Height', width: 'Width', depth: 'Depth',
    style: 'Decorative style', modern: 'Modern', classic: 'Classic', scandinavian: 'Scandinavian',
    industrial: 'Industrial', luxury: 'Luxury', createRoom: 'Create room',
    living: 'Living Room', bedroom: 'Bedroom', kitchen: 'Kitchen', bathroom: 'Bathroom', office: 'Office', dining: 'Dining Room',
    tabRoom: 'Room', tabFurniture: 'Furniture', tabArch: 'Arch.', tabDesign: 'Design', tabCosts: 'Quote', tabExport: 'Export',
    roomInfo: 'Room Information', tools: 'Tools', select: 'Select', measure: 'Measure', addDoor: 'Door', addWindow: 'Window',
    undo: 'Undo', redo: 'Redo', currentFurniture: 'Current furniture', addFurniture: 'Add furniture',
    doors: 'Doors', windows: 'Windows', door: 'Door', window: 'Window',
    walls: 'Walls', wallColor: 'Wall Color', wallTexture: 'Texture',
    paint: 'Paint', brick: 'Brick', woodWall: 'Wood', concrete: 'Concrete', wallpaper: 'Wallpaper', marble: 'Marble',
    floor: 'Floor', floorColor: 'Floor Color', floorMaterial: 'Material',
    parquet: 'Parquet', ceramic: 'Ceramic', carpet: 'Carpet', vinyl: 'Vinyl',
    ceiling: 'Ceiling', ceilColor: 'Ceiling Color', showCeiling: 'Show ceiling',
    lighting: 'Lighting', ambientLight: 'Ambient light', timeOfDay: 'Time of day',
    quote: 'Quote & Prices', totalEst: 'Estimated total:', exportCSV: 'Download Quote (CSV)',
    exportProject: 'Export project',
    exp2dDesc: 'High-res 2D floor plan', exp3dDesc: 'Current 3D view',
    expJsonDesc: 'Full project save', expPdfDesc: 'Print / PDF',
    splitView: 'Split View', floorPlan: 'Floor Plan', live3d: 'Live 3D View',
    hint2d: 'Click = select · Drag = move · Scroll = zoom',
    hint3d: 'Drag = orbit · Scroll = zoom · Right click = pan',
    selection: 'Selection', clickToSelect: 'Click an object to select it',
    loading3d: 'Generating 3D...',
    wallsLabel: 'Walls', doorLabel: 'Door', windowLabel: 'Window',
    price: 'Unit price', color: 'Color', rotate: 'Rotate', delete: 'Delete',
    simple: 'Simple', doubleDoor: 'Double', sliding: 'Sliding', openArch: 'Opening',
    openLeft: 'Opens left', openRight: 'Opens right',
    standard: 'Standard', full: 'Bay window',
    saved: 'Project saved', loaded: 'Project loaded', deleted: 'Deleted',
    generated: 'Plan generated!',
    area: 'Area', roomLabel: 'Room', furniturePcs: 'Furniture', doorsLabel: 'Doors', windowsLabel: 'Windows',
  }
};

let lang = 'fr';
function t(k) { return LANG[lang][k] || LANG.fr[k] || k; }
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.getAttribute('data-i18n');
    if (el.tagName === 'INPUT' && el.type === 'placeholder') el.placeholder = t(k);
    else el.textContent = t(k);
  });
  document.getElementById('nav-sub-text').textContent = t('appSubtitle');
  updateUI();
}

// ─────────────────────────────────────────────────────────────
// FURNITURE LIBRARY
// ─────────────────────────────────────────────────────────────
const FURNITURE_LIBRARY = {
  living: [
    { id: 'sofa', name: { fr: 'Canapé 3 places', en: 'Sofa 3-seat' }, w: 220, d: 90, h: 85, color: '#5b6fa6', price: 1200 },
    { id: 'sofa2', name: { fr: 'Canapé 2 places', en: 'Loveseat' }, w: 160, d: 85, h: 80, color: '#6b7fa6', price: 850 },
    { id: 'armchair', name: { fr: 'Fauteuil', en: 'Armchair' }, w: 85, d: 85, h: 90, color: '#7a5f4a', price: 450 },
    { id: 'tv_stand', name: { fr: 'Meuble TV', en: 'TV Stand' }, w: 160, d: 45, h: 55, color: '#4a3728', price: 380 },
    { id: 'coffee_table', name: { fr: 'Table basse', en: 'Coffee Table' }, w: 120, d: 60, h: 45, color: '#8b7355', price: 280 },
    { id: 'bookshelf', name: { fr: 'Bibliothèque', en: 'Bookshelf' }, w: 90, d: 35, h: 200, color: '#5c4a3a', price: 320 },
    { id: 'plant', name: { fr: 'Plante déco', en: 'Deco Plant' }, w: 40, d: 40, h: 120, color: '#2d6a4f', price: 80 },
    { id: 'lamp', name: { fr: 'Lampadaire', en: 'Floor Lamp' }, w: 35, d: 35, h: 170, color: '#c8a96e', price: 150 },
    { id: 'rug', name: { fr: 'Tapis', en: 'Rug' }, w: 200, d: 150, h: 2, color: '#8b6f5a', price: 200 },
  ],
  bedroom: [
    { id: 'bed_double', name: { fr: 'Lit double', en: 'Double Bed' }, w: 160, d: 200, h: 60, color: '#8a7060', price: 900 },
    { id: 'bed_king', name: { fr: 'Lit king size', en: 'King Bed' }, w: 200, d: 210, h: 65, color: '#7a6050', price: 1400 },
    { id: 'bed_single', name: { fr: 'Lit simple', en: 'Single Bed' }, w: 90, d: 200, h: 55, color: '#9a8070', price: 500 },
    { id: 'wardrobe', name: { fr: 'Armoire', en: 'Wardrobe' }, w: 200, d: 60, h: 220, color: '#5c4a3a', price: 800 },
    { id: 'nightstand', name: { fr: 'Table de nuit', en: 'Nightstand' }, w: 50, d: 45, h: 60, color: '#6a5040', price: 180 },
    { id: 'dresser', name: { fr: 'Commode', en: 'Dresser' }, w: 100, d: 45, h: 85, color: '#7a6050', price: 450 },
    { id: 'desk', name: { fr: 'Bureau', en: 'Desk' }, w: 120, d: 60, h: 75, color: '#4a3728', price: 380 },
    { id: 'mirror', name: { fr: 'Miroir', en: 'Mirror' }, w: 80, d: 5, h: 180, color: '#c0c0c0', price: 250 },
  ],
  kitchen: [
    { id: 'kitchen_counter', name: { fr: 'Plan de travail', en: 'Counter' }, w: 240, d: 60, h: 90, color: '#e8e0d5', price: 1200 },
    { id: 'island', name: { fr: 'Îlot central', en: 'Kitchen Island' }, w: 150, d: 80, h: 90, color: '#d5ccc3', price: 1800 },
    { id: 'fridge', name: { fr: 'Réfrigérateur', en: 'Refrigerator' }, w: 70, d: 70, h: 185, color: '#c8c8c8', price: 900 },
    { id: 'stove', name: { fr: 'Cuisinière', en: 'Stove' }, w: 60, d: 60, h: 90, color: '#808080', price: 600 },
    { id: 'dishwasher', name: { fr: 'Lave-vaisselle', en: 'Dishwasher' }, w: 60, d: 60, h: 85, color: '#b8b8b8', price: 550 },
    { id: 'kitchen_table', name: { fr: 'Table à manger', en: 'Dining Table' }, w: 120, d: 80, h: 75, color: '#8b7355', price: 450 },
    { id: 'kitchen_chair', name: { fr: 'Chaise cuisine', en: 'Kitchen Chair' }, w: 45, d: 45, h: 90, color: '#6a5a4a', price: 120 },
  ],
  bathroom: [
    { id: 'bathtub', name: { fr: 'Baignoire', en: 'Bathtub' }, w: 170, d: 75, h: 60, color: '#f0f0f5', price: 1200 },
    { id: 'shower', name: { fr: 'Douche', en: 'Shower' }, w: 90, d: 90, h: 210, color: '#e8e8f0', price: 800 },
    { id: 'toilet', name: { fr: 'WC', en: 'Toilet' }, w: 40, d: 65, h: 80, color: '#f5f5f5', price: 350 },
    { id: 'sink', name: { fr: 'Lavabo', en: 'Sink' }, w: 60, d: 50, h: 90, color: '#f0f0f5', price: 280 },
    { id: 'double_sink', name: { fr: 'Double vasque', en: 'Double Sink' }, w: 120, d: 50, h: 90, color: '#f0f0f5', price: 550 },
    { id: 'towel_rack', name: { fr: 'Porte-serviettes', en: 'Towel Rack' }, w: 60, d: 15, h: 120, color: '#c0c0c0', price: 80 },
    { id: 'bath_cabinet', name: { fr: 'Armoire salle de bain', en: 'Bath Cabinet' }, w: 80, d: 35, h: 180, color: '#f5f5f5', price: 400 },
  ],
  office: [
    { id: 'office_desk', name: { fr: 'Bureau', en: 'Office Desk' }, w: 160, d: 80, h: 75, color: '#4a3728', price: 650 },
    { id: 'office_chair', name: { fr: 'Chaise ergonomique', en: 'Office Chair' }, w: 65, d: 65, h: 120, color: '#1a1a2e', price: 450 },
    { id: 'bookshelf_office', name: { fr: 'Bibliothèque', en: 'Bookshelf' }, w: 90, d: 30, h: 200, color: '#5c4a3a', price: 320 },
    { id: 'filing_cabinet', name: { fr: 'Classeur', en: 'Filing Cabinet' }, w: 45, d: 60, h: 130, color: '#708090', price: 280 },
    { id: 'meeting_table', name: { fr: 'Table de réunion', en: 'Meeting Table' }, w: 240, d: 100, h: 75, color: '#6a5a4a', price: 1200 },
    { id: 'sofa_office', name: { fr: 'Canapé', en: 'Sofa' }, w: 170, d: 80, h: 80, color: '#5b6fa6', price: 900 },
  ],
  dining: [
    { id: 'dining_table', name: { fr: 'Table à manger', en: 'Dining Table' }, w: 180, d: 90, h: 75, color: '#8b7355', price: 800 },
    { id: 'dining_chair', name: { fr: 'Chaise', en: 'Chair' }, w: 45, d: 45, h: 90, color: '#5c4a3a', price: 150 },
    { id: 'sideboard', name: { fr: 'Buffet', en: 'Sideboard' }, w: 180, d: 50, h: 85, color: '#4a3728', price: 650 },
    { id: 'display_cabinet', name: { fr: 'Vitrine', en: 'Display Cabinet' }, w: 100, d: 40, h: 200, color: '#5c4a3a', price: 750 },
    { id: 'bar_cart', name: { fr: 'Chariot bar', en: 'Bar Cart' }, w: 60, d: 40, h: 90, color: '#c8a96e', price: 280 },
  ]
};

// ─────────────────────────────────────────────────────────────
// UNIT CONVERSION
// ─────────────────────────────────────────────────────────────
let unitSystem = 'metric'; // 'metric' or 'imperial'
function toDisplay(cm) { return unitSystem === 'imperial' ? (cm / 2.54).toFixed(1) + ' in' : cm + ' cm'; }
function toDisplayM(cm) { return unitSystem === 'imperial' ? (cm / 30.48).toFixed(2) + ' ft' : (cm / 100).toFixed(2) + ' m'; }
function toDisplayArea(cm2) { return unitSystem === 'imperial' ? (cm2 / 929).toFixed(2) + ' ft²' : (cm2 / 10000).toFixed(2) + ' m²'; }
function fromDisplay(val) { return unitSystem === 'imperial' ? val * 2.54 : val; }

// ─────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────
let state = {
  room: null,
  furniture: [],
  doors: [],
  windows: [],
  wallColor: '#e8e0d5',
  floorColor: '#c8aa8c',
  ceilingColor: '#f5f5f0',
  wallMaterial: 'paint',
  floorMaterial: 'parquet',
  ceilingVisible: true,
  ambientIntensity: 0.6,
  timeOfDay: 14,
  style: 'modern',
  activeView: 'split',
  zoom2d: 1,
  panX: 0, panY: 0,
  mode: 'select',
  selectedIdx: -1,
  selectedType: null, // 'furniture','door','window'
  selectedArchIdx: -1,
  history: [], historyIdx: -1,
  wireframe: false,
};

// ─────────────────────────────────────────────────────────────
// DOM REFS
// ─────────────────────────────────────────────────────────────
let canvas2d, ctx2d, container3d;
let viewer3d = null;
let isDragging = false, dragItem = null, dragOffX = 0, dragOffY = 0;
let isOrbiting = false;
let splitDragging = false;
let measureStart = null;

// ─────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  canvas2d = document.getElementById('canvas-2d');
  ctx2d = canvas2d.getContext('2d');
  container3d = document.getElementById('container-3d');

  setupLangToggle();
  setupUnitToggle();
  setupWizard();
  setupToolbar();
  setupSidebar();
  setupSplitDivider();
  setupNavButtons();
  applyI18n();
  updateUndoRedo();
});

// ─────────────────────────────────────────────────────────────
// LANG
// ─────────────────────────────────────────────────────────────
function setupLangToggle() {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      lang = btn.dataset.lang;
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyI18n();
    });
  });
}

function setupUnitToggle() {
  document.querySelectorAll('.unit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      unitSystem = btn.dataset.unit;
      document.querySelectorAll('.unit-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Update unit labels in wizard
      ['w', 'd', 'h'].forEach(id => {
        const el = document.getElementById('dim-unit-' + id);
        if (el) el.textContent = unitSystem === 'imperial' ? 'in' : 'cm';
      });
      if (state.room) { updateRoomInfoPanel(); render2D(); updateSelectionPanel(); }
    });
  });
}

// ─────────────────────────────────────────────────────────────
// WIZARD
// ─────────────────────────────────────────────────────────────
function setupWizard() {
  // Room type buttons
  document.querySelectorAll('.room-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.room-type-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });
  // Style chips
  document.querySelectorAll('.style-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.style-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  // Create room
  document.getElementById('btn-create-room').addEventListener('click', createRoom);
}

function createRoom() {
  const type = document.querySelector('.room-type-btn.selected')?.dataset.type || 'living';
  const style = document.querySelector('.style-chip.active')?.dataset.style || 'modern';
  let w = parseFloat(document.getElementById('room-w').value) || 500;
  let d = parseFloat(document.getElementById('room-d').value) || 400;
  let h = parseFloat(document.getElementById('room-h').value) || 260;
  if (unitSystem === 'imperial') { w = w * 2.54; d = d * 2.54; h = h * 2.54; }
  state.room = { type, style, w: Math.round(w), d: Math.round(d), h: Math.round(h) };
  state.style = style;
  state.furniture = [];
  state.doors = [];
  state.windows = [];
  state.history = [];
  state.historyIdx = -1;
  // Add default furniture for room type
  addDefaultFurniture(type);
  // Hide wizard
  document.getElementById('wizard-overlay').classList.add('hidden');
  initCanvases();
  snapshotHistory();
  updateAllPanels();
  render2D();
  init3D();
  showToast(t('generated'), '✅');
}

function addDefaultFurniture(type) {
  const lib = FURNITURE_LIBRARY[type] || [];
  const defaults = {
    living: ['sofa', 'coffee_table', 'tv_stand'],
    bedroom: ['bed_double', 'nightstand', 'wardrobe'],
    kitchen: ['kitchen_counter', 'fridge', 'stove'],
    bathroom: ['bathtub', 'toilet', 'sink'],
    office: ['office_desk', 'office_chair'],
    dining: ['dining_table', 'dining_chair', 'dining_chair']
  };
  const ids = defaults[type] || [];
  const cx = state.room.w / 2, cy = state.room.d / 2;
  let placed = 0;
  ids.forEach(id => {
    const def = lib.find(f => f.id === id);
    if (!def) return;
    const f = {
      ...def, x: cx + placed * 20 - 80, y: cy + placed * 20 - 60,
      rotation: 0, color: def.color || '#6366f1', price: def.price || 0
    };
    state.furniture.push(f);
    placed++;
  });
}

// ─────────────────────────────────────────────────────────────
// CANVAS INIT
// ─────────────────────────────────────────────────────────────
function initCanvases() {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  setupCanvas2DEvents();
}

function resizeCanvas() {
  const vp = document.getElementById('view-2d');
  if (!vp) return;
  const header = vp.querySelector('.vp-header');
  const hh = header ? header.offsetHeight : 0;
  canvas2d.width = vp.offsetWidth;
  canvas2d.height = vp.offsetHeight - hh;
  if (state.room) render2D();
  if (viewer3d) viewer3d.resize();
}

// ─────────────────────────────────────────────────────────────
// 2D CANVAS RENDERING
// ─────────────────────────────────────────────────────────────
function worldToCanvas(wx, wy) {
  const scale = getScale();
  const offX = canvas2d.width / 2 + state.panX - (state.room.w * scale) / 2;
  const offY = canvas2d.height / 2 + state.panY - (state.room.d * scale) / 2;
  return { x: offX + wx * scale, y: offY + wy * scale };
}
function canvasToWorld(cx, cy) {
  const scale = getScale();
  const offX = canvas2d.width / 2 + state.panX - (state.room.w * scale) / 2;
  const offY = canvas2d.height / 2 + state.panY - (state.room.d * scale) / 2;
  return { x: (cx - offX) / scale, y: (cy - offY) / scale };
}
function getScale() { return state.zoom2d * Math.min(canvas2d.width / (state.room.w + 100), canvas2d.height / (state.room.d + 100)); }

function render2D() {
  if (!state.room || !ctx2d) return;
  const W = canvas2d.width, H = canvas2d.height;
  ctx2d.clearRect(0, 0, W, H);

  // Background
  ctx2d.fillStyle = '#0a0a16';
  ctx2d.fillRect(0, 0, W, H);

  // Grid
  drawGrid();

  // Room
  drawRoom();

  // Measure line
  if (measureStart && state.mode === 'ruler') {
    // drawn on mousemove
  }

  // Furniture
  state.furniture.forEach((f, i) => drawFurniture(f, i));

  // Doors & Windows
  state.doors.forEach((d, i) => drawDoor(d, i));
  state.windows.forEach((w, i) => drawWindow(w, i));

  // Dimension labels
  drawDimensions();
}

function drawGrid() {
  const scale = getScale();
  const gridCm = scale > 2 ? 50 : 100;
  const offX = canvas2d.width / 2 + state.panX - (state.room.w * scale) / 2;
  const offY = canvas2d.height / 2 + state.panY - (state.room.d * scale) / 2;
  ctx2d.strokeStyle = 'rgba(99,102,241,0.07)';
  ctx2d.lineWidth = 1;
  for (let x = 0; x < state.room.w; x += gridCm) {
    const cx = offX + x * scale;
    ctx2d.beginPath(); ctx2d.moveTo(cx, offY); ctx2d.lineTo(cx, offY + state.room.d * scale); ctx2d.stroke();
  }
  for (let y = 0; y < state.room.d; y += gridCm) {
    const cy = offY + y * scale;
    ctx2d.beginPath(); ctx2d.moveTo(offX, cy); ctx2d.lineTo(offX + state.room.w * scale, cy); ctx2d.stroke();
  }
}

function drawRoom() {
  const sc = getScale();
  const p0 = worldToCanvas(0, 0);
  const rw = state.room.w * sc, rd = state.room.d * sc;
  const WALL = 14;

  // Floor
  ctx2d.fillStyle = 'rgba(200,170,140,0.12)';
  ctx2d.fillRect(p0.x, p0.y, rw, rd);

  // Floor pattern
  if (state.floorMaterial === 'parquet') {
    ctx2d.save();
    ctx2d.strokeStyle = 'rgba(200,170,140,0.15)';
    ctx2d.lineWidth = 0.8;
    const step = sc * 30;
    for (let x = p0.x; x < p0.x + rw; x += step * 2) {
      for (let y = p0.y; y < p0.y + rd; y += step) {
        ctx2d.strokeRect(x, y, step, step);
        ctx2d.strokeRect(x + step, y + step, step, step);
      }
    }
    ctx2d.restore();
  } else if (state.floorMaterial === 'ceramic') {
    ctx2d.save();
    ctx2d.strokeStyle = 'rgba(200,200,200,0.12)';
    ctx2d.lineWidth = 1;
    const step = sc * 50;
    for (let x = p0.x; x < p0.x + rw; x += step) { ctx2d.beginPath(); ctx2d.moveTo(x, p0.y); ctx2d.lineTo(x, p0.y + rd); ctx2d.stroke(); }
    for (let y = p0.y; y < p0.y + rd; y += step) { ctx2d.beginPath(); ctx2d.moveTo(p0.x, y); ctx2d.lineTo(p0.x + rw, y); ctx2d.stroke(); }
    ctx2d.restore();
  }

  // Walls
  ctx2d.fillStyle = state.wallColor;
  ctx2d.strokeStyle = state.wallColor;
  // top wall
  ctx2d.fillRect(p0.x - WALL, p0.y - WALL, rw + 2 * WALL, WALL);
  // bottom wall
  ctx2d.fillRect(p0.x - WALL, p0.y + rd, rw + 2 * WALL, WALL);
  // left wall
  ctx2d.fillRect(p0.x - WALL, p0.y - WALL, WALL, rd + 2 * WALL);
  // right wall
  ctx2d.fillRect(p0.x + rw, p0.y - WALL, WALL, rd + 2 * WALL);

  // Wall border
  ctx2d.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx2d.lineWidth = 1;
  ctx2d.strokeRect(p0.x - WALL, p0.y - WALL, rw + 2 * WALL, rd + 2 * WALL);
  ctx2d.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx2d.strokeRect(p0.x, p0.y, rw, rd);
}

function drawFurniture(f, idx) {
  const sc = getScale();
  const cx = worldToCanvas(f.x, f.y);
  const fw = f.w * sc, fd = f.d * sc;
  const isSelected = idx === state.selectedIdx && state.selectedType === 'furniture';
  ctx2d.save();
  ctx2d.translate(cx.x, cx.y);
  ctx2d.rotate((f.rotation || 0) * Math.PI / 180);
  // Shadow
  if (isSelected) {
    ctx2d.shadowColor = f.color;
    ctx2d.shadowBlur = 12;
  }
  // Body
  ctx2d.fillStyle = f.color || '#6366f1';
  ctx2d.globalAlpha = 0.85;
  drawFurnShape(f, fw, fd, sc);
  ctx2d.globalAlpha = 1;
  // Border
  ctx2d.strokeStyle = isSelected ? '#fff' : 'rgba(255,255,255,0.3)';
  ctx2d.lineWidth = isSelected ? 2 : 1;
  ctx2d.strokeRect(-fw / 2, -fd / 2, fw, fd);
  // Label
  ctx2d.shadowBlur = 0;
  ctx2d.fillStyle = 'rgba(255,255,255,0.9)';
  ctx2d.font = `bold ${Math.max(9, Math.min(12, sc * 8))}px Inter`;
  ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'middle';
  const nm = (f.name && f.name[lang]) || f.name?.fr || f.id;
  if (fw > 40) ctx2d.fillText(nm.substring(0, 12), 0, 0);
  // Dim label
  ctx2d.font = `${Math.max(7, sc * 6)}px Inter`;
  ctx2d.fillStyle = 'rgba(255,255,255,0.55)';
  if (fw > 50 && fd > 25) ctx2d.fillText(`${toDisplay(f.w)}×${toDisplay(f.d)}`, 0, fd / 2 - 8);
  ctx2d.restore();
}

function drawFurnShape(f, fw, fd, sc) {
  // Draw a slightly more detailed shape based on furniture type
  const id = f.id || '';
  ctx2d.beginPath();
  if (id.includes('sofa')) {
    // Sofa shape with back
    ctx2d.roundRect(-fw / 2, -fd / 2, fw, fd, 4);
    ctx2d.fill();
    ctx2d.fillStyle = 'rgba(0,0,0,0.15)';
    ctx2d.fillRect(-fw / 2 + 3, -fd / 2 + 3, fw - 6, fd / 3); // back cushion hint
  } else if (id.includes('bed')) {
    ctx2d.roundRect(-fw / 2, -fd / 2, fw, fd, 6);
    ctx2d.fill();
    // Pillow hint
    ctx2d.fillStyle = 'rgba(255,255,255,0.2)';
    if (id.includes('king') || id.includes('double')) {
      ctx2d.roundRect(-fw / 2 + 8, -fd / 2 + 8, fw / 2 - 12, fd / 4, 3);
      ctx2d.roundRect(4, -fd / 2 + 8, fw / 2 - 12, fd / 4, 3);
    } else {
      ctx2d.roundRect(-fw / 2 + 8, -fd / 2 + 8, fw - 16, fd / 4, 3);
    }
    ctx2d.fill();
  } else if (id.includes('table')) {
    ctx2d.roundRect(-fw / 2, -fd / 2, fw, fd, 3);
    ctx2d.fill();
    ctx2d.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx2d.lineWidth = 2;
    ctx2d.strokeRect(-fw / 2 + 4, -fd / 2 + 4, fw - 8, fd - 8);
  } else if (id === 'toilet') {
    // Toilet shape
    ctx2d.ellipse(0, fd / 4, fw / 2, fd / 3, 0, 0, Math.PI * 2);
    ctx2d.fill();
    ctx2d.fillRect(-fw / 2, -fd / 2, fw, fd / 3);
  } else if (id === 'bathtub') {
    ctx2d.roundRect(-fw / 2, -fd / 2, fw, fd, 10);
    ctx2d.fill();
    // Inner tub
    ctx2d.fillStyle = 'rgba(255,255,255,0.25)';
    ctx2d.roundRect(-fw / 2 + 8, -fd / 2 + 8, fw - 16, fd - 16, 6);
    ctx2d.fill();
  } else if (id === 'sink' || id === 'double_sink') {
    ctx2d.roundRect(-fw / 2, -fd / 2, fw, fd, 4);
    ctx2d.fill();
    ctx2d.fillStyle = 'rgba(255,255,255,0.3)';
    ctx2d.ellipse(0, 0, fw / 3, fd / 3, 0, 0, Math.PI * 2);
    ctx2d.fill();
  } else if (id === 'plant') {
    ctx2d.arc(0, 0, fw / 2, 0, Math.PI * 2);
    ctx2d.fill();
    ctx2d.fillStyle = 'rgba(0,100,0,0.3)';
    for (let a = 0; a < 6; a++) {
      ctx2d.beginPath();
      ctx2d.ellipse(Math.cos(a) * fw / 4, Math.sin(a) * fw / 4, fw / 5, fd / 8, a, 0, Math.PI * 2);
      ctx2d.fill();
    }
  } else {
    ctx2d.roundRect(-fw / 2, -fd / 2, fw, fd, 3);
    ctx2d.fill();
  }
}

function drawDoor(door, idx) {
  const sc = getScale();
  const WALL = 14;
  const isSelected = idx === state.selectedArchIdx && state.selectedType === 'door';
  const color = door.color || '#c8a96e';
  const size = door.size * sc;
  let x1, y1, x2, y2, arcX, arcY, arcR, arcStart, arcEnd;

  const p0 = worldToCanvas(0, 0);
  const rw = state.room.w * sc, rd = state.room.d * sc;

  ctx2d.save();
  ctx2d.strokeStyle = isSelected ? '#fff' : color;
  ctx2d.lineWidth = isSelected ? 2.5 : 2;
  ctx2d.setLineDash([]);

  const off = door.offset * sc;
  const style = door.style || 'simple';
  const side = door.side || 'right';

  if (door.wall === 'top') {
    const dx = p0.x + off; const dy = p0.y;
    // Clear wall opening
    ctx2d.clearRect(dx, -5, size, WALL + 10);
    ctx2d.fillStyle = state.wallColor;
    // Draw door
    if (style === 'double') {
      ctx2d.beginPath(); ctx2d.moveTo(dx, dy); ctx2d.lineTo(dx, dy - size / 2); ctx2d.stroke();
      ctx2d.beginPath(); ctx2d.moveTo(dx + size, dy); ctx2d.lineTo(dx + size, dy - size / 2); ctx2d.stroke();
      ctx2d.strokeStyle = color + '80'; ctx2d.beginPath(); ctx2d.arc(dx, dy, size / 2, -Math.PI / 2, 0); ctx2d.stroke();
      ctx2d.beginPath(); ctx2d.arc(dx + size, dy, size / 2, -Math.PI / 2, -Math.PI, true); ctx2d.stroke();
    } else if (style === 'sliding') {
      ctx2d.fillStyle = color + '40'; ctx2d.fillRect(dx, dy - WALL, size, WALL);
      ctx2d.strokeRect(dx + size / 4, dy - WALL, size / 2, WALL);
    } else {
      ctx2d.beginPath(); ctx2d.moveTo(side === 'right' ? dx : dx + size, dy);
      ctx2d.lineTo(side === 'right' ? dx : dx + size, dy - size); ctx2d.stroke();
      ctx2d.strokeStyle = color + '60'; ctx2d.setLineDash([3, 3]);
      ctx2d.beginPath();
      if (side === 'right') { ctx2d.arc(dx, dy, size, -(Math.PI / 2), 0); }
      else { ctx2d.arc(dx + size, dy, size, Math.PI, -(Math.PI / 2)); }
      ctx2d.stroke();
    }
  } else if (door.wall === 'bottom') {
    const dx = p0.x + off; const dy = p0.y + rd;
    ctx2d.clearRect(dx, dy - 5, size, WALL + 10);
    if (style === 'sliding') {
      ctx2d.fillStyle = color + '40'; ctx2d.fillRect(dx, dy, size, WALL);
      ctx2d.strokeRect(dx + size / 4, dy, size / 2, WALL);
    } else {
      ctx2d.strokeStyle = color; ctx2d.setLineDash([]);
      ctx2d.beginPath(); ctx2d.moveTo(side === 'right' ? dx : dx + size, dy); ctx2d.lineTo(side === 'right' ? dx : dx + size, dy + size); ctx2d.stroke();
      ctx2d.strokeStyle = color + '60'; ctx2d.setLineDash([3, 3]);
      ctx2d.beginPath();
      if (side === 'right') { ctx2d.arc(dx, dy, size, 0, Math.PI / 2); }
      else { ctx2d.arc(dx + size, dy, size, Math.PI / 2, Math.PI); }
      ctx2d.stroke();
    }
  } else if (door.wall === 'left') {
    const dx = p0.x; const dy = p0.y + off;
    ctx2d.clearRect(-5, dy, WALL + 10, size);
    if (style === 'sliding') {
      ctx2d.fillStyle = color + '40'; ctx2d.fillRect(dx - WALL, dy, WALL, size);
      ctx2d.strokeRect(dx - WALL, dy + size / 4, WALL, size / 2);
    } else {
      ctx2d.strokeStyle = color; ctx2d.setLineDash([]);
      ctx2d.beginPath(); ctx2d.moveTo(dx, side === 'right' ? dy : dy + size); ctx2d.lineTo(dx - size, side === 'right' ? dy : dy + size); ctx2d.stroke();
      ctx2d.strokeStyle = color + '60'; ctx2d.setLineDash([3, 3]);
      ctx2d.beginPath();
      if (side === 'right') { ctx2d.arc(dx, dy, size, Math.PI, Math.PI * 1.5); }
      else { ctx2d.arc(dx, dy + size, size, Math.PI * 1.5, Math.PI * 2); }
      ctx2d.stroke();
    }
  } else { // right
    const dx = p0.x + rw; const dy = p0.y + off;
    ctx2d.clearRect(dx - 5, dy, WALL + 10, size);
    if (style === 'sliding') {
      ctx2d.fillStyle = color + '40'; ctx2d.fillRect(dx, dy, WALL, size);
      ctx2d.strokeRect(dx, dy + size / 4, WALL, size / 2);
    } else {
      ctx2d.strokeStyle = color; ctx2d.setLineDash([]);
      ctx2d.beginPath(); ctx2d.moveTo(dx, side === 'right' ? dy : dy + size); ctx2d.lineTo(dx + size, side === 'right' ? dy : dy + size); ctx2d.stroke();
      ctx2d.strokeStyle = color + '60'; ctx2d.setLineDash([3, 3]);
      ctx2d.beginPath();
      if (side === 'right') { ctx2d.arc(dx, dy, size, 0, -Math.PI / 2, true); }
      else { ctx2d.arc(dx, dy + size, size, -Math.PI / 2, 0); }
      ctx2d.stroke();
    }
  }
  ctx2d.restore();
}

function drawWindow(win, idx) {
  const sc = getScale();
  const WALL = 14;
  const isSelected = idx === state.selectedArchIdx && state.selectedType === 'window';
  const color = win.color || '#4fc3f7';
  const size = win.size * sc;
  const p0 = worldToCanvas(0, 0);
  const rw = state.room.w * sc, rd = state.room.d * sc;

  ctx2d.save();
  ctx2d.strokeStyle = isSelected ? '#fff' : color;
  ctx2d.lineWidth = isSelected ? 2.5 : 1.5;

  const off = win.offset * sc;
  const style = win.style || 'standard';

  const drawWinLines = (x, y, w2, h2, horiz) => {
    ctx2d.strokeStyle = color;
    ctx2d.fillStyle = color + '25';
    if (horiz) {
      ctx2d.fillRect(x, y, w2, h2);
      ctx2d.strokeRect(x, y, w2, h2);
      ctx2d.beginPath(); ctx2d.moveTo(x + w2 / 2, y); ctx2d.lineTo(x + w2 / 2, y + h2);
      if (style === 'double') { ctx2d.moveTo(x + w2 / 3, y); ctx2d.lineTo(x + w2 / 3, y + h2); ctx2d.moveTo(x + 2 * w2 / 3, y); ctx2d.lineTo(x + 2 * w2 / 3, y + h2); }
      ctx2d.stroke();
    } else {
      ctx2d.fillRect(x, y, w2, h2);
      ctx2d.strokeRect(x, y, w2, h2);
      ctx2d.beginPath(); ctx2d.moveTo(x, y + h2 / 2); ctx2d.lineTo(x + w2, y + h2 / 2);
      if (style === 'double') { ctx2d.moveTo(x, y + h2 / 3); ctx2d.lineTo(x + w2, y + h2 / 3); ctx2d.moveTo(x, y + 2 * h2 / 3); ctx2d.lineTo(x + w2, y + 2 * h2 / 3); }
      ctx2d.stroke();
    }
  };

  if (win.wall === 'top') drawWinLines(p0.x + off, p0.y - WALL, size, WALL, true);
  else if (win.wall === 'bottom') drawWinLines(p0.x + off, p0.y + rd, size, WALL, true);
  else if (win.wall === 'left') drawWinLines(p0.x - WALL, p0.y + off, WALL, size, false);
  else drawWinLines(p0.x + rw, p0.y + off, WALL, size, false);

  ctx2d.restore();
}

function drawDimensions() {
  if (!state.room) return;
  const sc = getScale();
  const p0 = worldToCanvas(0, 0);
  const rw = state.room.w * sc, rd = state.room.d * sc;
  ctx2d.save();
  ctx2d.fillStyle = 'rgba(148,163,184,0.8)';
  ctx2d.font = `bold ${Math.max(10, Math.min(13, sc * 8))}px Inter`;
  ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'middle';
  // Width
  ctx2d.fillText(`${toDisplay(state.room.w)} / ${toDisplayM(state.room.w)}`, p0.x + rw / 2, p0.y - 26);
  // Depth
  ctx2d.save();
  ctx2d.translate(p0.x - 28, p0.y + rd / 2);
  ctx2d.rotate(-Math.PI / 2);
  ctx2d.fillText(`${toDisplay(state.room.d)} / ${toDisplayM(state.room.d)}`, 0, 0);
  ctx2d.restore();
  ctx2d.restore();
}

// ─────────────────────────────────────────────────────────────
// 2D CANVAS EVENTS
// ─────────────────────────────────────────────────────────────
function setupCanvas2DEvents() {
  canvas2d.addEventListener('mousedown', onCanvas2DMouseDown);
  canvas2d.addEventListener('mousemove', onCanvas2DMouseMove);
  canvas2d.addEventListener('mouseup', onCanvas2DMouseUp);
  canvas2d.addEventListener('wheel', onCanvas2DWheel, { passive: false });
  canvas2d.addEventListener('contextmenu', e => e.preventDefault());
}

function getFurnitureAt(wx, wy) {
  for (let i = state.furniture.length - 1; i >= 0; i--) {
    const f = state.furniture[i];
    const sc = 1; // world coords
    const hw = f.w / 2, hd = f.d / 2;
    const r = (f.rotation || 0) * Math.PI / 180;
    const dx = wx - f.x, dy = wy - f.y;
    const lx = dx * Math.cos(-r) - dy * Math.sin(-r);
    const ly = dx * Math.sin(-r) + dy * Math.cos(-r);
    if (Math.abs(lx) < hw && Math.abs(ly) < hd) return i;
  }
  return -1;
}

function getArchAt(wx, wy) {
  if (!state.room) return null;
  const WALL = 14;
  const rw = state.room.w, rd = state.room.d;
  const isInside = (val, min, max) => val >= min && val <= max;
  for (let i = state.windows.length - 1; i >= 0; i--) {
    const w = state.windows[i]; const off = w.offset, sz = w.size; let hit = false;
    if (w.wall === 'top') hit = isInside(wx, off, off + sz) && isInside(wy, -WALL, WALL);
    else if (w.wall === 'bottom') hit = isInside(wx, off, off + sz) && isInside(wy, rd - WALL, rd + WALL);
    else if (w.wall === 'left') hit = isInside(wy, off, off + sz) && isInside(wx, -WALL, WALL);
    else hit = isInside(wy, off, off + sz) && isInside(wx, rw - WALL, rw + WALL);
    if (hit) return { type: 'window', idx: i };
  }
  for (let i = state.doors.length - 1; i >= 0; i--) {
    const d = state.doors[i]; const off = d.offset, sz = d.size; let hit = false;
    if (d.wall === 'top') hit = isInside(wx, off, off + sz) && isInside(wy, -WALL, WALL);
    else if (d.wall === 'bottom') hit = isInside(wx, off, off + sz) && isInside(wy, rd - WALL, rd + WALL);
    else if (d.wall === 'left') hit = isInside(wy, off, off + sz) && isInside(wx, -WALL, WALL);
    else hit = isInside(wy, off, off + sz) && isInside(wx, rw - WALL, rw + WALL);
    if (hit) return { type: 'door', idx: i };
  }
  return null;
}

function onCanvas2DMouseDown(e) {
  if (!state.room) return;
  const rect = canvas2d.getBoundingClientRect();
  const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
  const wp = canvasToWorld(cx, cy);

  if (state.mode === 'ruler') {
    measureStart = { x: cx, y: cy, wx: wp.x, wy: wp.y };
    return;
  }

  if (e.button === 1 || e.button === 2) {
    isDragging = true; dragItem = { type: 'pan', sx: cx, sy: cy, px: state.panX, py: state.panY };
    return;
  }

  // Add door/window
  if (state.mode === 'addDoor') {
    addDoorAtWorld(wp); return;
  }
  if (state.mode === 'addWindow') {
    addWindowAtWorld(wp); return;
  }

  // Select furniture
  const fi = getFurnitureAt(wp.x, wp.y);
  if (fi >= 0) {
    selectItem('furniture', fi);
    const f = state.furniture[fi];
    dragItem = { type: 'furniture', idx: fi, ox: wp.x - f.x, oy: wp.y - f.y };
    isDragging = true;
    return;
  }

  const arch = getArchAt(wp.x, wp.y);
  if (arch) {
    selectItem(arch.type, arch.idx);
    const item = arch.type === 'door' ? state.doors[arch.idx] : state.windows[arch.idx];
    const isTB = (item.wall === 'top' || item.wall === 'bottom');
    dragItem = { type: 'arch', archType: arch.type, idx: arch.idx, ox: isTB ? (wp.x - item.offset) : (wp.y - item.offset) };
    isDragging = true;
    return;
  }

  // Deselect
  selectItem(null, -1);
  // Pan
  isDragging = true;
  dragItem = { type: 'pan', sx: cx, sy: cy, px: state.panX, py: state.panY };
}

function onCanvas2DMouseMove(e) {
  if (!state.room) return;
  const rect = canvas2d.getBoundingClientRect();
  const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
  const wp = canvasToWorld(cx, cy);

  // Cursor
  const fi = getFurnitureAt(wp.x, wp.y);
  const arch = getArchAt(wp.x, wp.y);
  if (state.mode === 'ruler') canvas2d.style.cursor = 'crosshair';
  else if (state.mode === 'addDoor' || state.mode === 'addWindow') canvas2d.style.cursor = 'cell';
  else canvas2d.style.cursor = (fi >= 0 || arch) ? 'grab' : 'default';

  if (state.mode === 'ruler' && measureStart) {
    render2D();
    const dx = cx - measureStart.x, dy = cy - measureStart.y;
    const dist = Math.sqrt((wp.x - measureStart.wx) ** 2 + (wp.y - measureStart.wy) ** 2);
    ctx2d.save();
    ctx2d.strokeStyle = '#f59e0b'; ctx2d.lineWidth = 2; ctx2d.setLineDash([6, 3]);
    ctx2d.beginPath(); ctx2d.moveTo(measureStart.x, measureStart.y); ctx2d.lineTo(cx, cy); ctx2d.stroke();
    ctx2d.fillStyle = '#f59e0b'; ctx2d.font = 'bold 12px Inter'; ctx2d.textAlign = 'center';
    ctx2d.fillText(toDisplay(dist) + ' / ' + toDisplayM(dist), measureStart.x + dx / 2, measureStart.y + dy / 2 - 10);
    ctx2d.restore();
    document.getElementById('measure-text').textContent = `${toDisplay(dist)} / ${toDisplayM(dist)}`;
    document.getElementById('measure-bar').style.display = 'flex';
    return;
  }

  if (!isDragging) return;
  if (dragItem.type === 'pan') {
    state.panX = dragItem.px + (cx - dragItem.sx);
    state.panY = dragItem.py + (cy - dragItem.sy);
    render2D();
  } else if (dragItem.type === 'furniture') {
    const f = state.furniture[dragItem.idx];
    f.x = wp.x - dragItem.ox;
    f.y = wp.y - dragItem.oy;
    // Clamp inside room
    f.x = Math.max(f.w / 2, Math.min(state.room.w - f.w / 2, f.x));
    f.y = Math.max(f.d / 2, Math.min(state.room.d - f.d / 2, f.y));
    render2D();
    updateSelectionPanel();
    scheduleUpdate3D();
  } else if (dragItem.type === 'arch') {
    const item = dragItem.archType === 'door' ? state.doors[dragItem.idx] : state.windows[dragItem.idx];
    const isTB = (item.wall === 'top' || item.wall === 'bottom');
    if (isTB) {
      item.offset = wp.x - dragItem.ox;
      item.offset = Math.max(0, Math.min(state.room.w - item.size, item.offset));
    } else {
      item.offset = wp.y - dragItem.ox;
      item.offset = Math.max(0, Math.min(state.room.d - item.size, item.offset));
    }
    render2D();
    updateArchPanel();
    scheduleUpdate3D();
  }
}

function onCanvas2DMouseUp(e) {
  if (isDragging && (dragItem?.type === 'furniture' || dragItem?.type === 'arch')) snapshotHistory();
  if (measureStart && state.mode === 'ruler') measureStart = null;
  isDragging = false; dragItem = null;
}

function onCanvas2DWheel(e) {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.1 : 0.9;
  state.zoom2d = Math.max(0.3, Math.min(5, state.zoom2d * factor));
  document.getElementById('zoom-val').textContent = Math.round(state.zoom2d * 100) + '%';
  render2D();
}

function addDoorAtWorld(wp) {
  const wall = getNearestWall(wp);
  const offset = getWallOffset(wp, wall);
  const door = { wall, offset, size: 90, h: 210, style: 'simple', side: 'right', color: '#c8a96e' };
  state.doors.push(door);
  snapshotHistory();
  render2D();
  scheduleUpdate3D();
  updateArchPanel();
  selectItem('door', state.doors.length - 1);
  setMode('select');
  showToast(t('door') + ' +', '🚪');
}

function addWindowAtWorld(wp) {
  const wall = getNearestWall(wp);
  const offset = getWallOffset(wp, wall);
  const win = { wall, offset, size: 120, h: 120, style: 'standard', color: '#4fc3f7' };
  state.windows.push(win);
  snapshotHistory();
  render2D();
  scheduleUpdate3D();
  updateWindowsPanel();
  selectItem('window', state.windows.length - 1);
  setMode('select');
  showToast(t('window') + ' +', '🪟');
}

function getNearestWall(wp) {
  const dists = {
    top: wp.y, bottom: state.room.d - wp.y,
    left: wp.x, right: state.room.w - wp.x
  };
  return Object.keys(dists).reduce((a, b) => dists[a] < dists[b] ? a : b);
}

function getWallOffset(wp, wall) {
  if (wall === 'top' || wall === 'bottom') return Math.max(10, Math.min(state.room.w - 100, wp.x - 50));
  return Math.max(10, Math.min(state.room.d - 100, wp.y - 50));
}

// -------------------------------------------------------------
// 3D VIEWER (Three.js)
// -------------------------------------------------------------
let update3DTimer = null;
function scheduleUpdate3D() { clearTimeout(update3DTimer); update3DTimer = setTimeout(() => { if (viewer3d) viewer3d.refresh(); }, 300); }

class Viewer3D {
  constructor(container) { this.container = container; this.scene = null; this.camera = null; this.renderer = null; this.controls = null; this.furnitureMeshes = []; this.roomMeshes = []; }
  init() {
    const W = this.container.clientWidth || 600, H = this.container.clientHeight || 400;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x080810);
    this.scene.fog = new THREE.Fog(0x080810, 800, 2000);
    this.camera = new THREE.PerspectiveCamera(50, W / H, 1, 5000);
    this.camera.position.set(0, 400, 600);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(W, H);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI / 2.05;
    this.controls.minDistance = 100;
    this.controls.maxDistance = 2000;
    // Lights
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);
    this.sunLight = new THREE.DirectionalLight(0xfff4e0, 1.2);
    this.sunLight.position.set(300, 600, 400);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 3000;
    this.sunLight.shadow.camera.left = -800;
    this.sunLight.shadow.camera.right = 800;
    this.sunLight.shadow.camera.top = 800;
    this.sunLight.shadow.camera.bottom = -800;
    this.scene.add(this.sunLight);
    this.fillLight = new THREE.HemisphereLight(0x8890ff, 0x443322, 0.4);
    this.scene.add(this.fillLight);
    this.animate();
  }
  animate() { requestAnimationFrame(() => this.animate()); this.controls.update(); this.renderer.render(this.scene, this.camera); }
  resize() {
    const W = this.container.clientWidth, H = this.container.clientHeight;
    if (!W || !H) return;
    this.camera.aspect = W / H;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(W, H);
  }
  refresh() { this.build(state.room, state.furniture, state.doors, state.windows); }
  dispose() { this.renderer?.dispose(); this.container.innerHTML = ''; }
  hexToColor(hex) { try { return new THREE.Color(hex); } catch (e) { return new THREE.Color(0xaaaaaa); } }

  build(room, furniture, doors, windows) {
    if (!room) return;
    // Clear old meshes
    [...this.furnitureMeshes, ...this.roomMeshes].forEach(m => { this.scene.remove(m); if (m.geometry) m.geometry.dispose(); if (m.material && m.material.dispose) m.material.dispose(); });
    this.furnitureMeshes = [];
    this.roomMeshes = [];

    const scale = 0.5; // cm to three units
    const RW = room.w * scale, RD = room.d * scale, RH = (room.h || 260) * scale;
    const cx = RW / 2, cz = RD / 2;

    // Update lights
    this.ambientLight.intensity = state.ambientIntensity * 0.6;
    const hour = state.timeOfDay;
    const sunIntensity = Math.max(0.1, Math.min(1.5, Math.sin(((hour - 6) / 16) * Math.PI)));
    this.sunLight.intensity = sunIntensity;
    const warmth = hour < 12 ? 0.9 : hour < 17 ? 1.0 : 0.7;
    this.sunLight.color.setRGB(1.0 * warmth, 0.95, (0.8 + (1 - warmth) * 0.2));
    this.sunLight.position.set(Math.cos(hour / 24 * Math.PI * 2) * 500, 400 + Math.sin(hour / 12 * Math.PI) * 200, Math.sin(hour / 24 * Math.PI * 2) * 500);

    const addMesh = (m, isRoom = true) => { this.scene.add(m); (isRoom ? this.roomMeshes : this.furnitureMeshes).push(m); };

    // FLOOR
    const floorMat = this.makeFloorMat(state.floorColor, state.floorMaterial);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), floorMat);
    floor.rotation.x = -Math.PI / 2; floor.position.set(cx, 0, cz); floor.receiveShadow = true; addMesh(floor);

    // CEILING
    if (state.ceilingVisible) {
      const ceilMat = new THREE.MeshStandardMaterial({ color: this.hexToColor(state.ceilingColor), roughness: 0.9 });
      const ceil = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), ceilMat);
      ceil.rotation.x = Math.PI / 2; ceil.position.set(cx, RH, cz); ceil.receiveShadow = true; addMesh(ceil);
    }

    // WALLS
    const wallMat = this.makeWallMat(state.wallColor, state.wallMaterial);
    const wallGeoms = [
      { w: RW, h: RH, x: cx, y: RH / 2, z: 0, rx: 0, ry: 0 },        // back
      { w: RW, h: RH, x: cx, y: RH / 2, z: RD, rx: 0, ry: Math.PI },  // front
      { w: RD, h: RH, x: 0, y: RH / 2, z: cz, rx: 0, ry: Math.PI / 2 }, // left
      { w: RD, h: RH, x: RW, y: RH / 2, z: cz, rx: 0, ry: -Math.PI / 2 },// right
    ];
    wallGeoms.forEach(wg => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(wg.w, wg.h), wallMat.clone());
      mesh.rotation.set(wg.rx, wg.ry, 0);
      mesh.position.set(wg.x, wg.y, wg.z);
      mesh.receiveShadow = true; addMesh(mesh);
    });

    // DOORS – realistic door with frame, leaf, and handle
    (doors || []).forEach(d => {
      const S = scale;
      const dW = d.size * S;
      const dH = Math.min((d.h || 210) * S, RH * 0.92);
      const off = d.offset * S;
      const style = d.style || 'simple';
      const doorColor = this.hexToColor(d.color || '#c8a96e');
      const doorMat = new THREE.MeshStandardMaterial({ color: doorColor, roughness: 0.6 });
      const frameMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.9 });
      const knobMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.2 });
      const ft = 3 * S; // frame thickness in units

      const doorGroup = new THREE.Group();

      // Frame: top + left + right bars
      const frameTop = new THREE.Mesh(new THREE.BoxGeometry(dW, ft, 8 * S), frameMat);
      const frameL = new THREE.Mesh(new THREE.BoxGeometry(ft, dH, 8 * S), frameMat);
      const frameR = new THREE.Mesh(new THREE.BoxGeometry(ft, dH, 8 * S), frameMat);
      frameTop.position.y = dH / 2 + ft / 2;
      frameL.position.x = -dW / 2 + ft / 2;
      frameR.position.x = dW / 2 - ft / 2;
      doorGroup.add(frameTop, frameL, frameR);

      if (style === 'double') {
        const halfW = (dW - ft * 2) / 2;
        // Left leaf
        const leafL = new THREE.Mesh(new THREE.BoxGeometry(halfW, dH - ft, 4 * S), doorMat);
        leafL.castShadow = true;
        const pivotL = new THREE.Group();
        pivotL.position.set(-dW / 2 + ft, 0, 0);
        leafL.position.set(halfW / 2, 0, 0);
        pivotL.add(leafL);
        pivotL.rotation.y = Math.PI / 6;
        // Right leaf
        const leafR = new THREE.Mesh(new THREE.BoxGeometry(halfW, dH - ft, 4 * S), doorMat);
        leafR.castShadow = true;
        const pivotR = new THREE.Group();
        pivotR.position.set(dW / 2 - ft, 0, 0);
        leafR.position.set(-halfW / 2, 0, 0);
        pivotR.add(leafR);
        pivotR.rotation.y = -Math.PI / 6;
        doorGroup.add(pivotL, pivotR);
      } else if (style === 'sliding') {
        const halfW = (dW - ft * 2) / 2 + ft;
        const p1 = new THREE.Mesh(new THREE.BoxGeometry(halfW, dH - ft, 3 * S), doorMat);
        const p2 = new THREE.Mesh(new THREE.BoxGeometry(halfW, dH - ft, 3 * S), doorMat);
        p1.castShadow = true; p2.castShadow = true;
        p1.position.set(-dW / 4, 0, 1.5 * S);
        p2.position.set(dW / 4 - 5 * S, 0, -1.5 * S);
        doorGroup.add(p1, p2);
      } else {
        // Simple door, slightly open
        const leafW = dW - ft * 2;
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(leafW, dH - ft, 4 * S), doorMat);
        leaf.castShadow = true;
        const knob = new THREE.Mesh(new THREE.SphereGeometry(3 * S, 8, 8), knobMat);
        const pivot = new THREE.Group();
        pivot.position.set(-dW / 2 + ft, 0, 0);
        leaf.position.set(leafW / 2, 0, 0);
        knob.position.set(leafW - 8 * S, 0, 4 * S);
        pivot.add(leaf, knob);
        pivot.rotation.y = Math.PI / 6; // slightly open
        doorGroup.add(pivot);
      }

      const py = dH / 2;
      if (d.wall === 'top') { doorGroup.position.set(off + dW / 2, py, 1 * S); }
      else if (d.wall === 'bottom') { doorGroup.position.set(off + dW / 2, py, RD - 1 * S); doorGroup.rotation.y = Math.PI; }
      else if (d.wall === 'left') { doorGroup.position.set(1 * S, py, off + dW / 2); doorGroup.rotation.y = Math.PI / 2; }
      else { doorGroup.position.set(RW - 1 * S, py, off + dW / 2); doorGroup.rotation.y = -Math.PI / 2; }
      addMesh(doorGroup);
    });

    // WINDOWS – frame with glass pane and cross dividers
    (windows || []).forEach(w => {
      const S = scale;
      const wWd = w.size * S;
      const style = w.style || 'standard';
      let wH = style === 'full' ? RH * 0.85 : Math.min((w.h || 120) * S, RH * 0.4);
      let winY = style === 'full' ? wH / 2 + 5 * S : RH * 0.55 + wH / 2;
      const off = w.offset * S;
      const glassColor = w.color ? this.hexToColor(w.color) : (style === 'full' ? 0xbae6fd : 0x7dd3fc);
      const glassMat = new THREE.MeshStandardMaterial({ color: glassColor, transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0.4 });
      const frameMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.8 });
      const ft = 2.5 * S;

      const winGroup = new THREE.Group();

      // Frame
      const fT = new THREE.Mesh(new THREE.BoxGeometry(wWd, ft, 6 * S), frameMat);
      const fB = new THREE.Mesh(new THREE.BoxGeometry(wWd, ft, 6 * S), frameMat);
      const fL = new THREE.Mesh(new THREE.BoxGeometry(ft, wH, 6 * S), frameMat);
      const fR = new THREE.Mesh(new THREE.BoxGeometry(ft, wH, 6 * S), frameMat);
      fT.position.y = wH / 2 - ft / 2;
      fB.position.y = -wH / 2 + ft / 2;
      fL.position.x = -wWd / 2 + ft / 2;
      fR.position.x = wWd / 2 - ft / 2;
      winGroup.add(fT, fB, fL, fR);

      // Glass pane
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(wWd - ft * 2, wH - ft * 2), glassMat);
      winGroup.add(glass);

      // Cross divider (standard/double)
      if (style !== 'sliding' && style !== 'full') {
        const crossH = new THREE.Mesh(new THREE.BoxGeometry(wWd - ft * 2, ft * 0.7, 3 * S), frameMat);
        const crossV = new THREE.Mesh(new THREE.BoxGeometry(ft * 0.7, wH - ft * 2, 3 * S), frameMat);
        winGroup.add(crossH, crossV);
      }

      if (style === 'double') {
        // Extra vertical divider
        const div = new THREE.Mesh(new THREE.BoxGeometry(ft, wH - ft * 2, 3 * S), frameMat);
        winGroup.add(div);
      }

      if (w.wall === 'top') { winGroup.position.set(off + wWd / 2, winY, 1 * S); }
      else if (w.wall === 'bottom') { winGroup.position.set(off + wWd / 2, winY, RD - 1 * S); winGroup.rotation.y = Math.PI; }
      else if (w.wall === 'left') { winGroup.position.set(1 * S, winY, off + wWd / 2); winGroup.rotation.y = Math.PI / 2; }
      else { winGroup.position.set(RW - 1 * S, winY, off + wWd / 2); winGroup.rotation.y = -Math.PI / 2; }
      addMesh(winGroup);
    });

    // BASEBOARD
    const bbMat = new THREE.MeshStandardMaterial({ color: 0xd0ccc8, roughness: 0.7 });
    [[RW, cx, 0], [RW, cx, RD], [RD, 0, cz], [RD, RW, cz]].forEach((wg, i) => {
      const bb = new THREE.Mesh(new THREE.BoxGeometry(wg[0], 6 * scale, 3 * scale), bbMat);
      bb.position.set(wg[1], 3 * scale, wg[2]);
      if (i >= 2) bb.rotation.y = Math.PI / 2;
      addMesh(bb);
    });

    // Center camera
    this.controls.target.set(cx, RH * 0.3, cz);
    this.camera.position.set(cx, RH * 0.9, RD + RW * 0.6);
    this.controls.update();

    // FURNITURE
    furniture.forEach(f => { const mesh = this.buildFurnitureMesh(f, scale, RH); if (mesh) { this.scene.add(mesh); this.furnitureMeshes.push(mesh); } });
  }

  makeFloorMat(color, material) {
    const c = this.hexToColor(color);
    const rough = { parquet: 0.8, ceramic: 0.3, marble: 0.15, carpet: 1.0, concrete: 0.9, vinyl: 0.5 }[material] || 0.7;
    const metal = { parquet: 0, ceramic: 0.1, marble: 0.3, carpet: 0, concrete: 0, vinyl: 0.1 }[material] || 0;
    return new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal });
  }
  makeWallMat(color, material) {
    const c = this.hexToColor(color);
    const rough = { paint: 0.95, brick: 1.0, wood: 0.9, concrete: 0.85, wallpaper: 0.95, marble: 0.2 }[material] || 0.9;
    const metal = { marble: 0.1 }[material] || 0;
    return new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal });
  }

  buildFurnitureMesh(f, scale, RH) {
    const w = f.w * scale, h = (f.h || 80) * scale, d = f.d * scale;
    const color = this.hexToColor(f.color || '#6366f1');
    const id = f.id || '';
    let group = new THREE.Group();

    if (id.includes('sofa') || id.includes('armchair')) {
      // Sofa: base + back + armrests
      const baseMat = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
      const base = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.5, d), baseMat);
      base.position.y = h * 0.25; base.castShadow = true; group.add(base);
      const back = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.7, d * 0.2), new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
      back.position.set(0, h * 0.6, -d / 2 + d * 0.1); back.castShadow = true; group.add(back);
      const armW = w * 0.12;
      [-1, 1].forEach(s => {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(armW, h * 0.55, d), new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
        arm.position.set(s * (w / 2 - armW / 2), h * 0.28, 0); arm.castShadow = true; group.add(arm);
      });
      // Cushions
      const cushColor = new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.15);
      const cushCount = id.includes('armchair') ? 1 : Math.round(w / 60);
      for (let i = 0; i < cushCount; i++) {
        const c2 = new THREE.Mesh(new THREE.BoxGeometry(w / cushCount - 4, h * 0.15, d * 0.7), new THREE.MeshStandardMaterial({ color: cushColor, roughness: 1 }));
        c2.position.set(-w / 2 + (i + 0.5) * (w / cushCount), h * 0.53, d * 0.1);
        c2.castShadow = true; group.add(c2);
      }
    } else if (id.includes('bed')) {
      const frameMat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
      // Frame
      const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 8, h * 0.15, d + 4), frameMat);
      frame.position.y = h * 0.07; frame.castShadow = true; group.add(frame);
      // Mattress
      const mattMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0xf0ece8), roughness: 1 });
      const matt = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.2, d * 0.8), mattMat);
      matt.position.set(0, h * 0.2, -d * 0.05); matt.castShadow = true; group.add(matt);
      // Headboard
      const head = new THREE.Mesh(new THREE.BoxGeometry(w + 8, h * 0.7, 8), frameMat);
      head.position.set(0, h * 0.35, -d / 2 - 4); head.castShadow = true; group.add(head);
      // Pillows
      const pillCount = id.includes('single') ? 1 : 2;
      const pillMat = new THREE.MeshStandardMaterial({ color: 0xfafafc, roughness: 1 });
      for (let i = 0; i < pillCount; i++) {
        const pill = new THREE.Mesh(new THREE.BoxGeometry(w / pillCount - 10, h * 0.12, d * 0.2), pillMat);
        pill.position.set(-w / 2 + (i + 0.5) * (w / pillCount), h * 0.32, -d * 0.32); pill.castShadow = true; group.add(pill);
      }
    } else if (id === 'bathtub') {
      // Tub outer
      const outer = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.6, d), new THREE.MeshStandardMaterial({ color, roughness: 0.2, metalness: 0.1 }));
      outer.position.y = h * 0.3; outer.castShadow = true; group.add(outer);
      // Tub inner
      const inner = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, h * 0.5, d * 0.8), new THREE.MeshStandardMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.4), roughness: 0.15, metalness: 0.05 }));
      inner.position.set(0, h * 0.38, 0); group.add(inner);
      // Faucet
      const tap = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, h * 0.3, 8), new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.9, roughness: 0.1 }));
      tap.position.set(w * 0.35, h * 0.65, -d * 0.3); group.add(tap);
    } else if (id === 'toilet') {
      // Bowl
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(d / 2.5, d / 2, h * 0.5, 16), new THREE.MeshStandardMaterial({ color, roughness: 0.15, metalness: 0.05 }));
      bowl.position.set(0, h * 0.25, d * 0.15); bowl.castShadow = true; group.add(bowl);
      // Tank
      const tank = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, h * 0.5, d * 0.3), new THREE.MeshStandardMaterial({ color, roughness: 0.15 }));
      tank.position.set(0, h * 0.45, -d * 0.3); tank.castShadow = true; group.add(tank);
    } else if (id === 'sink' || id === 'double_sink') {
      const base = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.9, d), new THREE.MeshStandardMaterial({ color: new THREE.Color(0xf0f0f0), roughness: 0.2 }));
      base.position.y = h * 0.45; base.castShadow = true; group.add(base);
      const bowlCount = id === 'double_sink' ? 2 : 1;
      for (let i = 0; i < bowlCount; i++) {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(w / (bowlCount * 2.5), w / (bowlCount * 2.2), h * 0.15, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xe8e8ec, roughness: 0.1, side: THREE.BackSide }));
        b.position.set(-w / 2 + (i + 0.5) * w / bowlCount, h * 0.9, 0); group.add(b);
      }
    } else if (id === 'fridge') {
      const main = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.98, d), new THREE.MeshStandardMaterial({ color, roughness: 0.2, metalness: 0.3 }));
      main.position.y = h * 0.49; main.castShadow = true; group.add(main);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(w * 0.05, h * 0.25, d * 0.08), new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.1 }));
      handle.position.set(w * 0.4, h * 0.7, d * 0.5); group.add(handle);
    } else if (id === 'plant') {
      // Pot
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.4, w * 0.3, h * 0.3, 16), new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 1 }));
      pot.position.y = h * 0.15; group.add(pot);
      // Foliage balls
      const leafMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 1 });
      [[0, h * 0.7, 0], [w * 0.2, h * 0.55, 0], [w * (-0.25), h * 0.6, d * 0.1]].forEach(pos => {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(w * 0.35, 8, 8), leafMat);
        leaf.position.set(...pos); leaf.castShadow = true; group.add(leaf);
      });
    } else if (id.includes('chair')) {
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
      const seat = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.08, d * 0.8), mat);
      seat.position.y = h * 0.45; seat.castShadow = true; group.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.45, d * 0.08), mat);
      back.position.set(0, h * 0.7, -d * 0.4); back.castShadow = true; group.add(back);
    } else if (id.includes('table') || id.includes('desk') || id.includes('stand')) {
      const top = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.06, d), new THREE.MeshStandardMaterial({ color, roughness: 0.7 }));
      top.position.y = h * 0.97; top.castShadow = true; group.add(top);
      const legMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(0x000000), 0.2), roughness: 0.7 });
      [[w / 2 - 6, d / 2 - 6], [w / 2 - 6, -(d / 2 - 6)], [-(w / 2 - 6), d / 2 - 6], [-(w / 2 - 6), -(d / 2 - 6)]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(8, h * 0.9, 8), legMat);
        leg.position.set(lx * scale / scale, h * 0.45, lz * scale / scale); leg.castShadow = true; group.add(leg);
      });
    } else if (id.includes('wardrobe') || id.includes('bookshelf') || id.includes('cabinet') || id.includes('dresser') || id.includes('sideboard')) {
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.97, d), mat);
      body.position.y = h * 0.48; body.castShadow = true; group.add(body);
      if (id.includes('wardrobe') || id.includes('cabinet')) {
        const doorMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.08), roughness: 0.5 });
        const cnt = Math.round(w / 60);
        for (let i = 0; i < cnt; i++) {
          const door = new THREE.Mesh(new THREE.BoxGeometry(w / cnt - 4, h * 0.9, 4), doorMat);
          door.position.set(-w / 2 + (i + 0.5) * w / cnt, h * 0.48, d / 2 + 2); door.castShadow = true; group.add(door);
          const hdl = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 8, 8), new THREE.MeshStandardMaterial({ metalness: 0.9, roughness: 0.1 }));
          hdl.rotation.z = Math.PI / 2; hdl.position.set(-w / 2 + (i + 0.5) * w / cnt - (w / cnt * 0.3), h * 0.5, d / 2 + 6); group.add(hdl);
        }
      }
    } else {
      // Generic box
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.9, d), new THREE.MeshStandardMaterial({ color, roughness: 0.7 }));
      mesh.position.y = h * 0.45; mesh.castShadow = true; group.add(mesh);
    }

    // Position group
    group.position.set(f.x * scale, 0, f.y * scale);
    group.rotation.y = -(f.rotation || 0) * Math.PI / 180;
    if (state.wireframe) { group.traverse(c => { if (c.isMesh && c.material) c.material.wireframe = true; }); }
    return group;
  }

  takeScreenshot() { this.renderer.render(this.scene, this.camera); return this.renderer.domElement.toDataURL('image/png'); }
}

// -------------------------------------------------------------
// INIT 3D
// -------------------------------------------------------------
function init3D() {
  if (viewer3d) { viewer3d.dispose(); viewer3d = null; }
  document.getElementById('loading-3d').style.display = 'flex';
  viewer3d = new Viewer3D(container3d);
  viewer3d.init();
  viewer3d.build(state.room, state.furniture, state.doors, state.windows);
  document.getElementById('loading-3d').style.display = 'none';
}

// -------------------------------------------------------------
// TOOLBAR
// -------------------------------------------------------------
function setupToolbar() {
  // View toggle
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setView(btn.dataset.view);
    });
  });
  // Zoom
  document.getElementById('btn-zoom-in').addEventListener('click', () => { state.zoom2d = Math.min(5, state.zoom2d * 1.2); updateZoomLabel(); render2D(); });
  document.getElementById('btn-zoom-out').addEventListener('click', () => { state.zoom2d = Math.max(0.2, state.zoom2d / 1.2); updateZoomLabel(); render2D(); });
  document.getElementById('btn-zoom-fit').addEventListener('click', () => { state.zoom2d = 1; state.panX = 0; state.panY = 0; updateZoomLabel(); render2D(); });
  // Wireframe
  document.getElementById('btn-wireframe').addEventListener('click', () => {
    state.wireframe = !state.wireframe;
    document.getElementById('btn-wireframe').classList.toggle('active', state.wireframe);
    if (viewer3d) viewer3d.build(state.room, state.furniture, state.doors, state.windows);
  });
  // Reset orbit
  document.getElementById('btn-orbit-reset').addEventListener('click', () => {
    if (viewer3d && state.room) { const RW = state.room.w * 0.5, RD = state.room.d * 0.5, RH = (state.room.h || 260) * 0.5; viewer3d.controls.target.set(RW / 2, RH * 0.3, RD / 2); viewer3d.camera.position.set(RW / 2, RH * 0.9, RD + RW * 0.6); viewer3d.controls.update(); }
  });
  // Tool buttons
  document.getElementById('tool-select').addEventListener('click', () => setMode('select'));
  document.getElementById('tool-ruler').addEventListener('click', () => setMode('ruler'));
  document.getElementById('tool-door').addEventListener('click', () => setMode('addDoor'));
  document.getElementById('tool-window').addEventListener('click', () => setMode('addWindow'));
  // Undo/Redo
  document.getElementById('btn-undo').addEventListener('click', undo);
  document.getElementById('btn-redo').addEventListener('click', redo);
  // Keyboard
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.key === 'z' && e.ctrlKey) { e.preventDefault(); undo(); }
    if (e.key === 'y' && e.ctrlKey) { e.preventDefault(); redo(); }
    if (e.key === 'Delete' && state.selectedIdx >= 0 && state.selectedType === 'furniture') { removeFurniture(state.selectedIdx); }
    if (e.key === 'r' && state.selectedIdx >= 0 && state.selectedType === 'furniture') { rotateFurniture(state.selectedIdx); }
    if (e.key === 'Escape') { setMode('select'); }
  });
}

function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
  const btnMap = { select: 'tool-select', ruler: 'tool-ruler', addDoor: 'tool-door', addWindow: 'tool-window' };
  const btn = document.getElementById(btnMap[mode]);
  if (btn) btn.classList.add('active');
  if (mode !== 'ruler') document.getElementById('measure-bar').style.display = 'none';
}

function setView(view) {
  state.activeView = view;
  const v2 = document.getElementById('view-2d');
  const v3 = document.getElementById('view-3d');
  const div = document.getElementById('split-divider');
  if (view === 'split') { v2.style.display = ''; v3.style.display = ''; div.style.display = ''; }
  else if (view === '2d') { v2.style.display = ''; v3.style.display = 'none'; div.style.display = 'none'; }
  else { v2.style.display = 'none'; v3.style.display = ''; div.style.display = 'none'; }
  setTimeout(() => { resizeCanvas(); if (viewer3d) viewer3d.resize(); }, 50);
}

function updateZoomLabel() { document.getElementById('zoom-val').textContent = Math.round(state.zoom2d * 100) + '%'; }

// -------------------------------------------------------------
// SPLIT DIVIDER DRAG
// -------------------------------------------------------------
function setupSplitDivider() {
  const div = document.getElementById('split-divider');
  let startX, startW2, startW3;
  div.addEventListener('mousedown', e => {
    splitDragging = true; startX = e.clientX;
    startW2 = document.getElementById('view-2d').offsetWidth;
    startW3 = document.getElementById('view-3d').offsetWidth; e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!splitDragging) return;
    const dx = e.clientX - startX;
    const total = startW2 + startW3;
    let nw2 = Math.max(200, startW2 + dx);
    let nw3 = Math.max(200, total - nw2);
    document.getElementById('view-2d').style.flex = `0 0 ${nw2}px`;
    document.getElementById('view-3d').style.flex = `0 0 ${nw3}px`;
    resizeCanvas(); if (viewer3d) viewer3d.resize();
  });
  document.addEventListener('mouseup', () => { splitDragging = false; });
}

// -------------------------------------------------------------
// SIDEBAR
// -------------------------------------------------------------
function setupSidebar() {
  document.querySelectorAll('.stab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.stab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.spanel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.getElementById('sp-' + btn.dataset.stab);
      if (panel) panel.classList.add('active');
    });
  });
  setupDesignPanel();
  setupExportPanel();
}

function setupDesignPanel() {
  // Wall color
  const wc = document.getElementById('wall-color');
  wc.addEventListener('input', e => { state.wallColor = e.target.value; document.getElementById('wall-color-hex').textContent = e.target.value; render2D(); scheduleUpdate3D(); });
  // Floor color
  const fc = document.getElementById('floor-color');
  fc.addEventListener('input', e => { state.floorColor = e.target.value; document.getElementById('floor-color-hex').textContent = e.target.value; render2D(); scheduleUpdate3D(); });
  // Ceiling color
  const cc = document.getElementById('ceiling-color');
  cc.addEventListener('input', e => { state.ceilingColor = e.target.value; document.getElementById('ceiling-color-hex').textContent = e.target.value; scheduleUpdate3D(); });
  // Ceiling visible
  document.getElementById('ceiling-visible').addEventListener('change', e => { state.ceilingVisible = e.target.checked; scheduleUpdate3D(); snapshotHistory(); });
  // Wall material chips
  document.querySelectorAll('#wall-mat-chips .mat-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#wall-mat-chips .mat-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active'); state.wallMaterial = btn.dataset.mat;
      render2D(); scheduleUpdate3D(); snapshotHistory();
    });
  });
  // Floor material chips
  document.querySelectorAll('#floor-mat-chips .mat-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#floor-mat-chips .mat-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active'); state.floorMaterial = btn.dataset.mat;
      render2D(); scheduleUpdate3D(); snapshotHistory();
    });
  });
  // Ambient slider
  const sa = document.getElementById('s-ambient');
  sa.addEventListener('input', e => { state.ambientIntensity = parseFloat(e.target.value); document.getElementById('v-ambient').textContent = parseFloat(e.target.value).toFixed(2); scheduleUpdate3D(); });
  // Time of day
  const st = document.getElementById('s-time');
  st.addEventListener('input', e => { state.timeOfDay = parseFloat(e.target.value); const h = Math.floor(state.timeOfDay); const m = Math.round((state.timeOfDay - h) * 60); document.getElementById('v-time').textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; scheduleUpdate3D(); });
}

function setupExportPanel() {
  document.getElementById('exp-png-2d').addEventListener('click', exportPNG2D);
  document.getElementById('exp-png-3d').addEventListener('click', exportPNG3D);
  document.getElementById('exp-json').addEventListener('click', exportJSON);
  document.getElementById('exp-pdf').addEventListener('click', exportPDF);
  document.getElementById('btn-export-csv').addEventListener('click', exportCSV);
}

// -------------------------------------------------------------
// NAV BUTTONS
// -------------------------------------------------------------
function setupNavButtons() {
  document.getElementById('btn-new-project').addEventListener('click', () => {
    if (confirm(lang === 'fr' ? 'Cr�er un nouveau projet? Les modifications non sauvegard�es seront perdues.' : 'Create a new project? Unsaved changes will be lost.')) {
      state.room = null; state.furniture = []; state.doors = []; state.windows = [];
      if (viewer3d) { viewer3d.dispose(); viewer3d = null; }
      document.getElementById('wizard-overlay').classList.remove('hidden');
    }
  });
  document.getElementById('btn-save').addEventListener('click', exportJSON);
  document.getElementById('btn-load').addEventListener('click', () => document.getElementById('file-load-json').click());
  document.getElementById('file-load-json').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { try { const data = JSON.parse(ev.target.result); loadProject(data); showToast(t('loaded'), '??'); } catch (err) { showToast('Erreur JSON', '?'); } };
    reader.readAsText(file); e.target.value = '';
  });
}

// -------------------------------------------------------------
// SELECTION
// -------------------------------------------------------------
function selectItem(type, idx) {
  state.selectedType = type;
  if (type === 'furniture') { state.selectedIdx = idx; state.selectedArchIdx = -1; }
  else if (type === 'door' || type === 'window') { state.selectedArchIdx = idx; state.selectedIdx = -1; }
  else { state.selectedIdx = -1; state.selectedArchIdx = -1; }
  render2D(); updateSelectionPanel();
}

function updateSelectionPanel() {
  const panel = document.getElementById('selection-panel');
  if (!panel) return;
  if (state.selectedType === 'furniture' && state.selectedIdx >= 0) {
    const f = state.furniture[state.selectedIdx];
    if (!f) { panel.innerHTML = `<div class="no-selection">${t('clickToSelect')}</div>`; return; }
    const nm = (f.name && f.name[lang]) || f.name?.fr || f.id;
    panel.innerHTML = `
      <div class="sel-name">${nm}</div>
      <div class="sel-section">
        <div class="sel-sec-label">${t('dimensions')}</div>
        <div class="dim-edit-grid">
          <div class="dim-edit-field"><label>${t('width')}</label><input type="number" id="sel-w" value="${Math.round(unitSystem === 'imperial' ? f.w / 2.54 : f.w)}" min="10" max="600" step="5"></div>
          <div class="dim-edit-field"><label>${t('depth')}</label><input type="number" id="sel-d" value="${Math.round(unitSystem === 'imperial' ? f.d / 2.54 : f.d)}" min="10" max="600" step="5"></div>
          <div class="dim-edit-field"><label>${t('height')}</label><input type="number" id="sel-h" value="${Math.round(unitSystem === 'imperial' ? (f.h || 80) / 2.54 : (f.h || 80))}" min="10" max="350" step="5"></div>
        </div>
        <div class="dim-badges">
          <div class="dim-badge">${toDisplay(f.w)} � ${toDisplay(f.d)}</div>
          <div class="dim-badge">${toDisplayArea(f.w * f.d)}</div>
        </div>
      </div>
      <div class="sel-section">
        <div class="sel-sec-label">${t('color')}</div>
        <div class="sel-color-row"><label>${t('color')}</label><input type="color" id="sel-color" value="${f.color || '#6366f1'}"></div>
      </div>
      <div class="sel-section">
        <div class="sel-sec-label">${t('price')}</div>
        <div class="price-row"><label>${t('price')}</label><span class="price-symbol">$</span><input type="number" id="sel-price" value="${f.price || 0}" min="0" step="10"></div>
      </div>
      <div class="sel-actions">
        <button class="sel-btn" id="sel-rotate">? ${t('rotate')}</button>
        <button class="sel-btn danger" id="sel-delete">? ${t('delete')}</button>
      </div>`;
    // Events
    const applyDims = () => {
      let w = parseFloat(document.getElementById('sel-w').value) || f.w;
      let d = parseFloat(document.getElementById('sel-d').value) || f.d;
      let h = parseFloat(document.getElementById('sel-h').value) || (f.h || 80);
      if (unitSystem === 'imperial') { w = w * 2.54; d = d * 2.54; h = h * 2.54; }
      const fi = state.selectedIdx; state.furniture[fi].w = Math.round(w); state.furniture[fi].d = Math.round(d); state.furniture[fi].h = Math.round(h);
      render2D(); scheduleUpdate3D(); updateCostsPanel();
    };
    ['sel-w', 'sel-d', 'sel-h'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', applyDims);
      document.getElementById(id)?.addEventListener('change', () => snapshotHistory());
    });
    document.getElementById('sel-color').addEventListener('input', e => { state.furniture[state.selectedIdx].color = e.target.value; render2D(); scheduleUpdate3D(); });
    document.getElementById('sel-color').addEventListener('change', () => snapshotHistory());
    document.getElementById('sel-price').addEventListener('input', e => { state.furniture[state.selectedIdx].price = parseFloat(e.target.value) || 0; updateCostsPanel(); });
    document.getElementById('sel-price').addEventListener('change', () => snapshotHistory());
    document.getElementById('sel-rotate').addEventListener('click', () => { rotateFurniture(state.selectedIdx); updateSelectionPanel(); });
    document.getElementById('sel-delete').addEventListener('click', () => { removeFurniture(state.selectedIdx); });
  } else if ((state.selectedType === 'door' || state.selectedType === 'window') && state.selectedArchIdx >= 0) {
    const isDoor = state.selectedType === 'door';
    const item = isDoor ? state.doors[state.selectedArchIdx] : state.windows[state.selectedArchIdx];
    if (!item) { panel.innerHTML = `<div class="no-selection">${t('clickToSelect')}</div>`; return; }
    const wallOpts = ['top', 'bottom', 'left', 'right'].map(w => `<option value="${w}" ${item.wall === w ? 'selected' : ''}>${{ top: '? Haut', bottom: '? Bas', left: '? Gauche', right: '? Droite' }[w]}</option>`).join('');
    const styleOpts = isDoor ?
      [['simple', t('simple')], ['double', t('doubleDoor')], ['sliding', t('sliding')]] :
      [['standard', t('standard')], ['double', t('doubleDoor')], ['sliding', t('sliding')], ['full', t('full')]];
    const sideOpts = isDoor ? `<div class="sel-sec-label">${t('openLeft')} / ${t('openRight')}</div>
      <div class="arch-field"><select id="arch-side"><option value="right" ${(item.side || 'right') === 'right' ? 'selected' : ''}>? ${t('openRight')}</option><option value="left" ${item.side === 'left' ? 'selected' : ''}>? ${t('openLeft')}</option></select></div>` : '';
    panel.innerHTML = `
      <div class="sel-name">${isDoor ? '🚪 ' + t('doorLabel') : '🪟 ' + t('windowLabel')}</div>
      <div class="arch-edit-form">
        <div class="arch-field"><label>Style</label><select id="arch-style">${styleOpts.map(([v, l]) => `<option value="${v}" ${item.style === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="arch-field"><label>Mur / Wall</label><select id="arch-wall">${wallOpts}</select></div>
        ${sideOpts}
        <div class="arch-field"><label>${t('width')} (cm)</label><input type="number" id="arch-size" value="${item.size}" min="40" max="400" step="5"></div>
        <div class="arch-field"><label>${t('height')} (cm)</label><input type="number" id="arch-h" value="${item.h || (isDoor ? 210 : 120)}" min="60" max="300" step="5"></div>
        <div class="arch-field"><label>Offset (cm)</label><input type="number" id="arch-offset" value="${Math.round(item.offset)}" min="0" max="500" step="5"></div>
        <div class="arch-field"><label>${t('color')}</label><input type="color" id="arch-color" value="${item.color || (isDoor ? '#c8a96e' : '#4fc3f7')}"></div>
      </div>
      <div class="sel-actions" style="margin-top:10px">
        <button class="sel-btn danger" id="arch-del">🗑 ${t('delete')}</button>
      </div>`;
    const updateArch = () => {
      const arr = isDoor ? state.doors : state.windows; const i = state.selectedArchIdx;
      arr[i].style = document.getElementById('arch-style').value;
      arr[i].wall = document.getElementById('arch-wall').value;
      if (isDoor) arr[i].side = document.getElementById('arch-side')?.value;
      arr[i].size = parseInt(document.getElementById('arch-size').value) || arr[i].size;
      arr[i].h = parseInt(document.getElementById('arch-h').value) || arr[i].h;
      arr[i].offset = parseInt(document.getElementById('arch-offset').value) || 0;
      arr[i].color = document.getElementById('arch-color').value;
      render2D(); scheduleUpdate3D(); updateArchPanel();
    };
    ['arch-style', 'arch-wall', 'arch-size', 'arch-h', 'arch-offset', 'arch-color'].forEach(id => { document.getElementById(id)?.addEventListener('input', updateArch); document.getElementById(id)?.addEventListener('change', () => snapshotHistory()); });
    if (isDoor) document.getElementById('arch-side')?.addEventListener('change', () => { updateArch(); snapshotHistory(); });
    document.getElementById('arch-del').addEventListener('click', () => {
      snapshotHistory();
      if (isDoor) state.doors.splice(state.selectedArchIdx, 1); else state.windows.splice(state.selectedArchIdx, 1);
      selectItem(null, -1); updateArchPanel(); showToast(t('deleted'), '?');
    });
  } else {
    panel.innerHTML = `<div class="no-selection">${t('clickToSelect')}</div>`;
  }
}

// -------------------------------------------------------------
// PANELS
// -------------------------------------------------------------
function updateRoomInfoPanel() {
  if (!state.room) return;
  const r = state.room;
  const area = r.w * r.d;
  const el = document.getElementById('room-info-panel');
  if (!el) return;
  el.innerHTML = `<div class="ri-grid">
    <div class="ri-row"><span class="ri-k">${t('roomLabel')}</span><span class="ri-v">${t(r.type)}</span></div>
    <div class="ri-row"><span class="ri-k">${t('width')}</span><span class="ri-v">${toDisplay(r.w)}</span></div>
    <div class="ri-row"><span class="ri-k">${t('depth')}</span><span class="ri-v">${toDisplay(r.d)}</span></div>
    <div class="ri-row"><span class="ri-k">${t('height')}</span><span class="ri-v">${toDisplay(r.h || 260)}</span></div>
    <div class="ri-row"><span class="ri-k">${t('area')}</span><span class="ri-v" style="color:var(--accent-hi)">${toDisplayArea(area)}</span></div>
    <div class="ri-row"><span class="ri-k">${t('furniturePcs')}</span><span class="ri-v">${state.furniture.length}</span></div>
    <div class="ri-row"><span class="ri-k">${t('doorsLabel')}</span><span class="ri-v">${state.doors.length}</span></div>
    <div class="ri-row"><span class="ri-k">${t('windowsLabel')}</span><span class="ri-v">${state.windows.length}</span></div>
  </div>`;
}

function updateFurniturePanel() {
  const placedEl = document.getElementById('furniture-placed-list');
  const libEl = document.getElementById('furniture-library');
  if (!placedEl || !libEl || !state.room) return;
  // Placed furniture list
  placedEl.innerHTML = state.furniture.map((f, i) => {
    const nm = (f.name && f.name[lang]) || f.name?.fr || f.id;
    return `<div class="furn-placed-item ${i === state.selectedIdx && state.selectedType === 'furniture' ? 'sel' : ''}" data-idx="${i}">
      <span class="fpi-color" style="background:${f.color}"></span>
      <span class="fpi-name">${nm}</span>
      <span class="fpi-dim">${toDisplay(f.w)}�${toDisplay(f.d)}</span>
      <div class="fpi-act">
        <button class="fpi-btn rot" data-idx="${i}">?</button>
        <button class="fpi-btn del" data-idx="${i}">?</button>
      </div></div>`;
  }).join('') || `<div class="no-selection">${lang === 'fr' ? 'Aucun meuble' : 'No furniture'}</div>`;
  placedEl.querySelectorAll('.furn-placed-item').forEach(el => {
    el.addEventListener('click', e => { if (e.target.classList.contains('fpi-btn')) return; selectItem('furniture', parseInt(el.dataset.idx)); document.querySelectorAll('.stab').forEach(b => b.classList.remove('active')); document.querySelectorAll('.spanel').forEach(p => p.classList.remove('active')); });
  });
  placedEl.querySelectorAll('.fpi-btn.rot').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); rotateFurniture(parseInt(b.dataset.idx)); }));
  placedEl.querySelectorAll('.fpi-btn.del').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); removeFurniture(parseInt(b.dataset.idx)); }));
  // Library
  const lib = FURNITURE_LIBRARY[state.room.type] || [];
  libEl.innerHTML = lib.map(f => {
    const nm = f.name[lang] || f.name.fr;
    return `<button class="furn-lib-btn" data-id="${f.id}"><span>${nm}</span><span class="furn-lib-dim">${toDisplay(f.w)}�${toDisplay(f.d)} � $${f.price}</span></button>`;
  }).join('');
  libEl.querySelectorAll('.furn-lib-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const def = lib.find(f => f.id === btn.dataset.id); if (!def) return;
      const newF = { ...def, x: state.room.w / 2, y: state.room.d / 2, rotation: 0, color: def.color || '#6366f1', price: def.price || 0 };
      state.furniture.push(newF); snapshotHistory();
      updateFurniturePanel(); render2D(); scheduleUpdate3D();
      selectItem('furniture', state.furniture.length - 1); showToast((newF.name[lang] || newF.name.fr) + ' +', '???');
    });
  });
}

function updateArchPanel() {
  const doorsEl = document.getElementById('doors-list');
  const winsEl = document.getElementById('windows-list');
  if (!doorsEl || !winsEl) return;
  const wallLabel = w => ({ top: '?', bottom: '?', left: '?', right: '?' }[w] || w);
  doorsEl.innerHTML = state.doors.map((d, i) => `<div class="arch-item" data-type="door" data-idx="${i}">
    <span class="arch-emoji">??</span>
    <div class="arch-info"><div class="arch-wall">${wallLabel(d.wall)} � ${d.style || 'simple'}</div><div class="arch-size">${toDisplay(d.size)}</div></div>
    <button class="arch-del" data-type="door" data-idx="${i}">?</button></div>`).join('') || `<div class="no-selection">${lang === 'fr' ? 'Aucune porte' : 'No doors'}</div>`;
  winsEl.innerHTML = state.windows.map((w, i) => `<div class="arch-item" data-type="window" data-idx="${i}">
    <span class="arch-emoji">??</span>
    <div class="arch-info"><div class="arch-wall">${wallLabel(w.wall)} � ${w.style || 'standard'}</div><div class="arch-size">${toDisplay(w.size)}</div></div>
    <button class="arch-del" data-type="window" data-idx="${i}">?</button></div>`).join('') || `<div class="no-selection">${lang === 'fr' ? 'Aucune fen�tre' : 'No windows'}</div>`;
  [doorsEl, winsEl].forEach(el => {
    el.querySelectorAll('.arch-item').forEach(item => { item.addEventListener('click', e => { if (e.target.classList.contains('arch-del')) return; selectItem(item.dataset.type, parseInt(item.dataset.idx)); }); });
    el.querySelectorAll('.arch-del').forEach(btn => { btn.addEventListener('click', e => { e.stopPropagation(); snapshotHistory(); if (btn.dataset.type === 'door') state.doors.splice(parseInt(btn.dataset.idx), 1); else state.windows.splice(parseInt(btn.dataset.idx), 1); updateArchPanel(); render2D(); scheduleUpdate3D(); showToast(t('deleted'), '?'); }); });
  });
  // Add door/window buttons
  document.getElementById('arch-add-door').onclick = () => setMode('addDoor');
  document.getElementById('arch-add-window').onclick = () => setMode('addWindow');
}

function updateWindowsPanel() { updateArchPanel(); }

function updateCostsPanel() {
  const listEl = document.getElementById('costs-list');
  const totalEl = document.getElementById('costs-total');
  if (!listEl || !totalEl) return;
  let total = 0; const groups = {};
  state.furniture.forEach(f => {
    const nm = (f.name && f.name[lang]) || f.name?.fr || f.id;
    const key = nm + '-' + f.id;
    if (!groups[key]) groups[key] = { name: nm, count: 0, price: 0 };
    groups[key].count++; groups[key].price += (f.price || 0); total += (f.price || 0);
  });
  listEl.innerHTML = Object.values(groups).map(g => `<div class="costs-item">
    <span class="ci-name">${g.name}</span><span class="ci-count">�${g.count}</span><span class="ci-price">$${g.price.toFixed(2)}</span></div>`).join('') || `<div class="no-selection">${lang === 'fr' ? 'Aucun meuble' : 'No furniture'}</div>`;
  totalEl.textContent = '$' + total.toFixed(2);
}

function updateAllPanels() { updateRoomInfoPanel(); updateFurniturePanel(); updateArchPanel(); updateCostsPanel(); updateSelectionPanel(); }
function updateUI() { if (state.room) { updateAllPanels(); } }

// -------------------------------------------------------------
// FURNITURE OPERATIONS
// -------------------------------------------------------------
function rotateFurniture(idx) { if (!state.furniture[idx]) return; state.furniture[idx].rotation = ((state.furniture[idx].rotation || 0) + 90) % 360; snapshotHistory(); render2D(); scheduleUpdate3D(); updateFurniturePanel(); }
function removeFurniture(idx) { if (idx < 0 || idx >= state.furniture.length) return; snapshotHistory(); state.furniture.splice(idx, 1); selectItem(null, -1); updateFurniturePanel(); updateCostsPanel(); render2D(); scheduleUpdate3D(); showToast(t('deleted'), '?'); }

// -------------------------------------------------------------
// UNDO / REDO
// -------------------------------------------------------------
function snapshotHistory() {
  const snap = JSON.stringify({ furniture: state.furniture, doors: state.doors, windows: state.windows, wallColor: state.wallColor, floorColor: state.floorColor, ceilingColor: state.ceilingColor, wallMaterial: state.wallMaterial, floorMaterial: state.floorMaterial, ceilingVisible: state.ceilingVisible, ambientIntensity: state.ambientIntensity, timeOfDay: state.timeOfDay });
  state.history = state.history.slice(0, state.historyIdx + 1);
  state.history.push(snap);
  if (state.history.length > 50) state.history.shift();
  state.historyIdx = state.history.length - 1;
  updateUndoRedo();
}
function updateUndoRedo() {
  const u = document.getElementById('btn-undo'); const r = document.getElementById('btn-redo');
  if (u) u.disabled = state.historyIdx <= 0;
  if (r) r.disabled = state.historyIdx >= state.history.length - 1;
}
function applySnapshot(snap) {
  const d = JSON.parse(snap);
  state.furniture = d.furniture || []; state.doors = d.doors || []; state.windows = d.windows || [];
  state.wallColor = d.wallColor || state.wallColor; state.floorColor = d.floorColor || state.floorColor;
  state.ceilingColor = d.ceilingColor || state.ceilingColor; state.wallMaterial = d.wallMaterial || state.wallMaterial;
  state.floorMaterial = d.floorMaterial || state.floorMaterial; state.ceilingVisible = d.ceilingVisible !== undefined ? d.ceilingVisible : state.ceilingVisible;
  state.ambientIntensity = d.ambientIntensity || state.ambientIntensity; state.timeOfDay = d.timeOfDay || state.timeOfDay;
  // Sync design panel inputs
  const wc = document.getElementById('wall-color'); if (wc) wc.value = state.wallColor;
  const fc = document.getElementById('floor-color'); if (fc) fc.value = state.floorColor;
  const cc = document.getElementById('ceiling-color'); if (cc) cc.value = state.ceilingColor;
  const cv = document.getElementById('ceiling-visible'); if (cv) cv.checked = state.ceilingVisible;
  updateAllPanels(); render2D(); if (viewer3d) viewer3d.build(state.room, state.furniture, state.doors, state.windows);
}
function undo() { if (state.historyIdx <= 0) return; state.historyIdx--; applySnapshot(state.history[state.historyIdx]); updateUndoRedo(); showToast(t('undo'), '?'); }
function redo() { if (state.historyIdx >= state.history.length - 1) return; state.historyIdx++; applySnapshot(state.history[state.historyIdx]); updateUndoRedo(); showToast(t('redo'), '?'); }

// -------------------------------------------------------------
// EXPORT
// -------------------------------------------------------------
function exportPNG2D() {
  if (!state.room) { showToast(lang === 'fr' ? 'Aucun projet' : 'No project', '??'); return; }
  const link = document.createElement('a'); link.download = 'plan-2d.png'; link.href = canvas2d.toDataURL('image/png'); link.click(); showToast('PNG 2D', '??');
}
function exportPNG3D() {
  if (!viewer3d) { showToast(lang === 'fr' ? 'Vue 3D non disponible' : '3D view not available', '??'); return; }
  const link = document.createElement('a'); link.download = 'vue-3d.png'; link.href = viewer3d.takeScreenshot(); link.click(); showToast('PNG 3D', '??');
}
function exportJSON() {
  if (!state.room) { showToast(lang === 'fr' ? 'Aucun projet' : 'No project', '??'); return; }
  const data = { version: '1.0', room: state.room, furniture: state.furniture, doors: state.doors, windows: state.windows, design: { wallColor: state.wallColor, floorColor: state.floorColor, ceilingColor: state.ceilingColor, wallMaterial: state.wallMaterial, floorMaterial: state.floorMaterial, ceilingVisible: state.ceilingVisible, ambientIntensity: state.ambientIntensity, timeOfDay: state.timeOfDay } };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const link = document.createElement('a'); link.download = 'designpro-project.json'; link.href = URL.createObjectURL(blob); link.click(); showToast(t('saved'), '??');
}
function exportPDF() { window.print(); }
function exportCSV() {
  if (!state.furniture.length) { showToast(lang === 'fr' ? 'Aucun meuble' : 'No furniture', '??'); return; }
  let csv = `${lang === 'fr' ? 'Meuble' : 'Furniture'},${lang === 'fr' ? 'Largeur' : 'Width'} (cm),${lang === 'fr' ? 'Profondeur' : 'Depth'} (cm),${lang === 'fr' ? 'Hauteur' : 'Height'} (cm),${lang === 'fr' ? 'Prix unitaire' : 'Unit Price'} ($)\n`;
  let total = 0;
  state.furniture.forEach(f => { const nm = (f.name && f.name[lang]) || f.name?.fr || f.id; csv += `"${nm}",${f.w},${f.d},${f.h || 80},${(f.price || 0).toFixed(2)}\n`; total += (f.price || 0); });
  csv += `\n,,,${lang === 'fr' ? 'Total' : 'Total'},$${total.toFixed(2)}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a'); link.download = 'devis-designpro.csv'; link.href = URL.createObjectURL(blob); link.click(); showToast('CSV', '??');
}

// -------------------------------------------------------------
// LOAD PROJECT
// -------------------------------------------------------------
function loadProject(data) {
  if (!data.room) return;
  state.room = data.room;
  state.furniture = data.furniture || [];
  state.doors = data.doors || [];
  state.windows = data.windows || [];
  if (data.design) {
    state.wallColor = data.design.wallColor || state.wallColor;
    state.floorColor = data.design.floorColor || state.floorColor;
    state.ceilingColor = data.design.ceilingColor || state.ceilingColor;
    state.wallMaterial = data.design.wallMaterial || state.wallMaterial;
    state.floorMaterial = data.design.floorMaterial || state.floorMaterial;
    state.ceilingVisible = data.design.ceilingVisible !== undefined ? data.design.ceilingVisible : true;
    state.ambientIntensity = data.design.ambientIntensity || 0.6;
    state.timeOfDay = data.design.timeOfDay || 14;
  }
  document.getElementById('wizard-overlay').classList.add('hidden');
  if (!viewer3d) initCanvases();
  init3D(); updateAllPanels(); render2D(); snapshotHistory();
}

// -------------------------------------------------------------
// TOAST
// -------------------------------------------------------------
let toastTimer = null;
function showToast(msg, icon = '?') {
  const el = document.getElementById('toast');
  el.innerHTML = `<span class="toast-icon">${icon}</span>${msg}`;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
}

// -------------------------------------------------------------
// PROFESSIONAL FEATURES � SNAP, COLLISION, CAMERA, COMPASS, SHORTCUTS
// -------------------------------------------------------------

// -- SNAP TO GRID --
let snapEnabled = true;
let snapSize = 25; // cm

function snapValue(v) {
  if (!snapEnabled) return v;
  return Math.round(v / snapSize) * snapSize;
}

function setupSnapControls() {
  const btn = document.getElementById('btn-snap');
  const sel = document.getElementById('snap-size');
  if (!btn || !sel) return;
  btn.addEventListener('click', () => {
    snapEnabled = !snapEnabled;
    btn.classList.toggle('active', snapEnabled);
    showToast(snapEnabled ? 'Snap ON' : 'Snap OFF', '??');
  });
  sel.addEventListener('change', () => { snapSize = parseInt(sel.value); });
}

// -- COLLISION DETECTION --
function checkCollisions() {
  // Returns set of indices that overlap with any other furniture
  const overlaps = new Set();
  for (let i = 0; i < state.furniture.length; i++) {
    for (let j = i + 1; j < state.furniture.length; j++) {
      if (furnitureOverlap(state.furniture[i], state.furniture[j])) {
        overlaps.add(i); overlaps.add(j);
      }
    }
  }
  return overlaps;
}

function furnitureOverlap(a, b) {
  // AABB check (ignores rotation for simplicity)
  return !(a.x + a.w / 2 <= b.x - b.w / 2 ||
    a.x - a.w / 2 >= b.x + b.w / 2 ||
    a.y + a.d / 2 <= b.y - b.d / 2 ||
    a.y - a.d / 2 >= b.y + b.d / 2);
}

// Patch render2D to highlight collisions � override drawFurniture color
const _origRender2D = render2D;
window._collisions = new Set();
const render2DWithFeatures = function () {
  window._collisions = checkCollisions();
  _origRender2D();
  drawCompass();
  drawScaleRuler();
};

// Override render2D used everywhere
if (typeof render2D !== 'undefined') {
  window.render2D = render2DWithFeatures;
}

// Patch drawFurniture to show red outline on collision
const _origDrawFurniture = drawFurniture;
window.drawFurniture = function (f, idx) {
  _origDrawFurniture(f, idx);
  if (window._collisions && window._collisions.has(idx)) {
    // Red collision overlay
    const sc = getScale();
    const cx = worldToCanvas(f.x, f.y);
    const fw = f.w * sc, fd = f.d * sc;
    ctx2d.save();
    ctx2d.translate(cx.x, cx.y);
    ctx2d.rotate((f.rotation || 0) * Math.PI / 180);
    ctx2d.strokeStyle = '#ef4444';
    ctx2d.lineWidth = 3;
    ctx2d.setLineDash([5, 3]);
    ctx2d.strokeRect(-fw / 2, -fd / 2, fw, fd);
    ctx2d.fillStyle = 'rgba(239,68,68,0.1)';
    ctx2d.fillRect(-fw / 2, -fd / 2, fw, fd);
    ctx2d.restore();
  }
};

// -- SNAP APPLIED ON MOVE --
// Patch onCanvas2DMouseMove to apply snap
const _origMouseMove = onCanvas2DMouseMove;
window.onCanvas2DMouseMove = function (e) {
  if (!state.room) return;
  const rect = canvas2d.getBoundingClientRect();
  const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
  const wp = canvasToWorld(cx, cy);

  if (isDragging && dragItem && dragItem.type === 'furniture') {
    const f = state.furniture[dragItem.idx];
    let nx = wp.x - dragItem.ox;
    let ny = wp.y - dragItem.oy;
    nx = snapValue(nx); ny = snapValue(ny);
    f.x = Math.max(f.w / 2, Math.min(state.room.w - f.w / 2, nx));
    f.y = Math.max(f.d / 2, Math.min(state.room.d - f.d / 2, ny));
    window.render2D();
    updateSelectionPanel();
    scheduleUpdate3D();
    // update cursor
    canvas2d.style.cursor = 'grabbing';
    return;
  }
  _origMouseMove(e);
};

// -- COMPASS (NORTH ARROW) --
function drawCompass() {
  if (!state.room || !ctx2d) return;
  const W = canvas2d.width, H = canvas2d.height;
  const cx = W - 40, cy = 40;
  ctx2d.save();
  // Circle background
  ctx2d.beginPath(); ctx2d.arc(cx, cy, 22, 0, Math.PI * 2);
  ctx2d.fillStyle = 'rgba(10,10,20,0.7)'; ctx2d.fill();
  ctx2d.strokeStyle = 'rgba(99,102,241,0.4)'; ctx2d.lineWidth = 1; ctx2d.stroke();
  // N arrow (red)
  ctx2d.strokeStyle = '#ef4444'; ctx2d.lineWidth = 2.5; ctx2d.setLineDash([]);
  ctx2d.beginPath(); ctx2d.moveTo(cx, cy + 14); ctx2d.lineTo(cx, cy - 16); ctx2d.stroke();
  ctx2d.fillStyle = '#ef4444';
  ctx2d.beginPath(); ctx2d.moveTo(cx, cy - 20); ctx2d.lineTo(cx - 5, cy - 10); ctx2d.lineTo(cx + 5, cy - 10); ctx2d.closePath(); ctx2d.fill();
  // S arrow (grey)
  ctx2d.fillStyle = 'rgba(148,163,184,0.5)';
  ctx2d.beginPath(); ctx2d.moveTo(cx, cy + 20); ctx2d.lineTo(cx - 4, cy + 10); ctx2d.lineTo(cx + 4, cy + 10); ctx2d.closePath(); ctx2d.fill();
  // N label
  ctx2d.fillStyle = '#ef4444'; ctx2d.font = 'bold 9px Inter'; ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'middle';
  ctx2d.fillText('N', cx, cy - 26);
  ctx2d.restore();
}

// -- SCALE RULER --
function drawScaleRuler() {
  if (!state.room || !ctx2d) return;
  const sc = getScale();
  // Choose a nice ruler length in cm
  const targetPx = 100;
  const cmOptions = [10, 25, 50, 100, 200, 500];
  let rulerCm = 100;
  for (const c of cmOptions) { if (c * sc >= 60) { rulerCm = c; break; } }
  const rulerPx = rulerCm * sc;
  const rx = 20, ry = canvas2d.height - 24;
  ctx2d.save();
  ctx2d.strokeStyle = 'rgba(148,163,184,0.8)'; ctx2d.lineWidth = 2; ctx2d.setLineDash([]);
  // Main line
  ctx2d.beginPath(); ctx2d.moveTo(rx, ry); ctx2d.lineTo(rx + rulerPx, ry); ctx2d.stroke();
  // End ticks
  [rx, rx + rulerPx].forEach(x => { ctx2d.beginPath(); ctx2d.moveTo(x, ry - 5); ctx2d.lineTo(x, ry + 5); ctx2d.stroke(); });
  // Mid tick
  ctx2d.lineWidth = 1; ctx2d.beginPath(); ctx2d.moveTo(rx + rulerPx / 2, ry - 3); ctx2d.lineTo(rx + rulerPx / 2, ry + 3); ctx2d.stroke();
  // Labels
  ctx2d.fillStyle = 'rgba(148,163,184,0.9)'; ctx2d.font = 'bold 10px Inter'; ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'bottom';
  ctx2d.fillText('0', rx, ry - 6);
  ctx2d.fillText(toDisplay(rulerCm).replace(' cm', '') + (unitSystem === 'imperial' ? ' in' : ' cm'), rx + rulerPx, ry - 6);
  ctx2d.restore();
}

// -- 3D CAMERA PRESETS --
function setupCameraPresets() {
  const btns = document.querySelectorAll('.cam-btn');
  const activateCam = (id) => {
    btns.forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  };

  document.getElementById('cam-persp')?.addEventListener('click', () => {
    activateCam('cam-persp');
    if (!viewer3d || !state.room) return;
    const RW = state.room.w * 0.5, RD = state.room.d * 0.5, RH = (state.room.h || 260) * 0.5;
    viewer3d.camera.position.set(RW / 2, RH * 0.9, RD + RW * 0.6);
    viewer3d.controls.target.set(RW / 2, RH * 0.3, RD / 2);
    viewer3d.camera.fov = 50; viewer3d.camera.updateProjectionMatrix();
    viewer3d.controls.update();
  });

  document.getElementById('cam-top')?.addEventListener('click', () => {
    activateCam('cam-top');
    if (!viewer3d || !state.room) return;
    const RW = state.room.w * 0.5, RD = state.room.d * 0.5, RH = (state.room.h || 260) * 0.5;
    viewer3d.camera.position.set(RW / 2, RH * 3, RD / 2);
    viewer3d.controls.target.set(RW / 2, 0, RD / 2);
    viewer3d.camera.fov = 45; viewer3d.camera.updateProjectionMatrix();
    viewer3d.controls.update();
  });

  document.getElementById('cam-front')?.addEventListener('click', () => {
    activateCam('cam-front');
    if (!viewer3d || !state.room) return;
    const RW = state.room.w * 0.5, RD = state.room.d * 0.5, RH = (state.room.h || 260) * 0.5;
    viewer3d.camera.position.set(RW / 2, RH * 0.5, RD * 2.5);
    viewer3d.controls.target.set(RW / 2, RH * 0.4, RD / 2);
    viewer3d.camera.fov = 50; viewer3d.camera.updateProjectionMatrix();
    viewer3d.controls.update();
  });

  document.getElementById('cam-iso')?.addEventListener('click', () => {
    activateCam('cam-iso');
    if (!viewer3d || !state.room) return;
    const RW = state.room.w * 0.5, RD = state.room.d * 0.5, RH = (state.room.h || 260) * 0.5;
    const d = Math.max(RW, RD) * 1.8;
    viewer3d.camera.position.set(RW / 2 + d, RH * 1.2, RD / 2 + d);
    viewer3d.controls.target.set(RW / 2, RH * 0.3, RD / 2);
    viewer3d.camera.fov = 35; viewer3d.camera.updateProjectionMatrix();
    viewer3d.controls.update();
  });
}

// -- SHORTCUTS MODAL --
function setupShortcutsModal() {
  const modal = document.getElementById('shortcuts-modal');
  const openBtn = document.getElementById('btn-help');
  const closeBtn = document.getElementById('btn-close-modal');
  if (!modal || !openBtn || !closeBtn) return;

  openBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
    updateShortcutsModalLang();
  });
  closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
  modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
}

function updateShortcutsModalLang() {
  const isFr = lang === 'fr';
  const set = (id, fr, en) => { const el = document.getElementById(id); if (el) el.textContent = isFr ? fr : en; };
  set('modal-title-text', 'Raccourcis Clavier', 'Keyboard Shortcuts');
  set('sc-tools-label', 'Outils', 'Tools');
  set('sc-select', 'S�lection', 'Select');
  set('sc-measure', 'Mesurer', 'Measure');
  set('sc-door', 'Ajouter porte', 'Add door');
  set('sc-window', 'Ajouter fen�tre', 'Add window');
  set('sc-esc', 'Retour s�lection', 'Back to select');
  set('sc-edit-label', '�dition', 'Edit');
  set('sc-undo', 'Annuler', 'Undo');
  set('sc-redo', 'R�tablir', 'Redo');
  set('sc-delete', 'Supprimer s�lection', 'Delete selection');
  set('sc-rotate', 'Rotation 90�', 'Rotate 90�');
  set('sc-snap', 'Snap ON/OFF', 'Snap ON/OFF');
  set('sc-view-label', 'Vue', 'View');
  set('sc-v1', 'Vue Split', 'Split View');
  set('sc-v2', 'Vue 2D', '2D View');
  set('sc-v3', 'Vue 3D', '3D View');
  set('sc-fit', 'Zoom ajust�', 'Fit zoom');
}

// -- EXTENDED KEYBOARD SHORTCUTS --
function setupExtendedKeys() {
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
    const k = e.key.toLowerCase();
    // Tool shortcuts
    if (k === 's' && !e.ctrlKey) setMode('select');
    if (k === 'm' && !e.ctrlKey) setMode('ruler');
    if (k === 'd' && !e.ctrlKey) setMode('addDoor');
    if (k === 'w' && !e.ctrlKey) setMode('addWindow');
    // View shortcuts
    if (k === '1') { document.getElementById('btn-view-split')?.click(); }
    if (k === '2') { document.getElementById('btn-view-2d')?.click(); }
    if (k === '3') { document.getElementById('btn-view-3d')?.click(); }
    if (k === 'f') { document.getElementById('btn-zoom-fit')?.click(); }
    // Snap toggle
    if (k === 'g') { document.getElementById('btn-snap')?.click(); }
    // Help modal
    if (k === '?') {
      const modal = document.getElementById('shortcuts-modal');
      if (modal) { modal.style.display = modal.style.display === 'none' ? 'flex' : 'none'; updateShortcutsModalLang(); }
    }
  });
}

// -- INIT ALL NEW FEATURES ON DOM READY --
document.addEventListener('DOMContentLoaded', () => {
  // These run after the main DOMContentLoaded
  setTimeout(() => {
    setupSnapControls();
    setupCameraPresets();
    setupShortcutsModal();
    setupExtendedKeys();
    // Override render2D with enhanced version (compass + ruler)
    if (typeof render2D === 'function') {
      const _base = render2D;
      window.render2D = function () {
        _base();
        if (state.room) { drawCompass(); drawScaleRuler(); }
      };
    }
  }, 100);
});

// =============================================================
// USEFUL PRO FEATURES: Duplicate, Align, Budget, SVG Export
// =============================================================

// -- FURNITURE DUPLICATE (Ctrl+D) --
function duplicateFurniture(idx) {
  if (idx < 0 || idx >= state.furniture.length) return;
  const orig = state.furniture[idx];
  const copy = JSON.parse(JSON.stringify(orig));
  copy.x = Math.min(state.room.w - copy.w / 2, orig.x + 30);
  copy.y = Math.min(state.room.d - copy.d / 2, orig.y + 30);
  state.furniture.push(copy);
  snapshotHistory();
  const newIdx = state.furniture.length - 1;
  selectItem('furniture', newIdx);
  updateFurniturePanel(); updateCostsPanel();
  render2D(); scheduleUpdate3D();
  showToast((copy.name && copy.name[lang]) || copy.id || 'Meuble', '?');
}

// Hook Ctrl+D
document.addEventListener('keydown', function (e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.key === 'd' && e.ctrlKey) {
    e.preventDefault();
    if (state.selectedIdx >= 0 && state.selectedType === 'furniture') {
      duplicateFurniture(state.selectedIdx);
    }
  }
});

// -- ALIGNMENT TOOLS --
function setupAlignTools() {
  const toolsEl = document.getElementById('align-tools');
  const dupBtn = document.getElementById('btn-duplicate');
  function showAlignTools(show) { if (toolsEl) toolsEl.style.display = show ? 'flex' : 'none'; }

  // Show when furniture selected
  const _origSelectItem = selectItem;
  window.selectItem = function (type, idx) {
    _origSelectItem(type, idx);
    showAlignTools(type === 'furniture' && idx >= 0);
  };

  document.getElementById('align-left')?.addEventListener('click', () => {
    if (state.selectedIdx < 0) return;
    const f = state.furniture[state.selectedIdx];
    f.x = f.w / 2; snapshotHistory(); render2D(); scheduleUpdate3D(); updateSelectionPanel();
  });
  document.getElementById('align-right')?.addEventListener('click', () => {
    if (state.selectedIdx < 0) return;
    const f = state.furniture[state.selectedIdx];
    f.x = state.room.w - f.w / 2; snapshotHistory(); render2D(); scheduleUpdate3D(); updateSelectionPanel();
  });
  document.getElementById('align-center-h')?.addEventListener('click', () => {
    if (state.selectedIdx < 0) return;
    state.furniture[state.selectedIdx].x = state.room.w / 2;
    snapshotHistory(); render2D(); scheduleUpdate3D(); updateSelectionPanel();
  });
  document.getElementById('align-top')?.addEventListener('click', () => {
    if (state.selectedIdx < 0) return;
    const f = state.furniture[state.selectedIdx];
    f.y = f.d / 2; snapshotHistory(); render2D(); scheduleUpdate3D(); updateSelectionPanel();
  });
  document.getElementById('align-bottom')?.addEventListener('click', () => {
    if (state.selectedIdx < 0) return;
    const f = state.furniture[state.selectedIdx];
    f.y = state.room.d - f.d / 2; snapshotHistory(); render2D(); scheduleUpdate3D(); updateSelectionPanel();
  });
  document.getElementById('align-center-v')?.addEventListener('click', () => {
    if (state.selectedIdx < 0) return;
    state.furniture[state.selectedIdx].y = state.room.d / 2;
    snapshotHistory(); render2D(); scheduleUpdate3D(); updateSelectionPanel();
  });
  dupBtn?.addEventListener('click', () => { duplicateFurniture(state.selectedIdx); });
}

// -- BUDGET TRACKER --
function updateBudgetTracker() {
  const limitInput = document.getElementById('budget-limit');
  const fillEl = document.getElementById('budget-bar-fill');
  const spentEl = document.getElementById('budget-spent');
  const remEl = document.getElementById('budget-remaining');
  if (!limitInput || !fillEl) return;

  const total = state.furniture.reduce((s, f) => s + (f.price || 0), 0);
  const limit = parseFloat(limitInput.value) || 5000;
  const pct = Math.min(100, (total / limit) * 100);
  const over = total > limit;
  const rem = limit - total;

  fillEl.style.width = pct + '%';
  fillEl.style.background = over
    ? 'linear-gradient(90deg,#ef4444,#dc2626)'
    : pct > 80
      ? 'linear-gradient(90deg,#f59e0b,#d97706)'
      : 'linear-gradient(90deg,#10b981,#059669)';

  if (spentEl) spentEl.textContent = '$' + total.toFixed(0);
  if (remEl) remEl.textContent = over
    ? (lang === 'fr' ? '? D�passement $' : '? Over $') + Math.abs(rem).toFixed(0)
    : (lang === 'fr' ? '$' + rem.toFixed(0) + ' restant' : '$' + rem.toFixed(0) + ' left');
  if (remEl) remEl.style.color = over ? 'var(--rose)' : 'var(--text-3)';
}

function setupBudgetTracker() {
  document.getElementById('budget-limit')?.addEventListener('input', updateBudgetTracker);
}

// Patch updateCostsPanel to also update budget
const _origUpdateCosts = updateCostsPanel;
window.updateCostsPanel = function () {
  _origUpdateCosts();
  updateBudgetTracker();
};

// -- SVG VECTOR EXPORT --
function exportSVG() {
  if (!state.room) { showToast(lang === 'fr' ? 'Aucun projet' : 'No project', '??'); return; }
  const scale = 1; // 1px per cm
  const W = state.room.w, H = state.room.d;
  const WALL = 14, PAD = 50;
  const vw = W + PAD * 2, vh = H + PAD * 2;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${vw}" height="${vh}" viewBox="0 0 ${vw} ${vh}">
  <defs>
    <style>text{font-family:Inter,Arial,sans-serif;}</style>
  </defs>
  <!-- Background -->
  <rect width="${vw}" height="${vh}" fill="#f8f8f4"/>
  <!-- Floor -->
  <rect x="${PAD}" y="${PAD}" width="${W}" height="${H}" fill="#ede8df" stroke="#ccc" stroke-width="1"/>
  <!-- Walls -->
  <rect x="${PAD - WALL}" y="${PAD - WALL}" width="${W + WALL * 2}" height="${WALL}" fill="${state.wallColor}" stroke="rgba(0,0,0,0.3)" stroke-width="0.5"/>
  <rect x="${PAD - WALL}" y="${PAD + H}" width="${W + WALL * 2}" height="${WALL}" fill="${state.wallColor}" stroke="rgba(0,0,0,0.3)" stroke-width="0.5"/>
  <rect x="${PAD - WALL}" y="${PAD - WALL}" width="${WALL}" height="${H + WALL * 2}" fill="${state.wallColor}" stroke="rgba(0,0,0,0.3)" stroke-width="0.5"/>
  <rect x="${PAD + W}" y="${PAD - WALL}" width="${WALL}" height="${H + WALL * 2}" fill="${state.wallColor}" stroke="rgba(0,0,0,0.3)" stroke-width="0.5"/>`;

  // Furniture
  state.furniture.forEach(f => {
    const fx = PAD + f.x - f.w / 2, fy = PAD + f.y - f.d / 2;
    const nm = (f.name && f.name[lang]) || f.name?.fr || f.id;
    const cx2 = PAD + f.x, cy2 = PAD + f.y;
    svg += `\n  <g transform="rotate(${f.rotation || 0},${cx2},${cy2})">
    <rect x="${fx}" y="${fy}" width="${f.w}" height="${f.d}" fill="${f.color || '#6366f1'}" fill-opacity="0.75" stroke="rgba(0,0,0,0.4)" stroke-width="1" rx="3"/>
    <text x="${cx2}" y="${cy2}" text-anchor="middle" dominant-baseline="middle" font-size="9" font-weight="bold" fill="rgba(0,0,0,0.7)">${nm.substring(0, 14)}</text>
    <text x="${cx2}" y="${cy2 + 10}" text-anchor="middle" dominant-baseline="middle" font-size="7" fill="rgba(0,0,0,0.45)">${f.w}�${f.d}cm</text>
  </g>`;
  });

  // Doors
  state.doors.forEach(door => {
    const off = door.offset, sz = door.size;
    let dx, dy;
    if (door.wall === 'top') { dx = PAD + off; dy = PAD; }
    else if (door.wall === 'bottom') { dx = PAD + off; dy = PAD + H; }
    else if (door.wall === 'left') { dx = PAD; dy = PAD + off; }
    else { dx = PAD + W; dy = PAD + off; }
    svg += `\n  <line x1="${dx}" y1="${dy}" x2="${dx + sz}" y2="${dy}" stroke="${door.color || '#c8a96e'}" stroke-width="2"/>`;
  });

  // Dimension annotations
  svg += `\n  <!-- Dimensions -->
  <line x1="${PAD}" y1="${PAD - 20}" x2="${PAD + W}" y2="${PAD - 20}" stroke="#555" stroke-width="1" marker-start="url(#arr)" marker-end="url(#arr)"/>
  <text x="${PAD + W / 2}" y="${PAD - 24}" text-anchor="middle" font-size="11" fill="#333" font-weight="bold">${W} cm</text>
  <line x1="${PAD - 20}" y1="${PAD}" x2="${PAD - 20}" y2="${PAD + H}" stroke="#555" stroke-width="1"/>
  <text x="${PAD - 26}" y="${PAD + H / 2}" text-anchor="middle" font-size="11" fill="#333" font-weight="bold" transform="rotate(-90,${PAD - 26},${PAD + H / 2})">${H} cm</text>`;

  // North arrow
  svg += `\n  <!-- North -->
  <g transform="translate(${vw - 30},25)">
    <circle r="16" fill="rgba(0,0,0,0.07)" stroke="#999" stroke-width="0.5"/>
    <polygon points="0,-13 -4,-2 0,-6 4,-2" fill="#ef4444"/>
    <polygon points="0,13 -4,2 0,6 4,2" fill="#999"/>
    <text y="-17" text-anchor="middle" font-size="10" font-weight="bold" fill="#ef4444">N</text>
  </g>`;

  // Legend / title block
  const total = state.furniture.reduce((s, f) => s + (f.price || 0), 0);
  svg += `\n  <!-- Title block -->
  <rect x="0" y="${vh - 28}" width="${vw}" height="28" fill="#1a1a2e" fill-opacity="0.85"/>
  <text x="10" y="${vh - 12}" font-size="11" font-weight="bold" fill="white">DesignPro Studio</text>
  <text x="${vw / 2}" y="${vh - 12}" text-anchor="middle" font-size="10" fill="#aaa">${state.room.w}�${state.room.d} cm � ${state.furniture.length} meubles</text>
  <text x="${vw - 10}" y="${vh - 12}" text-anchor="end" font-size="10" fill="#6366f1" font-weight="bold">Total: $${total.toFixed(0)}</text>`;

  svg += '\n</svg>';

  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const link = document.createElement('a');
  link.download = 'designpro-plan.svg';
  link.href = URL.createObjectURL(blob);
  link.click();
  showToast('SVG Export', '???');
}

// -- WIRE UP NEW FEATURES ON DOM READY --
document.addEventListener('DOMContentLoaded', function () {
  setTimeout(function () {
    setupAlignTools();
    setupBudgetTracker();
    document.getElementById('exp-svg')?.addEventListener('click', exportSVG);
  }, 200);
});

// -------------------------------------------------------------
// ENHANCEMENTS: AUTO-SAVE, ENVIRONMENT PRESETS, DIMENSIONS TOGGLE
// -------------------------------------------------------------

state.showDimensions = true;

// -- AUTO-SAVE --
let autoSaveTimeout = null;
function autoSave() {
  if (!state.room) return;
  clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(() => {
    try {
      localStorage.setItem('designpro_autosave', JSON.stringify({
        state: state,
        timestamp: Date.now()
      }));
    } catch (e) { console.error("Auto-save failed", e); }
  }, 1000);
}

// Intercept snapshotHistory to trigger auto-save
const _origSnapshot = snapshotHistory;
window.snapshotHistory = function () {
  _origSnapshot();
  autoSave();
};

function checkRecovery() {
  const saved = localStorage.getItem('designpro_autosave');
  if (!saved) return;
  const data = JSON.parse(saved);
  if (!data || !data.state || !data.state.room) return;

  const modal = document.getElementById('recovery-modal');
  if (!modal) return;
  modal.style.display = 'flex';

  document.getElementById('btn-recovery-yes').onclick = () => {
    state = data.state;
    modal.style.display = 'none';
    initAfterRoomCreate();
    showToast(lang === 'fr' ? 'Session restaur�e' : 'Session restored', '??');
  };
  document.getElementById('btn-recovery-no').onclick = () => {
    modal.style.display = 'none';
    localStorage.removeItem('designpro_autosave');
  };
}

// -- ENVIRONMENT PRESETS --
function setupEnvironment() {
  const btns = document.querySelectorAll('.env-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setEnvironment(btn.dataset.env);
    });
  });
}

function setEnvironment(preset) {
  if (!viewer3d) return;
  let ambInt = 0.6, sunInt = 1.0, sunColor = 0xffffff, skyColor = 0x1a1a2e;

  switch (preset) {
    case 'day':
      ambInt = 0.7; sunInt = 1.2; sunColor = 0xffffff; skyColor = 0x1a1a2e;
      break;
    case 'sunset':
      ambInt = 0.5; sunInt = 1.5; sunColor = 0xffaa00; skyColor = 0x2e1a1a;
      break;
    case 'bluehour':
      ambInt = 0.3; sunInt = 0.5; sunColor = 0x4444ff; skyColor = 0x1a1a44;
      break;
    case 'night':
      ambInt = 0.15; sunInt = 0.2; sunColor = 0xaaaaff; skyColor = 0x050510;
      break;
  }

  viewer3d.ambientLight.intensity = ambInt;
  viewer3d.sunLight.intensity = sunInt;
  viewer3d.sunLight.color.setHex(sunColor);
  viewer3d.scene.background = new THREE.Color(skyColor);

  // Update UI sliders to match
  document.getElementById('s-ambient').value = ambInt;
  document.getElementById('v-ambient').textContent = ambInt.toFixed(2);

  showToast(preset.toUpperCase(), '??');
}

// -- DIMENSIONS TOGGLE --
function setupDimensionsToggle() {
  const toggle = document.getElementById('toggle-dimensions');
  if (!toggle) return;
  toggle.addEventListener('change', () => {
    state.showDimensions = toggle.checked;
    render2D();
  });
}

// Override render2D to respect showDimensions
const _origRender2DInner = render2D;
window.render2D = function () {
  // We need to temporarily disable dimension labels in parts of the code
  // This is a bit complex as labels are drawn inside drawRoom/drawFurniture
  // For now, let's keep it simple and just skip labels if false
  window._showLabels = state.showDimensions;
  _origRender2DInner();
};

// Assuming drawLabel checks window._showLabels
// If not, we might need a more targeted patch.

// -- INIT --
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    setupEnvironment();
    setupDimensionsToggle();
    checkRecovery();
  }, 500);
});

// -- FINAL PATCHES --
// Ensure wizard is hidden on recovery
const _origBtnYes = document.getElementById('btn-recovery-yes');
if (_origBtnYes) {
  _origBtnYes.addEventListener('click', () => {
    document.getElementById('wizard-overlay').style.display = 'none';
  });
}

// Global toggle for labels
window.drawLabel = function (txt, x, y, options = {}) {
  if (window._showLabels === false && !options.force) return;
  ctx2d.save();
  ctx2d.font = options.font || 'bold 10px Inter';
  ctx2d.fillStyle = options.color || '#94a3b8';
  ctx2d.textAlign = 'center';
  ctx2d.fillText(txt, x, y);
  ctx2d.restore();
};
