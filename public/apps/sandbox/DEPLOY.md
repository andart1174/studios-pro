# 🚀 Guide de Déploiement / Deployment Guide

**Zen Sandscape — God Mode**  
Application HTML/JS pure — aucune compilation requise / Pure HTML/JS app — no build required

---

## 🇫🇷 FRANÇAIS

> ℹ️ Cette application est en **HTML/JS pur** — aucun serveur backend n'est requis.
> Vous pouvez la déployer en quelques minutes sur n'importe quelle plateforme.

---

### ✅ Option 1 — GitHub Pages (Gratuit)

**Étape 1 — Créer un dépôt GitHub**
1. Allez sur [github.com](https://github.com) et créez un compte si nécessaire
2. Cliquez sur **"New repository"**
3. Nommez-le `zen-sandscape` (ou ce que vous voulez)
4. Cochez **"Public"** → Cliquez **"Create repository"**

**Étape 2 — Uploader les fichiers**
```bash
# Via terminal (si Git est installé)
git init
git add .
git commit -m "Initial Zen Sandscape"
git branch -M main
git remote add origin https://github.com/VOTRE_USERNAME/zen-sandscape.git
git push -u origin main
```
> Ou utilisez le bouton **"uploading an existing file"** dans l'interface GitHub

**Étape 3 — Activer GitHub Pages**
1. Allez dans **Settings** → **Pages**
2. Source : **Deploy from a branch**
3. Branch : **main** → Folder : **/ (root)**
4. Cliquez **Save**
5. ⏳ Attendez 2-3 minutes

**Résultat** : `https://VOTRE_USERNAME.github.io/zen-sandscape/`

---

### ✅ Option 2 — Netlify (Gratuit, Recommandé ⭐)

**Méthode A — Glisser-déposer (le plus simple)**
1. Allez sur [netlify.com](https://netlify.com) → Créez un compte
2. Sur le dashboard, glissez le dossier `SAND BOX` entier dans la zone de drop
3. ✅ C'est fait ! Vous recevez une URL en quelques secondes

**Méthode B — Via GitHub**
1. Connectez votre dépôt GitHub sur Netlify
2. **Build command** : *(laisser vide)*
3. **Publish directory** : `.` (racine)
4. Cliquez **Deploy site**

**Domaine personnalisé (optionnel)**
1. **Site settings** → **Domain management**
2. Ajoutez votre domaine : `sandscape.mon-domaine.com`
3. Suivez les instructions DNS

---

### ✅ Option 3 — Vercel (Gratuit)

**Étape 1 — Installation**
```bash
npm install -g vercel
```

**Étape 2 — Déploiement**
```bash
# Dans le dossier du projet
vercel

# Répondre aux questions :
# ? Set up and deploy: Y
# ? Which scope: (votre compte)
# ? Link to existing project: N
# ? Project name: zen-sandscape
# ? Directory: ./
# Output directory override: (laisser vide, appuyez Entrée)
```

**Étape 3 — Déploiement production**
```bash
vercel --prod
```

**Résultat** : `https://zen-sandscape.vercel.app`

---

### ✅ Option 4 — Serveur local (développement)

```bash
# Option A — avec Node.js
npx serve .

# Option B — avec Python
python -m http.server 8080

# Option C — Extension VS Code
# Installez "Live Server" → Clic droit index.html → "Open with Live Server"
```

---

## 🇬🇧 ENGLISH

> ℹ️ This is a **pure HTML/JS app** — no backend server required.
> Deploy in minutes on any platform.

---

### ✅ Option 1 — GitHub Pages (Free)

**Step 1 — Create a GitHub repository**
1. Go to [github.com](https://github.com) and create an account if needed
2. Click **"New repository"**
3. Name it `zen-sandscape`
4. Check **"Public"** → Click **"Create repository"**

**Step 2 — Upload your files**
```bash
# Via terminal (if Git is installed)
git init
git add .
git commit -m "Initial Zen Sandscape"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/zen-sandscape.git
git push -u origin main
```
> Or use the **"uploading an existing file"** button in the GitHub UI

**Step 3 — Enable GitHub Pages**
1. Go to **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** → Folder: **/ (root)**
4. Click **Save**
5. ⏳ Wait 2-3 minutes

**Result**: `https://YOUR_USERNAME.github.io/zen-sandscape/`

---

### ✅ Option 2 — Netlify (Free, Recommended ⭐)

**Method A — Drag & Drop (easiest)**
1. Go to [netlify.com](https://netlify.com) → Create an account
2. On the dashboard, drag the entire `SAND BOX` folder into the drop zone
3. ✅ Done! You get a live URL in seconds

**Method B — Via GitHub**
1. Connect your GitHub repository on Netlify
2. **Build command**: *(leave empty)*
3. **Publish directory**: `.` (root)
4. Click **Deploy site**

**Custom domain (optional)**
1. **Site settings** → **Domain management**
2. Add your domain: `sandscape.my-domain.com`
3. Follow DNS instructions

---

### ✅ Option 3 — Vercel (Free)

**Step 1 — Install Vercel CLI**
```bash
npm install -g vercel
```

**Step 2 — Deploy**
```bash
# In the project folder
vercel

# Answer the prompts:
# ? Set up and deploy: Y
# ? Which scope: (your account)
# ? Link to existing project: N
# ? Project name: zen-sandscape
# ? Directory: ./
# Output directory override: (leave empty, press Enter)
```

**Step 3 — Production deployment**
```bash
vercel --prod
```

**Result**: `https://zen-sandscape.vercel.app`

---

### ✅ Option 4 — Local server (development)

```bash
# Option A — with Node.js
npx serve .

# Option B — with Python
python -m http.server 8080

# Option C — VS Code Extension
# Install "Live Server" → Right-click index.html → "Open with Live Server"
```

---

## ⚠️ Notes importantes / Important Notes

| Note | FR | EN |
|---|---|---|
| Serveur requis | Un serveur local est nécessaire pour les assets | A local server is needed for assets |
| HTTPS | Recommandé pour l'enregistrement vidéo | Recommended for video recording |
| Mobile | Compatible mobile (touch events) | Mobile compatible (touch events) |
| Navigateurs | Chrome, Firefox, Edge, Safari | Chrome, Firefox, Edge, Safari |

---

## 📬 Support

Si vous avez des problèmes / If you have any issues:

📧 **andart1174@gmail.com**  
🌐 **ai-codestudio.com**

---

*Zen Sandscape v1.0.0 — © 2026 AI Code Studio*
