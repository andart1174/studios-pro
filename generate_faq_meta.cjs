const fs = require('fs');
const path = require('path');

const faqs = [
  {
    qEn: 'Do I need to install any software to use Studios-Pro?',
    aEn: 'No. Studios-Pro is a 100% browser-based platform. Whether you are painting multi-color 3MF models, sculpting 3D/4D photo reliefs, designing rings in Jewelry Maker Pro, or generating CNC G-Code, all computations run directly in Chrome, Safari, Edge, or Firefox with zero installation.',
    qFr: 'Dois-je installer un logiciel pour utiliser Studios-Pro ?',
    aFr: 'Non. Studios-Pro est une plateforme 100 % basée sur le navigateur. Que vous coloriez des modèles 3MF multi-couleurs, sculptiez des reliefs 3D/4D, conceviez des bagues dans Jewelry Maker Pro ou génériez du G-Code CNC, tous les calculs s\'exécutent dans Chrome, Safari, Edge ou Firefox sans aucune installation.'
  },
  {
    qEn: 'What file formats can I export from Studios-Pro?',
    aEn: 'Studios-Pro supports STL, OBJ, 3MF (multi-color Bambu Studio / OrcaSlicer / Prusa MMU), GLB, GLTF, PLY, and USDZ/WebAR for 3D printing and augmented reality; SVG, DXF, and GRBL/Marlin G-Code for laser cutters and CNC routers; plus WAV audio, MP4/WebM video, and standalone interactive HTML files.',
    qFr: 'Dans quels formats de fichiers puis-je exporter depuis Studios-Pro ?',
    aFr: 'Studios-Pro prend en charge les formats STL, OBJ, 3MF (multi-couleurs Bambu Studio / OrcaSlicer / Prusa MMU), GLB, GLTF, PLY et USDZ/WebAR pour l\'impression 3D et la réalité augmentée ; SVG, DXF et G-Code GRBL/Marlin pour découpe laser et CNC ; ainsi que WAV, MP4/WebM et HTML interactif autonome.'
  },
  {
    qEn: 'Is my generated content and 3D data private?',
    aEn: 'Yes. All 3D rendering, mesh generation, photo relief sculpting, and CAD conversions execute locally on your device using WebGL and WebAssembly. Your uploaded photos, STL/3MF models, and DXF blueprints are never uploaded to our servers.',
    qFr: 'Mes créations et mes données 3D restent-elles privées ?',
    aFr: 'Oui. Tous les rendus 3D, générations de maillages, sculptures de bas-relief et conversions CAO s\'exécutent localement sur votre appareil via WebGL et WebAssembly. Vos photos, fichiers STL/3MF et plans DXF ne sont jamais envoyés sur nos serveurs.'
  },
  {
    qEn: 'How does the Free vs. Premium system work?',
    aEn: 'Every visitor can explore and design across all 24+ creative studios for free, and free accounts include 5 complimentary production exports. Upgrading to Studios-Pro Premium unlocks unlimited exports, high-resolution outputs, commercial usage rights, and full access across every studio.',
    qFr: 'Comment fonctionne la différence entre Gratuit et Premium ?',
    aFr: 'Chaque visiteur peut explorer et concevoir gratuitement dans nos 24+ studios créatifs, et les comptes gratuits incluent 5 exportations offertes. L\'abonnement Studios-Pro Premium débloque les exportations illimitées, les rendus haute résolution, la licence commerciale et l\'accès complet à tous les studios.'
  },
  {
    qEn: 'What is the price of Studios-Pro Premium?',
    aEn: 'Studios-Pro Premium costs $10 USD per month (billed securely via Stripe). There are no hidden fees or per-model credits — one subscription covers unlimited exports across all 24+ studios.',
    qFr: 'Quel est le prix de Studios-Pro Premium ?',
    aFr: 'Studios-Pro Premium coûte 10 $ USD par mois (facturation sécurisée par Stripe). Il n\'y a aucun frais caché ni crédit par modèle : un seul abonnement couvre des exportations illimitées dans l\'ensemble de nos 24+ studios.'
  },
  {
    qEn: 'Can I use Studios-Pro on mobile phones, tablets, and Chromebooks?',
    aEn: 'Yes. Studios-Pro is fully responsive and works on iOS, Android, iPadOS, macOS, Windows, Linux, and Chromebooks. For heavy high-polygon 3D sculpting or long video renders, a desktop or laptop with hardware GPU acceleration delivers the fastest performance.',
    qFr: 'Puis-je utiliser Studios-Pro sur téléphone, tablette ou Chromebook ?',
    aFr: 'Oui. Studios-Pro est entièrement adaptatif et fonctionne sur iOS, Android, iPadOS, macOS, Windows, Linux et Chromebook. Pour les maillages 3D très denses ou les rendus vidéo longs, un ordinateur avec accélération GPU offre les meilleures performances.'
  },
  {
    qEn: 'Is Studios-Pro a free online alternative to HueForge and Bambu AMS color tools?',
    aEn: 'Yes! Our Filament Painting & Layer-Swap Studio uses Linear-RGB Kubelka-Munk optical transmission distance (TD) simulation, a free smartphone Camera TD calibrator, 250+ spools (.hfp import), CMYW color lithophanes, and native Bambu Studio / OrcaSlicer auto-swap 3MF export. Pair it with our Multi-Color 3MF Painter for 1-click AI colorization on STL models.',
    qFr: 'Studios-Pro est-il une alternative en ligne à HueForge et aux outils couleur Bambu AMS ?',
    aFr: 'Oui ! Notre Filament Painting & Layer-Swap Studio utilise la simulation optique Kubelka-Munk TD en RVB linéaire, un calibrateur Caméra TD gratuit sur smartphone, plus de 250 bobines (import .hfp), des lithophanies couleur CMYW et l\'export 3MF auto-swap natif Bambu Studio / OrcaSlicer. Associez-le au Multi-Color 3MF Painter pour colorier vos STL par IA en 1 clic.'
  },
  {
    qEn: 'Can I view my 3D models in Augmented Reality (AR) on my phone without an app?',
    aEn: 'Yes. Upload any STL, OBJ, or GLB file in Studios-Pro AR Viewer (or click AR directly inside any studio) and scan the QR code with your phone. Your model opens at real-world scale via native Android SceneViewer and iOS QuickLook with zero app download.',
    qFr: 'Puis-je voir mes modèles 3D en Réalité Augmentée (AR) sur téléphone sans application ?',
    aFr: 'Oui. Importez un fichier STL, OBJ ou GLB dans Studios-Pro AR Viewer (ou cliquez sur AR dans n\'importe quel studio) et scannez le QR code avec votre téléphone. Votre modèle s\'affiche à l\'échelle réelle via Android SceneViewer et iOS QuickLook sans télécharger d\'application.'
  },
  {
    qEn: 'Does Studios-Pro work for 3D printing, laser cutting, and CNC routers?',
    aEn: 'Absolutely. Studios-Pro outputs watertight binary STL and multi-part 3MF files ready for Bambu Lab, Prusa, Creality, Anycubic, and Elegoo slicers, plus scale-accurate DXF, SVG, and GRBL/Marlin G-Code toolpaths for diode/CO2 lasers and CNC mills.',
    qFr: 'Studios-Pro est-il compatible avec l\'impression 3D, la découpe laser et la CNC ?',
    aFr: 'Absolument. Studios-Pro génère des fichiers STL binaires étanches et des 3MF multi-pièces prêts pour Bambu Lab, Prusa, Creality, Anycubic et Elegoo, ainsi que des tracés DXF, SVG et parcours G-Code GRBL/Marlin à l\'échelle pour lasers et fraiseuses CNC.'
  },
  {
    qEn: 'Can I design 3D watch movements, Cryptex puzzles, and papercraft in PolyMorph 3D Studio?',
    aEn: 'Yes. PolyMorph 3D Studio includes procedural engines for mechanical watch movements and tourbillons, Da Vinci Cryptex puzzle boxes, Sugihara optical illusions, Pepakura-style papercraft unfolders, modular RPG dungeon tiles, flexi articulated models, and Voronoi vases with instant AR projection.',
    qFr: 'Puis-je concevoir des mouvements de montre 3D, des Cryptex et du papercraft dans PolyMorph 3D Studio ?',
    aFr: 'Oui. PolyMorph 3D Studio intègre des moteurs procéduraux pour mouvements horlogers à tourbillon, boîtes Cryptex Da Vinci, illusions d\'optique de Sugihara, dépliage papercraft type Pepakura, tuiles de donjon RPG, modèles articulés flexi et vases Voronoi avec projection AR instantanée.'
  },
  {
    qEn: 'Can I sell 3D prints, coasters, or CAD designs created with Studios-Pro (Commercial License)?',
    aEn: 'Free tier exports are licensed for personal, educational, and evaluation use. Active Studios-Pro Premium subscribers receive full commercial rights to sell physical 3D prints, laser-cut products, jewelry, coasters, and custom client deliverables generated with our studios. Full terms are published in our Site Rules.',
    qFr: 'Puis-je vendre des impressions 3D, sous-verres ou fichiers créés avec Studios-Pro (Licence Commerciale) ?',
    aFr: 'Les exportations du forfait gratuit sont destinées à un usage personnel, éducatif et d\'évaluation. Les abonnés Studios-Pro Premium disposent d\'une licence commerciale complète pour vendre les impressions 3D physiques, découpes laser, bijoux, sous-verres et projets clients générés dans nos studios. Les conditions détaillées figurent dans les Règles du Site.'
  },
  {
    qEn: 'How do cancellations, billing, and data privacy (GDPR / Quebec Law 25) work?',
    aEn: 'All payments are processed securely by Stripe — we never store credit card numbers. You can cancel your Premium subscription at any time before renewal, and you can request full account and data deletion at any time in accordance with GDPR and Quebec Law 25 via our Contact form or Privacy Policy.',
    qFr: 'Comment fonctionnent l\'annulation, la facturation et la confidentialité (RGPD / Loi 25 Québec) ?',
    aFr: 'Tous les paiements sont traités de manière sécurisée par Stripe — nous ne stockons aucun numéro de carte bancaire. Vous pouvez annuler votre abonnement Premium à tout moment avant son renouvellement et demander la suppression complète de votre compte conformément au RGPD et à la Loi 25 du Québec via notre formulaire de contact ou notre Politique de Confidentialité.'
  }
];

