// ==========================================
// 🧊 MESH ENGINE: TOPOLOGY, BVH, ADAPTIVE SUBDIVISION, 3MF PARSER & HISTORY
// ==========================================
let scene, camera, renderer, controls;
let currentMesh = null;
let triangleColors = null;
let curvatureScores = null;
let meshTopology = null;
let spatialGrid = null;

let colorHistory = [];
let historyIndex = -1;
const MAX_HISTORY_STATES = 25;

// Print Up-Axis convention in 3D view ('y' is vertical up in Three.js)
let printUpAxis = 'y';

if (typeof MeshBVHLib !== 'undefined') {
    THREE.BufferGeometry.prototype.computeBoundsTree = MeshBVHLib.computeBoundsTree;
    THREE.BufferGeometry.prototype.disposeBoundsTree = MeshBVHLib.disposeBoundsTree;
    THREE.Mesh.prototype.raycast = MeshBVHLib.acceleratedRaycast;
}

const raycaster = new THREE.Raycaster();
raycaster.firstHitOnly = true;
const mouse = new THREE.Vector2();

// Exact squared distance from point P to triangle (A, B, C)
function pointTriangleDistSq(px, py, pz, ax, ay, az, bx, by, bz, cx, cy, cz) {
    const abx = bx - ax, aby = by - ay, abz = bz - az;
    const acx = cx - ax, acy = cy - ay, acz = cz - az;
    const apx = px - ax, apy = py - ay, apz = pz - az;

    const d1 = abx * apx + aby * apy + abz * apz;
    const d2 = acx * apx + acy * apy + acz * apz;
    if (d1 <= 0 && d2 <= 0) return apx * apx + apy * apy + apz * apz;

    const bpx = px - bx, bpy = py - by, bpz = pz - bz;
    const d3 = abx * bpx + aby * bpy + abz * bpz;
    const d4 = acx * bpx + acy * bpy + acz * bpz;
    if (d3 >= 0 && d4 <= d3) return bpx * bpx + bpy * bpy + bpz * bpz;

    const vc = d1 * d4 - d3 * d2;
    if (vc <= 0 && d1 >= 0 && d3 <= 0) {
        const v = d1 / (d1 - d3);
        const qx = ax + v * abx - px, qy = ay + v * aby - py, qz = az + v * abz - pz;
        return qx * qx + qy * qy + qz * qz;
    }

    const cpx = px - cx, cpy = py - cy, cpz = pz - cz;
    const d5 = abx * cpx + aby * cpy + abz * cpz;
    const d6 = acx * cpx + acy * cpy + acz * cpz;
    if (d6 >= 0 && d5 <= d6) return cpx * cpx + cpy * cpy + cpz * cpz;

    const vb = d5 * d2 - d1 * d6;
    if (vb <= 0 && d2 >= 0 && d6 <= 0) {
        const w = d2 / (d2 - d6);
        const qx = ax + w * acx - px, qy = ay + w * acy - py, qz = az + w * acz - pz;
        return qx * qx + qy * qy + qz * qz;
    }

    const va = d3 * d6 - d5 * d4;
    if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) {
        const w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
        const qx = bx + w * (cx - bx) - px, qy = by + w * (cy - by) - py, qz = bz + w * (cz - bz) - pz;
        return qx * qx + qy * qy + qz * qz;
    }

    const denom = 1 / (va + vb + vc);
    const v = vb * denom;
    const w = vc * denom;
    const qx = ax + abx * v + acx * w - px;
    const qy = ay + aby * v + acy * w - py;
    const qz = az + abz * v + acz * w - pz;
    return qx * qx + qy * qy + qz * qz;
}

// AABB-indexed SpatialGrid so even large triangles on flat CAD surfaces are hit reliably!
class SpatialGrid {
    constructor(geometry, resolution = 32) {
        this.res = resolution;
        geometry.computeBoundingBox();
        this.min = geometry.boundingBox.min.clone();
        this.max = geometry.boundingBox.max.clone();
        const sizeX = Math.max(this.max.x - this.min.x, 0.001);
        const sizeY = Math.max(this.max.y - this.min.y, 0.001);
        const sizeZ = Math.max(this.max.z - this.min.z, 0.001);
        this.cellSizeX = sizeX / resolution;
        this.cellSizeY = sizeY / resolution;
        this.cellSizeZ = sizeZ / resolution;

        const total = resolution * resolution * resolution;
        this.cells = new Array(total);
        this.posArr = geometry.attributes.position.array;
        this.faceCount = (geometry.attributes.position.count / 3) | 0;
        this.faceCenters = new Float32Array(this.faceCount * 3);
        this.seenStamp = new Uint32Array(this.faceCount);
        this.stampGen = 1;

        for (let f = 0; f < this.faceCount; f++) {
            const idx = f * 9;
            const x0 = this.posArr[idx],     y0 = this.posArr[idx + 1], z0 = this.posArr[idx + 2];
            const x1 = this.posArr[idx + 3], y1 = this.posArr[idx + 4], z1 = this.posArr[idx + 5];
            const x2 = this.posArr[idx + 6], y2 = this.posArr[idx + 7], z2 = this.posArr[idx + 8];

            this.faceCenters[f * 3]     = (x0 + x1 + x2) * 0.3333333;
            this.faceCenters[f * 3 + 1] = (y0 + y1 + y2) * 0.3333333;
            this.faceCenters[f * 3 + 2] = (z0 + z1 + z2) * 0.3333333;

            const minX = Math.min(x0, x1, x2), maxX = Math.max(x0, x1, x2);
            const minY = Math.min(y0, y1, y2), maxY = Math.max(y0, y1, y2);
            const minZ = Math.min(z0, z1, z2), maxZ = Math.max(z0, z1, z2);

            const gx0 = Math.min(resolution - 1, Math.max(0, ((minX - this.min.x) / this.cellSizeX) | 0));
            const gx1 = Math.min(resolution - 1, Math.max(0, ((maxX - this.min.x) / this.cellSizeX) | 0));
            const gy0 = Math.min(resolution - 1, Math.max(0, ((minY - this.min.y) / this.cellSizeY) | 0));
            const gy1 = Math.min(resolution - 1, Math.max(0, ((maxY - this.min.y) / this.cellSizeY) | 0));
            const gz0 = Math.min(resolution - 1, Math.max(0, ((minZ - this.min.z) / this.cellSizeZ) | 0));
            const gz1 = Math.min(resolution - 1, Math.max(0, ((maxZ - this.min.z) / this.cellSizeZ) | 0));

            for (let gz = gz0; gz <= gz1; gz++) {
                const zOff = gz * resolution * resolution;
                for (let gy = gy0; gy <= gy1; gy++) {
                    const yOff = zOff + gy * resolution;
                    for (let gx = gx0; gx <= gx1; gx++) {
                        const cellIdx = yOff + gx;
                        if (!this.cells[cellIdx]) this.cells[cellIdx] = [f];
                        else this.cells[cellIdx].push(f);
                    }
                }
            }
        }
    }

    querySphere(lx, ly, lz, radius, cb) {
        const rSq = radius * radius;
        const res = this.res;
        const minGx = Math.max(0, ((lx - radius - this.min.x) / this.cellSizeX) | 0);
        const maxGx = Math.min(res - 1, ((lx + radius - this.min.x) / this.cellSizeX) | 0);
        const minGy = Math.max(0, ((ly - radius - this.min.y) / this.cellSizeY) | 0);
        const maxGy = Math.min(res - 1, ((ly + radius - this.min.y) / this.cellSizeY) | 0);
        const minGz = Math.max(0, ((lz - radius - this.min.z) / this.cellSizeZ) | 0);
        const maxGz = Math.min(res - 1, ((lz + radius - this.min.z) / this.cellSizeZ) | 0);

        if (this.stampGen >= 0xFFFFFFFE) {
            this.seenStamp.fill(0);
            this.stampGen = 1;
        }
        const stamp = this.stampGen++;
        const pos = this.posArr;

        for (let gz = minGz; gz <= maxGz; gz++) {
            const zOff = gz * res * res;
            for (let gy = minGy; gy <= maxGy; gy++) {
                const yOff = zOff + gy * res;
                for (let gx = minGx; gx <= maxGx; gx++) {
                    const cell = this.cells[yOff + gx];
                    if (!cell) continue;
                    for (let i = 0; i < cell.length; i++) {
                        const f = cell[i];
                        if (this.seenStamp[f] === stamp) continue;
                        this.seenStamp[f] = stamp;

                        const p = f * 9;
                        const dSq = pointTriangleDistSq(
                            lx, ly, lz,
                            pos[p], pos[p + 1], pos[p + 2],
                            pos[p + 3], pos[p + 4], pos[p + 5],
                            pos[p + 6], pos[p + 7], pos[p + 8]
                        );
                        if (dSq <= rSq) {
                            cb(f);
                        }
                    }
                }
            }
        }
    }
}

