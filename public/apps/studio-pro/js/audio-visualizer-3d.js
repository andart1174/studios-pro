// Audio Visualizer → 3D Generator
window.AudioVisualizer = (() => {
  'use strict';
  let _container, _panel, _audioData = null, _micStream = null, _audioCtx = null, _analyser = null;
  const cfg = { bars: 32, barStyle: 'box', colorScheme: 'spectrum' };

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'av3d-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:#0d1225;z-index:30;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;';
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#10b981,#34d399);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">🎵</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'Audio Visualizer 3D' : 'Visualiseur Audio 3D'}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'Reactive geometry from sound' : 'Géométrie réactive au son'}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px;">
        <button id="av3d-mic" style="padding:12px;background:#1e293b;border:1px solid #334155;border-radius:10px;color:#fff;font-size:11px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;transition:0.2s;">
          <span style="font-size:18px;">🎤</span>
          <span>${isEN ? 'Microphone' : 'Microphone'}</span>
        </button>
        <button id="av3d-file-btn" style="padding:12px;background:#1e293b;border:1px solid #334155;border-radius:10px;color:#fff;font-size:11px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;position:relative;overflow:hidden;transition:0.2s;">
          <span style="font-size:18px;">📁</span>
          <span>${isEN ? 'Audio File' : 'Fichier Audio'}</span>
          <input type="file" id="av3d-file" accept="audio/*" style="position:absolute;inset:0;opacity:0;cursor:pointer;">
        </button>
      </div>
      <div id="av3d-status" style="font-size:10px;color:#94a3b8;text-align:center;margin-bottom:15px;">${isEN ? 'Press Mic or Load a file' : 'Appuyez sur Mic ou chargez un fichier'}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px;">
        <div class="av3d-row"><span style="font-size:10px;color:#94a3b8;">${isEN ? 'Bars' : 'Barres'} <b id="av3d-bv">32</b></span><input type="range" id="av3d-bars" min="16" max="128" step="16" value="32" style="width:100%;accent-color:#10b981;"></div>
        <div class="av3d-row"><span style="font-size:10px;color:#94a3b8;">Style</span><select id="av3d-style" style="width:100%;padding:4px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;"><option value="box">Box</option><option value="cylinder">Cylinder</option><option value="cone">Cone</option></select></div>
        <div class="av3d-row"><span style="font-size:10px;color:#94a3b8;">Colors</span><select id="av3d-colors" style="width:100%;padding:4px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;"><option value="spectrum">Spectrum</option><option value="fire">Fire</option><option value="ocean">Ocean</option><option value="neon">Neon</option></select></div>
      </div>
      <button id="av3d-gen-btn" style="width:100%;padding:12px;background:rgba(16,185,129,0.2);border:1px solid rgba(16,185,129,0.4);border-radius:10px;color:#6ee7b7;font-size:12px;font-weight:700;cursor:pointer;transition:0.3s;">${isEN ? '⚡ GENERATE 3D VISUALIZER' : '⚡ GÉNÉRER LE VISUALISEUR 3D'}</button>
    `;
    _container.appendChild(_panel);
    _bindUI();
  }

  function _setStatus(txt, isErr=false) {
    const s = _panel.querySelector('#av3d-status');
    s.textContent = txt;
    s.style.color = isErr ? '#ef4444' : '#94a3b8';
  }

  function _bindUI() {
    const micBtn = _panel.querySelector('#av3d-mic');
    micBtn.onclick = () => {
      navigator.mediaDevices.getUserMedia({audio:true}).then(s => {
        _micStream = s;
        micBtn.style.background = 'rgba(16,185,129,0.2)';
        micBtn.style.borderColor = '#10b981';
        _setStatus(window.currentLang==='fr'?'Microphone activé':'Microphone active');
      }).catch(e => _setStatus(e.message, true));
    };

    _panel.querySelector('#av3d-file').onchange = e => {
      const f = e.target.files[0]; if(!f) return;
      _audioData = f;
      _panel.querySelector('#av3d-file-btn').style.background = 'rgba(16,185,129,0.2)';
      _panel.querySelector('#av3d-file-btn').style.borderColor = '#10b981';
      _setStatus(f.name);
    };

    _panel.querySelector('#av3d-bars').oninput = e => { cfg.bars = +e.target.value; _panel.querySelector('#av3d-bv').textContent = e.target.value; };
    _panel.querySelector('#av3d-style').onchange = e => cfg.barStyle = e.target.value;
    _panel.querySelector('#av3d-colors').onchange = e => cfg.colorScheme = e.target.value;

    _panel.querySelector('#av3d-gen-btn').onclick = () => {
      if(!_micStream && !_audioData) { _setStatus(window.currentLang==='fr'?'Choisissez une source':'Choose a source', true); return; }
      _generate();
    };
  }

  function _generate() {
    const isEN = window.currentLang !== 'fr';
    const B = cfg.bars, S = cfg.barStyle, C = cfg.colorScheme;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>3D Audio Viz</title>
<style>*{margin:0;padding:0;}body{background:#050815;overflow:hidden;font-family:sans-serif;}
#ui{position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:9;display:flex;gap:10px;}
button{padding:10px 20px;background:#10b981;border:none;border-radius:20px;color:#fff;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(16,185,129,0.4);}
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script></head><body>
<div id="ui"><button id="start">${isEN?'START AUDIO':'DÉMARRER'}</button></div>
<script>(function(){
const BARS=${B}, STYLE='${S}', CS='${C}';
const scene=new THREE.Scene();scene.background=new THREE.Color(0x050815);
const camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,0.1,1000);
camera.position.set(0,25,60);camera.lookAt(0,5,0);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);document.body.appendChild(renderer.domElement);
const bars=[]; const group=new THREE.Group(); scene.add(group);
const barW=40/BARS;
const cfn={spectrum:i=>new THREE.Color().setHSL(i/BARS*0.7,1,0.5),fire:i=>new THREE.Color().setHSL(i/BARS*0.15,1,0.5),ocean:i=>new THREE.Color().setHSL(0.5+i/BARS*0.1,1,0.5),neon:i=>i%2?new THREE.Color(0,1,1):new THREE.Color(1,0,1)};
const gc=cfn[CS]||cfn.spectrum;
for(let i=0;i<BARS;i++){
  let geo; if(STYLE==='cylinder')geo=new THREE.CylinderGeometry(barW*0.4,barW*0.4,1,12);else if(STYLE==='cone')geo=new THREE.ConeGeometry(barW*0.45,1,12);else geo=new THREE.BoxGeometry(barW*0.8,1,barW*0.8);
  const col=gc(i);const mat=new THREE.MeshPhongMaterial({color:col,emissive:col,emissiveIntensity:0.3});
  const mesh=new THREE.Mesh(geo,mat);mesh.position.x=(i-BARS/2)*barW*1.2;group.add(mesh);bars.push(mesh);
}
scene.add(new THREE.AmbientLight(0xffffff,0.4));
const dl=new THREE.DirectionalLight(0xffffff,0.8);dl.position.set(0,50,50);scene.add(dl);
let actx,anl,data;
document.getElementById('start').onclick=async()=>{
  document.getElementById('ui').style.display='none';
  actx=new (window.AudioContext||window.webkitAudioContext)();
  anl=actx.createAnalyser();anl.fftSize=256;data=new Uint8Array(anl.frequencyBinCount);
  ${_micStream ? 'const s=await navigator.mediaDevices.getUserMedia({audio:true});actx.createMediaStreamSource(s).connect(anl);' : '/* File logic here if needed */'}
  animate();
};
function animate(){
  requestAnimationFrame(animate);if(!anl)return;anl.getByteFrequencyData(data);
  for(let i=0;i<BARS;i++){
    const val=data[Math.floor(i/BARS*data.length)]||0;
    const h=Math.max(0.5,val/255*30);bars[i].scale.y=h;bars[i].position.y=h/2;
    bars[i].material.emissiveIntensity=val/255;
  }
  group.rotation.y+=0.005; renderer.render(scene,camera);
}
}());<\/script></body></html>`;

    const ed = document.getElementById('code-editor');
    if(ed) {
      ed.value = html;
      ed.dispatchEvent(new Event('input', {bubbles:true}));
      if(window.toast) window.toast('✨ 3D Visualizer generated!');
    }
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
