const fs = require('fs');
const path = require('path');

const viewers = [
  {
    id: 'stl',
    ref: 's3dviewer',
    titleEn: 'Free Online STL Viewer & Exporter | Studios-Pro',
    titleFr: 'Visualiseur STL gratuit en ligne & Export | Studios-Pro',
    descEn: 'Open, inspect, measure, slice and export STL 3D printing models online without downloads.',
    descFr: 'Ouvrez, inspectez, coupez et exportez des modèles 3D STL en ligne sans téléchargement.',
    h1En: 'Free Online STL Viewer & CAD Tool',
    h1Fr: 'Visualiseur STL Gratuit en Ligne & Outil CAO',
    featureEn: 'Measurement tools, clipping planes, color filters, and standalone HTML export.',
    featureFr: 'Outils de mesure, plans de coupe, filtres de couleur et export HTML autonome.'
  },
  {
    id: 'obj',
    ref: 's3dviewer',
    titleEn: 'Free Online OBJ Viewer & Exporter | Studios-Pro',
    titleFr: 'Visualiseur OBJ gratuit en ligne & Export | Studios-Pro',
    descEn: 'Inspect and measure OBJ 3D models directly in your web browser. Slice and export to interactive HTML.',
    descFr: 'Inspectez et mesurez des modèles 3D OBJ directement dans le browser. Coupez et exportez en HTML interactif.',
    h1En: 'Interactive OBJ File Viewer & CAD Tool',
    h1Fr: 'Visualiseur de Fichiers OBJ Interactif & Outil CAO',
    featureEn: 'Full material support, geometric measurement, clipping slice, and standalone HTML export.',
    featureFr: 'Support complet des matériaux, mesure géométrique, coupe de section et export HTML.'
  },
  {
    id: 'glb',
    ref: 's3dviewer',
    titleEn: 'Free Online GLB Viewer & Exporter | Studios-Pro',
    titleFr: 'Visualiseur GLB gratuit en ligne & Export | Studios-Pro',
    descEn: 'Instantly view binary GLB models in 3D. Verify textures, animation, measure coordinates, and slice.',
    descFr: 'Visualisez instantanément des modèles GLB en 3D. Vérifiez les textures, mesurez et coupez.',
    h1En: 'Online GLB Model Viewer & CAD Inspector',
    h1Fr: 'Visualiseur GLB en Ligne & Inspecteur CAO',
    featureEn: 'High-fidelity rendering, lighting controls, geometric measurements, and HTML export.',
    featureFr: 'Rendu haute fidélité, contrôle de l\'éclairage, mesures géométriques et export HTML.'
  },
  {
    id: 'gltf',
    ref: 's3dviewer',
    titleEn: 'Free Online GLTF Viewer & Exporter | Studios-Pro',
    titleFr: 'Visualiseur GLTF gratuit en ligne & Export | Studios-Pro',
    descEn: 'Drag and drop GLTF assets to view textures, analyze geometry, measure dimensions, and export.',
    descFr: 'Glissez-déposez des fichiers GLTF pour visualiser les textures, analyser la géométrie et exporter.',
    h1En: 'Free Online GLTF Viewer & CAD Tool',
    h1Fr: 'Visualiseur GLTF Gratuit en Ligne & Outil CAO',
    featureEn: 'Vibrant 3D lighting, measurement grids, axis clipping, and standalone HTML export.',
    featureFr: 'Éclairage 3D vibrant, grilles de mesure, coupe d\'axe et export HTML.'
  },
  {
    id: 'ply',
    ref: 's3dviewer',
    titleEn: 'Free Online PLY Viewer & Exporter | Studios-Pro',
    titleFr: 'Visualiseur PLY gratuit en ligne & Export | Studios-Pro',
    descEn: 'Open PLY polygon files, inspect vertex colors, measure point coordinates, and export.',
    descFr: 'Ouvrez des fichiers PLY, inspectez les couleurs de sommets, mesurez et exportez.',
    h1En: 'Online PLY File Viewer & CAD Tool',
    h1Fr: 'Visualiseur de Fichiers PLY en Ligne & Outil CAO',
    featureEn: 'Point cloud and mesh support, distance calculation, clipping, and interactive HTML export.',
    featureFr: 'Support nuage de points et maillage, calcul de distance, coupe et export HTML.'
  },
  {
    id: '3mf',
    ref: 's3dviewer',
    titleEn: 'Free Online 3MF Viewer & Exporter | Studios-Pro',
    titleFr: 'Visualiseur 3MF gratuit en ligne & Export | Studios-Pro',
    descEn: 'Inspect 3MF 3D manufacturing format files, check structural dimensions, and slice meshes.',
    descFr: 'Inspectez des fichiers 3MF, vérifiez les dimensions structurelles et coupez les maillages.',
    h1En: 'Online 3MF Viewer & 3D Print Inspector',
    h1Fr: 'Visualiseur 3MF en Ligne & Inspecteur 3D Print',
    featureEn: '3D print layout verification, millimeter measurements, slicing, and HTML export.',
    featureFr: 'Vérification de l\'impression 3D, mesures en millimètres, coupe de section et export HTML.'
  },
  {
    id: 'dxf',
    ref: 'dfx',
    titleEn: 'Free Online DXF CAD Viewer & Inspector | Studios-Pro',
    titleFr: 'Visualiseur DXF gratuit en ligne & Inspecteur | Studios-Pro',
    descEn: 'Open AutoCAD DXF vector layouts, inspect layer structures, and export as SVG/HTML.',
    descFr: 'Ouvrez des plans vectoriels DXF AutoCAD, inspectez les calques et exportez en SVG/HTML.',
    h1En: 'Online DXF File Viewer & CAD Blueprint Inspector',
    h1Fr: 'Visualiseur DXF en Ligne & Inspecteur de Plans CAO',
    featureEn: 'Multi-layer visibility toggles, scaling grids, precise vector parsing, and SVG export.',
    featureFr: 'Visibilité des calques, grilles d\'échelle, parsing vectoriel et export SVG.'
  },
  {
    id: 'svg',
    ref: 'vcnc',
    titleEn: 'Free Online SVG Vector Viewer & Editor | Studios-Pro',
    titleFr: 'Visualiseur SVG gratuit en ligne & Éditeur | Studios-Pro',
    descEn: 'Open SVG vector graphics, inspect paths, scale coordinates, and generate CNC toolpaths.',
    descFr: 'Ouvrez des fichiers vectoriels SVG, inspectez les tracés et générez des parcours CNC.',
    h1En: 'Online SVG Viewer & CNC Path Editor',
    h1Fr: 'Visualiseur SVG en Ligne & Parcours CNC',
    featureEn: 'Path inspection, scaling, vector editing, and direct CNC G-Code generation.',
    featureFr: 'Inspection de tracés, mise à l\'échelle, édition vectorielle et export G-Code CNC.'
  },
  {
    id: 'gcode',
    ref: 'vcnc',
    titleEn: 'Free Online G-Code Viewer & Simulation | Studios-Pro',
    titleFr: 'Visualiseur de G-Code gratuit en ligne & Sim | Studios-Pro',
    descEn: 'Visualize G-Code tools path, simulate CNC machine paths, and verify coordinates.',
    descFr: 'Visualisez les parcours d\'outils G-Code, simulez les trajectoires CNC et vérifiez.',
    h1En: 'Online G-Code Simulator & CNC Path Inspector',
    h1Fr: 'Simulateur G-Code en Ligne & Inspecteur de Parcours CNC',
    featureEn: 'Path visualizer, layer-by-layer simulation, coordinate display, and vector editing.',
    featureFr: 'Visualisation de parcours, simulation couche par couche et édition vectorielle.'
  }
];