function escapeJson(str) {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildFaqSchema(lang) {
  const items = faqs.map(item => `      {
        "@type": "Question",
        "name": "${escapeJson(lang === 'fr' ? item.qFr : item.qEn)}",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "${escapeJson(lang === 'fr' ? item.aFr : item.aEn)}"
        }
      }`).join(',\n');

  const homeUrl = lang === 'fr' ? 'https://studios-pro.com/fr/' : 'https://studios-pro.com/';
  const pageUrl = lang === 'fr' ? 'https://studios-pro.com/fr/faq' : 'https://studios-pro.com/faq.html';
  const homeName = lang === 'fr' ? 'Accueil Studios-Pro' : 'Studios-Pro Home';

  return `  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "inLanguage": "${lang}",
    "mainEntity": [
${items}
    ]
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "${homeName}",
        "item": "${homeUrl}"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "FAQ",
        "item": "${pageUrl}"
      }
    ]
  }
  </script>`;
}

const faqStyles = `    <style>
        :root { --bg: #05070a; --surface: #0f172a; --accent: #3b82f6; --cyan: #00f3ff; --text: #f8fafc; --muted: #94a3b8; }
        * { box-sizing: border-box; }
        body { background: var(--bg); color: var(--text); font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 0; line-height: 1.75; }
        .nav { padding: 16px 32px; display: flex; justify-content: space-between; align-items: center; gap: 16px; border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(15,23,42,0.85); backdrop-filter: blur(12px); position: sticky; top: 0; z-index: 100; }
        .logo { font-weight: 800; font-size: 1.4rem; color: white; text-decoration: none; display: flex; align-items: center; gap: 10px; }
        .nav-actions { display: flex; gap: 14px; align-items: center; }
        .btn-back { background: rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 8px; color: white; text-decoration: none; font-weight: 600; transition: 0.2s; font-size: 0.92rem; }
        .btn-back:hover { background: var(--accent); }
        .container { max-width: 860px; margin: 44px auto 70px; padding: 0 20px; }
        h1 { font-size: 2.7rem; margin: 0 0 12px 0; line-height: 1.2; background: linear-gradient(135deg, #00f3ff, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .lead { color: var(--muted); font-size: 1.1rem; margin: 0 0 32px 0; }
        .question { margin-bottom: 22px; background: rgba(15,23,42,0.75); padding: 22px 24px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.08); border-left: 4px solid var(--accent); }
        .question h2 { color: #fff; margin: 0 0 10px 0; font-size: 1.18rem; line-height: 1.4; }
        .question p { color: #cbd5e1; font-size: 1rem; margin: 0; }
        .footer-links { margin-top: 48px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }
        .footer-links a { color: #38bdf8; text-decoration: none; font-size: 0.92rem; padding: 7px 14px; border-radius: 8px; background: rgba(56,189,248,0.08); border: 1px solid rgba(56,189,248,0.2); }
        .footer-links a:hover { background: rgba(56,189,248,0.18); }
        [data-fr] { display: none; }
        body.lang-fr [data-fr] { display: inline; }
        body.lang-fr div[data-fr] { display: block; }
        body.lang-fr [data-en] { display: none; }
        .lang-switch { display: flex; gap: 8px; }
        .lang-btn { background: none; border: 1px solid rgba(255,255,255,0.25); color: var(--muted); padding: 5px 11px; border-radius: 6px; cursor: pointer; font-weight: 700; transition: 0.2s; text-decoration: none; font-size: 0.85rem; }
        .lang-btn.active { background: white; color: #020617; border-color: white; }
        @media (max-width: 640px) {
          .nav { padding: 14px 16px; }
          .logo { font-size: 1.15rem; }
          h1 { font-size: 1.95rem; }
          .question { padding: 18px; }
        }
    </style>`;

// 1. Generate EN/Bilingual public/faq.html
const enQuestionsHtml = faqs.map((item, i) => `            <article class="question">
                <h2>Q${i + 1}: ${item.qEn}</h2>
                <p><strong>A${i + 1}:</strong> ${item.aEn}</p>
            </article>`).join('\n');

const frQuestionsHtml = faqs.map((item, i) => `            <article class="question">
                <h2>Q${i + 1} : ${item.qFr}</h2>
                <p><strong>R${i + 1} :</strong> ${item.aFr}</p>
            </article>`).join('\n');

const faqEnHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FAQ | Studios-Pro 3D, 4D, 3MF Painter &amp; CAD Suite</title>
    <meta name="description" content="Answers to frequently asked questions about Studios-Pro: 24+ browser-based 3D/4D studios, Bambu AMS 3MF painting, $10/mo Premium, 5 free exports, WebAR, and privacy.">
    <link rel="canonical" href="https://studios-pro.com/faq.html">
    <link rel="alternate" hreflang="en" href="https://studios-pro.com/faq.html">
    <link rel="alternate" hreflang="fr" href="https://studios-pro.com/fr/faq">
    <link rel="alternate" hreflang="x-default" href="https://studios-pro.com/faq.html">
    <meta property="og:type" content="website">
    <meta property="og:locale" content="en_US">
    <meta property="og:locale:alternate" content="fr_FR">
    <meta property="og:title" content="FAQ | Studios-Pro 3D, 4D, 3MF Painter &amp; CAD Suite">
    <meta property="og:description" content="Answers to frequently asked questions about Studios-Pro: 24+ browser-based 3D/4D studios, Bambu AMS 3MF painting, $10/mo Premium, 5 free exports, WebAR, and privacy.">
    <meta property="og:image" content="https://studios-pro.com/og_banner.jpg">
    <meta property="og:url" content="https://studios-pro.com/faq.html">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="icon" type="image/png" href="/logo_studios_pro.png">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
${faqStyles}
${buildFaqSchema('en')}
</head>
<body class="lang-en">
    <nav class="nav">
        <a href="/" class="logo">
            <img src="/logo_studios_pro.png" width="30" height="30" style="border-radius:6px;" alt="Studios-Pro Logo">
            Studios-Pro
        </a>
        <div class="nav-actions">
            <div class="lang-switch">
                <button type="button" class="lang-btn active" onclick="setLang('en')">EN</button>
                <button type="button" class="lang-btn" onclick="setLang('fr')">FR</button>
            </div>
            <a href="/" class="btn-back"><span data-en>Launch App</span><span data-fr>Lancer l'App</span></a>
        </div>
    </nav>

    <main class="container">
        <h1>
            <span data-en>Frequently Asked Questions</span>
            <span data-fr>Foire Aux Questions (FAQ)</span>
        </h1>
        <p class="lead">
            <span data-en>Everything you need to know about our 24+ browser-based 3D, 4D, Multi-Color 3MF, WebAR, and CNC/Laser CAD studios.</span>
            <span data-fr>Tout ce qu'il faut savoir sur nos 24+ studios 3D, 4D, 3MF Multi-Couleurs, WebAR et CAO CNC/Laser directement dans le navigateur.</span>
        </p>

        <div data-en>
${enQuestionsHtml}
        </div>

        <div data-fr>
${frQuestionsHtml}
        </div>

        <nav class="footer-links" aria-label="Related pages">
            <a href="/"><span data-en>Home — All 24+ Studios</span><span data-fr>Accueil — Tous les 24+ Studios</span></a>
            <a href="/blog/"><span data-en>Tutorials &amp; Guides</span><span data-fr>Tutoriels &amp; Guides</span></a>
            <a href="/fr/faq" hreflang="fr">Page FAQ Française (/fr/faq)</a>
            <a href="/apps/rules/"><span data-en>Site Rules &amp; License</span><span data-fr>Règles du Site &amp; Licence</span></a>
            <a href="/privacy.html"><span data-en>Privacy Policy</span><span data-fr>Politique de Confidentialité</span></a>
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
        const urlLang = new URLSearchParams(window.location.search).get('lang');
        setLang(urlLang || localStorage.getItem('sp_lang') || 'en');
    </script>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, 'public/faq.html'), faqEnHtml, 'utf8');
