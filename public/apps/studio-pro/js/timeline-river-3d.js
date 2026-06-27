// Timeline → River of Time 3D
window.TimelineRiver3D = (() => {
  'use strict';
  let _container, _panel;

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'timeline3d-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;border-radius:8px;overflow-y:auto;';
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#f59e0b,#10b981);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">⏳</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'Timeline → River of Time 3D' : 'Chronologie → Fleuve du Temps 3D'}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'Events as floating islands' : 'Événements en îles flottantes'}</div>
        </div>
      </div>
      <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${isEN ? 'Enter events (year: event name, one per line):' : 'Entrez événements (année: nom, un par ligne):'}</div>
      <textarea id="timeline3d-events" placeholder="${isEN ? '1969: Moon Landing\n1989: Berlin Wall Falls\n2001: Internet Boom\n2007: iPhone Launch\n2020: Pandemic\n2024: AI Revolution' : '1789: Révolution Française\n1945: Fin Guerre Mondiale\n1969: Alunissage\n1991: Chute URSS\n2020: Pandémie'}" style="width:100%;height:110px;padding:8px;background:#1e293b;border:1px solid #334155;border-radius:6px;color:#fff;font-size:11px;resize:none;margin-bottom:8px;"></textarea>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'River Style' : 'Style Fleuve'}</div>
          <select id="timeline3d-style" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
            <option value="islands">${isEN ? 'Floating Islands' : 'Îles Flottantes'}</option>
            <option value="pillars">${isEN ? 'Time Pillars' : 'Piliers du Temps'}</option>
            <option value="spiral">${isEN ? 'Spiral Path' : 'Chemin Spiral'}</option>
          </select>
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Color Theme' : 'Thème Couleur'}</div>
          <select id="timeline3d-color" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
            <option value="golden">${isEN ? 'Golden Era' : 'Ère Dorée'}</option>
            <option value="neon">Neon Future</option>
            <option value="stone">${isEN ? 'Ancient Stone' : 'Pierre Ancienne'}</option>
          </select>
        </div>
      </div>
      <label style="display:flex;align-items:center;cursor:pointer;font-size:11px;color:#f59e0b;margin-bottom:10px;">
        <input type="checkbox" id="timeline3d-animate" checked style="width:auto;margin-right:8px;"> ✨ ${isEN ? 'Animate light flow between events' : 'Animer flux de lumière entre événements'}
      </label>
      <button id="timeline3d-add" style="width:100%;padding:12px;background:linear-gradient(135deg,#f59e0b,#10b981);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">
        ${isEN ? '⏳ CREATE RIVER OF TIME' : '⏳ CRÉER FLEUVE DU TEMPS'}
      </button>`;
    _container.appendChild(_panel);
    _bindUI();
  }

  function _bindUI() {
    _panel.querySelector('#timeline3d-add').onclick = () => {
      const text = _panel.querySelector('#timeline3d-events').value;
      const events = text.split('\n').filter(l => l.trim()).map(l => {
        const idx = l.indexOf(':');
        return { year: l.slice(0, idx).trim(), label: l.slice(idx + 1).trim() };
      });
      const riverStyle = _panel.querySelector('#timeline3d-style').value;
      const colorTheme = _panel.querySelector('#timeline3d-color').value;
      const doAnimate = _panel.querySelector('#timeline3d-animate').checked;
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('timeline-river', { events, riverStyle, colorTheme, doAnimate });
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
