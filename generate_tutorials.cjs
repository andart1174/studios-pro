const fs = require('fs');
const path = require('path');

const tutorials = [
  {
    id: 'filament-painting-studio',
    titleEn: 'Filament Painting Studio (Free HueForge Alternative) | Studios-Pro',
    titleFr: 'Filament Painting Studio (Alternative HueForge Gratuite) | Studios-Pro',
    descEn: 'Turn any photo into multi-color 3D filament art with Kubelka-Munk TD optics, smartphone Camera TD calibration, and Bambu AMS / OrcaSlicer 3MF export.',
    descFr: 'Transformez vos photos en tableaux de filaments 3D multi-couleurs avec optique Kubelka-Munk TD, calibration Caméra TD et export 3MF Bambu AMS / OrcaSlicer.',
    h1En: 'Multi-Color Filament Painting & Layer-Swap Guide',
    h1Fr: 'Guide Complet du Filament Painting Multi-Couleurs',
    tag: 'Filament Art',
    ogImage: 'https://studios-pro.com/og_filament_painting_studio.jpg',
    cardH2En: 'Filament Painting & HueForge Alternative',
    cardH2Fr: 'Filament Painting & Alternative HueForge',
    cardPEn: 'Simulate optical filament TD, calibrate spools with your phone camera, and export auto-swap 3MF files for Bambu AMS.',
    cardPFr: 'Simulez la distance de transmission TD, calibrez vos bobines par caméra et exportez en 3MF auto-swap pour Bambu AMS.',
    ref: 'filament-painting-studio',
    sections: [
      {
        h2En: 'Kubelka-Munk Optical Blending & Camera TD Calibration',
        h2Fr: 'Mélange Optique Kubelka-Munk & Calibration Caméra TD',
        pEn: 'Upload any JPG, PNG, or WebP photograph and choose from 250+ verified filament spools (Bambu Lab, Polymaker, Sunlu, eSUN, Prusament, Hatchbox) or import .hfp profiles into My Spool Rack. Measure your own spool Transmission Distance (TD) directly with a smartphone camera — no external hardware required.',
        pFr: 'Importez une photo JPG, PNG ou WebP et choisissez parmi plus de 250 bobines calibrées (Bambu Lab, Polymaker, Sunlu, eSUN, Prusament, Hatchbox) ou importez vos profils .hfp dans Mon Rack. Mesurez la distance de transmission (TD) avec votre smartphone sans matériel externe.'
      },
      {
        h2En: 'Native Bambu Studio / OrcaSlicer Auto-Swap 3MF & CMYW Lithophanes',
        h2Fr: 'Export 3MF Auto-Swap Bambu / OrcaSlicer & Lithophanies CMYW',
        pEn: 'Inspect color accuracy with the ΔE2000 heatmap, switch between flat wall art, interlocking murals, or CMYW 4-spool color lithophanes, and export a DEFLATE-compressed 3MF containing exact AMS or M600 layer-swap heights plus 4K Etsy gallery mockups.',
        pFr: 'Vérifiez la fidélité couleur via la carte ΔE2000, créez des fresques emboîtables ou des lithophanies couleur CMYW à 4 bobines, et exportez un fichier 3MF compressé avec changements AMS ou M600 intégrés ainsi que des mockups 4K.'
      }
    ]
  },
  {
    id: 'multicolor-3mf-painter',
    titleEn: 'Multi-Color 3MF Painter for Bambu AMS & OrcaSlicer | Studios-Pro',
    titleFr: 'Colorateur 3MF Multi-Couleurs pour Bambu AMS & OrcaSlicer | Studios-Pro',
    descEn: 'Paint STL and 3MF 3D printing models directly in your browser with 1-click AI Auto-Color, smart angle fill, purge estimator, and multi-part 3MF export.',
    descFr: 'Coloriez vos modèles STL et 3MF directement dans le navigateur avec IA Auto-Color, remplissage intelligent, calcul de purge et export 3MF multi-pièces.',
    h1En: 'Paint Multi-Color 3MF Models in Your Browser',
    h1Fr: 'Colorier des Modèles 3MF Multi-Couleurs en Ligne',
    tag: '3MF Painter',
    ogImage: 'https://studios-pro.com/og_multicolor_3mf_painter.jpg',
    cardH2En: 'Colorize STL & 3MF for Bambu AMS',
    cardH2Fr: 'Coloriez vos STL & 3MF pour Bambu AMS',
    cardPEn: 'Use AI Auto-Color, smart angle fill, and cavity ink brushes to export native multi-part 3MF print projects.',
    cardPFr: 'Utilisez l\'IA Auto-Color, le remplissage par angle et le pinceau de cavité pour exporter en 3MF multi-pièces.',
    ref: 'painter',
    sections: [
      {
        h2En: 'AI Auto-Paint, Smart Angle Fill & Precision Brushes',
        h2Fr: 'Peinture IA Automatique, Remplissage d\'Angle & Pinceaux',
        pEn: 'Drop any monochrome STL or 3MF model onto the canvas on desktop, iPad, or mobile. Apply 1-click AI Auto-Color to separate bases, reliefs, and cavities automatically, or refine regions with smart angle fill, height-band sliders, and 16 filament swatches.',
        pFr: 'Glissez n\'importe quel fichier STL ou 3MF monochrome sur PC, iPad ou mobile. Lancez l\'IA Auto-Color en 1 clic pour séparer bases, reliefs et creux, ou affinez chaque zone grâce au remplissage par angle et aux 16 nuances de filaments.'
      },
      {
        h2En: 'Purge Waste Optimizer & Native Multi-Part 3MF Export',
        h2Fr: 'Optimiseur de Purge & Export 3MF Multi-Pièces Natif',
        pEn: 'Preview estimated filament swap counts and purge waste in real time before slicing. Export a clean multi-part 3MF package that opens directly in Bambu Studio, OrcaSlicer, and PrusaSlicer with every filament slot preserved.',
        pFr: 'Estimez en temps réel le nombre de changements de filament et la perte de purge avant le tranchage. Exportez un fichier 3MF multi-pièces prêt pour Bambu Studio, OrcaSlicer et PrusaSlicer.'
      }
    ]
  },
  {
    id: 'qr-wifi-coaster-generator',
    titleEn: '3D QR Wi-Fi Coaster & Sign Generator Guide | Studios-Pro',
    titleFr: 'Guide Générateur de Sous-Verres QR Code & Wi-Fi 3D | Studios-Pro',
    descEn: 'Design scannable 3D printable Wi-Fi, restaurant menu, Airbnb, and payment QR coasters, desk stands, magnets, and caddies in 3MF, STL, and DXF.',
    descFr: 'Créez des sous-verres, chevalets, magnets et supports QR Wi-Fi, menu ou Airbnb scannables en impression 3D. Exportez en 3MF, STL et DXF/SVG.',
    h1En: 'Create Scannable 3D QR Wi-Fi Coasters & Table Stands',
    h1Fr: 'Créer des Sous-Verres & Chevalets QR Wi-Fi 3D Scannables',
    tag: '3D QR Coaster',
    cardH2En: 'Generate 3D QR Wi-Fi Coasters & Signs',
    cardH2Fr: 'Générez des Sous-Verres QR Wi-Fi 3D',
    cardPEn: 'Build verified scannable QR coasters, desk tents, and matching caddies in multi-color 3MF, STL, and laser DXF.',
    cardPFr: 'Créez des sous-verres QR vérifiés, chevalets et supports assortis en 3MF multi-couleurs, STL et DXF laser.',
    ref: 'coaster',
    sections: [
      {
        h2En: 'Verified Scannable QR Payloads & Custom Shapes',
        h2Fr: 'QR Codes Vérifiés & Formes Personnalisables',
        pEn: 'Enter Wi-Fi credentials (SSID + WPA2/WPA3 password), website URLs, digital menus, vCards, or SEPA payment links. Choose round, square, hexagonal, or table-tent profiles with high-contrast raised or recessed QR modules engineered for reliable smartphone scanning.',
        pFr: 'Saisissez vos identifiants Wi-Fi (SSID + mot de passe WPA2/WPA3), liens web, menus digitaux, vCards ou paiements SEPA. Choisissez des formes rondes, carrées, hexagonales ou chevalets avec modules QR calibrés pour un scan instantané.'
      },
      {
        h2En: 'Multi-Color 3MF, Dual-STL, Caddy Racks & Laser DXF',
        h2Fr: '3MF Multi-Couleurs, Double STL, Range-Verres & DXF Laser',
        pEn: 'Export ready-to-print multi-color 3MF files for Bambu AMS, separate dual-STL bodies for pause-at-height swaps, shape-matched coaster caddy racks, or vector DXF/SVG files for wood and acrylic laser engraving.',
        pFr: 'Exportez des fichiers 3MF multi-couleurs pour Bambu AMS, des STL séparés pour pause de changement de filament, des range-sous-verres assortis ou des vecteurs DXF/SVG pour découpe laser.'
      }
    ]
  },
  {
    id: 'ar-viewer',
    titleEn: 'AR Viewer 3D — Instant Browser WebAR Guide | Studios-Pro',
    titleFr: 'AR Viewer 3D — Guide WebAR Instantané dans le Navigateur | Studios-Pro',
    descEn: 'Upload STL, OBJ, or GLB 3D models and project them at real-world scale in Augmented Reality on iPhone and Android via QR code without installing an app.',
    descFr: 'Importez des modèles 3D STL, OBJ ou GLB et projetez-les à taille réelle en Réalité Augmentée sur iPhone et Android par QR code sans installer d\'application.',
    h1En: 'Instant WebAR 3D Model Projection on iOS & Android',
    h1Fr: 'Projection de Modèles 3D en WebAR sur iOS et Android',
    tag: 'AR Viewer',
    cardH2En: 'Project 3D Models in Augmented Reality',
    cardH2Fr: 'Projetez vos Modèles 3D en Réalité Augmentée',
    cardPEn: 'Convert STL/OBJ/GLB client-side and scan a QR code to place your 3D creations on any real table or wall.',
    cardPFr: 'Convertissez vos STL/OBJ/GLB localement et scannez un QR code pour placer vos créations sur une table ou un mur.',
    ref: 'arviewer',
    sections: [
      {
        h2En: 'Zero-App Mobile Projection via QR Code',
        h2Fr: 'Projection Mobile Sans Application par QR Code',
        pEn: 'Open Studios-Pro AR Viewer, load any STL, OBJ, or GLB file (or send a scene directly from any Studios-Pro studio), adjust color and placement (floor or wall), and scan the generated QR code. Android launches Google SceneViewer and iOS opens Apple QuickLook automatically.',
        pFr: 'Ouvrez Studios-Pro AR Viewer, chargez un fichier STL, OBJ ou GLB (ou transférez depuis n\'importe quel studio), choisissez la couleur et le placement (sol ou mur), puis scannez le QR code. Android ouvre Google SceneViewer et iOS lance Apple QuickLook automatiquement.'
      },
      {
        h2En: 'Client-Side Conversion & Real-World Scale',
        h2Fr: 'Conversion Locale & Échelle Réelle',
        pEn: 'Raw STL and OBJ printing meshes are converted to optimized binary GLB directly in your browser using a dedicated Web Worker, preserving millimeter dimensions so clients and makers can verify real physical scale before printing.',
        pFr: 'Les fichiers STL et OBJ sont convertis en GLB binaire optimisé directement dans votre navigateur via Web Worker, en conservant les dimensions en millimètres pour valider l\'échelle réelle avant l\'impression 3D.'
      }
    ]
  },
  {
    id: 'polymorph-3d',
    titleEn: 'PolyMorph 3D Studio — Converter, Horology & Procedural CAD | Studios-Pro',
    titleFr: 'PolyMorph 3D Studio — Convertisseur, Horlogerie & CAO Procédurale | Studios-Pro',
    descEn: 'Convert STL, GLB, OBJ, PLY, and 3MF models and generate 3D watch movements, Cryptex puzzle boxes, Sugihara illusions, papercraft nets, and Voronoi lamps.',
    descFr: 'Convertissez vos modèles STL, GLB, OBJ, PLY et 3MF et générez des mouvements horlogers 3D, boîtes Cryptex, illusions de Sugihara, papercraft et vases Voronoi.',
    h1En: 'Universal 3D Converter & Procedural Generators in PolyMorph 3D',
    h1Fr: 'Convertisseur 3D Universel & Générateurs Procéduraux PolyMorph 3D',
    tag: 'PolyMorph 3D',
    cardH2En: 'Watch Movements, Cryptex, Flexi & 3D Converter',
    cardH2Fr: 'Horlogerie, Cryptex, Flexi & Convertisseur 3D',
    cardPEn: 'Convert 3D formats and build tourbillons, puzzle boxes, RPG dungeon tiles, papercraft nets, and Voronoi vases.',
    cardPFr: 'Convertissez vos formats 3D et générez tourbillons, boîtes secrètes, tuiles RPG, papercraft et vases Voronoi.',
    ref: 'polymorph',
    sections: [
      {
        h2En: 'Multi-Engine Procedural Generators for 3D Printing',
        h2Fr: 'Générateurs Procéduraux Multi-Moteurs pour Impression 3D',
        pEn: 'Switch effortlessly between specialized CAD engines: mechanical watch movements with tourbillons, customizable 5-letter Da Vinci Cryptex puzzle cylinders, Kokichi Sugihara optical illusions, print-in-place flexi models, modular 28mm RPG dungeon tiles, topographic maps, and Voronoi lampshades.',
        pFr: 'Basculez entre nos moteurs spécialisés : mouvements de montre à tourbillon, cylindres Cryptex Da Vinci personnalisables, illusions d\'optique de Sugihara, modèles articulés flexi sans assemblage, tuiles de donjon RPG 28 mm, cartes topographiques et abat-jour Voronoi.'
      },
      {
        h2En: 'Universal Format Conversion & Pepakura Papercraft Unfolding',
        h2Fr: 'Conversion Universelle & Dépliage Papercraft',
        pEn: 'Convert between STL, OBJ, GLB, PLY, and DXF locally in your browser, unfold low-poly 3D meshes into numbered 2D papercraft PDF/SVG nets with glue tabs, or send any generated creation straight to WebAR.',
        pFr: 'Convertissez entre STL, OBJ, GLB, PLY et DXF localement dans le navigateur, dépliez vos maillages 3D en patrons papercraft 2D PDF/SVG numérotés ou projetez instantanément en WebAR.'
      }
    ]
  },
  {
    id: 'new-3d-4d',
    titleEn: 'New 3D 4D Studio — Photo to 3D Bas-Relief & Animated 4D GLB | Studios-Pro',
    titleFr: 'New 3D 4D Studio — Photo en Bas-Relief 3D & GLB 4D Animé | Studios-Pro',
    descEn: 'Convert any 2D photograph into an ultra-smooth 3D portrait bas-relief, lithophane, embossed coin STL, or 60 FPS animated 4D GLB and video clip.',
    descFr: 'Transformez n\'importe quelle photo 2D en bas-relief 3D ultra-lisse, lithophanie, médaille STL ou modèle GLB 4D animé à 60 FPS et vidéo.',
    h1En: 'Convert 2D Photos into 3D Bas-Relief STL & 4D Animated GLB',
    h1Fr: 'Transformer une Photo 2D en Bas-Relief 3D STL & GLB 4D Animé',
    tag: 'New 3D 4D',
    cardH2En: 'Photo to 3D Bas-Relief, Coins & 4D GLB',
    cardH2Fr: 'Photo en Bas-Relief 3D, Médailles & GLB 4D',
    cardPEn: 'Sculpt smooth anti-spike portrait reliefs, lithophanes, and full-color 60 FPS 4D animations locally on your GPU.',
    cardPFr: 'Sculptez des portraits bas-relief sans pics, des lithophanies et des animations 4D couleur 60 FPS sur votre GPU.',
    ref: 'n3d',
    sections: [
      {
        h2En: 'Multi-Scale Anti-Spike Bas-Relief Sculpting',
        h2Fr: 'Sculpture Bas-Relief Multi-Échelle Sans Pics',
        pEn: 'Drop any JPG, PNG, or WebP photograph into New 3D 4D Studio. Our multi-scale Gaussian macro + clamped micro-detail engine eliminates noisy spikes to produce gallery-grade portrait reliefs, coins, medals, and glowing lithophanes with baked RGB vertex colors.',
        pFr: 'Importez une photo JPG, PNG ou WebP dans New 3D 4D Studio. Notre moteur multi-échelle (macro gaussien + micro-détails calibrés) supprime les pics parasites pour créer des portraits bas-relief, pièces gravées et lithophanies avec couleurs RVB intégrées.'
      },
      {
        h2En: 'Watertight STL/OBJ Printing & 60 FPS 4D GLB / Video Export',
        h2Fr: 'Export STL/OBJ Étanche & GLB 4D / Vidéo 60 FPS',
        pEn: 'Export watertight binary STL and OBJ models ready for 3D printers and CNC wood routers, or animate your sculpture with 5 real-time 4D motion modes and export animated GLB holograms, WebAR previews, and 60 FPS MP4/WebM videos.',
        pFr: 'Exportez des fichiers STL et OBJ étanches pour impression 3D et fraisage CNC, ou animez votre sculpture avec 5 modes 4D temps réel pour exporter des hologrammes GLB, aperçus WebAR et vidéos 60 FPS MP4/WebM.'
      }
    ]
  },
  {
    id: 'figure-builder',
    titleEn: '4D Figure Builder PRO — Real 4D Polytopes & Photo-to-4D | Studios-Pro',
    titleFr: '4D Figure Builder PRO — Polytopes 4D Réels & Photo-vers-4D | Studios-Pro',
    descEn: 'Explore real mathematical 4D polytopes (Tesseract, 24-Cell, 120-Cell), turn photos into 4D sculptures, slice W-hyperplanes, and export GLB, STL, AR, and video.',
    descFr: 'Explorez de vrais polytopes 4D (Tesseract, 24-Cell, 120-Cell), convertissez une photo en sculpture 4D, tranchez l\'axe W et exportez en GLB, STL, AR et vidéo.',
    h1En: 'Real 4D Polytopes & Photo-to-4D Sculpting in 4D Figure Builder PRO',
    h1Fr: 'Polytopes 4D Réels & Sculpture Photo-vers-4D dans 4D Figure Builder PRO',
    tag: '4D Builder',
    cardH2En: 'Real 4D Polytopes & Photo-to-4D Studio',
    cardH2Fr: 'Polytopes 4D Réels & Studio Photo-vers-4D',
    cardPEn: 'Rotate true 4D geometry across XW/YW/ZW planes, convert photos to 4D, and export printable STL, GLB, AR & HD video.',
    cardPFr: 'Faites pivoter la géométrie 4D sur les plans XW/YW/ZW, convertissez une photo en 4D et exportez en STL, GLB, AR et vidéo.',
    ref: 'figb',
    sections: [
      {
        h2En: 'True 4D Rotations, W-Hyperplane Slicing & Photo-to-4D',
        h2Fr: 'Vraies Rotations 4D, Coupes d\'Hyperplan W & Photo-vers-4D',
        pEn: 'Manipulate genuine 4-dimensional figures (Tesseract, 16-Cell, 24-Cell, 120-Cell, Clifford Torus, and 4D organic forms) across all 6 rotation planes (XY, XZ, YZ, XW, YW, ZW). Upload any photo to map luminance and contours into a live 4D hyper-sculpture with interactive W-slicing.',
        pFr: 'Manipulez de vraies figures à 4 dimensions (Tesseract, 16-Cell, 24-Cell, 120-Cell, tore de Clifford et formes organiques) sur les 6 plans de rotation (XY, XZ, YZ, XW, YW, ZW). Chargez une photo pour la transformer en hyper-sculpture 4D interactive.'
      },
      {
        h2En: '3D Printable STL/OBJ, GLB, WebAR & Cinematic Video Export',
        h2Fr: 'Export STL/OBJ Imprimable 3D, GLB, WebAR & Vidéo Cinéma',
        pEn: 'Freeze any 4D projection or W-slice into a solid watertight 3D mesh for STL/OBJ 3D printing, project it directly in AR Viewer, capture ultra-crisp PNG renders, or record smooth WebM/MP4 video loops.',
        pFr: 'Figez n\'importe quelle projection 4D ou coupe W en maillage 3D solide pour impression STL/OBJ, projetez directement dans AR Viewer, capturez des rendus PNG haute définition ou enregistrez des vidéos fluides.'
      }
    ]
  },
  {
    id: 'scripting-studio',
    titleEn: 'Scripting Studio PRO — Parametric 3D CAD JavaScript IDE | Studios-Pro',
    titleFr: 'Scripting Studio PRO — IDE JavaScript CAO 3D Paramétrique | Studios-Pro',
    descEn: 'Code parametric 3D CAD assemblies in JavaScript with real Three.js CSG, planetary gearboxes, live parameter sliders, and STL, OBJ, GLB & WebAR export.',
    descFr: 'Codez des assemblages CAO 3D paramétriques en JavaScript avec CSG Three.js, trains planétaires, curseurs temps réel et export STL, OBJ, GLB & WebAR.',
    h1En: 'Parametric 3D CAD Coding with Scripting Studio PRO',
    h1Fr: 'Conception CAO 3D Paramétrique par Code avec Scripting Studio PRO',
    tag: 'Scripting Studio',
    cardH2En: 'Parametric 3D CAD & Live JS Scripting',
    cardH2Fr: 'CAO 3D Paramétrique & Scripting JS Live',
    cardPEn: 'Write JavaScript CAD scripts with CSG booleans, live parameter sliders, planetary gear templates, and STL/GLB/AR export.',
    cardPFr: 'Écrivez des scripts CAO JavaScript avec booléens CSG, curseurs temps réel, modèles mécaniques et export STL/GLB/AR.',
    ref: 'scripting',
    sections: [
      {
        h2En: 'Real Parametric Engineering API & Live Sliders',
        h2Fr: 'API d\'Ingénierie Paramétrique & Curseurs en Direct',
        pEn: 'Build precision mechanical assemblies — from planetary gearboxes and enclosures to architectural lattices — using clean JavaScript and built-in solid primitives, extrusions, lofts, threads, and CSG operations. Declare custom sliders directly in code to tweak dimensions in real time.',
        pFr: 'Concevez des assemblages mécaniques précis — trains planétaires, boîtiers, treillis architecturaux — en JavaScript grâce aux primitives solides, extrusions, filetages et opérations booléennes CSG, pilotés par des curseurs temps réel.'
      },
      {
        h2En: 'Direct 3D Printing STL/OBJ, Binary GLB & AR Export',
        h2Fr: 'Export STL/OBJ Impression 3D, GLB Binaire & AR',
        pEn: 'Inspect real-world millimeter bounding dimensions, export watertight STL and OBJ files for your slicer, download PBR GLB scenes, or launch your scripted prototype straight into AR Viewer to inspect it on your desk.',
        pFr: 'Vérifiez les dimensions réelles en millimètres, exportez des fichiers STL et OBJ étanches pour votre trancheur, téléchargez des scènes GLB PBR ou projetez votre prototype en AR Viewer.'
      }
    ]
  },
  {
    id: 'studio-pro',
    titleEn: 'Studio Pro 4D — 2D-to-3D Scene Composer & Media Studio | Studios-Pro',
    titleFr: 'Studio Pro 4D — Compositeur de Scène 2D vers 3D & Média | Studios-Pro',
    descEn: 'Compose 3D scenes from 2D sketches, SVG/DXF blueprints, 3D text, QR codes, images, audio, and video. Export OBJ, GLB, standalone HTML, ZIP, PNG, and WebAR.',
    descFr: 'Composez des scènes 3D à partir de dessins 2D, plans SVG/DXF, texte 3D, QR codes, images, audio et vidéo. Exportez en OBJ, GLB, HTML autonome, PNG et WebAR.',
    h1En: '2D-to-3D Scene Composer & Interactive Media in Studio Pro 4D',
    h1Fr: 'Compositeur de Scène 2D vers 3D & Média dans Studio Pro 4D',
    tag: 'Studio Pro 4D',
    cardH2En: '2D-to-3D Scene Composer, Text, SVG & Video',
    cardH2Fr: 'Compositeur 2D vers 3D, Texte, SVG & Vidéo',
    cardPEn: 'Extrude sketches, 3D typography, SVG/DXF logos, and audio/video effects into OBJ, HTML, video, and AR scenes.',
    cardPFr: 'Extrudez croquis, texte 3D, logos SVG/DXF et effets audio/vidéo en scènes OBJ, HTML, vidéo et AR.',
    ref: 'spro',
    sections: [
      {
        h2En: 'Multi-Modal 2D-to-3D Scene Composition',
        h2Fr: 'Composition de Scène 2D vers 3D Multi-Modale',
        pEn: 'Combine freehand 2D drawings, extruded 3D text, scannable 3D QR blocks, imported SVG/DXF vector logos, and existing GLB/OBJ/STL meshes inside one unified Three.js workspace — plus Image-to-3D, Video-to-3D, and Audio-3D reactive modules.',
        pFr: 'Combinez croquis 2D, texte 3D extrudé, blocs QR 3D, logos SVG/DXF et maillages GLB/OBJ/STL dans un espace Three.js unifié, enrichi par les modules Image-vers-3D, Vidéo-vers-3D et Audio 3D.'
      },
      {
        h2En: 'Standalone Interactive HTML, OBJ, Video & AR Export',
        h2Fr: 'Export HTML Interactif Autonome, OBJ, Vidéo & AR',
        pEn: 'Package any scene into a self-contained offline HTML file to embed on any website, download OBJ geometry for 3D software, record smooth video loops, capture PNGs, or send directly to AR Viewer.',
        pFr: 'Empaquetez toute scène en fichier HTML autonome hors ligne intégrable sur n\'importe quel site, téléchargez la géométrie OBJ, enregistrez une vidéo ou envoyez directement vers AR Viewer.'
      }
    ]
  },
  {
    id: 'studio-pro-2',
    titleEn: 'Studio Pro 2 — Advanced 3D Lighting & Scene Studio | Studios-Pro',
    titleFr: 'Studio Pro 2 — Éclairage 3D Avancé & Scènes | Studios-Pro',
    descEn: 'Build multi-object 3D compositions with studio PBR lighting, custom materials, camera controls, and rapid STL, OBJ, GLB, and HTML exports.',
    descFr: 'Construisez des compositions 3D multi-objets avec éclairage PBR studio, matériaux personnalisés et exportations rapides STL, OBJ, GLB et HTML.',
    h1En: 'Studio PBR Lighting & 3D Scene Staging in Studio Pro 2',
    h1Fr: 'Éclairage PBR Studio & Mise en Scène 3D dans Studio Pro 2',
    tag: 'Studio Pro 2',
    cardH2En: 'Stage & Render High-Fidelity 3D Scenes',
    cardH2Fr: 'Mettez en Scène vos Modèles 3D en Haute Fidélité',
    cardPEn: 'Configure studio lighting, PBR metals and glass materials, shadows, and export production renders or 3D meshes.',
    cardPFr: 'Configurez l\'éclairage studio, les matériaux PBR métal/verre, les ombres et exportez vos rendus ou maillages 3D.',
    ref: 'spro2',
    sections: [
      {
        h2En: 'Studio Lighting, PBR Shaders & Environment Controls',
        h2Fr: 'Éclairage Studio, Shaders PBR & Contrôle d\'Environnement',
        pEn: 'Arrange multiple 3D assets, tune directional shadows, reflections, roughness, and metallic finishes in real time inside your web browser to prepare crisp product visuals and presentation views.',
        pFr: 'Disposez plusieurs objets 3D, ajustez les ombres, reflets, rugosité et finitions métalliques en temps réel dans votre navigateur pour produire des visuels produits nets.'
      },
      {
        h2En: 'Multi-Format Export for Web, Print & Presentations',
        h2Fr: 'Export Multi-Format pour Web, Impression & Présentations',
        pEn: 'Download clean 3D mesh files, capture transparent or studio-lit screenshots, and export interactive scenes ready to share with clients.',
        pFr: 'Téléchargez vos maillages 3D propres, capturez des rendus studio haute résolution et exportez des scènes interactives prêtes à partager.'
      }
    ]
  },
  {
    id: 'artgen',
    titleEn: 'ArtGen Studio — Vector Brand Logos & 3D Reliefs | Studios-Pro',
    titleFr: 'ArtGen Studio — Logos Vectoriels & Reliefs 3D | Studios-Pro',
    descEn: 'Generate procedural vector brand logos, 45+ artistic styles, DXF layer recoloring, and watertight 3D relief STL/OBJ/GLB exports right in your browser.',
    descFr: 'Générez des logos vectoriels procéduraux, plus de 45 styles artistiques, la recoloration DXF et des reliefs 3D étanches STL/OBJ/GLB dans le navigateur.',
    h1En: 'Procedural Brand Logos, Vector Art & 3D Reliefs in ArtGen Studio',
    h1Fr: 'Logos Vectoriels, Art Procédural & Reliefs 3D dans ArtGen Studio',
    tag: 'ArtGen Studio',
    cardH2En: 'Create Vector Logos & 3D Printable Reliefs',
    cardH2Fr: 'Créez des Logos Vectoriels & Reliefs Imprimables 3D',
    cardPEn: 'Combine 45+ procedural art styles, emblem generators, and DXF recoloring with instant STL/OBJ/GLB relief export.',
    cardPFr: 'Combinez 45+ styles procéduraux, générateurs d\'emblèmes et export relief 3D STL/OBJ/GLB instantané.',
    ref: 'artgen',
    sections: [
      {
        h2En: 'Themed Vector Emblems & 45+ Procedural Styles',
        h2Fr: 'Emblèmes Vectoriels & Plus de 45 Styles Procéduraux',
        pEn: 'Design custom emblems, badges, geometric illustrations, and layered vector graphics with 35+ built-in drawing tools and instant palette harmonization. Recolor AutoCAD DXF layers cleanly for laser or print output.',
        pFr: 'Concevez des emblèmes, badges, illustrations géométriques et visuels vectoriels avec plus de 35 outils de dessin intégrés et l\'harmonisation automatique des palettes, ainsi que la recoloration de calques DXF.'
      },
      {
        h2En: '1-Click 2D Artwork to Watertight 3D STL / OBJ / GLB',
        h2Fr: 'Conversion 2D vers 3D Étanche STL / OBJ / GLB en 1 Clic',
        pEn: 'Turn any generated logo or canvas illustration into an extruded 3D plaque, keychain, cookie cutter, or relief sculpture with vertex colors ready for 3D printing and WebAR.',
        pFr: 'Transformez n\'importe quel logo ou dessin en plaque 3D extrudée, porte-clés, emporte-pièce ou bas-relief coloré prêt pour l\'impression 3D et le WebAR.'
      }
    ]
  },
  {
    id: 'architect-pro-1',
    titleEn: 'Architect Pro 1 — 2D/3D Floor Plan Drafting | Studios-Pro',
    titleFr: 'Architect Pro 1 — Dessin de Plans 2D/3D | Studios-Pro',
    descEn: 'Draft accurate 2D architectural floor plans with walls, doors, windows, and instant 3D extrusion directly in your web browser.',
    descFr: 'Tracez des plans architecturaux 2D précis avec murs, portes, fenêtres et extrusion 3D instantanée directement dans votre navigateur.',
    h1En: 'Professional Architectural Drafting with Architect Pro 1',
    h1Fr: 'Dessin Architectural Professionnel avec Architect Pro 1',
    tag: 'Architect Pro',
    cardH2En: 'Draft Precision 2D/3D Floor Plans',
    cardH2Fr: 'Dessinez des Plans 2D/3D avec Précision',
    cardPEn: 'Master architectural layout design, structural measurements, and instant 3D room previews.',
    cardPFr: 'Maîtrisez la conception de plans, les cotes structurelles et les aperçus 3D instantanés.',
    ref: 'arp1',
    sections: [
      {
        h2En: 'Drafting Precision 2D Floor Plans',
        h2Fr: 'Dessin de Plans 2D Précis',
        pEn: 'Plot walls, partitions, doors, windows, and furniture on an architectural grid with live millimeter/meter measurements, ensuring accurate proportions for renovations, interiors, and scale models.',
        pFr: 'Tracez murs, cloisons, portes, fenêtres et mobilier sur une grille architecturale avec mesures réelles en direct pour vos rénovations, aménagements intérieurs et maquettes.'
      },
      {
        h2En: 'Instant 3D Extrusion & CAD Export',
        h2Fr: 'Extrusion 3D Instantanée & Export CAO',
        pEn: 'Switch from 2D blueprint mode to interactive 3D visualization in a single click, inspect room flow, and export your structural plans for presentations or 3D printing.',
        pFr: 'Passez du plan 2D à la visualisation 3D interactive en un clic, inspectez la circulation des pièces et exportez vos plans pour présentation ou impression 3D.'
      }
    ]
  },
  {
    id: 'architect-pro-2',
    titleEn: 'Architect Pro 2 — Interactive 3D House Builder | Studios-Pro',
    titleFr: 'Architect Pro 2 — Constructeur de Maisons 3D Interactif | Studios-Pro',
    descEn: 'Build multi-story 3D houses with procedural roofs, materials, natural lighting, and interactive first-person walkthroughs in your browser.',
    descFr: 'Construisez des maisons 3D à étages avec toits procéduraux, matériaux, éclairage naturel et visites immersives dans votre navigateur.',
    h1En: 'Advanced 3D House Building with Architect Pro 2',
    h1Fr: 'Construction de Maisons 3D Avancée avec Architect Pro 2',
    tag: 'Architect Pro 2',
    cardH2En: 'Build Interactive 3D Houses',
    cardH2Fr: 'Construisez des Maisons Interactives 3D',
    cardPEn: 'Create multi-story architectures with procedural roofs, realistic lighting, and walkthrough cameras.',
    cardPFr: 'Créez des architectures à plusieurs étages avec toits procéduraux, éclairage naturel et visites 3D.',
    ref: 'arp2',
    sections: [
      {
        h2En: 'Procedural Multi-Story Houses & Roofs',
        h2Fr: 'Maisons Multi-Étages & Toits Procéduraux',
        pEn: 'Go beyond flat floorplans with multi-story stacking, automatic gable/hip roof generation, architectural facades, and customizable surroundings that give realistic context to your building designs.',
        pFr: 'Allez au-delà des plans simples avec l\'empilement d\'étages, la génération automatique de toitures, les façades détaillées et les aménagements extérieurs.'
      },
      {
        h2En: 'Interactive Walkthroughs & 3D Export',
        h2Fr: 'Visites Interactives & Export 3D',
        pEn: 'Explore rooms in first-person camera mode, check daylight angles across interiors, and export your completed architectural model securely to GLB or STL.',
        pFr: 'Explorez chaque pièce en vue subjective, vérifiez l\'ensoleillement naturel et exportez votre maquette architecturale complète en GLB ou STL.'
      }
    ]
  },
  {
    id: 'music-composer',
    titleEn: '4D Music Composer — Audio-Reactive 3D Synth & Loops | Studios-Pro',
    titleFr: '4D Music Composer — Synthétiseur 3D Audio-Réactif & Boucles | Studios-Pro',
    descEn: 'Compose melodies with polyphonic synths and drum loops synced to real-time 3D visuals, and export WAV audio plus HD music videos.',
    descFr: 'Composez des mélodies avec synthétiseurs polyphoniques et boucles rythmiques synchronisés à des visuels 3D, puis exportez en WAV et vidéo HD.',
    h1En: 'Interactive Audio-Visual Composition in 4D Music Composer',
    h1Fr: 'Composition Audio-Visuelle Interactive dans 4D Music Composer',
    tag: '4D Music',
    cardH2En: 'Compose Audio-Reactive 3D Worlds',
    cardH2Fr: 'Composez des Mondes 3D Audio-Réactifs',
    cardPEn: 'Play polyphonic synths, layer BPM-locked loops, sync 3D visuals, and export WAV audio and music videos.',
    cardPFr: 'Jouez sur synthétiseur polyphonique, superposez des boucles synchronisées et exportez en WAV et vidéo.',
    ref: 'musc',
    sections: [
      {
        h2En: 'Polyphonic Synthesizer, Drum Sequencer & Loop Layers',
        h2Fr: 'Synthétiseur Polyphonique, Séquenceur & Couches de Boucles',
        pEn: 'Perform live using your computer keyboard or on-screen piano, trigger quantized drum grooves, and layer multi-track loops in tight BPM synchronization with zero external DAW installation.',
        pFr: 'Jouez en direct au clavier ou sur le piano intégré, programmez des rythmes quantifiés et superposez des pistes en boucle parfaitement synchronisées au BPM sans installer de DAW.'
      },
      {
        h2En: 'Real-Time 3D Spectrum Visuals, WAV & Video Export',
        h2Fr: 'Visuels 3D Temps Réel, Export WAV & Vidéo',
        pEn: 'Every bass hit and chord drives real-time 3D geometry, particles, and lighting shaders. Export clean studio WAV audio tracks or record synchronized audio-visual clips ready for social media.',
        pFr: 'Chaque basse et chaque accord anime en direct la géométrie 3D, les particules et les shaders lumineux. Exportez vos pistes audio WAV ou enregistrez des clips vidéo synchronisés.'
      }
    ]
  },
  {
    id: 'design-pro-studio',
    titleEn: 'Design Pro Studio — Vector Graphics, CAD Layouts & Mockups | Studios-Pro',
    titleFr: 'Design Pro Studio — Graphisme Vectoriel, Plans & Maquettes | Studios-Pro',
    descEn: 'Create clean vector graphics, technical layouts, diagrams, and precision SVG/PNG/DXF assets directly in your web browser.',
    descFr: 'Créez des graphismes vectoriels nets, schémas techniques, maquettes et exports SVG/PNG/DXF de précision directement dans le navigateur.',
    h1En: 'Precision Vector Design & Technical Layouts in Design Pro Studio',
    h1Fr: 'Design Vectoriel de Précision & Schémas dans Design Pro Studio',
    tag: 'Design Pro',
    cardH2En: 'Create Precision Vector Graphics & Layouts',
    cardH2Fr: 'Créez des Graphismes Vectoriels & Maquettes',
    cardPEn: 'Design crisp vector illustrations, technical layouts, and export scale-accurate SVG, PNG, and CAD assets.',
    cardPFr: 'Concevez des illustrations vectorielles et schémas précis et exportez en SVG, PNG et formats CAO.',
    ref: 'desp',
    sections: [
      {
        h2En: 'Snapped Vector Canvas & Layer Controls',
        h2Fr: 'Toile Vectorielle Magnétique & Gestion des Calques',
        pEn: 'Design Pro Studio gives you a responsive vector workspace with precision snapping, alignment guides, boolean shapes, typography, and structured layers for signage, UI mockups, and technical diagrams.',
        pFr: 'Design Pro Studio offre un espace vectoriel réactif avec magnétisme, guides d\'alignement, formes géométriques, typographie et gestion des calques pour signalétique, maquettes UI et schémas.'
      },
      {
        h2En: 'Export Universal SVG, Transparent PNG & Laser Assets',
        h2Fr: 'Export Universel SVG, PNG Transparent & Laser',
        pEn: 'Export crisp transparent PNGs for web publishing or clean vector SVG paths ready for laser engraving, vinyl plotters, and CAD workflows.',
        pFr: 'Exportez des PNG transparents haute définition pour le web ou des tracés vectoriels SVG propres prêts pour la gravure laser, les traceurs vinyle et la CAO.'
      }
    ]
  },
  {
    id: 'zen-sandscape',
    titleEn: 'Zen Sandscape — Falling Sand Physics, Photo Art & AR Wall Export | Studios-Pro',
    titleFr: 'Zen Sandscape — Physique du Sable, Art Photo & Export Mur AR | Studios-Pro',
    descEn: 'Paint with interactive falling-sand physics elements, turn photos into living sand art, and export standalone offline HTML or 3D AR wall reliefs.',
    descFr: 'Peignez avec des particules physiques (sable, eau, lave, portails), transformez vos photos en sable vivant et exportez en HTML hors ligne ou relief 3D AR.',
    h1En: 'Interactive Sand Physics, Photo Art & 3D AR Export in Zen Sandscape',
    h1Fr: 'Physique du Sable, Art Photo & Export 3D AR dans Zen Sandscape',
    tag: 'Zen Sandscape',
    cardH2En: 'Sand Physics, Photo Sand Art & Offline HTML',
    cardH2Fr: 'Physique du Sable, Photo Sable & HTML Hors Ligne',
    cardPEn: 'Simulate sand, water, lava, portals, and color photos, then export offline HTML or 3D AR wall art.',
    cardPFr: 'Simulez sable, eau, lave, portails et photos en couleur, puis exportez en HTML autonome ou tableau 3D AR.',
    ref: 'sandbox',
    sections: [
      {
        h2En: 'Dynamic Element Reactions & Photo-to-Sand Painting',
        h2Fr: 'Réactions Physiques & Conversion Photo vers Sable',
        pEn: 'Paint with falling sand, flowing water, fire, volcanic lava, voltage sparks, and portal teleporters under live gravity and wind controls — or load any photo to watch it cascade into a rich, multi-color granular mosaic.',
        pFr: 'Peignez avec du sable, de l\'eau, du feu, de la lave volcanique, des étincelles et des portails sous contrôle du vent et de la gravité, ou chargez une photo pour la transformer en mosaïque de sable coloré.'
      },
      {
        h2En: 'Standalone Offline HTML & 3D Wall Art AR Export',
        h2Fr: 'Export HTML Autonome Hors Ligne & Tableau 3D AR',
        pEn: 'Compile your scene into a clean, fullscreen, offline-ready HTML simulation with all editor controls removed, or export your layered sand relief as a 3D mesh and preview it directly on your wall in AR Viewer.',
        pFr: 'Compilez votre création en fichier HTML autonome plein écran prêt pour une utilisation hors ligne sans panneaux d\'édition, ou exportez votre relief de sable en 3D pour le visualiser au mur dans AR Viewer.'
      }
    ]
  },
  {
    id: '3d-studio',
    titleEn: '3D Studio — Procedural 3D Modeling & STL/OBJ Export | Studios-Pro',
    titleFr: '3D Studio — Modélisation 3D Procédurale & Export STL/OBJ | Studios-Pro',
    descEn: 'Design, sculpt, and customize procedural 3D meshes in your browser and export watertight STL and OBJ files for 3D printing.',
    descFr: 'Concevez et personnalisez des modèles 3D procéduraux dans votre navigateur et exportez des fichiers STL et OBJ étanches pour l\'impression 3D.',
    h1En: 'Procedural 3D Modeling & Mesh Customization in 3D Studio',
    h1Fr: 'Modélisation 3D Procédurale & Maillages dans 3D Studio',
    tag: '3D Studio',
    cardH2En: 'Create Custom Procedural 3D Models',
    cardH2Fr: 'Créez des Modèles 3D Procéduraux',
    cardPEn: 'Build procedural geometries, customize PBR materials, and export print-ready STL and OBJ models.',
    cardPFr: 'Concevez des géométries procédurales, personnalisez les matériaux PBR et exportez en STL et OBJ.',
    ref: 'ap3d',
    sections: [
      {
        h2En: 'Real-Time Procedural Mesh Generation',
        h2Fr: 'Génération de Maillage Procédural en Temps Réel',
        pEn: 'Generate precision mechanical parts, calibration objects, parametric solids, and torus knots using intuitive live sliders with instant millimeter feedback.',
        pFr: 'Générez des pièces mécaniques précises, objets de calibration, solides paramétriques et formes mathématiques grâce aux curseurs temps réel.'
      },
      {
        h2En: 'Material Finishes & Watertight STL / OBJ Export',
        h2Fr: 'Matériaux PBR & Export STL / OBJ Étanche',
        pEn: 'Preview gold, chrome, matte filament, neon, or glass materials under studio lighting, then export clean STL or OBJ meshes compatible with every 3D printer slicer.',
        pFr: 'Prévisualisez vos modèles en or, chrome, filament mat, néon ou verre sous éclairage studio, puis exportez des fichiers STL ou OBJ compatibles avec tous les trancheurs 3D.'
      }
    ]
  },
  {
    id: 'studio-3d-viewer',
    titleEn: 'Studio 3D Viewer — Online CAD Inspector, Measure & Slice | Studios-Pro',
    titleFr: 'Studio 3D Viewer — Inspecteur CAO, Mesure & Coupe en Ligne | Studios-Pro',
    descEn: 'Free online CAD viewer. Drag & drop STL, OBJ, GLB, GLTF, PLY, and 3MF files to inspect, measure in mm, slice cross-sections, and export.',
    descFr: 'Visualiseur CAO gratuit en ligne. Glissez-déposez des fichiers STL, OBJ, GLB, GLTF, PLY et 3MF pour inspecter, mesurer en mm et couper en section.',
    h1En: 'Online 3D Model Inspection, Slicing & Measurement',
    h1Fr: 'Inspection de Modèles 3D, Coupe et Mesure en Ligne',
    tag: '3D Viewer',
    cardH2En: 'Inspect, Measure & Slice 3D Models',
    cardH2Fr: 'Inspectez, Mesurez & Coupez des Modèles 3D',
    cardPEn: 'Drag & drop STL, OBJ, GLB, and 3MF files to measure exact millimeter distances and slice along X/Y/Z axes.',
    cardPFr: 'Glissez-déposez STL, OBJ, GLB et 3MF pour mesurer au millimètre et couper selon les axes X/Y/Z.',
    ref: 's3dviewer',
    sections: [
      {
        h2En: 'Cross-Section Clipping Planes & Internal Inspection',
        h2Fr: 'Plans de Coupe Transversale & Inspection Interne',
        pEn: 'Slice cleanly through any 3D model along X, Y, or Z axes with color-filled section caps to verify wall thickness, hollow cavities, and mechanical clearances before printing.',
        pFr: 'Coupez n\'importe quel modèle 3D selon les axes X, Y ou Z avec remplissage de coupe pour vérifier l\'épaisseur des parois, les cavités internes et les jeux mécaniques avant impression.'
      },
      {
        h2En: 'Point-to-Point Millimeter CAD Measurement',
        h2Fr: 'Mesure CAO Point à Point en Millimètres',
        pEn: 'Click any two surface points to compute exact real-world distances in millimeters, inspect bounding boxes and triangle counts, and export standalone interactive HTML previews.',
        pFr: 'Cliquez sur deux points de la surface pour calculer la distance réelle en millimètres, vérifier la boîte englobante et exporter des aperçus HTML interactifs autonomes.'
      }
    ]
  },
  {
    id: 'dfx-studio',
    titleEn: 'DFX Studio — Online AutoCAD DXF Viewer & Vector Tool | Studios-Pro',
    titleFr: 'DFX Studio — Visualiseur AutoCAD DXF & Outil Vectoriel | Studios-Pro',
    descEn: 'Open AutoCAD DXF blueprints in your browser without AutoCAD, toggle layers, inspect vector dimensions, and export SVG or standalone HTML.',
    descFr: 'Ouvrez vos plans AutoCAD DXF dans le navigateur sans AutoCAD, gérez les calques, inspectez les tracés et exportez en SVG ou HTML autonome.',
    h1En: 'Online AutoCAD DXF Blueprint Viewer & Vector Inspector',
    h1Fr: 'Visualiseur de Plans AutoCAD DXF & Inspecteur Vectoriel',
    tag: 'DFX Studio',
    cardH2En: 'Open DXF Blueprints & Inspect CAD Layers',
    cardH2Fr: 'Ouvrez vos Plans DXF & Inspectez les Calques',
    cardPEn: 'Load AutoCAD DXF drawings, toggle CAD layers, verify laser cut paths, and export clean SVG or HTML.',
    cardPFr: 'Chargez des dessins DXF AutoCAD, gérez les calques, vérifiez vos découpes laser et exportez en SVG ou HTML.',
    ref: 'dfx',
    sections: [
      {
        h2En: 'Instant AutoCAD DXF Parsing & Layer Controls',
        h2Fr: 'Lecture Instantanée DXF AutoCAD & Contrôle des Calques',
        pEn: 'Drop any DXF CAD drawing directly into DFX Studio to inspect polylines, arcs, circles, and named AutoCAD layers with smooth pan and zoom — 100% locally in your browser.',
        pFr: 'Glissez n\'importe quel fichier DXF dans DFX Studio pour inspecter polylignes, arcs, cercles et calques AutoCAD avec zoom fluide, 100 % localement dans votre navigateur.'
      },
      {
        h2En: 'Clean SVG & Standalone Interactive Export',
        h2Fr: 'Export SVG Propre & HTML Interactif',
        pEn: 'Convert CAD blueprints into scalable SVG files for LightBurn, Inkscape, and web publishing, or package them as interactive shareable HTML views.',
        pFr: 'Convertissez vos plans CAO en fichiers SVG propres pour LightBurn, Inkscape ou le web, ou exportez-les en vues HTML interactives.'
      }
    ]
  },
  {
    id: 'depth-maps',
    titleEn: 'AI Depth Maps for 3D Reliefs & Lithophanes | Studios-Pro',
    titleFr: 'Cartes de Profondeur IA pour Reliefs 3D & Lithophanies | Studios-Pro',
    descEn: 'Generate high-resolution grayscale depth maps and 3D STL reliefs from photos using AI for CNC wood carving and 3D printed lithophanes.',
    descFr: 'Générez des cartes de profondeur haute résolution et reliefs STL 3D par IA pour gravure bois CNC et lithophanies imprimées en 3D.',
    h1En: 'Generate AI Depth Maps for CNC Carving and 3D Printing',
    h1Fr: 'Générer des Cartes de Profondeur IA pour Gravure CNC & 3D',
    tag: 'Depth Maps',
    cardH2En: 'Generate AI Depth Maps & CNC Reliefs',
    cardH2Fr: 'Générez des Cartes de Profondeur & Reliefs CNC',
    cardPEn: 'Convert flat photos into 16-bit grayscale heightmaps and watertight 3D relief STL files.',
    cardPFr: 'Convertissez des photos plates en cartes de hauteur 16 bits et fichiers STL de bas-relief.',
    ref: 'depth',
    sections: [
      {
        h2En: 'AI Monocular Depth Estimation',
        h2Fr: 'Estimation Monoculaire de Profondeur par IA',
        pEn: 'Upload any portrait, landscape, or emblem. The depth estimation engine separates foreground subjects from backgrounds to build smooth, high-contrast displacement maps.',
        pFr: 'Importez un portrait, un paysage ou un emblème. Le moteur d\'estimation sépare automatiquement les plans pour construire une carte de profondeur fluide et contrastée.'
      },
      {
        h2En: 'CNC Wood Carving & Backlit Lithophane Export',
        h2Fr: 'Export Gravure Bois CNC & Lithophanie',
        pEn: 'Download crisp grayscale depth maps for Vectric Aspire, Carveco, and Blender, or convert them directly into watertight STL relief meshes ready for 3D printing.',
        pFr: 'Téléchargez des cartes de profondeur nettes pour Vectric Aspire, Carveco et Blender, ou exportez directement un maillage STL étanche prêt pour l\'impression 3D.'
      }
    ]
  },
  {
    id: 'vector-cnc',
    titleEn: 'Vector CNC — Image to SVG, DXF & G-Code Converter | Studios-Pro',
    titleFr: 'Vector CNC — Convertisseur Image vers SVG, DXF & G-Code | Studios-Pro',
    descEn: 'Trace PNG/JPG images to SVG and DXF vector paths and generate ready-to-run GRBL/Marlin G-Code toolpaths for laser cutters and CNC routers.',
    descFr: 'Vectorisez vos images PNG/JPG en SVG et DXF et générez des parcours G-Code GRBL/Marlin prêts pour découpeuses laser et routeurs CNC.',
    h1En: 'Online SVG to DXF Converter & CNC G-Code Generator',
    h1Fr: 'Convertisseur SVG vers DXF & Générateur de G-Code CNC',
    tag: 'Vector CNC',
    cardH2En: 'Convert Images & SVG to DXF & G-Code',
    cardH2Fr: 'Convertissez Images & SVG en DXF & G-Code',
    cardPEn: 'Prepare clean vector paths and GRBL G-Code for laser engraving, diode cutting, and CNC milling.',
    cardPFr: 'Préparez des tracés vectoriels propres et du G-Code GRBL pour gravure laser et fraisage CNC.',
    ref: 'vcnc',
    sections: [
      {
        h2En: 'Precision Bitmap Tracing & SVG/DXF Vectorization',
        h2Fr: 'Vectorisation Précise & Conversion SVG/DXF',
        pEn: 'Import PNG, JPG, or SVG artwork, adjust trace thresholds and path smoothing, and convert contours into scale-accurate CAD DXF files compatible with LightBurn, LaserGRBL, and CNC controllers.',
        pFr: 'Importez un visuel PNG, JPG ou SVG, ajustez les seuils de détection et le lissage, puis exportez en DXF CAO à l\'échelle pour LightBurn, LaserGRBL et contrôleurs CNC.'
      },
      {
        h2En: 'Automatic GRBL & Marlin G-Code Toolpaths',
        h2Fr: 'Parcours G-Code GRBL & Marlin Automatiques',
        pEn: 'Configure feed rate, spindle or laser power, pass depth, and work area dimensions to preview and download production G-Code directly from your browser.',
        pFr: 'Réglez vitesse d\'avance, puissance laser ou broche, profondeur de passe et dimensions pour prévisualiser et télécharger votre G-Code directement depuis le navigateur.'
      }
    ]
  },
  {
    id: 'maker-studio-7',
    titleEn: 'Maker Studio 7 — Parametric Laser Boxes & Lithophanes | Studios-Pro',
    titleFr: 'Maker Studio 7 — Boîtes Laser Paramétriques & Lithophanies | Studios-Pro',
    descEn: 'Design parametric finger-joint laser boxes with kerf compensation, interlocking enclosures, and custom 3D lithophanes in DXF, SVG, and STL.',
    descFr: 'Concevez des boîtes laser paramétriques à encoches avec compensation de trait (kerf) et des lithophanies 3D en DXF, SVG et STL.',
    h1En: 'Parametric Laser Boxes & Maker Generators in Maker Studio 7',
    h1Fr: 'Boîtes Laser Paramétriques & Générateurs dans Maker Studio 7',
    tag: 'Maker Studio 7',
    cardH2En: 'Parametric Box & Joint Designer',
    cardH2Fr: 'Conception Paramétrique de Boîtes Laser',
    cardPEn: 'Generate kerf-compensated finger-joint boxes, T-slot enclosures, and 3D lithophanes in DXF, SVG, and STL.',
    cardPFr: 'Générez des boîtes à encoches avec compensation kerf, boîtiers et lithophanies en DXF, SVG et STL.',
    ref: 'mkr7',
    sections: [
      {
        h2En: 'Kerf-Compensated Finger-Joint Enclosures',
        h2Fr: 'Boîtiers à Encoches avec Compensation Kerf',
        pEn: 'Enter exact box dimensions, plywood or acrylic material thickness, tab width, and laser kerf offset. Maker Studio 7 automatically lays out flat press-fit panels ready for DXF or SVG cutting.',
        pFr: 'Indiquez dimensions, épaisseur du contreplaqué ou de l\'acrylique, largeur des crans et compensation kerf. Maker Studio 7 génère instantanément les panneaux à plat en DXF ou SVG.'
      },
      {
        h2En: '3D Printed Lithophanes & PBR Maker Utilities',
        h2Fr: 'Lithophanies Imprimables 3D & Utilitaires Maker',
        pEn: 'Transform photos into curved or flat backlit lithophanes with custom wall thickness and export watertight STL files ready for FDM or resin printers.',
        pFr: 'Transformez vos photos en lithophanies plates ou courbes rétroéclairées et exportez des fichiers STL étanches pour imprimantes FDM ou résine.'
      }
    ]
  },
  {
    id: 'jewelry-maker-pro',
    titleEn: 'Jewelry Maker Pro — Custom 3D Ring & Jewelry CAD | Studios-Pro',
    titleFr: 'Jewelry Maker Pro — CAO de Bagues & Bijoux 3D | Studios-Pro',
    descEn: 'Design custom 3D printable rings, signet bands, gemstone bezels, and engraved jewelry with real US/EU millimeter sizes. Export castable STL.',
    descFr: 'Concevez des bagues, alliances, chevalières et sertissages de pierres aux tailles réelles US/EU en millimètres. Exportez en STL pour fonderie.',
    h1En: 'Interactive Custom Jewelry Design & 3D Print CAD',
    h1Fr: 'CAO de Conception de Bijoux 3D Personnalisés',
    tag: 'Jewelry Maker',
    cardH2En: 'Design Custom 3D Printable Rings',
    cardH2Fr: 'Concevez des Bagues & Alliances 3D',
    cardPEn: 'Customize ring sizes (US/EU/UK), stone mounts, engravings, and export watertight STL for resin casting.',
    cardPFr: 'Ajustez tailles de bague (US/EU/UK), sertissages, gravures et exportez en STL étanche pour coulée.',
    ref: 'jwly',
    sections: [
      {
        h2En: 'Parametric Ring Sizing & Gemstone Bezels',
        h2Fr: 'Tailles de Bague Paramétriques & Sertissages',
        pEn: 'Select standard US, EU, or UK ring sizes, customize band profile, width, thickness, engraved lettering, and gemstone settings with realistic gold, platinum, and silver rendering.',
        pFr: 'Sélectionnez les tailles standards US, EU ou UK, personnalisez le profil d\'anneau, la largeur, la gravure et le sertissage de pierres avec rendu réaliste or, platine ou argent.'
      },
      {
        h2En: 'Castable Resin & 3D Print STL Optimization',
        h2Fr: 'Optimisation STL pour Résine Calcinable & Fonte',
        pEn: 'Export high-resolution watertight STL geometry calibrated for castable wax resin 3D printing and lost-wax precious metal fabrication.',
        pFr: 'Exportez une géométrie STL haute résolution étanche, calibrée pour l\'impression 3D en résine calcinable et la fonte à cire perdue.'
      }
    ]
  },
  {
    id: 'mech-gen-pro',
    titleEn: 'Mech Gen Pro — Parametric Involute Gear & Sprocket CAD | Studios-Pro',
    titleFr: 'Mech Gen Pro — Générateur d\'Engrenages & Pignons CAO | Studios-Pro',
    descEn: 'Calculate and generate involute spur gears, internal rings, planetary gearboxes, and sprockets. Export precision DXF, SVG, and 3D STL.',
    descFr: 'Calculez et générez des engrenages à développante, couronnes internes, trains planétaires et pignons. Exportez en DXF, SVG et STL 3D.',
    h1En: 'Parametric Mechanical Gear & Sprocket Generator',
    h1Fr: 'Générateur d\'Engrenages Mécaniques & Pignons CAO',
    tag: 'Mech Gen Pro',
    cardH2En: 'Design Parametric Gears & Sprockets',
    cardH2Fr: 'Concevez des Engrenages & Pignons',
    cardPEn: 'Compute involute teeth, module, pressure angle, and bore shafts, then export to DXF, SVG, or 3D STL.',
    cardPFr: 'Calculez dentures à développante, module, angle de pression et alésage, puis exportez en DXF, SVG ou STL.',
    ref: 'mechgen',
    sections: [
      {
        h2En: 'Accurate Involute Gear & Pitch Calculations',
        h2Fr: 'Calculs Précis de Denture à Développante',
        pEn: 'Set module, tooth count, pressure angle, backlash clearance, and shaft bore diameter. Mech Gen Pro computes mathematically accurate involute tooth curves and live meshing animations.',
        pFr: 'Paramétrez le module, le nombre de dents, l\'angle de pression, le jeu et le diamètre d\'alésage. Mech Gen Pro trace des courbes à développante exactes avec aperçu d\'engrènement.'
      },
      {
        h2En: 'DXF, SVG & 3D Printable STL Export',
        h2Fr: 'Export DXF, SVG & STL Imprimable 3D',
        pEn: 'Export 2D vector profiles in DXF or SVG for laser cutting and CNC milling, or extrude directly into 3D STL mechanical gears for functional prototyping.',
        pFr: 'Exportez les profils 2D en DXF ou SVG pour découpe laser et fraisage CNC, ou extrudez directement en engrenages STL 3D pour le prototypage fonctionnel.'
      }
    ]
  },
  {
    id: 'best-free-online-3d-model-viewer-no-download',
    titleEn: 'Best Free Online 3D Model Viewer — No Download | Studios-Pro',
    titleFr: 'Meilleur Visualiseur 3D Gratuit en Ligne — Sans Téléchargement | Studios-Pro',
    descEn: 'Open and inspect STL, OBJ, GLB, GLTF, PLY, and 3MF files instantly in your browser with zero software installation and 100% local privacy.',
    descFr: 'Ouvrez et inspectez vos fichiers STL, OBJ, GLB, GLTF, PLY et 3MF instantanément dans le navigateur sans installation et avec confidentialité locale.',
    h1En: 'Best Free Online 3D Model Viewer — No Download Required',
    h1Fr: 'Meilleur Visualiseur 3D Gratuit en Ligne — Sans Téléchargement',
    tag: '3D Viewer',
    cardH2En: 'Instant Browser-Based 3D Viewing',
    cardH2Fr: 'Visualisation 3D Instantanée en Ligne',
    cardPEn: 'Open STL, OBJ, GLB, GLTF, PLY, and 3MF files instantly — no software download required.',
    cardPFr: 'Ouvrez STL, OBJ, GLB, GLTF, PLY et 3MF instantanément sans installer de logiciel.',
    ref: 's3dviewer',
    sections: [
      {
        h2En: 'Why Use a Browser-Based 3D Viewer?',
        h2Fr: 'Pourquoi utiliser un visualiseur 3D dans le navigateur ?',
        pEn: 'Installing heavy desktop software like Blender or MeshLab just to verify an STL or 3MF file wastes time and disk space. A WebGL browser viewer lets you open, orbit, measure, and slice 3D models in seconds on Windows, Mac, Linux, iPad, or phone.',
        pFr: 'Installer un logiciel lourd comme Blender ou MeshLab juste pour vérifier un fichier STL ou 3MF fait perdre du temps. Un visualiseur WebGL dans le navigateur permet d\'ouvrir, pivoter, mesurer et couper vos modèles en quelques secondes sur tout appareil.'
      },
      {
        h2En: 'Studios-Pro 3D Viewer — All Major Formats Privately',
        h2Fr: 'Studios-Pro 3D Viewer — Tous les Formats en Confidentialité',
        pEn: 'Inspect binary/ASCII STL, OBJ+MTL, GLB, GLTF, PLY, and 3MF models entirely client-side — your files never leave your computer. Measure millimeter distances, inspect cross-sections, or send straight to WebAR.',
        pFr: 'Inspectez STL, OBJ+MTL, GLB, GLTF, PLY et 3MF entièrement côté client : vos fichiers ne quittent jamais votre ordinateur. Mesurez en millimètres, coupez en section ou lancez en WebAR.'
      }
    ]
  },
  {
    id: 'how-to-convert-stl-to-obj-online-free',
    titleEn: 'How to Convert STL to OBJ Online Free | Studios-Pro',
    titleFr: 'Convertir STL en OBJ Gratuitement en Ligne | Studios-Pro',
    descEn: 'Convert STL 3D printing files to Wavefront OBJ format online for free with vertex normals and 100% client-side privacy.',
    descFr: 'Convertissez vos fichiers STL d\'impression 3D en format Wavefront OBJ gratuitement en ligne avec normales et traitement 100 % local.',
    h1En: 'How to Convert STL to OBJ Online Free — Complete Guide',
    h1Fr: 'Convertir STL en OBJ Gratuitement en Ligne — Guide Complet',
    tag: '3D Converter',
    cardH2En: 'Instant STL to OBJ Conversion in Browser',
    cardH2Fr: 'Conversion STL vers OBJ dans le Navigateur',
    cardPEn: 'Convert STL to OBJ online with vertex normals and material support — zero server uploads.',
    cardPFr: 'Convertissez STL en OBJ en ligne avec normales de sommets — sans envoi serveur.',
    ref: 's3dviewer',
    sections: [
      {
        h2En: 'Why Convert STL to OBJ?',
        h2Fr: 'Pourquoi convertir STL en OBJ ?',
        pEn: 'STL is universal for 3D printing slicers but omits material groups and UV/color metadata. Wavefront OBJ preserves normals, material slots (.MTL), and named geometry groups required by Blender, Unity, and Unreal Engine.',
        pFr: 'Le format STL est standard pour l\'impression 3D mais ne gère pas les groupes de matériaux ni les couleurs. Wavefront OBJ conserve les normales, les matériaux (.MTL) et les groupes requis par Blender, Unity et Unreal Engine.'
      },
      {
        h2En: 'Convert STL to OBJ in 3 Steps',
        h2Fr: 'Convertir STL en OBJ en 3 Étapes',
        pEn: 'Open Studios-Pro 3D Viewer or PolyMorph 3D, drag and drop your .STL file onto the viewport, verify dimensions, and click Export OBJ. Conversion completes locally in milliseconds with no upload queue.',
        pFr: 'Ouvrez Studios-Pro 3D Viewer ou PolyMorph 3D, glissez-déposez votre fichier .STL, vérifiez les dimensions et cliquez sur Exporter OBJ. La conversion s\'effectue localement en quelques millisecondes.'
      }
    ]
  },
  {
    id: 'free-laser-cut-svg-generator-online',
    titleEn: 'Free Laser Cut SVG File Generator Online — CNC Ready | Studios-Pro',
    titleFr: 'Générateur de Fichiers SVG Découpe Laser Gratuit en Ligne | Studios-Pro',
    descEn: 'Create clean SVG, DXF, and G-Code vector files for laser cutters (xTool, Sculpfun, LightBurn) and CNC routers online for free.',
    descFr: 'Créez des fichiers vectoriels SVG, DXF et G-Code propres pour découpeuses laser (xTool, Sculpfun, LightBurn) et CNC gratuitement en ligne.',
    h1En: 'Free Online Laser Cut SVG Generator for CNC & Engraving',
    h1Fr: 'Générateur SVG Gratuit pour Découpe Laser & CNC',
    tag: 'Vector CNC',
    cardH2En: 'Generate CNC-Ready SVG & Laser Paths',
    cardH2Fr: 'Générez des Tracés SVG pour Découpe Laser',
    cardPEn: 'Trace images and export SVG, DXF, and G-Code paths compatible with LightBurn and LaserGRBL.',
    cardPFr: 'Vectorisez vos images et exportez en SVG, DXF et G-Code compatibles LightBurn et LaserGRBL.',
    ref: 'vcnc',
    sections: [
      {
        h2En: 'Choosing Between SVG, DXF & G-Code for Lasers',
        h2Fr: 'Choisir entre SVG, DXF et G-Code pour Laser',
        pEn: 'Diode and CO2 laser cutters (xTool, Ortur, Sculpfun, Omtech) accept SVG for quick LightBurn projects, DXF for precision CAD assemblies, and GRBL G-Code for direct machine execution.',
        pFr: 'Les découpeuses laser diode et CO2 (xTool, Ortur, Sculpfun, Omtech) acceptent le SVG pour LightBurn, le DXF pour les assemblages CAO précis et le G-Code GRBL pour l\'exécution directe.'
      },
      {
        h2En: 'Build Laser Cut Paths in Vector CNC Studio',
        h2Fr: 'Créer vos Tracés dans Vector CNC Studio',
        pEn: 'Upload a PNG or JPG graphic, auto-trace crisp cut and engrave contours, set exact millimeter scale, and export SVG, DXF, or G-Code directly from your browser.',
        pFr: 'Importez une image PNG ou JPG, vectorisez automatiquement des contours nets, définissez l\'échelle en millimètres et exportez en SVG, DXF ou G-Code depuis le navigateur.'
      }
    ]
  },
  {
    id: 'free-ai-image-to-3d-model-generator-online',
    titleEn: 'Free AI Image to 3D Model Generator Online — Photo to STL | Studios-Pro',
    titleFr: 'Générateur de Modèle 3D IA Gratuit — Photo en STL | Studios-Pro',
    descEn: 'Convert any 2D photo or logo into a watertight 3D printable STL, OBJ, or GLB relief model online for free using browser-side AI depth estimation.',
    descFr: 'Convertissez n\'importe quelle photo 2D ou logo en modèle 3D imprimable STL, OBJ ou GLB gratuitement en ligne grâce à l\'estimation de profondeur IA.',
    h1En: 'Free AI Image to 3D Model Generator — Convert Photo to STL',
    h1Fr: 'Générateur Photo vers Modèle 3D IA Gratuit — Photo en STL',
    tag: 'Photo to 3D',
    cardH2En: 'Turn Any Photo into a 3D Printable Model',
    cardH2Fr: 'Transformez une Photo en Modèle 3D Imprimable',
    cardPEn: 'Convert 2D photos into watertight 3D relief STL, OBJ, and animated GLB models directly in your browser.',
    cardPFr: 'Convertissez des photos 2D en bas-reliefs STL étanches, OBJ et GLB animés directement dans le navigateur.',
    ref: 'n3d',
    sections: [
      {
        h2En: 'How AI Converts a 2D Photograph into a 3D Mesh',
        h2Fr: 'Comment l\'IA convertit une photo 2D en maillage 3D',
        pEn: 'Depth estimation and multi-scale luminance decomposition transform flat image pixels into smooth 3D elevation fields. High-frequency noise is filtered while preserving crisp facial features, lettering, and logo silhouettes.',
        pFr: 'L\'estimation de profondeur et la décomposition multi-échelle transforment les pixels d\'une image plate en relief 3D fluide, en filtrant le bruit tout en préservant les détails fins et contours.'
      },
      {
        h2En: 'Export Watertight STL, Colored OBJ & WebAR GLB',
        h2Fr: 'Export STL Étanche, OBJ Coloré & GLB WebAR',
        pEn: 'Tune relief thickness, base height, border frames, and smoothing in New 3D 4D or ArtGen Studio, then download print-ready STL meshes or full-color GLB models in seconds.',
        pFr: 'Ajustez profondeur du relief, socle, cadre et lissage dans New 3D 4D ou ArtGen Studio, puis téléchargez des maillages STL prêts à imprimer ou des modèles GLB couleur.'
      }
    ]
  },
  {
    id: 'how-to-view-glb-file-online-free',
    titleEn: 'How to View GLB Files Online Free — No Download | Studios-Pro',
    titleFr: 'Comment Ouvrir un Fichier GLB Gratuitement en Ligne | Studios-Pro',
    descEn: 'Open and inspect binary GLB and GLTF 3D models with PBR textures and animations free in your browser — plus instant phone WebAR preview.',
    descFr: 'Ouvrez et inspectez des fichiers 3D binaires GLB et GLTF avec textures PBR et animations gratuitement dans le navigateur, avec aperçu WebAR mobile.',
    h1En: 'How to Open and View GLB Files Online Free',
    h1Fr: 'Comment Ouvrir et Visualiser un Fichier GLB Gratuitement',
    tag: '3D Viewer',
    cardH2En: 'Open GLB Files Instantly in Your Browser',
    cardH2Fr: 'Ouvrez des Fichiers GLB Instantanément',
    cardPEn: 'View binary GLB 3D models with PBR textures, lighting presets, animations, and WebAR preview.',
    cardPFr: 'Visualisez vos modèles GLB avec textures PBR, éclairages, animations et aperçu WebAR.',
    ref: 's3dviewer',
    sections: [
      {
        h2En: 'What Makes GLB the Standard Format for Web & AR?',
        h2Fr: 'Pourquoi GLB est le format standard du Web et de la RA ?',
        pEn: 'Developed by the Khronos Group, GLB bundles 3D geometry, PBR textures, metallic/roughness maps, and animations into a single compact binary file — making it the gold standard for Three.js, WebAR, Unity, and e-commerce.',
        pFr: 'Développé par le Khronos Group, le format GLB regroupe géométrie 3D, textures PBR, matériaux et animations en un seul fichier binaire compact, idéal pour Three.js, WebAR, Unity et le e-commerce.'
      },
      {
        h2En: 'Inspect GLB Models Locally in Studios-Pro',
        h2Fr: 'Inspecter vos Modèles GLB Localement dans Studios-Pro',
        pEn: 'Drag and drop your .GLB file into Studio 3D Viewer or AR Viewer to inspect PBR materials, measure real dimensions, toggle wireframes, export standalone HTML, or project into your room via QR code.',
        pFr: 'Glissez votre fichier .GLB dans Studio 3D Viewer ou AR Viewer pour inspecter les matériaux PBR, mesurer les dimensions réelles, exporter en HTML autonome ou projeter dans votre pièce par QR code.'
      }
    ]
  },
  {
    id: 'free-dxf-viewer-online-autocad-alternative',
    titleEn: 'Free Online DXF Viewer — Open AutoCAD Files Without AutoCAD | Studios-Pro',
    titleFr: 'Visualiseur DXF Gratuit en Ligne — Alternative AutoCAD | Studios-Pro',
    descEn: 'Open and inspect AutoCAD DXF CAD blueprints online for free without installing AutoCAD. Toggle layers, zoom, measure, and export SVG.',
    descFr: 'Ouvrez et inspectez des plans AutoCAD DXF gratuitement en ligne sans AutoCAD. Gérez les calques, zoomez, mesurez et exportez en SVG.',
    h1En: 'Free Online DXF Viewer — Open AutoCAD Files Without AutoCAD',
    h1Fr: 'Visualiseur DXF Gratuit en Ligne — Alternative à AutoCAD',
    tag: 'DFX Studio',
    cardH2En: 'Open AutoCAD DXF Files Free in Browser',
    cardH2Fr: 'Ouvrez des Fichiers AutoCAD DXF Gratuitement',
    cardPEn: 'View DXF blueprints with layer toggles, zoom, measurement, and clean SVG export.',
    cardPFr: 'Visualisez vos plans DXF avec gestion des calques, zoom, mesure et export SVG.',
    ref: 'dfx',
    sections: [
      {
        h2En: 'Why View DXF Drawings Without an Expensive AutoCAD License?',
        h2Fr: 'Pourquoi ouvrir vos plans DXF sans licence AutoCAD ?',
        pEn: 'Professional AutoCAD subscriptions exceed $200/month — unnecessary when you simply need to review client blueprints, laser cut paths, or architectural layouts. A browser DXF viewer opens drawings instantly on Mac, Windows, or Linux.',
        pFr: 'Un abonnement AutoCAD dépasse 200 $/mois — inutile lorsqu\'il suffit de vérifier un plan client, une découpe laser ou un plan d\'architecte. Un visualiseur DXF en ligne ouvre vos fichiers en une seconde sur Mac, Windows ou Linux.'
      },
      {
        h2En: 'Layer Inspection & SVG Export with DFX Studio',
        h2Fr: 'Inspection des Calques & Export SVG avec DFX Studio',
        pEn: 'Drop any .DXF file into Studios-Pro DFX Studio to toggle CAD layers, inspect coordinates, verify cut geometry, and export clean SVG vectors with zero server upload.',
        pFr: 'Glissez n\'importe quel fichier .DXF dans DFX Studio pour activer/masquer les calques CAO, vérifier la géométrie de découpe et exporter en SVG propre sans envoi serveur.'
      }
    ]
  }
];

