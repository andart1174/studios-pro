// GeoJSON / Coordinates → 3D Globe
window.GeoGlobe3D = (() => {
  'use strict';
  let _container, _panel;

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'geoglobe3d-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;border-radius:8px;overflow-y:auto;';
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#0ea5e9,#10b981);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">🗺️</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'Geo Data → 3D Globe' : 'Données Géo → Globe 3D'}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'Interactive globe with markers' : 'Globe interactif avec marqueurs'}</div>
        </div>
      </div>
      <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${isEN ? 'Enter locations (lat,lon,label per line):' : 'Entrez lieux (lat,lon,label par ligne):'}</div>
      <textarea id="geoglobe3d-text" placeholder="${isEN ? '48.85,2.35,Paris\n51.50,-0.12,London\n40.71,-74.00,New York\n35.68,139.69,Tokyo' : '48.85,2.35,Paris\n51.50,-0.12,Londres\n40.71,-74.00,New York\n35.68,139.69,Tokyo'}" style="width:100%;height:100px;padding:8px;background:#1e293b;border:1px solid #334155;border-radius:6px;color:#fff;font-size:11px;font-family:monospace;resize:none;margin-bottom:8px;"></textarea>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Globe Style' : 'Style Globe'}</div>
          <select id="geoglobe3d-style" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
            <option value="solid">${isEN ? 'Solid Globe' : 'Globe Solide'}</option>
            <option value="wire">Wireframe</option>
            <option value="dots">${isEN ? 'Dot Matrix' : 'Matrice de Points'}</option>
            <option value="hologram">Hologram</option>
          </select>
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Globe Color' : 'Couleur Globe'}</div>
          <input type="color" id="geoglobe3d-color" value="#0ea5e9" style="width:100%;height:28px;border:none;background:none;cursor:pointer;">
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
        <label style="font-size:10px;color:#94a3b8;min-width:90px;">${isEN ? 'Globe Radius' : 'Rayon Globe'} <b id="geo-rv">50</b></label>
        <input type="range" id="geoglobe3d-radius" min="20" max="100" value="50" style="flex:1;accent-color:#0ea5e9;">
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">
        <label style="font-size:10px;color:#94a3b8;min-width:90px;">${isEN ? 'Marker Height' : 'Hauteur Marqueur'} <b id="geo-mh">8</b></label>
        <input type="range" id="geoglobe3d-markerh" min="2" max="30" value="8" style="flex:1;accent-color:#10b981;">
      </div>
      <button id="geoglobe3d-add" style="width:100%;padding:12px;background:linear-gradient(135deg,#0ea5e9,#10b981);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">
        ${isEN ? '📐 ADD TO SCENE' : '📐 AJOUTER À LA SCÈNE'}
      </button>`;
    _container.appendChild(_panel);
    _bindUI();
  }

  function _bindUI() {
    _panel.querySelector('#geoglobe3d-radius').addEventListener('input', e => { _panel.querySelector('#geo-rv').textContent = e.target.value; });
    _panel.querySelector('#geoglobe3d-markerh').addEventListener('input', e => { _panel.querySelector('#geo-mh').textContent = e.target.value; });
    _panel.querySelector('#geoglobe3d-add').onclick = () => {
      const text = _panel.querySelector('#geoglobe3d-text').value;
      const markers = text.split('\n').filter(l => l.trim()).map(l => {
        const parts = l.split(',');
        return { lat: +parts[0] || 0, lon: +parts[1] || 0, label: (parts[2] || '').trim() };
      });
      const globeStyle = _panel.querySelector('#geoglobe3d-style').value;
      const globeColor = _panel.querySelector('#geoglobe3d-color').value;
      const globeRadius = +_panel.querySelector('#geoglobe3d-radius').value;
      const markerHeight = +_panel.querySelector('#geoglobe3d-markerh').value;
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('geo-globe', { markers, globeStyle, globeColor, globeRadius, markerHeight });
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
