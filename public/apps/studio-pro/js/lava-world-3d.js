// Volcano & Lava Landscape Generator
window.LavaWorld3D = (() => {
  'use strict';

  function init(container, btn) {
    const panel = document.createElement('div');
    panel.id = 'lavaworld-panel';
    panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;overflow-y:auto;padding:14px;font-family:Inter,sans-serif;flex-direction:column;border-radius:8px;';

    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#ef4444,#f97316);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">🌋</div>
        <div><div style="font-size:13px;font-weight:700;color:#f1f5f9;">Volcano & Lava World</div><div style="font-size:10px;color:#64748b;">Volcanic Landscape Generator</div></div>
      </div>

      <div style="display:flex;align-items:center;gap:6px;margin-top:10px;">
        <span style="font-size:10px;color:#94a3b8;min-width:80px;">Volcano Size <b id="lv-sv">80</b></span>
        <input type="range" id="lv-size" min="30" max="200" step="10" value="80" style="flex:1;accent-color:#ef4444;">
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-top:10px;">
        <span style="font-size:10px;color:#94a3b8;min-width:80px;">Lava Rivers <b id="lv-rv">6</b></span>
        <input type="range" id="lv-rivers" min="2" max="16" step="1" value="6" style="flex:1;accent-color:#f97316;">
      </div>
      <div style="margin-top:12px;">
        <label style="font-size:10px;color:#94a3b8;">Eruption Style</label>
        <select id="lv-style" style="width:100%;padding:6px;background:#1e293b;border:1px solid #334155;border-radius:4px;color:#f1f5f9;font-size:11px;margin-top:4px;">
          <option value="active">Active (Glowing Lava)</option>
          <option value="dormant">Dormant (Dark Rock)</option>
          <option value="supervolcano">Supervolcano (Massive)</option>
        </select>
      </div>
      <div style="display:flex;gap:15px;margin-top:12px;">
        <label style="font-size:10px;display:flex;align-items:center;gap:4px;color:#cbd5e1;cursor:pointer;"><input type="checkbox" id="lv-smoke" checked style="accent-color:#ef4444;"> Smoke Particles</label>
      </div>

      <button id="lv-add" style="width:100%;margin-top:10px;padding:9px;background:linear-gradient(135deg,#ef4444,#f97316);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(239,68,68,0.5);">${window.currentLang === 'fr' ? '🌋 AJOUTER À LA SCÈNE' : '🌋 ADD TO SCENE'}</button>
      <button id="lv-gen" style="width:100%;margin-top:6px;padding:7px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:8px;color:#fca5a5;font-size:11px;font-weight:600;cursor:pointer;">${window.currentLang === 'fr' ? '📄 Générer HTML' : '📄 Generate HTML'}</button>
    `;
    container.appendChild(panel);

    document.getElementById('lv-size').addEventListener('input', e => document.getElementById('lv-sv').textContent = e.target.value);
    document.getElementById('lv-rivers').addEventListener('input', e => document.getElementById('lv-rv').textContent = e.target.value);

    document.getElementById('lv-add').addEventListener('click', () => {
      const size = +document.getElementById('lv-size').value;
      const rivers = +document.getElementById('lv-rivers').value;
      const style = document.getElementById('lv-style').value;
      const smoke = document.getElementById('lv-smoke').checked;
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('lava-world', { size, rivers, style, smoke });
        panel.style.display = 'none';
      }
    });

    document.getElementById('lv-gen').addEventListener('click', () => {
      const size = +document.getElementById('lv-size').value;
      const rivers = +document.getElementById('lv-rivers').value;
      const style = document.getElementById('lv-style').value;
      const smoke = document.getElementById('lv-smoke').checked;
      const html = makeHTML(size, rivers, style, smoke);
      const ed = document.getElementById('code-editor');
      if (ed) { if (window.pushUndo) window.pushUndo(); ed.value = html; ed.dispatchEvent(new Event('input', { bubbles: true })); }
      if (window.toast) window.toast('🌋 Lava World generated!');
    });

    if (btn) btn.addEventListener('click', () => {
      const vis = panel.style.display === 'flex';
      document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display = 'none');
      panel.style.display = vis ? 'none' : 'flex';
    });
  }

  function makeHTML(size, rivers, style, smoke) {
    const lavaCol = style === 'dormant' ? '0x444444' : '0xff4400';
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Lava World 3D</title>
<style>*{margin:0;padding:0;}body{background:#1a0500;overflow:hidden;}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/controls/OrbitControls.js"><\/script>
</head><body><script>(function(){
const scene=new THREE.Scene();scene.background=new THREE.Color(0x1a0500);scene.fog=new THREE.FogExp2(0x330800,0.003);
const camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,0.1,2000);camera.position.set(0,${size*1.5},${size*2});
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(innerWidth,innerHeight);document.body.appendChild(renderer.domElement);
const controls=new THREE.OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.autoRotate=true;
scene.add(new THREE.AmbientLight(0xff4400,0.4));const dl=new THREE.DirectionalLight(0xff6600,1);dl.position.set(0,200,0);scene.add(dl);
const pl=new THREE.PointLight(0xff3300,3,${size*3});pl.position.set(0,${size},0);scene.add(pl);
// Ground
const gm=new THREE.MeshStandardMaterial({color:0x1a0a00,roughness:1,metalness:0.1});
const ground=new THREE.Mesh(new THREE.PlaneGeometry(1000,1000,50,50),gm);ground.rotation.x=-Math.PI/2;scene.add(ground);
// Volcano cone
const vs=${size};
const volcGeo=new THREE.CylinderGeometry(vs*0.15,vs,vs*1.5,32);
const volcMat=new THREE.MeshStandardMaterial({color:0x222222,roughness:1,metalness:0.2});
const volc=new THREE.Mesh(volcGeo,volcMat);volc.position.y=vs*0.75;scene.add(volc);
// Crater
const craterGeo=new THREE.CylinderGeometry(vs*0.14,vs*0.05,vs*0.2,32,1,true);
const lavaMat=new THREE.MeshStandardMaterial({color:${lavaCol},emissive:${lavaCol},emissiveIntensity:1,roughness:0.5});
scene.add(new THREE.Mesh(craterGeo,lavaMat)).position.y=vs*1.45;
// Lava rivers
const lavaRiverMat=new THREE.MeshBasicMaterial({color:${lavaCol}});
for(let i=0;i<${rivers};i++){
  const angle=(i/${rivers})*Math.PI*2;
  const curve=new THREE.CatmullRomCurve3([
    new THREE.Vector3(Math.cos(angle)*vs*0.12,vs*1.4,Math.sin(angle)*vs*0.12),
    new THREE.Vector3(Math.cos(angle)*vs*0.4,vs*0.8,Math.sin(angle)*vs*0.4),
    new THREE.Vector3(Math.cos(angle)*vs*0.9,vs*0.1,Math.sin(angle)*vs*0.9)
  ]);
  const geo=new THREE.TubeGeometry(curve,20,3,8,false);
  scene.add(new THREE.Mesh(geo,lavaRiverMat));
}
${smoke ? `
const smokeGeo=new THREE.BufferGeometry();const sp=new Float32Array(900);
for(let i=0;i<300;i++){const a=Math.random()*Math.PI*2,r=Math.random()*vs*0.1;sp[i*3]=Math.cos(a)*r;sp[i*3+1]=vs*1.5+Math.random()*vs;sp[i*3+2]=Math.sin(a)*r;}
smokeGeo.setAttribute('position',new THREE.BufferAttribute(sp,3));
const smokePts=new THREE.Points(smokeGeo,new THREE.PointsMaterial({color:0x666666,size:4,transparent:true,opacity:0.5}));scene.add(smokePts);` : ''}
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
let t=0;function anim(){requestAnimationFrame(anim);t+=0.01;controls.update();
pl.intensity=2+Math.sin(t*3)*1;
${smoke ? `const pa=smokePts.geometry.attributes.position.array;for(let i=1;i<pa.length;i+=3){pa[i]+=0.3;if(pa[i]>vs*2.5)pa[i]=vs*1.5;}smokePts.geometry.attributes.position.needsUpdate=true;` : ''}
renderer.render(scene,camera);}anim();
}());<\/script></body></html>`;
  }

  return { init };
})();
