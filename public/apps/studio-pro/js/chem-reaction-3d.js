// Chemical Reaction Visualizer 3D
window.ChemReaction3D = (() => {
  'use strict';

  const molecules = {
    water: { name: 'H₂O — Water', atoms: [{ el: 'O', r: 8, col: '#ef4444', pos: [0, 0, 0] }, { el: 'H', r: 5, col: '#60a5fa', pos: [-10, -8, 0] }, { el: 'H', r: 5, col: '#60a5fa', pos: [10, -8, 0] }], bonds: [[0, 1], [0, 2]] },
    co2: { name: 'CO₂ — Carbon Dioxide', atoms: [{ el: 'C', r: 7, col: '#94a3b8', pos: [0, 0, 0] }, { el: 'O', r: 8, col: '#ef4444', pos: [-18, 0, 0] }, { el: 'O', r: 8, col: '#ef4444', pos: [18, 0, 0] }], bonds: [[0, 1], [0, 2]] },
    nacl: { name: 'NaCl — Table Salt', atoms: [{ el: 'Na', r: 9, col: '#c084fc', pos: [-12, 0, 0] }, { el: 'Cl', r: 10, col: '#84cc16', pos: [12, 0, 0] }], bonds: [[0, 1]] },
    nh3: { name: 'NH₃ — Ammonia', atoms: [{ el: 'N', r: 8, col: '#38bdf8', pos: [0, 8, 0] }, { el: 'H', r: 5, col: '#60a5fa', pos: [-10, -4, 0] }, { el: 'H', r: 5, col: '#60a5fa', pos: [10, -4, 0] }, { el: 'H', r: 5, col: '#60a5fa', pos: [0, -4, 10] }], bonds: [[0, 1], [0, 2], [0, 3]] },
    o2: { name: 'O₂ — Oxygen', atoms: [{ el: 'O', r: 8, col: '#ef4444', pos: [-10, 0, 0] }, { el: 'O', r: 8, col: '#ef4444', pos: [10, 0, 0] }], bonds: [[0, 1]] },
    methane: { name: 'CH₄ — Methane', atoms: [{ el: 'C', r: 7, col: '#94a3b8', pos: [0, 0, 0] }, { el: 'H', r: 5, col: '#60a5fa', pos: [12, 12, 12] }, { el: 'H', r: 5, col: '#60a5fa', pos: [-12, -12, 12] }, { el: 'H', r: 5, col: '#60a5fa', pos: [-12, 12, -12] }, { el: 'H', r: 5, col: '#60a5fa', pos: [12, -12, -12] }], bonds: [[0, 1], [0, 2], [0, 3], [0, 4]] }
  };

  function init(container, btn) {
    const panel = document.createElement('div');
    panel.id = 'chemreaction-panel';
    panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;overflow-y:auto;padding:14px;font-family:Inter,sans-serif;flex-direction:column;border-radius:8px;';

    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#10b981,#059669);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">⚗️</div>
        <div><div style="font-size:13px;font-weight:700;color:#f1f5f9;">Chemical Lab 3D</div><div style="font-size:10px;color:#64748b;">Molecule & Reaction Visualizer</div></div>
      </div>
      <div style="margin-top:8px;">
        <label style="font-size:10px;color:#94a3b8;">Molecule / Compound</label>
        <select id="cr-mol" style="width:100%;padding:6px;background:#1e293b;border:1px solid #334155;border-radius:4px;color:#f1f5f9;font-size:11px;margin-top:4px;">
          <option value="water">💧 H₂O — Water</option>
          <option value="co2">🌫️ CO₂ — Carbon Dioxide</option>
          <option value="nacl">🧂 NaCl — Table Salt</option>
          <option value="nh3">💨 NH₃ — Ammonia</option>
          <option value="o2">🫁 O₂ — Oxygen</option>
          <option value="methane">🔥 CH₄ — Methane</option>
        </select>
      </div>
      <div style="margin-top:10px;">
        <label style="font-size:10px;color:#94a3b8;">Display Style</label>
        <select id="cr-style" style="width:100%;padding:6px;background:#1e293b;border:1px solid #334155;border-radius:4px;color:#f1f5f9;font-size:11px;margin-top:4px;">
          <option value="ballstick">Ball & Stick</option>
          <option value="spacefill">Space-Fill</option>
          <option value="wireframe">Wireframe</option>
        </select>
      </div>
      <div style="display:flex;gap:15px;margin-top:12px;">
        <label style="font-size:10px;display:flex;align-items:center;gap:4px;color:#cbd5e1;cursor:pointer;"><input type="checkbox" id="cr-glow" checked style="accent-color:#10b981;"> Atom Glow Effect</label>
        <label style="font-size:10px;display:flex;align-items:center;gap:4px;color:#cbd5e1;cursor:pointer;"><input type="checkbox" id="cr-anim" checked style="accent-color:#10b981;"> Vibrate Animation</label>
      </div>
      <button id="cr-add" style="width:100%;margin-top:10px;padding:9px;background:linear-gradient(135deg,#10b981,#059669);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(16,185,129,0.5);">${window.currentLang === 'fr' ? '⚗️ AJOUTER À LA SCÈNE' : '⚗️ ADD TO SCENE'}</button>
      <button id="cr-gen" style="width:100%;margin-top:6px;padding:7px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:8px;color:#34d399;font-size:11px;font-weight:600;cursor:pointer;">${window.currentLang === 'fr' ? '📄 Générer HTML' : '📄 Generate HTML'}</button>
    `;
    container.appendChild(panel);

    document.getElementById('cr-add').addEventListener('click', () => {
      const mol = document.getElementById('cr-mol').value;
      const style = document.getElementById('cr-style').value;
      const glow = document.getElementById('cr-glow').checked;
      const anim = document.getElementById('cr-anim').checked;
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('chem-reaction', { mol, style, glow, anim });
        panel.style.display = 'none';
      }
    });

    document.getElementById('cr-gen').addEventListener('click', () => {
      const mol = document.getElementById('cr-mol').value;
      const style = document.getElementById('cr-style').value;
      const glow = document.getElementById('cr-glow').checked;
      const anim = document.getElementById('cr-anim').checked;
      const html = makeHTML(mol, style, glow, anim);
      const ed = document.getElementById('code-editor');
      if (ed) { if (window.pushUndo) window.pushUndo(); ed.value = html; ed.dispatchEvent(new Event('input', { bubbles: true })); }
      if (window.toast) window.toast('⚗️ Molecule generated!');
    });

    if (btn) btn.addEventListener('click', () => {
      const vis = panel.style.display === 'flex';
      document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display = 'none');
      panel.style.display = vis ? 'none' : 'flex';
    });
  }

  function makeHTML(mol, dispStyle, glow, anim) {
    const molData = molecules[mol] || molecules.water;
    const atomsJson = JSON.stringify(molData.atoms);
    const bondsJson = JSON.stringify(molData.bonds);
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${molData.name} - 3D</title>
<style>*{margin:0;padding:0;}body{background:#030e18;overflow:hidden;font-family:sans-serif;}#lbl{position:fixed;top:12px;left:50%;transform:translateX(-50%);background:rgba(15,23,42,0.9);color:#34d399;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:700;border:1px solid rgba(52,211,153,0.3);}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/controls/OrbitControls.js"><\/script>
</head><body><div id="lbl">${molData.name}</div><script>(function(){
const scene=new THREE.Scene();scene.background=new THREE.Color(0x030e18);
const camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,0.1,500);camera.position.set(0,0,80);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(innerWidth,innerHeight);document.body.appendChild(renderer.domElement);
const controls=new THREE.OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.autoRotate=true;
scene.add(new THREE.AmbientLight(0xffffff,0.4));const dl=new THREE.DirectionalLight(0xffffff,0.8);dl.position.set(50,100,50);scene.add(dl);
const atoms=${atomsJson};const bonds=${bondsJson};
const molGroup=new THREE.Group();scene.add(molGroup);
const meshes=atoms.map(a=>{
  const r='${dispStyle}'==='spacefill'?a.r*1.4:a.r;
  const mat=new THREE.MeshStandardMaterial({color:a.col,roughness:0.2,metalness:0.1,wireframe:'${dispStyle}'==='wireframe'});
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,32,32),mat);
  mesh.position.set(...a.pos);molGroup.add(mesh);
  ${glow ? `const pl=new THREE.PointLight(a.col,0.5,30);pl.position.set(...a.pos);molGroup.add(pl);` : ''}
  return mesh;
});
if('${dispStyle}'==='ballstick'||'${dispStyle}'==='wireframe'){
  bonds.forEach(([i,j])=>{
    const a=new THREE.Vector3(...atoms[i].pos),b=new THREE.Vector3(...atoms[j].pos);
    const dir=b.clone().sub(a);const len=dir.length();
    const stick=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,len,8),new THREE.MeshStandardMaterial({color:0x888888,roughness:0.3}));
    stick.position.copy(a.clone().add(b).multiplyScalar(0.5));
    stick.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());
    molGroup.add(stick);
  });
}
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
let t=0;function anim(){requestAnimationFrame(anim);t+=0.01;controls.update();
${anim ? `meshes.forEach((m,i)=>{m.position.x=atoms[i].pos[0]+Math.sin(t*3+i)*0.5;m.position.y=atoms[i].pos[1]+Math.cos(t*2+i)*0.5;});` : ''}
renderer.render(scene,camera);}anim();
}());<\/script></body></html>`;
  }

  return { init };
})();