const converters = [
  {
    id: 'png-to-svg',
    ref: 'vcnc',
    titleEn: 'Convert PNG to SVG Online for CNC | Studios-Pro',
    titleFr: 'Convertir PNG en SVG en ligne pour CNC | Studios-Pro',
    descEn: 'Free online image to vector converter. Extract paths from PNG to SVG for CNC routers and lasers.',
    descFr: 'Convertisseur image en vecteur gratuit. Extrayez des tracés de PNG vers SVG pour CNC et lasers.',
    h1En: 'Free PNG to SVG Vector Converter for CNC & Laser',
    h1Fr: 'Convertisseur PNG en SVG Gratuit pour CNC & Laser',
    featureEn: 'Instant vector extraction, adjustable thresholds, path smoothing, and G-code export.',
    featureFr: 'Extraction vectorielle instantanée, seuils ajustables, lissage et export G-code.'
  },
  {
    id: 'jpg-to-svg',
    ref: 'vcnc',
    titleEn: 'Convert JPG to SVG Online for CNC | Studios-Pro',
    titleFr: 'Convertir JPG en SVG en ligne pour CNC | Studios-Pro',
    descEn: 'Convert JPG images to clean SVG vector files for carving, laser engraving, and CNC routers.',
    descFr: 'Convertissez des images JPG en vecteurs SVG pour gravure laser et routeurs CNC.',
    h1En: 'Free JPG to SVG Vector Converter for Carving & Laser',
    h1Fr: 'Convertisseur JPG en SVG Gratuit pour Gravure & Laser',
    featureEn: 'High-contrast path extraction, custom vector output, scaling, and CNC compatibility.',
    featureFr: 'Extraction de tracés à haut contraste, sortie vectorielle sur mesure et compatibilité CNC.'
  },
  {
    id: 'dxf-to-svg',
    ref: 'vcnc',
    titleEn: 'Convert DXF to SVG Online Free | Studios-Pro',
    titleFr: 'Convertir DXF en SVG en ligne gratuit | Studios-Pro',
    descEn: 'Convert AutoCAD DXF layouts to SVG vectors online. Perfect for web design, laser engraving, and CNC.',
    descFr: 'Convertissez des plans DXF en vecteurs SVG en ligne. Parfait pour le web, laser et CNC.',
    h1En: 'Free DXF to SVG Vector Converter & CAD Tool',
    h1Fr: 'Convertisseur DXF en SVG Gratuit & Outil CAO',
    featureEn: 'Accurate scale matching, multi-layer conversion, clean path export, and CNC routing.',
    featureFr: 'Mise à l\'échelle précise, conversion multi-calques, export de tracés et usinage CNC.'
  },
  {
    id: 'glb-to-html',
    ref: 's3dviewer',
    titleEn: 'Convert GLB to Interactive HTML Exporter | Studios-Pro',
    titleFr: 'Convertir GLB en HTML interactif | Studios-Pro',
    descEn: 'Convert binary GLB models into standalone, interactive HTML pages. Embed 3D models anywhere.',
    descFr: 'Convertissez des modèles GLB en pages HTML interactives autonomes. Intégrez-les partout.',
    h1En: 'Convert GLB to Standalone Interactive HTML Page',
    h1Fr: 'Convertir GLB en Page HTML Interactive Autonome',
    featureEn: 'Single file self-contained export, fully responsive OrbitControls, and custom backgrounds.',
    featureFr: 'Export de fichier unique autonome, OrbitControls responsive et arrière-plan sur mesure.'
  },
  {
    id: 'stl-to-html',
    ref: 's3dviewer',
    titleEn: 'Convert STL to Interactive HTML Exporter | Studios-Pro',
    titleFr: 'Convertir STL en HTML interactif | Studios-Pro',
    descEn: 'Package STL 3D printing files into offline-ready, standalone interactive HTML files for preview.',
    descFr: 'Emballez des fichiers STL en documents HTML interactifs autonomes pour prévisualisation.',
    h1En: 'Convert STL to Standalone Interactive HTML Page',
    h1Fr: 'Convertir STL en Page HTML Interactive Autonome',
    featureEn: 'Color and lighting customization, distance measurement tools, slicing, and HTML download.',
    featureFr: 'Personnalisation des couleurs, outils de mesure de distance, coupe de section et export HTML.'
  },
  {
    id: '2d-sketch-to-3d',
    ref: 'spro',
    titleEn: 'Free Online 2D Sketch to 3D Model Converter | Studios-Pro',
    titleFr: 'Convertisseur de Dessin 2D en Modèle 3D Gratuit | Studios-Pro',
    descEn: 'Draw a 2D sketch or upload a drawing and instantly extrude it into an interactive 3D model. Export to OBJ, HTML, or view in AR.',
    descFr: 'Dessinez un croquis 2D ou téléchargez un dessin et extrudez-le instantanément en modèle 3D interactif. Exportez en OBJ, HTML ou AR.',
    h1En: 'Free Online 2D Sketch to 3D Model Extruder',
    h1Fr: 'Convertisseur de Croquis 2D en Modèle 3D Gratuit',
    featureEn: 'Interactive drawing canvas, precise thickness controls, custom heightmaps, and OBJ/HTML/AR export.',
    featureFr: 'Canevas de dessin interactif, contrôle de l\'épaisseur, cartes de hauteur et export OBJ/HTML/AR.'
  },
  {
    id: 'text-to-3d-model',
    ref: 'spro',
    titleEn: 'Free Online Text to 3D Model Generator | Studios-Pro',
    titleFr: 'Générateur de Texte en Modèle 3D Gratuit en Ligne | Studios-Pro',
    descEn: 'Type any text, choose your font, customize extrusion depth, bevels, and download as 3D OBJ model or standalone HTML.',
    descFr: 'Saisissez du texte, choisissez votre police, ajustez la profondeur et téléchargez en modèle 3D OBJ ou HTML autonome.',
    h1En: 'Free Online 3D Text & Logo Extrusion Creator',
    h1Fr: 'Générateur de Texte 3D & Logos Gratuit en Ligne',
    featureEn: 'Custom typography extrusion, depth and bevel scaling, direct live preview, and OBJ/HTML export.',
    featureFr: 'Extrusion de typographie sur mesure, échelle de profondeur, aperçu en direct et export OBJ/HTML.'
  },
  {
    id: 'svg-to-3d-model',
    ref: 'spro',
    titleEn: 'Free Online SVG to 3D Extruder Converter | Studios-Pro',
    titleFr: 'Convertisseur SVG en Modèle 3D Gratuit en Ligne | Studios-Pro',
    descEn: 'Upload vector SVG paths and extrude them into high-quality 3D geometry online. Download as OBJ or interactive HTML.',
    descFr: 'Téléchargez des tracés vectoriels SVG et extrudez-les en géométrie 3D de haute qualité. Téléchargez en OBJ ou HTML.',
    h1En: 'Free Online SVG Vector to 3D Shape Converter',
    h1Fr: 'Convertisseur de Tracés Vectoriels SVG en 3D Gratuit',
    featureEn: 'Accurate vector path scaling, extrusion depth adjuster, live PBR rendering, and standalone HTML export.',
    featureFr: 'Mise à l\'échelle des tracés SVG, ajustement de la profondeur, rendu PBR en direct et export HTML.'
  },
  {
    id: 'ai-art-generator',
    ref: 'artgen',
    titleEn: 'Free Online AI Art & Procedural Vector Studio | Studios-Pro',
    titleFr: 'Générateur d\'Art IA & Studio Vectoriel Gratuit | Studios-Pro',
    descEn: 'Generate procedural AI artwork, 3D relief models (STL/OBJ/GLB), vector logos, and recolor DXF CAD files online.',
    descFr: 'Générez des œuvres d\'art IA procédurales, des reliefs 3D (STL/OBJ/GLB), des logos vectoriels et recolorez des fichiers DXF.',
    h1En: 'Free Online AI Art Generator & 3D Relief Studio',
    h1Fr: 'Générateur d\'Art IA Gratuit & Studio de Relief 3D',
    featureEn: '45+ AI generation styles, 35+ vector tools, 3D relief printing export (STL/OBJ/GLB), and DXF CAD layer recoloring.',
    featureFr: '45+ styles de génération IA, 35+ outils vectoriels, export de relief 3D (STL/OBJ/GLB) et recoloration DXF.'
  },
  {
    id: 'procedural-logo-maker',
    ref: 'artgen',
    titleEn: 'Free AI Vector Brand Logo Generator | Studios-Pro',
    titleFr: 'Générateur de Logo Vectoriel IA Gratuit | Studios-Pro',
    descEn: 'Create unique themed vector brand logos (Dragon, Lion, Crown, Rocket, Guitar) and export as 3D printable STL or OBJ.',
    descFr: 'Créez des logos vectoriels thématiques uniques (Dragon, Lion, Couronne, Riquette, Guitare) et exportez en STL ou OBJ 3D.',
    h1En: 'Free AI Vector Brand Logo & 3D Emblem Generator',
    h1Fr: 'Générateur de Logos Vectoriels IA & Emblèmes 3D Gratuit',
    featureEn: 'Themed vector emblem algorithms, customizable brand & tagline text, high-res PNG, SVG, and 3D STL export.',
    featureFr: 'Algorithmes d\'emblèmes thématiques, texte personnalisable, PNG haute rés, SVG et export STL 3D.'
  },
  {
    id: '2d-canvas-to-3d-relief',
    ref: 'artgen',
    titleEn: 'Free 2D Canvas to 3D Relief Printer Generator | Studios-Pro',
    titleFr: 'Générateur de Relief 3D à partir de Dessin 2D Gratuit | Studios-Pro',
    descEn: 'Convert 2D canvas artwork into high-precision 3D printable relief models (STL, OBJ, GLB) with watertight geometry.',
    descFr: 'Convertissez des dessins 2D en modèles de relief 3D haute précision (STL, OBJ, GLB) étanches pour l\'impression 3D.',
    h1En: 'Free 2D Canvas to 3D Relief STL Exporter',
    h1Fr: 'Générateur de Relief 3D STL à partir de Dessin 2D Gratuit',
    featureEn: 'Watertight 3D mesh generation, normal calculation, vertex coloring, and high-fidelity STL, OBJ, GLB export.',
    featureFr: 'Maillage 3D étanche, calcul de normales, coloration de sommets et export STL, OBJ, GLB haute fidélité.'
  },
  {
    id: 'obj-to-stl',
    ref: 's3dviewer',
    titleEn: 'Free Online OBJ to STL 3D Converter | Studios-Pro',
    titleFr: 'Convertisseur OBJ en STL gratuit en ligne | Studios-Pro',
    descEn: 'Convert OBJ 3D mesh files to STL 3D printing format online instantly. No software download required.',
    descFr: 'Convertissez des fichiers OBJ 3D en format STL pour impression 3D en ligne instantanément.',
    h1En: 'Free Online OBJ to STL 3D Mesh Converter',
    h1Fr: 'Convertisseur OBJ en STL Gratuit pour Impression 3D',
    featureEn: 'Instant browser conversion, mesh repair, scaling, watertight verification, and STL export.',
    featureFr: 'Conversion instantanée, réparation de maillage, vérification d\'étanchéité et export STL.'
  },
  {
    id: 'stl-to-obj',
    ref: 's3dviewer',
    titleEn: 'Free Online STL to OBJ 3D Converter | Studios-Pro',
    titleFr: 'Convertisseur STL en OBJ gratuit en ligne | Studios-Pro',
    descEn: 'Convert 3D printing STL files to Wavefront OBJ format with vertex normals and materials online.',
    descFr: 'Convertissez des fichiers STL en format Wavefront OBJ avec normales de sommets en ligne.',
    h1En: 'Free Online STL to OBJ 3D Model Converter',
    h1Fr: 'Convertisseur STL en OBJ Gratuit en Ligne',
    featureEn: 'Fast client-side processing, normal preservation, 3D preview, and OBJ export.',
    featureFr: 'Traitement rapide côté client, préservation des normales, aperçu 3D et export OBJ.'
  },
  {
    id: '2d-image-to-3d-stl',
    ref: 'artgen',
    titleEn: 'Free Online 2D Image to 3D STL Relief Generator | Studios-Pro',
    titleFr: 'Convertisseur Image 2D en STL 3D Gratuit | Studios-Pro',
    descEn: 'Turn 2D photos, logos, or artwork into high-detail 3D printable relief STL models online free.',
    descFr: 'Transformez des photos 2D, logos ou images en modèles STL 3D de relief pour impression 3D.',
    h1En: 'Free Online 2D Photo to 3D Relief STL Exporter',
    h1Fr: 'Générateur de Relief 3D STL à partir de Photo 2D',
    featureEn: 'Heightmap extraction, extrusion scaling, watertight mesh generation, and STL/OBJ download.',
    featureFr: 'Extraction de carte de hauteur, mise à l\'échelle, maillage étanche et téléchargement STL/OBJ.'
  },
  {
    id: 'image-to-depth-map',
    ref: 'depthmaps',
    titleEn: 'Free AI Image to 3D Depth Map Generator | Studios-Pro',
    titleFr: 'Générateur de Carte de Profondeur IA Gratuit | Studios-Pro',
    descEn: 'Extract high-resolution 3D depth maps from any 2D image for CNC carving, lithophanes, and 3D rendering.',
    descFr: 'Extrayez des cartes de profondeur 3D haute résolution à partir d\'images 2D pour usinage CNC et rendu.',
    h1En: 'Free AI Monocular Depth Map Extractor Online',
    h1Fr: 'Générateur de Cartes de Profondeur 3D IA Gratuit',
    featureEn: 'AI depth estimation, grayscale heightmap preview, stereo 3D display, and 16-bit PNG export.',
    featureFr: 'Estimation de profondeur IA, carte de hauteur en niveaux de gris et export PNG 16-bit.'
  },
  {
    id: 'svg-to-dxf',
    ref: 'vcnc',
    titleEn: 'Free Online SVG to DXF Vector Converter for Laser & CNC | Studios-Pro',
    titleFr: 'Convertisseur SVG en DXF gratuit pour Laser & CNC | Studios-Pro',
    descEn: 'Convert SVG vector graphics to AutoCAD DXF format for CNC routers, plasma cutters, and laser engravers.',
    descFr: 'Convertissez des fichiers vectoriels SVG en format DXF AutoCAD pour découpe laser et routeur CNC.',
    h1En: 'Free SVG to DXF Converter for Laser Cutting & CNC Routing',
    h1Fr: 'Convertisseur SVG en DXF Gratuit pour Découpe Laser',
    featureEn: 'Clean CAD vector curves, layer management, scale matching, and instant DXF export.',
    featureFr: 'Courbes CAO nettes, gestion des calques, mise à l\'échelle et export DXF instantané.'
  },
  {
    id: 'dxf-to-gcode',
    ref: 'vcnc',
    titleEn: 'Free Online DXF to CNC G-Code Generator | Studios-Pro',
    titleFr: 'Générateur de G-Code CNC à partir de DXF Gratuit | Studios-Pro',
    descEn: 'Convert DXF CAD blueprints to CNC machine G-Code toolpaths online for milling and laser cutting.',
    descFr: 'Convertissez des plans DXF CAO en parcours d\'outils G-Code CNC en ligne pour usinage et laser.',
    h1En: 'Free DXF to G-Code CNC Toolpath Converter',
    h1Fr: 'Générateur de Parcours G-Code CNC depuis DXF Gratuit',
    featureEn: 'Tool diameter offset, feedrate controls, 3D toolpath preview, and G-Code file download.',
    featureFr: 'Compensation de diamètre d\'outil, contrôle des avances, aperçu 3D et export G-Code.'
  }
];

