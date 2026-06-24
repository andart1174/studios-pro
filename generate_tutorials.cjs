const fs = require('fs');
const path = require('path');

const tutorials = [
  {
    id: 'architect-pro-1',
    titleEn: 'Architect Pro 1 | Studios-Pro',
    titleFr: 'Architect Pro 1 | Studios-Pro',
    descEn: 'A guide to using Architect Pro 1 for professional 2D and 3D floor drafting.',
    descFr: 'Un guide pour utiliser Architect Pro 1 pour le dessin professionnel de plans 2D et 3D.',
    h1En: 'Professional Architectural Drafting with Architect Pro 1',
    h1Fr: 'Dessin Architectural Professionnel avec Architect Pro 1',
    tag: 'Architect Pro',
    cardH2En: 'Draft Precision 2D/3D Floor Plans',
    cardH2Fr: 'Dessinez des Plans 2D/3D avec Précision',
    cardPEn: 'Master architectural layout design, structural measurements, and 3D previews.',
    cardPFr: 'Maîtrisez la conception de plans, les mesures structurelles et les aperçus 3D.',
    ref: 'arp1',
    sections: [
      {
        h2En: 'Drafting 2D Floor Plans',
        h2Fr: 'Dessin de Plans 2D',
        pEn: 'Start your project by plotting precise walls, doors, and windows on a top-down architectural grid. Measurements are instantly translated into real-world units, ensuring your designs adhere to professional standards.',
        pFr: 'Commencez votre projet en traçant des murs, portes et fenêtres avec précision sur une grille architecturale de haut en bas. Les mesures sont instantanément traduites en unités réelles.'
      },
      {
        h2En: 'Seamless 3D Visualization',
        h2Fr: 'Visualisation 3D Transparente',
        pEn: 'Once your 2D lines are drawn, switch instantly to 3D mode. Watch your floorplan extrude into realistic rooms. Export your final blueprints directly as professional CAD-ready formats.',
        pFr: "Une fois vos lignes 2D dessinées, passez instantanément en mode 3D. Regardez votre plan s'extruder en pièces réalistes. Exportez vos plans sous des formats professionnels."
      }
    ]
  },
  {
    id: 'architect-pro-2',
    titleEn: 'Architect Pro 2 | Studios-Pro',
    titleFr: 'Architect Pro 2 | Studios-Pro',
    descEn: 'Discover advanced house building, real-time 3D tours, and high-quality rendering in Architect Pro 2.',
    descFr: 'Découvrez la construction avancée de maisons, les visites 3D en temps réel et le rendu de haute qualité dans Architect Pro 2.',
    h1En: 'Advanced House Building with Architect Pro 2',
    h1Fr: 'Construction Avancée avec Architect Pro 2',
    tag: 'Architect Pro 2',
    cardH2En: 'Build Interactive 3D Houses',
    cardH2Fr: 'Construisez des Maisons Interactives 3D',
    cardPEn: 'Create multi-story architectures with procedural roofs and realistic lighting.',
    cardPFr: 'Créez des architectures à plusieurs étages avec toits procéduraux et éclairage réaliste.',
    ref: 'arp2',
    sections: [
      {
        h2En: 'Procedural House Generation',
        h2Fr: 'Génération Procédurale de Maison',
        pEn: 'Go beyond simple walls. Architect Pro 2 introduces procedural roofs, complex multi-story stacking, and parametric external environments that give context to your structural creations.',
        pFr: "Allez au-delà des simples murs. Architect Pro 2 introduit des toits procéduraux, l'empilement complexe d'étages et des environnements externes paramétriques."
      },
      {
        h2En: 'Interactive Walkthroughs',
        h2Fr: 'Visites Interactives',
        pEn: 'Step inside your design using the first-person camera mode. Navigate through doors, analyze natural lighting across different rooms, and export the entire 3D scene securely to GLB/STL.',
        pFr: "Entrez dans votre conception en utilisant le mode caméra à la première personne. Naviguez à travers les portes, analysez l'éclairage naturel et exportez la scène."
      }
    ]
  },
  {
    id: 'figure-builder',
    titleEn: '4D Figure Builder | Studios-Pro',
    titleFr: '4D Figure Builder | Studios-Pro',
    descEn: 'Learn how to generate and record interactive hyperdimensional geometric figures.',
    descFr: 'Apprenez à générer et enregistrer des figures géométriques hyperdimensionnelles interactives.',
    h1En: 'Explore Hyperdimensions with 4D Figure Builder',
    h1Fr: 'Explorez les Hyperdimensions avec 4D Figure Builder',
    tag: '4D Builder',
    cardH2En: 'Animate and Export 4D Polytopes',
    cardH2Fr: 'Animez et Exportez des Polytopes 4D',
    cardPEn: 'Morph real-time hypercubes, apply chromatic VFX, and record HD videos.',
    cardPFr: 'Transformez des hypercubes en temps réel, appliquez des effets visuels chromatiques et enregistrez des vidéos HD.',
    ref: 'figb',
    sections: [
      {
        h2En: 'W-Axis Manipulation',
        h2Fr: "Manipulation de l'Axe W",
        pEn: 'Venture outside standard 3D space by manipulating the 4th spatial dimension (W). Create Tesseracts, Glommers, and Alien parametric geometries that morph continuously over time using the double-rotation matrix.',
        pFr: "Aventurez-vous en dehors de l'espace 3D standard en manipulant la 4ème dimension (W). Créez des tesseracts et des géométries paramétriques extraterrestres qui se transforment."
      },
      {
        h2En: 'Cinematic Video Recording',
        h2Fr: 'Enregistrement Vidéo Cinématographique',
        pEn: 'Utilize professional post-processing effects like Chromatic Aberration and Bloom. Once your animation is perfect, use the integrated REC panel to export a high-fidelity WebM video with audio included.',
        pFr: "Utilisez des effets de post-traitement professionnels tels que l'Aberration Chromatique. Une fois votre animation parfaite, utilisez le panneau REC pour exporter une vidéo haute fidélité."
      }
    ]
  },
  {
    id: 'music-composer',
    titleEn: '4D Music Composer | Studios-Pro',
    titleFr: '4D Music Composer | Studios-Pro',
    descEn: 'A guide to syncing visual art with interactive synthesizers and beat loops in 4D Music Composer.',
    descFr: "Un guide pour synchroniser l'art visuel avec des synthétiseurs interactifs et des boucles de rythme.",
    h1En: 'Interactive Audio-Visuals in 4D Music Composer',
    h1Fr: 'Audio-Visuel Interactif dans 4D Music Composer',
    tag: '4D Music',
    cardH2En: 'Compose Audio-Reactive Worlds',
    cardH2Fr: 'Composez des Mondes Audio-Réactifs',
    cardPEn: 'Mix keyboard synthesizers, layer loop tracks, and sync them with 3D visuals.',
    cardPFr: 'Mélangez des synthétiseurs, superposez des pistes et synchronisez-les avec des visuels 3D.',
    ref: 'musc',
    sections: [
      {
        h2En: 'Loop Layering and Synths',
        h2Fr: 'Superposition de Boucles et Synthétiseurs',
        pEn: 'Access the 4D Music Studio drawer to perform live. Use your keyboard to play the synthesizer and record up to 3 separate loop layers (F1, F2, F3) that playback synchronously in perfect BPM harmony.',
        pFr: "Accédez au tiroir 4D Music Studio pour jouer en direct. Utilisez votre clavier pour jouer du synthétiseur et enregistrez jusqu'à 3 couches de boucles séparées."
      },
      {
        h2En: 'Visual Beat Synchronization',
        h2Fr: 'Synchronisation Visuelle Rythmique',
        pEn: 'Every note you play or sequence natively impacts the 3D environment. Text meshes pulse, particles scatter, and the neon geometry expands exactly to the audio amplitude, leading to stunning video exports.',
        pFr: "Chaque note que vous jouez impacte nativement l'environnement 3D. Le texte pulse, les particules se dispersent et la géométrie s'étend exactement selon l'amplitude audio."
      }
    ]
  },
  {
    id: 'design-pro-studio',
    titleEn: 'Design Pro Studio | Studios-Pro',
    titleFr: 'Design Pro Studio | Studios-Pro',
    descEn: 'Learn how to master advanced vector layouts and UI/UX flows in Design Pro Studio.',
    descFr: 'Apprenez à maîtriser les mises en page vectorielles avancées et les flux UI/UX.',
    h1En: 'Master Vector Layouts with Design Pro Studio',
    h1Fr: 'Maîtrisez le Design Vectoriel avec Design Pro Studio',
    tag: 'Design Pro',
    cardH2En: 'Create Advanced Vector Graphics',
    cardH2Fr: 'Créez des Graphiques Vectoriels Avancés',
    cardPEn: 'A powerful tool for UI mockups, mind-mapping, and exporting SVG diagrams.',
    cardPFr: "Un outil puissant pour les maquettes UI, les cartes mentales et l'exportation de diagrammes SVG.",
    ref: 'desp',
    sections: [
      {
        h2En: 'Infinite Canvas Workspace',
        h2Fr: 'Espace de Travail à Toile Infinie',
        pEn: 'Design Pro Studio offers endless space to drop shapes, create connecting nodes, and build complex algorithmic flowcharts or UI visual designs with perfect snapped precision.',
        pFr: 'Design Pro Studio offre un espace infini pour déposer des formes, créer des nœuds de connexion et construire des organigrammes ou des conceptions visuelles UI.'
      },
      {
        h2En: 'Exporting Universal Assets',
        h2Fr: 'Exportation de Ressources Universelles',
        pEn: 'Whether you need a transparent PNG for a website or a scalable SVG for CNC and Laser pathing, the studio provides reliable exports with grouping and layer hierarchy preserved.',
        pFr: "Que vous ayez besoin d'un PNG transparent ou d'un SVG évolutif pour CNC, le studio fournit des exportations fiables tout en préservant la hiérarchie."
      }
    ]
  },
  {
    id: 'zen-sandscape',
    titleEn: 'Zen Sandscape Simulator | Studios-Pro',
    titleFr: 'Simulateur Zen Sandscape | Studios-Pro',
    descEn: 'Learn how to paint with interactive physics elements and download standalone HTML simulations in Zen Sandscape.',
    descFr: 'Apprenez à peindre avec des éléments physiques interactifs et téléchargez des simulations HTML autonomes dans Zen Sandscape.',
    h1En: 'Interactive Sand Physics Painting with Zen Sandscape',
    h1Fr: 'Peinture de Sable Physique Interactive avec Zen Sandscape',
    tag: 'Zen Sandscape',
    cardH2En: 'Create and Export Sand Physics Simulations',
    cardH2Fr: 'Créez et Exportez des Simulations de Sable',
    cardPEn: 'Simulate sand gravity, portal warps, volcanic lava, voltage sparks, and export full-screen offline interactive HTML files.',
    cardPFr: 'Simulez la gravité du sable, les portails, la lave, les étincelles et exportez des fichiers HTML autonomes plein écran.',
    ref: 'sandbox',
    sections: [
      {
        h2En: 'Fascinating Physics Particles',
        h2Fr: 'Particules Physiques Fascinantes',
        pEn: 'Zen Sandscape introduces dynamic particle simulation. Paint with interactive elements like falling sand, flowing water, expanding fire, toxic acid, voltage sparks, and portal teleporters. Watch them interact in real-time under custom wind and gravity controls.',
        pFr: "Zen Sandscape introduit une simulation dynamique de particules. Peignez avec des éléments interactifs comme le sable, l'eau, le feu, l'acide, les étincelles et les téléporteurs de portail. Observez leurs interactions en temps réel sous des contrôles de vent et de gravité personnalisés."
      },
      {
        h2En: 'Offline Standalone HTML Export',
        h2Fr: 'Exportation HTML Autonome Hors Ligne',
        pEn: 'Create your perfect animated landscape, then click the HTML export button. Studios-Pro compiles a clean, fullscreen, offline-ready simulation file. It strips all UI controls and editing panels, allowing your audience to enjoy a pure, immersive physical simulation.',
        pFr: "Créez votre paysage animé parfait, puis cliquez sur le bouton d'exportation HTML. Studios-Pro compile un fichier de simulation curat, pe tot ecranul și pregătit pentru utilizare offline, eliminând panourile de control."
      }
    ]
  },
  {
    id: '3d-studio',
    titleEn: '3D Studio - Procedural Modeling | Studios-Pro',
    titleFr: 'Studio 3D - Modélisation Procédurale | Studios-Pro',
    descEn: 'A comprehensive guide to designing, editing, and custom-building 3D models procedurally in your browser.',
    descFr: 'Un guide complet pour concevoir, éditer et créer des modèles 3D procéduraux dans votre navigateur.',
    h1En: 'Procedural 3D Modeling and Mesh Customization',
    h1Fr: 'Modélisation 3D Procédurale et Personnalisation de Maillage',
    tag: '3D Studio',
    cardH2En: 'Create Custom 3D Models',
    cardH2Fr: 'Créez des Modèles 3D sur Mesure',
    cardPEn: 'Design complex procedural geometries and customize meshes in real-time.',
    cardPFr: 'Concevez des géométries procédurales complexes et personnalisez les maillages.',
    ref: 'ap3d',
    sections: [
      {
        h2En: 'Procedural Mesh Generation',
        h2Fr: 'Génération de Maillage Procédural',
        pEn: 'Create highly detailed mechanical parts, Calibration Cubes, or Torus Knots using real-time parameter controls.',
        pFr: 'Créez des pièces mécaniques détaillées ou des nœuds toriques en utilisant des paramètres en temps réel.'
      },
      {
        h2En: 'Material and Grid Customization',
        h2Fr: 'Personnalisation des Matériaux',
        pEn: 'Apply gold, chrome, neon, or glass textures. Adjust the background color and lighting environment for optimal rendering.',
        pFr: "Appliquez des textures d'or, chrome, néon ou verre. Ajustez la couleur de fond et l'environnement lumineux."
      }
    ]
  },
  {
    id: 'studio-3d-viewer',
    titleEn: 'Studio 3D Viewer - Online CAD Inspector | Studios-Pro',
    titleFr: 'Studio 3D Viewer - Inspecteur CAO en ligne | Studios-Pro',
    descEn: 'Free online CAD viewer. Drag & drop STL, OBJ, GLB files to inspect, scale, translate, measure, and slice models.',
    descFr: "Visualiseur CAO gratuit en ligne. Glissez-déposez des fichiers STL, OBJ, GLB pour inspecter, mettre à l'échelle et mesurer.",
    h1En: 'Online 3D Model Inspection, Slicing & Measurement',
    h1Fr: 'Inspection de Modèles 3D, Coupe et Mesure en ligne',
    tag: '3D Viewer',
    cardH2En: 'Inspect and Slice 3D Models',
    cardH2Fr: 'Inspectez et Coupez des Modèles 3D',
    cardPEn: 'Drag & drop STL, OBJ, GLB files to measure distances and slice along X/Y/Z axes.',
    cardPFr: 'Glissez-déposez des fichiers STL, OBJ, GLB pour mesurer et couper selon les axes X/Y/Z.',
    ref: 's3dviewer',
    sections: [
      {
        h2En: 'Cross-Section Slicing and Cap Fill',
        h2Fr: 'Coupe Transversale et Remplissage',
        pEn: 'Slice through any 3D model using the clipping plane tool. Enable color fills and custom opacity on section caps to analyze internal geometries.',
        pFr: "Coupez n'importe quel modèle 3D à l'aide de plans de coupe. Activez le remplissage de couleur et réglez l'opacité."
      },
      {
        h2En: 'Precise CAD Measurement Tool',
        h2Fr: 'Outil de Mesure CAO Précis',
        pEn: 'Click any two points on the model surface to instantly calculate the distance in real-world millimeters (mm), essential for 3D printing and engineering.',
        pFr: 'Cliquez sur deux points du modèle pour calculer instantanément la distance en millimètres réels.'
      }
    ]
  },
  {
    id: 'dfx-studio',
    titleEn: 'DFX Studio - Particle Physics and Flow Design | Studios-Pro',
    titleFr: 'Studio DFX - Physique des Particules | Studios-Pro',
    descEn: 'Simulate flow physics, interactive particle fields, and design vector paths in DFX Studio.',
    descFr: 'Simulez la physique des fluides, des champs de particules et concevez des chemins vectoriels.',
    h1En: 'Interactive Particle Fields & Vector Flow Simulation',
    h1Fr: 'Simulation Interactive de Particules et Flux Vectoriels',
    tag: 'DFX Studio',
    cardH2En: 'Simulate Flow Particles & Vectors',
    cardH2Fr: 'Simulez des Particules de Flux',
    cardPEn: 'Design complex vector flow fields and sync them with interactive particles.',
    cardPFr: 'Concevez des champs de flux vectoriels et synchronisez-les avec des particules.',
    ref: 'dfx',
    sections: [
      {
        h2En: 'Vector Flow Fields',
        h2Fr: 'Champs de Flux Vectoriels',
        pEn: 'Create stunning vector flow layouts. Define attractor nodes, rotational vortexes, and magnetic repellers that direct particle trajectories.',
        pFr: "Créez de superbes champs de flux. Définissez des nœuds d'attraction, des vortex rotatifs et des répulsifs."
      },
      {
        h2En: 'High-Fidelity Particle Rendering',
        h2Fr: 'Rendu de Particules',
        pEn: 'Customize color palettes, glow effects, trail lengths, and download standalone interactive HTML files for offline presentations.',
        pFr: 'Personnalisez les couleurs, les effets luminescents et exportez en HTML interactif.'
      }
    ]
  },
  {
    id: 'depth-maps',
    titleEn: 'AI Depth Maps for 3D Reliefs | Studios-Pro',
    titleFr: 'Cartes de Profondeur IA pour Reliefs 3D | Studios-Pro',
    descEn: 'Generate high-quality depth maps from images using AI to create 3D reliefs for CNC routers.',
    descFr: "Générez des cartes de profondeur à partir d'images avec l'IA pour créer des reliefs 3D.",
    h1En: 'Generate AI Depth Maps for CNC Carving and 3D Printing',
    h1Fr: 'Générer des Cartes de Profondeur IA pour Gravure CNC',
    tag: 'Depth Maps',
    cardH2En: 'Generate AI Depth Maps',
    cardH2Fr: 'Générez des Cartes de Profondeur',
    cardPEn: 'Convert standard flat images to realistic 3D reliefs and displacement maps.',
    cardPFr: 'Convertissez des images plates en reliefs 3D réalistes et cartes de déplacement.',
    ref: 'depth',
    sections: [
      {
        h2En: 'AI-Powered Relief Generation',
        h2Fr: "Génération de Relief par l'IA",
        pEn: 'Upload any image or drawing. The AI algorithm analyzes light values to construct an accurate displacement depth map.',
        pFr: "Téléchargez une image. L'algorithme analyse la lumière pour construire une carte de profondeur."
      },
      {
        h2En: 'CNC and 3D Print Ready',
        h2Fr: 'Prêt pour CNC et Impression 3D',
        pEn: 'Export high-contrast grayscale depth maps, perfect for generating 3D wood carvings on CNC routers or creating lithophanes.',
        pFr: 'Exportez des cartes en niveaux de gris, parfaites pour gravure en bois ou impression 3D.'
      }
    ]
  },
  {
    id: 'new-3d-4d',
    titleEn: 'New 3D 4D - Advanced Mesh Modeling | Studios-Pro',
    titleFr: 'New 3D 4D - Modélisation de Maillage Avancée | Studios-Pro',
    descEn: 'An advanced modeling canvas featuring real-time physics and hyper-geometric mesh creations.',
    descFr: 'Un canevas de modélisation avancé avec physique en temps réel et créations hyper-géométriques.',
    h1En: 'Advanced WebGL Mesh Modeling and Physics Canvas',
    h1Fr: 'Modélisation Avancée WebGL et Canevas Physique',
    tag: 'New 3D 4D',
    cardH2En: 'Design Advanced 3D Meshes',
    cardH2Fr: 'Concevez des Maillages 3D Avancés',
    cardPEn: 'Create procedural geometries with real-time physics and bounding coordinates.',
    cardPFr: 'Créez des géométries procédurales avec physique en temps réel.',
    ref: 'n3d',
    sections: [
      {
        h2En: 'Hyper-Geometric Creations',
        h2Fr: 'Créations Hyper-Géométriques',
        pEn: 'Design multi-faceted meshes, adjust vertices, and generate complex architectural mockups with automated snaps.',
        pFr: 'Concevez des maillages à facettes multiples et générez des maquettes complexes.'
      },
      {
        h2En: 'Real-Time Physics Engine',
        h2Fr: 'Moteur Physique en Temps Réel',
        pEn: 'Enable gravity, wind vectors, and friction to simulate how your designs behave under realistic physical conditions.',
        pFr: 'Activez la gravité et le vent pour simuler les conditions physiques réelles.'
      }
    ]
  },
  {
    id: 'vector-cnc',
    titleEn: 'Vector CNC - SVG to DXF path converter | Studios-Pro',
    titleFr: 'Vector CNC - Convertisseur SVG en DXF | Studios-Pro',
    descEn: 'Convert SVG vector files to DXF paths and generate G-code directly in your web browser.',
    descFr: 'Convertissez des fichiers vectoriels SVG en DXF et générez du G-code dans votre navigateur.',
    h1En: 'Online SVG to DXF Path Converter & G-Code Generator',
    h1Fr: 'Convertisseur SVG en DXF et Générateur de G-Code en ligne',
    tag: 'Vector CNC',
    cardH2En: 'Convert SVG to DXF & G-Code',
    cardH2Fr: 'Convertissez SVG en DXF & G-Code',
    cardPEn: 'Prepare vector artwork for laser cutting, plotting, or CNC machining in seconds.',
    cardPFr: 'Préparez vos tracés pour la découpe laser ou le fraisage CNC.',
    ref: 'vcnc',
    sections: [
      {
        h2En: 'Universal Path Vectorization',
        h2Fr: 'Vectorisation Universelle de Tracés',
        pEn: 'Upload any SVG or image. Convert outline coordinates to CAD-compliant DXF lines, ensuring maximum compatibility with CNC machinery.',
        pFr: 'Téléchargez un SVG. Convertissez les coordonnées en tracés DXF conformes pour CAO.'
      },
      {
        h2En: 'Automatic G-Code Generation',
        h2Fr: 'Génération Automatique de G-Code',
        pEn: 'Define speed, feed rate, and cutting depth to generate ready-to-run G-code files directly in your web browser.',
        pFr: 'Définissez la vitesse et la profondeur pour générer des fichiers G-code.'
      }
    ]
  },
  {
    id: 'studio-pro',
    titleEn: 'Studio Pro 4D - Advanced Environment Designer | Studios-Pro',
    titleFr: "Studio Pro 4D - Concepteur d'Environnement | Studios-Pro",
    descEn: 'Professional 4D procedural environment mapping and animation designer in your browser.',
    descFr: "Concepteur d'environnement procédural 4D et d'animation dans votre navigateur.",
    h1En: 'Professional Procedural Environment and Animation Designer',
    h1Fr: "Concepteur d'Environnement Procédural et d'Animation",
    tag: 'Studio Pro 4D',
    cardH2En: 'Animate Procedural Environments',
    cardH2Fr: 'Animez des Environnements Procéduraux',
    cardPEn: 'Build 4D scenes, apply realistic environment lighting, and export high-res renders.',
    cardPFr: 'Construisez des scènes 4D et appliquez des rendus haute résolution.',
    ref: 'spro',
    sections: [
      {
        h2En: '4D Procedural Architecture',
        h2Fr: 'Architecture Procédurale 4D',
        pEn: 'Generate endless complex terrains, custom weather atmospheric conditions, and lighting maps.',
        pFr: 'Générez des terrains complexes et des conditions météo atmosphériques.'
      },
      {
        h2En: 'High-Resolution Renders',
        h2Fr: 'Rendus Haute Résolution',
        pEn: 'Configure raymarching cameras, adjust shadows, and export production-ready graphics or animatics.',
        pFr: 'Configurez des caméras Raymarching, ajustez les ombres et exportez des rendus.'
      }
    ]
  },
  {
    id: 'maker-studio-7',
    titleEn: 'Maker Studio 7 - Procedural Geometry Maker | Studios-Pro',
    titleFr: 'Maker Studio 7 - Créateur Géométrique | Studios-Pro',
    descEn: 'Design and export parametric boxes, lithophanes, and structural joints.',
    descFr: 'Concevez et exportez des boîtes paramétriques, des lithophanies et des joints structurels.',
    h1En: 'Procedural Parametric Designer for Engineers & Makers',
    h1Fr: 'Paramétrique de Boîtes et Joints structurels',
    tag: 'Maker Studio 7',
    cardH2En: 'Parametric Box & Joint Designer',
    cardH2Fr: 'Conception Paramétrique de Boîtes',
    cardPEn: 'Sketch interlocking joints, layout procedural boxes, and output STL/DXF files.',
    cardPFr: 'Dessinez des joints emboîtables et exportez en STL ou DXF.',
    ref: 'mkr7',
    sections: [
      {
        h2En: 'Interlocking Joint Layouts',
        h2Fr: 'Tracés de Joints Emboîtables',
        pEn: 'Easily design finger joints or t-slots for laser cutters and 3D printers, matching material thickness parameters.',
        pFr: 'Dessinez des joints emboîtables ou des encoches en t pour découpeuse laser.'
      },
      {
        h2En: 'Lithophanes and Textures',
        h2Fr: 'Lithophanies et Textures 3D',
        pEn: 'Convert photos to parametric 3D printed lithophanes that reveal high-definition details when backlit.',
        pFr: 'Convertissez des photos en lithophanies 3D imprimables.'
      }
    ]
  },
  {
    id: 'jewelry-maker-pro',
    titleEn: 'Jewelry Maker Pro - Custom 3D Jewelry CAD | Studios-Pro',
    titleFr: 'Jewelry Maker Pro - CAO de Bijoux 3D | Studios-Pro',
    descEn: 'Interactive 3D custom ring and jewelry builder. Design wedding bands and gems ready for 3D printing.',
    descFr: "Créateur interactif de bagues 3D. Concevez des alliances et des pierres prêtes pour l'impression 3D.",
    h1En: 'Interactive Custom Jewelry Design & 3D Print CAD',
    h1Fr: 'CAO de Conception de Bijoux Personnalisés en ligne',
    tag: 'Jewelry Maker',
    cardH2En: 'Design Custom 3D Printable Rings',
    cardH2Fr: 'Concevez des Alliances Imprimables 3D',
    cardPEn: 'Create detailed wedding bands, set diamonds, and export high-fidelity STL files.',
    cardPFr: 'Créez des alliances détaillées, ajustez des diamants et exportez en STL.',
    ref: 'jwly',
    sections: [
      {
        h2En: 'Parametric Ring Customizer',
        h2Fr: 'Personnalisation de Bagues',
        pEn: 'Adjust band width, ring size, gemstone placement, and metal carats in real-time.',
        pFr: "Ajustez la largeur de l'anneau, la taille, l'emplacement de la pierre et l'or."
      },
      {
        h2En: '3D Print Optimization',
        h2Fr: "Optimisation de l'Impression 3D",
        pEn: 'Export watertight, print-ready STL models optimized for jewelry resin casting and metal fabrication.',
        pFr: 'Exportez des fichiers STL prêts pour la coulée de résine et la fabrication métallique.'
      }
    ]
  },
  {
    id: 'studio-pro-2',
    titleEn: 'Studio Pro 2 - Advanced 4D Rendering | Studios-Pro',
    titleFr: 'Studio Pro 2 - Rendu 4D Avancé | Studios-Pro',
    descEn: 'Discover the upgraded environment, lighting tools, and large-scale polygon exports.',
    descFr: "Découvrez l'environnement amélioré, les outils d'éclairage et les exportations massives.",
    h1En: 'Hyper-Realistic Environment Rendering and Physics Simulation',
    h1Fr: 'Rendu d\'Environnement Hyper-Réaliste et Simulation Physique',
    tag: 'Studio Pro 2',
    cardH2En: 'Render High-Fidelity 4D Scenes',
    cardH2Fr: 'Rendus de Scènes 4D de Haute Qualité',
    cardPEn: 'Discover advanced lighting models, physics constraints, and mass mesh exports.',
    cardPFr: "Découvrez les modèles d'éclairage avancés et l'exportation de maillage.",
    ref: 'spro2',
    sections: [
      {
        h2En: 'Advanced Lighting Calculations',
        h2Fr: "Calculs d'Éclairage Avancés",
        pEn: 'Simulate soft shadows, ambient occlusion, and global illumination directly in your web browser.',
        pFr: "Simulez des ombres douces et l'occlusion ambiante dans votre navigateur."
      },
      {
        h2En: 'Rigid Body Physics Simulation',
        h2Fr: 'Simulation Physique de Corps Rigides',
        pEn: 'Animate interactions, apply collisions, and record smooth motion videos.',
        pFr: 'Animez des interactions physiques et enregistrez des vidéos fluides.'
      }
    ]
  },
  {
    id: 'mech-gen-pro',
    titleEn: 'Mech Gen Pro - Procedural Gear Generator | Studios-Pro',
    titleFr: 'Mech Gen Pro - Générateur d\'Engrenages | Studios-Pro',
    descEn: 'Online procedural gear generator and spur gear calculator. Export mechanical gear designs directly to DXF/SVG.',
    descFr: "Générateur procédural d'engrenages en ligne. Exportez les plans d'engrenage en DXF/SVG.",
    h1En: 'Procedural Mechanical Gear Generator & CAD Layouts',
    h1Fr: 'Générateur d\'Engrenages Mécaniques CAO en ligne',
    tag: 'Mech Gen Pro',
    cardH2En: 'Design Parametric Gears & Cogs',
    cardH2Fr: 'Concevez des Engrenages Paramétriques',
    cardPEn: 'Generate mechanical layouts, calculate spur gear teeth, and export to DXF.',
    cardPFr: 'Générez des engrenages, calculez les dentures et exportez en DXF.',
    ref: 'mechgen',
    sections: [
      {
        h2En: 'Parametric Gear Calculations',
        h2Fr: "Calculs Paramétriques d'Engrenages",
        pEn: 'Input module size, number of teeth, pressure angle, and shaft diameter. The engine instantly plots precise gear profiles.',
        pFr: "Saisissez la taille du module, le nombre de dents et le diamètre de l'alésage."
      },
      {
        h2En: 'Vector CAD Export',
        h2Fr: 'Exportation CAO Vectorielle',
        pEn: 'Export gear layouts directly to SVG or DXF format, ready for laser cutters or CNC milling machines.',
        pFr: 'Exportez les engrenages en SVG ou DXF, prêts pour découpeuse laser.'
      }
    ]
  },
  {
    id: 'scripting-studio',
    titleEn: 'Scripting Studio - Live Code Playground | Studios-Pro',
    titleFr: 'Studio Scripting - Console Interactive | Studios-Pro',
    descEn: 'Write Javascript scripts with hot-reloading WebGL rendering outputs.',
    descFr: 'Écrivez des scripts Javascript avec un rendu WebGL rechargé à chaud.',
    h1En: 'Interactive WebGL Scripting Console & Live Code Output',
    h1Fr: 'Console Interactive Javascript & Rendu WebGL en direct',
    tag: 'Scripting Studio',
    cardH2En: 'Code WebGL Render Scripts',
    cardH2Fr: 'Écrivez des Scripts de Rendu WebGL',
    cardPEn: 'Write code with hot-reloading and interact with direct canvas output.',
    cardPFr: 'Écrivez du code avec rechargement à chaud et observez le rendu WebGL en direct.',
    ref: 'scripting',
    sections: [
      {
        h2En: 'WebGL API Access',
        h2Fr: 'Accès API WebGL',
        pEn: 'Interact directly with shaders, canvas rendering loops, and procedural math inputs.',
        pFr: 'Interagissez directement avec les shaders et le canevas de rendu.'
      },
      {
        h2En: 'Hot-Reloading Output',
        h2Fr: 'Rechargement de Code à Chaud',
        pEn: 'See your visual animations update in real-time as you write and modify code lines.',
        pFr: 'Observez vos animations se mettre à jour en temps réel lors de l\'écriture.'
      }
    ]
  }
];

