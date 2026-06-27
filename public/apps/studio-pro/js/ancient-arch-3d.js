// Ancient Architecture Generator
window.AncientArch3D = (() => {
  'use strict';

  function init(container, btn) {
    const panel = document.createElement('div');
    panel.id = 'ancientarch-panel';
    panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;overflow-y:auto;padding:14px;font-family:Inter,sans-serif;flex-direction:column;border-radius:8px;';

    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#d97706,#92400e);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">🏛️</div>
        <div><div style="font-size:13px;font-weight:700;color:#f1f5f9;">Ancient Architecture</div><div style="font-size:10px;color:#64748b;">Procedural Historic Structures</div></div>
      </div>
      <div style="margin-top:8px;">
        <label style="font-size:10px;color:#94a3b8;">Architecture Style</label>
        <select id="aa-style" style="width:100%;padding:6px;background:#1e293b;border:1px solid #334155;border-radius:4px;color:#f1f5f9;font-size:11px;margin-top:4px;">
          <option value="greek">🏛️ Greek Temple (Parthenon)</option>
          <option value="egyptian">🔺 Egyptian Pyramid</option>
          <option value="roman">🏟️ Roman Colosseum</option>
          <option value="gothic">⛪ Gothic Cathedral</option>
        </select>
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-top:10px;">
        <span style="font-size:10px;color:#94a3b8;min-width:80px;">Scale <b id="aa-sv">1.0</b>x</span>
        <input type="range" id="aa-scale" min="0.5" max="3.0" step="0.1" value="1.0" style="flex:1;accent-color:#d97706;">
      </div>
      <div style="margin-top:10px;">
        <label style="font-size:10px;color:#94a3b8;">Material</label>
        <select id="aa-mat" style="width:100%;padding:6px;background:#1e293b;border:1px solid #334155;border-radius:4px;color:#f1f5f9;font-size:11px;margin-top:4px;">
          <option value="marble">White Marble</option>
          <option value="sandstone">Golden Sandstone</option>
          <option value="granite">Dark Granite</option>
          <option value="ruins">Ancient Ruins (Worn)</option>
        </select>
      </div>
      <button id="aa-add" style="width:100%;margin-top:10px;padding:9px;background:linear-gradient(135deg,#d97706,#92400e);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(217,119,6,0.5);">${window.currentLang === 'fr' ? '🏛️ AJOUTER À LA SCÈNE' : '🏛️ ADD TO SCENE'}</button>
      <button id="aa-gen" style="width:100%;margin-top:6px;padding:7px;background:rgba(217,119,6,0.1);border:1px solid rgba(217,119,6,0.3);border-radius:8px;color:#fbbf24;font-size:11px;font-weight:600;cursor:pointer;">${window.currentLang === 'fr' ? '📄 Générer HTML' : '📄 Generate HTML'}</button>
    `;
    container.appendChild(panel);

    document.getElementById('aa-scale').addEventListener('input', e => document.getElementById('aa-sv').textContent = (+e.target.value).toFixed(1));

    document.getElementById('aa-add').addEventListener('click', () => {
      const style = document.getElementById('aa-style').value;
      const scale = +document.getElementById('aa-scale').value;
      const mat = document.getElementById('aa-mat').value;
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('ancient-arch', { style, scale, mat });
        panel.style.display = 'none';
      }
    });

    document.getElementById('aa-gen').addEventListener('click', () => {
      const style = document.getElementById('aa-style').value;
      const scale = +document.getElementById('aa-scale').value;
      const mat = document.getElementById('aa-mat').value;
      const html = makeHTML(style, scale, mat);
      const ed = document.getElementById('code-editor');
      if (ed) { if (window.pushUndo) window.pushUndo(); ed.value = html; ed.dispatchEvent(new Event('input', { bubbles: true })); }
      if (window.toast) window.toast('🏛️ Ancient Architecture generated!');
    });

    if (btn) btn.addEventListener('click', () => {
      const vis = panel.style.display === 'flex';
      document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display = 'none');
      panel.style.display = vis ? 'none' : 'flex';
    });
  }

  function makeHTML(style, scale, mat) {
    const matColors = { marble: '0xf5f5f0', sandstone: '0xd4a96a', granite: '0x555555', ruins: '0x8b7355' };
    const col = matColors[mat] || '0xf5f5f0';
    const rough = mat === 'ruins' ? 0.9 : mat === 'marble' ? 0.1 : 0.6;
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Ancient Architecture 3D</title>
<style>*{margin:0;padding:0;}body{background:#120d08;overflow:hidden;}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/controls/OrbitControls.js"><\/script>
</head><body><script>(function(){
const scene=new THREE.Scene();scene.background=new THREE.Color(0x120d08);scene.fog=new THREE.FogExp2(0x120d08,0.002);
const camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,0.1,2000);camera.position.set(0,100,300);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;document.body.appendChild(renderer.domElement);
const controls=new THREE.OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.autoRotate=true;controls.autoRotateSpeed=0.4;
scene.add(new THREE.AmbientLight(0xffeedd,0.5));
const sun=new THREE.DirectionalLight(0xfff8e7,1.2);sun.position.set(200,300,100);sun.castShadow=true;scene.add(sun);
const s=${scale};
const mat=new THREE.MeshStandardMaterial({color:${col},roughness:${rough},metalness:0.05});
const group=new THREE.Group();scene.add(group);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(1000,1000),new THREE.MeshStandardMaterial({color:0xc2a06a,roughness:1}));
ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);

${style === 'greek' ? `
// Greek Temple
const base=new THREE.Mesh(new THREE.BoxGeometry(180*s,8*s,120*s),mat);base.position.y=4*s;base.castShadow=true;group.add(base);
const step=new THREE.Mesh(new THREE.BoxGeometry(200*s,4*s,140*s),mat);step.position.y=2*s;group.add(step);
for(let x=-80*s;x<=80*s;x+=20*s){
  for(const z of[-50*s,50*s]){
    const col=new THREE.Mesh(new THREE.CylinderGeometry(4*s,4*s,60*s,12),mat);
    col.position.set(x,38*s,z);col.castShadow=true;group.add(col);
  }
}
const roof=new THREE.Mesh(new THREE.BoxGeometry(185*s,5*s,125*s),mat);roof.position.y=72*s;group.add(roof);
const pedGeo=new THREE.CylinderGeometry(0,95*s,30*s,4);pedGeo.rotateY(Math.PI/4);
const ped=new THREE.Mesh(pedGeo,mat);ped.position.y=89*s;group.add(ped);` : ''}

${style === 'egyptian' ? `
// Egyptian Pyramid
const pyGeo=new THREE.CylinderGeometry(0,120*s,150*s,4);pyGeo.rotateY(Math.PI/4);
const py=new THREE.Mesh(pyGeo,mat);py.position.y=75*s;group.add(py);
const tip=new THREE.Mesh(new THREE.CylinderGeometry(0,8*s,20*s,4),new THREE.MeshStandardMaterial({color:0xffd700,metalness:0.8,roughness:0.2}));
tip.position.y=158*s;group.add(tip);
// Entrance
const door=new THREE.Mesh(new THREE.BoxGeometry(15*s,25*s,4*s),new THREE.MeshBasicMaterial({color:0x000000}));
door.position.set(0,12*s,121*s);group.add(door);` : ''}

${style === 'roman' ? `
// Roman Colosseum (simplified ring)
for(let i=0;i<36;i++){
  const angle=(i/36)*Math.PI*2;
  const r=120*s;
  const arch=new THREE.Mesh(new THREE.BoxGeometry(15*s,60*s,15*s),mat);
  arch.position.set(Math.cos(angle)*r,30*s,Math.sin(angle)*r);arch.castShadow=true;group.add(arch);
  if(i%2===0){
    const lintel=new THREE.Mesh(new THREE.BoxGeometry(20*s,5*s,10*s),mat);
    lintel.position.set(Math.cos(angle)*r,65*s,Math.sin(angle)*r);group.add(lintel);
  }
}
const floor=new THREE.Mesh(new THREE.CylinderGeometry(110*s,110*s,3*s,64),mat);floor.position.y=1.5;group.add(floor);` : ''}

${style === 'gothic' ? `
// Gothic Cathedral
const nave=new THREE.Mesh(new THREE.BoxGeometry(40*s,80*s,160*s),mat);nave.position.y=40*s;nave.castShadow=true;group.add(nave);
const transept=new THREE.Mesh(new THREE.BoxGeometry(120*s,70*s,30*s),mat);transept.position.set(0,35*s,0);group.add(transept);
const tower=new THREE.Mesh(new THREE.BoxGeometry(20*s,130*s,20*s),mat);tower.position.set(0,65*s,-80*s);tower.castShadow=true;group.add(tower);
const spire=new THREE.Mesh(new THREE.ConeGeometry(10*s,60*s,8),mat);spire.position.set(0,160*s,-80*s);group.add(spire);
// Rose window (circular)
const wGeo=new THREE.RingGeometry(8*s,12*s,16);
const w=new THREE.Mesh(wGeo,new THREE.MeshBasicMaterial({color:0xff8844,side:THREE.DoubleSide}));
w.position.set(0,55*s,-81*s);w.rotation.y=Math.PI/2;group.add(w);` : ''}

window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
function anim(){requestAnimationFrame(anim);controls.update();renderer.render(scene,camera);}anim();
}());<\/script></body></html>`;
  }

  return { init };
})();
