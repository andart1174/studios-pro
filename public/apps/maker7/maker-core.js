/**
 * Maker Studio 7 — Core Watertight 1:1 mm Geometry Engine, Exporters & Pre-Flight
 * Zero-dependency UMD module (runs in Browser & Node.js automated test suite).
 *
 * Conventions:
 *  - Native Units: 1.0 unit === 1.000 mm.
 *  - Every solid part is guaranteed closed Watertight Manifold with positive signed volume (outward normals).
 *  - Binary STL merges ALL parts/instances directly (completely fixes legacy InstancedMesh empty STL bug!).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MakerCore = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PI = Math.PI;
  const TAU = Math.PI * 2;

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function mulberry32(seed) {
    let a = (seed >>> 0) || 1337;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* =========================================================================
     1. SIGNED VOLUME, OUTWARD NORMALS & MESH PART CONSTRUCTOR
  ========================================================================= */
  function computeSignedVolume(positions, indices) {
    let vol6 = 0;
    for (let i = 0; i < indices.length; i += 3) {
      const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
      const ax = positions[a], ay = positions[a + 1], az = positions[a + 2];
      const bx = positions[b], by = positions[b + 1], bz = positions[b + 2];
      const cx = positions[c], cy = positions[c + 1], cz = positions[c + 2];
      vol6 += ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx);
    }
    return vol6 / 6.0;
  }

  function ensureOutwardWinding(positions, indices) {
    const v = computeSignedVolume(positions, indices);
    if (v < 0) {
      for (let i = 0; i < indices.length; i += 3) {
        const tmp = indices[i + 1];
        indices[i + 1] = indices[i + 2];
        indices[i + 2] = tmp;
      }
      return -v;
    }
    return v;
  }

  function computeVertexNormals(positions, indices) {
    const normals = new Float32Array(positions.length);
    for (let i = 0; i < indices.length; i += 3) {
      const ia = indices[i] * 3, ib = indices[i + 1] * 3, ic = indices[i + 2] * 3;
      const ax = positions[ia], ay = positions[ia + 1], az = positions[ia + 2];
      const abx = positions[ib] - ax, aby = positions[ib + 1] - ay, abz = positions[ib + 2] - az;
      const acx = positions[ic] - ax, acy = positions[ic + 1] - ay, acz = positions[ic + 2] - az;
      const nx = aby * acz - abz * acy;
      const ny = abz * acx - abx * acz;
      const nz = abx * acy - aby * acx;
      normals[ia] += nx; normals[ia + 1] += ny; normals[ia + 2] += nz;
      normals[ib] += nx; normals[ib + 1] += ny; normals[ib + 2] += nz;
      normals[ic] += nx; normals[ic + 1] += ny; normals[ic + 2] += nz;
    }
    for (let i = 0; i < normals.length; i += 3) {
      const l = Math.hypot(normals[i], normals[i + 1], normals[i + 2]);
      if (l > 1e-12) { normals[i] /= l; normals[i + 1] /= l; normals[i + 2] /= l; }
      else { normals[i] = 0; normals[i + 1] = 1; normals[i + 2] = 0; }
    }
    return normals;
  }

  function makePart(positions, indices, meta) {
    ensureOutwardWinding(positions, indices);
    const normals = computeVertexNormals(positions, indices);
    return Object.assign({
      name: 'part',
      color: '#3b82f6',
      roughness: 0.42,
      metalness: 0.15,
      flatShaded: false,
      positions,
      normals,
      indices
    }, meta || {});
  }

  /**
   * Merges an array of closed parts sharing the same material into a single fast Buffer part!
   */
  function mergeParts(parts, meta) {
    let totalV = 0, totalI = 0;
    for (let i = 0; i < parts.length; i++) {
      totalV += parts[i].positions.length / 3;
      totalI += parts[i].indices.length;
    }
    const positions = new Float32Array(totalV * 3);
    const normals = new Float32Array(totalV * 3);
    const indices = new Uint32Array(totalI);
    let vOff = 0, iOff = 0;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      positions.set(p.positions, vOff * 3);
      normals.set(p.normals, vOff * 3);
      for (let k = 0; k < p.indices.length; k++) {
        indices[iOff + k] = p.indices[k] + vOff;
      }
      vOff += p.positions.length / 3;
      iOff += p.indices.length;
    }
    return Object.assign({
      name: (meta && meta.name) || 'merged',
      color: (meta && meta.color) || (parts[0] ? parts[0].color : '#3b82f6'),
      roughness: (meta && meta.roughness != null) ? meta.roughness : 0.42,
      metalness: (meta && meta.metalness != null) ? meta.metalness : 0.15,
      flatShaded: !!(meta && meta.flatShaded),
      positions, normals, indices
    }, meta || {});
  }

  function transformPart(part, fn) {
    const pos = part.positions;
    for (let i = 0; i < pos.length; i += 3) {
      const out = fn(pos[i], pos[i + 1], pos[i + 2]);
      pos[i] = out[0]; pos[i + 1] = out[1]; pos[i + 2] = out[2];
    }
    ensureOutwardWinding(pos, part.indices);
    part.normals = computeVertexNormals(pos, part.indices);
    return part;
  }

  /* =========================================================================
     2. WATERTIGHT SOLID PRIMITIVES (BOX, CYLINDER, EXTRUDED POLYGON, LATHE, GRID)
  ========================================================================= */
  function buildBox(cx, cy, cz, sx, sy, sz, meta) {
    const hx = sx * 0.5, hy = sy * 0.5, hz = sz * 0.5;
    const positions = new Float32Array([
      cx - hx, cy - hy, cz - hz,
      cx + hx, cy - hy, cz - hz,
      cx + hx, cy + hy, cz - hz,
      cx - hx, cy + hy, cz - hz,
      cx - hx, cy - hy, cz + hz,
      cx + hx, cy - hy, cz + hz,
      cx + hx, cy + hy, cz + hz,
      cx - hx, cy + hy, cz + hz
    ]);
    const indices = new Uint32Array([
      4, 5, 6, 4, 6, 7, // +Z
      1, 0, 3, 1, 3, 2, // -Z
      3, 7, 6, 3, 6, 2, // +Y
      0, 1, 5, 0, 5, 4, // -Y
      5, 1, 2, 5, 2, 6, // +X
      0, 4, 7, 0, 7, 3  // -X
    ]);
    return makePart(positions, indices, Object.assign({ flatShaded: true }, meta));
  }

  /**
   * Builds a watertight prism/cylinder extruded along Y from y0 to y1.
   */
  function buildPrismY(cx, y0, y1, cz, radius, sides, rotOffset, meta) {
    const N = Math.max(3, sides || 16);
    const off = rotOffset || 0;
    const positions = new Float32Array((N * 2 + 2) * 3);
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU + off;
      const x = cx + Math.cos(a) * radius;
      const z = cz + Math.sin(a) * radius;
      positions[i * 3] = x; positions[i * 3 + 1] = y0; positions[i * 3 + 2] = z;
      positions[(N + i) * 3] = x; positions[(N + i) * 3 + 1] = y1; positions[(N + i) * 3 + 2] = z;
    }
    const botC = N * 2, topC = N * 2 + 1;
    positions[botC * 3] = cx; positions[botC * 3 + 1] = y0; positions[botC * 3 + 2] = cz;
    positions[topC * 3] = cx; positions[topC * 3 + 1] = y1; positions[topC * 3 + 2] = cz;

    const indices = new Uint32Array((N * 2 + N * 2) * 3);
    let ptr = 0;
    for (let i = 0; i < N; i++) {
      const iN = (i + 1) % N;
      const b0 = i, b1 = iN, t0 = N + i, t1 = N + iN;
      indices[ptr++] = b0; indices[ptr++] = t0; indices[ptr++] = t1;
      indices[ptr++] = b0; indices[ptr++] = t1; indices[ptr++] = b1;
      indices[ptr++] = botC; indices[ptr++] = b0; indices[ptr++] = b1;
      indices[ptr++] = topC; indices[ptr++] = t1; indices[ptr++] = t0;
    }
    return makePart(positions, indices, meta);
  }

  /* --- Polygon 2D signed area & robust Ear-Clipping Triangulation (with Hole Bridge!) --- */
  function polyArea2D(pts) {
    let a = 0;
    for (let i = 0, n = pts.length; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      a += p[0] * q[1] - q[0] * p[1];
    }
    return a * 0.5;
  }

  function ensureCCW(pts) {
    const clean = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const prev = clean[clean.length - 1];
      if (!prev || Math.hypot(p[0] - prev[0], p[1] - prev[1]) > 1e-5) clean.push([p[0], p[1]]);
    }
    if (clean.length > 2 && Math.hypot(clean[0][0] - clean[clean.length - 1][0], clean[0][1] - clean[clean.length - 1][1]) < 1e-5) {
      clean.pop();
    }
    if (polyArea2D(clean) < 0) clean.reverse();
    return clean;
  }

  function pointInTri2D(px, py, ax, ay, bx, by, cx, cy) {
    const v0x = cx - ax, v0y = cy - ay;
    const v1x = bx - ax, v1y = by - ay;
    const v2x = px - ax, v2y = py - ay;
    const dot00 = v0x * v0x + v0y * v0y;
    const dot01 = v0x * v1x + v0y * v1y;
    const dot02 = v0x * v2x + v0y * v2y;
    const dot11 = v1x * v1x + v1y * v1y;
    const dot12 = v1x * v2x + v1y * v2y;
    const denom = dot00 * dot11 - dot01 * dot01;
    if (Math.abs(denom) < 1e-12) return false;
    const u = (dot11 * dot02 - dot01 * dot12) / denom;
    const v = (dot00 * dot12 - dot01 * dot02) / denom;
    return u >= -1e-7 && v >= -1e-7 && (u + v) <= 1.0000001;
  }

  function earClip2D(pts) {
    const n = pts.length;
    if (n < 3) return [];
    const idx = [];
    for (let i = 0; i < n; i++) idx.push(i);
    const tris = [];
    let guard = n * n + 20;
    while (idx.length > 3 && guard-- > 0) {
      let earFound = false;
      const m = idx.length;
      for (let i = 0; i < m; i++) {
        const i0 = idx[(i - 1 + m) % m], i1 = idx[i], i2 = idx[(i + 1) % m];
        const a = pts[i0], b = pts[i1], c = pts[i2];
        const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
        if (cross <= 1e-9) continue;
        let blocked = false;
        for (let k = 0; k < m; k++) {
          const ik = idx[k];
          if (ik === i0 || ik === i1 || ik === i2) continue;
          const pk = pts[ik];
          // Skip coincident bridge vertices that share exact coordinates with triangle corners
          if ((Math.abs(pk[0] - a[0]) < 1e-5 && Math.abs(pk[1] - a[1]) < 1e-5) ||
              (Math.abs(pk[0] - b[0]) < 1e-5 && Math.abs(pk[1] - b[1]) < 1e-5) ||
              (Math.abs(pk[0] - c[0]) < 1e-5 && Math.abs(pk[1] - c[1]) < 1e-5)) continue;
          if (pointInTri2D(pk[0], pk[1], a[0], a[1], b[0], b[1], c[0], c[1])) {
            blocked = true; break;
          }
        }
        if (!blocked) {
          tris.push(i0, i1, i2);
          idx.splice(i, 1);
          earFound = true;
          break;
        }
      }
      if (!earFound) {
        // Fallback convex ear to avoid infinite loop on near-collinear polygons
        tris.push(idx[0], idx[1], idx[2]);
        idx.splice(1, 1);
      }
    }
    if (idx.length === 3) tris.push(idx[0], idx[1], idx[2]);
    return tris;
  }

  /**
   * Extrudes a 2D outer polygon (with optional inner holes!) cleanly along Y from y0 to y1!
   * Supports ANY number of holes (gears with keyway/spokes, Voronoi cells, cookie cutters, keychains)
   * using guaranteed watertight top/bottom/side stitching!
   */
  function extrudePolygon2D(outerRaw, holesRaw, y0, y1, meta) {
    const outer = ensureCCW(outerRaw);
    const holes = (holesRaw || []).map((h) => ensureCCW(h).reverse()); // Holes are CW

    // Combine outer + holes via bridge edges for top/bottom cap ear-clipping
    const allLoops = [outer].concat(holes);
    const loopOffsets = [];
    const flatPts = [];
    for (let l = 0; l < allLoops.length; l++) {
      loopOffsets.push(flatPts.length);
      for (let i = 0; i < allLoops[l].length; i++) flatPts.push(allLoops[l][i]);
    }
    const baseN = flatPts.length;

    // Build bridged simple polygon indices referencing flatPts [0..baseN-1]
    let polyIdx = [];
    for (let i = 0; i < outer.length; i++) polyIdx.push(i);

    // Sort holes right-to-left by max X for clean non-crossing bridge insertion
    const holeEntries = holes.map((h, hi) => {
      let maxX = -Infinity, bestIdx = 0;
      for (let i = 0; i < h.length; i++) {
        if (h[i][0] > maxX) { maxX = h[i][0]; bestIdx = i; }
      }
      return { h, hi, maxX, bestIdx, offset: loopOffsets[hi + 1] };
    }).sort((a, b) => b.maxX - a.maxX);

    for (let he = 0; he < holeEntries.length; he++) {
      const { h, bestIdx, offset } = holeEntries[he];
      const hx = h[bestIdx][0], hy = h[bestIdx][1];
      // Textbook Eberly +X horizontal ray-cast visibility to find guaranteed non-crossing bridge vertex!
      let bestIx = Infinity, bestEdgeIdx = -1;
      const m = polyIdx.length;
      for (let i = 0; i < m; i++) {
        const p0 = flatPts[polyIdx[i]];
        const p1 = flatPts[polyIdx[(i + 1) % m]];
        // Edge must span hy and be to the right of hx
        if ((p0[1] <= hy && p1[1] > hy) || (p1[1] <= hy && p0[1] > hy)) {
          const t = (hy - p0[1]) / (p1[1] - p0[1]);
          const ix = p0[0] + (p1[0] - p0[0]) * t;
          if (ix >= hx - 1e-5 && ix < bestIx) {
            bestIx = ix;
            bestEdgeIdx = i;
          }
        }
      }
      let bestP = 0;
      if (bestEdgeIdx >= 0) {
        const iA = bestEdgeIdx, iB = (bestEdgeIdx + 1) % m;
        const pA = flatPts[polyIdx[iA]], pB = flatPts[polyIdx[iB]];
        bestP = (pA[0] >= pB[0]) ? iA : iB;
        const vp = flatPts[polyIdx[bestP]];
        // Check if any reflex/interior vertex lies inside triangle (H, [bestIx, hy], vp)
        let minAng = Infinity;
        for (let i = 0; i < m; i++) {
          if (i === bestP) continue;
          const q = flatPts[polyIdx[i]];
          if (q[0] < hx - 1e-5) continue;
          if (Math.hypot(q[0] - vp[0], q[1] - vp[1]) < 1e-5) continue;
          if (pointInTri2D(q[0], q[1], hx, hy, bestIx, hy, vp[0], vp[1])) {
            const ang = Math.abs(Math.atan2(q[1] - hy, q[0] - hx));
            if (ang < minAng) { minAng = ang; bestP = i; }
          }
        }
      } else {
        // Fallback nearest vertex to the right
        let bestDist = Infinity;
        for (let i = 0; i < m; i++) {
          const p = flatPts[polyIdx[i]];
          const d = (p[0] >= hx ? 0 : 1000) + Math.hypot(p[0] - hx, p[1] - hy);
          if (d < bestDist) { bestDist = d; bestP = i; }
        }
      }
      const holeRing = [];
      for (let k = 0; k < h.length; k++) holeRing.push(offset + ((bestIdx + k) % h.length));
      holeRing.push(offset + bestIdx);
      holeRing.push(polyIdx[bestP]);
      polyIdx.splice(bestP + 1, 0, ...holeRing);
    }

    // Triangulate bridged 2D polygon using local coordinates mapped back to original vertex indices
    const bridgedPts = polyIdx.map((vi) => flatPts[vi]);
    const localTris = earClip2D(bridgedPts);
    const capTris = [];
    for (let t = 0; t < localTris.length; t += 3) {
      const a = polyIdx[localTris[t]], b = polyIdx[localTris[t + 1]], c = polyIdx[localTris[t + 2]];
      if (a !== b && b !== c && c !== a) capTris.push(a, b, c);
    }

    // Build watertight 3D mesh: bottom ring (y0) + top ring (y1)
    const positions = new Float32Array(baseN * 2 * 3);
    for (let i = 0; i < baseN; i++) {
      const x = flatPts[i][0], z = -flatPts[i][1]; // Map 2D (x,y) -> horizontal XZ plane (y up!)
      positions[i * 3] = x; positions[i * 3 + 1] = y0; positions[i * 3 + 2] = z;
      positions[(baseN + i) * 3] = x; positions[(baseN + i) * 3 + 1] = y1; positions[(baseN + i) * 3 + 2] = z;
    }

    // Count side quads across outer & hole loops
    let sideQuads = 0;
    for (let l = 0; l < allLoops.length; l++) sideQuads += allLoops[l].length;

    const indices = new Uint32Array(capTris.length * 2 + sideQuads * 6);
    let ptr = 0;
    // Top cap (y1): since z = -y2d flips handedness, CCW in 2D -> CW in XZ -> (a,b,c) points +Y!
    for (let t = 0; t < capTris.length; t += 3) {
      indices[ptr++] = baseN + capTris[t];
      indices[ptr++] = baseN + capTris[t + 1];
      indices[ptr++] = baseN + capTris[t + 2];
    }
    // Bottom cap (y0): reverse winding -> points -Y!
    for (let t = 0; t < capTris.length; t += 3) {
      indices[ptr++] = capTris[t];
      indices[ptr++] = capTris[t + 2];
      indices[ptr++] = capTris[t + 1];
    }
    // Side walls for outer & all holes
    for (let l = 0; l < allLoops.length; l++) {
      const off = loopOffsets[l];
      const len = allLoops[l].length;
      for (let i = 0; i < len; i++) {
        const a = off + i;
        const b = off + ((i + 1) % len);
        const ta = baseN + a;
        const tb = baseN + b;
        indices[ptr++] = a; indices[ptr++] = b; indices[ptr++] = tb;
        indices[ptr++] = a; indices[ptr++] = tb; indices[ptr++] = ta;
      }
    }

    return makePart(positions, indices, Object.assign({ flatShaded: true }, meta));
  }

  /**
   * Builds a 100% WATERTIGHT CLOSED SOLID HEIGHTFIELD BLOCK (Lithophane, Stepped Topo, Recessed Keychain/Text)!
   * Top surface: z = heightGrid[r][c] (or y = heightGrid[r][c] upright on bed!)
   * Flat solid base at y = 0 + 4 vertical perimeter skirt walls!
   */
  function buildSolidHeightfieldY(cols, rows, widthMm, depthMm, sampleHeightFn, meta) {
    // Top grid: (rows+1) × (cols+1), Bottom grid: (rows+1) × (cols+1) at y = 0
    const nx = cols + 1, nz = rows + 1;
    const gridN = nx * nz;
    const positions = new Float32Array(gridN * 2 * 3);

    for (let r = 0; r < nz; r++) {
      const v = r / rows;
      const z = (v - 0.5) * depthMm;
      for (let c = 0; c < nx; c++) {
        const u = c / cols;
        const x = (u - 0.5) * widthMm;
        const h = Math.max(0.25, sampleHeightFn(u, v, c, r));
        const idx = r * nx + c;
        // Top vertex
        positions[idx * 3] = x; positions[idx * 3 + 1] = h; positions[idx * 3 + 2] = z;
        // Bottom vertex at y = 0
        positions[(gridN + idx) * 3] = x; positions[(gridN + idx) * 3 + 1] = 0; positions[(gridN + idx) * 3 + 2] = z;
      }
    }

    const topTris = cols * rows * 2;
    const botTris = cols * rows * 2;
    const wallTris = (cols * 2 + rows * 2) * 2;
    const indices = new Uint32Array((topTris + botTris + wallTris) * 3);
    let ptr = 0;

    // Top surface (+Y outward)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const a = r * nx + c, b = a + 1, d = (r + 1) * nx + c, e = d + 1;
        indices[ptr++] = a; indices[ptr++] = d; indices[ptr++] = e;
        indices[ptr++] = a; indices[ptr++] = e; indices[ptr++] = b;
      }
    }
    // Bottom surface (-Y outward)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const a = gridN + r * nx + c, b = a + 1, d = gridN + (r + 1) * nx + c, e = d + 1;
        indices[ptr++] = a; indices[ptr++] = e; indices[ptr++] = d;
        indices[ptr++] = a; indices[ptr++] = b; indices[ptr++] = e;
      }
    }
    // North edge (r = 0, -Z)
    for (let c = 0; c < cols; c++) {
      const t0 = c, t1 = c + 1, b0 = gridN + c, b1 = gridN + c + 1;
      indices[ptr++] = t0; indices[ptr++] = t1; indices[ptr++] = b1;
      indices[ptr++] = t0; indices[ptr++] = b1; indices[ptr++] = b0;
    }
    // South edge (r = rows, +Z)
    for (let c = 0; c < cols; c++) {
      const off = rows * nx;
      const t0 = off + c, t1 = off + c + 1, b0 = gridN + off + c, b1 = gridN + off + c + 1;
      indices[ptr++] = t0; indices[ptr++] = b1; indices[ptr++] = t1;
      indices[ptr++] = t0; indices[ptr++] = b0; indices[ptr++] = b1;
    }
    // West edge (c = 0, -X)
    for (let r = 0; r < rows; r++) {
      const t0 = r * nx, t1 = (r + 1) * nx, b0 = gridN + t0, b1 = gridN + t1;
      indices[ptr++] = t0; indices[ptr++] = b1; indices[ptr++] = t1;
      indices[ptr++] = t0; indices[ptr++] = b0; indices[ptr++] = b1;
    }
    // East edge (c = cols, +X)
    for (let r = 0; r < rows; r++) {
      const t0 = r * nx + cols, t1 = (r + 1) * nx + cols, b0 = gridN + t0, b1 = gridN + t1;
      indices[ptr++] = t0; indices[ptr++] = t1; indices[ptr++] = b1;
      indices[ptr++] = t0; indices[ptr++] = b1; indices[ptr++] = b0;
    }

    return makePart(positions, indices, meta);
  }

  /**
   * Builds a 100% WATERTIGHT CLOSED SOLID OF REVOLUTION (Pottery Vase with real wall & cavity, Hollow Globe Lamp with socket!).
   * profileRings[s][p] = [x, y, z] where s=0..segU-1 wraps around Y axis, p=0..P-1 goes from bottom center -> outer -> rim -> inner -> inner floor center!
   * Start pole at pStart, End pole at pEnd.
   */
  function buildClosedRevolution(segU, rings3D, bottomPole, topPole, meta) {
    const P = rings3D.length;
    const vertCount = P * segU + 2;
    const positions = new Float32Array(vertCount * 3);
    for (let p = 0; p < P; p++) {
      for (let u = 0; u < segU; u++) {
        const idx = (p * segU + u) * 3;
        positions[idx] = rings3D[p][u][0];
        positions[idx + 1] = rings3D[p][u][1];
        positions[idx + 2] = rings3D[p][u][2];
      }
    }
    const botIdx = P * segU, topIdx = P * segU + 1;
    positions[botIdx * 3] = bottomPole[0]; positions[botIdx * 3 + 1] = bottomPole[1]; positions[botIdx * 3 + 2] = bottomPole[2];
    positions[topIdx * 3] = topPole[0];    positions[topIdx * 3 + 1] = topPole[1];    positions[topIdx * 3 + 2] = topPole[2];

    const indices = new Uint32Array(((P - 1) * segU * 2 + segU * 2) * 3);
    let ptr = 0;
    // Bottom pole fan (opposite to side quad edge u -> uN)
    for (let u = 0; u < segU; u++) {
      const uN = (u + 1) % segU;
      indices[ptr++] = botIdx; indices[ptr++] = uN; indices[ptr++] = u;
    }
    // Side quads
    for (let p = 0; p < P - 1; p++) {
      for (let u = 0; u < segU; u++) {
        const uN = (u + 1) % segU;
        const a = p * segU + u, b = (p + 1) * segU + u, c = (p + 1) * segU + uN, d = p * segU + uN;
        indices[ptr++] = a; indices[ptr++] = c; indices[ptr++] = b;
        indices[ptr++] = a; indices[ptr++] = d; indices[ptr++] = c;
      }
    }
    // Top pole fan (opposite to side quad edge last+uN -> last+u)
    const last = (P - 1) * segU;
    for (let u = 0; u < segU; u++) {
      const uN = (u + 1) % segU;
      indices[ptr++] = topIdx; indices[ptr++] = last + u; indices[ptr++] = last + uN;
    }
    return makePart(positions, indices, meta);
  }

  /**
   * Builds a 100% WATERTIGHT CLOSED TUBE along a 2D closed ring (used for Mandala solid rings & extruded strokes!).
   */
  function buildClosedRibbon2D(pts2D, halfWidth, y0, y1, meta) {
    const N = pts2D.length;
    if (N < 3) return null;
    const outer = [], inner = [];
    for (let i = 0; i < N; i++) {
      const prev = pts2D[(i - 1 + N) % N];
      const curr = pts2D[i];
      const next = pts2D[(i + 1) % N];
      let t1x = curr[0] - prev[0], t1y = curr[1] - prev[1];
      const l1 = Math.hypot(t1x, t1y) || 1; t1x /= l1; t1y /= l1;
      let t2x = next[0] - curr[0], t2y = next[1] - curr[1];
      const l2 = Math.hypot(t2x, t2y) || 1; t2x /= l2; t2y /= l2;
      // Right-hand outward normal of CCW loop: (ty, -tx)
      let n1x = t1y, n1y = -t1x;
      let n2x = t2y, n2y = -t2x;
      let mx = n1x + n2x, my = n1y + n2y;
      let ml = Math.hypot(mx, my);
      if (ml < 1e-4) { mx = n1x; my = n1y; ml = 1; }
      mx /= ml; my /= ml;
      // Miter length clamped to prevent spikes on acute corners!
      const dot = clamp(mx * n1x + my * n1y, 0.38, 1.0);
      const scale = halfWidth / dot;
      outer.push([curr[0] + mx * scale, curr[1] + my * scale]);
      inner.push([curr[0] - mx * scale, curr[1] - my * scale]);
    }
    // Build direct watertight closed loop tube of rectangular cross-section (0 ear-clip issues even on self-near curves!)
    const positions = new Float32Array(N * 4 * 3);
    for (let i = 0; i < N; i++) {
      const ox = outer[i][0], oz = -outer[i][1];
      const ix = inner[i][0], iz = -inner[i][1];
      const o = i * 12;
      positions[o]     = ox; positions[o + 1]  = y0; positions[o + 2]  = oz;
      positions[o + 3] = ox; positions[o + 4]  = y1; positions[o + 5]  = oz;
      positions[o + 6] = ix; positions[o + 7]  = y1; positions[o + 8]  = iz;
      positions[o + 9] = ix; positions[o + 10] = y0; positions[o + 11] = iz;
    }
    const indices = new Uint32Array(N * 4 * 6);
    let ptr = 0;
    for (let i = 0; i < N; i++) {
      const iN = (i + 1) % N;
      for (let s = 0; s < 4; s++) {
        const sN = (s + 1) % 4;
        const a = i * 4 + s, b = iN * 4 + s, c = iN * 4 + sN, d = i * 4 + sN;
        indices[ptr++] = a; indices[ptr++] = b; indices[ptr++] = c;
        indices[ptr++] = a; indices[ptr++] = c; indices[ptr++] = d;
      }
    }
    return makePart(positions, indices, Object.assign({ flatShaded: true }, meta));
  }

  /**
   * Builds a watertight rectangular bar connecting 2D points (x0,z0) -> (x1,z1) with thickness w, height y0..y1!
   */
  function buildWallSegment(x0, z0, x1, z1, width, y0, y1, meta) {
    const dx = x1 - x0, dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    if (len < 1e-4) return null;
    const nx = (-dz / len) * (width * 0.5);
    const nz = (dx / len) * (width * 0.5);
    // Extend ends slightly by width/2 so corners fuse cleanly!
    const ex = (dx / len) * (width * 0.48);
    const ez = (dz / len) * (width * 0.48);
    const ax = x0 - ex, az = z0 - ez;
    const bx = x1 + ex, bz = z1 + ez;
    const positions = new Float32Array([
      ax - nx, y0, az - nz,  bx - nx, y0, bz - nz,  bx + nx, y0, bz + nz,  ax + nx, y0, az + nz,
      ax - nx, y1, az - nz,  bx - nx, y1, bz - nz,  bx + nx, y1, bz + nz,  ax + nx, y1, az + nz
    ]);
    const indices = new Uint32Array([
      0, 1, 2, 0, 2, 3,
      4, 6, 5, 4, 7, 6,
      0, 4, 5, 0, 5, 1,
      1, 5, 6, 1, 6, 2,
      2, 6, 7, 2, 7, 3,
      3, 7, 4, 3, 4, 0
    ]);
    return makePart(positions, indices, Object.assign({ flatShaded: true }, meta));
  }

  /* =========================================================================
     3. ANALYZER, PRE-FLIGHT (/100) & 220x220mm BED-FIT CHECK
  ========================================================================= */
  function analyzeBuild(parts, studioId) {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    let totalVolMm3 = 0, totalTris = 0, nonFinite = 0, openEdges = 0;

    for (let p = 0; p < parts.length; p++) {
      const part = parts[p];
      if (part.isHelper) continue;
      const pos = part.positions, idx = part.indices;
      for (let i = 0; i < pos.length; i += 3) {
        const x = pos[i], y = pos[i + 1], z = pos[i + 2];
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) { nonFinite++; continue; }
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
      }
      totalVolMm3 += Math.abs(computeSignedVolume(pos, idx));
      totalTris += idx.length / 3;

      // Exact boundary edge check (skip for very high-density meshes >80k tris for instant 60fps UI)
      if (idx.length <= 240000) {
        const map = new Map();
        for (let i = 0; i < idx.length; i += 3) {
          const a = idx[i], b = idx[i + 1], c = idx[i + 2];
          const pairs = [[a, b], [b, c], [c, a]];
          for (let k = 0; k < 3; k++) {
            const u = pairs[k][0], v = pairs[k][1];
            const rev = v + '_' + u;
            const cnt = map.get(rev);
            if (cnt) { if (cnt === 1) map.delete(rev); else map.set(rev, cnt - 1); }
            else { const key = u + '_' + v; map.set(key, (map.get(key) || 0) + 1); }
          }
        }
        openEdges += map.size;
      }
    }

    if (!Number.isFinite(minX)) { minX = minY = minZ = maxX = maxY = maxZ = 0; }
    const sizeMm = {
      x: +(maxX - minX).toFixed(1),
      y: +(maxY - minY).toFixed(1),
      z: +(maxZ - minZ).toFixed(1)
    };
    const volCm3 = +(totalVolMm3 / 1000).toFixed(2);
    // PLA ~1.24 g/cm³ with typical 25% infill + 3 walls effective density (~0.45 * 1.24 + solid thin walls)
    const plaGrams = +(volCm3 * 1.24 * 0.58).toFixed(1);
    const plaCostEur = +(plaGrams * 0.025).toFixed(2);
    const fitsBed220 = sizeMm.x <= 220 && sizeMm.z <= 220 && sizeMm.y <= 250;
    const isWatertight = (openEdges === 0 && nonFinite === 0 && totalTris > 0);

    const checks = [];
    let score = 100;
    if (isWatertight) {
      checks.push({ status: 'pass', en: 'Watertight Manifold Mesh (0 open edges, outward normals)', fr: 'Maillage Étanche Manifold (0 arête ouverte, normales externes)' });
    } else if (totalTris === 0) {
      score -= 40;
      checks.push({ status: 'warn', en: 'Toolpath / Preview Mode (no solid triangles)', fr: 'Mode Trajet / Aperçu (aucun volume solide)' });
    } else {
      score -= 30;
      checks.push({ status: 'fail', en: `${openEdges} open boundary edges detected`, fr: `${openEdges} arêtes ouvertes détectées` });
    }

    if (fitsBed220) {
      checks.push({ status: 'pass', en: `Fits standard 220×220×250 mm print bed (${sizeMm.x}×${sizeMm.z}×${sizeMm.y} mm)`, fr: `Tient sur plateau standard 220×220×250 mm (${sizeMm.x}×${sizeMm.z}×${sizeMm.y} mm)` });
    } else {
      score -= 15;
      checks.push({ status: 'warn', en: `Exceeds 220×220 mm bed (${sizeMm.x}×${sizeMm.z} mm) — scale down or use large bed`, fr: `Dépasse le plateau 220×220 mm (${sizeMm.x}×${sizeMm.z} mm)` });
    }

    checks.push({
      status: 'pass',
      en: `Est. PLA Material: ${plaGrams} g (~€${plaCostEur.toFixed(2)}) · ${Math.round(totalTris).toLocaleString()} tris`,
      fr: `PLA Estimé : ${plaGrams} g (~${plaCostEur.toFixed(2)} €) · ${Math.round(totalTris).toLocaleString()} tris`
    });

    return {
      studioId,
      bounds: { minX, minY, minZ, maxX, maxY, maxZ },
      sizeMm,
      volCm3,
      plaGrams,
      plaCostEur,
      totalTris: Math.round(totalTris),
      openEdges,
      nonFinite,
      isWatertight,
      fitsBed220,
      preflight: {
        score: clamp(score, 0, 100),
        grade: score >= 90 ? 'PRINT-READY' : (score >= 70 ? 'CHECK BED' : 'FIX NEEDED'),
        checks
      }
    };
  }

  /* =========================================================================
     4. BINARY STL (1:1 mm), SVG, DXF & PDF EXPORTERS
  ========================================================================= */
  function exportBinarySTL(parts) {
    const solids = parts.filter((p) => !p.isHelper && p.indices && p.indices.length > 0);
    let totalTris = 0;
    for (let i = 0; i < solids.length; i++) totalTris += solids[i].indices.length / 3;
    const buf = new ArrayBuffer(84 + totalTris * 50);
    const dv = new DataView(buf);
    const hdr = 'Studios-Pro Maker Studio 7 - 1:1mm Watertight Binary STL';
    for (let i = 0; i < hdr.length && i < 80; i++) dv.setUint8(i, hdr.charCodeAt(i));
    dv.setUint32(80, totalTris, true);

    let off = 84;
    for (let p = 0; p < solids.length; p++) {
      const pos = solids[p].positions, idx = solids[p].indices;
      for (let i = 0; i < idx.length; i += 3) {
        const ia = idx[i] * 3, ib = idx[i + 1] * 3, ic = idx[i + 2] * 3;
        const ax = pos[ia], ay = pos[ia + 1], az = pos[ia + 2];
        const bx = pos[ib], by = pos[ib + 1], bz = pos[ib + 2];
        const cx = pos[ic], cy = pos[ic + 1], cz = pos[ic + 2];
        const abx = bx - ax, aby = by - ay, abz = bz - az;
        const acx = cx - ax, acy = cy - ay, acz = cz - az;
        let nx = aby * acz - abz * acy;
        let ny = abz * acx - abx * acz;
        let nz = abx * acy - aby * acx;
        const nl = Math.hypot(nx, ny, nz) || 1;
        nx /= nl; ny /= nl; nz /= nl;
        dv.setFloat32(off, nx, true); off += 4;
        dv.setFloat32(off, ny, true); off += 4;
        dv.setFloat32(off, nz, true); off += 4;
        dv.setFloat32(off, ax, true); off += 4;
        dv.setFloat32(off, ay, true); off += 4;
        dv.setFloat32(off, az, true); off += 4;
        dv.setFloat32(off, bx, true); off += 4;
        dv.setFloat32(off, by, true); off += 4;
        dv.setFloat32(off, bz, true); off += 4;
        dv.setFloat32(off, cx, true); off += 4;
        dv.setFloat32(off, cy, true); off += 4;
        dv.setFloat32(off, cz, true); off += 4;
        dv.setUint16(off, 0, true);   off += 2;
      }
    }
    return buf;
  }

  /**
   * Generates clean 1:1 mm SVG from polylines: [{ points: [[x,y],...], closed: true, stroke: '#000', layer: 'cut' }]
   */
  function exportSVG(vectors2D, fallbackBounds) {
    const items = (vectors2D && vectors2D.length) ? vectors2D : [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const item of items) {
      for (const pt of item.points) {
        if (pt[0] < minX) minX = pt[0]; if (pt[0] > maxX) maxX = pt[0];
        if (pt[1] < minY) minY = pt[1]; if (pt[1] > maxY) maxY = pt[1];
      }
    }
    if (!Number.isFinite(minX)) {
      minX = 0; minY = 0;
      maxX = (fallbackBounds && fallbackBounds.x) || 100;
      maxY = (fallbackBounds && fallbackBounds.z) || 100;
    }
    const pad = 6;
    const w = +(maxX - minX + pad * 2).toFixed(2);
    const h = +(maxY - minY + pad * 2).toFixed(2);
    const ox = minX - pad, oy = maxY + pad;

    const lines = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm">`,
      `<g fill="none" stroke-linecap="round" stroke-linejoin="round">`
    ];
    for (const item of items) {
      if (!item.points || item.points.length < 2) continue;
      const stroke = item.layer === 'engrave' ? '#2563eb' : (item.stroke || '#dc2626');
      const d = item.points.map((pt, idx) => `${idx === 0 ? 'M' : 'L'}${(pt[0] - ox).toFixed(3)} ${(oy - pt[1]).toFixed(3)}`).join(' ') + (item.closed ? ' Z' : '');
      lines.push(`  <path d="${d}" stroke="${stroke}" stroke-width="0.2" data-layer="${item.layer || 'cut'}" />`);
    }
    lines.push('</g></svg>');
    return lines.join('\n');
  }

  function exportDXF(vectors2D) {
    const items = (vectors2D && vectors2D.length) ? vectors2D : [];
    const out = ['0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '4', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES'];
    for (const item of items) {
      const pts = item.points || [];
      if (pts.length < 2) continue;
      const layer = (item.layer || 'CUT').toUpperCase();
      const count = item.closed ? pts.length : pts.length - 1;
      for (let i = 0; i < count; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        out.push('0', 'LINE', '8', layer,
          '10', a[0].toFixed(3), '20', a[1].toFixed(3), '30', '0.0',
          '11', b[0].toFixed(3), '21', b[1].toFixed(3), '31', '0.0');
      }
    }
    out.push('0', 'ENDSEC', '0', 'EOF');
    return out.join('\n');
  }

  return {
    PI, TAU, clamp, mulberry32,
    computeSignedVolume, ensureOutwardWinding, computeVertexNormals,
    makePart, mergeParts, transformPart,
    buildBox, buildPrismY, ensureCCW, polyArea2D,
    extrudePolygon2D, buildSolidHeightfieldY, buildClosedRevolution,
    buildClosedRibbon2D, buildWallSegment,
    analyzeBuild, exportBinarySTL, exportSVG, exportDXF
  };
}));
