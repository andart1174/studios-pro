// ==========================================
// PARAMETRIC 3D CAD GEOMETRY ENGINE (WATER-TIGHT, BEVEL-ALIGNED, TRUE CAVITY)
// ==========================================

let printStyle = 'flush'; // 'flush' | 'embossed' | 'debossed'
let isFaceDownMode = false;
let currentShape = 'circle'; // 'circle' | 'squircle' | 'hexagon' | 'octagon' | 'shield' | 'keychain' | 'stand' | 'caddy'
let textLayoutStyle = 'straight'; // 'straight' | 'curved'

function mergeSimpleBufferGeometries(geoms) {
    const nonIndexed = geoms.filter(Boolean).map(g => (g.index ? g.toNonIndexed() : g));
    if (nonIndexed.length === 0) return null;

    let totalVerts = 0;
    for (const g of nonIndexed) {
        if (g.attributes.position) totalVerts += g.attributes.position.count;
    }
    if (totalVerts === 0) return null;

    const positions = new Float32Array(totalVerts * 3);
    const normals = new Float32Array(totalVerts * 3);
    let offset = 0;

    for (const g of nonIndexed) {
        const pos = g.attributes.position;
        if (!pos) continue;
        if (!g.attributes.normal) g.computeVertexNormals();
        const norm = g.attributes.normal;
        positions.set(pos.array, offset * 3);
        if (norm) normals.set(norm.array, offset * 3);
        offset += pos.count;
    }

    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    merged.computeBoundingBox();
    return merged;
}

/**
 * Normalize an extruded slab geometry vertically so min.y sits strictly at minTargetY.
 */
function alignGeomBottomY(geom, minTargetY = 0) {
    geom.computeBoundingBox();
    const dy = minTargetY - geom.boundingBox.min.y;
    if (Math.abs(dy) > 1e-6) geom.translate(0, dy, 0);
    geom.computeBoundingBox();
    return geom;
}

function buildShape2DContour(shapeType, size, invertShield = false) {
    const shape = new THREE.Shape();
    const half = size / 2;

    if (shapeType === 'circle' || shapeType === 'keychain') {
        shape.absarc(0, 0, half, 0, Math.PI * 2, false);
        return shape;
    }

    if (shapeType === 'squircle' || shapeType === 'stand') {
        const r = size * 0.15;
        const x = -half, y = -half;
        shape.moveTo(x + r, y);
        shape.lineTo(x + size - r, y);
        shape.quadraticCurveTo(x + size, y, x + size, y + r);
        shape.lineTo(x + size, y + size - r);
        shape.quadraticCurveTo(x + size, y + size, x + size - r, y + size);
        shape.lineTo(x + r, y + size);
        shape.quadraticCurveTo(x, y + size, x, y + size - r);
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
        const w = size * 0.9, h = size;
        const hw = w / 2;
        if (!invertShield) {
            shape.moveTo(-hw + 8, -h * 0.44);
            shape.lineTo(hw - 8, -h * 0.44);
            shape.quadraticCurveTo(hw, -h * 0.44, hw, -h * 0.44 + 8);
            shape.lineTo(hw, 0);
            shape.quadraticCurveTo(hw, h * 0.35, 0, h * 0.48);
            shape.quadraticCurveTo(-hw, h * 0.35, -hw, 0);
            shape.lineTo(-hw, -h * 0.44 + 8);
            shape.quadraticCurveTo(-hw, -h * 0.44, -hw + 8, -h * 0.44);
        } else {
            shape.moveTo(0, -h * 0.48);
            shape.quadraticCurveTo(hw, -h * 0.35, hw, 0);
            shape.lineTo(hw, h * 0.44 - 8);
            shape.quadraticCurveTo(hw, h * 0.44, hw - 8, h * 0.44);
            shape.lineTo(-hw + 8, h * 0.44);
            shape.quadraticCurveTo(-hw, h * 0.44, -hw, h * 0.44 - 8);
            shape.lineTo(-hw, 0);
            shape.quadraticCurveTo(-hw, -h * 0.35, 0, -h * 0.48);
        }
        return shape;
    }

    shape.absarc(0, 0, half, 0, Math.PI * 2, false);
    return shape;
}

