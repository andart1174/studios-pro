// DNA / Text → 3D Helix
window.DnaHelix3D = (() => {
  'use strict';
  let _container, _panel;

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'dnahelix3d-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;border-radius:8px;overflow-y:auto;';
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#34d399,#3b82f6);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">🧬</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'Text → 3D Helix' : 'Texte → Hélice 3D'}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'DNA/text animated double helix' : 'Double hélice ADN animée'}</div>
        </div>
      </div>
      <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${isEN ? 'Enter text or DNA sequence (ATCG...):' : 'Entrez texte ou séquence ADN (ATCG...):'}</div>
      <textarea id="dnahelix3d-text" placeholder="${isEN ? 'ATCGATCGATCG...\nor any text like: Hello World!' : 'ATCGATCGATCG...\nou texte quelconque: Bonjour Monde!'}" style="width:100%;height:70px;padding:8px;background:#1e293b;border:1px solid #334155;border-radius:6px;color:#34d399;font-size:11px;font-family:monospace;resize:none;margin-bottom:8px;"></textarea>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Helix Style' : 'Style Hélice'}</div>
          <select id="dnahelix3d-style" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
            <option value="double">${isEN ? 'Double Helix' : 'Double Hélice'}</option>
            <option value="single">${isEN ? 'Single' : 'Simple'}</option>
            <option value="triple">${isEN ? 'Triple' : 'Triple'}</option>
          </select>
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Color Mode' : 'Mode Couleur'}</div>
          <select id="dnahelix3d-color" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
            <option value="dna">${isEN ? 'DNA Classic' : 'ADN Classique'}</option>
            <option value="neon">Neon</option>
            <option value="rainbow">Rainbow</option>
            <option value="fire">${isEN ? 'Fire' : 'Feu'}</option>
          </select>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
        <label style="font-size:10px;color:#94a3b8;min-width:90px;">${isEN ? 'Twist' : 'Torsion'} <b id="dna-tv">1.0</b></label>
        <input type="range" id="dnahelix3d-twist" min="0.2" max="3" step="0.1" value="1.0" style="flex:1;accent-color:#34d399;">
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">
        <label style="font-size:10px;color:#94a3b8;min-width:90px;">${isEN ? 'Radius' : 'Rayon'} <b id="dna-rv">15</b></label>
        <input type="range" id="dnahelix3d-radius" min="5" max="40" value="15" style="flex:1;accent-color:#34d399;">
      </div>
      <button id="dnahelix3d-add" style="width:100%;padding:12px;background:linear-gradient(135deg,#34d399,#3b82f6);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">
        ${isEN ? '📐 ADD TO SCENE' : '📐 AJOUTER À LA SCÈNE'}
      </button>`;
    _container.appendChild(_panel);
    _bindUI();
  }

  function _bindUI() {
    _panel.querySelector('#dnahelix3d-twist').addEventListener('input', e => { _panel.querySelector('#dna-tv').textContent = (+e.target.value).toFixed(1); });
    _panel.querySelector('#dnahelix3d-radius').addEventListener('input', e => { _panel.querySelector('#dna-rv').textContent = e.target.value; });
    _panel.querySelector('#dnahelix3d-add').onclick = () => {
      const sequence = _panel.querySelector('#dnahelix3d-text').value || 'ATCGATCGATCGATCG';
      const helixStyle = _panel.querySelector('#dnahelix3d-style').value;
      const colorMode = _panel.querySelector('#dnahelix3d-color').value;
      const twistFactor = +_panel.querySelector('#dnahelix3d-twist').value;
      const helixRadius = +_panel.querySelector('#dnahelix3d-radius').value;
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('dna-helix', { sequence, helixStyle, colorMode, twistFactor, helixRadius });
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
