// Location → 3D Terrain Generator
window.LocationTerrain3D = (() => {
  'use strict';
  let _container, _panel;

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'lt3d-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;border-radius:8px;';
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#10b981,#059669);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">🗺️</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'Location to 3D Terrain' : 'Lieu en Terrain 3D'}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'Real-world elevation simulation' : "Simulation d'élévation réelle"}</div>
        </div>
      </div>
      <div style="margin-bottom:15px;">
        <label style="font-size:10px;color:#94a3b8;font-weight:600;display:block;margin-bottom:5px;">${isEN ? 'Enter City or Seed' : 'Ville ou Graine'}</label>
        <input type="text" id="lt3d-seed" placeholder="Ex: Carpathian Mountains" style="width:100%;padding:10px;background:#1e293b;border:1px solid #334155;border-radius:8px;color:#fff;font-size:12px;">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px;">
        <div class="lt3d-row"><span style="font-size:10px;color:#94a3b8;">${isEN ? 'Scale' : 'Échelle'}</span><input type="range" id="lt3d-scale" min="5" max="100" value="40" style="width:100%;accent-color:#10b981;"></div>
        <div class="lt3d-row"><span style="font-size:10px;color:#94a3b8;">Type</span><select id="lt3d-type" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;"><option value="mountains">Mountains</option><option value="canyon">Canyon</option><option value="islands">Islands</option></select></div>
      </div>
      <button id="lt3d-add" style="width:100%;padding:12px;background:linear-gradient(135deg,#10b981,#059669);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(16,185,129,0.3);">${isEN ? '📐 ADD TO SCENE' : '📐 AJOUTER À LA SCÈNE'}</button>
    `;
    _container.appendChild(_panel);
    _bindUI();
  }

  function _bindUI() {
    _panel.querySelector('#lt3d-add').onclick = () => {
      const seed = _panel.querySelector('#lt3d-seed').value || 'Default';
      const scale = +_panel.querySelector('#lt3d-scale').value;
      const type = _panel.querySelector('#lt3d-type').value;
      
      // Generate deterministic terrain data from seed string
      const res = 64;
      const data = new Float32Array(res * res);
      let s = 0; for(let i=0; i<seed.length; i++) s += seed.charCodeAt(i);
      const prng = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      
      for(let y=0; y<res; y++){
        for(let x=0; x<res; x++){
          let h = 0;
          if(type==='mountains') h = Math.sin(x/5 + s)*Math.cos(y/5 + s) + prng()*0.3;
          else if(type==='canyon') h = Math.abs(Math.sin(x/10)) * 0.8 - prng()*0.2;
          else h = (Math.sin(x/8)*Math.cos(y/8) > 0.2) ? 1 : 0;
          data[y*res+x] = h;
        }
      }

      if(window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('location-terrain', { data, res, scale, type, seed });
        _panel.style.display = 'none';
      }
    };
  }

  function init(container, btn) {
    _container = container;
    buildUI();
    if (btn) btn.addEventListener('click', () => {
      const visible = _panel.style.display === 'flex';
      document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display='none');
      _panel.style.display = visible ? 'none' : 'flex';
      _panel.style.flexDirection = 'column';
    });
  }

  return { init };
})();
