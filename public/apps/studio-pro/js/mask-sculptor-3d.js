// Mask / Sculpture Generator
window.MaskSculptor3D = (() => {
  'use strict';

  function init(container, btn) {
    const panel = document.createElement('div');
    panel.id = 'masksculptor-panel';
    panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;overflow-y:auto;padding:14px;font-family:Inter,sans-serif;flex-direction:column;border-radius:8px;';

    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#a855f7,#7c3aed);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">🎭</div>
        <div><div style="font-size:13px;font-weight:700;color:#f1f5f9;">Mask & Sculpture Generator</div><div style="font-size:10px;color:#64748b;">Artistic Face & Tribal Art</div></div>
      </div>
      <div style="margin-top:8px;">
        <label style="font-size:10px;color:#94a3b8;">Mask Style</label>
        <select id="ms-style" style="width:100%;padding:6px;background:#1e293b;border:1px solid #334155;border-radius:4px;color:#f1f5f9;font-size:11px;margin-top:4px;">
          <option value="tribal">🌍 African Tribal</option>
          <option value="oni">👹 Japanese Oni</option>
          <option value="greek">🎭 Greek Theatre</option>
          <option value="cubist">🟦 Cubist Portrait</option>
          <option value="venetian">🎪 Venetian Carnival</option>
        </select>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <div style="flex:1;"><label style="font-size:10px;color:#94a3b8;">Primary Color</label><input type="color" id="ms-col1" value="#8b4513" style="width:100%;height:28px;border:none;cursor:pointer;background:none;margin-top:4px;"></div>
        <div style="flex:1;"><label style="font-size:10px;color:#94a3b8;">Accent Color</label><input type="color" id="ms-col2" value="#ffd700" style="width:100%;height:28px;border:none;cursor:pointer;background:none;margin-top:4px;"></div>
      </div>
      <div style="display:flex;gap:15px;margin-top:12px;">
        <label style="font-size:10px;display:flex;align-items:center;gap:4px;color:#cbd5e1;cursor:pointer;"><input type="checkbox" id="ms-glow" style="accent-color:#a855f7;"> Glowing Eyes</label>
        <label style="font-size:10px;display:flex;align-items:center;gap:4px;color:#cbd5e1;cursor:pointer;"><input type="checkbox" id="ms-wire" style="accent-color:#a855f7;"> Wireframe Overlay</label>
      </div>
      <button id="ms-add" style="width:100%;margin-top:10px;padding:9px;background:linear-gradient(135deg,#a855f7,#7c3aed);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(168,85,247,0.5);">${window.currentLang === 'fr' ? '🎭 AJOUTER À LA SCÈNE' : '🎭 ADD TO SCENE'}</button>
      <button id="ms-gen" style="width:100%;margin-top:6px;padding:7px;background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.3);border-radius:8px;color:#c084fc;font-size:11px;font-weight:600;cursor:pointer;">${window.currentLang === 'fr' ? '📄 Générer HTML' : '📄 Generate HTML'}</button>
    `;
    container.appendChild(panel);

    document.getElementById('ms-add').addEventListener('click', () => {
      const style = document.getElementById('ms-style').value;
      const col1 = document.getElementById('ms-col1').value;
      const col2 = document.getElementById('ms-col2').value;
      const glow = document.getElementById('ms-glow').checked;
      const wire = document.getElementById('ms-wire').checked;
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('mask-sculptor', { style, col1, col2, glow, wire });
        panel.style.display = 'none';
      }
    });

    document.getElementById('ms-gen').addEventListener('click', () => {
      const style = document.getElementById('ms-style').value;
      const col1 = document.getElementById('ms-col1').value;
      const col2 = document.getElementById('ms-col2').value;
      const glow = document.getElementById('ms-glow').checked;
      const wire = document.getElementById('ms-wire').checked;
      const html = makeHTML(style, col1, col2, glow, wire);
      const ed = document.getElementById('code-editor');
      if (ed) { if (window.pushUndo) window.pushUndo(); ed.value = html; ed.dispatchEvent(new Event('input', { bubbles: true })); }
      if (window.toast) window.toast('🎭 Mask generated!');
    });

    if (btn) btn.addEventListener('click', () => {
      const vis = panel.style.display === 'flex';
      document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display = 'none');
      panel.style.display = vis ? 'none' : 'flex';
    });
  }

  function makeHTML(style, col1, col2, glow, wire) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Mask Sculptor 3D</title>
<style>*{margin:0;padding:0;}body{background:#0a0a14;overflow:hidden;}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/controls/OrbitControls.js"><\/script>
</head><body><script>(function(){
const scene=new THREE.Scene();scene.background=new THREE.Color(0x0a0a14);
const camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,0.1,1000);camera.position.set(0,0,150);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(innerWidth,innerHeight);document.body.appendChild(renderer.domElement);
const controls=new THREE.OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.autoRotate=true;
scene.add(new THREE.AmbientLight(0xffffff,0.4));const dl=new THREE.DirectionalLight(0xffffff,0.8);dl.position.set(50,100,100);scene.add(dl);
const m1=new THREE.MeshStandardMaterial({color:'${col1}',roughness:0.6,metalness:0.3});
const m2=new THREE.MeshStandardMaterial({color:'${col2}',roughness:0.2,metalness:0.7});
const mask=new THREE.Group();scene.add(mask);
// Face base
const faceGeo=new THREE.SphereGeometry(30,32,32);faceGeo.scale(1,1.3,0.7);
mask.add(new THREE.Mesh(faceGeo,m1));
${wire ? `mask.add(new THREE.Mesh(faceGeo,new THREE.MeshBasicMaterial({color:'${col2}',wireframe:true,transparent:true,opacity:0.2})));` : ''}
// Eyes
const eyePos='${style}'==='oni'?[-12,5,-10]:[12,5,-10];
[-12,12].forEach(x=>{
  const eye=new THREE.Mesh(new THREE.SphereGeometry(5,16,16),${glow}?new THREE.MeshBasicMaterial({color:'${col2}'}):m2);
  eye.position.set(x,5,22);eye.scale.z=0.4;mask.add(eye);
  if(${glow}){const pl=new THREE.PointLight('${col2}',0.8,30);pl.position.set(x,5,22);mask.add(pl);}
});
// Nose
const nose=new THREE.Mesh(new THREE.ConeGeometry(3,12,8),m1);nose.rotation.x=Math.PI/2;nose.position.set(0,-3,29);mask.add(nose);
// Mouth
const mouth=new THREE.Mesh(new THREE.TorusGeometry(8,2,8,20,Math.PI),'${style}'==='oni'?new THREE.MeshStandardMaterial({color:0xcc0000}):m2);
mouth.rotation.x=Math.PI/2;mouth.position.set(0,-16,26);mask.add(mouth);
// Style-specific decorations
if('${style}'==='tribal'){
  for(let i=0;i<8;i++){const bar=new THREE.Mesh(new THREE.BoxGeometry(2,20,1),m2);bar.position.set(-18+i*5,10,28);bar.rotation.z=Math.sin(i)*0.3;mask.add(bar);}
}else if('${style}'==='venetian'){
  const feathers=[[30,20],[45,10],[-30,20],[-45,10]];
  feathers.forEach(([x,y])=>{const f=new THREE.Mesh(new THREE.EllipseCurve?new THREE.PlaneGeometry(5,20):new THREE.ConeGeometry(4,20,6),m2);f.position.set(x,y,15);f.rotation.z=(x>0?1:-1)*0.4;mask.add(f);});
}
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
function anim(){requestAnimationFrame(anim);controls.update();renderer.render(scene,camera);}anim();
}());<\/script></body></html>`;
  }

  return { init };
})();
