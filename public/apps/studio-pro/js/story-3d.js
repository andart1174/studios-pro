// Text Story → 3D Mini-Film
window.Story3D = (() => {
  'use strict';
  let _container, _panel;

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'story3d-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;border-radius:8px;overflow-y:auto;';
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#8b5cf6,#f59e0b);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">🗣️</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'Text → 3D Story Scene' : 'Texte → Scène Histoire 3D'}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'Your story becomes a 3D world' : 'Votre histoire devient un monde 3D'}</div>
        </div>
      </div>
      <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${isEN ? 'Write your short story (each paragraph = one scene):' : 'Écrivez votre courte histoire (chaque paragraphe = une scène):'}</div>
      <textarea id="story3d-text" placeholder="${isEN ? 'A hero stands on a mountain peak...\n\nThe dragon flies above dark clouds...\n\nFinally, light breaks through the storm.' : 'Un héros se tient au sommet d\'une montagne...\n\nLe dragon vole au-dessus des nuages sombres...\n\nEnfin, la lumière perce à travers la tempête.'}" style="width:100%;height:100px;padding:10px;background:#1e293b;border:1px solid #334155;border-radius:8px;color:#e2e8f0;font-size:12px;resize:none;margin-bottom:10px;line-height:1.5;"></textarea>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Scene Style' : 'Style de Scène'}</div>
          <select id="story3d-style" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
            <option value="fantasy">${isEN ? 'Fantasy' : 'Fantastique'}</option>
            <option value="scifi">${isEN ? 'Sci-Fi' : 'Science-Fiction'}</option>
            <option value="nature">${isEN ? 'Nature' : 'Nature'}</option>
            <option value="urban">${isEN ? 'Urban' : 'Urbain'}</option>
          </select>
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Character Style' : 'Style Personnage'}</div>
          <select id="story3d-char" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
            <option value="geometric">${isEN ? 'Geometric' : 'Géométrique'}</option>
            <option value="humanoid">${isEN ? 'Humanoid' : 'Humanoïde'}</option>
            <option value="robot">${isEN ? 'Robot' : 'Robot'}</option>
          </select>
        </div>
      </div>
      <label style="display:flex;align-items:center;cursor:pointer;font-size:11px;color:#c084fc;margin-bottom:10px;">
        <input type="checkbox" id="story3d-camera" checked style="width:auto;margin-right:8px;"> 🎬 ${isEN ? 'Animated camera between scenes' : 'Caméra animée entre les scènes'}
      </label>
      <button id="story3d-add" style="width:100%;padding:12px;background:linear-gradient(135deg,#8b5cf6,#f59e0b);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">
        ${isEN ? '🎬 GENERATE STORY SCENE' : '🎬 GÉNÉRER SCÈNE HISTOIRE'}
      </button>`;
    _container.appendChild(_panel);
    _bindUI();
  }

  function _bindUI() {
    _panel.querySelector('#story3d-add').onclick = () => {
      const text = _panel.querySelector('#story3d-text').value;
      const scenes = text.split(/\n\s*\n/).filter(s => s.trim()).map(s => s.trim());
      const sceneStyle = _panel.querySelector('#story3d-style').value;
      const charStyle = _panel.querySelector('#story3d-char').value;
      const animCamera = _panel.querySelector('#story3d-camera').checked;
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('story-3d', { scenes, sceneStyle, charStyle, animCamera });
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
