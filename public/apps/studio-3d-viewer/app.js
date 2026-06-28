document.addEventListener('DOMContentLoaded', () => {
  const viewport = document.getElementById('viewport');
  const canvas2D = document.getElementById('canvas-2d');
  const dragOverlay = document.getElementById('drag-overlay');
  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingText = document.getElementById('loading-text');

  // Sidebar Controls
  const fileNameLabel = document.getElementById('file-name');
  const fileFormatLabel = document.getElementById('file-format');
  const fileSizeLabel = document.getElementById('file-size');
  const modelDimsLabel = document.getElementById('model-dims');
  const modelColorPicker = document.getElementById('model-color');
  const colorHexLabel = document.getElementById('color-hex');
  const modelMaterialSelect = document.getElementById('model-material');
  const scaleSlider = document.getElementById('scale-slider');
  const scaleValLabel = document.getElementById('scale-val');
  const btnResetTransform = document.getElementById('btn-reset-transform');

  // New controls
  const demoModelSelect = document.getElementById('demo-model-select');
  const btnUploadFile = document.getElementById('btn-upload-file');
  const bgColorPicker = document.getElementById('bg-color');
  const bgColorHexLabel = document.getElementById('bg-color-hex');
  const transformToolGroup = document.getElementById('transform-tool-group');
  const preciseSlidersSection = document.getElementById('precise-sliders');

  const btnToolOrbit = document.getElementById('tool-orbit');
  const btnToolTranslate = document.getElementById('tool-translate');
  const btnToolRotate = document.getElementById('tool-rotate');
  const btnToolScale = document.getElementById('tool-scale');
  const btnToolMeasure = document.getElementById('tool-measure');

  // Environment & Render Controls
  const envLightingSelect = document.getElementById('env-lighting-select');
  const renderStyleSelect = document.getElementById('render-style-select');
  const autoRotateCheck = document.getElementById('auto-rotate-check');

  // Exploded & Section Plane Controls
  const explodedViewGroup = document.getElementById('exploded-view-group');
  const explodedSlider = document.getElementById('exploded-slider');
  const explodedValLabel = document.getElementById('exploded-val');

  const sectionPlaneGroup = document.getElementById('section-plane-group');
  const sectionAxisSelect = document.getElementById('section-axis-select');
  const sectionSliderRow = document.getElementById('section-slider-row');
  const sectionSlider = document.getElementById('section-slider');
  const sectionValLabel = document.getElementById('section-val');

  // Physical properties controls
  const physicalPropsGroup = document.getElementById('physical-props-group');
  const modelVolumeLabel = document.getElementById('model-volume');
  const modelSurfaceAreaLabel = document.getElementById('model-surface-area');
  const modelDensitySelect = document.getElementById('model-density-select');
  const modelWeightLabel = document.getElementById('model-weight');

  const measurementDisplayGroup = document.getElementById('measurement-display-group');
  const measurementValLabel = document.getElementById('measurement-val');

  const posSliderX = document.getElementById('pos-x');
  const posSliderY = document.getElementById('pos-y');
  const posSliderZ = document.getElementById('pos-z');
  const posValX = document.getElementById('pos-x-val');
  const posValY = document.getElementById('pos-y-val');
  const posValZ = document.getElementById('pos-z-val');

  const rotSliderX = document.getElementById('rot-x');
  const rotSliderY = document.getElementById('rot-y');
  const rotSliderZ = document.getElementById('rot-z');
  const rotValX = document.getElementById('rot-x-val');
  const rotValY = document.getElementById('rot-y-val');
  const rotValZ = document.getElementById('rot-z-val');

  // Export Buttons
  const btnExportSTL = document.getElementById('export-stl');
  const btnExportOBJ = document.getElementById('export-obj');
  const btnExportGLB = document.getElementById('export-glb');
  const btnExportDXF = document.getElementById('export-dxf');
  const btnExportSVG = document.getElementById('export-svg');
  const btnExportHTML = document.getElementById('export-html');
  const export3DGroup = document.getElementById('export-3d-group');
  const export2DGroup = document.getElementById('export-2d-group');

  // Checkboxes
  const showGridCheck = document.getElementById('show-grid');
  const showBBoxCheck = document.getElementById('show-bbox');

  // Global State
  let activeMode = '3D'; // '3D' or '2D'
  let currentFile = null; // { name, extension, data, isBinary }
  let dxfEntities = [];
  let dxfBounds = null;
  let loadedSvgImage = null;
  let activeTool = 'orbit'; // 'orbit', 'translate', 'rotate', 'scale'
  let currentLang = 'en';

  // 3D Engine Variables
  let scene, camera, renderer, controls, transformControls;
  let modelMesh = null; // Group or mesh loaded
  let gridHelper = null;
  let bboxHelper = null;
  let activeMaterial = null;
  let ambientLight = null;
  let dirLight = null;
  let dirLight2 = null;

  // State for new features
  let initialPositions = new Map(); // Store initial child positions and dir vectors
  let clippingPlanes = []; // Active clipping planes [clipPlaneX, clipPlaneY, clipPlaneZ]
  let clipPlaneX = null;
  let clipPlaneY = null;
  let clipPlaneZ = null;
  let silhouetteLines = null; // Green intersection lines
  let sectionCapMesh = null;  // Solid cap fill mesh at clipping cross-section
  let measurementPoints = []; // 3D/2D coordinates of clicked points
  let measurementSpheres = []; // 3D anchor visual markers
  let measurementLine = null; // connecting visual line in 3D

  // Multi-model scene state
  let modelsInScene = []; // [{ id, mesh, name, extension, color, visible }]
  let activeModelId = null;
  let modelIdCounter = 0;

  function getActiveMesh() {
    const entry = modelsInScene.find(m => m.id === activeModelId);
    return entry ? entry.mesh : null;
  }

  // Section cap DOM refs
  const sectionCapOptions = document.getElementById('section-cap-options');
  const sectionCapColorPicker = document.getElementById('section-cap-color');
  const sectionCapColorHex = document.getElementById('section-cap-color-hex');
  const sectionCapOpacitySlider = document.getElementById('section-cap-opacity');
  const sectionCapOpacityVal = document.getElementById('section-cap-opacity-val');

  // Scene models DOM refs
  const modelsList = document.getElementById('models-list');
  const btnAddModel = document.getElementById('btn-add-model');
  const btnClearScene = document.getElementById('btn-clear-scene');
  const addModelInput = document.getElementById('add-model-input');

  // 2D Canvas variables
  let ctx2d = canvas2D.getContext('2d');
  let zoom2D = 1;
  let offsetX2D = 0;
  let offsetY2D = 0;
  let isDragging2D = false;
  let startDrag2D = { x: 0, y: 0 };

  // Check if THREE loaded correctly
  if (typeof THREE === 'undefined') {
    const errPanel = document.getElementById('error-log-panel');
    errPanel.style.display = 'block';
    errPanel.innerHTML = '<h2>Error: Three.js library failed to load!</h2><p>Please ensure you are connected to the internet, as the 3D viewer relies on online CDNs.</p>';
    return;
  }

  // Initialize ThreeJS Engine
  function init3D() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);

    const width = viewport.clientWidth || window.innerWidth || 800;
    const height = viewport.clientHeight || window.innerHeight || 600;
    const aspect = height > 0 ? (width / height) : 1;

    camera = new THREE.PerspectiveCamera(45, aspect, 0.01, 2000);
    camera.position.set(0, 50, 100);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    viewport.appendChild(renderer.domElement);

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lighting
    ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(200, 400, 200);
    dirLight.castShadow = true;
    scene.add(dirLight);

    dirLight2 = new THREE.DirectionalLight(0x3b82f6, 0.3);
    dirLight2.position.set(-200, 200, -200);
    scene.add(dirLight2);

    gridHelper = new THREE.GridHelper(100, 50, 0x3b82f6, 0x334155);
    scene.add(gridHelper);

    // Initialize clipping planes
    initClippingPlanes();

    // Initialize TransformControls
    transformControls = new THREE.TransformControls(camera, renderer.domElement);
    transformControls.addEventListener('change', () => {
      if (activeMode === '3D') {
        renderer.render(scene, camera);
        updateTransformSlidersFromModel();
      }
    });
    transformControls.addEventListener('dragging-changed', (event) => {
      controls.enabled = !event.value;
    });
    scene.add(transformControls);

    // Measurement mouse clicks
    let isMouseDown = false;
    let mouseDownPos = { x: 0, y: 0 };
    renderer.domElement.addEventListener('pointerdown', (e) => {
      isMouseDown = true;
      mouseDownPos = { x: e.clientX, y: e.clientY };
    });
    renderer.domElement.addEventListener('pointerup', (e) => {
      if (!isMouseDown) return;
      isMouseDown = false;
      const dist = Math.hypot(e.clientX - mouseDownPos.x, e.clientY - mouseDownPos.y);
      if (dist > 15) return; // Dragged, not a click
      
      if (activeMode === '3D' && activeTool === 'measure') {
        handle3DMeasureClick(e);
      } else if (activeMode === '3D' && modelsInScene.length > 1 && activeTool === 'orbit') {
        // Raycaster: click on a model in the scene to select it
        const rect = renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        const allMeshObjects = [];
        modelsInScene.forEach(entry => {
          if (entry.visible && entry.mesh) {
            entry.mesh.traverse(child => { if (child.isMesh) allMeshObjects.push(child); });
          }
        });
        const hits = raycaster.intersectObjects(allMeshObjects);
        if (hits.length > 0) {
          const hitObj = hits[0].object;
          // Find which modelsInScene entry contains this object
          const found = modelsInScene.find(entry => {
            let match = false;
            if (entry.mesh) entry.mesh.traverse(c => { if (c === hitObj) match = true; });
            return match;
          });
          if (found && found.id !== activeModelId) {
            setActiveModel(found.id);
          }
        }
      }
    });

    window.addEventListener('resize', onWindowResize);

    animate();
  }

  function animate() {
    requestAnimationFrame(animate);
    if (activeMode === '3D') {
      if (autoRotateCheck && autoRotateCheck.checked && modelMesh) {
        modelMesh.rotation.y += 0.005;
      }
      controls.update();
      renderer.render(scene, camera);
    }
  }

  function onWindowResize() {
    const width = viewport.clientWidth || window.innerWidth || 800;
    const height = viewport.clientHeight || window.innerHeight || 600;
    if (activeMode === '3D') {
      camera.aspect = height > 0 ? (width / height) : 1;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    } else {
      canvas2D.width = width;
      canvas2D.height = height;
      draw2D();
    }
  }

  // Material Helpers
  function createMaterial(colorHex, type) {
    const color = new THREE.Color(colorHex);
    switch (type) {
      case 'metallic':
        return new THREE.MeshStandardMaterial({
          color: color,
          metalness: 0.9,
          roughness: 0.1
        });
      case 'glass':
        return new THREE.MeshPhysicalMaterial({
          color: color,
          metalness: 0.1,
          roughness: 0.1,
          transparent: true,
          opacity: 0.5,
          transmission: 0.6,
          ior: 1.5,
          side: THREE.DoubleSide
        });
      case 'glow':
        return new THREE.MeshBasicMaterial({
          color: color,
          toneMapped: false
        });
      case 'gold':
        return new THREE.MeshStandardMaterial({
          color: new THREE.Color(0xd4af37),
          metalness: 0.95,
          roughness: 0.15
        });
      case 'silver':
        return new THREE.MeshStandardMaterial({
          color: new THREE.Color(0xc0c0c0),
          metalness: 0.95,
          roughness: 0.15
        });
      case 'copper':
        return new THREE.MeshStandardMaterial({
          color: new THREE.Color(0xb87333),
          metalness: 0.95,
          roughness: 0.25
        });
      case 'jade':
        return new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(0x00a86b),
          metalness: 0.1,
          roughness: 0.15,
          transparent: true,
          opacity: 0.85,
          transmission: 0.4,
          ior: 1.6,
          side: THREE.DoubleSide
        });
      case 'wood':
        return new THREE.MeshStandardMaterial({
          color: new THREE.Color(0x8b5a2b),
          metalness: 0.0,
          roughness: 0.85
        });
      case 'clay':
        return new THREE.MeshStandardMaterial({
          color: new THREE.Color(0xe2725b),
          metalness: 0.0,
          roughness: 0.95
        });
      case 'carbon':
        return new THREE.MeshStandardMaterial({
          color: new THREE.Color(0x2a2a2a),
          metalness: 0.1,
          roughness: 0.75
        });
      case 'default':
      default:
        return new THREE.MeshStandardMaterial({
          color: color,
          roughness: 0.6,
          metalness: 0.1,
          side: THREE.DoubleSide
        });
    }
  }

  function updateModelAppearance() {
    if (!modelMesh) return;
    const color = modelColorPicker.value;
    colorHexLabel.innerText = color.toUpperCase();
    const type = modelMaterialSelect.value;
    
    const oldMaterials = new Set();
    modelMesh.traverse((child) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => oldMaterials.add(m));
        } else {
          oldMaterials.add(child.material);
        }
      }
    });

    activeMaterial = createMaterial(color, type);

    modelMesh.traverse((child) => {
      if (child.isMesh) {
        child.material = activeMaterial;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    oldMaterials.forEach(m => {
      if (m !== activeMaterial && typeof m.dispose === 'function') {
        m.dispose();
      }
    });
  }

  function updateBoundingBox() {
    if (bboxHelper) scene.remove(bboxHelper);
    if (!modelMesh || !showBBoxCheck.checked) return;

    bboxHelper = new THREE.BoxHelper(modelMesh, 0x10b981);
    scene.add(bboxHelper);
  }

  // --- Drag and Drop File Handlers ---
  window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragOverlay.classList.add('active');
  });

  dragOverlay.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  dragOverlay.addEventListener('dragleave', (e) => {
    e.preventDefault();
    if (e.relatedTarget === null || e.relatedTarget === viewport) {
      dragOverlay.classList.remove('active');
    }
  });

  dragOverlay.addEventListener('drop', (e) => {
    e.preventDefault();
    dragOverlay.classList.remove('active');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      loadFile(files[0]);
    }
  });

  viewport.addEventListener('click', () => {
    if (!currentFile) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.stl,.obj,.glb,.dxf,.svg';
      input.onchange = (e) => {
        if (e.target.files.length > 0) {
          loadFile(e.target.files[0]);
        }
      };
      input.click();
    }
  });

  function showLoading(text) {
    loadingOverlay.style.display = 'flex';
    loadingText.innerText = text;
  }

  function hideLoading() {
    loadingOverlay.style.display = 'none';
  }

  function loadFile(file, addToScene = false) {
    try {
      if (!addToScene && demoModelSelect) demoModelSelect.value = 'none';
      const name = file.name;
      const size = (file.size / 1024).toFixed(1) + ' KB';
      const extension = name.split('.').pop().toLowerCase();

      fileNameLabel.innerText = name;
      fileFormatLabel.innerText = extension.toUpperCase();
      fileSizeLabel.innerText = size;

      showLoading(currentLang === 'fr' ? "Lecture du fichier..." : "Reading file...");

      const reader = new FileReader();
      const isBinary = ['stl', 'glb'].includes(extension);

      reader.onload = (e) => {
        try {
          currentFile = {
            name: name,
            extension: extension,
            data: e.target.result,
            isBinary: isBinary
          };
          
          processFileData(addToScene);
        } catch (err) {
          showRuntimeError("File Processing Trigger Error", err);
          hideLoading();
        }
      };

      reader.onerror = () => {
        alert(currentLang === 'fr' ? "Erreur de lecture du fichier !" : "Error reading file!");
        hideLoading();
      };

      if (isBinary) {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    } catch (err) {
      showRuntimeError("File Load Error", err);
      hideLoading();
    }
  }

  // --- Process Loaded Data ---
  function processFileData(addToScene = false) {
    try {
      showLoading(currentLang === 'fr' ? "Analyse du Modèle..." : "Parsing Model...");
      
      const fileToProcess = currentFile;
      if (!addToScene) {
        clearModel();
      }
      currentFile = fileToProcess;

      const { name, extension, data } = currentFile;

      if (['stl', 'obj', 'glb'].includes(extension)) {
        activeMode = '3D';
        canvas2D.style.display = 'none';
        renderer.domElement.style.display = 'block';

        // Update UI for 3D
        export3DGroup.style.display = 'block';
        export2DGroup.style.display = 'none';
        btnExportSTL.style.display = extension === 'stl' ? 'block' : 'none';
        btnExportOBJ.style.display = extension === 'obj' ? 'block' : 'none';
        btnExportGLB.style.display = extension === 'glb' ? 'block' : 'none';

        if (extension === 'stl') {
          const loader = new THREE.STLLoader();
          const geometry = loader.parse(data);
          const material = createMaterial(modelColorPicker.value, modelMaterialSelect.value);
          const mesh = new THREE.Mesh(geometry, material);
          
          if (addToScene) {
            scene.add(mesh);
            addModelToScene(mesh, name, extension);
            centerAndFit3D();
          } else {
            modelMesh = mesh;
            scene.add(modelMesh);
            addModelToScene(modelMesh, name, extension);
            centerAndFit3D();
          }
        } 
        else if (extension === 'obj') {
          const loader = new THREE.OBJLoader();
          const obj = loader.parse(data);
          if (addToScene) {
            scene.add(obj);
            addModelToScene(obj, name, extension);
            centerAndFit3D();
          } else {
            modelMesh = obj;
            scene.add(modelMesh);
            updateModelAppearance();
            addModelToScene(modelMesh, name, extension);
            centerAndFit3D();
          }
        } 
        else if (extension === 'glb') {
          const loader = new THREE.GLTFLoader();
          loader.parse(data, '', (gltf) => {
            try {
              const glbScene = gltf.scene;
              if (addToScene) {
                scene.add(glbScene);
                addModelToScene(glbScene, name, extension);
                centerAndFit3D();
              } else {
                modelMesh = glbScene;
                scene.add(modelMesh);
                updateModelAppearance();
                addModelToScene(modelMesh, name, extension);
                centerAndFit3D();
              }
            } catch (err) {
              showRuntimeError("GLTF Processing Callback Error", err);
              hideLoading();
            }
          }, (err) => {
            alert((currentLang === 'fr' ? "Erreur d'analyse GLB : " : "Error parsing GLB: ") + err.message);
            hideLoading();
          });
        }
      } 
      else if (extension === 'dxf') {
        activeMode = '2D';
        renderer.domElement.style.display = 'none';
        canvas2D.style.display = 'block';
        
        canvas2D.width = viewport.clientWidth;
        canvas2D.height = viewport.clientHeight;

        // Update UI for 2D - Show DXF, Hide SVG
        export3DGroup.style.display = 'none';
        export2DGroup.style.display = 'block';
        btnExportDXF.style.display = 'block';
        btnExportSVG.style.display = 'none';

        dxfEntities = parseDXF(data);
        dxfBounds = getDXFBounds(dxfEntities);

        resetTransform2D();
        draw2D();
        
        modelDimsLabel.innerText = `W: &nbsp;${dxfBounds.width.toFixed(1)} mm, H: &nbsp;${dxfBounds.height.toFixed(1)} mm`;
        
        btnExportSTL.disabled = true;
        btnExportOBJ.disabled = true;
        btnExportGLB.disabled = true;
        btnExportDXF.disabled = false;
        btnExportHTML.disabled = false;
        
        hideLoading();
      } 
      else if (extension === 'svg') {
        activeMode = '2D';
        renderer.domElement.style.display = 'none';
        canvas2D.style.display = 'block';

        canvas2D.width = viewport.clientWidth;
        canvas2D.height = viewport.clientHeight;

        // Update UI for 2D - Show SVG, Hide DXF
        export3DGroup.style.display = 'none';
        export2DGroup.style.display = 'block';
        btnExportDXF.style.display = 'none';
        btnExportSVG.style.display = 'block';
        const svgOrigContainer = document.getElementById('svg-original-colors-container');
        if (svgOrigContainer) svgOrigContainer.style.display = 'flex';

        const coloredSvgText = getColoredSVG(data, modelColorPicker.value);
        const blob = new Blob([coloredSvgText], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          try {
            dxfEntities = []; // clear dxf
            dxfBounds = {
              minX: 0,
              maxX: img.width || 500,
              minY: 0,
              maxY: img.height || 500,
              width: img.width || 500,
              height: img.height || 500,
              centerX: (img.width || 500) / 2,
              centerY: (img.height || 500) / 2
            };
            
            loadedSvgImage = img;
            resetTransform2D();
            draw2D();
            
            modelDimsLabel.innerText = `W: &nbsp;${dxfBounds.width.toFixed(0)} px, H: &nbsp;${dxfBounds.height.toFixed(0)} px`;
            
            btnExportSTL.disabled = true;
            btnExportOBJ.disabled = true;
            btnExportGLB.disabled = true;
            btnExportSVG.disabled = false;
            btnExportHTML.disabled = false;
            
            hideLoading();
          } catch (err) {
            showRuntimeError("SVG Load Image Processing Error", err);
            hideLoading();
          }
        };
        img.onerror = () => {
          alert(currentLang === 'fr' ? "Erreur de rendu du fichier SVG !" : "Error rendering SVG file!");
          hideLoading();
        };
        img.src = url;
      }
    } catch (err) {
      showRuntimeError("File Processing Logic Error", err);
      hideLoading();
    }
  }

  function showRuntimeError(title, err) {
    console.error(title + ":", err);
    const errPanel = document.getElementById('error-log-panel');
    if (errPanel) {
      errPanel.style.display = 'block';
      errPanel.innerText = 'JS Error: ' + title + ' - ' + err.message + '\n' + (err.stack || '');
    }
  }

  // Helper to dispose of geometries and materials to avoid memory leaks
  function disposeNode(node) {
    if (!node) return;
    if (node.geometry) {
      node.geometry.dispose();
    }
    if (node.material) {
      if (Array.isArray(node.material)) {
        node.material.forEach(mat => {
          if (mat && typeof mat.dispose === 'function') mat.dispose();
        });
      } else if (typeof node.material.dispose === 'function') {
        node.material.dispose();
      }
    }
  }

  function clearModel() {
    clearMeasurements();
    const svgOrigContainer = document.getElementById('svg-original-colors-container');
    if (svgOrigContainer) svgOrigContainer.style.display = 'none';
    
    if (transformControls) transformControls.detach();
    if (modelMesh) {
      modelMesh.traverse(disposeNode);
      scene.remove(modelMesh);
      modelMesh = null;
    }
    if (bboxHelper) {
      if (bboxHelper.geometry) bboxHelper.geometry.dispose();
      if (bboxHelper.material) bboxHelper.material.dispose();
      scene.remove(bboxHelper);
      bboxHelper = null;
    }
    ctx2d.clearRect(0, 0, canvas2D.width, canvas2D.height);
    loadedSvgImage = null;
    currentFile = null;
    dxfEntities = [];
    dxfBounds = null;

    // Reset advanced CAD slider and UI groups
    if (explodedSlider) {
      explodedSlider.value = 0.0;
      explodedValLabel.innerText = "0.0";
    }
    if (explodedViewGroup) explodedViewGroup.style.display = "none";
    
    if (silhouetteLines) {
      if (silhouetteLines.geometry) silhouetteLines.geometry.dispose();
      if (silhouetteLines.material) silhouetteLines.material.dispose();
      scene.remove(silhouetteLines);
      silhouetteLines = null;
    }

    if (physicalPropsGroup) {
      physicalPropsGroup.style.display = 'none';
      if (modelVolumeLabel) modelVolumeLabel.innerText = '-';
      if (modelSurfaceAreaLabel) modelSurfaceAreaLabel.innerText = '-';
      if (modelWeightLabel) modelWeightLabel.innerText = '-';
    }

    if (sectionAxisSelect) {
      sectionAxisSelect.value = "none";
    }
    if (sectionSlider) {
      sectionSlider.value = 0;
      sectionValLabel.innerText = "0";
    }
    if (sectionSliderRow) sectionSliderRow.style.display = "none";
    if (sectionPlaneGroup) sectionPlaneGroup.style.display = "none";
    if (measurementDisplayGroup) measurementDisplayGroup.style.display = "none";
    if (autoRotateCheck) autoRotateCheck.checked = false;

    // Reset export buttons to disabled state
    btnExportSTL.disabled = true;
    btnExportOBJ.disabled = true;
    btnExportGLB.disabled = true;
    btnExportDXF.disabled = true;
    btnExportSVG.disabled = true;
    btnExportHTML.disabled = true;

    // Clear section cap mesh
    if (sectionCapMesh) {
      if (sectionCapMesh.geometry) sectionCapMesh.geometry.dispose();
      if (sectionCapMesh.material) sectionCapMesh.material.dispose();
      scene.remove(sectionCapMesh);
      sectionCapMesh = null;
    }
    if (sectionCapOptions) sectionCapOptions.style.display = 'none';

    // Remove only the currently active model from modelsInScene (not all models)
    if (modelsInScene.length > 0) {
      const activeIdx = modelsInScene.findIndex(m => m.id === activeModelId);
      if (activeIdx !== -1) {
        modelsInScene.splice(activeIdx, 1);
      }
      // Select next available model if there is one
      if (modelsInScene.length > 0) {
        const next = modelsInScene[Math.min(activeIdx, modelsInScene.length - 1)];
        activeModelId = next.id;
        // modelMesh will be set after clearModel finishes and the new model loads
      } else {
        activeModelId = null;
      }
      renderModelsList();
    }
  }

  // --- Advanced CAD & Render Features Logic ---
  function initClippingPlanes() {
    renderer.localClippingEnabled = true;
    clipPlaneX = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 99999);
    clipPlaneY = new THREE.Plane(new THREE.Vector3(0, -1, 0), 99999);
    clipPlaneZ = new THREE.Plane(new THREE.Vector3(0, 0, -1), 99999);
    clippingPlanes = [clipPlaneX, clipPlaneY, clipPlaneZ];
  }

  function updateClippingPlanes() {
    if (!modelMesh) return;
    const axis = sectionAxisSelect.value;
    const val = parseFloat(sectionSlider.value);
    sectionValLabel.innerText = val.toFixed(0);
    
    // Reset all planes first
    clipPlaneX.constant = 99999;
    clipPlaneY.constant = 99999;
    clipPlaneZ.constant = 99999;
    
    if (axis === 'none') {
      sectionSliderRow.style.display = 'none';
      // Remove clipping from all models in scene
      const allMeshes = modelsInScene.length > 0 ? modelsInScene.map(m => m.mesh) : [modelMesh];
      allMeshes.forEach(root => {
        if (!root) return;
        root.traverse(child => {
          if (child.isMesh) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(mat => { if (mat) { mat.clippingPlanes = []; mat.needsUpdate = true; } });
          }
        });
      });
    } else {
      sectionSliderRow.style.display = 'flex';
      
      // Update constant of the active plane
      if (axis === 'x') {
        clipPlaneX.constant = val;
      } else if (axis === 'y') {
        clipPlaneY.constant = val;
      } else if (axis === 'z') {
        clipPlaneZ.constant = val;
      }
      
      // Attach active planes to all models in scene
      const allMeshesToClip = modelsInScene.length > 0 ? modelsInScene.map(m => m.mesh) : [modelMesh];
      allMeshesToClip.forEach(root => {
        if (!root) return;
        root.traverse(child => {
          if (child.isMesh) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(mat => {
              if (mat) { mat.clippingPlanes = clippingPlanes; mat.clipShadows = true; mat.needsUpdate = true; }
            });
          }
        });
      });
    }

    updateSectionSilhouette();
    updateSectionCap();

    // Show/hide cap color+opacity controls
    if (sectionCapOptions) {
      sectionCapOptions.style.display = (axis !== 'none') ? 'flex' : 'none';
    }
  }

  function updateExplodedView() {
    if (!modelMesh) return;
    const val = parseFloat(explodedSlider.value);
    explodedValLabel.innerText = val.toFixed(1);
    const maxDim = getModelMaxDim();
    
    initialPositions.forEach((data, child) => {
      child.position.copy(data.pos).addScaledVector(data.dir, val * maxDim * 0.4);
    });
  }

  function getModelMaxDim() {
    if (!modelMesh) return 50;
    const box = new THREE.Box3().setFromObject(modelMesh);
    const size = box.getSize(new THREE.Vector3());
    return Math.max(size.x, size.y, size.z) || 50;
  }

  function calculatePhysicalProperties() {
    if (!modelMesh) return { volume: 0, area: 0 };
    
    let totalVolumeMm3 = 0;
    let totalAreaMm2 = 0;
    
    modelMesh.updateMatrixWorld(true);
    
    modelMesh.traverse(child => {
      if (child.isMesh && child.visible) {
        const geometry = child.geometry;
        if (!geometry) return;
        
        const posAttr = geometry.attributes.position;
        if (!posAttr) return;
        
        const index = geometry.index;
        const matrix = child.matrixWorld;
        
        const v0 = new THREE.Vector3();
        const v1 = new THREE.Vector3();
        const v2 = new THREE.Vector3();
        
        function processTriangle(i0, i1, i2) {
          v0.fromBufferAttribute(posAttr, i0).applyMatrix4(matrix);
          v1.fromBufferAttribute(posAttr, i1).applyMatrix4(matrix);
          v2.fromBufferAttribute(posAttr, i2).applyMatrix4(matrix);
          
          // Signed volume of tetrahedron relative to origin
          const val = v0.x * v1.y * v2.z - v0.x * v1.z * v2.y +
                      v0.y * v1.z * v2.x - v0.y * v1.x * v2.z +
                      v0.z * v1.x * v2.y - v0.z * v1.y * v2.x;
          totalVolumeMm3 += val / 6.0;
          
          // Surface Area
          const edge1 = new THREE.Vector3().subVectors(v1, v0);
          const edge2 = new THREE.Vector3().subVectors(v2, v0);
          const cross = new THREE.Vector3().crossVectors(edge1, edge2);
          totalAreaMm2 += cross.length() / 2.0;
        }
        
        if (index) {
          for (let i = 0; i < index.count; i += 3) {
            processTriangle(index.getX(i), index.getX(i + 1), index.getX(i + 2));
          }
        } else {
          for (let i = 0; i < posAttr.count; i += 3) {
            processTriangle(i, i + 1, i + 2);
          }
        }
      }
    });
    
    // mm^3 to cm^3: divide by 1000
    // mm^2 to cm^2: divide by 100
    const volumeCm3 = Math.abs(totalVolumeMm3) / 1000.0;
    const areaCm2 = totalAreaMm2 / 100.0;
    
    return { volume: volumeCm3, area: areaCm2 };
  }

  function updatePhysicalProperties() {
    if (!modelMesh) {
      if (modelVolumeLabel) modelVolumeLabel.innerText = '-';
      if (modelSurfaceAreaLabel) modelSurfaceAreaLabel.innerText = '-';
      if (modelWeightLabel) modelWeightLabel.innerText = '-';
      return;
    }
    
    const { volume, area } = calculatePhysicalProperties();
    const density = parseFloat(modelDensitySelect.value) || 1.24; // Default PLA
    const weight = volume * density;
    
    if (modelVolumeLabel) modelVolumeLabel.innerText = volume.toFixed(2) + " cm³";
    if (modelSurfaceAreaLabel) modelSurfaceAreaLabel.innerText = area.toFixed(2) + " cm²";
    if (modelWeightLabel) modelWeightLabel.innerText = weight.toFixed(2) + " g";
  }

  function updateSectionSilhouette() {
    if (silhouetteLines) {
      if (silhouetteLines.geometry) silhouetteLines.geometry.dispose();
      if (silhouetteLines.material) silhouetteLines.material.dispose();
      scene.remove(silhouetteLines);
      silhouetteLines = null;
    }

    if (!modelMesh) return;
    const axis = sectionAxisSelect.value;
    if (axis === 'none') return;

    let activePlane = null;
    if (axis === 'x') activePlane = clipPlaneX;
    else if (axis === 'y') activePlane = clipPlaneY;
    else if (axis === 'z') activePlane = clipPlaneZ;

    if (!activePlane) return;

    const points = [];
    const tempV0 = new THREE.Vector3();
    const tempV1 = new THREE.Vector3();
    const tempV2 = new THREE.Vector3();

    modelMesh.updateMatrixWorld(true);

    modelMesh.traverse(child => {
      if (child.isMesh && child.visible) {
        const geometry = child.geometry;
        if (!geometry) return;

        const posAttr = geometry.attributes.position;
        if (!posAttr) return;

        const index = geometry.index;
        const matrix = child.matrixWorld;

        function checkIntersection(i0, i1, i2) {
          tempV0.fromBufferAttribute(posAttr, i0).applyMatrix4(matrix);
          tempV1.fromBufferAttribute(posAttr, i1).applyMatrix4(matrix);
          tempV2.fromBufferAttribute(posAttr, i2).applyMatrix4(matrix);

          const d0 = activePlane.distanceToPoint(tempV0);
          const d1 = activePlane.distanceToPoint(tempV1);
          const d2 = activePlane.distanceToPoint(tempV2);

          const numPos = (d0 >= 0 ? 1 : 0) + (d1 >= 0 ? 1 : 0) + (d2 >= 0 ? 1 : 0);
          if (numPos === 0 || numPos === 3) return;

          const edgeIntersections = [];

          function intersectEdge(pa, pb, da, db) {
            if (da * db < 0) {
              const t = da / (da - db);
              const intersectPt = new THREE.Vector3().lerpVectors(pa, pb, t);
              edgeIntersections.push(intersectPt);
            }
          }

          intersectEdge(tempV0, tempV1, d0, d1);
          intersectEdge(tempV1, tempV2, d1, d2);
          intersectEdge(tempV2, tempV0, d2, d0);

          if (edgeIntersections.length >= 2) {
            points.push(edgeIntersections[0], edgeIntersections[1]);
          }
        }

        if (index) {
          for (let i = 0; i < index.count; i += 3) {
            checkIntersection(index.getX(i), index.getX(i + 1), index.getX(i + 2));
          }
        } else {
          for (let i = 0; i < posAttr.count; i += 3) {
            checkIntersection(i, i + 1, i + 2);
          }
        }
      }
    });

    if (points.length > 0) {
      const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x10b981,
        linewidth: 2,
        depthTest: false,
        depthWrite: false
      });
      silhouetteLines = new THREE.LineSegments(lineGeom, lineMat);
      silhouetteLines.renderOrder = 99999;
      scene.add(silhouetteLines);
    }
  }

  function updateSectionCap() {
    if (sectionCapMesh) {
      if (sectionCapMesh.geometry) sectionCapMesh.geometry.dispose();
      if (sectionCapMesh.material) sectionCapMesh.material.dispose();
      scene.remove(sectionCapMesh);
      sectionCapMesh = null;
    }

    if (!modelMesh) return;
    const axis = sectionAxisSelect.value;
    if (axis === 'none') return;

    let activePlane = null;
    if (axis === 'x') activePlane = clipPlaneX;
    else if (axis === 'y') activePlane = clipPlaneY;
    else if (axis === 'z') activePlane = clipPlaneZ;
    if (!activePlane) return;

    // Collect all intersection points across all meshes in scene
    const allPoints = [];
    const tempV0 = new THREE.Vector3();
    const tempV1 = new THREE.Vector3();
    const tempV2 = new THREE.Vector3();

    const meshesToCheck = modelsInScene.length > 0
      ? modelsInScene.filter(m => m.visible).map(m => m.mesh)
      : (modelMesh ? [modelMesh] : []);

    meshesToCheck.forEach(rootMesh => {
      if (!rootMesh) return;
      rootMesh.updateMatrixWorld(true);
      rootMesh.traverse(child => {
        if (!child.isMesh || !child.visible) return;
        const geometry = child.geometry;
        if (!geometry) return;
        const posAttr = geometry.attributes.position;
        if (!posAttr) return;
        const index = geometry.index;
        const matrix = child.matrixWorld;

        function processTriForCap(i0, i1, i2) {
          tempV0.fromBufferAttribute(posAttr, i0).applyMatrix4(matrix);
          tempV1.fromBufferAttribute(posAttr, i1).applyMatrix4(matrix);
          tempV2.fromBufferAttribute(posAttr, i2).applyMatrix4(matrix);
          const d0 = activePlane.distanceToPoint(tempV0);
          const d1 = activePlane.distanceToPoint(tempV1);
          const d2 = activePlane.distanceToPoint(tempV2);
          const numPos = (d0 >= 0 ? 1 : 0) + (d1 >= 0 ? 1 : 0) + (d2 >= 0 ? 1 : 0);
          if (numPos === 0 || numPos === 3) return;
          function edge(pa, pb, da, db) {
            if (da * db < 0) return new THREE.Vector3().lerpVectors(pa, pb, da / (da - db));
            return null;
          }
          const pts = [
            edge(tempV0, tempV1, d0, d1),
            edge(tempV1, tempV2, d1, d2),
            edge(tempV2, tempV0, d2, d0)
          ].filter(Boolean);
          allPoints.push(...pts);
        }

        if (index) {
          for (let i = 0; i < index.count; i += 3) processTriForCap(index.getX(i), index.getX(i+1), index.getX(i+2));
        } else {
          for (let i = 0; i < posAttr.count; i += 3) processTriForCap(i, i+1, i+2);
        }
      });
    });

    if (allPoints.length < 3) return;

    // Compute centroid for fan triangulation
    const centroid = new THREE.Vector3();
    allPoints.forEach(p => centroid.add(p));
    centroid.divideScalar(allPoints.length);

    // Build fan-triangulated geometry from centroid
    const verts = [];
    for (let i = 0; i < allPoints.length; i += 2) {
      const p1 = allPoints[i];
      const p2 = allPoints[i + 1] || allPoints[0];
      verts.push(centroid.x, centroid.y, centroid.z);
      verts.push(p1.x, p1.y, p1.z);
      verts.push(p2.x, p2.y, p2.z);
    }

    const capGeom = new THREE.BufferGeometry();
    capGeom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));

    const capColor = sectionCapColorPicker ? sectionCapColorPicker.value : '#1e3a5f';
    const capOpacity = sectionCapOpacitySlider ? parseFloat(sectionCapOpacitySlider.value) : 0.75;

    const capMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(capColor),
      transparent: true,
      opacity: capOpacity,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    sectionCapMesh = new THREE.Mesh(capGeom, capMat);
    sectionCapMesh.renderOrder = 99998;
    scene.add(sectionCapMesh);
  }

  // ── Multi-Model Scene UI ─────────────────────────────────────────────────
  const MODEL_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
  ];

  function renderModelsList() {
    if (!modelsList) return;
    modelsList.innerHTML = '';

    if (modelsInScene.length === 0) {
      modelsList.innerHTML = '<div style="font-size: 11px; color: #6b7280; text-align: center; padding: 8px 0;">No models loaded</div>';
      return;
    }

    modelsInScene.forEach(entry => {
      const isActive = entry.id === activeModelId;
      const row = document.createElement('div');
      row.style.cssText = `
        display: flex; align-items: center; gap: 6px; padding: 5px 7px;
        border-radius: 7px; cursor: pointer; font-size: 11px;
        background: ${isActive ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.03)'};
        border: 1px solid ${isActive ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.06)'};
        transition: all 0.15s ease;
        opacity: ${entry.visible ? '1' : '0.4'};
      `;

      // Color swatch
      const swatch = document.createElement('input');
      swatch.type = 'color';
      swatch.value = entry.color;
      swatch.style.cssText = 'width: 16px; height: 16px; border: none; border-radius: 50%; cursor: pointer; padding: 0; background: none; flex-shrink: 0;';
      swatch.addEventListener('input', (e) => {
        e.stopPropagation();
        entry.color = e.target.value;
        if (entry.mesh) {
          entry.mesh.traverse(child => {
            if (child.isMesh) {
              const mats = Array.isArray(child.material) ? child.material : [child.material];
              mats.forEach(mat => { if (mat && mat.color) mat.color.set(e.target.value); });
            }
          });
        }
      });

      // Name + active badge
      const nameSpan = document.createElement('span');
      nameSpan.style.cssText = 'flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: ' + (isActive ? '#e2e8f0' : '#9ca3af') + ';';
      nameSpan.textContent = entry.name;

      if (isActive) {
        const badge = document.createElement('span');
        badge.style.cssText = 'font-size: 9px; background: #3b82f6; color: white; padding: 1px 5px; border-radius: 4px; flex-shrink: 0;';
        badge.textContent = currentLang === 'fr' ? 'ACTIF' : 'ACTIVE';
        nameSpan.appendChild(badge);
      }

      // Visibility toggle
      const eyeBtn = document.createElement('button');
      eyeBtn.textContent = entry.visible ? '👁' : '🚫';
      eyeBtn.title = entry.visible ? 'Hide' : 'Show';
      eyeBtn.style.cssText = 'background: none; border: none; cursor: pointer; font-size: 11px; padding: 0; flex-shrink: 0;';
      eyeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        entry.visible = !entry.visible;
        if (entry.mesh) entry.mesh.visible = entry.visible;
        renderModelsList();
      });

      // Delete button
      const delBtn = document.createElement('button');
      delBtn.textContent = '🗑';
      delBtn.title = 'Remove';
      delBtn.style.cssText = 'background: none; border: none; cursor: pointer; font-size: 11px; padding: 0; flex-shrink: 0;';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeModelById(entry.id);
      });

      row.appendChild(swatch);
      row.appendChild(nameSpan);
      row.appendChild(eyeBtn);
      row.appendChild(delBtn);

      // Click row to select
      row.addEventListener('click', () => setActiveModel(entry.id));
      modelsList.appendChild(row);
    });
  }

  function setActiveModel(id) {
    activeModelId = id;
    modelMesh = getActiveMesh();
    renderModelsList();

    if (modelMesh) {
      // Refresh UI for the newly selected model
      const entry = modelsInScene.find(m => m.id === id);
      if (entry) {
        fileNameLabel.innerText = entry.name;
        fileFormatLabel.innerText = entry.extension.toUpperCase();
      }
      updatePhysicalProperties();
      updateSectionSilhouette();
      updateSectionCap();
    }
  }

  function addModelToScene(mesh, name, extension) {
    const id = ++modelIdCounter;
    const colorIndex = (modelsInScene.length) % MODEL_COLORS.length;
    const color = MODEL_COLORS[colorIndex];

    // Tint the mesh with the scene color
    mesh.traverse(child => {
      if (child.isMesh) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(mat => {
          if (mat && mat.color) {
            // Store original before tinting
            if (!child.userData.originalMaterialProperties) {
              child.userData.originalMaterialProperties = {
                wireframe: mat.wireframe || false,
                transparent: mat.transparent || false,
                opacity: mat.opacity || 1.0,
                depthWrite: mat.depthWrite !== undefined ? mat.depthWrite : true,
                color: mat.color.getHex(),
                emissive: mat.emissive ? mat.emissive.getHex() : null
              };
            }
          }
        });
      }
    });

    const entry = { id, mesh, name, extension, color, visible: true };
    modelsInScene.push(entry);
    setActiveModel(id);
    renderModelsList();
    return entry;
  }

  function removeModelById(id) {
    const idx = modelsInScene.findIndex(m => m.id === id);
    if (idx === -1) return;

    const entry = modelsInScene[idx];
    if (entry.mesh) {
      entry.mesh.traverse(disposeNode);
      scene.remove(entry.mesh);
    }
    modelsInScene.splice(idx, 1);

    // Select next available model or clear
    if (modelsInScene.length > 0) {
      const newActive = modelsInScene[Math.min(idx, modelsInScene.length - 1)];
      setActiveModel(newActive.id);
    } else {
      activeModelId = null;
      modelMesh = null;
      clearAllSceneState();
    }
    renderModelsList();
  }

  function clearAllModels() {
    try {
      // Detach transform controls first to avoid errors
      if (transformControls) { try { transformControls.detach(); } catch(e) {} }
      
      // Remove all meshes from 3D scene safely
      modelsInScene.forEach(entry => {
        if (!entry.mesh) return;
        try {
          entry.mesh.traverse(child => {
            if (!child.isMesh) return;
            if (child.geometry) { try { child.geometry.dispose(); } catch(e) {} }
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(m => { if (m) { try { m.dispose(); } catch(e) {} } });
          });
          scene.remove(entry.mesh);
        } catch(e) {}
      });
      modelsInScene = [];
      activeModelId = null;
      modelMesh = null;

      // Clear silhouette
      if (silhouetteLines) {
        try { silhouetteLines.geometry && silhouetteLines.geometry.dispose(); } catch(e) {}
        try { silhouetteLines.material && silhouetteLines.material.dispose(); } catch(e) {}
        try { scene.remove(silhouetteLines); } catch(e) {}
        silhouetteLines = null;
      }
      // Clear section cap
      if (sectionCapMesh) {
        try { sectionCapMesh.geometry && sectionCapMesh.geometry.dispose(); } catch(e) {}
        try { sectionCapMesh.material && sectionCapMesh.material.dispose(); } catch(e) {}
        try { scene.remove(sectionCapMesh); } catch(e) {}
        sectionCapMesh = null;
      }
      // Clear bboxHelper
      if (bboxHelper) {
        try { bboxHelper.geometry && bboxHelper.geometry.dispose(); } catch(e) {}
        try { bboxHelper.material && bboxHelper.material.dispose(); } catch(e) {}
        try { scene.remove(bboxHelper); } catch(e) {}
        bboxHelper = null;
      }
      // Clear measurements
      try { clearMeasurements(); } catch(e) {}

      // Reset section sliders
      if (sectionAxisSelect) sectionAxisSelect.value = 'none';
      if (sectionSlider) sectionSlider.value = 0;
      if (sectionValLabel) sectionValLabel.innerText = '0';
      if (sectionSliderRow) sectionSliderRow.style.display = 'none';
      if (sectionPlaneGroup) sectionPlaneGroup.style.display = 'none';
      if (sectionCapOptions) sectionCapOptions.style.display = 'none';
      if (explodedSlider) { explodedSlider.value = 0; }
      if (explodedValLabel) explodedValLabel.innerText = '0.0';

      // Reset clip planes
      if (clipPlaneX) clipPlaneX.constant = 99999;
      if (clipPlaneY) clipPlaneY.constant = 99999;
      if (clipPlaneZ) clipPlaneZ.constant = 99999;

      // Reset UI groups
      if (physicalPropsGroup) physicalPropsGroup.style.display = 'none';
      if (transformToolGroup) transformToolGroup.style.display = 'none';
      if (preciseSlidersSection) preciseSlidersSection.style.display = 'none';
      if (explodedViewGroup) explodedViewGroup.style.display = 'none';
      if (measurementDisplayGroup) measurementDisplayGroup.style.display = 'none';
      if (autoRotateCheck) autoRotateCheck.checked = false;
      if (modelDimsLabel) modelDimsLabel.innerText = 'X: -, Y: -, Z: -';

      // Disable export buttons
      try { btnExportSTL.disabled = true; } catch(e) {}
      try { btnExportOBJ.disabled = true; } catch(e) {}
      try { btnExportGLB.disabled = true; } catch(e) {}
      try { btnExportDXF.disabled = true; } catch(e) {}
      try { btnExportSVG.disabled = true; } catch(e) {}
      try { btnExportHTML.disabled = true; } catch(e) {}

      // Reset 2D state
      try { ctx2d.clearRect(0, 0, canvas2D.width, canvas2D.height); } catch(e) {}
      loadedSvgImage = null;
      dxfEntities = [];
      dxfBounds = null;
      currentFile = null;

      renderModelsList();
    } catch(err) {
      // Suppress any cleanup errors to avoid user-visible JS errors
      console.warn('clearAllModels cleanup warning:', err);
      renderModelsList();
    }
  }

  function clearAllSceneState() {
    // Delegate to clearAllModels for consistency
    clearAllModels();
  }

  function updateLightingPreset() {
    if (!renderer || !scene) return;
    const preset = envLightingSelect.value;
    const isBlueprint = renderStyleSelect.value === 'blueprint';
    
    if (preset === 'studio') {
      if (!isBlueprint) {
        scene.background = new THREE.Color(bgColorPicker.value);
      }
      if (ambientLight) {
        ambientLight.color.setHex(0xffffff);
        ambientLight.intensity = 0.4;
      }
      if (dirLight) {
        dirLight.color.setHex(0xffffff);
        dirLight.intensity = 0.8;
      }
      if (dirLight2) {
        dirLight2.color.setHex(0x3b82f6);
        dirLight2.intensity = 0.3;
      }
    } else if (preset === 'sunset') {
      if (!isBlueprint) {
        scene.background = new THREE.Color(0x1a120c);
      }
      bgColorPicker.value = '#1A120C';
      bgColorHexLabel.innerText = '#1A120C';
      if (ambientLight) {
        ambientLight.color.setHex(0xfeb081);
        ambientLight.intensity = 0.4;
      }
      if (dirLight) {
        dirLight.color.setHex(0xff9933);
        dirLight.intensity = 1.2;
      }
      if (dirLight2) {
        dirLight2.color.setHex(0x552244);
        dirLight2.intensity = 0.5;
      }
    } else if (preset === 'cyberpunk') {
      if (!isBlueprint) {
        scene.background = new THREE.Color(0x0a0512);
      }
      bgColorPicker.value = '#0A0512';
      bgColorHexLabel.innerText = '#0A0512';
      if (ambientLight) {
        ambientLight.color.setHex(0x221133);
        ambientLight.intensity = 0.3;
      }
      if (dirLight) {
        dirLight.color.setHex(0xff00ff);
        dirLight.intensity = 1.0;
      }
      if (dirLight2) {
        dirLight2.color.setHex(0x00ffff);
        dirLight2.intensity = 1.0;
      }
    }

    if (isBlueprint) {
      scene.background = new THREE.Color(0x0b1d3a);
    }
  }

  function updateRenderStyle() {
    if (!modelMesh) return;
    const style = renderStyleSelect.value;
    
    if (style === 'blueprint') {
      scene.background = new THREE.Color(0x0b1d3a);
    } else {
      scene.background = new THREE.Color(bgColorPicker.value);
    }

    modelMesh.traverse(child => {
      if (child.isMesh) {
        if (!child.userData.originalMaterialProperties) {
          if (Array.isArray(child.material)) {
            child.userData.originalMaterialProperties = child.material.map(mat => ({
              wireframe: mat ? mat.wireframe : false,
              transparent: mat ? mat.transparent : false,
              opacity: mat ? mat.opacity : 1.0,
              depthWrite: mat ? mat.depthWrite : true,
              color: (mat && mat.color) ? mat.color.getHex() : null,
              emissive: (mat && mat.emissive) ? mat.emissive.getHex() : null
            }));
          } else {
            child.userData.originalMaterialProperties = {
              wireframe: child.material ? child.material.wireframe : false,
              transparent: child.material ? child.material.transparent : false,
              opacity: child.material ? child.material.opacity : 1.0,
              depthWrite: child.material ? child.material.depthWrite : true,
              color: (child.material && child.material.color) ? child.material.color.getHex() : null,
              emissive: (child.material && child.material.emissive) ? child.material.emissive.getHex() : null
            };
          }
        }
        
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat, idx) => {
          if (!mat) return;
          const orig = Array.isArray(child.userData.originalMaterialProperties)
            ? child.userData.originalMaterialProperties[idx]
            : child.userData.originalMaterialProperties;
            
          if (style === 'default') {
            mat.wireframe = orig.wireframe;
            mat.transparent = orig.transparent;
            mat.opacity = orig.opacity;
            mat.depthWrite = orig.depthWrite;
            if (mat.color && orig.color !== null) mat.color.setHex(orig.color);
            if (mat.emissive && orig.emissive !== null) mat.emissive.setHex(orig.emissive);
          } else if (style === 'wireframe') {
            mat.wireframe = true;
            mat.transparent = false;
            mat.opacity = 1.0;
            mat.depthWrite = true;
            if (mat.color && orig.color !== null) mat.color.setHex(orig.color);
            if (mat.emissive && orig.emissive !== null) mat.emissive.setHex(orig.emissive);
          } else if (style === 'xray') {
            mat.wireframe = false;
            mat.transparent = true;
            mat.opacity = 0.25;
            mat.depthWrite = false;
            if (mat.color && orig.color !== null) mat.color.setHex(orig.color);
            if (mat.emissive && orig.emissive !== null) mat.emissive.setHex(orig.emissive);
          } else if (style === 'blueprint') {
            mat.wireframe = true;
            mat.transparent = false;
            mat.opacity = 1.0;
            mat.depthWrite = true;
            if (mat.color) mat.color.setHex(0xffffff);
            if (mat.emissive) mat.emissive.setHex(0x000000);
          }
          mat.needsUpdate = true;
        });
      }
    });
  }

  function clearMeasurements() {
    measurementPoints = [];
    measurementSpheres.forEach(sphere => {
      if (sphere.geometry) sphere.geometry.dispose();
      if (sphere.material) sphere.material.dispose();
      scene.remove(sphere);
    });
    measurementSpheres = [];
    if (measurementLine) {
      if (measurementLine.geometry) measurementLine.geometry.dispose();
      if (measurementLine.material) measurementLine.material.dispose();
      scene.remove(measurementLine);
      measurementLine = null;
    }
    if (activeMode === '2D') {
      draw2D();
    }
  }

  function handle3DMeasureClick(e) {
    if (!modelMesh) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
    const intersects = raycaster.intersectObjects([modelMesh], true);
    
    if (intersects.length > 0) {
      const point = intersects[0].point;
      if (measurementPoints.length >= 2) {
        clearMeasurements();
      }
      measurementPoints.push(point);
      
      const maxDim = getModelMaxDim();
      const r = Math.max(0.01, maxDim / 120);
      
      const sphereGeom = new THREE.SphereGeometry(r, 16, 16);
      const sphereMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
      const sphere = new THREE.Mesh(sphereGeom, sphereMat);
      sphere.position.copy(point);
      scene.add(sphere);
      measurementSpheres.push(sphere);
      
      if (measurementPoints.length === 1) {
        measurementValLabel.innerText = currentLang === 'fr' ? "Faites un clic pour placer le point B" : "Click to place Point B";
      } else if (measurementPoints.length === 2) {
        const pA = measurementPoints[0];
        const pB = measurementPoints[1];
        const distance = pA.distanceTo(pB);
        
        const lineGeom = new THREE.BufferGeometry().setFromPoints([pA, pB]);
        const lineMat = new THREE.LineDashedMaterial({
          color: 0x10b981,
          dashSize: 2,
          gapSize: 1
        });
        const line = new THREE.Line(lineGeom, lineMat);
        line.computeLineDistances();
        scene.add(line);
        measurementLine = line;
        
        measurementValLabel.innerHTML = `Dist: <strong>${distance.toFixed(2)} mm</strong>`;
      }
    }
  }

  function handle2DMeasureClick(e) {
    const rect = canvas2D.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    
    const modelX = (sx - offsetX2D) / zoom2D;
    const modelY = -(sy - offsetY2D) / zoom2D;
    
    if (measurementPoints.length >= 2) {
      clearMeasurements();
    }
    measurementPoints.push({ x: modelX, y: modelY });
    
    if (measurementPoints.length === 1) {
      measurementValLabel.innerText = currentLang === 'fr' ? "Faites un clic pour placer le point B" : "Click to place Point B";
      draw2D();
    } else if (measurementPoints.length === 2) {
      const pA = measurementPoints[0];
      const pB = measurementPoints[1];
      const distance = Math.hypot(pA.x - pB.x, pA.y - pB.y);
      const unit = (currentFile && currentFile.extension === 'svg') ? 'px' : 'mm';
      measurementValLabel.innerHTML = `Dist: <strong>${distance.toFixed(1)} ${unit}</strong>`;
      draw2D();
    }
  }

  function initAdvancedCADEvents() {
    envLightingSelect.addEventListener('change', updateLightingPreset);
    renderStyleSelect.addEventListener('change', updateRenderStyle);
    explodedSlider.addEventListener('input', updateExplodedView);
    
    sectionAxisSelect.addEventListener('change', () => {
      if (!modelMesh) return;
      const axis = sectionAxisSelect.value;
      const box = new THREE.Box3().setFromObject(modelMesh);
      
      if (axis === 'x') {
        sectionSlider.min = box.min.x;
        sectionSlider.max = box.max.x;
        sectionSlider.step = ((box.max.x - box.min.x) / 200) || 0.1;
        sectionSlider.value = (box.min.x + box.max.x) / 2;
      } else if (axis === 'y') {
        sectionSlider.min = box.min.y;
        sectionSlider.max = box.max.y;
        sectionSlider.step = ((box.max.y - box.min.y) / 200) || 0.1;
        sectionSlider.value = (box.min.y + box.max.y) / 2;
      } else if (axis === 'z') {
        sectionSlider.min = box.min.z;
        sectionSlider.max = box.max.z;
        sectionSlider.step = ((box.max.z - box.min.z) / 200) || 0.1;
        sectionSlider.value = (box.min.z + box.max.z) / 2;
      }
      
      updateClippingPlanes();
    });
    
    sectionSlider.addEventListener('input', updateClippingPlanes);
  }

  function getColoredSVG(svgText, color) {
    const origCheck = document.getElementById('svg-original-colors');
    const useOriginalColors = origCheck ? origCheck.checked : true;
    if (useOriginalColors) return svgText;
    
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, 'image/svg+xml');
      const svgEl = doc.querySelector('svg');
      if (!svgEl) return svgText;
      
      const elements = doc.querySelectorAll('path, line, circle, rect, ellipse, polygon, polyline');
      elements.forEach(el => {
        const hasFillAttr = el.hasAttribute('fill');
        const fillAttr = el.getAttribute('fill');
        const hasStrokeAttr = el.hasAttribute('stroke');
        const strokeAttr = el.getAttribute('stroke');
        
        const style = el.getAttribute('style') || '';
        const styleFill = style.match(/fill\s*:\s*([^;]+)/);
        const styleStroke = style.match(/stroke\s*:\s*([^;]+)/);
        
        const isFilled = (hasFillAttr && fillAttr !== 'none') || (styleFill && styleFill[1].trim() !== 'none') || (!hasFillAttr && !styleFill);
        const isStroked = (hasStrokeAttr && strokeAttr !== 'none') || (styleStroke && styleStroke[1].trim() !== 'none');
        
        if (isFilled) {
          el.setAttribute('fill', color);
        }
        if (isStroked) {
          el.setAttribute('stroke', color);
        }
        if (!isFilled && !isStroked) {
          el.setAttribute('fill', color);
        }
      });
      
      const serializer = new XMLSerializer();
      return serializer.serializeToString(doc);
    } catch (e) {
      console.error(e);
      return svgText;
    }
  }

  function reloadSVGWithColor(color) {
    if (!currentFile || currentFile.extension !== 'svg') return;
    const coloredSvgText = getColoredSVG(currentFile.data, color);
    const blob = new Blob([coloredSvgText], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      loadedSvgImage = img;
      draw2D();
    };
    img.src = url;
  }

  function centerAndFit3D() {
    if (!modelMesh) return;

    const box = new THREE.Box3().setFromObject(modelMesh);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    modelMesh.position.x += (modelMesh.position.x - center.x);
    modelMesh.position.y += (modelMesh.position.y - center.y) - box.min.y;
    modelMesh.position.z += (modelMesh.position.z - center.z);
    
    // Reset rotation on new load
    modelMesh.rotation.set(0, 0, 0);

    modelDimsLabel.innerText = `X: ${size.x.toFixed(1)}, Y: ${size.y.toFixed(1)}, Z: ${size.z.toFixed(1)}`;

    if (gridHelper) {
      if (gridHelper.geometry) gridHelper.geometry.dispose();
      if (gridHelper.material) gridHelper.material.dispose();
      scene.remove(gridHelper);
    }
    const maxDim = Math.max(size.x, size.y, size.z);
    
    camera.far = Math.max(5000, maxDim * 10);
    camera.updateProjectionMatrix();

    if (dirLight) dirLight.position.set(maxDim * 2, maxDim * 4, maxDim * 2);
    if (dirLight2) dirLight2.position.set(-maxDim * 2, maxDim * 2, -maxDim * 2);
    
    const gridLimit = Math.max(10, Math.ceil(maxDim * 2.5));
    gridHelper = new THREE.GridHelper(gridLimit, 50, 0x3b82f6, 0x334155);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);
    gridHelper.visible = showGridCheck.checked;

    const fovRad = (camera.fov * Math.PI) / 180;
    let cameraDistance = (maxDim / 2) / Math.tan(fovRad / 2);
    cameraDistance *= 2.2;

    camera.position.set(maxDim * 0.8, maxDim * 0.8, cameraDistance);
    camera.lookAt(new THREE.Vector3(0, size.y / 2, 0));
    controls.target.set(0, size.y / 2, 0);

    scaleSlider.value = 1.0;
    scaleValLabel.innerText = '1.0';

    updateBoundingBox();
    
    btnExportSTL.disabled = currentFile.extension !== 'stl';
    btnExportOBJ.disabled = currentFile.extension !== 'obj';
    btnExportGLB.disabled = currentFile.extension !== 'glb';
    btnExportHTML.disabled = false;

    // Dynamically scale position slider ranges for best feel
    const posRange = Math.ceil(maxDim * 1.5);
    const posStep = Math.max(0.1, parseFloat((posRange / 100).toFixed(1)));
    [posSliderX, posSliderY, posSliderZ].forEach(slider => {
      slider.min = -posRange;
      slider.max = posRange;
      slider.step = posStep;
    });

    // Reveal UI groups
    transformToolGroup.style.display = 'block';
    preciseSlidersSection.style.display = 'flex';

    // Reset rotation / position sliders
    resetTransformSliders();
    updateTransformTool();

    // 1. Exploded view setup
    initialPositions.clear();
    const modelCenter = new THREE.Vector3(0, size.y / 2, 0);
    modelMesh.traverse(child => {
      if (child.isMesh) {
        const childBox = new THREE.Box3().setFromObject(child);
        const childCenter = childBox.getCenter(new THREE.Vector3());
        const dir = childCenter.clone().sub(modelCenter);
        if (dir.lengthSq() < 0.0001) {
          dir.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
        } else {
          dir.normalize();
        }
        initialPositions.set(child, {
          pos: child.position.clone(),
          dir: dir
        });
      }
    });

    // Reset exploded slider
    if (explodedSlider) {
      explodedSlider.value = 0.0;
      explodedValLabel.innerText = "0.0";
    }
    if (explodedViewGroup) explodedViewGroup.style.display = 'block';

    // 2. Section plane setup
    if (sectionAxisSelect) {
      sectionAxisSelect.value = 'none';
    }
    if (sectionSliderRow) sectionSliderRow.style.display = 'none';
    if (sectionPlaneGroup) sectionPlaneGroup.style.display = 'block';
    
    // Reset clipping constant limits
    clipPlaneX.constant = 99999;
    clipPlaneY.constant = 99999;
    clipPlaneZ.constant = 99999;

    // 3. Environment & Style presets
    updateLightingPreset();
    updateRenderStyle();

    // 4. Measure Tool clean reset
    clearMeasurements();
    if (activeTool === 'measure') {
      measurementDisplayGroup.style.display = 'block';
    } else {
      measurementDisplayGroup.style.display = 'none';
    }

    // 5. Update physical properties
    if (physicalPropsGroup) {
      physicalPropsGroup.style.display = 'flex';
      updatePhysicalProperties();
    }

    hideLoading();
  }

  function resetTransformSliders() {
    posSliderX.value = 0;
    posSliderY.value = 0;
    posSliderZ.value = 0;
    posValX.innerText = "0";
    posValY.innerText = "0";
    posValZ.innerText = "0";

    rotSliderX.value = 0;
    rotSliderY.value = 0;
    rotSliderZ.value = 0;
    rotValX.innerText = "0°";
    rotValY.innerText = "0°";
    rotValZ.innerText = "0°";
  }

  function updateTransformTool() {
    if (!transformControls) return;
    transformControls.detach();
    if (activeTool === 'orbit' || activeTool === 'measure') {
      // Orbit or Measure only, no gizmo active
    } else if (modelMesh) {
      if (activeTool === 'translate') {
        transformControls.setMode('translate');
      } else if (activeTool === 'rotate') {
        transformControls.setMode('rotate');
      } else if (activeTool === 'scale') {
        transformControls.setMode('scale');
      }
      transformControls.attach(modelMesh);
    }
  }

  function updateTransformSlidersFromModel() {
    if (!modelMesh) return;
    
    posSliderX.value = modelMesh.position.x;
    posSliderY.value = modelMesh.position.y;
    posSliderZ.value = modelMesh.position.z;
    posValX.innerText = modelMesh.position.x.toFixed(0);
    posValY.innerText = modelMesh.position.y.toFixed(0);
    posValZ.innerText = modelMesh.position.z.toFixed(0);

    const degX = Math.round(THREE.MathUtils.radToDeg(modelMesh.rotation.x)) % 360;
    const degY = Math.round(THREE.MathUtils.radToDeg(modelMesh.rotation.y)) % 360;
    const degZ = Math.round(THREE.MathUtils.radToDeg(modelMesh.rotation.z)) % 360;
    
    rotSliderX.value = degX < 0 ? degX + 360 : degX;
    rotSliderY.value = degY < 0 ? degY + 360 : degY;
    rotSliderZ.value = degZ < 0 ? degZ + 360 : degZ;
    rotValX.innerText = rotSliderX.value + "°";
    rotValY.innerText = rotSliderY.value + "°";
    rotValZ.innerText = rotSliderZ.value + "°";
  }

  function generateDemoModel(type) {
    try {
      showLoading(currentLang === 'fr' ? "Génération du Modèle de Démo..." : "Generating Demo Model...");
      clearModel();
      
      if (type === 'none') {
        fileNameLabel.innerText = "None loaded";
        fileFormatLabel.innerText = "-";
        fileSizeLabel.innerText = "-";
        modelDimsLabel.innerText = "X: -, Y: -, Z: -";
        transformToolGroup.style.display = 'none';
        preciseSlidersSection.style.display = 'none';
        if (transformControls) transformControls.detach();
        hideLoading();
        return;
      }
      
      let group = new THREE.Group();
      const color = modelColorPicker.value;
      const materialType = modelMaterialSelect.value;
      const mat = createMaterial(color, materialType);
      
      if (type === 'gear') {
        // 1. Hub
        const hubGeom = new THREE.CylinderGeometry(5, 5, 6, 24);
        const hub = new THREE.Mesh(hubGeom, mat);
        group.add(hub);
        
        // 2. Spokes
        for (let i = 0; i < 4; i++) {
          const spokeGeom = new THREE.BoxGeometry(26, 4, 3);
          const spoke = new THREE.Mesh(spokeGeom, mat);
          spoke.rotation.y = (i * Math.PI) / 4;
          group.add(spoke);
        }
        
        // 3. Ring
        const ringGeom = new THREE.TorusGeometry(13.5, 1.2, 16, 64);
        ringGeom.rotateX(Math.PI / 2);
        const ring = new THREE.Mesh(ringGeom, mat);
        group.add(ring);
        
        // 4. Gear teeth
        const teethCount = 16;
        for (let i = 0; i < teethCount; i++) {
          const angle = (i / teethCount) * Math.PI * 2;
          const toothGeom = new THREE.BoxGeometry(3, 4.5, 4);
          const tooth = new THREE.Mesh(toothGeom, mat);
          tooth.position.set(Math.cos(angle) * 14.5, 0, Math.sin(angle) * 14.5);
          tooth.rotation.y = -angle;
          group.add(tooth);
        }
      } 
      else if (type === 'ring') {
        const bandMat = createMaterial('#d4af37', 'gold');
        const bandGeom = new THREE.TorusGeometry(12, 1.8, 16, 100);
        bandGeom.rotateX(Math.PI / 2);
        const band = new THREE.Mesh(bandGeom, bandMat);
        group.add(band);
        
        const mountGeom = new THREE.CylinderGeometry(2, 3, 2, 8);
        mountGeom.translate(0, 12.5, 0);
        const mount = new THREE.Mesh(mountGeom, bandMat);
        group.add(mount);
        
        const gemMat = createMaterial('#00f0ff', 'glass');
        const gemGeom = new THREE.OctahedronGeometry(3.5, 0);
        gemGeom.translate(0, 14.5, 0);
        const gem = new THREE.Mesh(gemGeom, gemMat);
        group.add(gem);
      } 
      else if (type === 'knot') {
        const knotGeom = new THREE.TorusKnotGeometry(9, 2.8, 120, 16);
        const knot = new THREE.Mesh(knotGeom, mat);
        group.add(knot);
      } 
      else if (type === 'cube') {
        const cubeGeom = new THREE.BoxGeometry(20, 20, 20);
        const cube = new THREE.Mesh(cubeGeom, mat);
        group.add(cube);
      }
      
      activeMode = '3D';
      canvas2D.style.display = 'none';
      renderer.domElement.style.display = 'block';
      
      modelMesh = group;
      scene.add(modelMesh);
      addModelToScene(modelMesh, `Demo_${type}.stl`, 'stl');
      
      currentFile = {
        name: `Demo_${type}.stl`,
        extension: "stl",
        data: null, // Procedural flag
        isBinary: true
      };
      
      fileNameLabel.innerText = currentFile.name;
      fileFormatLabel.innerText = "STL (Procedural)";
      fileSizeLabel.innerText = "0.0 KB";
      
      centerAndFit3D();
    } catch (err) {
      showRuntimeError("Demo Model Generation Error", err);
      hideLoading();
    }
  }

  // --- DXF Parser State Machine (Supports SPLINE, ELLIPSE, 3DFACE, SOLID, VERTEX) ---
  function parseDXF(text) {
    const lines = text.split(/\r\n|\r|\n/);
    const entities = [];
    let currentEntity = null;
    
    for (let i = 0; i < lines.length; i++) {
      const codeLine = lines[i].trim();
      if (!codeLine) continue;
      
      const code = parseInt(codeLine, 10);
      const value = lines[i+1] ? lines[i+1].trim() : '';
      i++; // Skip value line
      
      const uValue = value.toUpperCase();
      
      if (code === 0) {
        if (uValue === 'VERTEX' && currentEntity && currentEntity.type === 'POLYLINE') {
          // Keep currentEntity active to collect points
        } else if (uValue === 'SEQEND' && currentEntity && currentEntity.type === 'POLYLINE') {
          entities.push(currentEntity);
          currentEntity = null;
        } else {
          if (currentEntity && currentEntity.type !== 'POLYLINE') {
            entities.push(currentEntity);
          }
          if (['LINE', 'CIRCLE', 'ARC', 'LWPOLYLINE', 'POLYLINE', 'SPLINE', 'ELLIPSE', '3DFACE', 'SOLID'].includes(uValue)) {
            currentEntity = { type: uValue, points: [] };
          } else {
            currentEntity = null;
          }
        }
      } else if (currentEntity) {
        if (code === 10) {
          if (['POLYLINE', 'LWPOLYLINE', 'SPLINE'].includes(currentEntity.type)) {
            currentEntity.points.push({ x: parseFloat(value), y: 0 });
          } else if (currentEntity.type === 'LINE') {
            currentEntity.x1 = parseFloat(value);
          } else if (['CIRCLE', 'ARC', 'ELLIPSE', '3DFACE', 'SOLID'].includes(currentEntity.type)) {
            currentEntity.x = parseFloat(value); // center or point 1 X
          }
        } else if (code === 20) {
          if (['POLYLINE', 'LWPOLYLINE', 'SPLINE'].includes(currentEntity.type) && currentEntity.points.length > 0) {
            currentEntity.points[currentEntity.points.length - 1].y = parseFloat(value);
          } else if (currentEntity.type === 'LINE') {
            currentEntity.y1 = parseFloat(value);
          } else if (['CIRCLE', 'ARC', 'ELLIPSE', '3DFACE', 'SOLID'].includes(currentEntity.type)) {
            currentEntity.y = parseFloat(value); // center or point 1 Y
          }
        } else if (code === 11) {
          if (currentEntity.type === 'LINE') {
            currentEntity.x2 = parseFloat(value);
          } else if (currentEntity.type === 'ELLIPSE') {
            currentEntity.mx = parseFloat(value); // major axis X vector
          } else if (['3DFACE', 'SOLID'].includes(currentEntity.type)) {
            currentEntity.x2 = parseFloat(value); // point 2 X
          }
        } else if (code === 21) {
          if (currentEntity.type === 'LINE') {
            currentEntity.y2 = parseFloat(value);
          } else if (currentEntity.type === 'ELLIPSE') {
            currentEntity.my = parseFloat(value); // major axis Y vector
          } else if (['3DFACE', 'SOLID'].includes(currentEntity.type)) {
            currentEntity.y2 = parseFloat(value); // point 2 Y
          }
        } else if (code === 12 && ['3DFACE', 'SOLID'].includes(currentEntity.type)) {
          currentEntity.x3 = parseFloat(value); // point 3 X
        } else if (code === 22 && ['3DFACE', 'SOLID'].includes(currentEntity.type)) {
          currentEntity.y3 = parseFloat(value); // point 3 Y
        } else if (code === 13 && ['3DFACE', 'SOLID'].includes(currentEntity.type)) {
          currentEntity.x4 = parseFloat(value); // point 4 X
        } else if (code === 23 && ['3DFACE', 'SOLID'].includes(currentEntity.type)) {
          currentEntity.y4 = parseFloat(value); // point 4 Y
        } else if (code === 40) {
          if (['CIRCLE', 'ARC'].includes(currentEntity.type)) {
            currentEntity.r = parseFloat(value);
          } else if (currentEntity.type === 'ELLIPSE') {
            currentEntity.ratio = parseFloat(value);
          }
        } else if (code === 50 && currentEntity.type === 'ARC') {
          currentEntity.startAngle = parseFloat(value);
        } else if (code === 51 && currentEntity.type === 'ARC') {
          currentEntity.endAngle = parseFloat(value);
        }
      }
    }
    if (currentEntity && currentEntity.type !== 'POLYLINE') {
      entities.push(currentEntity);
    }
    return entities;
  }

  function getDXFBounds(entities) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    entities.forEach(ent => {
      if (ent.type === 'LINE') {
        minX = Math.min(minX, ent.x1, ent.x2);
        maxX = Math.max(maxX, ent.x1, ent.x2);
        minY = Math.min(minY, ent.y1, ent.y2);
        maxY = Math.max(maxY, ent.y1, ent.y2);
      } else if (ent.type === 'CIRCLE' || ent.type === 'ARC') {
        minX = Math.min(minX, ent.x - ent.r);
        maxX = Math.max(maxX, ent.x + ent.r);
        minY = Math.min(minY, ent.y - ent.r);
        maxY = Math.max(maxY, ent.y + ent.r);
      } else if (['LWPOLYLINE', 'POLYLINE', 'SPLINE'].includes(ent.type)) {
        ent.points.forEach(p => {
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y);
          maxY = Math.max(maxY, p.y);
        });
      } else if (ent.type === 'ELLIPSE') {
        const mx = ent.mx || 0;
        const my = ent.my || 0;
        const r = Math.sqrt(mx*mx + my*my);
        minX = Math.min(minX, ent.x - r);
        maxX = Math.max(maxX, ent.x + r);
        minY = Math.min(minY, ent.y - r);
        maxY = Math.max(maxY, ent.y + r);
      } else if (['3DFACE', 'SOLID'].includes(ent.type)) {
        minX = Math.min(minX, ent.x, ent.x2, ent.x3);
        maxX = Math.max(maxX, ent.x, ent.x2, ent.x3);
        minY = Math.min(minY, ent.y, ent.y2, ent.y3);
        maxY = Math.max(maxY, ent.y, ent.y2, ent.y3);
        if (ent.x4 !== undefined) {
          minX = Math.min(minX, ent.x4);
          maxX = Math.max(maxX, ent.x4);
          minY = Math.min(minY, ent.y4);
          maxY = Math.max(maxY, ent.y4);
        }
      }
    });
    
    if (minX === Infinity) {
      return { minX: 0, maxX: 50, minY: 0, maxY: 50, width: 50, height: 50, centerX: 25, centerY: 25, isEmpty: true };
    }
    return {
      minX, maxX, minY, maxY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
      isEmpty: false
    };
  }

  function draw2D() {
    if (activeMode !== '2D') return;

    ctx2d.clearRect(0, 0, canvas2D.width, canvas2D.height);
    
    ctx2d.strokeStyle = '#1e293b';
    ctx2d.lineWidth = 0.5;
    const gridSize = 40;
    
    for (let x = offsetX2D % gridSize; x < canvas2D.width; x += gridSize) {
      ctx2d.beginPath();
      ctx2d.moveTo(x, 0);
      ctx2d.lineTo(x, canvas2D.height);
      ctx2d.stroke();
    }
    for (let y = offsetY2D % gridSize; y < canvas2D.height; y += gridSize) {
      ctx2d.beginPath();
      ctx2d.moveTo(0, y);
      ctx2d.lineTo(canvas2D.width, y);
      ctx2d.stroke();
    }

    if (loadedSvgImage) {
      ctx2d.drawImage(loadedSvgImage, offsetX2D, offsetY2D, dxfBounds.width * zoom2D, dxfBounds.height * zoom2D);
    }

    if (dxfBounds && dxfBounds.isEmpty) {
      ctx2d.fillStyle = '#9ca3af';
      ctx2d.font = '14px sans-serif';
      ctx2d.textAlign = 'center';
      ctx2d.fillText('No supported DXF entities found (LINE, CIRCLE, ARC, POLYLINE, SPLINE)', canvas2D.width / 2, canvas2D.height / 2);
      return;
    }

    ctx2d.strokeStyle = modelColorPicker.value;
    ctx2d.lineWidth = 1.5;
    
    dxfEntities.forEach(ent => {
      ctx2d.beginPath();
      if (ent.type === 'LINE') {
        ctx2d.moveTo(ent.x1 * zoom2D + offsetX2D, -ent.y1 * zoom2D + offsetY2D);
        ctx2d.lineTo(ent.x2 * zoom2D + offsetX2D, -ent.y2 * zoom2D + offsetY2D);
        ctx2d.stroke();
      } else if (ent.type === 'CIRCLE') {
        ctx2d.arc(ent.x * zoom2D + offsetX2D, -ent.y * zoom2D + offsetY2D, ent.r * zoom2D, 0, 2 * Math.PI);
        ctx2d.stroke();
      } else if (ent.type === 'ARC') {
        const startRad = (ent.startAngle * Math.PI) / 180;
        const endRad = (ent.endAngle * Math.PI) / 180;
        ctx2d.arc(ent.x * zoom2D + offsetX2D, -ent.y * zoom2D + offsetY2D, ent.r * zoom2D, -startRad, -endRad, true);
        ctx2d.stroke();
      } else if (['LWPOLYLINE', 'POLYLINE', 'SPLINE'].includes(ent.type) && ent.points.length > 1) {
        ctx2d.moveTo(ent.points[0].x * zoom2D + offsetX2D, -ent.points[0].y * zoom2D + offsetY2D);
        for (let j = 1; j < ent.points.length; j++) {
          ctx2d.lineTo(ent.points[j].x * zoom2D + offsetX2D, -ent.points[j].y * zoom2D + offsetY2D);
        }
        ctx2d.stroke();
      } else if (ent.type === 'ELLIPSE') {
        const mx = ent.mx || 0;
        const my = ent.my || 0;
        const rMajor = Math.sqrt(mx*mx + my*my);
        const ratio = ent.ratio || 1;
        const rMinor = rMajor * ratio;
        const rotation = Math.atan2(my, mx);
        ctx2d.ellipse(
          ent.x * zoom2D + offsetX2D,
          -ent.y * zoom2D + offsetY2D,
          rMajor * zoom2D,
          rMinor * zoom2D,
          -rotation,
          0,
          2 * Math.PI
        );
        ctx2d.stroke();
      } else if (['3DFACE', 'SOLID'].includes(ent.type)) {
        ctx2d.moveTo(ent.x * zoom2D + offsetX2D, -ent.y * zoom2D + offsetY2D); // Point 1
        ctx2d.lineTo(ent.x2 * zoom2D + offsetX2D, -ent.y2 * zoom2D + offsetY2D); // Point 2
        ctx2d.lineTo(ent.x3 * zoom2D + offsetX2D, -ent.y3 * zoom2D + offsetY2D); // Point 3
        if (ent.x4 !== undefined) {
          ctx2d.lineTo(ent.x4 * zoom2D + offsetX2D, -ent.y4 * zoom2D + offsetY2D); // Point 4
        }
        ctx2d.closePath();
        ctx2d.stroke();
      }
    });

    if (showBBoxCheck.checked && dxfBounds) {
      ctx2d.strokeStyle = '#10b981';
      ctx2d.lineWidth = 1;
      ctx2d.strokeRect(
        dxfBounds.minX * zoom2D + offsetX2D,
        -dxfBounds.maxY * zoom2D + offsetY2D,
        dxfBounds.width * zoom2D,
        dxfBounds.height * zoom2D
      );
    }

    // Render 2D measurement annotations
    if (activeTool === 'measure' && measurementPoints.length > 0) {
      ctx2d.fillStyle = '#10b981';
      ctx2d.strokeStyle = '#10b981';
      ctx2d.lineWidth = 2;
      
      measurementPoints.forEach((p, idx) => {
        const sx = p.x * zoom2D + offsetX2D;
        const sy = -p.y * zoom2D + offsetY2D;
        
        ctx2d.beginPath();
        ctx2d.arc(sx, sy, 5, 0, 2 * Math.PI);
        ctx2d.fill();
        
        ctx2d.fillStyle = '#ffffff';
        ctx2d.font = 'bold 11px sans-serif';
        ctx2d.fillText(idx === 0 ? 'A' : 'B', sx + 8, sy - 8);
        ctx2d.fillStyle = '#10b981';
      });
      
      if (measurementPoints.length === 2) {
        const sA = { x: measurementPoints[0].x * zoom2D + offsetX2D, y: -measurementPoints[0].y * zoom2D + offsetY2D };
        const sB = { x: measurementPoints[1].x * zoom2D + offsetX2D, y: -measurementPoints[1].y * zoom2D + offsetY2D };
        
        ctx2d.beginPath();
        ctx2d.setLineDash([4, 4]);
        ctx2d.moveTo(sA.x, sA.y);
        ctx2d.lineTo(sB.x, sB.y);
        ctx2d.stroke();
        ctx2d.setLineDash([]);
      }
    }
  }

  function resetTransform2D() {
    if (!dxfBounds) return;
    zoom2D = Math.min((canvas2D.width * 0.75) / dxfBounds.width, (canvas2D.height * 0.75) / dxfBounds.height);
    offsetX2D = canvas2D.width / 2 - dxfBounds.centerX * zoom2D;
    if (currentFile && currentFile.extension === 'svg') {
      offsetY2D = canvas2D.height / 2 - dxfBounds.centerY * zoom2D;
    } else {
      offsetY2D = canvas2D.height / 2 + dxfBounds.centerY * zoom2D;
    }
    
    scaleSlider.value = 1.0;
    scaleValLabel.innerText = '1.0';
  }

  // --- 2D Canvas Drag and Zoom Interactions ---
  canvas2D.addEventListener('mousedown', (e) => {
    if (activeMode !== '2D') return;
    if (activeTool === 'measure') {
      handle2DMeasureClick(e);
    } else {
      isDragging2D = true;
      startDrag2D = { x: e.clientX, y: e.clientY };
    }
  });

  canvas2D.addEventListener('mousemove', (e) => {
    if (!isDragging2D || activeMode !== '2D') return;
    const dx = e.clientX - startDrag2D.x;
    const dy = e.clientY - startDrag2D.y;
    offsetX2D += dx;
    offsetY2D += dy;
    startDrag2D = { x: e.clientX, y: e.clientY };
    draw2D();
  });

  window.addEventListener('mouseup', () => {
    isDragging2D = false;
  });

  canvas2D.addEventListener('wheel', (e) => {
    if (activeMode !== '2D') return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    zoom2D *= factor;
    draw2D();
  });

  // --- Sidebar Settings Listeners ---
  modelColorPicker.addEventListener('input', () => {
    colorHexLabel.innerText = modelColorPicker.value.toUpperCase();
    if (activeMode === '3D') {
      updateModelAppearance();
    } else {
      if (currentFile && currentFile.extension === 'svg') {
        reloadSVGWithColor(modelColorPicker.value);
      } else {
        draw2D();
      }
    }
  });

  const svgOrigColorsCheck = document.getElementById('svg-original-colors');
  if (svgOrigColorsCheck) {
    svgOrigColorsCheck.addEventListener('change', () => {
      if (currentFile && currentFile.extension === 'svg') {
        reloadSVGWithColor(modelColorPicker.value);
      }
    });
  }

  modelMaterialSelect.addEventListener('change', updateModelAppearance);
  showBBoxCheck.addEventListener('change', () => {
    if (activeMode === '3D') {
      updateBoundingBox();
    } else {
      draw2D();
    }
  });

  showGridCheck.addEventListener('change', () => {
    if (activeMode === '3D') {
      gridHelper.visible = showGridCheck.checked;
    }
  });

  scaleSlider.addEventListener('input', () => {
    const val = parseFloat(scaleSlider.value);
    scaleValLabel.innerText = val.toFixed(1);
    
    if (activeMode === '3D' && modelMesh) {
      modelMesh.scale.set(val, val, val);
      updateBoundingBox();
      updatePhysicalProperties();
      updateSectionSilhouette();
    } else if (activeMode === '2D' && dxfBounds) {
      zoom2D = (Math.min((canvas2D.width * 0.75) / dxfBounds.width, (canvas2D.height * 0.75) / dxfBounds.height)) * val;
      draw2D();
    }
  });

  btnResetTransform.addEventListener('click', () => {
    if (activeMode === '3D' && modelMesh) {
      modelMesh.scale.set(1, 1, 1);
      modelMesh.position.set(0, 0, 0);
      modelMesh.rotation.set(0, 0, 0);
      centerAndFit3D();
    } else if (activeMode === '2D') {
      resetTransform2D();
      draw2D();
    }
  });

  // Demo Model Selector Listener
  demoModelSelect.addEventListener('change', (e) => {
    generateDemoModel(e.target.value);
  });

  // Background Color Picker Listener
  bgColorPicker.addEventListener('input', () => {
    const color = bgColorPicker.value;
    bgColorHexLabel.innerText = color.toUpperCase();
    if (activeMode === '3D') {
      scene.background.set(new THREE.Color(color));
    } else {
      canvas2D.style.background = color;
      draw2D();
    }
  });

  // Density Select Listener - recalculate weight when material changes
  if (modelDensitySelect) {
    modelDensitySelect.addEventListener('change', updatePhysicalProperties);
  }

  // Section Cap Color + Opacity Listeners
  if (sectionCapColorPicker) {
    sectionCapColorPicker.addEventListener('input', () => {
      if (sectionCapColorHex) sectionCapColorHex.innerText = sectionCapColorPicker.value.toUpperCase();
      if (sectionCapMesh && sectionCapMesh.material) {
        sectionCapMesh.material.color.set(sectionCapColorPicker.value);
      }
    });
  }
  if (sectionCapOpacitySlider) {
    sectionCapOpacitySlider.addEventListener('input', () => {
      const val = parseFloat(sectionCapOpacitySlider.value);
      if (sectionCapOpacityVal) sectionCapOpacityVal.innerText = Math.round(val * 100) + '%';
      if (sectionCapMesh && sectionCapMesh.material) {
        sectionCapMesh.material.opacity = val;
      }
    });
  }

  // Multi-Model Scene: Add Model button
  if (btnAddModel && addModelInput) {
    btnAddModel.addEventListener('click', () => addModelInput.click());
    addModelInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      e.target.value = '';
      loadFile(file, true);
    });
  }

  // Multi-Model Scene: Clear All button
  if (btnClearScene) {
    btnClearScene.addEventListener('click', () => {
      if (modelsInScene.length === 0) return;
      clearAllModels();
    });
  }

  // Initialize models list display
  renderModelsList();

  // Transform Controls Tool Switching Listeners
  const transformTools = [
    { btn: btnToolOrbit, id: 'orbit' },
    { btn: btnToolTranslate, id: 'translate' },
    { btn: btnToolRotate, id: 'rotate' },
    { btn: btnToolScale, id: 'scale' },
    { btn: btnToolMeasure, id: 'measure' }
  ];

  transformTools.forEach(tool => {
    tool.btn.addEventListener('click', () => {
      transformTools.forEach(t => t.btn.classList.remove('active'));
      tool.btn.classList.add('active');
      activeTool = tool.id;
      updateTransformTool();

      if (activeTool !== 'measure') {
        if (measurementDisplayGroup) measurementDisplayGroup.style.display = 'none';
        clearMeasurements();
      } else {
        if (measurementDisplayGroup) measurementDisplayGroup.style.display = 'block';
        measurementValLabel.innerText = currentLang === 'fr' ? "Faites un clic pour placer le point A" : "Click to place Point A";
        clearMeasurements();
      }
    });
  });

  // Precise Sliders Listeners
  posSliderX.addEventListener('input', () => {
    if (modelMesh) {
      modelMesh.position.x = parseFloat(posSliderX.value);
      posValX.innerText = posSliderX.value;
      updateBoundingBox();
      if (transformControls) transformControls.update();
    }
  });
  posSliderY.addEventListener('input', () => {
    if (modelMesh) {
      modelMesh.position.y = parseFloat(posSliderY.value);
      posValY.innerText = posSliderY.value;
      updateBoundingBox();
      if (transformControls) transformControls.update();
    }
  });
  posSliderZ.addEventListener('input', () => {
    if (modelMesh) {
      modelMesh.position.z = parseFloat(posSliderZ.value);
      posValZ.innerText = posSliderZ.value;
      updateBoundingBox();
      if (transformControls) transformControls.update();
    }
  });

  rotSliderX.addEventListener('input', () => {
    if (modelMesh) {
      modelMesh.rotation.x = THREE.MathUtils.degToRad(parseFloat(rotSliderX.value));
      rotValX.innerText = rotSliderX.value + "°";
      updateBoundingBox();
      if (transformControls) transformControls.update();
    }
  });
  rotSliderY.addEventListener('input', () => {
    if (modelMesh) {
      modelMesh.rotation.y = THREE.MathUtils.degToRad(parseFloat(rotSliderY.value));
      rotValY.innerText = rotSliderY.value + "°";
      updateBoundingBox();
      if (transformControls) transformControls.update();
    }
  });
  rotSliderZ.addEventListener('input', () => {
    if (modelMesh) {
      modelMesh.rotation.z = THREE.MathUtils.degToRad(parseFloat(rotSliderZ.value));
      rotValZ.innerText = rotSliderZ.value + "°";
      updateBoundingBox();
      if (transformControls) transformControls.update();
    }
  });

  // --- Sutherland-Hodgman CPU Slicing for Export ---
  function cloneAndSlice(node, worldPlane) {
    let clonedNode;
    if (node.isMesh) {
      clonedNode = new THREE.Mesh();
      clonedNode.name = node.name;
      clonedNode.position.copy(node.position);
      clonedNode.rotation.copy(node.rotation);
      clonedNode.scale.copy(node.scale);
      clonedNode.quaternion.copy(node.quaternion);
      clonedNode.matrix.copy(node.matrix);
      clonedNode.matrixWorld.copy(node.matrixWorld);
      
      if (Array.isArray(node.material)) {
        clonedNode.material = node.material.map(m => m.clone());
      } else if (node.material) {
        clonedNode.material = node.material.clone();
      }
      
      clonedNode.geometry = sliceGeometry(node.geometry, worldPlane, node.matrixWorld);
    } else if (node.isGroup) {
      clonedNode = new THREE.Group();
      clonedNode.name = node.name;
      clonedNode.position.copy(node.position);
      clonedNode.rotation.copy(node.rotation);
      clonedNode.scale.copy(node.scale);
      clonedNode.quaternion.copy(node.quaternion);
      clonedNode.matrix.copy(node.matrix);
      clonedNode.matrixWorld.copy(node.matrixWorld);
    } else {
      clonedNode = new THREE.Object3D();
      clonedNode.name = node.name;
      clonedNode.position.copy(node.position);
      clonedNode.rotation.copy(node.rotation);
      clonedNode.scale.copy(node.scale);
      clonedNode.quaternion.copy(node.quaternion);
      clonedNode.matrix.copy(node.matrix);
      clonedNode.matrixWorld.copy(node.matrixWorld);
    }
    
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child.name && (child.name.includes("helper") || child.name.includes("Measurement"))) {
        continue;
      }
      clonedNode.add(cloneAndSlice(child, worldPlane));
    }
    return clonedNode;
  }

  function sliceGeometry(geometry, worldPlane, matrixWorld) {
    const localPlane = worldPlane.clone().applyMatrix4(matrixWorld.clone().invert());
    let srcGeo = geometry;
    if (geometry.index) {
      srcGeo = geometry.toNonIndexed();
    }
    
    const posAttr = srcGeo.getAttribute('position');
    const normAttr = srcGeo.getAttribute('normal');
    const uvAttr = srcGeo.getAttribute('uv');
    const colAttr = srcGeo.getAttribute('color');
    
    const newPositions = [];
    const newNormals = [];
    const newUvs = [];
    const newColors = [];
    const newGroups = [];
    let currentVertexCount = 0;
    
    const groups = srcGeo.groups && srcGeo.groups.length > 0
      ? srcGeo.groups
      : [{ start: 0, count: posAttr.count, materialIndex: 0 }];
      
    const v0 = new THREE.Vector3();
    const v1 = new THREE.Vector3();
    const v2 = new THREE.Vector3();
    const n0 = new THREE.Vector3();
    const n1 = new THREE.Vector3();
    const n2 = new THREE.Vector3();
    const uv0 = new THREE.Vector2();
    const uv1 = new THREE.Vector2();
    const uv2 = new THREE.Vector2();
    const c0 = new THREE.Color();
    const c1 = new THREE.Color();
    const c2 = new THREE.Color();
    
    function addVertex(v, n, u, c) {
      newPositions.push(v.x, v.y, v.z);
      if (normAttr && n) newNormals.push(n.x, n.y, n.z);
      if (uvAttr && u) newUvs.push(u.x, u.y);
      if (colAttr && c) newColors.push(c.r, c.g, c.b);
      currentVertexCount++;
    }
    
    for (let g = 0; g < groups.length; g++) {
      const group = groups[g];
      const groupStart = group.start;
      const groupCount = group.count;
      const groupEnd = groupStart + groupCount;
      const groupNewStart = currentVertexCount;
      
      for (let i = groupStart; i < groupEnd; i += 3) {
        v0.fromBufferAttribute(posAttr, i);
        if (normAttr) n0.fromBufferAttribute(normAttr, i);
        if (uvAttr) uv0.fromBufferAttribute(uvAttr, i);
        if (colAttr) c0.fromBufferAttribute(colAttr, i);
        
        v1.fromBufferAttribute(posAttr, i + 1);
        if (normAttr) n1.fromBufferAttribute(normAttr, i + 1);
        if (uvAttr) uv1.fromBufferAttribute(uvAttr, i + 1);
        if (colAttr) c1.fromBufferAttribute(colAttr, i + 1);
        
        v2.fromBufferAttribute(posAttr, i + 2);
        if (normAttr) n2.fromBufferAttribute(normAttr, i + 2);
        if (uvAttr) uv2.fromBufferAttribute(uvAttr, i + 2);
        if (colAttr) c2.fromBufferAttribute(colAttr, i + 2);
        
        const d0 = localPlane.distanceToPoint(v0);
        const d1 = localPlane.distanceToPoint(v1);
        const d2 = localPlane.distanceToPoint(v2);
        
        const k0 = d0 >= -1e-7;
        const k1 = d1 >= -1e-7;
        const k2 = d2 >= -1e-7;
        
        const numKept = (k0 ? 1 : 0) + (k1 ? 1 : 0) + (k2 ? 1 : 0);
        
        if (numKept === 3) {
          addVertex(v0, normAttr ? n0 : null, uvAttr ? uv0 : null, colAttr ? c0 : null);
          addVertex(v1, normAttr ? n1 : null, uvAttr ? uv1 : null, colAttr ? c1 : null);
          addVertex(v2, normAttr ? n2 : null, uvAttr ? uv2 : null, colAttr ? c2 : null);
        } else if (numKept === 0) {
          continue;
        } else if (numKept === 1) {
          let kv, nv1, nv2, kd, nd1, nd2;
          let kn, nn1, nn2, ku, nu1, nu2, kc, nc1, nc2;
          if (k0) {
            kv = v0; nv1 = v1; nv2 = v2; kd = d0; nd1 = d1; nd2 = d2;
            if (normAttr) { kn = n0; nn1 = n1; nn2 = n2; }
            if (uvAttr) { ku = uv0; nu1 = uv1; nu2 = uv2; }
            if (colAttr) { kc = c0; nc1 = c1; nc2 = c2; }
          } else if (k1) {
            kv = v1; nv1 = v2; nv2 = v0; kd = d1; nd1 = d2; nd2 = d0;
            if (normAttr) { kn = n1; nn1 = n2; nn2 = n0; }
            if (uvAttr) { ku = uv1; nu1 = uv2; nu2 = uv0; }
            if (colAttr) { kc = c1; nc1 = c2; nc2 = c0; }
          } else {
            kv = v2; nv1 = v0; nv2 = v1; kd = d2; nd1 = d0; nd2 = d1;
            if (normAttr) { kn = n2; nn1 = n0; nn2 = n1; }
            if (uvAttr) { ku = uv2; nu1 = uv0; nu2 = uv1; }
            if (colAttr) { kc = c2; nc1 = c0; nc2 = c1; }
          }
          const t1 = kd / (kd - nd1);
          const i1 = new THREE.Vector3().lerpVectors(kv, nv1, t1);
          const i1_n = normAttr ? new THREE.Vector3().lerpVectors(kn, nn1, t1).normalize() : null;
          const i1_u = uvAttr ? new THREE.Vector2().lerpVectors(ku, nu1, t1) : null;
          const i1_c = colAttr ? new THREE.Color().lerpColors(kc, nc1, t1) : null;
          
          const t2 = kd / (kd - nd2);
          const i2 = new THREE.Vector3().lerpVectors(kv, nv2, t2);
          const i2_n = normAttr ? new THREE.Vector3().lerpVectors(kn, nn2, t2).normalize() : null;
          const i2_u = uvAttr ? new THREE.Vector2().lerpVectors(ku, nu2, t2) : null;
          const i2_c = colAttr ? new THREE.Color().lerpColors(kc, nc2, t2) : null;
          
          addVertex(kv, kn, ku, kc);
          addVertex(i1, i1_n, i1_u, i1_c);
          addVertex(i2, i2_n, i2_u, i2_c);
        } else if (numKept === 2) {
          let dv, kv1, kv2, dd, kd1, kd2;
          let dn, kn1, kn2, du, ku1, ku2, dc, kc1, kc2;
          if (!k0) {
            dv = v0; kv1 = v1; kv2 = v2; dd = d0; kd1 = d1; kd2 = d2;
            if (normAttr) { dn = n0; kn1 = n1; kn2 = n2; }
            if (uvAttr) { du = uv0; ku1 = uv1; ku2 = uv2; }
            if (colAttr) { dc = c0; kc1 = c1; kc2 = c2; }
          } else if (!k1) {
            dv = v1; kv1 = v2; kv2 = v0; dd = d1; kd1 = d2; kd2 = d0;
            if (normAttr) { dn = n1; kn1 = n2; kn2 = n0; }
            if (uvAttr) { du = uv1; ku1 = uv2; ku2 = uv0; }
            if (colAttr) { dc = c1; kc1 = c2; kc2 = c0; }
          } else {
            dv = v2; kv1 = v0; kv2 = v1; dd = d2; kd1 = d0; kd2 = d1;
            if (normAttr) { dn = n2; kn1 = n0; kn2 = n1; }
            if (uvAttr) { du = uv2; ku1 = uv0; ku2 = uv1; }
            if (colAttr) { dc = c2; kc1 = c0; kc2 = c1; }
          }
          const t1 = kd1 / (kd1 - dd);
          const i1 = new THREE.Vector3().lerpVectors(kv1, dv, t1);
          const i1_n = normAttr ? new THREE.Vector3().lerpVectors(kn1, dn, t1).normalize() : null;
          const i1_u = uvAttr ? new THREE.Vector2().lerpVectors(ku1, du, t1) : null;
          const i1_c = colAttr ? new THREE.Color().lerpColors(kc1, dc, t1) : null;
          
          const t2 = kd2 / (kd2 - dd);
          const i2 = new THREE.Vector3().lerpVectors(kv2, dv, t2);
          const i2_n = normAttr ? new THREE.Vector3().lerpVectors(kn2, dn, t2).normalize() : null;
          const i2_u = uvAttr ? new THREE.Vector2().lerpVectors(ku2, du, t2) : null;
          const i2_c = colAttr ? new THREE.Color().lerpColors(kc2, dc, t2) : null;
          
          addVertex(kv1, kn1, ku1, kc1);
          addVertex(kv2, kn2, ku2, kc2);
          addVertex(i2, i2_n, i2_u, i2_c);
          
          addVertex(kv1, kn1, ku1, kc1);
          addVertex(i2, i2_n, i2_u, i2_c);
          addVertex(i1, i1_n, i1_u, i1_c);
        }
      }
      
      const groupNewCount = currentVertexCount - groupNewStart;
      if (groupNewCount > 0) {
        newGroups.push({
          start: groupNewStart,
          count: groupNewCount,
          materialIndex: group.materialIndex
        });
      }
    }
    
    if (geometry.index && srcGeo !== geometry) {
      srcGeo.dispose();
    }
    
    const slicedGeo = new THREE.BufferGeometry();
    slicedGeo.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
    if (normAttr && newNormals.length > 0) {
      slicedGeo.setAttribute('normal', new THREE.Float32BufferAttribute(newNormals, 3));
    }
    if (uvAttr && newUvs.length > 0) {
      slicedGeo.setAttribute('uv', new THREE.Float32BufferAttribute(newUvs, 2));
    }
    if (colAttr && newColors.length > 0) {
      slicedGeo.setAttribute('color', new THREE.Float32BufferAttribute(newColors, 3));
    }
    
    newGroups.forEach(g => {
      slicedGeo.addGroup(g.start, g.count, g.materialIndex);
    });
    
    return slicedGeo;
  }

  function getSceneExportGroup() {
    // Build a combined group from all visible models in scene
    const visibleModels = modelsInScene.filter(m => m.visible && m.mesh);
    if (visibleModels.length === 0) return modelMesh;
    if (visibleModels.length === 1) return visibleModels[0].mesh;
    const combined = new THREE.Group();
    visibleModels.forEach(entry => {
      // Clone the mesh subtree so we don't detach from scene
      const clone = entry.mesh.clone(true);
      combined.add(clone);
    });
    return combined;
  }

  function getSlicedModelForExport() {
    const baseModel = getSceneExportGroup();
    if (!baseModel) return null;
    const axis = sectionAxisSelect.value;
    if (axis === 'none') {
      return baseModel;
    }
    let activePlane;
    if (axis === 'x') activePlane = clipPlaneX;
    else if (axis === 'y') activePlane = clipPlaneY;
    else if (axis === 'z') activePlane = clipPlaneZ;
    if (!activePlane) return baseModel;
    return cloneAndSlice(baseModel, activePlane);
  }

  function disposeSlicedModel(exportModel) {
    if (!exportModel) return;
    const sceneMeshes = modelsInScene.map(m => m.mesh);
    // Only dispose if it's not one of our scene models (i.e. it's a cloned/sliced copy)
    if (!sceneMeshes.includes(exportModel)) {
      exportModel.traverse(child => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => { if (m) m.dispose(); });
          } else if (child.material) {
            child.material.dispose();
          }
        }
      });
    }
  }

  // --- Export Panel Listeners ---
  btnExportSTL.addEventListener('click', () => {
    if (!modelMesh) return;
    showLoading(currentLang === 'fr' ? "Génération du STL..." : "Generating STL...");
    setTimeout(() => {
      const exportModel = getSlicedModelForExport();
      const exporter = new THREE.STLExporter();
      const result = exporter.parse(exportModel, { binary: true });
      const blob = new Blob([result], { type: 'application/octet-stream' });
      triggerDownload(blob, currentFile.name.replace(/\.[^/.]+$/, "") + '_scaled.stl');
      disposeSlicedModel(exportModel);
      hideLoading();
    }, 100);
  });

  btnExportOBJ.addEventListener('click', () => {
    if (!modelMesh) return;
    showLoading(currentLang === 'fr' ? "Génération de l'OBJ..." : "Generating OBJ...");
    setTimeout(() => {
      const exportModel = getSlicedModelForExport();
      const exporter = new THREE.OBJExporter();
      const result = exporter.parse(exportModel);
      const blob = new Blob([result], { type: 'text/plain' });
      triggerDownload(blob, currentFile.name.replace(/\.[^/.]+$/, "") + '_scaled.obj');
      disposeSlicedModel(exportModel);
      hideLoading();
    }, 100);
  });

  btnExportGLB.addEventListener('click', () => {
    if (!modelMesh) return;
    showLoading(currentLang === 'fr' ? "Génération du GLB..." : "Generating GLB...");
    setTimeout(() => {
      const exportModel = getSlicedModelForExport();
      const exporter = new THREE.GLTFExporter();
      exporter.parse(exportModel, (result) => {
        const blob = new Blob([result], { type: 'application/octet-stream' });
        triggerDownload(blob, currentFile.name.replace(/\.[^/.]+$/, "") + '_scaled.glb');
        disposeSlicedModel(exportModel);
        hideLoading();
      }, { binary: true });
    }, 100);
  });

  btnExportDXF.addEventListener('click', () => {
    if (!currentFile || currentFile.extension !== 'dxf') return;
    showLoading(currentLang === 'fr' ? "Génération du DXF..." : "Generating DXF...");
    setTimeout(() => {
      const dxfContent = generateDXFString();
      const blob = new Blob([dxfContent], { type: 'application/dxf' });
      triggerDownload(blob, currentFile.name.replace(/\.[^/.]+$/, "") + '_scaled.dxf');
      hideLoading();
    }, 100);
  });

  btnExportSVG.addEventListener('click', () => {
    if (!currentFile) return;
    showLoading(currentLang === 'fr' ? "Génération du SVG..." : "Generating SVG...");
    setTimeout(() => {
      let svgContent = '';
      if (currentFile.extension === 'dxf') {
        svgContent = generateSVGString();
      } else if (currentFile.extension === 'svg') {
        svgContent = getScaledSVGForSVGFile();
      }
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      triggerDownload(blob, currentFile.name.replace(/\.[^/.]+$/, "") + '_scaled.svg');
      hideLoading();
    }, 100);
  });

  function generateDXFString() {
    if (dxfEntities.length === 0) return '';
    const s = parseFloat(scaleSlider.value);
    let dxf = [];
    dxf.push("  0");
    dxf.push("SECTION");
    dxf.push("  2");
    dxf.push("HEADER");
    dxf.push("  0");
    dxf.push("ENDSEC");
    dxf.push("  0");
    dxf.push("SECTION");
    dxf.push("  2");
    dxf.push("ENTITIES");
    
    dxfEntities.forEach(ent => {
      if (ent.type === 'LINE') {
        dxf.push("  0");
        dxf.push("LINE");
        dxf.push("  8");
        dxf.push("0");
        dxf.push(" 10");
        dxf.push((ent.x1 * s).toString());
        dxf.push(" 20");
        dxf.push((ent.y1 * s).toString());
        dxf.push(" 30");
        dxf.push("0.0");
        dxf.push(" 11");
        dxf.push((ent.x2 * s).toString());
        dxf.push(" 21");
        dxf.push((ent.y2 * s).toString());
        dxf.push(" 31");
        dxf.push("0.0");
      } else if (ent.type === 'CIRCLE') {
        dxf.push("  0");
        dxf.push("CIRCLE");
        dxf.push("  8");
        dxf.push("0");
        dxf.push(" 10");
        dxf.push((ent.x * s).toString());
        dxf.push(" 20");
        dxf.push((ent.y * s).toString());
        dxf.push(" 30");
        dxf.push("0.0");
        dxf.push(" 40");
        dxf.push((ent.r * s).toString());
      } else if (ent.type === 'ARC') {
        dxf.push("  0");
        dxf.push("ARC");
        dxf.push("  8");
        dxf.push("0");
        dxf.push(" 10");
        dxf.push((ent.x * s).toString());
        dxf.push(" 20");
        dxf.push((ent.y * s).toString());
        dxf.push(" 30");
        dxf.push("0.0");
        dxf.push(" 40");
        dxf.push((ent.r * s).toString());
        dxf.push(" 50");
        dxf.push(ent.startAngle.toString());
        dxf.push(" 51");
        dxf.push(ent.endAngle.toString());
      } else if (['LWPOLYLINE', 'POLYLINE', 'SPLINE'].includes(ent.type) && ent.points.length > 0) {
        dxf.push("  0");
        dxf.push("LWPOLYLINE");
        dxf.push("  8");
        dxf.push("0");
        dxf.push(" 90");
        dxf.push(ent.points.length.toString());
        dxf.push(" 70");
        dxf.push("0");
        ent.points.forEach(p => {
          dxf.push(" 10");
          dxf.push((p.x * s).toString());
          dxf.push(" 20");
          dxf.push((p.y * s).toString());
        });
      } else if (ent.type === 'ELLIPSE') {
        dxf.push("  0");
        dxf.push("ELLIPSE");
        dxf.push("  8");
        dxf.push("0");
        dxf.push(" 10");
        dxf.push((ent.x * s).toString());
        dxf.push(" 20");
        dxf.push((ent.y * s).toString());
        dxf.push(" 30");
        dxf.push("0.0");
        dxf.push(" 11");
        dxf.push(((ent.mx || 0) * s).toString());
        dxf.push(" 21");
        dxf.push(((ent.my || 0) * s).toString());
        dxf.push(" 31");
        dxf.push("0.0");
        dxf.push(" 40");
        dxf.push((ent.ratio || 1.0).toString());
        dxf.push(" 41");
        dxf.push("0.0");
        dxf.push(" 42");
        dxf.push((2 * Math.PI).toString());
      } else if (['3DFACE', 'SOLID'].includes(ent.type)) {
        dxf.push("  0");
        dxf.push(ent.type);
        dxf.push("  8");
        dxf.push("0");
        dxf.push(" 10");
        dxf.push((ent.x * s).toString());
        dxf.push(" 20");
        dxf.push((ent.y * s).toString());
        dxf.push(" 30");
        dxf.push("0.0");
        dxf.push(" 11");
        dxf.push((ent.x2 * s).toString());
        dxf.push(" 21");
        dxf.push((ent.y2 * s).toString());
        dxf.push(" 31");
        dxf.push("0.0");
        dxf.push(" 12");
        dxf.push((ent.x3 * s).toString());
        dxf.push(" 22");
        dxf.push((ent.y3 * s).toString());
        dxf.push(" 32");
        dxf.push("0.0");
        dxf.push(" 13");
        dxf.push(((ent.x4 !== undefined ? ent.x4 : ent.x3) * s).toString());
        dxf.push(" 23");
        dxf.push(((ent.y4 !== undefined ? ent.y4 : ent.y3) * s).toString());
        dxf.push(" 33");
        dxf.push("0.0");
      }
    });
    dxf.push("  0");
    dxf.push("ENDSEC");
    dxf.push("  0");
    dxf.push("EOF");
    return dxf.join("\n");
  }

  function generateSVGString() {
    if (!dxfBounds || dxfEntities.length === 0) return '';
    const s = parseFloat(scaleSlider.value);
    const width = dxfBounds.width;
    const height = dxfBounds.height;
    const scaledWidth = width * s;
    const scaledHeight = height * s;
    const viewBoxX = dxfBounds.minX * s;
    const viewBoxY = -dxfBounds.maxY * s;
    const color = modelColorPicker.value;
    
    let svgContent = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n`;
    svgContent += `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="${viewBoxX} ${viewBoxY} ${scaledWidth} ${scaledHeight}">\n`;
    
    dxfEntities.forEach(ent => {
      if (ent.type === 'LINE') {
        const x1 = ent.x1 * s;
        const y1 = -ent.y1 * s;
        const x2 = ent.x2 * s;
        const y2 = -ent.y2 * s;
        svgContent += `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1.5" fill="none" />\n`;
      } else if (ent.type === 'CIRCLE') {
        const cx = ent.x * s;
        const cy = -ent.y * s;
        const r = ent.r * s;
        svgContent += `  <circle cx="${cx}" cy="${cy}" r="${r}" stroke="${color}" stroke-width="1.5" fill="none" />\n`;
      } else if (ent.type === 'ARC') {
        const startRad = (ent.startAngle * Math.PI) / 180;
        const endRad = (ent.endAngle * Math.PI) / 180;
        const xs = (ent.x + ent.r * Math.cos(startRad)) * s;
        const ys = -(ent.y + ent.r * Math.sin(startRad)) * s;
        const xe = (ent.x + ent.r * Math.cos(endRad)) * s;
        const ye = -(ent.y + ent.r * Math.sin(endRad)) * s;
        let diff = ent.endAngle - ent.startAngle;
        if (diff < 0) diff += 360;
        const largeArcFlag = diff > 180 ? 1 : 0;
        const sweepFlag = 0;
        svgContent += `  <path d="M ${xs} ${ys} A ${ent.r * s} ${ent.r * s} 0 ${largeArcFlag} ${sweepFlag} ${xe} ${ye}" stroke="${color}" stroke-width="1.5" fill="none" />\n`;
      } else if (['LWPOLYLINE', 'POLYLINE', 'SPLINE'].includes(ent.type) && ent.points.length > 1) {
        let pathD = `M ${ent.points[0].x * s} ${-ent.points[0].y * s}`;
        for (let j = 1; j < ent.points.length; j++) {
          pathD += ` L ${ent.points[j].x * s} ${-ent.points[j].y * s}`;
        }
        svgContent += `  <path d="${pathD}" stroke="${color}" stroke-width="1.5" fill="none" />\n`;
      } else if (ent.type === 'ELLIPSE') {
        const mx = ent.mx || 0;
        const my = ent.my || 0;
        const rMajor = Math.sqrt(mx*mx + my*my);
        const ratio = ent.ratio || 1;
        const rMinor = rMajor * ratio;
        const rotation = Math.atan2(my, mx);
        const deg = -rotation * 180 / Math.PI;
        const cx = ent.x * s;
        const cy = -ent.y * s;
        svgContent += `  <ellipse cx="${cx}" cy="${cy}" rx="${rMajor * s}" ry="${rMinor * s}" transform="rotate(${deg}, ${cx}, ${cy})" stroke="${color}" stroke-width="1.5" fill="none" />\n`;
      } else if (['3DFACE', 'SOLID'].includes(ent.type)) {
        const p1x = ent.x * s;
        const p1y = -ent.y * s;
        const p2x = ent.x2 * s;
        const p2y = -ent.y2 * s;
        const p3x = ent.x3 * s;
        const p3y = -ent.y3 * s;
        let points = `${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y}`;
        if (ent.x4 !== undefined) {
          const p4x = ent.x4 * s;
          const p4y = -ent.y4 * s;
          points += ` ${p4x},${p4y}`;
        }
        svgContent += `  <polygon points="${points}" stroke="${color}" stroke-width="1.5" fill="none" />\n`;
      }
    });
    
    svgContent += `</svg>\n`;
    return svgContent;
  }

  function getScaledSVGForSVGFile() {
    if (!currentFile || currentFile.extension !== 'svg') return '';
    const s = parseFloat(scaleSlider.value);
    const color = modelColorPicker.value;
    
    const coloredSvg = getColoredSVG(currentFile.data, color);
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(coloredSvg, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');
    if (!svgEl) return coloredSvg;
    
    let widthAttr = svgEl.getAttribute('width');
    let heightAttr = svgEl.getAttribute('height');
    let width = parseFloat(widthAttr) || dxfBounds.width;
    let height = parseFloat(heightAttr) || dxfBounds.height;
    
    svgEl.setAttribute('width', (width * s).toString() + (widthAttr && widthAttr.endsWith('px') ? 'px' : widthAttr && widthAttr.endsWith('mm') ? 'mm' : ''));
    svgEl.setAttribute('height', (height * s).toString() + (heightAttr && heightAttr.endsWith('px') ? 'px' : heightAttr && heightAttr.endsWith('mm') ? 'mm' : ''));
    
    if (!svgEl.getAttribute('viewBox')) {
      svgEl.setAttribute('viewBox', `0 0 ${width} ${height}`);
    }
    
    const serializer = new XMLSerializer();
    return serializer.serializeToString(doc);
  }

  btnExportHTML.addEventListener('click', () => {
    showLoading(currentLang === 'fr' ? "Génération du visualiseur HTML..." : "Generating HTML Viewer...");
    setTimeout(async () => {
      try {
        const activeColor = modelColorPicker.value;
        const activeMaterialType = modelMaterialSelect.value;
        const activeBgColor = bgColorPicker.value;

        const visibleModels = modelsInScene.filter(m => m.visible && m.mesh);

        // If multiple models in scene, combine into a single GLB for embedding
        if (visibleModels.length > 1) {
          const combinedGroup = getSceneExportGroup();
          const glbExporter = new THREE.GLTFExporter();
          glbExporter.parse(combinedGroup, async (glbBuffer) => {
            try {
              const data64 = await arrayBufferToBase64Async(glbBuffer);
              const exportName = 'scene_combined';
              const htmlTemplate = getHTMLTemplate(data64, 'glb', exportName + '.glb', activeColor, activeMaterialType, activeBgColor, currentLang);
              const blob = new Blob([htmlTemplate], { type: 'text/html' });
              triggerDownload(blob, exportName + '_interactive.html');
            } catch(e) {
              alert((currentLang === 'fr' ? "Échec de l'exportation HTML : " : "Failed to export HTML: ") + e.message);
            } finally {
              hideLoading();
            }
          }, { binary: true });
          return;
        }

        // Single model (original flow)
        let format = currentFile ? currentFile.extension : 'stl';
        let data64 = '';

        if (!currentFile || currentFile.data === null) {
          // Procedural demo model — export geometry to binary STL
          const exporter = new THREE.STLExporter();
          const result = exporter.parse(modelMesh, { binary: true });
          data64 = await arrayBufferToBase64Async(result);
          format = 'stl';
        } else {
          if (currentFile.isBinary) {
            data64 = await arrayBufferToBase64Async(currentFile.data);
          } else {
            let textData = currentFile.data;
            if (currentFile.extension === 'svg') {
              textData = getColoredSVG(textData, activeColor);
            }
            data64 = await textToBase64Async(textData);
          }
        }

        const exportFilename = (currentFile ? currentFile.name : 'model.stl');
        const htmlTemplate = getHTMLTemplate(data64, format, exportFilename, activeColor, activeMaterialType, activeBgColor, currentLang);
        const blob = new Blob([htmlTemplate], { type: 'text/html' });
        triggerDownload(blob, exportFilename.replace(/\.[^/.]+$/, "") + '_interactive.html');
      } catch (err) {
        alert((currentLang === 'fr' ? "Échec de l'exportation HTML : " : "Failed to export HTML: ") + err.message);
      } finally {
        hideLoading();
      }
    }, 100);
  });

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function arrayBufferToBase64Async(buffer) {
    return new Promise((resolve, reject) => {
      const blob = new Blob([buffer]);
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(blob);
    });
  }

  function textToBase64Async(text) {
    return new Promise((resolve, reject) => {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(blob);
    });
  }

  // --- Interactive HTML Viewport Template (Offline Self-Contained) ---
  function getHTMLTemplate(base64Data, format, fileName, color, materialType, bgColor, activeLang) {
    const is3D = ["stl", "obj", "glb"].includes(format);
    const scriptTags = is3D ? `
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"><\/script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/TransformControls.js"><\/script>
  ${format === 'stl' ? '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/STLLoader.js"><\/script>' : ''}
  ${format === 'obj' ? '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/OBJLoader.js"><\/script>' : ''}
  ${format === 'glb' ? '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"><\/script>' : ''}
    ` : '';

    const subtitleText = is3D
      ? (activeLang === 'fr' ? "Faites glisser pour pivoter, défilez pour zoomer" : "Drag to rotate, scroll to zoom")
      : (activeLang === 'fr' ? "Faites glisser pour déplacer, défilez pour zoomer" : "Drag to pan, scroll to zoom");
      
    const bgLabel = activeLang === 'fr' ? "Fond :" : "Background:";
    const cameraLabel = activeLang === 'fr' ? "🔍 Caméra" : "🔍 Camera";
    const moveLabel = activeLang === 'fr' ? "Déplacer" : "Move";
    const rotateLabel = activeLang === 'fr' ? "Pivoter" : "Rotate";
    const scaleLabel = activeLang === 'fr' ? "Échelle" : "Scale";
    const measureLabel = activeLang === 'fr' ? "📏 Mesure" : "📏 Measure";

    const envLabel = activeLang === 'fr' ? "Environnement :" : "Environment:";
    const renderLabel = activeLang === 'fr' ? "Style Rendu :" : "Render Style:";
    const autoRotateLabel = activeLang === 'fr' ? "Auto-Rotation" : "Auto-Rotate";
    const explodedLabel = activeLang === 'fr' ? "Vue Éclatée :" : "Exploded View:";
    const sectionAxisLabel = activeLang === 'fr' ? "Axe de Coupe :" : "Section Axis:";
    const sectionPosLabel = activeLang === 'fr' ? "Position Coupe :" : "Section Position:";

    const dxfEntitiesJson = format === 'dxf' ? JSON.stringify(dxfEntities) : '[]';
    const dxfBoundsJson = format === 'dxf' ? JSON.stringify(dxfBounds) : 'null';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${fileName} - Studios-Pro Viewer</title>
  <style>
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: ${bgColor}; font-family: sans-serif; }
    #canvas-container { width: 100%; height: 100%; position: relative; }
    #header { position: absolute; top: 20px; left: 20px; z-index: 10; color: white; background: rgba(17, 24, 39, 0.7); backdrop-filter: blur(8px); padding: 12px 20px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); }
    h1 { margin: 0; font-size: 16px; }
    p { margin: 4px 0 0 0; font-size: 11px; opacity: 0.7; }
    #controls-panel {
      position: absolute; top: 20px; right: 20px; z-index: 10; color: white;
      background: rgba(17, 24, 39, 0.75); backdrop-filter: blur(8px);
      padding: 15px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1);
      width: 200px; box-shadow: 0 10px 25px rgba(0,0,0,0.4);
    }
    .control-row { margin-bottom: 10px; display: flex; flex-direction: column; gap: 4px; }
    .control-row label { font-size: 10px; opacity: 0.8; font-weight: 600; text-transform: uppercase; color: #3b82f6; letter-spacing: 0.5px; }
    .control-row select, .control-row input[type="range"] {
      width: 100%; background: rgba(0,0,0,0.3); color: white;
      border: 1px solid rgba(255,255,255,0.1); padding: 5px; border-radius: 6px;
      font-size: 11px; outline: none; box-sizing: border-box;
    }
    .checkbox-row { display: flex; align-items: center; gap: 6px; font-size: 11px; margin-bottom: 6px; }
    .checkbox-row input { margin: 0; cursor: pointer; }
    .checkbox-row label { cursor: pointer; opacity: 0.8; }
  </style>
  ${scriptTags}
</head>
<body>
  <div id="header">
    <h1>${fileName}</h1>
    <p>Format: ${format.toUpperCase()} • ${subtitleText}</p>
    <div style="margin-top: 8px; display: flex; align-items: center; gap: 8px; font-size: 11px; opacity: 0.8;">
      ${bgLabel} <input type="color" id="local-bg-color" value="${bgColor}" style="width:20px;height:20px;border:none;border-radius:50%;cursor:pointer;background:none;padding:0;">
    </div>
  </div>

  <div id="controls-panel">
    <div class="control-row">
      <label>${renderLabel}</label>
      <select id="local-render-style">
        <option value="default">${activeLang === 'fr' ? 'Défaut' : 'Default'}</option>
        <option value="wireframe">${activeLang === 'fr' ? 'Filaire' : 'Wireframe'}</option>
        <option value="xray">${activeLang === 'fr' ? 'Rayons X' : 'X-Ray'}</option>
        <option value="blueprint">${activeLang === 'fr' ? 'Plan Technique' : 'Technical Blueprint'}</option>
      </select>
    </div>
    <div class="control-row">
      <label>${envLabel}</label>
      <select id="local-lighting-preset">
        <option value="studio">${activeLang === 'fr' ? 'Studio (Jour)' : 'Studio (Daylight)'}</option>
        <option value="sunset">${activeLang === 'fr' ? 'Crépuscule (Chaud)' : 'Sunset (Warm)'}</option>
        <option value="cyberpunk">${activeLang === 'fr' ? 'Cyberpunk (Néon)' : 'Cyberpunk (Neon)'}</option>
      </select>
    </div>
    <div class="checkbox-row">
      <input type="checkbox" id="local-auto-rotate">
      <label for="local-auto-rotate">${autoRotateLabel}</label>
    </div>
    <div class="control-row" id="local-exploded-row" style="border-top:1px solid rgba(255,255,255,0.05); padding-top: 8px;">
      <label>${explodedLabel} <span id="local-exploded-val">0.0</span>x</label>
      <input type="range" id="local-exploded-slider" min="0.0" max="2.0" step="0.1" value="0.0">
    </div>
    <div class="control-row" id="local-section-row" style="border-top:1px solid rgba(255,255,255,0.05); padding-top: 8px;">
      <label>${sectionAxisLabel}</label>
      <select id="local-section-axis">
        <option value="none">${activeLang === 'fr' ? 'Aucun' : 'None'}</option>
        <option value="x">X</option>
        <option value="y">Y</option>
        <option value="z">Z</option>
      </select>
      <div id="local-section-slider-container" style="display: none; flex-direction: column; gap: 2px; margin-top: 4px;">
        <label style="color: #9ca3af; font-size: 9px;">${sectionPosLabel} <span id="local-section-val">0</span>mm</label>
        <input type="range" id="local-section-slider" min="-100" max="100" step="1" value="0">
      </div>
    </div>
  </div>

  <div id="local-measurement-display" style="position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%); z-index: 10; background: rgba(17, 24, 39, 0.85); backdrop-filter: blur(8px); padding: 8px 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); color: #10b981; font-family: monospace; font-size: 12px; display: none; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
    -
  </div>

  <div id="canvas-container"></div>

  <div id="toolbar" style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 10; display: flex; gap: 6px; background: rgba(17, 24, 39, 0.75); backdrop-filter: blur(8px); padding: 5px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); display: none;">
    <button class="btn" id="btn-orbit" style="padding: 6px 12px; font-size: 11px; background: #3b82f6; border: none; color: #ffffff; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.2s ease;">${cameraLabel}</button>
    <button class="btn" id="btn-translate" style="padding: 6px 12px; font-size: 11px; background: transparent; border: none; color: #9ca3af; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.2s ease;">${moveLabel}</button>
    <button class="btn" id="btn-rotate" style="padding: 6px 12px; font-size: 11px; background: transparent; border: none; color: #9ca3af; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.2s ease;">${rotateLabel}</button>
    <button class="btn" id="btn-scale" style="padding: 6px 12px; font-size: 11px; background: transparent; border: none; color: #9ca3af; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.2s ease;">${scaleLabel}</button>
    <button class="btn" id="btn-measure" style="padding: 6px 12px; font-size: 11px; background: transparent; border: none; color: #9ca3af; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.2s ease;">${measureLabel}</button>
  </div>

  <script>
    (async function() {
      const format = "${format}";
      const base64 = "${base64Data}";
      const colorVal = "${color}";
      const materialType = "${materialType}";
      const container = document.getElementById('canvas-container');
      const localBgPicker = document.getElementById('local-bg-color');
      
      const controlsPanel = document.getElementById('controls-panel');
      const localRenderStyle = document.getElementById('local-render-style');
      const localLightingPreset = document.getElementById('local-lighting-preset');
      const localAutoRotate = document.getElementById('local-auto-rotate');
      const localExplodedRow = document.getElementById('local-exploded-row');
      const localExplodedSlider = document.getElementById('local-exploded-slider');
      const localExplodedVal = document.getElementById('local-exploded-val');
      const localSectionRow = document.getElementById('local-section-row');
      const localSectionAxis = document.getElementById('local-section-axis');
      const localSectionSliderContainer = document.getElementById('local-section-slider-container');
      const localSectionSlider = document.getElementById('local-section-slider');
      const localSectionVal = document.getElementById('local-section-val');
      const localMeasurementDisplay = document.getElementById('local-measurement-display');

      let scene, canvas;
      let ambientLight, dirLight, dirLight2;
      let initialPositions = new Map();
      let clippingPlanes = [], clipPlaneX, clipPlaneY, clipPlaneZ;
      let activeTool = 'orbit';
      let measurementPoints = [];
      let measurementSpheres = [];
      let measurementLine = null;
      const is3D = ["stl", "obj", "glb"].includes(format);

      if (!is3D) {
        if (controlsPanel) controlsPanel.style.display = 'none';
      }

      async function base64ToBytes(b64) {
        try {
          const response = await fetch("data:application/octet-stream;base64," + b64);
          if (response.ok) {
            return await response.arrayBuffer();
          }
        } catch (e) {
          console.warn("Fetch failed, falling back to manual decode:", e);
        }
        const binString = atob(b64);
        const len = binString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binString.charCodeAt(i);
        }
        return bytes.buffer;
      }

      try {
        const width = container.clientWidth || window.innerWidth || 800;
        const height = container.clientHeight || window.innerHeight || 600;

        if (["stl", "obj", "glb"].includes(format)) {
          function createMaterial(colorHex, type) {
            const color = new THREE.Color(colorHex);
            switch (type) {
              case 'metallic':
                return new THREE.MeshStandardMaterial({ color: color, metalness: 0.9, roughness: 0.1 });
              case 'glass':
                return new THREE.MeshPhysicalMaterial({ color: color, metalness: 0.1, roughness: 0.1, transparent: true, opacity: 0.5, transmission: 0.6, ior: 1.5, side: THREE.DoubleSide });
              case 'glow':
                return new THREE.MeshBasicMaterial({ color: color, toneMapped: false });
              case 'gold':
                return new THREE.MeshStandardMaterial({ color: new THREE.Color(0xd4af37), metalness: 0.95, roughness: 0.15 });
              case 'silver':
                return new THREE.MeshStandardMaterial({ color: new THREE.Color(0xc0c0c0), metalness: 0.95, roughness: 0.15 });
              case 'copper':
                return new THREE.MeshStandardMaterial({ color: new THREE.Color(0xb87333), metalness: 0.95, roughness: 0.25 });
              case 'jade':
                return new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0x00a86b), metalness: 0.1, roughness: 0.15, transparent: true, opacity: 0.85, transmission: 0.4, ior: 1.6, side: THREE.DoubleSide });
              case 'wood':
                return new THREE.MeshStandardMaterial({ color: new THREE.Color(0x8b5a2b), metalness: 0.0, roughness: 0.85 });
              case 'clay':
                return new THREE.MeshStandardMaterial({ color: new THREE.Color(0xe2725b), metalness: 0.0, roughness: 0.95 });
              case 'carbon':
                return new THREE.MeshStandardMaterial({ color: new THREE.Color(0x2a2a2a), metalness: 0.1, roughness: 0.75 });
              case 'default':
              default:
                return new THREE.MeshStandardMaterial({ color: color, roughness: 0.6, metalness: 0.1, side: THREE.DoubleSide });
            }
          }

          scene = new THREE.Scene();
          scene.background = new THREE.Color("${bgColor}");

          const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 2000);
          camera.position.set(0, 50, 100);

          const renderer = new THREE.WebGLRenderer({ antialias: true });
          renderer.setSize(width, height);
          renderer.shadowMap.enabled = true;
          renderer.toneMapping = THREE.ACESFilmicToneMapping;
          renderer.toneMappingExposure = 1.0;
          container.appendChild(renderer.domElement);

          const controls = new THREE.OrbitControls(camera, renderer.domElement);
          controls.enableDamping = true;

          ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
          scene.add(ambientLight);
          dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
          dirLight.position.set(200, 400, 200);
          scene.add(dirLight);
          dirLight2 = new THREE.DirectionalLight(0x3b82f6, 0.3);
          dirLight2.position.set(-200, 200, -200);
          scene.add(dirLight2);

          let gridHelper;
          const buffer = await base64ToBytes(base64);
          let model;

          if (format === 'stl') {
            const loader = new THREE.STLLoader();
            const geometry = loader.parse(buffer);
            const material = createMaterial(colorVal, materialType);
            model = new THREE.Mesh(geometry, material);
            scene.add(model);
            fitCamera();
          } else if (format === 'obj') {
            const text = new TextDecoder().decode(buffer);
            const loader = new THREE.OBJLoader();
            model = loader.parse(text);
            applyModelMaterial();
            scene.add(model);
            fitCamera();
          } else if (format === 'glb') {
            const loader = new THREE.GLTFLoader();
            loader.parse(buffer, '', (gltf) => {
              model = gltf.scene;
              applyModelMaterial();
              scene.add(model);
              fitCamera();
            });
          }

          function applyModelMaterial() {
            const material = createMaterial(colorVal, materialType);
            model.traverse((child) => {
              if (child.isMesh) {
                child.material = material;
              }
            });
          }

          function fitCamera() {
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());

            model.position.x += (model.position.x - center.x);
            model.position.y += (model.position.y - center.y) - box.min.y;
            model.position.z += (model.position.z - center.z);

            const maxDim = Math.max(size.x, size.y, size.z);
            camera.far = Math.max(5000, maxDim * 10);
            camera.updateProjectionMatrix();
            if (typeof dirLight !== 'undefined') dirLight.position.set(maxDim * 2, maxDim * 4, maxDim * 2);

            const gridLimit = Math.max(10, Math.ceil(maxDim * 2.5));
            gridHelper = new THREE.GridHelper(gridLimit, 50, 0x3b82f6, 0x334155);
            gridHelper.position.y = -0.01;
            scene.add(gridHelper);

            const fovRad = (camera.fov * Math.PI) / 180;
            let cameraDistance = (maxDim / 2) / Math.tan(fovRad / 2);
            cameraDistance *= 2.2;

            camera.position.set(maxDim * 0.8, maxDim * 0.8, cameraDistance);
            camera.lookAt(new THREE.Vector3(0, size.y / 2, 0));
            controls.target.set(0, size.y / 2, 0);

            // Initialize TransformControls inside exported HTML
            const transformControls = new THREE.TransformControls(camera, renderer.domElement);
            transformControls.addEventListener('change', () => renderer.render(scene, camera));
            transformControls.addEventListener('dragging-changed', (event) => {
              controls.enabled = !event.value;
            });
            scene.add(transformControls);

            const toolbar = document.getElementById('toolbar');
            if (toolbar) toolbar.style.display = 'flex';

            const btnOrbit = document.getElementById('btn-orbit');
            const btnTranslate = document.getElementById('btn-translate');
            const btnRotate = document.getElementById('btn-rotate');
            const btnScale = document.getElementById('btn-scale');
            const btnMeasure = document.getElementById('btn-measure');

            const btns = [btnOrbit, btnTranslate, btnRotate, btnScale, btnMeasure];
            function setBtnActive(activeBtn) {
              btns.forEach(b => {
                if (b) {
                  b.style.background = 'transparent';
                  b.style.color = '#9ca3af';
                }
              });
              activeBtn.style.background = '#3b82f6';
              activeBtn.style.color = '#ffffff';
            }

            btnOrbit.onclick = () => {
              activeTool = 'orbit';
              setBtnActive(btnOrbit);
              transformControls.detach();
              localMeasurementDisplay.style.display = 'none';
              clearMeasurements();
            };
            btnTranslate.onclick = () => {
              activeTool = 'translate';
              setBtnActive(btnTranslate);
              transformControls.setMode('translate');
              transformControls.attach(model);
              localMeasurementDisplay.style.display = 'none';
              clearMeasurements();
            };
            btnRotate.onclick = () => {
              activeTool = 'rotate';
              setBtnActive(btnRotate);
              transformControls.setMode('rotate');
              transformControls.attach(model);
              localMeasurementDisplay.style.display = 'none';
              clearMeasurements();
            };
            btnScale.onclick = () => {
              activeTool = 'scale';
              setBtnActive(btnScale);
              transformControls.setMode('scale');
              transformControls.attach(model);
              localMeasurementDisplay.style.display = 'none';
              clearMeasurements();
            };
            btnMeasure.onclick = () => {
              activeTool = 'measure';
              setBtnActive(btnMeasure);
              transformControls.detach();
              localMeasurementDisplay.style.display = 'block';
              localMeasurementDisplay.innerText = activeLang === 'fr' ? "Faites un clic pour placer le point A" : "Click to place Point A";
              clearMeasurements();
            };

            // Raycasting clicks for 3D measurements
            let isMouseDown = false;
            let mouseDownPos = { x: 0, y: 0 };
            renderer.domElement.addEventListener('pointerdown', (e) => {
              isMouseDown = true;
              mouseDownPos = { x: e.clientX, y: e.clientY };
            });
            renderer.domElement.addEventListener('pointerup', (e) => {
              if (!isMouseDown) return;
              isMouseDown = false;
              const dist = Math.hypot(e.clientX - mouseDownPos.x, e.clientY - mouseDownPos.y);
              if (dist > 15) return;
              
              if (activeTool === 'measure') {
                handleLocal3DMeasureClick(e);
              }
            });

            // Initialize local settings panel bindings
            localRenderStyle.addEventListener('change', updateLocalRenderStyle);
            localLightingPreset.addEventListener('change', updateLocalLightingPreset);
            localExplodedSlider.addEventListener('input', updateLocalExplodedView);

            localSectionAxis.addEventListener('change', () => {
              const axis = localSectionAxis.value;
              const box = new THREE.Box3().setFromObject(model);
              
              if (axis === 'x') {
                localSectionSlider.min = box.min.x;
                localSectionSlider.max = box.max.x;
                localSectionSlider.step = ((box.max.x - box.min.x) / 200) || 0.1;
                localSectionSlider.value = (box.min.x + box.max.x) / 2;
              } else if (axis === 'y') {
                localSectionSlider.min = box.min.y;
                localSectionSlider.max = box.max.y;
                localSectionSlider.step = ((box.max.y - box.min.y) / 200) || 0.1;
                localSectionSlider.value = (box.min.y + box.max.y) / 2;
              } else if (axis === 'z') {
                localSectionSlider.min = box.min.z;
                localSectionSlider.max = box.max.z;
                localSectionSlider.step = ((box.max.z - box.min.z) / 200) || 0.1;
                localSectionSlider.value = (box.min.z + box.max.z) / 2;
              }
              updateLocalClippingPlanes();
            });
            localSectionSlider.addEventListener('input', updateLocalClippingPlanes);

            // local clipping planes setup
            renderer.localClippingEnabled = true;
            clipPlaneX = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 99999);
            clipPlaneY = new THREE.Plane(new THREE.Vector3(0, -1, 0), 99999);
            clipPlaneZ = new THREE.Plane(new THREE.Vector3(0, 0, -1), 99999);
            clippingPlanes = [clipPlaneX, clipPlaneY, clipPlaneZ];

            // Local exploded view directions calculation
            initialPositions.clear();
            const modelCenter = new THREE.Vector3(0, size.y / 2, 0);
            model.traverse(child => {
              if (child.isMesh) {
                const childBox = new THREE.Box3().setFromObject(child);
                const childCenter = childBox.getCenter(new THREE.Vector3());
                const dir = childCenter.clone().sub(modelCenter);
                if (dir.lengthSq() < 0.0001) {
                  dir.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
                } else {
                  dir.normalize();
                }
                initialPositions.set(child, {
                  pos: child.position.clone(),
                  dir: dir
                });
              }
            });
          }

          // --- Local Helper Functions for HTML Viewport ---
          function updateLocalRenderStyle() {
            if (!model) return;
            const style = localRenderStyle.value;

            if (style === 'blueprint') {
              scene.background = new THREE.Color(0x0b1d3a);
            } else {
              scene.background = new THREE.Color(localBgPicker.value);
            }

            model.traverse(child => {
              if (child.isMesh) {
                if (!child.userData.originalProps) {
                  if (Array.isArray(child.material)) {
                    child.userData.originalProps = child.material.map(mat => ({
                      wireframe: mat ? mat.wireframe : false,
                      transparent: mat ? mat.transparent : false,
                      opacity: mat ? mat.opacity : 1.0,
                      depthWrite: mat ? mat.depthWrite : true,
                      color: (mat && mat.color) ? mat.color.getHex() : null,
                      emissive: (mat && mat.emissive) ? mat.emissive.getHex() : null
                    }));
                  } else {
                    child.userData.originalProps = {
                      wireframe: child.material ? child.material.wireframe : false,
                      transparent: child.material ? child.material.transparent : false,
                      opacity: child.material ? child.material.opacity : 1.0,
                      depthWrite: child.material ? child.material.depthWrite : true,
                      color: (child.material && child.material.color) ? child.material.color.getHex() : null,
                      emissive: (child.material && child.material.emissive) ? child.material.emissive.getHex() : null
                    };
                  }
                }
                
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                mats.forEach((mat, idx) => {
                  if (!mat) return;
                  const orig = Array.isArray(child.userData.originalProps)
                    ? child.userData.originalProps[idx]
                    : child.userData.originalProps;
                    
                  if (style === 'default') {
                    mat.wireframe = orig.wireframe;
                    mat.transparent = orig.transparent;
                    mat.opacity = orig.opacity;
                    mat.depthWrite = orig.depthWrite;
                    if (mat.color && orig.color !== null) mat.color.setHex(orig.color);
                    if (mat.emissive && orig.emissive !== null) mat.emissive.setHex(orig.emissive);
                  } else if (style === 'wireframe') {
                    mat.wireframe = true;
                    mat.transparent = false;
                    mat.opacity = 1.0;
                    mat.depthWrite = true;
                    if (mat.color && orig.color !== null) mat.color.setHex(orig.color);
                    if (mat.emissive && orig.emissive !== null) mat.emissive.setHex(orig.emissive);
                  } else if (style === 'xray') {
                    mat.wireframe = false;
                    mat.transparent = true;
                    mat.opacity = 0.25;
                    mat.depthWrite = false;
                    if (mat.color && orig.color !== null) mat.color.setHex(orig.color);
                    if (mat.emissive && orig.emissive !== null) mat.emissive.setHex(orig.emissive);
                  } else if (style === 'blueprint') {
                    mat.wireframe = true;
                    mat.transparent = false;
                    mat.opacity = 1.0;
                    mat.depthWrite = true;
                    if (mat.color) mat.color.setHex(0xffffff);
                    if (mat.emissive) mat.emissive.setHex(0x000000);
                  }
                  mat.needsUpdate = true;
                });
              }
            });
          }

          function updateLocalLightingPreset() {
            const preset = localLightingPreset.value;
            const isBlueprint = localRenderStyle.value === 'blueprint';
            if (preset === 'studio') {
              if (!isBlueprint) scene.background = new THREE.Color(localBgPicker.value);
              if (ambientLight) { ambientLight.color.setHex(0xffffff); ambientLight.intensity = 0.4; }
              if (dirLight) { dirLight.color.setHex(0xffffff); dirLight.intensity = 0.8; }
              if (dirLight2) { dirLight2.color.setHex(0x3b82f6); dirLight2.intensity = 0.3; }
            } else if (preset === 'sunset') {
              if (!isBlueprint) scene.background = new THREE.Color(0x1a120c);
              localBgPicker.value = '#1A120C';
              if (ambientLight) { ambientLight.color.setHex(0xfeb081); ambientLight.intensity = 0.4; }
              if (dirLight) { dirLight.color.setHex(0xff9933); dirLight.intensity = 1.2; }
              if (dirLight2) { dirLight2.color.setHex(0x552244); dirLight2.intensity = 0.5; }
            } else if (preset === 'cyberpunk') {
              if (!isBlueprint) scene.background = new THREE.Color(0x0a0512);
              localBgPicker.value = '#0A0512';
              if (ambientLight) { ambientLight.color.setHex(0x221133); ambientLight.intensity = 0.3; }
              if (dirLight) { dirLight.color.setHex(0xff00ff); dirLight.intensity = 1.0; }
              if (dirLight2) { dirLight2.color.setHex(0x00ffff); dirLight2.intensity = 1.0; }
            }
            if (isBlueprint) {
              scene.background = new THREE.Color(0x0b1d3a);
            }
          }

          function updateLocalExplodedView() {
            if (!model) return;
            const val = parseFloat(localExplodedSlider.value);
            localExplodedVal.innerText = val.toFixed(1);
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z) || 50;
            
            initialPositions.forEach((data, child) => {
              child.position.copy(data.pos).addScaledVector(data.dir, val * maxDim * 0.4);
            });
          }

          function updateLocalClippingPlanes() {
            if (!model) return;
            const axis = localSectionAxis.value;
            const val = parseFloat(localSectionSlider.value);
            localSectionVal.innerText = val.toFixed(0);
            
            clipPlaneX.constant = 99999;
            clipPlaneY.constant = 99999;
            clipPlaneZ.constant = 99999;
            
            if (axis === 'none') {
              localSectionSliderContainer.style.display = 'none';
              model.traverse(child => {
                if (child.isMesh) {
                  const mats = Array.isArray(child.material) ? child.material : [child.material];
                  mats.forEach(mat => {
                    if (mat) {
                      mat.clippingPlanes = [];
                      mat.needsUpdate = true;
                    }
                  });
                }
              });
            } else {
              localSectionSliderContainer.style.display = 'flex';
              if (axis === 'x') clipPlaneX.constant = val;
              else if (axis === 'y') clipPlaneY.constant = val;
              else if (axis === 'z') clipPlaneZ.constant = val;
              
              model.traverse(child => {
                if (child.isMesh) {
                  const mats = Array.isArray(child.material) ? child.material : [child.material];
                  mats.forEach(mat => {
                    if (mat) {
                      mat.clippingPlanes = clippingPlanes;
                      mat.clipShadows = true;
                      mat.needsUpdate = true;
                    }
                  });
                }
              });
            }

            updateLocalSectionSilhouette();
          }

          let localSilhouetteLines = null;
          function updateLocalSectionSilhouette() {
            if (localSilhouetteLines) {
              if (localSilhouetteLines.geometry) localSilhouetteLines.geometry.dispose();
              if (localSilhouetteLines.material) localSilhouetteLines.material.dispose();
              scene.remove(localSilhouetteLines);
              localSilhouetteLines = null;
            }

            if (!model) return;
            const axis = localSectionAxis.value;
            if (axis === 'none') return;

            let activePlane = null;
            if (axis === 'x') activePlane = clipPlaneX;
            else if (axis === 'y') activePlane = clipPlaneY;
            else if (axis === 'z') activePlane = clipPlaneZ;

            if (!activePlane) return;

            const points = [];
            const tempV0 = new THREE.Vector3();
            const tempV1 = new THREE.Vector3();
            const tempV2 = new THREE.Vector3();

            model.updateMatrixWorld(true);
            model.traverse(child => {
              if (child.isMesh && child.visible) {
                const geometry = child.geometry;
                if (!geometry) return;
                const posAttr = geometry.attributes.position;
                if (!posAttr) return;
                const index = geometry.index;
                const matrix = child.matrixWorld;

                function checkEdge(pa, pb, da, db) {
                  if (da * db < 0) {
                    const t = da / (da - db);
                    return new THREE.Vector3().lerpVectors(pa, pb, t);
                  }
                  return null;
                }

                function processTriangle(i0, i1, i2) {
                  tempV0.fromBufferAttribute(posAttr, i0).applyMatrix4(matrix);
                  tempV1.fromBufferAttribute(posAttr, i1).applyMatrix4(matrix);
                  tempV2.fromBufferAttribute(posAttr, i2).applyMatrix4(matrix);
                  const d0 = activePlane.distanceToPoint(tempV0);
                  const d1 = activePlane.distanceToPoint(tempV1);
                  const d2 = activePlane.distanceToPoint(tempV2);
                  const numPos = (d0 >= 0 ? 1 : 0) + (d1 >= 0 ? 1 : 0) + (d2 >= 0 ? 1 : 0);
                  if (numPos === 0 || numPos === 3) return;
                  const edgePts = [];
                  const p01 = checkEdge(tempV0, tempV1, d0, d1);
                  if (p01) edgePts.push(p01);
                  const p12 = checkEdge(tempV1, tempV2, d1, d2);
                  if (p12) edgePts.push(p12);
                  const p20 = checkEdge(tempV2, tempV0, d2, d0);
                  if (p20) edgePts.push(p20);
                  if (edgePts.length >= 2) points.push(edgePts[0], edgePts[1]);
                }

                if (index) {
                  for (let i = 0; i < index.count; i += 3) processTriangle(index.getX(i), index.getX(i+1), index.getX(i+2));
                } else {
                  for (let i = 0; i < posAttr.count; i += 3) processTriangle(i, i+1, i+2);
                }
              }
            });

            if (points.length > 0) {
              const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
              const lineMat = new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 2, depthTest: false, depthWrite: false });
              localSilhouetteLines = new THREE.LineSegments(lineGeom, lineMat);
              localSilhouetteLines.renderOrder = 99999;
              scene.add(localSilhouetteLines);
            }
          }

          function clearMeasurements() {
            measurementPoints = [];
            measurementSpheres.forEach(s => scene.remove(s));
            measurementSpheres = [];
            if (measurementLine) { scene.remove(measurementLine); measurementLine = null; }
            if (!is3D && canvas) { draw2D(); }
          }

          function handleLocal3DMeasureClick(e) {
            if (!model) return;
            const rect = renderer.domElement.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
            const intersects = raycaster.intersectObjects([model], true);
            
            if (intersects.length > 0) {
              const point = intersects[0].point;
              if (measurementPoints.length >= 2) {
                clearMeasurements();
              }
              measurementPoints.push(point);
              
              const box = new THREE.Box3().setFromObject(model);
              const size = box.getSize(new THREE.Vector3());
              const maxDim = Math.max(size.x, size.y, size.z) || 50;
              const r = Math.max(0.01, maxDim / 120);
              
              const sphereGeom = new THREE.SphereGeometry(r, 16, 16);
              const sphereMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
              const sphere = new THREE.Mesh(sphereGeom, sphereMat);
              sphere.position.copy(point);
              scene.add(sphere);
              measurementSpheres.push(sphere);
              
              if (measurementPoints.length === 1) {
                localMeasurementDisplay.innerText = activeLang === 'fr' ? "Faites un clic pour placer le point B" : "Click to place Point B";
              } else if (measurementPoints.length === 2) {
                const pA = measurementPoints[0];
                const pB = measurementPoints[1];
                const distance = pA.distanceTo(pB);
                
                const lineGeom = new THREE.BufferGeometry().setFromPoints([pA, pB]);
                const lineMat = new THREE.LineDashedMaterial({ color: 0x10b981, dashSize: 2, gapSize: 1 });
                const line = new THREE.Line(lineGeom, lineMat);
                line.computeLineDistances();
                scene.add(line);
                measurementLine = line;
                
                localMeasurementDisplay.innerHTML = "Dist: <strong>" + distance.toFixed(2) + " mm</strong>";
              }
            }
          }

          function animate() {
            requestAnimationFrame(animate);
            if (localAutoRotate && localAutoRotate.checked && model) {
              model.rotation.y += 0.005;
            }
            controls.update();
            renderer.render(scene, camera);
          }
          animate();

          window.addEventListener('resize', () => {
            const w = container.clientWidth || window.innerWidth || 800;
            const h = container.clientHeight || window.innerHeight || 600;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
          });
        } else {
          canvas = document.createElement('canvas');
          canvas.style.position = 'absolute';
          canvas.style.top = '0';
          canvas.style.left = '0';
          canvas.style.width = '100%';
          canvas.style.height = '100%';
          canvas.style.background = "${bgColor}";
          container.appendChild(canvas);
          const ctx = canvas.getContext('2d');

          let zoom = 1;
          let offsetX = 0;
          let offsetY = 0;
          let isDragging = false;
          let startDrag = { x: 0, y: 0 };

          canvas.width = width;
          canvas.height = height;

          if (format === 'svg') {
            const img = new Image();
            img.onload = () => {
              const boundsWidth = img.width || 500;
              const boundsHeight = img.height || 500;
              zoom = Math.min((canvas.width * 0.75) / boundsWidth, (canvas.height * 0.75) / boundsHeight);
              offsetX = (canvas.width - boundsWidth * zoom) / 2;
              offsetY = (canvas.height - boundsHeight * zoom) / 2;
              drawSVG();
            };

            function drawSVG() {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              
              // Draw grid
              ctx.strokeStyle = '#1e293b';
              ctx.lineWidth = 0.5;
              const gridSize = 40;
              for (let x = offsetX % gridSize; x < canvas.width; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
              }
              for (let y = offsetY % gridSize; y < canvas.height; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
              }

              const boundsWidth = img.width || 500;
              const boundsHeight = img.height || 500;
              ctx.drawImage(img, offsetX, offsetY, boundsWidth * zoom, boundsHeight * zoom);
            }

            canvas.addEventListener('mousedown', (e) => {
              isDragging = true;
              startDrag = { x: e.clientX, y: e.clientY };
            });

            canvas.addEventListener('mousemove', (e) => {
              if (!isDragging) return;
              const dx = e.clientX - startDrag.x;
              const dy = e.clientY - startDrag.y;
              offsetX += dx;
              offsetY += dy;
              startDrag = { x: e.clientX, y: e.clientY };
              drawSVG();
            });

            canvas.addEventListener('wheel', (e) => {
              e.preventDefault();
              const factor = e.deltaY < 0 ? 1.1 : 0.9;
              zoom *= factor;
              drawSVG();
            });

            window.addEventListener('resize', () => {
              const w = container.clientWidth || window.innerWidth || 800;
              const h = container.clientHeight || window.innerHeight || 600;
              canvas.width = w;
              canvas.height = h;
              drawSVG();
            });

            img.src = "data:image/svg+xml;base64," + base64;
          } else if (format === 'dxf') {
            const entities = ${dxfEntitiesJson};
            const bounds = ${dxfBoundsJson};

            function fitDrawing() {
              if (!bounds) return;
              zoom = Math.min((canvas.width * 0.75) / bounds.width, (canvas.height * 0.75) / bounds.height);
              offsetX = canvas.width / 2 - bounds.centerX * zoom;
              offsetY = canvas.height / 2 + bounds.centerY * zoom;
            }

            function drawDXF() {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              
              // Draw grid
              ctx.strokeStyle = '#1e293b';
              ctx.lineWidth = 0.5;
              const gridSize = 40;
              for (let x = offsetX % gridSize; x < canvas.width; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
              }
              for (let y = offsetY % gridSize; y < canvas.height; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
              }

              if (!entities || entities.length === 0) return;

              ctx.strokeStyle = colorVal;
              ctx.lineWidth = 1.5;

              entities.forEach(ent => {
                ctx.beginPath();
                if (ent.type === 'LINE') {
                  ctx.moveTo(ent.x1 * zoom + offsetX, -ent.y1 * zoom + offsetY);
                  ctx.lineTo(ent.x2 * zoom + offsetX, -ent.y2 * zoom + offsetY);
                  ctx.stroke();
                } else if (ent.type === 'CIRCLE') {
                  ctx.arc(ent.x * zoom + offsetX, -ent.y * zoom + offsetY, ent.r * zoom, 0, 2 * Math.PI);
                  ctx.stroke();
                } else if (ent.type === 'ARC') {
                  const startRad = (ent.startAngle * Math.PI) / 180;
                  const endRad = (ent.endAngle * Math.PI) / 180;
                  ctx.arc(ent.x * zoom + offsetX, -ent.y * zoom + offsetY, ent.r * zoom, -startRad, -endRad, true);
                  ctx.stroke();
                } else if (['LWPOLYLINE', 'POLYLINE', 'SPLINE'].includes(ent.type) && ent.points.length > 1) {
                  ctx.moveTo(ent.points[0].x * zoom + offsetX, -ent.points[0].y * zoom + offsetY);
                  for (let j = 1; j < ent.points.length; j++) {
                    ctx.lineTo(ent.points[j].x * zoom + offsetX, -ent.points[j].y * zoom + offsetY);
                  }
                  ctx.stroke();
                } else if (ent.type === 'ELLIPSE') {
                  const mx = ent.mx || 0;
                  const my = ent.my || 0;
                  const rMajor = Math.sqrt(mx*mx + my*my);
                  const ratio = ent.ratio || 1;
                  const rMinor = rMajor * ratio;
                  const rotation = Math.atan2(my, mx);
                  ctx.ellipse(
                    ent.x * zoom + offsetX,
                    -ent.y * zoom + offsetY,
                    rMajor * zoom,
                    rMinor * zoom,
                    -rotation,
                    0,
                    2 * Math.PI
                  );
                  ctx.stroke();
                } else if (['3DFACE', 'SOLID'].includes(ent.type)) {
                  ctx.moveTo(ent.x * zoom + offsetX, -ent.y * zoom + offsetY);
                  ctx.lineTo(ent.x2 * zoom + offsetX, -ent.y2 * zoom + offsetY);
                  ctx.lineTo(ent.x3 * zoom + offsetX, -ent.y3 * zoom + offsetY);
                  if (ent.x4 !== undefined) {
                    ctx.lineTo(ent.x4 * zoom + offsetX, -ent.y4 * zoom + offsetY);
                  }
                  ctx.closePath();
                  ctx.stroke();
                }
              });
            }

            canvas.addEventListener('mousedown', (e) => {
              isDragging = true;
              startDrag = { x: e.clientX, y: e.clientY };
            });

            canvas.addEventListener('mousemove', (e) => {
              if (!isDragging) return;
              const dx = e.clientX - startDrag.x;
              const dy = e.clientY - startDrag.y;
              offsetX += dx;
              offsetY += dy;
              startDrag = { x: e.clientX, y: e.clientY };
              drawDXF();
            });

            canvas.addEventListener('wheel', (e) => {
              e.preventDefault();
              const factor = e.deltaY < 0 ? 1.1 : 0.9;
              zoom *= factor;
              drawDXF();
            });

            window.addEventListener('resize', () => {
              const w = container.clientWidth || window.innerWidth || 800;
              const h = container.clientHeight || window.innerHeight || 600;
              canvas.width = w;
              canvas.height = h;
              drawDXF();
            });

            fitDrawing();
            drawDXF();
          }
        }
      } catch (err) {
        console.error("Error initializing viewer:", err);
        const errDiv = document.createElement('div');
        errDiv.style.position = 'absolute';
        errDiv.style.top = '50%';
        errDiv.style.left = '50%';
        errDiv.style.transform = 'translate(-50%, -50%)';
        errDiv.style.color = '#ef4444';
        errDiv.style.background = '#1e293b';
        errDiv.style.padding = '20px';
        errDiv.style.borderRadius = '10px';
        errDiv.style.border = '1px solid #ef4444';
        errDiv.style.fontFamily = 'sans-serif';
        errDiv.style.textAlign = 'center';
        errDiv.style.zIndex = '999';
        errDiv.innerHTML = '<h3 style="margin:0 0 10px 0;">Error loading model</h3><p style="margin:0;font-size:14px;">' + err.message + '</p>';
        container.appendChild(errDiv);
      }

      // Local Background Color picker listener
      if (localBgPicker) {
        localBgPicker.addEventListener('input', () => {
          const color = localBgPicker.value;
          document.body.style.background = color;
          if (["stl", "obj", "glb"].includes(format) && scene) {
            scene.background.set(new THREE.Color(color));
          } else if (canvas) {
            canvas.style.background = color;
            if (format === 'svg') drawSVG(); else drawDXF();
          }
        });
      }

      window.addEventListener('mouseup', () => {
        isDragging = false;
      });
    })();
  </script>
