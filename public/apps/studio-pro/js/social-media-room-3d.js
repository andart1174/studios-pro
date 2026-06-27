// Social Media Room 3D Generator
window.SocialMediaRoom3D = (() => {
  'use strict';
  
  function makeHTML(text, username, likes, doAnim) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>3D Social Room</title>
<style>*{margin:0;padding:0;}body{background:#f1f5f9;overflow:hidden;font-family:sans-serif;}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/controls/OrbitControls.js"><\/script>
</head><body>
<div style="position:fixed;top:10px;left:50%;transform:translateX(-50%);background:rgba(255,255,255,0.9);border:1px solid rgba(226,232,240,1);padding:6px 14px;border-radius:20px;font-size:11px;color:#475569;z-index:9;box-shadow:0 4px 15px rgba(0,0,0,0.05);">💬 3D Social Media Museum</div>
<script>(function(){
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf1f5f9);
scene.fog = new THREE.FogExp2(0xf1f5f9, 0.002);

const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 2000);
camera.position.set(0, 20, 100);

const renderer = new THREE.WebGLRenderer({antialias:true, preserveDrawingBuffer:true});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = ${doAnim};
controls.autoRotateSpeed = 0.5;

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dl = new THREE.DirectionalLight(0xffffff, 0.8);
dl.position.set(50, 100, 50);
dl.castShadow = true;
dl.shadow.mapSize.width = 2048;
dl.shadow.mapSize.height = 2048;
scene.add(dl);

const pl = new THREE.PointLight(0x3b82f6, 1, 200);
pl.position.set(-50, 20, 50);
scene.add(pl);

// Room / Floor
const floorMat = new THREE.MeshStandardMaterial({color: 0xffffff, roughness: 0.1, metalness: 0.2});
const floor = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), floorMat);
floor.rotation.x = -Math.PI/2;
floor.position.y = -20;
floor.receiveShadow = true;
scene.add(floor);

// Glass Display Case
const caseGeo = new THREE.BoxGeometry(60, 80, 5);
const caseMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0.1, roughness: 0.05,
    transmission: 0.9, transparent: true, opacity: 1
});
const displayCase = new THREE.Mesh(caseGeo, caseMat);
displayCase.position.y = 20;
displayCase.castShadow = true;
scene.add(displayCase);

// Stand
const stand = new THREE.Mesh(new THREE.CylinderGeometry(15, 20, 40, 32), new THREE.MeshStandardMaterial({color: 0x1e293b, roughness: 0.8}));
stand.position.y = 0;
stand.castShadow = true;
scene.add(stand);

// Particles (Likes/Hearts)
const pGroup = new THREE.Group();
scene.add(pGroup);

const lGeo = new THREE.SphereGeometry(1, 8, 8); // Simple representation
const lMat = new THREE.MeshBasicMaterial({color: 0xef4444});

for(let i=0; i<${likes}; i++) {
    const p = new THREE.Mesh(lGeo, lMat);
    p.position.set((Math.random()-0.5)*100, (Math.random()-0.5)*100 + 30, (Math.random()-0.5)*100);
    p.userData = {
        speedY: Math.random()*0.2 + 0.1,
        speedR: (Math.random()-0.5)*0.1,
        angle: Math.random()*Math.PI*2,
        rad: 30 + Math.random()*30
    };
    pGroup.add(p);
}

// 2D Text rendering on canvas to use as texture
const canvas = document.createElement('canvas');
canvas.width = 512;
canvas.height = 512;
const ctx = canvas.getContext('2d');
ctx.fillStyle = 'white';
ctx.fillRect(0,0,512,512);

// User Header
ctx.fillStyle = '#1e293b';
ctx.beginPath(); ctx.arc(60, 60, 30, 0, Math.PI*2); ctx.fill();
ctx.font = 'bold 24px sans-serif';
ctx.fillText("@" + "${username}", 110, 70);

// Post Text
ctx.font = '28px sans-serif';
ctx.fillStyle = '#334155';
const words = "${text}".split(' ');
let line = '';
let y = 140;
for(let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > 420 && n > 0) {
        ctx.fillText(line, 40, y);
        line = words[n] + ' ';
        y += 40;
    } else {
        line = testLine;
    }
}
ctx.fillText(line, 40, y);

const tex = new THREE.CanvasTexture(canvas);
const postMesh = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), new THREE.MeshBasicMaterial({map: tex}));
postMesh.position.set(0, 20, 2.6);
scene.add(postMesh);

window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