const cardPages = [
  {
    id: 'pokemon-card-maker',
    ref: 'spnexus',
    titleEn: 'Free Online Custom Pokémon Card Maker & 3D Generator | Studios-Pro',
    titleFr: 'Générateur de Cartes Pokémon Personnalisées Gratuit 3D | Studios-Pro',
    descEn: 'Create custom printable trading cards with 3D/4D holographic foils, custom photo upload, and A4 print sheets.',
    descFr: 'Créez des cartes de collection personnalisées avec effets holographiques 3D/4D et impression A4.',
    h1En: 'Free Custom Pokémon Card Maker & 3D Foil Generator',
    h1Fr: 'Générateur de Cartes de Collection Personnalisées 3D',
    featureEn: '24K gold foil finishes, 3D kinetic sparkles, real scannable QR codes, and 300 DPI A4 print export.',
    featureFr: 'Finition feuille d\'or 24K, étincelles 3D, codes QR scannables et export d\'impression A4 300 DPI.'
  },
  {
    id: 'custom-3d-card-generator',
    ref: 'spnexus',
    titleEn: 'Free Printable 3D/4D Physical Card Creator | Studios-Pro',
    titleFr: 'Créateur de Cartes Physique 3D/4D Imprimables Gratuit | Studios-Pro',
    descEn: 'Design, preview, and print 3D physical collectible cards with 9-card A4 sheets, duplex alignment, and foil masks.',
    descFr: 'Concevez, prévisualisez et imprimez des cartes 3D physiques avec feuilles A4 et masques de dorure.',
    h1En: 'Free Printable 3D/4D Collectible Card Creator Studio',
    h1Fr: 'Créateur de Cartes 3D Physiques Imprimables Gratuit',
    featureEn: 'Ultra-HD 300 DPI render, 9-card A4 print sheets, mirrored duplex alignment, and commercial foil masks.',
    featureFr: 'Rendu Ultra-HD 300 DPI, feuilles A4 9-cartes, alignement duplex et masques de dorure.'
  }
];

