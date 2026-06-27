// 3D Data Globe with Real-Time Data
window.DataGlobe3D = (() => {
  'use strict';

  const defaultData = { France: 67, Germany: 83, USA: 331, China: 1411, Brazil: 213, India: 1380, Japan: 126, UK: 67, Canada: 38, Australia: 26 };

  function init(container, btn) {
    const panel = document.createElement('div');
    panel.id = 'dataglobe-panel';
    panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;overflow-y:auto;padding:14px;font-family:Inter,sans-serif;flex-direction:column;border-radius:8px;';

    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">🌐</div>
        <div><div style="font-size:13px;font-weight:700;color:#f1f5f9;">3D Data Globe</div><div style="font-size:10px;color:#64748b;">Country Statistics Visualizer</div></div>
      </div>
      <div style="margin-top:8px;">
        <label style="font-size:10px;color:#94a3b8;">Data Category</label>
        <select id="dg-cat" style="width:100%;padding:6px;background:#1e293b;border:1px solid #334155;border-radius:4px;color:#f1f5f9;font-size:11px;margin-top:4px;">
          <option value="population">👥 Population (Millions)</option>
          <option value="gdp">💰 GDP Index</option>
          <option value="co2">🌿 CO₂ Emissions</option>
          <option value="custom">📋 Custom JSON Data</option>
        </select>
      </div>
      <div id="dg-json-wrap" style="display:none;margin-top:8px;">
        <label style="font-size:10px;color:#94a3b8;">Custom JSON ({"Country": value})</label>
        <textarea id="dg-json" rows="5" style="width:100%;padding:6px;background:#1e293b;border:1px solid #334155;border-radius:4px;color:#38bdf8;font-size:10px;font-family:monospace;margin-top:4px;box-sizing:border-box;">{"France": 67, "Germany": 83, "USA": 331}</textarea>
      </div>
      <div style="margin-top:10px;">
        <label style="font-size:10px;color:#94a3b8;">Globe Color</label>
        <select id="dg-color" style="width:100%;padding:6px;background:#1e293b;border:1px solid #334155;border-radius:4px;color:#f1f5f9;font-size:11px;margin-top:4px;">
          <option value="blue">Ocean Blue</option>
          <option value="teal">Teal / Emerald</option>
          <option value="dark">Dark Matter</option>
          <option value="neon">Neon Grid</option>
        </select>
      </div>
      <button id="dg-add" style="width:100%;margin-top:10px;padding:9px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(59,130,246,0.5);">${window.currentLang === 'fr' ? '🌐 AJOUTER À LA SCÈNE' : '🌐 ADD TO SCENE'}</button>
      <button id="dg-gen" style="width:100%;margin-top:6px;padding:7px;background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.3);border-radius:8px;color:#60a5fa;font-size:11px;font-weight:600;cursor:pointer;">${window.currentLang === 'fr' ? '📄 Générer HTML' : '📄 Generate HTML'}</button>
    `;
    container.appendChild(panel);

    document.getElementById('dg-cat').addEventListener('change', e => {
      document.getElementById('dg-json-wrap').style.display = e.target.value === 'custom' ? 'block' : 'none';
    });

    function getData() {
      const cat = document.getElementById('dg-cat').value;
      const gdp = { France: 2.7, Germany: 3.8, USA: 22.9, China: 16.9, Brazil: 1.6, India: 2.9, Japan: 4.9, UK: 2.8, Canada: 1.9, Australia: 1.3 };
      const co2 = { France: 4.5, Germany: 8.1, USA: 15.2, China: 7.4, Brazil: 2.2, India: 1.9, Japan: 9.1, UK: 5.5, Canada: 15.3, Australia: 14.8 };
      if (cat === 'gdp') return gdp;
      if (cat === 'co2') return co2;
      if (cat === 'custom') { try { return JSON.parse(document.getElementById('dg-json').value); } catch (e) { return defaultData; } }
      return defaultData;
    }

    document.getElementById('dg-add').addEventListener('click', () => {
      const data = getData();
      const color = document.getElementById('dg-color').value;
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('data-globe', { data: JSON.stringify(data), color });
        panel.style.display = 'none';
      }
    });

    document.getElementById('dg-gen').addEventListener('click', () => {
      const data = getData();
      const color = document.getElementById('dg-color').value;
      const html = makeHTML(data, color);
      const ed = document.getElementById('code-editor');
      if (ed) { if (window.pushUndo) window.pushUndo(); ed.value = html; ed.dispatchEvent(new Event('input', { bubbles: true })); }
      if (window.toast) window.toast('🌐 Data Globe generated!');
    });

    if (btn) btn.addEventListener('click', () => {
      const vis = panel.style.display === 'flex';
      document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display = 'none');
      panel.style.display = vis ? 'none' : 'flex';
    });
  }

  function makeHTML(data, color) {
    const cols = { blue: '0x1d4ed8', teal: '0x0d9488', dark: '0x111827', neon: '0x06b6d4' };
    const gc = cols[color] || '0x1d4ed8';
    const entries = JSON.stringify(data);
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Data Globe 3D</title>
<style>*{margin:0;padding:0;}body{background:#050815;overflow:hidden;}#tt{position:absolute;background:rgba(15,23,42,0.9);color:#fff;padding:6px 10px;border-radius:6px;font-size:11px;pointer-events:none;opacity:0;border:1px solid #334155;font-family:sans-serif;transition:opacity 0.1s;}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/controls/OrbitControls.js"><\/script>
</head><body><div id="tt"></div><script>(function(){
const scene=new THREE.Scene();scene.background=new THREE.Color(0x050815);
const camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,0.1,1000);camera.position.set(0,0,250);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(innerWidth,innerHeight);document.body.appendChild(renderer.domElement);
const controls=new THREE.OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.autoRotate=true;controls.autoRotateSpeed=0.5;
scene.add(new THREE.AmbientLight(0xffffff,0.4));const dl=new THREE.DirectionalLight(0xffffff,0.8);dl.position.set(200,300,100);scene.add(dl);
// Globe
const globeMat=new THREE.MeshPhongMaterial({color:${gc},transparent:true,opacity:0.6,wireframe:'${color}'==='neon'});
const globe=new THREE.Mesh(new THREE.SphereGeometry(80,64,64),globeMat);scene.add(globe);
const glowMat=new THREE.MeshBasicMaterial({color:${gc},transparent:true,opacity:0.1,side:THREE.BackSide});
scene.add(new THREE.Mesh(new THREE.SphereGeometry(88,32,32),glowMat));
// Stars
const sg=new THREE.BufferGeometry();const sp=new Float32Array(6000);
for(let i=0;i<2000;i++){sp[i*3]=(Math.random()-0.5)*2000;sp[i*3+1]=(Math.random()-0.5)*2000;sp[i*3+2]=(Math.random()-0.5)*2000;}
sg.setAttribute('position',new THREE.BufferAttribute(sp,3));
scene.add(new THREE.Points(sg,new THREE.PointsMaterial({color:0xffffff,size:0.5})));
// Data bars (lat/lon mapped)
const data=${entries};
const positions={France:[48.8,2.3],Germany:[51.1,10.4],USA:[37.1,-95.7],China:[35.8,104.2],Brazil:[-14.2,-51.9],India:[20.6,78.9],Japan:[36.2,138.2],UK:[55.4,-3.4],Canada:[56.1,-106.3],Australia:[-25.3,133.8]};
const barMat=new THREE.MeshStandardMaterial({color:0xff6600,emissive:0xff3300,emissiveIntensity:0.3,metalness:0.2,roughness:0.4});
const objs=[];
const maxVal=Math.max(...Object.values(data));
Object.entries(data).forEach(([country,val])=>{
  const pos=positions[country];if(!pos)return;
  const lat=pos[0]*Math.PI/180,lon=pos[1]*Math.PI/180;
  const r=80;
  const x=r*Math.cos(lat)*Math.cos(lon);const y=r*Math.sin(lat);const z=-r*Math.cos(lat)*Math.sin(lon);
  const h=5+40*(val/maxVal);
  const bar=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,h,8),barMat);
  const dir=new THREE.Vector3(x,y,z).normalize();
  bar.position.copy(dir.clone().multiplyScalar(80+h/2));
  bar.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);
  bar.userData={label:country+': '+val};
  scene.add(bar);objs.push(bar);
});
const tt=document.getElementById('tt');const ray=new THREE.Raycaster();const mouse=new THREE.Vector2();
window.addEventListener('mousemove',e=>{mouse.x=(e.clientX/innerWidth)*2-1;mouse.y=-(e.clientY/innerHeight)*2+1;ray.setFromCamera(mouse,camera);const h=ray.intersectObjects(objs);if(h.length>0){tt.textContent=h[0].object.userData.label;tt.style.left=e.clientX+12+'px';tt.style.top=e.clientY-20+'px';tt.style.opacity=1;}else tt.style.opacity=0;});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
function anim(){requestAnimationFrame(anim);controls.update();renderer.render(scene,camera);}anim();
}());<\/script></body></html>`;
  }

  return { init };
})();
