/**
 * templates.js — 16 Real Solid PBR Parametric Templates + AI Code-to-3D Synthesizer (v5.0)
 * =========================================================================================
 * Every template generates real volumetric solid PBR 3D geometry (ZERO 1px wireframes!)
 * with clean live `api.param(...)` sliders, full EN/FR metadata, and an offline natural
 * language AI Code-to-3D synthesizer (EN / FR / RO).
 */

const ScriptingTemplates = (() => {

    const TEMPLATES = [
        // ════════════════════════════════════════════════════════════════════
        // CATEGORY: MECHANICAL CAD
        // ════════════════════════════════════════════════════════════════════
        {
            id: 'planetaryGearbox',
            category: 'mechanical',
            icon: '⚙️',
            name_en: 'Planetary Gearbox (Animated)',
            name_fr: 'Boîte Planétaire (Animée)',
            desc_en: 'Meshing gold sun gear, 3 chrome planet gears & titanium ring rotating live.',
            desc_fr: 'Engrenage solaire en or, 3 satellites en chrome et couronne en titane animés.',
            code: `// ⚙️ Parametric Mechanical Planetary Gearbox (Real Solid PBR)
api.clear();
const sunTeeth    = api.param("Sun Teeth", 14, 10, 22, 2);
const planetCount = api.param("Planets", 3, 2, 6, 1);
const thickness   = api.param("Thickness", 0.9, 0.4, 2.0, 0.1);
const speed       = api.param("RPM Speed", 1.2, 0.0, 4.0, 0.1);

const sunR = sunTeeth * 0.18;
const planetTeeth = Math.max(8, Math.round(sunTeeth * 0.65));
const planetR = planetTeeth * 0.18;
const orbitR = (sunR + planetR) * 0.89;
const t = api.time * speed;

// Heavy Obsidian Base Plate & Central Steel Drive Shaft
api.addCylinder(0, -thickness * 1.05, 0, orbitR + planetR + 0.9, orbitR + planetR + 1.1, 0.45, "obsidian");
api.addCylinder(0, 0.2, 0, sunR * 0.26, sunR * 0.26, thickness * 2.4, "chrome");

// Central 18K Gold Sun Gear (rotates clockwise)
api.addGear(0, 0, 0, sunTeeth, sunR, thickness, sunR * 0.28, {
    material: "gold", rx: Math.PI / 2, rz: t
});

// Orbiting Chrome Planet Gears + Copper Pins
for (let i = 0; i < planetCount; i++) {
    const baseAngle = (i / planetCount) * Math.PI * 2 + t * 0.35;
    const px = Math.cos(baseAngle) * orbitR;
    const pz = Math.sin(baseAngle) * orbitR;
    const spin = -t * (sunTeeth / planetTeeth) + (Math.PI / planetTeeth);

    api.addGear(px, 0, pz, planetTeeth, planetR, thickness * 0.96, planetR * 0.28, {
        material: "chrome", rx: Math.PI / 2, rz: spin
    });
    api.addCylinder(px, -0.1, pz, planetR * 0.26, planetR * 0.26, thickness * 1.65, "copper");
    api.addSphere(px, thickness * 0.75, pz, planetR * 0.28, "gold");
}

// Outer Brushed Titanium Ring Housing + 6 Mounting Bolts
const ringR = orbitR + planetR + 0.32;
api.addTorus(0, 0, 0, ringR, thickness * 0.42, 18, 48, { material: "titanium", rx: Math.PI / 2 });
api.radialArray(6, ringR + 0.35, () => {
    api.addCylinder(0, -0.35, 0, 0.24, 0.24, thickness * 1.2, "steel");
    api.addCylinder(0, thickness * 0.3, 0, 0.34, 0.34, 0.22, "gold");
});`
        },
        {
            id: 'jetTurbine',
            category: 'mechanical',
            icon: '✈️',
            name_en: 'Jet Turbine Engine',
            name_fr: 'Turboréacteur Aviation',
            desc_en: 'Titanium nacelle, 18 pitched fan blades, spinner cone & glowing plasma core.',
            desc_fr: 'Nacelle titane, 18 pales inclinées, cône central et cœur plasma.',
            code: `// ✈️ Parametric Jet Turbine Engine (Solid PBR)
api.clear();
const blades  = api.param("Fan Blades", 18, 8, 28, 1);
const radius  = api.param("Nacelle R", 3.6, 2.5, 5.0, 0.1);
const speed   = api.param("Throttle", 2.8, 0.0, 8.0, 0.2);

const spin = api.time * speed;

// Outer Titanium Cowling Rings + Exhaust Nozzle
api.addTorus(0, 0, 2.2, radius, 0.36, 18, 48, "titanium");
api.addTorus(0, 0, 0.6, radius * 1.04, 0.42, 18, 48, "steel");
api.addTorus(0, 0, -1.2, radius * 0.96, 0.38, 18, 48, "titanium");
api.addTorus(0, 0, -3.0, radius * 0.78, 0.32, 16, 40, "copper");

// Spinning Nose Cone & Hub
api.addCone(0, 0, 2.5, radius * 0.30, 2.2, { material: "obsidian", rx: Math.PI / 2 });
api.addCylinder(0, 0, 0, radius * 0.28, radius * 0.32, 4.4, { material: "chrome", rx: Math.PI / 2 });

// 18 Pitched Compressor Fan Blades
api.pushTransform(0, 0, 1.4, 0, 0, spin, 1);
for (let i = 0; i < blades; i++) {
    const a = (i / blades) * Math.PI * 2;
    api.pushTransform(0, 0, 0, 0, 0, a, 1);
    api.addRoundedBox(0, radius * 0.56, 0, 0.52, radius * 0.64, 0.10, 0.03, {
        material: "chrome", ry: 0.45
    });
    api.popTransform();
}
api.popTransform();

// Second-Stage Gold Turbine Rotor
api.pushTransform(0, 0, -0.8, 0, 0, -spin * 1.4, 1);
for (let i = 0; i < blades; i++) {
    const a = (i / blades) * Math.PI * 2;
    api.pushTransform(0, 0, 0, 0, 0, a, 1);
    api.addBox(0, radius * 0.48, 0, 0.36, radius * 0.56, 0.08, { material: "gold", ry: -0.5 });
    api.popTransform();
}
api.popTransform();

// Glowing Plasma Afterburner Core
api.addCylinder(0, 0, -3.2, radius * 0.48, radius * 0.28, 1.8, { material: "neon", rx: Math.PI / 2 });
api.addLight("point", 0, 0, -4.5, "#00f3ff", 2.0);`
        },
        {
            id: 'ballBearing',
            category: 'mechanical',
            icon: '🔩',
            name_en: 'Precision Ball Bearing',
            name_fr: 'Roulement à Billes',
            desc_en: 'Chrome inner/outer races with orbiting steel balls & brass retainer cage.',
            desc_fr: 'Bagues en chrome avec billes d\'acier orbitales et cage en laiton.',
            code: `// 🔩 Precision Mechanical Ball Bearing (Solid PBR)
api.clear();
const balls = api.param("Ball Count", 12, 6, 18, 1);
const outerR = api.param("Outer Radius", 4.2, 2.8, 6.0, 0.1);
const speed  = api.param("Spin Speed", 1.5, 0.0, 5.0, 0.1);

const innerR = outerR * 0.50;
const midR = (outerR + innerR) * 0.50;
const ballR = (outerR - innerR) * 0.32;
const t = api.time * speed;

// Outer & Inner Machined Chrome Races
api.addTorus(0, 0, 0, outerR, ballR * 0.58, 20, 48, { material: "chrome", rx: Math.PI / 2 });
api.addTorus(0, 0, 0, innerR, ballR * 0.56, 20, 48, { material: "titanium", rx: Math.PI / 2 });

// Orbiting Chrome Steel Bearing Balls + Gold Brass Retainer Cage
for (let i = 0; i < balls; i++) {
    const a = (i / balls) * Math.PI * 2 + t;
    const bx = Math.cos(a) * midR;
    const bz = Math.sin(a) * midR;
    api.addSphere(bx, 0, bz, ballR, "chrome");
    // Cage bridge between balls
    const na = a + Math.PI / balls;
    api.addBox(Math.cos(na) * midR, 0, Math.sin(na) * midR, 0.24, ballR * 1.15, ballR * 1.1, {
        material: "gold", ry: -na
    });
}
api.addTorus(0,  ballR * 0.45, 0, midR, 0.10, 10, 40, { material: "copper", rx: Math.PI / 2 });
api.addTorus(0, -ballR * 0.45, 0, midR, 0.10, 10, 40, { material: "copper", rx: Math.PI / 2 });`
        },
        {
            id: 'mechanicalGear',
            category: 'mechanical',
            icon: '🔧',
            name_en: 'Parametric Spur Gear',
            name_fr: 'Engrenage Droit Paramétrique',
            desc_en: '3D-printable solid spur gear with custom teeth, bore hole & spokes.',
            desc_fr: 'Engrenage droit imprimable 3D avec nombre de dents, alésage et rayons.',
            code: `// 🔧 3D-Printable Parametric Spur Gear
api.clear();
const teeth     = api.param("Teeth", 20, 8, 36, 1);
const outerR    = api.param("Outer Radius", 4.5, 2.0, 7.0, 0.1);
const thickness = api.param("Thickness", 1.1, 0.3, 2.5, 0.1);
const boreR     = api.param("Bore Radius", 1.1, 0.3, 2.2, 0.1);

// Main Involute Gear Body
api.addGear(0, 0, 0, teeth, outerR, thickness, boreR, { material: "gold", rx: Math.PI / 2 });

// Raised Machined Hub Collar & Keyway Flange
api.addCylinder(0, 0, 0, boreR + 0.55, boreR + 0.65, thickness * 1.45, "chrome");
api.addCylinder(0, 0, 0, boreR * 0.85, boreR * 0.85, thickness * 1.6, "obsidian");

// Decorative Weight-Reduction Studs
api.radialArray(6, (outerR * 0.78 + boreR) * 0.52, () => {
    api.addCylinder(0, 0, 0, 0.32, 0.32, thickness * 1.12, "titanium");
});`
        },

        // ════════════════════════════════════════════════════════════════════
        // CATEGORY: ARCHITECTURE & DESIGN
        // ════════════════════════════════════════════════════════════════════
        {
            id: 'twistedTower',
            category: 'architecture',
            icon: '🏙️',
            name_en: 'Twisted Skyscraper Tower',
            name_fr: 'Gratte-Ciel Torsadé',
            desc_en: 'Parametric twisting glass & titanium architectural skyscraper with spire.',
            desc_fr: 'Tour architecturale torsadée en verre et titane avec flèche sommitale.',
            code: `// 🏙️ Parametric Twisted Glass & Titanium Skyscraper
api.clear();
const floors   = api.param("Floors", 22, 8, 40, 1);
const twistDeg = api.param("Total Twist°", 110, 0, 270, 5);
const width    = api.param("Base Width", 4.6, 2.8, 7.0, 0.2);

const floorH = 0.58;
const totalH = floors * floorH;

// Granite Plaza Podium
api.addRoundedBox(0, 0.35, 0, width * 1.85, 0.7, width * 1.85, 0.15, "obsidian");

// Central Concrete / Titanium Structural Elevator Core
api.addCylinder(0, totalH / 2 + 0.7, 0, width * 0.22, width * 0.26, totalH, "titanium");

// Twisting Architectural Floor Slabs & Glass Curtain Walls
for (let i = 0; i < floors; i++) {
    const frac = i / Math.max(1, floors - 1);
    const y = 0.95 + i * floorH;
    const rotY = (twistDeg * Math.PI / 180) * frac;
    const taper = 1.0 - frac * 0.32;
    const w = width * taper;
    const d = width * 0.68 * taper;

    // Metallic Floor Slab
    api.addRoundedBox(0, y, 0, w, 0.16, d, 0.05, { material: "chrome", ry: rotY });
    // Blue-Tinted Architectural Glass Curtain
    api.addBox(0, y + floorH * 0.48, 0, w * 0.92, floorH * 0.74, d * 0.92, {
        material: "glass", ry: rotY
    });
    // Corner Facade Fins
    if (i % 2 === 0) {
        api.addBox(0, y + floorH * 0.45, 0, w * 1.03, 0.08, d * 1.03, { material: "gold", ry: rotY });
    }
}

// Rooftop Observation Crown & Illuminated Spire
const topY = 0.95 + floors * floorH;
api.addTorus(0, topY + 0.2, 0, width * 0.35, 0.12, 14, 36, { material: "neon", rx: Math.PI / 2 });
api.addCone(0, topY + 2.4, 0, 0.22, 4.2, "chrome");
api.addSphere(0, topY + 4.5, 0, 0.24, "neon");`
        },
        {
            id: 'spiralStaircase',
            category: 'architecture',
            icon: '🌀',
            name_en: 'Spiral Architectural Staircase',
            name_fr: 'Escalier Hélicoïdal',
            desc_en: 'Cantilevered wood treads, central steel column & sweeping chrome handrail.',
            desc_fr: 'Marches en bois en porte-à-faux, colonne acier et rampe hélicoïdale chromée.',
            code: `// 🌀 Architectural Spiral Staircase (Solid PBR)
api.clear();
const steps  = api.param("Steps", 26, 12, 44, 1);
const radius = api.param("Radius", 3.6, 2.2, 5.5, 0.1);
const height = api.param("Total Height", 10.5, 6.0, 16.0, 0.5);
const turns  = api.param("Turns", 1.5, 0.75, 3.0, 0.25);

const stepH = height / steps;

// Marble Base & Central Structural Steel Column
api.addCylinder(0, 0.15, 0, radius + 0.8, radius + 0.9, 0.3, "marble");
api.addCylinder(0, height / 2 + 0.3, 0, 0.48, 0.56, height + 0.6, "titanium");
api.addSphere(0, height + 0.7, 0, 0.54, "gold");

const railPts = [];
for (let i = 0; i < steps; i++) {
    const frac = i / (steps - 1);
    const a = frac * Math.PI * 2 * turns;
    const y = 0.45 + i * stepH;

    // Cantilevered Solid Wood Tread
    api.pushTransform(0, y, 0, 0, -a, 0, 1);
    api.addRoundedBox(radius * 0.52, 0, 0, radius * 0.92, 0.18, 0.85, 0.04, "wood");
    // Chrome Baluster Post
    api.addCylinder(radius * 0.92, 0.85, 0, 0.055, 0.055, 1.65, "chrome");
    api.popTransform();

    railPts.push([Math.cos(a) * radius * 0.92, y + 1.68, Math.sin(a) * radius * 0.92]);
}

// Continuous Swept Brass Handrail Tube
api.addTube(railPts, 0.11, { material: "gold", segments: steps * 3 });`
        },
        {
            id: 'classicalPavilion',
            category: 'architecture',
            icon: '🏛️',
            name_en: 'Golden Arch Pavilion',
            name_fr: 'Pavillon Doré à Arches',
            desc_en: 'Stepped marble rotunda with 8 classical columns, arches & ribbed golden dome.',
            desc_fr: 'Rotonde en marbre à 8 colonnes, arches et dôme doré nervuré.',
            code: `// 🏛️ Classical Marble & Gold Dome Pavilion
api.clear();
const cols   = api.param("Columns", 8, 4, 14, 1);
const radius = api.param("Radius", 4.8, 3.0, 7.0, 0.2);
const colH   = api.param("Column Height", 4.6, 2.8, 7.0, 0.2);

// Three-Tier Stepped Marble Rotunda Plinth
api.addCylinder(0, 0.20, 0, radius + 1.4, radius + 1.5, 0.4, "marble");
api.addCylinder(0, 0.55, 0, radius + 0.9, radius + 1.0, 0.32, "marble");
api.addCylinder(0, 0.85, 0, radius + 0.45, radius + 0.5, 0.28, "ceramic");

// Ring of Fluted Columns with Gold Capitals
api.radialArray(cols, radius, () => {
    api.addBox(0, 1.15, 0, 0.72, 0.3, 0.72, "marble");
    api.addCylinder(0, 1.3 + colH / 2, 0, 0.26, 0.32, colH, "ceramic");
    api.addBox(0, 1.3 + colH + 0.18, 0, 0.76, 0.28, 0.76, "gold");
});

// Entablature Cornice Ring
const roofY = 1.3 + colH + 0.45;
api.addTorus(0, roofY, 0, radius, 0.42, 16, 48, { material: "marble", rx: Math.PI / 2 });
api.addTorus(0, roofY + 0.35, 0, radius * 0.96, 0.16, 12, 48, { material: "gold", rx: Math.PI / 2 });

// Smooth Lathe Golden Cupola Dome
const domePts = [];
for (let i = 0; i <= 14; i++) {
    const a = (i / 14) * (Math.PI / 2);
    domePts.push([Math.cos(a) * radius * 0.92, Math.sin(a) * radius * 0.78]);
}
api.addLathe(domePts, 44, { y: roofY + 0.32, material: "gold" });
api.addSphere(0, roofY + radius * 0.78 + 0.6, 0, 0.42, "chrome");
api.addCone(0, roofY + radius * 0.78 + 1.5, 0, 0.16, 1.4, "gold");`
        },
        {
            id: 'suspensionBridge',
            category: 'architecture',
            icon: '🌉',
            name_en: 'Suspension Bridge',
            name_fr: 'Pont Suspendu',
            desc_en: 'Twin steel H-towers, roadway deck & swept parabolic catenary cables.',
            desc_fr: 'Tours jumelles en acier, tablier routier et câbles paraboliques.',
            code: `// 🌉 Parametric Cable-Stayed Suspension Bridge
api.clear();
const span   = api.param("Bridge Span", 18, 12, 26, 1);
const towerH = api.param("Tower Height", 7.2, 4.5, 11.0, 0.5);
const hangers = api.param("Cable Hangers", 14, 8, 22, 2);

const deckW = 2.6;
const towerX = span * 0.26;

// Main Roadway Deck + Side Guardrails
api.addBox(0, 1.4, 0, span, 0.38, deckW, "obsidian");
api.addBox(0, 1.62, 0, span, 0.05, 0.14, "gold");
api.addBox(0, 1.72,  deckW * 0.46, span, 0.24, 0.10, "steel");
api.addBox(0, 1.72, -deckW * 0.46, span, 0.24, 0.10, "steel");

// Twin Iconic Red/Copper Steel H-Towers
[-towerX, towerX].forEach(tx => {
    [-deckW * 0.56, deckW * 0.56].forEach(tz => {
        api.addBox(tx, towerH / 2, tz, 0.48, towerH, 0.48, "copper");
    });
    api.addBox(tx, towerH * 0.88, 0, 0.40, 0.42, deckW * 1.2, "copper");
    api.addBox(tx, towerH * 0.52, 0, 0.36, 0.36, deckW * 1.16, "copper");
});

// Parabolic Main Suspension Cables + Vertical Steel Hangers
[-deckW * 0.52, deckW * 0.52].forEach(cz => {
    const cablePts = [];
    const segs = 28;
    for (let i = 0; i <= segs; i++) {
        const x = -span / 2 + (i / segs) * span;
        let y;
        if (Math.abs(x) <= towerX) {
            const u = x / towerX;
            y = 2.1 + (towerH - 2.2) * (u * u);
        } else {
            const u = (Math.abs(x) - towerX) / (span / 2 - towerX);
            y = towerH - 0.1 - (towerH - 1.9) * Math.pow(u, 0.85);
        }
        cablePts.push([x, y, cz]);
    }
    api.addTube(cablePts, 0.11, { material: "chrome", segments: 48 });

    // Vertical Hangers
    for (let h = 1; h < hangers; h++) {
        const x = -span * 0.44 + (h / hangers) * span * 0.88;
        if (Math.abs(Math.abs(x) - towerX) < 0.7) continue;
        let cy;
        if (Math.abs(x) <= towerX) {
            const u = x / towerX;
            cy = 2.1 + (towerH - 2.2) * (u * u);
        } else {
            const u = (Math.abs(x) - towerX) / (span / 2 - towerX);
            cy = towerH - 0.1 - (towerH - 1.9) * Math.pow(u, 0.85);
        }
        const hLen = Math.max(0.2, cy - 1.6);
        api.addCylinder(x, 1.6 + hLen / 2, cz, 0.035, 0.035, hLen, "steel");
    }
});`
        },

        // ════════════════════════════════════════════════════════════════════
        // CATEGORY: LUXURY & REAL SCULPTURES
        // ════════════════════════════════════════════════════════════════════
        {
            id: 'diamondRing',
            category: 'sculptures',
            icon: '💍',
            name_en: 'Diamond Solitaire Ring',
            name_fr: 'Bague Solitaire Diamant',
            desc_en: '18K Gold band, 6-prong platinum crown & brilliant-cut crystal diamond.',
            desc_fr: 'Anneau en or 18K, serti 6 griffes platine et diamant taille brillant.',
            code: `// 💍 Luxury 18K Gold & Brilliant Diamond Solitaire Ring
api.clear();
const ringR  = api.param("Ring Radius", 2.8, 2.0, 4.0, 0.1);
const gemR   = api.param("Carat Size", 1.15, 0.6, 1.9, 0.05);
const prongs = api.param("Prongs", 6, 4, 8, 2);

// Sculpted 18K Gold Ring Band + Subtle Accent Bevels
api.addTorus(0, 0, 0, ringR, 0.34, 24, 60, "gold");
api.addTorus(0, 0, 0, ringR + 0.18, 0.10, 12, 48, "chrome");

// Platinum Setting Gallery Collar
const crownY = ringR + 0.45;
api.addTorus(0, crownY + 0.15, 0, gemR * 0.78, 0.10, 12, 32, { material: "chrome", rx: Math.PI / 2 });

// Sculpted Platinum Prongs Embracing the Diamond
for (let i = 0; i < prongs; i++) {
    const a = (i / prongs) * Math.PI * 2;
    const px = Math.cos(a) * gemR * 0.88;
    const pz = Math.sin(a) * gemR * 0.88;
    api.addCapsule(px, crownY + gemR * 0.38, pz, 0.085, gemR * 0.95, {
        material: "chrome",
        rx: -Math.sin(a) * 0.24,
        rz:  Math.cos(a) * 0.24
    });
    api.addSphere(px * 1.06, crownY + gemR * 0.88, pz * 1.06, 0.11, "chrome");
}

// Brilliant-Cut Crystal Diamond (Pavilion Cone + Crown Frustum)
api.addCylinder(0, crownY + gemR * 0.90, 0, gemR * 0.62, gemR * 1.02, gemR * 0.38, {
    material: "diamond"
});
api.addCone(0, crownY + gemR * 0.26, 0, gemR * 1.02, gemR * 0.92, {
    material: "diamond", rx: Math.PI
});

// Side Accent Pave Diamonds
[-0.75, 0.75].forEach(ang => {
    const sx = Math.sin(ang) * (ringR + 0.36);
    const sy = Math.cos(ang) * (ringR + 0.36);
    api.addSphere(sx, sy, 0, 0.18, "diamond");
});`
        },
        {
            id: 'royalChalice',
            category: 'sculptures',
            icon: '🏆',
            name_en: 'Royal Gold Chalice',
            name_fr: 'Calice Royal en Or',
            desc_en: 'Smooth-normal Lathe 18K gold goblet encrusted with ruby gemstones.',
            desc_fr: 'Calice tourné lisse en or 18K serti de rubis cristallins.',
            code: `// 🏆 Royal Gold Lathe Chalice with Ruby Gemstones
api.clear();
const segs   = api.param("Smoothness", 48, 16, 72, 4);
const jewels = api.param("Ruby Jewels", 8, 4, 14, 1);

// Precision Lathe Contour Profile (Smooth Indexed Normals!)
const profile = [
    [0.01, 0.0], [2.4, 0.0], [2.5, 0.28], [2.0, 0.55],
    [0.65, 1.15], [0.42, 2.2], [0.95, 2.8], [0.44, 3.4],
    [0.62, 4.2], [2.1, 5.2], [2.65, 6.6], [2.8, 7.6],
    [2.55, 7.7], [2.35, 6.5], [1.7, 5.1], [0.01, 4.4]
];
api.addLathe(profile, segs, { y: -3.2, material: "gold" });

// Platinum Decorative Collar & Ring of Ruby Gemstones
api.addTorus(0, 3.55, 0, 2.74, 0.12, 14, 48, { material: "chrome", rx: Math.PI / 2 });
api.radialArray(jewels, 2.68, () => {
    api.addSphere(0, 3.55, 0, 0.28, "ruby");
    api.addTorus(0, 3.55, 0, 0.30, 0.06, 10, 20, { material: "chrome", ry: Math.PI / 2 });
});`
        },
        {
            id: 'chessKing',
            category: 'sculptures',
            icon: '♛',
            name_en: 'Sculpted Chess King',
            name_fr: 'Roi d\'Échecs Sculpté',
            desc_en: 'Smooth obsidian & gold Staunton Chess King with beveled royal cross.',
            desc_fr: 'Roi d\'échecs Staunton lisse en obsidienne et or avec croix royale.',
            code: `// ♛ Sculpted Staunton Chess King (Obsidian & 18K Gold)
api.clear();
const scale = api.param("Scale", 1.1, 0.6, 1.8, 0.1);

const profile = [
    [0.01, 0.0], [2.2, 0.0], [2.3, 0.35], [1.95, 0.7],
    [1.75, 1.1], [1.25, 1.6], [0.92, 3.6], [0.78, 5.1],
    [1.35, 5.45], [0.88, 5.8], [1.18, 6.6], [1.45, 7.45],
    [0.95, 7.85], [0.01, 8.0]
];

api.pushTransform(0, -3.5 * scale, 0, 0, 0, 0, scale);
api.addLathe(profile, 48, { material: "obsidian" });
api.addTorus(0, 5.45, 0, 1.32, 0.11, 14, 40, { material: "gold", rx: Math.PI / 2 });
api.addTorus(0, 0.42, 0, 2.24, 0.10, 12, 44, { material: "gold", rx: Math.PI / 2 });

// Royal Beveled Gold Cross Finial
api.addRoundedBox(0, 8.75, 0, 0.36, 1.45, 0.36, 0.07, "gold");
api.addRoundedBox(0, 8.95, 0, 1.12, 0.34, 0.34, 0.07, "gold");
api.popTransform();`
        },
        {
            id: 'dnaHelix',
            category: 'sculptures',
            icon: '🧬',
            name_en: 'Volumetric 3D DNA Helix',
            name_fr: 'Hélice ADN 3D Volumétrique',
            desc_en: 'Solid tubular phosphate strands, colored base-pair bridges & glowing nodes.',
            desc_fr: 'Brins tubulaires solides, paires de bases colorées et nœuds lumineux.',
            code: `// 🧬 Volumetric 3D Molecular DNA Double Helix (Animated)
api.clear();
const pairs  = api.param("Base Pairs", 16, 8, 28, 1);
const radius = api.param("Helix Radius", 2.3, 1.4, 3.6, 0.1);
const height = api.param("Height", 11.0, 6.0, 16.0, 0.5);
const speed  = api.param("Spin Speed", 0.7, 0.0, 3.0, 0.1);

const turns = 1.8;
const spin = api.time * speed;
const strandA = [], strandB = [];

for (let i = 0; i <= 40; i++) {
    const u = i / 40;
    const a = u * Math.PI * 2 * turns + spin;
    const y = (u - 0.5) * height;
    strandA.push([Math.cos(a) * radius, y, Math.sin(a) * radius]);
    strandB.push([Math.cos(a + Math.PI) * radius, y, Math.sin(a + Math.PI) * radius]);
}

// Solid Smooth Tubular Backbones
api.addTube(strandA, 0.24, { material: "neon", segments: 64 });
api.addTube(strandB, 0.24, { material: "plasma", segments: 64 });

// Color-Coded Nucleotide Base-Pair Rungs
const pairColors = [["#38bdf8", "#fbbf24"], ["#34d399", "#f43f5e"]];
for (let i = 0; i < pairs; i++) {
    const u = (i + 0.5) / pairs;
    const a = u * Math.PI * 2 * turns + spin;
    const y = (u - 0.5) * height;
    const [c1, c2] = pairColors[i % 2];

    api.pushTransform(0, y, 0, 0, -a, 0, 1);
    api.addCylinder( radius * 0.48, 0, 0, 0.13, 0.13, radius * 0.92, { color: c1, rz: Math.PI / 2 });
    api.addCylinder(-radius * 0.48, 0, 0, 0.13, 0.13, radius * 0.92, { color: c2, rz: Math.PI / 2 });
    api.addSphere(0, 0, 0, 0.22, "gold");
    api.addSphere( radius, 0, 0, 0.34, "chrome");
    api.addSphere(-radius, 0, 0, 0.34, "chrome");
    api.popTransform();
}`
        },

        // ════════════════════════════════════════════════════════════════════
        // CATEGORY: SCI-FI, PHYSICS & INTERACTIVE
        // ════════════════════════════════════════════════════════════════════
        {
            id: 'starfighter',
            category: 'interactive',
            icon: '🚀',
            name_en: 'Cyber Starfighter Ship',
            name_fr: 'Chasseur Spatial Cyber',
            desc_en: 'Sculpted fuselage, swept delta wings, glass cockpit & twin ion engines.',
            desc_fr: 'Fuselage sculpté, ailes delta, verrière cristal et double propulsion ionique.',
            code: `// 🚀 Parametric Cyber Starfighter Spaceship
api.clear();
const wingSpan = api.param("Wingspan", 8.5, 5.5, 12.5, 0.5);
const hover    = api.param("Hover Pulse", 0.5, 0.0, 1.5, 0.1);

const bobY = Math.sin(api.time * 2.2) * hover;
const bank = Math.sin(api.time * 1.1) * 0.14;

api.pushTransform(0, bobY + 1.2, 0, 0, 0, bank, 1);

// Sculpted Nose Cone & Armored Fuselage
api.addCone(0, 0, 4.4, 0.95, 3.6, { material: "ceramic", rx: Math.PI / 2 });
api.addRoundedBox(0, 0, 0.6, 1.9, 1.15, 4.4, 0.22, "titanium");
api.addRoundedBox(0, 0.68, 1.2, 1.05, 0.68, 2.3, 0.24, "glass");

// Swept Delta Wings (Extruded Solid Airfoil)
const wingShape = [[0.8, 1.6], [wingSpan / 2, -1.8], [wingSpan / 2, -2.6], [0.8, -1.7]];
api.addExtrude(wingShape, 0.22, true, { material: "ceramic", rx: -Math.PI / 2, y: -0.05 });
const wingL = [[-0.8, 1.6], [-wingSpan / 2, -1.8], [-wingSpan / 2, -2.6], [-0.8, -1.7]];
api.addExtrude(wingL, 0.22, true, { material: "ceramic", rx: -Math.PI / 2, y: -0.05 });

// Twin Vertical Stabilizer Fins & Wingtip Laser Cannons
[-1.1, 1.1].forEach(sx => {
    api.addBox(sx, 0.85, -1.5, 0.12, 1.4, 1.5, { material: "copper", rz: sx * -0.25 });
    // Ion Engine Nacelle + Glowing Plasma Thruster
    api.addCylinder(sx * 0.85, -0.1, -1.6, 0.52, 0.62, 2.6, { material: "obsidian", rx: Math.PI / 2 });
    api.addCylinder(sx * 0.85, -0.1, -3.1, 0.42, 0.16, 1.1 + Math.sin(api.time * 12) * 0.15, {
        material: "neon", rx: Math.PI / 2
    });
});

[-wingSpan / 2, wingSpan / 2].forEach(wx => {
    api.addCylinder(wx, -0.05, -0.4, 0.10, 0.12, 3.4, { material: "chrome", rx: Math.PI / 2 });
    api.addSphere(wx, -0.05, 1.35, 0.14, "plasma");
});

api.popTransform();`
        },
        {
            id: 'solarOrrery',
            category: 'interactive',
            icon: '🪐',
            name_en: 'Animated Solar Orrery',
            name_fr: 'Planétarium Mécanique',
            desc_en: 'Brass clockwork rings, glowing sun, orbiting planets & Saturn ring system.',
            desc_fr: 'Anneaux d\'horlogerie en laiton, soleil lumineux, planètes et anneaux de Saturne.',
            code: `// 🪐 Animated Mechanical Solar System Orrery
api.clear();
const speed = api.param("Orbit Speed", 1.0, 0.0, 4.0, 0.1);
const t = api.time * speed;

// Pedestal & Radiant Golden Sun
api.addCylinder(0, -3.2, 0, 2.2, 2.8, 0.6, "obsidian");
api.addCylinder(0, -1.6, 0, 0.25, 0.35, 3.0, "gold");
api.addSphere(0, 0, 0, 1.45, { color: "#fbbf24", emissive: "#f97316", emissiveIntensity: 1.1 });
api.addLight("point", 0, 0, 0, "#fde68a", 1.8);

const planets = [
    { r: 2.7, size: 0.32, spd: 2.2, mat: "copper" },
    { r: 4.1, size: 0.48, spd: 1.4, mat: "sapphire", moon: true },
    { r: 5.8, size: 0.40, spd: 0.95, mat: "ruby" },
    { r: 7.9, size: 0.78, spd: 0.55, mat: "gold", rings: true },
];

planets.forEach((p, idx) => {
    // Brass Mechanical Orbit Track
    api.addTorus(0, 0, 0, p.r, 0.045, 10, 64, { material: "bronze", rx: Math.PI / 2 });
    const a = t * p.spd + idx * 1.6;
    const px = Math.cos(a) * p.r;
    const pz = Math.sin(a) * p.r;
    api.addSphere(px, 0, pz, p.size, p.mat);

    if (p.moon) {
        const ma = t * 4.5;
        api.addSphere(px + Math.cos(ma) * 0.95, 0.18, pz + Math.sin(ma) * 0.95, 0.14, "ceramic");
    }
    if (p.rings) {
        api.addTorus(px, 0, pz, p.size * 1.72, 0.14, 8, 40, { material: "bronze", rx: Math.PI / 2.4, ry: 0.3 });
    }
});`
        },
        {
            id: 'audioCity',
            category: 'interactive',
            icon: '🎵',
            name_en: '3D Audio Spectrum City',
            name_fr: 'Cité Spectrale Audio 3D',
            desc_en: 'Fixed 32-tower reactive equalizer city pulsing live to mic or synth beat.',
            desc_fr: '32 tours spectrales 3D réactives au micro ou au rythme synthétique (corrigé !).',
            code: `// 🎵 3D Audio Spectrum City (Real Solid PBR — Fixed z-arg & Zero Log Flood!)
api.clear();
api.initAudio();
const towers = api.param("Towers", 28, 12, 48, 2);
const radius = api.param("Ring Radius", 6.2, 3.5, 9.5, 0.2);

const freq = api.getAudioData();

// Central Bass Reactor Core + Studio Floor
const bass = freq ? (freq[1] + freq[2]) / 510 : 0.4;
api.addCylinder(0, -0.25, 0, radius + 1.6, radius + 1.9, 0.5, "obsidian");
api.addSphere(0, 1.8 + bass * 1.4, 0, 1.0 + bass * 0.75, {
    color: "#00f3ff", emissive: "#00f3ff", emissiveIntensity: 0.85, metalness: 0.3, roughness: 0.15
});
api.addTorus(0, 1.8 + bass * 1.4, 0, 1.9 + bass, 0.08, 12, 40, {
    material: "plasma", rx: api.time * 1.5, ry: api.time
});

// 3D Frequency Equalizer Skyscrapers with Glowing Caps
for (let i = 0; i < towers; i++) {
    const a = (i / towers) * Math.PI * 2;
    const bin = Math.floor((i / towers) * 44);
    const amp = freq ? freq[bin] / 255 : 0.3;
    const h = 0.6 + amp * 6.8;
    const x = Math.cos(a) * radius;
    const z = Math.sin(a) * radius;
    const hue = Math.round((i / towers) * 300 + 170) % 360;
    const col = "hsl(" + hue + ", 90%, 58%)";

    api.addBox(x, h / 2, z, 0.72, h, 0.72, {
        color: col, metalness: 0.65, roughness: 0.22, ry: -a
    });
    api.addSphere(x, h + 0.45, z, 0.28, {
        color: "#ffffff", emissive: col, emissiveIntensity: 0.95
    });
}`
        },
        {
            id: 'physicsArena',
            category: 'interactive',
            icon: '🎲',
            name_en: 'Physics Tumbling Arena',
            name_fr: 'Arène Physique 3D',
            desc_en: 'Real Cannon.js gravity with full quaternion tumbling solid blocks & spheres.',
            desc_fr: 'Gravité Cannon.js réelle avec rotation complète par quaternions des solides.',
            code: `// 🎲 Real 3D Physics Tumbling Arena (Full Quaternion Rotation!)
api.clear();
const count = api.param("Objects", 16, 6, 28, 2);

if (api.frame === 0) {
    if (api.initPhysics(-12)) {
        api.addPhysicalFloor(0);
        const mats = ["gold", "chrome", "copper", "emerald", "ruby", "sapphire"];
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 6;
            const y = 3.5 + i * 1.35;
            const z = (Math.random() - 0.5) * 6;
            const mat = mats[i % mats.length];
            if (i % 2 === 0) api.addPhysicalBox(x, y, z, 1.3, 1.3, 1.3, 1.2, mat);
            else api.addPhysicalSphere(x, y, z, 0.75, 1.0, mat);
        }
    }
}

api.stepPhysics(1 / 60);

// Visible Studio Floor Platform
api.addRoundedBox(0, -0.35, 0, 14, 0.7, 14, 0.12, "obsidian");
api.addTorus(0, 0.05, 0, 6.2, 0.12, 12, 48, { material: "neon", rx: Math.PI / 2 });

// Render All Physical Bodies with REAL Quaternion Tumbling!
const bodies = api.getPhysicalBodies();
for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    const opts = { material: b.color, qx: b.qx, qy: b.qy, qz: b.qz, qw: b.qw };
    if (b.type === "box") api.addBox(b.x, b.y, b.z, b.w, b.h, b.d, opts);
    else api.addSphere(b.x, b.y, b.z, b.r, opts);
}`
        },
        {
            id: 'modernVilla',
            category: 'architecture',
            icon: '🏡',
            name_en: 'Modern Minimalist Villa',
            name_fr: 'Villa Moderne Minimaliste',
            desc_en: 'Two-story cantilevered concrete & glass villa with glowing swimming pool.',
            desc_fr: 'Villa contemporaine à 2 niveaux en béton/verre avec piscine lumineuse.',
            code: `// 🏡 Parametric Modern Minimalist Villa with Pool
api.clear();
const width = api.param("Villa Width", 10, 7, 14, 0.5);
const poolGlow = api.param("Pool Glow", 1, 0, 1, 1);

// Landscape Ground & Illuminated Azure Pool
api.addBox(0, -0.25, 0, width + 6, 0.5, 12, "obsidian");
api.addBox(-1.2, 0.06, 3.4, width * 0.72, 0.14, 3.6, poolGlow ? "neon" : "glass");

// Ground Floor White Concrete Wing & Glass Lounge
api.addBox(-width * 0.12, 1.6, -1.6, width * 0.78, 3.2, 4.8, "ceramic");
api.addBox(-width * 0.12, 1.5, 0.85, width * 0.62, 2.5, 0.18, "glass");

// Cantilevered Upper Floor Suite + Wood Louver Pergola
api.addRoundedBox(width * 0.1, 4.4, -0.8, width * 0.84, 2.6, 5.4, 0.08, "marble");
api.addBox(width * 0.1, 4.35, 1.92, width * 0.68, 2.0, 0.18, "glass");
api.addBox(width * 0.1, 5.82, -0.8, width * 0.90, 0.26, 6.0, "obsidian");

// Architectural Steel Support Pillars & Warm Wood Accent Wall
api.addCylinder(-width * 0.35, 1.6, 1.6, 0.16, 0.16, 3.2, "chrome");
api.addCylinder( width * 0.38, 1.6, 1.6, 0.16, 0.16, 3.2, "chrome");
api.addBox(width * 0.42, 1.6, -1.6, 0.35, 3.1, 4.6, "wood");
api.addLight("point", 0, 3.5, 3.5, "#fef08a", 1.2);`
        },
        {
            id: 'sportsCar',
            category: 'interactive',
            icon: '🏎️',
            name_en: 'Cyber Sports Coupe',
            name_fr: 'Coupé Sport Cyber',
            desc_en: 'Aerodynamic wedge coupe with gold alloy rims, rear spoiler & LED headlights.',
            desc_fr: 'Coupé aérodynamique avec jantes or, aileron arrière et phares LED.',
            code: `// 🏎️ Parametric Cyber Sports Coupe (Solid PBR)
api.clear();
const bodyMat = api.addColorPicker("Paint Color", "#e11d48");
const spin    = api.param("Wheel Spin", 2.0, 0.0, 6.0, 0.2);

// Sleek Wedge Chassis & Cabin Canopy
api.addRoundedBox(0, 1.05, 0, 3.4, 0.85, 7.6, 0.22, { color: bodyMat, metalness: 0.75, roughness: 0.18 });
api.addRoundedBox(0, 1.78, -0.35, 2.65, 0.82, 3.6, 0.26, "glass");
api.addBox(0, 0.58, 0, 3.1, 0.26, 6.8, "obsidian");

// Rear Carbon Spoiler Wing
api.addBox(0, 1.98, -3.55, 3.4, 0.12, 0.72, { material: "obsidian", rx: 0.16 });
api.addBox(-1.15, 1.65, -3.45, 0.14, 0.65, 0.45, "chrome");
api.addBox( 1.15, 1.65, -3.45, 0.14, 0.65, 0.45, "chrome");

// LED Headlights & Tail Light Bar
api.addBox(-1.15, 1.12, 3.82, 0.72, 0.18, 0.12, "neon");
api.addBox( 1.15, 1.12, 3.82, 0.72, 0.18, 0.12, "neon");
api.addBox(0, 1.18, -3.82, 2.9, 0.16, 0.12, "plasma");

// 4 Rotating Rubber Tires + 18K Gold Alloy Rims
const wheels = [[-1.78, 0.78, 2.35], [1.78, 0.78, 2.35], [-1.82, 0.84, -2.35], [1.82, 0.84, -2.35]];
wheels.forEach(([wx, wy, wz]) => {
    api.pushTransform(wx, wy, wz, api.time * spin, 0, 0, 1);
    api.addCylinder(0, 0, 0, wy, wy, 0.68, { material: "obsidian", rz: Math.PI / 2 });
    api.addGear(wx > 0 ? 0.25 : -0.25, 0, 0, 10, wy * 0.68, 0.28, 0.16, { material: "gold", ry: Math.PI / 2 });
    api.popTransform();
});`
        },
        {
            id: 'sacredTorusSculpture',
            category: 'sculptures',
            icon: '✨',
            name_en: 'Volumetric Torus Knot',
            name_fr: 'Nœud Toroïdal Volumétrique',
            desc_en: 'Thick 3D-printable solid metallic torus knot tube with orbiting gem spheres.',
            desc_fr: 'Nœud toroïdal tubulaire solide imprimable 3D en métal chromé/or.',
            code: `// ✨ Volumetric Solid PBR Torus Knot Sculpture (3D-Printable!)
api.clear();
const P     = api.param("Loops P", 2, 1, 5, 1);
const Q     = api.param("Twists Q", 3, 2, 7, 1);
const thick = api.param("Tube Radius", 0.42, 0.15, 0.85, 0.05);

const pts = [];
const N = 120;
for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const r = 3.2 + Math.cos(Q * t) * 1.15;
    pts.push([r * Math.cos(P * t), Math.sin(Q * t) * 1.35, r * Math.sin(P * t)]);
}
api.addTube(pts, thick, { material: "gold", closed: true, segments: 160, radialSegments: 16 });
api.addTube(pts, thick * 0.45, { material: "neon", closed: true, segments: 120, y: 0.02, scale: 1.04 });

// Central Floating Emerald Crystal Core
api.addPyramid(0,  0.85, 0, 1.1, 1.7, 6, "emerald");
api.addPyramid(0, -0.85, 0, 1.1, 1.7, 6, { material: "emerald", rx: Math.PI });`
        },
        {
            id: 'htmlInteractiveDemo',
            category: 'interactive',
            icon: '🌐',
            name_en: 'HTML5 Live Canvas Mode',
            name_fr: 'Mode HTML5 Canvas Live',
            desc_en: 'Full sandboxed HTML5/CSS/JS live preview inside Scripting Studio.',
            desc_fr: 'Aperçu HTML5/CSS/JS interactif en direct dans Scripting Studio.',
            code: `<!DOCTYPE html>
<html lang="en">
<head>
<style>
  body { margin:0; background:#050816; overflow:hidden; display:flex; align-items:center; justify-content:center; height:100vh; font-family:system-ui,sans-serif; color:#fff; }
  canvas { position:fixed; inset:0; }
  .card { position:relative; z-index:2; padding:24px 34px; border-radius:18px; background:rgba(15,23,42,.75); backdrop-filter:blur(14px); border:1px solid rgba(56,189,248,.4); text-align:center; }
  h1 { margin:0 0 8px; font-size:1.5rem; background:linear-gradient(90deg,#38bdf8,#f472b6); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
</style>
</head>
<body>
<canvas id="c"></canvas>
<div class="card"><h1>HTML5 Live Sandbox</h1><p style="margin:0;color:#94a3b8">Edit HTML/CSS/JS and hit Run!</p></div>
<script>
  const c = document.getElementById('c'), ctx = c.getContext('2d');
  const resize = () => { c.width = innerWidth; c.height = innerHeight; };
  resize(); addEventListener('resize', resize);
  let t = 0;
  (function loop() {
    t += 0.02;
    ctx.fillStyle = 'rgba(5,8,22,0.16)'; ctx.fillRect(0,0,c.width,c.height);
    for (let i = 0; i < 40; i++) {
      const a = t + i * 0.25, r = 90 + Math.sin(t * 2 + i) * 60;
      ctx.fillStyle = 'hsl(' + ((i * 9 + t * 50) % 360) + ',90%,60%)';
      ctx.beginPath(); ctx.arc(c.width/2 + Math.cos(a)*r*2, c.height/2 + Math.sin(a*1.3)*r, 4, 0, Math.PI*2); ctx.fill();
    }
    requestAnimationFrame(loop);
  })();
<\/script>
</body>
</html>`
        },
    ];

    // ─── AI Code-to-3D Natural Prompt Synthesizer (EN / FR / RO!) ────────────
    function generateFromPrompt(promptText) {
        const q = String(promptText || '').toLowerCase().trim();

        // Extract optional numeric parameter hint from prompt (e.g. "24 floors", "18 teeth")
        const numMatch = q.match(/\b(\d{1,2})\b/);
        const userNum = numMatch ? parseInt(numMatch[1], 10) : null;

        // Detect preferred PBR material from prompt
        let mat = null;
        if (/gold|aur|or\b|dor/.test(q)) mat = 'gold';
        else if (/chrome|silver|argint|argent/.test(q)) mat = 'chrome';
        else if (/copper|cupr|bronze/.test(q)) mat = 'copper';
        else if (/emerald|green|verde|vert/.test(q)) mat = 'emerald';
        else if (/ruby|red|rosu|rouge/.test(q)) mat = 'ruby';
        else if (/sapphire|blue|albastru|bleu/.test(q)) mat = 'sapphire';
        else if (/glass|cristal|crystal|diam/.test(q)) mat = 'diamond';
        else if (/neon|cyber|glow/.test(q)) mat = 'neon';
        else if (/wood|lemn|bois/.test(q)) mat = 'wood';
        else if (/obsidian|black|negru|noir/.test(q)) mat = 'obsidian';

        const rules = [
            { kw: ['gear', 'box', 'roata', 'roti', 'engren', 'watch', 'ceas', 'clock', 'tourbillon', 'mecanic', 'vitez', 'planetair', 'planétair', 'boite', 'boîte', 'teeth', 'dents', 'dinti'], id: 'planetaryGearbox' },
            { kw: ['turbine', 'jet', 'avion', 'engine', 'motor', 'propeller', 'fan'], id: 'jetTurbine' },
            { kw: ['bearing', 'rulment', 'roulement', 'ball'], id: 'ballBearing' },
            { kw: ['tower', 'skyscraper', 'turn', 'zgari', 'bloc', 'gratte', 'building', 'city'], id: 'twistedTower' },
            { kw: ['stair', 'scara', 'escalier', 'spiral'], id: 'spiralStaircase' },
            { kw: ['pavilion', 'temple', 'dome', 'arch', 'cupola', 'palace', 'rotunda'], id: 'classicalPavilion' },
            { kw: ['bridge', 'pod', 'pont', 'cable'], id: 'suspensionBridge' },
            { kw: ['villa', 'house', 'casa', 'maison', 'pool', 'piscin', 'home'], id: 'modernVilla' },
            { kw: ['ring', 'inel', 'bague', 'diamond', 'diamant', 'jewelry', 'bijou'], id: 'diamondRing' },
            { kw: ['chalice', 'cup', 'calice', 'trophy', 'trofeu', 'goblet', 'vase', 'pahar'], id: 'royalChalice' },
            { kw: ['chess', 'sah', 'king', 'rege', 'roi', 'echec'], id: 'chessKing' },
            { kw: ['dna', 'adn', 'helix', 'gene', 'molecul'], id: 'dnaHelix' },
            { kw: ['ship', 'nava', 'vaisseau', 'space', 'rocket', 'rachet', 'starfighter', 'plane'], id: 'starfighter' },
            { kw: ['car', 'masina', 'voiture', 'coupe', 'ferrari', 'lamborghini', 'auto', 'sport'], id: 'sportsCar' },
            { kw: ['solar', 'planet', 'orrery', 'saturn', 'sun', 'soare', 'cosmos'], id: 'solarOrrery' },
            { kw: ['audio', 'music', 'sound', 'beat', 'equalizer', 'spectrum'], id: 'audioCity' },
            { kw: ['physics', 'gravity', 'fall', 'domino', 'bounce', 'fizica'], id: 'physicsArena' },
            { kw: ['knot', 'torus', 'sculpt', 'crystal', 'art', 'abstract'], id: 'sacredTorusSculpture' },
        ];

        const hit = rules.find(r => r.kw.some(k => q.includes(k)));
        const tpl = TEMPLATES.find(t => t.id === (hit ? hit.id : 'twistedTower')) || TEMPLATES[0];
        let code = `// ✨ AI Code-to-3D Generated for: "${promptText || tpl.name_en}"\n` + tpl.code;

        // Customize material & numeric parameter cleanly if user requested them!
        if (mat && !tpl.code.startsWith('<!DOCTYPE')) {
            code = code.replace(/"(gold|chrome|titanium|ceramic|obsidian)"/g, (m, orig) => orig === 'obsidian' ? m : `"${mat}"`);
        }
        if (userNum !== null && userNum >= 4 && userNum <= 40) {
            code = code.replace(/api\.param\(([^,]+),\s*(\d+),/, `api.param($1, ${userNum},`);
        }
        return { template: tpl, code };
    }

    function getAll() { return TEMPLATES; }
    function getById(id) { return TEMPLATES.find(t => t.id === id) || TEMPLATES[0]; }
    function getCategories() { return ['all', 'mechanical', 'architecture', 'sculptures', 'interactive']; }

    return { TEMPLATES, getAll, getById, getCategories, generateFromPrompt };
})();

if (typeof window !== 'undefined') window.ScriptingTemplates = ScriptingTemplates;
if (typeof module !== 'undefined' && module.exports) module.exports = ScriptingTemplates;
