// ==========================================
// UNIFIED 2D CAD VECTOR ENGINE
// TrueType Vector Typography (opentype.js) + Smooth Marching-Squares Fallback
// + Built-in/Custom Logo Vectorizer + Winding/Hole Hierarchy + Boundary Clamping
// ==========================================

const VECTOR_FONTS = {
    outfit: {
        id: 'outfit',
        cssFamily: '"Outfit", "Inter", sans-serif',
        cssWeight: '800',
        urls: [
            'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/outfit/static/Outfit-Bold.ttf',
            'https://cdn.jsdelivr.net/npm/@fontsource/outfit@5.0.15/files/outfit-latin-700-normal.woff'
        ]
    },
    cinzel: {
        id: 'cinzel',
        cssFamily: '"Cinzel", Georgia, serif',
        cssWeight: '700',
        urls: [
            'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/cinzel/static/Cinzel-Bold.ttf',
            'https://cdn.jsdelivr.net/npm/@fontsource/cinzel@5.0.15/files/cinzel-latin-700-normal.woff'
        ]
    },
    playfair: {
        id: 'playfair',
        cssFamily: '"Playfair Display", Georgia, serif',
        cssWeight: '700',
        urls: [
            'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/playfairdisplay/static/PlayfairDisplay-Bold.ttf',
            'https://cdn.jsdelivr.net/npm/@fontsource/playfair-display@5.0.15/files/playfair-display-latin-700-normal.woff'
        ]
    },
    mono: {
        id: 'mono',
        cssFamily: '"Space Mono", "JetBrains Mono", monospace',
        cssWeight: '700',
        urls: [
            'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/jetbrainsmono/static/JetBrainsMono-Bold.ttf',
            'https://cdn.jsdelivr.net/npm/@fontsource/space-mono@5.0.15/files/space-mono-latin-700-normal.woff'
        ]
    },
    fredoka: {
        id: 'fredoka',
        cssFamily: '"Fredoka", "Outfit", sans-serif',
        cssWeight: '600',
        urls: [
            'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/fredoka/static/Fredoka-SemiBold.ttf',
            'https://cdn.jsdelivr.net/npm/@fontsource/fredoka@5.0.15/files/fredoka-latin-600-normal.woff'
        ]
    }
};

let activeVectorFontId = 'outfit';
const loadedOpentypeFonts = {};
const loadingOpentypeFonts = {};
const vectorBadgeCache = new Map();

function loadVectorFont(fontId) {
    const id = VECTOR_FONTS[fontId] ? fontId : 'outfit';
    if (loadedOpentypeFonts[id] || loadingOpentypeFonts[id]) return;
    if (typeof window === 'undefined' || !window.opentype || typeof window.opentype.load !== 'function') return;

    const spec = VECTOR_FONTS[id];
    loadingOpentypeFonts[id] = true;

    const tryUrl = (idx) => {
        if (idx >= spec.urls.length) {
            loadingOpentypeFonts[id] = false;
            return;
        }
        try {
            window.opentype.load(spec.urls[idx], (err, font) => {
                if (!err && font) {
                    loadedOpentypeFonts[id] = font;
                    loadingOpentypeFonts[id] = false;
                    if (activeVectorFontId === id && typeof scheduleRebuild3D === 'function') {
                        scheduleRebuild3D(20);
                    }
                } else {
                    tryUrl(idx + 1);
                }
            });
        } catch (_) {
            tryUrl(idx + 1);
        }
    };
    tryUrl(0);
}

function setVectorFont(fontId) {
    activeVectorFontId = VECTOR_FONTS[fontId] ? fontId : 'outfit';
    loadVectorFont(activeVectorFontId);
    if (typeof scheduleRebuild3D === 'function') scheduleRebuild3D(20);
    else if (typeof rebuild3DModel === 'function') rebuild3DModel();
}

// ==========================================
// 2D POLYGON & WINDING UTILITIES
// ==========================================

function polygonSignedArea(pts) {
    let area = 0;
    const n = pts.length;
    for (let i = 0; i < n; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % n];
        area += (a.x * b.y - b.x * a.y);
    }
    return area * 0.5;
}

function ensureWinding(pts, wantCCW = true) {
    const area = polygonSignedArea(pts);
    if ((wantCCW && area < 0) || (!wantCCW && area > 0)) {
        return pts.slice().reverse();
    }
    return pts;
}

function deduplicateClosedRing(pts, eps = 1e-4) {
    if (!pts || pts.length < 3) return [];
    const out = [];
    for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const prev = out[out.length - 1];
        if (!prev || Math.hypot(p.x - prev.x, p.y - prev.y) > eps) {
            out.push({ x: p.x, y: p.y });
        }
    }
    while (out.length > 1 && Math.hypot(out[0].x - out[out.length - 1].x, out[0].y - out[out.length - 1].y) <= eps) {
        out.pop();
    }
    return out.length >= 3 ? out : [];
}

function pointInPolygon2D(pt, poly) {
    let inside = false;
    const n = poly.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = poly[i].x, yi = poly[i].y;
        const xj = poly[j].x, yj = poly[j].y;
        const intersect = ((yi > pt.y) !== (yj > pt.y)) &&
            (pt.x < (xj - xi) * (pt.y - yi) / ((yj - yi) || 1e-12) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function getRingBBox(pts) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    }
    return { minX, maxX, minY, maxY };
}

