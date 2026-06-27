// 3D Keyframe Animator
window.KeyframeAnimator3D = (() => {
  'use strict';

  let keyframes = [];

  function makeHTML(kf) {
    const kfJSON = JSON.stringify(kf);
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>3D Keyframe Animation</title>
<style>*{margin:0;padding:0;}body{background:#050815;overflow:hidden;}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script></head><body>
<script>(function(){
var kf=${kfJSON};
var s=new THREE.Scene();s.background=new THREE.Color(0x050815);
var c=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,0.1,1000);
var r=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
r.setSize(innerWidth,innerHeight);document.body.appendChild(r.domElement);

var box=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),new THREE.MeshStandardMaterial({color:0x6366f1}));
s.add(box);s.add(new THREE.AmbientLight(0xffffff,0.5));
var l=new THREE.PointLight(0xffffff,1);l.position.set(10,10,10);s.add(l);

var currentKf=0, t=0;
function anim(){
  requestAnimationFrame(anim);
  if(kf.length>1){
    t+=0.01; if(t>=1){t=0;currentKf=(currentKf+1)%kf.length;}
    var nextKf=(currentKf+1)%kf.length;
    var k1=kf[currentKf], k2=kf[nextKf];
    box.position.lerpVectors(new THREE.Vector3(k1.x,k1.y,k1.z),new THREE.Vector3(k2.x,k2.y,k2.z),t);
    box.rotation.set(
      k1.rx+(k2.rx-k1.rx)*t,
      k1.ry+(k2.ry-k1.ry)*t,
      k1.rz+(k2.rz-k1.rz)*t
    );
  }
  r.render(s,c);
}
c.position.z=15;
anim();
window.addEventListener('resize',()=>{c.aspect=innerWidth/innerHeight;c.updateProjectionMatrix();r.setSize(innerWidth,innerHeight);});
}());<\/script></body></html>`;
  }

  function init(container, btn) {
    const panel = document.createElement('div');
    panel.id = 'ka3d-panel';
    panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:14px;font-family:Inter,sans-serif;flex-direction:column;border-radius:8px;';
    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#ec4899,#8b5cf6);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">🎬</div>
        <div><div style="font-size:13px;font-weight:700;color:#f1f5f9;">3D Keyframe Animator</div><div style="font-size:10px;color:#64748b;">Save positions and export animation</div></div>
      </div>
      <div id="ka3d-list" style="flex:1;overflow-y:auto;background:rgba(0,0,0,0.2);border-radius:6px;padding:8px;margin-bottom:10px;border:1px solid #333;">
        <div style="color:#64748b;font-size:10px;text-align:center;">No keyframes added</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:10px;">
        <button id="ka3d-add-kf" style="padding:7px;background:#334155;border:none;border-radius:6px;color:#fff;font-size:11px;cursor:pointer;">➕ Add Keyframe</button>
        <button id="ka3d-clear" style="padding:7px;background:#991b1b;border:none;border-radius:6px;color:#fff;font-size:11px;cursor:pointer;">🗑️ Clear</button>
      </div>
      <button id="ka3d-add-scene" style="width:100%;margin-bottom:6px;padding:9px;background:linear-gradient(135deg,#ec4899,#8b5cf6);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(236,72,153,0.4);">🎬 ADD TO SCENE</button>
      <button id="ka3d-gen" style="width:100%;padding:7px;background:rgba(236,72,153,0.1);border:1px solid rgba(236,72,153,0.3);border-radius:8px;color:#f472b6;font-size:11px;font-weight:600;cursor:pointer;">📄 Generate Standalone HTML</button>
    `;
    container.appendChild(panel);

    const updateList = () => {
      const list = document.getElementById('ka3d-list');
      if (keyframes.length === 0) { list.innerHTML = '<div style="color:#64748b;font-size:10px;text-align:center;">No keyframes added</div>'; return; }
      list.innerHTML = keyframes.map((k, i) => `
        <div style="font-size:10px;color:#f1f5f9;background:#1e293b;padding:4px 8px;border-radius:4px;margin-bottom:4px;display:flex;justify-content:space-between;">
          <span>KF ${i+1}: (${Math.round(k.x)}, ${Math.round(k.y)}, ${Math.round(k.z)})</span>
          <span style="color:#64748b">Rot: ${k.ry.toFixed(1)}</span>
        </div>
      `).join('');
    };

    document.getElementById('ka3d-add-kf').addEventListener('click', () => {
      keyframes.push({ x: (Math.random()-0.5)*100, y: (Math.random()-0.5)*100, z: (Math.random()-0.5)*100, rx: 0, ry: Math.random()*Math.PI*2, rz: 0 });
      updateList();
    });

    document.getElementById('ka3d-clear').addEventListener('click', () => { keyframes = []; updateList(); });

    document.getElementById('ka3d-add-scene').addEventListener('click', () => {
      if (keyframes.length < 2) { if(window.toast) window.toast('⚠️ Add at least 2 keyframes'); return; }
      if(window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('keyframe-anim', { keyframes: [...keyframes] });
        panel.style.display = 'none';
      }
    });

    document.getElementById('ka3d-gen').addEventListener('click', () => {
      if (keyframes.length < 2) { if(window.toast) window.toast('⚠️ Add at least 2 keyframes'); return; }
      const html = makeHTML(keyframes);
      const ed = document.getElementById('code-editor');
      if (ed) { ed.value = html; ed.dispatchEvent(new Event('input', {bubbles:true})); }
      if (window.toast) window.toast('🎬 Animation generated!');
    });

    if (btn) btn.addEventListener('click', () => {
      const vis = panel.style.display === 'flex';
      document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display = 'none');
      panel.style.display = vis ? 'none' : 'flex';
    });
  }
  return { init };
})();