function buildMeshTopology(geometry) {
    if (!geometry || !geometry.attributes || !geometry.attributes.position) return null;
    const posAttr = geometry.attributes.position;
    const posArr = posAttr.array;
    const faceCount = (posAttr.count / 3) | 0;
    const totalVerts = faceCount * 3;
    const vertIds = new Int32Array(totalVerts);

    const vMap = new Map();
    let nextVid = 0;

    for (let i = 0; i < totalVerts; i++) {
        const i3 = i * 3;
        const x = Math.round(posArr[i3] * 1000);
        const y = Math.round(posArr[i3 + 1] * 1000);
        const z = Math.round(posArr[i3 + 2] * 1000);
        const key = `${x},${y},${z}`;
        let vid = vMap.get(key);
        if (vid === undefined) {
            vid = nextVid++;
            vMap.set(key, vid);
        }
        vertIds[i] = vid;
    }

    const faceNormals = new Float32Array(faceCount * 3);
    const faceCenters = new Float32Array(faceCount * 3);
    const faceNeighbors = new Array(faceCount);
    for (let f = 0; f < faceCount; f++) faceNeighbors[f] = [];

    const edgeMap = new Map();

    for (let f = 0; f < faceCount; f++) {
        const b = f * 9;
        const x0 = posArr[b],     y0 = posArr[b + 1], z0 = posArr[b + 2];
        const x1 = posArr[b + 3], y1 = posArr[b + 4], z1 = posArr[b + 5];
        const x2 = posArr[b + 6], y2 = posArr[b + 7], z2 = posArr[b + 8];

        faceCenters[f * 3]     = (x0 + x1 + x2) * 0.3333333;
        faceCenters[f * 3 + 1] = (y0 + y1 + y2) * 0.3333333;
        faceCenters[f * 3 + 2] = (z0 + z1 + z2) * 0.3333333;

        const ax = x1 - x0, ay = y1 - y0, az = z1 - z0;
        const bx = x2 - x0, by = y2 - y0, bz = z2 - z0;
        const nx = ay * bz - az * by;
        const ny = az * bx - ax * bz;
        const nz = ax * by - ay * bx;
        const len = Math.hypot(nx, ny, nz) || 1;
        faceNormals[f * 3]     = nx / len;
        faceNormals[f * 3 + 1] = ny / len;
        faceNormals[f * 3 + 2] = nz / len;

        const vb = f * 3;
        const v0 = vertIds[vb];
        const v1 = vertIds[vb + 1];
        const v2 = vertIds[vb + 2];

        const edges = [
            v0 < v1 ? `${v0}_${v1}` : `${v1}_${v0}`,
            v1 < v2 ? `${v1}_${v2}` : `${v2}_${v1}`,
            v2 < v0 ? `${v2}_${v0}` : `${v0}_${v2}`
        ];

        for (let e = 0; e < 3; e++) {
            const eKey = edges[e];
            const list = edgeMap.get(eKey);
            if (list !== undefined) {
                for (let i = 0; i < list.length; i++) {
                    const other = list[i];
                    faceNeighbors[f].push(other);
                    faceNeighbors[other].push(f);
                }
                list.push(f);
            } else {
                edgeMap.set(eKey, [f]);
            }
        }
    }

    return { faceNeighbors, faceNormals, faceCenters, faceCount, vertIds, uniqueVertCount: nextVid };
}

// TRUE Dihedral Concavity & Engraved Groove Detection (uses meshTopology!)
function precomputeGeometryMetrics(geometry) {
    if (!geometry || !geometry.attributes || !geometry.attributes.position) return;
    const count = (geometry.attributes.position.count / 3) | 0;
    curvatureScores = new Float32Array(count);
    if (!meshTopology || meshTopology.faceCount !== count) {
        meshTopology = buildMeshTopology(geometry);
    }
    if (!meshTopology) return;

    const { faceNeighbors, faceNormals, faceCenters } = meshTopology;

    for (let f = 0; f < count; f++) {
        const f3 = f * 3;
        const nfx = faceNormals[f3], nfy = faceNormals[f3 + 1], nfz = faceNormals[f3 + 2];
        const cfx = faceCenters[f3], cfy = faceCenters[f3 + 1], cfz = faceCenters[f3 + 2];
        const nbs = faceNeighbors[f];

        let maxConcavity = 0;
        let creaseSum = 0;

        for (let i = 0; i < nbs.length; i++) {
            const nb = nbs[i];
            const nb3 = nb * 3;
            const nnx = faceNormals[nb3], nny = faceNormals[nb3 + 1], nnz = faceNormals[nb3 + 2];
            const dot = Math.max(-1, Math.min(1, nfx * nnx + nfy * nny + nfz * nnz));
            const angleFactor = (1 - dot) * 0.5; // 0 for coplanar, 0.5 for 90 deg, 1 for 180 deg

            // Vector from face f center to neighbor center
            const dx = faceCenters[nb3] - cfx;
            const dy = faceCenters[nb3 + 1] - cfy;
            const dz = faceCenters[nb3 + 2] - cfz;
            const dLen = Math.hypot(dx, dy, dz) || 1;
            const bendInward = (dx * nfx + dy * nfy + dz * nfz) / dLen;

            // Positive bendInward means neighbor rises above face f's tangent plane => CONCAVE crease/engraving!
            if (bendInward > 0.02) {
                const score = Math.min(1, angleFactor * (1.2 + bendInward * 2.0));
                if (score > maxConcavity) maxConcavity = score;
                creaseSum += score;
            }
        }

        curvatureScores[f] = Math.min(1, maxConcavity * 0.75 + (nbs.length ? (creaseSum / nbs.length) * 0.35 : 0));
    }
}