function classifyLoopsToVectorShapes(rawLoops, minArea = 0.008) {
    const items = [];
    for (let i = 0; i < rawLoops.length; i++) {
        const clean = deduplicateClosedRing(rawLoops[i]);
        if (clean.length < 3) continue;
        const absArea = Math.abs(polygonSignedArea(clean));
        if (absArea < minArea) continue;
        items.push({ pts: clean, absArea, bbox: getRingBBox(clean), parents: [] });
    }
    if (items.length === 0) return [];

    // Compute strict containment hierarchy
    for (let i = 0; i < items.length; i++) {
        const testPt = items[i].pts[0];
        for (let j = 0; j < items.length; j++) {
            if (i === j || items[j].absArea <= items[i].absArea) continue;
            const bb = items[j].bbox;
            if (testPt.x < bb.minX || testPt.x > bb.maxX || testPt.y < bb.minY || testPt.y > bb.maxY) continue;
            if (pointInPolygon2D(testPt, items[j].pts)) {
                items[i].parents.push(j);
            }
        }
    }

    const outerMap = new Map();
    for (let i = 0; i < items.length; i++) {
        if (items[i].parents.length % 2 === 0) {
            outerMap.set(i, {
                outer: ensureWinding(items[i].pts, true),
                holes: []
            });
        }
    }

    for (let i = 0; i < items.length; i++) {
        if (items[i].parents.length % 2 === 1) {
            // Find smallest enclosing outer loop (immediate parent with even depth)
            let bestParent = -1;
            let bestArea = Infinity;
            for (const pIdx of items[i].parents) {
                if (outerMap.has(pIdx) && items[pIdx].absArea < bestArea) {
                    bestArea = items[pIdx].absArea;
                    bestParent = pIdx;
                }
            }
            if (bestParent !== -1) {
                outerMap.get(bestParent).holes.push(ensureWinding(items[i].pts, false));
            }
        }
    }

    return Array.from(outerMap.values());
}

function vectorShapesToThreeShapes(vecShapes) {
    const out = [];
    for (let i = 0; i < vecShapes.length; i++) {
        const item = vecShapes[i];
        if (!item.outer || item.outer.length < 3) continue;
        const shape = new THREE.Shape(item.outer.map(p => new THREE.Vector2(p.x, p.y)));
        if (item.holes && item.holes.length > 0) {
            for (let h = 0; h < item.holes.length; h++) {
                const holePts = item.holes[h];
                if (holePts.length >= 3) {
                    shape.holes.push(new THREE.Path(holePts.map(p => new THREE.Vector2(p.x, p.y))));
                }
            }
        }
        out.push(shape);
    }
    return out;
}

// ==========================================
// EXACT BOUNDARY-GRAPH POLYGON TRACER (NON-SELF-INTERSECTING)
// ==========================================

function rdpSimplifyClosed(pts, epsilon) {
    if (pts.length <= 4) return pts;

    function perpDist(p, a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const lenSq = dx * dx + dy * dy;
        if (lenSq < 1e-10) return Math.hypot(p.x - a.x, p.y - a.y);
        const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
        return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
    }

    function rdpOpen(arr, eps) {
        if (arr.length <= 2) return arr;
        let maxD = 0, idx = 0;
        const first = arr[0], last = arr[arr.length - 1];
        for (let i = 1; i < arr.length - 1; i++) {
            const d = perpDist(arr[i], first, last);
            if (d > maxD) { maxD = d; idx = i; }
        }
        if (maxD > eps) {
            const left = rdpOpen(arr.slice(0, idx + 1), eps);
            const right = rdpOpen(arr.slice(idx), eps);
            return left.slice(0, -1).concat(right);
        }
        return [first, last];
    }

    // Split closed ring at the two farthest points for balanced simplification
    let i1 = 0, i2 = Math.floor(pts.length / 2);
    let maxDistSq = -1;
    for (let i = 0; i < pts.length; i++) {
        const dx = pts[i].x - pts[0].x;
        const dy = pts[i].y - pts[0].y;
        const dSq = dx * dx + dy * dy;
        if (dSq > maxDistSq) { maxDistSq = dSq; i2 = i; }
    }
    if (i2 === i1) return pts;

    const half1 = rdpOpen(pts.slice(i1, i2 + 1), epsilon);
    const half2 = rdpOpen(pts.slice(i2).concat([pts[i1]]), epsilon);
    const merged = half1.slice(0, -1).concat(half2.slice(0, -1));
    return merged.length >= 3 ? merged : pts;
}

function smoothGridLoop(pts) {
    const n = pts.length;
    if (n < 5) return pts;
    const out = [];
    for (let i = 0; i < n; i++) {
        const prev = pts[(i - 1 + n) % n];
        const curr = pts[i];
        const next = pts[(i + 1) % n];
        const len1 = Math.hypot(curr.x - prev.x, curr.y - prev.y);
        const len2 = Math.hypot(next.x - curr.x, next.y - curr.y);
        // Preserve long straight edges sharply; smooth tiny 1-2px staircase corners
        if (len1 <= 2.2 && len2 <= 2.2) {
            out.push({
                x: prev.x * 0.22 + curr.x * 0.56 + next.x * 0.22,
                y: prev.y * 0.22 + curr.y * 0.56 + next.y * 0.22
            });
        } else {
            out.push(curr);
        }
    }
    return out;
}

