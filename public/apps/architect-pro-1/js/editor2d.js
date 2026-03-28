// editor2d.js
window.Editor2D = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    camera: { x: 0, y: 0, zoom: 1 }, // 1 pixel = 1 cm default
    needsRedraw: true,
    currentTool: 'select',

    // Interaction state
    isDragging: false,
    isDraggingObject: false,
    draggedElement: null,
    dragOffset: { x: 0, y: 0 },
    isDrawing: false,
    dragStart: { x: 0, y: 0 },
    drawStart: { x: 0, y: 0 },
    mousePos: { x: 0, y: 0 },
    hoverElement: null,

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.bindEvents();
        this.resize();
    },

    resize() {
        if (!this.canvas) return;
        const parent = this.canvas.parentElement;
        this.width = parent.clientWidth;
        this.height = parent.clientHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // Center camera initially
        if (this.camera.x === 0 && this.camera.y === 0) {
            this.camera.x = this.width / 2;
            this.camera.y = this.height / 2;
        }
        this.needsRedraw = true;
    },

    setTool(tool) {
        this.currentTool = tool;
        this.isDrawing = false;
        this.needsRedraw = true;
    },

    screenToWorld(x, y) {
        return {
            x: (x - this.camera.x) / this.camera.zoom,
            y: (y - this.camera.y) / this.camera.zoom
        };
    },

    worldToScreen(x, y) {
        return {
            x: x * this.camera.zoom + this.camera.x,
            y: y * this.camera.zoom + this.camera.y
        };
    },

    bindEvents() {
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.onWheel.bind(this));

        // UI Zoom
        if (UIElems.btnZoomIn2D) UIElems.btnZoomIn2D.addEventListener('click', () => { this.camera.zoom *= 1.2; this.needsRedraw = true; });
        if (UIElems.btnZoomOut2D) UIElems.btnZoomOut2D.addEventListener('click', () => { this.camera.zoom /= 1.2; this.needsRedraw = true; });
        if (UIElems.btnReset2D) UIElems.btnReset2D.addEventListener('click', () => {
            this.camera.zoom = 1;
            this.camera.x = this.width / 2;
            this.camera.y = this.height / 2;
            this.needsRedraw = true;
        });
    },

    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const wpos = this.screenToWorld(mx, my);

        if (e.button === 1 || (e.button === 0 && e.altKey)) {
            // Middle click or Alt+Click -> Pan
            this.isDragging = true;
            this.dragStart = { x: mx, y: my };
            return;
        }

        if (e.button !== 0) return;

        if (this.currentTool === 'select') {
            const hit = this.hitTest(wpos.x, wpos.y);
            selectElement(hit);
            if (hit && (hit.type === 'furniture' || hit.type === 'roof' || hit.type === 'floor')) {
                this.isDraggingObject = true;
                this.draggedElement = hit;
                this.dragOffset = { x: hit.x - wpos.x, y: hit.y - wpos.y };
            }
            this.needsRedraw = true;
        } else if (this.currentTool === 'wall' || this.currentTool === 'floor' || this.currentTool === 'roof' || this.currentTool === 'terrain') {
            this.isDrawing = true;
            this.drawStart = { x: wpos.x, y: wpos.y };
            if (this.currentTool === 'terrain') this.addTerrainSplat(wpos.x, wpos.y, e);
        } else if (this.currentTool === 'door' || this.currentTool === 'window') {
            // Drop on wall
            if (this.hoverElement && this.hoverElement.type === 'wall') {
                STATE_HISTORY.saveState();
                this.addObjectToWall(this.hoverElement, wpos.x, wpos.y);
            }
        } else if (this.currentTool === 'furniture') {
            // Drop anywhere
            STATE_HISTORY.saveState();
            STATE.elements.push({
                id: 'fur_' + Date.now(),
                type: 'furniture',
                x: wpos.x,
                y: wpos.y,
                width: 100,
                length: 100,
                elevation: 0,
                modelVariant: 'table',
                color: '#8B4513',
                floor: STATE.activeFloor,
                cost: 150
            });
            triggerUpdate();
        } else if (this.currentTool === 'camera') {
            // Drop a camera path node
            STATE_HISTORY.saveState();
            STATE.elements.push({
                id: 'cam_' + Date.now(),
                type: 'cameraNode',
                x: wpos.x,
                y: wpos.y,
                elevation: 160, // Human eye level
                floor: STATE.activeFloor,
                cost: 0 // Free
            });
            triggerUpdate();
        } else if (this.currentTool === 'light') {
            // Drop a light point
            STATE_HISTORY.saveState();
            STATE.elements.push({
                id: 'light_' + Date.now(),
                type: 'lightNode',
                x: wpos.x,
                y: wpos.y,
                elevation: 250, // Near ceiling
                intensity: 1.0,
                color: '#ffefcc',
                floor: STATE.activeFloor,
                cost: 50
            });
            triggerUpdate();
        }
    },

    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const wpos = this.screenToWorld(mx, my);
        this.mousePos = { x: wpos.x, y: wpos.y };

        if (this.isDragging) {
            this.camera.x += (mx - this.dragStart.x);
            this.camera.y += (my - this.dragStart.y);
            this.dragStart = { x: mx, y: my };
            this.needsRedraw = true;
        } else if (this.isDraggingObject && this.draggedElement) {
            this.draggedElement.x = wpos.x + this.dragOffset.x;
            this.draggedElement.y = wpos.y + this.dragOffset.y;
            this.needsRedraw = true;
            triggerUpdate();
        } else if (this.currentTool === 'select' || this.currentTool === 'door' || this.currentTool === 'window' || this.currentTool === 'furniture' || this.currentTool === 'camera' || this.currentTool === 'light') {
            const hit = this.hitTest(wpos.x, wpos.y);
            if (this.hoverElement !== hit) {
                this.hoverElement = hit;
                this.needsRedraw = true;
            }
        } else if (this.isDrawing) {
            if (this.currentTool === 'terrain') {
                const dist = Math.hypot(wpos.x - this.drawStart.x, wpos.y - this.drawStart.y);
                if (dist > 20) {
                    this.addTerrainSplat(wpos.x, wpos.y, e);
                    this.drawStart = { x: wpos.x, y: wpos.y };
                }
            } else if (this.currentTool === 'wall') {
                // Orthogonal Snapping (Shift or Auto-Snap within threshold)
                const dx = mx - this.dragStart.x;
                const dy = my - this.dragStart.y;

                // Allow snapping if angle is close to horizontal or vertical
                const angle = Math.atan2(Math.abs(dy), Math.abs(dx));
                const snapThreshold = 15 * (Math.PI / 180); // 15 degrees

                if (angle < snapThreshold) {
                    this.mousePos.y = this.drawStart.y; // horizontal
                } else if (angle > (Math.PI / 2 - snapThreshold)) {
                    this.mousePos.x = this.drawStart.x; // vertical
                }
            }
            this.needsRedraw = true;
        }
    },

    onMouseUp(e) {
        if (this.isDragging) {
            this.isDragging = false;
        } else if (this.isDraggingObject) {
            this.isDraggingObject = false;
            this.draggedElement = null;
            STATE_HISTORY.saveState();
        } else if (this.isDrawing) {
            this.isDrawing = false;
            if (this.currentTool === 'terrain') {
                triggerUpdate();
            } else {
                this.finishDrawing();
            }
        }
    },

    onWheel(e) {
        e.preventDefault();
        const zoomAmount = e.deltaY > 0 ? 0.9 : 1.1;

        // Zoom toward mouse cursor
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const wx = (mx - this.camera.x) / this.camera.zoom;
        const wy = (my - this.camera.y) / this.camera.zoom;

        this.camera.zoom *= zoomAmount;

        this.camera.x = mx - wx * this.camera.zoom;
        this.camera.y = my - wy * this.camera.zoom;

        this.needsRedraw = true;
    },

    finishDrawing() {
        const dx = this.mousePos.x - this.drawStart.x;
        const dy = this.mousePos.y - this.drawStart.y;

        if (this.currentTool === 'wall') {
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 10) { // minimum 10cm wall
                STATE_HISTORY.saveState();
                STATE.elements.push({
                    id: 'w_' + Date.now(),
                    type: 'wall',
                    x1: this.drawStart.x,
                    y1: this.drawStart.y,
                    x2: this.mousePos.x,
                    y2: this.mousePos.y,
                    length: len,
                    height: STATE.globWallHeight,
                    thick: STATE.globWallThick,
                    color: '#ffffff',
                    floor: STATE.activeFloor,
                    cost: Math.round(len / 100 * 50) // $50 per meter
                });
                triggerUpdate();
            }
        } else if (this.currentTool === 'floor' || this.currentTool === 'roof') {
            let rx = Math.min(this.drawStart.x, this.mousePos.x);
            let ry = Math.min(this.drawStart.y, this.mousePos.y);
            let rw = Math.abs(dx);
            let rh = Math.abs(dy);

            // Auto-Roof: if just clicked without dragging, fit to walls
            if (this.currentTool === 'roof' && rw < 10 && rh < 10) {
                const walls = STATE.elements.filter(e => e.type === 'wall' && e.floor === STATE.activeFloor);
                if (walls.length > 0) {
                    // Try to trace a connected polygon loop from the walls
                    let polygon = [];
                    let unvisited = [...walls];
                    let curr = unvisited.shift();

                    // We need a small overhang
                    const overhang = 20;

                    let currPt = { x: curr.x2, y: curr.y2 };
                    polygon.push({ x: curr.x1, y: curr.y1 });
                    polygon.push({ x: curr.x2, y: curr.y2 });

                    let maxIterations = walls.length + 5;
                    while (unvisited.length > 0 && maxIterations > 0) {
                        maxIterations--;
                        // Find a wall connecting to currPt
                        let bestIdx = -1;
                        let dist = Infinity;
                        let nextPt = null;

                        for (let i = 0; i < unvisited.length; i++) {
                            const w = unvisited[i];
                            const d1 = Math.hypot(w.x1 - currPt.x, w.y1 - currPt.y);
                            const d2 = Math.hypot(w.x2 - currPt.x, w.y2 - currPt.y);
                            if (d1 < 15 && d1 < dist) { dist = d1; bestIdx = i; nextPt = { x: w.x2, y: w.y2 }; }
                            if (d2 < 15 && d2 < dist) { dist = d2; bestIdx = i; nextPt = { x: w.x1, y: w.y1 }; }
                        }

                        if (bestIdx !== -1) {
                            unvisited.splice(bestIdx, 1);
                            polygon.push(nextPt);
                            currPt = nextPt;
                            // Check if closed
                            if (Math.hypot(polygon[0].x - currPt.x, polygon[0].y - currPt.y) < 15) {
                                break;
                            }
                        } else {
                            break; // chain broken
                        }
                    }

                    // If we successfully traced a polygon with at least 3 points
                    if (polygon.length >= 3) {
                        STATE_HISTORY.saveState();
                        // Expand the polygon slightly for overhang outwards
                        // Simple centroid expansion for now
                        let cx = 0, cy = 0;
                        polygon.forEach(p => { cx += p.x; cy += p.y; });
                        cx /= polygon.length; cy /= polygon.length;

                        let expandedPoly = polygon.map(p => {
                            let dx = p.x - cx; let dy = p.y - cy;
                            let len = Math.hypot(dx, dy);
                            if (len === 0) return p;
                            return { x: p.x + (dx / len) * overhang, y: p.y + (dy / len) * overhang };
                        });

                        STATE.elements.push({
                            id: 'r_poly_' + Date.now(),
                            type: 'roof',
                            polygon: expandedPoly,
                            elevation: STATE.globWallHeight,
                            modelVariant: 'complex_tent', // dynamically triangulated
                            color: '#aa3333',
                            floor: STATE.activeFloor,
                            cost: 1500 // Base unit cost for smart roof
                        });
                        triggerUpdate();
                        return; // Done with smart roof
                    } else {
                        // Fallback to bounding box
                        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                        walls.forEach(w => {
                            minX = Math.min(minX, w.x1, w.x2);
                            minY = Math.min(minY, w.y1, w.y2);
                            maxX = Math.max(maxX, w.x1, w.x2);
                            maxY = Math.max(maxY, w.y1, w.y2);
                        });
                        rx = minX - overhang;
                        ry = minY - overhang;
                        rw = (maxX - minX) + overhang * 2;
                        rh = (maxY - minY) + overhang * 2;
                    }
                }
            }

            if (rw > 10 && rh > 10) {
                STATE_HISTORY.saveState();
                STATE.elements.push({
                    id: (this.currentTool === 'floor' ? 'f_' : 'r_') + Date.now(),
                    type: this.currentTool,
                    x: rx,
                    y: ry,
                    width: rw,
                    height: rh,
                    elevation: this.currentTool === 'roof' ? STATE.globWallHeight : 0,
                    modelVariant: this.currentTool === 'roof' ? 'gabled' : undefined,
                    color: this.currentTool === 'floor' ? '#888888' : '#aa3333',
                    rotation: 0,
                    floor: STATE.activeFloor,
                    cost: Math.round(rw * rh / 10000 * (this.currentTool === 'roof' ? 120 : 60))
                });
                triggerUpdate();
            }
        }
    },

    addTerrainSplat(x, y, e) {
        // Shift to lower terrain
        const force = (e && e.shiftKey) ? -20 : 20;
        STATE.elements.push({
            id: 'splat_' + Date.now() + Math.random(),
            type: 'terrainSplat',
            x: x,
            y: y,
            radius: 100, // 1m radius
            force: force,
            floor: STATE.activeFloor
        });
        this.needsRedraw = true;
    },

    addObjectToWall(wall, wx, wy) {
        // Project mouse onto wall line
        const A = { x: wall.x1, y: wall.y1 };
        const B = { x: wall.x2, y: wall.y2 };

        const l2 = (B.x - A.x) ** 2 + (B.y - A.y) ** 2;
        let t = Math.max(0, Math.min(1, ((wx - A.x) * (B.x - A.x) + (wy - A.y) * (B.y - A.y)) / l2));

        // Position on wall from 0 to 1
        STATE.elements.push({
            id: 'o_' + Date.now(),
            type: this.currentTool, // 'door' or 'window'
            wallId: wall.id,
            t: t,
            length: 90, // default width
            height: this.currentTool === 'door' ? 200 : 120, // default height
            elevation: this.currentTool === 'door' ? 0 : 90, // default elevation from floor
            modelVariant: 'single',
            color: '#666666',
            floor: STATE.activeFloor,
            cost: this.currentTool === 'door' ? 200 : 150
        });
        triggerUpdate();
    },

    hitTest(x, y) {
        // Reverse loop to pick top elements first
        for (let i = STATE.elements.length - 1; i >= 0; i--) {
            const el = STATE.elements[i];

            // Only interact with elements on the current floor
            if (el.floor !== undefined && el.floor !== STATE.activeFloor) continue;

            if (el.type === 'wall') {
                // Distance to line segment
                const A = { x: el.x1, y: el.y1 };
                const B = { x: el.x2, y: el.y2 };
                const l2 = (B.x - A.x) ** 2 + (B.y - A.y) ** 2;
                if (l2 === 0) continue;
                const t = Math.max(0, Math.min(1, ((x - A.x) * (B.x - A.x) + (y - A.y) * (B.y - A.y)) / l2));
                const proj = { x: A.x + t * (B.x - A.x), y: A.y + t * (B.y - A.y) };
                const dist = Math.sqrt((x - proj.x) ** 2 + (y - proj.y) ** 2);

                if (dist <= el.thick / 2 + 5) {
                    return el;
                }
            } else if (el.type === 'floor' || el.type === 'roof') {
                if (el.polygon) {
                    let inside = false;
                    for (let p1 = 0, p2 = el.polygon.length - 1; p1 < el.polygon.length; p2 = p1++) {
                        let xi = el.polygon[p1].x, yi = el.polygon[p1].y;
                        let xj = el.polygon[p2].x, yj = el.polygon[p2].y;
                        let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
                        if (intersect) inside = !inside;
                    }
                    if (inside) return el;
                } else if (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height) {
                    return el;
                }
            } else if (el.type === 'door' || el.type === 'window') {
                const wall = STATE.elements.find(w => w.id === el.wallId);
                if (wall) {
                    const cx = wall.x1 + el.t * (wall.x2 - wall.x1);
                    const cy = wall.y1 + el.t * (wall.y2 - wall.y1);
                    if (Math.abs(x - cx) < el.length / 2 && Math.abs(y - cy) < 20) {
                        return el;
                    }
                }
            } else if (el.type === 'furniture' || el.type === 'cameraNode' || el.type === 'lightNode') {
                const w = (el.type === 'lightNode') ? 30 : (el.width || 40);
                const l = (el.type === 'lightNode') ? 30 : (el.length || 40);
                if (Math.abs(x - el.x) < w / 2 && Math.abs(y - el.y) < l / 2) {
                    return el;
                }
            } else if (el.type === 'terrainSplat') {
                if (Math.hypot(x - el.x, y - el.y) < el.radius) {
                    return el;
                }
            }
        }
        return null;
    },

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.save();
        this.ctx.translate(this.camera.x, this.camera.y);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);

        // Draw Blueprint Image
        if (STATE.blueprintImage) {
            this.ctx.globalAlpha = 0.5; // Slightly transparent back-layer
            const imgW = STATE.blueprintImage.width;
            const imgH = STATE.blueprintImage.height;
            this.ctx.drawImage(STATE.blueprintImage, -imgW / 2, -imgH / 2, imgW, imgH);
            this.ctx.globalAlpha = 1.0;
        }

        // Draw Grid (optional, handled by CSS mostly, but we can draw a center origin)
        this.ctx.fillStyle = '#ff0000';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 3, 0, Math.PI * 2);
        this.ctx.fill();

        // Map elements to current floor only
        const currentFloorElements = STATE.elements.filter(el =>
            el.floor === undefined || el.floor === STATE.activeFloor
        );

        // Draw terrain splats faintly
        this.ctx.globalAlpha = 0.2;
        currentFloorElements.filter(e => e.type === 'terrainSplat').forEach(s => {
            this.ctx.fillStyle = s.force > 0 ? '#10B981' : '#EF4444';
            this.ctx.beginPath();
            this.ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1.0;

        // Draw brush cursor if terrain tool
        if (this.currentTool === 'terrain' && this.mousePos) {
            this.ctx.strokeStyle = '#10B981';
            this.ctx.lineWidth = 2 / this.camera.zoom;
            this.ctx.beginPath();
            this.ctx.arc(this.mousePos.x, this.mousePos.y, 100, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        // 1. Draw Floors & Roofs
        currentFloorElements.filter(e => e.type === 'floor' || e.type === 'roof').forEach(f => {
            this.ctx.fillStyle = f.color;
            this.ctx.globalAlpha = 0.5;

            if (f.polygon) {
                this.ctx.beginPath();
                this.ctx.moveTo(f.polygon[0].x, f.polygon[0].y);
                for (let i = 1; i < f.polygon.length; i++) {
                    this.ctx.lineTo(f.polygon[i].x, f.polygon[i].y);
                }
                this.ctx.closePath();
                this.ctx.fill();
                if (STATE.selectedElement === f) {
                    this.ctx.strokeStyle = '#3B82F6';
                    this.ctx.lineWidth = 3 / this.camera.zoom;
                    this.ctx.stroke();
                }
            } else {
                this.ctx.fillRect(f.x, f.y, f.width, f.height);
                if (STATE.selectedElement === f) {
                    this.ctx.strokeStyle = '#3B82F6';
                    this.ctx.lineWidth = 3 / this.camera.zoom;
                    this.ctx.strokeRect(f.x, f.y, f.width, f.height);
                }
            }
        });

        // 2. Draw Walls
        this.ctx.globalAlpha = 1.0;
        currentFloorElements.filter(e => e.type === 'wall').forEach(w => {
            this.ctx.strokeStyle = (STATE.selectedElement === w) ? '#3B82F6' : w.color;
            if (this.hoverElement === w && STATE.selectedElement !== w) this.ctx.strokeStyle = '#60A5FA';

            this.ctx.lineWidth = w.thick;
            this.ctx.lineCap = 'round';
            this.ctx.beginPath();
            this.ctx.moveTo(w.x1, w.y1);

            if (w.curvature) {
                const cx = (w.x1 + w.x2) / 2;
                const cy = (w.y1 + w.y2) / 2;
                const angle = Math.atan2(w.y2 - w.y1, w.x2 - w.x1);
                const nx = Math.cos(angle - Math.PI / 2);
                const ny = Math.sin(angle - Math.PI / 2);
                // For a quad bezier, CP is 2x the midpoint deviation
                const cpX = cx + nx * (w.curvature * 2);
                const cpY = cy + ny * (w.curvature * 2);
                this.ctx.quadraticCurveTo(cpX, cpY, w.x2, w.y2);
            } else {
                this.ctx.lineTo(w.x2, w.y2);
            }

            this.ctx.stroke();

            // Outline
            this.ctx.lineWidth = 1 / this.camera.zoom;
            this.ctx.strokeStyle = '#000000';
            this.ctx.stroke();

            // Dimenstion Line (Cote)
            const angle = Math.atan2(w.y2 - w.y1, w.x2 - w.x1);
            const cx = (w.x1 + w.x2) / 2;
            const cy = (w.y1 + w.y2) / 2;
            const offsetDist = Math.max(30, w.thick + 10);

            // Perpendicular offset for label
            let nx = Math.cos(angle - Math.PI / 2);
            let ny = Math.sin(angle - Math.PI / 2);

            // Text rendering
            this.ctx.save();
            this.ctx.translate(cx + nx * offsetDist, cy + ny * offsetDist);
            // Flip text upright if needed
            let textAngle = angle;
            if (textAngle > Math.PI / 2 || textAngle < -Math.PI / 2) textAngle += Math.PI;
            this.ctx.rotate(textAngle);

            this.ctx.fillStyle = '#10B981'; // Green dimension text
            this.ctx.font = `600 ${12 / this.camera.zoom}px Inter, sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            // Format format: length in whatever unit
            let displayLen = w.length;
            let displayUnit = STATE.unit || 'cm';
            if (displayUnit === 'm') displayLen = w.length / 100;

            this.ctx.fillText(`${displayLen.toFixed(1)} ${displayUnit}`, 0, 0);

            // Draw dimension tick marks slightly
            this.ctx.beginPath();
            this.ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
            this.ctx.lineWidth = 1 / this.camera.zoom;
            // Draw a line connecting the text to the wall center
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(nx * -offsetDist + nx * (w.thick / 2 + 2), ny * -offsetDist + ny * (w.thick / 2 + 2));
            this.ctx.stroke();
            this.ctx.restore();
        });

        // 3. Draw Doors and Windows
        currentFloorElements.filter(e => e.type === 'door' || e.type === 'window').forEach(o => {
            const wall = currentFloorElements.find(w => w.id === o.wallId);
            if (!wall) return;

            const cx = wall.x1 + o.t * (wall.x2 - wall.x1);
            const cy = wall.y1 + o.t * (wall.y2 - wall.y1);
            const angle = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1);

            this.ctx.save();
            this.ctx.translate(cx, cy);
            this.ctx.rotate(angle);

            this.ctx.fillStyle = o.type === 'door' ? '#f59e0b' : '#38bdf8'; // amber/blue
            if (STATE.selectedElement === o) this.ctx.fillStyle = '#3B82F6';

            this.ctx.fillRect(-o.length / 2, -wall.thick / 2 - 2, o.length, wall.thick + 4);

            // Arc for door swing
            if (o.type === 'door') {
                this.ctx.beginPath();
                this.ctx.arc(-o.length / 2, wall.thick / 2, o.length, 0, Math.PI / 2);
                this.ctx.lineTo(-o.length / 2, wall.thick / 2);
                this.ctx.lineWidth = 2 / this.camera.zoom;
                this.ctx.strokeStyle = o.color;
                this.ctx.stroke();
            }

            this.ctx.restore();
        });

        // 4. Draw Roofs
        STATE.elements.filter(e => e.type === 'roof').forEach(r => {
            this.ctx.save();
            const cx = r.x + r.width / 2;
            const cy = r.y + r.height / 2;
            this.ctx.translate(cx, cy);
            this.ctx.rotate((r.rotation || 0) * Math.PI / 180);

            this.ctx.fillStyle = r.color;
            this.ctx.globalAlpha = 0.4; // transparent so we can see inside
            this.ctx.fillRect(-r.width / 2, -r.height / 2, r.width, r.height);

            if (r.modelVariant === 'gabled') {
                this.ctx.beginPath();
                this.ctx.moveTo(-r.width / 2, 0);
                this.ctx.lineTo(r.width / 2, 0);
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 2 / this.camera.zoom;
                this.ctx.stroke();
            } else if (r.modelVariant === 'hipped') {
                this.ctx.beginPath();
                this.ctx.moveTo(-r.width / 2, -r.height / 2);
                this.ctx.lineTo(0, 0);
                this.ctx.moveTo(r.width / 2, -r.height / 2);
                this.ctx.lineTo(0, 0);
                this.ctx.moveTo(-r.width / 2, r.height / 2);
                this.ctx.lineTo(0, 0);
                this.ctx.moveTo(r.width / 2, r.height / 2);
                this.ctx.lineTo(0, 0);
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 2 / this.camera.zoom;
                this.ctx.stroke();
            }

            if (STATE.selectedElement === r) {
                this.ctx.strokeStyle = '#3B82F6';
                this.ctx.lineWidth = 3 / this.camera.zoom;
                this.ctx.strokeRect(-r.width / 2, -r.height / 2, r.width, r.height);
            }
            this.ctx.restore();
        });

        // 4.5 Draw Camera Nodes & Path
        const camNodes = currentFloorElements.filter(e => e.type === 'cameraNode');

        // Draw path connecting nodes
        if (camNodes.length > 1) {
            this.ctx.beginPath();
            this.ctx.moveTo(camNodes[0].x, camNodes[0].y);
            for (let i = 1; i < camNodes.length; i++) {
                this.ctx.lineTo(camNodes[i].x, camNodes[i].y);
            }
            this.ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)'; // vibrant purple
            this.ctx.lineWidth = 4 / this.camera.zoom;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.stroke();
        }

        // Draw individual camera nodes
        camNodes.forEach((cam, i) => {
            this.ctx.beginPath();
            this.ctx.arc(cam.x, cam.y, 10 / this.camera.zoom, 0, Math.PI * 2);
            this.ctx.fillStyle = STATE.selectedElement === cam ? '#3B82F6' : '#8B5CF6';
            this.ctx.fill();
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2 / this.camera.zoom;
            this.ctx.stroke();

            // Label
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = `${10 / this.camera.zoom}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(`C${i + 1}`, cam.x, cam.y - (15 / this.camera.zoom));
        });

        // 4.6 Draw Light Nodes
        currentFloorElements.filter(e => e.type === 'lightNode').forEach(l => {
            this.ctx.save();
            this.ctx.translate(l.x, l.y);

            // Glow
            const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, 20 / this.camera.zoom);
            gradient.addColorStop(0, 'rgba(255, 239, 204, 0.8)');
            gradient.addColorStop(1, 'rgba(255, 239, 204, 0)');
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 20 / this.camera.zoom, 0, Math.PI * 2);
            this.ctx.fill();

            // Bulb
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 8 / this.camera.zoom, 0, Math.PI * 2);
            this.ctx.fillStyle = STATE.selectedElement === l ? '#3B82F6' : '#FCD34D';
            this.ctx.fill();
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 1 / this.camera.zoom;
            this.ctx.stroke();

            this.ctx.restore();
        });

        // 5. Draw Furniture
        currentFloorElements.filter(e => e.type === 'furniture').forEach(fur => {
            this.ctx.save();
            this.ctx.translate(fur.x, fur.y);
            this.ctx.rotate((fur.rotation || 0) * Math.PI / 180);

            this.ctx.fillStyle = fur.color;
            if (STATE.selectedElement === fur) this.ctx.fillStyle = '#3B82F6';

            this.ctx.fillRect(-fur.width / 2, -fur.length / 2, fur.width, fur.length);

            // outline
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 1 / this.camera.zoom;
            this.ctx.strokeRect(-fur.width / 2, -fur.length / 2, fur.width, fur.length);

            // icon indicator
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = `${Math.min(fur.width, fur.length) * 0.5}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            let icon = '🪑';
            if (fur.modelVariant === 'bed') icon = '🛏️';
            if (fur.modelVariant === 'sofa') icon = '🛋️';
            if (fur.modelVariant === 'table') icon = '🪑'; // reusing chair fallback or desk
            if (fur.modelVariant === 'cabinet') icon = '🗄️';
            if (fur.modelVariant === 'bookshelf') icon = '📚';
            if (fur.modelVariant === 'desk') icon = '💻';
            if (fur.modelVariant === 'plant') icon = '🪴';
            if (fur.modelVariant === 'tv') icon = '📺';

            this.ctx.fillText(icon, 0, 0);
            this.ctx.restore();
        });

        // Drawing guides
        if (this.isDrawing && this.currentTool === 'wall') {
            const dx = this.mousePos.x - this.drawStart.x;
            const dy = this.mousePos.y - this.drawStart.y;
            const len = Math.sqrt(dx * dx + dy * dy);

            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = STATE.globWallThick;
            this.ctx.globalAlpha = 0.5;
            this.ctx.beginPath();
            this.ctx.moveTo(this.drawStart.x, this.drawStart.y);
            this.ctx.lineTo(this.mousePos.x, this.mousePos.y);
            this.ctx.stroke();
            this.ctx.globalAlpha = 1.0;

            if (len > 10) {
                const angle = Math.atan2(dy, dx);
                const cx = (this.drawStart.x + this.mousePos.x) / 2;
                const cy = (this.drawStart.y + this.mousePos.y) / 2;
                const offsetDist = Math.max(30, Number(STATE.globWallThick) + 10);

                let nx = Math.cos(angle - Math.PI / 2);
                let ny = Math.sin(angle - Math.PI / 2);

                this.ctx.save();
                this.ctx.translate(cx + nx * offsetDist, cy + ny * offsetDist);
                let textAngle = angle;
                if (textAngle > Math.PI / 2 || textAngle < -Math.PI / 2) textAngle += Math.PI;
                this.ctx.rotate(textAngle);

                this.ctx.fillStyle = '#10B981';
                this.ctx.font = `600 ${14 / this.camera.zoom}px Inter, sans-serif`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';

                let displayLen = len;
                let displayUnit = STATE.unit || 'cm';
                if (displayUnit === 'm') displayLen = len / 100;

                this.ctx.fillText(`${displayLen.toFixed(1)} ${displayUnit}`, 0, 0);
                this.ctx.restore();
            }
        } else if (this.isDrawing && (this.currentTool === 'floor' || this.currentTool === 'roof')) {
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2 / this.camera.zoom;
            this.ctx.strokeRect(
                Math.min(this.drawStart.x, this.mousePos.x),
                Math.min(this.drawStart.y, this.mousePos.y),
                Math.abs(this.mousePos.x - this.drawStart.x),
                Math.abs(this.mousePos.y - this.drawStart.y)
            );
        }

        // Ghost object for windows/doors
        if (!this.isDrawing && (this.currentTool === 'door' || this.currentTool === 'window') && this.hoverElement && this.hoverElement.type === 'wall') {
            const wall = this.hoverElement;
            const A = { x: wall.x1, y: wall.y1 };
            const B = { x: wall.x2, y: wall.y2 };
            const l2 = (B.x - A.x) ** 2 + (B.y - A.y) ** 2;
            let t = Math.max(0, Math.min(1, ((this.mousePos.x - A.x) * (B.x - A.x) + (this.mousePos.y - A.y) * (B.y - A.y)) / l2));

            const cx = A.x + t * (B.x - A.x);
            const cy = A.y + t * (B.y - A.y);
            const angle = Math.atan2(B.y - A.y, B.x - A.x);

            this.ctx.save();
            this.ctx.translate(cx, cy);
            this.ctx.rotate(angle);
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.fillRect(-45, -wall.thick / 2, 90, wall.thick); // 90cm default preview
            this.ctx.restore();
        }

        this.ctx.restore();
    }
};
