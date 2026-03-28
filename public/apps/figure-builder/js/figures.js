/**
 * figures.js — 4D Figure Geometry Library
 * ==========================================
 * Each figure returns: { verts: [[x,y,z,w],...], edges: [[i,j],...], name_en, name_fr, desc_en, desc_fr, icon, color }
 * Parameters come from the UI sliders (radius, tube, segs, twist, wOffset).
 */

const Figures = (() => {

    // ─── Helpers ─────────────────────────────────────────────────────────────
    const TAU = Math.PI * 2;

    /** Push an edge only if both endpoints exist */
    function edge(arr, i, j, n) {
        if (i >= 0 && j >= 0 && i < n && j < n) arr.push([i, j]);
    }

    // ─── CATEGORY: POLYTOPES ─────────────────────────────────────────────────

    /** Tesseract (Hypercube / 8-cell) */
    function tesseract(p) {
        const r = p.radius * 0.8;
        const verts = [];
        for (let w = -1; w <= 1; w += 2)
        for (let z = -1; z <= 1; z += 2)
        for (let y = -1; y <= 1; y += 2)
        for (let x = -1; x <= 1; x += 2)
            verts.push([x*r, y*r, z*r, w*r + p.wOffset]);

        const edges = [];
        const n = verts.length;
        for (let i = 0; i < n; i++) {
            for (let j = i+1; j < n; j++) {
                let diffs = 0;
                for (let k = 0; k < 4; k++) {
                    const diff = verts[i][k]/r - verts[j][k]/r;
                    if (Math.abs(diff) > 0.01) diffs++;
                }
                if (diffs === 1) edges.push([i, j]);
            }
        }
        const faces = [];
        // faces between vertices (simplified common faces for 8-cell)
        // A tesseract has 24 square faces.
        for (let i = 0; i < n; i++) {
            for (let j = i+1; j < n; j++) {
                for (let k = j+1; k < n; k++) {
                    // Check if they form a triangle? No, tesseract faces are squares.
                    // For OBJ, we can just export the 24 squares as two triangles each.
                }
            }
        }
        // Actually, let's just manually define the 24 faces of a tesseract
        // based on coordinates.
        for (let dim1 = 0; dim1 < 4; dim1++) {
            for (let dim2 = dim1 + 1; dim2 < 4; dim2++) {
                // For each plane, there are 4 faces (shifted in other 2 dims)
                const other = [0,1,2,3].filter(d => d !== dim1 && d !== dim2);
                for (let v1 of [-1, 1]) {
                    for (let v2 of [-1, 1]) {
                        // find 4 indices that have fixed values in 'other' dims
                        const indices = [];
                        for (let idx = 0; idx < n; idx++) {
                            if (Math.abs(verts[idx][other[0]]/r - v1) < 0.1 && 
                                Math.abs(verts[idx][other[1]]/r - v2) < 0.1) {
                                indices.push(idx);
                            }
                        }
                        // Sort indices to form a square
                        // For simplicity, we just add two triangles
                        if (indices.length === 4) {
                            faces.push([indices[0], indices[1], indices[2]]);
                            faces.push([indices[1], indices[2], indices[3]]);
                        }
                    }
                }
            }
        }

        return {
            verts, edges, faces,
            name_en: 'Tesseract', name_fr: 'Tesseract',
            desc_en: 'The 4D hypercube — 16 vertices, 32 edges, 24 square faces, 8 cubic cells.',
            desc_fr: 'L\'hypercube 4D — 16 sommets, 32 arêtes, 24 faces carrées, 8 cellules cubiques.',
            icon: '⬛', color: '#00f3ff', category: 'polytopes'
        };
    }

    /** 16-Cell (Cross Polytope) */
    function cell16(p) {
        const r = p.radius;
        const verts = [
            [r,0,0,0],[-r,0,0,0], [0,r,0,0],[0,-r,0,0],
            [0,0,r,0],[0,0,-r,0], [0,0,0,r+p.wOffset],[0,0,0,-r+p.wOffset]
        ];
        const edges = [];
        const n = verts.length;
        for (let i = 0; i < n; i++)
            for (let j = i+1; j < n; j++) {
                // Connected if not on same axis (opposite pole pairs)
                const oppX = (i===0&&j===1)||(i===2&&j===3)||(i===4&&j===5)||(i===6&&j===7);
                if (!oppX) edges.push([i, j]);
            }
        return {
            verts, edges,
            name_en: '16-Cell', name_fr: 'Cellule 16',
            desc_en: 'The 4D cross-polytope — analog of the octahedron. 8 vertices, 24 edges.',
            desc_fr: 'Le cross-polytope 4D — analogue de l\'octaèdre. 8 sommets, 24 arêtes.',
            icon: '💎', color: '#ff00ea', category: 'polytopes'
        };
    }

    /** 24-Cell */
    function cell24(p) {
        const r = p.radius * 0.7;
        const verts = [];
        // Permutations of (±1, ±1, 0, 0) — 24 vertices
        const coords = [1, -1, 0, 0];
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (i === j) continue;
                for (const si of [1, -1]) {
                    for (const sj of [1, -1]) {
                        const v = [0, 0, 0, p.wOffset];
                        v[i] = si * r;
                        v[j] = sj * r;
                        verts.push([...v]);
                    }
                }
            }
        }
        // Edges: connect vertices at distance sqrt(2)*r
        const edges = [];
        const dist2 = 2 * r * r;
        for (let i = 0; i < verts.length; i++) {
            for (let j = i+1; j < verts.length; j++) {
                let d2 = 0;
                for (let k = 0; k < 4; k++) d2 += (verts[i][k]-verts[j][k])**2;
                if (Math.abs(d2 - dist2) < 0.01) edges.push([i, j]);
            }
        }
        return {
            verts, edges,
            name_en: '24-Cell', name_fr: 'Cellule 24',
            desc_en: 'The self-dual regular 4D polytope — 24 vertices, 96 edges, 96 triangular faces.',
            desc_fr: 'Le polytope régulier auto-dual en 4D — 24 sommets, 96 arêtes, 96 faces triangulaires.',
            icon: '🔷', color: '#9d00ff', category: 'polytopes'
        };
    }

    /** Duoprism (n×m prism in 4D) */
    function duoprism(p) {
        const n = Math.max(3, Math.floor(p.segs / 4)) ;
        const m = Math.max(3, Math.floor(p.segs / 6));
        const r1 = p.radius, r2 = p.tube * 2;
        const verts = [];
        // n×m circle product
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < m; j++) {
                const a = (i / n) * TAU;
                const b = (j / m) * TAU;
                verts.push([
                    r1 * Math.cos(a),
                    r1 * Math.sin(a),
                    r2 * Math.cos(b),
                    r2 * Math.sin(b) + p.wOffset
                ]);
            }
        }
        const edges = [];
        const faces = [];
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < m; j++) {
                const cur = i*m + j;
                const nextI = ((i+1)%n)*m + j;
                const nextJ = i*m + (j+1)%m;
                const nextIJ = ((i+1)%n)*m + (j+1)%m;
                edges.push([cur, nextI]);
                edges.push([cur, nextJ]);
                // Faces for the duoprism
                faces.push([cur, nextI, nextJ]);
                faces.push([nextI, nextJ, nextIJ]);
            }
        }
        return {
            verts, edges, faces,
            name_en: 'Duoprism', name_fr: 'Douprismatique',
            desc_en: `${n}×${m} Duoprism — Cartesian product of two circles. Unique 4D torus-like shape.`,
            desc_fr: `Duoprismatique ${n}×${m} — produit cartésien de deux cercles. Forme toroïdale unique en 4D.`,
            icon: '🔁', color: '#ffcc00', category: 'polytopes'
        };
    }

    // ─── CATEGORY: SURFACES ──────────────────────────────────────────────────

    /** Clifford Torus */
    function cliffordTorus(p) {
        const n = p.segs;
        const r = p.radius / Math.SQRT2;
        const verts = [];
        const edges = [];
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const a = (i / n) * TAU + p.twist;
                const b = (j / n) * TAU;
                verts.push([
                    r * Math.cos(a),
                    r * Math.sin(a),
                    r * Math.cos(b),
                    r * Math.sin(b) + p.wOffset
                ]);
            }
        }
        const faces = [];
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const cur = i*n + j;
                const nextI = ((i+1)%n)*n + j;
                const nextJ = i*n + (j+1)%n;
                const nextIJ = ((i+1)%n)*n + (j+1)%n;
                edges.push([cur, nextI]);
                edges.push([cur, nextJ]);
                // Quads as two triangles
                faces.push([cur, nextI, nextJ]);
                faces.push([nextI, nextJ, nextIJ]);
            }
        }
        return {
            verts, edges, faces,
            name_en: 'Clifford Torus', name_fr: 'Tore de Clifford',
            desc_en: 'The flat torus embedded in 4D — equal-radius product of two circles on S³.',
            desc_fr: 'Le tore plat plongé en 4D — produit de deux cercles de rayon égal sur S³.',
            icon: '🌀', color: '#00ffaa', category: 'surfaces'
        };
    }

    /** Hopf Fibration Fiber Bundle */
    function hopfFibration(p) {
        const nFibers = Math.floor(p.segs / 2);
        const nPts = Math.floor(p.segs / 2);
        const r = p.radius;
        const verts = [];
        const edges = [];
        let idx = 0;
        for (let fi = 0; fi < nFibers; fi++) {
            const theta = (fi / nFibers) * Math.PI;
            const phi   = (fi / nFibers) * TAU * 1.618;
            // Base point on S²
            const bx = Math.sin(theta)*Math.cos(phi);
            const by = Math.sin(theta)*Math.sin(phi);
            const bz = Math.cos(theta);
            const start = idx;
            for (let k = 0; k < nPts; k++) {
                const t = (k / nPts) * TAU;
                const ct = Math.cos(t), st = Math.sin(t);
                // Hopf fiber parameterization
                verts.push([
                    r * (bx*ct - by*st),
                    r * (bx*st + by*ct),
                    r * (bz*ct - st),
                    r * (bz*st + ct) * 0.5 + p.wOffset
                ]);
                if (k > 0) edges.push([idx-1, idx]);
                idx++;
            }
            edges.push([idx-1, start]); // close fiber
        }
        return {
            verts, edges,
            name_en: 'Hopf Fibration', name_fr: 'Fibration de Hopf',
            desc_en: 'Circles (fibers) that fill the 3-sphere without intersecting — a beautiful 4D structure.',
            desc_fr: 'Des cercles (fibres) qui remplissent la 3-sphère sans se croiser — une belle structure 4D.',
            icon: '🌐', color: '#ff88ff', category: 'surfaces'
        };
    }

    /** Klein Bottle (4D embedding) */
    function kleinBottle(p) {
        const nu = p.segs, nv = Math.floor(p.segs * 0.75);
        const a = p.radius, b = p.tube;
        const verts = [];
        const edges = [];
        for (let ui = 0; ui < nu; ui++) {
            for (let vi = 0; vi < nv; vi++) {
                const u = (ui / nu) * TAU;
                const v = (vi / nv) * TAU;
                // Standard Klein bottle in 4D
                const cu = Math.cos(u), su = Math.sin(u);
                const cv = Math.cos(v), sv = Math.sin(v);
                verts.push([
                    (a + b*cv) * cu,
                    (a + b*cv) * su,
                    b * sv * cu + p.twist * su,
                    b * sv * su + p.wOffset
                ]);
                const cur = ui*nv + vi;
                edges.push([cur, ((ui+1)%nu)*nv + vi]);
                edges.push([cur, ui*nv + (vi+1)%nv]);
            }
        }
        return {
            verts, edges,
            name_en: 'Klein Bottle', name_fr: 'Bouteille de Klein',
            desc_en: 'A non-orientable surface with no inside or outside — exists without self-intersection only in 4D.',
            desc_fr: 'Une surface non-orientable sans dedans ni dehors — existe sans auto-intersection uniquement en 4D.',
            icon: '🍶', color: '#ff5500', category: 'surfaces'
        };
    }

    /** Torus Knot embedded in 4D */
    function torusKnot4d(p) {
        const n = p.segs * 4;
        const r = p.radius, t2 = p.tube;
        const P = 2, Q = 3;
        const verts = [], edges = [];
        for (let i = 0; i < n; i++) {
            const t = (i / n) * TAU;
            const phi = P * t, psi = Q * t + p.twist;
            verts.push([
                (r + t2 * Math.cos(psi)) * Math.cos(phi),
                (r + t2 * Math.cos(psi)) * Math.sin(phi),
                t2 * Math.sin(psi),
                t2 * Math.sin(psi + phi * 0.5) * 0.5 + p.wOffset
            ]);
            edges.push([i, (i+1)%n]);
        }
        return {
            verts, edges,
            name_en: '4D Torus Knot', name_fr: 'Nœud Toroïdal 4D',
            desc_en: `(${P},${Q}) Torus knot lifted into 4D — a knot that unknots itself in the fourth dimension.`,
            desc_fr: `Nœud toroïdal (${P},${Q}) en 4D — un nœud qui se défait dans la 4ème dimension.`,
            icon: '🎀', color: '#ffcc00', category: 'surfaces'
        };
    }

    // ─── CATEGORY: ORGANIC ───────────────────────────────────────────────────

    /** 4D Jellyfish — pulsing hyperblob */
    function jellyfish4d(p) {
        const nu = Math.floor(p.segs / 2), nv = p.segs;
        const r = p.radius;
        const verts = [], edges = [];
        for (let ui = 0; ui < nu; ui++) {
            for (let vi = 0; vi < nv; vi++) {
                const u = (ui / nu) * Math.PI;
                const v = (vi / nv) * TAU;
                const wave = Math.sin(u * 3) * p.tube * 0.4;
                verts.push([
                    r * Math.sin(u) * Math.cos(v),
                    r * Math.sin(u) * Math.sin(v),
                    r * Math.cos(u) + wave,
                    wave * Math.sin(v * 2) * r * 0.3 + p.wOffset
                ]);
                const cur = ui * nv + vi;
                if (ui < nu - 1) edges.push([cur, (ui+1)*nv + vi]);
                edges.push([cur, ui*nv + (vi+1)%nv]);
            }
        }
        return {
            verts, edges,
            name_en: '4D Jellyfish', name_fr: 'Méduse 4D',
            desc_en: 'An organic 4D creature — a pulsing hyperblob with tentacle-like W-extensions.',
            desc_fr: 'Une créature organique 4D — une hypergoutte pulsante avec des extensions tentaculaires en W.',
            icon: '🪼', color: '#88ffcc', category: 'organic'
        };
    }

    /** Seraphim Wings — 4D angelic shape */
    function seraphim4d(p) {
        const n = p.segs * 3;
        const r = p.radius;
        const verts = [], edges = [];
        for (let i = 0; i < n; i++) {
            const t = (i / n) * TAU;
            const wingSpan = Math.pow(Math.abs(Math.sin(t * 3)), 0.5);
            const height   = Math.sin(t) * r;
            const depth    = Math.cos(t * 2) * p.tube * r;
            verts.push([
                wingSpan * r * Math.cos(t),
                height,
                depth,
                Math.sin(t * 7) * p.tube * r * 0.5 + p.wOffset + p.twist * Math.sin(t)
            ]);
            edges.push([i, (i+1)%n]);
            // Cross-ribs
            if (i % 4 === 0 && i + 2 < n) edges.push([i, i+2]);
        }
        return {
            verts, edges,
            name_en: 'Seraphim Wings', name_fr: 'Ailes de Séraphin',
            desc_en: 'An angelic 4D structure — a pair of infinite wings folded through the 4th dimension.',
            desc_fr: 'Une structure angélique 4D — une paire d\'ailes infinies repliées dans la 4ème dimension.',
            icon: '👼', color: '#ffffaa', category: 'organic'
        };
    }

    /** Neural Parasite — branching 4D dendrite */
    function neuralParasite(p) {
        const branches = 6;
        const depth    = 3;
        const r0 = p.radius;
        const verts = [[0, 0, 0, p.wOffset]];
        const edges = [];
        function grow(parent, dir, level, len) {
            if (level === 0) return;
            const [dx, dy, dz, dw] = dir;
            const newV = [
                verts[parent][0] + dx * len,
                verts[parent][1] + dy * len,
                verts[parent][2] + dz * len,
                verts[parent][3] + dw * len * 0.5,
            ];
            const ni = verts.length;
            verts.push(newV);
            edges.push([parent, ni]);
            const childCount = level > 1 ? 3 : 2;
            for (let c = 0; c < childCount; c++) {
                const angle = (c / childCount) * TAU + level;
                const childDir = [
                    dx * 0.6 + Math.cos(angle) * 0.4,
                    dy * 0.6 + Math.sin(angle) * 0.4,
                    dz * 0.6 + Math.sin(angle + 1) * 0.3,
                    dw * 0.5 + Math.cos(angle * 2) * 0.3,
                ];
                grow(ni, childDir, level - 1, len * 0.6);
            }
        }
        for (let b = 0; b < branches; b++) {
            const angle = (b / branches) * TAU + p.twist;
            grow(0, [Math.cos(angle), Math.sin(angle), Math.cos(angle*2)*0.3, Math.sin(angle*3)*0.2], depth, r0 * 0.5);
        }
        return {
            verts, edges,
            name_en: 'Neural Parasite', name_fr: 'Parasite Neural',
            desc_en: 'A branching dendritic tree that extends its root tendrils into the 4th dimension.',
            desc_fr: 'Un arbre dendritique ramifié qui étend ses racines dans la 4ème dimension.',
            icon: '🧠', color: '#ff88aa', category: 'organic'
        };
    }

    // ─── CATEGORY: ABSTRACT ──────────────────────────────────────────────────

    /** 4D Lissajous Knot */
    function lissajous4d(p) {
        const n = p.segs * 8;
        const r = p.radius;
        const verts = [], edges = [];
        const a=3, b=4, c=5, d=7;
        for (let i = 0; i < n; i++) {
            const t = (i / n) * TAU;
            verts.push([
                r * Math.cos(a * t + p.twist),
                r * Math.cos(b * t),
                r * Math.cos(c * t + 1),
                r * Math.cos(d * t + 0.5) * p.tube + p.wOffset
            ]);
            edges.push([i, (i+1)%n]);
        }
        return {
            verts, edges,
            name_en: '4D Lissajous', name_fr: 'Lissajous 4D',
            desc_en: `4D Lissajous figure with frequencies (${a},${b},${c},${d}) — a knotted space curve.`,
            desc_fr: `Figure de Lissajous 4D avec fréquences (${a},${b},${c},${d}) — une courbe nouée dans l'espace.`,
            icon: '∿', color: '#aaffff', category: 'abstract'
        };
    }

    /** Hypersphere cross-sections */
    function hypersphere(p) {
        const nu = p.segs, nv = Math.floor(p.segs * 0.75), nw = 4;
        const r = p.radius;
        const verts = [], edges = [];
        for (let wi = 0; wi < nw; wi++) {
            const w = (wi / nw) * TAU;
            const wVal = Math.cos(w) * r * 0.6 + p.wOffset;
            const rSlice = Math.sin(w) * r;
            const startIdx = verts.length;
            for (let ui = 0; ui < nu; ui++) {
                for (let vi = 0; vi < nv; vi++) {
                    const u = (ui / nu) * Math.PI;
                    const v = (vi / nv) * TAU;
                    verts.push([
                        rSlice * Math.sin(u) * Math.cos(v),
                        rSlice * Math.sin(u) * Math.sin(v),
                        rSlice * Math.cos(u),
                        wVal
                    ]);
                    const cur = startIdx + ui*nv + vi;
                    if (ui < nu-1) edges.push([cur, startIdx + (ui+1)*nv + vi]);
                    edges.push([cur, startIdx + ui*nv + (vi+1)%nv]);
                }
            }
        }
        return {
            verts, edges,
            name_en: '3-Sphere Shells', name_fr: 'Coques de 3-Sphère',
            desc_en: 'Concentric shells of the 3-sphere (S³) — the 4D analog of nested spherical shells.',
            desc_fr: 'Coques concentriques de la 3-sphère (S³) — analogue 4D de coques sphériques imbriquées.',
            icon: '🌍', color: '#4488ff', category: 'abstract'
        };
    }

    /** 4D Spiral — a helix that spirals in 4D */
    function spiral4d(p) {
        const n = p.segs * 10;
        const r = p.radius;
        const verts = [], edges = [];
        for (let i = 0; i < n; i++) {
            const t = (i / n) * TAU * 4;
            const s = i / n;
            verts.push([
                r * Math.cos(t) * (1 - s * 0.3),
                r * Math.sin(t) * (1 - s * 0.3),
                r * Math.cos(t * p.tube * 3) * s,
                r * s * 2 * Math.sin(t * 0.5 + p.twist) + p.wOffset
            ]);
            edges.push([i, (i+1)%n]);
        }
        return {
            verts, edges,
            name_en: '4D Hyperspiral', name_fr: 'Hyper-Spirale 4D',
            desc_en: 'A helix that simultaneously spirals through all four dimensions — an impossible path in 3D.',
            desc_fr: 'Une hélice qui spirale simultanément dans les quatre dimensions — un chemin impossible en 3D.',
            icon: '🌪️', color: '#ffaa00', category: 'abstract'
        };
    }

    /** Quantum Flower — 4D rose curve */
    function quantumFlower(p) {
        const n = p.segs * 12;
        const r = p.radius;
        const k = Math.floor(p.tube * 10) + 3;
        const verts = [], edges = [];
        for (let i = 0; i < n; i++) {
            const t = (i / n) * TAU * k;
            const rho = r * Math.cos(k * t / k);
            verts.push([
                rho * Math.cos(t),
                rho * Math.sin(t),
                rho * Math.cos(t * 2) * 0.5,
                rho * Math.sin(t * 3) * 0.4 + p.wOffset + p.twist * Math.sin(t * k)
            ]);
            edges.push([i, (i+1)%n]);
        }
        return {
            verts, edges,
            name_en: 'Quantum Flower', name_fr: 'Fleur Quantique',
            desc_en: `A 4D rose curve with ${k} petals — a hyperdimensional blooming flower.`,
            desc_fr: `Une courbe-rose 4D à ${k} pétales — une fleur hyperspaciale en floraison.`,
            icon: '🌸', color: '#ff66cc', category: 'abstract'
        };
    }

    // ─── CATEGORY: ALIENS ────────────────────────────────────────────────────

    /** Alien Vortex Eye — a giant rotating eye from another dimension */
    function vortexEye(p) {
        const n = p.segs * 4, r = p.radius;
        const verts = [], edges = [];
        // Iris rings
        for (let ring = 0; ring < 6; ring++) {
            const rr = r * (ring + 1) / 7;
            const start = verts.length;
            for (let i = 0; i < n; i++) {
                const t = (i / n) * TAU;
                verts.push([rr*Math.cos(t), rr*Math.sin(t), Math.sin(ring*1.2)*p.tube*0.4, Math.cos(t*3)*p.tube*0.3 + p.wOffset]);
                edges.push([start+i, start+(i+1)%n]);
            }
        }
        // Pupil spokes
        const center = verts.length;
        verts.push([0, 0, 0, p.wOffset]);
        for (let i = 0; i < 12; i++) {
            const t = (i/12)*TAU;
            const spoke = verts.length;
            verts.push([r*0.6*Math.cos(t), r*0.6*Math.sin(t), Math.sin(t*2)*0.2, p.wOffset]);
            edges.push([center, spoke]);
        }
        return { verts, edges, name_en:'Vortex Eye', name_fr:'Œil Vortex', icon:'👁️', color:'#ff4488', category:'aliens',
            desc_en:'A hyperdimensional alien eye from another plane of existence — iris and pupil shaped in 4D.',
            desc_fr:'Un œil extraterrestre hyperdimensionnel d\'un autre plan d\'existence — iris et pupille en 4D.' };
    }

    /** Plasma Amoeba — fluid alien cell with pseudopods */
    function plasmaAmoeba(p) {
        const n = p.segs * 6, r = p.radius;
        const verts = [], edges = [];
        const pods = 7;
        for (let i = 0; i < n; i++) {
            const t = (i/n)*TAU;
            const blob = 1 + Math.sin(t*pods)*0.35 + Math.cos(t*3)*0.15;
            const membrane = r * blob;
            verts.push([membrane*Math.cos(t), membrane*Math.sin(t), Math.sin(t*2+p.twist)*p.tube*r*0.5, Math.cos(t*pods)*p.tube*r*0.4 + p.wOffset]);
            edges.push([i, (i+1)%n]);
        }
        // Inner nucleus
        const nc = Math.floor(n/4);
        const nStart = verts.length;
        for (let i = 0; i < nc; i++) {
            const t = (i/nc)*TAU;
            verts.push([r*0.35*Math.cos(t), r*0.35*Math.sin(t), 0, p.wOffset*0.5]);
            edges.push([nStart+i, nStart+(i+1)%nc]);
        }
        return { verts, edges, name_en:'Plasma Amoeba', name_fr:'Amibe Plasma', icon:'🦠', color:'#44ffaa', category:'aliens',
            desc_en:'A living plasma creature with pulsing membrane, pseudopods, and a glowing nucleus in 4D.',
            desc_fr:'Une créature plasma vivante avec membrane pulsante, pseudopodes et noyau lumineux en 4D.' };
    }

    /** Dimensional Rift — spacetime tear */
    function dimensionalRift(p) {
        const n = p.segs * 5, r = p.radius;
        const verts = [], edges = [];
        for (let i = 0; i < n; i++) {
            const t = (i/n)*TAU;
            const crack = Math.pow(Math.abs(Math.sin(t*4)), 0.3);
            verts.push([r*crack*Math.cos(t), r*crack*Math.sin(t)*0.4, r*Math.sin(t*7)*p.tube*0.5,
                r*Math.cos(t*5)*p.tube*0.6 + p.wOffset + Math.sin(t*2)*p.twist*0.3]);
            edges.push([i, (i+1)%n]);
        }
        // Lightning bolt edges
        for (let b = 0; b < 8; b++) {
            const angle = (b/8)*TAU + p.twist;
            const s = verts.length;
            for (let k = 0; k < 5; k++) {
                const frac = k/5, jitter = (Math.random()-0.5)*0.3;
                verts.push([r*frac*Math.cos(angle)+jitter, r*frac*Math.sin(angle)+jitter, jitter*0.5, p.wOffset]);
                if (k > 0) edges.push([s+k-1, s+k]);
            }
        }
        return { verts, edges, name_en:'Dimensional Rift', name_fr:'Fissure Dimensionnelle', icon:'⚡', color:'#ff8800', category:'aliens',
            desc_en:'A tear in the fabric of spacetime — impossible geometry visible only because it touches 4D.',
            desc_fr:'Une déchirure dans le tissu espace-temps — géométrie impossible visible uniquement en 4D.' };
    }

    /** Void Tendril — dark matter entity */
    function voidTendril(p) {
        const tentacles = 8, n = p.segs * 3, r = p.radius;
        const verts = [[0,0,0,p.wOffset]];
        const edges = [];
        for (let t = 0; t < tentacles; t++) {
            const baseAngle = (t/tentacles)*TAU + p.twist;
            const prev = [0];
            for (let k = 1; k <= n; k++) {
                const s = k/n, taper = 1 - s*0.8;
                const curl = s * s * 4;
                const idx = verts.length;
                verts.push([r*s*taper*Math.cos(baseAngle+curl*0.8), r*s*taper*Math.sin(baseAngle+curl*0.8),
                    r*s*Math.sin(k*0.7)*p.tube*0.6, r*s*Math.cos(k*0.5+t)*p.tube*0.4 + p.wOffset]);
                edges.push([prev[prev.length-1], idx]);
                if (k % 3 === 0 && k > 6) {
                    verts.push([verts[idx][0]+0.1, verts[idx][1]+0.1, verts[idx][2], verts[idx][3]]);
                    edges.push([idx, verts.length-1]);
                }
                prev.push(idx);
            }
        }
        return { verts, edges, name_en:'Void Tendril', name_fr:'Tentacule du Vide', icon:'🐙', color:'#cc44ff', category:'aliens',
            desc_en:'An entity of dark matter — 8 writhing tendrils that curl and branch into the 4th dimension.',
            desc_fr:'Une entité de matière sombre — 8 tentacules qui s\'enroulent et se ramifient dans la 4ème dimension.' };
    }

    /** Scyphozoa 4D — hyperspace jellyfish, more alien than organic */
    function scyphozoa4d(p) {
        const n = p.segs * 3, r = p.radius;
        const verts = [], edges = [];
        // Bell (main dome)
        for (let i = 0; i < n; i++) {
            const t = (i/n)*TAU;
            const pulseBell = 1 + Math.sin(t*5)*0.12;
            verts.push([r*pulseBell*Math.cos(t), r*0.6*pulseBell*Math.sin(t),
                r*0.4*(1-Math.cos(t*2)),
                r*Math.sin(t*7)*p.tube*0.5 + p.wOffset]);
            edges.push([i, (i+1)%n]);
        }
        // Long trailing filaments
        for (let fi = 0; fi < 14; fi++) {
            const angle = (fi/14)*TAU + p.twist;
            const s = verts.length;
            for (let k = 0; k < 12; k++) {
                const frac = k/12;
                verts.push([r*0.5*Math.cos(angle)*(1-frac*0.3), -r*frac*1.5,
                    r*0.5*Math.sin(angle)*(1-frac*0.3) + Math.sin(frac*10)*0.15,
                    frac*r*p.tube*Math.cos(angle*2) + p.wOffset]);
                if (k > 0) edges.push([s+k-1, s+k]);
            }
        }
        return { verts, edges, name_en:'Scyphozoa 4D', name_fr:'Scyphozoaire 4D', icon:'🌊', color:'#00ccff', category:'aliens',
            desc_en:'A hyperdimensional jellyfish species — its bell and 14 long filaments extend into W-space.',
            desc_fr:'Une espèce de méduse hyperdimensionnelle — sa cloche et 14 filaments s\'étendent dans l\'espace-W.' };
    }

    /** Crystalline Hive — alien geometric colony */
    function crystallineHive(p) {
        const r = p.radius;
        const verts = [], edges = [];
        const hexes = 7;
        function addHex(cx, cy, cz, cw, size) {
            const start = verts.length;
            for (let i = 0; i < 6; i++) {
                const angle = (i/6)*TAU + Math.PI/6;
                verts.push([cx + size*Math.cos(angle), cy + size*Math.sin(angle), cz + Math.sin(angle*2)*size*0.3, cw]);
                edges.push([start+i, start+(i+1)%6]);
            }
            edges.push([start, start+3]); edges.push([start+1, start+4]); edges.push([start+2, start+5]);
        }
        addHex(0, 0, 0, p.wOffset, r*0.5);
        for (let i = 0; i < 6; i++) {
            const angle = (i/6)*TAU + p.twist;
            const d = r * 0.9;
            addHex(d*Math.cos(angle), d*Math.sin(angle), Math.sin(angle*2)*r*p.tube*0.4, p.wOffset + Math.cos(angle)*r*p.tube*0.3, r*0.35);
        }
        return { verts, edges, name_en:'Crystalline Hive', name_fr:'Ruche Cristalline', icon:'🔶', color:'#ffdd00', category:'aliens',
            desc_en:'An alien crystalline colony structure — 7 hexagonal cells bonded in 4D hyperspace.',
            desc_fr:'Une structure de colonie cristalline extraterrestre — 7 cellules hexagonales liées dans l\'hyperespace 4D.' };
    }

    // ─── CATALOG ─────────────────────────────────────────────────────────────
    const catalog = {
        polytopes: [
            { id: 'tesseract',  gen: tesseract  },
            { id: 'cell16',     gen: cell16     },
            { id: 'cell24',     gen: cell24     },
            { id: 'duoprism',   gen: duoprism   },
        ],
        surfaces: [
            { id: 'clifford',   gen: cliffordTorus },
            { id: 'hopf',       gen: hopfFibration },
            { id: 'klein',      gen: kleinBottle   },
            { id: 'torusknot',  gen: torusKnot4d   },
        ],
        organic: [
            { id: 'jellyfish',  gen: jellyfish4d   },
            { id: 'seraphim',   gen: seraphim4d    },
            { id: 'neural',     gen: neuralParasite },
        ],
        abstract: [
            { id: 'lissajous',  gen: lissajous4d  },
            { id: 'hypersphere',gen: hypersphere   },
            { id: 'spiral4d',   gen: spiral4d      },
            { id: 'flower',     gen: quantumFlower },
        ],
        aliens: [
            { id: 'vortexeye',  gen: vortexEye        },
            { id: 'amoeba',     gen: plasmaAmoeba     },
            { id: 'rift',       gen: dimensionalRift  },
            { id: 'tendril',    gen: voidTendril      },
            { id: 'scyphozoa',  gen: scyphozoa4d      },
            { id: 'hivecell',   gen: crystallineHive  },
        ],
    };

    function getCategories() { return Object.keys(catalog); }
    function getFiguresInCategory(cat) { return catalog[cat] || []; }
    function generate(id, params) {
        for (const cat of Object.values(catalog)) {
            for (const fig of cat) { if (fig.id === id) return fig.gen(params); }
        }
        return tesseract(params);
    }
    function getFirst(cat) {
        const list = catalog[cat];
        return list && list.length ? list[0].id : 'tesseract';
    }

    return { catalog, getCategories, getFiguresInCategory, generate, getFirst };
})();

