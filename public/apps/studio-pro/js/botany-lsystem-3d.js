// Procedural Botany (L-System 3D)
window.BotanyLSystem3D = (() => {
  'use strict';
  let _container, _panel;

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'botany3d-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;border-radius:8px;overflow-y:auto;';
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#10b981,#047857);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">🌿</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'Procedural Botany' : 'Botanique Procédurale'}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'L-System 3D Flora' : 'Flore L-System 3D'}</div>
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
        <button class="botany-preset" data-pre="tree" style="padding:4px 8px;background:#1e293b;border:1px solid #10b981;border-radius:6px;cursor:pointer;font-size:11px;color:#10b981;">🌲 ${isEN?'Tree':'Arbre'}</button>
        <button class="botany-preset" data-pre="weed" style="padding:4px 8px;background:#1e293b;border:1px solid #334155;border-radius:6px;cursor:pointer;font-size:11px;color:#94a3b8;">🌿 ${isEN?'Weed':'Herbe'}</button>
        <button class="botany-preset" data-pre="bush" style="padding:4px 8px;background:#1e293b;border:1px solid #334155;border-radius:6px;cursor:pointer;font-size:11px;color:#94a3b8;">🌳 ${isEN?'Bush':'Buisson'}</button>
        <button class="botany-preset" data-pre="alien" style="padding:4px 8px;background:#1e293b;border:1px solid #334155;border-radius:6px;cursor:pointer;font-size:11px;color:#94a3b8;">👽 Alien</button>
      </div>
      <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${isEN ? 'Axiom (Start state):' : 'Axiome (État initial):'}</div>
      <input type="text" id="botany3d-axiom" value="F" style="width:100%;padding:7px;background:#1e293b;border:1px solid #334155;border-radius:6px;color:#fff;font-size:12px;font-family:monospace;margin-bottom:8px;">
      <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${isEN ? 'Rules (e.g. F=FF-[-F+F+F]+[+F-F-F]):' : 'Règles (ex: F=FF-[-F+F+F]+[+F-F-F]):'}</div>
      <textarea id="botany3d-rules" style="width:100%;height:60px;padding:8px;background:#1e293b;border:1px solid #334155;border-radius:6px;color:#10b981;font-size:11px;font-family:monospace;resize:none;margin-bottom:8px;">F=FF-[-F+F+F]+[+F-F-F]</textarea>
      
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Iterations (Max 5)' : 'Itérations (Max 5)'} <b id="bot-iv">4</b></div>
          <input type="range" id="botany3d-iter" min="1" max="5" value="4" style="width:100%;accent-color:#10b981;">
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Angle' : 'Angle'} <b id="bot-av">22.5°</b></div>
          <input type="range" id="botany3d-angle" min="5" max="90" value="22.5" step="0.5" style="width:100%;accent-color:#047857;">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Trunk Color' : 'Couleur Tronc'}</div>
          <input type="color" id="botany3d-ctrunk" value="#78350f" style="width:100%;height:28px;border:none;background:none;cursor:pointer;">
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Leaf Color' : 'Couleur Feuille'}</div>
          <input type="color" id="botany3d-cleaf" value="#10b981" style="width:100%;height:28px;border:none;background:none;cursor:pointer;">
        </div>
      </div>
      <button id="botany3d-add" style="width:100%;padding:12px;background:linear-gradient(135deg,#10b981,#047857);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">
        ${isEN ? '🌿 GROW PLANT' : '🌿 FAIRE POUSSER'}
      </button>`;
    _container.appendChild(_panel);
    _bindUI();
  }

  function _bindUI() {
    _panel.querySelector('#botany3d-iter').addEventListener('input', e => _panel.querySelector('#bot-iv').textContent = e.target.value);
    _panel.querySelector('#botany3d-angle').addEventListener('input', e => _panel.querySelector('#bot-av').textContent = e.target.value+'°');
    
    const presets = {
      tree: { ax:'F', rl:'F=FF-[-F+F+F]+[+F-F-F]', ang:22.5, it:4, ct:'#78350f', cl:'#10b981' },
      weed: { ax:'F', rl:'F=F[+F]F[-F]F', ang:25.7, it:5, ct:'#047857', cl:'#34d399' },
      bush: { ax:'Y', rl:'X=X[-FFF][+FFF]FX\nY=YFX[+Y][-Y]', ang:25.7, it:5, ct:'#451a03', cl:'#65a30d' },
      alien:{ ax:'X', rl:'X=F[+X][-X]FX\nF=FF', ang:30, it:6, ct:'#1e1b4b', cl:'#8b5cf6' } // Custom limit
    };

    _panel.querySelectorAll('.botany-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        _panel.querySelectorAll('.botany-preset').forEach(b => { b.style.borderColor='#334155'; b.style.color='#94a3b8'; });
        btn.style.borderColor='#10b981'; btn.style.color='#10b981';
        const p = presets[btn.dataset.pre];
        _panel.querySelector('#botany3d-axiom').value = p.ax;
        _panel.querySelector('#botany3d-rules').value = p.rl;
        _panel.querySelector('#botany3d-angle').value = p.ang;
        _panel.querySelector('#bot-av').textContent = p.ang+'°';
        const itR = _panel.querySelector('#botany3d-iter');
        itR.max = btn.dataset.pre==='alien' ? 6 : 5;
        itR.value = p.it;
        _panel.querySelector('#bot-iv').textContent = p.it;
        _panel.querySelector('#botany3d-ctrunk').value = p.ct;
        _panel.querySelector('#botany3d-cleaf').value = p.cl;
      });
    });

    _panel.querySelector('#botany3d-add').onclick = () => {
      const axiom = _panel.querySelector('#botany3d-axiom').value || 'F';
      const rText = _panel.querySelector('#botany3d-rules').value;
      const rules = {};
      rText.split('\\n').forEach(l => { const p = l.split('='); if(p.length===2) rules[p[0].trim()] = p[1].trim(); });
      const iter = Math.min(+_panel.querySelector('#botany3d-iter').value, 6); // Max 6 for safety
      const angle = +_panel.querySelector('#botany3d-angle').value;
      const cTrunk = _panel.querySelector('#botany3d-ctrunk').value;
      const cLeaf = _panel.querySelector('#botany3d-cleaf').value;
      
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('botany-lsystem', { axiom, rules, iter, angle, cTrunk, cLeaf });
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
