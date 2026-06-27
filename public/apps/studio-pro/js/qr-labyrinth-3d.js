// QR → 3D Labyrinth Generator
window.QRLabyrinth3D = (() => {
  'use strict';
  let _container, _panel, _qrData = null;

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'qr3l-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;border-radius:8px;';
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#3b82f6,#2dd4bf);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">🧩</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'QR to 3D Labyrinth' : 'QR en Labyrinthe 3D'}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'Walk through your code' : 'Marchez dans votre code'}</div>
        </div>
      </div>
      <div id="qr3l-drop" style="flex:1;border:2px dashed rgba(59,130,246,0.3);border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;cursor:pointer;background:rgba(59,130,246,0.02);margin-bottom:15px;">
        <span style="font-size:24px;">🔗</span>
        <span style="font-size:11px;color:#94a3b8;">${isEN ? 'Drop QR Image or Click' : 'Déposez un code QR'}</span>
        <input type="file" id="qr3l-file" accept="image/*" style="display:none;">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px;">
        <div class="qr3l-row"><span style="font-size:10px;color:#94a3b8;">${isEN ? 'Wall Height' : 'Hauteur'}</span><input type="range" id="qr3l-h" min="5" max="50" value="20" style="width:100%;accent-color:#3b82f6;"></div>
        <div class="qr3l-row"><span style="font-size:10px;color:#94a3b8;">Wall Color</span><input type="color" id="qr3l-color" value="#3b82f6" style="width:100%;height:24px;border:none;background:none;cursor:pointer;"></div>
      </div>
      <button id="qr3l-add" style="width:100%;padding:12px;background:linear-gradient(135deg,#3b82f6,#2563eb);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;opacity:0.5;" disabled>${isEN ? '📐 ADD TO SCENE' : '📐 AJOUTER À LA SCÈNE'}</button>
    `;
    _container.appendChild(_panel);
    _bindUI();
  }

  function _bindUI() {
    const drop = _panel.querySelector('#qr3l-drop');
    const file = _panel.querySelector('#qr3l-file');
    const addBtn = _panel.querySelector('#qr3l-add');

    drop.onclick = () => file.click();
    file.onchange = e => e.target.files[0] && _loadImg(e.target.files[0]);

    async function _loadImg(f) {
      const reader = new FileReader();
      reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
          _qrData = img;
          addBtn.disabled = false;
          addBtn.style.opacity = '1';
          drop.style.borderColor = '#10b981';
          drop.querySelector('span:last-child').textContent = '✅ QR Loaded';
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(f);
    }

    addBtn.onclick = () => {
      if(!_qrData) return;
      const height = +document.getElementById('qr3l-h').value;
      const color = document.getElementById('qr3l-color').value;
      
      // Sample QR pixels
      const res = 40; // Standard QR grid approx
      const c = document.createElement('canvas'); c.width = res; c.height = res;
      const ctx = c.getContext('2d'); ctx.drawImage(_qrData, 0, 0, res, res);
      const px = ctx.getImageData(0,0,res,res).data;
      const grid = [];
      for(let i=0; i<res*res; i++) grid.push(px[i*4] < 128 ? 1 : 0); // Black = Wall

      if(window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('qr-labyrinth', { grid, res, height, color });
        _panel.style.display = 'none';
      }
    };
  }

  function init(container, btn) {
    _container = container;
    buildUI();
    if (btn) btn.addEventListener('click', () => {
      const visible = _panel.style.display === 'flex';
      document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display='none');
      _panel.style.display = visible ? 'none' : 'flex';
      _panel.style.flexDirection = 'column';
    });
  }

  return { init };
})();