/**
 * Traces a binary grid mask (w x h) into guaranteed non-self-intersecting smooth 2D vector shapes.
 * mapPoint(gx, gy) converts grid vertex coords [0..w, 0..h] to coaster 2D mm coordinates.
 */
function traceBinaryMaskToVectorShapes(mask, w, h, mapPoint, simplifyPx = 0.42, minAreaMm = 0.012) {
    // Directed edges stored by start vertex key -> array of { x2, y2, dir, used }
    // Directions: 0 = +X, 1 = +Y, 2 = -X, 3 = -Y
    const outEdges = new Map();
    const stride = w + 1;
    const addEdge = (x1, y1, x2, y2, dir) => {
        const k = y1 * stride + x1;
        let list = outEdges.get(k);
        if (!list) { list = []; outEdges.set(k, list); }
        list.push({ x1, y1, x2, y2, dir, used: false });
    };

    const get = (x, y) => (x >= 0 && x < w && y >= 0 && y < h) ? mask[y * w + x] : 0;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (!mask[y * w + x]) continue;
            if (!get(x, y - 1)) addEdge(x, y, x + 1, y, 0);
            if (!get(x + 1, y)) addEdge(x + 1, y, x + 1, y + 1, 1);
            if (!get(x, y + 1)) addEdge(x + 1, y + 1, x, y + 1, 2);
            if (!get(x - 1, y)) addEdge(x, y + 1, x, y, 3);
        }
    }

    const rawLoopsMm = [];
    for (const edgeList of outEdges.values()) {
        for (let ei = 0; ei < edgeList.length; ei++) {
            const startEdge = edgeList[ei];
            if (startEdge.used) continue;

            const ringPx = [];
            let curr = startEdge;
            let guard = 0;
            const maxGuard = w * h * 4 + 16;

            while (curr && !curr.used && guard++ < maxGuard) {
                curr.used = true;
                ringPx.push({ x: curr.x1, y: curr.y1 });

                const nextKey = curr.y2 * stride + curr.x2;
                const candidates = outEdges.get(nextKey);
                if (!candidates || candidates.length === 0) break;

                // At saddle points (2 outgoing edges), turn RIGHT relative to incoming direction
                // (preferred dir order: (dir+1)%4, dir, (dir+3)%4) so loops never cross!
                let chosen = null;
                if (candidates.length === 1) {
                    if (!candidates[0].used) chosen = candidates[0];
                } else {
                    const rightDir = (curr.dir + 1) & 3;
                    const straightDir = curr.dir;
                    const leftDir = (curr.dir + 3) & 3;
                    const order = [rightDir, straightDir, leftDir];
                    for (const pref of order) {
                        for (let c = 0; c < candidates.length; c++) {
                            if (!candidates[c].used && candidates[c].dir === pref) {
                                chosen = candidates[c];
                                break;
                            }
                        }
                        if (chosen) break;
                    }
                }
                curr = chosen;
            }

            if (ringPx.length < 4) continue;

            // Remove collinear vertices on grid
            const reduced = [];
            const n = ringPx.length;
            for (let i = 0; i < n; i++) {
                const a = ringPx[(i - 1 + n) % n];
                const b = ringPx[i];
                const c = ringPx[(i + 1) % n];
                const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
                if (Math.abs(cross) > 1e-6) reduced.push(b);
            }
            if (reduced.length < 3) continue;

            const smoothed = smoothGridLoop(reduced);
            const simplified = rdpSimplifyClosed(smoothed, simplifyPx);
            if (simplified.length < 3) continue;

            rawLoopsMm.push(simplified.map(p => mapPoint(p.x, p.y)));
        }
    }

    return classifyLoopsToVectorShapes(rawLoopsMm, minAreaMm);
}

// ==========================================
// OPENTYPE.JS PATH CONVERTER + VECTOR TEXT API
// ==========================================

function sampleQuadratic(p0, p1, p2, segs) {
    const pts = [];
    for (let i = 1; i <= segs; i++) {
        const t = i / segs;
        const mt = 1 - t;
        pts.push({
            x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
            y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y
        });
    }
    return pts;
}

function sampleCubic(p0, p1, p2, p3, segs) {
    const pts = [];
    for (let i = 1; i <= segs; i++) {
        const t = i / segs;
        const mt = 1 - t;
        const mt2 = mt * mt;
        const t2 = t * t;
        pts.push({
            x: mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x,
            y: mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y
        });
    }
    return pts;
}

function opentypeCommandsToLoops(commands, curveSegs = 6) {
    const loops = [];
    let current = [];
    let cursor = { x: 0, y: 0 };
    let start = { x: 0, y: 0 };

    for (let i = 0; i < commands.length; i++) {
        const cmd = commands[i];
        if (cmd.type === 'M') {
            if (current.length >= 3) loops.push(current);
            current = [{ x: cmd.x, y: cmd.y }];
            cursor = { x: cmd.x, y: cmd.y };
            start = { x: cmd.x, y: cmd.y };
        } else if (cmd.type === 'L') {
            current.push({ x: cmd.x, y: cmd.y });
            cursor = { x: cmd.x, y: cmd.y };
        } else if (cmd.type === 'Q') {
            const pts = sampleQuadratic(cursor, { x: cmd.x1, y: cmd.y1 }, { x: cmd.x, y: cmd.y }, curveSegs);
            for (const p of pts) current.push(p);
            cursor = { x: cmd.x, y: cmd.y };
        } else if (cmd.type === 'C') {
            const pts = sampleCubic(cursor, { x: cmd.x1, y: cmd.y1 }, { x: cmd.x2, y: cmd.y2 }, { x: cmd.x, y: cmd.y }, curveSegs);
            for (const p of pts) current.push(p);
            cursor = { x: cmd.x, y: cmd.y };
        } else if (cmd.type === 'Z') {
            if (current.length >= 3) loops.push(current);
            current = [];
            cursor = { ...start };
        }
    }
    if (current.length >= 3) loops.push(current);
    return loops;
}

