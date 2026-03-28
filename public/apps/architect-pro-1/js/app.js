// app.js
const STATE = {
    activeTool: 'select',
    unit: 'cm', // m, cm, in, ft
    elements: [], // walls, doors, windows, floors, roofs
    selectedElement: null,
    globWallHeight: 280,
    globWallThick: 20,
    activeFloor: 0
};

const STATE_HISTORY = {
    past: [],
    future: [],

    saveState() {
        // Deep stringify state elements
        this.past.push(JSON.stringify(STATE.elements));
        this.future = []; // clear future on new action
        if (this.past.length > 50) this.past.shift();
    },

    undo() {
        if (this.past.length === 0) return;
        this.future.push(JSON.stringify(STATE.elements));
        STATE.elements = JSON.parse(this.past.pop());
        STATE.selectedElement = null;
        triggerUpdate();
    },

    redo() {
        if (this.future.length === 0) return;
        this.past.push(JSON.stringify(STATE.elements));
        STATE.elements = JSON.parse(this.future.pop());
        STATE.selectedElement = null;
        triggerUpdate();
    }
};

// UI Elements
const UIElems = {
    toolBtns: document.querySelectorAll('.tool-btn'),
    activeFloorSelect: document.getElementById('activeFloorSelect'),
    unitSelect: document.getElementById('unitSelect'),
    vSplitter: document.getElementById('vSplitter'),
    pane2D: document.querySelector('.pane-2d'),
    pane3D: document.querySelector('.pane-3d'),
    propsPanel: document.getElementById('propertiesPanel'),
    dynamicProps: document.getElementById('dynamicProps'),
    emptyState: document.querySelector('.empty-state'),
    btnExport: document.getElementById('btnExport'),
    exportModal: document.getElementById('exportModal'),
    closeExport: document.getElementById('closeExport'),

    btnShortcuts: document.getElementById('btnShortcuts'),
    shortcutsModal: document.getElementById('shortcutsModal'),
    closeShortcuts: document.getElementById('closeShortcuts'),

    timeSlider: document.getElementById('timeSlider'),
    timeLabel: document.getElementById('timeLabel'),

    // Property inputs
    pWidth: document.getElementById('propWidth'),
    pHeight: document.getElementById('propHeight'),
    pElevation: document.getElementById('propElevation'),
    pRotation: document.getElementById('propRotation'),
    pCurvature: document.getElementById('propCurvature'),
    pCurvatureGroup: document.getElementById('groupCurvature'),
    pModelGroup: document.getElementById('groupModel'),
    pModel: document.getElementById('propModel'),
    pMaterialGroup: document.getElementById('groupMaterial'),
    pMaterial: document.getElementById('propMaterial'),
    pColorGroup: document.getElementById('groupColor'),
    pColor: document.getElementById('propColor'),
    pCostGroup: document.getElementById('groupPrice'),
    pCost: document.getElementById('propCost'),
    btnDelete: document.getElementById('btnDelete'),

    // View Controls
    btnZoomIn2D: document.getElementById('btnZoomIn2D'),
    btnZoomOut2D: document.getElementById('btnZoomOut2D'),
    btnReset2D: document.getElementById('btnReset2D'),
    btnWalk: document.getElementById('btnWalk'),

    // Blueprint
    btnLoadBlueprint: document.getElementById('btnLoadBlueprint'),
    blueprintFile: document.getElementById('blueprintFile'),

    // Undo Redo
    btnUndo: document.getElementById('btnUndo'),
    btnRedo: document.getElementById('btnRedo'),
};

function initApp() {
    bindEvents();
    setupSplitter();

    // Initialize the sub-engines
    if (window.Editor2D) Editor2D.init(document.getElementById('canvas2D'));
    if (window.Engine3D) Engine3D.init(document.getElementById('canvas3D'));

    renderLoop();
}