function createKeychainShapeWithHole(size) {
    const R = size / 2;
    const rLug = Math.max(5.5, R * 0.22);
    const rHole = rLug * 0.50;
    const lugY = -(R + rLug * 0.52);

    const yInt = (R * R + lugY * lugY - rLug * rLug) / (2 * lugY);
    const xInt = Math.sqrt(Math.max(0.1, R * R - yInt * yInt));

    const shape = new THREE.Shape();
    shape.moveTo(xInt, yInt);
    shape.absarc(0, lugY, rLug, Math.atan2(yInt - lugY, xInt), Math.atan2(yInt - lugY, -xInt), true);
    shape.absarc(0, 0, R, Math.atan2(yInt, -xInt), Math.atan2(yInt, xInt), false);

    const hole = new THREE.Path();
    hole.absarc(0, lugY, rHole, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    return { shape, holeCenterZ: lugY, holeRadius: rHole };
}

/**
 * Build base slab for ANY shape with exact height [0 .. totalHeight] and zero Y drift!
 * Optionally carves real bottom pockets [0 .. 0.6mm] for 4x Ø8mm bumpers & Ø25mm NFC tag.
 */
function buildSolidSlabGeometry(shapeType, size, totalHeight, invertShield = false, useBevel = true, undersidePockets = null) {
    const hasPockets = !!(undersidePockets && (undersidePockets.rubberFeet || undersidePockets.nfcPocket) && totalHeight >= 1.4 && size >= 45 && shapeType !== 'stand' && shapeType !== 'caddy');

    if (hasPockets) {
        const pocketDepth = 0.6;
        const pocketShape = (shapeType === 'keychain')
            ? createKeychainShapeWithHole(size).shape
            : buildShape2DContour(shapeType, size, invertShield);
        const outerCW = THREE.ShapeUtils.isClockWise(pocketShape.getPoints(20));

        if (undersidePockets.rubberFeet && size >= 48) {
            const pDist = size * 0.22;
            [[-pDist, -pDist], [pDist, -pDist], [pDist, pDist], [-pDist, pDist]].forEach(([px, py]) => {
                const hole = new THREE.Path();
                hole.absarc(px, py, 4.0, 0, Math.PI * 2, !outerCW);
                pocketShape.holes.push(hole);
            });
        }
        if (undersidePockets.nfcPocket) {
            const nfcHole = new THREE.Path();
            nfcHole.absarc(0, 0, 12.5, 0, Math.PI * 2, !outerCW);
            pocketShape.holes.push(nfcHole);
        }

        const botGeom = new THREE.ExtrudeGeometry(pocketShape, {
            depth: pocketDepth,
            bevelEnabled: false,
            curveSegments: 48
        });
        botGeom.rotateX(Math.PI / 2);
        alignGeomBottomY(botGeom, 0);

        const topLayerH = Math.max(0.4, totalHeight - pocketDepth + 0.02);
        const topGeom = buildSolidSlabGeometry(shapeType, size, topLayerH, invertShield, false, null);
        alignGeomBottomY(topGeom, pocketDepth - 0.02);

        return mergeSimpleBufferGeometries([botGeom, topGeom]);
    }

    const bevel = useBevel && (shapeType === 'squircle' || shapeType === 'shield' || shapeType === 'keychain' || shapeType === 'stand')
        ? Math.min(0.55, totalHeight * 0.2)
        : 0;
    const coreDepth = Math.max(0.2, totalHeight - 2 * bevel);

    if (shapeType === 'circle' && !useBevel) {
        const g = new THREE.CylinderGeometry(size / 2, size / 2, totalHeight, 64);
        return alignGeomBottomY(g, 0);
    }

    const shape = (shapeType === 'keychain')
        ? createKeychainShapeWithHole(size).shape
        : buildShape2DContour(shapeType, size, invertShield);

    const geom = new THREE.ExtrudeGeometry(shape, {
        depth: coreDepth,
        bevelEnabled: bevel > 0,
        bevelSegments: 2,
        bevelSize: bevel,
        bevelThickness: bevel,
        curveSegments: 48
    });
    geom.rotateX(Math.PI / 2);
    return alignGeomBottomY(geom, 0);
}

/**
 * Build universal Drip Lip (condensation rim) for ANY coaster shape at exact y = [baseThick .. baseThick + lipH].
 */
function buildDripLipGeometry(shapeType, size, baseThick, lipH, invertShield = false, rimWidth = 3.5) {
    if (lipH <= 0.05 || shapeType === 'stand' || shapeType === 'caddy') return null;

    const outerPoints = buildShape2DContour(shapeType, size, invertShield).getPoints(shapeType === 'hexagon' ? 1 : (shapeType === 'octagon' ? 1 : 64));
    const outerShape = new THREE.Shape(outerPoints);

    const innerScale = Math.max(0.5, (size - rimWidth * 2) / size);
    const innerPts = outerPoints.map(p => new THREE.Vector2(p.x * innerScale, p.y * innerScale));
    // Reversed winding for hole
    const hole = new THREE.Path(innerPts.reverse());
    outerShape.holes.push(hole);

    const geom = new THREE.ExtrudeGeometry(outerShape, {
        depth: lipH,
        bevelEnabled: false,
        curveSegments: 48
    });
    geom.rotateX(Math.PI / 2);
    return alignGeomBottomY(geom, baseThick);
}

/**
 * Build perforated upper rim layer with a clean rectangular cutout [-qrHalf .. +qrHalf]^2
 * so debossed & flush QR inlays have zero geometry overlap against the base slab.
 */
function buildPerforatedTopRimGeometry(shapeType, size, qrWindowSize, yBottom, layerHeight, invertShield = false) {
    const outerPts = buildShape2DContour(shapeType, size, invertShield).getPoints(
        (shapeType === 'hexagon' || shapeType === 'octagon') ? 1 : 64
    );
    const shape = new THREE.Shape(outerPts);
    const h = qrWindowSize / 2;

    // Only punch QR square hole if square fits cleanly inside coaster silhouette
    if (h < size * 0.45) {
        const hole = new THREE.Path();
        // Reverse winding (CW in 2D shape XY -> after +PI/2 rotateX keeps vertical hole clean)
        hole.moveTo(-h, -h);
        hole.lineTo(-h, h);
        hole.lineTo(h, h);
        hole.lineTo(h, -h);
        hole.closePath();
        shape.holes.push(hole);
    }

    if (shapeType === 'keychain') {
        const kh = createKeychainShapeWithHole(size);
        shape.holes.push(...kh.shape.holes);
    }

    const geom = new THREE.ExtrudeGeometry(shape, {
        depth: Math.max(0.2, layerHeight),
        bevelEnabled: false,
        curveSegments: 48
    });
    geom.rotateX(Math.PI / 2);
    return alignGeomBottomY(geom, yBottom);
}

function createBoxesBuffer(boxes) {
    if (!boxes || boxes.length === 0) return null;
    const totalVerts = boxes.length * 36;
    const positions = new Float32Array(totalVerts * 3);
    const normals = new Float32Array(totalVerts * 3);

    const cubeFaces = [
        [-0.5, -0.5,  0.5,  0.5, -0.5,  0.5,  0.5,  0.5,  0.5, -0.5, -0.5,  0.5,  0.5,  0.5,  0.5, -0.5,  0.5,  0.5],
        [ 0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5,  0.5, -0.5,  0.5, -0.5, -0.5, -0.5,  0.5, -0.5,  0.5,  0.5, -0.5],
        [-0.5,  0.5,  0.5,  0.5,  0.5,  0.5,  0.5,  0.5, -0.5, -0.5,  0.5,  0.5,  0.5,  0.5, -0.5, -0.5,  0.5, -0.5],
        [-0.5, -0.5, -0.5,  0.5, -0.5, -0.5,  0.5, -0.5,  0.5, -0.5, -0.5, -0.5,  0.5, -0.5,  0.5, -0.5, -0.5,  0.5],
        [ 0.5, -0.5,  0.5,  0.5, -0.5, -0.5,  0.5,  0.5, -0.5,  0.5, -0.5,  0.5,  0.5,  0.5, -0.5,  0.5,  0.5,  0.5],
        [-0.5, -0.5, -0.5, -0.5, -0.5,  0.5, -0.5,  0.5,  0.5, -0.5, -0.5, -0.5, -0.5,  0.5,  0.5, -0.5,  0.5, -0.5]
    ];
    const faceNormals = [
        [0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0]
    ];

    let pOffset = 0;
    for (let i = 0; i < boxes.length; i++) {
        const b = boxes[i];
        for (let f = 0; f < 6; f++) {
            const faceVerts = cubeFaces[f];
            const fn = faceNormals[f];
            for (let v = 0; v < 6; v++) {
                positions[pOffset] = b.cx + faceVerts[v * 3] * b.w;
                positions[pOffset + 1] = b.cy + faceVerts[v * 3 + 1] * b.h;
                positions[pOffset + 2] = b.cz + faceVerts[v * 3 + 2] * b.d;
                normals[pOffset] = fn[0];
                normals[pOffset + 1] = fn[1];
                normals[pOffset + 2] = fn[2];
                pOffset += 3;
            }
        }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    return geom;
}

/**
 * Greedy 2D rectangle merger over a boolean M x N matrix -> emits minimal watertight boxes
 * with slight edge continuity so letters/QR regions never split into thin slices!
 */
function buildRunLengthBoxesFromMatrix(matrix, areaSize, yCenter, height, wantValue = true, padOverlap = 1.005) {
    const M = matrix.length;
    if (M === 0) return null;
    const cellSize = areaSize / M;
    const startOffset = -areaSize / 2;
    const boxes = [];

    for (let r = 0; r < M; r++) {
        let startCol = -1;
        for (let c = 0; c <= M; c++) {
            const match = (c < M) && (!!matrix[r][c] === wantValue);
            if (match && startCol === -1) {
                startCol = c;
            } else if (!match && startCol !== -1) {
                const spanCols = c - startCol;
                boxes.push({
                    cx: startOffset + (startCol + spanCols * 0.5) * cellSize,
                    cy: yCenter,
                    cz: startOffset + (r + 0.5) * cellSize,
                    w: spanCols * cellSize * padOverlap,
                    h: height,
                    d: cellSize * padOverlap
                });
                startCol = -1;
            }
        }
    }
    return createBoxesBuffer(boxes);
}

/**
 * Contiguous, auto-scaled, clipping-free 3D text rasterizer (ZERO 0.95 scanline gaps!).
 */
function buildRaster3DText(text, maxTargetW, maxTargetH, depth) {
    if (!text || !text.trim()) return null;
    const canvas = document.createElement('canvas');
    const cw = 640, ch = 84;
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = '#ffffff';

    let fontPx = 56;
    ctx.font = `900 ${fontPx}px "Outfit", "Inter", sans-serif`;
    const measured = ctx.measureText(text.trim()).width;
    if (measured > cw - 24) {
        fontPx = Math.max(18, Math.floor(fontPx * ((cw - 24) / measured)));
        ctx.font = `900 ${fontPx}px "Outfit", "Inter", sans-serif`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.trim(), cw / 2, ch / 2);

    const imgData = ctx.getImageData(0, 0, cw, ch).data;
    let minX = cw, maxX = 0, minY = ch, maxY = 0;

    for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
            if (imgData[(y * cw + x) * 4] > 110) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    if (maxX <= minX || maxY <= minY) return null;
    const actW = (maxX - minX) + 1;
    const actH = (maxY - minY) + 1;
    const scale = Math.min(maxTargetW / actW, maxTargetH / actH);

    const boxes = [];
    const startX = -(actW * scale) / 2;
    const startZ = -(actH * scale) / 2;

    for (let y = minY; y <= maxY; y++) {
        let sCol = -1;
        for (let x = minX; x <= maxX + 1; x++) {
            const isF = (x <= maxX) && imgData[(y * cw + x) * 4] > 110;
            if (isF && sCol === -1) {
                sCol = x;
            } else if (!isF && sCol !== -1) {
                const spanW = x - sCol;
                boxes.push({
                    cx: startX + (sCol - minX + spanW / 2) * scale,
                    cy: 0,
                    cz: startZ + (y - minY + 0.5) * scale,
                    w: spanW * scale + 0.015,
                    h: depth,
                    d: scale * 1.02 // Slight overlap bridges adjacent scanline rows cleanly!
                });
                sCol = -1;
            }
        }
    }
    return createBoxesBuffer(boxes);
}

/**
 * Dynamic-canvas curved arc text (scales canvas cleanly to any coaster radius up to 140mm!).
 */
function buildRaster3DCurvedText(text, radius, fontSize, depth, isBottom) {
    if (!text || !text.trim()) return null;
    const pxPerMm = 5.0;
    const maxDimMm = (radius + fontSize * 1.5) * 2 + 8;
    const dimPx = Math.min(900, Math.max(420, Math.ceil(maxDimMm * pxPerMm)));

    const canvas = document.createElement('canvas');
    canvas.width = dimPx;
    canvas.height = dimPx;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, dimPx, dimPx);
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(fontSize * pxPerMm * 0.92)}px "Outfit", "Inter", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const cleanText = text.trim();
    const cx = dimPx / 2, cy = dimPx / 2;
    const rPix = radius * pxPerMm;

    const totalW = ctx.measureText(cleanText).width;
    const maxArc = Math.PI * 0.86;
    const arcScale = totalW / rPix > maxArc ? (maxArc * rPix) / totalW : 1.0;
    if (arcScale < 1.0) {
        ctx.font = `900 ${Math.max(18, Math.round(fontSize * pxPerMm * 0.92 * arcScale))}px "Outfit", "Inter", sans-serif`;
    }

    const totalAngle = Math.min(maxArc, ctx.measureText(cleanText).width / rPix);
    const centerAngle = isBottom ? Math.PI / 2 : -Math.PI / 2;
    const dir = isBottom ? -1 : 1;
    let currentAngle = centerAngle - (dir * totalAngle) / 2;

    for (let i = 0; i < cleanText.length; i++) {
        const char = cleanText[i];
        const charW = ctx.measureText(char).width;
        const charAngle = (charW / rPix) * dir;
        const midAngle = currentAngle + charAngle / 2;
        ctx.save();
        ctx.translate(cx + rPix * Math.cos(midAngle), cy + rPix * Math.sin(midAngle));
        ctx.rotate(midAngle + (isBottom ? -Math.PI / 2 : Math.PI / 2));
        ctx.fillText(char, 0, 0);
        ctx.restore();
        currentAngle += charAngle;
    }

    const imgData = ctx.getImageData(0, 0, dimPx, dimPx).data;
    let minX = dimPx, maxX = 0, minY = dimPx, maxY = 0;
    for (let y = 0; y < dimPx; y++) {
        for (let x = 0; x < dimPx; x++) {
            if (imgData[(y * dimPx + x) * 4] > 110) {
                if (x < minX) minX = x; if (x > maxX) maxX = x;
                if (y < minY) minY = y; if (y > maxY) maxY = y;
            }
        }
    }
    if (maxX <= minX || maxY <= minY) return null;

    const scale = 1 / pxPerMm;
    const boxes = [];
    for (let y = minY; y <= maxY; y++) {
        let sCol = -1;
        for (let x = minX; x <= maxX + 1; x++) {
            const isF = (x <= maxX) && imgData[(y * dimPx + x) * 4] > 110;
            if (isF && sCol === -1) sCol = x;
            else if (!isF && sCol !== -1) {
                const spanW = x - sCol;
                boxes.push({
                    cx: (sCol - cx + spanW / 2) * scale,
                    cy: 0,
                    cz: (y - cy + 0.5) * scale,
                    w: spanW * scale + 0.015,
                    h: depth,
                    d: scale * 1.02
                });
                sCol = -1;
            }
        }
    }
    return createBoxesBuffer(boxes);
}

