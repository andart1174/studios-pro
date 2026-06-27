window.SVGExtruder = (function() {
  let container, iframe, toggleBtn;
  
  function init(wrapElement, buttonElement) {
    toggleBtn = buttonElement;
    container = document.createElement('div');
    container.style = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:50;display:none;background:#1a1a1a;';
    
    iframe = document.createElement('iframe');
    iframe.style = 'width:100%;height:100%;border:none;';
    iframe.sandbox = "allow-scripts allow-same-origin";
    container.appendChild(iframe);
    
    wrapElement.appendChild(container);
    
    toggleBtn.addEventListener('click', () => {
      const isViz = container.style.display === 'block';
      container.style.display = isViz ? 'none' : 'block';
      toggleBtn.style.background = isViz ? '' : 'rgba(234, 179, 8, 0.2)'; // SVG Color yellow
      if(!isViz) updateIframe();
    });
  }

  function getIframeHTML() {
    const isEN = () => window.currentLang !== 'fr';
    // Provide a default simple star SVG when opened
    const defaultSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="#eab308" d="M50 0 l15 40 h40 l-30 25 l10 40 l-35 -25 l-35 25 l10 -40 l-30 -25 h40 z"/></svg>`;
    
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/SVGLoader.js"><\/script>
<style>
  body{margin:0;overflow:hidden;background:#1a1a1a;font-family:sans-serif;}
  #tools {position:absolute;top:10px;left:10px;background:rgba(20,20,25,0.95);border:1px solid rgba(255,255,255,0.1);padding:15px;border-radius:8px;color:white;width:180px;z-index:100;}
  button {width:100%;padding:8px;margin-top:10px;background:#3b82f6;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;}
  button:hover {background:#2563eb;}
  label {font-size:11px;color:#aaa;display:block;margin-top:10px;margin-bottom:4px;}
  input[type=range], input[type=file] {width:100%;}
  input[type=file] { padding: 4px; border: 1px dashed rgba(255,255,255,0.3); border-radius: 4px; background: rgba(0,0,0,0.2); }
</style>
</head><body>
<div id="tools">
  <div style="font-size:13px;font-weight:bold;margin-bottom:10px;color:#eab308;display:flex;align-items:center;gap:6px;">🖼️ SVG Extruder</div>
  
  <label>${isEN()?'Upload SVG File':'Uploader Fichier SVG'}</label>
  <input type="file" id="svg-upload" accept=".svg" style="font-size:10px;color:#ccc;cursor:pointer;"/>
  
  <label>${isEN()?'Extrude Depth':'Profondeur d&apos;Extrusion'}</label>
  <input type="range" id="param-depth" min="1" max="50" value="10">
  
  <label style="display:flex;align-items:center;gap:6px;">
    <input type="checkbox" id="param-bevel"> ${isEN()?'Add Bevel (Warning: can break complex SVGs)':'Ajouter Biseau (Peut casser les SVGs complexes)'}
  </label>

  <label style="display:flex;align-items:center;gap:6px;">
    <input type="checkbox" id="param-color" checked> ${isEN()?'Use SVG Original Colors':'Couleurs Originales SVG'}
  </label>
  
  <label>${isEN()?'Override Material Color':'Couleur de Remplacement'}</label>
  <input type="color" id="param-hex" value="#eab308" style="width:100%;height:25px;border:none;cursor:pointer;">

  <button id="btn-export" style="background:linear-gradient(135deg,#6366f1,#4f46e5);box-shadow:0 4px 12px rgba(99,102,241,0.3);">⚡ ${isEN()?'Export to Code':'Exporter le Code'}</button>
</div>
<script>
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 100);
  const renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(innerWidth, innerHeight);
  renderer.setClearColor(0x1a1a1a, 1);
  document.body.appendChild(renderer.domElement);
  scene.background = new THREE.Color(0x1a1a1a);
  
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
  scene.add(hemiLight);
  
  const lightFront = new THREE.DirectionalLight(0xffffff, 1.0);
  lightFront.position.set(50, 50, 100);
  scene.add(lightFront);
  const lightBack = new THREE.DirectionalLight(0xffffff, 0.5);
  lightBack.position.set(-50, 100, -50);
  scene.add(lightBack);
  const lightBottom = new THREE.DirectionalLight(0xffffff, 0.3);
  lightBottom.position.set(0, -50, 50);
  scene.add(lightBottom);
  
  const grid = new THREE.GridHelper(100, 20, 0x444444, 0x222222);
  grid.position.y = -25;
  scene.add(grid);

  let currentSVGText = \`${defaultSVG}\`;
  let svgGroup;

  function buildSVG() {
    if(svgGroup) { scene.remove(svgGroup); svgGroup = null; }
    
    const depth = parseFloat(document.getElementById('param-depth').value);
    const bevel = document.getElementById('param-bevel').checked;
    const useColor = document.getElementById('param-color').checked;
    const fixColor = document.getElementById('param-hex').value;
    
    const loader = new THREE.SVGLoader();
    let svgData;
    try {
      svgData = loader.parse(currentSVGText);
    } catch(e) {
      alert("Error parsing SVG format!");
      return;
    }
    
    if(!svgData || !svgData.paths || svgData.paths.length === 0) {
      alert("No valid vector paths found in this SVG! Ensure your logo is converted to vector lines (not a PNG masked as SVG).");
      return;
    }
    
    svgGroup = new THREE.Group();
    
    const extrudeSettings = {
      depth: depth,
      bevelEnabled: bevel,
      bevelThickness: 1,
      bevelSize: 0.5,
      bevelSegments: 3,
      curveSegments: 12
    };

    svgData.paths.forEach(path => {
      const materialColor = useColor && path.color ? path.color : new THREE.Color(fixColor);
      const material = new THREE.MeshStandardMaterial({
        color: materialColor,
        roughness: 0.4,
        metalness: 0.1,
        emissive: materialColor.clone().multiplyScalar(0.1),
        side: THREE.DoubleSide
      });
      
      const shapes = THREE.SVGLoader.createShapes(path);
      shapes.forEach(shape => {
        try {
          const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
          const mesh = new THREE.Mesh(geometry, material);
          svgGroup.add(mesh);
        } catch(e) { 
          try {
            const flatGeo = new THREE.ShapeGeometry(shape);
            svgGroup.add(new THREE.Mesh(flatGeo, material));
          } catch(e2) {}
        }
      });
    });

    const box = new THREE.Box3().setFromObject(svgGroup);
    const size = box.getSize(new THREE.Vector3());
    
    const maxDim = Math.max(size.x, size.y);
    if(maxDim > 0) {
      const scale = 50 / maxDim;
      svgGroup.scale.set(scale, scale, scale);
      svgGroup.rotation.x = Math.PI; // Fix flip-Y without breaking normals
    }
    
    const box2 = new THREE.Box3().setFromObject(svgGroup);
    const center2 = box2.getCenter(new THREE.Vector3());
    svgGroup.position.sub(center2);

    scene.add(svgGroup);
  }

  document.getElementById('svg-upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      currentSVGText = ev.target.result;
      buildSVG();
    };
    reader.readAsText(file);
  });

  ['param-depth', 'param-bevel', 'param-color', 'param-hex'].forEach(id => {
    document.getElementById(id).addEventListener('change', buildSVG);
    document.getElementById(id).addEventListener('input', buildSVG);
  });

  buildSVG();

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
  
  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // Export Logic
  document.getElementById('btn-export').addEventListener('click', () => {
    const depth = document.getElementById('param-depth').value;
    const bevel = document.getElementById('param-bevel').checked;
    const useColor = document.getElementById('param-color').checked;
    const fixColor = document.getElementById('param-hex').value;
    document.getElementById('btn-export').innerHTML = (window.currentLang === 'fr') ? '✅ Exporté !' : '✅ Exported!';
    setTimeout(() => {
      document.getElementById('btn-export').innerHTML = (window.currentLang === 'fr') ? '⚡ Exporter le Code' : '⚡ Export to Code';
    }, 2000);
    
    // Safely encode SVG for the script block using base64 to avoid quote escaping issues
    const base64SVG = btoa(unescape(encodeURIComponent(currentSVGText)));

    const code = \`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>3D SVG Extruder</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\\/script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"><\\/script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/SVGLoader.js"><\\/script>
<style>body{margin:0;overflow:hidden;background:#1a1a1a;}</style>
</head>
<body>
<script>
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 100);
  const renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(innerWidth, innerHeight);
  renderer.setClearColor(0x1a1a1a, 1);
  document.body.appendChild(renderer.domElement);
  scene.background = new THREE.Color(0x1a1a1a);
  
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const hLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
  scene.add(hLight);
  
  const l1 = new THREE.DirectionalLight(0xffffff, 1.0);
  l1.position.set(50,50,100);
  scene.add(l1);
  const l2 = new THREE.DirectionalLight(0xffffff, 0.5);
  l2.position.set(-50,100,-50);
  scene.add(l2);
  const l3 = new THREE.DirectionalLight(0xffffff, 0.3);
  l3.position.set(0,-50,50);
  scene.add(l3);

  const grid = new THREE.GridHelper(100, 20, 0x444444, 0x222222);
  grid.position.y = -25;
  scene.add(grid);

  const base64Str = "\${base64SVG}";
  const svgDataRaw = decodeURIComponent(escape(atob(base64Str)));
  
  const loader = new THREE.SVGLoader();
  const parsedMap = loader.parse(svgDataRaw);
  const grp = new THREE.Group();
  
  const exSet = {
    depth: \${depth},
    bevelEnabled: \${bevel},
    bevelThickness: 1,
    bevelSize: 0.5,
    bevelSegments: 3,
    curveSegments: 12
  };

  parsedMap.paths.forEach(p => {
    const matColor = \${useColor} && p.color ? p.color : new THREE.Color('\${fixColor}');
    const mat = new THREE.MeshStandardMaterial({
      color: matColor,
      roughness: 0.4,
      metalness: 0.1,
      emissive: matColor.clone().multiplyScalar(0.1),
      side: THREE.DoubleSide
    });
    const shp = THREE.SVGLoader.createShapes(p);
    shp.forEach(s => {
      try {
        grp.add(new THREE.Mesh(new THREE.ExtrudeGeometry(s, exSet), mat));
      } catch(e) { 
        try { grp.add(new THREE.Mesh(new THREE.ShapeGeometry(s), mat)); } catch(e2){}
      }
    });
  });

  const box = new THREE.Box3().setFromObject(grp);
  const size = box.getSize(new THREE.Vector3());
  const maxD = Math.max(size.x, size.y);
  if(maxD > 0) {
    const scale = 50 / maxD;
    grp.scale.set(scale, scale, scale);
    grp.rotation.x = Math.PI; // Fix flip-Y safely
  }
  const box2 = new THREE.Box3().setFromObject(grp);
  grp.position.sub(box2.getCenter(new THREE.Vector3()));
  
  scene.add(grp);

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
  window.addEventListener('resize', () => {
    camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight);
  });
<\\/script>
</body></html>\`;

    const editor = window.parent.document.getElementById('code-editor');
    if (editor) {
      if (window.parent.pushUndo) window.parent.pushUndo();
      editor.value = code.trim();
      editor.dispatchEvent(new window.parent.Event('input', { bubbles: true }));
      // Optional: Close compartment natively by clicking exit
      const allBtns = window.parent.document.querySelectorAll('button');
      allBtns.forEach(b => { if(b.innerHTML.includes('Exit Compartment') || b.innerHTML.includes('Quitter')) b.click(); });
    }
  });
</script>
</body></html>`;
  }

  function updateIframe() {
    iframe.srcdoc = getIframeHTML();
  }

  return { init };
})();
