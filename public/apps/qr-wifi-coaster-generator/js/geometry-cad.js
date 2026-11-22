// ==========================================
// WATERTIGHT ZERO-OVERLAP PARAMETRIC 3D CAD GEOMETRY ENGINE (V2)
// Supports: 10 Shapes, Zero-Overlap 2D-Cutout Flush/FaceDown/Debossed,
// White Quiet-Zone Backplate, 16-Case Connected QR, Finder Eyes,
// True Vector Typography, Sealed Internal NFC, Magnet Pockets,
// Shape-Matched Caddy, Table Tent A-Frame, WebGL Layer Slice & Volume/Weight Estimator
// ==========================================

let printStyle = 'flush'; // 'flush' | 'embossed' | 'debossed'
let debossHollow = false;
let isFaceDownMode = false;
let useWhiteQuietZone = false;
let currentShape = 'circle'; // 'circle' | 'squircle' | 'hexagon' | 'octagon' | 'shield' | 'keychain' | 'stand' | 'tent' | 'magnet' | 'caddy'
let lastCoasterShape = 'circle';
let textLayoutStyle = 'straight'; // 'straight' | 'curved'
let nfcMode = 'open'; // 'open' | 'sealed'

let lastFaceLayouts = { A: null, B: null };
let lastModelMetrics = {
    widthMm: 100,
    depthMm: 100,
    heightMm: 3.2,
    triangles: 0,
    gramsTotal: 0,
    gramsByPart: { base: 0, quiet: 0, qr: 0, accent: 0 },
    estMinutes: 0,
    swapInfo: ''
};

let layerSliceEnabled = false;
let layerSliceHeightMm = 999;
let layerSlicePlane = null;

// ==========================================
// GPU MEMORY CLEANUP (ZERO VRAM LEAKS!)
// ==========================================

function disposeObject3D(root) {
    if (!root) return;
    root.traverse((obj) => {
        if (obj.geometry && typeof obj.geometry.dispose === 'function') {
            obj.geometry.dispose();
        }
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(m => { if (m && typeof m.dispose === 'function') m.dispose(); });
            } else if (typeof obj.material.dispose === 'function') {
                obj.material.dispose();
            }
        }
    });
}

function mergeSimpleBufferGeometries(geoms) {
    const valid = geoms.filter(Boolean);
    if (valid.length === 0) return null;
    const nonIndexed = [];
    for (let i = 0; i < valid.length; i++) {
        const g = valid[i];
        const ni = g.index ? g.toNonIndexed() : g;
        if (ni && ni.attributes && ni.attributes.position && ni.attributes.position.count > 0) {
            nonIndexed.push({ src: g, ni, owned: ni !== g });
        }
    }
    if (nonIndexed.length === 0) return null;

    let totalVerts = 0;
    for (const item of nonIndexed) totalVerts += item.ni.attributes.position.count;
    if (totalVerts === 0) return null;

    const positions = new Float32Array(totalVerts * 3);
    const normals = new Float32Array(totalVerts * 3);
    let offset = 0;

    for (const item of nonIndexed) {
        const g = item.ni;
        const pos = g.attributes.position;
        if (!g.attributes.normal) g.computeVertexNormals();
        const norm = g.attributes.normal;
        positions.set(pos.array, offset * 3);
        if (norm) normals.set(norm.array, offset * 3);
        offset += pos.count;
        if (item.owned) g.dispose();
    }

    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    merged.computeBoundingBox();
    return merged;
}

function alignGeomBottomY(geom, minTargetY = 0) {
    if (!geom) return null;
    geom.computeBoundingBox();
    if (!geom.boundingBox) return geom;
    const dy = minTargetY - geom.boundingBox.min.y;
    if (Math.abs(dy) > 1e-6) geom.translate(0, dy, 0);
    geom.computeBoundingBox();
    return geom;
}

function extrude2DShapesToY(shapes, yBottom, depth, curveSegments = 20) {
    if (!shapes || shapes.length === 0 || depth <= 0.005) return null;
    const g = new THREE.ExtrudeGeometry(shapes, {
        depth: Math.max(0.05, depth),
        bevelEnabled: false,
        curveSegments
    });
    g.rotateX(Math.PI / 2);
    return alignGeomBottomY(g, yBottom);
}

// ==========================================
// 2D CONTOURS (ALL SHAPES + BEVEL SHRINK COMPENSATION)
// ==========================================

function buildShape2DContour(shapeType, size, invertShield = false, shrinkMm = 0) {
    const s = Math.max(10, size - shrinkMm * 2);
    const half = s / 2;
    const shape = new THREE.Shape();

    if (shapeType === 'circle' || shapeType === 'keychain') {
        shape.absarc(0, 0, half, 0, Math.PI * 2, false);
        return shape;
    }

    if (shapeType === 'squircle' || shapeType === 'stand' || shapeType === 'tent' || shapeType === 'magnet') {
        const r = s * 0.14;
        const x = -half, y = -half;
        shape.moveTo(x + r, y);
        shape.lineTo(x + s - r, y);
        shape.quadraticCurveTo(x + s, y, x + s, y + r);
        shape.lineTo(x + s, y + s - r);
        shape.quadraticCurveTo(x + s, y + s, x + s - r, y + s);
        shape.lineTo(x + r, y + s);
        shape.quadraticCurveTo(x, y + s, x, y + s - r);
        shape.lineTo(x, y + r);
        shape.quadraticCurveTo(x, y, x + r, y);
        return shape;
    }

    if (shapeType === 'hexagon' || shapeType === 'octagon') {
        const sides = shapeType === 'hexagon' ? 6 : 8;
        const offsetAng = shapeType === 'hexagon' ? 0 : Math.PI / 8;
        for (let i = 0; i < sides; i++) {
            const a = offsetAng + (i * Math.PI * 2) / sides;
            const px = Math.cos(a) * half;
            const py = Math.sin(a) * half;
            if (i === 0) shape.moveTo(px, py);
            else shape.lineTo(px, py);
        }
        shape.closePath();
        return shape;
    }

    if (shapeType === 'shield') {
        const w = s * 0.9, h = s;
        const hw = w / 2;
        const cr = Math.min(8, w * 0.09);
        if (!invertShield) {
            shape.moveTo(-hw + cr, -h * 0.44);
            shape.lineTo(hw - cr, -h * 0.44);
            shape.quadraticCurveTo(hw, -h * 0.44, hw, -h * 0.44 + cr);
            shape.lineTo(hw, 0);
            shape.quadraticCurveTo(hw, h * 0.35, 0, h * 0.48);
            shape.quadraticCurveTo(-hw, h * 0.35, -hw, 0);
            shape.lineTo(-hw, -h * 0.44 + cr);
            shape.quadraticCurveTo(-hw, -h * 0.44, -hw + cr, -h * 0.44);
        } else {
            shape.moveTo(0, -h * 0.48);
            shape.quadraticCurveTo(hw, -h * 0.35, hw, 0);
            shape.lineTo(hw, h * 0.44 - cr);
            shape.quadraticCurveTo(hw, h * 0.44, hw - cr, h * 0.44);
            shape.lineTo(-hw + cr, h * 0.44);
            shape.quadraticCurveTo(-hw, h * 0.44, -hw, h * 0.44 - cr);
            shape.lineTo(-hw, 0);
            shape.quadraticCurveTo(-hw, -h * 0.35, 0, -h * 0.48);
        }
        return shape;
    }

    shape.absarc(0, 0, half, 0, Math.PI * 2, false);
    return shape;
}

function createKeychainShapeWithHole(size, shrinkMm = 0) {
    const R = Math.max(8, size / 2 - shrinkMm);
    const rLug = Math.max(5.0, (size / 2) * 0.24 - shrinkMm);
    const rHole = Math.max(2.2, (size / 2) * 0.24 * 0.48);
    const lugY = -((size / 2) + (size / 2) * 0.24 * 0.55);

    const yInt = (R * R + lugY * lugY - rLug * rLug) / (2 * lugY);
    const xInt = Math.sqrt(Math.max(0.25, R * R - yInt * yInt));

    // Both arcs strictly CCW (aClockwise = false):
    // 1. Main circle sweeps 334° from right junction -> bottom -> left junction
    // 2. Top lug sweeps 244° from left junction -> outer top tip (-Y) -> right junction
    const shape = new THREE.Shape();
    shape.moveTo(xInt, yInt);
    shape.absarc(0, 0, R, Math.atan2(yInt, xInt), Math.atan2(yInt, -xInt), false);
    shape.absarc(0, lugY, rLug, Math.atan2(yInt - lugY, -xInt), Math.atan2(yInt - lugY, xInt), false);
    shape.closePath();

    const hole = new THREE.Path();
    hole.absarc(0, lugY, rHole, 0, Math.PI * 2, true);
    shape.holes.push(hole);

    return { shape, holeCenterY: lugY, holeCenterZ: lugY, holeRadius: rHole };
}

function getOuterContourPoints2D(shapeType, size, invertShield = false, shrinkMm = 0) {
    if (shapeType === 'keychain') {
        const kh = createKeychainShapeWithHole(size, shrinkMm);
        return deduplicateClosedRing(kh.shape.getPoints(36).map(p => ({ x: p.x, y: p.y })));
    }
    const divs = (shapeType === 'hexagon' || shapeType === 'octagon') ? 1 : (shapeType === 'squircle' || shapeType === 'stand' || shapeType === 'tent' || shapeType === 'magnet' ? 10 : 56);
    const pts = buildShape2DContour(shapeType, size, invertShield, shrinkMm).getPoints(divs);
    return deduplicateClosedRing(pts.map(p => ({ x: p.x, y: p.y })));
}

function makeFreshOuterShape(shapeType, size, invertShield = false, shrinkMm = 0) {
    if (shapeType === 'keychain') {
        return createKeychainShapeWithHole(size, shrinkMm).shape;
    }
    const pts = ensureWinding(getOuterContourPoints2D(shapeType, size, invertShield, shrinkMm), true);
    return new THREE.Shape(pts.map(p => new THREE.Vector2(p.x, p.y)));
}

// ==========================================
// BASE SLAB + HARDWARE POCKETS (RUBBER FEET, MAGNETS, OPEN/SEALED NFC)
// ==========================================

function getPocketPositions(shapeType, size, pocketRadius) {
    const factor = (shapeType === 'shield') ? 0.20 : 0.25;
    const pDist = Math.min(size * factor, (size * 0.5) - pocketRadius - 5.0);
    return [[-pDist, -pDist], [pDist, -pDist], [pDist, pDist], [-pDist, pDist]];
}

