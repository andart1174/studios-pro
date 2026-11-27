/**
 * figures.js — 4D Real Sculptures & Hyperdimensional Geometry Library (v5.0)
 * ===========================================================================
 * Every figure returns real volumetric 4D geometry:
 *   { verts: [[x,y,z,w],...], edges: [[i,j],...], faces: [[i,j,k],...],
 *     name_en, name_fr, desc_en, desc_fr, icon, color, category, tubeScale }
 *
 * Includes:
 *  - NEW "real4d" flagship sculptural category (Heart, Cyber Mannequin,
 *    DNA Helix, Chronos Astrolabe, Phoenix Wings, Mobius Monument,
 *    4D Star Polytope, Royal Lotus Crown)
 *  - FIXED regular 4D polytopes (Tesseract 16/32/48, 5-Cell 5/10/10,
 *    16-Cell 8/24/32, 24-Cell exact 24/96/96, Duoprism)
 *  - UPGRADED solid-surface manifolds (Clifford Torus, volumetric Hopf
 *    Fibration, solid Klein Bottle, tubular 4D Torus Knot, 3-Sphere Shells)
 *  - UPGRADED solid Organic, Abstract (fixed Quantum Flower!), and 3D Aliens
 */

const Figures = (() => {

    const TAU = Math.PI * 2;

    // ─── Mesh Builder Helpers (4D Manifold Primitives) ───────────────────────

    /** Append a 3D/4D parametric tube along a closed or open 4D curve */
    function appendTube4D(verts, edges, faces, curvePts, radius, radialSegs = 6, closed = true, edgeStep = 2) {
        const n = curvePts.length;
        if (n < 2) return;
        const base = verts.length;

        for (let i = 0; i < n; i++) {
            const p = curvePts[i];
            const prev = curvePts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
            const next = curvePts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];

            let tx = next[0] - prev[0], ty = next[1] - prev[1], tz = next[2] - prev[2];
            const tLen = Math.hypot(tx, ty, tz) || 1;
            tx /= tLen; ty /= tLen; tz /= tLen;

            // Robust Frenet-like orthonormal basis in 3D slice
            let ux = 0, uy = 1, uz = 0;
            if (Math.abs(ty) > 0.9) { ux = 1; uy = 0; uz = 0; }
            let bx = ty * uz - tz * uy;
            let by = tz * ux - tx * uz;
            let bz = tx * uy - ty * ux;
            const bLen = Math.hypot(bx, by, bz) || 1;
            bx /= bLen; by /= bLen; bz /= bLen;

            const nx = by * tz - bz * ty;
            const ny = bz * tx - bx * tz;
            const nz = bx * ty - by * tx;

            const rLocal = typeof radius === 'function' ? radius(i / Math.max(1, n - 1), i) : radius;
            for (let j = 0; j < radialSegs; j++) {
                const a = (j / radialSegs) * TAU;
                const ca = Math.cos(a) * rLocal;
                const sa = Math.sin(a) * rLocal;
                verts.push([
                    p[0] + nx * ca + bx * sa,
                    p[1] + ny * ca + by * sa,
                    p[2] + nz * ca + bz * sa,
                    p[3]
                ]);
            }
        }

        const segLimit = closed ? n : n - 1;
        for (let i = 0; i < segLimit; i++) {
            const iNext = (i + 1) % n;
            for (let j = 0; j < radialSegs; j++) {
                const jNext = (j + 1) % radialSegs;
                const a = base + i * radialSegs + j;
                const b = base + iNext * radialSegs + j;
                const c = base + iNext * radialSegs + jNext;
                const d = base + i * radialSegs + jNext;
                faces.push([a, b, c], [a, c, d]);
                if (j === 0 || (i % edgeStep === 0 && j % 2 === 0)) {
                    edges.push([a, b]);
                }
                if (i % edgeStep === 0) edges.push([a, d]);
            }
        }
    }

    /** Append a 4D ellipsoid / sculpted limb / body segment */
    function appendEllipsoid4D(verts, edges, faces, cx, cy, cz, cw, rx, ry, rz, latSegs = 8, lonSegs = 12, taperY = 0) {
        const base = verts.length;
        for (let i = 0; i <= latSegs; i++) {
            const v = i / latSegs;
            const phi = v * Math.PI;
            const sp = Math.sin(phi), cp = Math.cos(phi);
            const tScale = 1 + taperY * cp;
            for (let j = 0; j < lonSegs; j++) {
                const th = (j / lonSegs) * TAU;
                verts.push([
                    cx + rx * tScale * sp * Math.cos(th),
                    cy + ry * cp,
                    cz + rz * tScale * sp * Math.sin(th),
                    cw + cp * 0.14
                ]);
            }
        }
        for (let i = 0; i < latSegs; i++) {
            for (let j = 0; j < lonSegs; j++) {
                const jn = (j + 1) % lonSegs;
                const a = base + i * lonSegs + j;
                const b = base + (i + 1) * lonSegs + j;
                const c = base + (i + 1) * lonSegs + jn;
                const d = base + i * lonSegs + jn;
                if (i > 0) faces.push([a, b, d]);
                if (i < latSegs - 1) faces.push([b, c, d]);
                if (i % 2 === 0 && j % 2 === 0) {
                    edges.push([a, b], [a, d]);
                }
            }
        }
    }

    /** Append a 4D beveled solid prism (box/hex/cylinder) */
    function appendPrism4D(verts, edges, faces, cx, cy, cz, cw, rx, ry, rz, sides = 6, wTilt = 0) {
        const base = verts.length;
        const botCenter = base;
        const topCenter = base + 1;
        verts.push([cx, cy - ry, cz, cw - wTilt]);
        verts.push([cx, cy + ry, cz, cw + wTilt]);
        const ringBot = base + 2;
        const ringTop = base + 2 + sides;
        for (let i = 0; i < sides; i++) {
            const a = (i / sides) * TAU + Math.PI / sides;
            const x = cx + rx * Math.cos(a);
            const z = cz + rz * Math.sin(a);
            verts.push([x, cy - ry, z, cw - wTilt]);
        }
        for (let i = 0; i < sides; i++) {
            const a = (i / sides) * TAU + Math.PI / sides;
            const x = cx + rx * Math.cos(a);
            const z = cz + rz * Math.sin(a);
            verts.push([x, cy + ry, z, cw + wTilt]);
        }
        for (let i = 0; i < sides; i++) {
            const inx = (i + 1) % sides;
            const b0 = ringBot + i, b1 = ringBot + inx;
            const t0 = ringTop + i, t1 = ringTop + inx;
            faces.push([botCenter, b1, b0]);
            faces.push([topCenter, t0, t1]);
            faces.push([b0, b1, t1], [b0, t1, t0]);
            edges.push([b0, b1], [t0, t1], [b0, t0]);
        }
    }

    /** Connect a closed or open (nu x nv) grid into faces & sparse edges */
    function connectGrid(edges, faces, startIdx, nu, nv, wrapU, wrapV, edgeStride = 1) {
        const uMax = wrapU ? nu : nu - 1;
        const vMax = wrapV ? nv : nv - 1;
        for (let u = 0; u < uMax; u++) {
            const uNext = (u + 1) % nu;
            for (let v = 0; v < vMax; v++) {
                const vNext = (v + 1) % nv;
                const a = startIdx + u * nv + v;
                const b = startIdx + uNext * nv + v;
                const c = startIdx + uNext * nv + vNext;
                const d = startIdx + u * nv + vNext;
                faces.push([a, b, c], [a, c, d]);
                if (u % edgeStride === 0) edges.push([a, d]);
                if (v % edgeStride === 0) edges.push([a, b]);
            }
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // CATEGORY 1: REAL 4D SCULPTURES (FLAGSHIP VOLUMETRIC 4D OBJECTS)
    // ════════════════════════════════════════════════════════════════════════

    /** 4D Crystal Heart — True volumetric parametric 3D/4D beating heart */
    function heart4d(p) {
        const nu = Math.max(18, Math.min(36, Math.round(p.segs * 1.1)));
        const nv = Math.max(14, Math.min(28, Math.round(p.segs * 0.8)));
        const r = p.radius * 0.085;
        const depth = (0.45 + p.tube * 0.9) * p.radius;
        const verts = [], edges = [], faces = [];

        // Closed plump 3D heart surface lifted into W via curvature & twist
        for (let ui = 0; ui < nu; ui++) {
            const t = (ui / nu) * TAU;
            const hx = 16 * Math.pow(Math.sin(t), 3) * r;
            const hy = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * r;
            for (let vi = 0; vi <= nv; vi++) {
                const phi = (vi / nv) * Math.PI; // 0 (front pole) .. PI (back pole)
                const profile = Math.sin(phi);   // radial scale 0..1..0
                const zOff = Math.cos(phi) * depth * 0.52 * (0.45 + 0.55 * Math.pow(Math.sin(phi), 0.35));
                const x = hx * Math.pow(profile, 0.72);
                const y = (hy + 0.12 * p.radius) * Math.pow(profile, 0.72);
                const w = Math.sin(t * 2 + phi + p.twist) * p.tube * 0.55 + Math.cos(phi) * 0.25 + p.wOffset;
                verts.push([x, y, zOff, w]);
            }
        }
        const strideV = nv + 1;
        for (let u = 0; u < nu; u++) {
            const un = (u + 1) % nu;
            for (let v = 0; v < nv; v++) {
                const a = u * strideV + v;
                const b = un * strideV + v;
                const c = un * strideV + v + 1;
                const d = u * strideV + v + 1;
                if (v > 0) faces.push([a, b, d]);
                if (v < nv - 1) faces.push([b, c, d]);
                if (v % 3 === 0 && u % 2 === 0) edges.push([a, b]);
                if (u % 3 === 0 && v % 2 === 0) edges.push([a, d]);
            }
        }

        // Orbiting 4D diamond halo ring around the heart
        const haloPts = [];
        const hn = 28;
        for (let i = 0; i < hn; i++) {
            const a = (i / hn) * TAU;
            haloPts.push([
                p.radius * 1.42 * Math.cos(a),
                p.radius * 0.35 * Math.sin(a * 2),
                p.radius * 1.42 * Math.sin(a),
                Math.cos(a * 2 + p.twist) * 0.45 + p.wOffset
            ]);
        }
        appendTube4D(verts, edges, faces, haloPts, 0.032 * p.radius, 5, true, 3);

        return {
            verts, edges, faces,
            name_en: '4D Crystal Heart', name_fr: 'Cœur Cristal 4D',
            desc_en: 'Real volumetric 4D sculpted heart with double-sided curvature and orbiting hyper-halo.',
            desc_fr: 'Véritable cœur sculptural 4D volumétrique à double courbure et halo hyperdimensionnel.',
            icon: '❤️', color: '#ff2a78', category: 'real4d', tubeScale: 0.45
        };
    }

    /** 4D Cyber Mannequin — Real sculpted anatomical humanoid + 4D aura rings */
    function mannequin4d(p) {
        const s = p.radius * 0.85;
        const w0 = p.wOffset;
        const verts = [], edges = [], faces = [];

        // Head & Neck
        appendEllipsoid4D(verts, edges, faces, 0, 1.18 * s, 0, w0 + 0.15, 0.17 * s, 0.21 * s, 0.18 * s, 7, 10, 0.08);
        appendPrism4D(verts, edges, faces, 0, 0.94 * s, 0, w0 + 0.1, 0.075 * s, 0.08 * s, 0.075 * s, 8, 0.02);

        // Sculpted Chest / Torso (tapered athletic V-shape)
        appendEllipsoid4D(verts, edges, faces, 0, 0.62 * s, 0.02 * s, w0 + 0.05, 0.31 * s, 0.30 * s, 0.18 * s, 8, 12, 0.22);
        // Waist & Pelvis
        appendEllipsoid4D(verts, edges, faces, 0, 0.24 * s, 0, w0, 0.21 * s, 0.17 * s, 0.15 * s, 6, 10, -0.1);
        appendEllipsoid4D(verts, edges, faces, 0, 0.04 * s, 0, w0 - 0.04, 0.24 * s, 0.16 * s, 0.16 * s, 6, 10, -0.05);

        // Shoulders, Arms & Forearms (dynamic heroic stance with slight 4D twist)
        const tw = Math.sin(p.twist) * 0.18;
        [-1, 1].forEach(side => {
            appendEllipsoid4D(verts, edges, faces, side * 0.36 * s, 0.78 * s, 0, w0 + side * 0.12, 0.105 * s, 0.105 * s, 0.105 * s, 6, 8);
            appendEllipsoid4D(verts, edges, faces, side * 0.45 * s, 0.50 * s, tw * side * s, w0 + side * 0.18, 0.08 * s, 0.24 * s, 0.08 * s, 6, 8, 0.1);
            appendEllipsoid4D(verts, edges, faces, side * 0.52 * s, 0.12 * s, (0.14 + tw * side) * s, w0 + side * 0.24, 0.068 * s, 0.22 * s, 0.068 * s, 6, 8, 0.15);
            appendEllipsoid4D(verts, edges, faces, side * 0.55 * s, -0.14 * s, (0.20 + tw * side) * s, w0 + side * 0.28, 0.06 * s, 0.08 * s, 0.05 * s, 5, 6);
        });

        // Thighs, Knees, Calves & Feet
        [-1, 1].forEach(side => {
            appendEllipsoid4D(verts, edges, faces, side * 0.15 * s, -0.34 * s, 0.02 * s, w0 - 0.1, 0.11 * s, 0.30 * s, 0.11 * s, 7, 10, 0.18);
            appendEllipsoid4D(verts, edges, faces, side * 0.16 * s, -0.66 * s, 0.04 * s, w0 - 0.14, 0.085 * s, 0.085 * s, 0.085 * s, 5, 8);
            appendEllipsoid4D(verts, edges, faces, side * 0.17 * s, -0.98 * s, -0.02 * s, w0 - 0.18, 0.082 * s, 0.28 * s, 0.085 * s, 7, 10, 0.22);
            appendPrism4D(verts, edges, faces, side * 0.17 * s, -1.27 * s, 0.07 * s, w0 - 0.2, 0.08 * s, 0.045 * s, 0.15 * s, 6, 0);
        });

        // 4D Vitruvian Hyper-Rings framing the figure
        const ringN = 28;
        const r1 = [], r2 = [];
        for (let i = 0; i < ringN; i++) {
            const a = (i / ringN) * TAU;
            r1.push([1.35 * s * Math.cos(a), 1.35 * s * Math.sin(a), 0.15 * s * Math.sin(a * 2), Math.cos(a + p.twist) * 0.45 + w0]);
            r2.push([1.05 * s * Math.cos(a), 0.4 * s * Math.sin(a), 1.05 * s * Math.sin(a), Math.sin(a * 2 + p.twist) * 0.5 + w0]);
        }
        appendTube4D(verts, edges, faces, r1, 0.026 * s, 5, true, 4);
        appendTube4D(verts, edges, faces, r2, 0.022 * s, 5, true, 4);

        return {
            verts, edges, faces,
            name_en: '4D Cyber Mannequin', name_fr: 'Mannequin Cyber 4D',
            desc_en: 'Real volumetric anatomical 4D humanoid sculpture framed by Vitruvian hyperspace rings.',
            desc_fr: 'Véritable sculpture humanoïde anatomique 4D encadrée d\'anneaux hyperdimensionnels de Vitruve.',
            icon: '🧍', color: '#00e5ff', category: 'real4d', tubeScale: 0.35
        };
    }

    /** 4D DNA Double Helix — Volumetric molecular strands + solid base pairs */
    function dna4d(p) {
        const steps = Math.max(24, Math.min(48, Math.round(p.segs * 1.4)));
        const r = p.radius * 0.62;
        const h = p.radius * 2.4;
        const turns = 2.0 + p.tube * 1.6;
        const verts = [], edges = [], faces = [];

        const strandA = [], strandB = [];
        for (let i = 0; i < steps; i++) {
            const u = i / (steps - 1);
            const a = u * TAU * turns + p.twist;
            const y = (u - 0.5) * h;
            const wA = Math.sin(a * 0.5) * 0.45 + p.wOffset;
            const wB = -Math.sin(a * 0.5) * 0.45 + p.wOffset;
            strandA.push([r * Math.cos(a), y, r * Math.sin(a), wA]);
            strandB.push([r * Math.cos(a + Math.PI), y, r * Math.sin(a + Math.PI), wB]);
        }
        appendTube4D(verts, edges, faces, strandA, 0.075 * p.radius, 6, false, 2);
        appendTube4D(verts, edges, faces, strandB, 0.075 * p.radius, 6, false, 2);

        // Base-pair molecular rungs
        const rungStep = Math.max(2, Math.floor(steps / 13));
        for (let i = 1; i < steps - 1; i += rungStep) {
            const pA = strandA[i], pB = strandB[i];
            const mid = [
                (pA[0] + pB[0]) * 0.5,
                (pA[1] + pB[1]) * 0.5,
                (pA[2] + pB[2]) * 0.5,
                (pA[3] + pB[3]) * 0.5
            ];
            appendTube4D(verts, edges, faces, [pA, mid, pB], 0.036 * p.radius, 5, false, 1);
            appendEllipsoid4D(verts, edges, faces, mid[0], mid[1], mid[2], mid[3], 0.07 * p.radius, 0.07 * p.radius, 0.07 * p.radius, 4, 6);
        }

        return {
            verts, edges, faces,
            name_en: '4D DNA Helix', name_fr: 'Hélice ADN 4D',
            desc_en: 'Real volumetric double-helix molecular sculpture with solid base-pair bridges twisting in W-space.',
            desc_fr: 'Sculpture moléculaire double-hélice volumétrique avec ponts de bases tournant dans l\'espace-W.',
            icon: '🧬', color: '#22ff99', category: 'real4d', tubeScale: 0.35
        };
    }

    /** 4D Chronos Astrolabe — Nested solid celestial gyroscope rings + crystal core */
    function astrolabe4d(p) {
        const n = Math.max(24, Math.min(44, p.segs + 12));
        const r = p.radius;
        const tThick = Math.max(0.035, p.tube * 0.16) * r;
        const verts = [], edges = [], faces = [];

        const rings = [
            { rad: r * 1.25, tiltX: 0.0,   tiltY: 0.0,   wAmp: 0.15 },
            { rad: r * 1.00, tiltX: 1.05,  tiltY: 0.4,   wAmp: 0.35 },
            { rad: r * 0.76, tiltX: -0.75, tiltY: 1.15,  wAmp: 0.55 },
            { rad: r * 0.52, tiltX: 1.57,  tiltY: -0.65, wAmp: 0.75 },
        ];
        rings.forEach((rg, idx) => {
            const pts = [];
            const cx = Math.cos(rg.tiltX + p.twist * (idx * 0.25));
            const sx = Math.sin(rg.tiltX + p.twist * (idx * 0.25));
            const cy = Math.cos(rg.tiltY);
            const sy = Math.sin(rg.tiltY);
            for (let i = 0; i < n; i++) {
                const a = (i / n) * TAU;
                const x0 = rg.rad * Math.cos(a);
                const y0 = rg.rad * Math.sin(a);
                const z0 = 0;
                const y1 = y0 * cx - z0 * sx;
                const z1 = y0 * sx + z0 * cx;
                const x2 = x0 * cy + z1 * sy;
                const z2 = -x0 * sy + z1 * cy;
                pts.push([x2, y1, z2, Math.sin(a * 2 + idx) * rg.wAmp + p.wOffset]);
            }
            appendTube4D(verts, edges, faces, pts, tThick * (1 - idx * 0.1), 6, true, 3);
        });

        // Central 4D faceted gemstone core
        appendEllipsoid4D(verts, edges, faces, 0, 0, 0, p.wOffset, r * 0.26, r * 0.36, r * 0.26, 4, 6);

        return {
            verts, edges, faces,
            name_en: '4D Chronos Astrolabe', name_fr: 'Astrolabe Chronos 4D',
            desc_en: 'Four nested solid celestial gimbal rings and a faceted hyper-crystal core rotating across 4D.',
            desc_fr: 'Quatre anneaux célestes solides imbriqués autour d\'un cœur de cristal tournant en 4D.',
            icon: '🧭', color: '#ffcc33', category: 'real4d', tubeScale: 0.4
        };
    }

    /** 4D Phoenix Wings — Layered solid sculpted angelic/dragon wings */
    function phoenix4d(p) {
        const r = p.radius;
        const verts = [], edges = [], faces = [];

        // Central crystalline body spire
        appendEllipsoid4D(verts, edges, faces, 0, 0.05 * r, 0, p.wOffset, 0.16 * r, 0.62 * r, 0.18 * r, 8, 8, -0.25);

        // 7 layered sculptural feather blades on left & right sides
        const featherCount = 7;
        const segsAlong = 9;
        [-1, 1].forEach(side => {
            for (let f = 0; f < featherCount; f++) {
                const frac = f / (featherCount - 1); // 0 = top primary, 1 = lower secondary
                const len = r * (1.55 - frac * 0.72);
                const baseAngle = (0.58 - frac * 1.18) + p.twist * 0.12;
                const width = r * (0.14 - frac * 0.035);
                const zSweep = -0.25 * r * Math.sin(frac * Math.PI);
                const startIdx = verts.length;

                for (let k = 0; k <= segsAlong; k++) {
                    const s = k / segsAlong;
                    const arch = Math.sin(s * Math.PI) * 0.35 * r * (1 - frac * 0.4);
                    const taper = Math.sin(Math.pow(s, 0.65) * Math.PI);
                    const cx = side * (0.14 * r + s * len * Math.cos(baseAngle));
                    const cy = (0.35 - frac * 0.62) * r + s * len * Math.sin(baseAngle) + arch;
                    const cz = zSweep - s * s * 0.35 * r;
                    const cw = Math.sin(s * Math.PI + frac * 2.2) * (0.35 + p.tube * 0.6) + p.wOffset;
                    const wHalf = width * Math.max(0.08, taper);
                    const thick = 0.035 * r * Math.max(0.2, taper);

                    // 4-point diamond cross-section per feather rib (true 3D solid blade!)
                    verts.push([cx, cy + wHalf, cz, cw]);
                    verts.push([cx, cy, cz + thick, cw + 0.04]);
                    verts.push([cx, cy - wHalf, cz, cw]);
                    verts.push([cx, cy, cz - thick, cw - 0.04]);
                }

                for (let k = 0; k < segsAlong; k++) {
                    for (let c = 0; c < 4; c++) {
                        const cn = (c + 1) % 4;
                        const a = startIdx + k * 4 + c;
                        const b = startIdx + (k + 1) * 4 + c;
                        const cc = startIdx + (k + 1) * 4 + cn;
                        const d = startIdx + k * 4 + cn;
                        faces.push([a, b, cc], [a, cc, d]);
                        if (c === 0 || c === 2) edges.push([a, b]);
                    }
                }
            }
        });

        return {
            verts, edges, faces,
            name_en: '4D Phoenix Wings', name_fr: 'Ailes de Phénix 4D',
            desc_en: 'Sculpted 14-blade volumetric wing monument folding gracefully through the 4th dimension.',
            desc_fr: 'Monument sculptural à 14 lames d\'ailes volumétriques déployées dans la 4ème dimension.',
            icon: '🦅', color: '#ff7722', category: 'real4d', tubeScale: 0.32
        };
    }

    /** 4D Mobius Monument — Watertight solid architectural twisted pavilion */
    function mobius4d(p) {
        const nu = Math.max(32, Math.min(64, p.segs * 2));
        const r = p.radius * 0.95;
        const halfW = r * (0.28 + p.tube * 0.35);
        const thick = r * 0.075;
        const twists = 1 + Math.round(p.twist * 0.5);
        const verts = [], edges = [], faces = [];

        // 4-point rectangular cross-section swept along a 4D Möbius ribbon (watertight solid!)
        for (let i = 0; i < nu; i++) {
            const u = (i / nu) * TAU;
            const halfTwist = (u * twists) * 0.5;
            const cu = Math.cos(u), su = Math.sin(u);
            const ct = Math.cos(halfTwist), st = Math.sin(halfTwist);

            // Local frame: radial (cu, 0, su), up (0, 1, 0), twisted normal
            const corners = [
                [-halfW, -thick],
                [ halfW, -thick],
                [ halfW,  thick],
                [-halfW,  thick],
            ];
            for (let c = 0; c < 4; c++) {
                const s = corners[c][0], th = corners[c][1];
                const radOff = s * ct - th * st;
                const upOff  = s * st + th * ct;
                const R = r + radOff;
                verts.push([
                    R * cu,
                    upOff,
                    R * su,
                    Math.sin(u * 2 + halfTwist) * 0.45 * p.radius + p.wOffset
                ]);
            }
        }

        // Connect loops (accounting for odd-twist flip at seam!)
        const seamShift = (twists % 2 === 1) ? 2 : 0;
        for (let i = 0; i < nu; i++) {
            const isSeam = (i === nu - 1);
            const iNext = (i + 1) % nu;
            for (let c = 0; c < 4; c++) {
                const cn = (c + 1) % 4;
                const cNext = isSeam ? (c + seamShift) % 4 : c;
                const cnNext = isSeam ? (cn + seamShift) % 4 : cn;
                const a = i * 4 + c;
                const b = iNext * 4 + cNext;
                const cc = iNext * 4 + cnNext;
                const d = i * 4 + cn;
                faces.push([a, b, cc], [a, cc, d]);
                if (c === 0 || c === 2) edges.push([a, b]);
                if (i % 4 === 0) edges.push([a, d]);
            }
        }

        return {
            verts, edges, faces,
            name_en: '4D Möbius Monument', name_fr: 'Monument Möbius 4D',
            desc_en: 'Watertight solid architectural Möbius ribbon elevated into 4D — ready for 3D printing & AR.',
            desc_fr: 'Ruban architectural de Möbius solide et étanche en 4D — prêt pour l\'impression 3D et l\'AR.',
            icon: '♾️', color: '#38bdf8', category: 'real4d', tubeScale: 0.35
        };
    }

    /** 4D Star Polytope — Stellated hyper-crystal with faceted pyramidal spikes */
    function hyperstar4d(p) {
        const r = p.radius;
        const spikeR = r * (1.28 + p.tube * 0.65);
        const verts = [], edges = [], faces = [];

        // Base icosahedron vertices (12) lifted alternately into ±W
        const phi = (1 + Math.sqrt(5)) / 2;
        const icoBase = [
            [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
            [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
            [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1],
        ];
        const norm = Math.hypot(1, phi);
        icoBase.forEach((v, idx) => {
            const w = ((idx % 2 === 0) ? 1 : -1) * 0.32 * r + p.wOffset;
            verts.push([v[0] / norm * r * 0.62, v[1] / norm * r * 0.62, v[2] / norm * r * 0.62, w]);
        });

        const icoFaces = [
            [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],
            [1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
            [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],
            [4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]
        ];

        // Stellate every triangular face into a 4D crystalline pyramid spire!
        icoFaces.forEach((f, idx) => {
            const a = verts[f[0]], b = verts[f[1]], c = verts[f[2]];
            let cx = (a[0] + b[0] + c[0]) / 3;
            let cy = (a[1] + b[1] + c[1]) / 3;
            let cz = (a[2] + b[2] + c[2]) / 3;
            const len = Math.hypot(cx, cy, cz) || 1;
            const tipIdx = verts.length;
            const wTip = Math.sin(idx * 0.9 + p.twist) * 0.65 * r + p.wOffset;
            verts.push([cx / len * spikeR, cy / len * spikeR, cz / len * spikeR, wTip]);

            faces.push([f[0], f[1], tipIdx], [f[1], f[2], tipIdx], [f[2], f[0], tipIdx]);
            edges.push([f[0], f[1]], [f[1], f[2]], [f[2], f[0]]);
            edges.push([f[0], tipIdx], [f[1], tipIdx], [f[2], tipIdx]);
        });

        return {
            verts, edges, faces,
            name_en: '4D Star Polytope', name_fr: 'Polytope Étoile 4D',
            desc_en: '20-spike stellated hyper-crystal with faceted pyramids extending into the 4th dimension.',
            desc_fr: 'Hypercristal étoilé à 20 pointes pyramidales facettées s\'étendant dans la 4ème dimension.',
            icon: '🌟', color: '#c084fc', category: 'real4d', tubeScale: 0.45
        };
    }

    /** 4D Royal Lotus Crown — Multi-tiered blooming volumetric sculpture */
    function crown4d(p) {
        const r = p.radius;
        const verts = [], edges = [], faces = [];
        const layers = [
            { petals: 6,  rad: r * 0.55, h: r * 0.85, tilt: 0.25, wShift:  0.35 },
            { petals: 10, rad: r * 0.92, h: r * 0.72, tilt: 0.58, wShift:  0.00 },
            { petals: 12, rad: r * 1.18, h: r * 0.45, tilt: 0.95, wShift: -0.35 },
        ];

        // Core jewel bud
        appendEllipsoid4D(verts, edges, faces, 0, 0.1 * r, 0, p.wOffset + 0.2, 0.22 * r, 0.34 * r, 0.22 * r, 6, 8);

        layers.forEach((L, li) => {
            for (let k = 0; k < L.petals; k++) {
                const a = (k / L.petals) * TAU + li * 0.31 + p.twist * 0.25;
                const ca = Math.cos(a), sa = Math.sin(a);
                const startIdx = verts.length;
                const segs = 6;
                for (let sIdx = 0; sIdx <= segs; sIdx++) {
                    const s = sIdx / segs;
                    const width = (0.19 - li * 0.02) * r * Math.sin(Math.pow(s, 0.6) * Math.PI);
                    const dist = 0.15 * r + s * L.rad * Math.sin(L.tilt + s * 0.45);
                    const y = -0.35 * r + s * L.h * Math.cos(L.tilt * 0.6) - s * s * 0.15 * r;
                    const cw = L.wShift + Math.sin(s * Math.PI) * 0.3 * p.tube + p.wOffset;
                    const thick = 0.025 * r;
                    const px = dist * ca, pz = dist * sa;
                    const tx = -sa * Math.max(0.02, width), tz = ca * Math.max(0.02, width);

                    verts.push([px + tx, y, pz + tz, cw]);
                    verts.push([px, y + thick, pz, cw + 0.04]);
                    verts.push([px - tx, y, pz - tz, cw]);
                    verts.push([px, y - thick, pz, cw - 0.04]);
                }
                for (let sIdx = 0; sIdx < segs; sIdx++) {
                    for (let c = 0; c < 4; c++) {
                        const cn = (c + 1) % 4;
                        const v0 = startIdx + sIdx * 4 + c;
                        const v1 = startIdx + (sIdx + 1) * 4 + c;
                        const v2 = startIdx + (sIdx + 1) * 4 + cn;
                        const v3 = startIdx + sIdx * 4 + cn;
                        faces.push([v0, v1, v2], [v0, v2, v3]);
                        if (c === 0 || c === 2) edges.push([v0, v1]);
                    }
                }
            }
        });

        return {
            verts, edges, faces,
            name_en: '4D Sacred Lotus', name_fr: 'Lotus Sacré 4D',
            desc_en: '28-petal three-tiered volumetric crystal lotus blooming across W-space.',
            desc_fr: 'Lotus cristallin volumétrique à 28 pétales sur 3 étages s\'épanouissant dans l\'espace-W.',
            icon: '🪷', color: '#f472b6', category: 'real4d', tubeScale: 0.3
        };
    }

    // ════════════════════════════════════════════════════════════════════════
    // CATEGORY 2: REGULAR 4D POLYTOPES (FIXED EXACT TOPOLOGY + REAL FACES!)
    // ════════════════════════════════════════════════════════════════════════

    /** Tesseract (8-Cell Hypercube) — 16 vertices, 32 edges, 24 ordered square faces (48 tris) */
    function tesseract(p) {
        const r = p.radius * 0.78;
        const verts = [];
        for (let w = -1; w <= 1; w += 2)
        for (let z = -1; z <= 1; z += 2)
        for (let y = -1; y <= 1; y += 2)
        for (let x = -1; x <= 1; x += 2)
            verts.push([x * r, y * r, z * r, w * r + p.wOffset]);

        const edges = [];
        const n = verts.length;
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                let diffs = 0;
                for (let k = 0; k < 4; k++) {
                    const a = k === 3 ? (verts[i][k] - p.wOffset) / r : verts[i][k] / r;
                    const b = k === 3 ? (verts[j][k] - p.wOffset) / r : verts[j][k] / r;
                    if (Math.abs(a - b) > 0.1) diffs++;
                }
                if (diffs === 1) edges.push([i, j]);
            }
        }

        const faces = [];
        for (let dim1 = 0; dim1 < 4; dim1++) {
            for (let dim2 = dim1 + 1; dim2 < 4; dim2++) {
                const other = [0, 1, 2, 3].filter(d => d !== dim1 && d !== dim2);
                for (const v1 of [-1, 1]) {
                    for (const v2 of [-1, 1]) {
                        const quad = [];
                        for (let idx = 0; idx < n; idx++) {
                            const c0 = other[0] === 3 ? (verts[idx][3] - p.wOffset) / r : verts[idx][other[0]] / r;
                            const c1 = other[1] === 3 ? (verts[idx][3] - p.wOffset) / r : verts[idx][other[1]] / r;
                            if (Math.abs(c0 - v1) < 0.1 && Math.abs(c1 - v2) < 0.1) {
                                quad.push(idx);
                            }
                        }
                        if (quad.length === 4) {
                            // Sort in cyclic order around square in (dim1, dim2) plane
                            quad.sort((ia, ib) => {
                                const a1 = dim1 === 3 ? verts[ia][3] - p.wOffset : verts[ia][dim1];
                                const a2 = dim2 === 3 ? verts[ia][3] - p.wOffset : verts[ia][dim2];
                                const b1 = dim1 === 3 ? verts[ib][3] - p.wOffset : verts[ib][dim1];
                                const b2 = dim2 === 3 ? verts[ib][3] - p.wOffset : verts[ib][dim2];
                                return Math.atan2(a2, a1) - Math.atan2(b2, b1);
                            });
                            faces.push([quad[0], quad[1], quad[2]], [quad[0], quad[2], quad[3]]);
                        }
                    }
                }
            }
        }

        return {
            verts, edges, faces,
            name_en: 'Tesseract (8-Cell)', name_fr: 'Tesseract (8-Cellules)',
            desc_en: 'The 4D hypercube — 16 vertices, 32 volumetric struts, 24 crystal faces, 8 cubic cells.',
            desc_fr: 'L\'hypercube 4D — 16 sommets, 32 arêtes volumétriques, 24 faces cristallines, 8 cellules cubiques.',
            icon: '🧊', color: '#00f3ff', category: 'polytopes', tubeScale: 1.0
        };
    }

    /** 5-Cell (Pentachoron / 4D Simplex) — 5 vertices, 10 edges, 10 triangular faces */
    function cell5(p) {
        const r = p.radius * 1.05;
        const s5 = 1 / Math.sqrt(5);
        const verts = [
            [ 1 * r,  1 * r,  1 * r, -s5 * r + p.wOffset],
            [ 1 * r, -1 * r, -1 * r, -s5 * r + p.wOffset],
            [-1 * r,  1 * r, -1 * r, -s5 * r + p.wOffset],
            [-1 * r, -1 * r,  1 * r, -s5 * r + p.wOffset],
            [ 0,      0,      0,     (Math.sqrt(5) - s5) * r * 0.72 + p.wOffset],
        ];
        // Scale down nicely
        verts.forEach(v => { v[0] *= 0.65; v[1] *= 0.65; v[2] *= 0.65; });
        const edges = [];
        const faces = [];
        for (let i = 0; i < 5; i++)
            for (let j = i + 1; j < 5; j++) edges.push([i, j]);
        for (let i = 0; i < 5; i++)
            for (let j = i + 1; j < 5; j++)
                for (let k = j + 1; k < 5; k++) faces.push([i, j, k]);

        return {
            verts, edges, faces,
            name_en: '5-Cell (Pentachoron)', name_fr: 'Pentachore (5-Cellules)',
            desc_en: 'The simplest regular 4D solid (4-simplex) — 5 vertices, 10 edges, 10 triangular faces.',
            desc_fr: 'Le solide 4D régulier le plus pur (4-simplexe) — 5 sommets, 10 arêtes, 10 faces triangulaires.',
            icon: '🔺', color: '#fb7185', category: 'polytopes', tubeScale: 1.1
        };
    }

    /** 16-Cell (4D Cross-Polytope) — 8 vertices, 24 edges, 32 triangular faces */
    function cell16(p) {
        const r = p.radius * 1.1;
        const verts = [
            [r, 0, 0, p.wOffset], [-r, 0, 0, p.wOffset],
            [0, r, 0, p.wOffset], [0, -r, 0, p.wOffset],
            [0, 0, r, p.wOffset], [0, 0, -r, p.wOffset],
            [0, 0, 0, r + p.wOffset], [0, 0, 0, -r + p.wOffset]
        ];
        const isOpp = (a, b) => Math.floor(a / 2) === Math.floor(b / 2);
        const edges = [];
        const faces = [];
        for (let i = 0; i < 8; i++) {
            for (let j = i + 1; j < 8; j++) {
                if (!isOpp(i, j)) edges.push([i, j]);
                for (let k = j + 1; k < 8; k++) {
                    if (!isOpp(i, j) && !isOpp(j, k) && !isOpp(i, k)) faces.push([i, j, k]);
                }
            }
        }
        return {
            verts, edges, faces,
            name_en: '16-Cell (Hyper-Octahedron)', name_fr: '16-Cellules (Hyper-Octaèdre)',
            desc_en: 'The 4D cross-polytope — 8 vertices, 24 edges, 32 triangular crystal faces.',
            desc_fr: 'Le cross-polytope 4D — 8 sommets, 24 arêtes, 32 faces triangulaires cristallines.',
            icon: '💎', color: '#ff00ea', category: 'polytopes', tubeScale: 1.0
        };
    }

    /** 24-Cell — FIXED! Exact 24 vertices, 96 edges, 96 triangular faces! */
    function cell24(p) {
        const r = p.radius * 0.78;
        const verts = [];
        // Strictly i < j so every permutation of (±1, ±1, 0, 0) appears EXACTLY ONCE (6 * 4 = 24 vertices!)
        for (let i = 0; i < 4; i++) {
            for (let j = i + 1; j < 4; j++) {
                for (const si of [1, -1]) {
                    for (const sj of [1, -1]) {
                        const v = [0, 0, 0, 0];
                        v[i] = si * r;
                        v[j] = sj * r;
                        v[3] += p.wOffset;
                        verts.push(v);
                    }
                }
            }
        }
        // Edges: vertices at squared Euclidean distance 2*r^2 (exact 96 edges!)
        const edges = [];
        const adj = Array.from({ length: verts.length }, () => new Set());
        const dist2 = 2 * r * r;
        const tol = 0.05 * r * r;
        for (let i = 0; i < verts.length; i++) {
            for (let j = i + 1; j < verts.length; j++) {
                let d2 = 0;
                for (let k = 0; k < 4; k++) d2 += (verts[i][k] - verts[j][k]) ** 2;
                if (Math.abs(d2 - dist2) < tol) {
                    edges.push([i, j]);
                    adj[i].add(j);
                    adj[j].add(i);
                }
            }
        }
        // Triangles: 3 mutually adjacent vertices (exact 96 triangular faces!)
        const faces = [];
        for (let i = 0; i < verts.length; i++) {
            for (const j of adj[i]) {
                if (j <= i) continue;
                for (const k of adj[j]) {
                    if (k <= j) continue;
                    if (adj[i].has(k)) faces.push([i, j, k]);
                }
            }
        }

        return {
            verts, edges, faces,
            name_en: '24-Cell', name_fr: 'Cellule 24',
            desc_en: 'Unique self-dual regular 4D polytope — exact 24 vertices, 96 edges, 96 triangular faces.',
            desc_fr: 'Polytope 4D régulier auto-dual unique — exactement 24 sommets, 96 arêtes, 96 faces triangulaires.',
            icon: '🔷', color: '#9d00ff', category: 'polytopes', tubeScale: 0.78
        };
    }

    /** Duoprism (n x m Cartesian circle product in 4D) */
    function duoprism(p) {
        const n = Math.max(4, Math.min(14, Math.floor(p.segs / 3)));
        const m = Math.max(4, Math.min(10, Math.floor(p.segs / 4)));
        const r1 = p.radius * 0.9, r2 = Math.max(0.28, p.tube * 1.65) * p.radius;
        const verts = [], edges = [], faces = [];
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < m; j++) {
                const a = (i / n) * TAU + p.twist * 0.5;
                const b = (j / m) * TAU;
                verts.push([r1 * Math.cos(a), r1 * Math.sin(a), r2 * Math.cos(b), r2 * Math.sin(b) + p.wOffset]);
            }
        }
        connectGrid(edges, faces, 0, n, m, true, true, 1);
        return {
            verts, edges, faces,
            name_en: 'Duoprism', name_fr: 'Duoprisme 4D',
            desc_en: `${n}×${m} Duoprism — Cartesian product of two polygons with solid quad-triangulated 4D cells.`,
            desc_fr: `Duoprisme ${n}×${m} — produit cartésien de deux polygones à cellules 4D solides.`,
            icon: '🔁', color: '#ffcc00', category: 'polytopes', tubeScale: 0.68
        };
    }

    // ════════════════════════════════════════════════════════════════════════
    // CATEGORY 3: 4D SURFACES & MANIFOLDS (ALL SOLID TRIANGULATED!)
    // ════════════════════════════════════════════════════════════════════════

    /** Clifford Torus */
    function cliffordTorus(p) {
        const n = Math.max(10, Math.min(28, Math.round(p.segs * 0.85)));
        const r = p.radius * 0.85;
        const verts = [], edges = [], faces = [];
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const a = (i / n) * TAU + p.twist;
                const b = (j / n) * TAU;
                verts.push([r * Math.cos(a), r * Math.sin(a), r * Math.cos(b), r * Math.sin(b) + p.wOffset]);
            }
        }
        connectGrid(edges, faces, 0, n, n, true, true, 2);
        return {
            verts, edges, faces,
            name_en: 'Clifford Torus', name_fr: 'Tore de Clifford',
            desc_en: 'Flat minimal torus embedded cleanly on S³ in 4D with full solid mesh surface.',
            desc_fr: 'Tore plat minimal plongé sur S³ en 4D avec surface maillée solide complète.',
            icon: '🌀', color: '#00ffaa', category: 'surfaces', tubeScale: 0.42
        };
    }

    /** Hopf Fibration — True linked 3D/4D fiber rings as volumetric tubes! */
    function hopfFibration(p) {
        const nFibers = Math.max(8, Math.min(18, Math.floor(p.segs * 0.55)));
        const nPts = Math.max(16, Math.min(28, Math.floor(p.segs * 0.85)));
        const r = p.radius * 0.92;
        const verts = [], edges = [], faces = [];
        for (let fi = 0; fi < nFibers; fi++) {
            const lat = ((fi + 0.5) / nFibers) * Math.PI * 0.78 + 0.12;
            const lon = (fi / nFibers) * TAU * 1.618 + p.twist;
            const cEta = Math.cos(lat * 0.5), sEta = Math.sin(lat * 0.5);
            const pts = [];
            for (let k = 0; k < nPts; k++) {
                const xi = (k / nPts) * TAU;
                pts.push([
                    r * cEta * Math.cos(xi + lon * 0.5),
                    r * cEta * Math.sin(xi + lon * 0.5),
                    r * sEta * Math.cos(xi - lon * 0.5),
                    r * sEta * Math.sin(xi - lon * 0.5) + p.wOffset
                ]);
            }
            appendTube4D(verts, edges, faces, pts, 0.032 * p.radius * (0.7 + p.tube), 5, true, 3);
        }
        return {
            verts, edges, faces,
            name_en: 'Hopf Fibration', name_fr: 'Fibration de Hopf',
            desc_en: 'Linked Villarceau fiber rings filling the 3-sphere S³ without intersecting — sculpted as 3D tubes.',
            desc_fr: 'Anneaux de fibres liés remplissant la 3-sphère S³ sans intersection — sculptés en tubes 3D.',
            icon: '🌐', color: '#ff88ff', category: 'surfaces', tubeScale: 0.35
        };
    }

    /** Klein Bottle (4D non-self-intersecting solid surface!) */
    function kleinBottle(p) {
        const nu = Math.max(16, Math.min(32, p.segs));
        const nv = Math.max(12, Math.min(24, Math.floor(p.segs * 0.75)));
        const a = p.radius * 0.82, b = Math.max(0.22, p.tube * 1.05) * p.radius;
        const verts = [], edges = [], faces = [];
        for (let ui = 0; ui < nu; ui++) {
            const u = (ui / nu) * TAU;
            const cu = Math.cos(u), su = Math.sin(u);
            const chu = Math.cos(u * 0.5), shu = Math.sin(u * 0.5);
            for (let vi = 0; vi < nv; vi++) {
                const v = (vi / nv) * TAU;
                const cv = Math.cos(v), sv = Math.sin(v);
                verts.push([
                    (a + b * cv) * cu,
                    (a + b * cv) * su,
                    b * sv * chu + p.twist * 0.12 * su,
                    b * sv * shu + p.wOffset
                ]);
            }
        }
        connectGrid(edges, faces, 0, nu, nv, true, true, 2);
        return {
            verts, edges, faces,
            name_en: 'Klein Bottle', name_fr: 'Bouteille de Klein',
            desc_en: 'True non-orientable 4D manifold surface with no inside or outside — solid triangulated mesh.',
            desc_fr: 'Véritable surface 4D non-orientable sans dedans ni dehors — maillage solide complet.',
            icon: '🍶', color: '#ff5500', category: 'surfaces', tubeScale: 0.38
        };
    }

    /** 4D Torus Knot — Sculpted solid volumetric tube along a (2,3) 4D knot! */
    function torusKnot4d(p) {
        const n = Math.max(48, Math.min(96, p.segs * 3));
        const r = p.radius * 0.85, t2 = Math.max(0.2, p.tube * 1.1) * p.radius;
        const P = 2, Q = 3;
        const pts = [];
        for (let i = 0; i < n; i++) {
            const t = (i / n) * TAU;
            const phi = P * t, psi = Q * t + p.twist;
            pts.push([
                (r + t2 * Math.cos(psi)) * Math.cos(phi),
                (r + t2 * Math.cos(psi)) * Math.sin(phi),
                t2 * Math.sin(psi),
                t2 * Math.sin(psi + phi * 0.5) * 0.65 + p.wOffset
            ]);
        }
        const verts = [], edges = [], faces = [];
        appendTube4D(verts, edges, faces, pts, 0.11 * p.radius, 7, true, 3);
        return {
            verts, edges, faces,
            name_en: '4D Torus Knot', name_fr: 'Nœud Toroïdal 4D',
            desc_en: `Volumetric (${P},${Q}) trefoil torus knot lifted into 4D with continuous solid tubing.`,
            desc_fr: `Nœud toroïdal volumétrique (${P},${Q}) élevé en 4D avec tubage solide continu.`,
            icon: '🎀', color: '#ffcc00', category: 'surfaces', tubeScale: 0.4
        };
    }

    /** 3-Sphere S³ Concentric Shells */
    function hypersphere(p) {
        const nu = Math.max(10, Math.min(18, Math.floor(p.segs * 0.6)));
        const nv = Math.max(12, Math.min(22, Math.floor(p.segs * 0.75)));
        const nw = 3;
        const r = p.radius * 1.02;
        const verts = [], edges = [], faces = [];
        for (let wi = 0; wi < nw; wi++) {
            const wAngle = ((wi + 0.5) / nw) * Math.PI;
            const wVal = Math.cos(wAngle) * r * 0.75 + p.wOffset;
            const rSlice = Math.sin(wAngle) * r;
            const startIdx = verts.length;
            for (let ui = 0; ui <= nu; ui++) {
                const u = (ui / nu) * Math.PI;
                for (let vi = 0; vi < nv; vi++) {
                    const v = (vi / nv) * TAU + p.twist * 0.3;
                    verts.push([
                        rSlice * Math.sin(u) * Math.cos(v),
                        rSlice * Math.cos(u),
                        rSlice * Math.sin(u) * Math.sin(v),
                        wVal
                    ]);
                }
            }
            connectGrid(edges, faces, startIdx, nu + 1, nv, false, true, 2);
        }
        return {
            verts, edges, faces,
            name_en: '3-Sphere Shells', name_fr: 'Coques de 3-Sphère',
            desc_en: 'Nested solid latitude shells of the 4D hypersphere S³.',
            desc_fr: 'Coques solides concentriques de l\'hypersphère 4D S³.',
            icon: '🌍', color: '#4488ff', category: 'surfaces', tubeScale: 0.36
        };
    }

    // ════════════════════════════════════════════════════════════════════════
    // CATEGORY 4: ORGANIC 4D (SOLID SCULPTED FORMS)
    // ════════════════════════════════════════════════════════════════════════

    /** 4D Jellyfish — Sculpted pulsing bell + 10 volumetric tentacles */
    function jellyfish4d(p) {
        const nu = Math.max(10, Math.min(18, Math.floor(p.segs * 0.6)));
        const nv = Math.max(16, Math.min(28, p.segs));
        const r = p.radius * 0.92;
        const verts = [], edges = [], faces = [];

        // Sculpted domed bell
        for (let ui = 0; ui <= nu; ui++) {
            const frac = ui / nu;
            const u = frac * Math.PI * 0.62;
            const frill = frac > 0.7 ? Math.sin(frac * 12) * 0.08 * r : 0;
            for (let vi = 0; vi < nv; vi++) {
                const v = (vi / nv) * TAU;
                const rad = r * Math.sin(u) + frill * Math.cos(v * 6);
                const y = r * 0.55 * Math.cos(u) + 0.35 * r;
                verts.push([
                    rad * Math.cos(v),
                    y,
                    rad * Math.sin(v),
                    Math.sin(v * 3 + frac * 4 + p.twist) * p.tube * 0.48 + p.wOffset
                ]);
            }
        }
        connectGrid(edges, faces, 0, nu + 1, nv, false, true, 2);

        // 10 volumetric undulating tentacles
        for (let ti = 0; ti < 10; ti++) {
            const ang = (ti / 10) * TAU + p.twist;
            const pts = [];
            for (let k = 0; k < 10; k++) {
                const s = k / 9;
                const rad = r * (0.52 - s * 0.22);
                pts.push([
                    rad * Math.cos(ang) + Math.sin(s * 5 + ti) * 0.14 * r,
                    0.28 * r - s * 1.55 * r,
                    rad * Math.sin(ang) + Math.cos(s * 4 + ti) * 0.14 * r,
                    Math.sin(s * 3 + ang) * 0.42 * p.tube + p.wOffset
                ]);
            }
            appendTube4D(verts, edges, faces, pts, (s) => 0.042 * r * (1 - s * 0.65), 4, false, 3);
        }

        return {
            verts, edges, faces,
            name_en: '4D Jellyfish', name_fr: 'Méduse 4D',
            desc_en: 'Sculpted pulsing 4D bioluminescent bell with 10 volumetric W-space tentacles.',
            desc_fr: 'Cloche bioluminescente 4D sculptée avec 10 tentacules volumétriques dans l\'espace-W.',
            icon: '🪼', color: '#44ffdd', category: 'organic', tubeScale: 0.35
        };
    }

    /** Seraphim Wings — Double-curved glowing ribbon manifold */
    function seraphim4d(p) {
        const n = Math.max(36, Math.min(72, p.segs * 2));
        const r = p.radius;
        const pts = [];
        for (let i = 0; i < n; i++) {
            const t = (i / n) * TAU;
            const wingSpan = Math.pow(Math.abs(Math.sin(t * 3)), 0.55) * 1.15;
            pts.push([
                wingSpan * r * Math.cos(t),
                Math.sin(t) * r * 0.95,
                Math.cos(t * 2) * (0.25 + p.tube * 0.55) * r,
                Math.sin(t * 5 + p.twist) * 0.45 * r + p.wOffset
            ]);
        }
        const verts = [], edges = [], faces = [];
        appendTube4D(verts, edges, faces, pts, (s) => 0.07 * r * (0.5 + 0.5 * Math.abs(Math.sin(s * TAU * 3))), 5, true, 3);
        return {
            verts, edges, faces,
            name_en: 'Seraphim Wings', name_fr: 'Ailes de Séraphin',
            desc_en: 'Continuous infinite 4D angelic ribbon wings sculpted in volumetric crystal.',
            desc_fr: 'Ailes angéliques infinies 4D sculptées en ruban cristallin volumétrique.',
            icon: '👼', color: '#fef08a', category: 'organic', tubeScale: 0.38
        };
    }

    /** Neural Parasite — Volumetric branching 4D dendritic coral/neuron */
    function neuralParasite(p) {
        const branches = 6;
        const depth = 3;
        const r0 = p.radius;
        const verts = [], edges = [], faces = [];

        // Central soma nucleus
        appendEllipsoid4D(verts, edges, faces, 0, 0, 0, p.wOffset, 0.22 * r0, 0.22 * r0, 0.22 * r0, 6, 8);

        function grow(pStart, dir, level, len, rad) {
            if (level === 0) return;
            const pEnd = [
                pStart[0] + dir[0] * len,
                pStart[1] + dir[1] * len,
                pStart[2] + dir[2] * len,
                pStart[3] + dir[3] * len * 0.65,
            ];
            const pMid = [
                (pStart[0] + pEnd[0]) * 0.5 + dir[1] * len * 0.12,
                (pStart[1] + pEnd[1]) * 0.5 - dir[0] * len * 0.12,
                (pStart[2] + pEnd[2]) * 0.5,
                (pStart[3] + pEnd[3]) * 0.5,
            ];
            appendTube4D(verts, edges, faces, [pStart, pMid, pEnd], (s) => rad * (1 - s * 0.35), 4, false, 1);
            if (level === 1) {
                appendEllipsoid4D(verts, edges, faces, pEnd[0], pEnd[1], pEnd[2], pEnd[3], rad * 1.4, rad * 1.4, rad * 1.4, 4, 6);
            }
            const childCount = level > 1 ? 3 : 2;
            for (let c = 0; c < childCount; c++) {
                const angle = (c / childCount) * TAU + level * 1.1;
                const childDir = [
                    dir[0] * 0.55 + Math.cos(angle) * 0.52,
                    dir[1] * 0.55 + Math.sin(angle) * 0.52,
                    dir[2] * 0.55 + Math.sin(angle + 1.2) * 0.45,
                    dir[3] * 0.45 + Math.cos(angle * 2) * 0.4,
                ];
                grow(pEnd, childDir, level - 1, len * 0.62, rad * 0.68);
            }
        }
        for (let b = 0; b < branches; b++) {
            const angle = (b / branches) * TAU + p.twist;
            const elev = (b % 2 === 0 ? 0.38 : -0.38);
            grow([0, 0, 0, p.wOffset], [Math.cos(angle), Math.sin(angle), elev, Math.sin(angle * 2) * 0.35], depth, r0 * 0.58, 0.068 * r0);
        }
        return {
            verts, edges, faces,
            name_en: 'Neural Dendrite', name_fr: 'Dendrite Neurale 4D',
            desc_en: 'Volumetric branching 4D neural organism with synaptic nodes extending through W-space.',
            desc_fr: 'Organisme neural ramifié volumétrique 4D avec nœuds synaptiques dans l\'espace-W.',
            icon: '🧠', color: '#ff77aa', category: 'organic', tubeScale: 0.35
        };
    }

    // ════════════════════════════════════════════════════════════════════════
    // CATEGORY 5: ABSTRACT 4D (FIXED QUANTUM FLOWER + VOLUMETRIC TUBES)
    // ════════════════════════════════════════════════════════════════════════

    /** 4D Lissajous Knot — Volumetric braided space curve */
    function lissajous4d(p) {
        const n = Math.max(64, Math.min(120, p.segs * 4));
        const r = p.radius * 0.92;
        const a = 3, b = 4, c = 5, d = 7;
        const pts = [];
        for (let i = 0; i < n; i++) {
            const t = (i / n) * TAU;
            pts.push([
                r * Math.cos(a * t + p.twist),
                r * Math.cos(b * t),
                r * Math.cos(c * t + 1.0),
                r * Math.cos(d * t + 0.5) * (0.35 + p.tube * 0.8) + p.wOffset
            ]);
        }
        const verts = [], edges = [], faces = [];
        appendTube4D(verts, edges, faces, pts, 0.065 * p.radius, 6, true, 4);
        return {
            verts, edges, faces,
            name_en: '4D Lissajous Knot', name_fr: 'Nœud Lissajous 4D',
            desc_en: `Volumetric 4D Lissajous sculpture with harmonic frequencies (${a},${b},${c},${d}).`,
            desc_fr: `Sculpture de Lissajous 4D volumétrique aux fréquences harmoniques (${a},${b},${c},${d}).`,
            icon: '∿', color: '#67e8f9', category: 'abstract', tubeScale: 0.35
        };
    }

    /** 4D Hyperspiral — Solid volumetric 4D DNA-like coiled vortex */
    function spiral4d(p) {
        const n = Math.max(60, Math.min(110, p.segs * 3));
        const r = p.radius * 0.95;
        const pts = [];
        for (let i = 0; i < n; i++) {
            const s = i / (n - 1);
            const t = s * TAU * 4.5;
            const env = 0.25 + 0.75 * Math.sin(s * Math.PI);
            pts.push([
                r * Math.cos(t) * env,
                (s - 0.5) * 2.1 * r,
                r * Math.sin(t) * env,
                r * Math.sin(t * 0.5 + p.twist) * (0.4 + p.tube) + p.wOffset
            ]);
        }
        const verts = [], edges = [], faces = [];
        appendTube4D(verts, edges, faces, pts, (s) => 0.075 * r * (0.35 + 0.65 * Math.sin(s * Math.PI)), 6, false, 3);
        return {
            verts, edges, faces,
            name_en: '4D Hyperspiral', name_fr: 'Hyper-Spirale 4D',
            desc_en: 'Sculpted volumetric helix spiraling continuously through all four dimensions.',
            desc_fr: 'Hélice volumétrique sculptée spiralant simultanément dans les 4 dimensions.',
            icon: '🌪️', color: '#ffaa00', category: 'abstract', tubeScale: 0.35
        };
    }

    /** Quantum Flower — FIXED k-petal 4D volumetric rose sculpture! (Fixed k*t/k bug!) */
    function quantumFlower(p) {
        const k = Math.max(3, Math.min(9, Math.floor(p.tube * 10) + 3));
        const nu = Math.max(36, Math.min(72, p.segs * 2));
        const nv = 10;
        const r = p.radius * 1.05;
        const verts = [], edges = [], faces = [];

        // True k-petal rhodonea blooming 3D/4D manifold!
        for (let ui = 0; ui < nu; ui++) {
            const th = (ui / nu) * TAU;
            const petal = 0.38 + 0.62 * Math.abs(Math.cos(k * th * 0.5));
            for (let vi = 0; vi <= nv; vi++) {
                const s = vi / nv; // 0 = center, 1 = petal tip
                const rad = r * s * petal;
                const cupY = (s * s * 0.55 - 0.22) * r + Math.sin(k * th) * 0.14 * r * s;
                const w = Math.sin(k * th + s * Math.PI + p.twist) * 0.45 * r + p.wOffset;
                verts.push([rad * Math.cos(th), cupY, rad * Math.sin(th), w]);
            }
        }
        connectGrid(edges, faces, 0, nu, nv + 1, true, false, 2);

        return {
            verts, edges, faces,
            name_en: 'Quantum Flower', name_fr: 'Fleur Quantique',
            desc_en: `True ${k}-petal 4D blooming rose manifold — mathematically fixed & sculpted in full 3D/4D.`,
            desc_fr: `Véritable fleur quantique 4D à ${k} pétales — corrigée mathématiquement et sculptée en 3D/4D.`,
            icon: '🌸', color: '#ff66cc', category: 'abstract', tubeScale: 0.32
        };
    }

    // ════════════════════════════════════════════════════════════════════════
    // CATEGORY 6: ALIENS 4D (UPGRADED FROM 2D WIRE CIRCLES TO SOLID 3D/4D!)
    // ════════════════════════════════════════════════════════════════════════

    /** Alien Vortex Eye — Sculpted 3D concave iris funnel + domed crystal pupil */
    function vortexEye(p) {
        const nu = Math.max(20, Math.min(36, p.segs + 6));
        const nv = 10;
        const r = p.radius;
        const verts = [], edges = [], faces = [];

        // Sculpted 3D iris funnel
        for (let ui = 0; ui < nu; ui++) {
            const t = (ui / nu) * TAU;
            for (let vi = 0; vi <= nv; vi++) {
                const s = vi / nv;
                const rad = r * (0.24 + s * 0.92);
                const z = Math.cos(s * Math.PI) * 0.38 * r + Math.sin(t * 6 + p.twist) * 0.06 * r * s;
                const w = Math.sin(t * 3 + s * 4) * 0.4 * p.tube * r + p.wOffset;
                verts.push([rad * Math.cos(t), rad * Math.sin(t), z, w]);
            }
        }
        connectGrid(edges, faces, 0, nu, nv + 1, true, false, 2);

        // Glowing central eyeball orb
        appendEllipsoid4D(verts, edges, faces, 0, 0, 0.08 * r, p.wOffset + 0.25, 0.28 * r, 0.28 * r, 0.28 * r, 6, 10);

        return {
            verts, edges, faces,
            name_en: 'Vortex Eye', name_fr: 'Œil Vortex 4D',
            desc_en: 'Hyperdimensional 3D/4D alien iris vortex with glowing crystalline central orb.',
            desc_fr: 'Vortex d\'iris extraterrestre 3D/4D avec orbe central cristallin lumineux.',
            icon: '👁️', color: '#ff4488', category: 'aliens', tubeScale: 0.38
        };
    }

    /** Plasma Amoeba — Closed undulating organic 4D metaball membrane + nucleus */
    function plasmaAmoeba(p) {
        const nu = Math.max(14, Math.min(24, Math.floor(p.segs * 0.8)));
        const nv = Math.max(18, Math.min(32, p.segs));
        const r = p.radius * 0.88;
        const verts = [], edges = [], faces = [];

        for (let ui = 0; ui <= nu; ui++) {
            const u = (ui / nu) * Math.PI;
            const su = Math.sin(u), cu = Math.cos(u);
            for (let vi = 0; vi < nv; vi++) {
                const v = (vi / nv) * TAU;
                const blob = 1 + 0.26 * Math.sin(v * 5 + p.twist) * su + 0.18 * Math.cos(u * 4) * Math.sin(v * 3);
                const rad = r * blob;
                verts.push([
                    rad * su * Math.cos(v),
                    rad * cu * 0.82,
                    rad * su * Math.sin(v),
                    Math.sin(v * 5 + u * 2) * 0.45 * p.tube + p.wOffset
                ]);
            }
        }
        connectGrid(edges, faces, 0, nu + 1, nv, false, true, 2);
        appendEllipsoid4D(verts, edges, faces, 0, 0, 0, p.wOffset + 0.3, 0.32 * r, 0.32 * r, 0.32 * r, 5, 8);

        return {
            verts, edges, faces,
            name_en: 'Plasma Amoeba', name_fr: 'Amibe Plasma 4D',
            desc_en: 'Living 3D/4D alien plasma membrane with undulating pseudopods and luminous inner core.',
            desc_fr: 'Membrane plasma extraterrestre 3D/4D vivante à pseudopodes ondulants et noyau lumineux.',
            icon: '🦠', color: '#44ffaa', category: 'aliens', tubeScale: 0.35
        };
    }

    /** Dimensional Rift — Twisted 3D/4D wormhole spacetime tear */
    function dimensionalRift(p) {
        const nu = Math.max(18, Math.min(32, p.segs));
        const nv = 12;
        const r = p.radius;
        const verts = [], edges = [], faces = [];

        // Hourglass wormhole throat with jagged spacetime fracture waves
        for (let ui = 0; ui < nu; ui++) {
            const t = (ui / nu) * TAU;
            for (let vi = 0; vi <= nv; vi++) {
                const s = (vi / nv) * 2 - 1; // -1..1
                const throat = 0.25 + 0.75 * s * s;
                const crack = 1 + 0.18 * Math.sin(t * 5 + s * 4 + p.twist);
                const rad = r * throat * crack;
                verts.push([
                    rad * Math.cos(t + s * 0.7),
                    s * r * 1.15,
                    rad * Math.sin(t + s * 0.7),
                    Math.cos(t * 3 - s * 3) * 0.55 * (0.5 + p.tube) + p.wOffset
                ]);
            }
        }
        connectGrid(edges, faces, 0, nu, nv + 1, true, false, 2);

        return {
            verts, edges, faces,
            name_en: 'Dimensional Rift', name_fr: 'Faille Dimensionnelle',
            desc_en: 'Volumetric wormhole tear in spacetime warping across X, Y, Z, and W.',
            desc_fr: 'Déchirure spatio-temporelle volumétrique en trou de ver dans les 4 dimensions.',
            icon: '⚡', color: '#ff8800', category: 'aliens', tubeScale: 0.36
        };
    }

    /** Void Tendril — Central dark-matter orb + 8 curling volumetric tentacles */
    function voidTendril(p) {
        const tentacles = 8, segs = 12, r = p.radius;
        const verts = [], edges = [], faces = [];
        appendEllipsoid4D(verts, edges, faces, 0, 0, 0, p.wOffset, 0.28 * r, 0.28 * r, 0.28 * r, 6, 10);

        for (let t = 0; t < tentacles; t++) {
            const baseAngle = (t / tentacles) * TAU + p.twist;
            const elev = ((t % 2 === 0) ? 1 : -1) * 0.35;
            const pts = [];
            for (let k = 0; k <= segs; k++) {
                const s = k / segs;
                const curl = s * s * 3.1;
                pts.push([
                    r * (0.2 + s * 1.15) * Math.cos(baseAngle + curl * 0.65),
                    r * elev * s + Math.sin(s * 6 + t) * 0.22 * r,
                    r * (0.2 + s * 1.15) * Math.sin(baseAngle + curl * 0.65),
                    Math.cos(s * 4 + t) * 0.5 * (0.3 + p.tube) + p.wOffset
                ]);
            }
            appendTube4D(verts, edges, faces, pts, (s) => 0.068 * r * (1 - s * 0.72), 5, false, 2);
        }
        return {
            verts, edges, faces,
            name_en: 'Void Tendril', name_fr: 'Tentacules du Vide',
            desc_en: 'Dark-matter entity with 8 solid curling tentacles writhing into the 4th dimension.',
            desc_fr: 'Entité de matière sombre à 8 tentacules solides s\'enroulant dans la 4ème dimension.',
            icon: '🐙', color: '#cc44ff', category: 'aliens', tubeScale: 0.34
        };
    }

    /** Scyphozoa 4D — Hyperspace alien medusa with sculpted bell & 12 filaments */
    function scyphozoa4d(p) {
        const nu = 10, nv = Math.max(16, Math.min(28, p.segs));
        const r = p.radius * 0.92;
        const verts = [], edges = [], faces = [];

        for (let ui = 0; ui <= nu; ui++) {
            const frac = ui / nu;
            const u = frac * Math.PI * 0.55;
            for (let vi = 0; vi < nv; vi++) {
                const v = (vi / nv) * TAU;
                const pulse = 1 + Math.sin(v * 5 + p.twist) * 0.14 * frac;
                const rad = r * Math.sin(u) * pulse;
                verts.push([
                    rad * Math.cos(v),
                    r * 0.55 * Math.cos(u) + 0.42 * r,
                    rad * Math.sin(v),
                    Math.sin(v * 5 + frac * 3) * 0.42 * p.tube + p.wOffset
                ]);
            }
        }
        connectGrid(edges, faces, 0, nu + 1, nv, false, true, 2);

        for (let fi = 0; fi < 12; fi++) {
            const angle = (fi / 12) * TAU + p.twist;
            const pts = [];
            for (let k = 0; k < 10; k++) {
                const s = k / 9;
                pts.push([
                    r * 0.56 * Math.cos(angle) * (1 - s * 0.35),
                    0.35 * r - s * 1.65 * r,
                    r * 0.56 * Math.sin(angle) * (1 - s * 0.35) + Math.sin(s * 7 + fi) * 0.12 * r,
                    s * 0.55 * Math.cos(angle * 2) + p.wOffset
                ]);
            }
            appendTube4D(verts, edges, faces, pts, (s) => 0.036 * r * (1 - s * 0.65), 4, false, 3);
        }

        return {
            verts, edges, faces,
            name_en: 'Scyphozoa 4D', name_fr: 'Scyphozoaire 4D',
            desc_en: 'Alien hyperspace medusa with fluted crystalline bell and 12 volumetric W-filaments.',
            desc_fr: 'Méduse spatiale extraterrestre à cloche cristalline et 12 filaments volumétriques W.',
            icon: '🌊', color: '#00ccff', category: 'aliens', tubeScale: 0.34
        };
    }

    /** Crystalline Hive — 7 solid 3D hexagonal crystal prisms bonded in 4D */
    function crystallineHive(p) {
        const r = p.radius;
        const verts = [], edges = [], faces = [];
        const hCenter = 0.55 * r * (0.7 + p.tube);
        appendPrism4D(verts, edges, faces, 0, 0, 0, p.wOffset, 0.34 * r, hCenter, 0.34 * r, 6, 0.25);
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * TAU + p.twist * 0.35;
            const d = r * 0.72;
            const hCell = (0.34 + 0.16 * (i % 2)) * r * (0.7 + p.tube);
            const yOff = Math.sin(angle * 2) * 0.18 * r;
            const cw = p.wOffset + Math.cos(angle) * 0.38 * r;
            appendPrism4D(verts, edges, faces, d * Math.cos(angle), yOff, d * Math.sin(angle), cw, 0.26 * r, hCell, 0.26 * r, 6, 0.18);
        }
        return {
            verts, edges, faces,
            name_en: 'Crystalline Hive', name_fr: 'Ruche Cristalline',
            desc_en: '7 solid hexagonal 3D crystal prism cells bonded in 4D hyperspace.',
            desc_fr: '7 prismes hexagonaux cristallins 3D solides liés dans l\'hyperespace 4D.',
            icon: '🔶', color: '#ffdd00', category: 'aliens', tubeScale: 0.45
        };
    }

    // ─── CATALOG ─────────────────────────────────────────────────────────────
    const catalog = {
        real4d: [
            { id: 'heart4d',     gen: heart4d        },
            { id: 'mannequin4d', gen: mannequin4d    },
            { id: 'dna4d',       gen: dna4d          },
            { id: 'astrolabe4d', gen: astrolabe4d    },
            { id: 'phoenix4d',   gen: phoenix4d      },
            { id: 'mobius4d',    gen: mobius4d       },
            { id: 'hyperstar4d', gen: hyperstar4d    },
            { id: 'crown4d',     gen: crown4d        },
        ],
        polytopes: [
            { id: 'tesseract',   gen: tesseract      },
            { id: 'cell5',       gen: cell5          },
            { id: 'cell16',      gen: cell16         },
            { id: 'cell24',      gen: cell24         },
            { id: 'duoprism',    gen: duoprism       },
        ],
        surfaces: [
            { id: 'clifford',    gen: cliffordTorus  },
            { id: 'hopf',        gen: hopfFibration  },
            { id: 'klein',       gen: kleinBottle    },
            { id: 'torusknot',   gen: torusKnot4d    },
            { id: 'hypersphere', gen: hypersphere    },
        ],
        organic: [
            { id: 'jellyfish',   gen: jellyfish4d    },
            { id: 'seraphim',    gen: seraphim4d     },
            { id: 'neural',      gen: neuralParasite },
        ],
        abstract: [
            { id: 'lissajous',   gen: lissajous4d    },
            { id: 'spiral4d',    gen: spiral4d       },
            { id: 'flower',      gen: quantumFlower  },
        ],
        aliens: [
            { id: 'vortexeye',   gen: vortexEye       },
            { id: 'amoeba',      gen: plasmaAmoeba    },
            { id: 'rift',        gen: dimensionalRift },
            { id: 'tendril',     gen: voidTendril     },
            { id: 'scyphozoa',   gen: scyphozoa4d     },
            { id: 'hivecell',    gen: crystallineHive },
        ],
    };

    function getCategories() { return Object.keys(catalog); }
    function getFiguresInCategory(cat) { return catalog[cat] || []; }
    function generate(id, params) {
        for (const cat of Object.values(catalog)) {
            for (const fig of cat) {
                if (fig.id === id) {
                    const out = fig.gen(params);
                    out.id = id;
                    return out;
                }
            }
        }
        const fallback = tesseract(params);
        fallback.id = 'tesseract';
        return fallback;
    }
    function getFirst(cat) {
        const list = catalog[cat];
        return list && list.length ? list[0].id : 'tesseract';
    }

    return { catalog, getCategories, getFiguresInCategory, generate, getFirst };
})();

if (typeof window !== 'undefined') window.Figures = Figures;
if (typeof module !== 'undefined' && module.exports) module.exports = Figures;
