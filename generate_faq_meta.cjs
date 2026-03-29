const fs = require('fs');
const path = require('path');

const faqHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FAQ | Studios-Pro</title>
    <meta name="description" content="Frequently Asked Questions about Studios-Pro 3D/4D generation, Web Apps, CAD Export, and Payment system.">
    <meta property="og:title" content="Studios-Pro | FAQ">
    <meta property="og:description" content="Frequently Asked Questions about Studios-Pro 3D/4D generation, Web Apps, CAD Export, and Payment system.">
    <meta property="og:image" content="https://studios-pro.com/og_banner.jpg">
    <meta property="og:url" content="https://studios-pro.com/faq.html">
    <meta name="twitter:card" content="summary_large_image">
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
        h2 { font-size: 1.5rem; margin-top: 40px; color: white; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; }
        p { color: #cbd5e1; font-size: 1.1rem; margin-bottom: 20px; }
        .question { margin-bottom: 30px; background: rgba(255,255,255,0.03); padding: 20px; border-radius: 10px; border-left: 4px solid var(--accent); }
        .question h3 { color: #fff; margin-top: 0; margin-bottom: 10px; font-size: 1.2rem; }
        .question p { margin-bottom: 0; }
        
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
        <h1>
            <span data-en>Frequently Asked Questions</span>
            <span data-fr>Foire Aux Questions</span>
        </h1>

        <div data-en>
            <div class="question">
                <h3>Q1: Do I need to install any software to use Studios-Pro?</h3>
                <p><strong>A1:</strong> No. Studios-Pro is a 100% browser-based platform. Whether you are generating AI applications in Aura AI Studio, analyzing CAD data in Jewelry Maker Pro, or recording videos in 4D Figure Builder, all computations are securely handled within your web browser.</p>
            </div>
            <div class="question">
                <h3>Q2: What file formats can I export my 3D models in?</h3>
                <p><strong>A2:</strong> Our tools support industry-standard formats including OBJ, STL, GLB, and PLY for 3D printing and web visualization. For 2D vector applications like Vector CNC or Design Pro Studio, you can export scale-accurate SVG and DXF files.</p>
            </div>
            <div class="question">
                <h3>Q3: Is my generated content and 3D data private?</h3>
                <p><strong>A3:</strong> Yes! Since computations run locally on your device via our advanced WebGL architecture, none of your geometric designs or uploaded photos are stored on our servers. Your architectural floorplans and AI prompts remain completely secure.</p>
            </div>
            <div class="question">
                <h3>Q4: How does the payment system work?</h3>
                <p><strong>A4:</strong> The platform is free to explore and design within. However, to export, download, or record final production files (like 3D STLs, high-res videos, or vectorized DXFs), you must activate a Premium subscription which unlocks the download triggers across all our 14 compartments.</p>
            </div>
            <div class="question">
                <h3>Q5: Can I build complete Web Apps using Aura AI Studio?</h3>
                <p><strong>A5:</strong> Yes. Aura AI Studio turns your natural language prompts into production-ready React codebases. You can instantly preview the interface natively and export the exact frontend structure to host on platforms like Netlify or Vercel.</p>
            </div>
        </div>

        <div data-fr>
            <div class="question">
                <h3>Q1: Dois-je installer un logiciel pour utiliser Studios-Pro ?</h3>
                <p><strong>R1:</strong> Non. Studios-Pro est une plateforme 100 % basée sur le navigateur. Que vous génériez des applications IA dans Aura AI Studio, analysiez des données CAO dans Jewelry Maker Pro ou enregistriez des vidéos dans 4D Figure Builder, tous les calculs sont effectués en toute sécurité dans votre navigateur web.</p>
            </div>
            <div class="question">
                <h3>Q2: Dans quels formats de fichiers puis-je exporter mes modèles 3D ?</h3>
                <p><strong>R2:</strong> Nos outils prennent en charge les formats standards tels que OBJ, STL, GLB et PLY pour l'impression 3D et la visualisation web. Pour les applications vectorielles 2D comme Vector CNC ou Design Pro Studio, vous pouvez exporter des fichiers SVG et DXF à l'échelle.</p>
            </div>
            <div class="question">
                <h3>Q3: Mes données 3D générées sont-elles privées ?</h3>
                <p><strong>R3:</strong> Oui ! Étant donné que les calculs s'exécutent localement sur votre appareil via notre architecture WebGL avancée, aucune de vos conceptions géométriques n'est stockée sur nos serveurs. Vos plans architecturaux restent totalement sécurisés.</p>
            </div>
            <div class="question">
                <h3>Q4: Comment fonctionne le système de paiement ?</h3>
                <p><strong>R4:</strong> La plateforme est gratuite pour explorer et concevoir. Cependant, pour exporter, télécharger ou enregistrer des fichiers de production finaux (comme les STL 3D, les vidéos HD ou les DXF vectorisés), vous devez activer un abonnement Premium qui débloque les exportations sur l'ensemble de nos 14 départements.</p>
            </div>
            <div class="question">
                <h3>Q5: Puis-je créer des applications Web complètes en utilisant Aura AI Studio ?</h3>
                <p><strong>R5:</strong> Oui. Aura AI Studio transforme vos requêtes en langage naturel en bases de code React prêtes pour la production. Vous pouvez prévisualiser instantanément l'interface et exporter la structure frontend pour l'héberger.</p>
            </div>
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

fs.writeFileSync(path.join(__dirname, 'public/faq.html'), faqHtml);
console.log('Generated faq.html');

// Fix index.html OG image link
let mainIndex = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
if (mainIndex.includes('og_image_studios_pro.png')) {
  mainIndex = mainIndex.replace(/og_image_studios_pro\.png/g, 'og_banner.jpg');
  fs.writeFileSync(path.join(__dirname, 'index.html'), mainIndex);
  console.log('Fixed index.html og_banner.jpg');
}

// Inject OG tags to blog HTMLs
const blogDir = path.join(__dirname, 'public/blog');
const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.html'));
const ogTags = `
    <meta property="og:title" content="Studios-Pro | Professional 3D & AI Design Generator">
    <meta property="og:description" content="A complete tutorial and guide on using Studios-Pro's suite of creative tools ranging from CNC Vector paths to AI Depth maps and 4D Music Visualization.">
    <meta property="og:image" content="https://studios-pro.com/og_banner.jpg">
    <meta property="og:url" content="https://studios-pro.com/">
    <meta name="twitter:card" content="summary_large_image">`;

files.forEach(f => {
  const file = path.join(blogDir, f);
  let c = fs.readFileSync(file, 'utf8');
  if (!c.includes('og:title')) {
    c = c.replace('</head>', `${ogTags}\n</head>`);
    fs.writeFileSync(file, c);
    console.log('Injected OG tags into ' + f);
  }
});

// Update sitemap
let sitemap = fs.readFileSync(path.join(__dirname, 'public/sitemap.xml'), 'utf-8');
const date = new Date().toISOString().split('T')[0];
if (!sitemap.includes('faq.html')) {
  const sitemapUrls = `
  <url>
    <loc>https://studios-pro.com/faq.html</loc>
    <lastmod>${date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
  sitemap = sitemap.replace('</urlset>', `${sitemapUrls}\n</urlset>`);
  fs.writeFileSync(path.join(__dirname, 'public/sitemap.xml'), sitemap);
  console.log('Updated sitemap.xml with faq');
}
