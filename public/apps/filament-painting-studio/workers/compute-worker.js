// ==========================================
// OFF-THREAD COMPUTE WORKER (CIEDE2000 ΔE Stack Solver & TD Curve Fitter)
// ==========================================

const SRGB_TO_LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) {
    const s = i / 255;
    SRGB_TO_LIN[i] = s <= 0.04045 ? (s / 12.92) : Math.pow((s + 0.055) / 1.055, 2.4);
}

function linToSrgb255(c) {
    const v = Math.max(0, Math.min(1, c));
    const s = v <= 0.0031308 ? (v * 12.92) : (1.055 * Math.pow(v, 1 / 2.4) - 0.055);
    return Math.round(Math.max(0, Math.min(1, s)) * 255);
}

function hexToRgbWorker(hex) {
    let clean = String(hex || '#000000').replace('#', '').trim();
    if (clean.length === 3) clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
    const v = parseInt(clean, 16);
    if (!isFinite(v)) return [0, 0, 0];
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function rgbToLab(r, g, b) {
    const lr = SRGB_TO_LIN[Math.max(0, Math.min(255, r | 0))];
    const lg = SRGB_TO_LIN[Math.max(0, Math.min(255, g | 0))];
    const lb = SRGB_TO_LIN[Math.max(0, Math.min(255, b | 0))];
    const x = (lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375) / 0.95047;
    const y = (lr * 0.2126729 + lg * 0.7151522 + lb * 0.0721750);
    const z = (lr * 0.0193339 + lg * 0.1191920 + lb * 0.9503041) / 1.08883;
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : (7.787 * t + 16 / 116));
    const fx = f(x), fy = f(y), fz = f(z);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function deltaE2000(lab1, lab2) {
    const L1 = lab1[0], a1 = lab1[1], b1 = lab1[2];
    const L2 = lab2[0], a2 = lab2[1], b2 = lab2[2];
    const kL = 1, kC = 1, kH = 1;
    const C1 = Math.sqrt(a1 * a1 + b1 * b1);
    const C2 = Math.sqrt(a2 * a2 + b2 * b2);
    const Cbar = (C1 + C2) * 0.5;
    const Cbar7 = Math.pow(Cbar, 7);
    const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + 6103515625))); // 25^7
    const a1p = (1 + G) * a1;
    const a2p = (1 + G) * a2;
    const C1p = Math.sqrt(a1p * a1p + b1 * b1);
    const C2p = Math.sqrt(a2p * a2p + b2 * b2);
    const h1p = (C1p === 0) ? 0 : ((Math.atan2(b1, a1p) * 180 / Math.PI) + 360) % 360;
    const h2p = (C2p === 0) ? 0 : ((Math.atan2(b2, a2p) * 180 / Math.PI) + 360) % 360;

    const dLp = L2 - L1;
    const dCp = C2p - C1p;
    let dhp = 0;
    if (C1p * C2p !== 0) {
        const diff = h2p - h1p;
        if (Math.abs(diff) <= 180) dhp = diff;
        else if (diff > 180) dhp = diff - 360;
        else dhp = diff + 360;
    }
    const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp * Math.PI / 180) * 0.5);

    const Lpbar = (L1 + L2) * 0.5;
    const Cpbar = (C1p + C2p) * 0.5;
    let Hpbar = h1p + h2p;
    if (C1p * C2p === 0) {
        Hpbar = h1p + h2p;
    } else if (Math.abs(h1p - h2p) <= 180) {
        Hpbar = (h1p + h2p) * 0.5;
    } else if (h1p + h2p < 360) {
        Hpbar = (h1p + h2p + 360) * 0.5;
    } else {
        Hpbar = (h1p + h2p - 360) * 0.5;
    }

    const rad = Math.PI / 180;
    const T = 1
        - 0.17 * Math.cos((Hpbar - 30) * rad)
        + 0.24 * Math.cos((2 * Hpbar) * rad)
        + 0.32 * Math.cos((3 * Hpbar + 6) * rad)
        - 0.20 * Math.cos((4 * Hpbar - 63) * rad);

    const dTheta = 30 * Math.exp(-Math.pow((Hpbar - 275) / 25, 2));
    const Cpbar7 = Math.pow(Cpbar, 7);
    const RC = 2 * Math.sqrt(Cpbar7 / (Cpbar7 + 6103515625));
    const Lp50sq = (Lpbar - 50) * (Lpbar - 50);
    const SL = 1 + (0.015 * Lp50sq) / Math.sqrt(20 + Lp50sq);
    const SC = 1 + 0.045 * Cpbar;
    const SH = 1 + 0.015 * Cpbar * T;
    const RT = -Math.sin(2 * dTheta * rad) * RC;

    const termL = dLp / (kL * SL);
    const termC = dCp / (kC * SC);
    const termH = dHp / (kH * SH);
    return Math.sqrt(termL * termL + termC * termC + termH * termH + RT * termC * termH);
}

