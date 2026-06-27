// JSON → 3D Live Dashboard
window.JsonDashboard3D = (() => {
  'use strict';
  let _container, _panel;

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'jsondash3d-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;border-radius:8px;overflow-y:auto;';
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#10b981,#06b6d4);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">🌡️</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'JSON → 3D Dashboard' : 'JSON → Tableau de Bord 3D'}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'Live data visualization' : 'Données live en 3D'}</div>
        </div>
      </div>
      <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${isEN ? 'Paste JSON data (key:number pairs):' : 'Collez données JSON (clé:nombre):'}</div>
      <textarea id="jsondash3d-text" placeholder='{"temperature": 25, "humidity": 60, "pressure": 1013, "wind": 15}' style="width:100%;height:80px;padding:8px;background:#1e293b;border:1px solid #334155;border-radius:6px;color:#10b981;font-size:10px;font-family:monospace;resize:none;margin-bottom:8px;"></textarea>
      <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${isEN ? 'Dashboard Style' : 'Style de Tableau'}</div>
      <select id="jsondash3d-style" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;margin-bottom:8px;">
        <option value="gauges">${isEN ? 'Gauges & Cylinders' : 'Jauges & Cylindres'}</option>
        <option value="spheres">${isEN ? 'Pulsing Spheres' : 'Sphères Pulsantes'}</option>
        <option value="bars">${isEN ? '3D Bars' : 'Barres 3D'}</option>
        <option value="rings">${isEN ? 'Floating Rings' : 'Anneaux Flottants'}</option>
      </select>
      <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${isEN ? 'Color Theme' : 'Thème Couleur'}</div>
      <select id="jsondash3d-color" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;margin-bottom:10px;">
        <option value="neon">Neon Green</option>
        <option value="cyber">Cyber Blue</option>
        <option value="fire">${isEN ? 'Fire' : 'Feu'}</option>
        <option value="spectrum">Spectrum</option>
      </select>
      <button id="jsondash3d-add" style="width:100%;padding:12px;background:linear-gradient(135deg,#10b981,#06b6d4);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">
        ${isEN ? '📐 ADD TO SCENE' : '📐 AJOUTER À LA SCÈNE'}
      </button>`;
    _container.appendChild(_panel);
    _bindUI();
  }

  function _bindUI() {
    _panel.querySelector('#jsondash3d-add').onclick = () => {
      let jsonData = { value: 75, level: 50, count: 100 };
      try { jsonData = JSON.parse(_panel.querySelector('#jsondash3d-text').value || '{}'); } catch (e) {}
      const dashStyle = _panel.querySelector('#jsondash3d-style').value;
      const colorTheme = _panel.querySelector('#jsondash3d-color').value;
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('json-dashboard', { jsonData, dashStyle, colorTheme });
        _panel.style.display = 'none';
      }
    };
  }

  function init(container, btn) {
    _container = container; buildUI();
    if (btn) btn.addEventListener('click', () => {
      const visible = _panel.style.display === 'flex';
      document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display = 'none');
      _panel.style.display = visible ? 'none' : 'flex';
      _panel.style.flexDirection = 'column';
    });
  }
  return { init };
})();