// ==========================================
// ⚡ SMART ADAPTIVE LOCAL SUBDIVISION (CRACK-FREE 1-TO-4 / 1-TO-2 EDGE SPLIT)
// ==========================================
function subdivideFacesLocal(targetFaceSet, maxIterations = 1) {
    if (!currentMesh || !triangleColors || !targetFaceSet || targetFaceSet.size === 0) return false;
    const geom = currentMesh.geometry;
    const posAttr = geom.attributes.position;
    if (!posAttr) return false;
    const pos = posAttr.array;
    const faceCount = (pos.length / 9) | 0;
    if (faceCount > 550000) return false; // Memory cap

    const edgeKey = (ax, ay, az, bx, by, bz) => {
        const ka = `${Math.round(ax * 10000)},${Math.round(ay * 10000)},${Math.round(az * 10000)}`;
        const kb = `${Math.round(bx * 10000)},${Math.round(by * 10000)},${Math.round(bz * 10000)}`;
        return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
    };

    const splitEdges = new Set();
    for (const f of targetFaceSet) {
        if (f < 0 || f >= faceCount) continue;
        const p = f * 9;
        splitEdges.add(edgeKey(pos[p], pos[p + 1], pos[p + 2], pos[p + 3], pos[p + 4], pos[p + 5]));
        splitEdges.add(edgeKey(pos[p + 3], pos[p + 4], pos[p + 5], pos[p + 6], pos[p + 7], pos[p + 8]));
        splitEdges.add(edgeKey(pos[p + 6], pos[p + 7], pos[p + 8], pos[p], pos[p + 1], pos[p + 2]));
    }

    const outPos = [];
    const outColors = [];

    const pushTri = (ax, ay, az, bx, by, bz, cx, cy, cz, col) => {
        outPos.push(ax, ay, az, bx, by, bz, cx, cy, cz);
        outColors.push(col);
    };

    for (let f = 0; f < faceCount; f++) {
        const p = f * 9;
        const x0 = pos[p],     y0 = pos[p + 1], z0 = pos[p + 2];
        const x1 = pos[p + 3], y1 = pos[p + 4], z1 = pos[p + 5];
        const x2 = pos[p + 6], y2 = pos[p + 7], z2 = pos[p + 8];
        const col = triangleColors[f];

        const s01 = splitEdges.has(edgeKey(x0, y0, z0, x1, y1, z1));
        const s12 = splitEdges.has(edgeKey(x1, y1, z1, x2, y2, z2));
        const s20 = splitEdges.has(edgeKey(x2, y2, z2, x0, y0, z0));

        const splitCount = (s01 ? 1 : 0) + (s12 ? 1 : 0) + (s20 ? 1 : 0);
        if (splitCount === 0) {
            pushTri(x0, y0, z0, x1, y1, z1, x2, y2, z2, col);
        } else if (splitCount === 3) {
            const m01x = (x0 + x1) * 0.5, m01y = (y0 + y1) * 0.5, m01z = (z0 + z1) * 0.5;
            const m12x = (x1 + x2) * 0.5, m12y = (y1 + y2) * 0.5, m12z = (z1 + z2) * 0.5;
            const m20x = (x2 + x0) * 0.5, m20y = (y2 + y0) * 0.5, m20z = (z2 + z0) * 0.5;
            pushTri(x0, y0, z0, m01x, m01y, m01z, m20x, m20y, m20z, col);
            pushTri(m01x, m01y, m01z, x1, y1, z1, m12x, m12y, m12z, col);
            pushTri(m20x, m20y, m20z, m12x, m12y, m12z, x2, y2, z2, col);
            pushTri(m01x, m01y, m01z, m12x, m12y, m12z, m20x, m20y, m20z, col);
        } else if (splitCount === 1) {
            // Crack-free T-junction elimination: 1-to-2 split
            if (s01) {
                const mx = (x0 + x1) * 0.5, my = (y0 + y1) * 0.5, mz = (z0 + z1) * 0.5;
                pushTri(x0, y0, z0, mx, my, mz, x2, y2, z2, col);
                pushTri(mx, my, mz, x1, y1, z1, x2, y2, z2, col);
            } else if (s12) {
                const mx = (x1 + x2) * 0.5, my = (y1 + y2) * 0.5, mz = (z1 + z2) * 0.5;
                pushTri(x1, y1, z1, mx, my, mz, x0, y0, z0, col);
                pushTri(mx, my, mz, x2, y2, z2, x0, y0, z0, col);
            } else {
                const mx = (x2 + x0) * 0.5, my = (y2 + y0) * 0.5, mz = (z2 + z0) * 0.5;
                pushTri(x2, y2, z2, mx, my, mz, x1, y1, z1, col);
                pushTri(mx, my, mz, x0, y0, z0, x1, y1, z1, col);
            }
        } else {
            // 2 edges split -> 1-to-3 split (crack-free!)
            // Rotate so the unsplit edge is (b -> c), split edges are (a -> b) and (c -> a)
            let ax, ay, az, bx, by, bz, cx, cy, cz;
            if (!s12) { ax = x0; ay = y0; az = z0; bx = x1; by = y1; bz = z1; cx = x2; cy = y2; cz = z2; }
            else if (!s20) { ax = x1; ay = y1; az = z1; bx = x2; by = y2; bz = z2; cx = x0; cy = y0; cz = z0; }
            else { ax = x2; ay = y2; az = z2; bx = x0; by = y0; bz = z0; cx = x1; cy = y1; cz = z1; }

            const mabx = (ax + bx) * 0.5, maby = (ay + by) * 0.5, mabz = (az + bz) * 0.5;
            const mcax = (cx + ax) * 0.5, mcay = (cy + ay) * 0.5, mcaz = (cz + az) * 0.5;
            pushTri(ax, ay, az, mabx, maby, mabz, mcax, mcay, mcaz, col);
            pushTri(mabx, maby, mabz, bx, by, bz, cx, cy, cz, col);
            pushTri(mabx, maby, mabz, cx, cy, cz, mcax, mcay, mcaz, col);
        }
    }

    const newGeom = new THREE.BufferGeometry();
    newGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(outPos), 3));
    newGeom.computeVertexNormals();
    newGeom.computeBoundingBox();
    if (newGeom.computeBoundsTree) newGeom.computeBoundsTree();

    if (geom.disposeBoundsTree) geom.disposeBoundsTree();
    geom.dispose();
    currentMesh.geometry = newGeom;
    triangleColors = new Uint8Array(outColors);

    spatialGrid = new SpatialGrid(newGeom, 32);
    meshTopology = buildMeshTopology(newGeom);
    precomputeGeometryMetrics(newGeom);
    updateMeshVisualColors();

    if (maxIterations > 1) {
        // Optional further pass handled by caller if needed
    }
    return true;
}

function subdivideCurrentMesh() {
    if (!currentMesh || !triangleColors) {
        showToast(currentLang === 'fr' ? "Veuillez charger un modèle d'abord." : "Please load a 3D model first.");
        return;
    }
    const geom = currentMesh.geometry;
    const posAttr = geom.attributes.position;
    if (!posAttr) return;
    const pos = posAttr.array;
    const faceCount = (pos.length / 9) | 0;

    if (faceCount > 600000) {
        showToast(currentLang === 'fr' ? "Le maillage a déjà une très haute densité !" : "Mesh already has very high polygon density!");
        return;
    }

    saveHistory(true);

    const newPos = new Float32Array(faceCount * 4 * 9);
    const newColors = new Uint8Array(faceCount * 4);

    for (let f = 0; f < faceCount; f++) {
        const p = f * 9;
        const x0 = pos[p],     y0 = pos[p + 1], z0 = pos[p + 2];
        const x1 = pos[p + 3], y1 = pos[p + 4], z1 = pos[p + 5];
        const x2 = pos[p + 6], y2 = pos[p + 7], z2 = pos[p + 8];

        const m01_x = (x0 + x1) * 0.5, m01_y = (y0 + y1) * 0.5, m01_z = (z0 + z1) * 0.5;
        const m12_x = (x1 + x2) * 0.5, m12_y = (y1 + y2) * 0.5, m12_z = (z1 + z2) * 0.5;
        const m20_x = (x2 + x0) * 0.5, m20_y = (y2 + y0) * 0.5, m20_z = (z2 + z0) * 0.5;

        const col = triangleColors[f];
        const base = f * 36;

        newPos[base]      = x0;    newPos[base + 1]  = y0;    newPos[base + 2]  = z0;
        newPos[base + 3]  = m01_x; newPos[base + 4]  = m01_y; newPos[base + 5]  = m01_z;
        newPos[base + 6]  = m20_x; newPos[base + 7]  = m20_y; newPos[base + 8]  = m20_z;

        newPos[base + 9]  = m01_x; newPos[base + 10] = m01_y; newPos[base + 11] = m01_z;
        newPos[base + 12] = x1;    newPos[base + 13] = y1;    newPos[base + 14] = z1;
        newPos[base + 15] = m12_x; newPos[base + 16] = m12_y; newPos[base + 17] = m12_z;

        newPos[base + 18] = m20_x; newPos[base + 19] = m20_y; newPos[base + 20] = m20_z;
        newPos[base + 21] = m12_x; newPos[base + 22] = m12_y; newPos[base + 23] = m12_z;
        newPos[base + 24] = x2;    newPos[base + 25] = y2;    newPos[base + 26] = z2;

        newPos[base + 27] = m01_x; newPos[base + 28] = m01_y; newPos[base + 29] = m01_z;
        newPos[base + 30] = m12_x; newPos[base + 31] = m12_y; newPos[base + 32] = m12_z;
        newPos[base + 33] = m20_x; newPos[base + 34] = m20_y; newPos[base + 35] = m20_z;

        const f4 = f * 4;
        newColors[f4] = col; newColors[f4 + 1] = col; newColors[f4 + 2] = col; newColors[f4 + 3] = col;
    }

    const newGeom = new THREE.BufferGeometry();
    newGeom.setAttribute('position', new THREE.BufferAttribute(newPos, 3));
    newGeom.computeVertexNormals();
    newGeom.computeBoundingBox();
    // FIXED: rebuild BVH after subdivide so raycasting stays 60 FPS!
    if (newGeom.computeBoundsTree) newGeom.computeBoundsTree();

    if (geom.disposeBoundsTree) geom.disposeBoundsTree();
    geom.dispose();
    currentMesh.geometry = newGeom;
    triangleColors = newColors;

    spatialGrid = new SpatialGrid(newGeom, 32);
    meshTopology = buildMeshTopology(newGeom);
    precomputeGeometryMetrics(newGeom);
    updateMeshVisualColors();
    // Save post-subdivide snapshot so Undo/Redo works in 1 click!
    saveHistory(true);

    const tmpl = translations[currentLang].toastMeshSubdivided || "Mesh subdivided: {count} triangles!";
    showToast(tmpl.replace('{count}', newColors.length.toLocaleString()));
}