function addCircularHoleCW(shape, cx, cy, r) {
    const hole = new THREE.Path();
    hole.absarc(cx, cy, r, 0, Math.PI * 2, true);
    shape.holes.push(hole);
}

/**
 * Watertight multi-slice base slab builder with ZERO internal overlap:
 * Supports Rubber Feet (4x Ø8×0.6mm), Neodymium Magnets (4x Ø8.2×2.2mm),
 * Open NFC (Ø25.4×0.8mm) AND Sealed Internal NFC Cavity (Ø25.4mm enclosed [0.8..1.6mm]!).
 */
function buildSolidSlabGeometry(shapeType, size, totalHeight, invertShield = false, useBevel = true, hardware = null) {
    const allowPockets = !!(hardware && shapeType !== 'stand' && shapeType !== 'tent' && shapeType !== 'caddy' && size >= 46);
    const wantFeet = allowPockets && !!hardware.rubberFeet && totalHeight >= 1.2 && size >= 48;
    const wantMagnets = allowPockets && !!hardware.magnetPockets && totalHeight >= 2.6 && size >= 52;
    const wantNfcOpen = allowPockets && !!hardware.nfcPocket && hardware.nfcMode !== 'sealed' && totalHeight >= 1.4;
    const wantNfcSealed = allowPockets && !!hardware.nfcPocket && hardware.nfcMode === 'sealed' && totalHeight >= 2.2;

    const anyPocket = wantFeet || wantMagnets || wantNfcOpen || wantNfcSealed;

    if (!anyPocket) {
        const bevel = (useBevel && (shapeType === 'squircle' || shapeType === 'shield' || shapeType === 'keychain' || shapeType === 'stand' || shapeType === 'magnet'))
            ? Math.min(0.45, totalHeight * 0.18)
            : 0;
        const coreDepth = Math.max(0.2, totalHeight - 2 * bevel);
        const shape = makeFreshOuterShape(shapeType, size, invertShield, bevel);
        const geom = new THREE.ExtrudeGeometry(shape, {
            depth: coreDepth,
            bevelEnabled: bevel > 0,
            bevelSegments: 2,
            bevelSize: bevel,
            bevelThickness: bevel,
            curveSegments: 40
        });
        geom.rotateX(Math.PI / 2);
        return {
            geom: alignGeomBottomY(geom, 0),
            carved: { feet: false, magnets: false, nfcOpen: false, nfcSealed: false, nfcPauseZ: 0 }
        };
    }

    // Build exact non-overlapping horizontal Z-band breakpoints
    const cutsSet = new Set([0, totalHeight]);
    const feetDepth = 0.6;
    const magDepth = 2.2;
    const nfcOpenDepth = 0.8;
    const nfcSealedBot = 0.8;
    const nfcSealedTop = Math.min(totalHeight - 0.5, 1.6);

    if (wantFeet) cutsSet.add(feetDepth);
    if (wantMagnets) cutsSet.add(magDepth);
    if (wantNfcOpen) cutsSet.add(nfcOpenDepth);
    if (wantNfcSealed) {
        cutsSet.add(nfcSealedBot);
        cutsSet.add(nfcSealedTop);
    }

    const cuts = Array.from(cutsSet).filter(z => z >= 0 && z <= totalHeight + 1e-6).sort((a, b) => a - b);
    const sliceGeoms = [];

    for (let i = 0; i < cuts.length - 1; i++) {
        const y0 = cuts[i];
        const y1 = cuts[i + 1];
        const h = y1 - y0;
        if (h < 0.02) continue;
        const yMid = (y0 + y1) * 0.5;

        const sliceShape = makeFreshOuterShape(shapeType, size, invertShield, 0);

        // Magnets supersede rubber feet at the 4 corners if both are checked
        if (wantMagnets && yMid < magDepth) {
            getPocketPositions(shapeType, size, 4.1).forEach(([px, py]) => addCircularHoleCW(sliceShape, px, py, 4.1));
        } else if (wantFeet && yMid < feetDepth) {
            getPocketPositions(shapeType, size, 4.0).forEach(([px, py]) => addCircularHoleCW(sliceShape, px, py, 4.0));
        }

        if (wantNfcOpen && yMid < nfcOpenDepth) {
            addCircularHoleCW(sliceShape, 0, 0, 12.7);
        } else if (wantNfcSealed && yMid > nfcSealedBot && yMid < nfcSealedTop) {
            addCircularHoleCW(sliceShape, 0, 0, 12.7);
        }

        const sg = extrude2DShapesToY([sliceShape], y0, h, 36);
        if (sg) sliceGeoms.push(sg);
    }

    const merged = mergeSimpleBufferGeometries(sliceGeoms);
    sliceGeoms.forEach(g => g.dispose());

    return {
        geom: merged,
        carved: {
            feet: wantFeet && !wantMagnets,
            magnets: wantMagnets,
            nfcOpen: wantNfcOpen,
            nfcSealed: wantNfcSealed,
            nfcPauseZ: wantNfcSealed ? nfcSealedTop : 0
        }
    };
}

/**
 * Universal Drip Lip (condensation rim) for coasters (auto-disabled on keychain, stand, tent, caddy, magnet).
 */
function buildDripLipGeometry(shapeType, size, baseThick, lipH, invertShield = false, rimWidth = 3.5) {
    if (lipH <= 0.05 || shapeType === 'stand' || shapeType === 'tent' || shapeType === 'caddy' || shapeType === 'keychain' || shapeType === 'magnet') {
        return null;
    }

    const outerPts = ensureWinding(getOuterContourPoints2D(shapeType, size, invertShield, 0), true);
    const outerShape = new THREE.Shape(outerPts.map(p => new THREE.Vector2(p.x, p.y)));
    const innerPts = ensureWinding(getOuterContourPoints2D(shapeType, size, invertShield, rimWidth), false);
    outerShape.holes.push(new THREE.Path(innerPts.map(p => new THREE.Vector2(p.x, p.y))));

    return extrude2DShapesToY([outerShape], baseThick, lipH, 36);
}

/**
 * Subtle Anti-Stick Condensation Micro-Grooves (breaks wet glass vacuum suction!).
 */
function buildAntiStickGroovesGeometry(shapeType, size, yBase, qrHalf, hasDripLip) {
    if (shapeType === 'stand' || shapeType === 'tent' || shapeType === 'caddy' || shapeType === 'keychain' || shapeType === 'magnet') {
        return null;
    }
    const rInner = Math.hypot(qrHalf, qrHalf) + 2.5;
    const rOuter = (size * 0.5) - (hasDripLip ? 5.2 : 3.2);
    if (rOuter - rInner < 3.5) return null;

    const grooveGeoms = [];
    const angles = [0.22, 0.78, 1.35, 1.79, 2.36, 2.92, 3.36, 3.92, 4.49, 4.93, 5.50, 6.06];
    for (const a of angles) {
        const len = rOuter - rInner;
        const rMid = (rInner + rOuter) * 0.5;
        const g = new THREE.BoxGeometry(len, 0.35, 1.1);
        g.rotateY(-a);
        g.translate(Math.cos(a) * rMid, yBase + 0.175, Math.sin(a) * rMid);
        grooveGeoms.push(g);
    }
    const merged = mergeSimpleBufferGeometries(grooveGeoms);
    grooveGeoms.forEach(g => g.dispose());
    return merged;
}

// ==========================================
// EXACT ZERO-OVERLAP QR & FINDER EYE 2D SHAPE ENGINE
// ==========================================

