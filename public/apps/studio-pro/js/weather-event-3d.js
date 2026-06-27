// Weather / Cosmic Event Sculptor
window.WeatherEvent3D = (() => {
  'use strict';
  let _container, _panel;

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'weather3d-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;border-radius:8px;overflow-y:auto;';
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#0ea5e9,#6366f1);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">🌪️</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'Weather Event Sculptor' : "Sculpteur d'Événements"}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'Animated vortex systems' : 'Systèmes de vortex animés'}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Event Type' : "Type d'Événement"}</div>
          <select id="weath3d-type" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
            <option value="tornado">${isEN ? 'Tornado / Twister' : 'Tornade'}</option>
            <option value="hurricane">${isEN ? 'Hurricane / Eye' : 'Ouragan'}</option>
            <option value="blackhole">${isEN ? 'Black Hole Disk' : 'Disque Trou Noir'}</option>
            <option value="galaxy">${isEN ? 'Spiral Galaxy' : 'Galaxie Spirale'}</option>
          </select>
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Color Theme' : 'Thème Couleur'}</div>
          <select id="weath3d-color" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
            <option value="dust">${isEN ? 'Dust / Earth' : 'Poussière / Terre'}</option>
            <option value="water">${isEN ? 'Water / Ice' : 'Eau / Glace'}</option>
            <option value="fire">${isEN ? 'Fire / Magma' : 'Feu / Magma'}</option>
            <option value="void">${isEN ? 'Void / Plasma' : 'Vide / Plasma'}</option>
          </select>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Particle Density' : 'Densité Particules'} <b id="we-pv">2000</b></div>
          <input type="range" id="weath3d-dens" min="500" max="8000" step="500" value="2000" style="width:100%;accent-color:#0ea5e9;">
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Rotation Speed' : 'Vitesse Rotation'} <b id="we-sv">1.0</b></div>
          <input type="range" id="weath3d-speed" min="0.1" max="5.0" step="0.1" value="1.0" style="width:100%;accent-color:#6366f1;">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Height / Radius' : 'Hauteur / Rayon'} <b id="we-hv">50</b></div>
          <input type="range" id="weath3d-size" min="20" max="150" value="50" style="width:100%;accent-color:#0ea5e9;">
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Turbulence' : 'Turbulence'} <b id="we-tv">High</b></div>
          <input type="range" id="weath3d-turb" min="1" max="3" value="3" style="width:100%;accent-color:#6366f1;">
        </div>
      </div>
      <button id="weath3d-add" style="width:100%;padding:12px;background:linear-gradient(135deg,#0ea5e9,#6366f1);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">
        ${isEN ? '🌪️ SPAWN VORTEX' : '🌪️ CRÉER VORTEX'}
      </button>`;
    _container.appendChild(_panel);
    _bindUI();
  }

  function _bindUI() {
    _panel.querySelector('#weath3d-dens').addEventListener('input', e => _panel.querySelector('#we-pv').textContent = e.target.value);
    _panel.querySelector('#weath3d-speed').addEventListener('input', e => _panel.querySelector('#we-sv').textContent = (+e.target.value).toFixed(1));
    _panel.querySelector('#weath3d-size').addEventListener('input', e => _panel.querySelector('#we-hv').textContent = e.target.value);
    _panel.querySelector('#weath3d-turb').addEventListener('input', e => {
      const v = +e.target.value; _panel.querySelector('#we-tv').textContent = v===1?'Low':v===2?'Med':'High';
    });
    
    _panel.querySelector('#weath3d-add').onclick = () => {
      const evType = _panel.querySelector('#weath3d-type').value;
      const colorTheme = _panel.querySelector('#weath3d-color').value;
      const density = +_panel.querySelector('#weath3d-dens').value;
      const speed = +_panel.querySelector('#weath3d-speed').value;
      const scaleSize = +_panel.querySelector('#weath3d-size').value;
      const turbulence = +_panel.querySelector('#weath3d-turb').value;
      
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('weather-event', { evType, colorTheme, density, speed, scaleSize, turbulence });
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
