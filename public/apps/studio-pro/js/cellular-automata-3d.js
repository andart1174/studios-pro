// Cellular Automata (Game of Life 3D)
window.CellularAutomata3D = (() => {
  'use strict';
  let _container, _panel;

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'automata3d-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;border-radius:8px;overflow-y:auto;';
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#f43f5e,#fb923c);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">🧬</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'Cellular Automata Tower' : 'Tour d\\'Automates Cellulaires'}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'Game of Life extruded in Z' : 'Jeu de la vie extrudé en Z'}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Grid Size' : 'Taille Grille'} <b id="auto-gv">20</b></div>
          <input type="range" id="auto3d-grid" min="10" max="40" value="20" style="width:100%;accent-color:#f43f5e;">
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Generations (Max 25)' : 'Générations (Max 25)'} <b id="auto-nv">15</b></div>
          <input type="range" id="auto3d-gen" min="5" max="25" value="15" style="width:100%;accent-color:#fb923c;">
        </div>
      </div>
      <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${isEN ? 'Initial State Density:' : 'Densité de l\\'État Initial:'} <b id="auto-dv">30%</b></div>
      <input type="range" id="auto3d-dens" min="5" max="60" value="30" style="width:100%;accent-color:#e11d48;margin-bottom:10px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Voxel Style' : 'Style Voxel'}</div>
          <select id="auto3d-style" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
            <option value="cube">${isEN ? 'Cubes' : 'Cubes'}</option>
            <option value="cylinder">${isEN ? 'Cylinders' : 'Cylindres'}</option>
            <option value="sphere">${isEN ? 'Spheres' : 'Sphères'}</option>
          </select>
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Color Map' : 'Palette Couleurs'}</div>
          <select id="auto3d-cmap" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
            <option value="heat">${isEN ? 'Heat (Time)' : 'Chaleur (Temps)'}</option>
            <option value="cyber">Cyberpunk</option>
            <option value="mono">${isEN ? 'Monochrome' : 'Monochrome'}</option>
          </select>
        </div>
      </div>
      <label style="display:flex;align-items:center;cursor:pointer;font-size:11px;color:#fb923c;margin-bottom:10px;">
        <input type="checkbox" id="auto3d-wire" style="width:auto;margin-right:8px;"> 🔳 ${isEN ? 'Wireframe Mode' : 'Mode Filaire'}
      </label>
      <button id="auto3d-add" style="width:100%;padding:12px;background:linear-gradient(135deg,#f43f5e,#fb923c);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">
        ${isEN ? '🧬 GENERATE LIFE TOWER' : '🧬 GÉNÉRER TOUR DE VIE'}
      </button>`;
    _container.appendChild(_panel);
    _bindUI();
  }

  function _bindUI() {
    _panel.querySelector('#auto3d-grid').addEventListener('input', e => _panel.querySelector('#auto-gv').textContent = e.target.value);
    _panel.querySelector('#auto3d-gen').addEventListener('input', e => _panel.querySelector('#auto-nv').textContent = e.target.value);
    _panel.querySelector('#auto3d-dens').addEventListener('input', e => _panel.querySelector('#auto-dv').textContent = e.target.value+'%');
    
    _panel.querySelector('#auto3d-add').onclick = () => {
      const gridSize = +_panel.querySelector('#auto3d-grid').value;
      const generations = +_panel.querySelector('#auto3d-gen').value;
      const density = +_panel.querySelector('#auto3d-dens').value / 100;
      const voxelStyle = _panel.querySelector('#auto3d-style').value;
      const colorMap = _panel.querySelector('#auto3d-cmap').value;
      const isWire = _panel.querySelector('#auto3d-wire').checked;
      
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('cellular-automata', { gridSize, generations, density, voxelStyle, colorMap, isWire });
        _panel.style.display = 'none';
      }
    };
  }

  function init(container, btn) {
    _container = container; buildUI();
    if (btn) btn.addEventListener('click', () => {
      const visible = _panel.style.display === 'flex';
      document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display = 'none');
      _panel.style.display = visible ? 'none' : 'flex'; _panel.style.flexDirection = 'column';
    });
  }
  return { init };
})();
