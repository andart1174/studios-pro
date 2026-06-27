// Holographic Force Shield
window.ForceShield3D = (() => {
  'use strict';
  let _container, _panel;

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'shield3d-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;border-radius:8px;overflow-y:auto;';
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#38bdf8,#818cf8);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">🛡️</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'Holographic Force Shield' : 'Bouclier de Force Holographique'}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'Energy barriers & sci-fi domes' : 'Barrières d\\'énergie & dômes sci-fi'}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Shield Shape' : 'Forme Bouclier'}</div>
          <select id="shield3d-shape" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
            <option value="dome">${isEN ? 'Protective Dome' : 'Dôme Protecteur'}</option>
            <option value="sphere">${isEN ? 'Full Sphere' : 'Sphère Complète'}</option>
            <option value="wall">${isEN ? 'Energy Wall' : 'Mur d\\'Énergie'}</option>
            <option value="hex">${isEN ? 'Hexagon Matrix' : 'Matrice Hexagonale'}</option>
          </select>
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Energy Color' : 'Couleur Énergie'}</div>
          <input type="color" id="shield3d-color" value="#38bdf8" style="width:100%;height:28px;border:none;background:none;cursor:pointer;">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Shield Size' : 'Taille Bouclier'} <b id="sh-sv">50</b></div>
          <input type="range" id="shield3d-size" min="20" max="200" value="50" style="width:100%;accent-color:#38bdf8;">
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Pulse Speed' : 'Vitesse Pulsation'} <b id="sh-pv">2.0</b></div>
          <input type="range" id="shield3d-speed" min="0.5" max="5.0" step="0.5" value="2.0" style="width:100%;accent-color:#818cf8;">
        </div>
      </div>
      <label style="display:flex;align-items:center;cursor:pointer;font-size:11px;color:#93c5fd;margin-bottom:10px;">
        <input type="checkbox" id="shield3d-impact" checked style="width:auto;margin-right:8px;"> ⚡ ${isEN ? 'Simulate impact ripples' : 'Simuler ondes d\\'impact'}
      </label>
      <button id="shield3d-add" style="width:100%;padding:12px;background:linear-gradient(135deg,#38bdf8,#818cf8);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">
        ${isEN ? '🛡️ ACTIVATE SHIELD' : '🛡️ ACTIVER BOUCLIER'}
      </button>`;
    _container.appendChild(_panel);
    _bindUI();
  }

  function _bindUI() {
    _panel.querySelector('#shield3d-size').addEventListener('input', e => _panel.querySelector('#sh-sv').textContent = e.target.value);
    _panel.querySelector('#shield3d-speed').addEventListener('input', e => _panel.querySelector('#sh-pv').textContent = (+e.target.value).toFixed(1));
    
    _panel.querySelector('#shield3d-add').onclick = () => {
      const shieldShape = _panel.querySelector('#shield3d-shape').value;
      const energyColor = _panel.querySelector('#shield3d-color').value;
      const shieldSize = +_panel.querySelector('#shield3d-size').value;
      const pulseSpeed = +_panel.querySelector('#shield3d-speed').value;
      const simImpact = _panel.querySelector('#shield3d-impact').checked;
      
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('force-shield', { shieldShape, energyColor, shieldSize, pulseSpeed, simImpact });
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
