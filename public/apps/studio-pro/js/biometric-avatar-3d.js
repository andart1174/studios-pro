// Biometric Data → Live 3D Avatar
window.BiometricAvatar3D = (() => {
  'use strict';
  let _container, _panel;

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'biometric3d-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;border-radius:8px;overflow-y:auto;';
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#ef4444,#f97316);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">🌡️</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'Biometric → 3D Avatar' : 'Biométrique → Avatar 3D'}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'A living avatar from your vitals' : 'Avatar vivant depuis vos données vitales'}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
        <div style="background:#1e293b;border-radius:8px;padding:10px;">
          <div style="font-size:10px;color:#ef4444;margin-bottom:6px;font-weight:700;">❤️ ${isEN ? 'Heart Rate (BPM)' : 'Fréquence Cardiaque (BPM)'}</div>
          <input type="number" id="bio3d-hr" value="72" min="40" max="200" style="width:100%;padding:6px;background:#0f172a;border:1px solid #ef4444;border-radius:4px;color:#ef4444;font-size:18px;font-weight:700;text-align:center;">
          <input type="range" id="bio3d-hr-range" min="40" max="200" value="72" style="width:100%;accent-color:#ef4444;margin-top:4px;">
        </div>
        <div style="background:#1e293b;border-radius:8px;padding:10px;">
          <div style="font-size:10px;color:#3b82f6;margin-bottom:6px;font-weight:700;">🫁 ${isEN ? 'Breath Rate (/min)' : 'Rythme Respiratoire (/min)'}</div>
          <input type="number" id="bio3d-br" value="15" min="5" max="40" style="width:100%;padding:6px;background:#0f172a;border:1px solid #3b82f6;border-radius:4px;color:#3b82f6;font-size:18px;font-weight:700;text-align:center;">
          <input type="range" id="bio3d-br-range" min="5" max="40" value="15" style="width:100%;accent-color:#3b82f6;margin-top:4px;">
        </div>
        <div style="background:#1e293b;border-radius:8px;padding:10px;">
          <div style="font-size:10px;color:#10b981;margin-bottom:6px;font-weight:700;">📊 ${isEN ? 'Blood Pressure (mmHg)' : 'Tension Artérielle (mmHg)'}</div>
          <input type="number" id="bio3d-bp" value="120" min="60" max="200" style="width:100%;padding:6px;background:#0f172a;border:1px solid #10b981;border-radius:4px;color:#10b981;font-size:18px;font-weight:700;text-align:center;">
          <input type="range" id="bio3d-bp-range" min="60" max="200" value="120" style="width:100%;accent-color:#10b981;margin-top:4px;">
        </div>
        <div style="background:#1e293b;border-radius:8px;padding:10px;">
          <div style="font-size:10px;color:#f59e0b;margin-bottom:6px;font-weight:700;">💪 ${isEN ? 'Energy Level (%)' : 'Niveau Énergie (%)'}</div>
          <input type="number" id="bio3d-energy" value="80" min="0" max="100" style="width:100%;padding:6px;background:#0f172a;border:1px solid #f59e0b;border-radius:4px;color:#f59e0b;font-size:18px;font-weight:700;text-align:center;">
          <input type="range" id="bio3d-energy-range" min="0" max="100" value="80" style="width:100%;accent-color:#f59e0b;margin-top:4px;">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Avatar Form' : 'Forme Avatar'}</div>
          <select id="bio3d-form" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
            <option value="human">${isEN ? 'Human Silhouette' : 'Silhouette Humaine'}</option>
            <option value="orb">${isEN ? 'Energy Orb' : 'Orbe Énergie'}</option>
            <option value="crystal">${isEN ? 'Living Crystal' : 'Cristal Vivant'}</option>
          </select>
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Aura Color' : 'Couleur Aura'}</div>
          <input type="color" id="bio3d-aura" value="#ef4444" style="width:100%;height:28px;border:none;background:none;cursor:pointer;">
        </div>
      </div>
      <button id="bio3d-add" style="width:100%;padding:12px;background:linear-gradient(135deg,#ef4444,#f97316);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">
        ${isEN ? '❤️ CREATE LIVING AVATAR' : '❤️ CRÉER AVATAR VIVANT'}
      </button>`;
    _container.appendChild(_panel);
    _bindUI();
  }

  function _bindUI() {
    const pairs = [['#bio3d-hr','#bio3d-hr-range'],['#bio3d-br','#bio3d-br-range'],['#bio3d-bp','#bio3d-bp-range'],['#bio3d-energy','#bio3d-energy-range']];
    pairs.forEach(([num, range]) => {
      const n = _panel.querySelector(num), r = _panel.querySelector(range);
      n.addEventListener('input', e => { r.value = e.target.value; });
      r.addEventListener('input', e => { n.value = e.target.value; });
    });
    _panel.querySelector('#bio3d-add').onclick = () => {
      const vitals = {
        heartRate: +_panel.querySelector('#bio3d-hr').value,
        breathRate: +_panel.querySelector('#bio3d-br').value,
        bloodPressure: +_panel.querySelector('#bio3d-bp').value,
        energy: +_panel.querySelector('#bio3d-energy').value
      };
      const avatarForm = _panel.querySelector('#bio3d-form').value;
      const auraColor = _panel.querySelector('#bio3d-aura').value;
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('biometric-avatar', { vitals, avatarForm, auraColor });
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
