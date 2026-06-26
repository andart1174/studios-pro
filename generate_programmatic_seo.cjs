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

const template = (page) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${page.titleEn}</title>
    <meta name="description" content="${page.descEn}">
    <link rel="icon" type="image/png" href="/logo_studios_pro.png">
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
            margin: 70px 0;
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
    <!-- Structured Data Schema.org JSON-LD -->
    <script type="application/ld+json">
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
      "description": "${page.descEn}"
    }
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
        </div>

        <div class="dropzone-mockup" onclick="location.href='/?ref=${page.ref}'">
            <div class="dropzone-icon">📥</div>
            <div class="dropzone-text">
                <span data-en>Click or Drag File Here to Open Viewer</span>
                <span data-fr>Cliquez ou glissez le fichier ici pour ouvrir le visualiseur</span>
            </div>
            <div class="dropzone-sub">
                <span data-en>No installation required. Works 100% inside your web browser.</span>
                <span data-fr>Aucune installation requise. Fonctionne à 100% dans votre navigateur web.</span>
            </div>
        </div>

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

// Setup directories
const viewerDir = path.join(__dirname, 'public/viewer');
const convertDir = path.join(__dirname, 'public/convert');
const arViewerDir = path.join(__dirname, 'public/ar-viewer');

if (!fs.existsSync(viewerDir)) {
  fs.mkdirSync(viewerDir, { recursive: true });
}
if (!fs.existsSync(convertDir)) {
  fs.mkdirSync(convertDir, { recursive: true });
}
if (!fs.existsSync(arViewerDir)) {
  fs.mkdirSync(arViewerDir, { recursive: true });
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
${baseUrls}${tutorialUrls}${viewerUrls}${convertUrls}${arViewerUrls}</urlset>
`;

fs.writeFileSync(path.join(__dirname, 'public/sitemap.xml'), newSitemap);
console.log('Regenerated sitemap.xml with programmatic SEO routes');
