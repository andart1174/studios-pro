// Neural Network → 3D Visualization
window.NeuralNet3D = (() => {
  'use strict';
  let _container, _panel;

  const i18n = {
    en: {
      title: 'Neural Net & Brain',
      subtitle: '3D Hologram & Cybernetic Synapses',
      layout: 'Network Architecture',
      cortex: 'Cortex Core 🧠',
      grid: 'Convolutional Matrix 🔲',
      layered: 'Deep Learning Layer 🕸️',
      style: 'Neuron Style',
      spheres: 'Spheres 🔮',
      cubes: 'Cubes 🧊',
      rings: 'Rings 🍩',
      color: 'Neon Color Scheme',
      cyber: 'Cyber Blue 💎',
      pink: 'Neon Pink 🌸',
      green: 'Matrix Green 🔋',
      fire: 'Solar Fire 🔥',
      size: 'Neuron Size',
      density: 'Neuron Density',
      animate: '⚡ Animate electrical impulse flow',
      build: '🧠 GENERATE 3D SCENE',
      arch: 'Feedforward Architecture (separated by dash)',
      examples: '💡 Ex: 3-128-64-10 (MNIST) | 2-4-1 (XOR)'
    },
    fr: {
      title: 'Réseau Neural & Cerveau',
      subtitle: 'Hologramme 3D & Synapses Cybernétiques',
      layout: 'Architecture du Réseau',
      cortex: 'Noyau de Cortex 🧠',
      grid: 'Matrice Convolutionnelle 🔲',
      layered: 'Couche Deep Learning 🕸️',
      style: 'Style de Neurone',
      spheres: 'Sphères 🔮',
      cubes: 'Cubes 🧊',
      rings: 'Anneaux 🍩',
      color: 'Couleur Néon',
      cyber: 'Bleu Cyber 💎',
      pink: 'Rose Néon 🌸',
      green: 'Vert Matrix 🔋',
      fire: 'Feu Solaire 🔥',
      size: 'Taille de Neurone',
      density: 'Densité de Neurones',
      animate: '⚡ Animer le flux impulsionnel électrique',
      build: '🧠 GÉNÉRER LA SCÈNE 3D',
      arch: 'Architecture Feedforward (séparée par tiret)',
      examples: '💡 Ex: 3-128-64-10 (MNIST) | 2-4-1 (XOR)'
    }
  };

  function getLang() {
    return (window.currentLang || 'en') === 'fr' ? 'fr' : 'en';
  }

  function buildUI() {
    const lang = getLang();
    const t = i18n[lang];
    
    _panel = document.createElement('div');
    _panel.id = 'neuralnet3d-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(10,15,30,0.85);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.08);box-shadow:0 8px 32px 0 rgba(0,0,0,0.45);z-index:100;padding:18px;font-family:\'Outfit\',\'Inter\',sans-serif;color:#f1f5f9;border-radius:12px;overflow-y:auto;flex-direction:column;gap:12px;';
    
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:12px;">
        <div style="width:38px;height:38px;background:linear-gradient(135deg,#06b6d4,#8b5cf6);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow: 0 0 15px rgba(6,182,212,0.4);">🧠</div>
        <div>
          <div style="font-size:15px;font-weight:800;letter-spacing:0.5px;background:linear-gradient(90deg,#22d3ee,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;" id="nn-panel-title">${t.title}</div>
          <div style="font-size:10px;color:#94a3b8;font-weight:500;" id="nn-panel-subtitle">${t.subtitle}</div>
        </div>
      </div>

      <div>
        <div style="font-size:11px;color:#94a3b8;margin-bottom:5px;font-weight:600;" id="nn-lbl-layout">${t.layout}</div>
        <select id="neuralnet3d-layout" style="width:100%;padding:10px;background:#131a35;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#f1f5f9;font-size:12px;outline:none;cursor:pointer;transition:border-color 0.2s;">
          <option value="cortex">${t.cortex}</option>
          <option value="grid">${t.grid}</option>
          <option value="layered">${t.layered}</option>
        </select>
      </div>

      <div id="neuralnet3d-arch-container" style="display:none;">
        <div style="font-size:11px;color:#94a3b8;margin-bottom:5px;font-weight:600;" id="nn-lbl-arch">${t.arch}</div>
        <input type="text" id="neuralnet3d-arch" value="8-16-16-8" style="width:100%;padding:10px;background:#131a35;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#22d3ee;font-size:13px;font-family:monospace;letter-spacing:1px;outline:none;">
        <div style="font-size:9px;color:#64748b;margin-top:4px;" id="nn-lbl-examples">${t.examples}</div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div>
          <div style="font-size:11px;color:#94a3b8;margin-bottom:5px;font-weight:600;" id="nn-lbl-style">${t.style}</div>
          <select id="neuralnet3d-nstyle" style="width:100%;padding:10px;background:#131a35;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#f1f5f9;font-size:12px;outline:none;cursor:pointer;">
            <option value="sphere">${t.spheres}</option>
            <option value="cube">${t.cubes}</option>
            <option value="torus">${t.rings}</option>
          </select>
        </div>
        <div>
          <div style="font-size:11px;color:#94a3b8;margin-bottom:5px;font-weight:600;" id="nn-lbl-color">${t.color}</div>
          <select id="neuralnet3d-color" style="width:100%;padding:10px;background:#131a35;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#f1f5f9;font-size:12px;outline:none;cursor:pointer;">
            <option value="cyber">${t.cyber}</option>
            <option value="neon">${t.pink}</option>
            <option value="matrix">${t.green}</option>
            <option value="fire">${t.fire}</option>
          </select>
        </div>
      </div>

      <div>
        <div style="display:flex;justify-content:between;align-items:center;margin-bottom:5px;">
          <div style="font-size:11px;color:#94a3b8;font-weight:600;flex-grow:1;" id="nn-lbl-size">${t.size}</div>
          <span id="nn-sv" style="font-size:11px;color:#22d3ee;font-weight:700;">3</span>
        </div>
        <input type="range" id="neuralnet3d-nsize" min="1" max="8" value="3" style="width:100%;accent-color:#22d3ee;cursor:pointer;">
      </div>

      <div id="neuralnet3d-density-container">
        <div style="display:flex;justify-content:between;align-items:center;margin-bottom:5px;">
          <div style="font-size:11px;color:#94a3b8;font-weight:600;flex-grow:1;" id="nn-lbl-density">${t.density}</div>
          <span id="nn-dv" style="font-size:11px;color:#22d3ee;font-weight:700;">100</span>
        </div>
        <input type="range" id="neuralnet3d-detail" min="20" max="200" value="100" style="width:100%;accent-color:#22d3ee;cursor:pointer;">
      </div>

      <label style="display:flex;align-items:center;cursor:pointer;font-size:12px;color:#a78bfa;user-select:none;margin-top:4px;">
        <input type="checkbox" id="neuralnet3d-animate" checked style="margin-right:8px;width:15px;height:15px;accent-color:#8b5cf6;cursor:pointer;">
        <span id="nn-lbl-animate">${t.animate}</span>
      </label>

      <button id="neuralnet3d-add" style="width:100%;padding:14px;background:linear-gradient(135deg,#06b6d4,#8b5cf6);border:none;border-radius:10px;color:#fff;font-size:13px;font-weight:800;cursor:pointer;box-shadow: 0 4px 15px rgba(139,92,246,0.35);transition:transform 0.15s, box-shadow 0.15s;margin-top:10px;">
        ${t.build}
      </button>
    `;

    _container.appendChild(_panel);
    _bindUI();
  }

  function syncInputsFromActiveModel() {
    if (!window.SketchExtruder || !window.SketchExtruder.getActiveModel) return;
    const act = window.SketchExtruder.getActiveModel();
    if (act && act.format === 'neural-net') {
      window._nn3ModelId = act.id;
      
      const layoutSel = _panel.querySelector('#neuralnet3d-layout');
      const archIn = _panel.querySelector('#neuralnet3d-arch');
      const styleSel = _panel.querySelector('#neuralnet3d-nstyle');
      const colorSel = _panel.querySelector('#neuralnet3d-color');
      const sizeSld = _panel.querySelector('#neuralnet3d-nsize');
      const detailSld = _panel.querySelector('#neuralnet3d-detail');
      const animChk = _panel.querySelector('#neuralnet3d-animate');
      const archContainer = _panel.querySelector('#neuralnet3d-arch-container');
      const densityContainer = _panel.querySelector('#neuralnet3d-density-container');

      if (act.netLayout) layoutSel.value = act.netLayout;
      if (act.layers) archIn.value = act.layers.join('-');
      if (act.neuronStyle) styleSel.value = act.neuronStyle;
      if (act.colorMode) colorSel.value = act.colorMode;
      if (act.neuronSize) {
        sizeSld.value = act.neuronSize;
        _panel.querySelector('#nn-sv').textContent = act.neuronSize;
      }
      if (act.detail !== undefined) {
        detailSld.value = act.detail;
        _panel.querySelector('#nn-dv').textContent = act.detail;
      }
      if (act.doAnimate !== undefined) animChk.checked = act.doAnimate;

      // toggle containers visibility
      if (layoutSel.value === 'layered') {
        archContainer.style.display = 'block';
        densityContainer.style.display = 'none';
      } else {
        archContainer.style.display = 'none';
        densityContainer.style.display = 'block';
      }
    }
  }

  function triggerLiveUpdate() {
    if (!window.SketchExtruder || !window.SketchExtruder.getActiveModel || !window._nn3UpdateModel) return;
    const act = window.SketchExtruder.getActiveModel();
    if (act && act.format === 'neural-net') {
      const config = getUIConfig();
      window._nn3UpdateModel(act.id, config);
    }
  }

  function getUIConfig() {
    const layout = _panel.querySelector('#neuralnet3d-layout').value;
    const archStr = _panel.querySelector('#neuralnet3d-arch').value || '8-16-16-8';
    const layers = archStr.split('-').map(v => Math.max(1, Math.min(+v || 4, 100)));
    const neuronStyle = _panel.querySelector('#neuralnet3d-nstyle').value;
    const colorMode = _panel.querySelector('#neuralnet3d-color').value;
    const neuronSize = +_panel.querySelector('#neuralnet3d-nsize').value;
    const detail = +_panel.querySelector('#neuralnet3d-detail').value;
    const doAnimate = _panel.querySelector('#neuralnet3d-animate').checked;

    return {
      layers,
      neuronStyle,
      colorMode,
      neuronSize,
      doAnimate,
      netLayout: layout,
      detail
    };
  }

  function _bindUI() {
    const layoutSel = _panel.querySelector('#neuralnet3d-layout');
    const archContainer = _panel.querySelector('#neuralnet3d-arch-container');
    const densityContainer = _panel.querySelector('#neuralnet3d-density-container');
    const sizeSld = _panel.querySelector('#neuralnet3d-nsize');
    const detailSld = _panel.querySelector('#neuralnet3d-detail');

    // Layout change
    layoutSel.addEventListener('change', () => {
      if (layoutSel.value === 'layered') {
        archContainer.style.display = 'block';
        densityContainer.style.display = 'none';
      } else {
        archContainer.style.display = 'none';
        densityContainer.style.display = 'block';
      }
      triggerLiveUpdate();
    });

    // Inputs value updates
    sizeSld.addEventListener('input', e => {
      _panel.querySelector('#nn-sv').textContent = e.target.value;
      triggerLiveUpdate();
    });
    detailSld.addEventListener('input', e => {
      _panel.querySelector('#nn-dv').textContent = e.target.value;
      triggerLiveUpdate();
    });

    // Wire up real-time live updates on select/checkbox modifications
    _panel.querySelector('#neuralnet3d-arch').addEventListener('input', triggerLiveUpdate);
    _panel.querySelector('#neuralnet3d-nstyle').addEventListener('change', triggerLiveUpdate);
    _panel.querySelector('#neuralnet3d-color').addEventListener('change', triggerLiveUpdate);
    _panel.querySelector('#neuralnet3d-animate').addEventListener('change', triggerLiveUpdate);

    // Build/Save Button
    _panel.querySelector('#neuralnet3d-add').onclick = () => {
      const config = getUIConfig();
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        const act = window.SketchExtruder.getActiveModel ? window.SketchExtruder.getActiveModel() : null;
        if (act && act.format === 'neural-net') {
          window._nn3UpdateModel(act.id, config);
          if (window.toast) {
            const isFR = getLang() === 'fr';
            window.toast(isFR ? '✨ Cerveau mis à jour !' : '✨ Brain updated!');
          }
        } else {
          const newId = window.SketchExtruder.addExtraModule('neural-net', config);
          window._nn3ModelId = newId;
        }
        _panel.style.display = 'none';
      }
    };
  }

  function init(container, btn) {
    _container = container; 
    buildUI();
    
    if (btn) {
      btn.addEventListener('click', () => {
        const visible = _panel.style.display === 'flex';
        document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display = 'none');
        
        if (visible) {
          _panel.style.display = 'none';
        } else {
          _panel.style.display = 'flex'; 
          _panel.style.flexDirection = 'column';
          
          const lang = getLang();
          const t = i18n[lang];
          _panel.querySelector('#nn-panel-title').innerHTML = t.title;
          _panel.querySelector('#nn-panel-subtitle').textContent = t.subtitle;
          _panel.querySelector('#nn-lbl-layout').textContent = t.layout;
          _panel.querySelector('#nn-lbl-arch').textContent = t.arch;
          _panel.querySelector('#nn-lbl-examples').textContent = t.examples;
          _panel.querySelector('#nn-lbl-style').textContent = t.style;
          _panel.querySelector('#nn-lbl-color').textContent = t.color;
          _panel.querySelector('#nn-lbl-size').textContent = t.size;
          _panel.querySelector('#nn-lbl-density').textContent = t.density;
          _panel.querySelector('#nn-lbl-animate').textContent = t.animate;
          _panel.querySelector('#neuralnet3d-add').textContent = t.build;

          const layoutOptions = _panel.querySelectorAll('#neuralnet3d-layout option');
          layoutOptions[0].textContent = t.cortex;
          layoutOptions[1].textContent = t.grid;
          layoutOptions[2].textContent = t.layered;

          const styleOptions = _panel.querySelectorAll('#neuralnet3d-nstyle option');
          styleOptions[0].textContent = t.spheres;
          styleOptions[1].textContent = t.cubes;
          styleOptions[2].textContent = t.rings;

          const colorOptions = _panel.querySelectorAll('#neuralnet3d-color option');
          colorOptions[0].textContent = t.cyber;
          colorOptions[1].textContent = t.pink;
          colorOptions[2].textContent = t.green;
          colorOptions[3].textContent = t.fire;
          
          syncInputsFromActiveModel();
        }
      });
    }
  }
  return { init };
})();