function makeRectRingCCW(x0, y0, x1, y1) {
    return [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
}

function makeRoundedRectRing(x0, y0, x1, y1, rTL, rTR, rBR, rBL, segs = 5) {
    const pts = [];
    const addArc = (cx, cy, r, a0, a1) => {
        for (let i = 0; i <= segs; i++) {
            const a = a0 + ((a1 - a0) * i) / segs;
            pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
        }
    };
    if (rTL > 1e-4) addArc(x0 + rTL, y0 + rTL, rTL, Math.PI, Math.PI * 1.5);
    else pts.push({ x: x0, y: y0 });

    if (rTR > 1e-4) addArc(x1 - rTR, y0 + rTR, rTR, Math.PI * 1.5, Math.PI * 2);
    else pts.push({ x: x1, y: y0 });

    if (rBR > 1e-4) addArc(x1 - rBR, y1 - rBR, rBR, 0, Math.PI * 0.5);
    else pts.push({ x: x1, y: y1 });

    if (rBL > 1e-4) addArc(x0 + rBL, y1 - rBL, rBL, Math.PI * 0.5, Math.PI);
    else pts.push({ x: x0, y: y1 });

    return deduplicateClosedRing(pts);
}

function makeCircleRing(cx, cy, r, segs = 16) {
    const pts = [];
    for (let i = 0; i < segs; i++) {
        const a = (i * Math.PI * 2) / segs;
        pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
    return pts;
}

/**
 * Generates exact, ZERO-OVERLAP 2D vector shapes for:
 *  - qrShapes (dark modules + styled finder eyes)
 *  - bgShapes (light modules + exact complementary dot/connected/finder spandrels + badge collar with icon hole!)
 *  - badgeShapes (center icon vector shapes)
 * Guarantees Union = Exact QR Window Square, Intersection = EMPTY SET!
 */
function buildQRFaceVectorDecomposition({
    matrix,
    qrAreaSize,
    pixelStyle,
    finderStyle,
    badge,
    badgeScaleVal,
    customImg,
    customThresh,
    customInv
}) {
    const M = matrix.length;
    if (M === 0) return { qrShapes: [], bgShapes: [], badgeShapes: [], badgeSquare: null };

    const cell = qrAreaSize / M;
    const start = -qrAreaSize / 2;
    const qrShapes = [];
    const bgShapes = [];
    let badgeShapes = [];
    let badgeSquare = null;

    // 1. Determine grid-aligned center badge box (if badge active) so collar + icon have ZERO overlap!
    let bMin = -1, bMax = -1;
    if (badge && badge !== 'none') {
        const center = (M - 1) / 2;
        // Find largest contiguous odd square around center whose cells are ALL false (cleared)
        let maxHalf = 0;
        const maxPossible = Math.floor(M * 0.19 * (badgeScaleVal || 1.0));
        for (let h = 1; h <= maxPossible; h++) {
            const r0 = Math.floor(center - h + 0.5);
            const r1 = Math.ceil(center + h - 0.5);
            let allClear = true;
            for (let r = r0; r <= r1 && allClear; r++) {
                for (let c = r0; c <= r1; c++) {
                    if (r < 0 || r >= M || c < 0 || c >= M || matrix[r][c] || isFinderModule(r, c, M)) {
                        allClear = false;
                        break;
                    }
                }
            }
            if (allClear) { maxHalf = h; bMin = r0; bMax = r1; }
            else break;
        }
        if (bMin >= 0 && bMax >= bMin) {
            const bx0 = start + bMin * cell;
            const by0 = start + bMin * cell;
            const bx1 = start + (bMax + 1) * cell;
            const by1 = start + (bMax + 1) * cell;
            const boxDim = bx1 - bx0;
            badgeSquare = { x0: bx0, y0: by0, x1: bx1, y1: by1, cx: (bx0 + bx1) * 0.5, cy: (by0 + by1) * 0.5, dim: boxDim };

            const rawBadge = buildBadgeVectorShapes(badge, boxDim * 0.82, customImg, customThresh, customInv);
            // Translate into badgeSquare center (usually ~0,0) and keep strictly inside box with 0.35mm margin
            const pad = Math.min(0.6, boxDim * 0.06);
            badgeShapes = rawBadge.map(s => ({
                outer: s.outer.map(p => ({ x: p.x + badgeSquare.cx, y: p.y + badgeSquare.cy })),
                holes: s.holes.map(h => h.map(p => ({ x: p.x + badgeSquare.cx, y: p.y + badgeSquare.cy })))
            })).filter(s => {
                const bb = getRingBBox(s.outer);
                return bb.minX > bx0 + pad && bb.maxX < bx1 - pad && bb.minY > by0 + pad && bb.maxY < by1 - pad;
            });

            // Badge backing plate = exact badgeSquare with badge icon outers punched as holes!
            const collarHoles = badgeShapes.map(s => ensureWinding(s.outer, false));
            bgShapes.push({
                outer: makeRectRingCCW(bx0, by0, bx1, by1),
                holes: collarHoles
            });
            // Restore icon counter-holes (e.g., inside Instagram camera lens or Airbnb door) as solid BG islands!
            for (const s of badgeShapes) {
                for (const h of s.holes) {
                    bgShapes.push({ outer: ensureWinding(h, true), holes: [] });
                }
            }
        }
    }

    const inBadgeBox = (r, c) => (bMin >= 0 && r >= bMin && r <= bMax && c >= bMin && c <= bMax);

    // 2. Three Finder Patterns (7x7 each) with exact complementary BG fill!
    const finderOrigins = [[0, 0], [M - 7, 0], [0, M - 7]];
    for (const [fc, fr] of finderOrigins) {
        const fx0 = start + fc * cell;
        const fy0 = start + fr * cell;
        const fx1 = fx0 + 7 * cell;
        const fy1 = fy0 + 7 * cell;
        const cx = (fx0 + fx1) * 0.5;
        const cy = (fy0 + fy1) * 0.5;

        if (finderStyle === 'circle') {
            const outerDark = makeCircleRing(cx, cy, 3.5 * cell, 28);
            const midLight = makeCircleRing(cx, cy, 2.5 * cell, 24);
            const coreDark = makeCircleRing(cx, cy, 1.5 * cell, 20);
            qrShapes.push({ outer: ensureWinding(outerDark, true), holes: [ensureWinding(midLight, false)] });
            qrShapes.push({ outer: ensureWinding(coreDark, true), holes: [] });
            bgShapes.push({ outer: makeRectRingCCW(fx0, fy0, fx1, fy1), holes: [ensureWinding(outerDark, false)] });
            bgShapes.push({ outer: ensureWinding(midLight, true), holes: [ensureWinding(coreDark, false)] });
        } else if (finderStyle === 'rounded') {
            const outerDark = makeRoundedRectRing(fx0, fy0, fx1, fy1, cell * 1.55, cell * 1.55, cell * 1.55, cell * 1.55, 6);
            const midLight = makeRoundedRectRing(fx0 + cell, fy0 + cell, fx1 - cell, fy1 - cell, cell * 1.0, cell * 1.0, cell * 1.0, cell * 1.0, 5);
            const coreDark = makeRoundedRectRing(fx0 + 2 * cell, fy0 + 2 * cell, fx1 - 2 * cell, fy1 - 2 * cell, cell * 0.7, cell * 0.7, cell * 0.7, cell * 0.7, 5);
            qrShapes.push({ outer: ensureWinding(outerDark, true), holes: [ensureWinding(midLight, false)] });
            qrShapes.push({ outer: ensureWinding(coreDark, true), holes: [] });
            bgShapes.push({ outer: makeRectRingCCW(fx0, fy0, fx1, fy1), holes: [ensureWinding(outerDark, false)] });
            bgShapes.push({ outer: ensureWinding(midLight, true), holes: [ensureWinding(coreDark, false)] });
        } else {
            const outerDark = makeRectRingCCW(fx0, fy0, fx1, fy1);
            const midLight = makeRectRingCCW(fx0 + cell, fy0 + cell, fx1 - cell, fy1 - cell);
            const coreDark = makeRectRingCCW(fx0 + 2 * cell, fy0 + 2 * cell, fx1 - 2 * cell, fy1 - 2 * cell);
            qrShapes.push({ outer: outerDark, holes: [ensureWinding(midLight, false)] });
            qrShapes.push({ outer: coreDark, holes: [] });
            bgShapes.push({ outer: midLight, holes: [ensureWinding(coreDark, false)] });
        }
    }

    // 3. Data Modules (excluding 7x7 finder cores and center badgeBox)
    // Light cells merged cleanly by exact horizontal runs (ZERO 1.002 overlap bloat!)
    for (let r = 0; r < M; r++) {
        let lightStart = -1;
        let darkStart = -1;
        for (let c = 0; c <= M; c++) {
            const validCell = (c < M) && !isFinderPatternCore(r, c, M) && !inBadgeBox(r, c);
            const isDark = validCell && !!matrix[r][c];
            const isLight = validCell && !matrix[r][c];

            // Light run flushing
            if (isLight && lightStart === -1) {
                lightStart = c;
            } else if (!isLight && lightStart !== -1) {
                bgShapes.push({
                    outer: makeRectRingCCW(start + lightStart * cell, start + r * cell, start + c * cell, start + (r + 1) * cell),
                    holes: []
                });
                lightStart = -1;
            }

            // Dark modules
            if (pixelStyle === 'square') {
                if (isDark && darkStart === -1) {
                    darkStart = c;
                } else if (!isDark && darkStart !== -1) {
                    qrShapes.push({
                        outer: makeRectRingCCW(start + darkStart * cell, start + r * cell, start + c * cell, start + (r + 1) * cell),
                        holes: []
                    });
                    darkStart = -1;
                }
            } else if (isDark) {
                const x0 = start + c * cell;
                const y0 = start + r * cell;
                const x1 = x0 + cell;
                const y1 = y0 + cell;

                if (pixelStyle === 'dots') {
                    const dotRing = makeCircleRing((x0 + x1) * 0.5, (y0 + y1) * 0.5, cell * 0.43, 14);
                    qrShapes.push({ outer: ensureWinding(dotRing, true), holes: [] });
                    // Exact complementary square minus dot hole -> ZERO air pinholes in Flush / Face-Down!
                    bgShapes.push({
                        outer: makeRectRingCCW(x0, y0, x1, y1),
                        holes: [ensureWinding(dotRing, false)]
                    });
                } else {
                    // 16-case Connected Fluid: round exposed outer corners where neither orthogonal neighbor is dark
                    const n = r > 0 && matrix[r - 1][c] && !isFinderPatternCore(r - 1, c, M) && !inBadgeBox(r - 1, c);
                    const s = r + 1 < M && matrix[r + 1][c] && !isFinderPatternCore(r + 1, c, M) && !inBadgeBox(r + 1, c);
                    const w = c > 0 && matrix[r][c - 1] && !isFinderPatternCore(r, c - 1, M) && !inBadgeBox(r, c - 1, M);
                    const e = c + 1 < M && matrix[r][c + 1] && !isFinderPatternCore(r, c + 1, M) && !inBadgeBox(r, c + 1, M);
                    const rad = cell * 0.42;
                    const rTL = (!n && !w) ? rad : 0;
                    const rTR = (!n && !e) ? rad : 0;
                    const rBR = (!s && !e) ? rad : 0;
                    const rBL = (!s && !w) ? rad : 0;

                    const cellRing = makeRoundedRectRing(x0, y0, x1, y1, rTL, rTR, rBR, rBL, 5);
                    qrShapes.push({ outer: ensureWinding(cellRing, true), holes: [] });

                    // Exact corner spandrels for complementary BG fill (ZERO air gaps!)
                    const pushSpandrel = (cx, cy, cornerX, cornerY, a0, a1) => {
                        const pts = [{ x: cornerX, y: cornerY }];
                        const segs = 5;
                        for (let i = 0; i <= segs; i++) {
                            const a = a0 + ((a1 - a0) * i) / segs;
                            pts.push({ x: cx + Math.cos(a) * rad, y: cy + Math.sin(a) * rad });
                        }
                        const clean = deduplicateClosedRing(pts);
                        if (clean.length >= 3) bgShapes.push({ outer: ensureWinding(clean, true), holes: [] });
                    };
                    if (rTL > 0) pushSpandrel(x0 + rad, y0 + rad, x0, y0, Math.PI * 1.5, Math.PI);
                    if (rTR > 0) pushSpandrel(x1 - rad, y0 + rad, x1, y0, Math.PI * 2, Math.PI * 1.5);
                    if (rBR > 0) pushSpandrel(x1 - rad, y1 - rad, x1, y1, Math.PI * 0.5, 0);
                    if (rBL > 0) pushSpandrel(x0 + rad, y1 - rad, x0, y1, Math.PI, Math.PI * 0.5);
                }
            }
        }
    }

    return { qrShapes, bgShapes, badgeShapes, badgeSquare };
}

// ==========================================
// FACE ASSEMBLY BUILDER (TRUE ZERO-OVERLAP FLUSH / DEBOSSED / EMBOSSED)
// ==========================================

function isRingStrictlyInsideCoasterAndOutsideWindow(ring, outerContourPts, windowHalf) {
    const bb = getRingBBox(ring);
    const padWin = windowHalf + 0.2;
    // Reject if overlaps QR window square
    if (bb.maxX > -padWin && bb.minX < padWin && bb.maxY > -padWin && bb.minY < padWin) {
        for (let i = 0; i < ring.length; i++) {
            const p = ring[i];
            if (Math.abs(p.x) <= padWin && Math.abs(p.y) <= padWin) return false;
        }
    }
    // Check all vertices are strictly inside outer coaster contour
    for (let i = 0; i < ring.length; i++) {
        if (!pointInPolygon2D(ring[i], outerContourPts)) return false;
    }
    return true;
}

function buildFaceAssembly({
    sideState,
    shapeType,
    effectiveSize,
    qrAreaSize,
    baseThick,
    reliefH,
    styleMode,
    inlayDepth,
    invertShield,
    hasDripLip,
    baseMat,
    quietMat,
    qrMat,
    accentMat,
    targetBaseGroup,
    targetQuietGroup,
    targetQrGroup,
    targetTextGroup,
    targetBadgeGroup,
    isBottomFace = false,
    parentTransform = null
}) {
    const matrix = sideState.qrMatrix || [];
    const M = matrix.length || 25;
    const topTextStr = (sideState.topText || '').trim();
    const bottomTextStr = (sideState.bottomText || '').trim();
    const badge = sideState.badge || 'none';
    const bScale = sideState.badgeScale || 1.0;
    const cImg = sideState.customBadgeImg || null;
    const cThresh = sideState.customLogoThreshold || 150;
    const cInv = !!sideState.customLogoInvert;

    const faceBaseGroup = new THREE.Group();
    const faceQuietGroup = new THREE.Group();
    const faceQrGroup = new THREE.Group();
    const faceTextGroup = new THREE.Group();
    const faceBadgeGroup = new THREE.Group();

    // Asymmetric shapes (keychain, shield) flip horizontally (around Z-axis in 3D, i.e., Y-axis in coaster face)
    // Wait: in 3D coaster lies in XZ plane with top at -Z and bottom at +Z.
    // Flipping around Z axis (rotation.z = Math.PI) maps (x, y, z) -> (-x, -y, +z):
    //   - Top (-Z, keychain hole / shield flat bar) STAYS at Top (-Z)!
    //   - Facing bottom (-Y) looking up: +X becomes left, -X becomes right -> text reads RIGHT-SIDE UP left-to-right!
    const flipHoriz = (isBottomFace && (shapeType === 'keychain' || shapeType === 'shield'));

    const applyFaceTransform = (grp) => {
        if (isBottomFace) {
            if (flipHoriz) {
                grp.rotation.z = Math.PI;
                grp.position.y = baseThick;
            } else {
                grp.rotation.x = Math.PI;
                grp.position.y = baseThick;
            }
        }
        if (parentTransform) {
            const outer = new THREE.Group();
            if (parentTransform.pos) outer.position.copy(parentTransform.pos);
            if (parentTransform.rotY) outer.rotation.y = parentTransform.rotY;
            if (parentTransform.rotX) {
                const inner = new THREE.Group();
                inner.rotation.x = parentTransform.rotX;
                inner.add(grp);
                outer.add(inner);
            } else {
                outer.add(grp);
            }
            return outer;
        }
        return grp;
    };

    // Quiet-Zone backplate dimensions
    const qzMargin = useWhiteQuietZone ? Math.max(2.0, (qrAreaSize / M) * 1.45) : 0;
    const maxWindow = effectiveSize * 0.72;
    const windowSize = useWhiteQuietZone ? Math.min(maxWindow, qrAreaSize + qzMargin * 2) : qrAreaSize;
    const windowHalf = windowSize * 0.5;
    const qrHalf = qrAreaSize * 0.5;

    // 1. Decompose QR + Center Badge into strictly disjoint 2D vector shapes
    const decomp = buildQRFaceVectorDecomposition({
        matrix,
        qrAreaSize,
        pixelStyle: qrPixelStyle,
        finderStyle: qrFinderStyle,
        badge,
        badgeScaleVal: bScale,
        customImg: cImg,
        customThresh: cThresh,
        customInv: cInv
    });

    // 2. Build True Vector Typography with automatic chord-width & quiet-zone clamping!
    const scaleRatio = effectiveSize / 100;
    const effTextSize = (sideState.textSize || 8.0) * (shapeType === 'keychain' ? 0.70 : 1.0);
    const rimMargin = (hasDripLip ? 4.8 : 2.6);
    const outerHalfForClamp = (shapeType === 'shield') ? effectiveSize * 0.43 : effectiveSize * 0.5;

    const safeTopOffset = clampSafeTextOffset((sideState.topOffset || 38) * scaleRatio, windowHalf, outerHalfForClamp, effTextSize, rimMargin);
    const safeBotOffset = clampSafeTextOffset((sideState.bottomOffset || 38) * scaleRatio, windowHalf, outerHalfForClamp, effTextSize, rimMargin);

    const canCurve = (textLayoutStyle === 'curved' && (shapeType === 'circle' || shapeType === 'octagon' || shapeType === 'hexagon'));
    let topTextShapes = [];
    let botTextShapes = [];

    if (topTextStr) {
        if (canCurve) {
            const safeR = Math.min(effectiveSize * 0.5 - rimMargin - effTextSize * 0.55, Math.max(windowHalf * 1.12 + effTextSize * 0.55, safeTopOffset));
            topTextShapes = buildCurvedTextVectorShapes(topTextStr, safeR, effTextSize, false, activeVectorFontId);
        } else {
            const maxW = computeSafeStraightTextWidth(shapeType, effectiveSize, -safeTopOffset, effTextSize, rimMargin, invertShield);
            topTextShapes = buildStraightTextVectorShapes(topTextStr, maxW, effTextSize, -safeTopOffset, activeVectorFontId);
        }
    }

    if (bottomTextStr) {
        if (canCurve) {
            const safeR = Math.min(effectiveSize * 0.5 - rimMargin - effTextSize * 0.55, Math.max(windowHalf * 1.12 + effTextSize * 0.55, safeBotOffset));
            botTextShapes = buildCurvedTextVectorShapes(bottomTextStr, safeR, effTextSize, true, activeVectorFontId);
        } else {
            const maxW = computeSafeStraightTextWidth(shapeType, effectiveSize, safeBotOffset, effTextSize, rimMargin, invertShield);
            botTextShapes = buildStraightTextVectorShapes(bottomTextStr, maxW, effTextSize, safeBotOffset, activeVectorFontId);
        }
    }

    const allTextShapes = topTextShapes.concat(botTextShapes);

    // 3. Extrude into 3D with ZERO volumetric overlap!
    const yLayerBottom = (styleMode === 'embossed') ? baseThick : (baseThick - inlayDepth);
    const effectiveH = (styleMode === 'embossed') ? reliefH : inlayDepth;

    if (styleMode === 'flush' || styleMode === 'debossed') {
        // A. Build perforated Top Rim of Base Slab (with QR Window + ALL Text glyph holes punched cleanly!)
        const outerShape = makeFreshOuterShape(shapeType, effectiveSize, invertShield, 0);
        const safeOuterPts = getOuterContourPoints2D(shapeType, effectiveSize, invertShield, 0.45);

        // Punch QR/QuietZone window hole (CW)
        const winHole = new THREE.Path();
        winHole.moveTo(-windowHalf, -windowHalf);
        winHole.lineTo(-windowHalf, windowHalf);
        winHole.lineTo(windowHalf, windowHalf);
        winHole.lineTo(windowHalf, -windowHalf);
        winHole.closePath();
        outerShape.holes.push(winHole);

        // Punch EVERY valid text glyph outer as a real 2D hole + restore inner counter-holes as Base islands!
        const counterIslands = [];
        for (const glyph of allTextShapes) {
            if (isRingStrictlyInsideCoasterAndOutsideWindow(glyph.outer, safeOuterPts, windowHalf)) {
                const holePts = ensureWinding(glyph.outer, false);
                outerShape.holes.push(new THREE.Path(holePts.map(p => new THREE.Vector2(p.x, p.y))));
                for (const innerHole of glyph.holes) {
                    counterIslands.push(new THREE.Shape(ensureWinding(innerHole, true).map(p => new THREE.Vector2(p.x, p.y))));
                }
            }
        }

        const rimGeom = extrude2DShapesToY([outerShape].concat(counterIslands), yLayerBottom, inlayDepth, 24);
        if (rimGeom) {
            const rimMesh = new THREE.Mesh(rimGeom, baseMat);
            rimMesh.castShadow = true;
            rimMesh.receiveShadow = true;
            faceBaseGroup.add(rimMesh);
        }

        // B. Quiet-Zone collar (if White Quiet-Zone enabled) + QR light BG shapes
        const bgThreeShapes = vectorShapesToThreeShapes(decomp.bgShapes);
        if (useWhiteQuietZone && windowHalf > qrHalf + 0.05) {
            const qzCollar = new THREE.Shape(makeRectRingCCW(-windowHalf, -windowHalf, windowHalf, windowHalf).map(p => new THREE.Vector2(p.x, p.y)));
            qzCollar.holes.push(new THREE.Path(ensureWinding(makeRectRingCCW(-qrHalf, -qrHalf, qrHalf, qrHalf), false).map(p => new THREE.Vector2(p.x, p.y))));
            bgThreeShapes.unshift(qzCollar);
        }

        const bgGeom = extrude2DShapesToY(bgThreeShapes, yLayerBottom, inlayDepth, 16);
        if (bgGeom) {
            const targetGrp = useWhiteQuietZone ? faceQuietGroup : faceBaseGroup;
            const targetMat = useWhiteQuietZone ? quietMat : baseMat;
            const bgMesh = new THREE.Mesh(bgGeom, targetMat);
            bgMesh.castShadow = true;
            bgMesh.receiveShadow = true;
            targetGrp.add(bgMesh);
        }

        // C. Colored QR, Text & Badge inlays (flush = full height; debossed = recessed visible floor OR empty cavity!)
        const emitColoredInlays = (styleMode === 'flush') || !debossHollow;
        if (emitColoredInlays) {
            const inlayH = (styleMode === 'debossed') ? Math.max(0.22, inlayDepth * 0.35) : inlayDepth;

            const qrGeom = extrude2DShapesToY(vectorShapesToThreeShapes(decomp.qrShapes), yLayerBottom, inlayH, 14);
            if (qrGeom) {
                const m = new THREE.Mesh(qrGeom, qrMat);
                m.castShadow = true;
                m.receiveShadow = true;
                faceQrGroup.add(m);
            }

            const textGeom = extrude2DShapesToY(vectorShapesToThreeShapes(allTextShapes), yLayerBottom, inlayH, 10);
            if (textGeom) {
                const m = new THREE.Mesh(textGeom, accentMat);
                m.castShadow = true;
                m.receiveShadow = true;
                faceTextGroup.add(m);
            }

            const badgeGeom = extrude2DShapesToY(vectorShapesToThreeShapes(decomp.badgeShapes), yLayerBottom, inlayH, 12);
            if (badgeGeom) {
                const m = new THREE.Mesh(badgeGeom, accentMat);
                m.castShadow = true;
                m.receiveShadow = true;
                faceBadgeGroup.add(m);
            }
        }
    } else {
        // EMBOSSED (3D Raised Relief)
        let qrBaseY = baseThick;
        if (useWhiteQuietZone) {
            const qzH = Math.min(0.45, Math.max(0.25, reliefH * 0.35));
            const qzRect = new THREE.Shape(makeRoundedRectRing(-windowHalf, -windowHalf, windowHalf, windowHalf, 2.2, 2.2, 2.2, 2.2, 6).map(p => new THREE.Vector2(p.x, p.y)));
            const qzGeom = extrude2DShapesToY([qzRect], baseThick, qzH, 14);
            if (qzGeom) {
                const qm = new THREE.Mesh(qzGeom, quietMat);
                qm.castShadow = true;
                qm.receiveShadow = true;
                faceQuietGroup.add(qm);
            }
            qrBaseY = baseThick + qzH;
        }

        const qrGeom = extrude2DShapesToY(vectorShapesToThreeShapes(decomp.qrShapes), qrBaseY, reliefH, 14);
        if (qrGeom) {
            const m = new THREE.Mesh(qrGeom, qrMat);
            m.castShadow = true;
            m.receiveShadow = true;
            faceQrGroup.add(m);
        }

        const textGeom = extrude2DShapesToY(vectorShapesToThreeShapes(allTextShapes), baseThick, reliefH, 10);
        if (textGeom) {
            const m = new THREE.Mesh(textGeom, accentMat);
            m.castShadow = true;
            m.receiveShadow = true;
            faceTextGroup.add(m);
        }

        const badgeGeom = extrude2DShapesToY(vectorShapesToThreeShapes(decomp.badgeShapes), qrBaseY, reliefH, 12);
        if (badgeGeom) {
            const m = new THREE.Mesh(badgeGeom, accentMat);
            m.castShadow = true;
            m.receiveShadow = true;
            faceBadgeGroup.add(m);
        }
    }

    if (faceBaseGroup.children.length > 0) targetBaseGroup.add(applyFaceTransform(faceBaseGroup));
    if (faceQuietGroup.children.length > 0) targetQuietGroup.add(applyFaceTransform(faceQuietGroup));
    if (faceQrGroup.children.length > 0) targetQrGroup.add(applyFaceTransform(faceQrGroup));
    if (faceTextGroup.children.length > 0) targetTextGroup.add(applyFaceTransform(faceTextGroup));
    if (faceBadgeGroup.children.length > 0) targetBadgeGroup.add(applyFaceTransform(faceBadgeGroup));

    // Return exact 2D layout data for WYSIWYG Laser DXF/SVG export!
    return {
        shapeType,
        effectiveSize,
        invertShield,
        qrAreaSize,
        windowSize,
        qrShapes: decomp.qrShapes,
        textShapes: allTextShapes,
        badgeShapes: decomp.badgeShapes,
        badgeSquare: decomp.badgeSquare
    };
}

// ==========================================
// FIXED DESK STAND (SEATED SOLIDLY, FACING FORWARD!)
// ==========================================

function buildDeskStandSupport(size, baseThick, standAngleDeg, baseMat) {
    const group = new THREE.Group();
    const angleRad = THREE.MathUtils.degToRad(Math.max(45, Math.min(82, standAngleDeg)));
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);

    const footH = 4.2;
    const plateHalf = size * 0.5;
    // Bottom edge of tilted plate sits solidly at y = footH - 0.5 (welded into footing!)
    const standPos = new THREE.Vector3(0, plateHalf * sinA + footH - 0.5, 0);
    const standRotX = angleRad; // POSITIVE angle tilts QR (+Y) toward viewer (+Z)!

    // Compute bottom front Z & top rear Z of tilted plate
    const botEdgeZ = plateHalf * cosA;
    const frontFootZ = botEdgeZ + baseThick * sinA + 7.5;
    const rearFootZ = -(plateHalf * cosA + 18);
    const footDepth = Math.max(48, frontFootZ - rearFootZ);
    const footCenterZ = (frontFootZ + rearFootZ) * 0.5;

    // 1. Solid Rounded Footing (y = 0 .. footH)
    const footW = size * 0.88;
    const fShape = new THREE.Shape();
    const fr = 6.0;
    const fx0 = -footW / 2, fx1 = footW / 2, fy0 = rearFootZ, fy1 = frontFootZ;
    fShape.moveTo(fx0 + fr, fy0);
    fShape.lineTo(fx1 - fr, fy0);
    fShape.quadraticCurveTo(fx1, fy0, fx1, fy0 + fr);
    fShape.lineTo(fx1, fy1 - fr);
    fShape.quadraticCurveTo(fx1, fy1, fx1 - fr, fy1);
    fShape.lineTo(fx0 + fr, fy1);
    fShape.quadraticCurveTo(fx0, fy1, fx0, fy1 - fr);
    fShape.lineTo(fx0, fy0 + fr);
    fShape.quadraticCurveTo(fx0, fy0, fx0 + fr, fy0);
    const footGeom = extrude2DShapesToY([fShape], 0, footH, 14);
    const footMesh = new THREE.Mesh(footGeom, baseMat);
    footMesh.castShadow = true;
    footMesh.receiveShadow = true;
    group.add(footMesh);

    // 2. Front Retention Cradle Lip (hugs lower front edge of tilted plate cleanly)
    const lipZ = botEdgeZ + baseThick * sinA + 2.8;
    const lipGeom = new THREE.BoxGeometry(footW * 0.92, 8.0, 5.2);
    alignGeomBottomY(lipGeom, footH - 0.5);
    lipGeom.translate(0, 0, lipZ);
    const lipMesh = new THREE.Mesh(lipGeom, baseMat);
    lipMesh.castShadow = true;
    group.add(lipMesh);

    // 3. Twin Solid Triangular Rear Buttresses (built in YZ profile extruded along X — exact contact with tilted back!)
    // On back face of tilted plate (local y = 0, local z = t in [-plateHalf..+plateHalf]):
    //   worldY(t) = standPos.y - t * sinA
    //   worldZ(t) = t * cosA
    const tLow = plateHalf * 0.72;
    const tHigh = -plateHalf * 0.28;
    const yLow = footH - 0.4;
    const zLowFront = tLow * cosA + 1.0;
    const yHigh = standPos.y - tHigh * sinA;
    const zHigh = tHigh * cosA + 1.2; // +1.2mm welds cleanly into back of plate
    const zRearBase = Math.min(rearFootZ + 4, zHigh - 10);

    const gussetShape = new THREE.Shape();
    gussetShape.moveTo(zRearBase, yLow);
    gussetShape.lineTo(zLowFront, yLow);
    gussetShape.lineTo(zHigh, yHigh);
    gussetShape.lineTo(zHigh - 7.0, yHigh);
    gussetShape.closePath();

    const gussetThick = 7.5;
    const gOffsets = [-size * 0.24, size * 0.24];
    for (const gx of gOffsets) {
        const gGeom = new THREE.ExtrudeGeometry(gussetShape, { depth: gussetThick, bevelEnabled: false });
        // ExtrudeGeometry is in XY (X = z_world, Y = y_world), extrudes along +Z -> rotateY(-PI/2) maps X->+Z, Z->-X!
        gGeom.rotateY(-Math.PI / 2);
        gGeom.translate(gx + gussetThick * 0.5, 0, 0);
        const gMesh = new THREE.Mesh(gGeom, baseMat);
        gMesh.castShadow = true;
        gMesh.receiveShadow = true;
        group.add(gMesh);
    }

    return { group, standPos, standRotX };
}

// ==========================================
// NEW: TABLE TENT / A-FRAME DOUBLE-SIDED STAND
// ==========================================

function buildTableTentFrame(size, baseThick, baseMat) {
    const group = new THREE.Group();
    const tiltDeg = 72;
    const angleRad = THREE.MathUtils.degToRad(tiltDeg);
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);
    const half = size * 0.5;
    const footH = 3.6;

    // Apex ridge sits at z = 0, y = size * sinA + footH - 1.0
    const panelCenterY = half * sinA + footH - 0.5;
    const panelOffsetZ = half * cosA + baseThick * 0.5;

    // Bottom horizontal connecting stabilizer base + side feet (spans full footprint +-size*cosA!)
    const frontFootExtentZ = size * cosA + baseThick * sinA + 5.0;
    const baseDepth = frontFootExtentZ * 2;
    const sideRailW = 8.0;
    for (const sx of [-half + sideRailW * 0.5, half - sideRailW * 0.5]) {
        const rail = new THREE.BoxGeometry(sideRailW, footH, baseDepth);
        alignGeomBottomY(rail, 0);
        rail.translate(sx, 0, 0);
        const m = new THREE.Mesh(rail, baseMat);
        m.castShadow = true;
        m.receiveShadow = true;
        group.add(m);
    }
    // Front & back bottom retention ledges seating both angled panels cleanly
    for (const dirZ of [1, -1]) {
        const ledge = new THREE.BoxGeometry(size, footH + 2.4, 6.0);
        alignGeomBottomY(ledge, 0);
        ledge.translate(0, 0, dirZ * (size * cosA + baseThick * 0.5));
        const lm = new THREE.Mesh(ledge, baseMat);
        lm.castShadow = true;
        group.add(lm);
    }

    // Top ridge cap cylinder joining front & back angled panels seamlessly
    const ridgeY = size * sinA + footH - 0.8;
    const ridge = new THREE.CylinderGeometry(baseThick * 0.72, baseThick * 0.72, size * 0.96, 20);
    ridge.rotateZ(Math.PI / 2);
    ridge.translate(0, ridgeY, 0);
    const rm = new THREE.Mesh(ridge, baseMat);
    rm.castShadow = true;
    group.add(rm);

    return {
        group,
        frontTransform: {
            pos: new THREE.Vector3(0, panelCenterY, panelOffsetZ),
            rotX: angleRad,
            rotY: 0
        },
        backTransform: {
            pos: new THREE.Vector3(0, panelCenterY, -panelOffsetZ),
            rotX: angleRad,
            rotY: Math.PI
        }
    };
}