// ==========================================
// 🔄 BUFFER COLOR UPDATE & UNIFIED HISTORY (INCLUDES PALETTE!)
// ==========================================
function updateMeshVisualColors() {
    if (!currentMesh || !triangleColors) return;
    const geom = currentMesh.geometry;
    let colorAttr = geom.attributes.color;
    const vertCount = geom.attributes.position.count;

    if (!colorAttr || colorAttr.count !== vertCount) {
        colorAttr = new THREE.BufferAttribute(new Float32Array(vertCount * 3), 3);
        geom.setAttribute('color', colorAttr);
    }

    const faceCount = (vertCount / 3) | 0;
    const colArr = colorAttr.array;

    for (let f = 0; f < faceCount; f++) {
        const s = triangleColors[f] || 0;
        const rgb = slotRgbFloats[s] || slotRgbFloats[0] || [0.95, 0.95, 0.95];
        const base = f * 9;
        colArr[base]     = rgb[0]; colArr[base + 1] = rgb[1]; colArr[base + 2] = rgb[2];
        colArr[base + 3] = rgb[0]; colArr[base + 4] = rgb[1]; colArr[base + 5] = rgb[2];
        colArr[base + 6] = rgb[0]; colArr[base + 7] = rgb[1]; colArr[base + 8] = rgb[2];
    }

    colorAttr.needsUpdate = true;
    if (typeof updateStats === 'function') updateStats();
}

function saveHistory(savePositions = false) {
    if (!triangleColors || !currentMesh) return;
    if (historyIndex < colorHistory.length - 1) {
        colorHistory = colorHistory.slice(0, historyIndex + 1);
    }
    const geom = currentMesh.geometry;
    const entry = {
        colors: new Uint8Array(triangleColors),
        slots: filamentSlots.map(s => ({ ...s })),
        positions: savePositions ? new Float32Array(geom.attributes.position.array) : null
    };
    colorHistory.push(entry);
    if (colorHistory.length > MAX_HISTORY_STATES) colorHistory.shift();
    historyIndex = colorHistory.length - 1;
}

function restoreHistoryEntry(entry) {
    if (!entry || !currentMesh) return;

    // Restore filament palette alongside triangle slot indices!
    if (entry.slots && entry.slots.length >= 2) {
        filamentSlots = entry.slots.map(s => ({ ...s }));
        if (activeSlotIndex >= filamentSlots.length) activeSlotIndex = 0;
        refreshSlotRgbFloats();
        renderFilamentGrid();
    }

    const geom = currentMesh.geometry;
    const neededVerts = entry.colors.length * 3;
    const needsGeoRestore = entry.positions || geom.attributes.position.count !== neededVerts;

    if (entry.positions) {
        if (geom.disposeBoundsTree) geom.disposeBoundsTree();
        geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(entry.positions), 3));
        geom.computeVertexNormals();
        geom.computeBoundingBox();
        if (geom.computeBoundsTree) geom.computeBoundsTree();
        spatialGrid = new SpatialGrid(geom, 32);
        meshTopology = buildMeshTopology(geom);
        precomputeGeometryMetrics(geom);
    } else if (needsGeoRestore) {
        for (let i = historyIndex; i >= 0; i--) {
            if (colorHistory[i].positions && colorHistory[i].positions.length === entry.colors.length * 9) {
                if (geom.disposeBoundsTree) geom.disposeBoundsTree();
                geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(colorHistory[i].positions), 3));
                geom.computeVertexNormals();
                geom.computeBoundingBox();
                if (geom.computeBoundsTree) geom.computeBoundsTree();
                spatialGrid = new SpatialGrid(geom, 32);
                meshTopology = buildMeshTopology(geom);
                precomputeGeometryMetrics(geom);
                break;
            }
        }
    }

    const faceCount = (geom.attributes.position.count / 3) | 0;
    triangleColors = new Uint8Array(faceCount);
    triangleColors.set(entry.colors.subarray(0, faceCount));
    updateMeshVisualColors();
}

function undoColor() {
    if (historyIndex > 0) {
        historyIndex--;
        restoreHistoryEntry(colorHistory[historyIndex]);
        showToast(currentLang === 'fr' ? "Annulation appliquée" : "Undo applied");
    }
}

function redoColor() {
    if (historyIndex < colorHistory.length - 1) {
        historyIndex++;
        restoreHistoryEntry(colorHistory[historyIndex]);
        showToast(currentLang === 'fr' ? "Rétablissement appliqué" : "Redo applied");
    }
}

// ==========================================
// ⚡ WATERTIGHT BOUNDARY-PRESERVING MESH DECIMATOR
// ==========================================
function vertexClusterSimplify(positions, targetTriangles = 180000, inColors = null, preserveColorBorders = true) {
    const origTriCount = (positions.length / 9) | 0;
    if (origTriCount <= targetTriangles) {
        return { positions, colors: inColors, triCount: origTriCount, wasOptimized: false };
    }

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    const posLen = positions.length;
    for (let i = 0; i < posLen; i += 3) {
        const x = positions[i], y = positions[i + 1], z = positions[i + 2];
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }

    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;
    const spanZ = maxZ - minZ || 1;
    const maxSpan = Math.max(spanX, spanY, spanZ);

    const gridRes = Math.min(480, Math.max(48, Math.round(Math.sqrt(targetTriangles * 0.25))));
    const cellSize = maxSpan / gridRes;
    const invCell = 1.0 / cellSize;

    const clusterMap = new Map();
    let clusterCount = 0;
    const vertCount = (posLen / 3) | 0;
    const vertCluster = new Int32Array(vertCount);

    for (let i = 0; i < vertCount; i++) {
        const idx = i * 3;
        const x = positions[idx], y = positions[idx + 1], z = positions[idx + 2];
        const gx = Math.min(1023, Math.max(0, Math.floor((x - minX) * invCell)));
        const gy = Math.min(1023, Math.max(0, Math.floor((y - minY) * invCell)));
        const gz = Math.min(1023, Math.max(0, Math.floor((z - minZ) * invCell)));
        const key = gx | (gy << 10) | (gz << 20);

        let cl = clusterMap.get(key);
        if (!cl) {
            cl = { id: clusterCount++, count: 1, sumX: x, sumY: y, sumZ: z };
            clusterMap.set(key, cl);
        } else {
            cl.count++;
            cl.sumX += x;
            cl.sumY += y;
            cl.sumZ += z;
        }
        vertCluster[i] = cl.id;
    }

    const repX = new Float32Array(clusterCount);
    const repY = new Float32Array(clusterCount);
    const repZ = new Float32Array(clusterCount);
    for (const cl of clusterMap.values()) {
        const invC = 1.0 / cl.count;
        repX[cl.id] = cl.sumX * invC;
        repY[cl.id] = cl.sumY * invC;
        repZ[cl.id] = cl.sumZ * invC;
    }

    const outPos = [];
    const outColors = inColors ? [] : null;
    const seenTriangles = new Set();

    for (let f = 0; f < origTriCount; f++) {
        const i1 = f * 3, i2 = i1 + 1, i3 = i1 + 2;
        const c1 = vertCluster[i1], c2 = vertCluster[i2], c3 = vertCluster[i3];
        if (c1 === c2 || c2 === c3 || c1 === c3) continue;

        const minC = Math.min(c1, c2, c3);
        const maxC = Math.max(c1, c2, c3);
        const midC = c1 + c2 + c3 - minC - maxC;
        const triKey = `${minC}_${midC}_${maxC}`;
        if (seenTriangles.has(triKey)) continue;
        seenTriangles.add(triKey);

        outPos.push(
            repX[c1], repY[c1], repZ[c1],
            repX[c2], repY[c2], repZ[c2],
            repX[c3], repY[c3], repZ[c3]
        );
        if (outColors) outColors.push(inColors[f]);
    }

    return {
        positions: new Float32Array(outPos),
        colors: outColors ? new Uint8Array(outColors) : null,
        triCount: (outPos.length / 9) | 0,
        origTriCount,
        wasOptimized: true
    };
}

