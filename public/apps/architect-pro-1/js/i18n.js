// i18n.js
const translations = {
  en: {
    app_title: "ArchitectPro",
    app_subtitle: "Intelligent 2D & 3D Builder",
    tool_select: "Select",
    tool_wall: "Wall",
    tool_door: "Door",
    tool_window: "Window",
    tool_floor: "Floor",
    tool_roof: "Roof",
    btn_export: "Export 3D",
    panel_properties: "Properties",
    empty_properties: "Select an object to view properties.",
    prop_width: "Width",
    prop_height: "Height / Length",
    prop_elevation: "Elevation (from floor)",
    prop_model: "Model Variant",
    prop_color: "Color / Material",
    prop_cost: "Unit Cost ($)",
    btn_delete: "Delete Object",
    panel_project: "Project Settings",
    glob_wall_height: "Default Wall Height",
    glob_wall_thick: "Default Wall Thickness",
    btn_load_blueprint: "Load 2D Blueprint",
    pane_2d: "2D Floor Plan",
    pane_3d: "3D Live Preview",
    export_title: "Export Project",
    door_single: "Single Door",
    door_double: "Double Door",
    door_sliding: "Sliding Door",
    window_single: "Single Window",
    window_double: "Double Window",
    window_sliding: "Sliding Window",
  },
  fr: {
    app_title: "ArchitectPro",
    app_subtitle: "Constructeur Intelligent 2D & 3D",
    tool_select: "Sélectionner",
    tool_wall: "Mur",
    tool_door: "Porte",
    tool_window: "Fenêtre",
    tool_floor: "Sol / Plancher",
    tool_roof: "Toit",
    btn_export: "Exporter",
    panel_properties: "Propriétés",
    empty_properties: "Sélectionnez un objet pour voir ses propriétés.",
    prop_width: "Largeur",
    prop_height: "Hauteur / Longueur",
    prop_elevation: "Élévation (du sol)",
    prop_model: "Variante de modèle",
    prop_color: "Couleur / Matériel",
    prop_cost: "Coût Unitaire ($)",
    btn_delete: "Supprimer L'objet",
    panel_project: "Paramètres du Projet",
    glob_wall_height: "Hauteur du mur par défaut",
    glob_wall_thick: "Épaisseur du mur par défaut",
    btn_load_blueprint: "Charger Plan 2D",
    pane_2d: "Plan 2D",
    pane_3d: "Aperçu 3D en Direct",
    export_title: "Exporter le Projet",
    door_single: "Porte Simple",
    door_double: "Porte Double",
    door_sliding: "Porte Coulissante",
    window_single: "Fenêtre Simple",
    window_double: "Fenêtre Double",
    window_sliding: "Fenêtre Coulissante",
  }
};

let currentLang = 'en';

function setLanguage(lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang][key]) {
      el.textContent = translations[lang][key];
    }
  });

  // Highlight button
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
  });
}

// Translations hook
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => setLanguage(btn.getAttribute('data-lang')));
  });
  setLanguage('en');
});