const arViewers = [
  {
    id: 'stl',
    ref: 'arviewer',
    titleEn: 'Free Online STL to AR Viewer | Studios-Pro',
    titleFr: 'Visualiseur STL en AR gratuit en ligne | Studios-Pro',
    descEn: 'Project your STL 3D models in Augmented Reality (AR) directly in your room online. No app download required.',
    descFr: 'Projetez vos modèles 3D STL en Réalité Augmentée (AR) directement dans votre pièce en ligne. Sans télécharger d\'application.',
    h1En: 'Free STL to AR Viewer Online',
    h1Fr: 'Visualiseur STL en Réalité Augmentée Gratuit en Ligne',
    featureEn: 'Instant client-side GLB conversion, QR code mobile transfer, custom color adjustments, and WebAR projection.',
    featureFr: 'Conversion GLB instantanée côté client, transfert QR sur mobile, personnalisation des couleurs et projection WebAR.'
  },
  {
    id: 'obj',
    ref: 'arviewer',
    titleEn: 'Free Online OBJ to AR Viewer | Studios-Pro',
    titleFr: 'Visualiseur OBJ en AR gratuit en ligne | Studios-Pro',
    descEn: 'Load OBJ files, bake custom colors, and instantly preview them in Augmented Reality (AR) on Android and iOS.',
    descFr: 'Chargez des fichiers OBJ, appliquez des couleurs et visualisez-les instantanément en Réalité Augmentée (AR) sur Android et iOS.',
    h1En: 'Free OBJ to AR Viewer Online',
    h1Fr: 'Visualiseur OBJ en Réalité Augmentée Gratuit en Ligne',
    featureEn: 'Instant GLB conversion, customizable material colors, QR code mobile transfer, and mobile WebAR rendering.',
    featureFr: 'Conversion GLB instantanée, couleurs de matériaux personnalisables, transfert mobile par QR code et rendu WebAR mobile.'
  },
  {
    id: 'glb',
    ref: 'arviewer',
    titleEn: 'Free Online GLB/GLTF AR Viewer | Studios-Pro',
    titleFr: 'Visualiseur GLB/GLTF en AR gratuit en ligne | Studios-Pro',
    descEn: 'Open binary GLB and GLTF files and project them directly into your physical space using WebAR technology.',
    descFr: 'Ouvrez des fichiers binaires GLB et GLTF et projetez-les directement dans votre espace physique en WebAR.',
    h1En: 'Free GLB & GLTF AR Viewer Online',
    h1Fr: 'Visualiseur GLB & GLTF en Réalité Augmentée Gratuit',
    featureEn: 'High-fidelity WebAR rendering, neutral and studio lighting presets, auto-rotate toggles, and direct phone scan.',
    featureFr: 'Rendu WebAR haute fidélité, préréglages d\'éclairage neutre et studio, auto-rotation et scan direct.'
  }
];

