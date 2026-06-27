// Human Anatomy Viewer 3D
window.Anatomy3D = (() => {
  'use strict';

  function init(container, btn) {
    const panel = document.createElement('div');
    panel.id = 'anatomy-panel';
    panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;overflow-y:auto;padding:14px;font-family:Inter,sans-serif;flex-direction:column;border-radius:8px;';

    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#ef4444,#dc2626);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">🦴</div>
        <div><div style="font-size:13px;font-weight:700;color:#f1f5f9;">Human Anatomy Viewer</div><div style="font-size:10px;color:#64748b;">3D Body System Explorer</div></div>
      </div>
      <div style="margin-top:8px;">
        <label style="font-size:10px;color:#94a3b8;">Body System</label>
        <select id="an-sys" style="width:100%;padding:6px;background:#1e293b;border:1px solid #334155;border-radius:4px;color:#f1f5f9;font-size:11px;margin-top:4px;">
          <option value="skeleton">🦴 Full Skeleton</option>
          <option value="muscle">💪 Muscular System</option>
          <option value="brain">🧠 Brain & Neural</option>
          <option value="heart">❤️ Cardiovascular</option>
          <option value="dna">🧬 DNA / Cell</option>
        </select>
      </div>
      <div style="margin-top:10px;">
        <label style="font-size:10px;color:#94a3b8;">View Mode</label>
        <select id="an-view" style="width:100%;padding:6px;background:#1e293b;border:1px solid #334155;border-radius:4px;color:#f1f5f9;font-size:11px;margin-top:4px;">
          <option value="solid">Solid</option>
          <option value="xray">X-Ray (Transparent)</option>
          <option value="wireframe">Wireframe</option>
        </select>
      </div>
      <div style="display:flex;gap:15px;margin-top:12px;">
        <label style="font-size:10px;display:flex;align-items:center;gap:4px;color:#cbd5e1;cursor:pointer;"><input type="checkbox" id="an-pulse" checked style="accent-color:#ef4444;"> Heartbeat Animation</label>
        <label style="font-size:10px;display:flex;align-items:center;gap:4px;color:#cbd5e1;cursor:pointer;"><input type="checkbox" id="an-glow" style="accent-color:#ef4444;"> Neon Glow</label>
      </div>
      <button id="an-add" style="width:100%;margin-top:10px;padding:9px;background:linear-gradient(135deg,#ef4444,#dc2626);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(239,68,68,0.5);">${window.currentLang === 'fr' ? '🦴 AJOUTER À LA SCÈNE' : '🦴 ADD TO SCENE'}</button>
      <button id="an-gen" style="width:100%;margin-top:6px;padding:7px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:8px;color:#fca5a5;font-size:11px;font-weight:600;cursor:pointer;">${window.currentLang === 'fr' ? '📄 Générer HTML' : '📄 Generate HTML'}</button>
    `;
    container.appendChild(panel);

    document.getElementById('an-add').addEventListener('click', () => {
      const sys = document.getElementById('an-sys').value;
      const view = document.getElementById('an-view').value;
      const pulse = document.getElementById('an-pulse').checked;
      const glow = document.getElementById('an-glow').checked;
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('anatomy-3d', { sys, view, pulse, glow });
        panel.style.display = 'none';
      }
    });

    document.getElementById('an-gen').addEventListener('click', () => {
      const sys = document.getElementById('an-sys').value;
      const view = document.getElementById('an-view').value;
      const pulse = document.getElementById('an-pulse').checked;
      const glow = document.getElementById('an-glow').checked;
      const html = makeHTML(sys, view, pulse, glow);
      const ed = document.getElementById('code-editor');
      if (ed) { if (window.pushUndo) window.pushUndo(); ed.value = html; ed.dispatchEvent(new Event('input', { bubbles: true })); }
      if (window.toast) window.toast('🦴 Anatomy generated!');
    });

    if (btn) btn.addEventListener('click', () => {
      const vis = panel.style.display === 'flex';
      document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display = 'none');
      panel.style.display = vis ? 'none' : 'flex';
    });
  }

  function makeHTML(sys, view, pulse, glow) {
    const sysColors = { skeleton: '0xe2e8f0', muscle: '0xdc2626', brain: '0xfbbf24', heart: '0xef4444', dna: '0x22d3ee' };
    const col = sysColors[sys] || '0xe2e8f0';
    const wire = view === 'wireframe';
    const trans = view === 'xray' ? 'transparent:true,opacity:0.4,' : '';
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Anatomy 3D - ${sys}</title>
<style>*{margin:0;padding:0;}body{background:#040a14;overflow:hidden;font-family:sans-serif;}#lbl{position:fixed;top:12px;left:50%;transform:translateX(-50%);background:rgba(15,23,42,0.9);color:#fca5a5;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;border:1px solid rgba(239,68,68,0.4);}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/controls/OrbitControls.js"><\/script>
</head><body><div id="lbl">🔬 ${sys.toUpperCase()} SYSTEM</div><script>(function(){
const scene=new THREE.Scene();scene.background=new THREE.Color(0x040a14);
const camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,0.1,500);camera.position.set(0,80,200);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(innerWidth,innerHeight);document.body.appendChild(renderer.domElement);
const controls=new THREE.OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.autoRotate=true;controls.autoRotateSpeed=0.5;
scene.add(new THREE.AmbientLight(0xffffff,0.3));const dl=new THREE.DirectionalLight(0xffffff,0.8);dl.position.set(50,100,50);scene.add(dl);
const mat=new THREE.MeshStandardMaterial({color:${col},roughness:0.4,metalness:0.1,${trans}wireframe:${wire}});
const body=new THREE.Group();scene.add(body);

// Skull / Head
body.add(Object.assign(new THREE.Mesh(new THREE.SphereGeometry(15,16,16),mat),{position:{x:0,y:105,z:0}}));
// Jaw
body.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(20,8,15),mat),{position:{x:0,y:88,z:2}}));
// Spine (vertebrae)
for(let i=0;i<12;i++){
  body.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(6,6,8),mat),{position:{x:0,y:80-i*7,z:-4}}));
}
// Ribcage
for(let i=0;i<7;i++){
  const y=65-i*6;const w=12+i*2,closed=i<5;
  body.add(Object.assign(new THREE.Mesh(new THREE.TorusGeometry(w,2,6,18,closed?Math.PI*1.8:Math.PI*1.4),mat.clone()),{position:{x:0,y,z:0},rotation:{x:Math.PI/2,y:0,z:0}}));
}
// Pelvis
body.add(Object.assign(new THREE.Mesh(new THREE.TorusGeometry(18,5,8,24,Math.PI),mat),{position:{x:0,y:10,z:0},rotation:{x:-Math.PI/6}}));
// Upper arms
[-20,20].forEach(x=>{
  body.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(3,3,28,8),mat),{position:{x:x*1.3,y:55,z:0}}));
  body.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(2.5,2.5,24,8),mat),{position:{x:x*1.6,y:30,z:0}}));
});
// Legs
[-10,10].forEach(x=>{
  body.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(5,4,40,8),mat),{position:{x,y:-15,z:0}}));
  body.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(4,3,35,8),mat),{position:{x,y:-52,z:0}}));
  body.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(10,5,18),mat),{position:{x,y:-73,z:5}}));
});
// Clavicles
[-1,1].forEach(s=>body.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(2,2,22,8),mat),{position:{x:s*11,y:72,z:0},rotation:{x:0,y:0,z:s*Math.PI/5}})));

${glow ? `const pl=new THREE.PointLight(${col},1.5,150);pl.position.set(0,40,20);body.add(pl);` : ''}

window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
let t=0;function anim(){requestAnimationFrame(anim);t+=0.02;controls.update();
${pulse && sys === 'heart' ? `const p=1+Math.sin(t*4)*0.05;body.scale.set(p,p,p);` : ''}
renderer.render(scene,camera);}anim();
}());<\/script></body></html>`;
  }

  return { init };
})();
