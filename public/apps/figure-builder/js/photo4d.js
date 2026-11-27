/**
 * photo4d.js — Photo -> Real 4D Living Sculpture Engine (v5.0)
 * ============================================================
 * Turns any user photo (or built-in HD demo subject) into a real volumetric
 * 4D sculpture in 100% client-side JavaScript:
 *  - Smart CIE-Lab Border-Flood Background Cutout ("Object Only" vs "Full Frame")
 *  - Multi-scale silhouette inflation + luminance + Sobel depth sculpting
 *  - 5 Real 4D Reconstruction Modes:
 *      1. bust      : Double-sided watertight sculpted PBR figurine (front+back+skirt)
 *      2. lathe     : 360-degree rotational 4D sculpture from extracted silhouette
 *      3. voxels    : GPU InstancedMesh 4D Hyper-Voxel crystal sculpture
 *      4. prism     : Faceted diamond holographic relief with edge lattice
 *      5. tesseract : Rotating 4D Tesseract Photo-Cube (24 UV-mapped crystal faces)
 *  - Live 4D XW/YW/ZW projection + W-wave breathing + 100% GLB/STL/OBJ/AR export!
 */

const Photo4DEngine = (() => {

    const opts = {
        mode: 'bust',        // 'bust' | 'lathe' | 'voxels' | 'prism' | 'tesseract'
        cutoutMode: 'object',// 'object' | 'full'
        tolerance: 34,       // 5..90 CIE-Lab Delta-E
        invertMask: false,
        depth: 0.52,         // 0.1..1.2
        smooth: 2,           // 0..4 blur passes
        wAmp: 0.52,          // 0..1.2 4D W-coordinate amplitude
        doubleSided: true,   // true = sculpted front+back, false = flat-back relief
        resolution: 72,      // 44 | 72 | 100
        renderMode: 'solid', // 'solid' | 'crystal' | 'cyber' | 'hologram' | 'wireframe'
    };

    let active = false;
    let group = null;
    let sourceCanvas = null; // 512x512 crisp source image
    let photoTexture = null;
    let sourceName = 'photo-4d';
    let currentScene = null;

    // Live 4D animation state for the current photo sculpture
    let animData = null; // { type, baseVerts4d, mesh, voxelBase4d, voxelInst, tessVerts4d, ... }

    // ─── Perceptual CIE-Lab helpers ──────────────────────────────────────────
    function rgbToLab(r, g, b) {
        let R = r / 255, G = g / 255, B = b / 255;
        R = R > 0.04045 ? Math.pow((R + 0.055) / 1.055, 2.4) : R / 12.92;
        G = G > 0.04045 ? Math.pow((G + 0.055) / 1.055, 2.4) : G / 12.92;
        B = B > 0.04045 ? Math.pow((B + 0.055) / 1.055, 2.4) : B / 12.92;

        let X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
        let Y = (R * 0.2126 + G * 0.7152 + B * 0.0722) / 1.00000;
        let Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;

        const f = t => t > 0.008856 ? Math.cbrt(t) : (7.787 * t) + 16 / 116;
        const fx = f(X), fy = f(Y), fz = f(Z);
        return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
    }

    function deltaE(a, b) {
        const dL = a[0] - b[0], da = a[1] - b[1], db = a[2] - b[2];
        return Math.sqrt(dL * dL + da * da + db * db);
    }

    // ─── Built-in Procedural HD Demo Subjects (Zero external URL failures!) ──
    function createDemoCanvas(demoId) {
        const S = 512;
        const c = document.createElement('canvas');
        c.width = S; c.height = S;
        const ctx = c.getContext('2d');

        // Clean studio backdrop so Smart Object Cutout isolates cleanly!
        ctx.fillStyle = '#070b1a';
        ctx.fillRect(0, 0, S, S);

        if (demoId === 'lion') {
            // Golden Cosmic Lion Crest
            const cx = S / 2, cy = S / 2 + 6;
            // Sculpted layered mane rays
            for (let layer = 2; layer >= 0; layer--) {
                const rays = 20 - layer * 2;
                const rOut = 212 - layer * 28;
                const rIn = 135 - layer * 16;
                const grad = ctx.createRadialGradient(cx, cy - 20, 30, cx, cy, rOut);
                grad.addColorStop(0, '#fff4b8');
                grad.addColorStop(0.45, layer === 0 ? '#f59e0b' : '#d97706');
                grad.addColorStop(1, '#7c2d12');
                ctx.fillStyle = grad;
                ctx.beginPath();
                for (let i = 0; i < rays * 2; i++) {
                    const a = (i / (rays * 2)) * Math.PI * 2 + layer * 0.14;
                    const rad = (i % 2 === 0 ? rOut : rIn) * (0.94 + 0.06 * Math.sin(a * 3));
                    const px = cx + Math.cos(a) * rad;
                    const py = cy + Math.sin(a) * rad;
                    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
            }
            // Sculpted face shield
            const fGrad = ctx.createRadialGradient(cx, cy - 18, 15, cx, cy + 10, 128);
            fGrad.addColorStop(0, '#fef08a');
            fGrad.addColorStop(0.6, '#f59e0b');
            fGrad.addColorStop(1, '#92400e');
            ctx.fillStyle = fGrad;
            ctx.beginPath();
            ctx.ellipse(cx, cy, 108, 120, 0, 0, Math.PI * 2);
            ctx.fill();
            // Ears
            [-78, 78].forEach(dx => {
                ctx.fillStyle = '#d97706';
                ctx.beginPath(); ctx.arc(cx + dx, cy - 88, 30, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fef08a';
                ctx.beginPath(); ctx.arc(cx + dx, cy - 86, 15, 0, Math.PI * 2); ctx.fill();
            });
            // Brow & bridge highlight (drives 3D relief height!)
            ctx.fillStyle = '#fffbeb';
            ctx.beginPath(); ctx.ellipse(cx, cy - 12, 34, 48, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(cx - 42, cy - 30, 28, 16, -0.2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(cx + 42, cy - 30, 28, 16, 0.2, 0, Math.PI * 2); ctx.fill();
            // Cyan glowing eyes
            [-40, 40].forEach(dx => {
                ctx.fillStyle = '#1e1b4b';
                ctx.beginPath(); ctx.ellipse(cx + dx, cy - 16, 22, 13, dx < 0 ? 0.15 : -0.15, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#00f3ff';
                ctx.beginPath(); ctx.arc(cx + dx, cy - 16, 9, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath(); ctx.arc(cx + dx - 3, cy - 19, 3.5, 0, Math.PI * 2); ctx.fill();
            });
            // Snout & nose
            ctx.fillStyle = '#fde68a';
            ctx.beginPath(); ctx.ellipse(cx - 26, cy + 44, 34, 24, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(cx + 26, cy + 44, 34, 24, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#451a03';
            ctx.beginPath();
            ctx.moveTo(cx - 26, cy + 16); ctx.lineTo(cx + 26, cy + 16); ctx.lineTo(cx, cy + 40);
            ctx.closePath(); ctx.fill();
            // Chin beard
            ctx.fillStyle = '#fef3c7';
            ctx.beginPath(); ctx.ellipse(cx, cy + 78, 38, 22, 0, 0, Math.PI * 2); ctx.fill();

        } else if (demoId === 'phoenix') {
            // Neon Cyber Phoenix Crest
            const cx = S / 2, cy = S / 2 + 12;
            [-1, 1].forEach(side => {
                for (let f = 0; f < 6; f++) {
                    const grad = ctx.createLinearGradient(cx, cy, cx + side * 220, cy - 140 + f * 48);
                    grad.addColorStop(0, '#00f3ff');
                    grad.addColorStop(0.5, '#a855f7');
                    grad.addColorStop(1, '#ff0099');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.moveTo(cx + side * 22, cy - 20 + f * 18);
                    ctx.quadraticCurveTo(cx + side * (145 - f * 10), cy - 155 + f * 42, cx + side * (225 - f * 22), cy - 110 + f * 52);
                    ctx.quadraticCurveTo(cx + side * (135 - f * 12), cy - 40 + f * 35, cx + side * 26, cy + 18 + f * 18);
                    ctx.closePath();
                    ctx.fill();
                }
            });
            // Central Phoenix Body + Flame Crown
            const bGrad = ctx.createLinearGradient(cx, cy - 170, cx, cy + 160);
            bGrad.addColorStop(0, '#fff7ed');
            bGrad.addColorStop(0.35, '#fbbf24');
            bGrad.addColorStop(0.7, '#f97316');
            bGrad.addColorStop(1, '#ec4899');
            ctx.fillStyle = bGrad;
            ctx.beginPath();
            ctx.moveTo(cx, cy - 175);
            ctx.quadraticCurveTo(cx + 55, cy - 70, cx + 44, cy + 45);
            ctx.lineTo(cx, cy + 175);
            ctx.lineTo(cx - 44, cy + 45);
            ctx.quadraticCurveTo(cx - 55, cy - 70, cx, cy - 175);
            ctx.closePath();
            ctx.fill();
            // Inner chest gem
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.ellipse(cx, cy - 15, 22, 40, 0, 0, Math.PI * 2); ctx.fill();

        } else if (demoId === 'chalice') {
            // Royal Crystal Goblet / Trophy (ideal for 360 Lathe + Bust!)
            const cx = S / 2;
            const grad = ctx.createLinearGradient(cx - 120, 50, cx + 120, 460);
            grad.addColorStop(0, '#e0f2fe');
            grad.addColorStop(0.3, '#38bdf8');
            grad.addColorStop(0.65, '#818cf8');
            grad.addColorStop(1, '#f472b6');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(cx - 120, 62);
            ctx.bezierCurveTo(cx - 135, 195, cx - 72, 240, cx - 26, 268);
            ctx.lineTo(cx - 22, 378);
            ctx.bezierCurveTo(cx - 70, 392, cx - 108, 412, cx - 114, 444);
            ctx.lineTo(cx + 114, 444);
            ctx.bezierCurveTo(cx + 108, 412, cx + 70, 392, cx + 22, 378);
            ctx.lineTo(cx + 26, 268);
            ctx.bezierCurveTo(cx + 72, 240, cx + 135, 195, cx + 120, 62);
            ctx.closePath();
            ctx.fill();
            // Specular highlight down center for depth
            const hi = ctx.createLinearGradient(cx - 50, 70, cx + 50, 440);
            hi.addColorStop(0, 'rgba(255,255,255,0.9)');
            hi.addColorStop(0.5, 'rgba(255,255,255,0.2)');
            hi.addColorStop(1, 'rgba(255,255,255,0.75)');
            ctx.fillStyle = hi;
            ctx.fillRect(cx - 18, 74, 36, 355);
            // Gold collar rings
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(cx - 118, 66, 236, 18);
            ctx.fillRect(cx - 42, 268, 84, 18);
            ctx.fillRect(cx - 104, 424, 208, 18);

        } else {
            // Cyber Astronaut Helmet Portrait Bust
            const cx = S / 2, cy = S / 2 + 12;
            // Shoulders
            const shGrad = ctx.createLinearGradient(cx - 170, cy + 70, cx + 170, cy + 210);
            shGrad.addColorStop(0, '#38bdf8'); shGrad.addColorStop(0.5, '#e2e8f0'); shGrad.addColorStop(1, '#818cf8');
            ctx.fillStyle = shGrad;
            ctx.beginPath();
            ctx.ellipse(cx, cy + 150, 168, 72, 0, Math.PI, TAU);
            ctx.fill();
            // Helmet Shell
            const hGrad = ctx.createRadialGradient(cx - 35, cy - 60, 20, cx, cy - 10, 165);
            hGrad.addColorStop(0, '#ffffff');
            hGrad.addColorStop(0.55, '#cbd5e1');
            hGrad.addColorStop(1, '#334155');
            ctx.fillStyle = hGrad;
            ctx.beginPath(); ctx.arc(cx, cy - 18, 146, 0, Math.PI * 2); ctx.fill();
            // Gold Iridescent Visor
            const vGrad = ctx.createLinearGradient(cx - 105, cy - 105, cx + 105, cy + 65);
            vGrad.addColorStop(0, '#fef08a');
            vGrad.addColorStop(0.4, '#f59e0b');
            vGrad.addColorStop(0.75, '#ec4899');
            vGrad.addColorStop(1, '#38bdf8');
            ctx.fillStyle = vGrad;
            ctx.beginPath(); ctx.ellipse(cx, cy - 14, 108, 84, 0, 0, Math.PI * 2); ctx.fill();
            // Visor reflection arc
            ctx.fillStyle = 'rgba(255,255,255,0.75)';
            ctx.beginPath(); ctx.ellipse(cx - 38, cy - 52, 42, 18, -0.45, 0, Math.PI * 2); ctx.fill();
            // Side ear pods
            ctx.fillStyle = '#00f3ff';
            ctx.fillRect(cx - 160, cy - 48, 22, 68);
            ctx.fillRect(cx + 138, cy - 48, 22, 68);
        }

        return c;
    }

    const TAU = Math.PI * 2;

    // ─── Sample & Analyze Source Image (Cutout + Depth + Color Buffers) ─────
    function analyzeImage(gridW, gridH) {
        const tmp = document.createElement('canvas');
        tmp.width = gridW; tmp.height = gridH;
        const ctx = tmp.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(sourceCanvas, 0, 0, gridW, gridH);
        const imgData = ctx.getImageData(0, 0, gridW, gridH).data;

        const N = gridW * gridH;
        const lum = new Float32Array(N);
        const sat = new Float32Array(N);
        const mask = new Uint8Array(N); // 1 = foreground subject, 0 = background
        const rgb = new Uint8Array(N * 3);

        for (let i = 0; i < N; i++) {
            const r = imgData[i * 4], g = imgData[i * 4 + 1], b = imgData[i * 4 + 2];
            rgb[i * 3] = r; rgb[i * 3 + 1] = g; rgb[i * 3 + 2] = b;
            lum[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
            sat[i] = mx > 0 ? (mx - mn) / mx : 0;
        }

        if (opts.cutoutMode === 'full') {
            mask.fill(1);
        } else {
            // Check if image already has real alpha transparency
            let transparentCount = 0;
            for (let i = 0; i < N; i++) if (imgData[i * 4 + 3] < 128) transparentCount++;

            if (transparentCount > N * 0.04) {
                for (let i = 0; i < N; i++) mask[i] = imgData[i * 4 + 3] >= 128 ? 1 : 0;
            } else {
                // Smart CIE-Lab Border-Flood Background Removal!
                // Sample border pixels to find dominant backdrop clusters (corners + edges)
                const seeds = [
                    0, gridW - 1, (gridH - 1) * gridW, N - 1,
                    Math.floor(gridW * 0.5), (gridH - 1) * gridW + Math.floor(gridW * 0.5),
                    Math.floor(gridH * 0.5) * gridW, Math.floor(gridH * 0.5) * gridW + gridW - 1
                ];
                const bgLabs = seeds.map(idx => rgbToLab(rgb[idx * 3], rgb[idx * 3 + 1], rgb[idx * 3 + 2]));

                const labCache = new Float32Array(N * 3);
                for (let i = 0; i < N; i++) {
                    const L = rgbToLab(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]);
                    labCache[i * 3] = L[0]; labCache[i * 3 + 1] = L[1]; labCache[i * 3 + 2] = L[2];
                }

                const visited = new Uint8Array(N);
                const bgFlag = new Uint8Array(N);
                const queue = new Int32Array(N);
                let qHead = 0, qTail = 0;
                const tol = Math.max(6, opts.tolerance);

                const matchesBg = (idx) => {
                    const pLab = [labCache[idx * 3], labCache[idx * 3 + 1], labCache[idx * 3 + 2]];
                    for (let s = 0; s < bgLabs.length; s++) {
                        if (deltaE(pLab, bgLabs[s]) <= tol) return true;
                    }
                    return false;
                };

                // Enqueue border pixels matching backdrop
                for (let x = 0; x < gridW; x++) {
                    const top = x, bot = (gridH - 1) * gridW + x;
                    if (!visited[top] && matchesBg(top)) { visited[top] = 1; bgFlag[top] = 1; queue[qTail++] = top; }
                    if (!visited[bot] && matchesBg(bot)) { visited[bot] = 1; bgFlag[bot] = 1; queue[qTail++] = bot; }
                }
                for (let y = 1; y < gridH - 1; y++) {
                    const lft = y * gridW, rgt = y * gridW + gridW - 1;
                    if (!visited[lft] && matchesBg(lft)) { visited[lft] = 1; bgFlag[lft] = 1; queue[qTail++] = lft; }
                    if (!visited[rgt] && matchesBg(rgt)) { visited[rgt] = 1; bgFlag[rgt] = 1; queue[qTail++] = rgt; }
                }

                // BFS flood fill from borders into similar neighbors
                const localTol = tol * 0.55;
                while (qHead < qTail) {
                    const cur = queue[qHead++];
                    const cx = cur % gridW, cy = (cur - cx) / gridW;
                    const cLab = [labCache[cur * 3], labCache[cur * 3 + 1], labCache[cur * 3 + 2]];
                    const neighbors = [
                        cx > 0 ? cur - 1 : -1,
                        cx < gridW - 1 ? cur + 1 : -1,
                        cy > 0 ? cur - gridW : -1,
                        cy < gridH - 1 ? cur + gridW : -1,
                    ];
                    for (let k = 0; k < 4; k++) {
                        const nb = neighbors[k];
                        if (nb < 0 || visited[nb]) continue;
                        const nLab = [labCache[nb * 3], labCache[nb * 3 + 1], labCache[nb * 3 + 2]];
                        if (matchesBg(nb) || deltaE(cLab, nLab) <= localTol) {
                            visited[nb] = 1;
                            bgFlag[nb] = 1;
                            queue[qTail++] = nb;
                        }
                    }
                }

                let fgCount = 0;
                for (let i = 0; i < N; i++) {
                    mask[i] = bgFlag[i] ? 0 : 1;
                    if (mask[i]) fgCount++;
                }
                // Fallback if entire image got flooded or nothing got cut: keep foreground above threshold
                if (fgCount < N * 0.03) {
                    for (let i = 0; i < N; i++) mask[i] = 1;
                }
            }
        }

        if (opts.invertMask && opts.cutoutMode === 'object') {
            for (let i = 0; i < N; i++) mask[i] = mask[i] ? 0 : 1;
        }

        // Compute Distance-to-Edge Inflation Field (gives genuine sculpted 3D volume to flat photos!)
        const distField = new Float32Array(N);
        const INF = 1e6;
        for (let i = 0; i < N; i++) distField[i] = mask[i] ? INF : 0;
        // 2-pass Chamfer distance transform
        for (let y = 0; y < gridH; y++) {
            for (let x = 0; x < gridW; x++) {
                const i = y * gridW + x;
                if (distField[i] === 0) continue;
                let d = distField[i];
                if (x > 0) d = Math.min(d, distField[i - 1] + 1);
                if (y > 0) d = Math.min(d, distField[i - gridW] + 1);
                if (x > 0 && y > 0) d = Math.min(d, distField[i - gridW - 1] + 1.414);
                if (x < gridW - 1 && y > 0) d = Math.min(d, distField[i - gridW + 1] + 1.414);
                if (x === 0 || y === 0) d = Math.min(d, 1);
                distField[i] = d;
            }
        }
        let maxDist = 1;
        for (let y = gridH - 1; y >= 0; y--) {
            for (let x = gridW - 1; x >= 0; x--) {
                const i = y * gridW + x;
                if (distField[i] === 0) continue;
                let d = distField[i];
                if (x < gridW - 1) d = Math.min(d, distField[i + 1] + 1);
                if (y < gridH - 1) d = Math.min(d, distField[i + gridW] + 1);
                if (x < gridW - 1 && y < gridH - 1) d = Math.min(d, distField[i + gridW + 1] + 1.414);
                if (x > 0 && y < gridH - 1) d = Math.min(d, distField[i + gridW - 1] + 1.414);
                if (x === gridW - 1 || y === gridH - 1) d = Math.min(d, 1);
                distField[i] = d;
                if (d > maxDist) maxDist = d;
            }
        }

        // Combine silhouette inflation + luminance relief + Sobel detail
        let height = new Float32Array(N);
        for (let y = 0; y < gridH; y++) {
            for (let x = 0; x < gridW; x++) {
                const i = y * gridW + x;
                if (!mask[i]) { height[i] = 0; continue; }
                const normDist = Math.min(1, distField[i] / Math.max(4, maxDist * 0.72));
                // Smooth dome pillow profile (sqrt curve gives natural round statue edges!)
                const pillow = Math.pow(normDist, 0.55);
                // Local Sobel edge crispness
                const lL = x > 0 ? lum[i - 1] : lum[i];
                const lR = x < gridW - 1 ? lum[i + 1] : lum[i];
                const lU = y > 0 ? lum[i - gridW] : lum[i];
                const lD = y < gridH - 1 ? lum[i + gridW] : lum[i];
                const edgeDetail = Math.min(1, Math.hypot(lR - lL, lD - lU) * 1.4);

                const baseRelief = opts.cutoutMode === 'object'
                    ? (0.58 * pillow + 0.34 * lum[i] + 0.08 * sat[i] + 0.06 * edgeDetail)
                    : (0.18 * pillow + 0.68 * lum[i] + 0.08 * sat[i] + 0.08 * edgeDetail);
                height[i] = Math.max(0.06, Math.min(1.15, baseRelief));
            }
        }

        // Smooth depth map (box blur passes inside mask)
        const passes = Math.max(0, Math.min(4, Math.round(opts.smooth)));
        for (let p = 0; p < passes; p++) {
            const next = new Float32Array(N);
            for (let y = 0; y < gridH; y++) {
                for (let x = 0; x < gridW; x++) {
                    const i = y * gridW + x;
                    if (!mask[i]) continue;
                    let sum = height[i] * 2, wSum = 2;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            const nx = x + dx, ny = y + dy;
                            if (nx >= 0 && nx < gridW && ny >= 0 && ny < gridH) {
                                const ni = ny * gridW + nx;
                                if (mask[ni]) { sum += height[ni]; wSum += 1; }
                            }
                        }
                    }
                    next[i] = sum / wSum;
                }
            }
            height = next;
        }

        return { gridW, gridH, lum, sat, mask, rgb, height };
    }

    function ensurePhotoTexture() {
        if (photoTexture) photoTexture.dispose();
        photoTexture = new THREE.CanvasTexture(sourceCanvas);
        photoTexture.encoding = THREE.sRGBEncoding;
        photoTexture.needsUpdate = true;
        return photoTexture;
    }

    function makePhotoMaterial(withMap = true, flat = false) {
        const tex = withMap ? ensurePhotoTexture() : null;
        if (opts.renderMode === 'wireframe') {
            return new THREE.MeshBasicMaterial({
                color: 0x00f3ff, map: tex, wireframe: true,
            });
        }
        if (opts.renderMode === 'hologram') {
            return new THREE.MeshStandardMaterial({
                color: 0x67e8f9, map: tex, emissive: 0x00f3ff, emissiveIntensity: 0.48,
                roughness: 0.18, metalness: 0.35, transparent: true, opacity: 0.82,
                side: THREE.DoubleSide, flatShading: flat,
            });
        }
        if (opts.renderMode === 'crystal') {
            return new THREE.MeshPhysicalMaterial({
                color: 0xffffff, map: tex, emissive: 0x111827, emissiveIntensity: 0.12,
                roughness: 0.08, metalness: 0.18, clearcoat: 1.0, clearcoatRoughness: 0.05,
                transparent: true, opacity: 0.9, side: THREE.DoubleSide, flatShading: flat,
            });
        }
        if (opts.renderMode === 'ghost') {
            return new THREE.MeshStandardMaterial({
                color: 0xffffff, map: tex, transparent: true, opacity: 0.55,
                roughness: 0.25, metalness: 0.2, side: THREE.DoubleSide, flatShading: flat,
            });
        }
        // Solid PBR Sculpted Figurine (default — rich true-color photo shading without highlight blowout!)
        return new THREE.MeshStandardMaterial({
            color: 0xeaeef5,
            map: tex,
            roughness: flat ? 0.30 : 0.48,
            metalness: flat ? 0.32 : 0.08,
            side: THREE.DoubleSide,
            flatShading: flat,
        });
    }

    // ─── MODE 1 & 4: Double-Sided Sculpted 4D Bust / Prism Relief ───────────
    function buildSculptedBust(isPrism = false) {
        const res = isPrism ? Math.min(48, opts.resolution) : opts.resolution;
        const { gridW, gridH, mask, height, rgb, sat } = analyzeImage(res, res);
        const halfSize = 1.32;
        const depthScale = opts.depth * 0.95;

        // Compute foreground bounding box to center and scale object cleanly!
        let minX = gridW, maxX = 0, minY = gridH, maxY = 0;
        for (let y = 0; y < gridH; y++) {
            for (let x = 0; x < gridW; x++) {
                if (mask[y * gridW + x]) {
                    if (x < minX) minX = x; if (x > maxX) maxX = x;
                    if (y < minY) minY = y; if (y > maxY) maxY = y;
                }
            }
        }
        if (minX >= maxX) { minX = 0; maxX = gridW - 1; minY = 0; maxY = gridH - 1; }
        const cx = (minX + maxX) * 0.5, cy = (minY + maxY) * 0.5;
        const span = Math.max(maxX - minX, maxY - minY, 1);

        // Front & Back vertex lookup tables
        const frontIdx = new Int32Array(gridW * gridH).fill(-1);
        const backIdx = new Int32Array(gridW * gridH).fill(-1);
        const pos = [];
        const uvs = [];
        const colors = [];
        const verts4d = [];

        const pushVert = (x, y, z, w, u, v, r, g, b) => {
            const id = verts4d.length;
            pos.push(x, y, z);
            uvs.push(u, v);
            colors.push(r / 255, g / 255, b / 255);
            verts4d.push([x, y, z, w]);
            return id;
        };

        for (let y = 0; y < gridH; y++) {
            for (let x = 0; x < gridW; x++) {
                const i = y * gridW + x;
                if (!mask[i]) continue;
                const wx = ((x - cx) / span) * halfSize * 2;
                const wy = -((y - cy) / span) * halfSize * 2;
                const u = x / (gridW - 1);
                const v = 1 - y / (gridH - 1);
                const h = height[i] * depthScale;
                const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2];
                // 4th dimension W derived from sculpted height + radial curvature + color saturation!
                const radial = Math.hypot(wx, wy);
                const wVal = (h * 0.85 + Math.cos(radial * 2.2) * 0.25 + sat[i] * 0.22) * opts.wAmp;

                frontIdx[i] = pushVert(wx, wy, h, wVal, u, v, r, g, b);
                const backZ = opts.doubleSided ? -h * 0.78 : -0.06;
                const backW = opts.doubleSided ? -wVal * 0.72 : -0.05 * opts.wAmp;
                backIdx[i] = pushVert(wx, wy, backZ, backW, u, v, r, g, b);
            }
        }

        const indices = [];
        const cellActive = new Uint8Array((gridW - 1) * (gridH - 1));

        // Front + Back faces
        for (let y = 0; y < gridH - 1; y++) {
            for (let x = 0; x < gridW - 1; x++) {
                const i00 = y * gridW + x;
                const i10 = i00 + 1;
                const i01 = i00 + gridW;
                const i11 = i01 + 1;
                const f00 = frontIdx[i00], f10 = frontIdx[i10], f01 = frontIdx[i01], f11 = frontIdx[i11];
                if (f00 >= 0 && f10 >= 0 && f01 >= 0 && f11 >= 0) {
                    cellActive[y * (gridW - 1) + x] = 1;
                    // Front CCW
                    indices.push(f00, f01, f10, f10, f01, f11);
                    // Back CW (outward normal -Z)
                    const b00 = backIdx[i00], b10 = backIdx[i10], b01 = backIdx[i01], b11 = backIdx[i11];
                    indices.push(b00, b10, b01, b10, b11, b01);
                }
            }
        }

        // Stitch watertight outer silhouette boundary skirt between front & back!
        const cw = gridW - 1, ch = gridH - 1;
        for (let y = 0; y < ch; y++) {
            for (let x = 0; x < cw; x++) {
                if (!cellActive[y * cw + x]) continue;
                const i00 = y * gridW + x, i10 = i00 + 1, i01 = i00 + gridW, i11 = i01 + 1;
                // Top boundary
                if (y === 0 || !cellActive[(y - 1) * cw + x]) {
                    indices.push(frontIdx[i00], frontIdx[i10], backIdx[i10], frontIdx[i00], backIdx[i10], backIdx[i00]);
                }
                // Bottom boundary
                if (y === ch - 1 || !cellActive[(y + 1) * cw + x]) {
                    indices.push(frontIdx[i11], frontIdx[i01], backIdx[i01], frontIdx[i11], backIdx[i01], backIdx[i11]);
                }
                // Left boundary
                if (x === 0 || !cellActive[y * cw + (x - 1)]) {
                    indices.push(frontIdx[i01], frontIdx[i00], backIdx[i00], frontIdx[i01], backIdx[i00], backIdx[i01]);
                }
                // Right boundary
                if (x === cw - 1 || !cellActive[y * cw + (x + 1)]) {
                    indices.push(frontIdx[i10], frontIdx[i11], backIdx[i11], frontIdx[i10], backIdx[i11], backIdx[i10]);
                }
            }
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geo.setIndex(indices);
        geo.computeVertexNormals();

        const mat = makePhotoMaterial(true, isPrism);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true; mesh.receiveShadow = true;
        group.add(mesh);

        // Optional crystal/prism neon wireframe overlay
        if (isPrism || opts.renderMode === 'cyber' || opts.renderMode === 'hologram') {
            const wireMat = new THREE.MeshBasicMaterial({
                color: 0x00f3ff, wireframe: true, transparent: true, opacity: isPrism ? 0.24 : 0.16,
            });
            const wireMesh = new THREE.Mesh(geo, wireMat);
            wireMesh.userData.isOverlay = true;
            group.add(wireMesh);
        }

        animData = { type: 'mesh4d', mesh, baseVerts4d: verts4d, faces: indices };
        return { vertsCount: verts4d.length, trisCount: Math.floor(indices.length / 3) };
    }

    // ─── MODE 2: 360-Degree 4D Rotational Sculpture (Lathe from Silhouette) ─
    function buildLathe360() {
        const res = Math.min(80, opts.resolution);
        const { gridW, gridH, mask, rgb } = analyzeImage(res, res);
        const radialSegs = 36;

        // Extract left-to-right foreground span per row
        const profile = [];
        for (let y = 0; y < gridH; y++) {
            let xMin = gridW, xMax = -1;
            let rSum = 0, gSum = 0, bSum = 0, cnt = 0;
            for (let x = 0; x < gridW; x++) {
                const i = y * gridW + x;
                if (mask[i]) {
                    if (x < xMin) xMin = x;
                    if (x > xMax) xMax = x;
                    rSum += rgb[i * 3]; gSum += rgb[i * 3 + 1]; bSum += rgb[i * 3 + 2]; cnt++;
                }
            }
            if (xMax >= xMin && cnt > 0) {
                const halfR = ((xMax - xMin + 1) / gridW) * 1.25;
                profile.push({
                    yNorm: y / (gridH - 1),
                    r: Math.max(0.03, halfR),
                    col: [rSum / cnt / 255, gSum / cnt / 255, bSum / cnt / 255],
                });
            }
        }
        if (profile.length < 4) return buildSculptedBust(false);

        // Smooth radius profile slightly
        for (let pass = 0; pass < Math.max(1, opts.smooth); pass++) {
            for (let i = 1; i < profile.length - 1; i++) {
                profile[i].r = (profile[i - 1].r + profile[i].r * 2 + profile[i + 1].r) * 0.25;
            }
        }

        const pos = [], uvs = [], colors = [], verts4d = [], indices = [];
        const rows = profile.length;
        const yMin = profile[0].yNorm, yMax = profile[rows - 1].yNorm;
        const ySpan = Math.max(0.05, yMax - yMin);

        for (let yi = 0; yi < rows; yi++) {
            const p = profile[yi];
            const wy = (0.5 - (p.yNorm - yMin) / ySpan) * 2.4;
            const vCoord = 1 - p.yNorm;
            const rad = p.r * (0.75 + opts.depth * 0.55);
            for (let j = 0; j <= radialSegs; j++) {
                const uFrac = j / radialSegs;
                const a = uFrac * TAU;
                const x = rad * Math.cos(a);
                const z = rad * Math.sin(a);
                const w = Math.sin(a * 2 + wy * 1.4) * rad * 0.55 * opts.wAmp;
                // Map front/back half of photo cleanly around the sculpture
                const uImg = 0.5 + 0.45 * Math.cos(a);
                pos.push(x, wy, z);
                uvs.push(uImg, vCoord);
                colors.push(p.col[0], p.col[1], p.col[2]);
                verts4d.push([x, wy, z, w]);
            }
        }

        const stride = radialSegs + 1;
        for (let yi = 0; yi < rows - 1; yi++) {
            for (let j = 0; j < radialSegs; j++) {
                const a = yi * stride + j;
                const b = (yi + 1) * stride + j;
                const c = (yi + 1) * stride + j + 1;
                const d = yi * stride + j + 1;
                indices.push(a, b, c, a, c, d);
            }
        }

        // Top & bottom caps for watertight 3D printing!
        const topCenter = verts4d.length;
        pos.push(0, (0.5) * 2.4, 0); uvs.push(0.5, 1); colors.push(...profile[0].col); verts4d.push([0, 1.2, 0, 0]);
        const botCenter = verts4d.length;
        pos.push(0, (-0.5) * 2.4, 0); uvs.push(0.5, 0); colors.push(...profile[rows - 1].col); verts4d.push([0, -1.2, 0, 0]);
        for (let j = 0; j < radialSegs; j++) {
            indices.push(topCenter, j + 1, j);
            const lastRow = (rows - 1) * stride;
            indices.push(botCenter, lastRow + j, lastRow + j + 1);
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geo.setIndex(indices);
        geo.computeVertexNormals();

        const mesh = new THREE.Mesh(geo, makePhotoMaterial(true, false));
        group.add(mesh);

        animData = { type: 'mesh4d', mesh, baseVerts4d: verts4d, faces: indices };
        return { vertsCount: verts4d.length, trisCount: Math.floor(indices.length / 3) };
    }

    // ─── MODE 3: 4D Hyper-Voxel Crystal Sculpture (1 GPU InstancedMesh!) ────
    function buildHyperVoxels() {
        const res = 32;
        const { gridW, gridH, mask, height, rgb, sat } = analyzeImage(res, res);

        const voxels = [];
        let minX = gridW, maxX = 0, minY = gridH, maxY = 0;
        for (let y = 0; y < gridH; y++) {
            for (let x = 0; x < gridW; x++) {
                if (mask[y * gridW + x]) {
                    if (x < minX) minX = x; if (x > maxX) maxX = x;
                    if (y < minY) minY = y; if (y > maxY) maxY = y;
                }
            }
        }
        const cx = (minX + maxX) * 0.5, cy = (minY + maxY) * 0.5;
        const span = Math.max(maxX - minX, maxY - minY, 1);
        const cellSize = (2.5 / span) * 0.92;

        for (let y = 0; y < gridH; y++) {
            for (let x = 0; x < gridW; x++) {
                const i = y * gridW + x;
                if (!mask[i]) continue;
                const wx = ((x - cx) / span) * 2.5;
                const wy = -((y - cy) / span) * 2.5;
                const h = height[i];
                const zExt = (0.14 + h * opts.depth * 1.45);
                const wVal = (h * 0.8 + sat[i] * 0.35 - 0.35) * opts.wAmp;
                voxels.push({
                    v4: [wx, wy, opts.doubleSided ? 0 : zExt * 0.5, wVal],
                    sx: cellSize, sy: cellSize, sz: zExt,
                    color: new THREE.Color(rgb[i * 3] / 255, rgb[i * 3 + 1] / 255, rgb[i * 3 + 2] / 255),
                });
            }
        }

        const boxGeo = new THREE.BoxGeometry(1, 1, 1);
        const mat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: opts.renderMode === 'crystal' ? 0.12 : 0.28,
            metalness: opts.renderMode === 'crystal' ? 0.25 : 0.35,
            transparent: opts.renderMode === 'crystal' || opts.renderMode === 'ghost',
            opacity: opts.renderMode === 'ghost' ? 0.48 : (opts.renderMode === 'crystal' ? 0.85 : 1.0),
            wireframe: opts.renderMode === 'wireframe',
        });

        const inst = new THREE.InstancedMesh(boxGeo, mat, Math.max(1, voxels.length));
        const dummy = new THREE.Object3D();
        voxels.forEach((vx, idx) => {
            dummy.position.set(vx.v4[0], vx.v4[1], vx.v4[2]);
            dummy.scale.set(vx.sx, vx.sy, vx.sz);
            dummy.updateMatrix();
            inst.setMatrixAt(idx, dummy.matrix);
            inst.setColorAt(idx, vx.color);
        });
        inst.instanceMatrix.needsUpdate = true;
        if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
        group.add(inst);

        animData = { type: 'voxels4d', inst, voxels };
        return { vertsCount: voxels.length * 8, trisCount: voxels.length * 12 };
    }

    // ─── MODE 5: 4D Tesseract Photo-Cube (24 UV-mapped crystal faces!) ──────
    function buildPhotoTesseract() {
        const fig = Figures.generate('tesseract', { radius: 1.05, tube: 0.3, segs: 24, twist: 0, wOffset: 0 });
        const tex = ensurePhotoTexture();

        // Build 24 independent UV-mapped square quads (48 triangles) so photo maps cleanly on EVERY 4D cell face!
        const faceQuads = [];
        for (let f = 0; f < fig.faces.length; f += 2) {
            const t1 = fig.faces[f], t2 = fig.faces[f + 1];
            if (!t1 || !t2) continue;
            faceQuads.push([t1[0], t1[1], t1[2], t2[2]]);
        }

        const pos = new Float32Array(faceQuads.length * 6 * 3);
        const uvs = new Float32Array(faceQuads.length * 6 * 2);
        const qUV = [[0, 0], [1, 0], [1, 1], [0, 0], [1, 1], [0, 1]];
        for (let q = 0; q < faceQuads.length; q++) {
            for (let k = 0; k < 6; k++) {
                uvs[(q * 6 + k) * 2] = qUV[k][0];
                uvs[(q * 6 + k) * 2 + 1] = qUV[k][1];
            }
        }
        const faceGeo = new THREE.BufferGeometry();
        faceGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        faceGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

        const faceMat = new THREE.MeshPhysicalMaterial({
            color: 0xffffff, map: tex,
            roughness: 0.14, metalness: 0.15, clearcoat: 0.9,
            transparent: true, opacity: opts.renderMode === 'solid' ? 0.88 : 0.65,
            side: THREE.DoubleSide,
        });
        const faceMesh = new THREE.Mesh(faceGeo, faceMat);
        group.add(faceMesh);

        // Volumetric neon edge struts via InstancedMesh
        const cylGeo = new THREE.CylinderGeometry(0.028, 0.028, 1, 8);
        const strutMat = new THREE.MeshStandardMaterial({
            color: 0x00f3ff, emissive: 0x00f3ff, emissiveIntensity: 0.75,
            roughness: 0.2, metalness: 0.7,
        });
        const struts = new THREE.InstancedMesh(cylGeo, strutMat, fig.edges.length);
        group.add(struts);

        // Glowing corner vertices
        const gemGeo = new THREE.OctahedronGeometry(0.06, 1);
        const gemMat = new THREE.MeshStandardMaterial({
            color: 0xff00ea, emissive: 0xff00ea, emissiveIntensity: 0.9,
            roughness: 0.1, metalness: 0.6,
        });
        const gems = new THREE.InstancedMesh(gemGeo, gemMat, fig.verts.length);
        group.add(gems);

        animData = {
            type: 'tesseract4d',
            baseVerts4d: fig.verts,
            edges: fig.edges,
            faceQuads,
            faceMesh,
            struts,
            gems,
        };
        return { vertsCount: fig.verts.length, trisCount: faceQuads.length * 2 + fig.edges.length * 16 };
    }

    // ─── Public API ──────────────────────────────────────────────────────────
    function disposeGroup(grp) {
        if (!grp) return;
        grp.traverse(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                else obj.material.dispose();
            }
        });
    }

    function loadImageElement(img, name = 'photo-4d') {
        const S = 512;
        const c = document.createElement('canvas');
        c.width = S; c.height = S;
        const ctx = c.getContext('2d');
        // Fit image preserving aspect ratio cleanly centered
        const aspect = img.width / Math.max(1, img.height);
        let dw = S, dh = S, dx = 0, dy = 0;
        if (aspect > 1) { dh = S / aspect; dy = (S - dh) * 0.5; }
        else { dw = S * aspect; dx = (S - dw) * 0.5; }
        // Fill margin with top-left corner pixel color so cutout treats letterbox as background!
        const probe = document.createElement('canvas');
        probe.width = 4; probe.height = 4;
        const pCtx = probe.getContext('2d');
        pCtx.drawImage(img, 0, 0, 4, 4);
        const px = pCtx.getImageData(0, 0, 1, 1).data;
        if (px[3] > 200) {
            ctx.fillStyle = `rgb(${px[0]},${px[1]},${px[2]})`;
            ctx.fillRect(0, 0, S, S);
        }
        ctx.drawImage(img, dx, dy, dw, dh);
        sourceCanvas = c;
        sourceName = name.replace(/\.[^/.]+$/, '');
    }

    function loadFile(file, scene) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const img = new Image();
                img.onload = () => {
                    loadImageElement(img, file.name || 'photo-4d');
                    const stats = rebuild(scene);
                    resolve(stats);
                };
                img.onerror = reject;
                img.src = reader.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function loadFromDataURL(dataUrl, scene, name = 'photo-4d') {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                loadImageElement(img, name);
                const stats = rebuild(scene);
                resolve(stats);
            };
            img.onerror = reject;
            img.src = dataUrl;
        });
    }

    function loadDemo(demoId, scene) {
        sourceCanvas = createDemoCanvas(demoId);
        sourceName = `photo4d-${demoId}`;
        return rebuild(scene);
    }

    function rebuild(scene) {
        if (scene) currentScene = scene;
        if (!currentScene) return null;
        if (!sourceCanvas) sourceCanvas = createDemoCanvas('lion');

        if (group) {
            currentScene.remove(group);
            disposeGroup(group);
        }
        group = new THREE.Group();
        group.name = sourceName;
        group.userData.isPhoto4D = true;
        currentScene.add(group);
        active = true;

        let stats;
        switch (opts.mode) {
            case 'lathe':     stats = buildLathe360(); break;
            case 'voxels':    stats = buildHyperVoxels(); break;
            case 'prism':     stats = buildSculptedBust(true); break;
            case 'tesseract': stats = buildPhotoTesseract(); break;
            case 'bust':
            default:          stats = buildSculptedBust(false); break;
        }
        // Apply an initial 4D frame so Tesseract/voxels are immediately positioned!
        update(0, { xy: 0, xz: 0, xw: 0, yz: 0, yw: 0, zw: 0 }, { xy: false, xz: false, xw: false, yz: false, yw: false, zw: false }, 'stereo', 0);
        return { ...stats, name: sourceName, previewDataURL: sourceCanvas.toDataURL('image/png') };
    }

    // Reusable temp objects (zero per-frame GC!)
    const _up = new THREE.Vector3(0, 1, 0);
    const _vA = new THREE.Vector3();
    const _vB = new THREE.Vector3();
    const _mid = new THREE.Vector3();
    const _dir = new THREE.Vector3();
    const _quat = new THREE.Quaternion();
    const _scale = new THREE.Vector3();
    const _mat = new THREE.Matrix4();

    /**
     * Real-time 4D projection & breathing update for active Photo-4D sculpture!
     */
    function update(t, rotAngles, rotEnabled, projMode, wOffset = 0) {
        if (!active || !animData || !group) return;

        const has4DRot = (rotEnabled.xw && Math.abs(rotAngles.xw) > 1e-4) ||
                         (rotEnabled.yw && Math.abs(rotAngles.yw) > 1e-4) ||
                         (rotEnabled.zw && Math.abs(rotAngles.zw) > 1e-4) ||
                         (rotEnabled.xy && Math.abs(rotAngles.xy) > 1e-4) ||
                         (rotEnabled.xz && Math.abs(rotAngles.xz) > 1e-4) ||
                         (rotEnabled.yz && Math.abs(rotAngles.yz) > 1e-4) ||
                         Math.abs(wOffset) > 1e-4;

        if (animData.type === 'mesh4d') {
            const { mesh, baseVerts4d } = animData;
            const posAttr = mesh.geometry.attributes.position;
            const arr = posAttr.array;
            const n = baseVerts4d.length;
            const wavePhase = t * 1.4;

            if (!has4DRot && opts.wAmp < 0.01) return;

            for (let i = 0; i < n; i++) {
                const bv = baseVerts4d[i];
                const v4 = [bv[0], bv[1], bv[2], bv[3] + wOffset + Math.sin(wavePhase + bv[0] * 1.8 + bv[1] * 1.8) * 0.08 * opts.wAmp];
                const r4 = Math4D.rotate4D(v4, rotAngles, rotEnabled);
                const p3 = Math4D.projectPoint(r4, projMode, 4.2);
                arr[i * 3]     = p3.x;
                arr[i * 3 + 1] = p3.y;
                arr[i * 3 + 2] = p3.z;
            }
            posAttr.needsUpdate = true;
            mesh.geometry.computeVertexNormals();

        } else if (animData.type === 'voxels4d') {
            const { inst, voxels } = animData;
            for (let i = 0; i < voxels.length; i++) {
                const vx = voxels[i];
                const v4 = [vx.v4[0], vx.v4[1], vx.v4[2], vx.v4[3] + wOffset];
                const r4 = Math4D.rotate4D(v4, rotAngles, rotEnabled);
                const p3 = Math4D.projectPoint(r4, projMode, 4.2);
                _mid.set(p3.x, p3.y, p3.z);
                _quat.setFromEuler(new THREE.Euler(r4[3] * 0.35, r4[3] * 0.25, 0));
                _scale.set(vx.sx * p3.scale, vx.sy * p3.scale, vx.sz * (0.75 + 0.25 * p3.scale));
                _mat.compose(_mid, _quat, _scale);
                inst.setMatrixAt(i, _mat);
            }
            inst.instanceMatrix.needsUpdate = true;

        } else if (animData.type === 'tesseract4d') {
            const { baseVerts4d, edges, faceQuads, faceMesh, struts, gems } = animData;
            const proj = baseVerts4d.map(bv => {
                const r4 = Math4D.rotate4D([bv[0], bv[1], bv[2], bv[3] + wOffset], rotAngles, rotEnabled);
                return Math4D.projectPoint(r4, projMode, 3.6);
            });

            // Update 24 photo-mapped faces
            const pArr = faceMesh.geometry.attributes.position.array;
            let o = 0;
            for (let q = 0; q < faceQuads.length; q++) {
                const [i0, i1, i2, i3] = faceQuads[q];
                const pts = [proj[i0], proj[i1], proj[i2], proj[i0], proj[i2], proj[i3]];
                for (let k = 0; k < 6; k++) {
                    pArr[o++] = pts[k].x; pArr[o++] = pts[k].y; pArr[o++] = pts[k].z;
                }
            }
            faceMesh.geometry.attributes.position.needsUpdate = true;
            faceMesh.geometry.computeVertexNormals();

            // Update 32 struts
            for (let e = 0; e < edges.length; e++) {
                const a = proj[edges[e][0]], b = proj[edges[e][1]];
                _vA.set(a.x, a.y, a.z);
                _vB.set(b.x, b.y, b.z);
                _mid.addVectors(_vA, _vB).multiplyScalar(0.5);
                _dir.subVectors(_vB, _vA);
                const len = _dir.length();
                if (len < 1e-5) { _scale.set(0, 0, 0); }
                else {
                    _quat.setFromUnitVectors(_up, _dir.normalize());
                    const avgS = Math.max(0.5, Math.min(1.8, (a.scale + b.scale) * 0.5));
                    _scale.set(avgS, len, avgS);
                }
                _mat.compose(_mid, _quat, _scale);
                struts.setMatrixAt(e, _mat);
            }
            struts.instanceMatrix.needsUpdate = true;

            // Update 16 corner gems
            for (let i = 0; i < proj.length; i++) {
                const p = proj[i];
                _mid.set(p.x, p.y, p.z);
                _quat.identity();
                const gs = Math.max(0.5, Math.min(1.8, p.scale));
                _scale.set(gs, gs, gs);
                _mat.compose(_mid, _quat, _scale);
                gems.setMatrixAt(i, _mat);
            }
            gems.instanceMatrix.needsUpdate = true;
        }
    }

    function remove(scene) {
        const targetScene = scene || currentScene;
        if (group && targetScene) {
            targetScene.remove(group);
            disposeGroup(group);
        }
        group = null;
        animData = null;
        active = false;
    }

    function setOptions(patch, scene) {
        Object.assign(opts, patch);
        if (active && sourceCanvas) return rebuild(scene || currentScene);
        return null;
    }

    function getOptions() { return { ...opts }; }
    function getGroup() { return group; }
    function isActive() { return active; }
    function getName() { return sourceName; }
    function getPreviewDataURL() { return sourceCanvas ? sourceCanvas.toDataURL('image/png') : null; }
    function exportDataURL() { return sourceCanvas ? sourceCanvas.toDataURL('image/jpeg', 0.85) : null; }

    return {
        loadFile, loadFromDataURL, loadDemo, rebuild, update, remove,
        setOptions, getOptions, getGroup, isActive, getName, getPreviewDataURL, exportDataURL,
    };
})();

if (typeof window !== 'undefined') window.Photo4DEngine = Photo4DEngine;
if (typeof module !== 'undefined' && module.exports) module.exports = Photo4DEngine;