/**
 * Center badge 3D icon builder supporting BOTH white icons AND black/transparent uploaded PNG/SVG logos!
 */
function buildBadge3DGeometry(type, badgeDiameter, depth) {
    const cw = 64, ch = 64;
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');

    const isCustom = (type === 'custom' && typeof customBadgeImg !== 'undefined' && customBadgeImg);
    if (!isCustom) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, cw, ch);
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        const cx = 32, cy = 32;

        if (type === 'wifi') {
            ctx.beginPath(); ctx.arc(cx, cy + 12, 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx, cy + 12, 13, -Math.PI * 0.75, -Math.PI * 0.25); ctx.stroke();
            ctx.beginPath(); ctx.arc(cx, cy + 12, 22, -Math.PI * 0.75, -Math.PI * 0.25); ctx.stroke();
        } else if (type === 'coffee') {
            ctx.fillRect(cx - 12, cy - 3, 24, 18);
            ctx.beginPath(); ctx.arc(cx + 11, cy + 6, 7, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
            ctx.fillRect(cx - 16, cy + 17, 32, 4);
        } else if (type === 'beer') {
            ctx.fillRect(cx - 11, cy - 8, 22, 26);
            ctx.beginPath(); ctx.arc(cx + 9, cy + 4, 8, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
            ctx.beginPath(); ctx.arc(cx - 5, cy - 11, 5.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + 4, cy - 11, 6.5, 0, Math.PI * 2); ctx.fill();
        } else if (type === 'instagram') {
            if (ctx.roundRect) {
                ctx.beginPath();
                ctx.roundRect(cx - 16, cy - 16, 32, 32, 8);
                ctx.stroke();
            } else {
                ctx.strokeRect(cx - 16, cy - 16, 32, 32);
            }
            ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.arc(cx + 9.5, cy - 9.5, 2.8, 0, Math.PI * 2); ctx.fill();
        } else if (type === 'spotify') {
            ctx.beginPath(); ctx.arc(cx, cy + 4, 9, -Math.PI * 0.8, -Math.PI * 0.2); ctx.stroke();
            ctx.beginPath(); ctx.arc(cx, cy + 9, 17, -Math.PI * 0.8, -Math.PI * 0.2); ctx.stroke();
            ctx.beginPath(); ctx.arc(cx, cy + 14, 25, -Math.PI * 0.8, -Math.PI * 0.2); ctx.stroke();
        } else if (type === 'star') {
            drawStar2D(ctx, cx, cy, 5, 19, 8);
            ctx.fill();
        } else if (type === 'heart') {
            drawHeart2D(ctx, cx, cy, 32);
            ctx.fill();
        } else if (type === 'menu') {
            ctx.fillRect(cx - 10, cy - 16, 4, 32);
            ctx.fillRect(cx + 6, cy - 16, 4, 32);
            ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
        } else {
            return null;
        }
    } else {
        ctx.clearRect(0, 0, cw, ch);
        ctx.drawImage(customBadgeImg, 6, 6, cw - 12, ch - 12);
    }

    const imgData = ctx.getImageData(0, 0, cw, ch).data;
    // Measure corner luminance to detect whether custom logo uses white background with dark ink
    let isDarkInkOnLightBg = false;
    if (isCustom) {
        const bgA = imgData[3];
        const bgLum = (imgData[0] * 0.299 + imgData[1] * 0.587 + imgData[2] * 0.114);
        if (bgA > 200 && bgLum > 180) isDarkInkOnLightBg = true;
    }

    const isPixelForeground = (idx) => {
        if (!isCustom) return imgData[idx] > 100;
        const r = imgData[idx], g = imgData[idx + 1], b = imgData[idx + 2], a = imgData[idx + 3];
        if (a < 80) return false;
        const lum = r * 0.299 + g * 0.587 + b * 0.114;
        return isDarkInkOnLightBg ? lum < 170 : (a > 120 || lum > 90);
    };

    const scale = badgeDiameter / cw;
    const boxes = [];
    const startX = -badgeDiameter / 2;
    const startZ = -badgeDiameter / 2;

    for (let y = 0; y < ch; y++) {
        let sCol = -1;
        for (let x = 0; x <= cw; x++) {
            const isF = (x < cw) && isPixelForeground((y * cw + x) * 4);
            if (isF && sCol === -1) sCol = x;
            else if (!isF && sCol !== -1) {
                const spanW = x - sCol;
                boxes.push({
                    cx: startX + (sCol + spanW / 2) * scale,
                    cy: 0,
                    cz: startZ + (y + 0.5) * scale,
                    w: spanW * scale + 0.015,
                    h: depth,
                    d: scale * 1.02
                });
                sCol = -1;
            }
        }
    }
    return createBoxesBuffer(boxes);
}