// ==========================================
// UPGRADED SHAPE-MATCHED PARAMETRIC CADDY HOLDER (+ FRONT BRAND LABEL!)
// ==========================================

function buildCaddyHolderMesh(size, baseThick, extraCoasterH, count, caddyShapeType, brandText, baseMat, accentMat) {
    const matchShape = ['circle', 'squircle', 'hexagon', 'octagon'].includes(caddyShapeType) ? caddyShapeType : 'circle';
    const clearance = 2.8;
    const wallThick = 3.6;
    const innerSize = size + clearance;
    const outerSize = innerSize + wallThick * 2;
    const floorH = 3.2;
    const singleCoasterH = baseThick + Math.max(0.4, extraCoasterH);
    const wallH = singleCoasterH * count + 7.0;

    // 1. Solid Shape-Matched Floor (y = 0 .. floorH)
    const floorShape = makeFreshOuterShape(matchShape, outerSize, false, 0);
    const floorGeom = extrude2DShapesToY([floorShape], 0, floorH, 48);

    // 2. Lower Continuous Retention Wall (32% height)
    const lowWallH = Math.max(9.0, wallH * 0.32);
    const lowOuterPts = ensureWinding(getOuterContourPoints2D(matchShape, outerSize, false, 0), true);
    const lowInnerPts = ensureWinding(getOuterContourPoints2D(matchShape, innerSize, false, 0), false);
    const lowRing = new THREE.Shape(lowOuterPts.map(p => new THREE.Vector2(p.x, p.y)));
    lowRing.holes.push(new THREE.Path(lowInnerPts.map(p => new THREE.Vector2(p.x, p.y))));
    const lowWallGeom = extrude2DShapesToY([lowRing], floorH, lowWallH, 48);

    // 3. Upper Twin Wall Pillars (Front & Back walls leaving generous ergonomic finger scoops at +-X!)
    const upWallH = Math.max(8.0, wallH - lowWallH);
    const parts = [floorGeom, lowWallGeom];

    if (matchShape === 'circle') {
        const innerR = innerSize * 0.5;
        const outerR = outerSize * 0.5;
        const arcRanges = [
            [Math.PI * 0.18, Math.PI * 0.82],
            [Math.PI * 1.18, Math.PI * 1.82]
        ];
        for (const [a0, a1] of arcRanges) {
            const arcShape = new THREE.Shape();
            arcShape.absarc(0, 0, outerR, a0, a1, false);
            arcShape.absarc(0, 0, innerR, a1, a0, true);
            arcShape.closePath();
            parts.push(extrude2DShapesToY([arcShape], floorH + lowWallH, upWallH, 32));
        }
    } else {
        // Clip polygon walls to front & back bands (|y| >= innerSize * 0.24) for twin ergonomic side thumb cutouts!
        const scoopHalfY = innerSize * 0.24;
        const clipPolygonHalfPlane = (pts, keepPositiveY, limitY) => {
            const out = [];
            const isInside = (p) => keepPositiveY ? (p.y >= limitY) : (p.y <= -limitY);
            const yCut = keepPositiveY ? limitY : -limitY;
            for (let i = 0; i < pts.length; i++) {
                const a = pts[i];
                const b = pts[(i + 1) % pts.length];
                const inA = isInside(a);
                const inB = isInside(b);
                if (inA) out.push(a);
                if (inA !== inB && Math.abs(b.y - a.y) > 1e-6) {
                    const t = (yCut - a.y) / (b.y - a.y);
                    out.push({ x: a.x + t * (b.x - a.x), y: yCut });
                }
            }
            return deduplicateClosedRing(out);
        };

        for (const isFront of [true, false]) {
            const clippedOuter = clipPolygonHalfPlane(lowOuterPts, isFront, scoopHalfY);
            const clippedInner = clipPolygonHalfPlane(ensureWinding(lowInnerPts, true), isFront, scoopHalfY);
            if (clippedOuter.length >= 3 && clippedInner.length >= 3) {
                // Build U-shaped pillar contour by traversing clippedOuter on the wall side and clippedInner back
                const wallPts = [];
                const yCut = isFront ? scoopHalfY : -scoopHalfY;
                const outerOnWall = clippedOuter.filter(p => isFront ? p.y > yCut + 0.01 : p.y < yCut - 0.01);
                const innerOnWall = clippedInner.filter(p => isFront ? p.y > yCut + 0.01 : p.y < yCut - 0.01);
                // Simpler exact polygon boolean: sort outer endpoints along X at yCut
                const outerCutPts = clippedOuter.filter(p => Math.abs(p.y - yCut) <= 0.05);
                const innerCutPts = clippedInner.filter(p => Math.abs(p.y - yCut) <= 0.05);
                if (outerCutPts.length >= 2 && innerCutPts.length >= 2) {
                    // Build clean U-shape by walking clippedOuter from cut1 -> cut2, then inner back cut2 -> cut1
                    const idxOfCut = (arr, wantRight) => {
                        let best = 0;
                        for (let k = 0; k < arr.length; k++) {
                            if (Math.abs(arr[k].y - yCut) <= 0.05) {
                                if (wantRight ? (arr[k].x > arr[best].x || Math.abs(arr[best].y - yCut) > 0.05)
                                              : (arr[k].x < arr[best].x || Math.abs(arr[best].y - yCut) > 0.05)) {
                                    best = k;
                                }
                            }
                        }
                        return best;
                    };
                    const walkArc = (arr, startIdx, endIdx) => {
                        const res = [];
                        let cur = startIdx;
                        for (let step = 0; step < arr.length + 1; step++) {
                            res.push(arr[cur]);
                            if (cur === endIdx) break;
                            cur = (cur + 1) % arr.length;
                        }
                        return res;
                    };
                    const oStart = idxOfCut(clippedOuter, isFront);
                    const oEnd = idxOfCut(clippedOuter, !isFront);
                    const iStart = idxOfCut(clippedInner, isFront);
                    const iEnd = idxOfCut(clippedInner, !isFront);
                    const outerArc = walkArc(clippedOuter, oStart, oEnd);
                    const innerArc = walkArc(clippedInner, iStart, iEnd).reverse();
                    const uRing = deduplicateClosedRing(outerArc.concat(innerArc));
                    if (uRing.length >= 3) {
                        const uShape = new THREE.Shape(ensureWinding(uRing, true).map(p => new THREE.Vector2(p.x, p.y)));
                        parts.push(extrude2DShapesToY([uShape], floorH + lowWallH, upWallH, 16));
                    }
                }
            }
        }
    }

    const merged = mergeSimpleBufferGeometries(parts);
    parts.forEach(g => { if (g) g.dispose(); });
    const mesh = new THREE.Mesh(merged, baseMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Optional Front Brand Label extruded cleanly on front lower wall (+Z)
    let brandMesh = null;
    const cleanBrand = (brandText || '').trim();
    if (cleanBrand && accentMat) {
        const bShapes = buildStraightTextVectorShapes(cleanBrand, outerSize * 0.56, Math.min(7.5, lowWallH * 0.62), 0, activeVectorFontId);
        if (bShapes.length > 0) {
            // Flip Y cleanly in 2D with preserved CCW outer / CW hole winding (det = +1, outward normals!)
            const uprightShapes = bShapes.map(s => ({
                outer: ensureWinding(s.outer.map(p => ({ x: p.x, y: -p.y })), true),
                holes: s.holes.map(h => ensureWinding(h.map(p => ({ x: p.x, y: -p.y })), false))
            }));
            const bGeom = new THREE.ExtrudeGeometry(vectorShapesToThreeShapes(uprightShapes), { depth: 1.4, bevelEnabled: false, curveSegments: 8 });
            const maxFrontY = lowOuterPts.reduce((acc, p) => Math.max(acc, p.y), 0);
            const frontZ = (maxFrontY > 10 ? maxFrontY : outerSize * 0.5) - 0.35;
            bGeom.translate(0, floorH + lowWallH * 0.5, frontZ);
            brandMesh = new THREE.Mesh(bGeom, accentMat);
            brandMesh.castShadow = true;
        }
    }

    return { mesh, brandMesh, totalHeight: floorH + wallH, outerSize };
}

// ==========================================
// SIGNED VOLUME -> FILAMENT WEIGHT (g) & PRINT TIME ESTIMATOR
// ==========================================

function computeGroupVolumeMm3(group) {
    if (!group) return 0;
    let vol = 0;
    group.updateMatrixWorld(true);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), cross = new THREE.Vector3();

    group.traverse((child) => {
        if (!child.isMesh || !child.geometry || (child.userData && child.userData.isPreviewOnly)) return;
        const geo = child.geometry;
        const pos = geo.attributes.position;
        if (!pos) return;
        const idx = geo.index;
        const mat = child.matrixWorld;

        const addTri = (i0, i1, i2) => {
            a.fromBufferAttribute(pos, i0).applyMatrix4(mat);
            b.fromBufferAttribute(pos, i1).applyMatrix4(mat);
            c.fromBufferAttribute(pos, i2).applyMatrix4(mat);
            cross.crossVectors(b, c);
            vol += a.dot(cross) / 6.0;
        };

        if (idx) {
            for (let i = 0; i < idx.count; i += 3) addTri(idx.getX(i), idx.getX(i + 1), idx.getX(i + 2));
        } else {
            for (let i = 0; i < pos.count; i += 3) addTri(i, i + 1, i + 2);
        }
    });
    return Math.abs(vol);
}