function simulateOpticalStack(effZ, baseZ, maxReliefZ, sortedSpools, blendStrength, model) {
    const n = sortedSpools.length;
    if (n === 0) return [0, 0, 0];
    let accR = sortedSpools[0].lin[0];
    let accG = sortedSpools[0].lin[1];
    let accB = sortedSpools[0].lin[2];
    const span = Math.max(0.1, maxReliefZ - baseZ);

    for (let i = 1; i < n; i++) {
        const curr = sortedSpools[i];
        const layerStartZ = baseZ + curr.startPct * span;
        if (effZ <= layerStartZ) break;
        const nextStartZ = (i + 1 < n) ? (baseZ + sortedSpools[i + 1].startPct * span) : maxReliefZ;
        const bandTopZ = Math.min(effZ, Math.max(layerStartZ, nextStartZ));
        const dz = bandTopZ - layerStartZ;
        if (dz <= 1e-5) continue;

        const effTd = Math.max(0.08, (curr.td || 1.5) * (0.18 + blendStrength * 1.15));
        if (model === 'cubic') {
            const u = Math.min(1, dz / Math.max(0.12, effTd));
            const alpha = u * u * (3 - 2 * u);
            accR = accR + (curr.lin[0] - accR) * alpha;
            accG = accG + (curr.lin[1] - accG) * alpha;
            accB = accB + (curr.lin[2] - accB) * alpha;
        } else if (model === 'beer_lambert') {
            const alpha = 1.0 - Math.exp(-4.60517 * dz / effTd);
            accR = accR + (curr.lin[0] - accR) * alpha;
            accG = accG + (curr.lin[1] - accG) * alpha;
            accB = accB + (curr.lin[2] - accB) * alpha;
        } else {
            // Kubelka-Munk two-flux reflectance approximation in Linear RGB
            const tau = 3.45 * dz / effTd;
            const T = Math.exp(-tau);
            const oneMinusT = 1.0 - T;
            const bounceR = 1.0 / Math.max(0.65, 1.0 - accR * (1.0 - curr.lin[0]) * 0.16 * oneMinusT);
            const bounceG = 1.0 / Math.max(0.65, 1.0 - accG * (1.0 - curr.lin[1]) * 0.16 * oneMinusT);
            const bounceB = 1.0 / Math.max(0.65, 1.0 - accB * (1.0 - curr.lin[2]) * 0.16 * oneMinusT);
            accR = Math.min(1, curr.lin[0] * oneMinusT + accR * T * bounceR);
            accG = Math.min(1, curr.lin[1] * oneMinusT + accG * T * bounceG);
            accB = Math.min(1, curr.lin[2] * oneMinusT + accB * T * bounceB);
        }
    }
    return [linToSrgb255(accR), linToSrgb255(accG), linToSrgb255(accB)];
}

function prepareSpools(rawSpools) {
    return rawSpools.map((f, i) => {
        const rgb = hexToRgbWorker(f.color || f.hex);
        const lab = rgbToLab(rgb[0], rgb[1], rgb[2]);
        return {
            ...f,
            origIdx: f.origIdx !== undefined ? f.origIdx : i,
            color: f.color || f.hex,
            rgb,
            lin: [SRGB_TO_LIN[rgb[0]], SRGB_TO_LIN[rgb[1]], SRGB_TO_LIN[rgb[2]]],
            lab,
            L: lab[0],
            td: Math.max(0.2, parseFloat(f.td) || 1.5),
            startPct: typeof f.startPct === 'number' ? f.startPct : 0
        };
    });
}