function fontHasAllGlyphs(font, text) {
    if (!font || typeof font.charToGlyphIndex !== 'function') return false;
    for (const ch of text) {
        if (ch === ' ') continue;
        if (font.charToGlyphIndex(ch) === 0) return false;
    }
    return true;
}

function checkOuterBBoxesOverlap(shapes) {
    const boxes = shapes.map(s => getRingBBox(s.outer));
    for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i], b = boxes[j];
            if (a.minX < b.maxX - 0.01 && a.maxX > b.minX + 0.01 &&
                a.minY < b.maxY - 0.01 && a.maxY > b.minY + 0.01) {
                // Only flag if points actually intersect (e.g. 'i' dot vs stem doesn't overlap)
                for (let k = 0; k < shapes[i].outer.length; k++) {
                    if (pointInPolygon2D(shapes[i].outer[k], shapes[j].outer)) return true;
                }
            }
        }
    }
    return false;
}

/**
 * Builds clean 2D vector shapes for STRAIGHT text centered at (0, yCenterMm).
 * Uses opentype.js TTF vector outlines when loaded, or smooth Marching-Squares vector fallback.
 */
function buildStraightTextVectorShapes(text, maxTargetW, targetH, yCenterMm, fontId = activeVectorFontId) {
    const clean = (text || '').trim();
    if (!clean || maxTargetW <= 2 || targetH <= 1.5) return [];

    const spec = VECTOR_FONTS[fontId] || VECTOR_FONTS.outfit;
    const otFont = loadedOpentypeFonts[spec.id];

    // Path A: Pure TrueType opentype.js vectors
    if (otFont && fontHasAllGlyphs(otFont, clean)) {
        try {
            const refSize = 48;
            const tracking = refSize * 0.04;
            const glyphs = otFont.stringToGlyphs(clean);
            const scaleRef = refSize / otFont.unitsPerEm;
            let cursorX = 0;
            const rawLoops = [];

            for (let i = 0; i < glyphs.length; i++) {
                const g = glyphs[i];
                const gPath = g.getPath(cursorX, 0, refSize);
                const loops = opentypeCommandsToLoops(gPath.commands, 5);
                for (const l of loops) rawLoops.push(l);
                const adv = (g.advanceWidth || otFont.unitsPerEm * 0.5) * scaleRef;
                cursorX += adv + (i < glyphs.length - 1 ? tracking : 0);
            }

            if (rawLoops.length > 0) {
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                for (const l of rawLoops) {
                    for (const p of l) {
                        if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
                        if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
                    }
                }
                const bw = maxX - minX;
                const bh = maxY - minY;
                if (bw > 0.1 && bh > 0.1) {
                    const s = Math.min(maxTargetW / bw, targetH / bh);
                    const cx = (minX + maxX) * 0.5;
                    const cy = (minY + maxY) * 0.5;
                    const mmLoops = rawLoops.map(l => l.map(p => ({
                        x: (p.x - cx) * s,
                        y: yCenterMm + (p.y - cy) * s
                    })));
                    const vecShapes = classifyLoopsToVectorShapes(mmLoops, 0.005);
                    if (vecShapes.length > 0 && !checkOuterBBoxesOverlap(vecShapes)) {
                        return vecShapes;
                    }
                }
            }
        } catch (_) {}
    }

    // Path B: Smooth Vectorized Canvas Tracer (handles emojis, ★, ♥, offline, or loading state)
    const cw = 960, ch = 160;
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = '#ffffff';

    let fontPx = 104;
    ctx.font = `${spec.cssWeight} ${fontPx}px ${spec.cssFamily}`;
    const measured = ctx.measureText(clean).width;
    if (measured > cw - 40) {
        fontPx = Math.max(24, Math.floor(fontPx * ((cw - 40) / measured)));
        ctx.font = `${spec.cssWeight} ${fontPx}px ${spec.cssFamily}`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(clean, cw / 2, ch / 2);

    const img = ctx.getImageData(0, 0, cw, ch).data;
    let minX = cw, maxX = 0, minY = ch, maxY = 0;
    const mask = new Uint8Array(cw * ch);
    for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
            if (img[(y * cw + x) * 4] > 120) {
                mask[y * cw + x] = 1;
                if (x < minX) minX = x; if (x > maxX) maxX = x;
                if (y < minY) minY = y; if (y > maxY) maxY = y;
            }
        }
    }
    if (maxX <= minX || maxY <= minY) return [];

    const pad = 2;
    const x0 = Math.max(0, minX - pad), y0 = Math.max(0, minY - pad);
    const subW = Math.min(cw - x0, (maxX - minX) + 1 + pad * 2);
    const subH = Math.min(ch - y0, (maxY - minY) + 1 + pad * 2);
    const subMask = new Uint8Array(subW * subH);
    for (let y = 0; y < subH; y++) {
        for (let x = 0; x < subW; x++) {
            subMask[y * subW + x] = mask[(y0 + y) * cw + (x0 + x)];
        }
    }

    const actW = (maxX - minX) + 1;
    const actH = (maxY - minY) + 1;
    const scale = Math.min(maxTargetW / actW, targetH / actH);
    const cxPx = (minX + maxX + 1) * 0.5 - x0;
    const cyPx = (minY + maxY + 1) * 0.5 - y0;

    return traceBinaryMaskToVectorShapes(
        subMask,
        subW,
        subH,
        (gx, gy) => ({
            x: (gx - cxPx) * scale,
            y: yCenterMm + (gy - cyPx) * scale
        }),
        0.55,
        0.008
    );
}