// Manual standalone blog posts in public/blog/ that must be linked from /blog/ & /fr/blog/ (eliminates orphan pages!)
const manualGuides = [
  {
    id: 'how-to-do-filament-painting-without-hueforge',
    tag: 'Filament Art',
    cardH2En: 'How to Do Filament Painting Without HueForge',
    cardH2Fr: 'Faire du Filament Painting sans HueForge (Guide Gratuit)',
    cardPEn: 'Step-by-step guide to Kubelka-Munk TD calibration, My Spool Rack, CMYW lithophanes, and Bambu AMS 3MF swaps.',
    cardPFr: 'Guide étape par étape : calibration TD Kubelka-Munk, Mon Rack, lithophanies CMYW et 3MF auto-swap Bambu AMS.'
  },
  {
    id: 'how-to-convert-2d-image-to-3d-model-online',
    tag: '2D to 3D Guide',
    cardH2En: 'How to Convert a 2D Image to a 3D Model Online',
    cardH2Fr: 'Convertir une Image 2D en Modèle 3D en Ligne',
    cardPEn: 'Complete tutorial with an embedded live converter to turn PNG, JPG, and sketches into 3D STL/OBJ meshes.',
    cardPFr: 'Tutoriel complet avec outil intégré pour transformer PNG, JPG et dessins en maillages 3D STL/OBJ.'
  },
  {
    id: 'how-to-open-dxf-file-on-mac-without-autocad',
    tag: 'macOS CAD',
    cardH2En: 'How to Open DXF Files on Mac Without AutoCAD',
    cardH2Fr: 'Ouvrir un Fichier DXF sur Mac sans AutoCAD',
    cardPEn: 'View AutoCAD DXF drawings instantly in Safari or Chrome on macOS with our interactive browser DXF widget.',
    cardPFr: 'Ouvrez vos dessins DXF AutoCAD instantanément dans Safari ou Chrome sur macOS sans installer de logiciel.'
  },
  {
    id: 'how-to-view-stl-files-on-ipad-online',
    tag: 'iPad & iOS',
    cardH2En: 'How to View STL Files on iPad & iPhone Online',
    cardH2Fr: 'Visualiser des Fichiers STL sur iPad et iPhone',
    cardPEn: 'Inspect 3D printing STL models right inside iOS Safari with touch controls and zero App Store bloat.',
    cardPFr: 'Inspectez vos modèles 3D STL dans iOS Safari avec contrôles tactiles et sans installer d\'application.'
  },
  {
    id: '3d-4d-studio',
    tag: '3D / 4D Guide',
    cardH2En: 'High-Fidelity 3D & 4D Models in Your Browser',
    cardH2Fr: 'Modèles 3D et 4D Haute Fidélité dans le Navigateur',
    cardPEn: 'Discover browser-based WebGL 3D & 4D sculpting, lighting refraction, and rapid exports for 3D printing & CNC.',
    cardPFr: 'Découvrez la modélisation WebGL 3D & 4D et les exportations rapides pour impression 3D et CNC.'
  },
  {
    id: 'aura-ai',
    tag: 'Aura AI',
    cardH2En: 'AI Web App Generation with Aura AI Studio',
    cardH2Fr: 'Génération d\'Applications Web IA avec Aura AI',
    cardPEn: 'Turn natural-language prompts into live interactive web prototypes and downloadable code.',
    cardPFr: 'Transformez vos idées en langage naturel en prototypes web interactifs et code téléchargeable.'
  },
  {
    id: 'ia-architecte',
    tag: 'IA Architecte',
    cardH2En: 'Rapid Architectural Ideation with IA Architecte',
    cardH2Fr: 'Idéation Architecturale Rapide avec IA Architecte',
    cardPEn: 'Generate architectural floorplan concepts and 3D structural layouts rapidly with AI assistance.',
    cardPFr: 'Générez rapidement des concepts de plans architecturaux et maquettes 3D assistés par IA.'
  }
];

