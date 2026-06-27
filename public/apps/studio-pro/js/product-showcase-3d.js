// Product Showcase 3D Configurator
window.ProductShowcase3D = (() => {
  'use strict';
  
  function makeHTML(hotspots, autoRotate) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>3D Product Showcase</title>
<style>*{margin:0;padding:0;}body{background:#f8fafc;overflow:hidden;font-family:sans-serif;}
.hotspot{position:absolute;width:24px;height:24px;background:#3b82f6;border-radius:50%;color:white;text-align:center;line-height:24px;font-weight:bold;font-size:12px;cursor:pointer;transform:translate(-50%,-50%);box-shadow:0 0 0 4px rgba(59,130,246,0.3);transition:0.2s;z-index:10;}
.hotspot:hover{transform:translate(-50%,-50%) scale(1.2);background:#2563eb;}
.tooltip{position:absolute;background:white;color:#1e293b;padding:8px 12px;border-radius:6px;font-size:12px;font-weight:600;box-shadow:0 4px 15px rgba(0,0,0,0.1);pointer-events:none;opacity:0;transition:0.2s;transform:translate(-50%, -40px);z-index:11;width:150px;text-align:center;}
.hotspot:hover + .tooltip{opacity:1;transform:translate(-50%, -50px);}
#ui-panel{position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:white;padding:12px 20px;border-radius:30px;box-shadow:0 10px 25px rgba(0,0,0,0.1);display:flex;gap:15px;z-index:20;}
.color-btn{width:30px;height:30px;border-radius:50%;border:2px solid #e2e8f0;cursor:pointer;transition:0.2s;}
.color-btn:hover{transform:scale(1.1);}
.color-btn.active{border-color:#3b82f6;box-shadow:0 0 0 2px white, 0 0 0 4px #3b82f6;}
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/controls/OrbitControls.js"><\/script>
</head><body>

<div id="ui-panel">
    <div class="color-btn active" style="background:#ef4444;" data-color="0xef4444"></div>
    <div class="color-btn" style="background:#3b82f6;" data-color="0x3b82f6"></div>
    <div class="color-btn" style="background:#10b981;" data-color="0x10b981"></div>
    <div class="color-btn" style="background:#f59e0b;" data-color="0xf59e0b"></div>
    <div class="color-btn" style="background:#1e293b;" data-color="0x1e293b"></div>
</div>

<div id="hotspot-container"></div>

<script>(function(){
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf8fafc);
scene.fog = new THREE.FogExp2(0xf8fafc, 0.002);

const camera = new THREE.PerspectiveCamera(45, innerWidth/innerHeight, 0.1, 1000);
camera.position.set(0, 50, 150);

const renderer = new THREE.WebGLRenderer({antialias:true, preserveDrawingBuffer:true});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = ${autoRotate};
controls.autoRotateSpeed = 1.0;
controls.minDistance = 50;
controls.maxDistance = 300;

// Lighting (Studio Setup)
scene.add(new THREE.AmbientLight(0xffffff, 0.6));

const light1 = new THREE.DirectionalLight(0xffffff, 0.8);
light1.position.set(100, 200, 100);
light1.castShadow = true;
light1.shadow.mapSize.width = 2048;
light1.shadow.mapSize.height = 2048;
scene.add(light1);

const light2 = new THREE.DirectionalLight(0xffedd5, 0.5);
light2.position.set(-100, 50, 100);
scene.add(light2);

const light3 = new THREE.DirectionalLight(0xe0f2fe, 0.5);
light3.position.set(0, -50, -100);
scene.add(light3);

// Pedestal
const pedGeo = new THREE.CylinderGeometry(40, 45, 5, 64);
const pedMat = new THREE.MeshStandardMaterial({color: 0xffffff, roughness: 0.1, metalness: 0.1});
const pedestal = new THREE.Mesh(pedGeo, pedMat);
pedestal.position.y = -2.5;
pedestal.receiveShadow = true;
scene.add(pedestal);

const floorGeo = new THREE.PlaneGeometry(1000, 1000);
const floorMat = new THREE.ShadowMaterial({opacity: 0.2});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI/2;
floor.position.y = -5;
floor.receiveShadow = true;
scene.add(floor);

// Main Product (Mockup: Modern Chair / Headphones)
const productGroup = new THREE.Group();
scene.add(productGroup);

const mainMat = new THREE.MeshPhysicalMaterial({
    color: 0xef4444, 
    metalness: 0.2, 
    roughness: 0.4,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1
});
const accMat = new THREE.MeshStandardMaterial({color: 0x111111, metalness: 0.8, roughness: 0.2});

// Create a generic aesthetic shape (e.g. a sleek gadget)
const bodyGeo = new THREE.BoxGeometry(30, 40, 15, 4, 4, 4);
const body = new THREE.Mesh(bodyGeo, mainMat);
body.position.y = 20;
body.castShadow = true;
productGroup.add(body);

const screenGeo = new THREE.PlaneGeometry(26, 36);
const screenMat = new THREE.MeshBasicMaterial({color: 0x000000});
const screen = new THREE.Mesh(screenGeo, screenMat);
screen.position.set(0, 20, 7.6);
productGroup.add(screen);

const btnGeo = new THREE.CylinderGeometry(3, 3, 2, 32);
const btn = new THREE.Mesh(btnGeo, accMat);
btn.rotation.x = Math.PI/2;
btn.position.set(0, 5, 7.6);
productGroup.add(btn);

// Color Switching Logic
document.querySelectorAll('.color-btn').forEach(b => {
    b.addEventListener('click', (e) => {
        document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        const colorHex = parseInt(e.target.dataset.color);
        mainMat.color.setHex(colorHex);
    });
});

// Hotspots Logic
const hotspots = ${JSON.stringify(hotspots)};
const hc = document.getElementById('hotspot-container');

hotspots.forEach((h, i) => {
    const el = document.createElement('div');
    el.className = 'hotspot';
    el.textContent = i+1;
    
    const tt = document.createElement('div');
    tt.className = 'tooltip';
    tt.textContent = h.text;
    
    hc.appendChild(el);
    hc.appendChild(tt);
    
    h.el = el;
    h.tt = tt;
    h.vec = new THREE.Vector3(h.x, h.y, h.z);
});

window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

function anim(){
    requestAnimationFrame(anim);
    controls.update();
    
    // Update Hotspots 2D position
    hotspots.forEach(h => {
        const tempV = h.vec.clone();
        tempV.applyMatrix4(productGroup.matrixWorld);
        tempV.project(camera);
        
        // Check if behind camera
        if(tempV.z > 1) {
            h.el.style.display = 'none';
            h.tt.style.display = 'none';
            return;
        }
        
        const x = (tempV.x *  .5 + .5) * innerWidth;
        const y = (tempV.y * -.5 + .5) * innerHeight;
        
        h.el.style.display = 'block';
        h.tt.style.display = 'block';
        h.el.style.left = x + 'px';
        h.el.style.top = y + 'px';
        h.tt.style.left = x + 'px';
        h.tt.style.top = y + 'px';
    });

    renderer.render(scene, camera);
}
anim();
}());<\/script></body></html>`;
  }

  function init(container, btn) {
    const panel = document.createElement('div');
    panel.id = 'product-panel';
    panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;overflow-y:auto;padding:14px;font-family:Inter,sans-serif;flex-direction:column;border-radius:8px;';

    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#3b82f6,#10b981);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">🛒</div>
        <div><div style="font-size:13px;font-weight:700;color:#f1f5f9;">Product Showcase Pro</div><div style="font-size:10px;color:#64748b;">E-Commerce 3D Configurator</div></div>
      </div>
      
      <div style="margin-top:10px;">
        <label style="font-size:10px;color:#94a3b8;margin-bottom:6px;display:block;">Hotspots (Annotations)</label>
        <textarea id="ps-hotspots" rows="4" style="width:100%;padding:6px;background:#1e293b;border:1px solid #334155;border-radius:4px;color:#10b981;font-size:11px;font-family:monospace;box-sizing:border-box;">[
  {"x": 0, "y": 38, "z": 8, "text": "Ultra HD Screen"},
  {"x": 0, "y": 5, "z": 9, "text": "Biometric Scanner"}
]</textarea>
      </div>

      <div style="display:flex;gap:15px;margin-top:12px;">
        <label style="font-size:10px;display:flex;align-items:center;gap:4px;color:#cbd5e1;cursor:pointer;"><input type="checkbox" id="ps-anim" checked style="accent-color:#3b82f6;"> Auto Rotate Showcase</label>
      </div>

      <button id="ps-add" style="width:100%;margin-top:10px;padding:9px;background:linear-gradient(135deg,#3b82f6,#10b981);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(59,130,246,0.4);">🛒 ADD TO SCENE</button>
      <button id="ps-gen" style="width:100%;margin-top:6px;padding:7px;background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.3);border-radius:8px;color:#60a5fa;font-size:11px;font-weight:600;cursor:pointer;">📄 Generate HTML</button>
    `;
    container.appendChild(panel);

    document.getElementById('ps-add').addEventListener('click', () => {
      const anim = document.getElementById('ps-anim').checked;
      let hs = [];
      try { hs = JSON.parse(document.getElementById('ps-hotspots').value); } catch(e) {
        if(window.toast) window.toast('❌ Invalid JSON in Hotspots'); return;
      }
      if(window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('product-showcase', { hs, anim });
        panel.style.display = 'none';
      }
    });

    document.getElementById('ps-gen').addEventListener('click', () => {
      const anim = document.getElementById('ps-anim').checked;
      let hs = [];
      try {
          hs = JSON.parse(document.getElementById('ps-hotspots').value);
      } catch(e) {
          if (window.toast) window.toast('❌ Invalid JSON in Hotspots');
          return;
      }
      
      const html = makeHTML(hs, anim);
      const ed = document.getElementById('code-editor');
      if (ed) { 
          if(window.pushUndo) window.pushUndo(); 
          ed.value = html; 
          ed.dispatchEvent(new Event('input', {bubbles: true})); 
      }
      if (window.toast) window.toast('🛒 Product Showcase generated!');
    });

    if (btn) btn.addEventListener('click', () => {
      const vis = panel.style.display === 'flex';
      document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display = 'none');
      panel.style.display = vis ? 'none' : 'flex';
    });
  }

  return { init };
})();