function evaluateStackDeltaE(samples, sortedSpools, params) {
    const { baseZ, maxReliefZ, blendStrength, opticalModel, colorMode } = params;
    const span = Math.max(0.1, maxReliefZ - baseZ);
    let totalDE = 0;
    let maxDE = 0;
    const count = samples.length;

    if (colorMode === 'chromatic') {
        for (let i = 0; i < count; i++) {
            const s = samples[i];
            let bestDE = 999;
            for (let k = 0; k < sortedSpools.length; k++) {
                const d = deltaE2000(s.lab, sortedSpools[k].lab);
                if (d < bestDE) bestDE = d;
            }
            totalDE += bestDE;
            if (bestDE > maxDE) maxDE = bestDE;
        }
    } else {
        for (let i = 0; i < count; i++) {
            const s = samples[i];
            const effZ = baseZ + s.lum * span;
            const simRgb = simulateOpticalStack(effZ, baseZ, maxReliefZ, sortedSpools, blendStrength, opticalModel);
            const simLab = rgbToLab(simRgb[0], simRgb[1], simRgb[2]);
            const d = deltaE2000(s.lab, simLab);
            totalDE += d;
            if (d > maxDE) maxDE = d;
        }
    }

    const avgDeltaE = count > 0 ? totalDE / count : 0;
    return {
        avgDeltaE,
        maxDeltaE: maxDE,
        matchScorePct: Math.max(0, Math.min(100, Math.round(100 - avgDeltaE * 2.15)))
    };
}

function optimizeThresholds(samples, sortedSpools, params) {
    const n = sortedSpools.length;
    if (n <= 1) return evaluateStackDeltaE(samples, sortedSpools, params);

    sortedSpools[0].startPct = 0.0;
    for (let i = 1; i < n; i++) {
        if (sortedSpools[i].startPct <= sortedSpools[i - 1].startPct + 0.03) {
            sortedSpools[i].startPct = Math.min(0.95, (i / n) * 0.92);
        }
    }

    let bestEval = evaluateStackDeltaE(samples, sortedSpools, params);
    const steps = [0.10, 0.05, 0.02, 0.01];
    for (let p = 0; p < steps.length; p++) {
        const delta = steps[p];
        for (let i = 1; i < n; i++) {
            const minV = Math.min(0.94, sortedSpools[i - 1].startPct + 0.03);
            const maxV = (i + 1 < n) ? Math.max(minV, sortedSpools[i + 1].startPct - 0.03) : 0.96;
            const orig = sortedSpools[i].startPct;
            let bestVal = orig;
            for (const dir of [-delta, delta, -delta * 2, delta * 2]) {
                const cand = Math.max(minV, Math.min(maxV, orig + dir));
                sortedSpools[i].startPct = cand;
                const ev = evaluateStackDeltaE(samples, sortedSpools, params);
                if (ev.avgDeltaE < bestEval.avgDeltaE - 0.005) {
                    bestEval = ev;
                    bestVal = cand;
                }
            }
            sortedSpools[i].startPct = bestVal;
        }
    }
    return bestEval;
}

