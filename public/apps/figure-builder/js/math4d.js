/**
 * math4d.js — Pure 4D Mathematics Engine
 * ========================================
 * Handles 4D rotation matrices and projection from 4D→3D→2D.
 * No dependencies — pure vanilla JS.
 */

const Math4D = (() => {

    // ── Generate a 4×4 identity matrix (flat array, column-major)
    function identity4() {
        return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
    }

    // ── Multiply two 4×4 matrices (A * B), stored as flat 16-element arrays
    function mul4(A, B) {
        const R = new Array(16).fill(0);
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                let s = 0;
                for (let k = 0; k < 4; k++) s += A[i + k*4] * B[k + j*4];
                R[i + j*4] = s;
            }
        }
        return R;
    }

    // ── Rotate in the XY plane
    function rotXY(a) {
        const c = Math.cos(a), s = Math.sin(a);
        return [c,-s,0,0, s,c,0,0, 0,0,1,0, 0,0,0,1];
    }
    // ── Rotate in the XZ plane
    function rotXZ(a) {
        const c = Math.cos(a), s = Math.sin(a);
        return [c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1];
    }
    // ── Rotate in the XW plane  (the key 4D rotation)
    function rotXW(a) {
        const c = Math.cos(a), s = Math.sin(a);
        return [c,0,0,-s, 0,1,0,0, 0,0,1,0, s,0,0,c];
    }
    // ── Rotate in the YZ plane
    function rotYZ(a) {
        const c = Math.cos(a), s = Math.sin(a);
        return [1,0,0,0, 0,c,-s,0, 0,s,c,0, 0,0,0,1];
    }
    // ── Rotate in the YW plane
    function rotYW(a) {
        const c = Math.cos(a), s = Math.sin(a);
        return [1,0,0,0, 0,c,0,-s, 0,0,1,0, 0,s,0,c];
    }
    // ── Rotate in the ZW plane
    function rotZW(a) {
        const c = Math.cos(a), s = Math.sin(a);
        return [1,0,0,0, 0,1,0,0, 0,0,c,-s, 0,0,s,c];
    }

    // ── Apply a 4×4 matrix to a 4D point [x,y,z,w]
    function applyMat4(M, p) {
        return [
            M[0]*p[0] + M[4]*p[1] + M[8]*p[2]  + M[12]*p[3],
            M[1]*p[0] + M[5]*p[1] + M[9]*p[2]  + M[13]*p[3],
            M[2]*p[0] + M[6]*p[1] + M[10]*p[2] + M[14]*p[3],
            M[3]*p[0] + M[7]*p[1] + M[11]*p[2] + M[15]*p[3],
        ];
    }

    /**
     * Stereographic projection: 4D → 3D
     * Equivalent to projecting from the "north pole" of a 4-sphere.
     * @param {number[]} p  — 4D point [x,y,z,w]
     * @param {number}   d  — viewer distance in the W direction (default 5)
     * @returns {number[]} [x3,y3,z3] projected 3D point
     */
    function projectStereo(p, d = 5) {
        const denom = d - p[3];
        if (Math.abs(denom) < 0.001) return [p[0], p[1], p[2]];
        const s = d / denom;
        return [p[0]*s, p[1]*s, p[2]*s];
    }

    /**
     * Orthographic projection: simply drop the W axis.
     */
    function projectOrtho(p) {
        return [p[0], p[1], p[2]];
    }

    /**
     * Build a compound rotation matrix from 6 plane angles.
     * @param {object} angles — { xy, xz, xw, yz, yw, zw }
     * @param {object} enabled — same keys, boolean
     */
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
     * Compute a 4D cross-section: find all edge midpoints where W = wSlice.
     * @param {number[][]} verts4d — array of [x,y,z,w] base (un-rotated) vertices
     * @param {number[][]} edges   — array of [i, j] index pairs
     * @param {number[][]} rotated — rotated 4D verts (already rotated by animation matrix)
     * @param {number}     wSlice  — the W hyperplane value
     * @returns {number[][]} 3D intersection points
     */
    function crossSection(rotated, edges, wSlice) {
        const pts = [];
        for (const [i, j] of edges) {
            const a = rotated[i], b = rotated[j];
            const wa = a[3], wb = b[3];
            if ((wa <= wSlice && wb >= wSlice) || (wb <= wSlice && wa >= wSlice)) {
                const t = (wSlice - wa) / (wb - wa);
                pts.push([
                    a[0] + t*(b[0]-a[0]),
                    a[1] + t*(b[1]-a[1]),
                    a[2] + t*(b[2]-a[2]),
                ]);
            }
        }
        return pts;
    }

    /**
     * Lerp (linear interpolation) between two sets of 4D vertices.
     */
    function lerpVerts(A, B, t) {
        const n = Math.min(A.length, B.length);
        const res = [];
        for (let i = 0; i < n; i++) {
            res.push([
                A[i][0]*(1-t) + B[i][0]*t,
                A[i][1]*(1-t) + B[i][1]*t,
                A[i][2]*(1-t) + B[i][2]*t,
                A[i][3]*(1-t) + B[i][3]*t,
            ]);
        }
        return res;
    }

    return {
        identity4, mul4,
        rotXY, rotXZ, rotXW, rotYZ, rotYW, rotZW,
        applyMat4,
        projectStereo, projectOrtho,
        buildRotation,
        crossSection,
        lerpVerts,
    };
})();
