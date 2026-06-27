// Ocean Wave Simulator
window.OceanWave3D = (() => {
  'use strict';

  function init(container, btn) {
    const panel = document.createElement('div');
    panel.id = 'oceanwave-panel';
    panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;overflow-y:auto;padding:14px;font-family:Inter,sans-serif;flex-direction:column;border-radius:8px;';

    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#0ea5e9,#0284c7);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">🌊</div>
        <div><div style="font-size:13px;font-weight:700;color:#f1f5f9;">Ocean Wave Simulator</div><div style="font-size:10px;color:#64748b;">Animated Ocean Surface</div></div>
      </div>

      <div style="display:flex;align-items:center;gap:6px;margin-top:10px;">
        <span style="font-size:10px;color:#94a3b8;min-width:80px;">Wave Height <b id="ow-hv">15</b></span>
        <input type="range" id="ow-height" min="2" max="40" step="1" value="15" style="flex:1;accent-color:#0ea5e9;">
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-top:10px;">
        <span style="font-size:10px;color:#94a3b8;min-width:80px;">Wave Speed <b id="ow-sv">1.0</b></span>
        <input type="range" id="ow-speed" min="0.2" max="4.0" step="0.1" value="1.0" style="flex:1;accent-color:#0ea5e9;">
      </div>
      <div style="margin-top:12px;">
        <label style="font-size:10px;color:#94a3b8;">Ocean Type</label>
        <select id="ow-type" style="width:100%;padding:6px;background:#1e293b;border:1px solid #334155;border-radius:4px;color:#f1f5f9;font-size:11px;margin-top:4px;">
          <option value="tropical">🌴 Tropical (Turquoise)</option>
          <option value="deep">🌊 Deep Ocean (Dark Blue)</option>
          <option value="arctic">🧊 Arctic (Icy Grey-Blue)</option>
          <option value="storm">⛈️ Storm (Dark & Rough)</option>
        </select>
      </div>
      <div style="display:flex;gap:15px;margin-top:12px;">
        <label style="font-size:10px;display:flex;align-items:center;gap:4px;color:#cbd5e1;cursor:pointer;"><input type="checkbox" id="ow-foam" checked style="accent-color:#0ea5e9;"> Foam Crests</label>
        <label style="font-size:10px;display:flex;align-items:center;gap:4px;color:#cbd5e1;cursor:pointer;"><input type="checkbox" id="ow-wire" style="accent-color:#0ea5e9;"> Wireframe Mode</label>
      </div>

      <button id="ow-add" style="width:100%;margin-top:10px;padding:9px;background:linear-gradient(135deg,#0ea5e9,#0284c7);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(14,165,233,0.5);">${window.currentLang === 'fr' ? '🌊 AJOUTER À LA SCÈNE' : '🌊 ADD TO SCENE'}</button>
      <button id="ow-gen" style="width:100%;margin-top:6px;padding:7px;background:rgba(14,165,233,0.1);border:1px solid rgba(14,165,233,0.3);border-radius:8px;color:#38bdf8;font-size:11px;font-weight:600;cursor:pointer;">${window.currentLang === 'fr' ? '📄 Générer HTML' : '📄 Generate HTML'}</button>
    `;
    container.appendChild(panel);

    document.getElementById('ow-height').addEventListener('input', e => document.getElementById('ow-hv').textContent = e.target.value);
    document.getElementById('ow-speed').addEventListener('input', e => document.getElementById('ow-sv').textContent = e.target.value);

    document.getElementById('ow-add').addEventListener('click', () => {
      const wHeight = +document.getElementById('ow-height').value;
      const wSpeed = +document.getElementById('ow-speed').value;
      const wType = document.getElementById('ow-type').value;
      const foam = document.getElementById('ow-foam').checked;
      const wire = document.getElementById('ow-wire').checked;
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('ocean-wave', { wHeight, wSpeed, wType, foam, wire });
        panel.style.display = 'none';
      }
    });

    document.getElementById('ow-gen').addEventListener('click', () => {
      const wHeight = +document.getElementById('ow-height').value;
      const wSpeed = +document.getElementById('ow-speed').value;
      const wType = document.getElementById('ow-type').value;
      const foam = document.getElementById('ow-foam').checked;
      const wire = document.getElementById('ow-wire').checked;
      const html = makeHTML(wHeight, wSpeed, wType, foam, wire);
      const ed = document.getElementById('code-editor');
      if (ed) { if (window.pushUndo) window.pushUndo(); ed.value = html; ed.dispatchEvent(new Event('input', { bubbles: true })); }
      if (window.toast) window.toast('🌊 Ocean Wave generated!');
    });

    if (btn) btn.addEventListener('click', () => {
      const vis = panel.style.display === 'flex';
      document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display = 'none');
      panel.style.display = vis ? 'none' : 'flex';
    });
  }

  function makeHTML(wHeight, wSpeed, wType, foam, wire) {
    const colors = { tropical: '0x00c8ff', deep: '0x003366', arctic: '0x99ccdd', storm: '0x223344' };
    const col = colors[wType] || '0x0077be';
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Ocean Wave 3D</title>
<style>*{margin:0;padding:0;}body{background:#001a33;overflow:hidden;}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/controls/OrbitControls.js"><\/script>
</head><body><script>(function(){
const scene=new THREE.Scene();scene.background=new THREE.Color(0x001a33);scene.fog=new THREE.FogExp2(0x001a33,0.002);
const camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,0.1,2000);camera.position.set(0,60,200);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(innerWidth,innerHeight);document.body.appendChild(renderer.domElement);
const controls=new THREE.OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.autoRotate=true;controls.autoRotateSpeed=0.3;
scene.add(new THREE.AmbientLight(0xffffff,0.4));const dl=new THREE.DirectionalLight(0xffffff,0.8);dl.position.set(100,200,100);scene.add(dl);
const seg=80;
const wGeo=new THREE.PlaneGeometry(600,600,seg,seg);
const wMat=new THREE.MeshStandardMaterial({color:${col},roughness:0.1,metalness:0.6,transparent:true,opacity:0.85,wireframe:${wire},side:THREE.DoubleSide});
const water=new THREE.Mesh(wGeo,wMat);water.rotation.x=-Math.PI/2;scene.add(water);
${foam ? `
const foamGeo=new THREE.BufferGeometry();const fp=new Float32Array(3000);
for(let i=0;i<1000;i++){fp[i*3]=(Math.random()-0.5)*600;fp[i*3+1]=1;fp[i*3+2]=(Math.random()-0.5)*600;}
foamGeo.setAttribute('position',new THREE.BufferAttribute(fp,3));
const foamPts=new THREE.Points(foamGeo,new THREE.PointsMaterial({color:0xffffff,size:2,transparent:true,opacity:0.7}));scene.add(foamPts);` : ''}
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
let t=0;const h=${wHeight},sp=${wSpeed};
function anim(){requestAnimationFrame(anim);t+=0.01*sp;controls.update();
const pa=water.geometry.attributes.position.array;
for(let i=0;i<pa.length;i+=3){
  const x=pa[i],z=pa[i+2];
  pa[i+1]=Math.sin(x*0.03+t)*h+Math.sin(z*0.05+t*1.3)*(h*0.5)+Math.sin((x+z)*0.02+t*0.7)*(h*0.3);
}
water.geometry.attributes.position.needsUpdate=true;water.geometry.computeVertexNormals();
${foam ? `
const fpa=foamPts.geometry.attributes.position.array;
for(let i=0;i<fpa.length;i+=3){fpa[i+1]=Math.sin(fpa[i]*0.03+t)*h+0.5;}
foamPts.geometry.attributes.position.needsUpdate=true;` : ''}
renderer.render(scene,camera);}anim();
}());<\/script></body></html>`;
  }

  return { init };
})();
