// Document → 3D Virtual Gallery
window.DocGallery3D = (() => {
  'use strict';
  let _container, _panel;

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'dg3d-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;border-radius:8px;';
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#8b5cf6,#d946ef);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">🖼️</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'Doc to Virtual Gallery' : 'Doc en Galerie Virtuelle'}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'Floating 3D knowledge panels' : 'Panneaux de savoir flottants'}</div>
        </div>
      </div>
      <textarea id="dg3d-text" placeholder="${isEN ? 'Paste sentences or links...' : 'Collez des phrases...'}" style="width:100%;flex:1;padding:10px;background:#1e293b;border:1px solid #334155;border-radius:8px;color:#fff;font-size:11px;resize:none;margin-bottom:15px;"></textarea>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px;">
        <div class="dg3d-row"><span style="font-size:10px;color:#94a3b8;">Layout</span><select id="dg3d-layout" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;"><option value="spiral">Spiral</option><option value="wall">Wall</option><option value="orbit">Orbit</option></select></div>
        <div class="dg3d-row"><span style="font-size:10px;color:#94a3b8;">Glow</span><input type="color" id="dg3d-color" value="#8b5cf6" style="width:100%;height:24px;border:none;background:none;cursor:pointer;"></div>
      </div>
      <button id="dg3d-add" style="width:100%;padding:12px;background:linear-gradient(135deg,#8b5cf6,#d946ef);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(139,92,246,0.3);">${isEN ? '📐 ADD TO SCENE' : '📐 AJOUTER À LA SCÈNE'}</button>
    `;
    _container.appendChild(_panel);
    _bindUI();
  }

  function _bindUI() {
    _panel.querySelector('#dg3d-add').onclick = () => {
      const text = _panel.querySelector('#dg3d-text').value || 'New Knowledge';
      const layout = _panel.querySelector('#dg3d-layout').value;
      const color = _panel.querySelector('#dg3d-color').value;
      const items = text.split('\n').filter(l => l.trim().length > 2);

      if(window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('doc-gallery', { items, layout, color });
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
