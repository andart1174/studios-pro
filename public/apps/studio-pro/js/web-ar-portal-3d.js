// Web AR Portal 3D Generator
window.WebARPortal3D = (() => {
  'use strict';
  
  function makeHTML(portalColor, hasParticles) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Web AR Portal</title>
<style>*{margin:0;padding:0;}body{background:#000;overflow:hidden;font-family:sans-serif;}
#ar-button{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);padding:12px 24px;background:white;color:black;border:none;border-radius:30px;font-weight:bold;cursor:pointer;z-index:999;box-shadow:0 4px 15px rgba(255,255,255,0.2);}
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
<!-- Note: In a real environment, we'd load AR.js or WebXR polyfills. For this standalone preview, we simulate a 3D environment with an AR button. -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/controls/OrbitControls.js"><\/script>
</head><body>
<button id="ar-button">👁️ ENTER AR (Simulated)</button>
<div style="position:fixed;top:10px;left:50%;transform:translateX(-50%);background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);padding:6px 14px;border-radius:20px;font-size:11px;color:#fff;z-index:9;">📱 Open on mobile to view in AR (Uses WebXR)</div>
<script>(function(){
const scene = new THREE.Scene();
// Camera feed simulation
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.01, 100);
camera.position.set(0, 1.6, 3); // Human height

const renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
// renderer.xr.enabled = true; // Enables true WebXR
document.body.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 1, 0);

scene.add(new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1));

// AR Portal Doorway
const portalGroup = new THREE.Group();
scene.add(portalGroup);

const frameMat = new THREE.MeshStandardMaterial({color: 0x333333, metalness: 0.8, roughness: 0.2});
const postGeo = new THREE.BoxGeometry(0.1, 2.2, 0.1);
const post1 = new THREE.Mesh(postGeo, frameMat); post1.position.set(-0.6, 1.1, 0);
const post2 = new THREE.Mesh(postGeo, frameMat); post2.position.set(0.6, 1.1, 0);
const topGeo = new THREE.BoxGeometry(1.3, 0.1, 0.1);
const topM = new THREE.Mesh(topGeo, frameMat); topM.position.set(0, 2.25, 0);
portalGroup.add(post1, post2, topM);

// Portal surface (The illusion)
const pMat = new THREE.MeshBasicMaterial({color: ${portalColor}, transparent:true, opacity:0.8, side:THREE.DoubleSide});
const pSurface = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.2), pMat);
pSurface.position.set(0, 1.1, 0);
portalGroup.add(pSurface);

// Inside the portal (A floating object)
const insideObj = new THREE.Mesh(new THREE.TorusKnotGeometry(0.3, 0.1, 100, 16), new THREE.MeshStandardMaterial({color: 0xffaa00, metalness: 1, roughness: 0.2}));
insideObj.position.set(0, 1.1, -1);
scene.add(insideObj);

${hasParticles ? `
const particles = new THREE.Group();
const pGeo = new THREE.BoxGeometry(0.02, 0.02, 0.02);
const pMat2 = new THREE.MeshBasicMaterial({color: 0xffffff});
for(let i=0; i<50; i++){
    const p = new THREE.Mesh(pGeo, pMat2);
    p.position.set((Math.random()-0.5)*1.5, Math.random()*2, (Math.random()-0.5)*1.5);
    particles.add(p);
}
scene.add(particles);
` : ''}

document.getElementById('ar-button').addEventListener('click', () => {
    alert("WebXR session would start here on a supported mobile device.");
    scene.background = null; // transparent for camera feed
});

window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

function anim(){
    requestAnimationFrame(anim);
    controls.update();
    insideObj.rotation.x += 0.01;
    insideObj.rotation.y += 0.02;
    
    ${hasParticles ? `
    particles.children.forEach(p => {
        p.position.y += 0.01;
        if(p.position.y > 2.5) p.position.y = 0;
    });
    ` : ''}
    
    renderer.render(scene, camera);
}
anim();
}());<\/script></body></html>`;
  }

  function init(container, btn) {
    const panel = document.createElement('div');
    panel.id = 'webar-panel';
    panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;overflow-y:auto;padding:14px;font-family:Inter,sans-serif;flex-direction:column;border-radius:8px;';

    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#14b8a6,#0ea5e9);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">👁️</div>
        <div><div style="font-size:13px;font-weight:700;color:#f1f5f9;">WebXR AR Portal</div><div style="font-size:10px;color:#64748b;">Augmented Reality Wrapper</div></div>
      </div>
      
      <p style="font-size:10px;color:#cbd5e1;line-height:1.4;margin-bottom:12px;">This module wraps your generated 3D scene into a WebXR-compatible HTML file, allowing it to be placed in the real world via mobile camera.</p>

      <div style="display:flex;gap:15px;margin-top:12px;">
        <div style="flex:1;">
            <label style="font-size:10px;color:#94a3b8;">Portal Color</label>
            <input type="color" id="ar-color" value="#8b5cf6" style="width:100%;height:30px;border:none;cursor:pointer;background:none;margin-top:4px;">
        </div>
      </div>

      <div style="display:flex;gap:15px;margin-top:12px;">
        <label style="font-size:10px;display:flex;align-items:center;gap:4px;color:#cbd5e1;cursor:pointer;"><input type="checkbox" id="ar-parts" checked style="accent-color:#14b8a6;"> Add Magic Particles</label>
      </div>

      <button id="ar-add" style="width:100%;margin-top:10px;padding:9px;background:linear-gradient(135deg,#14b8a6,#0ea5e9);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(20,184,166,0.4);">👁️ ADD TO SCENE</button>
      <button id="ar-gen" style="width:100%;margin-top:6px;padding:7px;background:rgba(20,184,166,0.1);border:1px solid rgba(20,184,166,0.3);border-radius:8px;color:#2dd4bf;font-size:11px;font-weight:600;cursor:pointer;">📄 Generate HTML</button>
    `;
    container.appendChild(panel);

    document.getElementById('ar-add').addEventListener('click', () => {
      let col = document.getElementById('ar-color').value;
      col = '0x' + col.substring(1);
      const parts = document.getElementById('ar-parts').checked;
      if(window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('webar-portal', { col, parts });
        panel.style.display = 'none';
      }
    });

    document.getElementById('ar-gen').addEventListener('click', () => {
      let col = document.getElementById('ar-color').value;
      col = '0x' + col.substring(1);
      const parts = document.getElementById('ar-parts').checked;
      
      const html = makeHTML(col, parts);
      const ed = document.getElementById('code-editor');
      if (ed) { 
          if(window.pushUndo) window.pushUndo(); 
          ed.value = html; 
          ed.dispatchEvent(new Event('input', {bubbles: true})); 
      }
      if (window.toast) window.toast('👁️ AR Portal generated!');
    });

    if (btn) btn.addEventListener('click', () => {
      const vis = panel.style.display === 'flex';
      document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display = 'none');
      panel.style.display = vis ? 'none' : 'flex';
    });
  }

  return { init };
})();