// ==========================================
// LAYER SLICE CLIPPING HELPER (60 FPS, ZERO REBUILD!)
// ==========================================

function getActiveClippingPlanes() {
    if (!layerSlicePlane) layerSlicePlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1000);
    return layerSliceEnabled ? [layerSlicePlane] : [];
}

function applyLayerSliceToScene() {
    if (!renderer) return;
    renderer.localClippingEnabled = !!layerSliceEnabled;
    if (!layerSlicePlane) layerSlicePlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1000);
    layerSlicePlane.constant = layerSliceHeightMm;

    const planes = getActiveClippingPlanes();
    [baseMeshGroup, quietZoneMeshGroup, qrMeshGroup, textMeshGroup, badgeMeshGroup].forEach(grp => {
        if (!grp) return;
        grp.traverse(c => {
            if (c.isMesh && c.material) {
                c.material.clippingPlanes = planes;
                c.material.clipShadows = !!layerSliceEnabled;
                c.material.needsUpdate = true;
            }
        });
    });
}

// ==========================================
// MASTER 3D REBUILD PIPELINE
// ==========================================

function makeStudioMaterial(hex, roughness, metalness) {
    return new THREE.MeshStandardMaterial({
        color: hex,
        roughness,
        metalness,
        clippingPlanes: getActiveClippingPlanes(),
        clipShadows: !!layerSliceEnabled
    });
}