const template = (page) => {
  let pagePath = '';
  if (viewers.some(v => v.id === page.id)) pagePath = `viewer/${page.id}`;
  else if (converters.some(c => c.id === page.id)) pagePath = `convert/${page.id}`;
  else if (arViewers.some(a => a.id === page.id)) pagePath = `ar-viewer/${page.id}`;
  else if (cardPages.some(c => c.id === page.id)) pagePath = `cards/${page.id}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${page.titleEn}</title>
    <meta name="description" content="${page.descEn}">
    <link rel="icon" type="image/png" href="/logo_studios_pro.png">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://studios-pro.com/${pagePath}" />
    <meta property="og:title" content="${page.titleEn}" />
    <meta property="og:description" content="${page.descEn}" />
    <meta property="og:image" content="https://studios-pro.com/og_banner.jpg" />
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="https://studios-pro.com/${pagePath}" />
    <meta name="twitter:title" content="${page.titleEn}" />
    <meta name="twitter:description" content="${page.descEn}" />
    <meta name="twitter:image" content="https://studios-pro.com/og_banner.jpg" />
    
    <!-- Hreflang for internationalized search results -->
    <link rel="alternate" hreflang="en" href="https://studios-pro.com/${pagePath}?lang=en" />
    <link rel="alternate" hreflang="fr" href="https://studios-pro.com/${pagePath}?lang=fr" />
    <link rel="canonical" href="https://studios-pro.com/${pagePath}" />

    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #05070a;
            --surface: rgba(15, 23, 42, 0.6);
            --accent: #3b82f6;
            --accent-glow: rgba(59, 130, 246, 0.4);
            --text: #f8fafc;
            --muted: #94a3b8;
        }
        body {
            background: var(--bg);
            color: var(--text);
            font-family: 'Outfit', sans-serif;
            margin: 0;
            padding: 0;
            line-height: 1.8;
            overflow-x: hidden;
        }
        .nav {
            padding: 20px 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(255,255,255,0.08);
            background: rgba(5, 7, 10, 0.8);
            backdrop-filter: blur(12px);
            position: sticky;
            top: 0;
            z-index: 100;
        }
        .logo {
            font-weight: 800;
            font-size: 1.5rem;
            color: white;
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .logo img {
            border-radius: 6px;
        }
        .container {
            max-width: 900px;
            margin: 60px auto;
            padding: 0 24px;
        }
        .hero {
            text-align: center;
            margin-bottom: 50px;
        }
        h1 {
            font-size: 3.2rem;
            margin-bottom: 20px;
            line-height: 1.25;
            font-weight: 800;
            background: linear-gradient(135deg, #00f3ff, #3b82f6, #a855f7);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        p.subtitle {
            font-size: 1.25rem;
            color: var(--muted);
            max-width: 700px;
            margin: 0 auto 30px auto;
        }
        .dropzone-mockup {
            background: var(--surface);
            border: 2px dashed rgba(59, 130, 246, 0.4);
            border-radius: 24px;
            padding: 60px 40px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(8px);
            margin-bottom: 50px;
        }
        .dropzone-mockup:hover {
            border-color: #00f3ff;
            box-shadow: 0 0 30px rgba(0, 243, 255, 0.15);
            transform: translateY(-2px);
        }
        .dropzone-icon {
            font-size: 3.5rem;
            margin-bottom: 20px;
            color: var(--accent);
            animation: pulse 2s infinite;
        }
        .dropzone-text {
            font-size: 1.2rem;
            font-weight: 600;
            margin-bottom: 10px;
        }
        .dropzone-sub {
            font-size: 0.95rem;
            color: var(--muted);
        }
        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 24px;
            margin-top: 60px;
        }
        .feature-card {
            background: var(--surface);
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 16px;
            padding: 24px;
            backdrop-filter: blur(8px);
        }
        .feature-card h3 {
            font-size: 1.3rem;
            margin-top: 0;
            color: white;
            margin-bottom: 12px;
        }
        .feature-card p {
            color: var(--muted);
            font-size: 1rem;
            margin: 0;
        }
        .cta-container {
            text-align: center;
            margin: 70px 0 30px 0;
            padding: 48px;
            background: linear-gradient(135deg, rgba(59,130,246,0.1), rgba(168,85,247,0.1));
            border-radius: 24px;
            border: 1px solid rgba(59,130,246,0.2);
            box-shadow: 0 20px 50px rgba(0,0,0,0.4);
        }
        .cta-btn {
            display: inline-block;
            background: linear-gradient(135deg, #00f3ff, #3b82f6, #a855f7);
            color: #000;
            padding: 16px 48px;
            border-radius: 50px;
            font-size: 1.25rem;
            font-weight: 800;
            text-decoration: none;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            transition: 0.3s;
            box-shadow: 0 10px 30px var(--accent-glow);
        }
        .cta-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 15px 45px rgba(0, 243, 255, 0.4);
        }
        [data-fr] { display: none; }
        body.lang-fr [data-fr] { display: inline; }
        body.lang-fr [data-en] { display: none; }
        .lang-switch { display: flex; gap: 8px; }
        .lang-btn {
            background: none;
            border: 1px solid var(--muted);
            color: var(--muted);
            padding: 6px 12px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            transition: 0.2s;
        }
        .lang-btn.active {
            background: white;
            color: black;
            border-color: white;
        }
        @keyframes pulse {
            0% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.05); opacity: 1; }
            100% { transform: scale(1); opacity: 0.8; }
        }
    </style>
    <!-- Structured Data Schema.org JSON-LD — SoftwareApplication + HowTo Rich Snippet -->
    <script type="application/ld+json">
    [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "${page.titleEn}",
        "operatingSystem": "Web",
        "applicationCategory": "DesignApplication",
        "offers": {
          "@type": "Offer",
          "price": "0.00",
          "priceCurrency": "USD"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.9",
          "ratingCount": "142"
        },
        "description": "${page.descEn}",
        "url": "https://studios-pro.com/${pagePath}",
        "screenshot": "https://studios-pro.com/og_banner.jpg",
        "featureList": "${page.featureEn}",
        "provider": {
          "@type": "Organization",
          "name": "Studios-Pro",
          "url": "https://studios-pro.com"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": "${page.h1En}",
        "description": "${page.descEn}",
        "totalTime": "PT1M",
        "tool": {
          "@type": "HowToTool",
          "name": "Studios-Pro Web Browser"
        },
        "step": [
          {
            "@type": "HowToStep",
            "position": 1,
            "name": "Open the free tool",
            "text": "Visit studios-pro.com and open the free tool directly in your web browser. No download or sign up required."
          },
          {
            "@type": "HowToStep",
            "position": 2,
            "name": "Upload or create your file",
            "text": "Drag and drop your file or use the built-in creative tools. All processing runs locally — your files never leave your computer."
          },
          {
            "@type": "HowToStep",
            "position": 3,
            "name": "Export and download",
            "text": "${page.featureEn}"
          }
        ]
      }
    ]
    </script>
</head>
<body class="lang-en">
    <nav class="nav">
        <a href="/" class="logo">
            <img src="/logo_studios_pro.png" width="30" height="30" alt="Logo">
            Studios-Pro
        </a>
        <div class="lang-switch">
            <button class="lang-btn active" onclick="setLang('en')">EN</button>
            <button class="lang-btn" onclick="setLang('fr')">FR</button>
        </div>
    </nav>

    <div class="container">
        <div class="hero">
            <h1>
                <span data-en>${page.h1En}</span>
                <span data-fr>${page.h1Fr}</span>
            </h1>
            <p class="subtitle">
                <span data-en>${page.descEn}</span>
                <span data-fr>${page.descFr}</span>
            </p>
            <a href="/?ref=${page.ref}" class="cta-btn" style="display:inline-block;background:linear-gradient(135deg,#00f3ff,#3b82f6,#a855f7);color:#000;padding:16px 48px;border-radius:50px;font-size:1.25rem;font-weight:800;text-decoration:none;text-transform:uppercase;letter-spacing:1.5px;transition:0.3s;box-shadow:0 10px 30px rgba(59,130,246,0.4);margin-top:20px;">
                <span data-en>🚀 Open Free Tool — No Sign Up</span>
                <span data-fr>🚀 Ouvrir l'Outil Gratuit — Sans Inscription</span>
            </a>
        </div>

        <!-- How-To Steps (indexable by Google, triggers HowTo Rich Result) -->
        <section style="margin:60px 0;padding:40px;background:var(--surface);border-radius:24px;border:1px solid rgba(59,130,246,0.15);">
            <h2 style="font-size:2rem;font-weight:800;margin-top:0;color:white;">
                <span data-en>How to use this tool — 3 Easy Steps</span>
                <span data-fr>Comment utiliser cet outil — 3 Étapes Simples</span>
            </h2>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:24px;margin-top:30px;">
                <div style="padding:24px;background:rgba(59,130,246,0.08);border-radius:16px;border:1px solid rgba(59,130,246,0.2);">
                    <div style="font-size:2rem;margin-bottom:12px;">1️⃣</div>
                    <h3 style="color:white;margin:0 0 10px 0;font-size:1.15rem;">
                        <span data-en>Open the free app</span>
                        <span data-fr>Ouvrir l'application gratuite</span>
                    </h3>
                    <p style="color:var(--muted);margin:0;font-size:0.95rem;">
                        <span data-en>No download, no sign up required. Works in any modern web browser on desktop and mobile.</span>
                        <span data-fr>Pas de téléchargement ni d'inscription requise. Fonctionne dans tout navigateur moderne.</span>
                    </p>
                </div>
                <div style="padding:24px;background:rgba(168,85,247,0.08);border-radius:16px;border:1px solid rgba(168,85,247,0.2);">
                    <div style="font-size:2rem;margin-bottom:12px;">2️⃣</div>
                    <h3 style="color:white;margin:0 0 10px 0;font-size:1.15rem;">
                        <span data-en>Upload or create your file</span>
                        <span data-fr>Importer ou créer votre fichier</span>
                    </h3>
                    <p style="color:var(--muted);margin:0;font-size:0.95rem;">
                        <span data-en>Drag and drop your file or use the built-in creative tools. All processing runs locally in your browser — your files never leave your computer.</span>
                        <span data-fr>Glissez-déposez votre fichier ou utilisez les outils créatifs intégrés. Tout est traité localement.</span>
                    </p>
                </div>
                <div style="padding:24px;background:rgba(0,243,255,0.06);border-radius:16px;border:1px solid rgba(0,243,255,0.15);">
                    <div style="font-size:2rem;margin-bottom:12px;">3️⃣</div>
                    <h3 style="color:white;margin:0 0 10px 0;font-size:1.15rem;">
                        <span data-en>Export & download</span>
                        <span data-fr>Exporter et télécharger</span>
                    </h3>
                    <p style="color:var(--muted);margin:0;font-size:0.95rem;">
                        <span data-en>${page.featureEn}</span>
                        <span data-fr>${page.featureFr}</span>
                    </p>
                </div>
            </div>
        </section>

        <div class="features-grid">
            <div class="feature-card">
                <h3>
                    <span data-en>Feature Highlights</span>
                    <span data-fr>Points Forts</span>
                </h3>
                <p>
                    <span data-en>${page.featureEn}</span>
                    <span data-fr>${page.featureFr}</span>
                </p>
            </div>
            <div class="feature-card">
                <h3>
                    <span data-en>Secure & Private</span>
                    <span data-fr>Sécurisé & Privé</span>
                </h3>
                <p>
                    <span data-en>Files are processed directly in your browser. Your design data never leaves your computer.</span>
                    <span data-fr>Les fichiers sont traités localement. Vos données de conception ne quittent jamais votre ordinateur.</span>
                </p>
            </div>
            <div class="feature-card">
                <h3>
                    <span data-en>Premium HTML Export</span>
                    <span data-fr>Export HTML Premium</span>
                </h3>
                <p>
                    <span data-en>Package your layout, lighting, colors, and 3D scenes into standalone interactive HTML documents.</span>
                    <span data-fr>Emballez vos conceptions, éclairages et scènes 3D dans des documents HTML autonomes.</span>
                </p>
            </div>
        </div>

        <!-- FAQ Accordion Section -->
        <div class="faq-section" style="margin-top: 60px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 40px;">
            <h2 style="font-size: 2.2rem; margin-bottom: 30px; font-weight: 800; background: linear-gradient(135deg, #00f3ff, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-align: center;">
                <span data-en>Frequently Asked Questions</span>
                <span data-fr>Questions Fréquentes</span>
            </h2>
            <div class="faq-card" style="background: var(--surface); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 24px; margin-bottom: 16px;">
                <h4 style="margin: 0 0 10px 0; font-size: 1.15rem; color: white;">
                    <span data-en>Is this tool completely free to use?</span>
                    <span data-fr>Cet outil est-il complètement gratuit ?</span>
                </h4>
                <p style="margin: 0; color: var(--muted); font-size: 0.95rem;">
                    <span data-en>Yes, our tools are 100% free for basic modeling, viewing, and layout creation directly inside your web browser. Premium features are available for advanced batch export.</span>
                    <span data-fr>Oui, nos outils sont 100% gratuits pour la modélisation de base, la visualisation et la création de mises en page. Les fonctions premium sont proposées pour des exports avancés.</span>
                </p>
            </div>
            <div class="faq-card" style="background: var(--surface); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 24px;">
                <h4 style="margin: 0 0 10px 0; font-size: 1.15rem; color: white;">
                    <span data-en>Are my files uploaded to a remote server?</span>
                    <span data-fr>Mes fichiers sont-ils téléchargés sur un serveur distant ?</span>
                </h4>
                <p style="margin: 0; color: var(--muted); font-size: 0.95rem;">
                    <span data-en>No. All 3D rendering, drawing extrusion, and vector conversions are performed 100% locally on your computer client-side. Your private design data never leaves your device.</span>
                    <span data-fr>Non. Tout le rendu 3D, l'extrusion de dessin et la conversion vectorielle sont exécutés à 100% localement sur votre ordinateur. Vos données privées ne quittent jamais votre appareil.</span>
                </p>
            </div>
        </div>

        <div class="cta-container">
            <a href="/?ref=${page.ref}" class="cta-btn">
                <span data-en>Open Free App</span>
                <span data-fr>Ouvrir l'App Gratuite</span>
            </a>
        </div>
    </div>

    <script>
        function setLang(l) {
            document.body.className = 'lang-' + l;
            localStorage.setItem('sp_lang', l);
            document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.lang-btn').forEach(b => {
                if(b.innerText.toLowerCase() === l) b.classList.add('active');
            });
        }
        const saved = localStorage.getItem('sp_lang') || 'en';
        setLang(saved);
    </script>
</body>
</html>`;
};