function bindEvents() {
    // Tools
    UIElems.toolBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            UIElems.toolBtns.forEach(b => b.classList.remove('active'));
            const tBtn = e.currentTarget;
            tBtn.classList.add('active');
            STATE.activeTool = tBtn.dataset.tool;
            selectElement(null); // Deselect when switching tools
            if (window.Editor2D) Editor2D.setTool(STATE.activeTool);
        });
    });

    // Unit changes
    UIElems.unitSelect.addEventListener('change', (e) => {
        STATE.unit = e.target.value;
        document.querySelectorAll('.curr-unit').forEach(el => el.textContent = STATE.unit);
        updatePropertiesUI();
        // We do NOT change internal values (always stored in cm), just UI display if we want to be fancy.
        // For simplicity, we can convert display values.
    });

    // Floor changes
    if (UIElems.activeFloorSelect) {
        UIElems.activeFloorSelect.addEventListener('change', (e) => {
            STATE.activeFloor = parseInt(e.target.value, 10);
            selectElement(null);
            triggerUpdate();
        });
    }

    if (UIElems.btnWalk) {
        UIElems.btnWalk.addEventListener('click', () => {
            if (window.Engine3D && Engine3D.toggleWalkthrough) {
                Engine3D.toggleWalkthrough();
            }
        });
    }

    if (UIElems.timeSlider) {
        UIElems.timeSlider.addEventListener('input', (e) => {
            const time = parseFloat(e.target.value);
            const hours = Math.floor(time);
            const mins = Math.floor((time - hours) * 60);
            if (UIElems.timeLabel) {
                UIElems.timeLabel.textContent = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
            }
            if (window.Engine3D && Engine3D.updateSunPath) {
                Engine3D.updateSunPath(time);
            }
        });
    }

    // Export Modal
    UIElems.btnExport.addEventListener('click', () => UIElems.exportModal.style.display = 'flex');
    UIElems.closeExport.addEventListener('click', () => UIElems.exportModal.style.display = 'none');

    // AI Room Generator
    const btnAI = document.getElementById('btnAIGenerate');
    const inputAI = document.getElementById('aiPrompt');
    if (btnAI && inputAI) {
        btnAI.addEventListener('click', () => {
            const prompt = inputAI.value.toLowerCase();
            if (!prompt) return;
            handleAIPrompt(prompt);
            inputAI.value = ''; // clear
        });
        inputAI.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') btnAI.click();
        });
    }

    // Shortcuts Modal
    if (UIElems.btnShortcuts && UIElems.shortcutsModal) {
        UIElems.btnShortcuts.addEventListener('click', () => UIElems.shortcutsModal.style.display = 'flex');
        if (UIElems.closeShortcuts) UIElems.closeShortcuts.addEventListener('click', () => UIElems.shortcutsModal.style.display = 'none');
    }

    // Undo / Redo
    if (UIElems.btnUndo) UIElems.btnUndo.addEventListener('click', () => STATE_HISTORY.undo());
    if (UIElems.btnRedo) UIElems.btnRedo.addEventListener('click', () => STATE_HISTORY.redo());

    // Blueprint Import
    if (UIElems.btnLoadBlueprint && UIElems.blueprintFile) {
        UIElems.btnLoadBlueprint.addEventListener('click', () => UIElems.blueprintFile.click());
        UIElems.blueprintFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    STATE.blueprintImage = img;
                    triggerUpdate();
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // Custom GLB Import
    const btnImportGLB = document.getElementById('btnImportGLB');
    const importGLBFile = document.getElementById('importGLBFile');
    if (btnImportGLB && importGLBFile) {
        btnImportGLB.addEventListener('click', () => importGLBFile.click());
        importGLBFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                STATE_HISTORY.saveState();

                // Spawn the furniture at the center of the current 2D view
                let cx = 0, cy = 0;
                if (window.Editor2D) {
                    const wpos = Editor2D.screenToWorld(Editor2D.width / 2, Editor2D.height / 2);
                    cx = wpos.x;
                    cy = wpos.y;
                }

                STATE.elements.push({
                    id: 'fur_glb_' + Date.now(),
                    type: 'furniture',
                    x: cx,
                    y: cy,
                    width: 100, // Approximate bounding box, updated on load
                    length: 100,
                    elevation: 0,
                    rotation: 0,
                    modelVariant: 'custom_glb', // signals engine3d to load
                    gltfData: ev.target.result, // base64 encoded
                    color: '#ffffff',
                    floor: STATE.activeFloor,
                    cost: 300
                });
                triggerUpdate();
            };
            reader.readAsDataURL(file);
        });
    }

    // Properties updating internal element state
    const updateElem = () => {
        if (!STATE.selectedElement) return;
        const el = STATE.selectedElement;

        // Read display values (which we assume are in cm for now)
        if (el.type === 'wall') {
            el.length = parseFloat(UIElems.pWidth.value); // mapped width to length for walls
            el.height = parseFloat(UIElems.pHeight.value);
            if (UIElems.pCurvature) el.curvature = parseFloat(UIElems.pCurvature.value) || 0;
        } else if (el.type === 'door' || el.type === 'window') {
            el.length = parseFloat(UIElems.pWidth.value);
            el.height = parseFloat(UIElems.pHeight.value);
            el.elevation = parseFloat(UIElems.pElevation.value) || 0;
            el.modelVariant = UIElems.pModel.value;
        } else if (el.type === 'furniture') {
            el.width = parseFloat(UIElems.pWidth.value);
            el.length = parseFloat(UIElems.pHeight.value); // mapped properly to length/width
            el.elevation = parseFloat(UIElems.pElevation.value) || 0;
            el.modelVariant = UIElems.pModel.value;
        } else if (el.type === 'terrainSplat') {
            el.radius = parseFloat(UIElems.pWidth.value) || 100;
            el.force = parseFloat(UIElems.pElevation.value) || 0;
        } else if (el.type === 'roof') {
            el.width = parseFloat(UIElems.pWidth.value);
            el.height = parseFloat(UIElems.pHeight.value);
            el.elevation = parseFloat(UIElems.pElevation.value) || 0;
            el.modelVariant = UIElems.pModel.value;
        } else if (el.type === 'floor') {
            el.width = parseFloat(UIElems.pWidth.value);
            el.height = parseFloat(UIElems.pHeight.value);
        } else if (el.type === 'lightNode') {
            el.intensity = parseFloat(UIElems.pWidth.value) || 1.0;
            el.elevation = parseFloat(UIElems.pElevation.value) || 250;
        } else if (el.type === 'cameraNode') {
            el.elevation = parseFloat(UIElems.pElevation.value) || 160;
        }

        if (el.type === 'wall' || el.type === 'floor' || el.type === 'roof') {
            el.material = UIElems.pMaterial.value || 'none';
        }

        el.rotation = parseFloat(UIElems.pRotation.value) || 0;

        el.color = UIElems.pColor.value;
        el.cost = parseFloat(UIElems.pCost.value);

        // Trigger redraws
        triggerUpdate();
    };

    UIElems.pWidth.addEventListener('input', updateElem);
    UIElems.pHeight.addEventListener('input', updateElem);
    UIElems.pElevation.addEventListener('input', updateElem);
    UIElems.pRotation.addEventListener('input', updateElem);
    if (UIElems.pCurvature) UIElems.pCurvature.addEventListener('input', updateElem);
    UIElems.pMaterial.addEventListener('change', updateElem);
    UIElems.pColor.addEventListener('input', updateElem);
    UIElems.pCost.addEventListener('input', updateElem);
    UIElems.pModel.addEventListener('change', updateElem);

    UIElems.btnDelete.addEventListener('click', () => {
        if (STATE.selectedElement) {
            STATE.elements = STATE.elements.filter(e => e.id !== STATE.selectedElement.id);
            selectElement(null);
            triggerUpdate();
        }
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;
        switch (e.key.toLowerCase()) {
            case 'v': document.querySelector('[data-tool="select"]').click(); break;
            case 'w': document.querySelector('[data-tool="wall"]').click(); break;
            case 'd': document.querySelector('[data-tool="door"]').click(); break;
            case 'n': document.querySelector('[data-tool="window"]').click(); break;
            case 'f': document.querySelector('[data-tool="floor"]').click(); break;
            case 'r': document.querySelector('[data-tool="roof"]').click(); break;
            case 'delete':
            case 'backspace':
                UIElems.btnDelete.click();
                break;
        }
    });
}

