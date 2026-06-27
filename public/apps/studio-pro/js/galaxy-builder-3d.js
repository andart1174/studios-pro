// Galaxy & Solar System Builder
window.GalaxyBuilder3D = (() => {
  'use strict';
  let _container, _panel;

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'galaxy3d-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;border-radius:8px;overflow-y:auto;';
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#3b82f6,#8b5cf6,#ec4899);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">🌌</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'Galaxy & Solar Builder' : 'Constructeur Solaire & Galaxie'}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'Procedural orbital systems' : 'Systèmes orbitaux procéduraux'}</div>
        </div>
      </div>
      <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${isEN ? 'Seed / Coordinates (Shapes the system):' : 'Graine / Coordonnées (Forme le système):'}</div>
      <input type="text" id="galaxy3d-seed" placeholder="Sector 7G / 2026-04-30" style="width:100%;padding:10px;background:#1e293b;border:1px solid #8b5cf6;border-radius:8px;color:#e2e8f0;font-size:14px;font-family:monospace;margin-bottom:10px;text-align:center;">
      
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Star Type' : "Type d'Étoile"}</div>
          <select id="galaxy3d-star" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
            <option value="yellow">${isEN ? 'Yellow Dwarf' : 'Naine Jaune'}</option>
            <option value="red">${isEN ? 'Red Giant' : 'Géante Rouge'}</option>
            <option value="blue">${isEN ? 'Blue Supergiant' : 'Supergéante Bleue'}</option>
            <option value="blackhole">${isEN ? 'Black Hole' : 'Trou Noir'}</option>
          </select>
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'System Type' : 'Type de Système'}</div>
          <select id="galaxy3d-type" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
            <option value="solar">${isEN ? 'Planetary System' : 'Système Planétaire'}</option>
            <option value="nebula">${isEN ? 'Dense Nebula' : 'Nébuleuse Dense'}</option>
          </select>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Planets / Bodies' : 'Planètes / Corps'} <b id="gx-pv">8</b></div>
          <input type="range" id="galaxy3d-planets" min="1" max="20" value="8" style="width:100%;accent-color:#3b82f6;">
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Asteroid Belts' : 'Ceintures Astéroïdes'} <b id="gx-bv">1</b></div>
          <input type="range" id="galaxy3d-belts" min="0" max="3" value="1" style="width:100%;accent-color:#8b5cf6;">
        </div>
      </div>
      <label style="display:flex;align-items:center;cursor:pointer;font-size:11px;color:#fbcfe8;margin-bottom:10px;">
        <input type="checkbox" id="galaxy3d-orbit" checked style="width:auto;margin-right:8px;"> 🪐 ${isEN ? 'Show Orbit Lines' : "Afficher Lignes d'Orbite"}
      </label>
      <button id="galaxy3d-add" style="width:100%;padding:12px;background:linear-gradient(135deg,#3b82f6,#8b5cf6,#ec4899);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">
        ${isEN ? '🌌 IGNITE UNIVERSE' : "🌌 ALLUMER L'UNIVERS"}
      </button>`;
    _container.appendChild(_panel);
    _bindUI();
  }

  function _bindUI() {
    _panel.querySelector('#galaxy3d-planets').addEventListener('input', e => _panel.querySelector('#gx-pv').textContent = e.target.value);
    _panel.querySelector('#galaxy3d-belts').addEventListener('input', e => _panel.querySelector('#gx-bv').textContent = e.target.value);
    
    _panel.querySelector('#galaxy3d-add').onclick = () => {
      const seed = _panel.querySelector('#galaxy3d-seed').value || 'MilkyWay';
      const starType = _panel.querySelector('#galaxy3d-star').value;
      const sysType = _panel.querySelector('#galaxy3d-type').value;
      const numPlanets = +_panel.querySelector('#galaxy3d-planets').value;
      const numBelts = +_panel.querySelector('#galaxy3d-belts').value;
      const showOrbits = _panel.querySelector('#galaxy3d-orbit').checked;
      
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('galaxy-builder', { seed, starType, sysType, numPlanets, numBelts, showOrbits });
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
