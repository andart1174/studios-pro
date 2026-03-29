const fs = require('fs');
const path = require('path');

const tutorials = [
  {
    id: 'aura-ai',
    titleEn: 'Aura AI Studio | Studios-Pro',
    titleFr: 'Aura AI Studio | Studios-Pro',
    descEn: 'A complete guide to using Aura AI Studio for generating custom web applications using Artificial Intelligence.',
    descFr: "Un guide complet pour utiliser Aura AI Studio afin de générer des applications web personnalisées à l'aide de l'Intelligence Artificielle.",
    h1En: 'AI Web App Generation with Aura AI Studio',
    h1Fr: "Génération d'Applications Web IA avec Aura AI Studio",
    tag: 'Aura AI',
    cardH2En: 'Generate React Applications with AI',
    cardH2Fr: "Générez des Applications React avec l'IA",
    cardPEn: 'Learn how to prompt, edit, and export complete React codebases visually.',
    cardPFr: 'Apprenez à formuler des requêtes, éditer et exporter des bases de code React complètes visuellement.',
    ref: 'aurg',
    sections: [
      {
        h2En: 'Intelligent Code Generation',
        h2Fr: 'Génération de Code Intelligente',
        pEn: 'Aura AI Studio provides an advanced AI interface designed to turn your natural language prompts into production-ready React applications. From basic layouts to complex logic, the AI handles the heavy lifting while you focus on the vision.',
        pFr: "Aura AI Studio offre une interface IA avancée conçue pour transformer vos requêtes en langage naturel en applications React prêtes pour la production. L'IA s'occupe du gros du travail pendant que vous vous concentrez sur la vision."
      },
      {
        h2En: 'Real-time Preview & Export',
        h2Fr: 'Aperçu en Temps Réel et Exportation',
        pEn: 'As the AI generates code, the built-in IDE window renders it live. You can instantly test functionality, tweak styling, and when you are satisfied, export the entire project structure natively to your local environment.',
        pFr: "Au fur et à mesure que l'IA génère du code, la fenêtre IDE intégrée le rend en direct. Vous pouvez tester instantanément la fonctionnalité et exporter l'ensemble du projet nativement."
      }
    ]
  },
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
    id: 'ia-architecte',
    titleEn: 'IA Architecte | Studios-Pro',
    titleFr: 'IA Architecte | Studios-Pro',
    descEn: 'Leverage the power of Artificial Intelligence to generate rapid architectural models.',
    descFr: "Tirez parti de la puissance de l'Intelligence Artificielle pour générer des modèles architecturaux rapides.",
    h1En: 'Rapid Ideation with IA Architecte',
    h1Fr: 'Idéation Rapide avec IA Architecte',
    tag: 'IA Architecte',
    cardH2En: 'AI-Powered Structural Generation',
    cardH2Fr: "Génération Structurelle par l'IA",
    cardPEn: 'Use AI prompts to quickly visualize and render complex structural geometries.',
    cardPFr: 'Utilisez des requêtes IA pour visualiser et générer rapidement des géométries structurelles.',
    ref: 'iaar',
    sections: [
      {
        h2En: 'Prompt-Based Floorplans',
        h2Fr: 'Plans Basés sur Requête IA',
        pEn: 'Describe your architectural vision and let the intelligent engine process thousands of permutations to give you a strong starting foundation. Perfect for overcoming the blank-page syndrome.',
        pFr: 'Décrivez votre vision architecturale et laissez le moteur intelligent traiter des milliers de permutations pour vous donner une base solide.'
      },
      {
        h2En: 'Refinement and Execution',
        h2Fr: 'Raffinement et Exécution',
        pEn: 'Once the AI has constructed the initial wireframe, take over manual control to fine-tune material parameters, adjust scaling, and authorize the final production export.',
        pFr: "Une fois que l'IA a construit l'ébauche initiale, prenez le contrôle manuel pour affiner les paramètres, ajuster l'échelle et autoriser l'exportation."
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

// Create files
tutorials.forEach(tut => {
  fs.writeFileSync(path.join(__dirname, 'public/blog', `${tut.id}.html`), template(tut));
  console.log(`Generated ${tut.id}.html`);
});

// Update index.html
let indexContent = fs.readFileSync(path.join(__dirname, 'public/blog/index.html'), 'utf-8');
let cardsHtml = tutorials.map(tut => `
            <a href="/blog/${tut.id}.html" class="card">
                <span class="tag">${tut.tag}</span>
                <h2><span data-en>${tut.cardH2En}</span><span data-fr>${tut.cardH2Fr}</span></h2>
                <p><span data-en>${tut.cardPEn}</span><span data-fr>${tut.cardPFr}</span></p>
                <span style="color:var(--accent); font-weight:600;"><span data-en>Read Tutorial →</span><span data-fr>Lire le Tutoriel →</span></span>
            </a>`).join('');

if (!indexContent.includes('aura-ai.html')) {
  indexContent = indexContent.replace('<div class="grid">', `<div class="grid">${cardsHtml}`);
  fs.writeFileSync(path.join(__dirname, 'public/blog/index.html'), indexContent);
  console.log('Updated index.html');
}

// Update sitemap.xml
let sitemap = fs.readFileSync(path.join(__dirname, 'public/sitemap.xml'), 'utf-8');
const date = new Date().toISOString().split('T')[0];
let sitemapUrls = tutorials.map(tut => `  <url>
    <loc>https://studios-pro.com/blog/${tut.id}.html</loc>
    <lastmod>${date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>\n`).join('');

if (!sitemap.includes('aura-ai.html')) {
  sitemap = sitemap.replace('</urlset>', `${sitemapUrls}</urlset>`);
  fs.writeFileSync(path.join(__dirname, 'public/sitemap.xml'), sitemap);
  console.log('Updated sitemap.xml');
}