// FIXED: Previously dropped triangles without welding vertices (created Swiss-cheese holes!).
function optimizeMeshForSlicer(posArray, activeColors, targetTriangles = 600000) {
    const origTriCount = activeColors.length;
    if (origTriCount <= targetTriangles) {
        return { positions: posArray, colors: activeColors, triCount: origTriCount };
    }
    return vertexClusterSimplify(posArray, targetTriangles, activeColors, true);
}

function simplifyGeometryIfNeeded(geom, inColors = null) {
    if (!geom || !geom.attributes.position) return { geom, colors: inColors, optInfo: null };
    const origTriCount = (geom.attributes.position.count / 3) | 0;
    if (origTriCount > 220000) {
        const opt = vertexClusterSimplify(geom.attributes.position.array, 180000, inColors);
        if (opt.wasOptimized && opt.triCount > 0) {
            geom.dispose();
            const newGeom = new THREE.BufferGeometry();
            newGeom.setAttribute('position', new THREE.BufferAttribute(opt.positions, 3));
            return {
                geom: newGeom,
                colors: opt.colors || inColors,
                optInfo: {
                    origK: Math.round(origTriCount / 1000),
                    newK: Math.round(opt.triCount / 1000)
                }
            };
        }
    }
    return { geom, colors: inColors, optInfo: null };
}

// ==========================================
// 📐 ORIENTATION & BED PLACEMENT UTILITIES
// ==========================================
function rotateModel90(axis) {
    if (!currentMesh || !triangleColors) return;
    saveHistory(true);
    const geom = currentMesh.geometry;
    if (axis === 'x') geom.rotateX(-Math.PI / 2);
    else if (axis === 'y') geom.rotateY(Math.PI / 2);
    else if (axis === 'z') geom.rotateZ(Math.PI / 2);
    geom.computeVertexNormals();
    geom.center();
    if (geom.disposeBoundsTree) geom.disposeBoundsTree();
    if (geom.computeBoundsTree) geom.computeBoundsTree();
    spatialGrid = new SpatialGrid(geom, 32);
    meshTopology = buildMeshTopology(geom);
    precomputeGeometryMetrics(geom);
    if (typeof updateStats === 'function') updateStats();
    if (typeof resetCamera === 'function') resetCamera();
    saveHistory(true);
}

function autoOrientZUpToYUp() {
    // Useful when CAD STL files (Z-up) load lying on their side in Three.js (Y-up)
    if (!currentMesh) return;
    rotateModel90('x');
    showToast(currentLang === 'fr' ? "Modèle pivoté (-90° X) pour le redresser !" : "Model rotated (-90° X) upright!");
}

function layModelFlatOnBed() {
    // Automatically aligns largest flat base cluster downward (-Y in Three.js view)
    if (!currentMesh || !meshTopology) return;
    const { faceNormals, faceCount } = meshTopology;
    const geom = currentMesh.geometry;
    const pos = geom.attributes.position.array;

    const dirs = [
        new THREE.Vector3(0, -1, 0),
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, 0, -1),
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(1, 0, 0)
    ];
    const scores = new Float64Array(6);

    for (let f = 0; f < faceCount; f++) {
        const b = f * 9;
        const ax = pos[b + 3] - pos[b], ay = pos[b + 4] - pos[b + 1], az = pos[b + 5] - pos[b + 2];
        const bx = pos[b + 6] - pos[b], by = pos[b + 7] - pos[b + 1], bz = pos[b + 8] - pos[b + 2];
        const area = 0.5 * Math.hypot(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx);
        const nx = faceNormals[f * 3], ny = faceNormals[f * 3 + 1], nz = faceNormals[f * 3 + 2];
        for (let d = 0; d < 6; d++) {
            const dot = nx * dirs[d].x + ny * dirs[d].y + nz * dirs[d].z;
            if (dot > 0.94) scores[d] += area;
        }
    }

    let bestD = 0;
    for (let d = 1; d < 6; d++) {
        if (scores[d] > scores[bestD]) bestD = d;
    }

    if (bestD === 0) {
        showToast(currentLang === 'fr' ? "Le modèle est déjà posé sur sa plus grande face." : "Model is already resting on its largest flat face.");
        return;
    }

    saveHistory(true);
    const q = new THREE.Quaternion().setFromUnitVectors(dirs[bestD], new THREE.Vector3(0, -1, 0));
    geom.applyQuaternion(q);
    geom.computeVertexNormals();
    geom.center();
    if (geom.disposeBoundsTree) geom.disposeBoundsTree();
    if (geom.computeBoundsTree) geom.computeBoundsTree();
    spatialGrid = new SpatialGrid(geom, 32);
    meshTopology = buildMeshTopology(geom);
    precomputeGeometryMetrics(geom);
    if (typeof updateStats === 'function') updateStats();
    if (typeof resetCamera === 'function') resetCamera();
    saveHistory(true);
    showToast(currentLang === 'fr' ? "Modèle posé à plat sur le plateau !" : "Model laid flat on build bed!");
}

// ==========================================
// 🎯 BAMBU STUDIO / ORCASLICER PAINT_COLOR CODEC
// ==========================================
function encodeBambuPaintColor(slotIdx) {
    // 0-based slotIdx -> 1-based extruder (1..16)
    const state = Math.max(0, (slotIdx | 0)) + 1;
    if (state <= 1) return null; // Extruder 1 is object default (keeps XML clean & fast!)
    if (state === 2) return '8';
    const extra = state - 3;
    if (extra <= 14) {
        return extra.toString(16).toUpperCase() + 'C';
    }
    return '1FC'; // Extended fallback
}

function decodeBambuPaintColor(hexStr) {
    if (!hexStr || typeof hexStr !== 'string') return 0;
    const clean = hexStr.trim().toUpperCase();
    if (!clean) return 0;

    // Fast path for unsplit leaf triangles ("4", "8", "0C".."DC")
    if (clean === '4') return 0;
    if (clean === '8') return 1;
    if (clean.length === 2 && clean[1] === 'C') {
        const nib = parseInt(clean[0], 16);
        if (!isNaN(nib)) return Math.max(0, 2 + nib); // 0C -> slot idx 2 (Extruder 3), 1C -> idx 3...
    }

    // Recursive tree parser (right-to-left nibble stream) for split Bambu/Prusa triangles
    let idx = clean.length - 1;
    const readNibble = () => {
        if (idx < 0) return 0;
        const val = parseInt(clean[idx--], 16);
        return isNaN(val) ? 0 : val;
    };

    const counts = {};
    function walkNode() {
        if (idx < 0) return;
        const nibble = readNibble();
        const splitSides = nibble & 0x03;
        const code = (nibble >> 2) & 0x03;
        if (splitSides === 0) {
            let state = code;
            if (code === 3) {
                let extra = 0;
                while (idx >= 0) {
                    const n = readNibble();
                    extra += n;
                    if (n < 15) break;
                }
                state = 3 + extra;
            }
            if (state > 0) {
                const slot = state - 1;
                counts[slot] = (counts[slot] || 0) + 1;
            }
        } else {
            const numChildren = splitSides === 3 ? 4 : 2;
            for (let c = 0; c < numChildren; c++) walkNode();
        }
    }
    walkNode();

    let bestSlot = 0, bestCount = -1;
    for (const k in counts) {
        if (counts[k] > bestCount) { bestCount = counts[k]; bestSlot = parseInt(k, 10); }
    }
    return bestSlot;
}