function drawStar2D(ctx, cx, cy, spikes, outerRadius, innerRadius) {
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

function drawHeart2D(ctx, cx, cy, size) {
    const topCurveHeight = size * 0.3;
    ctx.beginPath();
    ctx.moveTo(cx, cy + size * 0.3);
    ctx.bezierCurveTo(cx, cy, cx - size * 0.5, cy - size * 0.35, cx - size * 0.5, cy);
    ctx.bezierCurveTo(cx - size * 0.5, cy + topCurveHeight, cx, cy + size * 0.5, cx, cy + size * 0.5);
    ctx.bezierCurveTo(cx, cy + size * 0.5, cx + size * 0.5, cy + topCurveHeight, cx + size * 0.5, cy);
    ctx.bezierCurveTo(cx + size * 0.5, cy - size * 0.35, cx, cy, cx, cy + size * 0.3);
    ctx.closePath();
}

function buildDeskStandSupport(size, baseThick, standAngleDeg, baseMat) {
    const group = new THREE.Group();
    const angleRad = THREE.MathUtils.degToRad(standAngleDeg);

    // Base footing resting flush at y = 0..4
    const kickGeom = new THREE.BoxGeometry(size * 0.86, 4.0, size * 0.56);
    alignGeomBottomY(kickGeom, 0);
    const kickMesh = new THREE.Mesh(kickGeom, baseMat);
    kickMesh.position.set(0, 0, -size * 0.08);
    kickMesh.castShadow = true;
    kickMesh.receiveShadow = true;
    group.add(kickMesh);

    // Front Cradle Ledge supporting lower edge of angled plate cleanly
    const ledgeZ = size * 0.16;
    const ledgeGeom = new THREE.BoxGeometry(size * 0.86, 6.5, 7.5);
    alignGeomBottomY(ledgeGeom, 0);
    const ledgeMesh = new THREE.Mesh(ledgeGeom, baseMat);
    ledgeMesh.position.set(0, 0, ledgeZ);
    ledgeMesh.castShadow = true;
    group.add(ledgeMesh);

    // Rear angled support buttress computed to touch back of tilted plate
    const strutGeom = new THREE.BoxGeometry(16, size * 0.52, 7.0);
    alignGeomBottomY(strutGeom, 0);
    strutGeom.rotateX(-(Math.PI / 2 - angleRad) * 0.45);
    alignGeomBottomY(strutGeom, 1.5);
    const strutMesh = new THREE.Mesh(strutGeom, baseMat);
    strutMesh.position.set(0, 0, -size * 0.22);
    strutMesh.castShadow = true;
    group.add(strutMesh);

    // Compute exact tilted center so coaster plate sits cleanly in cradle at y >= 3.0mm
    const standPos = new THREE.Vector3(0, (size * 0.5) * Math.sin(angleRad) + 4.0, -size * 0.04);
    const standRotX = angleRad - Math.PI / 2; // tilts coaster plate back smoothly toward viewer

    return { group, standPos, standRotX };
}

/**
 * Watertight Ergonomic Caddy Holder WITH solid bottom floor AND thumb pull-out notches!
 */
function buildCaddyHolderMesh(size, baseThick, count, baseMat) {
    const innerRadius = (size + 3.2) / 2;
    const wallThickness = 3.5;
    const outerRadius = innerRadius + wallThickness;
    const floorH = 3.0;
    const wallH = (baseThick + 1.4) * count + 6;

    // 1. Solid circular floor (y = 0 .. 3.0mm)
    const floorGeom = new THREE.CylinderGeometry(outerRadius, outerRadius, floorH, 64);
    alignGeomBottomY(floorGeom, 0);

    // 2. Lower continuous wall ring (30% height) so coasters cannot slide out bottom
    const lowWallH = Math.max(8, wallH * 0.28);
    const ringShape = new THREE.Shape();
    ringShape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
    const innerHole = new THREE.Path();
    innerHole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
    ringShape.holes.push(innerHole);

    const lowWallGeom = new THREE.ExtrudeGeometry(ringShape, { depth: lowWallH, bevelEnabled: false, curveSegments: 64 });
    lowWallGeom.rotateX(Math.PI / 2);
    alignGeomBottomY(lowWallGeom, floorH - 0.01);

    // 3. Upper twin ergonomic crescent pillars (leaves two 55-deg finger scoops at +-X!)
    const upWallH = Math.max(6, wallH - lowWallH);
    const upperParts = [floorGeom, lowWallGeom];
    const arcRanges = [
        [Math.PI * 0.18, Math.PI * 0.82],
        [Math.PI * 1.18, Math.PI * 1.82]
    ];
    for (const [a0, a1] of arcRanges) {
        const arcShape = new THREE.Shape();
        arcShape.absarc(0, 0, outerRadius, a0, a1, false);
        arcShape.absarc(0, 0, innerRadius, a1, a0, true);
        arcShape.closePath();
        const arcGeom = new THREE.ExtrudeGeometry(arcShape, { depth: upWallH, bevelEnabled: false, curveSegments: 32 });
        arcGeom.rotateX(Math.PI / 2);
        alignGeomBottomY(arcGeom, floorH + lowWallH - 0.02);
        upperParts.push(arcGeom);
    }

    const merged = mergeSimpleBufferGeometries(upperParts);
    const mesh = new THREE.Mesh(merged, baseMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return { mesh, totalHeight: floorH + wallH, outerRadius };
}

/**
 * Generates QR meshes for 'square', 'dots', or 'connected' styles.
 */
function buildQRModulesMeshes(matrix, qrAreaSize, pixelCenterY, pixelHeight, qrMat, style) {
    const M = matrix.length;
    if (M === 0) return [];
    const out = [];

    if (style === 'square') {
        const mergedGeom = buildRunLengthBoxesFromMatrix(matrix, qrAreaSize, pixelCenterY, pixelHeight, true, 0.99);
        if (mergedGeom) {
            const m = new THREE.Mesh(mergedGeom, qrMat);
            m.castShadow = true;
            m.receiveShadow = true;
            out.push(m);
        }
        return out;
    }

    const cell = qrAreaSize / M;
    const start = -qrAreaSize / 2;

    if (style === 'dots') {
        // Finder patterns sharp square; data modules round dots
        const finderBoxes = [];
        const dotCoords = [];
        for (let r = 0; r < M; r++) {
            for (let c = 0; c < M; c++) {
                if (!matrix[r][c]) continue;
                const cx = start + (c + 0.5) * cell;
                const cz = start + (r + 0.5) * cell;
                if (typeof isFinderModule === 'function' && isFinderModule(r, c, M)) {
                    finderBoxes.push({ cx, cy: pixelCenterY, cz, w: cell * 0.98, h: pixelHeight, d: cell * 0.98 });
                } else {
                    dotCoords.push([cx, cz]);
                }
            }
        }
        if (finderBoxes.length > 0) {
            const fm = new THREE.Mesh(createBoxesBuffer(finderBoxes), qrMat);
            fm.castShadow = true;
            out.push(fm);
        }
        if (dotCoords.length > 0) {
            const cyl = new THREE.CylinderGeometry(cell * 0.44, cell * 0.44, pixelHeight, 14);
            const inst = new THREE.InstancedMesh(cyl, qrMat, dotCoords.length);
            const dummy = new THREE.Object3D();
            dotCoords.forEach(([x, z], idx) => {
                dummy.position.set(x, pixelCenterY, z);
                dummy.updateMatrix();
                inst.setMatrixAt(idx, dummy.matrix);
            });
            inst.instanceMatrix.needsUpdate = true;
            inst.castShadow = true;
            out.push(inst);
        }
        return out;
    }

    // 'connected': round dots joined seamlessly horizontally & vertically across adjacent modules
    const bridgeBoxes = [];
    const nodeCoords = [];
    for (let r = 0; r < M; r++) {
        for (let c = 0; c < M; c++) {
            if (!matrix[r][c]) continue;
            const cx = start + (c + 0.5) * cell;
            const cz = start + (r + 0.5) * cell;
            if (typeof isFinderModule === 'function' && isFinderModule(r, c, M)) {
                bridgeBoxes.push({ cx, cy: pixelCenterY, cz, w: cell * 0.99, h: pixelHeight, d: cell * 0.99 });
                continue;
            }
            nodeCoords.push([cx, cz]);
            if (c + 1 < M && matrix[r][c + 1]) {
                bridgeBoxes.push({ cx: cx + cell * 0.5, cy: pixelCenterY, cz, w: cell, h: pixelHeight, d: cell * 0.84 });
            }
            if (r + 1 < M && matrix[r + 1][c]) {
                bridgeBoxes.push({ cx, cy: pixelCenterY, cz: cz + cell * 0.5, w: cell * 0.84, h: pixelHeight, d: cell });
            }
        }
    }
    if (bridgeBoxes.length > 0) {
        const bm = new THREE.Mesh(createBoxesBuffer(bridgeBoxes), qrMat);
        bm.castShadow = true;
        out.push(bm);
    }
    if (nodeCoords.length > 0) {
        const cyl = new THREE.CylinderGeometry(cell * 0.45, cell * 0.45, pixelHeight, 14);
        const inst = new THREE.InstancedMesh(cyl, qrMat, nodeCoords.length);
        const dummy = new THREE.Object3D();
        nodeCoords.forEach(([x, z], idx) => {
            dummy.position.set(x, pixelCenterY, z);
            dummy.updateMatrix();
            inst.setMatrixAt(idx, dummy.matrix);
        });
        inst.instanceMatrix.needsUpdate = true;
        inst.castShadow = true;
        out.push(inst);
    }
    return out;
}

function buildFaceAssembly({
    matrix,
    topTextStr,
    bottomTextStr,
    badge,
    shapeType,
    effectiveSize,
    qrAreaSize,
    baseThick,
    reliefH,
    styleMode,
    yBaseTop,
    inlayDepth,
    invertShield,
    textSize,
    topOffsetVal,
    bottomOffsetVal,
    baseMat,
    qrMat,
    accentMat,
    targetBaseGroup,
    targetQrGroup,
    targetTextGroup,
    targetBadgeGroup,
    isBottomFace = false,
    parentStandPos = null,
    parentStandRotX = 0
}) {
    const faceBaseGroup = new THREE.Group();
    const faceQrGroup = new THREE.Group();
    const faceTextGroup = new THREE.Group();
    const faceBadgeGroup = new THREE.Group();

    const applyFaceTransform = (grp) => {
        if (isBottomFace) {
            // Rotate face upside-down onto y = 0 bed plane cleanly
            grp.rotation.x = Math.PI;
            grp.position.y = baseThick;
        }
        if (parentStandPos) {
            const outer = new THREE.Group();
            outer.position.copy(parentStandPos);
            outer.rotation.x = parentStandRotX;
            outer.add(grp);
            return outer;
        }
        return grp;
    };

    const effectiveRelief = (styleMode === 'embossed') ? reliefH : inlayDepth;
    let qrCenterY, qrH;
    if (styleMode === 'embossed') {
        qrH = reliefH;
        qrCenterY = baseThick + reliefH * 0.5;
    } else if (styleMode === 'debossed') {
        // Light QR cells filled into base top layer so dark modules leave REAL carved holes!
        const lightFiller = buildRunLengthBoxesFromMatrix(matrix, qrAreaSize, baseThick - effectiveRelief * 0.5, effectiveRelief, false, 1.002);
        if (lightFiller) {
            const lm = new THREE.Mesh(lightFiller, baseMat);
            lm.receiveShadow = true;
            faceBaseGroup.add(lm);
        }
        qrH = Math.max(0.25, effectiveRelief * 0.55);
        qrCenterY = (baseThick - effectiveRelief) + qrH * 0.5;
    } else {
        // Flush / Face-Down PEI Inlay: light cells = Base, dark cells = QR (zero overlap!)
        const lightFiller = buildRunLengthBoxesFromMatrix(matrix, qrAreaSize, baseThick - effectiveRelief * 0.5, effectiveRelief, false, 1.002);
        if (lightFiller) {
            const lm = new THREE.Mesh(lightFiller, baseMat);
            lm.receiveShadow = true;
            faceBaseGroup.add(lm);
        }
        qrH = effectiveRelief;
        qrCenterY = baseThick - effectiveRelief * 0.5;
    }

    // Dark QR Pixels
    const qrMeshes = buildQRModulesMeshes(matrix, qrAreaSize, qrCenterY, qrH, qrMat, qrPixelStyle);
    qrMeshes.forEach(m => faceQrGroup.add(m));

    // Typography (Top Header + Bottom Footer)
    let textCenterY = qrCenterY;
    let textH = qrH;
    const scaleRatio = effectiveSize / 100;
    const topOffset = topOffsetVal * scaleRatio;
    const bottomOffset = bottomOffsetVal * scaleRatio;
    const effTextSize = textSize * (shapeType === 'keychain' ? 0.72 : 1.0);
    const isCurved = (textLayoutStyle === 'curved' && (shapeType === 'circle' || shapeType === 'octagon' || shapeType === 'hexagon'));

    if (topTextStr && topTextStr.trim()) {
        const tGeom = isCurved
            ? buildRaster3DCurvedText(topTextStr, topOffset, effTextSize, textH, false)
            : buildRaster3DText(topTextStr, effectiveSize * 0.84, effTextSize, textH);
        if (tGeom) {
            const tMesh = new THREE.Mesh(tGeom, accentMat);
            tMesh.position.set(0, textCenterY, isCurved ? 0 : -topOffset);
            tMesh.castShadow = true;
            faceTextGroup.add(tMesh);
        }
    }

    if (bottomTextStr && bottomTextStr.trim()) {
        const bGeom = isCurved
            ? buildRaster3DCurvedText(bottomTextStr, bottomOffset, effTextSize, textH, true)
            : buildRaster3DText(bottomTextStr, effectiveSize * 0.84, effTextSize, textH);
        if (bGeom) {
            const bMesh = new THREE.Mesh(bGeom, accentMat);
            bMesh.position.set(0, textCenterY, isCurved ? 0 : bottomOffset);
            bMesh.castShadow = true;
            faceTextGroup.add(bMesh);
        }
    }

    // Center Brand Badge / Shield Pedestal
    if (badge && badge !== 'none') {
        const badgeRadius = qrAreaSize * 0.145;
        const shieldH = Math.max(0.3, textH);
        const shieldGeom = new THREE.CylinderGeometry(badgeRadius, badgeRadius, shieldH, 32);
        const shieldMesh = new THREE.Mesh(shieldGeom, baseMat);
        shieldMesh.position.set(0, textCenterY, 0);
        faceBaseGroup.add(shieldMesh);

        const iconH = styleMode === 'debossed' ? shieldH * 0.8 : (styleMode === 'flush' ? shieldH : shieldH + 0.04);
        const iconGeom = buildBadge3DGeometry(badge, badgeRadius * 1.42, iconH);
        if (iconGeom) {
            const iconMesh = new THREE.Mesh(iconGeom, accentMat);
            iconMesh.position.set(0, textCenterY + (styleMode === 'embossed' ? 0.04 : 0), 0);
            iconMesh.castShadow = true;
            faceBadgeGroup.add(iconMesh);
        }
    }

    if (faceBaseGroup.children.length > 0) targetBaseGroup.add(applyFaceTransform(faceBaseGroup));
    if (faceQrGroup.children.length > 0) targetQrGroup.add(applyFaceTransform(faceQrGroup));
    if (faceTextGroup.children.length > 0) targetTextGroup.add(applyFaceTransform(faceTextGroup));
    if (faceBadgeGroup.children.length > 0) targetBadgeGroup.add(applyFaceTransform(faceBadgeGroup));
}

function rebuild3DModel() {
    if (!scene) return;

    if (baseMeshGroup) scene.remove(baseMeshGroup);
    if (qrMeshGroup) scene.remove(qrMeshGroup);
    if (textMeshGroup) scene.remove(textMeshGroup);
    if (badgeMeshGroup) scene.remove(badgeMeshGroup);

    baseMeshGroup = new THREE.Group();
    qrMeshGroup = new THREE.Group();
    textMeshGroup = new THREE.Group();
    badgeMeshGroup = new THREE.Group();

    const size = parseFloat(document.getElementById('slider-size')?.value || 100);
    const baseThick = parseFloat(document.getElementById('slider-base-thick')?.value || 3.2);
    const reliefH = parseFloat(document.getElementById('slider-relief-height')?.value || 1.2);
    const lipH = parseFloat(document.getElementById('slider-lip-height')?.value || 1.6);
    const textSize = parseFloat(document.getElementById('slider-text-size')?.value || 8.0);
    const topOffsetVal = parseFloat(document.getElementById('slider-top-offset')?.value || 38);
    const bottomOffsetVal = parseFloat(document.getElementById('slider-bottom-offset')?.value || 38);
    const standAngleDeg = parseFloat(document.getElementById('slider-stand-angle')?.value || 65);
    const caddySlots = parseInt(document.getElementById('slider-caddy-slots')?.value || 6, 10);
    const invertShield = !!document.getElementById('chk-invert-shield')?.checked;

    const setLbl = (id, v) => { const el = document.getElementById(id); if (el) el.innerText = v; };
    setLbl('label-dim-size', `${size} mm`);
    setLbl('label-dim-base', `${baseThick} mm`);
    setLbl('label-dim-relief', `${reliefH} mm`);
    setLbl('label-dim-lip', `${lipH} mm`);
    setLbl('label-text-size', `${textSize.toFixed(1)} mm`);
    setLbl('label-top-offset', `${topOffsetVal} mm`);
    setLbl('label-bottom-offset', `${bottomOffsetVal} mm`);
    setLbl('label-stand-angle', `${standAngleDeg}°`);
    setLbl('label-caddy-slots', `${caddySlots}`);

    const baseMat = new THREE.MeshStandardMaterial({ color: baseColorHex, roughness: 0.38, metalness: 0.08 });
    const qrMat = new THREE.MeshStandardMaterial({ color: qrColorHex, roughness: 0.42, metalness: 0.1 });
    const accentMat = new THREE.MeshStandardMaterial({ color: accentColorHex, roughness: 0.35, metalness: 0.15 });

    // CADDY RACK
    if (currentShape === 'caddy') {
        const { mesh, totalHeight } = buildCaddyHolderMesh(size, baseThick, caddySlots, baseMat);
        baseMeshGroup.add(mesh);
        scene.add(baseMeshGroup);
        updateStatsHUD(size, totalHeight, baseThick);
        return;
    }

    const effectiveSize = (currentShape === 'keychain') ? size * 0.6 : size;
    const isStand = (currentShape === 'stand');
    const qrAreaSize = effectiveSize * 0.58;

    // Effective print mode: Face-Down overrides top face to clean flat 0.6mm Flush Inlay
    const effectiveMode = isFaceDownMode ? 'flush' : printStyle;
    const maxSafeInlay = isDualSided ? baseThick * 0.42 : baseThick * 0.72;
    const inlayDepth = Math.min(maxSafeInlay, Math.max(0.4, isFaceDownMode ? 0.6 : reliefH));

    // Stand cradle
    let standPos = null, standRotX = 0;
    if (isStand) {
        const standBuilt = buildDeskStandSupport(size, baseThick, standAngleDeg, baseMat);
        baseMeshGroup.add(standBuilt.group);
        standPos = standBuilt.standPos;
        standRotX = standBuilt.standRotX;
    }

    const hasRubberFeet = !isStand && !isDualSided && !!document.getElementById('chk-rubber-feet')?.checked;
    const hasNfcPocket = !isStand && !isDualSided && !!document.getElementById('chk-nfc-pocket')?.checked;
    const undersidePockets = (hasRubberFeet || hasNfcPocket)
        ? { rubberFeet: hasRubberFeet, nfcPocket: hasNfcPocket }
        : null;

    // 1. Base Slab Geometry (split cleanly into solid core + perforated inlay rim for flush/debossed)
    let slabGeom;
    if (effectiveMode === 'embossed') {
        slabGeom = buildSolidSlabGeometry(currentShape, effectiveSize, baseThick, invertShield, true, undersidePockets);
    } else {
        const bottomTrim = (isDualSided && !isStand) ? inlayDepth : 0;
        const coreH = Math.max(0.4, baseThick - inlayDepth - bottomTrim);
        const coreGeom = buildSolidSlabGeometry(currentShape, effectiveSize, coreH, invertShield, false, undersidePockets);
        alignGeomBottomY(coreGeom, bottomTrim);

        const topRimGeom = buildPerforatedTopRimGeometry(currentShape, effectiveSize, qrAreaSize, baseThick - inlayDepth, inlayDepth, invertShield);
        const slabParts = [coreGeom, topRimGeom];
        if (isDualSided && !isStand) {
            const botRimGeom = buildPerforatedTopRimGeometry(currentShape, effectiveSize, qrAreaSize, 0, inlayDepth, invertShield);
            slabParts.push(botRimGeom);
        }
        slabGeom = mergeSimpleBufferGeometries(slabParts);
    }

    const baseMesh = new THREE.Mesh(slabGeom, baseMat);
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    if (isStand) {
        baseMesh.position.copy(standPos);
        baseMesh.rotation.x = standRotX;
    }
    baseMeshGroup.add(baseMesh);

    // 2. Drip Lip (available for ALL coaster shapes except Stand & Caddy, hidden in Flush/Face-Down)
    if (!isStand && !isFaceDownMode && lipH > 0 && effectiveMode !== 'flush') {
        const lipGeom = buildDripLipGeometry(currentShape, effectiveSize, baseThick, lipH, invertShield, 3.5);
        if (lipGeom) {
            const lipMesh = new THREE.Mesh(lipGeom, baseMat);
            lipMesh.castShadow = true;
            lipMesh.receiveShadow = true;
            baseMeshGroup.add(lipMesh);
        }
    }

    // 3. Underside Rubber Feet & NFC Tag Cavity preview decals (flush inside pockets, excluded from export)
    if (!isStand && !isDualSided) {
        if (hasRubberFeet && effectiveSize >= 48) {
            const padGeom = new THREE.CylinderGeometry(3.8, 3.8, 0.25, 20);
            padGeom.translate(0, 0.25, 0);
            const padMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
            const pDist = effectiveSize * 0.22;
            [[-pDist, -pDist], [pDist, -pDist], [pDist, pDist], [-pDist, pDist]].forEach(([px, pz]) => {
                const pm = new THREE.Mesh(padGeom, padMat);
                pm.position.set(px, 0, pz);
                pm.userData.isPreviewOnly = true;
                baseMeshGroup.add(pm);
            });
        }
        if (hasNfcPocket && effectiveSize >= 45) {
            const nfcGeom = new THREE.CylinderGeometry(12.2, 12.2, 0.25, 32);
            nfcGeom.translate(0, 0.25, 0);
            const nfcMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4, metalness: 0.3 });
            const nfcMesh = new THREE.Mesh(nfcGeom, nfcMat);
            nfcMesh.userData.isPreviewOnly = true;
            baseMeshGroup.add(nfcMesh);
        }
    }

    // 4. Top Active Face (Side A or active)
    const topStr = (document.getElementById('input-top-text')?.value || '').trim();
    const botStr = (document.getElementById('input-bottom-text')?.value || '').trim();

    buildFaceAssembly({
        matrix: currentQRMatrix,
        topTextStr: topStr,
        bottomTextStr: botStr,
        badge: badgeType,
        shapeType: currentShape,
        effectiveSize,
        qrAreaSize,
        baseThick,
        reliefH,
        styleMode: effectiveMode,
        yBaseTop: baseThick,
        inlayDepth,
        invertShield,
        textSize,
        topOffsetVal,
        bottomOffsetVal,
        baseMat,
        qrMat,
        accentMat,
        targetBaseGroup: baseMeshGroup,
        targetQrGroup: qrMeshGroup,
        targetTextGroup: textMeshGroup,
        targetBadgeGroup: badgeMeshGroup,
        isBottomFace: false,
        parentStandPos: standPos,
        parentStandRotX: standRotX
    });

    // 5. Dual-Sided Opposite Face (routed into PROPER material groups!)
    if (isDualSided && !isStand) {
        const opp = (activeSide === 'A') ? sideBData : sideAData;
        const oppMatrix = (opp.qrMatrix && opp.qrMatrix.length > 0) ? opp.qrMatrix : currentQRMatrix;
        buildFaceAssembly({
            matrix: oppMatrix,
            topTextStr: opp.topText || '',
            bottomTextStr: opp.bottomText || '',
            badge: opp.badge || 'none',
            shapeType: currentShape,
            effectiveSize,
            qrAreaSize,
            baseThick,
            reliefH,
            styleMode: effectiveMode,
            yBaseTop: baseThick,
            inlayDepth,
            invertShield,
            textSize,
            topOffsetVal,
            bottomOffsetVal,
            baseMat,
            qrMat,
            accentMat,
            targetBaseGroup: baseMeshGroup,
            targetQrGroup: qrMeshGroup,
            targetTextGroup: textMeshGroup,
            targetBadgeGroup: badgeMeshGroup,
            isBottomFace: true
        });
    }

    scene.add(baseMeshGroup);
    scene.add(qrMeshGroup);
    scene.add(textMeshGroup);
    scene.add(badgeMeshGroup);

    const totalH = isStand ? (size * 0.85) : (baseThick + (effectiveMode === 'embossed' ? Math.max(reliefH, lipH) : lipH));
    updateStatsHUD(effectiveSize, totalH, baseThick);
    if (typeof updatePrintabilityBadge === 'function') updatePrintabilityBadge(0);
}