function rebuild3DModel(skipDomSync = false) {
    if (!scene) return;
    ensureSideStatesInitialized();
    if (!skipDomSync) syncActiveSideStateFromDOM();

    // Dispose ALL prior GPU geometries & materials (ZERO VRAM leak!)
    [baseMeshGroup, quietZoneMeshGroup, qrMeshGroup, textMeshGroup, badgeMeshGroup].forEach(grp => {
        if (grp) {
            scene.remove(grp);
            disposeObject3D(grp);
        }
    });

    baseMeshGroup = new THREE.Group();
    quietZoneMeshGroup = new THREE.Group();
    qrMeshGroup = new THREE.Group();
    textMeshGroup = new THREE.Group();
    badgeMeshGroup = new THREE.Group();
    lastFaceLayouts = { A: null, B: null };

    const size = parseFloat(document.getElementById('slider-size')?.value || 100);
    const baseThick = parseFloat(document.getElementById('slider-base-thick')?.value || 3.2);
    const reliefH = parseFloat(document.getElementById('slider-relief-height')?.value || 1.2);
    const lipH = parseFloat(document.getElementById('slider-lip-height')?.value || 1.6);
    const textSize = parseFloat(document.getElementById('slider-text-size')?.value || 8.0);
    const topOffsetVal = parseFloat(document.getElementById('slider-top-offset')?.value || 38);
    const bottomOffsetVal = parseFloat(document.getElementById('slider-bottom-offset')?.value || 38);
    const standAngleDeg = parseFloat(document.getElementById('slider-stand-angle')?.value || 65);
    const caddySlots = parseInt(document.getElementById('slider-caddy-slots')?.value || 6, 10);
    const caddyBrand = document.getElementById('input-caddy-brand')?.value || '';
    const invertShield = !!document.getElementById('chk-invert-shield')?.checked;

    const setLbl = (id, v) => { const el = document.getElementById(id); if (el) el.innerText = v; };
    setLbl('label-dim-size', `${size} mm`);
    setLbl('label-dim-base', `${baseThick.toFixed(1)} mm`);
    setLbl('label-dim-relief', `${reliefH.toFixed(1)} mm`);
    setLbl('label-dim-lip', `${lipH.toFixed(1)} mm`);
    setLbl('label-text-size', `${textSize.toFixed(1)} mm`);
    setLbl('label-top-offset', `${topOffsetVal} mm`);
    setLbl('label-bottom-offset', `${bottomOffsetVal} mm`);
    setLbl('label-stand-angle', `${standAngleDeg}°`);
    setLbl('label-caddy-slots', `${caddySlots}`);

    const baseMat = makeStudioMaterial(baseColorHex, 0.38, 0.08);
    const quietMat = makeStudioMaterial(quietZoneColorHex, 0.45, 0.04);
    const qrMat = makeStudioMaterial(qrColorHex, 0.42, 0.10);
    const accentMat = makeStudioMaterial(accentColorHex, 0.35, 0.15);

    // Track last non-caddy coaster shape for shape-matched caddy
    if (['circle', 'squircle', 'hexagon', 'octagon'].includes(currentShape)) {
        lastCoasterShape = currentShape;
    }

    // SHAPE: PARAMETRIC SHAPE-MATCHED CADDY RACK
    if (currentShape === 'caddy') {
        const extraH = (printStyle === 'embossed' && !isFaceDownMode) ? Math.max(reliefH, lipH) : (printStyle === 'debossed' && !isFaceDownMode ? lipH : 0);
        const { mesh, brandMesh } = buildCaddyHolderMesh(size, baseThick, extraH, caddySlots, lastCoasterShape, caddyBrand, baseMat, accentMat);
        baseMeshGroup.add(mesh);
        if (brandMesh) textMeshGroup.add(brandMesh);
        scene.add(baseMeshGroup);
        scene.add(quietZoneMeshGroup);
        scene.add(qrMeshGroup);
        scene.add(textMeshGroup);
        scene.add(badgeMeshGroup);
        updateStatsHUD({ carved: null, baseThick, effectiveMode: 'caddy' });
        return;
    }

    const effectiveSize = (currentShape === 'keychain') ? size * 0.6 : size;
    const isStand = (currentShape === 'stand');
    const isTent = (currentShape === 'tent');
    const isMagnet = (currentShape === 'magnet');
    const qrAreaSize = effectiveSize * 0.56;

    const effectiveMode = isFaceDownMode ? 'flush' : printStyle;
    const isDoubleRender = (isDualSided && !isStand && !isTent) || isTent;
    const maxSafeInlay = (isDualSided && !isStand && !isTent) ? baseThick * 0.40 : baseThick * 0.68;
    const inlayDepth = Math.min(maxSafeInlay, Math.max(0.4, isFaceDownMode ? 0.6 : reliefH));

    // Hardware pockets (auto-enabled magnets on Fridge Magnet shape!)
    const hasRubberFeet = !isStand && !isTent && !isDualSided && !isMagnet && !!document.getElementById('chk-rubber-feet')?.checked;
    const hasMagnets = !isStand && !isTent && !isDualSided && (isMagnet || !!document.getElementById('chk-magnet-pockets')?.checked);
    const hasNfcPocket = !isStand && !isTent && !isDualSided && !!document.getElementById('chk-nfc-pocket')?.checked;
    const hasDrainGrooves = !isStand && !isTent && !isMagnet && currentShape !== 'keychain' && !isFaceDownMode && !!document.getElementById('chk-drain-grooves')?.checked;

    const hardwareCfg = (hasRubberFeet || hasMagnets || hasNfcPocket)
        ? { rubberFeet: hasRubberFeet, magnetPockets: hasMagnets, nfcPocket: hasNfcPocket, nfcMode }
        : null;

    // 1. Support frames for Desk Stand or Table Tent
    let standTransform = null;
    let tentBuilt = null;
    if (isStand) {
        const sb = buildDeskStandSupport(effectiveSize, baseThick, standAngleDeg, baseMat);
        baseMeshGroup.add(sb.group);
        standTransform = { pos: sb.standPos, rotX: sb.standRotX, rotY: 0 };
    } else if (isTent) {
        tentBuilt = buildTableTentFrame(effectiveSize, baseThick, baseMat);
        baseMeshGroup.add(tentBuilt.group);
    }

    // 2. Build Base Slab Core (for Flush/Debossed, core height = baseThick - inlayDepth [- bottomTrim])
    let carvedInfo = { feet: false, magnets: false, nfcOpen: false, nfcSealed: false, nfcPauseZ: 0 };

    const buildPanelSlab = (transformObj, dualOnSingleSlab) => {
        if (effectiveMode === 'embossed') {
            const res = buildSolidSlabGeometry(currentShape, effectiveSize, baseThick, invertShield, true, dualOnSingleSlab ? null : hardwareCfg);
            carvedInfo = res.carved;
            const m = new THREE.Mesh(res.geom, baseMat);
            m.castShadow = true;
            m.receiveShadow = true;
            if (transformObj) {
                const wrap = new THREE.Group();
                if (transformObj.pos) wrap.position.copy(transformObj.pos);
                if (transformObj.rotY) wrap.rotation.y = transformObj.rotY;
                const inner = new THREE.Group();
                inner.rotation.x = transformObj.rotX || 0;
                inner.add(m);
                wrap.add(inner);
                baseMeshGroup.add(wrap);
            } else {
                baseMeshGroup.add(m);
            }
        } else {
            const bottomTrim = dualOnSingleSlab ? inlayDepth : 0;
            const coreH = Math.max(0.4, baseThick - inlayDepth - bottomTrim);
            const res = buildSolidSlabGeometry(currentShape, effectiveSize, coreH, invertShield, false, dualOnSingleSlab ? null : hardwareCfg);
            carvedInfo = res.carved;
            alignGeomBottomY(res.geom, bottomTrim);
            const m = new THREE.Mesh(res.geom, baseMat);
            m.castShadow = true;
            m.receiveShadow = true;
            if (transformObj) {
                const wrap = new THREE.Group();
                if (transformObj.pos) wrap.position.copy(transformObj.pos);
                if (transformObj.rotY) wrap.rotation.y = transformObj.rotY;
                const inner = new THREE.Group();
                inner.rotation.x = transformObj.rotX || 0;
                inner.add(m);
                wrap.add(inner);
                baseMeshGroup.add(wrap);
            } else {
                baseMeshGroup.add(m);
            }
        }
    };

    if (isTent && tentBuilt) {
        buildPanelSlab(tentBuilt.frontTransform, false);
        buildPanelSlab(tentBuilt.backTransform, false);
    } else {
        buildPanelSlab(standTransform, isDualSided && !isStand);
    }

    // 3. Drip Lip (Condensation Rim)
    const showDripLip = !isStand && !isTent && !isMagnet && currentShape !== 'keychain' && !isFaceDownMode && lipH > 0 && effectiveMode !== 'flush';
    if (showDripLip) {
        const lipGeom = buildDripLipGeometry(currentShape, effectiveSize, baseThick, lipH, invertShield, 3.5);
        if (lipGeom) {
            const lipMesh = new THREE.Mesh(lipGeom, baseMat);
            lipMesh.castShadow = true;
            lipMesh.receiveShadow = true;
            baseMeshGroup.add(lipMesh);
        }
    }

    // 4. Anti-Stick Condensation Micro-Grooves
    if (hasDrainGrooves) {
        const gGeom = buildAntiStickGroovesGeometry(currentShape, effectiveSize, baseThick, qrAreaSize * 0.5, showDripLip);
        if (gGeom) {
            const gm = new THREE.Mesh(gGeom, baseMat);
            gm.castShadow = true;
            gm.receiveShadow = true;
            baseMeshGroup.add(gm);
        }
    }

    // 5. Underside Preview Decals (ONLY shown if physically carved, excluded from export & color tint!)
    if (!isStand && !isTent && !isDualSided) {
        if (carvedInfo.feet) {
            const padGeom = new THREE.CylinderGeometry(3.8, 3.8, 0.25, 20);
            padGeom.translate(0, 0.25, 0);
            const padMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9, clippingPlanes: getActiveClippingPlanes() });
            getPocketPositions(currentShape, effectiveSize, 4.0).forEach(([px, pz]) => {
                const pm = new THREE.Mesh(padGeom.clone(), padMat);
                pm.position.set(px, 0, pz);
                pm.userData.isPreviewOnly = true;
                baseMeshGroup.add(pm);
            });
            padGeom.dispose();
        }
        if (carvedInfo.magnets) {
            const magGeom = new THREE.CylinderGeometry(3.9, 3.9, 1.8, 20);
            magGeom.translate(0, 1.0, 0);
            const magMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.2, metalness: 0.85, clippingPlanes: getActiveClippingPlanes() });
            getPocketPositions(currentShape, effectiveSize, 4.1).forEach(([px, pz]) => {
                const mm = new THREE.Mesh(magGeom.clone(), magMat);
                mm.position.set(px, 0, pz);
                mm.userData.isPreviewOnly = true;
                baseMeshGroup.add(mm);
            });
            magGeom.dispose();
        }
        if (carvedInfo.nfcOpen || carvedInfo.nfcSealed) {
            const nfcGeom = new THREE.CylinderGeometry(12.2, 12.2, 0.35, 32);
            nfcGeom.translate(0, carvedInfo.nfcSealed ? 1.15 : 0.3, 0);
            const nfcMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35, metalness: 0.35, clippingPlanes: getActiveClippingPlanes() });
            const nfcMesh = new THREE.Mesh(nfcGeom, nfcMat);
            nfcMesh.userData.isPreviewOnly = true;
            baseMeshGroup.add(nfcMesh);
        }
    }

    // 6. SIDE A IS ALWAYS TOP (+Y) / FRONT OF TABLE TENT! (FIXES BUG #3!)
    lastFaceLayouts.A = buildFaceAssembly({
        sideState: sideAData,
        shapeType: currentShape,
        effectiveSize,
        qrAreaSize,
        baseThick,
        reliefH,
        styleMode: effectiveMode,
        inlayDepth,
        invertShield,
        hasDripLip: showDripLip,
        baseMat,
        quietMat,
        qrMat,
        accentMat,
        targetBaseGroup: baseMeshGroup,
        targetQuietGroup: quietZoneMeshGroup,
        targetQrGroup: qrMeshGroup,
        targetTextGroup: textMeshGroup,
        targetBadgeGroup: badgeMeshGroup,
        isBottomFace: false,
        parentTransform: isTent ? tentBuilt.frontTransform : standTransform
    });

    // 7. SIDE B IS ALWAYS BOTTOM (-Y) / BACK OF TABLE TENT!
    if (isDoubleRender) {
        if (!sideBData.qrMatrix || sideBData.qrMatrix.length === 0) {
            const pB = buildQRStringFromState(sideBData.preset, sideBData.fields);
            const builtB = safeGenerateMatrix(pB, sideBData.ecc || 'H', sideBData.badge || 'none', sideBData.badgeScale || 1.0);
            sideBData.qrMatrix = builtB.matrix;
            sideBData.rawData = builtB.payload;
        }
        lastFaceLayouts.B = buildFaceAssembly({
            sideState: sideBData,
            shapeType: currentShape,
            effectiveSize,
            qrAreaSize,
            baseThick,
            reliefH,
            styleMode: effectiveMode,
            inlayDepth,
            invertShield,
            hasDripLip: false,
            baseMat,
            quietMat,
            qrMat,
            accentMat,
            targetBaseGroup: baseMeshGroup,
            targetQuietGroup: quietZoneMeshGroup,
            targetQrGroup: qrMeshGroup,
            targetTextGroup: textMeshGroup,
            targetBadgeGroup: badgeMeshGroup,
            isBottomFace: !isTent,
            parentTransform: isTent ? tentBuilt.backTransform : null
        });
    }

    scene.add(baseMeshGroup);
    scene.add(quietZoneMeshGroup);
    scene.add(qrMeshGroup);
    scene.add(textMeshGroup);
    scene.add(badgeMeshGroup);

    updateStatsHUD({ carved: carvedInfo, baseThick, effectiveMode, inlayDepth });
    // PRESERVE lastClearedRatio so ECC Logo Limit warning is NEVER overwritten! (FIXES BUG #12!)
    if (typeof updatePrintabilityBadge === 'function') updatePrintabilityBadge(lastClearedRatio);
}