/**
 * Builds clean 2D vector shapes for CURVED ARC text along radius `radiusMm` (in coaster 2D space).
 * isBottom = false -> top arc (-PI/2), isBottom = true -> bottom arc (+PI/2).
 */
function buildCurvedTextVectorShapes(text, radiusMm, fontSizeMm, isBottom, fontId = activeVectorFontId, maxArcRad = Math.PI * 0.82) {
    const clean = (text || '').trim();
    if (!clean || radiusMm <= 8 || fontSizeMm <= 1.5) return [];

    const spec = VECTOR_FONTS[fontId] || VECTOR_FONTS.outfit;
    const otFont = loadedOpentypeFonts[spec.id];

    // Path A: Exact opentype.js per-glyph placement along circular arc
    if (otFont && fontHasAllGlyphs(otFont, clean)) {
        try {
            const glyphs = otFont.stringToGlyphs(clean);
            let effSize = fontSizeMm * 1.15;
            const measureTotalWidth = (sz) => {
                const sc = sz / otFont.unitsPerEm;
                const tr = sz * 0.05;
                let w = 0;
                for (let i = 0; i < glyphs.length; i++) {
                    w += (glyphs[i].advanceWidth || otFont.unitsPerEm * 0.5) * sc;
                    if (i < glyphs.length - 1) w += tr;
                }
                return w;
            };

            let totalW = measureTotalWidth(effSize);
            if (totalW / radiusMm > maxArcRad) {
                effSize = Math.max(2.6, effSize * ((maxArcRad * radiusMm) / totalW));
                totalW = measureTotalWidth(effSize);
            }

            const totalAngle = Math.min(maxArcRad, totalW / radiusMm);
            const centerAngle = isBottom ? Math.PI / 2 : -Math.PI / 2;
            const dir = isBottom ? -1 : 1;
            let currentAngle = centerAngle - (dir * totalAngle) / 2;

            const sc = effSize / otFont.unitsPerEm;
            const tr = effSize * 0.05;
            const capHeight = ((otFont.ascender || 750) * 0.72) * sc;
            const allLoops = [];

            for (let i = 0; i < glyphs.length; i++) {
                const g = glyphs[i];
                const adv = (g.advanceWidth || otFont.unitsPerEm * 0.5) * sc;
                const stepW = adv + (i < glyphs.length - 1 ? tr : 0);
                const charAngle = (adv / radiusMm) * dir;
                const stepAngle = (stepW / radiusMm) * dir;
                const midAngle = currentAngle + charAngle * 0.5;

                const gPath = g.getPath(-adv * 0.5, capHeight * 0.5, effSize);
                const loops = opentypeCommandsToLoops(gPath.commands, 5);

                const rot = midAngle + (isBottom ? -Math.PI / 2 : Math.PI / 2);
                const cosR = Math.cos(rot), sinR = Math.sin(rot);
                const tx = radiusMm * Math.cos(midAngle);
                const ty = radiusMm * Math.sin(midAngle);

                for (const l of loops) {
                    allLoops.push(l.map(p => ({
                        x: tx + p.x * cosR - p.y * sinR,
                        y: ty + p.x * sinR + p.y * cosR
                    })));
                }
                currentAngle += stepAngle;
            }

            const vecShapes = classifyLoopsToVectorShapes(allLoops, 0.005);
            if (vecShapes.length > 0 && !checkOuterBBoxesOverlap(vecShapes)) {
                return vecShapes;
            }
        } catch (_) {}
    }

    // Path B: Smooth Vectorized Canvas Tracer for Curved Arc
    const pxPerMm = 5.5;
    const maxDimMm = (radiusMm + fontSizeMm * 1.4) * 2 + 6;
    const dimPx = Math.min(920, Math.max(440, Math.ceil(maxDimMm * pxPerMm)));
    const actualPxPerMm = dimPx / maxDimMm;

    const canvas = document.createElement('canvas');
    canvas.width = dimPx;
    canvas.height = dimPx;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, dimPx, dimPx);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const cx = dimPx / 2, cy = dimPx / 2;
    const rPix = radiusMm * actualPxPerMm;
    let fontPx = Math.round(fontSizeMm * actualPxPerMm * 0.96);
    ctx.font = `${spec.cssWeight} ${fontPx}px ${spec.cssFamily}`;

    const totalW = ctx.measureText(clean).width;
    if (totalW / rPix > maxArcRad) {
        fontPx = Math.max(16, Math.round(fontPx * ((maxArcRad * rPix) / totalW)));
        ctx.font = `${spec.cssWeight} ${fontPx}px ${spec.cssFamily}`;
    }

    const totalAngle = Math.min(maxArcRad, ctx.measureText(clean).width / rPix);
    const centerAngle = isBottom ? Math.PI / 2 : -Math.PI / 2;
    const dir = isBottom ? -1 : 1;
    let currentAngle = centerAngle - (dir * totalAngle) / 2;

    for (let i = 0; i < clean.length; i++) {
        const ch = clean[i];
        const charW = ctx.measureText(ch).width;
        const charAngle = (charW / rPix) * dir;
        const midAngle = currentAngle + charAngle * 0.5;
        ctx.save();
        ctx.translate(cx + rPix * Math.cos(midAngle), cy + rPix * Math.sin(midAngle));
        ctx.rotate(midAngle + (isBottom ? -Math.PI / 2 : Math.PI / 2));
        ctx.fillText(ch, 0, 0);
        ctx.restore();
        currentAngle += charAngle;
    }

    const img = ctx.getImageData(0, 0, dimPx, dimPx).data;
    let minX = dimPx, maxX = 0, minY = dimPx, maxY = 0;
    const mask = new Uint8Array(dimPx * dimPx);
    for (let y = 0; y < dimPx; y++) {
        for (let x = 0; x < dimPx; x++) {
            if (img[(y * dimPx + x) * 4] > 120) {
                mask[y * dimPx + x] = 1;
                if (x < minX) minX = x; if (x > maxX) maxX = x;
                if (y < minY) minY = y; if (y > maxY) maxY = y;
            }
        }
    }
    if (maxX <= minX || maxY <= minY) return [];

    const pad = 2;
    const x0 = Math.max(0, minX - pad), y0 = Math.max(0, minY - pad);
    const subW = Math.min(dimPx - x0, (maxX - minX) + 1 + pad * 2);
    const subH = Math.min(dimPx - y0, (maxY - minY) + 1 + pad * 2);
    const subMask = new Uint8Array(subW * subH);
    for (let y = 0; y < subH; y++) {
        for (let x = 0; x < subW; x++) {
            subMask[y * subW + x] = mask[(y0 + y) * dimPx + (x0 + x)];
        }
    }

    const invScale = 1 / actualPxPerMm;
    return traceBinaryMaskToVectorShapes(
        subMask,
        subW,
        subH,
        (gx, gy) => ({
            x: (x0 + gx - cx) * invScale,
            y: (y0 + gy - cy) * invScale
        }),
        0.55,
        0.008
    );
}

