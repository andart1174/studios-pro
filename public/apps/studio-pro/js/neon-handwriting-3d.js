// Handwriting → 3D Neon Path Generator
window.NeonHandwriting3D = (() => {
  'use strict';
  let _container, _panel, _imgData = null;

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'neonh-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;border-radius:8px;';
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#f43f5e,#fb7185);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">✍️</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'Handwriting to 3D Neon' : 'Écrit à la main en Neon 3D'}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'Turn sketches into glow tubes' : 'Transformez vos croquis en néons'}</div>
        </div>
      </div>
      <div id="neonh-drop" style="flex:1;border:2px dashed rgba(244,63,94,0.3);border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;cursor:pointer;background:rgba(244,63,94,0.02);margin-bottom:15px;">
        <span style="font-size:24px;">🖊️</span>
        <span style="font-size:11px;color:#94a3b8;">${isEN ? 'Drop Sketch Image or Click' : 'Déposez un croquis'}</span>
        <input type="file" id="neonh-file" accept="image/*" style="display:none;">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px;">
        <div class="neonh-row"><span style="font-size:10px;color:#94a3b8;">Glow Color</span><input type="color" id="neonh-color" value="#f43f5e" style="width:100%;height:24px;border:none;background:none;cursor:pointer;"></div>
        <div class="neonh-row"><span style="font-size:10px;color:#94a3b8;">Thickness</span><input type="range" id="neonh-thick" min="1" max="10" value="2" style="width:100%;accent-color:#f43f5e;"></div>
      </div>
      <button id="neonh-add" style="width:100%;padding:12px;background:linear-gradient(135deg,#f43f5e,#fb7185);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;opacity:0.5;" disabled>${isEN ? '📐 ADD TO SCENE' : '📐 AJOUTER À LA SCÈNE'}</button>
    `;
    _container.appendChild(_panel);
    _bindUI();
  }

  function _bindUI() {
    const drop = _panel.querySelector('#neonh-drop');
    const file = _panel.querySelector('#neonh-file');
    const addBtn = _panel.querySelector('#neonh-add');

    drop.onclick = () => file.click();
    file.onchange = e => e.target.files[0] && _loadImg(e.target.files[0]);

    function _loadImg(f) {
      const reader = new FileReader();
      reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
          _imgData = img;
          addBtn.disabled = false;
          addBtn.style.opacity = '1';
          drop.style.borderColor = '#10b981';
          drop.querySelector('span:last-child').textContent = '✅ Sketch Loaded';
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(f);
    }

    addBtn.onclick = () => {
      if(!_imgData) return;
      const color = _panel.querySelector('#neonh-color').value;
      const thick = +_panel.querySelector('#neonh-thick').value;
      
      // Basic edge/path detection logic
      const res = 100;
      const c = document.createElement('canvas'); c.width = res; c.height = res;
      const ctx = c.getContext('2d'); ctx.drawImage(_imgData, 0, 0, res, res);
      const px = ctx.getImageData(0,0,res,res).data;
      const paths = [];
      // Simple row scan for "ink"
      for(let y=0; y<res; y+=4) {
        let currentPath = [];
        for(let x=0; x<res; x+=2) {
          const br = (px[(y*res+x)*4] + px[(y*res+x)*4+1] + px[(y*res+x)*4+2]) / 3;
          if(br < 128) currentPath.push({x: x-res/2, y: -(y-res/2), z: 0});
          else if(currentPath.length > 0) { paths.push(currentPath); currentPath = []; }
        }
        if(currentPath.length > 0) paths.push(currentPath);
      }

      if(window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('neon-handwriting', { paths, color, thick });
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