</body>
</html>`;
  }

  // Open file button listener
  if (btnUploadFile) {
    btnUploadFile.addEventListener('click', () => {
      // Clear select dropdown to indicate upload mode
      if (demoModelSelect) demoModelSelect.value = 'none';
      
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.stl,.obj,.glb,.dxf,.svg';
      input.onchange = (e) => {
        if (e.target.files.length > 0) {
          loadFile(e.target.files[0]);
        }
      };
      input.click();
    });
  }

  // Language management
  function initLang() {
    const params = new URLSearchParams(window.location.search);
    let lang = params.get('lang') || params.get('locale');
    if (!lang && window.parent) {
      try {
        const parentParams = new URLSearchParams(window.parent.location.search);
        lang = parentParams.get('lang');
      } catch (e) {}
    }
    if (!lang) {
      const browserLang = navigator.language || navigator.userLanguage;
      if (browserLang && browserLang.startsWith('fr')) {
        lang = 'fr';
      }
    }
    
    lang = (lang && lang.toLowerCase().startsWith('fr')) ? 'fr' : 'en';
    setLanguage(lang);

    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        setLanguage(btn.dataset.lang);
      });
    });
  }

  function setLanguage(lang) {
    currentLang = lang;
    document.querySelectorAll('.lang-btn').forEach(btn => {
      if (btn.dataset.lang === lang) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    document.querySelectorAll('[data-en],[data-fr]').forEach(el => {
      const text = el.dataset[lang] || el.dataset.en;
      if (text) {
        if (el.tagName === 'INPUT' && el.type === 'button') {
          el.value = text;
        } else {
          el.innerHTML = text;
        }
      }
    });

    updateLangDependentUI();
  }

  function updateLangDependentUI() {
    if (!currentFile) {
      fileNameLabel.innerText = currentLang === 'fr' ? "Aucun chargé" : "None loaded";
    } else if (currentFile.name.startsWith('Demo_')) {
      const type = demoModelSelect.value;
      let nameStr = "Demo Model";
      if (type === 'gear') nameStr = currentLang === 'fr' ? "Engrenage Mécanique" : "Mechanical Gear";
      else if (type === 'ring') nameStr = currentLang === 'fr' ? "Bague de Fiançailles Or" : "Diamond Gold Ring";
      else if (type === 'knot') nameStr = currentLang === 'fr' ? "Nœud Torique Complexe" : "Complex Torus Knot";
      else if (type === 'cube') nameStr = currentLang === 'fr' ? "Cube de Calibration" : "Calibration Cube";
      
      fileNameLabel.innerText = nameStr;
      fileFormatLabel.innerText = currentLang === 'fr' ? "STL (Procédural)" : "STL (Procedural)";
    }

    const inspectBtn = document.getElementById('tool-orbit');
    const moveBtn = document.getElementById('tool-translate');
    const rotateBtn = document.getElementById('tool-rotate');
    const scaleBtn = document.getElementById('tool-scale');

    if (inspectBtn) inspectBtn.title = currentLang === 'fr' ? "Caméra / Orbit" : "Orbit / Inspect Camera";
    if (moveBtn) moveBtn.title = currentLang === 'fr' ? "Déplacer le Modèle" : "Move Model";
    if (rotateBtn) rotateBtn.title = currentLang === 'fr' ? "Pivoter le Modèle" : "Rotate Model";
    if (scaleBtn) scaleBtn.title = currentLang === 'fr' ? "Mettre à l'échelle le Modèle" : "Scale Model";
  }

  // Init Engine
  try {
    init3D();
    initLang();
    initAdvancedCADEvents();
    checkStartupFile();
  } catch (err) {
    showRuntimeError("Initialization Error", err);
  }

  // Check if a file_url parameter is passed to auto-load a file
  async function checkStartupFile() {
    const params = new URLSearchParams(window.location.search);
    let fileUrl = params.get('file_url');
    if (!fileUrl && window.parent) {
      try {
        const parentParams = new URLSearchParams(window.parent.location.search);
        fileUrl = parentParams.get('file_url');
      } catch (e) {}
    }
    
    if (fileUrl) {
      try {
        showLoading(currentLang === 'fr' ? "Téléchargement..." : "Downloading file...");
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error("Network response was not OK");
        const blob = await response.blob();
        
        // Extract file name from URL
        let name = "model.stl";
        try {
          const urlObj = new URL(fileUrl);
          const pathName = urlObj.pathname;
          const baseName = pathName.substring(pathName.lastIndexOf('/') + 1);
          if (baseName && baseName.includes('.')) {
            name = decodeURIComponent(baseName);
          }
        } catch (e) {}
        
        blob.name = name;
        loadFile(blob);
      } catch (err) {
        console.error("Failed to load startup file:", err);
        hideLoading();
      }
    }
  }
});