// ==========================================
// VECTOR CENTER BADGE / CUSTOM LOGO TRACER (FIXED BACKGROUND DETECTION!)
// ==========================================

function drawStar2DPath(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
        ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
        rot += step;
        ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
        rot += step;
    }
    ctx.closePath();
}

function drawHeart2DPath(ctx, cx, cy, size) {
    const topCurveHeight = size * 0.3;
    ctx.beginPath();
    ctx.moveTo(cx, cy + size * 0.25);
    ctx.bezierCurveTo(cx, cy - size * 0.05, cx - size * 0.5, cy - size * 0.38, cx - size * 0.5, cy - size * 0.04);
    ctx.bezierCurveTo(cx - size * 0.5, cy + topCurveHeight, cx, cy + size * 0.48, cx, cy + size * 0.48);
    ctx.bezierCurveTo(cx, cy + size * 0.48, cx + size * 0.5, cy + topCurveHeight, cx + size * 0.5, cy - size * 0.04);
    ctx.bezierCurveTo(cx + size * 0.5, cy - size * 0.38, cx, cy - size * 0.05, cx, cy + size * 0.25);
    ctx.closePath();
}

/**
 * Generates clean, watertight 2D vector shapes for built-in badges AND custom uploaded images.
 * Fixes Bug #5: samples INSIDE the drawn image bounds (not transparent padding) + preserves aspect ratio + threshold & invert.
 */
