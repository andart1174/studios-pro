/**
 * PolyMorph 3D Studio - Core Application Logic & Event Controllers
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Localization
  I18N.init();

  // 2. Initialize 3D WebGL Viewer
  const viewer = new Viewer3D('webgl-canvas');
  window.Viewer = viewer;
  window.__polymorphViewer = viewer;

  // Application State
  const state = {
    loadedModel: null,
    currentFileName: "model",
    activeImage: null,
    batchQueue: []
  };

  // Safe Event Listener Helper (supports string ID or DOM element, and 2 or 3 args)
  function safeOn(idOrElement, eventName, handler) {
    const el = (typeof idOrElement === 'string') ? document.getElementById(idOrElement) : idOrElement;
    if (!el) return;
    if (typeof eventName === 'function') {
      handler = eventName;
      eventName = 'click';
    }
    el.addEventListener(eventName || 'click', handler);
  }

  // Toast Notification System
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Loading Overlay Helper
  function setLoading(visible, text = "Processing...") {
    const overlay = document.getElementById('loading-overlay');
    const label = document.getElementById('loading-text');
    if (visible) {
      label.textContent = text;
      overlay.classList.add('visible');
    } else {
      overlay.classList.remove('visible');
    }
  }

  // Update CAD Mesh Metrics
  function updateMeshMetrics(model) {
    if (!model) return;
    const stats = CADInspector.analyze(model);
    
    document.getElementById('stat-triangles').textContent = stats.triangles.toLocaleString();
    document.getElementById('stat-vertices').textContent = stats.vertices.toLocaleString();
    document.getElementById('stat-dimensions').textContent = 
      `${stats.dimensions.x.toFixed(1)} × ${stats.dimensions.y.toFixed(1)} × ${stats.dimensions.z.toFixed(1)}`;
    
    const volCm3 = stats.volume / 1000;
    document.getElementById('stat-volume').textContent = `${volCm3.toFixed(2)} cm³`;
    
    const surfCm2 = stats.surfaceArea / 100;
    document.getElementById('stat-surface').textContent = `${surfCm2.toFixed(1)} cm²`;
  }

  // Set & Display Active 3D Model
  function setModel(object3D, filename = "model", isNewUpload = true) {
    state.loadedModel = object3D;
    state.currentFileName = filename;
    if (object3D && object3D.userData && object3D.userData.sourceImage) {
      state.activeImage = object3D.userData.sourceImage;
      window.__polymorph_active_image = object3D.userData.sourceImage;
    } else if (state.activeImage) {
      window.__polymorph_active_image = state.activeImage;
    } else {
      window.__polymorph_active_image = null;
    }
    if (isNewUpload) {
      state.originalModelBackup = object3D.clone(true);
    }
    viewer.setModel(object3D);
    updateMeshMetrics(object3D);
  }

  // Universal Model Exporter Helper
  async function exportCurrentModel(format = 'glb', fallbackName = 'model') {
    const model = state.loadedModel || (viewer && viewer.currentModel);
    if (!model) {
      showToast(I18N.t('toastNoModel') || "No 3D model loaded to export!", 'warning');
      return;
    }

    setLoading(true, `Exporting ${format.toUpperCase()}...`);
    try {
      const baseName = state.currentFileName || `${fallbackName}.${format}`;
      const { blob, filename } = await ModelConverters.exportModel(model, format, baseName);
      ModelConverters.triggerDownload(blob, filename);
      showToast(`Export ${format.toUpperCase()} successful!`, 'success');
    } catch (err) {
      console.error("Export error:", err);
      showToast(`Export error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  // ----------------------------------------------------
  // Tab Switching & Horizontal Tab Bar Scrolling
  // ----------------------------------------------------
  const tabsNav = document.getElementById('sidebar-tabs-nav');
  const tabButtons = document.querySelectorAll('.sidebar-tabs .tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const btnScrollPrev = document.getElementById('tabs-scroll-prev');
  const btnScrollNext = document.getElementById('tabs-scroll-next');

  if (btnScrollPrev && tabsNav) {
    btnScrollPrev.addEventListener('click', () => {
      tabsNav.scrollBy({ left: -140, behavior: 'smooth' });
    });
  }

  if (btnScrollNext && tabsNav) {
    btnScrollNext.addEventListener('click', () => {
      tabsNav.scrollBy({ left: 140, behavior: 'smooth' });
    });
  }

  if (tabsNav) {
    tabsNav.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        tabsNav.scrollLeft += e.deltaY;
      }
    }, { passive: false });
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.style.display = 'none');

      btn.classList.add('active');
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

      const targetPane = document.getElementById(btn.dataset.target);
      if (targetPane) targetPane.style.display = 'flex';

      if (btn.dataset.target === 'tab-draw-3d' && typeof initDraw3DStudio === 'function') {
        setTimeout(() => initDraw3DStudio(), 50);
      }
      if (btn.dataset.target === 'tab-ar-studio' && typeof updateArSubpanels === 'function') {
        setTimeout(() => updateArSubpanels(), 50);
      }
      if (btn.dataset.target === 'tab-papercraft' && typeof initPapercraftStudio === 'function') {
        setTimeout(() => initPapercraftStudio(), 50);
      }
      if (btn.dataset.target === 'tab-puzzle' && typeof initPuzzleStudio === 'function') {
        setTimeout(() => initPuzzleStudio(), 50);
      }
      if (btn.dataset.target === 'tab-acoustic') {
        if (!currentAcousticMesh) setTimeout(() => buildAcoustic3D(true), 50);
      }
      if (btn.dataset.target === 'tab-dungeon') {
        if (!currentDungeonModel) setTimeout(() => buildDungeon3D(true), 50);
      }
      if (btn.dataset.target === 'tab-astro' && window.__astroEngine) {
        setTimeout(() => window.__astroEngine.generate(), 50);
      }
      if (btn.dataset.target === 'tab-cryptex' && window.__cryptexEngine) {
        setTimeout(() => window.__cryptexEngine.generate(), 50);
      }
      if (btn.dataset.target === 'tab-flexi' && window.__flexiEngine) {
        setTimeout(() => window.__flexiEngine.generate(), 50);
      }
      if (btn.dataset.target === 'tab-gears' && window.__gearEngine) {
        setTimeout(() => window.__gearEngine.generate(), 50);
      }
      if (btn.dataset.target === 'tab-vase' && window.__vaseEngine) {
        setTimeout(() => window.__vaseEngine.generate(), 50);
      }
      if (btn.dataset.target === 'tab-voxel' && window.__voxelEngine) {
        setTimeout(() => window.__voxelEngine.generate(), 50);
      }
      if (btn.dataset.target === 'tab-handwriting' && window.__handwritingEngine) {
        setTimeout(() => window.__handwritingEngine.generate(), 50);
      }
      if (btn.dataset.target === 'tab-portrait' && window.__portraitEngine) {
        setTimeout(() => window.__portraitEngine.generate(), 50);
      }
      if (btn.dataset.target === 'tab-terrain' && window.__terrainEngine) {
        setTimeout(() => window.__terrainEngine.generate(), 50);
      }
      if (btn.dataset.target === 'tab-illusion' && window.__illusionEngine) {
        setTimeout(() => window.__illusionEngine.generate(), 50);
      }
      if (btn.dataset.target === 'tab-gridmaster' && window.__gridmasterEngine) {
        setTimeout(() => window.__gridmasterEngine.generate(), 50);
      }
    });
  });

  // ----------------------------------------------------
  // Language Selector
  // ----------------------------------------------------
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      I18N.setLanguage(btn.dataset.lang);
      // Re-trigger metric format if model loaded
      if (state.loadedModel) updateMeshMetrics(state.loadedModel);
    });
  });

  // ----------------------------------------------------
  // Dropzone & File Loader (Tab 1: Convert)
  // ----------------------------------------------------
  const dropzone = document.getElementById('model-dropzone');
  const fileInput = document.getElementById('model-file-input');

  dropzone.addEventListener('click', () => fileInput.click());

  ['dragenter', 'dragover'].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFileUpload(files[0]);
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFileUpload(e.target.files[0]);
  });

  async function handleFileUpload(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const sourceSelect = document.getElementById('source-format-select');
    if (sourceSelect) sourceSelect.value = ext;

    setLoading(true, `Loading ${file.name}...`);
    try {
      const model = await ModelConverters.loadFile(file);
      CADInspector.centerObject(model);
      CADInspector.autoGround(model);
      setModel(model, file.name);
      showToast(I18N.t('toastModelLoaded'), 'success');
    } catch (err) {
      console.error(err);
      showToast(I18N.t('toastErrorLoad') + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  // Convert & Download Action
  document.getElementById('btn-convert-action').addEventListener('click', async () => {
    if (!state.loadedModel) {
      showToast(I18N.t('toastNoModel'), 'warning');
      return;
    }
    const targetFmt = document.getElementById('target-format-select').value;
    const shouldRemoveBase = document.getElementById('convert-remove-base').checked;
    
    setLoading(true, `Converting to ${targetFmt.toUpperCase()}...`);
    try {
      let modelToExport = state.loadedModel;
      if (shouldRemoveBase && state.originalModelBackup) {
        modelToExport = state.originalModelBackup.clone(true);
        const cutoffSlider = document.getElementById('plate-cutoff-slider');
        const cutoffRatio = cutoffSlider ? parseFloat(cutoffSlider.value) / 100.0 : 0.25;
        const axisSelect = document.getElementById('plate-cutoff-axis');
        const selectedAxis = (axisSelect && axisSelect.value !== 'auto') ? axisSelect.value : null;
        CADInspector.removeBasePlate(modelToExport, cutoffRatio, { axis: selectedAxis });
      }

      const { blob, filename } = await ModelConverters.exportModel(modelToExport, targetFmt, state.currentFileName);
      ModelConverters.triggerDownload(blob, filename);
      showToast(I18N.t('toastConvertSuccess', { format: targetFmt.toUpperCase() }), 'success');
    } catch (err) {
      console.error(err);
      showToast(I18N.t('toastErrorConvert') + err.message, 'error');
    } finally {
      setLoading(false);
    }
  });

  // Sample 3D Models Category Filters
  const filterPills = document.querySelectorAll('.sample-filter-pill');
  const sampleCards = document.querySelectorAll('.sample-card');

  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const cat = pill.dataset.cat;
      sampleCards.forEach(card => {
        if (cat === 'all' || card.dataset.cat === cat) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // Sample 3D Model Card Click Handler
  sampleCards.forEach(card => {
    card.addEventListener('click', () => {
      sampleCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      const type = card.dataset.sample;
      setLoading(true, `Generating 3D ${type}...`);
      setTimeout(() => {
        try {
          let object3D;
          if (typeof ModelGenerators.generateUniqueSample3D === 'function') {
            object3D = ModelGenerators.generateUniqueSample3D(type);
          } else if (typeof ModelGenerators.generateParametric === 'function') {
            object3D = ModelGenerators.generateParametric(type);
          }

          if (object3D) {
            CADInspector.centerObject(object3D);
            CADInspector.autoGround(object3D);
            setModel(object3D, `${type}_unique.glb`);
            if (viewer) viewer.fitCameraToModel();
            showToast(I18N.t('toastSampleLoaded').replace('{name}', type), 'success');
          }
        } catch (err) {
          console.error("Error generating sample 3D model:", err);
          showToast(`Error generating ${type}: ${err.message}`, 'error');
        } finally {
          setLoading(false);
        }
      }, 80);
    });
  });

  // ----------------------------------------------------
  // Image to 3D Generation (Tab 2)
  // ----------------------------------------------------
  const imageDropzone = document.getElementById('image-dropzone');
  const imageFileInput = document.getElementById('image-file-input');
  const imagePreviewContainer = document.getElementById('image-preview-container');
  const imagePreviewImg = document.getElementById('image-preview-img');
  const imageClearBtn = document.getElementById('image-preview-clear');

  imageDropzone.addEventListener('click', () => imageFileInput.click());

  imageDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    imageDropzone.classList.add('dragover');
  });

  imageDropzone.addEventListener('dragleave', () => imageDropzone.classList.remove('dragover'));
  imageDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    imageDropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleImageUpload(e.dataTransfer.files[0]);
  });

  imageFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleImageUpload(e.target.files[0]);
  });

  imageClearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    state.activeImage = null;
    window.__polymorph_active_image = null;
    imagePreviewContainer.style.display = 'none';
    const prevBox = document.getElementById('image-depth-preview-box');
    if (prevBox) prevBox.style.display = 'none';
    imageDropzone.style.display = 'flex';
  });

  function handleImageUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        state.activeImage = img;
        window.__polymorph_active_image = img;
        imagePreviewImg.src = e.target.result;
        imagePreviewContainer.style.display = 'block';
        const prevBox = document.getElementById('image-depth-preview-box');
        if (prevBox) prevBox.style.display = 'flex';
        imageDropzone.style.display = 'none';
        updateImageDepthPreview();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Interactive Live 2D Depth Preview Studio
  let depthPreviewMode = 'depth';
  const btnPrevDepth = document.getElementById('btn-prev-depth');
  const btnPrevPhoto = document.getElementById('btn-prev-photo');
  const btnPrevMask = document.getElementById('btn-prev-mask');

  const setPreviewMode = (mode) => {
    depthPreviewMode = mode;
    if (btnPrevDepth) btnPrevDepth.classList.toggle('active', mode === 'depth');
    if (btnPrevPhoto) btnPrevPhoto.classList.toggle('active', mode === 'photo');
    if (btnPrevMask) btnPrevMask.classList.toggle('active', mode === 'mask');
    updateImageDepthPreview();
  };

  if (btnPrevDepth) btnPrevDepth.addEventListener('click', () => setPreviewMode('depth'));
  if (btnPrevPhoto) btnPrevPhoto.addEventListener('click', () => setPreviewMode('photo'));
  if (btnPrevMask) btnPrevMask.addEventListener('click', () => setPreviewMode('mask'));

  let previewDebounceTimer = null;
  function schedulePreviewUpdate() {
    if (previewDebounceTimer) clearTimeout(previewDebounceTimer);
    previewDebounceTimer = setTimeout(updateImageDepthPreview, 60);
  }

  function updateImageDepthPreview() {
    if (!state.activeImage) return;
    const canvas = document.getElementById('image-depth-preview-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = state.activeImage;
    const aspect = (img.naturalWidth || img.width) / (img.naturalHeight || img.height) || 1;
    const previewW = 160;
    const previewH = Math.max(16, Math.round(160 / aspect));

    canvas.width = previewW;
    canvas.height = previewH;

    if (depthPreviewMode === 'photo') {
      ctx.drawImage(img, 0, 0, previewW, previewH);
      return;
    }

    const contrast = parseFloat(document.getElementById('relief-contrast')?.value || 0);
    const brightness = parseFloat(document.getElementById('relief-brightness')?.value || 0);
    const gamma = parseFloat(document.getElementById('relief-gamma')?.value || 1.0);
    const curve = document.getElementById('relief-curve')?.value || 'sigmoid';
    const filterType = document.getElementById('relief-filter-type')?.value || 'bilateral';
    const smooth = parseInt(document.getElementById('relief-smooth')?.value || 1);
    const detail = parseFloat(document.getElementById('relief-detail')?.value || 55) / 100;
    const removeBg = parseFloat(document.getElementById('relief-remove-bg')?.value || 0);
    const invert = document.getElementById('relief-invert')?.checked || false;
    const frameShape = document.getElementById('relief-frame-shape')?.value || 'rect';
    const edgeFalloff = document.getElementById('relief-edge-falloff')?.value || 'none';

    const result = ModelGenerators.processImageDepth(img, {
      resolution: previewW,
      invert: invert,
      smoothing: smooth,
      removeBgStrength: removeBg,
      contrast: contrast,
      brightness: brightness,
      gamma: gamma,
      depthCurve: curve,
      filterType: filterType,
      detailBoost: detail,
      frameShape: frameShape,
      edgeFalloff: edgeFalloff
    });

    if (depthPreviewMode === 'mask') {
      const imgData = ctx.createImageData(result.width, result.height);
      for (let i = 0; i < result.width * result.height; i++) {
        const idx = i * 4;
        const isSubj = result.bgMask[i] === 1;
        imgData.data[idx] = isSubj ? 0 : 220;
        imgData.data[idx + 1] = isSubj ? 240 : 40;
        imgData.data[idx + 2] = isSubj ? 255 : 40;
        imgData.data[idx + 3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);
    } else {
      ctx.drawImage(result.depthCanvas, 0, 0, previewW, previewH);
    }
  }

  // Image Mode Selector Controls Visibility
  const imgModeSelect = document.getElementById('img-gen-mode');
  const reliefParams = document.getElementById('params-relief');
  const lithoParams = document.getElementById('params-litho');
  const extrudeParams = document.getElementById('params-extrude');

  imgModeSelect.addEventListener('change', () => {
    const mode = imgModeSelect.value;
    reliefParams.style.display = (mode === 'relief') ? 'flex' : 'none';
    lithoParams.style.display = (mode === 'litho') ? 'flex' : 'none';
    extrudeParams.style.display = (mode === 'extrude') ? 'flex' : 'none';
  });

  // Texture mode toggle for sculpted material options
  const texModeSelect = document.getElementById('relief-texture-mode');
  const matPresetGroup = document.getElementById('relief-mat-preset-group');
  if (texModeSelect && matPresetGroup) {
    texModeSelect.addEventListener('change', () => {
      matPresetGroup.style.display = (texModeSelect.value === 'sculpted') ? 'flex' : 'none';
    });
  }

  // Relief Preview Update Triggers
  [
    'relief-contrast', 'relief-brightness', 'relief-gamma', 'relief-curve',
    'relief-filter-type', 'relief-smooth', 'relief-detail', 'relief-remove-bg',
    'relief-invert', 'relief-frame-shape', 'relief-edge-falloff'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', schedulePreviewUpdate);
      el.addEventListener('change', schedulePreviewUpdate);
    }
  });

  // Range Slider values updates
  document.querySelectorAll('input[type="range"]').forEach(slider => {
    const valSpan = document.getElementById(`${slider.id}-val`);
    if (valSpan) {
      slider.addEventListener('input', () => {
        let prefix = '';
        if ((slider.id === 'relief-contrast' || slider.id === 'relief-brightness') && parseFloat(slider.value) > 0) {
          prefix = '+';
        }
        valSpan.textContent = prefix + slider.value + (slider.dataset.unit || '');
      });
    }
  });

  // Generate 3D from Image Button
  document.getElementById('btn-generate-image-3d').addEventListener('click', () => {
    if (!state.activeImage) {
      // Create a default procedural radial gradient texture if no image uploaded
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 120);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.5, '#666666');
      grad.addColorStop(1, '#000000');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
      
      const defaultImg = new Image();
      defaultImg.onload = () => {
        state.activeImage = defaultImg;
        runImageGeneration();
      };
      defaultImg.src = canvas.toDataURL();
      return;
    }
    runImageGeneration();
  });

  function runImageGeneration() {
    setLoading(true, "Generating 3D geometry from image...");
    setTimeout(() => {
      try {
        const mode = imgModeSelect.value;
        let mesh;

        if (mode === 'relief') {
          const depth = parseFloat(document.getElementById('relief-depth').value);
          const base = parseFloat(document.getElementById('relief-base').value);
          const res = parseInt(document.getElementById('relief-res').value);
          const smooth = parseInt(document.getElementById('relief-smooth').value);
          const removeBg = document.getElementById('relief-remove-bg') ? parseFloat(document.getElementById('relief-remove-bg').value) : 0;
          const invert = document.getElementById('relief-invert').checked;
          const noBase = document.getElementById('relief-no-base') ? document.getElementById('relief-no-base').checked : false;

          const contrast = parseFloat(document.getElementById('relief-contrast')?.value || 0);
          const brightness = parseFloat(document.getElementById('relief-brightness')?.value || 0);
          const gamma = parseFloat(document.getElementById('relief-gamma')?.value || 1.0);
          const depthCurve = document.getElementById('relief-curve')?.value || 'sigmoid';
          const filterType = document.getElementById('relief-filter-type')?.value || 'bilateral';
          const detailBoost = parseFloat(document.getElementById('relief-detail')?.value || 55) / 100;
          const frameShape = document.getElementById('relief-frame-shape')?.value || 'rect';
          const edgeFalloff = document.getElementById('relief-edge-falloff')?.value || 'none';
          const textureMode = document.getElementById('relief-texture-mode')?.value || 'photo';
          const materialPreset = document.getElementById('relief-material-preset')?.value || 'marble';
          const cavityAO = parseFloat(document.getElementById('relief-cavity-ao')?.value || 50) / 100;

          mesh = ModelGenerators.generateHeightmap(state.activeImage, {
            reliefDepth: depth,
            baseThickness: base,
            resolution: res,
            smoothing: smooth,
            invert: invert,
            noBasePlate: noBase,
            removeBgStrength: removeBg,
            contrast: contrast,
            brightness: brightness,
            gamma: gamma,
            depthCurve: depthCurve,
            filterType: filterType,
            detailBoost: detailBoost,
            frameShape: frameShape,
            edgeFalloff: edgeFalloff,
            textureMode: textureMode,
            materialPreset: materialPreset,
            cavityAO: cavityAO
          });
        } else if (mode === 'litho') {
          const shape = document.getElementById('litho-shape').value;
          const minThick = parseFloat(document.getElementById('litho-min-thick').value);
          const maxThick = parseFloat(document.getElementById('litho-max-thick').value);
          const frameBorder = parseFloat(document.getElementById('litho-border')?.value || 2.0);
          const lithoPreset = document.getElementById('litho-preset')?.value || 'white';
          const invert = document.getElementById('litho-invert')?.checked || false;

          mesh = ModelGenerators.generateLithophane(state.activeImage, {
            shape: shape,
            minThickness: minThick,
            maxThickness: maxThick,
            frameBorder: frameBorder,
            lithoPreset: lithoPreset,
            invert: invert,
            resolution: 180
          });
        } else if (mode === 'extrude') {
          const depth = parseFloat(document.getElementById('extrude-depth').value);
          const bevel = parseFloat(document.getElementById('extrude-bevel').value);
          const threshold = parseFloat(document.getElementById('extrude-threshold')?.value || 128);
          const finish = document.getElementById('extrude-finish')?.value || 'cyan';
          const invert = document.getElementById('extrude-invert')?.checked || false;

          mesh = ModelGenerators.generateExtrudedSilhouette(state.activeImage, {
            depth: depth,
            bevelThickness: bevel,
            bevelSize: bevel,
            threshold: threshold,
            finish: finish,
            invert: invert
          });
        }

        CADInspector.centerObject(mesh);
        CADInspector.autoGround(mesh);
        setModel(mesh, `Generated_${mode}_3D.glb`);
        showToast(I18N.t('toastImageGenerated'), 'success');
      } catch (err) {
        console.error(err);
        showToast("Generation error: " + err.message, 'error');
      } finally {
        setLoading(false);
      }
    }, 100);
  }

  // ----------------------------------------------------
  // Photo in AR Framing Studio (Tab 5)
  // ----------------------------------------------------
  const photoArDropzone = document.getElementById('photo-ar-dropzone');
  const photoArFileInput = document.getElementById('photo-ar-file-input');
  const photoArPreviewContainer = document.getElementById('photo-ar-preview-container');
  const photoArPreviewImg = document.getElementById('photo-ar-preview-img');
  const photoArClearBtn = document.getElementById('photo-ar-preview-clear');
  const photoArStyleSelect = document.getElementById('photo-ar-style');
  const photoArFrameColorGroup = document.getElementById('photo-ar-frame-color-group');
  const photoArMatGroup = document.getElementById('photo-ar-mat-group');

  if (photoArDropzone) {
    photoArDropzone.addEventListener('click', () => photoArFileInput.click());
    photoArDropzone.addEventListener('dragover', (e) => { e.preventDefault(); photoArDropzone.classList.add('dragover'); });
    photoArDropzone.addEventListener('dragleave', () => photoArDropzone.classList.remove('dragover'));
    photoArDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      photoArDropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) handlePhotoArUpload(e.dataTransfer.files[0]);
    });
  }

  if (photoArFileInput) {
    photoArFileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) handlePhotoArUpload(e.target.files[0]);
    });
  }

  if (photoArClearBtn) {
    photoArClearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.activePhotoArImage = null;
      if (photoArPreviewContainer) photoArPreviewContainer.style.display = 'none';
      if (photoArDropzone) photoArDropzone.style.display = 'flex';
    });
  }

  function handlePhotoArUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        state.activePhotoArImage = img;
        state.activeImage = img;
        window.__polymorph_active_image = img;
        if (photoArPreviewImg) photoArPreviewImg.src = e.target.result;
        if (photoArPreviewContainer) photoArPreviewContainer.style.display = 'block';
        if (photoArDropzone) photoArDropzone.style.display = 'none';
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  if (photoArStyleSelect) {
    photoArStyleSelect.addEventListener('change', () => {
      const s = photoArStyleSelect.value;
      if (photoArFrameColorGroup) {
        photoArFrameColorGroup.style.display = (s === 'poster' || s === 'canvas_wrap') ? 'none' : 'block';
      }
      if (photoArMatGroup) {
        photoArMatGroup.style.display = (s === 'museum_frame') ? 'block' : 'none';
      }
    });
  }

  const photoArPlaqueToggle = document.getElementById('photo-ar-plaque-toggle');
  const photoArPlaqueFields = document.getElementById('photo-ar-plaque-fields');
  if (photoArPlaqueToggle && photoArPlaqueFields) {
    photoArPlaqueToggle.addEventListener('change', () => {
      photoArPlaqueFields.style.display = photoArPlaqueToggle.checked ? 'flex' : 'none';
    });
  }

  document.querySelectorAll('.ar-size-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = btn.dataset.size;
      const slider = document.getElementById('photo-ar-width');
      const valSpan = document.getElementById('photo-ar-width-val');
      if (slider) slider.value = s;
      if (valSpan) valSpan.textContent = `${s}cm`;
    });
  });

  safeOn('btn-create-photo-ar', 'click', () => {
    const img = state.activePhotoArImage || state.activeImage;
    if (!img) {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createLinearGradient(0, 0, 512, 512);
      grad.addColorStop(0, '#00f0ff');
      grad.addColorStop(0.5, '#7928ca');
      grad.addColorStop(1, '#ff0080');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PolyMorph AR Studio', 256, 260);

      const sampleImg = new Image();
      sampleImg.onload = () => {
        state.activePhotoArImage = sampleImg;
        buildArPhotoModel(sampleImg);
      };
      sampleImg.src = canvas.toDataURL();
      return;
    }
    buildArPhotoModel(img);
  });

  function buildArPhotoModel(img) {
    setLoading(true, "Building 100% Quality AR Photo model...");
    setTimeout(() => {
      try {
        const style = document.getElementById('photo-ar-style')?.value || 'museum_frame';
        const color = document.getElementById('photo-ar-frame-color')?.value || 'black';
        const widthCm = parseFloat(document.getElementById('photo-ar-width')?.value || 40);
        const mat = parseFloat(document.getElementById('photo-ar-mat')?.value || 8);
        const shape = document.getElementById('photo-ar-shape')?.value || 'single';
        const surfaceFinish = document.getElementById('photo-ar-finish')?.value || 'smooth';
        const hasPlaque = Boolean(document.getElementById('photo-ar-plaque-toggle')?.checked);
        const plaqueText = document.getElementById('photo-ar-plaque-text')?.value || 'PolyMorph Gallery • 2026';
        const plaqueMaterial = document.getElementById('photo-ar-plaque-material')?.value || 'gold';

        const group = ModelGenerators.generatePhotoAR(img, {
          style,
          frameColor: color,
          widthCm,
          matMarginPercent: mat,
          shape,
          surfaceFinish,
          hasPlaque,
          plaqueText,
          plaqueMaterial
        });

        CADInspector.centerObject(group);
        CADInspector.autoGround(group);
        setModel(group, `AR_Photo_${shape}_${style}.glb`);
        showToast(I18N.t('toastPhotoArCreated'), 'success');
      } catch (err) {
        console.error(err);
        showToast("Error creating AR photo: " + err.message, 'error');
      } finally {
        setLoading(false);
      }
    }, 80);
  }

  safeOn('btn-quick-photo-ar-qr', 'click', () => {
    const qrBtn = document.getElementById('tool-ar-qr');
    if (qrBtn) qrBtn.click();
  });

  safeOn('btn-export-photo-ar-glb', 'click', () => {
    exportCurrentModel('glb', 'Photo_AR_Model');
  });

  safeOn('btn-export-photo-ar-usdz', 'click', () => {
    exportCurrentModel('usdz', 'Photo_AR_Model');
  });

  // ----------------------------------------------------
  // Generative CAD Builder (Tab 3)
  // ----------------------------------------------------
  document.getElementById('btn-generate-cad').addEventListener('click', () => {
    const shapeType = document.getElementById('cad-shape-select').value;
    setLoading(true, `Building ${shapeType}...`);
    setTimeout(() => {
      const mesh = ModelGenerators.generateParametric(shapeType, { teeth: 16 });
      CADInspector.centerObject(mesh);
      CADInspector.autoGround(mesh);
      setModel(mesh, `Parametric_${shapeType}.glb`);
      setLoading(false);
      showToast(I18N.t('toastModelLoaded'), 'success');
    }, 100);
  });

  // ----------------------------------------------------
  // Draw to 3D & 4D Studio
  // ----------------------------------------------------
  // Draw to 3D & 4D Studio (Tab 4)
  // ----------------------------------------------------
  let currentDrawModel = null;
  let dualSketchCanvasA = null;
  let dualSketchCanvasB = null;
  let draw4DAnimId = null;
  let drawCanvas = null;
  let drawCtx = null;
  let isDrawing = false;
  let currentDrawTool = 'pen';
  let currentDrawColor = '#00f0ff';
  let currentBrushSize = 14;
  let drawnStrokePoints = [];
  let isDrawInitialized = false;

  function updateDraw3DSubpanels() {
    const mode = document.getElementById('draw3d-mode-select')?.value || 'inflatable';
    const pnlInflatable = document.getElementById('draw3d-inflatable-params');
    const pnlKeychain = document.getElementById('draw3d-keychain-params');
    const pnlRing = document.getElementById('draw3d-ring-params');
    const pnlLitho = document.getElementById('draw3d-lithophane-params');
    const pnlCoin = document.getElementById('draw3d-coin-params');
    const pnlOrigami = document.getElementById('draw3d-origami-params');
    const pnlSpinner = document.getElementById('draw3d-spinner-params');
    const pnlPuzzle = document.getElementById('draw3d-puzzle-params');
    const pnlAudio = document.getElementById('draw3d-audio-params');
    const pnlCookie = document.getElementById('draw3d-cookie-params');
    const pnlHelix = document.getElementById('draw3d-helix-params');
    const pnlLathe = document.getElementById('draw3d-lathe-params');
    const pnlTube = document.getElementById('draw3d-tube-params');
    const pnl4D = document.getElementById('draw3d-4d-params');
    const pnlDualMorph = document.getElementById('draw3d-dualmorph-params');
    const symmetryLine = document.getElementById('draw3d-symmetry-line');

    if (pnlInflatable) pnlInflatable.style.display = (mode === 'inflatable' || mode === 'hypermorph_4d' || mode === 'voronoi_lattice' || mode === 'multilayer_topo' || mode === 'sound_wave_4d' || mode === 'stained_glass') ? 'block' : 'none';
    if (pnlKeychain) pnlKeychain.style.display = (mode === 'keychain') ? 'block' : 'none';
    if (pnlRing) pnlRing.style.display = (mode === 'ring_wrap') ? 'block' : 'none';
    if (pnlLitho) pnlLitho.style.display = (mode === 'lithophane') ? 'block' : 'none';
    if (pnlCoin) pnlCoin.style.display = (mode === 'coin_medal') ? 'block' : 'none';
    if (pnlOrigami) pnlOrigami.style.display = (mode === 'origami_crystal') ? 'block' : 'none';
    if (pnlSpinner) pnlSpinner.style.display = (mode === 'kinetic_spinner') ? 'block' : 'none';
    if (pnlPuzzle) pnlPuzzle.style.display = (mode === 'puzzle_3d') ? 'block' : 'none';
    if (pnlAudio) pnlAudio.style.display = (mode === 'sound_wave_4d') ? 'block' : 'none';
    if (pnlCookie) pnlCookie.style.display = (mode === 'cookie_cutter') ? 'block' : 'none';
    if (pnlHelix) pnlHelix.style.display = (mode === 'dna_helix') ? 'block' : 'none';
    if (pnlLathe) pnlLathe.style.display = (mode === 'lathe') ? 'block' : 'none';
    if (pnlTube) pnlTube.style.display = (mode === 'tube') ? 'block' : 'none';
    if (pnl4D) pnl4D.style.display = (mode === 'hypermorph_4d' || mode === 'morph4d_dual' || mode === 'tesseract_4d') ? 'block' : 'none';
    if (pnlDualMorph) pnlDualMorph.style.display = (mode === 'morph4d_dual') ? 'block' : 'none';

    const symVal = parseInt(document.getElementById('draw3d-symmetry-select')?.value || '1', 10);
    if (symmetryLine) symmetryLine.style.display = (mode === 'lathe' || symVal > 1) ? 'block' : 'none';
  }

  function stopDraw4DAnimation() {
    if (draw4DAnimId) {
      cancelAnimationFrame(draw4DAnimId);
      draw4DAnimId = null;
    }
  }

  function startDraw4DAnimation() {
    stopDraw4DAnimation();
    const tick = () => {
      if (currentDrawModel && currentDrawModel.userData && typeof currentDrawModel.userData.tick4D === 'function') {
        const speed = parseFloat(document.getElementById('draw3d-4d-speed-slider')?.value || 1.0);
        currentDrawModel.userData.tick4D(0.016 * speed);
      }
      draw4DAnimId = requestAnimationFrame(tick);
    };
    draw4DAnimId = requestAnimationFrame(tick);
  }

  function buildDraw3DModel(reframe = true) {
    if (!window.Draw3DEngine || !drawCanvas) return;
    stopDraw4DAnimation();

    const mode = document.getElementById('draw3d-mode-select')?.value || 'inflatable';
    const depthMm = parseFloat(document.getElementById('draw3d-depth-slider')?.value || 30);
    const tubeRadius = parseFloat(document.getElementById('draw3d-tuberadius-slider')?.value || 3.5);
    const profileShape = document.getElementById('draw3d-tube-profile')?.value || 'round';
    const materialFinish = document.getElementById('draw3d-material-finish')?.value || 'glossy';
    const morph4dType = document.getElementById('draw3d-4d-morph-type')?.value || 'pulse';
    const speed4D = parseFloat(document.getElementById('draw3d-4d-speed-slider')?.value || 1.0);

    // Keychain parameters
    const kcBase = parseFloat(document.getElementById('draw3d-keychain-base-slider')?.value || 3.0);
    const kcRelief = parseFloat(document.getElementById('draw3d-keychain-relief-slider')?.value || 2.5);
    const kcShape = document.getElementById('draw3d-keychain-shape')?.value || 'rounded_rect';
    const kcRingStyle = document.getElementById('draw3d-keychain-ring-style')?.value || 'top_loop';
    const kcBaseColor = document.getElementById('draw3d-keychain-base-color')?.value || '#1e293b';

    // Ring wrap parameters
    const ringDiam = parseFloat(document.getElementById('draw3d-ring-diam-slider')?.value || 18.0);
    const ringWidth = parseFloat(document.getElementById('draw3d-ring-width-slider')?.value || 8.0);
    const ringReliefMode = document.getElementById('draw3d-ring-relief-mode')?.value || 'emboss';

    // Lithophane parameters
    const lithoArc = parseFloat(document.getElementById('draw3d-litho-arc-slider')?.value || 120);
    const lithoThick = parseFloat(document.getElementById('draw3d-litho-thick-slider')?.value || 3.2);

    // Coin parameters
    const coinDiam = parseFloat(document.getElementById('draw3d-coin-diam-slider')?.value || 40.0);
    const coinReeds = parseInt(document.getElementById('draw3d-coin-reeds-slider')?.value || '100', 10);
    const coinRibbon = !!document.getElementById('draw3d-coin-ribbon-toggle')?.checked;

    // Origami crystal parameters
    const origamiFacets = parseInt(document.getElementById('draw3d-origami-facet-slider')?.value || '28', 10);

    // Puzzle parameters
    const puzzleExplode = parseFloat(document.getElementById('draw3d-puzzle-explode-slider')?.value || 0);

    // Audio Wave 4D parameters
    const audioPreset = document.getElementById('draw3d-audio-preset')?.value || 'synthwave';

    // Cookie cutter parameters
    const ccHeight = parseFloat(document.getElementById('draw3d-cookie-height-slider')?.value || 15.0);
    const ccLip = parseFloat(document.getElementById('draw3d-cookie-lip-slider')?.value || 4.5);

    // Helix parameters
    const helixTurns = parseFloat(document.getElementById('draw3d-helix-turns-slider')?.value || 3.5);
    const helixStrands = parseInt(document.getElementById('draw3d-helix-strands')?.value || '2', 10);

    // Lathe fluting parameters
    const latheFlutes = parseInt(document.getElementById('draw3d-lathe-flutes-slider')?.value || '0', 10);
    const latheTwist = parseFloat(document.getElementById('draw3d-lathe-twist-slider')?.value || '0.0');

    let model = null;

    if (mode === 'inflatable') {
      const inflationProfile = document.getElementById('draw3d-inflation-profile')?.value || 'dome';
      const resolution = parseInt(document.getElementById('draw3d-res-slider')?.value || '140', 10);
      const smoothness = parseInt(document.getElementById('draw3d-smoothness-slider')?.value || '3', 10);
      model = Draw3DEngine.inflateContour(drawCanvas, {
        depthMm,
        resolution,
        smoothness,
        profile: inflationProfile,
        color: currentDrawColor,
        materialFinish
      });
    } else if (mode === 'keychain') {
      model = Draw3DEngine.generateKeychain(drawCanvas, {
        baseThickness: kcBase,
        reliefHeight: kcRelief,
        keychainShape: kcShape,
        ringStyle: kcRingStyle,
        baseColor: kcBaseColor,
        color: currentDrawColor,
        materialFinish
      });
    } else if (mode === 'ring_wrap') {
      model = Draw3DEngine.generateRingWrap(drawCanvas, {
        ringDiameter: ringDiam,
        bandWidth: ringWidth,
        reliefMode: ringReliefMode,
        materialFinish
      });
    } else if (mode === 'lithophane') {
      model = Draw3DEngine.generateLithophane(drawCanvas, {
        curveAngle: lithoArc,
        maxThick: lithoThick
      });
    } else if (mode === 'coin_medal') {
      model = Draw3DEngine.generateCoinMedal(drawCanvas, {
        diameter: coinDiam,
        reedCount: coinReeds,
        hasRibbonLoop: coinRibbon,
        color: currentDrawColor,
        materialFinish
      });
    } else if (mode === 'origami_crystal') {
      model = Draw3DEngine.generateOrigamiCrystal(drawCanvas, {
        depthMm,
        facetDetail: origamiFacets,
        color: currentDrawColor,
        materialFinish
      });
    } else if (mode === 'stained_glass') {
      model = Draw3DEngine.generateStainedGlass(drawCanvas, {
        color: currentDrawColor,
        materialFinish
      });
    } else if (mode === 'kinetic_spinner') {
      model = Draw3DEngine.generateKineticSpinner(drawCanvas, {
        color: currentDrawColor,
        materialFinish
      });
    } else if (mode === 'puzzle_3d') {
      model = Draw3DEngine.generateJigsawPuzzle(drawCanvas, {
        depthMm,
        explodeDist: puzzleExplode,
        color: currentDrawColor,
        materialFinish
      });
    } else if (mode === 'sound_wave_4d') {
      const baseMesh = Draw3DEngine.inflateContour(drawCanvas, {
        depthMm,
        color: currentDrawColor,
        materialFinish
      });
      if (baseMesh) {
        const res = Draw3DEngine.createAudioReactive4D(baseMesh, { audioPreset, speed: speed4D });
        model = res.model;
      }
    } else if (mode === 'cookie_cutter') {
      model = Draw3DEngine.generateCookieCutter(drawCanvas, {
        cutHeight: ccHeight,
        handleLipWidth: ccLip,
        color: currentDrawColor
      });
    } else if (mode === 'dna_helix') {
      model = Draw3DEngine.generateDNAHelix(drawnStrokePoints, {
        turns: helixTurns,
        strands: helixStrands,
        color: currentDrawColor
      });
    } else if (mode === 'voronoi_lattice') {
      const baseMesh = Draw3DEngine.inflateContour(drawCanvas, {
        depthMm,
        color: currentDrawColor,
        materialFinish
      });
      if (baseMesh) {
        model = Draw3DEngine.generateVoronoiLattice(baseMesh, {
          color: currentDrawColor,
          materialFinish
        });
      }
    } else if (mode === 'lathe') {
      model = Draw3DEngine.revolveProfile(drawnStrokePoints, {
        flutes: latheFlutes,
        twist: latheTwist,
        color: currentDrawColor,
        materialFinish,
        canvasWidth: drawCanvas.width,
        canvasHeight: drawCanvas.height
      });
    } else if (mode === 'tube') {
      model = Draw3DEngine.extrudeTubePath(drawnStrokePoints, {
        tubeRadius,
        profileShape,
        color: currentDrawColor,
        materialFinish,
        canvasWidth: drawCanvas.width,
        canvasHeight: drawCanvas.height
      });
    } else if (mode === 'hypermorph_4d') {
      let baseMesh = Draw3DEngine.inflateContour(drawCanvas, {
        depthMm,
        color: currentDrawColor,
        materialFinish
      });
      if (!baseMesh && drawnStrokePoints.length > 2) {
        baseMesh = Draw3DEngine.extrudeTubePath(drawnStrokePoints, {
          tubeRadius,
          color: currentDrawColor,
          materialFinish,
          canvasWidth: drawCanvas.width,
          canvasHeight: drawCanvas.height
        });
      }
      if (baseMesh) {
        const res = Draw3DEngine.create4DHyperMorph(baseMesh, morph4dType, { speed: speed4D });
        model = res.model;
      }
    } else if (mode === 'morph4d_dual') {
      if (!dualSketchCanvasA) {
        dualSketchCanvasA = document.createElement('canvas');
        dualSketchCanvasA.width = drawCanvas.width;
        dualSketchCanvasA.height = drawCanvas.height;
        Draw3DEngine.drawPresetSketch(dualSketchCanvasA, 'heart');
      }
      if (!dualSketchCanvasB) {
        dualSketchCanvasB = document.createElement('canvas');
        dualSketchCanvasB.width = drawCanvas.width;
        dualSketchCanvasB.height = drawCanvas.height;
        Draw3DEngine.drawPresetSketch(dualSketchCanvasB, 'star');
      }
      const res = Draw3DEngine.createDualSketchMorph4D(dualSketchCanvasA, dualSketchCanvasB, {
        depthMm,
        colorA: '#00f0ff',
        colorB: '#ff007f',
        materialFinish,
        speed: speed4D
      });
      model = res.model;
    } else if (mode === 'multilayer_topo') {
      model = Draw3DEngine.buildMultiLayerRelief(drawCanvas, {
        baseHeight: Math.max(4, depthMm * 0.25),
        layerStepHeight: Math.max(5, depthMm * 0.35)
      });
    } else if (mode === 'tesseract_4d') {
      model = Draw3DEngine.create4DParticleNebula(drawnStrokePoints, {
        color: currentDrawColor,
        canvasWidth: drawCanvas.width,
        canvasHeight: drawCanvas.height
      });
    }

    if (!model) return;
    currentDrawModel = model;

    CADInspector.centerObject(model);
    CADInspector.autoGround(model);
    setModel(model, `Draw3D_${mode}.glb`);

    if (model.userData && model.userData.is4D) {
      startDraw4DAnimation();
    }

    if (reframe && viewer) viewer.fitCameraToModel();
  }

  function initDraw3DStudio() {
    drawCanvas = document.getElementById('draw3d-canvas');
    if (!drawCanvas) return;
    drawCtx = drawCanvas.getContext('2d');

    if (!isDrawInitialized) {
      isDrawInitialized = true;

      // Pointer Drawing Handlers with Radial / Spirograph Multi-Axis Mirroring & Geometry Shapes
      let lastPoint = null;
      let shapeStartPoint = null;
      let canvasSnapshot = null;

      const getPos = (e) => {
        const rect = drawCanvas.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0]?.clientX);
        const clientY = e.clientY || (e.touches && e.touches[0]?.clientY);
        return {
          x: (clientX - rect.left) * (drawCanvas.width / rect.width),
          y: (clientY - rect.top) * (drawCanvas.height / rect.height)
        };
      };

      const renderRadialDots = (pos) => {
        const sym = parseInt(document.getElementById('draw3d-symmetry-select')?.value || '1', 10);
        const cx = drawCanvas.width / 2;
        const cy = drawCanvas.height / 2;
        const dx = pos.x - cx;
        const dy = pos.y - cy;

        for (let k = 0; k < sym; k++) {
          const angle = (k / sym) * Math.PI * 2;
          const rx = cx + dx * Math.cos(angle) - dy * Math.sin(angle);
          const ry = cy + dx * Math.sin(angle) + dy * Math.cos(angle);
          drawCtx.beginPath();
          drawCtx.arc(rx, ry, currentBrushSize / 2, 0, Math.PI * 2);
          drawCtx.fill();
        }
      };

      // BFS Flood-Fill algorithm for instant closed-region coloring
      const performFloodFill = (startX, startY) => {
        const w = drawCanvas.width;
        const h = drawCanvas.height;
        const imgData = drawCtx.getImageData(0, 0, w, h);
        const data = imgData.data;

        const px = Math.floor(Math.max(0, Math.min(w - 1, startX)));
        const py = Math.floor(Math.max(0, Math.min(h - 1, startY)));
        const startIdx = (py * w + px) * 4;

        const tr = data[startIdx];
        const tg = data[startIdx + 1];
        const tb = data[startIdx + 2];
        const ta = data[startIdx + 3];

        // Parse current draw color hex to RGBA
        const hex = currentDrawColor.replace('#', '');
        const fr = parseInt(hex.substring(0, 2), 16) || 0;
        const fg = parseInt(hex.substring(2, 4), 16) || 0;
        const fb = parseInt(hex.substring(4, 6), 16) || 0;
        const fa = 255;

        // Skip if clicked pixel is already the fill color
        if (Math.abs(tr - fr) < 8 && Math.abs(tg - fg) < 8 && Math.abs(tb - fb) < 8 && Math.abs(ta - fa) < 8) {
          return;
        }

        const matchTarget = (idx) => {
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];
          return Math.abs(r - tr) <= 36 && Math.abs(g - tg) <= 36 && Math.abs(b - tb) <= 36 && Math.abs(a - ta) <= 36;
        };

        const queue = [px + py * w];
        const visited = new Uint8Array(w * h);
        visited[px + py * w] = 1;

        let head = 0;
        while (head < queue.length) {
          const p = queue[head++];
          const cx = p % w;
          const cy = Math.floor(p / w);
          const idx = p * 4;

          data[idx] = fr;
          data[idx + 1] = fg;
          data[idx + 2] = fb;
          data[idx + 3] = fa;

          if (cx > 0) {
            const left = p - 1;
            if (!visited[left] && matchTarget(left * 4)) {
              visited[left] = 1;
              queue.push(left);
            }
          }
          if (cx < w - 1) {
            const right = p + 1;
            if (!visited[right] && matchTarget(right * 4)) {
              visited[right] = 1;
              queue.push(right);
            }
          }
          if (cy > 0) {
            const up = p - w;
            if (!visited[up] && matchTarget(up * 4)) {
              visited[up] = 1;
              queue.push(up);
            }
          }
          if (cy < h - 1) {
            const down = p + w;
            if (!visited[down] && matchTarget(down * 4)) {
              visited[down] = 1;
              queue.push(down);
            }
          }
        }

        drawCtx.putImageData(imgData, 0, 0);
      };

      const startDraw = (e) => {
        e.preventDefault();
        const pos = getPos(e);

        if (currentDrawTool === 'fill') {
          performFloodFill(pos.x, pos.y);
          buildDraw3DModel(false);
          return;
        }

        isDrawing = true;
        shapeStartPoint = pos;
        lastPoint = pos;
        drawnStrokePoints.push(pos);
        canvasSnapshot = drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);

        drawCtx.lineCap = 'round';
        drawCtx.lineJoin = 'round';
        drawCtx.lineWidth = currentBrushSize;

        if (currentDrawTool === 'eraser') {
          drawCtx.globalCompositeOperation = 'destination-out';
          drawCtx.strokeStyle = 'rgba(0,0,0,1)';
          drawCtx.fillStyle = 'rgba(0,0,0,1)';
        } else {
          drawCtx.globalCompositeOperation = 'source-over';
          drawCtx.strokeStyle = currentDrawColor;
          drawCtx.fillStyle = currentDrawColor;
        }

        if (currentDrawTool === 'pen' || currentDrawTool === 'eraser') {
          renderRadialDots(pos);
        }
      };

      const drawMove = (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        const pos = getPos(e);
        drawnStrokePoints.push(pos);

        const sym = parseInt(document.getElementById('draw3d-symmetry-select')?.value || '1', 10);
        const cx = drawCanvas.width / 2;
        const cy = drawCanvas.height / 2;

        if (currentDrawTool === 'line' || currentDrawTool === 'circle' || currentDrawTool === 'rect') {
          if (!canvasSnapshot) return;
          drawCtx.putImageData(canvasSnapshot, 0, 0);
          drawCtx.globalCompositeOperation = 'source-over';
          drawCtx.strokeStyle = currentDrawColor;
          drawCtx.fillStyle = currentDrawColor;
          drawCtx.lineWidth = currentBrushSize;
          drawCtx.lineCap = 'round';
          drawCtx.lineJoin = 'round';

          for (let k = 0; k < sym; k++) {
            const angle = (k / sym) * Math.PI * 2;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            const s0x = shapeStartPoint.x - cx;
            const s0y = shapeStartPoint.y - cy;
            const p1x = pos.x - cx;
            const p1y = pos.y - cy;

            const x0 = cx + s0x * cos - s0y * sin;
            const y0 = cy + s0x * sin + s0y * cos;
            const x1 = cx + p1x * cos - p1y * sin;
            const y1 = cy + p1x * sin + p1y * cos;

            drawCtx.beginPath();
            if (currentDrawTool === 'line') {
              drawCtx.moveTo(x0, y0);
              drawCtx.lineTo(x1, y1);
              drawCtx.stroke();
            } else if (currentDrawTool === 'rect') {
              drawCtx.strokeRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
            } else if (currentDrawTool === 'circle') {
              const rx = Math.abs(x1 - x0) / 2;
              const ry = Math.abs(y1 - y0) / 2;
              const mx = (x0 + x1) / 2;
              const my = (y0 + y1) / 2;
              drawCtx.ellipse(mx, my, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
              drawCtx.stroke();
            }
          }
        } else if (lastPoint && sym > 1) {
          const dx0 = lastPoint.x - cx, dy0 = lastPoint.y - cy;
          const dx1 = pos.x - cx, dy1 = pos.y - cy;

          for (let k = 0; k < sym; k++) {
            const angle = (k / sym) * Math.PI * 2;
            const rx0 = cx + dx0 * Math.cos(angle) - dy0 * Math.sin(angle);
            const ry0 = cy + dx0 * Math.sin(angle) + dy0 * Math.cos(angle);
            const rx1 = cx + dx1 * Math.cos(angle) - dy1 * Math.sin(angle);
            const ry1 = cy + dx1 * Math.sin(angle) + dy1 * Math.cos(angle);

            drawCtx.beginPath();
            drawCtx.moveTo(rx0, ry0);
            drawCtx.lineTo(rx1, ry1);
            drawCtx.stroke();
          }
        } else if (lastPoint) {
          drawCtx.beginPath();
          drawCtx.moveTo(lastPoint.x, lastPoint.y);
          drawCtx.lineTo(pos.x, pos.y);
          drawCtx.stroke();
        }

        lastPoint = pos;
      };

      const endDraw = (e) => {
        if (!isDrawing) return;
        isDrawing = false;
        canvasSnapshot = null;
        shapeStartPoint = null;
        drawCtx.beginPath();
        buildDraw3DModel(false);
      };

      drawCanvas.addEventListener('pointerdown', startDraw);
      drawCanvas.addEventListener('pointermove', drawMove);
      drawCanvas.addEventListener('pointerup', endDraw);
      drawCanvas.addEventListener('pointercancel', endDraw);
      drawCanvas.addEventListener('pointerleave', endDraw);

      // Load Default Sketch
      drawnStrokePoints = Draw3DEngine.drawPresetSketch(drawCanvas, 'heart');
      buildDraw3DModel(true);
    }

    updateDraw3DSubpanels();
  }

  // Draw 3D Tools Management
  const drawToolButtons = [
    { id: 'btn-draw-tool-pen', tool: 'pen' },
    { id: 'btn-draw-tool-line', tool: 'line' },
    { id: 'btn-draw-tool-circle', tool: 'circle' },
    { id: 'btn-draw-tool-rect', tool: 'rect' },
    { id: 'btn-draw-tool-fill', tool: 'fill' },
    { id: 'btn-draw-tool-eraser', tool: 'eraser' }
  ];

  function setActiveDrawTool(selectedTool) {
    currentDrawTool = selectedTool;
    drawToolButtons.forEach(({ id, tool }) => {
      const btn = document.getElementById(id);
      if (btn) {
        if (tool === selectedTool) btn.classList.add('active');
        else btn.classList.remove('active');
      }
    });
  }

  drawToolButtons.forEach(({ id, tool }) => {
    safeOn(id, 'click', () => setActiveDrawTool(tool));
  });

  safeOn('btn-draw-tool-clear', 'click', () => {
    if (drawCanvas && drawCtx) {
      drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
      drawnStrokePoints = [];
      buildDraw3DModel(false);
      showToast(I18N.t('toastCanvasCleared'), 'info');
    }
  });

  // Brush Slider
  const brushSlider = document.getElementById('draw3d-brush-slider');
  const brushVal = document.getElementById('draw3d-brush-val');
  if (brushSlider) {
    brushSlider.addEventListener('input', (e) => {
      currentBrushSize = parseInt(e.target.value, 10);
      if (brushVal) brushVal.textContent = `${currentBrushSize}px`;
    });
  }

  // Symmetry Select
  const symSelect = document.getElementById('draw3d-symmetry-select');
  if (symSelect) {
    symSelect.addEventListener('change', () => {
      updateDraw3DSubpanels();
    });
  }

  // Quality & Resolution Controls for Inflatable 3D
  const draw3dResSlider = document.getElementById('draw3d-res-slider');
  const draw3dResVal = document.getElementById('draw3d-res-val');
  if (draw3dResSlider) {
    draw3dResSlider.addEventListener('input', (e) => {
      if (draw3dResVal) draw3dResVal.textContent = e.target.value;
    });
    draw3dResSlider.addEventListener('change', () => {
      buildDraw3DModel(false);
    });
  }

  const draw3dSmoothSlider = document.getElementById('draw3d-smoothness-slider');
  const draw3dSmoothVal = document.getElementById('draw3d-smoothness-val');
  if (draw3dSmoothSlider) {
    draw3dSmoothSlider.addEventListener('input', (e) => {
      if (draw3dSmoothVal) draw3dSmoothVal.textContent = e.target.value;
    });
    draw3dSmoothSlider.addEventListener('change', () => {
      buildDraw3DModel(false);
    });
  }

  const draw3dProfileSelect = document.getElementById('draw3d-inflation-profile');
  if (draw3dProfileSelect) {
    draw3dProfileSelect.addEventListener('change', () => {
      buildDraw3DModel(false);
    });
  }

  // Dual Sketch Capture & Preset Buttons
  safeOn('btn-draw3d-capture-frame-a', 'click', () => {
    if (!drawCanvas) return;
    dualSketchCanvasA = document.createElement('canvas');
    dualSketchCanvasA.width = drawCanvas.width;
    dualSketchCanvasA.height = drawCanvas.height;
    dualSketchCanvasA.getContext('2d').drawImage(drawCanvas, 0, 0);
    showToast("Frame A saved! Draw Frame B to activate 4D Metamorphosis.", 'success');
    buildDraw3DModel(false);
  });

  safeOn('btn-draw3d-capture-frame-b', 'click', () => {
    if (!drawCanvas) return;
    dualSketchCanvasB = document.createElement('canvas');
    dualSketchCanvasB.width = drawCanvas.width;
    dualSketchCanvasB.height = drawCanvas.height;
    dualSketchCanvasB.getContext('2d').drawImage(drawCanvas, 0, 0);
    showToast(I18N.t('toastFrameBSaved'), 'success');
    buildDraw3DModel(false);
  });

  safeOn('btn-draw3d-morph-preset-1', 'click', () => {
    if (!drawCanvas) return;
    dualSketchCanvasA = document.createElement('canvas');
    dualSketchCanvasA.width = drawCanvas.width;
    dualSketchCanvasA.height = drawCanvas.height;
    Draw3DEngine.drawPresetSketch(dualSketchCanvasA, 'heart');

    dualSketchCanvasB = document.createElement('canvas');
    dualSketchCanvasB.width = drawCanvas.width;
    dualSketchCanvasB.height = drawCanvas.height;
    Draw3DEngine.drawPresetSketch(dualSketchCanvasB, 'star');

    showToast(I18N.t('toastPresetLoaded').replace('{name}', '💖 Heart ➔ ⭐ Star'), 'info');
    buildDraw3DModel(true);
  });

  safeOn('btn-draw3d-morph-preset-2', 'click', () => {
    if (!drawCanvas) return;
    dualSketchCanvasA = document.createElement('canvas');
    dualSketchCanvasA.width = drawCanvas.width;
    dualSketchCanvasA.height = drawCanvas.height;
    Draw3DEngine.drawPresetSketch(dualSketchCanvasA, 'teddy');

    dualSketchCanvasB = document.createElement('canvas');
    dualSketchCanvasB.width = drawCanvas.width;
    dualSketchCanvasB.height = drawCanvas.height;
    Draw3DEngine.drawPresetSketch(dualSketchCanvasB, 'spiral');

    showToast(I18N.t('toastPresetLoaded').replace('{name}', '🧸 Teddy ➔ 🌀 Spiral'), 'info');
    buildDraw3DModel(true);
  });

  // Color Swatches
  document.querySelectorAll('.draw3d-color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.draw3d-color-swatch').forEach(s => {
        s.style.borderColor = 'rgba(255,255,255,0.3)';
        s.classList.remove('active');
      });
      swatch.classList.add('active');
      swatch.style.borderColor = '#ffffff';
      currentDrawColor = swatch.dataset.color || '#00f0ff';
      currentDrawTool = 'pen';
      document.getElementById('btn-draw-tool-pen')?.classList.add('active');
      document.getElementById('btn-draw-tool-eraser')?.classList.remove('active');
      buildDraw3DModel(false);
    });
  });

  // Preset Sketches Picker
  document.querySelectorAll('.draw3d-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!drawCanvas) return;
      const preset = btn.dataset.preset || 'heart';
      drawnStrokePoints = Draw3DEngine.drawPresetSketch(drawCanvas, preset);
      buildDraw3DModel(true);
      showToast(I18N.t('toastSketchLoaded').replace('{name}', preset), 'info');
    });
  });

  // Mode Selection
  const drawModeSelect = document.getElementById('draw3d-mode-select');
  if (drawModeSelect) {
    drawModeSelect.addEventListener('change', () => {
      updateDraw3DSubpanels();
      buildDraw3DModel(true);
    });
  }

  // Dynamic Parameter Sliders & Selects
  const dynamicParamIds = [
    'draw3d-depth-slider', 'draw3d-tuberadius-slider', 'draw3d-tube-profile',
    'draw3d-4d-morph-type', 'draw3d-4d-speed-slider', 'draw3d-material-finish',
    'draw3d-keychain-base-slider', 'draw3d-keychain-relief-slider',
    'draw3d-keychain-shape', 'draw3d-keychain-ring-style', 'draw3d-keychain-base-color',
    'draw3d-ring-diam-slider', 'draw3d-ring-width-slider', 'draw3d-ring-relief-mode',
    'draw3d-litho-arc-slider', 'draw3d-litho-thick-slider',
    'draw3d-coin-diam-slider', 'draw3d-coin-reeds-slider', 'draw3d-coin-ribbon-toggle',
    'draw3d-origami-facet-slider',
    'draw3d-audio-preset',
    'draw3d-cookie-height-slider', 'draw3d-cookie-lip-slider',
    'draw3d-helix-turns-slider', 'draw3d-helix-strands',
    'draw3d-lathe-flutes-slider', 'draw3d-lathe-twist-slider'
  ];

  dynamicParamIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => buildDraw3DModel(false));
      el.addEventListener('change', () => buildDraw3DModel(false));
    }
  });

  // Value Labels Synchronization
  const bindSliderLabel = (sliderId, labelId, suffix = '') => {
    const s = document.getElementById(sliderId);
    const l = document.getElementById(labelId);
    if (s && l) s.addEventListener('input', (e) => l.textContent = `${e.target.value}${suffix}`);
  };

  bindSliderLabel('draw3d-depth-slider', 'draw3d-depth-val', 'mm');
  bindSliderLabel('draw3d-tuberadius-slider', 'draw3d-tuberadius-val', 'mm');
  bindSliderLabel('draw3d-4d-speed-slider', 'draw3d-4d-speed-val', 'x');
  bindSliderLabel('draw3d-keychain-base-slider', 'draw3d-keychain-base-val', 'mm');
  bindSliderLabel('draw3d-keychain-relief-slider', 'draw3d-keychain-relief-val', 'mm');
  bindSliderLabel('draw3d-ring-diam-slider', 'draw3d-ring-diam-val', 'mm');
  bindSliderLabel('draw3d-ring-width-slider', 'draw3d-ring-width-val', 'mm');
  bindSliderLabel('draw3d-litho-arc-slider', 'draw3d-litho-arc-val', '°');
  bindSliderLabel('draw3d-litho-thick-slider', 'draw3d-litho-thick-val', 'mm');
  bindSliderLabel('draw3d-coin-diam-slider', 'draw3d-coin-diam-val', 'mm');
  bindSliderLabel('draw3d-coin-reeds-slider', 'draw3d-coin-reeds-val', '');
  bindSliderLabel('draw3d-origami-facet-slider', 'draw3d-origami-facet-val', '');
  bindSliderLabel('draw3d-puzzle-explode-slider', 'draw3d-puzzle-explode-val', 'mm');
  bindSliderLabel('draw3d-cookie-height-slider', 'draw3d-cookie-height-val', 'mm');
  bindSliderLabel('draw3d-cookie-lip-slider', 'draw3d-cookie-lip-val', 'mm');
  bindSliderLabel('draw3d-helix-turns-slider', 'draw3d-helix-turns-val', 'x');
  bindSliderLabel('draw3d-lathe-flutes-slider', 'draw3d-lathe-flutes-val', '');
  bindSliderLabel('draw3d-lathe-twist-slider', 'draw3d-lathe-twist-val', '');

  // Puzzle Explode Slider Live Transform
  const puzzleSlider = document.getElementById('draw3d-puzzle-explode-slider');
  if (puzzleSlider) {
    puzzleSlider.addEventListener('input', (e) => {
      const dist = parseFloat(e.target.value);
      if (currentDrawModel && currentDrawModel.userData && typeof currentDrawModel.userData.setExplode === 'function') {
        currentDrawModel.userData.setExplode(dist);
      }
    });
  }

  // Kinetic Spinner Interactive Spin Button
  safeOn('btn-draw3d-spin-test', 'click', () => {
    if (currentDrawModel && currentDrawModel.userData) {
      currentDrawModel.userData.isSpinning = true;
      currentDrawModel.userData.spinSpeed = 35.0;
      startDraw4DAnimation();
      showToast(I18N.t('toastSpinnerSpin'), 'info');
    }
  });

  // Generate Button
  safeOn('btn-generate-draw3d', 'click', () => {
    buildDraw3DModel(true);
    showToast(I18N.t('toastDraw3DCreated'), 'success');
  });

  // Export 3D GLB
  safeOn('btn-export-draw3d-glb', 'click', () => {
    if (!currentDrawModel) {
      buildDraw3DModel(false);
    }
    const mode = document.getElementById('draw3d-mode-select')?.value || 'model';
    if (currentDrawModel) {
      state.loadedModel = currentDrawModel;
      state.currentFileName = `Draw3D_${mode}.glb`;
    }
    exportCurrentModel('glb', `Draw3D_${mode}`);
  });

  // Export 3D STL
  safeOn('btn-export-draw3d-stl', 'click', () => {
    if (!currentDrawModel) {
      buildDraw3DModel(false);
    }
    const mode = document.getElementById('draw3d-mode-select')?.value || 'model';
    if (currentDrawModel) {
      state.loadedModel = currentDrawModel;
      state.currentFileName = `Draw3D_${mode}.stl`;
    }
    exportCurrentModel('stl', `Draw3D_${mode}`);
  });

  // Export 3D Multi-Color .3MF
  safeOn('btn-export-draw3d-3mf', 'click', () => {
    if (!currentDrawModel) {
      buildDraw3DModel(false);
    }
    const mode = document.getElementById('draw3d-mode-select')?.value || 'model';
    if (currentDrawModel) {
      state.loadedModel = currentDrawModel;
      state.currentFileName = `Draw3D_${mode}.3mf`;
    }
    exportCurrentModel('3mf', `Draw3D_${mode}`);
  });

  // Export iOS USDZ
  safeOn('btn-export-draw3d-usdz', 'click', () => {
    if (!currentDrawModel) {
      buildDraw3DModel(false);
    }
    const mode = document.getElementById('draw3d-mode-select')?.value || 'model';
    if (currentDrawModel) {
      state.loadedModel = currentDrawModel;
      state.currentFileName = `Draw3D_${mode}.usdz`;
    }
    exportCurrentModel('usdz', `Draw3D_${mode}`);
  });

  // ----------------------------------------------------
  // AR Universe & Holograms Studio (Tab 5)
  // --------------------------------------------------------------------------
  let currentArModel = null;
  let arExplosionAnimId = null;
  let arLiveLoopId = null;
  let currentArScale = 1.0;

  function updateArSubpanels() {
    const exp = document.getElementById('ar-experience-select')?.value || 'portal_cyberpunk';
    const pnlExploded = document.getElementById('ar-subpanel-exploded');
    if (pnlExploded) {
      pnlExploded.style.display = exp.startsWith('exploded_') ? 'block' : 'none';
    }
  }

  function startArLiveAnimation() {
    if (arLiveLoopId) cancelAnimationFrame(arLiveLoopId);

    const tick = () => {
      if (currentArModel) {
        const time = performance.now() * 0.001;

        // 1. Planetarium orbits
        if (currentArModel.userData && currentArModel.userData.orbitObjects) {
          currentArModel.userData.orbitObjects.forEach(item => {
            if (item.node) item.node.rotation.y += (item.speed || 1.0) * 0.008;
            if (item.planetMesh) item.planetMesh.rotation.y += 0.02;
          });
        }
        // 2. Aquarium swimming fish
        if (currentArModel.userData && currentArModel.userData.fishObjects) {
          currentArModel.userData.fishObjects.forEach(f => {
            if (f.group) {
              const ang = time * f.speed + f.offset;
              f.group.position.x = Math.sin(ang) * f.radiusX;
              f.group.position.z = Math.cos(ang) * f.radiusZ;
              f.group.rotation.y = -ang - Math.PI / 2;
              f.group.position.y = f.baseY + Math.sin(time * 2 + f.offset) * 2;
            }
          });
        }
        // 3. Black hole accretion disk rotation & jet pulse
        if (currentArModel.userData && currentArModel.userData.blackHoleDisk) {
          currentArModel.userData.blackHoleDisk.rotation.z += 0.025;
          if (currentArModel.userData.plasmaJetTop) {
            const pulse = 1.0 + Math.sin(time * 6) * 0.15;
            currentArModel.userData.plasmaJetTop.scale.set(pulse, 1.0, pulse);
            if (currentArModel.userData.plasmaJetBottom) {
              currentArModel.userData.plasmaJetBottom.scale.set(pulse, 1.0, pulse);
            }
          }
        }
        // 4. Jet engine fan rotation
        if (currentArModel.userData && currentArModel.userData.jetFan) {
          currentArModel.userData.jetFan.rotation.z += 0.15;
        }
        // 5. Watch balance wheel high-frequency tick-tock oscillation
        if (currentArModel.userData && currentArModel.userData.balanceWheel) {
          currentArModel.userData.balanceWheel.rotation.y = Math.sin(time * 24) * 0.45;
        }
        // 6. Cyber hovercar floating bobbing
        if (currentArModel.userData && currentArModel.userData.hovercar) {
          currentArModel.userData.hovercar.position.y = currentArModel.userData.hovercarBaseY + Math.sin(time * 2) * 2.5;
          currentArModel.userData.hovercar.rotation.z = Math.sin(time * 1.5) * 0.03;
        }
        // 7. Stargate glyph ring slow rotation
        if (currentArModel.userData && currentArModel.userData.stargateRing) {
          currentArModel.userData.stargateRing.rotation.z += 0.006;
        }
      }
      arLiveLoopId = requestAnimationFrame(tick);
    };
    tick();
  }

  function buildARExperience3D(reframe = true) {
    if (!window.AREngine) return;

    const exp = document.getElementById('ar-experience-select')?.value || 'portal_cyberpunk';
    let modelGroup = null;

    if (exp.startsWith('portal_')) {
      const theme = exp.replace('portal_', '');
      modelGroup = AREngine.createARPortal(theme);
    } else if (exp.startsWith('planetarium_')) {
      const spaceType = exp.replace('planetarium_', '');
      modelGroup = AREngine.createARPlanetarium(spaceType, { scale: currentArScale });
    } else if (exp.startsWith('exploded_')) {
      const mechType = exp.replace('exploded_', '');
      const factor = parseFloat(document.getElementById('ar-explosion-slider')?.value || 0) / 100.0;
      modelGroup = AREngine.createARExplodedMechanism(mechType, { explosionFactor: factor });
    } else if (exp.startsWith('museum_')) {
      const pieceId = exp.replace('museum_', '');
      modelGroup = AREngine.createARMuseumPiece(pieceId);
    } else if (exp.startsWith('aquarium_') || exp.startsWith('diorama_')) {
      modelGroup = AREngine.createARLiveAquarium(exp);
    } else if (exp.startsWith('furniture_')) {
      const furnType = exp.replace('furniture_', '');
      modelGroup = AREngine.createARModernFurniture(furnType);
    }

    if (!modelGroup) return;

    // Apply scale preset
    if (currentArScale !== 1.0) {
      modelGroup.scale.set(currentArScale, currentArScale, currentArScale);
    }

    currentArModel = modelGroup;
    CADInspector.centerObject(modelGroup);
    CADInspector.autoGround(modelGroup);
    setModel(modelGroup, `AR_${exp}.glb`);

    startArLiveAnimation();

    if (reframe && viewer) viewer.fitCameraToModel();
  }

  // Category Selector Change
  const arExpSelect = document.getElementById('ar-experience-select');
  if (arExpSelect) {
    arExpSelect.addEventListener('change', () => {
      updateArSubpanels();
      buildARExperience3D(true);
    });
  }

  // Scale Preset Buttons
  document.querySelectorAll('.ar-scale-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ar-scale-preset').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentArScale = parseFloat(btn.dataset.scale || 1.0);
      buildARExperience3D(true);
    });
  });

  // Explosion Slider
  const arExplosionSlider = document.getElementById('ar-explosion-slider');
  const arExplosionVal = document.getElementById('ar-explosion-val');
  if (arExplosionSlider) {
    arExplosionSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (arExplosionVal) arExplosionVal.textContent = `${val}%`;
      if (currentArModel) {
        AREngine.setExplosionFactor(currentArModel, val / 100.0);
      }
    });
  }

  // Animated Continuous Explosion Toggle
  safeOn('btn-animate-explosion', 'click', () => {
    if (arExplosionAnimId) {
      cancelAnimationFrame(arExplosionAnimId);
      arExplosionAnimId = null;
      showToast(I18N.t('toastDisassemblyStop'), 'info');
      return;
    }
    let t = 0;
    const animate = () => {
      t += 0.02;
      const factor = (Math.sin(t) + 1) / 2; // 0.0 to 1.0
      if (currentArModel) {
        AREngine.setExplosionFactor(currentArModel, factor);
      }
      if (arExplosionSlider) arExplosionSlider.value = Math.round(factor * 100);
      if (arExplosionVal) arExplosionVal.textContent = `${Math.round(factor * 100)}%`;
      arExplosionAnimId = requestAnimationFrame(animate);
    };
    animate();
    showToast(I18N.t('toastDisassemblyContinuous'), 'success');
  });

  // Generate Button
  safeOn('btn-generate-ar-experience', 'click', () => {
    buildARExperience3D(true);
    showToast(I18N.t('toastArModelCreated'), 'success');
  });

  // Export AR GLB
  safeOn('btn-export-ar-glb', 'click', () => {
    if (!currentArModel && (!viewer || !viewer.currentModel)) {
      buildARExperience3D(false);
    }
    const exp = document.getElementById('ar-experience-select')?.value || 'ar_model';
    exportCurrentModel('glb', `AR_${exp}`);
  });

  // Export AR USDZ (iPhone / iPad QuickLook)
  safeOn('btn-export-ar-usdz', 'click', () => {
    if (!currentArModel && (!viewer || !viewer.currentModel)) {
      buildARExperience3D(false);
    }
    const exp = document.getElementById('ar-experience-select')?.value || 'ar_model';
    exportCurrentModel('usdz', `AR_${exp}`);
  });

  // Export AR STL (3D Print)
  safeOn('btn-export-ar-stl', 'click', () => {
    if (!currentArModel && (!viewer || !viewer.currentModel)) {
      buildARExperience3D(false);
    }
    const exp = document.getElementById('ar-experience-select')?.value || 'ar_model';
    exportCurrentModel('stl', `AR_${exp}`);
  });

  // Export Standalone AR Web Bundle (.ZIP)
  safeOn('btn-export-ar-bundle', 'click', async () => {
    if (!currentArModel && (!viewer || !viewer.currentModel)) {
      buildARExperience3D(false);
    }
    const model = state.loadedModel || (viewer && viewer.currentModel);
    if (!model || typeof JSZip === 'undefined') {
      showToast("Generating AR bundle...", 'info');
      return;
    }

    setLoading(true, "Packaging AR Web Bundle (.ZIP)...");
    try {
      const exp = document.getElementById('ar-experience-select')?.value || 'experience';
      const cleanName = `AR_${exp}`;
      
      const zip = new JSZip();

      // 1. Export GLB
      const glbRes = await ModelConverters.exportModel(model, 'glb', cleanName);
      zip.file(`${cleanName}.glb`, glbRes.blob);

      // 2. Export USDZ for Apple devices
      try {
        const usdzRes = await ModelConverters.exportModel(model, 'usdz', cleanName);
        zip.file(`${cleanName}.usdz`, usdzRes.blob);
      } catch (e) {
        console.warn("USDZ export skipped in bundle:", e);
      }

      // 3. Standalone HTML Viewer
      const htmlContent = AREngine.generateStandaloneARHtml(cleanName, `${cleanName}.glb`);
      zip.file('index.html', htmlContent);

      // 4. Instructions Readme
      const readme = `PolyMorph AR Studio - Offline & Online AR Bundle
==================================================
Model: ${cleanName}

HOW TO VIEW IN AUGMENTED REALITY (AR):

1. ON IPHONE / IPAD (Apple iOS):
   - Transfer the file "${cleanName}.usdz" to your iPhone via AirDrop, WhatsApp, or iCloud Drive.
   - Tap the file to instantly open full-screen 3D AR in your room (NO internet required!).

2. ON ANDROID / WEB:
   - Drag "${cleanName}.glb" onto https://modelviewer.dev/editor/ or https://sandbox.babylonjs.com/
   - Tap "View in your space" with your phone's camera!

3. HOST ONLINE (1-Click):
   - Upload this folder or index.html + .glb to Vercel, Netlify, or GitHub Pages.
`;
      zip.file('README_AR_INSTRUCTIONS.txt', readme);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      ModelConverters.triggerDownload(zipBlob, `${cleanName}_AR_Bundle.zip`);
      showToast("AR Web Bundle (.ZIP) downloaded!", 'success');
    } catch (err) {
      console.error(err);
      showToast("Error creating AR bundle: " + err.message, 'error');
    } finally {
      setLoading(false);
    }
  });

  // ----------------------------------------------------
  // Papercraft & Origami 3D Studio (Tab 8)
  // ----------------------------------------------------
  let currentPaperGeo = null;
  let currentUnfoldNet = null;
  let currentUnfoldRigGroup = null;
  let paperSvgPages = [];
  let currentPaperPageIdx = 0;
  let isPapercraftInitialized = false;

  function initPapercraftStudio() {
    if (isPapercraftInitialized) return;
    isPapercraftInitialized = true;
    buildPapercraft3D(true);
  }

  function buildPapercraft3D(recenter = true) {
    if (typeof PapercraftEngine === 'undefined') return;

    const presetName = document.getElementById('papercraft-preset-select')?.value || 'diamond_heart';
    const matType = document.getElementById('papercraft-mat-select')?.value || 'cardstock';
    const colorHex = document.getElementById('papercraft-color-picker')?.value || '#f8fafc';
    const pageSize = document.getElementById('papercraft-page-size')?.value || 'A4';
    const tabWidth = parseFloat(document.getElementById('papercraft-tab-width')?.value || '6.0');

    // 1. Get Base Geometry
    if (presetName === 'custom_loaded' && state.loadedModel) {
      let extractedGeo = null;
      state.loadedModel.traverse(c => {
        if (!extractedGeo && c.isMesh && c.geometry) {
          extractedGeo = c.geometry.clone();
        }
      });
      currentPaperGeo = extractedGeo || PapercraftEngine.getPresetGeometry('diamond_heart');
    } else {
      currentPaperGeo = PapercraftEngine.getPresetGeometry(presetName);
    }

    // 2. Unfold Mesh into 2D Papercraft Net
    currentUnfoldNet = PapercraftEngine.unfoldGeometry(currentPaperGeo, {
      tabWidth,
      pageSize,
      paperMargin: 15
    });

    // 3. Create Paper Material & 3D Morphing Rig
    const paperMat = PapercraftEngine.createPaperMaterial(matType, colorHex);
    currentUnfoldRigGroup = PapercraftEngine.createUnfoldRigGroup(currentUnfoldNet, paperMat);

    // Apply current slider value
    const sliderVal = parseInt(document.getElementById('papercraft-unfold-slider')?.value || '0', 10);
    PapercraftEngine.setUnfoldFactor(currentUnfoldRigGroup, sliderVal / 100);

    // 4. Update Stats
    const fcEl = document.getElementById('papercraft-face-count');
    const icEl = document.getElementById('papercraft-island-count');
    const pcEl = document.getElementById('papercraft-page-count');
    if (fcEl) fcEl.textContent = currentUnfoldNet.totalFaces;
    if (icEl) icEl.textContent = currentUnfoldNet.totalIslands;

    // 5. Generate 2D SVG Printable Sheets
    const modelCleanName = presetName.replace(/_/g, ' ').toUpperCase();
    paperSvgPages = PapercraftEngine.generateSVGSheets(currentUnfoldNet, {
      modelName: modelCleanName,
      pageSize,
      showTabNumbers: true
    });

    if (pcEl) pcEl.textContent = paperSvgPages.length;
    currentPaperPageIdx = 0;
    renderPaperSheetPreview();

    // 6. Display in Viewport
    setModel(currentUnfoldRigGroup, `Papercraft_${presetName}.glb`, recenter);
    if (recenter && viewer) {
      viewer.fitCameraToModel();
    }
  }

  function renderPaperSheetPreview() {
    const container = document.getElementById('papercraft-svg-preview-container');
    const indicator = document.getElementById('paper-page-indicator');
    if (!container || paperSvgPages.length === 0) return;

    if (currentPaperPageIdx < 0) currentPaperPageIdx = 0;
    if (currentPaperPageIdx >= paperSvgPages.length) currentPaperPageIdx = paperSvgPages.length - 1;

    const pageObj = paperSvgPages[currentPaperPageIdx];
    if (pageObj) {
      container.innerHTML = pageObj.svg;
      const svgEl = container.querySelector('svg');
      if (svgEl) {
        svgEl.style.width = '100%';
        svgEl.style.height = '175px';
        svgEl.style.display = 'block';
      }
    }
    if (indicator) {
      indicator.textContent = `Page ${currentPaperPageIdx + 1} / ${paperSvgPages.length}`;
    }
  }

  // Preset Selector
  safeOn('papercraft-preset-select', 'change', () => {
    buildPapercraft3D(true);
    const preset = document.getElementById('papercraft-preset-select')?.value || 'model';
    showToast(I18N.t('toastPaperModelLoaded', { name: preset }), 'info');
  });

  // Live Fold / Unfold Slider
  const paperUnfoldSlider = document.getElementById('papercraft-unfold-slider');
  const paperUnfoldVal = document.getElementById('papercraft-unfold-val');
  if (paperUnfoldSlider) {
    paperUnfoldSlider.addEventListener('input', (e) => {
      const v = parseInt(e.target.value, 10);
      if (paperUnfoldVal) {
        paperUnfoldVal.textContent = v === 0 ? '0% (3D)' : (v === 100 ? '100% (Flat)' : `${v}%`);
      }
      if (currentUnfoldRigGroup) {
        PapercraftEngine.setUnfoldFactor(currentUnfoldRigGroup, v / 100);
      }
    });
  }

  // Material & Color Changes
  safeOn('papercraft-mat-select', 'change', () => buildPapercraft3D(false));
  safeOn('papercraft-color-picker', 'input', () => buildPapercraft3D(false));
  safeOn('papercraft-page-size', 'change', () => buildPapercraft3D(false));
  safeOn('papercraft-tab-width', 'change', () => buildPapercraft3D(false));

  // 2D Preview Page Navigation
  safeOn('btn-paper-prev-page', 'click', () => {
    if (currentPaperPageIdx > 0) {
      currentPaperPageIdx--;
      renderPaperSheetPreview();
    }
  });

  safeOn('btn-paper-next-page', 'click', () => {
    if (currentPaperPageIdx < paperSvgPages.length - 1) {
      currentPaperPageIdx++;
      renderPaperSheetPreview();
    }
  });

  // Generate Button
  safeOn('btn-generate-papercraft', 'click', () => {
    buildPapercraft3D(true);
    showToast(I18N.t('toastPapercraftCreated'), 'success');
  });

  // Export 1: Printable SVG Sheets
  safeOn('btn-export-paper-svg', 'click', () => {
    if (!paperSvgPages || paperSvgPages.length === 0) {
      buildPapercraft3D(false);
    }
    const preset = document.getElementById('papercraft-preset-select')?.value || 'Papercraft';
    paperSvgPages.forEach((page, idx) => {
      const blob = new Blob([page.svg], { type: 'image/svg+xml;charset=utf-8' });
      ModelConverters.triggerDownload(blob, page.filename);
    });
    showToast(I18N.t('toastPaperSVGExported'), 'success');
  });

  // Export 2: Complete Papercraft Kit .ZIP
  safeOn('btn-export-paper-bundle', 'click', async () => {
    if (!paperSvgPages || paperSvgPages.length === 0) {
      buildPapercraft3D(false);
    }
    if (typeof JSZip === 'undefined') {
      showToast("Packaging Papercraft bundle...", 'info');
      return;
    }

    setLoading(true, "Creating Complete Papercraft Kit (.ZIP)...");
    try {
      const preset = document.getElementById('papercraft-preset-select')?.value || 'Papercraft_Sculpture';
      const cleanName = `Papercraft_${preset}`;
      const zip = new JSZip();

      // 1. Add all SVG sheets
      const sheetsFolder = zip.folder("Printable_SVG_Sheets");
      paperSvgPages.forEach(p => {
        sheetsFolder.file(p.filename, p.svg);
      });

      // 2. Add Low-Poly 3D GLB
      if (currentPaperGeo) {
        const scene = new THREE.Scene();
        scene.add(new THREE.Mesh(
          currentPaperGeo,
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0.05, side: THREE.DoubleSide })
        ));
        const glbRes = await ModelConverters.exportModel(scene, 'glb', cleanName);
        zip.file(`${cleanName}_LowPoly.glb`, glbRes.blob);
      }

      // 3. Add Standalone Interactive HTML Viewer
      if (currentPaperGeo && currentUnfoldNet) {
        const htmlBlob = await PapercraftEngine.generateStandalonePapercraftHTML(currentPaperGeo, currentUnfoldNet, cleanName);
        const htmlText = await htmlBlob.text();
        zip.file("3D_Interactive_Viewer.html", htmlText);
      }

      // 4. Add Assembly Guide README
      const readme = `=====================================================
PolyMorph 3D Studio — 3D Papercraft Assembly Kit
=====================================================
Model: ${cleanName}
Total Triangles: ${currentUnfoldNet?.totalFaces || 0}
Total Pages: ${paperSvgPages.length}

INSTRUCTIONS FOR ASSEMBLY:

1. PRINTING:
   - Print all SVG files from "Printable_SVG_Sheets" at 100% Scale (Actual Size / No Scaling) on 160–220 gsm cardstock.

2. FOLD LINE LEGEND:
   - Solid Black Lines (—)  : Cut with scissors or craft knife.
   - Red Dashed Lines (---) : Mountain fold (crease downwards).
   - Blue Dash-Dot Lines (-.-) : Valley fold (crease upwards).

3. GLUING:
   - Apply craft glue or double-sided tape on the glue tabs.
   - Match the number printed on each tab to the corresponding edge number.

4. 3D INTERACTIVE VIEWER:
   - Open "3D_Interactive_Viewer.html" in any browser to inspect the 3D model with the fold/unfold simulation slider!
`;
      zip.file("README_ASSEMBLY_GUIDE.txt", readme);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      ModelConverters.triggerDownload(zipBlob, `${cleanName}_Complete_Kit.zip`);
      showToast(I18N.t('toastPaperZipExported'), 'success');
    } catch (err) {
      console.error(err);
      showToast(I18N.t('toastErrorConvert') + err.message, 'error');
    } finally {
      setLoading(false);
    }
  });

  // Export 3: Standalone 3D HTML Viewer
  safeOn('btn-export-paper-html', 'click', async () => {
    if (!currentPaperGeo || !currentUnfoldNet) {
      buildPapercraft3D(false);
    }
    const preset = document.getElementById('papercraft-preset-select')?.value || 'Papercraft_Sculpture';
    setLoading(true, "Generating Standalone HTML 3D Viewer...");
    try {
      const htmlBlob = await PapercraftEngine.generateStandalonePapercraftHTML(currentPaperGeo, currentUnfoldNet, `Papercraft_${preset}`);
      ModelConverters.triggerDownload(htmlBlob, `Papercraft_${preset}_3D_viewer.html`);
      showToast(I18N.t('toastHTMLExported'), 'success');
    } catch (err) {
      console.error(err);
      showToast(I18N.t('toastErrorConvert') + err.message, 'error');
    } finally {
      setLoading(false);
    }
  });

  // Export 4: Low-Poly GLB
  safeOn('btn-export-paper-glb', () => {
    if (!currentPaperGeo) buildPapercraft3D(false);
    const preset = document.getElementById('papercraft-preset-select')?.value || 'Papercraft';
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(
      currentPaperGeo,
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0.05, side: THREE.DoubleSide })
    ));
    state.loadedModel = scene;
    state.currentFileName = `Papercraft_${preset}.glb`;
    exportCurrentModel('glb', `Papercraft_${preset}`);
  });

  // Export 5: Low-Poly STL
  safeOn('btn-export-paper-stl', () => {
    if (!currentPaperGeo) buildPapercraft3D(false);
    const preset = document.getElementById('papercraft-preset-select')?.value || 'Papercraft';
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(
      currentPaperGeo,
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0.05, side: THREE.DoubleSide })
    ));
    state.loadedModel = scene;
    state.currentFileName = `Papercraft_${preset}.stl`;
    exportCurrentModel('stl', `Papercraft_${preset}`);
  });

  // ----------------------------------------------------
  // Pure Origami Studio (Zero-Glue / Step-by-Step 3D Simulator)
  // ----------------------------------------------------
  let currentStudioMode = 'papercraft'; // 'papercraft' | 'origami'
  let currentOrigamiModelId = 'orizuru_crane';
  let currentOrigamiStepIdx = 0;
  let origamiMeshGroup = null;

  // Mode Switchers
  const btnModePapercraft = document.getElementById('btn-mode-papercraft');
  const btnModeOrigami = document.getElementById('btn-mode-origami');
  const papercraftSubpanel = document.getElementById('papercraft-subpanel');
  const origamiSubpanel = document.getElementById('origami-subpanel');

  if (btnModePapercraft && btnModeOrigami) {
    btnModePapercraft.addEventListener('click', () => {
      currentStudioMode = 'papercraft';
      btnModePapercraft.className = 'btn btn-primary btn-sm';
      btnModeOrigami.className = 'btn btn-secondary btn-sm';
      btnModeOrigami.style.borderColor = 'rgba(99, 102, 241, 0.4)';
      btnModeOrigami.style.color = '#a5b4fc';
      if (papercraftSubpanel) papercraftSubpanel.style.display = 'block';
      if (origamiSubpanel) origamiSubpanel.style.display = 'none';
      buildPapercraft3D(true);
    });

    btnModeOrigami.addEventListener('click', () => {
      currentStudioMode = 'origami';
      btnModeOrigami.className = 'btn btn-primary btn-sm';
      btnModeOrigami.style.background = 'linear-gradient(135deg, #6366f1, #8b5cf6)';
      btnModeOrigami.style.border = 'none';
      btnModeOrigami.style.color = '#ffffff';
      btnModePapercraft.className = 'btn btn-secondary btn-sm';
      if (papercraftSubpanel) papercraftSubpanel.style.display = 'none';
      if (origamiSubpanel) origamiSubpanel.style.display = 'block';
      buildOrigami3D(true);
    });
  }

  function buildOrigami3D(recenter = true) {
    if (typeof PapercraftEngine === 'undefined') return;

    const selectEl = document.getElementById('origami-model-select');
    if (selectEl) {
      currentOrigamiModelId = selectEl.value;
    }

    const model = PapercraftEngine.ORIGAMI_MODELS[currentOrigamiModelId] || PapercraftEngine.ORIGAMI_MODELS.orizuru_crane;
    if (currentOrigamiStepIdx >= model.steps.length) currentOrigamiStepIdx = model.steps.length - 1;
    if (currentOrigamiStepIdx < 0) currentOrigamiStepIdx = 0;

    // 1. Generate 3D Step Mesh
    const geom = PapercraftEngine.getOrigamiStepMesh(currentOrigamiModelId, currentOrigamiStepIdx);
    const paperMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.85,
      metalness: 0.05,
      side: THREE.DoubleSide
    });

    origamiMeshGroup = new THREE.Group();
    origamiMeshGroup.name = `Origami_${currentOrigamiModelId}_Step_${currentOrigamiStepIdx + 1}`;
    const mesh = new THREE.Mesh(geom, paperMat);
    const wire = new THREE.LineSegments(
      new THREE.WireframeGeometry(geom),
      new THREE.LineBasicMaterial({ color: 0x6366f1, linewidth: 1.5, transparent: true, opacity: 0.8 })
    );
    mesh.add(wire);
    origamiMeshGroup.add(mesh);

    // 2. Display in 3D Viewport
    setModel(origamiMeshGroup, `Origami_${currentOrigamiModelId}.glb`, recenter);
    if (recenter && viewer) {
      viewer.fitCameraToModel();
    }

    // 3. Update Step Info Card
    const currentStep = model.steps[currentOrigamiStepIdx];
    const badgeEl = document.getElementById('origami-step-badge');
    const titleEl = document.getElementById('origami-step-title');
    const descEl = document.getElementById('origami-step-desc');

    const isFr = I18N.currentLang === 'fr';
    if (badgeEl) {
      badgeEl.textContent = isFr 
        ? `Étape ${currentOrigamiStepIdx + 1} sur ${model.steps.length}` 
        : `Step ${currentOrigamiStepIdx + 1} of ${model.steps.length}`;
    }
    if (titleEl) {
      titleEl.textContent = isFr ? `Étape ${currentStep.num} : ${currentStep.titleFr}` : `Step ${currentStep.num}: ${currentStep.titleEn}`;
    }
    if (descEl) {
      descEl.textContent = isFr ? currentStep.descFr : currentStep.descEn;
    }

    // 4. Render 2D Crease Pattern Preview
    renderOrigamiCPPreview();
  }

  function renderOrigamiCPPreview() {
    const container = document.getElementById('origami-cp-preview-container');
    if (!container || typeof PapercraftEngine === 'undefined') return;

    const cpSvg = PapercraftEngine.generateCreasePatternSVG(currentOrigamiModelId);
    container.innerHTML = cpSvg;
    const svgEl = container.querySelector('svg');
    if (svgEl) {
      svgEl.style.width = '100%';
      svgEl.style.height = '175px';
      svgEl.style.display = 'block';
    }
  }

  // Origami Model Select
  safeOn('origami-model-select', 'change', () => {
    currentOrigamiStepIdx = 0;
    buildOrigami3D(true);
    const model = PapercraftEngine.ORIGAMI_MODELS[currentOrigamiModelId];
    showToast(I18N.t('toastPaperModelLoaded', { name: model ? model.name : 'Origami' }), 'info');
  });

  // Step-by-Step Navigation Buttons
  safeOn('btn-origami-first', 'click', () => {
    currentOrigamiStepIdx = 0;
    buildOrigami3D(false);
  });

  safeOn('btn-origami-prev', 'click', () => {
    if (currentOrigamiStepIdx > 0) {
      currentOrigamiStepIdx--;
      buildOrigami3D(false);
    }
  });

  safeOn('btn-origami-next', 'click', () => {
    const model = PapercraftEngine.ORIGAMI_MODELS[currentOrigamiModelId] || PapercraftEngine.ORIGAMI_MODELS.orizuru_crane;
    if (currentOrigamiStepIdx < model.steps.length - 1) {
      currentOrigamiStepIdx++;
      buildOrigami3D(false);
    }
  });

  safeOn('btn-origami-final', 'click', () => {
    const model = PapercraftEngine.ORIGAMI_MODELS[currentOrigamiModelId] || PapercraftEngine.ORIGAMI_MODELS.orizuru_crane;
    currentOrigamiStepIdx = model.steps.length - 1;
    buildOrigami3D(false);
  });

  // Origami Export 1: Crease Pattern (CP)
  safeOn('btn-export-origami-cp', () => {
    const model = PapercraftEngine.ORIGAMI_MODELS[currentOrigamiModelId] || PapercraftEngine.ORIGAMI_MODELS.orizuru_crane;
    const cpSvg = PapercraftEngine.generateCreasePatternSVG(currentOrigamiModelId);
    const blob = new Blob([cpSvg], { type: 'image/svg+xml;charset=utf-8' });
    ModelConverters.triggerDownload(blob, `${currentOrigamiModelId}_Crease_Pattern_CP.svg`);
    showToast(I18N.t('toastCPExported'), 'success');
  });

  // Origami Export 2: Step Diagram (SVG)
  safeOn('btn-export-origami-diagram', () => {
    const model = PapercraftEngine.ORIGAMI_MODELS[currentOrigamiModelId] || PapercraftEngine.ORIGAMI_MODELS.orizuru_crane;
    const diagramSvg = PapercraftEngine.generateStepDiagramSVG(currentOrigamiModelId);
    const blob = new Blob([diagramSvg], { type: 'image/svg+xml;charset=utf-8' });
    ModelConverters.triggerDownload(blob, `${currentOrigamiModelId}_Step_Diagram.svg`);
    showToast(I18N.t('toastDiagramExported'), 'success');
  });

  // Origami Export 3: Standalone 3D Folding Player (HTML)
  safeOn('btn-export-origami-html', async () => {
    const model = PapercraftEngine.ORIGAMI_MODELS[currentOrigamiModelId] || PapercraftEngine.ORIGAMI_MODELS.orizuru_crane;
    setLoading(true, "Generating Standalone 3D Origami Player...");
    try {
      const htmlBlob = await PapercraftEngine.generateStandaloneOrigamiHTML(currentOrigamiModelId, model.name);
      ModelConverters.triggerDownload(htmlBlob, `${currentOrigamiModelId}_3D_Folding_Player.html`);
      showToast(I18N.t('toastHTMLExported'), 'success');
    } catch (err) {
      console.error(err);
      showToast(I18N.t('toastErrorConvert') + err.message, 'error');
    } finally {
      setLoading(false);
    }
  });

  // Origami Export 4: Complete Origami Kit (.ZIP)
  safeOn('btn-export-origami-bundle', async () => {
    const model = PapercraftEngine.ORIGAMI_MODELS[currentOrigamiModelId] || PapercraftEngine.ORIGAMI_MODELS.orizuru_crane;
    if (typeof JSZip === 'undefined') {
      showToast("Packaging Origami bundle...", 'info');
      return;
    }

    setLoading(true, "Creating Complete Origami Kit (.ZIP)...");
    try {
      const zip = new JSZip();

      // 1. Add Crease Pattern SVG
      const cpSvg = PapercraftEngine.generateCreasePatternSVG(currentOrigamiModelId);
      zip.file(`${currentOrigamiModelId}_Crease_Pattern_CP.svg`, cpSvg);

      // 2. Add Step Diagram SVG
      const diagramSvg = PapercraftEngine.generateStepDiagramSVG(currentOrigamiModelId);
      zip.file(`${currentOrigamiModelId}_Step_Diagram_Guide.svg`, diagramSvg);

      // 3. Add Standalone Interactive 3D HTML Player
      const htmlBlob = await PapercraftEngine.generateStandaloneOrigamiHTML(currentOrigamiModelId, model.name);
      const htmlText = await htmlBlob.text();
      zip.file("3D_Origami_Folding_Player.html", htmlText);

      // 4. Add Final Model GLB
      const finalGeom = PapercraftEngine.getOrigamiStepMesh(currentOrigamiModelId, model.steps.length - 1);
      const scene = new THREE.Scene();
      scene.add(new THREE.Mesh(
        finalGeom,
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0.05, side: THREE.DoubleSide })
      ));
      const glbRes = await ModelConverters.exportModel(scene, 'glb', currentOrigamiModelId);
      zip.file(`${currentOrigamiModelId}_Final_Model.glb`, glbRes.blob);

      // 5. Add Instructions README
      const readme = `=====================================================
PolyMorph 3D Studio — Pure Origami (Zero-Glue) Kit
=====================================================
Model: ${model.name}
Difficulty: ${model.difficulty}
Total Folding Steps: ${model.steps.length}
Sheet Type: 1:1 Kami Square (No scissors or glue needed)

INCLUDED FILES:
1. "${currentOrigamiModelId}_Crease_Pattern_CP.svg":
   - Print at 100% Scale on a standard square paper sheet.
   - Red lines = Mountain Folds (peaks up).
   - Blue lines = Valley Folds (valleys down).

2. "${currentOrigamiModelId}_Step_Diagram_Guide.svg":
   - Illustrated step-by-step diagram following Yoshizawa–Randlett standard.

3. "3D_Origami_Folding_Player.html":
   - Open in any web browser to view the step-by-step 3D folding animation!

4. "${currentOrigamiModelId}_Final_Model.glb":
   - 3D file of the completed folded origami sculpture.
`;
      zip.file("README_ORIGAMI_GUIDE.txt", readme);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      ModelConverters.triggerDownload(zipBlob, `${currentOrigamiModelId}_Origami_Kit.zip`);
      showToast(I18N.t('toastOrigamiBundleExported'), 'success');
    } catch (err) {
      console.error(err);
      showToast(I18N.t('toastErrorConvert') + err.message, 'error');
    } finally {
      setLoading(false);
    }
  });

  // ----------------------------------------------------
  // Tab 9: 🧩 3D Puzzle, Voxel & LEGO® Studio
  // ----------------------------------------------------
  let isPuzzleStudioInitialized = false;
  let currentPuzzleMode = 'jigsaw'; // 'jigsaw' | 'lego' | 'burr'
  let currentPuzzleData = null;
  let currentLegoData = null;
  let currentBurrData = null;
  let currentPuzzleGroup = null;

  function initPuzzleStudio() {
    if (isPuzzleStudioInitialized) return;
    isPuzzleStudioInitialized = true;
    buildJigsaw3D(true);
  }

  // Mode Switchers
  const btnModeJigsaw = document.getElementById('btn-mode-jigsaw');
  const btnModeBricks = document.getElementById('btn-mode-bricks');
  const btnModeBurr = document.getElementById('btn-mode-burr');
  const puzzleJigsawSubpanel = document.getElementById('puzzle-jigsaw-subpanel');
  const puzzleBricksSubpanel = document.getElementById('puzzle-bricks-subpanel');
  const puzzleBurrSubpanel = document.getElementById('puzzle-burr-subpanel');
  let currentBrickData = null;

  function updatePuzzleModeUI(mode) {
    currentPuzzleMode = mode;
    if (btnModeJigsaw && btnModeBricks && btnModeBurr) {
      btnModeJigsaw.className = mode === 'jigsaw' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
      btnModeBricks.className = mode === 'bricks' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
      btnModeBurr.className = mode === 'burr' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';

      if (mode === 'bricks') {
        btnModeBricks.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
        btnModeBricks.style.border = 'none';
        btnModeBricks.style.color = '#ffffff';
      } else {
        btnModeBricks.style.background = '';
        btnModeBricks.style.border = '1px solid rgba(245, 158, 11, 0.4)';
        btnModeBricks.style.color = '#fbbf24';
      }

      if (mode === 'burr') {
        btnModeBurr.style.background = 'linear-gradient(135deg, #d97706, #92400e)';
        btnModeBurr.style.border = 'none';
        btnModeBurr.style.color = '#ffffff';
      } else {
        btnModeBurr.style.background = '';
        btnModeBurr.style.border = '1px solid rgba(217, 119, 6, 0.4)';
        btnModeBurr.style.color = '#d97706';
      }
    }

    if (puzzleJigsawSubpanel) puzzleJigsawSubpanel.style.display = mode === 'jigsaw' ? 'block' : 'none';
    if (puzzleBricksSubpanel) puzzleBricksSubpanel.style.display = mode === 'bricks' ? 'block' : 'none';
    if (puzzleBurrSubpanel) puzzleBurrSubpanel.style.display = mode === 'burr' ? 'block' : 'none';

    // Adapt the Export Suite controls to current active mode
    const exportZipBtn = document.getElementById('btn-export-puzzle-zip');
    const exportSingleBtn = document.getElementById('btn-export-single-brick');
    const exportPlateBtn = document.getElementById('btn-export-plate-bricks');
    const exportManualBtn = document.getElementById('btn-export-lego-manual');
    const exportSuiteTitle = document.getElementById('puzzle-export-suite-title');

    if (mode === 'jigsaw') {
      if (exportSuiteTitle) exportSuiteTitle.textContent = "📦 3D Jigsaw Puzzle Export Suite:";
      if (exportZipBtn) exportZipBtn.textContent = "📦 All Pieces (.ZIP)";
      if (exportSingleBtn) exportSingleBtn.textContent = "🧩 Isolated Piece (.STL)";
      if (exportPlateBtn) exportPlateBtn.style.display = 'none';
      if (exportManualBtn) exportManualBtn.style.display = 'none';
    } else if (mode === 'burr') {
      if (exportSuiteTitle) exportSuiteTitle.textContent = "📦 6-Bar Burr Puzzle Export Suite:";
      if (exportZipBtn) exportZipBtn.textContent = "📦 All 6 Bars (.ZIP)";
      if (exportSingleBtn) exportSingleBtn.textContent = "🪵 Key Slider Bar (.STL)";
      if (exportPlateBtn) exportPlateBtn.style.display = 'none';
      if (exportManualBtn) exportManualBtn.style.display = 'none';
    } else {
      if (exportSuiteTitle) exportSuiteTitle.textContent = "📦 MorphoBricks™ Export Suite:";
      if (exportZipBtn) exportZipBtn.textContent = "📦 Complete Print Kit (.ZIP)";
      if (exportSingleBtn) exportSingleBtn.textContent = "🧱 Single Block (.STL)";
      if (exportPlateBtn) exportPlateBtn.style.display = 'inline-block';
      if (exportManualBtn) exportManualBtn.style.display = 'inline-block';
    }
  }

  if (btnModeJigsaw) btnModeJigsaw.addEventListener('click', () => { updatePuzzleModeUI('jigsaw'); buildJigsaw3D(true); });
  if (btnModeBricks) btnModeBricks.addEventListener('click', () => { updatePuzzleModeUI('bricks'); buildBricks3D(true); });
  if (btnModeBurr) btnModeBurr.addEventListener('click', () => { updatePuzzleModeUI('burr'); buildBurr3D(true); });

  // Mode 1: Build 3D Jigsaw
  function buildJigsaw3D(recenter = true) {
    if (typeof PuzzleEngine === 'undefined') return;

    const preset = document.getElementById('puzzle-preset-select')?.value || 'puzzle_sphere';
    const gridVal = document.getElementById('puzzle-grid-select')?.value || '2x2x2';
    const [dx, dy, dz] = gridVal.split('x').map(Number);
    const connType = document.getElementById('puzzle-connector-select')?.value || 'none';

    let geom;
    if (preset === 'custom_loaded' && state.loadedModel) {
      let extracted = null;
      state.loadedModel.traverse(c => {
        if (!extracted && c.isMesh && c.geometry) extracted = c.geometry.clone();
      });
      geom = extracted || PuzzleEngine.getPresetGeometry('puzzle_sphere');
    } else {
      geom = PuzzleEngine.getPresetGeometry(preset);
    }

    currentPuzzleData = PuzzleEngine.generateJigsawPuzzle(geom, {
      divisionX: dx,
      divisionY: dy,
      divisionZ: dz,
      connectorType: connType
    });

    currentPuzzleGroup = new THREE.Group();
    currentPuzzleGroup.name = "3D_Jigsaw_Puzzle_Group";
    currentPuzzleData.pieces.forEach(p => currentPuzzleGroup.add(p.mesh));

    // Populate Piece Isolator Select
    const isolateSel = document.getElementById('puzzle-piece-isolate');
    if (isolateSel) {
      isolateSel.innerHTML = '<option value="all">👁️ Show All Pieces (Full Puzzle)</option>';
      currentPuzzleData.pieces.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `🧩 Piece #${p.id} (${p.trianglesCount} faces)`;
        isolateSel.appendChild(opt);
      });
    }

    // Reset Exploded slider
    const explodeSlider = document.getElementById('puzzle-explode-slider');
    const explodeVal = document.getElementById('puzzle-explode-val');
    if (explodeSlider) explodeSlider.value = 0;
    if (explodeVal) explodeVal.textContent = '0%';

    setModel(currentPuzzleGroup, `Puzzle_${preset}.glb`, recenter);
    if (recenter && viewer) viewer.fitCameraToModel();
  }

  // Exploded View Slider Handler
  const puzzleExplodeSlider = document.getElementById('puzzle-explode-slider');
  const puzzleExplodeVal = document.getElementById('puzzle-explode-val');
  if (puzzleExplodeSlider) {
    puzzleExplodeSlider.addEventListener('input', (e) => {
      const v = parseInt(e.target.value, 10);
      if (puzzleExplodeVal) {
        puzzleExplodeVal.textContent = v === 0 ? '0% (Assembled)' : (v === 100 ? '100% (Full Space)' : `${v}%`);
      }
      if (currentPuzzleGroup) {
        PuzzleEngine.setPuzzleExplodedFactor(currentPuzzleGroup, v / 100);
      }
    });
  }

  // Piece Isolator Change Handler
  safeOn('puzzle-piece-isolate', 'change', () => {
    const val = document.getElementById('puzzle-piece-isolate')?.value;
    if (!currentPuzzleGroup) return;
    currentPuzzleGroup.traverse(child => {
      if (child.isMesh && child.userData && child.userData.id) {
        child.visible = val === 'all' || child.userData.id === parseInt(val, 10);
      }
    });
  });

  safeOn('puzzle-preset-select', 'change', () => buildJigsaw3D(true));
  safeOn('puzzle-grid-select', 'change', () => buildJigsaw3D(false));
  safeOn('puzzle-connector-select', 'change', () => buildJigsaw3D(false));
  safeOn('btn-generate-puzzle', 'click', () => {
    buildJigsaw3D(true);
    showToast(I18N.t('toastPuzzleGenerated', { count: currentPuzzleData?.totalPieces || 8 }), 'success');
  });

  // Mode 2: Build MorphoBricks™ Model
  function buildBricks3D(recenter = true) {
    if (typeof PuzzleEngine === 'undefined') return;

    const system = document.getElementById('brick-system-select')?.value || 'morphobricks';
    const preset = document.getElementById('brick-preset-select')?.value || 'puzzle_sphere';
    const resolution = parseInt(document.getElementById('brick-resolution-select')?.value || '14', 10);
    const colorMode = document.getElementById('brick-color-mode')?.value || 'palette';

    let geom;
    if (preset === 'custom_loaded' && state.loadedModel) {
      let extracted = null;
      state.loadedModel.traverse(c => {
        if (!extracted && c.isMesh && c.geometry) extracted = c.geometry.clone();
      });
      geom = extracted || PuzzleEngine.getPresetGeometry('puzzle_sphere');
    } else {
      geom = PuzzleEngine.getPresetGeometry(preset);
    }

    currentBrickData = PuzzleEngine.voxelizeToBricks(geom, {
      system,
      brickResolution: resolution,
      colorMode
    });

    // Update BOM Stats Card
    const tbEl = document.getElementById('brick-total-count');
    const tsEl = document.getElementById('brick-total-pins');
    const tlEl = document.getElementById('brick-total-layers');
    if (tbEl) tbEl.textContent = currentBrickData.bomCounts.totalBricks;
    if (tsEl) tsEl.textContent = currentBrickData.bomCounts.totalStuds;
    if (tlEl) tlEl.textContent = currentBrickData.totalLayers;

    // Update Layer Slider
    const layerSlider = document.getElementById('brick-layer-slider');
    const layerVal = document.getElementById('brick-layer-val');
    if (layerSlider) {
      layerSlider.min = 1;
      layerSlider.max = currentBrickData.totalLayers;
      layerSlider.value = currentBrickData.totalLayers;
    }
    if (layerVal) {
      layerVal.textContent = `Layer ${currentBrickData.totalLayers} / ${currentBrickData.totalLayers}`;
    }

    setModel(currentBrickData.group, `${system}_${preset}.glb`, recenter);
    if (recenter && viewer) viewer.fitCameraToModel();
  }

  // Brick Layer Slider Handler
  const brickLayerSlider = document.getElementById('brick-layer-slider');
  const brickLayerVal = document.getElementById('brick-layer-val');
  if (brickLayerSlider) {
    brickLayerSlider.addEventListener('input', (e) => {
      const v = parseInt(e.target.value, 10);
      if (brickLayerVal && currentBrickData) {
        brickLayerVal.textContent = `Layer ${v} / ${currentBrickData.totalLayers}`;
      }
      if (currentBrickData) {
        PuzzleEngine.setBrickLayerVisible(currentBrickData.group, v);
      }
    });
  }

  safeOn('brick-system-select', 'change', () => buildBricks3D(true));
  safeOn('brick-preset-select', 'change', () => buildBricks3D(true));
  safeOn('brick-resolution-select', 'change', () => buildBricks3D(false));
  safeOn('brick-color-mode', 'change', () => buildBricks3D(false));
  safeOn('btn-generate-bricks', 'click', () => {
    buildBricks3D(true);
    const sysName = PuzzleEngine.BRICK_SYSTEMS[currentBrickData?.system]?.name || 'MorphoBricks™';
    showToast(I18N.t('toastBricksGenerated', {
      bricks: currentBrickData?.bomCounts.totalBricks || 100,
      system: sysName,
      layers: currentBrickData?.totalLayers || 14
    }), 'success');
  });

  // Mode 3: Build Burr Puzzle
  function buildBurr3D(recenter = true) {
    if (typeof PuzzleEngine === 'undefined') return;

    currentBurrData = PuzzleEngine.generateBurrPuzzle();
    const unlockSlider = document.getElementById('burr-unlock-slider');
    const unlockVal = document.getElementById('burr-unlock-val');
    if (unlockSlider) unlockSlider.value = 0;
    if (unlockVal) unlockVal.textContent = '0% (Locked)';

    setModel(currentBurrData.group, `Japanese_Burr_Puzzle.glb`, recenter);
    if (recenter && viewer) viewer.fitCameraToModel();
  }

  // Burr Unlock Slider Handler
  const burrUnlockSlider = document.getElementById('burr-unlock-slider');
  const burrUnlockVal = document.getElementById('burr-unlock-val');
  if (burrUnlockSlider) {
    burrUnlockSlider.addEventListener('input', (e) => {
      const v = parseInt(e.target.value, 10);
      if (burrUnlockVal) {
        burrUnlockVal.textContent = v === 0 ? '0% (Locked)' : (v === 100 ? '100% (Disassembled)' : `${v}%`);
      }
      if (currentBurrData) {
        PuzzleEngine.setBurrPuzzleDisassembly(currentBurrData.group, v / 100);
      }
    });
  }

  safeOn('btn-generate-burr', 'click', () => {
    buildBurr3D(true);
    showToast("Japanese 6-Bar Burr Puzzle loaded!", 'info');
  });

  // ----------------------------------------------------
  // Tab 9 Export Suite Handlers
  // ----------------------------------------------------

  // Export 1: Complete Print Kit (.ZIP)
  safeOn('btn-export-puzzle-zip', async () => {
    if (typeof JSZip === 'undefined') {
      showToast("Packaging kit...", 'info');
      return;
    }

    setLoading(true, "Packaging complete 3D print kit (.ZIP)...");
    try {
      const zip = new JSZip();

      if (currentPuzzleMode === 'jigsaw') {
        if (!currentPuzzleData) buildJigsaw3D(false);
        for (const p of currentPuzzleData.pieces) {
          const pieceScene = new THREE.Scene();
          const cleanGeo = p.geometry.index ? p.geometry.toNonIndexed() : p.geometry.clone();
          pieceScene.add(new THREE.Mesh(
            cleanGeo,
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, side: THREE.DoubleSide })
          ));
          const stlRes = await ModelConverters.exportModel(pieceScene, 'stl', `Puzzle_Piece_${p.id}`);
          zip.file(`Piece_${p.id}.stl`, stlRes.blob);
        }

        const readme = `=====================================================
PolyMorph 3D Studio — 3D Interlocking Puzzle Print Kit
=====================================================
Total Pieces: ${currentPuzzleData.totalPieces}
Divisions: ${currentPuzzleData.divisions.x} × ${currentPuzzleData.divisions.y} × ${currentPuzzleData.divisions.z}
Connector Type: ${currentPuzzleData.connectorType}

PRINTING RECOMMENDATIONS:
- Print each .stl piece with 0.2mm layer height and 15–20% infill.
- 0.25mm connector tolerance has been applied for seamless interlocking!
`;
        zip.file("README_PUZZLE.txt", readme);
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        ModelConverters.triggerDownload(zipBlob, `3D_Puzzle_Printable_Pieces.zip`);
      } else if (currentPuzzleMode === 'burr') {
        if (!currentBurrData) buildBurr3D(false);
        for (const b of currentBurrData.bars) {
          const barScene = new THREE.Scene();
          const cleanGeo = b.geometry.index ? b.geometry.toNonIndexed() : b.geometry.clone();
          barScene.add(new THREE.Mesh(
            cleanGeo,
            new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.5, side: THREE.DoubleSide })
          ));
          const stlRes = await ModelConverters.exportModel(barScene, 'stl', `Burr_Bar_${b.id}`);
          zip.file(`Bar_${b.id}_${b.keyBar ? 'KEY_SLIDER' : 'NOTCHED'}.stl`, stlRes.blob);
        }
        zip.file("README_BURR.txt", "Print all 6 wooden bars. Bar #1 is the sliding key that unlocks the puzzle!");
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        ModelConverters.triggerDownload(zipBlob, `Japanese_Burr_Puzzle_Kit.zip`);
      } else if (currentPuzzleMode === 'bricks') {
        if (!currentBrickData) buildBricks3D(false);
        const sys = currentBrickData?.system || document.getElementById('brick-system-select')?.value || 'morphobricks';
        const sysObj = PuzzleEngine.BRICK_SYSTEMS[sys] || PuzzleEngine.BRICK_SYSTEMS.morphobricks;

        // 1. Solid Complete Sculpture STL
        const fullScene = new THREE.Scene();
        fullScene.add(new THREE.Mesh(
          currentBrickData.solidMergedGeometry,
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, side: THREE.DoubleSide })
        ));
        const fullStl = await ModelConverters.exportModel(fullScene, 'stl', `${sysObj.name}_Complete_Sculpture`);
        zip.file(`${sysObj.name}_Complete_Sculpture.stl`, fullStl.blob);

        // 2. Individual Printable Modular Blocks
        const types = ['1x1', '1x2', '2x2', '2x4'];
        for (const t of types) {
          const bGeo = PuzzleEngine.generateSingleBrickGeometry(sys, t, 10);
          const bScene = new THREE.Scene();
          bScene.add(new THREE.Mesh(bGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, side: THREE.DoubleSide })));
          const bStl = await ModelConverters.exportModel(bScene, 'stl', `Single_Block_${t}`);
          zip.file(`Single_Block_${t}.stl`, bStl.blob);
        }

        // 3. Pre-arranged Build Plate of 50 Blocks
        const plateGeo = PuzzleEngine.generatePrintPlateGeometry(sys, 50, 10);
        const plateScene = new THREE.Scene();
        plateScene.add(new THREE.Mesh(plateGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, side: THREE.DoubleSide })));
        const plateStl = await ModelConverters.exportModel(plateScene, 'stl', `Print_Plate_50_Blocks`);
        zip.file(`Print_Plate_50_Blocks.stl`, plateStl.blob);

        // 4. Building Guide SVG & Documentation
        const guideSvg = PuzzleEngine.generateBrickInstructionsSVG(currentBrickData, "Sculpture");
        zip.file("Building_Guide.svg", guideSvg);

        const readme = `===================================================================
PolyMorph 3D Studio — ${sysObj.name} Print & Build Kit
===================================================================
System: ${sysObj.name} (${sysObj.feature})
Total Blocks in Sculpture: ${currentBrickData.bomCounts.totalBricks}
Total Layers: ${currentBrickData.totalLayers}

INCLUDED 3D PRINTING FILES:
1. "${sysObj.name}_Complete_Sculpture.stl"
   -> 100% Watertight solid single mesh of the complete assembled sculpture.

2. "Single_Block_1x1.stl", "Single_Block_1x2.stl", "Single_Block_2x2.stl", "Single_Block_2x4.stl"
   -> Individual modular blocks to 3D print in your favorite filament colors!

3. "Print_Plate_50_Blocks.stl"
   -> Pre-arranged 3D print bed containing 50 blocks ready to print simultaneously.

4. "Building_Guide.svg"
   -> Illustrated layer-by-layer assembly diagram.

PRINT SETTINGS:
- Layer Height: 0.2mm
- Infill: 15-20%
- Shells/Perimeters: 3
`;
        zip.file("README_PRINTING_GUIDE.txt", readme);

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        ModelConverters.triggerDownload(zipBlob, `${sysObj.name}_Complete_Print_Kit.zip`);
      }

      showToast(I18N.t('toastPuzzleZipExported'), 'success');
    } catch (err) {
      console.error(err);
      showToast(I18N.t('toastErrorConvert') + err.message, 'error');
    } finally {
      setLoading(false);
    }
  });

  // Export 2: Single Piece / Single Block STL Direct Download
  safeOn('btn-export-single-brick', async () => {
    if (currentPuzzleMode === 'jigsaw') {
      if (!currentPuzzleData) buildJigsaw3D(false);
      const isolateVal = document.getElementById('puzzle-piece-isolate')?.value;
      let targetPiece = currentPuzzleData.pieces[0];
      if (isolateVal && isolateVal !== 'all') {
        const found = currentPuzzleData.pieces.find(p => p.id === parseInt(isolateVal, 10));
        if (found) targetPiece = found;
      }

      setLoading(true, `Exporting Puzzle Piece #${targetPiece.id}...`);
      try {
        const pieceScene = new THREE.Scene();
        const cleanGeo = targetPiece.geometry.index ? targetPiece.geometry.toNonIndexed() : targetPiece.geometry.clone();
        pieceScene.add(new THREE.Mesh(
          cleanGeo,
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, side: THREE.DoubleSide })
        ));
        const stlRes = await ModelConverters.exportModel(pieceScene, 'stl', `Puzzle_Piece_${targetPiece.id}`);
        ModelConverters.triggerDownload(stlRes.blob, `Puzzle_Piece_${targetPiece.id}.stl`);
        showToast(`Puzzle Piece #${targetPiece.id} (.STL) exported!`, 'success');
      } catch (err) {
        console.error(err);
        showToast("Export error: " + err.message, 'error');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (currentPuzzleMode === 'burr') {
      if (!currentBurrData) buildBurr3D(false);
      const keyBar = currentBurrData.bars.find(b => b.keyBar) || currentBurrData.bars[0];
      setLoading(true, "Exporting Burr Key Slider Bar...");
      try {
        const barScene = new THREE.Scene();
        const cleanGeo = keyBar.geometry.index ? keyBar.geometry.toNonIndexed() : keyBar.geometry.clone();
        barScene.add(new THREE.Mesh(
          cleanGeo,
          new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.5, side: THREE.DoubleSide })
        ));
        const stlRes = await ModelConverters.exportModel(barScene, 'stl', `Burr_Key_Bar_${keyBar.id}`);
        ModelConverters.triggerDownload(stlRes.blob, `Burr_Key_Bar_${keyBar.id}.stl`);
        showToast(`Burr Key Slider Bar (.STL) exported!`, 'success');
      } catch (err) {
        console.error(err);
        showToast("Export error: " + err.message, 'error');
      } finally {
        setLoading(false);
      }
      return;
    }

    // In MorphoBricks mode:
    if (!currentBrickData) buildBricks3D(false);
    const sys = currentBrickData?.system || document.getElementById('brick-system-select')?.value || 'morphobricks';
    const sysObj = PuzzleEngine.BRICK_SYSTEMS[sys] || PuzzleEngine.BRICK_SYSTEMS.morphobricks;
    setLoading(true, `Exporting Single ${sysObj.name} Block...`);
    try {
      const bGeo = PuzzleEngine.generateSingleBrickGeometry(sys, '1x1', 10);
      const bScene = new THREE.Scene();
      bScene.add(new THREE.Mesh(bGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, side: THREE.DoubleSide })));
      const bStl = await ModelConverters.exportModel(bScene, 'stl', `Single_${sysObj.name}_1x1`);
      ModelConverters.triggerDownload(bStl.blob, `Single_${sysObj.name}_1x1.stl`);
      showToast(`Single ${sysObj.name} block exported!`, 'success');
    } catch (err) {
      console.error(err);
      showToast("Export error: " + err.message, 'error');
    } finally {
      setLoading(false);
    }
  });

  // Export 3: 50-Block Print Plate STL Direct Download
  safeOn('btn-export-plate-bricks', async () => {
    if (!currentBrickData) buildBricks3D(false);
    const sys = currentBrickData?.system || document.getElementById('brick-system-select')?.value || 'morphobricks';
    const sysObj = PuzzleEngine.BRICK_SYSTEMS[sys] || PuzzleEngine.BRICK_SYSTEMS.morphobricks;
    setLoading(true, `Generating 50-Block Print Plate...`);
    try {
      const plateGeo = PuzzleEngine.generatePrintPlateGeometry(sys, 50, 10);
      const plateScene = new THREE.Scene();
      plateScene.add(new THREE.Mesh(plateGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, side: THREE.DoubleSide })));
      const plateStl = await ModelConverters.exportModel(plateScene, 'stl', `Print_Plate_50_${sysObj.name}_Blocks`);
      ModelConverters.triggerDownload(plateStl.blob, `Print_Plate_50_${sysObj.name}_Blocks.stl`);
      showToast(`50-Block Print Plate exported!`, 'success');
    } catch (err) {
      console.error(err);
      showToast("Export error: " + err.message, 'error');
    } finally {
      setLoading(false);
    }
  });

  // Export 4: Building Manual SVG
  safeOn('btn-export-lego-manual', () => {
    const brickData = currentBrickData || { bomCounts: { totalBricks: 100, totalStuds: 100, '1x1': 100 }, totalLayers: 14, system: 'morphobricks' };
    const svg = PuzzleEngine.generateBrickInstructionsSVG(brickData, "Sculpture");
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    ModelConverters.triggerDownload(blob, "MorphoBricks_Building_Guide.svg");
    showToast("Building Guide exported successfully!", 'success');
  });

  // Export 5: Standalone Interactive HTML Puzzle Player
  safeOn('btn-export-puzzle-html', async () => {
    setLoading(true, "Generating Standalone 3D Puzzle Viewer...");
    try {
      const activeObj = state.loadedModel || currentPuzzleMesh;
      const htmlBlob = await PuzzleEngine.generateStandalonePuzzleHTML(activeObj, currentPuzzleMode, `3D_${currentPuzzleMode.toUpperCase()}_Puzzle`);
      ModelConverters.triggerDownload(htmlBlob, `3D_${currentPuzzleMode}_Puzzle_Viewer.html`);
      showToast(I18N.t('toastHTMLExported'), 'success');
    } catch (err) {
      console.error(err);
      showToast(I18N.t('toastErrorConvert') + err.message, 'error');
    } finally {
      setLoading(false);
    }
  });

  // Export 6: Full Model GLB & STL
  safeOn('btn-export-puzzle-glb', () => {
    exportCurrentModel('glb', currentPuzzleMode === 'bricks' ? 'Brick_Sculpture' : (currentPuzzleMode === 'burr' ? 'Burr_Puzzle' : '3D_Jigsaw_Puzzle'));
  });

  safeOn('btn-export-puzzle-stl', async () => {
    if (currentPuzzleMode === 'bricks') {
      if (!currentBrickData) buildBricks3D(false);
      const sys = currentBrickData?.system || 'morphobricks';
      const sysObj = PuzzleEngine.BRICK_SYSTEMS[sys] || PuzzleEngine.BRICK_SYSTEMS.morphobricks;
      const fullScene = new THREE.Scene();
      fullScene.add(new THREE.Mesh(
        currentBrickData.solidMergedGeometry,
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, side: THREE.DoubleSide })
      ));
      const fullStl = await ModelConverters.exportModel(fullScene, 'stl', `${sysObj.name}_Complete_Sculpture`);
      ModelConverters.triggerDownload(fullStl.blob, `${sysObj.name}_Complete_Sculpture.stl`);
      showToast(`${sysObj.name} Sculpture (.STL) exported!`, 'success');
    } else {
      exportCurrentModel('stl', currentPuzzleMode === 'burr' ? 'Burr_Puzzle_Model' : '3D_Jigsaw_Puzzle');
    }
  });

  // ----------------------------------------------------
  // Tab 10: 3D Acoustic & Soundwave Studio
  // ----------------------------------------------------
  let currentAcousticMode = 'waveform'; // 'waveform' | 'ring' | 'vase' | 'cymatics' | 'alien' | 'starship' | 'crystal' | 'dragon' | 'wolf' | 'crown'
  let customWaveformData = null;
  let currentAcousticMesh = null;

  const acousticModeBtns = {
    waveform: document.getElementById('btn-acoustic-mode-waveform'),
    ring: document.getElementById('btn-acoustic-mode-ring'),
    vase: document.getElementById('btn-acoustic-mode-vase'),
    cymatics: document.getElementById('btn-acoustic-mode-cymatics'),
    alien: document.getElementById('btn-acoustic-mode-alien'),
    starship: document.getElementById('btn-acoustic-mode-starship'),
    crystal: document.getElementById('btn-acoustic-mode-crystal'),
    dragon: document.getElementById('btn-acoustic-mode-dragon'),
    wolf: document.getElementById('btn-acoustic-mode-wolf'),
    crown: document.getElementById('btn-acoustic-mode-crown')
  };

  const acousticParamControls = document.getElementById('acoustic-param-controls');
  const acousticCymaticsControls = document.getElementById('acoustic-cymatics-controls');
  const acousticKeychainGroup = document.getElementById('acoustic-keychain-toggle-group');
  const acousticUploadGroup = document.getElementById('acoustic-upload-group');
  const acousticPresetSelect = document.getElementById('acoustic-preset-select');
  const acousticFileInput = document.getElementById('acoustic-file-input');

  function updateAcousticModeUI(mode) {
    currentAcousticMode = mode;
    Object.entries(acousticModeBtns).forEach(([k, btn]) => {
      if (!btn) return;
      if (k === mode) {
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-primary');
      } else {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
      }
    });

    if (acousticParamControls) acousticParamControls.style.display = mode === 'cymatics' ? 'none' : 'block';
    if (acousticCymaticsControls) acousticCymaticsControls.style.display = mode === 'cymatics' ? 'block' : 'none';
    if (acousticKeychainGroup) acousticKeychainGroup.style.display = (mode === 'ring' || mode === 'crown') ? 'block' : 'none';
  }

  Object.entries(acousticModeBtns).forEach(([m, btn]) => {
    if (btn) {
      btn.addEventListener('click', () => {
        updateAcousticModeUI(m);
        buildAcoustic3D(true);
      });
    }
  });

  if (acousticPresetSelect) {
    acousticPresetSelect.addEventListener('change', (e) => {
      if (acousticUploadGroup) acousticUploadGroup.style.display = e.target.value === 'custom_audio' ? 'block' : 'none';
      buildAcoustic3D();
    });
  }

  if (acousticFileInput) {
    acousticFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setLoading(true, "Decoding Audio Waveform Spectrum...");
      try {
        customWaveformData = await AcousticEngine.extractWaveformFromAudioFile(file, 128);
        showToast("Audio file decoded successfully!", 'success');
        buildAcoustic3D();
      } catch (err) {
        console.error(err);
        showToast("Audio decode error: " + err.message, 'error');
      } finally {
        setLoading(false);
      }
    });
  }

  // Sliders & Controls live feedback
  safeOn('acoustic-length-slider', 'input', (e) => {
    const el = document.getElementById('acoustic-len-val');
    if (el) el.textContent = `${e.target.value} mm`;
    buildAcoustic3D(false);
  });
  safeOn('acoustic-amp-slider', 'input', (e) => {
    const el = document.getElementById('acoustic-amp-val');
    if (el) el.textContent = `${e.target.value} mm`;
    buildAcoustic3D(false);
  });
  safeOn('cymatics-m-slider', 'input', (e) => {
    const el = document.getElementById('cymatics-m-val');
    if (el) el.textContent = e.target.value;
    buildAcoustic3D(false);
  });
  safeOn('cymatics-n-slider', 'input', (e) => {
    const el = document.getElementById('cymatics-n-val');
    if (el) el.textContent = e.target.value;
    buildAcoustic3D(false);
  });
  safeOn('acoustic-style-select', 'change', () => buildAcoustic3D(false));
  safeOn('acoustic-keychain-checkbox', 'change', () => buildAcoustic3D(false));

  // Live Microphone Voice Recording
  const btnMicToggle = document.getElementById('btn-acoustic-mic-toggle');
  const micBtnText = document.getElementById('acoustic-mic-btn-text');
  const micStatus = document.getElementById('acoustic-mic-status');
  const btnPlayRecorded = document.getElementById('btn-acoustic-play-recorded');
  let recordedAudioUrl = null;

  if (btnMicToggle) {
    btnMicToggle.addEventListener('click', async () => {
      if (!AcousticEngine.isRecording) {
        // Start Recording & Real-time Morphing
        try {
          if (micStatus) micStatus.innerHTML = '<span style="color: #ef4444; font-weight: bold;">🔴 Recording... Speak now!</span>';
          if (micBtnText) micBtnText.textContent = I18N.t('btnStopVoice');
          btnMicToggle.style.background = 'linear-gradient(135deg, #dc2626, #991b1b)';

          await AcousticEngine.startLiveMicrophone((liveWave) => {
            customWaveformData = liveWave;
            // Real-time morphing of the active 3D model
            buildAcoustic3D(false);
          });
        } catch (err) {
          console.error(err);
          showToast("Microphone access error: " + err.message, 'error');
          if (micStatus) micStatus.textContent = 'Error';
          if (micBtnText) micBtnText.textContent = I18N.t('btnRecordVoice');
          btnMicToggle.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        }
      } else {
        // Stop Recording & Freeze Final 3D Sculpture
        setLoading(true, "Finalizing 3D Voice Sculpture...");
        try {
          const res = await AcousticEngine.stopLiveMicrophone(128);
          customWaveformData = res.waveform;
          if (res.audioBlob) {
            recordedAudioUrl = URL.createObjectURL(res.audioBlob);
            if (btnPlayRecorded) btnPlayRecorded.style.display = 'inline-block';
          }
          if (micStatus) micStatus.innerHTML = '<span style="color: #10b981; font-weight: bold;">✅ Voice Sculpted!</span>';
          if (micBtnText) micBtnText.textContent = I18N.t('btnRecordVoice');
          btnMicToggle.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';

          if (acousticPresetSelect) acousticPresetSelect.value = 'custom_audio';
          buildAcoustic3D(true);
          showToast(I18N.t('toastVoiceRecorded'), 'success');
        } catch (err) {
          console.error(err);
          showToast("Recording processing error: " + err.message, 'error');
        } finally {
          setLoading(false);
        }
      }
    });
  }

  if (btnPlayRecorded) {
    btnPlayRecorded.addEventListener('click', () => {
      if (recordedAudioUrl) {
        const audio = new Audio(recordedAudioUrl);
        audio.play();
        showToast("Playing recorded voice...", 'info');
      }
    });
  }

  function buildAcoustic3D(recenter = true) {
    if (typeof AcousticEngine === 'undefined') return;

    const preset = acousticPresetSelect?.value || 'love_voice';
    let waveform = customWaveformData;
    if (!waveform || preset !== 'custom_audio') {
      waveform = AcousticEngine.getPresetWaveform(preset, 128);
    }

    const len = parseFloat(document.getElementById('acoustic-length-slider')?.value || 120);
    const amp = parseFloat(document.getElementById('acoustic-amp-slider')?.value || 35);
    const style = document.getElementById('acoustic-style-select')?.value || 'smooth';
    const hasLanyard = Boolean(document.getElementById('acoustic-keychain-checkbox')?.checked);
    const modeM = parseInt(document.getElementById('cymatics-m-slider')?.value || 3, 10);
    const modeN = parseInt(document.getElementById('cymatics-n-slider')?.value || 5, 10);

    let geom;
    let color = 0x38bdf8;
    let roughness = 0.3;
    let metalness = 0.2;

    if (currentAcousticMode === 'waveform') {
      geom = AcousticEngine.generateSoundwaveBar(waveform, { length: len, height: amp, depth: 14, style, symmetry: true });
      color = 0x38bdf8;
    } else if (currentAcousticMode === 'ring') {
      geom = AcousticEngine.generateSoundwaveRing(waveform, { innerRadius: len * 0.15, ringWidth: 8, waveAmplitude: amp * 0.25, hasLanyardHole: hasLanyard });
      color = 0xf59e0b;
      metalness = 0.5;
    } else if (currentAcousticMode === 'vase') {
      geom = AcousticEngine.generateAcousticVase(waveform, { height: len * 0.8, baseRadius: 18, topRadius: 28, waveInfluence: amp * 0.2 });
      color = 0x06b6d4;
    } else if (currentAcousticMode === 'cymatics') {
      geom = AcousticEngine.generateCymaticPlate(modeM, modeN, { plateSize: len * 0.75, ridgeHeight: amp * 0.25, gridRes: 48, waveform });
      color = 0x818cf8;
    } else if (currentAcousticMode === 'alien') {
      geom = AcousticEngine.generateAlienVoiceMesh(waveform, { height: len * 0.7, baseRadius: 14, waveInfluence: amp * 0.03 });
      color = 0xa855f7;
      metalness = 0.3;
    } else if (currentAcousticMode === 'starship') {
      geom = AcousticEngine.generateStarshipVoiceMesh(waveform, { length: len * 0.85, wingspan: len * 0.75, waveInfluence: amp * 0.03 });
      color = 0x38bdf8;
      metalness = 0.6;
    } else if (currentAcousticMode === 'crystal') {
      geom = AcousticEngine.generateCrystalVoiceMesh(waveform, { radius: len * 0.35, spikeCount: 16 });
      color = 0xec4899;
      roughness = 0.1;
      metalness = 0.1;
    } else if (currentAcousticMode === 'dragon') {
      geom = AcousticEngine.generateDragonVoiceMesh(waveform, { length: len * 0.85, height: amp * 1.5 });
      color = 0xf97316;
    } else if (currentAcousticMode === 'wolf') {
      geom = AcousticEngine.generateWolfVoiceMesh(waveform, { length: len * 0.75, height: amp * 1.3 });
      color = 0x14b8a6;
      metalness = 0.4;
    } else if (currentAcousticMode === 'crown') {
      geom = AcousticEngine.generateCrownVoiceMesh(waveform, { crownRadius: len * 0.25, bandHeight: 8, maxPeakHeight: amp });
      color = 0xfacc15;
      metalness = 0.7;
      roughness = 0.2;
    }

    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      side: THREE.DoubleSide
    });

    currentAcousticMesh = new THREE.Mesh(geom, mat);
    currentAcousticMesh.name = `Acoustic_${currentAcousticMode}`;

    if (recenter) {
      CADInspector.centerObject(currentAcousticMesh);
      CADInspector.autoGround(currentAcousticMesh);
    }

    setModel(currentAcousticMesh, `Acoustic_${currentAcousticMode}.glb`);
    showToast(I18N.t('toastAcousticGenerated'), 'success');
  }

  safeOn('btn-generate-acoustic', 'click', () => buildAcoustic3D(true));

  // Acoustic Exports
  safeOn('btn-export-acoustic-stl', async () => {
    if (!currentAcousticMesh) buildAcoustic3D(false);
    exportCurrentModel('stl', `Acoustic_${currentAcousticMode}_Sculpture`);
  });

  safeOn('btn-export-acoustic-glb', () => {
    if (!currentAcousticMesh) buildAcoustic3D(false);
    exportCurrentModel('glb', `Acoustic_${currentAcousticMode}_Model`);
  });

  safeOn('btn-export-acoustic-svg', () => {
    const preset = acousticPresetSelect?.value || 'love_voice';
    const waveform = (preset === 'custom_audio' && customWaveformData) ? customWaveformData : AcousticEngine.getPresetWaveform(preset, 128);
    const svg = AcousticEngine.generateSoundwaveSVG(waveform, "Soundwave_Art");
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    ModelConverters.triggerDownload(blob, "Soundwave_Laser_Engrave.svg");
    showToast("Soundwave Vector (.SVG) exported successfully!", 'success');
  });

  safeOn('btn-export-acoustic-html', async () => {
    if (!currentAcousticMesh) buildAcoustic3D(false);
    setLoading(true, "Generating Standalone Acoustic 3D Viewer...");
    try {
      const activeObj = currentAcousticMesh || state.loadedModel;
      const htmlBlob = await ModelConverters.generateStandaloneHTML(activeObj, `Acoustic_${currentAcousticMode}_3D`);
      ModelConverters.triggerDownload(htmlBlob, `Acoustic_${currentAcousticMode}_Viewer.html`);
      showToast(I18N.t('toastHTMLExported'), 'success');
    } catch (err) {
      console.error(err);
      showToast(I18N.t('toastErrorConvert') + err.message, 'error');
    } finally {
      setLoading(false);
    }
  });

  // ----------------------------------------------------
  // Tab 11: 3D Dungeon & Diorama Studio
  // ----------------------------------------------------
  let currentDungeonMode = 'tiles';
  let currentDungeonModel = null;
  let currentMazeSeed = Math.floor(Math.random() * 100000);

  const btnDungeonModeTiles = document.getElementById('btn-dungeon-mode-tiles');
  const btnDungeonModeArch = document.getElementById('btn-dungeon-mode-arch');
  const btnDungeonModeDoors = document.getElementById('btn-dungeon-mode-doors');
  const btnDungeonModeSingleDoor = document.getElementById('btn-dungeon-mode-single-door');
  const btnDungeonModeMaze = document.getElementById('btn-dungeon-mode-maze');
  const btnDungeonModeProps = document.getElementById('btn-dungeon-mode-props');

  const dungeonSubpanelTiles = document.getElementById('dungeon-subpanel-tiles');
  const dungeonSubpanelArch = document.getElementById('dungeon-subpanel-arch');
  const dungeonSubpanelDoors = document.getElementById('dungeon-subpanel-doors');
  const dungeonSubpanelSingleDoor = document.getElementById('dungeon-subpanel-singledoor');
  const dungeonSubpanelMaze = document.getElementById('dungeon-subpanel-maze');
  const dungeonSubpanelProps = document.getElementById('dungeon-subpanel-props');

  function updateDungeonModeUI(mode) {
    currentDungeonMode = mode;
    if (btnDungeonModeTiles) btnDungeonModeTiles.className = mode === 'tiles' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
    if (btnDungeonModeArch) btnDungeonModeArch.className = mode === 'arch' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
    if (btnDungeonModeDoors) btnDungeonModeDoors.className = mode === 'doors' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
    if (btnDungeonModeSingleDoor) btnDungeonModeSingleDoor.className = mode === 'singledoor' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
    if (btnDungeonModeMaze) btnDungeonModeMaze.className = mode === 'maze' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
    if (btnDungeonModeProps) btnDungeonModeProps.className = mode === 'props' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';

    if (dungeonSubpanelTiles) dungeonSubpanelTiles.style.display = mode === 'tiles' ? 'block' : 'none';
    if (dungeonSubpanelArch) dungeonSubpanelArch.style.display = mode === 'arch' ? 'block' : 'none';
    if (dungeonSubpanelDoors) dungeonSubpanelDoors.style.display = mode === 'doors' ? 'block' : 'none';
    if (dungeonSubpanelSingleDoor) dungeonSubpanelSingleDoor.style.display = mode === 'singledoor' ? 'block' : 'none';
    if (dungeonSubpanelMaze) dungeonSubpanelMaze.style.display = mode === 'maze' ? 'block' : 'none';
    if (dungeonSubpanelProps) dungeonSubpanelProps.style.display = mode === 'props' ? 'block' : 'none';
  }

  if (btnDungeonModeTiles) btnDungeonModeTiles.addEventListener('click', () => { updateDungeonModeUI('tiles'); buildDungeon3D(); });
  if (btnDungeonModeArch) btnDungeonModeArch.addEventListener('click', () => { updateDungeonModeUI('arch'); buildDungeon3D(); });
  if (btnDungeonModeDoors) btnDungeonModeDoors.addEventListener('click', () => { updateDungeonModeUI('doors'); buildDungeon3D(); });
  if (btnDungeonModeSingleDoor) btnDungeonModeSingleDoor.addEventListener('click', () => { updateDungeonModeUI('singledoor'); buildDungeon3D(); });
  if (btnDungeonModeMaze) btnDungeonModeMaze.addEventListener('click', () => { updateDungeonModeUI('maze'); buildDungeon3D(); });
  if (btnDungeonModeProps) btnDungeonModeProps.addEventListener('click', () => { updateDungeonModeUI('props'); buildDungeon3D(); });

  // Sliders and control bindings
  safeOn('dungeon-tile-relief-slider', 'input', (e) => {
    const el = document.getElementById('dungeon-tile-relief-val');
    if (el) el.textContent = `${e.target.value}mm`;
  });
  safeOn('dungeon-tile-weathering-slider', 'input', (e) => {
    const el = document.getElementById('dungeon-tile-weathering-val');
    if (el) el.textContent = `${e.target.value}%`;
  });
  safeOn('dungeon-wall-height-slider', 'input', (e) => {
    const el = document.getElementById('dungeon-wall-height-val');
    if (el) el.textContent = `${e.target.value}mm`;
  });
  safeOn('dungeon-wall-thick-slider', 'input', (e) => {
    const el = document.getElementById('dungeon-wall-thick-val');
    if (el) el.textContent = `${e.target.value}mm`;
  });
  safeOn('dungeon-door-angle-slider', 'input', (e) => {
    const el = document.getElementById('dungeon-door-angle-val');
    if (el) el.textContent = `${e.target.value}°`;
    buildDungeon3D(false);
  });
  safeOn('dungeon-maze-dim-slider', 'input', (e) => {
    const el = document.getElementById('dungeon-maze-dim-val');
    if (el) el.textContent = `${e.target.value} × ${e.target.value}`;
  });
  safeOn('dungeon-maze-wallh-slider', 'input', (e) => {
    const el = document.getElementById('dungeon-maze-wallh-val');
    if (el) el.textContent = `${e.target.value}mm`;
  });

  safeOn('dungeon-arch-type', 'change', (e) => {
    const angleGroup = document.getElementById('dungeon-door-angle-group');
    if (angleGroup) angleGroup.style.display = (e.target.value === 'hinged_door') ? 'block' : 'none';
  });

  // Doors 3D Slider Listeners & Real-Time Hinge Swing
  safeOn('dungeon-door-height-slider', 'input', (e) => {
    const el = document.getElementById('dungeon-door-height-val');
    if (el) el.textContent = `${e.target.value}mm`;
  });
  safeOn('dungeon-door-width-slider', 'input', (e) => {
    const el = document.getElementById('dungeon-door-width-val');
    if (el) el.textContent = `${e.target.value}mm`;
  });
  safeOn('dungeon-door-thick-slider', 'input', (e) => {
    const el = document.getElementById('dungeon-door-thick-val');
    if (el) el.textContent = `${e.target.value}mm`;
  });
  safeOn('dungeon-door-framedepth-slider', 'input', (e) => {
    const el = document.getElementById('dungeon-door-framedepth-val');
    if (el) el.textContent = `${e.target.value}mm`;
  });
  safeOn('dungeon-door-swing-slider', 'input', (e) => {
    const angle = parseFloat(e.target.value);
    const el = document.getElementById('dungeon-door-swing-val');
    if (el) el.textContent = `${angle}°`;
    if (currentDungeonModel && currentDungeonModel.userData && currentDungeonModel.userData.doorPivotGroup) {
      currentDungeonModel.userData.doorPivotGroup.rotation.y = (angle * Math.PI) / 180;
    }
  });

  // ----------------------------------------------------
  // Doors 3D: Shared Stamp & Text Plaque Renderers
  // ----------------------------------------------------
  function renderDoorMotifStamp(ctx, canvas, motif) {
    if (!ctx || !canvas) return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#fbbf24';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.5;

    if (motif === 'lion') {
      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, Math.PI * 2);
      ctx.fill();
      for (let a = 0; a < 16; a++) {
        const angle = (a * Math.PI) / 8;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * 22, cy + Math.sin(angle) * 22);
        ctx.lineTo(cx + Math.cos(angle) * 38, cy + Math.sin(angle) * 38);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.arc(cx - 8, cy - 6, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 8, cy - 6, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy + 8, 4, 0, Math.PI * 2); ctx.fill();

    } else if (motif === 'dragon') {
      ctx.beginPath();
      ctx.ellipse(cx, cy, 14, 30, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy - 10);
      ctx.lineTo(cx - 42, cy - 30);
      ctx.lineTo(cx - 20, cy + 10);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + 10, cy - 10);
      ctx.lineTo(cx + 42, cy - 30);
      ctx.lineTo(cx + 20, cy + 10);
      ctx.closePath();
      ctx.fill();

    } else if (motif === 'eagle') {
      ctx.beginPath();
      ctx.arc(cx, cy - 32, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + 6, cy - 35);
      ctx.lineTo(cx + 17, cy - 32);
      ctx.lineTo(cx + 6, cy - 28);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - 13, cy - 22);
      ctx.lineTo(cx + 13, cy - 22);
      ctx.lineTo(cx + 11, cy + 8);
      ctx.lineTo(cx, cy + 22);
      ctx.lineTo(cx - 11, cy + 8);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - 11, cy - 18);
      ctx.lineTo(cx - 48, cy - 36);
      ctx.lineTo(cx - 36, cy - 14);
      ctx.lineTo(cx - 50, cy - 4);
      ctx.lineTo(cx - 30, cy + 8);
      ctx.lineTo(cx - 42, cy + 16);
      ctx.lineTo(cx - 13, cy + 9);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + 11, cy - 18);
      ctx.lineTo(cx + 48, cy - 36);
      ctx.lineTo(cx + 36, cy - 14);
      ctx.lineTo(cx + 50, cy - 4);
      ctx.lineTo(cx + 30, cy + 8);
      ctx.lineTo(cx + 42, cy + 16);
      ctx.lineTo(cx + 13, cy + 9);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - 9, cy + 20);
      ctx.lineTo(cx - 16, cy + 40);
      ctx.lineTo(cx, cy + 34);
      ctx.lineTo(cx + 16, cy + 40);
      ctx.lineTo(cx + 9, cy + 20);
      ctx.closePath();
      ctx.fill();

    } else if (motif === 'crown') {
      ctx.beginPath();
      ctx.moveTo(cx - 32, cy + 18);
      ctx.lineTo(cx + 32, cy + 18);
      ctx.lineTo(cx + 28, cy - 6);
      ctx.lineTo(cx + 16, cy + 6);
      ctx.lineTo(cx, cy - 22);
      ctx.lineTo(cx - 16, cy + 6);
      ctx.lineTo(cx - 28, cy - 6);
      ctx.closePath();
      ctx.fill();
      for (const px of [-28, -14, 0, 14, 28]) {
        const py = px === 0 ? cy - 24 : (Math.abs(px) === 28 ? cy - 8 : cy + 4);
        ctx.beginPath();
        ctx.arc(cx + px, py, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'destination-out';
      for (let j = -20; j <= 20; j += 10) {
        ctx.beginPath();
        ctx.arc(cx + j, cy + 12, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (motif === 'hammer_anvil') {
      ctx.beginPath();
      ctx.moveTo(cx - 28, cy + 18);
      ctx.lineTo(cx + 28, cy + 18);
      ctx.lineTo(cx + 14, cy + 4);
      ctx.lineTo(cx + 24, cy + 4);
      ctx.lineTo(cx + 32, cy - 6);
      ctx.lineTo(cx - 22, cy - 6);
      ctx.lineTo(cx - 34, cy + 2);
      ctx.lineTo(cx - 14, cy + 4);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx - 18, cy + 14);
      ctx.lineTo(cx + 22, cy - 28);
      ctx.stroke();
      ctx.fillRect(cx + 14, cy - 34, 16, 8);

    } else if (motif === 'rune_circle') {
      ctx.beginPath();
      ctx.arc(cx, cy, 34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 24, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang) * 24, cy + Math.sin(ang) * 24);
        ctx.lineTo(cx + Math.cos(ang) * 34, cy + Math.sin(ang) * 34);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fill();

    } else if (motif === 'gargoyle') {
      ctx.beginPath();
      ctx.arc(cx, cy - 8, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy - 18); ctx.lineTo(cx - 18, cy - 32); ctx.lineTo(cx - 2, cy - 20);
      ctx.moveTo(cx + 8, cy - 18); ctx.lineTo(cx + 18, cy - 32); ctx.lineTo(cx + 2, cy - 20);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy - 4);
      ctx.quadraticCurveTo(cx - 40, cy - 28, cx - 44, cy + 10);
      ctx.lineTo(cx - 32, cy + 4);
      ctx.lineTo(cx - 20, cy + 16);
      ctx.lineTo(cx - 8, cy + 8);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + 10, cy - 4);
      ctx.quadraticCurveTo(cx + 40, cy - 28, cx + 44, cy + 10);
      ctx.lineTo(cx + 32, cy + 4);
      ctx.lineTo(cx + 20, cy + 16);
      ctx.lineTo(cx + 8, cy + 8);
      ctx.closePath();
      ctx.fill();

    } else if (motif === 'shield') {
      ctx.beginPath();
      ctx.moveTo(cx - 34, cy - 38);
      ctx.lineTo(cx + 34, cy - 38);
      ctx.lineTo(cx + 34, cy + 4);
      ctx.bezierCurveTo(cx + 34, cy + 32, cx + 18, cy + 46, cx, cy + 52);
      ctx.bezierCurveTo(cx - 18, cy + 46, cx - 34, cy + 32, cx - 34, cy + 4);
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 32);
      ctx.lineTo(cx, cy + 42);
      ctx.moveTo(cx - 26, cy - 8);
      ctx.lineTo(cx + 26, cy - 8);
      ctx.stroke();

    } else if (motif === 'skull') {
      ctx.beginPath();
      ctx.arc(cx, cy - 8, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 12, cy + 6, 24, 16);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.arc(cx - 8, cy - 4, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 8, cy - 4, 5, 0, Math.PI * 2); ctx.fill();
      for (let t = -8; t <= 8; t += 4) {
        ctx.fillRect(cx + t - 1, cy + 14, 2, 7);
      }

    } else if (motif === 'swords') {
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx - 32, cy - 32); ctx.lineTo(cx + 32, cy + 32);
      ctx.moveTo(cx + 32, cy - 32); ctx.lineTo(cx - 32, cy + 32);
      ctx.stroke();
      ctx.lineWidth = 2.5;
      ctx.strokeRect(cx - 18, cy + 12, 14, 4);
      ctx.strokeRect(cx + 4, cy + 12, 14, 4);

    } else if (motif === 'star') {
      ctx.beginPath();
      ctx.arc(cx, cy, 34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const outer = (i * Math.PI) / 4;
        const inner = outer + Math.PI / 8;
        const ox = cx + Math.cos(outer) * 32;
        const oy = cy + Math.sin(outer) * 32;
        const ix = cx + Math.cos(inner) * 14;
        const iy = cy + Math.sin(inner) * 14;
        if (i === 0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy);
        ctx.lineTo(ix, iy);
      }
      ctx.closePath();
      ctx.fill();

    } else {
      // Celtic Tree
      ctx.beginPath();
      ctx.arc(cx, cy, 35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillRect(cx - 4, cy - 10, 8, 32);
      for (let b = 0; b < 6; b++) {
        const ang = -Math.PI * 0.2 - (b * Math.PI) / 8;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 4);
        ctx.lineTo(cx + Math.cos(ang) * 28, cy - 10 + Math.sin(ang) * 22);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  function renderDoorTextPlaque(ctx, canvas, text) {
    if (!ctx || !canvas) return;
    const trimmed = (text || 'SANCTUM').trim();
    if (!trimmed) return;
    const cx = canvas.width / 2;
    const cy = 40;

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 16px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const textW = ctx.measureText(trimmed).width + 16;
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(cx - textW / 2, cy - 12, textW, 24);
    ctx.fillText(trimmed, cx, cy);
    ctx.restore();
  }

  // Generic Door Drawing Studio Controller
  function initInteractiveDoorCanvas(canvasId, penBtnId, eraserBtnId, clearBtnId, brushSliderId, brushValId, onDrawFinished) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let tool = 'pen';
    let brushSize = 3;
    let timer = null;

    function clear() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    clear();

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    }

    function start(e) {
      isDrawing = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      step(pos.x, pos.y);
    }

    function step(x, y) {
      if (!isDrawing) return;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = brushSize;
      if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = '#fbbf24';
      }
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    function move(e) {
      if (!isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);
      step(pos.x, pos.y);
    }

    function finish() {
      if (!isDrawing) return;
      isDrawing = false;
      ctx.closePath();
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (onDrawFinished) onDrawFinished();
      }, 350);
    }

    canvas.addEventListener('mousedown', start);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', finish);

    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); start(e); }, { passive: false });
    window.addEventListener('touchmove', (e) => { if (isDrawing) { e.preventDefault(); move(e); } }, { passive: false });
    window.addEventListener('touchend', finish);

    safeOn(penBtnId, 'click', () => {
      tool = 'pen';
      document.getElementById(penBtnId)?.classList.replace('btn-secondary', 'btn-primary');
      document.getElementById(eraserBtnId)?.classList.replace('btn-primary', 'btn-secondary');
    });

    safeOn(eraserBtnId, 'click', () => {
      tool = 'eraser';
      document.getElementById(eraserBtnId)?.classList.replace('btn-primary', 'btn-secondary');
      document.getElementById(penBtnId)?.classList.replace('btn-primary', 'btn-secondary');
    });

    safeOn(clearBtnId, 'click', () => {
      clear();
      if (onDrawFinished) onDrawFinished();
    });

    safeOn(brushSliderId, 'input', (e) => {
      brushSize = parseInt(e.target.value, 10);
      const el = document.getElementById(brushValId);
      if (el) el.textContent = `${brushSize}px`;
    });

    return { canvas, ctx, clear };
  }

  // 1. Framed Door Canvas Studio
  const framedDoorCtrl = initInteractiveDoorCanvas(
    'dungeon-door-canvas',
    'btn-door-draw-pen',
    'btn-door-draw-eraser',
    'btn-door-draw-clear',
    'dungeon-door-brush-slider',
    'dungeon-door-brush-val',
    () => { if (currentDungeonMode === 'doors') buildDungeon3D(false); }
  );

  safeOn('dungeon-door-relief-slider', 'input', (e) => {
    const el = document.getElementById('dungeon-door-relief-val');
    if (el) el.textContent = `${e.target.value}mm`;
  });

  safeOn('btn-door-apply-stamp', 'click', () => {
    if (!framedDoorCtrl) return;
    const motif = document.getElementById('dungeon-door-stamp-select')?.value || 'lion';
    renderDoorMotifStamp(framedDoorCtrl.ctx, framedDoorCtrl.canvas, motif);
    if (currentDungeonMode === 'doors') buildDungeon3D(false);
  });

  safeOn('btn-door-apply-text', 'click', () => {
    if (!framedDoorCtrl) return;
    const text = document.getElementById('dungeon-door-text-input')?.value;
    renderDoorTextPlaque(framedDoorCtrl.ctx, framedDoorCtrl.canvas, text);
    if (currentDungeonMode === 'doors') buildDungeon3D(false);
  });

  // 2. Standalone Single Door Canvas Studio
  const singleDoorCtrl = initInteractiveDoorCanvas(
    'dungeon-single-door-canvas',
    'btn-single-draw-pen',
    'btn-single-draw-eraser',
    'btn-single-draw-clear',
    'single-door-brush-slider',
    'single-door-brush-val',
    () => { if (currentDungeonMode === 'singledoor') buildDungeon3D(false); }
  );

  // 1-Click Iconic Door Presets Library
  const iconicDoorPresets = {
    cathedral_gate: {
      topShape: 'arch_gothic',
      doorStyle: 'panel_carved',
      leafCount: 'double',
      hardwareStrap: 'strap_hinges',
      hardwareKnocker: 'lion_knocker',
      hardwareKickplate: 'armor_kickplate',
      windowType: 'quatrefoil_rose',
      standType: 'slotted_stone',
      height: 65,
      width: 42,
      thickness: 4.5,
      stamp: 'shield'
    },
    dwarven_vault: {
      topShape: 'trapezoid_dwarf',
      doorStyle: 'dwarven_runegate',
      leafCount: 'single',
      hardwareStrap: 'corner_brackets',
      hardwareKnocker: 'ring_knocker',
      hardwareKickplate: 'armor_kickplate',
      windowType: 'none',
      standType: 'slotted_stone',
      height: 52,
      width: 36,
      thickness: 5.0,
      stamp: 'hammer_anvil'
    },
    lich_crypt: {
      topShape: 'arch_round',
      doorStyle: 'catacomb_bones',
      leafCount: 'single',
      hardwareStrap: 'strap_hinges',
      hardwareKnocker: 'none',
      hardwareKickplate: 'none',
      windowType: 'peep_hatch',
      standType: 'magnetic_sockets',
      height: 50,
      width: 30,
      thickness: 4.0,
      stamp: 'skull'
    },
    elven_grove: {
      topShape: 'arch_ogee',
      doorStyle: 'elven_sylvan',
      leafCount: 'single',
      hardwareStrap: 'none',
      hardwareKnocker: 'none',
      hardwareKickplate: 'none',
      windowType: 'none',
      standType: 'none',
      height: 58,
      width: 32,
      thickness: 3.5,
      stamp: 'tree'
    },
    steampunk_armory: {
      topShape: 'arch_circular',
      doorStyle: 'steampunk_vault',
      leafCount: 'single',
      hardwareStrap: 'none',
      hardwareKnocker: 'vault_wheel',
      hardwareKickplate: 'none',
      windowType: 'none',
      standType: 'round_25mm',
      height: 48,
      width: 48,
      thickness: 5.0,
      stamp: 'star'
    },
    high_security_cell: {
      topShape: 'flat_square',
      doorStyle: 'prison_cell',
      leafCount: 'single',
      hardwareStrap: 'strap_hinges',
      hardwareKnocker: 'gothic_latch',
      hardwareKickplate: 'armor_kickplate',
      windowType: 'barred_grille',
      standType: 'slotted_stone',
      height: 50,
      width: 30,
      thickness: 4.0,
      stamp: 'eagle'
    },
    tavern_dutch: {
      topShape: 'arch_tudor',
      doorStyle: 'tavern_dutch',
      leafCount: 'single',
      hardwareStrap: 'strap_hinges',
      hardwareKnocker: 'ring_knocker',
      hardwareKickplate: 'armor_kickplate',
      windowType: 'none',
      standType: 'round_25mm',
      height: 48,
      width: 32,
      thickness: 4.0,
      stamp: 'crown'
    },
    arcane_sanctum: {
      topShape: 'arch_trefoil',
      doorStyle: 'arcane_portal',
      leafCount: 'double',
      hardwareStrap: 'corner_brackets',
      hardwareKnocker: 'none',
      hardwareKickplate: 'none',
      windowType: 'quatrefoil_rose',
      standType: 'magnetic_sockets',
      height: 56,
      width: 38,
      thickness: 4.0,
      stamp: 'rune_circle'
    }
  };

  safeOn('single-door-preset-select', 'change', (e) => {
    const presetKey = e.target.value;
    const p = iconicDoorPresets[presetKey];
    if (!p) return;

    const topShapeEl = document.getElementById('single-door-top-shape');
    if (topShapeEl) topShapeEl.value = p.topShape;
    const styleEl = document.getElementById('single-door-leaf-style');
    if (styleEl) styleEl.value = p.doorStyle;
    const leafCountEl = document.getElementById('single-door-leaf-count');
    if (leafCountEl) leafCountEl.value = p.leafCount;
    const strapsEl = document.getElementById('single-door-straps');
    if (strapsEl) strapsEl.value = p.hardwareStrap;
    const knockerEl = document.getElementById('single-door-knocker');
    if (knockerEl) knockerEl.value = p.hardwareKnocker;
    const kickEl = document.getElementById('single-door-kickplate');
    if (kickEl) kickEl.value = p.hardwareKickplate;
    const winEl = document.getElementById('single-door-window');
    if (winEl) winEl.value = p.windowType;
    const standEl = document.getElementById('single-door-stand-type');
    if (standEl) standEl.value = p.standType;

    const hSlider = document.getElementById('single-door-height-slider');
    if (hSlider) { hSlider.value = p.height; const val = document.getElementById('single-door-height-val'); if (val) val.textContent = `${p.height}mm`; }
    const wSlider = document.getElementById('single-door-width-slider');
    if (wSlider) { wSlider.value = p.width; const val = document.getElementById('single-door-width-val'); if (val) val.textContent = `${p.width}mm`; }
    const tSlider = document.getElementById('single-door-thick-slider');
    if (tSlider) { tSlider.value = p.thickness; const val = document.getElementById('single-door-thick-val'); if (val) val.textContent = `${p.thickness.toFixed(1)}mm`; }

    if (singleDoorCtrl) {
      singleDoorCtrl.clear();
      renderDoorMotifStamp(singleDoorCtrl.ctx, singleDoorCtrl.canvas, p.stamp);
      const stampSel = document.getElementById('single-door-stamp-select');
      if (stampSel) stampSel.value = p.stamp;
    }

    buildDungeon3D(true);
  });

  safeOn('single-door-height-slider', 'input', (e) => {
    const el = document.getElementById('single-door-height-val');
    if (el) el.textContent = `${e.target.value}mm`;
  });
  safeOn('single-door-width-slider', 'input', (e) => {
    const el = document.getElementById('single-door-width-val');
    if (el) el.textContent = `${e.target.value}mm`;
  });
  safeOn('single-door-thick-slider', 'input', (e) => {
    const el = document.getElementById('single-door-thick-val');
    if (el) el.textContent = `${e.target.value}mm`;
  });
  safeOn('single-door-relief-slider', 'input', (e) => {
    const el = document.getElementById('single-door-relief-val');
    if (el) el.textContent = `${e.target.value}mm`;
  });

  safeOn('btn-single-apply-stamp', 'click', () => {
    if (!singleDoorCtrl) return;
    const motif = document.getElementById('single-door-stamp-select')?.value || 'lion';
    renderDoorMotifStamp(singleDoorCtrl.ctx, singleDoorCtrl.canvas, motif);
    if (currentDungeonMode === 'singledoor') buildDungeon3D(false);
  });

  safeOn('btn-single-apply-text', 'click', () => {
    if (!singleDoorCtrl) return;
    const text = document.getElementById('single-door-text-input')?.value;
    renderDoorTextPlaque(singleDoorCtrl.ctx, singleDoorCtrl.canvas, text);
    if (currentDungeonMode === 'singledoor') buildDungeon3D(false);
  });

  safeOn('single-door-top-shape', 'change', () => { if (currentDungeonMode === 'singledoor') buildDungeon3D(false); });
  safeOn('single-door-leaf-style', 'change', () => { if (currentDungeonMode === 'singledoor') buildDungeon3D(false); });
  safeOn('single-door-leaf-count', 'change', () => { if (currentDungeonMode === 'singledoor') buildDungeon3D(false); });
  safeOn('single-door-straps', 'change', () => { if (currentDungeonMode === 'singledoor') buildDungeon3D(false); });
  safeOn('single-door-knocker', 'change', () => { if (currentDungeonMode === 'singledoor') buildDungeon3D(false); });
  safeOn('single-door-kickplate', 'change', () => { if (currentDungeonMode === 'singledoor') buildDungeon3D(false); });
  safeOn('single-door-stand-type', 'change', () => { if (currentDungeonMode === 'singledoor') buildDungeon3D(false); });
  safeOn('single-door-window', 'change', () => { if (currentDungeonMode === 'singledoor') buildDungeon3D(false); });
  safeOn('single-door-relief-mode', 'change', () => { if (currentDungeonMode === 'singledoor') buildDungeon3D(false); });

  safeOn('btn-dungeon-maze-reroll', 'click', () => {
    currentMazeSeed = Math.floor(Math.random() * 100000);
    buildDungeon3D(false);
  });

  function buildDungeon3D(recenter = true) {
    if (typeof DungeonEngine === 'undefined') return;

    if (currentDungeonMode === 'tiles') {
      const style = document.getElementById('dungeon-tile-style')?.value || 'flagstone';
      const sizeStr = document.getElementById('dungeon-tile-size')?.value || '1x1';
      const [sx, sz] = sizeStr.split('x').map(Number);
      const reliefDepth = parseFloat(document.getElementById('dungeon-tile-relief-slider')?.value || '1.5');
      const weathering = parseInt(document.getElementById('dungeon-tile-weathering-slider')?.value || '40', 10);
      const interlock = document.getElementById('dungeon-interlock-system')?.value || 'magnet';

      const geom = DungeonEngine.generateDungeonTile(style, sx, sz, { reliefDepth, weathering, interlock });
      const stoneColor = (style === 'lava_fissure') ? 0x27272a :
                         (style === 'wood_planks') ? 0x78350f :
                         (style === 'crypt_bones') ? 0x6b7280 :
                         (style === 'runes') ? 0x18181b : 0x78716c;

      const mat = new THREE.MeshStandardMaterial({
        color: stoneColor,
        roughness: style === 'mosaic' ? 0.35 : 0.85,
        side: THREE.DoubleSide
      });
      currentDungeonModel = new THREE.Mesh(geom, mat);
      currentDungeonModel.name = `Dungeon_Tile_${style}_${sizeStr}`;

    } else if (currentDungeonMode === 'arch') {
      const archType = document.getElementById('dungeon-arch-type')?.value || 'stone_wall';
      const wallHeight = parseFloat(document.getElementById('dungeon-wall-height-slider')?.value || '35');
      const wallThickness = parseFloat(document.getElementById('dungeon-wall-thick-slider')?.value || '8');
      const doorAngle = parseFloat(document.getElementById('dungeon-door-angle-slider')?.value || '35');

      const res = DungeonEngine.generateArchitecturalElement(archType, { wallHeight, wallThickness, doorAngle });
      currentDungeonModel = res.group || new THREE.Mesh(res.geometry, new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.85 }));
      currentDungeonModel.name = `Dungeon_${archType}`;

    } else if (currentDungeonMode === 'doors') {
      const doorWidth = parseFloat(document.getElementById('dungeon-door-width-slider')?.value || '28');
      const doorHeight = parseFloat(document.getElementById('dungeon-door-height-slider')?.value || '45');
      const doorThickness = parseFloat(document.getElementById('dungeon-door-thick-slider')?.value || '4.0');
      const frameDepth = parseFloat(document.getElementById('dungeon-door-framedepth-slider')?.value || '10');
      const frameStyle = document.getElementById('dungeon-door-frame-style')?.value || 'gothic_pointed';
      const doorStyle = document.getElementById('dungeon-door-leaf-style')?.value || 'vertical_planks';
      const openAngle = parseFloat(document.getElementById('dungeon-door-swing-slider')?.value || '35');
      const hardware = document.getElementById('dungeon-door-hardware')?.value || 'ring_knocker';
      const windowType = document.getElementById('dungeon-door-window')?.value || 'none';
      const reliefDepth = parseFloat(document.getElementById('dungeon-door-relief-slider')?.value || '1.5');
      const reliefMode = document.getElementById('dungeon-door-relief-mode')?.value || 'emboss';
      const interlock = document.getElementById('dungeon-door-interlock')?.value || 'solid';
      const reliefCanvas = document.getElementById('dungeon-door-canvas');

      const res = DungeonEngine.generateCustomDoor3D({
        doorWidth, doorHeight, doorThickness, frameDepth,
        frameStyle, doorStyle, openAngle, hardware, windowType,
        reliefDepth, reliefMode, interlock, reliefCanvas
      });
      currentDungeonModel = res.group;
      currentDungeonModel.name = `Dungeon_Door_${frameStyle}_${doorStyle}`;

    } else if (currentDungeonMode === 'singledoor') {
      const doorWidth = parseFloat(document.getElementById('single-door-width-slider')?.value || '30');
      const doorHeight = parseFloat(document.getElementById('single-door-height-slider')?.value || '50');
      const doorThickness = parseFloat(document.getElementById('single-door-thick-slider')?.value || '4.0');
      const topShape = document.getElementById('single-door-top-shape')?.value || 'arch_gothic';
      const doorStyle = document.getElementById('single-door-leaf-style')?.value || 'vertical_planks';
      const leafCount = document.getElementById('single-door-leaf-count')?.value || 'single';
      const hardwareStrap = document.getElementById('single-door-straps')?.value || 'none';
      const hardwareKnocker = document.getElementById('single-door-knocker')?.value || 'none';
      const hardwareKickplate = document.getElementById('single-door-kickplate')?.value || 'none';
      const standType = document.getElementById('single-door-stand-type')?.value || 'none';
      const windowType = document.getElementById('single-door-window')?.value || 'none';
      const reliefDepth = parseFloat(document.getElementById('single-door-relief-slider')?.value || '1.5');
      const reliefMode = document.getElementById('single-door-relief-mode')?.value || 'emboss';
      const reliefCanvas = document.getElementById('dungeon-single-door-canvas');

      const res = DungeonEngine.generateStandaloneDoor3D({
        doorWidth,
        doorHeight,
        doorThickness,
        topShape,
        doorStyle,
        leafCount,
        hardwareStrap,
        hardwareKnocker,
        hardwareKickplate,
        standType,
        windowType,
        reliefDepth,
        reliefMode,
        reliefCanvas
      });
      currentDungeonModel = res.group;
      currentDungeonModel.name = `Dungeon_SingleDoor_${topShape}_${doorStyle}_${leafCount}`;

    } else if (currentDungeonMode === 'maze') {
      const dim = parseInt(document.getElementById('dungeon-maze-dim-slider')?.value || '5', 10);
      const wallHeight = parseFloat(document.getElementById('dungeon-maze-wallh-slider')?.value || '28');
      const algorithm = document.getElementById('dungeon-maze-algo')?.value || 'dfs_classic';
      const corridorFloor = document.getElementById('dungeon-maze-floor-style')?.value || 'flagstone';
      const hasPortals = Boolean(document.getElementById('dungeon-maze-portals-toggle')?.checked);

      const res = DungeonEngine.generateProceduralMaze(dim, dim, { wallHeight, algorithm, corridorFloor, hasPortals, seed: currentMazeSeed });
      currentDungeonModel = res.group;
      currentDungeonModel.name = `Dungeon_Maze_${dim}x${dim}_${algorithm}`;

    } else {
      const propType = document.getElementById('dungeon-prop-type')?.value || 'treasure_chest';
      const res = DungeonEngine.generateDungeonProp(propType);
      currentDungeonModel = res.group;
      currentDungeonModel.name = `Dungeon_Prop_${propType}`;
    }

    if (recenter) {
      CADInspector.centerObject(currentDungeonModel);
      CADInspector.autoGround(currentDungeonModel);
    }

    setModel(currentDungeonModel, `Dungeon_${currentDungeonMode}.glb`);
    showToast(I18N.t('toastDungeonGenerated'), 'success');
  }

  safeOn('btn-generate-dungeon', 'click', () => buildDungeon3D(true));

  // Dungeon Exports
  safeOn('btn-export-dungeon-stl', async () => {
    if (!currentDungeonModel) buildDungeon3D(false);
    exportCurrentModel('stl', `Dungeon_${currentDungeonMode}_Model`);
  });

  safeOn('btn-export-dungeon-glb', () => {
    if (!currentDungeonModel) buildDungeon3D(false);
    exportCurrentModel('glb', `Dungeon_${currentDungeonMode}_Model`);
  });

  // Export 3D Multi-Color .3MF
  safeOn('btn-export-dungeon-3mf', () => {
    if (!currentDungeonModel) buildDungeon3D(false);
    exportCurrentModel('3mf', `Dungeon_${currentDungeonMode}_Model`);
  });

  safeOn('btn-export-dungeon-kit', async () => {
    setLoading(true, "Compiling Modular Dungeon Scenery Kit (.ZIP)...");
    try {
      const zip = new JSZip();
      // 1. Single Flagstone tile 1x1
      const t1x1 = DungeonEngine.generateDungeonTile('flagstone', 1, 1);
      const s1 = new THREE.Scene(); s1.add(new THREE.Mesh(t1x1));
      const stl1 = await ModelConverters.exportModel(s1, 'stl', 'Tile_Flagstone_1x1');
      zip.file('Tile_Flagstone_1x1.stl', stl1.blob);

      // 2. Large Flagstone tile 2x2
      const t2x2 = DungeonEngine.generateDungeonTile('flagstone', 2, 2);
      const s2 = new THREE.Scene(); s2.add(new THREE.Mesh(t2x2));
      const stl2 = await ModelConverters.exportModel(s2, 'stl', 'Tile_Flagstone_2x2');
      zip.file('Tile_Flagstone_2x2.stl', stl2.blob);

      // 3. Cobblestone tile 1x1
      const tcob = DungeonEngine.generateDungeonTile('cobblestone', 1, 1);
      const scob = new THREE.Scene(); scob.add(new THREE.Mesh(tcob));
      const stlCob = await ModelConverters.exportModel(scob, 'stl', 'Tile_Cobblestone_1x1');
      zip.file('Tile_Cobblestone_1x1.stl', stlCob.blob);

      // 4. Wood Planks tile 1x1
      const twood = DungeonEngine.generateDungeonTile('wood_planks', 1, 1);
      const swood = new THREE.Scene(); swood.add(new THREE.Mesh(twood));
      const stlWood = await ModelConverters.exportModel(swood, 'stl', 'Tile_WoodPlanks_1x1');
      zip.file('Tile_WoodPlanks_1x1.stl', stlWood.blob);

      // 5. Ashlar Stone Wall
      const wallRes = DungeonEngine.generateArchitecturalElement('stone_wall');
      const sw = new THREE.Scene(); sw.add(wallRes.group);
      const stlWall = await ModelConverters.exportModel(sw, 'stl', 'Stone_Wall_Ashlar_1x1');
      zip.file('Stone_Wall_Ashlar_1x1.stl', stlWall.blob);

      // 6. Gothic Cathedral Archway
      const archRes = DungeonEngine.generateArchitecturalElement('archway');
      const sArch = new THREE.Scene(); sArch.add(archRes.group);
      const stlArch = await ModelConverters.exportModel(sArch, 'stl', 'Gothic_Archway_1x1');
      zip.file('Gothic_Archway_1x1.stl', stlArch.blob);

      // 7. Working Hinged Door (Print-in-Place)
      const doorRes = DungeonEngine.generateArchitecturalElement('hinged_door', { doorAngle: 30 });
      const sd = new THREE.Scene(); sd.add(doorRes.group);
      const stlDoor = await ModelConverters.exportModel(sd, 'stl', 'Reinforced_Oak_Door_Hinged');
      zip.file('Reinforced_Oak_Door_Hinged.stl', stlDoor.blob);

      // 8. Spiked Iron Prison Portcullis
      const portRes = DungeonEngine.generateArchitecturalElement('portcullis');
      const sPort = new THREE.Scene(); sPort.add(portRes.group);
      const stlPort = await ModelConverters.exportModel(sPort, 'stl', 'Iron_Prison_Portcullis');
      zip.file('Iron_Prison_Portcullis.stl', stlPort.blob);

      // 9. Treasure Chest with Gold Loot
      const chestRes = DungeonEngine.generateDungeonProp('treasure_chest');
      const sChest = new THREE.Scene(); sChest.add(chestRes.group);
      const stlChest = await ModelConverters.exportModel(sChest, 'stl', 'Treasure_Chest_Loot');
      zip.file('Treasure_Chest_Loot.stl', stlChest.blob);

      // 10. Spring-Loaded Spike Trap
      const trapRes = DungeonEngine.generateDungeonProp('spike_trap');
      const sTrap = new THREE.Scene(); sTrap.add(trapRes.group);
      const stlTrap = await ModelConverters.exportModel(sTrap, 'stl', 'Spike_Floor_Trap_1x1');
      zip.file('Spike_Floor_Trap_1x1.stl', stlTrap.blob);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      ModelConverters.triggerDownload(zipBlob, 'Modular_Dungeon_Kit_Master.zip');
      showToast("Modular Dungeon Scenery Kit (.ZIP) exported successfully!", 'success');
    } catch (err) {
      console.error(err);
      showToast("Dungeon Kit export error: " + err.message, 'error');
    } finally {
      setLoading(false);
    }
  });

  safeOn('btn-export-dungeon-html', async () => {
    if (!currentDungeonModel) buildDungeon3D(false);
    setLoading(true, "Generating Standalone Dungeon 3D Viewer...");
    try {
      const activeObj = currentDungeonModel || state.loadedModel;
      const htmlBlob = await ModelConverters.generateStandaloneHTML(activeObj, `Dungeon_${currentDungeonMode}_3D`);
      ModelConverters.triggerDownload(htmlBlob, `Dungeon_${currentDungeonMode}_Viewer.html`);
      showToast(I18N.t('toastHTMLExported'), 'success');
    } catch (err) {
      console.error(err);
      showToast(I18N.t('toastErrorConvert') + err.message, 'error');
    } finally {
      setLoading(false);
    }
  });

  // ----------------------------------------------------
  // Batch Converter (Tab 5)
  // ----------------------------------------------------
  const batchDropzone = document.getElementById('batch-dropzone');
  const batchFileInput = document.getElementById('batch-file-input');
  const batchList = document.getElementById('batch-list');

  batchDropzone.addEventListener('click', () => batchFileInput.click());
  batchDropzone.addEventListener('dragover', (e) => { e.preventDefault(); batchDropzone.classList.add('dragover'); });
  batchDropzone.addEventListener('dragleave', () => batchDropzone.classList.remove('dragover'));
  batchDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    batchDropzone.classList.remove('dragover');
    handleBatchFiles(e.dataTransfer.files);
  });

  batchFileInput.addEventListener('change', (e) => handleBatchFiles(e.target.files));

  function handleBatchFiles(files) {
    for (const file of files) {
      state.batchQueue.push({ file, status: 'pending' });
    }
    renderBatchList();
  }

  function renderBatchList() {
    batchList.innerHTML = '';
    state.batchQueue.forEach((item, idx) => {
      const el = document.createElement('div');
      el.className = 'batch-item';
      el.innerHTML = `
        <span class="batch-item-name">${item.file.name}</span>
        <span class="batch-item-status ${item.status}">${I18N.t('status' + item.status.charAt(0).toUpperCase() + item.status.slice(1))}</span>
      `;
      batchList.appendChild(el);
    });
  }

  document.getElementById('btn-batch-process').addEventListener('click', async () => {
    if (state.batchQueue.length === 0) return;
    const targetFmt = document.getElementById('batch-target-select').value;
    
    setLoading(true, "Processing batch queue...");
    for (let i = 0; i < state.batchQueue.length; i++) {
      const item = state.batchQueue[i];
      try {
        const model = await ModelConverters.loadFile(item.file);
        const { blob, filename } = await ModelConverters.exportModel(model, targetFmt, item.file.name);
        ModelConverters.triggerDownload(blob, filename);
        item.status = 'done';
      } catch (err) {
        console.error(err);
        item.status = 'error';
      }
      renderBatchList();
    }
    setLoading(false);
    showToast("Batch conversion completed!", "success");
  });

  document.getElementById('btn-batch-clear').addEventListener('click', () => {
    state.batchQueue = [];
    renderBatchList();
  });

  // ----------------------------------------------------
  // Viewport Render Mode Buttons
  // ----------------------------------------------------
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      viewer.setRenderMode(btn.dataset.mode);
    });
  });

  // Viewport Floating Tools (Turntable, Slicing, Snapshot)
  const btnTurntable = document.getElementById('tool-turntable');
  btnTurntable.addEventListener('click', () => {
    const active = viewer.toggleTurntable();
    btnTurntable.classList.toggle('active', active);
  });

  const btnSlicing = document.getElementById('tool-slicing');
  const slicingPanel = document.getElementById('slicing-panel');
  const slicingSlider = document.getElementById('slicing-slider');

  btnSlicing.addEventListener('click', () => {
    const isVisible = slicingPanel.classList.toggle('visible');
    btnSlicing.classList.toggle('active', isVisible);
    viewer.setSlicing(isVisible, parseFloat(slicingSlider.value) / 100);
  });

  slicingSlider.addEventListener('input', () => {
    viewer.setSlicing(true, parseFloat(slicingSlider.value) / 100);
  });

  document.getElementById('tool-snapshot').addEventListener('click', () => {
    viewer.captureScreenshot(true);
    showToast("High-Res Snapshot captured!", "success");
  });

  document.getElementById('tool-reset-cam').addEventListener('click', () => {
    viewer.resetCamera();
  });

  // ----------------------------------------------------
  // Material & Studio Controls (Right Sidebar)
  // ----------------------------------------------------
  const colorPicker = document.getElementById('mat-color-picker');
  const metalSlider = document.getElementById('mat-metalness');
  const roughSlider = document.getElementById('mat-roughness');
  const wireframeToggle = document.getElementById('mat-wireframe-toggle');
  const envSelect = document.getElementById('env-preset-select');

  const updateMaterial = () => {
    viewer.updateCustomMaterial({
      color: colorPicker.value,
      metalness: metalSlider.value,
      roughness: roughSlider.value
    });
  };

  colorPicker.addEventListener('input', updateMaterial);
  metalSlider.addEventListener('input', updateMaterial);
  roughSlider.addEventListener('input', updateMaterial);

  wireframeToggle.addEventListener('change', () => {
    viewer.setWireframeOverlay(wireframeToggle.checked);
  });

  envSelect.addEventListener('change', () => {
    viewer.setupLighting(envSelect.value);
  });



  // ----------------------------------------------------
  // Mesh Geometry Transforms (Right Sidebar)
  // ----------------------------------------------------
  safeOn('btn-tool-center', 'click', () => {
    if (!state.loadedModel) {
      showToast(I18N.t('toastNoModel'), 'warning');
      return;
    }
    CADInspector.centerObject(state.loadedModel);
    viewer.setModel(state.loadedModel);
    updateMeshMetrics(state.loadedModel);
    showToast("Centered at origin", "info");
  });

  safeOn('btn-tool-ground', 'click', () => {
    if (!state.loadedModel) {
      showToast(I18N.t('toastNoModel'), 'warning');
      return;
    }
    CADInspector.autoGround(state.loadedModel);
    viewer.setModel(state.loadedModel);
    updateMeshMetrics(state.loadedModel);
    showToast("Model grounded at Y=0", "info");
  });

  safeOn('btn-tool-normals', 'click', () => {
    if (!state.loadedModel) {
      showToast(I18N.t('toastNoModel'), 'warning');
      return;
    }
    CADInspector.invertNormals(state.loadedModel);
    viewer.setModel(state.loadedModel);
    updateMeshMetrics(state.loadedModel);
    showToast("Normals flipped", "info");
  });

  safeOn('btn-tool-scale-up', 'click', () => {
    if (!state.loadedModel) {
      showToast(I18N.t('toastNoModel'), 'warning');
      return;
    }
    CADInspector.scaleObject(state.loadedModel, 10);
    viewer.setModel(state.loadedModel);
    updateMeshMetrics(state.loadedModel);
    showToast("Scaled 10x", "info");
  });

  safeOn('btn-tool-scale-down', 'click', () => {
    if (!state.loadedModel) {
      showToast(I18N.t('toastNoModel'), 'warning');
      return;
    }
    CADInspector.scaleObject(state.loadedModel, 0.1);
    viewer.setModel(state.loadedModel);
    updateMeshMetrics(state.loadedModel);
    showToast("Scaled 0.1x", "info");
  });

  safeOn('btn-tool-reset', 'click', () => {
    if (!state.loadedModel) return;
    if (state.originalModelBackup) {
      state.loadedModel = state.originalModelBackup.clone(true);
    }
    CADInspector.resetNodeTransforms(state.loadedModel);
    viewer.setModel(state.loadedModel);
    updateMeshMetrics(state.loadedModel);
    showToast("Transforms reset to original", "info");
  });

  function notifyModelTransformed(resetCam = false) {
    if (!state.loadedModel) return;
    if (resetCam) {
      viewer.fitCameraToModel();
    }
    viewer.applyRenderMode();
    updateMeshMetrics(state.loadedModel);
  }

  // AR Stand Upright & Rotation Tools
  safeOn('btn-tool-stand', 'click', () => {
    if (!state.loadedModel) {
      showToast(I18N.t('toastNoModel'), 'warning');
      return;
    }
    CADInspector.rotateObject(state.loadedModel, 'x', 90);
    notifyModelTransformed(false);
    showToast("Tilted 90° to Stand on Floor (+Y)", "success");
  });

  safeOn('btn-tool-flip-y', 'click', () => {
    if (!state.loadedModel) {
      showToast(I18N.t('toastNoModel'), 'warning');
      return;
    }
    CADInspector.rotateObject(state.loadedModel, 'y', 180);
    notifyModelTransformed(false);
    showToast("Flipped 180° (Facing Front/Back)", "info");
  });

  safeOn('btn-tool-rot-x', 'click', () => {
    if (!state.loadedModel) {
      showToast(I18N.t('toastNoModel'), 'warning');
      return;
    }
    CADInspector.rotateObject(state.loadedModel, 'x', 90);
    notifyModelTransformed(false);
    showToast("Rotated 90° X (Tilt)", "info");
  });

  safeOn('btn-tool-rot-y', 'click', () => {
    if (!state.loadedModel) {
      showToast(I18N.t('toastNoModel'), 'warning');
      return;
    }
    CADInspector.rotateObject(state.loadedModel, 'y', 90);
    notifyModelTransformed(false);
    showToast("Rotated 90° Y (Turn)", "info");
  });

  safeOn('btn-tool-rot-z', 'click', () => {
    if (!state.loadedModel) {
      showToast(I18N.t('toastNoModel'), 'warning');
      return;
    }
    CADInspector.rotateObject(state.loadedModel, 'z', 90);
    notifyModelTransformed(false);
    showToast("Rotated 90° Z (Roll)", "info");
  });

  safeOn('btn-tool-scale-ar', 'click', () => {
    if (!state.loadedModel) {
      showToast(I18N.t('toastNoModel'), 'warning');
      return;
    }
    CADInspector.scaleForAR(state.loadedModel, 0.30);
    viewer.setModel(state.loadedModel);
    updateMeshMetrics(state.loadedModel);
    showToast("Scaled to 30cm for Mobile AR!", "info");
  });

  function applyBasePlateRemoval(customCutoff = null) {
    if (!state.loadedModel) {
      showToast(I18N.t('toastNoModel'), 'warning');
      return;
    }
    
    // Always start from a clean copy of the original model if available
    if (state.originalModelBackup) {
      state.loadedModel = state.originalModelBackup.clone(true);
    }

    const cutoffSlider = document.getElementById('plate-cutoff-slider');
    const axisSelect = document.getElementById('plate-cutoff-axis');
    const cutoffRatio = customCutoff !== null ? customCutoff : (cutoffSlider ? parseFloat(cutoffSlider.value) / 100.0 : 0.25);
    const selectedAxis = (axisSelect && axisSelect.value !== 'auto') ? axisSelect.value : null;

    setLoading(true, "Isolating 3D model & removing base plate...");
    setTimeout(() => {
      const removed = CADInspector.removeBasePlate(state.loadedModel, cutoffRatio, { axis: selectedAxis });
      viewer.setModel(state.loadedModel);
      updateMeshMetrics(state.loadedModel);
      setLoading(false);
      if (removed > 0) {
        showToast(I18N.t('toastBaseRemoved', { count: removed.toLocaleString() }), 'success');
      } else {
        showToast(I18N.t('toastNoBaseDetected'), 'info');
      }
    }, 60);
  }

  safeOn('btn-tool-remove-base', 'click', () => applyBasePlateRemoval());

  // Trim preset buttons (15%, 30%, 45%)
  document.querySelectorAll('.trim-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = parseFloat(btn.dataset.cutoff);
      const cutoffSlider = document.getElementById('plate-cutoff-slider');
      if (cutoffSlider) {
        cutoffSlider.value = val;
        const valSpan = document.getElementById('plate-cutoff-slider-val');
        if (valSpan) valSpan.textContent = `${val}%`;
      }
      applyBasePlateRemoval(val / 100.0);
    });
  });

  // Undo / Restore Original button
  safeOn('btn-tool-restore-base', 'click', () => {
    if (state.originalModelBackup) {
      state.loadedModel = state.originalModelBackup.clone(true);
      viewer.setModel(state.loadedModel);
      updateMeshMetrics(state.loadedModel);
      showToast("Restored original model", "info");
    }
  });

  // ----------------------------------------------------
  // Mesh Optimization & Scale Units
  // ----------------------------------------------------
  let activeDecimateRatio = 0.50;
  document.querySelectorAll('.decimate-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.decimate-preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeDecimateRatio = parseFloat(btn.dataset.ratio);
      const valSpan = document.getElementById('decimate-slider-val');
      if (valSpan) valSpan.textContent = `${Math.round(activeDecimateRatio * 100)}%`;
    });
  });

  safeOn('btn-mesh-decimate', 'click', () => {
    if (!state.loadedModel) {
      showToast(I18N.t('toastNoModel'), 'warning');
      return;
    }
    setLoading(true, "Optimizing & simplifying 3D mesh...");
    setTimeout(() => {
      const res = CADInspector.decimateMesh(state.loadedModel, activeDecimateRatio);
      viewer.setModel(state.loadedModel);
      updateMeshMetrics(state.loadedModel);
      setLoading(false);
      showToast(I18N.t('toastDecimated', { count: res.after.toLocaleString(), reduction: res.reduction }), 'success');
    }, 60);
  });

  // Unit Scaling Presets
  document.querySelectorAll('.unit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!state.loadedModel) {
        showToast(I18N.t('toastNoModel'), 'warning');
        return;
      }
      const factor = parseFloat(btn.dataset.factor);
      CADInspector.convertUnits(state.loadedModel, factor);
      viewer.setModel(state.loadedModel);
      updateMeshMetrics(state.loadedModel);
      showToast(I18N.t('toastUnitsConverted', { factor: factor, unit: btn.textContent }), 'info');
    });
  });

  // ----------------------------------------------------
  // Quick Export Buttons (Right Sidebar)
  // ----------------------------------------------------
  const quickExports = [
    { id: 'quick-export-glb', format: 'glb' },
    { id: 'quick-export-stl', format: 'stl' },
    { id: 'quick-export-3mf', format: '3mf' },
    { id: 'quick-export-usdz', format: 'usdz' },
    { id: 'quick-export-ply', format: 'ply' },
    { id: 'quick-export-obj', format: 'obj' },
    { id: 'quick-export-dxf', format: 'dxf' },
    { id: 'quick-export-svg', format: 'svg' },
    { id: 'quick-export-depthmap', format: 'depthmap' },
    { id: 'quick-export-html', format: 'html' }
  ];

  quickExports.forEach(({ id, format }) => {
    safeOn(id, 'click', async () => {
      if (!state.loadedModel) {
        showToast(I18N.t('toastNoModel'), 'warning');
        return;
      }
      setLoading(true, `Exporting ${format.toUpperCase()}...`);
      try {
        const { blob, filename } = await ModelConverters.exportModel(state.loadedModel, format, state.currentFileName);
        ModelConverters.triggerDownload(blob, filename);
        if (format === 'html') {
          showToast(I18N.t('toastHTMLExported'), 'success');
        } else {
          showToast(I18N.t('toastConvertSuccess', { format: format.toUpperCase() }), 'success');
        }
      } catch (err) {
        console.error(err);
        showToast(I18N.t('toastErrorConvert') + err.message, 'error');
      } finally {
        setLoading(false);
      }
    });
  });

  // Export AR Universe — HTML Standalone Viewer
  safeOn('btn-export-ar-html', 'click', async () => {
    if (!currentArModel && (!viewer || !viewer.currentModel)) {
      buildARExperience3D(false);
    }
    const model = currentArModel || state.loadedModel || (viewer && viewer.currentModel);
    if (!model) { showToast(I18N.t('toastNoModel'), 'warning'); return; }
    const exp = document.getElementById('ar-experience-select')?.value || 'ar_model';
    setLoading(true, 'Generating Standalone HTML 3D Viewer...');
    try {
      const htmlBlob = await ModelConverters.generateStandaloneHTML(model, `AR_${exp}`);
      ModelConverters.triggerDownload(htmlBlob, `AR_${exp}_3D_viewer.html`);
      showToast(I18N.t('toastHTMLExported'), 'success');
    } catch (err) {
      console.error(err);
      showToast(I18N.t('toastErrorConvert') + err.message, 'error');
    } finally {
      setLoading(false);
    }
  });

  // Export Draw 3D — HTML Standalone Viewer
  safeOn('btn-export-draw3d-html', 'click', async () => {
    if (!currentDrawModel) buildDraw3DModel(false);
    const model = currentDrawModel || state.loadedModel;
    if (!model) { showToast(I18N.t('toastNoModel'), 'warning'); return; }
    const mode = document.getElementById('draw3d-mode-select')?.value || 'model';
    setLoading(true, 'Generating Standalone HTML 3D Viewer...');
    try {
      const htmlBlob = await ModelConverters.generateStandaloneHTML(model, `Draw3D_${mode}`);
      ModelConverters.triggerDownload(htmlBlob, `Draw3D_${mode}_3D_viewer.html`);
      showToast(I18N.t('toastHTMLExported'), 'success');
    } catch (err) {
      console.error(err);
      showToast(I18N.t('toastErrorConvert') + err.message, 'error');
    } finally {
      setLoading(false);
    }
  });

  // ----------------------------------------------------
  // 360° Video Recording & AR QR Modal
  // ----------------------------------------------------
  safeOn('tool-record-video', 'click', async () => {
    if (!state.loadedModel) {
      showToast(I18N.t('toastNoModel'), 'warning');
      return;
    }
    showToast(I18N.t('toastRecordingStarted'), 'info');
    try {
      const blob = await viewer.record360Video(5);
      ModelConverters.triggerDownload(blob, `${state.currentFileName.replace(/\.[^/.]+$/, "")}_360_Video.webm`);
      showToast(I18N.t('toastRecordingSaved'), 'success');
    } catch (err) {
      console.error(err);
      showToast("Recording error: " + err.message, 'error');
    }
  });

  safeOn('tool-ar-qr', 'click', () => {
    const modal = document.getElementById('ar-qr-modal');
    const container = document.getElementById('qrcode-container');
    if (!modal || !container) return;

    container.innerHTML = '';
    if (window.QRCode) {
      new window.QRCode(container, {
        text: window.location.href,
        width: 180,
        height: 180,
        colorDark: "#0b0f19",
        colorLight: "#ffffff",
        correctLevel: window.QRCode.CorrectLevel.M
      });
    } else {
      container.innerHTML = `<span style="color:#000; font-size: 0.8rem;">${window.location.href}</span>`;
    }
    modal.style.display = 'flex';
  });

  safeOn('btn-close-ar-qr', 'click', () => {
    const modal = document.getElementById('ar-qr-modal');
    if (modal) modal.style.display = 'none';
  });

  const triggerARFileExport = async (format) => {
    if (!state.loadedModel) {
      showToast(I18N.t('toastNoModel'), 'warning');
      return;
    }
    setLoading(true, `Exporting AR ${format.toUpperCase()} with baked HD textures...`);
    try {
      const { blob, filename } = await ModelConverters.exportModel(state.loadedModel, format, state.currentFileName || 'AR_Model');
      ModelConverters.triggerDownload(blob, filename);
      showToast(I18N.t('toastConvertSuccess', { format: format.toUpperCase() }), 'success');
    } catch (err) {
      console.error(err);
      showToast(I18N.t('toastErrorConvert') + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  safeOn('btn-export-photo-ar-glb', 'click', () => triggerARFileExport('glb'));
  safeOn('btn-export-photo-ar-usdz', 'click', () => triggerARFileExport('usdz'));
  safeOn('btn-modal-export-glb', 'click', () => triggerARFileExport('glb'));
  safeOn('btn-modal-export-usdz', 'click', () => triggerARFileExport('usdz'));

  safeOn('btn-copy-ar-link', 'click', () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      showToast(I18N.t('toastCopied'), 'success');
    });
  });

  // ----------------------------------------------------
  // Sidebar Toggles
  // ----------------------------------------------------
  const leftSidebar = document.querySelector('.sidebar:not(.right-sidebar)');
  const rightSidebar = document.querySelector('.right-sidebar');

  safeOn('toggle-left-sidebar', 'click', () => {
    if (leftSidebar) leftSidebar.classList.toggle('collapsed-left');
  });

  safeOn('toggle-right-sidebar', 'click', () => {
    if (rightSidebar) rightSidebar.classList.toggle('collapsed-right');
  });

  // Guarantee mouse wheel scroll on both sidebars
  document.querySelectorAll('.sidebar-body').forEach(bodyEl => {
    bodyEl.addEventListener('wheel', (e) => {
      bodyEl.scrollTop += e.deltaY;
    }, { passive: true });
  });

  // Collapsible Section Headers (Click header to toggle expand/collapse)
  document.querySelectorAll('.panel-section .section-header').forEach(header => {
    header.addEventListener('click', (e) => {
      if (e.target.closest('button, input, select')) return;
      header.parentElement.classList.toggle('is-collapsed');
    });
  });

  // ----------------------------------------------------
  // Load Default Starter Model (High-detail 3D Gear)
  // ----------------------------------------------------
  try {
    const initialMesh = ModelGenerators.generateParametric('gear', { teeth: 18 });
    CADInspector.centerObject(initialMesh);
    CADInspector.autoGround(initialMesh);
    setModel(initialMesh, 'PolyMorph_Gear.glb');
    console.log("PolyMorph 3D Studio initialized successfully!");
  } catch (err) {
    console.error("Failed to load initial model:", err);
  }

  // ── Expose setModel for engine modules (Portrait, Handwriting, Terrain, etc.) ──
  // This does NOT modify any existing function — it only adds a new global hook.
  window.__polymorphSetModel = function(object3D, filename) {
    setModel(object3D, filename || 'model', true);
  };
  window.__polymorphGetModel = function() {
    return (window.Viewer && window.Viewer.currentModel) || state.loadedModel;
  };
});