console.log('Generated public/faq.html (12 EN/FR FAQs, synced pricing & formats)');

// 2. Generate static French SEO page public/fr/faq.html
const frDir = path.join(__dirname, 'public/fr');
if (!fs.existsSync(frDir)) fs.mkdirSync(frDir, { recursive: true });

const faqFrHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FAQ | Studios-Pro — Studios 3D, 4D, 3MF Multi-Couleurs &amp; CAO</title>
    <meta name="description" content="Réponses aux questions fréquentes sur Studios-Pro : 24+ studios 3D/4D en ligne, coloration 3MF Bambu AMS, Premium 10 $/mois, 5 exports gratuits, WebAR et confidentialité.">
    <link rel="canonical" href="https://studios-pro.com/fr/faq">
    <link rel="alternate" hreflang="fr" href="https://studios-pro.com/fr/faq">
    <link rel="alternate" hreflang="en" href="https://studios-pro.com/faq.html">
    <link rel="alternate" hreflang="x-default" href="https://studios-pro.com/faq.html">
    <meta property="og:type" content="website">
    <meta property="og:locale" content="fr_FR">
    <meta property="og:locale:alternate" content="en_US">
    <meta property="og:title" content="FAQ | Studios-Pro — Studios 3D, 4D, 3MF Multi-Couleurs &amp; CAO">
    <meta property="og:description" content="Réponses aux questions fréquentes sur Studios-Pro : 24+ studios 3D/4D en ligne, coloration 3MF Bambu AMS, Premium 10 $/mois, 5 exports gratuits, WebAR et confidentialité.">
    <meta property="og:image" content="https://studios-pro.com/og_banner.jpg">
    <meta property="og:url" content="https://studios-pro.com/fr/faq">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="icon" type="image/png" href="/logo_studios_pro.png">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
