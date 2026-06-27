// Pixel Art → 3D Voxel Sculpture
window.PixelArtVoxel3D = (() => {
  'use strict';
  let _container, _panel;
  let _imgData = null;

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'pxvoxel3d-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;border-radius:8px;overflow-y:auto;';
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#8b5cf6,#ec4899);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">🎮</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'Pixel Art → 3D Voxels' : 'Pixel Art → Voxels 3D'}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'Block-by-block 3D sculpture' : 'Sculpture 3D bloc par bloc'}</div>
        </div>
      </div>
      <label style="display:block;width:100%;padding:12px;background:#1e293b;border:1px dashed #475569;border-radius:8px;text-align:center;cursor:pointer;font-size:11px;color:#94a3b8;margin-bottom:10px;">
        <div id="pxvoxel3d-lbl">🖼️ ${isEN ? 'Select PNG (ideally 16x16–64x64)' : 'Sélectionner PNG (idéalement 16x16–64x64)'}</div>
        <input type="file" id="pxvoxel3d-file" accept="image/*" style="display:none;" />
      </label>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
        <label style="font-size:10px;color:#94a3b8;min-width:100px;">${isEN ? 'Voxel Size' : 'Taille Voxel'} <b id="pxv-sv">3</b></label>
        <input type="range" id="pxvoxel3d-size" min="1" max="8" value="3" style="flex:1;accent-color:#8b5cf6;">
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
        <label style="font-size:10px;color:#94a3b8;min-width:100px;">${isEN ? 'Height Scale' : 'Hauteur'} <b id="pxv-hv">1</b></label>
        <input type="range" id="pxvoxel3d-height" min="1" max="10" value="1" style="flex:1;accent-color:#8b5cf6;">
      </div>
      <label style="display:flex;align-items:center;cursor:pointer;font-size:11px;color:#a78bfa;margin-bottom:10px;">
        <input type="checkbox" id="pxvoxel3d-alpha" checked style="width:auto;margin-right:8px;"> ${isEN ? 'Skip transparent pixels' : 'Ignorer pixels transparents'}
      </label>
      <button id="pxvoxel3d-add" disabled style="width:100%;padding:12px;background:linear-gradient(135deg,#8b5cf6,#ec4899);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:not-allowed;opacity:0.5;">
        ${isEN ? '📐 ADD TO SCENE' : '📐 AJOUTER À LA SCÈNE'}
      </button>`;
    _container.appendChild(_panel);
    _bindUI();
  }

  function _bindUI() {
    const fileIn = _panel.querySelector('#pxvoxel3d-file');
    const lbl = _panel.querySelector('#pxvoxel3d-lbl');
    const addBtn = _panel.querySelector('#pxvoxel3d-add');
    _panel.querySelector('#pxvoxel3d-size').addEventListener('input', e => { _panel.querySelector('#pxv-sv').textContent = e.target.value; });
    _panel.querySelector('#pxvoxel3d-height').addEventListener('input', e => { _panel.querySelector('#pxv-hv').textContent = e.target.value; });

    fileIn.addEventListener('change', (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 64;
          const w = Math.min(img.width, maxDim), h = Math.min(img.height, maxDim);
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, w, h);
          const raw = ctx.getImageData(0, 0, w, h).data;
          _imgData = { pixels: Array.from(raw), width: w, height: h };
          lbl.textContent = '✅ ' + file.name + ` (${w}×${h})`;
          addBtn.disabled = false; addBtn.style.cursor = 'pointer'; addBtn.style.opacity = '1';
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file); e.target.value = '';
    });

    addBtn.onclick = () => {
      if (!_imgData) return;
      const voxelSize = +_panel.querySelector('#pxvoxel3d-size').value;
      const heightScale = +_panel.querySelector('#pxvoxel3d-height').value;
      const skipAlpha = _panel.querySelector('#pxvoxel3d-alpha').checked;
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('pixel-voxel', { imgData: _imgData, voxelSize, heightScale, skipAlpha });
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
