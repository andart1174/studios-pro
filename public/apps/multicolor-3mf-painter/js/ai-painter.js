// ==========================================
// AI SMART AUTO-PAINTER & ANATOMY SEGMENTER
// ==========================================

const AI_THEMES_CATALOG = [
    {
        id: 'cyberpunk',
        name: 'Cyberpunk Neon',
        nameFr: 'Cyberpunk Néon',
        badge: 'SCI-FI',
        style: 'anatomy',
        colors: [
            { hex: '#111827', name: 'Carbon Matte' },
            { hex: '#00E5FF', name: 'Cyber Cyan' },
            { hex: '#FF1E8A', name: 'Hot Magenta' },
            { hex: '#E5E7EB', name: 'Chrome Silk' },
            { hex: '#7C3AED', name: 'Plasma Violet' },
            { hex: '#FACC15', name: 'Hazard Yellow' }
        ]
    },
    {
        id: 'dragon',
        name: 'Volcanic Dragon',
        nameFr: 'Dragon Volcanique',
        badge: 'FANTASY',
        style: 'anatomy',
        colors: [
            { hex: '#1F242D', name: 'Obsidian Slate' },
            { hex: '#DC2626', name: 'Crimson Scale' },
            { hex: '#F97316', name: 'Molten Ember' },
            { hex: '#FBBF24', name: 'Dragon Gold' },
            { hex: '#F3F4F6', name: 'Bone Ivory' },
            { hex: '#4B5563', name: 'Basalt Ash' }
        ]
    },
    {
        id: 'royal',
        name: 'Royal Paladin',
        nameFr: 'Paladin Royal',
        badge: 'HERO',
        style: 'anatomy',
        colors: [
            { hex: '#1E3A8A', name: 'Cobalt Armor' },
            { hex: '#F8FAFC', name: 'Pearl White' },
            { hex: '#EAB308', name: 'Imperial Gold' },
            { hex: '#991B1B', name: 'Velvet Cape' },
            { hex: '#64748B', name: 'Steel Silver' },
            { hex: '#111827', name: 'Shadow Black' }
        ]
    },
    {
        id: 'arctic',
        name: 'Arctic Spirit',
        nameFr: 'Esprit Polaire',
        badge: 'ICE',
        style: 'anatomy',
        colors: [
            { hex: '#0F172A', name: 'Abyss Navy' },
            { hex: '#38BDF8', name: 'Glacier Blue' },
            { hex: '#F8FAFC', name: 'Snow White' },
            { hex: '#2DD4BF', name: 'Aurora Teal' },
            { hex: '#94A3B8', name: 'Frost Grey' },
            { hex: '#1D4ED8', name: 'Cryo Sapphire' }
        ]
    },
    {
        id: 'sakura',
        name: 'Sakura Shrine',
        nameFr: 'Temple Sakura',
        badge: 'ZEN',
        style: 'anatomy',
        colors: [
            { hex: '#3E2723', name: 'Cedar Bark' },
            { hex: '#F472B6', name: 'Sakura Pink' },
            { hex: '#FDF2F8', name: 'Blossom Silk' },
            { hex: '#10B981', name: 'Bamboo Jade' },
            { hex: '#F59E0B', name: 'Temple Gold' },
            { hex: '#1F2937', name: 'Sumi Ink' }
        ]
    },
    {
        id: 'forest',
        name: 'Enchanted Forest',
        nameFr: 'Forêt Enchantée',
        badge: 'NATURE',
        style: 'camouflage',
        colors: [
            { hex: '#452B1B', name: 'Oak Bark' },
            { hex: '#15803D', name: 'Deep Moss' },
            { hex: '#84CC16', name: 'Spring Leaf' },
            { hex: '#FEF3C7', name: 'Mushroom Cream' },
            { hex: '#0D9488', name: 'Fern Teal' },
            { hex: '#57534E', name: 'Forest Stone' }
        ]
    },
    {
        id: 'retro',
        name: 'Retro 80s Arcade',
        nameFr: 'Arcade Rétro 80s',
        badge: 'SYNTH',
        style: 'gradient',
        colors: [
            { hex: '#1E1B4B', name: 'Midnight Synth' },
            { hex: '#EC4899', name: 'Synth Pink' },
            { hex: '#FB923C', name: 'Sunset Orange' },
            { hex: '#FACC15', name: 'Laser Yellow' },
            { hex: '#22D3EE', name: 'CRT Cyan' },
            { hex: '#F1F5F9', name: 'Arcade White' }
        ]
    },
    {
        id: 'pastel',
        name: 'Kawaii Pastel',
        nameFr: 'Pastel Kawaii',
        badge: 'CUTE',
        style: 'anatomy',
        colors: [
            { hex: '#FFFFFF', name: 'Milk White' },
            { hex: '#F9A8D4', name: 'Cotton Pink' },
            { hex: '#93C5FD', name: 'Sky Baby' },
            { hex: '#A7F3D0', name: 'Mint Macaron' },
            { hex: '#FDE68A', name: 'Butter Lemon' },
            { hex: '#DDD6FE', name: 'Soft Lavender' }
        ]
    },
    {
        id: 'stealth',
        name: 'Tactical Stealth',
        nameFr: 'Tactique Furtif',
        badge: 'MECH',
        style: 'anatomy',
        colors: [
            { hex: '#141414', name: 'Carbon PA-CF' },
            { hex: '#374151', name: 'Gunmetal Grey' },
            { hex: '#4D7C0F', name: 'Olive Drab' },
            { hex: '#EA580C', name: 'Hazard Orange' },
            { hex: '#D6D3D1', name: 'Desert Sand' },
            { hex: '#E5E7EB', name: 'Marker White' }
        ]
    },
    {
        id: 'ocean',
        name: 'Abyssal Coral',
        nameFr: 'Récif Abyssal',
        badge: 'MARINE',
        style: 'anatomy',
        colors: [
            { hex: '#0C4A6E', name: 'Trench Blue' },
            { hex: '#2DD4BF', name: 'Lagoon Teal' },
            { hex: '#FB7185', name: 'Living Coral' },
            { hex: '#F8FAFC', name: 'Shell Pearl' },
            { hex: '#F59E0B', name: 'Clownfish Gold' },
            { hex: '#065F46', name: 'Kelp Green' }
        ]
    },
    {
        id: 'steampunk',
        name: 'Brass Clockwork',
        nameFr: 'Horlogerie Cuivre',
        badge: 'BRASS',
        style: 'cel',
        colors: [
            { hex: '#1C1917', name: 'Cast Iron' },
            { hex: '#D97706', name: 'Polished Brass' },
            { hex: '#9A3412', name: 'Aged Copper' },
            { hex: '#0F766E', name: 'Patina Verdigris' },
            { hex: '#FEF3C7', name: 'Ivory Gauge' },
            { hex: '#78350F', name: 'Leather Umber' }
        ]
    },
    {
        id: 'halloween',
        name: 'Midnight Pumpkin',
        nameFr: 'Citrouille Minuit',
        badge: 'SPOOKY',
        style: 'anatomy',
        colors: [
            { hex: '#18181B', name: 'Bat Black' },
            { hex: '#EA580C', name: 'Pumpkin Glow' },
            { hex: '#65A30D', name: 'Toxic Slime' },
            { hex: '#7E22CE', name: 'Witch Violet' },
            { hex: '#F4F4F5', name: 'Ghost Bone' },
            { hex: '#FACC15', name: 'Candle Yellow' }
        ]
    }
];