// ==========================================
// EXACT BOUNDING-BOX HUD, FILAMENT WEIGHT & LAYER SLICE SYNC
// ==========================================

function getUnifiedSwapInfo(baseThick, effectiveMode, inlayDepth, carved) {
    const isFr = currentLang === 'fr';
    if (effectiveMode === 'caddy') {
        return isFr ? 'Impression 1 couleur (Support)' : 'Single-Color Print (Rack)';
    }
    if (isFaceDownMode) {
        return isFr
            ? `Face-Down PEI : Inlay Z = 0.0 → 0.6 mm (Couches 1–3)`
            : `Face-Down PEI: Inlay Z = 0.0 → 0.6 mm (Layers 1–3)`;
    }
    if (carved && carved.nfcSealed) {
        const l = Math.round(carved.nfcPauseZ / 0.2);
        return isFr
            ? `Pause NFC Scellé : ${carved.nfcPauseZ.toFixed(1)} mm (C.${l}) • AMS Flush`
            : `Sealed NFC Pause: ${carved.nfcPauseZ.toFixed(1)} mm (L.${l}) • AMS`;
    }
    if (effectiveMode === 'embossed') {
        const l = Math.round(baseThick / 0.2);
        return isFr
            ? `Pause M600 / AMS : ${baseThick.toFixed(1)} mm (Couche ${l})`
            : `M600 / AMS Swap: ${baseThick.toFixed(1)} mm (Layer ${l})`;
    }
    if (effectiveMode === 'debossed' && debossHollow) {
        return isFr ? `1 Couleur (Cavité Résine / Peinture)` : `1 Color (Carved Resin / Paint Pocket)`;
    }
    const zStart = Math.max(0.2, baseThick - (inlayDepth || 0.6));
    const lStart = Math.round(zStart / 0.2);
    return isFr
        ? `AMS Multi-Couleurs : Z = ${zStart.toFixed(1)} → ${baseThick.toFixed(1)} mm (C.${lStart})`
        : `AMS Multi-Color: Z = ${zStart.toFixed(1)} → ${baseThick.toFixed(1)} mm (L.${lStart})`;
}