function anim(){
    requestAnimationFrame(anim);
    controls.update();
    
    // Animate likes
    pGroup.children.forEach(p => {
        p.position.y += p.userData.speedY;
        p.userData.angle += p.userData.speedR;
        p.position.x = Math.sin(p.userData.angle) * p.userData.rad;
        p.position.z = Math.cos(p.userData.angle) * p.userData.rad;
        
        if(p.position.y > 100) p.position.y = -20;
    });

    renderer.render(scene, camera);
}
anim();
}());<\/script></body></html>`;
  }

  function init(container, btn) {
    const panel = document.createElement('div');
    panel.id = 'social-panel';
    panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;overflow-y:auto;padding:14px;font-family:Inter,sans-serif;flex-direction:column;border-radius:8px;';

    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#e11d48,#fb7185);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">💬</div>
        <div><div style="font-size:13px;font-weight:700;color:#f1f5f9;">Social Media 3D Room</div><div style="font-size:10px;color:#64748b;">Post into 3D Museum</div></div>
      </div>
      
      <div style="margin-top:10px;">
        <label style="font-size:10px;color:#94a3b8;margin-bottom:6px;display:block;">Username</label>
        <input type="text" id="sm-user" value="elonmusk" style="width:100%;padding:6px;background:#1e293b;border:1px solid #334155;border-radius:4px;color:#fff;font-size:12px;box-sizing:border-box;">
      </div>

      <div style="margin-top:10px;">
        <label style="font-size:10px;color:#94a3b8;margin-bottom:6px;display:block;">Post Content</label>
        <textarea id="sm-text" rows="4" style="width:100%;padding:6px;background:#1e293b;border:1px solid #334155;border-radius:4px;color:#fff;font-size:12px;box-sizing:border-box;">Just generated a massive 3D Cyber City inside my browser using WebGL! The future of the web is fully 3D.</textarea>
      </div>

      <div style="display:flex;align-items:center;gap:6px;margin-top:10px;">
        <span style="font-size:10px;color:#94a3b8;min-width:80px;">Floating Likes <b id="sm-lv">150</b></span>
        <input type="range" id="sm-likes" min="10" max="500" step="10" value="150" style="flex:1;accent-color:#e11d48;">
      </div>

      <div style="display:flex;gap:15px;margin-top:12px;">
        <label style="font-size:10px;display:flex;align-items:center;gap:4px;color:#cbd5e1;cursor:pointer;"><input type="checkbox" id="sm-anim" checked style="accent-color:#e11d48;"> Auto Rotate Camera</label>
      </div>

      <button id="sm-add" style="width:100%;margin-top:10px;padding:9px;background:linear-gradient(135deg,#e11d48,#fb7185);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(225,29,72,0.4);">💬 ADD TO SCENE</button>
      <button id="sm-gen" style="width:100%;margin-top:6px;padding:7px;background:rgba(225,29,72,0.1);border:1px solid rgba(225,29,72,0.3);border-radius:8px;color:#fb7185;font-size:11px;font-weight:600;cursor:pointer;">📄 Generate HTML</button>
    `;
    container.appendChild(panel);

    document.getElementById('sm-likes').addEventListener('input', e => document.getElementById('sm-lv').textContent = e.target.value);

    document.getElementById('sm-add').addEventListener('click', () => {
      const user = document.getElementById('sm-user').value || 'user';
      const text = document.getElementById('sm-text').value.replace(/\n/g, ' ') || 'Hello World';
      const likes = +document.getElementById('sm-likes').value;
      const anim = document.getElementById('sm-anim').checked;
      if(window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('social-room', { user, text, likes, anim });
        panel.style.display = 'none';
      }
    });

    document.getElementById('sm-gen').addEventListener('click', () => {
      const user = document.getElementById('sm-user').value || 'user';
      const text = document.getElementById('sm-text').value.replace(/\n/g, ' ') || 'Hello World';
      const likes = +document.getElementById('sm-likes').value;
      const anim = document.getElementById('sm-anim').checked;
      
      const html = makeHTML(text, user, likes, anim);
      const ed = document.getElementById('code-editor');
      if (ed) { 
          if(window.pushUndo) window.pushUndo(); 
          ed.value = html; 
          ed.dispatchEvent(new Event('input', {bubbles: true})); 
      }
      if (window.toast) window.toast('💬 3D Social Post generated!');
    });

    if (btn) btn.addEventListener('click', () => {
      const vis = panel.style.display === 'flex';
      document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display = 'none');
      panel.style.display = vis ? 'none' : 'flex';
    });
  }

  return { init };
})();
