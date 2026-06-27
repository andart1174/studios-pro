// Mech Robot Builder
window.MechRobot3D = (() => {
  'use strict';

  function init(container, btn) {
    const panel = document.createElement('div');
    panel.id = 'mechrobot-panel';
    panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;overflow-y:auto;padding:14px;font-family:Inter,sans-serif;flex-direction:column;border-radius:8px;';

    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#64748b,#334155);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">🤖</div>
        <div><div style="font-size:13px;font-weight:700;color:#f1f5f9;">Mech Robot Builder</div><div style="font-size:10px;color:#64748b;">Modular Combat Unit</div></div>
      </div>

      <div style="margin-top:8px;">
        <label style="font-size:10px;color:#94a3b8;">Head Type</label>
        <select id="mr-head" style="width:100%;padding:6px;background:#1e293b;border:1px solid #334155;border-radius:4px;color:#f1f5f9;font-size:11px;margin-top:4px;">
          <option value="visor">Visor Helmet</option>
          <option value="cube">Block Head</option>
          <option value="sphere">Dome Head</option>
        </select>
      </div>
      <div style="margin-top:8px;">
        <label style="font-size:10px;color:#94a3b8;">Arm Style</label>
        <select id="mr-arm" style="width:100%;padding:6px;background:#1e293b;border:1px solid #334155;border-radius:4px;color:#f1f5f9;font-size:11px;margin-top:4px;">
          <option value="cannon">🔫 Cannon Arms</option>
          <option value="claw">🦀 Claw Arms</option>
          <option value="shield">🛡️ Shield Arms</option>
        </select>
      </div>
      <div style="margin-top:8px;">
        <label style="font-size:10px;color:#94a3b8;">Color Scheme</label>
        <select id="mr-color" style="width:100%;padding:6px;background:#1e293b;border:1px solid #334155;border-radius:4px;color:#f1f5f9;font-size:11px;margin-top:4px;">
          <option value="gunmetal">Gunmetal Grey</option>
          <option value="red">Combat Red</option>
          <option value="cyber">Cyber Blue</option>
          <option value="gold">Elite Gold</option>
        </select>
      </div>
      <div style="display:flex;gap:15px;margin-top:12px;">
        <label style="font-size:10px;display:flex;align-items:center;gap:4px;color:#cbd5e1;cursor:pointer;"><input type="checkbox" id="mr-glow" checked style="accent-color:#38bdf8;"> Glowing Eyes & Reactor</label>
      </div>

      <button id="mr-add" style="width:100%;margin-top:10px;padding:9px;background:linear-gradient(135deg,#64748b,#475569);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(100,116,139,0.5);">${window.currentLang === 'fr' ? '🤖 AJOUTER À LA SCÈNE' : '🤖 ADD TO SCENE'}</button>
      <button id="mr-gen" style="width:100%;margin-top:6px;padding:7px;background:rgba(100,116,139,0.1);border:1px solid rgba(100,116,139,0.3);border-radius:8px;color:#94a3b8;font-size:11px;font-weight:600;cursor:pointer;">${window.currentLang === 'fr' ? '📄 Générer HTML' : '📄 Generate HTML'}</button>
    `;
    container.appendChild(panel);

    document.getElementById('mr-add').addEventListener('click', () => {
      const head = document.getElementById('mr-head').value;
      const arm = document.getElementById('mr-arm').value;
      const color = document.getElementById('mr-color').value;
      const glow = document.getElementById('mr-glow').checked;
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('mech-robot', { head, arm, color, glow });
        panel.style.display = 'none';
      }
    });

    document.getElementById('mr-gen').addEventListener('click', () => {
      const head = document.getElementById('mr-head').value;
      const arm = document.getElementById('mr-arm').value;
      const color = document.getElementById('mr-color').value;
      const glow = document.getElementById('mr-glow').checked;
      const html = makeHTML(head, arm, color, glow);
      const ed = document.getElementById('code-editor');
      if (ed) { if (window.pushUndo) window.pushUndo(); ed.value = html; ed.dispatchEvent(new Event('input', { bubbles: true })); }
      if (window.toast) window.toast('🤖 Mech Robot generated!');
    });

    if (btn) btn.addEventListener('click', () => {
      const vis = panel.style.display === 'flex';
      document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display = 'none');
      panel.style.display = vis ? 'none' : 'flex';
    });
  }

  function makeHTML(head, arm, color, glow) {
    const cols = { gunmetal: '0x4a5568', red: '0xb91c1c', cyber: '0x1d4ed8', gold: '0xd97706' };
    const gc = cols[color] || '0x4a5568';
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Mech Robot 3D</title>
<style>*{margin:0;padding:0;}body{background:#0a0f1e;overflow:hidden;}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/controls/OrbitControls.js"><\/script>
</head><body><script>(function(){
const scene=new THREE.Scene();scene.background=new THREE.Color(0x0a0f1e);
const camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,0.1,1000);camera.position.set(0,80,200);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(innerWidth,innerHeight);document.body.appendChild(renderer.domElement);
const controls=new THREE.OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.autoRotate=true;
scene.add(new THREE.AmbientLight(0x223344,0.5));scene.add(new THREE.DirectionalLight(0xffffff,0.8)).position.set(100,200,100);
const mat=new THREE.MeshStandardMaterial({color:${gc},metalness:0.8,roughness:0.2});
const mech=new THREE.Group();scene.add(mech);
// Torso
mech.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(30,35,18),mat),{position:{x:0,y:25,z:0}}));
// Legs
[-12,12].forEach(x=>{
  const leg=new THREE.Group();leg.position.set(x,0,0);
  leg.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(10,30,12),mat),{position:{x:0,y:5,z:0}}));
  leg.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(12,6,18),mat),{position:{x:0,-13,3}}));
  mech.add(leg);
});
// Head
const headGeo='${head}'==='cube'?new THREE.BoxGeometry(20,18,16):'${head}'==='sphere'?new THREE.SphereGeometry(11,16,16):new THREE.BoxGeometry(22,16,16);
const headMesh=new THREE.Mesh(headGeo,mat);headMesh.position.set(0,55,0);mech.add(headMesh);
// Eyes
${glow ? `
const eyeMat=new THREE.MeshBasicMaterial({color:0x00ffff});
[-5,5].forEach(x=>{mech.add(Object.assign(new THREE.Mesh(new THREE.SphereGeometry(2,8,8),eyeMat),{position:{x,y:57,z:8}}));});
const pl=new THREE.PointLight(0x00ffff,1,60);pl.position.set(0,57,10);mech.add(pl);
// Chest reactor
const reactorMat=new THREE.MeshBasicMaterial({color:0x00ffff});
mech.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(4,4,3,16),reactorMat),{position:{x:0,y:28,z:10}}));` : ''}
// Arms
[-20,20].forEach((x,i)=>{
  const arm=new THREE.Group();arm.position.set(x,35,0);
  arm.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(8,25,8),mat),{position:{x:0,-12,0}}));
  if('${arm}'==='cannon'){arm.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(3,3,20,12),mat),{position:{x:0,-25,0}}));}
  else if('${arm}'==='claw'){[-3,3].forEach(cx=>{arm.add(Object.assign(new THREE.Mesh(new THREE.ConeGeometry(2,10,6),mat),{position:{x:cx,-30,0}}));});}
  else{arm.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(14,3,18),mat),{position:{x:0,-28,0}}));}
  mech.add(arm);
});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
function anim(){requestAnimationFrame(anim);controls.update();renderer.render(scene,camera);}anim();
}());<\/script></body></html>`;
  }

  return { init };
})();