function selectElement(el) {
    STATE.selectedElement = el;
    if (el) {
        UIElems.emptyState.style.display = 'none';
        UIElems.dynamicProps.style.display = 'block';
        updatePropertiesUI();
    } else {
        UIElems.emptyState.style.display = 'block';
        UIElems.dynamicProps.style.display = 'none';
    }
}

function updatePropertiesUI() {
    const el = STATE.selectedElement;
    if (!el) return;

    UIElems.pRotation.value = el.rotation || 0;
    if (UIElems.pCurvatureGroup) UIElems.pCurvatureGroup.style.display = 'none';

    // Reset labels and visibility
    UIElems.pWidth.parentElement.previousElementSibling.textContent = 'Width';
    UIElems.pElevation.parentElement.previousElementSibling.textContent = 'Elevation';
    UIElems.pWidth.parentElement.parentElement.style.display = 'block';
    UIElems.pHeight.parentElement.parentElement.style.display = 'block';

    // Populate width, height based on element type
    if (el.type === 'wall') {
        UIElems.pWidth.value = el.length;
        UIElems.pHeight.value = el.height;
        UIElems.pElevation.parentElement.parentElement.style.display = 'none';

        if (UIElems.pCurvatureGroup) {
            UIElems.pCurvatureGroup.style.display = 'block';
            UIElems.pCurvature.value = el.curvature || 0;
        }

        UIElems.pModelGroup.style.display = 'none';
        UIElems.pMaterialGroup.style.display = 'flex';
        UIElems.pMaterial.value = el.material || 'none';
    } else if (el.type === 'door' || el.type === 'window') {
        UIElems.pWidth.value = el.length; // parametric width
        UIElems.pHeight.value = el.height;
        UIElems.pElevation.parentElement.parentElement.style.display = 'block';
        UIElems.pElevation.value = el.elevation || 0;
        UIElems.pMaterialGroup.style.display = 'none';

        // Populate model variants
        UIElems.pModelGroup.style.display = 'flex';
        UIElems.pModel.innerHTML = '';

        const variants = el.type === 'door'
            ? [{ val: 'single', label: 'Single Door' }, { val: 'double', label: 'Double Door' }, { val: 'sliding', label: 'Sliding Door' }]
            : [{ val: 'single', label: 'Single Window' }, { val: 'double', label: 'Double Window' }, { val: 'sliding', label: 'Sliding Window' }];

        variants.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.val;
            opt.textContent = v.label;
            if (el.modelVariant === v.val) opt.selected = true;
            UIElems.pModel.appendChild(opt);
        });
    } else if (el.type === 'furniture') {
        UIElems.pWidth.value = el.width || 100;
        UIElems.pHeight.value = el.length || 100; // mapped properly to length/width
        UIElems.pElevation.parentElement.parentElement.style.display = 'block';
        UIElems.pElevation.value = el.elevation || 0;

        UIElems.pModelGroup.style.display = 'flex';
        UIElems.pModel.innerHTML = '';
        const variants = [
            { val: 'table', label: 'Table' },
            { val: 'chair', label: 'Chair' },
            { val: 'bed', label: 'Bed' },
            { val: 'sofa', label: 'Sofa' },
            { val: 'cabinet', label: 'Cabinet' },
            { val: 'bookshelf', label: 'Bookshelf' },
            { val: 'desk', label: 'Desk' },
            { val: 'plant', label: 'Plant' },
            { val: 'tv', label: 'TV' },
            { val: 'lamp', label: 'Lamp' }
        ];
        variants.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.val;
            opt.textContent = v.label;
            if (el.modelVariant === v.val) opt.selected = true;
            UIElems.pModel.appendChild(opt);
        });
    } else if (el.type === 'terrainSplat') {
        UIElems.pWidth.value = el.radius || 100;
        UIElems.pHeight.parentElement.parentElement.style.display = 'none'; // Only radius matters

        UIElems.pElevation.parentElement.parentElement.style.display = 'block';
        UIElems.pElevation.previousElementSibling.textContent = 'Force'; // Rename Elevation to Force
        UIElems.pElevation.value = el.force || 20;

        UIElems.pModelGroup.style.display = 'none';
        UIElems.pMaterialGroup.style.display = 'none';
        UIElems.pColorGroup.style.display = 'flex'; // allow terrain coloring
    } else if (el.type === 'roof') {
        UIElems.pWidth.value = el.width || 200;
        UIElems.pHeight.value = el.height || 200;
        UIElems.pElevation.parentElement.parentElement.style.display = 'block';
        UIElems.pElevation.value = el.elevation || 0;
        UIElems.pMaterialGroup.style.display = 'flex';
        UIElems.pMaterial.value = el.material || 'none';

        UIElems.pModelGroup.style.display = 'flex';
        UIElems.pModel.innerHTML = '';
        const variants = [
            { val: 'gabled', label: 'Gabled Roof' },
            { val: 'flat', label: 'Flat Roof' },
            { val: 'hipped', label: 'Hipped Roof' }
        ];
        variants.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.val;
            opt.textContent = v.label;
            if (el.modelVariant === v.val) opt.selected = true;
            UIElems.pModel.appendChild(opt);
        });
    } else if (el.type === 'floor') {
        UIElems.pWidth.value = el.width || 200;
        UIElems.pHeight.value = el.height || 200;
        UIElems.pElevation.parentElement.parentElement.style.display = 'none';
        UIElems.pModelGroup.style.display = 'none';
        UIElems.pMaterialGroup.style.display = 'flex';
        UIElems.pMaterial.value = el.material || 'none';
    } else if (el.type === 'lightNode') {
        UIElems.pWidth.previousElementSibling.textContent = 'Intensity';
        UIElems.pWidth.value = el.intensity || 1.0;
        UIElems.pHeight.parentElement.parentElement.style.display = 'none';
        UIElems.pElevation.parentElement.parentElement.style.display = 'block';
        UIElems.pElevation.value = el.elevation || 250;
        UIElems.pModelGroup.style.display = 'none';
        UIElems.pMaterialGroup.style.display = 'none';
        UIElems.pColorGroup.style.display = 'flex';
    } else if (el.type === 'cameraNode') {
        UIElems.pWidth.parentElement.parentElement.style.display = 'none';
        UIElems.pHeight.parentElement.parentElement.style.display = 'none';
        UIElems.pElevation.parentElement.parentElement.style.display = 'block';
        UIElems.pElevation.value = el.elevation || 160;
        UIElems.pModelGroup.style.display = 'none';
        UIElems.pMaterialGroup.style.display = 'none';
        UIElems.pColorGroup.style.display = 'none';
    }

    UIElems.pColor.value = el.color || '#ffffff';
    UIElems.pCost.value = el.cost || 0;
}

