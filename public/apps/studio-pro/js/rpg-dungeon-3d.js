// RPG Dungeon / Labyrinth Maker
window.RpgDungeon3D = (() => {
  'use strict';
  let _container, _panel;

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'rpgdungeon-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;border-radius:8px;overflow-y:auto;';
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#b45309,#78350f);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">🏰</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'RPG Dungeon Maker' : 'Créateur Donjon RPG'}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'Procedural labyrinth generation' : 'Génération labyrinthe procédural'}</div>
        </div>
      </div>
      <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${isEN ? 'Dungeon Seed (e.g. DarkCastle):' : 'Graine Donjon (ex: DarkCastle):'}</div>
      <input type="text" id="dung3d-seed" placeholder="LostCatacombs" style="width:100%;padding:8px;background:#1e293b;border:1px solid #334155;border-radius:6px;color:#fcd34d;font-size:12px;font-family:monospace;margin-bottom:10px;">
      
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Grid Width' : 'Largeur Grille'} <b id="d-wv">15</b></div>
          <input type="range" id="dung3d-w" min="5" max="30" value="15" style="width:100%;accent-color:#b45309;">
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Grid Depth' : 'Profondeur Grille'} <b id="d-hv">15</b></div>
          <input type="range" id="dung3d-h" min="5" max="30" value="15" style="width:100%;accent-color:#78350f;">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Theme' : 'Thème'}</div>
          <select id="dung3d-theme" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
            <option value="stone">${isEN ? 'Stone Keep' : 'Donjon de Pierre'}</option>
            <option value="ice">${isEN ? 'Ice Cavern' : 'Caverne de Glace'}</option>
            <option value="fire">${isEN ? 'Lava Pits' : 'Fosses de Lave'}</option>
            <option value="cyber">${isEN ? 'Cyber Facility' : 'Installation Cyber'}</option>
          </select>
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Wall Height' : 'Hauteur Murs'}</div>
          <select id="dung3d-wall" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
            <option value="low">${isEN ? 'Low (Visible)' : 'Bas (Visible)'}</option>
            <option value="high" selected>${isEN ? 'High (Immersive)' : 'Haut (Immersif)'}</option>
          </select>
        </div>
      </div>
      <label style="display:flex;align-items:center;cursor:pointer;font-size:11px;color:#fcd34d;margin-bottom:10px;">
        <input type="checkbox" id="dung3d-torches" checked style="width:auto;margin-right:8px;"> 🔥 ${isEN ? 'Place Torches / Lights' : 'Placer Torches / Lumières'}
      </label>
      <button id="dung3d-add" style="width:100%;padding:12px;background:linear-gradient(135deg,#b45309,#78350f);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">
        ${isEN ? '🏰 GENERATE DUNGEON' : '🏰 GÉNÉRER DONJON'}
      </button>`;
    _container.appendChild(_panel);
    _bindUI();
  }

  function _bindUI() {
    _panel.querySelector('#dung3d-w').addEventListener('input', e => _panel.querySelector('#d-wv').textContent = e.target.value);
    _panel.querySelector('#dung3d-h').addEventListener('input', e => _panel.querySelector('#d-hv').textContent = e.target.value);
    
    _panel.querySelector('#dung3d-add').onclick = () => {
      const seed = _panel.querySelector('#dung3d-seed').value || 'Maze'+Math.floor(Math.random()*1000);
      const gridW = +_panel.querySelector('#dung3d-w').value;
      const gridH = +_panel.querySelector('#dung3d-h').value;
      const theme = _panel.querySelector('#dung3d-theme').value;
      const wallHeight = _panel.querySelector('#dung3d-wall').value;
      const hasTorches = _panel.querySelector('#dung3d-torches').checked;
      
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('rpg-dungeon', { seed, gridW, gridH, theme, wallHeight, hasTorches });
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
