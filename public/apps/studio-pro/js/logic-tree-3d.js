// Code/Logic → 3D Tree Generator
window.LogicTree3D = (() => {
  'use strict';
  let _container, _panel;

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'ltree-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;border-radius:8px;';
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#0ea5e9,#2dd4bf);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">🌳</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'Logic Tree 3D' : 'Arbre Logique 3D'}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'Code hierarchy visualizer' : 'Visualiseur de hiérarchie'}</div>
        </div>
      </div>
      <textarea id="ltree-text" style="width:100%;flex:1;padding:10px;background:#1e293b;border:1px solid #334155;border-radius:8px;color:#2dd4bf;font-size:11px;font-family:monospace;resize:none;margin-bottom:15px;">root\n  child 1\n  child 2\n    subchild A</textarea>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px;">
        <div class="ltree-row"><span style="font-size:10px;color:#94a3b8;">Node Size</span><input type="range" id="ltree-size" min="1" max="10" value="4" style="width:100%;accent-color:#0ea5e9;"></div>
        <div class="ltree-row"><span style="font-size:10px;color:#94a3b8;">Link Color</span><input type="color" id="ltree-color" value="#0ea5e9" style="width:100%;height:24px;border:none;background:none;cursor:pointer;"></div>
      </div>
      <button id="ltree-add" style="width:100%;padding:12px;background:linear-gradient(135deg,#0ea5e9,#2dd4bf);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(14,165,233,0.3);">${isEN ? '📐 ADD TO SCENE' : '📐 AJOUTER À LA SCÈNE'}</button>
    `;
    _container.appendChild(_panel);
    _bindUI();
  }

  function _bindUI() {
    _panel.querySelector('#ltree-add').onclick = () => {
      const text = _panel.querySelector('#ltree-text').value || 'root';
      const size = +_panel.querySelector('#ltree-size').value;
      const color = _panel.querySelector('#ltree-color').value;
      
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      const nodes = [];
      lines.forEach((l, i) => {
        const indent = l.search(/\S/);
        nodes.push({ name: l.trim(), level: indent, id: i });
      });

      if(window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('logic-tree', { nodes, size, color });
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
