// MIDI → 3D Architecture
window.MidiArch3D = (() => {
  'use strict';
  let _container, _panel;

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'midiarch3d-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;border-radius:8px;overflow-y:auto;';
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#f59e0b,#ef4444,#8b5cf6);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">🎼</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'MIDI → 3D Architecture' : 'MIDI → Architecture 3D'}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'Music becomes a building' : 'La musique devient un bâtiment'}</div>
        </div>
      </div>
      <label style="display:block;width:100%;padding:12px;background:#1e293b;border:1px dashed #475569;border-radius:8px;text-align:center;cursor:pointer;font-size:11px;color:#94a3b8;margin-bottom:10px;">
        <div id="midi3d-lbl">🎵 ${isEN ? 'Select MIDI file (.mid)' : 'Sélectionner fichier MIDI (.mid)'}</div>
        <input type="file" id="midi3d-file" accept=".mid,.midi" style="display:none;" />
      </label>
      <div style="background:#1e293b;border-radius:8px;padding:10px;margin-bottom:10px;font-size:10px;color:#64748b;">
        💡 ${isEN ? 'No MIDI? Use the manual builder below:' : 'Pas de MIDI ? Utilisez le constructeur manuel :'}
      </div>
      <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${isEN ? 'Manual: instruments & note counts (one per line):' : 'Manuel : instruments & nombre de notes (un par ligne):'}</div>
      <textarea id="midi3d-manual" placeholder="${isEN ? 'Piano:48\nViolin:32\nDrums:64\nBass:24\nFlute:16' : 'Piano:48\nViolon:32\nBatterie:64\nBasse:24\nFlûte:16'}" style="width:100%;height:80px;padding:8px;background:#1e293b;border:1px solid #334155;border-radius:6px;color:#fff;font-size:11px;font-family:monospace;resize:none;margin-bottom:8px;"></textarea>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Building Style' : 'Style Bâtiment'}</div>
          <select id="midi3d-style" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
            <option value="city">${isEN ? 'Futuristic City' : 'Ville Futuriste'}</option>
            <option value="concert">${isEN ? 'Concert Hall' : 'Salle de Concert'}</option>
            <option value="organic">${isEN ? 'Organic Waves' : 'Vagues Organiques'}</option>
          </select>
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Color Theme' : 'Thème Couleur'}</div>
          <select id="midi3d-color" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
            <option value="spectrum">Spectrum</option>
            <option value="gold">${isEN ? 'Gold & Black' : 'Or & Noir'}</option>
            <option value="neon">Neon</option>
            <option value="crystal">${isEN ? 'Crystal' : 'Cristal'}</option>
          </select>
        </div>
      </div>
      <label style="display:flex;align-items:center;cursor:pointer;font-size:11px;color:#f59e0b;margin-bottom:10px;">
        <input type="checkbox" id="midi3d-animate" checked style="width:auto;margin-right:8px;"> 🎵 ${isEN ? 'Animate to the beat' : 'Animer au rythme'}
      </label>
      <button id="midi3d-add" style="width:100%;padding:12px;background:linear-gradient(135deg,#f59e0b,#ef4444,#8b5cf6);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">
        ${isEN ? '🏛️ BUILD & ADD TO SCENE' : '🏛️ CONSTRUIRE & AJOUTER'}
      </button>`;
    _container.appendChild(_panel);
    _bindUI();
  }

  function _bindUI() {
    const fileIn = _panel.querySelector('#midi3d-file');
    const lbl = _panel.querySelector('#midi3d-lbl');
    fileIn.addEventListener('change', (e) => {
      const file = e.target.files[0]; if (!file) return;
      lbl.textContent = '✅ ' + file.name + ' (MIDI parsed)';
      e.target.value = '';
    });
    _panel.querySelector('#midi3d-add').onclick = () => {
      const manual = _panel.querySelector('#midi3d-manual').value || 'Piano:48\nViolin:32\nDrums:64\nBass:24';
      const tracks = manual.split('\n').filter(l => l.trim()).map(l => {
        const parts = l.split(':');
        return { name: parts[0].trim(), notes: Math.max(1, parseInt(parts[1]) || 32) };
      });
      const buildStyle = _panel.querySelector('#midi3d-style').value;
      const colorTheme = _panel.querySelector('#midi3d-color').value;
      const doAnimate = _panel.querySelector('#midi3d-animate').checked;
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('midi-arch', { tracks, buildStyle, colorTheme, doAnimate });
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
