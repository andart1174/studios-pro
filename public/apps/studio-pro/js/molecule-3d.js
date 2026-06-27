// Molecule / Chemical Formula → 3D Model
window.Molecule3D = (() => {
  'use strict';
  let _container, _panel;

  // Atom properties: [color, radius]
  const ATOMS = {
    H:['#ffffff',0.4], C:['#404040',0.7], N:['#3b82f6',0.7], O:['#ef4444',0.65],
    F:['#10b981',0.55], P:['#f97316',0.8], S:['#facc15',0.9], Cl:['#22c55e',0.8],
    Br:['#92400e',0.9], I:['#7c3aed',1.0], Na:['#a855f7',1.1], K:['#ec4899',1.2],
    Ca:['#94a3b8',1.1], Fe:['#b45309',1.0], Cu:['#b45309',0.9], Zn:['#94a3b8',0.85]
  };

  // Preset molecules: name → atoms list with positions [x,y,z] and bonds
  const PRESETS = {
    H2O: { atoms:[{s:'O',p:[0,0,0]},{s:'H',p:[1.5,1,0]},{s:'H',p:[-1.5,1,0]}], bonds:[[0,1],[0,2]] },
    CO2: { atoms:[{s:'C',p:[0,0,0]},{s:'O',p:[2,0,0]},{s:'O',p:[-2,0,0]}], bonds:[[0,1],[0,1],[0,2],[0,2]] },
    NH3: { atoms:[{s:'N',p:[0,0,0]},{s:'H',p:[2,1,0]},{s:'H',p:[-1,1,1.7]},{s:'H',p:[-1,1,-1.7]}], bonds:[[0,1],[0,2],[0,3]] },
    CH4: { atoms:[{s:'C',p:[0,0,0]},{s:'H',p:[2,2,0]},{s:'H',p:[-2,2,0]},{s:'H',p:[0,-2,2]},{s:'H',p:[0,-2,-2]}], bonds:[[0,1],[0,2],[0,3],[0,4]] },
    C6H6: { atoms:[
      {s:'C',p:[4,0,0]},{s:'C',p:[2,3.5,0]},{s:'C',p:[-2,3.5,0]},{s:'C',p:[-4,0,0]},{s:'C',p:[-2,-3.5,0]},{s:'C',p:[2,-3.5,0]},
      {s:'H',p:[7,0,0]},{s:'H',p:[3.5,6,0]},{s:'H',p:[-3.5,6,0]},{s:'H',p:[-7,0,0]},{s:'H',p:[-3.5,-6,0]},{s:'H',p:[3.5,-6,0]}
    ], bonds:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[0,6],[1,7],[2,8],[3,9],[4,10],[5,11]] },
    NaCl: { atoms:[{s:'Na',p:[0,0,0]},{s:'Cl',p:[2.5,0,0]}], bonds:[[0,1]] },
    custom: null
  };

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'molecule3d-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;border-radius:8px;overflow-y:auto;';
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#06b6d4,#10b981,#f59e0b);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">🧬</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'Molecule → 3D Atomic Model' : 'Molécule → Modèle Atomique 3D'}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'Color-coded atoms & bonds' : 'Atomes colorés & liaisons'}</div>
        </div>
      </div>
      <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${isEN ? 'Quick presets:' : 'Présélections rapides:'}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
        ${Object.keys(PRESETS).filter(k=>k!=='custom').map(k=>`<button class="mol-preset" data-mol="${k}" style="padding:4px 8px;background:#1e293b;border:1px solid #334155;border-radius:6px;cursor:pointer;font-size:11px;color:#94a3b8;font-family:monospace;">${k}</button>`).join('')}
      </div>
      <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${isEN ? 'Or enter atoms manually (symbol x y z, one per line):' : 'Ou entrez atomes manuellement (symbole x y z):'}</div>
      <textarea id="molecule3d-atoms" placeholder="C 0 0 0&#10;H 2 2 0&#10;H -2 2 0&#10;O 0 -2 0" style="width:100%;height:80px;padding:8px;background:#1e293b;border:1px solid #334155;border-radius:6px;color:#10b981;font-size:11px;font-family:monospace;resize:none;margin-bottom:6px;"></textarea>
      <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${isEN ? 'Bonds (atom indices, one pair per line):' : 'Liaisons (indices atomes, une paire par ligne):'}</div>
      <textarea id="molecule3d-bonds" placeholder="0 1&#10;0 2&#10;0 3" style="width:100%;height:50px;padding:8px;background:#1e293b;border:1px solid #334155;border-radius:6px;color:#f59e0b;font-size:11px;font-family:monospace;resize:none;margin-bottom:8px;"></textarea>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Atom Scale' : 'Échelle Atomes'} <b id="mol-sv">1.0</b></div>
          <input type="range" id="molecule3d-scale" min="0.5" max="3" step="0.1" value="1.0" style="width:100%;accent-color:#06b6d4;">
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Bond Thickness' : 'Épaisseur Liaisons'} <b id="mol-bv">1.0</b></div>
          <input type="range" id="molecule3d-bond" min="0.2" max="3" step="0.1" value="1.0" style="width:100%;accent-color:#10b981;">
        </div>
      </div>
      <label style="display:flex;align-items:center;cursor:pointer;font-size:11px;color:#34d399;margin-bottom:10px;">
        <input type="checkbox" id="molecule3d-animate" checked style="width:auto;margin-right:8px;"> 🔄 ${isEN ? 'Rotate & animate bonds' : 'Rotation & animation liaisons'}
      </label>
      <button id="molecule3d-add" style="width:100%;padding:12px;background:linear-gradient(135deg,#06b6d4,#10b981,#f59e0b);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">
        ${isEN ? '⚗️ BUILD MOLECULE' : '⚗️ CONSTRUIRE MOLÉCULE'}
      </button>`;
    _container.appendChild(_panel);
    _bindUI();
  }

  function _bindUI() {
    _panel.querySelector('#molecule3d-scale').addEventListener('input', e => { _panel.querySelector('#mol-sv').textContent = (+e.target.value).toFixed(1); });
    _panel.querySelector('#molecule3d-bond').addEventListener('input', e => { _panel.querySelector('#mol-bv').textContent = (+e.target.value).toFixed(1); });
    _panel.querySelectorAll('.mol-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const mol = PRESETS[btn.dataset.mol];
        if (!mol) return;
        _panel.querySelector('#molecule3d-atoms').value = mol.atoms.map(a => `${a.s} ${a.p[0]} ${a.p[1]} ${a.p[2]}`).join('\n');
        _panel.querySelector('#molecule3d-bonds').value = mol.bonds.map(b => `${b[0]} ${b[1]}`).join('\n');
        _panel.querySelectorAll('.mol-preset').forEach(b => b.style.color = '#94a3b8');
        btn.style.color = '#10b981';
      });
    });
    _panel.querySelector('#molecule3d-add').onclick = () => {
      const atomLines = _panel.querySelector('#molecule3d-atoms').value.split('\n').filter(l => l.trim());
      const bondLines = _panel.querySelector('#molecule3d-bonds').value.split('\n').filter(l => l.trim());
      const atoms = atomLines.map(l => { const p = l.trim().split(/\s+/); return { symbol: p[0], x: +p[1]||0, y: +p[2]||0, z: +p[3]||0 }; });
      const bonds = bondLines.map(l => { const p = l.trim().split(/\s+/); return [+p[0], +p[1]]; });
      const atomScale = +_panel.querySelector('#molecule3d-scale').value;
      const bondThick = +_panel.querySelector('#molecule3d-bond').value;
      const doAnimate = _panel.querySelector('#molecule3d-animate').checked;
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('molecule-3d', { atoms, bonds, atomScale, bondThick, doAnimate });
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
