// Music Instrument Showcase
window.Instrument3D = (() => {
  'use strict';

  function init(container, btn) {
    const panel = document.createElement('div');
    panel.id = 'instrument-panel';
    panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;overflow-y:auto;padding:14px;font-family:Inter,sans-serif;flex-direction:column;border-radius:8px;';

    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#f59e0b,#b45309);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">🎸</div>
        <div><div style="font-size:13px;font-weight:700;color:#f1f5f9;">Music Instrument 3D</div><div style="font-size:10px;color:#64748b;">Instrument Showcase Generator</div></div>
      </div>
      <div style="margin-top:8px;">
        <label style="font-size:10px;color:#94a3b8;">Instrument</label>
        <select id="ins-type" style="width:100%;padding:6px;background:#1e293b;border:1px solid #334155;border-radius:4px;color:#f1f5f9;font-size:11px;margin-top:4px;">
          <option value="guitar">🎸 Electric Guitar</option>
          <option value="piano">🎹 Grand Piano</option>
          <option value="drums">🥁 Drum Kit</option>
          <option value="violin">🎻 Violin</option>
          <option value="trumpet">🎺 Trumpet</option>
        </select>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <div style="flex:1;"><label style="font-size:10px;color:#94a3b8;">Body Color</label><input type="color" id="ins-col" value="#8b1a1a" style="width:100%;height:28px;border:none;cursor:pointer;background:none;margin-top:4px;"></div>
      </div>
      <div style="margin-top:10px;">
        <label style="font-size:10px;color:#94a3b8;">Stage Environment</label>
        <select id="ins-stage" style="width:100%;padding:6px;background:#1e293b;border:1px solid #334155;border-radius:4px;color:#f1f5f9;font-size:11px;margin-top:4px;">
          <option value="dark">Dark Stage</option>
          <option value="concert">Concert Hall</option>
          <option value="studio">Recording Studio</option>
        </select>
      </div>
      <div style="display:flex;gap:15px;margin-top:12px;">
        <label style="font-size:10px;display:flex;align-items:center;gap:4px;color:#cbd5e1;cursor:pointer;"><input type="checkbox" id="ins-spot" checked style="accent-color:#f59e0b;"> Spotlight</label>
        <label style="font-size:10px;display:flex;align-items:center;gap:4px;color:#cbd5e1;cursor:pointer;"><input type="checkbox" id="ins-anim" checked style="accent-color:#f59e0b;"> Auto Rotate</label>
      </div>
      <button id="ins-add" style="width:100%;margin-top:10px;padding:9px;background:linear-gradient(135deg,#f59e0b,#b45309);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(245,158,11,0.5);">${window.currentLang === 'fr' ? '🎸 AJOUTER À LA SCÈNE' : '🎸 ADD TO SCENE'}</button>
      <button id="ins-gen" style="width:100%;margin-top:6px;padding:7px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:8px;color:#fbbf24;font-size:11px;font-weight:600;cursor:pointer;">${window.currentLang === 'fr' ? '📄 Générer HTML' : '📄 Generate HTML'}</button>
    `;
    container.appendChild(panel);

    document.getElementById('ins-add').addEventListener('click', () => {
      const type = document.getElementById('ins-type').value;
      const col = document.getElementById('ins-col').value;
      const stage = document.getElementById('ins-stage').value;
      const spot = document.getElementById('ins-spot').checked;
      const anim = document.getElementById('ins-anim').checked;
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('instrument-3d', { type, col, stage, spot, anim });
        panel.style.display = 'none';
      }
    });

    document.getElementById('ins-gen').addEventListener('click', () => {
      const type = document.getElementById('ins-type').value;
      const col = document.getElementById('ins-col').value;
      const stage = document.getElementById('ins-stage').value;
      const spot = document.getElementById('ins-spot').checked;
      const anim = document.getElementById('ins-anim').checked;
      const html = makeHTML(type, col, stage, spot, anim);
      const ed = document.getElementById('code-editor');
      if (ed) { if (window.pushUndo) window.pushUndo(); ed.value = html; ed.dispatchEvent(new Event('input', { bubbles: true })); }
      if (window.toast) window.toast('🎸 Instrument generated!');
    });

    if (btn) btn.addEventListener('click', () => {
      const vis = panel.style.display === 'flex';
      document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display = 'none');
      panel.style.display = vis ? 'none' : 'flex';
    });
  }

  function makeHTML(type, col, stage, spot, anim) {
    const bg = stage === 'concert' ? '0x1a1008' : stage === 'studio' ? '0x0a1020' : '0x000000';
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Instrument 3D</title>
<style>*{margin:0;padding:0;}body{background:#000;overflow:hidden;}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/controls/OrbitControls.js"><\/script>
</head><body><script>(function(){
const scene=new THREE.Scene();scene.background=new THREE.Color(${bg});scene.fog=new THREE.Fog(${bg},200,600);
const camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,0.1,1000);camera.position.set(0,60,180);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(innerWidth,innerHeight);document.body.appendChild(renderer.domElement);
const controls=new THREE.OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.autoRotate=${anim};controls.autoRotateSpeed=0.8;
scene.add(new THREE.AmbientLight(0xffffff,0.2));
${spot ? `const sl=new THREE.SpotLight(0xfff5cc,3,300,Math.PI/6,0.5);sl.position.set(0,200,0);sl.target.position.set(0,0,0);scene.add(sl);scene.add(sl.target);` : 'scene.add(new THREE.DirectionalLight(0xffffff,0.8)).position.set(100,200,100);'}
const bMat=new THREE.MeshStandardMaterial({color:'${col}',roughness:0.3,metalness:0.2});
const sMat=new THREE.MeshStandardMaterial({color:0xaaaaaa,roughness:0.1,metalness:0.9});
const wMat=new THREE.MeshStandardMaterial({color:0x3d1c02,roughness:0.8});
const g=new THREE.Group();scene.add(g);

${type === 'guitar' ? `
// Guitar body
const bodyGeo=new THREE.CylinderGeometry(22,22,8,32);g.add(Object.assign(new THREE.Mesh(bodyGeo,bMat),{position:{x:0,y:0,z:0}}));
const waistGeo=new THREE.CylinderGeometry(14,14,8,32);g.add(Object.assign(new THREE.Mesh(waistGeo,bMat),{position:{x:0,y:0,z:0}}));
// Neck
g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(6,70,5),wMat),{position:{x:0,y:55,z:0}}));
// Headstock
g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(10,15,4),wMat),{position:{x:0,y:94,z:0}}));
// Strings
for(let i=-2;i<=2;i++){const s=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,75,4),sMat);s.position.set(i*1.5,55,3.5);g.add(s);}
// Pickups
[-5,5].forEach(y=>g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(15,4,2),new THREE.MeshStandardMaterial({color:0x111111})),{position:{x:0,y,z:4.5}})));` : ''}

${type === 'piano' ? `
// Grand piano body (simplified)
g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(100,20,60),bMat),{position:{x:0,y:0,z:0}}));
g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(100,3,60),new THREE.MeshStandardMaterial({color:0x111111})),{position:{x:0,y:11.5,z:0}}));
// Keys
for(let i=0;i<28;i++){const wk=new THREE.Mesh(new THREE.BoxGeometry(3,2,18),new THREE.MeshStandardMaterial({color:i%7===2||i%7===5?0x111111:0xf5f5f5}));wk.position.set(-42+i*3.1,12,-5);g.add(wk);}
// Legs
[[-40,-30,-20],[40,-30,-20],[-40,-30,20],[40,-30,20]].forEach(([x,y,z])=>g.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(2,2,30,8),wMat),{position:{x,y,z}})));` : ''}

${type === 'drums' ? `
// Kick drum
g.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(25,25,18,32),new THREE.MeshStandardMaterial({color:'${col}',roughness:0.4})),{position:{x:0,y:-15,z:0},rotation:{x:Math.PI/2}}));
// Snare
g.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(13,13,8,32),bMat),{position:{x:-30,y:0,z:0}}));
// Hi-hat
g.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(12,12,1,32),sMat),{position:{x:-45,y:20,z:0}}));
// Toms
[[-15,30,10],[15,30,10]].forEach(([x,y,z])=>g.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(10,10,8,32),bMat),{position:{x,y,z}})));
// Cymbals
[[30,25,-10],[30,25,10]].forEach(([x,y,z])=>g.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(16,16,1,32),sMat),{position:{x,y,z}})));` : ''}

${type === 'violin' ? `
// Violin body
g.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(12,12,5,32),bMat),{position:{x:0,y:0,z:0}}));
// Neck
g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(3,45,3),wMat),{position:{x:0,y:30,z:0}}));
// Scroll
g.add(Object.assign(new THREE.Mesh(new THREE.TorusGeometry(4,1.5,8,12,Math.PI),wMat),{position:{x:0,y:55,z:0}}));
// Strings
for(let i=-1.5;i<=1.5;i+=1){const s=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,50,4),sMat);s.position.set(i,27,2);g.add(s);}` : ''}

${type === 'trumpet' ? `
// Bell
const bell=new THREE.Mesh(new THREE.CylinderGeometry(15,5,30,32,1,true),bMat);bell.position.set(30,0,0);bell.rotation.z=Math.PI/2;g.add(bell);
// Tubes
const tube1=new THREE.Mesh(new THREE.CylinderGeometry(2,2,60,12),bMat);tube1.rotation.z=Math.PI/2;tube1.position.set(0,10,0);g.add(tube1);
// Valves
[-10,0,10].forEach(x=>g.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(3,3,12,12),sMat),{position:{x,y:10,z:0}})));
// Mouthpiece
g.add(Object.assign(new THREE.Mesh(new THREE.ConeGeometry(3,8,12),sMat),{position:{x:-35,y:0,z:0},rotation:{x:0,y:0,z:Math.PI/2}}));` : ''}

// Stage floor
scene.add(Object.assign(new THREE.Mesh(new THREE.PlaneGeometry(400,400),new THREE.MeshStandardMaterial({color:0x1a1a1a,roughness:0.9})),{rotation:{x:-Math.PI/2}})).position.y=-50;

window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
function anim(){requestAnimationFrame(anim);controls.update();renderer.render(scene,camera);}anim();
}());<\/script></body></html>`;
  }

  return { init };
})();