// ==========================================
// 📂 FILE LOADERS (3MF, STL, OBJ, GLB)
// ==========================================
function setLoadedGeometry(geometry, existingColors, optInfo, suppressToast = false) {
    if (currentMesh) {
        if (currentMesh.geometry && currentMesh.geometry.disposeBoundsTree) {
            currentMesh.geometry.disposeBoundsTree();
        }
        scene.remove(currentMesh);
        currentMesh.geometry.dispose();
        currentMesh.material.dispose();
    }

    geometry.computeVertexNormals();
    geometry.center();

    const faceCount = (geometry.attributes.position.count / 3) | 0;
    triangleColors = new Uint8Array(faceCount);
    if (existingColors && existingColors.length === faceCount) {
        for (let i = 0; i < faceCount; i++) {
            const s = existingColors[i] || 0;
            triangleColors[i] = s < filamentSlots.length ? s : 0;
        }
    }
    colorHistory = [];
    historyIndex = -1;

    if (geometry.computeBoundsTree) geometry.computeBoundsTree();
    spatialGrid = new SpatialGrid(geometry, 32);
    meshTopology = buildMeshTopology(geometry);
    precomputeGeometryMetrics(geometry);

    const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.45,
        metalness: 0.1,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1
    });

    currentMesh = new THREE.Mesh(geometry, material);
    currentMesh.castShadow = true;
    currentMesh.receiveShadow = true;
    scene.add(currentMesh);

    if (typeof layerScrubberReset === 'function') layerScrubberReset();
    refreshSlotRgbFloats();
    updateMeshVisualColors();
    if (typeof resetCamera === 'function') resetCamera();
    const box = new THREE.Box3().setFromObject(currentMesh);
    const size = box.getSize(new THREE.Vector3());
    if (typeof adaptBrushToModel === 'function') adaptBrushToModel(size);
    saveHistory(true);

    if (!suppressToast) {
        if (optInfo) {
            const tmpl = translations[currentLang]?.toastOptimized || "⚡ Model auto-optimized for fluid 60 FPS painting! ({orig}k ➔ {new}k triangles)";
            showToast(tmpl.replace('{orig}', optInfo.origK).replace('{new}', optInfo.newK));
        } else {
            showToast(translations[currentLang].toastLoaded);
        }
    }
}

function loadFile(file) {
    const name = file.name.toLowerCase();
    const reader = new FileReader();

    if (name.endsWith('.3mf')) {
        reader.onload = (e) => load3MFData(e.target.result);
        reader.readAsArrayBuffer(file);
    } else if (name.endsWith('.stl')) {
        reader.onload = (e) => {
            if (typeof THREE.STLLoader === 'undefined') {
                showToast("STLLoader unavailable.");
                return;
            }
            const loader = new THREE.STLLoader();
            let rawGeom = loader.parse(e.target.result);
            if (rawGeom.index) rawGeom = rawGeom.toNonIndexed();
            const { geom, optInfo } = simplifyGeometryIfNeeded(rawGeom);
            setLoadedGeometry(geom, null, optInfo);
        };
        reader.readAsArrayBuffer(file);
    } else if (name.endsWith('.obj')) {
        reader.onload = (e) => loadOBJData(e.target.result);
        reader.readAsText(file);
    } else if (name.endsWith('.glb') || name.endsWith('.gltf')) {
        reader.onload = (e) => loadGLBData(e.target.result);
        reader.readAsArrayBuffer(file);
    } else {
        showToast(currentLang === 'fr' ? "Formats supportés : .stl, .3mf, .obj, .glb" : "Supported formats: .stl, .3mf, .obj, .glb");
    }
}

function parse3MFTransformMatrix(transformStr) {
    const mat = new THREE.Matrix4();
    if (!transformStr) return mat;
    const arr = transformStr.trim().split(/\s+/).map(Number);
    if (arr.length === 12) {
        // 3MF spec is row-major for row vectors v * M:
        // x' = x*m00 + y*m10 + z*m20 + m30 -> Three.js row 0 = [arr[0], arr[3], arr[6], arr[9]]
        mat.set(
            arr[0], arr[3], arr[6], arr[9],
            arr[1], arr[4], arr[7], arr[10],
            arr[2], arr[5], arr[8], arr[11],
            0, 0, 0, 1
        );
    } else if (arr.length === 16) {
        mat.fromArray(arr);
    }
    return mat;
}

