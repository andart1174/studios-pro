// Impossible Geometry (Escher Style)
window.ImpossibleGeometry3D = (() => {
  'use strict';
  let _container, _panel;

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'impossible3d-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;border-radius:8px;overflow-y:auto;';
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#c084fc,#2563eb);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">👁️</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'Impossible Geometry' : 'Géométrie Impossible'}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'Optical illusion architectures' : "Architectures d'illusion d'optique"}</div>
        </div>
      </div>
      <div style="background:#0f172a;border:1px solid #1e3a5f;border-radius:6px;padding:8px;margin-bottom:10px;font-size:10px;color:#64748b;">
        💡 ${isEN ? 'Note: These shapes appear perfectly impossible ONLY from the direct front camera view (Orthographic projection recommended in export).' : 'Note: Ces formes semblent impossibles UNIQUEMENT de face (Projection orthographique recommandée).'}
      </div>
      <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${isEN ? 'Select Illusion Type:' : "Sélectionnez le type d'illusion:"}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
        <button class="impos-preset" data-pre="penrose" style="padding:6px 10px;background:#1e293b;border:2px solid #c084fc;border-radius:6px;cursor:pointer;font-size:11px;color:#c084fc;font-weight:700;width:100%;text-align:left;">
          📐 ${isEN ? 'Penrose Triangle' : 'Triangle de Penrose'}
        </button>
        <button class="impos-preset" data-pre="box" style="padding:6px 10px;background:#1e293b;border:2px solid #334155;border-radius:6px;cursor:pointer;font-size:11px;color:#94a3b8;font-weight:700;width:100%;text-align:left;">
          📦 ${isEN ? 'Impossible Box' : 'Boîte Impossible'}
        </button>
        <button class="impos-preset" data-pre="stairs" style="padding:6px 10px;background:#1e293b;border:2px solid #334155;border-radius:6px;cursor:pointer;font-size:11px;color:#94a3b8;font-weight:700;width:100%;text-align:left;">
          🪜 ${isEN ? 'Escher Stairs' : "Escaliers d'Escher"}
        </button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Material Style' : 'Style Matériau'}</div>
          <select id="impos3d-mat" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
            <option value="matte">${isEN ? 'Matte Plastic' : 'Plastique Mat'}</option>
            <option value="stone">${isEN ? 'Ancient Stone' : 'Pierre Ancienne'}</option>
            <option value="metal">${isEN ? 'Brushed Metal' : 'Métal Brossé'}</option>
          </select>
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Color' : 'Couleur'}</div>
          <input type="color" id="impos3d-color" value="#e2e8f0" style="width:100%;height:28px;border:none;background:none;cursor:pointer;">
        </div>
      </div>
      <button id="impos3d-add" style="width:100%;padding:12px;background:linear-gradient(135deg,#c084fc,#2563eb);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">
        ${isEN ? '👁️ CONSTRUCT ILLUSION' : '👁️ CONSTRUIRE ILLUSION'}
      </button>`;
    _container.appendChild(_panel);
    _bindUI();
  }

  function _bindUI() {
    let _selectedType = 'penrose';
    _panel.querySelectorAll('.impos-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        _panel.querySelectorAll('.impos-preset').forEach(b => { b.style.borderColor='#334155'; b.style.color='#94a3b8'; });
        btn.style.borderColor='#c084fc'; btn.style.color='#c084fc';
        _selectedType = btn.dataset.pre;
      });
    });
    
    _panel.querySelector('#impos3d-add').onclick = () => {
      const illusionType = _selectedType;
      const matStyle = _panel.querySelector('#impos3d-mat').value;
      const baseColor = _panel.querySelector('#impos3d-color').value;
      
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('impossible-geometry', { illusionType, matStyle, baseColor });
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