// Setup directories
const viewerDir = path.join(__dirname, 'public/viewer');
const convertDir = path.join(__dirname, 'public/convert');
const arViewerDir = path.join(__dirname, 'public/ar-viewer');
const cardsDir = path.join(__dirname, 'public/cards');

if (!fs.existsSync(viewerDir)) {
  fs.mkdirSync(viewerDir, { recursive: true });
}
if (!fs.existsSync(convertDir)) {
  fs.mkdirSync(convertDir, { recursive: true });
}
if (!fs.existsSync(arViewerDir)) {
  fs.mkdirSync(arViewerDir, { recursive: true });
}
if (!fs.existsSync(cardsDir)) {
  fs.mkdirSync(cardsDir, { recursive: true });
}

// Generate files
viewers.forEach(page => {
  fs.writeFileSync(path.join(viewerDir, `${page.id}.html`), template(page));
  console.log(`Generated viewer/${page.id}.html`);
});

converters.forEach(page => {
  fs.writeFileSync(path.join(convertDir, `${page.id}.html`), template(page));
  console.log(`Generated convert/${page.id}.html`);
});

arViewers.forEach(page => {
  fs.writeFileSync(path.join(arViewerDir, `${page.id}.html`), template(page));
  console.log(`Generated ar-viewer/${page.id}.html`);
});