function updateStatsHUD(size, totalH, baseThick) {
    const dimEl = document.getElementById('stat-dims');
    const swapEl = document.getElementById('stat-swaps');
    const triEl = document.getElementById('stat-triangles');
    if (dimEl) dimEl.innerText = `${Math.round(size)} × ${Math.round(size)} × ${totalH.toFixed(1)} mm`;
    if (swapEl) {
        if (isFaceDownMode) {
            swapEl.innerText = currentLang === 'fr'
                ? `Face-Down PEI : Inlay Z = 0.0 → 0.6 mm`
                : `Face-Down PEI: Color inlay at Z = 0.0 → 0.6 mm`;
        } else {
            const zLevel = (printStyle === 'embossed') ? baseThick : Math.max(0.2, baseThick - 1.0);
            swapEl.innerText = currentLang === 'fr'
                ? `Pause Filament : à ${zLevel.toFixed(1)} mm (Couche ${Math.round(zLevel / 0.2)})`
                : `Filament Swap: at ${zLevel.toFixed(1)} mm (Layer ${Math.round(zLevel / 0.2)})`;
        }
    }

    let triCount = 0;
    [baseMeshGroup, qrMeshGroup, textMeshGroup, badgeMeshGroup].forEach(grp => {
        if (grp) grp.traverse(c => {
            if (c.isMesh && c.geometry && c.geometry.attributes.position) {
                triCount += (c.geometry.attributes.position.count / 3) * (c.count || 1);
            }
        });
    });
    if (triEl) triEl.innerText = `Triangles: ${Math.round(triCount).toLocaleString()}`;
}
