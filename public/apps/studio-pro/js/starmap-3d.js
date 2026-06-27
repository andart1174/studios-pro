// Star Map 3D
window.Starmap3D = (() => {
  'use strict';

  function makeHTML(count, size, colorMode) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>3D Star Map</title>
<style>*{margin:0;padding:0;}body{background:#000;overflow:hidden;}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script></head><body>
<script>(function(){
var s=new THREE.Scene();
var c=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,0.1,2000);
c.position.z=1;
var r=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
r.setSize(innerWidth,innerHeight);document.body.appendChild(r.domElement);

var geo=new THREE.BufferGeometry();
var pos=new Float32Array(${count}*3);
var col=new Float32Array(${count}*3);
for(let i=0;i<${count};i++){
  var theta=Math.random()*Math.PI*2;
  var phi=Math.acos(Math.random()*2-1);
  var dist=500+Math.random()*500;
  pos[i*3]=dist*Math.sin(phi)*Math.cos(theta);
  pos[i*3+1]=dist*Math.sin(phi)*Math.sin(theta);
  pos[i*3+2]=dist*Math.cos(phi);
  col[i*3]=0.8+Math.random()*0.2;
  col[i*3+1]=0.8+Math.random()*0.2;
  col[i*3+2]=1.0;
}
geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
geo.setAttribute('color',new THREE.BufferAttribute(col,3));
var mat=new THREE.PointsMaterial({size:${size},vertexColors:true,transparent:true,opacity:0.8});
var points=new THREE.Points(geo,mat);
s.add(points);

function anim(){
  requestAnimationFrame(anim);
  points.rotation.y+=0.0005;
  points.rotation.z+=0.0002;
  r.render(s,c);
}
anim();
window.addEventListener('resize',()=>{c.aspect=innerWidth/innerHeight;c.updateProjectionMatrix();r.setSize(innerWidth,innerHeight);});
}());<\/script></body></html>`;
  }

  function init(container, btn) {
    const panel = document.createElement('div');
    panel.id = 'sm3d-panel';
    panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:14px;font-family:Inter,sans-serif;flex-direction:column;border-radius:8px;';
    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#1e3a8a,#3b82f6);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">🌌</div>
        <div><div style="font-size:13px;font-weight:700;color:#f1f5f9;">Star Map 3D</div><div style="font-size:10px;color:#64748b;">Procedural star field generator</div></div>
      </div>
      <label style="font-size:10px;color:#94a3b8;font-weight:600;">Star Count</label>
      <input type="range" id="sm3d-count" min="1000" max="20000" step="1000" value="5000" style="width:100%;accent-color:#3b82f6;">
      <div style="margin-top:10px;"><label style="font-size:10px;color:#94a3b8;">Star Size</label><input type="range" id="sm3d-size" min="0.1" max="5" step="0.1" value="1.5" style="width:100%;accent-color:#3b82f6;"></div>
      <button id="sm3d-add" style="width:100%;margin-top:15px;padding:9px;background:linear-gradient(135deg,#1e3a8a,#3b82f6);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(30,58,138,0.4);">🌌 ADD TO SCENE</button>
      <button id="sm3d-gen" style="width:100%;margin-top:6px;padding:7px;background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.3);border-radius:8px;color:#60a5fa;font-size:11px;font-weight:600;cursor:pointer;">📄 Generate Standalone HTML</button>
    `;
    container.appendChild(panel);

    document.getElementById('sm3d-add').addEventListener('click', () => {
      const count = +document.getElementById('sm3d-count').value;
      const size = +document.getElementById('sm3d-size').value;
      if(window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('starmap', { count, size });
        panel.style.display = 'none';
      }
    });

    document.getElementById('sm3d-gen').addEventListener('click', () => {
      const count = +document.getElementById('sm3d-count').value;
      const size = +document.getElementById('sm3d-size').value;
      const html = makeHTML(count, size, 'default');
      const ed = document.getElementById('code-editor');
      if (ed) { ed.value = html; ed.dispatchEvent(new Event('input', {bubbles:true})); }
      if (window.toast) window.toast('🌌 Star map generated!');
    });

    if (btn) btn.addEventListener('click', () => {
      const vis = panel.style.display === 'flex';
      document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display = 'none');
      panel.style.display = vis ? 'none' : 'flex';
    });
  }
  return { init };
})();