${faqStyles}
${buildFaqSchema('fr')}
</head>
<body>
    <nav class="nav">
        <a href="/fr/" class="logo">
            <img src="/logo_studios_pro.png" width="30" height="30" style="border-radius:6px;" alt="Logo Studios-Pro">
            Studios-Pro
        </a>
        <div class="nav-actions">
            <div class="lang-switch">
                <a href="/faq.html?lang=en" hreflang="en" class="lang-btn">EN</a>
                <a href="/fr/faq" hreflang="fr" class="lang-btn active">FR</a>
            </div>
            <a href="/" class="btn-back" onclick="try{localStorage.setItem('sp_lang','fr');}catch(_){}">Lancer l'App</a>
        </div>
    </nav>

    <main class="container">
        <h1>Foire Aux Questions (FAQ)</h1>
        <p class="lead">Tout ce qu'il faut savoir sur nos 24+ studios 3D, 4D, 3MF Multi-Couleurs, WebAR et CAO CNC/Laser directement dans le navigateur.</p>

${frQuestionsHtml}

        <nav class="footer-links" aria-label="Liens associés">
            <a href="/fr/">Accueil Français (/fr/)</a>
            <a href="/fr/blog/">Tutoriels &amp; Guides FR</a>
            <a href="/faq.html?lang=en" hreflang="en">English FAQ</a>
            <a href="/apps/rules/?lang=fr">Règles du Site &amp; Licence</a>
            <a href="/privacy.html?lang=fr">Politique de Confidentialité</a>
        </nav>
    </main>
