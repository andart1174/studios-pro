// Text-to-Scene 3D Integrator
window.TextToScene3D = (() => {
  'use strict';
  
  function makeHTML(prompt) {
    const p = prompt.toLowerCase();
    const hasWater = p.includes('water') || p.includes('ocean') || p.includes('sea');
    const hasSpace = p.includes('space') || p.includes('star') || p.includes('galaxy');
    const hasForest = p.includes('forest') || p.includes('tree') || p.includes('wood');
    const hasCity = p.includes('city') || p.includes('urban') || p.includes('building');

    let bgColor = '0x111827';
    let fogColor = '0x111827';
    if(hasSpace) { bgColor = '0x000000'; fogColor = '0x000000'; }
    if(hasWater) { bgColor = '0x023e8a'; fogColor = '0x023e8a'; }

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>AI Text-to-Scene 3D</title>
<style>*{margin:0;padding:0;}body{background:#111;overflow:hidden;font-family:sans-serif;}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/controls/OrbitControls.js"><\/script>
</head><body>
<div style="position:fixed;top:10px;left:50%;transform:translateX(-50%);background:rgba(255,255,255,0.9);border:1px solid rgba(226,232,240,1);padding:8px 16px;border-radius:20px;font-size:13px;font-weight:bold;color:#1e293b;z-index:9;box-shadow:0 4px 15px rgba(0,0,0,0.1);">🪄 Prompt: "${prompt}"</div>
<script>(function(){
const scene = new THREE.Scene();
scene.background = new THREE.Color(${bgColor});
scene.fog = new THREE.FogExp2(${fogColor}, 0.002);

const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 2000);
camera.position.set(0, 50, 150);

const renderer = new THREE.WebGLRenderer({antialias:true, preserveDrawingBuffer:true});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = true;

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dl = new THREE.DirectionalLight(0xffffff, 0.8);
dl.position.set(50, 100, 50);
scene.add(dl);

// Procedural Generation based on prompt keywords

${hasSpace ? `
// Add Stars
const geo = new THREE.BufferGeometry(); const pos = [];
for(let i=0; i<3000; i++) pos.push((Math.random()-0.5)*2000, (Math.random()-0.5)*2000, (Math.random()-0.5)*2000);
geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
const stars = new THREE.Points(geo, new THREE.PointsMaterial({color: 0xffffff, size: 2, transparent: true, opacity: 0.8}));
scene.add(stars);

// Add Planet
const planet = new THREE.Mesh(new THREE.SphereGeometry(30, 32, 32), new THREE.MeshStandardMaterial({color: 0x4b90e2, roughness: 0.8, metalness: 0.2}));
scene.add(planet);
` : ''}

${hasWater ? `
// Add Water Plane
const wGeo = new THREE.PlaneGeometry(1000, 1000, 50, 50);
const wMat = new THREE.MeshStandardMaterial({color: 0x0077be, roughness: 0.1, metalness: 0.8, transparent: true, opacity: 0.8, wireframe: true});
const water = new THREE.Mesh(wGeo, wMat);
water.rotation.x = -Math.PI/2;
scene.add(water);
` : ''}

${hasForest ? `
// Add Trees (Simplified L-System / Cones)
const fGroup = new THREE.Group();
scene.add(fGroup);
const tMat = new THREE.MeshStandardMaterial({color: 0x228b22, roughness: 0.9});
const bMat = new THREE.MeshStandardMaterial({color: 0x8b4513, roughness: 1.0});
for(let i=0; i<100; i++) {
    const x = (Math.random()-0.5)*500;
    const z = (Math.random()-0.5)*500;
    const s = 1 + Math.random()*2;
    
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 10), bMat);
    trunk.position.set(x, 5*s, z);
    trunk.scale.set(s,s,s);
    fGroup.add(trunk);
    
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(5, 20), tMat);
    leaves.position.set(x, 20*s, z);
    leaves.scale.set(s,s,s);
    fGroup.add(leaves);
}
// Add Ground
const gPlane = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), new THREE.MeshStandardMaterial({color: 0x3b5323}));
gPlane.rotation.x = -Math.PI/2;
scene.add(gPlane);
` : ''}

${hasCity ? `
// Add Buildings
const cGroup = new THREE.Group();
scene.add(cGroup);
const bMat = new THREE.MeshStandardMaterial({color: 0x8899aa, roughness: 0.4, metalness: 0.6});
for(let i=0; i<150; i++) {
    const x = (Math.random()-0.5)*800;
    const z = (Math.random()-0.5)*800;
    if(Math.abs(x) < 40 && Math.abs(z) < 40) continue; // leave center
    const w = 10 + Math.random()*20;
    const d = 10 + Math.random()*20;
    const h = 20 + Math.random()*150;
    
    const bld = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bMat);
    bld.position.set(x, h/2, z);
    cGroup.add(bld);
}
const gPlane = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), new THREE.MeshStandardMaterial({color: 0x222222}));
gPlane.rotation.x = -Math.PI/2;
scene.add(gPlane);
` : ''}

${!hasSpace && !hasWater && !hasForest && !hasCity ? `
// Abstract Fallback
const geo = new THREE.IcosahedronGeometry(30, 2);
const mat = new THREE.MeshStandardMaterial({color: 0xffffff, wireframe: true});
const obj = new THREE.Mesh(geo, mat);
scene.add(obj);
` : ''}

window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

function anim(){
    requestAnimationFrame(anim);
    controls.update();
    ${hasWater ? `
    // Animate water
    const pos = water.geometry.attributes.position.array;
    for(let i=2; i<pos.length; i+=3) {
        pos[i] = Math.sin(Date.now()*0.001 + pos[i-2]*0.05 + pos[i-1]*0.05) * 5;
    }
    water.geometry.attributes.position.needsUpdate = true;
    ` : ''}
    renderer.render(scene, camera);
}
anim();
}());<\/script></body></html>`;
  }

  function init(container, btn) {
    const panel = document.createElement('div');
    panel.id = 'text2scene-panel';
    panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;overflow-y:auto;padding:14px;font-family:Inter,sans-serif;flex-direction:column;border-radius:8px;';

    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#c084fc,#3b82f6);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">🪄</div>
        <div><div style="font-size:13px;font-weight:700;color:#f1f5f9;">Text-to-Scene Integrator</div><div style="font-size:10px;color:#64748b;">AI Prompt to 3D</div></div>
      </div>
      
      <p style="font-size:10px;color:#cbd5e1;line-height:1.4;margin-bottom:12px;">Type a descriptive prompt. The engine will detect keywords (forest, city, space, water) and assemble the components procedurally.</p>

      <div style="margin-top:10px;">
        <textarea id="ts-prompt" rows="4" placeholder="e.g., A futuristic city next to the ocean..." style="width:100%;padding:10px;background:#1e293b;border:1px solid #3b82f6;border-radius:8px;color:#fff;font-size:14px;box-sizing:border-box;box-shadow:inset 0 2px 4px rgba(0,0,0,0.2);"></textarea>
      </div>

      <div style="display:flex;gap:10px;margin-top:10px;">
        <button class="ts-chip" style="flex:1;font-size:10px;padding:6px;background:#334155;color:#fff;border:none;border-radius:4px;cursor:pointer;">Cyber City</button>
        <button class="ts-chip" style="flex:1;font-size:10px;padding:6px;background:#334155;color:#fff;border:none;border-radius:4px;cursor:pointer;">Space Galaxy</button>
        <button class="ts-chip" style="flex:1;font-size:10px;padding:6px;background:#334155;color:#fff;border:none;border-radius:4px;cursor:pointer;">Pine Forest</button>
      </div>

      <button id="ts-add" style="width:100%;margin-top:10px;padding:9px;background:linear-gradient(135deg,#c084fc,#3b82f6);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(192,132,252,0.4)">🪄 ADD TO SCENE</button>
      <button id="ts-gen" style="width:100%;margin-top:6px;padding:7px;background:rgba(192,132,252,0.1);border:1px solid rgba(192,132,252,0.3);border-radius:8px;color:#d8b4fe;font-size:11px;font-weight:600;cursor:pointer;">📄 Generate HTML</button>
    `;
    container.appendChild(panel);

    document.querySelectorAll('.ts-chip').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.getElementById('ts-prompt').value = e.target.textContent;
        });
    });

    document.getElementById('ts-add').addEventListener('click', () => {
      const prompt = document.getElementById('ts-prompt').value || 'A random 3D scene';
      if(window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('text-to-scene', { prompt });
        panel.style.display = 'none';
      }
    });

    document.getElementById('ts-gen').addEventListener('click', () => {
      const prompt = document.getElementById('ts-prompt').value || 'A random 3D scene';
      
      const html = makeHTML(prompt);
      const ed = document.getElementById('code-editor');
      if (ed) { 
          if(window.pushUndo) window.pushUndo(); 
          ed.value = html; 
          ed.dispatchEvent(new Event('input', {bubbles: true})); 
      }
      if (window.toast) window.toast('🪄 Scene generated from prompt!');
    });

    if (btn) btn.addEventListener('click', () => {
      const vis = panel.style.display === 'flex';
      document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display = 'none');
      panel.style.display = vis ? 'none' : 'flex';
    });
  }

  return { init };
})();
