// CSV → 3D Animated Chart
window.CsvChart3D = (() => {
  'use strict';
  let _container, _panel;
  let _csvData = null, _headers = [];

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'csv3d-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;border-radius:8px;overflow-y:auto;';
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#f59e0b,#ef4444);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">📊</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'CSV → 3D Chart' : 'CSV → Graphique 3D'}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'Animated data visualization' : 'Visualisation animée'}</div>
        </div>
      </div>
      <label style="display:block;width:100%;padding:12px;background:#1e293b;border:1px dashed #475569;border-radius:8px;text-align:center;cursor:pointer;font-size:11px;color:#94a3b8;margin-bottom:10px;">
        <div id="csv3d-lbl">📁 ${isEN ? 'Select CSV file' : 'Sélectionner fichier CSV'}</div>
        <input type="file" id="csv3d-file" accept=".csv,.tsv" style="display:none;" />
      </label>
      <div id="csv3d-cols" style="display:none;margin-bottom:10px;">
        <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${isEN ? 'Label Column' : 'Colonne Étiquette'}</div>
        <select id="csv3d-label" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;margin-bottom:6px;"></select>
        <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${isEN ? 'Value Column' : 'Colonne Valeur'}</div>
        <select id="csv3d-value" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;margin-bottom:6px;"></select>
        <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${isEN ? 'Chart Type' : 'Type de Graphique'}</div>
        <select id="csv3d-type" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;margin-bottom:6px;">
          <option value="bars">${isEN ? 'Animated Bars' : 'Barres Animées'}</option>
          <option value="bubbles">${isEN ? 'Bubbles' : 'Bulles'}</option>
          <option value="spiral">${isEN ? 'Spiral' : 'Spirale'}</option>
        </select>
        <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${isEN ? 'Color Theme' : 'Thème Couleur'}</div>
        <select id="csv3d-color" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;margin-bottom:6px;">
          <option value="spectrum">Spectrum</option>
          <option value="neon">Neon</option>
          <option value="fire">${isEN ? 'Fire' : 'Feu'}</option>
          <option value="ocean">Ocean</option>
        </select>
      </div>
      <button id="csv3d-add" disabled style="width:100%;padding:12px;background:linear-gradient(135deg,#f59e0b,#ef4444);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:not-allowed;opacity:0.5;">
        ${isEN ? '📐 ADD TO SCENE' : '📐 AJOUTER À LA SCÈNE'}
      </button>`;
    _container.appendChild(_panel);
    _bindUI();
  }

  function _bindUI() {
    const fileIn = _panel.querySelector('#csv3d-file');
    const lbl = _panel.querySelector('#csv3d-lbl');
    const cols = _panel.querySelector('#csv3d-cols');
    const addBtn = _panel.querySelector('#csv3d-add');
    const labelSel = _panel.querySelector('#csv3d-label');
    const valueSel = _panel.querySelector('#csv3d-value');

    fileIn.addEventListener('change', (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target.result;
        const rows = text.trim().split('\n').map(r => r.split(/[,;\t]/));
        if (rows.length < 2) return;
        _headers = rows[0].map(h => h.trim().replace(/"/g, ''));
        _csvData = rows.slice(1).map(r => {
          const obj = {};
          _headers.forEach((h, i) => obj[h] = (r[i] || '').trim().replace(/"/g, ''));
          return obj;
        });
        labelSel.innerHTML = ''; valueSel.innerHTML = '';
        _headers.forEach(h => {
          const o1 = document.createElement('option'); o1.value = h; o1.textContent = h;
          const o2 = document.createElement('option'); o2.value = h; o2.textContent = h;
          labelSel.appendChild(o1); valueSel.appendChild(o2);
        });
        if (_headers.length > 1) valueSel.selectedIndex = 1;
        lbl.textContent = '✅ ' + file.name;
        cols.style.display = 'block';
        addBtn.disabled = false; addBtn.style.cursor = 'pointer'; addBtn.style.opacity = '1';
      };
      reader.readAsText(file); e.target.value = '';
    });

    addBtn.onclick = () => {
      if (!_csvData) return;
      const labelKey = labelSel.value, valueKey = valueSel.value;
      const chartType = _panel.querySelector('#csv3d-type').value;
      const colorTheme = _panel.querySelector('#csv3d-color').value;
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('csv-chart', { data: { rows: _csvData, headers: _headers }, labelKey, valueKey, chartType, colorTheme });
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