// Upgraded 3MF Parser: Supports 3D/Objects/*.model (Bambu Production Ext), paint_color,
// slic3rpe:mmu_segmentation, basematerials, m:colorgroup, and Metadata configs!
async function parse3MFWithJSZip(arrayBuffer) {
    if (typeof JSZip === 'undefined') throw new Error("JSZip is not available");
    const zip = new JSZip();
    const archive = await zip.loadAsync(arrayBuffer);

    const parser = new DOMParser();

    // 1. Parse Bambu/Orca Metadata/project_settings.config & model_settings.config first
    const configColors = [];
    const objectExtruders = {}; // objectId -> 0-based extruder index
    const projectEntry = archive.file("Metadata/project_settings.config");
    if (projectEntry) {
        try {
            const jsonText = await projectEntry.async("text");
            const proj = JSON.parse(jsonText);
            if (Array.isArray(proj.filament_colour) && proj.filament_colour.length > 0) {
                proj.filament_colour.forEach((col, idx) => {
                    const hex = normalizeHex(col, '#FFFFFF');
                    const fType = Array.isArray(proj.filament_type) ? (proj.filament_type[idx] || 'PLA Basic') : 'PLA Basic';
                    configColors.push({ name: `AMS #${idx + 1} (${fType})`, color: hex, type: fType });
                });
            }
        } catch (_) {}
    }

    const settingsEntry = archive.file("Metadata/model_settings.config");
    if (settingsEntry) {
        try {
            const settingsText = await settingsEntry.async("text");
            const sDoc = parser.parseFromString(settingsText, "application/xml");
            const objNodes = sDoc.querySelectorAll("object, part");
            objNodes.forEach(node => {
                const oid = node.getAttribute("id");
                const metas = node.getElementsByTagName("metadata");
                for (let m = 0; m < metas.length; m++) {
                    if (metas[m].getAttribute("key") === "extruder") {
                        const ext = parseInt(metas[m].getAttribute("value"), 10);
                        if (oid && !isNaN(ext) && ext >= 1) {
                            objectExtruders[oid] = ext - 1;
                        }
                    }
                }
            });
            const filaments = sDoc.getElementsByTagName("filament");
            if (configColors.length === 0) {
                for (let i = 0; i < filaments.length; i++) {
                    const col = filaments[i].getAttribute("color");
                    if (col) {
                        configColors.push({
                            name: filaments[i].getAttribute("type") || `Filament #${i + 1}`,
                            color: normalizeHex(col, '#FFFFFF'),
                            type: filaments[i].getAttribute("type") || 'PLA Basic'
                        });
                    }
                }
            }
        } catch (e) {
            console.warn("Could not parse model_settings.config", e);
        }
    }

    // 2. Locate main .model file + all sub-model files (3D/Objects/*.model)
    let mainEntry = archive.file("3D/3dmodel.model") || archive.file("3dmodel.model");
    if (!mainEntry) {
        const modelKey = Object.keys(archive.files).find(k => k.toLowerCase().endsWith('.model'));
        if (modelKey) mainEntry = archive.file(modelKey);
    }
    if (!mainEntry) throw new Error("No 3D model XML found in 3MF archive");

    const modelDocs = new Map(); // normalizedPath -> Document
    const parseModelDoc = async (zipPath) => {
        const clean = zipPath.replace(/^\/+/, '');
        if (modelDocs.has(clean)) return modelDocs.get(clean);
        const entry = archive.file(clean) || archive.file(Object.keys(archive.files).find(k => k.toLowerCase() === clean.toLowerCase()));
        if (!entry) return null;
        const xmlText = await entry.async("text");
        const d = parser.parseFromString(xmlText, "application/xml");
        modelDocs.set(clean, d);
        return d;
    };

    const mainDoc = await parseModelDoc(mainEntry.name);
    // Load any sub-models under 3D/Objects/
    for (const k of Object.keys(archive.files)) {
        if (/^3D\/Objects\/.*\.model$/i.test(k)) {
            await parseModelDoc(k);
        }
    }

    // 3. Extract resource material groups per document (pid -> [{color, name, type}])
    const resourceGroups = {};
    const bmElements = mainDoc.getElementsByTagName("basematerials");
    for (let i = 0; i < bmElements.length; i++) {
        const rid = bmElements[i].getAttribute("id") || `bm_${i}`;
        const list = [];
        const bases = bmElements[i].getElementsByTagName("base");
        for (let j = 0; j < bases.length; j++) {
            const dc = bases[j].getAttribute("displaycolor") || "#ffffff";
            const hex = normalizeHex(dc, "#FFFFFF");
            const name = bases[j].getAttribute("name") || `Slot #${j + 1}`;
            list.push({ name, color: hex, type: "PLA Basic" });
        }
        resourceGroups[rid] = list;
    }

    const cgElements = mainDoc.querySelectorAll("colorgroup, m\\:colorgroup");
    cgElements.forEach((cg, i) => {
        const rid = cg.getAttribute("id") || `cg_${i}`;
        const list = [];
        const cols = cg.querySelectorAll("color, m\\:color");
        cols.forEach((cEl, j) => {
            const dc = cEl.getAttribute("color") || "#ffffff";
            list.push({ name: `Color #${j + 1}`, color: normalizeHex(dc, "#FFFFFF"), type: "PLA Basic" });
        });
        resourceGroups[rid] = list;
    });

    // Determine authoritative palette
    let chosenPalette = [];
    if (configColors.length >= 2) {
        chosenPalette = configColors;
    } else {
        // Pick largest resource group
        for (const k of Object.keys(resourceGroups)) {
            if (resourceGroups[k].length > chosenPalette.length) {
                chosenPalette = resourceGroups[k];
            }
        }
    }

    if (chosenPalette.length > 1) {
        filamentSlots = chosenPalette.slice(0, 16).map((mc, idx) => ({
            id: idx + 1,
            name: mc.name || `Slot #${idx + 1}`,
            color: mc.color,
            hex: mc.color,
            type: mc.type || "PLA Basic"
        }));
        activeSlotIndex = 0;
        refreshSlotRgbFloats();
        renderFilamentGrid();
    } else if (chosenPalette.length === 1 && filamentSlots.length > 0) {
        filamentSlots[0].color = chosenPalette[0].color;
        filamentSlots[0].hex = chosenPalette[0].color;
        refreshSlotRgbFloats();
        renderFilamentGrid();
    }

    // Helper: parse all <object> nodes in a given doc
    function extractObjectsFromDoc(doc, defaultPath) {
        const map = {};
        const objectElements = doc.getElementsByTagName("object");
        for (let i = 0; i < objectElements.length; i++) {
            const obj = objectElements[i];
            const id = obj.getAttribute("id");
            const objPid = obj.getAttribute("pid");
            const objPindex = parseInt(obj.getAttribute("pindex") || obj.getAttribute("p1") || "0", 10) || 0;
            const defaultExtruder = objectExtruders[id] !== undefined ? objectExtruders[id] : objPindex;

            const mesh = obj.getElementsByTagName("mesh")[0];
            if (mesh) {
                const vertices = [];
                const vertElements = mesh.getElementsByTagName("vertex");
                for (let v = 0; v < vertElements.length; v++) {
                    vertices.push(
                        parseFloat(vertElements[v].getAttribute("x") || "0"),
                        parseFloat(vertElements[v].getAttribute("y") || "0"),
                        parseFloat(vertElements[v].getAttribute("z") || "0")
                    );
                }

                const triangles = [];
                const triElements = mesh.getElementsByTagName("triangle");
                for (let t = 0; t < triElements.length; t++) {
                    const tri = triElements[t];
                    const v1 = parseInt(tri.getAttribute("v1"), 10);
                    const v2 = parseInt(tri.getAttribute("v2"), 10);
                    const v3 = parseInt(tri.getAttribute("v3"), 10);

                    const paintAttr = tri.getAttribute("paint_color") || tri.getAttribute("slic3rpe:mmu_segmentation");
                    let slot = defaultExtruder;
                    if (paintAttr) {
                        slot = decodeBambuPaintColor(paintAttr);
                    } else {
                        const p1Str = tri.getAttribute("p1") || tri.getAttribute("pindex");
                        const pid = tri.getAttribute("pid") || objPid;
                        if (p1Str !== null) {
                            const pIdx = parseInt(p1Str, 10);
                            if (!isNaN(pIdx)) {
                                // Map resource color hex to filament slot if needed
                                if (pid && resourceGroups[pid] && resourceGroups[pid][pIdx] && configColors.length === 0) {
                                    slot = pIdx;
                                } else {
                                    slot = pIdx;
                                }
                            }
                        }
                    }
                    triangles.push({ v1, v2, v3, slot });
                }
                map[id] = { type: "mesh", vertices, triangles };
            }

            const components = obj.getElementsByTagName("components")[0];
            if (components) {
                const compElements = components.getElementsByTagName("component");
                const compList = [];
                for (let c = 0; c < compElements.length; c++) {
                    const comp = compElements[c];
                    const targetId = comp.getAttribute("objectid");
                    const pPath = comp.getAttribute("p:path") || comp.getAttributeNS("http://schemas.microsoft.com/3dmanufacturing/production/2015/06", "path") || defaultPath;
                    const mat = parse3MFTransformMatrix(comp.getAttribute("transform"));
                    compList.push({ targetId, targetPath: pPath.replace(/^\/+/, ''), matrix: mat });
                }
                map[id] = { type: "components", components: compList };
            }
        }
        return map;
    }

    const docObjects = new Map();
    for (const [p, d] of modelDocs.entries()) {
        docObjects.set(p, extractObjectsFromDoc(d, p));
    }

    const rootPath = mainEntry.name.replace(/^\/+/, '');
    const buildItems = [];
    const buildItemElements = mainDoc.getElementsByTagName("item");
    for (let i = 0; i < buildItemElements.length; i++) {
        const item = buildItemElements[i];
        const objId = item.getAttribute("objectid");
        const pPath = (item.getAttribute("p:path") || rootPath).replace(/^\/+/, '');
        const mat = parse3MFTransformMatrix(item.getAttribute("transform"));
        buildItems.push({ objId, path: pPath, matrix: mat });
    }

    if (buildItems.length === 0) {
        const rootMap = docObjects.get(rootPath) || {};
        Object.keys(rootMap).forEach(id => {
            if (rootMap[id].type === "mesh") buildItems.push({ objId: id, path: rootPath, matrix: new THREE.Matrix4() });
        });
    }

    const combinedPositions = [];
    const combinedColors = [];
    const vVec = new THREE.Vector3();

    function renderObject(objId, docPath, parentMatrix) {
        const map = docObjects.get(docPath) || docObjects.get(rootPath);
        if (!map) return;
        const obj = map[objId];
        if (!obj) return;

        if (obj.type === "mesh") {
            const verts = obj.vertices;
            const tris = obj.triangles;
            for (let t = 0; t < tris.length; t++) {
                const tri = tris[t];
                const i1 = tri.v1 * 3, i2 = tri.v2 * 3, i3 = tri.v3 * 3;
                if (i1 + 2 >= verts.length || i2 + 2 >= verts.length || i3 + 2 >= verts.length) continue;

                vVec.set(verts[i1], verts[i1 + 1], verts[i1 + 2]).applyMatrix4(parentMatrix);
                combinedPositions.push(vVec.x, vVec.y, vVec.z);

                vVec.set(verts[i2], verts[i2 + 1], verts[i2 + 2]).applyMatrix4(parentMatrix);
                combinedPositions.push(vVec.x, vVec.y, vVec.z);

                vVec.set(verts[i3], verts[i3 + 1], verts[i3 + 2]).applyMatrix4(parentMatrix);
                combinedPositions.push(vVec.x, vVec.y, vVec.z);

                const slot = Math.max(0, Math.min(filamentSlots.length - 1, tri.slot || 0));
                combinedColors.push(slot);
            }
        } else if (obj.type === "components") {
            obj.components.forEach(comp => {
                const compMat = parentMatrix.clone().multiply(comp.matrix);
                renderObject(comp.targetId, comp.targetPath || docPath, compMat);
            });
        }
    }

    buildItems.forEach(item => renderObject(item.objId, item.path, item.matrix));

    if (combinedPositions.length === 0) {
        for (const [, map] of docObjects.entries()) {
            for (const id of Object.keys(map)) {
                if (map[id].type === "mesh") renderObject(id, rootPath, new THREE.Matrix4());
            }
        }
    }

    if (combinedPositions.length === 0) throw new Error("No triangles found in 3MF file");

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(combinedPositions, 3));
    return { geom, colors: combinedColors };
}