const template = (tut) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${tut.titleEn}</title>
    <meta name="description" content="${tut.descEn}">
    <link rel="icon" type="image/png" href="/logo_studios_pro.png">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
    <style>
        :root { --bg: #05070a; --surface: #0f172a; --accent: #3b82f6; --text: #f8fafc; --muted: #94a3b8; }
        body { background: var(--bg); color: var(--text); font-family: 'Outfit', sans-serif; margin: 0; padding: 0; line-height: 1.8; }
        .nav { padding: 20px 40px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(15,23,42,0.8); backdrop-filter: blur(10px); position: sticky; top: 0; z-index: 100; }
        .logo { font-weight: 800; font-size: 1.5rem; color: white; text-decoration: none; display: flex; align-items: center; gap: 10px; }
        .btn-back { background: rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 8px; color: white; text-decoration: none; font-weight: 600; transition: 0.2s; }
        .btn-back:hover { background: var(--accent); }
        .container { max-width: 800px; margin: 40px auto; padding: 0 20px; }
        h1 { font-size: 2.8rem; margin-bottom: 20px; line-height: 1.2; background: linear-gradient(135deg, #00f3ff, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        h2 { font-size: 1.8rem; margin-top: 40px; color: white; }
        p { color: #cbd5e1; font-size: 1.1rem; margin-bottom: 20px; }
        ul { color: #cbd5e1; font-size: 1.1rem; margin-bottom: 30px; padding-left: 20px; }
        li { margin-bottom: 10px; }
        strong { color: #fff; }
        .cta-container { text-align: center; margin: 60px 0; padding: 40px; background: rgba(59,130,246,0.1); border-radius: 20px; border: 1px solid rgba(59,130,246,0.3); }
        .cta-btn { display: inline-block; background: linear-gradient(135deg, #00f3ff, #3b82f6); color: #000; padding: 15px 40px; border-radius: 50px; font-size: 1.2rem; font-weight: 800; text-decoration: none; text-transform: uppercase; letter-spacing: 1px; transition: 0.3s; box-shadow: 0 10px 30px rgba(59,130,246,0.3); }
        .cta-btn:hover { transform: translateY(-3px); box-shadow: 0 15px 40px rgba(59,130,246,0.5); }
        
        [data-fr] { display: none; }
        body.lang-fr [data-fr] { display: inline; }
        body.lang-fr [data-en] { display: none; }
        .lang-switch { display: flex; gap: 10px; }
        .lang-btn { background: none; border: 1px solid var(--muted); color: var(--muted); padding: 4px 10px; border-radius: 6px; cursor: pointer; transition: 0.2s; }
        .lang-btn.active { background: white; color: black; border-color: white; }
    </style>
    <!-- Structured Data Schema.org JSON-LD -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "${tut.titleEn}",
      "operatingSystem": "Web",
      "applicationCategory": "DesignApplication",
      "offers": {
        "@type": "Offer",
        "price": "0.00",
        "priceCurrency": "USD"
      },
      "description": "${tut.descEn}"
    }
    </script>
</head>
<body class="lang-en">
    <nav class="nav">
        <a href="/blog/" class="logo">
            <img src="/logo_studios_pro.png" width="30" height="30" style="border-radius:6px;" alt="Logo">
            Studios-Pro
        </a>
        <div style="display:flex; gap: 20px; align-items:center;">
            <div class="lang-switch">
                <button class="lang-btn active" onclick="setLang('en')">EN</button>
                <button class="lang-btn" onclick="setLang('fr')">FR</button>
            </div>
            <a href="/blog/" class="btn-back"><span data-en>All Tutorials</span><span data-fr>Tous les Tutoriels</span></a>
        </div>
    </nav>

    <div class="container">
        <h1>
            <span data-en>${tut.h1En}</span>
            <span data-fr>${tut.h1Fr}</span>
        </h1>
        
        <p>
            <span data-en>${tut.descEn}</span>
            <span data-fr>${tut.descFr}</span>
        </p>

        <h2>
            <span data-en>${tut.sections[0].h2En}</span>
            <span data-fr>${tut.sections[0].h2Fr}</span>
        </h2>
        <p>
            <span data-en>${tut.sections[0].pEn}</span>
            <span data-fr>${tut.sections[0].pFr}</span>
        </p>

        <h2>
            <span data-en>${tut.sections[1].h2En}</span>
            <span data-fr>${tut.sections[1].h2Fr}</span>
        </h2>
        <p>
            <span data-en>${tut.sections[1].pEn}</span>
            <span data-fr>${tut.sections[1].pFr}</span>
        </p>

        <div class="cta-container">
            <a href="/?ref=${tut.ref}" class="cta-btn">
                <span data-en>Open Application</span>
                <span data-fr>Ouvrir l'application</span>
            </a>
        </div>
    </div>

    <script>
        function setLang(l) {
            document.body.className = 'lang-' + l;
            localStorage.setItem('sp_lang', l);
            document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
            if(event && event.target) {
                event.target.classList.add('active');
            } else {
                document.querySelectorAll('.lang-btn').forEach(b => {
                    if(b.innerText.toLowerCase() === l) b.classList.add('active');
                });
            }
        }
        const saved = localStorage.getItem('sp_lang') || 'en';
        setLang(saved);
    </script>
</body>
</html>`;

const blogIndexTemplate = (cardsHtml) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Studios-Pro | Blog & Tutorials</title>
    <meta name="description" content="Discover tutorials and guides for Studios-Pro: Convert images to CNC vectors, generate AI depth maps, and render 3D/4D models in your browser.">
    <link rel="icon" type="image/png" href="/logo_studios_pro.png">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
    <style>
        :root { --bg: #05070a; --surface: #0f172a; --accent: #3b82f6; --text: #f8fafc; --muted: #94a3b8; }
        body { background: var(--bg); color: var(--text); font-family: 'Outfit', sans-serif; margin: 0; padding: 0; }
        .nav { padding: 20px 40px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(15,23,42,0.8); backdrop-filter: blur(10px); position: sticky; top: 0; z-index: 100; }
        .logo { font-weight: 800; font-size: 1.5rem; color: white; text-decoration: none; display: flex; align-items: center; gap: 10px; }
        .btn-back { background: rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 8px; color: white; text-decoration: none; font-weight: 600; transition: 0.2s; }
        .btn-back:hover { background: var(--accent); }
        .container { max-width: 1000px; margin: 60px auto; padding: 0 20px; }
        h1 { font-size: 3rem; margin-bottom: 20px; background: linear-gradient(135deg, #00f3ff, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .subtitle { color: var(--muted); font-size: 1.2rem; margin-bottom: 40px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; }
        .card { background: var(--surface); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 30px; transition: 0.3s; text-decoration: none; display: block; }
        .card:hover { transform: translateY(-5px); border-color: var(--accent); box-shadow: 0 10px 30px rgba(59,130,246,0.2); }
        .card h2 { color: white; font-size: 1.4rem; margin-top: 0; margin-bottom: 15px; }
        .card p { color: var(--muted); line-height: 1.6; margin-bottom: 20px; }
        .tag { display: inline-block; padding: 4px 12px; background: rgba(59,130,246,0.2); color: var(--accent); border-radius: 20px; font-size: 0.8rem; font-weight: 600; margin-bottom: 10px; }
        [data-fr] { display: none; }
        body.lang-fr [data-fr] { display: inline; }
        body.lang-fr [data-en] { display: none; }
        .lang-switch { display: flex; gap: 10px; }
        .lang-btn { background: none; border: 1px solid var(--muted); color: var(--muted); padding: 4px 10px; border-radius: 6px; cursor: pointer; transition: 0.2s; }
        .lang-btn.active { background: white; color: black; border-color: white; }
    </style>
    <meta property="og:title" content="Studios-Pro | Professional 3D & AI Design Generator">
    <meta property="og:description" content="A complete tutorial and guide on using Studios-Pro's suite of creative tools ranging from CNC Vector paths to AI Depth maps and 4D Music Visualization.">
    <meta property="og:image" content="https://studios-pro.com/og_banner.jpg">
    <meta property="og:url" content="https://studios-pro.com/">
    <meta name="twitter:card" content="summary_large_image">
</head>
<body class="lang-en">
    <nav class="nav">
        <a href="/" class="logo">
            <img src="/logo_studios_pro.png" width="30" height="30" style="border-radius:6px;" alt="Logo">
            Studios-Pro
        </a>
        <div style="display:flex; gap: 20px; align-items:center;">
            <div class="lang-switch">
                <button class="lang-btn active" onclick="setLang('en')">EN</button>
                <button class="lang-btn" onclick="setLang('fr')">FR</button>
            </div>
            <a href="/" class="btn-back"><span data-en>Launch App</span><span data-fr>Lancer l'App</span></a>
        </div>
    </nav>

    <div class="container">
        <h1><span data-en>Tutorials & Guides</span><span data-fr>Tutoriels et Guides</span></h1>
        <p class="subtitle"><span data-en>Learn how to master our creative tools and optimize your models for 3D printing and CNC routers.</span><span data-fr>Apprenez à maîtriser nos outils créatifs et à optimiser vos modèles pour l'impression 3D et les routeurs CNC.</span></p>

        <div class="grid">
            ${cardsHtml}
        </div>
    </div>

    <script>
        function setLang(l) {
            document.body.className = 'lang-' + l;
            localStorage.setItem('sp_lang', l);
            document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
            if(event && event.target) {
                event.target.classList.add('active');
            } else {
                document.querySelectorAll('.lang-btn').forEach(b => {
                    if(b.innerText.toLowerCase() === l) b.classList.add('active');
                });
            }
        }
        const saved = localStorage.getItem('sp_lang') || 'en';
        setLang(saved);
    </script>
</body>
</html>`;

// 1. Create tutorial sub-pages
tutorials.forEach(tut => {
  fs.writeFileSync(path.join(__dirname, 'public/blog', `${tut.id}.html`), template(tut));
  console.log(`Generated ${tut.id}.html`);
});

// 2. Generate clean index.html cards list
const cardsHtml = tutorials.map(tut => `
            <a href="/blog/${tut.id}.html" class="card">
                <span class="tag">${tut.tag}</span>
                <h2><span data-en>${tut.cardH2En}</span><span data-fr>${tut.cardH2Fr}</span></h2>
                <p><span data-en>${tut.cardPEn}</span><span data-fr>${tut.cardPFr}</span></p>
                <span style="color:var(--accent); font-weight:600;"><span data-en>Read Tutorial →</span><span data-fr>Lire le Tutoriel →</span></span>
            </a>`).join('\n');

// Write clean public/blog/index.html (no duplication)
fs.writeFileSync(path.join(__dirname, 'public/blog/index.html'), blogIndexTemplate(cardsHtml));
console.log('Regenerated public/blog/index.html');

// 3. Generate clean sitemap.xml
const date = new Date().toISOString().split('T')[0];
let sitemapUrls = tutorials.map(tut => `  <url>
    <loc>https://studios-pro.com/blog/${tut.id}.html</loc>
    <lastmod>${date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>\n`).join('');

// Include main links in sitemap as well
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
${baseUrls}${sitemapUrls}</urlset>
`;

fs.writeFileSync(path.join(__dirname, 'public/sitemap.xml'), newSitemap);
console.log('Regenerated public/sitemap.xml');
