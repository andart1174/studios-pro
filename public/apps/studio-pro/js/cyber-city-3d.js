// Cyber City 3D Generator
window.CyberCity3D = (() => {
  'use strict';
  
  function makeHTML(density, heightScale, styleMode, wireframe, animate) {
    const isNeon = styleMode === 'neon';
    const isGlass = styleMode === 'glass';
    const isRetro = styleMode === 'retro';
    
    // Shader/Material Logic
    let matLogic = '';
    if (isNeon) {
      matLogic = `
        const mat = new THREE.MeshPhongMaterial({
            color: 0x111111,
            emissive: new THREE.Color().setHSL(Math.random(), 1, 0.5),
            emissiveIntensity: Math.random() > 0.8 ? 2 : 0,
            wireframe: ${wireframe},
            transparent: true,
            opacity: 0.9
        });
      `;
    } else if (isGlass) {
      matLogic = `
        const mat = new THREE.MeshPhysicalMaterial({
            color: 0x88ccff,
            metalness: 0.9,
            roughness: 0.1,
            transmission: 0.9,
            transparent: true,
            opacity: 0.8,
            wireframe: ${wireframe}
        });
      `;
    } else if (isRetro) {
      matLogic = `
        const mat = new THREE.MeshStandardMaterial({
            color: 0xff00ff,
            metalness: 0.5,
            roughness: 0.5,
            wireframe: ${wireframe}
        });
      `;
    } else { // default 'cyber'
      matLogic = `
        const mat = new THREE.MeshStandardMaterial({
            color: 0x223344,
            metalness: 0.8,
            roughness: 0.2,
            emissive: new THREE.Color(0x00ffcc),
            emissiveIntensity: Math.random() > 0.9 ? 1 : 0,
            wireframe: ${wireframe}
        });
      `;
    }

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Cyber City 3D</title>
<style>*{margin:0;padding:0;}body{background:#050815;overflow:hidden;font-family:sans-serif;}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script></head><body>
<div id="info" style="position:fixed;top:10px;left:50%;transform:translateX(-50%);background:rgba(10,14,30,0.8);border:1px solid rgba(99,102,241,0.3);padding:6px 14px;border-radius:20px;font-size:11px;color:#94a3b8;z-index:9;">✨ Drag to explore &nbsp;|&nbsp; Scroll to zoom</div>
<script>(function(){
const scene = new THREE.Scene();
scene.background = new THREE.Color(${isRetro ? '0x2a0845' : '0x050815'});
scene.fog = new THREE.FogExp2(${isRetro ? '0x2a0845' : '0x050815'}, 0.002);

const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 3000);
camera.position.set(0, 150, 400);

const renderer = new THREE.WebGLRenderer({antialias:true, preserveDrawingBuffer:true});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Lighting
scene.add(new THREE.AmbientLight(0x222244, 1.5));
const dl = new THREE.DirectionalLight(0x6366f1, 2);
dl.position.set(200, 500, 300);
scene.add(dl);
const dl2 = new THREE.DirectionalLight(${isRetro ? '0xff00ff' : '0x00ffcc'}, 2);
dl2.position.set(-200, 200, -300);
scene.add(dl2);

// Ground
const grid = new THREE.GridHelper(2000, 100, ${isRetro ? '0xff00ff' : '0x00ffcc'}, 0x112233);
scene.add(grid);
const groundMat = new THREE.MeshStandardMaterial({color:0x050815, roughness:0.1, metalness:0.8});
const ground = new THREE.Mesh(new THREE.PlaneGeometry(2000,2000), groundMat);
ground.rotation.x = -Math.PI/2;
ground.position.y = -0.5;
scene.add(ground);

// City Generation
const cityGroup = new THREE.Group();
scene.add(cityGroup);

const gridSize = 40;
const citySize = ${density};
const maxH = ${heightScale};

const geoBox = new THREE.BoxGeometry(1,1,1);
// Move pivot to bottom
geoBox.translate(0, 0.5, 0);

for(let x = -citySize; x <= citySize; x+=gridSize) {
    for(let z = -citySize; z <= citySize; z+=gridSize) {
        // Leave roads
        if(Math.abs(x) < 40 || Math.abs(z) < 40) continue;
        if(Math.random() > 0.85) continue; // empty lots
        
        let h = Math.random() * maxH * 0.3 + 20; // base height
        
        // Center city is taller
        const dist = Math.sqrt(x*x + z*z);
        if(dist < citySize * 0.4 && Math.random() > 0.5) {
            h += Math.random() * maxH;
        }

        ${matLogic}
        const bld = new THREE.Mesh(geoBox, mat);
        
        const w = gridSize * (0.5 + Math.random()*0.4);
        const d = gridSize * (0.5 + Math.random()*0.4);
        
        bld.scale.set(w, h, d);
        bld.position.set(x + (Math.random()*10-5), 0, z + (Math.random()*10-5));
        cityGroup.add(bld);
        
        // Add antennas/details to tall buildings
        if(h > maxH * 0.7) {
            const antGeo = new THREE.CylinderGeometry(0.5, 0.5, 40);
            antGeo.translate(0, 20, 0);
            const antMat = new THREE.MeshBasicMaterial({color: 0xffffff});
            const ant = new THREE.Mesh(antGeo, antMat);
            ant.position.set(0, h, 0);
            bld.add(ant);
            
            // Red blinking light
            const bl = new THREE.PointLight(0xff0000, 2, 100);
            bl.position.set(0, h+40, 0);
            bld.add(bl);
            // Save for animation
            bl.userData.isBlinker = true;
            bl.userData.offset = Math.random() * 100;
        }
    }
}

// Flying cars / Data streams
const streams = new THREE.Group();
scene.add(streams);
const sGeo = new THREE.BoxGeometry(4,1,1);
const sMat = new THREE.MeshBasicMaterial({color: ${isRetro ? '0x00ffff' : '0xffaa00'}});
for(let i=0; i<150; i++) {
    const car = new THREE.Mesh(sGeo, sMat);
    car.position.set((Math.random()-0.5)*1000, 20+Math.random()*100, (Math.random()-0.5)*1000);
    car.userData.speed = 2 + Math.random()*4;
    car.userData.dir = Math.random() > 0.5 ? 1 : -1;
    car.userData.axis = Math.random() > 0.5 ? 'x' : 'z';
    if(car.userData.axis === 'z') car.rotation.y = Math.PI/2;
    streams.add(car);
}

let drag=false, px=0, py=0, rotY=-0.5, rotX=0.2, dist=600;
const setCam = () => {
    camera.position.set(Math.sin(rotY)*Math.cos(rotX)*dist, Math.max(5, Math.sin(rotX)*dist), Math.cos(rotY)*Math.cos(rotX)*dist);
    camera.lookAt(0, 50, 0);
};
setCam();
document.addEventListener('mousedown', e=>{drag=true;px=e.clientX;py=e.clientY;});
document.addEventListener('mouseup', ()=>drag=false);
document.addEventListener('mousemove', e=>{
    if(!drag)return;
    rotY+=(e.clientX-px)*0.005; rotX-=(e.clientY-py)*0.005;
    rotX=Math.max(-0.1,Math.min(1.4,rotX));
    px=e.clientX; py=e.clientY; setCam();
});
document.addEventListener('wheel', e=>{
    dist=Math.max(50,Math.min(2000,dist+e.deltaY*0.5)); setCam();
},{passive:true});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

let t=0;
function anim(){
    requestAnimationFrame(anim);
    t+=0.01;
    
    ${animate ? 'rotY += 0.001; setCam();' : ''}
    
    // Blinkers
    cityGroup.traverse(c => {
        if(c.isLight && c.userData.isBlinker) {
            c.intensity = Math.sin(t*10 + c.userData.offset) > 0.8 ? 2 : 0;
        }
    });
    
    // Cars
    streams.children.forEach(c => {
        c.position[c.userData.axis] += c.userData.speed * c.userData.dir;
        if(c.position[c.userData.axis] > 800) c.position[c.userData.axis] = -800;
        if(c.position[c.userData.axis] < -800) c.position[c.userData.axis] = 800;
    });

    renderer.render(scene, camera);
}
anim();
}());<\/script></body></html>`;
  }

  function init(container, btn) {
    const panel = document.createElement('div');
    panel.id = 'cybercity-panel';
    panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;overflow-y:auto;padding:14px;font-family:Inter,sans-serif;flex-direction:column;border-radius:8px;';

    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#6366f1,#38bdf8);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">🏙️</div>
        <div><div style="font-size:13px;font-weight:700;color:#f1f5f9;">Cyber City Builder</div><div style="font-size:10px;color:#64748b;">Procedural Metropolis</div></div>
      </div>
      
      <div style="display:flex;align-items:center;gap:6px;margin-top:10px;">
        <span style="font-size:10px;color:#94a3b8;min-width:80px;">City Size <b id="cc-dv">800</b></span>
        <input type="range" id="cc-dens" min="400" max="1500" step="100" value="800" style="flex:1;accent-color:#38bdf8;">
      </div>
      
      <div style="display:flex;align-items:center;gap:6px;margin-top:10px;">
        <span style="font-size:10px;color:#94a3b8;min-width:80px;">Max Height <b id="cc-hv">300</b></span>
        <input type="range" id="cc-height" min="100" max="800" step="50" value="300" style="flex:1;accent-color:#38bdf8;">
      </div>

      <div style="margin-top:12px;">
        <label style="font-size:10px;color:#94a3b8;">City Style</label>
        <select id="cc-style" style="width:100%;padding:6px;background:#1e293b;border:1px solid #334155;border-radius:4px;color:#f1f5f9;font-size:11px;margin-top:4px;">
          <option value="cyber">Cyberpunk (Dark & Neon)</option>
          <option value="glass">Corporate (Glass Grid)</option>
          <option value="retro">Retro-Synthwave (Pink/Purple)</option>
          <option value="neon">Holographic (Neon Outlines)</option>
        </select>
      </div>

      <div style="display:flex;gap:15px;margin-top:12px;">
        <label style="font-size:10px;display:flex;align-items:center;gap:4px;color:#cbd5e1;cursor:pointer;"><input type="checkbox" id="cc-wf" style="accent-color:#38bdf8;"> Wireframe</label>
        <label style="font-size:10px;display:flex;align-items:center;gap:4px;color:#cbd5e1;cursor:pointer;"><input type="checkbox" id="cc-anim" checked style="accent-color:#38bdf8;"> Auto Rotate</label>
      </div>

      <button id="cc-add" style="width:100%;margin-top:10px;padding:9px;background:linear-gradient(135deg,#0ea5e9,#6366f1);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(14,165,233,0.4);">🏙️ ADD TO SCENE</button>
      <button id="cc-gen" style="width:100%;margin-top:6px;padding:7px;background:rgba(14,165,233,0.1);border:1px solid rgba(14,165,233,0.3);border-radius:8px;color:#38bdf8;font-size:11px;font-weight:600;cursor:pointer;">📄 Generate HTML</button>
    `;
    container.appendChild(panel);

    document.getElementById('cc-dens').addEventListener('input', e => document.getElementById('cc-dv').textContent = e.target.value);
    document.getElementById('cc-height').addEventListener('input', e => document.getElementById('cc-hv').textContent = e.target.value);

    document.getElementById('cc-add').addEventListener('click', () => {
      const dens = +document.getElementById('cc-dens').value;
      const h = +document.getElementById('cc-height').value;
      const st = document.getElementById('cc-style').value;
      const wf = document.getElementById('cc-wf').checked;
      const anim = document.getElementById('cc-anim').checked;
      if(window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('cyber-city', { dens, h, st, wf, anim });
        panel.style.display = 'none';
      }
    });

    document.getElementById('cc-gen').addEventListener('click', () => {
      const dens = +document.getElementById('cc-dens').value;
      const h = +document.getElementById('cc-height').value;
      const st = document.getElementById('cc-style').value;
      const wf = document.getElementById('cc-wf').checked;
      const anim = document.getElementById('cc-anim').checked;
      
      const html = makeHTML(dens, h, st, wf, anim);
      const ed = document.getElementById('code-editor');
      if (ed) { 
          if(window.pushUndo) window.pushUndo(); 
          ed.value = html; 
          ed.dispatchEvent(new Event('input', {bubbles: true})); 
      }
      if (window.toast) window.toast('🏙️ Cyber City generated!');
    });

    if (btn) btn.addEventListener('click', () => {
      const vis = panel.style.display === 'flex';
      document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display = 'none');
      panel.style.display = vis ? 'none' : 'flex';
    });
  }

  return { init };
})();
