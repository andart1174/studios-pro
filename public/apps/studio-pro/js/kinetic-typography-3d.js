// Kinetic Typography 3D
window.KineticTypography3D = (() => {
  'use strict';
  let _container, _panel;

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'kinetictypo-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;border-radius:8px;overflow-y:auto;';
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#eab308,#f43f5e);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">🔠</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'Kinetic Typography' : 'Typographie Cinétique'}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'Animated 3D letter sculptures' : 'Sculptures de lettres 3D animées'}</div>
        </div>
      </div>
      <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${isEN ? 'Enter text (longer is better):' : 'Entrez le texte (le plus long le mieux):'}</div>
      <textarea id="kintypo-text" placeholder="FUTURE IS NOW" style="width:100%;height:60px;padding:10px;background:#1e293b;border:1px solid #334155;border-radius:8px;color:#fcd34d;font-size:14px;font-weight:700;resize:none;margin-bottom:10px;text-transform:uppercase;"></textarea>
      
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Formation Shape' : 'Forme de Base'}</div>
          <select id="kintypo-shape" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
            <option value="sphere">${isEN ? 'Sphere' : 'Sphère'}</option>
            <option value="cylinder">${isEN ? 'Cylinder / Tunnel' : 'Cylindre / Tunnel'}</option>
            <option value="wave">${isEN ? 'Sine Wave' : 'Onde'}</option>
            <option value="chaos">${isEN ? 'Chaos Cloud' : 'Nuage Chaotique'}</option>
          </select>
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Animation Style' : 'Style Animation'}</div>
          <select id="kintypo-anim" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
            <option value="orbit">${isEN ? 'Orbiting' : 'Orbite'}</option>
            <option value="pulse">${isEN ? 'Pulse & Scale' : 'Pulsation & Échelle'}</option>
            <option value="wave">${isEN ? 'Wave Ripple' : 'Ondulation'}</option>
          </select>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Text Size' : 'Taille Texte'} <b id="kt-sv">10</b></div>
          <input type="range" id="kintypo-size" min="2" max="20" value="10" style="width:100%;accent-color:#eab308;">
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Radius / Spread' : 'Rayon / Dispersion'} <b id="kt-rv">50</b></div>
          <input type="range" id="kintypo-radius" min="20" max="150" value="50" style="width:100%;accent-color:#f43f5e;">
        </div>
      </div>
      <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Font Color Theme' : 'Thème Couleur Police'}</div>
      <select id="kintypo-color" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;margin-bottom:10px;">
        <option value="gold">Golden Extrusion</option>
        <option value="cyber">Cyberpunk (Neon)</option>
        <option value="bw">${isEN ? 'Black & White' : 'Noir & Blanc'}</option>
      </select>
      <button id="kintypo-add" style="width:100%;padding:12px;background:linear-gradient(135deg,#eab308,#f43f5e);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">
        ${isEN ? '🔠 EXTRUDE TYPOGRAPHY' : '🔠 EXTRUDER TYPOGRAPHIE'}
      </button>`;
    _container.appendChild(_panel);
    _bindUI();
  }

  function _bindUI() {
    _panel.querySelector('#kintypo-size').addEventListener('input', e => _panel.querySelector('#kt-sv').textContent = e.target.value);
    _panel.querySelector('#kintypo-radius').addEventListener('input', e => _panel.querySelector('#kt-rv').textContent = e.target.value);
    
    _panel.querySelector('#kintypo-add').onclick = () => {
      const text = _panel.querySelector('#kintypo-text').value.trim() || 'FUTURE IS NOW';
      const shape = _panel.querySelector('#kintypo-shape').value;
      const animStyle = _panel.querySelector('#kintypo-anim').value;
      const tSize = +_panel.querySelector('#kintypo-size').value;
      const radius = +_panel.querySelector('#kintypo-radius').value;
      const colorTheme = _panel.querySelector('#kintypo-color').value;
      
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('kinetic-typo', { text, shape, animStyle, tSize, radius, colorTheme });
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
