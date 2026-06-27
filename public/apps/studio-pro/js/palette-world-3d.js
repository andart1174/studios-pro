// Color Palette → 3D World
window.PaletteWorld3D = (() => {
  'use strict';
  let _container, _panel;
  let _extractedColors = [];

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'palworld3d-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;border-radius:8px;overflow-y:auto;';
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#f472b6,#fb923c,#facc15);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">🎨</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'Palette → 3D World' : 'Palette → Monde 3D'}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'Generate world from colors' : 'Générer monde depuis couleurs'}</div>
        </div>
      </div>
      <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${isEN ? 'Enter HEX colors (one per line):' : 'Entrez couleurs HEX (une par ligne):'}</div>
      <textarea id="palworld3d-hex" placeholder="#ff6b6b&#10;#feca57&#10;#48dbfb&#10;#ff9ff3&#10;#54a0ff&#10;#5f27cd" style="width:100%;height:90px;padding:8px;background:#1e293b;border:1px solid #334155;border-radius:6px;color:#fff;font-size:11px;font-family:monospace;resize:none;margin-bottom:8px;"></textarea>
      <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${isEN ? 'OR extract from image:' : 'OU extraire depuis image:'}</div>
      <label style="display:block;width:100%;padding:8px;background:#1e293b;border:1px dashed #475569;border-radius:6px;text-align:center;cursor:pointer;font-size:11px;color:#94a3b8;margin-bottom:10px;">
        <span id="palworld3d-imglbl">🖼️ ${isEN ? 'Upload image to extract colors' : 'Importer image pour extraire couleurs'}</span>
        <input type="file" id="palworld3d-img" accept="image/*" style="display:none;" />
      </label>
      <div id="palworld3d-preview" style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;min-height:20px;"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'World Style' : 'Style Monde'}</div>
          <select id="palworld3d-style" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
            <option value="city">${isEN ? 'City Towers' : 'Tours Ville'}</option>
            <option value="landscape">${isEN ? 'Landscape' : 'Paysage'}</option>
            <option value="galaxy">${isEN ? 'Color Galaxy' : 'Galaxie Colorée'}</option>
            <option value="spheres">${isEN ? 'Floating Spheres' : 'Sphères Flottantes'}</option>
          </select>
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Density' : 'Densité'} <b id="palw-dv">8</b></div>
          <input type="range" id="palworld3d-density" min="3" max="20" value="8" style="width:100%;accent-color:#f472b6;margin-top:8px;">
        </div>
      </div>
      <button id="palworld3d-add" style="width:100%;padding:12px;background:linear-gradient(135deg,#f472b6,#fb923c,#facc15);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">
        ${isEN ? '📐 ADD TO SCENE' : '📐 AJOUTER À LA SCÈNE'}
      </button>`;
    _container.appendChild(_panel);
    _bindUI();
  }

  function _extractFromImage(img, count) {
    const c = document.createElement('canvas'); c.width = 50; c.height = 50;
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, 50, 50);
    const data = ctx.getImageData(0, 0, 50, 50).data;
    const step = Math.floor(2500 / count);
    const colors = [];
    for (let i = 0; i < count; i++) {
      const idx = i * step * 4;
      const r = data[idx].toString(16).padStart(2, '0');
      const g = data[idx + 1].toString(16).padStart(2, '0');
      const b = data[idx + 2].toString(16).padStart(2, '0');
      colors.push('#' + r + g + b);
    }
    return colors;
  }

  function _updatePreview(colors) {
    const prev = _panel.querySelector('#palworld3d-preview');
    prev.innerHTML = colors.map(c => `<div style="width:20px;height:20px;border-radius:4px;background:${c};border:1px solid rgba(255,255,255,0.2);" title="${c}"></div>`).join('');
  }

  function _bindUI() {
    _panel.querySelector('#palworld3d-density').addEventListener('input', e => { _panel.querySelector('#palw-dv').textContent = e.target.value; });
    _panel.querySelector('#palworld3d-img').addEventListener('change', (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          _extractedColors = _extractFromImage(img, 8);
          _panel.querySelector('#palworld3d-hex').value = _extractedColors.join('\n');
          _panel.querySelector('#palworld3d-imglbl').textContent = '✅ ' + file.name;
          _updatePreview(_extractedColors);
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file); e.target.value = '';
    });

    _panel.querySelector('#palworld3d-hex').addEventListener('input', (e) => {
      const colors = e.target.value.split('\n').map(l => l.trim()).filter(l => l.startsWith('#'));
      _updatePreview(colors);
    });

    _panel.querySelector('#palworld3d-add').onclick = () => {
      const rawColors = _panel.querySelector('#palworld3d-hex').value.split('\n').map(l => l.trim()).filter(l => l.startsWith('#'));
      const colors = rawColors.length > 0 ? rawColors : ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff'];
      const worldStyle = _panel.querySelector('#palworld3d-style').value;
      const density = +_panel.querySelector('#palworld3d-density').value;
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('palette-world', { colors, worldStyle, density });
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
