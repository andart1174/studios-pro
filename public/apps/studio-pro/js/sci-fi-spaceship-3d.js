// Sci-Fi Spaceship Generator
window.SciFiSpaceship3D = (() => {
  'use strict';
  let _container, _panel;

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'spaceship3d-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;border-radius:8px;overflow-y:auto;';
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#94a3b8,#3b82f6);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">🚀</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'Sci-Fi Spaceship' : 'Vaisseau Spatial Sci-Fi'}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'Procedural voxel fleet' : 'Flotte voxel procédurale'}</div>
        </div>
      </div>
      <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${isEN ? 'Seed (Type any word for a unique ship):' : 'Graine (Tapez un mot pour un vaisseau unique):'}</div>
      <input type="text" id="ship3d-seed" placeholder="Valkyrie-7" style="width:100%;padding:8px;background:#1e293b;border:1px solid #334155;border-radius:6px;color:#60a5fa;font-size:14px;font-family:monospace;margin-bottom:10px;">
      
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Ship Class' : 'Classe du Vaisseau'}</div>
          <select id="ship3d-class" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
            <option value="fighter">${isEN ? 'Fighter (Fast, Sleek)' : 'Chasseur (Rapide)'}</option>
            <option value="cruiser">${isEN ? 'Cruiser (Heavy, Wide)' : 'Croiseur (Lourd)'}</option>
            <option value="cargo">${isEN ? 'Cargo (Blocky, Long)' : 'Cargo (Massif)'}</option>
            <option value="station">${isEN ? 'Space Station' : 'Station Spatiale'}</option>
          </select>
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Color Palette' : 'Palette Couleurs'}</div>
          <select id="ship3d-color" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
            <option value="empire">${isEN ? 'Empire (Grey & Red)' : 'Empire (Gris & Rouge)'}</option>
            <option value="rebel">${isEN ? 'Rebel (White & Orange)' : 'Rebelle (Blanc & Orange)'}</option>
            <option value="alien">${isEN ? 'Alien (Dark & Green)' : 'Alien (Sombre & Vert)'}</option>
            <option value="neon">Cyberpunk Neon</option>
          </select>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Complexity' : 'Complexité'} <b id="ship-cv">5</b></div>
          <input type="range" id="ship3d-comp" min="3" max="12" value="5" style="width:100%;accent-color:#3b82f6;">
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Detail Level' : 'Niveau Détail'} <b id="ship-dv">High</b></div>
          <input type="range" id="ship3d-detail" min="1" max="3" value="3" style="width:100%;accent-color:#94a3b8;">
        </div>
      </div>
      <label style="display:flex;align-items:center;cursor:pointer;font-size:11px;color:#93c5fd;margin-bottom:10px;">
        <input type="checkbox" id="ship3d-engines" checked style="width:auto;margin-right:8px;"> 🚀 ${isEN ? 'Add glowing thrusters' : 'Ajouter propulseurs brillants'}
      </label>
      <button id="ship3d-add" style="width:100%;padding:12px;background:linear-gradient(135deg,#94a3b8,#3b82f6);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">
        ${isEN ? '🚀 ASSEMBLE SHIP' : '🚀 ASSEMBLER VAISSEAU'}
      </button>`;
    _container.appendChild(_panel);
    _bindUI();
  }

  function _bindUI() {
    _panel.querySelector('#ship3d-comp').addEventListener('input', e => _panel.querySelector('#ship-cv').textContent = e.target.value);
    _panel.querySelector('#ship3d-detail').addEventListener('input', e => {
      const v = +e.target.value;
      _panel.querySelector('#ship-dv').textContent = v===1?'Low':v===2?'Med':'High';
    });
    
    _panel.querySelector('#ship3d-add').onclick = () => {
      const seed = _panel.querySelector('#ship3d-seed').value || 'Ship'+Math.floor(Math.random()*1000);
      const shipClass = _panel.querySelector('#ship3d-class').value;
      const colorPalette = _panel.querySelector('#ship3d-color').value;
      const complexity = +_panel.querySelector('#ship3d-comp').value;
      const detail = +_panel.querySelector('#ship3d-detail').value;
      const glowEngines = _panel.querySelector('#ship3d-engines').checked;
      
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('sci-fi-spaceship', { seed, shipClass, colorPalette, complexity, detail, glowEngines });
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
