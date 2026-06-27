// Voice → 3D Sculpture Generator
window.VoiceSculpture3D = (() => {
  'use strict';
  let _container, _panel, _audioBlob = null, _micStream = null;
  const cfg = { complexity: 128, style: 'organic', color: '#ff4d4d' };

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'vs3d-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;border-radius:8px;';
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#ff4d4d,#f97316);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">🎙️</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'Voice to 3D Sculpture' : 'Voix en Sculpture 3D'}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'Freeze your voice into art' : 'Gelez votre voix en art'}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr;gap:10px;margin-bottom:15px;">
        <button id="vs3d-rec" style="padding:15px;background:#1e293b;border:2px solid #ff4d4d;border-radius:12px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:0.3s;">
          <span id="vs3d-rec-icon" style="width:12px;height:12px;background:#ff4d4d;border-radius:50%;"></span>
          <span id="vs3d-rec-text">${isEN ? 'Record Voice' : 'Enregistrer'}</span>
        </button>
        <div id="vs3d-status" style="font-size:10px;color:#94a3b8;text-align:center;">${isEN ? 'Press to start recording (3s)' : 'Appuyez pentru a înregistra'}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px;">
        <div class="vs3d-row"><span style="font-size:10px;color:#94a3b8;">${isEN ? 'Style' : 'Style'}</span><select id="vs3d-style" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;"><option value="organic">Organic</option><option value="spiky">Spiky</option><option value="vortex">Vortex</option></select></div>
        <div class="vs3d-row"><span style="font-size:10px;color:#94a3b8;">Color</span><input type="color" id="vs3d-color" value="#ff4d4d" style="width:100%;height:24px;border:none;background:none;cursor:pointer;"></div>
      </div>
      <button id="vs3d-add" style="width:100%;padding:12px;background:linear-gradient(135deg,#ff4d4d,#f97316);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(255,77,77,0.3);opacity:0.5;" disabled>${isEN ? '📐 ADD TO SCENE' : '📐 AJOUTER À LA SCÈNE'}</button>
    `;
    _container.appendChild(_panel);
    _bindUI();
  }

  function _bindUI() {
    const recBtn = _panel.querySelector('#vs3d-rec');
    const recText = _panel.querySelector('#vs3d-rec-text');
    const addBtn = _panel.querySelector('#vs3d-add');
    let mediaRecorder;

    recBtn.onclick = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        const chunks = [];
        mediaRecorder.ondataavailable = e => chunks.push(e.data);
        mediaRecorder.onstop = () => {
          _audioBlob = new Blob(chunks, { type: 'audio/wav' });
          addBtn.disabled = false;
          addBtn.style.opacity = '1';
          recText.textContent = window.currentLang==='fr'?'Prêt !':'Ready!';
        };
        mediaRecorder.start();
        recBtn.style.borderColor = '#10b981';
        recText.textContent = window.currentLang==='fr'?'Écoute...':'Listening...';
        setTimeout(() => mediaRecorder.stop(), 3000);
      } catch (e) { alert(e.message); }
    };

    addBtn.onclick = async () => {
      if(!_audioBlob) return;
      const style = _panel.querySelector('#vs3d-style').value;
      const color = _panel.querySelector('#vs3d-color').value;
      
      // Simulate frequency data from blob (or just random for mockup if needed)
      const buffer = await _audioBlob.arrayBuffer();
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await ctx.decodeAudioData(buffer);
      const data = audioBuffer.getChannelData(0);
      const samples = [];
      const step = Math.floor(data.length / 128);
      for(let i=0; i<128; i++) samples.push(Math.abs(data[i*step] || 0));

      if(window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('voice-sculpture', { samples, style, color });
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
