# 🌊 ZEN SANDSCAPE — GOD MODE

> **Simulation physique interactive avec 37 matériaux / Interactive physics simulation with 37 materials**

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-Commercial-green)
![Language](https://img.shields.io/badge/lang-FR%20%7C%20EN-orange)
![Platform](https://img.shields.io/badge/platform-Web-lightgrey)

---

## 🇫🇷 FRANÇAIS

### Description
**Zen Sandscape** est une simulation physique de sable en temps réel, construite entièrement en HTML5 Canvas + JavaScript pur. Interagissez avec 37 matériaux uniques, chacun avec son propre comportement physique réaliste.

### ✨ Fonctionnalités

#### 🧱 Matériaux disponibles
| Catégorie | Matériaux |
|---|---|
| **Méga Matériaux** | Sable, Eau, Feu, Acide, Graine, Fil, Étincelle, Obstacle |
| **God Mode** | Fourmis 🐜, C4 💣, Lave 🌋, Portail IN 🔵, Portail OUT 🟠 |
| **Univers** | Météo ☁️, Émetteur 🚰, Vortex 🌌, Virus 🦠, Anti-Gravité ⬆️ |
| **Deus Ex** | Bloc Piano 🎵, Neige ❄️, Glace 🧊, Capteur 🎛️, Porte Auto 🚪 |
| **Gen 5** | Laser 🔦, Miroir 🪞, Poisson 🐟, Abeille 🐝, Convoyeur 🏭, Ventilateur 💨 |

#### 🚀 Fonctions avancées
- ✅ **Physique pixel-par-pixel** — moteur personnalisé haute performance
- ✅ **Portails** — les particules voyagent entre IN et OUT
- ✅ **Vortex** trou noir — attraction gravitationnelle réelle
- ✅ **Laser + Miroir** — réflexions de rayons lumineux
- ✅ **Piano** — notes musicales en gamme pentatonique
- ✅ **Virus** — se propage et dévore les matériaux
- ✅ **Importation photo** — posez votre image sur le canvas, suppression fond blanc
- ✅ **Bibliothèque Stencils** — modèles (alien, dragon, château, vaisseau...)
- ✅ **Export PNG + Video WebM**
- ✅ **Save/Load** en localStorage
- ✅ **Rendu 3D Emboss** — ombres dynamiques
- ✅ **Gravité + Vent** — sliders réglables
- ✅ **Mode Spray + Symétrie** — pinceaux avancés
- ✅ **Bilingue FR / EN**

### 🛠️ Installation
Aucune dépendance nécessaire ! C'est du HTML/JS pur.

```bash
# Option 1 — Ouvrir directement
Ouvrez index.html dans votre navigateur

# Option 2 — Serveur local (recommandé)
npx serve .
# ou
python -m http.server 8080
```

### 📁 Structure des fichiers
```
zen-sandscape/
├── index.html              # Interface principale
├── css/
│   └── style.css           # Design glassmorphism
├── js/
│   ├── engine.js           # Moteur physique (654 lignes)
│   ├── app.js              # Logique UI et événements
│   ├── models.js           # Assets stencils vectoriels
│   └── translations.js     # Traductions FR/EN
├── README.md
├── LICENSE.md
└── DEPLOY.md
```

---

## 🇬🇧 ENGLISH

### Description
**Zen Sandscape** is a real-time physics sandbox simulation built entirely with HTML5 Canvas + pure JavaScript. Interact with 37 unique materials, each with their own realistic physical behavior.

### ✨ Features

#### 🧱 Available Materials
| Category | Materials |
|---|---|
| **Mega Materials** | Sand, Water, Fire, Acid, Seed, Wire, Spark, Obstacle |
| **God Mode** | Bugs 🐜, C4 💣, Lava 🌋, Portal IN 🔵, Portal OUT 🟠 |
| **Universe** | Weather ☁️, Spawner 🚰, Vortex 🌌, Virus 🦠, Anti-Gravity ⬆️ |
| **Deus Ex** | Piano Block 🎵, Snow ❄️, Ice 🧊, Sensor 🎛️, Auto Door 🚪 |
| **Gen 5** | Laser 🔦, Mirror 🪞, Fish 🐟, Bee 🐝, Conveyor 🏭, Fan 💨 |

#### 🚀 Advanced Features
- ✅ **Pixel-by-pixel physics** — custom high-performance engine
- ✅ **Portals** — particles travel between IN and OUT portals
- ✅ **Vortex black hole** — real gravitational attraction
- ✅ **Laser + Mirror** — light beam reflections
- ✅ **Piano block** — musical notes in pentatonic scale
- ✅ **Virus** — spreads and devours materials (Gray Goo!)
- ✅ **Photo import** — place your image on canvas, white BG removal
- ✅ **Stencil Library** — alien, dragon, castle, ship models
- ✅ **Export PNG + WebM Video recording**
- ✅ **Save/Load** in localStorage
- ✅ **3D Emboss rendering** — dynamic shadows
- ✅ **Gravity + Wind** — adjustable sliders
- ✅ **Spray + Symmetry brush** — advanced brush modes
- ✅ **Bilingual FR / EN**

### 🛠️ Installation
No dependencies needed! Pure HTML/JS.

```bash
# Option 1 — Open directly
Open index.html in your browser

# Option 2 — Local server (recommended)
npx serve .
# or
python -m http.server 8080
```

### 📁 File Structure
```
zen-sandscape/
├── index.html              # Main interface
├── css/
│   └── style.css           # Glassmorphism design
├── js/
│   ├── engine.js           # Physics engine (654 lines)
│   ├── app.js              # UI logic and events
│   ├── models.js           # Vector stencil assets
│   └── translations.js     # FR/EN translations
├── README.md
├── LICENSE.md
└── DEPLOY.md
```

---

## 🎮 Usage / Utilisation

| Action | FR | EN |
|---|---|---|
| Dessiner | Clic gauche + glisser | Left click + drag |
| Changer outil | Cliquer sur bouton | Click tool button |
| Taille pinceau | Slider "Size" | "Size" slider |
| Symétrie | Bouton Miroir 🌗 | Mirror 🌗 button |
| Sauvegarder | 💾 Bouton Save | 💾 Save button |
| Exporter image | 📷 Export | 📷 Export |
| Enregistrer vidéo | 🎬 Record | 🎬 Record |
| Effacer tout | 🗑 Clear | 🗑 Clear |

---

## 📬 Support

**AI Code Studio** — [ai-codestudio.com](https://ai-codestudio.com)  
Email: andart1174@gmail.com

---

*Zen Sandscape v1.0.0 — © 2026 AI Code Studio. All rights reserved.*
