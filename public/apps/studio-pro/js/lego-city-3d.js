// Lego / Voxel City Builder
window.LegoCity3D = (() => {
  'use strict';

  const GRID_W = 10, GRID_H = 10;
  let grid = {};
  let selColor = '#ef4444';

  function init(container, btn) {
    const panel = document.createElement('div');
    panel.id = 'legocity-panel';
    panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;overflow-y:auto;padding:14px;font-family:Inter,sans-serif;flex-direction:column;border-radius:8px;';

    const palette = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899','#ffffff','#1e293b','#78716c'];
    const palHtml = palette.map(c => `<div data-col="${c}" style="width:20px;height:20px;background:${c};border-radius:3px;cursor:pointer;border:2px solid transparent;"></div>`).join('');

    let gridHtml = '<div style="display:grid;grid-template-columns:repeat(10,1fr);gap:2px;margin-top:8px;">';
    for (let r = 0; r < GRID_H; r++) for (let c = 0; c < GRID_W; c++)
      gridHtml += `<div data-r="${r}" data-c="${c}" style="aspect-ratio:1;background:#1e293b;border-radius:2px;cursor:pointer;border:1px solid #334155;"></div>`;
    gridHtml += '</div>';

    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#ef4444,#f97316);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">🧱</div>
        <div><div style="font-size:13px;font-weight:700;color:#f1f5f9;">Lego / Voxel City Builder</div><div style="font-size:10px;color:#64748b;">Click grid to place colored blocks</div></div>
      </div>
      <div style="font-size:10px;color:#94a3b8;margin-bottom:6px;">Color Palette</div>
      <div style="display:flex;gap:5px;flex-wrap:wrap;">${palHtml}</div>
      <div style="font-size:10px;color:#94a3b8;margin-top:10px;">Selected: <span id="lc-swatch" style="display:inline-block;width:12px;height:12px;background:${selColor};border-radius:2px;vertical-align:middle;"></span> <span id="lc-sc">${selColor}</span></div>
      ${gridHtml}
      <button id="lc-clear" style="width:100%;margin-top:8px;padding:6px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:6px;color:#fca5a5;font-size:10px;font-weight:600;cursor:pointer;">🗑️ Clear Grid</button>
      <button id="lc-add" style="width:100%;margin-top:8px;padding:9px;background:linear-gradient(135deg,#ef4444,#f97316);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(239,68,68,0.4);">${window.currentLang === 'fr' ? '🧱 AJOUTER À LA SCÈNE' : '🧱 ADD TO SCENE'}</button>
      <button id="lc-gen" style="width:100%;margin-top:6px;padding:7px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:8px;color:#fca5a5;font-size:11px;font-weight:600;cursor:pointer;">${window.currentLang === 'fr' ? '📄 Générer HTML' : '📄 Generate HTML'}</button>
    `;
    container.appendChild(panel);

    panel.querySelectorAll('[data-col]').forEach(el => {
      el.addEventListener('click', () => {
        selColor = el.dataset.col;
        document.getElementById('lc-swatch').style.background = selColor;
        document.getElementById('lc-sc').textContent = selColor;
        panel.querySelectorAll('[data-col]').forEach(e => e.style.borderColor = 'transparent');
        el.style.borderColor = '#fff';
      });
    });

    panel.querySelectorAll('[data-r]').forEach(el => {
      el.addEventListener('click', () => {
        const k = `${el.dataset.r}_${el.dataset.c}`;
        if (grid[k] === selColor) { delete grid[k]; el.style.background = '#1e293b'; }
        else { grid[k] = selColor; el.style.background = selColor; }
      });
    });

    document.getElementById('lc-clear').addEventListener('click', () => {
      grid = {};
      panel.querySelectorAll('[data-r]').forEach(el => el.style.background = '#1e293b');
    });

    document.getElementById('lc-add').addEventListener('click', () => {
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('lego-city', { grid: JSON.stringify(grid), gw: GRID_W, gh: GRID_H });
        panel.style.display = 'none';
      }
    });

    document.getElementById('lc-gen').addEventListener('click', () => {
      const html = makeHTML(grid, GRID_W, GRID_H);
      const ed = document.getElementById('code-editor');
      if (ed) { if (window.pushUndo) window.pushUndo(); ed.value = html; ed.dispatchEvent(new Event('input', { bubbles: true })); }
      if (window.toast) window.toast('🧱 Lego City generated!');
    });

    if (btn) btn.addEventListener('click', () => {
      const vis = panel.style.display === 'flex';
      document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display = 'none');
      panel.style.display = vis ? 'none' : 'flex';
    });
  }

  function makeHTML(grid, gw, gh) {
    const entries = Object.entries(grid).map(([k, v]) => `["${k}","${v}"]`).join(',');
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Lego City 3D</title>
<style>*{margin:0;padding:0;}body{background:#0f0f0f;overflow:hidden;}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/controls/OrbitControls.js"><\/script>
</head><body><script>(function(){
const scene=new THREE.Scene();scene.background=new THREE.Color(0x0f0f0f);
const camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,0.1,1000);camera.position.set(60,80,120);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(innerWidth,innerHeight);document.body.appendChild(renderer.domElement);
const controls=new THREE.OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.autoRotate=true;
scene.add(new THREE.AmbientLight(0xffffff,0.6));const dl=new THREE.DirectionalLight(0xffffff,0.8);dl.position.set(100,200,100);scene.add(dl);
const gMap=new Map([${entries}]);
const bs=10,bh=10;
gMap.forEach((col,[k])=>{
  const parts=k.split('_');const r=+parts[0],c=+parts[1];
  const geo=new THREE.BoxGeometry(bs-1,bh,bs-1);
  const mat=new THREE.MeshStandardMaterial({color:col,roughness:0.3,metalness:0.1});
  const mesh=new THREE.Mesh(geo,mat);
  mesh.position.set(c*bs-(${gw}*bs/2)+bs/2,bh/2,r*bs-(${gh}*bs/2)+bs/2);
  scene.add(mesh);
  // Studs on top
  const stud=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,1.5,16),mat);
  stud.position.set(mesh.position.x,bh+0.75,mesh.position.z);scene.add(stud);
});
// Base plate
const base=new THREE.Mesh(new THREE.BoxGeometry(${gw}*bs+4,2,${gh}*bs+4),new THREE.MeshStandardMaterial({color:0x16a34a,roughness:0.8}));
base.position.y=-1;scene.add(base);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
function anim(){requestAnimationFrame(anim);controls.update();renderer.render(scene,camera);}anim();
}());<\/script></body></html>`;
  }

  return { init };
})();