</body>
</html>
`;

fs.writeFileSync(path.join(frDir, 'faq.html'), faqFrHtml, 'utf8');
console.log('Generated public/fr/faq.html (native French SEO FAQ page)');

// 3. Clean & synchronize canonical + OG tags across all manual & generated blog HTML files (ZERO space accumulation!)
const blogDir = path.join(__dirname, 'public/blog');
const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.html'));

files.forEach(f => {
  const file = path.join(blogDir, f);
  let c = fs.readFileSync(file, 'utf8');

  const titleMatch = c.match(/<title>(.*?)<\/title>/i);
  const descMatch = c.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);

  const pageTitle = titleMatch ? titleMatch[1].trim() : 'Studios-Pro | 3D Design & CAD Studio';
  const pageDesc = descMatch ? descMatch[1].trim() : 'Online 3D CAD design, procedural modeling, and CNC vector converter tools with Studios-Pro.';
  const slugNoExt = f === 'index.html' ? 'blog/' : `blog/${f.replace(/\.html$/i, '')}`;
  const canonicalUrl = `https://studios-pro.com/${slugNoExt}`;
  const ogImg = f.includes('filament-painting') ? 'og_filament_painting_studio.jpg' : 'og_banner.jpg';

  // Strip any previous OG/Twitter/canonical tags INCLUDING leading indentation & blank whitespace runs
  c = c.replace(/^[ \t]*<meta\s+property=["']og:(?:type|title|description|image|url)["'][^>]*>\r?\n?/gim, '');
  c = c.replace(/^[ \t]*<meta\s+name=["']twitter:card["'][^>]*>\r?\n?/gim, '');
  c = c.replace(/^[ \t]*<link\s+rel=["']canonical["'][^>]*>\r?\n?/gim, '');
  // Clean up any legacy whitespace-bloated empty lines before </head>
  c = c.replace(/[ \t]{20,}(?=<)/g, '    ');
  c = c.replace(/\n{3,}(?=\s*<\/head>)/g, '\n');

  const uniqueMetaBlock = `    <link rel="canonical" href="${canonicalUrl}">
    <meta property="og:type" content="${f === 'index.html' ? 'website' : 'article'}">
    <meta property="og:title" content="${pageTitle.replace(/"/g, '&quot;')}">
    <meta property="og:description" content="${pageDesc.replace(/"/g, '&quot;')}">
    <meta property="og:image" content="https://studios-pro.com/${ogImg}">
    <meta property="og:url" content="${canonicalUrl}">
    <meta name="twitter:card" content="summary_large_image">`;

  c = c.replace('</head>', `${uniqueMetaBlock}\n</head>`);
  fs.writeFileSync(file, c, 'utf8');
});
console.log(`Normalized canonical & OG tags across ${files.length} public/blog/*.html files`);