function selectOptimalOwnedSubset(samples, poolRaw, targetCount, params) {
    const pool = prepareSpools(poolRaw);
    const k = Math.max(2, Math.min(targetCount, pool.length));
    if (pool.length <= k) {
        pool.sort((a, b) => a.L - b.L);
        const ev = optimizeThresholds(samples, pool, params);
        return { spools: pool, evalRes: ev };
    }

    // Greedy forward selection with darkest-to-lightest luminance anchor + chromatic coverage
    pool.sort((a, b) => a.L - b.L);
    const chosen = [];
    // Anchor 1: closest spool to the darkest 10th-percentile photo sample
    const sortedSamples = [...samples].sort((a, b) => a.lum - b.lum);
    const darkTarget = sortedSamples[Math.floor(sortedSamples.length * 0.08)] || sortedSamples[0];
    const brightTarget = sortedSamples[Math.floor(sortedSamples.length * 0.92)] || sortedSamples[sortedSamples.length - 1];

    const pickBestForTarget = (targetLab, excludeSet) => {
        let best = null, bestD = 9999;
        for (const sp of pool) {
            if (excludeSet.has(sp)) continue;
            const d = deltaE2000(targetLab, sp.lab);
            if (d < bestD) { bestD = d; best = sp; }
        }
        return best;
    };

    const used = new Set();
    const darkAnchor = pickBestForTarget(darkTarget.lab, used);
    if (darkAnchor) { chosen.push(darkAnchor); used.add(darkAnchor); }
    const brightAnchor = pickBestForTarget(brightTarget.lab, used);
    if (brightAnchor && chosen.length < k) { chosen.push(brightAnchor); used.add(brightAnchor); }

    while (chosen.length < k) {
        let bestCand = null;
        let bestScore = Infinity;
        for (const cand of pool) {
            if (used.has(cand)) continue;
            const trial = [...chosen, cand].sort((a, b) => a.L - b.L);
            for (let i = 0; i < trial.length; i++) {
                trial[i] = { ...trial[i], startPct: i === 0 ? 0 : Math.min(0.92, (i / trial.length) * 0.88) };
            }
            const ev = evaluateStackDeltaE(samples, trial, params);
            if (ev.avgDeltaE < bestScore) {
                bestScore = ev.avgDeltaE;
                bestCand = cand;
            }
        }
        if (!bestCand) break;
        chosen.push(bestCand);
        used.add(bestCand);
    }

    const finalStack = chosen.sort((a, b) => a.L - b.L).map((s, i) => ({
        ...s,
        startPct: i === 0 ? 0.0 : Math.min(0.92, (i / chosen.length) * 0.88)
    }));
    const evalRes = optimizeThresholds(samples, finalStack, params);
    return { spools: finalStack, evalRes };
}

self.onmessage = function(e) {
    const msg = e.data || {};
    const { id, type } = msg;
    try {
        if (type === 'SOLVE_STACK') {
            const { rgbFlat, filaments, ownedPool, useOwnedRack, targetSlotCount, params } = msg;
            const samples = [];
            const sampleCount = Math.floor(rgbFlat.length / 3);
            for (let i = 0; i < sampleCount; i++) {
                const r = rgbFlat[i * 3], g = rgbFlat[i * 3 + 1], b = rgbFlat[i * 3 + 2];
                const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                samples.push({ r, g, b, lum, lab: rgbToLab(r, g, b) });
            }

            let bestStack, evalRes;
            if (useOwnedRack && Array.isArray(ownedPool) && ownedPool.length >= 2) {
                const res = selectOptimalOwnedSubset(samples, ownedPool, targetSlotCount || Math.max(4, filaments.length), params);
                bestStack = res.spools;
                evalRes = res.evalRes;
            } else {
                const prepared = prepareSpools(filaments);
                if (params.colorMode !== 'chromatic') {
                    prepared.sort((a, b) => a.L - b.L);
                }
                evalRes = optimizeThresholds(samples, prepared, params);
                bestStack = prepared;
            }

            self.postMessage({
                id,
                ok: true,
                result: {
                    filaments: bestStack.map((f, idx) => ({
                        name: f.name,
                        brand: f.brand || '',
                        color: f.color,
                        td: f.td,
                        startPct: idx === 0 ? 0.0 : Math.round(f.startPct * 1000) / 1000,
                        origIdx: f.origIdx
                    })),
                    avgDeltaE: Math.round(evalRes.avgDeltaE * 100) / 100,
                    maxDeltaE: Math.round(evalRes.maxDeltaE * 100) / 100,
                    matchScorePct: evalRes.matchScorePct
                }
            });
            return;
        }
        self.postMessage({ id, ok: false, error: 'Unknown worker command: ' + type });
    } catch (err) {
        self.postMessage({ id, ok: false, error: String(err && err.message ? err.message : err) });
    }
};
