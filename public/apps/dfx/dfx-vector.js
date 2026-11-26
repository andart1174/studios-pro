/**
 * DFX Studio Pro — Industrial 2D CAD Vectorization, Native DXF R12-R2018 & SVG Parser,
 * True Topological Single-Line Centerline Engine, K-Means Multi-Layer Color Tracer,
 * CAD Doctor (OVERKILL + Contour Healer), Nested Kerf Offset & GRBL G-Code Engine.
 *
 * Pure ES6 UMD module (zero DOM dependency -> 100% testable in Node.js).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DfxVector = factory();
  }
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  // Standard AutoCAD Color Index (ACI) table
  const ACI_PALETTE = {
    1: '#ef4444', // Red (Cut)
    2: '#eab308', // Yellow
    3: '#10b981', // Green / Emerald
    4: '#06b6d4', // Cyan (Score)
    5: '#3b82f6', // Blue (Engrave)
    6: '#d946ef', // Magenta
    7: '#e2e8f0', // White / Light
    8: '#94a3b8', // Gray
    30: '#f97316', // Orange
    40: '#f59e0b', // Amber
    90: '#22c55e', // Bright green
    140: '#14b8a6', // Teal
    200: '#a855f7', // Purple
    250: '#475569' // Slate
  };

  function hexToRgb(hex) {
    const h = String(hex || '#10b981').replace('#', '');
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h.padEnd(6, '0');
    const n = parseInt(full.slice(0, 6), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rgbToHex(r, g, b) {
    const c = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    return '#' + c(r) + c(g) + c(b);
  }

  function nearestACI(hex) {
    const [r, g, b] = hexToRgb(hex);
    let bestCode = 7, bestDist = Infinity;
    for (const codeStr of Object.keys(ACI_PALETTE)) {
      const [ar, ag, ab] = hexToRgb(ACI_PALETTE[codeStr]);
      const d = (r - ar) ** 2 + (g - ag) ** 2 + (b - ab) ** 2;
      if (d < bestDist) {
        bestDist = d;
        bestCode = Number(codeStr);
      }
    }
    return bestCode;
  }

  function aciToHex(aci) {
    const code = Math.abs(Math.round(Number(aci) || 7));
    if (ACI_PALETTE[code]) return ACI_PALETTE[code];
    if (code >= 10 && code < 40) return '#f97316';
    if (code >= 40 && code < 70) return '#eab308';
    if (code >= 70 && code < 120) return '#22c55e';
    if (code >= 120 && code < 160) return '#06b6d4';
    if (code >= 160 && code < 200) return '#3b82f6';
    if (code >= 200 && code < 240) return '#d946ef';
    return '#10b981';
  }

  // ============================================================================
  // GEOMETRY PRIMITIVES (Exact 2D Millimeter Math)
  // ============================================================================
  function dist2(a, b) {
    const dx = a[0] - b[0], dy = a[1] - b[1];
    return dx * dx + dy * dy;
  }

  function dist(a, b) {
    return Math.hypot(a[0] - b[0], a[1] - b[1]);
  }

  function signedArea(pts) {
    let a = 0;
    const n = pts.length;
    if (n < 3) return 0;
    for (let i = 0; i < n; i++) {
      const p1 = pts[i], p2 = pts[(i + 1) % n];
      a += p1[0] * p2[1] - p2[0] * p1[1];
    }
    return a * 0.5;
  }

  function pathLength(pts, closed) {
    if (!pts || pts.length < 2) return 0;
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += dist(pts[i - 1], pts[i]);
    if (closed && pts.length > 2) len += dist(pts[pts.length - 1], pts[0]);
    return len;
  }

  function computePathBBox(pts) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < pts.length; i++) {
      const x = pts[i][0], y = pts[i][1];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
  }

  function pointInPolygon(pt, poly) {
    let inside = false;
    const x = pt[0], y = pt[1];
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1];
      const xj = poly[j][0], yj = poly[j][1];
      const intersect = ((yi > y) !== (yj > y)) &&
        (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /**
   * Ramer-Douglas-Peucker Polyline Simplification (works for both open & closed paths).
   */
  function simplifyRDP(pts, epsilon, closed) {
    if (!pts || pts.length <= 2) return pts ? pts.slice() : [];
    if (epsilon <= 1e-6) return pts.slice();

    function rdpRange(arr, start, end, epsSq, out) {
      let maxD2 = -1, index = start;
      const a = arr[start], b = arr[end];
      const abx = b[0] - a[0], aby = b[1] - a[1];
      const abLen2 = abx * abx + aby * aby;
      for (let i = start + 1; i < end; i++) {
        const p = arr[i];
        let d2;
        if (abLen2 < 1e-12) {
          d2 = dist2(p, a);
        } else {
          let t = ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / abLen2;
          t = Math.max(0, Math.min(1, t));
          const px = a[0] + t * abx, py = a[1] + t * aby;
          d2 = (p[0] - px) ** 2 + (p[1] - py) ** 2;
        }
        if (d2 > maxD2) {
          maxD2 = d2;
          index = i;
        }
      }
      if (maxD2 > epsSq && index > start && index < end) {
        rdpRange(arr, start, index, epsSq, out);
        out.pop();
        rdpRange(arr, index, end, epsSq, out);
      } else {
        out.push(a);
        out.push(b);
      }
    }

    const epsSq = epsilon * epsilon;
    if (!closed) {
      const out = [];
      rdpRange(pts, 0, pts.length - 1, epsSq, out);
      return out;
    }

    // For closed loops, split at two most distant points so start/end seam never pinches
    let idxA = 0, idxB = 0, maxD = -1;
    const p0 = pts[0];
    for (let i = 1; i < pts.length; i++) {
      const d = dist2(p0, pts[i]);
      if (d > maxD) { maxD = d; idxA = i; }
    }
    maxD = -1;
    for (let i = 0; i < pts.length; i++) {
      const d = dist2(pts[idxA], pts[i]);
      if (d > maxD) { maxD = d; idxB = i; }
    }
    if (idxA === idxB || pts.length < 4) return pts.slice();
    const lo = Math.min(idxA, idxB), hi = Math.max(idxA, idxB);
    const half1 = pts.slice(lo, hi + 1);
    const half2 = pts.slice(hi).concat(pts.slice(0, lo + 1));
    const o1 = [], o2 = [];
    rdpRange(half1, 0, half1.length - 1, epsSq, o1);
    rdpRange(half2, 0, half2.length - 1, epsSq, o2);
    o1.pop();
    o2.pop();
    const res = o1.concat(o2);
    return res.length >= 3 ? res : pts.slice(0, 3);
  }

  /**
   * Corner-Preserving Chaikin Curve Smoothing (pins crisp CAD corners when rightAngleEnhance is true).
   */
  function smoothPolyline(pts, closed, iterations, preserveCorners) {
    if (!pts || pts.length < 3 || iterations <= 0) return pts.slice();
    let cur = pts.slice();
    const cornerCos = preserveCorners ? Math.cos((55 * Math.PI) / 180) : -2; // >55 deg bend = sharp corner

    for (let it = 0; it < iterations; it++) {
      const n = cur.length;
      if (n < 3) break;
      const next = [];
      for (let i = 0; i < n; i++) {
        const pPrev = closed ? cur[(i - 1 + n) % n] : (i > 0 ? cur[i - 1] : null);
        const pCur = cur[i];
        const pNext = closed ? cur[(i + 1) % n] : (i < n - 1 ? cur[i + 1] : null);

        if (!pPrev || !pNext) {
          next.push(pCur);
          continue;
        }
        // Check corner sharpness
        let isCorner = false;
        if (preserveCorners) {
          const v1x = pCur[0] - pPrev[0], v1y = pCur[1] - pPrev[1];
          const v2x = pNext[0] - pCur[0], v2y = pNext[1] - pCur[1];
          const l1 = Math.hypot(v1x, v1y), l2 = Math.hypot(v2x, v2y);
          if (l1 > 1e-6 && l2 > 1e-6) {
            const cosA = (v1x * v2x + v1y * v2y) / (l1 * l2);
            if (cosA < cornerCos) isCorner = true;
          }
        }
        if (isCorner) {
          next.push(pCur);
        } else {
          next.push([
            0.25 * pPrev[0] + 0.5 * pCur[0] + 0.25 * pNext[0],
            0.25 * pPrev[1] + 0.5 * pCur[1] + 0.25 * pNext[1]
          ]);
        }
      }
      cur = next;
    }
    return cur;
  }

  /**
   * Merge consecutive nearly-collinear points within angular/perpendicular tolerance.
   */
  function mergeCollinear(pts, closed, tol) {
    if (!pts || pts.length < 3) return pts ? pts.slice() : [];
    const eps = tol || 0.015;
    let cur = pts.slice();
    // Deduplicate adjacent identical points first
    const dedup = [cur[0]];
    for (let i = 1; i < cur.length; i++) {
      if (dist(cur[i], dedup[dedup.length - 1]) > 1e-5) dedup.push(cur[i]);
    }
    if (closed && dedup.length > 2 && dist(dedup[0], dedup[dedup.length - 1]) < 1e-5) {
      dedup.pop();
    }
    if (dedup.length < 3) return dedup;

    const out = [];
    const n = dedup.length;
    for (let i = 0; i < n; i++) {
      if (!closed && (i === 0 || i === n - 1)) {
        out.push(dedup[i]);
        continue;
      }
      const a = dedup[(i - 1 + n) % n];
      const b = dedup[i];
      const c = dedup[(i + 1) % n];
      const acx = c[0] - a[0], acy = c[1] - a[1];
      const acLen = Math.hypot(acx, acy);
      if (acLen < 1e-6) continue;
      // Perpendicular distance of b from line AC
      const perp = Math.abs((b[0] - a[0]) * acy - (b[1] - a[1]) * acx) / acLen;
      // Also check that b lies between a and c (dot > 0)
      const dot = (b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1]);
      if (perp > eps || dot < 0) {
        out.push(b);
      }
    }
    return out.length >= (closed ? 3 : 2) ? out : dedup;
  }

  // ============================================================================
  // 1. MARCHING SQUARES SUB-PIXEL CONTOUR TRACER (ZERO WHITE BACKGROUND BUG!)
  // ============================================================================
  /**
   * Traces clean closed vector contours around binary === 1 foreground regions ONLY.
   * Eliminates double-wall outlines & background frame artifacts from legacy ImageTracer!
   */
  function traceContoursFromBinary(binary, w, h, opts) {
    const o = Object.assign({
      widthMm: 100,
      smoothness: 1.0,       // 0.1 (ultra precise) .. 10 (smooth)
      pathOmit: 4,           // minimum perimeter in px
      rightAngleEnhance: true,
      blurPasses: 1,
      ltres: 1.0,
      qtres: 1.0,
      layerId: 'layer_cut'
    }, opts || {});

    const scale = o.widthMm / Math.max(1, w);
    const heightMm = h * scale;

    // Pad binary with 1-px white (0) border so edge-touching shapes always close
    const pw = w + 2, ph = h + 2;
    const pad = new Uint8Array(pw * ph);
    for (let y = 0; y < h; y++) {
      const srcRow = y * w;
      const dstRow = (y + 1) * pw + 1;
      for (let x = 0; x < w; x++) pad[dstRow + x] = binary[srcRow + x] ? 1 : 0;
    }

    // Marching squares cell edges -> store directed segments (with CCW winding around solid 1s)
    // Corners of cell (x,y):
    //   tl=(x,y)  tr=(x+1,y)
    //   bl=(x,y+1) br=(x+1,y+1)
    // Edge midpoints:
    //   0 (Top):    (x+0.5, y)
    //   1 (Right):  (x+1, y+0.5)
    //   2 (Bottom): (x+0.5, y+1)
    //   3 (Left):   (x, y+0.5)
    // Table maps 4-bit mask (tl=8, tr=4, br=2, bl=1) to directed pairs [fromEdge, toEdge]
    // keeping foreground (1) on the LEFT of travel!
    const MS_TABLE = [
      [],                 // 0: 0000
      [[3, 2]],           // 1: 0001 bl
      [[2, 1]],           // 2: 0010 br
      [[3, 1]],           // 3: 0011 bl,br
      [[1, 0]],           // 4: 0100 tr
      [[3, 0], [1, 2]],   // 5: 0101 tr,bl (saddle)
      [[2, 0]],           // 6: 0110 tr,br
      [[3, 0]],           // 7: 0111 tr,br,bl
      [[0, 3]],           // 8: 1000 tl
      [[0, 2]],           // 9: 1001 tl,bl
      [[0, 1], [2, 3]],   // 10: 1010 tl,br (saddle)
      [[0, 1]],           // 11: 1011 tl,br,bl
      [[1, 3]],           // 12: 1100 tl,tr
      [[1, 2]],           // 13: 1101 tl,tr,bl
      [[2, 3]],           // 14: 1110 tl,tr,br
      []                  // 15: 1111
    ];

    function edgePt(x, y, e) {
      // Shift back by -0.5 because pixel centers are at (x-0.5, y-0.5) after 1-px padding
      const bx = x - 0.5, by = y - 0.5;
      if (e === 0) return [bx + 0.5, by];
      if (e === 1) return [bx + 1.0, by + 0.5];
      if (e === 2) return [bx + 0.5, by + 1.0];
      return [bx, by + 0.5];
    }

    function ptKey(p) {
      return Math.round(p[0] * 2) + ',' + Math.round(p[1] * 2);
    }

    // Build adjacency map from start-vertex-key -> list of end points
    const adj = new Map();
    let segCount = 0;
    for (let y = 0; y < ph - 1; y++) {
      const r0 = y * pw, r1 = (y + 1) * pw;
      for (let x = 0; x < pw - 1; x++) {
        const mask = (pad[r0 + x] << 3) | (pad[r0 + x + 1] << 2) | (pad[r1 + x + 1] << 1) | pad[r1 + x];
        if (mask === 0 || mask === 15) continue;
        const pairs = MS_TABLE[mask];
        for (let k = 0; k < pairs.length; k++) {
          const a = edgePt(x, y, pairs[k][0]);
          const b = edgePt(x, y, pairs[k][1]);
          const ka = ptKey(a);
          let bucket = adj.get(ka);
          if (!bucket) { bucket = []; adj.set(ka, bucket); }
          bucket.push({ a, b, used: false });
          segCount++;
        }
      }
    }

    // Stitch directed edges into closed loops
    const rawLoops = [];
    for (const [, edges] of adj.entries()) {
      for (let i = 0; i < edges.length; i++) {
        if (edges[i].used) continue;
        const loop = [edges[i].a];
        let curEdge = edges[i];
        curEdge.used = true;
        let curPt = curEdge.b;
        const startKey = ptKey(edges[i].a);
        let guard = 0;
        while (guard++ < segCount + 4) {
          const ck = ptKey(curPt);
          if (ck === startKey) break;
          loop.push(curPt);
          const nextList = adj.get(ck);
          if (!nextList) break;
          let found = null;
          for (let j = 0; j < nextList.length; j++) {
            if (!nextList[j].used) { found = nextList[j]; break; }
          }
          if (!found) break;
          found.used = true;
          curPt = found.b;
        }
        if (loop.length >= 3) rawLoops.push(loop);
      }
    }

    // Smooth, simplify & convert from pixel space -> exact physical mm
    // Both smoothness AND ltres/qtres genuinely control tolerance!
    const epsPx = Math.max(0.12, (o.smoothness * 0.45) * ((o.ltres + o.qtres) * 0.5));
    const smoothIter = Math.min(4, Math.max(0, Math.round(o.blurPasses)));
    const minPerimPx = Math.max(3, o.pathOmit || 0);

    const paths = [];
    let idCounter = 1;
    for (let i = 0; i < rawLoops.length; i++) {
      let pts = rawLoops[i];
      if (pathLength(pts, true) < minPerimPx) continue;
      if (smoothIter > 0) {
        pts = smoothPolyline(pts, true, smoothIter, o.rightAngleEnhance);
      }
      pts = simplifyRDP(pts, epsPx, true);
      pts = mergeCollinear(pts, true, 0.04);
      if (pts.length < 3) continue;

      // Convert pixel coordinates -> exact physical mm clamped to [0..widthMm, 0..heightMm]
      const mmPts = pts.map(p => [
        Math.max(0, Math.min(o.widthMm, p[0] * scale)),
        Math.max(0, Math.min(heightMm, p[1] * scale))
      ]);
      if (Math.abs(signedArea(mmPts)) < 1e-4) continue;
      paths.push({
        id: 'p_' + (idCounter++),
        layerId: o.layerId,
        closed: true,
        isHole: false,
        parentId: null,
        depth: 0,
        pts: mmPts
      });
    }

    classifyContourHierarchy(paths);
    return { widthMm: o.widthMm, heightMm, paths };
  }

  /**
   * Exact Topological Outer/Hole Nesting Classifier (computed PER LAYER so ENGRAVE/SCORE
   * frames never invert the solid/hole parity of CUT geometry!).
   */
  function classifyContourHierarchy(paths) {
    const byLayer = new Map();
    for (let i = 0; i < paths.length; i++) {
      const p = paths[i];
      p.isHole = false;
      p.parentId = null;
      p.depth = 0;
      if (p.closed && p.pts && p.pts.length >= 3) {
        const lid = p.layerId || '_default';
        if (!byLayer.has(lid)) byLayer.set(lid, []);
        byLayer.get(lid).push({
          path: p,
          area: Math.abs(signedArea(p.pts)),
          bbox: computePathBBox(p.pts)
        });
      }
    }

    for (const closedList of byLayer.values()) {
      // Sort descending by area so parents always come before children
      closedList.sort((a, b) => b.area - a.area);
      for (let i = 0; i < closedList.length; i++) {
        const child = closedList[i];
        const testPt = child.path.pts[0];
        let depth = 0;
        let directParent = null;
        for (let j = i - 1; j >= 0; j--) {
          const cand = closedList[j];
          if (cand.area <= child.area * 1.001) continue;
          const bb = cand.bbox;
          if (testPt[0] < bb.minX || testPt[0] > bb.maxX || testPt[1] < bb.minY || testPt[1] > bb.maxY) continue;
          if (pointInPolygon(testPt, cand.path.pts)) {
            depth++;
            if (!directParent) directParent = cand.path.id;
          }
        }
        child.path.depth = depth;
        child.path.isHole = (depth % 2) === 1;
        child.path.parentId = directParent;
      }
    }
    return paths;
  }

  // ============================================================================
  // 2. TRUE TOPOLOGICAL SINGLE-LINE CENTERLINE TRACER (REAL LASER MODE!)
  // ============================================================================
  /**
   * Extracts a true 8-connected topological skeleton graph from a thinned binary image,
   * emitting EVERY skeleton stroke ONCE as a clean open single-pass polyline (zero double walls!).
   */
  function traceCenterlineFromSkeleton(skeletonBin, w, h, opts) {
    const o = Object.assign({
      widthMm: 100,
      smoothness: 1.0,
      spurMinPx: 4,
      rightAngleEnhance: true,
      ltres: 1.0,
      layerId: 'layer_score'
    }, opts || {});

    const scale = o.widthMm / Math.max(1, w);
    const heightMm = h * scale;

    // 8-neighbor offsets (prefer cardinal first to avoid redundant diagonal triangles)
    const DIRS = [
      [1, 0], [0, 1], [-1, 0], [0, -1],
      [1, 1], [-1, 1], [-1, -1], [1, -1]
    ];

    // Collect foreground pixel graph with diagonal bridge pruning (avoids 3-cycles at L-corners!)
    const fgNodes = [];
    const neighbors = new Map();

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (!skeletonBin[idx]) continue;
        fgNodes.push(idx);
        const nb = [];
        // Cardinal neighbors
        const hasR = x + 1 < w && skeletonBin[idx + 1] === 1;
        const hasL = x - 1 >= 0 && skeletonBin[idx - 1] === 1;
        const hasD = y + 1 < h && skeletonBin[idx + w] === 1;
        const hasU = y - 1 >= 0 && skeletonBin[idx - w] === 1;
        if (hasR) nb.push(idx + 1);
        if (hasD) nb.push(idx + w);
        if (hasL) nb.push(idx - 1);
        if (hasU) nb.push(idx - w);

        // Only add diagonal edge if it doesn't shortcut an existing 2-step cardinal L-bend!
        if (x + 1 < w && y + 1 < h && skeletonBin[idx + w + 1] === 1 && !hasR && !hasD) nb.push(idx + w + 1);
        if (x - 1 >= 0 && y + 1 < h && skeletonBin[idx + w - 1] === 1 && !hasL && !hasD) nb.push(idx + w - 1);
        if (x - 1 >= 0 && y - 1 >= 0 && skeletonBin[idx - w - 1] === 1 && !hasL && !hasU) nb.push(idx - w - 1);
        if (x + 1 < w && y - 1 >= 0 && skeletonBin[idx - w + 1] === 1 && !hasR && !hasU) nb.push(idx - w + 1);

        neighbors.set(idx, nb);
      }
    }

    const visitedEdge = new Set();
    function edgeKey(u, v) {
      return u < v ? (u * 16777216 + v) : (v * 16777216 + u);
    }

    const rawChains = [];

    function walkChain(startNode, firstNext) {
      const chain = [startNode];
      let prev = startNode;
      let cur = firstNext;
      visitedEdge.add(edgeKey(prev, cur));
      let guard = 0;
      while (guard++ < w * h) {
        chain.push(cur);
        const nbs = neighbors.get(cur) || [];
        if (nbs.length !== 2) break; // Stop at endpoint (deg 1) or junction (deg >= 3)
        const next = nbs[0] === prev ? nbs[1] : nbs[0];
        const ek = edgeKey(cur, next);
        if (visitedEdge.has(ek)) {
          if (next === startNode) chain.push(startNode);
          break;
        }
        visitedEdge.add(ek);
        prev = cur;
        cur = next;
      }
      const startDeg = (neighbors.get(chain[0]) || []).length;
      const endDeg = (neighbors.get(chain[chain.length - 1]) || []).length;
      const isClosed = chain.length > 3 && chain[0] === chain[chain.length - 1];
      return { nodes: chain, closed: isClosed, startDeg, endDeg };
    }

    // Pass 1: Walk from all endpoints (deg === 1) and junctions (deg >= 3)
    for (let i = 0; i < fgNodes.length; i++) {
      const u = fgNodes[i];
      const nbs = neighbors.get(u);
      if (!nbs || nbs.length === 2 || nbs.length === 0) continue;
      for (let j = 0; j < nbs.length; j++) {
        const v = nbs[j];
        if (!visitedEdge.has(edgeKey(u, v))) {
          rawChains.push(walkChain(u, v));
        }
      }
    }

    // Pass 2: Walk remaining pure closed loops (every pixel has deg === 2)
    for (let i = 0; i < fgNodes.length; i++) {
      const u = fgNodes[i];
      const nbs = neighbors.get(u);
      if (!nbs || nbs.length !== 2) continue;
      for (let j = 0; j < nbs.length; j++) {
        const v = nbs[j];
        if (!visitedEdge.has(edgeKey(u, v))) {
          const c = walkChain(u, v);
          c.closed = true;
          rawChains.push(c);
        }
      }
    }

    // Spur pruning + Simplification -> exact mm
    const epsPx = Math.max(0.35, o.smoothness * 0.55 * o.ltres);
    const spurMin = Math.max(2, o.spurMinPx || 4);
    const paths = [];
    let idCounter = 1;

    for (let i = 0; i < rawChains.length; i++) {
      const ch = rawChains[i];
      // Prune tiny dangling spurs attached to a junction
      const isSpur = !ch.closed && (
        (ch.startDeg === 1 && ch.endDeg >= 3) ||
        (ch.endDeg === 1 && ch.startDeg >= 3)
      );
      if (isSpur && ch.nodes.length < spurMin) continue;
      if (ch.nodes.length < 2) continue;

      let pts = ch.nodes.map(idx => {
        const x = idx % w;
        const y = (idx - x) / w;
        return [x + 0.5, y + 0.5];
      });
      if (ch.closed && pts.length > 2 && dist(pts[0], pts[pts.length - 1]) < 1.5) {
        pts.pop();
      }
      if (pts.length >= 4) {
        pts = smoothPolyline(pts, ch.closed, 1, o.rightAngleEnhance);
      }
      pts = simplifyRDP(pts, epsPx, ch.closed);
      pts = mergeCollinear(pts, ch.closed, 0.05);
      if (pts.length < (ch.closed ? 3 : 2)) continue;

      const mmPts = pts.map(p => [p[0] * scale, p[1] * scale]);
      if (pathLength(mmPts, ch.closed) < Math.max(0.2, scale * 2)) continue;

      paths.push({
        id: 'cl_' + (idCounter++),
        layerId: o.layerId,
        closed: ch.closed,
        isHole: false,
        parentId: null,
        depth: 0,
        pts: mmPts
      });
    }

    return { widthMm: o.widthMm, heightMm, paths };
  }

  // ============================================================================
  // 3. K-MEANS MULTI-LAYER COLOR VECTORIZER (SEPARATE AUTOCAD ACI LAYERS!)
  // ============================================================================
  function traceMultiColorLayers(colorRGBA, w, h, opts) {
    const o = Object.assign({
      widthMm: 100,
      numColors: 4,
      colorQuantCycles: 6,
      smoothness: 1.0,
      pathOmit: 6,
      rightAngleEnhance: true,
      ltres: 1.0,
      qtres: 1.0
    }, opts || {});

    const k = Math.max(2, Math.min(8, Math.round(o.numColors || 4)));
    const n = w * h;
    const scale = o.widthMm / Math.max(1, w);
    const heightMm = h * scale;

    // Build quantized 5-bit color histogram buckets (32x32x32) to ignore sparse 1-px anti-aliased halo noise!
    const stride = Math.max(1, Math.floor(Math.sqrt(n / 8000)));
    const histMap = new Map();
    for (let y = 0; y < h; y += stride) {
      for (let x = 0; x < w; x += stride) {
        const p = (y * w + x) * 4;
        const r = colorRGBA[p], g = colorRGBA[p + 1], b = colorRGBA[p + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const sat = Math.max(r, g, b) - Math.min(r, g, b);
        if (lum > 228 && sat < 28) continue;
        const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
        let bkt = histMap.get(key);
        if (!bkt) { bkt = [0, 0, 0, 0]; histMap.set(key, bkt); }
        bkt[0] += r; bkt[1] += g; bkt[2] += b; bkt[3]++;
      }
    }

    const denseBuckets = [];
    for (const bkt of histMap.values()) {
      if (bkt[3] >= 3) denseBuckets.push([bkt[0] / bkt[3], bkt[1] / bkt[3], bkt[2] / bkt[3], bkt[3]]);
    }
    const samples = denseBuckets.length >= k ? denseBuckets : Array.from(histMap.values()).map(b => [b[0] / b[3], b[1] / b[3], b[2] / b[3], b[3]]);

    if (samples.length < k) {
      return {
        widthMm: o.widthMm,
        heightMm,
        layers: [{ id: 'layer_cut', name: 'CUT', color: '#10b981', aci: 3, op: 'CUT', visible: true, locked: false }],
        paths: []
      };
    }

    // Sort dense buckets by weight descending so the strongest dominant color seeds cluster 0,
    // then pick furthest remaining dense buckets weighted by log(count) so all real color regions separate cleanly!
    samples.sort((a, b) => b[3] - a[3]);
    const centers = [[samples[0][0], samples[0][1], samples[0][2]]];
    while (centers.length < k) {
      let bestSample = samples[0], bestScore = -1;
      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        let minD = Infinity;
        for (let c = 0; c < centers.length; c++) {
          const d = (s[0] - centers[c][0]) ** 2 + (s[1] - centers[c][1]) ** 2 + (s[2] - centers[c][2]) ** 2;
          if (d < minD) minD = d;
        }
        const score = minD * Math.log2(s[3] + 2);
        if (score > bestScore) { bestScore = score; bestSample = s; }
      }
      centers.push([bestSample[0], bestSample[1], bestSample[2]]);
    }

    // Weighted Lloyd iterations
    const iters = Math.max(2, Math.min(12, o.colorQuantCycles || 6));
    for (let it = 0; it < iters; it++) {
      const sums = Array.from({ length: k }, () => [0, 0, 0, 0]);
      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        const wt = s[3];
        let bestC = 0, bestD = Infinity;
        for (let c = 0; c < k; c++) {
          const d = (s[0] - centers[c][0]) ** 2 + (s[1] - centers[c][1]) ** 2 + (s[2] - centers[c][2]) ** 2;
          if (d < bestD) { bestD = d; bestC = c; }
        }
        sums[bestC][0] += s[0] * wt;
        sums[bestC][1] += s[1] * wt;
        sums[bestC][2] += s[2] * wt;
        sums[bestC][3] += wt;
      }
      for (let c = 0; c < k; c++) {
        if (sums[c][3] > 0) {
          centers[c][0] = sums[c][0] / sums[c][3];
          centers[c][1] = sums[c][1] / sums[c][3];
          centers[c][2] = sums[c][2] / sums[c][3];
        }
      }
    }

    // Sort clusters by luminance (darkest first -> Layer 1 = CUT, inner accents = ENGRAVE/SCORE)
    centers.sort((a, b) => (0.299 * a[0] + 0.587 * a[1] + 0.114 * a[2]) - (0.299 * b[0] + 0.587 * b[1] + 0.114 * b[2]));

    // Assign every pixel to nearest color cluster (or -1 for white paper)
    const labels = new Int8Array(n);
    const counts = new Uint32Array(k);
    for (let i = 0, p = 0; i < n; i++, p += 4) {
      const r = colorRGBA[p], g = colorRGBA[p + 1], b = colorRGBA[p + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      if (lum > 240 && sat < 18) {
        labels[i] = -1;
        continue;
      }
      let bestC = 0, bestD = Infinity;
      for (let c = 0; c < k; c++) {
        const d = (r - centers[c][0]) ** 2 + (g - centers[c][1]) ** 2 + (b - centers[c][2]) ** 2;
        if (d < bestD) { bestD = d; bestC = c; }
      }
      labels[i] = bestC;
      counts[bestC]++;
    }

    const layers = [];
    const allPaths = [];
    let pid = 1;
    const minRatio = (o.minColorRatio || 0.003) * n;

    for (let c = 0; c < k; c++) {
      if (counts[c] < Math.max(16, minRatio)) continue;
      const hex = rgbToHex(centers[c][0], centers[c][1], centers[c][2]);
      const layerId = 'color_' + (c + 1);
      const op = c === 0 ? 'CUT' : (c === 1 ? 'ENGRAVE' : 'SCORE');
      layers.push({
        id: layerId,
        name: 'COLOR_' + (c + 1) + '_' + op,
        color: hex,
        aci: nearestACI(hex),
        op,
        visible: true,
        locked: false
      });

      const mask = new Uint8Array(n);
      for (let i = 0; i < n; i++) mask[i] = labels[i] === c ? 1 : 0;

      const traced = traceContoursFromBinary(mask, w, h, Object.assign({}, o, { layerId }));
      for (let j = 0; j < traced.paths.length; j++) {
        traced.paths[j].id = 'mc_' + (pid++);
        allPaths.push(traced.paths[j]);
      }
    }

    classifyContourHierarchy(allPaths);
    return { widthMm: o.widthMm, heightMm, layers, paths: allPaths };
  }

  // ============================================================================
  // 4. NATIVE AUTOCAD DXF R12 - R2018 PARSER (FULL ENTITIES + BULGE ARCS + BLOCKS!)
  // ============================================================================
  function tessellateBulge(p1, p2, bulge, maxSegs) {
    if (Math.abs(bulge) < 1e-6) return [p2];
    const dx = p2[0] - p1[0], dy = p2[1] - p1[1];
    const chord = Math.hypot(dx, dy);
    if (chord < 1e-7) return [p2];
    const theta = 4 * Math.atan(bulge); // included angle (signed: + CCW, - CW)
    const r = chord / (2 * Math.sin(Math.abs(theta) / 2));
    const midX = (p1[0] + p2[0]) * 0.5;
    const midY = (p1[1] + p2[1]) * 0.5;
    const sagDist = r * Math.cos(theta / 2) * (bulge >= 0 ? 1 : -1);
    const nx = -dy / chord, ny = dx / chord;
    const cx = midX + nx * sagDist;
    const cy = midY + ny * sagDist;
    const startA = Math.atan2(p1[1] - cy, p1[0] - cx);
    const segs = Math.max(4, Math.min(maxSegs || 32, Math.ceil(Math.abs(theta) / (Math.PI / 18))));
    const pts = [];
    for (let i = 1; i <= segs; i++) {
      const a = startA + (theta * i) / segs;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return pts;
  }

  function evaluateBSpline(ctrlPts, degree, knots, samples) {
    const n = ctrlPts.length;
    if (n < 2) return ctrlPts.slice();
    const p = Math.min(degree || 3, n - 1);
    let U = knots && knots.length === n + p + 1 ? knots : null;
    if (!U) {
      U = [];
      for (let i = 0; i <= p; i++) U.push(0);
      const inner = n - p - 1;
      for (let i = 1; i <= inner; i++) U.push(i / (inner + 1));
      for (let i = 0; i <= p; i++) U.push(1);
    }
    const uMin = U[p], uMax = U[n];
    const steps = Math.max(12, samples || n * 8);
    const out = [];

    function basis(i, k, u) {
      if (k === 0) return (u >= U[i] && u < U[i + 1]) ? 1 : 0;
      const d1 = U[i + k] - U[i];
      const d2 = U[i + k + 1] - U[i + 1];
      let v = 0;
      if (d1 > 1e-12) v += ((u - U[i]) / d1) * basis(i, k - 1, u);
      if (d2 > 1e-12) v += ((U[i + k + 1] - u) / d2) * basis(i + 1, k - 1, u);
      return v;
    }

    for (let s = 0; s <= steps; s++) {
      let u = uMin + ((uMax - uMin) * s) / steps;
      if (s === steps) { out.push(ctrlPts[n - 1].slice()); continue; }
      let x = 0, y = 0, wSum = 0;
      for (let i = 0; i < n; i++) {
        const b = basis(i, p, u);
        if (b > 0) {
          x += b * ctrlPts[i][0];
          y += b * ctrlPts[i][1];
          wSum += b;
        }
      }
      if (wSum > 1e-9) out.push([x / wSum, y / wSum]);
    }
    return out;
  }

  function parseDXF(dxfText, sourceName) {
    const rawLines = String(dxfText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const pairs = [];
    for (let i = 0; i + 1 < rawLines.length; i += 2) {
      const code = parseInt(rawLines[i].trim(), 10);
      const val = rawLines[i + 1].trim();
      if (!Number.isNaN(code)) pairs.push([code, val]);
    }

    let insUnits = 4; // default mm
    const layerMeta = new Map();
    const blocks = new Map();
    const rawEntities = [];

    let section = '';
    let i = 0;

    function readEntityList(stopChecker) {
      const list = [];
      let cur = null;
      let inPoly = null;
      let curVert = null;

      function flushPoly() {
        if (!inPoly) return;
        list.push(inPoly);
        inPoly = null;
        curVert = null;
      }

      while (i < pairs.length) {
        const [code, val] = pairs[i];
        if (code === 0) {
          if (stopChecker(val)) break;
          if (val === 'VERTEX' && inPoly) {
            curVert = { x: 0, y: 0, bulge: 0 };
            inPoly.vertices.push(curVert);
            i++;
            continue;
          }
          if (val === 'SEQEND') {
            flushPoly();
            i++;
            continue;
          }
          if (cur) { list.push(cur); cur = null; }
          if (val === 'POLYLINE') {
            inPoly = { type: 'POLYLINE', layer: '0', closed: false, vertices: [] };
            i++;
            continue;
          }
          cur = {
            type: val, layer: '0', aci: null,
            x: 0, y: 0, x2: 0, y2: 0, r: 0,
            startAngle: 0, endAngle: 360,
            ratio: 1, startParam: 0, endParam: Math.PI * 2,
            closed: false, vertices: [], knots: [], degree: 3,
            blockName: '', sx: 1, sy: 1, rot: 0, text: ''
          };
          i++;
          continue;
        }

        const target = curVert || inPoly || cur;
        if (!target) { i++; continue; }

        if (curVert) {
          if (code === 10) curVert.x = parseFloat(val) || 0;
          else if (code === 20) curVert.y = parseFloat(val) || 0;
          else if (code === 42) curVert.bulge = parseFloat(val) || 0;
          i++;
          continue;
        }
        if (inPoly) {
          if (code === 8) inPoly.layer = val || '0';
          else if (code === 62) inPoly.aci = parseInt(val, 10);
          else if (code === 70) inPoly.closed = (parseInt(val, 10) & 1) !== 0;
          i++;
          continue;
        }

        // Standard entity properties
        if (code === 8) cur.layer = val || '0';
        else if (code === 62) cur.aci = parseInt(val, 10);
        else if (cur.type === 'LWPOLYLINE') {
          if (code === 70) cur.closed = (parseInt(val, 10) & 1) !== 0;
          else if (code === 10) cur.vertices.push({ x: parseFloat(val) || 0, y: 0, bulge: 0 });
          else if (code === 20 && cur.vertices.length) cur.vertices[cur.vertices.length - 1].y = parseFloat(val) || 0;
          else if (code === 42 && cur.vertices.length) cur.vertices[cur.vertices.length - 1].bulge = parseFloat(val) || 0;
        } else if (cur.type === 'SPLINE') {
          if (code === 71) cur.degree = parseInt(val, 10) || 3;
          else if (code === 70) cur.closed = (parseInt(val, 10) & 1) !== 0;
          else if (code === 40) cur.knots.push(parseFloat(val) || 0);
          else if (code === 10) cur.vertices.push({ x: parseFloat(val) || 0, y: 0 });
          else if (code === 20 && cur.vertices.length) cur.vertices[cur.vertices.length - 1].y = parseFloat(val) || 0;
        } else {
          if (code === 10) cur.x = parseFloat(val) || 0;
          else if (code === 20) cur.y = parseFloat(val) || 0;
          else if (code === 11) cur.x2 = parseFloat(val) || 0;
          else if (code === 21) cur.y2 = parseFloat(val) || 0;
          else if (code === 40) { cur.r = parseFloat(val) || 0; cur.ratio = cur.r; }
          else if (code === 41) { cur.sx = parseFloat(val) || 1; cur.startParam = parseFloat(val) || 0; }
          else if (code === 42) { cur.sy = parseFloat(val) || 1; cur.endParam = parseFloat(val) || Math.PI * 2; }
          else if (code === 50) { cur.startAngle = parseFloat(val) || 0; cur.rot = cur.startAngle; }
          else if (code === 51) cur.endAngle = parseFloat(val) || 360;
          else if (code === 2) cur.blockName = val;
          else if (code === 1) cur.text = val;
        }
        i++;
      }
      if (cur) list.push(cur);
      flushPoly();
      return list;
    }

    while (i < pairs.length) {
      const [code, val] = pairs[i];
      if (code === 0 && val === 'SECTION') {
        i++;
        if (i < pairs.length && pairs[i][0] === 2) {
          section = pairs[i][1].toUpperCase();
          i++;
        }
        continue;
      }
      if (code === 0 && val === 'ENDSEC') {
        section = '';
        i++;
        continue;
      }

      if (section === 'HEADER') {
        if (code === 9 && val === '$INSUNITS') {
          i++;
          if (i < pairs.length && pairs[i][0] === 70) insUnits = parseInt(pairs[i][1], 10);
        }
        i++;
      } else if (section === 'TABLES') {
        if (code === 0 && val === 'LAYER') {
          let lName = '0', lAci = 7;
          i++;
          while (i < pairs.length && pairs[i][0] !== 0) {
            if (pairs[i][0] === 2) lName = pairs[i][1];
            else if (pairs[i][0] === 62) lAci = Math.abs(parseInt(pairs[i][1], 10) || 7);
            i++;
          }
          layerMeta.set(lName, { aci: lAci, color: aciToHex(lAci) });
          continue;
        }
        i++;
      } else if (section === 'BLOCKS') {
        if (code === 0 && val === 'BLOCK') {
          let bName = '', bx = 0, by = 0;
          i++;
          while (i < pairs.length && pairs[i][0] !== 0) {
            if (pairs[i][0] === 2) bName = pairs[i][1];
            else if (pairs[i][0] === 10) bx = parseFloat(pairs[i][1]) || 0;
            else if (pairs[i][0] === 20) by = parseFloat(pairs[i][1]) || 0;
            i++;
          }
          const ents = readEntityList(v => v === 'ENDBLK' || v === 'ENDSEC');
          if (bName) blocks.set(bName, { bx, by, entities: ents });
          if (i < pairs.length && pairs[i][1] === 'ENDBLK') i++;
          continue;
        }
        i++;
      } else if (section === 'ENTITIES') {
        const ents = readEntityList(v => v === 'ENDSEC' || v === 'EOF');
        rawEntities.push(...ents);
      } else {
        i++;
      }
    }

    // Unit conversion factor to exact mm
    const unitScaleMap = { 0: 1, 1: 25.4, 2: 304.8, 4: 1, 5: 10, 6: 1000 };
    const unitScale = unitScaleMap[insUnits] || 1;

    const layersMap = new Map();
    function ensureLayer(name, aciHint) {
      const key = name || '0';
      if (!layersMap.has(key)) {
        const meta = layerMeta.get(key);
        const aci = aciHint || (meta ? meta.aci : (key.toUpperCase().includes('ENGRAV') ? 5 : key.toUpperCase().includes('SCORE') ? 4 : 3));
        const up = key.toUpperCase();
        const op = up.includes('ENGRAV') ? 'ENGRAVE' : (up.includes('SCORE') || up.includes('MARK') ? 'SCORE' : 'CUT');
        layersMap.set(key, {
          id: 'dxf_' + key.replace(/[^a-zA-Z0-9_-]/g, '_'),
          name: key,
          color: meta ? meta.color : aciToHex(aci),
          aci,
          op,
          visible: true,
          locked: false
        });
      }
      return layersMap.get(key);
    }

    const cadPaths = []; // still in Y-up CAD mm coordinates
    let pid = 1;

    function applyXform(pt, xf) {
      if (!xf) return [pt[0] * unitScale, pt[1] * unitScale];
      const lx = (pt[0] - xf.bx) * xf.sx;
      const ly = (pt[1] - xf.by) * xf.sy;
      const c = Math.cos(xf.rad), s = Math.sin(xf.rad);
      return [(lx * c - ly * s + xf.tx) * unitScale, (lx * s + ly * c + xf.ty) * unitScale];
    }

    function emitEntity(e, xf, depth) {
      if (depth > 4) return;
      const layer = ensureLayer(e.layer, e.aci);

      if (e.type === 'INSERT') {
        const blk = blocks.get(e.blockName);
        if (!blk) return;
        const childXf = {
          bx: blk.bx, by: blk.by,
          tx: e.x, ty: e.y,
          sx: e.sx || 1, sy: e.sy || 1,
          rad: ((e.rot || 0) * Math.PI) / 180
        };
        for (let k = 0; k < blk.entities.length; k++) emitEntity(blk.entities[k], childXf, depth + 1);
        return;
      }

      if (e.type === 'LINE') {
        const p1 = applyXform([e.x, e.y], xf);
        const p2 = applyXform([e.x2, e.y2], xf);
        if (dist(p1, p2) > 1e-5) {
          cadPaths.push({ id: 'd_' + (pid++), layerId: layer.id, closed: false, isHole: false, pts: [p1, p2] });
        }
        return;
      }

      if (e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') {
        const vs = e.vertices;
        if (!vs || vs.length < 2) return;
        const pts = [applyXform([vs[0].x, vs[0].y], xf)];
        const segTotal = e.closed ? vs.length : vs.length - 1;
        for (let k = 0; k < segTotal; k++) {
          const v1 = vs[k];
          const v2 = vs[(k + 1) % vs.length];
          if (Math.abs(v1.bulge || 0) > 1e-6) {
            const arcPts = tessellateBulge([v1.x, v1.y], [v2.x, v2.y], v1.bulge, 28);
            for (let m = 0; m < arcPts.length; m++) pts.push(applyXform(arcPts[m], xf));
          } else {
            pts.push(applyXform([v2.x, v2.y], xf));
          }
        }
        if (e.closed && pts.length > 2 && dist(pts[0], pts[pts.length - 1]) < 1e-4) pts.pop();
        if (pts.length >= 2) {
          cadPaths.push({ id: 'd_' + (pid++), layerId: layer.id, closed: e.closed, isHole: false, pts });
        }
        return;
      }

      if (e.type === 'CIRCLE' && e.r > 0) {
        const segs = 64;
        const pts = [];
        for (let k = 0; k < segs; k++) {
          const a = (k / segs) * Math.PI * 2;
          pts.push(applyXform([e.x + Math.cos(a) * e.r, e.y + Math.sin(a) * e.r], xf));
        }
        cadPaths.push({ id: 'd_' + (pid++), layerId: layer.id, closed: true, isHole: false, pts });
        return;
      }

      if (e.type === 'ARC' && e.r > 0) {
        let a0 = (e.startAngle * Math.PI) / 180;
        let a1 = (e.endAngle * Math.PI) / 180;
        while (a1 <= a0) a1 += Math.PI * 2;
        const sweep = a1 - a0;
        const segs = Math.max(6, Math.ceil((sweep / (Math.PI * 2)) * 64));
        const pts = [];
        for (let k = 0; k <= segs; k++) {
          const a = a0 + (sweep * k) / segs;
          pts.push(applyXform([e.x + Math.cos(a) * e.r, e.y + Math.sin(a) * e.r], xf));
        }
        cadPaths.push({ id: 'd_' + (pid++), layerId: layer.id, closed: false, isHole: false, pts });
        return;
      }

      if (e.type === 'ELLIPSE') {
        const majLen = Math.hypot(e.x2, e.y2);
        if (majLen < 1e-6) return;
        const minLen = majLen * (e.ratio || 0.5);
        const rot = Math.atan2(e.y2, e.x2);
        const cR = Math.cos(rot), sR = Math.sin(rot);
        let t0 = e.startParam || 0, t1 = e.endParam || Math.PI * 2;
        if (t1 <= t0) t1 += Math.PI * 2;
        const closed = Math.abs(t1 - t0 - Math.PI * 2) < 1e-3;
        const segs = 64;
        const pts = [];
        for (let k = 0; k <= (closed ? segs - 1 : segs); k++) {
          const t = t0 + ((t1 - t0) * k) / segs;
          const lx = Math.cos(t) * majLen;
          const ly = Math.sin(t) * minLen;
          pts.push(applyXform([e.x + lx * cR - ly * sR, e.y + lx * sR + ly * cR], xf));
        }
        cadPaths.push({ id: 'd_' + (pid++), layerId: layer.id, closed, isHole: false, pts });
        return;
      }

      if (e.type === 'SPLINE' && e.vertices.length >= 2) {
        const ctrl = e.vertices.map(v => [v.x, v.y]);
        const ev = evaluateBSpline(ctrl, e.degree, e.knots, ctrl.length * 8);
        const pts = ev.map(p => applyXform(p, xf));
        if (pts.length >= 2) {
          cadPaths.push({ id: 'd_' + (pid++), layerId: layer.id, closed: e.closed, isHole: false, pts });
        }
      }
    }

    for (let k = 0; k < rawEntities.length; k++) emitEntity(rawEntities[k], null, 0);

    // Compute exact bounding box & convert Y-up CAD -> Y-down viewport (preserving exact mm!)
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let k = 0; k < cadPaths.length; k++) {
      const pts = cadPaths[k].pts;
      for (let j = 0; j < pts.length; j++) {
        if (pts[j][0] < minX) minX = pts[j][0];
        if (pts[j][1] < minY) minY = pts[j][1];
        if (pts[j][0] > maxX) maxX = pts[j][0];
        if (pts[j][1] > maxY) maxY = pts[j][1];
      }
    }

    if (!Number.isFinite(minX)) {
      minX = 0; minY = 0; maxX = 100; maxY = 100;
    }
    const widthMm = Math.max(1, maxX - minX);
    const heightMm = Math.max(1, maxY - minY);

    for (let k = 0; k < cadPaths.length; k++) {
      cadPaths[k].pts = cadPaths[k].pts.map(p => [p[0] - minX, maxY - p[1]]);
    }

    const layers = Array.from(layersMap.values());
    if (layers.length === 0) {
      layers.push({ id: 'dxf_0', name: '0', color: '#10b981', aci: 3, op: 'CUT', visible: true, locked: false });
    }
    classifyContourHierarchy(cadPaths);

    return {
      sourceType: 'dxf',
      sourceName: sourceName || 'imported.dxf',
      widthMm,
      heightMm,
      insUnits,
      layers,
      paths: cadPaths
    };
  }

  // ============================================================================
  // 5. NATIVE SVG PARSER (PHYSICAL MM + PATH COMMANDS + SHAPES)
  // ============================================================================
  function parseSVGPathD(dStr) {
    const tokens = String(dStr || '').match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g);
    if (!tokens) return [];
    const subpaths = [];
    let idx = 0, cmd = '', cx = 0, cy = 0, sx = 0, sy = 0, lastCtrlX = 0, lastCtrlY = 0, prevCmd = '';
    let cur = null;

    function nextNum() { return parseFloat(tokens[idx++]) || 0; }
    function hasNum() { return idx < tokens.length && !/^[a-zA-Z]$/.test(tokens[idx]); }

    function sampleCubic(x0, y0, x1, y1, x2, y2, x3, y3, steps) {
      for (let s = 1; s <= steps; s++) {
        const t = s / steps, mt = 1 - t;
        cur.pts.push([
          mt * mt * mt * x0 + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3,
          mt * mt * mt * y0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3
        ]);
      }
    }

    function sampleQuad(x0, y0, x1, y1, x2, y2, steps) {
      for (let s = 1; s <= steps; s++) {
        const t = s / steps, mt = 1 - t;
        cur.pts.push([
          mt * mt * x0 + 2 * mt * t * x1 + t * t * x2,
          mt * mt * y0 + 2 * mt * t * y1 + t * t * y2
        ]);
      }
    }

    function sampleSvgArc(x1, y1, rxIn, ryIn, phiDeg, largeArc, sweep, x2, y2) {
      let rx = Math.abs(rxIn), ry = Math.abs(ryIn);
      if (rx < 1e-6 || ry < 1e-6 || (Math.abs(x1 - x2) < 1e-6 && Math.abs(y1 - y2) < 1e-6)) {
        cur.pts.push([x2, y2]);
        return;
      }
      const phi = (phiDeg * Math.PI) / 180;
      const cP = Math.cos(phi), sP = Math.sin(phi);
      const dx2 = (x1 - x2) / 2, dy2 = (y1 - y2) / 2;
      const x1p = cP * dx2 + sP * dy2;
      const y1p = -sP * dx2 + cP * dy2;
      let lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
      if (lam > 1) { const s = Math.sqrt(lam); rx *= s; ry *= s; }
      const num = Math.max(0, rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p);
      const den = Math.max(1e-12, rx * rx * y1p * y1p + ry * ry * x1p * x1p);
      const coef = (largeArc === sweep ? -1 : 1) * Math.sqrt(num / den);
      const cxp = coef * ((rx * y1p) / ry);
      const cyp = coef * (-(ry * x1p) / rx);
      const arcCx = cP * cxp - sP * cyp + (x1 + x2) / 2;
      const arcCy = sP * cxp + cP * cyp + (y1 + y2) / 2;
      function vecAng(ux, uy, vx, vy) {
        const dot = ux * vx + uy * vy;
        const len = Math.hypot(ux, uy) * Math.hypot(vx, vy) || 1;
        let a = Math.acos(Math.max(-1, Math.min(1, dot / len)));
        if (ux * vy - uy * vx < 0) a = -a;
        return a;
      }
      const t1 = vecAng(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
      let dt = vecAng((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
      if (!sweep && dt > 0) dt -= Math.PI * 2;
      if (sweep && dt < 0) dt += Math.PI * 2;
      const steps = Math.max(6, Math.ceil(Math.abs(dt) / (Math.PI / 16)));
      for (let s = 1; s <= steps; s++) {
        const t = t1 + (dt * s) / steps;
        const px = rx * Math.cos(t), py = ry * Math.sin(t);
        cur.pts.push([cP * px - sP * py + arcCx, sP * px + cP * py + arcCy]);
      }
    }

    while (idx < tokens.length) {
      if (/^[a-zA-Z]$/.test(tokens[idx])) cmd = tokens[idx++];
      const rel = cmd === cmd.toLowerCase();
      const C = cmd.toUpperCase();

      if (C === 'M') {
        const nx = nextNum() + (rel ? cx : 0);
        const ny = nextNum() + (rel ? cy : 0);
        cur = { pts: [[nx, ny]], closed: false };
        subpaths.push(cur);
        cx = sx = nx; cy = sy = ny;
        cmd = rel ? 'l' : 'L';
      } else if (C === 'L') {
        if (!cur) { cur = { pts: [[cx, cy]], closed: false }; subpaths.push(cur); }
        while (hasNum()) {
          cx = nextNum() + (rel ? cx : 0);
          cy = nextNum() + (rel ? cy : 0);
          cur.pts.push([cx, cy]);
        }
      } else if (C === 'H') {
        while (hasNum()) {
          cx = nextNum() + (rel ? cx : 0);
          if (cur) cur.pts.push([cx, cy]);
        }
      } else if (C === 'V') {
        while (hasNum()) {
          cy = nextNum() + (rel ? cy : 0);
          if (cur) cur.pts.push([cx, cy]);
        }
      } else if (C === 'C') {
        while (hasNum()) {
          const x1 = nextNum() + (rel ? cx : 0), y1 = nextNum() + (rel ? cy : 0);
          const x2 = nextNum() + (rel ? cx : 0), y2 = nextNum() + (rel ? cy : 0);
          const x = nextNum() + (rel ? cx : 0), y = nextNum() + (rel ? cy : 0);
          if (cur) sampleCubic(cx, cy, x1, y1, x2, y2, x, y, 12);
          lastCtrlX = x2; lastCtrlY = y2; cx = x; cy = y;
        }
      } else if (C === 'S') {
        while (hasNum()) {
          const x1 = (prevCmd === 'C' || prevCmd === 'S') ? 2 * cx - lastCtrlX : cx;
          const y1 = (prevCmd === 'C' || prevCmd === 'S') ? 2 * cy - lastCtrlY : cy;
          const x2 = nextNum() + (rel ? cx : 0), y2 = nextNum() + (rel ? cy : 0);
          const x = nextNum() + (rel ? cx : 0), y = nextNum() + (rel ? cy : 0);
          if (cur) sampleCubic(cx, cy, x1, y1, x2, y2, x, y, 12);
          lastCtrlX = x2; lastCtrlY = y2; cx = x; cy = y;
          prevCmd = 'S';
        }
      } else if (C === 'Q') {
        while (hasNum()) {
          const x1 = nextNum() + (rel ? cx : 0), y1 = nextNum() + (rel ? cy : 0);
          const x = nextNum() + (rel ? cx : 0), y = nextNum() + (rel ? cy : 0);
          if (cur) sampleQuad(cx, cy, x1, y1, x, y, 10);
          lastCtrlX = x1; lastCtrlY = y1; cx = x; cy = y;
        }
      } else if (C === 'T') {
        while (hasNum()) {
          const x1 = (prevCmd === 'Q' || prevCmd === 'T') ? 2 * cx - lastCtrlX : cx;
          const y1 = (prevCmd === 'Q' || prevCmd === 'T') ? 2 * cy - lastCtrlY : cy;
          const x = nextNum() + (rel ? cx : 0), y = nextNum() + (rel ? cy : 0);
          if (cur) sampleQuad(cx, cy, x1, y1, x, y, 10);
          lastCtrlX = x1; lastCtrlY = y1; cx = x; cy = y;
          prevCmd = 'T';
        }
      } else if (C === 'A') {
        while (hasNum()) {
          const rx = nextNum(), ry = nextNum(), rot = nextNum();
          const la = nextNum(), sw = nextNum();
          const x = nextNum() + (rel ? cx : 0), y = nextNum() + (rel ? cy : 0);
          if (cur) sampleSvgArc(cx, cy, rx, ry, rot, la !== 0, sw !== 0, x, y);
          cx = x; cy = y;
        }
      } else if (C === 'Z') {
        if (cur) {
          cur.closed = true;
          if (cur.pts.length > 2 && dist(cur.pts[0], cur.pts[cur.pts.length - 1]) < 1e-4) cur.pts.pop();
        }
        cx = sx; cy = sy;
      } else {
        break;
      }
      prevCmd = C;
    }
    return subpaths.filter(s => s.pts.length >= 2);
  }

  function parseUnitToMm(valStr) {
    if (!valStr) return null;
    const m = String(valStr).trim().match(/^([-+]?[\d.]+)\s*(mm|cm|in|pt|px)?$/i);
    if (!m) return null;
    const v = parseFloat(m[1]);
    const u = (m[2] || 'px').toLowerCase();
    if (u === 'mm') return v;
    if (u === 'cm') return v * 10;
    if (u === 'in') return v * 25.4;
    if (u === 'pt') return v * (25.4 / 72);
    return v * (25.4 / 96); // CSS 96 DPI px -> mm
  }

  function parseSVG(svgText, sourceName) {
    const str = String(svgText || '');
    const svgTag = str.match(/<svg[^>]*>/i)?.[0] || '';
    const wAttr = svgTag.match(/\bwidth="([^"]+)"/i)?.[1];
    const hAttr = svgTag.match(/\bheight="([^"]+)"/i)?.[1];
    const vbAttr = svgTag.match(/\bviewBox="([^"]+)"/i)?.[1];

    let vbW = 100, vbH = 100, vbX = 0, vbY = 0;
    if (vbAttr) {
      const p = vbAttr.trim().split(/[\s,]+/).map(Number);
      if (p.length === 4 && p[2] > 0 && p[3] > 0) {
        vbX = p[0]; vbY = p[1]; vbW = p[2]; vbH = p[3];
      }
    }
    const physW = parseUnitToMm(wAttr);
    const scaleToMm = (physW && vbW > 0) ? (physW / vbW) : (25.4 / 96);

    const layersMap = new Map();
    function getLayer(colorHex) {
      const hex = /^#[0-9a-fA-F]{3,6}$/.test(colorHex || '') ? colorHex.toLowerCase() : '#10b981';
      if (!layersMap.has(hex)) {
        const idx = layersMap.size + 1;
        layersMap.set(hex, {
          id: 'svg_l' + idx,
          name: idx === 1 ? 'CUT' : ('SVG_LAYER_' + idx),
          color: hex,
          aci: nearestACI(hex),
          op: idx === 1 ? 'CUT' : 'ENGRAVE',
          visible: true,
          locked: false
        });
      }
      return layersMap.get(hex);
    }

    const paths = [];
    let pid = 1;

    function attr(tag, name) {
      const m = tag.match(new RegExp('\\b' + name + '="([^"]+)"', 'i'));
      return m ? m[1] : null;
    }

    // Parse <path>, <rect>, <circle>, <ellipse>, <line>, <polyline>, <polygon>
    const elemRegex = /<(path|rect|circle|ellipse|line|polyline|polygon)\b[^>]*>/gi;
    let m;
    while ((m = elemRegex.exec(str)) !== null) {
      const tag = m[0];
      const kind = m[1].toLowerCase();
      const stroke = attr(tag, 'stroke');
      const fill = attr(tag, 'fill');
      const color = (stroke && stroke !== 'none') ? stroke : ((fill && fill !== 'none') ? fill : '#10b981');
      const layer = getLayer(color);

      if (kind === 'path') {
        const d = attr(tag, 'd');
        if (!d) continue;
        const subs = parseSVGPathD(d);
        for (const s of subs) {
          paths.push({ id: 'sv_' + (pid++), layerId: layer.id, closed: s.closed, isHole: false, pts: s.pts });
        }
      } else if (kind === 'rect') {
        const x = parseFloat(attr(tag, 'x') || 0), y = parseFloat(attr(tag, 'y') || 0);
        const rw = parseFloat(attr(tag, 'width') || 0), rh = parseFloat(attr(tag, 'height') || 0);
        if (rw > 0 && rh > 0) {
          paths.push({
            id: 'sv_' + (pid++), layerId: layer.id, closed: true, isHole: false,
            pts: [[x, y], [x + rw, y], [x + rw, y + rh], [x, y + rh]]
          });
        }
      } else if (kind === 'circle') {
        const cx = parseFloat(attr(tag, 'cx') || 0), cy = parseFloat(attr(tag, 'cy') || 0);
        const r = parseFloat(attr(tag, 'r') || 0);
        if (r > 0) {
          const pts = [];
          for (let k = 0; k < 64; k++) {
            const a = (k / 64) * Math.PI * 2;
            pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
          }
          paths.push({ id: 'sv_' + (pid++), layerId: layer.id, closed: true, isHole: false, pts });
        }
      } else if (kind === 'ellipse') {
        const cx = parseFloat(attr(tag, 'cx') || 0), cy = parseFloat(attr(tag, 'cy') || 0);
        const rx = parseFloat(attr(tag, 'rx') || 0), ry = parseFloat(attr(tag, 'ry') || 0);
        if (rx > 0 && ry > 0) {
          const pts = [];
          for (let k = 0; k < 64; k++) {
            const a = (k / 64) * Math.PI * 2;
            pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
          }
          paths.push({ id: 'sv_' + (pid++), layerId: layer.id, closed: true, isHole: false, pts });
        }
      } else if (kind === 'line') {
        const x1 = parseFloat(attr(tag, 'x1') || 0), y1 = parseFloat(attr(tag, 'y1') || 0);
        const x2 = parseFloat(attr(tag, 'x2') || 0), y2 = parseFloat(attr(tag, 'y2') || 0);
        paths.push({ id: 'sv_' + (pid++), layerId: layer.id, closed: false, isHole: false, pts: [[x1, y1], [x2, y2]] });
      } else if (kind === 'polyline' || kind === 'polygon') {
        const ptsAttr = attr(tag, 'points') || '';
        const nums = ptsAttr.trim().split(/[\s,]+/).map(Number).filter(Number.isFinite);
        const pts = [];
        for (let k = 0; k + 1 < nums.length; k += 2) pts.push([nums[k], nums[k + 1]]);
        if (pts.length >= 2) {
          paths.push({ id: 'sv_' + (pid++), layerId: layer.id, closed: kind === 'polygon', isHole: false, pts });
        }
      }
    }

    // Scale to mm & normalize origin cleanly
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of paths) {
      for (const pt of p.pts) {
        pt[0] = (pt[0] - vbX) * scaleToMm;
        pt[1] = (pt[1] - vbY) * scaleToMm;
        if (pt[0] < minX) minX = pt[0];
        if (pt[1] < minY) minY = pt[1];
        if (pt[0] > maxX) maxX = pt[0];
        if (pt[1] > maxY) maxY = pt[1];
      }
    }
    if (!Number.isFinite(minX)) { minX = 0; minY = 0; maxX = 100; maxY = 100; }
    for (const p of paths) {
      for (const pt of p.pts) { pt[0] -= minX; pt[1] -= minY; }
    }
    const widthMm = Math.max(1, maxX - minX);
    const heightMm = Math.max(1, maxY - minY);
    const layers = Array.from(layersMap.values());
    if (layers.length === 0) {
      layers.push({ id: 'svg_l1', name: 'CUT', color: '#10b981', aci: 3, op: 'CUT', visible: true, locked: false });
    }
    classifyContourHierarchy(paths);

    return {
      sourceType: 'svg',
      sourceName: sourceName || 'imported.svg',
      widthMm,
      heightMm,
      layers,
      paths
    };
  }

  // ============================================================================
  // 6. CAD DOCTOR — DIAGNOSTICS + ONE-CLICK REPAIR (OVERKILL + CONTOUR HEALER)
  // ============================================================================
  function segKeyBucket(p, cell) {
    return Math.round(p[0] / cell) + ',' + Math.round(p[1] / cell);
  }

  function diagnoseCad(doc, opts) {
    const o = Object.assign({ dupTolMm: 0.08, speckleMinMm: 0.6 }, opts || {});
    const openEndpoints = [];
    const duplicates = [];
    const speckles = [];
    const stencilIslands = [];
    let closedCount = 0, openCount = 0, totalNodes = 0, totalLengthMm = 0;

    // Spatial dedup check across all segments
    const cell = Math.max(0.05, o.dupTolMm * 2);
    const segHash = new Map();

    for (let i = 0; i < doc.paths.length; i++) {
      const p = doc.paths[i];
      if (!p.pts || p.pts.length < 2) continue;
      totalNodes += p.pts.length;
      const len = pathLength(p.pts, p.closed);
      totalLengthMm += len;

      if (len < o.speckleMinMm) {
        speckles.push({ pathId: p.id, pt: p.pts[0], len });
      }
      if (p.closed) {
        closedCount++;
        if ((p.depth || 0) >= 2 && !p.isHole) {
          stencilIslands.push({ pathId: p.id, pt: p.pts[0] });
        }
      } else {
        openCount++;
        openEndpoints.push(p.pts[0], p.pts[p.pts.length - 1]);
      }

      const segCount = p.closed ? p.pts.length : p.pts.length - 1;
      for (let s = 0; s < segCount; s++) {
        const a = p.pts[s], b = p.pts[(s + 1) % p.pts.length];
        if (dist(a, b) < 1e-5) continue;
        const ka = segKeyBucket(a, cell), kb = segKeyBucket(b, cell);
        const key = ka < kb ? (ka + '|' + kb) : (kb + '|' + ka);
        const list = segHash.get(key);
        let isDup = false;
        if (list) {
          for (let q = 0; q < list.length; q++) {
            const [ea, eb] = list[q];
            const fwd = dist(a, ea) <= o.dupTolMm && dist(b, eb) <= o.dupTolMm;
            const rev = dist(a, eb) <= o.dupTolMm && dist(b, ea) <= o.dupTolMm;
            if (fwd || rev) { isDup = true; break; }
          }
        }
        if (isDup) {
          duplicates.push({ a, b });
        } else {
          if (!list) segHash.set(key, [[a, b]]);
          else list.push([a, b]);
        }
      }
    }

    return {
      closedCount,
      openCount,
      totalNodes,
      totalLengthMm,
      openEndpoints,
      duplicates,
      speckles,
      stencilIslands
    };
  }

  /**
   * One-Click CAD Doctor Auto-Repair:
   * 1) Removes micro-speckles (< speckleMinMm)
   * 2) OVERKILL: removes coincident / reversed duplicate segments within dupTolMm
   * 3) HEALER: stitches open segments/chains within stitchTolMm & closes micro-gap loops
   * 4) COLLINEAR MERGE + optional RDP simplification
   */
  function repairCad(doc, opts) {
    const o = Object.assign({
      overkill: true,
      healOpen: true,
      removeSpeckles: true,
      mergeCollinear: true,
      dupTolMm: 0.08,
      stitchTolMm: 0.5,
      speckleMinMm: 0.6,
      simplifyTolMm: 0.0
    }, opts || {});

    const stats = {
      duplicatesRemoved: 0,
      contoursStitched: 0,
      loopsClosed: 0,
      specklesRemoved: 0,
      nodesBefore: 0,
      nodesAfter: 0
    };

    for (const p of doc.paths) stats.nodesBefore += p.pts.length;

    let work = doc.paths.map(p => ({
      id: p.id,
      layerId: p.layerId,
      closed: p.closed,
      isHole: p.isHole,
      pts: p.pts.map(pt => [pt[0], pt[1]])
    }));

    // Step 1: Remove micro-speckles
    if (o.removeSpeckles) {
      const kept = [];
      for (const p of work) {
        if (pathLength(p.pts, p.closed) < o.speckleMinMm) {
          stats.specklesRemoved++;
        } else {
          kept.push(p);
        }
      }
      work = kept;
    }

    // Step 2: OVERKILL (Duplicate & overlapping segment elimination per layer)
    if (o.overkill) {
      const cell = Math.max(0.05, o.dupTolMm * 2);
      const seenByLayer = new Map();
      const nextWork = [];
      let segId = 1;

      for (const p of work) {
        if (!seenByLayer.has(p.layerId)) seenByLayer.set(p.layerId, new Map());
        const segMap = seenByLayer.get(p.layerId);
        const segCount = p.closed ? p.pts.length : p.pts.length - 1;
        let hadDup = false;
        const keptSegs = [];

        for (let s = 0; s < segCount; s++) {
          const a = p.pts[s], b = p.pts[(s + 1) % p.pts.length];
          if (dist(a, b) < 1e-5) { stats.duplicatesRemoved++; hadDup = true; continue; }
          const ka = segKeyBucket(a, cell), kb = segKeyBucket(b, cell);
          const key = ka < kb ? (ka + '|' + kb) : (kb + '|' + ka);
          const bucket = segMap.get(key);
          let dup = false;
          if (bucket) {
            for (let q = 0; q < bucket.length; q++) {
              const [ea, eb] = bucket[q];
              if ((dist(a, ea) <= o.dupTolMm && dist(b, eb) <= o.dupTolMm) ||
                  (dist(a, eb) <= o.dupTolMm && dist(b, ea) <= o.dupTolMm)) {
                dup = true;
                break;
              }
            }
          }
          if (dup) {
            stats.duplicatesRemoved++;
            hadDup = true;
          } else {
            if (!bucket) segMap.set(key, [[a, b]]);
            else bucket.push([a, b]);
            keptSegs.push([a, b]);
          }
        }

        if (!hadDup) {
          nextWork.push(p);
        } else if (keptSegs.length > 0) {
          // Rebuild contiguous sub-polylines from surviving non-duplicate segments
          let chain = [keptSegs[0][0], keptSegs[0][1]];
          for (let k = 1; k < keptSegs.length; k++) {
            if (dist(chain[chain.length - 1], keptSegs[k][0]) <= o.dupTolMm * 1.5) {
              chain.push(keptSegs[k][1]);
            } else {
              nextWork.push({ id: p.id + '_ok' + (segId++), layerId: p.layerId, closed: false, isHole: false, pts: chain });
              chain = [keptSegs[k][0], keptSegs[k][1]];
            }
          }
          const isClosedLoop = chain.length > 3 && dist(chain[0], chain[chain.length - 1]) <= o.dupTolMm * 1.5;
          if (isClosedLoop) chain.pop();
          nextWork.push({ id: p.id + '_ok' + (segId++), layerId: p.layerId, closed: isClosedLoop, isHole: false, pts: chain });
        }
      }
      work = nextWork;
    }

    // Step 3: HEALER — stitch open paths on the same layer whose endpoints meet within stitchTolMm
    if (o.healOpen) {
      const tol = Math.max(0.01, o.stitchTolMm);
      const closedPaths = work.filter(p => p.closed);
      const openPaths = work.filter(p => !p.closed && p.pts.length >= 2);

      // Group open paths by layer
      const byLayer = new Map();
      for (const p of openPaths) {
        if (!byLayer.has(p.layerId)) byLayer.set(p.layerId, []);
        byLayer.get(p.layerId).push(p);
      }

      const healedOpen = [];
      for (const [layerId, pool] of byLayer.entries()) {
        const used = new Uint8Array(pool.length);
        for (let i = 0; i < pool.length; i++) {
          if (used[i]) continue;
          used[i] = 1;
          let pts = pool[i].pts.slice();

          let grew = true;
          while (grew) {
            grew = false;
            const head = pts[0], tail = pts[pts.length - 1];
            let bestJ = -1, bestMode = 0, bestD = tol;

            for (let j = 0; j < pool.length; j++) {
              if (used[j]) continue;
              const oPts = pool[j].pts;
              const oHead = oPts[0], oTail = oPts[oPts.length - 1];
              const d1 = dist(tail, oHead); // tail -> oHead
              if (d1 <= bestD) { bestD = d1; bestJ = j; bestMode = 1; }
              const d2 = dist(tail, oTail); // tail -> rev(oPts)
              if (d2 <= bestD) { bestD = d2; bestJ = j; bestMode = 2; }
              const d3 = dist(head, oTail); // oPts -> head
              if (d3 <= bestD) { bestD = d3; bestJ = j; bestMode = 3; }
              const d4 = dist(head, oHead); // rev(oPts) -> head
              if (d4 <= bestD) { bestD = d4; bestJ = j; bestMode = 4; }
            }

            if (bestJ >= 0) {
              used[bestJ] = 1;
              stats.contoursStitched++;
              const oPts = pool[bestJ].pts;
              if (bestMode === 1) pts = pts.concat(oPts.slice(1));
              else if (bestMode === 2) pts = pts.concat(oPts.slice(0, -1).reverse());
              else if (bestMode === 3) pts = oPts.slice(0, -1).concat(pts);
              else if (bestMode === 4) pts = oPts.slice(1).reverse().concat(pts);
              grew = true;
            }
          }

          // Check if stitched chain closes onto itself within stitch tolerance!
          let isClosed = false;
          if (pts.length >= 3 && dist(pts[0], pts[pts.length - 1]) <= tol) {
            isClosed = true;
            if (dist(pts[0], pts[pts.length - 1]) <= tol) pts.pop();
            stats.loopsClosed++;
          }
          healedOpen.push({ id: pool[i].id, layerId, closed: isClosed, isHole: false, pts });
        }
      }
      work = closedPaths.concat(healedOpen);
    }

    // Step 4: Merge collinear & optional RDP simplify
    for (let i = 0; i < work.length; i++) {
      let pts = work[i].pts;
      if (o.simplifyTolMm > 1e-4) pts = simplifyRDP(pts, o.simplifyTolMm, work[i].closed);
      if (o.mergeCollinear) pts = mergeCollinear(pts, work[i].closed, 0.012);
      work[i].pts = pts;
      stats.nodesAfter += pts.length;
    }

    const outDoc = Object.assign({}, doc, { paths: work });
    classifyContourHierarchy(outDoc.paths);
    return { doc: outDoc, stats };
  }

  // ============================================================================
  // 7. EXACT 2D NESTED KERF COMPENSATION OFFSET (+/- mm)
  // ============================================================================
  /**
   * Offsets closed polygons by exact half-kerf:
   * - Outer contours expand outward by +kerfMm / 2
   * - Inner holes shrink inward by -kerfMm / 2
   * Uses miter-limit clamped edge-line intersection (safe on acute laser corners!).
   */
  function offsetClosedPolygon(pts, offsetMm) {
    if (!pts || pts.length < 3 || Math.abs(offsetMm) < 1e-5) return pts.slice();
    // Ensure consistent positive signedArea (CW in Y-down screen space) so outward normal is unambiguous
    const area = signedArea(pts);
    if (Math.abs(area) < 1e-6) return pts.slice();
    const oriented = area > 0 ? pts.slice() : pts.slice().reverse();
    const n = oriented.length;

    // Outward normal for CW loop in Y-down space: edge (dx, dy) -> outward left-of-CW = (dy, -dx)/len
    const edges = [];
    for (let i = 0; i < n; i++) {
      const a = oriented[i], b = oriented[(i + 1) % n];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.hypot(dx, dy);
      if (len < 1e-7) continue;
      const nx = dy / len, ny = -dx / len;
      edges.push({
        a: [a[0] + nx * offsetMm, a[1] + ny * offsetMm],
        b: [b[0] + nx * offsetMm, b[1] + ny * offsetMm],
        dx, dy, nx, ny
      });
    }
    if (edges.length < 3) return pts.slice();

    const miterMax = Math.abs(offsetMm) * 2.5;
    const out = [];
    const m = edges.length;
    for (let i = 0; i < m; i++) {
      const e1 = edges[(i - 1 + m) % m];
      const e2 = edges[i];
      const denom = e1.dx * e2.dy - e1.dy * e2.dx;
      if (Math.abs(denom) < 1e-7) {
        out.push(e2.a);
        continue;
      }
      const rx = e2.a[0] - e1.a[0], ry = e2.a[1] - e1.a[1];
      const t = (rx * e2.dy - ry * e2.dx) / denom;
      const ix = e1.a[0] + t * e1.dx;
      const iy = e1.a[1] + t * e1.dy;
      const origV = oriented[i % n];
      if (Math.hypot(ix - origV[0], iy - origV[1]) > miterMax) {
        // Bevel fallback prevents sharp spike blow-up!
        out.push(e1.b, e2.a);
      } else {
        out.push([ix, iy]);
      }
    }
    // Reject collapsed/inverted loops (e.g. kerf bigger than hole radius)
    const newArea = signedArea(out);
    if (newArea <= 1e-5) return pts.slice();
    return area > 0 ? out : out.reverse();
  }

  function applyKerfOffset(doc, kerfMm) {
    if (!kerfMm || Math.abs(kerfMm) < 1e-4) return doc;
    const half = kerfMm * 0.5;
    const newPaths = doc.paths.map(p => {
      if (!p.closed || p.pts.length < 3) return p;
      // Outer shell grows by +half; inner hole shrinks by -half
      const delta = p.isHole ? -half : half;
      return Object.assign({}, p, { pts: offsetClosedPolygon(p.pts, delta) });
    });
    return Object.assign({}, doc, { paths: newPaths });
  }

  // ============================================================================
  // 8. INSIDE-FIRST TSP TOOLPATH OPTIMIZER & LASER/CNC TELEMETRY
  // ============================================================================
  function optimizeToolpaths(doc, opts) {
    const o = Object.assign({ feedRateMmMin: 1200, rapidRateMmMin: 6000 }, opts || {});
    const visibleLayers = new Map();
    for (const l of doc.layers) {
      if (l.visible !== false) visibleLayers.set(l.id, l);
    }

    const active = doc.paths.filter(p => visibleLayers.has(p.layerId) && p.pts && p.pts.length >= 2);
    // Priority buckets: 0 = ENGRAVE/SCORE, 1 = CUT inner holes, 2 = CUT outer perimeters
    const buckets = [[], [], []];
    for (const p of active) {
      const layer = visibleLayers.get(p.layerId);
      if (layer.op !== 'CUT') buckets[0].push(p);
      else if (p.isHole) buckets[1].push(p);
      else buckets[2].push(p);
    }

    const ordered = [];
    let curPos = [0, doc.heightMm]; // Laser origin (0,0) in CAD Y-up = (0, heightMm) in Y-down
    let cutLengthMm = 0, rapidLengthMm = 0, nodeCount = 0;

    for (let b = 0; b < buckets.length; b++) {
      const pool = buckets[b].slice();
      while (pool.length > 0) {
        let bestIdx = 0, bestD = Infinity, bestRev = false, bestStartV = 0;
        for (let i = 0; i < pool.length; i++) {
          const p = pool[i];
          if (p.closed) {
            // Pick closest vertex on closed loop!
            for (let v = 0; v < p.pts.length; v++) {
              const d = dist2(curPos, p.pts[v]);
              if (d < bestD) { bestD = d; bestIdx = i; bestStartV = v; bestRev = false; }
            }
          } else {
            const dStart = dist2(curPos, p.pts[0]);
            if (dStart < bestD) { bestD = dStart; bestIdx = i; bestRev = false; bestStartV = 0; }
            const dEnd = dist2(curPos, p.pts[p.pts.length - 1]);
            if (dEnd < bestD) { bestD = dEnd; bestIdx = i; bestRev = true; bestStartV = 0; }
          }
        }
        const chosen = pool.splice(bestIdx, 1)[0];
        let pts;
        if (chosen.closed) {
          pts = chosen.pts.slice(bestStartV).concat(chosen.pts.slice(0, bestStartV));
        } else {
          pts = bestRev ? chosen.pts.slice().reverse() : chosen.pts.slice();
        }
        const layer = visibleLayers.get(chosen.layerId);
        const rap = dist(curPos, pts[0]);
        const cut = pathLength(pts, chosen.closed);
        rapidLengthMm += rap;
        cutLengthMm += cut;
        nodeCount += pts.length;
        ordered.push({
          pathId: chosen.id,
          layerId: chosen.layerId,
          layerName: layer.name,
          color: layer.color,
          op: layer.op,
          closed: chosen.closed,
          isHole: chosen.isHole,
          rapidFrom: curPos.slice(),
          pts
        });
        curPos = chosen.closed ? pts[0].slice() : pts[pts.length - 1].slice();
      }
    }

    const estMinutes = (cutLengthMm / Math.max(60, o.feedRateMmMin)) +
      (rapidLengthMm / Math.max(300, o.rapidRateMmMin)) +
      (ordered.length * 0.008); // ~0.5s pierce/plunge overhead per contour

    return {
      ordered,
      cutLengthMm,
      rapidLengthMm,
      pierceCount: ordered.length,
      nodeCount,
      estMinutes
    };
  }

  // ============================================================================
  // 9. INDUSTRIAL EXPORTERS: AUTOCAD DXF R12 & R2000, PHYSICAL MM SVG, GRBL G-CODE
  // ============================================================================
  function fmt(n, decimals) {
    const d = typeof decimals === 'number' ? Math.max(0, Math.min(6, decimals)) : 3;
    return Number(n).toFixed(d);
  }

  /**
   * Standards-compliant AutoCAD DXF Exporter (R12 AC1009 & R2000 AC1015).
   * - Exact physical millimeters ($INSUNITS = 4, $MEASUREMENT = 1)
   * - Standard CAD Y-up coordinates (yCad = heightMm - y)
   * - Real LAYER table with AutoCAD ACI colors
   * - Zero white background polygon, zero duplicate lines
   */
  function exportDXF(doc, opts) {
    const o = Object.assign({
      version: 'R12',      // 'R12' (universal POLYLINE) or 'R2000' (LWPOLYLINE)
      roundCoords: 3,
      kerfMm: 0
    }, opts || {});

    const workDoc = o.kerfMm ? applyKerfOffset(doc, o.kerfMm) : doc;
    const dec = o.roundCoords;
    const H = workDoc.heightMm;
    const W = workDoc.widthMm;
    const isR2000 = o.version === 'R2000';
    const visLayers = workDoc.layers.filter(l => l.visible !== false);
    const visIds = new Set(visLayers.map(l => l.id));
    const layerById = new Map(visLayers.map(l => [l.id, l]));

    const lines = [];
    const push = (c, v) => { lines.push(String(c)); lines.push(String(v)); };

    // HEADER
    push(0, 'SECTION');
    push(2, 'HEADER');
    push(9, '$ACADVER'); push(1, isR2000 ? 'AC1015' : 'AC1009');
    push(9, '$INSUNITS'); push(70, 4); // 4 = Millimeters!
    push(9, '$MEASUREMENT'); push(70, 1); // 1 = Metric!
    push(9, '$EXTMIN'); push(10, '0.000'); push(20, '0.000'); push(30, '0.000');
    push(9, '$EXTMAX'); push(10, fmt(W, dec)); push(20, fmt(H, dec)); push(30, '0.000');
    push(0, 'ENDSEC');

    // TABLES -> LAYER
    push(0, 'SECTION');
    push(2, 'TABLES');
    push(0, 'TABLE');
    push(2, 'LAYER');
    push(70, visLayers.length);
    for (const l of visLayers) {
      push(0, 'LAYER');
      push(2, l.name || '0');
      push(70, 0);
      push(62, l.aci || nearestACI(l.color));
      push(6, 'CONTINUOUS');
    }
    push(0, 'ENDTAB');
    push(0, 'ENDSEC');

    // ENTITIES
    push(0, 'SECTION');
    push(2, 'ENTITIES');

    for (const p of workDoc.paths) {
      if (!visIds.has(p.layerId) || !p.pts || p.pts.length < 2) continue;
      const layer = layerById.get(p.layerId);
      const lName = layer.name || '0';
      const aci = layer.aci || nearestACI(layer.color);

      if (p.pts.length === 2 && !p.closed) {
        push(0, 'LINE');
        push(8, lName);
        push(62, aci);
        push(10, fmt(p.pts[0][0], dec));
        push(20, fmt(H - p.pts[0][1], dec));
        push(30, '0.0');
        push(11, fmt(p.pts[1][0], dec));
        push(21, fmt(H - p.pts[1][1], dec));
        push(31, '0.0');
      } else if (isR2000) {
        push(0, 'LWPOLYLINE');
        push(8, lName);
        push(62, aci);
        push(90, p.pts.length);
        push(70, p.closed ? 1 : 0);
        for (let k = 0; k < p.pts.length; k++) {
          push(10, fmt(p.pts[k][0], dec));
          push(20, fmt(H - p.pts[k][1], dec));
        }
      } else {
        // Universal AutoCAD R12 POLYLINE + VERTEX + SEQEND
        push(0, 'POLYLINE');
        push(8, lName);
        push(62, aci);
        push(66, 1);
        push(10, '0.0'); push(20, '0.0'); push(30, '0.0');
        push(70, p.closed ? 1 : 0);
        for (let k = 0; k < p.pts.length; k++) {
          push(0, 'VERTEX');
          push(8, lName);
          push(10, fmt(p.pts[k][0], dec));
          push(20, fmt(H - p.pts[k][1], dec));
          push(30, '0.0');
        }
        push(0, 'SEQEND');
        push(8, lName);
      }
    }

    push(0, 'ENDSEC');
    push(0, 'EOF');
    return lines.join('\r\n') + '\r\n';
  }

  /**
   * 1:1 Physical Millimeter Vector SVG Exporter (LightBurn, Inkscape, Illustrator & Fusion 360 ready!).
   * Zero width="100%" bug, zero white background rectangle, real layer <g> groups!
   */
  function exportSVG(doc, opts) {
    const o = Object.assign({
      strokeWidthMm: 0.25,
      roundCoords: 3,
      kerfMm: 0,
      scale: 1.0
    }, opts || {});

    const workDoc = o.kerfMm ? applyKerfOffset(doc, o.kerfMm) : doc;
    const dec = o.roundCoords;
    const s = Math.max(0.1, o.scale || 1.0);
    const W = workDoc.widthMm * s;
    const H = workDoc.heightMm * s;
    const visLayers = workDoc.layers.filter(l => l.visible !== false);

    const out = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(W, 2)}mm" height="${fmt(H, 2)}mm" viewBox="0 0 ${fmt(W, 2)} ${fmt(H, 2)}">`,
      `  <!-- Generated by Studios-Pro DFX Studio Pro | Exact 1:1 mm Vector CAD -->`
    ];

    for (const l of visLayers) {
      const lPaths = workDoc.paths.filter(p => p.layerId === l.id && p.pts && p.pts.length >= 2);
      if (lPaths.length === 0) continue;
      const safeId = (l.name || l.id).replace(/[^a-zA-Z0-9_-]/g, '_');
      out.push(`  <g id="${safeId}" data-op="${l.op}" fill="none" stroke="${l.color}" stroke-width="${fmt(o.strokeWidthMm, 3)}" stroke-linecap="round" stroke-linejoin="round">`);
      for (const p of lPaths) {
        let d = `M ${fmt(p.pts[0][0] * s, dec)} ${fmt(p.pts[0][1] * s, dec)}`;
        for (let k = 1; k < p.pts.length; k++) {
          d += ` L ${fmt(p.pts[k][0] * s, dec)} ${fmt(p.pts[k][1] * s, dec)}`;
        }
        if (p.closed) d += ' Z';
        out.push(`    <path d="${d}" />`);
      }
      out.push('  </g>');
    }
    out.push('</svg>');
    return out.join('\n');
  }

  /**
   * Direct Production GRBL Laser & CNC Router G-Code Exporter (.nc).
   * Uses Inside-First TSP optimization (holes cut BEFORE perimeter!).
   */
  function exportGCode(doc, opts) {
    const o = Object.assign({
      machineMode: 'laser', // 'laser' (M4 dynamic power) or 'cnc' (Z multi-pass)
      feedRate: 1200,
      plungeRate: 300,
      laserPowerPct: 85,
      passes: 1,
      cutDepthMm: 3.0,
      safeZMm: 5.0,
      kerfMm: 0
    }, opts || {});

    const workDoc = o.kerfMm ? applyKerfOffset(doc, o.kerfMm) : doc;
    const plan = optimizeToolpaths(workDoc, { feedRateMmMin: o.feedRate });
    const H = workDoc.heightMm;
    const isLaser = o.machineMode !== 'cnc';
    const maxS = Math.round(Math.max(10, Math.min(100, o.laserPowerPct)) * 10); // GRBL $30=1000
    const passes = Math.max(1, Math.min(20, Math.round(o.passes || 1)));

    const g = [
      `; Studios-Pro DFX Studio Pro — ${isLaser ? 'GRBL Laser' : 'CNC Router'} G-Code`,
      `; Size: ${fmt(workDoc.widthMm, 2)} x ${fmt(workDoc.heightMm, 2)} mm | Paths: ${plan.pierceCount} | Cut: ${(plan.cutLengthMm / 1000).toFixed(2)} m`,
      `; Order: Inside-First (Holes before Outer Perimeter) + Nearest-Neighbor TSP`,
      'G21 ; Millimeters',
      'G90 ; Absolute coordinates',
      'G17 ; XY plane'
    ];

    if (isLaser) {
      g.push('M5 ; Laser OFF');
      g.push(`G0 F6000`);
    } else {
      g.push(`G0 Z${fmt(o.safeZMm, 2)}`);
      g.push('M3 S12000 ; Spindle ON');
    }

    for (let pass = 1; pass <= passes; pass++) {
      const zDepth = -((o.cutDepthMm * pass) / passes);
      g.push(`; --- PASS ${pass}/${passes}${isLaser ? '' : ' (Z=' + fmt(zDepth, 2) + ' mm)'} ---`);
      for (const item of plan.ordered) {
        const pts = item.pts;
        if (pts.length < 2) continue;
        const sx = pts[0][0], sy = H - pts[0][1];
        const opPower = item.op === 'ENGRAVE' ? Math.round(maxS * 0.45) : (item.op === 'SCORE' ? Math.round(maxS * 0.65) : maxS);

        g.push(`; Path ${item.pathId} [${item.layerName} | ${item.op}${item.isHole ? ' HOLE' : ''}]`);
        if (isLaser) {
          g.push(`G0 X${fmt(sx, 3)} Y${fmt(sy, 3)}`);
          g.push(`M4 S${opPower}`);
        } else {
          g.push(`G0 Z${fmt(o.safeZMm, 2)}`);
          g.push(`G0 X${fmt(sx, 3)} Y${fmt(sy, 3)}`);
          g.push(`G1 Z${fmt(zDepth, 3)} F${Math.round(o.plungeRate)}`);
        }

        for (let k = 1; k < pts.length; k++) {
          g.push(`G1 X${fmt(pts[k][0], 3)} Y${fmt(H - pts[k][1], 3)} F${Math.round(o.feedRate)}`);
        }
        if (item.closed) {
          g.push(`G1 X${fmt(sx, 3)} Y${fmt(sy, 3)} F${Math.round(o.feedRate)}`);
        }
        if (isLaser) g.push('M5');
      }
    }

    if (isLaser) {
      g.push('M5');
      g.push('G0 X0.000 Y0.000');
    } else {
      g.push(`G0 Z${fmt(o.safeZMm, 2)}`);
      g.push('M5');
      g.push('G0 X0.000 Y0.000');
    }
    g.push('M2 ; Program End');
    return g.join('\n') + '\n';
  }

  // ============================================================================
  // 10. BUILT-IN NATIVE DXF CAD SAMPLE (NEMA-17 MOUNT PLATE WITH BULGE CORNERS)
  // ============================================================================
  function getSampleDXF(variant) {
    // 60x60 mm NEMA-17 Stepper Motor Mount Plate (Exact ISO dimensions: 31mm bolt square, 22mm pilot bore, M3 holes, R5 filleted corners via LWPOLYLINE bulge!)
    // Optional variant === 'doctor' adds 2 deliberate duplicate edges + 1 tiny open micro-gap to showcase CAD Doctor One-Click Repair!
    const b = Math.tan(Math.PI / 8).toFixed(6); // 90 deg CCW fillet bulge = 0.414214
    const base = [
      '0', 'SECTION', '2', 'HEADER',
      '9', '$ACADVER', '1', 'AC1015',
      '9', '$INSUNITS', '70', '4',
      '0', 'ENDSEC',
      '0', 'SECTION', '2', 'TABLES',
      '0', 'TABLE', '2', 'LAYER', '70', '3',
      '0', 'LAYER', '2', 'CUT', '70', '0', '62', '3', '6', 'CONTINUOUS',
      '0', 'LAYER', '2', 'SCORE', '70', '0', '62', '4', '6', 'CONTINUOUS',
      '0', 'LAYER', '2', 'ENGRAVE', '70', '0', '62', '30', '6', 'CONTINUOUS',
      '0', 'ENDTAB', '0', 'ENDSEC',
      '0', 'SECTION', '2', 'ENTITIES',
      // Outer 60x60 plate with 5mm filleted corners (bulge arcs!)
      '0', 'LWPOLYLINE', '8', 'CUT', '62', '3', '90', '8', '70', '1',
      '10', '5', '20', '0',
      '10', '55', '20', '0', '42', b,
      '10', '60', '20', '5',
      '10', '60', '20', '55', '42', b,
      '10', '55', '20', '60',
      '10', '5', '20', '60', '42', b,
      '10', '0', '20', '55',
      '10', '0', '20', '5', '42', b,
      // Center NEMA-17 pilot bore (D = 22.4 mm -> R = 11.2 mm)
      '0', 'CIRCLE', '8', 'CUT', '62', '3', '10', '30', '20', '30', '40', '11.2',
      // 4 x M3 Mounting holes on 31x31 mm square (14.5 & 45.5 mm, R = 1.65 mm)
      '0', 'CIRCLE', '8', 'CUT', '62', '3', '10', '14.5', '20', '14.5', '40', '1.65',
      '0', 'CIRCLE', '8', 'CUT', '62', '3', '10', '45.5', '20', '14.5', '40', '1.65',
      '0', 'CIRCLE', '8', 'CUT', '62', '3', '10', '45.5', '20', '45.5', '40', '1.65',
      '0', 'CIRCLE', '8', 'CUT', '62', '3', '10', '14.5', '20', '45.5', '40', '1.65',
      // 2 x Side slotted mounting ears (Score / Engrave alignment crosshairs)
      '0', 'LINE', '8', 'SCORE', '62', '4', '10', '30', '20', '16', '11', '30', '21', '44',
      '0', 'LINE', '8', 'SCORE', '62', '4', '10', '16', '20', '30', '11', '44', '21', '30',
      // Engraved inner mounting alignment frame (42x42 mm)
      '0', 'LWPOLYLINE', '8', 'ENGRAVE', '62', '30', '90', '4', '70', '1',
      '10', '9', '20', '9',
      '10', '51', '20', '9',
      '10', '51', '20', '51',
      '10', '9', '20', '51'
    ];

    if (variant === 'doctor') {
      // Deliberate real-world CAD flaws for CAD Doctor demonstration:
      // 1) Two exact duplicate overlapping lines on SCORE layer
      base.push('0', 'LINE', '8', 'SCORE', '62', '4', '10', '30', '20', '16', '11', '30', '21', '44');
      base.push('0', 'LINE', '8', 'SCORE', '62', '4', '10', '44', '20', '30', '11', '16', '21', '30');
      // 2) An open 4-segment rectangular pocket with a 0.3 mm micro-gap (Healer closes it!)
      base.push('0', 'LINE', '8', 'CUT', '62', '3', '10', '24', '20', '4', '11', '36', '21', '4');
      base.push('0', 'LINE', '8', 'CUT', '62', '3', '10', '36', '20', '4', '11', '36', '21', '7.5');
      base.push('0', 'LINE', '8', 'CUT', '62', '3', '10', '36', '20', '7.5', '11', '24', '21', '7.5');
      base.push('0', 'LINE', '8', 'CUT', '62', '3', '10', '24', '20', '7.5', '11', '24', '21', '4.25');
      // 3) Tiny 0.2mm dust speckle
      base.push('0', 'LINE', '8', 'CUT', '62', '3', '10', '3', '20', '3', '11', '3.15', '21', '3.15');
    }

    base.push('0', 'ENDSEC', '0', 'EOF');
    return base.join('\r\n') + '\r\n';
  }

  /**
   * Utility transforms on a CadDoc (exact millimeter scale, mirror, rotate 90 deg, normalize).
   */
  function scaleDoc(doc, newWidthMm) {
    if (!doc || !newWidthMm || newWidthMm <= 0) return doc;
    const factor = newWidthMm / Math.max(1e-6, doc.widthMm);
    const paths = doc.paths.map(p => Object.assign({}, p, {
      pts: p.pts.map(pt => [pt[0] * factor, pt[1] * factor])
    }));
    return Object.assign({}, doc, {
      widthMm: doc.widthMm * factor,
      heightMm: doc.heightMm * factor,
      paths
    });
  }

  function mirrorDoc(doc, axis) {
    const W = doc.widthMm, H = doc.heightMm;
    const paths = doc.paths.map(p => Object.assign({}, p, {
      pts: p.pts.map(pt => axis === 'x' ? [W - pt[0], pt[1]] : [pt[0], H - pt[1]])
    }));
    return Object.assign({}, doc, { paths });
  }

  function rotateDoc90(doc) {
    const H = doc.heightMm;
    const paths = doc.paths.map(p => Object.assign({}, p, {
      pts: p.pts.map(pt => [H - pt[1], pt[0]])
    }));
    return Object.assign({}, doc, {
      widthMm: doc.heightMm,
      heightMm: doc.widthMm,
      paths
    });
  }

  return {
    ACI_PALETTE,
    nearestACI,
    aciToHex,
    signedArea,
    pathLength,
    computePathBBox,
    simplifyRDP,
    smoothPolyline,
    mergeCollinear,
    traceContoursFromBinary,
    classifyContourHierarchy,
    traceCenterlineFromSkeleton,
    traceMultiColorLayers,
    parseDXF,
    parseSVG,
    diagnoseCad,
    repairCad,
    offsetClosedPolygon,
    applyKerfOffset,
    optimizeToolpaths,
    exportDXF,
    exportSVG,
    exportGCode,
    getSampleDXF,
    scaleDoc,
    mirrorDoc,
    rotateDoc90
  };
});
