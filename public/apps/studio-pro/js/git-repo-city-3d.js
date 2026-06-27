// Git Repo City 3D Generator
window.GitRepoCity3D = (() => {
  'use strict';
  
  function makeHTML(jsonInput, colorTheme) {
    let rawObj = null;
    try {
        rawObj = JSON.parse(jsonInput);
    } catch(e) {
        rawObj = {
            "src": {
                "components": {"Button.tsx": 120, "Header.tsx": 85, "Footer.tsx": 40},
                "utils": {"math.js": 200, "string.js": 50},
                "App.tsx": 350,
                "index.tsx": 20
            },
            "public": {"index.html": 40, "favicon.ico": 1},
            "package.json": 50,
            "README.md": 150
        };
    }

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Git Repo City 3D</title>
<style>*{margin:0;padding:0;}body{background:#020617;overflow:hidden;font-family:sans-serif;}
#tooltip{position:absolute;background:rgba(15,23,42,0.9);color:white;padding:8px 12px;border-radius:4px;font-size:12px;pointer-events:none;opacity:0;border:1px solid #334155;transform:translate(-50%,-100%);margin-top:-10px;transition:opacity 0.1s;z-index:20;}
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/controls/OrbitControls.js"><\/script>
</head><body>
<div style="position:fixed;top:10px;left:50%;transform:translateX(-50%);background:rgba(15,23,42,0.8);border:1px solid rgba(56,189,248,0.3);padding:6px 14px;border-radius:20px;font-size:11px;color:#94a3b8;z-index:9;">📂 Hover over buildings to see files</div>
<div id="tooltip"></div>
<script>(function(){
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020617);

const camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 3000);
camera.position.set(200, 150, 200);

const renderer = new THREE.WebGLRenderer({antialias:true, preserveDrawingBuffer:true});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const am = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(am);
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(100, 200, 50);
scene.add(dir);

const grid = new THREE.GridHelper(1000, 50, 0x1e293b, 0x0f172a);
scene.add(grid);

const repoData = ${JSON.stringify(rawObj)};

// Flatten tree
const files = [];
function traverse(node, path) {
    if(typeof node === 'number') {
        files.push({path: path, size: node});
    } else if(typeof node === 'object' && node !== null) {
        for(let key in node) {
            traverse(node[key], path ? path + '/' + key : key);
        }
    }
}
traverse(repoData, '');

// Assign colors based on extension
function getColor(filename) {
    const theme = "${colorTheme}";
    if(filename.endsWith('.js') || filename.endsWith('.ts')) return theme === 'dark' ? 0xfacc15 : 0xf59e0b;
    if(filename.endsWith('.jsx') || filename.endsWith('.tsx')) return theme === 'dark' ? 0x38bdf8 : 0x0284c7;
    if(filename.endsWith('.css') || filename.endsWith('.scss')) return theme === 'dark' ? 0xf472b6 : 0xdb2777;
    if(filename.endsWith('.html')) return theme === 'dark' ? 0xfb923c : 0xea580c;
    if(filename.endsWith('.json')) return theme === 'dark' ? 0xa3e635 : 0x65a30d;
    return theme === 'dark' ? 0x94a3b8 : 0x64748b;
}

const cityGroup = new THREE.Group();
scene.add(cityGroup);

const geo = new THREE.BoxGeometry(1, 1, 1);
geo.translate(0, 0.5, 0);

// Simple spiral layout
let angle = 0;
let radius = 10;
const interactables = [];

files.sort((a,b) => b.size - a.size); // Biggest in center

files.forEach((f, i) => {
    const h = Math.max(2, Math.min(f.size, 200));
    const w = 10 + (f.size > 100 ? 5 : 0);
    
    const mat = new THREE.MeshStandardMaterial({
        color: getColor(f.path),
        roughness: 0.2, metalness: 0.1
    });
    
    const mesh = new THREE.Mesh(geo, mat);
    
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    
    mesh.position.set(x, 0, z);
    mesh.scale.set(w, h, w);
    
    mesh.userData = { path: f.path, size: f.size };
    cityGroup.add(mesh);
    interactables.push(mesh);
    
    angle += 0.8;
    radius += 1.5;
});

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const tt = document.getElementById('tooltip');
let hovered = null;

window.addEventListener('mousemove', e => {
    mouse.x = (e.clientX / innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactables);
    
    if(intersects.length > 0) {
        const obj = intersects[0].object;
        if(hovered !== obj) {
            if(hovered) hovered.material.emissive.setHex(0x000000);
            hovered = obj;
            hovered.material.emissive.setHex(0x333333);
            
            tt.innerHTML = "<b>" + obj.userData.path + "</b><br>" + obj.userData.size + " lines/bytes";
            tt.style.opacity = 1;
        }
        tt.style.left = e.clientX + 'px';
        tt.style.top = e.clientY + 'px';
    } else {
        if(hovered) hovered.material.emissive.setHex(0x000000);
        hovered = null;
        tt.style.opacity = 0;
    }
});

window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

function anim(){
    requestAnimationFrame(anim);
    controls.update();
    renderer.render(scene, camera);
}
anim();
}());<\/script></body></html>`;
  }

  function init(container, btn) {
    const panel = document.createElement('div');
    panel.id = 'gitrepo-panel';
    panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;overflow-y:auto;padding:14px;font-family:Inter,sans-serif;flex-direction:column;border-radius:8px;';

    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#f43f5e,#9333ea);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">📂</div>
        <div><div style="font-size:13px;font-weight:700;color:#f1f5f9;">Git Repo City 3D</div><div style="font-size:10px;color:#64748b;">Codebase Visualizer</div></div>
      </div>
      
      <div style="margin-top:10px;">
        <label style="font-size:10px;color:#94a3b8;margin-bottom:6px;display:block;">Repository JSON Structure (Mockup)</label>
        <textarea id="gr-json" rows="8" style="width:100%;padding:6px;background:#1e293b;border:1px solid #334155;border-radius:4px;color:#38bdf8;font-size:10px;font-family:monospace;box-sizing:border-box;">{
  "src": {
    "components": {"Button.tsx": 120, "Header.tsx": 85},
    "App.js": 350,
    "styles.css": 200
  },
  "package.json": 45,
  "README.md": 150
}</textarea>
      </div>

      <div style="margin-top:12px;">
        <label style="font-size:10px;color:#94a3b8;">Color Theme</label>
        <select id="gr-theme" style="width:100%;padding:6px;background:#1e293b;border:1px solid #334155;border-radius:4px;color:#f1f5f9;font-size:11px;margin-top:4px;">
          <option value="dark">Dark Neon (Bright colors)</option>
          <option value="light">Subtle Corporate</option>
        </select>
      </div>

      <button id="gr-add" style="width:100%;margin-top:10px;padding:9px;background:linear-gradient(135deg,#f43f5e,#9333ea);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(147,51,234,0.4);">📂 ADD TO SCENE</button>
      <button id="gr-gen" style="width:100%;margin-top:6px;padding:7px;background:rgba(147,51,234,0.1);border:1px solid rgba(147,51,234,0.3);border-radius:8px;color:#c084fc;font-size:11px;font-weight:600;cursor:pointer;">📄 Generate HTML</button>
    `;
    container.appendChild(panel);

    document.getElementById('gr-add').addEventListener('click', () => {
      const json = document.getElementById('gr-json').value;
      const theme = document.getElementById('gr-theme').value;
      if(window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('git-repo', { json, theme });
        panel.style.display = 'none';
      }
    });

    document.getElementById('gr-gen').addEventListener('click', () => {
      const json = document.getElementById('gr-json').value;
      const theme = document.getElementById('gr-theme').value;
      
      const html = makeHTML(json, theme);
      const ed = document.getElementById('code-editor');
      if (ed) { 
          if(window.pushUndo) window.pushUndo(); 
          ed.value = html; 
          ed.dispatchEvent(new Event('input', {bubbles: true})); 
      }
      if (window.toast) window.toast('📂 Git Repo City generated!');
    });

    if (btn) btn.addEventListener('click', () => {
      const vis = panel.style.display === 'flex';
      document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display = 'none');
      panel.style.display = vis ? 'none' : 'flex';
    });
  }

  return { init };
})();
