// 4D Time Lapse Construction Generator
window.TimeLapse4D = (() => {
  'use strict';
  
  function makeHTML(complexity, buildSpeed, styleMode) {
    let matLogic = '';
    if (styleMode === 'blueprint') {
        matLogic = `
          const baseMat = new THREE.MeshBasicMaterial({color: 0x3b82f6, wireframe: true, transparent: true, opacity: 0});
          const activeMat = new THREE.MeshBasicMaterial({color: 0x60a5fa, wireframe: true});
        `;
    } else if (styleMode === 'gold') {
        matLogic = `
          const baseMat = new THREE.MeshStandardMaterial({color: 0xfbbf24, metalness: 1, roughness: 0.2, transparent: true, opacity: 0});
          const activeMat = new THREE.MeshStandardMaterial({color: 0xfbbf24, metalness: 1, roughness: 0.2});
        `;
    } else { // default 'modern'
        matLogic = `
          const baseMat = new THREE.MeshStandardMaterial({color: 0xe2e8f0, metalness: 0.1, roughness: 0.8, transparent: true, opacity: 0});
          const activeMat = new THREE.MeshStandardMaterial({color: 0xe2e8f0, metalness: 0.1, roughness: 0.8});
        `;
    }

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>4D Time Lapse Construction</title>
<style>*{margin:0;padding:0;}body{background:#0d1225;overflow:hidden;font-family:sans-serif;}
#progress{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);width:300px;height:4px;background:#1e293b;border-radius:4px;z-index:9;}
#progress-bar{height:100%;background:#10b981;width:0%;border-radius:4px;transition:0.1s;}
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/controls/OrbitControls.js"><\/script>
</head><body>
<div style="position:fixed;top:10px;left:50%;transform:translateX(-50%);background:rgba(10,14,30,0.8);border:1px solid rgba(16,185,129,0.3);padding:6px 14px;border-radius:20px;font-size:11px;color:#94a3b8;z-index:9;">⏳ 4D Construction Progress</div>
<div id="progress"><div id="progress-bar"></div></div>
<script>(function(){
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1225);
scene.fog = new THREE.FogExp2(0x0d1225, 0.002);

const camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 2000);
camera.position.set(200, 150, 200);

const renderer = new THREE.WebGLRenderer({antialias:true, preserveDrawingBuffer:true});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 1.0;

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dl = new THREE.DirectionalLight(0xffffff, 1);
dl.position.set(100, 300, 100);
scene.add(dl);
const dl2 = new THREE.DirectionalLight(0x3b82f6, 1);
dl2.position.set(-100, 100, -100);
scene.add(dl2);

const grid = new THREE.GridHelper(500, 50, 0x334155, 0x1e293b);
grid.position.y = -0.1;
scene.add(grid);

// Generate Structure
const parts = [];
const comp = ${complexity};

${matLogic}
const scaffoldMat = new THREE.MeshBasicMaterial({color: 0xf59e0b, wireframe: true});

// Base foundation
const foundationGeo = new THREE.BoxGeometry(100, 2, 100);
const foundation = new THREE.Mesh(foundationGeo, baseMat);
foundation.position.y = 1;
scene.add(foundation);
parts.push({mesh: foundation, time: 0, type: 'solid'});

// Columns & Floors
let tOffset = 10;
const floors = Math.floor(comp / 10);
for(let f=0; f<floors; f++) {
    const yBase = 2 + f * 20;
    
    // Scaffolding appears first
    const scafGeo = new THREE.BoxGeometry(90, 20, 90);
    const scaf = new THREE.Mesh(scafGeo, scaffoldMat);
    scaf.position.y = yBase + 10;
    scaf.visible = false;
    scene.add(scaf);
    parts.push({mesh: scaf, time: tOffset, type: 'scaffold', endT: tOffset + 30});
    
    // Columns
    for(let cx=-4; cx<=4; cx+=4) {
        for(let cz=-4; cz<=4; cz+=4) {
            const cGeo = new THREE.CylinderGeometry(2, 2, 20, 8);
            const col = new THREE.Mesh(cGeo, baseMat);
            col.position.set(cx*10, yBase+10, cz*10);
            scene.add(col);
            parts.push({mesh: col, time: tOffset + 5 + Math.random()*5, type: 'solid'});
        }
    }
    tOffset += 15;
    
    // Floor slab
    const slabGeo = new THREE.BoxGeometry(90, 2, 90);
    const slab = new THREE.Mesh(slabGeo, baseMat);
    slab.position.y = yBase + 20;
    scene.add(slab);
    parts.push({mesh: slab, time: tOffset, type: 'solid'});
    tOffset += 10;
}

const maxTime = tOffset + 20;
let currentTime = 0;
const speed = ${buildSpeed};
const pbar = document.getElementById('progress-bar');

window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

function anim(){
    requestAnimationFrame(anim);
    controls.update();
    
    currentTime += speed;
    if(currentTime > maxTime + 50) currentTime = 0; // loop
    
    pbar.style.width = Math.min(100, (currentTime / maxTime)*100) + '%';
    
    parts.forEach(p => {
        if(p.type === 'solid') {
            if(currentTime >= p.time) {
                p.mesh.material = activeMat;
                // Animate drop/scale
                const progress = Math.min(1, (currentTime - p.time) / 5.0);
                p.mesh.scale.set(1, progress, 1);
            } else {
                p.mesh.material = baseMat; // transparent
            }
        } else if(p.type === 'scaffold') {
            if(currentTime >= p.time && currentTime < p.endT) {
                p.mesh.visible = true;
            } else {
                p.mesh.visible = false;
            }
        }
    });

    renderer.render(scene, camera);
}
anim();
}());<\/script></body></html>`;
  }

  function init(container, btn) {
    const panel = document.createElement('div');
    panel.id = 'timelapse-panel';
    panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;overflow-y:auto;padding:14px;font-family:Inter,sans-serif;flex-direction:column;border-radius:8px;';

    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#f59e0b,#ef4444);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">⏳</div>
        <div><div style="font-size:13px;font-weight:700;color:#f1f5f9;">4D Time-Lapse Builder</div><div style="font-size:10px;color:#64748b;">Procedural Construction Animation</div></div>
      </div>
      
      <div style="display:flex;align-items:center;gap:6px;margin-top:10px;">
        <span style="font-size:10px;color:#94a3b8;min-width:80px;">Complexity <b id="tl-cv">50</b></span>
        <input type="range" id="tl-comp" min="10" max="200" step="10" value="50" style="flex:1;accent-color:#f59e0b;">
      </div>
      
      <div style="display:flex;align-items:center;gap:6px;margin-top:10px;">
        <span style="font-size:10px;color:#94a3b8;min-width:80px;">Build Speed <b id="tl-sv">0.2</b></span>
        <input type="range" id="tl-speed" min="0.05" max="1.0" step="0.05" value="0.2" style="flex:1;accent-color:#f59e0b;">
      </div>

      <div style="margin-top:12px;">
        <label style="font-size:10px;color:#94a3b8;">Architecture Style</label>
        <select id="tl-style" style="width:100%;padding:6px;background:#1e293b;border:1px solid #334155;border-radius:4px;color:#f1f5f9;font-size:11px;margin-top:4px;">
          <option value="modern">Modern Concrete (Solid)</option>
          <option value="blueprint">Holographic Blueprint (Wireframe)</option>
          <option value="gold">Luxury Gold (Metallic)</option>
        </select>
      </div>

      <button id="tl-add" style="width:100%;margin-top:10px;padding:9px;background:linear-gradient(135deg,#ef4444,#f59e0b);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(245,158,11,0.4);">⏳ ADD TO SCENE</button>
      <button id="tl-gen" style="width:100%;margin-top:6px;padding:7px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:8px;color:#fcd34d;font-size:11px;font-weight:600;cursor:pointer;">📄 Generate HTML</button>
    `;
    container.appendChild(panel);

    document.getElementById('tl-comp').addEventListener('input', e => document.getElementById('tl-cv').textContent = e.target.value);
    document.getElementById('tl-speed').addEventListener('input', e => document.getElementById('tl-sv').textContent = e.target.value);

    document.getElementById('tl-add').addEventListener('click', () => {
      const comp = +document.getElementById('tl-comp').value;
      const sp = +document.getElementById('tl-speed').value;
      const st = document.getElementById('tl-style').value;
      if(window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('time-lapse', { comp, sp, st });
        panel.style.display = 'none';
      }
    });

    document.getElementById('tl-gen').addEventListener('click', () => {
      const comp = +document.getElementById('tl-comp').value;
      const sp = +document.getElementById('tl-speed').value;
      const st = document.getElementById('tl-style').value;
      
      const html = makeHTML(comp, sp, st);
      const ed = document.getElementById('code-editor');
      if (ed) { 
          if(window.pushUndo) window.pushUndo(); 
          ed.value = html; 
          ed.dispatchEvent(new Event('input', {bubbles: true})); 
      }
      if (window.toast) window.toast('⏳ 4D Time-Lapse generated!');
    });

    if (btn) btn.addEventListener('click', () => {
      const vis = panel.style.display === 'flex';
      document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display = 'none');
      panel.style.display = vis ? 'none' : 'flex';
    });
  }

  return { init };
})();
