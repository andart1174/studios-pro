/**
 * math4d.js — Pure 4D Mathematics, Hyperplane Slicing & Morph Engine (v5.0)
 * =========================================================================
 * Handles 6-plane 4D rotations, safe stereographic/orthographic 4D->3D
 * projections, exact W-hyperplane cross-sections (edges & triangle faces),
 * and topology-safe A<->B figure morphing.
 */

const Math4D = (() => {

    function identity4() {
        return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
    }

    function mul4(A, B) {
        const R = new Array(16).fill(0);
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                let s = 0;
                for (let k = 0; k < 4; k++) s += A[i + k * 4] * B[k + j * 4];
                R[i + j * 4] = s;
            }
        }
        return R;
    }

    function rotXY(a) { const c = Math.cos(a), s = Math.sin(a); return [c,-s,0,0, s,c,0,0, 0,0,1,0, 0,0,0,1]; }
    function rotXZ(a) { const c = Math.cos(a), s = Math.sin(a); return [c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]; }
    function rotXW(a) { const c = Math.cos(a), s = Math.sin(a); return [c,0,0,-s, 0,1,0,0, 0,0,1,0, s,0,0,c]; }
    function rotYZ(a) { const c = Math.cos(a), s = Math.sin(a); return [1,0,0,0, 0,c,-s,0, 0,s,c,0, 0,0,0,1]; }
    function rotYW(a) { const c = Math.cos(a), s = Math.sin(a); return [1,0,0,0, 0,c,0,-s, 0,0,1,0, 0,s,0,c]; }
    function rotZW(a) { const c = Math.cos(a), s = Math.sin(a); return [1,0,0,0, 0,1,0,0, 0,0,c,-s, 0,0,s,c]; }

    function applyMat4(M, p) {
        return [
            M[0]*p[0] + M[4]*p[1] + M[8]*p[2]  + M[12]*p[3],
            M[1]*p[0] + M[5]*p[1] + M[9]*p[2]  + M[13]*p[3],
            M[2]*p[0] + M[6]*p[1] + M[10]*p[2] + M[14]*p[3],
            M[3]*p[0] + M[7]*p[1] + M[11]*p[2] + M[15]*p[3],
        ];
    }

    function buildRotation(angles, enabled) {
        let M = identity4();
        if (enabled.xy) M = mul4(rotXY(angles.xy), M);
        if (enabled.xz) M = mul4(rotXZ(angles.xz), M);
        if (enabled.xw) M = mul4(rotXW(angles.xw), M);
        if (enabled.yz) M = mul4(rotYZ(angles.yz), M);
        if (enabled.yw) M = mul4(rotYW(angles.yw), M);
        if (enabled.zw) M = mul4(rotZW(angles.zw), M);
        return M;
    }

    /**
     * Fast inline 6-plane 4D rotation without allocating intermediate matrices.
     */
    function rotate4D(v, angles, enabled) {
        let x = v[0], y = v[1], z = v[2], w = v[3];
        if (enabled.xy && angles.xy) {
            const c = Math.cos(angles.xy), s = Math.sin(angles.xy);
            const nx = c * x - s * y, ny = s * x + c * y;
            x = nx; y = ny;
        }
        if (enabled.xz && angles.xz) {
            const c = Math.cos(angles.xz), s = Math.sin(angles.xz);
            const nx = c * x - s * z, nz = s * x + c * z;
            x = nx; z = nz;
        }
        if (enabled.xw && angles.xw) {
            const c = Math.cos(angles.xw), s = Math.sin(angles.xw);
            const nx = c * x - s * w, nw = s * x + c * w;
            x = nx; w = nw;
        }
        if (enabled.yz && angles.yz) {
            const c = Math.cos(angles.yz), s = Math.sin(angles.yz);
            const ny = c * y - s * z, nz = s * y + c * z;
            y = ny; z = nz;
        }
        if (enabled.yw && angles.yw) {
            const c = Math.cos(angles.yw), s = Math.sin(angles.yw);
            const ny = c * y - s * w, nw = s * y + c * w;
            y = ny; w = nw;
        }
        if (enabled.zw && angles.zw) {
            const c = Math.cos(angles.zw), s = Math.sin(angles.zw);
            const nz = c * z - s * w, nw = s * z + c * w;
            z = nz; w = nw;
        }
        return [x, y, z, w];
    }

    /**
     * Safe stereographic projection: 4D -> 3D with singularity clamp.
     */
    function projectStereo(p, d = 3.6) {
        const denom = Math.max(0.55, d - p[3]);
        const s = d / denom;
        return [p[0] * s, p[1] * s, p[2] * s];
    }

    function projectOrtho(p) {
        return [p[0], p[1], p[2]];
    }

    /**
     * Unified 4D->3D projection returning coordinates + W depth & perspective factor.
     */
    function projectPoint(p, mode = 'stereo', d = 3.6) {
        if (mode === 'ortho') {
            return { x: p[0], y: p[1], z: p[2], w: p[3], scale: 1.0 };
        }
        const denom = Math.max(0.55, d - p[3]);
        const s = Math.min(3.5, d / denom);
        return { x: p[0] * s, y: p[1] * s, z: p[2] * s, w: p[3], scale: s };
    }

    /**
     * Edge-hyperplane intersections at W = wSlice.
     */
    function crossSection(rotated, edges, wSlice) {
        const pts = [];
        for (let eIdx = 0; eIdx < edges.length; eIdx++) {
            const i = edges[eIdx][0], j = edges[eIdx][1];
            const a = rotated[i], b = rotated[j];
            if (!a || !b) continue;
            const wa = a[3] - wSlice;
            const wb = b[3] - wSlice;
            if ((wa <= 0 && wb >= 0) || (wb <= 0 && wa >= 0)) {
                const diff = b[3] - a[3];
                const t = Math.abs(diff) < 1e-6 ? 0.5 : (wSlice - a[3]) / diff;
                pts.push([
                    a[0] + t * (b[0] - a[0]),
                    a[1] + t * (b[1] - a[1]),
                    a[2] + t * (b[2] - a[2]),
                ]);
            }
        }
        return pts;
    }

    /**
     * Exact triangle-hyperplane cross-section: returns 3D intersection segments
     * where each 4D triangle cuts across W = wSlice (produces crisp volumetric
     * slice contours AND polygon loops!).
     */
    function crossSectionDetailed(rotated, edges, faces, wSlice) {
        const segments = [];
        const points = [];
        const EPS = 1e-5;

        if (faces && faces.length > 0) {
            for (let f = 0; f < faces.length; f++) {
                const tri = faces[f];
                const a = rotated[tri[0]], b = rotated[tri[1]], c = rotated[tri[2]];
                if (!a || !b || !c) continue;
                const dA = a[3] - wSlice;
                const dB = b[3] - wSlice;
                const dC = c[3] - wSlice;
                if ((dA > EPS && dB > EPS && dC > EPS) || (dA < -EPS && dB < -EPS && dC < -EPS)) continue;

                const hits = [];
                const pairs = [[a, b, dA, dB], [b, c, dB, dC], [c, a, dC, dA]];
                for (let p = 0; p < 3; p++) {
                    const [u, v, du, dv] = pairs[p];
                    if ((du <= 0 && dv >= 0) || (dv <= 0 && du >= 0)) {
                        const span = dv - du;
                        if (Math.abs(span) < 1e-6) continue;
                        const t = -du / span;
                        hits.push([
                            u[0] + t * (v[0] - u[0]),
                            u[1] + t * (v[1] - u[1]),
                            u[2] + t * (v[2] - u[2]),
                        ]);
                    }
                }
                if (hits.length >= 2) {
                    segments.push([hits[0], hits[1]]);
                    points.push(hits[0], hits[1]);
                }
            }
        }

        // Always collect edge points as fallback for wire/branch figures
        if (points.length === 0 && edges && edges.length > 0) {
            const edgePts = crossSection(rotated, edges, wSlice);
            for (let i = 0; i < edgePts.length; i++) points.push(edgePts[i]);
            // Connect nearby cross-section points cleanly to form a visible 3D slice cage
            const maxPts = Math.min(edgePts.length, 96);
            if (maxPts >= 3) {
                let cx = 0, cy = 0, cz = 0;
                for (let i = 0; i < maxPts; i++) { cx += edgePts[i][0]; cy += edgePts[i][1]; cz += edgePts[i][2]; }
                cx /= maxPts; cy /= maxPts; cz /= maxPts;
                const sorted = edgePts.slice(0, maxPts).sort((p1, p2) =>
                    Math.atan2(p1[1] - cy, p1[0] - cx) - Math.atan2(p2[1] - cy, p2[0] - cx)
                );
                for (let i = 0; i < sorted.length; i++) {
                    segments.push([sorted[i], sorted[(i + 1) % sorted.length]]);
                }
            }
        }

        // Compute centroid for slice fill triangulation
        let cx = 0, cy = 0, cz = 0;
        if (points.length > 0) {
            for (let i = 0; i < points.length; i++) {
                cx += points[i][0]; cy += points[i][1]; cz += points[i][2];
            }
            cx /= points.length; cy /= points.length; cz /= points.length;
        }

        return { points, segments, center: [cx, cy, cz] };
    }

    /**
     * Topology-safe linear interpolation between two 4D figures A and B.
     * Uses the denser figure's topology and maps the sparser figure smoothly
     * so there are never out-of-bounds indices or orphaned vertices.
     */
    function morphFigures(dA, dB, alpha) {
        const t = Math.max(0, Math.min(1, alpha));
        const nA = dA.verts.length;
        const nB = dB.verts.length;
        if (!nA || !nB) return dA;

        const useBTopo = t >= 0.5;
        const primary = useBTopo ? dB : dA;
        const secondary = useBTopo ? dA : dB;
        const mixT = useBTopo ? (1 - t) : t; // distance from primary toward secondary
        const nP = primary.verts.length;
        const nS = secondary.verts.length;

        const verts = new Array(nP);
        for (let i = 0; i < nP; i++) {
            const vp = primary.verts[i];
            const sIdx = Math.floor((i / Math.max(1, nP - 1)) * (nS - 1));
            const vs = secondary.verts[Math.min(nS - 1, sIdx)];
            verts[i] = [
                vp[0] + (vs[0] - vp[0]) * mixT,
                vp[1] + (vs[1] - vp[1]) * mixT,
                vp[2] + (vs[2] - vp[2]) * mixT,
                vp[3] + (vs[3] - vp[3]) * mixT,
            ];
        }

        return {
            verts,
            edges: primary.edges || [],
            faces: primary.faces || [],
            color: primary.color,
            name_en: `${dA.name_en} ↔ ${dB.name_en}`,
            name_fr: `${dA.name_fr || dA.name_en} ↔ ${dB.name_fr || dB.name_en}`,
            icon: primary.icon || '✨',
            category: primary.category || 'real4d',
            desc_en: `Live 4D Morph (${Math.round(t * 100)}%): ${dA.name_en} ↔ ${dB.name_en}`,
            desc_fr: `Morphose 4D (${Math.round(t * 100)}%) : ${dA.name_fr || dA.name_en} ↔ ${dB.name_fr || dB.name_en}`,
        };
    }

    function lerpVerts(A, B, t) {
        const n = Math.min(A.length, B.length);
        const res = new Array(n);
        for (let i = 0; i < n; i++) {
            res[i] = [
                A[i][0] * (1 - t) + B[i][0] * t,
                A[i][1] * (1 - t) + B[i][1] * t,
                A[i][2] * (1 - t) + B[i][2] * t,
                A[i][3] * (1 - t) + B[i][3] * t,
            ];
        }
        return res;
    }

    return {
        identity4, mul4,
        rotXY, rotXZ, rotXW, rotYZ, rotYW, rotZW,
        applyMat4, buildRotation, rotate4D,
        projectStereo, projectOrtho, projectPoint,
        crossSection, crossSectionDetailed,
        morphFigures, lerpVerts,
    };
})();

if (typeof window !== 'undefined') window.Math4D = Math4D;
if (typeof module !== 'undefined' && module.exports) module.exports = Math4D;