function buildBadgeVectorShapes(type, badgeDiameterMm, customImg = null, customThreshold = 150, customInvert = false) {
    if (!type || type === 'none') return [];

    const isCustom = (type === 'custom' && customImg);
    if (!isCustom) {
        const cacheKey = `${type}_${badgeDiameterMm.toFixed(2)}`;
        if (vectorBadgeCache.has(cacheKey)) return vectorBadgeCache.get(cacheKey);
    }

    const cw = 128, ch = 128;
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');

    let drawX = 12, drawY = 12, drawW = cw - 24, drawH = ch - 24;

    if (!isCustom) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, cw, ch);
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const cx = 64, cy = 64;

        if (type === 'wifi') {
            ctx.beginPath(); ctx.arc(cx, cy + 26, 8, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx, cy + 26, 26, -Math.PI * 0.76, -Math.PI * 0.24); ctx.stroke();
            ctx.beginPath(); ctx.arc(cx, cy + 26, 44, -Math.PI * 0.76, -Math.PI * 0.24); ctx.stroke();
        } else if (type === 'coffee') {
            ctx.fillRect(cx - 26, cy - 8, 48, 36);
            ctx.beginPath(); ctx.arc(cx + 22, cy + 10, 14, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
            ctx.fillRect(cx - 34, cy + 34, 68, 8);
            ctx.lineWidth = 6;
            ctx.beginPath(); ctx.moveTo(cx - 10, cy - 18); ctx.quadraticCurveTo(cx - 16, cy - 28, cx - 8, cy - 36); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx + 8, cy - 18); ctx.quadraticCurveTo(cx + 2, cy - 28, cx + 10, cy - 36); ctx.stroke();
        } else if (type === 'beer') {
            ctx.fillRect(cx - 24, cy - 14, 44, 52);
            ctx.beginPath(); ctx.arc(cx + 20, cy + 10, 15, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
            ctx.beginPath(); ctx.arc(cx - 14, cy - 20, 12, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + 2, cy - 24, 14, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + 16, cy - 18, 10, 0, Math.PI * 2); ctx.fill();
        } else if (type === 'instagram') {
            ctx.lineWidth = 9;
            if (ctx.roundRect) {
                ctx.beginPath(); ctx.roundRect(cx - 32, cy - 32, 64, 64, 16); ctx.stroke();
            } else {
                ctx.strokeRect(cx - 32, cy - 32, 64, 64);
            }
            ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.arc(cx + 19, cy - 19, 5.5, 0, Math.PI * 2); ctx.fill();
        } else if (type === 'spotify') {
            ctx.lineWidth = 9;
            ctx.beginPath(); ctx.arc(cx, cy + 12, 20, -Math.PI * 0.78, -Math.PI * 0.22); ctx.stroke();
            ctx.beginPath(); ctx.arc(cx, cy + 20, 36, -Math.PI * 0.78, -Math.PI * 0.22); ctx.stroke();
            ctx.beginPath(); ctx.arc(cx, cy + 28, 52, -Math.PI * 0.78, -Math.PI * 0.22); ctx.stroke();
        } else if (type === 'star') {
            drawStar2DPath(ctx, cx, cy, 5, 42, 18);
            ctx.fill();
        } else if (type === 'heart') {
            drawHeart2DPath(ctx, cx, cy, 74);
            ctx.fill();
        } else if (type === 'menu') {
            // Fork + Knife clean silhouette
            ctx.fillRect(cx - 26, cy - 34, 6, 26);
            ctx.fillRect(cx - 17, cy - 34, 6, 26);
            ctx.fillRect(cx - 8, cy - 34, 6, 26);
            ctx.fillRect(cx - 26, cy - 12, 24, 9);
            ctx.fillRect(cx - 18, cy - 4, 8, 40);
            ctx.beginPath();
            ctx.moveTo(cx + 14, cy - 34);
            ctx.quadraticCurveTo(cx + 30, cy - 28, cx + 28, cy + 2);
            ctx.lineTo(cx + 14, cy + 2);
            ctx.closePath();
            ctx.fill();
            ctx.fillRect(cx + 14, cy, 9, 36);
        } else if (type === 'whatsapp') {
            // Speech bubble with phone handset cutout
            ctx.lineWidth = 9;
            ctx.beginPath();
            ctx.arc(cx, cy - 2, 34, 0.72 * Math.PI, 2.55 * Math.PI);
            ctx.lineTo(cx - 34, cy + 36);
            ctx.closePath();
            ctx.stroke();
            // Inner handset dots/arc
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.arc(cx + 2, cy - 2, 16, 0.35 * Math.PI, 1.15 * Math.PI);
            ctx.stroke();
        } else if (type === 'home') {
            // Airbnb / House icon
            ctx.lineWidth = 9;
            ctx.beginPath();
            ctx.moveTo(cx - 38, cy - 2);
            ctx.lineTo(cx, cy - 38);
            ctx.lineTo(cx + 38, cy - 2);
            ctx.stroke();
            ctx.fillRect(cx - 26, cy - 2, 52, 38);
            ctx.fillStyle = '#000000';
            ctx.fillRect(cx - 9, cy + 12, 18, 24);
        } else {
            return [];
        }
    } else {
        ctx.clearRect(0, 0, cw, ch);
        const natW = customImg.naturalWidth || customImg.width || 64;
        const natH = customImg.naturalHeight || customImg.height || 64;
        const maxBox = cw - 20;
        const aspect = natW / Math.max(1, natH);
        if (aspect >= 1) {
            drawW = maxBox;
            drawH = Math.max(8, Math.round(maxBox / aspect));
        } else {
            drawH = maxBox;
            drawW = Math.max(8, Math.round(maxBox * aspect));
        }
        drawX = Math.round((cw - drawW) / 2);
        drawY = Math.round((ch - drawH) / 2);
        ctx.drawImage(customImg, drawX, drawY, drawW, drawH);
    }

    const imgData = ctx.getImageData(0, 0, cw, ch).data;

    // FIX BUG #5: Sample the 4 corners INSIDE the drawn image bounds, NOT at transparent (0,0)!
    let isDarkInkOnLightBg = false;
    if (isCustom) {
        const samplePts = [
            [drawX + 1, drawY + 1],
            [drawX + drawW - 2, drawY + 1],
            [drawX + 1, drawY + drawH - 2],
            [drawX + drawW - 2, drawY + drawH - 2]
        ];
        let brightOpaqueCorners = 0;
        for (const [sx, sy] of samplePts) {
            const cxS = Math.max(0, Math.min(cw - 1, sx));
            const cyS = Math.max(0, Math.min(ch - 1, sy));
            const idx = (cyS * cw + cxS) * 4;
            const a = imgData[idx + 3];
            const lum = imgData[idx] * 0.299 + imgData[idx + 1] * 0.587 + imgData[idx + 2] * 0.114;
            if (a > 180 && lum > 185) brightOpaqueCorners++;
        }
        isDarkInkOnLightBg = brightOpaqueCorners >= 3;
    }

    const mask = new Uint8Array(cw * ch);
    const thresh = Math.max(20, Math.min(240, customThreshold || 150));
    const maxR = (cw / 2) - 4;

    for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
            // Keep badge strictly inside circular disc so it never overlaps badge border
            if (Math.hypot(x - cw / 2, y - ch / 2) > maxR) continue;
            const idx = (y * cw + x) * 4;
            let fg = false;
            if (!isCustom) {
                fg = imgData[idx] > 110;
            } else {
                const a = imgData[idx + 3];
                if (a < 80) {
                    fg = false;
                } else {
                    const lum = imgData[idx] * 0.299 + imgData[idx + 1] * 0.587 + imgData[idx + 2] * 0.114;
                    fg = isDarkInkOnLightBg ? (lum < thresh) : (lum > (255 - thresh) || (a > 140 && lum < 60 && !isDarkInkOnLightBg));
                    if (customInvert) fg = !fg;
                }
            }
            if (fg) mask[y * cw + x] = 1;
        }
    }

    const scale = badgeDiameterMm / cw;
    const shapes = traceBinaryMaskToVectorShapes(
        mask,
        cw,
        ch,
        (gx, gy) => ({
            x: (gx - cw * 0.5) * scale,
            y: (gy - ch * 0.5) * scale
        }),
        0.55,
        0.01
    );

    if (!isCustom) {
        vectorBadgeCache.set(`${type}_${badgeDiameterMm.toFixed(2)}`, shapes);
    }
    return shapes;
}