let selectedAIThemeId = AI_THEMES_CATALOG[0].id;
let selectedAIStyle = 'anatomy';

function openAutoPaintAIModal() {
    const modal = document.getElementById('auto-paint-ai-modal');
    if (!modal) return;
    renderAIThemesGrid();
    analyzeModelAnatomy();
    modal.classList.add('open');
    if (typeof refreshIcons === 'function') refreshIcons();
}

function closeAutoPaintAIModal() {
    const modal = document.getElementById('auto-paint-ai-modal');
    if (modal) modal.classList.remove('open');
}

function renderAIThemesGrid() {
    const container = document.getElementById('ai-themes-grid');
    if (!container) return;

    const isFr = (typeof currentLang !== 'undefined' && currentLang === 'fr');
    container.innerHTML = AI_THEMES_CATALOG.map((theme) => {
        const active = theme.id === selectedAIThemeId ? 'active' : '';
        const title = isFr ? (theme.nameFr || theme.name) : theme.name;
        const swatches = theme.colors.slice(0, 6).map((c) =>
            `<span class="ai-swatch-circle" style="background:${c.hex};" title="${c.name}"></span>`
        ).join('');
        return `
            <div class="ai-theme-card ${active}" onclick="selectAndPreviewAITheme('${theme.id}')">
                <div class="ai-theme-card-header">
                    <span class="ai-theme-card-title">${title}</span>
                    <span class="ai-theme-card-tag">${theme.badge}</span>
                </div>
                <div class="ai-theme-card-swatches">${swatches}</div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.ai-style-chip').forEach((chip) => {
        chip.classList.toggle('active', chip.dataset.style === selectedAIStyle);
    });
}

function selectAndPreviewAITheme(themeId) {
    selectedAIThemeId = themeId;
    const theme = AI_THEMES_CATALOG.find(t => t.id === themeId);
    if (theme && theme.style) {
        selectedAIStyle = theme.style;
    }
    renderAIThemesGrid();
}

function selectAIStyleChip(styleName) {
    selectedAIStyle = styleName || 'anatomy';
    document.querySelectorAll('.ai-style-chip').forEach((chip) => {
        chip.classList.toggle('active', chip.dataset.style === selectedAIStyle);
    });
}

/**
 * Segment mesh triangles into coherent smooth regions bounded by dihedral creases
 * or disconnected mesh islands, then classify regions semantically for smart coloring.
 */
function segmentMeshRegions() {
    if (!currentMesh || !currentMesh.geometry) return null;
    const geom = currentMesh.geometry;
    const posAttr = geom.attributes.position;
    if (!posAttr) return null;

    const triCount = Math.floor(posAttr.count / 3);
    if (!meshTopology || meshTopology.faceCount !== triCount) {
        if (typeof buildMeshTopology === 'function') meshTopology = buildMeshTopology(geom);
    }
    const bbox = geom.boundingBox || (geom.computeBoundingBox(), geom.boundingBox);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const center = new THREE.Vector3();
    bbox.getCenter(center);

    const creaseDotThreshold = 0.85; // ~31.8 degrees
    const regionOfTri = new Int32Array(triCount);
    regionOfTri.fill(-1);

    const triNormals = new Float32Array(triCount * 3);
    const triCentroids = new Float32Array(triCount * 3);
    const triAreas = new Float32Array(triCount);
    const maxEdgeAngle = new Float32Array(triCount);

    const pA = new THREE.Vector3(), pB = new THREE.Vector3(), pC = new THREE.Vector3();
    const ab = new THREE.Vector3(), ac = new THREE.Vector3(), nVec = new THREE.Vector3();

    let totalSurfaceArea = 0;
    for (let t = 0; t < triCount; t++) {
        const i3 = t * 3;
        pA.fromBufferAttribute(posAttr, i3);
        pB.fromBufferAttribute(posAttr, i3 + 1);
        pC.fromBufferAttribute(posAttr, i3 + 2);
        ab.subVectors(pB, pA);
        ac.subVectors(pC, pA);
        nVec.crossVectors(ab, ac);
        const doubleArea = nVec.length();
        const area = 0.5 * doubleArea;
        triAreas[t] = area;
        totalSurfaceArea += area;
        if (doubleArea > 1e-10) nVec.divideScalar(doubleArea);
        else nVec.set(0, 1, 0);

        triNormals[i3] = nVec.x;
        triNormals[i3 + 1] = nVec.y;
        triNormals[i3 + 2] = nVec.z;

        triCentroids[i3] = (pA.x + pB.x + pC.x) / 3;
        triCentroids[i3 + 1] = (pA.y + pB.y + pC.y) / 3;
        triCentroids[i3 + 2] = (pA.z + pB.z + pC.z) / 3;
    }

    const adj = meshTopology ? (meshTopology.faceNeighbors || meshTopology.adj) : null;
    if (adj) {
        for (let t = 0; t < triCount; t++) {
            const nx = triNormals[t * 3], ny = triNormals[t * 3 + 1], nz = triNormals[t * 3 + 2];
            let worst = 1.0;
            const nbrs = adj[t];
            for (let k = 0; k < nbrs.length; k++) {
                const nb = nbrs[k];
                const dot = nx * triNormals[nb * 3] + ny * triNormals[nb * 3 + 1] + nz * triNormals[nb * 3 + 2];
                if (dot < worst) worst = dot;
            }
            maxEdgeAngle[t] = 1.0 - Math.max(-1, Math.min(1, worst));
        }
    }

    const regions = [];
    const queue = new Int32Array(triCount);

    for (let startT = 0; startT < triCount; startT++) {
        if (regionOfTri[startT] !== -1) continue;
        const regId = regions.length;
        let head = 0, tail = 0;
        queue[tail++] = startT;
        regionOfTri[startT] = regId;

        const tris = [];
        let areaSum = 0;
        let cx = 0, cy = 0, cz = 0;
        let nx = 0, ny = 0, nz = 0;
        let minY = Infinity, maxY = -Infinity;
        let creaseFaces = 0;

        while (head < tail) {
            const t = queue[head++];
            tris.push(t);
            const w = Math.max(triAreas[t], 1e-6);
            areaSum += triAreas[t];
            const i3 = t * 3;
            cx += triCentroids[i3] * w;
            cy += triCentroids[i3 + 1] * w;
            cz += triCentroids[i3 + 2] * w;
            nx += triNormals[i3] * w;
            ny += triNormals[i3 + 1] * w;
            nz += triNormals[i3 + 2] * w;
            if (triCentroids[i3 + 1] < minY) minY = triCentroids[i3 + 1];
            if (triCentroids[i3 + 1] > maxY) maxY = triCentroids[i3 + 1];
            if (maxEdgeAngle[t] > 0.25) creaseFaces++;

            if (adj) {
                const nbrs = adj[t];
                const tnx = triNormals[i3], tny = triNormals[i3 + 1], tnz = triNormals[i3 + 2];
                for (let k = 0; k < nbrs.length; k++) {
                    const nb = nbrs[k];
                    if (regionOfTri[nb] !== -1) continue;
                    const dot = tnx * triNormals[nb * 3] + tny * triNormals[nb * 3 + 1] + tnz * triNormals[nb * 3 + 2];
                    if (dot >= creaseDotThreshold) {
                        regionOfTri[nb] = regId;
                        queue[tail++] = nb;
                    }
                }
            }
        }

        const invW = areaSum > 1e-8 ? 1 / areaSum : 1 / Math.max(1, tris.length);
        const meanCx = cx * invW;
        const meanCy = cy * invW;
        const meanCz = cz * invW;
        const nLen = Math.hypot(nx, ny, nz) || 1;
        const relY = size.y > 1e-5 ? (meanCy - bbox.min.y) / size.y : 0.5;
        const relZ = size.z > 1e-5 ? (meanCz - bbox.min.z) / size.z : 0.5;
        const radial = Math.hypot(meanCx - center.x, meanCz - center.z);
        const maxXZ = Math.max(size.x, size.z, 1e-4) * 0.5;

        regions.push({
            id: regId,
            tris,
            area: areaSum,
            areaFraction: totalSurfaceArea > 1e-8 ? areaSum / totalSurfaceArea : tris.length / Math.max(1, triCount),
            centroid: new THREE.Vector3(meanCx, meanCy, meanCz),
            normal: new THREE.Vector3(nx / nLen, ny / nLen, nz / nLen),
            relY,
            relZ,
            radialRatio: radial / maxXZ,
            minY,
            maxY,
            creaseRatio: creaseFaces / Math.max(1, tris.length),
            role: 'body'
        });
    }

    // Sort descending by area so dominant region is easy to identify
    const sorted = [...regions].sort((a, b) => b.area - a.area);
    const largestRegId = sorted.length > 0 ? sorted[0].id : 0;

    for (let i = 0; i < regions.length; i++) {
        const reg = regions[i];
        if (reg.id === largestRegId && reg.areaFraction > 0.18) {
            reg.role = 'body';
        } else if (reg.relY < 0.16 && (reg.normal.y < -0.25 || reg.areaFraction > 0.04)) {
            reg.role = 'base';
        } else if (reg.relY > 0.72 || (reg.relY > 0.58 && reg.radialRatio > 0.52 && reg.areaFraction < 0.12)) {
            reg.role = 'crown';
        } else if (reg.areaFraction < 0.055 && (reg.relZ > 0.55 || reg.radialRatio > 0.55 || reg.creaseRatio > 0.45)) {
            reg.role = 'accent';
        } else if (reg.creaseRatio > 0.6 || (reg.relY >= 0.36 && reg.relY <= 0.54 && reg.areaFraction < 0.15)) {
            reg.role = 'trim';
        } else if (reg.relY < 0.3) {
            reg.role = 'base';
        } else {
            reg.role = 'body';
        }
    }

    return {
        triCount,
        bbox,
        size,
        center,
        regions,
        regionOfTri,
        triNormals,
        triCentroids,
        maxEdgeAngle
    };
}

function analyzeModelAnatomy() {
    const infoEl = document.getElementById('ai-anatomy-info');
    if (!currentMesh || !currentMesh.geometry) {
        if (infoEl) infoEl.textContent = t('aiNoModel', 'Load a 3D model first.');
        return null;
    }

    const seg = segmentMeshRegions();
    if (!seg) return null;

    let sharpCount = 0;
    for (let t = 0; t < seg.triCount; t++) {
        if (seg.maxEdgeAngle[t] > 0.3) sharpCount++;
    }
    const sharpPct = Math.round((sharpCount / Math.max(1, seg.triCount)) * 100);
    const regCount = seg.regions.length;
    const isMechanical = regCount > 24 || sharpPct > 28;
    const isFr = (typeof currentLang !== 'undefined' && currentLang === 'fr');

    if (infoEl) {
        infoEl.innerHTML = isFr
            ? `<strong>Analyse Géométrique :</strong> ${regCount} régions détectées • ${sharpPct}% arêtes nettes (${isMechanical ? 'Mécanique / Low-Poly' : 'Organique / Sculpté'})`
            : `<strong>Geometry Analysis:</strong> ${regCount} smooth regions • ${sharpPct}% crisp creases (${isMechanical ? 'Mechanical / Faceted' : 'Organic / Sculpted'})`;
    }
    return seg;
}

function applyAIStyle(themeId, explicitStyle) {
    const theme = AI_THEMES_CATALOG.find(item => item.id === (themeId || selectedAIThemeId)) || AI_THEMES_CATALOG[0];
    const style = explicitStyle || selectedAIStyle || theme.style || 'anatomy';
    selectedAIThemeId = theme.id;
    selectedAIStyle = style;
    applyAIPaletteAndPaint(theme, style);
    closeAutoPaintAIModal();
}

function applyAIRandomStyle() {
    const pick = AI_THEMES_CATALOG[Math.floor(Math.random() * AI_THEMES_CATALOG.length)];
    const styles = ['anatomy', 'cel', 'gradient', 'camouflage', 'duotone'];
    const style = styles[Math.floor(Math.random() * styles.length)];
    selectedAIThemeId = pick.id;
    selectedAIStyle = style;
    applyAIPaletteAndPaint(pick, style);
    closeAutoPaintAIModal();
}

function parsePromptToTheme(promptText) {
    const text = (promptText || '').toLowerCase().trim();
    const colorKeywords = [
        { keys: ['black', 'noir', 'obsidian', 'carbon', 'dark', 'sombre', 'shadow'], hex: '#14171F', name: 'Obsidian' },
        { keys: ['white', 'blanc', 'snow', 'neige', 'ivory', 'ivoire', 'pearl', 'perle'], hex: '#F8FAFC', name: 'Pearl White' },
        { keys: ['red', 'rouge', 'crimson', 'blood', 'ruby', 'lava', 'feu', 'fire', 'iron'], hex: '#DC2626', name: 'Crimson Red' },
        { keys: ['blue', 'bleu', 'cobalt', 'ocean', 'sea', 'mer', 'sky', 'ciel', 'ice', 'glace'], hex: '#2563EB', name: 'Cobalt Blue' },
        { keys: ['cyan', 'turquoise', 'neon', 'néon', 'cyber', 'laser', 'aqua'], hex: '#00E5FF', name: 'Cyber Cyan' },
        { keys: ['green', 'vert', 'emerald', 'forest', 'forêt', 'moss', 'mousse', 'lime', 'toxic', 'jade'], hex: '#16A34A', name: 'Emerald Green' },
        { keys: ['gold', 'or', 'doré', 'brass', 'laiton', 'yellow', 'jaune', 'sun', 'soleil', 'pikachu'], hex: '#FACC15', name: 'Imperial Gold' },
        { keys: ['orange', 'amber', 'ambre', 'ember', 'braise', 'pumpkin', 'citrouille', 'copper', 'cuivre'], hex: '#F97316', name: 'Molten Orange' },
        { keys: ['purple', 'violet', 'magenta', 'pink', 'rose', 'sakura', 'fuchsia', 'witch'], hex: '#EC4899', name: 'Neon Magenta' },
        { keys: ['silver', 'argent', 'grey', 'gray', 'gris', 'steel', 'acier', 'titanium', 'chrome'], hex: '#94A3B8', name: 'Titanium Silver' },
        { keys: ['brown', 'marron', 'wood', 'bois', 'bark', 'écorce', 'bronze', 'leather', 'cuir'], hex: '#78350F', name: 'Umber Wood' }
    ];

    // Check style keywords
    let style = selectedAIStyle || 'anatomy';
    if (/(gradient|degrade|dégradé|rainbow|strata|layer|couche)/.test(text)) style = 'gradient';
    else if (/(camo|camouflage|organic|organique|marbled|marbr)/.test(text)) style = 'camouflage';
    else if (/(cel|comic|cartoon|toon|ink|anime|outline)/.test(text)) style = 'cel';
    else if (/(duo|bicol|contrast|mono|2-color)/.test(text)) style = 'duotone';
    else if (/(smart|anatomy|anatom|real|pro)/.test(text)) style = 'anatomy';

    // Direct match to curated catalog themes first
    const catalogHints = [
        { id: 'cyberpunk', rx: /(cyber|neon|néon|sci-?fi|tron|mecha|synth|futur)/ },
        { id: 'dragon', rx: /(dragon|volcan|lava|lave|feu|fire|inferno|charizard)/ },
        { id: 'arctic', rx: /(arctic|polaire|glace|ice|snow|neige|frost|frozen)/ },
        { id: 'sakura', rx: /(sakura|japan|japon|zen|temple|blossom|fleur)/ },
        { id: 'forest', rx: /(forest|forêt|elf|nature|tree|arbre|wood|bois|jungle)/ },
        { id: 'royal', rx: /(royal|king|roi|paladin|knight|chevalier|hero|captain)/ },
        { id: 'pastel', rx: /(pastel|kawaii|cute|mignon|candy|bonbon|unicorn)/ },
        { id: 'stealth', rx: /(stealth|furtif|tactical|tactique|military|army|batman)/ },
        { id: 'ocean', rx: /(ocean|océan|coral|corail|shark|requin|fish|poisson|marine)/ },
        { id: 'steampunk', rx: /(steampunk|brass|laiton|clock|horloge|copper|cuivre|vintage)/ },
        { id: 'halloween', rx: /(halloween|spooky|pumpkin|citrouille|ghost|fantôme|witch)/ }
    ];

    let matchedTheme = null;
    for (const hint of catalogHints) {
        if (hint.rx.test(text)) {
            matchedTheme = AI_THEMES_CATALOG.find(item => item.id === hint.id);
            break;
        }
    }

    const explicitColors = [];
    for (const ck of colorKeywords) {
        if (ck.keys.some(k => text.includes(k))) {
            if (!explicitColors.some(e => e.hex === ck.hex)) {
                explicitColors.push({ hex: ck.hex, name: ck.name });
            }
        }
    }

    if (explicitColors.length >= 2) {
        const padded = [...explicitColors];
        if (!padded.some(c => c.hex === '#14171F' || c.hex === '#111827')) {
            padded.push({ hex: '#14171F', name: 'Deep Contrast' });
        }
        if (padded.length < 4) {
            padded.push({ hex: '#F8FAFC', name: 'Highlight White' });
        }
        return {
            theme: {
                id: 'custom-prompt',
                name: promptText.slice(0, 28) || 'AI Custom',
                colors: padded.slice(0, 8)
            },
            style
        };
    }

    if (matchedTheme) {
        return { theme: matchedTheme, style };
    }

    // Fallback: seed deterministic colors from prompt hash if unknown text
    let hash = 0;
    for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    const picked = AI_THEMES_CATALOG[Math.abs(hash) % AI_THEMES_CATALOG.length];
    return { theme: picked, style };
}

function executeAIPromptPaint() {
    const input = document.getElementById('ai-prompt-input');
    const promptVal = input ? input.value.trim() : '';
    if (!promptVal) {
        applyAIRandomStyle();
        return;
    }
    const { theme, style } = parsePromptToTheme(promptVal);
    applyAIPaletteAndPaint(theme, style);
    closeAutoPaintAIModal();
}

/**
 * Core AI painting engine: updates palette slots, assigns coherent multi-color slots
 * using geometry segmentation, saves undo history once, and refreshes GPU buffers.
 */
function applyAIPaletteAndPaint(theme, styleMode) {
    if (!currentMesh || !currentMesh.geometry || !triangleColors) {
        showToast(t('aiNoModel', 'Load a 3D model first.'));
        return;
    }
    if (!theme || !Array.isArray(theme.colors) || theme.colors.length === 0) return;

    const respectCurrentSlots = !!document.getElementById('ai-respect-slot-count')?.checked;
    // Update filamentSlots cleanly while optionally locking to user's existing AMS slot count
    const targetCount = respectCurrentSlots
        ? Math.max(2, filamentSlots.length)
        : Math.min(16, Math.max(filamentSlots.length, theme.colors.length, 4));
    while (filamentSlots.length < targetCount) {
        const src = theme.colors[filamentSlots.length % theme.colors.length];
        filamentSlots.push({
            id: filamentSlots.length + 1,
            color: src.hex,
            hex: src.hex,
            name: src.name,
            type: 'PLA Basic',
            visible: true
        });
    }
    for (let i = 0; i < theme.colors.length && i < filamentSlots.length; i++) {
        filamentSlots[i].id = i + 1;
        filamentSlots[i].color = theme.colors[i].hex;
        filamentSlots[i].hex = theme.colors[i].hex;
        filamentSlots[i].name = theme.colors[i].name;
        filamentSlots[i].type = filamentSlots[i].type || 'PLA Basic';
        filamentSlots[i].visible = true;
    }
    if (typeof refreshSlotRgbFloats === 'function') refreshSlotRgbFloats();
    if (typeof renderFilamentGrid === 'function') renderFilamentGrid();

    const seg = segmentMeshRegions();
    if (!seg) return;

    const paletteLen = Math.min(filamentSlots.length, theme.colors.length);
    const bodySlot = 0;
    const primarySlot = Math.min(1, paletteLen - 1);
    const secondarySlot = Math.min(2, paletteLen - 1);
    const accentSlot = Math.min(3, paletteLen - 1);
    const trimSlot = Math.min(4, paletteLen - 1);
    const baseSlot = Math.min(5, paletteLen - 1);

    const triCount = seg.triCount;
    const minY = seg.bbox.min.y;
    const heightY = Math.max(seg.size.y, 1e-4);

    if (styleMode === 'gradient') {
        const bands = Math.max(2, paletteLen);
        for (let t = 0; t < triCount; t++) {
            const cy = seg.triCentroids[t * 3 + 1];
            const rel = Math.max(0, Math.min(0.9999, (cy - minY) / heightY));
            triangleColors[t] = Math.min(paletteLen - 1, Math.floor(rel * bands));
        }
    } else if (styleMode === 'duotone') {
        for (let t = 0; t < triCount; t++) {
            const ny = seg.triNormals[t * 3 + 1];
            const crease = seg.maxEdgeAngle[t];
            if (ny > 0.28 || crease > 0.42) {
                triangleColors[t] = primarySlot;
            } else {
                triangleColors[t] = bodySlot;
            }
        }
    } else if (styleMode === 'camouflage') {
        // Large print-friendly organic blobs (smooth Voronoi-like centers, no confetti)
        const scale = 6.5 / Math.max(seg.size.x, seg.size.y, seg.size.z, 1);
        for (let t = 0; t < triCount; t++) {
            const cx = seg.triCentroids[t * 3] * scale;
            const cy = seg.triCentroids[t * 3 + 1] * scale;
            const cz = seg.triCentroids[t * 3 + 2] * scale;
            const val = Math.sin(cx + Math.cos(cy * 1.3))
                      + Math.cos(cy * 0.9 - Math.sin(cz * 1.1))
                      + Math.sin(cz + cx * 0.7);
            const norm = Math.max(0, Math.min(0.999, (val + 3) / 6));
            triangleColors[t] = Math.min(paletteLen - 1, Math.floor(norm * paletteLen));
        }
    } else if (styleMode === 'cel') {
        // Paint smooth regions cleanly, then outline sharp creases with darkest slot
        for (let r = 0; r < seg.regions.length; r++) {
            const reg = seg.regions[r];
            let slot = bodySlot;
            if (reg.role === 'crown') slot = secondarySlot;
            else if (reg.role === 'accent') slot = accentSlot;
            else if (reg.role === 'trim') slot = trimSlot;
            else if (reg.role === 'base') slot = primarySlot;
            else slot = primarySlot;

            for (let k = 0; k < reg.tris.length; k++) {
                triangleColors[reg.tris[k]] = slot;
            }
        }
        // Dark ink contour on high dihedral edges
        for (let t = 0; t < triCount; t++) {
            if (seg.maxEdgeAngle[t] > 0.45) {
                triangleColors[t] = bodySlot;
            }
        }
    } else {
        // 'anatomy' / default intelligent region assignment
        const hasMultipleRegions = seg.regions.length >= 3;
        if (hasMultipleRegions) {
            for (let r = 0; r < seg.regions.length; r++) {
                const reg = seg.regions[r];
                let slot = primarySlot;
                if (reg.role === 'body') slot = primarySlot;
                else if (reg.role === 'crown') slot = secondarySlot;
                else if (reg.role === 'accent') slot = accentSlot;
                else if (reg.role === 'trim') slot = trimSlot;
                else if (reg.role === 'base') slot = bodySlot;
                for (let k = 0; k < reg.tris.length; k++) {
                    triangleColors[reg.tris[k]] = slot;
                }
            }
            // Also give the bottom flat pedestal band a grounded base color if huge
            for (let t = 0; t < triCount; t++) {
                const rel = (seg.triCentroids[t * 3 + 1] - minY) / heightY;
                if (rel < 0.08 && seg.triNormals[t * 3 + 1] < -0.5) {
                    triangleColors[t] = baseSlot;
                }
            }
        } else {
            // Very smooth single-patch organic sculpt: smooth vertical + normal + radial highlights
            for (let t = 0; t < triCount; t++) {
                const cy = seg.triCentroids[t * 3 + 1];
                const ny = seg.triNormals[t * 3 + 1];
                const rel = (cy - minY) / heightY;
                if (rel < 0.16) triangleColors[t] = bodySlot;
                else if (rel > 0.78) triangleColors[t] = secondarySlot;
                else if (ny > 0.65) triangleColors[t] = accentSlot;
                else if (seg.maxEdgeAngle[t] > 0.35) triangleColors[t] = trimSlot;
                else triangleColors[t] = primarySlot;
            }
        }
    }

    if (typeof updateMeshVisualColors === 'function') updateMeshVisualColors();
    if (typeof commitHistory === 'function') commitHistory(false);

    const isFr = (typeof currentLang !== 'undefined' && currentLang === 'fr');
    showToast(isFr
        ? `IA Auto-Paint appliqué : ${theme.nameFr || theme.name} (${styleMode})`
        : `AI Auto-Paint applied: ${theme.name} (${styleMode})`
    );
}
