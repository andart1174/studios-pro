// Webcam → 3D Avatar (Point Cloud / Mesh)
window.WebcamAvatar3D = (() => {
  'use strict';

  function makeHTML(res, depth, colorMode, usePoints) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>3D Webcam Avatar</title>
<style>*{margin:0;padding:0;}body{background:#000;overflow:hidden;font-family:sans-serif;}
#ui{position:fixed;top:10px;left:10px;background:rgba(0,0,0,0.8);padding:10px;border-radius:8px;border:1px solid #333;color:#eee;z-index:9;}
video{display:none;}
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script></head><body>
<div id="ui">
  <div style="font-size:12px;font-weight:700;color:#00ff88;margin-bottom:5px;">👤 3D Webcam Avatar</div>
  <div style="font-size:10px;color:#999;">Interactive point cloud from your camera</div>
</div>
<video id="v" autoplay playsinline></video>
<script>(function(){
var res=${res}, depth=${depth};
var s=new THREE.Scene();
var c=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,0.1,2000);
c.position.set(0,0,res*1.2);
var r=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
r.setSize(innerWidth,innerHeight);document.body.appendChild(r.domElement);
var video=document.getElementById('v');
var canvas=document.createElement('canvas');canvas.width=res;canvas.height=res;
var ctx=canvas.getContext('2d');
var points, geometry, material;

navigator.mediaDevices.getUserMedia({video:{width:res,height:res}}).then(stream=>{
  video.srcObject=stream;
  init();
});

function init(){
  geometry=new THREE.BufferGeometry();
  var pos=new Float32Array(res*res*3);
  var col=new Float32Array(res*res*3);
  for(let i=0;i<res*res;i++){
    pos[i*3]=(i%res)-res/2;
    pos[i*3+1]=-(Math.floor(i/res)-res/2);
    pos[i*3+2]=0;
  }
  geometry.setAttribute('position',new THREE.BufferAttribute(pos,3));
  geometry.setAttribute('color',new THREE.BufferAttribute(col,3));
  material=new THREE.PointsMaterial({size:0.5,vertexColors:true});
  points=new THREE.Points(geometry,material);
  s.add(points);
  animate();
}

function animate(){
  requestAnimationFrame(animate);
  if(video.readyState===video.HAVE_ENOUGH_DATA){
    ctx.drawImage(video,0,0,res,res);
    var img=ctx.getImageData(0,0,res,res).data;
    var pos=geometry.attributes.position.array;
    var col=geometry.attributes.color.array;
    for(let i=0;i<res*res;i++){
      var r=img[i*4], g=img[i*4+1], b=img[i*4+2];
      var br=(r+g+b)/3;
      pos[i*3+2]=br/255*depth;
      col[i*3]=r/255; col[i*3+1]=g/255; col[i*3+2]=b/255;
    }
    geometry.attributes.position.needsUpdate=true;
    geometry.attributes.color.needsUpdate=true;
  }
  points.rotation.y+=0.005;
  r.render(s,c);
}
window.addEventListener('resize',()=>{c.aspect=innerWidth/innerHeight;c.updateProjectionMatrix();r.setSize(innerWidth,innerHeight);});
}());<\/script></body></html>`;
  }

  function init(container, btn) {
    const panel = document.createElement('div');
    panel.id = 'wa3d-panel';
    panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:14px;font-family:Inter,sans-serif;flex-direction:column;border-radius:8px;';
    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#00ff88,#0088ff);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">👤</div>
        <div><div style="font-size:13px;font-weight:700;color:#f1f5f9;">Webcam → 3D Avatar</div><div style="font-size:10px;color:#64748b;">Real-time 3D point cloud from camera</div></div>
      </div>
      <label style="font-size:10px;color:#94a3b8;font-weight:600;">Resolution</label>
      <select id="wa3d-res" style="width:100%;padding:5px;background:#111827;border:1px solid #333;border-radius:6px;color:#fff;margin-top:4px;">
        <option value="64">64 x 64 (Fast)</option>
        <option value="128" selected>128 x 128 (Balanced)</option>
        <option value="256">256 x 256 (Detailed)</option>
      </select>
      <div style="margin-top:10px;"><label style="font-size:10px;color:#94a3b8;min-width:90px;">Depth Scale <b id="wa3d-dv">20</b></label><input type="range" id="wa3d-depth" min="5" max="100" value="20" style="width:100%;accent-color:#00ff88;"></div>
      <button id="wa3d-add" style="width:100%;margin-top:15px;padding:9px;background:linear-gradient(135deg,#00ff88,#0088ff);border:none;border-radius:8px;color:#000;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(0,255,136,0.3);">👤 ADD TO SCENE</button>
      <button id="wa3d-gen" style="width:100%;margin-top:6px;padding:7px;background:rgba(0,255,136,0.1);border:1px solid rgba(0,255,136,0.3);border-radius:8px;color:#00ff88;font-size:11px;font-weight:600;cursor:pointer;">📄 Generate Standalone HTML</button>
    `;
    container.appendChild(panel);

    document.getElementById('wa3d-depth').addEventListener('input', e => document.getElementById('wa3d-dv').textContent = e.target.value);
    
    document.getElementById('wa3d-add').addEventListener('click', () => {
      const res = +document.getElementById('wa3d-res').value;
      const depth = +document.getElementById('wa3d-depth').value;
      if(window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('webcam-avatar', { res, depth });
        panel.style.display = 'none';
      }
    });

    document.getElementById('wa3d-gen').addEventListener('click', () => {
      const res = +document.getElementById('wa3d-res').value;
      const depth = +document.getElementById('wa3d-depth').value;
      const html = makeHTML(res, depth, 'color', true);
      const ed = document.getElementById('code-editor');
      if (ed) { ed.value = html; ed.dispatchEvent(new Event('input', {bubbles:true})); }
      if (window.toast) window.toast('👤 3D Avatar generated!');
    });

    if (btn) btn.addEventListener('click', () => {
      const vis = panel.style.display === 'flex';
      document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display = 'none');
      panel.style.display = vis ? 'none' : 'flex';
    });
  }
  return { init };
})();