function escapeJson(str) {
  return String(str).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

const sharedStyles = `    <style>
        :root { --bg: #05070a; --surface: #0f172a; --accent: #3b82f6; --text: #f8fafc; --muted: #94a3b8; }
        * { box-sizing: border-box; }
        body { background: var(--bg); color: var(--text); font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 0; line-height: 1.8; }
        .nav { padding: 16px 32px; display: flex; justify-content: space-between; align-items: center; gap: 14px; border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(15,23,42,0.85); backdrop-filter: blur(12px); position: sticky; top: 0; z-index: 100; }
        .logo { font-weight: 800; font-size: 1.4rem; color: white; text-decoration: none; display: flex; align-items: center; gap: 10px; }
        .btn-back { background: rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 8px; color: white; text-decoration: none; font-weight: 600; transition: 0.2s; font-size: 0.92rem; }
        .btn-back:hover { background: var(--accent); }
        .container { max-width: 840px; margin: 40px auto 70px; padding: 0 20px; }
        h1 { font-size: 2.6rem; margin-bottom: 18px; line-height: 1.2; background: linear-gradient(135deg, #00f3ff, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        h2 { font-size: 1.65rem; margin-top: 38px; color: white; }
        p { color: #cbd5e1; font-size: 1.08rem; margin-bottom: 18px; }
        .badge-tag { display: inline-block; padding: 4px 12px; background: rgba(59,130,246,0.2); color: #38bdf8; border-radius: 999px; font-size: 0.82rem; font-weight: 700; margin-bottom: 14px; }
        .cta-container { text-align: center; margin: 52px 0 36px; padding: 38px 24px; background: rgba(59,130,246,0.1); border-radius: 20px; border: 1px solid rgba(59,130,246,0.3); }
        .cta-btn { display: inline-block; background: linear-gradient(135deg, #00f3ff, #3b82f6); color: #020617; padding: 15px 40px; border-radius: 50px; font-size: 1.1rem; font-weight: 800; text-decoration: none; text-transform: uppercase; letter-spacing: 1px; transition: 0.3s; box-shadow: 0 10px 30px rgba(59,130,246,0.3); }
        .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 15px 40px rgba(59,130,246,0.45); }
        .footer-links { margin-top: 40px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
        .footer-links a { color: #38bdf8; text-decoration: none; font-size: 0.9rem; padding: 6px 12px; border-radius: 8px; background: rgba(56,189,248,0.08); }
        [data-fr] { display: none; }
        body.lang-fr [data-fr] { display: inline; }
        body.lang-fr div[data-fr] { display: block; }
        body.lang-fr [data-en] { display: none; }
        .lang-switch { display: flex; gap: 8px; }
        .lang-btn { background: none; border: 1px solid rgba(255,255,255,0.25); color: var(--muted); padding: 5px 11px; border-radius: 6px; cursor: pointer; font-weight: 700; transition: 0.2s; text-decoration: none; font-size: 0.85rem; }
        .lang-btn.active { background: white; color: #020617; border-color: white; }
        @media (max-width: 640px) { .nav { padding: 14px 16px; } .logo { font-size: 1.15rem; } h1 { font-size: 1.9rem; } }
    </style>`;

const templateEn = (tut) => {
  const ogImg = tut.ogImage || 'https://studios-pro.com/og_banner.jpg';
  const urlEn = `https://studios-pro.com/blog/${tut.id}`;
  const urlFr = `https://studios-pro.com/fr/blog/${tut.id}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${tut.titleEn}</title>
    <meta name="description" content="${tut.descEn}">
    <link rel="canonical" href="${urlEn}">
    <link rel="alternate" hreflang="en" href="${urlEn}">
    <link rel="alternate" hreflang="fr" href="${urlFr}">
    <link rel="alternate" hreflang="x-default" href="${urlEn}">
    <meta property="og:type" content="article">
    <meta property="og:locale" content="en_US">
    <meta property="og:locale:alternate" content="fr_FR">
    <meta property="og:title" content="${tut.titleEn}">
    <meta property="og:description" content="${tut.descEn}">
    <meta property="og:image" content="${ogImg}">
    <meta property="og:url" content="${urlEn}">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="icon" type="image/png" href="/logo_studios_pro.png">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
${sharedStyles}
    <script type="application/ld+json">
    [
      {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        "headline": "${escapeJson(tut.h1En)}",
        "description": "${escapeJson(tut.descEn)}",
        "image": "${ogImg}",
        "url": "${urlEn}",
        "inLanguage": "en",
        "author": { "@type": "Organization", "name": "Studios-Pro", "url": "https://studios-pro.com" },
        "publisher": { "@type": "Organization", "name": "Studios-Pro", "logo": { "@type": "ImageObject", "url": "https://studios-pro.com/logo_studios_pro.png" } }
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://studios-pro.com/" },
          { "@type": "ListItem", "position": 2, "name": "Tutorials", "item": "https://studios-pro.com/blog/" },
          { "@type": "ListItem", "position": 3, "name": "${escapeJson(tut.tag)}", "item": "${urlEn}" }
        ]
      }
    ]
    </script>
</head>
<body class="lang-en">
    <nav class="nav">
        <a href="/blog/" class="logo">
            <img src="/logo_studios_pro.png" width="30" height="30" style="border-radius:6px;" alt="Studios-Pro Logo">
            Studios-Pro
        </a>
        <div style="display:flex; gap: 14px; align-items:center;">
            <div class="lang-switch">
                <button type="button" class="lang-btn active" onclick="setLang('en')">EN</button>
                <button type="button" class="lang-btn" onclick="setLang('fr')">FR</button>
            </div>
            <a href="/blog/" class="btn-back"><span data-en>All Tutorials</span><span data-fr>Tous les Tutoriels</span></a>
        </div>
    </nav>

    <main class="container">
        <span class="badge-tag">${tut.tag}</span>
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

        <nav class="footer-links" aria-label="Related links">
            <a href="/"><span data-en>All 24+ Studios</span><span data-fr>Tous les 24+ Studios</span></a>
            <a href="/blog/"><span data-en>All Tutorials</span><span data-fr>Tous les Tutoriels</span></a>
            <a href="/fr/blog/${tut.id}" hreflang="fr">Version Française</a>
            <a href="/faq.html">FAQ</a>
        </nav>
    </main>

    <script>
        function setLang(l) {
            const lang = l === 'fr' ? 'fr' : 'en';
            document.documentElement.lang = lang;
            document.body.className = 'lang-' + lang;
            try { localStorage.setItem('sp_lang', lang); } catch (_) {}
            document.querySelectorAll('.lang-btn').forEach(b => {
                b.classList.toggle('active', b.textContent.trim().toLowerCase() === lang);
            });
        }
        setLang(new URLSearchParams(window.location.search).get('lang') || localStorage.getItem('sp_lang') || 'en');
    </script>
</body>
</html>`;
};

const templateFr = (tut) => {
  const ogImg = tut.ogImage || 'https://studios-pro.com/og_banner.jpg';
  const urlEn = `https://studios-pro.com/blog/${tut.id}`;
  const urlFr = `https://studios-pro.com/fr/blog/${tut.id}`;
  return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${tut.titleFr}</title>
    <meta name="description" content="${tut.descFr}">
    <link rel="canonical" href="${urlFr}">
    <link rel="alternate" hreflang="fr" href="${urlFr}">
    <link rel="alternate" hreflang="en" href="${urlEn}">
    <link rel="alternate" hreflang="x-default" href="${urlEn}">
    <meta property="og:type" content="article">
    <meta property="og:locale" content="fr_FR">
    <meta property="og:locale:alternate" content="en_US">
    <meta property="og:title" content="${tut.titleFr}">
    <meta property="og:description" content="${tut.descFr}">
    <meta property="og:image" content="${ogImg}">
    <meta property="og:url" content="${urlFr}">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="icon" type="image/png" href="/logo_studios_pro.png">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
${sharedStyles}
    <script type="application/ld+json">
    [
      {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        "headline": "${escapeJson(tut.h1Fr)}",
        "description": "${escapeJson(tut.descFr)}",
        "image": "${ogImg}",
        "url": "${urlFr}",
        "inLanguage": "fr",
        "author": { "@type": "Organization", "name": "Studios-Pro", "url": "https://studios-pro.com/fr/" },
        "publisher": { "@type": "Organization", "name": "Studios-Pro", "logo": { "@type": "ImageObject", "url": "https://studios-pro.com/logo_studios_pro.png" } }
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Accueil", "item": "https://studios-pro.com/fr/" },
          { "@type": "ListItem", "position": 2, "name": "Tutoriels", "item": "https://studios-pro.com/fr/blog/" },
          { "@type": "ListItem", "position": 3, "name": "${escapeJson(tut.tag)}", "item": "${urlFr}" }
        ]
      }
    ]
    </script>
</head>
<body>
    <nav class="nav">
        <a href="/fr/blog/" class="logo">
            <img src="/logo_studios_pro.png" width="30" height="30" style="border-radius:6px;" alt="Logo Studios-Pro">
            Studios-Pro
        </a>
        <div style="display:flex; gap: 14px; align-items:center;">
            <div class="lang-switch">
                <a href="/blog/${tut.id}" hreflang="en" class="lang-btn">EN</a>
                <a href="/fr/blog/${tut.id}" hreflang="fr" class="lang-btn active">FR</a>
            </div>
            <a href="/fr/blog/" class="btn-back">Tous les Tutoriels</a>
        </div>
    </nav>

    <main class="container">
        <span class="badge-tag">${tut.tag}</span>
        <h1>${tut.h1Fr}</h1>
        <p>${tut.descFr}</p>

        <h2>${tut.sections[0].h2Fr}</h2>
        <p>${tut.sections[0].pFr}</p>

        <h2>${tut.sections[1].h2Fr}</h2>
        <p>${tut.sections[1].pFr}</p>

        <div class="cta-container">
            <a href="/?ref=${tut.ref}" class="cta-btn" onclick="try{localStorage.setItem('sp_lang','fr');}catch(_){}">Ouvrir l'application</a>
        </div>

        <nav class="footer-links" aria-label="Liens associés">
            <a href="/fr/">Accueil Français</a>
            <a href="/fr/blog/">Tous les Tutoriels FR</a>
            <a href="/blog/${tut.id}" hreflang="en">English Version</a>
            <a href="/fr/faq">FAQ</a>
        </nav>
    </main>
</body>
</html>`;
};

const blogIndexStyles = `    <style>
        :root { --bg: #05070a; --surface: #0f172a; --accent: #3b82f6; --text: #f8fafc; --muted: #94a3b8; }
        * { box-sizing: border-box; }
        body { background: var(--bg); color: var(--text); font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 0; }
        .nav { padding: 16px 32px; display: flex; justify-content: space-between; align-items: center; gap: 14px; border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(15,23,42,0.85); backdrop-filter: blur(12px); position: sticky; top: 0; z-index: 100; }
        .logo { font-weight: 800; font-size: 1.4rem; color: white; text-decoration: none; display: flex; align-items: center; gap: 10px; }
        .btn-back { background: rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 8px; color: white; text-decoration: none; font-weight: 600; transition: 0.2s; font-size: 0.92rem; }
        .btn-back:hover { background: var(--accent); }
        .container { max-width: 1120px; margin: 48px auto 70px; padding: 0 20px; }
        h1 { font-size: 2.9rem; margin: 0 0 14px 0; background: linear-gradient(135deg, #00f3ff, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .subtitle { color: var(--muted); font-size: 1.15rem; margin: 0 0 38px 0; }
        .section-heading { font-size: 1.45rem; color: #38bdf8; margin: 46px 0 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; }
        .card { background: var(--surface); border: 1px solid rgba(255,255,255,0.1); border-radius: 18px; padding: 26px; transition: 0.25s; text-decoration: none; display: flex; flex-direction: column; }
        .card:hover { transform: translateY(-4px); border-color: var(--accent); box-shadow: 0 10px 30px rgba(59,130,246,0.2); }
        .card h2 { color: white; font-size: 1.3rem; margin: 0 0 12px 0; line-height: 1.3; }
        .card p { color: var(--muted); line-height: 1.6; margin: 0 0 18px 0; flex: 1; font-size: 0.96rem; }
        .tag { display: inline-block; align-self: flex-start; padding: 4px 12px; background: rgba(59,130,246,0.2); color: #38bdf8; border-radius: 20px; font-size: 0.78rem; font-weight: 700; margin-bottom: 12px; }
        [data-fr] { display: none; }
        body.lang-fr [data-fr] { display: inline; }
        body.lang-fr [data-en] { display: none; }
        .lang-switch { display: flex; gap: 8px; }
        .lang-btn { background: none; border: 1px solid rgba(255,255,255,0.25); color: var(--muted); padding: 5px 11px; border-radius: 6px; cursor: pointer; font-weight: 700; transition: 0.2s; text-decoration: none; font-size: 0.85rem; }
        .lang-btn.active { background: white; color: #020617; border-color: white; }
        @media (max-width: 640px) { .nav { padding: 14px 16px; } h1 { font-size: 2rem; } .grid { grid-template-columns: 1fr; } }
    </style>`;

const blogDir = path.join(__dirname, 'public/blog');
const frBlogDir = path.join(__dirname, 'public/fr/blog');
if (!fs.existsSync(blogDir)) fs.mkdirSync(blogDir, { recursive: true });
if (!fs.existsSync(frBlogDir)) fs.mkdirSync(frBlogDir, { recursive: true });

// 1. Write EN and FR tutorial pages
tutorials.forEach(tut => {
  fs.writeFileSync(path.join(blogDir, `${tut.id}.html`), templateEn(tut), 'utf8');
  fs.writeFileSync(path.join(frBlogDir, `${tut.id}.html`), templateFr(tut), 'utf8');
});
console.log(`Generated ${tutorials.length} EN tutorials in public/blog/ and ${tutorials.length} FR tutorials in public/fr/blog/`);

// 2. Write EN /blog/index.html linking ALL generated tutorials + ALL 7 manual guides (zero extension .html in links!)
const enStudioCards = tutorials.map(tut => `            <a href="/blog/${tut.id}" class="card">
                <span class="tag">${tut.tag}</span>
                <h2><span data-en>${tut.cardH2En}</span><span data-fr>${tut.cardH2Fr}</span></h2>
                <p><span data-en>${tut.cardPEn}</span><span data-fr>${tut.cardPFr}</span></p>
                <span style="color:#38bdf8; font-weight:600;"><span data-en>Read Tutorial →</span><span data-fr>Lire le Tutoriel →</span></span>
            </a>`).join('\n');

const enGuideCards = manualGuides.map(g => `            <a href="/blog/${g.id}" class="card">
                <span class="tag">${g.tag}</span>
                <h2><span data-en>${g.cardH2En}</span><span data-fr>${g.cardH2Fr}</span></h2>
                <p><span data-en>${g.cardPEn}</span><span data-fr>${g.cardPFr}</span></p>
                <span style="color:#38bdf8; font-weight:600;"><span data-en>Read Guide →</span><span data-fr>Lire le Guide →</span></span>
            </a>`).join('\n');

const blogIndexEn = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Studios-Pro | 3D, 4D, Multi-Color 3MF &amp; CNC Tutorials</title>
    <meta name="description" content="Complete tutorials and step-by-step guides for Studios-Pro's 24+ studios: Filament Painting, Bambu AMS 3MF Painter, QR Coasters, 3D/4D Relief, WebAR, and CNC CAD.">
    <link rel="canonical" href="https://studios-pro.com/blog/">
    <link rel="alternate" hreflang="en" href="https://studios-pro.com/blog/">
    <link rel="alternate" hreflang="fr" href="https://studios-pro.com/fr/blog/">
    <link rel="alternate" hreflang="x-default" href="https://studios-pro.com/blog/">
    <meta property="og:type" content="website">
    <meta property="og:locale" content="en_US">
    <meta property="og:locale:alternate" content="fr_FR">
    <meta property="og:title" content="Studios-Pro | 3D, 4D, Multi-Color 3MF &amp; CNC Tutorials">
    <meta property="og:description" content="Complete tutorials and step-by-step guides for Studios-Pro's 24+ studios: Filament Painting, Bambu AMS 3MF Painter, QR Coasters, 3D/4D Relief, WebAR, and CNC CAD.">
    <meta property="og:image" content="https://studios-pro.com/og_banner.jpg">
    <meta property="og:url" content="https://studios-pro.com/blog/">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="icon" type="image/png" href="/logo_studios_pro.png">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
${blogIndexStyles}
</head>
<body class="lang-en">
    <nav class="nav">
        <a href="/" class="logo">
            <img src="/logo_studios_pro.png" width="30" height="30" style="border-radius:6px;" alt="Studios-Pro Logo">
            Studios-Pro
        </a>
        <div style="display:flex; gap: 14px; align-items:center;">
            <div class="lang-switch">
                <button type="button" class="lang-btn active" onclick="setLang('en')">EN</button>
                <button type="button" class="lang-btn" onclick="setLang('fr')">FR</button>
            </div>
            <a href="/" class="btn-back"><span data-en>Launch App</span><span data-fr>Lancer l'App</span></a>
        </div>
    </nav>

    <main class="container">
        <h1><span data-en>Tutorials &amp; Guides</span><span data-fr>Tutoriels et Guides</span></h1>
        <p class="subtitle"><span data-en>Master all 24+ browser-based 3D, 4D, Multi-Color 3MF, WebAR, and CNC/Laser CAD studios.</span><span data-fr>Maîtrisez l'ensemble de nos 24+ studios 3D, 4D, 3MF Multi-Couleurs, WebAR et CAO CNC/Laser.</span></p>

        <h2 class="section-heading"><span data-en>Studio Tutorials &amp; Format Guides</span><span data-fr>Tutoriels des Studios &amp; Formats</span></h2>
        <div class="grid">
${enStudioCards}
        </div>

        <h2 class="section-heading"><span data-en>In-Depth Practical Guides</span><span data-fr>Guides Pratiques Approfondis</span></h2>
        <div class="grid">
${enGuideCards}
        </div>
    </main>

    <script>
        function setLang(l) {
            const lang = l === 'fr' ? 'fr' : 'en';
            document.documentElement.lang = lang;
            document.body.className = 'lang-' + lang;
            try { localStorage.setItem('sp_lang', lang); } catch (_) {}
            document.querySelectorAll('.lang-btn').forEach(b => {
                b.classList.toggle('active', b.textContent.trim().toLowerCase() === lang);
            });
        }
        setLang(new URLSearchParams(window.location.search).get('lang') || localStorage.getItem('sp_lang') || 'en');
    </script>
</body>
</html>`;

fs.writeFileSync(path.join(blogDir, 'index.html'), blogIndexEn, 'utf8');

// 3. Write native French /fr/blog/index.html
const frStudioCards = tutorials.map(tut => `            <a href="/fr/blog/${tut.id}" class="card">
                <span class="tag">${tut.tag}</span>
                <h2>${tut.cardH2Fr}</h2>
                <p>${tut.cardPFr}</p>
                <span style="color:#38bdf8; font-weight:600;">Lire le Tutoriel →</span>
            </a>`).join('\n');

const frGuideCards = manualGuides.map(g => `            <a href="/blog/${g.id}?lang=fr" class="card">
                <span class="tag">${g.tag}</span>
                <h2>${g.cardH2Fr}</h2>
                <p>${g.cardPFr}</p>
                <span style="color:#38bdf8; font-weight:600;">Lire le Guide →</span>
            </a>`).join('\n');

const blogIndexFr = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Studios-Pro | Tutoriels 3D, 4D, 3MF Multi-Couleurs &amp; CNC</title>
    <meta name="description" content="Tutoriels complets et guides pratiques en français pour les 24+ studios Studios-Pro : Filament Painting, 3MF Painter Bambu AMS, Sous-verres QR 3D, WebAR et CNC.">
    <link rel="canonical" href="https://studios-pro.com/fr/blog/">
    <link rel="alternate" hreflang="fr" href="https://studios-pro.com/fr/blog/">
    <link rel="alternate" hreflang="en" href="https://studios-pro.com/blog/">
    <link rel="alternate" hreflang="x-default" href="https://studios-pro.com/blog/">
    <meta property="og:type" content="website">
    <meta property="og:locale" content="fr_FR">
    <meta property="og:locale:alternate" content="en_US">
    <meta property="og:title" content="Studios-Pro | Tutoriels 3D, 4D, 3MF Multi-Couleurs &amp; CNC">
    <meta property="og:description" content="Tutoriels complets et guides pratiques en français pour les 24+ studios Studios-Pro : Filament Painting, 3MF Painter Bambu AMS, Sous-verres QR 3D, WebAR et CNC.">
    <meta property="og:image" content="https://studios-pro.com/og_banner.jpg">
    <meta property="og:url" content="https://studios-pro.com/fr/blog/">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="icon" type="image/png" href="/logo_studios_pro.png">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
${blogIndexStyles}
</head>
<body>
    <nav class="nav">
        <a href="/fr/" class="logo">
            <img src="/logo_studios_pro.png" width="30" height="30" style="border-radius:6px;" alt="Logo Studios-Pro">
            Studios-Pro
        </a>
        <div style="display:flex; gap: 14px; align-items:center;">
            <div class="lang-switch">
                <a href="/blog/?lang=en" hreflang="en" class="lang-btn">EN</a>
                <a href="/fr/blog/" hreflang="fr" class="lang-btn active">FR</a>
            </div>
            <a href="/" class="btn-back" onclick="try{localStorage.setItem('sp_lang','fr');}catch(_){}">Lancer l'App</a>
        </div>
    </nav>

    <main class="container">
        <h1>Tutoriels &amp; Guides en Français</h1>
        <p class="subtitle">Maîtrisez nos 24+ studios 3D, 4D, 3MF Multi-Couleurs, WebAR et CAO CNC/Laser directement dans le navigateur.</p>

        <h2 class="section-heading">Tutoriels des Studios &amp; Formats</h2>
        <div class="grid">
${frStudioCards}
        </div>

        <h2 class="section-heading">Guides Pratiques Approfondis</h2>
        <div class="grid">
${frGuideCards}
        </div>
    </main>
</body>
</html>`;

fs.writeFileSync(path.join(frBlogDir, 'index.html'), blogIndexFr, 'utf8');
console.log('Regenerated public/blog/index.html & public/fr/blog/index.html (all 24 tutorials + 7 manual guides linked)');
