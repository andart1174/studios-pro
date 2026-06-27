// Ice / Snow Terrain Generator
window.IceTerrain3D = (() => {
  'use strict';

  function init(container, btn) {
    const panel = document.createElement('div');
    panel.id = 'iceterrain-panel';
    panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;overflow-y:auto;padding:14px;font-family:Inter,sans-serif;flex-direction:column;border-radius:8px;';

    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#bae6fd,#7dd3fc);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">🧊</div>
        <div><div style="font-size:13px;font-weight:700;color:#f1f5f9;">Ice & Snow Terrain</div><div style="font-size:10px;color:#64748b;">Frozen Tundra Generator</div></div>
      </div>

      <div style="display:flex;align-items:center;gap:6px;margin-top:10px;">
        <span style="font-size:10px;color:#94a3b8;min-width:80px;">Spike Density <b id="it-dv">60</b></span>
        <input type="range" id="it-dens" min="10" max="150" step="5" value="60" style="flex:1;accent-color:#7dd3fc;">
      </div>

      <div style="display:flex;align-items:center;gap:6px;margin-top:10px;">
        <span style="font-size:10px;color:#94a3b8;min-width:80px;">Spike Height <b id="it-hv">40</b></span>
        <input type="range" id="it-height" min="10" max="120" step="5" value="40" style="flex:1;accent-color:#7dd3fc;">
      </div>

      <div style="margin-top:12px;">
        <label style="font-size:10px;color:#94a3b8;">Aurora Color</label>
        <select id="it-aurora" style="width:100%;padding:6px;background:#1e293b;border:1px solid #334155;border-radius:4px;color:#f1f5f9;font-size:11px;margin-top:4px;">
          <option value="green">Aurora Borealis (Green/Blue)</option>
          <option value="purple">Aurora Violet (Pink/Purple)</option>
          <option value="none">No Aurora</option>
        </select>
      </div>

      <div style="display:flex;gap:15px;margin-top:12px;">
        <label style="font-size:10px;display:flex;align-items:center;gap:4px;color:#cbd5e1;cursor:pointer;"><input type="checkbox" id="it-snow" checked style="accent-color:#7dd3fc;"> Snowfall Particles</label>
      </div>

      <button id="it-add" style="width:100%;margin-top:10px;padding:9px;background:linear-gradient(135deg,#7dd3fc,#38bdf8);border:none;border-radius:8px;color:#0c1420;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(125,211,252,0.4);">${window.currentLang === 'fr' ? '🧊 AJOUTER À LA SCÈNE' : '🧊 ADD TO SCENE'}</button>
      <button id="it-gen" style="width:100%;margin-top:6px;padding:7px;background:rgba(125,211,252,0.1);border:1px solid rgba(125,211,252,0.3);border-radius:8px;color:#7dd3fc;font-size:11px;font-weight:600;cursor:pointer;">${window.currentLang === 'fr' ? '📄 Générer HTML' : '📄 Generate HTML'}</button>
    `;
    container.appendChild(panel);

    document.getElementById('it-dens').addEventListener('input', e => document.getElementById('it-dv').textContent = e.target.value);
    document.getElementById('it-height').addEventListener('input', e => document.getElementById('it-hv').textContent = e.target.value);

    document.getElementById('it-add').addEventListener('click', () => {
      const dens = +document.getElementById('it-dens').value;
      const height = +document.getElementById('it-height').value;
      const aurora = document.getElementById('it-aurora').value;
      const snow = document.getElementById('it-snow').checked;
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('ice-terrain', { dens, height, aurora, snow });
        panel.style.display = 'none';
      }
    });

    document.getElementById('it-gen').addEventListener('click', () => {
      const dens = +document.getElementById('it-dens').value;
      const height = +document.getElementById('it-height').value;
      const aurora = document.getElementById('it-aurora').value;
      const snow = document.getElementById('it-snow').checked;
      const html = makeHTML(dens, height, aurora, snow);
      const ed = document.getElementById('code-editor');
      if (ed) { if (window.pushUndo) window.pushUndo(); ed.value = html; ed.dispatchEvent(new Event('input', { bubbles: true })); }
      if (window.toast) window.toast('🧊 Ice Terrain generated!');
    });

    if (btn) btn.addEventListener('click', () => {
      const vis = panel.style.display === 'flex';
      document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display = 'none');
      panel.style.display = vis ? 'none' : 'flex';
    });
  }

  function makeHTML(dens, height, aurora, snow) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Ice Terrain 3D</title>
<style>*{margin:0;padding:0;}body{background:#0a1628;overflow:hidden;}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/controls/OrbitControls.js"><\/script>
</head><body><script>(function(){
const scene=new THREE.Scene();scene.background=new THREE.Color(0x0a1628);scene.fog=new THREE.FogExp2(0x0a1628,0.003);
const camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,0.1,2000);camera.position.set(0,80,200);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));document.body.appendChild(renderer.domElement);
const controls=new THREE.OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.autoRotate=true;controls.autoRotateSpeed=0.5;
scene.add(new THREE.AmbientLight(0xadd8e6,0.6));const dl=new THREE.DirectionalLight(0xffffff,0.8);dl.position.set(100,200,100);scene.add(dl);
// Ground
const gm=new THREE.MeshStandardMaterial({color:0xe8f4fd,roughness:0.9,metalness:0.1});
scene.add(new THREE.Mesh(new THREE.PlaneGeometry(1000,1000),gm)).rotation.x=-Math.PI/2;
// Ice Spikes
const sm=new THREE.MeshPhysicalMaterial({color:0xb0e0ff,metalness:0.1,roughness:0.05,transmission:0.8,transparent:true});
for(let i=0;i<${dens};i++){
  const h=${height}*(0.3+Math.random()*0.7);
  const r=2+Math.random()*3;
  const geo=new THREE.ConeGeometry(r,h,6);
  const mesh=new THREE.Mesh(geo,sm.clone());
  mesh.position.set((Math.random()-0.5)*400,(h/2),( Math.random()-0.5)*400);
  scene.add(mesh);
}
${snow ? `
const snowGeo=new THREE.BufferGeometry();const sp=new Float32Array(6000);
for(let i=0;i<2000;i++){sp[i*3]=(Math.random()-0.5)*800;sp[i*3+1]=Math.random()*300;sp[i*3+2]=(Math.random()-0.5)*800;}
snowGeo.setAttribute('position',new THREE.BufferAttribute(sp,3));
const snowMat=new THREE.PointsMaterial({color:0xffffff,size:1.5,transparent:true,opacity:0.8});
const snowPts=new THREE.Points(snowGeo,snowMat);scene.add(snowPts);` : ''}
${aurora !== 'none' ? `
const aColors={green:[0x00ff88,0x0088ff],purple:[0xff44ff,0x8844ff]};
const aCol=aColors['${aurora}'];
for(let i=0;i<5;i++){
  const curve=new THREE.CatmullRomCurve3([
    new THREE.Vector3(-300+i*120,150+Math.random()*50,-200),
    new THREE.Vector3(-150+i*60,200+Math.random()*80,0),
    new THREE.Vector3(i*100,180+Math.random()*50,200)
  ]);
  const geo=new THREE.TubeGeometry(curve,30,3,8,false);
  const mat=new THREE.MeshBasicMaterial({color:aCol[i%2],transparent:true,opacity:0.25});
  scene.add(new THREE.Mesh(geo,mat));
}` : ''}
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
function anim(){requestAnimationFrame(anim);controls.update();
${snow ? `const pa=snowPts.geometry.attributes.position.array;for(let i=1;i<pa.length;i+=3){pa[i]-=0.3;if(pa[i]<0)pa[i]=300;}snowPts.geometry.attributes.position.needsUpdate=true;` : ''}
renderer.render(scene,camera);}anim();
}());<\/script></body></html>`;
  }

  return { init };
})();