async function load3MFData(arrayBuffer) {
    let loaded = false;
    let finalGeom = null;
    let finalColors = null;
    let optInfo = null;

    // Engine 1: Try our upgraded JSZip + Bambu/3MF XML Parser FIRST (preserves paint_color, p1, 3D/Objects/*.model!)
    if (typeof JSZip !== 'undefined') {
        try {
            const result = await parse3MFWithJSZip(arrayBuffer);
            if (result && result.geom) {
                const opt = simplifyGeometryIfNeeded(result.geom, result.colors);
                finalGeom = opt.geom;
                finalColors = opt.colors;
                optInfo = opt.optInfo;
                loaded = true;
            }
        } catch (zipErr) {
            console.warn("Native JSZip 3MF parser note, trying ThreeMFLoader fallback:", zipErr);
        }
    }

    // Engine 2: Three.ThreeMFLoader fallback
    if (!loaded && typeof THREE.ThreeMFLoader !== 'undefined' && typeof fflate !== 'undefined') {
        try {
            const loader = new THREE.ThreeMFLoader();
            const group = loader.parse(arrayBuffer);
            if (group) {
                group.updateMatrixWorld(true);
                const meshes = [];
                group.traverse(child => {
                    if (child.isMesh && child.geometry && child.geometry.attributes.position) {
                        meshes.push(child);
                    }
                });

                if (meshes.length > 0) {
                    const combinedPositions = [];
                    const combinedColors = [];
                    const meshColors = meshes.map(m => {
                        let c = null;
                        if (m.material) {
                            if (Array.isArray(m.material) && m.material[0] && m.material[0].color) c = m.material[0].color;
                            else if (m.material.color) c = m.material.color;
                        }
                        return c || new THREE.Color(0xf8fafc);
                    });

                    const uniqueHexes = [];
                    meshColors.forEach(mc => {
                        const hex = '#' + mc.getHexString().toUpperCase();
                        if (!uniqueHexes.includes(hex)) uniqueHexes.push(hex);
                    });

                    if (uniqueHexes.length > 1) {
                        filamentSlots = uniqueHexes.slice(0, 16).map((hex, idx) => ({
                            id: idx + 1, name: `Part #${idx + 1}`, color: hex, hex: hex, type: "PLA Basic"
                        }));
                        activeSlotIndex = 0;
                        refreshSlotRgbFloats();
                        renderFilamentGrid();
                    }

                    meshes.forEach((mesh, mIdx) => {
                        let meshGeom = mesh.geometry;
                        if (meshGeom.index) meshGeom = meshGeom.toNonIndexed();
                        const pos = meshGeom.attributes.position;
                        const colAttr = meshGeom.attributes.color;
                        const meshCol = meshColors[mIdx];
                        const v = new THREE.Vector3();
                        for (let i = 0; i < pos.count; i++) {
                            v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
                            combinedPositions.push(v.x, v.y, v.z);
                            if (i % 3 === 0) {
                                if (colAttr) {
                                    combinedColors.push(findClosestSlotPerceptual(colAttr.getX(i), colAttr.getY(i), colAttr.getZ(i)));
                                } else {
                                    combinedColors.push(findClosestSlotPerceptual(meshCol.r, meshCol.g, meshCol.b));
                                }
                            }
                        }
                    });

                    if (combinedPositions.length > 0) {
                        const rawGeom = new THREE.BufferGeometry();
                        rawGeom.setAttribute('position', new THREE.Float32BufferAttribute(combinedPositions, 3));
                        const opt = simplifyGeometryIfNeeded(rawGeom, combinedColors);
                        finalGeom = opt.geom;
                        finalColors = opt.colors;
                        optInfo = opt.optInfo;
                        loaded = true;
                    }
                }
            }
        } catch (loaderErr) {
            console.error("ThreeMFLoader failed:", loaderErr);
        }
    }

    if (loaded && finalGeom) {
        setLoadedGeometry(finalGeom, finalColors, optInfo, true);
        showToast(currentLang === 'fr' ? "Modèle 3MF chargé avec succès !" : "3MF model loaded successfully!");
    } else {
        showToast(currentLang === 'fr' ? "Erreur : Impossible de lire le fichier 3MF." : "Error: Failed to parse 3MF file.");
    }
}

function loadOBJData(text) {
    try {
        const loader = new THREE.OBJLoader();
        const group = loader.parse(text);
        const meshes = [];
        group.traverse(c => { if (c.isMesh && c.geometry) meshes.push(c); });
        if (meshes.length === 0) {
            showToast(currentLang === 'fr' ? "Aucun maillage trouvé dans ce fichier OBJ." : "No geometry found in OBJ file.");
            return;
        }

        const combinedPositions = [];
        const combinedColors = [];
        let hasAnyColor = false;

        meshes.forEach(mesh => {
            let geom = mesh.geometry;
            if (geom.index) geom = geom.toNonIndexed();
            const pos = geom.attributes.position;
            const colAttr = geom.attributes.color;
            const matCol = (mesh.material && mesh.material.color) ? mesh.material.color : null;
            if (colAttr || matCol) hasAnyColor = true;
            mesh.updateMatrixWorld(true);
            const v = new THREE.Vector3();
            for (let i = 0; i < pos.count; i++) {
                v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
                combinedPositions.push(v.x, v.y, v.z);
                if (i % 3 === 0) {
                    if (colAttr) {
                        combinedColors.push(findClosestSlotPerceptual(colAttr.getX(i), colAttr.getY(i), colAttr.getZ(i)));
                    } else if (matCol) {
                        combinedColors.push(findClosestSlotPerceptual(matCol.r, matCol.g, matCol.b));
                    } else {
                        combinedColors.push(0);
                    }
                }
            }
        });

        const rawGeom = new THREE.BufferGeometry();
        rawGeom.setAttribute('position', new THREE.Float32BufferAttribute(combinedPositions, 3));
        const { geom, colors, optInfo } = simplifyGeometryIfNeeded(rawGeom, hasAnyColor ? combinedColors : null);
        setLoadedGeometry(geom, colors, optInfo);
    } catch (e) {
        console.error(e);
        showToast(currentLang === 'fr' ? "Erreur lors de la lecture du fichier OBJ." : "Failed to parse OBJ file.");
    }
}

function loadGLBData(arrayBuffer) {
    try {
        const loader = new THREE.GLTFLoader();
        loader.parse(arrayBuffer, '', (gltf) => {
            const meshes = [];
            gltf.scene.traverse(c => { if (c.isMesh && c.geometry) meshes.push(c); });
            if (meshes.length === 0) {
                showToast(currentLang === 'fr' ? "Aucun maillage dans le fichier GLB." : "No mesh found in GLB file.");
                return;
            }

            // Collect distinct material colors to build matching palette if > 1 colors exist
            const matHexes = [];
            meshes.forEach(m => {
                const mat = Array.isArray(m.material) ? m.material[0] : m.material;
                if (mat && mat.color) {
                    const h = '#' + mat.color.getHexString().toUpperCase();
                    if (!matHexes.includes(h)) matHexes.push(h);
                }
            });
            if (matHexes.length > 1) {
                filamentSlots = matHexes.slice(0, 16).map((hex, idx) => ({
                    id: idx + 1, name: `GLB #${idx + 1}`, color: hex, hex: hex, type: "PLA Basic"
                }));
                refreshSlotRgbFloats();
                renderFilamentGrid();
            }

            const combinedPositions = [];
            const combinedColors = [];
            let hasVertexOrMatColor = false;

            meshes.forEach(mesh => {
                let geom = mesh.geometry;
                if (geom.index) geom = geom.toNonIndexed();
                const pos = geom.attributes.position;
                const colAttr = geom.attributes.color;
                const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
                const matCol = (mat && mat.color) ? mat.color : null;
                if (colAttr || matCol) hasVertexOrMatColor = true;
                mesh.updateMatrixWorld(true);
                const v = new THREE.Vector3();
                for (let i = 0; i < pos.count; i++) {
                    v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
                    combinedPositions.push(v.x, v.y, v.z);
                    if (i % 3 === 0) {
                        if (colAttr) {
                            combinedColors.push(findClosestSlotPerceptual(colAttr.getX(i), colAttr.getY(i), colAttr.getZ(i)));
                        } else if (matCol) {
                            combinedColors.push(findClosestSlotPerceptual(matCol.r, matCol.g, matCol.b));
                        } else {
                            combinedColors.push(0);
                        }
                    }
                }
            });

            const rawGeom = new THREE.BufferGeometry();
            rawGeom.setAttribute('position', new THREE.Float32BufferAttribute(combinedPositions, 3));
            const { geom, colors, optInfo } = simplifyGeometryIfNeeded(rawGeom, hasVertexOrMatColor ? combinedColors : null);
            setLoadedGeometry(geom, colors, optInfo);
        }, (err) => {
            console.error("GLTF parse error:", err);
            showToast(currentLang === 'fr' ? "Erreur de lecture GLB/GLTF." : "Failed to parse GLB/GLTF file.");
        });
    } catch (e) {
        console.error(e);
        showToast(currentLang === 'fr' ? "Erreur de lecture GLB/GLTF." : "Failed to parse GLB/GLTF file.");
    }
}
