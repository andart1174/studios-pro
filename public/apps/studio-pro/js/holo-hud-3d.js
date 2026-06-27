// Holographic HUD Overlay Generator
window.HoloHUD3D = (() => {
  'use strict';

  function init(container, btn) {
    const panel = document.createElement('div');
    panel.id = 'holohud-panel';
    panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;overflow-y:auto;padding:14px;font-family:Inter,sans-serif;flex-direction:column;border-radius:8px;';

    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#06b6d4,#0284c7);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">🌈</div>
        <div><div style="font-size:13px;font-weight:700;color:#f1f5f9;">Holographic HUD</div><div style="font-size:10px;color:#64748b;">Sci-Fi Interface Overlay</div></div>
      </div>
      <div style="margin-top:8px;">
        <label style="font-size:10px;color:#94a3b8;">HUD Style</label>
        <select id="hh-style" style="width:100%;padding:6px;background:#1e293b;border:1px solid #334155;border-radius:4px;color:#f1f5f9;font-size:11px;margin-top:4px;">
          <option value="tactical">⚔️ Tactical Combat HUD</option>
          <option value="medical">❤️ Medical Vitals HUD</option>
          <option value="nav">🧭 Navigation Compass HUD</option>
          <option value="energy">⚡ Energy Core HUD</option>
        </select>
      </div>
      <div style="margin-top:10px;">
        <label style="font-size:10px;color:#94a3b8;">Accent Color</label>
        <select id="hh-color" style="width:100%;padding:6px;background:#1e293b;border:1px solid #334155;border-radius:4px;color:#f1f5f9;font-size:11px;margin-top:4px;">
          <option value="cyan">Cyan / Teal</option>
          <option value="green">Lime Green</option>
          <option value="red">Alert Red</option>
          <option value="gold">Elite Gold</option>
        </select>
      </div>
      <div style="display:flex;gap:15px;margin-top:12px;">
        <label style="font-size:10px;display:flex;align-items:center;gap:4px;color:#cbd5e1;cursor:pointer;"><input type="checkbox" id="hh-scan" checked style="accent-color:#06b6d4;"> Scanning Ring Animation</label>
      </div>
      <button id="hh-add" style="width:100%;margin-top:10px;padding:9px;background:linear-gradient(135deg,#06b6d4,#0284c7);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(6,182,212,0.5);">${window.currentLang === 'fr' ? '🌈 AJOUTER À LA SCÈNE' : '🌈 ADD TO SCENE'}</button>
      <button id="hh-gen" style="width:100%;margin-top:6px;padding:7px;background:rgba(6,182,212,0.1);border:1px solid rgba(6,182,212,0.3);border-radius:8px;color:#22d3ee;font-size:11px;font-weight:600;cursor:pointer;">${window.currentLang === 'fr' ? '📄 Générer HTML' : '📄 Generate HTML'}</button>
    `;
    container.appendChild(panel);

    document.getElementById('hh-add').addEventListener('click', () => {
      const style = document.getElementById('hh-style').value;
      const color = document.getElementById('hh-color').value;
      const scan = document.getElementById('hh-scan').checked;
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('holo-hud', { style, color, scan });
        panel.style.display = 'none';
      }
    });

    document.getElementById('hh-gen').addEventListener('click', () => {
      const style = document.getElementById('hh-style').value;
      const color = document.getElementById('hh-color').value;
      const scan = document.getElementById('hh-scan').checked;
      const html = makeHTML(style, color, scan);
      const ed = document.getElementById('code-editor');
      if (ed) { if (window.pushUndo) window.pushUndo(); ed.value = html; ed.dispatchEvent(new Event('input', { bubbles: true })); }
      if (window.toast) window.toast('🌈 Holographic HUD generated!');
    });

    if (btn) btn.addEventListener('click', () => {
      const vis = panel.style.display === 'flex';
      document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display = 'none');
      panel.style.display = vis ? 'none' : 'flex';
    });
  }

  function makeHTML(style, color, scan) {
    const cols = { cyan: '0x00d4ff', green: '0x00ff88', red: '0xff3344', gold: '0xffcc00' };
    const gc = cols[color] || '0x00d4ff';
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Holographic HUD 3D</title>
<style>*{margin:0;padding:0;}body{background:#030912;overflow:hidden;}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/controls/OrbitControls.js"><\/script>
</head><body><script>(function(){
const scene=new THREE.Scene();scene.background=new THREE.Color(0x030912);
const camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,0.1,1000);camera.position.set(0,0,200);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,alpha:true});
renderer.setSize(innerWidth,innerHeight);document.body.appendChild(renderer.domElement);
const controls=new THREE.OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.autoRotate=true;
scene.add(new THREE.AmbientLight(0xffffff,0.2));
const hudGroup=new THREE.Group();scene.add(hudGroup);
const col=${gc};const mat=c=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:0.8,side:THREE.DoubleSide});
// Main rings
[60,70,80].forEach((r,i)=>{
  const geo=new THREE.RingGeometry(r-1,r+1,64);
  const mesh=new THREE.Mesh(geo,mat(i===1?col:0x334455));hudGroup.add(mesh);
});
// Data bars
for(let i=0;i<12;i++){
  const angle=(i/12)*Math.PI*2;const h=10+Math.random()*30;
  const bar=new THREE.Mesh(new THREE.PlaneGeometry(3,h),mat(col));
  bar.position.set(Math.cos(angle)*55,Math.sin(angle)*55,0);
  bar.rotation.z=angle;hudGroup.add(bar);
}
// Cross-hairs
const ch=new THREE.Mesh(new THREE.PlaneGeometry(120,1),mat(col));hudGroup.add(ch);
const cv=new THREE.Mesh(new THREE.PlaneGeometry(1,120),mat(col));hudGroup.add(cv);
// Center dot
hudGroup.add(new THREE.Mesh(new THREE.CircleGeometry(4,32),mat(col)));
// Corner brackets
[[-50,50],[50,50],[-50,-50],[50,-50]].forEach(([x,y])=>{
  [[3,15,0,7.5],[15,3,7.5,0]].forEach(([w,h,ox,oy])=>{
    const b=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat(col));b.position.set(x+ox,y+oy,0);hudGroup.add(b);
  });
});
${scan ? `
const scanRing=new THREE.Mesh(new THREE.RingGeometry(0,85,64),mat(col));
scanRing.material.opacity=0;hudGroup.add(scanRing);` : ''}
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
let t=0;function anim(){requestAnimationFrame(anim);t+=0.01;controls.update();
hudGroup.rotation.z+=0.002;
${scan ? `scanRing.scale.set(t%3/3*1.2,t%3/3*1.2,1);scanRing.material.opacity=1-(t%3/3);` : ''}
renderer.render(scene,camera);}anim();
}());<\/script></body></html>`;
  }

  return { init };
})();