// Pricing Engine for Live Cost Estimator
window.PricingEngine = {
    updateTotalUI(elements) {
        const tbody = document.getElementById('bomTableBody');
        const tbTotal = document.getElementById('bomTotal');
        if (!tbody || !tbTotal) return;

        let total = 0;
        let categories = {};

        // Aggregate costs by element type
        elements.forEach(el => {
            const cost = parseFloat(el.cost) || 0;
            if (cost > 0) {
                total += cost;
                const cat = el.type.charAt(0).toUpperCase() + el.type.slice(1) + 's';
                categories[cat] = (categories[cat] || 0) + cost;
            }
        });

        // Update UI
        tbody.innerHTML = '';
        for (let cat in categories) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td style="padding:4px 0;">${cat}</td><td style="text-align:right; padding:4px 0;">$${categories[cat].toFixed(2)}</td>`;
            tbody.appendChild(tr);
        }

        if (Object.keys(categories).length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; padding:10px 0; color:#666; font-style:italic;">Add Cost to items to see totals</td></tr>';
        }

        tbTotal.textContent = `$${total.toFixed(2)}`;
    }
};

// AI Room Generator Logic
window.handleAIPrompt = function (text) {
    STATE_HISTORY.saveState();

    // Parse dimensions (e.g., "4x5", "4 x 5", "4 m pe 5 m")
    let width = 400; // default 4m
    let length = 500; // default 5m

    const dimMatch = text.match(/(\d+)\s*[xX]\s*(\d+)/);
    if (dimMatch) {
        // assume meters
        width = parseFloat(dimMatch[1]) * 100;
        length = parseFloat(dimMatch[2]) * 100;
    }

    // Determine furniture type from text
    let fType = 'table';
    if (text.includes('pat') || text.includes('dormitor') || text.includes('bed')) fType = 'bed';
    if (text.includes('birou') || text.includes('office')) fType = 'table';
    if (text.includes('canapea') || text.includes('living') || text.includes('sofa')) fType = 'sofa';
    if (text.includes('baie') || text.includes('bath')) fType = 'cabinet';
    if (text.includes('usa') || text.includes('door')) fType = 'door';

    // Calculate center of screen or standard offset
    let cx = 0, cy = 0;
    if (window.Editor2D) {
        const wpos = Editor2D.screenToWorld(Editor2D.width / 2, Editor2D.height / 2);
        cx = wpos.x;
        cy = wpos.y;
    }

    const hl = length / 2;
    const hw = width / 2;
    const tl = { x: cx - hw, y: cy - hl };
    const tr = { x: cx + hw, y: cy - hl };
    const br = { x: cx + hw, y: cy + hl };
    const bl = { x: cx - hw, y: cy + hl };

    const t = Date.now();

    // Create 4 walls
    const walls = [
        { id: 'wAI_' + t + '1', type: 'wall', x1: tl.x, y1: tl.y, x2: tr.x, y2: tr.y, length: width, height: STATE.globWallHeight, thick: 20, color: '#ffffff', floor: STATE.activeFloor },
        { id: 'wAI_' + t + '2', type: 'wall', x1: tr.x, y1: tr.y, x2: br.x, y2: br.y, length: length, height: STATE.globWallHeight, thick: 20, color: '#ffffff', floor: STATE.activeFloor },
        { id: 'wAI_' + t + '3', type: 'wall', x1: br.x, y1: br.y, x2: bl.x, y2: bl.y, length: width, height: STATE.globWallHeight, thick: 20, color: '#ffffff', floor: STATE.activeFloor },
        { id: 'wAI_' + t + '4', type: 'wall', x1: bl.x, y1: bl.y, x2: tl.x, y2: tl.y, length: length, height: STATE.globWallHeight, thick: 20, color: '#ffffff', floor: STATE.activeFloor }
    ];

    walls.forEach(w => w.cost = Math.round(w.length / 100 * 50));

    // Create Furniture
    const fur = {
        id: 'fAI_' + t,
        type: 'furniture',
        x: cx,
        y: cy,
        width: fType === 'bed' ? 160 : 100,
        length: fType === 'bed' ? 200 : 100,
        elevation: 0,
        modelVariant: fType,
        color: '#8B4513',
        floor: STATE.activeFloor,
        cost: 200
    };

    STATE.elements.push(...walls, fur);
    triggerUpdate();
};

// Global hook to tell engines to re-evaluate state
function triggerUpdate() {
    if (window.PricingEngine) PricingEngine.updateTotalUI(STATE.elements);
    if (window.Editor2D) Editor2D.needsRedraw = true;
    if (window.Engine3D) Engine3D.needsRebuild = true;
}

// Splitter Drag Logic
function setupSplitter() {
    let isDragging = false;
    UIElems.vSplitter.addEventListener('mousedown', () => {
        isDragging = true;
        UIElems.vSplitter.classList.add('dragging');
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const containerOffset = document.querySelector('.split-view').getBoundingClientRect().left;
        const pointerRelX = e.clientX - containerOffset;
        const containerWidth = document.querySelector('.split-view').getBoundingClientRect().width;

        let leftFlex = (pointerRelX / containerWidth) * 100;
        leftFlex = Math.max(20, Math.min(leftFlex, 80)); // limits 20% to 80%

        UIElems.pane2D.style.flex = `0 0 ${leftFlex}%`;
        UIElems.pane3D.style.flex = `0 0 ${100 - leftFlex}%`;

        // Engine resize signals
        if (window.Editor2D) Editor2D.resize();
        if (window.Engine3D) Engine3D.resize();
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            UIElems.vSplitter.classList.remove('dragging');
        }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.Editor2D) Editor2D.resize();
        if (window.Engine3D) Engine3D.resize();
    });
}

function renderLoop() {
    requestAnimationFrame(renderLoop);
    if (window.Editor2D && Editor2D.needsRedraw) {
        Editor2D.draw();
        Editor2D.needsRedraw = false;
    }
    if (window.Engine3D && Engine3D.needsRebuild) {
        Engine3D.buildScene(STATE.elements);
        Engine3D.needsRebuild = false;
    }
}

// Boot
window.addEventListener('DOMContentLoaded', initApp);