function updateStatsHUD({ carved = null, baseThick = 3.2, effectiveMode = 'flush', inlayDepth = 0.6 } = {}) {
    const box = new THREE.Box3();
    let triCount = 0;

    [baseMeshGroup, quietZoneMeshGroup, qrMeshGroup, textMeshGroup, badgeMeshGroup].forEach(grp => {
        if (!grp) return;
        grp.updateMatrixWorld(true);
        grp.traverse(c => {
            if (c.userData && c.userData.isPreviewOnly) return;
            if (c.isMesh && c.geometry && c.geometry.attributes.position) {
                const pos = c.geometry.attributes.position;
                const count = c.geometry.index ? c.geometry.index.count : pos.count;
                triCount += (count / 3) * (c.count || 1);
                c.geometry.computeBoundingBox();
                if (c.geometry.boundingBox) {
                    const cb = c.geometry.boundingBox.clone().applyMatrix4(c.matrixWorld);
                    box.union(cb);
                }
            }
        });
    });

    const sz = new THREE.Vector3(0, 0, 0);
    if (!box.isEmpty()) box.getSize(sz);

    // Volume -> Estimated PLA grams (density 1.24 g/cm³, 20% infill + walls ~0.68 factor on base, 1.0 on thin inlays)
    const vBase = computeGroupVolumeMm3(baseMeshGroup) / 1000;
    const vQuiet = computeGroupVolumeMm3(quietZoneMeshGroup) / 1000;
    const vQr = computeGroupVolumeMm3(qrMeshGroup) / 1000;
    const vAcc = (computeGroupVolumeMm3(textMeshGroup) + computeGroupVolumeMm3(badgeMeshGroup)) / 1000;

    const gBase = vBase * 1.24 * 0.68;
    const gQuiet = vQuiet * 1.24 * 0.95;
    const gQr = vQr * 1.24 * 0.95;
    const gAcc = vAcc * 1.24 * 0.95;
    const gTotal = gBase + gQuiet + gQr + gAcc;
    const activeColors = [gBase, gQuiet, gQr, gAcc].filter(g => g > 0.05).length;
    const estMinutes = Math.max(8, Math.round(gTotal * 1.85 + Math.max(0, activeColors - 1) * 4));

    const swapInfo = getUnifiedSwapInfo(baseThick, effectiveMode, inlayDepth, carved);
    lastModelMetrics = {
        widthMm: sz.x,
        depthMm: sz.z,
        heightMm: sz.y,
        triangles: Math.round(triCount),
        gramsTotal: gTotal,
        gramsByPart: { base: gBase, quiet: gQuiet, qr: gQr, accent: gAcc },
        estMinutes,
        swapInfo,
        carved,
        baseThick,
        effectiveMode,
        inlayDepth
    };

    const dimEl = document.getElementById('stat-dims');
    const swapEl = document.getElementById('stat-swaps');
    const triEl = document.getElementById('stat-triangles');
    const filEl = document.getElementById('stat-filament');
    if (dimEl) dimEl.innerText = `${sz.x.toFixed(1)} × ${sz.z.toFixed(1)} × ${sz.y.toFixed(1)} mm`;
    if (swapEl) swapEl.innerText = swapInfo;
    if (triEl) triEl.innerText = `Tris: ${Math.round(triCount).toLocaleString()}`;
    if (filEl) filEl.innerText = `~${gTotal.toFixed(1)}g PLA • ~${estMinutes} min`;

    // Sync Layer Slice slider bounds to actual model height
    const sliceSlider = document.getElementById('slider-layer-slice');
    if (sliceSlider && sz.y > 0.2) {
        const maxH = Math.ceil(sz.y * 5) / 5;
        sliceSlider.max = maxH.toFixed(1);
        if (!layerSliceEnabled) {
            sliceSlider.value = maxH.toFixed(1);
            layerSliceHeightMm = maxH + 1;
            const sLbl = document.getElementById('label-layer-slice');
            if (sLbl) sLbl.innerText = `Full (${sz.y.toFixed(1)} mm)`;
        }
    }
}

function updateHUDLabelsForLang() {
    if (!lastModelMetrics) return;
    const swapEl = document.getElementById('stat-swaps');
    if (swapEl) {
        swapEl.innerText = getUnifiedSwapInfo(
            lastModelMetrics.baseThick || 3.2,
            lastModelMetrics.effectiveMode || 'flush',
            lastModelMetrics.inlayDepth || 0.6,
            lastModelMetrics.carved
        );
    }
}
