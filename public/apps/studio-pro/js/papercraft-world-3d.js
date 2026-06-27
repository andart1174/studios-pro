// Papercraft / Origami 3D World
window.PapercraftWorld3D = (() => {
  'use strict';
  let _container, _panel;

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'papercraft3d-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;border-radius:8px;overflow-y:auto;';
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#fcd34d,#fb923c);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">📄</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'Papercraft World' : 'Monde Papercraft'}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'Low-poly folded paper scenes' : 'Scènes en papier plié low-poly'}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Diorama Theme' : 'Thème Diorama'}</div>
          <select id="paper3d-theme" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
            <option value="mountains">${isEN ? 'Mountain Peaks' : 'Pics Montagneux'}</option>
            <option value="forest">${isEN ? 'Pine Forest' : 'Forêt de Pins'}</option>
            <option value="animals">${isEN ? 'Origami Animals' : 'Animaux Origami'}</option>
            <option value="city">${isEN ? 'Cardboard City' : 'Ville en Carton'}</option>
          </select>
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Paper Color Theme' : 'Thème Couleur Papier'}</div>
          <select id="paper3d-color" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
            <option value="pastel">${isEN ? 'Soft Pastels' : 'Pastels Doux'}</option>
            <option value="warm">${isEN ? 'Warm Autumn' : 'Automne Chaud'}</option>
            <option value="mono">${isEN ? 'Pure White' : 'Blanc Pur'}</option>
            <option value="dark">${isEN ? 'Dark Construction' : 'Construction Sombre'}</option>
          </select>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Fold Complexity' : 'Complexité Pliage'} <b id="pap-cv">5</b></div>
          <input type="range" id="paper3d-comp" min="2" max="10" value="5" style="width:100%;accent-color:#fcd34d;">
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Scene Spread' : 'Étendue Scène'} <b id="pap-sv">50</b></div>
          <input type="range" id="paper3d-spread" min="20" max="100" value="50" style="width:100%;accent-color:#fb923c;">
        </div>
      </div>
      <button id="paper3d-add" style="width:100%;padding:12px;background:linear-gradient(135deg,#fcd34d,#fb923c);border:none;border-radius:10px;color:#78350f;font-size:12px;font-weight:700;cursor:pointer;">
        ${isEN ? '📄 FOLD PAPER SCENE' : '📄 PLIER SCÈNE PAPIER'}
      </button>`;
    _container.appendChild(_panel);
    _bindUI();
  }

  function _bindUI() {
    _panel.querySelector('#paper3d-comp').addEventListener('input', e => _panel.querySelector('#pap-cv').textContent = e.target.value);
    _panel.querySelector('#paper3d-spread').addEventListener('input', e => _panel.querySelector('#pap-sv').textContent = e.target.value);
    
    _panel.querySelector('#paper3d-add').onclick = () => {
      const theme = _panel.querySelector('#paper3d-theme').value;
      const colorTheme = _panel.querySelector('#paper3d-color').value;
      const complexity = +_panel.querySelector('#paper3d-comp').value;
      const spread = +_panel.querySelector('#paper3d-spread').value;
      
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('papercraft-world', { theme, colorTheme, complexity, spread });
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
