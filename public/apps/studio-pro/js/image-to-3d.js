// Image → 3D Heightmap Generator
window.ImageTo3D = (() => {
  'use strict';
  let _container, _panel, _imgData, _imgB64;
  const cfg = { resolution: 64, heightScale: 25, smoothing: 1, colorMode: 'gradient' };

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'i3d-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:#0d1225;z-index:30;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;';
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#6366f1,#818cf8);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">🖼️</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'Image to 3D Heightmap' : 'Image en Carte de Hauteur 3D'}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'Convert photos to landscape models' : 'Convertir des photos en modèles 3D'}</div>
        </div>
      </div>
      <div id="i3d-drop" style="flex:1;border:2px dashed rgba(99,102,241,0.4);border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;cursor:pointer;transition:0.2s;margin-bottom:15px;background:rgba(99,102,241,0.03);">
        <span style="font-size:24px;">📁</span>
        <span style="font-size:11px;color:#94a3b8;">${isEN ? 'Drop image or click to browse' : 'Déposez une image ou cliquez'}</span>
        <input type="file" id="i3d-file" accept="image/*" style="display:none;">
      </div>
      <canvas id="i3d-preview-canvas" style="display:none;width:100%;height:120px;object-fit:contain;border-radius:8px;background:#000;margin-bottom:15px;border:1px solid #1e293b;"></canvas>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px;">
        <div class="i3d-row"><span style="font-size:10px;color:#94a3b8;">${isEN ? 'Resolution' : 'Résolution'} <b id="i3d-rv">64</b></span><input type="range" id="i3d-res" min="32" max="256" step="1" value="64" style="width:100%;accent-color:#6366f1;"></div>
        <div class="i3d-row"><span style="font-size:10px;color:#94a3b8;">${isEN ? 'Height' : 'Hauteur'} <b id="i3d-hv">25</b></span><input type="range" id="i3d-hs" min="5" max="100" step="1" value="25" style="width:100%;accent-color:#6366f1;"></div>
        <div class="i3d-row"><span style="font-size:10px;color:#94a3b8;">Smoothing <b id="i3d-sv">1</b></span><input type="range" id="i3d-sm" min="1" max="5" step="1" value="1" style="width:100%;accent-color:#6366f1;"></div>
        <div class="i3d-row"><span style="font-size:10px;color:#94a3b8;">Color Mode</span><select id="i3d-cm" style="width:100%;padding:4px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;"><option value="gradient">Gradient</option><option value="neon">Neon</option><option value="thermal">Thermal</option><option value="mono">Mono</option><option value="texture">Texture</option></select></div>
      </div>
      <div style="display:flex;gap:15px;margin-bottom:15px;">
        <label style="font-size:10px;display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="i3d-wf" style="accent-color:#6366f1;"> Wireframe</label>
        <label style="font-size:10px;display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="i3d-inv"> ${isEN ? 'Invert' : 'Inverser'}</label>
        <label style="font-size:10px;display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="i3d-rot" checked> Auto Rotate</label>
      </div>
      <button id="i3d-gen-btn" style="width:100%;padding:12px;background:rgba(99,102,241,0.2);border:1px solid rgba(99,102,241,0.4);border-radius:10px;color:#a5b4fc;font-size:12px;font-weight:700;cursor:pointer;transition:0.3s;">${isEN ? '⚡ GENERATE 3D HEIGHTMAP' : '⚡ GÉNÉRER LA CARTE 3D'}</button>
    `;
    _container.appendChild(_panel);
    _bindUI();
  }

  function _bindUI() {
    _panel.querySelector('#i3d-drop').onclick = () => _panel.querySelector('#i3d-file').click();
    _panel.querySelector('#i3d-file').addEventListener('change', e => e.target.files[0] && _loadImg(e.target.files[0]));
    const drop = _panel.querySelector('#i3d-drop');
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.style.borderColor='rgba(99,102,241,0.9)'; });
    drop.addEventListener('dragleave', () => { drop.style.borderColor='rgba(99,102,241,0.4)'; });
    drop.addEventListener('drop', e => { e.preventDefault(); drop.style.borderColor='rgba(99,102,241,0.4)'; const f=e.dataTransfer.files[0]; if(f&&f.type.startsWith('image/'))_loadImg(f); });
    const bind = (id, key, valId) => _panel.querySelector(id).addEventListener('input', e => { cfg[key] = isNaN(+e.target.value) ? e.target.value : +e.target.value; if(valId) _panel.querySelector(valId).textContent = e.target.value; });
    bind('#i3d-res','resolution','#i3d-rv');
    bind('#i3d-hs','heightScale','#i3d-hv');
    bind('#i3d-sm','smoothing','#i3d-sv');
    bind('#i3d-cm','colorMode',null);
    _panel.querySelector('#i3d-gen-btn').addEventListener('click', () => {
      if(_imgData) _generate();
      else if(window.toast) window.toast('Please choose an image first');
    });
  }

  function _loadImg(file) {
    const reader = new FileReader();
    reader.onload = e => {
      _imgB64 = e.target.result;
      const img = new Image();
      img.onload = () => {
        _imgData = img;
        const pc = _panel.querySelector('#i3d-preview-canvas');
        pc.width = img.width; pc.height = img.height;
        pc.getContext('2d').drawImage(img, 0, 0);
        pc.style.display = 'block';
        const btn = _panel.querySelector('#i3d-gen-btn');
        btn.style.background = 'linear-gradient(135deg,#6366f1,#4f46e5)';
        btn.style.color = '#fff';
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function _sampleHeights() {
    const res = cfg.resolution;
    const c = document.createElement('canvas'); c.width = res; c.height = res;
    const ctx = c.getContext('2d'); ctx.drawImage(_imgData, 0, 0, res, res);
    const px = ctx.getImageData(0, 0, res, res).data;
    const h = new Float32Array(res * res);
    for (let i = 0; i < res * res; i++) h[i] = (0.299*px[i*4] + 0.587*px[i*4+1] + 0.114*px[i*4+2]) / 255;
    if (cfg.smoothing > 1) {
      const b = new Float32Array(res*res), sm = cfg.smoothing;
      for (let y=0;y<res;y++) for (let x=0;x<res;x++) { let s=0,n=0; for(let dy=-sm;dy<=sm;dy++) for(let dx=-sm;dx<=sm;dx++){const nx=x+dx,ny=y+dy;if(nx>=0&&nx<res&&ny>=0&&ny<res){s+=h[ny*res+nx];n++;}} b[y*res+x]=s/n; }
      return b;
    }
    return h;
  }

  const COLOR_FNS = {
    gradient: `function gc(h){if(h<0.25)return new THREE.Color().setHSL(0.67-h*0.67,1,0.45);if(h<0.5)return new THREE.Color().setHSL(0.33,1,0.38+h*0.2);if(h<0.75)return new THREE.Color().setHSL(0.12,1,0.45);return new THREE.Color().setHSL(0,1,0.5);}`,
    neon:     `function gc(h){if(h<0.33)return new THREE.Color(0,h*3,1);if(h<0.66)return new THREE.Color(0,1,1-(h-0.33)*3);return new THREE.Color((h-0.66)*3,1,0);}`,
    thermal:  `function gc(h){if(h<0.25)return new THREE.Color(0,0,h*4);if(h<0.5)return new THREE.Color(0,(h-0.25)*4,1);if(h<0.75)return new THREE.Color((h-0.5)*4,1,1-(h-0.5)*4);return new THREE.Color(1,1-(h-0.75)*4,0);}`,
    mono:     `function gc(h){return new THREE.Color(h,h,h);}`,
  };

  function _generate() {
    const heights = _sampleHeights();
    const res = cfg.resolution;
    const inv = _panel.querySelector('#i3d-inv').checked;
    const wf  = _panel.querySelector('#i3d-wf').checked;
    const rot = _panel.querySelector('#i3d-rot').checked;
    const cm  = _panel.querySelector('#i3d-cm').value;
    const hs  = cfg.heightScale;
    const arr = JSON.stringify(Array.from(heights).map(h => Math.round((inv?1-h:h)*1000)/1000));
    const useTex = cm === 'texture';

    const matBlock = useTex
      ? `const tx=new THREE.TextureLoader().load('${_imgB64}');const mat=new THREE.MeshPhongMaterial({map:tx,wireframe:${wf},shininess:40});`
      : `${COLOR_FNS[cm]||COLOR_FNS.gradient}
         const cols=[];for(let i=0;i<pos.count;i++){const c=gc(hd[i]);cols.push(c.r,c.g,c.b);}
         geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));
         const mat=new THREE.MeshPhongMaterial({vertexColors:true,wireframe:${wf},shininess:60});`;

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>3D Heightmap</title>
<style>*{margin:0;padding:0;}body{background:#050815;overflow:hidden;font-family:sans-serif;}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script></head><body>
<div id="info" style="position:fixed;top:10px;left:50%;transform:translateX(-50%);background:rgba(10,14,30,0.8);border:1px solid rgba(99,102,241,0.3);padding:6px 14px;border-radius:20px;font-size:11px;color:#94a3b8;z-index:9;">✨ Drag to rotate &nbsp;|&nbsp; Scroll to zoom</div>
<script>(function(){
const W=${res},H=${res},HS=${hs};
const hd=${arr};
const scene=new THREE.Scene();scene.background=new THREE.Color(0x050815);scene.fog=new THREE.FogExp2(0x050815,0.012);
const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,0.1,2000);
camera.position.set(0,HS*1.8,W*0.9);camera.lookAt(0,0,0);
const renderer=new THREE.WebGLRenderer({antialias:true, preserveDrawingBuffer:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));document.body.appendChild(renderer.domElement);
const geo=new THREE.PlaneGeometry(W,H,W-1,H-1);geo.rotateX(-Math.PI/2);
const pos=geo.attributes.position;for(let i=0;i<pos.count;i++)pos.setY(i,hd[i]*HS);pos.needsUpdate=true;geo.computeVertexNormals();
${matBlock}
const mesh=new THREE.Mesh(geo,mat);scene.add(mesh);
const grid=new THREE.GridHelper(W*1.6,24,0x1e2a45,0x0d1225);grid.position.y=-1;scene.add(grid);
scene.add(new THREE.AmbientLight(0x1a1a3e,1));
const dl=new THREE.DirectionalLight(0x6366f1,2);dl.position.set(W/2,HS*2,W/2);scene.add(dl);
const pl=new THREE.PointLight(0x10b981,3,W*2);scene.add(pl);
const pl2=new THREE.PointLight(0xf59e0b,2,W*2);pl2.position.set(W*0.4,HS,W*0.4);scene.add(pl2);
let drag=false,px=0,py=0,rotY=0,rotX=0.35,dist=camera.position.length();
const setCamera=()=>{camera.position.set(Math.sin(rotY)*Math.cos(rotX)*dist,Math.sin(rotX)*dist,Math.cos(rotY)*Math.cos(rotX)*dist);camera.lookAt(0,HS/2,0);};
setCamera();
document.addEventListener('mousedown',e=>{drag=true;px=e.clientX;py=e.clientY;});
document.addEventListener('mouseup',()=>drag=false);
document.addEventListener('mousemove',e=>{if(!drag)return;rotY+=(e.clientX-px)*0.005;rotX-=(e.clientY-py)*0.005;rotX=Math.max(-0.05,Math.min(1.4,rotX));px=e.clientX;py=e.clientY;setCamera();});
document.addEventListener('wheel',e=>{dist=Math.max(15,Math.min(300,dist+e.deltaY*0.08));setCamera();},{passive:true});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
let t=0;function animate(){requestAnimationFrame(animate);t+=0.01;${rot?'rotY+=0.003;setCamera();':''}pl.position.set(Math.sin(t)*W*0.4,HS*0.8,Math.cos(t)*W*0.4);renderer.render(scene,camera);}animate();
}());<\/script></body></html>`;

    const ed = document.getElementById('code-editor');
    if(ed) {
      ed.value = html;
      ed.dispatchEvent(new Event('input', {bubbles:true}));
      if (window.toast) window.toast('✨ 3D Heightmap generated!');
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