// ==========================================
// CHORD-WIDTH & SAFE MARGIN CALCULATOR (PREVENTS TEXT OVERFLOW!)
// ==========================================

/**
 * Computes the exact safe horizontal width inside a coaster contour at vertical position `yPosMm`
 * so straight text NEVER sticks out into mid-air or hits the drip lip!
 */
function computeSafeStraightTextWidth(shapeType, effectiveSize, yPosMm, textHeightMm, rimMarginMm = 4.0, invertShield = false) {
    const absYOuter = Math.abs(yPosMm) + textHeightMm * 0.5;
    const absYInner = Math.max(0, Math.abs(yPosMm) - textHeightMm * 0.5);

    if (shapeType === 'circle' || shapeType === 'keychain') {
        const rSafe = Math.max(6, (effectiveSize * 0.5) - rimMarginMm);
        if (absYOuter >= rSafe) return Math.max(10, effectiveSize * 0.28);
        const chord = 2 * Math.sqrt(Math.max(1, rSafe * rSafe - absYOuter * absYOuter));
        return Math.max(12, Math.min(effectiveSize * 0.84, chord * 0.94));
    }

    if (shapeType === 'squircle' || shapeType === 'stand' || shapeType === 'tent' || shapeType === 'magnet') {
        const half = effectiveSize * 0.5 - rimMarginMm;
        const cornerR = effectiveSize * 0.15;
        const cornerStart = half - cornerR;
        if (absYOuter > cornerStart && cornerR > 0) {
            const dy = Math.min(cornerR, absYOuter - cornerStart);
            const dx = Math.sqrt(Math.max(0, cornerR * cornerR - dy * dy));
            return Math.max(12, 2 * (cornerStart + dx) * 0.94);
        }
        return Math.max(12, half * 2 * 0.94);
    }

    // Polygon intersection for hexagon, octagon, shield
    if (typeof buildShape2DContour === 'function') {
        const pts = buildShape2DContour(shapeType, effectiveSize, invertShield).getPoints(48);
        const widthAtY = (yTest) => {
            const xs = [];
            for (let i = 0; i < pts.length; i++) {
                const a = pts[i];
                const b = pts[(i + 1) % pts.length];
                if ((a.y <= yTest && b.y > yTest) || (b.y <= yTest && a.y > yTest)) {
                    const t = (yTest - a.y) / (b.y - a.y);
                    xs.push(a.x + t * (b.x - a.x));
                }
            }
            if (xs.length < 2) return effectiveSize * 0.3;
            return Math.max(8, (Math.max(...xs) - Math.min(...xs)) - rimMarginMm * 2);
        };
        const sign = yPosMm >= 0 ? 1 : -1;
        const w1 = widthAtY(sign * absYOuter);
        const w2 = widthAtY(sign * absYInner);
        return Math.max(12, Math.min(effectiveSize * 0.84, Math.min(w1, w2) * 0.92));
    }

    return effectiveSize * 0.72;
}

/**
 * Clamps text Y offset so text NEVER collides with the QR window OR crosses outside the coaster edge!
 */
function clampSafeTextOffset(rawOffsetMm, qrHalfMm, coasterOuterHalfMm, textHeightMm, rimMarginMm = 3.5) {
    const minSafe = qrHalfMm + textHeightMm * 0.5 + 1.4;
    const maxSafe = Math.max(minSafe, coasterOuterHalfMm - rimMarginMm - textHeightMm * 0.5);
    return Math.max(minSafe, Math.min(maxSafe, rawOffsetMm));
}

// Preload default font in background when script loads
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => loadVectorFont(activeVectorFontId), 120);
    });
}