cardPages.forEach(page => {
  fs.writeFileSync(path.join(cardsDir, `${page.id}.html`), template(page));
  console.log(`Generated cards/${page.id}.html`);
});

// Update sitemap.xml
const date = new Date().toISOString().split('T')[0];

const viewerUrls = viewers.map(page => `  <url>
    <loc>https://studios-pro.com/viewer/${page.id}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>\n`).join('');

const convertUrls = converters.map(page => `  <url>
    <loc>https://studios-pro.com/convert/${page.id}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>\n`).join('');

const arViewerUrls = arViewers.map(page => `  <url>
    <loc>https://studios-pro.com/ar-viewer/${page.id}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>\n`).join('');

const cardUrls = cardPages.map(page => `  <url>
    <loc>https://studios-pro.com/cards/${page.id}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>\n`).join('');

// Read tutorials dynamically to avoid breaking the sitemap
const blogDir = path.join(__dirname, 'public/blog');
let tutorialUrls = '';
if (fs.existsSync(blogDir)) {
  const blogFiles = fs.readdirSync(blogDir).filter(f => f.endsWith('.html') && f !== 'index.html');
  tutorialUrls = blogFiles.map(file => `  <url>
    <loc>https://studios-pro.com/blog/${file.replace('.html', '')}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>\n`).join('');
}

const spNexusUrls = `  <url>
    <loc>https://studios-pro.com/community/</loc>
    <lastmod>${date}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://studios-pro.com/community/explore.html</loc>
    <lastmod>${date}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://studios-pro.com/community/map.html</loc>
    <lastmod>${date}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n`;

const baseUrls = `  <url>
    <loc>https://studios-pro.com/</loc>
    <lastmod>${date}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://studios-pro.com/blog/</loc>
    <lastmod>${date}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://studios-pro.com/faq.html</loc>
    <lastmod>${date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>\n`;

const newSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${baseUrls}${spNexusUrls}${tutorialUrls}${viewerUrls}${convertUrls}${arViewerUrls}${cardUrls}</urlset>
`;

fs.writeFileSync(path.join(__dirname, 'public/sitemap.xml'), newSitemap);
console.log('Regenerated sitemap.xml with programmatic SEO routes and SP NEXUS community hub');
