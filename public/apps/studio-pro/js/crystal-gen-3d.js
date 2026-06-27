// Crystal Generator 3D
window.CrystalGen3D = (() => {
  'use strict';
  let _container, _panel;

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'crystalgen3d-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;border-radius:8px;overflow-y:auto;';
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#a855f7,#06b6d4,#f472b6);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">🔮</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'Crystal Generator 3D' : 'Générateur de Cristaux 3D'}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'Unique crystal from word or sound' : 'Cristal unique depuis un mot ou son'}</div>
        </div>
      </div>
      <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${isEN ? 'Enter a keyword (the word shapes the crystal):' : 'Entrez un mot-clé (le mot forme le cristal):'}</div>
      <input type="text" id="crystalgen3d-word" placeholder="${isEN ? 'Diamond / Power / Love / Chaos...' : 'Diamant / Puissance / Amour / Chaos...'}" style="width:100%;padding:10px;background:#1e293b;border:1px solid #7c3aed;border-radius:8px;color:#c084fc;font-size:16px;font-family:Inter,sans-serif;margin-bottom:10px;text-align:center;letter-spacing:2px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Crystal Type' : 'Type de Cristal'}</div>
          <select id="crystalgen3d-type" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
            <option value="cluster">${isEN ? 'Crystal Cluster' : 'Groupe de Cristaux'}</option>
            <option value="geode">${isEN ? 'Geode' : 'Géode'}</option>
            <option value="monolith">${isEN ? 'Monolith' : 'Monolithe'}</option>
            <option value="fractal">${isEN ? 'Fractal Crystal' : 'Cristal Fractal'}</option>
          </select>
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Crystal Color' : 'Couleur Cristal'}</div>
          <input type="color" id="crystalgen3d-color" value="#a855f7" style="width:100%;height:28px;border:none;background:none;cursor:pointer;">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Spikes' : 'Pointes'} <b id="cryst-spv">7</b></div>
          <input type="range" id="crystalgen3d-spikes" min="3" max="20" value="7" style="width:100%;accent-color:#a855f7;">
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Height' : 'Hauteur'} <b id="cryst-hv">1.0</b></div>
          <input type="range" id="crystalgen3d-height" min="0.3" max="3" step="0.1" value="1.0" style="width:100%;accent-color:#06b6d4;">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Metalness' : 'Métallique'} <b id="cryst-mv">0.5</b></div>
          <input type="range" id="crystalgen3d-metal" min="0" max="1" step="0.05" value="0.5" style="width:100%;accent-color:#f472b6;">
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Transparency' : 'Transparence'} <b id="cryst-tv">0.6</b></div>
          <input type="range" id="crystalgen3d-transp" min="0" max="1" step="0.05" value="0.6" style="width:100%;accent-color:#a855f7;">
        </div>
      </div>
      <label style="display:flex;align-items:center;cursor:pointer;font-size:11px;color:#c084fc;margin-bottom:10px;">
        <input type="checkbox" id="crystalgen3d-glow" checked style="width:auto;margin-right:8px;"> 💎 ${isEN ? 'Inner glow + slow rotation' : 'Lueur intérieure + rotation lente'}
      </label>
      <button id="crystalgen3d-add" style="width:100%;padding:12px;background:linear-gradient(135deg,#a855f7,#06b6d4,#f472b6);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 20px rgba(168,85,247,0.4);">
        ${isEN ? '🔮 CRYSTALLIZE' : '🔮 CRISTALLISER'}
      </button>`;
    _container.appendChild(_panel);
    _bindUI();
  }

  function _bindUI() {
    _panel.querySelector('#crystalgen3d-spikes').addEventListener('input', e => { _panel.querySelector('#cryst-spv').textContent = e.target.value; });
    _panel.querySelector('#crystalgen3d-height').addEventListener('input', e => { _panel.querySelector('#cryst-hv').textContent = (+e.target.value).toFixed(1); });
    _panel.querySelector('#crystalgen3d-metal').addEventListener('input', e => { _panel.querySelector('#cryst-mv').textContent = (+e.target.value).toFixed(2); });
    _panel.querySelector('#crystalgen3d-transp').addEventListener('input', e => { _panel.querySelector('#cryst-tv').textContent = (+e.target.value).toFixed(2); });
    _panel.querySelector('#crystalgen3d-add').onclick = () => {
      const keyword = _panel.querySelector('#crystalgen3d-word').value || 'crystal';
      const crystalType = _panel.querySelector('#crystalgen3d-type').value;
      const crystalColor = _panel.querySelector('#crystalgen3d-color').value;
      const spikes = +_panel.querySelector('#crystalgen3d-spikes').value;
      const heightScale = +_panel.querySelector('#crystalgen3d-height').value;
      const metalness = +_panel.querySelector('#crystalgen3d-metal').value;
      const transparency = +_panel.querySelector('#crystalgen3d-transp').value;
      const doGlow = _panel.querySelector('#crystalgen3d-glow').checked;
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('crystal-gen', { keyword, crystalType, crystalColor, spikes, heightScale, metalness, transparency, doGlow });
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
