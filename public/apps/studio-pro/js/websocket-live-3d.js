// WebSocket Live Data → 3D Scene
window.WebSocketLive3D = (() => {
  'use strict';
  let _container, _panel;

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'wslive3d-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;border-radius:8px;overflow-y:auto;';
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#10b981,#3b82f6);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">📡</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'Live Data → 3D Scene' : 'Données Live → Scène 3D'}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'Real-time sculpture' : 'Sculpture en temps réel'}</div>
        </div>
      </div>
      <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${isEN ? 'WebSocket URL or use simulation:' : 'URL WebSocket ou utiliser simulation:'}</div>
      <input type="text" id="wslive3d-url" placeholder="wss://stream.example.com/data" style="width:100%;padding:8px;background:#1e293b;border:1px solid #334155;border-radius:6px;color:#10b981;font-size:11px;font-family:monospace;margin-bottom:8px;">
      <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${isEN ? 'Data field to visualize (JSON key):' : 'Champ à visualiser (clé JSON):'}</div>
      <input type="text" id="wslive3d-field" placeholder="price" value="value" style="width:100%;padding:7px;background:#1e293b;border:1px solid #334155;border-radius:6px;color:#fff;font-size:11px;margin-bottom:8px;">
      <div style="background:#0f172a;border:1px solid #1e3a5f;border-radius:6px;padding:8px;margin-bottom:10px;font-size:10px;color:#64748b;">
        💡 ${isEN ? 'If no URL provided, simulates live crypto/sensor data automatically.' : 'Sans URL, simule des données crypto/capteurs automatiquement.'}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Visualization Type' : 'Type de Visualisation'}</div>
          <select id="wslive3d-type" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
            <option value="terrain">${isEN ? 'Live Terrain' : 'Terrain Live'}</option>
            <option value="bars">${isEN ? 'Growing Bars' : 'Barres Croissantes'}</option>
            <option value="wave">${isEN ? 'Wave Sculpture' : 'Sculpture Onde'}</option>
            <option value="orbs">${isEN ? 'Pulsing Orbs' : 'Orbes Pulsants'}</option>
          </select>
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Color Theme' : 'Thème Couleur'}</div>
          <select id="wslive3d-color" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
            <option value="neon">Neon Green</option>
            <option value="cyber">Cyber Blue</option>
            <option value="fire">${isEN ? 'Fire Alert' : 'Alerte Feu'}</option>
            <option value="matrix">Matrix</option>
          </select>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">
        <label style="font-size:10px;color:#94a3b8;min-width:100px;">${isEN ? 'History Buffer' : 'Tampon Historique'} <b id="ws-hv">32</b></label>
        <input type="range" id="wslive3d-history" min="8" max="64" value="32" style="flex:1;accent-color:#10b981;">
      </div>
      <button id="wslive3d-add" style="width:100%;padding:12px;background:linear-gradient(135deg,#10b981,#3b82f6);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">
        ${isEN ? '📡 ADD LIVE SCENE' : '📡 AJOUTER SCÈNE LIVE'}
      </button>`;
    _container.appendChild(_panel);
    _bindUI();
  }

  function _bindUI() {
    _panel.querySelector('#wslive3d-history').addEventListener('input', e => { _panel.querySelector('#ws-hv').textContent = e.target.value; });
    _panel.querySelector('#wslive3d-add').onclick = () => {
      const wsUrl = _panel.querySelector('#wslive3d-url').value.trim();
      const dataField = _panel.querySelector('#wslive3d-field').value || 'value';
      const vizType = _panel.querySelector('#wslive3d-type').value;
      const colorTheme = _panel.querySelector('#wslive3d-color').value;
      const historyBuffer = +_panel.querySelector('#wslive3d-history').value;
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('websocket-live', { wsUrl, dataField, vizType, colorTheme, historyBuffer });
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
