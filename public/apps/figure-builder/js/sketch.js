/**
 * sketch.js — Hyper-Sketch Studio Core
 * =====================================
 * Handles 2D drawing on canvas and converts paths to 4D hyper-geometry.
 * Points are "lifted" into 4D and given procedural animation.
 */

const SketchEngine = (() => {
    let points = []; // Array of {x, y, t, dist}
    let drawing = false;
    let enabled = false;
    let lastPoint = null;
    let totalDist = 0;
    let currentThickness = 0.08;
    let currentColor = '#00f3ff';
    let currentStyle = 'NEON'; // 'NEON', 'PULSE', 'RIBBON', 'QUANTUM', 'CRYSTAL', 'NEURAL'

    function reset() {
        points = [];
        lastPoint = null;
        totalDist = 0;
    }

    function addPoint(x, y) {
        const now = Date.now();
        let d = 0;
        if (lastPoint) {
            const dx = x - lastPoint.x;
            const dy = y - lastPoint.y;
            d = Math.sqrt(dx*dx + dy*dy);
            if (d < 0.01) return; // Ignore tiny movements
        }
        totalDist += d;
        points.push({ x, y, t: now, dist: totalDist });
        lastPoint = { x, y };
    }

    /** Returns { verts: [[x,y,z,w],...], edges: [[i,j],...] } */
    function getGeometry(time, params) {
        if (points.length === 0) return { verts: [], edges: [] };

        const verts = points.map(p => {
            // "Coming to Life" animation: W oscillates based on time and path distance
            const wave = Math.sin(time * 2.5 + p.dist * 4.0) * 0.4 * params.tube;
            const wobble = Math.cos(time * 1.5 + p.dist * 2.0) * 0.1;
            return [
                p.x + wobble, 
                p.y + wobble, 
                wobble * 0.5, 
                wave + params.wOffset
            ];
        });

        const edges = [];
        for (let i = 0; i < verts.length - 1; i++) {
            edges.push([i, i + 1]);
        }
        // Optionally close the loop if the first and last points are close
        if (verts.length > 5) {
            const p0 = points[0], pn = points[points.length-1];
            const d = Math.sqrt((p0.x-pn.x)**2 + (p0.y-pn.y)**2);
            if (d < 0.2) edges.push([verts.length - 1, 0]);
        }

        return { verts, edges };
    }

    return {
        addPoint,
        reset,
        getGeometry,
        setEnabled: (v) => { enabled = v; if (!v) reset(); },
        isEnabled: () => enabled,
        hasPoints: () => points.length > 1,
        setThickness: (v) => { currentThickness = v; },
        getThickness: () => currentThickness,
        setColor: (v) => { currentColor = v; },
        getColor: () => currentColor,
        setStyle: (v) => { currentStyle = v; },
        getStyle: () => currentStyle
    };
})();
